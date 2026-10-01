const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const data = require('../src/data.js');
const core = require('../src/core.js');
const UI = require('../src/ui.js');
const { fakeDocument } = require('./fake-dom');

const IDS = ['#festa', '#festa-canvas', '#placa', '#avisos', '#painel', '#painel-abas', '#painel-corpo',
  '#painel-titulo', '#janela', '#janela-corpo', '#importar', '#vitrine', '#argolas', '#argolas-canvas', '#argolas-info',
  '#tela', '#tela-corpo', '#tela-titulo', '#zoom-guia', '#casa', '#casa-canvas', '#casa-contagem', '#casa-cena'];

function boot(extra = {}, desktopExtra = {}) {
  const document = fakeDocument(IDS);
  const calls = [];
  let command = null;
  const desktop = {
    language: { choice: 'auto', id: 'pt-BR', auto: 'pt-BR' },
    steam: { on: false, name: null },
    setLanguage: choice => calls.push(['language', choice]),
    loadGame: () => null,
    saveGame: state => { calls.push(['save', state.size]); return true; },
    getSettings: () => Promise.resolve({ pinned: true, zoom: 1, x: 0.7, lift: 0, hud: 'sempre', hidden: false }),
    updateSettings: partial => { calls.push(['settings', partial]); return Promise.resolve({ ...partial }); },
    setInteractive: value => calls.push(['interactive', value]),
    setFocusable: value => calls.push(['focusable', value]),
    focusGame: () => calls.push(['focus-game']),
    quit: () => calls.push(['quit']),
    onCommand: callback => { command = callback; },
    ...desktopExtra
  };
  const windowListeners = {};
  const sandbox = {
    ArraiaCore: core, ArraiaUI: UI, ArraiaI18n: require('../src/i18n.js'), ArraiaSettings: require('../src/settings.js'), GAME_DATA: data, arraiaDesktop: desktop, document,
    addEventListener: (name, callback) => { windowListeners[name] = callback; },
    innerWidth: 1920, innerHeight: 1040, performance: { now: () => 1000 }, Intl, Date, Math, JSON, Promise,
    setInterval() {}, setTimeout() { return 1; }, clearTimeout() {}, localStorage: null, Blob: class {},
    URL: { createObjectURL: () => 'blob:', revokeObjectURL() {} }, confirm: () => true, ...extra
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'app.js'), 'utf8'), sandbox);
  return { document, calls, run: value => command(value), windowListeners };
}

function fakeFesta(extra = {}) {
  return { draw() {}, setScale() {}, setRate() {}, setFlash() {}, setCalm() {}, onEvents() {},
    size: () => ({ width: 480, height: 612, top: 150, physical: 3, base: 3 }), ...extra };
}

