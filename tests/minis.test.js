const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../src/data.js');
const { GameEngine } = require('../src/core.js');

// Motor das janelas extras (src/minis.js e src/mini-*.js). Um relógio manual deixa o tempo andar sem esperar.
function newEngine(level = 1, save = null) {
  const clock = { t: 1_000_000_000 };
  const engine = new GameEngine(data, save, { rng: () => 0.5, now: () => clock.t });
  if (!save) { engine.state.size = level; engine.state.records.size = level; }
  return { engine, clock, pass: seconds => { clock.t += seconds * 1000; engine.tick(Math.min(1, seconds)); } };
}
const events = engine => engine.drainEvents();

test('as janelas abrem nos convidados certos e o recorde conta (um ano novo não fecha nenhuma)', () => {
  const { engine } = newEngine(1);
  const starts = Object.fromEntries(data.minis.windows.map(entry => [entry.id, entry.start]));
  assert.deepEqual(Object.keys(starts), ['bichos', 'aquario', 'horta', 'fogueira', 'palco', 'provador', 'ceu', 'bairro']);
  assert.ok(Object.values(starts).every((start, i, all) => i === 0 || start > all[i - 1]), 'abrem em ordem crescente');
  assert.ok(Object.values(starts).every(start => start < data.house.start), 'todas antes da casa');
  assert.deepEqual(engine.minis.opened(), []);
  assert.equal(engine.miniOpen('bichos'), false);
  engine.state.records.size = starts.bichos;
  assert.equal(engine.miniOpen('bichos'), true);
  assert.equal(engine.miniOpen('aquario'), false);
  engine.state.records.size = 200;
  assert.deepEqual(engine.minis.opened(), Object.keys(starts));
  // O recorde fica: a festa recomeça pequena e as janelas continuam abertas.
  engine.state.size = 3;
  assert.equal(engine.miniOpen('bairro'), true);
});

test('convidado novo que abre uma janela dá um evento só, e nunca de novo', () => {
  const { engine } = newEngine(11);
  engine.state.cheer = 1e15;
  const grow = () => engine.addFame(engine.fameNeed() - engine.state.fame);
  assert.deepEqual(events(engine).filter(event => event.type === 'mini-open'), []);
  grow(); // 12
  assert.deepEqual(events(engine).filter(event => event.type === 'mini-open').map(event => event.id), ['bichos']);
  assert.equal(engine.miniOpen('bichos'), true);
  // Quem já passou por esse convidado (recorde maior) não ganha o evento de novo.
  const again = newEngine(5);
  again.engine.state.records.size = 30;
  again.engine.state.cheer = 1e15;
  for (let i = 0; i < 8; i++) again.engine.addFame(again.engine.fameNeed() - again.engine.state.fame);
  assert.deepEqual(events(again.engine).filter(event => event.type === 'mini-open'), []);
});

test('o estado das janelas vai no save e volta saneado', () => {
  const { engine } = newEngine(30);
  const saved = engine.exportState();
  assert.deepEqual(Object.keys(saved.minis), ['bichos', 'aquario', 'horta', 'fogueira', 'palco', 'provador', 'ceu', 'bairro']);
  // Lixo no save não derruba o jogo: volta ao começo daquela janela.
  const messy = JSON.parse(JSON.stringify(saved));
  messy.minis.bichos = { grain: 'muito', pets: { galinha: { bond: 999, ready: true } }, petted: -4 };
  messy.minis.horta = 'nada';
  const back = new GameEngine(data, messy, { rng: () => 0.5 });
  assert.equal(back.state.minis.bichos.grain, data.minis.bichos.grainMax);
  assert.equal(back.state.minis.bichos.pets.galinha.bond, data.minis.bichos.bondMax, 'laço limitado ao máximo');
  assert.equal(back.state.minis.bichos.petted, 0);
  assert.ok(back.state.minis.horta && typeof back.state.minis.horta === 'object');
});

// --- Quintal dos Bichos ---------------------------------------------------------------------------------------------------
test('bichos: só moram no quintal os que já chegaram à festa', () => {
  const { engine } = newEngine(12);
  const bichos = engine.mini('bichos');
  assert.deepEqual(bichos.info().pets.map(pet => pet.id), ['galinha', 'gato'], 'no 12 já tem galinha e gato');
  assert.ok(bichos.info().chicks >= 1, 'e pintinhos');
  assert.equal(bichos.pet('bode').reason, 'absent');
  engine.state.records.size = 31;
  assert.deepEqual(bichos.info().pets.map(pet => pet.id), ['galinha', 'gato', 'bode', 'caramelo']);
  engine.state.records.size = 125;
  assert.deepEqual(bichos.info().pets.map(pet => pet.id), ['galinha', 'gato', 'bode', 'caramelo', 'papagaio', 'jegue', 'boi']);
});

