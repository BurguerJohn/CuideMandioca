// Grava cenas de gameplay do jogo em MP4 (1080x1920 ou outra medida da cena, 30 fps), quadro a quadro, com relógio
// virtual: cada quadro avança exatamente 1/30 s de jogo, então o vídeo sai liso e igual toda vez.
// A tela é emulada pelo protocolo do Chrome (o Windows não deixa janela maior que o monitor): a página enxerga
// largura/zoom × altura/zoom com densidade `zoom`, e cada quadro é capturado já no tamanho final.
// Uso (da pasta do jogo): node_modules/.bin/electron trailer/captura/gravar.js [--idioma=en|es] <cena> [<cena> ...]
// As cenas estão em cenas.js; os saves em saves/ (gerados por preparar-saves.js).
// Sem --idioma, o jogo grava em português em assets/gameplay; com ele, em assets/gameplay-<idioma>.
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { app, BrowserWindow } = require('electron');

const IDIOMA = (process.argv.find(arg => arg.startsWith('--idioma=')) || '').slice('--idioma='.length) || 'pt-BR';
// --quadro=2,5.5: em vez do vídeo, só as fotos desses segundos (para acertar o enquadramento de uma cena nova).
const QUADROS = ((process.argv.find(arg => arg.startsWith('--quadro=')) || '').slice('--quadro='.length) || '')
  .split(',').filter(Boolean).map(Number);
// --medir (com --quadro): junto com a foto, imprime onde ficam a Mandioca, o palco, a fogueira, as barracas e a janela
// das Argolas, em pixels do vídeo final (para mirar a câmera da montagem sem chutar coordenada).
const MEDIR = process.argv.includes('--medir');
const MEDIR_JS = `(() => {
  const escala = __LARGURA__ / innerWidth;
  const caixas = {};
  for (const { id, box } of window.__jogo.ui.festa.areas()) caixas[id] = box;
  const janela = document.querySelector('#argolas:not([hidden])')?.getBoundingClientRect();
  if (janela) caixas.janela = [janela.left, janela.top, janela.right, janela.bottom];
  const tela = document.querySelector('#festa-canvas').getBoundingClientRect();
  caixas.festa = [tela.left, tela.top, tela.right, tela.bottom];
  const saida = {};
  for (const [nome, c] of Object.entries(caixas)) saida[nome] = c.map(v => Math.round(v * escala));
  return JSON.stringify(saida);
})()`;
process.env.IDIOMA = IDIOMA;
const CENAS = require('./cenas.js');

const JOGO = path.resolve(__dirname, '..', '..');
const SAIDA = path.resolve(__dirname, '..', 'assets', IDIOMA === 'pt-BR' ? 'gameplay' : `gameplay-${IDIOMA}`);
const FPS = 30;
const PASSO = 1000 / FPS;

// Perfil próprio: o Chromium guarda zoom por site e isso não pode vazar entre gravações.
app.setPath('userData', path.join(os.tmpdir(), 'mandioca-gravador'));

const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));

