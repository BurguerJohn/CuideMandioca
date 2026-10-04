const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../src/data.js');
const { GameEngine } = require('../src/core.js');

require('../src/festa-mundo-extras.js');

const cfg = data.mundo;
const IDS = ['bolhas', 'avioes', 'patinhos', 'abelhas', 'planetas', 'circo', 'balada', 'baleia', 'baloagigante', 'fada'];
const entryOf = id => cfg.eventos.find(entry => entry.id === id);

function newEngine(size = 60, rngValue = 0.5) {
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(data, null, { rng: typeof rngValue === 'function' ? rngValue : () => rngValue, now: () => clock.t });
  engine.state.size = engine.state.records.size = size;
  return { engine, clock };
}

test('eventos avulsos: são dez, sem tema (valem com qualquer roupa), com raridades, tamanhos e prêmios variados', () => {
  const extras = IDS.map(entryOf);
  assert.ok(extras.every(Boolean), 'todos existem nos dados');
  assert.ok(extras.every(entry => !entry.tema), 'nenhum pede conjunto');
  const rarity = id => { const { engine } = newEngine(); return engine.mundo.rarity(entryOf(id)); };
  assert.deepEqual(IDS.filter(id => rarity(id) === 'common'), ['bolhas', 'avioes']);
  assert.deepEqual(IDS.filter(id => rarity(id) === 'rare'), ['baloagigante', 'fada']);
  assert.equal(IDS.filter(id => rarity(id) === 'uncommon').length, 6);
  // Os dois raros são de vários golpes, com prêmio bem maior que o dos comuns.
  assert.deepEqual([entryOf('baloagigante').hits, entryOf('fada').hits], [7, 5]);
  assert.ok(entryOf('baloagigante').finale.tickets + entryOf('baloagigante').reward.tickets >= 20);
  assert.ok(extras.every(entry => entry.targets >= 1 && entry.seconds >= 40 && entry.seconds <= 50));
  // Pedem festas de tamanhos diferentes: da pequena (12) à grande (50).
  assert.deepEqual([...new Set(extras.map(entry => entry.minSize))].sort((a, b) => a - b), [12, 15, 20, 30, 35, 40, 45, 50]);
  // Todos aparecem no sorteio sem conjunto nenhum vestido (cada um num ponto da roleta).
  const seen = new Set();
  for (let roll = 0; roll < 1; roll += 0.004) seen.add(newEngine(200, () => roll).engine.mundo.pick());
  for (const id of IDS) assert.ok(seen.has(id), `${id}: entra no sorteio`);
  // E uma festa pequena só vê os que cabem.
  const small = newEngine(12, 0.99).engine;
  assert.ok(entryOf(small.mundo.pick()).minSize <= 12);
});

test('eventos avulsos: começam, valem prêmio e acabam como os outros (vários golpes na fada e no balão, e o prêmio final)', () => {
  const { engine, clock } = newEngine(80);
  for (const id of IDS) {
    engine.state.mundo.active = null;
    assert.equal(engine.mundo.start(id), true, id);
    const entry = engine.mundo.event(id);
    let last;
    for (let k = 0; k < entry.targets; k++) { do { last = engine.mundo.catchTarget(k); } while (last.partial); assert.equal(last.ok, true, `${id}: alvo ${k}`); }
    assert.equal(last.all, true, `${id}: pegou todos`);
    assert.ok(Object.keys(last.finale).length, `${id}: prêmio final`);
    assert.equal(engine.state.mundo.done[id], 1);
  }
  // A fada: cinco golpes (os quatro primeiros só avisam).
  engine.state.mundo.active = null;
  engine.mundo.start('fada');
  for (let i = 1; i <= 4; i++) assert.deepEqual([engine.mundo.catchTarget(0).partial, engine.state.mundo.active.hits[0]], [true, i]);
  assert.equal(engine.mundo.catchTarget(0).partial, undefined, 'o quinto paga');
  clock.t += 1;
});

// --- A geometria (src/festa-mundo-extras.js) ----------------------------------------------------------------------------------------

const rnd = (seed, i, j = 0) => { const x = Math.sin(seed * 12.9898 + i * 78.233 + j * 37.719) * 43758.5453; return x - Math.floor(x); };
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const spread = (c, k, from, stepMs, life) => { const p = (c.t - (from + k * stepMs)) / life; return p >= 0 && p < 1 ? p : -1; };
const step = (c, from, tail) => (c.n > 1 ? (c.dur - from - tail) / (c.n - 1) : 0);
const LAY = { L: 20, R: 420, width: 400, host: { x: 200 } };

