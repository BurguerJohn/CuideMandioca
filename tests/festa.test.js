const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../src/data.js');
const { GameEngine } = require('../src/core.js');
const UI = require('../src/ui.js');
const { fakeDocument } = require('./fake-dom');

require('../src/festa-sprites.js');
const bundle = globalThis.FESTA_SPRITES;

test('o pacote de arte tem sprite e ícone para todo item, personagem e pedido', () => {
  const slot = { chapeu: bundle.hats, mao: bundle.hand, tecido: bundle.mandioca, terreiro: bundle.terrains, lado: bundle.sides };
  for (const item of data.items) {
    assert.ok(slot[item.cat][item.id], `sprite de ${item.id}`);
    assert.ok(bundle.icons[`item:${item.id}`], `ícone de ${item.id}`);
  }
  for (const char of data.chars) {
    assert.ok(bundle.chars[char.id], `sprite de ${char.id}`);
    assert.ok(bundle.icons[`char:${char.id}`], `retrato de ${char.id}`);
  }
  for (const request of data.requests) assert.ok(bundle.requests[request.id], request.id);
  for (const tab of [...UI.TABS, ...UI.TELAS]) assert.ok(bundle.icons[`ui:${tab.icon}`], `ícone da aba ${tab.id}`);
  for (const key of ['0', '1', '2', '3', '4', 'lendaria']) assert.ok(bundle.fires[key]);
  const meta = bundle.mandioca.meta;
  assert.equal(meta.anchors.length, meta.tags.danca.length + meta.tags.descanso.length + meta.tags.comemora.length);
  assert.equal(meta.tags.danca.length, 16, "a dança tem 16 quadros");
  for (const tag of Object.values(meta.tags)) for (const frame of tag) assert.ok(meta.anchors[frame].head);
  const sheets = [bundle.mandioca.blink, ...Object.values(bundle.hats), ...Object.values(bundle.hand),
    ...Object.values(bundle.chars), ...Object.values(bundle.sides), ...Object.values(bundle.props),
    ...Object.values(bundle.fires), ...Object.values(bundle.requests), bundle.crowd.dancers, bundle.crowd.audience];
  for (const sheet of sheets) assert.match(bundle.images[sheet.image], /^data:image\/png;base64,/, sheet.image);

  // Animações: cada pessoa da multidão tem os mesmos passos, barracas mexem o toldo e o balcão juntos.
  const crowd = bundle.crowd;
  assert.equal(crowd.dancers.frames, 2 * crowd.fabrics * crowd.steps);
  assert.equal(crowd.ola, crowd.dancers.frames, 'a "ola" vem depois de todos os passos da plateia');
  for (const sheet of [crowd.audience, crowd.audience2, crowd.audience3]) {
    assert.equal(sheet.frames, crowd.dancers.frames + 2 * crowd.fabrics, 'um quadro de "ola" por pessoa');
  }
  assert.equal(crowd.dancersBack.frames, crowd.dancers.frames);
  assert.equal(crowd.kids.frames, 2 * crowd.fabrics);
  for (const [id, side] of Object.entries(bundle.sides)) {
    if (side.front) assert.ok(side.frames > 1 && bundle.images[side.front], `${id} tem toldo e balcão animados`);
  }
  for (const id of ['cenoura', 'inhame', 'batata', 'pamonha', 'pacoca']) assert.ok(bundle.chars[id].frames >= 4, id);
  assert.ok(bundle.chars.pamonha.shout < bundle.chars.pamonha.frames);
  const bunny = bundle.chars.sopinha;
  for (const pose of ['senta', 'funga', 'pisca', 'orelha', 'pulo', 'deita']) {
    assert.ok(bunny.poses[pose] < bunny.frames, `pose ${pose} do Sopinha`);
  }
  assert.equal(bundle.props['pau-sebo'], undefined, 'o pau de sebo saiu do jogo');
  for (const mark of data.scenery.landmarks) {
    // Céu estrelado e ilhas do céu são desenhados na hora (sem folha própria).
    if (!['estrelas', 'ilha-quadrilha', 'ilha-baloes'].includes(mark.id)) assert.ok(bundle.scenery[mark.id], `sprite do marco ${mark.id}`);
  }
  for (const id of ['pintinho', 'mandioquinha']) assert.ok(bundle.scenery[id], id);
});

function lateGame() {
  const engine = new GameEngine(data, null, { rng: () => 0.3 });
  const s = engine.state;
  while (s.size < 120) engine.addFame(engine.fameNeed() - s.fame);
  for (const char of data.chars) s.crew[char.id] = { level: 3 };
  s.inventory.push('barraca-pescaria', 'barraca-beijo', 'vaqueiro', 'lampiao', 'chita', 'tablado');
  engine.equip('barraca-pescaria', 'esquerda');
  engine.equip('barraca-beijo', 'direita');
  engine.equip('vaqueiro');
  engine.equip('lampiao');
  engine.equip('chita');
  engine.equip('tablado');
  s.bonfire.labareda = 30;
  s.request.active = { kind: 'musica', until: Date.now() + 60000, who: 3 };
  s.crasher.active = { until: Date.now() + 45000, side: 1 };
  return engine;
}

