const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../src/data.js');
const { GameEngine } = require('../src/core.js');
const UI = require('../src/ui.js');
const { fakeDocument } = require('./fake-dom');

require('../src/festa-sprites.js');
const bundle = globalThis.FESTA_SPRITES;

test('o pacote de arte tem sprite e ícone para todo item, personagem e pedido', () => {
  const slot = { chapeu: bundle.hats, mao: bundle.hand, tecido: bundle.mandioca, terreiro: bundle.terrains, lado: bundle.sides, varal: bundle.varais };
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
  // A Mandioca em quatro tamanhos: cada um com folhas de todos os tecidos, as mesmas poses e âncoras do mesmo tamanho.
  const growth = bundle.mandioca.growth;
  assert.equal(growth.length, data.config.growthAt.length + 1);
  growth.forEach((kit, stage) => {
    assert.equal(kit.anchors.length, bundle.mandioca.meta.anchors.length, `âncoras do tamanho ${stage}`);
    for (const item of data.items.filter(entry => entry.cat === 'tecido')) {
      assert.ok(kit.sheets[item.id], `tecido ${item.id} no tamanho ${stage}`);
      assert.equal(kit.sheets[item.id].frames, bundle.mandioca.meta.anchors.length);
      assert.ok(kit.sheets[item.id].rim, 'luz de contorno');
    }
    if (stage) assert.ok(kit.h < growth[stage - 1].h || kit.scale > growth[stage - 1].scale, 'cada tamanho é maior');
  });
  for (const item of data.items.filter(entry => entry.cat === 'chapeu' || entry.cat === 'mao')) {
    const meta = (item.cat === 'chapeu' ? bundle.hats : bundle.hand)[item.id];
    assert.equal(meta.growth.length, growth.length - 1, `${item.id} nos tamanhos menores`);
  }
  // Olhares (coração, estrela, felizinha) do mesmo tamanho do piscar, em cada tamanho da Mandioca.
  for (const kit of growth) {
    for (const name of ['coracao', 'estrela', 'feliz']) {
      assert.ok(kit.looks[name], `olhar ${name}`);
      assert.equal(kit.looks[name].w, kit.blink.w);
      assert.equal(kit.looks[name].h, kit.blink.h);
    }
  }
  // No giro, de lado ou de costas, não há olhos para piscar (antes o piscar desenhava um rosto na nuca).
  const spin = bundle.mandioca.meta.tags.dancas.giro;
  for (const kit of growth) {
    assert.ok(kit.anchors[spin[0]].eyes, 'de frente tem olhos');
    assert.equal(kit.anchors[spin[8]].eyes, null, 'de costas não');
    assert.equal(kit.anchors[spin[2]].eyes, null, 'de lado não');
  }
  const meta = bundle.mandioca.meta;
  // Cada passo de dança do repertório tem 16 quadros, e todos os quadros têm âncora para o chapéu e a mão.
  const dances = Object.values(meta.tags.dancas);
  const rests = Object.entries(meta.tags.descansos).filter(([id]) => id !== 'ofega').map(([, list]) => list);
  assert.equal(meta.anchors.length, meta.tags.descanso.length + meta.tags.comemora.length + dances.reduce((n, list) => n + list.length, 0) +
    rests.reduce((n, list) => n + list.length, 0));
  assert.deepEqual(meta.tags.descansos.ofega, meta.tags.descanso, 'ofegar é o descanso de sempre');
  assert.deepEqual(Object.keys(meta.tags.descansos), ['ofega', 'abana', 'alonga', 'bebe', 'milho', 'cochilo', 'carta']);
  assert.deepEqual(meta.tags.dancas.forro, meta.tags.danca, 'o forró é o passo de sempre');
  assert.equal(meta.tags.danca.length, 16, "a dança tem 16 quadros");
  for (const dance of data.dances) assert.equal(meta.tags.dancas[dance.id]?.length, 16, `quadros do passo ${dance.id}`);
  for (const tag of [...dances, ...rests, meta.tags.descanso, meta.tags.comemora]) for (const frame of tag) assert.ok(meta.anchors[frame].head);
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

test('a Mandioca é desenhada em todos os tamanhos e cresce com um clarão', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = new GameEngine(data, null, { rng: () => 0.5 });
  engine.state.equipped.chapeu = 'chapeu-palha';
  engine.state.equipped.mao = 'bandeirinha';
  let now = 1000;
  engine.state.cheer = 1e300;
  for (let stage = 0; stage <= 3; stage++) {
    while (engine.growthStage() < stage) engine.buyLevel('rebolado');
    festa.onEvents(engine, engine.drainEvents(), now);
    for (let i = 0; i < 80; i++) festa.draw(engine, (now += 17));
  }
  assert.equal(engine.growthStage(), 3);
});

test('os bichos e as crianças da festa são clicáveis e reagem com um pulinho e um grito', () => {
  const calls = { drawImage: 0 };
  globalThis.document = fakeDocument([], calls);
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  engine.state.size = 160;
  let now = 5000;
  for (let i = 0; i < 30; i++) festa.draw(engine, (now += 17));
  const critters = festa.areas().map(area => area.id).filter(id => id.startsWith('bicho:'));
  for (const kind of ['galinha', 'bode', 'gato', 'boi', 'pintinho:0', 'crianca:0', 'igreja', 'caramelo']) {
    assert.ok(critters.includes(`bicho:${kind}`), `${kind} é clicável`);
  }
  const before = calls.drawImage;
  for (const id of critters) festa.poke(id);
  for (let i = 0; i < 30; i++) festa.draw(engine, (now += 17));
  assert.ok(calls.drawImage > before, 'a festa segue sendo desenhada depois dos cliques');
  festa.poke('bicho:desconhecido:9');
  festa.poke(undefined);
});

test('o pote do quebra-pote pendura, balança a cada paulada e some quando quebra', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  let now = 5000;
  for (let i = 0; i < 4; i++) festa.draw(engine, (now += 30));
  assert.ok(!festa.areas().some(area => area.id === 'pote'), 'sem pote pendurado, nada para clicar');
  engine.debug('pote');
  festa.onEvents(engine, engine.drainEvents(), now);
  for (let i = 0; i < 6; i++) festa.draw(engine, (now += 30));
  assert.ok(festa.areas().some(area => area.id === 'pote'), 'o pote pendurado é clicável');
  for (let hit = 0; hit < engine.cfg.poteHits; hit++) {
    engine.state.pote.active && (engine.state.pote.active.hitAt = 0);
    engine.hitPote();
    festa.onEvents(engine, engine.drainEvents(), now);
    for (let i = 0; i < 12; i++) festa.draw(engine, (now += 30));
  }
  assert.equal(engine.state.pote.active, null, 'quebrou');
  for (let i = 0; i < 60; i++) festa.draw(engine, (now += 30));
  assert.ok(!festa.areas().some(area => area.id === 'pote'));
});