test('bichos: carinho dá Amor, enche o laço e tem espera; com o laço cheio sai o presente', () => {
  const { engine, clock } = newEngine(12);
  const bichos = engine.mini('bichos');
  const c = data.minis.bichos;
  engine.state.humor.amor = 0;
  const first = bichos.pet('galinha');
  assert.equal(first.ok, true);
  assert.ok(first.love > 0 && engine.mood().amor > 0, 'o Amor da Mandioca sobe');
  assert.equal(first.bond, 1);
  assert.deepEqual([bichos.pet('galinha').ok, bichos.pet('galinha').reason], [false, 'cooldown']);
  for (let i = 1; i < c.bondMax; i++) { clock.t += (c.petCooldown + 1) * 1000; assert.equal(bichos.pet('galinha').ok, true); }
  const full = bichos.info().pets.find(pet => pet.id === 'galinha');
  assert.deepEqual([full.bond, full.ready], [c.bondMax, true]);
  assert.equal(bichos.collect('gato').reason, 'empty');
  const tickets = engine.state.tickets;
  const gift = bichos.collect('galinha');
  assert.equal(gift.ok, true);
  assert.equal(engine.state.tickets, tickets + 2, 'o ovo rende 2 fichas');
  const after = bichos.info().pets.find(pet => pet.id === 'galinha');
  assert.deepEqual([after.bond, after.ready], [0, false], 'o laço recomeça');
  // Cheio de novo logo em seguida: o presente só volta depois da espera.
  engine.mini('bichos').feed('galinha');
  for (let i = 0; i < 5; i++) engine.mini('bichos').feed('galinha');
  assert.equal(bichos.info().pets.find(pet => pet.id === 'galinha').ready, false, 'ainda na espera do presente');
  clock.t += (c.giftWait + 1) * 1000;
  engine.tick(1);
  assert.equal(bichos.info().pets.find(pet => pet.id === 'galinha').ready, true, 'passada a espera, o presente fica pronto');
});

test('bichos: o milho acaba, volta com o tempo (até com o jogo fechado) e enche o laço', () => {
  const { engine, clock, pass } = newEngine(12);
  const bichos = engine.mini('bichos');
  const c = data.minis.bichos;
  assert.equal(bichos.info().grain, c.grainMax);
  for (let i = 0; i < c.grainMax; i++) assert.equal(bichos.feed('galinha').ok, true);
  assert.equal(bichos.feed('galinha').reason, 'grain');
  assert.equal(bichos.info().pets[0].bond, c.bondMax, 'milho enche o laço de 2 em 2');
  pass(c.grainEvery + 1);
  assert.equal(bichos.info().grain, 1, 'um grão a cada grainEvery segundos');
  // Jogo fechado por muito tempo: ao voltar, o milho está cheio.
  const saved = engine.exportState();
  const later = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.t + 3600 * 1000 });
  later.tick(1);
  assert.equal(later.mini('bichos').info().grain, c.grainMax);
});

test('bichos: todo presente existe com prêmio e nome', () => {
  for (const pet of data.minis.bichos.pets) {
    assert.ok(pet.gift && pet.giftName && Object.keys(pet.reward).length, pet.id);
    assert.ok(data.scenery.landmarks.some(entry => entry.id === pet.scenery), `${pet.id} existe no cenário`);
  }
  const { engine } = newEngine(125);
  engine.state.cheer = 1e6;
  const bichos = engine.mini('bichos');
  for (const pet of data.minis.bichos.pets) {
    const st = engine.state.minis.bichos.pets[pet.id] || (engine.state.minis.bichos.pets[pet.id] = { bond: 0, ready: false, giftAt: 0, petAt: 0 });
    st.bond = data.minis.bichos.bondMax;
    st.ready = true;
    const before = { tickets: engine.state.tickets, wood: engine.state.wood, cheer: engine.state.cheer };
    const gift = bichos.collect(pet.id);
    assert.equal(gift.ok, true, pet.id);
    const gained = engine.state.tickets - before.tickets + engine.state.wood - before.wood + engine.state.cheer - before.cheer;
    assert.ok(gained > 0 || pet.reward.belly || pet.reward.love, `${pet.id} deu algo`);
  }
});

// --- Aquário --------------------------------------------------------------------------------------------------------------
test('aquário: abre com peixinhos de saída (sem prêmio) e cada prenda da pescaria solta um peixe', () => {
  const { engine } = newEngine(17);
  engine.state.cheer = 1e15;
  engine.addFame(engine.fameNeed() - engine.state.fame); // 18
  const aquario = engine.mini('aquario');
  assert.equal(aquario.info().fish.length, data.minis.aquario.starter);
  assert.ok(!events(engine).some(event => event.type === 'mini' && event.kind === 'discover'), 'os de saída não dão prêmio de espécie nova');
  assert.ok(aquario.info().seen.length >= 1);
  // Pescaria: cada prenda solta um peixe.
  engine.state.fishing = { unlocked: true, ready: 2, nextAt: 0 };
  const before = aquario.info().fish.length;
  engine.fish();
  assert.equal(aquario.info().fish.length, before + 1);
  engine.fish();
  assert.equal(aquario.info().fish.length, before + 2);
  assert.ok(events(engine).some(event => event.type === 'mini' && event.mini === 'aquario' && event.kind === 'new-fish'));
});

test('aquário: a ração faz o peixe menor crescer, acaba e volta com o tempo', () => {
  const { engine, clock, pass } = newEngine(18);
  const aquario = engine.mini('aquario');
  const c = data.minis.aquario;
  engine.state.minis.aquario.started = true;
  engine.state.minis.aquario.fish = [{ id: 1, species: 'lambari', growth: 0, stage: 0 }, { id: 2, species: 'pacu', growth: 5, stage: 1 }];
  engine.state.minis.aquario.nextId = 3;
  const first = aquario.drop();
  assert.deepEqual([first.ok, first.fish.id, first.grew], [true, 2, true], 'come primeiro o que está mais perto de crescer: o pacu vira grande');
  assert.equal(aquario.info().food, c.foodMax - 1);
  aquario.drop();
  aquario.drop();
  const fourth = aquario.drop();
  assert.equal(fourth.grew, true, 'três rações no lambari: ele vira médio');
  assert.equal(aquario.info().fish[0].stage, 1);
  engine.state.minis.aquario.food = c.foodMax;
  for (let i = 0; i < 3; i++) aquario.drop();
  assert.ok(aquario.info().fish.every(fish => fish.stage === 2), 'todos grandes');
  const food = aquario.info().food;
  assert.deepEqual([aquario.drop().ok, aquario.drop().reason], [false, 'grown']);
  assert.equal(aquario.info().food, food, 'não gasta ração sem peixe pequeno');
  // A ração volta com o tempo.
  engine.state.minis.aquario.food = 0;
  engine.state.minis.aquario.foodAt = clock.t;
  pass(c.foodEvery * 2 + 1);
  assert.equal(aquario.info().food, 2);
});