function fakeHelpers() {
  const calls = { fills: [], particles: [], says: [], sounds: [], confetti: [], floats: [], flash: [] };
  const g = { fillStyle: '', globalAlpha: 1, globalCompositeOperation: 'source-over', fillRect: (x, y, w, h) => calls.fills.push([x, y, w, h, g.fillStyle]) };
  const fxState = { particles: calls.particles, flashUntil: 0 };
  const helpers = { g, halo: () => {}, say: text => calls.says.push(text), float: () => calls.floats.push(1), confetti: (now, x, y, n) => calls.confetti.push(n), sound: name => calls.sounds.push(name),
    rng: () => 0.5, fx: () => fxState, layout: () => LAY, ground: () => 160, poleTop: () => 60, tint: () => {}, particle: p => calls.particles.push(p), rnd, clamp, spread, step, tr: key => key };
  return { helpers, calls, fxState };
}
const eventC = (id, t, extra = {}) => {
  const entry = entryOf(id);
  return { id, entry, t, dur: entry.seconds * 1000, n: entry.targets, seed: 12345, dir: 1, got: new Set(), now: 100000 + t, a: { born: 100000, hits: {} }, items: [], k: 1, ...extra };
};
const itemsOf = (T, id, t, extra = {}) => {
  const c = eventC(id, t, extra);
  const items = [];
  for (let k = 0; k < c.n; k++) { const item = T.TARGETS[id](c, k, LAY); if (item) items.push({ k, ...item }); }
  return { c, items };
};

test('alvos avulsos: cada um nasce, anda e some dentro da festa e do tempo do evento, e todos podem ser pegos', () => {
  const { helpers } = fakeHelpers();
  const T = globalThis.ArraiaMundoExtras.create(helpers);
  for (const id of IDS) {
    const entry = entryOf(id);
    assert.equal(typeof T.TARGETS[id], 'function', `${id}: posição`);
    assert.equal(typeof T.OVER[id], 'function', `${id}: desenho`);
    const everSeen = new Set();
    for (let t = 0; t <= entry.seconds * 1000; t += 200) {
      for (let k = 0; k < entry.targets; k++) {
        const item = T.TARGETS[id](eventC(id, t), k, LAY);
        if (!item) continue;
        everSeen.add(k);
        assert.ok(item.w > 0 && item.h > 0, `${id}: caixa de clique`);
        assert.ok(Number.isFinite(item.x) && Number.isFinite(item.y), `${id}: posição`);
        assert.ok(item.x >= LAY.L - 45 && item.x <= LAY.R + 45, `${id}: x ${item.x} @${t}`);
        assert.ok(item.y >= 0 && item.y <= 165, `${id}: y ${item.y} @${t}`);
      }
    }
    assert.equal(everSeen.size, entry.targets, `${id}: todos os alvos aparecem em algum momento`);
  }
});

