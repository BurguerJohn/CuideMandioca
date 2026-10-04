const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../src/data.js');
const { GameEngine } = require('../src/core.js');
const Settings = require('../src/settings.js');
const { fakeDocument } = require('./fake-dom');

require('../src/festa-sprites.js');
const bundle = globalThis.FESTA_SPRITES;

// As janelas extras da festa: o gerenciador (src/janelas.js) e o desenho de cada uma (src/janela-<id>.js), no DOM de mentira.
function setup(level, options = {}) {
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
  const settings = { zoom: 1, hidden: false, minis: options.minis || {} };
  const sounds = [];
  const toasts = [];
  const host = globalThis.ArraiaJanelas.create({
    document: globalThis.document, engine, sprites: bundle,
    anchor: () => ({ left: 400, width: 800, lift: 20, top: 100 }),
    settings: () => settings, changeSettings: options.changeSettings || (partial => Object.assign(settings, partial)),
    placaRect: () => null, size: () => ({ width: 1600, height: 1000 }),
    t: options.t || (key => key), sound: name => sounds.push(name), toast: text => toasts.push(text), focused: options.focused
  });
  return { host, engine, settings, sounds, toasts, clock, bundle };
}

// Clica no meio de uma área da janela (as áreas ficam em pixels de arte; o canvas de mentira tem 474x612).
function clickArea(host, id, areaId, now) {
  const item = host.windows.get(id);
  const probe = item.view.probe();
  const area = probe.areas.find(entry => entry.id === areaId);
  assert.ok(area, `área ${areaId} (tem ${probe.areas.map(entry => entry.id).join(', ')})`);
  const rect = item.canvas.getBoundingClientRect();
  const x = (area.x + area.w / 2) * rect.width / probe.size.width;
  const y = (area.y + area.h / 2) * rect.height / probe.size.height;
  item.view.click(rect.left + x, rect.top + y, now);
}

test('o botão da janela só aparece depois que ela abre, e mostra e esconde o retângulo', () => {
  const { host, engine, settings } = setup(5);
  assert.deepEqual(host.items(), []);
  assert.equal(host.toggle('bichos'), false, 'fechada: nada acontece');
  engine.state.records.size = 12;
  assert.deepEqual(host.items().map(item => [item.id, item.visible]), [['cordel', false], ['bichos', false]]);
  assert.equal(host.signature(), 'cordel-1,bichos-', 'a página 1 do cordel espera a ação');
  assert.equal(host.toggle('bichos'), true);
  assert.equal(settings.minis.bichos.hidden, false);
  assert.equal(host.visible('bichos'), true);
  assert.equal(host.windows.get('bichos').element.hidden, false);
  assert.equal(host.signature(), 'cordel-1,bichos+');
  host.toggle('bichos');
  assert.equal(host.visible('bichos'), false);
  assert.equal(host.windows.get('bichos').element.hidden, true);
  host.setHidden('bichos', false);
  host.close('bichos');
  assert.equal(settings.minis.bichos.hidden, true);
});

test('janela que acabou de abrir aparece sozinha e avisa; a festa escondida esconde as janelas', () => {
  const { host, engine, settings, toasts } = setup(11);
  engine.state.cheer = 1e15;
  engine.addFame(engine.fameNeed() - engine.state.fame); // 12
  host.onEvents(engine.drainEvents(), 1000);
  assert.equal(host.visible('bichos'), true);
  assert.equal(toasts.length, 1);
  assert.match(toasts[0], /^mini\.opened$/);
  settings.hidden = true;
  host.place('bichos');
  assert.equal(host.windows.get('bichos').element.hidden, true, 'festa escondida: janelas escondidas');
});

test('janelas abertas no mesmo quadro preservam todas as preferências enquanto o desktop ainda responde', () => {
  const pending = [];
  const { host, engine, settings } = setup(5, { changeSettings: partial => pending.push(partial) });
  engine.state.records.size = 40;
  const ids = ['cordel', 'bichos', 'aquario', 'horta'];
  host.onEvents(ids.map(id => ({ type: 'mini-open', id })), 1000);
  for (const id of ids) assert.equal(host.visible(id), true, `${id} aparece sem depender da resposta IPC`);
  for (const partial of pending) Object.assign(settings, partial);
  for (const id of ids) assert.equal(host.visible(id), true, `${id} continua aberta quando as respostas chegam`);
  assert.deepEqual(Object.keys(settings.minis).sort(), [...ids].sort(), 'o último mapa preserva as aberturas anteriores');
});

test('dois cliques para abrir e fechar uma janela funcionam antes de a resposta do desktop chegar', () => {
  const pending = [];
  const { host, settings } = setup(20, { changeSettings: partial => pending.push(partial) });
  host.toggle('bichos');
  host.toggle('bichos');
  for (const partial of pending) Object.assign(settings, partial);
  host.place('bichos');
  assert.equal(host.visible('bichos'), false, 'o segundo clique fecha, em vez de pedir para abrir de novo');
  assert.equal(settings.minis.bichos.hidden, true);
});

test('janela arrastada guarda onde ficou em relação à festa e volta para lá', () => {
  const { host, settings } = setup(20, { minis: { bichos: { hidden: false } } });
  host.restore();
  const item = host.windows.get('bichos');
  const drag = host.dragStart({ closest: selector => (selector === '.mini' ? item.element : null), classList: { contains: () => false } },
    { clientX: 100, clientY: 100 });
  assert.equal(drag.kind, 'mini');
  host.dragMove(drag, -40, 25);
  assert.ok(Number.isFinite(settings.minis.bichos.dx) && Number.isFinite(settings.minis.bichos.dy));
  const moved = { ...settings.minis.bichos };
  drag.moved = true;
  host.dragEnd(drag, 2000);
  host.place('bichos');
  assert.equal(settings.minis.bichos.dx, moved.dx);
  assert.equal(item.element.style.left, `${Math.max(6, Math.round(400 + moved.dx))}px`);
});

test('recuar da borda retoma imediatamente o arrasto de todas as janelas extras', () => {
  for (const id of data.minis.windows.map(entry => entry.id)) for (const axis of ['x', 'y']) for (const direction of [-1, 1]) {
    const { host, settings } = setup(125, { minis: { [id]: { hidden: false } } });
    host.restore();
    const item = host.windows.get(id);
    assert.ok(item, id);
    const target = { closest: selector => selector === '.mini' ? item.element : null, classList: { contains: () => false } };
    const drag = host.dragStart(target, { clientX: 100, clientY: 100 });
    const move = amount => host.dragMove(drag, axis === 'x' ? amount : 0, axis === 'y' ? -amount : 0);
    const position = () => parseFloat(item.element.style[axis === 'x' ? 'left' : 'bottom']);
    const delta = direction * 4000;
    move(delta);
    const edge = position();
    assert.ok(Number.isFinite(edge), id + ': measurable position');
    move(delta - direction * 10);
    assert.equal(position(), edge - direction * 10, `${id}/${axis}/${direction}: reversing by 10 moves by 10`);
    move(delta - direction * 20);
    assert.equal(position(), edge - direction * 20);
    for (let i = 1; i <= 20; i++) move(delta - direction * (20 + i / 10));
    assert.equal(position(), edge - direction * 22, 'fractional movements accumulate across frames');
    drag.moved = true;
    host.dragEnd(drag, 2000);
    host.place(id);
    assert.equal(position(), edge - direction * 22, 'the saved position survives placement');
    assert.ok(Number.isFinite(settings.minis[id].dx) && Number.isFinite(settings.minis[id].dy));
  }
});

test('clicar na moldura do quintal permite arrastar sem jogar milho na cena', () => {
  const { host, engine } = setup(31, { minis: { bichos: { hidden: false } } });
  host.restore();
  host.draw(1000);
  const item = host.windows.get('bichos');
  const rect = item.canvas.getBoundingClientRect();
  const grain = engine.mini('bichos').info().grain;
  item.element.closest = item.canvas.closest = selector => selector === '.mini' ? item.element : null;
  const frameDrag = host.dragStart(item.element, { clientX: rect.left - 4, clientY: rect.top + rect.height * 0.8 });
  assert.equal(frameDrag.kind, 'mini', 'a moldura continua sendo alça para arrastar');
  host.dragEnd(frameDrag, 1000);
  assert.equal(engine.mini('bichos').info().grain, grain, 'clique fora do canvas não alimenta um bicho');
  assert.equal(item.view.probe().grains, 0);
  const sceneDrag = host.dragStart(item.canvas, { clientX: rect.left + rect.width * 0.4, clientY: rect.top + rect.height * 0.8 });
  host.dragEnd(sceneDrag, 1000);
  assert.equal(engine.mini('bichos').info().grain, grain - 1, 'o clique no chão do canvas ainda alimenta');
  assert.equal(item.view.probe().grains, 1);
});

test('a ajuda abre desde o início e devolve a rolagem da cena ao fechar ou esconder o minijogo', () => {
  const { host } = setup(20, { minis: { bichos: { hidden: false } } });
  host.restore();
  const item = host.windows.get('bichos');
  item.scene = globalThis.document.createElement('div');
  item.scene.scrollLeft = 50; item.scene.scrollTop = 140;
  let helpScroll = 80;
  Object.defineProperty(item.help, 'scrollTop', { get: () => helpScroll,
    set: value => { if (!item.help.hidden) helpScroll = value; } });
  host.setHelp('bichos', true);
  assert.equal(item.scene.scrollLeft, 0);
  assert.equal(item.scene.scrollTop, 0);
  assert.equal(item.help.scrollTop, 0, 'o texto começa no topo depois de ficar visível');
  item.help.scrollTop = 120;
  host.setHelp('bichos', true);
  assert.equal(item.help.scrollTop, 0);
  host.setHelp('bichos', false);
  assert.equal(item.scene.scrollLeft, 50);
  assert.equal(item.scene.scrollTop, 140, 'abrir a ajuda novamente não troca a posição guardada');
  host.setHelp('bichos', true);
  host.close('bichos');
  assert.equal(item.help.hidden, true);
  assert.equal(item.scene.scrollLeft, 50);
  assert.equal(item.scene.scrollTop, 140, 'esconder o minijogo também termina a ajuda e restaura a cena');
});

test('abrir a ajuda ou esconder a janela ou a festa cancela o clique e o arrasto já iniciados na cena', () => {
  const cases = ['help', 'hide', 'all'].flatMap(cancel => [false, true].flatMap(reopen => [false, true].map(moved => ({ cancel, reopen, moved }))));
  for (const { cancel, reopen, moved } of cases) {
      const { host, engine, settings } = setup(31, { minis: { bichos: { hidden: false } } });
      host.restore();
      host.draw(1000);
      const item = host.windows.get('bichos');
      item.canvas.closest = selector => selector === '.mini' ? item.element : null;
      const rect = item.canvas.getBoundingClientRect();
      const grain = engine.mini('bichos').info().grain;
      const event = { clientX: rect.left + rect.width * 0.4, clientY: rect.top + rect.height * 0.8 };
      const interrupted = host.dragStart(item.canvas, event);
      if (moved) { interrupted.moved = true; host.dragMove(interrupted, 5, 5); }
      if (cancel === 'help') { host.setHelp('bichos', true); if (reopen) host.setHelp('bichos', false); }
      else if (cancel === 'hide') { host.close('bichos'); if (reopen) host.setHidden('bichos', false); }
      else {
        settings.hidden = true;
        host.placeAll();
        if (reopen) { settings.hidden = false; host.placeAll(); }
      }
      const before = { ...settings.minis.bichos };
      if (moved) host.dragMove(interrupted, -40, 25);
      assert.deepEqual(settings.minis.bichos, before, 'o gesto cancelado não move nem reabre a janela');
      host.dragEnd(interrupted, 1040);
      assert.equal(engine.mini('bichos').info().grain, grain, `${cancel}/${reopen}: o soltar não joga milho atrás da ajuda ou da janela fechada`);
      if (reopen) {
        const next = host.dragStart(item.canvas, event);
        host.dragEnd(next, 1080);
        assert.equal(engine.mini('bichos').info().grain, grain - 1, 'um clique novo funciona depois de voltar à cena');
      }
  }
});

test('as preferências das janelas são saneadas', () => {
  const clean = Settings.normalizeSettings({ minis: { bichos: { hidden: false, dx: 12.4, dy: -7 }, horta: { dx: 'x' }, 'Chave Ruim': {}, ceu: 3 } });
  assert.deepEqual(clean.minis, { bichos: { hidden: false, dx: 12, dy: -7 }, horta: { hidden: true } });
  assert.deepEqual(Settings.normalizeSettings({}).minis, {});
  assert.deepEqual(Settings.mergeSettings(clean, { minis: { ceu: { hidden: false } } }).minis, { ceu: { hidden: false } });
});

