'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Idioma e Steam chegam antes da página desenhar: o jogo já abre no idioma certo.
const info = ipcRenderer.sendSync('desktop:info') || {};

contextBridge.exposeInMainWorld('arraiaDesktop', Object.freeze({
  language: info.language || null,
  steam: info.steam || null,
  // Depois de trocar o idioma pelos Ajustes, a festa nova abre com eles.
  reopen: info.reopen || null,
  setLanguage: choice => ipcRenderer.send('desktop:set-language', choice),
  loadGame: () => ipcRenderer.sendSync('game:load'),
  saveGame: state => ipcRenderer.sendSync('game:save', state),
  getSettings: () => ipcRenderer.invoke('desktop:get-settings'),
  updateSettings: partial => ipcRenderer.invoke('desktop:update-settings', partial),
  setInteractive: interactive => ipcRenderer.send('desktop:set-interactive', interactive),
  // A janela parou de receber o mouse (depois do repouso): o jogo abre uma nova.
  repair: () => ipcRenderer.send('desktop:repair'),
  setFocusable: focusable => ipcRenderer.send('desktop:set-focusable', focusable),
  focusGame: request => ipcRenderer.send('desktop:focus-game', request),
  logError: text => ipcRenderer.send('desktop:log-error', String(text).slice(0, 4000)),
  quit: () => ipcRenderer.send('desktop:quit'),
  onCommand: callback => ipcRenderer.on('desktop:command', (_event, command) => callback(command))
}));
