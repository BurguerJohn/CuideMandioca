const test = require('node:test');
const assert = require('node:assert/strict');
const I18N = require('../src/i18n.js');
const data = require('../src/data.js');
const Som = require('../src/som.js');
const { GameEngine } = require('../src/core.js');
const { fakeDocument } = require('./fake-dom');

require('../src/festa-sprites.js');
const Plateia = require('../src/festa-plateia.js');

const bundle = globalThis.FESTA_SPRITES;
const langs = I18N.dictionaries();
const ids = I18N.LANGUAGES.map(lang => lang.id);
const { ACTS, IDS, RIPPLE, OLA } = Plateia;
const REACTIVE = ['fogos', 'oi', 'ovacao'];
const plain = text => text.normalize('NFD').replace(/[̀-ͯ]/g, '');

// O navegador carrega os módulos como globais; no Node eles só são exportados, e o teste que precisa da festa com eles liga o global só enquanto roda
// (senão todos os outros testes da festa passariam a ter a plateia e as mandioquinhas ligadas).
const comGlobais = (globais, corpo) => () => {
  const antes = Object.keys(globais).map(chave => [chave, globalThis[chave]]);
  Object.assign(globalThis, globais);
  try { corpo(); } finally { for (const [chave, valor] of antes) { if (valor === undefined) delete globalThis[chave]; else globalThis[chave] = valor; } }
};

// Uma festa de mentira só com o que o módulo usa: três fileiras de plateia, o chão em 100 e tudo o que ele pede anotado.
function fakeCrowd({ rows = [10, 8, 6], calm = false, rng, seed = 7 } = {}) {
  const lay = { L: 0, R: 400, width: 400, audience: [], audience2: [], audience3: [] };
  [lay.audience, lay.audience2, lay.audience3].forEach((list, r) => {
    for (let i = 0; i < rows[r]; i++) list.push({ x: 20 + i * 24 + r * 7, index: r * 100 + i });
  });
  const log = { say: [], big: [], float: [], confetti: [], dust: [], sound: [], rects: [] };
  const fx = { wave: null };
  const flags = { calm };
  const g = { fillStyle: '', fillRect(x, y, w, h) { log.rects.push({ x, y, w, h, color: this.fillStyle }); } };
  const plateia = Plateia.create({
    g, rng, seed, fx: () => fx, layout: () => lay, ground: () => 100, tr: key => key, calm: () => flags.calm,
    say: (...args) => { log.say.push(args); return {}; }, sayBig: (...args) => { log.big.push(args); return {}; },
    float: (...args) => log.float.push(args), confetti: (...args) => log.confetti.push(args), dust: (...args) => log.dust.push(args),
    sound: name => log.sound.push(name)
  });
  const guests = [lay.audience, lay.audience2, lay.audience3].flatMap((list, row) => list.map(guest => ({ row, guest, seed: guest.index * 37 + 5 })));
  return { plateia, lay, log, fx, flags, guests };
}
const engineOf = (dancing = false) => ({ state: { runtime: { dancing } } });

test('plateia: são 12 números (9 sorteados e 3 só de reação), cada um com som que existe e o grito em todos os idiomas', () => {
  assert.equal(IDS.length, 12);
  assert.deepEqual(IDS.filter(id => ACTS[id].weight === 0).sort(), [...REACTIVE].sort(), 'fogos, boas-vindas e ovação só reagem');
  for (const id of IDS) {
    const act = ACTS[id];
    assert.ok(Som.SONS.includes(act.sound), `${id}: som ${act.sound}`);
    assert.ok(act.dur >= 1000 && act.min >= 4, `${id}: duração e mínimo`);
    assert.equal(Plateia.SOUNDS[id], act.sound);
  }
  for (const lang of ids) {
    const ui = langs[lang].ui;
    for (const key of [...IDS, 'fogos2', 'bis1']) {
      const text = ui[`fx.plateia.${key}`];
      assert.ok(text, `${lang}: fx.plateia.${key}`);
      assert.match(plain(text), /^[A-Z0-9+\-.,!?: ]*$/, `${lang}: ${key} só usa a fonte de pixel`);
    }
    for (const id of IDS) assert.ok(ui[`debug.plateiaAct.${id}`], `${lang}: botão de teste de ${id}`);
    assert.ok(ui['debug.tab.plateia'] && ui['debug.plateiaNote']);
    assert.equal(new Set(IDS.map(id => ui[`fx.plateia.${id}`])).size, IDS.length, `${lang}: gritos diferentes`);
  }
  for (const sound of ['palmas', 'ooh', 'vivas', 'pisada']) assert.ok(Som.SONS.includes(sound), `som novo ${sound}`);
});

