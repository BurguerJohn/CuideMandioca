const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../src/data.js');
const { GameEngine } = require('../src/core.js');
const UI = require('../src/ui.js');
const { fakeContext, fakeDocument } = require('./fake-dom');

require('../src/festa-sprites.js');
const bundle = globalThis.FESTA_SPRITES;

// A festa sorteia posições e comportamentos com Math.random (a multidão, os bichos): com semente fixa os testes não oscilam.
const realRandom = Math.random;
let seed = 20260930;
Math.random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
test.after(() => { Math.random = realRandom; });

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
  // A mão que segura o item vem numa folha à parte (o jogo desenha corpo, item e mão, nessa ordem). De costas, no giro,
  // o item fica atrás; e de lado a âncora da mão aperta junto com o corpo (antes o item ficava solto no ar).
  for (const kit of growth) {
    assert.ok(kit.hand, 'folha da mão');
    assert.equal(kit.hand.frames, kit.anchors.length);
    assert.equal(kit.anchors[spin[0]].frente, true);
    assert.equal(kit.anchors[spin[8]].frente, false);
    assert.ok(kit.anchors[spin[4]].hand[0] > kit.anchors[spin[0]].hand[0], 'de lado a mão fica mais perto do meio');
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

test('a plateia usa quadros dentro das folhas e os guarda-chuvas têm cores válidas', () => {
  const previousDocument = globalThis.document;
  const previousImage = globalThis.Image;
  const atlasSizes = new Set([bundle.crowd.audience, bundle.crowd.audience2, bundle.crowd.audience3]
    .map(sheet => `${sheet.w * sheet.frames}|${sheet.h}`));
  const outside = [];
  const undefinedColors = [];
  let normal = 0;
  let mirrored = 0;
  let umbrellas = 0;
  globalThis.document = fakeDocument([], { drawImage: 0 });
  const makeElement = document.createElement;
  document.createElement = tag => {
    const element = makeElement(tag);
    if (tag === 'canvas') {
      const context = fakeContext();
      let fillStyle = context.fillStyle;
      Object.defineProperty(context, 'fillStyle', {
        get: () => fillStyle,
        set(value) {
          if (element.width === 9 && element.height === 8) {
            umbrellas++;
            if (value === undefined) undefinedColors.push(value);
          }
          fillStyle = value;
        }
      });
      context.drawImage = (source, ...args) => {
        if (args.length !== 8 || !atlasSizes.has(`${source.width}|${source.height}`)) return;
        if (source instanceof globalThis.Image) normal++;
        else mirrored++;
        const [x, y, width, height] = args;
        if (x < 0 || y < 0 || x + width > source.width || y + height > source.height) {
          outside.push([x, y, width, height, source.width, source.height]);
        }
      };
      element.getContext = () => context;
    }
    return element;
  };
  // Dimensões da própria arte: o contexto falso comum não percebe um recorte fora da folha de sprites.
  globalThis.Image = class {
    set src(value) {
      const png = Buffer.from(value.split(',')[1], 'base64');
      this.width = this.naturalWidth = png.readUInt32BE(16);
      this.height = png.readUInt32BE(20);
      this.complete = true;
      this.onload?.();
    }
  };
  try {
    require('../src/festa.js');
    const festa = globalThis.ArraiaFesta.create(document.createElement('canvas'), bundle);
    const engine = lateGame();
    for (let frame = 0; frame < 12; frame++) festa.draw(engine, 1000 + frame * 100);
    assert.ok(normal > 0 && mirrored > 0, 'testa a plateia nos dois sentidos');
    assert.equal(outside.length, 0, `nenhum convidado desaparece por um índice negativo: ${JSON.stringify(outside[0])}`);
    engine.state.weather.rain = { born: engine.now() - 10000, until: engine.now() + 30000 };
    festa.draw(engine, 2300);
    assert.ok(umbrellas > 0, 'a chuva abriu os guarda-chuvas');
    assert.equal(undefinedColors.length, 0, 'nenhum guarda-chuva recebe uma cor de índice negativo');
  } finally {
    globalThis.document = previousDocument;
    globalThis.Image = previousImage;
  }
});

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

test('os pintinhos seguem a galinha em fila, sem piscar entre andar e parar nem empilhar', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  // Esta trajetória inclui uma meia-volta logo depois de alguns pintinhos começarem a seguir. O sorteio da festa
  // fica separado dos outros testes: um teste de imagem novo não pode mudar o caminho desta galinha.
  const originalRandom = Math.random;
  let flockSeed = 3;
  let festa;
  try {
    Math.random = () => { flockSeed = (flockSeed * 1103515245 + 12345) % 2147483648; return flockSeed / 2147483648; };
    festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  } finally {
    Math.random = originalRandom;
  }
  festa.setScale(3);
  const engine = new GameEngine(data, null, { rng: () => 0.3 });
  while (engine.state.size < 160) engine.addFame(engine.fameNeed() - engine.state.fame);
  let now = 5000;
  let prev = null;
  let prevHen = null;
  const toggledAt = [];
  let flicker = 0;
  let stoppedForTurn = 0;
  let walked = 0;
  for (let f = 0; f < 3000; f++) {
    festa.draw(engine, (now += 17));
    const { hen, chicks } = festa.probe();
    assert.ok(hen && chicks.length > 1, 'galinha com pintinhos');
    chicks.forEach((chick, i) => {
      if (chick.walking) walked++;
      if (prev && prev[i].walking !== chick.walking) {
        // Antes ele alternava andar/parar quase todo quadro (e o desenho piscava entre andar e bicar).
        if (f - (toggledAt[i] ?? -99) <= 3) {
          // A mãe virar é uma parada real: quem ficou à frente espera ela passar, mesmo que tenha acabado de andar.
          if (prevHen.dir !== hen.dir && !chick.walking) stoppedForTurn++;
          else flicker++;
        }
        toggledAt[i] = f;
      }
    });
    const xs = chicks.map(chick => Math.round(chick.x)).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) assert.notEqual(xs[i], xs[i - 1], `dois pintinhos no mesmo lugar (quadro ${f})`);
    prev = chicks;
    prevHen = hen;
  }
  assert.ok(walked > 0, 'eles andam atrás da mãe');
  assert.ok(stoppedForTurn > 0, 'os pintinhos também param quando a mãe inverte o rumo');
  assert.ok(flicker <= 2, `andar/parar trocando a cada quadro: ${flicker}`);
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
  let wall = engine.now();
  engine.now = () => wall;
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
    wall += 1000;
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
  // Esta trajetória põe uma lanterna na frente da Mandioca no ponto testado; outros testes não mudam o sorteio.
  let sceneSeed = 1670642688;
  const originalRandom = Math.random;
  let festa;
  try {
    Math.random = () => { sceneSeed = (sceneSeed * 1103515245 + 12345) % 2147483648; return sceneSeed / 2147483648; };
    festa = globalThis.ArraiaFesta.create(canvas, bundle);
  } finally {
    Math.random = originalRandom;
  }
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
  const actualHit = festa.hit(200, 400);
  const covering = festa.areas().filter(({ box: [left, top, right, bottom] }) =>
    200 >= left && 200 < right && 400 >= top && 400 < bottom);
  assert.equal(actualHit, 'lanterna:1', 'a lanterna sorteada é um alvo legítimo sobre a Mandioca');
  assert.ok(covering.some(area => area.id === actualHit), 'o clique corresponde a uma área registrada que cobre o ponto');
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

test('os itens caros e criativos: custam mais que os antigos, liberam por porte, têm arte (e formas próprias) e vestem a festa', () => {
  const NOVOS = ['fatia-melancia', 'abacaxi-real', 'gorro-tubarao', 'cartola-magica', 'chapeu-mago', 'capacete-astronauta',
    'balao-estrela', 'sorvete-triplo', 'espada-neon', 'cajado-cristal', 'bola-cristal', 'agua-viva',
    'onca', 'psicodelico', 'galaxia', 'sereia', 'neon-retro', 'nuvem', 'gelo', 'lava', 'bolo-confeitado', 'pista-disco',
    'varal-pizza', 'varal-coracao', 'varal-peixe', 'varal-lanterna', 'varal-estrelas'];
  const byId = Object.fromEntries(data.items.map(item => [item.id, item]));
  for (const cat of ['chapeu', 'mao', 'tecido', 'terreiro', 'varal']) {
    // (Os itens dos temas novos também são caros e travados por porte; aqui só se compara com os antigos, que não têm porte.)
    const antigos = data.items.filter(item => item.cat === cat && !NOVOS.includes(item.id) && !item.tier);
    const novos = NOVOS.map(id => byId[id]).filter(item => item.cat === cat);
    assert.ok(novos.length >= 5, `${cat}: pelo menos 5 itens novos`);
    for (const item of novos) {
      assert.ok(item.price > Math.max(...antigos.map(old => old.price)), `${item.id} custa mais que qualquer item antigo de ${cat}`);
      assert.ok(item.tier >= 2 && !item.source, `${item.id} libera da Festa da Cidade em diante e se compra com fichas`);
    }
  }
  // Itens trancados pelo porte só abrem quando a festa chega lá.
  const fresh = new GameEngine(data, null, { rng: () => 0.5 });
  fresh.state.tickets = 1000;
  assert.equal(fresh.itemLocked('capacete-astronauta'), true);
  assert.equal(fresh.buyItem('capacete-astronauta'), false);
  const late = lateGame();
  late.state.tickets = 1000;
  assert.equal(late.itemLocked('capacete-astronauta'), false);
  assert.equal(late.buyItem('capacete-astronauta'), true);
  assert.equal(late.state.tickets, 1000 - byId['capacete-astronauta'].price);
  // Arte: o chapéu alto sobe pelo oy, o item de mão animado tem vários quadros, o terreiro e o varal têm formas e cores próprias.
  assert.ok(bundle.hats['chapeu-mago'].oy < bundle.hats['fatia-melancia'].oy, 'o chapéu de mago passa do topo da cabeça');
  for (const id of ['balao-estrela', 'sorvete-triplo', 'espada-neon', 'cajado-cristal', 'bola-cristal', 'agua-viva']) {
    assert.equal(bundle.hand[id].frames, 4, `${id} se mexe em 4 quadros`);
    assert.equal(bundle.hand[id].growth.length, 3, `${id} nos tamanhos menores`);
  }
  assert.deepEqual(bundle.terrains.nuvem.root, [], 'a nuvem não tem raízes');
  assert.equal(bundle.terrains['pista-disco'].pattern, 'disco');
  for (const id of ['lava', 'gelo', 'bolo-confeitado']) assert.equal(bundle.terrains[id].root.length, 4, `raízes de ${id}`);
  for (const id of ['varal-pizza', 'varal-coracao', 'varal-peixe', 'varal-lanterna', 'varal-estrelas']) {
    const varal = bundle.varais[id];
    assert.ok(varal.shape.length >= 5 && varal.shape.every(row => row.length === varal.shape[0].length), `forma do ${id}`);
    assert.ok(varal.colors.length >= 3, `cores do ${id}`);
  }
  // A festa veste, pendura e desenha cada um.
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  let now = 9000;
  for (const id of NOVOS) {
    engine.state.inventory.push(id);
    assert.ok(engine.equip(id), `veste o ${id}`);
    for (let i = 0; i < 4; i++) festa.draw(engine, (now += 40));
    festa.draw(engine, (now += 40), { [byId[id].cat]: id });
  }
  // Os conjuntos novos fecham com as três peças e rendem o bônus.
  for (const set of data.sets.filter(entry => entry.bonus >= 0.09)) {
    for (const id of [set.hat, set.hand, set.fabric]) { engine.state.inventory.push(id); engine.equip(id); }
    assert.equal(engine.activeSet()?.id, set.id, set.id);
  }
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

test('o confete do resultado do concurso espera o anúncio para aparecer', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const originalRandom = Math.random;
  Math.random = () => 0.5;
  try {
    const canvas = globalThis.document.createElement('canvas');
    const context = fakeContext({ drawImage: 0 });
    let confettiPixels = 0;
    context.fillRect = (x, y, w, h) => {
      if (context.fillStyle === '#ee2f3c' && w === 2 && h === 1) confettiPixels++;
    };
    canvas.getContext = () => context;
    const festa = globalThis.ArraiaFesta.create(canvas, bundle);
    const engine = lateGame();
    festa.draw(engine, 5000);
    festa.onEvents(engine, [{ type: 'contest', place: 1, notes: [10, 10, 10] }], 5000);
    confettiPixels = 0;
    festa.draw(engine, 6400);
    assert.equal(confettiPixels, 0, 'o confete ainda não nasceu');
    festa.draw(engine, 6600);
    assert.ok(confettiPixels > 0, 'o confete aparece junto com o resultado');
  } finally {
    Math.random = originalRandom;
  }
});

test('o lote de um novo ano não ressuscita a cobra do ano anterior', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(document.createElement('canvas'), bundle);
  const engine = new GameEngine(data, null, { rng: () => 0.5 });
  engine.state.size = engine.state.records.size = 100;
  festa.draw(engine, 5000);
  assert.ok(engine.debug('cobra'));
  assert.equal(engine.newYear(), true);
  const events = engine.drainEvents();
  assert.ok(events.some(event => event.type === 'cobra'));
  assert.ok(events.some(event => event.type === 'new-year'));
  festa.onEvents(engine, events, 5100);
  festa.draw(engine, 5140);
  assert.equal(festa.probe().cobra, null, 'a cobra cancelada não atravessa o quintal novo');
  assert.ok(!festa.areas().some(area => area.id === 'cobra'), 'a cobra antiga não bloqueia cliques');
  assert.ok(festa.probe().particles > 0 && festa.probe().texts > 0, 'a comemoração do ano novo ainda aparece');
});

test('reset limpa cenas e cliques da festa anterior e redesenha mesmo no mesmo instante', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const canvas = globalThis.document.createElement('canvas');
  const festa = globalThis.ArraiaFesta.create(canvas, bundle);
  const engine = lateGame();
  engine.state.size = 160;
  festa.draw(engine, 5000);
  engine.debug('cobra');
  festa.onEvents(engine, engine.drainEvents(), 5000);
  festa.provocar('compadres');
  festa.draw(engine, 5100);
  assert.ok(festa.probe().cobra);
  festa.setCalm(true);
  festa.setScale(2);
  festa.reset();
  assert.equal(festa.probe().cobra, null);
  assert.equal(festa.probe().compadres, null);
  assert.equal(festa.probe().particles, 0);
  assert.equal(festa.probe().texts, 0);
  assert.deepEqual(festa.areas(), []);
  const fresh = new GameEngine(data, null, { rng: () => 0.5 });
  festa.draw(fresh, 5100);
  assert.equal(canvas.height, 204);
  assert.equal(festa.size().ground, 160);
  assert.equal(festa.size().physical, 2, 'preserva a escala escolhida');
  assert.ok(festa.areas().some(area => area.id === 'host'));
  festa.onEvents(fresh, [{ type: 'step', value: 50 }], 5100);
  festa.draw(fresh, 5400);
  assert.equal(festa.probe().stepTexts, 0, 'preserva menos letreiros');
});

