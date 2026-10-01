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
  assert.deepEqual(Object.keys(starts), ['cordel', 'bichos', 'aquario', 'horta', 'fogueira', 'palco', 'mata', 'ceu', 'bairro']);
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
  assert.deepEqual(Object.keys(saved.minis), ['cordel', 'bichos', 'aquario', 'horta', 'fogueira', 'palco', 'mata', 'ceu', 'bairro']);
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
  engine.state.humor.barriga = 0;
  engine.state.humor.at = engine.now();
  const cheer0 = engine.state.cheer;
  const got = fogueira.take(0);
  assert.deepEqual([got.ok, got.perfect, got.mult], [true, true, c.perfectMult]);
  // O prêmio da comida: Barriga 100% cheia e parada por 2 h; o extra do milho (Animação) vale 1,5 vezes quando é certinho.
  assert.equal(engine.mood().barriga, engine.cfg.moodMax, 'Barriga cheia');
  assert.equal(got.reward.bellyFull, c.bellyHold);
  assert.ok(Math.abs(engine.bellyHoldLeft() - c.bellyHold * 3600000) < 1000, 'parada por 2 h');
  assert.ok(engine.state.cheer - cheer0 >= 20, 'extra do milho (Animação)');
  assert.equal(fogueira.info().sticks[0], null);
  // Sem virar, no ponto vale 100% do extra (a batata dá lenha); a Barriga fica cheia do mesmo jeito.
  fogueira.put(1, 'batata');
  while (fogueira.info().sticks[1].state !== 'ponto') steps();
  engine.state.humor.barriga = 0;
  engine.state.humor.at = engine.now();
  const wood0 = engine.state.wood;
  const potato = fogueira.take(1);
  assert.equal(potato.perfect, false);
  assert.equal(Math.round(engine.mood().barriga), engine.cfg.moodMax);
  assert.equal(engine.state.wood - wood0, 3, 'a batata devolve lenha');
  // Passado do ponto vale 70% do extra e a Barriga ainda enche.
  fogueira.put(2, 'queijo');
  while (fogueira.info().sticks[2].state !== 'passou') steps();
  engine.state.humor.amor = 0;
  engine.state.humor.barriga = 0;
  engine.state.humor.at = engine.now();
  const cheese = fogueira.take(2);
  assert.equal(cheese.mult, 0.7);
  assert.equal(Math.round(engine.mood().amor), Math.round(6 * 0.7));
  assert.equal(Math.round(engine.mood().barriga), engine.cfg.moodMax, 'passou do ponto, mas comeu: Barriga cheia');
  fogueira.put(3, 'linguica');
  while (!fogueira.info().sticks[3].burnt) steps();
  assert.equal(fogueira.info().sticks[3].state, 'queimado');
  engine.state.humor.barriga = 0;
  engine.state.humor.holdUntil = 0;
  engine.state.humor.at = engine.now();
  const trash = fogueira.take(3);
  assert.deepEqual([trash.ok, trash.burnt], [true, true]);
  assert.equal(Math.round(engine.mood().barriga), 0, 'queimada não enche a Barriga');
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

// --- Mata Encantada (o auto battler, convidado 50) -------------------------------------------------------------------------------
const mataRun = (engine, clock, seconds) => { for (let i = 0; i < seconds; i++) { clock.t += 1000; engine.tick(1); } };
const strong = (engine, level = 300) => { for (const id of Object.keys(engine.state.levels)) engine.state.levels[id] = level; };
const mood = (engine, clock, amor, barriga) => { engine.state.humor = { amor, barriga, at: clock.t }; };

test('mata: abre com 50 convidados, tem 10 chefes e a lista de itens existe (e nenhum Saci)', () => {
  const c = data.minis.mata;
  assert.equal(data.minis.windows.find(entry => entry.id === 'mata').start, 50);
  assert.equal(c.battles, 4);
  assert.equal(c.stages.length, 10);
  assert.equal(c.bosses.length, 10);
  for (const stage of c.stages) {
    assert.ok(c.bosses.some(boss => boss.id === stage.boss), `chefe de ${stage.id}`);
    assert.ok(stage.mobs.every(id => c.creatures.some(creature => creature.id === id)), `criaturas de ${stage.id}`);
  }
  assert.doesNotMatch(JSON.stringify(c), /saci|perer/i, 'o Saci Pererê não entra');
  assert.ok(c.unlocks.length >= 10);
  for (const entry of c.unlocks) {
    const item = data.items.find(candidate => candidate.id === entry.item);
    assert.ok(item, entry.item);
    assert.equal(item.source, 'luta');
    assert.equal(item.price, 0);
  }
  assert.deepEqual(c.unlocks.map(entry => entry.stage), [...c.unlocks.map(entry => entry.stage)].sort((a, b) => a - b), 'liberam em ordem');
  const { engine } = newEngine(49);
  assert.equal(engine.miniOpen('mata'), false);
  engine.state.records.size = 50;
  assert.equal(engine.miniOpen('mata'), true);
});

