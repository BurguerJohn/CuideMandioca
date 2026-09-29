(function () {
  'use strict';
  const { GameEngine } = globalThis.ArraiaCore;
  const UI = globalThis.ArraiaUI;
  const data = globalThis.GAME_DATA;
  const sprites = globalThis.FESTA_SPRITES || null;
  const desktop = globalThis.arraiaDesktop || null;
  const I18N = globalThis.ArraiaI18n;
  const t = (key, vars) => I18N.t(key, vars);
  const SAVE_KEY = 'arraia-save-v1';
  const SETTINGS_KEY = 'arraia-ajustes-v1';
  const LANGUAGE_KEY = 'arraia-idioma';
  const REOPEN_KEY = 'arraia-reabrir';
  const DEFAULTS = { pinned: true, zoom: 1, x: 0.72, lift: 0, hud: 'sempre', hidden: false, placa: null, sound: true, volume: 0.5 };
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
  let loadError = null;
  try { engine = new GameEngine(data, raw); } catch (error) { engine = new GameEngine(data); loadError = error.message; }
  const firstRun = !raw || !!loadError;

  const ui = {
    tab: 'festa', lastLetter: null, open: false, modal: false, focused: true, logFilter: 'desbloqueios', lastLogRender: 0,
    dock: { open: false, cat: 'melhorias', side: 'esquerda', dx: 0 }, preview: null,
    rings: { open: false, playing: false, result: null },
    tela: { open: false, id: 'correio' }, telaPos: null,
    settings: { ...DEFAULTS, ...(desktop ? {} : readJSON(SETTINGS_KEY) || {}) },
    interactive: null, festa: null, game: null, drag: null, hold: null, panelPos: null, ringsPos: null,
    hudKey: '', lastLive: 0, lastSave: 0, saveSoon: 0, closeArmedUntil: 0, tocou: false, redesenhar: false,
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
  const som = globalThis.ArraiaSom?.create({ enabled: ui.settings.sound !== false, volume: ui.settings.volume }) || null;
  // Com a festa escondida nada toca. `tocou` avisa quem chamou que a ação já tocou o seu próprio som.
  function tocar(name, options) {
    ui.tocou = true;
    if (!ui.settings.hidden) som?.play(name, options);
  }
  const janelas = () => [ui.open, ui.modal, ui.dock.open, ui.rings.open, ui.tela.open].filter(Boolean).length;
  // Uma ação do jogador com som: a própria ação toca o seu; senão, abrir ou fechar janela; senão, o som padrão.
  function comSom(action, fallback = 'clique') {
    const before = janelas();
    ui.tocou = false;
    action();
    if (ui.tocou) return;
    const after = janelas();
    if (after !== before) tocar(after > before ? 'abrir' : 'fechar');
    else if (fallback) tocar(fallback);
  }

  // --- Save ------------------------------------------------------------------------------------------
  function save() {
    try {
      const state = engine.exportState();
      if (desktop) {
        if (!desktop.saveGame(state)) toast(t('app.saveFailedHere'), 'erro');
      } else localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      ui.lastSave = performance.now();
    } catch (_) { toast(t('app.saveFailed'), 'erro'); }
  }
  const saveLater = () => { ui.saveSoon = performance.now() + 800; };

  // --- Tamanho e posição de tudo o que flutua junto com a festa ----------------------------------------
  const uiZoom = () => clamp(ui.settings.zoom, 0.8, 1.3);

  function festaSize() {
    return ui.festa ? ui.festa.size() : { width: 480, height: 612, top: 150, physical: 3, base: 3 };
  }

  function zoomLabel() {
    const size = festaSize();
    return `${Math.round(size.physical / size.base * 100)}%`;
  }

  // A festa nunca passa das bordas: o terreiro inteiro fica na tela, do chão ao topo dos mastros.
  const maxLeft = size => Math.max(0, innerWidth - size.width);
  const maxLift = size => Math.max(0, innerHeight - size.top - 8);

  // O canvas nunca fica maior que a tela; o zoom pedido além disso é limitado pela própria festa.
  function scaleFesta() {
    if (ui.festa) ui.festa.setScale(3 * ui.settings.zoom, { width: innerWidth - 16, height: innerHeight - 24 });
  }

  function placeFesta() {
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
    const width = Math.min(innerWidth / zoom - 16, Math.max(760, a.width / zoom));
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
    element.style.left = `${Math.round(clamp(base.x + ui[key].dx, 8, Math.max(8, innerWidth - w - 8)))}px`;
    element.style.top = `${Math.round(clamp(base.y + ui[key].dy, 8, Math.max(8, innerHeight - h - 8)))}px`;
  }

  // --- Ajustes -----------------------------------------------------------------------------------------
  function applySettings(settings) {
    ui.settings = { ...ui.settings, ...settings };
    som?.set({ enabled: ui.settings.sound !== false, volume: ui.settings.volume });
    scaleFesta();
    renderHud(true);
    placeFesta();
    if (ui.open) renderWindows();
  }

  function changeSettings(partial) {
    if (desktop) {
      desktop.updateSettings(partial).then(applySettings).catch(error => toast(error.message, 'erro'));
    } else {
      applySettings(partial);
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(ui.settings)); } catch (_) { /* sem armazenamento */ }
    }
  }

  // Muda o tamanho sem tirar a placa do lugar: o lado da festa colado nela fica parado e o resto cresce.
  // Devolve o zoom que valeu de fato (a festa limita o tamanho para caber na tela).
  function setZoom(zoom, persist) {
    zoom = clamp(zoom, ZOOM_MIN, ZOOM_MAX);
    const before = ui.anchor;
    ui.settings.zoom = zoom;
    scaleFesta();
    const size = festaSize();
    if (size.capped) {
      zoom = size.physical / (3 * (globalThis.devicePixelRatio || 1));
      ui.settings.zoom = zoom;
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
    const item = document.createElement('div');
    item.className = `aviso-item ${kind}`;
    item.textContent = message;
    box.appendChild(item);
    if (kind === 'erro') tocar('erro');
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => item.classList.add('saindo'), 3600);
    setTimeout(() => item.remove(), 4200);
  }

  function showModal(html) {
    $('#janela-corpo').innerHTML = html;
    $('#janela').hidden = false;
    ui.modal = true;
    focusable();
  }

  function closeModal() {
    $('#janela').hidden = true;
    ui.modal = false;
    focusable();
  }

  function focusable() {
    if (desktop) desktop.setFocusable(ui.open || ui.modal || ui.rings.open || ui.tela.open);
  }

  // --- Renderização ------------------------------------------------------------------------------------
  function context() {
    return { tab: ui.tab, lastLetter: ui.lastLetter, language, steam: desktop?.steam || null,
      settings: ui.settings, desktop: !!desktop, icon, now: now(), dockCat: ui.dock.cat, dockSide: ui.dock.side,
      ringPlaying: ui.rings.playing, ringResult: ui.rings.result, zoomLabel: zoomLabel(),
      closeArmed: now() < ui.closeArmedUntil, tela: ui.tela.open ? ui.tela.id : null, logFilter: ui.logFilter };
  }

  // Painel (números, conquistas, ajustes) e a janela da tela de jogo aberta, redesenhados juntos.
  function renderWindows() {
    renderTela();
    renderPanelBody();
  }

  // Redesenhar troca o HTML inteiro: com o jogador digitando o nome, escolhendo num select ou arrastando o volume,
  // o campo sumiria no meio. Fica para quando ele sair do campo (focusout).
  function busy(container) {
    const active = document.activeElement;
    if (!active?.matches?.('input, select, textarea') || !container?.contains?.(active)) return false;
    ui.redesenhar = true;
    return true;
  }

  function renderTela() {
    if (!ui.tela.open) return;
    const body = $('#tela-corpo');
    if (busy(body)) return;
    const scroll = body.scrollTop;
    body.innerHTML = UI.tela(engine, context());
    body.scrollTop = scroll;
    $('#tela-titulo').textContent = UI.telaName(ui.tela.id);
    $('#tela').classList.toggle('modo-teste', ui.tela.id === 'teste');
    refreshLive(true);
  }

  function renderPanelBody() {
    if (!ui.open) return;
    const body = $('#painel-corpo');
    if (busy(body)) return;
    const ctx = context();
    $('#painel-abas').innerHTML = UI.tabs(engine, ctx);
    const scroll = body.scrollTop;
    body.innerHTML = UI.panel(engine, ctx);
    body.scrollTop = scroll;
    $('#painel-titulo').textContent = `${engine.state.name} · ${engine.tier().name}`;
    refreshLive(true);
  }

  function renderDock() {
    if (!ui.dock.open) return;
    const dock = $('#vitrine');
    const scroll = dock.querySelector?.('.vitrine-corpo')?.scrollLeft || 0;
    dock.innerHTML = UI.vitrine(engine, context());
    const body = dock.querySelector?.('.vitrine-corpo');
    if (body) body.scrollLeft = scroll;
    refreshLive(true);
    placeDock();
  }

  function renderRings() {
    if (ui.rings.open) $('#argolas-info').innerHTML = UI.argolas(engine, context());
    refreshLive(true);
  }

  // A placa só é refeita quando muda de forma; os números mudam no lugar, sem perder cliques.
  function renderHud(force = false) {
    const s = engine.state;
    const ready = s.outings.filter((_, i) => engine.outingState(i) === 'pronto').length;
    const key = [engine.tierIndex(), s.size, s.fishing.unlocked && s.fishing.ready, s.mail.ready, ready,
      now() < ui.closeArmedUntil, !!desktop].join('|');
    if (!force && key === ui.hudKey) return;
    ui.hudKey = key;
    $('#placa').innerHTML = UI.hud(engine, context());
    refreshLive(true);
  }

  function refreshLive(force = false) {
    const t = performance.now();
    if (!force && t - ui.lastLive < 200) return;
    ui.lastLive = t;
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
    for (const node of document.querySelectorAll('.placa .barra.fama i')) {
      node.style.width = `${Math.min(100, 100 * s.fame / Math.max(1, engine.fameNeed()))}%`;
    }
    for (const node of document.querySelectorAll('[data-until]')) {
      node.textContent = UI.duration(Number(node.dataset.until) - now());
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
    focusable();
  }

  // Telas de jogo: cada botão da placa abre a sua; clicar de novo no mesmo botão fecha.
  function openTela(id, toggle = true) {
    if (ui.tela.open && ui.tela.id === id) { if (toggle) closeTela(); return; }
    ui.tela.id = id;
    ui.tela.open = true;
    $('#tela').hidden = false;
    renderTela();
    placeWindow($('#tela'), 'telaPos');
    renderHud(true);
    focusable();
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
    if (ui.open) placeWindow($('#painel'), 'panelPos');
  }

  function closeDock() {
    ui.dock.open = false;
    ui.preview = null;
    $('#vitrine').hidden = true;
  }

  function openRings() {
    ui.rings.open = true;
    $('#argolas').hidden = false;
    renderRings();
    placeWindow($('#argolas'), 'ringsPos');
    focusable();
  }

  function closeRings() {
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
    const item = engine.items[id];
    if (!item) return null;
    return item.cat === 'lado' ? { [ui.dock.side]: id } : { [item.cat]: id };
  }

  function dockItem(id) {
    const item = engine.items[id];
    const side = ui.dock.side;
    if (engine.owned(id)) {
      engine.equip(id, side);
      tocar('equipar');
    } else if (item.source === 'role') { toast(t('app.onlyOutings', { item: item.name })); return; }
    else if (item.source === 'argolas') { toast(t('app.onlyRings', { item: item.name })); return; }
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

  function startHold(button) {
    const stat = button.dataset.stat;
    const hold = { count: 0, timer: null, interval: null };
    const buy = () => {
      if (engine.buyLevel(stat)) {
        hold.count++;
        tocar('nivel', { pitch: Math.min(hold.count - 1, 12) });
        updateStatCard(button, stat);
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

  function stopHold() {
    const hold = ui.hold;
    if (!hold) return;
    ui.hold = null;
    clearTimeout(hold.timer);
    clearInterval(hold.interval);
    if (hold.count > 1) toast(t('app.levels', { n: hold.count }));
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
    save();
    if (desktop?.setLanguage) { desktop.setLanguage(choice); return; }
    try {
      sessionStorage.setItem(REOPEN_KEY, 'ajustes');
      localStorage.setItem(LANGUAGE_KEY, choice);
    } catch (_) { /* sem armazenamento */ }
    location.reload();
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
    if (a === 'tab') { openPanel(d.tab); return; }
    if (a === 'tela') { openTela(d.tela); return; }
    if (a === 'tela-fechar') { closeTela(); return; }
    if (a === 'historico-filtro') { ui.logFilter = d.value; renderWindows(); return; }
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
    if (a === 'vitrine-cat') { ui.dock.cat = d.cat; ui.preview = null; renderDock(); return; }
    if (a === 'vitrine-lado') { ui.dock.side = d.side; ui.preview = null; renderDock(); return; }
    if (a === 'vitrine-item') { dockItem(d.id); return; }
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
    if (a === 'pescar') {
      const result = engine.fish();
      if (result) { fishReveal(result); done(true); }
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
    if (a === 'carta') {
      const letter = engine.openLetter();
      if (letter) {
        ui.lastLetter = letter;
        tocar('carta');
        showModal(`<div class="bilhete grande"><p>${UI.esc(t('quote', { text: letter.text }))}</p></div>` +
          `<p>${UI.esc(t('gain.tickets', { n: letter.tickets }))}</p>` +
          `<div class="botoes"><button class="btn" data-action="fechar-janela">${UI.esc(t('mail.ok'))}</button></div>`);
      }
      done(!!letter);
      return;
    }
    if (a === 'foto') { tocar('foto'); download('mandioca-festa.png', ui.festa ? ui.festa.photo(4) : ''); return; }
    if (a === 'som') {
      // Liga na hora (sem esperar o desktop responder), para o próprio clique já soar.
      const on = d.value === 'on';
      ui.settings.sound = on;
      som?.set({ enabled: on });
      changeSettings({ sound: on });
      if (on) tocar('moeda');
      else ui.tocou = true;
      return;
    }
    if (a === 'fixar') { changeSettings({ pinned: !ui.settings.pinned }); return; }
    if (a === 'placa') { changeSettings({ hud: d.value }); return; }
    if (a === 'placa-auto') { changeSettings({ placa: null }); return; }
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
    if (a === 'importar') { $('#importar').click(); return; }
    if (a === 'reiniciar') {
      if (!confirm(t('app.restartConfirm'))) return;
      engine = new GameEngine(data);
      ui.tab = 'festa';
      forgetRound();
      save();
      renderHud(true);
      renderWindows();
      renderDock();
    }
  }

  // Depois de reiniciar ou importar outra festa, nada da festa anterior fica na tela.
  function forgetRound() {
    ui.lastLetter = null;
    ui.rings.playing = false;
    ui.rings.result = null;
    ui.game?.reset();
  }

  // Cliques na própria festa. Clicar numa barraca abre a janela dela (se já está aberta, fica aberta).
  function festaClick(region) {
    if (region === 'request') {
      const result = engine.claimRequest();
      if (result) done(true, t('app.requestDone', { n: UI.compact(result.reward) }), null, 'moeda');
    } else if (region === 'crasher') {
      const result = engine.shooCrasher();
      if (result) done(true, t('app.crasherOut', { n: result.tickets }), null, 'expulsar');
    } else if (region === 'fogueira') { if (engine.tierIndex() >= 2) openTela('fogueira', false); }
    else if (region === 'palco') openTela('turma', false);
    else if (region === 'sopinha') { ui.festa?.poke('sopinha'); tocar('carinho'); }
    else if (region === 'lado-esquerda' || region === 'lado-direita') {
      const side = region === 'lado-esquerda' ? 'esquerda' : 'direita';
      const id = engine.state.equipped[side];
      if (id === 'barraca-argolas') openRings();
      else if (id === 'barraca-pescaria' && engine.tierIndex() >= 1) openTela('pescaria', false);
      else if (id === 'correio') openTela('correio', false);
    }
    // A Mandioca, o par, o chão e os enfeites são cenário: o clique só dá foco ao jogo (a loja abre pelo botão).
  }

  // --- Eventos do motor --------------------------------------------------------------------------------
  // Som de cada acontecimento da festa (os que o jogador não causou com um clique).
  const EVENT_SOUNDS = { 'tier-up': 'porte', legendary: 'porte', achievement: 'conquista', 'fishing-open': 'aviso',
    'prize-ready': 'aviso', 'letter-ready': 'aviso', 'outing-done': 'aviso', crasher: 'penetra', request: 'pedido',
    'size-up': 'convidado', 'flare-start': 'fogo' };
  // Acontecimentos que mudam o que as janelas mostram: prenda pronta, carta chegando, turma voltando do rolê...
  const REFRESH_EVENTS = new Set(['tier-up', 'fishing-open', 'prize-ready', 'letter-ready', 'outing-done', 'legendary',
    'achievement']);

  function notify(events) {
    let refresh = false;
    const quiet = performance.now() < ui.quietUntil;
    const leveled = events.some(event => event.type === 'tier-up');
    for (const event of events) {
      if (REFRESH_EVENTS.has(event.type)) refresh = true;
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
      else if (event.type === 'outing-done') {
        toast(t('app.outingDone', { name: engine.chars[engine.state.outings[event.index].char]?.name || t('app.someone') }));
      } else if (event.type === 'crasher') toast(t('app.crasher'));
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
  }

  // --- Foco: a placa só aparece enquanto o jogo tem foco (o último clique foi na festa) -----------------
  function setFocused(value) {
    ui.focused = value;
    document.body.classList.toggle('jogo-desfocado', !value);
    // Em foco a festa anda a 60 quadros por segundo; de fundo (a pessoa trabalhando em outra janela), a 30.
    ui.festa?.setRate(value ? 60 : 30);
  }

  function focusGame() {
    if (!ui.focused) setFocused(true);
    desktop?.focusGame?.();
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
    if (typeof actual === 'boolean') ui.interactive = actual;
    // Durante arrasto ou compra segurada a janela segue clicável, para o soltar do botão chegar aqui.
    if (ui.drag || ui.hold) return;
    const found = hitAt(x, y);
    setInteractive(!!(found.ui || found.region));
    const canvas = $('#festa-canvas');
    if (canvas && found.region) canvas.style.cursor = ['terreiro', 'festa'].includes(found.region) ? 'grab' : 'pointer';
    document.body.classList.toggle('sobre-festa', !!found.region || !!found.ui);
  }

  document.addEventListener('mousemove', event => hover(event.clientX, event.clientY));

  // Ícones e imagens não se arrastam como arquivo: o arrasto nativo cancelaria o arrasto da janela (pointercancel).
  document.addEventListener('dragstart', event => event.preventDefault());

  document.addEventListener('mouseover', event => {
    const card = event.target.closest?.('[data-preview]');
    if (!card || !ui.dock.open) return;
    ui.preview = previewFor(card.dataset.preview);
    const item = engine.items[card.dataset.preview];
    const detail = $('#vitrine-detalhe') || document.querySelector?.('#vitrine-detalhe');
    if (detail && item) detail.textContent = `${item.name}: ${item.desc}${item.effect ? ` ${item.effect}` : ''}`;
  });

  document.addEventListener('mouseout', event => {
    const card = event.target.closest?.('[data-preview]');
    if (!card || card.contains?.(event.relatedTarget)) return;
    ui.preview = null;
  });

  function throwRing() {
    if (ui.game?.throwRing(performance.now())) tocar('arremesso');
  }

  document.addEventListener('pointerdown', event => {
    // A janela só recebe clique em cima da festa ou das janelas do jogo: qualquer clique aqui dá foco ao jogo.
    focusGame();
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
    if (event.target.matches?.('input[type="range"]')) { ui.drag = { kind: 'barra', x: event.clientX, y: event.clientY }; return; }
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
    const handle = event.target.closest?.('[data-arrastar]');
    if (handle && !event.target.closest('button')) {
      const key = { argolas: 'ringsPos', tela: 'telaPos' }[handle.dataset.arrastar] || 'panelPos';
      const element = handle.parentElement;
      ui.drag = { kind: 'janela', key, element, x: event.clientX, y: event.clientY,
        start: { x: parseFloat(element.style.left) || 0, y: parseFloat(element.style.top) || 0 }, moved: false };
    }
  });

  document.addEventListener('pointermove', event => {
    const drag = ui.drag;
    if (!drag || drag.kind === 'barra') return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    if (!drag.moved) return;
    if (drag.kind === 'zoom') {
      // Se bateu no limite, o arrasto recomeça dali: voltar o mouse já diminui, sem trecho morto.
      const factor = 2 ** ((dx - dy) / 160);
      drag.start = setZoom(drag.start * factor, false) / factor;
    } else if (drag.kind === 'festa') {
      // Qualquer parte da festa arrasta, até as que abrem algo: só o clique sem arrastar abre (no pointerup).
      const size = festaSize();
      const left = clamp(drag.start.left + dx, 0, maxLeft(size));
      ui.settings.x = (left + size.width / 2) / innerWidth;
      ui.settings.lift = clamp(drag.start.lift - dy, 0, maxLift(size));
      placeFesta();
    } else if (drag.kind === 'vitrine') {
      ui.dock.dx = drag.start + dx;
      placeDock();
    } else if (drag.kind === 'placa') {
      const placa = $('#placa');
      const zoom = uiZoom();
      const w = (placa.offsetWidth || 240) * zoom;
      const h = (placa.offsetHeight || 120) * zoom;
      const left = clamp(drag.start.left + dx, 6, Math.max(6, innerWidth - w - 6));
      const bottom = clamp(drag.start.bottom - dy, 6, Math.max(6, innerHeight - h - 6));
      ui.settings.placa = { dx: Math.round(left - ui.anchor.left), dy: Math.round(bottom - ui.anchor.lift) };
      placeFesta();
    } else {
      const element = drag.element;
      const base = windowBase();
      const x = clamp(drag.start.x + dx, 8, Math.max(8, innerWidth - (element.offsetWidth || 780) - 8));
      const y = clamp(drag.start.y + dy, 8, Math.max(8, innerHeight - (element.offsetHeight || 560) - 8));
      ui[drag.key] = { dx: x - base.x, dy: y - base.y, auto: false };
      placeWindow(element, drag.key);
    }
  });

  document.addEventListener('pointerup', () => {
    stopHold();
    const drag = ui.drag;
    ui.drag = null;
    if (!drag) return;
    if (drag.kind === 'zoom') {
      if (drag.moved) changeSettings({ zoom: ui.settings.zoom, x: ui.settings.x, placa: ui.settings.placa });
      else { setZoom(1, true); tocar('clique'); }
    } else if (drag.kind === 'placa') {
      if (drag.moved) changeSettings({ placa: ui.settings.placa });
    }
    else if (drag.kind === 'festa') {
      if (drag.moved) changeSettings({ x: ui.settings.x, lift: ui.settings.lift });
      else comSom(() => festaClick(drag.region), null);
    }
  });
  // O navegador cancelou o ponteiro (começou um arrasto nativo, por exemplo): nada fica preso "arrastando".
  document.addEventListener('pointercancel', () => {
    stopHold();
    ui.drag = null;
  });

  document.addEventListener('wheel', event => {
    if (!event.target.closest?.('[data-action="zoom-alca"]')) return;
    event.preventDefault();
    setZoom(ui.settings.zoom * 1.12 ** (-Math.sign(event.deltaY)), true);
  }, { passive: false });

  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-action]');
    if (!button || button.tagName === 'SELECT' || button.disabled || button.dataset.hold) return;
    if (button.dataset.action === 'zoom-alca') {
      // O mouse já foi tratado no pointerup; pelo teclado (Enter ou espaço), o botão volta a 100%.
      if (event.detail === 0) comSom(() => setZoom(1, true));
      return;
    }
    comSom(() => act(button));
  });

  document.addEventListener('change', event => {
    if (event.target.id === 'nome') { engine.rename(event.target.value); saveLater(); renderHud(true); renderWindows(); }
    if (event.target.id === 'volume') {
      changeSettings({ volume: Number(event.target.value) / 100 });
      tocar('moeda');
    }
  });

  // O volume muda enquanto a barra anda; só vai para as preferências ao soltar (change).
  document.addEventListener('input', event => {
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

  document.addEventListener('keydown', event => {
    // Itens da vitrine são cartões (div com role="button"): Enter e espaço funcionam como clique.
    const card = event.target?.closest?.('[role="button"][data-action]');
    if (card && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      comSom(() => act(card));
      return;
    }
    if (event.key === ' ' && ui.rings.open && ui.rings.playing) {
      event.preventDefault();
      throwRing();
      return;
    }
    if (event.key !== 'Escape') return;
    comSom(() => {
      if (ui.modal) closeModal();
      else if (ui.rings.open) closeRings();
      else if (ui.tela.open) closeTela();
      else if (ui.open) closePanel();
      else if (ui.dock.open) closeDock();
    }, null);
  });

  $('#importar').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const imported = new GameEngine(data, JSON.parse(await file.text()));
      if (!confirm(t('app.importConfirm'))) return;
      engine = imported;
      forgetRound();
      save();
      renderHud(true);
      renderWindows();
      renderDock();
      toast(t('app.imported'));
    } catch (_) { toast(t('app.importFailed'), 'erro'); }
    finally { event.target.value = ''; }
  });

  addEventListener('resize', () => {
    scaleFesta();
    placeFesta();
  });
  addEventListener('beforeunload', save);

  if (desktop) {
    desktop.onCommand(command => {
      if (command === 'painel') openPanel();
      else if (command === 'vitrine') openDock();
      else if (command === 'argolas') openRings();
      else if (command === 'foto') act({ dataset: { action: 'foto' } });
      else if (command?.settings) applySettings(command.settings);
      else if (typeof command?.foco === 'boolean') setFocused(command.foco);
      // O Electron conta onde o cursor está de tempos em tempos: se o repasse do mouse do Windows falhar, a festa
      // continua sabendo quando o cursor passa por cima dela.
      else if (command?.cursor) hover(command.cursor.x, command.cursor.y, command.cursor.interactive);
    });
  }

  // --- Laço --------------------------------------------------------------------------------------------
  let lastFrame = performance.now();
  function frame(t) {
    const delta = (t - lastFrame) / 1000;
    lastFrame = t;
    let remaining = Math.min(delta, desktop ? 30 : 1);
    while (remaining > 0) { const step = Math.min(remaining, 0.25); engine.tick(step); remaining -= step; }
    const events = engine.drainEvents();
    if (events.length) {
      ui.festa?.onEvents(engine, events, t);
      notify(events);
      // Conquista salva logo: o save leva a lista para a Steam.
      if (events.some(event => ['size-up', 'tier-up', 'fished', 'outing-done', 'achievement'].includes(event.type))) saveLater();
    }
    if (ui.saveSoon && t >= ui.saveSoon) { ui.saveSoon = 0; save(); }
    if (t - ui.lastSave > 30000) save();
    renderHud();
    refreshLive();
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
    ui.festa = globalThis.ArraiaFesta.create(canvas, sprites);
    scaleFesta();
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
  renderHud(true);
  placeFesta();
  if (desktop) {
    desktop.getSettings().then(applySettings).catch(error => toast(error.message, 'erro'));
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
    showModal(`<h2>${UI.esc(t('app.title'))}!</h2>${t('app.firstRun')}` +
      `<div class="botoes"><button class="btn" data-action="fechar-janela">${UI.esc(t('app.firstRunOk'))}</button></div>`);
  }
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(animate);
  // Gravador de vídeos (trailer/captura): só existe quando a página foi aberta por ele.
  if (typeof globalThis.__gravador === 'function') globalThis.__gravador({ engine: () => engine, ui });
})();