test('alvos avulsos: bolhas sobem do chão, aviõezinhos cruzam o céu no sentido do evento e os patinhos desfilam em fila, o da frente puxando', () => {
  const { helpers } = fakeHelpers();
  const T = globalThis.ArraiaMundoExtras.create(helpers);
  // Bolhas: só sobem (y diminui o tempo todo) e crescem um pouco.
  for (let k = 0; k < 8; k++) {
    const path = [];
    for (let t = 0; t <= 45000; t += 100) { const item = T.TARGETS.bolhas(eventC('bolhas', t), k, LAY); if (item) path.push(item); }
    assert.ok(path.length > 50, `bolha ${k}`);
    assert.ok(path.every((item, i) => i === 0 || item.y < path[i - 1].y), `bolha ${k}: sempre sobe`);
    assert.ok(path.at(-1).r >= path[0].r, 'e cresce');
  }
  // Aviões: atravessam a festa no sentido dir, em qualquer dos dois lados.
  for (const dir of [1, -1]) {
    for (let k = 0; k < 6; k++) {
      const path = [];
      for (let t = 0; t <= 42000; t += 100) { const item = T.TARGETS.avioes(eventC('avioes', t, { dir }), k, LAY); if (item) path.push(item); }
      assert.ok(dir * (path.at(-1).x - path[0].x) > LAY.width * 0.8, `avião ${k} no sentido ${dir}`);
      assert.ok(path.every(item => Number.isInteger(item.tilt) && Math.abs(item.tilt) <= 3), 'inclinação pequena');
    }
  }
  // Patinhos: em fila, a 20 px um do outro, o primeiro à frente (para onde o evento anda), entrando um depois do outro.
  for (const dir of [1, -1]) {
    let t = 6000;
    let items = itemsOf(T, 'patinhos', t, { dir }).items;
    for (; t < 40000 && items.length < 4; t += 500) items = itemsOf(T, 'patinhos', t, { dir }).items;
    assert.ok(items.length >= 3, 'vários patinhos ao mesmo tempo');
    for (let i = 1; i < items.length; i++) {
      assert.ok(Math.abs(items[i].x - items[i - 1].x) - 20 < 0.001 && dir * (items[i - 1].x - items[i].x) > 0, `patinho ${items[i].k} atrás do ${items[i - 1].k}`);
    }
    assert.equal(items[0].role === 1 || items[0].k !== 0, true);
    assert.ok(items.every(item => item.y > 140 && item.y < 160), 'no chão');
  }
  assert.equal(itemsOf(T, 'patinhos', 0).items.length, 0, 'no começo ainda ninguém entrou');
  assert.equal(T.TARGETS.patinhos(eventC('patinhos', 20000), 0, LAY).role, 1, 'o da frente usa o chapéu');
  assert.equal(T.TARGETS.patinhos(eventC('patinhos', 20000), 5, LAY)?.role ?? 2, 2, 'o último, o laço');
});

test('alvos avulsos: as abelhas zigue-zagueiam rápido, as luas giram em órbita, o canhão manda os palhaços em parábola e a baleia leva o cardume atrás', () => {
  const { helpers } = fakeHelpers();
  const T = globalThis.ArraiaMundoExtras.create(helpers);
  // Abelhas: entram uma a uma e mudam de posição bastante entre dois instantes próximos (50 ms).
  assert.equal(itemsOf(T, 'abelhas', 1000).items.length, 0);
  assert.ok(itemsOf(T, 'abelhas', 20000).items.length === 7);
  let biggest = 0;
  for (let t = 5000; t < 30000; t += 50) {
    const a = T.TARGETS.abelhas(eventC('abelhas', t), 0, LAY);
    const b = T.TARGETS.abelhas(eventC('abelhas', t + 50), 0, LAY);
    biggest = Math.max(biggest, Math.hypot(b.x - a.x, b.y - a.y));
    assert.ok(a.x > LAY.L && a.x < LAY.R && a.y > 80 && a.y < 160, 'fica na festa, na altura do povo');
  }
  assert.ok(biggest > 2.5, `anda depressa (${biggest.toFixed(1)} px por 50 ms)`);
  // Além do passeio lento (que se repete a cada 2π·2300 ms), há um tremelique rápido de lado a lado: depois de um período do passeio ela não está no mesmo lugar.
  let different = 0;
  for (let t = 6000; t < 12000; t += 400) {
    const a = T.TARGETS.abelhas(eventC('abelhas', t), 0, LAY);
    const b = T.TARGETS.abelhas(eventC('abelhas', t + 2300 * 2 * Math.PI), 0, LAY);
    if (Math.abs(a.x - b.x) > 1) different++;
  }
  assert.ok(different >= 10, `a abelha tremelica de lado a lado (${different} de 15 amostras)`);
  // Luas: a distância ao planeta fica dentro da órbita (elipse achatada) e elas dão a volta (passam pela frente e por trás).
  const c0 = eventC('planetas', 5000);
  const planet = { x: LAY.L + LAY.width * (0.3 + 0.4 * rnd(c0.seed, 1)), y: Math.max(24, Math.round(60 * 0.5)) };
  for (let k = 0; k < 5; k++) {
    let front = false;
    let back = false;
    for (let t = 0; t <= 50000; t += 100) {
      const item = T.TARGETS.planetas(eventC('planetas', t), k, LAY);
      const dx = (item.x - planet.x) / (26 + k * 7);
      const dy = (item.y - planet.y) / (6 + k * 1.6);
      assert.ok(Math.abs(dx * dx + dy * dy - 1) < 0.001, `lua ${k}: na órbita`);
      if (item.front) front = true; else back = true;
    }
    assert.ok(front && back, `lua ${k}: dá a volta`);
  }
  // Palhaços: saem do lado do canhão, sobem até bem alto, voltam e caem no chão do outro lado (a rede), um depois do outro.
  for (const dir of [1, -1]) {
    const cannonX = dir > 0 ? LAY.L + 8 : LAY.R - 8;
    for (let k = 0; k < 5; k++) {
      const path = [];
      for (let t = 0; t <= 50000; t += 50) { const item = T.TARGETS.circo(eventC('circo', t, { dir }), k, LAY); if (item) path.push({ ...item, t }); }
      assert.ok(path.length > 80, `palhaço ${k}: voa uns 4,6 s`);
      assert.ok(Math.abs(path[0].x - cannonX) < 40, `palhaço ${k}: sai do canhão (${path[0].x})`);
      assert.ok(Math.min(...path.map(item => item.y)) < 110, `palhaço ${k}: sobe alto`);
      assert.ok(path.at(-1).y > 125, `palhaço ${k}: termina perto do chão`);
      assert.ok(dir * (path.at(-1).x - path[0].x) > 150, `palhaço ${k}: cruza uma boa parte da festa`);
      const top = path.reduce((best, item) => (item.y < best.y ? item : best), path[0]);
      assert.ok(top.t > path[0].t && top.t < path.at(-1).t, 'o ponto mais alto fica no meio do voo');
    }
    assert.ok(T.TARGETS.circo(eventC('circo', 0, { dir }), 0, LAY) === null, 'antes do primeiro tiro não tem palhaço');
  }
  // Baleia: o cardume vai atrás dela (no sentido contrário ao do evento), à esquerda da baleia quando ela vai para a direita.
  for (const dir of [1, -1]) {
    const c = eventC('baleia', 25000, { dir });
    const fishes = [];
    for (let k = 0; k < 6; k++) { const item = T.TARGETS.baleia(c, k, LAY); if (item) fishes.push(item); }
    assert.ok(fishes.length >= 2, `no meio do evento há peixes na festa (${dir})`);
    for (let i = 1; i < fishes.length; i++) assert.ok(dir * (fishes[i - 1].x - fishes[i].x) > 0, 'em fila, o primeiro mais perto da baleia');
  }
  let atEnd = 0;
  for (let t = 0; t <= 50000; t += 500) atEnd += itemsOf(T, 'baleia', t).items.length;
  assert.ok(atEnd > 40, 'os peixes passam um bom tempo na festa');
});

