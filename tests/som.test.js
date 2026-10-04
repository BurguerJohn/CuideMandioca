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
  assert.equal(som.play('evento'), false, 'a fanfarra dos eventos também espera o intervalo');
  assert.equal(som.play('evento-raro'), false, 'e a dos raros também');

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

// --- A música de cada show do Palco do Forró -----------------------------------------------------------------------------------------------

const Dados = require('../src/data.js');
const { GameEngine } = require('../src/core.js');

// Áudio de mentira que guarda a hora de início de cada nota e o relógio que o teste anda à mão.
function showSetup(options = {}) {
  const { AudioContext, log } = fakeAudio();
  const clock = { t: 0 };
  const starts = [];
  class Recording extends AudioContext {
    get currentTime() { return clock.t; }
    set currentTime(_) {}
    createOscillator() {
      const osc = super.createOscillator();
      osc.frequency.setValueAtTime = (freq, at) => starts.push({ at, freq, type: osc.type });
      return osc;
    }
  }
  const timers = new Map();
  let next = 1;
  const som = Som.create({ AudioContext: Recording, enabled: true, volume: 0.5, ...options,
    setInterval: fn => { timers.set(next, fn); return next++; }, clearInterval: id => timers.delete(id) });
  const advance = seconds => { const end = clock.t + seconds; while (clock.t < end) { clock.t += 0.2; timers.forEach(fn => fn()); } };
  return { som, log, clock, starts, timers, advance };
}
const palco = Dados.minis.palco;
const songOf = id => palco.songs.find(entry => entry.id === id);

// Uma voz de mentira para ver o que um passo toca: cada tom e cada ruído com a hora relativa e a altura.
function fakeVoice() {
  const calls = [];
  return { calls, tom: (at, dur, freq, opts = {}) => calls.push({ kind: 'tom', at, dur, freq, ...opts }), ruido: (at, dur, opts = {}) => calls.push({ kind: 'ruido', at, dur, ...opts }) };
}

test('show do palco: cada música que dá para jogar tem a sua música, com a mesma tonalidade e o mesmo compasso da pista', () => {
  assert.deepEqual(Object.keys(Som.SHOWS).sort(), palco.songs.map(entry => entry.id).sort(), 'uma música para cada música jogável');
  const seen = new Set();
  for (const entry of palco.songs) {
    const info = Som.SHOWS[entry.id];
    assert.ok(info.compassos >= 16 && info.volta < info.compassos, `${entry.id}: tem corpo e um ponto de volta`);
    // Tocando a partitura inteira, a música tem notas de melodia (sanfona) e de ritmo, e termina no acorde da tonalidade.
    const melodia = [];
    let ritmo = 0;
    for (let n = 0; n < info.compassos * 8; n++) {
      const v = fakeVoice();
      Som.passoShow(entry.id, v, 8 + n, 8, 0.15);
      ritmo += v.calls.filter(call => call.kind === 'ruido' || (call.kind === 'tom' && call.freq < 200)).length;
      melodia.push(v.calls.filter(call => call.type === 'sawtooth' && call.freq > 480).length);
    }
    assert.ok(ritmo > info.compassos * 4, `${entry.id}: zabumba e aro em todos os compassos`);
    assert.ok(melodia.filter(Boolean).length > info.compassos * 2, `${entry.id}: a melodia tem notas`);
    // A contagem (um bumbo por tempo) leva uma pancadinha de sanfona no último tempo, no acorde em que a música termina.
    const sanfonas = [...Array(8).keys()].map(n => { const v = fakeVoice(); Som.passoShow(entry.id, v, n, 8, 0.15); return v.calls.filter(call => call.type === 'sawtooth').length; });
    assert.deepEqual(sanfonas.map(Boolean), [false, false, false, false, true, false, false, false], `${entry.id}: contagem com a sanfona só no último tempo`);
    assert.deepEqual([0, 4].map(n => { const v = fakeVoice(); Som.passoShow(entry.id, v, n, 8, 0.15); return v.calls.filter(call => call.freq < 200 && call.type === 'sine').length; }), [1, 1], `${entry.id}: bumbo em cada tempo da contagem`);
    const assinatura = JSON.stringify([...Array(64).keys()].map(n => { const v = fakeVoice(); Som.passoShow(entry.id, v, 8 + n, 8, 0.15); return v.calls.map(call => [call.kind, call.at, call.freq && Math.round(call.freq)]); }));
    assert.ok(!seen.has(assinatura), `${entry.id}: não repete a música de outra`);
    seen.add(assinatura);
  }
});

