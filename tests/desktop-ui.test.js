const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const data = require('../src/data.js');
const core = require('../src/core.js');
const UI = require('../src/ui.js');
const { fakeDocument } = require('./fake-dom');
const { fakeAudio } = require('./fake-audio');

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
    focusGame: request => calls.push(['focus-game', request]),
    quit: () => calls.push(['quit']),
    onCommand: callback => { command = callback; },
    ...desktopExtra
  };
  // Os snapshots reais levam a revisão do main; os mocks sem revisão recebem a da chamada, não a da resposta.
  let fixtureRevision = 0;
  for (const name of ['getSettings', 'updateSettings']) {
    const invoke = desktop[name];
    desktop[name] = (...args) => {
      const revision = name === 'updateSettings' ? ++fixtureRevision : fixtureRevision;
      const result = invoke(...args);
      return { then: (callback, rejected) => Promise.resolve(result).then(value =>
        callback(value && { revision, ...value }), rejected) };
    };
  }
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

for (const surface of ['festa', 'placa', 'vitrine', 'casa', 'painel', 'tela', 'argolas']) {
  test(`recuar da borda retoma imediatamente o arrasto de ${surface}`, async () => {
    for (const axis of surface === 'vitrine' ? ['x'] : ['x', 'y']) for (const direction of [-1, 1]) {
      let game;
      const saved = new core.GameEngine(data, null).exportState();
      saved.size = saved.records.size = 100;
      const { document } = boot({ FESTA_SPRITES: { casa: {} }, __gravador: api => { game = api; },
        ArraiaFesta: { create: () => fakeFesta({ hit: () => 'terreiro' }) },
        ArraiaCasa: { create: () => ({ setScale() {}, size: () => ({ width: 220, height: 50 }),
          draw() {}, onEvents() {}, reset() {}, hit: () => null }) }
      }, { loadGame: () => saved });
      await Promise.resolve();
      const click = dataset => document.listeners.click({ detail: 0,
        target: { closest: () => ({ tagName: 'BUTTON', dataset }) } });
      click({ action: 'fechar-janela' });
      if (surface === 'painel') click({ action: 'abrir' });
      if (surface === 'tela') click({ action: 'tela', tela: 'correio' });
      if (surface === 'vitrine' || surface === 'argolas') click({ action: surface });
      const element = document.nodes.get('#' + surface);
      const top = ['painel', 'tela', 'argolas'].includes(surface);
      const target = {
        dataset: top ? { arrastar: surface === 'painel' ? 'painel' : surface } : {}, parentElement: element,
        matches: () => false,
        closest(selector) {
          if (selector === '.ui' && surface !== 'festa') return element;
          if (selector === '#festa-canvas' && surface === 'festa') return this;
          if (selector === '#' + surface && !top) return element;
          if (selector === '[data-arrastar]' && top) return this;
          return null;
        }
      };
      document.elementFromPoint = () => target;
      const position = () => parseFloat(element.style[axis === 'x' ? 'left' : top ? 'top' : 'bottom']);
      document.listeners.pointerdown({ target, button: 0, clientX: 100, clientY: 100, preventDefault() {} });
      assert.equal(game.ui.drag?.kind, top ? 'janela' : surface, surface + ': started');
      const delta = direction * 4000;
      const moved = amount => document.listeners.pointermove({ buttons: 1,
        clientX: 100 + (axis === 'x' ? amount : 0), clientY: 100 + (axis === 'y' ? top ? amount : -amount : 0) });
      moved(delta);
      const edge = position();
      assert.ok(Number.isFinite(edge), surface + ': measurable position');
      moved(delta - direction * 10);
      assert.equal(position(), edge - direction * 10, `${surface}/${axis}/${direction}: reversing by 10 moves by 10`);
      moved(delta - direction * 20);
      assert.equal(position(), edge - direction * 20, `${surface}/${axis}/${direction}: the next move also follows the pointer`);
      for (let i = 1; i <= 20; i++) moved(delta - direction * (20 + i / 10));
      assert.equal(position(), edge - direction * 22, 'small fractional movements accumulate instead of being lost to rounding');
      document.listeners.pointerup({ target, button: 0, buttons: 0 });
      assert.equal(game.ui.drag, null);
      assert.equal(position(), edge - direction * 22, 'release retains the final position');
    }
  });
}

test('o rendimento aberto mantém frações e acompanha humor e bônus vencidos sem refazer o painel', async () => {
  const frames = [];
  let clock = 1000;
  let wall = Date.now();
  let game;
  const { document, run } = boot({
    performance: { now: () => clock }, requestAnimationFrame: fn => frames.push(fn),
    __gravador: api => { game = api; }
  });
  await Promise.resolve();
  const engine = game.engine();
  engine.now = () => wall;
  engine.state.humor = { amor: 0, barriga: 0, at: wall, holdUntil: 0 };
  engine.state.minis.horta.buffs = { amendoim: wall + 1000, 'batata-doce': wall + 1000 };
  run('painel');
  const panel = document.nodes.get('#painel-corpo');
  assert.match(panel.innerHTML, /data-production="step">0,51<\/b>/, 'o Rebolado abaixo de um não vira zero');
  assert.match(panel.innerHTML, /data-production="rate">0,3<\/b>/, 'a média inicial conserva sua fração');
  const html = panel.innerHTML;
  document.activeElement = { tagName: 'INPUT', matches: () => true };
  panel.contains = element => element === document.activeElement;
  const nodes = ['step', 'speed', 'rest', 'rate'].map(key => ({ dataset: { production: key }, textContent: '' }));
  document.querySelectorAll = selector => selector === '[data-production]' ? nodes : [];
  const value = key => nodes.find(node => node.dataset.production === key).textContent;
  clock += 500; wall += 500;
  frames.shift()(clock);
  assert.equal(value('speed'), '1,15');
  assert.equal(value('rest'), '6,7 s');
  clock += 600; wall += 600;
  frames.shift()(clock);
  assert.equal(value('speed'), '1', 'a velocidade volta ao normal ao vencer a colheita');
  assert.equal(value('rest'), '10 s');
  assert.equal(value('rate'), '0,23');
  engine.state.humor = { amor: 100, barriga: 100, at: wall, holdUntil: 0 };
  clock += 500; wall += 500;
  frames.shift()(clock);
  assert.equal(value('step'), '1,27', 'o carinho e a comida mudam o valor mostrado');
  assert.equal(value('rate'), '0,57');
  assert.equal(panel.innerHTML, html, 'a atualização mantém o campo ativo no lugar');
});

test('o aviso de volta do rolê conserva o viajante ao resgatar e reutilizar o destino antes do quadro', async () => {
  for (const resend of [false, true]) {
    let game;
    let wall = Date.now();
    const frames = [];
    const { document } = boot({ requestAnimationFrame: fn => frames.push(fn),
      __gravador: api => { game = api; } });
    await Promise.resolve();
    const engine = game.engine();
    engine.now = () => wall;
    engine.rng = () => 0.26;
    const click = dataset => document.listeners.click({ detail: 0,
      target: { closest: () => ({ tagName: 'BUTTON', dataset }) } });
    click({ action: 'fechar-janela' });
    while (engine.state.size < 25) engine.addFame(engine.fameNeed() - engine.state.fame);
    assert.equal(engine.fish().char.id, 'milho');
    wall = engine.state.fishing.nextAt;
    assert.equal(engine.fish().char.id, 'cenoura');
    assert.equal(engine.startOuting(0, 'milho'), true);
    engine.drainEvents();
    wall = engine.state.outings[0].endsAt - 1;
    engine.tick(0.01);
    engine.drainEvents();
    wall++;
    // Um prêmio com convidado novo atualiza os temporizadores dentro da ação, antes do próximo frame.
    engine.earn(engine.fameNeed() - engine.state.fame);
    assert.ok(engine.events.some(event => event.type === 'outing-done'));
    click({ action: 'role-resgatar', index: '0' });
    assert.equal(engine.state.outings[0].char, null);
    if (resend) {
      document.nodes.set('select[data-role="0"]', { value: 'cenoura' });
      click({ action: 'role-enviar', index: '0' });
      assert.equal(engine.state.outings[0].char, 'cenoura');
      assert.equal(engine.outingState(0), 'fora');
    }
    frames.shift()(1000);
    const messages = document.querySelector('#avisos').children.map(node => node.textContent)
      .filter(text => text.includes('voltou do rolê'));
    assert.deepEqual(messages, ['Milho voltou do rolê.'], `${resend}: o aviso descreve a viagem concluída`);
  }
});

test('as barras de rolê e cozinha avançam ao vivo sem trocar os controles da tela aberta', async () => {
  const frames = [];
  let elapsed = 1000;
  let wall = Date.now();
  class LiveDate extends Date { static now() { return wall; } }
  let game;
  const { document } = boot({ Date: LiveDate, performance: { now: () => elapsed },
    requestAnimationFrame: fn => frames.push(fn), __gravador: api => { game = api; } });
  await Promise.resolve();
  const engine = game.engine();
  engine.now = () => wall;
  engine.state.size = 30;
  engine.state.crew = { cenoura: { level: 1 }, canjica: { level: 1 } };
  engine.addItem('carroca');
  engine.equip('carroca', 'direita');
  engine.startOuting(0, 'cenoura');
  engine.addItem('fogao-lenha');
  engine.equip('fogao-lenha', 'direita');
  engine.state.wood = 100;
  engine.cook('pamonha');
  const open = id => document.listeners.click({ target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'tela', tela: id } }) } });
  const body = document.nodes.get('#tela-corpo');
  const progressNodes = [];
  for (const id of ['roles', 'cozinha']) {
    open(id);
    const match = body.innerHTML.match(/<i data-progress-start="([^"]+)" data-progress-end="([^"]+)" style="width:([^%]+)%"/);
    assert.ok(match, `${id}: a barra usa os prazos da atividade`);
    progressNodes.push({ dataset: { progressStart: match[1], progressEnd: match[2] }, style: { width: `${match[3]}%` } });
  }
  const html = body.innerHTML;
  document.activeElement = { tagName: 'SELECT', matches: () => true };
  body.contains = element => element === document.activeElement;
  document.querySelectorAll = selector => selector === '[data-progress-start][data-progress-end]' ? progressNodes : [];
  const start = wall;
  for (let i = 0; i < 2; i++) {
    elapsed += 500;
    wall += 500;
    frames.shift()(elapsed);
    for (const node of progressNodes) {
      const duration = Number(node.dataset.progressEnd) - Number(node.dataset.progressStart);
      assert.ok(Math.abs(parseFloat(node.style.width) - 100 * (wall - start) / duration) < 1e-9);
    }
  }
  assert.equal(body.innerHTML, html, 'o progresso não refaz o HTML enquanto um campo segura o redesenho');
});

test('trocar um enfeite atualiza cozinha, postos e tempos de rolê sem fechar a tela aberta', async () => {
  for (const screen of ['cozinha', 'turma', 'roles']) {
    const frames = [];
    let game;
    const { document } = boot({ requestAnimationFrame: fn => frames.push(fn),
      __gravador: api => { game = api; } });
    await Promise.resolve();
    const engine = game.engine();
    engine.state.size = engine.state.records.size = 30;
    engine.state.crew.cachorro = { level: 1 };
    for (const id of ['fogao-lenha', 'barraca-pescaria', 'carroca']) engine.addItem(id);
    if (screen === 'cozinha') engine.equip('fogao-lenha', 'direita');
    engine.updateTimers(engine.now());
    engine.drainEvents();
    const click = dataset => document.listeners.click({ detail: 0,
      target: { closest: () => ({ tagName: 'BUTTON', dataset }) } });
    click({ action: 'tela', tela: screen });
    const body = document.nodes.get('#tela-corpo');
    const previous = body.innerHTML;
    click({ action: 'vitrine-lado', side: 'direita' });
    click({ action: 'vitrine-item', id: { cozinha: 'mastro', turma: 'barraca-pescaria', roles: 'carroca' }[screen] });
    frames.shift()(1250);
    assert.notEqual(body.innerHTML, previous, `${screen}: equipar um item já possuído atualiza a tela`);
    if (screen === 'cozinha') assert.match(body.innerHTML, /Coloque o Fogão a Lenha/);
    else if (screen === 'turma') {
      const post = engine.data.posts[engine.chars.cachorro.post].name;
      assert.ok(body.innerHTML.includes(`Trabalhando: ${post}`), 'o posto aberto deixa de pedir uma barraca que já está equipada');
    } else assert.ok(body.innerHTML.includes(UI.duration(engine.outingTime(0))), 'a próxima viagem já mostra a redução da carroça');
    assert.equal(document.nodes.get('#tela').hidden, false, 'o conteúdo muda na janela que já estava aberta');
  }
});

test('clicar numa barraca troca a tela mesmo com o seletor de rolê ainda focado', async () => {
  for (const screen of ['cozinha', 'pescaria', 'correio', 'turma', 'fogueira']) {
    let game;
    const region = { turma: 'palco', fogueira: 'fogueira' }[screen] || 'lado-direita';
    const festa = fakeFesta({ hit: () => region });
    const { document } = boot({ ArraiaFesta: { create: () => festa }, FESTA_SPRITES: {},
      __gravador: api => { game = api; } });
    await Promise.resolve();
    const engine = game.engine();
    engine.state.size = engine.state.records.size = 30;
    engine.state.crew.cenoura = { level: 1 };
    const item = { cozinha: 'fogao-lenha', pescaria: 'barraca-pescaria', correio: 'correio' }[screen];
    if (item) { engine.addItem(item); engine.equip(item, 'direita'); }
    document.listeners.click({ detail: 0, target: { closest: () => ({ tagName: 'BUTTON',
      dataset: { action: 'tela', tela: 'roles' } }) } });
    const body = document.querySelector('#tela-corpo');
    assert.match(body.innerHTML, /select[^>]+data-role=/, 'a tela de rolês tem um personagem para escolher');
    const previous = body.innerHTML;
    const select = { tagName: 'SELECT', value: 'cenoura', matches: () => true };
    document.activeElement = select;
    body.contains = element => element === select;
    const canvas = document.querySelector('#festa-canvas');
    canvas.closest = selector => selector === '#festa-canvas' ? canvas : null;
    document.elementFromPoint = () => canvas;
    let prevented = false;
    document.listeners.pointerdown({ target: canvas, button: 0, clientX: 80, clientY: 80,
      preventDefault() { prevented = true; } });
    assert.equal(prevented, true, 'o gesto no canvas conserva o foco do controle nativo');
    assert.equal(document.activeElement, select);
    document.listeners.pointerup({ target: canvas, button: 0, clientX: 80, clientY: 80 });
    assert.equal(game.ui.tela.id, screen);
    assert.ok(body.innerHTML !== previous, `${screen}: o seletor antigo não bloqueia a troca de tela`);
    assert.equal(document.querySelector('#tela-titulo').textContent, UI.telaName(screen));
    assert.doesNotMatch(body.innerHTML, /select[^>]+data-role=/, 'a tela nova não conserva o formulário de rolês');
  }
});

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