test('o próximo São João descarta cenas anteriores antes de comemorar no novo quintal', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const canvas = globalThis.document.createElement('canvas');
  const festa = globalThis.ArraiaFesta.create(canvas, bundle);
  const engine = lateGame();
  engine.state.size = 160;
  festa.draw(engine, 5000);
  engine.debug('cobra');
  festa.onEvents(engine, engine.drainEvents(), 5000);
  festa.draw(engine, 5100);
  assert.ok(festa.probe().cobra);
  assert.ok(engine.newYear());
  festa.onEvents(engine, engine.drainEvents(), 5100);
  assert.equal(festa.probe().cobra, null, 'a cobra do ano anterior não segue atravessando');
  assert.equal(festa.size().ground, 160, 'a comemoração já usa o chão do quintal');
  assert.ok(festa.probe().particles > 0, 'comemora o novo ano');
  festa.draw(engine, 5200);
  assert.equal(canvas.height, 204);
  assert.ok(!festa.areas().some(area => area.id === 'cobra'));
});

test('as ilhas do céu de uma festa não alteram dimensões de outra instância', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const first = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  const fresh = new GameEngine(data, null, { rng: () => 0.5 });
  first.draw(fresh, 5000);
  const original = first.size();
  const large = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  const engine = lateGame();
  engine.state.size = 160;
  large.draw(engine, 5000);
  assert.equal(large.size().ground, 210);
  assert.deepEqual(first.size(), original);
  large.reset();
  assert.deepEqual(first.size(), original, 'reset de uma instância também é independente');
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

test('gancho do gravador: provocar começa drones, dança das fitas, compadres e carro de boi na hora', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  engine.state.inventory.push('mastro');
  engine.equip('mastro', 'esquerda');
  let now = 5000;
  festa.draw(engine, now);
  assert.equal(festa.provocar('nada'), false);
  assert.ok(festa.provocar('fitas'));
  assert.ok(festa.provocar('compadres', { idade: 2500 }));
  assert.ok(festa.provocar('carroBoi', { lado: -1 }));
  festa.draw(engine, (now += 50));
  const p = festa.probe();
  assert.equal(p.fitas, true);
  assert.equal(p.compadres, 'verse', 'dois segundos e meio depois de começar, estão no primeiro verso');
  // Drones: só no Maior São João do Mundo (porte 4).
  assert.ok(festa.provocar('drones', { ordem: [3, 4, 4, 4, 4] }));
  festa.draw(engine, (now += 50));
  assert.equal(festa.probe().drones, engine.tierIndex() >= 4);
});

