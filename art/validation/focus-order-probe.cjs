'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { app, BrowserWindow, ipcMain } = require('electron');
const root = path.resolve(__dirname, '../..');
const { GameEngine } = require(path.join(root, 'src/core.js'));
const data = require(path.join(root, 'src/data.js'));
const { publicSettings, normalizeSettings } = require(path.join(root, 'src/settings.js'));
const source = new GameEngine(data, null, { rng: () => 0.5 });
while (source.state.size < 30) source.addFame(source.fameNeed() - source.state.fame);
source.state.tickets = 100;
const snapshot = source.exportState();
const profile = path.join(__dirname, `electron-focus-order-profile-${process.pid}`);
fs.mkdirSync(profile, { recursive: true });
app.setPath('userData', profile);
app.setPath('sessionData', profile);
app.disableHardwareAcceleration();
let done = false;
function finish(result, code = 0) {
  if (done) return;
  done = true;
  fs.writeFileSync(path.join(__dirname, 'focus-order-verification.json'), JSON.stringify(result, null, 2) + '\n');
  app.exit(code);
}
setTimeout(() => finish({ error: 'O teste de foco não concluiu em 20 segundos.' }, 1), 20000);
app.whenReady().then(async () => {
  const errors = [];
  ipcMain.on('desktop:info', event => { event.returnValue = { language: { choice: 'auto', id: 'pt-BR', auto: 'pt-BR' }, steam: { on: false }, reopen: null }; });
  ipcMain.on('game:load', event => { event.returnValue = snapshot; });
  ipcMain.on('game:save', event => { event.returnValue = true; });
  ipcMain.on('desktop:log-error', (_event, text) => { errors.push(text); });
  ipcMain.handle('desktop:get-settings', () => ({ ...publicSettings(normalizeSettings(null)), revision: 0 }));
  const win = new BrowserWindow({ width: 1000, height: 800, useContentSize: true, show: false,
    webPreferences: { contextIsolation: true, sandbox: true, preload: path.join(root, 'desktop/preload.js') } });
  // A página usa todos os arquivos reais e o gancho do gravador para preparar a cerimônia no motor em execução.
  const page = path.join(profile, 'index.html');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace('<head>',
    `<head><base href="${pathToFileURL(root + path.sep).href}"><script>globalThis.__gravador = api => { globalThis.__focusAudit = api; };</script>`);
  fs.writeFileSync(page, html);
  await win.loadFile(page);
  win.webContents.focus();
  const keyboard = await win.webContents.executeJavaScript(`(async () => {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    document.querySelector('#janela [data-action="fechar-janela"]')?.click();
    const engine = __focusAudit.engine();
    const weddingStarted = engine.startWedding(false, engine.now() - 23000);
    for (let i = 0; i < 10; i++) {
      if (!engine.throwRice().ready) throw new Error('O arroz do casamento não contou.');
      await new Promise(resolve => setTimeout(resolve, 210));
    }
    document.querySelector('[data-action="vitrine"]').click();
    document.querySelector('[data-action="vitrine-cat"][data-cat="chapeu"]').click();
    const selector = '#vitrine [data-action="vitrine-item"][data-id="palha-furada"]';
    const card = document.querySelector(selector);
    card.focus();
    card.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', cancelable: true }));
    const next = document.querySelector(selector);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return { purchased: document.querySelector(selector).classList.contains('uso'),
      focusPreserved: document.activeElement === document.querySelector(selector), documentFocused: document.hasFocus(),
      weddingStarted, rice: engine.state.runtime.rice };
  })()`);
  win.webContents.send('desktop:command', 'painel');
  const result = await win.webContents.executeJavaScript(`(async () => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const panel = document.querySelector('#painel');
    const dock = document.querySelector('#vitrine');
    const front = () => ({ panel: Number(panel.style.zIndex), dock: Number(dock.style.zIndex) });
    const before = front();
    const deadline = performance.now() + 12000;
    const gift = () => dock.querySelector('[data-id="veu-noiva"]')?.classList.contains('tem');
    while (!gift() && performance.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
    const after = front();
    const active = document.activeElement;
    const focusPreserved = active?.dataset.id === 'palha-furada' && dock.contains(active);
    active?.blur();
    active?.focus();
    return { before, after, giftReceived: !!gift(), focusPreserved, selected: front(), panelVisible: !panel.hidden };
  })()`);
  finish({ electron: process.versions.electron, pid: process.pid, keyboard, ...result, errors },
    keyboard.purchased && keyboard.focusPreserved && keyboard.documentFocused && keyboard.weddingStarted && keyboard.rice === 10 &&
    result.before.panel > result.before.dock && result.after.panel > result.after.dock &&
    result.giftReceived && result.focusPreserved && result.panelVisible && result.selected.dock > result.selected.panel && !errors.length ? 0 : 1);
}).catch(error => finish({ error: error.stack || error.message, pid: process.pid }, 1));
