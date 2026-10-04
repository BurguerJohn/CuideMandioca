(function () {
  'use strict';
  const { GameEngine } = globalThis.ArraiaCore;
  const UI = globalThis.ArraiaUI;
  const data = globalThis.GAME_DATA;
  const sprites = globalThis.FESTA_SPRITES || null;
  const desktop = globalThis.arraiaDesktop || null;
  const I18N = globalThis.ArraiaI18n;
  const { normalizeSettings, mergeSettings, publicSettings } = globalThis.ArraiaSettings;
  const t = (key, vars) => I18N.t(key, vars);
  const SAVE_KEY = 'arraia-save-v1';
  const SETTINGS_KEY = 'arraia-ajustes-v1';
  const LANGUAGE_KEY = 'arraia-idioma';
  const REOPEN_KEY = 'arraia-reabrir';
  // Quadros por segundo da festa: [com foco, de fundo] em cada perfil de desempenho.
  const PERF_RATES = { suave: [60, 30], normal: [30, 20], economia: [20, 12] };
  const rateNow = () => (PERF_RATES[ui.settings.perf] || PERF_RATES.suave)[ui.focused ? 0 : 1];
  const ZOOM_MIN = 0.25;
  const ZOOM_MAX = 3;

  const $ = selector => document.querySelector(selector);
  const now = () => Date.now();
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const ICON_SCALE = { '': 2, grande: 3, 'icone-aba': 1 };
  const ICON_BOX = { item: 72, retrato: 132, 'icone-vitrine': 44, 'icone-mini': 30 };
  // Ícones crescem em escala inteira até caber na caixa; os que já são maiores (barracas) encolhem para caber.
  function icon(id, cls = '') {
    const entry = sprites?.icons?.[id];
    if (!entry) return '';
    const fit = (ICON_BOX[cls] || 32) / Math.max(entry.w, entry.h);
    const scale = ICON_SCALE[cls] || (fit >= 1 ? Math.floor(fit) : fit);
    return `<img class="pix ${cls}" src="${entry.src}" width="${Math.round(entry.w * scale)}" ` +
      `height="${Math.round(entry.h * scale)}" alt="">`;
  }

  document.body.classList.add(desktop ? 'desktop' : 'web');

  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; }
  }

  // Idioma: no desktop quem decide é o processo principal (escolha salva, idioma do jogo na Steam, sistema);
  // no navegador, a escolha fica no localStorage e o automático segue o navegador. Fora da lista, inglês.
  function webLanguage() {
    let choice = 'auto';
    try { choice = localStorage.getItem(LANGUAGE_KEY) || 'auto'; } catch (_) { /* sem armazenamento */ }
    const system = globalThis.navigator?.language;
    return { choice, id: I18N.resolve({ choice, system }), auto: I18N.resolve({ system }) };
  }
  const language = (desktop && desktop.language) || webLanguage();
  I18N.setLanguage(language.id);
  I18N.localizeData(data);
  if (document.documentElement) document.documentElement.lang = I18N.language();
  document.title = t('app.title');
  for (const node of document.querySelectorAll('[data-i18n], [data-i18n-title], [data-i18n-label]')) {
    if (node.dataset.i18n) node.textContent = t(node.dataset.i18n);
    if (node.dataset.i18nTitle) node.title = t(node.dataset.i18nTitle);
    if (node.dataset.i18nLabel) node.setAttribute('aria-label', t(node.dataset.i18nLabel));
  }

  let raw = null;
  try { raw = desktop ? desktop.loadGame() : readJSON(SAVE_KEY); } catch (_) { raw = null; }
  let engine;
  let gameGeneration = 0;
  let importRequest = 0;
  let loadError = null;
  try { engine = new GameEngine(data, raw); } catch (error) { engine = new GameEngine(data); loadError = error.message; }
  const firstRun = !raw || !!loadError;

  const ui = {
    tab: 'festa', yeye: '', lastLetter: null, open: false, modal: false, focused: true, focusRequest: 0, press: null, cancelledClick: false, spacePress: null, cancelledSpace: false, logFilter: 'desbloqueios', mundoFilter: 'todos', lastLogRender: 0,
    dock: { open: false, cat: 'melhorias', side: 'esquerda', dx: 0, groups: {} }, preview: null,
    rings: { open: false, playing: false, result: null },
    tela: { open: false, id: 'correio' }, telaPos: null,
    settings: publicSettings(normalizeSettings(desktop ? null : readJSON(SETTINGS_KEY))),
    // Botão de teste ligado pelo código "banana" no Histórico: só vale nesta sessão (não é salvo).
    debug: false, segredo: '',
    interactive: null, festa: null, game: null, drag: null, hold: null, pointer: null, panelPos: null, ringsPos: null,
    hudKey: '', lastLive: 0, lastSave: 0, saveSoon: 0, closeArmedUntil: 0, tocou: false, redesenhar: false, showMusic: null,
    // Ao abrir, o jogo recupera o tempo fora (convidados, conquistas...): esses sons de uma vez só viram barulho.
    quietUntil: performance.now() + 2000
  };

  // --- Erros ------------------------------------------------------------------------------------------
  // Um erro nunca para o jogo: vai para o console e, no desktop, para o arquivo erros.log (o mesmo erro, uma vez
  // por minuto), para um relato de "travou" chegar com a causa.
  const reported = new Map();
  function report(error) {
    const text = String(error?.stack || error?.message || error);
    console.error(error);
    const now = Date.now();
    if (now - (reported.get(text) || 0) < 60000) return;
    reported.set(text, now);
    desktop?.logError?.(text);
  }
  function safely(fn) {
    try { fn(); } catch (error) { report(error); }
  }
  addEventListener('error', event => report(event.error || event.message));
  addEventListener('unhandledrejection', event => report(event.reason));

  // --- Som ---------------------------------------------------------------------------------------------
  const som = globalThis.ArraiaSom?.create({ enabled: ui.settings.sound !== false && !ui.settings.hidden, volume: ui.settings.volume }) || null;
  som?.setMusic(ui.settings.music === true && !ui.settings.hidden);
  // Com a festa escondida nada toca. `tocou` avisa quem chamou que a ação já tocou o seu próprio som.
  function tocar(name, options) {
    ui.tocou = true;
    if (!ui.settings.hidden) som?.play(name, options);
  }
  const janelas = () => [ui.open, ui.modal, ui.dock.open, ui.rings.open, ui.tela.open].filter(Boolean).length;
  // Uma ação do jogador com som: a própria ação toca o seu; senão, abrir ou fechar janela; senão, o som padrão.
  function comSom(action, fallback = 'clique') {
    wakeGame();
    const before = janelas();
    ui.tocou = false;
    action();
    if (ui.tocou) return;
    const after = janelas();
    if (after !== before) tocar(after > before ? 'abrir' : 'fechar');
    else if (fallback) tocar(fallback);
  }

  // --- Save ------------------------------------------------------------------------------------------
  function save(game = engine) {
    try {
      // Fechar ou suspender pode salvar antes do primeiro quadro: os prêmios pendentes não mudam os bônus da pausa.
      if (game === engine) wakeGame();
      const state = game.exportState();
      if (desktop) {
        if (!desktop.saveGame(state)) { toast(t('app.saveFailedHere'), 'erro'); return false; }
      } else localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      return true;
    } catch (_) { toast(t('app.saveFailed'), 'erro'); return false; }
    finally { ui.lastSave = performance.now(); }
  }
  function saveReplacement(game, failureKey) {
    if (save(game)) return true;
    // O main guarda o snapshot antes de tentar gravar no disco; a sessão volta à festa que continua aberta.
    save();
    toast(t(failureKey), 'erro');
    return false;
  }
  const saveLater = () => { ui.saveSoon = performance.now() + 800; };

  // --- Tamanho e posição de tudo o que flutua junto com a festa ----------------------------------------
  const uiZoom = () => clamp(ui.settings.zoom, 0.8, 1.3);
  const windowOrder = [];
  let restoringFocus = false;

  function raiseWindow(element) {
    if (!element?.style || element.isConnected === false) return;
    const others = windowOrder.filter(item => item !== element && item.isConnected !== false);
    windowOrder.splice(0, windowOrder.length, ...others, element);
    windowOrder.forEach((item, index) => { item.style.zIndex = String(index + 1); });
    // O aviso continua acima das janelas, mesmo quando outra é selecionada pelo mouse ou teclado.
    $('#janela').style.zIndex = String(windowOrder.length + 1);
  }

  function closeFrontWindow() {
    if (ui.modal) { closeModal(); return; }
    const element = windowOrder.findLast(item => !item.hidden && item.isConnected !== false);
    if (element === $('#painel')) closePanel();
    else if (element === $('#argolas')) closeRings();
    else if (element === $('#tela')) closeTela();
    else if (element === $('#vitrine')) closeDock();
    else if (element === $('#casa')) {
      const help = $('#casa-ajuda');
      if (help && !help.hidden) setCasaHelp(false);
      else changeSettings({ casaHidden: true });
    } else if (element?.dataset.mini) {
      const id = element.dataset.mini;
      if (ui.janelas?.helpOpen(id)) ui.janelas.setHelp(id, false);
      else ui.janelas?.close(id);
    }
  }

  function festaSize() {
    return ui.festa ? ui.festa.size() : { width: 480, height: 612, top: 150, physical: 3, base: 3 };
  }

  function zoomLabel() {
    const size = festaSize();
    return `${Math.round(size.physical / size.base * 100)}%`;
  }

  // Guia do zoom: a festa só muda de tamanho em múltiplos inteiros de pixel (a arte fica nítida), então entre um pulo e
  // outro parecia que a alça não fazia nada. Enquanto ela é arrastada (ou a roda gira nela), uma moldura tracejada mostra
  // o tamanho pedido, andando junto com o mouse e presa no mesmo lado que a festa; ela pisca quando a festa pula de tamanho.
  function showZoomGuide(linger = 0) {
    const guide = $('#zoom-guia');
    const anchor = ui.anchor;
    if (!guide || !anchor) return;
    const size = festaSize();
    const factor = 3 * ui.settings.zoom * (globalThis.devicePixelRatio || 1) / size.physical;
    const width = size.width * factor;
    const keepRight = anchor.side === 'direita' || (anchor.side === 'livre' && ui.settings.placa?.dx > anchor.width / 2);
    const left = anchor.side === 'topo' ? anchor.left + anchor.width / 2 - width / 2
      : keepRight ? anchor.left + anchor.width - width : anchor.left;
    guide.style.left = `${Math.round(left)}px`;
    guide.style.bottom = `${Math.round(anchor.lift)}px`;
    guide.style.width = `${Math.round(width)}px`;
    guide.style.height = `${Math.round(size.top * factor)}px`;
    const label = guide.querySelector?.('b');
    // Na mesma conta do botão de tamanho (pixels da tela por pixel de arte), para os dois números baterem.
    if (label) label.textContent = `${Math.round(size.physical * factor / size.base * 100)}%`;
    const snapped = zoomLabel();
    if (ui.zoomGuideSnap && ui.zoomGuideSnap !== snapped && guide.classList) {
      guide.classList.remove('pulou');
      void guide.offsetWidth;
      guide.classList.add('pulou');
    }
    ui.zoomGuideSnap = snapped;
    guide.hidden = false;
    clearTimeout(ui.zoomGuideTimer);
    if (linger) ui.zoomGuideTimer = setTimeout(hideZoomGuide, linger);
  }

  function hideZoomGuide() {
    clearTimeout(ui.zoomGuideTimer);
    ui.zoomGuideSnap = null;
    const guide = $('#zoom-guia');
    if (guide) guide.hidden = true;
  }

  // A festa nunca passa das bordas: o terreiro inteiro fica na tela, do chão ao topo dos mastros.
  const maxLeft = size => Math.max(0, innerWidth - size.width);
  const maxLift = size => Math.max(0, innerHeight - size.top - 8);

  // O canvas nunca fica maior que a tela; o zoom pedido além disso é limitado pela própria festa.
  function scaleFesta() {
    if (ui.festa) ui.festa.setScale(3 * ui.settings.zoom, { width: innerWidth - 16, height: innerHeight - 24 });
  }

  function placeFesta() {
    if (ui.settings.hidden && (ui.drag || ui.hold || ui.press || ui.spacePress)) dropPointer();
    const festa = $('#festa');
    const size = festaSize();
    const width = size.width;
    const left = Math.round(clamp(ui.settings.x * innerWidth - width / 2, 0, maxLeft(size)));
    const lift = Math.round(clamp(ui.settings.lift, 0, maxLift(size)));
    festa.style.left = `${left}px`;
    festa.style.bottom = `${lift}px`;
    festa.hidden = !!ui.settings.hidden;
    const placa = $('#placa');
    const zoom = uiZoom();
    placa.style.transform = `scale(${zoom})`;
    const hudWidth = (placa.offsetWidth || 240) * zoom;
    const hudHeight = (placa.offsetHeight || 120) * zoom;
    // A placa fica ao lado da festa sozinha; se o jogador arrastou, fica onde ele pôs, contando a partir da festa.
    const custom = ui.settings.placa;
    let side = 'esquerda';
    let hudLeft = left - hudWidth - 12;
    let hudBottom = lift + 10;
    if (custom) {
      side = 'livre';
      hudLeft = left + custom.dx;
      hudBottom = lift + custom.dy;
    } else if (hudLeft < 6) {
      if (left + width + 12 + hudWidth <= innerWidth - 6) { side = 'direita'; hudLeft = left + width + 12; }
      else { side = 'topo'; hudLeft = left + 8; hudBottom = lift + size.top + 8; }
    }
    // A placa tem a alça do zoom e o botão de fechar: ela nunca pode sair da tela.
    hudLeft = clamp(hudLeft, 6, Math.max(6, innerWidth - hudWidth - 6));
    hudBottom = clamp(hudBottom, 6, Math.max(6, innerHeight - hudHeight - 6));
    placa.style.left = `${Math.round(hudLeft)}px`;
    placa.style.bottom = `${Math.round(hudBottom)}px`;
    placa.hidden = !!ui.settings.hidden;
    const toasts = $('#avisos');
    toasts.style.left = `${Math.round(hudLeft)}px`;
    toasts.style.bottom = `${Math.round(Math.min(hudBottom + hudHeight + 10, innerHeight - 60))}px`;
    document.body.classList.toggle('placa-passar', ui.settings.hud === 'passar');
    ui.anchor = { left, width, lift, top: size.top, side };
    placeCasa();
    ui.janelas?.placeAll();
    placeDock();
    if (ui.open) placeWindow($('#painel'), 'panelPos');
    if (ui.rings.open) placeWindow($('#argolas'), 'ringsPos');
    if (ui.tela.open) placeWindow($('#tela'), 'telaPos');
  }

  // A vitrine fica encaixada logo acima da festa e anda junto com ela; arrastada pela faixa de cima, desliza para os
  // lados (ui.dock.dx é o quanto saiu do meio da festa).
  function placeDock() {
    const dock = $('#vitrine');
    if (!ui.dock.open || !ui.anchor) return;
    const a = ui.anchor;
    const zoom = uiZoom();
    dock.style.transform = `scale(${zoom})`;
    // Nunca mais estreita que as abas (com os Conjuntos, as abas passaram dos 760 px e a última ficava para fora). Mede a
    // soma das abas, não a fileira: a fileira estica junto com a vitrine, e medir ela fazia a vitrine crescer a cada
    // chamada até tomar a tela inteira.
    const tabs = [...(dock.querySelectorAll?.('.vabas > .vaba') || [])];
    const needed = tabs.length ? tabs.reduce((sum, tab) => sum + (tab.offsetWidth || 0) + 2, 0) + 40 : 0;
    const width = Math.min(innerWidth / zoom - 16, Math.max(760, needed, a.width / zoom));
    dock.style.width = `${Math.round(width)}px`;
    const height = (dock.offsetHeight || 220) * zoom;
    const middle = a.left + a.width / 2 - width * zoom / 2;
    const left = clamp(middle + ui.dock.dx, 8, Math.max(8, innerWidth - width * zoom - 8));
    // Bateu na borda: o arrasto recomeça dali (voltar o mouse já traz a vitrine, sem trecho morto).
    ui.dock.dx = left - middle;
    const bottom = Math.min(a.lift + a.top + 6, innerHeight - height - 8);
    dock.style.left = `${Math.round(left)}px`;
    dock.style.bottom = `${Math.round(Math.max(8, bottom))}px`;
  }

  // A Casa da Mandioca (do convidado 100 em diante) é uma janela só dela. Some quando a pessoa a esconde, ou com a festa.
  const casaVisible = () => !!ui.casa && engine.houseInfo().open && !ui.settings.casaHidden && !ui.settings.hidden;
  let casaHelpScroll = null;

  // O painel "como funciona" da casa cobre a cena; o texto é montado ao abrir (no idioma de agora, com os números do `house`).
  function setCasaHelp(open) {
    const panel = $('#casa-ajuda');
    if (!panel) return;
    const returnFocus = !open && !panel.hidden && panel.contains?.(document.activeElement);
    const scene = $('#casa-cena');
    if (open) {
      if (ui.drag?.kind === 'casa') dropPointer();
      if (panel.hidden && scene) casaHelpScroll = { x: scene.scrollLeft || 0, y: scene.scrollTop || 0 };
      scene?.classList?.add('ajuda-aberta');
      if (scene) { scene.scrollLeft = 0; scene.scrollTop = 0; }
      panel.querySelector('h3').textContent = `${t('casa.title')}: ${t('help.title')}`;
      panel.querySelector('p').textContent = t('casa.help', { start: engine.data.house.start, perRoom: engine.data.house.perRoom });
      panel.querySelector('small').textContent = t('help.close');
    }
    panel.hidden = !open;
    if (open) panel.scrollTop = 0;
    if (!open && scene) {
      scene.classList?.remove('ajuda-aberta');
      if (casaHelpScroll) { scene.scrollLeft = casaHelpScroll.x; scene.scrollTop = casaHelpScroll.y; casaHelpScroll = null; }
    }
    if (returnFocus && casaVisible()) {
      const trigger = $('#casa')?.querySelector('button[data-action="casa-ajuda"]');
      if (!trigger?.disabled) trigger?.focus?.({ preventScroll: true });
    }
  }

  function placeCasa() {
    const element = $('#casa');
    if (!element || !ui.casa) return;
    const visible = casaVisible();
    const wasHidden = element.hidden;
    element.hidden = !visible;
    if (!visible) {
      if (ui.drag?.kind === 'casa') dropPointer();
      setCasaHelp(false);
      return;
    }
    // Cabe na tela: no máximo 55% da largura e 88% da altura; o fator é inteiro (a arte fica nítida).
    ui.casa.setScale(3 * ui.settings.zoom, { width: innerWidth * 0.55, height: innerHeight * 0.88 });
    const info = engine.houseInfo();
    const counter = $('#casa-contagem');
    if (counter) counter.textContent = t('casa.count', { n: info.residents });
    const canvasSize = ui.casa.size();
    const w = Math.max(element.offsetWidth || 0, canvasSize.width + 12);
    const h = Math.max(element.offsetHeight || 0, Math.min(canvasSize.height, innerHeight - 76) + 38);
    const a = ui.anchor || { left: 0, width: 0, lift: 0, top: 0 };
    const custom = ui.settings.casa;
    let left;
    let bottom;
    if (custom) {
      left = a.left + custom.dx;
      bottom = a.lift + custom.dy;
    } else {
      // Sozinha, a casa procura um lugar onde caiba e não cubra a placa (é nela que fica o botão que mostra e esconde a casa):
      // ao lado direito da festa, em cima da placa, ao lado da placa, ou em cima da festa.
      const placa = $('#placa');
      const r = placa && !placa.hidden && placa.getBoundingClientRect ? placa.getBoundingClientRect() : null;
      const placaRect = r && r.width ? r : null;
      const covers = (l, b) => !!placaRect && l < placaRect.right + 6 && l + w > placaRect.left - 6 &&
        innerHeight - b - h < placaRect.bottom + 6 && innerHeight - b > placaRect.top - 6;
      const fits = (l, b) => l >= 6 && l + w <= innerWidth - 6 && b >= 6 && b + h <= innerHeight - 6;
      const spots = [
        [a.left + a.width + 12, a.lift + 10],
        ...(placaRect ? [[placaRect.left, innerHeight - placaRect.top + 14], [placaRect.right + 12, innerHeight - placaRect.top - h],
          [placaRect.left - 12 - w, innerHeight - placaRect.top - h]] : []),
        [a.left + 10, a.lift + a.top + 8]
      ];
      const pick = spots.find(([l, b]) => fits(l, b) && !covers(l, b)) || spots.find(([l, b]) => !covers(clamp(l, 6, Math.max(6, innerWidth - w - 6)),
        clamp(b, 6, Math.max(6, innerHeight - h - 6)))) || spots[spots.length - 1];
      [left, bottom] = pick;
    }
    left = clamp(left, 6, Math.max(6, innerWidth - w - 6));
    bottom = clamp(bottom, 6, Math.max(6, innerHeight - h - 6));
    element.style.left = `${Math.round(left)}px`;
    element.style.bottom = `${Math.round(bottom)}px`;
    const scene = $('#casa-cena');
    scene?.classList?.toggle('cena-arrastavel', !(scene.scrollWidth > scene.clientWidth || scene.scrollHeight > scene.clientHeight));
    if (wasHidden) raiseWindow(element);
  }

  // Painel e janela das argolas abrem logo acima da festa. A posição fica guardada em relação ao pé esquerdo da
  // festa, então arrastar a festa leva as janelas junto; arrastar a janela só muda ela.
  function windowBase() {
    const a = ui.anchor || { left: innerWidth / 2, width: 0, lift: 0, top: 0 };
    return { x: a.left, y: innerHeight - a.lift, a };
  }

  function placeWindow(element, key) {
    const w = element.offsetWidth || 780;
    const h = element.offsetHeight || 560;
    const base = windowBase();
    if (!ui[key]) {
      const dockHeight = ui.dock.open ? ($('#vitrine').offsetHeight || 220) * uiZoom() + 8 : 0;
      ui[key] = { dx: base.a.width / 2 - w / 2, dy: -base.a.top - dockHeight - h - 10, auto: true };
    }
    let left = clamp(base.x + ui[key].dx, 8, Math.max(8, innerWidth - w - 8));
    const top = clamp(base.y + ui[key].dy, 8, Math.max(8, innerHeight - h - 8));
    // No lugar automático, a janela não cobre a placa (em tela pequena ela escondia os botões da direita): vai para o lado.
    if (ui[key].auto) {
      const placa = $('#placa');
      const r = placa && !placa.hidden && placa.getBoundingClientRect ? placa.getBoundingClientRect() : null;
      if (r && r.width && left < r.right + 8 && left + w > r.left - 8 && top < r.bottom + 8 && top + h > r.top - 8) {
        if (r.right + 8 + w <= innerWidth - 8) left = r.right + 8;
        else if (r.left - 8 - w >= 8) left = r.left - 8 - w;
      }
    }
    element.style.left = `${Math.round(left)}px`;
    element.style.top = `${Math.round(top)}px`;
  }

  // --- Ajustes -----------------------------------------------------------------------------------------
  let settingsRequest = 0;
  let settingsRevision = -1;
  let confirmedSettings = publicSettings(normalizeSettings(ui.settings));
  const pendingSettings = new Map();
  function applySettings(settings) {
    // Posições e volume em edição ainda não foram persistidos: o retrato do desktop conserva esses campos até soltar.
    const moving = { festa: ['x', 'lift'], zoom: ['zoom', 'x', 'placa'], placa: ['placa'], casa: ['casa'], mini: ['minis'], barra: ['volume'] }[ui.drag?.kind] || [];
    const position = Object.fromEntries(moving.map(key => [key, ui.settings[key]]));
    if (document.activeElement?.id === 'volume') position.volume = ui.settings.volume;
    ui.settings = publicSettings(mergeSettings(ui.settings, { ...settings, ...position }));
    som?.set({ enabled: ui.settings.sound !== false && !ui.settings.hidden, volume: ui.settings.volume });
    som?.setMusic?.(ui.settings.music === true && !ui.settings.hidden);
    ui.festa?.setRate(rateNow());
    ui.festa?.setFlash?.(ui.settings.flash !== false);
    ui.festa?.setCalm?.(ui.settings.calm === true);
    scaleFesta();
    // No desktop, as preferências iniciais chegam depois de carregar a partida e criar o gerenciador.
    ui.janelas?.restore();
    renderHud(true);
    placeFesta();
    if (ui.open) renderWindows();
  }

  function changeSettings(partial) {
    if (desktop) {
      const request = ++settingsRequest;
      const normalized = publicSettings(mergeSettings(ui.settings, partial));
      pendingSettings.set(request, Object.fromEntries(Object.keys(partial)
        .filter(key => Object.prototype.hasOwnProperty.call(normalized, key)).map(key => [key, normalized[key]])));
      renderSettingsSnapshot();
      desktop.updateSettings(partial).then(settings => {
        finishSettingsRequest(request);
        receiveSettingsSnapshot(settings);
      }).catch(error => {
        pendingSettings.delete(request);
        renderSettingsSnapshot();
        toast(error.message, 'erro');
      });
    } else {
      applySettings(partial);
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(ui.settings)); } catch (_) { /* sem armazenamento */ }
    }
  }

  function finishSettingsRequest(request) {
    const fields = Object.keys(pendingSettings.get(request) || {});
    pendingSettings.delete(request);
    // Uma confirmação mais nova da mesma chave também supera o overlay de pedidos anteriores.
    for (const [previous, pending] of pendingSettings) {
      if (previous < request) for (const key of fields) delete pending[key];
    }
  }

  function renderSettingsSnapshot() {
    // Cada pedido conserva só os seus campos até responder; outros ajustes seguem o último retrato do main.
    const pending = Object.assign({}, ...pendingSettings.values());
    applySettings({ ...confirmedSettings, ...pending });
  }

  function receiveSettingsSnapshot(settings) {
    if (settings && Number.isSafeInteger(settings.revision) && settings.revision >= settingsRevision) {
      settingsRevision = settings.revision;
      confirmedSettings = publicSettings(mergeSettings(confirmedSettings, settings));
    }
    renderSettingsSnapshot();
  }

  // Muda o tamanho sem tirar a placa do lugar: o lado da festa colado nela fica parado e o resto cresce.
  // Devolve o zoom que valeu de fato (a festa limita o tamanho para caber na tela).
  function setZoom(zoom, persist) {
    zoom = clamp(zoom, ZOOM_MIN, ZOOM_MAX);
    const previousZoom = ui.settings.zoom;
    const before = ui.anchor;
    ui.settings.zoom = zoom;
    scaleFesta();
    const size = festaSize();
    if (size.capped) {
      zoom = size.physical / (3 * (globalThis.devicePixelRatio || 1));
      ui.settings.zoom = zoom;
    }
    if (persist && ui.drag?.kind === 'zoom') {
      // A roda e os controles mudam a base do arrasto e já contam como um ajuste da alça.
      ui.drag.start *= zoom / previousZoom;
      ui.drag.moved = true;
    }
    const custom = ui.settings.placa;
    if (before && before.side !== 'topo') {
      const keepRight = before.side === 'direita' || (before.side === 'livre' && custom.dx > before.width / 2);
      const left = keepRight ? before.left + before.width - size.width : before.left;
      ui.settings.x = clamp((clamp(left, 0, maxLeft(size)) + size.width / 2) / innerWidth, 0, 1);
    }
    if (before && custom) {
      const left = Math.round(clamp(ui.settings.x * innerWidth - size.width / 2, 0, maxLeft(size)));
      const lift = Math.round(clamp(ui.settings.lift, 0, maxLift(size)));
      ui.settings.placa = { dx: before.left + custom.dx - left, dy: before.lift + custom.dy - lift };
    }
    placeFesta();
    refreshLive(true);
    if (persist) changeSettings({ zoom, x: ui.settings.x, placa: ui.settings.placa });
    return zoom;
  }

  // --- Avisos e janelas --------------------------------------------------------------------------------
  function toast(message, kind = '') {
    const box = $('#avisos');
    if (kind === 'erro') tocar('erro');
    // O mesmo aviso de novo (duas cartas chegando juntas, cliques repetidos) não empilha: o que está na tela ganha um ×2 e
    // o relógio dele recomeça.
    const same = [...box.children].find(child => child.dataset.msg === message && child.dataset.kind === kind && !child.dataset.out);
    const item = same || document.createElement('div');
    if (same) {
      same.dataset.n = String(Number(same.dataset.n || 1) + 1);
      same.textContent = `${message} (×${same.dataset.n})`;
      clearTimeout(same.timers?.[0]);
      clearTimeout(same.timers?.[1]);
    } else {
      item.className = `aviso-item ${kind}`;
      item.textContent = message;
      item.dataset.msg = message;
      item.dataset.kind = kind;
      box.appendChild(item);
      while (box.children.length > 4) box.firstChild.remove();
    }
    item.timers = [setTimeout(() => { item.dataset.out = '1'; item.classList.add('saindo'); }, 3600), setTimeout(() => item.remove(), 4200)];
  }

  let modalReturnFocus = null;
  function showModal(html) {
    const dialog = $('#janela');
    const active = document.activeElement;
    if (!dialog.contains?.(active)) {
      const container = active?.closest?.('.ui');
      modalReturnFocus = container && active.focus && (active.id || active.dataset?.action)
        ? { active, container, id: active.id, identity: Object.entries(active.dataset || {}).filter(([key]) => key !== 'cost') } : null;
    }
    $('#janela-corpo').innerHTML = html;
    dialog.hidden = false;
    dialog.scrollTop = 0;
    ui.modal = true;
    focusable();
    // O teclado começa no aviso; Tab escolhe um botão antes que Enter possa confirmá-lo.
    dialog.focus?.({ preventScroll: true });
  }

  function closeModal() {
    const dialog = $('#janela');
    const previous = dialog.contains?.(document.activeElement) ? modalReturnFocus : null;
    modalReturnFocus = null;
    dialog.hidden = true;
    ui.modal = false;
    focusable();
    if (!previous || previous.container.isConnected === false) return;
    const { active, container, id, identity } = previous;
    // Cartas e prendas redesenham o botão de origem enquanto o aviso está aberto.
    const controls = container.querySelectorAll?.(id ? '[id]' : '[data-action]') || [];
    const next = active.isConnected !== false ? active : [...controls].find(control => id ? control.id === id
      : identity.every(([key, value]) => control.dataset[key] === value));
    if (!next?.focus || next.disabled || next.closest?.('[hidden]') || next.getClientRects?.().length === 0) return;
    restoringFocus = true;
    try { next.focus({ preventScroll: true }); }
    finally { restoringFocus = false; }
  }

  function focusable() {
    if (desktop) desktop.setFocusable(ui.open || ui.modal || ui.rings.open || ui.tela.open);
  }

  // --- Renderização ------------------------------------------------------------------------------------
  function context() {
    return { tab: ui.tab, panelOpen: ui.open, debug: ui.debug, casaVisible: casaVisible(), minis: ui.janelas ? ui.janelas.items() : [],
      lastLetter: ui.lastLetter, language, steam: desktop?.steam || null,
      settings: ui.settings, desktop: !!desktop, icon, now: now(), dockCat: ui.dock.cat, dockSide: ui.dock.side, dockGroups: ui.dock.groups,
      ringPlaying: ui.rings.playing, ringResult: ui.rings.result, zoomLabel: zoomLabel(),
      closeArmed: now() < ui.closeArmedUntil, tela: ui.tela.open ? ui.tela.id : null, logFilter: ui.logFilter, mundoFilter: ui.mundoFilter, testeTab: ui.testeTab };
  }

  // Painel (números, conquistas, ajustes) e a janela da tela de jogo aberta, redesenhados juntos.
  function renderWindows() {
    renderTela();
    renderPanelBody();
  }

  // O clique nativo vem depois do pointerup ou keyup. Um aviso nesse intervalo não pode remover seu botão.
  const deferredRenders = new Set();
  function deferRender(id, container) {
    if (!(ui.press && container?.contains?.(ui.press.button)) &&
      !(ui.spacePress && container?.contains?.(ui.spacePress.button))) return false;
    deferredRenders.add(id);
    return true;
  }
  function flushDeferredRenders() {
    if (ui.press || ui.spacePress) return;
    const pending = [...deferredRenders];
    deferredRenders.clear();
    const renders = { tela: renderTela, painel: renderPanelBody, vitrine: renderDock, argolas: renderRings,
      placa: () => renderHud(true) };
    for (const id of pending) renders[id]();
  }

  // Redesenhar troca o HTML inteiro: com o jogador digitando o nome, escolhendo num select ou arrastando o volume,
  // o campo sumiria no meio. Fica para quando ele sair do campo (focusout).
  function busy(container) {
    const active = document.activeElement;
    if (!active?.matches?.('input, select, textarea') || !container?.contains?.(active)) return false;
    ui.redesenhar = true;
    return true;
  }

  // Trocar o HTML remove o controle focado. O teclado continua no mesmo controle quando ele ainda existe na tela nova.
  function keepFocus(container) {
    const active = document.activeElement;
    if (!active || !container?.contains?.(active) || (!active.id && !active.dataset?.action)) return () => {};
    const id = active.id;
    const identity = Object.entries(active.dataset || {}).filter(([key]) => key !== 'cost');
    return () => {
      if (active.isConnected !== false || (document.activeElement && document.activeElement !== document.body && document.activeElement !== active)) return;
      if (ui.modal && !$('#janela')?.contains?.(active)) return;
      const controls = container.querySelectorAll?.(id ? '[id]' : '[data-action]') || [];
      const next = [...controls].find(control => !control.disabled && (id ? control.id === id
        : identity.every(([key, value]) => control.dataset[key] === value)));
      if (!next?.focus) return;
      // Restaurar o cartão depois de um prêmio não seleciona a janela que estava atrás de outra.
      restoringFocus = true;
      try { next.focus({ preventScroll: true }); }
      finally { restoringFocus = false; }
    };
  }

  function renderTela(force = false) {
    if (!ui.tela.open) return;
    if (deferRender('tela', $('#tela'))) return;
    const body = $('#tela-corpo');
    if (!force && busy(body)) return;
    const restoreFocus = keepFocus($('#tela'));
    const scroll = body.scrollTop;
    body.innerHTML = UI.tela(engine, context());
    body.scrollTop = scroll;
    // A cena da Pescaria é um canvas que sobrevive às redesenhadas da tela: volta para o espaço dela.
    const slot = ui.tela.id === 'pescaria' ? body.querySelector?.('[data-pescaria-cena]') : null;
    if (slot && ui.pescaCanvas) slot.appendChild(ui.pescaCanvas);
    const bingoSlot = ui.tela.id === 'bingo' ? body.querySelector?.('[data-bingo-cena]') : null;
    if (bingoSlot && ui.bingoCanvas) bingoSlot.appendChild(ui.bingoCanvas);
    $('#tela-titulo').textContent = UI.telaName(ui.tela.id);
    $('#tela').classList.toggle('modo-teste', ui.tela.id === 'teste');
    refreshLive(true);
    // Uma carta ou cartela nova pode aumentar a altura depois de abrir ou arrastar a janela.
    placeWindow($('#tela'), 'telaPos');
    restoreFocus();
  }

  function renderPanelBody() {
    if (!ui.open) return;
    if (deferRender('painel', $('#painel'))) return;
    const body = $('#painel-corpo');
    if (busy(body)) return;
    const restoreFocus = keepFocus($('#painel'));
    const ctx = context();
    $('#painel-abas').innerHTML = UI.tabs(engine, ctx);
    const scroll = body.scrollTop;
    body.innerHTML = UI.panel(engine, ctx);
    body.scrollTop = scroll;
    $('#painel-titulo').textContent = `${engine.state.name} · ${engine.tier().name}`;
    refreshLive(true);
    restoreFocus();
  }

  function renderDock() {
    if (!ui.dock.open) return;
    if (deferRender('vitrine', $('#vitrine'))) return;
    ui.dock.full = engine.bellyFull();
    const dock = $('#vitrine');
    const restoreFocus = keepFocus(dock);
    const scroll = dock.querySelector?.('.vgrade')?.scrollLeft || dock.querySelector?.('.vitrine-corpo')?.scrollLeft || 0;
    dock.innerHTML = UI.vitrine(engine, context());
    const body = dock.querySelector?.('.vgrade') || dock.querySelector?.('.vitrine-corpo');
    if (body) body.scrollLeft = scroll;
    refreshLive(true);
    placeDock();
    restoreFocus();
  }

  function renderRings() {
    if (deferRender('argolas', $('#argolas'))) return;
    const restoreFocus = keepFocus($('#argolas'));
    if (ui.rings.open) $('#argolas-info').innerHTML = UI.argolas(engine, context());
    refreshLive(true);
    if (ui.rings.open) placeWindow($('#argolas'), 'ringsPos');
    restoreFocus();
  }

  // A placa só é refeita quando muda de forma; os números mudam no lugar, sem perder cliques.
  function renderHud(force = false) {
    if (deferRender('placa', $('#placa'))) return;
    const s = engine.state;
    const ready = s.outings.filter((_, i) => engine.outingState(i) === 'pronto').length;
    const key = [engine.tierIndex(), s.size, s.fishing.unlocked && s.fishing.ready, s.mail.ready, ready,
      now() < ui.closeArmedUntil, !!desktop, s.runtime.frenzyLeft > 0, s.runtime.quadrilhaLeft > 0, s.runtime.weddingLeft > 0,
      s.bingo.round && !s.bingo.round.result ? engine.bingoMarks().count : -1,
      engine.specialDay()?.id, engine.daysToSaoJoao(), s.leilao?.active ? `${s.leilao.active.leader}:${s.leilao.active.price}` : '', !!s.saco?.active,
      !!s.cold?.active, !!s.visitor?.active, !!(s.fotografo?.active && !s.fotografo.active.shot), !!(s.burro?.active && !s.burro.active.pinned), !!s.fantasia?.judgeAt,
      `${s.cozinha.pot?.id || ''}:${!!s.cozinha.pot?.ready}:${s.cozinha.buff?.until || 0}:${engine.cookBonus() > 0}`, engine.isPlaced('fogao-lenha'),
      engine.hortaBuffs().map(buff => `${buff.crop}${buff.until}`).join(','), s.mundo?.active ? `${s.mundo.active.id}:${s.mundo.active.got.length}` : '', engine.mundo?.soon()?.entry.id || '', (s.mundo?.buffs || []).map(buff => buff.id).join(','), engine.goalsReady(), ui.open && ui.tab, ui.debug, engine.houseInfo().open, casaVisible(), ui.janelas?.signature() || ''].join('|');
    if (!force && key === ui.hudKey) return;
    ui.hudKey = key;
    const placa = $('#placa');
    const restoreFocus = keepFocus(placa);
    placa.innerHTML = UI.hud(engine, context());
    // A placa cresce para cima com os selos (leilão, prato servido...): mudou a altura, reposiciona para ela não sair da tela.
    if (placa.offsetHeight && placa.offsetHeight !== ui.placaHeight) {
      const first = ui.placaHeight === undefined;
      ui.placaHeight = placa.offsetHeight;
      if (!first) placeFesta();
    }
    refreshLive(true);
    restoreFocus();
  }

  function refreshLive(force = false) {
    const clock = performance.now();
    if (!force && clock - ui.lastLive < 200) return;
    ui.lastLive = clock;
    const s = engine.state;
    const balances = { cheer: s.cheer, tickets: s.tickets, wood: s.wood };
    for (const node of document.querySelectorAll('[data-live]')) {
      const key = node.dataset.live;
      if (key === 'ringCost') {
        node.textContent = engine.ringCost();
        node.hidden = engine.ringCost() <= engine.cfg.ringCost;
      } else if (key === 'fame') node.textContent = UI.compact(s.fame);
      else if (key === 'zoom') node.textContent = zoomLabel();
      else if (key in balances) node.textContent = UI.compact(balances[key]);
    }
    const productionNodes = document.querySelectorAll('[data-production]');
    if (productionNodes.length) {
      const values = UI.productionValues(engine);
      for (const node of productionNodes) node.textContent = values[node.dataset.production];
    }
    // Felicidade da Mandioca: barrinhas, o quanto o Rebolado vale e a dica da linha na placa.
    const mood = engine.mood();
    const factor = engine.moodFactor(mood);
    for (const node of document.querySelectorAll('[data-humor]')) {
      const key = node.dataset.humor;
      if (key === 'amor' || key === 'barriga') node.style.width = `${Math.round(100 * mood[key] / engine.cfg.moodMax)}%`;
      else if (key === 'fator') node.textContent = `×${UI.number(factor, 2)}`;
      else if (key === 'fator-loja') node.textContent = t('shop.moodNow', { stat: engine.stats.rebolado.name, f: UI.number(factor, 2) });
      else if (key === 'linha') {
        node.title = UI.moodTitle(engine, mood);
        node.classList.toggle('triste', factor < 1);
        node.classList.toggle('feliz', factor > 1);
      }
    }
    // Aba Comidas aberta: quando a Barriga deixa de estar cheia (ou enche), os preços voltam (ou somem).
    if (ui.dock.open && ui.dock.cat === 'comidas' && engine.bellyFull() !== ui.dock.full) renderDock();
    for (const node of document.querySelectorAll('[data-buff]')) {
      const left = { frenzy: s.runtime.frenzyLeft, wedding: s.runtime.weddingLeft }[node.dataset.buff] ?? s.runtime.quadrilhaLeft;
      node.textContent = `${Math.ceil(left)}s`;
    }
    // Metas abertas no Painel: barra, números e o botão de resgatar acompanham o jogo.
    for (const card of document.querySelectorAll('[data-meta]')) {
      const goal = s.goals[Number(card.dataset.meta)];
      if (!goal) continue;
      const value = engine.goalProgress(goal);
      const ready = value >= goal.target;
      const fill = card.querySelector('.barra i');
      if (fill) fill.style.width = `${Math.min(100, 100 * value / goal.target)}%`;
      const text = card.querySelector('[data-meta-n]');
      if (text) text.textContent = `${UI.number ? UI.number(value) : value}/${UI.number ? UI.number(goal.target) : goal.target}`;
      card.classList.toggle('feita', ready);
      const button = card.querySelector('[data-action="meta-resgatar"]');
      if (button) { button.disabled = !ready; button.classList.toggle('claro', !ready); }
      // Meta cumprida não se troca: o botão de trocar some.
      const swap = card.querySelector('[data-action="meta-trocar"]');
      if (swap) swap.hidden = ready;
    }
    for (const node of document.querySelectorAll('.placa .barra.fama i')) {
      node.style.width = `${Math.min(100, 100 * s.fame / Math.max(1, engine.fameNeed()))}%`;
    }
    const at = now();
    for (const node of document.querySelectorAll('[data-until]')) {
      node.textContent = UI.duration(Number(node.dataset.until) - at);
    }
    for (const node of document.querySelectorAll('[data-progress-start][data-progress-end]')) {
      node.style.width = `${UI.timeProgress(Number(node.dataset.progressStart), Number(node.dataset.progressEnd), at)}%`;
    }
    for (const node of document.querySelectorAll('[data-cost]')) {
      const lacking = balances[node.dataset.currency] < Number(node.dataset.cost);
      if (node.tagName === 'BUTTON') node.disabled = lacking;
      else node.classList.toggle('sem-saldo', lacking);
    }
  }

  // --- Painel, vitrine e argolas -----------------------------------------------------------------------
  function openPanel(tab) {
    if (tab) ui.tab = tab;
    ui.open = true;
    $('#painel').hidden = false;
    renderWindows();
    placeWindow($('#painel'), 'panelPos');
    raiseWindow($('#painel'));
    focusable();
  }

  // Telas de jogo: cada botão da placa abre a sua; clicar de novo no mesmo botão fecha.
  function openTela(id, toggle = true) {
    if (ui.tela.open && ui.tela.id === id) { if (toggle) closeTela(); else raiseWindow($('#tela')); return; }
    ui.tela.id = id;
    ui.tela.open = true;
    $('#tela').hidden = false;
    // O canvas conserva o foco do campo anterior; uma troca pedida pelo jogador precisa substituir essa tela.
    renderTela(true);
    placeWindow($('#tela'), 'telaPos');
    renderHud(true);
    raiseWindow($('#tela'));
    focusable();
  }

  // Código secreto do botão de teste (joaninha na placa): digitar "banana" com a aba Histórico aberta liga e desliga.
  // Vale só até fechar o jogo; o botão de fábrica continua desligado (config.debugMenu).
  const SEGREDO = 'banana';
  function toggleDebug() {
    ui.debug = !ui.debug;
    if (!ui.debug && ui.tela.open && ui.tela.id === 'teste') closeTela();
    toast(t(ui.debug ? 'app.debugOn' : 'app.debugOff'));
    renderHud(true);
  }

  function closeTela() {
    ui.tela.open = false;
    $('#tela').hidden = true;
    if (ui.telaPos?.auto) ui.telaPos = null;
    renderHud(true);
    focusable();
  }

  function closePanel() {
    ui.open = false;
    $('#painel').hidden = true;
    if (ui.panelPos?.auto) ui.panelPos = null;
    focusable();
  }

  function openDock(cat, side) {
    if (cat) ui.dock.cat = cat;
    if (side) ui.dock.side = side;
    ui.dock.open = true;
    $('#vitrine').hidden = false;
    renderDock();
    raiseWindow($('#vitrine'));
    if (ui.open) placeWindow($('#painel'), 'panelPos');
  }

  function closeDock() {
    if (ui.hold?.button.closest?.('#vitrine')) stopHold();
    ui.dock.open = false;
    ui.preview = null;
    $('#vitrine').hidden = true;
  }

  function openRings() {
    ui.rings.open = true;
    $('#argolas').hidden = false;
    renderRings();
    placeWindow($('#argolas'), 'ringsPos');
    raiseWindow($('#argolas'));
    focusable();
  }

  function closeRings() {
    if (ui.hold?.button.closest?.('#argolas')) stopHold();
    if (ui.rings.playing) endRound();
    ui.rings.open = false;
    $('#argolas').hidden = true;
    if (ui.ringsPos?.auto) ui.ringsPos = null;
    ui.game?.reset();
    focusable();
  }

  function endRound() {
    const result = engine.finishRings();
    ui.rings.playing = false;
    ui.rings.result = result;
    if (result && (result.mult > 1 || result.items.length) && !result.empty) {
      ui.festa?.celebrate(performance.now(), result.items.length ? t('fx.gift') : `X${result.mult}!`);
    }
    if (result && !result.empty) tocar('premio');
    // Presente das argolas: a vitrine aberta já mostra o item como seu.
    if (result?.items.length) renderDock();
    renderRings();
    renderHud(true);
    saveLater();
  }

  function previewFor(id) {
    if (typeof id === 'string' && id.startsWith('look:')) {
      const look = engine.looks.get(id.slice(5));
      return look ? Object.fromEntries(engine.looks.slots.filter(slot => look.pieces[slot]).map(slot => [slot, look.pieces[slot]])) : null;
    }
    if (typeof id === 'string' && id.startsWith('set:')) {
      const set = engine.data.sets.find(entry => entry.id === id.slice(4));
      return set ? { chapeu: set.hat, mao: set.hand, tecido: set.fabric } : null;
    }
    const item = engine.items[id];
    if (!item) return null;
    return item.cat === 'lado' ? { [ui.dock.side]: id } : { [item.cat]: id };
  }

  // Clique num conjunto: veste as três peças se a pessoa tem todas; senão, diz quais faltam.
  function dockSet(id) {
    const set = engine.data.sets.find(entry => entry.id === id);
    if (!set) return;
    const pieces = [set.hat, set.hand, set.fabric];
    const missing = pieces.filter(piece => !engine.owned(piece));
    if (missing.length) {
      toast(t('app.setMissing', { name: set.name, list: missing.map(piece => engine.items[piece]?.name || piece).join(', ') }), 'erro');
      return;
    }
    for (const piece of pieces) engine.equip(piece);
    tocar('equipar');
    ui.preview = null;
    saveLater();
    renderDock();
  }

  // Itens que não se compram: de onde cada um vem (rolês, Argolas, casamento, leilão).
  const ONLY_FROM = { role: 'app.onlyOutings', argolas: 'app.onlyRings', casamento: 'app.onlyWedding', leilao: 'app.onlyAuction', cobra: 'app.onlySnake', luta: 'app.onlyBattle' };
  function dockItem(id) {
    const item = engine.items[id];
    const side = ui.dock.side;
    if (engine.owned(id)) {
      engine.equip(id, side);
      tocar('equipar');
    } else if (ONLY_FROM[item.source]) { toast(t(ONLY_FROM[item.source], { item: item.name })); return; }
    else if (engine.itemLocked(id)) { toast(t('app.unlocksAt', { tier: engine.data.tiers[item.tier].name })); return; }
    else if (!engine.buyItem(id)) { toast(t('app.needTickets', { item: item.name, n: item.price }), 'erro'); return; }
    else {
      engine.equip(id, side);
      tocar('moeda');
      toast(t('app.yours', { item: item.name }));
    }
    ui.preview = null;
    saveLater();
    renderDock();
  }

  // Comida da aba Comidas: paga em Animação, enche a Barriga e voa até a Mandioca (a festa desenha).
  function feedFood(id) {
    const result = engine.feed(id);
    if (result.full) { toast(t('app.bellyFull')); return; }
    if (!result.ok) { toast(t('app.needCheer'), 'erro'); tocar('erro'); return; }
    tocar('moeda');
    saveLater();
    renderDock();
    refreshLive(true);
  }

  // Segurar o botão de uma melhoria compra um nível atrás do outro.
  function updateStatCard(button, stat) {
    const card = button.closest('.vcard');
    const level = engine.level(stat);
    const unit = engine.stats[stat];
    const fmt = value => stat === 'refresco' || stat === 'ritmo' ? UI.number(value, 2) : UI.number(value);
    const cost = engine.levelCost(stat);
    button.dataset.cost = cost;
    const field = name => card?.querySelector(`[data-field="${name}"]`);
    if (field('nivel')) field('nivel').textContent = t('level.short', { n: level });
    if (field('valor')) field('valor').textContent = `${fmt(engine.statValue(stat))} → ${fmt(engine.statValue(stat, level + 1))}`;
    if (field('custo')) field('custo').textContent = UI.compact(cost);
    return unit;
  }

  // Segurar o botão: compra de novo e de novo (melhoria de atributo ou ficha), cada vez um pouco mais agudo.
  function startHold(button) {
    wakeGame();
    stopHold();
    const kind = button.dataset.hold;
    const stat = button.dataset.stat;
    const hold = { count: 0, kind, button, timer: null, interval: null };
    const buy = () => {
      if (ui.hold !== hold) return;
      if (button.isConnected === false) { stopHold(); return; }
      if (wakeGame()) return;
      if (kind === 'ficha' ? engine.buyTicket() : engine.buyLevel(stat)) {
        hold.count++;
        tocar(kind === 'ficha' ? 'moeda' : 'nivel', { pitch: Math.min(hold.count - 1, 12) });
        if (kind === 'ficha') updateTicketButton(button);
        else updateStatCard(button, stat);
        refreshLive(true);
        return;
      }
      stopHold();
    };
    ui.hold = hold;
    buy();
    if (!hold.count) { toast(t('app.needCheer'), 'erro'); ui.hold = null; return; }
    hold.timer = setTimeout(() => { hold.interval = setInterval(buy, 80); }, 380);
  }

  // O preço da próxima ficha no botão, enquanto ele é segurado (a vitrine só é redesenhada ao soltar).
  function updateTicketButton(button) {
    const cost = engine.ticketCost();
    button.dataset.cost = String(cost);
    const price = button.querySelector?.('.preco');
    if (price?.lastChild) price.lastChild.textContent = UI.compact(cost);
  }

  function stopHold() {
    const hold = ui.hold;
    if (!hold) return;
    ui.hold = null;
    clearTimeout(hold.timer);
    clearInterval(hold.interval);
    if (hold.count > 1) toast(hold.kind === 'ficha' ? t('gain.tickets', { n: hold.count }) : t('app.levels', { n: hold.count }));
    if (hold.kind === 'ficha') renderRings();
    saveLater();
    renderDock();
    renderHud(true);
  }

  // --- Ações -------------------------------------------------------------------------------------------
  function done(ok, message, fail, sound) {
    if (ok) {
      if (sound) tocar(sound);
      if (message) toast(message);
      saveLater();
      renderHud(true);
      renderWindows();
      renderDock();
    } else if (fail) toast(fail, 'erro');
  }

  function fishReveal(result) {
    const char = result.char;
    const rarity = data.rarities[char.rarity].name;
    const title = result.isNew ? t('fish.newMember', { name: char.name }) : t('fish.again', { name: char.name, n: result.level });
    showModal(`<div class="revelar r${char.rarity}">${icon(`char:${char.id}`, 'retrato')}</div>` +
      `<h2>${UI.esc(title)}</h2><p class="papel">${UI.esc(char.role)} · ${UI.esc(rarity)}</p>` +
      `<p>${UI.esc(engine.effectText(char.id))}</p>` +
      (result.tickets ? `<p>${UI.esc(t('fish.maxLevel', { n: result.tickets }))}</p>` : '') +
      `<p class="miudo">${UI.esc(t(engine.charActive(char.id) ? 'fish.working' : 'fish.postClosed'))}</p>` +
      `<div class="botoes"><button class="btn" data-action="fechar-janela">${UI.esc(t('fish.ok'))}</button></div>`);
    ui.festa?.celebrate(performance.now(), t(result.isNew ? 'fx.newMember' : 'fx.levelUp'));
    tocar(result.isNew ? 'revelar' : 'pesca');
  }

  // Trocar o idioma salva a festa e abre de novo: todos os textos (e os dados do jogo) voltam no idioma novo.
  // No PC, quem abre a festa nova é o Electron, numa janela nova (desktop/main.js explica por que não recarregar).
  function changeLanguage(choice) {
    if (!choice || choice === language.choice) return;
    if (!save()) return;
    if (desktop?.setLanguage) { desktop.setLanguage(choice); return; }
    try {
      sessionStorage.setItem(REOPEN_KEY, 'ajustes');
      localStorage.setItem(LANGUAGE_KEY, choice);
    } catch (_) { /* sem armazenamento */ }
    location.reload();
  }

  // Legenda da foto da festa: o nome dela (ou o do jogo), o porte e os convidados.
  function photoCaption() {
    return { title: engine.state.name && engine.state.name !== 'Mandioca' ? engine.state.name : t('app.title'),
      subtitle: (t('party.subtitle', { tier: engine.tier().name, n: engine.state.size }) +
        (engine.state.year > 1 ? ` · ${t('hud.year', { n: engine.state.year })}` : '')).replace(/\s*·\s*/g, ' - ') };
  }

  function download(name, url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  }

  function quitGame() {
    if (!desktop) { toast(t('app.browserClose')); return; }
    if (now() < ui.closeArmedUntil) { save(); desktop.quit(); return; }
    ui.closeArmedUntil = now() + 3000;
    toast(t('app.closeAgain', { v: Math.round(engine.offlineRate() * 100), h: engine.cfg.offlineCapHours }));
    renderHud(true);
    setTimeout(() => renderHud(true), 3100);
  }

  function act(button) {
    const a = button.dataset.action;
    const d = button.dataset;
    if (a === 'abrir') { if (ui.open) closePanel(); else openPanel(); return; }
    if (a === 'fechar') { closePanel(); return; }
    if (a === 'fechar-janela') { closeModal(); return; }
    // O botão de Conquistas da placa alterna: aberto nessa aba, fecha.
    if (a === 'tab') { if (d.alternar && ui.open && ui.tab === d.tab) closePanel(); else openPanel(d.tab); return; }
    if (a === 'tela') { openTela(d.tela); return; }
    if (a === 'tela-fechar') { closeTela(); return; }
    if (a === 'historico-filtro') { ui.logFilter = d.value; renderWindows(); return; }
    if (a === 'mundo-filtro') { ui.mundoFilter = d.value; renderWindows(); return; }
    if (a === 'teste-aba') { ui.testeTab = d.value === 'mundo' ? 'mundo' : 'geral'; renderWindows(); return; }
    if (a === 'debug') {
      const note = engine.debug(d.op, d.value);
      const entry = engine.state.log.at(-1);
      if (note) toast(t('app.debug', { note: entry?.type === 'debug' ? UI.debugText(engine, entry) : note }));
      renderHud(true);
      renderWindows();
      renderDock();
      saveLater();
      return;
    }
    if (a === 'vitrine') { if (ui.dock.open) closeDock(); else openDock(); return; }
    if (a === 'vitrine-fechar') { closeDock(); return; }
    if (a === 'vitrine-cat') {
      if (ui.hold?.button.closest?.('#vitrine')) stopHold();
      ui.dock.cat = d.cat;
      ui.preview = null;
      renderDock();
      return;
    }
    // As gavetas da placa (janelas e coleções): clicar abre, clicar de novo fecha; a escolha fica nas preferências.
    if (a === 'gaveta') { changeSettings({ gaveta: ui.settings.gaveta === d.gaveta ? null : d.gaveta }); return; }
    if (a === 'vitrine-lado') { ui.dock.side = d.side; ui.preview = null; renderDock(); return; }
    // O guarda-roupa: salvar o visual de agora, vestir um look salvo, apagar e o look surpresa.
    if (a === 'look-salvar') {
      const result = engine.looks.save();
      if (result.ok) { tocar('carta'); toast(t('app.lookSaved', { name: result.look.name })); saveLater(); }
      else toast(result.reason === 'full' ? t('app.lookFull', { max: result.max }) : t('app.lookSame', { name: result.name }), 'erro');
      renderDock();
      return;
    }
    if (a === 'look-vestir') {
      const result = engine.looks.wear(d.id);
      if (!result.ok) return;
      tocar('equipar');
      ui.festa?.celebrate?.(performance.now(), t('fx.lookNovo'));
      toast(result.lacking.length ? t('app.lookWornMissing', { name: result.look.name, list: result.lacking.map(id => engine.items[id]?.name || id).join(', ') })
        : t('app.lookWorn', { name: result.look.name }));
      ui.preview = null;
      saveLater();
      renderDock();
      return;
    }
    if (a === 'look-apagar') {
      const look = engine.looks.get(d.id);
      if (!look || !confirm(t('looks.confirmDelete', { name: look.name }))) return;
      engine.looks.remove(d.id);
      toast(t('app.lookDeleted', { name: look.name }));
      ui.preview = null;
      saveLater();
      renderDock();
      return;
    }
    if (a === 'look-sortear') {
      engine.looks.random();
      tocar('brilho');
      ui.festa?.celebrate?.(performance.now(), t('fx.lookNovo'));
      toast(t('app.lookRandom'));
      ui.preview = null;
      saveLater();
      renderDock();
      return;
    }
    // As pílulas da vitrine: mostra só os itens daquele grupo (cada categoria lembra o seu filtro), com a grade de volta ao começo.
    if (a === 'vitrine-grupo') {
      ui.dock.groups[ui.dock.cat] = d.grupo;
      ui.preview = null;
      renderDock();
      const grid = $('#vitrine').querySelector?.('.vgrade');
      if (grid) grid.scrollLeft = 0;
      return;
    }
    if (a === 'vitrine-item') { dockItem(d.id); return; }
    if (a === 'vitrine-conjunto') { dockSet(d.id); return; }
    if (a === 'vitrine-comida') { feedFood(d.id); return; }
    // A linha da felicidade na placa: abre (ou fecha) a loja na aba Comidas.
    if (a === 'comidas') { if (ui.dock.open && ui.dock.cat === 'comidas') closeDock(); else openDock('comidas'); return; }
    if (a === 'argolas') { if (ui.rings.open) closeRings(); else openRings(); return; }
    if (a === 'argolas-fechar') { closeRings(); return; }
    if (a === 'argolas-jogar') {
      const round = engine.startRings();
      if (!round) { toast(t('app.needTicket'), 'erro'); return; }
      ui.rings.playing = true;
      ui.rings.result = null;
      ui.game?.start(round, performance.now());
      tocar('moeda');
      renderRings();
      renderHud(true);
      return;
    }
    if (a === 'zoom') { setZoom(Number(d.value), true); return; }
    if (a === 'fechar-jogo') { quitGame(); return; }
    if (a === 'ficha') { done(engine.buyTicket(), t('app.ticket'), t('app.needCheer'), 'moeda'); renderRings(); return; }
    if (a === 'melhorar') { done(engine.buyLevel(d.stat), null, t('app.needCheer'), 'nivel'); return; }
    if (a === 'pescar') {
      const result = engine.fish();
      if (result) {
        // Com a cena da barraca na tela, a vara joga, o peixinho morde e só depois abre o resultado; sem ela, abre na hora.
        if (ui.pesca && ui.tela.open && ui.tela.id === 'pescaria') ui.pesca.cast(result, performance.now(), () => fishReveal(result));
        else fishReveal(result);
        done(true);
      }
      return;
    }
    if (a === 'role-enviar') {
      const select = document.querySelector(`select[data-role="${d.index}"]`);
      done(engine.startOuting(Number(d.index), select?.value),
        select ? t('app.outingStart', { name: engine.chars[select.value].name }) : null, t('app.outingFail'));
      return;
    }
    if (a === 'role-cancelar') { done(engine.cancelOuting(Number(d.index)), t('app.recalled')); return; }
    if (a === 'role-resgatar') {
      const result = engine.claimOuting(Number(d.index));
      done(!!result, result ? (result.item ? t('app.woodAndItem', { n: result.wood, item: result.item.name })
        : t('app.woodGot', { n: result.wood })) : null, null, 'lenha');
      return;
    }
    if (a === 'fogueira') { done(engine.buyBonfire(d.id), t('app.fireGrew'), t('app.needWood'), 'fogo'); return; }
    if (a === 'cozinhar') { done(engine.cook(d.id), t('app.cookStart', { dish: engine.recipe(d.id)?.name || d.id }), t('app.needWood'), 'fogo'); return; }
    if (a === 'servir') { serveDish(); return; }
    if (a === 'meta-trocar') {
      const goal = engine.swapGoal(Number(d.index));
      done(!!goal, goal ? t('app.goalSwapped', { goal: t(`goal.${goal.type}`, { n: goal.target }) }) : null,
        t('app.needTicketsSwap', { n: engine.cfg.goalSwapCost }), 'clique');
      return;
    }
    if (a === 'meta-resgatar') {
      const reward = engine.claimGoal(Number(d.index));
      done(!!reward, reward ? t('app.goalClaimed', { tickets: reward.tickets }) : null, null, 'moeda');
      return;
    }
    if (a === 'carta') {
      const letter = engine.openLetter();
      if (letter) {
        ui.lastLetter = letter;
        tocar('carta');
        ui.festa?.poke('coracoes');
        showModal(`<div class="bilhete grande"><p>${UI.esc(t('quote', { text: letter.text }))}</p></div>` +
          `<p>${UI.esc(t('gain.tickets', { n: letter.tickets }))}</p>` +
          `<div class="botoes"><button class="btn" data-action="fechar-janela">${UI.esc(t('mail.ok'))}</button></div>`);
      }
      done(!!letter);
      return;
    }
    if (a === 'foto') {
      tocar('foto');
      download('mandioca-festa.png', ui.festa ? ui.festa.photo(4, photoCaption()) : '');
      return;
    }
    if (a === 'retrato') {
      tocar('foto');
      download('mandioca-retrato.png', ui.festa ? ui.festa.portrait(4, photoCaption()) : '');
      return;
    }
    if (a === 'foto-salvar') {
      if (ui.lastPhoto) download('mandioca-lambe-lambe.png', ui.lastPhoto);
      return;
    }
    if (a === 'som') {
      // Liga na hora (sem esperar o desktop responder), para o próprio clique já soar.
      const on = d.value === 'on';
      ui.settings.sound = on;
      som?.set({ enabled: on && !ui.settings.hidden });
      changeSettings({ sound: on });
      if (on) tocar('moeda');
      else ui.tocou = true;
      return;
    }
    if (a === 'perf') { changeSettings({ perf: d.value }); return; }
    if (a === 'flash') { changeSettings({ flash: d.value === 'on' }); return; }
    if (a === 'calmo') { changeSettings({ calm: d.value === 'on' }); return; }
    if (a === 'musica') { changeSettings({ music: d.value === 'on' }); return; }
    if (a === 'inicio') { changeSettings({ startup: d.value === 'on' }); return; }
    if (a === 'ano-novo') {
      if (!engine.canNewYear()) return;
      showModal(`<h2>${UI.esc(t('year.title'))}</h2><p>${UI.esc(t('year.confirm', { v: Math.round(engine.cfg.yearBonus * 100),
        n: engine.state.year + 1 }))}</p><p class="miudo">${UI.esc(t('year.keeps'))}</p>` +
        `<div class="botoes"><button class="btn" data-action="ano-novo-sim">${UI.esc(t('year.yes'))}</button>` +
        `<button class="btn claro" data-action="fechar-janela">${UI.esc(t('year.no'))}</button></div>`);
      return;
    }
    if (a === 'ano-novo-sim') {
      if (!engine.newYear()) return;
      closeModal();
      forgetRound();
      ui.janelas?.reset();
      save();
      renderHud(true);
      renderWindows();
      renderDock();
      return;
    }
    if (a === 'bingo-comprar') {
      if (engine.buyBingo()) { tocar('moeda'); saveLater(); renderHud(true); renderTela(); }
      else toast(t('app.needTickets', { item: t('tab.bingo'), n: engine.bingoCost() }), 'erro');
      return;
    }
    if (a === 'fixar') { changeSettings({ pinned: !ui.settings.pinned }); return; }
    if (a === 'placa') { changeSettings({ hud: d.value }); return; }
    if (a === 'placa-auto') {
      changeSettings({ placa: null, casa: null, minis: Object.fromEntries(Object.entries(ui.settings.minis || {}).map(([id, entry]) => [id, { hidden: entry.hidden }])) });
      return;
    }
    if (a === 'mini') { ui.janelas?.toggle(d.mini); return; }
    if (a === 'mini-fechar') { ui.janelas?.close(d.mini); return; }
    if (a === 'mini-ajuda') { ui.janelas?.toggleHelp(d.mini); return; }
    if (a === 'casa') { setCasaHelp(false); changeSettings({ casaHidden: !ui.settings.casaHidden }); return; }
    if (a === 'casa-fechar') { setCasaHelp(false); changeSettings({ casaHidden: true }); return; }
    if (a === 'casa-ajuda') { setCasaHelp(!!$('#casa-ajuda')?.hidden); return; }
    if (a === 'idioma') { changeLanguage(d.value); return; }
    if (a === 'esconder') {
      changeSettings({ hidden: true });
      closePanel();
      closeDock();
      closeTela();
      closeRings();
      toast(t('app.hidden'));
      return;
    }
    if (a === 'sair') { save(); desktop?.quit(); return; }
    if (a === 'exportar') {
      save();
      const blob = new Blob([JSON.stringify(engine.exportState(), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      download('mandioca-save.json', url);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    // Com a janela de escolher arquivo aberta, a festa fica desabilitada (o mouse não chega nela, e não é defeito).
    if (a === 'importar') {
      importRequest++;
      ui.picking = true;
      const input = $('#importar');
      input.value = '';
      input.click();
      return;
    }
    if (a === 'reiniciar') {
      if (!confirm(t('app.restartConfirm'))) return;
      importRequest++;
      $('#importar').value = '';
      const restarted = new GameEngine(data);
      if (!saveReplacement(restarted, 'app.restartNotSaved')) return;
      engine = restarted;
      ui.janelas?.setEngine(engine);
      ui.tab = 'festa';
      forgetRound();
      renderHud(true);
      renderWindows();
      renderDock();
    }
  }

  // Depois de reiniciar ou importar outra festa, nada da festa anterior fica na tela.
  function forgetRound() {
    gameGeneration++;
    dropPointer();
    closeModal();
    ui.lastLetter = null;
    ui.lastPhoto = null;
    ui.preview = null;
    ui.rings.playing = false;
    ui.rings.result = null;
    ui.game?.reset();
    ui.festa?.reset?.();
    ui.casa?.reset?.();
    renderRings();
    lastFrame = performance.now();
  }

  // Cliques na própria festa. Clicar numa barraca abre a janela dela (se já está aberta, fica aberta).
  // Servir o prato pronto do Fogão a Lenha (pelo botão da cozinha ou clicando no prato em cima do fogão).
  function serveDish() {
    const dish = engine.serve();
    if (dish) done(true, t('app.cookServed', { dish: engine.recipe(dish.id)?.name || dish.id, v: Math.round(dish.bonus * 100), n: dish.minutes }), null, 'premio');
  }

  // O que uma visita do folclore deu, em linhas ("+2 fichas +5 lenha...").
  const folcloreGains = given => UI.gains(given);

  function festaClick(region, at = null) {
    if (region === 'request') {
      const result = engine.claimRequest();
      if (result) done(true, t('app.requestDone', { n: UI.compact(result.reward) }), null, 'moeda');
    } else if (region === 'balao-sorte') {
      const result = engine.claimBalloon();
      if (result) {
        const message = result.kind === 'frenzy' ? t('app.balloonFrenzy', { mult: result.mult, s: result.seconds })
          : t(`app.balloon.${result.kind}`, { n: UI.compact(result.amount) });
        done(true, message, null, result.kind === 'frenzy' ? 'porte' : 'premio');
      }
    } else if (typeof region === 'string' && region.startsWith('lanterna:')) {
      ui.festa?.poke(region);
      tocar('arremesso');
    } else if (typeof region === 'string' && region.startsWith('mundo:')) {
      // Um alvo do evento do mundo (estrela, lampião, vaga-lume, olhos, pipa, balão d'água, cometa).
      const result = engine.mundo.catchTarget(Number(region.slice(6)));
      if (!result.ok && result.reason === 'order') {
        tocar('errou');
        toast(t(result.id === 'abobora' ? 'app.mundoOrdemAbobora' : 'app.mundoOrdem'));
      } else if (result.ok && result.partial) {
        // Um golpe numa pinhata: só a festa reage (balança, solta doce e toca o martelo); o prêmio vem no último.
      } else if (!result.ok && result.reason === 'poor') {
        const entry = engine.mundo.event(result.id);
        tocar('errou');
        toast(t('app.mundoPobre', { name: entry[`shop${result.k}`] || entry.name, cost: result.cost }));
      } else if (result.ok && result.buff) {
        // Compra na barraca da feira: o aviso diz o bônus, o tempo e o preço.
        const entry = engine.mundo.event(result.id);
        done(true, t('app.mundoCompra', { name: entry[`shop${result.k}`] || entry.name, v: Math.round(result.buff.bonus * 100), min: Math.round(result.buff.seconds / 60), cost: result.buff.cost }) +
          (result.all ? ` ${t('app.mundoTudo', { name: entry.name, gains: folcloreGains(result.finale || {}) })}` : ''), null, result.all ? 'premio' : 'moeda');
      } else if (result.ok) {
        const entry = engine.mundo.event(result.id);
        const gains = folcloreGains(result.given);
        done(true, result.all
          ? t('app.mundoTudo', { name: entry.name, gains: `${gains} ${folcloreGains(result.finale || {})}`.trim() })
          : t('app.mundoPego', { name: entry.name, gains, left: result.left }), null, result.all ? 'premio' : 'brilho');
      }
    } else if (region === 'premio:desfile') {
      // O Desfile dos Prêmios: um clique em qualquer um da fila ganha o prêmio do desfile (uma vez só).
      const result = engine.premios.catchParade();
      if (result.ok) done(true, t('app.premioDesfile', { n: result.n, gains: folcloreGains(result.given) }), null, 'premio');
    } else if (typeof region === 'string' && region.startsWith('premio:')) {
      // Coisa ou personagem de um minigame: a coisa reage; o personagem, com o presente pronto, dá o presente (de tempos em tempos).
      const entry = engine.premios.item(region.slice(7));
      ui.festa?.poke(region);
      if (entry && entry.tipo === 'personagem') {
        const result = engine.premios.gift(entry.id);
        if (result.ok) done(true, t('app.premioGift', { name: entry.name, gains: folcloreGains(result.given) }), null, 'premio');
        else if (result.reason === 'wait') { tocar('clique'); toast(t('app.premioWait', { name: entry.name, time: UI.duration(result.wait) })); }
      } else if (entry) tocar(PREMIO_SONS[entry.id] || 'clique');
    } else if (typeof region === 'string' && region.startsWith('bicho:')) {
      ui.festa?.poke(region);
      tocar(BICHO_SONS[region.split(':')[1]] || 'clique');
      // O carreiro do carro de boi deixa lenha para a fogueira (uma vez por passada).
      if (region === 'bicho:carro-boi') {
        const cart = engine.cartWood();
        if (cart) { toast(t('app.cartWood', { n: cart.wood })); renderHud(true); saveLater(); }
      }
    } else if (region === 'pote') {
      const result = engine.hitPote();
      if (result.broke) done(true, t('app.poteBreak', { n: UI.compact(result.amount), tickets: result.tickets }), null, 'quebra');
      else if (result.ready) tocar('pote');
    } else if (region === 'saco') {
      const result = engine.hopSaco();
      if (result.done) {
        done(true, t(`app.sacoEnd.${result.place}`, { n: UI.compact(result.amount), tickets: result.tickets, s: UI.number(result.seconds, 1) }), null,
          ['conquista', 'premio', 'errou'][result.place - 1]);
      } else if (result.fell) tocar('tombo');
      else if (result.active && !result.down) tocar('pulo', { pitch: result.hops % 2 ? 0 : 3 });
    } else if (region === 'cobra') {
      const result = engine.catchCobra();
      if (result) {
        done(true, t('app.cobraCaught', { n: UI.compact(result.amount) }) +
          (result.item ? ` ${t('app.cobraGift', { name: engine.items[result.item]?.name || result.item })}` : ''), null, 'premio');
      }
    } else if (region === 'burro') {
      const result = engine.pinBurro();
      if (result) {
        done(true, t(`app.burroPin.${result.grade}`, { n: UI.compact(result.amount), tickets: result.tickets }), null,
          { mosca: 'conquista', perto: 'premio', longe: 'acerto', fora: 'errou' }[result.grade]);
      }
    } else if (region === 'folclore') {
      const result = engine.mini('folclore').act();
      if (result) {
        const entry = engine.data.minis.folclore.events.find(item => item.id === result.id);
        done(true, t('app.folcloreCatch', { text: entry?.text || '', gains: folcloreGains(result.given) }), null, null);
      }
    } else if (region === 'compadres') {
      const result = engine.witnessCompadres();
      if (result) done(true, t('app.compadres', { n: UI.compact(result.amount) }), null, 'premio');
    } else if (region === 'prato') {
      serveDish();
    } else if (region === 'bandeirinha') {
      const flag = engine.catchFlag();
      if (flag) done(true, t('app.flag', { n: flag.tickets }), null, 'premio');
    } else if (region === 'fotografo') {
      const result = engine.shootFoto();
      if (result) {
        tocar('foto');
        // O retrato sai na hora, com a moldura e a legenda da festa, numa janela com o botão de salvar.
        ui.lastPhoto = ui.festa ? ui.festa.portrait(4, photoCaption()) : '';
        showModal(`<h2>${UI.esc(t('app.fotoTitle'))}</h2>` +
          (ui.lastPhoto ? `<img class="retrato" src="${ui.lastPhoto}" alt="${UI.esc(t('app.fotoTitle'))}">` : '') +
          `<p>${UI.esc(t('app.fotoTickets', { n: result.tickets }))}</p>` +
          `<div class="botoes"><button class="btn claro" data-action="foto-salvar">${UI.esc(t('app.fotoSave'))}</button>` +
          `<button class="btn" data-action="fechar-janela">${UI.esc(t('app.fotoOk'))}</button></div>`);
        renderHud(true);
        saveLater();
      }
    } else if (region === 'sanfoneiro') {
      const result = engine.greetVisitor();
      if (result) done(true, t('app.visitorGreet', { n: result.tickets }), null, 'premio');
    } else if (region === 'leilao') {
      const result = engine.bidLeilao();
      if (result.broke) toast(t('app.leilaoBroke', { n: result.bid }), 'erro');
      else if (result.bid) { tocar('lance'); renderHud(true); saveLater(); }
    } else if (region === 'casamento') {
      if (engine.throwRice().ready) tocar('arroz');
    } else if (region === 'pote-ouro') {
      const result = engine.claimRainbow();
      if (result) done(true, t('app.rainbowPot', { n: UI.compact(result.amount), tickets: result.tickets }), null, 'premio');
    } else if (region === 'host') {
      const result = engine.pokeHost();
      if (result.ready) { tocar('carinho'); saveLater(); refreshLive(true); }
    } else if (region === 'crasher') {
      const result = engine.shooCrasher();
      if (result) done(true, t('app.crasherOut', { n: result.tickets }), null, 'expulsar');
    } else if (region === 'fogueira') { if (engine.tierIndex() >= 2) openTela('fogueira', false); }
    else if (region === 'palco') openTela('turma', false);
    else if (region === 'sopinha') { ui.festa?.poke('sopinha'); tocar('carinho'); }
    else if (region === 'par') { ui.festa?.poke('par'); tocar('carinho'); }
    // Clique no chão: estalinho ali mesmo (o som vem da festa).
    else if (region === 'terreiro' && at) {
      ui.festa?.estalo?.(at.x, at.y);
      // Estalinho jogado por você deixa a Mandioca contente: um pouco de Amor.
      if (engine.popLove()) refreshLive(true);
    }
    else if (region === 'lado-esquerda' || region === 'lado-direita') {
      const side = region === 'lado-esquerda' ? 'esquerda' : 'direita';
      const id = engine.state.equipped[side];
      if (id === 'barraca-argolas') openRings();
      else if (id === 'barraca-pescaria' && engine.tierIndex() >= 1) openTela('pescaria', false);
      else if (id === 'correio') openTela('correio', false);
      else if (id === 'fogao-lenha' && engine.cookOpen()) openTela('cozinha', false);
      else {
        // As outras barracas e os enfeites respondem ao clique na própria festa (beijo, pipoca, xô...).
        ui.festa?.poke(`lado:${side}`);
        tocar(LADO_SONS[id] || 'clique');
        if (id === 'barraca-beijo') {
          const kiss = engine.kiss();
          if (kiss.ready) { toast(t('app.kiss', { n: kiss.tickets })); renderHud(true); saveLater(); }
        }
      }
    }
    // Os enfeites são cenário: o clique só dá foco ao jogo (a loja abre pelo botão).
  }

  // O som de cada barraca ou enfeite que responde ao clique.
  const LADO_SONS = { 'barraca-beijo': 'carinho', 'barraca-comidas': 'bola', cadeia: 'penetra', espantalho: 'galinha', fardo: 'pintinho',
    mastro: 'equipar', carroca: 'lenha', 'barril-quentao': 'bola', 'fogao-lenha': 'fogo', 'barraca-cordel': 'revelar' };
  // O som de cada bicho da festa que reage ao clique.
  const BICHO_SONS = { sapo: 'sapo', trem: 'apito', kombi: 'buzina', 'carro-boi': 'boi', papagaio: 'papagaio', jegue: 'zurro', carrossel: 'arremesso', catavento: 'arremesso', caramelo: 'latido', roda: 'arremesso', lua: 'carinho', pipa: 'arremesso', igreja: 'sino', galinha: 'galinha', pintinho: 'pintinho', bode: 'bode', gato: 'gato', boi: 'boi', crianca: 'crianca', amendoim: 'crianca', rafael: 'yeah' };

  // O som da chegada de cada evento do mundo (src/som.js).
  const MUNDO_SONS = { estrelas: 'brilho', ventania: 'assobio', vagalumes: 'bolha', calorao: 'fogo', feira: 'quadrilha', poente: 'sinos', tesouro: 'moeda', neve: 'brilho', tremor: 'lenha', cheia: 'bolha', constelacao: 'brilho', sapos: 'sapo', trem: 'apito', pinhata: 'arremesso', amanhecer: 'canto', turbulencia: 'assobio', fichas: 'moeda', chapeus: 'equipar', pelada: 'apito', toupeiras: 'tombo', coelho: 'brilho', aurora: 'sinos', vacalua: 'boi', fumaca: 'assobio', tubaroes: 'trovao', bolhas: 'bolha', avioes: 'assobio', patinhos: 'pato', abelhas: 'zumbido', planetas: 'brilho', circo: 'canhao', balada: 'palco-zabumba', baleia: 'baleia', baloagigante: 'crescer', fada: 'brilho', pterodatilos: 'papagaio', manada: 'rugido', ovos: 'quebra', meteoro: 'chama', bruxas: 'bruxa', abobora: 'sinos', fantasmas: 'canto', luasangue: 'uivo', horda: 'gemido', gosma: 'bolha', helicoptero: 'helice', surto: 'sirene', temporal: 'trovao', lua: 'uivo', petalas: 'carinho', baloes: 'arremesso', granizo: 'chuva', eclipse: 'sinos', redemoinho: 'assobio', pipoca: 'galinha', fogos: 'fogo', boitata: 'chama', revoada: 'pombo', procissao: 'sinos', ovni: 'bolha', cometa: 'crescer' };

  // O som de cada coisa dos prêmios quando clicada (src/som.js).
  const PREMIO_SONS = { ursinhos: 'carinho', 'balde-peixes': 'pesca', 'globo-bingo': 'bola', burrico: 'zurro', 'fita-chegada': 'apito', 'pote-enfeitado': 'pote',
    'martelo-banco': 'martelo', 'cesto-cobra': 'cobra', 'varal-cordeis': 'carta', 'cocho-milho': 'pintinho', 'barril-aquario': 'bolha', 'carrinho-legumes': 'lenha',
    'panela-fogo': 'fogo', 'cesta-pamonhas': 'lenha', 'cabide-fantasias': 'equipar', 'bolo-noiva': 'sinos', 'camera-tripe': 'foto', 'placa-penetra': 'expulsar',
    'poleiro-pombos': 'pombo', 'album-gigante': 'revelar', 'corneta-alto': 'altofalante', 'almofada-coracao': 'carinho', 'cacho-baloes': 'arremesso', 'pote-ouro-arco': 'moeda', 'mastro-bandeirinhas': 'arremesso',
    'banco-praca': 'clique', 'mesa-compadres': 'canto', 'roda-carro-boi': 'boi', 'caderno-pedidos': 'aviso', 'estacao-tempo': 'assobio', zabumba: 'palco-zabumba', 'totem-curupira': 'assobio', telescopio: 'brilho', 'caixa-correio': 'carta', 'lanterna-boitata': 'chama' };

  // --- Eventos do motor --------------------------------------------------------------------------------
  // Som de cada acontecimento da festa (os que o jogador não causou com um clique).
  const EVENT_SOUNDS = { contest: 'porte', daily: 'premio', 'new-year': 'porte', 'bingo-number': 'bola', 'bingo-line': 'acerto', 'bingo-win': 'conquista', 'bingo-lost': 'errou', 'quadrilha-call': 'grito', pote: 'aviso', saco: 'aviso', 'saco-go': 'juiz', leilao: 'aviso', 'leilao-call': 'martelo', announce: 'altofalante', cobra: 'cobra', fotografo: 'aviso', burro: 'aviso', 'fantasia-soon': 'aviso', cold: 'chuva', quentao: 'moeda', sticker: 'revelar', 'album-page': 'conquista', visitor: 'quadrilha', set: 'premio', wedding: 'sinos', 'wedding-end': 'premio', 'special-day': 'quadrilha', quadrilha: 'quadrilha', 'goal-done': 'aviso', rain: 'chuva', thunder: 'trovao', 'rain-end': 'arcoiris', balloon: 'aviso', 'frenzy-start': 'porte', learn: 'crescer', grow: 'crescer', 'tier-up': 'porte', legendary: 'porte', achievement: 'conquista', 'fishing-open': 'aviso', rafael: 'yeah',
    'prize-ready': 'aviso', 'letter-ready': 'pombo', 'outing-done': 'aviso', crasher: 'penetra', request: 'pedido',
    'size-up': 'convidado', premio: 'conquista', 'premio-parade': 'quadrilha', 'flare-start': 'fogo', 'cook-ready': 'aviso', 'house-room': 'crescer', 'house-resident': 'convidado' };
  // Acontecimentos que mudam o que as janelas mostram: prenda pronta, carta chegando, turma voltando do rolê...
  const REFRESH_EVENTS = new Set(['bingo-win', 'bingo-lost', 'goal-done', 'learn', 'grow', 'tier-up', 'fishing-open', 'prize-ready', 'letter-ready', 'outing-done', 'legendary', 'item', 'equip',
    'achievement', 'cook-ready', 'cook-end', 'cook-served', 'cook-start']);

  // Nome da prenda do leilão: o item ou os minutos de Animação.
  const prizeName = prize => (prize?.item ? engine.items[prize.item]?.name || prize.item : t('app.leilaoPrizeCheer', { n: UI.compact(prize?.cheer || 0) }));

  // Cômodo ou morador novo na casa: um aviso cada (se chegarem vários de uma vez, como depois de um tempo fora, um só).
  function houseToast(event, events) {
    const news = events.filter(entry => entry.type === 'house-room' || entry.type === 'house-resident');
    if (news.length > 3) {
      if (event === news[0]) {
        toast(t('app.casaGrew', { rooms: news.filter(entry => entry.type === 'house-room').length,
          residents: news.filter(entry => entry.type === 'house-resident').length }), 'ouro');
        renderHud(true);
      }
      return;
    }
    if (event.type === 'house-room') {
      toast(t(event.first ? 'app.casaFirst' : 'app.casaRoom', { room: engine.houseRoom(event.room).name }), 'ouro');
    } else {
      const who = engine.houseResident(event.index);
      toast(t(who.role === 'esposa' ? 'app.casaEsposa' : who.role === 'filho' ? 'app.casaFilho' : 'app.casaResident', { name: who.name }), 'ouro');
    }
    renderHud(true);
    placeCasa();
  }

  function notify(events) {
    let refresh = false;
    const quiet = performance.now() < ui.quietUntil;
    const leveled = events.some(event => event.type === 'tier-up');
    for (const event of events) {
      if (REFRESH_EVENTS.has(event.type) || (event.type === 'mini' && event.mini === 'horta' && event.kind === 'harvest')) refresh = true;
      // Um porte novo já tem a sua fanfarra: o "convidado novo" do mesmo instante fica quieto.
      const sound = EVENT_SOUNDS[event.type] || (event.type === 'step' && event.crit ? 'cobra' : null);
      if (sound && !quiet && !(leveled && event.type === 'size-up')) tocar(sound);
      if (event.type === 'tier-up') {
        const tier = data.tiers[event.tier];
        toast(t('app.tierUp', { tier: tier.name, unlocks: tier.unlocks }), 'grande');
        renderDock();
      } else if (event.type === 'achievement') {
        toast(t('app.achievement', { name: data.achievements.find(a => a.id === event.id)?.name || event.id }), 'ouro');
      } else if (event.type === 'fishing-open') toast(t('app.fishingOpen'), 'grande');
      else if (event.type === 'prize-ready') toast(t('app.prizeReady'));
      else if (event.type === 'letter-ready') toast(t('app.letterReady'));
      else if (event.type === 'mini' && event.mini === 'mata' && event.kind === 'win' && event.first) {
        // O troféu do chefe avisa mesmo com a janela escondida.
        toast(t('mini.mata.cleared', { stage: event.stage }), 'ouro');
        for (const id of event.items || []) toast(t('mini.mata.unlocked', { item: engine.items[id]?.name || id }), 'ouro');
      } else if (event.type === 'mundo') {
        // Um evento do mundo começou: o aviso diz o que é e o que fazer; cada um tem o seu som.
        const entry = engine.mundo.event(event.id);
        const rare = !!entry && engine.mundo.rarity(entry) === 'rare';
        if (entry) toast(t(rare ? 'app.mundoInicioRaro' : 'app.mundoInicio', { name: entry.name, text: entry.text }), 'ouro');
        // Um aviso que se destaca: uma fanfarra só dos eventos (maior e com tambor nos raros, que também comemoram na festa) e, logo depois, o som do próprio evento.
        if (!quiet) {
          tocar(rare ? 'evento-raro' : 'evento');
          setTimeout(() => tocar(MUNDO_SONS[event.id] || 'aviso'), rare ? 1100 : 700);
        }
        if (rare) ui.festa?.celebrate?.(performance.now(), t('fx.mundoRaro'));
        refresh = true;
      } else if (event.type === 'mundo-fim') {
        const entry = engine.mundo.event(event.id);
        if (entry && event.got < event.n) toast(t('app.mundoFim', { name: entry.name, got: event.got, n: event.n }));
        refresh = true;
      } else if (event.type === 'premio-parade') {
        toast(t('app.premioDesfileStart'), 'ouro');
      } else if (event.type === 'premio') {
        // Um minigame liberou uma coisa ou um personagem na festa.
        const entry = engine.premios.item(event.id);
        if (entry) toast(t(entry.tipo === 'personagem' ? 'app.premioPerson' : entry.tipo === 'ouro' ? 'app.premioGold' : 'app.premioThing', { name: entry.name, game: engine.premios.game(entry.jogo)?.name || '' }), 'ouro');
        if (ui.tela.open && ui.tela.id === 'premios') refresh = true;
      } else if (event.type === 'mini' && event.mini === 'folclore' && event.kind === 'unlock') {
        // Derrotar uma criatura pela primeira vez na Mata libera a visita dela na festa.
        toast(t('app.folcloreUnlock', { name: engine.data.minis.folclore.events.find(item => item.id === event.id)?.name || event.id }), 'ouro');
      } else if (event.type === 'mini' && event.mini === 'folclore' && event.kind === 'start' && event.first) {
        toast(t('app.folcloreNew', { name: engine.data.minis.folclore.events.find(item => item.id === event.id)?.name || event.id }), 'ouro');
      } else if (event.type === 'mini' && event.mini === 'cordel' && (event.kind === 'page' || event.kind === 'page-done')) {
        const title = engine.data.minis.cordel.pages[event.page - 1]?.title || '';
        toast(t(event.kind === 'page' ? 'mini.cordel.newPage' : 'mini.cordel.pageDone', { title }), 'ouro');
      } else if (event.type === 'cook-ready') toast(t('app.cookReady', { dish: engine.recipe(event.id)?.name || event.id }), 'ouro');
      else if (event.type === 'outing-done') {
        toast(t('app.outingDone', { name: engine.chars[event.id]?.name || t('app.someone') }));
      } else if (event.type === 'special-day') {
        toast(t('app.specialDay', { name: t(`day.${event.id}`), v: Math.round(event.bonus * 100) }), 'ouro');
      } else if (event.type === 'contest') {
        toast(t(`app.contest.${event.place}`, { avg: UI.number(event.average, 1), tickets: event.tickets, n: UI.compact(event.amount) }),
          event.place === 1 ? 'ouro' : '');
      } else if (event.type === 'bingo-line') {
        toast(t('app.bingoLine', { n: event.tickets }));
      } else if (event.type === 'bingo-win') {
        toast(t('app.bingoWin', { tickets: event.tickets, n: UI.compact(event.amount), draws: event.draws }), 'ouro');
      } else if (event.type === 'bingo-lost') {
        toast(t('app.bingoLost'));
      } else if (event.type === 'record') {
        toast(t('app.record', { time: UI.duration(event.seconds * 1000), before: UI.duration(event.before * 1000) }), 'ouro');
      } else if (event.type === 'daily') {
        toast(t(event.streak > 1 ? 'app.dailyStreak' : 'app.daily', { n: event.tickets, streak: event.streak }), 'ouro');
      } else if (event.type === 'house-room' || event.type === 'house-resident') {
        houseToast(event, events);
      } else if (event.type === 'new-year') {
        toast(t('app.newYear', { n: event.year, v: Math.round(event.bonus * 100) }), 'grande');
      } else if (event.type === 'hint') {
        toast(t(`app.hint.${event.id}`));
      } else if (event.type === 'pote') {
        toast(t('app.pote'), 'ouro');
      } else if (event.type === 'saco') {
        toast(t('app.saco'), 'ouro');
      } else if (event.type === 'visitor') {
        toast(t('app.visitor', { v: Math.round(event.bonus * 100), s: event.seconds }), 'ouro');
      } else if (event.type === 'fotografo') {
        toast(t('app.fotografo'), 'ouro');
      } else if (event.type === 'burro') {
        toast(t('app.burro'));
      } else if (event.type === 'fantasia-soon') {
        toast(t('app.fantasiaSoon', { s: event.seconds }), 'ouro');
      } else if (event.type === 'fantasia') {
        if (!quiet) tocar(['conquista', 'premio', 'acerto'][event.place - 1] || 'acerto');
        toast(t(`app.fantasia.${event.place}`, { avg: UI.number(event.average, 1), tickets: event.tickets, n: UI.compact(event.amount) }),
          event.place === 1 ? 'ouro' : '');
      } else if (event.type === 'sticker') {
        const sticker = engine.data.album.flatMap(page => page.stickers).find(entry => entry.id === event.id);
        toast(t('app.sticker', { name: sticker?.name || event.id }));
        refresh = true;
      } else if (event.type === 'album-page') {
        const page = engine.data.album.find(entry => entry.id === event.id);
        toast(t('app.albumPage', { name: page?.name || event.id, v: Math.round(event.bonus * 100), n: event.tickets }), 'ouro');
        refresh = true;
      } else if (event.type === 'cold') {
        toast(t(event.quentao ? 'app.coldQuentao' : 'app.cold'));
      } else if (event.type === 'cold-end' && event.sold) {
        toast(t('app.coldEnd', { n: event.sold }), 'ouro');
      } else if (event.type === 'leilao') {
        toast(t('app.leilao', { prize: prizeName(event.prize), n: event.price }), 'ouro');
      } else if (event.type === 'leilao-bid' && event.who === 'plateia') {
        tocar('lance', { pitch: -5 });
      } else if (event.type === 'leilao-sold') {
        tocar(event.winner === 'voce' ? 'arremate' : 'martelo');
        if (event.winner === 'voce') toast(t('app.leilaoWon', { prize: prizeName(event.prize), price: event.price }), 'ouro');
        else if (event.winner) toast(t('app.leilaoLost', { prize: prizeName(event.prize), price: event.price }));
        refresh = true;
      } else if (event.type === 'set') {
        toast(t('app.setOn', { name: engine.data.sets.find(set => set.id === event.id)?.name || event.id, v: Math.round(event.bonus * 100) }), 'ouro');
        // Um conjunto completo de dinossauros, Halloween ou zumbis chama os eventos do mundo desse tema.
        const theme = engine.wornTheme();
        if (theme) toast(t('app.setTema', { tema: t(`grupo.${theme}`).toLowerCase() }), 'ouro');
      } else if (event.type === 'cobra') {
        // Só ensina enquanto a pessoa nunca pegou uma.
        if (!engine.state.stats.cobras) toast(t('app.cobra'));
      } else if (event.type === 'wedding') {
        toast(t('app.wedding'), 'ouro');
      } else if (event.type === 'wedding-end') {
        toast(t('app.weddingEnd', { rice: event.rice, n: UI.compact(event.amount), tickets: event.tickets }) +
          (event.item ? ` ${t('app.weddingGift', { name: engine.items[event.item]?.name || event.item })}` : ''), 'ouro');
      } else if (event.type === 'quadrilha') toast(t(event.contest ? 'app.contestStart' : 'app.quadrilha', { v: Math.round(event.bonus * 100), s: event.seconds }));
      else if (event.type === 'goal-done') toast(t('app.goalDone'));
      else if (event.type === 'crasher') toast(t('app.crasher'));
      else if (event.type === 'legendary') toast(t('app.legendary'), 'ouro');
      else if (event.type === 'size-up' && ui.open && ['festa', 'historico'].includes(ui.tab) &&
        performance.now() - ui.lastLogRender > 1000) {
        // Os números da festa e o diário acompanham os convidados, no máximo uma vez por segundo.
        ui.lastLogRender = performance.now();
        refresh = true;
      } else if (event.type === 'rings-cheaper') {
        if (event.cost <= engine.cfg.ringCost) toast(t('app.ringsReset'));
        if (!ui.rings.playing) renderRings();
      }
    }
    if (refresh) renderWindows();
    // Prêmios automáticos (Mata, casamento, leilão) mudam o inventário sem passar pelos cliques da loja.
    // Uma compra segurada já refaz a loja ao terminar; preservar seus botões até soltar evita perder o gesto.
    if (!ui.hold && events.some(event => event.type === 'item')) renderDock();
    // Número do bingo: só a janela do bingo muda (as outras não são refeitas a cada número, para não engolir cliques).
    if (!refresh && ui.tela.open && ui.tela.id === 'bingo' && events.some(event => event.type.startsWith('bingo-'))) renderTela();
  }

  // --- Foco: a placa só aparece enquanto o jogo tem foco (o último clique foi na festa) -----------------
  // Quem volta para a festa depois de um tempo fora (5 min ou mais) ganha um "Oi!" da Mandioca.
  const GREET_AFTER = 5 * 60 * 1000;
  function setFocused(value, request) {
    // Um snapshot feito antes do último clique pode chegar depois dele: não cancela o gesto recém-iniciado.
    if (typeof request === 'number' && request < ui.focusRequest) return;
    // Perdeu o foco no meio do gesto: o soltar do botão não vai chegar aqui.
    if (!value && (ui.drag || ui.hold || ui.press || ui.spacePress)) dropPointer();
    // A placa aparece ou some: o próximo aviso do cursor reavalia a área que recebe cliques.
    if (value !== ui.focused) ui.interactive = null;
    if (value && !ui.focused && ui.blurAt && now() - ui.blurAt >= GREET_AFTER) ui.festa?.greet?.();
    if (!value && ui.focused !== false) ui.blurAt = now();
    ui.focused = value;
    document.body.classList.toggle('jogo-desfocado', !value);
    // Em foco a festa anda a 60 quadros por segundo; de fundo (a pessoa trabalhando em outra janela), a 30.
    ui.festa?.setRate(rateNow());
  }

  function focusGame() {
    ui.focusRequest++;
    if (!ui.focused) setFocused(true);
    desktop?.focusGame?.(ui.focusRequest);
  }

  // --- Mouse: clique vazado, arrastos, prévia e cliques --------------------------------------------------
  function setInteractive(value) {
    if (!desktop || value === ui.interactive) return;
    ui.interactive = value;
    desktop.setInteractive(value);
  }

  function hitAt(x, y) {
    const target = document.elementFromPoint(x, y);
    if (target?.closest?.('.ui')) return { ui: true, target };
    if (target?.closest?.('#festa-canvas')) return { region: ui.festa ? ui.festa.hit(x, y) : 'festa' };
    return {};
  }

  // O cursor está em cima de algo do jogo? Só então a janela aceita o clique; fora dele, o clique vaza.
  // `actual` é o que o Electron diz que a janela está de fato: se os dois lados discordarem, vale o dele.
  function hover(x, y, actual) {
    let moved = false;
    if (typeof actual === 'boolean') {
      ui.interactive = actual;
      moved = x !== ui.cursorX || y !== ui.cursorY;
      ui.cursorX = x;
      ui.cursorY = y;
      // Foco e estado do clique também reenviam o cursor parado: isso não é falta de movimento nativo.
      if (!moved) ui.deafSince = 0;
    }
    // Durante o gesto a janela segue clicável, para o soltar do botão chegar aqui.
    if (ui.drag || ui.hold || ui.press) {
      setInteractive(true);
      if (moved) checkDeaf(actual);
      return;
    }
    const found = hitAt(x, y);
    if (moved) checkDeaf(actual && !!(found.ui || found.region));
    setInteractive(!!(found.ui || found.region));
    const canvas = $('#festa-canvas');
    if (canvas && found.region) canvas.style.cursor = ['terreiro', 'festa'].includes(found.region) ? 'grab' : 'pointer';
    // Mouse em cima da Mandioca: o quadro confere quanto tempo ele ficou ali (ela acena, em hostHoverCheck).
    if (found.region === 'host') ui.hostHover ||= now();
    else ui.hostHover = 0;
    document.body.classList.toggle('sobre-festa', !!found.region || !!found.ui);
  }

  // Fechar uma janela pode deixar o ponto transparente sem mover o mouse nem mudar o cursor do main.
  function refreshCursor(event) {
    const mouse = event?.detail !== 0 && Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY);
    const x = mouse ? event.clientX : ui.cursorX;
    const y = mouse ? event.clientY : ui.cursorY;
    if (Number.isFinite(x) && Number.isFinite(y)) hover(x, y);
  }

  // Autocura do clique: o vigia do Electron mostra o cursor passeando em cima do jogo e a janela diz que aceita o clique,
  // mas nenhum movimento de verdade chega à página: a janela quebrou (acontece depois do repouso do Windows) e todo clique
  // vaza para o que está atrás. Passados DEAF_MS assim, pede uma janela nova (no máximo uma vez a cada REPAIR_EVERY;
  // o Electron só troca com a festa em foco ou fixada por cima).
  const DEAF_MS = 3000;
  const REPAIR_EVERY = 300000;
  function checkDeaf(overGame) {
    const at = performance.now();
    if (!overGame || ui.picking || at - (ui.realMoveAt || 0) < 500) { ui.deafSince = 0; return; }
    ui.deafSince ||= at;
    if (at - ui.deafSince < DEAF_MS || at - (ui.repairAt ?? -Infinity) < REPAIR_EVERY || !desktop?.repair) return;
    ui.repairAt = at;
    ui.deafSince = 0;
    desktop.logError?.('a festa parou de receber o mouse: pedindo uma janela nova');
    dropPointer();
    if (!save()) return;
    desktop.repair();
  }

  function pointerReceived() {
    ui.realMoveAt = performance.now();
    ui.deafSince = 0;
  }

  document.addEventListener('mousemove', event => {
    pointerReceived();
    hover(event.clientX, event.clientY);
  });

  // Ícones e imagens não se arrastam como arquivo: o arrasto nativo cancelaria o arrasto da janela (pointercancel).
  document.addEventListener('dragstart', event => event.preventDefault());

  document.addEventListener('mouseover', event => {
    const card = event.target.closest?.('[data-preview]');
    if (!card || !ui.dock.open) return;
    ui.preview = previewFor(card.dataset.preview);
    const detail = $('#vitrine-detalhe') || document.querySelector?.('#vitrine-detalhe');
    if (detail) detail.innerHTML = UI.vitrineDetalhe(engine, context(), card.dataset.preview);
  });

  document.addEventListener('mouseout', event => {
    const card = event.target.closest?.('[data-preview]');
    if (!card || card.contains?.(event.relatedTarget)) return;
    ui.preview = null;
  });

  function throwRing() {
    wakeGame();
    if (ui.game?.throwRing(performance.now())) tocar('arremesso');
  }

  // Cada dispositivo tem seu ponteiro primário: o mouse também é primário enquanto um dedo arrasta.
  // Guarda um clique recusado por tipo até ele chegar ou começar um gesto novo do mesmo dispositivo.
  const ignoredPointerClicks = new Map();
  const pointerType = event => event?.pointerType || 'mouse';
  function foreignPointer(event) {
    return !!(ui.pointer && (ui.drag || ui.hold || ui.press) && event?.pointerId !== undefined &&
      (event.pointerId !== ui.pointer.id || pointerType(event) !== ui.pointer.type));
  }

  document.addEventListener('pointerdown', event => {
    pointerReceived();
    // O gesto pertence ao primeiro toque; outro dedo não troca o alvo nem inicia uma compra paralela.
    if (event.isPrimary === false) return;
    if (event.button !== undefined && event.button !== 0) return;
    if (foreignPointer(event)) {
      ignoredPointerClicks.set(pointerType(event), event.pointerId);
      event.preventDefault();
      return;
    }
    ignoredPointerClicks.delete(pointerType(event));
    ui.pointer = event.pointerId === undefined ? null : { id: event.pointerId, type: pointerType(event) };
    ui.cancelledClick = false;
    raiseWindow(event.target.closest?.('.casa, .painel, .minijogo, #vitrine'));
    if (ui.press) { ui.press = null; flushDeferredRenders(); }
    // A janela só recebe clique em cima da festa ou das janelas do jogo: qualquer clique aqui dá foco ao jogo.
    focusGame();
    setInteractive(true);
    som?.unlock();
    const hold = event.target.closest?.('[data-hold]');
    if (hold && !hold.disabled) { startHold(hold); event.preventDefault(); return; }
    // Botão de tamanho: arrastar muda o tamanho; soltar sem arrastar volta a 100% (no pointerup).
    if (event.target.closest?.('[data-action="zoom-alca"]')) {
      ui.drag = { kind: 'zoom', x: event.clientX, y: event.clientY, start: ui.settings.zoom, moved: false };
      event.preventDefault();
      return;
    }
    // Barra de volume: a janela segue clicável até soltar, mesmo com o mouse fora do painel.
    if (event.target.matches?.('input[type="range"]')) { ui.drag = { kind: 'barra', x: event.clientX, y: event.clientY, start: ui.settings.volume }; return; }
    const control = event.target.closest?.('[data-action]');
    if (control && !control.disabled) ui.press = { button: control };
    if (event.target.closest?.('#argolas-canvas')) { throwRing(); return; }
    const found = hitAt(event.clientX, event.clientY);
    if (found.region) {
      // O arrasto parte de onde a festa está na tela, não do valor salvo (que pode estar além da borda).
      ui.drag = { kind: 'festa', region: found.region, x: event.clientX, y: event.clientY,
        start: { left: ui.anchor.left, lift: ui.anchor.lift }, moved: false };
      event.preventDefault();
      return;
    }
    // A placa arrasta pelo fundo (fora dos botões) e muda só ela de lugar.
    const placa = event.target.closest?.('#placa');
    if (placa && !event.target.closest('button, input, select, a')) {
      ui.drag = { kind: 'placa', x: event.clientX, y: event.clientY,
        start: { left: parseFloat(placa.style.left) || 0, bottom: parseFloat(placa.style.bottom) || 0 }, moved: false };
      event.preventDefault();
      return;
    }
    // A vitrine desliza para os lados por qualquer parte que não seja botão ou item: a faixa vermelha, o fundo, o texto.
    if (event.target.closest?.('#vitrine')) {
      if (!event.target.closest('button, input, select, a, [data-action], [data-preview], [data-hold]')) {
        ui.drag = { kind: 'vitrine', x: event.clientX, y: event.clientY, start: ui.dock.dx, moved: false };
      }
      return;
    }
    // As janelas extras arrastam pelo fundo; só o clique sem arrastar é da janela (um bicho que reage, um canteiro que planta...).
    const scene = event.target.closest?.('.casa-cena');
    const nativeScroll = event.pointerType === 'touch' && !!scene &&
      (scene.scrollWidth > scene.clientWidth || scene.scrollHeight > scene.clientHeight);
    const miniDrag = ui.janelas?.dragStart(event.target, event);
    if (miniDrag) {
      miniDrag.nativeScroll = nativeScroll;
      ui.drag = miniDrag;
      event.preventDefault();
      return;
    }
    // A casa arrasta pelo fundo (ou por um morador: só o clique sem arrastar faz ele reagir) e muda só ela de lugar.
    const house = event.target.closest?.('#casa');
    // A barra de rolagem da cena (casa enorme) é do navegador: o fundo em volta da casa é que arrasta.
    if (house && event.target.id === 'casa-cena') return;
    if (house && !event.target.closest('button, .ajuda-painel')) {
      const hit = ui.casa?.hit(event.clientX, event.clientY);
      ui.drag = { kind: 'casa', nativeScroll, x: event.clientX, y: event.clientY, index: hit ? hit.index : null,
        start: { left: parseFloat(house.style.left) || 0, bottom: parseFloat(house.style.bottom) || 0 }, moved: false };
      event.preventDefault();
      return;
    }
    const handle = event.target.closest?.('[data-arrastar]');
    if (handle && !event.target.closest('button')) {
      const key = { argolas: 'ringsPos', tela: 'telaPos' }[handle.dataset.arrastar] || 'panelPos';
      const element = handle.parentElement;
      ui.drag = { kind: 'janela', key, element, x: event.clientX, y: event.clientY,
        start: { x: parseFloat(element.style.left) || 0, y: parseFloat(element.style.top) || 0 }, moved: false };
    }
  });

  function persistDrag(drag) {
    if (drag?.nativeScroll) return;
    // O volume já mudou pelo input; um gesto interrompido pode não receber o change nativo.
    if (drag?.kind === 'barra') {
      if (ui.settings.volume !== drag.start) changeSettings({ volume: ui.settings.volume });
      return;
    }
    if (!drag?.moved) return;
    const fields = { festa: ['x', 'lift'], zoom: ['zoom', 'x', 'placa'], placa: ['placa'], casa: ['casa'] }[drag.kind];
    if (fields) changeSettings(Object.fromEntries(fields.map(key => [key, ui.settings[key]])));
    else if (drag.kind === 'mini') ui.janelas?.dragEnd(drag, performance.now());
  }

  // Arrasto ou compra segurada que perdeu o soltar do botão (Alt+Tab, repouso, janela do Windows por cima): guarda o
  // lugar que já ficou na tela e libera o mouse, sem executar o clique de um gesto interrompido.
  function dropPointer() {
    const drag = ui.drag;
    ui.drag = null;
    ui.pointer = null;
    if (ui.press) ui.cancelledClick = true;
    ui.press = null;
    // Espaço ativa o botão nativo ao soltar a tecla, mesmo se houve repouso antes do keyup.
    if (ui.spacePress) ui.cancelledSpace = true;
    ui.spacePress = null;
    stopHold();
    hideZoomGuide();
    persistDrag(drag);
    flushDeferredRenders();
  }

  document.addEventListener('pointermove', event => {
    pointerReceived();
    if (event.isPrimary === false || foreignPointer(event)) return;
    // O esquerdo foi solto, mesmo que outro botão continue apertado ou o pointerup não tenha chegado.
    if ((ui.drag || ui.hold || ui.press) && event.buttons !== undefined && !(event.buttons & 1)) { dropPointer(); return; }
    const drag = ui.drag;
    if (!drag || drag.kind === 'barra') return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    // Nas cenas que precisam rolar, o dedo pertence ao navegador desde o primeiro movimento.
    if (!drag.moved || drag.nativeScroll) return;
    if (drag.kind === 'zoom') {
      // Se bateu no limite, o arrasto recomeça dali: voltar o mouse já diminui, sem trecho morto.
      const factor = 2 ** ((dx - dy) / 160);
      drag.start = setZoom(drag.start * factor, false) / factor;
      showZoomGuide();
    } else if (drag.kind === 'festa') {
      // Qualquer parte da festa arrasta, até as que abrem algo: só o clique sem arrastar abre (no pointerup).
      const size = festaSize();
      const left = clamp(drag.start.left + dx, 0, maxLeft(size));
      ui.settings.x = (left + size.width / 2) / innerWidth;
      ui.settings.lift = clamp(drag.start.lift - dy, 0, maxLift(size));
      // Descarta o trecho que passou da borda: voltar o ponteiro já traz a festa de volta.
      drag.start.left = left - dx;
      drag.start.lift = ui.settings.lift + dy;
      placeFesta();
    } else if (drag.kind === 'vitrine') {
      ui.dock.dx = drag.start + dx;
      placeDock();
      drag.start = ui.dock.dx - dx;
    } else if (drag.kind === 'mini') {
      ui.janelas?.dragMove(drag, dx, dy);
    } else if (drag.kind === 'casa') {
      const element = $('#casa');
      const w = element.offsetWidth || 300;
      const h = element.offsetHeight || 300;
      const left = clamp(drag.start.left + dx, 6, Math.max(6, innerWidth - w - 6));
      const bottom = clamp(drag.start.bottom - dy, 6, Math.max(6, innerHeight - h - 6));
      drag.start.left = left - dx;
      drag.start.bottom = bottom + dy;
      ui.settings.casa = { dx: Math.round(left - ui.anchor.left), dy: Math.round(bottom - ui.anchor.lift) };
      placeCasa();
    } else if (drag.kind === 'placa') {
      const placa = $('#placa');
      const zoom = uiZoom();
      const w = (placa.offsetWidth || 240) * zoom;
      const h = (placa.offsetHeight || 120) * zoom;
      const left = clamp(drag.start.left + dx, 6, Math.max(6, innerWidth - w - 6));
      const bottom = clamp(drag.start.bottom - dy, 6, Math.max(6, innerHeight - h - 6));
      drag.start.left = left - dx;
      drag.start.bottom = bottom + dy;
      ui.settings.placa = { dx: Math.round(left - ui.anchor.left), dy: Math.round(bottom - ui.anchor.lift) };
      placeFesta();
    } else {
      const element = drag.element;
      const base = windowBase();
      const x = clamp(drag.start.x + dx, 8, Math.max(8, innerWidth - (element.offsetWidth || 780) - 8));
      const y = clamp(drag.start.y + dy, 8, Math.max(8, innerHeight - (element.offsetHeight || 560) - 8));
      drag.start.x = x - dx;
      drag.start.y = y - dy;
      ui[drag.key] = { dx: x - base.x, dy: y - base.y, auto: false };
      placeWindow(element, drag.key);
    }
  });

  document.addEventListener('pointerup', event => {
    pointerReceived();
    if (event.isPrimary === false || foreignPointer(event)) return;
    if (event.button !== undefined && event.button !== 0) {
      // Soltar outro botão só encerra um gesto do mouse; uma tecla pressionada continua independente dele.
      if (event.buttons === 0 && (ui.drag || ui.hold || ui.press)) dropPointer();
      return;
    }
    ui.pointer = null;
    const press = ui.press;
    if (press) {
      if (event.target?.closest?.('[data-action]') !== press.button) { ui.press = null; flushDeferredRenders(); }
      else setTimeout(() => {
        if (ui.press === press) { ui.press = null; flushDeferredRenders(); }
      }, 0);
    }
    stopHold();
    const drag = ui.drag;
    ui.drag = null;
    if (!drag) return;
    if (drag.kind === 'zoom') hideZoomGuide();
    if (drag.moved) { persistDrag(drag); return; }
    if (drag.kind === 'zoom') {
      setZoom(1, true); tocar('clique');
    } else if (drag.kind === 'mini') {
      comSom(() => ui.janelas?.dragEnd(drag, performance.now()), null);
    } else if (drag.kind === 'casa') {
      // A cena pode ter sido rolada ou redimensionada enquanto o botão estava apertado.
      if (drag.index !== null && casaVisible() && ui.casa?.hit(drag.x, drag.y)?.index === drag.index) {
        comSom(() => ui.casa.poke(drag.index, performance.now()), null);
      }
    }
    else if (drag.kind === 'festa') {
      // Crescimento, redimensionamento ou outra janela podem trocar o alvo sem o mouse se mover.
      if (hitAt(drag.x, drag.y).region === drag.region) {
        comSom(() => festaClick(drag.region, { x: drag.x, y: drag.y }), null);
      }
    }
  });
  // O navegador cancelou o ponteiro (começou um arrasto nativo, por exemplo): nada fica preso "arrastando".
  document.addEventListener('pointercancel', event => {
    if (event?.isPrimary !== false && !foreignPointer(event)) dropPointer();
  });

  document.addEventListener('wheel', event => {
    // A roda do mouse sobre a grade da vitrine rola de lado (as fileiras da grade são na horizontal).
    const grid = event.target?.closest?.('.vgrade, .vfiltros');
    if (grid && ui.dock.open) {
      if (Math.abs(event.deltaY) >= Math.abs(event.deltaX) && grid.scrollWidth > grid.clientWidth) {
        grid.scrollLeft += event.deltaY;
        event.preventDefault();
      }
      return;
    }
    if (!event.target.closest?.('[data-action="zoom-alca"]')) return;
    event.preventDefault();
    if (!event.deltaY) return;
    setZoom(ui.settings.zoom * 1.12 ** (-Math.sign(event.deltaY)), true);
    showZoomGuide(ui.drag?.kind === 'zoom' ? 0 : 700);
  }, { passive: false });

  document.addEventListener('click', event => {
    const ignored = event.pointerId !== undefined && ignoredPointerClicks.get(pointerType(event)) === event.pointerId;
    if (event.detail > 0 && (ignored || foreignPointer(event))) {
      if (ignored) ignoredPointerClicks.delete(pointerType(event));
      event.preventDefault?.();
      return;
    }
    ui.press = null;
    if (event.detail === 0) ui.spacePress = null;
    try {
      // O Chromium ainda pode emitir click ao soltar um botão cujo gesto foi cancelado por blur, Escape ou repouso.
      if (event.detail > 0 && ui.cancelledClick) { ui.cancelledClick = false; event.preventDefault?.(); return; }
      const button = event.target.closest?.('[data-action]');
      // Botão de segurar já comprou no pointerdown; pelo teclado (Enter ou espaço, detail 0) ele age como um clique.
      if (!button || button.tagName === 'SELECT' || button.disabled || (button.dataset.hold && event.detail !== 0)) return;
      if (button.dataset.action === 'zoom-alca') {
        // O mouse já foi tratado no pointerup; pelo teclado (Enter ou espaço), o botão volta a 100%.
        if (event.detail === 0) comSom(() => setZoom(1, true));
        return;
      }
      comSom(() => act(button));
    } finally {
      flushDeferredRenders();
      refreshCursor(event);
    }
  });

  document.addEventListener('change', event => {
    if (event.target.id === 'nome') { engine.rename(event.target.value); saveLater(); renderHud(true); renderWindows(); }
    if (event.target.id === 'volume') {
      changeSettings({ volume: Number(event.target.value) / 100 });
      tocar('moeda');
    }
  });

  // O nome já pertence ao save enquanto é digitado; fechar ou dormir pode acontecer antes de change.
  // O volume muda enquanto a barra anda; só vai para as preferências ao soltar (change).
  document.addEventListener('input', event => {
    if (event.target.id === 'nome') { engine.rename(event.target.value); saveLater(); return; }
    if (event.target.id !== 'volume') return;
    const volume = Number(event.target.value) / 100;
    ui.settings.volume = volume;
    som?.set({ volume });
    const label = $('#volume-valor');
    if (label) label.textContent = `${Math.round(volume * 100)}%`;
  });

  // Saiu do campo que segurava o redesenho: agora a janela pode mostrar o que mudou.
  document.addEventListener('focusout', () => {
    if (!ui.redesenhar) return;
    ui.redesenhar = false;
    setTimeout(() => { renderWindows(); renderHud(true); }, 0);
  });

  // Segredo: digitar "yeye" com o jogo em foco chama o Rafael para a festa; com ele já liberado, digitar de novo o esconde (e outra vez
  // o traz de volta).
  const YEYE = 'yeye';
  document.addEventListener('keydown', event => {
    if (event.key === ' ') {
      if (event.repeat && ui.cancelledSpace) { event.preventDefault(); return; }
      if (!event.repeat) {
        ui.cancelledSpace = false;
        const button = event.target?.closest?.('button[data-action]');
        ui.spacePress = button && !button.disabled ? { button } : null;
      }
    }
    // Os atalhos do jogo não podem consumir a digitação, a leitura dos avisos ou os controles nativos.
    const editing = event.target?.isContentEditable || event.target?.closest?.('input, select, textarea, [contenteditable=""], [contenteditable="true"], [role="dialog"], .ajuda-painel');
    if (editing && event.key !== 'Escape') return;
    if (ui.focused && !event.ctrlKey && !event.altKey && !event.metaKey && !event.repeat && typeof event.key === 'string' && /^[a-z]$/i.test(event.key)) {
      ui.yeye = (ui.yeye + event.key.toLowerCase()).slice(-YEYE.length);
      if (ui.yeye === YEYE) {
        ui.yeye = '';
        const rafael = engine.toggleRafael();
        toast(t(rafael.first ? 'app.rafael' : rafael.hidden ? 'app.rafaelHide' : 'app.rafaelBack'));
        saveLater();
      }
    } else if (event.key !== 'Shift') ui.yeye = '';
    // Itens da vitrine são cartões (div com role="button"): Enter e espaço funcionam como clique.
    const card = event.target?.closest?.('[role="button"][data-action]');
    if (card && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      comSom(() => act(card));
      return;
    }
    // As janelas da festa com teclas (o Palco do Forró marca as pistas com 1, 2 e 3).
    if (ui.focused && !event.ctrlKey && !event.altKey && !event.metaKey && !event.repeat && ui.janelas?.key(event.key, performance.now())) {
      event.preventDefault();
      return;
    }
    if (event.key === ' ' && ui.rings.open && ui.rings.playing && !event.target?.closest?.('button, a')) {
      event.preventDefault();
      throwRing();
      return;
    }
    if (ui.open && ui.tab === 'historico' && !event.ctrlKey && !event.altKey && !event.metaKey && typeof event.key === 'string' &&
      /^[a-z]$/i.test(event.key)) {
      ui.segredo = (ui.segredo + event.key.toLowerCase()).slice(-SEGREDO.length);
      if (ui.segredo === SEGREDO) { ui.segredo = ''; toggleDebug(); return; }
    } else if (event.key !== 'Shift') ui.segredo = '';
    if (event.key !== 'Escape') return;
    // Escape também interrompe o arrasto: fechar a janela não pode deixar seu gesto ativo por trás dela.
    if (ui.drag || ui.hold || ui.press || ui.spacePress) dropPointer();
    comSom(closeFrontWindow, null);
    refreshCursor();
  });

  document.addEventListener('keyup', event => {
    if (event.key !== ' ') return;
    if (ui.cancelledSpace) {
      event.preventDefault();
      // Cancelar o keyup também deixa o :active nativo preso. Limpa-o sem perder a navegação pelo teclado.
      const button = event.target?.closest?.('button[data-action]');
      if (button === document.activeElement && button?.blur && button?.focus) {
        restoringFocus = true;
        try { button.blur(); button.focus({ preventScroll: true }); }
        finally { restoringFocus = false; }
      }
    }
    ui.cancelledSpace = false;
    const press = ui.spacePress;
    if (press) setTimeout(() => {
      if (ui.spacePress === press) { ui.spacePress = null; flushDeferredRenders(); }
    }, 0);
  });

  document.addEventListener('focusin', event => {
    if (!restoringFocus) raiseWindow(event.target.closest?.('.casa, .painel, .minijogo, #vitrine'));
  });

  $('#importar').addEventListener('cancel', () => { importRequest++; ui.picking = false; });
  $('#importar').addEventListener('change', async event => {
    ui.picking = false;
    const request = ++importRequest;
    const generation = gameGeneration;
    const target = event.target;
    const file = target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      // Outra seleção, cancelamento ou festa nova abandona esta leitura sem abrir um aviso atrasado.
      if (request !== importRequest || generation !== gameGeneration) return;
      const state = JSON.parse(text);
      if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('Save inválido.');
      new GameEngine(data, state); // valida antes de pedir para substituir a festa atual
      if (!confirm(t('app.importConfirm'))) return;
      // A leitura é assíncrona: conclui o campo que o jogador abriu nesse intervalo ainda na festa antiga.
      document.activeElement?.blur?.();
      // A espera na confirmação também conta como tempo fora do save escolhido, com um único teto de horas.
      const imported = new GameEngine(data, state);
      if (!saveReplacement(imported, 'app.importNotSaved')) return;
      engine = imported;
      ui.janelas?.setEngine(engine);
      forgetRound();
      renderHud(true);
      renderWindows();
      renderDock();
      toast(t('app.imported'));
    } catch (_) {
      if (request === importRequest && generation === gameGeneration) toast(t('app.importFailed'), 'erro');
    }
    finally { if (request === importRequest) target.value = ''; }
  });

  addEventListener('resize', () => {
    scaleFesta();
    placeFesta();
  });
  addEventListener('beforeunload', () => { dropPointer(); save(); });

  if (desktop) {
    desktop.onCommand(command => {
      if (command === 'painel') openPanel();
      else if (command === 'vitrine') openDock();
      else if (command === 'argolas') openRings();
      else if (command === 'foto') act({ dataset: { action: 'foto' } });
      else if (command === 'retrato') act({ dataset: { action: 'retrato' } });
      // O computador vai dormir: encerra o gesto antes de salvar, sem esperar o soltar do mouse na volta.
      else if (command === 'salvar') { dropPointer(); save(); }
      else if (command?.settings) receiveSettingsSnapshot(command.settings);
      else if (typeof command?.foco === 'boolean') setFocused(command.foco, command.focusRequest);
      // O Electron conta onde o cursor está de tempos em tempos: se o repasse do mouse do Windows falhar, a festa
      // continua sabendo quando o cursor passa por cima dela.
      else if (command?.cursor) {
        const cursor = command.cursor;
        if (typeof cursor.focusRequest === 'number' && cursor.focusRequest < ui.focusRequest) return;
        if (typeof cursor.focused === 'boolean' && cursor.focused !== ui.focused) setFocused(cursor.focused, cursor.focusRequest);
        hover(cursor.x, cursor.y, cursor.interactive);
      }
    });
  }

  // --- Laço --------------------------------------------------------------------------------------------
  let lastFrame = performance.now();
  // O primeiro evento depois do repouso pode chegar antes do próximo quadro. Paga a pausa antes de mudar bônus ou gastar.
  function wakeGame(t = performance.now()) {
    const woke = engine.wake();
    if (!woke) return null;
    lastFrame = Math.max(lastFrame, t);
    // O temporizador de uma compra pode voltar antes do quadro: a repetição termina junto com a pausa.
    if (ui.hold) stopHold();
    if (woke.cheer >= 1) {
      toast(I18N.t('app.wake', { time: UI.duration(woke.seconds * 1000), n: UI.compact(woke.cheer) }), 'ouro');
      saveLater();
    }
    return woke;
  }
  // A música do show do Palco do Forró (src/som.js): começa com o show, no ponto em que ele estiver, e para quando ele acaba, escondendo a festa,
  // desligando o som... Se o show termina bem (1 a 3 estrelas), fecha com um acorde da música.
  function syncShowMusic(events) {
    const show = ui.settings.hidden ? null : engine.state.minis?.palco?.show;
    if (show) {
      if (ui.showMusic === show.startAt) return;
      const config = engine.data.minis.palco;
      const song = config.songs.find(entry => entry.id === show.song);
      if (song && som?.startShow?.(song.id, { bpm: song.bpm, lead: config.lead, elapsed: engine.now() - show.startAt })) ui.showMusic = show.startAt;
    } else if (ui.showMusic !== null) {
      ui.showMusic = null;
      const end = events.find(event => event.type === 'mini' && event.mini === 'palco' && event.kind === 'show-end');
      som?.stopShow?.({ stars: end && !end.aborted ? end.stars : 0 });
    }
  }
  function frame(t) {
    const delta = Math.max(0, (t - lastFrame) / 1000);
    lastFrame = Math.max(lastFrame, t);
    // Voltando do repouso (ou de muito tempo com a festa escondida): o tempo parado rende como jogo fechado.
    const woke = wakeGame(t);
    let remaining = woke ? 0 : Math.min(delta, desktop ? 30 : 1);
    while (remaining > 0) { const step = Math.min(remaining, 0.25); engine.tick(step); remaining -= step; }
    const events = engine.drainEvents();
    if (events.length) {
      ui.festa?.onEvents(engine, events, t);
      ui.casa?.onEvents(engine, events, t);
      ui.janelas?.onEvents(events, t);
      notify(events);
      // Conquista salva logo: o save leva a lista para a Steam.
      if (events.some(event => ['size-up', 'tier-up', 'fished', 'outing-done', 'achievement', 'item'].includes(event.type))) saveLater();
    }
    syncShowMusic(events);
    if (ui.saveSoon && t >= ui.saveSoon) { ui.saveSoon = 0; save(); }
    if (t - ui.lastSave > 30000) save();
    hostHoverCheck();
    // Muito tempo sem olhar para o jogo (10 min em outra janela): a Mandioca fica sonolenta e cochila mais nos descansos.
    ui.festa?.setSleepy?.(ui.focused === false && ui.blurAt > 0 && now() - ui.blurAt > 600000);
    renderHud();
    refreshLive();
  }

  // Deixar o mouse parado em cima da Mandioca por um instante: ela acena e diz oi (no máximo a cada 30 s).
  function hostHoverCheck() {
    if (!ui.hostHover || now() - ui.hostHover < 1200 || now() - (ui.hostWaveAt || 0) < 30000) return;
    ui.hostWaveAt = now();
    ui.festa?.greet?.();
  }

  // O próximo quadro é pedido antes de tudo: um erro num quadro não pode congelar a festa para sempre.
  function animate(t) {
    requestAnimationFrame(animate);
    safely(() => frame(t));
    if (ui.festa) {
      safely(() => {
        const before = ui.festa.size().width;
        ui.festa.draw(engine, t, ui.dock.open ? ui.preview : null);
        if (ui.festa.size().width !== before) placeFesta();
      });
    }
    if (ui.rings.open) safely(() => ui.game?.draw(t));
    if (ui.bingoView && ui.tela.open && ui.tela.id === 'bingo') safely(() => ui.bingoView.draw(t, engine.state.bingo.round));
    if (ui.pesca) {
      if (ui.tela.open && ui.tela.id === 'pescaria') safely(() => ui.pesca.draw(t, { ready: engine.state.fishing.unlocked ? engine.state.fishing.ready : 0 }));
      else if (ui.pesca.busy) safely(() => ui.pesca.flush());
    }
    // As janelas extras: desenhadas só quando aparecem (não escondidas nem com o jogo sem foco).
    if (ui.janelas && !document.body.classList.contains('jogo-desfocado')) safely(() => ui.janelas.draw(t));
    // A casa: desenhada só quando aparece (não escondida nem com o jogo sem foco), e a 30 quadros por segundo.
    if (ui.casa && t - (ui.casaAt || 0) >= 33 && casaVisible() && !document.body.classList.contains('jogo-desfocado')) {
      ui.casaAt = t;
      safely(() => {
        const before = ui.casa.size();
        ui.casa.draw(engine, t);
        const after = ui.casa.size();
        if (after.width !== before.width || after.height !== before.height) placeCasa();
      });
    }
  }

  // Varal de bandeirinhas do topo das janelas, desenhado em pixel e usado como fundo repetido.
  function paintBunting() {
    const strip = document.createElement('canvas');
    if (typeof strip.getContext !== 'function') return;
    const colors = ['#ee2f3c', '#ffd21e', '#35a03a', '#3a6cf0', '#ff4f9e', '#ff8a12'];
    strip.width = 48;
    strip.height = 7;
    const p = strip.getContext('2d');
    p.fillStyle = '#361a0c';
    p.fillRect(0, 0, 48, 1);
    colors.forEach((color, i) => {
      p.fillStyle = color;
      p.fillRect(i * 8 + 2, 1, 5, 4);
      p.fillRect(i * 8 + 2, 5, 2, 1);
      p.fillRect(i * 8 + 5, 5, 2, 1);
    });
    document.documentElement.style.setProperty('--bandeirinhas', `url(${strip.toDataURL()})`);
  }
  paintBunting();

  const canvas = $('#festa-canvas');
  if (globalThis.ArraiaFesta && sprites && typeof canvas?.getContext === 'function') {
    ui.festa = globalThis.ArraiaFesta.create(canvas, sprites, { sound: name => tocar(name) });
    scaleFesta();
  }
  const houseCanvas = $('#casa-canvas');
  if (globalThis.ArraiaCasa && sprites?.casa && typeof houseCanvas?.getContext === 'function') {
    ui.casa = globalThis.ArraiaCasa.create(houseCanvas, sprites, { sound: name => tocar(name) });
    // Passar o mouse num morador mostra o nome e o que ele está fazendo.
    houseCanvas.addEventListener('mousemove', event => {
      const found = ui.casa.hit(event.clientX, event.clientY);
      houseCanvas.title = found ? t('casa.tip', { name: found.who.name, activity: found.who.activityName }) : '';
    });
  }
  if (globalThis.ArraiaJanelas && sprites) {
    ui.janelas = globalThis.ArraiaJanelas.create({
      document, engine, sprites,
      anchor: () => ui.anchor,
      settings: () => ui.settings,
      changeSettings: partial => changeSettings(partial),
      placaRect: () => { const placa = $('#placa'); return placa && !placa.hidden && placa.getBoundingClientRect ? placa.getBoundingClientRect() : null; },
      size: () => ({ width: innerWidth, height: innerHeight }),
      t: (key, vars) => t(key, vars),
      sound: (name, options) => tocar(name, options),
      raise: raiseWindow,
      focused: () => ui.focused !== false && !document.hidden,
      toast: (text, kind) => toast(text, kind)
    });
    ui.janelas.restore();
  }
  const ringsCanvas = $('#argolas-canvas');
  if (globalThis.ArraiaArgolas && sprites && typeof ringsCanvas?.getContext === 'function') {
    ui.game = globalThis.ArraiaArgolas.create(ringsCanvas, sprites, {
      onThrow: index => engine.ringHit(index),
      onEnd: endRound,
      // Acertou: um prêmio melhor (multiplicador, Animação ou presente) toca mais agudo.
      onLand: ({ hit, prize }) => tocar(hit ? 'acerto' : 'errou',
        { pitch: hit && (prize?.mult || prize?.factor || prize?.kind === 'item') ? 5 : 0 })
    });
  }
  if (globalThis.ArraiaPescaria && sprites?.pescaria && typeof document.createElement === 'function') {
    const canvas = document.createElement('canvas');
    canvas.className = 'pescaria-canvas';
    if (typeof canvas.getContext === 'function') {
      ui.pescaCanvas = canvas;
      ui.pesca = globalThis.ArraiaPescaria.create(canvas, sprites, { sound: (name, options) => tocar(name, options) });
    }
  }
  if (globalThis.ArraiaBingo && sprites?.bingo && typeof document.createElement === 'function') {
    const canvas = document.createElement('canvas');
    canvas.className = 'bingo-canvas';
    if (typeof canvas.getContext === 'function') {
      ui.bingoCanvas = canvas;
      ui.bingoView = globalThis.ArraiaBingo.create(canvas, sprites, { sound: (name, options) => tocar(name, options) });
    }
  }
  applySettings(ui.settings);
  if (desktop) {
    desktop.getSettings().then(receiveSettingsSnapshot).catch(error => toast(error.message, 'erro'));
    setInterval(() => safely(() => frame(performance.now())), 250);
  }
  if (loadError) toast(t('app.saveIgnored'), 'erro');
  // Depois de trocar o idioma, a festa volta com os Ajustes abertos.
  let reopen = desktop?.reopen || null;
  try { reopen = reopen || sessionStorage.getItem(REOPEN_KEY); sessionStorage.removeItem(REOPEN_KEY); } catch (_) { /* sem armazenamento */ }
  if (reopen) {
    openPanel(reopen);
    toast(t('app.languageChanged'));
  } else if (engine.welcome) {
    showModal(`<h2>${UI.esc(t('app.welcomeBack'))}</h2><p>${t('app.welcomeBackText', {
      time: UI.duration(engine.welcome.seconds * 1000), n: UI.compact(engine.welcome.cheer) })}` +
      (engine.welcome.bunny ? ` ${UI.esc(t('app.welcomeBunny', { v: Math.round(engine.welcome.bunny * 100) }))}` : '') + '</p>' +
      `<p class="miudo">${UI.esc(t(engine.welcome.capped ? 'app.welcomeCapped' : 'app.welcomeRule',
        { v: Math.round(engine.offlineRate() * 100), h: engine.cfg.offlineCapHours }))}</p>` +
      `<div class="botoes"><button class="btn" data-action="fechar-janela">${UI.esc(t('app.welcomeBackOk'))}</button></div>`);
  } else if (firstRun) {
    ui.festa?.sprout?.();
    showModal(`<h2>${UI.esc(t('app.title'))}!</h2>${t('app.firstRun')}` +
      `<div class="botoes"><button class="btn" data-action="fechar-janela">${UI.esc(t('app.firstRunOk'))}</button></div>`);
  }
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(animate);
  // Gravador de vídeos (trailer/captura): só existe quando a página foi aberta por ele.
  if (typeof globalThis.__gravador === 'function') globalThis.__gravador({ engine: () => engine, ui, festaClick });
})();