test('a Mandioca pede comida com a Barriga baixa (e não pede nada feliz)', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const run = mood => {
    const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
    festa.setScale(3);
    let now = 5000;
    const engine = new GameEngine(data, null, { rng: () => 0.5, now: () => now });
    engine.state.humor = { ...mood, at: now };
    for (let i = 0; i < 280; i++) festa.draw(engine, (now += 250));
    return festa.probe().moodSaid;
  };
  assert.equal(run({ amor: 90, barriga: 5 }), 'fome');
  assert.equal(run({ amor: 5, barriga: 90 }), 'carente');
  assert.equal(run({ amor: 100, barriga: 100 }), null);
});

test('os troféus da Mata Encantada: 12 itens que só vêm dos chefes, com arte própria, e a festa veste cada um (e fecha os conjuntos novos)', () => {
  const trofeus = data.items.filter(item => item.source === 'luta');
  assert.equal(trofeus.length, data.minis.mata.unlocks.length);
  const porCategoria = Object.fromEntries(['chapeu', 'mao', 'tecido', 'terreiro', 'varal'].map(cat => [cat, trofeus.filter(item => item.cat === cat).map(item => item.id)]));
  assert.deepEqual(Object.values(porCategoria).map(list => list.length), [5, 3, 1, 2, 1]);
  // Nenhum se compra: nem com a festa no máximo e cheia de fichas.
  const late = lateGame();
  late.state.tickets = 100000;
  for (const item of trofeus) {
    assert.equal(late.buyItem(item.id), false, `${item.id} não se compra`);
    assert.equal(late.owned(item.id), false);
  }
  // Arte: chapéus que passam do topo da cabeça sobem pelo oy, mãos animadas em 4 quadros (e nos tamanhos menores), terreiros e varal próprios.
  for (const id of porCategoria.chapeu) {
    assert.ok(bundle.hats[id] && bundle.hats[id].growth.length === 3, `chapéu ${id} nos tamanhos menores`);
    assert.ok(bundle.icons[`item:${id}`], `ícone de ${id}`);
  }
  assert.ok(bundle.hats['cobra-grande'].oy < bundle.hats['chapeu-boto'].oy, 'a cobra enrolada é mais alta que o chapéu do Boto');
  assert.ok(bundle.hats['cabelo-curupira'].oy < bundle.hats['capuz-lobisomem'].oy);
  for (const id of porCategoria.mao) {
    assert.equal(bundle.hand[id].frames, 4, `${id} se mexe em 4 quadros`);
    assert.equal(bundle.hand[id].growth.length, 3);
    assert.ok(bundle.icons[`item:${id}`]);
  }
  assert.ok(bundle.mandioca['capa-boi-bumba'] && bundle.mandioca['capa-boi-bumba'].frames > 100, 'a capa existe no corpo da Mandioca');
  assert.ok(bundle.icons['item:capa-boi-bumba']);
  for (const id of porCategoria.terreiro) {
    const terrain = bundle.terrains[id];
    assert.ok(terrain.top.length >= 3 && terrain.root.length === 4 && terrain.flowers.length >= 3, `terreiro ${id}`);
    assert.ok(bundle.icons[`item:${id}`]);
  }
  const varal = bundle.varais['varal-boitata'];
  assert.ok(varal.shape.length >= 6 && varal.shape.every(row => row.length === varal.shape[0].length) && varal.colors.length >= 3);
  assert.ok(bundle.icons['item:varal-boitata']);
  // A festa veste, pendura e desenha cada um (sem a festa levantar erro) e nenhum precisa de loja para aparecer.
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = lateGame();
  let now = 9000;
  for (const item of trofeus) {
    assert.equal(engine.addItem(item.id), true);
    assert.ok(engine.equip(item.id), `veste o ${item.id}`);
    for (let i = 0; i < 4; i++) festa.draw(engine, (now += 40));
    festa.draw(engine, (now += 40), { [item.cat]: item.id });
  }
  // Os dois conjuntos novos fecham com as três peças e rendem o bônus (dentro do teto de 12%).
  for (const id of ['guardiao-da-mata', 'lenda-viva']) {
    const set = data.sets.find(entry => entry.id === id);
    assert.ok(set && set.bonus <= 0.12 && set.bonus >= 0.1, id);
    for (const piece of [set.hat, set.hand, set.fabric]) assert.equal(data.items.find(item => item.id === piece).source, 'luta', `${id}: ${piece} é troféu`);
    for (const piece of [set.hat, set.hand, set.fabric]) engine.equip(piece);
    assert.equal(engine.activeSet()?.id, id);
  }
});

test('o Rafael (segredo "yeye") só aparece depois de chamado, anda e bebe o quentão e grita pulando no clique', () => {
  const { fakeContext } = require('./fake-dom');
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const canvas = globalThis.document.createElement('canvas');
  const draws = [];
  canvas.getContext = () => ({ ...fakeContext(), drawImage(image, sx) { draws.push([image.value, sx]); } });
  const festa = globalThis.ArraiaFesta.create(canvas, bundle);
  festa.setScale(3);
  const engine = new GameEngine(data, null, { rng: () => 0.3 });
  const meta = bundle.chars.rafael;
  const sheet = bundle.images[meta.image];
  const used = () => new Set(draws.filter(([image]) => image === sheet).map(([, sx]) => sx / meta.w));
  const run = (frames, from) => { let now = from; for (let i = 0; i < frames; i++) festa.draw(engine, (now += 30)); return now; };
  const yeah = new Set(meta.poses.yeah);
  let now = run(40, 5000);
  assert.equal(used().size, 0, 'sem o segredo ele não está na festa');
  assert.ok(!festa.areas().some(area => area.id === 'bicho:rafael'));
  // Chamado: aparece clicável, grita ao chegar (quadros de pulo) e depois volta a passear.
  engine.toggleRafael();
  festa.onEvents(engine, [{ type: 'rafael', first: true }], now);
  now = run(30, now);
  assert.ok(festa.areas().some(area => area.id === 'bicho:rafael'), 'o Rafael é clicável');
  assert.ok([...used()].some(frame => yeah.has(frame)), 'grita ao chegar');
  now = run(70, now);
  draws.length = 0;
  now = run(400, now);
  const calm = [...used()];
  assert.ok(calm.length >= 3, `anda, para, pisca e bebe (${calm})`);
  assert.ok(!calm.some(frame => yeah.has(frame)), 'depois do grito ele volta ao normal');
  assert.ok(calm.some(frame => meta.poses.anda.includes(frame)), 'anda');
  // Clicar nele faz gritar de novo.
  draws.length = 0;
  festa.poke('bicho:rafael');
  run(30, now);
  assert.ok([...used()].some(frame => yeah.has(frame)), 'o clique faz gritar "YEAH YEAH"');
  // Digitar "yeye" de novo o esconde: some da festa e não é mais clicável (nem o clique antigo o faz gritar).
  engine.toggleRafael();
  festa.onEvents(engine, [{ type: 'rafael-hide', first: false }], now);
  draws.length = 0;
  now = run(60, now);
  assert.equal(used().size, 0, 'escondido ele não é desenhado');
  assert.ok(!festa.areas().some(area => area.id === 'bicho:rafael'), 'e não é clicável');
  // Outra vez: volta gritando e passeia de novo.
  engine.toggleRafael();
  festa.onEvents(engine, [{ type: 'rafael', first: false }], now);
  draws.length = 0;
  now = run(30, now);
  assert.ok(festa.areas().some(area => area.id === 'bicho:rafael'), 'de volta, clicável');
  assert.ok([...used()].some(frame => yeah.has(frame)), 'volta gritando');
});

test('uma folha de arte que falha não prende o carregamento da festa inteira', () => {
  for (const failed of ['folha-de-outra-janela', ...Object.keys(bundle.images)]) {
    const calls = { drawImage: 0 };
    globalThis.document = fakeDocument([], calls);
    globalThis.Image = class {
      set src(value) {
        this.value = value;
        this.complete = true;
        this.failed = value === 'imagem-quebrada';
        this.width = this.height = this.failed ? 0 : 12;
        if (this.failed) this.onerror?.();
        else this.onload?.();
      }
    };
    require('../src/festa.js');
    const canvas = globalThis.document.createElement('canvas');
    const g = fakeContext(calls);
    const drawImage = g.drawImage.bind(g);
    g.drawImage = (...args) => {
      if (args[0]?.failed) throw new Error('InvalidStateError: imagem sem dados');
      drawImage(...args);
    };
    canvas.getContext = () => g;
    const festa = globalThis.ArraiaFesta.create(canvas, { ...bundle, images: { ...bundle.images, [failed]: 'imagem-quebrada' } });
    const engine = new GameEngine(data, null, { rng: () => 0.5 });
    assert.doesNotThrow(() => festa.draw(engine, 1000));
    assert.ok(festa.areas().length > 0, `${failed}: o resto da cena foi desenhado`);
    assert.ok(calls.drawImage > 0, `${failed}: há arte visível`);
  }
});