test('a festa é desenhada do quintal ao Maior São João do Mundo', () => {
  const calls = { drawImage: 0 };
  globalThis.document = fakeDocument([], calls);
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const canvas = globalThis.document.createElement('canvas');
  const festa = globalThis.ArraiaFesta.create(canvas, bundle);
  festa.setScale(3);

  const start = new GameEngine(data, null, { rng: () => 0.5 });
  festa.draw(start, 1000);
  assert.ok(calls.drawImage > 5);
  const small = festa.size().logicalWidth;
  assert.equal(small, globalThis.ArraiaFesta.terrainWidth(start) + 32);
  start.state.runtime.dancing = false;
  festa.draw(start, 1100);

  const engine = lateGame();
  const before = calls.drawImage;
  festa.draw(engine, 2000);
  assert.ok(calls.drawImage - before > 40, 'a festa grande desenha muito mais coisa');
  assert.ok(festa.size().logicalWidth > small, 'o terreiro cresce com a lotação');
  festa.draw(engine, 2100, { chapeu: 'oculos-coracao', esquerda: 'barraca-argolas', terreiro: 'pista-forro' });
  assert.equal(globalThis.ArraiaFesta.withPreview({ esquerda: 'a', direita: 'b' }, { esquerda: 'b' }).direita, 'a',
    'prévia de lado troca os lados como o motor');
  festa.onEvents(engine, [{ type: 'step', value: 1234, crit: true }, { type: 'rest-start' }, { type: 'flare-start' },
    { type: 'tier-up', tier: 4 }, { type: 'size-up', size: 121, count: 2 }, { type: 'fished', id: 'milho' }], 2050);
  festa.draw(engine, 2300);
  assert.ok(['request', 'crasher', 'host', 'festa', 'terreiro', 'par', 'palco', 'fogueira', 'lado-esquerda',
    'lado-direita'].includes(festa.hit(200, 400)));
  assert.equal(festa.hit(-50, 400), null);
  assert.match(festa.photo(2), /^data:image\/png/);

  require('../src/argolas.js');
  const thrown = [];
  let ended = false;
  const rings = globalThis.ArraiaArgolas.create(globalThis.document.createElement('canvas'), bundle, {
    onThrow: index => { thrown.push(index); return { hit: index !== null, prize: { kind: 'x2', mult: 2 } }; },
    onEnd: () => { ended = true; }
  });
  rings.draw(3000);
  rings.start({ prizes: Array.from({ length: 5 }, () => ({ kind: 'fichas', amount: 2 })), total: 2 }, 3000);
  rings.draw(3100);
  assert.equal(rings.throwRing(3100), true);
  assert.equal(rings.throwRing(3150), false, 'não dá para jogar enquanto a argola cai');
  rings.draw(3500);
  rings.throwRing(3600);
  rings.draw(4000);
  rings.draw(5000);
  assert.equal(thrown.length, 2);
  assert.equal(ended, true);

  // A folga da mira bate com a arte: boca da garrafa + 2 × folga = vão da argola.
  for (const [kind, aim] of Object.entries(data.config.ringAim)) {
    assert.equal(bundle.rings.garrafa.necks[kind] + 2 * aim, bundle.rings.argola.open, `garrafa de ${kind}`);
  }
  const aimed = [];
  const precise = globalThis.ArraiaArgolas.create(globalThis.document.createElement('canvas'), bundle, {
    onThrow: index => { aimed.push(index); return { hit: index !== null }; }, onEnd() {}
  });
  const prize = kind => ({ kind, aim: data.config.ringAim[kind], amount: 1, id: 'ursinho', mult: 2 });
  for (const middle of ['item', 'x2', 'fichas']) {
    precise.start({ prizes: ['fichas', 'fichas', middle, 'fichas', 'fichas'].map(prize), total: 3 }, 0);
    precise.draw(5);
    precise.throwRing(11); // a argola passa 3 pixels à direita do centro da garrafa do meio
  }
  assert.deepEqual(aimed, [null, 2, 2], 'o presente pede 1 pixel de folga; ×2 e fichas aceitam 3');

  // Com limite de tela, a festa não cresce além dela, e o renderer avisa que limitou.
  festa.setScale(30, { width: 1500, height: 800 });
  festa.draw(engine, 2600);
  assert.ok(festa.size().width <= 1500 && festa.size().top <= 800, 'a festa cabe na tela');
  assert.equal(festa.size().capped, true);
  festa.setScale(3, { width: 1500, height: 800 });
  assert.equal(festa.size().capped, false);
  delete globalThis.document;
  delete globalThis.Image;
});