test('as crianças fazem uma ciranda em volta da fogueira de tempos em tempos', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  engine.state.size = 160;
  let now = 5000;
  let together = 0;
  let ringed = false;
  let windy = false;
  for (let i = 0; i < 2400; i++) {
    festa.draw(engine, (now += 50));
    const probe = festa.probe();
    ringed ||= probe.ring;
    windy ||= probe.wind !== 0;
    if (i % 4) continue;
    const areas = festa.areas();
    const fire = areas.find(area => area.id === 'fogueira');
    const near = areas.filter(area => area.id.startsWith('bicho:crianca:') && area.box[0] < fire.box[2] && area.box[2] > fire.box[0]);
    together = Math.max(together, near.length);
  }
  assert.ok(together >= 3, `em dois minutos a criançada se junta em volta da fogueira (viu ${together})`);
  assert.ok(ringed, 'a ciranda acontece');
  assert.ok(windy, 'e uma rajada de vento passa pelas bandeirinhas'); 
});

test('o casamento na roça aparece na pista, some os dois pares e aceita o clique nos noivos', () => {
  const calls = { drawImage: 0 };
  globalThis.document = fakeDocument([], calls);
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  let now = 5000;
  for (let i = 0; i < 5; i++) festa.draw(engine, (now += 17));
  assert.ok(!festa.areas().some(area => area.id === 'casamento'), 'sem casamento os noivos não aparecem');
  const dancing = calls.drawImage;
  for (let i = 0; i < 5; i++) festa.draw(engine, (now += 17));
  const perFrame = (calls.drawImage - dancing) / 5;
  engine.debug('casamento');
  festa.onEvents(engine, engine.drainEvents(), now);
  for (let i = 0; i < 10; i++) festa.draw(engine, (now += 17));
  const wedding = festa.areas().find(area => area.id === 'casamento');
  assert.ok(wedding, 'os noivos e o padre são clicáveis');
  const [x0, y0, x1, y1] = wedding.box;
  assert.ok(x1 > x0 && y1 > y0);
  // A cerimônia inteira, com arroz, vivas e o "sim" do final, sem quebrar o desenho.
  for (let second = 0; second < data.config.weddingSeconds; second++) {
    engine.tick(1);
    if (second % 4 === 0) { engine.throwRice(); }
    festa.onEvents(engine, engine.drainEvents(), now);
    for (let i = 0; i < 6; i++) festa.draw(engine, (now += 170));
  }
  assert.equal(engine.state.runtime.weddingLeft, 0);
  for (let i = 0; i < 20; i++) festa.draw(engine, (now += 40));
  assert.ok(!festa.areas().some(area => area.id === 'casamento'), 'acabou o casamento, acabou a festa dos noivos');
  assert.ok(perFrame > 0);
});

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

