// Sintetiza os efeitos dos vídeos (tudo original, gerado aqui, sem sample de ninguém): pop, ding, whoosh, tada e
// moeda, curtos, para marcar acontecimentos na tela. Os vídeos não têm trilha: o som em alta entra pelo TikTok.
// Uso: node trailer/audio/gerar-audio.js   (saída em trailer/assets/audio/)
const fs = require('node:fs');
const path = require('node:path');

const SR = 44100;
const SAIDA = path.resolve(__dirname, '..', 'assets', 'audio');

let semente = 12345;
const aleatorio = () => ((semente = (semente * 16807) % 2147483647) / 2147483647) * 2 - 1;

function wav(nome, canais) {
  const [esq, dir] = canais;
  const n = esq.length;
  let pico = 0;
  for (let i = 0; i < n; i++) pico = Math.max(pico, Math.abs(esq[i]), Math.abs(dir[i]));
  const ganho = pico > 0 ? 0.7 / pico : 1;
  const buffer = Buffer.alloc(44 + n * 4);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + n * 4, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(2, 22);
  buffer.writeUInt32LE(SR, 24); buffer.writeUInt32LE(SR * 4, 28); buffer.writeUInt16LE(4, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, esq[i] * ganho)) * 32767), 44 + i * 4);
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, dir[i] * ganho)) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(path.join(SAIDA, `${nome}.wav`), buffer);
  console.log(`${nome}.wav  ${(n / SR).toFixed(2)} s`);
}

function pista(segundos) {
  const n = Math.round(segundos * SR);
  return [new Float32Array(n), new Float32Array(n)];
}

// Soma um som (função do tempo local em segundos) na pista, a partir de `inicio`, com pan -1..1.
function tocar(pistas, inicio, duracao, som, volume = 1, pan = 0) {
  const [esq, dir] = pistas;
  const a = Math.round(inicio * SR);
  const g = [volume * Math.sqrt((1 - pan) / 2), volume * Math.sqrt((1 + pan) / 2)];
  for (let i = 0; i < duracao * SR && a + i < esq.length; i++) {
    const v = som(i / SR);
    esq[a + i] += v * g[0];
    dir[a + i] += v * g[1];
  }
}

const nota = semitom => 440 * 2 ** ((semitom - 9) / 12); // 0 = dó central

function efeito(nome, segundos, som) {
  const pistas = pista(segundos);
  tocar(pistas, 0, segundos, som);
  wav(nome, pistas);
}

fs.mkdirSync(SAIDA, { recursive: true });
efeito('pop', 0.18, t => Math.sin(2 * Math.PI * (520 * t + 2600 * t * t)) * Math.exp(-t * 26) * Math.min(1, t / 0.004));
efeito('ding', 0.9, t => [2093, 4186, 5580].reduce((s, f, k) => s + Math.sin(2 * Math.PI * f * t) / (k + 1), 0) * Math.exp(-t * 5));
efeito('whoosh', 0.45, t => {
  const x = t / 0.45;
  return aleatorio() * Math.sin(Math.PI * x) ** 2 * (0.6 + 0.4 * Math.sin(2 * Math.PI * (200 + 900 * x) * t));
});
efeito('tada', 1.1, t => [0, 4, 7, 12].reduce((s, semi, k) => {
  const t0 = t - k * 0.09;
  return t0 < 0 ? s : s + Math.sin(2 * Math.PI * nota(semi + 12) * t0) * Math.exp(-t0 * 3.5) * Math.min(1, t0 / 0.005);
}, 0));
efeito('moeda', 0.4, t => {
  const f = t < 0.07 ? nota(23) : nota(28);
  return Math.sign(Math.sin(2 * Math.PI * f * t)) * 0.4 * Math.exp(-t * 8);
});