test('plateia: o número nasce em quem puxou e se espalha pelas outras pessoas (RIPPLE ms por pixel), no começo e no fim', () => {
  const f = fakeCrowd();
  const origin = f.lay.audience[3].x;
  assert.equal(f.plateia.start('palmas', 1000, { origin }), true);
  const near = f.guests.find(item => item.guest.x === origin);
  const far = f.guests.reduce((best, item) => (Math.abs(item.guest.x - origin) > Math.abs(best.guest.x - origin) ? item : best));
  const gap = Math.abs(far.guest.x - origin) * RIPPLE;
  assert.ok(gap > 400, 'a plateia é larga o bastante para a onda demorar');
  assert.notEqual(f.plateia.pose(near.row, near.guest, near.seed, near.guest.x, 1000), null, 'quem puxou já está no número');
  assert.equal(f.plateia.pose(far.row, far.guest, far.seed, far.guest.x, 1000), null, 'quem está longe ainda não');
  assert.notEqual(f.plateia.pose(far.row, far.guest, far.seed, far.guest.x, 1000 + gap + 50), null, 'e entra quando a onda chega');
  assert.equal(f.plateia.pose(near.row, near.guest, near.seed, near.guest.x, 1000 + ACTS.palmas.dur + 10), null, 'passada a duração, sai');
  assert.notEqual(f.plateia.pose(far.row, far.guest, far.seed, far.guest.x, 1000 + gap + ACTS.palmas.dur - 50), null, 'quem entrou depois também sai depois');
  assert.equal(f.plateia.pose(near.row, near.guest, near.seed, near.guest.x, 999), null, 'antes de começar ninguém se mexe');
  assert.equal(f.plateia.start('nao-existe', 1000), false);
  // O letreiro grande fica dentro da festa mesmo quando quem puxou está na ponta.
  for (const [edge, check] of [[2, x => x >= 30], [398, x => x <= 370]]) {
    const e = fakeCrowd();
    e.plateia.start('bis', 0, { origin: edge });
    assert.ok(check(e.log.big[0][1]), `letreiro em ${e.log.big[0][1]}`);
  }
  // O grito, o som e o registro do número.
  assert.equal(f.log.big.length, 1);
  assert.equal(f.log.big[0][0], 'fx.plateia.palmas');
  assert.deepEqual(f.log.sound, ['palmas']);
  assert.equal(f.plateia.probe().current.id, 'palmas');
  assert.equal(f.plateia.busy(), true);
});

test('plateia: cada número tem o seu jeito de se mexer (quadros válidos, pulos para cima e deslocamentos pequenos)', () => {
  for (const id of IDS) {
    const f = fakeCrowd();
    f.plateia.start(id, 0, { origin: 200 });
    const steps = new Set();
    let active = 0;
    for (let t = 0; t <= ACTS[id].dur + 3000; t += 53) {
      for (const { row, guest, seed } of f.guests) {
        const pose = f.plateia.pose(row, guest, seed, guest.x, t);
        if (!pose) continue;
        active++;
        steps.add(pose.step);
        assert.ok(pose.step === OLA || (Number.isInteger(pose.step) && pose.step >= 0 && pose.step <= 7), `${id}: quadro ${pose.step}`);
        assert.ok(Number.isInteger(pose.hop) && pose.hop <= 0 && pose.hop >= -6, `${id}: pulo ${pose.hop}`);
        assert.ok(Number.isInteger(pose.dx) && Math.abs(pose.dx) <= 5, `${id}: deslocamento ${pose.dx}`);
      }
    }
    assert.ok(active > 100, `${id}: a plateia entra no número`);
    assert.ok(steps.size >= 1);
  }
});