test('no desktop a festa abre, mostra a placa e vaza o clique fora dela', async () => {
  const { document, calls, run, windowListeners } = boot();
  await Promise.resolve();
  const node = id => document.nodes.get(id);
  assert.equal(document.body.classList.contains('desktop'), true);
  assert.match(node('#placa').innerHTML, /Painel/);
  assert.equal(node('#janela').hidden, false, 'primeira vez mostra as boas-vindas');

  run('painel');
  assert.equal(node('#painel').hidden, false);
  assert.match(node('#painel-corpo').innerHTML, /Como a festa rende/);
  assert.deepEqual(calls.filter(c => c[0] === 'focusable').at(-1), ['focusable', true]);

  const click = dataset => document.listeners.click({ target: { closest: () => ({ tagName: 'BUTTON', dataset, disabled: false }) } });
  click({ action: 'tab', tab: 'conquistas' });
  assert.match(node('#painel-corpo').innerHTML, /Primeiro passo/);
  assert.doesNotMatch(node('#painel-abas').innerHTML, /Turma|Pescaria|Correio/, 'o painel só tem números e ajustes');
  assert.match(node('#placa').innerHTML, /data-tela="correio"/, 'o correio tem botão na placa');
  assert.doesNotMatch(node('#placa').innerHTML, /data-tela="turma"/, 'a turma só aparece quando libera');
  click({ action: 'tela', tela: 'correio' });
  assert.equal(node('#tela').hidden, false);
  assert.match(node('#tela-corpo').innerHTML, /Abrir carta/);
  assert.equal(node('#tela-titulo').textContent, 'Correio elegante');
  click({ action: 'tela', tela: 'correio' });
  assert.equal(node('#tela').hidden, true, 'o mesmo botão fecha a janela');
  click({ action: 'vitrine' });
  assert.equal(node('#vitrine').hidden, false);
  assert.match(node('#vitrine').innerHTML, /Melhorar/);
  click({ action: 'vitrine-cat', cat: 'chapeu' });
  assert.match(node('#vitrine').innerHTML, /Chapéu de Palha/);
  click({ action: 'vitrine-fechar' });
  assert.equal(node('#vitrine').hidden, true);
  click({ action: 'idioma', value: 'auto' });
  assert.equal(calls.some(c => c[0] === 'language'), false, 'clicar na escolha atual não recarrega');
  click({ action: 'idioma', value: 'es' });
  assert.deepEqual(calls.at(-1), ['language', 'es'], 'trocar o idioma pede ao desktop, que salva e recarrega');
  assert.equal(calls.at(-2)[0], 'save', 'a festa é salva antes de recarregar');
  click({ action: 'argolas' });
  assert.equal(node('#argolas').hidden, false);
  assert.match(node('#argolas-info').innerHTML, /Jogar/);
  click({ action: 'argolas-fechar' });
  click({ action: 'fechar-janela' });
  click({ action: 'fechar' });
  assert.equal(node('#painel').hidden, true);
  assert.deepEqual(calls.filter(c => c[0] === 'focusable').at(-1), ['focusable', false]);

  run({ foco: false });
  assert.equal(document.body.classList.contains('jogo-desfocado'), true, 'clicou fora: a placa some');
  document.elementFromPoint = () => null;
  document.listeners.pointerdown({ clientX: 5, clientY: 5, target: { closest: () => null }, preventDefault() {} });
  assert.equal(document.body.classList.contains('jogo-desfocado'), false, 'clicou no jogo: a placa volta');
  assert.deepEqual(calls.filter(c => c[0] === 'focus-game').length > 0, true);

  document.elementFromPoint = () => ({ closest: selector => selector === '.ui' ? {} : null });
  document.listeners.mousemove({ clientX: 10, clientY: 10 });
  assert.deepEqual(calls.at(-1), ['interactive', true]);
  document.elementFromPoint = () => null;
  document.listeners.mousemove({ clientX: 900, clientY: 10 });
  assert.deepEqual(calls.at(-1), ['interactive', false]);

  click({ action: 'zoom', value: '1.5' });
  assert.equal(calls.filter(c => c[0] === 'settings').at(-1)[1].zoom, 1.5);
  // Um botão só de tamanho: apertar e soltar sem arrastar volta a 100%.
  const zoomButton = { closest: selector => (selector === '[data-action="zoom-alca"]' ? {} : null) };
  document.listeners.pointerdown({ clientX: 50, clientY: 50, target: zoomButton, preventDefault() {} });
  document.listeners.pointerup({});
  assert.equal(calls.filter(c => c[0] === 'settings').at(-1)[1].zoom, 1, 'clicar no botão de tamanho volta a 100%');
  click({ action: 'zoom', value: '1.5' });
  document.listeners.click({ detail: 0, target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'zoom-alca' } }) } });
  assert.equal(calls.filter(c => c[0] === 'settings').at(-1)[1].zoom, 1, 'pelo teclado também');
  click({ action: 'fechar-jogo' });
  assert.notEqual(calls.at(-1)[0], 'quit', 'o primeiro clique só pede confirmação');
  click({ action: 'fechar-jogo' });
  assert.deepEqual(calls.slice(-2).map(c => c[0]), ['save', 'quit']);
  windowListeners.beforeunload();
  assert.equal(calls.at(-1)[0], 'save');
});

test('um quadro com erro não congela a festa, e o vigia do cursor desfaz o desencontro do clique', async () => {
  const frames = [];
  const logged = [];
  let draws = 0;
  const festa = {
    draw() { draws++; if (draws === 1) throw new Error('quadro quebrado'); },
    size: () => ({ width: 480, height: 612, top: 150, physical: 3, base: 3 }),
    setScale() {}, setRate() {}, hit: () => 'host', onEvents() {}, celebrate() {}, poke() {}, photo: () => ''
  };
  const { calls, run } = boot({
    requestAnimationFrame: fn => frames.push(fn), ArraiaFesta: { create: () => festa }, FESTA_SPRITES: {},
    console: { ...console, error() {} }
  }, { logError: text => logged.push(text) });
  await Promise.resolve();
  frames.shift()(1000);
  assert.equal(frames.length, 1, 'o próximo quadro é pedido mesmo com o erro');
  assert.match(logged[0], /quadro quebrado/, 'o erro vai para o erros.log');
  frames.shift()(1100);
  assert.equal(draws, 2, 'a festa continua sendo desenhada');

  // O Electron conta que a janela está pegando o clique, mas não há nada do jogo sob o cursor: a página corrige,
  // mesmo achando que já tinha pedido para vazar.
  calls.length = 0;
  run({ cursor: { x: 5, y: 5, interactive: true } });
  assert.deepEqual(calls.filter(call => call[0] === 'interactive'), [['interactive', false]]);
  run({ cursor: { x: 6, y: 5, interactive: false } });
  assert.deepEqual(calls.filter(call => call[0] === 'interactive'), [['interactive', false]], 'sem desencontro, nada muda');
});

