const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const I18N = require('../src/i18n.js');

function fakeSteam(order, language = 'spanish') {
  return {
    config: { appId: 480, required: false, overlay: false },
    restartIfNeeded: () => false, enableOverlay() {}, init: () => true, available: true,
    language: () => language, info: () => ({ on: true, name: 'Jogador', appId: 480 }),
    syncAchievements: ids => order.push(['steam-achievements', ids]),
    setPresence: presence => order.push(['steam-presence', presence])
  };
}

function loadMain({ language, packaged = false, timeout = setTimeout, clear = clearTimeout, deferClose = false, saveStore } = {}) {
  const listeners = new Map();
  const power = {};
  const intervals = [];
  const appEvents = {};
  const cursor = { x: 0, y: 0 };
  const handlers = new Map();
  const order = [];
  let windowObject;
  let trayMenu = null;
  const windows = [];
  class FakeWindow {
    constructor(options) {
      this.options = options;
      this.focusable = options.focusable;
      this.focusableCalls = [];
      this.webContents = { setWindowOpenHandler() {}, on() {}, send: (...args) => order.push(['send', ...args]),
        reload: () => order.push('reload') };
      this.ignore = null;
      this.events = {};
      windowObject = this;
      windows.push(this);
    }
    setAlwaysOnTop(value) { this.onTop = value; }
    setIgnoreMouseEvents(value) { this.ignore = value; }
    getContentBounds() { return display.workArea; }
    isMinimized() { return false; }
    moveTop() { this.top = true; }
    setBounds(bounds) { this.bounds = bounds; }
    setFocusable(value) { this.focusableCalls.push(value); this.focusable = value; }
    isFocused() { return !!this.focused; }
    focus() { this.focused = true; }
    show() { this.visible = true; }
    setSkipTaskbar() {}
    isVisible() { return true; }
    showInactive() {}
    hide() { this.hidden = true; }
    on(name, fn) { (this.events[name] ||= []).push(fn); }
    once(name, fn) { this.on(name, fn); }
    close() {
      order.push('close');
      if (!deferClose) this.finishClose();
    }
    finishClose() {
      if (this.destroyed) return;
      this.destroyed = true;
      for (const fn of this.events.closed || []) fn();
    }
    destroy() { this.finishClose(); }
    loadFile() {}
    isDestroyed() { return !!this.destroyed; }
  }
  const display = { id: 1, workArea: { x: 0, y: 0, width: 1920, height: 1032 }, size: { width: 1920, height: 1080 } };
  const electron = {
    app: {
      requestSingleInstanceLock: () => true, whenReady: () => Promise.resolve(), getPath: () => 'C:\\dados',
      setAppUserModelId() {}, on: (name, fn) => { appEvents[name] = fn; }, quit: () => order.push('quit'),
      getLocale: () => 'pt-BR', isPackaged: packaged, setLoginItemSettings: value => order.push(['login', value])
    },
    dialog: { showErrorBox: () => order.push('dialog') },
    BrowserWindow: FakeWindow,
    ipcMain: { on: (channel, fn) => listeners.set(channel, fn), handle: (channel, fn) => handlers.set(channel, fn) },
    screen: { getPrimaryDisplay: () => display, getAllDisplays: () => [display], on() {}, getCursorScreenPoint: () => cursor },
    Tray: class { setToolTip() {} on() {} setContextMenu(menu) { trayMenu = menu; } },
    Menu: { buildFromTemplate: template => template },
    nativeImage: { createFromPath: () => ({}) },
    powerMonitor: { on: (name, fn) => { power[name] = fn; } }
  };
  const missing = () => { const error = new Error('missing'); error.code = 'ENOENT'; throw error; };
  const mocks = {
    electron,
    'node:fs': { readFileSync: missing, existsSync: () => false, copyFileSync() {}, mkdirSync() {}, writeFileSync() {},
      renameSync() {}, statSync: missing, appendFileSync: (_file, text) => order.push(['log', text.trim().slice(27)]) },
    'node:path': path,
    './window-state': require('../desktop/window-state'),
    './save-store': saveStore || { loadSave: () => null, writeSave: () => { order.push('write'); return true; } },
    './steam': { createSteam: () => fakeSteam(order, language) },
    '../src/i18n.js': I18N,
    '../src/data.js': require('../src/data.js'),
    '../src/core.js': require('../src/core.js')
  };
  const source = fs.readFileSync(path.join(__dirname, '..', 'desktop', 'main.js'), 'utf8');
  vm.runInNewContext(source, { require: name => mocks[name], __dirname: path.join(__dirname, '..', 'desktop'),
    console, setTimeout: timeout, clearTimeout: clear, setInterval: fn => intervals.push(fn) });
  return { listeners, handlers, order, window: () => windowObject, windows, intervals, appEvents, cursor, tray: () => trayMenu, power };
}