test('mata: os status vêm das melhorias, da comida, da felicidade e do bicho, que dá o mesmo bônus para todos', () => {
  const { engine, clock } = newEngine(50);
  const mata = engine.mini('mata');
  mood(engine, clock, 50, 50);
  const base = mata.stats();
  for (const [stat, key, up] of [['rebolado', 'atk', true], ['folego', 'hp', true], ['refresco', 'red', true], ['ritmo', 'interval', false]]) {
    engine.state.levels[stat] += 20;
    const next = mata.stats();
    assert.ok(up ? next[key] > base[key] : next[key] < base[key], `${stat} mexe em ${key}`);
    engine.state.levels[stat] -= 20;
  }
  mood(engine, clock, 100, 0);
  const hungry = mata.stats();
  assert.ok(hungry.hp < base.hp && hungry.atk > base.atk, 'Barriga vazia tira Vida, Amor cheio dá Ataque');
  mood(engine, clock, 0, 100);
  const sad = mata.stats();
  assert.ok(sad.hp > base.hp && sad.atk < base.atk, 'Barriga cheia dá Vida, Amor vazio tira Ataque');
  mood(engine, clock, 50, 0);
  assert.ok(Math.abs(mata.stats().hp / base.hp - (1 - data.minis.mata.moodPercent / 100) / 1) < 0.02, 'Barriga vazia: -20% de Vida');
  mood(engine, clock, 50, 50);
  const pets = engine.mini('bichos').info().pets;
  assert.ok(pets.length >= 2);
  const bondOf = (id, bond) => { engine.state.minis.bichos.pets[id] = { bond, ready: false, giftAt: 0, petAt: 0 }; };
  assert.equal(mata.stats().petBonus, 0, 'sem bicho, sem bônus');
  const max = data.minis.bichos.bondMax;
  const bonus = [];
  for (const pet of pets.slice(0, 2)) {
    bondOf(pet.id, max);
    assert.equal(mata.choosePet(pet.id), true);
    bonus.push(mata.stats().petBonus);
  }
  assert.equal(bonus[0], bonus[1], 'todos os bichos dão o mesmo bônus');
  assert.ok(Math.abs(bonus[0] - data.minis.mata.petPercent / 100) < 1e-9, 'laço cheio: o bônus máximo');
  bondOf(pets[1].id, max / 2);
  assert.ok(Math.abs(mata.stats().petBonus - bonus[0] / 2) < 1e-9, 'meio laço, meio bônus');
  bondOf(pets[1].id, 0);
  assert.equal(mata.stats().petBonus, 0, 'laço vazio: nenhum bônus');
  bondOf(pets[1].id, max);
  const boosted = mata.stats();
  assert.ok(boosted.atk > base.atk && boosted.hp > base.hp && boosted.red > base.red && boosted.interval < base.interval, 'o bônus vale nos quatro status');
  // A escolha cicla pelos bichos do quintal e volta a ninguém; bicho que não mora lá não vale.
  assert.equal(mata.choosePet(''), true);
  const order = [];
  for (let i = 0; i < pets.length; i++) { mata.choosePet(); order.push(engine.state.minis.mata.companion); }
  assert.deepEqual(order, pets.map(pet => pet.id));
  mata.choosePet();
  assert.equal(engine.state.minis.mata.companion, '');
  assert.equal(mata.choosePet('dragao'), false);
});

