'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const electron = require('electron');
const { app, BrowserWindow, ipcMain } = electron;
const root = path.resolve(__dirname, '../..');
const activeRounds = process.argv.includes('--active-rounds');
const pickerReselect = process.argv.includes('--picker-reselect');
const photoDownloads = process.argv.includes('--photo-downloads');
const festaPressResize = process.argv.includes('--festa-press-resize');
const wakeInput = process.argv.includes('--wake-input');
const wakeSave = process.argv.includes('--wake-save');
const suspendGesture = process.argv.includes('--suspend-gesture');
const wakeHold = process.argv.includes('--wake-hold');
const mixedKeyboardButtons = process.argv.includes('--mixed-keyboard-buttons');
const cancelledKeyboard = process.argv.includes('--cancelled-keyboard') || mixedKeyboardButtons;
const keyboardRedraw = process.argv.includes('--keyboard-redraw');
const cardSpaceRepeat = process.argv.includes('--card-space-repeat');
const languageGestures = process.argv.includes('--language-gestures');
const zoomWheel = process.argv.includes('--zoom-wheel');
const mataVisibility = process.argv.includes('--mata-visibility');
let mataFocused = true;
const zoomWheelCase = process.argv.find(arg => arg.startsWith('--zoom-wheel-case='))?.split('=')[1] || 'press';
const zoomWheelDirection = process.argv.find(arg => arg.startsWith('--zoom-wheel-direction='))?.split('=')[1] || 'in';
const mixedPointers = process.argv.includes('--mixed-pointers');
const mixedOrder = process.argv.find(arg => arg.startsWith('--mixed-order='))?.split('=')[1] || 'touch';
const mixedTarget = process.argv.find(arg => arg.startsWith('--mixed-target='))?.split('=')[1] || 'hold';
const mixedRelease = process.argv.find(arg => arg.startsWith('--mixed-release='))?.split('=')[1] || 'other';
const multiTouch = process.argv.includes('--multi-touch') || mixedPointers;
const touchDrag = process.argv.includes('--touch-drag');
const touchDragSurface = process.argv.find(arg => arg.startsWith('--touch-surface='))?.split('=')[1] || 'festa';
const touchScroll = process.argv.includes('--touch-scroll');
const touchCanvas = process.argv.includes('--touch-canvas');
const touchArea = process.argv.find(arg => arg.startsWith('--touch-area='))?.split('=')[1] || '';
const dragLimit = process.argv.includes('--drag-limit');
const limitEdge = process.argv.find(arg => arg.startsWith('--limit-edge='))?.split('=')[1] || 'left';
const limitMouse = dragLimit && process.argv.includes('--limit-pointer=mouse');
const touchViewport = touchDrag && touchScroll && touchDragSurface === 'casa' ? { width: 600, height: 300 }
  : touchDrag && touchScroll && touchDragSurface === 'bichos' ? { width: 600, height: 120 }
  : touchDrag && touchScroll && touchDragSurface === 'vitrine' ? { width: 360, height: 600 }
  : { width: 1100, height: 850 };
const cancelledClick = process.argv.includes('--cancelled-click') || cancelledKeyboard;
const volumeClose = process.argv.includes('--volume-close');
const volumeQuit = process.argv.includes('--volume-quit');
const volumeGesture = process.argv.includes('--volume-gesture') || volumeClose || volumeQuit;
const replacementFailure = process.argv.includes('--replacement-failure');
const importFailure = process.argv.includes('--import-failure') || replacementFailure;
const profile = fs.mkdtempSync(path.join(__dirname, `electron-window-handoff-profile-${process.pid}-`));
app.setPath('userData', profile);
app.setPath('sessionData', profile);
app.disableHardwareAcceleration();
const { GameEngine } = require(path.join(root, 'src/core'));
const data = require(path.join(root, 'src/data'));
function prepareSource() {
  const source = new GameEngine(data, null, { rng: () => 0.5 });
  while (source.state.size < (activeRounds || mataVisibility ? 50 : 35)) source.addFame(source.fameNeed() - source.state.fame);
  source.state.tickets = 100;
  source.state.cheer = 100000;
  source.tick(0.01);
  assert.equal(source.buyLevel('rebolado'), true);
  assert.equal(source.buyItem('palha-furada'), true);
  assert.equal(source.equip('palha-furada'), true);
  assert.ok(source.fish());
  if (activeRounds || mataVisibility) {
    source.state.cheer = 1e12;
    for (const stat of data.stats) while (source.level(stat.id) < 30) assert.equal(source.buyLevel(stat.id), true);
    source.mini('mata').setAuto(mataVisibility);
  }
  fs.writeFileSync(path.join(profile, 'save.json'), JSON.stringify(source.exportState()));
  fs.writeFileSync(path.join(profile, 'window-settings.json'), JSON.stringify({ language: 'pt-BR', zoom: 0.5 }));
}
const page = path.join(profile, 'index.html');
const holdTimerHooks = wakeHold ? `
  const auditTimeout = setTimeout.bind(globalThis), auditInterval = setInterval.bind(globalThis);
  globalThis.setTimeout = (callback, ms, ...args) => {
    if (ms === 380) globalThis.__auditStartRepeat = callback;
    return auditTimeout(callback, ms, ...args);
  };
  globalThis.setInterval = (callback, ms, ...args) => {
    if (ms === 80) globalThis.__auditRepeat = callback;
    return auditInterval(callback, ms, ...args);
  };` : '';
fs.writeFileSync(page, fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace('<head>',
  `<head><base href="${pathToFileURL(root + path.sep).href}"><script>globalThis.__gravador = api => { globalThis.__handoffAudit = api; };${holdTimerHooks}</script>`));
const windows = [], appEvents = {}, displayEvents = {}, powerEvents = {}, errors = [];
let menu = [], complete = false;
const report = { pid: process.pid, profile, activeRounds, pickerReselect, photoDownloads, festaPressResize, wakeInput, wakeSave, suspendGesture, wakeHold, cancelledClick, cancelledKeyboard, mixedKeyboardButtons, keyboardRedraw, cardSpaceRepeat, languageGestures, multiTouch, volumeGesture, volumeClose, volumeQuit, importFailure, replacementFailure, electron: process.versions.electron, changes: [], errors };
function finish(error) {
  if (complete) return;
  complete = true;
  if (error) report.error = error.stack || error.message;
  const filename = mataVisibility ? 'mata-window-verification.json' : zoomWheel ? `zoom-wheel-${zoomWheelCase}-${zoomWheelDirection}-verification.json` : languageGestures ? 'language-gestures-verification.json' : mixedKeyboardButtons ? 'mixed-keyboard-buttons-verification.json' : cardSpaceRepeat ? 'card-space-repeat-verification.json' : keyboardRedraw ? 'keyboard-redraw-verification.json' : volumeQuit ? 'volume-quit-verification.json' : volumeClose ? 'volume-close-verification.json' : volumeGesture ? 'volume-gesture-verification.json' : cancelledKeyboard ? 'cancelled-keyboard-verification.json' : cancelledClick ? 'cancelled-click-verification.json' : wakeHold ? 'wake-hold-verification.json' : suspendGesture ? 'suspend-gesture-verification.json' : wakeSave ? 'wake-save-verification.json' : wakeInput ? 'wake-input-verification.json' : festaPressResize ? 'festa-press-resize-verification.json' : photoDownloads ? 'photo-download-verification.json' : pickerReselect ? 'picker-reselect-verification.json' : replacementFailure ? 'replacement-save-verification.json' : importFailure ? 'import-save-verification.json' : activeRounds ? 'active-round-handoff-verification.json' : 'window-handoff-verification.json';
  const touchFilename = touchDragSurface === 'festa' && !touchScroll ? 'touch-drag-verification.json'
    : `touch-${touchScroll ? 'scroll' : 'drag'}-${touchDragSurface}${touchCanvas ? '-canvas' : touchArea ? '-' + touchArea : ''}-verification.json`;
  const mixedFilename = process.argv.some(arg => /^--mixed-(order|target|release)=/.test(arg))
    ? `mixed-pointers-${mixedOrder}-${mixedTarget}-${mixedRelease}-verification.json` : 'mixed-pointers-verification.json';
  fs.writeFileSync(path.join(__dirname, touchDrag ? dragLimit ? `drag-limit-${touchDragSurface}-${limitEdge}${limitMouse ? '-mouse' : ''}-verification.json` : touchFilename : mixedPointers ? mixedFilename : multiTouch ? 'multi-touch-verification.json' : filename), JSON.stringify(report, null, 2) + '\n');
  app.exit(error ? 1 : 0);
}
const auditDeadline = languageGestures ? 120000 : zoomWheel || mataVisibility ? 60000 : multiTouch && !mixedPointers ? 50000 : 40000;
setTimeout(() => finish(new Error('A auditoria de troca de janela excedeu ' + auditDeadline / 1000 + ' segundos.')), auditDeadline);
class HiddenWindow extends BrowserWindow {
  constructor(options) {
    super({ ...options, transparent: false, show: false, ...touchViewport,
      webPreferences: { ...options.webPreferences, backgroundThrottling: false } });
    windows.push(this);
    this.on('close', () => { this.closing = true; });
    this.webContents.on('did-finish-load', () => { this.pageReady = true; });
    this.webContents.on('console-message', (_event, details) => { if (details.level === 'error') errors.push(details.message); });
  }
  // Esta auditoria usa o ciclo nativo de fechamento e carga sem mostrar a janela ou criar uma bandeja no desktop.
  show() {}
  showInactive() {}
  moveTop() {}
  setAlwaysOnTop() {}
  focus() { this.webContents.focus(); }
  // A emulação de toque precisa da placa visível; só o foco do desktop é simulado nessa janela oculta.
  isFocused() { return mataVisibility ? mataFocused : multiTouch || touchDrag || zoomWheel || activeRounds || super.isFocused(); }
  loadFile() { return super.loadFile(page); }
  setBounds(bounds, ...args) { this.lastRequestedBounds = { ...bounds }; return super.setBounds(bounds, ...args); }
}
const display = { id: 1, workArea: { x: 0, y: 0, ...touchViewport }, size: { ...touchViewport } };
const mockElectron = { ...electron, BrowserWindow: HiddenWindow,
  app: { isPackaged: false, requestSingleInstanceLock: () => true, whenReady: () => Promise.resolve(),
    getPath: name => name === 'appData' ? path.join(profile, 'appdata') : profile, getLocale: () => 'pt-BR',
    setAppUserModelId() {}, on: (name, callback) => {
      appEvents[name] = callback;
      if (volumeQuit && name === 'before-quit') app.on(name, callback);
    },
    quit: () => volumeQuit ? app.quit() : finish(new Error('O processo principal encerrou durante a troca.')) },
  Tray: class { setToolTip() {} on() {} setContextMenu(value) { menu = value; } },
  Menu: { buildFromTemplate: value => value },
  nativeImage: { createFromPath: () => ({}) },
  screen: { getAllDisplays: () => [display], getPrimaryDisplay: () => display, getCursorScreenPoint: () => ({ x: -1, y: -1 }),
    on: (name, callback) => { displayEvents[name] = callback; } },
  powerMonitor: { on: (name, callback) => { powerEvents[name] = callback; } }
};
const steam = { config: { required: false, overlay: false }, init: () => true, available: false, language: () => null,
  info: () => ({ on: false }), restartIfNeeded: () => false };
