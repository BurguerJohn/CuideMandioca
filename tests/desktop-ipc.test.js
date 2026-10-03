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

function loadMain({ language, packaged = false, timeout = setTimeout, clear = clearTimeout, deferClose = false, deferDestroy = false, deferLoad = false, saveStore, filesystem, paths, logger = console } = {}) {
  const listeners = new Map();
  const power = {};
  const intervals = [];
  const appEvents = {};
  const displayEvents = {};
  const trayEvents = {};
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
      this.loaded = false;
      this.webContents = { zoomFactor: 1, getZoomFactor() { return this.zoomFactor; },
        setWindowOpenHandler() {}, events: {}, received: [], on(name, fn) { (this.events[name] ||= []).push(fn); }, send: (...args) => {
        order.push(['send', ...args]);
        if (this.loaded) this.webContents.received.push(args[1]);
      },
        reload: () => order.push('reload') };
      this.ignore = null;
      this.events = {};
      windowObject = this;
      windows.push(this);
    }
    setAlwaysOnTop(value) { this.onTop = value; }
    setIgnoreMouseEvents(value) { this.ignore = value; }
    getContentBounds() { return this.bounds || this.options; }
    isMinimized() { return !!this.minimized; }
    minimize() { this.minimized = true; this.visible = false; this.focused = false; }
    restore() { this.minimized = false; this.visible = true; for (const fn of this.events.restore || []) fn(); }
    moveTop() { this.top = true; }
    setBounds(bounds) { this.bounds = bounds; }
    setFocusable(value) { this.focusableCalls.push(value); this.focusable = value; }
    isFocused() { return !!this.focused; }
    focus() { this.focused = true; }
    show() { this.visible = true; this.minimized = false; this.focused = true; }
    setSkipTaskbar() {}
    isVisible() { return true; }
    showInactive() {
      const minimized = this.isMinimized();
      this.visible = true;
      this.minimized = false;
      // No Windows, SW_SHOWNOACTIVATE ainda gera restore ao sair de uma minimização.
      if (minimized) for (const fn of this.events.restore || []) fn();
    }
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
    destroy() { if (!deferDestroy) this.finishClose(); }
    loadFile() { if (!deferLoad) this.finishLoad(); }
    finishLoad() {
      this.loaded = true;
      for (const fn of this.webContents.events['did-finish-load'] || []) fn();
    }
    isDestroyed() { return !!this.destroyed; }
  }
  const display = { id: 1, workArea: { x: 0, y: 0, width: 1920, height: 1032 }, size: { width: 1920, height: 1080 } };
  const displays = [display];
  const electron = {
    app: {
      requestSingleInstanceLock: () => true, whenReady: () => Promise.resolve(), getPath: name => paths?.[name] || 'C:\\dados',
      setAppUserModelId() {}, on: (name, fn) => { appEvents[name] = fn; }, quit: () => order.push('quit'),
      getLocale: () => 'pt-BR', isPackaged: packaged, setLoginItemSettings: value => order.push(['login', value])
    },
    dialog: { showErrorBox: () => order.push('dialog') },
    BrowserWindow: FakeWindow,
    ipcMain: { on: (channel, fn) => listeners.set(channel, fn), handle: (channel, fn) => handlers.set(channel, fn) },
    screen: { getPrimaryDisplay: () => displays[0], getAllDisplays: () => displays, on: (name, fn) => { displayEvents[name] = fn; }, getCursorScreenPoint: () => cursor },
    Tray: class { setToolTip() {} on(name, fn) { trayEvents[name] = fn; } setContextMenu(menu) { trayMenu = menu; } },
    Menu: { buildFromTemplate: template => template },
    nativeImage: { createFromPath: () => ({}) },
    powerMonitor: { on: (name, fn) => { power[name] = fn; } }
  };
  const missing = () => { const error = new Error('missing'); error.code = 'ENOENT'; throw error; };
  const mocks = {
    electron,
    'node:fs': filesystem || { readFileSync: missing, existsSync: () => false, copyFileSync() {}, mkdirSync() {}, writeFileSync() {},
      renameSync() {}, statSync: missing, appendFileSync: (_file, text) => order.push(['log', text.trim().slice(27)]) },
    'node:path': path,
    './window-state': require('../desktop/window-state'),
    './save-store': saveStore || { loadSave: () => null, writeSave: (_file, state, _validate, onSnapshot) => {
      onSnapshot?.(JSON.parse(JSON.stringify(state)));
      order.push('write');
      return true;
    } },
    './steam': { createSteam: () => fakeSteam(order, language) },
    '../src/i18n.js': I18N,
    '../src/data.js': require('../src/data.js'),
    '../src/core.js': require('../src/core.js')
  };
  const source = fs.readFileSync(path.join(__dirname, '..', 'desktop', 'main.js'), 'utf8');
  vm.runInNewContext(source, { require: name => mocks[name], __dirname: path.join(__dirname, '..', 'desktop'),
    console: logger, setTimeout: timeout, clearTimeout: clear, setInterval: fn => intervals.push(fn) });
  return { listeners, handlers, order, window: () => windowObject, windows, intervals, appEvents, cursor, tray: () => trayMenu, trayEvents, power, displays, displayEvents };
}

test('preferências concluídas pelo fechamento ficam no disco sem esperar o temporizador de gravação', async () => {
  const files = new Map();
  const timers = [];
  const missing = () => { const error = new Error('missing'); error.code = 'ENOENT'; throw error; };
  const filesystem = {
    readFileSync: file => files.has(file) ? files.get(file) : missing(),
    existsSync: file => files.has(file),
    mkdirSync() {}, copyFileSync() {}, appendFileSync() {}, statSync: missing,
    writeFileSync: (file, content) => files.set(file, content),
    renameSync: (from, to) => { files.set(to, files.get(from)); files.delete(from); }
  };
  const main = loadMain({ filesystem, timeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, clear() {} });
  await Promise.resolve();
  const own = { sender: main.window().webContents };
  const filename = path.join('C:\\dados', 'window-settings.json');
  main.handlers.get('desktop:update-settings')(own, { volume: 0.8 });
  assert.equal(files.has(filename), false, 'na sessão normal o ajuste conserva a gravação agendada');
  assert.ok(timers.some(timer => timer.ms === 300));
  main.appEvents['before-quit']();
  assert.equal(JSON.parse(files.get(filename)).volume, 0.8, 'before-quit conclui os ajustes anteriores');
  // A página ainda está viva: seu beforeunload pode concluir a barra ou o arrasto depois de before-quit.
  const result = main.handlers.get('desktop:update-settings')(own, { volume: 0.9, x: 0.6, lift: 30 });
  const stored = JSON.parse(files.get(filename));
  assert.equal(result.volume, 0.9);
  assert.equal(stored.volume, 0.9, 'o último volume fica durável antes de o processo terminar');
  assert.equal(stored.x, 0.6, 'a última posição usa a mesma gravação imediata');
  assert.equal(stored.lift, 30);
  assert.equal(main.handlers.get('desktop:update-settings')({ sender: {} }, { volume: 0.1 }), null);
  assert.equal(JSON.parse(files.get(filename)).volume, 0.9, 'outra origem não altera as preferências finais');
  I18N.setLanguage('pt-BR');
});