test('show do palco: a trilha cai na grade das notas do jogo (a primeira nota da partitura no `lead` e uma contagem antes)', () => {
  const engine = new GameEngine(Dados, null, { rng: () => 0.5 });
  for (const entry of palco.songs) {
    const { som, starts, clock, advance } = showSetup();
    clock.t = 10;
    assert.equal(som.startShow(entry.id, { bpm: entry.bpm, lead: palco.lead }), true);
    assert.equal(som.showing, entry.id);
    advance(palco.lead / 1000 + 4);
    const sec = 60 / entry.bpm / 4;
    // Toda nota começa numa semicolcheia da grade que parte do `lead` (a hora da primeira nota da pista)...
    const origem = 10 + palco.lead / 1000;
    assert.ok(starts.length > 50, `${entry.id}: tocou`);
    for (const note of starts) {
      const k = (note.at - origem) / sec;
      assert.ok(Math.abs(k - Math.round(k)) < 1e-6, `${entry.id}: nota fora da grade (${k})`);
    }
    // ... a contagem cabe antes dela, sem passar de um tempo de folga, e nada começa antes do show.
    const primeira = Math.min(...starts.map(note => note.at));
    assert.ok(primeira >= 10 - 1e-9, `${entry.id}: nada antes do show começar`);
    assert.ok(primeira - 10 < sec * 4 + 1e-9, `${entry.id}: a contagem ocupa quase todo o \`lead\``);
    // E toda nota da partitura do jogo cai num passo par: a grade do jogo é de meio tempo, e a da trilha de um quarto.
    for (const note of engine.mini('palco').chart(entry.id)) {
      const k = (note.t - palco.lead) / 1000 / sec;
      assert.ok(Math.abs(k / 2 - Math.round(k / 2)) < 0.01, `${entry.id}: a nota em ${note.t} ms está fora do tempo da trilha`);
    }
    som.stopShow();
  }
});

test('show do palco: entrar no meio (elapsed) pula o que já passou, e passando do fim a trilha volta ao ponto de volta', () => {
  const entry = songOf('xote');
  const { som, starts, clock, advance } = showSetup();
  clock.t = 30;
  som.startShow(entry.id, { bpm: entry.bpm, lead: palco.lead, elapsed: 5000 });
  assert.ok(starts.length > 0);
  assert.ok(starts.every(note => note.at >= 30 - 0.04 - 1e-9), 'nada que já passou volta a tocar');
  // E a grade continua a de quem começou 5 s antes (a música não recomeça do zero no meio do show).
  const sec = 60 / entry.bpm / 4;
  for (const note of starts) {
    const k = (note.at - (25 + palco.lead / 1000)) / sec;
    assert.ok(Math.abs(k - Math.round(k)) < 1e-6, `nota fora da grade do show (${k})`);
  }
  // Muito depois do fim da partitura segue tocando (o show pode durar mais que a trilha).
  const antes = starts.length;
  advance(60);
  assert.ok(starts.length > antes + 100);
  // A volta cai no ponto de volta: o passo logo depois do fim soa como o primeiro do ponto de volta.
  const info = Som.SHOWS[entry.id];
  const voltar = n => { const v = fakeVoice(); Som.passoShow(entry.id, v, n, 8, 0.15); return JSON.stringify(v.calls); };
  assert.equal(voltar(8 + info.compassos * 8), voltar(8 + info.volta * 8), 'depois do último compasso volta ao ponto de volta');
  assert.equal(voltar(8 + (info.compassos + 3) * 8 + 2), voltar(8 + (info.volta + 3) * 8 + 2));
  som.stopShow();
});