test('quando a festa ganha largura (ou encolhe), a tela acompanha na mesma escala, sem esticar a arte', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const canvas = globalThis.document.createElement('canvas');
  const festa = globalThis.ArraiaFesta.create(canvas, bundle);
  festa.setScale(3);
  const engine = new GameEngine(data, null, { rng: () => 0.5 });
  let now = 1000;
  const ratio = () => parseFloat(canvas.style.width) / canvas.width;
  festa.draw(engine, (now += 50));
  const small = canvas.width;
  assert.equal(ratio(), 3);
  while (engine.state.size < 40) engine.addFame(engine.fameNeed() - engine.state.fame);
  festa.draw(engine, (now += 50));
  assert.ok(canvas.width > small, 'a festa cresceu');
  assert.equal(ratio(), 3, 'a largura na tela cresceu junto (antes ficava a antiga e a arte esticava)');
  engine.state.cheer = 0;
  while (engine.state.size < 100) engine.addFame(engine.fameNeed() - engine.state.fame);
  engine.newYear();
  festa.draw(engine, (now += 50));
  assert.equal(canvas.width, small, 'o ano que vem começa do tamanho do quintal');
  assert.equal(ratio(), 3);
});

test('as barracas e enfeites dos lados respondem ao clique sem quebrar a festa', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  let now = 5000;
  festa.poke('lado:esquerda');
  for (const id of ['barraca-beijo', 'barraca-comidas', 'cadeia', 'espantalho', 'fardo', 'mastro', 'carroca']) {
    engine.addItem(id);
    engine.equip(id, 'direita');
    for (let i = 0; i < 3; i++) festa.draw(engine, (now += 30));
    const before = festa.probe().particles + festa.probe().texts;
    festa.poke('lado:direita');
    assert.ok(festa.probe().particles + festa.probe().texts > before, `${id} reage`);
    for (let i = 0; i < 20; i++) festa.draw(engine, (now += 60));
  }
});

test('os balões de São João que sobem da plateia são clicáveis e disparam para o céu', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  engine.state.size = 160;
  let now = 5000;
  let lantern = null;
  for (let i = 0; i < 600 && !lantern; i++) {
    festa.draw(engine, (now += 50));
    lantern = festa.areas().find(area => area.id.startsWith('lanterna:'));
  }
  assert.ok(lantern, 'saiu um balão clicável');
  globalThis.performance = globalThis.performance || { now: () => now };
  festa.poke(lantern.id);
  festa.poke('lanterna:nao-existe');
  for (let i = 0; i < 80; i++) festa.draw(engine, (now += 50));
});

