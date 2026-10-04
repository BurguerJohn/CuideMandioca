'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, dialog, powerMonitor } = require('electron');
const { normalizeSettings, mergeSettings, publicSettings, pickDisplay } = require('./window-state');
const { loadSave, writeSave } = require('./save-store');
const { createSteam } = require('./steam');
const { createCloudSave } = require('./cloud-save');
const I18N = require('../src/i18n.js');
const GAME_DATA = require('../src/data.js');
const { GameEngine } = require('../src/core.js');

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
  let settingsRevision = 0;
  let settingsPath;
  let savePath;
  // Sobrevive às substituições de janela; só uma gravação bem-sucedida torna o snapshot durável.
  let sessionSave = null;
  let sessionSaved = false;
  let windowLoaded = false;
  let showingInactive = null;
  const pendingTrayCommands = [];
  let showRequested = false;
  let writeTimer;
  // Troca de idioma: a janela velha fecha (e salva) antes da nova abrir; sem isso o app fecharia junto.
  let replacing = false;
  // Desmarcar Esconder durante o fechamento cancela a minimização que a substituta herdaria.
  let replacementMinimized = false;
  let quitting = false;
  // Janela que a festa nova reabre depois de trocar o idioma pelos Ajustes (vai uma vez, junto com o idioma).
  let reopenPanel = null;
  let reopenConsumedBy = null;
  // A janela está deixando o clique vazar (setIgnoreMouseEvents)? O vigia do cursor conta isso para a festa.
  let ignoring = true;
  let cursorKey = '';
  // Numera os cliques que pedem foco para a página descartar avisos anteriores ao gesto atual.
  let focusRequest = 0;
  // Repouso: o relógio que espera a tela voltar antes de trocar a janela.
  let wakeTimer = null;
  // Quanto esperar depois de acordar/desbloquear antes de trocar a janela: o monitor e a área útil voltam primeiro.
  const WAKE_DELAY = 1500;

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
    reopenConsumedBy = null;
    replaceWindow();
  }

  // Conquistas e presença na Steam acompanham o save.
  function validSave(state) {
    // Reutiliza o loader do jogo sem contabilizar tempo fora nem alterar o save original.
    const stamp = Number.isFinite(state.lastSeen) ? state.lastSeen : Date.now();
    new GameEngine(GAME_DATA, state, { now: () => stamp, rng: () => 0.5 });
    return true;
  }

  // Save na nuvem da Steam: o da nuvem e o daqui são comparados ao abrir (vale o mais recente; se o mais recente tem menos progresso, a pessoa escolhe),
  // e cada gravação segue para a nuvem. Quem perde fica guardado como cópia.
  const progressOf = state => (state.year || 1) * 1e9 + (state.records?.size || state.size || 1);
  function askCloudSave({ local, cloud }) {
    const describe = state => ({ year: state.year || 1, guests: state.records?.size || state.size || 1,
      when: new Date(Number.isFinite(state.lastSeen) ? state.lastSeen : 0).toLocaleString(languageInfo().id) });
    const c = describe(cloud);
    const l = describe(local);
    const keepCloud = progressOf(cloud) >= progressOf(local);
    const answer = dialog.showMessageBoxSync({ type: 'question', title: t('cloud.conflictTitle'), noLink: true,
      message: t('cloud.conflict', { cloudYear: c.year, cloudGuests: c.guests, cloudWhen: c.when, localYear: l.year, localGuests: l.guests, localWhen: l.when }),
      buttons: [t('cloud.useCloud'), t('cloud.useLocal')], defaultId: keepCloud ? 0 : 1, cancelId: keepCloud ? 0 : 1 });
    return answer === 0 ? 'cloud' : 'local';
  }
  const cloud = createCloudSave({ steam, validate: validSave, ask: askCloudSave,
    adoptLocal(state, displaced) {
      // O save daqui que a nuvem substituiu fica guardado ao lado.
      if (displaced) {
        try { fs.writeFileSync(`${savePath}.conflito`, JSON.stringify(displaced), 'utf8'); }
        catch (error) { console.warn('Cópia do save deste computador não gravada:', error.message); }
      }
      writeSave(savePath, state, validSave);
    } });

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
      if (fs.existsSync(path.join(target, 'save.json')) || fs.existsSync(path.join(target, 'save.json.bak')) ||
        !fs.existsSync(path.join(old, 'save.json'))) return;
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

  function showInactive(created = win) {
    const previous = showingInactive;
    showingInactive = created;
    try { created.showInactive(); }
    finally { showingInactive = previous; }
  }

  function applyWindow({ show = false } = {}) {
    if (!alive()) return;
    win.setAlwaysOnTop(settings.pinned, 'floating');
    if (settings.hidden) win.hide();
    else if (!win.isVisible() && (show || !win.isMinimized())) showInactive();
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
    if (partial.hidden === true) showRequested = false;
    if (replacing && partial.hidden === false) replacementMinimized = false;
    settingsRevision++;
    if (settings.display !== before) place();
    if (settings.startup !== startup) applyStartup();
    applyWindow({ show: partial.hidden === false });
    // beforeunload ainda pode concluir um arrasto depois de before-quit; o processo não espera os 300 ms.
    if (quitting) writeSettings();
    else persistSoon();
    return settingsSnapshot();
  }

  function settingsSnapshot() { return { ...publicSettings(settings), revision: settingsRevision }; }

  function changeAndTell(partial) {
    send({ settings: change(partial) });
  }

  function flushTrayCommands() {
    if ((!showRequested && !pendingTrayCommands.length) || !alive() || !windowLoaded || replacing || quitting) return;
    const commands = pendingTrayCommands.splice(0);
    const shouldShow = showRequested;
    showRequested = false;
    if (shouldShow) showGame();
    commands.forEach(send);
  }

  // O menu já existe durante a carga e a troca de janela, antes de a página receber comandos IPC.
  function openFromTray(...commands) {
    if (quitting) return;
    showRequested = true;
    pendingTrayCommands.push(...commands);
    flushTrayCommands();
  }

  function openPanel() { openFromTray('painel'); }

  // Clicar no ícone da bandeja ou abrir o jogo de novo (atalho, Steam): a festa aparece na frente, com foco, sem
  // abrir janela nenhuma.
  function showGame() {
    if (quitting) return;
    // O atalho pode abrir uma segunda instância antes de app.whenReady carregar as preferências.
    if (!settings) { showRequested = true; return; }
    // O clique na bandeja/atalho durante uma troca deve trazer a substituta, não a janela que está fechando.
    if (replacing) { showRequested = true; return; }
    if (settings.hidden) changeAndTell({ hidden: false });
    if (!alive()) return;
    if (win.isMinimized()) win.restore();
    if (!win.isVisible()) win.show();
    win.moveTop();
    win.focus();
  }

  // Vigia do cursor: com o clique vazando, o Electron só conta à festa onde o mouse está por um gancho do Windows,
  // que pode parar de funcionar (e a festa não saberia mais quando o cursor passa por cima dela: não dá para
  // clicar). A cada 120 ms, se o cursor ou o foco mudou, a festa recebe a posição e o estado real da janela.
  function sendCursor() {
    if (!alive() || !windowLoaded || !win.isVisible() || win.isMinimized()) { cursorKey = ''; return; }
    const point = screen.getCursorScreenPoint();
    const bounds = win.getContentBounds();
    const x = point.x - bounds.x;
    const y = point.y - bounds.y;
    if (x < 0 || y < 0 || x >= bounds.width || y >= bounds.height) { cursorKey = ''; return; }
    // Cursor e bounds chegam em DIP; clientX/clientY e elementFromPoint usam CSS pixels.
    // Ctrl +/- muda o zoom do Chromium independentemente do tamanho escolhido para a festa.
    const zoom = win.webContents.getZoomFactor();
    const focused = win.isFocused();
    const key = `${x},${y},${zoom},${ignoring},${focused},${focusRequest}`;
    if (key === cursorKey) return;
    cursorKey = key;
    send({ cursor: { x: x / zoom, y: y / zoom, interactive: !ignoring, focused, focusRequest } });
  }

  function watchCursor() {
    setInterval(sendCursor, 120);
  }


  // A página caiu ou travou de vez: abre uma festa nova com o último snapshot válido enviado pela sessão.
  function recoverWindow() {
    if (!alive() || replacing || quitting) return;
    const old = win;
    replacementMinimized = old.isMinimized();
    replacing = true;
    old.once('closed', () => {
      if (!quitting) openWindow({ quiet: true, minimized: replacementMinimized });
      replacing = false;
      replacementMinimized = false;
      flushTrayCommands();
    });
    old.destroy();
  }

  // Depois do repouso (ou de bloquear e desbloquear a tela), o Windows pode desmontar o que faz a janela transparente
  // aceitar o clique: o gancho que repassa o mouse e a própria camada da janela. A festa continua na tela, mas todo
  // clique vaza para o que está atrás. Ao acordar e de novo ao desbloquear a tela (o que o Windows fizer), a festa ganha
  // uma janela nova, como na troca de idioma: a velha salva ao fechar e a nova carrega o save. Não depende do aviso de
  // bloqueio: se ele se perdesse, a festa nunca mais trocaria de janela. Dois avisos juntos viram uma troca só.
  function wakeUp() {
    if (quitting) return;
    clearTimeout(wakeTimer);
    wakeTimer = setTimeout(() => {
      if (!alive() || replacing || quitting) return;
      logLine('o computador acordou: janela nova para a festa');
      place();
      replaceWindow({ quiet: true });
    }, WAKE_DELAY);
  }

  function watchPower() {
    if (!powerMonitor) return;
    // Antes de dormir, a festa salva (se a bateria acabar no repouso, não se perde nada).
    powerMonitor.on('suspend', () => send('salvar'));
    powerMonitor.on('unlock-screen', wakeUp);
    powerMonitor.on('resume', wakeUp);
  }

  function buildMenu() {
    const displays = screen.getAllDisplays();
    const shown = currentDisplay();
    const language = languageInfo();
    const autoName = I18N.LANGUAGES.find(entry => entry.id === language.auto)?.name || 'English';
    return Menu.buildFromTemplate([
      { label: t('tray.panel'), click: openPanel },
      { label: t('tray.shop'), click: () => openFromTray('painel', 'vitrine') },
      { label: t('rings.title'), click: () => openFromTray('argolas') },
      { label: t('tray.photo'), click: () => openFromTray('foto') },
      { label: t('tray.portrait'), click: () => openFromTray('retrato') },
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
      { label: t('settings.calmOn'), type: 'checkbox', checked: settings.calm === true,
        click: item => changeAndTell({ calm: item.checked }) },
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
  // `quiet`: janela trocada sozinha (ao acordar, autocura) abre sem pegar o foco de quem está usando outro programa.
  function openWindow({ quiet = false, minimized = false } = {}) {
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
      // A janela continua focável: alternar setFocusable no Windows pode interromper os eventos de mouse.
      // Fora da festa os cliques passam pelo setIgnoreMouseEvents, sem alterar os estilos nativos de foco.
      focusable: true,
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
    windowLoaded = false;
    ignoring = true;
    cursorKey = '';
    focusRequest = 0;
    created.setIgnoreMouseEvents(true, { forward: true });
    created.setAlwaysOnTop(settings.pinned, 'floating');
    created.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    created.webContents.on('will-navigate', event => event.preventDefault());
    // O menu padrão do Electron registra Ctrl+R e Ctrl+Shift+R mesmo sem moldura.
    // Recarregar no mesmo HWND quebra o repasse do mouse; a recuperação e o idioma já trocam a janela inteira.
    created.webContents.on('before-input-event', (event, input) => {
      if (input.control && !input.alt && !input.meta && input.key.toLowerCase() === 'r') event.preventDefault();
    });
    // A página começa achando que tem foco. A janela pode perdê-lo durante a carga, inclusive ao abrir normalmente:
    // depois que os scripts rodaram (antes disso o aviso se perderia), ela recebe o estado real.
    created.webContents.on('did-finish-load', () => {
      if (win !== created) return;
      windowLoaded = true;
      if (reopenConsumedBy === created) { reopenPanel = null; reopenConsumedBy = null; }
      if (!created.isFocused()) send({ foco: false, focusRequest });
      flushTrayCommands();
    });
    // Ao abrir, o jogo já vem com foco; clicar fora tira o foco e a placa some até clicar na festa de novo.
    created.once('ready-to-show', () => {
      if (settings.hidden || win !== created || created.isMinimized()) return;
      if (quiet) { showInactive(created); return; }
      created.show();
    });
    created.on('focus', () => {
      if (win !== created) return;
      cursorKey = '';
      send({ foco: true, focusRequest });
    });
    created.on('blur', () => {
      if (win !== created) return;
      cursorKey = '';
      send({ foco: false, focusRequest });
    });
    // Botão na barra de tarefas: minimizar esconde a festa; restaurar traz de volta já com foco.
    created.on('restore', () => {
      // No Windows, showInactive restaura a janela minimizada e emite restore durante a própria chamada.
      // Mostrar sem ativar preserva o foco de outro aplicativo; restaurar pela barra de tarefas ainda pede foco.
      if (win !== created || showingInactive === created) return;
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
    if (minimized && !settings.hidden) created.minimize();
    created.loadFile(path.join(__dirname, '..', 'index.html'));
  }

  // Nunca recarregar a página da festa: no Windows, depois de um reload o Electron segue mandando o movimento do
  // mouse para a janela interna antiga do Chromium (setIgnoreMouseEvents com forward). A festa deixa de saber onde está
  // o cursor e os cliques no menu passam direto para o que está atrás. Por isso a troca é de janela: a velha fecha
  // (a página salva ao sair) e só então a nova abre e carrega o save.
  function replaceWindow(options = {}) {
    if (!alive() || replacing || quitting) return;
    const old = win;
    replacementMinimized = !!options.quiet && old.isMinimized();
    replacing = true;
    old.once('closed', () => {
      if (!quitting) openWindow({ ...options, minimized: replacementMinimized });
      replacing = false;
      replacementMinimized = false;
      flushTrayCommands();
    });
    old.close();
    // Página travada não fecha (e a festa nova nunca abriria): depois de 5 s, fecha à força (vale o último save dela).
    setTimeout(() => { if (!old.isDestroyed()) old.destroy(); }, 5000);
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
    // O monitor voltou (acordando, o Windows às vezes some com ele e traz de novo): a festa volta para a área útil dele.
    screen.on('display-added', () => { place(); updateTray(); });
    screen.on('display-metrics-changed', () => { place(); updateTray(); });
  }

  app.whenReady().then(() => {
    if (quitting) return;
    app.setAppUserModelId('com.gabriel.mandioca');
    // Com App ID de verdade e "required", sem a Steam aberta o jogo avisa e fecha.
    if (!steam.init() && steamOnly) {
      I18N.setLanguage(I18N.resolve({ system: app.getLocale() }));
      dialog.showErrorBox(t('steam.requiredTitle'), t('steam.required'));
      app.quit();
      return;
    }
    ipcMain.on('game:load', event => {
      if (!isOwnWindow(event)) { event.returnValue = null; return; }
      if (!sessionSave) {
        sessionSave = cloud.reconcile(loadSave(savePath, validSave));
        sessionSaved = !!sessionSave;
      }
      event.returnValue = sessionSave;
      if (sessionSaved) syncSteam(sessionSave);
    });
    ipcMain.on('game:save', (event, state) => {
      let saved = false;
      if (isOwnWindow(event)) {
        try {
          saved = writeSave(savePath, state, validSave, snapshot => {
            sessionSave = snapshot;
            sessionSaved = false;
          });
        }
        catch (error) { console.error('Save não pôde ser gravado:', error); }
      }
      if (saved) sessionSaved = true;
      // A página espera a resposta: a Steam só é avisada depois (o save segue para a nuvem; ao sair, o último vai na hora).
      if (saved) { cloud.push(sessionSave); if (quitting) cloud.flush(); }
      event.returnValue = saved;
      if (saved) syncSteam(sessionSave);
    });
    // O que a página precisa antes de desenhar qualquer coisa: o idioma e se a Steam está ligada.
    ipcMain.on('desktop:info', event => {
      if (!isOwnWindow(event)) { event.returnValue = null; return; }
      const reopen = reopenConsumedBy === win ? null : reopenPanel;
      event.returnValue = { language: languageInfo(), steam: { ...steam.info(), cloud: cloud.enabled() }, reopen };
      // O preload recebe o pedido antes dos scripts da festa. Se a carga cair, a substituta ainda precisa reabrir.
      if (reopen) {
        if (windowLoaded) { reopenPanel = null; reopenConsumedBy = null; }
        else reopenConsumedBy = win;
      }
    });
    // Trocado pelos Ajustes: a festa nova volta com os Ajustes abertos.
    ipcMain.on('desktop:set-language', (event, choice) => {
      if (isOwnWindow(event) && typeof choice === 'string') setLanguage(choice, 'ajustes');
    });
    ipcMain.handle('desktop:get-settings', event => isOwnWindow(event) ? settingsSnapshot() : null);
    ipcMain.handle('desktop:update-settings', (event, partial) => {
      if (!isOwnWindow(event) || !partial || typeof partial !== 'object') return null;
      return change(partial);
    });
    ipcMain.on('desktop:set-interactive', (event, interactive) => {
      if (isOwnWindow(event) && typeof interactive === 'boolean') {
        ignoring = !interactive;
        win.setIgnoreMouseEvents(!interactive, { forward: true });
        cursorKey = '';
      }
    });
    // A página percebeu que o mouse não chega mais nela (a janela quebrou depois do repouso): janela nova.
    // Com a festa em foco ou fixada sobre as janelas, o mouse deveria chegar. Solta e sem foco, outra janela pode
    // estar por cima dela (o mouse passa na área da festa sem chegar nela, e isso não é defeito).
    ipcMain.on('desktop:repair', event => {
      if (!isOwnWindow(event) || replacing || (!settings.pinned && !win.isFocused())) return;
      logLine('a festa parou de receber o mouse: janela nova');
      replaceWindow({ quiet: !win.isFocused() });
    });
    ipcMain.on('desktop:log-error', (event, text) => {
      if (isOwnWindow(event) && typeof text === 'string') logLine(text);
    });
    ipcMain.on('desktop:set-focusable', (event, focusable) => {
      if (!isOwnWindow(event) || typeof focusable !== 'boolean') return;
      // Painéis pedem foco para digitar; fechar um painel preserva a capacidade de receber o próximo clique.
      if (focusable) win.focus();
    });
    // Clique na festa: o jogo pega o foco (e passa a saber quando o jogador clicou fora dele).
    ipcMain.on('desktop:focus-game', (event, request) => {
      if (!isOwnWindow(event) || !Number.isSafeInteger(request) || request <= focusRequest) return;
      focusRequest = request;
      if (!win.isFocused()) win.focus();
      // Se já estava em foco, o pedido ainda precisa ser confirmado para não valer um blur atrasado.
      // Um foco pendente será confirmado pelo evento nativo ou pelo próximo aviso do cursor.
      if (win.isFocused()) send({ foco: true, focusRequest });
    });
    ipcMain.on('desktop:quit', event => { if (isOwnWindow(event)) app.quit(); });
    createWindow();
    watchCursor();
    watchPower();
  });

  app.on('second-instance', showGame);
  app.on('before-quit', () => {
    quitting = true;
    clearTimeout(wakeTimer);
    if (settings) writeSettings();
    cloud.flush();
  });
  // Depois que a página fechou (e salvou pela última vez), o que ainda não foi para a nuvem vai agora.
  app.on('will-quit', () => { cloud.flush(); });
  app.on('window-all-closed', () => { if (!replacing) app.quit(); });
}