test('mostrar a festa durante a troca silenciosa dá foco à substituta quando ela estiver pronta', async context => {
  for (const trigger of ['bandeja', 'segunda instância']) {
    await context.test(trigger, async () => {
      const timers = [];
      const main = loadMain({ deferClose: true, deferLoad: true,
        timeout: (fn, ms) => { const timer = { fn, ms }; timers.push(timer); return timer; }, clear() {} });
      await Promise.resolve();
      const old = main.window();
      old.finishLoad();
      old.focused = false;
      main.power.resume();
      timers.find(timer => timer.ms === 1500).fn();
      if (trigger === 'bandeja') main.trayEvents.click();
      else main.appEvents['second-instance']();
      old.finishClose();
      const fresh = main.window();
      assert.notEqual(fresh, old);
      assert.equal(fresh.isFocused(), false, 'o pedido aguarda a página que ainda está carregando');
      fresh.finishLoad();
      for (const fn of fresh.events['ready-to-show'] || []) fn();
      assert.equal(fresh.isFocused(), true, 'a intenção explícita de mostrar a festa sobrevive à troca silenciosa');
      assert.equal(fresh.top, true);
      assert.equal(fresh.webContents.received.some(command => typeof command === 'string'), false,
        'trazer a festa à frente não abre um painel');
      fresh.focused = false;
      fresh.finishLoad();
      assert.equal(fresh.isFocused(), false,
        'o pedido explícito é consumido uma vez só');
      I18N.setLanguage('pt-BR');
    });
  }
});

test('ajustes da bandeja e IPC preservam a festa minimizada até um pedido explícito de mostrar', async () => {
  const main = loadMain({ timeout: () => 0 });
  await Promise.resolve();
  const win = main.window();
  win.isVisible = () => !!win.visible && !win.isMinimized();
  win.show();
  win.minimize();
  for (const [key, argument, child] of [['tray.sound', { checked: false }], ['tray.music', { checked: true }],
    ['tray.pin', { checked: false }], ['settings.startup', { checked: true }], ['settings.calmOn', { checked: true }],
    ['tray.size', undefined, 5], ['tray.perf', undefined, 2]]) {
    const item = main.tray().find(entry => entry.label === I18N.t(key));
    (child === undefined ? item : item.submenu[child]).click(argument);
    assert.equal(win.isMinimized(), true, `${key}: mudar uma preferência não restaura a festa`);
    assert.equal(win.isVisible(), false);
  }
  main.handlers.get('desktop:update-settings')({ sender: win.webContents }, { volume: 0.3, casa: { dx: 12, dy: 30 } });
  assert.equal(win.isMinimized(), true, 'uma atualização de preferências da página também preserva a minimização');
  main.tray().find(item => item.label === I18N.t('tray.hide')).click({ checked: true });
  main.tray().find(item => item.label === I18N.t('tray.hide')).click({ checked: false });
  assert.equal(win.isVisible(), true, 'desmarcar Esconder é um pedido explícito para mostrar a festa');
  win.minimize();
  main.trayEvents.click();
  assert.equal(win.isMinimized(), false, 'clicar no ícone da bandeja restaura a festa');
  assert.equal(win.isVisible(), true);
  assert.equal(win.isFocused(), true);
  I18N.setLanguage('pt-BR');
});

test('desmarcar Esconder restaura sem foco mesmo quando o Windows emite restore', async context => {
  for (const cause of ['janela atual', 'repouso', 'queda']) {
    await context.test(cause, async () => {
      const timers = [];
      const main = loadMain({ deferLoad: true,
        timeout: (fn, ms) => { const timer = { fn, ms }; timers.push(timer); return timer; }, clear() {} });
      await Promise.resolve();
      const old = main.window();
      old.finishLoad();
      old.show();
      old.minimize();
      if (cause === 'repouso') {
        main.power.resume();
        timers.find(timer => timer.ms === 1500).fn();
      } else if (cause === 'queda') {
        for (const fn of old.webContents.events['render-process-gone']) fn({}, { reason: 'crashed', exitCode: 1 });
      }
      const win = main.window();
      win.isVisible = () => !!win.visible && !win.isMinimized();
      assert.equal(win.isMinimized(), true, 'a festa começa minimizada, inclusive na substituta ainda carregando');
      const hide = checked => main.tray().find(item => item.label === I18N.t('tray.hide')).click({ checked });
      hide(true);
      hide(false);
      assert.equal(win.isVisible(), true);
      assert.equal(win.isMinimized(), false);
      assert.equal(win.isFocused(), false, 'o restore gerado por showInactive não pede foco');
      if (win !== old) {
        win.finishLoad();
        for (const fn of win.events['ready-to-show'] || []) fn();
        assert.equal(win.isFocused(), false, 'terminar a carga também preserva a abertura sem foco');
      }
      win.minimize();
      win.restore();
      assert.equal(win.isFocused(), true, 'restaurar pela barra de tarefas continua pedindo foco');
      win.minimize();
      main.trayEvents.click();
      assert.equal(win.isFocused(), true, 'clicar na bandeja continua trazendo a festa para a frente');
      assert.equal(win.top, true);
      I18N.setLanguage('pt-BR');
    });
  }
});