test('o arco-íris cabe em qualquer tamanho de festa (antes a festa estreita travava num laço sem fim)', () => {
  const vm = require('node:vm');
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  let now = 5000;
  for (const sides of [['fardo', 'mastro'], ['barraca-pescaria', 'barraca-comidas']]) {
    const clock = { now: 1_000_000 };
    const engine = new GameEngine(data, null, { rng: () => 0.5, now: () => clock.now });
    for (const id of sides) engine.addItem(id);
    for (let size = 1; size <= 40; size++) {
      while (engine.state.size < size) engine.addFame(engine.fameNeed() - engine.state.fame);
      engine.equip(sides[0], 'esquerda');
      engine.equip(sides[1], 'direita');
      engine.state.weather.rain = null;
      engine.state.weather.rainbow = { born: clock.now - 10000, until: clock.now + 30000, side: size % 2 };
      // Desenhado dentro de um vm com tempo limite: um laço sem fim vira erro em vez de travar o teste.
      vm.runInNewContext('for (let i = 0; i < 3; i++) festa.draw(engine, next())', { festa, engine, next: () => (now += 40) }, { timeout: 4000 });
    }
  }
});

test('a corrida de saco corre na frente da festa: setinha antes da largada, pulos, tombo e a comemoração na chegada', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  let clock = engine.now();
  engine.now = () => clock;
  let now = 5000;
  for (let i = 0; i < 4; i++) festa.draw(engine, (now += 30));
  assert.ok(!festa.areas().some(area => area.id === 'saco'));
  engine.debug('saco');
  engine.state.saco.active.rivals = [60000, 60000];
  festa.onEvents(engine, engine.drainEvents(), now);
  festa.draw(engine, (now += 30));
  assert.ok(festa.areas().some(area => area.id === 'saco'), 'o corredor do jogador é clicável');
  const start = festa.probe().saco;
  assert.equal(start.rivals[0] - start.rivals[1], 7, 'todo mundo na largada, em raias escalonadas');
  for (let k = 0; k < 5; k++) {
    clock += 600;
    engine.hopSaco();
    festa.onEvents(engine, engine.drainEvents(), now);
    for (let i = 0; i < 12; i++) festa.draw(engine, (now += 30));
  }
  const mid = festa.probe().saco;
  assert.ok(mid.x > start.x + 10, 'o corredor andou');
  assert.ok(mid.rivals[0] > start.rivals[0], 'os rivais também');
  // Tombo: fica no mesmo lugar.
  engine.hopSaco();
  festa.onEvents(engine, engine.drainEvents(), now);
  for (let i = 0; i < 10; i++) festa.draw(engine, (now += 30));
  assert.equal(festa.probe().saco.x, mid.x);
  clock += 2000;
  while (engine.state.saco.active) {
    clock += 600;
    engine.hopSaco();
    festa.onEvents(engine, engine.drainEvents(), now);
    festa.draw(engine, (now += 30));
  }
  assert.ok(festa.probe().saco.exit, 'cruzou a chegada');
  assert.ok(!festa.areas().some(area => area.id === 'saco'));
  for (let i = 0; i < 100; i++) festa.draw(engine, (now += 30));
  assert.equal(festa.probe().saco, null, 'a corrida saiu de cena');
});