test('plateia: palmas no mesmo compasso (e faíscas), pula-pula em revezamento, bandeirinhas em metade, trenzinho que anda de lado', () => {
  const at = (f, id, t, filter = () => true) => f.guests.filter(filter).map(({ row, guest, seed }) => f.plateia.pose(row, guest, seed, guest.x, t));
  // Palmas: todo mundo bate junto (quadro 0, palma, ou 2, braços abertos), e só quem bate solta uma faísca.
  let f = fakeCrowd();
  f.plateia.start('palmas', 0, { origin: 200 });
  const t0 = 2000;
  const claps = at(f, 'palmas', t0);
  assert.ok(claps.every(pose => pose && (pose.step === 0 || pose.step === 2)));
  assert.ok(new Set(claps.map(pose => pose.step)).size <= 2);
  const solo = f.guests[3];
  const soloSteps = new Set(Array.from({ length: 40 }, (_, k) => f.plateia.pose(solo.row, solo.guest, solo.seed, solo.guest.x, 1500 + k * 30)?.step));
  assert.deepEqual([...soloSteps].sort(), [0, 2], 'cada pessoa bate (0) e abre os braços (2) no compasso');
  const sparks = [];
  for (let t = 1500; t < 3100; t += 20) {
    f.log.rects.length = 0;
    for (const { row, guest, seed } of f.guests) f.plateia.over(row, guest, seed, guest.x, 60, false, t);
    sparks.push(f.log.rects.length);
  }
  assert.ok(sparks.some(count => count > 0) && sparks.some(count => count === 0), 'a faísca só aparece na hora da palma');
  // Pula-pula: as fileiras pulam uma depois da outra (o ola no ar), nunca as três juntas.
  f = fakeCrowd();
  f.plateia.start('pulapula', 0, { origin: 200 });
  const airborne = row => { let n = 0; for (let t = 1000; t < 3000; t += 40) { const item = f.guests.find(x => x.row === row && x.guest.x === 200 + (row === 0 ? 4 : 0)) || f.guests.find(x => x.row === row); const pose = f.plateia.pose(row, item.guest, item.seed, 200, t); if (pose && pose.step === OLA) n++; } return n; };
  assert.ok([0, 1, 2].every(row => airborne(row) > 0), 'cada fileira pula');
  const pulses = [0, 1, 2].map(row => { const item = f.guests.find(x => x.row === row); return Array.from({ length: 60 }, (_, k) => (f.plateia.pose(row, item.guest, item.seed, 200, 1000 + k * 40)?.hop || 0)).join(','); });
  assert.equal(new Set(pulses).size, 3, 'em tempos diferentes');
  // Bandeirinhas: as pessoas ímpares erguem a bandeira (quadro 6 e uma bandeira desenhada), as pares batem palmas.
  f = fakeCrowd();
  f.plateia.start('bandeiras', 0, { origin: 200 });
  const poses = f.guests.map(({ row, guest, seed }) => ({ seed, pose: f.plateia.pose(row, guest, seed, guest.x, 3000) }));
  assert.ok(poses.every(item => item.pose));
  assert.ok(poses.filter(item => item.seed % 2).every(item => item.pose.step === 6), 'quem segura a bandeira ergue um braço');
  assert.ok(poses.filter(item => !(item.seed % 2)).every(item => item.pose.step === 0 || item.pose.step === 2), 'os outros batem palmas');
  const holder = f.guests.find(item => item.seed % 2), clapper = f.guests.find(item => !(item.seed % 2));
  f.log.rects.length = 0;
  f.plateia.over(clapper.row, clapper.guest, clapper.seed, 50, 60, false, 3000);
  assert.equal(f.log.rects.length, 0, 'sem bandeira');
  f.plateia.over(holder.row, holder.guest, holder.seed, 50, 60, false, 3000);
  assert.ok(f.log.rects.length >= 4, 'pau e bandeira');
  assert.ok(f.log.rects.some(rect => rect.color === '#7c421e' && rect.h === 7), 'o pau da bandeirinha');
  const leftHand = f.log.rects.find(rect => rect.color === '#7c421e').x;
  f.log.rects.length = 0;
  f.plateia.over(holder.row, holder.guest, holder.seed, 50, 60, true, 3000);
  assert.ok(f.log.rects.find(rect => rect.color === '#7c421e').x > leftHand, 'o braço levantado muda de lado quando a pessoa vira');
  // Balanço: todos juntos, devagar, de um lado para o outro (e a ovação, de braços para o alto o tempo todo).
  f = fakeCrowd();
  f.plateia.start('balanco', 0, { origin: 200 });
  const sway = Array.from({ length: 80 }, (_, k) => f.plateia.pose(0, f.lay.audience[4], 2, f.lay.audience[4].x, 1000 + k * 60).dx);
  assert.ok(sway.includes(1) && sway.includes(-1), `balança dos dois lados: ${new Set(sway)}`);
  f = fakeCrowd();
  f.plateia.start('ovacao', 0, { origin: 200 });
  const ova = Array.from({ length: 40 }, (_, k) => f.plateia.pose(0, f.lay.audience[4], 2, f.lay.audience[4].x, 1000 + k * 50));
  assert.ok(ova.every(pose => pose.step === OLA) && ova.some(pose => pose.hop < 0), 'ovação: braços para o alto e pulinhos');
  // Trenzinho: o deslocamento anda de uma pessoa para a outra (uma onda de lado) e muda de lado com a direção.
  f = fakeCrowd();
  f.plateia.start('serpente', 0, { origin: 200 });
  const dxs = f.lay.audience.map(guest => f.plateia.pose(0, guest, 5, guest.x, 2500).dx);
  assert.ok(new Set(dxs).size >= 4 && Math.max(...dxs) >= 3 && Math.min(...dxs) <= -3, `onda de lado: ${dxs}`);
  // A direção (sorteada no começo) vira a onda para o outro lado.
  const wave = value => { const c = fakeCrowd({ rng: () => value }); c.plateia.start('serpente', 0, { origin: 200 }); return c.lay.audience.map(guest => c.plateia.pose(0, guest, 5, guest.x, 2500).dx); };
  assert.notDeepEqual(wave(0.2), wave(0.9), 'dir +1 e dir -1 andam para lados opostos');
});

