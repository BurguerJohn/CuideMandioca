const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { fakeContext, fakeDocument } = require('./fake-dom');

require('../src/festa-sprites.js');
const bundle = globalThis.FESTA_SPRITES;

function setup(hooks = {}) {
  const document = fakeDocument([], { drawImage: 0 });
  const draws = [];
  const images = [];
  const createElement = document.createElement;
  document.createElement = tag => {
    const element = createElement(tag);
    const context = fakeContext({ drawImage: 0 });
    context.drawImage = (...args) => draws.push(args);
    element.getContext = () => context;
    return element;
  };
  class Image {
    set src(value) { this.srcValue = value; this.complete = true; this.width = 12; images.push(this); }
  }
  const root = { Image, document, ArraiaFesta: { pixelText() {} } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/argolas.js'), 'utf8'), root);
  const rings = root.ArraiaArgolas.create(document.createElement('canvas'), bundle,
    { onThrow: () => ({ hit: false }), onEnd() {}, ...hooks });
  const round = { prizes: Array.from({ length: 5 }, () => ({ kind: 'fichas', amount: 2, aim: 4 })), total: 1 };
  return { rings, round, draws, images };
}

test('Argolas: o prêmio visual vem da rodada quando o callback só confirma o acerto', () => {
  let prize;
  const { rings, round } = setup({ onThrow: () => ({ hit: true }), onLand: result => { prize = result.prize; } });
  rings.start(round, 0);
  assert.equal(rings.throwRing(0), true);
  rings.draw(340);
  assert.equal(prize, round.prizes[2]);
  assert.equal(rings.active, false);
});

test('Argolas: a queda termina uma vez mesmo se o callback de pouso lançar erro', () => {
  let landed = 0;
  let ended = 0;
  const { rings, round } = setup({ onLand() { landed++; throw new Error('som indisponível'); }, onEnd() { ended++; } });
  rings.start(round, 0);
  rings.throwRing(0);
  assert.throws(() => rings.draw(340), /som indisponível/);
  assert.equal(rings.active, false, 'a queda já terminou antes de chamar o observador');
  rings.draw(1040);
  rings.draw(1140);
  assert.equal(landed, 1);
  assert.equal(ended, 1);
});

test('Argolas: reset durante callbacks não acessa a rodada descartada', () => {
  const landing = setup({ onLand() { landing.rings.reset(); } });
  landing.rings.start(landing.round, 0);
  landing.rings.throwRing(0);
  assert.doesNotThrow(() => landing.rings.draw(340));
  assert.equal(landing.rings.active, false);
  const throwing = setup({ onThrow() { throwing.rings.reset(); return { hit: false }; } });
  throwing.rings.start(throwing.round, 0);
  assert.doesNotThrow(() => throwing.rings.throwRing(0));
  assert.equal(throwing.rings.active, false);
});

test('Argolas: o callback de arremesso não pode consumir duas argolas na mesma ação', () => {
  let calls = 0;
  let nested;
  const game = setup({ onThrow() {
    calls++;
    if (calls === 1) nested = game.rings.throwRing(0);
    return { hit: false };
  } });
  game.rings.start(game.round, 0);
  game.rings.throwRing(0);
  assert.equal(nested, false);
  assert.equal(calls, 1);
});

test('Argolas: a argola que erra desce até o balcão sem saltar do gargalo para baixo', () => {
  const { rings, round, draws } = setup();
  rings.start(round, 0);
  rings.throwRing(0);
  const yOfRing = () => draws.filter(args => args[0].srcValue === bundle.images[bundle.rings.argola.image] && args[6] > 24).at(-1)[6];
  rings.draw(339);
  const falling = yOfRing();
  draws.length = 0;
  rings.draw(340);
  const landed = yOfRing();
  assert.ok(Math.abs(landed - falling) < 1, `${falling} → ${landed}`);
  assert.equal(landed, 78 - bundle.rings.argola.h);
});

test('Argolas: quadros atrasados concluem a rodada no prazo original, mesmo esperando a arte', () => {
  for (const ready of [true, false]) {
    let landed = 0;
    let ended = 0;
    const { rings, round, images } = setup({ onLand() { landed++; }, onEnd() { ended++; } });
    images[0].complete = ready;
    rings.start(round, 0);
    rings.throwRing(0);
    rings.draw(5000);
    assert.equal(landed, 1);
    assert.equal(ended, 1, '340 ms de queda e 700 ms de resultado já passaram');
    rings.draw(6000);
    assert.equal(landed, 1);
    assert.equal(ended, 1);
  }
});
