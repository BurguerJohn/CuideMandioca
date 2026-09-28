'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, dialog } = require('electron');
const { normalizeSettings, mergeSettings, publicSettings, pickDisplay } = require('./window-state');
const { loadSave, writeSave } = require('./save-store');
const { createSteam } = require('./steam');
const I18N = require('../src/i18n.js');
const GAME_DATA = require('../src/data.js');

const t = (key, vars) => I18N.t(key, vars);
const steam = createSteam();
// Na versão da Steam (App ID de verdade e "required"), o jogo só roda aberto por ela. Em desenvolvimento, nunca trava.
const steamOnly = steam.config.required && app.isPackaged;

if (steamOnly && steam.restartIfNeeded()) {
  app.quit();
} else if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  if (steam.config.overlay) steam.enableOverlay();
  let win;
  let tray;
  let settings;
  let settingsPath;
  let savePath;
  let writeTimer;
  // Janelas do jogo que pedem teclado (painel, telas): enquanto abertas, a janela continua focável.
  let keepFocusable = false;
  // Troca de idioma: a janela velha fecha (e salva) antes da nova abrir; sem isso o app fecharia junto.
  let replacing = false;
  // Janela que a festa nova reabre depois de trocar o idioma pelos Ajustes (vai uma vez, junto com o idioma).
  let reopenPanel = null;

  function writeSettings() {
    clearTimeout(writeTimer);
    try {
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      const temporary = `${settingsPath}.tmp`;
      fs.writeFileSync(temporary, JSON.stringify(settings, null, 2), 'utf8');
      fs.renameSync(temporary, settingsPath);
    } catch (error) {
      console.error('Não foi possível salvar as preferências da janela:', error);
    }
  }

  function persistSoon() {
    clearTimeout(writeTimer);
    writeTimer = setTimeout(writeSettings, 300);
  }

  function alive() { return win && !win.isDestroyed(); }

  // Idioma de fato: a escolha salva; no automático, o idioma do jogo na Steam, depois o do sistema; fora da lista, inglês.
  function languageInfo() {
    const detected = { steam: steam.language(), system: app.getLocale() };
    const choice = settings?.language || 'auto';
    return { choice, id: I18N.resolve({ choice, ...detected }), auto: I18N.resolve(detected) };
  }

  function applyLanguage() {
    I18N.setLanguage(languageInfo().id);
    if (tray) tray.setToolTip(t('app.title'));
    updateTray();
  }

  // Trocar o idioma abre a festa numa janela nova: todos os textos e os dados do jogo voltam no idioma novo.
  function setLanguage(choice, reopen = null) {
    settings = mergeSettings(settings, { language: choice });
    writeSettings();
    applyLanguage();
    reopenPanel = reopen;
    replaceWindow();
  }

  // Conquistas e presença na Steam acompanham o save.
  function syncSteam(state) {
    if (!steam.available || !state || typeof state !== 'object') return;
    steam.syncAchievements(state.achievements);
    const size = Number.isInteger(state.size) ? state.size : 1;
    let tier = GAME_DATA.tiers[0].id;
    for (const entry of GAME_DATA.tiers) if (size >= entry.size) tier = entry.id;
    steam.setPresence({ tier, size });
  }

  // Quem jogou quando o jogo se chamava Arraiá continua com a mesma festa.
  function migrateOldData() {
    const old = path.join(app.getPath('appData'), 'Arraiá');
    const target = app.getPath('userData');
    try {
      if (fs.existsSync(path.join(target, 'save.json')) || !fs.existsSync(path.join(old, 'save.json'))) return;
      fs.mkdirSync(target, { recursive: true });
      for (const name of ['save.json', 'save.json.bak', 'window-settings.json']) {
        if (fs.existsSync(path.join(old, name))) fs.copyFileSync(path.join(old, name), path.join(target, name));
      }
    } catch (error) {
      console.warn('Não deu para trazer o save do Arraiá:', error.message);
    }
  }

  function currentDisplay() {
    return pickDisplay(screen.getAllDisplays(), settings.display, screen.getPrimaryDisplay());
  }

  // A janela cobre a área útil do monitor; a festa e o painel são desenhados dentro dela.
  function place() {
    if (alive()) win.setBounds(currentDisplay().workArea);
  }

  function applyWindow() {
    if (!alive()) return;
    win.setAlwaysOnTop(settings.pinned, 'floating');
    if (settings.hidden) win.hide();
    else if (!win.isVisible()) win.showInactive();
    updateTray();
  }

  function send(command) {
    if (alive()) win.webContents.send('desktop:command', command);
  }

  function change(partial) {
    const before = settings.display;
    settings = mergeSettings(settings, partial);
    if (settings.display !== before) place();
    applyWindow();
    persistSoon();
    return publicSettings(settings);
  }

  function changeAndTell(partial) {
    send({ settings: change(partial) });
  }

  function openPanel() {
    if (settings.hidden) changeAndTell({ hidden: false });
    send('painel');
  }

  function buildMenu() {
    const displays = screen.getAllDisplays();
    const shown = currentDisplay();
    const language = languageInfo();
    const autoName = I18N.LANGUAGES.find(entry => entry.id === language.auto)?.name || 'English';
    return Menu.buildFromTemplate([
      { label: t('tray.panel'), click: openPanel },
      { label: t('tray.shop'), click: () => { openPanel(); send('vitrine'); } },
      { label: t('rings.title'), click: () => send('argolas') },
      { label: t('tray.photo'), click: () => send('foto') },
      { type: 'separator' },
      { label: t('tray.pin'), type: 'checkbox', checked: settings.pinned,
        click: item => changeAndTell({ pinned: item.checked }) },
      { label: t('tray.size'), submenu: [0.5, 0.75, 1, 1.5, 2].map(zoom => ({ label: `${Math.round(zoom * 100)}%`,
        type: 'radio', checked: Math.abs(settings.zoom - zoom) < 0.01, click: () => changeAndTell({ zoom }) })) },
      ...(displays.length > 1 ? [{ label: t('tray.display'), submenu: displays.map((display, index) => ({
        label: t('tray.displayItem', { n: index + 1, w: display.size.width, h: display.size.height }), type: 'radio',
        checked: display.id === shown.id, click: () => changeAndTell({ display: display.id })
      })) }] : []),
      { label: t('tray.language'), submenu: [{ id: 'auto', name: t('settings.languageAuto', { lang: autoName }) },
        ...I18N.LANGUAGES].map(entry => ({ label: entry.name, type: 'radio', checked: language.choice === entry.id,
        click: () => { if (language.choice !== entry.id) setLanguage(entry.id); } })) },
      { label: t('tray.sound'), type: 'checkbox', checked: settings.sound,
        click: item => changeAndTell({ sound: item.checked }) },
      { label: t('tray.hide'), type: 'checkbox', checked: settings.hidden,
        click: item => changeAndTell({ hidden: item.checked }) },
      { type: 'separator' },
      { label: t('tray.quit'), click: () => app.quit() }
    ]);
  }

  function updateTray() {
    if (tray) tray.setContextMenu(buildMenu());
  }

  function isOwnWindow(event) {
    return alive() && event.sender === win.webContents;
  }

  // A festa: uma janela transparente do tamanho da área útil, que deixa o clique passar fora do jogo.
  function openWindow() {
    const created = new BrowserWindow({
      ...currentDisplay().workArea,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      focusable: false,
      skipTaskbar: true,
      title: t('app.title'),
      icon: path.join(__dirname, 'icon.ico'),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        backgroundThrottling: false
      }
    });
    win = created;
    created.setIgnoreMouseEvents(true, { forward: true });
    created.setAlwaysOnTop(settings.pinned, 'floating');
    created.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    created.webContents.on('will-navigate', event => event.preventDefault());
    // Ao abrir, o jogo já vem com foco; clicar fora tira o foco e a placa some até clicar na festa de novo.
    created.once('ready-to-show', () => {
      if (settings.hidden || win !== created) return;
      created.setFocusable(true);
      created.show();
    });
    created.on('focus', () => { if (win === created) send({ foco: true }); });
    created.on('blur', () => {
      if (win !== created) return;
      send({ foco: false });
      if (!keepFocusable) created.setFocusable(false);
    });
    created.on('closed', () => { if (win === created) win = null; });
    created.loadFile(path.join(__dirname, '..', 'index.html'));
  }

  // Nunca recarregar a página da festa: no Windows, depois de um reload o Electron segue mandando o movimento do
  // mouse para a janela interna antiga do Chromium (setIgnoreMouseEvents com forward). A festa deixa de saber onde está
  // o cursor e os cliques no menu passam direto para o que está atrás. Por isso a troca é de janela: a velha fecha
  // (a página salva ao sair) e só então a nova abre e carrega o save.
  function replaceWindow() {
    if (!alive()) return;
    const old = win;
    replacing = true;
    keepFocusable = false;
    old.once('closed', () => {
      openWindow();
      replacing = false;
    });
    old.close();
  }

  function createWindow() {
    migrateOldData();
    settingsPath = path.join(app.getPath('userData'), 'window-settings.json');
    savePath = path.join(app.getPath('userData'), 'save.json');
    let loaded = null;
    try { loaded = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') console.warn('Preferências da janela ignoradas:', error); }
    settings = normalizeSettings(loaded);
    I18N.setLanguage(languageInfo().id);
    openWindow();

    tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'tray.png')));
    tray.setToolTip(t('app.title'));
    tray.on('click', openPanel);
    updateTray();
    screen.on('display-removed', () => { place(); updateTray(); });
    screen.on('display-added', updateTray);
    screen.on('display-metrics-changed', place);
  }

  app.whenReady().then(() => {
    app.setAppUserModelId('com.gabriel.mandioca');
    // Com App ID de verdade e "required", sem a Steam aberta o jogo avisa e fecha.
    if (!steam.init() && steamOnly) {
      I18N.setLanguage(I18N.resolve({ system: app.getLocale() }));
      dialog.showErrorBox(t('steam.requiredTitle'), t('steam.required'));
      app.quit();
      return;
    }
    ipcMain.on('game:load', event => {
      const state = isOwnWindow(event) ? loadSave(savePath) : null;
      event.returnValue = state;
      syncSteam(state);
    });
    ipcMain.on('game:save', (event, state) => {
      let saved = false;
      if (isOwnWindow(event)) {
        try { saved = writeSave(savePath, state); }
        catch (error) { console.error('Save não pôde ser gravado:', error); }
      }
      // A página espera a resposta: a Steam só é avisada depois.
      event.returnValue = saved;
      if (saved) syncSteam(state);
    });
    // O que a página precisa antes de desenhar qualquer coisa: o idioma e se a Steam está ligada.
    ipcMain.on('desktop:info', event => {
      if (!isOwnWindow(event)) { event.returnValue = null; return; }
      event.returnValue = { language: languageInfo(), steam: steam.info(), reopen: reopenPanel };
      reopenPanel = null;
    });
    // Trocado pelos Ajustes: a festa nova volta com os Ajustes abertos.
    ipcMain.on('desktop:set-language', (event, choice) => {
      if (isOwnWindow(event) && typeof choice === 'string') setLanguage(choice, 'ajustes');
    });
    ipcMain.handle('desktop:get-settings', event => isOwnWindow(event) ? publicSettings(settings) : null);
    ipcMain.handle('desktop:update-settings', (event, partial) => {
      if (!isOwnWindow(event) || !partial || typeof partial !== 'object') return null;
      return change(partial);
    });
    ipcMain.on('desktop:set-interactive', (event, interactive) => {
      if (isOwnWindow(event) && typeof interactive === 'boolean') {
        win.setIgnoreMouseEvents(!interactive, { forward: true });
      }
    });
    ipcMain.on('desktop:set-focusable', (event, focusable) => {
      if (!isOwnWindow(event) || typeof focusable !== 'boolean') return;
      keepFocusable = focusable;
      if (focusable) {
        win.setFocusable(true);
        win.setSkipTaskbar(true);
        win.focus();
      } else if (!win.isFocused()) win.setFocusable(false);
    });
    // Clique na festa: o jogo pega o foco (e passa a saber quando o jogador clicou fora dele).
    ipcMain.on('desktop:focus-game', event => {
      if (!isOwnWindow(event) || win.isFocused()) return;
      win.setFocusable(true);
      win.setSkipTaskbar(true);
      win.focus();
    });
    ipcMain.on('desktop:quit', event => { if (isOwnWindow(event)) app.quit(); });
    createWindow();
  });

  app.on('second-instance', openPanel);
  app.on('before-quit', () => { if (settings) writeSettings(); });
  app.on('window-all-closed', () => { if (!replacing) app.quit(); });
}
