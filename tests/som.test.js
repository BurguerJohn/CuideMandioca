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

test('música: agenda os passos à frente do relógio do áudio, fica quieta sem som e para ao desligar', () => {
  const { AudioContext, log } = fakeAudio();
  let clock = 0;
  class Clocked extends AudioContext { get currentTime() { return clock; } set currentTime(_) {} }
  const timers = { active: new Map(), next: 1 };
  const options = { AudioContext: Clocked, enabled: true, volume: 0.5,
    setInterval: fn => { timers.active.set(timers.next, fn); return timers.next++; },
    clearInterval: id => timers.active.delete(id) };
  const som = Som.create(options);
  assert.equal(som.music, false, 'a música nasce desligada');
  assert.equal(som.setMusic(true), true);
  assert.equal(som.music, true);
  assert.equal(timers.active.size, 1, 'um relógio só agenda a música');
  const first = log.oscillators;
  assert.ok(first > 20, 'já agendou uns 1,4 s de música na hora');
  // Com o relógio do áudio parado não agenda de novo; andando, agenda os passos seguintes.
  timers.active.forEach(fn => fn());
  assert.equal(log.oscillators, first);
  clock += 5;
  timers.active.forEach(fn => fn());
  assert.ok(log.oscillators > first, 'o relógio andou, então vêm mais passos');
  // Liga de novo sem duplicar o relógio; o som desligado silencia a música e volta com ele.
  som.setMusic(true);
  assert.equal(timers.active.size, 1);
  som.set({ enabled: false });
  assert.equal(som.music, false, 'sem som não toca música');
  assert.equal(timers.active.size, 0);
  som.set({ enabled: true });
  assert.equal(som.music, true, 'e volta quando o som volta, se ela ainda estava ligada');
  som.setMusic(false);
  assert.equal(som.music, false);
  assert.equal(timers.active.size, 0);
  // Um laço tem dezesseis compassos (parte A e parte B) de oito colcheias.
  assert.equal(Som.MUSICA.passos, 128);
  // Quatro músicas no laço: o forró, o xote, o baião e o arrasta-pé, uma depois da outra.
  assert.deepEqual([...Som.MUSICA.musicas], ['forro', 'xote', 'baiao', 'arrasta-pe']);
  // Sem relógio injetado nem global disponível, ligar a música não quebra.
  assert.equal(Som.create({ AudioContext: null }).setMusic(true), false);
});

test('música: depois do laço do forró entra o xote, depois o baião, o arrasta-pé, e volta o forró', () => {
  const { AudioContext } = fakeAudio();
  let clock = 0;
  class Clocked extends AudioContext { get currentTime() { return clock; } set currentTime(_) {} }
  const timers = { active: new Map(), next: 1 };
  const som = Som.create({ AudioContext: Clocked, enabled: true, volume: 0.5,
    setInterval: fn => { timers.active.set(timers.next, fn); return timers.next++; }, clearInterval: id => timers.active.delete(id) });
  som.setMusic(true);
  assert.equal(som.song, 'forro');
  // O forró tem 128 colcheias a 104 BPM: uns 37 s. Andando o relógio aos poucos, o xote entra depois disso.
  const forro = Som.MUSICA.passos * Som.MUSICA.colcheia;
  while (clock < forro + 2) { clock += 0.5; timers.active.forEach(fn => fn()); }
  assert.equal(som.song, 'xote');
  const xote = 128 * (60 / 84 / 2);
  while (clock < forro + xote + 2) { clock += 0.5; timers.active.forEach(fn => fn()); }
  assert.equal(som.song, 'baiao');
  const baiao = 256 * (60 / 92 / 4);
  while (clock < forro + xote + baiao + 2) { clock += 0.5; timers.active.forEach(fn => fn()); }
  assert.equal(som.song, 'arrasta-pe');
  const arrasta = 256 * (60 / 124 / 4);
  while (clock < forro + xote + baiao + arrasta + 2) { clock += 0.5; timers.active.forEach(fn => fn()); }
  assert.equal(som.song, 'forro');
  som.setMusic(false);
  assert.equal(som.song, 'forro', 'desligar volta para o começo');
});