test('mata: a Mandioca forte vence tudo, libera o item do chefe e passa de etapa (Barriga gasta, bicho ganha laço)', () => {
  const { engine, clock } = newEngine(50);
  strong(engine);
  mood(engine, clock, 50, 100);
  const mata = engine.mini('mata');
  const pet = mata.info().pets[0];
  engine.state.minis.bichos.pets[pet.id] = { bond: 0, ready: false, giftAt: 0, petAt: 0 };
  mata.choosePet(pet.id);
  engine.state.tickets = 1000;
  assert.equal(engine.buyItem('cabelo-curupira'), false, 'troféu não se compra');
  engine.state.tickets = 0;
  events(engine);
  const wins = [];
  for (let i = 0; i < 45; i++) {
    mataRun(engine, clock, 1);
    wins.push(...events(engine).filter(event => event.type === 'mini' && event.mini === 'mata' && event.kind === 'win'));
  }
  assert.ok(wins.some(event => event.first && event.stage === 1 && event.items.includes('cabelo-curupira')), 'a primeira vitória sobre o chefe avisa o item');
  mataRun(engine, clock, 105);
  const s = engine.state.minis.mata;
  assert.ok(s.best >= 1 && s.stage >= 2, 'passou da etapa 1');
  assert.equal(engine.owned('cabelo-curupira'), true, 'o chefe 1 deu o item dele');
  assert.ok(engine.state.tickets >= data.minis.mata.reward.firstClear.tickets, 'primeira vitória rende fichas');
  assert.ok(s.wins >= 5 && s.bosses >= 1 && s.kills.curupira >= 1);
  assert.equal(s.defeats, 0);
  assert.ok(engine.mood().barriga < 100, 'lutar gasta Barriga');
  assert.ok(engine.state.minis.bichos.pets[pet.id].bond >= 1, 'o bicho que acompanha ganha laço');
  // Cada etapa libera só o seu item; o dos próximos continua trancado.
  const open = data.minis.mata.unlocks.filter(entry => entry.stage <= s.best).map(entry => entry.item);
  for (const entry of data.minis.mata.unlocks) assert.equal(engine.owned(entry.item), open.includes(entry.item), entry.item);
  assert.deepEqual(mata.info().unlocks.map(entry => entry.owned), data.minis.mata.unlocks.map(entry => open.includes(entry.item)));
  assert.equal(mata.info().unlocks.filter(entry => entry.next).length, 1, 'um só é o próximo');
});

test('mata: a Mandioca fraca perde, a etapa recomeça e a teimosia cresce até o limite (e some quando se escolhe a etapa)', () => {
  const { engine, clock } = newEngine(50);
  const mata = engine.mini('mata');
  const s = engine.state.minis.mata;
  s.best = 30;
  assert.equal(mata.select(31), true);
  const before = mata.stats();
  mataRun(engine, clock, 400);
  assert.ok(s.defeats >= 2, 'perdeu mais de uma vez');
  assert.ok(s.teimosia >= 1 && s.teimosia <= data.minis.mata.teimosiaMax);
  assert.equal(s.best, 30, 'o recorde fica');
  assert.equal(s.stage, 31);
  assert.ok(s.battle <= 1, 'a etapa recomeça');
  const after = mata.stats();
  assert.ok(after.atk > before.atk && after.hp > before.hp, 'teimosia dá bônus em tudo');
  assert.ok(Math.abs(after.teimosia - s.teimosia * data.minis.mata.teimosiaPercent / 100) < 1e-9);
  assert.equal(mata.select(30), true);
  assert.equal(s.teimosia, 0, 'escolher a etapa zera a teimosia');
});

test('mata: as setas só vão até a próxima etapa do recorde, e a pausa congela a batalha', () => {
  const { engine, clock } = newEngine(50);
  strong(engine);
  const mata = engine.mini('mata');
  const s = engine.state.minis.mata;
  assert.equal(mata.select(2), false, 'ainda não venceu a etapa 1');
  assert.equal(mata.select(0), false);
  assert.equal(mata.select(1), true);
  s.best = 3;
  assert.equal(mata.step(1), true);
  assert.equal(s.stage, 2);
  assert.equal(mata.select(5), false);
  assert.equal(mata.select(4), true);
  assert.equal(mata.step(1), false, 'depois da próxima do recorde não há mais');
  assert.equal(mata.step(-1), true);
  assert.equal(s.stage, 3);
  // Treinando numa etapa de trás, a etapa se repete (não avança).
  mata.select(2);
  mataRun(engine, clock, 200);
  assert.equal(s.stage, 2);
  assert.equal(s.best, 3);
  assert.ok(s.wins > 5, 'continuou lutando e vencendo');
  // Nem na última etapa vencida (a do recorde) ela avança sozinha: dá para treinar nela.
  mata.select(3);
  mataRun(engine, clock, 120);
  assert.equal(s.stage, 3);
  assert.equal(s.best, 3);
  assert.ok(s.bosses >= 2, 'o chefe dela caiu mais de uma vez');
  // Pausa: o relógio da batalha não anda; ao continuar, volta a andar.
  mata.setAuto(false);
  const frozen = mata.info().clock;
  mataRun(engine, clock, 20);
  assert.equal(mata.info().clock, frozen);
  assert.equal(engine.state.minis.mata.auto, false);
  mata.setAuto(true);
  mataRun(engine, clock, 5);
  assert.ok(mata.info().clock !== frozen);
});