const waitForPage = async index => {
  const deadline = Date.now() + 12000;
  while ((!windows[index] || windows[index].webContents.isLoading()) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
  const win = windows[index];
  assert.ok(win && !win.isDestroyed(), 'a janela esperada foi criada');
  await win.webContents.executeJavaScript(`(async () => {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (!globalThis.__handoffAudit) throw new Error('A página não iniciou o jogo.');
    return true;
  })()`);
  return win;
};
app.whenReady().then(async () => {
  prepareSource();
  vm.runInNewContext(fs.readFileSync(path.join(root, 'desktop/main.js'), 'utf8'), {
    __dirname: path.join(root, 'desktop'), Buffer, setTimeout, clearTimeout, setInterval,
    console: { log() {}, warn: (...args) => errors.push(args.map(String).join(' ')), error: (...args) => errors.push(args.map(String).join(' ')) },
    require: name => name === 'electron' ? mockElectron : name === './steam' ? { createSteam: () => steam }
      : name.startsWith('.') ? require(path.resolve(root, 'desktop', name)) : require(name)
  });
  let win = await waitForPage(0);
  report.saves = [];
  ipcMain.on('game:save', (event, state) => {
    if (windows.some(own => !own.isDestroyed() && own.webContents.id === event.sender.id)) {
      const disk = JSON.parse(fs.readFileSync(path.join(profile, 'save.json'), 'utf8'));
      report.saves.push({ sender: event.sender.id, state: JSON.parse(JSON.stringify(state)), disk });
    }
  });
  if (mataVisibility) {
    report.forest = { languages: [], simulatedDesktopFocusAndVisibility: true };
    const inspect = () => win.webContents.executeJavaScript(`(() => {
      const engine = __handoffAudit.engine(), info = engine.mini('mata').info();
      return { state: engine.state.minis.mata, hero: info.hero, enemies: info.enemies,
        clock: info.clock, t: info.t, phase: info.phase, seq: info.seq, paused: info.paused,
        visible: __handoffAudit.ui.janelas.visible('mata'), focused: __handoffAudit.ui.focused };
    })()`);
    const combat = snapshot => Object.fromEntries(Object.entries(snapshot).filter(([key]) => !['paused', 'visible', 'focused'].includes(key)));
    const waitUntil = async source => {
      const deadline = Date.now() + 10000;
      while (Date.now() < deadline) {
        if (await win.webContents.executeJavaScript(source)) return;
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      throw new Error('A transição da Mata não chegou: ' + source);
    };
    const click = async selector => {
      const point = await win.webContents.executeJavaScript(`(() => {
        const button = document.querySelector(${JSON.stringify(selector)}), box = button?.getBoundingClientRect();
        if (!box?.width) throw new Error('O botão da Mata não está disponível.');
        const x = Math.round(box.left + box.width / 2), y = Math.round(box.top + box.height / 2);
        if (!button.contains(document.elementFromPoint(x, y))) throw new Error('O botão da Mata está coberto.');
        return { x, y, count: __forestClicks.length };
      })()`);
      win.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, x: point.x, y: point.y });
      win.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, x: point.x, y: point.y });
      await waitUntil(`__forestClicks.length > ${point.count}`);
      await win.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    };
    for (const [index, language] of ['pt-BR', 'en', 'es'].entries()) {
      if (index) {
        const old = win;
        await old.webContents.executeJavaScript(`arraiaDesktop.setLanguage(${JSON.stringify(language)}); true`);
        win = await waitForPage(index);
        assert.equal(old.isDestroyed(), true);
      }
      await win.webContents.executeJavaScript(`(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
        document.querySelector('#janela [data-action="fechar-janela"]')?.click();
        globalThis.__forestClicks = [];
        document.addEventListener('click', event => {
          if (event.isTrusted) __forestClicks.push({ action: event.target.closest?.('[data-action]')?.dataset.action });
        }, true);
        const engine = __handoffAudit.engine();
        engine.mini('mata').setAuto(true);
        return true;
      })()`);
      const result = { language, loaded: await inspect() };
      report.forest.languages.push(result);
      assert.equal(result.loaded.visible, false);
      assert.equal(result.loaded.paused, true);
      assert.equal(result.loaded.hero, null);
      await win.webContents.executeJavaScript('__handoffAudit.engine().advance(30); true');
      assert.deepEqual(combat(await inspect()), combat(result.loaded), 'a janela fechada não começa a lutar depois da carga');
      await click('#placa [data-action="mini"][data-mini="mata"]');
      await waitUntil('__handoffAudit.engine().mini("mata").info().clock > 1.2');
      result.opened = await inspect();
      assert.ok(result.opened.visible && !result.opened.paused && result.opened.hero);
      await click('#mini-mata [data-action="mini-fechar"]');
      await waitUntil('!__handoffAudit.ui.janelas.visible("mata")');
      result.closed = await inspect();
      await win.webContents.executeJavaScript('__handoffAudit.engine().advance(90); true');
      await new Promise(resolve => setTimeout(resolve, 400));
      assert.deepEqual(combat(await inspect()), combat(result.closed), 'fechar pelo X congela a luta e os prêmios');
      const reopenAt = Date.now();
      await click('#placa [data-action="mini"][data-mini="mata"]');
      await waitUntil(`__handoffAudit.engine().mini("mata").info().clock > ${result.closed.clock}`);
      result.reopened = await inspect();
      result.reopenElapsedSeconds = (Date.now() - reopenAt) / 1000;
      assert.ok(result.reopened.clock <= result.closed.clock + result.reopenElapsedSeconds + 0.5,
        'reabrir avança somente o tempo real decorrido depois da abertura');
      mataFocused = false;
      win.emit('blur');
      await waitUntil('__handoffAudit.ui.focused === false');
      result.unfocused = await inspect();
      await win.webContents.executeJavaScript('__handoffAudit.engine().advance(30); true');
      assert.deepEqual(combat(await inspect()), combat(result.unfocused), 'a luta pausa quando a janela fica invisível por perda de foco');
      mataFocused = true;
      win.emit('focus');
      await waitUntil('__handoffAudit.ui.focused === true');
      await waitUntil(`__handoffAudit.engine().mini("mata").info().clock > ${result.unfocused.clock}`);
      await win.webContents.executeJavaScript('__handoffAudit.engine().mini("mata").setAuto(false); true');
      result.manuallyPaused = await inspect();
      await click('#mini-mata [data-action="mini-fechar"]');
      await click('#placa [data-action="mini"][data-mini="mata"]');
      assert.equal((await inspect()).state.auto, false);
      assert.deepEqual(combat(await inspect()), combat(result.manuallyPaused), 'reabrir conserva a pausa manual');
      await click('#mini-mata [data-action="mini-fechar"]');
      await waitUntil('!__handoffAudit.ui.janelas.visible("mata")');
      await new Promise(resolve => setTimeout(resolve, 400));
      const settings = JSON.parse(fs.readFileSync(path.join(profile, 'window-settings.json')));
      assert.equal(settings.minis.mata.hidden, true, 'a preferência de janela fechada chegou ao disco');
      result.nativeClicks = await win.webContents.executeJavaScript('__forestClicks.slice()');
    }
    assert.deepEqual(errors, []);
    finish();
    return;
  }
  if (zoomWheel) {
    report.zoomWheel = { case: zoomWheelCase, direction: zoomWheelDirection };
    const point = () => win.webContents.executeJavaScript(`(() => {
      const button = document.querySelector('#placa [data-action="zoom-alca"]'), box = button.getBoundingClientRect();
      const x = Math.round(box.left + box.width / 2), y = Math.round(box.top + box.height / 2);
      if (!button.contains(document.elementFromPoint(x, y))) throw new Error('A alça de tamanho não está disponível no ponto.');
      return { x, y };
    })()`);
    await win.webContents.executeJavaScript(`(() => {
      document.querySelector('#janela [data-action="fechar-janela"]')?.click();
      globalThis.__zoomWheelEvents = [];
      for (const type of ['pointerdown', 'pointermove', 'pointerup', 'wheel', 'click']) document.addEventListener(type, event => {
        __zoomWheelEvents.push({ type, trusted: event.isTrusted, pointerType: event.pointerType, primary: event.isPrimary,
          x: event.clientX, y: event.clientY, deltaX: event.deltaX, deltaY: event.deltaY, buttons: event.buttons,
          action: event.target.closest?.('[data-action]')?.dataset.action });
      }, true);
    })()`);
    const inspect = () => win.webContents.executeJavaScript(`({ zoom: __handoffAudit.ui.settings.zoom,
      drag: __handoffAudit.ui.drag?.kind || null, moved: !!__handoffAudit.ui.drag?.moved,
      guideHidden: document.querySelector('#zoom-guia').hidden, events: __zoomWheelEvents.slice() })`);
    const input = async event => {
      const count = await win.webContents.executeJavaScript('__zoomWheelEvents.length');
      win.webContents.sendInputEvent(event);
      const expected = { mouseDown: 'pointerdown', mouseMove: 'pointermove', mouseUp: 'pointerup', mouseWheel: 'wheel' }[event.type];
      const deadline = Date.now() + 10000;
      let arrived = false;
      while (!arrived && Date.now() < deadline) {
        arrived = await win.webContents.executeJavaScript(`__zoomWheelEvents.slice(${count}).some(event =>
          event.type === ${JSON.stringify(expected)} && event.trusted)`);
        if (!arrived) await new Promise(resolve => setTimeout(resolve, 25));
      }
      assert.ok(arrived, 'o evento nativo chegou: ' + event.type);
      return inspect();
    };
    win.webContents.focus();
    const p = await point();
    report.zoomWheel.before = await inspect();
    const pressed = zoomWheelCase !== 'wheel-only';
    if (pressed) report.zoomWheel.pressed = await input({ type: 'mouseDown', button: 'left', clickCount: 1, ...p });
    let cursor = p;
    if (zoomWheelCase === 'drag') {
      cursor = { x: p.x + 6, y: p.y };
      report.zoomWheel.dragged = await input({ type: 'mouseMove', modifiers: ['leftButtonDown'], ...cursor });
    }
    report.zoomWheel.beforeWheel = await inspect();
    // The renderer's deltaY is authoritative: Electron and DOM wheel deltas use opposite signs.
    const wheeled = await input({ type: 'mouseWheel', ...cursor,
      deltaY: zoomWheelCase === 'horizontal' ? 0 : zoomWheelDirection === 'in' ? 120 : -120,
      deltaX: zoomWheelCase === 'horizontal' ? 120 : 0, modifiers: pressed ? ['leftButtonDown'] : [], canScroll: true });
    report.zoomWheel.wheeled = wheeled;
    const wheelEvent = wheeled.events.findLast(event => event.type === 'wheel');
    assert.equal(wheelEvent.action, 'zoom-alca');
    await new Promise(resolve => setTimeout(resolve, 850));
    report.zoomWheel.waited = await inspect();
    if (zoomWheelCase === 'drag') {
      cursor = { x: p.x + 8, y: p.y };
      report.zoomWheel.movedAfterWheel = await input({ type: 'mouseMove', modifiers: ['leftButtonDown'], ...cursor });
    }
    if (zoomWheelCase === 'cancel') powerEvents.suspend();
    if (pressed) report.zoomWheel.ended = await input({ type: 'mouseUp', button: 'left', clickCount: 1, ...cursor });
    else report.zoomWheel.ended = await inspect();
    await new Promise(resolve => setTimeout(resolve, 400));
    report.zoomWheel.saved = JSON.parse(fs.readFileSync(path.join(profile, 'window-settings.json'))).zoom;
    const fresh = await point();
    win.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...fresh });
    win.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...fresh });
    await win.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))');
    report.zoomWheel.fresh = await inspect();
    const resized = zoomWheelCase !== 'horizontal';
    const afterWheel = report.zoomWheel.beforeWheel.zoom * 1.12 ** (-Math.sign(wheelEvent.deltaY));
    assert.ok(Math.abs(wheeled.zoom - afterWheel) < 1e-9, 'a roda aplica o tamanho previsto');
    const expected = zoomWheelCase === 'horizontal' ? 1 : zoomWheelCase === 'drag' ? afterWheel * 2 ** (2 / 160) : afterWheel;
    assert.ok(Math.abs(report.zoomWheel.ended.zoom - expected) < 1e-9, 'o movimento e a soltura conservam o ajuste da roda');
    assert.ok(Math.abs(report.zoomWheel.saved - expected) < 1e-9, 'o ajuste final chegou ao disco');
    assert.equal(report.zoomWheel.waited.guideHidden, !pressed || !resized, 'a guia só permanece enquanto há um arrasto ativo');
    assert.equal(report.zoomWheel.ended.drag, null);
    assert.equal(report.zoomWheel.fresh.zoom, 1, 'um novo clique continua restaurando 100%');
    assert.equal(report.zoomWheel.fresh.guideHidden, true);
    assert.deepEqual(errors, []);
    finish();
    return;
  }
  if (touchDrag) {
    report.touchDrag = { phase: 'prepare', surface: touchDragSurface, scrolling: touchScroll, canvas: touchCanvas, area: touchArea, dragLimit, limitEdge, pointerType: limitMouse ? 'mouse' : 'touch' };
    const pageEval = async source => {
      const result = await win.webContents.executeJavaScript(`(async () => {
        try { return { ok: true, result: await (${source}) }; }
        catch (error) { return { ok: false, error: error.stack || String(error) }; }
      })()`);
      assert.equal(result.ok, true, result.error);
      return result.result;
    };
    const prepared = await pageEval(`(async () => {
      document.querySelector('#janela [data-action="fechar-janela"]')?.click();
      for (const action of ['fechar', 'vitrine-fechar', 'tela-fechar', 'argolas-fechar', 'casa-fechar']) {
        document.querySelector('[data-action="' + action + '"]')?.click();
      }
      for (const button of document.querySelectorAll('[data-action="mini-fechar"]')) button.click();
      const surface = ${JSON.stringify(touchDragSurface)}, scrolling = ${touchScroll};
      const maps = {
        festa: ['#festa', '#festa-canvas', 'festa'], placa: ['#placa', '#placa .placa-linha', 'placa'],
        vitrine: ['#vitrine', '#vitrine .vitrine-saldo', 'vitrine'], painel: ['#painel', '#painel .painel-topo', 'janela'],
        tela: ['#tela', '#tela .painel-topo', 'janela'], argolas: ['#argolas', '#argolas .painel-topo', 'janela'],
        casa: ['#casa', '#casa .casa-topo', 'casa'], bichos: ['#mini-bichos', '#mini-bichos .casa-topo', 'mini']
      };
      const map = maps[surface];
      if (!map) throw new Error('Superfície desconhecida: ' + surface);
      if (surface === 'casa') {
        if (scrolling) document.querySelector('#placa [data-action="zoom-alca"]').click();
        const engine = __handoffAudit.engine();
        while (engine.state.size < (scrolling ? 200 : 100)) engine.addFame(engine.fameNeed() - engine.state.fame);
        engine.mini('mata').setAuto(false);
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        for (const button of document.querySelectorAll('[data-action="mini-fechar"]')) button.click();
      }
      const open = { vitrine: '[data-action="vitrine"]', painel: '[data-action="abrir"]',
        tela: '[data-action="tela"][data-tela="correio"]', argolas: '[data-action="argolas"]',
        casa: '[data-action="casa"]', bichos: '[data-action="mini"][data-mini="bichos"]' }[surface];
      if (open) document.querySelector('#placa ' + open).click();
      if (${JSON.stringify(touchArea)} === 'card') document.querySelector('#vitrine [data-action="vitrine-cat"][data-cat="chapeu"]').click();
      if (scrolling && surface === 'painel') document.querySelector('#painel [data-action="tab"][data-tab="ajustes"]').click();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const owner = document.querySelector(map[0]);
      const customArea = ${JSON.stringify(touchArea)};
      const area = customArea ? owner.querySelector({ body: '.vitrine-corpo', details: '.vitrine-detalhe',
          card: '[role="button"][data-id="lenco-chita"]' }[customArea])
        : ${touchCanvas} ? owner.querySelector('canvas') : scrolling
        ? (surface === 'vitrine' ? owner.querySelector('.vabas') : surface === 'painel'
          ? document.querySelector('#painel-corpo') : owner.querySelector('.casa-cena')) : document.querySelector(map[1]);
      const scrollAxis = surface === 'vitrine' ? 'x' : 'y';
      const box = area.getBoundingClientRect(), ownerBox = owner.getBoundingClientRect();
      if (scrolling) {
        area.scrollTop = 0;
        area.scrollLeft = 0;
        if (!(scrollAxis === 'x' ? area.scrollWidth > area.clientWidth : area.scrollHeight > area.clientHeight)) throw new Error('O conteúdo não precisa rolar: ' + surface + ' ' +
          JSON.stringify({ width: innerWidth, height: innerHeight, clientHeight: area.clientHeight, scrollHeight: area.scrollHeight,
            canvas: area.querySelector('canvas')?.style.height, hidden: owner.hidden, house: __handoffAudit.engine().houseInfo() }));
      }
      let point;
      if (customArea === 'card') point = { x: Math.round(box.left + box.width / 2), y: Math.round(box.top + box.height / 2) };
      const label = !point && !scrolling && area.querySelector('h2, .recurso b, .vcard-topo b');
      if (label) {
        const labelBox = label.getBoundingClientRect();
        const x = Math.round(labelBox.left + labelBox.width / 2), y = Math.round(labelBox.top + labelBox.height / 2);
        const target = document.elementFromPoint(x, y);
        if (area.contains(target) && !target.closest('button, input, select, a, [data-action], [data-hold]')) point = { x, y };
      }
      for (let fy = .9; fy >= .1 && !point; fy -= .1) for (let fx = .9; fx >= .1 && !point; fx -= .1) {
        const x = Math.round(box.left + box.width * fx), y = Math.round(box.top + box.height * fy);
        const target = document.elementFromPoint(x, y);
        if (!area.contains(target) || (!(scrolling && surface === 'vitrine') && target.closest('button, input, select, a, [data-action], [data-hold]'))) continue;
        if (surface === 'festa' && __handoffAudit.ui.festa.hit(x, y) !== 'terreiro') continue;
        point = { x, y };
      }
      if (!point) throw new Error('A área não está disponível para o toque: ' + surface);
      globalThis.__dragTouchEvents = [];
      for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'touchstart', 'touchmove', 'touchend', 'click']) document.addEventListener(type, event => {
        __dragTouchEvents.push({ type, pointerId: event.pointerId, pointerType: event.pointerType, primary: event.isPrimary,
          trusted: event.isTrusted, at: performance.now(), x: event.clientX ?? event.changedTouches?.[0]?.clientX,
          y: event.clientY ?? event.changedTouches?.[0]?.clientY, button: event.button, buttons: event.buttons,
          target: event.target.tagName, owner: event.target.closest?.('.ui')?.id,
          action: event.target.closest?.('[data-action]')?.dataset.action, connected: event.target.isConnected });
      }, true);
      globalThis.__touchDragOwner = owner;
      globalThis.__touchDragArea = area;
      const edge = ${JSON.stringify(limitEdge)};
      const limitDelta = edge === 'left' ? { x: 16 - point.x, y: 0 }
        : edge === 'right' ? { x: innerWidth - 16 - point.x, y: 0 }
        : edge === 'top' ? { x: 0, y: 16 - point.y }
        : edge === 'bottom' ? { x: 0, y: innerHeight - 16 - point.y } : null;
      if (${dragLimit} && (!limitDelta || surface === 'vitrine' && limitDelta.y)) throw new Error('Borda inválida para a superfície.');
      const ui = __handoffAudit.ui;
      let limitBound;
      if (surface === 'festa') {
        const size = ui.festa.size();
        limitBound = limitDelta.x ? { key: 'left', value: edge === 'left' ? 0 : Math.max(0, innerWidth - size.width) }
          : { key: 'lift', value: edge === 'bottom' ? 0 : Math.max(0, innerHeight - size.top - 8) };
      } else if (surface === 'vitrine') limitBound = { key: 'left', value: edge === 'left' ? 8 : Math.max(8, innerWidth - ownerBox.width - 8) };
      else if (['painel', 'tela', 'argolas'].includes(surface)) {
        limitBound = limitDelta.x ? { key: 'left', value: edge === 'left' ? 8 : Math.max(8, innerWidth - owner.offsetWidth - 8) }
          : { key: 'top', value: edge === 'top' ? 8 : Math.max(8, innerHeight - owner.offsetHeight - 8) };
      } else {
        let width = ownerBox.width, height = ownerBox.height;
        if (surface === 'casa' || surface === 'bichos') {
          const canvas = surface === 'casa' ? ui.casa.size() : ui.janelas.windows.get('bichos').view.size();
          width = Math.max(owner.offsetWidth, canvas.width + 12);
          height = Math.max(owner.offsetHeight, (surface === 'casa' ? Math.min(canvas.height, innerHeight - 76) : canvas.height) + 38);
        }
        limitBound = limitDelta.x ? { key: 'left', value: edge === 'left' ? 6 : Math.max(6, innerWidth - width - 6) }
          : { key: 'bottom', value: edge === 'bottom' ? 6 : Math.max(6, innerHeight - height - 6) };
      }
      return { point, touchAction: getComputedStyle(area).touchAction, expectedDrag: map[2], scrollAxis,
        limitBound,
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
        delta: ${dragLimit} ? limitDelta : scrolling ? (scrollAxis === 'x' ? { x: -100, y: 0 } : { x: surface === 'painel' ? 0 : 25,
          y: surface === 'bichos' ? -60 : -100 }) : { x: ownerBox.left + ownerBox.width / 2 > innerWidth / 2 ? -50 : 50,
          y: surface === 'vitrine' ? 0 : ownerBox.top + ownerBox.height / 2 > innerHeight / 2 ? -25 : 25 },
        scrollHeight: area.scrollHeight, clientHeight: area.clientHeight };
    })()`);
    report.touchDrag.prepared = prepared;
    win.webContents.focus();
    win.webContents.debugger.attach();
    let lastPointerPoint;
    const touch = async (type, touchPoints) => {
      const count = await win.webContents.executeJavaScript('__dragTouchEvents.length');
      if (limitMouse) {
        const point = touchPoints[0] || lastPointerPoint;
        lastPointerPoint = point;
        win.webContents.sendInputEvent({ type: { touchStart: 'mouseDown', touchMove: 'mouseMove', touchEnd: 'mouseUp' }[type],
          x: Math.round(point.x), y: Math.round(point.y), button: 'left', clickCount: 1,
          modifiers: type === 'touchEnd' ? [] : ['leftButtonDown'] });
      } else await win.webContents.debugger.sendCommand('Input.dispatchTouchEvent', { type, touchPoints });
      const expected = type === 'touchStart' ? 'pointerdown' : type === 'touchEnd' ? (touchScroll ? 'touchend' : 'pointerup') : touchScroll ? 'touchmove' : 'pointermove';
      const point = touchPoints[0], deadline = Date.now() + 10000;
      let received = false;
      while (!received && Date.now() < deadline) {
        received = await win.webContents.executeJavaScript(`__dragTouchEvents.slice(${count}).some(event =>
          event.type === ${JSON.stringify(expected)} && ${point ? `Math.abs(event.x - ${point.x}) <= 1 && Math.abs(event.y - ${point.y}) <= 1` : 'true'})`);
        if (!received) await new Promise(resolve => setTimeout(resolve, 25));
      }
      assert.ok(received, 'o evento nativo chegou à página: ' + expected);
      await win.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))');
    };
    const inspect = () => win.webContents.executeJavaScript(`(() => {
      const box = __touchDragOwner.getBoundingClientRect(), ui = __handoffAudit.ui;
      const engine = __handoffAudit.engine();
      return { x: ui.settings.x, lift: ui.settings.lift, left: box.left, top: box.top, bottom: parseFloat(__touchDragOwner.style.bottom), scrollTop: __touchDragArea.scrollTop,
        scrollLeft: __touchDragArea.scrollLeft, category: ui.dock.cat,
        tickets: engine.state.tickets, ownsCard: engine.owned('lenco-chita'), equipped: { ...engine.state.equipped },
        drag: ui.drag?.kind || null, mousePress: !!ui.press, focused: ui.focused, events: __dragTouchEvents.slice(),
        prefs: ${JSON.stringify(touchDragSurface)} === 'festa' ? { x: ui.settings.x, lift: ui.settings.lift }
          : ${JSON.stringify(touchDragSurface)} === 'placa' ? { placa: ui.settings.placa }
          : ${JSON.stringify(touchDragSurface)} === 'casa' ? { casa: ui.settings.casa }
          : ${JSON.stringify(touchDragSurface)} === 'bichos' ? { minis: ui.settings.minis } : null };
    })()`);
    const before = await inspect();
    report.touchDrag.before = before;
    const start = { id: 1, ...prepared.point, radiusX: 1, radiusY: 1, force: 1 };
    await touch('touchStart', [start]);
    const pressed = await inspect();
    report.touchDrag.pressed = pressed;
    await touch('touchMove', [{ ...start, x: start.x + prepared.delta.x * (dragLimit ? 1 : .4), y: start.y + prepared.delta.y * (dragLimit ? 1 : .4) }]);
    const firstMoved = await inspect();
    report.touchDrag.firstMoved = firstMoved;
    await touch('touchMove', [{ ...start, x: start.x + prepared.delta.x - (dragLimit ? Math.sign(prepared.delta.x) * 20 : 0),
      y: start.y + prepared.delta.y - (dragLimit ? Math.sign(prepared.delta.y) * 20 : 0) }]);
    const lastMoved = await inspect();
    report.touchDrag.lastMoved = lastMoved;
    await touch('touchEnd', []);
    await new Promise(resolve => setTimeout(resolve, 400));
    const ended = await inspect();
    report.touchDrag.ended = ended;
    assert.ok(pressed.events.some(event => event.type === 'pointerdown' && event.trusted && event.pointerType === (limitMouse ? 'mouse' : 'touch') && event.primary));
    if (touchScroll) {
      const key = prepared.scrollAxis === 'x' ? 'scrollLeft' : 'scrollTop';
      assert.ok(ended[key] > before[key] + 20, 'o conteúdo ainda rola com o movimento do dedo');
      assert.ok(Math.abs(ended.left - before.left) <= 1 && Math.abs(ended.top - before.top) <= 1,
        'rolar o conteúdo não move a moldura da janela');
      assert.deepEqual(ended.prefs, before.prefs, 'rolar o conteúdo não altera a posição guardada da janela');
      if (touchDragSurface === 'vitrine') assert.equal(ended.category, before.category, 'rolar as abas não troca a categoria');
    } else if (touchArea === 'card') {
      assert.equal(before.ownsCard, false);
      assert.equal(ended.ownsCard, false, 'deslizar sobre um cartão não compra o item');
      assert.equal(ended.tickets, before.tickets, 'o gesto de deslizar não gasta fichas');
      assert.deepEqual(ended.equipped, before.equipped, 'o gesto de deslizar não troca o chapéu');
      const fresh = await pageEval(`(() => {
        const card = document.querySelector('#vitrine [role="button"][data-id="lenco-chita"]'), box = card.getBoundingClientRect();
        return { point: { x: Math.round(box.left + box.width / 2), y: Math.round(box.top + box.height / 2) },
          price: __handoffAudit.engine().items['lenco-chita'].price };
      })()`);
      await touch('touchStart', [{ id: 3, ...fresh.point, radiusX: 1, radiusY: 1, force: 1 }]);
      await touch('touchEnd', []);
      await new Promise(resolve => setTimeout(resolve, 400));
      report.touchDrag.freshTap = await inspect();
      assert.equal(report.touchDrag.freshTap.ownsCard, true, 'um toque novo compra o item');
      assert.equal(report.touchDrag.freshTap.tickets, before.tickets - fresh.price, 'o toque novo paga exatamente uma compra');
      assert.equal(report.touchDrag.freshTap.equipped.chapeu, 'lenco-chita');
    } else {
      assert.equal(pressed.drag, prepared.expectedDrag, 'o toque nativo começou o arrasto da superfície');
      assert.ok(!ended.events.some(event => event.type === 'pointercancel'), 'a rolagem nativa não cancela o arrasto');
      assert.equal(lastMoved.drag, prepared.expectedDrag, 'o gesto continua até a soltura');
      if (!dragLimit) assert.ok(Math.abs(firstMoved.left - before.left) + Math.abs(firstMoved.top - before.top) > 2, 'o primeiro movimento muda a posição');
      assert.ok(Math.abs(lastMoved.left - firstMoved.left) + Math.abs(lastMoved.top - firstMoved.top) > 2, 'o segundo movimento também muda a posição');
      if (dragLimit) {
        assert.ok(Math.abs(firstMoved[prepared.limitBound.key] - prepared.limitBound.value) <= 1, 'a janela chegou à borda antes de voltar');
        const key = prepared.delta.x ? 'left' : 'top', sign = Math.sign(prepared.delta.x || prepared.delta.y);
        assert.ok(Math.abs(lastMoved[key] - (firstMoved[key] - sign * 20)) <= 1,
          'voltar o ponteiro 20 pixels afasta a janela 20 pixels da borda');
        assert.ok(Math.abs(ended[key] - lastMoved[key]) <= 1, 'soltar conserva a posição final');
      }
    }
    assert.equal(ended.drag, null);
    win.webContents.debugger.detach();
    const saved = JSON.parse(fs.readFileSync(path.join(profile, 'window-settings.json'), 'utf8'));
    report.touchDrag.saved = ended.prefs ? Object.fromEntries(Object.keys(ended.prefs).map(key => [key, saved[key]])) : null;
    if (ended.prefs) assert.deepEqual(report.touchDrag.saved, ended.prefs, 'a posição final que o jogo guarda também chegou ao disco');
    assert.deepEqual(errors, []);
    finish();
    return;
  }
  if (multiTouch) {
    report.touch = { phase: 'prepare' };
    const pageEval = async source => {
      const result = await win.webContents.executeJavaScript(`(async () => {
        try { return { ok: true, result: await (${source}) }; }
        catch (error) { return { ok: false, error: error.stack || String(error) }; }
      })()`);
      assert.equal(result.ok, true, result.error);
      return result.result;
    };
    const points = await pageEval(`(() => {
      document.querySelector('#janela [data-action="fechar-janela"]')?.click();
      document.querySelector('#placa [data-action="vitrine"]').click();
      if (${mixedPointers && mixedTarget === 'card'}) document.querySelector('#vitrine [data-action="vitrine-cat"][data-cat="chapeu"]').click();
      __handoffAudit.ui.dock.dx = -300;
      window.dispatchEvent(new Event('resize'));
      const point = selector => {
        const button = document.querySelector(selector), box = button.getBoundingClientRect();
        const x = Math.round(box.x + box.width / 2), y = Math.round(box.y + box.height / 2);
        if (!button.contains(document.elementFromPoint(x, y))) throw new Error('O controle não está no ponto escolhido: ' + selector +
          ' ' + JSON.stringify({ x, y, hit: document.elementFromPoint(x, y)?.outerHTML.slice(0, 180) }));
        return { x, y };
      };
      globalThis.__touchAuditEvents = [];
      for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'click']) document.addEventListener(type, event => {
        const button = event.target.closest?.('[data-action], [data-hold]');
        __touchAuditEvents.push({ type, pointerId: event.pointerId, pointerType: event.pointerType, primary: event.isPrimary,
          trusted: event.isTrusted, at: performance.now(), button: event.button, buttons: event.buttons,
          action: button?.dataset.action, hold: button?.dataset.hold, x: event.clientX, y: event.clientY });
      }, true);
      return { zoom: point('#placa [data-action="zoom-alca"]'), ticket: point('#vitrine [data-hold="ficha"]'),
        foreign: point(${JSON.stringify(mixedTarget === 'card' ? '#vitrine [role="button"][data-id="lenco-chita"]' : '#vitrine [data-hold="ficha"]')}) };
    })()`);
    report.touch.points = points;
    win.webContents.focus();
    win.webContents.debugger.attach();
    const touch = async (type, touchPoints, expectedPoint = touchPoints.at(-1)) => {
      const count = mixedPointers ? 0 : await win.webContents.executeJavaScript('__touchAuditEvents.length');
      await win.webContents.debugger.sendCommand('Input.dispatchTouchEvent', { type, touchPoints });
      if (!mixedPointers) {
        const expected = { touchStart: 'pointerdown', touchMove: 'pointermove', touchEnd: 'pointerup' }[type];
        const deadline = Date.now() + 10000;
        let arrived = false;
        while (!arrived && Date.now() < deadline) {
          arrived = await win.webContents.executeJavaScript(`__touchAuditEvents.slice(${count}).some(event =>
            event.type === ${JSON.stringify(expected)} && event.pointerType === 'touch' &&
            ${expectedPoint ? `Math.abs(event.x - ${expectedPoint.x}) <= 1 && Math.abs(event.y - ${expectedPoint.y}) <= 1` : 'true'})`);
          if (!arrived) await new Promise(resolve => setTimeout(resolve, 25));
        }
        assert.ok(arrived, 'o evento de toque nativo chegou: ' + expected);
      }
      await new Promise(resolve => setTimeout(resolve, 20));
    };
    const inspect = () => win.webContents.executeJavaScript(`({ tickets: __handoffAudit.engine().state.tickets,
      zoom: __handoffAudit.ui.settings.zoom, held: !!__handoffAudit.ui.hold, drag: __handoffAudit.ui.drag?.kind || null,
      ownsCard: __handoffAudit.engine().owned('lenco-chita'), equipped: { ...__handoffAudit.engine().state.equipped },
      events: __touchAuditEvents.slice() })`);
    const a = { id: 1, ...points.zoom, radiusX: 1, radiusY: 1, force: 1 };
    const b = { id: 2, ...points.ticket, radiusX: 1, radiusY: 1, force: 1 };
    const before = await inspect();
    report.touch.before = before;
    if (mixedPointers) {
      report.mixed = { phase: 'start', order: mixedOrder, target: mixedTarget, release: mixedRelease, before };
      const input = async (type, pointerType, point, modifiers = []) => {
        const count = await win.webContents.executeJavaScript('__touchAuditEvents.length');
        if (pointerType === 'touch') await touch(type, type === 'touchEnd' ? [] : [{ id: 1, ...point, radiusX: 1, radiusY: 1, force: 1 }]);
        else win.webContents.sendInputEvent({ type, button: 'left', clickCount: 1, modifiers, ...point });
        const expected = { touchStart: 'pointerdown', touchMove: 'pointermove', touchEnd: 'pointerup',
          mouseDown: 'pointerdown', mouseMove: 'pointermove', mouseUp: 'pointerup' }[type];
        const deadline = Date.now() + 10000;
        let arrived = false;
        while (!arrived && Date.now() < deadline) {
          arrived = await win.webContents.executeJavaScript(`__touchAuditEvents.slice(${count}).some(event =>
            event.type === ${JSON.stringify(expected)} && event.pointerType === ${JSON.stringify(pointerType)})`);
          if (!arrived) await new Promise(resolve => setTimeout(resolve, 25));
        }
        assert.ok(arrived, 'o evento nativo chegou: ' + type);
        await win.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))');
        return inspect();
      };
      const ownerType = mixedOrder, otherType = ownerType === 'touch' ? 'mouse' : 'touch';
      const kinds = { touch: { down: 'touchStart', move: 'touchMove', up: 'touchEnd' },
        mouse: { down: 'mouseDown', move: 'mouseMove', up: 'mouseUp' } };
      const primary = await input(kinds[ownerType].down, ownerType, points.zoom);
      report.mixed.primary = primary;
      assert.equal(primary.drag, 'zoom');
      if (otherType === 'mouse') {
        const hovered = await input('mouseMove', 'mouse', points.foreign);
        report.mixed.hovered = hovered;
        assert.ok(hovered.events.some(event => event.type === 'pointermove' && event.pointerType === 'mouse' && event.trusted && event.buttons === 0));
        assert.equal(hovered.drag, 'zoom', 'passar o mouse sem botão não cancela o arrasto do dedo');
        assert.equal(hovered.zoom, primary.zoom, 'o movimento do mouse não muda o tamanho controlado pelo dedo');
      }
      const foreignDown = await input(kinds[otherType].down, otherType, points.foreign);
      report.mixed.foreignDown = foreignDown;
      assert.equal(foreignDown.tickets, before.tickets, 'o mouse não compra enquanto o dedo controla o arrasto');
      if (mixedRelease === 'other') {
        const foreignUp = await input(kinds[otherType].up, otherType, points.foreign);
        report.mixed.foreignUp = foreignUp;
        assert.equal(foreignUp.drag, 'zoom', 'soltar o outro dispositivo não encerra o arrasto original');
        assert.equal(foreignUp.held, false);
      }
      const moved = await input(kinds[ownerType].move, ownerType, { ...points.zoom, x: points.zoom.x + 20 },
        ownerType === 'mouse' ? ['leftButtonDown'] : []);
      report.mixed.moved = moved;
      assert.ok(moved.zoom > primary.zoom, 'o dedo continua mudando o tamanho depois dos eventos do mouse');
      let ended = await input(kinds[ownerType].up, ownerType, { ...points.zoom, x: points.zoom.x + 20 });
      if (mixedRelease === 'owner') {
        ended = await input(kinds[otherType].up, otherType, points.foreign);
        report.mixed.foreignUp = ended;
      }
      report.mixed.ended = ended;
      assert.equal(ended.drag, null);
      assert.equal(ended.tickets, before.tickets);
      assert.equal(ended.ownsCard, before.ownsCard, 'o clique ignorado não compra o cartão ao chegar depois da soltura');
      assert.deepEqual(ended.equipped, before.equipped);
      const freshPoint = await pageEval(`(() => {
        const button = document.querySelector('#vitrine [data-hold="ficha"]'), box = button.getBoundingClientRect();
        const x = Math.round(box.left + box.width / 2), y = Math.round(box.top + box.height / 2);
        if (!button.contains(document.elementFromPoint(x, y))) throw new Error('A compra nova não está no ponto escolhido.');
        return { x, y };
      })()`);
      // O clique novo chega sem uma inspeção entre apertar e soltar, que prolongaria a compra segurada.
      win.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...freshPoint });
      win.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...freshPoint });
      await win.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))');
      report.mixed.freshUp = await inspect();
      await new Promise(resolve => setTimeout(resolve, 600));
      report.mixed.stopped = await inspect();
      assert.equal(report.mixed.freshUp.tickets, before.tickets + 1, 'um clique novo do mouse ainda compra uma ficha');
      assert.equal(report.mixed.stopped.tickets, report.mixed.freshUp.tickets);
      assert.equal(report.mixed.stopped.held, false);
      assert.deepEqual(errors, []);
      win.webContents.debugger.detach();
      finish();
      return;
    }
    await touch('touchStart', [a]);
    const primary = await inspect();
    report.touch.primary = primary;
    await touch('touchStart', [a, b]);
    const secondary = await inspect();
    report.touch.secondary = secondary;
    await touch('touchMove', [a, { ...b, x: b.x + 30 }]);
    const secondaryMoved = await inspect();
    report.touch.secondaryMoved = secondaryMoved;
    await touch('touchMove', [{ ...a, x: a.x + 20 }, { ...b, x: b.x + 30 }], { x: a.x + 20, y: a.y });
    const primaryMoved = await inspect();
    report.touch.primaryMoved = primaryMoved;
    await touch('touchEnd', []);
    const ended = await inspect();
    report.touch.ended = ended;
    report.touch.phase = 'fresh-touch';
    const freshPoint = await pageEval(`(() => {
      const button = document.querySelector('#vitrine [data-hold="ficha"]');
      button.scrollIntoView({ block: 'center' });
      const box = button.getBoundingClientRect();
      const x = Math.round(box.x + box.width / 2), y = Math.round(box.y + box.height / 2);
      if (!button.contains(document.elementFromPoint(x, y))) throw new Error('A ficha não está no ponto escolhido depois do arrasto.');
      return { x, y };
    })()`);
    await touch('touchStart', [{ id: 3, ...freshPoint, radiusX: 1, radiusY: 1, force: 1 }]);
    const freshPressed = await inspect();
    await touch('touchEnd', []);
    const freshEnded = await inspect();
    await new Promise(resolve => setTimeout(resolve, 600));
    const stopped = await inspect();
    win.webContents.debugger.detach();
    report.touch = { points, before, primary, secondary, secondaryMoved, primaryMoved, ended, freshPressed, freshEnded, stopped };
    assert.ok(secondary.events.some(event => event.type === 'pointerdown' && event.pointerType === 'touch' && event.primary === false && event.trusted && event.hold === 'ficha'),
      'o Chromium gerou o segundo ponteiro de toque nativo');
    assert.equal(primary.drag, 'zoom', 'o primeiro dedo iniciou o arrasto do tamanho');
    assert.equal(primary.held, false);
    assert.equal(secondary.tickets, before.tickets, 'o segundo dedo não inicia uma compra no meio do arrasto');
    assert.equal(secondary.held, false);
    assert.equal(secondaryMoved.zoom, primary.zoom, 'mover o segundo dedo não altera o arrasto do primeiro');
    assert.equal(secondaryMoved.drag, 'zoom', 'o segundo dedo não encerra o arrasto do primeiro');
    assert.ok(primaryMoved.zoom > primary.zoom, 'o primeiro dedo continua mudando o tamanho');
    assert.equal(ended.drag, null);
    assert.equal(freshPressed.held, true, 'um toque novo ainda inicia uma compra');
    assert.ok(freshPressed.tickets >= ended.tickets + 1);
    assert.equal(freshEnded.held, false);
    // A entrega do touchEnd pelo protocolo pode aguardar quadros; compras repetidas antes do pointerup são o comportamento do botão.
    assert.ok(freshEnded.tickets >= freshPressed.tickets);
    assert.equal(stopped.tickets, freshEnded.tickets, 'a repetição não continua depois do pointerup nativo');
    assert.equal(stopped.held, false);
    assert.deepEqual(errors, []);
    finish();
    return;
  }
  if (languageGestures) {
    report.gestures = [];
    const inspect = () => win.webContents.executeJavaScript(`(() => {
      const engine = __handoffAudit.engine(), ui = __handoffAudit.ui;
      return { year: engine.state.year, size: engine.state.size, tickets: engine.state.tickets,
        levels: engine.state.levels, inventory: engine.state.inventory, equipped: engine.state.equipped,
        volume: ui.settings.volume, language: document.documentElement.lang, held: !!ui.hold,
        mousePress: !!ui.press, keyboardPress: !!ui.spacePress, drag: ui.drag?.kind || null, modal: ui.modal };
    })()`);
    const confirm = async () => win.webContents.executeJavaScript(`(async () => {
      document.querySelector('#janela [data-action="fechar-janela"]')?.click();
      const engine = __handoffAudit.engine(), ui = __handoffAudit.ui;
      engine.mini('mata').setAuto(false);
      while (engine.state.size < 100) engine.addFame(engine.fameNeed() - engine.state.fame);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (!ui.open) document.querySelector('#placa [data-action="abrir"]').click();
      document.querySelector('#painel [data-action="ano-novo"]').click();
      const button = document.querySelector('#janela [data-action="ano-novo-sim"]');
      button.focus();
      const box = button.getBoundingClientRect(), x = Math.round(box.x + box.width / 2), y = Math.round(box.y + box.height / 2);
      if (!button.contains(document.elementFromPoint(x, y))) throw new Error('A confirmação não está no ponto escolhido.');
      return { x, y };
    })()`);
    const keyDown = () => {
      win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Space' });
      win.webContents.sendInputEvent({ type: 'char', keyCode: ' ' });
    };
    const mouseDown = spot => win.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...spot });
    const mouseUp = spot => win.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...spot });
    for (const kind of ['mouse', 'space', 'volume', 'hold']) for (const language of ['en', 'es', 'pt-BR']) {
      const entry = { kind, language, startedAt: Date.now(), phase: 'prepare' };
      report.gestures.push(entry);
      let point;
      if (kind === 'mouse' || kind === 'space') point = await confirm();
      else point = await win.webContents.executeJavaScript(`(() => {
        try {
        document.querySelector('#janela [data-action="fechar-janela"]')?.click();
        const ui = __handoffAudit.ui;
        // Each hold case has its own spending money after the confirmation cases have reset the year.
        if (${kind === 'hold'}) __handoffAudit.engine().earn(100000);
        if (${kind === 'volume'}) {
          if (!ui.open) document.querySelector('#placa [data-action="abrir"]').click();
          document.querySelector('#painel [data-action="tab"][data-tab="ajustes"]').click();
        } else if (!ui.dock.open) document.querySelector('#placa [data-action="vitrine"]').click();
        const button = document.querySelector(${JSON.stringify(kind === 'volume' ? '#volume' : '#vitrine [data-hold="ficha"]')});
        button.scrollIntoView({ block: 'center' });
        globalThis.__languageVolumeEvents = [];
        if (${kind === 'volume'}) for (const type of ['input', 'change']) button.addEventListener(type, () => __languageVolumeEvents.push(type));
        const box = button.getBoundingClientRect();
        const fraction = ${kind === 'volume'} ? (ui.settings.volume > .5 ? .2 : .8) : .5;
        const x = Math.round(box.x + box.width * fraction), y = Math.round(box.y + box.height / 2);
        if (!button.contains(document.elementFromPoint(x, y))) throw new Error('O controle não está no ponto escolhido: ' +
          document.elementFromPoint(x, y)?.outerHTML.slice(0, 400) + ' ' + JSON.stringify({ x, y, box }));
        return { x, y };
        } catch (error) { return { auditError: error.stack || String(error), dock: __handoffAudit.ui.dock,
          open: __handoffAudit.ui.open, size: __handoffAudit.engine().state.size }; }
      })()`);
      assert.ok(!point.auditError, JSON.stringify(point));
      entry.phase = 'press';
      win.webContents.focus();
      const before = await inspect();
      if (kind === 'space') keyDown(); else mouseDown(point);
      await new Promise(resolve => setTimeout(resolve, 20));
      const pressed = await inspect();
      entry.before = before;
      entry.pressed = pressed;
      if (kind === 'space') assert.equal(pressed.keyboardPress, true, 'o teclado nativo iniciou a confirmação');
      if (kind === 'mouse') assert.equal(pressed.mousePress, true, 'o mouse nativo iniciou a confirmação');
      if (kind === 'hold') {
        assert.equal(pressed.held, true, 'o mouse nativo iniciou a compra segurada');
        assert.equal(pressed.tickets, before.tickets + 1);
      }
      if (kind === 'volume') {
        assert.equal(pressed.drag, 'barra');
        assert.notEqual(pressed.volume, before.volume, 'a barra aplicou um volume diferente antes de soltar');
        const events = await win.webContents.executeJavaScript('__languageVolumeEvents');
        assert.ok(events.includes('input') && !events.includes('change'), 'o input é nativo e o gesto continua sem change');
      }
      const old = win, sender = old.webContents.id, firstSave = report.saves.length;
      const name = require(path.join(root, 'src/i18n')).LANGUAGES.find(item => item.id === language).name;
      const choice = menu.find(item => item.submenu?.some(child => child.label === name))?.submenu.find(item => item.label === name);
      assert.ok(choice && !choice.checked, 'o idioma escolhido realmente substitui a janela');
      const nextIndex = windows.length;
      entry.phase = 'replace-window';
      choice.click();
      win = await waitForPage(nextIndex);
      await new Promise(resolve => setTimeout(resolve, 420));
      const reopened = await inspect();
      entry.reopened = reopened;
      const closing = report.saves.slice(firstSave).findLast(save => save.sender === sender);
      assert.equal(old.isDestroyed(), true, 'a janela antiga concluiu o fechamento nativo');
      assert.ok(closing, 'beforeunload enviou o progresso antes de fechar');
      assert.deepEqual(closing.disk, closing.state, 'o progresso chegou ao disco pelo IPC');
      for (const key of ['year', 'tickets', 'levels', 'inventory', 'equipped', 'volume']) {
        assert.deepEqual(reopened[key], pressed[key], 'trocar o idioma conserva ' + key);
      }
      assert.equal(reopened.language, language);
      for (const key of ['held', 'mousePress', 'keyboardPress']) assert.equal(reopened[key], false, 'a nova janela não herda ' + key);
      assert.equal(reopened.drag, null);
      if (kind === 'mouse' || kind === 'space') {
        entry.phase = 'release-confirmation';
        const freshPoint = await confirm();
        if (kind === 'space') win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Space' });
        else mouseUp(freshPoint);
        await new Promise(resolve => setTimeout(resolve, 20));
        entry.released = await inspect();
        assert.equal(entry.released.year, pressed.year, 'soltar a entrada antiga não confirma o ano novo na janela substituta');
        assert.equal(entry.released.modal, true);
        if (kind === 'space') {
          keyDown();
          win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Space' });
        } else { mouseDown(freshPoint); mouseUp(freshPoint); }
        await new Promise(resolve => setTimeout(resolve, 20));
        entry.fresh = await inspect();
        assert.equal(entry.fresh.year, pressed.year + 1, 'uma confirmação nova funciona depois da troca de idioma');
        assert.equal(entry.fresh.size, 1);
        assert.equal(entry.fresh.modal, false);
      } else {
        entry.phase = 'release-control';
        mouseUp(point);
        await new Promise(resolve => setTimeout(resolve, 20));
        entry.released = await inspect();
        assert.equal(entry.released.tickets, pressed.tickets, 'a compra antiga não continua nem se repete ao soltar');
        if (kind === 'volume') {
          const stored = JSON.parse(fs.readFileSync(path.join(profile, 'window-settings.json'), 'utf8'));
          entry.stored = { language: stored.language, volume: stored.volume };
          assert.equal(stored.volume, pressed.volume, 'o volume aplicado também permanece no disco');
          assert.equal(stored.language, language);
        }
        const freshPoint = await win.webContents.executeJavaScript(`(() => {
          const ui = __handoffAudit.ui;
          if (${kind === 'volume'}) {
            if (!ui.open) document.querySelector('#placa [data-action="abrir"]').click();
            document.querySelector('#painel [data-action="tab"][data-tab="ajustes"]').click();
          } else if (!ui.dock.open) document.querySelector('#placa [data-action="vitrine"]').click();
          const button = document.querySelector(${JSON.stringify(kind === 'volume' ? '#volume' : '#vitrine [data-hold="ficha"]')});
          button.scrollIntoView({ block: 'center' });
          const box = button.getBoundingClientRect(), fraction = ${kind === 'volume'} ? (ui.settings.volume > .5 ? .2 : .8) : .5;
          const x = Math.round(box.x + box.width * fraction), y = Math.round(box.y + box.height / 2);
          if (!button.contains(document.elementFromPoint(x, y))) throw new Error('O novo controle não está no ponto escolhido.');
          return { x, y };
        })()`);
        mouseDown(freshPoint);
        mouseUp(freshPoint);
        await new Promise(resolve => setTimeout(resolve, 20));
        entry.fresh = await inspect();
        assert.equal(entry.fresh.held, false);
        assert.equal(entry.fresh.drag, null);
        if (kind === 'hold') assert.equal(entry.fresh.tickets, pressed.tickets + 1, 'uma compra nova funciona na janela substituta');
        else assert.notEqual(entry.fresh.volume, pressed.volume, 'uma edição nova do volume funciona na janela substituta');
      }
      entry.passed = true;
      entry.phase = 'complete';
      entry.durationMs = Date.now() - entry.startedAt;
    }
    assert.deepEqual(errors, []);
    report.windows = windows.length;
    finish();
    return;
  }
  if (cardSpaceRepeat) {
    await win.webContents.executeJavaScript(`(() => {
      document.querySelector('#janela [data-action="fechar-janela"]')?.click();
      document.querySelector('#placa [data-action="vitrine"]').click();
      document.querySelector('#vitrine [data-action="vitrine-cat"][data-cat="chapeu"]').click();
      const card = document.querySelector('#vitrine [role="button"][data-id="lenco-chita"]');
      card.focus();
      globalThis.__cardSpaceEvents = [];
      document.addEventListener('keydown', event => {
        if (event.key === ' ' || event.key === 'Enter') __cardSpaceEvents.push({ key: event.key, repeat: event.repeat, id: event.target.dataset.id });
      });
      return true;
    })()`);
    win.webContents.focus();
    const inspect = () => win.webContents.executeJavaScript(`({ hat: __handoffAudit.engine().state.equipped.chapeu,
      tickets: __handoffAudit.engine().state.tickets, owned: __handoffAudit.engine().owned('lenco-chita'),
      focused: document.activeElement?.dataset.id, keys: __cardSpaceEvents.slice() })`);
    const before = await inspect();
    assert.equal(before.hat, 'palha-furada');
    assert.equal(before.owned, false);
    const down = (repeat = false) => {
      const modifiers = repeat ? ['isautorepeat'] : [];
      win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Space', modifiers });
      win.webContents.sendInputEvent({ type: 'char', keyCode: ' ', modifiers });
    };
    down();
    await new Promise(resolve => setTimeout(resolve, 20));
    const pressed = await inspect();
    assert.equal(pressed.hat, 'lenco-chita', 'a primeira pressão compra e veste a peça selecionada');
    assert.equal(pressed.tickets, before.tickets - data.items.find(item => item.id === 'lenco-chita').price);
    assert.equal(pressed.owned, true);
    down(true);
    await new Promise(resolve => setTimeout(resolve, 20));
    const repeated = await inspect();
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Space' });
    await new Promise(resolve => setTimeout(resolve, 20));
    const released = await inspect();
    await win.webContents.executeJavaScript('document.querySelector(\'#vitrine [role="button"][data-id="palha-furada"]\').focus(); true');
    down();
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Space' });
    await new Promise(resolve => setTimeout(resolve, 20));
    const fresh = await inspect();
    report.cardSpace = { before, pressed, repeated, released, fresh };
    assert.equal(repeated.keys[1].repeat, true, 'o evento nativo representa a repetição automática da tecla');
    assert.equal(repeated.hat, pressed.hat, 'segurar espaço mantém a escolha da peça');
    assert.equal(released.hat, pressed.hat);
    assert.equal(repeated.tickets, pressed.tickets, 'repetir espaço não compra a peça outra vez');
    assert.equal(released.tickets, pressed.tickets);
    assert.equal(released.focused, 'lenco-chita', 'o foco acompanha o cartão após a compra e as repetições');
    assert.equal(fresh.hat, before.hat, 'uma nova pressão ainda veste a peça');
    assert.equal(fresh.tickets, pressed.tickets, 'vestir uma peça já comprada não cobra fichas');
    await win.webContents.executeJavaScript('document.querySelector(\'#vitrine [role="button"][data-id="coroa-flores"]\').focus(); true');
    const enter = repeat => {
      const modifiers = repeat ? ['isautorepeat'] : [];
      win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Return', modifiers });
      win.webContents.sendInputEvent({ type: 'char', keyCode: '\r', modifiers });
    };
    enter(false);
    await new Promise(resolve => setTimeout(resolve, 20));
    const enterPressed = await inspect();
    enter(true);
    await new Promise(resolve => setTimeout(resolve, 20));
    const enterRepeated = await inspect();
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Return' });
    await new Promise(resolve => setTimeout(resolve, 20));
    const enterReleased = await inspect();
    report.cardSpace.enter = { pressed: enterPressed, repeated: enterRepeated, released: enterReleased };
    assert.equal(enterPressed.hat, 'coroa-flores');
    assert.equal(enterPressed.tickets, fresh.tickets - data.items.find(item => item.id === 'coroa-flores').price);
    assert.equal(enterRepeated.hat, enterPressed.hat);
    assert.equal(enterRepeated.tickets, enterPressed.tickets);
    assert.equal(enterReleased.focused, 'coroa-flores');
    assert.equal(enterRepeated.keys.at(-1).repeat, true);
    assert.deepEqual(errors, []);
    finish();
    return;
  }
  if (keyboardRedraw) {
    await win.webContents.executeJavaScript(`(() => {
      document.querySelector('#janela [data-action="fechar-janela"]')?.click();
      const engine = __handoffAudit.engine();
      engine.mini('mata').setAuto(false);
      engine.state.mail = { ready: 1, nextAt: engine.now() + 100000 };
      return true;
    })()`);
    await new Promise(resolve => setTimeout(resolve, 100));
    win.webContents.focus();
    await win.webContents.executeJavaScript(`(() => {
      globalThis.__keyboardRedrawButton = document.querySelector('#placa [data-action="tela"][data-tela="correio"]');
      __keyboardRedrawButton.focus();
      return true;
    })()`);
    const press = () => {
      win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Space' });
      win.webContents.sendInputEvent({ type: 'char', keyCode: ' ' });
    };
    press();
    await new Promise(resolve => setTimeout(resolve, 20));
    const inspect = () => win.webContents.executeJavaScript(`({
      connected: __keyboardRedrawButton.isConnected, active: __keyboardRedrawButton.matches(':active'),
      focusedOriginal: document.activeElement === __keyboardRedrawButton,
      mail: __handoffAudit.engine().state.mail.ready,
      open: __handoffAudit.ui.tela.open, screen: __handoffAudit.ui.tela.id
    })`);
    const pressed = await inspect();
    assert.equal(pressed.active, true, 'o teclado nativo iniciou a ativação do Correio');
    await win.webContents.executeJavaScript('__handoffAudit.engine().state.mail.nextAt = __handoffAudit.engine().now() - 1; true');
    await new Promise(resolve => setTimeout(resolve, 150));
    const updated = await inspect();
    assert.equal(updated.mail, pressed.mail + 1, 'uma carta chegou pelo laço automático durante a tecla pressionada');
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Space' });
    await new Promise(resolve => setTimeout(resolve, 20));
    const released = await inspect();
    report.keyboardUpdate = { pressed, updated, released };
    if (!released.open) {
      await win.webContents.executeJavaScript('document.querySelector(\'#placa [data-action="tela"][data-tela="correio"]\').focus(); true');
      press();
      win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Space' });
      await new Promise(resolve => setTimeout(resolve, 20));
      report.keyboardUpdate.fresh = await inspect();
    }
    assert.equal(released.open, true, 'a atualização não engole a ativação iniciada pelo teclado');
    assert.equal(released.screen, 'correio');
    assert.deepEqual(errors, []);
    finish();
    return;
  }
  if (volumeGesture) {
    const point = await win.webContents.executeJavaScript(`(() => {
      document.querySelector('#janela [data-action="fechar-janela"]')?.click();
      document.querySelector('#placa [data-action="abrir"]').click();
      document.querySelector('#painel [data-action="tab"][data-tab="ajustes"]').click();
      const range = document.querySelector('#volume');
      range.scrollIntoView({ block: 'center' });
      globalThis.__volumeEvents = [];
      for (const type of ['input', 'change', 'pointercancel', 'pointerdown', 'pointermove']) range.addEventListener(type, event => __volumeEvents.push({ type, value: range.value, x: event.clientX, y: event.clientY, buttons: event.buttons, prevented: event.defaultPrevented }));
      const box = range.getBoundingClientRect();
      if (document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) !== range) throw new Error('A barra de volume não está no ponto escolhido.');
      return { x: Math.round(box.x + box.width / 2), targetX: Math.round(box.x + box.width * .8), y: Math.round(box.y + box.height / 2) };
    })()`);
    win.webContents.focus();
    win.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, x: point.targetX, y: point.y });
    await new Promise(resolve => setTimeout(resolve, 20));
    win.webContents.sendInputEvent({ type: 'mouseMove', button: 'left', x: point.targetX, y: point.y, modifiers: ['leftButtonDown'] });
    await new Promise(resolve => setTimeout(resolve, 30));
    const inspect = () => win.webContents.executeJavaScript(`({ volume: __handoffAudit.ui.settings.volume,
      range: document.querySelector('#volume')?.value, dragging: __handoffAudit.ui.drag?.kind || null,
      events: __volumeEvents, focused: document.activeElement?.id })`);
    const moved = await inspect();
    report.volumeGesture = { point, moved };
    assert.equal(moved.dragging, 'barra', 'o mouse nativo iniciou a edição da barra');
    assert.ok(moved.volume >= .7, 'o mouse nativo aplicou o volume escolhido');
    assert.ok(moved.events.some(event => event.type === 'input'));
    assert.ok(!moved.events.some(event => event.type === 'change'), 'o gesto ainda não foi solto');
    if (volumeQuit) {
      app.once('will-quit', () => {
        try {
          const stored = JSON.parse(fs.readFileSync(path.join(profile, 'window-settings.json'), 'utf8'));
          report.volumeGesture.stored = { volume: stored.volume, language: stored.language };
          report.volumeGesture.oldDestroyed = win.isDestroyed();
          assert.equal(win.isDestroyed(), true, 'a saída normal fechou a janela');
          assert.equal(stored.volume, moved.volume, 'sair durante o gesto grava o volume escolhido antes de encerrar');
          assert.deepEqual(errors, []);
          finish();
        } catch (error) { finish(error); }
      });
      await win.webContents.executeJavaScript('arraiaDesktop.quit(); true');
      return;
    }
    if (volumeClose) {
      const old = win;
      await old.webContents.executeJavaScript('arraiaDesktop.repair(); true');
      win = await waitForPage(1);
      await new Promise(resolve => setTimeout(resolve, 400));
      const reopened = await win.webContents.executeJavaScript('__handoffAudit.ui.settings.volume');
      const stored = JSON.parse(fs.readFileSync(path.join(profile, 'window-settings.json'), 'utf8'));
      report.volumeGesture.reopened = reopened;
      report.volumeGesture.stored = { volume: stored.volume, language: stored.language };
      report.volumeGesture.oldDestroyed = old.isDestroyed();
      assert.equal(old.isDestroyed(), true, 'a recuperação fechou a janela antiga');
      assert.equal(reopened, moved.volume, 'fechar durante o gesto conserva o volume na janela substituta');
      assert.equal(stored.volume, moved.volume, 'o volume recuperado também está no disco');
      assert.deepEqual(errors, []);
      finish();
      return;
    }
    powerEvents.suspend();
    await new Promise(resolve => setTimeout(resolve, 400));
    const cancelled = await inspect();
    const stored = JSON.parse(fs.readFileSync(path.join(profile, 'window-settings.json'), 'utf8'));
    report.volumeGesture.cancelled = cancelled;
    report.volumeGesture.stored = { volume: stored.volume, language: stored.language };
    assert.equal(cancelled.dragging, null, 'a suspensão cancelou o gesto');
    assert.equal(stored.volume, moved.volume, 'a suspensão conserva no disco o volume que já estava aplicado');
    powerEvents.resume();
    win = await waitForPage(1);
    const reopened = await win.webContents.executeJavaScript('__handoffAudit.ui.settings.volume');
    report.volumeGesture.reopened = reopened;
    assert.equal(reopened, moved.volume, 'a janela substituta recupera o volume escolhido');
    assert.deepEqual(errors, []);
    finish();
    return;
  }
  if (cancelledClick) {
    const point = await win.webContents.executeJavaScript(`(() => {
      document.querySelector('#janela [data-action="fechar-janela"]')?.click();
      const engine = __handoffAudit.engine();
      engine.mini('mata').setAuto(false);
      while (engine.state.size < 100) engine.addFame(engine.fameNeed() - engine.state.fame);
      document.querySelector('#placa [data-action="abrir"]').click();
      document.querySelector('#painel [data-action="ano-novo"]').click();
      const button = document.querySelector('#janela [data-action="ano-novo-sim"]');
      const box = button.getBoundingClientRect();
      if (document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) !== button) throw new Error('A confirmação não está no ponto escolhido.');
      return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    })()`);
    win.webContents.focus();
    const press = async () => {
      if (cancelledKeyboard) {
        await win.webContents.executeJavaScript('document.querySelector(\'#janela [data-action="ano-novo-sim"]\').focus(); true');
        win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Space' });
        win.webContents.sendInputEvent({ type: 'char', keyCode: ' ' });
      } else win.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, x: point.x, y: point.y });
    };
    const release = () => cancelledKeyboard
      ? win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Space' })
      : win.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, x: point.x, y: point.y });
    if (mixedKeyboardButtons) win.webContents.sendInputEvent({ type: 'mouseDown', button: 'right', clickCount: 1, x: point.x, y: point.y });
    await press();
    await new Promise(resolve => setTimeout(resolve, 20));
    const inspect = () => win.webContents.executeJavaScript(`({ year: __handoffAudit.engine().state.year,
      size: __handoffAudit.engine().state.size, pressed: !!__handoffAudit.ui.press, modal: __handoffAudit.ui.modal,
      spaceHeld: !!__handoffAudit.ui.spacePress, cancelledSpace: !!__handoffAudit.ui.cancelledSpace,
      keyboardFocused: document.activeElement === document.querySelector('#janela [data-action="ano-novo-sim"]'),
      keyboardActive: !!document.querySelector('#janela [data-action="ano-novo-sim"]')?.matches(':active') })`);
    const pressed = await inspect();
    assert.equal(cancelledKeyboard ? pressed.keyboardActive : pressed.pressed, true, 'a entrada nativa iniciou a confirmação');
    if (mixedKeyboardButtons) win.webContents.sendInputEvent({ type: 'mouseUp', button: 'right', clickCount: 1, x: point.x, y: point.y });
    else powerEvents.suspend();
    await new Promise(resolve => setTimeout(resolve, 20));
    const cancelled = await inspect();
    assert.equal(cancelled.pressed, false, 'o aviso de suspensão cancelou o gesto');
    if (cancelledKeyboard && !mixedKeyboardButtons) {
      assert.equal(pressed.spaceHeld, true);
      assert.equal(cancelled.spaceHeld, false);
      assert.equal(cancelled.cancelledSpace, true);
    }
    release();
    await new Promise(resolve => setTimeout(resolve, 20));
    const released = await inspect();
    report.cancelledClick = { point, pressed, cancelled, released };
    if (mixedKeyboardButtons) {
      if (released.year === pressed.year) {
        // Isolate Chromium's default behavior from the game's right-button cleanup.
        await win.webContents.executeJavaScript(`document.addEventListener('pointerup', event => {
          if (event.button !== 0) event.stopImmediatePropagation();
        }, true); true`);
        win.webContents.sendInputEvent({ type: 'mouseDown', button: 'right', clickCount: 1, x: point.x, y: point.y });
        await press();
        await new Promise(resolve => setTimeout(resolve, 20));
        win.webContents.sendInputEvent({ type: 'mouseUp', button: 'right', clickCount: 1, x: point.x, y: point.y });
        release();
        await new Promise(resolve => setTimeout(resolve, 20));
        report.cancelledClick.nativeBaseline = await inspect();
        assert.equal(report.cancelledClick.nativeBaseline.year, pressed.year + 1, 'o comportamento nativo conserva a confirmação pelo teclado');
      }
      assert.equal(released.year, pressed.year + 1, 'soltar o botão direito não cancela a confirmação pela tecla Espaço');
      assert.equal(released.size, 1);
      assert.equal(released.modal, false);
      assert.deepEqual(errors, []);
      finish();
      return;
    }
    assert.equal(released.year, pressed.year, 'o clique nativo depois do cancelamento não encerra o São João');
    assert.equal(released.size, pressed.size);
    assert.equal(released.modal, true);
    if (cancelledKeyboard) {
      assert.equal(released.keyboardActive, false, 'o botão não fica visualmente apertado depois de soltar');
      assert.equal(released.keyboardFocused, true, 'o botão conserva o foco para uma nova confirmação');
    }
    await press();
    release();
    await new Promise(resolve => setTimeout(resolve, 20));
    const fresh = await inspect();
    report.cancelledClick.fresh = fresh;
    assert.equal(fresh.year, pressed.year + 1, 'uma nova confirmação nativa continua funcionando');
    assert.equal(fresh.size, 1);
    assert.equal(fresh.modal, false);
    const disk = JSON.parse(fs.readFileSync(path.join(profile, 'save.json'), 'utf8'));
    assert.equal(disk.year, fresh.year);
    assert.equal(disk.size, fresh.size);
    assert.deepEqual(errors, []);
    finish();
    return;
  }
  if (wakeHold) {
    const point = await win.webContents.executeJavaScript(`(() => {
      document.querySelector('#janela [data-action="fechar-janela"]')?.click();
      document.querySelector('#placa [data-action="vitrine"]').click();
      const box = document.querySelector('#vitrine [data-hold="melhorar"][data-stat="rebolado"]').getBoundingClientRect();
      return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    })()`);
    win.webContents.focus();
    win.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, x: point.x, y: point.y });
    await new Promise(resolve => setTimeout(resolve, 20));
    const result = await win.webContents.executeJavaScript(`(() => {
      const engine = __handoffAudit.engine();
      if (!__handoffAudit.ui.hold) throw new Error('O mouse nativo não começou a compra.');
      let wall = Date.now();
      engine.clock = () => wall;
      engine.mini('mata').setAuto(false);
      engine.tick(0.001);
      engine.state.runtime.dancing = false;
      engine.state.runtime.stamina = 0;
      const before = engine.exportState();
      __auditStartRepeat();
      wall += 20 * 60000;
      // O callback é o da aplicação. O relógio só deste motor avança antes de qualquer quadro intercalar.
      __auditRepeat();
      return { before, wall, after: engine.exportState(), held: !!__handoffAudit.ui.hold };
    })()`);
    const reference = new GameEngine(data, result.before, { now: () => result.wall, rng: () => 0.5 });
    const summary = state => ({ cheer: state.cheer, tickets: state.tickets, rebolado: state.levels.rebolado,
      steps: state.stats.steps, lastSeen: state.lastSeen });
    report.wakeHold = { point, before: summary(result.before), expected: { ...summary(reference.state), lastSeen: result.wall },
      after: summary(result.after), held: result.held };
    assert.equal(result.held, false, 'o callback da compra encerra o gesto que antecedeu o repouso');
    assert.equal(result.after.levels.rebolado, result.before.levels.rebolado, 'a melhoria não é comprada pelo temporizador atrasado');
    assert.ok(Math.abs(result.after.cheer - reference.state.cheer) < 1e-8, 'o rendimento da pausa usa as melhorias anteriores');
    assert.equal(result.after.lastSeen, result.wall);
    await new Promise(resolve => setTimeout(resolve, 120));
    const afterFrames = await win.webContents.executeJavaScript('__handoffAudit.engine().exportState()');
    report.wakeHold.afterFrames = summary(afterFrames);
    assert.deepEqual(summary(afterFrames), summary(result.after), 'os quadros seguintes não repetem a pausa nem a compra');
    win.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, x: point.x, y: point.y });
    win.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, x: point.x, y: point.y });
    win.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, x: point.x, y: point.y });
    await new Promise(resolve => setTimeout(resolve, 20));
    const fresh = await win.webContents.executeJavaScript(`(() => {
      window.dispatchEvent(new Event('beforeunload'));
      return arraiaDesktop.loadGame();
    })()`);
    report.wakeHold.fresh = summary(fresh);
    assert.equal(fresh.levels.rebolado, result.before.levels.rebolado + 1, 'um novo clique nativo continua comprando');
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(profile, 'save.json'), 'utf8')), fresh);
    assert.deepEqual(errors, []);
    finish();
    return;
  }
  if (suspendGesture) {
    const point = await win.webContents.executeJavaScript(`(() => {
      document.querySelector('#janela [data-action="fechar-janela"]')?.click();
      document.querySelector('#placa [data-action="vitrine"]').click();
      const button = document.querySelector('#vitrine [data-hold="ficha"]');
      const box = button.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2),
        tickets: __handoffAudit.engine().state.tickets, hit: hit?.outerHTML.slice(0, 240), hidden: button.closest('#vitrine').hidden };
    })()`);
    win.webContents.focus();
    win.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, x: point.x, y: point.y });
    await new Promise(resolve => setTimeout(resolve, 20));
    const pressed = await win.webContents.executeJavaScript(`({ held: !!__handoffAudit.ui.hold,
      tickets: __handoffAudit.engine().state.tickets })`);
    report.suspendGesture = { point, pressed };
    assert.equal(pressed.held, true, 'o mouse nativo começou a compra segurada');
    assert.equal(pressed.tickets, point.tickets + 1);
    powerEvents.suspend();
    await new Promise(resolve => setTimeout(resolve, 20));
    const stopped = await win.webContents.executeJavaScript(`({ held: !!__handoffAudit.ui.hold,
      drag: !!__handoffAudit.ui.drag, press: !!__handoffAudit.ui.press,
      tickets: __handoffAudit.engine().state.tickets })`);
    report.suspendGesture = { point, pressed, stopped };
    assert.equal(stopped.held, false, 'o aviso real do powerMonitor termina a compra antes do save');
    assert.equal(stopped.drag, false);
    assert.equal(stopped.press, false);
    await new Promise(resolve => setTimeout(resolve, 600));
    const afterTimers = await win.webContents.executeJavaScript('__handoffAudit.engine().state.tickets');
    report.suspendGesture.afterTimers = afterTimers;
    assert.equal(afterTimers, pressed.tickets, 'o temporizador nativo não repete a compra depois da suspensão');
    win.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, x: point.x, y: point.y });
    win.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, x: point.x, y: point.y });
    win.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, x: point.x, y: point.y });
    await new Promise(resolve => setTimeout(resolve, 20));
    const fresh = await win.webContents.executeJavaScript(`({ held: !!__handoffAudit.ui.hold,
      tickets: __handoffAudit.engine().state.tickets })`);
    report.suspendGesture.fresh = fresh;
    assert.equal(fresh.tickets, pressed.tickets + 1, 'um novo clique nativo continua comprando');
    assert.equal(fresh.held, false);
    assert.ok(report.saves.some(save => save.state.tickets === pressed.tickets && save.disk.tickets === pressed.tickets),
      'o save da suspensão atravessou o IPC e chegou ao disco');
    assert.deepEqual(errors, []);
    finish();
    return;
  }
  if (wakeSave) {
    const prepared = await win.webContents.executeJavaScript(`(() => {
      document.querySelector('#janela [data-action="fechar-janela"]')?.click();
      const engine = __handoffAudit.engine();
      let wall = Date.now();
      engine.clock = () => wall;
      engine.mini('mata').setAuto(false);
      engine.state.fame = engine.fameNeed() - 1;
      engine.tick(0.001);
      engine.state.runtime.dancing = false;
      engine.state.runtime.stamina = 0;
      if (!engine.startWedding()) throw new Error('A cerimônia não começou.');
      engine.state.runtime.rice = engine.cfg.weddingRice;
      const before = engine.exportState();
      wall += 20 * 60000;
      // O evento e o save são reais; só o relógio deste motor de teste avança, sem um quadro intercalar.
      window.dispatchEvent(new Event('beforeunload'));
      return { before, wall, saved: arraiaDesktop.loadGame() };
    })()`);
    const reference = new GameEngine(data, prepared.before, { now: () => prepared.wall, rng: () => 0.5 });
    assert.equal(reference.startWedding(true), true);
    reference.state.runtime.rice = reference.cfg.weddingRice;
    const gift = reference.endWedding();
    const summary = state => ({ cheer: state.cheer, tickets: state.tickets, size: state.size, weddings: state.stats.weddings,
      inventory: state.inventory, lastSeen: state.lastSeen });
    report.wakeSave = { before: summary(prepared.before), expected: { ...summary(reference.state), lastSeen: prepared.wall },
      saved: summary(prepared.saved), gift };
    const disk = JSON.parse(fs.readFileSync(path.join(profile, 'save.json'), 'utf8'));
    assert.deepEqual(disk, prepared.saved, 'o disco recebe o mesmo estado devolvido pela sessão');
    assert.ok(Math.abs(prepared.saved.cheer - reference.state.cheer) < 1e-8, 'o save paga a pausa antes de alterar os bônus com o presente');
    assert.equal(prepared.saved.lastSeen, prepared.wall);
    assert.equal(prepared.saved.stats.weddings, 1);
    assert.equal(prepared.saved.size, reference.state.size);
    assert.deepEqual(prepared.saved.inventory, reference.state.inventory);
    const old = win;
    await old.webContents.executeJavaScript('arraiaDesktop.setLanguage("en"); true');
    win = await waitForPage(1);
    const reopened = await win.webContents.executeJavaScript(`(() => {
      const engine = __handoffAudit.engine(), state = engine.state;
      return { game: { cheer: state.cheer, tickets: state.tickets, size: state.size, weddings: state.stats.weddings, inventory: state.inventory },
        steps: state.stats.steps, earned: state.stats.cheerEarned, offline: engine.welcome };
    })()`);
    const { cheer, lastSeen, ...persisted } = report.wakeSave.saved;
    const { cheer: liveCheer, ...liveGame } = reopened.game;
    assert.deepEqual(liveGame, persisted, 'a nova janela conserva os convidados, as fichas e o presente');
    assert.equal(reopened.offline, null, 'a nova janela não calcula a pausa já paga pelo save');
    const earnedWhileOpen = reopened.earned - prepared.saved.stats.cheerEarned;
    assert.ok(liveCheer >= cheer && reopened.steps >= prepared.saved.stats.steps);
    assert.ok(Math.abs((liveCheer - cheer) - earnedWhileOpen) < 1e-8, 'só a renda registrada depois da reabertura aumenta o saldo');
    assert.ok(earnedWhileOpen === 0 || reopened.steps > prepared.saved.stats.steps, 'a diferença é renda dos novos passos enquanto a janela carregava');
    assert.equal(old.isDestroyed(), true);
    assert.deepEqual(errors, []);
    report.wakeSave.reopened = reopened;
    report.windows = windows.length;
    finish();
    return;
  }
  if (wakeInput) {
    const prepared = await win.webContents.executeJavaScript(`(() => {
      document.querySelector('#janela [data-action="fechar-janela"]')?.click();
      const engine = __handoffAudit.engine();
      let wall = Date.now();
      engine.clock = () => wall;
      engine.mini('mata').setAuto(false);
      engine.state.wood = 100;
      engine.addItem('fogao-lenha');
      if (!engine.equip('fogao-lenha', 'esquerda') || !engine.cook('pamonha')) throw new Error('A cozinha não pôde ser preparada.');
      wall = engine.state.cozinha.pot.readyAt;
      engine.tick(0.001);
      engine.state.runtime.dancing = false;
      engine.state.runtime.stamina = 0;
      engine.drainEvents();
      __handoffAudit.festaClick('lado-esquerda');
      const before = engine.exportState();
      const button = document.querySelector('#tela button[data-action="servir"]');
      if (!button || button.disabled) throw new Error('O botão de servir não estava disponível antes da pausa.');
      wall += 20 * 60000;
      // A pausa só avança o relógio deste motor isolado; a ação ocorre no DOM real antes de qualquer quadro intercalar.
      button.click();
      const after = engine.exportState();
      return { before, wall, after: { cheer: after.cheer, lastSeen: after.lastSeen, dishes: after.stats.dishes,
        steps: after.stats.steps, until: after.cozinha.buff?.until } };
    })()`);
    const reference = new GameEngine(data, prepared.before, { now: () => prepared.wall, rng: () => 0.5 });
    report.wake = { before: { cheer: prepared.before.cheer, steps: prepared.before.stats.steps, lastSeen: prepared.before.lastSeen },
      expected: { cheer: reference.state.cheer, until: prepared.wall + reference.recipe('pamonha').buffMinutes * 60000 }, afterInput: prepared.after };
    await win.webContents.executeJavaScript('new Promise(resolve => setTimeout(() => resolve(true), 100))');
    report.wake.afterFrame = await win.webContents.executeJavaScript(`(() => {
      const state = __handoffAudit.engine().exportState();
      if (!arraiaDesktop.saveGame(state)) throw new Error('O save depois da pausa falhou.');
      return { cheer: state.cheer, lastSeen: state.lastSeen, dishes: state.stats.dishes, steps: state.stats.steps,
        until: state.cozinha.buff?.until, warnings: [...document.querySelector('#avisos').children].map(node => node.textContent) };
    })()`);
    assert.ok(Math.abs(report.wake.afterInput.cheer - reference.state.cheer) < 1e-8, 'o tempo fora foi pago antes do novo bônus');
    assert.ok(Math.abs(report.wake.afterFrame.cheer - reference.state.cheer) < 1e-8, 'o quadro seguinte não refaz o pagamento com os bônus novos');
    for (const after of [report.wake.afterInput, report.wake.afterFrame]) {
      assert.equal(after.dishes, 1);
      assert.equal(after.steps, prepared.before.stats.steps);
      assert.equal(after.lastSeen, prepared.wall);
      assert.equal(after.until, report.wake.expected.until);
    }
    const disk = JSON.parse(fs.readFileSync(path.join(profile, 'save.json'), 'utf8'));
    assert.equal(disk.cheer, report.wake.afterFrame.cheer);
    assert.equal(disk.lastSeen, prepared.wall);
    assert.deepEqual(errors, []);
    finish();
    return;
  }
  if (festaPressResize) {
    await win.webContents.executeJavaScript('document.querySelector("#janela [data-action=fechar-janela]")?.click(); true');
    win.webContents.focus();
    const settle = () => win.webContents.executeJavaScript('new Promise(resolve => setTimeout(() => resolve(true), 50))');
    const aim = async () => win.webContents.executeJavaScript(`(() => {
      const area = __handoffAudit.ui.festa.areas().find(area => area.id === 'fogueira');
      if (!area) throw new Error('A barraca da fogueira não foi desenhada.');
      const point = { x: Math.round((area.box[0] + area.box[2]) / 2), y: Math.round((area.box[1] + area.box[3]) / 2) };
      return { point, hit: __handoffAudit.ui.festa.hit(point.x, point.y),
        canvasHit: !!document.elementFromPoint(point.x, point.y)?.closest('#festa-canvas'), viewport: { width: innerWidth, height: innerHeight } };
    })()`);
    const before = await aim();
    report.press = { before };
    assert.equal(before.hit, 'fogueira');
    assert.equal(before.canvasHit, true);
    win.webContents.sendInputEvent({ type: 'mouseMove', ...before.point });
    win.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...before.point });
    await settle();
    assert.equal(await win.webContents.executeJavaScript('__handoffAudit.ui.drag?.region'), 'fogueira');
    win.setBounds({ x: 0, y: 0, width: 1000, height: 850 });
    await settle();
    report.press.resized = await win.webContents.executeJavaScript(`({ viewport: { width: innerWidth, height: innerHeight },
      hit: __handoffAudit.ui.festa.hit(${before.point.x}, ${before.point.y}), region: __handoffAudit.ui.drag?.region })`);
    assert.ok(before.point.x < report.press.resized.viewport.width && before.point.y < report.press.resized.viewport.height);
    assert.notEqual(report.press.resized.hit, 'fogueira', 'a barraca deixou o ponto sem movimento do mouse');
    win.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...before.point });
    await settle();
    report.press.after = await win.webContents.executeJavaScript('({ open: __handoffAudit.ui.tela.open, id: __handoffAudit.ui.tela.id, dragging: !!__handoffAudit.ui.drag })');
    const fresh = await aim();
    report.press.fresh = fresh;
    // Registra também a recuperação com outro clique, mesmo quando o gesto antigo falha.
    await win.webContents.executeJavaScript('document.querySelector("#tela [data-action=tela-fechar]")?.click(); true');
    win.webContents.sendInputEvent({ type: 'mouseMove', ...fresh.point });
    win.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...fresh.point });
    win.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...fresh.point });
    await settle();
    report.press.reopened = await win.webContents.executeJavaScript('({ open: __handoffAudit.ui.tela.open, id: __handoffAudit.ui.tela.id })');
    assert.equal(report.press.after.open, false, 'o soltar não abre uma barraca que saiu do ponto');
    assert.equal(report.press.after.dragging, false);
    assert.deepEqual(report.press.reopened, { open: true, id: 'fogueira' });
    assert.deepEqual(errors, []);
    finish();
    return;
  }
  if (photoDownloads) {
    report.downloads = [];
    let receiveDownload;
    win.webContents.session.on('will-download', (_event, item) => {
      const index = report.downloads.length;
      const name = item.getFilename();
      const target = path.join(profile, 'photo-' + index + '.png');
      item.setSavePath(target);
      const entry = { name, target };
      report.downloads.push(entry);
      item.once('done', (_done, state) => {
        entry.state = state;
        const receive = receiveDownload;
        receiveDownload = null;
        if (!receive) return finish(new Error('Foi iniciado um download inesperado.'));
        receive(entry);
      });
    });
    const download = async (action, expectedName) => {
      let timer;
      const pending = new Promise((resolve, reject) => {
        receiveDownload = resolve;
        timer = setTimeout(() => reject(new Error('O download não terminou: ' + expectedName)), 6000);
      });
      await win.webContents.executeJavaScript(action, true);
      const entry = await pending.finally(() => clearTimeout(timer));
      assert.equal(entry.name, expectedName);
      assert.equal(entry.state, 'completed');
      const bytes = fs.readFileSync(entry.target);
      assert.ok(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'o arquivo tem assinatura PNG');
      const image = electron.nativeImage.createFromPath(entry.target);
      assert.equal(image.isEmpty(), false, 'o PNG pode ser decodificado pelo runtime');
      entry.size = image.getSize();
      assert.ok(entry.size.width > 0 && entry.size.height > 0);
      assert.equal(entry.size.width % 4, 0);
      assert.equal(entry.size.height % 4, 0);
      return bytes;
    };
    await win.webContents.executeJavaScript(`(() => {
      document.querySelector('#janela [data-action="fechar-janela"]')?.click();
      document.querySelector('[data-action="abrir"]').click();
      return true;
    })()`);
    await download('document.querySelector("#painel [data-action=foto]").click(); true', 'mandioca-festa.png');
    await download('document.querySelector("#painel [data-action=retrato]").click(); true', 'mandioca-retrato.png');
    assert.ok(report.downloads[1].size.width <= report.downloads[0].size.width, 'o retrato é recortado da festa');
    report.visits = [];
    for (let visit = 0; visit < 5; visit++) {
      const picture = await win.webContents.executeJavaScript(`(() => {
        const engine = __handoffAudit.engine();
        const before = engine.state.tickets;
        engine.startFotografo(engine.now() - engine.cfg.fotoWalk * 1000);
        __handoffAudit.festaClick('fotografo');
        __handoffAudit.festaClick('fotografo');
        const modal = document.querySelector('#janela-corpo img.retrato');
        if (!modal) throw new Error('O retrato da visita não apareceu.');
        return { tickets: engine.state.tickets - before, expected: engine.cfg.fotoTickets + engine.tierIndex(),
          pictures: engine.state.stats.fotos, url: modal.src, samePhoto: modal.src === __handoffAudit.ui.lastPhoto };
      })()`);
      assert.equal(picture.tickets, picture.expected, 'o clique repetido não paga duas fotos');
      assert.equal(picture.pictures, visit + 1);
      assert.equal(picture.samePhoto, true);
      const bytes = await download('document.querySelector("#janela [data-action=foto-salvar]").click(); true', 'mandioca-lambe-lambe.png');
      assert.ok(bytes.equals(Buffer.from(picture.url.split(',')[1], 'base64')), 'o arquivo baixado é o retrato mostrado');
      report.visits.push({ visit: visit + 1, tickets: picture.tickets, pictures: picture.pictures });
      await win.webContents.executeJavaScript('document.querySelector("#janela [data-action=fechar-janela]").click(); true');
    }
    const saved = await win.webContents.executeJavaScript(`(() => {
      const state = __handoffAudit.engine().exportState();
      if (!arraiaDesktop.saveGame(state)) throw new Error('A gravação dos retratos falhou.');
      return { pictures: state.stats.fotos, unlocked: state.achievements.includes('retratista'), tickets: state.tickets };
    })()`);
    assert.equal(saved.unlocked, true);
    const disk = JSON.parse(fs.readFileSync(path.join(profile, 'save.json'), 'utf8'));
    assert.equal(disk.stats.fotos, 5);
    assert.equal(disk.tickets, saved.tickets);
    assert.deepEqual(errors, []);
    report.saved = saved;
    report.windows = windows.length;
    finish();
    return;
  }
  if (pickerReselect) {
    report.picker = await win.webContents.executeJavaScript(`(() => {
      document.querySelector('#janela [data-action="fechar-janela"]')?.click();
      const engine = __handoffAudit.engine();
      engine.rename('Festa atual');
      const state = engine.exportState();
      const oldText = JSON.stringify({ ...state, name: 'Arquivo antigo' });
      const newText = JSON.stringify({ ...state, name: 'Arquivo novo' });
      const input = document.querySelector('#importar');
      const originalText = File.prototype.text;
      const audit = globalThis.__pickerAudit = { confirmations: 0, openings: [], oldText, newText };
      globalThis.confirm = () => { audit.confirmations++; return true; };
      let firstRead = true;
      File.prototype.text = function () {
        if (!firstRead) return originalText.call(this);
        firstRead = false;
        return new Promise(resolve => { audit.finishOldRead = resolve; });
      };
      const select = text => {
        const files = new DataTransfer();
        files.items.add(new File([text], 'mesmo-save.json', { type: 'application/json' }));
        input.files = files.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };
      select(oldText);
      if (!audit.finishOldRead) throw new Error('A primeira leitura do File não começou.');
      input.dispatchEvent(new Event('cancel', { bubbles: true }));
      const abandoned = { value: input.value, files: input.files.length, picking: __handoffAudit.ui.picking };
      // Somente a interface do seletor é simulada: File, FileList, leitura, eventos e gravação usam o runtime real.
      input.click = () => {
        audit.openings.push({ value: input.value, files: input.files.length });
        if (input.files.length) input.dispatchEvent(new Event('cancel', { bubbles: true }));
        else select(newText);
      };
      document.querySelector('[data-action="abrir"]').click();
      document.querySelector('#painel [data-action="tab"][data-tab="ajustes"]').click();
      document.querySelector('#painel [data-action="importar"]').click();
      return { abandoned, openings: audit.openings };
    })()`);
    assert.equal(report.picker.abandoned.files, 1);
    assert.ok(report.picker.abandoned.value.endsWith('mesmo-save.json'));
    assert.equal(report.picker.abandoned.picking, false);
    assert.deepEqual(report.picker.openings, [{ value: '', files: 0 }]);
    const deadline = Date.now() + 6000;
    while (!(await win.webContents.executeJavaScript('document.querySelector("#importar").files.length === 0 && __pickerAudit.confirmations === 1'))) {
      if (Date.now() >= deadline) throw new Error('A nova leitura do mesmo File não terminou.');
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    report.picker.after = await win.webContents.executeJavaScript(`(async () => {
      const imported = __handoffAudit.engine();
      __pickerAudit.finishOldRead(__pickerAudit.oldText);
      await Promise.resolve();
      await Promise.resolve();
      const cached = arraiaDesktop.loadGame();
      return { name: imported.state.name, sameEngine: __handoffAudit.engine() === imported,
        confirmations: __pickerAudit.confirmations, picking: __handoffAudit.ui.picking,
        cached: cached.name, files: document.querySelector('#importar').files.length };
    })()`);
    const disk = JSON.parse(fs.readFileSync(path.join(profile, 'save.json'), 'utf8'));
    assert.deepEqual(report.picker.after, { name: 'Arquivo novo', sameEngine: true, confirmations: 1,
      picking: false, cached: 'Arquivo novo', files: 0 });
    assert.equal(disk.name, 'Arquivo novo');
    assert.equal(report.saves.some(save => save.state.name === 'Arquivo antigo'), false);
    assert.deepEqual(errors, []);
    report.windows = windows.length;
    finish();
    return;
  }
  if (importFailure) {
    const before = await win.webContents.executeJavaScript(`(() => {
      document.querySelector('#janela [data-action="fechar-janela"]')?.click();
      const engine = __handoffAudit.engine();
      engine.rename('Festa preservada');
      document.querySelector('[data-action="argolas"]').click();
      document.querySelector('#argolas [data-action="argolas-jogar"]').click();
      globalThis.__importOriginal = engine;
      globalThis.__importRound = engine.round;
      if (!engine.round || !arraiaDesktop.saveGame(engine.exportState())) throw new Error('A partida inicial não foi preparada.');
      globalThis.confirm = () => true;
      return { name: engine.state.name, tickets: engine.state.tickets, cost: engine.round.cost, left: engine.round.left };
    })()`);
    report.imports = [];
    const temporary = path.join(profile, 'save.json.tmp');
    const importFile = async (name, large) => {
      await win.webContents.executeJavaScript(`(() => {
        const state = __handoffAudit.engine().exportState();
        state.name = ${JSON.stringify(name)};
        if (${large}) state.log = [{ t: 0, type: 'comeco', padding: 'x'.repeat(2 * 1024 * 1024) }];
        const files = new DataTransfer();
        files.items.add(new File([JSON.stringify(state)], 'save.json', { type: 'application/json' }));
        const input = document.querySelector('#importar');
        input.files = files.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`);
      const deadline = Date.now() + 6000;
      while (!(await win.webContents.executeJavaScript('document.querySelector("#importar").files.length === 0'))) {
        if (Date.now() >= deadline) throw new Error('A leitura do File nativo não terminou.');
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    };
    for (const failure of ['io', 'size-limit']) {
      if (failure === 'io') fs.mkdirSync(temporary);
      await importFile('Festa recusada', failure === 'size-limit');
      const after = await win.webContents.executeJavaScript(`(() => {
        const engine = __handoffAudit.engine();
        const cached = arraiaDesktop.loadGame();
        return { name: engine.state.name, tickets: engine.state.tickets, sameEngine: engine === __importOriginal,
          sameRound: engine.round === __importRound, left: engine.round?.left, playing: __handoffAudit.ui.rings.playing,
          cached: { name: cached.name, tickets: cached.tickets, held: cached.rings.held },
          warning: [...document.querySelector('#avisos').children].some(node => node.textContent.includes('A festa atual foi mantida.')) };
      })()`);
      const disk = JSON.parse(fs.readFileSync(path.join(profile, 'save.json'), 'utf8'));
      report.imports.push({ failure, before, after, disk: { name: disk.name, tickets: disk.tickets, held: disk.rings.held } });
      assert.equal(after.name, before.name);
      assert.equal(after.tickets, before.tickets);
      assert.ok(after.sameEngine && after.sameRound && after.playing && after.warning);
      assert.equal(after.left, before.left);
      assert.deepEqual(after.cached, { name: before.name, tickets: before.tickets, held: before.cost });
      assert.equal(disk.name, before.name);
      assert.equal(disk.tickets, before.tickets);
      if (failure === 'io' && replacementFailure) {
        const restarted = await win.webContents.executeJavaScript(`(() => {
          document.querySelector('[data-action="abrir"]').click();
          document.querySelector('#painel [data-action="tab"][data-tab="ajustes"]').click();
          document.querySelector('#painel [data-action="reiniciar"]').click();
          const engine = __handoffAudit.engine();
          const cached = arraiaDesktop.loadGame();
          return { name: engine.state.name, tickets: engine.state.tickets, sameEngine: engine === __importOriginal,
            sameRound: engine.round === __importRound, left: engine.round?.left, playing: __handoffAudit.ui.rings.playing,
            tab: __handoffAudit.ui.tab, cached: { name: cached.name, tickets: cached.tickets, held: cached.rings.held },
            warning: [...document.querySelector('#avisos').children].some(node => node.textContent.includes('Não deu para reiniciar:')) };
        })()`);
        report.restart = { before, after: restarted };
        assert.equal(restarted.name, before.name);
        assert.equal(restarted.tickets, before.tickets);
        assert.equal(restarted.left, before.left);
        assert.ok(restarted.sameEngine && restarted.sameRound && restarted.playing && restarted.warning);
        assert.equal(restarted.tab, 'ajustes');
        assert.deepEqual(restarted.cached, { name: before.name, tickets: before.tickets, held: before.cost });
      }
      if (failure === 'io') fs.rmdirSync(temporary);
    }
    await importFile('Festa importada confirmada', false);
    const imported = await win.webContents.executeJavaScript(`(() => {
      const engine = __handoffAudit.engine();
      return { name: engine.state.name, tickets: engine.state.tickets, replaced: engine !== __importOriginal,
        round: engine.round || null, playing: __handoffAudit.ui.rings.playing, cached: arraiaDesktop.loadGame().name };
    })()`);
    assert.equal(imported.name, 'Festa importada confirmada');
    assert.equal(imported.tickets, before.tickets + before.cost);
    assert.ok(imported.replaced && !imported.playing);
    assert.equal(imported.round, null);
    assert.equal(imported.cached, imported.name);
    const old = win;
    await old.webContents.executeJavaScript('arraiaDesktop.setLanguage("en"); true');
    win = await waitForPage(1);
    const reopened = await win.webContents.executeJavaScript('({ name: __handoffAudit.engine().state.name, tickets: __handoffAudit.engine().state.tickets })');
    assert.deepEqual(reopened, { name: imported.name, tickets: imported.tickets });
    assert.equal(old.isDestroyed(), true);
    assert.ok(errors.length >= 2 && errors.every(error => error.startsWith('Save não pôde ser gravado:')), 'somente os erros de gravação realmente provocados foram registrados');
    report.recovery = { imported, reopened, oldDestroyed: old.isDestroyed() };
    report.windows = windows.length;
    finish();
    return;
  }
  for (const [index, language] of ['en', 'es', 'pt-BR'].entries()) {
    const before = await win.webContents.executeJavaScript(`(() => {
      document.querySelector('#janela [data-action="fechar-janela"]')?.click();
      const engine = __handoffAudit.engine();
      engine.rename('Troca ' + ${index});
      if (!engine.buyTicket()) throw new Error('A compra de ficha falhou antes da troca.');
      let interrupted = null;
      if (${activeRounds}) {
        engine.rng = () => 0.5;
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
        __handoffAudit.ui.janelas.setHidden('mata', false);
        const mata = engine.mini('mata');
        mata.setAuto(true);
        for (let step = 0; step < 2000 && mata.info().phase !== 'win'; step++) mata.tick(0.05);
        if (mata.info().phase !== 'win') throw new Error('A batalha não terminou durante a preparação.');
        mata.setAuto(false);
        if (!engine.mini('palco').start('xote').ok) throw new Error('O show não começou.');
        document.querySelector('[data-action="argolas"]').click();
        document.querySelector('#argolas [data-action="argolas-jogar"]').click();
        if (!engine.round) throw new Error('A rodada de Argolas não começou.');
        interrupted = { cost: engine.round.cost, mataCheckpoint: engine.exportState().minis.mata,
          palcoShows: engine.state.minis.palco.shows, palcoStars: engine.state.minis.palco.stars,
          palcoBest: engine.state.minis.palco.best, liveMataPhase: mata.info().phase, livePalco: !!engine.mini('palco').info().show };
      }
      return { name: engine.state.name, tickets: engine.state.tickets, year: engine.state.year,
        interrupted,
        gameplay: { inventory: engine.state.inventory, equipped: engine.state.equipped, levels: engine.state.levels, crew: engine.state.crew } };
    })()`);
    const old = win;
    const oldSender = old.webContents.id;
    const firstSave = report.saves.length;
    // O menu real do main recebe o pedido durante o fechamento e o entrega à página substituta.
    await old.webContents.executeJavaScript(`arraiaDesktop.setLanguage(${JSON.stringify(language)}); true`);
    const latest = windows.at(-1);
    const requestPhase = latest === old ? (old.closing ? 'closing' : 'before-close') : latest.pageReady ? 'loaded' : 'loading';
    menu.find(item => item.label === require(path.join(root, 'src/i18n')).t('tray.shop')).click();
    win = await waitForPage(index + 1);
    const after = await win.webContents.executeJavaScript(`(() => {
      const engine = __handoffAudit.engine();
      return { name: engine.state.name, tickets: engine.state.tickets, year: engine.state.year,
        gameplay: { inventory: engine.state.inventory, equipped: engine.state.equipped, levels: engine.state.levels, crew: engine.state.crew },
        language: document.documentElement.lang, choice: arraiaDesktop.language.choice,
        settingsOpen: __handoffAudit.ui.open, shopOpen: __handoffAudit.ui.dock.open, zoom: __handoffAudit.ui.settings.zoom };
    })()`);
    const persisted = JSON.parse(fs.readFileSync(path.join(profile, 'save.json'), 'utf8'));
    report.pending = { language, before, after, persisted, oldSender, newSender: win.webContents.id };
    const closingSave = report.saves.slice(firstSave).filter(saved => saved.sender === oldSender).at(-1);
    assert.equal(old.isDestroyed(), true, 'a janela antiga terminou seu fechamento nativo');
    assert.equal(after.name, before.name);
    assert.equal(after.tickets, before.tickets + (before.interrupted?.cost || 0));
    assert.equal(after.year, before.year);
    assert.deepEqual(after.gameplay, before.gameplay, 'inventário, roupas, melhorias e turma sobrevivem à troca');
    assert.ok(closingSave, 'beforeunload enviou o save da janela antiga');
    assert.deepEqual(closingSave.disk, closingSave.state, 'o save recebido foi gravado antes de a janela fechar');
    assert.equal(closingSave.state.name, before.name);
    assert.equal(closingSave.state.tickets, before.tickets);
    assert.equal(persisted.name, before.name);
    assert.ok(report.saves.slice(firstSave).some(saved => JSON.stringify(saved.state) === JSON.stringify(persisted)),
      'o arquivo atual contém um dos snapshots realmente enviados nesta troca');
    if (persisted.rings.held) assert.equal(persisted.tickets, before.tickets);
    else assert.equal(persisted.tickets, after.tickets, 'um autosave da janela nova já contém o reembolso');
    assert.equal(after.language, language);
    assert.equal(after.choice, language);
    assert.equal(after.settingsOpen, true);
    assert.equal(after.shopOpen, true, 'o pedido da bandeja chegou à página substituta');
    assert.equal(after.zoom, 0.5);
    if (activeRounds) {
      const restored = await win.webContents.executeJavaScript(`(() => {
        const engine = __handoffAudit.engine();
        return { held: engine.state.rings.held ?? 0, round: engine.round || null, mata: engine.state.minis.mata,
          mataPhase: engine.mini('mata').info().phase, palco: engine.state.minis.palco };
      })()`);
      assert.equal(before.interrupted.liveMataPhase, 'win');
      assert.equal(before.interrupted.livePalco, true);
      assert.equal(restored.held, 0);
      assert.equal(restored.round, null);
      assert.equal(closingSave.state.rings.held, before.interrupted.cost, 'o save da janela antiga contém a entrada interrompida');
      assert.deepEqual(closingSave.state.minis.mata, before.interrupted.mataCheckpoint);
      assert.deepEqual(restored.mata, before.interrupted.mataCheckpoint, 'a vitória não é repetida e o checkpoint fica no save');
      assert.equal(restored.mataPhase, 'intro');
      assert.equal(restored.palco.show, null);
      assert.equal(restored.palco.shows, before.interrupted.palcoShows);
      assert.equal(restored.palco.stars, before.interrupted.palcoStars);
      assert.deepEqual(restored.palco.best, before.interrupted.palcoBest);
      report.rounds ||= [];
      report.rounds.push({ language, refunded: before.interrupted.cost, checkpoint: { stage: restored.mata.stage, battle: restored.mata.battle, wins: restored.mata.wins },
        unfinishedShowAwarded: false });
    }
    report.changes.push({ language, before, after, requestPhase, oldDestroyed: old.isDestroyed() });
    delete report.pending;
  }
  report.resizes = [];
  for (const [width, height] of [[640, 360], [360, 480], [1100, 850]]) {
    display.workArea = { ...display.workArea, width, height };
    display.size = { width, height };
    displayEvents['display-metrics-changed']({}, display, ['bounds', 'workArea']);
    const resized = await win.webContents.executeJavaScript(`(async () => {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, name: __handoffAudit.engine().state.name,
        windows: [...document.querySelectorAll('#painel, #vitrine, #tela, #argolas, #casa, .mini')]
          .filter(element => !element.hidden && element.getClientRects().length)
          .map(element => { const box = element.getBoundingClientRect(); return { id: element.id,
            inside: box.left >= -1 && box.top >= -1 && box.right <= innerWidth + 1 && box.bottom <= innerHeight + 1 }; }) };
    })()`);
    const native = win.getContentBounds();
    report.resizes.push({ ...resized, requested: { width, height }, nativeRequest: win.lastRequestedBounds, native });
    assert.equal(win.lastRequestedBounds.width, width);
    assert.equal(win.lastRequestedBounds.height, height);
    // Com DPR fracionário, a conversão entre DIP e pixels físicos pode arredondar a área nativa em um pixel.
    assert.ok(Math.abs(native.width - width) <= 1);
    assert.ok(Math.abs(native.height - height) <= 1);
    assert.ok(Math.abs(resized.width - native.width) <= 1);
    assert.ok(Math.abs(resized.height - native.height) <= 1);
    assert.equal(resized.name, 'Troca 2');
    assert.ok(resized.windows.length >= 2);
    assert.ok(resized.windows.every(entry => entry.inside), 'as janelas abertas cabem na nova área útil');
  }
  assert.equal(windows.length, 4);
  assert.deepEqual(errors, []);
  report.windows = windows.length;
  finish();
}).catch(finish);
