const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../src/data.js');
const { GameEngine } = require('../src/core.js');

require('../src/festa-mundo-extras2.js');

const cfg = data.mundo;
const IDS = ['chapeus', 'toupeiras', 'pelada', 'vacalua', 'coelho', 'fumaca', 'aurora', 'tubaroes'];
const entryOf = id => cfg.eventos.find(entry => entry.id === id);

function newEngine(size = 60, rngValue = 0.5) {
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(data, null, { rng: typeof rngValue === 'function' ? rngValue : () => rngValue, now: () => clock.t });
  engine.state.size = engine.state.records.size = size;
  return { engine, clock };
}

test('segunda leva de avulsos: são oito, sem tema, com um comum, seis incomuns e um raro, e todos entram no sorteio sem conjunto nenhum', () => {
  assert.ok(IDS.every(id => entryOf(id) && !entryOf(id).tema));
  const { engine } = newEngine();
  const rarity = id => engine.mundo.rarity(entryOf(id));
  assert.deepEqual(IDS.filter(id => rarity(id) === 'common'), ['chapeus']);
  assert.deepEqual(IDS.filter(id => rarity(id) === 'rare'), ['tubaroes']);
  assert.equal(IDS.filter(id => rarity(id) === 'uncommon').length, 6);
  assert.equal(entryOf('pelada').hits, 6);
  assert.deepEqual([...new Set(IDS.map(id => entryOf(id).minSize))].sort((a, b) => a - b), [15, 20, 25, 30, 35, 40]);
  const seen = new Set();
  for (let roll = 0; roll < 1; roll += 0.003) seen.add(newEngine(200, () => roll).engine.mundo.pick());
  for (const id of IDS) assert.ok(seen.has(id), `${id}: entra no sorteio`);
});

test('segunda leva de avulsos: cada evento começa, paga cada alvo (a pelada em seis chutes) e o prêmio final', () => {
  const { engine } = newEngine(80);
  for (const id of IDS) {
    engine.state.mundo.active = null;
    assert.equal(engine.mundo.start(id), true, id);
    const entry = engine.mundo.event(id);
    let last;
    for (let k = 0; k < entry.targets; k++) { do { last = engine.mundo.catchTarget(k); } while (last.partial); assert.equal(last.ok, true, `${id}:${k}`); }
    assert.equal(last.all, true, id);
    assert.ok(Object.keys(last.finale).length, `${id}: prêmio final`);
  }
  engine.state.mundo.active = null;
  engine.mundo.start('pelada');
  for (let i = 1; i <= 5; i++) assert.deepEqual([engine.mundo.catchTarget(0).partial, engine.state.mundo.active.hits[0]], [true, i]);
  assert.equal(engine.mundo.catchTarget(0).partial, undefined, 'o sexto chute é o gol');
});

// --- A geometria (src/festa-mundo-extras2.js) -------------------------------------------------------------------------------------

const rnd = (seed, i, j = 0) => { const x = Math.sin(seed * 12.9898 + i * 78.233 + j * 37.719) * 43758.5453; return x - Math.floor(x); };
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const spread = (c, k, from, stepMs, life) => { const p = (c.t - (from + k * stepMs)) / life; return p >= 0 && p < 1 ? p : -1; };
const step = (c, from, tail) => (c.n > 1 ? (c.dur - from - tail) / (c.n - 1) : 0);
const LAY = { L: 20, R: 420, width: 400, host: { x: 200 } };