async function gravar(nome) {
  const cena = CENAS[nome];
  if (!cena) throw new Error(`Cena desconhecida: ${nome}. Cenas: ${Object.keys(CENAS).join(', ')}`);
  const W = cena.largura || 1080;
  const H = cena.altura || 1920;
  const densidade = cena.zoom || 2;
  const arquivo = path.join(os.tmpdir(), `mandioca-cena-${nome}.json`);
  fs.writeFileSync(arquivo, JSON.stringify({ ...cena, idioma: IDIOMA }));
  const win = new BrowserWindow({
    show: false, width: 400, height: 300, frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), contextIsolation: false, sandbox: false, zoomFactor: 1,
      backgroundThrottling: false, additionalArguments: [`--cena=${arquivo}`]
    }
  });
  win.setOpacity(0);
  win.setIgnoreMouseEvents(true);
  win.setSkipTaskbar(true);
  win.showInactive();
  const wc = win.webContents;
  wc.on('console-message', event => {
    if (event.level === 'error' || event.level === 3) console.log(`  [${nome}] erro na página: ${event.message}`);
  });
  await win.loadFile(path.join(JOGO, 'index.html'));
  wc.setZoomFactor(1);
  const cdp = wc.debugger;
  cdp.attach('1.3');
  await cdp.sendCommand('Emulation.setDeviceMetricsOverride',
    { width: W / densidade, height: H / densidade, deviceScaleFactor: densidade, mobile: false });
  await esperar(900);
  const js = code => wc.executeJavaScript(`(() => { ${code}; return true; })()`);
  await js('__passo(0)');
  if (cena.preparar) await js(cena.preparar);
  for (let i = 0; i < Math.round((cena.aquecer ?? 1) * FPS); i++) await js(`__passo(${PASSO})`);

  fs.mkdirSync(SAIDA, { recursive: true });
  if (QUADROS.length) return fotografarQuadros(nome, cena, js, cdp, win, wc);
  const saida = path.join(SAIDA, `${nome}.mp4`);
  const ffmpeg = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'png', '-r', String(FPS), '-i', '-',
    // Um keyframe por segundo: o HyperFrames busca quadros exatos na montagem e recusa vídeo com keyframes esparsos.
    '-vf', `scale=${W}:${H}:flags=neighbor`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p',
    '-g', String(FPS), '-keyint_min', String(FPS), '-movflags', '+faststart', saida], { stdio: ['pipe', 'inherit', 'inherit'] });
  const terminou = new Promise((resolve, reject) =>
    ffmpeg.on('exit', code => (code === 0 ? resolve() : reject(new Error(`ffmpeg saiu com ${code}`)))));

  const acoes = [...(cena.acoes || [])].sort((a, b) => a[0] - b[0]);
  const total = Math.round(cena.segundos * FPS);
  for (let f = 0; f < total; f++) {
    const t = f / FPS;
    while (acoes.length && acoes[0][0] <= t + 1e-6) await js(acoes.shift()[1]);
    if (cena.cadaQuadro) await js(cena.cadaQuadro);
    await js(`__passo(${PASSO})`);
    const shot = await cdp.sendCommand('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
    if (!ffmpeg.stdin.write(Buffer.from(shot.data, 'base64'))) await new Promise(resolve => ffmpeg.stdin.once('drain', resolve));
    if (f % 30 === 0) process.stdout.write(`  ${nome}: ${Math.round((f / total) * 100)}%   \r`);
  }
  ffmpeg.stdin.end();
  await terminou;
  cdp.detach();
  win.destroy();
  console.log(`  ${nome}: ${cena.segundos}s ${W}x${H} → ${path.relative(JOGO, saida)}`);
}

// Prévia: roda o roteiro igual à gravação, mas só fotografa os segundos pedidos (em assets/.../previa/).
async function fotografarQuadros(nome, cena, js, cdp, win, wc) {
  const pasta = path.join(SAIDA, 'previa');
  fs.mkdirSync(pasta, { recursive: true });
  const acoes = [...(cena.acoes || [])].sort((a, b) => a[0] - b[0]);
  const pedidos = QUADROS.map(t => Math.round(t * FPS));
  for (let f = 0; f <= Math.max(...pedidos); f++) {
    const t = f / FPS;
    while (acoes.length && acoes[0][0] <= t + 1e-6) await js(acoes.shift()[1]);
    if (cena.cadaQuadro) await js(cena.cadaQuadro);
    await js(`__passo(${PASSO})`);
    if (!pedidos.includes(f)) continue;
    const shot = await cdp.sendCommand('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
    const arquivo = path.join(pasta, `${nome}-${t.toFixed(1)}s.png`);
    fs.writeFileSync(arquivo, Buffer.from(shot.data, 'base64'));
    console.log(`  ${path.relative(JOGO, arquivo)}`);
    if (MEDIR) console.log(`  medidas ${nome} ${t.toFixed(1)}s (px de 1920x1080): ${await wc.executeJavaScript(MEDIR_JS.replace('__LARGURA__', '1920'))}`);
  }
  cdp.detach();
  win.destroy();
}

app.on('window-all-closed', () => {});
app.whenReady().then(async () => {
  const nomes = process.argv.slice(2).filter(arg => !arg.startsWith('-') && !arg.endsWith('.js'));
  try {
    for (const nome of nomes.length ? nomes : Object.keys(CENAS)) await gravar(nome);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
  app.quit();
});