test('segurar e arrastar uma parte clicável da festa muda a festa de lugar; clicar sem arrastar abre a parte', async () => {
  const poked = [];
  const festa = {
    draw() {}, size: () => ({ width: 480, height: 612, top: 150, physical: 3, base: 3 }), setScale() {}, setRate() {},
    hit: () => 'sopinha', onEvents() {}, celebrate() {}, poke: id => poked.push(id), photo: () => ''
  };
  const { document, calls } = boot({ ArraiaFesta: { create: () => festa }, FESTA_SPRITES: {}, console });
  await Promise.resolve();
  const canvas = { closest: selector => (selector === '#festa-canvas' ? {} : null), matches: () => false };
  document.elementFromPoint = () => canvas;
  const saved = () => calls.filter(call => call[0] === 'settings' && 'x' in call[1]);

  document.listeners.pointerdown({ clientX: 400, clientY: 600, target: canvas, preventDefault() {} });
  document.listeners.pointermove({ clientX: 460, clientY: 580 });
  document.listeners.pointerup({});
  assert.equal(saved().length, 1, 'arrastar a partir do Sopinha move a festa');
  assert.deepEqual(poked, [], 'e não conta como clique');

  document.listeners.pointerdown({ clientX: 400, clientY: 600, target: canvas, preventDefault() {} });
  document.listeners.pointermove({ clientX: 402, clientY: 601 });
  document.listeners.pointerup({});
  assert.deepEqual(poked, ['sopinha'], 'um clique (tremida de poucos pixels) faz carinho');
  assert.equal(saved().length, 1);
});

test('a aba de conjuntos da loja avisa o que falta para vestir o conjunto', async () => {
  const { document } = boot();
  await Promise.resolve();
  const node = id => document.nodes.get(id);
  const click = dataset => document.listeners.click({ target: { closest: () => ({ tagName: 'BUTTON', dataset, disabled: false }) } });
  click({ action: 'vitrine' });
  click({ action: 'vitrine-cat', cat: 'conjuntos' });
  assert.match(node('#vitrine').innerHTML, /Caipira de Raiz \+3%/);
  assert.match(node('#vitrine').innerHTML, /Faltam 2/);
  click({ action: 'vitrine-conjunto', id: 'noiva' });
  assert.match(node('#avisos').children.map(item => item.textContent).join('|'), /faltam Véu de Noiva, Buquê da Noiva/, 'sem as peças, o aviso diz quais faltam');
});

test('item que não se compra diz de onde vem (antes o do casamento dizia "custa 0")', async () => {
  const { document } = boot();
  await Promise.resolve();
  const node = id => document.nodes.get(id);
  const click = dataset => document.listeners.click({ target: { closest: () => ({ tagName: 'BUTTON', dataset, disabled: false }) } });
  click({ action: 'vitrine' });
  click({ action: 'vitrine-cat', cat: 'chapeu' });
  assert.match(node('#vitrine').innerHTML, /Só no leilão/);
  const toasts = () => node('#avisos').children.map(item => item.textContent).join('|');
  click({ action: 'vitrine-item', id: 'veu-noiva' });
  assert.match(toasts(), /Véu de Noiva só vem de presente de casamento/);
  click({ action: 'vitrine-item', id: 'chapeu-coco' });
  assert.match(toasts(), /Chapéu-coco só sai no leilão de prendas/);
  assert.doesNotMatch(toasts(), /custa 0/);
});

test('o mesmo aviso repetido vira um só com ×2, em vez de empilhar', async () => {
  const { document } = boot();
  await Promise.resolve();
  const node = id => document.nodes.get(id);
  const click = dataset => document.listeners.click({ target: { closest: () => ({ tagName: 'BUTTON', dataset, disabled: false }) } });
  click({ action: 'vitrine' });
  click({ action: 'vitrine-cat', cat: 'chapeu' });
  const before = node('#avisos').children.length;
  click({ action: 'vitrine-item', id: 'veu-noiva' });
  click({ action: 'vitrine-item', id: 'veu-noiva' });
  const list = node('#avisos').children;
  assert.equal(list.length, before + 1);
  assert.match(list.at(-1).textContent, /só vem de presente de casamento\. \(×2\)$/);
});

test('Ajustes tem "Abrir com o Windows", desligado de fábrica', async () => {
  const { document, calls } = boot();
  await Promise.resolve();
  const node = id => document.nodes.get(id);
  const click = dataset => document.listeners.click({ target: { closest: () => ({ tagName: 'BUTTON', dataset, disabled: false }) } });
  click({ action: 'abrir' });
  click({ action: 'tab', tab: 'ajustes' });
  const html = node('#painel-corpo').innerHTML;
  assert.match(html, /Abrir com o Windows/);
  for (const size of [25, 50, 75, 100, 150, 200, 300]) assert.match(html, new RegExp(`>${size}%<`), `tamanho ${size}% nos Ajustes`);
  assert.match(html, /class="chip ativa" data-action="inicio" data-value="off"/, 'começa desligado');
  click({ action: 'inicio', value: 'on' });
  assert.deepEqual(JSON.parse(JSON.stringify(calls.filter(c => c[0] === 'settings').at(-1)[1])), { startup: true });
});

test('abrir o jogo não mostra janela de novidades (nem para quem já jogava)', async () => {
  const { GameEngine } = core;
  const old = new GameEngine(data, null, {}).exportState();
  const { document } = boot({}, { loadGame: () => old, saveGame: () => true });
  await Promise.resolve();
  assert.doesNotMatch(document.nodes.get('#janela-corpo')?.innerHTML || '', /Novidades na festa!|novidades/);
});