test('carregar um chapéu no lugar do enfeite lateral não interrompe o desenho nem remove os alvos da festa', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const clock = 1_000_000;
  for (const side of ['esquerda', 'direita']) {
    const saved = new GameEngine(data, null, { now: () => clock, rng: () => 0.5 }).exportState();
    saved.equipped[side] = 'chapeu-palha';
    const engine = new GameEngine(data, saved, { now: () => clock, rng: () => 0.5 });
    const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
    assert.doesNotThrow(() => festa.draw(engine, 1000), `${side}: o save aceito precisa continuar desenhável`);
    assert.ok(festa.areas().some(area => area.id === `lado-${side}`), 'o enfeite restaurado continua clicável');
    assert.ok(festa.areas().some(area => area.id === 'host'), 'a Mandioca continua clicável');
  }
});

test('visitas do folclore: as 20 aparecem na festa com a arte da Mata, só são clicáveis até o clique e somem depois', () => {
  const { fakeContext } = require('./fake-dom');
  require('../src/festa-folclore.js');
  const { SOUNDS } = globalThis.ArraiaFestaFolclore;
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const canvas = globalThis.document.createElement('canvas');
  const draws = [];
  canvas.getContext = () => ({ ...fakeContext(), drawImage(image, sx) { draws.push([image.value, sx]); } });
  const sounds = [];
  const festa = globalThis.ArraiaFesta.create(canvas, bundle, { sound: name => sounds.push(name) });
  festa.setScale(3);
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(data, null, { rng: () => 0.3, now: () => clock.t });
  engine.state.size = engine.state.records.size = 85;
  const sheets = new Set([bundle.images[bundle.janelas.mata.comuns.image], bundle.images[bundle.janelas.mata.chefes.image]]);
  let now = 5000;
  const run = (ms) => { for (let spent = 0; spent < ms; spent += 33) { now += 33; clock.t += 33; festa.draw(engine, now); } };
  run(300);
  assert.equal(festa.probe().folclore, null, 'sem visita não tem nada');
  assert.ok(!festa.areas().some(area => area.id === 'folclore'));
  const folclore = engine.mini('folclore');
  for (const entry of data.minis.folclore.events) {
    engine.state.minis.folclore.active = null;
    sounds.length = 0;
    folclore.start(entry.id);
    draws.length = 0;
    // Ela chega (som da chegada) e, na hora do meio da visita, está na tela e dá para clicar.
    run(entry.seconds * 400);
    assert.equal(sounds[0], SOUNDS[entry.id], `${entry.id}: som da chegada`);
    assert.ok(draws.some(([image]) => sheets.has(image)), `${entry.id}: usa a arte da Mata`);
    assert.ok(festa.areas().some(area => area.id === 'folclore'), `${entry.id}: dá para clicar`);
    assert.equal(festa.probe().folclore.caught, false);
    // O clique: confete, o som do prêmio, e a região some (a criatura vai embora sem poder ser clicada de novo).
    assert.ok(folclore.act(), `${entry.id}: prêmio`);
    run(100);
    assert.ok(sounds.includes('premio'), `${entry.id}: som do prêmio`);
    assert.equal(festa.probe().folclore.caught, true);
    assert.ok(!festa.areas().some(area => area.id === 'folclore'), `${entry.id}: depois do clique não é mais clicável`);
    // Passada a saída, a visita acaba e a festa volta ao normal.
    run(data.minis.folclore.exit + 400);
    engine.tick(0.1);
    run(100);
    assert.equal(festa.probe().folclore, null, `${entry.id}: foi embora`);
  }
  // Uma visita que ninguém clicou também acaba sozinha, sem erro.
  folclore.start('boitata');
  run(40000);
  engine.tick(0.1);
  run(100);
  assert.equal(festa.probe().folclore, null);
  assert.equal(engine.state.minis.folclore.active, null);
});

test('prêmios dos minigames: coisas e personagens aparecem na festa, cabem pela largura, se revezam, reagem ao clique e recomeçam no ano novo', () => {
  const { fakeContext } = require('./fake-dom');
  require('../src/festa-premios.js');
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const canvas = globalThis.document.createElement('canvas');
  const draws = new Set();
  canvas.getContext = () => ({ ...fakeContext(), drawImage(image) { draws.add(image.value); } });
  const festa = globalThis.ArraiaFesta.create(canvas, bundle, {});
  festa.setScale(3);
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(data, null, { rng: () => 0.3, now: () => clock.t });
  let now = 5000;
  const run = ms => { for (let spent = 0; spent < ms; spent += 33) { now += 33; clock.t += 33; festa.draw(engine, now); } };
  const sheetOf = id => bundle.images[bundle.premios[id].image];
  const goldSheetOf = id => bundle.images[bundle.premios[`${id}-ouro`].image];
  const unlockAll = () => {
    for (const game of data.premios.jogos) { engine.state.premios.count[game.id] = 9999; engine.premios.unlock(game.id); }
    festa.onEvents(engine, engine.drainEvents(), now);
  };
  engine.state.size = engine.state.records.size = 110;
  run(300);
  assert.deepEqual(festa.probe().premios, { chao: [], varal: [], fundo: [], pessoa: [], spot: null, acting: [], glints: 0, chats: 0, lastChat: [], said: [], gold: [], parade: [] }, 'sem prêmio não tem nada');
  assert.ok(!festa.areas().some(area => area.id.startsWith('premio:')));
  // Com tudo liberado, cada lugar tem o seu e o prêmio recém-chegado fica de destaque.
  unlockAll();
  run(1500);
  const shown = festa.probe().premios;
  assert.ok(shown.chao.length >= 2 && shown.chao.length <= 9, `coisas no chão: ${shown.chao}`);
  assert.deepEqual(shown.varal.length, 3, 'as três coisas do varal');
  assert.deepEqual([...shown.fundo].sort(), ['corneta-alto', 'totem-curupira'], 'as duas coisas altas do fundo, cada uma no seu lugar');
  const [one, two] = shown.fundo.map(id => festa.areas().find(entry => entry.id === `premio:${id}`).box);
  assert.ok(one[2] <= two[0] || two[2] <= one[0], 'as duas coisas do fundo não ficam uma em cima da outra');
  assert.ok(shown.pessoa.length >= 2 && shown.pessoa.length <= 6, `personagens: ${shown.pessoa}`);
  assert.ok(shown.spot, 'o último prêmio chegou');
  const area = id => festa.areas().find(entry => entry.id === `premio:${id}`);
  for (const id of [...shown.chao, ...shown.varal, ...shown.fundo, ...shown.pessoa]) assert.ok(area(id), `${id}: dá para clicar`);
  // Com os troféus de ouro, as coisas aparecem em ouro e os personagens (coroados) com a arte própria.
  for (const id of [...shown.chao, ...shown.varal, ...shown.fundo]) assert.ok(draws.has(goldSheetOf(id)), `${id}: em ouro`);
  for (const id of shown.pessoa) assert.ok(draws.has(sheetOf(id)), `${id}: desenhado com a arte própria`);
  assert.deepEqual([...shown.gold].sort(), [...shown.chao, ...shown.varal, ...shown.fundo, ...shown.pessoa].sort(), 'tudo o que aparece é de ouro (coisa e personagem coroado)');
  // Nada da frente da festa (coisas do chão e personagens, andando) fica por cima da Mandioca.
  const host = festa.areas().find(entry => entry.id === 'host');
  for (let k = 0; k < 40; k++) {
    run(500);
    for (const id of [...festa.probe().premios.chao, ...festa.probe().premios.pessoa]) {
      const box = area(id).box;
      assert.ok(box[2] <= host.box[0] + 1 || box[0] >= host.box[2] - 1, `${id}: fora da Mandioca`);
    }
  }
  // O revezamento mostra, ao longo do tempo, todos os personagens e todas as coisas do chão.
  const seen = new Set();
  for (let k = 0; k < 40; k++) {
    now += 150000;
    clock.t += 150000;
    run(100);
    const p = festa.probe().premios;
    [...p.chao, ...p.varal, ...p.fundo, ...p.pessoa].forEach(id => seen.add(id));
  }
  assert.deepEqual(data.premios.itens.filter(item => item.tipo !== 'ouro' && !seen.has(item.id)).map(item => item.id), [], 'todos aparecem em algum momento');
  // Clicar não quebra nada: coisa e personagem reagem; o presente vira confete.
  run(1000);
  const p = festa.probe().premios;
  const person = p.pessoa[0];
  assert.doesNotThrow(() => { festa.poke(`premio:${p.chao[0]}`); festa.poke(`premio:${person}`); festa.poke('premio:nao-existe'); });
  // O personagem que acabou de dar o presente comemora na hora (pose de ação), mesmo se estava parado ou andando.
  for (let k = 0; k < 400 && festa.probe().premios.acting.includes(person); k++) run(100);
  assert.ok(!festa.probe().premios.acting.includes(person));
  const gift = engine.premios.gift(person);
  assert.equal(gift.ok, true);
  festa.onEvents(engine, engine.drainEvents(), now);
  run(33);
  assert.ok(festa.probe().premios.acting.includes(person), 'comemorou o presente');
  run(500);
  // Festa pequena: sem lugar no chão, só o que cabe no varal.
  festa.onEvents(engine, [{ type: 'new-year' }], now);
  engine.state.size = engine.state.records.size = 3;
  run(600);
  const small = festa.probe().premios;
  assert.deepEqual([small.chao.length, small.pessoa.length], [0, 0], 'o terreiro pequeno não tem vaga');
  assert.ok(small.varal.length <= 1);
  // O ano novo limpa os efeitos mas os prêmios continuam, e um motor sem prêmios desenha do mesmo jeito.
  assert.equal(engine.premios.total(), 105);
  const bare = new GameEngine(data, null, { rng: () => 0.3, now: () => clock.t });
  delete bare.premios;
  assert.doesNotThrow(() => festa.draw(bare, now + 100));
  const { glints, chats, lastChat, said, ...rest } = festa.probe().premios;
  assert.deepEqual(rest, { chao: [], varal: [], fundo: [], pessoa: [], spot: null, acting: [], gold: [], parade: [] });
});