test('janela cobre a área útil, vaza cliques e só aceita IPC da própria festa', async () => {
  const { listeners, handlers, order, window } = loadMain();
  await Promise.resolve();
  const win = window();
  assert.deepEqual({ ...win.options, webPreferences: undefined, icon: undefined, title: undefined }.width, 1920);
  assert.equal(win.options.transparent, true);
  assert.equal(win.options.focusable, true, 'a janela já nasce focável, sem trocar estilos durante cliques');
  assert.equal(win.ignore, true);
  const own = { sender: win.webContents };

  const event = { ...own };
  Object.defineProperty(event, 'returnValue', { set(value) { order.push(['reply', value]); } });
  listeners.get('game:save')(event, { version: 1 });
  const written = order.indexOf('write');
  assert.deepEqual(order.slice(written, written + 2), ['write', ['reply', true]], 'responde antes de falar com a Steam');

  listeners.get('desktop:set-interactive')(own, true);
  assert.equal(win.ignore, false);
  listeners.get('desktop:set-interactive')({ sender: {} }, false);
  assert.equal(win.ignore, false, 'outra origem não mexe na janela');

  const settings = await handlers.get('desktop:update-settings')(own, { zoom: 1.5, pinned: false, lixo: 1 });
  assert.deepEqual(settings, { pinned: false, zoom: 1.5, x: 0.72, lift: 0, hud: 'sempre', hidden: false, placa: null,
    sound: true, volume: 0.5, perf: 'suave', flash: true, music: false, startup: false, calm: false });
  assert.equal(win.onTop, false);
  assert.equal(await handlers.get('desktop:update-settings')({ sender: {} }, { zoom: 2 }), null);

  listeners.get('desktop:set-focusable')(own, true);
  assert.equal(win.focusable, true);
  listeners.get('desktop:set-focusable')(own, false);
  assert.equal(win.focusable, true, 'com o jogo em foco, fechar o painel não tira o foco');
  win.focused = false;
  listeners.get('desktop:focus-game')(own);
  assert.equal(win.focusable, true, 'clique na festa dá foco ao jogo');
  assert.equal(win.focused, true);
  listeners.get('desktop:quit')(own);
  assert.equal(order.at(-1), 'quit');
  I18N.setLanguage('pt-BR');
});

test('idioma: automático segue a Steam, a escolha abre a festa numa janela nova e o save leva as conquistas para a Steam', async () => {
  const { listeners, order, window, windows } = loadMain({ language: 'spanish' });
  await Promise.resolve();
  const own = { sender: window().webContents };
  const reply = (from = own) => {
    let value;
    const event = { ...from };
    Object.defineProperty(event, 'returnValue', { set(v) { value = v; } });
    // Objetos criados dentro da vm têm outro protótipo: compara pelo conteúdo.
    return { event, get value() { return JSON.parse(JSON.stringify(value)); } };
  };
  const info = reply();
  listeners.get('desktop:info')(info.event);
  assert.deepEqual(info.value.language, { choice: 'auto', id: 'es', auto: 'es' }, 'idioma do jogo na Steam: espanhol');
  assert.equal(info.value.steam.on, true);

  listeners.get('desktop:set-language')(own, 'en');
  // Recarregar a página quebra o repasse do mouse no Windows: a janela velha fecha e uma nova abre.
  assert.equal(windows.length, 2, 'trocar o idioma abre a festa numa janela nova');
  assert.ok(windows[0].destroyed && order.includes('close'), 'a janela velha fecha (e a página salva ao sair)');
  assert.ok(!order.includes('reload'), 'a página nunca é recarregada');
  const fresh = { sender: window().webContents };
  const after = reply(fresh);
  listeners.get('desktop:info')(after.event);
  assert.deepEqual(after.value.language, { choice: 'en', id: 'en', auto: 'es' });
  assert.equal(after.value.reopen, 'ajustes', 'a festa nova volta com os Ajustes abertos');
  const again = reply(fresh);
  listeners.get('desktop:info')(again.event);
  assert.equal(again.value.reopen, null, 'os Ajustes reabrem uma vez só');
  const stale = reply(own);
  listeners.get('desktop:info')(stale.event);
  assert.equal(stale.value, null, 'a janela velha não fala mais com o jogo');
  listeners.get('desktop:set-language')({ sender: {} }, 'pt-BR');
  assert.equal(windows.length, 2, 'outra origem não troca o idioma');

  const save = reply(fresh);
  listeners.get('game:save')(save.event, { version: 1, size: 30, achievements: ['primeiro-passo', 'cidade'] });
  assert.deepEqual(order.find(entry => entry[0] === 'steam-achievements'), ['steam-achievements', ['primeiro-passo', 'cidade']]);
  assert.deepEqual(JSON.parse(JSON.stringify(order.find(entry => entry[0] === 'steam-presence'))),
    ['steam-presence', { tier: 'cidade', size: 30 }]);
  I18N.setLanguage('pt-BR');
});