// --- Quintal dos Bichos ---------------------------------------------------------------------------------------------------
test('bichos: o quintal desenha, o bicho reage ao carinho, o milho chama o bicho e o presente se pega', () => {
  const { host, engine, sounds, toasts } = setup(31, { minis: { bichos: { hidden: false } } });
  host.restore();
  const view = host.windows.get('bichos').view;
  let now = 1000;
  for (let i = 0; i < 90; i++) host.draw((now += 40));
  const probe = view.probe();
  assert.equal(probe.animals, 4, 'galinha, gato, bode e caramelo');
  assert.ok(probe.chicks >= 1);
  assert.ok(probe.areas.some(area => area.id === 'pet:galinha') && probe.areas.some(area => area.id === 'pet:gato'));
  assert.match(view.status(engine), /^mini\.bichos\.count · mini\.bichos\.grain$/);

  // Carinho: sobe o Amor e enche o laço; clicando de novo na hora, o bicho ainda está na espera.
  engine.state.humor.amor = 0;
  clickArea(host, 'bichos', 'pet:galinha', now);
  assert.equal(engine.mini('bichos').info().pets[0].bond, 1);
  assert.ok(engine.mood().amor > 0);
  assert.ok(sounds.includes('galinha') && sounds.includes('carinho'));
  clickArea(host, 'bichos', 'pet:galinha', now);
  assert.equal(engine.mini('bichos').info().pets[0].bond, 1, 'carinho tem espera');

  // Milho: um clique no chão joga um grão e o bicho mais perto vai comer.
  const grains = engine.mini('bichos').info().grain;
  const rect = host.windows.get('bichos').canvas.getBoundingClientRect();
  view.click(rect.left + rect.width * 0.5, rect.top + rect.height * 0.8, now);
  assert.equal(engine.mini('bichos').info().grain, grains - 1);
  assert.equal(view.probe().grains, 1);
  for (let i = 0; i < 250; i++) host.draw((now += 40));
  assert.equal(view.probe().grains, 0, 'o bicho comeu o milho');

  // Presente: com o laço cheio ele aparece e o clique entrega o prêmio.
  const st = engine.state.minis.bichos.pets.gato || (engine.state.minis.bichos.pets.gato = { bond: 0, ready: false, giftAt: 0, petAt: 0 });
  st.bond = data.minis.bichos.bondMax;
  st.ready = true;
  const cheer = engine.state.cheer;
  host.draw((now += 40));
  clickArea(host, 'bichos', 'pet:gato', now);
  assert.ok(engine.state.cheer > cheer, 'o ratinho de pano rende Animação');
  assert.equal(engine.mini('bichos').info().pets.find(pet => pet.id === 'gato').ready, false);
  assert.ok(toasts.some(text => /mini\.bichos\.gift/.test(text)));
  assert.ok(sounds.includes('moeda'));
});

test('bichos: o centro do presente desenhado pode ser clicado sem cair no chão', () => {
  const { host, engine, sounds } = setup(12, { minis: { bichos: { hidden: false } } });
  const draws = [];
  const make = document.createElement;
  document.createElement = tag => {
    const element = make(tag);
    if (tag === 'canvas') {
      const g = element.getContext('2d');
      const drawImage = g.drawImage;
      g.drawImage = (...args) => { draws.push(args); drawImage(...args); };
      element.getContext = () => g;
    }
    return element;
  };
  try { host.restore(); } finally { document.createElement = make; }
  const cat = engine.state.minis.bichos.pets.gato || (engine.state.minis.bichos.pets.gato = { petAt: 0, giftAt: 0 });
  cat.bond = data.minis.bichos.bondMax;
  cat.ready = true;
  host.draw(1000);
  const meta = bundle.janelas.bichos.presentes;
  const giftId = data.minis.bichos.pets.find(pet => pet.id === 'gato').gift;
  const gift = draws.find(args => args[0].value === bundle.images[meta.image] && args[1] === meta.ids.indexOf(giftId) * meta.w);
  assert.ok(gift, 'o presente do gato foi desenhado');
  const item = host.windows.get('bichos');
  const rect = item.canvas.getBoundingClientRect();
  const { width, height } = item.view.probe().size;
  const x = rect.left + (gift[5] + gift[7] / 2) * rect.width / width;
  const y = rect.top + (gift[6] + gift[8] / 2) * rect.height / height;
  const grain = engine.mini('bichos').info().grain;
  assert.equal(item.view.hit(x, y)?.pet, 'gato', 'a área do presente pertence ao gato');
  item.view.click(x, y, 1000);
  assert.equal(cat.ready, false, 'o clique entregou o presente');
  assert.equal(engine.mini('bichos').info().grain, grain, 'o clique não jogou milho');
  assert.ok(sounds.includes('moeda'));
  item.view.click(x, y, 1001);
  assert.equal(cat.bond, 0, 'repetir o clique no presente coletado não faz carinho fora do bicho');
  host.draw(1040);
  clickArea(host, 'bichos', 'pet:gato', 1040);
  assert.equal(cat.bond, data.minis.bichos.petBond, 'o carinho no bicho continua funcionando');
});

test('bichos: sem milho o clique no chão não faz nada além do aviso, e o desenho não acumula efeitos', () => {
  const { host, engine, sounds } = setup(125, { minis: { bichos: { hidden: false } } });
  host.restore();
  const view = host.windows.get('bichos').view;
  let now = 1000;
  host.draw((now += 40));
  engine.state.minis.bichos.grain = 0;
  const rect = host.windows.get('bichos').canvas.getBoundingClientRect();
  view.click(rect.left + rect.width * 0.4, rect.top + rect.height * 0.8, now);
  assert.equal(view.probe().grains, 0);
  assert.ok(sounds.includes('erro'));
  for (let i = 0; i < 4000; i++) host.draw((now += 33));
  assert.ok(view.probe().particles <= 160);
  assert.equal(view.probe().animals, 7, 'os sete bichos no 125');
});

// --- Aquário --------------------------------------------------------------------------------------------------------------
test('bichos: clicar no último pixel do pé do pintinho respeita a posição arredondada do desenho', () => {
  const originalDpr = globalThis.devicePixelRatio;
  try {
    globalThis.devicePixelRatio = 1.25;
    const { host, engine, sounds } = setup(12, { minis: { bichos: { hidden: false } } });
    host.restore();
    const item = host.windows.get('bichos');
    item.view.setScale(3);
    item.canvas.getBoundingClientRect = () => ({ left: 347, top: 115,
      width: parseFloat(item.canvas.style.width), height: parseFloat(item.canvas.style.height) });
    item.view.draw(engine, 1040);
    const chick = item.view.probe().areas.find(area => area.id === 'chick:1');
    const sheet = bundle.scenery.pintinho;
    const x = Math.round(chick.x + 1) + 2.5;
    const bottom = Math.round(chick.y + 2) + sheet.h;
    const rect = item.canvas.getBoundingClientRect();
    const size = item.view.probe().size;
    // O pé opaco termina em y76; em DPR125% o último pixel da tela cai em y75,9375.
    const clientX = Math.floor(rect.left + x * rect.width / size.width);
    const clientY = Math.ceil(rect.top + bottom * rect.height / size.height) - 1;
    assert.equal(item.view.hit(clientX, clientY)?.id, 'chick:1', 'o pé pertence ao pintinho, mesmo após arredondar para a grade de pixels');
    const grain = engine.mini('bichos').info().grain;
    item.view.click(clientX, clientY, 1040);
    assert.equal(engine.mini('bichos').info().grain, grain, 'o clique no pé não joga milho no chão');
    assert.equal(sounds.at(-1), 'pintinho');
    assert.equal(item.view.probe().grains, 0);
  } finally {
    if (originalDpr === undefined) delete globalThis.devicePixelRatio;
    else globalThis.devicePixelRatio = originalDpr;
  }
});

test('bichos: o pé da galinha em movimento dá carinho sem gastar milho', () => {
  const originalDpr = globalThis.devicePixelRatio;
  try {
    globalThis.devicePixelRatio = 1.25;
    const { host, engine, sounds } = setup(12, { minis: { bichos: { hidden: false } } });
    host.restore();
    const item = host.windows.get('bichos');
    item.view.setScale(3);
    item.canvas.getBoundingClientRect = () => ({ left: 347, top: 115,
      width: parseFloat(item.canvas.style.width), height: parseFloat(item.canvas.style.height) });
    for (let now = 1040; now <= 11320; now += 40) item.view.draw(engine, now);
    const pet = item.view.probe().areas.find(area => area.id === 'pet:galinha');
    const sheet = bundle.scenery.galinha;
    const rect = item.canvas.getBoundingClientRect();
    const size = item.view.probe().size;
    // A galinha está andando para a direita no quadro0: o pé opaco está em x3 da folha.
    const x = Math.round(pet.x + 1) + 3.5;
    const bottom = Math.round(pet.y + 6) + sheet.h;
    const clientX = Math.floor(rect.left + x * rect.width / size.width);
    const clientY = Math.ceil(rect.top + bottom * rect.height / size.height) - 1;
    assert.equal(item.view.hit(clientX, clientY)?.id, 'pet:galinha');
    const grain = engine.mini('bichos').info().grain;
    item.view.click(clientX, clientY, 11320);
    assert.equal(engine.mini('bichos').info().grain, grain);
    assert.equal(engine.mini('bichos').info().pets[0].bond, data.minis.bichos.petBond, 'recebe o laço do carinho, sem o bônus de comida');
    assert.equal(sounds.at(-1), 'carinho');
    assert.equal(item.view.probe().grains, 0);
  } finally {
    if (originalDpr === undefined) delete globalThis.devicePixelRatio;
    else globalThis.devicePixelRatio = originalDpr;
  }
});

test('aquário: os peixes nadam, a ração cai e o peixe menor vem comer e crescer, e a bolha dourada rende Animação', () => {
  const { host, engine, sounds, toasts } = setup(30, { minis: { aquario: { hidden: false } } });
  host.restore();
  const view = host.windows.get('aquario').view;
  let now = 1000;
  for (let i = 0; i < 60; i++) host.draw((now += 40));
  assert.equal(view.probe().fish, data.minis.aquario.starter);
  assert.match(view.status(engine), /^mini\.aquario\.count · mini\.aquario\.species$/);
  assert.ok(view.probe().areas.some(area => area.id === 'pote') && view.probe().areas.some(area => area.id.startsWith('fish:')));

  // Ração no pote: um peixe vem comer; passado um tempo ele comeu e a ração está na conta do motor.
  const aquario = engine.mini('aquario');
  const food = aquario.info().food;
  clickArea(host, 'aquario', 'pote', now);
  assert.equal(aquario.info().food, food - 1);
  assert.equal(view.probe().flakes, 1);
  for (let i = 0; i < 400; i++) host.draw((now += 40));
  assert.equal(view.probe().flakes, 0, 'o peixe comeu');
  assert.ok(sounds.includes('bola') || sounds.includes('crescer'));
  // Cresce na terceira ração: o peixe menor vira médio.
  engine.state.minis.aquario.food = 6;
  for (let i = 0; i < 4; i++) { clickArea(host, 'aquario', 'pote', now); for (let k = 0; k < 300; k++) host.draw((now += 40)); }
  assert.ok(aquario.info().fish.some(fish => fish.stage >= 1), 'alguém cresceu');

  // Sem ração: aviso e nada é gasto.
  engine.state.minis.aquario.food = 0;
  clickArea(host, 'aquario', 'pote', now);
  assert.ok(sounds.includes('erro'));

  // Bolha dourada: aparece quando há peixe grande e rende Animação ao estourar.
  engine.state.minis.aquario.fish = [{ id: 1, species: 'dourado', growth: 6, stage: 2 }];
  engine.state.minis.aquario.bubbles = 2;
  host.draw((now += 40));
  assert.equal(view.probe().bubbles, 2);
  const cheer = engine.state.cheer;
  clickArea(host, 'aquario', 'ouro:0', now);
  assert.ok(engine.state.cheer > cheer);
  assert.equal(aquario.info().bubbles, 1);

  // Peixe novo da pescaria: aviso (espécie nova) e o peixe aparece.
  engine.state.fishing = { unlocked: true, ready: 1, nextAt: 0 };
  engine.state.minis.aquario.fish = [];
  engine.state.minis.aquario.seen = [];
  engine.fish();
  host.onEvents(engine.drainEvents(), now);
  host.draw((now += 40));
  assert.equal(view.probe().fish, 1);
  assert.ok(toasts.some(text => /mini\.aquario\.newSpecies/.test(text)));
});

// --- Horta ----------------------------------------------------------------------------------------------------------------
test('aquário: clicar na barbatana visível acompanha o nado e a escala sem jogar ração', () => {
  const originalDpr = globalThis.devicePixelRatio;
  try {
    for (const dpr of [1, 1.25, 2]) {
      globalThis.devicePixelRatio = dpr;
      const { host, engine, clock, sounds } = setup(30, { minis: { aquario: { hidden: false } } });
      const fishDraws = [];
      const createElement = document.createElement;
      document.createElement = tag => {
        const element = createElement(tag);
        if (tag === 'canvas') {
          const g = element.getContext('2d');
          const drawImage = g.drawImage;
          let transform = { x: 0, scale: 1 };
          const stack = [];
          g.save = () => stack.push({ ...transform });
          g.restore = () => { transform = stack.pop(); };
          g.translate = x => { transform.x += x * transform.scale; };
          g.scale = x => { transform.scale *= x; };
          g.drawImage = (...args) => {
            if (args[0].value === bundle.images[bundle.janelas.aquario.peixes.image]) {
              fishDraws.push({ x: Math.min(transform.x + args[5] * transform.scale,
                transform.x + (args[5] + args[7]) * transform.scale), y: args[6], flipped: transform.scale < 0 });
            }
            drawImage(...args);
          };
          element.getContext = () => g;
        }
        return element;
      };
      try { host.restore(); } finally { document.createElement = createElement; }
      const model = engine.mini('aquario');
      const config = data.minis.aquario;
      // Cresce os peixes iniciais alimentando e esperando a reposição normal do pote.
      for (let i = 0; i < config.starter * config.growth[1]; i++) {
        if (!model.info().food) { clock.t += config.foodEvery * config.foodMax * 1000; model.tick(); }
        assert.equal(model.drop().ok, true);
      }
      clock.t += config.foodEvery * config.foodMax * 1000;
      model.tick();
      assert.equal(model.info().fish[0].species, 'tilapia');
      assert.equal(model.info().fish[0].stage, 2);
      assert.equal(model.addFish('lambari').ok, true, 'um peixe novo ainda pode consumir ração se o clique errar');
      const item = host.windows.get('aquario');
      let now = 1000;
      let previousX;
      for (const scale of [2, 3]) {
        item.view.setScale(scale, { width: scale === 2 ? 600 : 320, height: 500 });
        item.canvas.getBoundingClientRect = () => ({ left: scale === 2 ? 347 : 73, top: 115,
          width: parseFloat(item.canvas.style.width), height: parseFloat(item.canvas.style.height) });
        fishDraws.length = 0;
        item.view.draw(engine, now += 160);
        const areas = item.view.probe().areas.filter(area => area.id.startsWith('fish:'));
        const sprite = fishDraws[areas.findIndex(area => area.id === 'fish:1')];
        assert.ok(sprite, 'a tilápia adulta foi desenhada');
        // Pixel opaco da barbatana superior da tilápia nos dois quadros (x13, y1 da folha).
        const x = sprite.x + (sprite.flipped ? 26 - 13.5 : 13.5);
        const y = sprite.y + 1.5;
        const rect = item.canvas.getBoundingClientRect();
        const size = item.view.probe().size;
        const clientX = rect.left + x * rect.width / size.width;
        const clientY = rect.top + y * rect.height / size.height;
        assert.equal(item.view.hit(clientX, clientY)?.id, 'fish:1', `DPR ${dpr}, escala ${scale}: a barbatana é parte do peixe`);
        const food = model.info().food;
        item.view.click(clientX, clientY, now);
        assert.equal(model.info().food, food, 'acariciar o peixe não joga ração no tanque');
        assert.equal(item.view.probe().flakes, 0);
        assert.equal(sounds.at(-1), 'bolha');
        if (previousX !== undefined) assert.notEqual(sprite.x, previousX, 'o alvo acompanha o peixe em movimento');
        previousX = sprite.x;
      }
    }
  } finally {
    if (originalDpr === undefined) delete globalThis.devicePixelRatio;
    else globalThis.devicePixelRatio = originalDpr;
  }
});