test('um troféu conquistado na Mata atualiza a loja aberta sem precisar fechar e abrir', async () => {
  let game;
  const frames = [];
  const { document } = boot({ requestAnimationFrame: callback => frames.push(callback), __gravador: api => { game = api; } });
  await Promise.resolve();
  const engine = game.engine();
  engine.mini('mata').setVisibilityCheck(() => true);
  engine.state.size = 50;
  engine.state.records.size = 50;
  for (const stat of ['rebolado', 'folego', 'refresco', 'ritmo']) engine.state.levels[stat] = 200;
  engine.state.minis.mata.battle = data.minis.mata.battles;
  const click = dataset => document.listeners.click({ detail: 0, target: { closest: () => ({ tagName: 'BUTTON', dataset, disabled: false }) } });
  click({ action: 'vitrine' });
  click({ action: 'vitrine-cat', cat: 'chapeu' });
  const trophy = () => document.nodes.get('#vitrine').innerHTML.match(/<div class="vcard item[^>]+data-id="cabelo-curupira"[\s\S]*?<span class="estado">[^<]+<\/span>/)?.[0];
  assert.match(trophy(), /vcard item especial/);
  for (let at = 1100; at <= 10000 && !engine.owned('cabelo-curupira'); at += 100) frames.shift()(at);
  assert.equal(engine.owned('cabelo-curupira'), true, 'o chefe entrega o troféu sem ação na loja');
  assert.match(trophy(), /vcard item tem/);
  assert.match(trophy(), /<span class="estado">Usar<\/span>/);
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

test('a autocura preserva a janela atual quando não consegue salvar a sessão', async () => {
  let clock = 1000;
  let saves = 0;
  const { calls, run, document } = boot({ performance: { now: () => clock } }, {
    saveGame: () => { saves++; return false; }, repair: () => calls.push(['repair'])
  });
  await Promise.resolve();
  document.elementFromPoint = () => ({ closest: selector => selector === '.ui' ? {} : null });
  for (let i = 0; i < 60; i++) { clock += 120; run({ cursor: { x: 60 + i, y: 10, interactive: true } }); }
  assert.equal(saves, 1, 'a tentativa de recuperação procura salvar primeiro');
  assert.equal(calls.some(call => call[0] === 'repair'), false, 'falhar a gravação não descarta a sessão viva');
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

test('o foco nativo informado pelo cursor recupera o menu mesmo se o aviso de foco se perder', async () => {
  let game;
  const { document, calls, run } = boot({ __gravador: api => { game = api; } });
  await Promise.resolve();
  const canvas = { closest: selector => selector === '#festa-canvas' ? canvas : null };
  document.elementFromPoint = () => canvas;
  run({ cursor: { x: 50, y: 50, interactive: true, focused: false, focusRequest: 0 } });
  assert.equal(document.body.classList.contains('jogo-desfocado'), true);
  run({ cursor: { x: 50, y: 50, interactive: true, focused: true, focusRequest: 0 } });
  assert.equal(document.body.classList.contains('jogo-desfocado'), false, 'o menu volta no mesmo ponto sem exigir outro clique');
  document.listeners.pointerdown({ target: canvas, button: 0, clientX: 50, clientY: 50, preventDefault() {} });
  document.listeners.pointermove({ clientX: 90, clientY: 50, buttons: 1 });
  document.listeners.pointerup({ button: 0, buttons: 0 });
  assert.ok(calls.some(call => call[0] === 'settings' && 'x' in call[1]), 'o arrasto continua funcionando');
  document.listeners.pointerdown({ target: canvas, button: 0, clientX: 50, clientY: 50, preventDefault() {} });
  run({ cursor: { x: 50, y: 50, interactive: true, focused: false, focusRequest: game.ui.focusRequest } });
  assert.equal(game.ui.drag, null, 'desfocar também cancela um gesto que perdeu o pointerup');
  assert.equal(document.body.classList.contains('jogo-desfocado'), true);
});

test('voltar pelo clique mantém o mouse ativo durante arrasto ou compra, mesmo com aviso atrasado de pass-through', async () => {
  for (const kind of ['drag', 'hold']) {
    let game;
    const { calls, run, document } = boot({ clearInterval() {}, __gravador: api => { game = api; } });
    await Promise.resolve();
    game.engine().state.cheer = 1e6;
    const canvas = { closest: selector => selector === '#festa-canvas' ? canvas : null };
    const buy = { dataset: { hold: 'ficha' }, disabled: false, querySelector: () => null };
    buy.closest = selector => selector === '[data-hold]' ? buy : null;
    const target = kind === 'drag' ? canvas : buy;
    document.elementFromPoint = () => target;
    run({ foco: false });
    run({ cursor: { x: 50, y: 50, interactive: false } });
    calls.length = 0;
    document.listeners.pointerdown({ target, clientX: 50, clientY: 50, button: 0, preventDefault() {} });
    assert.equal(document.body.classList.contains('jogo-desfocado'), false, 'o menu volta ao clicar');
    assert.deepEqual(calls.filter(call => call[0] === 'interactive').at(-1), ['interactive', true],
      'o clique confirma que a janela deve receber o restante do gesto');
    const request = game.ui.focusRequest;
    assert.deepEqual(calls.filter(call => call[0] === 'focus-game').at(-1), ['focus-game', request]);
    calls.length = 0;
    document.elementFromPoint = () => null;
    run({ foco: false, focusRequest: request - 1 });
    run({ cursor: { x: 800, y: 800, interactive: false, focused: false, focusRequest: request - 1 } });
    assert.equal(document.body.classList.contains('jogo-desfocado'), false, 'avisos anteriores ao clique não escondem o menu');
    assert.ok(kind === 'drag' ? game.ui.drag : game.ui.hold, 'o gesto novo permanece ativo');
    assert.deepEqual(calls.filter(call => call[0] === 'interactive'), [], 'o estado anterior do cursor é descartado por inteiro');
    run({ cursor: { x: 800, y: 800, interactive: false, focused: true, focusRequest: request } });
    assert.deepEqual(calls.filter(call => call[0] === 'interactive'), [['interactive', true]],
      'o estado nativo atual é corrigido para receber o restante do gesto');
    document.listeners.pointermove({ clientX: 100, clientY: 50, buttons: 1 });
    document.listeners.pointerup({ button: 0, buttons: 0 });
    assert.equal(game.ui.drag, null);
    assert.equal(game.ui.hold, null);
    if (kind === 'drag') assert.ok(calls.some(call => call[0] === 'settings' && 'x' in call[1]), 'o arrasto termina e salva a posição');
    calls.length = 0;
    run({ cursor: { x: 801, y: 800, interactive: true } });
    assert.deepEqual(calls.filter(call => call[0] === 'interactive'), [['interactive', false]], 'fora do jogo o clique volta a passar');
  }
});

test('um cursor anterior ao clique não corta a entrega do mouse a um botão comum', async () => {
  let game;
  const { document, calls, run } = boot({ __gravador: api => { game = api; } });
  await Promise.resolve();
  const button = { tagName: 'BUTTON', dataset: { action: 'vitrine' }, disabled: false };
  button.closest = selector => ['.ui', '[data-action]'].includes(selector) ? button : null;
  document.elementFromPoint = x => x < 100 ? button : null;
  run({ foco: false, focusRequest: 0 });
  run({ cursor: { x: 900, y: 900, interactive: false, focused: false, focusRequest: 0 } });
  document.listeners.pointerdown({ target: button, clientX: 50, clientY: 50, button: 0, preventDefault() {} });
  calls.length = 0;
  run({ cursor: { x: 900, y: 900, interactive: false, focused: false, focusRequest: 0 } });
  assert.equal(game.ui.interactive, true, 'o snapshot antigo de fora do jogo não desativa o botão entre apertar e soltar');
  assert.equal(calls.some(call => call[0] === 'interactive' && call[1] === false), false);
  document.listeners.pointerup({ button: 0, buttons: 0 });
  document.listeners.click({ target: button, detail: 1 });
  assert.equal(document.nodes.get('#vitrine').hidden, false, 'o clique completo abre a loja');
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

test('mudar o zoom pela roda ou por outro controle durante o arrasto conserva o ajuste no movimento seguinte', async () => {
  for (const source of ['wheel', 'control']) for (const direction of [-1, 1]) {
    let game;
    const { document, calls } = boot({ __gravador: api => { game = api; } });
    await Promise.resolve();
    const click = dataset => document.listeners.click({ detail: 0,
      target: { closest: () => ({ tagName: 'BUTTON', dataset }) } });
    click({ action: 'zoom', value: '0.5' });
    const handle = { closest: selector => selector === '[data-action="zoom-alca"]' ? handle : null };
    document.listeners.pointerdown({ target: handle, clientX: 100, clientY: 100, button: 0, preventDefault() {} });
    document.listeners.pointermove({ clientX: 120, clientY: 100, buttons: 1 });
    const before = game.ui.settings.zoom;
    if (source === 'wheel') document.listeners.wheel({ target: handle, deltaY: direction * 120, preventDefault() {} });
    else click({ action: 'zoom', value: direction < 0 ? '0.75' : '0.4' });
    const adjusted = game.ui.settings.zoom;
    assert.ok(direction < 0 ? adjusted > before : adjusted < before);
    document.listeners.pointermove({ clientX: 125, clientY: 100, buttons: 1 });
    const expected = adjusted * 2 ** (5 / 160);
    assert.ok(Math.abs(game.ui.settings.zoom - expected) < 1e-12, 'the next drag starts from the new zoom');
    document.listeners.pointerup({ target: handle, button: 0, buttons: 0 });
    assert.ok(Math.abs(game.ui.settings.zoom - expected) < 1e-12);
    assert.ok(Math.abs(calls.filter(call => call[0] === 'settings').at(-1)[1].zoom - expected) < 1e-12);
  }
});

test('usar a roda com a alça pressionada conserva o tamanho ao soltar, e uma roda horizontal ainda permite o clique', async () => {
  for (const movement of [0, 2]) for (const deltaY of [-120, 120, 0]) {
    let game;
    const { document } = boot({ __gravador: api => { game = api; } });
    await Promise.resolve();
    document.listeners.click({ detail: 0, target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'zoom', value: '0.5' } }) } });
    const handle = { closest: selector => selector === '[data-action="zoom-alca"]' ? handle : null };
    document.listeners.pointerdown({ target: handle, clientX: 100, clientY: 100, button: 0, preventDefault() {} });
    if (movement) document.listeners.pointermove({ clientX: 100 + movement, clientY: 100, buttons: 1 });
    document.listeners.wheel({ target: handle, deltaX: deltaY ? 0 : 120, deltaY, preventDefault() {} });
    const adjusted = game.ui.settings.zoom;
    document.listeners.pointerup({ target: handle, button: 0, buttons: 0 });
    assert.equal(game.ui.settings.zoom, deltaY ? adjusted : 1, 'release retains a wheel resize but a horizontal wheel does not consume the reset click');
    assert.equal(game.ui.drag, null);
  }
});

test('a guia de tamanho permanece visível durante o arrasto depois de usar a roda', async () => {
  const timers = new Map();
  let nextTimer = 0;
  const { document } = boot({ setTimeout: (callback, ms) => {
    const id = ++nextTimer; timers.set(id, { callback, ms }); return id;
  }, clearTimeout: id => timers.delete(id) });
  await Promise.resolve();
  const handle = { closest: selector => selector === '[data-action="zoom-alca"]' ? handle : null };
  document.listeners.pointerdown({ target: handle, clientX: 100, clientY: 100, button: 0, preventDefault() {} });
  document.listeners.pointermove({ clientX: 120, clientY: 100, buttons: 1 });
  document.listeners.wheel({ target: handle, deltaY: -120, preventDefault() {} });
  for (const timer of [...timers.values()]) if (timer.ms === 700) timer.callback();
  const guide = document.querySelector('#zoom-guia');
  assert.equal(guide.hidden, false, 'a wheel timer does not hide an active drag guide');
  document.listeners.pointerup({ target: handle, button: 0, buttons: 0 });
  assert.equal(guide.hidden, true, 'release hides the guide');
  document.listeners.wheel({ target: handle, deltaY: -120, preventDefault() {} });
  for (const timer of [...timers.values()]) if (timer.ms === 700) timer.callback();
  assert.equal(guide.hidden, true, 'wheel use outside a drag still hides the guide after the delay');
});

test('arrasto interrompido conserva a posição visível nas preferências e ao reabrir', async () => {
  const settings = require('../src/settings.js');
  for (const ending of ['close', 'blur', 'released', 'cancel', 'escape', 'suspend']) {
    let stored = settings.normalizeSettings({});
    let writes = 0;
    let game;
    const { document, run, windowListeners } = boot({ __gravador: api => { game = api; } }, {
      getSettings: () => Promise.resolve(settings.publicSettings(stored)),
      updateSettings: partial => {
        writes++;
        stored = settings.mergeSettings(stored, partial);
        return Promise.resolve(settings.publicSettings(stored));
      }
    });
    await Promise.resolve();
    const canvas = { closest: selector => selector === '#festa-canvas' ? canvas : null };
    document.elementFromPoint = () => canvas;
    document.listeners.pointerdown({ target: canvas, clientX: 50, clientY: 50, button: 0, preventDefault() {} });
    document.listeners.pointermove({ clientX: 180, clientY: 20, buttons: 1 });
    const position = { x: game.ui.settings.x, lift: game.ui.settings.lift };
    assert.notEqual(position.x, stored.x, 'o arrasto já mudou o lugar da festa');
    if (ending === 'blur') run({ foco: false });
    else if (ending === 'released') document.listeners.pointermove({ clientX: 180, clientY: 20, buttons: 0 });
    else if (ending === 'escape') document.listeners.keydown({ key: 'Escape', target: document.body });
    else if (ending === 'suspend') run('salvar');
    else if (ending === 'close') windowListeners.beforeunload({ type: 'beforeunload' });
    else document.listeners.pointercancel();
    await Promise.resolve();
    assert.equal(game.ui.drag, null, `${ending}: o gesto termina`);
    assert.equal(stored.x, position.x, `${ending}: a posição final fica guardada mesmo sem pointerup`);
    assert.equal(stored.lift, position.lift);
    assert.equal(writes, 1, 'a interrupção persiste uma vez');
    document.listeners.pointerup({ button: 0, buttons: 0 });
    assert.equal(writes, 1, 'um soltar tardio não repete a gravação');
    let reopened;
    boot({ __gravador: api => { reopened = api; } }, {
      getSettings: () => Promise.resolve(settings.publicSettings(stored))
    });
    await Promise.resolve();
    assert.equal(reopened.ui.settings.x, position.x, 'reabrir mantém a posição que ficou na tela');
    assert.equal(reopened.ui.settings.lift, position.lift);
  }
});

test('um novo bilhete abre desde o início depois de rolar o aviso anterior', async () => {
  const { document } = boot();
  await Promise.resolve();
  const click = action => document.listeners.click({ detail: 0,
    target: { closest: () => ({ tagName: 'BUTTON', dataset: { action } }) } });
  const dialog = document.querySelector('#janela');
  dialog.scrollTop = 120;
  click('fechar-janela');
  click('carta');
  assert.equal(dialog.hidden, false, 'o bilhete novo foi aberto');
  assert.match(document.querySelector('#janela-corpo').innerHTML, /bilhete grande/);
  assert.equal(dialog.scrollTop, 0, 'a rolagem da janela anterior não esconde o início da carta');
});

test('Correio e Bingo continuam na tela quando o conteúdo cresce depois de arrastar até a borda', async () => {
  for (const [screenId, action, content] of [['correio', 'carta', 'cartao bilhete'], ['bingo', 'bingo-comprar', 'bingo-cartela']]) {
    let game;
    const { document } = boot({ __gravador: api => { game = api; } });
    await Promise.resolve();
    const click = dataset => document.listeners.click({ detail: 0,
      target: { closest: () => ({ tagName: 'BUTTON', dataset }) } });
    click({ action: 'fechar-janela' });
    const engine = game.engine();
    while (engine.state.size < 10) engine.addFame(engine.fameNeed() - engine.state.fame);
    engine.state.tickets = 100;
    const screen = document.querySelector('#tela');
    const body = document.querySelector('#tela-corpo');
    screen.offsetWidth = 660;
    // O navegador mede uma janela maior quando a carta ou a cartela passa a ocupar o corpo.
    Object.defineProperty(screen, 'offsetHeight', { get: () => body.innerHTML.includes(content) ? 400 : 220 });
    click({ action: 'tela', tela: screenId });
    const header = { dataset: { arrastar: 'tela' }, parentElement: screen,
      closest(selector) { return selector === '[data-arrastar]' ? this : selector === '.ui' ? screen : null; } };
    document.elementFromPoint = () => header;
    const x = parseFloat(screen.style.left) + 30;
    const y = parseFloat(screen.style.top) + 20;
    const dy = 1040 - parseFloat(screen.style.top) - screen.offsetHeight - 8;
    document.listeners.pointerdown({ target: header, button: 0, clientX: x, clientY: y, preventDefault() {} });
    document.listeners.pointermove({ buttons: 1, clientX: x, clientY: y + dy });
    document.listeners.pointerup({ target: header, button: 0, buttons: 0 });
    const left = screen.style.left;
    const position = { ...game.ui.telaPos };
    assert.equal(parseFloat(screen.style.top) + screen.offsetHeight, 1032, 'a janela começa inteira junto da borda');
    click({ action });
    assert.ok(body.innerHTML.includes(content), `${screenId}: a ação exibiu o conteúdo novo`);
    assert.equal(screen.offsetHeight, 400);
    assert.equal(screen.style.left, left, 'a mudança de altura conserva a posição horizontal');
    assert.ok(parseFloat(screen.style.top) >= 8 && parseFloat(screen.style.top) + screen.offsetHeight <= 1032,
      `${screenId}: o conteúdo novo cabe sem depender de redimensionar a tela`);
    assert.deepEqual({ ...game.ui.telaPos }, position, 'o ajuste na borda conserva a posição escolhida para a janela');
  }
});

test('Escape fecha a tela arrastada e encerra o gesto antes de continuar movendo ou soltar o mouse', async () => {
  let game;
  const { document, run } = boot({ __gravador: api => { game = api; } });
  await Promise.resolve();
  const click = dataset => document.listeners.click({ detail: 0,
    target: { closest: () => ({ tagName: 'BUTTON', dataset }) } });
  click({ action: 'fechar-janela' });
  click({ action: 'tela', tela: 'correio' });
  const screen = document.querySelector('#tela');
  const header = { dataset: { arrastar: 'tela' }, parentElement: screen,
    closest(selector) {
      if (selector === '[data-arrastar]') return this;
      if (selector === '.ui') return screen;
      return null;
    } };
  document.elementFromPoint = () => screen.hidden ? null : header;
  const down = () => document.listeners.pointerdown({ target: header,
    button: 0, clientX: 100, clientY: 100, preventDefault() {} });
  down();
  document.listeners.pointermove({ buttons: 1, clientX: 150, clientY: 130 });
  const position = { ...game.ui.telaPos };
  run({ cursor: { x: 150, y: 130, interactive: true, focused: true, focusRequest: game.ui.focusRequest } });
  document.listeners.keydown({ key: 'Escape', target: document.body });
  assert.equal(screen.hidden, true);
  assert.equal(game.ui.drag, null, 'fechar a janela encerra seu arrasto');
  assert.equal(game.ui.interactive, false, 'o ponto vazio volta a liberar os cliques');
  document.listeners.pointermove({ buttons: 1, clientX: 250, clientY: 200 });
  document.listeners.pointerup({ target: header, button: 0, buttons: 0 });
  assert.deepEqual({ ...game.ui.telaPos }, position, 'o movimento e o soltar tardios não mudam a posição fechada');
  click({ action: 'tela', tela: 'correio' });
  down();
  document.listeners.pointermove({ buttons: 1, clientX: 130, clientY: 100 });
  document.listeners.pointerup({ target: header, button: 0, buttons: 0 });
  assert.equal(screen.hidden, false);
  assert.notDeepEqual({ ...game.ui.telaPos }, position, 'um novo arrasto funciona depois de reabrir');
});

test('o placar das Argolas cabe na tela ao concluir uma rodada arrastada até a borda inferior', async () => {
  let game;
  let finish;
  const { document } = boot({ __gravador: api => { game = api; }, FESTA_SPRITES: {},
    ArraiaArgolas: { create: (_canvas, _sprites, options) => {
      finish = options.onEnd;
      return { start() {}, reset() {} };
    } } });
  await Promise.resolve();
  const click = dataset => document.listeners.click({ detail: 0,
    target: { closest: () => ({ tagName: 'BUTTON', dataset }) } });
  click({ action: 'fechar-janela' });
  const engine = game.engine();
  engine.state.tickets = 100;
  const rings = document.querySelector('#argolas');
  const info = document.querySelector('#argolas-info');
  rings.offsetWidth = 560;
  Object.defineProperty(rings, 'offsetHeight', { get: () => info.innerHTML.includes('data-action="argolas-jogar"') ? 740 : 520 });
  click({ action: 'argolas' });
  click({ action: 'argolas-jogar' });
  assert.equal(rings.offsetHeight, 520, 'as instruções durante a rodada ocupam menos altura');
  const header = { dataset: { arrastar: 'argolas' }, parentElement: rings,
    closest(selector) { return selector === '[data-arrastar]' ? this : selector === '.ui' ? rings : null; } };
  document.elementFromPoint = () => header;
  const x = parseFloat(rings.style.left) + 30;
  const y = parseFloat(rings.style.top) + 20;
  const dy = 1040 - parseFloat(rings.style.top) - rings.offsetHeight - 8;
  document.listeners.pointerdown({ target: header, button: 0, clientX: x, clientY: y, preventDefault() {} });
  document.listeners.pointermove({ buttons: 1, clientX: x, clientY: y + dy });
  document.listeners.pointerup({ target: header, button: 0, buttons: 0 });
  const left = rings.style.left;
  const position = { ...game.ui.ringsPos };
  assert.equal(parseFloat(rings.style.top) + rings.offsetHeight, 1032);
  for (let i = 0; i < engine.ringThrows(); i++) engine.ringHit(null);
  finish();
  assert.equal(engine.round, null, 'a rodada terminou');
  assert.equal(game.ui.rings.playing, false);
  assert.match(info.innerHTML, /cartao resultado/);
  assert.match(info.innerHTML, /data-action="argolas-jogar"/, 'o botão da próxima rodada voltou junto do placar');
  assert.equal(rings.offsetHeight, 740);
  assert.equal(rings.style.left, left, 'a posição horizontal escolhida continua igual');
  assert.ok(parseFloat(rings.style.top) >= 8 && parseFloat(rings.style.top) + rings.offsetHeight <= 1032,
    'o placar e o botão da próxima rodada ficam inteiros na tela');
  assert.deepEqual({ ...game.ui.ringsPos }, position, 'o ajuste conserva a posição escolhida para a janela');
  click({ action: 'argolas-jogar' });
  assert.ok(engine.round, 'a próxima rodada funciona sem fechar ou reposicionar a janela');
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

test('fechar a janela ou esconder a festa interrompe compras seguradas mesmo antes de soltar', async () => {
  for (const source of ['vitrine', 'argolas']) for (const cancel of ['escape', 'hide', 'hide-show']) {
    let game;
    const timeouts = [];
    const intervals = new Map();
    let nextInterval = 1;
    const { document, run } = boot({
      __gravador: api => { game = api; },
      setTimeout: fn => { timeouts.push(fn); return timeouts.length; }, clearTimeout() {},
      setInterval: fn => { const id = nextInterval++; intervals.set(id, fn); return id; },
      clearInterval: id => intervals.delete(id)
    });
    await Promise.resolve();
    const click = action => document.listeners.click({ detail: 0,
      target: { closest: () => ({ tagName: 'BUTTON', dataset: { action } }) } });
    click('fechar-janela');
    click(source);
    game.engine().state.cheer = 1e6;
    const button = { dataset: { hold: 'ficha' }, disabled: false, querySelector: () => null };
    button.closest = selector => selector === '[data-hold]' ? button
      : selector === `#${source}` ? document.nodes.get(`#${source}`) : null;
    document.listeners.pointerdown({ target: button, button: 0, clientX: 10, clientY: 10, preventDefault() {} });
    timeouts.at(-1)();
    const repeat = intervals.get([...intervals.keys()].at(-1));
    const tickets = game.engine().state.tickets;
    if (cancel === 'escape') document.listeners.keydown({ key: 'Escape', target: document.body });
    else {
      run({ settings: { ...game.ui.settings, hidden: true, revision: 1 } });
      if (cancel === 'hide-show') run({ settings: { ...game.ui.settings, hidden: false, revision: 2 } });
    }
    repeat();
    assert.equal(game.engine().state.tickets, tickets, `${source}/${cancel}: a compra anterior está encerrada`);
    assert.equal(game.ui.hold, null, 'o mouse também fica livre para o próximo gesto');
    if (cancel === 'escape') click(source);
    else if (cancel === 'hide') run({ settings: { ...game.ui.settings, hidden: false, revision: 2 } });
    document.listeners.pointerdown({ target: button, button: 0, clientX: 10, clientY: 10, preventDefault() {} });
    assert.equal(game.engine().state.tickets, tickets + 1, 'uma compra nova funciona ao reabrir');
    document.listeners.pointerup({ button: 0, buttons: 0 });
  }
});

test('uma compra segurada não continua no botão removido ao trocar de categoria ou subir de porte', async () => {
  for (const redraw of ['tier', 'category']) {
    let game;
    const frames = [];
    const timeouts = [];
    const intervals = new Map();
    let nextInterval = 1;
    const { document } = boot({
      __gravador: api => { game = api; }, requestAnimationFrame: fn => frames.push(fn),
      setTimeout: fn => { timeouts.push(fn); return timeouts.length; }, clearTimeout() {},
      setInterval: fn => { const id = nextInterval++; intervals.set(id, fn); return id; },
      clearInterval: id => intervals.delete(id)
    });
    await Promise.resolve();
    const click = dataset => document.listeners.click({ detail: 0,
      target: { closest: () => ({ tagName: 'BUTTON', dataset }) } });
    click({ action: 'fechar-janela' });
    click({ action: 'vitrine' });
    const engine = game.engine();
    engine.state.cheer = 1e6;
    engine.state.size = engine.state.records.size = 9;
    const before = engine.level('rebolado');
    const dock = document.nodes.get('#vitrine');
    let connected = true;
    let html = dock.innerHTML;
    Object.defineProperty(dock, 'innerHTML', {
      get: () => html,
      set: value => { html = value; connected = false; }
    });
    const button = { dataset: { hold: 'melhorar', stat: 'rebolado' }, disabled: false,
      get isConnected() { return connected; } };
    button.closest = selector => selector === '[data-hold]' ? button
      : connected && selector === '#vitrine' ? dock : null;
    document.listeners.pointerdown({ target: button, button: 0, clientX: 10, clientY: 10, preventDefault() {} });
    timeouts.at(-1)();
    const repeat = intervals.get([...intervals.keys()].at(-1));
    assert.equal(engine.level('rebolado'), before + 1, 'a primeira compra sai do botão que está na tela');
    if (redraw === 'category') click({ action: 'vitrine-cat', cat: 'tecido' });
    else {
      engine.addFame(engine.fameNeed() - engine.state.fame);
      frames.shift()(1250);
    }
    assert.equal(connected, false, 'a loja mudou e substituiu o botão pressionado');
    repeat();
    assert.equal(engine.level('rebolado'), before + 1, `${redraw}: o botão antigo não compra melhorias invisíveis`);
    assert.equal(game.ui.hold, null, 'o gesto termina quando seu controle deixa a tela');
  }
});

test('avisos automáticos preservam o controle entre pressionar e concluir um clique', async () => {
  for (const activation of ['mouse', 'space']) for (const surface of ['placa', 'vitrine', 'tela', 'painel', 'argolas']) {
    let game;
    let wall = Date.now();
    const frames = [];
    const { document } = boot({ __gravador: api => { game = api; }, requestAnimationFrame: fn => frames.push(fn) });
    await Promise.resolve();
    const click = dataset => document.listeners.click({ detail: 0,
      target: { closest: () => ({ tagName: 'BUTTON', dataset }) } });
    click({ action: 'fechar-janela' });
    const engine = game.engine();
    engine.now = () => wall;
    engine.state.size = engine.state.records.size = 9;
    engine.state.cheer = 1e6;
    engine.state.tickets = 100;
    engine.state.mail = { ready: 1, nextAt: wall + 200 };
    engine.state.rings = { cost: 2, nextAt: wall + 200 };
    if (surface === 'vitrine') { click({ action: 'vitrine' }); if (activation === 'mouse') click({ action: 'vitrine-cat', cat: 'chapeu' }); }
    if (surface === 'tela') click({ action: 'tela', tela: 'correio' });
    if (surface === 'painel') click({ action: 'tab', tab: 'conquistas' });
    if (surface === 'argolas') click({ action: 'argolas' });
    const datasets = {
      placa: { action: 'tela', tela: 'correio' }, vitrine: activation === 'mouse'
        ? { action: 'vitrine-item', id: 'palha-furada' } : { action: 'melhorar', hold: 'melhorar', stat: 'rebolado' },
      tela: { action: 'carta' }, painel: { action: 'meta-trocar', index: '0' }, argolas: { action: 'argolas-jogar' }
    };
    const id = { tela: '#tela-corpo', painel: '#painel-corpo', argolas: '#argolas-info' }[surface] || `#${surface}`;
    const container = document.querySelector(id);
    const parent = document.querySelector(`#${surface}`);
    let connected = true;
    let html = container.innerHTML;
    Object.defineProperty(container, 'innerHTML', {
      get: () => html, set: value => { html = value; connected = false; }
    });
    const button = { tagName: surface === 'vitrine' && activation === 'mouse' ? 'DIV' : 'BUTTON', dataset: datasets[surface], disabled: false,
      get isConnected() { return connected; }, closest(selector) {
        if (selector === '[data-action]' || selector === '[role="button"][data-action]' && this.tagName === 'DIV') return this;
        if (selector === 'button[data-action]' && this.tagName === 'BUTTON') return this;
        if (selector === `#${surface}` || selector === '.ui') return parent;
        if (selector.split(',').some(value => value.trim() === '[data-action]' || value.trim() === 'button' && this.tagName === 'BUTTON')) return this;
        return null;
      } };
    container.contains = element => element === button;
    parent.contains = element => element === button;
    document.elementFromPoint = () => button;
    const goal = engine.state.goals[0];
    const level = engine.level('rebolado');
    engine.drainEvents();
    if (activation === 'mouse') document.listeners.pointerdown({ target: button, button: 0, clientX: 20, clientY: 20, preventDefault() {} });
    else document.listeners.keydown({ key: ' ', target: button, repeat: false, preventDefault() {} });
    engine.addFame(engine.fameNeed() - engine.state.fame);
    wall += 250;
    frames.shift()(1250);
    assert.equal(connected, true, `${surface}/${activation}: o aviso não remove o alvo pressionado`);
    if (activation === 'mouse') document.listeners.pointerup({ target: button, button: 0, clientX: 20, clientY: 20 });
    else document.listeners.keyup({ key: ' ', target: button, preventDefault() {} });
    document.listeners.click({ target: button, detail: activation === 'mouse' ? 1 : 0 });
    if (surface === 'placa') assert.equal(game.ui.tela.id, 'correio');
    if (surface === 'vitrine') {
      if (activation === 'mouse') assert.equal(engine.owned('palha-furada'), true);
      else assert.equal(engine.level('rebolado'), level + 1, 'o botão de segurar compra uma única melhoria pelo teclado');
    }
    if (surface === 'tela') assert.equal(engine.state.stats.letters, 1);
    if (surface === 'painel') assert.notEqual(engine.state.goals[0], goal);
    if (surface === 'argolas') assert.ok(engine.round);
    assert.equal(connected, false, `${surface}: o redesenho pendente ocorre depois da ação`);
    assert.equal(game.ui.press, null);
    if (activation === 'space') assert.equal(game.ui.spacePress, null);
  }
});

test('fechar ou salvar durante a edição conserva o nome sem tirar o foco do campo', async () => {
  for (const trigger of ['close', 'suspend', 'autosave']) {
    let game;
    let saved;
    let clock = 1000;
    const frames = [];
    const { document, run, windowListeners } = boot({ __gravador: api => { game = api; },
      performance: { now: () => clock }, requestAnimationFrame: fn => frames.push(fn) },
      { saveGame: state => { saved = state; return true; } });
    await Promise.resolve();
    run('painel');
    const body = document.querySelector('#painel-corpo');
    const html = body.innerHTML;
    const input = { id: 'nome', tagName: 'INPUT', value: 'Nome ao fechar', matches: () => true };
    document.activeElement = input;
    body.contains = element => element === input;
    document.listeners.input({ target: input });
    assert.equal(body.innerHTML, html, 'digitar não troca o campo no meio da edição');
    assert.equal(document.activeElement, input);
    if (trigger === 'close') windowListeners.beforeunload();
    else if (trigger === 'suspend') run('salvar');
    else { clock += 801; frames.shift()(clock); }
    assert.equal(saved.name, input.value, `${trigger}: o save recebe o texto ainda em edição`);
    assert.equal(new core.GameEngine(data, saved).state.name, input.value, 'reabrir conserva o nome digitado');
  }
});

test('os quadros atrasados e o fechamento conservam a quinta ficha vendida pelo quentão', async () => {
  for (const trigger of ['frame', 'close', 'suspend']) {
    let game;
    let saved;
    // As cinco vendas não atravessam a meia-noite nem recebem uma segunda visita diária.
    let wall = new Date(2026, 9, 2, 12).getTime();
    class ColdDate extends Date { static now() { return wall; } }
    class ColdEngine extends core.GameEngine {
      constructor(cfg, state, options = {}) { super(cfg, state, { ...options, now: () => wall, rng: () => 0.5 }); }
    }
    let elapsed = 1000;
    const frames = [];
    const { document, run, windowListeners } = boot({ ArraiaCore: { ...core, GameEngine: ColdEngine }, Date: ColdDate,
      __gravador: api => { game = api; },
      performance: { now: () => elapsed }, requestAnimationFrame: fn => frames.push(fn) },
      { saveGame: state => { saved = state; return true; } });
    await Promise.resolve();
    const engine = game.engine();
    engine.now = () => wall;
    while (engine.state.size < 30) engine.addFame(engine.fameNeed() - engine.state.fame);
    engine.addItem('barril-quentao');
    engine.equip('barril-quentao', 'direita');
    engine.startCold();
    const born = wall;
    const tickets = engine.state.tickets;
    const frame = ms => { elapsed += ms; frames.shift()(elapsed); };
    for (const ms of [15001, 30001, 45001, 60001]) { wall = born + ms; frame(15000); }
    assert.equal(engine.state.stats.quentao, 4);
    wall = born + 75001;
    if (trigger === 'frame') {
      frame(15000);
      assert.equal(document.querySelector('#avisos').children.filter(node => node.textContent.includes('vendeu 5 goles')).length, 1,
        'o aviso final mostra as cinco vendas, uma vez');
      windowListeners.beforeunload();
    } else if (trigger === 'close') windowListeners.beforeunload();
    else run('salvar');
    assert.equal(saved.stats.quentao, 5, trigger);
    assert.equal(saved.tickets, tickets + 5);
    assert.equal(saved.cold.active, null);
    const loaded = new core.GameEngine(data, saved, { now: () => wall, rng: () => 0.5 });
    loaded.updateTimers(wall);
    assert.equal(loaded.state.stats.quentao, 5);
    assert.equal(loaded.state.tickets, saved.tickets);
  }
});

test('os quadros da festa mantêm os noivos disponíveis até o fim real da cerimônia', async () => {
  let game;
  let wall = Date.now();
  let elapsed = 1000;
  const frames = [];
  const { document } = boot({ __gravador: api => { game = api; },
    performance: { now: () => elapsed }, requestAnimationFrame: fn => frames.push(fn) });
  await Promise.resolve();
  const engine = game.engine();
  engine.now = () => wall;
  while (engine.state.size < 30) engine.addFame(engine.fameNeed() - engine.state.fame);
  assert.equal(engine.startWedding(), true);
  const deadline = engine.state.runtime.weddingUntil;
  const frame = () => { elapsed += 250; frames.shift()(elapsed); };
  frame();
  while (wall < deadline - 250) { wall += 250; frame(); }
  assert.equal(engine.state.stats.weddings, 0, 'o primeiro quadro não antecipa o pagamento do presente');
  assert.equal(engine.state.runtime.weddingLeft, 0.25);
  game.festaClick('casamento');
  assert.equal(engine.state.runtime.rice, 1, 'o último clique nos noivos ainda pode acrescentar arroz');
  wall = deadline;
  frame();
  assert.equal(engine.state.stats.weddings, 1);
  assert.equal(engine.state.runtime.weddingLeft, 0);
  assert.equal(document.querySelector('#avisos').children.filter(node => node.textContent.includes('Os noivos agradecem!')).length, 1,
    'o aviso do presente aparece uma vez no quadro do fim');
});

test('fechar ou suspender depois do fim do casamento salva o presente antes do próximo quadro', async () => {
  for (const trigger of ['close', 'suspend']) {
    let game;
    let saved;
    let wall = Date.now();
    const { run, windowListeners } = boot({ __gravador: api => { game = api; } },
      { saveGame: state => { saved = state; return true; } });
    await Promise.resolve();
    const engine = game.engine();
    engine.now = () => wall;
    while (engine.state.size < 100) engine.addFame(engine.fameNeed() - engine.state.fame);
    assert.equal(engine.startWedding(), true);
    for (let i = 0; i < 10; i++) {
      assert.equal(engine.throwRice().ready, true);
      wall += data.config.riceCooldown * 1000;
    }
    wall = engine.state.runtime.weddingUntil;
    const tickets = engine.state.tickets;
    if (trigger === 'close') windowListeners.beforeunload();
    else run('salvar');
    assert.equal(saved.stats.weddings, 1, `${trigger}: a gravação inclui a cerimônia encerrada`);
    assert.equal(saved.tickets, tickets + 5);
    assert.ok(saved.inventory.includes('veu-noiva'));
    const loaded = new core.GameEngine(data, saved, { now: () => wall, rng: () => 0.5 });
    loaded.updateTimers(wall);
    assert.equal(loaded.state.stats.weddings, 1);
    assert.equal(loaded.state.tickets, saved.tickets, 'reabrir conserva as fichas sem pagar o presente duas vezes');
    assert.ok(loaded.owned('veu-noiva'));
  }
});

test('a primeira pescaria ao reabrir um ano novo conserva o peixe antes do primeiro quadro', async () => {
  const source = new core.GameEngine(data);
  const growTo = size => { while (source.state.size < size) source.addFame(source.fameNeed() - source.state.fame); };
  growTo(100);
  source.newYear();
  growTo(10);
  const saved = source.exportState();
  assert.equal(saved.minis.aquario.started, false);
  let game;
  let snapshot;
  const { document, windowListeners } = boot({ __gravador: api => { game = api; } },
    { loadGame: () => saved, saveGame: state => { snapshot = state; return true; } });
  await Promise.resolve();
  const click = dataset => document.listeners.click({ detail: 0,
    target: { closest: () => ({ tagName: 'BUTTON', dataset }) } });
  click({ action: 'fechar-janela' });
  click({ action: 'tela', tela: 'pescaria' });
  click({ action: 'pescar' });
  const engine = game.engine();
  assert.equal(engine.state.stats.fished, 1, 'a prenda é recebida pela pescaria');
  assert.equal(engine.state.minis.aquario.fish.length, data.minis.aquario.starter + 1, 'a mesma prenda também solta o peixe no tanque');
  windowListeners.beforeunload();
  assert.equal(snapshot.minis.aquario.fish.length, data.minis.aquario.starter + 1);
  const loaded = new core.GameEngine(data, snapshot);
  assert.equal(loaded.mini('aquario').info().fish.length, data.minis.aquario.starter + 1);
});

test('fechar ou suspender depois do fim da música conserva estrelas e prêmio sem esperar o próximo quadro', async () => {
  for (const trigger of ['close', 'suspend']) {
    let game;
    let saved;
    let wall = Date.now();
    const { run, windowListeners } = boot({ __gravador: api => { game = api; } },
      { saveGame: state => { saved = state; return true; } });
    await Promise.resolve();
    const engine = game.engine();
    engine.now = () => wall;
    while (engine.state.size < 38) engine.addFame(engine.fameNeed() - engine.state.fame);
    const palco = engine.mini('palco');
    const start = wall;
    const notes = palco.chart('xote');
    assert.equal(palco.start('xote').ok, true);
    for (const note of notes) { wall = start + note.t; palco.hit(note.lane); }
    wall = start + notes.at(-1).t + 1201;
    const tickets = engine.state.tickets;
    if (trigger === 'close') windowListeners.beforeunload();
    else run('salvar');
    assert.equal(saved.minis.palco.best.xote, 3, `${trigger}: as estrelas já ganhas entram no save`);
    assert.equal(saved.minis.palco.shows, 1);
    assert.equal(saved.tickets, tickets + 1 + data.minis.palco.firstThree.tickets);
    const loaded = new core.GameEngine(data, saved, { now: () => wall, rng: () => 0.5 });
    assert.equal(loaded.mini('palco').info().songs[1].open, true, 'a música desbloqueada continua aberta ao reabrir');
    loaded.mini('palco').tick();
    assert.equal(loaded.state.tickets, saved.tickets, 'a reabertura não paga outra vez');
  }
});

test('atualizar o nome depois de Tab preserva o foco no próximo botão do painel', async () => {
  let game;
  const timeouts = [];
  const { document, run } = boot({ __gravador: api => { game = api; },
    setTimeout: fn => { timeouts.push(fn); return timeouts.length; } });
  await Promise.resolve();
  document.listeners.click({ detail: 0, target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'fechar-janela' } }) } });
  run('painel');
  const panel = document.querySelector('#painel');
  const body = document.querySelector('#painel-corpo');
  const input = { id: 'nome', tagName: 'INPUT', value: 'Festa do teclado', matches: () => true };
  const photo = { tagName: 'BUTTON', dataset: { action: 'foto' }, isConnected: true };
  const nextPhoto = { tagName: 'BUTTON', dataset: { action: 'foto' }, isConnected: true,
    focus() { document.activeElement = this; } };
  panel.contains = body.contains = element => [input, photo, nextPhoto].includes(element);
  panel.querySelectorAll = () => [nextPhoto];
  let html = body.innerHTML;
  Object.defineProperty(body, 'innerHTML', { get: () => html, set(value) {
    html = value;
    photo.isConnected = false;
    document.activeElement = document.body;
  } });
  document.activeElement = input;
  document.listeners.change({ target: input });
  assert.equal(game.engine().state.name, 'Festa do teclado');
  assert.equal(photo.isConnected, true, 'o campo ainda bloqueia o redesenho durante change');
  document.activeElement = photo;
  document.listeners.focusout();
  timeouts.at(-1)();
  assert.match(body.innerHTML, /value="Festa do teclado"/);
  assert.equal(document.activeElement, nextPhoto, 'o redesenho adiado conserva o destino de Tab');
});

test('redesenhar a vitrine conserva o foco de teclado no mesmo item', async () => {
  let game;
  const { document } = boot({ __gravador: api => { game = api; } });
  await Promise.resolve();
  const engine = game.engine();
  engine.state.tickets = 100;
  const dock = document.querySelector('#vitrine');
  const click = dataset => document.listeners.click({ detail: 0,
    target: { closest: () => ({ tagName: 'BUTTON', dataset }) } });
  click({ action: 'fechar-janela' });
  click({ action: 'vitrine' });
  click({ action: 'vitrine-cat', cat: 'chapeu' });
  const old = { tagName: 'DIV', dataset: { action: 'vitrine-item', id: 'palha-furada' }, isConnected: true };
  const other = { tagName: 'DIV', dataset: { action: 'vitrine-item', id: 'palha' }, isConnected: true,
    focus() { document.activeElement = this; } };
  const replacement = { tagName: 'DIV', dataset: { ...old.dataset }, isConnected: true,
    focus() { document.activeElement = this; } };
  old.closest = selector => selector === '[role="button"][data-action]' ? old : null;
  document.activeElement = old;
  dock.contains = element => element === old || element === other || element === replacement;
  dock.querySelectorAll = () => [other, replacement];
  let html = dock.innerHTML;
  Object.defineProperty(dock, 'innerHTML', { get: () => html, set(value) {
    html = value;
    old.isConnected = false;
    document.activeElement = document.body;
  } });
  document.listeners.keydown({ key: 'Enter', target: old, preventDefault() {} });
  assert.equal(engine.owned('palha-furada'), true, 'a compra pelo teclado foi concluída');
  assert.equal(document.activeElement, replacement, 'o foco acompanha o mesmo item, e não outro cartão da mesma ação');
  assert.equal(old.isConnected, false);
});

test('um prêmio automático conserva o foco da loja sem trazê-la acima da janela aberta depois', async () => {
  const frames = [];
  let game;
  const { document, run } = boot({ requestAnimationFrame: fn => frames.push(fn),
    __gravador: api => { game = api; } });
  await Promise.resolve();
  const click = dataset => document.listeners.click({ detail: 0,
    target: { closest: () => ({ tagName: 'BUTTON', dataset }) } });
  click({ action: 'fechar-janela' });
  click({ action: 'vitrine' });
  click({ action: 'vitrine-cat', cat: 'chapeu' });
  const dock = document.querySelector('#vitrine');
  const panel = document.querySelector('#painel');
  const control = () => ({ tagName: 'DIV', dataset: { action: 'vitrine-item', id: 'palha-furada' }, isConnected: true,
    closest: selector => selector === '.casa, .painel, .minijogo, #vitrine' ? dock : null,
    focus() { document.activeElement = this; document.listeners.focusin({ target: this }); } });
  let current = control();
  dock.contains = element => element === current;
  dock.querySelectorAll = () => [current];
  current.focus();
  run('painel');
  assert.ok(Number(panel.style.zIndex) > Number(dock.style.zIndex));
  let html = dock.innerHTML;
  Object.defineProperty(dock, 'innerHTML', { get: () => html, set(value) {
    html = value;
    current.isConnected = false;
    current = control();
    document.activeElement = document.body;
  } });
  assert.equal(game.engine().addItem('veu-noiva'), true);
  frames.shift()(1000);
  assert.equal(document.activeElement, current, 'o cartão correspondente conserva o foco depois do prêmio');
  assert.ok(Number(panel.style.zIndex) > Number(dock.style.zIndex), 'redesenhar o cartão não seleciona a loja que estava atrás');
  current.focus();
  assert.ok(Number(dock.style.zIndex) > Number(panel.style.zIndex), 'selecionar o cartão novamente ainda traz a loja para a frente');
});

test('abrir um aviso direciona o teclado para ele sem ativar uma confirmação ao repetir Enter', async () => {
  let game;
  const { document } = boot({ __gravador: api => { game = api; } });
  await Promise.resolve();
  const engine = game.engine();
  engine.state.size = engine.state.records.size = 100;
  const dialog = document.querySelector('#janela');
  let focusOptions;
  dialog.focus = options => { focusOptions = options; document.activeElement = dialog; };
  dialog.closest = selector => selector.includes('[role="dialog"]') ? dialog : null;
  const opener = { tagName: 'BUTTON', dataset: { action: 'ano-novo' } };
  document.activeElement = opener;
  document.listeners.click({ detail: 0, target: { closest: () => opener } });
  assert.equal(game.ui.modal, true);
  assert.equal(document.activeElement, dialog, 'a confirmação recebe o foco em vez de manter o botão atrás dela');
  assert.equal(focusOptions.preventScroll, true, 'o foco não desloca a página ou a rolagem inicial do aviso');
  document.listeners.keydown({ key: 'Enter', target: dialog, preventDefault() {} });
  assert.equal(engine.state.year, 1, 'repetir Enter não confirma o ano novo antes de escolher o botão');
  assert.equal(game.ui.modal, true);
  document.listeners.keydown({ key: 'Escape', target: dialog });
  assert.equal(game.ui.modal, false, 'Escape continua fechando o aviso focado');
});

test('fechar um aviso devolve o foco ao controle disponível, inclusive após redesenhar, sem tirar a seleção de outro campo', async () => {
  for (const mode of ['unchanged', 'redrawn', 'disabled', 'hidden', 'selected-elsewhere']) {
    let game;
    const { document, run } = boot({ __gravador: api => { game = api; } });
    await Promise.resolve();
    game.engine().state.size = game.engine().state.records.size = 100;
    run('painel');
    run('argolas');
    const panel = document.querySelector('#painel');
    const rings = document.querySelector('#argolas');
    const dialog = document.querySelector('#janela');
    let hidden = dialog.hidden;
    Object.defineProperty(dialog, 'hidden', { get: () => hidden, set(value) {
      hidden = value;
      if (value && document.activeElement === dialog) document.activeElement = document.body;
    } });
    dialog.contains = element => element === dialog;
    dialog.focus = () => { document.activeElement = dialog; };
    dialog.closest = selector => selector.includes('[role="dialog"]') ? dialog : null;
    const makeControl = () => ({ tagName: 'BUTTON', isConnected: true, disabled: false, dataset: { action: 'ano-novo' },
      closest: selector => selector === '.ui' || selector.includes('.painel') ? panel : null,
      getClientRects: () => panel.hidden ? [] : [{}],
      focus(options) { assert.equal(options.preventScroll, true); document.activeElement = this; document.listeners.focusin({ target: this }); } });
    const opener = makeControl();
    const current = mode === 'redrawn' || mode === 'disabled' ? makeControl() : opener;
    panel.querySelectorAll = () => [current];
    document.activeElement = opener;
    document.listeners.click({ detail: 0, target: { closest: () => opener } });
    assert.equal(document.activeElement, dialog);
    if (current !== opener) opener.isConnected = false;
    if (mode === 'disabled') current.disabled = true;
    if (mode === 'hidden') panel.hidden = true;
    const other = { tagName: 'INPUT', id: 'nome', closest: () => null };
    if (mode === 'selected-elsewhere') document.activeElement = other;
    document.listeners.keydown({ key: 'Escape', target: document.activeElement });
    const expected = mode === 'disabled' || mode === 'hidden' ? document.body : mode === 'selected-elsewhere' ? other : current;
    assert.equal(document.activeElement, expected, `${mode}: o retorno respeita o controle atual e a seleção da pessoa`);
    assert.ok(Number(rings.style.zIndex) > Number(panel.style.zIndex), 'restaurar o foco não reorganiza as janelas');
  }
});

test('ler um aviso com o teclado não lança argolas por trás dele e os controles nativos continuam funcionando', async () => {
  let game;
  let throws = 0;
  const { document } = boot({ __gravador: api => { game = api; } });
  await Promise.resolve();
  const dialog = document.querySelector('#janela');
  dialog.closest = selector => selector.includes('[role="dialog"]') ? dialog : null;
  game.ui.rings.open = game.ui.rings.playing = true;
  game.ui.game = { throwRing() { throws++; return true; } };
  game.ui.modal = true;
  dialog.hidden = false;
  let prevented = false;
  document.listeners.keydown({ key: ' ', target: dialog, preventDefault() { prevented = true; } });
  assert.equal(throws, 0, 'espaço pertence à leitura do aviso e não à rodada aberta atrás dele');
  assert.equal(prevented, false, 'a rolagem pelo teclado continua sendo do navegador');
  document.listeners.keydown({ key: ' ', target: document.body, preventDefault() {} });
  assert.equal(throws, 1, 'selecionar o jogo fora do aviso ainda permite usar seu atalho');
  const close = { tagName: 'BUTTON', dataset: { action: 'fechar-janela' } };
  document.listeners.click({ detail: 0, target: { closest: () => close } });
  assert.equal(game.ui.modal, false, 'o botão do aviso ainda aceita ativação nativa pelo teclado');
});

test('abrir um bilhete não devolve o foco ao botão Carta atrás da janela', async () => {
  let game;
  let wall = Date.now();
  const { document } = boot({ __gravador: api => { game = api; } });
  await Promise.resolve();
  const engine = game.engine();
  engine.now = () => wall;
  engine.updateTimers(wall);
  wall = engine.state.mail.nextAt;
  engine.updateTimers(wall);
  assert.equal(engine.state.mail.ready, 2, 'duas cartas chegaram pelo relógio normal');
  const click = button => document.listeners.click({ detail: 0, target: { closest: () => button } });
  click({ tagName: 'BUTTON', dataset: { action: 'fechar-janela' } });
  click({ tagName: 'BUTTON', dataset: { action: 'tela', tela: 'correio' } });
  const source = { tagName: 'BUTTON', dataset: { action: 'carta' }, isConnected: true };
  const replacement = { tagName: 'BUTTON', dataset: { action: 'carta' }, isConnected: true,
    focus() { document.activeElement = this; } };
  const tela = document.querySelector('#tela');
  const body = document.querySelector('#tela-corpo');
  tela.contains = element => [source, replacement].includes(element);
  tela.querySelectorAll = () => [replacement];
  let html = body.innerHTML;
  Object.defineProperty(body, 'innerHTML', { get: () => html, set(value) {
    html = value;
    source.isConnected = false;
    document.activeElement = document.body;
  } });
  document.activeElement = source;
  click(source);
  assert.equal(game.ui.modal, true);
  assert.equal(engine.state.stats.letters, 1);
  assert.notEqual(document.activeElement, replacement, 'o bilhete aberto impede restaurar o controle atrás dele');
  if (document.activeElement.dataset?.action) click(document.activeElement);
  assert.equal(engine.state.stats.letters, 1, 'outra ativação de teclado não consome uma carta escondida');
  assert.equal(engine.state.mail.ready, 1);
});

test('um clique interrompido libera o redesenho pendente e permite um novo gesto', async () => {
  for (const interruption of ['cancel', 'blur', 'hide', 'buttons', 'outside', 'no-click', 'escape']) {
    let game;
    const frames = [];
    const timeouts = [];
    const { document, run } = boot({ __gravador: api => { game = api; }, requestAnimationFrame: fn => frames.push(fn),
      setTimeout: fn => { timeouts.push(fn); return timeouts.length; } });
    await Promise.resolve();
    const engine = game.engine();
    const placa = document.querySelector('#placa');
    let connected = true;
    let html = placa.innerHTML;
    Object.defineProperty(placa, 'innerHTML', { get: () => html, set: value => { html = value; connected = false; } });
    const button = { tagName: 'BUTTON', dataset: { action: 'tela', tela: 'correio' }, disabled: false,
      closest(selector) {
        if (selector === '[data-action]' || selector.split(',').some(value => value.trim() === 'button')) return this;
        return selector === '#placa' || selector === '.ui' ? placa : null;
      } };
    placa.contains = element => element === button;
    document.elementFromPoint = () => button;
    const down = () => document.listeners.pointerdown({ target: button, button: 0, clientX: 20, clientY: 20, preventDefault() {} });
    down();
    engine.state.mail.ready++;
    frames.shift()(1250);
    assert.equal(connected, true, 'o controle pressionado continua na tela');
    assert.ok(game.ui.press);
    if (interruption === 'cancel') document.listeners.pointercancel({});
    if (interruption === 'blur') run({ foco: false, focusRequest: game.ui.focusRequest });
    if (interruption === 'hide') run({ settings: { revision: 1, hidden: true } });
    if (interruption === 'buttons') document.listeners.pointermove({ buttons: 0, clientX: 20, clientY: 20 });
    if (interruption === 'outside') document.listeners.pointerup({ target: document.body, button: 0, clientX: 900, clientY: 20 });
    if (interruption === 'no-click') {
      document.listeners.pointerup({ target: button, button: 0, clientX: 20, clientY: 20 });
      timeouts.at(-1)();
    }
    if (interruption === 'escape') document.listeners.keydown({ key: 'Escape', target: document.body });
    assert.equal(game.ui.press, null, `${interruption}: o controle não deixa a janela presa`);
    assert.equal(connected, false, `${interruption}: o redesenho aguardando o gesto é liberado`);
    assert.equal(game.ui.tela.open, false, 'interromper não executa a ação do botão');
    if (interruption === 'hide') run({ settings: { revision: 2, hidden: false } });
    connected = true;
    down();
    document.listeners.pointerup({ target: button, button: 0, clientX: 20, clientY: 20 });
    document.listeners.click({ target: button, detail: 1 });
    assert.equal(game.ui.tela.open, true, `${interruption}: um clique novo funciona`);
    assert.equal(game.ui.press, null);
  }
});

test('soltar um botão depois de cancelar o gesto não executa o clique nativo atrasado', async () => {
  for (const interruption of ['suspend', 'blur', 'escape', 'buttons']) {
    let game;
    const { document, run } = boot({ __gravador: api => { game = api; } });
    await Promise.resolve();
    document.listeners.click({ detail: 0, target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'fechar-janela' } }) } });
    const button = { tagName: 'BUTTON', dataset: { action: 'vitrine' }, disabled: false,
      closest: selector => selector === '[data-action]' ? button : null };
    const event = { target: button, button: 0, buttons: 1, clientX: 20, clientY: 20, preventDefault() {} };
    document.listeners.pointerdown(event);
    assert.ok(game.ui.press);
    if (interruption === 'suspend') run('salvar');
    else if (interruption === 'blur') run({ foco: false, focusRequest: game.ui.focusRequest });
    else if (interruption === 'escape') document.listeners.keydown({ key: 'Escape', target: document.body });
    else document.listeners.pointermove({ buttons: 0, clientX: 20, clientY: 20 });
    assert.equal(game.ui.press, null);
    document.listeners.pointerup({ ...event, buttons: 0 });
    document.listeners.click({ target: button, detail: 1 });
    assert.equal(game.ui.dock.open, false, `${interruption}: a ação não pertence mais a um clique válido`);
    document.listeners.pointerdown(event);
    document.listeners.pointerup({ ...event, buttons: 0 });
    document.listeners.click({ target: button, detail: 1 });
    assert.equal(game.ui.dock.open, true, 'um novo clique de mouse abre a loja normalmente');
    document.listeners.click({ target: button, detail: 0 });
    assert.equal(game.ui.dock.open, false, 'a ativação pelo teclado continua funcionando');
  }
});