test('alvos avulsos: a balada pula no ritmo, o balão atravessa o céu encolhendo a cada golpe, a fada muda de lugar a cada golpe (sempre dentro da festa)', () => {
  const { helpers } = fakeHelpers();
  const T = globalThis.ArraiaMundoExtras.create(helpers);
  // Balada: as luzes quicam no chão (y varia entre o chão e uns 12 px acima) e vão e vêm pela pista.
  const ys = [];
  const xs = [];
  for (let t = 0; t < 10000; t += 20) { const item = T.TARGETS.balada(eventC('balada', t), 0, LAY); ys.push(item.y); xs.push(item.x); }
  assert.ok(Math.min(...ys) < 145 && Math.max(...ys) > 148 && Math.max(...ys) <= 160, 'quica');
  assert.ok(Math.max(...xs) - Math.min(...xs) > 150, 'passeia pela pista');
  // Balão: cruza de um lado ao outro e cada golpe encolhe a caixa de clique.
  const sizes = [];
  for (let hits = 0; hits < 7; hits++) sizes.push(T.TARGETS.baloagigante(eventC('baloagigante', 20000, { a: { born: 0, hits: { 0: hits } } }), 0, LAY));
  assert.ok(sizes.every((item, i) => i === 0 || (item.h < sizes[i - 1].h && item.sc < sizes[i - 1].sc)), 'encolhe a cada golpe');
  const start = T.TARGETS.baloagigante(eventC('baloagigante', 100), 0, LAY);
  const end = T.TARGETS.baloagigante(eventC('baloagigante', 44900), 0, LAY);
  assert.ok(end.x - start.x > LAY.width * 0.9, 'atravessa a festa');
  assert.ok(start.y - start.h / 2 >= -1, 'sem sair pelo teto');
  // Fada: nada nos primeiros 1,5 s; cada golpe leva a fada a um lugar novo, dentro da festa e na altura do povo.
  assert.equal(T.TARGETS.fada(eventC('fada', 1000), 0, LAY), null);
  const spots = [];
  for (let hits = 0; hits < 5; hits++) {
    const item = T.TARGETS.fada(eventC('fada', 20000, { a: { born: 0, hits: { 0: hits } } }), 0, LAY);
    assert.equal(item.hits, hits);
    assert.ok(item.x > LAY.L + 8 && item.x < LAY.R - 8 && item.y > 80 && item.y < 135, `golpe ${hits}: (${Math.round(item.x)}, ${Math.round(item.y)})`);
    spots.push(Math.round(item.x));
  }
  assert.equal(new Set(spots).size, 5, 'cada golpe num lugar diferente');
});