test('aquário: peixe grande solta bolha dourada, que rende Animação, e as espécies novas rendem fichas', () => {
  const { engine, clock, pass } = newEngine(18);
  const aquario = engine.mini('aquario');
  const c = data.minis.aquario;
  engine.state.minis.aquario.started = true;
  engine.state.minis.aquario.fish = [{ id: 1, species: 'lambari', growth: 6, stage: 2 }];
  engine.state.minis.aquario.nextId = 2;
  engine.state.minis.aquario.bubbles = 0;
  engine.state.minis.aquario.bubbleAt = clock.t;
  assert.equal(aquario.pop().reason, 'empty');
  pass(c.bubbleEvery + 1);
  assert.equal(aquario.info().bubbles, 1);
  const cheer = engine.state.cheer;
  assert.equal(aquario.pop().ok, true);
  assert.ok(engine.state.cheer > cheer);
  // Sem peixe grande não vêm bolhas.
  engine.state.minis.aquario.fish = [{ id: 1, species: 'lambari', growth: 0, stage: 0 }];
  pass(c.bubbleEvery * 3);
  assert.equal(aquario.info().bubbles, 0);
  // Espécie nova: fichas uma vez só; as 12 juntas, o prêmio da coleção.
  const tickets = engine.state.tickets;
  const got = aquario.addFish('pirarucu');
  assert.deepEqual([got.ok, got.isNew], [true, true]);
  assert.equal(engine.state.tickets, tickets + c.discoverTickets);
  assert.equal(aquario.addFish('pirarucu').isNew, false);
  for (const species of c.species) { engine.state.minis.aquario.fish = []; aquario.addFish(species.id); }
  assert.equal(aquario.info().complete, true);
  assert.ok(events(engine).some(event => event.kind === 'complete'));
});

test('aquário: tanque cheio vira ficha e o save volta saneado', () => {
  const { engine } = newEngine(18);
  const aquario = engine.mini('aquario');
  const c = data.minis.aquario;
  for (let i = aquario.info().fish.length; i < c.tankMax; i++) aquario.addFish('lambari');
  assert.equal(aquario.info().fish.length, c.tankMax);
  const tickets = engine.state.tickets;
  const extra = aquario.addFish('lambari');
  assert.deepEqual([extra.ok, extra.full], [false, true]);
  assert.equal(engine.state.tickets, tickets + 1);
  const saved = engine.exportState();
  saved.minis.aquario.fish.push({ species: 'peixe-que-nao-existe', growth: 99 }, 'lixo');
  saved.minis.aquario.food = -3;
  const back = new GameEngine(data, saved, { rng: () => 0.5 });
  assert.equal(back.mini('aquario').info().fish.length, c.tankMax, 'só espécies que existem');
  assert.equal(back.mini('aquario').info().food, 0);
});

// --- Horta ----------------------------------------------------------------------------------------------------------------
test('horta: os canteiros abrem com os convidados (começa com 4, um a cada 10, até 10)', () => {
  const { engine } = newEngine(22);
  const horta = engine.mini('horta');
  const open = level => { engine.state.records.size = level; return horta.info().open; };
  assert.equal(open(22), 4);
  assert.equal(open(31), 4);
  assert.equal(open(32), 5);
  assert.equal(open(52), 7);
  assert.equal(open(82), 10);
  assert.equal(open(500), 10, 'no máximo 10');
  assert.equal(horta.plant(7, 'milho').ok, true);
  engine.state.records.size = 22;
  assert.equal(horta.plant(5).reason, 'closed');
});

test('horta: planta cresce com o tempo, rega encurta a espera e a colheita rende o prêmio (com bônus na primeira)', () => {
  const { engine, clock, pass } = newEngine(22);
  const horta = engine.mini('horta');
  const c = data.minis.horta;
  assert.equal(horta.plant(0, 'milho').ok, true);
  assert.equal(horta.plant(0, 'milho').reason, 'busy');
  assert.equal(horta.plant(1, 'planta-que-nao-existe').reason, 'crop');
  assert.deepEqual([horta.info().plots[0].stage, horta.info().plots[0].ready], [0, false]);
  assert.equal(horta.harvest(0).reason, 'growing');
  // Regar: gasta água e corta 20% do que falta, até 2 vezes.
  const before = horta.info().plots[0].remaining;
  assert.equal(horta.water(0).ok, true);
  const after = horta.info().plots[0].remaining;
  assert.ok(Math.abs(after - before * (1 - c.waterCut)) < 0.5, 'corta 20% do que falta');
  assert.equal(horta.info().water, c.waterMax - 1);
  assert.equal(horta.water(0).ok, true);
  assert.equal(horta.water(0).reason, 'watered');
  // O tempo passa: brotinho, depois no ponto.
  pass(horta.info().plots[0].remaining * 0.5);
  assert.equal(horta.info().plots[0].stage, 1);
  pass(horta.info().plots[0].remaining + 1);
  assert.deepEqual([horta.info().plots[0].stage, horta.info().plots[0].ready], [3, true]);
  assert.equal(horta.water(0).reason, 'ready');
  const tickets = engine.state.tickets;
  const got = horta.harvest(0);
  assert.equal(got.ok, true);
  assert.equal(got.first, true);
  assert.equal(engine.state.tickets, tickets + 1 + c.firstHarvest.tickets, 'milho: 1 ficha mais o bônus da primeira colheita');
  assert.equal(horta.info().plots[0].crop, null, 'o canteiro esvazia');
  // Segunda colheita da mesma planta: sem o bônus.
  horta.plant(0, 'milho');
  clock.t += c.crops[0].minutes * 60000 + 1;
  const second = horta.harvest(0);
  assert.equal(second.first, false);
  assert.equal(engine.state.tickets, tickets + 1 + c.firstHarvest.tickets + 1);
  assert.equal(horta.info().harvested.milho, 2);
});