test('mata: o clique numa criatura faz a Mandioca bater nela primeiro', () => {
  const { engine } = newEngine(50);
  strong(engine);
  const mata = engine.mini('mata');
  const s = engine.state.minis.mata;
  s.best = 9;
  mata.select(7);
  let info = mata.info();
  for (let i = 0; i < 60 && info.enemies.length < 2; i++) { engine.tick(0.1); info = mata.info(); }
  assert.ok(info.enemies.length >= 2, 'mais de uma criatura na batalha');
  const target = info.enemies[info.enemies.length - 1];
  assert.equal(mata.focus(target.uid), true);
  for (let i = 0; i < 120; i++) {
    engine.tick(0.1);
    info = mata.info();
    if (info.enemies.some(enemy => enemy.hp < enemy.max)) break;
  }
  const hurt = info.enemies.filter(enemy => enemy.hp < enemy.max);
  assert.ok(hurt.length >= 1 && hurt[0].uid === target.uid, 'o apontado apanhou primeiro');
  assert.equal(mata.focus(99999), false);
});

test('mata: o Boi-Bumbá ressuscita uma vez (e só então cai) e a etapa seguinte repete o primeiro chefe, mais forte', () => {
  const { engine } = newEngine(50);
  strong(engine, 500);
  const mata = engine.mini('mata');
  const s = engine.state.minis.mata;
  s.best = 9;
  mata.select(10);
  s.battle = 4;
  const seen = new Set();
  for (let i = 0; i < 400; i++) {
    engine.tick(0.2);
    for (const event of mata.events(0)) if (event.kind === 'status') seen.add(event.power);
    if (s.best >= 10) break;
  }
  assert.ok(seen.has('revive'), 'levantou uma vez');
  assert.equal(s.kills['boi-bumba'], 1, 'só morreu uma vez');
  assert.equal(s.best, 10);
  assert.equal(engine.owned('capa-boi-bumba'), true);
  for (let i = 0; i < 20; i++) engine.tick(0.5);
  assert.equal(s.stage, 11);
  assert.equal(mata.spec(11).boss, 'curupira');
  assert.equal(mata.spec(11).lap, 1);
  assert.equal(mata.spec(11).scene, 0);
});

test('mata: os golpes especiais pegam a Mandioca (o aviso vem antes) e o fogo machuca a cada segundo', () => {
  const { engine } = newEngine(50);
  const mata = engine.mini('mata');
  const s = engine.state.minis.mata;
  engine.state.levels.folego = 400;
  s.best = 23;
  assert.equal(mata.select(24), true);
  assert.equal(mata.spec(24).boss, 'boitata');
  s.battle = 4;
  const warned = new Set();
  const status = new Set();
  for (let i = 0; i < 400; i++) {
    engine.tick(0.1);
    const info = mata.info();
    for (const enemy of info.enemies) if (enemy.next) warned.add(enemy.next);
    if (info.hero) for (const [kind, left] of Object.entries(info.hero.status)) if (left > 0) status.add(kind);
  }
  assert.ok(warned.has('burn'), 'o aviso do fogo aparece antes');
  assert.ok(status.has('burn'), 'a Mandioca pegou fogo');
  assert.ok(mata.events(0).some(event => event.kind === 'hit' && event.side === 'hero' && event.how === 'burn'), 'o fogo machuca a cada segundo');
});