test('o leiloeiro sobe no palco com a prenda e a plaquinha do lance, e sai depois de vendido', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  let clock = engine.now();
  engine.now = () => clock;
  let now = 5000;
  for (let i = 0; i < 4; i++) festa.draw(engine, (now += 30));
  assert.ok(!festa.areas().some(area => area.id === 'leilao'));
  engine.debug('leilao');
  festa.onEvents(engine, engine.drainEvents(), now);
  festa.draw(engine, (now += 30));
  const area = festa.areas().find(entry => entry.id === 'leilao');
  const stage = festa.areas().find(entry => entry.id === 'palco');
  assert.ok(area, 'o leiloeiro é clicável');
  assert.ok(area.box[0] >= stage.box[0] && area.box[2] <= stage.box[2] + 4, 'em cima do palco');
  engine.state.tickets = 100;
  engine.bidLeilao();
  festa.onEvents(engine, engine.drainEvents(), now);
  for (let i = 0; i < 5; i++) festa.draw(engine, (now += 30));
  engine.state.leilao.active.rivalAt = 0;
  for (let k = 0; k < 3; k++) {
    clock += data.config.leilaoCall * 1000 + 1;
    engine.updateTimers(clock);
    festa.onEvents(engine, engine.drainEvents(), now);
    for (let i = 0; i < 5; i++) festa.draw(engine, (now += 30));
  }
  assert.equal(engine.state.leilao.active, null);
  assert.ok(festa.probe().leilao.sold, 'bateu o martelo');
  assert.ok(!festa.areas().some(entry => entry.id === 'leilao'), 'vendido: não dá mais lance');
  for (let i = 0; i < 90; i++) festa.draw(engine, (now += 30));
  assert.equal(festa.probe().leilao, null, 'o leiloeiro desceu do palco');
});

test('a Mandioca faz olhar de estrela nas vitórias, coração no amor e felizinha no carinho', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  let now = 5000;
  festa.draw(engine, (now += 30));
  assert.equal(festa.probe().look, null);
  festa.onEvents(engine, [{ type: 'achievement', id: 'mil' }], now);
  assert.equal(festa.probe().look, 'estrela');
  festa.onEvents(engine, [{ type: 'leilao-sold', winner: 'plateia' }], now);
  assert.equal(festa.probe().look, 'estrela', 'perder o leilão não é vitória: o olhar não muda');
  festa.onEvents(engine, [{ type: 'wedding' }], now);
  assert.equal(festa.probe().look, 'coracao');
  festa.onEvents(engine, [{ type: 'poke' }], now);
  assert.equal(festa.probe().look, 'feliz');
  for (let i = 0; i < 10; i++) festa.draw(engine, (now += 30));
});

test('o alto-falante no mastro fala o aviso num texto que cabe dentro da festa', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  let now = 5000;
  festa.draw(engine, (now += 30));
  for (const [roll, hint] of [[0.95, null], [0.1, { id: 'size', n: 7 }], [0.1, { id: 'bingo' }]]) {
    festa.onEvents(engine, [{ type: 'announce', roll, hint }], now);
    const text = festa.probe().announce;
    assert.ok(text && !text.startsWith('fx.'), `aviso traduzido: ${text}`);
    if (hint?.id === 'size') assert.match(text, /7/);
    for (let i = 0; i < 5; i++) festa.draw(engine, (now += 30));
  }
});

test('no friozinho a festa fica azulada e solta fumacinha pela boca; o quentão sobe do barril', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  engine.state.inventory.push('barril-quentao');
  engine.equip('barril-quentao', 'direita');
  let now = 5000;
  festa.draw(engine, (now += 30));
  assert.equal(festa.probe().cold, 0);
  engine.debug('frio');
  festa.onEvents(engine, engine.drainEvents(), now);
  for (let i = 0; i < 120; i++) festa.draw(engine, (now += 30));
  assert.equal(festa.probe().cold, 1, 'entrou no frio devagar');
  assert.ok(festa.probe().particles > 0, 'fumacinha');
  const texts = festa.probe().texts;
  festa.onEvents(engine, [{ type: 'quentao', sold: 1 }], now);
  assert.ok(festa.probe().texts > texts, 'o gole vendido aparece em cima do barril');
  engine.state.cold.active = null;
  for (let i = 0; i < 120; i++) festa.draw(engine, (now += 30));
  assert.equal(festa.probe().cold, 0, 'e saiu devagar');
});

