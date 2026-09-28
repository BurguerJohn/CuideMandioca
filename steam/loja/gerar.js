// Gera as imagens da página da Steam a partir de arte.html (e das fotos de trailer/captura/fotografar.js), no
// tamanho exato que o Steamworks pede, para cada idioma. Saída: steam/loja/<idioma>/*.png e steam/loja/comum/*.
// Uso (da pasta do jogo): node_modules/.bin/electron steam/loja/gerar.js
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { app, BrowserWindow } = require('electron');

const LOJA = __dirname;
// Tamanhos das regras de assets da Steam (partner.steamgames.com/doc/store/assets e .../libraryassets).
const POR_IDIOMA = [
  ['header', 'header_capsule', 920, 430],
  ['small', 'small_capsule', 462, 174],
  ['main', 'main_capsule', 1232, 706],
  ['vertical', 'vertical_capsule', 748, 896],
  ['capsula', 'library_capsule', 600, 900],
  ['header', 'library_header', 920, 430],
  ['logo', 'library_logo', 1280, 720]
];
const COMUNS = [
  ['hero', 'library_hero', 3840, 1240],
  ['fundo', 'page_background', 1438, 810],
  ['icone', 'community_icon', 184, 184]
];
const IDIOMAS = ['pt-BR', 'en', 'es'];

app.setPath('userData', path.join(os.tmpdir(), 'mandioca-loja'));
const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));

async function foto(tipo, idioma, W, H, saida) {
  const win = new BrowserWindow({ show: false, width: 400, height: 300, frame: false, transparent: true,
    webPreferences: { backgroundThrottling: false, zoomFactor: 1 } });
  // Janela escondida não pinta (a captura esperaria para sempre): fica "visível" com opacidade 0.
  win.setOpacity(0);
  win.setIgnoreMouseEvents(true);
  win.setSkipTaskbar(true);
  win.showInactive();
  const wc = win.webContents;
  await win.loadFile(path.join(LOJA, 'arte.html'), { query: { tipo, idioma } });
  const cdp = wc.debugger;
  cdp.attach('1.3');
  await cdp.sendCommand('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await cdp.sendCommand('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  // Recarrega já com a medida certa (a página mede innerWidth/innerHeight ao montar).
  const carregou = new Promise(resolve => wc.once('did-finish-load', resolve));
  wc.reload();
  await carregou;
  for (let i = 0; i < 100 && !(await wc.executeJavaScript('!!window.__pronto')); i++) await esperar(100);
  await esperar(200);
  const shot = await cdp.sendCommand('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.mkdirSync(path.dirname(saida), { recursive: true });
  fs.writeFileSync(saida, Buffer.from(shot.data, 'base64'));
  cdp.detach();
  win.destroy();
  console.log(`  ${path.relative(LOJA, saida)} (${W}x${H})`);
}

app.on('window-all-closed', () => {});
app.whenReady().then(async () => {
  try {
    for (const idioma of IDIOMAS) {
      for (const [tipo, nome, W, H] of POR_IDIOMA) await foto(tipo, idioma, W, H, path.join(LOJA, idioma, `${nome}.png`));
    }
    for (const [tipo, nome, W, H] of COMUNS) await foto(tipo, 'en', W, H, path.join(LOJA, 'comum', `${nome}.png`));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
  app.quit();
});