test('autocura: o cursor passeia em cima do jogo, a janela diz que aceita o clique, mas o mouse não chega: pede janela nova', async () => {
  let clock = 1000;
  const { calls, run, document } = boot({ performance: { now: () => clock } }, { repair: () => calls.push(['repair']) });
  await Promise.resolve();
  document.elementFromPoint = () => ({ closest: selector => selector === '.ui' ? {} : null });
  // Movimento de verdade chegando: tudo certo, nada de conserto.
  for (let i = 0; i < 40; i++) {
    clock += 120;
    document.listeners?.mousemove?.({ clientX: 10 + i, clientY: 10 });
    run({ cursor: { x: 10 + i, y: 10, interactive: true } });
  }
  assert.ok(!calls.some(call => call[0] === 'repair'));
  // Só o vigia fala (o mouse de verdade sumiu): depois de 3 s, uma janela nova; e não pede de novo logo em seguida.
  for (let i = 0; i < 60; i++) { clock += 120; run({ cursor: { x: 60 + i, y: 10, interactive: true } }); }
  assert.equal(calls.filter(call => call[0] === 'repair').length, 1);
  assert.ok(calls.some(call => call[0] === 'save'), 'salva antes de trocar a janela');
  // Cursor fora do jogo (clique vazando de propósito): não é defeito.
  calls.length = 0;
  clock += 200000;
  document.elementFromPoint = () => null;
  for (let i = 0; i < 60; i++) { clock += 120; run({ cursor: { x: 900 + i, y: 900, interactive: false } }); }
  assert.ok(!calls.some(call => call[0] === 'repair'));
});

test('voltar o foco recupera um arrasto que parou de receber eventos sem cancelar um arrasto saudável', async () => {
  for (const nativeMoves of [false, true]) {
    let clock = 1000;
    let game;
    const { calls, run, document } = boot({ performance: { now: () => clock }, __gravador: api => { game = api; } },
      { repair: () => calls.push(['repair']) });
    await Promise.resolve();
    const canvas = { closest: selector => selector === '#festa-canvas' ? {} : null, matches: () => false };
    document.elementFromPoint = () => canvas;
    run({ foco: false });
    run({ cursor: { x: 50, y: 50, interactive: false } });
    document.listeners.pointerdown({ target: canvas, clientX: 50, clientY: 50, button: 0, preventDefault() {} });
    assert.equal(document.body.classList.contains('jogo-desfocado'), false);
    assert.equal(game.ui.drag.kind, 'festa');
    for (let i = 0; i < 60; i++) {
      clock += 120;
      if (nativeMoves) document.listeners.pointermove({ clientX: 60 + i, clientY: 50, buttons: 1 });
      run({ cursor: { x: 60 + i, y: 50, interactive: true } });
    }
    assert.equal(calls.filter(call => call[0] === 'repair').length, nativeMoves ? 0 : 1);
    if (nativeMoves) assert.equal(game.ui.drag.kind, 'festa');
    else {
      assert.equal(game.ui.drag, null, 'o arrasto perdido não bloqueia os próximos cliques');
      assert.ok(calls.some(call => call[0] === 'save'), 'salva antes de pedir a recuperação');
    }
  }
});

test('reenvios do cursor parado depois de mudar o foco não indicam falha do mouse', async () => {
  let clock = 1000;
  const { calls, run, document } = boot({ performance: { now: () => clock } }, { repair: () => calls.push(['repair']) });
  await Promise.resolve();
  document.elementFromPoint = () => ({ closest: selector => selector === '.ui' ? {} : null });
  run({ foco: false });
  for (let i = 0; i < 60; i++) { clock += 120; run({ cursor: { x: 50, y: 50, interactive: true } }); }
  assert.equal(calls.filter(call => call[0] === 'repair').length, 0);
});

test('arrasto que perdeu o soltar do botão (Alt+Tab, repouso) não prende a janela: o clique volta a seguir o cursor', async () => {
  const { calls, run, document } = boot();
  await Promise.resolve();
  // Um pedaço da festa (o DOM falso não sabe de `closest`): o clique começa um arrasto da festa.
  const canvas = { closest: selector => (selector === '#festa-canvas' ? {} : null), matches: () => false };
  document.elementFromPoint = () => canvas;
  document.listeners.pointerdown({ target: canvas, clientX: 50, clientY: 50, button: 0, preventDefault() {} });
  // Arrastando: a posição do cursor não mexe no clique (o soltar precisa chegar aqui).
  calls.length = 0;
  document.elementFromPoint = () => null;
  run({ cursor: { x: 800, y: 800, interactive: true } });
  assert.equal(calls.filter(call => call[0] === 'interactive').length, 0, 'o arrasto começou');
  // Perdeu o foco no meio do arrasto (o pointerup nunca chega).
  run({ foco: false });
  calls.length = 0;
  document.elementFromPoint = () => null;
  run({ cursor: { x: 900, y: 900, interactive: true } });
  assert.deepEqual(calls.filter(call => call[0] === 'interactive'), [['interactive', false]], 'a janela volta a vazar o clique');
  // O mesmo com o mouse andando sem botão apertado.
  document.elementFromPoint = () => canvas;
  document.listeners.pointerdown({ target: canvas, clientX: 50, clientY: 50, button: 0, preventDefault() {} });
  document.listeners.pointermove({ clientX: 200, clientY: 50, buttons: 0 });
  calls.length = 0;
  document.elementFromPoint = () => null;
  run({ cursor: { x: 901, y: 900, interactive: true } });
  assert.deepEqual(calls.filter(call => call[0] === 'interactive'), [['interactive', false]]);
});

