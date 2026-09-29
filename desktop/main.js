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
// Tamanhos prontos do menu da bandeja: os mesmos dos Ajustes, do menor ao maior que a alça de arrastar alcança.
const ZOOMS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3];
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
  // A janela está deixando o clique vazar (setIgnoreMouseEvents)? O vigia do cursor conta isso para a festa.
  let ignoring = true;
  let cursorKey = '';

  // Diário de erros (erros.log na pasta de dados do jogo): o que a página relatou e quando a festa caiu ou travou.
  function logLine(text) {
    try {
      const file = path.join(app.getPath('userData'), 'erros.log');
      try { if (fs.statSync(file).size > 256 * 1024) fs.renameSync(file, `${file}.old`); } catch (_) { /* ainda não existe */ }
      fs.appendFileSync(file, `[${new Date().toISOString()}] ${text}
`, 'utf8');
    } catch (error) {
      console.error('Não foi possível gravar erros.log:', error);
    }
  }

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

  // Abrir com o Windows: o jogo instalado se registra para abrir no login. Aberto assim, o exe pede para a Steam relançar
  // (restartIfNeeded), então ele sempre roda pela Steam. Em desenvolvimento (electron .) não registra nada.
  function applyStartup() {
    if (!app.isPackaged) return;
    try { app.setLoginItemSettings({ openAtLogin: settings.startup }); }
    catch (error) { console.warn('Não deu para mudar a abertura com o Windows:', error.message); }
  }

  function change(partial) {
    const before = settings.display;
    const startup = settings.startup;
    settings = mergeSettings(settings, partial);
    if (settings.display !== before) place();
    if (settings.startup !== startup) applyStartup();
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

  // Clicar no ícone da bandeja ou abrir o jogo de novo (atalho, Steam): a festa aparece na frente, com foco, sem
  // abrir janela nenhuma.
  function showGame() {
    if (settings.hidden) changeAndTell({ hidden: false });
    if (!alive()) return;
    if (win.isMinimized()) win.restore();
    if (!win.isVisible()) win.show();
    win.setFocusable(true);
    win.setSkipTaskbar(false);
    win.moveTop();
    win.focus();
  }

  // Vigia do cursor: com o clique vazando, o Electron só conta à festa onde o mouse está por um gancho do Windows,
  // que pode parar de funcionar (e a festa não saberia mais quando o cursor passa por cima dela: não dá para
  // clicar). A cada 120 ms, se o cursor mexeu, a festa recebe a posição e o estado real da janela.
  function sendCursor() {
    if (!alive() || !win.isVisible() || win.isMinimized()) return;
    const point = screen.getCursorScreenPoint();
    const bounds = win.getContentBounds();
    const x = point.x - bounds.x;
    const y = point.y - bounds.y;
    if (x < 0 || y < 0 || x >= bounds.width || y >= bounds.height) return;
    const key = `${x},${y},${ignoring}`;
    if (key === cursorKey) return;
    cursorKey = key;
    send({ cursor: { x, y, interactive: !ignoring } });
  }

  function watchCursor() {
    setInterval(sendCursor, 120);
  }


  // A página caiu ou travou de vez: abre uma festa nova no lugar (o save é o último que a página gravou).
  function recoverWindow() {
    if (!alive()) return;
    const old = win;
    replacing = true;
    keepFocusable = false;
    old.once('closed', () => {
      openWindow();
      replacing = false;
    });
    old.destroy();
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
      { label: t('tray.size'), submenu: ZOOMS.map(zoom => ({ label: `${Math.round(zoom * 100)}%`,
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
      { label: t('tray.music'), type: 'checkbox', checked: settings.music,
        click: item => changeAndTell({ music: item.checked }) },
      { label: t('settings.startup'), type: 'checkbox', checked: settings.startup,
        click: item => changeAndTell({ startup: item.checked }) },
      { label: t('tray.perf'), submenu: ['suave', 'normal', 'economia'].map(perf => ({ label: t(`settings.perf.${perf}`),
        type: 'radio', checked: settings.perf === perf, click: () => changeAndTell({ perf }) })) },
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
      minimizable: true,
      maximizable: false,
      fullscreenable: false,
      focusable: false,
      skipTaskbar: false,
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
    ignoring = true;
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
      // Sem foco, a janela não pode ser ativada por engano (o Windows passaria o foco para ela ao fechar outro
      // programa); setFocusable mexe no botão da barra de tarefas, então ele volta logo em seguida.
      if (!keepFocusable) {
        created.setFocusable(false);
        created.setSkipTaskbar(false);
      }
    });
    // Botão na barra de tarefas: minimizar esconde a festa; restaurar traz de volta já com foco.
    created.on('restore', () => {
      if (win !== created) return;
      created.setFocusable(true);
      created.setSkipTaskbar(false);
      created.focus();
    });
    created.on('closed', () => { if (win === created) win = null; });
    created.webContents.on('render-process-gone', (_event, details) => {
      logLine(`a página da festa caiu (${details.reason}, código ${details.exitCode})`);
      if (win === created && details.reason !== 'clean-exit') recoverWindow();
    });
    let hung = null;
    created.on('unresponsive', () => {
      logLine('a festa parou de responder');
      clearTimeout(hung);
      hung = setTimeout(() => {
        if (win !== created) return;
        logLine('a festa ficou 15 s sem responder: abrindo de novo');
        recoverWindow();
      }, 15000);
    });
    created.on('responsive', () => {
      clearTimeout(hung);
      logLine('a festa voltou a responder');
    });
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
    // Confere o registro a cada abertura: se a biblioteca da Steam mudou de lugar, o caminho do exe é atualizado.
    applyStartup();
    I18N.setLanguage(languageInfo().id);
    openWindow();

    tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'tray.png')));
    tray.setToolTip(t('app.title'));
    tray.on('click', showGame);
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
        ignoring = !interactive;
        win.setIgnoreMouseEvents(!interactive, { forward: true });
      }
    });
    ipcMain.on('desktop:log-error', (event, text) => {
      if (isOwnWindow(event) && typeof text === 'string') logLine(text);
    });
    ipcMain.on('desktop:set-focusable', (event, focusable) => {
      if (!isOwnWindow(event) || typeof focusable !== 'boolean') return;
      keepFocusable = focusable;
      if (focusable) {
        win.setFocusable(true);
        win.setSkipTaskbar(false);
        win.focus();
      } else if (!win.isFocused()) win.setFocusable(false);
    });
    // Clique na festa: o jogo pega o foco (e passa a saber quando o jogador clicou fora dele).
    ipcMain.on('desktop:focus-game', event => {
      if (!isOwnWindow(event) || win.isFocused()) return;
      win.setFocusable(true);
      win.setSkipTaskbar(false);
      win.focus();
    });
    ipcMain.on('desktop:quit', event => { if (isOwnWindow(event)) app.quit(); });
    createWindow();
    watchCursor();
  });

  app.on('second-instance', showGame);
  app.on('before-quit', () => { if (settings) writeSettings(); });
  app.on('window-all-closed', () => { if (!replacing) app.quit(); });
}
