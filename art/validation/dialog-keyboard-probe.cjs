'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { app, BrowserWindow, ipcMain } = require('electron');
const root = path.resolve(__dirname, '../..');
const { GameEngine } = require(path.join(root, 'src/core.js'));
const data = require(path.join(root, 'src/data.js'));
const { normalizeSettings, publicSettings } = require(path.join(root, 'src/settings.js'));
const source = new GameEngine(data, null, { rng: () => 0.5 });
while (source.state.size < 100) source.addFame(source.fameNeed() - source.state.fame);
source.state.tickets = 100;
source.state.mail.ready = 2;
const snapshot = source.exportState();
const profile = path.join(__dirname, `electron-dialog-keyboard-profile-${process.pid}`);
fs.mkdirSync(profile, { recursive: true });
app.setPath('userData', profile);
app.setPath('sessionData', profile);
app.disableHardwareAcceleration();
let done = false;
const progress = {}, errors = [];
function finish(result, code = 0) {
  if (done) return;
  done = true;
  fs.writeFileSync(path.join(__dirname, 'dialog-keyboard-verification.json'), JSON.stringify({ pid: process.pid, ...result }, null, 2) + '\n');
  app.exit(code);
}
setTimeout(() => finish({ error: 'O teste do teclado não concluiu em 30 segundos.', progress, errors }, 1), 30000);
app.whenReady().then(async () => {
  ipcMain.on('desktop:info', event => { event.returnValue = { language: { choice: 'auto', id: 'pt-BR', auto: 'pt-BR' }, steam: { on: false } }; });
  ipcMain.on('game:load', event => { event.returnValue = snapshot; });
  ipcMain.on('game:save', event => { event.returnValue = true; });
  ipcMain.on('desktop:log-error', (_event, text) => errors.push(text));
  ipcMain.handle('desktop:get-settings', () => ({ ...publicSettings(normalizeSettings(null)), revision: 0 }));
  const win = new BrowserWindow({ width: 1100, height: 850, useContentSize: true, show: false,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false, preload: path.join(root, 'desktop/preload.js') } });
  const page = path.join(profile, 'index.html');
  fs.writeFileSync(page, fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace('<head>',
    `<head><base href="${pathToFileURL(root + path.sep).href}"><script>globalThis.__gravador = api => { globalThis.__dialogAudit = api; };</script>`));
  await win.loadFile(page);
  win.webContents.focus();
  const evaluate = code => win.webContents.executeJavaScript(code);
  const frames = () => evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))');
  const key = async keyCode => {
    win.webContents.sendInputEvent({ type: 'keyDown', keyCode });
    if (keyCode === 'Return' || keyCode === 'Space') win.webContents.sendInputEvent({ type: 'char', keyCode: keyCode === 'Return' ? '\r' : ' ' });
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode });
    await frames();
  };
  await evaluate(`(async () => {
    await document.fonts.ready;
    document.querySelector('#janela [data-action="fechar-janela"]')?.click();
    document.querySelector('[data-action="argolas"]').click();
    document.querySelector('[data-action="argolas-jogar"]').click();
    document.querySelector('[data-action="tela"][data-tela="correio"]').click();
    document.querySelector('#tela [data-action="carta"]').focus();
    return true;
  })()`);
  await key('Return');
  const letter = await evaluate(`(() => {
    const modal = document.querySelector('#janela');
    return { visible: !modal.hidden, focused: modal.contains(document.activeElement), active: document.activeElement.id || document.activeElement.dataset.action || document.activeElement.tagName,
      letters: __dialogAudit.engine().state.stats.letters, left: __dialogAudit.engine().round?.left,
      documentFocused: document.hasFocus() };
  })()`);
  progress.letter = letter;
  await key('Space');
  const afterSpace = await evaluate(`({ left: __dialogAudit.engine().round?.left, visible: !document.querySelector('#janela').hidden })`);
  progress.afterSpace = afterSpace;
  await key('Tab');
  const letterTab = await evaluate(`({ inside: document.querySelector('#janela').contains(document.activeElement), action: document.activeElement.dataset.action })`);
  progress.letterTab = letterTab;
  await key('Return');
  const letterClosed = await evaluate('document.querySelector("#janela").hidden');
  const letterReturn = await evaluate(`({ action: document.activeElement.dataset.action, inMail: document.querySelector('#tela').contains(document.activeElement) })`);
  progress.letterReturn = letterReturn;
  await key('Return');
  const nextLetterFromKeyboard = await evaluate('!document.querySelector("#janela").hidden && __dialogAudit.engine().state.stats.letters === 2');
  if (!nextLetterFromKeyboard) throw new Error('Enter não abriu a segunda carta depois de fechar a primeira.');
  await key('Tab');
  await key('Return');
  const emptyMail = await evaluate(`({ ready: __dialogAudit.engine().state.mail.ready, letters: __dialogAudit.engine().state.stats.letters,
    visible: !document.querySelector('#janela').hidden, disabledFocused: document.activeElement === document.querySelector('#tela [data-action="carta"]') })`);
  await evaluate(`(() => {
    document.querySelector('#janela [data-action="fechar-janela"]')?.click();
    document.querySelector('[data-action="abrir"]').click();
    document.querySelector('#painel [data-action="ano-novo"]').focus();
    return true;
  })()`);
  await key('Return');
  const year = await evaluate(`({ focused: document.querySelector('#janela').contains(document.activeElement), year: __dialogAudit.engine().state.year,
    visible: !document.querySelector('#janela').hidden, active: document.activeElement.dataset.action || document.activeElement.id })`);
  await key('Return');
  const repeatedEnter = await evaluate(`({ year: __dialogAudit.engine().state.year, visible: !document.querySelector('#janela').hidden })`);
  await key('Tab');
  const yearTab = await evaluate(`({ inside: document.querySelector('#janela').contains(document.activeElement), action: document.activeElement.dataset.action })`);
  await key('Escape');
  const escaped = await evaluate('document.querySelector("#janela").hidden && !document.querySelector("#painel").hidden');
  const yearReturn = await evaluate(`({ action: document.activeElement.dataset.action, inPanel: document.querySelector('#painel').contains(document.activeElement) })`);
  await evaluate(`(() => {
    document.querySelector('#painel [data-action="ano-novo"]').click();
    document.querySelector('#painel [data-action="tab"][data-tab="ajustes"]').click();
    document.querySelector('#volume').focus();
    return true;
  })()`);
  await key('Escape');
  const backgroundFocusKept = await evaluate('document.activeElement === document.querySelector("#volume") && document.querySelector("#janela").hidden');
  const result = { electron: process.versions.electron, letter, afterSpace, letterTab, letterClosed, letterReturn, nextLetterFromKeyboard, emptyMail,
    year, repeatedEnter, yearTab, escaped, yearReturn, backgroundFocusKept, errors };
  const passed = letter.visible && letter.focused && letter.documentFocused && letter.letters === 1 && Number.isFinite(letter.left) && afterSpace.visible && afterSpace.left === letter.left &&
    letterTab.inside && letterTab.action === 'fechar-janela' && letterClosed && year.visible && year.focused &&
    repeatedEnter.visible && repeatedEnter.year === year.year && yearTab.inside && yearTab.action === 'ano-novo-sim' && escaped &&
    letterReturn.action === 'carta' && letterReturn.inMail && nextLetterFromKeyboard && emptyMail.ready === 0 && emptyMail.letters === 2 && !emptyMail.visible && !emptyMail.disabledFocused &&
    yearReturn.action === 'ano-novo' && yearReturn.inPanel && backgroundFocusKept && !errors.length;
  finish(result, passed ? 0 : 1);
}).catch(error => finish({ error: error.stack || error.message, progress, errors }, 1));
