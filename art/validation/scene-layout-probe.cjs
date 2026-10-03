'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow, ipcMain } = require('electron');
const root = path.resolve(__dirname, '../..');
const { GameEngine } = require(path.join(root, 'src/core.js'));
const data = require(path.join(root, 'src/data.js'));
const { publicSettings, normalizeSettings } = require(path.join(root, 'src/settings.js'));
const profile = path.join(__dirname, `electron-scene-layout-profile-${process.pid}`);
fs.mkdirSync(profile, { recursive: true });
app.setPath('userData', profile);
app.setPath('sessionData', profile);
app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.disableHardwareAcceleration();
let done = false;
const progress = { stage: 'inicialização' };
const errors = [], results = [];
function finish(result, code = 0) {
  if (done) return;
  done = true;
  fs.writeFileSync(path.join(__dirname, 'scene-layout-verification.json'), JSON.stringify(result, null, 2) + '\n');
  app.exit(code);
}
setTimeout(() => finish({ error: 'O teste das cenas não concluiu em 90 segundos.', pid: process.pid, progress, results, errors }, 1), 90000);
app.whenReady().then(async () => {
  const source = new GameEngine(data, null, { rng: () => 0.5 });
  while (source.state.size < 207) source.addFame(source.fameNeed() - source.state.fame);
  const snapshot = source.exportState();
  let language = 'pt-BR', revision = 0;
  const settings = { ...publicSettings(normalizeSettings({
    minis: Object.fromEntries(data.minis.windows.map(entry => [entry.id, { hidden: false }]))
  })), revision };
  ipcMain.on('desktop:info', event => { event.returnValue = { language: { choice: language, id: language, auto: language }, steam: { on: false }, reopen: null }; });
  ipcMain.on('game:load', event => { event.returnValue = { ...snapshot, lastSeen: Date.now() }; });
  ipcMain.on('game:save', event => { event.returnValue = true; });
  ipcMain.on('desktop:log-error', (_event, text) => { errors.push(text); });
  ipcMain.handle('desktop:get-settings', () => settings);
  ipcMain.handle('desktop:update-settings', (_event, partial) => Object.assign(settings, partial, { revision: ++revision }));
  const win = new BrowserWindow({ width: 1000, height: 800, useContentSize: true, show: false,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false, preload: path.join(root, 'desktop/preload.js') } });
  for (language of ['pt-BR', 'en', 'es']) {
    Object.assign(progress, { stage: 'carregar', language });
    await win.loadFile(path.join(root, 'index.html'));
    win.webContents.focus();
    progress.stage = 'fontes';
    await win.webContents.executeJavaScript(`(async () => { await document.fonts.ready; return true; })()`);
    for (const [width, height] of [[1280, 720], [800, 480], [640, 360], [360, 640], [360, 480]]) {
      win.setContentSize(width, height);
      for (const zoom of [0.25, 3]) {
        Object.assign(progress, { stage: 'medir', width, height, zoom, results: results.length });
        Object.assign(settings, { zoom, revision: ++revision });
        win.webContents.send('desktop:command', { settings });
        results.push(...await win.webContents.executeJavaScript(`(async () => {
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          document.querySelector('#janela [data-action="fechar-janela"]')?.click();
          return [...document.querySelectorAll('.casa')].map(element => {
            const close = element.querySelector('.fechar');
            close.focus();
            const r = element.getBoundingClientRect(), b = close.getBoundingClientRect();
            const scene = element.querySelector('.casa-cena'), canvas = element.querySelector('canvas');
            const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
            const canvasFitsWidth = canvas.getBoundingClientRect().width <= scene.clientWidth + 1;
            const originalScroll = scene.scrollLeft;
            scene.scrollLeft = scene.scrollWidth;
            const rightEndVisible = scene.scrollLeft > 0 && canvas.getBoundingClientRect().right <= scene.getBoundingClientRect().right + 1;
            const overflowX = getComputedStyle(scene).overflowX;
            scene.scrollLeft = originalScroll;
            return { language: ${JSON.stringify(language)}, zoom: ${zoom}, id: element.id,
              viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio }, hidden: element.hidden,
              box: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height },
              inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
              closeVisible: b.left >= 0 && b.top >= 0 && b.right <= innerWidth + 1 && b.bottom <= innerHeight + 1,
              closeAccessible: hit === close || close.contains(hit),
              scene: { width: scene.clientWidth, height: scene.clientHeight, scrollHeight: scene.scrollHeight, scrollWidth: scene.scrollWidth, overflowX,
                canvasWidth: canvas.getBoundingClientRect().width, canvasHeight: canvas.getBoundingClientRect().height },
              canvasFitsWidth, canvasAccessible: canvasFitsWidth || (overflowX === 'auto' && rightEndVisible) };
          });
        })()`));
      }
    }
  }
  finish({ electron: process.versions.electron, pid: process.pid, results, errors },
    results.length === 300 && results.every(entry => !entry.hidden && entry.inside && entry.closeVisible && entry.closeAccessible && entry.canvasAccessible) && !errors.length ? 0 : 1);
}).catch(error => finish({ error: error.stack || error.message, pid: process.pid }, 1));