test('prêmios dos minigames: as coisas soltam vapor, bolhas e brilhos sozinhas, e a festa reage ao jogo do minigame de cada prêmio', () => {
  const { fakeContext } = require('./fake-dom');
  require('../src/festa-premios.js');
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const canvas = globalThis.document.createElement('canvas');
  const draws = new Set();
  let crownPixels = 0;
  canvas.getContext = () => ({ ...fakeContext(), drawImage(image) { draws.add(image.value); }, fillRect() { if (this.fillStyle === '#c8841a') crownPixels++; } });
  const festa = globalThis.ArraiaFesta.create(canvas, bundle, {});
  festa.setScale(3);
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(data, null, { rng: () => 0.3, now: () => clock.t });
  engine.state.size = engine.state.records.size = 110;
  let now = 5000;
  const run = ms => { for (let spent = 0; spent < ms; spent += 33) { now += 33; clock.t += 33; festa.draw(engine, now); } };
  // Só a Fogueira de Perto liberou: a panela é a única coisa do chão, e solta vapor.
  engine.state.premios.count.fogueira = 20;
  engine.premios.unlock('fogueira');
  festa.onEvents(engine, engine.drainEvents(), now);
  run(4000);
  let p = festa.probe().premios;
  assert.deepEqual(p.chao, ['panela-fogo']);
  assert.deepEqual(p.pessoa, ['chico-assador']);
  assert.ok(p.glints >= 3, `vapor da panela: ${p.glints}`);
  assert.deepEqual(p.gold, [], 'sem troféu, sem ouro');
  assert.equal(crownPixels, 0, 'sem troféu, sem coroa');
  assert.ok(draws.has(bundle.images[bundle.premios['panela-fogo'].image]) && !draws.has(bundle.images[bundle.premios['panela-fogo-ouro'].image]), 'arte comum');
  // Jogar o minigame faz o personagem comemorar na hora (uma vez por vez, não a cada espetinho).
  for (let k = 0; k < 400 && festa.probe().premios.acting.length; k++) run(100);
  assert.deepEqual(festa.probe().premios.acting, []);
  engine.emit('mini', { mini: 'fogueira', kind: 'roasted', perfect: false });
  festa.onEvents(engine, engine.drainEvents(), now);
  run(33);
  assert.deepEqual(festa.probe().premios.acting, ['chico-assador'], 'comemorou o espetinho');
  // Um jogo que não é o dele não mexe com ele.
  for (let k = 0; k < 400 && festa.probe().premios.acting.length; k++) run(100);
  engine.emit('rings', { hits: 1, mult: 1 });
  festa.onEvents(engine, engine.drainEvents(), now);
  run(33);
  assert.deepEqual(festa.probe().premios.acting, []);
  // O troféu de ouro: a panela vira ouro, o personagem ganha a coroa e o nome do troféu sobe na festa.
  engine.state.premios.count.fogueira = 80;
  engine.premios.unlock('fogueira');
  festa.onEvents(engine, engine.drainEvents(), now);
  run(1500);
  p = festa.probe().premios;
  assert.deepEqual(p.gold.sort(), ['chico-assador', 'panela-fogo']);
  assert.equal(p.spot, 'panela-fogo-ouro');
  assert.ok(draws.has(bundle.images[bundle.premios['panela-fogo-ouro'].image]), 'arte de ouro');
  assert.ok(crownPixels > 0, 'o Chico ganhou a coroa');
});

test('prêmios dos minigames: o Desfile dos Prêmios leva os personagens para a fila, dá para clicar até pegar o prêmio, e eles voltam a passear depois', () => {
  const { fakeContext } = require('./fake-dom');
  require('../src/festa-premios.js');
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const canvas = globalThis.document.createElement('canvas');
  const draws = new Set();
  canvas.getContext = () => ({ ...fakeContext(), drawImage(image) { draws.add(image.value); } });
  const festa = globalThis.ArraiaFesta.create(canvas, bundle, {});
  festa.setScale(3);
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(data, null, { rng: () => 0.3, now: () => clock.t });
  engine.state.size = engine.state.records.size = 110;
  let now = 5000;
  const run = ms => { for (let spent = 0; spent < ms; spent += 33) { now += 33; clock.t += 33; festa.draw(engine, now); } };
  for (const game of data.premios.jogos.slice(0, 8)) { engine.state.premios.count[game.id] = 12; engine.premios.unlock(game.id); }
  festa.onEvents(engine, engine.drainEvents(), now);
  run(2000);
  assert.deepEqual(festa.probe().premios.parade, []);
  assert.ok(festa.probe().premios.pessoa.length >= 2, 'passeando');
  assert.ok(!festa.areas().some(area => area.id === 'premio:desfile'));
  assert.equal(engine.premios.startParade(), true);
  const sounds = [];
  festa.onEvents(engine, engine.drainEvents(), now);
  run(15000);
  const march = festa.probe().premios;
  assert.ok(march.parade.length >= 3, `a fila está na festa: ${march.parade}`);
  assert.deepEqual(march.pessoa, [], 'quem passeava foi para a fila');
  assert.ok(march.parade.every(id => engine.state.premios.parade.active.ids.includes(id)));
  const marchers = festa.areas().filter(area => area.id === 'premio:desfile');
  assert.equal(marchers.length, march.parade.length, 'dá para clicar em cada um da fila');
  for (const id of march.parade) assert.ok(draws.has(bundle.images[bundle.premios[id].image]), `${id}: na fila com a arte dele`);
  // Pegou: o prêmio vem, o confete sai e a fila continua sem poder ser clicada de novo.
  assert.equal(engine.premios.catchParade().ok, true);
  const before = festa.probe().premios.glints;
  assert.doesNotThrow(() => { festa.onEvents(engine, engine.drainEvents(), now); });
  assert.ok(festa.probe().premios.glints - before >= march.parade.length, 'confete e brilho na fila toda');
  run(200);
  assert.ok(!festa.areas().some(area => area.id === 'premio:desfile'), 'depois do prêmio, nada para clicar');
  assert.ok(festa.probe().premios.parade.length >= 1, 'a fila segue passando');
  // Acabou: os personagens voltam a passear.
  run(data.premios.desfile.seconds * 1000);
  engine.tick(0.1);
  run(1500);
  const done = festa.probe().premios;
  assert.deepEqual(done.parade, []);
  assert.ok(done.pessoa.length >= 2, 'voltaram a passear');
});

