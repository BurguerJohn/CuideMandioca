// Renderiza os sons de verdade do jogo (src/som.js, sintetizados com a Web Audio) para WAV, com um OfflineAudioContext do Electron.
// O gravador de gameplay desliga o som do jogo; este script dá ao vídeo o mesmo som que o jogo faz (fanfarra de evento raro, trovão,
// sirene, canhão...). Cada som é renderizado sozinho, com `gap` zerado, em assets/audio/jogo-<nome>.wav (44,1 kHz, estéreo).
// Uso (da pasta do jogo): node_modules/.bin/electron trailer/audio/renderizar-som-jogo.js [nome ...]
const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

const JOGO = path.resolve(__dirname, '..', '..');
const SAIDA = path.resolve(__dirname, '..', 'assets', 'audio');
// Os sons usados nos vídeos e a duração (s) que cada um precisa para o rabo acabar.
const SONS = {
  'evento-raro': 3.2, evento: 2.6, trovao: 2.6, sirene: 2.4, lenha: 0.6, acerto: 0.8, chama: 1.2, quebra: 0.7, canhao: 1.2, carinho: 0.6, murchar: 1.1,
  'palco-zabumba': 0.5, 'palco-triangulo': 0.8, brilho: 1.0, clique: 0.2, assobio: 1.2, estalo: 0.4, rugido: 1.6, bolha: 0.6, tombo: 0.6, martelo: 0.5,
  aviso: 0.8, uivo: 1.6, galope: 1.2, pato: 0.5, zumbido: 0.8
};

app.on('window-all-closed', () => {});
app.whenReady().then(async () => {
  const pedidos = process.argv.slice(2).filter(arg => !arg.startsWith('-') && !arg.endsWith('.js'));
  const nomes = pedidos.length ? pedidos : Object.keys(SONS);
  const win = new BrowserWindow({ show: false, webPreferences: { backgroundThrottling: false } });
  await win.loadURL('data:text/html,<meta charset=utf-8><body></body>');
  await win.webContents.executeJavaScript(fs.readFileSync(path.join(JOGO, 'src', 'som.js'), 'utf8'));
  fs.mkdirSync(SAIDA, { recursive: true });
  for (const nome of nomes) {
    const segundos = SONS[nome] || 1.5;
    const dados = await win.webContents.executeJavaScript(`(async () => {
      const taxa = 44100;
      let contexto = null;
      class Fora extends OfflineAudioContext {
        constructor() { super(2, Math.ceil(${segundos} * taxa), taxa); contexto = this; }
        get state() { return 'running'; }
        resume() { return Promise.resolve(); }
      }
      const som = ArraiaSom.create({ AudioContext: Fora, enabled: true, volume: 1 });
      const tocou = som.play(${JSON.stringify(nome)});
      if (!tocou) return null;
      const buffer = await contexto.startRendering();
      return [Array.from(buffer.getChannelData(0)), Array.from(buffer.getChannelData(1))];
    })()`);
    if (!dados) { console.log(`${nome}: o jogo não tem esse som`); continue; }
    const [esq, dir] = dados;
    let pico = 0;
    for (let i = 0; i < esq.length; i++) pico = Math.max(pico, Math.abs(esq[i]), Math.abs(dir[i]));
    const ganho = pico > 0 ? 0.8 / pico : 1;
    const n = esq.length;
    const buffer = Buffer.alloc(44 + n * 4);
    buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + n * 4, 4); buffer.write('WAVE', 8);
    buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(2, 22);
    buffer.writeUInt32LE(44100, 24); buffer.writeUInt32LE(44100 * 4, 28); buffer.writeUInt16LE(4, 32); buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36); buffer.writeUInt32LE(n * 4, 40);
    for (let i = 0; i < n; i++) {
      buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, esq[i] * ganho)) * 32767), 44 + i * 4);
      buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, dir[i] * ganho)) * 32767), 46 + i * 4);
    }
    fs.writeFileSync(path.join(SAIDA, `jogo-${nome}.wav`), buffer);
    console.log(`jogo-${nome}.wav  ${segundos.toFixed(1)} s (pico ${pico.toFixed(2)})`);
  }
  app.quit();
});