test('arrastar a alça do zoom mostra a moldura do tamanho pedido, que acompanha o mouse; soltar some com ela', async () => {
  const { document } = boot();
  await Promise.resolve();
  const guide = document.querySelector('#zoom-guia');
  guide.hidden = true;
  const handle = { closest: selector => (selector === '[data-action="zoom-alca"]' ? {} : null), matches: () => false };
  document.listeners.pointerdown({ target: handle, clientX: 100, clientY: 100, button: 0, preventDefault() {} });
  document.listeners.pointermove({ clientX: 140, clientY: 100, buttons: 1 });
  assert.equal(guide.hidden, false, 'a moldura aparece enquanto arrasta');
  const first = parseFloat(guide.style.width);
  document.listeners.pointermove({ clientX: 170, clientY: 100, buttons: 1 });
  assert.ok(parseFloat(guide.style.width) > first, 'arrastar para a direita aumenta a moldura, mesmo antes do pulo da festa');
  document.listeners.pointerup({});
  assert.equal(guide.hidden, true, 'soltou: a moldura some');
});

test('segurar o botão "+1 ficha" compra várias fichas seguidas; soltar para e avisa quantas', async () => {
  // Relógios falsos: o que foi cancelado não roda mais.
  const timeouts = [];
  const intervals = new Map();
  let game = null;
  const { document } = boot({
    setTimeout: fn => { timeouts.push(fn); return timeouts.length; },
    setInterval: fn => { const id = 100 + intervals.size; intervals.set(id, fn); return id; },
    clearInterval: id => intervals.delete(id), clearTimeout() {},
    __gravador: api => { game = api; }
  });
  await Promise.resolve();
  const engine = game.engine();
  engine.state.cheer = 1e9;
  const before = engine.state.tickets;
  const button = { dataset: { hold: 'ficha' }, disabled: false, querySelector: () => null };
  button.closest = selector => (selector === '[data-hold]' ? button : null);
  document.listeners.pointerdown({ target: button, clientX: 10, clientY: 10, button: 0, preventDefault() {} });
  assert.equal(engine.state.tickets, before + 1, 'a primeira sai na hora');
  // Continuou segurando: depois da pausa, uma a cada tique.
  timeouts.at(-1)();
  const id = [...intervals.keys()].at(-1);
  const tick = () => intervals.get(id)?.();
  tick(); tick(); tick();
  assert.equal(engine.state.tickets, before + 4);
  document.listeners.pointerup({});
  tick();
  assert.equal(engine.state.tickets, before + 4, 'soltou: para de comprar');
  const toasts = [...document.querySelector('#avisos').children].map(child => child.textContent);
  assert.ok(toasts.some(text => /\+4 fichas/.test(text)), toasts.join(' | '));
});

test('Enter numa melhoria compra um único nível, sem iniciar compra contínua', async () => {
  let game;
  const { document } = boot({ __gravador: api => { game = api; } });
  await Promise.resolve();
  const engine = game.engine();
  engine.state.cheer = 1e6;
  const before = engine.level('rebolado');
  const cost = engine.levelCost('rebolado');
  const button = { tagName: 'BUTTON', disabled: false,
    dataset: { action: 'melhorar', hold: 'melhorar', stat: 'rebolado' } };
  document.listeners.click({ detail: 0, target: { closest: () => button } });
  assert.equal(engine.level('rebolado'), before + 1);
  assert.equal(engine.state.cheer, 1e6 - cost);
  assert.equal(game.ui.hold, null);
});

test('botões secundários do mouse não compram fichas, lançam argolas ou arrastam a festa', async () => {
  let game;
  let throws = 0;
  const { document } = boot({ __gravador: api => { game = api; } });
  await Promise.resolve();
  game.engine().state.cheer = 1e6;
  game.ui.game = { throwRing() { throws++; return true; } };
  const tickets = game.engine().state.tickets;
  const buy = { dataset: { hold: 'ficha' }, disabled: false, querySelector: () => null };
  buy.closest = selector => selector === '[data-hold]' ? buy : null;
  const rings = { closest: selector => selector === '#argolas-canvas' ? rings : null };
  const canvas = { closest: selector => selector === '#festa-canvas' ? canvas : null };
  for (const button of [1, 2]) {
    for (const target of [buy, rings, canvas]) {
      document.elementFromPoint = () => target;
      document.listeners.pointerdown({ target, button, clientX: 50, clientY: 50, preventDefault() {} });
      assert.equal(game.ui.hold, null);
      assert.equal(game.ui.drag, null);
    }
  }
  assert.equal(game.engine().state.tickets, tickets);
  assert.equal(throws, 0);
});