test('plateia: o ooh dos fogos, as boas-vindas virada para quem chegou, o bis alternando o braço, a pisada e o rebolado', () => {
  let f = fakeCrowd();
  f.plateia.start('fogos', 0, { origin: 200 });
  assert.equal(f.log.big.length, 0, 'sem letreiro grande: são três vozes soltas');
  assert.equal(f.log.say.length, 3);
  assert.deepEqual(f.log.say.map(item => item[0]), ['fx.plateia.fogos', 'fx.plateia.fogos2', 'fx.plateia.fogos']);
  assert.ok(f.log.say[2][3] > f.log.say[0][3], 'cada uma no seu tempo');
  const ooh = f.plateia.pose(0, f.lay.audience[0], 1, f.lay.audience[0].x, 1000 + 400);   // a onda chega na ponta depois de uns 900 ms
  assert.equal(ooh.step, OLA);
  // Boas-vindas: acenam virados para o lado de quem chegou (o flip muda de um lado para o outro do começo).
  f = fakeCrowd();
  f.plateia.start('oi', 0, { origin: 200 });
  const left = f.plateia.pose(0, { x: 100 }, 1, 100, 1000), right = f.plateia.pose(0, { x: 300 }, 1, 300, 1000);
  assert.equal(left.flip, false);
  assert.equal(right.flip, true);
  assert.ok([4, 6].includes(left.step));
  // Bis: o punho sobe no ritmo e o braço troca de lado a cada batida.
  f = fakeCrowd();
  f.plateia.start('bis', 0, { origin: 200 });
  const guest = f.lay.audience[2];
  const flips = [0, 1, 2, 3].map(beat => f.plateia.pose(0, guest, 9, guest.x, 440 * beat + 100 + 2000).flip);
  assert.ok(flips.some(value => value) && flips.some(value => !value), 'alterna o braço');
  // Pisada: metade pisa a cada batida (a outra metade, na seguinte) e quem pisa levanta poeira uma vez só por batida.
  f = fakeCrowd();
  f.plateia.start('pisada', 0, { origin: 200 });
  const jit = (4 % 7) * 6;                                   // o atraso de cada pessoa (seed % 7 * 6 ms) para a batida dela
  const hops = [2, 3, 4, 5].map(b => f.plateia.pose(0, { x: 200, index: 0 }, 4, 200, b * 360 - jit + 5).hop);
  assert.deepEqual(hops.map(h => h === -1), [hops[0] === -1, hops[0] !== -1, hops[0] === -1, hops[0] !== -1], 'a pisada alterna a cada batida');
  assert.ok(hops.includes(-1) && hops.includes(0));
  const stompers = f.guests.filter(({ seed }) => seed % 5 === 0);
  assert.ok(stompers.length >= 3);
  for (let t = 1000; t < 3000; t += 10) for (const { row, guest, seed } of stompers) f.plateia.over(row, guest, seed, guest.x, 60, false, t);
  assert.ok(f.log.dust.length >= 2, 'poeira na pisada');
  assert.ok(f.log.dust.every(args => [91, 92, 93].includes(args[1]) || args[1] === 100 - 9 + 1 || args[1] === 100 - 14 + 1 || args[1] === 100 - 19 + 1), 'poeira no chão de cada fileira');
  // Na mesma batida a poeira sai uma vez só, por mais quadros que ela dure.
  const one = stompers[0];
  const g2 = fakeCrowd();
  g2.plateia.start('pisada', 0, { origin: one.guest.x });
  let landed = null;
  for (let t = 1000; t < 3000 && landed === null; t++) {
    g2.plateia.over(one.row, one.guest, one.seed, one.guest.x, 60, false, t);
    if (g2.log.dust.length) landed = t;
  }
  assert.ok(landed !== null, 'a pessoa pisa e levanta poeira');
  for (let k = 1; k <= 5; k++) g2.plateia.over(one.row, one.guest, one.seed, one.guest.x, 60, false, landed + k);
  assert.equal(g2.log.dust.length, 1, 'a mesma batida não levanta poeira duas vezes');
  // Rebolado: os de índice par e ímpar tremem para lados opostos.
  f = fakeCrowd();
  f.plateia.start('rebola', 0, { origin: 200 });
  const even = f.plateia.pose(0, guest, 2, guest.x, 1000), odd = f.plateia.pose(0, guest, 3, guest.x, 1000);
  assert.equal(even.dx, -odd.dx);
  assert.notEqual(even.dx, 0);
});