test('uma confirmação pressionada antes da suspensão ou perda de foco não começa o novo ano ao soltar', async () => {
  for (const interruption of ['suspend', 'blur']) for (const activation of ['mouse', 'keyboard']) {
    let game;
    const { document, run } = boot({ __gravador: api => { game = api; } });
    await Promise.resolve();
    const engine = game.engine();
    while (engine.state.size < 100) engine.addFame(engine.fameNeed() - engine.state.fame);
    const click = action => document.listeners.click({ detail: 0,
      target: { closest: () => ({ tagName: 'BUTTON', dataset: { action } }) } });
    click('ano-novo');
    const button = { tagName: 'BUTTON', dataset: { action: 'ano-novo-sim' }, disabled: false,
      closest: selector => selector === '[data-action]' ? button : null };
    const event = { target: button, button: 0, buttons: 1, clientX: 20, clientY: 20, preventDefault() {} };
    document.listeners.pointerdown(event);
    if (interruption === 'suspend') run('salvar');
    else run({ foco: false, focusRequest: game.ui.focusRequest });
    document.listeners.pointerup({ ...event, buttons: 0 });
    document.listeners.click({ target: button, detail: 1 });
    assert.equal(engine.state.year, 1, 'soltar o mouse não confirma um gesto cancelado');
    assert.equal(engine.state.size, 100);
    assert.equal(game.ui.modal, true, 'a confirmação continua esperando uma nova ação');
    if (activation === 'mouse') {
      document.listeners.pointerdown(event);
      document.listeners.pointerup({ ...event, buttons: 0 });
      document.listeners.click({ target: button, detail: 1 });
    } else document.listeners.click({ target: button, detail: 0 });
    assert.equal(engine.state.year, 2, `${activation}: uma nova confirmação continua funcionando`);
    assert.equal(engine.state.size, 1);
    assert.equal(game.ui.modal, false);
  }
});