test('a recriação silenciosa preserva a minimização e pedidos explícitos ainda restauram a substituta', async context => {
  for (const cause of ['repouso', 'queda']) {
    for (const trigger of ['nenhum', 'bandeja', 'segunda instância', 'painel']) {
      await context.test(`${cause}/${trigger}`, async () => {
        const timers = [];
        const main = loadMain({ deferClose: true, deferLoad: true,
          timeout: (fn, ms) => { const timer = { fn, ms }; timers.push(timer); return timer; }, clear() {} });
        await Promise.resolve();
        const old = main.window();
        old.finishLoad();
        old.minimize();
        const open = () => {
          if (trigger === 'bandeja') main.trayEvents.click();
          else if (trigger === 'segunda instância') main.appEvents['second-instance']();
          else if (trigger === 'painel') main.tray().find(item => item.label === I18N.t('tray.panel')).click();
        };
        if (cause === 'repouso') {
          main.power.resume();
          timers.find(timer => timer.ms === 1500).fn();
          open();
          old.finishClose();
        } else {
          for (const fn of old.webContents.events['render-process-gone']) fn({}, { reason: 'crashed', exitCode: 1 });
          open();
        }
        const fresh = main.window();
        fresh.isVisible = () => !!fresh.visible && !fresh.isMinimized();
        const ready = () => { for (const fn of fresh.events['ready-to-show'] || []) fn(); };
        if (trigger === 'bandeja' || trigger === 'painel') { ready(); fresh.finishLoad(); }
        else { fresh.finishLoad(); ready(); }
        const shouldOpen = trigger !== 'nenhum';
        assert.equal(fresh.isMinimized(), !shouldOpen, 'a minimização só é cancelada por um pedido explícito');
        assert.equal(fresh.isVisible(), shouldOpen);
        assert.equal(fresh.isFocused(), shouldOpen);
        assert.equal(main.handlers.get('desktop:get-settings')({ sender: fresh.webContents }).hidden, false,
          'minimizar não troca a preferência de esconder');
        assert.deepEqual(fresh.webContents.received.filter(command => typeof command === 'string'),
          trigger === 'painel' ? ['painel'] : []);
        if (!shouldOpen) {
          fresh.restore();
          assert.equal(fresh.isFocused(), true, 'restaurar pela barra de tarefas continua trazendo foco');
        }
        I18N.setLanguage('pt-BR');
      });
    }
  }
});

test('desmarcar Esconder durante a troca cancela a minimização capturada sem tomar foco', async context => {
  for (const cause of ['repouso', 'queda']) {
    for (const minimized of [true, false]) {
      for (const hideLast of [false, true]) {
        await context.test(`${cause}/${minimized ? 'minimizada' : 'visível'}/${hideLast ? 'esconder no fim' : 'mostrar no fim'}`, async () => {
          const timers = [];
          const main = loadMain({ deferClose: true, deferDestroy: true, deferLoad: true,
            timeout: (fn, ms) => { const timer = { fn, ms }; timers.push(timer); return timer; }, clear() {} });
          await Promise.resolve();
          const old = main.window();
          old.finishLoad();
          old.isVisible = () => !!old.visible && !old.isMinimized();
          old.show();
          old.focused = false;
          if (minimized) old.minimize();
          if (cause === 'repouso') {
            main.power.resume();
            timers.find(timer => timer.ms === 1500).fn();
          } else {
            for (const fn of old.webContents.events['render-process-gone']) fn({}, { reason: 'crashed', exitCode: 1 });
          }
          main.trayEvents.click();
          const hide = checked => main.tray().find(item => item.label === I18N.t('tray.hide')).click({ checked });
          hide(true);
          hide(false);
          if (hideLast) hide(true);
          assert.equal(main.windows.length, 1, 'as escolhas foram feitas antes de a substituta existir');
          old.finishClose();
          const fresh = main.window();
          fresh.isVisible = () => !!fresh.visible && !fresh.isMinimized();
          const ready = () => { for (const fn of fresh.events['ready-to-show'] || []) fn(); };
          if (cause === 'repouso') { ready(); fresh.finishLoad(); }
          else { fresh.finishLoad(); ready(); }
          assert.equal(main.handlers.get('desktop:get-settings')({ sender: fresh.webContents }).hidden, hideLast);
          assert.equal(fresh.isVisible(), !hideLast, 'a escolha mais recente vale para a substituta');
          assert.equal(fresh.isMinimized(), false, 'mostrar cancela o estado antigo capturado no início da troca');
          assert.equal(fresh.isFocused(), false, 'desmarcar Esconder mostra sem pedir foco');
          assert.deepEqual(fresh.webContents.received.filter(command => typeof command === 'string'), []);
          I18N.setLanguage('pt-BR');
        });
      }
    }
  }
});

test('a última intenção de mostrar ou esconder durante a troca prevalece sem perder telas pendentes', async context => {
  for (const trigger of ['bandeja', 'segunda instância', 'painel']) {
    for (const hideLast of [true, false]) {
      await context.test(`${trigger}: ${hideLast ? 'abrir e esconder' : 'esconder e abrir'}`, async () => {
        const timers = [];
        const main = loadMain({ deferClose: true, deferLoad: true,
          timeout: (fn, ms) => { const timer = { fn, ms }; timers.push(timer); return timer; }, clear() {} });
        await Promise.resolve();
        const old = main.window();
        old.finishLoad();
        old.focused = false;
        main.power.resume();
        timers.find(timer => timer.ms === 1500).fn();
        const open = () => {
          if (trigger === 'bandeja') main.trayEvents.click();
          else if (trigger === 'segunda instância') main.appEvents['second-instance']();
          else main.tray().find(item => item.label === I18N.t('tray.panel')).click();
        };
        const hide = () => main.tray().find(item => item.label === I18N.t('tray.hide')).click({ checked: true });
        if (hideLast) { open(); hide(); }
        else { hide(); open(); }
        old.finishClose();
        const fresh = main.window();
        fresh.finishLoad();
        for (const fn of fresh.events['ready-to-show'] || []) fn();
        assert.equal(main.handlers.get('desktop:get-settings')({ sender: fresh.webContents }).hidden, hideLast,
          'o término da carga não desfaz a escolha mais recente');
        assert.equal(fresh.isFocused(), !hideLast, 'esconder também cancela o pedido pendente de foco');
        assert.deepEqual(fresh.webContents.received.filter(command => typeof command === 'string'),
          trigger === 'painel' ? ['painel'] : [], 'a tela solicitada é entregue mesmo sem mostrar a janela');
        const count = fresh.webContents.received.filter(command => typeof command === 'string').length;
        fresh.finishLoad();
        assert.equal(fresh.webContents.received.filter(command => typeof command === 'string').length, count,
          'a fila é consumida uma vez só');
        I18N.setLanguage('pt-BR');
      });
    }
  }
});

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
  assert.deepEqual(JSON.parse(JSON.stringify(settings)), { pinned: false, zoom: 1.5, x: 0.72, lift: 0, hud: 'sempre', hidden: false, placa: null, casa: null, casaHidden: false, minis: {},
    sound: true, volume: 0.5, perf: 'suave', flash: true, music: false, startup: false, calm: false, revision: 1 });
  assert.equal(win.onTop, false);
  assert.equal(await handlers.get('desktop:update-settings')({ sender: {} }, { zoom: 2 }), null);

  listeners.get('desktop:set-focusable')(own, true);
  assert.equal(win.focusable, true);
  listeners.get('desktop:set-focusable')(own, false);
  assert.equal(win.focusable, true, 'com o jogo em foco, fechar o painel não tira o foco');
  win.focused = false;
  listeners.get('desktop:focus-game')(own, 1);
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

