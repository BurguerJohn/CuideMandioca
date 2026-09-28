const test = require('node:test');
const assert = require('node:assert/strict');
const Som = require('../src/som.js');

// Web Audio de mentira: guarda quantos osciladores e ruídos cada som agendou e o volume geral.
function fakeAudio() {
  const log = { oscillators: 0, noises: 0, contexts: 0, resumed: 0, master: [] };
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {},
    setTargetAtTime(value) { log.master.push(value); } });
  const node = extra => ({ connect() {}, ...extra });
  class AudioContext {
    constructor() { log.contexts++; this.state = 'running'; this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; }
    resume() { log.resumed++; this.state = 'running'; return Promise.resolve(); }
    createGain() { return node({ gain: param() }); }
    createDynamicsCompressor() { return node(); }
    createBiquadFilter() { return node({ type: '', frequency: param(), Q: param() }); }
    createOscillator() { log.oscillators++; return node({ type: '', detune: param(), frequency: param(), start() {}, stop() {} }); }
    createBufferSource() { log.noises++; return node({ start() {}, stop() {} }); }
    createBuffer(channels, length) { const data = new Float32Array(length); return { getChannelData: () => data }; }
  }
  return { AudioContext, log };
}

test('som: cada efeito agenda notas, respeita liga/desliga, volume e o intervalo entre repetições', () => {
  const { AudioContext, log } = fakeAudio();
  const som = Som.create({ AudioContext, enabled: true, volume: 0.5 });
  assert.equal(log.contexts, 0, 'o áudio só nasce no primeiro som');
  for (const name of Som.SONS) assert.equal(som.play(name), true, name);
  assert.equal(log.contexts, 1);
  assert.ok(log.oscillators > 20 && log.noises > 5, 'tons e ruídos agendados');
  assert.equal(som.play('nada'), false, 'som desconhecido não toca');
  assert.equal(som.play('cobra'), false, 'o mesmo som logo em seguida espera o intervalo');

  som.set({ enabled: false });
  assert.equal(som.play('moeda'), false, 'desligado não toca');
  som.set({ enabled: true, volume: 0 });
  assert.equal(som.play('moeda'), false, 'volume zero não toca');
  som.set({ volume: 2 });
  assert.equal(som.volume, 1, 'volume vai de 0 a 1');
  assert.equal(log.master.at(-1), 0.9, 'o volume muda o ganho geral na hora');
});

test('som: sem Web Audio (ou antes do primeiro clique no navegador) o jogo segue quieto', () => {
  assert.equal(Som.create({ AudioContext: null }).play('moeda'), false);
  const { AudioContext, log } = fakeAudio();
  class Suspended extends AudioContext { constructor() { super(); this.state = 'suspended'; } }
  const som = Som.create({ AudioContext: Suspended });
  assert.equal(som.play('moeda'), false, 'áudio suspenso não enfileira som para depois');
  assert.equal(log.resumed, 1, 'mas pede para destravar');
});
