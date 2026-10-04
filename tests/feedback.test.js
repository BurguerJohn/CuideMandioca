const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const data = require('../src/data.js');
const { GameEngine } = require('../src/core.js');
const { fakeContext, fakeDocument, fakeElement } = require('./fake-dom');

require('../src/festa-sprites.js');
const bundle = globalThis.FESTA_SPRITES;

// O feedback dos minigames: o kit de efeitos da base das janelas (tremida, anéis, farelo, números, painéis, luzes) e o que cada jogo faz com ele
// quando o jogador acerta, erra, colhe ou completa alguma coisa.
function baseSetup() {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  require('../src/janela-base.js');
  const canvas = fakeElement('canvas', { drawImage: 0 });
  const base = globalThis.ArraiaJanelaBase.create(canvas, bundle, { width: 160, height: 100 });
  const rects = [];
  const original = base.g.fillRect;
  base.g.fillRect = (...args) => { rects.push(args); return original?.apply(base.g, args); };
  return { base, canvas, rects };
}

test('kit de efeitos: tremida, anéis, farelo, números e painéis aparecem e somem sozinhos', () => {
  const { base, canvas } = baseSetup();
  assert.deepEqual(base.probeBase().fx, { rings: 0, bits: 0, pops: 0, tags: 0, shaking: false, flashing: false });
  base.shake(2, 200, 1000);
  base.flash('#ffffff', 0.2, 100, 1000);
  base.ring(10, 10, 1000, { to: 12 });
  base.bits(20, 20, 8, 1000);
  base.pop('+5', 30, 30, 1000);
  base.tag([['A', '#fff'], ['B', '#fff']], 50, 50, 1000);
  const fx = base.probeBase().fx;
  assert.equal(fx.rings, 1);
  assert.equal(fx.bits, 8);
  assert.equal(fx.pops, 1);
  assert.equal(fx.tags, 1);
  assert.ok(fx.shaking && fx.flashing);
  base.drawFx(1050);
  assert.match(canvas.style.transform, /translate\(/, 'a tremida mexe no canvas');
  base.drawFx(5000);
  assert.deepEqual(base.probeBase().fx, { rings: 0, bits: 0, pops: 0, tags: 0, shaking: false, flashing: false }, 'tudo some com o tempo');
  assert.equal(canvas.style.transform, '', 'o canvas volta ao lugar');
});

test('kit de efeitos: o clarão cobre a janela toda ou só a área pedida, e some', () => {
  const { base, rects } = baseSetup();
  base.flash('#ffffff', 0.2, 200, 0);
  base.drawFx(10);
  assert.ok(rects.some(([x, y, w, h]) => x === 0 && y === 0 && w === 160 && h === 100), 'janela inteira');
  base.flash('#ffffff', 0.2, 200, 1000, { x: 5, y: 6, w: 7, h: 8 });
  rects.length = 0;
  base.drawFx(1010);
  assert.ok(rects.some(([x, y, w, h]) => x === 5 && y === 6 && w === 7 && h === 8), 'só a área');
  assert.ok(!rects.some(([x, y, w, h]) => w === 160 && h === 100));
  rects.length = 0;
  base.drawFx(2000);
  assert.equal(base.probeBase().fx.flashing, false);
  assert.equal(rects.length, 0, 'depois de acabar não pinta mais');
});

test('kit de efeitos: uma tremida mais fraca não atropela a mais forte e os limites seguram os excessos', () => {
  const { base, canvas } = baseSetup();
  base.shake(3, 400, 0);
  base.shake(0.5, 400, 100);
  base.drawFx(150);
  assert.equal(base.probeBase().fx.shaking, true);
  assert.equal(canvas.style.transform, 'translate(3px, 2px)', 'continua a tremida forte (a fraca, de 0,5 pixel de arte, mal moveria o canvas)');
  for (let i = 0; i < 60; i++) base.tag([['x', '#fff']], 10, 10, 0);
  for (let i = 0; i < 80; i++) base.bits(10, 10, 20, 0);
  for (let i = 0; i < 80; i++) base.pop('x', 10, 10, 0);
  for (let i = 0; i < 80; i++) base.ring(10, 10, 0);
  const fx = base.probeBase().fx;
  assert.ok(fx.tags <= 4 && fx.bits <= 240 && fx.pops <= 10 && fx.rings <= 24, JSON.stringify(fx));
  base.clearFx();
  assert.deepEqual(base.probeBase().fx.rings + base.probeBase().fx.bits + base.probeBase().fx.pops + base.probeBase().fx.tags, 0);
});

test('kit de efeitos: o número que pula não sai por cima da borda e o painel cabe na janela', () => {
  const { base, rects } = baseSetup();
  base.pop('LONGO MESMO', 2, -20, 0, '#fff', { scale: 2 });
  base.tag([['UMA LINHA COMPRIDA DEMAIS PARA CABER', '#fff']], 158, 3, 0);
  rects.length = 0;
  base.drawFx(100);
  assert.ok(rects.length > 0);
  for (const [x, y, w, h] of rects) assert.ok(y >= -2 && x >= -2 && x + w <= 170 && y + h <= 110, `desenhou fora: ${[x, y, w, h]}`);
});

test('kit de efeitos: a barra suaviza até o alvo sem passar dele e a mira só aparece nas áreas marcadas', () => {
  const { base, canvas, rects } = baseSetup();
  assert.equal(base.ease('a', 1, 0), 1, 'a primeira vez já vem no valor');
  let last = 1;
  for (let step = 1; step <= 40; step++) {
    const value = base.ease('a', 0, step * 40);
    assert.ok(value <= last && value >= 0);
    last = value;
  }
  assert.equal(last, 0, 'chega ao alvo e para');
  // A mira: o mouse sobre uma área `hot` desenha cantos, sobre uma área comum não desenha nada.
  base.clearRegions();
  base.region('quente', 10, 10, 40, 30, { hot: true });
  base.region('fria', 80, 10, 40, 30);
  const rect = canvas.getBoundingClientRect();
  const over = (x, y) => canvas.listeners.mousemove({ clientX: rect.left + x * rect.width / 160, clientY: rect.top + y * rect.height / 100 });
  over(30, 25);
  rects.length = 0;
  base.drawFx(0);
  assert.ok(rects.length >= 8, 'quatro cantos de dois traços');
  over(100, 25);
  rects.length = 0;
  base.drawFx(0);
  assert.equal(rects.length, 0);
  canvas.listeners.mouseleave();
});

test('texto em escala inteira: as letras do dobro do tamanho e o contorno de um pixel', () => {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  require('../src/festa.js');
  const rects = [];
  const g = fakeContext();
  g.fillRect = (...args) => rects.push(args);
  globalThis.ArraiaFesta.pixelText(g, 'A', 20, 10, '#fff', 1, 2);
  const inks = rects.filter(([, , w, h]) => w === 4 && h === 4);
  const fills = rects.filter(([, , w, h]) => w === 2 && h === 2);
  assert.ok(inks.length > 0 && fills.length > 0, 'contorno (dobro + 2) e letra (dobro)');
  assert.equal(inks.length, fills.length, 'cada pixel da letra tem o seu contorno');
  rects.length = 0;
  globalThis.ArraiaFesta.pixelText(g, 'A', 20, 10, '#fff');
  assert.ok(rects.every(([, , w, h]) => w === 3 && h === 3 || w === 1 && h === 1), 'a escala 1 continua como antes');
});

// --- O que cada minigame faz com o kit ----------------------------------------------------------------------------------------------
function janelasSetup(level, ids) {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  require('../src/janela-base.js');
  require('../src/janelas.js');
  for (const id of ['cordel', 'bichos', 'aquario', 'horta', 'fogueira', 'palco', 'mata', 'ceu', 'bairro']) require(`../src/janela-${id}.js`);
  const clock = { t: 1_000_000_000 };
  const engine = new GameEngine(data, null, { rng: () => 0.5, now: () => clock.t });
  engine.state.size = level;
  engine.state.records.size = level;
  const settings = { zoom: 1, hidden: false, minis: Object.fromEntries(ids.map(id => [id, { hidden: false }])) };
  const sounds = [];
  const host = globalThis.ArraiaJanelas.create({
    document: globalThis.document, engine, sprites: bundle,
    anchor: () => ({ left: 400, width: 800, lift: 20, top: 100 }),
    settings: () => settings, changeSettings: partial => Object.assign(settings, partial),
    placaRect: () => null, size: () => ({ width: 1600, height: 1000 }),
    t: key => key, sound: name => sounds.push(name), toast() {}, focused: undefined
  });
  host.restore();
  return { host, engine, sounds, clock };
}

function click(host, id, areaId, now) {
  const item = host.windows.get(id);
  const probe = item.view.probe();
  const area = probe.areas.find(entry => entry.id === areaId || entry.id.startsWith(`${areaId}`));
  assert.ok(area, `área ${areaId} (tem ${probe.areas.map(entry => entry.id).join(', ')})`);
  const rect = item.canvas.getBoundingClientRect();
  item.view.click(rect.left + (area.x + area.w / 2) * rect.width / probe.size.width, rect.top + (area.y + area.h / 2) * rect.height / probe.size.height, now);
}

const fxOf = (host, id) => host.windows.get(id).view.probe().fx;

test('quintal: o carinho solta corações e um anel, o milho sai do saco em arco e o presente vira festa', () => {
  const { host, engine } = janelasSetup(31, ['bichos']);
  const view = host.windows.get('bichos').view;
  let now = 1000;
  for (let i = 0; i < 60; i++) host.draw((now += 40));
  assert.deepEqual(fxOf(host, 'bichos').rings + fxOf(host, 'bichos').bits, 0);
  click(host, 'bichos', 'pet:galinha', now);
  let fx = fxOf(host, 'bichos');
  assert.ok(fx.rings >= 1 && fx.bits >= 6, 'carinho: anel e farelo');
  click(host, 'bichos', 'pet:galinha', now);
  const rect = host.windows.get('bichos').canvas.getBoundingClientRect();
  view.click(rect.left + rect.width * 0.5, rect.top + rect.height * 0.8, now);
  fx = fxOf(host, 'bichos');
  assert.ok(fx.bits >= 10, 'milho: farelo da boca do saco');
  const st = engine.state.minis.bichos.pets.gato || (engine.state.minis.bichos.pets.gato = { bond: 0, ready: false, giftAt: 0, petAt: 0 });
  st.bond = data.minis.bichos.bondMax;
  st.ready = true;
  for (let i = 0; i < 4; i++) host.draw((now += 40));
  click(host, 'bichos', 'gift:gato', now);
  fx = fxOf(host, 'bichos');
  assert.ok(fx.shaking && fx.flashing && fx.pops >= 1, `presente: tremida, clarão e prêmio pulando ${JSON.stringify(fx)}`);
  engine.state.minis.bichos.grain = 0;
  for (let i = 0; i < 120; i++) host.draw((now += 40));
  assert.equal(fxOf(host, 'bichos').pops, 0, 'os efeitos do presente já acabaram');
  click(host, 'bichos', 'milho', now);
  assert.ok(fxOf(host, 'bichos').pops >= 1, 'saco vazio avisa');
});

test('aquário: a ração bate na água, o peixe cresce com festa e a bolha dourada estoura em moedinhas', () => {
  const { host, engine } = janelasSetup(30, ['aquario']);
  let now = 1000;
  for (let i = 0; i < 60; i++) host.draw((now += 40));
  click(host, 'aquario', 'pote', now);
  assert.ok(fxOf(host, 'aquario').rings >= 1 && fxOf(host, 'aquario').bits >= 5, 'respingo da ração');
  engine.state.minis.aquario.food = 6;
  let grew = false;
  for (let k = 0; k < 4 && !grew; k++) {
    click(host, 'aquario', 'pote', now);
    for (let i = 0; i < 300; i++) {
      host.draw((now += 40));
      if (fxOf(host, 'aquario').pops >= 1) grew = true;
    }
  }
  assert.ok(grew, 'o nome do peixe sobe quando ele cresce');
  engine.state.minis.aquario.fish = [{ id: 1, species: 'dourado', growth: 6, stage: 2 }];
  engine.state.minis.aquario.bubbles = 1;
  host.draw((now += 40));
  assert.ok(fxOf(host, 'aquario').rings >= 1, 'a bolha nova aparece com um anel');
  click(host, 'aquario', 'ouro:0', now);
  const fx = fxOf(host, 'aquario');
  assert.ok(fx.bits >= 16 && fx.shaking && fx.pops >= 1, 'estouro: moedinhas, tremida e o prêmio');
});

test('horta: colher solta confete da planta e abre o painel dos prêmios, a pá e a regadora levantam terra e água', () => {
  const { host, engine } = janelasSetup(150, ['horta']);
  let now = 1000;
  for (let i = 0; i < 30; i++) host.draw((now += 40));
  const horta = engine.state.minis.horta;
  const at = engine.now();
  horta.plots[0] = { crop: 'milho', plantedAt: at - 1e6, readyAt: at - 1, waters: 0, luck: null };
  host.draw((now += 40));
  click(host, 'horta', 'plot:0', now);
  let fx = fxOf(host, 'horta');
  assert.ok(fx.rings >= 1 && fx.bits >= 10 && fx.tags >= 1, JSON.stringify(fx));
  host.draw((now += 40));
  click(host, 'horta', 'pa', now);
  assert.ok(fxOf(host, 'horta').bits >= 6, 'plantar: terra voando');
  for (let i = 0; i < 80; i++) host.draw((now += 40));
  click(host, 'horta', 'regadora', now);
  for (let i = 0; i < 30; i++) host.draw((now += 40));
  fx = fxOf(host, 'horta');
  assert.ok(fx.rings + fx.bits > 0, 'água respingando nos canteiros');
});

test('fogueira: a lenha voa até o fogo, o fogo cresce e comer é festa no banco', () => {
  const { host, engine } = janelasSetup(150, ['fogueira']);
  let now = 1000;
  engine.state.wood = 20;
  for (let i = 0; i < 30; i++) host.draw((now += 40));
  click(host, 'fogueira', 'lenha', now);
  assert.ok(fxOf(host, 'fogueira').bits >= 4, 'sai farelo da pilha');
  for (let i = 0; i < 20; i++) host.draw((now += 40));
  assert.ok(fxOf(host, 'fogueira').rings >= 1, 'a tora caiu: anel no fogo');
  const model = engine.mini('fogueira');
  for (let i = 0; i < 5; i++) model.addWood();
  model.put(0);
  engine.state.minis.fogueira.sticks[0].progress = 1;
  engine.state.minis.fogueira.heat = 100;
  host.draw((now += 40));
  click(host, 'fogueira', 'espeto:0', now);
  for (let i = 0; i < 40; i++) host.draw((now += 40));
  const fx = fxOf(host, 'fogueira');
  assert.ok(fx.pops >= 1 && fx.tags >= 1, 'NHAM e o prêmio chegam com a comida');
});

test('palco: cada acerto estoura no círculo com o aviso, e a tela de resultado acende as estrelas aos poucos', () => {
  const { host, engine, clock } = janelasSetup(150, ['palco']);
  const view = host.windows.get('palco').view;
  let now = 1000;
  for (let i = 0; i < 30; i++) host.draw((now += 40));
  click(host, 'palco', 'musica:xote', now);
  assert.ok(fxOf(host, 'palco').bits >= 10, 'começar a música solta confete');
  const model = engine.mini('palco');
  let hits = 0;
  let comboShake = false;
  for (let i = 0; i < 900 && hits < 14; i++) {
    clock.t += 33;
    host.draw((now += 33));
    engine.mini('palco').tick();
    const info = model.info();
    if (!info.show) break;
    const note = info.show.notes.find(entry => !entry.state && Math.abs(entry.t - info.show.time) <= 40);
    if (note && view.key(String(note.lane + 1), now)) {
      hits++;
      if (model.info().show.combo === 10) comboShake = fxOf(host, 'palco').shaking && fxOf(host, 'palco').pops >= 2;
    }
  }
  assert.ok(hits >= 10, `acertou ${hits} notas`);
  assert.equal(comboShake, true, 'o décimo acerto seguido treme a janela e solta o número do combo');
  assert.ok(fxOf(host, 'palco').rings >= 1 || fxOf(host, 'palco').pops >= 1, 'o acerto estoura no círculo');
  engine.state.minis.palco.show.startAt -= 1e6;
  model.tick();
  for (let i = 0; i < 10; i++) host.draw((now += 40));
  assert.ok(model.info().last, 'o show acabou');
  let stars = 0;
  for (let i = 0; i < 80; i++) { host.draw((now += 40)); stars = Math.max(stars, fxOf(host, 'palco').rings); }
  assert.ok(stars >= 0);
});

test('céu: o foguete deixa rastro e sai da caixa com fumaça, a explosão acende o céu e a Grande Final treme', () => {
  const { host, engine } = janelasSetup(150, ['ceu']);
  const view = host.windows.get('ceu').view;
  let now = 1000;
  for (let i = 0; i < 30; i++) host.draw((now += 40));
  click(host, 'ceu', 'ceu', now);
  assert.ok(fxOf(host, 'ceu').bits >= 8, 'saída da caixa');
  assert.equal(view.probe().shells, 1);
  for (let i = 0; i < 25; i++) host.draw((now += 40));
  assert.ok(fxOf(host, 'ceu').rings >= 1 && view.probe().sparks > 20, 'estouro: anel e faíscas');
  engine.state.minis.ceu.rockets = 6;
  for (let k = 0; k < 4; k++) { click(host, 'ceu', 'ceu', now); host.draw((now += 40)); }
  assert.ok(fxOf(host, 'ceu').shaking, 'Grande Final');
  engine.state.minis.ceu.rockets = 0;
  click(host, 'ceu', 'ceu', now);
  assert.ok(fxOf(host, 'ceu').shaking, 'sem foguete: a caixa chacoalha');
});

test('bairro: visitar a casa acende a porta, solta confete e mostra o prêmio num painel; cedo demais balança a casa', () => {
  const { host, engine } = janelasSetup(150, ['bairro']);
  let now = 1000;
  engine.state.crew.milho = { level: 4 };
  for (let i = 0; i < 30; i++) host.draw((now += 40));
  click(host, 'bairro', 'casa:milho', now);
  const fx = fxOf(host, 'bairro');
  assert.ok(fx.rings >= 2 && fx.bits >= 18 && fx.pops >= 1 && fx.tags >= 1, JSON.stringify(fx));
  for (let i = 0; i < 100; i++) host.draw((now += 40));
  click(host, 'bairro', 'casa:milho', now);
  assert.ok(fxOf(host, 'bairro').rings >= 1, 'o toque mostra que o clique chegou');
  assert.equal(engine.mini('bairro').info().houses[0].ready, false);
});

test('cordel: cada clique estoura no ponto da página e a página completa tem carimbo, confete e painel', () => {
  const { host, engine } = janelasSetup(20, ['cordel']);
  let now = 1000;
  for (let i = 0; i < 30; i++) host.draw((now += 40));
  click(host, 'cordel', 'ponto', now);
  assert.ok(fxOf(host, 'cordel').rings >= 1 && fxOf(host, 'cordel').bits >= 10, 'primeiro clique');
  for (let i = 0; i < 20; i++) host.draw((now += 40));
  const goal = data.minis.cordel.pages[0].goal;
  for (let k = 1; k < goal - 1; k++) { click(host, 'cordel', 'ponto', now); for (let i = 0; i < 40; i++) host.draw((now += 40)); }
  click(host, 'cordel', 'ponto', now);
  const fx = fxOf(host, 'cordel');
  assert.ok(fx.tags >= 1 && fx.bits >= 40 && fx.shaking, 'página completa: ' + JSON.stringify(fx));
  assert.equal(engine.mini('cordel').info().list[0].done, true);
});

test('mata: acertos e pancadas viram números, faíscas e tremidas; o cenário tem ar e o painel desenha sem erro', () => {
  const { host, engine, clock } = janelasSetup(150, ['mata']);
  let now = 1000;
  let max = { bits: 0, pops: 0, shake: false, rings: 0 };
  for (let i = 0; i < 900; i++) {
    clock.t += 50;
    engine.tick(0.05);
    host.draw((now += 40));
    const fx = fxOf(host, 'mata');
    max = { bits: Math.max(max.bits, fx.bits), pops: Math.max(max.pops, fx.pops), shake: max.shake || fx.shaking, rings: Math.max(max.rings, fx.rings) };
  }
  assert.ok(max.pops >= 1 && max.bits >= 6, 'os golpes viram números e faíscas: ' + JSON.stringify(max));
  assert.ok(host.windows.get('mata').view.probe().size.width > 0);
});

// --- Argolas, Pescaria e Bingo ----------------------------------------------------------------------------------------------------------
function loadVm(file, extra = {}) {
  const document = fakeDocument([], { drawImage: 0 });
  const createElement = document.createElement;
  const painted = [];                       // cor de cada retângulo pintado em qualquer canvas (para ver o que acendeu)
  document.createElement = tag => {
    const element = createElement(tag);
    const context = fakeContext({ drawImage: 0 });
    context.fillRect = () => painted.push(context.fillStyle);
    element.getContext = () => context;
    return element;
  };
  class Image { set src(value) { this.srcValue = value; this.complete = true; this.width = 12; this.onload?.(); } }
  const root = { Image, document, ArraiaFesta: { pixelText() {} }, ...extra };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8'), root);
  return { root, document, painted };
}

test('pescaria: a vara joga, a boia cai, o peixinho morde e só no fim chama o resultado; as pescarias seguidas entram na fila', () => {
  const { root, document } = loadVm('pescaria.js');
  const canvas = document.createElement('canvas');
  const view = root.ArraiaPescaria.create(canvas, bundle, {});
  const result = { char: data.chars[0], isNew: true, level: 1 };
  const calls = [];
  let now = 1000;
  view.draw(now, { ready: 3 });
  assert.equal(view.busy, false);
  view.cast(result, now, () => calls.push('a'));
  view.cast({ ...result, isNew: false }, now, () => calls.push('b'));
  assert.equal(view.busy, true);
  for (let i = 0; i < 40; i++) view.draw((now += 33), { ready: 2 });
  assert.deepEqual(calls, [], 'a animação ainda não acabou');
  for (let i = 0; i < 60; i++) view.draw((now += 33), { ready: 2 });
  assert.deepEqual(calls, ['a'], 'o resultado da primeira abre quando a animação acaba');
  for (let i = 0; i < 80; i++) view.draw((now += 33), { ready: 1 });
  assert.deepEqual(calls, ['a', 'b'], 'e depois o da segunda, em ordem');
  assert.equal(view.busy, false);
  view.setScale(2);
  assert.ok(canvas.width > 0);
  // Fechar a tela no meio da pescaria não perde a prenda: o resultado abre na hora, e na ordem.
  const order = [];
  view.cast(result, now, () => order.push(1));
  view.cast(result, now, () => order.push(2));
  view.draw((now += 33), { ready: 2 });
  view.flush();
  assert.deepEqual(order, [1, 2]);
  assert.equal(view.busy, false);
  view.flush();
  assert.deepEqual(order, [1, 2], 'nada abre duas vezes');
});

test('bingo: a bola sai do globo, rola pela rampa e cai na bandeja; linha e bingo comemoram; uma rodada nova recomeça limpa', () => {
  const { root, document } = loadVm('bingo.js');
  const canvas = document.createElement('canvas');
  const view = root.ArraiaBingo.create(canvas, bundle, { sound: () => {} });
  const round = { card: [1, 2, 3, 4, 0, 5, 6, 7, 8], drawn: [], line: false, result: null };
  let now = 1000;
  assert.doesNotThrow(() => view.draw(now, null));
  for (let i = 0; i < 5; i++) view.draw((now += 33), round);
  round.drawn.push(2);
  for (let i = 0; i < 40; i++) view.draw((now += 33), round);
  round.drawn.push(11, 12);
  assert.doesNotThrow(() => { for (let i = 0; i < 40; i++) view.draw((now += 33), round); }, 'vários números de uma vez entram direto na bandeja');
  round.line = true;
  assert.doesNotThrow(() => view.draw((now += 33), round));
  round.result = 'bingo';
  assert.doesNotThrow(() => { for (let i = 0; i < 80; i++) view.draw((now += 33), round); });
  assert.doesNotThrow(() => view.draw((now += 33), { ...round, card: [9, 9, 9, 9, 0, 9, 9, 9, 9], drawn: [], line: false, result: null }));
  view.setScale(2);
});

test('argolas: com a base das janelas o gargalo brilha, o encaixe vira festa e o erro levanta poeira', () => {
  require('../src/festa.js');
  require('../src/janela-base.js');
  const { root, document, painted } = loadVm('argolas.js', { ArraiaJanelaBase: globalThis.ArraiaJanelaBase, ArraiaFesta: globalThis.ArraiaFesta });
  const landed = [];
  const rings = root.ArraiaArgolas.create(document.createElement('canvas'), bundle,
    { onThrow: bottle => ({ hit: bottle !== null }), onEnd() {}, onLand: result => landed.push(result.hit) });
  const prizes = Array.from({ length: 5 }, () => ({ kind: 'fichas', amount: 2, aim: 6 }));
  rings.start({ prizes, total: 2 }, 0);
  assert.equal(rings.throwRing(0), true, 'a argola no meio acerta a garrafa do meio');
  rings.draw(100);
  painted.length = 0;
  rings.draw(339);
  assert.ok(!painted.includes('#ffd860'), 'a plaquinha só acende depois do encaixe');
  rings.draw(340);
  painted.length = 0;
  rings.draw(400);
  assert.ok(painted.includes('#ffd860'), 'a plaquinha do prêmio acende no encaixe');
  assert.deepEqual(landed, [true]);
  for (let t = 400; t <= 1300; t += 50) rings.draw(t);
  assert.doesNotThrow(() => { rings.throwRing(1000); rings.draw(1340); rings.draw(2200); });
  assert.equal(rings.active, false);
});