test('prêmios dos minigames: quem esbarra no passeio conversa (o segundo responde logo depois) e a Dona Bola canta números do bingo', () => {
  // O sorteio da festa muda com tudo o que rodou antes (a semente é uma só para o arquivo inteiro): este teste usa a própria semente, para não oscilar.
  const outerRandom = Math.random;
  let ownSeed = 7;
  Math.random = () => { ownSeed = (ownSeed * 1103515245 + 12345) % 2147483648; return ownSeed / 2147483648; };
  try {
  const { fakeContext } = require('./fake-dom');
  require('../src/festa-premios.js');
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const canvas = globalThis.document.createElement('canvas');
  canvas.getContext = () => ({ ...fakeContext(), drawImage() {} });
  const festa = globalThis.ArraiaFesta.create(canvas, bundle, {});
  festa.setScale(3);
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(data, null, { rng: () => 0.3, now: () => clock.t });
  // Numa festa larga cabem vários personagens do mesmo lado da Mandioca (na estreita, cada lado tem um só e eles nunca se encontram).
  engine.state.size = engine.state.records.size = 250;
  let now = 5000;
  const run = ms => { for (let spent = 0; spent < ms; spent += 33) { now += 33; clock.t += 33; festa.draw(engine, now); } };
  for (const game of data.premios.jogos.slice(0, 8)) { engine.state.premios.count[game.id] = 12; engine.premios.unlock(game.id); }
  festa.onEvents(engine, engine.drainEvents(), now);
  run(1000);
  assert.ok(festa.probe().premios.pessoa.length >= 4, `vários passeando: ${festa.probe().premios.pessoa}`);
  // Esperando, dois acabam esbarrando; na hora a conversa começa e o outro responde cerca de um segundo depois.
  let found = false;
  for (let tenth = 0; tenth < 6000 && !found; tenth++) {
    const before = festa.probe().premios.chats;
    run(100);
    if (festa.probe().premios.chats > before) found = true;
  }
  assert.ok(found, 'dois personagens conversaram');
  const [first, second] = festa.probe().premios.lastChat;
  assert.ok(first && second && first !== second, 'um puxou conversa com outro');
  assert.ok(festa.probe().premios.acting.includes(first), 'quem puxou conversa fala na hora');
  assert.ok(!festa.probe().premios.acting.includes(second), 'o outro ainda está ouvindo');
  run(1250);
  assert.ok(festa.probe().premios.acting.includes(second), 'o outro respondeu pouco depois');
  // A Dona Bola, com o presente já pego (senão o clique só dá o presente), canta número de bingo de vez em quando.
  engine.premios.gift('dona-bola');
  let numbers = 0;
  for (let k = 0; k < 60 && !numbers; k++) {
    festa.poke('premio:dona-bola');
    run(1700);
    numbers = festa.probe().premios.said.filter(text => /^[BINGO] \d{1,2}!$/.test(text)).length;
  }
  assert.ok(numbers > 0, 'cantou um número do bingo');
  assert.ok(festa.probe().premios.said.every(text => /^[A-Z0-9 .,:!?+%-]+$/.test(text)), 'só letras da fonte de pixel');
  } finally {
    Math.random = outerRandom;
  }
});

test('eventos do mundo: cada um desenha na festa, os alvos são clicáveis até serem pegos, o temporal traz chuva e o vento sopra', () => {
  const { fakeContext } = require('./fake-dom');
  require('../src/festa-mundo.js');
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const canvas = globalThis.document.createElement('canvas');
  const draws = [];
  canvas.getContext = () => ({ ...fakeContext(), drawImage() {}, fillRect(x, y, w, h) { draws.push(this.fillStyle); } });
  const festa = globalThis.ArraiaFesta.create(canvas, bundle, {});
  festa.setScale(3);
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(data, null, { rng: () => 0.3, now: () => clock.t });
  engine.state.size = engine.state.records.size = 110;
  let now = 5000;
  const run = ms => { for (let spent = 0; spent < ms; spent += 33) { now += 33; clock.t += 33; festa.draw(engine, now); } };
  run(300);
  assert.equal(festa.probe().mundo, null, 'sem evento não tem nada');
  assert.ok(!festa.areas().some(area => area.id.startsWith('mundo:')));
  const ids = () => festa.areas().filter(area => area.id.startsWith('mundo:')).map(area => area.id).sort();
  for (const entry of data.mundo.eventos) {
    engine.state.mundo.active = null;
    engine.state.tickets = 1000;   // (a feira cobra fichas)
    assert.equal(engine.mundo.start(entry.id), true, entry.id);
    festa.onEvents(engine, engine.drainEvents(), now);
    // Espera o primeiro alvo aparecer (as estrelas, as pipas e os balões chegam um de cada vez).
    let probe = null;
    for (let second = 0; second < 60 && (second < 4 || !(probe && probe.items.length)); second++) { run(1000); probe = festa.probe().mundo; }
    assert.equal(probe.id, entry.id);
    if (!entry.targets) {
      // Evento sem alvos (só o bônus e a luz): nada para clicar; passa o tempo e acaba.
      assert.deepEqual(probe.items, [], `${entry.id}: sem alvos`);
      assert.deepEqual(ids(), []);
      assert.ok(probe.effects >= 0);
      now += entry.seconds * 1000;
      clock.t += entry.seconds * 1000;
      engine.tick(0.1);
      run(2500);
      assert.equal(festa.probe().mundo, null, `${entry.id}: acabou`);
      continue;
    }
    assert.ok(probe.items.length >= 1, `${entry.id}: tem alvo na tela`);
    assert.deepEqual(ids(), probe.items.map(k => `mundo:${k}`).sort(), `${entry.id}: cada alvo da tela é clicável`);
    const rain = festa.probe().rain;
    assert.equal(rain > 0.5, entry.id === 'temporal', `${entry.id}: chuva ${rain}`);
    const wind = Math.abs(festa.probe().wind ?? 0);
    // (As rajadas de vento de enfeite acontecem sozinhas de vez em quando; só a ventania sopra sempre forte.)
    if (entry.id === 'ventania') assert.ok(wind > 0.5, `ventania: vento ${wind}`);
    if (entry.id === 'redemoinho') assert.ok(wind > 0.4, `redemoinho: vento ${wind}`);
    if (entry.id === 'granizo') assert.ok(rain > 0.2 && rain <= 0.5, `granizo: chuva fraca de guarda-chuva ${rain}`);
    // Pegou um: some da tela e vira "pego".
    const k = probe.items[0];
    let grabbed;
    do { grabbed = engine.mundo.catchTarget(k); } while (grabbed.partial);   // (a pinhata aguenta vários golpes)
    assert.equal(grabbed.ok, true);
    const before = probe.effects;
    festa.onEvents(engine, engine.drainEvents(), now);
    run(100);
    probe = festa.probe().mundo;
    assert.ok(probe.taken.includes(k), `${entry.id}: pego`);
    assert.ok(!ids().includes(`mundo:${k}`), `${entry.id}: o alvo pego não é mais clicável`);
    assert.ok(probe.effects > before, `${entry.id}: faíscas no lugar dele`);
    if (entry.id === 'feira') {
      // A barraca comprada fica apagada (balcão cinza-marrom); as outras seguem coloridas.
      draws.length = 0;
      run(100);
      assert.ok(draws.includes('#6a5a4a'), 'feira: a barraca comprada fica apagada');
      assert.ok(draws.includes('#8a5a2a'), 'feira: as outras barracas seguem à venda');
    }
    // Passou o tempo: o evento some e o mapa volta ao normal.
    now += entry.seconds * 1000;
    clock.t += entry.seconds * 1000;
    engine.tick(0.1);
    run(2500);
    assert.equal(festa.probe().mundo, null, `${entry.id}: acabou`);
    assert.deepEqual(ids(), []);
    assert.ok(festa.probe().rain < 0.05, `${entry.id}: sem chuva depois`);
    // Alguns eventos deixam vestígios no chão por uns minutos; depois apagam.
    const traced = ['petalas', 'granizo', 'pipoca', 'redemoinho', 'fogos', 'vagalumes', 'neve', 'cheia'].includes(entry.id);
    assert.equal(festa.probe().mundoTrace, traced ? entry.id : null, `${entry.id}: vestígios`);
    if (traced) {
      run(2000);
      now += 200000;
      clock.t += 200000;
      run(500);
      assert.equal(festa.probe().mundoTrace, null, `${entry.id}: os vestígios apagaram`);
    }
  }
  // Pegar todos os alvos de um evento: o aviso do fim sai sem erro e nada mais é clicável.
  engine.state.mundo.active = null;
  engine.mundo.start('temporal');
  run(2000);
  for (let k = 0; k < 3; k++) engine.mundo.catchTarget(k);
  assert.doesNotThrow(() => { festa.onEvents(engine, engine.drainEvents(), now); run(500); });
  assert.deepEqual(ids(), []);
  // Festa pequena e um motor sem eventos do mundo desenham do mesmo jeito.
  engine.state.size = engine.state.records.size = 3;
  engine.state.mundo.active = null;
  engine.mundo.start('vagalumes');
  assert.doesNotThrow(() => run(3000));
  const bare = new GameEngine(data, null, { rng: () => 0.3, now: () => clock.t });
  delete bare.mundo;
  assert.doesNotThrow(() => festa.draw(bare, now + 100));
  assert.equal(festa.probe().mundo, null);
});