test('soltar espaço depois de interromper a confirmação não começa o novo ano', async () => {
  for (const interruption of ['suspend', 'blur', 'hide']) {
    let game;
    const { document, run } = boot({ __gravador: api => { game = api; } });
    await Promise.resolve();
    const engine = game.engine();
    while (engine.state.size < 100) engine.addFame(engine.fameNeed() - engine.state.fame);
    document.listeners.click({ detail: 0,
      target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'ano-novo' } }) } });
    const dialog = document.querySelector('#janela');
    const button = { tagName: 'BUTTON', dataset: { action: 'ano-novo-sim' }, disabled: false,
      closest: selector => selector === 'button[data-action]' || selector === '[data-action]' ? button
        : selector.includes('[role="dialog"]') ? dialog : null };
    const key = (type, repeat = false) => {
      let prevented = false;
      document.listeners[type]?.({ key: ' ', target: button, repeat,
        preventDefault() { prevented = true; } });
      return prevented;
    };
    const release = () => {
      // Assim como o botão nativo, a ativação acontece depois do keyup se ele não foi cancelado.
      if (!key('keyup')) document.listeners.click({ target: button, detail: 0 });
    };
    assert.equal(key('keydown'), false, 'a tecla inicial continua sob o controle do botão nativo');
    if (interruption === 'suspend') run('salvar');
    if (interruption === 'blur') run({ foco: false, focusRequest: game.ui.focusRequest });
    if (interruption === 'hide') run({ settings: { revision: 1, hidden: true } });
    assert.equal(key('keydown', true), true, 'a repetição da tecla interrompida também fica cancelada');
    release();
    assert.equal(engine.state.year, 1, `${interruption}: soltar a tecla antiga não confirma o ano novo`);
    assert.equal(engine.state.size, 100);
    assert.equal(game.ui.modal, true);
    if (interruption === 'hide') run({ settings: { revision: 2, hidden: false } });
    assert.equal(key('keydown'), false, 'pressionar espaço de novo inicia uma confirmação válida');
    document.listeners.pointermove({ buttons: 0, clientX: 20, clientY: 20 });
    release();
    assert.equal(engine.state.year, 2, 'a confirmação nova funciona mesmo se o mouse se mover sem botões');
    assert.equal(engine.state.size, 1);
    assert.equal(game.ui.modal, false);
  }
});

test('uma ativação por espaço interrompida ou sem clique libera o redesenho pendente', async () => {
  for (const completion of ['no-click', 'suspend', 'blur', 'hide', 'escape']) {
    let game;
    const frames = [], timeouts = [];
    const { document, run } = boot({ __gravador: api => { game = api; },
      requestAnimationFrame: fn => frames.push(fn),
      setTimeout: fn => { timeouts.push(fn); return timeouts.length; } });
    await Promise.resolve();
    document.listeners.click({ detail: 0,
      target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'fechar-janela' } }) } });
    const placa = document.querySelector('#placa');
    let connected = true, html = placa.innerHTML;
    Object.defineProperty(placa, 'innerHTML', { get: () => html,
      set: value => { html = value; connected = false; } });
    const button = { tagName: 'BUTTON', dataset: { action: 'vitrine' }, disabled: false,
      closest: selector => selector === 'button[data-action]' || selector === '[data-action]' ? button : null };
    placa.contains = element => element === button;
    document.listeners.keydown({ key: ' ', target: button, repeat: false, preventDefault() {} });
    game.engine().state.mail.ready++;
    frames.shift()(1250);
    assert.equal(connected, true, 'a tecla preserva o controle enquanto o aviso aguarda');
    if (completion === 'no-click') {
      // Tab ou um controle desabilitado pode impedir o clique nativo depois do keyup.
      document.activeElement = document.body;
      document.listeners.keyup({ key: ' ', target: document.body, preventDefault() {} });
      timeouts.at(-1)();
    }
    if (completion === 'suspend') run('salvar');
    if (completion === 'blur') run({ foco: false, focusRequest: game.ui.focusRequest });
    if (completion === 'hide') run({ settings: { revision: 1, hidden: true } });
    if (completion === 'escape') document.listeners.keydown({ key: 'Escape', target: button });
    assert.equal(game.ui.spacePress, null, `${completion}: o botão não deixa a tecla presa`);
    assert.equal(connected, false, `${completion}: a atualização pendente volta a aparecer`);
    assert.equal(game.ui.dock.open, false, 'encerrar a tecla não executa a ação');
  }
});

test('soltar o botão direito ou do meio não cancela uma confirmação iniciada por espaço', async () => {
  for (const mouseButton of [1, 2]) {
    let game;
    const { document } = boot({ __gravador: api => { game = api; } });
    await Promise.resolve();
    const engine = game.engine();
    while (engine.state.size < 100) engine.addFame(engine.fameNeed() - engine.state.fame);
    document.listeners.click({ detail: 0,
      target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'ano-novo' } }) } });
    const dialog = document.querySelector('#janela');
    const button = { tagName: 'BUTTON', dataset: { action: 'ano-novo-sim' }, disabled: false,
      closest: selector => selector === 'button[data-action]' || selector === '[data-action]' ? button
        : selector.includes('[role="dialog"]') ? dialog : null };
    document.listeners.pointerdown({ target: button, button: mouseButton, buttons: mouseButton === 1 ? 4 : 2 });
    document.listeners.keydown({ key: ' ', target: button, repeat: false, preventDefault() {} });
    assert.ok(game.ui.spacePress);
    assert.equal(game.ui.press, null, 'o botão secundário não começou um clique esquerdo');
    document.listeners.pointerup({ target: button, button: mouseButton, buttons: 0 });
    let prevented = false;
    document.listeners.keyup({ key: ' ', target: button, preventDefault() { prevented = true; } });
    if (!prevented) document.listeners.click({ target: button, detail: 0 });
    assert.equal(engine.state.year, 2, `${mouseButton}: a confirmação continua pertencendo à tecla Espaço`);
    assert.equal(engine.state.size, 1);
    assert.equal(game.ui.modal, false);
    assert.equal(game.ui.spacePress, null);
  }
});

test('fechar uma janela libera o clique no ponto transparente mesmo com o cursor parado', async () => {
  for (const mode of ['mouse', 'keyboard', 'escape']) {
    let game;
    const { document, calls, run } = boot({ __gravador: api => { game = api; } });
    await Promise.resolve();
    document.listeners.click({ detail: 0, target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'fechar-janela' } }) } });
    document.listeners.click({ detail: 0, target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'vitrine' } }) } });
    const dock = document.querySelector('#vitrine');
    const button = { tagName: 'BUTTON', dataset: { action: 'vitrine-fechar' }, closest(selector) {
      if (selector === '[data-action]' || selector.split(',').some(value => value.trim() === 'button')) return this;
      return selector === '#vitrine' || selector === '.ui' ? dock : null;
    } };
    document.elementFromPoint = () => dock.hidden ? null : button;
    if (mode === 'mouse') document.listeners.pointerdown({ target: button, button: 0, clientX: 20, clientY: 20, preventDefault() {} });
    run({ cursor: { x: 20, y: 20, interactive: true, focused: true, focusRequest: game.ui.focusRequest } });
    if (mode === 'mouse') document.listeners.pointerup({ target: button, button: 0, clientX: 20, clientY: 20 });
    if (mode === 'escape') document.listeners.keydown({ key: 'Escape', target: document.body });
    else document.listeners.click({ target: button, detail: mode === 'keyboard' ? 0 : 1,
      clientX: mode === 'keyboard' ? 0 : 20, clientY: mode === 'keyboard' ? 0 : 20 });
    assert.equal(dock.hidden, true);
    assert.equal(game.ui.interactive, false, `${mode}: o lugar que a janela deixou vazio volta a passar o clique`);
    assert.equal(calls.filter(call => call[0] === 'interactive').at(-1)[1], false);
    assert.equal(game.ui.press, null);
  }
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