test('plateia: o que o número solta enquanto dura (notinhas, corações, bis, confete), e nada disso no modo calmo (que também não grita)', () => {
  const run = (id, options = {}) => {
    const f = fakeCrowd(options);
    f.plateia.start(id, 0, { origin: 200 });
    for (let t = 0; t < ACTS[id].dur; t += 33) f.plateia.update(engineOf(), t);
    return f;
  };
  assert.ok(run('cantoria').log.float.filter(item => item[0] === 'nota').length >= 10, 'cantoria: notas');
  assert.ok(run('balanco').log.float.filter(item => item[0] === 'coracao').length >= 5, 'balanço: corações');
  assert.ok(run('bis').log.say.filter(item => item[0] === 'fx.plateia.bis1').length >= 8, 'bis: BIS!');
  const ovation = run('ovacao');
  assert.ok(ovation.log.confetti.length >= 4, 'ovação: confete');
  assert.ok(ovation.log.confetti.every(item => item[1] >= 8 && item[1] <= 392), 'confete dentro da festa');
  for (const id of ['cantoria', 'balanco', 'bis', 'ovacao', 'palmas', 'fogos']) {
    const calm = run(id, { calm: true });
    assert.equal(calm.log.say.length + calm.log.big.length + calm.log.float.length + calm.log.confetti.length, 0, `${id}: calmo`);
    assert.deepEqual(calm.log.sound, [ACTS[id].sound], `${id}: o som segue`);
  }
  // O som também sai com cada número.
  for (const id of IDS) assert.deepEqual(run(id).log.sound, [ACTS[id].sound], `${id}: som`);
});

test('plateia: de tempos em tempos sai um número sozinho (sem repetir o último, só com gente bastante e sem ola nem chuva), e a cantoria vem com a dança', () => {
  // Nada nos primeiros segundos; depois, um número sorteado dos que cabem na plateia.
  const f = fakeCrowd();
  f.plateia.update(engineOf(), 0);
  f.plateia.update(engineOf(), 5000);
  assert.equal(f.plateia.busy(), false, 'ninguém começa logo');
  let started = null;
  for (let t = 5000; t < 60000 && !started; t += 500) { f.plateia.update(engineOf(), t); started = f.plateia.current(); }
  assert.ok(started && ACTS[started.id].weight > 0, 'sorteou um número');
  assert.ok(started.at >= 12000 && started.at <= 22500, `entre 12 e 22 s (${started.at})`);
  assert.equal(started.by, 'sorteio');
  // Passado o número, ele sai e a agenda espera mais de 12 s; o mesmo número não volta em seguida.
  const seen = [];
  for (let t = started.at; t < started.at + 600000; t += 500) {
    f.plateia.update(engineOf(), t);
    const now = f.plateia.current();
    if (now && now.at !== (seen.at(-1)?.at)) seen.push(now);
  }
  assert.ok(seen.length >= 8, `vários números ao longo de 10 minutos (${seen.length})`);
  for (let i = 1; i < seen.length; i++) {
    assert.notEqual(seen[i].id, seen[i - 1].id, 'nunca o mesmo duas vezes seguidas');
    assert.ok(seen[i].at - seen[i - 1].at >= 12000 + ACTS[seen[i - 1].id].dur, 'com um respiro entre eles');
  }
  assert.ok(new Set(seen.map(item => item.id)).size >= 5, 'variam');
  for (const id of IDS) {
    const times = seen.filter(item => item.id === id).map(item => item.at);
    for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] >= ACTS[id].dur + 20000, `${id}: respiro de 20 s antes de repetir`);
  }
  assert.ok(seen.every(item => ACTS[item.id].weight > 0), 'os de reação nunca saem sorteados');
  // Plateia pequena: só os números que cabem; muito pequena: nenhum.
  const small = fakeCrowd({ rows: [5, 4, 0] });
  const smallIds = new Set();
  for (let t = 0; t < 900000; t += 500) { small.plateia.update(engineOf(), t); const now = small.plateia.current(); if (now) smallIds.add(now.id); }
  assert.ok(smallIds.size >= 1 && [...smallIds].every(id => ACTS[id].min <= 9), `só os que cabem: ${[...smallIds]}`);
  const tiny = fakeCrowd({ rows: [2, 0, 0] });
  for (let t = 0; t < 600000; t += 500) tiny.plateia.update(engineOf(), t);
  assert.equal(tiny.plateia.probe().started.length, 0, 'com 2 pessoas não há número');
  // A ola (fx.wave), a chuva ou o casamento (quiet) seguram o sorteio.
  const waved = fakeCrowd();
  waved.fx.wave = { at: 0, dir: 1 };
  for (let t = 0; t < 120000; t += 500) waved.plateia.update(engineOf(), t);
  assert.equal(waved.plateia.probe().started.length, 0, 'durante a ola não');
  const rainy = fakeCrowd();
  for (let t = 0; t < 120000; t += 500) rainy.plateia.update(engineOf(), t, true);
  assert.equal(rainy.plateia.probe().started.length, 0, 'na chuva não');
  // A cantoria é mais provável com a Mandioca dançando.
  const counts = dancing => { let n = 0, total = 0; for (let s = 1; s <= 60; s++) { const c = fakeCrowd({ seed: s * 101 }); for (let t = 0; t < 40000; t += 500) { c.plateia.update(engineOf(dancing), t); } const cur = c.plateia.probe().started; if (cur.length) { total++; if (cur[0] === 'cantoria') n++; } } return n / total; };
  assert.ok(counts(true) > counts(false) * 1.5, 'dançando, a cantoria sai mais');
});