test('horta: todas as plantas dão prêmio e a regadora enche com o tempo', () => {
  const { engine, clock, pass } = newEngine(22);
  const horta = engine.mini('horta');
  const c = data.minis.horta;
  engine.state.cheer = 1e6;
  for (const [i, item] of c.crops.entries()) {
    horta.plant(i % 4, item.id);
    clock.t += item.minutes * 60000 + 1;
    const before = { tickets: engine.state.tickets, wood: engine.state.wood, cheer: engine.state.cheer, belly: engine.mood().barriga, amor: engine.mood().amor };
    engine.state.humor.barriga = 0;
    engine.state.humor.amor = 0;
    engine.state.humor.at = clock.t;
    const got = horta.harvest(i % 4);
    assert.equal(got.ok, true, item.id);
    const gained = (engine.state.tickets - before.tickets) + (engine.state.wood - before.wood) + (engine.state.cheer - before.cheer) + engine.mood().barriga + engine.mood().amor;
    assert.ok(gained > 0, `${item.id} rende algo`);
  }
  engine.state.minis.horta.water = 0;
  engine.state.minis.horta.waterAt = clock.t;
  pass(c.waterEvery * 3 + 1);
  assert.equal(horta.info().water, 3);
});

test('horta: o corvo pousa numa planta, dá para espantar e, sem espantar, ele come; o espantalho afasta os corvos', () => {
  const { engine, clock, pass } = newEngine(30);
  const horta = engine.mini('horta');
  const c = data.minis.horta;
  assert.equal(horta.scare().reason, 'none');
  horta.plant(2, 'abobora');
  engine.state.minis.horta.crowAt = clock.t - 1;
  pass(1);
  assert.deepEqual(horta.info().crow && horta.info().crow.plot, 2, 'o corvo pousa no único canteiro plantado');
  assert.ok(events(engine).some(event => event.kind === 'crow'));
  const cheer = engine.state.cheer;
  assert.equal(horta.scare().ok, true);
  assert.ok(engine.state.cheer > cheer, 'o espanto rende uma gorjeta');
  assert.equal(horta.info().crow, null);
  assert.equal(horta.info().plots[2].crop, 'abobora', 'a planta continua');
  // Sem espantar: come.
  engine.state.minis.horta.crowAt = clock.t - 1;
  pass(1);
  assert.ok(horta.info().crow);
  clock.t += (c.crowSeconds + 1) * 1000;
  engine.tick(1);
  assert.equal(horta.info().plots[2].crop, null, 'o corvo comeu a planta');
  assert.ok(events(engine).some(event => event.kind === 'crow-ate'));
  // O Espantalho Galã num dos lados: corvo nenhum.
  horta.plant(1, 'abobora');
  engine.addItem('espantalho');
  engine.equip('espantalho', 'esquerda');
  engine.state.minis.horta.crowAt = clock.t - 1;
  pass(1);
  assert.equal(horta.info().crow, null);
});

test('horta: o save guarda as plantas (crescendo com o jogo fechado) e esquece o corvo', () => {
  const { engine, clock } = newEngine(30);
  const horta = engine.mini('horta');
  horta.plant(0, 'mandioca');
  horta.plant(1, 'milho');
  horta.select('amendoim');
  engine.state.minis.horta.crow = { plot: 0, until: clock.t + 99999 };
  const saved = engine.exportState();
  const later = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.t + 5 * 60000 });
  const info = later.mini('horta').info();
  assert.equal(info.plots[1].ready, true, 'o milho (4 min) ficou pronto com o jogo fechado');
  assert.equal(info.plots[0].ready, false);
  assert.equal(info.seed, 'amendoim');
  assert.equal(info.crow, null);
  const messy = JSON.parse(JSON.stringify(saved));
  messy.minis.horta.plots[3] = { crop: 'couve', readyAt: 5 };
  messy.minis.horta.plots[0].waters = 99;
  const back = new GameEngine(data, messy, { rng: () => 0.5, now: () => clock.t });
  assert.equal(back.mini('horta').info().plots[3].crop, null);
  assert.equal(back.state.minis.horta.plots[0].waters, data.minis.horta.waterLimit);
});

// --- Fogueira de Perto ----------------------------------------------------------------------------------------------------
test('fogueira: lenha esquenta o fogo, que esfria sozinho', () => {
  const { engine, pass } = newEngine(30);
  const fogueira = engine.mini('fogueira');
  const c = data.minis.fogueira;
  assert.equal(fogueira.info().heat, 0);
  engine.state.wood = 0;
  assert.equal(fogueira.addWood().reason, 'wood');
  engine.state.wood = 10;
  const got = fogueira.addWood();
  assert.deepEqual([got.ok, fogueira.info().heat, engine.state.wood], [true, c.heatPerWood, 9]);
  for (let i = 0; i < 4; i++) fogueira.addWood();
  assert.equal(fogueira.info().heat, c.heatMax);
  assert.equal(fogueira.addWood().reason, 'full');
  assert.equal(engine.state.wood, 5, 'cheia: não gasta lenha');
  pass(10);
  assert.ok(fogueira.info().heat < c.heatMax && fogueira.info().heat > c.heatMax - 10 * c.heatLoss - 0.01);
});