test('Espaço respeita campos e botões mesmo com uma rodada de Argolas aberta', async () => {
  let game;
  let throws = 0;
  const { document } = boot({ __gravador: api => { game = api; } });
  await Promise.resolve();
  game.ui.rings = { open: true, playing: true, result: null };
  game.ui.game = { throwRing() { throws++; return true; } };
  for (const selector of ['input', 'select', 'textarea', 'button', 'a']) {
    let prevented = false;
    const target = { closest: query => query.split(',').map(s => s.trim()).includes(selector) ? target : null };
    document.listeners.keydown({ key: ' ', target, preventDefault() { prevented = true; } });
    assert.equal(prevented, false, selector);
    assert.equal(throws, 0, selector);
  }
  const editable = { isContentEditable: true, closest: () => null };
  document.listeners.keydown({ key: ' ', target: editable, preventDefault() { assert.fail('deve permitir digitar'); } });
  let prevented = false;
  document.listeners.keydown({ key: ' ', target: document.body, preventDefault() { prevented = true; } });
  assert.equal(prevented, true, 'fora dos controles, o atalho continua funcionando');
  assert.equal(throws, 1);
});

test('soltar o esquerdo durante uma compra para mesmo com o direito ainda apertado', async () => {
  for (const moved of [true, false]) {
    let game;
    const timeouts = [];
    const intervals = new Map();
    let nextInterval = 1;
    const { document } = boot({
      __gravador: api => { game = api; },
      setTimeout: fn => { timeouts.push(fn); return timeouts.length; }, clearTimeout() {},
      setInterval: fn => { const id = nextInterval++; intervals.set(id, fn); return id; },
      clearInterval: id => intervals.delete(id)
    });
    await Promise.resolve();
    const engine = game.engine();
    engine.state.cheer = 1e6;
    const button = { dataset: { hold: 'ficha' }, disabled: false, querySelector: () => null };
    button.closest = selector => selector === '[data-hold]' ? button : null;
    document.listeners.pointerdown({ target: button, button: 0, clientX: 10, clientY: 10, preventDefault() {} });
    timeouts.at(-1)();
    const holdTimer = [...intervals.keys()].at(-1);
    const tickets = engine.state.tickets;
    if (moved) {
      // Com os dois botões apertados, soltar o primeiro é pointermove; o último é pointerup.
      document.listeners.pointermove({ button: 0, buttons: 2, clientX: 10, clientY: 10 });
      assert.equal(game.ui.hold, null, 'a compra termina quando o esquerdo é solto');
    }
    document.listeners.pointerup({ button: 2, buttons: 0 });
    assert.equal(game.ui.hold, null, 'soltar todos os botões também cancela se o movimento se perdeu');
    intervals.get(holdTimer)?.();
    assert.equal(engine.state.tickets, tickets, 'nenhuma compra fica rodando depois de soltar');
  }
});

test('preferências de desempenho, clarões e letreiros voltam ao abrir no navegador', () => {
  const applied = [];
  const festa = fakeFesta({ setRate: value => applied.push(['rate', value]),
    setFlash: value => applied.push(['flash', value]), setCalm: value => applied.push(['calm', value]) });
  boot({ arraiaDesktop: null, navigator: { language: 'pt-BR' },
    localStorage: { getItem: key => key === 'arraia-ajustes-v1'
      ? JSON.stringify({ perf: 'economia', flash: false, calm: true }) : null },
    ArraiaFesta: { create: () => festa }, FESTA_SPRITES: {} });
  assert.deepEqual(applied, [['rate', 20], ['flash', false], ['calm', true]]);
});

test('preferências corrompidas no navegador não interrompem o jogo nem deixam posições inválidas', () => {
  for (const raw of [
    { zoom: 'corrompido', x: 'corrompido', lift: null, volume: 7, placa: { dx: 'corrompido', dy: 7 } },
    { zoom: { valueOf: null, toString: null }, placa: [], perf: 'desconhecido' }
  ]) {
    let game;
    let scale;
    const festa = fakeFesta({ setScale: value => { scale = value; } });
    const { document } = boot({ arraiaDesktop: null, navigator: { language: 'pt-BR' },
      localStorage: { getItem: key => key === 'arraia-ajustes-v1' ? JSON.stringify(raw) : null },
      ArraiaFesta: { create: () => festa }, FESTA_SPRITES: {}, __gravador: api => { game = api; } });
    assert.equal(game.ui.settings.zoom, 1);
    assert.equal(game.ui.settings.x, 0.72);
    assert.equal(game.ui.settings.lift, 0);
    assert.equal(game.ui.settings.placa, null);
    assert.ok(game.ui.settings.volume >= 0 && game.ui.settings.volume <= 1);
    assert.equal(game.ui.settings.perf, 'suave');
    assert.equal(scale, 3);
    const placa = document.nodes.get('#placa');
    assert.doesNotMatch(JSON.stringify(placa.style), /NaN|Infinity/);
  }
});

test('o primeiro quadro depois do repouso não cobra de novo o tempo já recuperado', async () => {
  let game;
  let elapsed = 1000;
  let wall = Date.now();
  const frames = [];
  boot({ performance: { now: () => elapsed }, requestAnimationFrame: fn => frames.push(fn),
    __gravador: api => { game = api; } });
  await Promise.resolve();
  const engine = game.engine();
  engine.clock = () => wall;
  elapsed += 250; wall += 250;
  frames.shift()(elapsed);
  const saved = engine.exportState();
  elapsed += 3 * 3600000; wall += 3 * 3600000;
  const reopened = new core.GameEngine(data, saved, { now: () => wall, rng: () => 0.5 });
  frames.shift()(elapsed);
  assert.equal(engine.state.stats.playtime, saved.stats.playtime, 'tempo fora não vira tempo ativo');
  assert.equal(engine.state.stats.steps, saved.stats.steps, 'não acrescenta passos ao ganho offline');
  assert.ok(Math.abs(engine.state.cheer - reopened.state.cheer) < 1e-9);
});

