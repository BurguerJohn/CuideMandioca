const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { fakeContext, fakeDocument } = require('./fake-dom');

require('../src/festa-sprites.js');
const bundle = globalThis.FESTA_SPRITES;

function setup(hooks = {}, failedSource = null) {
  const document = fakeDocument([], { drawImage: 0 });
  const draws = [];
  const images = [];
  const createElement = document.createElement;
  document.createElement = tag => {
    const element = createElement(tag);
    const context = fakeContext({ drawImage: 0 });
    context.drawImage = (...args) => {
      if (args[0]?.failed) throw new Error('imagem quebrada');
      draws.push(args);
    };
    element.getContext = () => context;
    return element;
  };
  class Image {
    set src(value) {
      this.srcValue = value;
      this.complete = true;
      this.width = value === failedSource ? 0 : 12;
      this.failed = value === failedSource;
      images.push(this);
      if (this.failed) this.onerror?.();
    }
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

test('Argolas: um clique após a queda pode lançar a próxima argola antes do próximo quadro', () => {
  const throws = [];
  let landed = 0;
  let ended = 0;
  const { rings, round } = setup({ onThrow: index => { throws.push(index); return { hit: false }; },
    onLand() { landed++; }, onEnd() { ended++; } });
  round.total = 2;
  rings.start(round, 0);
  assert.equal(rings.throwRing(0), true);
  assert.equal(rings.throwRing(339), false, 'durante a queda o segundo clique continua bloqueado');
  assert.equal(rings.throwRing(690), true, 'a queda terminou mesmo sem draw no intervalo');
  assert.equal(landed, 1, 'o primeiro pouso é entregue uma vez antes do segundo arremesso');
  assert.deepEqual(throws, [2, null], 'a mira segue o tempo desde o pouso, sem voltar ao centro no clique atrasado');
  rings.draw(690);
  assert.equal(landed, 1, 'desenhar no mesmo instante não repete o pouso');
  rings.draw(1030);
  rings.draw(1730);
  assert.equal(landed, 2);
  assert.equal(ended, 1);
  assert.equal(rings.throwRing(1731), false, 'o clique não abre outro arremesso depois da rodada');
});

test('Argolas: atualizar o pouso durante um clique respeita reset ou troca de rodada pelo callback', () => {
  for (const restart of [false, true]) {
    let throws = 0;
    let landed = 0;
    const game = setup({ onThrow: () => { throws++; return { hit: false }; }, onLand() {
      landed++;
      game.rings.reset();
      if (restart) game.rings.start(game.round, 340);
    } });
    game.round.total = 2;
    game.rings.start(game.round, 0);
    game.rings.throwRing(0);
    assert.equal(game.rings.throwRing(340), false, 'o gesto não se transfere para uma rodada criada pelo callback');
    assert.equal(landed, 1);
    assert.equal(throws, 1);
    assert.equal(game.rings.active, restart);
  }
});

test('Argolas: uma imagem quebrada não impede desenhar nem concluir a rodada', () => {
  const sources = ['fundo', 'garrafa', 'argola'].map(key => bundle.images[bundle.rings[key].image])
    .concat(['fichas', 'animacao', 'lenha', 'presente'].map(key => bundle.icons[`ui:${key}`].src));
  const failed = [];
  sources.forEach((source, i) => {
    let landed = 0;
    let ended = 0;
    const { rings, round, draws } = setup({ onLand() { landed++; }, onEnd() { ended++; } }, source);
    round.prizes = [
      { kind: 'fichas', amount: 2 }, { kind: 'animacao', factor: 2 }, { kind: 'lenha', amount: 2 },
      { kind: 'item' }, { kind: 'fichas', amount: 2 }
    ];
    rings.start(round, 0);
    try {
      rings.draw(0);
      rings.throwRing(0);
      rings.draw(340);
      rings.draw(1040);
    } catch (error) { failed.push(`${i}: ${error.message}`); }
    if (!failed.some(entry => entry.startsWith(`${i}:`))) {
      assert.ok(draws.length > 0);
      assert.equal(landed, 1);
      assert.equal(ended, 1);
    }
  });
  assert.deepEqual(failed, [], 'cada uma das sete falhas de carregamento tem recuperação');
});
