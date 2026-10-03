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
const profile = path.join(__dirname, `electron-compact-profile-${process.pid}`);
fs.mkdirSync(profile, { recursive: true });
app.setPath('userData', profile);
app.setPath('sessionData', profile);
app.disableHardwareAcceleration();
let done = false;
function finish(result, code = 0) {
  if (done) return;
  done = true;
  fs.writeFileSync(path.join(__dirname, 'compact-layout-verification.json'), JSON.stringify(result, null, 2) + '\n');
  app.exit(code);
}
setTimeout(() => finish({ error: 'O teste de telas menores não concluiu em 30 segundos.' }, 1), 30000);
app.whenReady().then(async () => {
  const errors = [];
  let fixture = null;
  ipcMain.on('desktop:info', event => { event.returnValue = { language: { choice: 'auto', id: 'pt-BR', auto: 'pt-BR' }, steam: { on: false }, reopen: null }; });
  ipcMain.on('game:load', event => { event.returnValue = fixture; });
  ipcMain.on('game:save', event => { event.returnValue = true; });
  ipcMain.on('desktop:log-error', (_event, text) => { errors.push(text); });
  ipcMain.handle('desktop:get-settings', () => ({ ...publicSettings(normalizeSettings(null)), revision: 0 }));
  const win = new BrowserWindow({ width: 1000, height: 800, useContentSize: true, show: false,
    webPreferences: { contextIsolation: true, sandbox: true, preload: path.join(root, 'desktop/preload.js') } });
  const results = [];
  for (const [width, height] of [[1280, 720], [1024, 600], [800, 480], [640, 360], [360, 640], [360, 480]]) {
    win.setContentSize(width, height);
    for (const firstRun of [true, false]) {
      fixture = firstRun ? null : snapshot;
      await win.loadFile(path.join(root, 'index.html'));
      results.push(...await win.webContents.executeJavaScript(`(async () => {
        await document.fonts.ready;
        const firstRun = ${firstRun};
        const results = [];
        const measure = screen => {
          const element = document.querySelector('#janela');
          const r = element.getBoundingClientRect();
          const css = getComputedStyle(element);
          element.scrollTop = element.scrollHeight;
          const button = element.querySelector('button');
          const b = button.getBoundingClientRect();
          const visible = r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
          results.push({ screen, viewport: { width: innerWidth, height: innerHeight },
            box: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height },
            scroll: { height: element.scrollHeight, client: element.clientHeight, overflowY: css.overflowY },
            visible, buttonVisible: b.top >= 0 && b.bottom <= innerHeight });
        };
        if (firstRun) measure('boas-vindas');
        else {
          document.querySelector('[data-action="fechar-janela"]')?.click();
          for (const [screen, action] of [['correio', 'carta'], ['pescaria', 'pescar']]) {
            document.querySelector('[data-action="tela"][data-tela="' + screen + '"]').click();
            const actionButton = document.querySelector('#tela [data-action="' + action + '"]');
            if (!actionButton || actionButton.disabled) throw new Error('A ação de teste não está disponível: ' + action);
            actionButton.click();
            measure(screen);
            document.querySelector('[data-action="fechar-janela"]').click();
            document.querySelector('#tela [data-action="tela-fechar"]').click();
          }
        }
        return results;
      })()`));
    }
  }
  finish({ electron: process.versions.electron, pid: process.pid, results, errors },
    results.every(entry => entry.visible && entry.buttonVisible) && !errors.length ? 0 : 1);
}).catch(error => finish({ error: error.stack || error.message }, 1));
