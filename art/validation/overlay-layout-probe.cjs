'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow, ipcMain } = require('electron');
const root = path.resolve(__dirname, '../..');
const { GameEngine } = require(path.join(root, 'src/core.js'));
const data = require(path.join(root, 'src/data.js'));
const { publicSettings, normalizeSettings } = require(path.join(root, 'src/settings.js'));
const source = new GameEngine(data, null, { rng: () => 0.5 });
while (source.state.size < 30) source.addFame(source.fameNeed() - source.state.fame);
source.state.mail.ready = source.cfg.letterCap;
const snapshot = source.exportState();
const profile = path.join(__dirname, `electron-overlay-profile-${process.pid}`);
fs.mkdirSync(profile, { recursive: true });
app.setPath('userData', profile);
app.setPath('sessionData', profile);
app.disableHardwareAcceleration();
let done = false;
function finish(result, code = 0) {
  if (done) return;
  done = true;
  fs.writeFileSync(path.join(__dirname, 'overlay-layout-verification.json'), JSON.stringify(result, null, 2) + '\n');
  app.exit(code);
}
setTimeout(() => finish({ error: 'O teste de sobreposição não concluiu em 20 segundos.' }, 1), 20000);
app.whenReady().then(async () => {
  const errors = [];
  const settings = { ...publicSettings(normalizeSettings({ minis: { bichos: { hidden: false } } })), revision: 0 };
  ipcMain.on('desktop:info', event => { event.returnValue = { language: { choice: 'auto', id: 'pt-BR', auto: 'pt-BR' }, steam: { on: false }, reopen: null }; });
  ipcMain.on('game:load', event => { event.returnValue = snapshot; });
  ipcMain.on('game:save', event => { event.returnValue = true; });
  ipcMain.on('desktop:log-error', (_event, text) => { errors.push(text); });
  ipcMain.handle('desktop:get-settings', () => settings);
  ipcMain.handle('desktop:update-settings', (_event, partial) => Object.assign(settings, partial, { revision: settings.revision + 1 }));
  const win = new BrowserWindow({ width: 1000, height: 800, useContentSize: true, show: false,
    webPreferences: { contextIsolation: true, sandbox: true, preload: path.join(root, 'desktop/preload.js') } });
  await win.loadFile(path.join(root, 'index.html'));
  const results = await win.webContents.executeJavaScript(`(async () => {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const remembered = await arraiaDesktop.getSettings();
    const restoredMini = document.querySelector('[data-mini="bichos"].casa');
    if (!restoredMini) return { restored: false, remembered: remembered.minis,
      unlocked: !!document.querySelector('[data-action="mini"][data-mini="bichos"]'), results: [] };
    const dialog = document.querySelector('#janela');
    const openLetter = () => {
      document.querySelector('[data-action="tela"][data-tela="correio"]').click();
      document.querySelector('#tela [data-action="carta"]').click();
    };
    dialog.querySelector('[data-action="fechar-janela"]')?.click();
    openLetter();
    const button = dialog.querySelector('button').getBoundingClientRect();
    const cx = button.left + button.width / 2, cy = button.top + button.height / 2;
    dialog.querySelector('button').click();
    document.querySelector('#tela [data-action="tela-fechar"]').click();
    const mini = restoredMini;
    const header = mini.querySelector('.casa-topo');
    const r = mini.getBoundingClientRect();
    const x = r.left + 20, y = r.top + 15;
    const dx = cx - r.width / 2 - r.left, dy = cy - r.height / 2 - r.top;
    for (const [type, px, py, buttons] of [['pointerdown', x, y, 1], ['pointermove', x + dx, y + dy, 1], ['pointerup', x + dx, y + dy, 0]]) {
      header.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, buttons, clientX: px, clientY: py }));
    }
    const results = [];
    for (const help of [false, true]) {
      if (help) mini.querySelector('[data-action="mini-ajuda"]').click();
      openLetter();
      const b = dialog.querySelector('button').getBoundingClientRect();
      const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      const box = mini.getBoundingClientRect();
      results.push({ help, target: { tag: hit?.tagName, action: hit?.dataset.action, mini: hit?.closest('.casa')?.dataset.mini || null },
        overlapping: b.left < box.right && b.right > box.left && b.top < box.bottom && b.bottom > box.top,
        accessible: !!hit && dialog.contains(hit), miniVisible: !mini.hidden,
        helpVisible: !mini.querySelector('.ajuda-painel').hidden });
      dialog.querySelector('button').click();
      document.querySelector('#tela [data-action="tela-fechar"]').click();
    }
    mini.querySelector('[data-action="mini-ajuda"]').click();
    document.querySelector('[data-action="abrir"]').click();
    const panel = document.querySelector('#painel');
    const close = panel.querySelector('[data-action="fechar"]');
    const target = close.getBoundingClientRect();
    const panelX = target.left + target.width / 2, panelY = target.top + target.height / 2;
    close.click();
    const from = mini.getBoundingClientRect();
    const mx = from.left + 20, my = from.top + 15;
    const shiftX = panelX - from.width / 2 - from.left, shiftY = panelY - from.height / 2 - from.top;
    for (const [type, px, py, buttons] of [['pointerdown', mx, my, 1], ['pointermove', mx + shiftX, my + shiftY, 1], ['pointerup', mx + shiftX, my + shiftY, 0]]) {
      header.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, buttons, clientX: px, clientY: py }));
    }
    document.querySelector('[data-action="abrir"]').click();
    const hit = document.elementFromPoint(panelX, panelY);
    const placed = mini.getBoundingClientRect();
    results.push({ screen: 'painel', target: { tag: hit?.tagName, action: hit?.dataset.action, mini: hit?.closest('.casa')?.dataset.mini || null },
      overlapping: panelX >= placed.left && panelX < placed.right && panelY >= placed.top && panelY < placed.bottom,
      accessible: !!hit && panel.contains(hit), miniVisible: !mini.hidden });
    const escape = () => document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    escape();
    const panelClosed = panel.hidden;
    mini.querySelector('[data-action="mini-ajuda"]').click();
    escape();
    const helpClosed = mini.querySelector('.ajuda-painel').hidden && !mini.hidden;
    escape();
    return { restored: true, results, escape: { panelClosed, helpClosed, sceneHidden: mini.hidden } };
  })()`);
  finish({ electron: process.versions.electron, pid: process.pid, ...results, errors },
    results.restored && results.results.length === 3 && results.results.every(entry => entry.overlapping && entry.accessible && entry.miniVisible && entry.helpVisible === entry.help) &&
    results.escape.panelClosed && results.escape.helpClosed && results.escape.sceneHidden && !errors.length ? 0 : 1);
}).catch(error => finish({ error: error.stack || error.message }, 1));