test('reabrir Ajustes após mudar idioma sobrevive à substituição antes de a página carregar', async context => {
  for (const cause of ['queda', 'repouso']) {
    await context.test(cause, async () => {
      const timers = [];
      const main = loadMain({ deferLoad: true,
        timeout: (fn, ms) => { const timer = { fn, ms }; timers.push(timer); return timer; }, clear() {} });
      await Promise.resolve();
      const info = () => {
        const event = { sender: main.window().webContents };
        main.listeners.get('desktop:info')(event);
        return event.returnValue;
      };
      info();
      main.window().finishLoad();
      main.listeners.get('desktop:set-language')({ sender: main.window().webContents }, 'en');
      const loading = main.window();
      assert.equal(info().reopen, 'ajustes', 'o preload recebe o pedido antes dos scripts da festa');
      assert.equal(info().reopen, null, 'a mesma janela recebe o pedido uma única vez');
      if (cause === 'queda') {
        for (const fn of loading.webContents.events['render-process-gone']) fn({}, { reason: 'crashed', exitCode: 1 });
      } else {
        main.power.resume();
        timers.find(timer => timer.ms === 1500).fn();
      }
      const recovered = main.window();
      assert.notEqual(recovered, loading);
      assert.equal(info().reopen, 'ajustes', 'a substituta conclui a reabertura que ainda não chegou à festa');
      assert.equal(info().language.id, 'en');
      recovered.finishLoad();
      for (const fn of recovered.webContents.events['render-process-gone']) fn({}, { reason: 'crashed', exitCode: 1 });
      assert.equal(info().reopen, null, 'uma carga concluída já consumiu a reabertura');
      I18N.setLanguage('pt-BR');
    });
  }
});

test('uma escolha posterior pela bandeja cancela a reabertura de Ajustes ainda carregando', async () => {
  const main = loadMain({ deferLoad: true, timeout: () => 0 });
  await Promise.resolve();
  main.window().finishLoad();
  main.listeners.get('desktop:set-language')({ sender: main.window().webContents }, 'en');
  const first = { sender: main.window().webContents };
  main.listeners.get('desktop:info')(first);
  assert.equal(first.returnValue.reopen, 'ajustes');
  main.tray().find(item => item.label === I18N.t('tray.language')).submenu.find(item => item.label === 'Español').click();
  const current = { sender: main.window().webContents };
  main.listeners.get('desktop:info')(current);
  assert.equal(current.returnValue.language.id, 'es');
  assert.equal(current.returnValue.reopen, null, 'o pedido mais recente da bandeja não abre os Ajustes');
  I18N.setLanguage('pt-BR');
});

test('atalhos do menu nativo não recarregam a página que recebe o mouse e os comandos da bandeja', async context => {
  for (const shift of [false, true]) {
    await context.test(shift ? 'Ctrl+Shift+R' : 'Ctrl+R', async () => {
      const main = loadMain({ timeout: () => 0 });
      await Promise.resolve();
      const win = main.window();
      let prevented = false;
      const event = { preventDefault: () => { prevented = true; } };
      for (const fn of win.webContents.events['before-input-event'] || []) {
        fn(event, { type: 'keyDown', key: shift ? 'R' : 'r', code: 'KeyR', control: true, shift, alt: false, meta: false });
      }
      // O menu padrão do Electron chama reload/reloadIgnoringCache se o evento não foi cancelado.
      if (!prevented) { win.webContents.reload(); win.loaded = false; }
      main.tray()[0].click();
      assert.equal(prevented, true, 'um reload no mesmo HWND interromperia o repasse do mouse');
      assert.equal(main.order.includes('reload'), false);
      assert.equal(win.webContents.received.filter(command => command === 'painel').length, 1,
        'o pedido seguinte da bandeja continua chegando à festa');
      I18N.setLanguage('pt-BR');
    });
  }
});