test('aquário: comida expirada não faz o peixe apagar a ração seguinte', () => {
  const { host, engine, sounds } = setup(30, { minis: { aquario: { hidden: false } } });
  host.restore();
  const state = engine.state.minis.aquario;
  state.started = true;
  state.fish = [{ id: 1, species: 'lambari', growth: 5, stage: 1 }];
  state.nextId = 2;
  const item = host.windows.get('aquario');
  let now = 1000;
  host.draw(now);
  // Espera uma posição alcançada pelo próprio nado: nenhuma coordenada do peixe é injetada.
  let corner;
  for (let i = 0; i < 30000 && !corner; i++) {
    host.draw(now += 40);
    const fish = item.view.probe().areas.find(area => area.id === 'fish:1');
    const x = fish.x + fish.w / 2;
    const y = fish.y + fish.h / 2;
    if ((x <= 12.001 || x >= 163.999) && y < 18.5) corner = x < 88 ? 164 : 12;
  }
  assert.ok(corner, 'o peixe alcançou uma extremidade perto da superfície');
  const clickWater = (x, y) => {
    const rect = item.canvas.getBoundingClientRect();
    const size = item.view.probe().size;
    item.view.click(rect.left + x * rect.width / size.width, rect.top + y * rect.height / size.height, now);
  };
  clickWater(corner, 71);
  assert.equal(state.fish[0].stage, 2, 'essa ração torna o peixe adulto e mais lento');
  for (let i = 0; i < 226; i++) host.draw(now += 40);
  assert.equal(item.view.probe().flakes, 0, 'a ração venceu antes de o peixe chegar');
  assert.ok(!sounds.includes('crescer'), 'o peixe ainda não comeu');
  assert.equal(engine.mini('aquario').addFish('lambari').ok, true);
  host.onEvents(engine.drainEvents(), now);
  host.draw(now);
  clickWater(corner === 12 ? 164 : 12, 71);
  assert.equal(item.view.probe().flakes, 1);
  for (let i = 0; i < 8; i++) host.draw(now += 40);
  assert.equal(item.view.probe().flakes, 1, 'o adulto não remove a ração que pertence ao peixe novo');
  assert.ok(!sounds.includes('crescer'), 'a comida expirada não gera uma chegada atrasada');
});

test('aquário: estourar uma bolha remove a clicada e não paga outra no mesmo desenho', () => {
  const { host, engine } = setup(30, { minis: { aquario: { hidden: false } } });
  host.restore();
  engine.state.minis.aquario.fish = [{ id: 1, species: 'dourado', growth: 6, stage: 2 }];
  engine.state.minis.aquario.bubbles = 2;
  host.draw(1000);
  const item = host.windows.get('aquario');
  const gold = item.view.probe().areas.filter(area => area.id.startsWith('ouro:'));
  assert.equal(gold.length, 2);
  const rect = item.canvas.getBoundingClientRect();
  const size = item.view.probe().size;
  const x = rect.left + (gold[0].x + gold[0].w / 2) * rect.width / size.width;
  const y = rect.top + (gold[0].y + gold[0].h / 2) * rect.height / size.height;
  assert.equal(item.view.hit(x, y).ouro, 0);
  item.view.click(x, y, 1000);
  const cheer = engine.state.cheer;
  item.view.click(x, y, 1001);
  assert.equal(engine.state.minis.aquario.bubbles, 1, 'um clique repetido no mesmo desenho não estoura a outra bolha');
  assert.equal(engine.state.cheer, cheer, 'a bolha clicada só entrega um prêmio');
  host.draw(1040);
  const remaining = item.view.probe().areas.find(area => area.id.startsWith('ouro:'));
  assert.ok(Math.hypot(remaining.x - gold[1].x, remaining.y - gold[1].y) < 3, 'a bolha não clicada continua no lugar dela');
  clickArea(host, 'aquario', remaining.id, 1040);
  assert.equal(engine.state.minis.aquario.bubbles, 0, 'o clique na outra bolha funciona');
});

test('aquário: a descoberta avisa uma vez mesmo quando o tanque cheio converte a captura em ficha', () => {
  const { host, engine, toasts } = setup(30, { minis: { aquario: { hidden: false } } });
  host.restore();
  host.draw(1000);
  const aquario = engine.mini('aquario');
  const known = aquario.info().seen[0];
  while (aquario.info().fish.length < data.minis.aquario.tankMax) aquario.addFish(known);
  engine.drainEvents();
  const unseen = data.minis.aquario.species.find(species => !aquario.info().seen.includes(species.id)).id;
  aquario.addFish(unseen);
  host.onEvents(engine.drainEvents(), 1100);
  assert.equal(toasts.filter(text => text === 'mini.aquario.newSpecies').length, 1, 'a ficha recebida ainda conta como descoberta');
  aquario.addFish(unseen);
  host.onEvents(engine.drainEvents(), 1200);
  assert.equal(toasts.filter(text => text === 'mini.aquario.newSpecies').length, 1, 'capturar a mesma espécie não repete o aviso');
});

test('horta: escolhe a semente, planta, rega, colhe e espanta o corvo pelos cliques', () => {
  const { host, engine, sounds, toasts, clock } = setup(30, { minis: { horta: { hidden: false } } });
  host.restore();
  const view = host.windows.get('horta').view;
  const horta = engine.mini('horta');
  let now = 1000;
  host.draw((now += 40));
  const areas = view.probe().areas.map(area => area.id);
  assert.ok(['plot:0', 'plot:3', 'plot:9', 'semente:milho', 'semente:abobora', 'regadora'].every(id => areas.includes(id)), areas.join(','));
  assert.match(view.status(engine), /^mini\.horta\.count · mini\.horta\.water$/);

  clickArea(host, 'horta', 'semente:mandioca', now);
  assert.equal(horta.info().seed, 'mandioca');
  clickArea(host, 'horta', 'plot:0', now);
  assert.equal(horta.info().plots[0].crop, 'mandioca');
  const water = horta.info().water;
  clickArea(host, 'horta', 'plot:0', now);
  assert.equal(horta.info().water, water - 1, 'clicar na planta crescendo rega');
  assert.equal(horta.info().plots[0].waters, 1);

  // Canteiro fechado: aviso e nada acontece.
  sounds.length = 0;
  clickArea(host, 'horta', 'plot:9', now);
  assert.ok(sounds.includes('erro'));
  assert.equal(horta.info().plots[9].crop, null);

  // Passa o tempo: a planta fica no ponto e o clique colhe.
  clock.t += 20 * 60000;
  engine.tick(1);
  host.draw((now += 40));
  const cheer = engine.state.cheer;
  clickArea(host, 'horta', 'plot:0', now);
  assert.ok(engine.state.cheer > cheer, 'a mandioca rende Animação');
  assert.equal(horta.info().plots[0].crop, null);
  assert.ok(toasts.some(text => /mini\.horta\.first/.test(text)), 'primeira colheita avisa');

  // Corvo: aparece na tela e o clique espanta.
  horta.plant(1, 'abobora');
  engine.state.minis.horta.crowAt = clock.t - 1;
  engine.tick(1);
  host.draw((now += 40));
  assert.ok(view.probe().areas.some(area => area.id === 'corvo'));
  clickArea(host, 'horta', 'corvo', now);
  assert.equal(horta.info().crow, null);
  assert.equal(engine.state.minis.horta.scared, 1);
});

test('horta: a última linha visível da planta rega e colhe o próprio canteiro nas duas fileiras', () => {
  const originalDpr = globalThis.devicePixelRatio;
  try {
    for (const dpr of [1, 1.25, 2]) {
      globalThis.devicePixelRatio = dpr;
      for (const index of [0, 5]) {
        const { host, engine, clock } = setup(80, { minis: { horta: { hidden: false } } });
        host.restore();
        const model = engine.mini('horta');
        assert.equal(model.plant(index, 'milho').ok, true);
        const item = host.windows.get('horta');
        item.view.setScale(3, { width: 320, height: 500 });
        item.canvas.getBoundingClientRect = () => ({ left: 73, top: 115,
          width: parseFloat(item.canvas.style.width), height: parseFloat(item.canvas.style.height) });
        const meta = bundle.janelas.horta;
        // A linha29 da planta fica um pixel abaixo do solo e permanece opaca em todos os estágios.
        const x = meta.colunas[index % 5] + 17.5;
        const y = meta.linhas[Math.floor(index / 5)] + meta.canteiro[1] + 0.5;
        item.view.draw(engine, 1040);
        const rect = item.canvas.getBoundingClientRect();
        const size = item.view.probe().size;
        const clientX = rect.left + x * rect.width / size.width;
        const clientY = rect.top + y * rect.height / size.height;
        assert.equal(item.view.hit(clientX, clientY)?.id, `plot:${index}`, `DPR ${dpr}: o broto pertence ao próprio canteiro`);
        const water = model.info().water;
        item.view.click(clientX, clientY, 1040);
        assert.equal(model.info().water, water - 1);
        assert.equal(model.info().plots[index].waters, 1);
        // Fica pronta pelo relógio, sem um tick entre a mudança de fase e o desenho.
        clock.t = engine.state.minis.horta.plots[index].readyAt;
        item.view.draw(engine, 1600);
        assert.equal(model.info().plots[index].ready, true);
        assert.equal(item.view.hit(clientX, clientY)?.id, `plot:${index}`);
        item.view.click(clientX, clientY, 1600);
        assert.equal(model.info().plots[index].crop, null, 'o clique colhe a planta que está visível');
      }
    }
  } finally {
    if (originalDpr === undefined) delete globalThis.devicePixelRatio;
    else globalThis.devicePixelRatio = originalDpr;
  }
});

test('horta: clicar nas patas do corvo durante o balanço espanta em vez de regar', () => {
  const { host, engine, clock } = setup(30, { minis: { horta: { hidden: false } } });
  host.restore();
  const model = engine.mini('horta');
  assert.equal(model.plant(0, 'abobora').ok, true);
  model.tick();
  clock.t = engine.state.minis.horta.crowAt;
  model.tick();
  assert.equal(model.info().crow?.plot, 0, 'o corvo veio visitar o único canteiro plantado');
  const item = host.windows.get('horta');
  item.view.setScale(2);
  item.canvas.getBoundingClientRect = () => ({ left: 347, top: 115,
    width: parseFloat(item.canvas.style.width), height: parseFloat(item.canvas.style.height) });
  item.view.draw(engine, 1270); // Balanço +1: as patas opacas da linha15 chegam a y+4.
  const meta = bundle.janelas.horta;
  const rect = item.canvas.getBoundingClientRect();
  const size = item.view.probe().size;
  const clientX = rect.left + (meta.colunas[0] + 6 + 8.5) * rect.width / size.width;
  const clientY = rect.top + (meta.linhas[0] + 4.5) * rect.height / size.height;
  assert.equal(item.view.hit(clientX, clientY)?.id, 'corvo', 'a pata visível continua sendo parte do corvo');
  const water = model.info().water;
  item.view.click(clientX, clientY, 1270);
  assert.equal(model.info().water, water);
  assert.equal(model.info().crow, null);
  assert.equal(engine.state.minis.horta.scared, 1);
  item.view.draw(engine, 1310);
  assert.equal(item.view.hit(clientX, clientY)?.id, 'plot:0', 'o clique volta à planta depois que o corvo vai embora');
});

