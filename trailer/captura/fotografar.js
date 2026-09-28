// Tira as fotos de fotos.js (screenshots da loja da Steam e a festa sem fundo para as capas), com o mesmo relógio
// virtual e o mesmo idioma do gravador. Saída: steam/loja/fotos/<idioma>/<nome>.png.
// Uso (da pasta do jogo): node_modules/.bin/electron trailer/captura/fotografar.js [--idioma=en|es] [nome ...]
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { app, BrowserWindow } = require('electron');

const IDIOMA = (process.argv.find(arg => arg.startsWith('--idioma=')) || '').slice('--idioma='.length) || 'pt-BR';
process.env.IDIOMA = IDIOMA;
const FOTOS = require('./fotos.js');

const JOGO = path.resolve(__dirname, '..', '..');
const SAIDA = path.join(JOGO, 'steam', 'loja', 'fotos', IDIOMA);
const FPS = 30;
const PASSO = 1000 / FPS;

app.setPath('userData', path.join(os.tmpdir(), 'mandioca-fotografo'));
const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fotografar(foto) {
  const W = foto.largura;
  const H = foto.altura;
  const densidade = foto.zoom || 1;
  const arquivo = path.join(os.tmpdir(), `mandioca-foto-${foto.nome}.json`);
  fs.writeFileSync(arquivo, JSON.stringify({ ...foto, idioma: IDIOMA }));
  const win = new BrowserWindow({
    show: false, width: 400, height: 300, frame: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: false, sandbox: false, zoomFactor: 1,
      backgroundThrottling: false, additionalArguments: [`--cena=${arquivo}`] }
  });
  win.setOpacity(0);
  win.setIgnoreMouseEvents(true);
  win.setSkipTaskbar(true);
  win.showInactive();
  const wc = win.webContents;
  wc.on('console-message', event => {
    if (event.level === 'error' || event.level === 3) console.log(`  [${foto.nome}] erro na página: ${event.message}`);
  });
  await win.loadFile(path.join(JOGO, 'index.html'));
  wc.setZoomFactor(1);
  const cdp = wc.debugger;
  cdp.attach('1.3');
  await cdp.sendCommand('Emulation.setDeviceMetricsOverride',
    { width: W / densidade, height: H / densidade, deviceScaleFactor: densidade, mobile: false });
  await esperar(900);
  const js = code => wc.executeJavaScript(`(() => { ${code}; return true; })()`);
  await js('__passo(0); document.querySelector(\'[data-action="fechar-janela"]\')?.click()');
  if (foto.preparar) await js(foto.preparar);
  for (let i = 0; i < Math.round((foto.aquecer ?? 1) * FPS); i++) await js(`__passo(${PASSO})`);
  const acoes = [...(foto.acoes || [])].sort((a, b) => a[0] - b[0]);
  const total = Math.round(foto.em * FPS);
  for (let f = 0; f < total; f++) {
    while (acoes.length && acoes[0][0] <= f / FPS + 1e-6) await js(acoes.shift()[1]);
    if (foto.cadaQuadro) await js(foto.cadaQuadro);
    await js(`__passo(${PASSO})`);
  }
  fs.mkdirSync(SAIDA, { recursive: true });
  const saida = path.join(SAIDA, `${foto.nome}.png`);
  if (foto.tipo === 'festa') {
    // Só o canvas da festa, com transparência, na escala inteira em que o jogo desenhou (medida em escala.txt).
    const dados = await wc.executeJavaScript(`(() => { const c = document.querySelector('#festa-canvas');
      return { url: c.toDataURL('image/png'), w: c.width, h: c.height, logico: __jogo.ui.festa.size().logicalWidth }; })()`);
    fs.writeFileSync(saida, Buffer.from(dados.url.split(',')[1], 'base64'));
    fs.writeFileSync(saida.replace(/\.png$/, '.json'), JSON.stringify({ w: dados.w, h: dados.h, logico: dados.logico }));
  } else {
    const shot = await cdp.sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(saida, Buffer.from(shot.data, 'base64'));
  }
  cdp.detach();
  win.destroy();
  console.log(`  ${foto.nome} → ${path.relative(JOGO, saida)}`);
}

app.on('window-all-closed', () => {});
app.whenReady().then(async () => {
  const nomes = process.argv.slice(2).filter(arg => !arg.startsWith('-') && !arg.endsWith('.js'));
  try {
    for (const foto of FOTOS) if (!nomes.length || nomes.includes(foto.nome)) await fotografar(foto);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
  app.quit();
});
