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
  for (const id of ['bichos', 'aquario', 'horta', 'fogueira', 'palco', 'provador', 'ceu', 'bairro']) require(`../src/janela-${id}.js`);
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
  assert.deepEqual(host.items().map(item => [item.id, item.visible]), [['bichos', false]]);
  assert.equal(host.signature(), 'bichos-');
  assert.equal(host.toggle('bichos'), true);
  assert.equal(settings.minis.bichos.hidden, false);
  assert.equal(host.visible('bichos'), true);
  assert.equal(host.windows.get('bichos').element.hidden, false);
  assert.equal(host.signature(), 'bichos+');
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

// --- Provador -------------------------------------------------------------------------------------------------------------
test('provador: a Mandioca no espelho veste item, veste conjunto e posa pelos cliques', () => {
  const { host, engine, sounds } = setup(50, { minis: { provador: { hidden: false } } });
  host.restore();
  const view = host.windows.get('provador').view;
  let now = 1000;
  host.draw((now += 40));
  const areas = view.probe().areas.map(area => area.id);
  assert.ok(['mandioca', 'aba:chapeu', 'aba:conjunto', 'item:chapeu-palha', 'pagina:+'].every(id => areas.includes(id)), areas.join(','));
  assert.match(view.status(engine), /^mini\.provador\.statusNone$/);

  // Item que não tem: erro. Comprado: veste.
  clickArea(host, 'provador', 'item:palha-furada', now);
  assert.equal(engine.state.equipped.chapeu, 'chapeu-palha');
  assert.ok(sounds.includes('erro'));
  engine.addItem('palha-furada');
  host.draw((now += 40));
  clickArea(host, 'provador', 'item:palha-furada', now);
  assert.equal(engine.state.equipped.chapeu, 'palha-furada');
  assert.ok(sounds.includes('equipar'));

  // Conjuntos: falta peça, não veste; com as três, veste tudo.
  clickArea(host, 'provador', 'aba:conjunto', now);
  host.draw((now += 40));
  assert.equal(engine.mini('provador').info().tab, 'conjunto');
  clickArea(host, 'provador', 'conjunto:pescador', now);
  assert.equal(engine.state.equipped.mao, 'bandeirinha', 'sem as peças nada muda');
  engine.addItem('vara-pescar');
  engine.addItem('xadrez-azul');
  host.draw((now += 40));
  clickArea(host, 'provador', 'conjunto:pescador', now);
  assert.equal(engine.setBonus(), data.sets.find(set => set.id === 'pescador').bonus);
  host.draw((now += 40));
  assert.match(view.status(engine), /^mini\.provador\.statusSet$/);

  // Pose: cada clique na Mandioca troca a pose. Página: as setinhas andam.
  const pose = view.probe().pose;
  clickArea(host, 'provador', 'mandioca', now);
  assert.equal(view.probe().pose, (pose + 1) % 3);
  clickArea(host, 'provador', 'aba:chapeu', now);
  host.draw((now += 40));
  clickArea(host, 'provador', 'pagina:+', now);
  assert.equal(view.probe().page, 1);
  for (let i = 0; i < 600; i++) host.draw((now += 33));
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