test('eventos do mundo (onda 7): o tremor balança o quadro nas pisadas e some no fim, a neve esfria a festa e a cheia pinta a água barrenta', () => {
  const { fakeContext } = require('./fake-dom');
  require('../src/festa-mundo.js');
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const canvas = globalThis.document.createElement('canvas');
  const draws = new Set();
  const moves = [];
  canvas.getContext = () => ({ ...fakeContext(), drawImage() {}, translate(x, y) { moves.push([x, y]); }, fillRect() { draws.add(this.fillStyle); } });
  const festa = globalThis.ArraiaFesta.create(canvas, bundle, {});
  festa.setScale(3);
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(data, null, { rng: () => 0.3, now: () => clock.t });
  engine.state.size = engine.state.records.size = 110;
  engine.state.weather.nextAt = 1e18;
  engine.state.mundo.nextAt = 1e18;
  let now = 5000;
  const run = ms => { for (let spent = 0; spent < ms; spent += 33) { now += 33; clock.t += 33; festa.draw(engine, now); } };
  run(300);
  assert.deepEqual(festa.probe().shake, [0, 0]);
  assert.ok(festa.probe().cold === 0, 'sem friozinho');
  // Tremor: o quadro treme só nas pisadas (de lado a lado, nunca mais de 1 px) e o clique acompanha o deslocamento.
  engine.mundo.start('tremor');
  festa.onEvents(engine, engine.drainEvents(), now);
  run(3500);   // (a entrada do evento leva uns segundos; as pisadas só valem depois)
  const seen = new Set();
  let before = festa.probe().shake;
  for (let i = 0; i < 90; i++) {
    moves.length = 0;
    run(33);
    const shake = festa.probe().shake;
    seen.add(shake.join(','));
    // O primeiro deslocamento do quadro é o do tremor calculado no quadro anterior (sempre número, nunca vazio).
    const [dx, dy] = moves[0];
    assert.ok(Number.isFinite(dx) && Number.isFinite(dy), 'o deslocamento é número');
    assert.equal(dx, before[0], 'o quadro foi deslocado pelo tremor');
    before = shake;
  }
  assert.ok([...seen].some(value => value !== '0,0'), `treme em alguma pisada: ${[...seen]}`);
  assert.ok(seen.has('0,0'), 'e para entre as pisadas');
  for (const value of seen) for (const part of value.split(',')) assert.ok(Math.abs(Number(part)) <= 1, `no máximo 1 px: ${value}`);
  assert.ok(moves.some(([x]) => x !== 0), 'o pincel foi deslocado de verdade');
  assert.ok(festa.probe().mundo.effects >= 2, 'uma nuvem de poeira por pisada');
  // Acabou no meio de uma pisada: o quadro volta a ficar parado no mesmo instante.
  for (let i = 0; i < 200 && festa.probe().shake.join(',') === '0,0'; i++) run(33);
  assert.notDeepEqual(festa.probe().shake, [0, 0], 'está no meio de uma pisada');
  engine.state.mundo.active = null;
  run(33);
  assert.deepEqual(festa.probe().shake, [0, 0]);
  // Neve: esfria a festa (a mesma neblina azul e fumacinha do friozinho) e some quando acaba.
  engine.mundo.start('neve');
  festa.onEvents(engine, engine.drainEvents(), now);
  run(4000);
  assert.ok(festa.probe().cold > 0.5, `esfriou: ${festa.probe().cold}`);
  assert.ok(draws.has('#f4faff'), 'o chão ficou branquinho');
  engine.state.mundo.active = null;
  run(4000);
  assert.ok(festa.probe().cold === 0, 'esquentou de novo');
  // Cheia: a água barrenta e as coisas boiando.
  draws.clear();
  engine.mundo.start('cheia');
  festa.onEvents(engine, engine.drainEvents(), now);
  run(8000);
  assert.ok(draws.has('#8a6a40'), 'a água barrenta');
  assert.ok(draws.has('#e8d0a0'), 'as marolas');
  assert.ok(festa.probe().mundo.items.length >= 1, 'tem coisa boiando');
  // Resgatar uma coisa levanta respingos de água (gotas azuis); sem resgate não aparecem.
  draws.clear();
  run(300);
  assert.ok(!draws.has('#9fc8ff'), 'sem respingo antes de pegar');
  const k = festa.probe().mundo.items[0];
  assert.equal(engine.mundo.catchTarget(k).ok, true);
  festa.onEvents(engine, engine.drainEvents(), now);
  run(100);
  assert.ok(draws.has('#9fc8ff'), 'respingos de água ao resgatar');
});

test('eventos do mundo (onda 8): o Cruzeiro do Sul liga as estrelas na ordem, os sapos pulam e coaxam e o trem leva os passageiros pela festa', () => {
  const { fakeContext } = require('./fake-dom');
  require('../src/festa-mundo.js');
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const canvas = globalThis.document.createElement('canvas');
  const draws = new Set();
  canvas.getContext = () => ({ ...fakeContext(), drawImage() {}, fillRect() { draws.add(this.fillStyle); } });
  const festa = globalThis.ArraiaFesta.create(canvas, bundle, {});
  festa.setScale(3);
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(data, null, { rng: () => 0.3, now: () => clock.t });
  engine.state.size = engine.state.records.size = 110;
  engine.state.weather.nextAt = 1e18;
  engine.state.mundo.nextAt = 1e18;
  let now = 5000;
  const run = ms => { for (let spent = 0; spent < ms; spent += 33) { now += 33; clock.t += 33; festa.draw(engine, now); } };
  const ids = () => festa.areas().filter(area => area.id.startsWith('mundo:')).map(area => area.id).sort();
  run(300);
  // Cruzeiro do Sul: as cinco estrelas estão no céu; as linhas só aparecem entre as já pegas.
  engine.mundo.start('constelacao');
  festa.onEvents(engine, engine.drainEvents(), now);
  run(4000);
  assert.deepEqual(ids(), ['mundo:0', 'mundo:1', 'mundo:2', 'mundo:3', 'mundo:4']);
  assert.ok(!draws.has('#ffcf4a'), 'sem linhas antes de pegar');
  assert.ok(draws.has('#fff8cc'), 'a próxima estrela pulsa com um anel');
  assert.ok(draws.has('#a8c0f0'), 'as que faltam ficam azuladas');
  engine.mundo.catchTarget(0);
  festa.onEvents(engine, engine.drainEvents(), now);
  run(200);
  assert.ok(!draws.has('#ffcf4a'), 'com uma só estrela ainda não há linha');
  engine.mundo.catchTarget(1);
  festa.onEvents(engine, engine.drainEvents(), now);
  run(200);
  assert.ok(draws.has('#ffcf4a'), 'a primeira linha liga as duas estrelas pegas');
  assert.deepEqual(ids(), ['mundo:2', 'mundo:3', 'mundo:4'], 'as pegas deixam de ser alvos');
  engine.state.mundo.active = null;
  run(3000);
  // Sapos: caem, pulam (verde) e coaxam de vez em quando (o texto do coaxar conta como efeito).
  draws.clear();
  engine.mundo.start('sapos');
  festa.onEvents(engine, engine.drainEvents(), now);
  run(100);
  const croaksBefore = festa.probe().mundo.effects;
  run(9000);
  assert.ok(draws.has('#56c860'), 'sapos verdes na festa');
  assert.ok(draws.has('#1f2a18'), 'o sapo no ar joga sombra no chão');
  assert.ok(festa.probe().mundo.items.length >= 1);
  assert.ok(festa.probe().mundo.effects >= croaksBefore + 2, 'coaxou duas vezes ou mais');
  engine.state.mundo.active = null;
  run(3000);
  // Maria-fumaça: a locomotiva e os vagões entram pela lateral; só há alvo enquanto o passageiro está dentro da festa.
  draws.clear();
  engine.mundo.start('trem');
  festa.onEvents(engine, engine.drainEvents(), now);
  run(6000);
  assert.ok(draws.has('#c0302a'), 'a locomotiva vermelha');
  const early = ids().length;
  assert.ok(early >= 1 && early <= 5);
  // Os vagões vão em fila, a 15 px um do outro (para trás da locomotiva), na mesma altura.
  const train = festa.probe().mundo;
  for (let i = 1; i < train.items.length; i++) {
    if (train.items[i] === train.items[i - 1] + 1) assert.equal(Math.abs(train.xs[i] - train.xs[i - 1]), 15, `vagão ${train.items[i]}`);
  }
  run(30000);
  const middle = festa.probe().mundo.items.length;
  assert.ok(middle >= early, 'no meio da travessia há mais passageiros dentro');
  // O trem sai pelo outro lado: perto do fim da travessia já não há passageiros dentro da festa.
  run(14000);
  assert.deepEqual(ids(), [], 'o trem já saiu da festa');
  now += 20000;
  clock.t += 20000;
  engine.tick(0.1);
  run(3000);
  assert.equal(festa.probe().mundo, null, 'o evento acabou');
});