test('Espaço pode rolar a ajuda da Casa e dos minijogos sem lançar Argolas ao fundo', async () => {
  let game;
  let throws = 0;
  const { document } = boot({ __gravador: api => { game = api; } });
  await Promise.resolve();
  game.ui.rings = { open: true, playing: true, result: null };
  game.ui.game = { throwRing() { throws++; return true; } };
  for (const action of ['casa-ajuda', 'mini-ajuda']) {
    const help = { dataset: { action }, className: 'ajuda-painel' };
    help.closest = query => query.split(',').some(selector => selector.trim() === '.ajuda-painel') ? help : null;
    let prevented = false;
    document.listeners.keydown({ key: ' ', target: help, preventDefault() { prevented = true; } });
    assert.equal(prevented, false, action + ': o navegador conserva a rolagem por teclado');
    assert.equal(throws, 0, action + ': a rodada ao fundo não recebe um arremesso');
  }
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

test('um segundo toque não inicia compras nem substitui o gesto em andamento', async () => {
  let game;
  const { document } = boot({ __gravador: api => { game = api; } });
  await Promise.resolve();
  const engine = game.engine();
  engine.state.cheer = 1e6;
  const handle = { closest: selector => selector === '[data-action="zoom-alca"]' ? handle : null };
  document.listeners.pointerdown({ target: handle, button: 0, pointerType: 'touch', pointerId: 2, isPrimary: true,
    clientX: 100, clientY: 100, preventDefault() {} });
  const drag = game.ui.drag, tickets = engine.state.tickets;
  const button = { dataset: { hold: 'ficha' }, disabled: false, querySelector: () => null };
  button.closest = selector => selector === '[data-hold]' ? button : null;
  document.listeners.pointerdown({ target: button, button: 0, pointerType: 'touch', pointerId: 3, isPrimary: false,
    clientX: 500, clientY: 100, preventDefault() {} });
  assert.equal(engine.state.tickets, tickets, 'o segundo dedo não compra uma ficha durante o arrasto');
  assert.equal(game.ui.hold, null);
  assert.equal(game.ui.drag, drag);
  document.listeners.pointerup({ button: 0, isPrimary: true });
});

test('movimento e fim de um segundo toque não alteram nem encerram o primeiro arrasto', async () => {
  for (const ending of ['pointerup', 'pointercancel']) for (const buttons of [1, 0]) {
    let game;
    const { document } = boot({ __gravador: api => { game = api; } });
    await Promise.resolve();
    const handle = { closest: selector => selector === '[data-action="zoom-alca"]' ? handle : null };
    document.listeners.pointerdown({ target: handle, button: 0, isPrimary: true, pointerType: 'touch', pointerId: 2,
      clientX: 100, clientY: 100, preventDefault() {} });
    const drag = game.ui.drag, zoom = game.ui.settings.zoom;
    document.listeners.pointermove({ target: handle, button: 0, buttons, isPrimary: false, pointerType: 'touch', pointerId: 3,
      clientX: 500, clientY: 100 });
    assert.equal(game.ui.settings.zoom, zoom, 'mover o segundo dedo não muda o tamanho');
    assert.equal(game.ui.drag, drag);
    document.listeners[ending]({ target: handle, button: 0, buttons: 0, isPrimary: false, pointerType: 'touch', pointerId: 3 });
    assert.equal(game.ui.drag, drag, ending + ': o arrasto do primeiro dedo continua ativo');
    document.listeners.pointermove({ target: handle, button: 0, buttons: 1, isPrimary: true, pointerType: 'touch', pointerId: 2,
      clientX: 120, clientY: 100 });
    assert.ok(game.ui.settings.zoom > zoom, 'o primeiro dedo continua alterando o tamanho');
    document.listeners.pointerup({ target: handle, button: 0, buttons: 0, isPrimary: true, pointerType: 'touch', pointerId: 2 });
    assert.equal(game.ui.drag, null);
  }
});

test('um segundo toque não interrompe uma compra segurada pelo primeiro', async () => {
  for (const interruption of ['pointermove', 'pointerup', 'pointercancel']) {
    let game;
    const timeouts = [], intervals = new Map();
    let nextInterval = 1;
    const { document } = boot({ __gravador: api => { game = api; },
      setTimeout: (fn, ms) => { timeouts.push({ fn, ms }); return timeouts.length; }, clearTimeout() {},
      setInterval: fn => { const id = nextInterval++; intervals.set(id, fn); return id; },
      clearInterval: id => intervals.delete(id) });
    await Promise.resolve();
    const engine = game.engine();
    engine.state.cheer = 1e6;
    const button = { dataset: { hold: 'ficha' }, disabled: false, querySelector: () => null };
    button.closest = selector => selector === '[data-hold]' ? button : null;
    const first = { target: button, button: 0, isPrimary: true, pointerType: 'touch', pointerId: 2,
      clientX: 100, clientY: 100, preventDefault() {} };
    document.listeners.pointerdown(first);
    timeouts.findLast(timeout => timeout.ms === 380).fn();
    const repeat = [...intervals.values()].at(-1), hold = game.ui.hold, tickets = engine.state.tickets;
    document.listeners[interruption]({ ...first, buttons: 0, isPrimary: false, pointerId: 3 });
    assert.equal(game.ui.hold, hold, interruption + ': o segundo dedo não encerra a compra do primeiro');
    repeat();
    assert.equal(engine.state.tickets, tickets + 1);
    document.listeners.pointerup({ ...first, buttons: 0 });
    assert.equal(game.ui.hold, null);
    repeat();
    assert.equal(engine.state.tickets, tickets + 1, 'soltar o primeiro dedo encerra a repetição');
    document.listeners.pointerdown(first);
    document.listeners.pointerup({ ...first, buttons: 0 });
    assert.equal(engine.state.tickets, tickets + 2, 'uma compra nova continua funcionando');
  }
});

test('mouse, toque e caneta não alteram nem encerram um arrasto iniciado por outro dispositivo', async () => {
  const devices = [['mouse', 1], ['touch', 2], ['pen', 3]];
  for (const [pointerType, pointerId] of devices) for (const [otherType, otherId] of devices) {
    if (pointerType === otherType) continue;
    let game;
    const { document } = boot({ __gravador: api => { game = api; }, clearInterval() {} });
    await Promise.resolve();
    const engine = game.engine();
    engine.state.cheer = 1e6;
    const handle = { closest: selector => selector === '[data-action="zoom-alca"]' ? handle : null };
    const event = { target: handle, button: 0, buttons: 1, pointerType, pointerId, isPrimary: true,
      clientX: 100, clientY: 100, preventDefault() {} };
    document.listeners.pointerdown(event);
    const drag = game.ui.drag, zoom = game.ui.settings.zoom, tickets = engine.state.tickets;
    for (const buttons of [0, 1]) document.listeners.pointermove({ ...event, pointerType: otherType, pointerId: otherId,
      clientX: 400, clientY: 300, buttons });
    assert.equal(game.ui.drag, drag, `${pointerType}/${otherType}: outro dispositivo não cancela o arrasto`);
    assert.equal(game.ui.settings.zoom, zoom);
    const buy = { dataset: { hold: 'ficha' }, disabled: false, querySelector: () => null };
    buy.closest = selector => selector === '[data-hold]' ? buy : null;
    const foreign = { ...event, target: buy, pointerType: otherType, pointerId: otherId };
    document.listeners.pointerdown(foreign);
    document.listeners.pointerup({ ...foreign, buttons: 0 });
    document.listeners.pointercancel(foreign);
    assert.equal(engine.state.tickets, tickets, 'o ponteiro de outro dispositivo não começa uma compra');
    assert.equal(game.ui.hold, null);
    assert.equal(game.ui.drag, drag);
    document.listeners.pointermove({ ...event, clientX: 120 });
    assert.ok(game.ui.settings.zoom > zoom, 'o ponteiro original continua mudando o tamanho');
    document.listeners.pointerup({ ...event, clientX: 120, buttons: 0 });
    assert.equal(game.ui.drag, null);
    document.listeners.pointerdown(foreign);
    document.listeners.pointerup({ ...foreign, buttons: 0 });
    assert.equal(engine.state.tickets, tickets + 1, 'um gesto novo do outro dispositivo continua funcionando');
  }
});

test('um clique de outro dispositivo ignorado durante o arrasto não compra ao chegar depois da soltura', async () => {
  for (const releaseFirst of [false, true]) {
    let game;
    const { document } = boot({ __gravador: api => { game = api; } });
    await Promise.resolve();
    const engine = game.engine();
    engine.state.tickets = 100;
    const handle = { closest: selector => selector === '[data-action="zoom-alca"]' ? handle : null };
    const owner = { target: handle, button: 0, buttons: 1, pointerType: 'touch', pointerId: 2, isPrimary: true,
      clientX: 100, clientY: 100, preventDefault() {} };
    const card = { tagName: 'DIV', dataset: { action: 'vitrine-item', id: 'lenco-chita' }, disabled: false };
    card.closest = selector => selector === '[data-action]' ? card : null;
    const foreign = { ...owner, target: card, pointerType: 'mouse', pointerId: 1 };
    document.listeners.pointerdown(owner);
    document.listeners.pointerdown(foreign);
    if (releaseFirst) document.listeners.pointerup({ ...owner, buttons: 0 });
    document.listeners.pointerup({ ...foreign, buttons: 0 });
    document.listeners.click({ ...foreign, buttons: 0, detail: 1, isPrimary: false });
    assert.equal(engine.owned('lenco-chita'), false, 'o clique cujo início foi ignorado não compra o cartão');
    assert.equal(engine.state.tickets, 100);
    if (!releaseFirst) document.listeners.pointerup({ ...owner, buttons: 0 });
    document.listeners.pointerdown(foreign);
    document.listeners.pointerup({ ...foreign, buttons: 0 });
    document.listeners.click({ ...foreign, buttons: 0, detail: 1, isPrimary: false });
    assert.equal(engine.owned('lenco-chita'), true, 'um clique novo do mouse continua comprando');
    assert.equal(engine.state.tickets, 100 - engine.items['lenco-chita'].price);
  }
});

test('mover e soltar outro dispositivo não interrompe a repetição da compra do ponteiro original', async () => {
  for (const pointerType of ['mouse', 'touch', 'pen']) {
    let game;
    const timeouts = [], intervals = new Map();
    const { document } = boot({ __gravador: api => { game = api; },
      setTimeout: (fn, ms) => { timeouts.push({ fn, ms }); return timeouts.length; }, clearTimeout() {},
      setInterval: fn => { const id = intervals.size + 1; intervals.set(id, fn); return id; },
      clearInterval: id => intervals.delete(id) });
    await Promise.resolve();
    const engine = game.engine();
    engine.state.cheer = 1e6;
    const button = { dataset: { hold: 'ficha' }, disabled: false, querySelector: () => null };
    button.closest = selector => selector === '[data-hold]' ? button : null;
    const owner = { target: button, button: 0, buttons: 1, pointerType, pointerId: 2, isPrimary: true,
      clientX: 100, clientY: 100, preventDefault() {} };
    document.listeners.pointerdown(owner);
    timeouts.findLast(entry => entry.ms === 380).fn();
    const repeat = [...intervals.values()].at(-1), held = game.ui.hold, tickets = engine.state.tickets;
    const foreign = { ...owner, pointerType: pointerType === 'mouse' ? 'touch' : 'mouse', pointerId: 5, buttons: 0 };
    document.listeners.pointermove(foreign);
    document.listeners.pointerup(foreign);
    document.listeners.pointercancel(foreign);
    assert.equal(game.ui.hold, held, 'a repetição continua pertencendo ao ponteiro que apertou o botão');
    repeat();
    assert.equal(engine.state.tickets, tickets + 1);
    document.listeners.pointerup({ ...owner, buttons: 0 });
    repeat();
    assert.equal(engine.state.tickets, tickets + 1, 'a soltura original encerra a repetição');
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

test('toggles rápidos da casa e da fixação acompanham o último clique antes da resposta IPC', async () => {
  const settings = require('../src/settings.js');
  let current = settings.normalizeSettings({});
  const pending = [];
  let game;
  const { document } = boot({ __gravador: api => { game = api; } }, {
    getSettings: () => Promise.resolve(settings.publicSettings(current)),
    updateSettings: partial => {
      current = settings.mergeSettings(current, partial);
      const snapshot = settings.publicSettings(current);
      return new Promise(resolve => pending.push(() => resolve(snapshot)));
    }
  });
  await Promise.resolve();
  const click = action => document.listeners.click({ target: { closest: () => ({ tagName: 'BUTTON', dataset: { action } }) } });
  for (const action of ['fixar', 'casa']) {
    click(action);
    click(action);
  }
  assert.equal(current.pinned, true, 'dois cliques voltam à fixação inicial');
  assert.equal(current.casaHidden, false, 'dois cliques voltam à casa visível');
  pending[3]();
  await Promise.resolve();
  pending[0](); pending[1](); pending[2]();
  await Promise.resolve();
  assert.equal(game.ui.settings.pinned, true);
  assert.equal(game.ui.settings.casaHidden, false, 'respostas antigas não desfazem o último clique');
});

test('carregar as preferências não desfaz uma escolha feita enquanto a leitura estava pendente', async () => {
  const settings = require('../src/settings.js');
  const current = settings.normalizeSettings({ pinned: true, zoom: 1.5, sound: false });
  let resolveInitial;
  let resolveUpdate;
  let game;
  const { document } = boot({ __gravador: api => { game = api; } }, {
    getSettings: () => new Promise(resolve => { resolveInitial = resolve; }),
    updateSettings: partial => new Promise(resolve => {
      resolveUpdate = () => resolve(settings.publicSettings(settings.mergeSettings(current, partial)));
    })
  });
  document.listeners.click({ target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'fixar' } }) } });
  assert.equal(game.ui.settings.pinned, false);
  resolveUpdate();
  await Promise.resolve();
  resolveInitial(settings.publicSettings(current));
  await Promise.resolve();
  assert.equal(game.ui.settings.pinned, false, 'a leitura anterior ao clique fica para trás');
  assert.equal(game.ui.settings.zoom, 1.5, 'a resposta nova conserva as outras preferências do desktop');
  assert.equal(game.ui.settings.sound, false);
});

test('uma resposta de ajustes durante o arrasto conserva a posição até o soltar persistir', async () => {
  const Settings = require('../src/settings.js');
  let current = Settings.normalizeSettings({ x: 0.7 });
  let resolveSettings;
  let game;
  const updates = [];
  const { document } = boot({ __gravador: api => { game = api; } }, {
    getSettings: () => Promise.resolve(Settings.publicSettings(current)),
    updateSettings: partial => {
      updates.push(partial);
      current = Settings.mergeSettings(current, partial);
      const snapshot = Settings.publicSettings(current);
      return new Promise(resolve => { resolveSettings = () => resolve(snapshot); });
    }
  });
  await Promise.resolve();
  document.listeners.click({ target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'fixar' } }) } });
  const canvas = { closest: selector => selector === '#festa-canvas' ? {} : null, matches: () => false };
  document.elementFromPoint = () => canvas;
  document.listeners.pointerdown({ target: canvas, button: 0, clientX: 100, clientY: 100, preventDefault() {} });
  document.listeners.pointermove({ clientX: 260, clientY: 70, buttons: 1 });
  const position = { x: game.ui.settings.x, lift: game.ui.settings.lift };
  assert.notEqual(position.x, 0.7, 'o gesto moveu a festa');
  resolveSettings();
  await Promise.resolve();
  assert.equal(game.ui.settings.x, position.x, 'a resposta não devolve a festa ao lugar anterior');
  assert.equal(game.ui.settings.lift, position.lift);
  document.listeners.pointerup({ button: 0, buttons: 0 });
  assert.equal(updates.at(-1).x, position.x, 'soltar grava a posição final do gesto');
  assert.equal(updates.at(-1).lift, position.lift);
});

test('uma resposta de ajustes durante a edição do volume conserva o áudio que a barra acabou de aplicar', async () => {
  const Settings = require('../src/settings.js');
  const current = Settings.normalizeSettings({ volume: 0.5 });
  let resolveSettings;
  let game;
  const volumes = [];
  const som = { set: value => { if (value.volume !== undefined) volumes.push(value.volume); }, setMusic() {}, unlock() {}, play() {} };
  const { document } = boot({ ArraiaSom: { create: () => som }, __gravador: api => { game = api; } }, {
    getSettings: () => Promise.resolve(Settings.publicSettings(current)),
    updateSettings: partial => new Promise(resolve => {
      resolveSettings = () => resolve(Settings.publicSettings(Settings.mergeSettings(current, partial)));
    })
  });
  await Promise.resolve();
  document.listeners.click({ target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'fixar' } }) } });
  const volume = { id: 'volume', value: '80', matches: () => true, closest: () => null };
  document.activeElement = volume;
  document.listeners.pointerdown({ target: volume, button: 0, clientX: 100, clientY: 100 });
  document.listeners.input({ target: volume });
  assert.equal(volumes.at(-1), 0.8);
  resolveSettings();
  await Promise.resolve();
  assert.equal(game.ui.settings.volume, 0.8);
  assert.equal(volumes.at(-1), 0.8, 'a resposta não devolve o som ao volume anterior no meio da edição');
});

test('interromper a barra de volume grava o ajuste aplicado mesmo sem receber change ou soltar', async () => {
  const Settings = require('../src/settings.js');
  for (const interruption of ['close', 'suspend', 'blur', 'escape', 'cancel', 'buttons']) {
    let current = Settings.normalizeSettings({ volume: 0.5 });
    let game;
    const updates = [];
    const volumes = [];
    const som = { set: value => { if (value.volume !== undefined) volumes.push(value.volume); }, setMusic() {}, unlock() {}, play() {} };
    const { document, run, windowListeners } = boot({ ArraiaSom: { create: () => som }, __gravador: api => { game = api; } }, {
      getSettings: () => Promise.resolve(Settings.publicSettings(current)),
      updateSettings: partial => {
        updates.push(partial);
        current = Settings.mergeSettings(current, partial);
        return Promise.resolve(Settings.publicSettings(current));
      }
    });
    await Promise.resolve();
    const range = { id: 'volume', value: '80', matches: selector => selector === 'input[type="range"]', closest: () => null };
    document.activeElement = range;
    document.listeners.pointerdown({ target: range, button: 0, clientX: 100, clientY: 100 });
    document.listeners.input({ target: range });
    assert.equal(game.ui.settings.volume, 0.8);
    assert.equal(current.volume, 0.5, 'durante a edição a preferência ainda não foi enviada');
    if (interruption === 'close') windowListeners.beforeunload({ type: 'beforeunload' });
    if (interruption === 'suspend') run('salvar');
    if (interruption === 'blur') run({ foco: false, focusRequest: game.ui.focusRequest });
    if (interruption === 'escape') document.listeners.keydown({ key: 'Escape', target: range });
    if (interruption === 'cancel') document.listeners.pointercancel({});
    if (interruption === 'buttons') document.listeners.pointermove({ buttons: 0, clientX: 120, clientY: 100 });
    assert.equal(game.ui.drag, null);
    assert.equal(current.volume, 0.8, `${interruption}: a preferência conserva o áudio já aplicado`);
    assert.equal(updates.filter(partial => 'volume' in partial).length, 1);
    document.activeElement = document.body;
    await Promise.resolve();
    await Promise.resolve();
    document.listeners.pointerup({ button: 0, buttons: 0, target: range });
    assert.equal(updates.filter(partial => 'volume' in partial).length, 1, 'um soltar atrasado não repete a gravação');
    document.listeners.click({ detail: 0, target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'fixar' } }) } });
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(game.ui.settings.volume, 0.8, 'a próxima resposta do desktop não devolve o volume antigo');
    assert.equal(volumes.at(-1), 0.8);
    let reopened;
    boot({ __gravador: api => { reopened = api; } }, { getSettings: () => Promise.resolve(Settings.publicSettings(current)) });
    await Promise.resolve();
    assert.equal(reopened.ui.settings.volume, 0.8, 'a próxima sessão recupera a preferência');
  }
});

test('esconder a festa silencia os efeitos em andamento e mostrar respeita as opções de áudio', async () => {
  const Settings = require('../src/settings.js');
  const Som = require('../src/som.js');
  const { AudioContext, log } = fakeAudio();
  const timers = new Map();
  let nextTimer = 1;
  let som;
  let game;
  const { run } = boot({ __gravador: api => { game = api; }, ArraiaSom: { create: options => {
    som = Som.create({ ...options, AudioContext,
      setInterval: fn => { const id = nextTimer++; timers.set(id, fn); return id; },
      clearInterval: id => timers.delete(id) });
    return som;
  } } });
  await Promise.resolve();
  let revision = 0;
  let settings = Settings.normalizeSettings({ volume: 0.8, music: true });
  const update = partial => {
    settings = Settings.mergeSettings(settings, partial);
    run({ settings: { ...Settings.publicSettings(settings), revision: ++revision } });
  };
  update({});
  assert.equal(som.play('trovao'), true, 'há um efeito longo já agendado');
  const master = log.gains[0];
  const oldMusicBus = log.gains[1];
  assert.ok(log.noises > 0);
  update({ hidden: true });
  assert.equal(master.gain.targets.at(-1), 0, 'esconder silencia também os efeitos que já estavam tocando');
  assert.equal(timers.size, 0);
  assert.equal(game.ui.settings.sound, true, 'a preferência do jogador é conservada');
  update({ hidden: false });
  assert.equal(master.gain.targets.at(-1), 0.8 * 0.8 * 0.9);
  assert.equal(timers.size, 1, 'a música volta se estava escolhida');
  assert.equal(oldMusicBus.gain.targets.at(-1), 0, 'a sequência antiga não volta a tocar');
  update({ sound: false });
  update({ hidden: true });
  update({ hidden: false });
  assert.equal(master.gain.targets.at(-1), 0, 'mostrar não liga o som que o jogador desligou');
  assert.equal(timers.size, 0);
});

test('trocar o idioma preserva a sessão quando salvar falha', async () => {
  const { document, calls } = boot({}, { saveGame: () => false });
  await Promise.resolve();
  document.listeners.click({ target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'idioma', value: 'es' } }) } });
  assert.equal(calls.some(call => call[0] === 'language'), false, 'a janela não deve ser substituída sem gravar o progresso');
  assert.match(document.nodes.get('#avisos').children.map(node => node.textContent).join('|'), /salvar/i);
});

test('importar JSON sem um objeto de save não reinicia a festa nem pede confirmação', async () => {
  for (const raw of [null, false, 0, '', []]) {
    let game;
    let confirmations = 0;
    const { document, calls } = boot({ __gravador: api => { game = api; },
      confirm: () => { confirmations++; return true; } });
    await Promise.resolve();
    const original = game.engine();
    original.state.cheer = 321;
    original.state.name = 'Festa existente';
    const target = { value: 'save.json', files: [{ text: async () => JSON.stringify(raw) }] };
    await document.querySelector('#importar').listeners.change({ target });
    assert.equal(game.engine(), original, `${JSON.stringify(raw)}: o save inválido preserva o motor atual`);
    assert.equal(original.state.cheer, 321);
    assert.equal(original.state.name, 'Festa existente');
    assert.equal(confirmations, 0, 'a confirmação só aparece depois de validar um save real');
    assert.equal(calls.some(call => call[0] === 'save'), false, 'a importação recusada não sobrescreve o save atual');
    assert.match(document.querySelector('#avisos').children.map(node => node.textContent).join('|'), /não é um save válido/i);
    assert.equal(target.value, '');
  }
});

test('importar níveis impossíveis preserva a festa atual antes de abrir a confirmação ou salvar', async () => {
  let game;
  let confirmations = 0;
  const { document, calls } = boot({ __gravador: api => { game = api; }, confirm: () => { confirmations++; return true; } });
  await Promise.resolve();
  const original = game.engine();
  original.rename('Festa existente');
  original.state.cheer = 321;
  const saved = original.exportState();
  saved.levels.folego = saved.levels.ritmo = 1e100;
  const target = { value: 'save.json', files: [{ text: async () => JSON.stringify(saved) }] };
  await document.querySelector('#importar').listeners.change({ target });
  assert.equal(game.engine(), original, 'o motor que desenha e recebe os cliques continua sendo o da festa existente');
  assert.equal(original.state.cheer, 321);
  assert.equal(original.state.name, 'Festa existente');
  assert.equal(confirmations, 0, 'o arquivo inválido não oferece substituir a festa atual');
  assert.equal(calls.some(call => call[0] === 'save'), false, 'o arquivo inválido não sobrescreve a festa atual');
  assert.match(document.querySelector('#avisos').children.map(node => node.textContent).join('|'), /não é um save válido/i);
  assert.equal(target.value, '');
});

test('uma importação que não pode ser salva preserva a partida, a rodada e o snapshot da sessão', async () => {
  const { writeSave, loadSave } = require('../desktop/save-store');
  for (const failure of ['return-false', 'throw', 'io', 'size-limit']) {
    const directory = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'game-import-failure-'));
    const filename = path.join(directory, 'save.json');
    const blocked = path.join(directory, 'blocked');
    fs.writeFileSync(blocked, 'Este arquivo impede criar o diretório de gravação da auditoria.');
    let game, session;
    const attempts = [];
    const saveGame = state => {
      attempts.push(state.name);
      if (state.name === 'Festa do arquivo' && ['return-false', 'throw'].includes(failure)) {
        session = JSON.parse(JSON.stringify(state));
        if (failure === 'throw') throw new Error('A gravação falhou.');
        return false;
      }
      try {
        return writeSave(failure === 'io' ? path.join(blocked, 'save.json') : filename, state, undefined, snapshot => { session = snapshot; });
      } catch (_) { return false; }
    };
    try {
      const { document, windowListeners } = boot({ __gravador: api => { game = api; } }, { saveGame });
      await Promise.resolve();
      const original = game.engine();
      original.rename('Festa atual');
      original.state.tickets = 123;
      const round = original.startRings();
      assert.ok(round);
      game.ui.rings = { open: true, playing: true, result: null };
      const previous = original.exportState();
      assert.equal(writeSave(filename, previous, undefined, snapshot => { session = snapshot; }), true);
      const incoming = new core.GameEngine(data).exportState();
      incoming.name = 'Festa do arquivo';
      if (failure === 'size-limit') incoming.log = [{ t: 0, type: 'comeco', padding: 'x'.repeat(2 * 1024 * 1024) }];
      const target = { value: 'save.json', files: [{ text: async () => JSON.stringify(incoming) }] };
      await document.querySelector('#importar').listeners.change({ target });
      assert.equal(game.engine() === original, true, failure + ': a festa atual continua recebendo as ações');
      assert.equal(original.round === round, true, failure + ': a importação recusada conserva a rodada');
      assert.equal(game.ui.rings.playing, true);
      assert.equal(session.name, previous.name, failure + ': a próxima janela receberá o save atual');
      assert.equal(session.tickets, previous.tickets);
      assert.equal(session.rings.held, round.cost);
      assert.equal(loadSave(filename).name, previous.name, 'o arquivo anterior continua intacto');
      assert.deepEqual(attempts, ['Festa do arquivo', 'Festa atual']);
      const notices = document.querySelector('#avisos').children.map(node => node.textContent).join('|');
      assert.match(notices, /festa atual foi mantida/i);
      assert.doesNotMatch(notices, /Festa importada\./);
      assert.equal(target.value, '');
      const count = attempts.length;
      windowListeners.beforeunload({ type: 'beforeunload' });
      assert.equal(attempts.length, count + 1, 'o evento de saída grava o motor atual');
      assert.equal(session.name, previous.name);
    } finally {
      for (const name of ['save.json', 'save.json.bak', 'save.json.tmp', 'save.json.bak.tmp', 'blocked']) {
        const ownedFile = path.join(directory, name);
        if (fs.existsSync(ownedFile)) fs.unlinkSync(ownedFile);
      }
      fs.rmdirSync(directory);
    }
  }
});

test('reiniciar sem conseguir salvar mantém a festa e cancela a importação anterior ainda em leitura', async () => {
  for (const failure of ['return-false', 'throw']) {
    let game, session, finishRead;
    let confirmations = 0;
    const attempts = [];
    const { document } = boot({ __gravador: api => { game = api; },
      confirm: () => { confirmations++; return true; } }, { saveGame: state => {
        attempts.push(state.name);
        session = JSON.parse(JSON.stringify(state));
        if (state.name === 'Mandioca') {
          if (failure === 'throw') throw new Error('A gravação da festa reiniciada falhou.');
          return false;
        }
        return true;
      } });
    await Promise.resolve();
    const original = game.engine();
    original.rename('Festa atual');
    original.state.tickets = 123;
    const round = original.startRings();
    game.ui.rings = { open: true, playing: true, result: null };
    game.ui.tab = 'ajustes';
    const target = document.querySelector('#importar');
    target.value = 'arquivo.json';
    target.files = [{ text: () => new Promise(resolve => { finishRead = resolve; }) }];
    const reading = document.querySelector('#importar').listeners.change({ target });
    document.listeners.click({ detail: 0, target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'reiniciar' } }) } });
    assert.equal(game.engine() === original, true, failure + ': a festa atual continua aberta');
    assert.equal(original.round === round, true);
    assert.equal(game.ui.rings.playing, true);
    assert.equal(game.ui.tab, 'ajustes');
    assert.equal(session.name, original.state.name, 'o snapshot da sessão também volta à festa atual');
    assert.equal(session.tickets, original.state.tickets);
    assert.equal(session.rings.held, round.cost);
    assert.deepEqual(attempts, ['Mandioca', 'Festa atual']);
    assert.equal(target.value, '', 'o mesmo arquivo pode ser selecionado novamente');
    assert.match(document.querySelector('#avisos').children.map(node => node.textContent).join('|'), /reiniciar.*festa atual foi mantida/i);
    const incoming = new core.GameEngine(data).exportState();
    incoming.name = 'Arquivo anterior ao reinício';
    finishRead(JSON.stringify(incoming));
    await reading;
    assert.equal(confirmations, 1, 'a leitura anterior não pede outra confirmação após o pedido de reinício');
    assert.equal(game.engine() === original, true);
    assert.equal(attempts.length, 2, 'a leitura abandonada não chega ao save');
  }
});