test('bloquear o reload preserva texto, edição, zoom e demais atalhos de teclado', async () => {
  const main = loadMain({ timeout: () => 0 });
  await Promise.resolve();
  const win = main.window();
  for (const input of [
    { key: 'r', code: 'KeyR' },
    { key: 'R', code: 'KeyR', shift: true },
    { key: 'r', code: 'KeyR', control: true, alt: true },
    { key: 'c', code: 'KeyC', control: true },
    { key: '-', code: 'Minus', control: true },
    { key: '+', code: 'Equal', control: true, shift: true },
    { key: 'Escape', code: 'Escape' }
  ]) {
    let prevented = false;
    for (const fn of win.webContents.events['before-input-event'] || []) {
      fn({ preventDefault: () => { prevented = true; } }, { type: 'keyDown', ...input });
    }
    assert.equal(prevented, false, `o jogo continua recebendo ${JSON.stringify(input)}`);
  }
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
  assert.deepEqual(sent(), [{ x: 300, y: 200, interactive: false, focused: false, focusRequest: 0 }]);
  intervals.forEach(fn => fn());
  assert.equal(sent().length, 1, 'cursor parado: nada de novo');
  listeners.get('desktop:set-interactive')(own, true);
  intervals.forEach(fn => fn());
  assert.deepEqual(sent().at(-1), { x: 300, y: 200, interactive: true, focused: false, focusRequest: 0 }, 'conta o estado real da janela');
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

test('o cursor em DIP acompanha o zoom do Chromium sem aplicar a escala do monitor duas vezes', async context => {
  for (const scaleFactor of [1, 1.5]) {
    for (const zoom of [0.8, 1, 1.25]) {
      await context.test(`DPI ${scaleFactor}/zoom ${zoom}`, async () => {
        const main = loadMain({ timeout: () => 0 });
        await Promise.resolve();
        const second = { id: 2, scaleFactor, workArea: { x: -1600, y: -200, width: 1600, height: 860 }, size: { width: 1600, height: 900 } };
        main.displays.push(second);
        const win = main.window();
        main.handlers.get('desktop:update-settings')({ sender: win.webContents }, { display: second.id });
        win.webContents.zoomFactor = zoom;
        Object.assign(main.cursor, { x: second.workArea.x + 600, y: second.workArea.y + 400 });
        main.intervals[0]();
        const sent = main.order.filter(entry => entry[0] === 'send' && entry[2]?.cursor).at(-1)[2].cursor;
        assert.equal(sent.x, 600 / zoom, 'o hit do renderer usa clientX, em CSS pixels');
        assert.equal(sent.y, 400 / zoom, 'a origem negativa do monitor é removida ainda em DIP');
        assert.equal(sent.interactive, false);
      });
    }
  }
  I18N.setLanguage('pt-BR');
});

test('mudar o zoom com cursor parado reavalia o hit e preserva a pausa enquanto minimizada', async () => {
  const main = loadMain({ timeout: () => 0 });
  await Promise.resolve();
  const win = main.window();
  const cursors = () => main.order.filter(entry => entry[0] === 'send' && entry[2]?.cursor).map(entry => entry[2].cursor);
  main.intervals[0]();
  assert.equal(cursors().length, 1);
  win.webContents.zoomFactor = 1.25;
  main.intervals[0]();
  assert.equal(cursors().length, 2, 'mesmo na origem, mudar a escala altera a área clicável do DOM');
  win.minimize();
  Object.assign(main.cursor, { x: 600, y: 400 });
  main.intervals[0]();
  assert.equal(cursors().length, 2, 'a página minimizada não recebe um hit de coordenadas antigas');
  win.restore();
  main.intervals[0]();
  assert.equal(cursors().at(-1).x, 480);
  assert.equal(cursors().at(-1).y, 320);
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

test('segunda instância antes do bootstrap mostra a festa salva como escondida, salvo cancelamento posterior', async context => {
  for (const cancel of [false, true]) {
    await context.test(cancel ? 'esconder depois' : 'mostrar', async () => {
      const main = loadMain({ deferLoad: true, timeout: () => 0, filesystem: {
        readFileSync: () => JSON.stringify({ hidden: true }), existsSync: () => false,
        mkdirSync() {}, writeFileSync() {}, renameSync() {}
      } });
      main.appEvents['second-instance']();
      await Promise.resolve();
      const win = main.window();
      const own = { sender: win.webContents };
      assert.equal(main.handlers.get('desktop:get-settings')(own).hidden, true, 'as preferências só foram carregadas depois do atalho');
      if (cancel) main.tray().find(item => item.label === I18N.t('tray.hide')).click({ checked: true });
      win.finishLoad();
      for (const fn of win.events['ready-to-show'] || []) fn();
      assert.equal(main.handlers.get('desktop:get-settings')(own).hidden, cancel,
        'o pedido do atalho sobrevive ao bootstrap e respeita uma intenção mais recente de esconder');
      assert.equal(win.isFocused(), !cancel);
      assert.equal(!!win.visible, !cancel);
      I18N.setLanguage('pt-BR');
    });
  }
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
      writeSave: (_file, state, validate, onSnapshot) => storage.writeSave(filename, state, validate, onSnapshot)
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

test('migração não substitui um backup atual por uma festa antiga quando falta o principal', async () => {
  const { GameEngine } = require('../src/core.js');
  const storage = require('../desktop/save-store.js');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'arraia-migration-'));
  const userData = path.join(directory, 'current');
  const appData = path.join(directory, 'old');
  const old = path.join(appData, 'Arraiá');
  const saved = new GameEngine(require('../src/data.js'), null, { now: () => 1000, rng: () => 0.5 }).exportState();
  const recent = { ...saved, size: 20, records: { ...saved.records, size: 20 } };
  try {
    fs.mkdirSync(userData, { recursive: true });
    fs.mkdirSync(old, { recursive: true });
    fs.writeFileSync(path.join(old, 'save.json'), JSON.stringify(saved));
    fs.writeFileSync(path.join(old, 'save.json.bak'), JSON.stringify(saved));
    fs.writeFileSync(path.join(userData, 'save.json.bak'), JSON.stringify(recent));
    loadMain({ filesystem: fs, paths: { userData, appData }, saveStore: storage, timeout: () => 0 });
    await Promise.resolve();
    assert.deepEqual(storage.loadSave(path.join(userData, 'save.json')), recent,
      'a cópia de segurança atual continua sendo a festa recuperada');
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

test('autocura: a festa fixada pode ser reparada, mas solta e sem foco pode estar atrás de outra janela', async () => {
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

test('abrir telas pela bandeja restaura a festa minimizada antes de enviar o comando', async () => {
  const { tray, window, order } = loadMain({ timeout: () => 0 });
  await Promise.resolve();
  const win = window();
  let minimized = false;
  win.isMinimized = () => minimized;
  win.isVisible = () => !minimized;
  win.focus = () => { if (win.isVisible()) win.focused = true; };
  win.restore = () => { minimized = false; order.push('restore'); };
  for (const [key, command] of [['tray.panel', 'painel'], ['tray.shop', 'vitrine'], ['rings.title', 'argolas'],
    ['tray.photo', 'foto'], ['tray.portrait', 'retrato']]) {
    minimized = true;
    win.focused = false;
    const start = order.length;
    tray().find(item => item.label === I18N.t(key)).click();
    const calls = order.slice(start);
    assert.equal(minimized, false, `${command}: a tela fica visível mesmo tendo sido minimizada`);
    assert.equal(win.focused, true, `${command}: a festa restaurada recebe foco`);
    assert.ok(calls.indexOf('restore') < calls.findIndex(entry => entry[0] === 'send' && entry[2] === command),
      `${command}: a janela é restaurada antes de abrir a tela solicitada`);
  }
  I18N.setLanguage('pt-BR');
});

test('autocura também funciona com a festa solta em foco e mantém o foco na substituta', async () => {
  const { listeners, handlers, window, windows } = loadMain({ timeout: () => 0 });
  await Promise.resolve();
  const own = () => ({ sender: window().webContents });
  await handlers.get('desktop:update-settings')(own(), { pinned: false });
  window().focus();
  listeners.get('desktop:repair')(own());
  assert.equal(windows.length, 2, 'a janela em foco deveria receber mouse, mesmo sem ficar sempre por cima');
  for (const fn of window().events['ready-to-show'] || []) fn();
  assert.equal(window().isFocused(), true, 'o reparo preserva o foco e a placa do jogo');
  I18N.setLanguage('pt-BR');
});

test('o vigia reconcilia o foco real mesmo quando o evento nativo de foco não chegou', async () => {
  const { order, window, intervals, cursor } = loadMain({ timeout: () => 0 });
  await Promise.resolve();
  Object.assign(cursor, { x: 300, y: 200 });
  const cursors = () => order.filter(entry => entry[0] === 'send' && entry[2]?.cursor);
  intervals.forEach(fn => fn());
  assert.equal(cursors().at(-1)[2].cursor.focused, false);
  window().focused = true;
  intervals.forEach(fn => fn());
  assert.equal(cursors().length, 2, 'mudança de foco reenvia o mesmo ponto sem depender do listener de focus');
  assert.equal(cursors().at(-1)[2].cursor.focused, true);
  window().focused = false;
  intervals.forEach(fn => fn());
  assert.equal(cursors().length, 3);
  assert.equal(cursors().at(-1)[2].cursor.focused, false);
  intervals.forEach(fn => fn());
  assert.equal(cursors().length, 3, 'o cursor e o foco estáveis continuam deduplicados');
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
  listeners.get('desktop:focus-game')(own, 1);
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

test('pedidos de foco monotônicos acompanham avisos e cursor, inclusive quando a janela já está em foco', async () => {
  const { listeners, window, order, intervals, cursor } = loadMain({ timeout: () => 0 });
  await Promise.resolve();
  const win = window();
  const own = { sender: win.webContents };
  Object.assign(cursor, { x: 300, y: 200 });
  intervals.forEach(fn => fn());
  const commands = () => order.filter(entry => entry[0] === 'send').map(entry => entry[2]);
  assert.equal(commands().at(-1).cursor.focusRequest, 0);
  let focusCalls = 0;
  win.focus = () => {
    focusCalls++;
    win.focused = true;
    for (const fn of win.events.focus || []) fn();
  };
  listeners.get('desktop:focus-game')(own, 1);
  const focused = commands().filter(command => command.foco === true);
  assert.ok(focused.length >= 2, 'evento de foco e confirmação explícita chegam à página');
  assert.ok(focused.every(command => command.focusRequest === 1), 'o pedido é atualizado antes do foco nativo');
  intervals.forEach(fn => fn());
  assert.equal(commands().at(-1).cursor.focusRequest, 1);
  listeners.get('desktop:focus-game')(own, 2);
  assert.equal(focusCalls, 1, 'a janela já em foco não repete a chamada nativa');
  assert.deepEqual(JSON.parse(JSON.stringify(commands().at(-1))), { foco: true, focusRequest: 2 }, 'a página recebe confirmação mesmo assim');
  intervals.forEach(fn => fn());
  assert.equal(commands().at(-1).cursor.focusRequest, 2, 'um pedido novo reenvia o cursor parado');
  const count = commands().length;
  for (const id of [undefined, 0, -1, 1.5, '3', NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, 1, 2]) {
    listeners.get('desktop:focus-game')(own, id);
  }
  listeners.get('desktop:focus-game')({ sender: {} }, 3);
  assert.equal(commands().length, count, 'origem estranha, id inválido ou antigo não muda nem confirma o foco');
  listeners.get('desktop:focus-game')(own, 3);
  win.focused = false;
  for (const fn of win.events.blur || []) fn();
  assert.deepEqual(JSON.parse(JSON.stringify(commands().at(-1))), { foco: false, focusRequest: 3 }, 'blur real depois do pedido ainda cancela o gesto');
  I18N.setLanguage('pt-BR');
});

test('uma janela substituta começa uma sequência de pedidos de foco própria', async () => {
  const { listeners, window, order, intervals, cursor } = loadMain({ timeout: () => 0 });
  await Promise.resolve();
  const own = { sender: window().webContents };
  listeners.get('desktop:focus-game')(own, 10);
  listeners.get('desktop:set-language')(own, 'en');
  Object.assign(cursor, { x: 300, y: 200 });
  intervals.forEach(fn => fn());
  const commands = () => order.filter(entry => entry[0] === 'send').map(entry => entry[2]);
  assert.equal(commands().at(-1).cursor.focusRequest, 0);
  listeners.get('desktop:focus-game')({ sender: window().webContents }, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(commands().at(-1))), { foco: true, focusRequest: 1 });
  I18N.setLanguage('pt-BR');
});

test('um pedido de foco nativo ainda pendente não confirma blur antes de a janela ganhar foco', async () => {
  const { listeners, window, order, intervals, cursor } = loadMain({ timeout: () => 0 });
  await Promise.resolve();
  const win = window();
  win.focus = () => {};
  const beforeRequest = order.length;
  listeners.get('desktop:focus-game')({ sender: win.webContents }, 1);
  assert.equal(order.slice(beforeRequest).some(entry => entry[0] === 'send' && entry[2]?.foco === false), false,
    'isFocused ainda falso não é uma recusa síncrona do pedido');
  win.focused = true;
  Object.assign(cursor, { x: 300, y: 200 });
  intervals.forEach(fn => fn());
  const command = order.filter(entry => entry[0] === 'send').at(-1)[2];
  assert.equal(command.cursor.focused, true);
  assert.equal(command.cursor.focusRequest, 1, 'o próximo aviso confirma o pedido quando o foco efetivamente chega');
  I18N.setLanguage('pt-BR');
});

test('preload encaminha o id do pedido de foco sem perdê-lo na ponte IPC', () => {
  let desktop;
  const calls = [];
  const source = fs.readFileSync(path.join(__dirname, '..', 'desktop', 'preload.js'), 'utf8');
  vm.runInNewContext(source, { require: () => ({
    contextBridge: { exposeInMainWorld: (_name, value) => { desktop = value; } },
    ipcRenderer: { sendSync: () => ({}), send: (...args) => calls.push(args) }
  }) });
  desktop.focusGame(23);
  assert.deepEqual(calls, [['desktop:focus-game', 23]]);
});

test('falhas de disco preservam a sessão ao acordar, trocar idioma ou recuperar uma página caída', async context => {
  const { GameEngine } = require('../src/core.js');
  const source = fs.readFileSync(path.join(__dirname, '..', 'desktop', 'save-store.js'), 'utf8');
  const data = require('../src/data.js');
  for (const failure of ['mkdir', 'write', 'rename']) {
    for (const transition of ['wake', 'language', 'crash']) {
      await context.test(`${failure}/${transition}`, async () => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mandioca-session-'));
        const filename = path.join(directory, 'save.json');
        const disk = new GameEngine(data, null, { now: () => 1000, rng: () => 0.5 }).exportState();
        const current = { ...disk, cheer: 500, lastSeen: 1500, achievements: ['primeiro-passo'],
          tickets: 20, rings: { ...disk.rings, held: data.config.ringCost },
          metadata: { omitted: undefined, number: NaN, date: new Date(0) } };
        const expected = JSON.parse(JSON.stringify(current));
        const module = { exports: {} };
        let failing = failure;
        const logger = { warn() {}, error() {} };
        const fault = name => { if (failing === name) throw new Error('disco indisponível'); };
        vm.runInNewContext(source, { module, Buffer, console: logger, require: name => name === 'node:path' ? path : {
          ...fs,
          mkdirSync: (...args) => { fault('mkdir'); return fs.mkdirSync(...args); },
          writeFileSync: (...args) => { fault('write'); return fs.writeFileSync(...args); },
          renameSync: (...args) => { if (args[1] === filename) fault('rename'); return fs.renameSync(...args); }
        } });
        try {
          fs.writeFileSync(filename, JSON.stringify(disk));
          const timers = [];
          const main = loadMain({ logger, timeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, saveStore: {
            loadSave: (_file, validate) => module.exports.loadSave(filename, validate),
            writeSave: (_file, state, validate, onSnapshot) => module.exports.writeSave(filename, state, validate, onSnapshot)
          } });
          await Promise.resolve();
          const call = (channel, state, sender = main.window().webContents) => {
            const event = { sender };
            main.listeners.get(channel)(event, state);
            return event.returnValue;
          };
          assert.deepEqual(JSON.parse(JSON.stringify(call('game:load'))), disk, 'a abertura inicial carrega o save durável');
          const steamCount = () => main.order.filter(entry => entry[0] === 'steam-achievements').length;
          const notified = steamCount();
          assert.equal(call('game:save', current), false, 'a página recebe o erro de persistência');
          assert.equal(steamCount(), notified, 'o snapshot não gravado não publica conquistas');
          current.cheer = 999;
          current.metadata.number = 999;
          const old = main.window();
          if (transition === 'wake') {
            main.power.resume();
            timers.find(timer => timer.ms === 1500).fn();
          } else if (transition === 'language') {
            main.listeners.get('desktop:set-language')({ sender: old.webContents }, 'en');
          } else {
            for (const fn of old.webContents.events['render-process-gone']) fn({}, { reason: 'crashed', exitCode: 1 });
          }
          assert.equal(main.windows.length, 2);
          assert.deepEqual(JSON.parse(JSON.stringify(call('game:load'))), expected, 'a substituta recebe exatamente o último JSON válido da sessão');
          const restored = new GameEngine(data, call('game:load'), { now: () => 1500, rng: () => 0.5 });
          assert.equal(restored.state.tickets, 20 + data.config.ringCost, 'a carga real estorna as argolas uma vez, sem antecipar o estorno no cache');
          assert.deepEqual(JSON.parse(JSON.stringify(call('game:load'))), expected, 'a validação e a carga não normalizam o snapshot guardado');
          assert.equal(steamCount(), notified, 'carregar da memória também não publica progresso não gravado');
          assert.deepEqual(JSON.parse(fs.readFileSync(filename, 'utf8')), disk, 'a falha preserva o save principal');

          assert.equal(call('game:save', { ...disk, cheer: 700 }, {}), false);
          assert.equal(call('game:save', { ...disk, cheer: 800 }, old.webContents), false, 'a janela anterior não substitui o cache');
          assert.equal(call('game:load', undefined, old.webContents), null);
          const circular = { ...disk }; circular.self = circular;
          for (const invalid of [{}, { ...disk, levels: null }, { ...disk, cheer: NaN }, circular,
            { ...disk, padding: 'á'.repeat(1024 * 1024) }, { ...disk, bad: 1n }, { toJSON: () => ({}) }]) {
            assert.equal(call('game:save', invalid), false);
          }
          assert.deepEqual(JSON.parse(JSON.stringify(call('game:load'))), expected, 'origens e snapshots inválidos preservam o cache anterior');
          assert.equal(steamCount(), notified);

          failing = null;
          const reset = { ...disk, cheer: 1, lastSeen: 2000 };
          assert.equal(call('game:save', reset), true, 'uma gravação posterior continua funcionando, inclusive após reiniciar a festa');
          assert.deepEqual(JSON.parse(fs.readFileSync(filename, 'utf8')), reset);
          assert.equal(steamCount(), notified + 1, 'a Steam acompanha a gravação durável');
          assert.deepEqual(JSON.parse(JSON.stringify(call('game:load'))), reset);
        } finally {
          fs.rmSync(directory, { recursive: true, force: true });
          I18N.setLanguage('pt-BR');
        }
      });
    }
  }
});

test('a bandeja entrega pedidos de telas depois que a página inicial está pronta', async context => {
  for (const [key, commands] of [['tray.panel', ['painel']], ['tray.shop', ['painel', 'vitrine']],
    ['rings.title', ['argolas']], ['tray.photo', ['foto']], ['tray.portrait', ['retrato']]]) {
    await context.test(key, async () => {
      const main = loadMain({ deferLoad: true, timeout: () => 0 });
      await Promise.resolve();
      const win = main.window();
      main.tray().find(item => item.label === I18N.t(key)).click();
      assert.deepEqual(win.webContents.received, [], 'a página ainda não registrou o listener IPC');
      win.finishLoad();
      assert.deepEqual(win.webContents.received.filter(command => typeof command === 'string'), commands,
        'o pedido feito durante a abertura não se perde');
      const count = win.webContents.received.length;
      win.finishLoad();
      assert.equal(win.webContents.received.length, count, 'o pedido é entregue uma vez só');
      I18N.setLanguage('pt-BR');
    });
  }
});

test('pedidos de telas durante o fechamento aguardam a substituta, mesmo se a janela antiga terminar de carregar', async () => {
  const main = loadMain({ deferClose: true, deferLoad: true, timeout: () => 0 });
  await Promise.resolve();
  const old = main.window();
  old.finishLoad();
  main.listeners.get('desktop:set-language')({ sender: old.webContents }, 'en');
  main.tray().find(item => item.label === I18N.t('tray.photo')).click();
  assert.equal(old.webContents.received.includes('foto'), false, 'a tela não abre numa janela que está fechando');
  old.finishClose();
  const fresh = main.window();
  old.finishLoad();
  assert.equal(fresh.webContents.received.includes('foto'), false, 'o load tardio da velha não libera pedidos para a nova');
  fresh.finishLoad();
  assert.deepEqual(fresh.webContents.received.filter(command => typeof command === 'string'), ['foto']);
  assert.equal(fresh.isFocused(), true, 'um pedido explícito da bandeja mostra e foca a janela pronta');
  I18N.setLanguage('pt-BR');
});

test('um pedido da bandeja sobrevive à queda durante a carga e é descartado no encerramento', async () => {
  const main = loadMain({ deferLoad: true, timeout: () => 0 });
  await Promise.resolve();
  const old = main.window();
  main.tray().find(item => item.label === I18N.t('rings.title')).click();
  for (const fn of old.webContents.events['render-process-gone']) fn({}, { reason: 'crashed', exitCode: 1 });
  const fresh = main.window();
  fresh.finishLoad();
  assert.deepEqual(fresh.webContents.received.filter(command => typeof command === 'string'), ['argolas']);

  const exiting = loadMain({ deferLoad: true, timeout: () => 0 });
  await Promise.resolve();
  exiting.tray().find(item => item.label === I18N.t('tray.panel')).click();
  exiting.appEvents['before-quit']();
  exiting.window().finishLoad();
  assert.equal(exiting.window().webContents.received.includes('painel'), false, 'sair não reabre uma tela pendente');
  I18N.setLanguage('pt-BR');
});

test('perder o foco antes de a página carregar é reconciliado mesmo com o cursor em outro monitor', async context => {
  for (const cause of ['abertura', 'idioma']) {
    await context.test(cause, async () => {
      const main = loadMain({ deferLoad: true, timeout: () => 0 });
      await Promise.resolve();
      if (cause === 'idioma') {
        main.window().finishLoad();
        main.listeners.get('desktop:set-language')({ sender: main.window().webContents }, 'en');
      }
      const win = main.window();
      for (const fn of win.events['ready-to-show'] || []) fn();
      win.focused = false;
      for (const fn of win.events.blur || []) fn();
      Object.assign(main.cursor, { x: 2500, y: 200 });
      assert.deepEqual(win.webContents.received, [], 'o blur aconteceu antes de a página receber os comandos');
      win.finishLoad();
      main.intervals.forEach(fn => fn());
      assert.deepEqual(JSON.parse(JSON.stringify(win.webContents.received)), [{ foco: false, focusRequest: 0 }],
        'a página começa com o foco real sem depender de o cursor voltar ao monitor da festa');
      win.focused = true;
      for (const fn of win.events.focus || []) fn();
      assert.deepEqual(JSON.parse(JSON.stringify(win.webContents.received.at(-1))), { foco: true, focusRequest: 0 },
        'voltar à janela continua mostrando a placa normalmente');
      I18N.setLanguage('pt-BR');
    });
  }
});

test('a página recém-carregada recebe o primeiro cursor mesmo se ele já foi observado durante a carga', async () => {
  const main = loadMain({ deferLoad: true, timeout: () => 0 });
  await Promise.resolve();
  const win = main.window();
  for (const fn of win.events['ready-to-show'] || []) fn();
  win.focused = false;
  Object.assign(main.cursor, { x: 300, y: 200 });
  main.intervals.forEach(fn => fn());
  assert.deepEqual(win.webContents.received, [], 'o polling aconteceu antes do listener da página');
  win.finishLoad();
  main.intervals.forEach(fn => fn());
  const cursors = win.webContents.received.filter(command => command.cursor);
  assert.equal(cursors.length, 1, 'deduplicação não descarta o primeiro estado que a página pode receber');
  assert.deepEqual(JSON.parse(JSON.stringify(cursors[0].cursor)), { x: 300, y: 200, interactive: false, focused: false, focusRequest: 0 });
  main.intervals.forEach(fn => fn());
  assert.equal(win.webContents.received.filter(command => command.cursor).length, 1, 'depois de entregar, o ponto estável segue deduplicado');
  I18N.setLanguage('pt-BR');
});

test('leitura, respostas e broadcasts de ajustes usam a mesma revisão monotônica por sessão', async () => {
  const main = loadMain({ language: 'brazilian', timeout: () => 0 });
  await Promise.resolve();
  const own = { sender: main.window().webContents };
  const initial = main.handlers.get('desktop:get-settings')(own);
  assert.equal(initial.revision, 0);
  const changed = main.handlers.get('desktop:update-settings')(own, { pinned: false });
  assert.equal(changed.revision, 1);
  assert.equal(changed.pinned, false);
  main.tray().find(item => item.label === I18N.t('tray.sound')).click({ checked: false });
  const broadcast = main.order.filter(call => call[0] === 'send' && call[2]?.settings).at(-1)[2].settings;
  assert.equal(broadcast.revision, 2);
  assert.equal(broadcast.pinned, false);
  assert.equal(broadcast.sound, false);
  assert.equal(main.handlers.get('desktop:get-settings')(own).revision, 2);
  main.listeners.get('desktop:set-language')(own, 'en');
  const fresh = { sender: main.window().webContents };
  assert.equal(main.handlers.get('desktop:get-settings')(fresh).revision, 2, 'trocar a janela mantém a revisão da sessão');
  assert.equal(main.handlers.get('desktop:update-settings')(own, { sound: true }), null);
  assert.equal(main.handlers.get('desktop:update-settings')(fresh, { casaHidden: true }).revision, 3,
    'uma origem antiga recusada não avança a revisão');
  assert.equal(initial.pinned, true, 'o snapshot inicial não é atualizado junto com as mudanças posteriores');
  I18N.setLanguage('pt-BR');
});

test('mudar a resolução atualiza a área da festa e os tamanhos dos monitores na bandeja', async () => {
  const main = loadMain({ language: 'english' });
  await Promise.resolve();
  const second = { id: 2, workArea: { x: 1920, y: -100, width: 1280, height: 680 }, size: { width: 1280, height: 720 } };
  main.displays.push(second);
  main.displayEvents['display-added']({}, second);
  const monitors = () => main.tray().find(item => item.label === I18N.t('tray.display')).submenu;
  assert.match(monitors()[1].label, /1280.*720/);
  await main.handlers.get('desktop:update-settings')({ sender: main.window().webContents }, { display: 2 });
  assert.deepEqual(main.window().bounds, second.workArea);

  second.workArea = { x: 1920, y: -100, width: 1920, height: 1032 };
  second.size = { width: 1920, height: 1080 };
  main.displayEvents['display-metrics-changed']({}, second, ['bounds', 'workArea', 'scaleFactor']);
  assert.deepEqual(main.window().bounds, second.workArea);
  assert.match(monitors()[1].label, /1920.*1080/, 'o menu usa a resolução atual, inclusive depois de mudar a escala');
  assert.equal(monitors()[1].checked, true);

  main.displays.pop();
  main.displayEvents['display-removed']({}, second);
  assert.deepEqual(main.window().bounds, main.displays[0].workArea, 'monitor removido: usa a área útil do principal');
  assert.equal(main.tray().some(item => item.label === I18N.t('tray.display')), false);
  main.displays.push(second);
  main.displayEvents['display-added']({}, second);
  assert.deepEqual(main.window().bounds, second.workArea, 'ao reconectar, volta ao monitor escolhido');
  assert.equal(monitors()[1].checked, true);
  I18N.setLanguage('pt-BR');
});