test('reações avulsas: cada alvo pego solta o que é dele (estoura, penas, mel, confete, desejo) e os golpes do balão e da fada tratam o martelo', () => {
  const { helpers, calls, fxState } = fakeHelpers();
  const T = globalThis.ArraiaMundoExtras.create(helpers);
  const reset = () => { for (const key of Object.keys(calls)) calls[key].length = 0; fxState.flashUntil = 0; };
  const caught = (id, x = 200, y = 100, extra = {}) => { reset(); T.catchFx(eventC(id, 10000, extra), { k: 0, all: false }, x, y, 5000); };
  caught('bolhas');
  assert.equal(calls.particles.length, 14, 'anel de gotinhas');
  assert.deepEqual(calls.sounds, ['bolha']);
  caught('avioes');
  assert.ok(calls.particles.length >= 6);
  assert.deepEqual(calls.sounds, ['assobio']);
  caught('abelhas');
  assert.deepEqual([calls.says, calls.sounds], [['fx.abelhaMel'], ['acerto']]);
  caught('patinhos');
  assert.deepEqual([calls.sounds, calls.particles.length > 0], [['pato'], true]);
  caught('planetas');
  assert.deepEqual(calls.sounds, ['brilho']);
  caught('circo');
  assert.deepEqual([calls.says, calls.confetti], [['fx.circoTcharam'], [30]]);
  caught('balada');
  assert.deepEqual(calls.sounds, ['palco-triangulo']);
  caught('baleia');
  assert.deepEqual(calls.sounds, ['bolha']);
  // O balão e a fada: o último golpe é a explosão; os golpes do meio devolvem true (sem o martelo da pinhata) e deixam o balão balançar.
  caught('baloagigante');
  assert.deepEqual([calls.says, calls.sounds, calls.confetti], [['fx.baloaPiu'], ['murchar'], [90]]);
  assert.ok(calls.particles.length >= 40 && fxState.flashUntil > 5000, 'estouro com clarão');
  caught('fada');
  assert.deepEqual([calls.says, calls.sounds, calls.confetti], [['fx.fadaDesejo'], ['brilho'], [60]]);
  reset();
  assert.equal(T.hitFx(eventC('baloagigante', 10000), { k: 0, n: 2, of: 7 }, 200, 50, 5000), true);
  assert.deepEqual([calls.says, calls.sounds], [['fx.baloaSsh'], ['carinho']]);
  reset();
  assert.equal(T.hitFx(eventC('fada', 10000), { k: 0, n: 2, of: 5 }, 200, 100, 5000), true);
  assert.equal(calls.particles.length, 16);
  assert.deepEqual(calls.sounds, ['brilho']);
  assert.equal(T.hitFx(eventC('pinhata', 10000), { k: 0, n: 1, of: 6 }, 200, 50, 5000), false, 'outros eventos seguem com o martelo');
  assert.equal(T.shake(eventC('bolhas', 5000), 1000), null, 'nada balança a festa');
});