test('horta: reabrir antes do próximo desenho não espanta um corvo novo pelo canteiro antigo', () => {
  const { host, engine, clock } = setup(30, { minis: { horta: { hidden: false } } });
  host.restore();
  const model = engine.mini('horta');
  const state = engine.state.minis.horta;
  assert.equal(model.plant(0, 'abobora').ok, true);
  model.tick();
  clock.t = state.crowAt;
  model.tick();
  host.draw(1000);
  const first = state.crow;
  assert.equal(first.plot, 0);
  const item = host.windows.get('horta');
  item.canvas.closest = selector => selector === '.mini' ? item.element : null;
  const probe = item.view.probe();
  const area = probe.areas.find(entry => entry.id === 'corvo');
  const rect = item.canvas.getBoundingClientRect();
  const event = { clientX: rect.left + (area.x + area.w / 2) * rect.width / probe.size.width,
    clientY: rect.top + (area.y + area.h / 2) * rect.height / probe.size.height };
  assert.equal(model.plant(1, 'abobora').ok, true);
  host.close('horta');
  clock.t = first.until;
  model.tick();
  assert.equal(state.eaten, 1);
  clock.t = state.crowAt;
  model.tick();
  const next = state.crow;
  assert.equal(next.plot, 1, 'o segundo corvo pousou na outra planta, enquanto a janela estava fechada');
  host.setHidden('horta', false);
  const drag = host.dragStart(item.canvas, event);
  assert.equal(drag.found.id, 'corvo');
  const cheer = engine.state.cheer;
  host.dragEnd(drag, 1040);
  assert.equal(state.scared, 0, 'o desenho antigo não espanta o corvo de outro canteiro');
  assert.equal(state.crow, next);
  assert.equal(engine.state.cheer, cheer, 'não paga por um corvo que ainda não foi apresentado');
  assert.equal(state.planted, 2, 'o clique antigo também não replanta o canteiro vazio');
  host.draw(1080);
  clickArea(host, 'horta', 'corvo', 1080);
  assert.equal(state.scared, 1, 'o corvo desenhado continua respondendo ao clique');
  assert.equal(model.info().crow, null);
});

// --- Fogueira de Perto ----------------------------------------------------------------------------------------------------
test('fogueira: lenha, escolher a comida, pôr no espeto, esperar ficar pronta (nunca queima), comer (a comida voa até o espectador) e pular a fogueira pelos cliques', () => {
  const { host, engine, sounds } = setup(40, { minis: { fogueira: { hidden: false } } });
  host.restore();
  const view = host.windows.get('fogueira').view;
  const fogueira = engine.mini('fogueira');
  const c = data.minis.fogueira;
  engine.state.wood = 10;
  let now = 1000;
  host.draw((now += 40));
  const areas = view.probe().areas.map(area => area.id);
  assert.ok(['lenha', 'fogo', 'termometro', 'espeto:0', 'espeto:3', 'comida:milho', 'comida:queijo'].every(id => areas.includes(id)), areas.join(','));
  assert.match(view.status(engine), /^mini\.fogueira\.count · mini\.fogueira\.heat$/);

  // Lenha no fogo até encher; cheio, não gasta mais.
  for (let i = 0; i < 5; i++) clickArea(host, 'fogueira', 'lenha', now);
  assert.equal(fogueira.info().heat, c.heatMax);
  assert.equal(engine.state.wood, 5);
  clickArea(host, 'fogueira', 'lenha', now);
  assert.equal(engine.state.wood, 5);
  assert.ok(sounds.includes('lenha') && sounds.includes('erro'));

  // Escolhe o queijo e põe no espeto 0; ainda assando, clicar só avisa (não tira nada); pronto, clicar come.
  clickArea(host, 'fogueira', 'comida:queijo', now);
  assert.equal(fogueira.info().selected, 'queijo');
  clickArea(host, 'fogueira', 'espeto:0', now);
  assert.equal(fogueira.info().sticks[0].food, 'queijo');
  const heat = () => { engine.state.minis.fogueira.heat = c.heatMax; engine.tick(1); host.draw((now += 40)); };
  while (fogueira.info().sticks[0].progress < 0.3) heat();
  const falas = view.probe().says;
  clickArea(host, 'fogueira', 'espeto:0', now);
  assert.equal(fogueira.info().sticks[0].food, 'queijo', 'ainda assando: o clique não tira');
  assert.equal(view.probe().says, falas + 1, 'só avisa que ainda está assando')
  while (!fogueira.info().sticks[0].ready) heat();
  // Pronta, ela espera (e não queima), mesmo com o fogo no máximo por muito tempo.
  for (let i = 0; i < 400; i++) heat();
  assert.equal(fogueira.info().sticks[0].ready, true);
  assert.equal(engine.state.minis.fogueira.burnt, undefined, 'não existe mais queimar');
  engine.state.humor.amor = 0;
  engine.state.humor.at = engine.now();
  clickArea(host, 'fogueira', 'espeto:0', now);
  assert.equal(fogueira.info().sticks[0], null, 'comeu');
  assert.ok(engine.mood().amor > 0, 'o queijo rende Amor');
  assert.equal(engine.state.minis.fogueira.roasted, 1);
  assert.equal(view.probe().flights, 1, 'a comida voa até o espectador do banco');
  assert.ok(sounds.includes('carinho'));
  for (let i = 0; i < 20; i++) host.draw((now += 40));
  assert.equal(view.probe().flights, 0, 'chegou: o espectador comeu e o prêmio aparece');
  assert.ok(view.probe().says >= 2, 'NHAM e o prêmio na tela');

  // Pular a fogueira: precisa de calor; a animação dura um instante.
  const cheer = engine.state.cheer;
  clickArea(host, 'fogueira', 'fogo', now);
  assert.ok(engine.state.cheer > cheer);
  assert.equal(view.probe().jumping, true);
  for (let i = 0; i < 30; i++) host.draw((now += 40));
  assert.equal(view.probe().jumping, false);
  for (let i = 0; i < 3000; i++) host.draw((now += 33));
  assert.ok(view.probe().particles <= 160);
});

test('fogueira: o topo da chama alta também pula o fogo após mudar a escala e o DPR', () => {
  const originalDpr = globalThis.devicePixelRatio;
  try {
    for (const dpr of [1, 1.25, 2]) {
      globalThis.devicePixelRatio = dpr;
      for (const wood of [4, 5]) {
        const { host, engine } = setup(40, { minis: { fogueira: { hidden: false } } });
        const fires = [];
        const createElement = document.createElement;
        document.createElement = tag => {
          const element = createElement(tag);
          if (tag === 'canvas') {
            const g = element.getContext('2d');
            const drawImage = g.drawImage;
            g.drawImage = (...args) => {
              if (Object.values(bundle.fires).some(sheet => args[0].value === bundle.images[sheet.image])) fires.push(args);
              drawImage(...args);
            };
            element.getContext = () => g;
          }
          return element;
        };
        try { host.restore(); } finally { document.createElement = createElement; }
        const item = host.windows.get('fogueira');
        const model = engine.mini('fogueira');
        engine.state.wood = wood;
        for (let i = 0; i < wood; i++) assert.equal(model.addWood().ok, true);
        item.view.setScale(2, { width: 600, height: 500 });
        item.canvas.getBoundingClientRect = () => ({ left: 347, top: 115,
          width: parseFloat(item.canvas.style.width), height: parseFloat(item.canvas.style.height) });
        host.draw(1040);
        assert.equal(fires.length, 1, 'a chama foi desenhada');
        const [, , , , , x, y, w] = fires[0];
        const size = item.view.probe().size;
        const rect = item.canvas.getBoundingClientRect();
        const clientX = rect.left + (x + w / 2) * rect.width / size.width;
        const clientY = rect.top + (y + 2) * rect.height / size.height;
        assert.equal(item.view.hit(clientX, clientY)?.id, 'fogo', `${wood} lenhas, DPR ${dpr}: a chama visível é clicável até o topo`);
        item.view.click(clientX, clientY, 1040);
        assert.equal(engine.state.minis.fogueira.jumped, 1, 'clicar na ponta da chama executa o salto');
        assert.equal(item.view.probe().jumping, true);
        model.tick(data.minis.fogueira.heatMax / data.minis.fogueira.heatLoss);
        host.draw(1100);
        assert.equal(item.view.hit(clientX, clientY), null, 'quando a chama apaga o topo deixa de receber o clique');
      }
    }
  } finally {
    if (originalDpr === undefined) delete globalThis.devicePixelRatio;
    else globalThis.devicePixelRatio = originalDpr;
  }
});

// --- Palco do Forró -------------------------------------------------------------------------------------------------------
test('palco: escolhe a música, marca o ritmo nas pistas, vê o resultado e fecha', () => {
  const { host, engine, sounds, clock, toasts } = setup(40, { minis: { palco: { hidden: false } } });
  host.restore();
  const view = host.windows.get('palco').view;
  const palco = engine.mini('palco');
  let now = 1000;
  host.draw((now += 40));
  const areas = view.probe().areas.map(area => area.id);
  assert.ok(['pista:0', 'pista:1', 'pista:2', 'musica:xote', 'musica:baiao'].every(id => areas.includes(id)), areas.join(','));
  assert.match(view.status(engine), /^mini\.palco\.stars$/);

  // Música bloqueada não começa; a primeira começa.
  clickArea(host, 'palco', 'musica:baiao', now);
  assert.equal(palco.info().show, null);
  clickArea(host, 'palco', 'musica:xote', now);
  assert.ok(palco.info().show);
  assert.ok(sounds.includes('abrir'));
  host.draw((now += 40));
  assert.ok(!view.probe().areas.some(area => area.id.startsWith('musica:')), 'durante o show some o menu');

  // Toca: acerta todas as notas na hora, cada uma na pista dela.
  const startAt = engine.state.minis.palco.show.startAt;
  const notes = palco.chart('xote');
  for (const note of notes) {
    clock.t = startAt + note.t;
    host.draw((now += 40));
    clickArea(host, 'palco', `pista:${note.lane}`, now);
  }
  assert.ok(sounds.includes('palco-triangulo') && sounds.includes('palco-zabumba') && sounds.includes('palco-sanfona'), 'cada pista tem o seu som');
  assert.equal(engine.state.minis.palco.show.maxCombo, notes.length);
  // Fora de hora: nada acerta.
  clickArea(host, 'palco', 'pista:1', now);
  // Acaba o show: o resultado aparece e o clique fecha.
  clock.t = startAt + notes[notes.length - 1].t + 5000;
  engine.tick(1);
  host.onEvents(engine.drainEvents(), now);
  host.draw((now += 40));
  assert.equal(palco.info().last.stars, 3);
  assert.ok(view.probe().areas.some(area => area.id === 'resultado'));
  assert.ok(toasts.some(text => /mini\.palco\.threeStars/.test(text)));
  clickArea(host, 'palco', 'resultado', now);
  assert.equal(palco.info().last, null);
  host.draw((now += 40));
  assert.ok(view.probe().areas.some(area => area.id === 'musica:baiao'), 'o menu volta e a segunda música abriu');
  for (let i = 0; i < 3000; i++) host.draw((now += 33));
  assert.ok(view.probe().particles <= 160);
});

test('palco: o clique da pista não fecha um resultado que ainda não foi desenhado', () => {
  for (const reopen of [false, true]) {
    const { host, engine, clock } = setup(40, { minis: { palco: { hidden: false } } });
    host.restore();
    const view = host.windows.get('palco').view;
    const palco = engine.mini('palco');
    host.draw(1000);
    clickArea(host, 'palco', 'musica:xote', 1000);
    host.draw(1040);
    const show = engine.state.minis.palco.show;
    if (reopen) host.close('palco');
    clock.t = show.startAt + show.notes.at(-1).t + 1201;
    engine.tick(1);
    const result = palco.info().last;
    assert.ok(result);
    if (reopen) host.setHidden('palco', false);
    assert.ok(!view.probe().areas.some(area => area.id === 'resultado'));
    clickArea(host, 'palco', 'pista:0', 1041);
    assert.equal(palco.info().last, result, 'o resultado permanece até ser apresentado');
    host.draw(1080);
    assert.ok(view.probe().areas.some(area => area.id === 'resultado'));
    clickArea(host, 'palco', 'resultado', 1080);
    assert.equal(palco.info().last, null, 'o resultado apresentado ainda pode ser fechado');
  }
});

// --- Céu de São João ------------------------------------------------------------------------------------------------------
test('céu: foguete sobe onde se clica e estoura, a Grande Final vem com vários, a estrela cadente e a simpatia respondem aos cliques', () => {
  const { host, engine, sounds, toasts } = setup(70, { minis: { ceu: { hidden: false } } });
  host.restore();
  const view = host.windows.get('ceu').view;
  const ceu = engine.mini('ceu');
  const c = data.minis.ceu;
  assert.deepEqual(bundle.janelas.ceu.cartas.ids, c.simpatias.map(entry => entry.id), 'as faces das cartas seguem a ordem dos dados');
  let now = 1000;
  host.draw((now += 40));
  const areas = view.probe().areas.map(area => area.id);
  assert.ok(['ceu', 'caixa', 'mesa'].every(id => areas.includes(id)), areas.join(','));
  assert.match(view.status(engine), /^mini\.ceu\.status$/);

  // Foguete: gasta uma carga, sobe e estoura em faíscas.
  const rect = host.windows.get('ceu').canvas.getBoundingClientRect();
  view.click(rect.left + rect.width * 0.4, rect.top + rect.height * 0.3, now);
  assert.equal(ceu.info().rockets, c.rocketMax - 1);
  assert.equal(view.probe().shells, 1);
  for (let i = 0; i < 60; i++) host.draw((now += 40));
  assert.equal(view.probe().shells, 0, 'estourou');
  assert.ok(sounds.includes('arremesso') && sounds.includes('estalo'));
  // Grande Final: o quarto seguido.
  for (let i = 0; i < 3; i++) view.click(rect.left + rect.width * (0.3 + i * 0.2), rect.top + rect.height * 0.3, now);
  assert.ok(sounds.includes('conquista'), 'Grande Final');
  for (let i = 0; i < 80; i++) host.draw((now += 40));
  assert.ok(view.probe().sparks > 0 || view.probe().shells === 0);
  // Sem foguetes: aviso.
  engine.state.minis.ceu.rockets = 0;
  sounds.length = 0;
  view.click(rect.left + rect.width * 0.5, rect.top + rect.height * 0.3, now);
  assert.ok(sounds.includes('erro'));

  // Estrela cadente: aparece e o clique faz o pedido.
  engine.state.minis.ceu.starAt = engine.now() - 1;
  engine.tick(1);
  host.draw((now += 40));
  assert.ok(view.probe().areas.some(area => area.id === 'estrela'));
  clickArea(host, 'ceu', 'estrela', now);
  assert.equal(engine.state.minis.ceu.wishes, 1);

  // Simpatia: a mesa abre as cartas, a carta rende e o clique fecha.
  clickArea(host, 'ceu', 'mesa', now);
  host.draw((now += 40));
  assert.ok(ceu.info().cards);
  assert.ok(view.probe().areas.some(area => area.id === 'carta:0'));
  clickArea(host, 'ceu', 'carta:1', now);
  assert.equal(ceu.info().cards.picked, 1);
  assert.ok(toasts.some(text => /mini\.ceu\.simpatiaToast/.test(text)));
  host.draw((now += 40));
  clickArea(host, 'ceu', 'fechar', now);
  assert.equal(ceu.info().cards, null);
  for (let i = 0; i < 3000; i++) host.draw((now += 33));
  assert.ok(view.probe().particles <= 160 && view.probe().sparks <= 320);
});