test('fogueira: o espeto assa no ritmo do calor, vira, sai no ponto (vale mais se virou), passa do ponto e queima', () => {
  const { engine, pass } = newEngine(30);
  const fogueira = engine.mini('fogueira');
  const c = data.minis.fogueira;
  engine.state.wood = 99;
  const heat = () => { engine.state.minis.fogueira.heat = c.heatMax; };
  // Frio: não assa.
  assert.equal(fogueira.put(0, 'milho').ok, true);
  assert.equal(fogueira.put(0, 'milho').reason, 'busy');
  assert.equal(fogueira.put(9, 'milho').reason, 'slot');
  pass(30);
  assert.equal(fogueira.info().sticks[0].progress, 0, 'sem calor a comida não assa');
  // Quente: assa. Crua não sai; virar só entre 10% e 90%.
  heat();
  assert.equal(fogueira.turn(0).reason, 'early');
  const steps = () => { heat(); pass(1); };
  while (fogueira.info().sticks[0].progress < 0.5) steps();
  assert.deepEqual([fogueira.take(0).reason, fogueira.turn(0).ok, fogueira.turn(0).ok, fogueira.turn(0).reason], ['raw', true, true, 'turned']);
  while (fogueira.info().sticks[0].state !== 'ponto') steps();
  const belly = engine.mood().barriga;
  engine.state.humor.barriga = 0;
  engine.state.humor.at = engine.now();
  const got = fogueira.take(0);
  assert.deepEqual([got.ok, got.perfect, got.mult], [true, true, c.perfectMult]);
  assert.equal(Math.round(engine.mood().barriga), Math.round(14 * c.perfectMult), 'milho certinho: 14 x 1,5 de Barriga');
  assert.equal(fogueira.info().sticks[0], null);
  // Sem virar, no ponto vale 100%; passado, 70%; muito além, queima e não rende nada.
  fogueira.put(1, 'batata');
  while (fogueira.info().sticks[1].state !== 'ponto') steps();
  engine.state.humor.barriga = 0;
  engine.state.humor.at = engine.now();
  assert.deepEqual([fogueira.take(1).perfect, Math.round(engine.mood().barriga)], [false, 24]);
  fogueira.put(2, 'queijo');
  while (fogueira.info().sticks[2].state !== 'passou') steps();
  engine.state.humor.amor = 0;
  engine.state.humor.at = engine.now();
  assert.equal(fogueira.take(2).mult, 0.7);
  fogueira.put(3, 'linguica');
  while (!fogueira.info().sticks[3].burnt) steps();
  assert.equal(fogueira.info().sticks[3].state, 'queimado');
  const trash = fogueira.take(3);
  assert.deepEqual([trash.ok, trash.burnt], [true, true]);
  assert.ok(events(engine).some(event => event.kind === 'burnt'));
  assert.equal(engine.state.minis.fogueira.burnt, 1);
});

test('fogueira: pular a fogueira precisa de calor, rende Animação e Amor e espera', () => {
  const { engine, clock } = newEngine(30);
  const fogueira = engine.mini('fogueira');
  const c = data.minis.fogueira;
  assert.equal(fogueira.jump().reason, 'cold');
  engine.state.minis.fogueira.heat = c.heatMax;
  engine.state.humor.amor = 0;
  const cheer = engine.state.cheer;
  assert.equal(fogueira.jump().ok, true);
  assert.ok(engine.state.cheer > cheer && engine.mood().amor > 0);
  assert.deepEqual([fogueira.jump().ok, fogueira.jump().reason], [false, 'wait']);
  assert.equal(fogueira.info().canJump, false);
  clock.t += (c.jumpWait + 1) * 1000;
  assert.equal(fogueira.info().canJump, true);
});

test('fogueira: o save guarda o fogo e os espetos e volta saneado', () => {
  const { engine } = newEngine(30);
  const fogueira = engine.mini('fogueira');
  engine.state.minis.fogueira.heat = 60;
  fogueira.put(0, 'queijo');
  engine.state.minis.fogueira.sticks[0].progress = 0.4;
  const saved = engine.exportState();
  const back = new GameEngine(data, saved, { rng: () => 0.5 });
  assert.equal(back.mini('fogueira').info().heat, 60);
  assert.equal(back.mini('fogueira').info().sticks[0].food, 'queijo');
  const messy = JSON.parse(JSON.stringify(saved));
  messy.minis.fogueira.sticks[1] = { food: 'pizza', progress: 1 };
  messy.minis.fogueira.sticks[0].progress = 99;
  messy.minis.fogueira.heat = 'quente';
  const clean = new GameEngine(data, messy, { rng: () => 0.5 });
  assert.equal(clean.mini('fogueira').info().sticks[1], null);
  assert.equal(clean.mini('fogueira').info().sticks[0].burnt, true);
  assert.equal(clean.mini('fogueira').info().heat, 0);
});

// --- Palco do Forró -------------------------------------------------------------------------------------------------------
// Toca a música inteira: acerta cada nota `diff` ms depois da hora certa.
function playSong(engine, clock, id, diff = 0, skip = () => false) {
  const palco = engine.mini('palco');
  assert.equal(palco.start(id).ok, true);
  const startAt = clock.t;
  const notes = palco.chart(id);
  notes.forEach((note, i) => {
    if (skip(i)) return;
    clock.t = startAt + note.t + diff;
    palco.hit(note.lane);
  });
  clock.t = startAt + notes[notes.length - 1].t + 5000;
  engine.tick(1);
  return engine.state.minis.palco.last;
}