test('idioma da Steam fora da lista cai para o inglês', async () => {
  const { listeners, window } = loadMain({ language: 'japanese' });
  await Promise.resolve();
  let value;
  const event = { sender: window().webContents };
  Object.defineProperty(event, 'returnValue', { set(v) { value = v; } });
  listeners.get('desktop:info')(event);
  assert.equal(value.language.id, 'en');
  I18N.setLanguage('pt-BR');
});

test('o vigia do cursor conta à festa onde o mouse está, e abrir o jogo de novo só traz a festa para a frente', async () => {
  const { listeners, order, window, intervals, appEvents, cursor } = loadMain();
  await Promise.resolve();
  const own = { sender: window().webContents };
  const sent = () => JSON.parse(JSON.stringify(order.filter(entry => entry[0] === 'send' && entry[2]?.cursor).map(entry => entry[2].cursor)));
  Object.assign(cursor, { x: 300, y: 200 });
  intervals.forEach(fn => fn());
  assert.deepEqual(sent(), [{ x: 300, y: 200, interactive: false }]);
  intervals.forEach(fn => fn());
  assert.equal(sent().length, 1, 'cursor parado: nada de novo');
  listeners.get('desktop:set-interactive')(own, true);
  intervals.forEach(fn => fn());
  assert.deepEqual(sent().at(-1), { x: 300, y: 200, interactive: true }, 'conta o estado real da janela');
  Object.assign(cursor, { x: -5, y: 200 });
  intervals.forEach(fn => fn());
  assert.equal(sent().length, 2, 'fora da janela não manda nada');
  Object.assign(cursor, { x: 300, y: 200 });
  intervals.forEach(fn => fn());
  assert.equal(sent().length, 3, 'voltar para o mesmo ponto da janela atualiza o hover');

  window().focused = false;
  appEvents['second-instance']();
  assert.equal(window().focused, true, 'abrir o jogo de novo dá foco à festa');
  assert.equal(order.some(entry => entry[0] === 'send' && entry[2] === 'painel'), false, 'sem abrir o Painel');
  I18N.setLanguage('pt-BR');
});

test('uma janela nova recebe o cursor mesmo sem ele ter mudado de posição', async () => {
  const { listeners, order, window, intervals, cursor } = loadMain({ timeout: () => 0 });
  await Promise.resolve();
  Object.assign(cursor, { x: 300, y: 200 });
  intervals.forEach(fn => fn());
  listeners.get('desktop:repair')({ sender: window().webContents });
  intervals.forEach(fn => fn());
  assert.equal(order.filter(entry => entry[0] === 'send' && entry[2]?.cursor).length, 2,
    'a janela substituta recebe seu primeiro hover');
  I18N.setLanguage('pt-BR');
});

