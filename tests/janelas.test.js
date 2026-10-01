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
    settings: () => settings, changeSettings: partial => Object.assign(settings, partial),
    placaRect: () => null, size: () => ({ width: 1600, height: 1000 }),
    t: options.t || (key => key), sound: name => sounds.push(name), toast: text => toasts.push(text)
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

// --- Fogueira de Perto ----------------------------------------------------------------------------------------------------
test('fogueira: lenha, escolher a comida, pôr no espeto, virar, tirar no ponto e pular a fogueira pelos cliques', () => {
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

  // Escolhe o queijo e põe no espeto 0; o espeto cheio, o clique vira (entre 10% e 90%) e depois tira no ponto.
  clickArea(host, 'fogueira', 'comida:queijo', now);
  assert.equal(fogueira.info().selected, 'queijo');
  clickArea(host, 'fogueira', 'espeto:0', now);
  assert.equal(fogueira.info().sticks[0].food, 'queijo');
  const heat = () => { engine.state.minis.fogueira.heat = c.heatMax; engine.tick(1); host.draw((now += 40)); };
  while (fogueira.info().sticks[0].progress < 0.3) heat();
  clickArea(host, 'fogueira', 'espeto:0', now);
  assert.equal(fogueira.info().sticks[0].turns, 1, 'o clique virou o espeto');
  while (fogueira.info().sticks[0].state !== 'ponto') heat();
  engine.state.humor.amor = 0;
  engine.state.humor.at = engine.now();
  clickArea(host, 'fogueira', 'espeto:0', now);
  assert.equal(fogueira.info().sticks[0], null, 'tirou no ponto');
  assert.ok(engine.mood().amor > 0, 'o queijo certinho rende Amor');
  assert.equal(engine.state.minis.fogueira.perfect, 1);

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
