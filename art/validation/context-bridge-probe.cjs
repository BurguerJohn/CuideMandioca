'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow, ipcMain } = require('electron');
const root = path.resolve(__dirname, '../..');
const { GameEngine } = require(path.join(root, 'src/core.js'));
const data = require(path.join(root, 'src/data.js'));
const { publicSettings, normalizeSettings } = require(path.join(root, 'src/settings.js'));
const source = new GameEngine(data);
source.state.cheer = 10000;
source.buyLevel('rebolado');
const snapshot = source.exportState();
const profile = path.join(__dirname, `electron-probe-profile-${process.pid}`);
fs.mkdirSync(profile, { recursive: true });
app.setPath('userData', profile);
app.setPath('sessionData', profile);
app.disableHardwareAcceleration();
let done = false;
function finish(result, code = 0) {
  if (done) return;
  done = true;
  fs.writeFileSync(path.join(__dirname, 'context-bridge-verification.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
  app.exit(code);
}
setTimeout(() => finish({ error: 'O probe não concluiu em 20 segundos.' }, 1), 20000);
app.whenReady().then(async () => {
  const errors = [];
  ipcMain.on('desktop:info', event => { event.returnValue = { language: { choice: 'auto', id: 'pt-BR', auto: 'pt-BR' }, steam: { on: false }, reopen: null }; });
  ipcMain.on('game:load', event => { event.returnValue = snapshot; });
  ipcMain.on('game:save', event => { event.returnValue = true; });
  ipcMain.on('desktop:log-error', (_event, text) => { errors.push(text); });
  ipcMain.handle('desktop:get-settings', () => ({ ...publicSettings(normalizeSettings(null)), revision: 0 }));
  const win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, sandbox: true,
    preload: path.join(root, 'desktop/preload.js') } });
  await win.loadFile(path.join(root, 'index.html'));
  const result = await win.webContents.executeJavaScript(`(() => {
    'use strict';
    const state = arraiaDesktop.loadGame();
    const row = state.log.find(entry => entry.type === 'level');
    const result = { snapshotFrozen: Object.isFrozen(state), logFrozen: Object.isFrozen(state.log), rowFrozen: Object.isFrozen(row) };
    try { Object.assign(row, { level: 3 }); result.modified = row.level === 3; }
    catch (error) { result.mutationError = error.message; }
    const saved = arraiaDesktop.loadGame();
    const baseline = JSON.stringify(saved);
    const options = { now: () => saved.lastSeen, rng: () => 0.5 };
    const a = new ArraiaCore.GameEngine(GAME_DATA, saved, options);
    const b = new ArraiaCore.GameEngine(GAME_DATA, saved, options);
    const other = JSON.stringify(b.state);
    result.buySucceeded = a.buyLevel('rebolado');
    result.snapshotPreserved = JSON.stringify(saved) === baseline;
    result.otherGamePreserved = JSON.stringify(b.state) === other;
    result.level = a.level('rebolado');
    result.logLevel = a.state.log.find(entry => entry.type === 'level').level;
    const bingoOptions = { now: () => saved.lastSeen, rng: () => 0 };
    const bingoSource = new ArraiaCore.GameEngine(GAME_DATA, null, bingoOptions);
    while (bingoSource.state.size < 10) bingoSource.addFame(bingoSource.fameNeed() - bingoSource.state.fame);
    bingoSource.state.tickets = 100;
    bingoSource.buyBingo();
    while (!bingoSource.state.bingo.round.result) bingoSource.drawBingo();
    const bingoSaved = bingoSource.exportState();
    bingoSaved.bingo.round.prize = { tickets: { toString: null, valueOf: null }, amount: [] };
    const bingo = new ArraiaCore.GameEngine(GAME_DATA, bingoSaved, bingoOptions);
    const html = ArraiaUI.tela(bingo, { tela: 'bingo', icon: () => '', now: saved.lastSeen });
    result.bingo = { prize: bingo.state.bingo.round.prize,
      rendered: html.includes('data-action="bingo-comprar"') && !/NaN|Infinity|\\[object Object\\]/.test(html),
      balancePreserved: bingo.state.tickets === bingoSaved.tickets && bingo.state.cheer === bingoSaved.cheer,
      winCount: bingo.state.stats.bingos, canBuyNext: bingo.buyBingo(), newRoundResult: bingo.state.bingo.round.result };
    return result;
  })()`);
  finish({ electron: process.versions.electron, ...result, errors },
    result.buySucceeded && result.snapshotPreserved && result.otherGamePreserved && result.level === 3 && result.logLevel === 3 &&
    result.bingo.rendered && result.bingo.balancePreserved && result.bingo.winCount === 1 && result.bingo.canBuyNext &&
    result.bingo.newRoundResult === null && result.bingo.prize.tickets === 0 && result.bingo.prize.amount === 0 && !errors.length ? 0 : 1);
}).catch(error => finish({ error: error.stack || error.message }, 1));