function fakeHelpers() {
  const calls = { fills: [], particles: [], says: [], sounds: [], confetti: [], floats: [] };
  const g = { fillStyle: '', globalAlpha: 1, globalCompositeOperation: 'source-over', fillRect: (x, y, w, h) => calls.fills.push([x, y, w, h, g.fillStyle]) };
  const fxState = { particles: calls.particles, flashUntil: 0 };
  const helpers = { g, halo: () => {}, say: text => calls.says.push(text), float: () => calls.floats.push(1), confetti: (now, x, y, n) => calls.confetti.push(n), sound: name => calls.sounds.push(name),
    rng: () => 0.5, fx: () => fxState, layout: () => LAY, ground: () => 160, poleTop: () => 60, tint: () => {}, particle: p => calls.particles.push(p), rnd, clamp, spread, step, tr: key => key };
  return { helpers, calls };
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

test('alvos da segunda leva: cada um nasce, anda e some dentro da festa e do tempo do evento, e todos podem ser pegos', () => {
  const { helpers } = fakeHelpers();
  const T = globalThis.ArraiaMundoExtras2.create(helpers);
  for (const id of IDS) {
    const entry = entryOf(id);
    assert.equal(typeof T.TARGETS[id], 'function', `${id}: posição`);
    assert.equal(typeof T.OVER[id], 'function', `${id}: desenho`);
    const seen = new Set();
    for (let t = 0; t <= entry.seconds * 1000; t += 200) {
      for (let k = 0; k < entry.targets; k++) {
        const item = T.TARGETS[id](eventC(id, t), k, LAY);
        if (!item) continue;
        seen.add(k);
        assert.ok(item.w > 0 && item.h > 0 && Number.isFinite(item.x) && Number.isFinite(item.y), `${id}: caixa`);
        assert.ok(item.x >= LAY.L - 60 && item.x <= LAY.R + 60, `${id}: x ${item.x} @${t}`);
        assert.ok(item.y >= 0 && item.y <= 165, `${id}: y ${item.y} @${t}`);
      }
    }
    assert.equal(seen.size, entry.targets, `${id}: todos os alvos aparecem`);
  }
});

test('alvos da segunda leva: chapéus caem, a bola quica mais alto a cada chute, as toupeiras só dão para acertar saindo dos cinco buracos', () => {
  const { helpers } = fakeHelpers();
  const T = globalThis.ArraiaMundoExtras2.create(helpers);
  for (let k = 0; k < 8; k++) {
    const path = [];
    for (let t = 0; t <= 45000; t += 100) { const item = T.TARGETS.chapeus(eventC('chapeus', t), k, LAY); if (item) path.push(item); }
    assert.ok(path.length > 40, `chapéu ${k}`);
    assert.ok(path.every((item, i) => i === 0 || item.y > path[i - 1].y), 'só desce');
    assert.ok(path.at(-1).y > 120, 'chega perto do chão');
  }
  // Bola: nada nos primeiros 0,8 s; depois passeia pela festa, quicando entre o chão e uma altura que cresce com os chutes.
  assert.equal(T.TARGETS.pelada(eventC('pelada', 500), 0, LAY), null);
  const peaks = [];
  for (let hits = 0; hits < 6; hits++) {
    let top = 999;
    let xs = [];
    for (let t = 1000; t < 12000; t += 20) {
      const item = T.TARGETS.pelada(eventC('pelada', t, { a: { born: 0, hits: { 0: hits } } }), 0, LAY);
      top = Math.min(top, item.y);
      xs.push(item.x);
      assert.ok(item.y <= 152 && item.air >= 0, 'sempre no chão ou acima');
    }
    peaks.push(top);
    assert.ok(Math.max(...xs) - Math.min(...xs) > 120, 'passeia pela festa');
  }
  assert.ok(peaks.every((peak, i) => i === 0 || peak < peaks[i - 1]), 'quica mais alto a cada chute');
  // Toupeiras: só aparecem quando já saíram pela metade, em um dos cinco montes (todos diferentes e fora da Mandioca), e somem depois.
  const xsSeen = new Set();
  for (let k = 0; k < 8; k++) {
    const path = [];
    for (let t = 0; t <= 45000; t += 50) { const item = T.TARGETS.toupeiras(eventC('toupeiras', t), k, LAY); if (item) path.push({ ...item, t }); }
    assert.ok(path.length > 30, `toupeira ${k}`);
    assert.ok(path.every(item => item.rise >= 0.5 && item.rise <= 1), 'só valem saindo');
    assert.equal(new Set(path.map(item => Math.round(item.x))).size, 1, 'sempre no mesmo buraco');
    assert.ok(Math.abs(path[0].x - 212) >= 12, 'longe da Mandioca');
    xsSeen.add(Math.round(path[0].x));
    const ys = path.map(item => item.y);
    assert.ok(Math.min(...ys) < ys[0] && Math.min(...ys) < ys.at(-1), 'sobe e desce');
    assert.ok(path.at(-1).t - path[0].t < 3400, 'some em uns 3,5 s');
  }
  assert.equal(xsSeen.size, 5, 'os cinco buracos são usados');
});

test('alvos da segunda leva: coelhos saem da cartola e pulam de lado a lado, as vacas cruzam a lua num arco alto, os jatinhos riscam o céu em S e os tubarões giram em volta do funil', () => {
  const { helpers } = fakeHelpers();
  const T = globalThis.ArraiaMundoExtras2.create(helpers);
  const hatX = LAY.L + LAY.width * (0.3 + 0.4 * rnd(12345, 1));
  for (let k = 0; k < 6; k++) {
    const path = [];
    for (let t = 0; t <= 45000; t += 50) { const item = T.TARGETS.coelho(eventC('coelho', t), k, LAY); if (item) path.push(item); }
    assert.ok(path.length > 100, `coelho ${k}`);
    assert.ok(Math.abs(path[0].x - hatX) < 14 && path[0].y < 150, `coelho ${k}: começa saindo da cartola`);
    assert.equal(Math.sign(path.at(-1).x - hatX), k % 2 ? 1 : -1, `coelho ${k}: pula para um lado e outro`);
    assert.ok(Math.abs(path.at(-1).x - hatX) > 70, 'vai para longe');
    assert.ok(path.every(item => item.y < 156), 'pulinhos acima do chão');
  }
  // Vaca: cruza a lua (x do meio do pulo = x da lua) bem acima dela, indo e voltando.
  const moon = { x: LAY.L + LAY.width * 0.62, y: Math.max(32, Math.round(60 * 0.62)) };
  for (let k = 0; k < 4; k++) {
    const path = [];
    for (let t = 0; t <= 40000; t += 50) { const item = T.TARGETS.vacalua(eventC('vacalua', t), k, LAY); if (item) path.push(item); }
    const top = path.reduce((best, item) => (item.y < best.y ? item : best), path[0]);
    assert.ok(Math.abs(top.x - moon.x) < 6, `vaca ${k}: o ponto mais alto é em cima da lua`);
    assert.ok(top.y < moon.y - 10, `vaca ${k}: passa acima da lua (${top.y})`);
    assert.ok(path[0].y > 120 && path.at(-1).y > 120, 'sai e cai atrás da turma');
    assert.equal(Math.sign(path.at(-1).x - path[0].x), k % 2 ? -1 : 1, 'vai e volta');
  }
  // Jatinhos: cada um na sua faixa, cruzando no sentido do evento, um depois do outro.
  for (const dir of [1, -1]) {
    const starts = [];
    const lanes = [];
    for (let k = 0; k < 6; k++) {
      const path = [];
      for (let t = 0; t <= 50000; t += 100) { const item = T.TARGETS.fumaca(eventC('fumaca', t, { dir }), k, LAY); if (item) path.push({ ...item, t }); }
      assert.ok(dir * (path.at(-1).x - path[0].x) > LAY.width * 0.9, `jato ${k}`);
      assert.ok(path.every(item => item.y >= 4 && item.y <= 44), 'no céu');
      starts.push(path[0].t);
      lanes.push(path.reduce((sum, item) => sum + item.y, 0) / path.length);
    }
    assert.ok(starts.every((start, i) => i === 0 || start > starts[i - 1] + 1000), 'entram um depois do outro');
    assert.ok(lanes[0] < lanes[1] && lanes[1] < lanes[2] && Math.abs(lanes[3] - lanes[0]) < 0.5 && Math.abs(lanes[5] - lanes[2]) < 0.5, 'três faixas de altura, uma por jato (o quarto volta à primeira)');
  }
  // Tubarões: giram em volta do funil (passam pela frente e por trás), e o funil passeia pela festa.
  const funnelXs = [];
  for (let t = 0; t <= 50000; t += 500) {
    const { items } = itemsOf(T, 'tubaroes', t);
    const cx = items.reduce((sum, item) => sum + item.x, 0) / items.length;
    funnelXs.push(cx);
    assert.equal(items.length, 6);
  }
  assert.ok(Math.max(...funnelXs) - Math.min(...funnelXs) > 40, 'o funil vai e vem');
  const centers = [];
  for (let t = 0; t <= 50000; t += 250) {
    const cx = T.GEO.funnelAt(eventC('tubaroes', t));
    centers.push(cx);
    for (const item of itemsOf(T, 'tubaroes', t).items) assert.ok(Math.abs(item.x - cx) <= 41, `o tubarão gira em volta do funil (${Math.round(item.x - cx)})`);
  }
  assert.ok(Math.max(...centers) - Math.min(...centers) > 100, 'o próprio funil passeia pela festa');
  assert.ok(centers.every(cx => cx > LAY.L + 20 && cx < LAY.R - 20), 'sem sair da festa');
  for (let k = 0; k < 6; k++) {
    let front = false;
    let back = false;
    for (let t = 0; t <= 50000; t += 100) { const item = T.TARGETS.tubaroes(eventC('tubaroes', t), k, LAY); if (item.front) front = true; else back = true; assert.ok(item.d === 1 || item.d === -1); }
    assert.ok(front && back, `tubarão ${k}: passa pela frente e por trás`);
  }
  // Aurora: os espíritos atravessam o céu, um para cada lado.
  for (let k = 0; k < 5; k++) {
    const path = [];
    for (let t = 0; t <= 50000; t += 100) { const item = T.TARGETS.aurora(eventC('aurora', t), k, LAY); if (item) path.push(item); }
    assert.equal(Math.sign(path.at(-1).x - path[0].x), k % 2 ? -1 : 1, `espírito ${k}`);
    assert.ok(path.every(item => item.y >= 8 && item.y <= 52), 'no céu');
  }
});

test('reações da segunda leva: o gol (confete, grito e bola na rede), o chute, e o que cada alvo pego solta', () => {
  const { helpers, calls } = fakeHelpers();
  const T = globalThis.ArraiaMundoExtras2.create(helpers);
  const reset = () => { for (const key of Object.keys(calls)) calls[key].length = 0; };
  const caught = (id, extra = {}) => { reset(); T.catchFx(eventC(id, 10000, extra), { k: 1, all: false }, 200, 100, 5000); };
  caught('chapeus');
  assert.deepEqual(calls.sounds, ['equipar']);
  caught('toupeiras');
  assert.deepEqual([calls.says, calls.sounds, calls.particles.length], [['fx.toupeiraAi'], ['tombo'], 8]);
  caught('coelho');
  assert.deepEqual([calls.says, calls.sounds], [['fx.coelhoTcharam'], ['acerto']]);
  caught('aurora');
  assert.deepEqual(calls.sounds, ['brilho']);
  caught('vacalua');
  assert.deepEqual([calls.says, calls.sounds, calls.confetti], [['fx.vacaMuu'], ['boi'], [26]]);
  caught('fumaca');
  assert.deepEqual([calls.sounds, calls.particles.length], [['assobio'], 14]);
  caught('tubaroes');
  assert.deepEqual([calls.says, calls.sounds], [['fx.tubaraoNham'], ['bolha']]);
  // Pelada: o chute devolve true (sem o martelo da pinhata) e o gol solta confete, o grito e a bola voando até a rede.
  reset();
  assert.equal(T.hitFx(eventC('pelada', 10000), { k: 0, n: 2, of: 6 }, 200, 140, 5000), true);
  assert.deepEqual([calls.says, calls.sounds, T.probe().hits], [['fx.peladaChute'], ['martelo'], 1]);
  assert.equal(T.hitFx(eventC('pinhata', 10000), { k: 0, n: 1, of: 6 }, 200, 50, 5000), false);
  assert.equal(T.probe().goal, false);
  caught('pelada');
  assert.deepEqual([calls.says, calls.sounds, calls.confetti], [['fx.peladaGol'], ['yeah'], [70]]);
  assert.equal(T.probe().goal, true);
  assert.equal(T.shake(eventC('pelada', 5000), 1000), null);
});

test('desenho da segunda leva: todo bicho e toda cena desenha sem erro; o coelho solta estrelas uma vez por vez; os vestígios dos chapéus e o gol aparecem', () => {
  const { helpers, calls } = fakeHelpers();
  const T = globalThis.ArraiaMundoExtras2.create(helpers);
  for (const [name, draw] of Object.entries(T.DRAW)) {
    calls.fills.length = 0;
    if (name === 'hat') for (let k = 0; k < 8; k++) draw(50, 50, k, 1);
    else if (name === 'ball') draw(50, 50, 1000, 6);
    else if (name === 'goalFrame') draw(400, 1, 0.5, 1000);
    else if (name === 'mole') draw(50, 150, 1, 1000, 2);
    else if (name === 'mound') { draw(50, false); draw(50, true); }
    else if (name === 'magicHat') draw(100, 156, 1000);
    else if (name === 'rabbit') { draw(50, 140, 1, 1); draw(50, 140, -1, 0); }
    else if (name === 'wisp') draw(50, 20, 1000, 1);
    else if (name === 'cow') draw(100, 60, -1, 1000);
    else if (name === 'dish' || name === 'spoon') draw(60, 158, 1000);
    else if (name === 'jet') draw(50, 20, -1, '#35a03a');
    else if (name === 'shark') draw(50, 100, 1, 1000, 2);
    else if (name === 'funnel') draw(200, 2, 158, 1000, 1);
    assert.ok(calls.fills.length > 5, `${name}: desenhou`);
    assert.ok(calls.fills.every(fill => fill.slice(0, 4).every(Number.isFinite)), `${name}: só números`);
  }
  for (const id of IDS) {
    const entry = entryOf(id);
    for (const t of [1500, 9000, 20000, entry.seconds * 1000 - 2000]) {
      calls.fills.length = 0;
      const { c } = itemsOf(T, id, t);
      c.items = [];
      for (let k = 0; k < entry.targets; k++) { const item = T.TARGETS[id](c, k, LAY); if (item) c.items.push({ k, ...item }); }
      assert.doesNotThrow(() => { (T.SKY[id] || (() => {}))(c, 100000 + t); T.OVER[id](c, 100000 + t); }, `${id} @${t}`);
      assert.ok(calls.fills.every(fill => fill.slice(0, 4).every(Number.isFinite)), `${id} @${t}: só números`);
    }
  }
  // A cartola solta estrelas uma vez por coelho, mesmo desenhando muitos quadros.
  T.reset();
  calls.sounds.length = 0;
  for (let t = 0; t <= 12000; t += 33) T.OVER.coelho(eventC('coelho', t), 100000 + t);
  assert.equal(calls.sounds.filter(name => name === 'brilho').length, 2, 'dois coelhos nos primeiros 12 s');
  assert.equal(T.probe().fired, 2);
  T.reset();
  assert.equal(T.probe().fired, 0);
  // Os chapéus no chão (vestígio) e o gol da pelada.
  calls.fills.length = 0;
  T.TRACE.chapeus(0.8, 0, 1000, LAY, 12345);
  assert.ok(calls.fills.length > 30, 'oito chapéus no chão');
  assert.deepEqual(Object.keys(globalThis.ArraiaMundoExtras2.TRACE_MS), ['chapeus']);
  T.catchFx(eventC('pelada', 10000), { k: 0, all: false }, 200, 100, 5000);
  calls.fills.length = 0;
  T.OVER.pelada({ ...eventC('pelada', 10000), items: [] }, 5300);
  assert.ok(calls.fills.some(fill => fill[4] === '#26242e'), 'a bola voando para o gol');
  calls.fills.length = 0;
  T.OVER.pelada({ ...eventC('pelada', 10000), items: [] }, 5000 + 3000);
  assert.ok(!calls.fills.some(fill => fill[4] === '#26242e'), 'depois do gol a bola some');
});
