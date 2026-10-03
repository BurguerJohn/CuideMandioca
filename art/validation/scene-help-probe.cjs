'use strict';
const fs = require('node:fs'), path = require('node:path');
const { pathToFileURL } = require('node:url');
const { app, BrowserWindow, ipcMain } = require('electron');
const root = path.resolve(__dirname, '../..');
const { GameEngine } = require(path.join(root, 'src/core'));
const data = require(path.join(root, 'src/data'));
const { publicSettings, normalizeSettings } = require(path.join(root, 'src/settings'));
const profile = path.join(__dirname, `electron-scene-help-profile-${process.pid}`);
fs.mkdirSync(profile, { recursive: true });
app.setPath('userData', profile); app.setPath('sessionData', profile);
app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.disableHardwareAcceleration();
let done = false;
function finish(result, code = 0) {
  if (done) return;
  done = true;
  fs.writeFileSync(path.join(__dirname, 'scene-help-verification.json'), JSON.stringify(result, null, 2) + '\n');
  app.exit(code);
}
setTimeout(() => finish({ error: 'O teste de ajuda não concluiu em 45 segundos.', pid: process.pid }, 1), 45000);
app.whenReady().then(async () => {
  const source = new GameEngine(data, null, { rng: () => 0.5 });
  while (source.state.size < 207) source.addFame(source.fameNeed() - source.state.fame);
  const snapshot = source.exportState(), errors = [], results = [];
  const settings = { ...publicSettings(normalizeSettings({ zoom: 0.25 })), revision: 0 };
  ipcMain.on('desktop:info', event => { event.returnValue = { language: { choice: 'pt-BR', id: 'pt-BR', auto: 'pt-BR' }, steam: { on: false } }; });
  ipcMain.on('game:load', event => { event.returnValue = { ...snapshot, lastSeen: Date.now() }; });
  ipcMain.on('game:save', event => { event.returnValue = true; });
  ipcMain.on('desktop:log-error', (_event, text) => errors.push(text));
  ipcMain.handle('desktop:get-settings', () => settings);
  ipcMain.handle('desktop:update-settings', (_event, partial) => Object.assign(settings, partial, { revision: settings.revision + 1 }));
  const page = path.join(profile, 'index.html');
  fs.writeFileSync(page, fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace('<head>',
    `<head><base href="${pathToFileURL(root + path.sep).href}"><script>globalThis.__gravador = api => { globalThis.__sceneAudit = api; };</script>`));
  const win = new BrowserWindow({ width: 360, height: 360, useContentSize: true, show: false,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false, preload: path.join(root, 'desktop/preload.js') } });
  for (const [width, height] of [[360, 240], [360, 360], [640, 360]]) {
    win.setContentSize(width, height);
    await win.loadFile(page); win.webContents.focus();
    results.push(await win.webContents.executeJavaScript(`(async () => {
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      document.querySelector('#janela [data-action="fechar-janela"]')?.click();
      const scene = document.querySelector('#casa-cena'), canvas = document.querySelector('#casa-canvas');
      const help = document.querySelector('#casa-ajuda'), button = document.querySelector('[data-action="casa-ajuda"]');
      scene.scrollLeft = scene.scrollWidth; scene.scrollTop = scene.scrollHeight;
      const previous = { x: scene.scrollLeft, y: scene.scrollTop };
      const r = scene.getBoundingClientRect();
      const residents = __sceneAudit.ui.casa.areas().map(area => ({ ...area,
        x: (area.box[0] + area.box[2]) / 2, y: (area.box[1] + area.box[3]) / 2 }))
        .filter(area => area.x > r.left && area.x < r.left + scene.clientWidth && area.y > r.top && area.y < r.top + scene.clientHeight)
        .sort((a, b) => b.x - a.x);
      const resident = residents[0];
      if (!resident) throw new Error('Nenhum morador na parte rolada da casa.');
      const target = document.elementFromPoint(resident.x, resident.y);
      const before = __sceneAudit.ui.casa.probe().reacts;
      for (const [type, buttons] of [['pointerdown', 1], ['pointerup', 0]]) target.dispatchEvent(new PointerEvent(type,
        { bubbles: true, button: 0, buttons, clientX: resident.x, clientY: resident.y }));
      const reacted = __sceneAudit.ui.casa.probe().reacts === before + 1;
      const other = residents.find(area => area.index !== resident.index);
      if (!other) throw new Error('Não há outro morador para testar a rolagem durante o clique.');
      const gestureTarget = document.elementFromPoint(other.x, other.y);
      const previousReacts = __sceneAudit.ui.casa.probe().reacts;
      gestureTarget.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, buttons: 1, clientX: other.x, clientY: other.y }));
      scene.scrollTop = 0;
      const replacement = __sceneAudit.ui.casa.hit(other.x, other.y);
      gestureTarget.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, buttons: 0, clientX: other.x, clientY: other.y }));
      const cancelled = __sceneAudit.ui.casa.probe().reacts === previousReacts;
      const fresh = replacement || __sceneAudit.ui.casa.areas().find(area => {
        const x = (area.box[0] + area.box[2]) / 2, y = (area.box[1] + area.box[3]) / 2;
        return x > r.left && x < r.left + scene.clientWidth && y > r.top && y < r.top + scene.clientHeight;
      });
      if (!fresh) throw new Error('Nenhum morador visível para o clique novo depois de rolar.');
      const freshX = (fresh.box[0] + fresh.box[2]) / 2, freshY = (fresh.box[1] + fresh.box[3]) / 2;
      const freshTarget = document.elementFromPoint(freshX, freshY);
      for (const [type, buttons] of [['pointerdown', 1], ['pointerup', 0]]) freshTarget.dispatchEvent(new PointerEvent(type,
        { bubbles: true, button: 0, buttons, clientX: freshX, clientY: freshY }));
      const freshWorks = freshTarget === canvas && __sceneAudit.ui.casa.probe().reacts === previousReacts + 1;
      const scrollGesture = { oldResident: other.index, newResident: replacement?.index ?? null, freshResident: fresh.index, cancelled, freshWorks };
      scene.scrollLeft = previous.x; scene.scrollTop = previous.y;
      button.click();
      const title = help.querySelector('h3').getBoundingClientRect();
      const viewport = scene.getBoundingClientRect();
      const titleVisible = title.left >= viewport.left && title.top >= viewport.top && title.bottom <= viewport.bottom;
      const helpAtStart = help.scrollTop === 0;
      const scrollAtStart = scene.scrollLeft === 0 && scene.scrollTop === 0;
      help.scrollTop = help.scrollHeight;
      help.click();
      const restored = scene.scrollLeft === previous.x && scene.scrollTop === previous.y;
      button.click();
      const reopenedAtStart = help.scrollTop === 0;
      return { viewport: { width: innerWidth, height: innerHeight }, previous, resident: resident.index,
        canvasTarget: target === canvas, reacted, scrollGesture, titleVisible, helpAtStart, scrollAtStart, restored, reopenedAtStart };
    })()`));
  }
  win.setContentSize(360, 160);
  const minis = await win.webContents.executeJavaScript(`(async () => {
    document.querySelector('#casa-ajuda').click();
    document.querySelector('[data-action="casa-fechar"]').click();
    const results = [];
    for (const id of GAME_DATA.minis.windows.map(entry => entry.id)) {
      document.querySelector('[data-action="mini"][data-mini="' + id + '"]').click();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const element = document.querySelector('#mini-' + id), scene = element.querySelector('.casa-cena');
      const help = element.querySelector('.ajuda-painel'), button = element.querySelector('.ajuda');
      scene.scrollLeft = scene.scrollWidth; scene.scrollTop = scene.scrollHeight;
      const previous = { x: scene.scrollLeft, y: scene.scrollTop };
      button.click();
      const title = help.querySelector('h3').getBoundingClientRect(), viewport = scene.getBoundingClientRect();
      const titleVisible = title.left >= viewport.left && title.top >= viewport.top && title.bottom <= viewport.bottom;
      const scrollAtStart = scene.scrollLeft === 0 && scene.scrollTop === 0 && help.scrollTop === 0;
      help.scrollTop = help.scrollHeight;
      help.click();
      const restored = scene.scrollLeft === previous.x && scene.scrollTop === previous.y;
      button.click();
      results.push({ id, previous, titleVisible, scrollAtStart, restored, reopenedAtStart: help.scrollTop === 0 });
      element.querySelector('.fechar').click();
    }
    return results;
  })()`);
  finish({ electron: process.versions.electron, pid: process.pid, results, minis, errors },
    results.every(result => result.previous.y > 0 && result.canvasTarget && result.reacted && result.titleVisible && result.helpAtStart &&
      result.scrollAtStart && result.restored && result.reopenedAtStart && result.scrollGesture.oldResident !== result.scrollGesture.newResident &&
      result.scrollGesture.cancelled && result.scrollGesture.freshWorks) &&
    minis.length === 9 && minis.every(result => result.previous.y > 0 && result.titleVisible && result.scrollAtStart && result.restored && result.reopenedAtStart) && !errors.length ? 0 : 1);
}).catch(error => finish({ error: error.stack || error.message, pid: process.pid }, 1));