test('soltar depois de a estrela sair do ponto pressionado não transforma o pedido em foguete', () => {
  const { host, engine, clock } = setup(80, { minis: { ceu: { hidden: false } } });
  host.restore();
  engine.state.minis.ceu.starAt = clock.t - 1;
  engine.tick(1);
  host.draw(1000);
  const item = host.windows.get('ceu');
  item.canvas.closest = selector => selector === '.mini' ? item.element : null;
  const probe = item.view.probe();
  const star = probe.areas.find(area => area.id === 'estrela');
  const rect = item.canvas.getBoundingClientRect();
  const event = { clientX: rect.left + (star.x + star.w / 2) * rect.width / probe.size.width,
    clientY: rect.top + (star.y + star.h / 2) * rect.height / probe.size.height };
  const drag = host.dragStart(item.canvas, event);
  assert.equal(drag.found.id, 'estrela');
  const rockets = engine.mini('ceu').info().rockets;
  clock.t += data.minis.ceu.starSeconds * 1000 / 3;
  host.draw(2000);
  assert.equal(item.view.hit(event.clientX, event.clientY).id, 'ceu', 'a estrela já saiu da posição pressionada');
  host.dragEnd(drag, 2000);
  assert.equal(engine.mini('ceu').info().rockets, rockets, 'um gesto sobre a estrela não gasta um foguete');
  assert.equal(item.view.probe().shells, 0);
  clickArea(host, 'ceu', 'estrela', 2000);
  assert.equal(engine.state.minis.ceu.wishes, 1, 'clicar na posição nova da estrela ainda faz o pedido');
});

test('céu: reabrir antes do próximo desenho não aplica o clique da estrela antiga à seguinte', () => {
  const { host, engine, clock } = setup(80, { minis: { ceu: { hidden: false } } });
  host.restore();
  const model = engine.mini('ceu');
  const state = engine.state.minis.ceu;
  state.starAt = clock.t - 1;
  engine.tick(1);
  host.draw(1000);
  const item = host.windows.get('ceu');
  item.canvas.closest = selector => selector === '.mini' ? item.element : null;
  const probe = item.view.probe();
  const oldArea = probe.areas.find(area => area.id === 'estrela');
  const rect = item.canvas.getBoundingClientRect();
  const event = { clientX: rect.left + (oldArea.x + oldArea.w / 2) * rect.width / probe.size.width,
    clientY: rect.top + (oldArea.y + oldArea.h / 2) * rect.height / probe.size.height };
  const previous = state.star;
  host.close('ceu');
  clock.t = previous.until;
  engine.tick(1);
  assert.equal(state.star, null, 'a estrela vista pela pessoa venceu enquanto a janela estava fechada');
  clock.t = state.starAt;
  engine.tick(1);
  const next = state.star;
  assert.ok(next && next.born > previous.born);
  assert.equal(next.seed, previous.seed, 'a semente visual pode se repetir; o nascimento distingue cada estrela');
  host.setHidden('ceu', false);
  const drag = host.dragStart(item.canvas, event);
  assert.equal(drag.found.id, 'estrela', 'o primeiro gesto ainda usa o desenho anterior');
  const cheer = engine.state.cheer;
  host.dragEnd(drag, 1040);
  assert.equal(state.wishes, 0, 'a estrela nova precisa aparecer antes de poder receber o pedido');
  assert.equal(state.star, next);
  assert.equal(engine.state.cheer, cheer, 'o clique antigo não entrega prêmio');
  assert.equal(item.view.probe().shells, 0, 'nem transforma o pedido em foguete');
  host.draw(1080);
  clickArea(host, 'ceu', 'estrela', 1080);
  assert.equal(state.wishes, 1, 'o clique na estrela apresentada continua funcionando');
  assert.equal(model.info().star, null);
});

test('céu: a recompensa da carta aparece por cima do painel da simpatia', () => {
  const { host, engine } = setup(70, { minis: { ceu: { hidden: false } } });
  const order = [];
  const createElement = document.createElement;
  const pixelText = ArraiaFesta.pixelText;
  document.createElement = tag => {
    const element = createElement(tag);
    if (tag === 'canvas') {
      const g = element.getContext('2d');
      const drawImage = g.drawImage;
      g.drawImage = (...args) => {
        if (args[0].value === bundle.images[bundle.janelas.ceu.cartas.image]) order.push('carta');
        drawImage(...args);
      };
      element.getContext = () => g;
    }
    return element;
  };
  ArraiaFesta.pixelText = (g, text, ...args) => { order.push(text); pixelText(g, text, ...args); };
  try {
    host.restore();
    host.draw(1000);
    clickArea(host, 'ceu', 'mesa', 1000);
    host.draw(1040);
    assert.equal(engine.mini('ceu').info().cards.ids[0], 'fogueira', 'esta carta rende lenha');
    clickArea(host, 'ceu', 'carta:0', 1040);
    order.length = 0;
    host.draw(1080);
    assert.equal(order.filter(entry => entry === 'carta').length, 3, 'as três faces foram reveladas');
    assert.ok(order.indexOf('gain.wood') > order.lastIndexOf('carta'), 'o painel e as cartas não cobrem o texto da recompensa');
  } finally {
    document.createElement = createElement;
    ArraiaFesta.pixelText = pixelText;
  }
});

// --- Bairro ---------------------------------------------------------------------------------------------------------------
test('bairro: cada integrante da turma mora numa casa e o clique visita quem está esperando', () => {
  const { host, engine, sounds, toasts } = setup(80, { minis: { bairro: { hidden: false } } });
  host.restore();
  const view = host.windows.get('bairro').view;
  const bairro = engine.mini('bairro');
  let now = 1000;
  host.draw((now += 40));
  const areas = view.probe().areas.map(area => area.id);
  assert.equal(areas.filter(id => id.startsWith('casa:')).length, data.chars.length, 'uma casa por integrante');
  assert.equal(bundle.janelas.bairro.casas.quantas, data.chars.length, 'a casa vazia é a última do quadro');
  assert.match(view.status(engine), /^mini\.bairro\.status$/);
  // Casa vazia: nada acontece além do aviso.
  clickArea(host, 'bairro', 'casa:milho', now);
  assert.equal(engine.state.minis.bairro.visits, 0);
  assert.ok(sounds.includes('erro'));
  // Com a Mandioca morando lá, a visita rende e some o coração até a próxima.
  engine.state.crew.milho = { level: 4 };
  host.draw((now += 40));
  const before = engine.state.cheer ?? 0;
  clickArea(host, 'bairro', 'casa:milho', now);
  assert.equal(engine.state.minis.bairro.visits, 1);
  assert.ok(toasts.some(text => /mini\.bairro\.recado/.test(text)));
  assert.equal(bairro.info().houses.find(house => house.id === 'milho').ready, false);
  // Segunda tentativa: espera.
  clickArea(host, 'bairro', 'casa:milho', now);
  assert.equal(engine.state.minis.bairro.visits, 1);
  for (let i = 0; i < 400; i++) host.draw((now += 33));
  assert.ok(view.probe().particles <= 160);
});

// --- Ajuda (o "?" de cada janela) -----------------------------------------------------------------------------------------
test('ajuda: cada janela tem um "?" que abre o como funciona (nos 3 idiomas, sem {variável} sobrando); clicar ou esconder fecha', () => {
  const I18N = require('../src/i18n.js');
  const ids = data.minis.windows.map(entry => entry.id);
  try {
    for (const lang of I18N.LANGUAGES.map(entry => entry.id)) {
      I18N.setLanguage(lang);
      const { host } = setup(120, { t: (key, vars) => I18N.t(key, vars), minis: Object.fromEntries(ids.map(id => [id, { hidden: false }])) });
      host.restore();
      assert.deepEqual([...host.windows.keys()].sort(), [...ids].sort());
      for (const id of ids) {
        const item = host.windows.get(id);
        assert.equal(item.help.hidden, true, 'a ajuda começa fechada');
        assert.match(item.element.innerHTML, new RegExp(`data-action="mini-ajuda" data-mini="${id}"`), `${id}: botão ?`);
        assert.ok(item.element.innerHTML.includes(`data-action="mini-fechar" data-mini="${id}" aria-label="${I18N.t('mini.hide')}"`),
          `${id} (${lang}): o botão de esconder tem nome acessível traduzido`);
        assert.equal(host.toggleHelp(id), true);
        assert.equal(item.help.hidden, false);
        assert.equal(host.helpOpen(id), true);
        const text = item.helpText.textContent;
        assert.ok(text.length > 120, `${id} (${lang}): texto curto demais`);
        assert.doesNotMatch(text, /\{\w+\}|mini\.help\.|undefined|NaN/, `${id} (${lang}): sobrou variável ou chave: ${text}`);
        assert.match(item.helpTitle.textContent, /^.+: \S+/, 'título: nome da janela e "como funciona"');
        assert.ok(item.helpClose.textContent.length > 5);
        // O fundo do painel não arrasta a janela (o clique é do painel, que fecha).
        const onPanel = { closest: selector => (selector === '.mini' ? item.element : selector === '.ajuda-painel' ? item.help : null), classList: { contains: () => false } };
        assert.equal(host.dragStart(onPanel, { clientX: 5, clientY: 5 }), null);
        host.toggleHelp(id);
        assert.equal(item.help.hidden, true);
        // Esconder a janela também fecha a ajuda.
        host.setHelp(id, true);
        host.close(id);
        assert.equal(item.help.hidden, true);
        assert.equal(host.helpOpen(id), false);
      }
    }
  } finally {
    I18N.setLanguage('pt-BR');
  }
});

// --- Mata Encantada (o auto battler) --------------------------------------------------------------------------------------------
test('fechar a ajuda devolve o teclado ao botão da janela sem selecionar uma janela escondida ou outro campo', () => {
  for (const id of data.minis.windows.map(entry => entry.id)) for (const mode of ['reading', 'elsewhere', 'hidden']) {
    const { host } = setup(120, { minis: { [id]: { hidden: false } } });
    host.restore();
    const document = globalThis.document;
    const item = host.windows.get(id);
    const reader = {};
    const outside = {};
    const focusCalls = [];
    const trigger = { focus(options) { focusCalls.push(options); document.activeElement = trigger; } };
    item.element.querySelector = selector => selector === 'button[data-action="mini-ajuda"]' ? trigger : null;
    item.help.contains = element => element === item.help || element === reader;
    let hidden = true;
    Object.defineProperty(item.help, 'hidden', { get: () => hidden, set(value) {
      hidden = value;
      if (value && item.help.contains(document.activeElement)) document.activeElement = document.body;
    } });
    host.setHelp(id, true);
    document.activeElement = mode === 'elsewhere' ? outside : reader;
    if (mode === 'hidden') host.close(id);
    else host.setHelp(id, false);
    assert.equal(item.help.hidden, true);
    assert.equal(document.activeElement === (mode === 'reading' ? trigger : mode === 'elsewhere' ? outside : document.body), true, id + ': ' + mode);
    assert.equal(focusCalls.length, Number(mode === 'reading'));
    assert.equal(focusCalls[0]?.preventScroll, mode === 'reading' ? true : undefined);
  }
});

test('mata: fechar e reabrir congela a mesma batalha em todas as fases, sem golpes ou prêmios escondidos', () => {
  for (const phase of ['intro', 'fight', 'win', 'lose']) {
    const { host, engine, clock } = setup(60, { minis: { mata: { hidden: false } } });
    host.restore();
    for (const id of Object.keys(engine.state.levels)) engine.state.levels[id] = phase === 'win' ? 200 : 1;
    const mata = engine.mini('mata');
    const tick = () => { clock.t += 50; engine.tick(0.05); };
    tick();
    for (let i = 0; i < 2000 && mata.info().phase !== phase; i++) tick();
    assert.equal(mata.info().phase, phase);
    const snapshot = () => {
      const { hero, enemies, clock, t, phase, seq } = mata.info();
      return structuredClone({ hero, enemies, clock, t, phase, seq, state: engine.state.minis.mata });
    };
    const before = snapshot();
    host.close('mata');
    assert.equal(mata.info().paused, true);
    assert.equal(mata.info().auto, true);
    engine.advance(60);
    clock.t += 30000;
    engine.tick(1);
    mata.tick(10);
    assert.deepEqual(snapshot(), before, `${phase}: vida, efeitos, alvos, relógios e prêmios ficam congelados`);
    host.toggle('mata');
    assert.equal(mata.info().paused, false);
    tick();
    assert.ok(mata.info().clock > before.clock, `${phase}: reabrir retoma sem recuperar o tempo fechado`);
    assert.ok(mata.info().clock < before.clock + 0.1);
  }
});