test('eventos do mundo (onda 9): a pinhata balança mais depois do golpe, o galo canta uma vez cada e a turbulência balança a ilha com as coisas escorregando', () => {
  const { fakeContext } = require('./fake-dom');
  require('../src/festa-mundo.js');
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const canvas = globalThis.document.createElement('canvas');
  const draws = new Set();
  canvas.getContext = () => ({ ...fakeContext(), drawImage() {}, fillRect() { draws.add(this.fillStyle); } });
  const festa = globalThis.ArraiaFesta.create(canvas, bundle, {});
  festa.setScale(3);
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(data, null, { rng: () => 0.3, now: () => clock.t });
  engine.state.size = engine.state.records.size = 110;
  engine.state.weather.nextAt = 1e18;
  engine.state.mundo.nextAt = 1e18;
  let now = 5000;
  const run = ms => { for (let spent = 0; spent < ms; spent += 33) { now += 33; clock.t += 33; festa.draw(engine, now); } };
  const ids = () => festa.areas().filter(area => area.id.startsWith('mundo:')).map(area => area.id).sort();
  const range = (frames, pick) => {
    const values = [];
    for (let i = 0; i < frames; i++) { run(33); values.push(pick(festa.probe().mundo)); }
    return Math.max(...values) - Math.min(...values);
  };
  run(300);
  // Pinhata: as três penduradas desde o começo; um golpe faz a atingida balançar muito mais por um instante e levanta doce.
  draws.clear();
  engine.mundo.start('pinhata');
  festa.onEvents(engine, engine.drainEvents(), now);
  run(1500);
  assert.deepEqual(ids(), ['mundo:0', 'mundo:1', 'mundo:2']);
  assert.ok(draws.has('#ee2f3c') && draws.has('#35a03a'), 'papel crepom colorido');
  const calm = range(18, probe => probe.xs[probe.items.indexOf(0)]);
  const effectsBefore = festa.probe().mundo.effects;
  const grains = festa.probe().particles;
  assert.equal(engine.mundo.catchTarget(0).partial, true);
  festa.onEvents(engine, engine.drainEvents(), now);
  assert.equal(festa.probe().mundo.effects, effectsBefore + 1, 'o golpe levantou doce');
  assert.ok(festa.probe().particles > grains, 'e o confete saiu da pinhata');
  // Onde fica a festa (as pinhatas ficam em 22%, 50% e 78% da largura), para conferir a beirada na turbulência.
  const hung = festa.probe().mundo.xs;
  const width = (hung[2] - hung[0]) / 0.56;
  const edges = [hung[0] - 0.22 * width, hung[0] - 0.22 * width + width];
  const shaken = range(18, probe => probe.xs[probe.items.indexOf(0)]);
  assert.ok(shaken > calm + 3, `balançou mais depois do golpe: ${shaken} contra ${calm}`);
  assert.deepEqual(ids(), ['mundo:0', 'mundo:1', 'mundo:2'], 'ainda não estourou');
  // Estourar de verdade tira o alvo e solta o confete grande.
  for (let n = 1; n < data.mundo.eventos.find(item => item.id === 'pinhata').hits; n++) engine.mundo.catchTarget(0);
  festa.onEvents(engine, engine.drainEvents(), now);
  run(100);
  assert.deepEqual(ids(), ['mundo:1', 'mundo:2']);
  engine.state.mundo.active = null;
  run(3000);
  // Amanhecer: os galos aparecem um de cada vez e cada um canta uma só vez (o grito conta como efeito).
  draws.clear();
  engine.mundo.start('amanhecer');
  festa.onEvents(engine, engine.drainEvents(), now);
  run(100);
  const base = festa.probe().mundo.effects;
  run(5500);
  assert.ok(draws.has('#e07a2a'), 'o galo laranja');
  assert.equal(festa.probe().mundo.effects, base + 1, 'o primeiro galo cantou uma vez');
  run(2000);
  assert.equal(festa.probe().mundo.effects, base + 1, 'e não repete o grito enquanto está lá');
  run(15500);   // (o segundo galo aparece uns 22 s depois do começo)
  assert.ok(festa.probe().mundo.effects >= base + 2, 'o galo seguinte cantou');
  engine.state.mundo.active = null;
  run(3000);
  // Turbulência: a ilha sobe e desce (até 3 px) e as coisas escorregam, sempre no mesmo sentido, até sumirem na beirada.
  engine.mundo.start('turbulencia');
  festa.onEvents(engine, engine.drainEvents(), now);
  run(3500);
  const shakes = new Set();
  const ups = new Set();
  const xs = [];
  for (let i = 0; i < 120; i++) {
    run(33);
    const probe = festa.probe();
    shakes.add(probe.shake.join(','));
    ups.add(probe.shake[1]);
    for (const value of probe.shake) assert.ok(Math.abs(value) <= 3, `balanço pequeno: ${probe.shake}`);
    if (probe.mundo.items.includes(0)) xs.push(probe.mundo.xs[probe.mundo.items.indexOf(0)]);
  }
  assert.ok([...shakes].some(value => value !== '0,0'), 'a ilha balança');
  assert.ok([...ups].some(value => value !== 0), 'e sobe e desce');
  assert.ok(shakes.size >= 3, `vários balanços diferentes: ${[...shakes]}`);
  assert.ok(xs.length >= 10);
  const steps = xs.slice(1).map((value, i) => value - xs[i]);
  assert.ok(steps.every(step => step >= 0) || steps.every(step => step <= 0), 'escorrega sempre para o mesmo lado');
  assert.ok(Math.abs(xs.at(-1) - xs[0]) > 2, 'e se mexe de verdade');
  // Nenhuma coisa aparece além da beirada da ilha (quem chega lá cai e some).
  for (let i = 0; i < 1100; i++) {
    run(33);
    const probe = festa.probe().mundo;
    if (!probe) break;
    for (const x of probe.xs) assert.ok(x >= edges[0] + 3 && x <= edges[1] - 3, `dentro da ilha: ${x} em ${edges}`);
  }
  engine.state.mundo.active = null;
  run(100);
  assert.deepEqual(festa.probe().shake, [0, 0], 'a ilha para quando acaba');
});

test('eventos do mundo: a turma solta uma fala do evento de tempos em tempos (uma das duas, só durante o evento)', () => {
  const { fakeContext } = require('./fake-dom');
  require('../src/festa-mundo.js');
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const canvas = globalThis.document.createElement('canvas');
  canvas.getContext = () => ({ ...fakeContext(), drawImage() {} });
  const festa = globalThis.ArraiaFesta.create(canvas, bundle, {});
  festa.setScale(3);
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(data, null, { rng: () => 0.3, now: () => clock.t });
  engine.state.size = engine.state.records.size = 110;
  engine.state.weather.nextAt = 1e18;
  engine.state.mundo.nextAt = 1e18;
  let now = 5000;
  const run = ms => { for (let spent = 0; spent < ms; spent += 33) { now += 33; clock.t += 33; festa.draw(engine, now); } };
  run(300);
  for (const id of ['estrelas', 'neve', 'sapos']) {
    const entry = data.mundo.eventos.find(item => item.id === id);
    engine.state.mundo.active = null;
    engine.mundo.start(id);
    festa.onEvents(engine, engine.drainEvents(), now);
    run(1500);
    assert.equal(festa.probe().mundo.chats, 0, `${id}: ainda não comentaram (o evento acabou de chegar)`);
    run(6000);
    const first = festa.probe().mundo;
    assert.equal(first.chats, 1, `${id}: a primeira fala sai uns segundos depois da chegada`);
    assert.ok([entry.chat0, entry.chat1].includes(first.chat), `${id}: é uma das duas falas (${first.chat})`);
    run(11000);
    assert.ok(festa.probe().mundo.chats >= 2, `${id}: e continua comentando (a cada 5,5 a 10 s)`);
    assert.ok(festa.probe().mundo.chats <= 4, `${id}: sem tagarelar demais`);
  }
  // Sem evento a turma não comenta nada.
  engine.state.mundo.active = null;
  run(3000);
  assert.equal(festa.probe().mundo, null);
});

test('eventos do mundo: na chuva de fichas várias fichas douradas ficam no ar ao mesmo tempo e cada uma é clicável', () => {
  const { fakeContext } = require('./fake-dom');
  require('../src/festa-mundo.js');
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const canvas = globalThis.document.createElement('canvas');
  const draws = new Set();
  canvas.getContext = () => ({ ...fakeContext(), drawImage() {}, fillRect() { draws.add(this.fillStyle); } });
  const festa = globalThis.ArraiaFesta.create(canvas, bundle, {});
  festa.setScale(3);
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(data, null, { rng: () => 0.3, now: () => clock.t });
  engine.state.size = engine.state.records.size = 110;
  engine.state.weather.nextAt = 1e18;
  engine.state.mundo.nextAt = 1e18;
  let now = 5000;
  const run = ms => { for (let spent = 0; spent < ms; spent += 33) { now += 33; clock.t += 33; festa.draw(engine, now); } };
  run(300);
  engine.mundo.start('fichas');
  festa.onEvents(engine, engine.drainEvents(), now);
  let most = 0;
  const seen = new Set();
  for (let i = 0; i < 780; i++) {
    run(33);
    const probe = festa.probe().mundo;
    if (!probe) break;
    most = Math.max(most, probe.items.length);
    for (const k of probe.items) seen.add(k);
  }
  assert.ok(most >= 2 && most <= 5, `umas três de cada vez no ar (${most})`);
  assert.equal(seen.size, 15, 'todas as quinze passaram');
  assert.ok(draws.has('#a8740a') && draws.has('#fff07a'), 'as fichas douradas');
});
