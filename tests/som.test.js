const test = require('node:test');
const assert = require('node:assert/strict');
const Som = require('../src/som.js');
const { fakeAudio } = require('./fake-audio');

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

test('som: desligar silencia efeitos já agendados e religar restaura o volume escolhido', () => {
  const { AudioContext, log } = fakeAudio();
  const som = Som.create({ AudioContext, volume: 0.5 });
  som.play('trovao');
  som.set({ enabled: false });
  assert.equal(log.master.at(-1), 0, 'o ganho geral silencia também os sons em andamento');
  som.set({ volume: 0.8 });
  assert.equal(log.master.at(-1), 0, 'mudar o volume não liga o áudio desligado');
  som.set({ enabled: true });
  assert.equal(log.master.at(-1), 0.8 * 0.8 * 0.9);
});

test('som: ruídos longos repetem o buffer até o fim do efeito', () => {
  const { AudioContext, log } = fakeAudio();
  const som = Som.create({ AudioContext });
  som.play('trovao');
  som.play('chuva');
  assert.ok(log.sources.length >= 4);
  assert.ok(log.sources.every(source => source.loop), 'o buffer de um segundo não corta o trovão e a chuva antes da hora');
});

test('som: falha parcial na inicialização não quebra ajustes e uma tentativa posterior recupera o áudio', () => {
  for (const failedMethod of ['createDynamicsCompressor', 'createBuffer']) {
    const { AudioContext, log } = fakeAudio();
    let failures = 1;
    let closed = 0;
    class Failing extends AudioContext {
      close() { closed++; this.state = 'closed'; return Promise.resolve(); }
      createDynamicsCompressor(...args) {
        if (failedMethod === 'createDynamicsCompressor' && failures-- > 0) throw Error('sem recursos');
        return super.createDynamicsCompressor(...args);
      }
      createBuffer(...args) {
        if (failedMethod === 'createBuffer' && failures-- > 0) throw Error('sem recursos');
        return super.createBuffer(...args);
      }
    }
    const som = Som.create({ AudioContext: Failing, volume: 0.5 });
    assert.equal(som.play('moeda'), false, failedMethod);
    const abandonedMaster = log.gains[0];
    assert.doesNotThrow(() => som.set({ volume: 0.7 }), failedMethod);
    assert.equal(closed, 1, 'o contexto incompleto libera seus recursos');
    assert.equal(som.play('moeda'), true, 'a tentativa seguinte cria um contexto funcional');
    assert.equal(log.contexts, 2);
    assert.equal(abandonedMaster.gain.targets.length, 0, 'não tenta regular o nó do contexto descartado');
    som.set({ volume: 0.8 });
    assert.equal(log.master.at(-1), 0.8 * 0.8 * 0.9);
  }
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

test('música: religar não devolve o som às notas que estavam agendadas antes de desligar', () => {
  const { AudioContext, log } = fakeAudio();
  let next = 1;
  const som = Som.create({ AudioContext, setInterval: () => next++, clearInterval() {} });
  som.setMusic(true);
  const oldBus = log.gains[1];
  som.setMusic(false);
  assert.equal(oldBus.gain.targets.at(-1), 0);
  som.setMusic(true);
  assert.equal(oldBus.gain.targets.at(-1), 0, 'a via das notas antigas permanece silenciosa');
  assert.equal(som.music, true, 'a nova sequência fica ligada');
  som.setMusic(false);
});