test('importar uma devolução de leilão que estoura o saldo preserva a festa e não grava o arquivo', async () => {
  let game;
  let confirmations = 0;
  const { document, calls } = boot({ __gravador: api => { game = api; }, confirm: () => { confirmations++; return true; } });
  await Promise.resolve();
  const original = game.engine();
  original.state.tickets = 12;
  const saved = original.exportState();
  saved.tickets = Number.MAX_VALUE;
  saved.leilao.active = { held: Number.MAX_VALUE };
  const target = { value: 'save.json', files: [{ text: async () => JSON.stringify(saved) }] };
  await document.querySelector('#importar').listeners.change({ target });
  assert.equal(game.engine(), original, 'o saldo infinito não substitui a festa atual');
  assert.equal(original.state.tickets, 12);
  assert.equal(confirmations, 0);
  assert.equal(calls.some(call => call[0] === 'save'), false, 'o arquivo recusado não chega à gravação');
  assert.match(document.querySelector('#avisos').children.map(node => node.textContent).join('|'), /não é um save válido/i);
  assert.equal(target.value, '');
});

test('abrir todo o histórico depois de carregar um registro de casa incompleto mantém os controles funcionando', async () => {
  const source = new core.GameEngine(data);
  source.rename('Casa preservada');
  source.state.cheer = 321;
  const saved = source.exportState();
  saved.log.push({ type: 'casa-comodo', t: 1, room: 0 }, { type: 'casa-morador', t: 2, index: 0 },
    { type: 'casa-comodo', t: 3 }, { type: 'casa-morador', t: 4, index: -1 });
  let game;
  const snapshots = [];
  const { document, run, windowListeners } = boot({ __gravador: api => { game = api; } },
    { loadGame: () => saved, saveGame: state => { snapshots.push(state); return true; } });
  await Promise.resolve();
  const click = dataset => document.listeners.click({ detail: 0,
    target: { closest: () => ({ tagName: 'BUTTON', dataset }) } });
  click({ action: 'fechar-janela' });
  run('painel');
  click({ action: 'tab', tab: 'historico' });
  assert.doesNotThrow(() => click({ action: 'historico-filtro', value: 'tudo' }));
  assert.match(document.querySelector('#painel-corpo').innerHTML, /Macaxeira se mudou para a casa/);
  const engine = game.engine();
  assert.equal(engine.state.name, 'Casa preservada');
  click({ action: 'tab', tab: 'festa' });
  const cost = engine.ticketCost();
  click({ action: 'ficha' });
  assert.equal(engine.state.tickets, 1, 'o clique seguinte continua comprando uma ficha');
  assert.equal(engine.state.cheer, 321 - cost);
  windowListeners.beforeunload();
  assert.deepEqual(snapshots.at(-1).log.filter(entry => entry.type.startsWith('casa-')),
    saved.log.filter(entry => entry.t === 1 || entry.t === 2), 'o save seguinte conserva só os registros válidos da casa');
});

test('importar marcos incompletos e valores inválidos do diário conserva a festa e o histórico utilizável', async () => {
  const source = new core.GameEngine(data);
  source.rename('Diário importado');
  source.state.cheer = 321;
  const state = source.exportState();
  const valid = [...state.log, { type: 'letter', t: 5, tickets: 2 }];
  state.log = [...valid, { type: 'size', t: 6 },
    { type: 'item', t: 7, id: { toString: null, valueOf: null } }];
  let game;
  let confirmations = 0;
  const snapshots = [];
  const { document, run } = boot({ __gravador: api => { game = api; },
    confirm: () => { confirmations++; return true; } },
    { saveGame: state => { snapshots.push(state); return true; } });
  await Promise.resolve();
  const click = dataset => document.listeners.click({ detail: 0,
    target: { closest: () => ({ tagName: 'BUTTON', dataset }) } });
  click({ action: 'fechar-janela' });
  run('painel');
  click({ action: 'tab', tab: 'historico' });
  click({ action: 'historico-filtro', value: 'tudo' });
  const target = { value: 'festa.json', files: [{ text: async () => JSON.stringify(state) }] };
  await document.querySelector('#importar').listeners.change({ target });
  assert.equal(confirmations, 1, 'as entradas opcionais ruins não impedem de importar a festa');
  assert.equal(game.engine().state.name, 'Diário importado');
  assert.equal(game.engine().state.cheer, 321);
  assert.deepEqual(game.engine().state.log, valid);
  assert.deepEqual(snapshots.at(-1).log, valid, 'o arquivo gravado já contém o diário limpo');
  const html = document.querySelector('#painel-corpo').innerHTML;
  assert.doesNotMatch(html, /NaN|Infinity/);
  assert.match(html, /Abriu um correio elegante \(\+2 fichas\)/);
  assert.equal(target.value, '');
  click({ action: 'tab', tab: 'festa' });
  const cost = game.engine().ticketCost();
  click({ action: 'ficha' });
  assert.equal(game.engine().state.tickets, 1, 'a compra seguinte continua recebendo cliques');
  assert.equal(game.engine().state.cheer, 321 - cost);
});

test('importar um resultado de Bingo com prêmio inválido mantém a tela e a compra seguinte funcionando', async () => {
  const source = new core.GameEngine(data, null, { rng: () => 0 });
  source.rename('Bingo importado');
  while (source.state.size < 10) source.addFame(source.fameNeed() - source.state.fame);
  source.state.tickets = 100;
  assert.equal(source.buyBingo(), true);
  while (!source.state.bingo.round.result) source.drawBingo();
  assert.equal(source.state.bingo.round.result, 'bingo');
  const state = source.exportState();
  state.bingo.round.prize = { tickets: { toString: null, valueOf: null }, amount: [] };
  let game;
  let confirmations = 0;
  const snapshots = [];
  const { document } = boot({ __gravador: api => { game = api; },
    confirm: () => { confirmations++; return true; } },
    { saveGame: state => { snapshots.push(state); return true; } });
  await Promise.resolve();
  const click = dataset => document.listeners.click({ detail: 0,
    target: { closest: () => ({ tagName: 'BUTTON', dataset }) } });
  click({ action: 'fechar-janela' });
  const target = { value: 'bingo.json', files: [{ text: async () => JSON.stringify(state) }] };
  await document.querySelector('#importar').listeners.change({ target });
  assert.equal(confirmations, 1);
  assert.equal(game.engine().state.name, 'Bingo importado');
  assert.equal(game.engine().state.tickets, state.tickets);
  assert.equal(game.engine().state.stats.bingos, 1);
  assert.deepEqual(snapshots.at(-1).bingo.round.prize, { tickets: 0, amount: 0 });
  click({ action: 'tela', tela: 'bingo' });
  const body = document.querySelector('#tela-corpo');
  assert.match(body.innerHTML, /data-action="bingo-comprar"/);
  assert.doesNotMatch(body.innerHTML, /NaN|Infinity|\[object Object\]/);
  const cost = game.engine().bingoCost();
  click({ action: 'bingo-comprar' });
  assert.equal(game.engine().state.tickets, state.tickets - cost);
  assert.equal(game.engine().state.bingo.round.result, null);
  assert.equal(game.engine().state.stats.bingoCards, state.stats.bingoCards + 1);
  assert.match(body.innerHTML, /bingo-cartela/);
  assert.equal(target.value, '');
});

test('a importação calcula o tempo fora ao confirmar, incluindo a espera e respeitando o teto do save', async () => {
  for (const scenario of ['normal', 'bonus', 'cap']) {
    let wall = new Date(2026, 8, 28, 12).getTime();
    class TimedEngine extends core.GameEngine {
      constructor(gameData, saved, options = {}) { super(gameData, saved, { ...options, now: () => wall, rng: () => 0.5 }); }
    }
    const source = new TimedEngine(data);
    source.state.cheer = 321;
    source.rename('Arquivo importado');
    if (scenario === 'bonus') source.state.minis.horta.buffs.milho = wall + 5 * 60000;
    const saved = source.exportState();
    wall += scenario === 'cap' ? 11 * 3600000 : 60000;
    let game;
    let confirmations = 0;
    let original;
    const snapshots = [];
    const { document } = boot({ ArraiaCore: { ...core, GameEngine: TimedEngine }, __gravador: api => { game = api; },
      confirm: () => {
        confirmations++;
        assert.equal(game.engine(), original, 'a confirmação ainda pertence à festa anterior');
        wall += scenario === 'cap' ? 2 * 3600000 : 10 * 60000;
        return true;
      } }, { saveGame: state => { snapshots.push(state); return true; } });
    await Promise.resolve();
    original = game.engine();
    const target = { value: 'save.json', files: [{ text: async () => JSON.stringify(saved) }] };
    await document.querySelector('#importar').listeners.change({ target });
    const expected = new TimedEngine(data, saved);
    const imported = game.engine();
    assert.equal(confirmations, 1);
    assert.notEqual(imported, original);
    assert.equal(imported.state.name, saved.name);
    assert.equal(imported.welcome.seconds, expected.welcome.seconds, `${scenario}: a espera entra no tempo fora da partida`);
    assert.equal(imported.welcome.capped, expected.welcome.capped, `${scenario}: o teto vale para a ausência completa`);
    assert.equal(imported.state.cheer, expected.state.cheer, `${scenario}: o rendimento usa o mesmo período e bônus que a carga após confirmar`);
    assert.equal(snapshots.at(-1).cheer, expected.state.cheer, 'o primeiro save já conserva todo o rendimento correto');
    assert.equal(snapshots.at(-1).lastSeen, wall);
    assert.equal(imported.state.size, saved.size, 'a espera offline não cria convidados');
    assert.equal(target.value, '');
  }
});

test('o mesmo arquivo pode ser escolhido novamente após abandonar uma importação ainda em leitura', async () => {
  for (const abandonment of ['cancel', 'new-year']) {
    let game, finishOldRead, latestRead;
    let confirmations = 0;
    const { document, calls } = boot({ __gravador: api => { game = api; },
      confirm: () => { confirmations++; return true; } });
    await Promise.resolve();
    const original = game.engine();
    original.rename('Festa atual');
    const oldSave = original.exportState();
    oldSave.name = 'Arquivo antigo';
    const input = document.querySelector('#importar');
    input.value = 'mesmo-save.json';
    input.files = [{ text: () => new Promise(resolve => { finishOldRead = resolve; }) }];
    const reading = input.listeners.change({ target: input });
    if (abandonment === 'cancel') input.listeners.cancel();
    else {
      original.state.size = original.state.records.size = data.tiers.at(-1).size;
      document.listeners.click({ detail: 0, target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'ano-novo-sim' } }) } });
    }
    const latest = game.engine().exportState();
    latest.name = 'Arquivo novo';
    const savesBefore = calls.filter(call => call[0] === 'save').length;
    input.click = () => {
      // Escolher o mesmo arquivo que ainda está no controle cancela; com a seleção vazia, o navegador dispara change.
      if (input.value === 'mesmo-save.json') input.listeners.cancel();
      else {
        input.value = 'mesmo-save.json';
        input.files = [{ text: async () => JSON.stringify(latest) }];
        latestRead = input.listeners.change({ target: input });
      }
    };
    document.listeners.click({ detail: 0, target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'importar' } }) } });
    if (latestRead) await latestRead;
    assert.equal(game.engine().state.name, latest.name, abandonment + ': a nova seleção do mesmo arquivo foi lida');
    const imported = game.engine();
    finishOldRead(JSON.stringify(oldSave));
    await reading;
    assert.equal(game.engine() === imported, true, 'a leitura abandonada não reaparece após a nova seleção');
    assert.equal(confirmations, 1);
    assert.equal(calls.filter(call => call[0] === 'save').length, savesBefore + 1);
    assert.equal(game.ui.picking, false);
  }
});

test('uma leitura de importação atrasada não substitui uma seleção mais recente ou uma festa reiniciada', async () => {
  for (const nextAction of ['import', 'restart', 'new-year', 'cancel']) {
    let game;
    let confirmations = 0;
    const { document, calls } = boot({ __gravador: api => { game = api; },
      confirm: () => { confirmations++; return true; } });
    await Promise.resolve();
    const original = game.engine();
    original.state.cheer = 321;
    const oldSave = original.exportState();
    oldSave.name = 'Arquivo antigo';
    let finishOldRead;
    const target = { value: 'antigo.json', files: [{ text: () => new Promise(resolve => { finishOldRead = resolve; }) }] };
    const oldImport = document.querySelector('#importar').listeners.change({ target });
    if (nextAction === 'import') {
      const newSave = { ...oldSave, name: 'Arquivo escolhido depois', cheer: 432 };
      target.value = 'novo.json';
      target.files = [{ text: async () => JSON.stringify(newSave) }];
      await document.querySelector('#importar').listeners.change({ target });
      assert.equal(game.engine().state.name, newSave.name);
    } else if (nextAction === 'restart') {
      document.listeners.click({ target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'reiniciar' } }) } });
      assert.notEqual(game.engine(), original);
    } else if (nextAction === 'new-year') {
      original.state.size = data.tiers.at(-1).size;
      document.listeners.click({ target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'ano-novo-sim' } }) } });
      assert.equal(game.engine(), original, 'o ano novo conserva a identidade do motor');
      assert.equal(game.engine().state.year, 2);
    } else document.querySelector('#importar').listeners.cancel();
    const kept = game.engine();
    const before = calls.filter(call => call[0] === 'save').length;
    const confirms = confirmations;
    finishOldRead(JSON.stringify(oldSave));
    await oldImport;
    assert.equal(game.engine(), kept, `${nextAction}: terminar a leitura antiga não troca a festa atual`);
    assert.equal(calls.filter(call => call[0] === 'save').length, before);
    assert.equal(confirmations, confirms, 'a leitura abandonada não abre uma confirmação atrasada');
  }
});

test('uma importação concluída durante a edição substitui os campos da festa anterior', async () => {
  for (const surface of ['painel', 'tela']) {
    let game;
    const { document, run } = boot({ __gravador: api => { game = api; } });
    await Promise.resolve();
    const previous = game.engine();
    previous.rename('Festa anterior');
    previous.state.size = previous.state.records.size = 30;
    previous.state.crew.cenoura = { level: 1 };
    const saved = new core.GameEngine(data).exportState();
    saved.name = 'Festa importada';
    let finishRead;
    const target = { value: 'save.json', files: [{ text: () => new Promise(resolve => { finishRead = resolve; }) }] };
    const importing = document.querySelector('#importar').listeners.change({ target });
    if (surface === 'painel') run('painel');
    else document.listeners.click({ detail: 0, target: { closest: () => ({ tagName: 'BUTTON',
      dataset: { action: 'tela', tela: 'roles' } }) } });
    const body = document.querySelector(surface === 'painel' ? '#painel-corpo' : '#tela-corpo');
    const before = body.innerHTML;
    const field = { tagName: surface === 'painel' ? 'INPUT' : 'SELECT', matches: () => true,
      id: surface === 'painel' ? 'nome' : '', value: surface === 'painel' ? 'Nome ainda em edição' : 'cenoura',
      blur() {
        if (surface === 'painel') document.listeners.change({ target: field });
        document.activeElement = null;
      } };
    document.activeElement = field;
    body.contains = element => element === field;
    finishRead(JSON.stringify(saved));
    await importing;
    assert.notEqual(game.engine(), previous);
    assert.equal(game.engine().state.name, 'Festa importada', 'a mudança do campo antigo não renomeia a festa importada');
    assert.ok(body.innerHTML !== before, `${surface}: o campo em edição não conserva a tela da festa anterior`);
    if (surface === 'painel') {
      assert.match(body.innerHTML, /value="Festa importada"/);
      assert.doesNotMatch(body.innerHTML, /value="Festa anterior"/);
    } else assert.doesNotMatch(body.innerHTML, /option value="cenoura"/, 'a turma anterior não aparece no seletor da festa nova');
  }
});

test('trocar de festa restaura os controles das Argolas abertas e descarta o resultado anterior', async () => {
  for (const replacement of ['restart', 'import', 'new-year']) for (const phase of ['playing', 'result']) {
    let game;
    let finish;
    let resets = 0;
    const { document } = boot({ __gravador: api => { game = api; }, FESTA_SPRITES: {},
      ArraiaArgolas: { create: (canvas, sprites, options) => {
        finish = options.onEnd;
        return { start() {}, reset() { resets++; } };
      } } });
    await Promise.resolve();
    const click = dataset => document.listeners.click({ detail: 0,
      target: { closest: () => ({ tagName: 'BUTTON', dataset }) } });
    const previous = game.engine();
    previous.state.tickets = 100;
    click({ action: 'argolas' });
    click({ action: 'argolas-jogar' });
    assert.ok(previous.round, 'uma rodada real foi iniciada');
    const info = document.querySelector('#argolas-info');
    if (phase === 'result') {
      finish();
      assert.match(info.innerHTML, /cartao resultado/, 'o resultado da rodada anterior está na tela');
    } else assert.doesNotMatch(info.innerHTML, /data-action="argolas-jogar"/, 'durante a rodada o botão Jogar desaparece');
    if (replacement === 'import') {
      const saved = new core.GameEngine(data).exportState();
      const target = { value: 'save.json', files: [{ text: async () => JSON.stringify(saved) }] };
      await document.querySelector('#importar').listeners.change({ target });
    } else if (replacement === 'new-year') {
      previous.state.size = data.tiers.at(-1).size;
      click({ action: 'ano-novo' });
      click({ action: 'ano-novo-sim' });
      assert.equal(game.engine().state.year, 2);
    } else click({ action: 'reiniciar' });
    assert.equal(document.querySelector('#argolas').hidden, false, 'a janela continua aberta');
    assert.equal(game.ui.rings.playing, false);
    assert.equal(game.ui.rings.result, null);
    assert.ok(!game.engine().round, 'a nova festa não conserva uma rodada ativa');
    assert.ok(resets > 0, 'a animação da rodada anterior também foi descartada');
    assert.match(info.innerHTML, /data-action="argolas-jogar"/, `${replacement}/${phase}: Jogar volta na festa atual`);
    assert.doesNotMatch(info.innerHTML, /cartao resultado/, `${replacement}/${phase}: o resultado anterior sai da tela`);
  }
});

test('ano novo descarta os alvos antigos dos minijogos antes do próximo quadro', async () => {
  require('../src/festa-sprites.js');
  const views = { ArraiaI18n: require('../src/i18n.js'), Image: class {
    set src(value) { this.complete = true; this.width = 12; }
  } };
  for (const file of ['janela-base.js', 'janelas.js', 'janela-horta.js', 'janela-mata.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8'), views, { filename: file });
  }
  for (const id of ['horta', 'mata']) {
    let game;
    let wall = Date.now();
    const { document } = boot({ ArraiaJanelas: views.ArraiaJanelas, FESTA_SPRITES: globalThis.FESTA_SPRITES,
      __gravador: api => { game = api; } });
    await Promise.resolve();
    const engine = game.engine();
    engine.now = () => wall;
    const click = dataset => document.listeners.click({ detail: 0,
      target: { closest: () => ({ tagName: 'BUTTON', dataset }) } });
    const canvasClick = areaId => {
      const item = game.ui.janelas.windows.get(id);
      const probe = item.view.probe();
      const area = probe.areas.find(entry => entry.id === areaId);
      assert.ok(area, `${id}: área ${areaId} foi desenhada`);
      const rect = item.canvas.getBoundingClientRect();
      return { clientX: rect.left + (area.x + area.w / 2) * rect.width / probe.size.width,
        clientY: rect.top + (area.y + area.h / 2) * rect.height / probe.size.height };
    };
    const pointerClick = point => {
      const item = game.ui.janelas.windows.get(id);
      item.canvas.closest = selector => selector === '.mini' ? item.element : null;
      document.listeners.pointerdown({ target: item.canvas, button: 0, ...point, preventDefault() {} });
      document.listeners.pointerup({ target: item.canvas, button: 0, buttons: 0, ...point });
    };
    click({ action: 'fechar-janela' });
    while (engine.state.size < 100) engine.addFame(engine.fameNeed() - engine.state.fame);
    click({ action: 'mini', mini: id });
    if (id === 'horta') {
      assert.equal(engine.mini(id).plant(0).ok, true);
      wall = engine.state.minis.horta.plots[0].readyAt;
    }
    game.ui.janelas.draw(1000);
    if (id === 'mata') {
      pointerClick(canvasClick('auto'));
      assert.equal(engine.mini(id).info().auto, false, 'o ícone antigo oferece retomar a luta');
      game.ui.janelas.draw(1040);
    }
    const point = canvasClick(id === 'horta' ? 'plot:0' : 'auto');
    const prefs = JSON.stringify(game.ui.settings.minis);
    click({ action: 'ano-novo' });
    click({ action: 'ano-novo-sim' });
    assert.equal(engine.state.year, 2);
    assert.equal(game.engine(), engine, 'o ano novo mantém o motor');
    pointerClick(point);
    if (id === 'horta') assert.equal(engine.state.minis.horta.plots[0].crop, null, 'colher a planta antiga não planta no ano novo');
    else assert.equal(engine.mini(id).info().auto, true, 'o Play antigo não pausa a luta nova');
    assert.equal(JSON.stringify(game.ui.settings.minis), prefs, 'as preferências das janelas permanecem');
    assert.equal(game.ui.janelas.visible(id), true);
    game.ui.janelas.draw(1080);
    pointerClick(canvasClick(id === 'horta' ? 'plot:0' : 'auto'));
    if (id === 'horta') assert.ok(engine.state.minis.horta.plots[0].crop, 'o canteiro recém-desenhado aceita plantar');
    else assert.equal(engine.mini(id).info().auto, false, 'o botão recém-desenhado aceita pausar');
  }
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

test('reiniciar cancela compras e descarta prévia, foto e efeitos da festa e da casa anteriores', async () => {
  let game;
  let resets = 0;
  let houseResets = 0;
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
  game.ui.casa = { reset() { houseResets++; } };
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
  assert.equal(houseResets, 1, 'a casa também limpa efeitos mesmo quando a nova festa ainda não tem casa');
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

  let helpScroll = 80;
  const help = { hidden: true, querySelector: () => ({ textContent: '' }),
    get scrollTop() { return helpScroll; }, set scrollTop(value) { if (!this.hidden) helpScroll = value; } };
  document.nodes.set('#casa-ajuda', help);
  const scene = node('#casa-cena');
  scene.scrollLeft = 50; scene.scrollTop = 140;
  click({ action: 'casa-ajuda' });
  assert.equal(help.hidden, false);
  assert.equal(help.scrollTop, 0, 'a ajuda abre desde o início quando já está visível');
  assert.equal(scene.scrollLeft, 0);
  assert.equal(scene.scrollTop, 0, 'a rolagem dos moradores não corta a ajuda');
  const escape = () => document.listeners.keydown({ key: 'Escape', target: document.body });
  escape();
  assert.equal(help.hidden, true, 'Escape fecha a ajuda antes da casa');
  assert.equal(scene.scrollLeft, 50);
  assert.equal(scene.scrollTop, 140, 'fechar a ajuda devolve a posição dos moradores');
  assert.equal(node('#casa').hidden, false);
  escape();
  assert.equal(node('#casa').hidden, true, 'o próximo Escape esconde a casa da frente');
  assert.equal(calls.filter(entry => entry[0] === 'settings').at(-1)?.[1].casaHidden, true);
  click({ action: 'casa' });
  await Promise.resolve();
  assert.equal(node('#casa').hidden, false, 'a casa pode ser reaberta depois de usar Escape');
});

test('servir antes do primeiro quadro após o repouso paga o tempo fora antes de aplicar o novo bônus', async () => {
  let game;
  let frameTime = 1000;
  const frames = [];
  const { document } = boot({ performance: { now: () => frameTime }, requestAnimationFrame: fn => frames.push(fn),
    __gravador: api => { game = api; } });
  await Promise.resolve();
  const engine = game.engine();
  let wall = new Date(2026, 9, 3, 12).getTime();
  engine.clock = () => wall;
  engine.state.size = engine.state.records.size = 35;
  engine.state.wood = 100;
  engine.addItem('fogao-lenha');
  assert.equal(engine.equip('fogao-lenha', 'esquerda'), true);
  assert.equal(engine.cook('pamonha'), true);
  wall = engine.state.cozinha.pot.readyAt;
  engine.tick(0.001);
  engine.drainEvents();
  const saved = engine.exportState();
  const steps = engine.state.stats.steps;
  wall += 20 * 60000;
  frameTime += 20 * 60000;
  const expected = new core.GameEngine(data, saved, { now: () => wall, rng: () => 0.5 });
  document.listeners.click({ detail: 0, target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'servir' } }) } });
  assert.ok(Math.abs(engine.state.cheer - expected.state.cheer) < 1e-9, 'a ausência rende antes do prato recém-servido mudar os bônus');
  assert.equal(engine.state.stats.dishes, 1);
  assert.equal(engine.state.cozinha.buff.until, wall + engine.recipe('pamonha').buffMinutes * 60000);
  frames.shift()(frameTime);
  assert.ok(Math.abs(engine.state.cheer - expected.state.cheer) < 1e-9, 'o quadro seguinte não paga a pausa novamente nem a transforma em dança');
  assert.equal(engine.state.stats.steps, steps);
  assert.equal(engine.wake(), null);
  assert.equal(engine.exportState().lastSeen, wall);
  assert.equal(document.querySelector('#avisos').children.some(node => /Enquanto a festa ficou parada/.test(node.textContent)), true);
});

