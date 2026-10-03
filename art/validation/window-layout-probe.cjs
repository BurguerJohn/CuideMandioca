'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow, ipcMain } = require('electron');
const root = path.resolve(__dirname, '../..');
const { GameEngine } = require(path.join(root, 'src/core.js'));
const data = require(path.join(root, 'src/data.js'));
const { publicSettings, normalizeSettings } = require(path.join(root, 'src/settings.js'));
const source = new GameEngine(data, null, { rng: () => 0.5 });
while (source.state.size < 10) source.addFame(source.fameNeed() - source.state.fame);
source.state.tickets = 100;
const snapshot = source.exportState();
const profile = path.join(__dirname, `electron-layout-profile-${process.pid}`);
fs.mkdirSync(profile, { recursive: true });
app.setPath('userData', profile);
app.setPath('sessionData', profile);
app.disableHardwareAcceleration();
let done = false;
function finish(result, code = 0) {
  if (done) return;
  done = true;
  fs.writeFileSync(path.join(__dirname, 'window-layout-verification.json'), JSON.stringify(result, null, 2) + '\n');
  app.exit(code);
}
setTimeout(() => finish({ error: 'O teste de layout não concluiu em 20 segundos.' }, 1), 20000);
app.whenReady().then(async () => {
  const errors = [];
  const settings = { ...publicSettings(normalizeSettings(null)), revision: 0 };
  ipcMain.on('desktop:info', event => { event.returnValue = { language: { choice: 'auto', id: 'pt-BR', auto: 'pt-BR' }, steam: { on: false }, reopen: null }; });
  ipcMain.on('game:load', event => { event.returnValue = snapshot; });
  ipcMain.on('game:save', event => { event.returnValue = true; });
  ipcMain.on('desktop:log-error', (_event, text) => { errors.push(text); });
  ipcMain.handle('desktop:get-settings', () => settings);
  ipcMain.handle('desktop:update-settings', (_event, partial) => Object.assign(settings, partial, { revision: settings.revision + 1 }));
  const win = new BrowserWindow({ width: 1000, height: 800, useContentSize: true, show: false,
    webPreferences: { contextIsolation: true, sandbox: true, preload: path.join(root, 'desktop/preload.js') } });
  await win.loadFile(path.join(root, 'index.html'));
  const result = await win.webContents.executeJavaScript(`(async () => {
    await document.fonts.ready;
    const waitFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const bounds = element => { const r = element.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const close = document.querySelector('[data-action="fechar-janela"]');
    close?.click();
    const results = [];
    for (const [screen, action] of [['correio', 'carta'], ['bingo', 'bingo-comprar']]) {
      document.querySelector('[data-action="tela"][data-tela="' + screen + '"]').click();
      const tela = document.querySelector('#tela');
      const header = tela.querySelector('[data-arrastar="tela"]');
      const initial = bounds(tela);
      const x = initial.left + 30, y = initial.top + 20;
      const dy = innerHeight - initial.bottom - 8;
      for (const [type, clientY, buttons] of [['pointerdown', y, 1], ['pointermove', y + dy, 1], ['pointerup', y + dy, 0]]) {
        header.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, buttons, clientX: x, clientY }));
      }
      const before = bounds(tela);
      tela.querySelector('[data-action="' + action + '"]').click();
      document.querySelector('[data-action="fechar-janela"]')?.click();
      await waitFrame();
      const after = bounds(tela);
      results.push({ screen, before, after, viewport: { width: innerWidth, height: innerHeight },
        visible: after.left >= 0 && after.top >= 0 && after.right <= innerWidth && after.bottom <= innerHeight });
      tela.querySelector('[data-action="tela-fechar"]').click();
    }
    document.querySelector('[data-action="argolas"]').click();
    const rings = document.querySelector('#argolas');
    rings.querySelector('[data-action="argolas-jogar"]').click();
    const header = rings.querySelector('[data-arrastar="argolas"]');
    const initial = bounds(rings);
    const x = initial.left + 30, y = initial.top + 20;
    const dy = innerHeight - initial.bottom - 8;
    for (const [type, clientY, buttons] of [['pointerdown', y, 1], ['pointermove', y + dy, 1], ['pointerup', y + dy, 0]]) {
      header.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, buttons, clientX: x, clientY }));
    }
    const before = bounds(rings);
    const canvas = rings.querySelector('canvas');
    for (let i = 0; i < 3; i++) {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ' ' }));
      await new Promise(resolve => setTimeout(resolve, 450));
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    const after = bounds(rings);
    results.push({ screen: 'argolas', before, after, viewport: { width: innerWidth, height: innerHeight },
      completed: !!rings.querySelector('.resultado'),
      visible: after.left >= 0 && after.top >= 0 && after.right <= innerWidth && after.bottom <= innerHeight });
    return results;
  })()`);
  finish({ electron: process.versions.electron, pid: process.pid, results: result, errors },
    result.every(entry => entry.visible && entry.completed !== false) && !errors.length ? 0 : 1);
}).catch(error => finish({ error: error.stack || error.message }, 1));