test('figurinha nova do Álbum: o cartãozinho sobe da cabeça da Mandioca e some', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  let now = 5000;
  festa.draw(engine, (now += 30));
  festa.onEvents(engine, [{ type: 'sticker', id: 'frio', page: 'ceu' }], now);
  assert.equal(festa.probe().sticker, 'ui:frio');
  for (let i = 0; i < 20; i++) festa.draw(engine, (now += 30));
  assert.equal(festa.probe().sticker, 'ui:frio', 'ainda subindo');
  for (let i = 0; i < 80; i++) festa.draw(engine, (now += 30));
  assert.equal(festa.probe().sticker, null, 'sumiu');
});

test('com 300 convidados o carro da pamonha passa anunciando, é clicável e vai embora', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const sounds = [];
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle, { sound: name => sounds.push(name) });
  festa.setScale(3);
  const engine = lateGame();
  while (engine.state.size < 300) engine.addFame(engine.fameNeed() - engine.state.fame);
  let now = 5000;
  festa.draw(engine, (now += 30));
  assert.equal(festa.probe().kombi, false, 'ainda não chegou');
  now += 21000;
  let seen = false;
  let texts = 0;
  for (let i = 0; i < 1200 && !seen; i++) {
    festa.draw(engine, (now += 30));
    seen = festa.areas().some(area => area.id === 'bicho:kombi');
  }
  assert.ok(seen, 'a Kombi apareceu e dá para clicar');
  assert.ok(sounds.includes('altofalante'), 'chegou tocando o plim-plom do alto-falante');
  festa.poke('bicho:kombi');
  for (let i = 0; i < 200; i++) { festa.draw(engine, (now += 30)); texts = Math.max(texts, festa.probe().texts); }
  assert.ok(texts > 0, 'anunciou');
  for (let i = 0; i < 1500 && festa.probe().kombi; i++) festa.draw(engine, (now += 30));
  assert.equal(festa.probe().kombi, false, 'passou e foi embora');
});

test('quem volta para a festa ganha um "Oi!" da Mandioca, com olhar felizinho', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  let now = 5000;
  festa.greet(now);
  festa.draw(engine, (now += 30));
  const texts = festa.probe().texts;
  festa.greet(now);
  assert.equal(festa.probe().look, 'feliz');
  assert.ok(festa.probe().texts > texts);
  for (let i = 0; i < 10; i++) festa.draw(engine, (now += 30));
});

test('o varal equipado troca as cores de todas as bandeirinhas (e a prévia da loja também)', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  let now = 5000;
  for (const id of ['varal-colorido', 'varal-azul', 'varal-chita', 'varal-brasil', 'varal-ouro']) {
    assert.ok(id === 'varal-colorido' || bundle.varais[id].colors.length >= 2, `cores do ${id}`);
    engine.state.inventory.push(id);
    assert.ok(engine.equip(id), `veste o ${id}`);
    for (let i = 0; i < 3; i++) festa.draw(engine, (now += 30));
  }
  festa.draw(engine, (now += 30), { varal: 'varal-azul' });
});

test('com 71 convidados chega o jegue da manta azul: passeia, pasta e zurra no clique', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  let now = 5000;
  for (let i = 0; i < 40; i++) festa.draw(engine, (now += 30));
  assert.ok(festa.areas().some(area => area.id === 'bicho:jegue'), 'o jegue está na festa');
  festa.poke('bicho:jegue');
  for (let i = 0; i < 10; i++) festa.draw(engine, (now += 30));
});

test('no friozinho o Sopinha vai pulando até a fogueira e deita do lado dela', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  let now = 5000;
  for (let i = 0; i < 5; i++) festa.draw(engine, (now += 30));
  const fire = festa.areas().find(area => area.id === 'fogueira');
  engine.debug('frio');
  for (let i = 0; i < 1500; i++) festa.draw(engine, (now += 30));
  const bunny = festa.areas().find(area => area.id === 'sopinha');
  assert.ok(bunny && fire, 'coelho e fogueira na festa');
  assert.ok(Math.abs(bunny.box[2] - fire.box[0]) < 90, 'deitado perto da fogueira');
});