test('fechar após uma pausa paga o rendimento anterior antes de salvar o presente do casamento já encerrado', async () => {
  let game;
  const snapshots = [];
  const { windowListeners } = boot({ __gravador: api => { game = api; } },
    { saveGame: state => { snapshots.push(state); return true; } });
  await Promise.resolve();
  const engine = game.engine();
  let wall = new Date(2026, 9, 3, 12).getTime();
  engine.clock = () => wall;
  engine.state.size = engine.state.records.size = 35;
  engine.state.fame = engine.fameNeed() - 1;
  engine.tick(0.001);
  assert.equal(engine.startWedding(), true);
  engine.state.runtime.rice = engine.cfg.weddingRice;
  const before = engine.exportState();
  wall += 20 * 60000;
  const expected = new core.GameEngine(data, before, { now: () => wall, rng: () => 0.5 });
  assert.equal(expected.startWedding(true), true);
  expected.state.runtime.rice = engine.cfg.weddingRice;
  assert.ok(expected.endWedding().item, 'a cerimônia encerrada entrega uma peça que aumenta os bônus futuros');
  windowListeners.beforeunload({ type: 'beforeunload' });
  const saved = snapshots.at(-1);
  assert.ok(Math.abs(saved.cheer - expected.state.cheer) < 1e-9, 'o save inclui o tempo parado com os bônus anteriores ao presente');
  assert.equal(saved.lastSeen, wall, 'a reabertura não tenta recalcular a mesma pausa com a peça e os convidados novos');
  assert.equal(saved.stats.weddings, 1);
  assert.deepEqual([...saved.inventory], [...expected.state.inventory]);
  assert.equal(saved.size, expected.state.size);
  const loaded = new core.GameEngine(data, saved, { now: () => wall, rng: () => 0.5 });
  assert.equal(loaded.state.cheer, saved.cheer);
  assert.equal(loaded.state.tickets, saved.tickets);
  assert.equal(loaded.state.stats.weddings, 1);
});

test('uma compra segurada após o repouso usa o rendimento disponível antes do primeiro quadro sem repetir a pausa', async () => {
  let game;
  let frameTime = 1000;
  const frames = [];
  const { document } = boot({ clearInterval() {}, performance: { now: () => frameTime }, requestAnimationFrame: fn => frames.push(fn),
    __gravador: api => { game = api; } });
  await Promise.resolve();
  const engine = game.engine();
  let wall = new Date(2026, 9, 3, 12).getTime();
  engine.clock = () => wall;
  engine.state.cheer = 0;
  engine.state.humor = { amor: 0, barriga: 0, at: wall, holdUntil: 0 };
  engine.tick(0.001);
  engine.drainEvents();
  const saved = engine.exportState();
  wall += 20 * 60000;
  frameTime += 20 * 60000;
  const expected = new core.GameEngine(data, saved, { now: () => wall, rng: () => 0.5 });
  assert.equal(expected.buyTicket(), true, 'a ausência rendeu Animação suficiente para a compra');
  const button = { dataset: { hold: 'ficha' }, disabled: false, querySelector: () => null,
    closest: selector => selector === '[data-hold]' ? button : null };
  document.listeners.pointerdown({ target: button, button: 0, clientX: 10, clientY: 10, preventDefault() {} });
  document.listeners.pointerup({ target: button, button: 0, buttons: 0 });
  assert.equal(engine.state.tickets, expected.state.tickets);
  assert.ok(Math.abs(engine.state.cheer - expected.state.cheer) < 1e-9);
  frames.shift()(frameTime);
  assert.equal(engine.state.tickets, expected.state.tickets);
  assert.ok(Math.abs(engine.state.cheer - expected.state.cheer) < 1e-9);
  assert.equal(engine.state.stats.steps, saved.stats.steps);
});

test('suspender cancela a compra segurada antes de salvar e não aceita seus temporizadores atrasados', async () => {
  for (const repeating of [false, true]) {
    let game;
    const timers = [], intervals = [], cancelled = [], snapshots = [];
    const { document, run } = boot({
      __gravador: api => { game = api; },
      setTimeout: (callback, ms) => { const timer = { callback, ms }; timers.push(timer); return timer; },
      clearTimeout: timer => cancelled.push(timer),
      setInterval: (callback, ms) => { const interval = { callback, ms }; intervals.push(interval); return interval; },
      clearInterval: interval => cancelled.push(interval)
    }, { saveGame: state => { snapshots.push({ state, held: !!game.ui.hold, drag: game.ui.drag, press: game.ui.press }); return true; } });
    await Promise.resolve();
    const engine = game.engine();
    engine.state.cheer = 100000;
    const button = { dataset: { hold: 'ficha' }, disabled: false, querySelector: () => null,
      closest: selector => selector === '[data-hold]' ? button : null };
    const down = { target: button, button: 0, clientX: 10, clientY: 10, preventDefault() {} };
    document.listeners.pointerdown(down);
    const hold = game.ui.hold;
    assert.ok(hold);
    const timer = timers.find(entry => entry.ms === 380);
    if (repeating) { timer.callback(); assert.ok(hold.interval); }
    const tickets = engine.state.tickets;
    run('salvar');
    assert.equal(game.ui.hold, null, 'o aviso de suspensão termina a compra sem depender de blur ou pointerup');
    assert.ok(cancelled.includes(timer));
    if (repeating) assert.ok(cancelled.includes(hold.interval));
    assert.equal(snapshots.length, 1);
    assert.equal(snapshots[0].held, false, 'a compra já terminou quando o save vai para o desktop');
    assert.equal(snapshots[0].state.tickets, tickets);
    assert.equal(snapshots[0].drag, null);
    assert.equal(snapshots[0].press, null);
    hold.interval?.callback();
    document.listeners.pointerup({ target: button, button: 0, buttons: 0 });
    assert.equal(engine.state.tickets, tickets, 'um callback já enfileirado não compra depois da suspensão');
    document.listeners.pointerdown(down);
    document.listeners.pointerup({ target: button, button: 0, buttons: 0 });
    assert.equal(engine.state.tickets, tickets + 1, 'uma nova compra continua funcionando');
  }
});

test('uma compra segurada interrompida pelo repouso paga a pausa antes de cancelar a repetição, qualquer que seja o primeiro callback', async () => {
  for (const first of ['repeat', 'frame']) for (const kind of ['ficha', 'melhorar']) {
    let game, startRepeat, repeat;
    let frameTime = 1000;
    let wall = new Date(2026, 9, 3, 12).getTime();
    const frames = [], cleared = [];
    const { document } = boot({
      __gravador: api => { game = api; },
      performance: { now: () => frameTime }, requestAnimationFrame: callback => frames.push(callback),
      setTimeout: (callback, ms) => { if (ms === 380) startRepeat = callback; return ms; }, clearTimeout() {},
      setInterval: (callback, ms) => { if (ms === 80) repeat = callback; return ms; },
      clearInterval: interval => cleared.push(interval)
    });
    await Promise.resolve();
    const engine = game.engine();
    engine.clock = () => wall;
    engine.state.cheer = 100000;
    engine.state.humor = { amor: 0, barriga: 0, at: wall, holdUntil: 0 };
    engine.tick(0.001);
    engine.drainEvents();
    const button = { dataset: { hold: kind, stat: 'rebolado' }, disabled: false, querySelector: () => null,
      closest: selector => selector === '[data-hold]' ? button : null };
    document.listeners.pointerdown({ target: button, button: 0, clientX: 10, clientY: 10, preventDefault() {} });
    assert.ok(game.ui.hold);
    startRepeat();
    const saved = engine.exportState();
    wall += 20 * 60000;
    frameTime += 20 * 60000;
    const expected = new core.GameEngine(data, saved, { now: () => wall, rng: () => 0.5 });
    if (first === 'repeat') repeat();
    else frames.shift()(frameTime);
    assert.equal(game.ui.hold, null, `${first}/${kind}: a repetição pertence ao gesto anterior à pausa`);
    assert.ok(cleared.includes(80), 'o intervalo de compras para de executar');
    assert.equal(engine.state.tickets, saved.tickets);
    assert.equal(engine.level('rebolado'), saved.levels.rebolado);
    assert.ok(Math.abs(engine.state.cheer - expected.state.cheer) < 1e-9, 'a pausa usa as melhorias existentes quando o jogo parou');
    repeat();
    if (first === 'repeat') frames.shift()(frameTime);
    document.listeners.pointerup({ target: button, button: 0, buttons: 0 });
    assert.equal(engine.state.tickets, saved.tickets);
    assert.equal(engine.level('rebolado'), saved.levels.rebolado);
    assert.equal(engine.state.stats.steps, saved.stats.steps);
    assert.ok(Math.abs(engine.state.cheer - expected.state.cheer) < 1e-9, 'o próximo quadro não repete o rendimento nem converte a pausa em dança');
    document.listeners.pointerdown({ target: button, button: 0, clientX: 10, clientY: 10, preventDefault() {} });
    document.listeners.pointerup({ target: button, button: 0, buttons: 0 });
    assert.equal(kind === 'ficha' ? engine.state.tickets : engine.level('rebolado'),
      (kind === 'ficha' ? saved.tickets : saved.levels.rebolado) + 1, 'um novo gesto compra normalmente');
  }
});

test('suspender interrompe o clique iniciado na festa e um soltar atrasado não abre a barraca', async () => {
  let game;
  const festa = fakeFesta({ hit: () => 'fogueira' });
  const { document, run } = boot({ ArraiaFesta: { create: () => festa }, FESTA_SPRITES: {},
    __gravador: api => { game = api; } });
  await Promise.resolve();
  game.engine().state.size = game.engine().state.records.size = 35;
  const canvas = document.querySelector('#festa-canvas');
  canvas.closest = selector => selector === '#festa-canvas' ? canvas : null;
  document.elementFromPoint = () => canvas;
  const event = { target: canvas, button: 0, clientX: 100, clientY: 100, preventDefault() {} };
  document.listeners.pointerdown(event);
  assert.equal(game.ui.drag.region, 'fogueira');
  run('salvar');
  assert.equal(game.ui.drag, null);
  document.listeners.pointerup({ ...event, buttons: 0 });
  assert.equal(game.ui.tela.open, false, 'o clique iniciado antes da suspensão foi cancelado');
  document.listeners.pointerdown(event);
  document.listeners.pointerup({ ...event, buttons: 0 });
  assert.equal(game.ui.tela.open, true);
  assert.equal(game.ui.tela.id, 'fogueira');
});

test('redimensionar a festa entre apertar e soltar não abre a barraca que saiu do ponto, e um clique novo funciona', async () => {
  let game;
  let region = 'fogueira';
  const festa = fakeFesta({ hit: () => region });
  const { document, windowListeners } = boot({ ArraiaFesta: { create: () => festa }, FESTA_SPRITES: {},
    __gravador: api => { game = api; } });
  await Promise.resolve();
  const engine = game.engine();
  engine.state.size = engine.state.records.size = 35;
  const canvas = document.querySelector('#festa-canvas');
  canvas.closest = selector => selector === '#festa-canvas' ? canvas : null;
  document.elementFromPoint = () => canvas;
  const event = { target: canvas, button: 0, clientX: 100, clientY: 100, preventDefault() {} };
  document.listeners.pointerdown(event);
  assert.equal(game.ui.drag.region, 'fogueira');
  region = 'terreiro';
  windowListeners.resize();
  document.listeners.pointerup({ ...event, buttons: 0 });
  assert.equal(game.ui.tela.open, false, 'o clique não abre uma barraca que deixou o ponto pressionado');
  region = 'fogueira';
  document.listeners.pointerdown(event);
  document.listeners.pointerup({ ...event, buttons: 0 });
  assert.equal(game.ui.tela.id, 'fogueira');
  assert.equal(game.ui.tela.open, true, 'um novo clique ainda abre a barraca atual');
});

test('rolar a cena da Casa por toque não arrasta a moldura, e toque, cabeçalho e mouse continuam funcionando', async () => {
  for (const axis of ['x', 'y']) {
    let game, pokes = 0;
    const { document, calls } = boot({ __gravador: api => { game = api; } });
    await Promise.resolve();
    game.engine().state.size = game.engine().state.records.size = 100;
    game.ui.casa = { setScale() {}, size: () => ({ width: 240, height: 90 }),
      hit: () => ({ index: 0 }), poke() { pokes++; } };
    const house = document.querySelector('#casa'), scene = document.querySelector('#casa-cena');
    Object.assign(scene, { clientWidth: 200, scrollWidth: axis === 'x' ? 400 : 200,
      clientHeight: 200, scrollHeight: axis === 'y' ? 400 : 200 });
    house.hidden = false;
    house.style.left = '100px'; house.style.bottom = '20px';
    const canvas = document.querySelector('#casa-canvas');
    canvas.closest = selector => ['#casa', '.ui', '.casa, .painel, .minijogo, #vitrine'].includes(selector) ? house
      : selector === '.casa-cena' ? scene : null;
    const header = { closest: selector => selector === '#casa' ? house : null };
    const event = { target: canvas, button: 0, pointerType: 'touch', isPrimary: true,
      clientX: 100, clientY: 100, preventDefault() {} };
    const initialPosition = JSON.stringify(game.ui.settings.casa);
    const settingsCalls = calls.filter(call => call[0] === 'settings').length;
    document.listeners.pointerdown(event);
    document.listeners.pointermove({ ...event, clientX: 125, clientY: 60, buttons: 1 });
    document.listeners.pointercancel({ isPrimary: true });
    assert.equal(JSON.stringify(game.ui.settings.casa), initialPosition, axis + ': a rolagem não desloca a Casa');
    assert.equal(calls.filter(call => call[0] === 'settings').length, settingsCalls, 'o cancelamento da rolagem não salva um arrasto');
    assert.equal(pokes, 0);
    document.listeners.pointerdown(event);
    document.listeners.pointerup({ ...event, buttons: 0 });
    assert.equal(pokes, 1, 'um toque sem rolar ainda faz o morador reagir');
    for (const [target, pointerType] of [[header, 'touch'], [canvas, 'mouse']]) {
      const before = JSON.stringify(game.ui.settings.casa);
      document.listeners.pointerdown({ ...event, target, pointerType });
      document.listeners.pointermove({ ...event, pointerType, clientX: 125, clientY: 60, buttons: 1 });
      document.listeners.pointerup({ ...event, target, pointerType, buttons: 0 });
      assert.notEqual(JSON.stringify(game.ui.settings.casa), before, pointerType + ': o arrasto permitido continua funcionando');
    }
  }
});

test('rolar a cena de uma janela extra por toque não chama o arrasto nem o salva', async () => {
  for (const axis of ['x', 'y']) {
    let game, moves = 0, clicks = 0;
    const { document } = boot({ __gravador: api => { game = api; } });
    await Promise.resolve();
    const scene = { clientWidth: 200, scrollWidth: axis === 'x' ? 400 : 200,
      clientHeight: 200, scrollHeight: axis === 'y' ? 400 : 200 };
    const canvas = { closest: selector => selector === '.casa-cena' ? scene : null };
    game.ui.janelas = { dragStart: () => ({ kind: 'mini', moved: false, x: 100, y: 100 }),
      dragMove() { moves++; }, dragEnd(drag) { assert.equal(drag.moved, false); clicks++; } };
    const event = { target: canvas, button: 0, pointerType: 'touch', isPrimary: true,
      clientX: 100, clientY: 100, preventDefault() {} };
    document.listeners.pointerdown(event);
    document.listeners.pointermove({ ...event, clientX: 125, clientY: 60, buttons: 1 });
    document.listeners.pointercancel({ isPrimary: true });
    assert.equal(moves, 0, axis + ': o movimento pertence à rolagem');
    assert.equal(clicks, 0, 'cancelar para rolar não termina um arrasto nem executa um clique');
    document.listeners.pointerdown(event);
    document.listeners.pointerup({ ...event, buttons: 0 });
    assert.equal(clicks, 1, 'um toque novo ainda chega à cena');
  }
});

test('rolar a casa entre apertar e soltar não faz o morador anterior reagir, e um clique novo funciona', async () => {
  const bundle = require('../src/festa-sprites.js') && globalThis.FESTA_SPRITES;
  globalThis.Image = class { set src(value) { this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/casa.js');
  const saved = new core.GameEngine(data).exportState();
  saved.size = saved.records.size = 207;
  let game;
  const { document } = boot({ ArraiaCasa: globalThis.ArraiaCasa, FESTA_SPRITES: bundle,
    innerWidth: 360, innerHeight: 240, __gravador: api => { game = api; } }, { loadGame: () => saved });
  await Promise.resolve();
  const canvas = document.querySelector('#casa-canvas'), house = document.querySelector('#casa');
  let scrollTop = 300;
  canvas.getBoundingClientRect = () => ({ left: 0, top: -scrollTop, width: 376, height: 438 });
  canvas.closest = selector => ['#casa', '.ui', '.casa, .painel, .minijogo, #vitrine'].includes(selector) ? house : null;
  document.elementFromPoint = () => canvas;
  game.ui.casa.draw(game.engine(), 1000);
  const area = game.ui.casa.areas().find(({ box }) => (box[1] + box[3]) / 2 > 0 && (box[1] + box[3]) / 2 < 200);
  assert.ok(area);
  const event = { target: canvas, button: 0, clientX: (area.box[0] + area.box[2]) / 2,
    clientY: (area.box[1] + area.box[3]) / 2, preventDefault() {} };
  document.listeners.pointerdown({ ...event, buttons: 1 });
  scrollTop = 0;
  const next = game.ui.casa.hit(event.clientX, event.clientY);
  assert.ok(next && next.index !== area.index, 'a rolagem põe outro morador no mesmo ponto da tela');
  document.listeners.pointerup({ ...event, buttons: 0 });
  assert.equal(game.ui.casa.probe().reacts, 0, 'o morador que saiu do ponto não reage ao soltar');
  document.listeners.pointerdown({ ...event, buttons: 1 });
  document.listeners.pointerup({ ...event, buttons: 0 });
  assert.equal(game.ui.casa.probe().reacts, 1, 'o morador atual responde ao clique novo');
});

test('fechar a ajuda da Casa devolve o teclado ao botão disponível sem tirar o foco de outro campo', async () => {
  for (const mode of ['reading', 'elsewhere', 'hidden']) {
    let game;
    const { document } = boot({ __gravador: api => { game = api; } });
    await Promise.resolve();
    game.ui.casa = { setScale() {}, size: () => ({ width: 100, height: 100 }) };
    game.engine().state.size = game.engine().state.records.size = 100;
    const house = document.nodes.get('#casa');
    const reader = {};
    const outside = {};
    const focusCalls = [];
    const trigger = { focus(options) { focusCalls.push(options); document.activeElement = trigger; } };
    house.querySelector = selector => selector === 'button[data-action="casa-ajuda"]' ? trigger : null;
    let hidden = true;
    const help = { contains: element => element === help || element === reader, querySelector: () => ({ textContent: '' }),
      get hidden() { return hidden; }, set hidden(value) {
        hidden = value;
        if (value && this.contains(document.activeElement)) document.activeElement = document.body;
      } };
    document.nodes.set('#casa-ajuda', help);
    const toggle = () => document.listeners.click({ detail: 0,
      target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'casa-ajuda' } }) } });
    toggle();
    document.activeElement = mode === 'elsewhere' ? outside : reader;
    if (mode === 'hidden') { game.ui.settings.casaHidden = true; house.hidden = true; }
    toggle();
    assert.equal(help.hidden, true);
    assert.equal(document.activeElement === (mode === 'reading' ? trigger : mode === 'elsewhere' ? outside : document.body), true, mode);
    assert.equal(focusCalls.length, Number(mode === 'reading'));
    assert.equal(focusCalls[0]?.preventScroll, mode === 'reading' ? true : undefined);
  }
});