test('palco: a partitura é sempre a mesma, em ordem, nas 3 pistas e sem repetir a mesma pista muitas vezes', () => {
  const { engine } = newEngine(38);
  const palco = engine.mini('palco');
  for (const song of data.minis.palco.songs) {
    const notes = palco.chart(song.id);
    assert.equal(notes.length, song.notes);
    assert.deepEqual(notes, palco.chart(song.id), 'sempre a mesma');
    assert.ok(notes.every((note, i) => note.lane >= 0 && note.lane <= 2 && (i === 0 || note.t > notes[i - 1].t)), 'tempos crescentes, pistas 0 a 2');
    for (let i = 2; i < notes.length; i++) assert.ok(!(notes[i].lane === notes[i - 1].lane && notes[i].lane === notes[i - 2].lane), 'sem 3 iguais seguidas');
    assert.ok(new Set(notes.map(note => note.lane)).size === 3, 'usa as 3 pistas');
  }
  assert.deepEqual(palco.info().songs.map(song => song.open), [true, false, false, false], 'só a primeira está aberta');
});

test('palco: show perfeito dá 3 estrelas, o prêmio e o bônus da primeira vez; depois o palco descansa (ensaio sem prêmio)', () => {
  const { engine, clock } = newEngine(38);
  const palco = engine.mini('palco');
  const c = data.minis.palco;
  const cheer = engine.state.cheer;
  const tickets = engine.state.tickets;
  const last = playSong(engine, clock, 'xote');
  assert.deepEqual([last.stars, last.perfect, last.miss, last.practice], [3, c.songs[0].notes, 0, false]);
  assert.equal(last.accuracy, 1);
  assert.ok(engine.state.cheer > cheer, 'rende Animação');
  assert.equal(last.reward.tickets, 1 + c.firstThree.tickets, 'ficha das 3 estrelas mais o bônus da primeira vez');
  assert.ok(engine.state.tickets >= tickets + last.reward.tickets);
  assert.equal(last.first, true);
  assert.equal(palco.info().songs[0].stars, 3);
  assert.deepEqual(palco.info().songs.map(song => song.open), [true, true, false, false], 'a música seguinte abriu');
  assert.ok(palco.info().cooldown > c.wait - 10);
  assert.ok(events(engine).some(event => event.kind === 'show-end'));
  // No descanso é ensaio: toca, mas nada de prêmio.
  const rehearsal = playSong(engine, clock, 'xote');
  assert.deepEqual([rehearsal.practice, rehearsal.stars], [true, 3]);
  assert.deepEqual(rehearsal.reward, {}, 'ensaio não paga');
  assert.equal(palco.start('forro-ouro').reason, 'locked');
  // Passado o descanso, vale de novo (sem o bônus da primeira vez).
  clock.t += (c.wait + 1) * 1000;
  const again = playSong(engine, clock, 'xote');
  assert.deepEqual([again.practice, again.first], [false, false]);
});

test('palco: acertar de raspão vale menos, errar tudo desafina sem descanso e dá para parar o show', () => {
  const { engine, clock } = newEngine(38);
  const palco = engine.mini('palco');
  // "Bom" (fora da janela do perfeito): 2 de 3 pontos, 67%: 1 estrela.
  const good = playSong(engine, clock, 'xote', 110);
  assert.deepEqual([good.perfect, good.good, good.stars], [0, data.minis.palco.songs[0].notes, 1]);
  clock.t += (data.minis.palco.wait + 1) * 1000;
  // Errar a maioria: desafina e não dá descanso.
  const bad = playSong(engine, clock, 'xote', 0, i => i % 4 !== 0);
  assert.equal(bad.stars, 0);
  assert.ok(bad.miss > 0 && bad.maxCombo >= 1);
  assert.equal(palco.info().cooldown, 0, '0 estrelas: sem descanso');
  // Clique fora de hora não acerta nada.
  palco.start('xote');
  assert.equal(palco.hit(0).reason, 'none');
  assert.equal(palco.start('xote').reason, 'playing');
  assert.equal(palco.abort().ok, true);
  assert.equal(engine.state.minis.palco.last.aborted, true);
  assert.equal(palco.info().show, null);
  assert.equal(palco.hit(0).reason, 'idle');
});

test('palco: o save guarda as estrelas e o descanso, e esquece o show no meio', () => {
  const { engine, clock } = newEngine(38);
  playSong(engine, clock, 'xote');
  engine.mini('palco').start('baiao');
  const saved = engine.exportState();
  const back = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.t });
  assert.equal(back.mini('palco').info().show, null);
  assert.equal(back.mini('palco').info().songs[0].stars, 3);
  assert.ok(back.mini('palco').info().cooldown > 0);
  const messy = JSON.parse(JSON.stringify(saved));
  messy.minis.palco.best = { xote: 99, 'musica-fantasma': 3 };
  const clean = new GameEngine(data, messy, { rng: () => 0.5, now: () => clock.t });
  assert.deepEqual(clean.state.minis.palco.best, { xote: 3 });
});