test('trocas de idioma antes do fechamento terminar abrem somente uma janela substituta', async () => {
  const { listeners, window, windows } = loadMain({ deferClose: true, timeout: () => 0 });
  await Promise.resolve();
  const old = window();
  const own = { sender: old.webContents };
  listeners.get('desktop:set-language')(own, 'en');
  listeners.get('desktop:set-language')(own, 'pt-BR');
  old.finishClose();
  assert.equal(windows.length, 2, 'somente uma janela nova fica aberta');
  let info;
  const event = { sender: window().webContents };
  Object.defineProperty(event, 'returnValue', { set(value) { info = value; } });
  listeners.get('desktop:info')(event);
  assert.equal(info.language.id, 'pt-BR', 'a última escolha já vale para a nova janela');
  I18N.setLanguage('pt-BR');
});

test('sair enquanto a janela está sendo substituída não abre outra festa', async () => {
  const { listeners, window, windows, appEvents } = loadMain({ deferClose: true, timeout: () => 0 });
  await Promise.resolve();
  const old = window();
  listeners.get('desktop:set-language')({ sender: old.webContents }, 'en');
  appEvents['before-quit']();
  old.finishClose();
  assert.equal(windows.length, 1, 'o fechamento final não abre a substituta');
  I18N.setLanguage('pt-BR');
});

test('abrir uma segunda instância antes de a primeira estar pronta não falha', async () => {
  const { appEvents, window } = loadMain({ timeout: () => 0 });
  assert.doesNotThrow(() => appEvents['second-instance']());
  await Promise.resolve();
  assert.ok(window(), 'a abertura inicial termina normalmente');
  I18N.setLanguage('pt-BR');
});

test('IPC carrega o backup que o jogo aceita e recusa gravar um save incompatível', async () => {
  const { GameEngine } = require('../src/core.js');
  const storage = require('../desktop/save-store.js');
  const data = require('../src/data.js');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'arraia-ipc-save-'));
  const filename = path.join(directory, 'save.json');
  const saved = new GameEngine(data, null, { now: () => 1000, rng: () => 0.5 }).exportState();
  try {
    fs.writeFileSync(filename, '{}');
    fs.writeFileSync(`${filename}.bak`, JSON.stringify(saved));
    const { listeners, window, order } = loadMain({ timeout: () => 0, saveStore: {
      loadSave: (_file, validate) => storage.loadSave(filename, validate),
      writeSave: (_file, state, validate) => storage.writeSave(filename, state, validate)
    } });
    await Promise.resolve();
    let reply;
    const event = { sender: window().webContents };
    Object.defineProperty(event, 'returnValue', { set(value) { reply = value; } });
    listeners.get('game:load')(event);
    assert.deepEqual(reply, saved, 'a corrupção semântica do principal usa o backup');
    const notified = order.filter(entry => entry[0] === 'steam-achievements').length;
    listeners.get('game:save')(event, {});
    assert.equal(reply, false);
    assert.equal(order.filter(entry => entry[0] === 'steam-achievements').length, notified, 'save recusado não muda a Steam');
    assert.deepEqual(JSON.parse(fs.readFileSync(`${filename}.bak`, 'utf8')), saved);
    listeners.get('game:save')(event, { ...saved, size: 2 });
    assert.equal(reply, true);
    assert.equal(storage.loadSave(filename).size, 2, 'o save normal continua funcionando');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
    I18N.setLanguage('pt-BR');
  }
});

test('abrir com o Windows: desligado de fábrica, e só o jogo instalado se registra no login', async () => {
  const dev = loadMain();
  await Promise.resolve();
  const devOwn = { sender: dev.window().webContents };
  await dev.handlers.get('desktop:update-settings')(devOwn, { startup: true });
  assert.equal(dev.order.some(entry => entry[0] === 'login'), false, 'em desenvolvimento não mexe no login do Windows');

  const { handlers, order, window } = loadMain({ packaged: true });
  await Promise.resolve();
  const logins = () => order.filter(entry => entry[0] === 'login').map(entry => JSON.parse(JSON.stringify(entry[1])));
  assert.deepEqual(logins(), [{ openAtLogin: false }], 'ao abrir, confere o registro: desligado');
  const own = { sender: window().webContents };
  const settings = await handlers.get('desktop:update-settings')(own, { startup: true });
  assert.equal(settings.startup, true);
  assert.deepEqual(logins().at(-1), { openAtLogin: true });
  await handlers.get('desktop:update-settings')(own, { zoom: 1.5 });
  assert.equal(logins().length, 2, 'outras mudanças não mexem no registro');
  await handlers.get('desktop:update-settings')(own, { startup: false });
  assert.deepEqual(logins().at(-1), { openAtLogin: false });
});