test('plateia: reações (fogos, chegada, porte, dança, bingo, meta), o clique do jogador e o reinício', () => {
  const f = fakeCrowd();
  assert.equal(f.plateia.react('nada', 0), false);
  assert.equal(f.plateia.react('fogos', 1000), true);
  assert.equal(f.plateia.current().id, 'fogos');
  assert.equal(f.plateia.current().by, 'reacao');
  assert.equal(f.plateia.react('chegada', 1100), false, 'não interrompe o que está no ar');
  f.plateia.reset();
  assert.equal(f.plateia.busy(), false);
  // Cada gatilho chama o número dele.
  const wanted = { fogos: 'fogos', chegada: 'oi', porte: 'ovacao', danca: 'cantoria', bingo: 'pulapula', meta: 'palmas' };
  for (const [kind, id] of Object.entries(wanted)) {
    const g = fakeCrowd();
    assert.equal(g.plateia.react(kind, 5000), true, kind);
    assert.equal(g.plateia.current().id, id, kind);
  }
  // Os números sorteáveis também esperam 20 s depois de terminar para voltar por reação (palmas -> meta cumprida).
  const r = fakeCrowd();
  r.plateia.start('palmas', 0, { origin: 200 });
  r.plateia.update(engineOf(), ACTS.palmas.dur + 2000);
  assert.equal(r.plateia.busy(), false);
  assert.equal(r.plateia.react('meta', 8000), false, 'palmas acabaram de acontecer');
  assert.equal(r.plateia.react('meta', ACTS.palmas.dur + 20000 + 100), true, 'e voltam depois do respiro');
  // Os fogos não repetem o ooh a cada estouro (9 s entre eles); sem plateia bastante ou com a ola, ninguém reage.
  const h = fakeCrowd();
  h.plateia.react('fogos', 0);
  h.plateia.update(engineOf(), 4000);        // o ooh já acabou (1,2 s + o respiro de 1,6 s)
  assert.equal(h.plateia.busy(), false);
  assert.equal(h.plateia.react('fogos', 4000), false, 'cooldown de 9 s');
  assert.equal(h.plateia.react('fogos', 9500), true);
  const w = fakeCrowd();
  w.fx.wave = { at: 0, dir: 1 };
  assert.equal(w.plateia.react('porte', 0), false, 'a ola segura a reação');
  assert.equal(fakeCrowd({ rows: [2, 0, 0] }).plateia.react('porte', 0), false, 'plateia pequena');
  // A Mandioca começando a dançar chama a cantoria (uma vez, na subida), e no modo quieto não.
  const d = fakeCrowd();
  d.plateia.update(engineOf(true), 0);                      // já dançando quando a festa abre: não é "começou"
  assert.equal(d.plateia.busy(), false);
  d.plateia.reset();
  d.plateia.update(engineOf(false), 0);
  d.plateia.update(engineOf(true), 100);
  assert.equal(d.plateia.current().id, 'cantoria');
  assert.equal(d.plateia.current().by, 'reacao');
  const q = fakeCrowd();
  q.plateia.update(engineOf(false), 0, true);
  q.plateia.update(engineOf(true), 100, true);
  assert.equal(q.plateia.busy(), false, 'na chuva a cantoria espera');
  // O clique do jogador: o número nasce na pessoa, escolhe um dos sorteáveis, e não interrompe outro.
  const c = fakeCrowd();
  assert.equal(c.plateia.pull(120, 3000), true);
  const pulled = c.plateia.current();
  assert.equal(pulled.by, 'clique');
  assert.ok(ACTS[pulled.id].weight > 0);
  assert.equal(c.plateia.pull(200, 3100), false, 'um de cada vez');
  assert.equal(c.plateia.probe().pulled, 1);
  const own = c.guests.find(item => item.guest.x === c.lay.audience.reduce((best, g2) => (Math.abs(g2.x - 120) < Math.abs(best.x - 120) ? g2 : best)).x);
  assert.notEqual(c.plateia.pose(own.row, own.guest, own.seed, 120, 3000), null, 'a onda começa em quem foi clicado');
  const none = fakeCrowd({ rows: [3, 0, 0] });
  assert.equal(none.plateia.pull(50, 0), false, 'com 3 pessoas não há número');
  const waving = fakeCrowd();
  waving.fx.wave = { at: 0, dir: 1 };
  assert.equal(waving.plateia.pull(50, 0), false, 'e não no meio da ola');
  f.plateia.start('palmas', 0);
  f.plateia.reset();
  assert.equal(f.plateia.busy(), false);
  assert.equal(f.plateia.pose(0, f.lay.audience[0], 1, f.lay.audience[0].x, 100), null);
});