test('timestamps de quadro anteriores ao último tique não fazem o tempo de jogo andar duas vezes', async () => {
  let game;
  let elapsed = 1000;
  const frames = [];
  const intervals = [];
  boot({ performance: { now: () => elapsed }, requestAnimationFrame: fn => frames.push(fn),
    setInterval: fn => { intervals.push(fn); return intervals.length; }, __gravador: api => { game = api; } });
  await Promise.resolve();
  elapsed = 1100;
  intervals[0]();
  frames.shift()(1050); // rAF já tinha esse timestamp quando o tique do intervalo rodou.
  elapsed = 1200;
  frames.shift()(elapsed);
  assert.ok(Math.abs(game.engine().state.stats.playtime - 0.2) < 1e-9);
});

test('reiniciar cancela compras e descarta prévia, foto e efeitos da festa anterior', async () => {
  let game;
  let resets = 0;
  const timeouts = [];
  const intervals = new Map();
  let nextInterval = 1;
  const festa = fakeFesta({ reset() { resets++; } });
  const { document } = boot({ ArraiaFesta: { create: () => festa }, FESTA_SPRITES: {},
    __gravador: api => { game = api; },
    setTimeout: fn => { timeouts.push(fn); return timeouts.length; }, clearTimeout() {},
    setInterval: fn => { const id = nextInterval++; intervals.set(id, fn); return id; },
    clearInterval: id => intervals.delete(id) });
  await Promise.resolve();
  game.engine().state.cheer = 1e6;
  const button = { dataset: { hold: 'ficha' }, disabled: false, querySelector: () => null };
  button.closest = selector => selector === '[data-hold]' ? button : null;
  document.listeners.pointerdown({ target: button, button: 0, clientX: 10, clientY: 10, preventDefault() {} });
  timeouts.at(-1)();
  const holdTimer = [...intervals.keys()].at(-1);
  game.ui.preview = { mao: 'espiga' };
  game.ui.lastPhoto = 'foto-da-festa-antiga';
  const old = game.engine();
  document.listeners.click({ detail: 0, target: { closest: () => ({ tagName: 'BUTTON', disabled: false,
    dataset: { action: 'reiniciar' } }) } });
  const fresh = game.engine();
  assert.notEqual(fresh, old);
  fresh.state.cheer = 1e6;
  const tickets = fresh.state.tickets;
  intervals.get(holdTimer)?.();
  assert.equal(fresh.state.tickets, tickets, 'a compra antiga não gasta o saldo da nova festa');
  assert.equal(game.ui.hold, null);
  assert.equal(game.ui.preview, null);
  assert.equal(game.ui.lastPhoto, null);
  assert.equal(resets, 1);
});

test('a linha da felicidade abre a aba Comidas, e as barrinhas e o ×Rebolado se atualizam ao vivo', async () => {
  const { document } = boot();
  await Promise.resolve();
  const node = id => document.nodes.get(id);
  // Nós com data-humor, como os que a placa e a aba Comidas desenham.
  const humor = ['amor', 'barriga', 'fator', 'fator-loja', 'linha'].map(key => ({ dataset: { humor: key }, style: {}, textContent: '', title: '',
    classList: { toggle() {}, contains: () => false } }));
  const all = document.querySelectorAll;
  document.querySelectorAll = selector => (selector === '[data-humor]' ? humor : all.call(document, selector));
  const click = dataset => document.listeners.click({ target: { closest: () => ({ tagName: 'BUTTON', dataset, disabled: false }) } });
  click({ action: 'comidas' });
  assert.equal(node('#vitrine').hidden, false);
  assert.match(node('#vitrine').innerHTML, /data-action="vitrine-comida"/);
  const text = key => humor.find(entry => entry.dataset.humor === key);
  assert.equal(text('amor').style.width, '50%');
  assert.equal(text('fator').textContent, '×1');
  assert.equal(text('fator-loja').textContent, 'Rebolado ×1');
  assert.match(text('linha').title, /Amor 50% .* Barriga 50%/);
  click({ action: 'comidas' });
  assert.equal(node('#vitrine').hidden, true, 'clicar de novo fecha');
});

