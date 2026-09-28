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
  '#tela', '#tela-corpo', '#tela-titulo'];

function boot() {
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
    onCommand: callback => { command = callback; }
  };
  const windowListeners = {};
  const sandbox = {
    ArraiaCore: core, ArraiaUI: UI, ArraiaI18n: require('../src/i18n.js'), GAME_DATA: data, arraiaDesktop: desktop, document,
    addEventListener: (name, callback) => { windowListeners[name] = callback; },
    innerWidth: 1920, innerHeight: 1040, performance: { now: () => 1000 }, Intl, Date, Math, JSON, Promise,
    setInterval() {}, setTimeout() { return 1; }, clearTimeout() {}, localStorage: null, Blob: class {},
    URL: { createObjectURL: () => 'blob:', revokeObjectURL() {} }, confirm: () => true
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'app.js'), 'utf8'), sandbox);
  return { document, calls, run: value => command(value), windowListeners };
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
