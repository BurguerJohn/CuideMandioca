// O gerenciador das janelas extras da festa (a Casa da Mandioca tem o código dela em app.js e src/casa.js). Cada janela é um
// retângulo solto, como a casa: abre num número de convidados, ganha um botão na placa, arrasta pelo fundo (a posição fica
// guardada em relação à festa, então arrastar a festa leva as janelas junto), esconde pelo X e volta pelo botão.
// Cada janela vem de `src/janela-<id>.js`, que se registra aqui com `registerView(id, create)`.
(function (root) {
  'use strict';

  const views = {};
  const registerView = (id, create) => { views[id] = create; };

  // `opts`: { document, engine, sprites, anchor(), settings(), changeSettings(partial), placaRect(), size() ({width, height} da
  // tela), t(key, vars), sound(name), toast(text, kind), focused() }.
  function create(opts) {
    const { document, sprites } = opts;
    let engine = opts.engine;
    const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
    const windows = new Map();      // id -> { id, element, canvas, view, status, drawnAt }
    let lastSignature = '';

    const settingsOf = id => opts.settings().minis?.[id] || null;
    const entryOf = id => engine.data.minis.windows.find(entry => entry.id === id);
    // Visível: a janela já abriu, a pessoa não escondeu e a festa não está escondida.
    const visible = id => !!windows.get(id) && engine.miniOpen(id) && settingsOf(id)?.hidden === false && !opts.settings().hidden;

    // Cria o retângulo da janela (uma vez só, na primeira vez que ela precisa aparecer).
    function ensure(id) {
      if (windows.has(id)) return windows.get(id);
      const factory = views[id];
      if (!factory || !sprites) return null;
      const element = document.createElement('section');
      element.id = `mini-${id}`;
      element.className = 'casa mini ui';
      element.hidden = true;
      element.dataset.mini = id;
      element.innerHTML = `<div class="casa-topo"><h2></h2><span class="casa-contagem"></span>` +
        `<button class="ajuda" data-action="mini-ajuda" data-mini="${id}" aria-label="${opts.t('help.button')}" title="${opts.t('help.button')}">?</button>` +
        `<button class="fechar" data-action="mini-fechar" data-mini="${id}" aria-label="${opts.t('hud.fechar')}">×</button></div>` +
        `<div class="casa-cena"></div>`;
      const canvas = document.createElement('canvas');
      const scene = element.querySelector ? element.querySelector('.casa-cena') : null;
      if (scene && scene.appendChild) scene.appendChild(canvas);
      else if (element.children) element.children.push(canvas);
      // O painel de ajuda cobre a cena (a janela explica como funciona); clicar nele fecha.
      const help = document.createElement('div');
      help.className = 'ajuda-painel';
      help.hidden = true;
      help.dataset.action = 'mini-ajuda';
      help.dataset.mini = id;
      const helpTitle = document.createElement('h3');
      const helpText = document.createElement('p');
      const helpClose = document.createElement('small');
      for (const part of [helpTitle, helpText, helpClose]) help.appendChild(part);
      if (scene && scene.appendChild) scene.appendChild(help);
      else if (element.children) element.children.push(help);
      document.body.appendChild(element);
      const view = factory(canvas, sprites, {
        sound: (name, options) => opts.sound(name, options),
        toast: (text, kind) => opts.toast(text, kind),
        t: (key, vars) => opts.t(key, vars),
        engine: () => engine,
        place: () => place(id)
      });
      const item = { id, element, canvas, view, status: '', drawnAt: 0, help, helpTitle, helpText, helpClose, helpOpen: false };
      windows.set(id, item);
      canvas.addEventListener?.('mousemove', event => {
        const found = view.hit?.(event.clientX, event.clientY);
        canvas.title = found?.tip || '';
      });
      return item;
    }

    function title(id) { return entryOf(id)?.name || id; }

    // Os números do texto de ajuda vêm da configuração da janela (`data.minis.<id>`): o texto nunca fica desatualizado.
    function helpVars(id) {
      const cfg = engine.data.minis[id] || {};
      return Object.fromEntries(Object.entries(cfg).filter(([, value]) => typeof value === 'number'));
    }

    // Abre ou fecha o painel "como funciona" desta janela (o texto é montado ao abrir, no idioma de agora).
    function setHelp(id, open) {
      const item = windows.get(id);
      if (!item) return false;
      item.helpOpen = !!open;
      if (item.helpOpen) {
        item.helpTitle.textContent = `${title(id)}: ${opts.t('help.title')}`;
        item.helpText.textContent = opts.t(`mini.help.${id}`, helpVars(id));
        item.helpClose.textContent = opts.t('help.close');
      }
      item.help.hidden = !item.helpOpen;
      return item.helpOpen;
    }
    const toggleHelp = id => setHelp(id, !windows.get(id)?.helpOpen);
    const helpOpen = id => !!windows.get(id)?.helpOpen;

    // Põe a janela onde ela cabe: onde a pessoa arrastou (contando a partir da festa) ou um lugar livre ao lado da festa,
    // sem cobrir a placa (é nela que fica o botão da janela) nem outra janela aberta.
    function place(id) {
      const item = windows.get(id);
      if (!item) return;
      const on = visible(id);
      item.element.hidden = !on;
      if (!on) return;
      const screen = opts.size();
      item.view.setScale(3 * (opts.settings().zoom || 1), { width: screen.width * 0.5, height: screen.height * 0.8 });
      const heading = item.element.querySelector?.('h2');
      if (heading) heading.textContent = title(id);
      const counter = item.element.querySelector?.('.casa-contagem');
      const status = item.view.status?.(engine) || '';
      if (counter && status !== item.status) { counter.textContent = status; item.status = status; }
      const canvasSize = item.view.size();
      const w = Math.max(item.element.offsetWidth || 0, canvasSize.width + 12);
      const h = Math.max(item.element.offsetHeight || 0, canvasSize.height + 38);
      const a = opts.anchor() || { left: 0, width: 0, lift: 0, top: 0 };
      const custom = settingsOf(id);
      let left;
      let bottom;
      if (custom && Number.isFinite(custom.dx) && Number.isFinite(custom.dy)) {
        left = a.left + custom.dx;
        bottom = a.lift + custom.dy;
      } else [left, bottom] = freeSpot(id, w, h, a, screen);
      left = clamp(left, 6, Math.max(6, screen.width - w - 6));
      bottom = clamp(bottom, 6, Math.max(6, screen.height - h - 6));
      item.element.style.left = `${Math.round(left)}px`;
      item.element.style.bottom = `${Math.round(bottom)}px`;
    }

    // Retângulos (em pixels da tela) que a janela `id` não deve cobrir: a placa, a casa e as outras janelas abertas.
    function obstacles(id) {
      const list = [];
      const placa = opts.placaRect();
      if (placa && placa.width) list.push(placa);
      for (const other of ['casa', ...windows.keys()]) {
        if (other === id) continue;
        const element = other === 'casa' ? document.querySelector('#casa') : windows.get(other)?.element;
        if (!element || element.hidden || !element.getBoundingClientRect) continue;
        const rect = element.getBoundingClientRect();
        if (rect && rect.width) list.push(rect);
      }
      return list;
    }

    function freeSpot(id, w, h, a, screen) {
      const taken = obstacles(id);
      const covers = (left, bottom) => taken.some(r => left < r.right + 6 && left + w > r.left - 6 &&
        screen.height - bottom - h < r.bottom + 6 && screen.height - bottom > r.top - 6);
      const fits = (left, bottom) => left >= 6 && left + w <= screen.width - 6 && bottom >= 6 && bottom + h <= screen.height - 6;
      // Do lado direito da festa para a esquerda e do chão para cima, e por fim o canto de cima: o primeiro lugar livre.
      const lefts = [];
      for (let x = a.left + a.width + 12; x >= 6; x -= 24) lefts.push(x);
      for (let x = a.left + a.width + 36; x + w <= screen.width - 6; x += 24) lefts.push(x);
      for (let bottom = a.lift + 10; bottom + h <= screen.height - 6; bottom += 24) {
        for (const left of lefts) if (fits(left, bottom) && !covers(left, bottom)) return [left, bottom];
      }
      for (let bottom = 6; bottom + h <= screen.height - 6; bottom += 24) {
        for (const left of lefts) if (fits(left, bottom) && !covers(left, bottom)) return [left, bottom];
      }
      return [a.left + 10, a.lift + (a.top || 0) + 8];
    }

    function placeAll() { for (const id of windows.keys()) place(id); }

    // Mostra ou esconde (botão da placa ou X da janela).
    function setHidden(id, hidden) {
      const minis = { ...(opts.settings().minis || {}) };
      minis[id] = { ...(minis[id] || {}), hidden };
      opts.changeSettings({ minis });
      if (!hidden) ensure(id);
      else setHelp(id, false);
      place(id);
    }
    function toggle(id) {
      if (!engine.miniOpen(id)) return false;
      setHidden(id, visible(id));
      return true;
    }
    const close = id => setHidden(id, true);

    // Desenha as janelas que aparecem (a 30 quadros por segundo, e só com o jogo em foco).
    function draw(now) {
      for (const item of windows.values()) {
        if (!visible(item.id) || now - item.drawnAt < 33) continue;
        item.drawnAt = now;
        const before = item.view.size();
        item.view.draw(engine, now);
        const after = item.view.size();
        const status = item.view.status?.(engine) || '';
        if (after.width !== before.width || after.height !== before.height || status !== item.status) place(item.id);
      }
    }

    // Eventos do motor: a janela que acabou de abrir aparece sozinha (e avisa); todas as janelas recebem os eventos.
    function onEvents(events, now) {
      for (const event of events) {
        if (event.type !== 'mini-open') continue;
        const item = ensure(event.id);
        if (!item) continue;
        setHidden(event.id, false);
        opts.toast(opts.t('mini.opened', { name: title(event.id) }), 'ouro');
      }
      for (const item of windows.values()) item.view.onEvents?.(engine, events, now);
    }

    // As janelas que já abriram, com o botão da placa: `visible` diz se a janela está na tela e `pending` quantas coisas dela ainda
    // esperam o jogador (páginas do cordel por completar, por exemplo: o botão pisca).
    function items() {
      return engine.minis.opened().filter(id => views[id]).map(id => ({ id, name: title(id), visible: visible(id), pending: engine.mini(id).pending?.() || 0 }));
    }
    // Muda quando o conjunto de botões, o que está aberto ou o que está pendente muda (para a placa se redesenhar).
    function signature() { return items().map(item => `${item.id}${item.visible ? '+' : '-'}${item.pending || ''}`).join(','); }

    // Outro jogo no lugar do atual (reiniciar ou importar a festa): as janelas do jogo anterior somem (e com elas o botão de cada uma na
    // placa) e as do novo reaparecem conforme os convidados dele.
    function setEngine(next) {
      if (!next || next === engine) return;
      for (const item of windows.values()) item.element.remove?.();
      windows.clear();
      engine = next;
      restore();
    }

    // Janelas abertas na carga do jogo: já abertas pela pessoa na última vez ficam como estavam.
    function restore() {
      for (const id of engine.minis.opened()) {
        if (settingsOf(id)?.hidden === false) ensure(id);
      }
      placeAll();
    }

    // Arrasto pelo fundo: devolve o estado do arrasto (ou null se o clique não foi numa janela).
    function dragStart(target, event) {
      const element = target.closest?.('.mini');
      if (!element) return null;
      if (target.closest('button') || target.closest('.ajuda-painel')) return null;
      const id = element.dataset?.mini;
      const item = windows.get(id);
      if (!item) return null;
      // A barra de rolagem da cena é do navegador: o fundo em volta é que arrasta.
      if (target.classList?.contains('casa-cena')) return null;
      const found = item.view.hit?.(event.clientX, event.clientY) || null;
      return { kind: 'mini', id, x: event.clientX, y: event.clientY, found,
        start: { left: parseFloat(element.style.left) || 0, bottom: parseFloat(element.style.bottom) || 0 }, moved: false };
    }
    function dragMove(drag, dx, dy) {
      const item = windows.get(drag.id);
      if (!item) return;
      const screen = opts.size();
      const w = item.element.offsetWidth || 300;
      const h = item.element.offsetHeight || 300;
      const left = clamp(drag.start.left + dx, 6, Math.max(6, screen.width - w - 6));
      const bottom = clamp(drag.start.bottom - dy, 6, Math.max(6, screen.height - h - 6));
      const a = opts.anchor();
      const minis = { ...(opts.settings().minis || {}) };
      minis[drag.id] = { ...(minis[drag.id] || {}), hidden: false, dx: Math.round(left - a.left), dy: Math.round(bottom - a.lift) };
      opts.settings().minis = minis;
      place(drag.id);
    }
    // Soltou: se arrastou, guarda a posição; se foi só um clique, a janela trata (um bicho que reage, um canteiro que planta...).
    function dragEnd(drag, now) {
      if (drag.moved) { opts.changeSettings({ minis: opts.settings().minis }); return; }
      const item = windows.get(drag.id);
      item?.view.click?.(drag.x, drag.y, now);
    }

    function probe() {
      return Object.fromEntries([...windows.entries()].map(([id, item]) => [id, { visible: visible(id), ...(item.view.probe?.() || {}) }]));
    }

    return { ensure, place, placeAll, toggle, close, setHidden, draw, onEvents, items, signature, restore, dragStart, dragMove, dragEnd,
      visible, probe, windows, setHelp, toggleHelp, helpOpen, setEngine };
  }

  root.ArraiaJanelas = { create, registerView, views };
})(typeof globalThis !== 'undefined' ? globalThis : this);