test('mata: esconder a festa e perder foco pausam imediatamente, e a pausa manual continua ao reabrir', () => {
  let focused = true;
  const { host, engine, settings, clock } = setup(60, { minis: { mata: { hidden: false } }, focused: () => focused });
  host.restore();
  const mata = engine.mini('mata');
  const tick = () => { clock.t += 1000; engine.tick(1); };
  tick();
  const frozen = mata.info().clock;
  settings.hidden = true;
  tick();
  assert.equal(mata.info().clock, frozen);
  assert.equal(mata.info().paused, true);
  settings.hidden = false;
  focused = false;
  tick();
  assert.equal(mata.info().clock, frozen, 'a perda de foco funciona sem precisar redesenhar a janela');
  focused = true;
  tick();
  assert.ok(mata.info().clock > frozen);
  mata.setAuto(false);
  const manuallyPaused = mata.info().clock;
  host.close('mata');
  host.toggle('mata');
  tick();
  assert.equal(mata.info().clock, manuallyPaused);
  assert.equal(mata.info().auto, false, 'reabrir não desfaz a pausa escolhida no botão');
  mata.setAuto(true);
  tick();
  assert.ok(mata.info().clock > manuallyPaused);
});

test('mata: restaurar preferências fechadas mantém a luta parada e trocar de partida desativa o motor anterior', () => {
  const { host, engine, settings, clock } = setup(60, { minis: { mata: { hidden: true } } });
  host.restore();
  engine.tick(1);
  assert.equal(engine.mini('mata').info().hero, null);
  host.toggle('mata');
  engine.tick(1);
  const previousClock = engine.mini('mata').info().clock;
  const next = new GameEngine(data, engine.exportState(), { now: () => clock.t, rng: () => 0.5 });
  host.setEngine(next);
  engine.tick(1);
  assert.equal(engine.mini('mata').info().clock, previousClock, 'a interface nova não mantém a partida velha lutando');
  next.tick(1);
  assert.ok(next.mini('mata').info().clock > 0, 'a partida nova usa a visibilidade da janela restaurada');
  host.close('mata');
  const saved = next.exportState();
  const reopened = new GameEngine(data, saved, { now: () => clock.t, rng: () => 0.5 });
  host.setEngine(reopened);
  reopened.advance(60);
  assert.deepEqual(reopened.state.minis.mata, saved.minis.mata);
  assert.equal(reopened.mini('mata').info().hero, null);
  assert.equal(settings.minis.mata.hidden, true);
});

test('mata: clicar na criatura que está entrando seleciona o desenho, sem alvo no espaço vazio', () => {
  const { host, engine } = setup(60, { minis: { mata: { hidden: false } } });
  const meta = bundle.janelas.mata;
  const draws = [];
  const healthBars = [];
  const createElement = document.createElement;
  document.createElement = tag => {
    const element = createElement(tag);
    if (tag === 'canvas') {
      const g = element.getContext('2d');
      const drawImage = g.drawImage;
      const fillRect = g.fillRect;
      g.drawImage = (...args) => {
        if (args[0].value === bundle.images[meta.comuns.image]) draws.push(args);
        drawImage(...args);
      };
      g.fillRect = (...args) => {
        if (args[2] === 22 && args[3] === 5) healthBars.push(args);
        fillRect(...args);
      };
      element.getContext = () => g;
    }
    return element;
  };
  try { host.restore(); } finally { document.createElement = createElement; }
  const item = host.windows.get('mata');
  const mata = engine.mini('mata');
  engine.tick(0.6);
  assert.equal(mata.info().phase, 'intro');
  host.draw(1000);
  assert.equal(draws.length, 1, 'a primeira batalha tem uma criatura visível');
  const [, , , , , x, y, w, h] = draws[0];
  const probe = item.view.probe();
  const rect = item.canvas.getBoundingClientRect();
  const point = { clientX: rect.left + (x + w / 2) * rect.width / probe.size.width,
    clientY: rect.top + (y + h / 2) * rect.height / probe.size.height };
  const foe = mata.info().enemies[0];
  assert.equal(item.view.hit(point.clientX, point.clientY)?.id, `foe:${foe.uid}`, 'a área acompanha a posição desenhada durante a entrada');
  item.view.click(point.clientX, point.clientY, 1000);
  assert.equal(mata.info().enemies[0].focus, true, 'clicar no desenho escolhe a criatura');
  const area = item.view.probe().areas.find(entry => entry.id === `foe:${foe.uid}`);
  assert.equal(area.x, x, 'o alvo não fica parado na posição de chegada');
  assert.equal(healthBars.length, 1);
  assert.equal(healthBars[0][0] + healthBars[0][2] / 2, x + w / 2, 'a barra de vida acompanha a criatura');
});

test('mata: a janela desenha a batalha e a lista de itens, e responde aos cliques (etapa, pausa, bichinho, alvo e itens)', () => {
  const { host, engine, sounds, toasts } = setup(60, { minis: { mata: { hidden: false } } });
  host.restore();
  const view = host.windows.get('mata').view;
  const mata = engine.mini('mata');
  const s = engine.state.minis.mata;
  let now = 1000;
  const frame = (ticks = 1) => { for (let i = 0; i < ticks; i++) { engine.tick(0.05); host.draw((now += 40)); } };
  frame();
  let areas = view.probe().areas.map(area => area.id);
  for (const id of ['hero', 'prev', 'next', 'dots', 'auto', 'stats', 'mood', 'pet']) assert.ok(areas.includes(id), `área ${id}`);
  assert.equal(areas.filter(id => id.startsWith('item:')).length, data.minis.mata.unlocks.length, 'um quadradinho por item');
  assert.match(view.status(engine), /^mini\.mata\.statusStage · mini\.mata\.statusBattle$/);
  // As criaturas entram e viram áreas clicáveis (a Mandioca bate nelas).
  frame(40);
  areas = view.probe().areas.map(area => area.id);
  const foes = areas.filter(id => id.startsWith('foe:'));
  assert.ok(foes.length >= 1, 'criatura na cena');
  clickArea(host, 'mata', foes[0], now);
  assert.ok(sounds.includes('clique'));
  // Pausa e volta.
  clickArea(host, 'mata', 'auto', now);
  assert.equal(s.auto, false);
  assert.match(view.status(engine), /mini\.mata\.paused$/);
  clickArea(host, 'mata', 'auto', now);
  assert.equal(s.auto, true);
  // As setas: sem recorde não passa da etapa 1 (som de erro); com recorde, vai.
  sounds.length = 0;
  clickArea(host, 'mata', 'next', now);
  assert.equal(s.stage, 1);
  assert.ok(sounds.includes('erro'));
  s.best = 3;
  clickArea(host, 'mata', 'next', now);
  assert.equal(s.stage, 2);
  clickArea(host, 'mata', 'prev', now);
  assert.equal(s.stage, 1);
  // O bichinho: clicar escolhe quem acompanha (e o bônus aparece no status).
  assert.equal(s.companion, '');
  clickArea(host, 'mata', 'pet', now);
  assert.equal(s.companion, mata.info().pets[0].id);
  frame(5);
  assert.ok(view.probe().areas.some(area => area.id === 'pet-arena'), 'o bichinho aparece na batalha');
  // Clicar num item da lista avisa o que ele pede.
  toasts.length = 0;
  clickArea(host, 'mata', `item:${data.minis.mata.unlocks[0].item}`, now);
  assert.ok(toasts.some(text => /mini\.mata\.itemLocked/.test(text)));
  // Vários quadros de batalha seguidos não estouram nada (partículas, números e ícones têm limite).
  engine.state.levels.folego = 200;
  frame(600);
  assert.ok(view.probe().particles <= 160 && view.probe().floaters <= 12 && view.probe().says <= 8);
});

test('mata: a vitória sobre o chefe mostra o cartaz e a lista de itens passa a mostrar o troféu como da Mandioca', () => {
  const { host, engine, sounds } = setup(60, { minis: { mata: { hidden: false } } });
  host.restore();
  for (const id of Object.keys(engine.state.levels)) engine.state.levels[id] = 300;
  let now = 1000;
  for (let i = 0; i < 1500 && engine.state.minis.mata.best < 1; i++) { engine.tick(0.1); host.draw((now += 40)); }
  assert.ok(engine.state.minis.mata.best >= 1);
  host.draw((now += 40));
  assert.ok(sounds.includes('mata-vitoria'));
  const view = host.windows.get('mata').view;
  assert.ok(view.probe().banner, 'o cartaz de vitória');
  assert.equal(engine.mini('mata').info().unlocks[0].owned, true);
});

test('mata: perder para o chefe mantém seu nome e a identificação da batalha durante o desmaio', () => {
  const { host, engine, clock } = setup(60, { minis: { mata: { hidden: false } } });
  host.restore();
  for (const id of Object.keys(engine.state.levels)) engine.state.levels[id] = 30;
  const mata = engine.mini('mata');
  for (let i = 0; i < 4000 && mata.info().phase !== 'lose'; i++) {
    clock.t += 50;
    engine.tick(0.05);
  }
  assert.equal(mata.info().phase, 'lose');
  const boss = mata.info().enemies.find(enemy => enemy.boss);
  assert.ok(boss, 'a derrota aconteceu na batalha do chefe');
  const view = host.windows.get('mata').view;
  assert.match(view.status(engine), /mini\.mata\.statusBoss$/, 'a janela identifica a luta que ainda está desenhando');
  const labels = [];
  const pixelText = globalThis.ArraiaFesta.pixelText;
  globalThis.ArraiaFesta.pixelText = (g, value, ...args) => { labels.push(value); pixelText(g, value, ...args); };
  try { host.draw(1000); } finally { globalThis.ArraiaFesta.pixelText = pixelText; }
  assert.ok(labels.includes(data.minis.mata.bosses.find(entry => entry.id === boss.id).name), 'o nome permanece embaixo da criatura');
});

test('mata: o painel traz textos nos 3 idiomas (criaturas, golpes e dicas) e o desenho aguenta cada cenário e cada criatura', () => {
  const I18N = require('../src/i18n.js');
  const sheet = bundle.janelas.mata;
  assert.equal(sheet.fundos.frames, 10, 'um cenário por etapa da lista');
  for (const creature of data.minis.mata.creatures.concat(data.minis.mata.bosses)) assert.ok(creature.lore && creature.lore.length > 30, `${creature.id}: história do folclore`);
  assert.equal(sheet.comuns.ids.length, data.minis.mata.creatures.length);
  assert.equal(sheet.chefes.ids.length, data.minis.mata.bosses.length);
  assert.equal(sheet.comuns.frames, sheet.comuns.ids.length * 2, 'dois quadros por criatura');
  for (const creature of data.minis.mata.creatures) assert.ok(sheet.comuns.ids.includes(creature.id), creature.id);
  for (const boss of data.minis.mata.bosses) assert.ok(sheet.chefes.ids.includes(boss.id), boss.id);
  for (const icon of ['coracao', 'milho', 'espada', 'cruz', 'escudo', 'raio', 'pata', 'play', 'pausa', 'esq', 'dir', 'caveira', 'queima', 'veneno', 'tontura', 'lento', 'fraqueza', 'confusao', 'investida', 'cura', 'alvo', 'enrage']) {
    assert.ok(sheet.ui.ids.includes(icon), `ícone ${icon}`);
  }
  try {
    for (const lang of I18N.LANGUAGES.map(entry => entry.id)) {
      I18N.setLanguage(lang);
      const powers = new Set(data.minis.mata.creatures.concat(data.minis.mata.bosses).flatMap(creature => creature.powers.map(power => power.kind)));
      for (const kind of powers) {
        const text = I18N.t(`mini.mata.power.${kind}`, { every: 3, dur: 4, mult: 2, share: 25, pct: 50 });
        assert.doesNotMatch(text, /\{\w+\}|mini\.mata/, `${lang}: golpe ${kind}: ${text}`);
      }
      for (const key of ['stage', 'best', 'next', 'allDone', 'miss', 'boss', 'victory', 'defeat', 'revive', 'itemOwned', 'petNone', 'petEmpty', 'tipFocus', 'tipPause', 'tipPlay']) {
        assert.notEqual(I18N.t(`mini.mata.${key}`, { n: 1, name: 'x', stage: 1 }), `mini.mata.${key}`, `${lang}: falta mini.mata.${key}`);
      }
      // Nomes dos chefes, das criaturas e das etapas existem no idioma (o jogo troca os dados no lugar).
      const copy = JSON.parse(JSON.stringify(data));
      I18N.localizeData(copy, lang);
      if (lang !== 'pt-BR') {
        assert.equal(copy.minis.mata.bosses.find(boss => boss.id === 'mula-sem-cabeca').name === data.minis.mata.bosses.find(boss => boss.id === 'mula-sem-cabeca').name, false, `${lang}: Mula traduzida`);
        assert.ok(copy.minis.mata.bosses.concat(copy.minis.mata.creatures).every((creature, i) => creature.lore && creature.lore !== data.minis.mata.bosses.concat(data.minis.mata.creatures)[i].lore), `${lang}: histórias traduzidas`);
        assert.ok(copy.minis.mata.stages.filter((stage, i) => stage.name !== data.minis.mata.stages[i].name).length >= 8, `${lang}: etapas traduzidas`);
        assert.equal(copy.minis.mata.creatures.filter((creature, i) => creature.name !== data.minis.mata.creatures[i].name).length >= 7, true, `${lang}: criaturas`);
      }
    }
  } finally {
    I18N.setLanguage('pt-BR');
  }
  // Cada cenário (etapas 1 a 11, que dá a volta) e cada chefe aparecem sem erro.
  const { host, engine } = setup(60, { minis: { mata: { hidden: false } } });
  host.restore();
  const s = engine.state.minis.mata;
  s.best = 40;
  let now = 1000;
  for (let stage = 1; stage <= 11; stage++) {
    engine.mini('mata').select(stage);
    s.battle = data.minis.mata.battles;
    for (let i = 0; i < 40; i++) { engine.tick(0.1); host.draw((now += 40)); }
    assert.ok(host.windows.get('mata').view.probe().areas.some(area => area.id.startsWith('foe:')), `etapa ${stage}: chefe na cena`);
  }
});