test('digitar "banana" na aba Histórico liga o botão de teste só nesta sessão (ao reabrir o jogo ele some)', async () => {
  const { document, calls } = boot();
  await Promise.resolve();
  const node = id => document.nodes.get(id);
  const click = dataset => document.listeners.click({ target: { closest: () => ({ tagName: 'BUTTON', dataset, disabled: false }) } });
  const digitar = texto => { for (const key of texto) document.listeners.keydown({ key, target: { closest: () => null }, preventDefault() {} }); };
  assert.doesNotMatch(node('#placa').innerHTML, /data-tela="teste"/, 'de fábrica o botão fica escondido');
  // Fora do Histórico (painel fechado ou em outra aba) o código não faz nada.
  digitar('banana');
  click({ action: 'tab', tab: 'ajustes' });
  digitar('banana');
  assert.doesNotMatch(node('#placa').innerHTML, /data-tela="teste"/);
  // No Histórico, digitar errado no meio zera o código; certo liga.
  click({ action: 'tab', tab: 'historico' });
  digitar('banxana');
  assert.doesNotMatch(node('#placa').innerHTML, /data-tela="teste"/);
  digitar('banana');
  assert.match(node('#placa').innerHTML, /data-tela="teste"/, 'o botão de teste aparece na placa');
  // O botão abre a tela de teste, e nada disso vai para o save: um jogo novo não tem o botão.
  click({ action: 'tela', tela: 'teste' });
  assert.equal(node('#tela').hidden, false);
  assert.ok(!JSON.stringify(calls).includes('banana'));
  const reaberto = boot();
  await Promise.resolve();
  assert.doesNotMatch(reaberto.document.nodes.get('#placa').innerHTML, /data-tela="teste"/, 'reabrindo o jogo o botão some');
  // Digitar de novo desliga (e fecha a tela de teste).
  digitar('banana');
  assert.doesNotMatch(node('#placa').innerHTML, /data-tela="teste"/);
  assert.equal(node('#tela').hidden, true);
});

test('a casa da Mandioca aparece no convidado 100, tem botão na placa, arrasta e dá para esconder e mostrar', async () => {
  const { GameEngine } = core;
  const bundle = require('../src/festa-sprites.js') && globalThis.FESTA_SPRITES;
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  require('../src/casa.js');
  const young = new GameEngine(data, null, {}).exportState();
  const before = boot({ ArraiaCasa: globalThis.ArraiaCasa, FESTA_SPRITES: bundle }, { loadGame: () => young });
  await Promise.resolve();
  assert.equal(before.document.nodes.get('#casa').hidden, true, 'sem a casa antes do convidado 100');
  assert.doesNotMatch(before.document.nodes.get('#placa').innerHTML, /data-action="casa"/);

  const old = new GameEngine(data, null, {}).exportState();
  old.size = 102;
  old.records.size = 102;
  const { document, calls } = boot({ ArraiaCasa: globalThis.ArraiaCasa, FESTA_SPRITES: bundle }, { loadGame: () => old });
  await Promise.resolve();
  const node = id => document.nodes.get(id);
  assert.equal(node('#casa').hidden, false, 'a casa aparece');
  assert.match(node('#casa-contagem').textContent, /2 moradores/);
  assert.match(node('#placa').innerHTML, /data-action="casa"/, 'botão da casa na placa');
  assert.ok(node('#casa').style.left !== undefined && node('#casa').style.bottom !== undefined, 'a casa foi posta na tela');

  // Arrastar pelo fundo leva só a casa e guarda a posição (em relação à festa) nos ajustes.
  const target = { matches: () => false, closest: selector => (selector === '#casa' ? node('#casa') : null) };
  document.listeners.pointerdown({ button: 0, clientX: 100, clientY: 100, target, preventDefault() {} });
  document.listeners.pointermove({ clientX: 160, clientY: 70, buttons: 1 });
  document.listeners.pointerup({ button: 0, clientX: 160, clientY: 70 });
  const saved = calls.filter(entry => entry[0] === 'settings').at(-1);
  assert.ok(saved?.[1].casa && Number.isFinite(saved[1].casa.dx) && Number.isFinite(saved[1].casa.dy), 'posição da casa salva');

  // Esconder (pelo X) e mostrar (pelo botão da placa).
  const click = dataset => document.listeners.click({ target: { closest: () => ({ tagName: 'BUTTON', dataset, disabled: false }) } });
  click({ action: 'casa-fechar' });
  await Promise.resolve();
  assert.equal(node('#casa').hidden, true);
  click({ action: 'casa' });
  await Promise.resolve();
  assert.equal(node('#casa').hidden, false);
});

test('digitar "yeye" com o jogo em foco chama o Rafael; sem foco, em campo de texto ou com a sequência quebrada, não', async () => {
  const { document, run } = boot();
  await Promise.resolve();
  const toasts = () => document.nodes.get('#avisos').children.map(item => item.textContent).join('|');
  const digitar = (texto, extra = {}) => {
    for (const key of texto) document.listeners.keydown({ key, target: { closest: () => null }, preventDefault() {}, ...extra });
  };
  assert.doesNotMatch(toasts(), /Rafael/);
  digitar('yey');
  digitar('x');
  digitar('ye');
  assert.doesNotMatch(toasts(), /Rafael/, 'a sequência quebrada zera');
  // Com Ctrl, num campo de texto ou sem foco (outra janela na frente) não vale.
  digitar('yeye', { ctrlKey: true });
  for (const key of 'yeye') document.listeners.keydown({ key, target: { closest: () => ({}) }, preventDefault() {} });
  run({ foco: false });
  digitar('yeye');
  assert.doesNotMatch(toasts(), /Rafael/, 'sem foco o segredo não vale');
  run({ foco: true });
  // Maiúsculas valem; com o jogo em foco o Rafael chega e o aviso diz.
  digitar('YeYe');
  assert.match(toasts(), /Rafael chegou à festa/);
  // Digitar de novo não repete o aviso (ele só grita na festa).
  const before = toasts();
  digitar('yeye');
  assert.equal(toasts(), before);
});