test('o menu da bandeja tem os mesmos tamanhos que a alça alcança e liga a abertura com o Windows', async () => {
  const { tray, order } = loadMain({ packaged: true });
  await Promise.resolve();
  const menu = tray();
  const size = menu.find(item => item.label === I18N.t('tray.size'));
  assert.deepEqual([...size.submenu.map(item => item.label)], ['25%', '50%', '75%', '100%', '150%', '200%', '300%']);
  const startup = menu.find(item => item.label === I18N.t('settings.startup'));
  assert.equal(startup.checked, false, 'desligado de fábrica');
  startup.click({ checked: true });
  assert.equal(JSON.parse(JSON.stringify(order.filter(entry => entry[0] === 'login').at(-1)[1])).openAtLogin, true);
  assert.equal(tray().find(item => item.label === I18N.t('settings.startup')).checked, true, 'o menu refeito mostra ligado');
  const calm = tray().find(item => item.label === I18N.t('settings.calmOn'));
  assert.equal(calm.checked, false, 'com todos os letreiros de fábrica');
  calm.click({ checked: true });
  assert.equal(tray().find(item => item.label === I18N.t('settings.calmOn')).checked, true, 'menos letreiros ligado pela bandeja');
});

test('comandos da bandeja mostram a festa escondida antes de abrir argolas, foto ou retrato', async () => {
  const { tray, handlers, window, order } = loadMain({ timeout: () => 0 });
  await Promise.resolve();
  for (const [key, command] of [['rings.title', 'argolas'], ['tray.photo', 'foto'], ['tray.portrait', 'retrato']]) {
    const own = { sender: window().webContents };
    await handlers.get('desktop:update-settings')(own, { hidden: true });
    const start = order.length;
    tray().find(item => item.label === I18N.t(key)).click();
    const settings = await handlers.get('desktop:get-settings')(own);
    assert.equal(settings.hidden, false, `${command}: a janela volta a aparecer`);
    const sent = order.slice(start).filter(entry => entry[0] === 'send').map(entry => entry[2]);
    assert.equal(sent[0].settings.hidden, false, 'a página sabe que voltou a aparecer antes de abrir a tela');
    assert.equal(sent.at(-1), command);
  }
  I18N.setLanguage('pt-BR');
});

test('repouso: salva antes de dormir e, ao acordar com a tela desbloqueada, a festa ganha uma janela nova (o clique volta)', async () => {
  // Relógio falso: o que foi cancelado não dispara.
  const timers = new Map();
  let next = 0;
  const pending = { splice: () => { const due = [...timers.values()]; timers.clear(); return due; } };
  const { power, order, window, windows } = loadMain({ timeout: fn => { timers.set(++next, fn); return next; },
    clear: id => timers.delete(id) });
  await Promise.resolve();
  const first = window();
  power.suspend();
  assert.deepEqual(order.filter(entry => Array.isArray(entry) && entry[0] === 'send').at(-1), ['send', 'desktop:command', 'salvar']);
  // Acordou e desbloqueou quase juntos: uma troca só.
  power.resume();
  power['unlock-screen']();
  pending.splice(0).forEach(fn => fn());
  assert.equal(windows.length, 2, 'acordou: janela nova');
  assert.equal(power['lock-screen'], undefined, 'não depende do aviso de bloqueio');
  assert.ok(first.destroyed, 'a velha fechou (e salvou) antes');
  assert.equal(window().ignore, true, 'a nova começa deixando o clique vazar, como sempre');
  for (const fn of window().events['ready-to-show'] || []) fn();
  assert.equal(window().focusable, true, 'a janela quieta também mantém a capacidade de receber o próximo clique');
  assert.equal(!!window().focused, false, 'showInactive não toma o foco ao acordar');
  // Acordar sem bloqueio também troca.
  power.resume();
  pending.splice(0).forEach(fn => fn());
  assert.equal(windows.length, 3);
  I18N.setLanguage('pt-BR');
});