test('reset após ano novo invalida a Horta e a Mata antigas antes do próximo quadro', () => {
  const { host, engine, settings, clock } = setup(200, { minis: {
    horta: { hidden: false, dx: -200, dy: 110 }, mata: { hidden: false }, cordel: { hidden: true, dx: 25, dy: 30 }
  } });
  host.restore();
  assert.equal(engine.mini('horta').plant(0).ok, true);
  clock.t = engine.state.minis.horta.plots[0].readyAt;
  host.draw(1000);
  clickArea(host, 'mata', 'auto', 1000);
  host.draw(1040);
  assert.equal(engine.mini('horta').info().plots[0].ready, true, 'o canteiro antigo aparece pronto para colher');
  assert.equal(engine.mini('mata').info().auto, false, 'a Mata antiga mostra o botão de retomar');
  const prefs = structuredClone(settings.minis);
  const items = host.items().map(({ id, visible }) => ({ id, visible }));
  const old = ['horta', 'mata'].map(id => {
    const item = host.windows.get(id);
    const areaId = id === 'horta' ? 'plot:0' : 'auto';
    const { areas, size } = item.view.probe();
    const area = areas.find(entry => entry.id === areaId);
    const rect = item.canvas.getBoundingClientRect();
    const event = { clientX: rect.left + (area.x + area.w / 2) * rect.width / size.width,
      clientY: rect.top + (area.y + area.h / 2) * rect.height / size.height };
    item.canvas.closest = selector => selector === '.mini' ? item.element : null;
    const drag = host.dragStart(item.canvas, event);
    assert.equal(drag.found.id, areaId);
    return { id, item, event, drag, left: item.element.style.left, bottom: item.element.style.bottom };
  });

  assert.equal(engine.newYear(), true);
  host.reset();
  for (const { id, item, event, drag, left, bottom } of old) {
    const current = host.windows.get(id);
    assert.notEqual(current, item, `${id}: a cena antiga saiu antes do quadro`);
    assert.deepEqual(current.view.probe().areas, [], `${id}: nada antigo ficou clicável`);
    assert.equal(current.element.style.left, left);
    assert.equal(current.element.style.bottom, bottom);
    assert.ok(!document.body.children.includes(item.element));
    host.dragEnd(drag, 1041);
    assert.equal(current.view.click(event.clientX, event.clientY, 1041), false, 'a cena nova aguarda seu primeiro desenho');
  }
  assert.equal(engine.mini('horta').info().plots[0].crop, null, 'soltar a colheita antiga não planta no ano novo');
  assert.equal(engine.mini('mata').info().auto, true, 'soltar o botão Play antigo não pausa a luta nova');
  assert.deepEqual(settings.minis, prefs);
  assert.deepEqual(host.items().map(({ id, visible }) => ({ id, visible })), items);

  const currentHorta = host.windows.get('horta');
  host.reset();
  assert.equal(host.windows.get('horta'), currentHorta, 'repetir reset no mesmo estado conserva a cena nova');
  host.onEvents(engine.drainEvents(), 1042);
  assert.deepEqual(settings.minis, prefs, 'reset repetido e evento do ano novo preservam as preferências');
  assert.deepEqual(host.items().map(({ id, visible }) => ({ id, visible })), items);
  host.draw(1080);
  clickArea(host, 'horta', 'plot:0', 1080);
  clickArea(host, 'mata', 'auto', 1080);
  assert.equal(engine.mini('horta').info().plots[0].crop, 'milho', 'a cena recém-desenhada volta a plantar');
  assert.equal(engine.mini('mata').info().auto, false, 'o botão de pausar novo funciona');
});

test('ano novo limpa os efeitos das janelas e preserva visibilidade e posição', () => {
  const { host, engine, settings, sounds } = setup(100, { minis: {
    ceu: { hidden: false, dx: -200, dy: 110 }, mata: { hidden: false }, cordel: { hidden: true, dx: 25, dy: 30 }
  } });
  host.restore();
  let now = 1000;
  host.draw(now);
  for (let i = 0; i < data.minis.ceu.volley; i++) clickArea(host, 'ceu', 'ceu', now);
  assert.equal(engine.state.minis.ceu.finales, 1, 'a Grande Final deixou foguetes agendados');
  assert.equal(host.probe().ceu.shells, data.minis.ceu.volley);
  engine.state.minis.mata.best = 1;
  clickArea(host, 'mata', 'next', now);
  assert.ok(host.probe().mata.banner, 'a troca de etapa mostra uma mensagem');
  const prefs = structuredClone(settings.minis);
  const { left, bottom } = host.windows.get('ceu').element.style;
  const oldElements = [...host.windows.values()].map(item => item.element);

  assert.equal(engine.newYear(), true);
  host.onEvents(engine.drainEvents(), now);
  assert.equal(host.probe().mata.banner, null, 'a mensagem da batalha antiga foi apagada');
  sounds.length = 0;
  for (let i = 0; i < 80; i++) host.draw((now += 40));
  assert.equal(host.probe().ceu.shells, 0, 'não sobe nenhum foguete do ano anterior');
  assert.equal(host.probe().ceu.sparks, 0, 'não sobram explosões do ano anterior');
  assert.ok(!sounds.includes('estalo'), 'o show cancelado não estoura no ano seguinte');
  assert.deepEqual(settings.minis, prefs);
  assert.equal(host.windows.get('ceu').element.style.left, left);
  assert.equal(host.windows.get('ceu').element.style.bottom, bottom);
  assert.equal(host.visible('ceu'), true);
  assert.equal(host.visible('mata'), true);
  assert.equal(host.visible('cordel'), false);
  assert.ok(oldElements.every(element => !document.body.children.includes(element)), 'as janelas antigas foram removidas do DOM');
});

test('ano novo descarta os eventos anteriores do lote e entrega os posteriores às janelas', () => {
  const { host, engine, clock, sounds, toasts } = setup(11, { minis: {
    bichos: { hidden: true }, ceu: { hidden: false }
  } });
  engine.state.cheer = 1e15;
  while (engine.state.size < 100) engine.addFame(engine.fameNeed() - engine.state.fame);
  host.restore();
  engine.state.minis.ceu.starAt = clock.t - 1;
  engine.tick(0.1);
  assert.ok(engine.state.minis.ceu.star, 'o ano antigo tem uma estrela ainda não avisada');
  assert.equal(engine.newYear(), true);
  host.reset();
  assert.equal(host.setHelp('ceu', true), true, 'a ajuda já pode abrir no ano novo antes do quadro');
  const currentCeu = host.windows.get('ceu');
  engine.tick(0.1);
  clock.t = engine.state.minis.ceu.starAt;
  engine.tick(0.1);
  const batch = engine.drainEvents();
  assert.equal(batch.filter(event => event.kind === 'star').length, 2, 'há uma estrela de cada ano no lote');
  host.onEvents(batch, 1000);
  assert.equal(host.windows.get('ceu'), currentCeu, 'o evento não recria a janela que já está no ano atual');
  assert.equal(host.helpOpen('ceu'), true, 'a ajuda aberta depois do reset não se perde no primeiro quadro');
  assert.equal(host.visible('bichos'), false, 'a abertura antiga não desfaz a preferência de esconder');
  assert.equal(toasts.filter(text => text === 'mini.opened').length, 0, 'não avisa as aberturas antigas');
  assert.equal(toasts.filter(text => text === 'mini.ceu.starToast').length, 1, 'avisa apenas a estrela do ano atual');
  assert.equal(sounds.filter(sound => sound === 'aviso').length, 1);
});

test('reiniciar ou importar a festa troca o motor das janelas: os botões e as janelas do jogo velho somem e os do novo valem', () => {
  const { host, engine, clock } = setup(80, { minis: { bichos: { hidden: false }, mata: { hidden: false } } });
  host.restore();
  assert.equal(host.items().length, data.minis.windows.length, 'jogo velho: todas abertas');
  assert.equal(host.windows.size, 2);
  const fresh = new GameEngine(data, null, { rng: () => 0.5, now: () => clock.t });
  host.setEngine(fresh);
  assert.deepEqual(host.items(), [], 'festa nova: nenhum botão na placa');
  assert.equal(host.windows.size, 0, 'e nenhuma janela na tela');
  assert.equal(host.signature(), '');
  // O jogo velho já não manda: crescer ele não abre nada, crescer o novo abre.
  engine.state.records.size = 200;
  assert.deepEqual(host.items(), []);
  fresh.state.size = 12;
  fresh.state.records.size = 12;
  assert.deepEqual(host.items().map(item => item.id), ['cordel', 'bichos']);
  host.restore();
  assert.deepEqual([...host.windows.keys()], ['bichos']);
  for (let i = 0, now = 1000; i < 20; i++) host.draw((now += 40));
  // Importar outra festa: as janelas dela (as que ela já abriu) aparecem.
  const imported = new GameEngine(data, null, { rng: () => 0.5, now: () => clock.t });
  imported.state.size = 60;
  imported.state.records.size = 60;
  host.setEngine(imported);
  assert.equal(host.items().length, data.minis.windows.filter(entry => entry.start <= 60).length);
  assert.deepEqual([...host.windows.keys()], ['bichos', 'mata'], 'só voltam na tela as que a pessoa deixou abertas e a festa nova já abriu');
  host.setEngine(imported);
  assert.equal(host.windows.size, 2, 'o mesmo motor de novo não mexe em nada');
});

// --- Cordel da Mandioca (a janela da história) ------------------------------------------------------------------------------------------
test('cordel: a janela desenha a página e as bolinhas, vira só as páginas liberadas e completa a página clicando na coisa dela', () => {
  const { host, engine, sounds } = setup(35, { minis: { cordel: { hidden: false } } });
  host.restore();
  const view = host.windows.get('cordel').view;
  const cordel = engine.mini('cordel');
  let now = 1000;
  const frame = (n = 1) => { for (let i = 0; i < n; i++) host.draw((now += 40)); };
  frame();
  const areas = () => view.probe().areas.map(area => area.id);
  for (const id of ['prev', 'next', 'ponto']) assert.ok(areas().includes(id), `área ${id}`);
  assert.equal(areas().filter(id => id.startsWith('pagina:')).length, 20, 'uma bolinha por página');
  assert.match(view.status(engine), /^mini\.cordel\.statusPage · O Quintal ao Amanhecer$/);
  // As setas viram a página (com a página deslizando) e a bolinha trancada diz que não abre.
  clickArea(host, 'cordel', 'next', now);
  assert.equal(cordel.info().page, 2);
  assert.ok(sounds.includes('clique'));
  frame(2);
  assert.equal(view.probe().turning, true, 'a página está deslizando');
  frame(14);
  assert.equal(view.probe().turning, false);
  assert.match(view.status(engine), /O Convite do Vento$/);
  sounds.length = 0;
  clickArea(host, 'cordel', 'pagina:5', now);
  assert.equal(cordel.info().page, 2, 'a página 5 ainda está trancada');
  assert.ok(sounds.includes('erro'));
  clickArea(host, 'cordel', 'pagina:3', now);
  assert.equal(cordel.info().page, 3);
  frame(16);
  clickArea(host, 'cordel', 'next', now);
  assert.equal(cordel.info().page, 3, 'depois da última liberada não passa');
  clickArea(host, 'cordel', 'pagina:1', now);
  frame(16);
  assert.equal(view.probe().shown, 1);
  // Clicar na coisa da página: reação, fala, som e, no último clique, a página completa.
  const goal = data.minis.cordel.pages[0].goal;
  const cheer0 = engine.state.cheer;
  sounds.length = 0;
  for (let i = 0; i < goal; i++) {
    clickArea(host, 'cordel', 'ponto', now);
    frame(2);
    assert.equal(view.probe().reacting, true);
  }
  assert.ok(sounds.includes(data.minis.cordel.pages[0].sound));
  assert.ok(sounds.includes('conquista'), 'a página completa soa');
  assert.equal(engine.state.minis.cordel.done.quintal, true);
  assert.ok(engine.state.cheer > cheer0);
  assert.ok(view.probe().says >= 1);
});

test('cordel: clicar antes do quadro da virada não aplica o ponto da página antiga à nova', () => {
  for (const navigation of ['next', 'pagina:2']) {
    const { host, engine } = setup(35, { minis: { cordel: { hidden: false } } });
    host.restore();
    host.draw(1000);
    clickArea(host, 'cordel', navigation, 1000);
    assert.equal(engine.mini('cordel').info().page, 2);
    assert.equal(host.probe().cordel.shown, 1, 'a arte antiga ainda está na tela');
    clickArea(host, 'cordel', 'ponto', 1001);
    assert.equal(engine.mini('cordel').info().list[1].clicks, 0, 'a página nova não foi clicada pelo ponto antigo');
    for (let now = 1040; now <= 1400; now += 40) host.draw(now);
    clickArea(host, 'cordel', 'ponto', 1400);
    assert.equal(engine.mini('cordel').info().list[1].clicks, 1, 'o novo ponto funciona depois da virada');
  }
});