test('mata: o save guarda a etapa, o recorde e as criaturas derrotadas, e volta saneado (a batalha em andamento não vai)', () => {
  const { engine, clock } = newEngine(50);
  const mata = engine.mini('mata');
  const pet = mata.info().pets[0].id;
  const s = engine.state.minis.mata;
  s.best = 4; s.stage = 3; s.battle = 2; s.wins = 12; s.kills = { curupira: 2, 'fogo-fatuo': 7 };
  mata.choosePet(pet);
  mataRun(engine, clock, 3);
  const saved = engine.exportState();
  assert.equal(saved.minis.mata.best, 4);
  assert.equal(saved.minis.mata.companion, pet);
  assert.equal('fight' in saved.minis.mata, false);
  const back = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.t });
  assert.deepEqual([back.state.minis.mata.best, back.state.minis.mata.stage, back.state.minis.mata.companion], [4, 3, pet]);
  assert.deepEqual(back.state.minis.mata.kills, { curupira: 2, 'fogo-fatuo': 7 });
  assert.equal(back.mini('mata').info().hero, null, 'a batalha recomeça do zero ao carregar');
  const messy = JSON.parse(JSON.stringify(saved));
  messy.minis.mata = { best: 'muito', stage: 99, battle: 99, companion: 'dragao', teimosia: 99, auto: 'talvez', wins: -5, kills: { curupira: -3, fantasma: 5, boto: 'x' } };
  const clean = new GameEngine(data, messy, { rng: () => 0.5, now: () => clock.t }).state.minis.mata;
  assert.equal(clean.best, 0);
  assert.equal(clean.stage, 1, 'a etapa nunca passa da próxima do recorde');
  assert.equal(clean.battle, data.minis.mata.battles);
  assert.equal(clean.companion, '');
  assert.equal(clean.teimosia, data.minis.mata.teimosiaMax);
  assert.equal(clean.wins, 0);
  assert.deepEqual(clean.kills, {});
  const garbage = JSON.parse(JSON.stringify(saved));
  garbage.minis.mata = 'nada';
  assert.equal(new GameEngine(data, garbage, { rng: () => 0.5, now: () => clock.t }).state.minis.mata.stage, 1);
});

test('mata: o tempo passa de uma vez (advance) e a batalha acompanha sem travar nem gerar números estranhos', () => {
  const { engine } = newEngine(50);
  strong(engine, 120);
  engine.advance(900);
  const s = engine.state.minis.mata;
  assert.ok(s.wins > 20 && s.best >= 2, `lutou bastante: ${s.wins} vitórias, recorde ${s.best}`);
  for (const value of [s.stage, s.best, s.wins, s.bosses, s.defeats, s.teimosia]) assert.ok(Number.isInteger(value) && value >= 0);
  const info = engine.mini('mata').info();
  assert.ok(info.hero.hp >= 0 && info.hero.hp <= info.hero.max);
  assert.ok(Number.isFinite(engine.state.cheer) && Number.isFinite(engine.mood().barriga) && engine.mood().barriga >= 0);
});

test('mata: o São João do ano que vem descarta a batalha em andamento (nada de recorde nem troféu emprestado do ano velho)', () => {
  const { engine, clock } = newEngine(100);
  strong(engine, 900);
  const mata = engine.mini('mata');
  const s = engine.state.minis.mata;
  s.best = 19;
  mata.select(20);
  s.battle = 4;
  mataRun(engine, clock, 3);
  assert.equal(mata.info().phase, 'fight');
  assert.equal(engine.newYear(), true);
  assert.equal(mata.info().hero, null, 'a batalha velha ficou para trás');
  assert.equal(engine.state.minis.mata.best, 0);
  mataRun(engine, clock, 90);
  assert.equal(engine.state.minis.mata.best, 0, 'o chefe do ano velho não vence no ano novo');
  assert.equal(engine.owned('capa-boi-bumba'), false);
});