test('desenho avulso: todo bicho e toda cena desenha sem erro, o canhão dispara uma vez por tiro (com estrondo e confete), e o balão balança logo depois do golpe', () => {
  const { helpers, calls } = fakeHelpers();
  const T = globalThis.ArraiaMundoExtras.create(helpers);
  for (const [name, draw] of Object.entries(T.DRAW)) {
    calls.fills.length = 0;
    if (name === 'bubble') draw(50, 50, 8, 1000, 0);
    else if (name === 'plane') draw(50, 50, 1, 0, 1);
    else if (name === 'bee' || name === 'duck') draw(50, 50, -1, 1000, 0, 1);
    else if (name === 'planet') { draw(50, 50, 1000, true); draw(50, 50, 1000, false); }
    else if (name === 'moon') draw(50, 50, 2);
    else if (name === 'cannon') draw(50, 150, 1, 1000, 100);
    else if (name === 'clown') draw(50, 50, 1000, 3);
    else if (name === 'net') draw(50, 150);
    else if (name === 'balloon') draw(50, 50, 1000, 0.6, true);
    else if (name === 'discoBall') draw(50, 30, 1000);
    else if (name === 'whale') draw(100, 30, -1, 1000);
    else if (name === 'fish') draw(50, 50, 1, 1000, 1);
    else if (name === 'fairy') draw(50, 50, 1000);
    else if (name === 'orb') draw(50, 150, 1000, 2);
    assert.ok(calls.fills.length > 5, `${name}: desenhou`);
    assert.ok(calls.fills.every(fill => fill.slice(0, 4).every(Number.isFinite)), `${name}: só números`);
  }
  for (const id of IDS) {
    const entry = entryOf(id);
    for (const t of [1500, 9000, entry.seconds * 1000 - 2000]) {
      calls.fills.length = 0;
      const { c } = itemsOf(T, id, t);
      c.items = [];
      for (let k = 0; k < entry.targets; k++) { const item = T.TARGETS[id](c, k, LAY); if (item) c.items.push({ k, ...item }); }
      assert.doesNotThrow(() => { (T.SKY[id] || (() => {}))(c, 100000 + t); T.OVER[id](c, 100000 + t); }, `${id} @${t}`);
      assert.ok(calls.fills.every(fill => fill.slice(0, 4).every(Number.isFinite)), `${id} @${t}: só números`);
    }
  }
  // O canhão: cada tiro solta um estrondo e confete uma vez só, mesmo desenhando muitos quadros seguidos.
  T.reset();
  calls.sounds.length = 0;
  calls.confetti.length = 0;
  const shotAt = k => 2500 + k * 9500;
  for (let t = 0; t <= 12100; t += 33) T.OVER.circo(eventC('circo', t), 100000 + t);
  assert.equal(calls.sounds.filter(name => name === 'canhao').length, 2, 'dois tiros nos primeiros 12 s');
  assert.equal(calls.confetti.length, 2);
  assert.ok(shotAt(1) <= 12100);
  T.reset();
  calls.sounds.length = 0;
  for (let t = 0; t <= 12100; t += 33) T.OVER.circo(eventC('circo', t), 100000 + t);
  assert.equal(calls.sounds.filter(name => name === 'canhao').length, 2, 'depois do reset dispara de novo');
  assert.equal(T.probe().fired, 2);
  // O balão: logo depois de um golpe desenha deslocado para o lado (balançando) e depois volta ao lugar.
  const loc = id => { calls.fills.length = 0; const { c } = itemsOf(T, id, 20000); c.items = [{ k: 0, ...T.TARGETS[id](c, 0, LAY) }]; T.OVER[id](c, 120000 + 0); return calls.fills.map(fill => fill[0]); };
  T.reset();
  const quiet = loc('baloagigante');
  T.hitFx(eventC('baloagigante', 20000), { k: 0, n: 1, of: 7 }, 200, 50, 5000);
  assert.equal(T.probe().hits, 1);
  calls.fills.length = 0;
  const { c } = itemsOf(T, 'baloagigante', 20000);
  c.items = [{ k: 0, ...T.TARGETS.baloagigante(c, 0, LAY) }];
  T.OVER.baloagigante(c, 5040);
  const shaking = calls.fills.map(fill => fill[0]);
  T.OVER.baloagigante(c, 5000 + 4000);
  assert.notDeepEqual(shaking.slice(0, 20), quiet.slice(0, 20));
  // O canhão: o clarão da boca (pontinhos amarelos) só aparece logo depois do tiro.
  const flash = at => { calls.fills.length = 0; T.OVER.circo(eventC('circo', at), 100000 + at); return calls.fills.filter(fill => fill[4] === '#ffe27a').length; };
  T.reset();
  assert.ok(flash(2500 + 100) >= 8, 'clarão logo depois do tiro');
  assert.equal(flash(2500 + 1200), 0, 'e some em seguida');
});