test('ajuda e ocultação da casa ou da festa cancelam o gesto anterior sem impedir um clique novo', async () => {
  const bundle = require('../src/festa-sprites.js') && globalThis.FESTA_SPRITES;
  globalThis.Image = class { set src(value) { this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/casa.js');
  const saved = new core.GameEngine(data).exportState();
  saved.size = saved.records.size = 102;
  for (const cancel of ['help', 'house', 'all']) for (const reopen of [false, true]) for (const moved of [false, true]) {
    let game;
    const { document, run } = boot({ ArraiaCasa: globalThis.ArraiaCasa, FESTA_SPRITES: bundle,
      __gravador: api => { game = api; } }, { loadGame: () => saved });
    await Promise.resolve();
    const panel = { hidden: true, querySelector: () => ({ textContent: '' }) };
    document.nodes.set('#casa-ajuda', panel);
    const canvas = document.nodes.get('#casa-canvas');
    canvas.closest = selector => selector === '#casa' ? document.nodes.get('#casa') : null;
    game.ui.casa.draw(game.engine(), 1000);
    const { box } = game.ui.casa.areas()[0];
    const event = { target: canvas, button: 0, clientX: (box[0] + box[2]) / 2, clientY: (box[1] + box[3]) / 2,
      preventDefault() {} };
    const press = () => document.listeners.pointerdown(event);
    const release = () => document.listeners.pointerup({ button: 0, buttons: 0 });
    const click = action => document.listeners.click({ detail: 0,
      target: { closest: () => ({ tagName: 'BUTTON', dataset: { action } }) } });
    press();
    if (moved) document.listeners.pointermove({ clientX: event.clientX + 30, clientY: event.clientY - 20, buttons: 1 });
    if (cancel === 'help') { click('casa-ajuda'); if (reopen) click('casa-ajuda'); }
    else if (cancel === 'house') { click('casa-fechar'); if (reopen) click('casa'); }
    else {
      run({ settings: { ...game.ui.settings, hidden: true, revision: 1 } });
      if (reopen) run({ settings: { ...game.ui.settings, hidden: false, revision: 2 } });
    }
    const position = JSON.stringify(game.ui.settings.casa);
    if (moved) document.listeners.pointermove({ clientX: event.clientX + 90, clientY: event.clientY - 40, buttons: 1 });
    assert.equal(JSON.stringify(game.ui.settings.casa), position, `${cancel}: um arrasto interrompido não continua movendo`);
    release();
    assert.equal(game.ui.casa.probe().reacts, 0, `${cancel}/${reopen}/${moved}: não reage atrás da ajuda ou depois de esconder`);
    if (reopen) {
      press(); release();
      assert.equal(game.ui.casa.probe().reacts, 1, 'um clique novo ainda faz o morador reagir');
    }
  }
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

test('minijogos lembrados reaparecem quando as preferências iniciais chegam depois de carregar a partida', async () => {
  require('../src/festa-sprites.js');
  const views = { ArraiaI18n: require('../src/i18n.js'), Image: class {
    set src(value) { this.complete = true; this.width = 12; }
  } };
  for (const file of ['janela-base.js', 'janelas.js', 'janela-cordel.js', 'janela-bichos.js', 'janela-aquario.js', 'janela-horta.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8'), views, { filename: file });
  }
  const source = new core.GameEngine(data, null, { rng: () => 0.5 });
  while (source.state.size < 22) source.addFame(source.fameNeed() - source.state.fame);
  const saved = source.exportState();
  for (const hidden of [false, true]) {
    let game;
    let release;
    const minis = { cordel: { hidden: false, dx: 180, dy: 200 }, bichos: { hidden: false, dx: -300, dy: 100 }, aquario: { hidden: true } };
    const { document, run } = boot({ ArraiaJanelas: views.ArraiaJanelas, FESTA_SPRITES: globalThis.FESTA_SPRITES,
      __gravador: api => { game = api; } }, {
      loadGame: () => saved,
      getSettings: () => new Promise(resolve => { release = resolve; })
    });
    assert.equal(game.ui.janelas.windows.size, 0, 'as preferências ainda não chegaram');
    release({ minis, hidden, revision: 0 });
    await Promise.resolve();
    await Promise.resolve();
    assert.deepEqual([...game.ui.janelas.windows.keys()], ['cordel', 'bichos'], 'as cenas anteriormente abertas foram criadas');
    assert.equal(game.ui.janelas.visible('cordel'), !hidden);
    assert.equal(game.ui.janelas.visible('bichos'), !hidden);
    assert.equal(game.ui.janelas.visible('aquario'), false, 'a janela que estava fechada continua fechada');
    assert.equal(game.ui.janelas.visible('horta'), false, 'uma janela sem preferência não é aberta pela carga');
    assert.deepEqual(JSON.parse(JSON.stringify(game.ui.settings.minis)), minis, 'as posições lembradas continuam iguais');
    if (hidden) run({ settings: { ...game.ui.settings, hidden: false, revision: 1 } });
    const item = game.ui.janelas.windows.get('bichos');
    assert.equal(item.element.hidden, false);
    assert.match(document.querySelector('#placa').innerHTML, /data-action="mini" data-mini="bichos"[^>]*class|class="[^"]*aberta[^"]*"[^>]*data-action="mini" data-mini="bichos"/);
    game.ui.janelas.setHelp('bichos', true);
    run({ settings: { ...game.ui.settings, volume: 0.25, revision: 2 } });
    assert.equal(game.ui.janelas.windows.get('bichos'), item, 'um ajuste seguinte conserva a mesma cena');
    assert.equal(item.helpOpen, true, 'a ajuda da cena atual permanece aberta');
  }
});

test('abrir ou selecionar uma janela a traz para a frente sem cobrir o aviso nem acumular camadas', async () => {
  require('../src/festa-sprites.js');
  const views = { ArraiaI18n: require('../src/i18n.js'), Image: class {
    set src(value) { this.complete = true; this.width = 12; }
  } };
  for (const file of ['janela-base.js', 'janelas.js', 'janela-bichos.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8'), views, { filename: file });
  }
  const source = new core.GameEngine(data, null, { rng: () => 0.5 });
  while (source.state.size < 12) source.addFame(source.fameNeed() - source.state.fame);
  let game;
  const { document } = boot({ ArraiaJanelas: views.ArraiaJanelas, FESTA_SPRITES: globalThis.FESTA_SPRITES,
    __gravador: api => { game = api; } }, {
    loadGame: () => source.exportState(),
    getSettings: () => Promise.resolve({ minis: { bichos: { hidden: false } }, revision: 0 })
  });
  await Promise.resolve();
  const click = dataset => document.listeners.click({ detail: 0,
    target: { closest: () => ({ tagName: 'BUTTON', dataset }) } });
  const mini = game.ui.janelas.windows.get('bichos').element;
  const panel = document.querySelector('#painel');
  const rings = document.querySelector('#argolas');
  const tela = document.querySelector('#tela');
  const dock = document.querySelector('#vitrine');
  const dialog = document.querySelector('#janela');
  const level = element => Number(element.style.zIndex || 0);
  const above = (front, back) => assert.ok(level(front) > level(back), `${front.id || front.tagName} deve vir para a frente`);
  click({ action: 'abrir' }); above(panel, mini);
  click({ action: 'argolas' }); above(rings, panel);
  click({ action: 'tela', tela: 'correio' }); above(tela, rings);
  click({ action: 'vitrine' }); above(dock, tela);
  const target = element => ({ closest: selector => selector === '.casa, .painel, .minijogo, #vitrine' ? element : null });
  document.listeners.pointerdown({ target: target(panel), button: 0, clientX: 100, clientY: 100, preventDefault() {} });
  document.listeners.pointerup({ button: 0, buttons: 0 });
  above(panel, dock);
  document.listeners.focusin({ target: target(tela) }); above(tela, panel);
  click({ action: 'mini', mini: 'bichos' });
  click({ action: 'mini', mini: 'bichos' }); above(mini, tela);
  click({ action: 'carta' });
  assert.equal(dialog.hidden, false);
  above(dialog, mini);
  for (let i = 0; i < 30; i++) document.listeners.focusin({ target: target(i % 2 ? panel : tela) });
  above(panel, tela);
  above(dialog, panel);
  assert.equal(Math.max(...[panel, rings, tela, dock, mini].map(level)), 5,
    'selecionar as mesmas cinco janelas reorganiza suas camadas sem criar números novos');
  const escape = () => document.listeners.keydown({ key: 'Escape', target: document.body });
  escape();
  assert.equal(game.ui.modal, false, 'o aviso que está acima de tudo fecha primeiro');
  assert.equal(game.ui.open, true);
  escape();
  assert.equal(game.ui.open, false, 'Escape fecha o Painel selecionado, mesmo com as Argolas abertas atrás');
  assert.equal(game.ui.rings.open, true);
  document.listeners.focusin({ target: target(mini) });
  game.ui.janelas.setHelp('bichos', true);
  escape();
  assert.equal(game.ui.janelas.helpOpen('bichos'), false, 'Escape fecha primeiro a ajuda que cobre a cena');
  assert.equal(game.ui.janelas.visible('bichos'), true);
  escape();
  assert.equal(game.ui.janelas.visible('bichos'), false, 'o próximo Escape esconde a cena da frente');
  escape();
  assert.equal(game.ui.tela.open, false);
  assert.equal(game.ui.dock.open, true);
  escape();
  assert.equal(game.ui.dock.open, false);
  assert.equal(game.ui.rings.open, true);
  escape();
  assert.equal(game.ui.rings.open, false, 'as Argolas fecham quando passam a ser a janela da frente');
});

test('arrastar só um minijogo oferece restauração automática e conserva quais janelas estão escondidas', async () => {
  require('../src/festa-sprites.js');
  const views = { ArraiaI18n: require('../src/i18n.js'), Image: class {
    set src(value) { this.complete = true; this.width = 12; }
  } };
  for (const file of ['janela-base.js', 'janelas.js', 'janela-cordel.js', 'janela-bichos.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8'), views, { filename: file });
  }
  let game;
  const { document } = boot({ ArraiaJanelas: views.ArraiaJanelas, FESTA_SPRITES: globalThis.FESTA_SPRITES,
    __gravador: api => { game = api; } });
  await Promise.resolve();
  const click = dataset => document.listeners.click({ detail: 0, target: { closest: () => ({ tagName: 'BUTTON', dataset }) } });
  click({ action: 'fechar-janela' });
  while (game.engine().state.size < 12) game.engine().addFame(game.engine().fameNeed() - game.engine().state.fame);
  click({ action: 'mini', mini: 'cordel' });
  click({ action: 'mini-fechar', mini: 'cordel' });
  click({ action: 'mini', mini: 'bichos' });
  const item = game.ui.janelas.windows.get('bichos');
  const previousLeft = item.element.style.left;
  const target = { closest: selector => selector === '.mini' ? item.element : null };
  document.listeners.pointerdown({ target, button: 0, clientX: 900, clientY: 400, preventDefault() {} });
  document.listeners.pointermove({ buttons: 1, clientX: 600, clientY: 300 });
  document.listeners.pointerup({ button: 0, buttons: 0 });
  await Promise.resolve();
  assert.notEqual(item.element.style.left, previousLeft, 'a janela foi movida pelo mesmo gesto do mouse');
  assert.ok(Number.isFinite(game.ui.settings.minis.bichos.dx));
  assert.equal(game.ui.settings.placa, null, 'a placa continua em posição automática');
  assert.equal(game.ui.settings.casa, null, 'a casa também não foi arrastada');
  click({ action: 'tab', tab: 'ajustes' });
  const panel = document.nodes.get('#painel-corpo');
  assert.match(panel.innerHTML, /data-action="placa-auto"/, 'mover apenas o minijogo já oferece a restauração');
  click({ action: 'placa-auto' });
  await Promise.resolve();
  assert.equal(game.ui.settings.minis.bichos.hidden, false);
  assert.equal(game.ui.settings.minis.cordel.hidden, true);
  for (const entry of Object.values(game.ui.settings.minis)) {
    assert.equal('dx' in entry, false);
    assert.equal('dy' in entry, false);
  }
  assert.equal(game.ui.janelas.visible('bichos'), true, 'o minijogo aberto continua aberto');
  assert.equal(game.ui.janelas.visible('cordel'), false, 'o minijogo escondido continua escondido');
  assert.equal(item.element.style.left, previousLeft, 'a posição automática original é restaurada');
  assert.doesNotMatch(panel.innerHTML, /data-action="placa-auto"/, 'a opção some depois de restaurar todas as posições');
});

test('respostas antigas dos ajustes não apagam janelas abertas enquanto outra resposta ainda está pendente', async () => {
  const Settings = require('../src/settings.js');
  require('../src/festa-sprites.js');
  const views = { ArraiaI18n: require('../src/i18n.js'), Image: class {
    set src(value) { this.value = value; this.complete = true; this.width = 12; }
  } };
  for (const file of ['janela-base.js', 'janelas.js', 'janela-cordel.js', 'janela-bichos.js', 'janela-aquario.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8'), views, { filename: file });
  }
  let game;
  let mainSettings = Settings.normalizeSettings(null);
  const pending = [];
  const { document } = boot({ ArraiaJanelas: views.ArraiaJanelas, FESTA_SPRITES: globalThis.FESTA_SPRITES,
    __gravador: api => { game = api; } }, {
    getSettings: () => Promise.resolve(Settings.publicSettings(mainSettings)),
    updateSettings: partial => {
      mainSettings = Settings.mergeSettings(mainSettings, partial);
      const snapshot = Settings.publicSettings(mainSettings);
      return new Promise(resolve => pending.push({ snapshot, resolve }));
    }
  });
  await Promise.resolve();
  game.engine().state.records.size = 40;
  const open = id => document.listeners.click({ detail: 0, target: { closest: () => ({
    tagName: 'BUTTON', dataset: { action: 'mini', mini: id }, disabled: false
  }) } });
  open('cordel');
  open('bichos');
  assert.equal(game.ui.janelas.visible('bichos'), true, 'a segunda janela abre antes de chegar qualquer resposta');
  pending[0].resolve(pending[0].snapshot);
  await Promise.resolve();
  assert.equal(game.ui.janelas.visible('bichos'), true, 'a resposta anterior do Cordel preserva Bichos ainda pendente');
  open('aquario');
  pending[1].resolve(pending[1].snapshot);
  await Promise.resolve();
  pending[2].resolve(pending[2].snapshot);
  await Promise.resolve();
  for (const id of ['cordel', 'bichos', 'aquario']) {
    assert.equal(game.ui.janelas.visible(id), true, `${id} continua aberta depois das respostas`);
    assert.equal(mainSettings.minis[id]?.hidden, false, `${id} continua salva no processo principal`);
  }
});

test('broadcast de ajustes não desfaz outro campo local cujo invoke ainda não foi processado', async () => {
  const Settings = require('../src/settings.js');
  let current = Settings.normalizeSettings(null);
  let revision = 0;
  let game;
  const pending = [];
  const snapshot = () => ({ ...Settings.publicSettings(current), revision });
  const { document, run } = boot({ __gravador: api => { game = api; } }, {
    getSettings: () => Promise.resolve(snapshot()),
    updateSettings: partial => new Promise(resolve => pending.push({ partial, resolve }))
  });
  await Promise.resolve();
  const clickPin = () => document.listeners.click({ target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'fixar' } }) } });
  clickPin();
  current = Settings.mergeSettings(current, { sound: false }); revision++;
  run({ settings: snapshot() });
  assert.equal(game.ui.settings.pinned, false, 'a escolha otimista continua visível enquanto aguarda o main');
  assert.equal(game.ui.settings.sound, false, 'o campo alterado pela bandeja também aparece');
  clickPin();
  assert.deepEqual(pending.map(request => request.partial.pinned), [false, true], 'dois cliques ainda alternam duas vezes');
  for (const request of pending) {
    current = Settings.mergeSettings(current, request.partial); revision++;
    request.resolve(snapshot());
  }
  await Promise.resolve();
  assert.equal(game.ui.settings.pinned, true);
  assert.equal(game.ui.settings.sound, false);
});

test('uma resposta anterior ao broadcast não devolve outros campos ao estado antigo', async () => {
  const Settings = require('../src/settings.js');
  let current = Settings.normalizeSettings(null);
  let game;
  let release;
  const { document, run } = boot({ __gravador: api => { game = api; } }, {
    getSettings: () => Promise.resolve({ ...Settings.publicSettings(current), revision: 0 }),
    updateSettings: partial => {
      current = Settings.mergeSettings(current, partial);
      const snapshot = { ...Settings.publicSettings(current), revision: 1 };
      return new Promise(resolve => { release = () => resolve(snapshot); });
    }
  });
  await Promise.resolve();
  document.listeners.click({ target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'fixar' } }) } });
  current = Settings.mergeSettings(current, { sound: false });
  run({ settings: { ...Settings.publicSettings(current), revision: 2 } });
  release();
  await Promise.resolve();
  assert.equal(game.ui.settings.sound, false, 'a resposta de revisão 1 não substitui a revisão 2');
  assert.equal(game.ui.settings.pinned, false, 'a escolha confirmada continua aplicada');
});

test('confirmar um pedido libera só seus campos e conserva outro pedido ainda pendente', async () => {
  const Settings = require('../src/settings.js');
  let current = Settings.normalizeSettings(null);
  let game;
  const pending = [];
  const { document, run } = boot({ __gravador: api => { game = api; } }, {
    getSettings: () => Promise.resolve({ ...Settings.publicSettings(current), revision: 0 }),
    updateSettings: partial => {
      if (pending.length === 0) current = Settings.mergeSettings(current, partial);
      const snapshot = { ...Settings.publicSettings(current), revision: 1 };
      return new Promise(resolve => pending.push({ partial, snapshot, resolve }));
    }
  });
  await Promise.resolve();
  const click = action => document.listeners.click({ target: { closest: () => ({ tagName: 'BUTTON', dataset: { action } }) } });
  click('fixar');
  click('casa-fechar');
  current = Settings.mergeSettings(current, { pinned: true, sound: false });
  run({ settings: { ...Settings.publicSettings(current), revision: 2 } });
  pending[0].resolve(pending[0].snapshot);
  await Promise.resolve();
  assert.equal(game.ui.settings.pinned, true, 'confirmar a fixação antiga libera o valor mais recente da bandeja');
  assert.equal(game.ui.settings.casaHidden, true, 'a casa aguarda seu próprio invoke sem ser reaberta pelo snapshot');
  current = Settings.mergeSettings(current, pending[1].partial);
  pending[1].resolve({ ...Settings.publicSettings(current), revision: 3 });
  await Promise.resolve();
  assert.equal(game.ui.settings.casaHidden, true);
  run({ settings: { ...Settings.publicSettings(current), casaHidden: false, revision: 4 } });
  assert.equal(game.ui.settings.casaHidden, false, 'a confirmação da casa libera seu overlay também');
});

test('um invoke recusado libera seus campos para o último snapshot sem apagar outros pedidos', async () => {
  const Settings = require('../src/settings.js');
  const current = Settings.normalizeSettings(null);
  let game;
  const pending = [];
  const { document, run } = boot({ __gravador: api => { game = api; } }, {
    getSettings: () => Promise.resolve({ ...Settings.publicSettings(current), revision: 0 }),
    updateSettings: partial => new Promise((resolve, reject) => pending.push({ partial, resolve, reject }))
  });
  await Promise.resolve();
  const click = action => document.listeners.click({ target: { closest: () => ({ tagName: 'BUTTON', dataset: { action } }) } });
  click('fixar');
  click('casa-fechar');
  run({ settings: { ...Settings.publicSettings(current), sound: false, revision: 1 } });
  pending[0].reject(new Error('ajustes indisponíveis'));
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(game.ui.settings.pinned, true, 'a escolha recusada volta ao último estado confirmado');
  assert.equal(game.ui.settings.casaHidden, true, 'o pedido da casa continua pendente');
  assert.equal(game.ui.settings.sound, false);
  pending[1].resolve({ ...Settings.publicSettings(current), sound: false, casaHidden: true, revision: 2 });
  await Promise.resolve();
  run({ settings: { ...Settings.publicSettings(current), sound: false, revision: 3 } });
  assert.equal(game.ui.settings.casaHidden, false, 'o pedido restante também é liberado ao terminar');
});

test('a leitura inicial atrasada não substitui uma alteração já recebida da bandeja', async () => {
  const Settings = require('../src/settings.js');
  const current = Settings.normalizeSettings({ zoom: 1.5 });
  let game;
  let release;
  const { run } = boot({ __gravador: api => { game = api; } }, {
    getSettings: () => new Promise(resolve => { release = () => resolve({ ...Settings.publicSettings(current), revision: 0 }); })
  });
  run({ settings: { ...Settings.publicSettings(current), sound: false, revision: 1 } });
  release();
  await Promise.resolve();
  assert.equal(game.ui.settings.sound, false);
  assert.equal(game.ui.settings.zoom, 1.5, 'o snapshot mais recente mantém também os ajustes carregados do disco');
});

test('confirmar o último clique de uma chave não faz reaparecer seu overlay anterior', async () => {
  const Settings = require('../src/settings.js');
  let current = Settings.normalizeSettings(null);
  let game;
  const pending = [];
  const { document, run } = boot({ __gravador: api => { game = api; } }, {
    getSettings: () => Promise.resolve({ ...Settings.publicSettings(current), revision: 0 }),
    updateSettings: partial => {
      current = Settings.mergeSettings(current, partial);
      const snapshot = { ...Settings.publicSettings(current), revision: pending.length + 1 };
      return new Promise(resolve => pending.push(() => resolve(snapshot)));
    }
  });
  await Promise.resolve();
  const clickPin = () => document.listeners.click({ target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'fixar' } }) } });
  clickPin(); clickPin();
  pending[1]();
  await Promise.resolve();
  assert.equal(game.ui.settings.pinned, true, 'a resposta mais recente confirma o segundo clique mesmo com a primeira pendente');
  run({ settings: { ...Settings.publicSettings(current), sound: false, revision: 3 } });
  assert.equal(game.ui.settings.pinned, true);
  pending[0]();
  await Promise.resolve();
  assert.equal(game.ui.settings.pinned, true, 'a resposta antiga não reativa a escolha superada');
  assert.equal(game.ui.settings.sound, false);
});

test('recusar o último clique mantém a escolha anterior da mesma chave que ainda aguarda resposta', async () => {
  const Settings = require('../src/settings.js');
  const current = Settings.normalizeSettings(null);
  let game;
  const pending = [];
  const { document } = boot({ __gravador: api => { game = api; } }, {
    getSettings: () => Promise.resolve({ ...Settings.publicSettings(current), revision: 0 }),
    updateSettings: partial => new Promise((resolve, reject) => pending.push({ partial, resolve, reject }))
  });
  await Promise.resolve();
  const clickPin = () => document.listeners.click({ target: { closest: () => ({ tagName: 'BUTTON', dataset: { action: 'fixar' } }) } });
  clickPin(); clickPin();
  pending[1].reject(new Error('segundo pedido recusado'));
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(game.ui.settings.pinned, false, 'o primeiro pedido válido continua pendente e visível');
  pending[0].resolve({ ...Settings.publicSettings(current), pinned: false, revision: 1 });
  await Promise.resolve();
  assert.equal(game.ui.settings.pinned, false, 'a primeira confirmação termina normalmente');
});
