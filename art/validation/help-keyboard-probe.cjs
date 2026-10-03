'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { app, BrowserWindow, ipcMain } = require('electron');
const root = path.resolve(__dirname, '../..');
const { GameEngine } = require(path.join(root, 'src/core'));
const data = require(path.join(root, 'src/data'));
const { normalizeSettings, publicSettings } = require(path.join(root, 'src/settings'));
const profile = fs.mkdtempSync(path.join(__dirname, `electron-help-keyboard-profile-${process.pid}-`));
app.setPath('userData', profile);
app.setPath('sessionData', profile);
app.disableHardwareAcceleration();
const report = { pid: process.pid, profile, electron: process.versions.electron, cases: [], errors: [] };
let finished = false;
function finish(error) {
  if (finished) return;
  finished = true;
  if (error) report.error = error.stack || String(error);
  fs.writeFileSync(path.join(__dirname, 'help-keyboard-verification.json'), JSON.stringify(report, null, 2) + '\n');
  app.exit(error ? 1 : 0);
}
setTimeout(() => finish(new Error('A auditoria da ajuda excedeu 75 segundos.')), 75000);
app.whenReady().then(async () => {
  report.stage = 'prepare-source';
  const source = new GameEngine(data, null, { rng: () => 0.5 });
  while (source.state.size < 100) source.addFame(source.fameNeed() - source.state.fame);
  source.state.tickets = 100000;
  const snapshot = source.exportState();
  const settings = publicSettings(normalizeSettings({ minis: Object.fromEntries(data.minis.windows.map(entry => [entry.id, { hidden: true }])) }));
  ipcMain.on('desktop:info', event => { event.returnValue = { language: { choice: 'pt-BR', id: 'pt-BR', auto: 'pt-BR' }, steam: { on: false } }; });
  ipcMain.on('game:load', event => { event.returnValue = snapshot; });
  ipcMain.on('game:save', event => { event.returnValue = true; });
  ipcMain.on('desktop:log-error', (_event, text) => report.errors.push(text));
  ipcMain.handle('desktop:get-settings', () => ({ ...settings, revision: 0 }));
  let revision = 0;
  ipcMain.handle('desktop:update-settings', (_event, partial) => ({ ...settings, ...partial, revision: ++revision }));
  const win = new BrowserWindow({ width: 1100, height: 180, useContentSize: true, show: false,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false, preload: path.join(root, 'desktop/preload.js') } });
  const page = path.join(profile, 'index.html');
  fs.writeFileSync(page, fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace('<head>',
    `<head><base href="${pathToFileURL(root + path.sep).href}"><script>globalThis.__gravador = api => { globalThis.__helpAudit = api; };</script>`));
  report.stage = 'load-page';
  win.webContents.on('console-message', (_event, details) => { if (details.level === 'error') report.errors.push(details.message); });
  await win.loadFile(page);
  report.stage = 'page-loaded';
  win.webContents.focus();
  const evaluate = code => win.webContents.executeJavaScript(code);
  // A entrada e o DOM são nativos; a janela oculta pode limitar a composição, sem limitar os timers.
  const settleInput = () => evaluate('new Promise(resolve => setTimeout(() => resolve(true), 50))');
  const key = async keyCode => {
    win.webContents.sendInputEvent({ type: 'keyDown', keyCode });
    if (keyCode === 'Return' || keyCode === 'Space') win.webContents.sendInputEvent({ type: 'char', keyCode: keyCode === 'Return' ? '\r' : ' ' });
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode });
    await settleInput();
  };
  report.stage = 'fonts-and-initial-dialog';
  await evaluate(`(async () => {
    await document.fonts.ready;
    document.querySelector('#janela [data-action="fechar-janela"]')?.click();
    return true;
  })()`);
  for (const id of ['casa', ...data.minis.windows.map(entry => entry.id)]) {
    report.stage = 'prepare-' + id;
    const container = id === 'casa' ? '#casa' : '#mini-' + id;
    const helpSelector = id === 'casa' ? '#casa-ajuda' : container + ' .ajuda-painel';
    const trigger = id === 'casa' ? '#casa [data-action="casa-ajuda"]' : container + ' button[data-action="mini-ajuda"]';
    await evaluate(`(() => {
      if (__helpAudit.ui.rings.open) document.querySelector('#argolas [data-action="argolas-fechar"]').click();
      document.querySelector('[data-action="argolas"]').click();
      document.querySelector('#argolas [data-action="argolas-jogar"]').click();
      if (${JSON.stringify(id)} === 'casa') {
        if (document.querySelector('#casa').hidden) document.querySelector('[data-action="casa"]').click();
      } else __helpAudit.ui.janelas.setHidden(${JSON.stringify(id)}, false);
      document.querySelector(${JSON.stringify(trigger)}).focus();
      return true;
    })()`);
    report.stage = 'open-' + id;
    await key('Return');
    const tabs = [];
    for (let attempt = 0; attempt < 6; attempt++) {
      report.stage = 'tab-' + id + '-' + attempt;
      await key('Tab');
      const tab = await evaluate(`(() => { const help = document.querySelector(${JSON.stringify(helpSelector)}); return {
        reading: help === document.activeElement, active: document.activeElement.id || document.activeElement.dataset.action || document.activeElement.tagName,
        visible: !help.hidden, height: help.clientHeight, content: help.scrollHeight
      }; })()`);
      tabs.push(tab);
      if (tab.reading) break;
    }
    const before = await evaluate(`({ left: __helpAudit.engine().round?.left, scroll: document.querySelector(${JSON.stringify(helpSelector)}).scrollTop })`);
    const entry = { id, tabs, before };
    report.cases.push(entry);
    assert.ok(tabs.some(tab => tab.reading), 'Tab alcança o texto da ajuda: ' + id);
    report.stage = 'space-' + id;
    await key('Space');
    // Observa a rolagem real em vez de depender da frequência de composição da janela oculta.
    for (let attempt = 0; attempt < 40; attempt++) {
      if (await evaluate(`document.querySelector(${JSON.stringify(helpSelector)}).scrollTop > ${before.scroll}`)) break;
      await settleInput();
    }
    const after = await evaluate(`({ left: __helpAudit.engine().round?.left, scroll: document.querySelector(${JSON.stringify(helpSelector)}).scrollTop,
      visible: !document.querySelector(${JSON.stringify(helpSelector)}).hidden, documentFocused: document.hasFocus() })`);
    entry.after = after;
    await key('Escape');
    const escaped = await evaluate(`({ helpClosed: document.querySelector(${JSON.stringify(helpSelector)}).hidden,
      ownerOpen: !document.querySelector(${JSON.stringify(container)}).hidden,
      returnFocused: document.activeElement === document.querySelector(${JSON.stringify(trigger)}),
      active: document.activeElement.id || document.activeElement.dataset.action || document.activeElement.tagName })`);
    entry.escaped = escaped;
    await key('Return');
    entry.reopened = await evaluate(`({ visible: !document.querySelector(${JSON.stringify(helpSelector)}).hidden,
      left: __helpAudit.engine().round?.left })`);
    if (entry.reopened.visible) await key('Escape');
  }
  report.outsideFocus = [];
  await evaluate(`(() => {
    document.querySelector('[data-action="abrir"]').click();
    document.querySelector('#painel [data-action="tab"][data-tab="ajustes"]').click();
    return true;
  })()`);
  for (const id of ['casa', 'bairro']) {
    const trigger = id === 'casa' ? '#casa button[data-action="casa-ajuda"]' : '#mini-bairro button[data-action="mini-ajuda"]';
    const helpSelector = id === 'casa' ? '#casa-ajuda' : '#mini-bairro .ajuda-painel';
    const kept = await evaluate(`(() => {
      document.querySelector(${JSON.stringify(trigger)}).click();
      const volume = document.querySelector('#volume');
      volume.focus();
      document.querySelector(${JSON.stringify(helpSelector)}).click();
      return document.activeElement === volume && document.querySelector(${JSON.stringify(helpSelector)}).hidden;
    })()`);
    report.outsideFocus.push({ id, kept });
    assert.ok(kept, 'fechar a ajuda conserva a seleção de outro campo: ' + id);
  }
  for (const entry of report.cases) {
    assert.ok(entry.tabs.some(tab => tab.reading), 'Tab alcança o texto da ajuda: ' + entry.id);
    assert.equal(entry.after.left, entry.before.left, 'Espaço lendo a ajuda não lança Argolas: ' + entry.id);
    assert.ok(entry.after.scroll > entry.before.scroll, 'Espaço rola a ajuda: ' + entry.id);
    assert.ok(entry.after.visible && entry.after.documentFocused);
    assert.ok(entry.escaped.helpClosed && entry.escaped.ownerOpen, 'Escape fecha somente a ajuda');
    assert.ok(entry.escaped.returnFocused, 'fechar a ajuda devolve o foco ao botão de origem: ' + entry.id);
    assert.ok(entry.reopened.visible, 'Enter pode reabrir a ajuda após Escape: ' + entry.id);
    assert.equal(entry.reopened.left, entry.before.left);
  }
  assert.deepEqual(report.errors, []);
  finish();
}).catch(finish);