// --- Provador -------------------------------------------------------------------------------------------------------------
test('provador: veste o que a Mandioca tem, não veste o que não tem, e os conjuntos completos vestem de uma vez com o bônus', () => {
  const { engine } = newEngine(46);
  const provador = engine.mini('provador');
  const owned = list => list.filter(item => item.owned).map(item => item.id);
  const info = provador.info();
  assert.ok(owned(info.hats).includes('chapeu-palha') && !owned(info.hats).includes('vaqueiro'));
  assert.deepEqual([provador.wear('vaqueiro').ok, provador.wear('vaqueiro').reason], [false, 'locked']);
  assert.equal(provador.wear('item-que-nao-existe').reason, 'item');
  assert.equal(provador.wear('terra-batida').reason, 'item', 'só chapéu, mão e tecido');
  assert.equal(provador.wear(info.equipped.chapeu).reason, 'already');
  // Veste um chapéu comprado.
  engine.addItem('palha-furada');
  const got = provador.wear('palha-furada');
  assert.equal(got.ok, true);
  assert.equal(engine.state.equipped.chapeu, 'palha-furada');
  assert.equal(provador.info().hats.find(item => item.id === 'palha-furada').worn, true);
  // Conjunto: falta peça, não veste; com as três peças, veste tudo e o bônus vale.
  const pescador = data.sets.find(set => set.id === 'pescador');
  assert.deepEqual([provador.wearSet('pescador').ok, provador.wearSet('pescador').reason], [false, 'missing']);
  assert.equal(provador.info().sets.find(set => set.id === 'pescador').missing, 2);
  engine.addItem('vara-pescar');
  engine.addItem('xadrez-azul');
  assert.equal(provador.info().sets.find(set => set.id === 'pescador').complete, true);
  const before = engine.setBonus();
  const set = provador.wearSet('pescador');
  assert.equal(set.ok, true);
  assert.deepEqual([engine.state.equipped.chapeu, engine.state.equipped.mao, engine.state.equipped.tecido], [pescador.hat, pescador.hand, pescador.fabric]);
  assert.equal(engine.setBonus(), pescador.bonus);
  assert.ok(engine.setBonus() > before);
  assert.equal(provador.info().sets.find(set => set.id === 'pescador').active, true);
  assert.equal(provador.wearSet('pescador').reason, 'already');
  assert.ok(engine.state.setsWorn.includes('pescador'));
  // A aba escolhida vai no save.
  assert.equal(provador.select('conjunto'), true);
  assert.equal(provador.select('nada'), false);
  const back = new GameEngine(data, engine.exportState(), { rng: () => 0.5 });
  assert.equal(back.mini('provador').info().tab, 'conjunto');
});

// --- Céu de São João ------------------------------------------------------------------------------------------------------
test('céu: foguete gasta um da carga, rende Animação, volta com o tempo, e vários seguidos fazem a Grande Final', () => {
  const { engine, clock, pass } = newEngine(60);
  const ceu = engine.mini('ceu');
  const c = data.minis.ceu;
  assert.equal(ceu.info().rockets, c.rocketMax);
  const first = ceu.launch();
  assert.deepEqual([first.ok, first.volley, first.finale], [true, 1, null]);
  assert.ok(c.rocketMax - 1 === ceu.info().rockets && ceu.shapes().includes(first.shape));
  // Grande Final: 4 foguetes em 12 s.
  ceu.launch(); ceu.launch();
  const tickets = engine.state.tickets;
  const last = ceu.launch();
  assert.ok(last.finale && last.finale.tickets === 1, 'o 4º seguido faz a Grande Final');
  assert.ok(engine.state.tickets >= tickets + 1);
  assert.ok(events(engine).some(event => event.kind === 'finale'));
  // Outra Grande Final só depois da espera.
  ceu.launch(); ceu.launch();
  assert.equal(ceu.info().rockets, 0);
  assert.equal(ceu.launch().reason, 'empty');
  pass(c.rocketEvery * 2 + 1);
  assert.equal(ceu.info().rockets, 2, 'um foguete a cada rocketEvery segundos');
  // Foguetes espaçados não fazem volley (passam da janela de tempo).
  engine.state.minis.ceu.rockets = 6;
  engine.state.minis.ceu.finaleAt = 0;
  engine.state.minis.ceu.volley = [];
  for (let i = 0; i < 5; i++) { assert.equal(ceu.launch().finale, null); clock.t += (c.volleyMs + 1000); }
});

test('céu: a estrela cadente aparece de vez em quando, o clique faz o pedido e, sem clique, ela some', () => {
  const { engine, clock, pass } = newEngine(60);
  const ceu = engine.mini('ceu');
  const c = data.minis.ceu;
  assert.equal(ceu.wish().reason, 'none');
  engine.state.minis.ceu.starAt = clock.t - 1;
  pass(1);
  const star = ceu.info().star;
  assert.ok(star && star.left > 0 && star.left <= c.starSeconds);
  assert.ok(events(engine).some(event => event.kind === 'star'));
  const got = ceu.wish();
  assert.equal(got.ok, true);
  assert.ok(Object.keys(got.reward).length);
  assert.equal(ceu.info().star, null);
  assert.equal(engine.state.minis.ceu.wishes, 1);
  // Sem fazer o pedido: some depois de starSeconds.
  engine.state.minis.ceu.starAt = clock.t - 1;
  pass(1);
  assert.ok(ceu.info().star);
  clock.t += (c.starSeconds + 1) * 1000;
  engine.tick(1);
  assert.equal(ceu.info().star, null);
  assert.ok(events(engine).some(event => event.kind === 'star-gone'));
  assert.ok(engine.state.minis.ceu.starAt > clock.t, 'a próxima vem depois');
});