test('cordel: as 20 páginas aparecem sem erro (arte, turma e Mandioca) e a arte tem tudo o que o jogo precisa', () => {
  const sheet = bundle.janelas.cordel;
  assert.equal(sheet.paginas.length, 20);
  for (const [i, page] of sheet.paginas.entries()) {
    const id = data.minis.cordel.pages[i].id;
    assert.equal(page.frames, 8, `${id}: 4 quadros do laço e 4 da reação`);
    assert.ok(page.w === 224 && page.h === 112, `${id}: 224 x 112`);
    const [hx, hy, stage] = page.heroi;
    assert.ok(hx > 10 && hx < 214 && hy > 60 && hy <= 112 && stage >= 0 && stage <= 3, `${id}: onde a Mandioca fica`);
    const [x, y, w, h] = page.ponto;
    assert.ok(x >= 0 && y >= 0 && w > 10 && h > 10 && x + w <= 224 && y + h <= 112, `${id}: o ponto de clique está dentro da cena`);
    assert.ok(['danca', 'descanso', 'comemora'].includes(page.pose));
    for (const entry of page.elenco) assert.ok(bundle.chars[entry.id], `${id}: ${entry.id} é da turma`);
  }
  for (const icon of ['esq', 'dir', 'estrela', 'seta', 'cadeado', 'ponto', 'ponto-cheio']) assert.ok(sheet.ui.ids.includes(icon), `ícone ${icon}`);
  assert.ok(bundle.icons['ui:cordel'], 'o botão da placa');
  // Todas as páginas, com a festa grande o bastante para abrir todas, vestindo coisas diferentes.
  const { host, engine } = setup(200, { minis: { cordel: { hidden: false } } });
  host.restore();
  let now = 1000;
  for (let n = 1; n <= 20; n++) {
    engine.mini('cordel').go(n);
    for (let i = 0; i < 30; i++) host.draw((now += 40));
    assert.equal(host.windows.get('cordel').view.probe().shown, n, `página ${n} na tela`);
  }
  assert.equal(engine.mini('cordel').info().page, 20);
});

test('cordel: os versos cabem na fonte de pixel nos 3 idiomas e ninguém fica sem texto', () => {
  const I18N = require('../src/i18n.js');
  const stripped = text => String(text).replace(/[’'`¡¿]/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '');
  try {
    for (const lang of I18N.LANGUAGES.map(entry => entry.id)) {
      I18N.setLanguage(lang);
      const copy = JSON.parse(JSON.stringify(data));
      I18N.localizeData(copy, lang);
      copy.minis.cordel.pages.forEach((page, i) => {
        const original = data.minis.cordel.pages[i];
        const lines = page.text.split('\n');
        assert.equal(lines.length, 4, `${lang} ${page.id}: quatro versos`);
        for (const line of lines) {
          assert.ok(line.length <= 52, `${lang} ${page.id}: verso comprido (${line.length}): ${line}`);
          assert.match(stripped(line), /^[A-Za-z0-9 .,:!?{}\-]+$/, `${lang} ${page.id}: letra que a fonte de pixel não tem: ${line}`);
        }
        for (const field of ['say', 'done']) assert.match(stripped(page[field]), /^[A-Za-z0-9 .,:!?\-]+$/, `${lang} ${page.id}.${field}: ${page[field]}`);
        assert.ok(page.title.length > 3 && page.hint.length > 10);
        if (lang !== 'pt-BR') {
          assert.notEqual(page.title, original.title, `${lang} ${page.id}: título traduzido`);
          assert.notEqual(page.text, original.text, `${lang} ${page.id}: versos traduzidos`);
          assert.notEqual(page.hint, original.hint, `${lang} ${page.id}: dica traduzida`);
        }
      });
      for (const key of ['statusPage', 'tipPrev', 'tipNext', 'tipEnd', 'tipDone', 'locked', 'newPage', 'pageDone', 'tipClicks']) {
        assert.notEqual(I18N.t(`mini.cordel.${key}`, { n: 1, m: 2, title: 'x', guests: 10 }), `mini.cordel.${key}`, `${lang}: falta mini.cordel.${key}`);
      }
      assert.ok(copy.minis.windows.find(entry => entry.id === 'cordel').name.length > 5);
    }
  } finally {
    I18N.setLanguage('pt-BR');
  }
});

test('cordel: o botão da placa leva o número de páginas por completar e a placa se redesenha quando ele muda', () => {
  const { host, engine } = setup(35, { minis: { cordel: { hidden: false } } });
  host.restore();
  const entry = () => host.items().find(item => item.id === 'cordel');
  assert.equal(entry().pending, 3);
  assert.equal(host.items().find(item => item.id === 'bichos').pending, 0, 'janela sem pendência não pisca');
  const before = host.signature();
  for (let i = 0; i < data.minis.cordel.pages[0].goal; i++) engine.mini('cordel').poke(1);
  assert.equal(entry().pending, 2);
  assert.notEqual(host.signature(), before, 'a placa precisa se redesenhar');
  engine.state.records.size = 55;
  assert.equal(entry().pending, 4);
});

test('fogueira: a comida no espeto é desenhada por cima do fogo (não fica escondida atrás das chamas)', () => {
  const { host, engine } = setup(40, { minis: { fogueira: { hidden: false } } });
  const real = globalThis.document.createElement;
  const order = [];
  globalThis.document.createElement = tag => {
    const element = real(tag);
    if (tag === 'canvas') {
      const getContext = element.getContext;
      element.getContext = () => ({ ...getContext(), drawImage(image) { order.push(image.value); } });
    }
    return element;
  };
  try {
    host.restore();
    engine.state.minis.fogueira.heat = data.minis.fogueira.heatMax;
    engine.mini('fogueira').put(0, 'milho');
    host.draw(1000);
    host.draw(1100);
  } finally {
    globalThis.document.createElement = real;
  }
  const fire = bundle.images[bundle.fires['4'].image];
  const food = bundle.images[bundle.janelas.fogueira.comidas.image];
  assert.ok(order.includes(fire) && order.includes(food), 'o fogo e a comida foram desenhados');
  assert.ok(order.indexOf(fire) < order.indexOf(food), 'a comida vem depois (por cima) do fogo');
});

test('palco: as teclas 1, 2 e 3 marcam as pistas como o clique, só com o show rolando e a janela à vista', () => {
  const { host, engine, sounds, clock } = setup(40, { minis: { palco: { hidden: false } } });
  host.restore();
  const view = host.windows.get('palco').view;
  const palco = engine.mini('palco');
  let now = 1000;
  host.draw((now += 40));
  assert.equal(host.key('1', now), false, 'no menu a tecla não faz nada');
  assert.equal(host.key('x', now), false, 'outras teclas nunca valem');
  clickArea(host, 'palco', 'musica:xote', now);
  assert.equal(host.key('1', now), false, 'o show só vale para a tecla depois de desenhado (como o clique)');
  host.draw((now += 40));
  const startAt = engine.state.minis.palco.show.startAt;
  const notes = palco.chart('xote');
  // Toca a música toda só nas teclas: cada tecla é a pista da esquerda para a direita.
  for (const note of notes) {
    clock.t = startAt + note.t;
    host.draw((now += 40));
    assert.equal(host.key(String(note.lane + 1), now), true);
  }
  assert.ok(sounds.includes('palco-triangulo') && sounds.includes('palco-zabumba') && sounds.includes('palco-sanfona'), 'cada tecla toca o som da pista');
  assert.equal(engine.state.minis.palco.show.maxCombo, notes.length, 'todas as notas acertadas só com o teclado');
  assert.equal(host.key('4', now), false);
  assert.equal(host.key('0', now), false);
  // Fora de hora a tecla é usada mas erra, como o clique.
  const before = sounds.length;
  assert.equal(host.key('1', now), true);
  assert.equal(sounds[before], 'errou');
  assert.equal(engine.state.minis.palco.show.combo, notes.length, 'o combo só zera quando a nota passa, não no erro de clique');
  // Ajuda aberta ou janela escondida: a tecla fica para o resto do jogo.
  host.setHelp('palco', true);
  assert.equal(host.key('2', now), false, 'com a ajuda aberta a tecla não vale');
  host.setHelp('palco', false);
  host.close('palco');
  assert.equal(host.key('2', now), false, 'janela escondida não recebe tecla');
  host.setHidden('palco', false);
  host.draw((now += 40));
  // Acaba o show: o resultado aparece e as teclas não o fecham (quem segue tocando não perde o resultado).
  clock.t = startAt + notes[notes.length - 1].t + 5000;
  engine.tick(1);
  host.onEvents(engine.drainEvents(), now);
  host.draw((now += 40));
  assert.ok(palco.info().last);
  assert.equal(host.key('1', now), false);
  assert.equal(host.key('2', now), false);
  assert.ok(palco.info().last, 'o resultado continua na tela');
  assert.ok(view.probe().areas.some(area => area.id === 'resultado'));
});

test('horta: a regadora, a cesta e a pá da prateleira regam, colhem e plantam tudo; o combo e a sorte aparecem; o quadro e os bichos reagem ao clique', () => {
  const { host, engine, sounds, toasts, clock } = setup(90, { minis: { horta: { hidden: false } } });
  host.restore();
  const view = host.windows.get('horta').view;
  const horta = engine.mini('horta');
  engine.state.minis.horta.crowAt = clock.t + 1e9;
  engine.state.minis.horta.butterflyAt = clock.t + 1e9;
  let now = 1000;
  engine.tick(1);
  host.draw((now += 40));
  const areas = view.probe().areas.map(area => area.id);
  for (const id of ['regadora', 'cesta', 'pa', 'nota:0', 'nota:1', 'galinha', 'espantalho']) assert.ok(areas.includes(id), `${id} (tem ${areas.join(',')})`);
  // A pá planta a semente escolhida em todos os canteiros livres.
  clickArea(host, 'horta', 'semente:milho', now);
  clickArea(host, 'horta', 'pa', now);
  assert.equal(horta.info().empty, 0);
  assert.ok(sounds.includes('pulo'));
  sounds.length = 0;
  clickArea(host, 'horta', 'pa', now);
  assert.ok(sounds.includes('erro'), 'sem canteiro livre a pá avisa');
  // A regadora rega tudo (5 cargas) e depois avisa que está vazia.
  clickArea(host, 'horta', 'regadora', now);
  assert.equal(horta.info().water, 0);
  assert.equal(engine.state.minis.horta.plots.filter(plot => plot.waters > 0).length, 5);
  sounds.length = 0;
  clickArea(host, 'horta', 'regadora', now);
  assert.ok(sounds.includes('erro'), 'regadora vazia avisa');
  // A cesta colhe tudo o que está no ponto; as colheitas seguidas viram combo, e os pedidos entregues avisam.
  sounds.length = 0;
  clickArea(host, 'horta', 'cesta', now);
  assert.ok(sounds.includes('erro'), 'sem nada pronto a cesta avisa');
  for (const plot of engine.state.minis.horta.plots) plot.readyAt = clock.t;
  engine.state.minis.horta.orders = [{ crop: 'milho', n: 3, have: 0 }];
  engine.state.minis.horta.plots[2].luck = 'dourada';
  host.draw((now += 40));
  assert.equal(horta.info().ready, 10);
  sounds.length = 0;
  clickArea(host, 'horta', 'cesta', now);
  assert.equal(horta.info().ready, 0, 'tudo colhido de uma vez');
  assert.equal(engine.state.minis.horta.harvests, 10);
  assert.ok(sounds.includes('conquista'), 'combo grande e encomenda entregue tocam a fanfarra');
  assert.ok(toasts.some(text => /mini\.horta\.orderToast/.test(text)), 'a encomenda entregue avisa');
  assert.equal(horta.info().combo.n, 5);
  for (let i = 0; i < 40; i++) host.draw((now += 40));
  // O quadro de encomendas, a galinha e o espantalho respondem ao clique sem estragar nada.
  sounds.length = 0;
  clickArea(host, 'horta', 'nota:0', now);
  assert.ok(sounds.includes('clique'));
  clickArea(host, 'horta', 'galinha', now);
  assert.ok(sounds.includes('galinha'));
  clickArea(host, 'horta', 'espantalho', now);
  assert.ok(sounds.includes('crianca'));
  // O moinho (nas pás, sem região) gira mais depressa.
  const item = host.windows.get('horta');
  const rect = item.canvas.getBoundingClientRect();
  const probe = view.probe();
  const mill = bundle.janelas.horta.moinho;
  sounds.length = 0;
  view.click(rect.left + mill.x * rect.width / probe.size.width, rect.top + (mill.y - 4) * rect.height / probe.size.height, now);
  assert.ok(sounds.includes('clique'), 'clicar nas pás do moinho');
});

test('horta: a borboleta dourada, a chuva, a sorte e as amigas desenham sem erro e a borboleta pega no clique', () => {
  const { host, engine, sounds, toasts, clock } = setup(80, { minis: { horta: { hidden: false } } });
  host.restore();
  const view = host.windows.get('horta').view;
  const horta = engine.mini('horta');
  engine.state.minis.horta.crowAt = clock.t + 1e9;
  let now = 1000;
  const ids = ['milho', 'abobora', 'mandioca', 'batata-doce', 'amendoim'];
  ids.forEach((id, i) => horta.plant(i, id));
  engine.state.minis.horta.plots[0].luck = 'dobro';
  engine.state.minis.horta.plots[1].luck = 'dourada';
  engine.state.weather.rain = { born: clock.t, until: clock.t + 120000 };
  engine.state.minis.horta.butterfly = { born: clock.t, until: clock.t + 14000, seed: 14 };
  for (let i = 0; i < 60; i++) host.draw((now += 40));
  assert.ok(view.probe().areas.some(area => area.id === 'borboleta'), 'a borboleta dourada tem região para clicar');
  // O clique na borboleta (a região segue o voo): pega, adianta a planta e solta os brilhos.
  sounds.length = 0;
  const slow = horta.info().plots[1].remaining;
  clickArea(host, 'horta', 'borboleta', now);
  assert.equal(horta.info().butterfly, null);
  assert.equal(engine.state.minis.horta.caught, 1);
  assert.ok(horta.info().plots.some(plot => plot.crop && plot.remaining < slow), 'a planta mais atrasada foi adiantada');
  assert.ok(sounds.includes('brilho'));
  // Tudo no ponto: o chamado da planta (pulinho), a sorte e a chuva continuam desenhando por muito tempo.
  for (const plot of engine.state.minis.horta.plots.slice(0, 5)) plot.readyAt = clock.t;
  for (let i = 0; i < 400; i++) host.draw((now += 33));
  // O aviso da borboleta chega pelo evento do motor.
  host.onEvents([{ type: 'mini', mini: 'horta', kind: 'butterfly' }], now);
  assert.ok(toasts.some(text => /mini\.horta\.butterflyLanded/.test(text)));
});