test('com carta esperando no correio, às vezes a Mandioca descansa lendo a cartinha', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  assert.equal(bundle.mandioca.meta.tags.descansos.carta.length, 4, 'quatro quadros do descanso da carta');
  for (const kit of bundle.mandioca.growth) assert.ok(kit.tags.descansos.carta, 'em todo tamanho');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  engine.state.mail.ready = 2;
  let now = 5000;
  festa.draw(engine, (now += 30));
  let seen = false;
  for (let i = 0; i < 60 && !seen; i++) {
    festa.onEvents(engine, [{ type: 'rest-start' }], now);
    seen = festa.probe().rest === 'carta';
  }
  assert.ok(seen, 'sorteou a cartinha');
  engine.state.runtime.dancing = false;
  for (let i = 0; i < 10; i++) festa.draw(engine, (now += 30));
});

test('na quadrilha marcada os bichos dançam também, e o texto marcado para depois só aparece na hora', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  let now = 5000;
  festa.draw(engine, (now += 30));
  festa.onEvents(engine, [{ type: 'quadrilha', bonus: 0.25, seconds: 24 }], now);
  assert.ok(festa.probe().bichos > now, 'os bichos entraram na dança');
  for (let i = 0; i < 100; i++) festa.draw(engine, (now += 30));
});

test('a lua da festa segue a fase da lua de verdade', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  // Lua nova em 11/1/2024 e cheia em 25/1/2024: a festa desenha nas duas sem quebrar, e a fase bate.
  for (const [when, expect] of [[Date.UTC(2024, 0, 11, 11, 57), 0], [Date.UTC(2024, 0, 25, 17, 54), 0.5]]) {
    engine.now = () => when;
    let now = 5000;
    for (let i = 0; i < 3; i++) festa.draw(engine, (now += 30));
    const phase = festa.moonPhase(when);
    assert.ok(Math.min(Math.abs(phase - expect), 1 - Math.abs(phase - expect)) < 0.03, `fase ${phase} perto de ${expect}`);
  }
});

test('o Sanfoneiro Andarilho atravessa a festa, é clicável e some depois de cumprimentado', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  let clock = engine.now();
  engine.now = () => clock;
  let now = 5000;
  engine.debug('sanfoneiro');
  festa.onEvents(engine, engine.drainEvents(), now);
  clock += 10000;
  festa.draw(engine, (now += 30));
  assert.ok(festa.areas().some(area => area.id === 'sanfoneiro'));
  engine.greetVisitor();
  festa.onEvents(engine, engine.drainEvents(), now);
  festa.draw(engine, (now += 30));
  assert.ok(!festa.areas().some(area => area.id === 'sanfoneiro'), 'já cumprimentado');
  clock += 40000;
  engine.updateTimers(clock);
  festa.draw(engine, (now += 30));
  assert.equal(festa.probe().visitor, false);
});

test('a cobra de pano cruza a pista na frente dos pares, é clicável e sobe quando é pega', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  let now = 5000;
  festa.draw(engine, (now += 30));
  engine.debug('cobra');
  festa.onEvents(engine, engine.drainEvents(), now);
  festa.draw(engine, (now += 1500));
  const early = festa.probe().cobra;
  assert.ok(early && !early.caught, 'atravessando');
  assert.ok(festa.areas().some(area => area.id === 'cobra'));
  festa.draw(engine, (now += 1000));
  assert.notEqual(festa.probe().cobra.x, early.x, 'anda');
  // Na travessia inteira, quem está perto dela pula de braços para o alto.
  let scared = 0;
  for (let t = 0; t < 40; t++) { festa.draw(engine, (now += 50)); scared = Math.max(scared, festa.probe().cobra?.scared || 0); }
  assert.ok(scared > 0, 'os pares pulam');
  engine.catchCobra();
  festa.onEvents(engine, engine.drainEvents(), now);
  festa.draw(engine, (now += 100));
  assert.equal(festa.probe().cobra.caught, true);
  assert.ok(!festa.areas().some(area => area.id === 'cobra'), 'pega não é mais clicável');
  festa.draw(engine, (now += 1000));
  assert.equal(festa.probe().cobra, null, 'sumiu');
});