test('céu: a simpatia dá 3 cartas diferentes, a escolhida rende o prêmio e a próxima só vem depois da espera', () => {
  const { engine, clock } = newEngine(60);
  const ceu = engine.mini('ceu');
  const c = data.minis.ceu;
  assert.equal(ceu.pick(0).reason, 'none');
  const dealt = ceu.deal();
  assert.equal(dealt.ok, true);
  assert.equal(new Set(dealt.ids).size, 3);
  assert.equal(ceu.deal().reason, 'open');
  assert.equal(ceu.pick(5).reason, 'card');
  const index = dealt.ids.indexOf('banho') >= 0 ? dealt.ids.indexOf('banho') : 0;
  const got = ceu.pick(index);
  assert.equal(got.ok, true);
  assert.equal(ceu.pick(0).reason, 'none', 'só vira uma');
  assert.equal(ceu.info().cards.picked, index);
  // O prêmio da carta virada (cada simpatia tem o seu).
  assert.ok(Object.keys(got.reward).length > 0);
  ceu.ack();
  assert.equal(ceu.info().cards, null);
  assert.deepEqual([ceu.deal().ok, ceu.deal().reason], [false, 'wait']);
  assert.ok(ceu.info().simpatiaIn > c.simpatiaWait - 5);
  clock.t += (c.simpatiaWait + 1) * 1000;
  assert.equal(ceu.deal().ok, true);
  // O frenesi do banho de ervas liga o frenesi de verdade.
  const { engine: other } = newEngine(60);
  other.state.minis.ceu.cards = { ids: ['banho', 'faca', 'ovo'], picked: null };
  assert.equal(other.mini('ceu').pick(0).reward.frenzy, 15);
  assert.ok(other.state.runtime.frenzyLeft >= 15);
});

test('céu: toda simpatia tem texto e prêmio, e o save guarda as cartas e esquece a estrela', () => {
  for (const entry of data.minis.ceu.simpatias) assert.ok(entry.name && entry.text && (entry.reward || entry.frenzy), entry.id);
  const { engine, clock } = newEngine(60);
  const ceu = engine.mini('ceu');
  ceu.deal();
  engine.state.minis.ceu.starAt = clock.t - 1;
  engine.tick(1);
  assert.ok(ceu.info().star);
  const saved = engine.exportState();
  const back = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.t });
  assert.equal(back.mini('ceu').info().star, null);
  assert.equal(back.mini('ceu').info().cards.ids.length, 3);
  const messy = JSON.parse(JSON.stringify(saved));
  messy.minis.ceu.cards = { ids: ['faca', 'faca', 'nao-existe'], picked: 9 };
  messy.minis.ceu.rockets = 99;
  const clean = new GameEngine(data, messy, { rng: () => 0.5, now: () => clock.t });
  assert.equal(clean.mini('ceu').info().cards, null);
  assert.equal(clean.mini('ceu').info().rockets, data.minis.ceu.rocketMax);
});

// --- Bairro ---------------------------------------------------------------------------------------------------------------
test('bairro: só moram na rua os que a Mandioca já pescou; quem está no rolê não está em casa', () => {
  const { engine } = newEngine(75);
  const bairro = engine.mini('bairro');
  assert.equal(bairro.info().houses.length, data.chars.length);
  assert.ok(bairro.info().houses.every(house => !house.owned && !house.ready));
  assert.deepEqual([bairro.visit('milho').ok, bairro.visit('milho').reason], [false, 'empty']);
  assert.equal(bairro.visit('ninguem').reason, 'char');
  engine.state.crew.milho = { level: 3 };
  engine.state.crew.faisca = { level: 1 };
  const houses = bairro.info().houses;
  assert.deepEqual(houses.filter(house => house.owned).map(house => house.id), ['milho', 'faisca']);
  assert.ok(houses.find(house => house.id === 'milho').ready);
  // No rolê: não está em casa.
  engine.state.outings[0] = { char: 'faisca', endsAt: engine.now() + 60000 };
  const away = bairro.info().houses.find(house => house.id === 'faisca');
  assert.deepEqual([away.away, away.ready], [true, false]);
  assert.equal(bairro.visit('faisca').reason, 'away');
});

test('bairro: a visita rende Animação pelo nível (e um recado), espera, e a 4ª visita dá uma ficha', () => {
  const { engine, clock } = newEngine(75);
  const bairro = engine.mini('bairro');
  const c = data.minis.bairro;
  engine.state.crew.milho = { level: 5 };
  engine.state.crew.cenoura = { level: 1 };
  const first = bairro.visit('milho');
  assert.equal(first.ok, true);
  assert.ok(data.letters.includes(first.recado));
  assert.ok(first.reward.cheer > 0 && first.level === 5);
  const low = bairro.visit('cenoura');
  assert.ok(first.reward.cheer > low.reward.cheer, 'quanto mais alto o nível, mais rende (mesma produção, mais segundos)');
  const wait = bairro.visit('milho');
  assert.deepEqual([wait.ok, wait.reason], [false, 'wait']);
  assert.ok(wait.wait > c.visitWait - 5);
  assert.equal(bairro.info().houses.find(house => house.id === 'milho').ready, false);
  // A cada 4 visitas à mesma casa, uma ficha.
  let tickets = 0;
  for (let i = 0; i < 3; i++) {
    clock.t += (c.visitWait + 1) * 1000;
    const got = bairro.visit('milho');
    tickets += got.reward.tickets || 0;
  }
  assert.equal(tickets, 1, 'só a 4ª visita deu a ficha');
  assert.equal(engine.state.minis.bairro.visits, 5);
});

test('bairro: o save guarda as visitas e a espera e volta saneado', () => {
  const { engine, clock } = newEngine(75);
  engine.state.crew.milho = { level: 2 };
  engine.mini('bairro').visit('milho');
  const saved = engine.exportState();
  const back = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.t });
  const home = back.mini('bairro').info().houses.find(house => house.id === 'milho');
  assert.equal(home.visits, 1);
  assert.ok(home.wait > 0 && !home.ready);
  const messy = JSON.parse(JSON.stringify(saved));
  messy.minis.bairro.homes = { milho: { nextAt: 'amanhã', visits: -3 }, fantasma: { nextAt: 1, visits: 5 } };
  const clean = new GameEngine(data, messy, { rng: () => 0.5, now: () => clock.t });
  assert.deepEqual(Object.keys(clean.state.minis.bairro.homes), ['milho']);
  assert.equal(clean.state.minis.bairro.homes.milho.visits, 0);
});