// --- Cordel da Mandioca (a história em 20 páginas, convidado 10) ---------------------------------------------------------------------------
test('cordel: abre com 10 convidados e libera uma página a cada 10 (a primeira com 10, a segunda com 20...)', () => {
  const c = data.minis.cordel;
  assert.equal(data.minis.windows.find(entry => entry.id === 'cordel').start, 10);
  assert.equal(c.every, 10);
  assert.equal(c.count, 20);
  assert.equal(c.pages.length, 20);
  assert.equal(new Set(c.pages.map(page => page.id)).size, 20, 'ids únicos');
  // Os quatro trechos da história: 5 páginas cada, na ordem (tradicional, maluca, épica e a festa).
  assert.deepEqual(c.pages.map(page => page.arc), [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3]);
  const som = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'src', 'som.js'), 'utf8');
  for (const page of c.pages) {
    assert.ok(page.goal >= 3 && page.goal <= 5, `${page.id}: de 3 a 5 cliques`);
    assert.equal(page.text.split('\n').length, 4, `${page.id}: quatro versos`);
    for (const field of ['title', 'hint', 'say', 'done']) assert.ok(page[field] && page[field].length > 3, `${page.id}.${field}`);
    assert.match(som, new RegExp(`['"]?${page.sound}['"]?: \\{`), `${page.id}: o som ${page.sound} existe`);
  }
  assert.match(c.pages[19].text, /\{n\}/, 'a última página diz quantos convidados a festa tem');
  for (const [level, pages] of [[1, 0], [9, 0], [10, 1], [19, 1], [20, 2], [35, 3], [100, 10], [199, 19], [200, 20], [500, 20]]) {
    const { engine } = newEngine(level);
    assert.equal(engine.mini('cordel').unlocked(), pages, `${level} convidados: ${pages} página(s)`);
  }
  assert.equal(newEngine(9).engine.miniOpen('cordel'), false);
  assert.equal(newEngine(10).engine.miniOpen('cordel'), true);
});

test('cordel: só dá para abrir as páginas liberadas, e clicar `goal` vezes completa a página e rende o prêmio uma vez só', () => {
  const { engine } = newEngine(55);
  const cordel = engine.mini('cordel');
  assert.equal(cordel.info().unlocked, 5);
  assert.equal(cordel.go(6), false);
  assert.equal(cordel.go(0), false);
  assert.equal(cordel.go(5), true);
  assert.equal(cordel.turn(1), false);
  assert.equal(cordel.turn(-1), true);
  assert.equal(cordel.info().page, 4);
  assert.deepEqual(cordel.poke(6), { ok: false, reason: 'locked' });
  // Página 1 (3 cliques): os dois primeiros só contam, o terceiro completa.
  const goal = data.minis.cordel.pages[0].goal;
  const cheer0 = engine.state.cheer;
  const tickets0 = engine.state.tickets;
  events(engine);
  for (let i = 1; i < goal; i++) {
    const got = cordel.poke(1);
    assert.deepEqual([got.ok, got.clicks, got.finished, got.reward], [true, i, false, null]);
  }
  const done = cordel.poke(1);
  assert.equal(done.finished, true);
  assert.ok(done.reward.cheer > 0 && done.reward.love > 0 || engine.state.cheer > cheer0);
  assert.equal(engine.state.tickets, tickets0, 'a página 1 não dá fichas');
  assert.ok(engine.state.cheer > cheer0);
  assert.equal(events(engine).filter(event => event.type === 'mini' && event.kind === 'page-done' && event.page === 1).length, 1);
  // Clicar de novo não passa do objetivo e não paga outra vez.
  const cheer1 = engine.state.cheer;
  const again = cordel.poke(1);
  assert.deepEqual([again.clicks, again.finished, again.reward], [goal, false, null]);
  assert.equal(engine.state.cheer, cheer1);
  assert.equal(cordel.info().list[0].done, true);
  assert.equal(cordel.info().completed, 1);
  // A quinta página (e a última) rendem fichas.
  const t1 = engine.state.tickets;
  for (let i = 0; i < data.minis.cordel.pages[4].goal; i++) cordel.poke(5);
  assert.equal(engine.state.tickets, t1 + data.minis.cordel.reward.tickets);
  const late = newEngine(200).engine;
  const t2 = late.state.tickets;
  for (let i = 0; i < data.minis.cordel.pages[19].goal; i++) late.mini('cordel').poke(20);
  assert.equal(late.state.tickets, t2 + data.minis.cordel.reward.finalTickets);
});