test('plateia na festa: clicar em alguém da plateia puxa um número, a pose muda no desenho e a ola e o número nunca se sobrepõem', comGlobais({ ArraiaFestaPlateia: Plateia }, () => {
  const calls = { drawImage: 0 };
  globalThis.document = fakeDocument([], calls);
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle, {});
  festa.setScale(3);
  const engine = new GameEngine(data, null, { rng: () => 0.3 });
  engine.state.size = engine.state.records.size = 90;
  engine.state.weather.nextAt = 1e18;
  engine.state.mundo.nextAt = 1e18;
  let now = 5000;
  for (let i = 0; i < 40; i++) festa.draw(engine, (now += 17));
  const spectators = festa.areas().filter(area => area.id.startsWith('bicho:plateia:'));
  assert.ok(spectators.length >= 20, `a plateia é clicável (${spectators.length})`);
  assert.equal(festa.probe().plateia.current, null, 'nada no ar');
  const before = calls.drawImage;
  festa.poke(spectators[3].id);
  const current = festa.probe().plateia.current;
  assert.ok(current && current.by === 'clique', 'o clique puxou um número');
  assert.ok(festa.probe().texts >= 1, 'o grito do número');
  now = Math.max(now, current.at + 50);        // o clique usa o relógio da página; o teste desenha com um relógio dele
  for (let i = 0; i < 120; i++) festa.draw(engine, (now += 17));
  assert.ok(calls.drawImage > before, 'a festa segue desenhando');
  assert.ok(festa.probe().plateia.drawn > 0, 'as pessoas entraram no número (poses e enfeites)');
  festa.poke(spectators[5].id);
  assert.equal(festa.probe().plateia.pulled, 1, 'enquanto um está no ar, outro clique não puxa');
  assert.equal(festa.probe().plateia.current.origin, Number(spectators[3].id.split(':')[2]), 'o número nasce em quem foi clicado');
  // Cada número pode ser chamado de fora (o modo de teste e a gravação dos vídeos): todos desenham sem quebrar.
  for (const id of IDS) {
    assert.equal(festa.provocar('plateia', { ordem: id }), true, id);
    assert.equal(festa.probe().plateia.current.id, id);
    for (let i = 0; i < 90; i++) festa.draw(engine, (now += 33));
  }
  assert.equal(festa.provocar('plateia', { ordem: 'palmas', lado: 150 }), true);
  assert.equal(festa.provocar('plateia', {}), true, 'sem id, as palmas');
  // Nunca ola e número ao mesmo tempo.
  let both = 0;
  for (let i = 0; i < 6000; i++) {
    festa.draw(engine, (now += 100));
    const probe = festa.probe().plateia;
    if (probe.current && festa.probe().wave) both++;
  }
  assert.equal(both, 0);
  assert.ok(festa.probe().plateia.started.length >= 3, 'sozinha, a plateia faz números de tempos em tempos');
  // Voltar a zero.
  festa.reset();
  assert.equal(festa.probe().plateia.current, null);
}));