test('autocura: a página pede janela nova quando o mouse não chega nela, mas só com a festa fixada por cima', async () => {
  const { listeners, handlers, window, windows } = loadMain();
  await Promise.resolve();
  const own = () => ({ sender: window().webContents });
  listeners.get('desktop:repair')({ sender: {} });
  assert.equal(windows.length, 1, 'outra origem não troca a janela');
  listeners.get('desktop:repair')(own());
  assert.equal(windows.length, 2, 'fixada (o padrão): janela nova');
  await handlers.get('desktop:update-settings')(own(), { pinned: false });
  listeners.get('desktop:repair')(own());
  assert.equal(windows.length, 2, 'solta, pode ter outra janela por cima: não é defeito');
  I18N.setLanguage('pt-BR');
});

test('perder e ganhar o foco mantém a janela focável e preserva os cliques sem alterar estilos nativos', async () => {
  const { listeners, window } = loadMain();
  await Promise.resolve();
  const win = window();
  const own = { sender: win.webContents };
  const calls = [];
  const original = win.setIgnoreMouseEvents.bind(win);
  win.setIgnoreMouseEvents = value => { calls.push(value); original(value); };
  listeners.get('desktop:set-interactive')(own, true);
  calls.length = 0;
  // Clicou fora: a placa some, mas a janela continua aceitando o próximo clique na festa.
  win.focused = false;
  for (const fn of win.events.blur || []) fn();
  assert.equal(win.focusable, true);
  assert.equal(win.ignore, false);
  assert.deepEqual(win.focusableCalls, [], 'blur não muda a capacidade de foco');
  assert.deepEqual(calls, [], 'blur não recria o estado nativo de clique');
  // Clique na festa: volta a ter foco, mantendo a entrega de pointermove e pointerup do arrasto.
  listeners.get('desktop:focus-game')(own);
  assert.equal(win.focused, true);
  assert.equal(win.ignore, false);
  assert.deepEqual(win.focusableCalls, []);
  assert.deepEqual(calls, []);
  listeners.get('desktop:set-focusable')(own, false);
  assert.equal(win.focusable, true, 'fechar uma UI não muda a capacidade de foco');
  win.focused = false;
  listeners.get('desktop:set-focusable')(own, true);
  assert.equal(win.focused, true, 'abrir uma UI ainda dá foco para digitar');
  assert.deepEqual(win.focusableCalls, []);
  I18N.setLanguage('pt-BR');
});

test('trocar o foco reenvia o cursor parado para atualizar o hit da placa que apareceu ou sumiu', async () => {
  const { order, window, intervals, cursor } = loadMain({ timeout: () => 0 });
  await Promise.resolve();
  const win = window();
  Object.assign(cursor, { x: 300, y: 200 });
  const cursors = () => order.filter(entry => entry[0] === 'send' && entry[2]?.cursor);
  intervals.forEach(fn => fn());
  assert.equal(cursors().length, 1);
  for (const fn of win.events.blur || []) fn();
  intervals.forEach(fn => fn());
  assert.equal(cursors().length, 2, 'a placa sumiu: a página recalcula o pass-through no mesmo ponto');
  for (const fn of win.events.focus || []) fn();
  intervals.forEach(fn => fn());
  assert.equal(cursors().length, 3, 'a placa voltou: a página recalcula o hit no mesmo ponto');
  assert.deepEqual(win.focusableCalls, []);
  I18N.setLanguage('pt-BR');
});

test('o vigia confirma pedidos de pass-through mesmo quando repetem o estado anterior', async () => {
  const { listeners, order, window, intervals, cursor } = loadMain({ timeout: () => 0 });
  await Promise.resolve();
  Object.assign(cursor, { x: 300, y: 200 });
  const cursors = () => order.filter(entry => entry[0] === 'send' && entry[2]?.cursor);
  intervals.forEach(fn => fn());
  assert.equal(cursors().length, 1);
  listeners.get('desktop:set-interactive')({ sender: window().webContents }, false);
  intervals.forEach(fn => fn());
  assert.equal(cursors().length, 2, 'a página recebe confirmação no mesmo ponto e estado');
  assert.equal(cursors().at(-1)[2].cursor.interactive, false);
  listeners.get('desktop:set-interactive')({ sender: {} }, false);
  intervals.forEach(fn => fn());
  assert.equal(cursors().length, 2, 'outra origem não invalida o estado do cursor');
  I18N.setLanguage('pt-BR');
});