test('cordel: uma página nova avisa quando fecha o múltiplo de 10 (e só para convidados novos); a que abre a janela só avisa a janela', () => {
  const { engine } = newEngine(9);
  engine.state.cheer = 1e15;
  const grow = () => engine.addFame(engine.fameNeed() - engine.state.fame);
  const pageEvents = () => events(engine).filter(event => event.type === 'mini' && event.mini === 'cordel' && event.kind === 'page').map(event => event.page);
  events(engine);
  grow(); // 10
  const first = events(engine);
  assert.ok(first.some(event => event.type === 'mini-open' && event.id === 'cordel'));
  assert.deepEqual(first.filter(event => event.type === 'mini' && event.kind === 'page'), [], 'a página 1 vem com a abertura da janela');
  for (let i = 0; i < 9; i++) grow(); // 19
  assert.deepEqual(pageEvents(), []);
  grow(); // 20
  assert.deepEqual(pageEvents(), [2]);
  for (let i = 0; i < 10; i++) grow(); // 30
  assert.deepEqual(pageEvents(), [3]);
  // Quem já teve esses convidados (o recorde) não ganha o aviso de novo.
  const again = newEngine(5);
  again.engine.state.records.size = 40;
  again.engine.state.cheer = 1e15;
  for (let i = 0; i < 12; i++) again.engine.addFame(again.engine.fameNeed() - again.engine.state.fame);
  assert.deepEqual(events(again.engine).filter(event => event.type === 'mini' && event.kind === 'page'), []);
  assert.equal(again.engine.mini('cordel').unlocked(), 4);
});

test('cordel: o save guarda a página e os cliques e volta saneado; o São João do ano que vem não apaga a história', () => {
  const { engine, clock } = newEngine(100);
  const cordel = engine.mini('cordel');
  for (let i = 0; i < data.minis.cordel.pages[0].goal; i++) cordel.poke(1);
  cordel.poke(2);
  cordel.go(3);
  const saved = engine.exportState();
  assert.equal(saved.minis.cordel.page, 3);
  assert.equal(saved.minis.cordel.clicks[data.minis.cordel.pages[1].id], 1);
  const back = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.t }).mini('cordel').info();
  assert.deepEqual([back.page, back.completed, back.list[1].clicks], [3, 1, 1]);
  const messy = JSON.parse(JSON.stringify(saved));
  messy.minis.cordel = { page: 99, seen: 'muita', clicks: { quintal: 99, convite: -3, fantasma: 5 }, done: { quintal: true, convite: true, lua: 'sim' } };
  const clean = new GameEngine(data, messy, { rng: () => 0.5, now: () => clock.t }).state.minis.cordel;
  assert.equal(clean.page, 20);
  assert.equal(clean.clicks.quintal, data.minis.cordel.pages[0].goal, 'cliques limitados ao objetivo');
  assert.equal('convite' in clean.clicks, false);
  assert.deepEqual(clean.done, { quintal: true }, 'completa só quem tem todos os cliques');
  messy.minis.cordel = 'nada';
  assert.equal(new GameEngine(data, messy, { rng: () => 0.5, now: () => clock.t }).state.minis.cordel.page, 1);
  // Um ano novo recomeça a festa, mas o recorde e o cordel ficam.
  assert.equal(engine.newYear(), true);
  assert.equal(engine.state.size, 1);
  assert.equal(engine.mini('cordel').info().unlocked, 10, 'as páginas vêm do recorde');
  assert.equal(engine.mini('cordel').info().completed, 1);
  assert.equal(engine.state.minis.cordel.page, 3);
});

test('cordel: as páginas liberadas que ainda não tiveram a ação contam como pendentes (e saem da conta quando completas)', () => {
  const { engine } = newEngine(35);
  const cordel = engine.mini('cordel');
  assert.equal(cordel.pending(), 3);
  for (let i = 0; i < data.minis.cordel.pages[0].goal; i++) cordel.poke(1);
  assert.equal(cordel.pending(), 2, 'a página completa sai da conta');
  cordel.poke(2);
  assert.equal(cordel.pending(), 2, 'clicar sem completar não tira');
  engine.state.records.size = 55;
  assert.equal(cordel.pending(), 4, 'a página nova entra na conta');
  const late = newEngine(200).engine.mini('cordel');
  assert.equal(late.pending(), 20);
  for (let n = 1; n <= 20; n++) for (let i = 0; i < data.minis.cordel.pages[n - 1].goal; i++) late.poke(n);
  assert.equal(late.pending(), 0, 'tudo completo: nada pendente');
});

test('mata: com a Barriga parada (comida da fogueira) as batalhas não gastam Barriga', () => {
  const { engine, clock } = newEngine(50);
  strong(engine);
  mood(engine, clock, 50, 100);
  engine.fillBelly(2);
  mataRun(engine, clock, 60);
  assert.ok(engine.mini('mata').info().wins >= 3 || engine.state.minis.mata.wins >= 3, 'lutou');
  assert.equal(engine.mood().barriga, engine.cfg.moodMax, 'a Barriga continua 100%');
});