test('show do palco: a música de fundo cede enquanto o show toca e volta depois; parar fecha com o acorde só quando o show deu estrela', () => {
  const entry = songOf('baiao');
  const { som, log, timers, advance } = showSetup();
  assert.equal(som.setMusic(true), true);
  assert.equal(timers.size, 1);
  assert.equal(som.startShow('nao-existe', { bpm: 100 }), false, 'música desconhecida não toca');
  assert.equal(som.startShow(entry.id, { bpm: 0 }), false, 'sem andamento não toca');
  assert.equal(som.startShow(entry.id, { bpm: entry.bpm, lead: palco.lead }), true);
  assert.equal(log.master.at(-1), 0, 'a via da música de fundo é silenciada');
  assert.equal(timers.size, 2, 'um relógio para a música de fundo e outro para o show');
  // Com o show rolando a música de fundo não agenda nada novo: o mesmo tempo, sem música de fundo, agenda o mesmo tanto.
  const depois = log.oscillators;
  advance(5);
  const comFundo = log.oscillators - depois;
  const sem = showSetup();
  sem.som.startShow(entry.id, { bpm: entry.bpm, lead: palco.lead });
  const base = sem.log.oscillators;
  sem.advance(5);
  assert.equal(comFundo, sem.log.oscillators - base, 'a música de fundo espera o show acabar');
  sem.som.stopShow();
  // Sem estrela: só some (nenhuma nota nova do fecho).
  let osc = log.oscillators;
  assert.equal(som.stopShow(), true);
  assert.equal(som.showing, null);
  assert.equal(timers.size, 1, 'o relógio do show para');
  assert.equal(log.oscillators, osc, 'sem estrela não há acorde final');
  assert.equal(log.master.at(-1), 1, 'a música de fundo volta');
  assert.equal(som.stopShow(), false, 'parar de novo não faz nada');
  // Com estrelas: o acorde final (e mais brilho com três).
  som.startShow(entry.id, { bpm: entry.bpm, lead: palco.lead });
  osc = log.oscillators;
  som.stopShow({ stars: 1 });
  const um = log.oscillators - osc;
  assert.ok(um >= 8, 'bumbo, acorde, baixo e ping');
  som.startShow(entry.id, { bpm: entry.bpm, lead: palco.lead });
  osc = log.oscillators;
  som.stopShow({ stars: 3 });
  assert.ok(log.oscillators - osc > um, 'três estrelas soltam um arpejo a mais');
  som.setMusic(false);
});

test('show do palco: começar outra música no meio de um show troca a trilha sem deixar o relógio da anterior rodando', () => {
  const { som, timers, advance } = showSetup();
  const [um, outro] = palco.songs;
  som.startShow(um.id, { bpm: um.bpm, lead: palco.lead });
  advance(1);
  som.startShow(outro.id, { bpm: outro.bpm, lead: palco.lead });
  assert.equal(som.showing, outro.id);
  assert.equal(timers.size, 1, 'um relógio só');
  som.stopShow();
  assert.equal(timers.size, 0);
});

test('show do palco: com o som desligado ou sem volume não toca, e desligar no meio do show para a trilha', () => {
  const entry = songOf('arrasta-pe');
  const off = showSetup({ enabled: false });
  assert.equal(off.som.startShow(entry.id, { bpm: entry.bpm, lead: palco.lead }), false);
  assert.equal(off.som.showing, null);
  assert.equal(off.timers.size, 0);
  const mute = showSetup({ volume: 0 });
  assert.equal(mute.som.startShow(entry.id, { bpm: entry.bpm, lead: palco.lead }), false);
  const { som, timers, log, advance } = showSetup();
  assert.equal(som.startShow(entry.id, { bpm: entry.bpm, lead: palco.lead }), true);
  advance(1);
  som.set({ enabled: false });
  assert.equal(som.showing, null, 'desligar o som no meio encerra a trilha');
  assert.equal(timers.size, 0);
  const osc = log.oscillators;
  advance(3);
  assert.equal(log.oscillators, osc);
  // Sem Web Audio nada quebra.
  assert.equal(Som.create({ AudioContext: null }).startShow(entry.id, { bpm: entry.bpm }), false);
  assert.equal(Som.create({ AudioContext: null }).stopShow(), false);
});

test('show do palco: com o áudio suspenso espera, e ao voltar pula o que passou em vez de tocar tudo de uma vez', () => {
  const entry = songOf('forro-ouro');
  const { AudioContext, log } = fakeAudio();
  const clock = { t: 0 };
  const starts = [];
  let state = 'running';
  class Gated extends AudioContext {
    get currentTime() { return clock.t; }
    set currentTime(_) {}
    get state() { return state; }
    set state(_) {}
    createOscillator() { const osc = super.createOscillator(); osc.frequency.setValueAtTime = (freq, at) => starts.push(at); return osc; }
  }
  const timers = [];
  const som = Som.create({ AudioContext: Gated, enabled: true, volume: 0.5, setInterval: fn => { timers.push(fn); return timers.length; }, clearInterval() {} });
  som.startShow(entry.id, { bpm: entry.bpm, lead: palco.lead });
  const first = starts.length;
  state = 'suspended';
  clock.t = 12;
  timers.forEach(fn => fn());
  assert.equal(starts.length, first, 'suspenso não agenda');
  state = 'running';
  timers.forEach(fn => fn());
  assert.ok(starts.length > first);
  assert.ok(starts.slice(first).every(at => at >= 12 - 0.04 - 1e-9), 'só o que ainda vem; nada do tempo parado');
  assert.ok(starts.length - first < 80, 'não despeja a música inteira de uma vez');
  som.stopShow();
  assert.ok(log.oscillators > 0);
});