test('o fotógrafo lambe-lambe entra andando, monta a câmera ao lado da Mandioca e só é clicável montado', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  let clock = engine.now();
  engine.now = () => clock;
  let now = 5000;
  engine.debug('fotografo');
  festa.onEvents(engine, engine.drainEvents(), now);
  clock += 1000;
  festa.draw(engine, (now += 30));
  const walking = festa.probe().fotografo;
  assert.ok(walking, 'chegando');
  assert.ok(!festa.areas().some(area => area.id === 'fotografo'), 'andando não tira foto');
  clock += engine.cfg.fotoWalk * 1000;
  festa.draw(engine, (now += 30));
  assert.ok(festa.probe().fotografo.x < walking.x, 'andou da direita para o lugar dele');
  assert.ok(festa.areas().some(area => area.id === 'fotografo'));
  engine.shootFoto();
  festa.onEvents(engine, engine.drainEvents(), now);
  festa.draw(engine, (now += 30));
  assert.ok(!festa.areas().some(area => area.id === 'fotografo'), 'já fotografou');
  clock += 20000;
  engine.updateTimers(clock);
  festa.draw(engine, (now += 30));
  assert.equal(festa.probe().fotografo, null, 'foi embora');
});

test('o par da Mandioca responde ao clique com um pulinho e uma gracinha (sem repetir no mesmo instante)', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  festa.draw(engine, 5000);
  assert.ok(festa.areas().some(area => area.id === 'par'), 'o par é clicável');
  const before = festa.probe().texts;
  festa.poke('par');
  assert.equal(festa.probe().texts, before + 1);
  festa.poke('par');
  assert.equal(festa.probe().texts, before + 1, 'um de cada vez');
});

test('menos letreiros: os passos não sobem número (e sem a opção, sobem)', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  let now = 5000;
  festa.draw(engine, now);
  // Só os números dos passos: outros letreiros (sorteados) podem nascer ou sumir no meio da contagem.
  const count = () => festa.probe().stepTexts;
  festa.setCalm(true);
  let before = count();
  festa.onEvents(engine, [{ type: 'step', value: 50 }], now);
  festa.draw(engine, (now += 300));
  assert.equal(count(), before, 'calmo: sem número');
  festa.setCalm(false);
  before = count();
  festa.onEvents(engine, [{ type: 'step', value: 50 }], now);
  festa.draw(engine, (now += 300));
  assert.equal(count(), before + 1, 'normal: sobe o +50');
});

test('o cavalete do rabo no burro fica na beira da pista, é clicável até pregar o rabo', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  let clock = engine.now();
  engine.now = () => clock;
  let now = 5000;
  engine.debug('burro');
  festa.onEvents(engine, engine.drainEvents(), now);
  clock += 500;
  festa.draw(engine, (now += 30));
  assert.ok(festa.probe().burro, 'cavalete na festa');
  assert.ok(festa.areas().some(area => area.id === 'burro'));
  engine.pinBurro();
  festa.onEvents(engine, engine.drainEvents(), now);
  festa.draw(engine, (now += 30));
  assert.equal(festa.probe().burro.pinned, true);
  assert.ok(!festa.areas().some(area => area.id === 'burro'), 'pregado não clica mais');
  clock += 5000;
  engine.updateTimers(clock);
  festa.draw(engine, (now += 30));
  assert.equal(festa.probe().burro, null);
});

test('depois de um salto no relógio (repouso), os eventos da festa não começam todos no mesmo quadro', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  let now = 5000;
  for (let i = 0; i < 20; i++) festa.draw(engine, (now += 100));
  // Três horas dormindo: um quadro só logo depois de acordar.
  now += 3 * 3600 * 1000;
  festa.draw(engine, now);
  const busy = festa.probe();
  const started = [busy.fitas, busy.drones, busy.carroBoi, busy.flock, !!busy.compadres, busy.phones, busy.ring].filter(Boolean);
  assert.ok(started.length <= 1, `começaram juntos: ${started.length}`);
});