test('plateia na festa: a pose do número é aplicada ao desenho (pulo e deslocamento) e os acontecimentos da festa chamam a plateia', comGlobais({ ArraiaFestaPlateia: Plateia }, () => {
  const instances = [];
  const realCreate = Plateia.create;
  Plateia.create = ctx => { const instance = realCreate(ctx); instances.push(instance); return instance; };
  try {
    globalThis.document = fakeDocument([], { drawImage: 0 });
    globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
    require('../src/festa.js');
    const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle, {});
    festa.setScale(3);
    const [plateia] = instances.slice(-1);
    const engine = new GameEngine(data, null, { rng: () => 0.3 });
    engine.state.size = engine.state.records.size = 90;
    engine.state.weather.nextAt = 1e18;
    engine.state.mundo.nextAt = 1e18;
    let now = 5000;
    for (let i = 0; i < 40; i++) festa.draw(engine, (now += 17));
    // Com uma pose falsa para todo mundo, o `over` recebe a posição final: some o pulo e o deslocamento e a diferença é exatamente a da pose.
    const overs = [];
    const realPose = plateia.pose, realOver = plateia.over;
    let fake = { step: 0, hop: 0, dx: 0 };
    plateia.pose = () => fake;
    plateia.over = (row, guest, seed, x, top, flip, at) => overs.push({ row, guest, x, top, flip });
    const grab = pose => { fake = pose; overs.length = 0; festa.draw(engine, (now += 17)); return overs.map(item => ({ ...item })); };
    const base = grab({ step: 0, hop: 0, dx: 0 });
    const moved = grab({ step: 0, hop: -3, dx: 2 });
    // Cada pessoa tem a sua região clicável, com o x dela no id (é dali que o número nasce quando ela é clicada).
    const regionXs = festa.areas().filter(area => area.id.startsWith('bicho:plateia:')).map(area => Number(area.id.split(':')[2])).sort((p, q) => p - q);
    assert.deepEqual(regionXs, base.map(item => Math.round(item.guest.x)).sort((p, q) => p - q), 'o id da região é o x da pessoa');
    assert.ok(base.length >= 20, `todas as pessoas das três fileiras passam pelo enfeite (${base.length})`);
    assert.equal(moved.length, base.length);
    base.forEach((item, i) => {
      assert.equal(moved[i].top, item.top - 3, 'o pulo sobe a pessoa');
      assert.equal(moved[i].x, item.x + 2, 'o deslocamento a empurra de lado');
    });
    const flipped = grab({ step: 0, hop: 0, dx: 0, flip: true });
    assert.ok(flipped.every(item => item.flip === true), 'o número pode virar a pessoa');
    plateia.pose = realPose;
    plateia.over = realOver;
    // Acontecimentos da festa: chegou gente (boas-vindas), subiu de porte (ovação), bingo (pula-pula) e meta cumprida (palmas).
    const cues = { 'size-up': 'oi', 'tier-up': 'ovacao', legendary: 'ovacao', 'bingo-win': 'pulapula', 'goal-done': 'palmas' };
    for (const [type, id] of Object.entries(cues)) {
      festa.reset();
      for (let i = 0; i < 5; i++) festa.draw(engine, (now += 17));
      festa.onEvents(engine, [{ type, size: 20, count: 1 }], now);
      assert.equal(festa.probe().plateia.current?.id, id, `${type} chama ${id}`);
      assert.equal(festa.probe().plateia.current.by, 'reacao');
    }
    festa.reset();
    // Os fogos que estouram na festa grande tiram um "ooh" da plateia (de vez em quando, não a cada estouro).
    engine.state.size = engine.state.records.size = 300;
    for (let i = 0; i < 3000; i++) festa.draw(engine, (now += 100));
    assert.ok(festa.probe().plateia.started.includes('fogos'), 'o ooh dos fogos aconteceu');
  } finally {
    Plateia.create = realCreate;
  }
}));

test('plateia na festa: na chuva forte a plateia não faz número sozinha (e volta quando passa)', comGlobais({ ArraiaFestaPlateia: Plateia }, () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle, {});
  festa.setScale(3);
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(data, null, { rng: () => 0.3, now: () => clock.t });
  engine.state.size = engine.state.records.size = 90;
  engine.state.mundo.nextAt = 1e18;
  engine.state.weather.nextAt = 1e18;
  let now = 5000;
  const run = ms => { for (let spent = 0; spent < ms; spent += 100) { now += 100; clock.t += 100; engine.state.weather.nextAt = 1e18; festa.draw(engine, now); } };
  engine.state.weather.rain = { born: clock.t - 10000, until: clock.t + 400000 };
  run(240000);
  assert.ok(festa.probe().rain > 0.3, 'está chovendo');
  assert.equal(festa.probe().plateia.started.length, 0, 'na chuva a plateia não faz número');
  engine.state.weather.rain = null;
  run(120000);
  assert.ok(festa.probe().plateia.started.length >= 1, 'passou a chuva, ela volta a fazer');
}));
