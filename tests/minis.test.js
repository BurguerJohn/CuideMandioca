const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../src/data.js');
const { GameEngine } = require('../src/core.js');

// A planta em alta do dia depende da data; os testes de prêmio da Horta a deixam sem bônus (o teste dela liga o bônus e desliga de novo).
data.minis.horta.daily.bonus = 0;

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
  assert.deepEqual(Object.keys(saved.minis), ['cordel', 'bichos', 'aquario', 'horta', 'fogueira', 'palco', 'mata', 'ceu', 'bairro', 'folclore']);
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

test('índices inválidos não criam canteiros ou espetos fora do save nem travam a simpatia', () => {
  const invalid = [0.5, '0', null, NaN, Infinity, -1, 99];
  for (const [id, action] of [['horta', 'plant'], ['fogueira', 'put'], ['ceu', 'pick']]) {
    const { engine, clock } = newEngine(100);
    const model = engine.mini(id);
    if (id === 'ceu') assert.equal(model.deal().ok, true);
    events(engine);
    const before = structuredClone(engine.state.minis[id]);
    for (const index of invalid) {
      assert.equal(model[action](index).ok, false, `${id}: recusa ${String(index)}`);
      assert.deepEqual(engine.state.minis[id], before, `${id}: nenhum estado oculto ou carta inválida`);
    }
    assert.deepEqual(events(engine), [], 'as tentativas recusadas não produziram ações');
    assert.equal(model[action](0).ok, true, `${id}: a ação normal continua disponível`);
    const saved = engine.exportState();
    const loaded = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.t });
    if (id === 'ceu') {
      assert.equal(loaded.state.minis.ceu.cards.picked, 0, 'a escolha válida foi salva');
      assert.equal(loaded.mini('ceu').pick(1).ok, false, 'não permite receber outro prêmio');
    } else {
      const slots = id === 'horta' ? 'plots' : 'sticks';
      assert.deepEqual(loaded.state.minis[id][slots], saved.minis[id][slots], `${id}: a ação válida não se perde ao reabrir`);
    }
  }
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

test('aquário: a primeira pescaria do novo ano cria o peixe mesmo antes da reinicialização por um quadro', () => {
  for (const reload of [false, true]) {
    const { engine: original, clock } = newEngine();
    let engine = original;
    const growTo = size => { while (engine.state.size < size) engine.addFame(engine.fameNeed() - engine.state.fame); };
    growTo(100);
    assert.equal(engine.state.minis.aquario.started, true);
    assert.equal(engine.newYear(), true);
    if (reload) engine = new GameEngine(data, engine.exportState(), { now: () => clock.t, rng: () => 0.5 });
    growTo(10);
    assert.equal(engine.miniOpen('aquario'), true, 'o recorde mantém o aquário aberto na festa nova');
    assert.equal(engine.state.minis.aquario.started, false, 'nenhum quadro ou abertura da janela iniciou o tanque');
    events(engine);
    assert.ok(engine.fish());
    assert.equal(engine.state.minis.aquario.started, true);
    assert.equal(engine.state.minis.aquario.fish.length, data.minis.aquario.starter + 1,
      `${reload}: os peixes de saída e a prenda pescada entram uma vez cada`);
    assert.equal(events(engine).filter(event => event.type === 'mini' && event.mini === 'aquario' && event.kind === 'new-fish').length, 1);
    engine.mini('aquario').info();
    engine.mini('aquario').tick();
    assert.equal(engine.state.minis.aquario.fish.length, data.minis.aquario.starter + 1, 'desenhar ou atualizar depois não repete a entrada');
    clock.t = engine.state.fishing.nextAt;
    assert.ok(engine.fish());
    assert.equal(engine.state.minis.aquario.fish.length, data.minis.aquario.starter + 2);
    const loaded = new GameEngine(data, engine.exportState(), { now: () => clock.t, rng: () => 0.5 });
    assert.equal(loaded.mini('aquario').info().fish.length, data.minis.aquario.starter + 2, 'os dois peixes também ficam no save');
  }
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

test('aquário: capturas com tanque cheio ainda descobrem espécies e podem completar a coleção', () => {
  const { engine, clock } = newEngine(18);
  const aquario = engine.mini('aquario');
  const c = data.minis.aquario;
  aquario.info();
  while (aquario.info().fish.length < c.tankMax) {
    engine.state.fishing = { unlocked: true, ready: 1, nextAt: 0 };
    assert.ok(engine.fish());
  }
  assert.equal(aquario.info().seen.includes('pirarucu'), false);
  const back = new GameEngine(data, engine.exportState(), { rng: () => 0.999, now: () => clock.t });
  const full = back.mini('aquario');
  const before = back.state.tickets;
  back.state.fishing = { unlocked: true, ready: 1, nextAt: 0 };
  assert.ok(back.fish());
  assert.equal(full.info().fish.length, c.tankMax, 'a captura continua convertida, sem ultrapassar o limite');
  assert.ok(full.info().seen.includes('pirarucu'), 'a espécie capturada conta mesmo sem lugar no tanque');
  assert.equal(back.state.tickets, before + 1 + c.discoverTickets);
  events(back);
  for (const species of c.species) full.addFish(species.id);
  assert.deepEqual([full.info().seen.length, full.info().complete], [c.species.length, true]);
  assert.equal(events(back).filter(event => event.kind === 'complete').length, 1);
  const done = back.state.tickets;
  full.addFish('pirarucu');
  assert.equal(back.state.tickets, done + 1, 'repetida só rende a conversão');
  assert.equal(events(back).filter(event => ['discover', 'complete'].includes(event.kind)).length, 0);
});

test('aquário: crescer outro peixe preserva o progresso das bolhas sem acelerar o tempo anterior', () => {
  const { engine, clock } = newEngine(18);
  const aquario = engine.mini('aquario');
  const c = data.minis.aquario;
  aquario.info();
  for (let i = 0; i < c.growth[1]; i++) assert.ok(aquario.drop().ok);
  assert.equal(aquario.info().adults, 1);
  const firstAdultAt = clock.t;
  clock.t += c.foodEvery * 5 * 1000;
  engine.tick(0.1);
  for (let i = 0; i < c.growth[1] - 1; i++) assert.ok(aquario.drop().ok);
  clock.t = firstAdultAt + c.bubbleEvery / 2 * 1000;
  engine.tick(0.1);
  assert.equal(aquario.info().bubbles, 0, 'metade do intervalo com um adulto');
  assert.ok(aquario.drop().grew);
  engine.tick(0.1);
  assert.equal(aquario.info().adults, 2);
  assert.equal(aquario.info().bubbles, 0, 'o peixe recém-crescido não produz pelo tempo em que era pequeno');
  clock.t += c.bubbleEvery / 4 * 1000;
  engine.tick(0.1);
  assert.equal(aquario.info().bubbles, 1, 'a metade restante leva metade do tempo com dois adultos');
});

test('aquário: ações atualizam ração e pausam o relógio enquanto as bolhas estão cheias', () => {
  const { engine, clock } = newEngine(18);
  const aquario = engine.mini('aquario');
  const c = data.minis.aquario;
  aquario.info();
  for (let i = 0; i < c.foodMax; i++) assert.ok(aquario.drop().ok);
  assert.equal(aquario.info().food, 0);
  clock.t += c.foodEvery * 1000;
  assert.equal(aquario.drop().ok, true, 'a ração que já voltou pode ser usada antes do próximo tique');
  clock.t += c.bubbleEvery * c.bubbleMax * 1000;
  engine.tick(0.1);
  assert.equal(aquario.info().bubbles, c.bubbleMax);
  clock.t += c.bubbleEvery * 1000;
  assert.equal(aquario.pop().ok, true);
  engine.tick(0.1);
  assert.equal(aquario.info().bubbles, c.bubbleMax - 1, 'o tempo com o estoque cheio não cria bolha retroativa');
  clock.t += c.bubbleEvery * 1000;
  engine.tick(0.1);
  assert.equal(aquario.info().bubbles, c.bubbleMax);
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

test('fogueira: o espeto assa sozinho no ritmo do calor, fica pronto e espera (nunca queima), e comer rende o extra e a Barriga cheia', () => {
  const { engine, pass } = newEngine(30);
  const fogueira = engine.mini('fogueira');
  const c = data.minis.fogueira;
  engine.state.wood = 99;
  const heat = () => { engine.state.minis.fogueira.heat = c.heatMax; };
  // Frio: não assa (e o espeto diz que está sem calor).
  assert.equal(fogueira.put(0, 'milho').ok, true);
  assert.equal(fogueira.put(0, 'milho').reason, 'busy');
  assert.equal(fogueira.put(9, 'milho').reason, 'slot');
  pass(30);
  assert.equal(fogueira.info().sticks[0].progress, 0, 'sem calor a comida não assa');
  assert.equal(fogueira.info().sticks[0].left, null, 'sem calor não há previsão');
  // Quente: assa sozinha (crua, dourando, pronta); crua ou dourando ainda não se come.
  heat();
  assert.equal(fogueira.info().sticks[0].left, Math.ceil(c.foods[0].seconds), 'no calor cheio: os segundos da comida');
  const steps = () => { heat(); pass(1); };
  assert.equal(fogueira.info().sticks[0].state, 'cru');
  engine.state.minis.fogueira.sticks[0].progress = 0.49;
  assert.equal(fogueira.info().sticks[0].state, 'cru', 'até 49% ainda está crua');
  engine.state.minis.fogueira.sticks[0].progress = 0.5;
  assert.equal(fogueira.info().sticks[0].state, 'dourando', 'a partir de 50% está dourando');
  engine.state.minis.fogueira.sticks[0].progress = 0;
  assert.equal(fogueira.eat(0).reason, 'raw');
  while (fogueira.info().sticks[0].progress < 0.5) steps();
  assert.equal(fogueira.info().sticks[0].state, 'dourando');
  assert.equal(fogueira.eat(0).reason, 'raw');
  assert.equal(fogueira.pending(), 0, 'nada pronto ainda');
  while (!fogueira.info().sticks[0].ready) steps();
  assert.deepEqual([fogueira.info().sticks[0].state, fogueira.info().sticks[0].left, fogueira.pending()], ['pronto', 0, 1]);
  assert.ok(events(engine).some(event => event.kind === 'ready' && event.slot === 0 && event.food === 'milho'), 'avisa quando fica pronta');
  // Pronta, ela espera: o tempo passa (muito) com o fogo no máximo e ela não queima nem passa do ponto.
  for (let i = 0; i < 600; i++) steps();
  assert.deepEqual([fogueira.info().sticks[0].progress, fogueira.info().sticks[0].state, fogueira.info().sticks[0].ready], [1, 'pronto', true]);
  const depois = events(engine);
  assert.equal(depois.some(event => event.kind === 'burnt'), false, 'nunca queima');
  assert.equal(depois.some(event => event.kind === 'ready'), false, 'o aviso de pronta vem uma vez só');
  // Comer: o espeto fica livre, vem o extra do milho (Animação) e a Barriga fica 100% cheia e parada por 2 h.
  engine.state.humor.barriga = 0;
  engine.state.humor.at = engine.now();
  const cheer0 = engine.state.cheer;
  const got = fogueira.eat(0);
  assert.deepEqual([got.ok, got.food.id], [true, 'milho']);
  assert.equal(engine.mood().barriga, engine.cfg.moodMax, 'Barriga cheia');
  assert.equal(got.reward.bellyFull, c.bellyHold);
  assert.ok(Math.abs(engine.bellyHoldLeft() - c.bellyHold * 3600000) < 1000, 'parada por 2 h');
  assert.ok(engine.state.cheer - cheer0 >= 20, 'extra do milho (Animação)');
  assert.equal(fogueira.info().sticks[0], null);
  assert.equal(fogueira.eat(0).reason, 'empty');
  assert.ok(events(engine).some(event => event.kind === 'roasted' && event.food === 'milho'));
  assert.equal(engine.state.minis.fogueira.roasted, 1);
  // Cada comida dá o extra dela (a batata devolve lenha, o queijo dá Amor) e todas deixam a Barriga cheia.
  fogueira.put(1, 'batata');
  fogueira.put(2, 'queijo');
  fogueira.put(3, 'linguica');
  while (fogueira.pending() < 3) steps();
  engine.state.humor.amor = 0;
  engine.state.humor.barriga = 0;
  engine.state.humor.holdUntil = 0;
  engine.state.humor.at = engine.now();
  const wood0 = engine.state.wood;
  assert.equal(fogueira.eat(1).ok, true);
  assert.equal(engine.state.wood - wood0, 4, 'a batata devolve lenha');
  assert.equal(fogueira.eat(2).ok, true);
  assert.equal(Math.round(engine.mood().amor), 8, 'o queijo coalho dá Amor');
  assert.equal(fogueira.eat(3).ok, true);
  assert.equal(Math.round(engine.mood().barriga), engine.cfg.moodMax);
  assert.equal(engine.state.minis.fogueira.roasted, 4);
  // Vazio de novo: dá para pôr outra comida.
  assert.equal(fogueira.put(0, 'queijo').ok, true);
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
  assert.deepEqual([clean.mini('fogueira').info().sticks[0].progress, clean.mini('fogueira').info().sticks[0].ready], [1, true], 'progresso de mais vira só "pronta"');
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

test('palco: salvar um show encerrado conserva as estrelas e o prêmio uma vez, sem premiar antes do prazo', () => {
  for (const offset of [-1, 0, 1]) {
    const { engine, clock } = newEngine(38);
    const palco = engine.mini('palco');
    const start = clock.t;
    const notes = palco.chart('xote');
    assert.equal(palco.start('xote').ok, true);
    for (const note of notes) {
      clock.t = start + note.t;
      assert.equal(palco.hit(note.lane).judge, 'perfect');
    }
    const end = start + notes.at(-1).t + 1200;
    clock.t = end + offset;
    events(engine);
    const cheer = engine.state.cheer;
    const saved = engine.exportState();
    const done = offset > 0;
    assert.equal(saved.minis.palco.shows, done ? 1 : 0, `${offset}: a gravação respeita o instante de término do show`);
    assert.equal(saved.minis.palco.best.xote || 0, done ? 3 : 0);
    assert.equal(saved.tickets, done ? 1 + data.minis.palco.firstThree.tickets : 0);
    assert.equal(saved.minis.palco.cooldownAt, done ? end + data.minis.palco.wait * 1000 : 0);
    assert.equal(!!palco.info().show, !done, 'salvar antes do fim mantém a música ao vivo');
    assert.equal(events(engine).filter(event => event.kind === 'show-end').length, done ? 1 : 0);
    if (done) assert.ok(saved.cheer > cheer, 'a Animação do show também entra no save');
    else assert.equal(saved.cheer, cheer);
    assert.deepEqual(engine.exportState(), saved, 'salvar outra vez não repete o prêmio');
    const loaded = new GameEngine(data, saved, { now: () => clock.t, rng: () => 0.5 });
    loaded.mini('palco').tick();
    assert.equal(loaded.state.tickets, saved.tickets);
    assert.equal(loaded.state.minis.palco.shows, saved.minis.palco.shows);
    assert.equal(loaded.state.minis.palco.best.xote || 0, done ? 3 : 0);
    assert.equal(loaded.mini('palco').info().show, null, 'a carga só retoma o resultado permanente');
  }
});

test('palco: começar um novo ano depois do show encerra o prêmio da festa antiga antes do reset', () => {
  for (const offset of [-1, 1]) {
    const { engine, clock } = newEngine(100);
    const palco = engine.mini('palco');
    const start = clock.t;
    const notes = palco.chart('xote');
    assert.equal(palco.start('xote').ok, true);
    for (const note of notes) { clock.t = start + note.t; palco.hit(note.lane); }
    clock.t = start + notes.at(-1).t + 1200 + offset;
    events(engine);
    assert.equal(engine.newYear(), true);
    const tickets = offset > 0 ? 1 + data.minis.palco.firstThree.tickets : 0;
    assert.equal(engine.state.tickets, tickets, `${offset}: só o show já encerrado deixa o prêmio para o próximo ano`);
    assert.equal(engine.state.size, 1);
    assert.equal(engine.state.minis.palco.show, null);
    assert.equal(engine.state.minis.palco.shows, 0, 'o palco do novo ano começa vazio');
    assert.equal(events(engine).filter(event => event.kind === 'show-end').length, offset > 0 ? 1 : 0);
    engine.mini('palco').tick();
    assert.equal(engine.state.tickets, tickets, 'o quadro seguinte não repete o pagamento');
  }
});

test('palco: um clique entre tiques encerra o combo quando uma nota anterior venceu', () => {
  const { engine, clock } = newEngine(38);
  const palco = engine.mini('palco');
  const start = clock.t;
  const notes = palco.chart('xote');
  palco.start('xote');
  clock.t = start + notes[0].t;
  assert.equal(palco.hit(notes[0].lane).combo, 1);
  events(engine);
  clock.t = start + notes[2].t;
  assert.equal(palco.hit(notes[2].lane).combo, 1, 'a segunda nota perdida interrompe a sequência antes do novo acerto');
  assert.equal(palco.info().show.notes[1].state, 'miss');
  assert.equal(palco.info().show.maxCombo, 1);
  assert.equal(events(engine).filter(event => event.kind === 'miss').length, 1);
  engine.tick(0.1);
  assert.equal(events(engine).filter(event => event.kind === 'miss').length, 0, 'o próximo tique não repete o erro');
});

test('palco: show vencido termina antes da próxima ação e o descanso conta da hora de término', () => {
  for (const action of ['start', 'hit', 'abort']) {
    const { engine, clock } = newEngine(38);
    const palco = engine.mini('palco');
    const notes = palco.chart('xote');
    const start = clock.t;
    palco.start('xote');
    for (const note of notes) {
      clock.t = start + note.t;
      palco.hit(note.lane);
    }
    const end = start + notes.at(-1).t + 1200;
    clock.t = end + (data.minis.palco.wait + 1) * 1000;
    events(engine);
    const got = action === 'start' ? palco.start('xote') : action === 'hit' ? palco.hit(0) : palco.abort();
    assert.equal(engine.state.minis.palco.shows, 1, action);
    assert.equal(palco.info().cooldown, 0, action);
    assert.equal(events(engine).filter(event => event.kind === 'show-end').length, 1, action);
    if (action === 'start') assert.deepEqual([got.ok, got.practice], [true, false]);
    else {
      assert.equal(got.ok, false, action);
      assert.deepEqual([palco.info().last.aborted, palco.info().last.stars], [false, 3], action);
    }
  }
});

test('bichos: milho e presente vencidos ficam disponíveis no clique e após recarregar, sem esperar um tique', () => {
  for (const reload of [false, true]) {
    const { engine, clock } = newEngine(12);
    let active = engine;
    let bichos = active.mini('bichos');
    const c = data.minis.bichos;
    for (let i = 0; i < c.grainMax; i++) assert.ok(bichos.feed('galinha').ok);
    assert.ok(bichos.collect('galinha').ok);
    clock.t += c.grainEvery * c.grainMax * 1000;
    assert.equal(bichos.info().grain, c.grainMax, 'a janela vê o milho que voltou desde o último quadro');
    for (let i = 0; i < c.grainMax; i++) assert.ok(bichos.feed('galinha').ok);
    assert.equal(bichos.info().pets.find(pet => pet.id === 'galinha').ready, false);
    const saved = active.exportState();
    clock.t = active.state.minis.bichos.pets.galinha.giftAt;
    if (reload) {
      active = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.t });
      bichos = active.mini('bichos');
    }
    events(active);
    assert.equal(bichos.info().pets.find(pet => pet.id === 'galinha').ready, true, 'o clique decide pelo presente disponível agora');
    assert.ok(bichos.collect('galinha').ok);
    assert.equal(bichos.collect('galinha').ok, false, 'o presente só é entregue uma vez');
    active.tick(0.1);
    const emitted = events(active);
    assert.equal(emitted.filter(event => event.kind === 'gift-ready').length, 1);
    assert.equal(emitted.filter(event => event.kind === 'gift').length, 1);
    assert.equal(active.state.minis.bichos.gifts, 2);
  }
});

test('bichos: colher no prazo atualiza o presente antes de verificar a disponibilidade', () => {
  const { engine, clock, pass } = newEngine(12);
  const bichos = engine.mini('bichos');
  const c = data.minis.bichos;
  for (let i = 0; i < c.grainMax; i++) bichos.feed('galinha');
  bichos.collect('galinha');
  pass(c.grainEvery * c.grainMax);
  for (let i = 0; i < c.grainMax; i++) bichos.feed('galinha');
  clock.t = engine.state.minis.bichos.pets.galinha.giftAt;
  assert.equal(bichos.collect('galinha').ok, true, 'não exige consultar info nem esperar um quadro antes de colher');
  assert.equal(bichos.collect('galinha').ok, false);
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

test('céu: atrasar o relógio não revive disparos vencidos nem paga uma Grande Final antes de juntar foguetes novos', () => {
  const c = data.minis.ceu;
  for (const back of [60000, 30 * 60000]) for (const elapsed of [1000, c.volleyMs + 1000]) {
    const { engine, clock } = newEngine(60);
    const ceu = engine.mini('ceu');
    const shotAt = clock.t;
    for (let i = 0; i < c.volley - 1; i++) assert.equal(ceu.launch().ok, true);
    assert.equal(ceu.info().volley, c.volley - 1);
    clock.t += elapsed;
    engine.tick(0.25);
    assert.equal(ceu.info().volley, elapsed > c.volleyMs ? 0 : c.volley - 1);
    const saved = engine.exportState();
    clock.t -= back;
    engine.tick(0.25);
    const rewound = clock.t;
    const loaded = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.t });
    for (const current of [engine, loaded]) {
      clock.t = rewound;
      const sky = current.mini('ceu');
      assert.equal(sky.info().volley, 0, 'disparos com timestamp no futuro não voltam a ser recentes');
      clock.t = shotAt;
      assert.equal(sky.info().volley, 0, 'a sequência descartada não reaparece quando o relógio alcança o timestamp antigo');
      const tickets = current.state.tickets;
      const shot = sky.launch();
      assert.equal(shot.ok, true, 'o próximo foguete continua disponível');
      assert.equal(shot.volley, 1, 'começa uma sequência nova');
      assert.equal(shot.finale, null, 'um disparo novo não completa os disparos vencidos');
      assert.equal(current.state.tickets, tickets);
      assert.equal(current.state.minis.ceu.finales, 0);
      assert.equal(current.state.minis.ceu.fired, c.volley);
    }
  }
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

test('céu: frenesi da simpatia respeita o relógio e preserva apenas a duração restante maior', () => {
  for (const [initial, elapsed, remaining] of [[0, 0, 15], [60, 5, 55], [10, 11, 15]]) {
    const { engine, clock } = newEngine(60);
    if (initial) engine.startFrenzy(initial);
    clock.t += elapsed * 1000;
    events(engine);
    engine.state.minis.ceu.cards = { ids: ['banho', 'faca', 'ovo'], picked: null };
    assert.equal(engine.mini('ceu').pick(0).reward.frenzy, 15);
    const runtime = engine.state.runtime;
    assert.equal(runtime.frenzyLeft, remaining);
    assert.equal(runtime.frenzyUntil, clock.t + remaining * 1000);
    assert.equal(events(engine).filter(event => event.type === 'frenzy-start').length, 1, 'um único aviso de início');
    clock.t += remaining * 1000 - 1;
    assert.equal(engine.runtimeActive('frenzy'), true);
    clock.t++;
    assert.equal(engine.runtimeActive('frenzy'), false, 'o frenesi vence no prazo sem precisar de um tique');
    const value = engine.stepValue();
    engine.step();
    assert.equal(runtime.lastStep, value, 'um passo depois do prazo não recebe o multiplicador');
  }
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
function newMataEngine(level = 50, save = null) {
  const fixture = newEngine(level, save);
  fixture.engine.mini('mata').setVisibilityCheck(() => true);
  return fixture;
}
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
  const { engine } = newMataEngine(49);
  assert.equal(engine.miniOpen('mata'), false);
  engine.state.records.size = 50;
  assert.equal(engine.miniOpen('mata'), true);
});

test('mata: liberar o minigame ou carregar um save não inicia a luta sem uma janela visível', () => {
  const { engine, clock } = newEngine(50);
  const mata = engine.mini('mata');
  const before = structuredClone(engine.state.minis.mata);
  engine.advance(120);
  mata.tick(10);
  assert.deepEqual(engine.state.minis.mata, before);
  assert.equal(mata.info().hero, null);
  assert.equal(mata.info().paused, true);
  assert.deepEqual(mata.events(), []);
  const saved = engine.exportState();
  const back = new GameEngine(data, saved, { now: () => clock.t, rng: () => 0.5 });
  back.advance(120);
  assert.deepEqual(back.state.minis.mata, saved.minis.mata, 'a carga não autoriza luta em segundo plano');
  assert.equal(back.mini('mata').info().hero, null);
  assert.equal(back.mini('mata').info().auto, true, 'a pausa por visibilidade não altera a escolha do botão');
});

test('mata: os chefes exigem melhorias, mas a progressão continua possível com uma Mandioca preparada', () => {
  const weak = newMataEngine(50);
  strong(weak.engine, 30);
  const mata = weak.engine.mini('mata');
  for (let i = 0; i < 4000 && mata.info().phase !== 'lose'; i++) {
    weak.clock.t += 50;
    weak.engine.tick(0.05);
  }
  assert.equal(mata.info().phase, 'lose');
  assert.equal(mata.info().boss, true, 'as criaturas comuns ainda permitem chegar ao primeiro chefe');
  assert.equal(weak.engine.state.minis.mata.best, 0, 'o primeiro chefe barra os atributos baixos');
  assert.equal(weak.engine.owned('cabelo-curupira'), false, 'perder não libera o troféu');
  const prepared = newMataEngine(50);
  strong(prepared.engine, 120);
  mood(prepared.engine, prepared.clock, 100, 100);
  mataRun(prepared.engine, prepared.clock, 300);
  assert.ok(prepared.engine.state.minis.mata.best >= 3, 'melhorar os atributos permite superar vários chefes');
  assert.equal(prepared.engine.owned('cabelo-curupira'), true);
});

test('mata: os status vêm das melhorias, da comida, da felicidade e do bicho, que dá o mesmo bônus para todos', () => {
  const { engine, clock } = newMataEngine(50);
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
  const { engine, clock } = newMataEngine(50);
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
  const { engine, clock } = newMataEngine(50);
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

test('mata: a derrota conserva a luta visível até recomeçar, enquanto o save retoma a primeira batalha', () => {
  const { engine, clock } = newMataEngine(60);
  strong(engine, 30);
  const mata = engine.mini('mata');
  for (let i = 0; i < 4000 && mata.info().phase !== 'lose'; i++) {
    clock.t += 50;
    engine.tick(0.05);
  }
  const lost = mata.info();
  assert.equal(lost.phase, 'lose');
  assert.equal(lost.wins, data.minis.mata.battles, 'a Mandioca venceu as quatro batalhas antes de perder para o chefe');
  assert.ok(lost.enemies.some(enemy => enemy.boss && !enemy.dead));
  assert.equal(lost.battle, data.minis.mata.battles, 'a cena ainda mostra a batalha do chefe');
  assert.equal(lost.boss, true);
  assert.equal(engine.state.minis.mata.battle, 0, 'o checkpoint já está preparado para recomeçar');
  mata.setAuto(false);
  clock.t += 1000;
  engine.tick(1);
  assert.equal(mata.info().battle, lost.battle, 'pausar o desmaio preserva a identificação da luta');
  const back = new GameEngine(data, engine.exportState(), { rng: () => 0.5, now: () => clock.t });
  assert.equal(back.mini('mata').info().battle, 0, 'reabrir abandona a derrota e retoma o checkpoint');
  assert.equal(back.mini('mata').info().boss, false);
  mata.setAuto(true);
  for (let i = 0; i < 70 && mata.info().phase === 'lose'; i++) {
    clock.t += 50;
    engine.tick(0.05);
  }
  assert.equal(mata.info().phase, 'intro');
  assert.equal(mata.info().battle, 0);
  assert.equal(mata.info().boss, false, 'a identificação muda junto com a criatura da batalha nova');
});

test('mata: as setas só vão até a próxima etapa do recorde, e a pausa congela a batalha', () => {
  const { engine, clock } = newMataEngine(50);
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

test('mata: escolher uma etapa descarta os eventos e o tempo parcial da batalha cancelada', () => {
  const { engine, pass } = newMataEngine(60);
  const mata = engine.mini('mata');
  for (let i = 0; i < 4; i++) pass(1);
  mata.tick(0.04);
  const old = mata.events();
  assert.ok(old.some(event => event.kind === 'hit'), 'a batalha antiga tem golpes para a janela consumir');
  const seq = old.at(-1).seq;
  assert.equal(mata.select(2), false, 'uma escolha trancada não cancela a batalha');
  assert.deepEqual(mata.events(), old);
  engine.state.minis.mata.best = 1;
  assert.equal(mata.step(1), true);
  assert.deepEqual(mata.events(), [], 'nenhum golpe antigo toca na nova etapa');
  mata.tick(0.02);
  assert.equal(mata.info().hero, null, 'o resto de um tique antigo não avança a etapa nova');
  mata.tick(0.05);
  assert.ok(mata.events(seq).some(event => event.kind === 'begin' && event.stage === 2), 'a sequência dos eventos novos continua após o cancelamento');
});

test('mata: o clique numa criatura faz a Mandioca bater nela primeiro', () => {
  const { engine } = newMataEngine(50);
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
  const { engine } = newMataEngine(50);
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
  const { engine } = newMataEngine(50);
  const mata = engine.mini('mata');
  const s = engine.state.minis.mata;
  engine.state.levels.folego = 3000;
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
  const { engine, clock } = newMataEngine(50);
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

test('mata: salvar durante a comemoração retoma a próxima batalha sem perder o avanço já premiado', () => {
  for (const mode of ['battle', 'first-boss', 'training-boss']) {
    const { engine, clock } = newMataEngine(50);
    strong(engine);
    const mata = engine.mini('mata');
    const state = engine.state.minis.mata;
    if (mode !== 'battle') state.battle = data.minis.mata.battles;
    if (mode === 'training-boss') state.best = 1;
    for (let i = 0; i < 2000 && mata.info().phase !== 'win'; i++) {
      clock.t += 50;
      mata.tick(0.05);
    }
    assert.equal(mata.info().phase, 'win', `${mode}: a batalha terminou e pagou seu prêmio`);
    const wins = state.wins;
    const tickets = engine.state.tickets;
    const cheer = engine.state.cheer;
    const live = [state.stage, state.battle];
    const saved = engine.exportState();
    assert.equal(mata.info().phase, 'win', 'salvar conserva a comemoração na sessão atual');
    assert.deepEqual([state.stage, state.battle], live, 'a projeção do save não avança o estado vivo antes da comemoração');
    assert.deepEqual(engine.exportState().minis.mata, saved.minis.mata, 'exportar de novo mantém o mesmo checkpoint');
    const expected = mode === 'battle' ? [1, 1] : mode === 'first-boss' ? [2, 0] : [1, 0];
    const back = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.t });
    assert.deepEqual([back.state.minis.mata.stage, back.state.minis.mata.battle], expected,
      `${mode}: a carga não reabre a batalha já vencida`);
    assert.equal(back.state.minis.mata.wins, wins);
    assert.equal(back.state.tickets, tickets, 'a vitória salva não paga fichas de novo');
    assert.equal(back.state.cheer, cheer, 'a vitória salva não paga Animação de novo');
    const again = new GameEngine(data, back.exportState(), { rng: () => 0.5, now: () => clock.t });
    assert.deepEqual([again.state.minis.mata.stage, again.state.minis.mata.battle], expected, 'uma segunda carga conserva o checkpoint');
    assert.equal(again.state.minis.mata.wins, wins);
    assert.equal(again.state.tickets, tickets);
    assert.equal(again.state.cheer, cheer);
    clock.t += 1650;
    mata.tick(1.65);
    assert.deepEqual([state.stage, state.battle], expected, 'continuar sem recarregar chega ao mesmo checkpoint');
    assert.equal(state.wins, wins, 'a comemoração não paga outra vitória');
    back.mini('mata').setVisibilityCheck(() => true);
    back.mini('mata').tick(0.05);
    assert.deepEqual(back.mini('mata').probe().fight, {
      phase: 'intro', n: expected[0], battle: expected[1]
    }, 'a batalha nova nasce no checkpoint restaurado');
  }
});

test('mata: o tempo passa de uma vez (advance) e a batalha acompanha sem travar nem gerar números estranhos', () => {
  const { engine } = newMataEngine(50);
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
  const { engine, clock } = newMataEngine(100);
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
  const { engine, clock } = newMataEngine(50);
  strong(engine);
  mood(engine, clock, 50, 100);
  engine.fillBelly(2);
  mataRun(engine, clock, 60);
  assert.ok(engine.mini('mata').info().wins >= 3 || engine.state.minis.mata.wins >= 3, 'lutou');
  assert.equal(engine.mood().barriga, engine.cfg.moodMax, 'a Barriga continua 100%');
});

// Planta e colhe `id` no canteiro `slot` (o tempo da planta passa de uma vez).
function harvestCrop(engine, clock, id, slot = 0) {
  const horta = engine.mini('horta');
  assert.equal(horta.plant(slot, id).ok, true, `planta ${id}`);
  clock.t += data.minis.horta.crops.find(entry => entry.id === id).minutes * 60000 + 1;
  return horta.harvest(slot);
}

test('horta: cada planta colhida pela primeira vez deixa +10% de Animação para sempre (uma vez por planta, com as 5 vai a +50%)', () => {
  const { engine, clock } = newEngine(22);
  const c = data.minis.horta;
  const base = engine.multiplier();
  assert.equal(engine.hortaBonus(), 0);
  // O bônus de 10 min da colheita passa antes de medir só o fixo.
  // (Colher seis vezes também libera o carrinho de legumes dos prêmios dos minigames: o bônus dele fica de fora da conta.)
  const fixed = () => { clock.t += c.buffMinutes * 60000 + 1000; return engine.multiplier() / base / (1 + engine.premioBonus()); };
  const first = harvestCrop(engine, clock, 'milho');
  assert.deepEqual([first.first, first.permanent, first.total], [true, 10, 10]);
  assert.ok(Math.abs(fixed() - 1.1) < 1e-9, 'milho: ×1,1');
  const again = harvestCrop(engine, clock, 'milho');
  assert.deepEqual([again.first, again.permanent], [false, 0], 'colher de novo não soma');
  assert.ok(Math.abs(fixed() - 1.1) < 1e-9);
  assert.equal(harvestCrop(engine, clock, 'amendoim').total, 20);
  assert.ok(Math.abs(fixed() - 1.2) < 1e-9, 'duas plantas: ×1,2');
  for (const id of ['batata-doce', 'mandioca', 'abobora']) harvestCrop(engine, clock, id);
  assert.ok(Math.abs(fixed() - 1.5) < 1e-9, 'as 5 plantas: ×1,5');
  assert.ok(Math.abs(engine.hortaBonus() - 0.5) < 1e-9);
  assert.equal(engine.mini('horta').info().bonus, engine.hortaBonus());
  // O save lembra, e um save mexido não inventa plantas.
  const saved = engine.exportState();
  const back = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.t });
  assert.ok(Math.abs(back.hortaBonus() - 0.5) < 1e-9, 'o save guarda o bônus fixo');
  for (const lixo of ['x', -3, null, [1], { milho: -1, abobora: 'sim', fantasma: 9 }]) {
    const messy = JSON.parse(JSON.stringify(saved));
    messy.minis.horta.harvested = lixo;
    const clean = new GameEngine(data, messy, { rng: () => 0.5, now: () => clock.t });
    const bonus = clean.hortaBonus();
    assert.ok(Number.isFinite(bonus) && bonus >= 0 && bonus <= 0.5 + 1e-9, `harvested ${JSON.stringify(lixo)}: ${bonus}`);
  }
});

test('horta: toda colheita dá o bônus da planta por 10 min (Animação, Ritmo, Refresco); a mesma planta recomeça a contagem e plantas diferentes somam', () => {
  const { engine, clock } = newEngine(22);
  const c = data.minis.horta;
  const ten = c.buffMinutes * 60000;
  assert.deepEqual(c.crops.map(entry => entry.buff.kind), ['cheer', 'speed', 'recovery', 'cheer', 'crit']);
  // Milho (Animação +10%): vale 10 min e depois acaba.
  const base = engine.multiplier();
  const got = harvestCrop(engine, clock, 'milho');
  assert.ok(Math.abs(engine.multiplier() / base - 1.21) < 1e-9, 'milho: ×1,1 do fixo vezes ×1,1 de 10 min');
  assert.deepEqual(got.buff, { kind: 'cheer', value: 0.1, minutes: 10 });
  assert.equal(engine.hortaBuff('cheer'), 0.1);
  assert.deepEqual(engine.hortaBuffs().map(buff => buff.crop), ['milho']);
  // Mandioca (Animação +25%) soma com o milho; colher o milho de novo só recomeça a contagem dele.
  const milhoAntes = engine.hortaBuffs().find(buff => buff.crop === 'milho').until;
  engine.mini('horta').plant(1, 'mandioca');
  engine.mini('horta').plant(2, 'milho');
  clock.t += c.crops[3].minutes * 60000 + 1;
  engine.mini('horta').harvest(1);
  assert.ok(Math.abs(engine.hortaBuff('cheer') - 0.25) < 1e-9, 'o milho de antes já acabou (a mandioca demora mais que 10 min)');
  engine.mini('horta').harvest(2);
  assert.ok(Math.abs(engine.hortaBuff('cheer') - 0.35) < 1e-9, 'plantas diferentes somam');
  const milhoDepois = engine.hortaBuffs().find(buff => buff.crop === 'milho').until;
  assert.ok(milhoDepois > milhoAntes, 'colher o milho de novo recomeça a contagem dele');
  harvestCrop(engine, clock, 'milho', 3);
  assert.ok(Math.abs(engine.hortaBuff('cheer') - 0.35) < 1e-9, 'a mesma planta não soma duas vezes');
  // Depois dos 10 min nenhum vale; amendoim (Ritmo +15%) e batata-doce (Refresco +50%).
  clock.t += ten + 1000;
  assert.equal(engine.hortaBuffs().length, 0, 'depois dos 10 min nenhum vale');
  const speed0 = engine.speed();
  const rest0 = engine.recovery();
  harvestCrop(engine, clock, 'amendoim');
  assert.ok(Math.abs(engine.speed() / speed0 - 1.15) < 1e-9, 'Ritmo +15%');
  clock.t += ten + 1000;
  harvestCrop(engine, clock, 'batata-doce', 1);
  assert.ok(Math.abs(engine.recovery() / rest0 - 1.5) < 1e-9, 'Refresco +50%');
  assert.ok(Math.abs(engine.speed() / speed0 - 1) < 1e-9, 'o Ritmo do amendoim já acabou');
});

test('horta: o bônus da abóbora é a chance de “Olha a cobra!” (passo ×3) por 10 min, o save guarda e não aceita lixo nem eternidade', () => {
  const clock = { t: 1_000_000_000 };
  const engine = new GameEngine(data, null, { rng: () => 0.1, now: () => clock.t });
  engine.state.size = 22;
  engine.state.records.size = 22;
  const horta = engine.mini('horta');
  const c = data.minis.horta;
  horta.plant(0, 'abobora');
  clock.t += c.crops[4].minutes * 60000 + 1;
  engine.state.humor = { amor: 50, barriga: 50, at: clock.t, holdUntil: 0 };
  engine.step();
  const normal = engine.state.runtime.lastStep;
  assert.ok(horta.harvest(0).ok);
  assert.equal(engine.hortaBuff('crit'), 0.15);
  engine.step();
  assert.ok(Math.abs(engine.state.runtime.lastStep / normal - data.config.cobraMult * 1.1) < 1e-9, 'com a sorte de 10% e o bônus de 15% o passo vira ×3 (e ×1,1 do bônus fixo da abóbora)');
  // O save guarda a contagem; o que sobra do bônus é limitado a 10 min.
  const saved = engine.exportState();
  const back = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.t });
  assert.equal(back.hortaBuff('crit'), 0.15, 'o save guarda o bônus que ainda vale');
  for (const lixo of [1e18, 'x', NaN, -5, null]) {
    const messy = JSON.parse(JSON.stringify(saved));
    messy.minis.horta.buffs = { abobora: lixo, fantasma: clock.t + 1e9 };
    const clean = new GameEngine(data, messy, { rng: () => 0.5, now: () => clock.t });
    const left = (clean.hortaBuffs()[0]?.until ?? clock.t) - clock.t;
    assert.ok(left >= 0 && left <= c.buffMinutes * 60000, `buffs ${lixo}: ${left}`);
    assert.ok(clean.hortaBuffs().every(buff => buff.crop !== 'fantasma'));
  }
  clock.t += c.buffMinutes * 60000 + 1;
  assert.equal(engine.hortaBuff('crit'), 0, 'passados os 10 min acaba');
});

test('céu: foguete reabastecido no prazo exato pode ser lançado antes do próximo tique', () => {
  for (const reload of [false, true]) for (const readFirst of [false, true]) {
    const { engine, clock } = newEngine(100);
    const cfg = data.minis.ceu;
    for (let i = 0; i < cfg.rocketMax; i++) assert.equal(engine.mini('ceu').launch().ok, true);
    assert.equal(engine.state.minis.ceu.rockets, 0);
    clock.t += cfg.rocketEvery * 1000;
    const active = reload ? new GameEngine(data, engine.exportState(), { rng: () => 0.5, now: () => clock.t }) : engine;
    const ceu = active.mini('ceu');
    if (readFirst) assert.equal(ceu.info().rockets, 1, 'o status já mostra a carga disponível');
    assert.equal(ceu.launch().ok, true, `lança sem tique (reload=${reload}, info=${readFirst})`);
    assert.equal(ceu.info().rockets, 0);
    assert.equal(ceu.info().rockets, 0, 'ler de novo não reabastece duas vezes');
    assert.equal(ceu.info().rocketIn, cfg.rocketEvery);
  }
});

test('horta: água reabastecida no prazo exato pode regar antes do próximo tique', () => {
  for (const reload of [false, true]) for (const readFirst of [false, true]) {
    const { engine, clock } = newEngine(100);
    const cfg = data.minis.horta;
    const horta = engine.mini('horta');
    for (let i = 0; i < cfg.waterMax; i++) {
      assert.equal(horta.plant(i, 'milho').ok, true);
      assert.equal(horta.water(i).ok, true);
    }
    assert.equal(engine.state.minis.horta.water, 0);
    clock.t += cfg.waterEvery * 1000;
    const active = reload ? new GameEngine(data, engine.exportState(), { rng: () => 0.5, now: () => clock.t }) : engine;
    const current = active.mini('horta');
    if (readFirst) assert.equal(current.info().water, 1, 'o status já mostra a água disponível');
    assert.equal(current.water(0).ok, true, `rega sem tique (reload=${reload}, info=${readFirst})`);
    assert.equal(current.info().water, 0);
    assert.equal(current.info().water, 0, 'ler de novo não reabastece duas vezes');
    assert.equal(active.state.minis.horta.waterAt, clock.t);
  }
});

for (const [id, activeKey, nextKey, interval] of [
  ['ceu', 'star', 'starAt', 'starEvery'], ['horta', 'crow', 'crowAt', 'crowEvery']
]) test(`${id}: recarregar durante uma visita fugaz não cria outra imediatamente`, () => {
  const { engine, clock } = newEngine(100);
  const cfg = data.minis[id];
  if (id === 'horta') engine.mini(id).plant(0, 'abobora');
  engine.tick(0.1);
  clock.t = engine.state.minis[id][nextKey];
  engine.tick(0.1);
  assert.ok(engine.state.minis[id][activeKey], 'a visita apareceu pelo relógio normal');
  const saved = engine.exportState();
  const back = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.t });
  back.tick(0.1);
  assert.equal(back.state.minis[id][activeKey], null, 'a visita antiga não volta no primeiro quadro');
  const untilNext = back.state.minis[id][nextKey] - clock.t;
  assert.ok(untilNext >= cfg[interval][0] * 1000 && untilNext <= cfg[interval][1] * 1000, 'a próxima visita espera o intervalo configurado');
  assert.ok(!events(back).some(event => event.mini === id && event.kind === activeKey));
  const scheduled = back.state.minis[id][nextKey];
  const again = new GameEngine(data, back.exportState(), { rng: () => 0.5, now: () => clock.t });
  assert.equal(again.state.minis[id][nextKey], scheduled, 'reabrir enquanto espera preserva o prazo');
});

test('céu: pedir à estrela depois do prazo não dá prêmio mesmo antes do próximo tique', () => {
  const { engine, clock } = newEngine(60);
  const ceu = engine.mini('ceu');
  engine.state.minis.ceu.starAt = clock.t - 1;
  engine.tick(0.1);
  assert.ok(ceu.info().star);
  events(engine);
  const before = { tickets: engine.state.tickets, cheer: engine.state.cheer, love: engine.state.humor.amor, wood: engine.state.wood };
  clock.t = engine.state.minis.ceu.star.until;
  assert.deepEqual(ceu.wish(), { ok: false, reason: 'none' });
  assert.equal(engine.state.minis.ceu.wishes, 0);
  assert.equal(ceu.info().star, null);
  assert.deepEqual({ tickets: engine.state.tickets, cheer: engine.state.cheer, love: engine.state.humor.amor, wood: engine.state.wood }, before);
  engine.tick(0.1);
  assert.equal(events(engine).filter(event => event.kind === 'star-gone').length, 1);
});

test('horta: corvo com prazo vencido come antes de um clique de espantar ou colher', () => {
  for (const action of ['scare', 'harvest', 'water', 'plant']) {
    const { engine, clock } = newEngine(30);
    const horta = engine.mini('horta');
    horta.plant(0, 'milho');
    engine.state.minis.horta.crowAt = clock.t - 1;
    engine.tick(0.1);
    assert.equal(horta.info().crow.plot, 0);
    events(engine);
    const before = { tickets: engine.state.tickets, cheer: engine.state.cheer };
    clock.t = engine.state.minis.horta.plots[0].readyAt;
    const got = horta[action](0);
    assert.equal(got.ok, action === 'plant', action);
    assert.equal(engine.state.minis.horta.eaten, 1, action);
    assert.equal(engine.state.minis.horta.scared, 0, action);
    assert.equal(horta.info().crow, null, action);
    assert.equal(horta.info().plots[0].crop, action === 'plant' ? 'milho' : null, action);
    assert.deepEqual({ tickets: engine.state.tickets, cheer: engine.state.cheer }, before, action);
    engine.tick(0.1);
    assert.equal(events(engine).filter(event => event.kind === 'crow-ate').length, 1, action);
  }
});

test('mata: o ano novo descarta eventos da batalha anterior e preserva a sequência dos próximos', () => {
  const { engine, clock } = newMataEngine(100);
  const mata = engine.mini('mata');
  mataRun(engine, clock, 4);
  assert.ok(mata.events(0).some(event => event.kind === 'hit'), 'a janela aberta tem golpes ainda não exibidos');
  const seen = mata.info().seq;
  assert.equal(engine.newYear(), true);
  assert.deepEqual(mata.events(0), [], 'a janela não repete os golpes do ano anterior ao reaparecer');
  engine.tick(0.1);
  assert.ok(mata.events(seen).some(event => event.kind === 'begin'), 'quem já viu a sequência antiga recebe a batalha nova');
});

// --- Visitas do folclore (src/mini-folclore.js): 20 eventos aleatórios, liberados pelas criaturas derrotadas na Mata ---------------------
const mataIds = () => [...data.minis.mata.creatures, ...data.minis.mata.bosses].map(entry => entry.id);
const defeat = (engine, ids) => { for (const id of ids) engine.state.minis.mata.kills[id] = (engine.state.minis.mata.kills[id] || 0) + 1; };
// Motor com sorteio de verdade (semente fixa) e relógio manual; `pass(s)` anda s segundos de uma vez só.
function newFolclore(seed = 7, level = 60) {
  let state = seed;
  const rng = () => { state = (state * 16807) % 2147483647; return state / 2147483647; };
  const clock = { t: 1_000_000_000 };
  const engine = new GameEngine(data, null, { rng, now: () => clock.t });
  engine.state.size = level;
  engine.state.records.size = level;
  // (Os eventos do mundo, como a lua cheia, chamam visitas do folclore: aqui ficam de fora para medir só o relógio das visitas.)
  engine.state.mundo.nextAt = 1e18;
  return { engine, clock, pass: seconds => { clock.t += seconds * 1000; engine.tick(Math.min(1, seconds)); } };
}
const visits = engine => engine.drainEvents().filter(event => event.type === 'mini' && event.mini === 'folclore');

test('folclore: são 20 visitas, uma por criatura da Mata mais o Desfile, com prêmio, tempo e movimento válidos', () => {
  const c = data.minis.folclore;
  assert.equal(c.events.length, 20);
  assert.equal(new Set(c.events.map(entry => entry.id)).size, 20, 'ids únicos');
  const creatures = c.events.map(entry => entry.creature).filter(Boolean);
  assert.deepEqual([...creatures].sort(), mataIds().sort(), 'cada uma das 19 criaturas da Mata tem a sua visita');
  assert.equal(c.events.filter(entry => !entry.creature).length, 1, 'e uma só, o Desfile, é de todas');
  assert.equal(c.events.find(entry => !entry.creature).motion, 'desfile');
  const motions = new Set(['voa', 'rasteja', 'rola', 'surge', 'salta', 'cruza', 'mastro', 'galopa', 'orbita', 'sobe', 'dança', 'desfile']);
  const prizeKeys = new Set(['tickets', 'wood', 'cheer', 'love', 'belly', 'bellyFull', 'frenzy']);
  require('../src/festa-folclore.js');
  const { SOUNDS } = globalThis.ArraiaFestaFolclore;
  const { SONS } = require('../src/som.js');
  for (const entry of c.events) {
    assert.ok(motions.has(entry.motion), `${entry.id}: movimento ${entry.motion}`);
    assert.ok(entry.seconds >= 8 && entry.seconds <= 60, `${entry.id}: ${entry.seconds} s`);
    const specs = entry.pick || [entry.reward];
    assert.ok(specs.length >= 1 && specs.every(spec => Object.keys(spec).length && Object.entries(spec).every(([key, value]) => prizeKeys.has(key) && value > 0)), `${entry.id}: prêmio`);
    assert.ok(entry.name && entry.text && /^[A-Z0-9 .,:!?+%-]+$/.test(entry.say), `${entry.id}: textos (o grito só usa as letras da fonte de pixel)`);
    assert.ok(SONS.includes(SOUNDS[entry.id]), `${entry.id}: som de chegada ${SOUNDS[entry.id]}`);
  }
  assert.ok(c.every[0] >= 120 && c.every[1] > c.every[0], 'as visitas não chegam em cima uma da outra');
});

test('folclore: cada visita abre quando a criatura é derrotada pela primeira vez na Mata, e o Desfile só com todas', () => {
  const { engine, pass } = newFolclore();
  const folclore = engine.mini('folclore');
  assert.equal(folclore.info().open, 0, 'sem criatura derrotada, nenhuma visita');
  for (let i = 0; i < 1500; i++) pass(1);
  assert.equal(folclore.info().active, null, 'e nada passa pela festa');
  const order = data.minis.folclore.events.filter(entry => entry.creature);
  order.forEach((entry, index) => {
    defeat(engine, [entry.creature]);
    pass(1);
    const open = folclore.info().events.filter(item => item.open).map(item => item.id);
    assert.equal(open.length, index + 1 + (index === order.length - 1 ? 1 : 0), `${entry.creature} abre ${entry.id}`);
    assert.ok(open.includes(entry.id));
  });
  assert.equal(folclore.info().events.find(item => item.id === 'desfile').open, true, 'com as 19, o Desfile abre');
  assert.equal(folclore.info().open, 20);
  assert.equal(engine.state.minis.folclore.met['curupira'], true, 'e a lista fica guardada');
});

test('folclore: sorteia só entre as visitas abertas, espera entre uma e outra, não repete a anterior e some sozinha', () => {
  const { engine, clock, pass } = newFolclore(11);
  const folclore = engine.mini('folclore');
  pass(1);
  engine.drainEvents();
  defeat(engine, ['fogo-fatuo', 'mao-de-cabelo', 'curupira']);
  pass(1);
  const unlocks = visits(engine).filter(event => event.kind === 'unlock').map(event => event.id).sort();
  assert.deepEqual(unlocks, ['curupira', 'luzinha', 'mao'], 'avisa cada visita que abriu');
  const started = [];
  let ends = 0;
  let lastEnd = clock.t;
  const gaps = [];
  for (let i = 0; i < 30000; i++) {
    pass(1);
    for (const event of visits(engine)) {
      if (event.kind === 'start') { started.push(event.id); gaps.push(clock.t - lastEnd); }
      if (event.kind === 'end') { ends++; lastEnd = clock.t; }
    }
    if (folclore.info().active) assert.ok(folclore.info().active.until - clock.t <= 30000, 'a visita dura segundos');
  }
  assert.ok(started.length >= 25, `visitas: ${started.length}`);
  assert.deepEqual([...new Set(started)].sort(), ['curupira', 'luzinha', 'mao'], 'só as abertas aparecem, e todas aparecem');
  for (let i = 1; i < started.length; i++) assert.notEqual(started[i], started[i - 1], 'não repete a anterior');
  assert.ok(ends >= started.length - 1);
  // Entre uma visita e a próxima passam de 5 a 10 minutos (o sorteio de `every`).
  for (const gap of gaps.slice(1)) assert.ok(gap >= data.minis.folclore.every[0] * 1000 - 2000 && gap <= data.minis.folclore.every[1] * 1000 + 2000, `espera de ${gap} ms`);
  assert.equal(engine.state.minis.folclore.seen[started[0]] >= 1, true);
});

test('folclore: o clique paga o prêmio uma vez só (a Cuca sorteia a poção, o Boi-Bumbá dá frenesi) e clique atrasado não vale', () => {
  const { engine, clock } = newEngine(60);
  const folclore = engine.mini('folclore');
  assert.equal(folclore.act(), null, 'sem visita não tem prêmio');
  assert.equal(folclore.start('mao').id, 'mao');
  const tickets = engine.state.tickets;
  const got = folclore.act();
  assert.deepEqual(got, { id: 'mao', given: { tickets: 2 } });
  assert.equal(engine.state.tickets, tickets + 2);
  assert.equal(folclore.act(), null, 'a mesma visita não paga de novo');
  assert.equal(engine.state.minis.folclore.caught.mao, 1);
  assert.ok(engine.state.minis.folclore.active.done, 'ela fica indo embora');
  assert.ok(engine.state.minis.folclore.active.until - clock.t <= data.minis.folclore.exit);
  assert.ok(visits(engine).some(event => event.kind === 'catch' && event.id === 'mao'));
  // A Cuca sorteia entre as poções (com o sorteio no meio: lenha).
  clock.t += 5000;
  engine.tick(0.1);
  folclore.start('cuca');
  const wood = engine.state.wood;
  assert.deepEqual(folclore.act().given, { wood: 8 });
  assert.equal(engine.state.wood, wood + 8);
  // O Boi-Bumbá liga o frenesi (a festa rende mais por uns segundos) e dá Animação.
  clock.t += 5000;
  engine.tick(0.1);
  folclore.start('bumba');
  const cheer = engine.state.cheer;
  const result = folclore.act();
  assert.equal(result.given.frenzy, 12);
  assert.ok(result.given.cheer > 0 && engine.state.cheer > cheer);
  assert.ok(engine.runtimeActive('frenzy'), 'o frenesi ligou');
  // Tarde demais: a visita já foi embora.
  clock.t += 5000;
  engine.tick(0.1);
  folclore.start('luzinha');
  clock.t += (data.minis.folclore.events[0].seconds + 1) * 1000;
  assert.equal(folclore.act(), null);
  engine.tick(0.1);
  assert.equal(engine.state.minis.folclore.active, null);
  // A visita da Animação paga em segundos da festa (cps × segundos).
  clock.t += 5000;
  folclore.start('luzinha');
  const before = engine.state.cheer;
  const gain = folclore.act().given.cheer;
  assert.ok(Math.abs(engine.state.cheer - before - gain) < 1e-6 && gain >= 20);
});

test('folclore: o Desfile chama as criaturas que já foram derrotadas (de 2 a 8) e paga o prêmio maior', () => {
  const { engine } = newEngine(60);
  const folclore = engine.mini('folclore');
  defeat(engine, mataIds());
  const active = folclore.start('desfile');
  assert.equal(active.cast.length, 8, 'no máximo 8 no desfile');
  assert.ok(active.cast.every(id => mataIds().includes(id)) && new Set(active.cast).size === 8);
  const prize = data.minis.folclore.events.find(entry => entry.id === 'desfile').reward;
  assert.ok(prize.tickets >= 4 && prize.frenzy > 0 && prize.cheer > 0, 'o prêmio do desfile é o maior');
  assert.equal(folclore.act().given.tickets, prize.tickets);
  const few = newEngine(60);
  defeat(few.engine, ['fogo-fatuo', 'curupira', 'cuca']);
  assert.deepEqual(few.engine.mini('folclore').start('desfile').cast.slice().sort(), ['cuca', 'curupira', 'fogo-fatuo']);
});

test('folclore: o save guarda a coleção, limpa lixo, não guarda a visita do momento e o ano novo não perde as abertas', () => {
  const { engine, clock, pass } = newFolclore(5, 120);
  const folclore = engine.mini('folclore');
  defeat(engine, ['cuca', 'boto', 'iara']);
  pass(1);
  folclore.start('cuca');
  folclore.act();
  const saved = engine.exportState();
  const back = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.t });
  assert.deepEqual(back.state.minis.folclore.met, { cuca: true, boto: true, iara: true });
  assert.equal(back.state.minis.folclore.active, null, 'a visita do momento não volta');
  assert.equal(back.state.minis.folclore.caught.cuca, 1);
  assert.equal(back.mini('folclore').info().open, 3);
  // Lixo no save: criatura que não existe, números absurdos, texto onde devia ter número, visita desconhecida.
  const messy = JSON.parse(JSON.stringify(saved));
  messy.minis.folclore = { met: { curupira: true, fantasma: true, cuca: 'sim' }, seen: { cuia: 5, mao: -3, boi: 'x', fantasma: 9 },
    caught: { cuia: 99, mao: 4 }, last: 'fantasma', active: { id: 'mao', until: 9e15 }, nextAt: 'logo' };
  const clean = new GameEngine(data, messy, { rng: () => 0.5, now: () => clock.t }).state.minis.folclore;
  assert.deepEqual(clean.met, { curupira: true });
  assert.deepEqual(clean.seen, { cuia: 5 });
  assert.deepEqual(clean.caught, { cuia: 5 }, 'não se pega mais do que veio');
  assert.deepEqual([clean.last, clean.active, clean.nextAt], ['', null, 0]);
  assert.equal(new GameEngine(data, { ...saved, minis: { ...saved.minis, folclore: 'nada' } }, { rng: () => 0.5, now: () => clock.t }).state.minis.folclore.met.cuca, undefined);
  // O São João seguinte: a Mata recomeça, mas as visitas que já abriram (e as contas) ficam.
  engine.state.size = engine.state.records.size = 200;
  while (!engine.canNewYear()) engine.addFame(engine.fameNeed() - engine.state.fame);
  assert.equal(engine.newYear(), true);
  assert.deepEqual(engine.state.minis.mata.kills, {}, 'a Mata começou do zero');
  assert.equal(engine.mini('folclore').info().open, 3, 'as três visitas continuam abertas');
  assert.equal(engine.state.minis.folclore.caught.cuca, 1);
  assert.equal(engine.state.minis.folclore.active, null);
});

test('folclore: carregar um jogo com criaturas já derrotadas não repete os avisos; o relógio que pulou adia a próxima visita; avançar o tempo anda junto', () => {
  const first = newFolclore(3);
  defeat(first.engine, ['fogo-fatuo', 'mao-de-cabelo']);
  const saved = first.engine.exportState();
  const clock = first.clock;
  const engine = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.t });
  engine.tick(0.5);
  assert.deepEqual(visits(engine).filter(event => event.kind === 'unlock'), [], 'o que já estava aberto não avisa de novo');
  defeat(engine, ['curupira']);
  engine.tick(0.5);
  assert.deepEqual(visits(engine).filter(event => event.kind === 'unlock').map(event => event.id), ['curupira']);
  // Computador dormiu: a visita que venceu espera um pouco em vez de chegar na hora.
  const m = engine.state.minis.folclore;
  assert.ok(m.nextAt > clock.t);
  const due = m.nextAt;
  clock.t = due + 3_600_000;
  engine.tick(0.5);
  assert.equal(m.active, null, 'depois do cochilo a visita não aparece de cara');
  assert.ok(m.nextAt - clock.t >= data.minis.folclore.wake[0] * 1000 - 1 && m.nextAt - clock.t <= data.minis.folclore.wake[1] * 1000 + 1);
  // Modo de teste (advance): tudo que o relógio guarda anda para trás junto.
  engine.mini('folclore').start('luzinha');
  const born = m.active.born;
  engine.advance(10);
  assert.equal(m.active.born, born - 10000, 'a visita do momento envelhece junto');
  m.nextAt = clock.t + 100000;
  engine.mini('folclore').shift(1000);
  assert.equal(m.nextAt, clock.t + 99000, 'o relógio da próxima visita também anda');
});

test('modo de teste: o botão chama as 20 visitas, uma de cada vez, na ordem', () => {
  const { engine, clock } = newEngine(60);
  const names = [];
  for (let i = 0; i < 21; i++) {
    clock.t += 1000;
    const result = engine.debug('folclore');
    names.push(result.note || result);
    assert.ok(engine.state.minis.folclore.active, 'a visita começou');
  }
  const events = data.minis.folclore.events;
  assert.equal(engine.state.minis.folclore.active.id, events[0].id, 'depois da vigésima volta para a primeira');
  assert.ok(String(names[0]).includes(events[0].name) && String(names[19]).includes(events[19].name));
  assert.equal(Object.keys(engine.state.minis.folclore.seen).length, 20);
});

// --- Horta 2.0: vizinhas amigas, sorte, combo, ações em lote, chuva, borboleta e encomendas -------------------------------------------------------
// Planta `id` no canteiro `slot` e deixa no ponto agora (sem passar o tempo da colheita seguinte).
function ripe(engine, clock, slot, id, luck = null) {
  const horta = engine.mini('horta');
  assert.equal(horta.plant(slot, id).ok, true, `planta ${id}`);
  const plot = engine.state.minis.horta.plots[slot];
  if (luck) plot.luck = luck;
  plot.readyAt = clock.t;
  return plot;
}
const orderless = engine => { engine.state.minis.horta.orders = []; engine.state.minis.horta.orderAt = engine.now() + 1e9; };

test('horta: vizinhas amigas lado a lado rendem prêmio a mais (+25% cada, até +50%), só as de cima, de baixo, da esquerda e da direita', () => {
  const { engine, clock } = newEngine(90);
  const horta = engine.mini('horta');
  const c = data.minis.horta;
  orderless(engine);
  const likes = (a, b) => a !== b && c.friends.some(pair => pair.includes(a) && pair.includes(b));
  assert.ok(likes('milho', 'abobora') && likes('mandioca', 'batata-doce') && !likes('milho', 'mandioca'));
  // Cada planta tem exatamente duas amigas.
  for (const item of c.crops) assert.equal(c.crops.filter(other => likes(item.id, other.id)).length, 2, item.id);
  // Sozinha: sem bônus. Ao lado de uma amiga: +25% (a Animação da mandioca é contínua, então dá para medir).
  const cheerOf = got => got.reward.cheer / (c.crops.find(item => item.id === got.crop.id).reward.cheer);
  ripe(engine, clock, 6, 'mandioca');
  const cps = engine.cheerPerSecond();
  const alone = horta.harvest(6);
  assert.deepEqual([alone.friends, alone.mult], [0, 1]);
  assert.ok(Math.abs(cheerOf(alone) - cps) < 1e-6);
  clock.t += 5000;
  ripe(engine, clock, 6, 'mandioca');
  ripe(engine, clock, 7, 'batata-doce');
  const cps2 = engine.cheerPerSecond();
  const withFriend = horta.harvest(6);
  assert.equal(withFriend.friends, 1);
  assert.ok(Math.abs(withFriend.mult - 1.25) < 1e-9);
  assert.ok(Math.abs(cheerOf(withFriend) - cps2 * 1.25) < 1e-6, 'a Animação vem 25% maior');
  horta.harvest(7);
  // Planta que não é amiga e a diagonal não contam.
  clock.t += 5000;
  ripe(engine, clock, 6, 'mandioca');
  ripe(engine, clock, 5, 'milho');
  ripe(engine, clock, 0, 'batata-doce');
  ripe(engine, clock, 2, 'abobora');
  assert.equal(horta.info().plots[6].friends, 0, 'milho ao lado e as amigas só na diagonal');
  horta.harvestAll();
  // Com as três vizinhas possíveis amigas (esquerda, direita e embaixo) passa do teto de +50%.
  clock.t += 5000;
  ripe(engine, clock, 1, 'mandioca');
  ripe(engine, clock, 0, 'batata-doce');
  ripe(engine, clock, 2, 'abobora');
  ripe(engine, clock, 6, 'batata-doce');
  const full = horta.harvest(1);
  assert.equal(full.friends, 3);
  assert.ok(Math.abs(full.mult - 1.5) < 1e-9, 'o teto de +50%');
  horta.harvestAll();
  // O fim de uma fileira não é vizinho do começo da próxima (4 e 5).
  clock.t += 5000;
  ripe(engine, clock, 4, 'milho');
  ripe(engine, clock, 5, 'abobora');
  assert.deepEqual([horta.info().plots[4].friends, horta.info().plots[5].friends], [0, 0]);
  horta.harvestAll();
  // O número de amigas aparece na informação do canteiro.
  clock.t += 5000;
  ripe(engine, clock, 8, 'milho');
  ripe(engine, clock, 9, 'abobora');
  ripe(engine, clock, 3, 'amendoim');
  assert.equal(horta.info().plots[8].friends, 2, 'o milho do 8 tem o amendoim (em cima) e a abóbora (do lado)');
  assert.equal(horta.info().plots[3].friends, 1, 'e o amendoim do 3 tem o milho embaixo');
});

test('horta: a sorte sai ao plantar (em dobro ×2 ou dourada ×3 com fichas), o save guarda e não aceita lixo', () => {
  const { engine, clock } = newEngine(90);
  const horta = engine.mini('horta');
  const c = data.minis.horta;
  orderless(engine);
  const luckyAt = (roll, slot) => { engine.rng = () => roll; return horta.plant(slot, 'mandioca'); };
  assert.equal(luckyAt(0.5, 0).luck, null);
  assert.equal(luckyAt(c.luck.golden / 2, 1).luck, 'dourada');
  assert.equal(luckyAt(c.luck.golden + c.luck.double / 2, 2).luck, 'dobro');
  assert.equal(luckyAt(c.luck.golden + c.luck.double + 0.01, 3).luck, null);
  assert.deepEqual(horta.info().plots.slice(0, 4).map(plot => plot.luck), [null, 'dourada', 'dobro', null]);
  engine.rng = () => 0.5;
  // O prêmio: dobro ×2; dourada ×3 e mais fichas.
  for (const plot of engine.state.minis.horta.plots.slice(0, 4)) plot.readyAt = clock.t;
  const normal = horta.harvest(0);
  const double = horta.harvest(2);
  const golden = horta.harvest(1);
  assert.ok(normal.reward.cheer > 0 && double.reward.cheer > normal.reward.cheer);
  assert.equal(double.luck, 'dobro');
  assert.equal(golden.luck, 'dourada');
  assert.ok(Math.abs(double.mult - c.doubleMult * (1 + c.combo.step)) < 1e-9, 'em dobro: ×2 (e o combo da segunda colheita seguida)');
  assert.ok(Math.abs(golden.mult - c.goldenMult * (1 + 2 * c.combo.step)) < 1e-9);
  assert.ok(golden.reward.tickets >= c.goldenTickets, 'a dourada dá fichas');
  // O save guarda a sorte; lixo vira nada.
  clock.t += 5000;
  horta.plant(0, 'milho');
  engine.state.minis.horta.plots[0].luck = 'dobro';
  const saved = engine.exportState();
  const back = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.t });
  assert.equal(back.state.minis.horta.plots[0].luck, 'dobro');
  for (const lixo of ['ouro', 3, {}, null, 'DOBRO']) {
    const messy = JSON.parse(JSON.stringify(saved));
    messy.minis.horta.plots[0].luck = lixo;
    assert.equal(new GameEngine(data, messy, { rng: () => 0.5, now: () => clock.t }).state.minis.horta.plots[0].luck, null, `luck ${JSON.stringify(lixo)}`);
  }
});

test('horta: colheitas seguidas viram combo (+10% cada, até 5 seguidas) e o combo acaba depois de 3 s sem colher', () => {
  const { engine, clock } = newEngine(90);
  const horta = engine.mini('horta');
  const c = data.minis.horta;
  orderless(engine);
  assert.equal(horta.info().combo.n, 0);
  const cheerOf = slot => { ripe(engine, clock, slot, 'mandioca'); return horta.harvest(slot); };
  const first = cheerOf(0);
  assert.deepEqual([first.combo, first.mult], [1, 1]);
  clock.t += 2000;
  const second = cheerOf(1);
  assert.equal(second.combo, 2, 'a colheita de 2 s depois soma ao combo');
  assert.ok(Math.abs(second.mult - 1.1) < 1e-9);
  assert.equal(horta.info().combo.n, 2);
  assert.ok(horta.info().combo.left > 0 && horta.info().combo.left <= c.combo.window);
  clock.t += (c.combo.window + 0.5) * 1000;
  assert.equal(horta.info().combo.n, 0, 'passou da janela: o combo acabou');
  assert.equal(cheerOf(2).combo, 1, 'recomeça do 1');
  // O teto: seis seguidas param em 5 (+40%).
  const results = [];
  for (let i = 0; i < 6; i++) { clock.t += 400; results.push(cheerOf(3 + i).combo); }
  assert.deepEqual(results, [2, 3, 4, 5, 5, 5], 'o combo sobe até o teto e fica');
});

test('horta: colher tudo, plantar tudo e regar tudo (a regadora esvazia e a mais atrasada vem primeiro)', () => {
  const { engine, clock } = newEngine(90);
  const horta = engine.mini('horta');
  const c = data.minis.horta;
  orderless(engine);
  assert.equal(horta.harvestAll().ok, false, 'sem nada pronto não colhe');
  assert.equal(horta.waterAll().ok, false, 'sem nada para regar');
  // Plantar tudo: a semente escolhida em todos os canteiros abertos e livres.
  horta.select('milho');
  horta.plant(2, 'abobora');
  const planted = horta.plantAll();
  assert.equal(planted.ok, true);
  assert.deepEqual(planted.planted, [0, 1, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(horta.plantAll().ok, false, 'sem canteiro livre');
  assert.equal(horta.info().plots[2].crop, 'abobora', 'não mexe no que já estava plantado');
  assert.equal(horta.info().empty, 0);
  assert.equal(horta.info().thirsty, 10);
  // Regar tudo: gasta a regadora (5) e cada planta aceita 2 regas, então 5 regas na mais atrasada e nas seguintes.
  const slowest = engine.state.minis.horta.plots[2].readyAt;
  const wet = horta.waterAll();
  assert.equal(wet.ok, true);
  assert.equal(wet.wet.length, 5);
  assert.equal(wet.empty, true);
  assert.equal(wet.wet[0], 2, 'a abóbora (a mais demorada) é a primeira');
  assert.ok(engine.state.minis.horta.plots[2].readyAt < slowest);
  assert.equal(horta.info().water, 0);
  assert.equal(horta.waterAll().ok, false);
  // Colher tudo: tudo o que está no ponto de uma vez, na ordem, com o combo subindo.
  for (const plot of engine.state.minis.horta.plots.slice(0, 10)) plot.readyAt = clock.t;
  const harvested = horta.harvestAll();
  assert.equal(harvested.ok, true);
  assert.equal(harvested.results.length, 10);
  assert.deepEqual(harvested.results.map(got => got.index), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(harvested.results.slice(0, 6).map(got => got.combo), [1, 2, 3, 4, 5, 5]);
  assert.equal(horta.info().ready, 0);
  assert.equal(engine.state.minis.horta.harvests, 10);
  assert.ok(c.combo.max === 5);
});

test('horta: chuva na festa faz a horta crescer mais depressa e enche a regadora (e a chuva que passa volta ao normal)', () => {
  const { engine, clock, pass } = newEngine(30);
  const horta = engine.mini('horta');
  const c = data.minis.horta;
  orderless(engine);
  engine.state.minis.horta.crowAt = clock.t + 1e9;
  engine.state.minis.horta.butterflyAt = clock.t + 1e9;
  horta.plant(0, 'amendoim');
  const remaining = () => horta.info().plots[0].remaining;
  assert.equal(horta.info().raining, false);
  const before = remaining();
  pass(20);
  assert.ok(Math.abs(before - remaining() - 20) < 1.5, 'sem chuva, passa 1 s por segundo');
  engine.state.weather.rain = { born: clock.t, until: clock.t + 60_000 };
  assert.equal(horta.info().raining, true);
  engine.state.minis.horta.water = 0;
  engine.state.minis.horta.waterAt = clock.t + 1e9;      // só a chuva enche a regadora neste teste
  const mid = remaining();
  for (let i = 0; i < 20; i++) pass(1);
  assert.ok(Math.abs(mid - remaining() - 20 * (1 + c.rainBoost)) < 2.5, 'na chuva, 2 s por segundo');
  assert.equal(horta.info().water, Math.floor(20 / c.rainWater), 'a regadora enche a cada 5 s de chuva');
  // A chuva acaba: volta ao ritmo normal.
  clock.t = engine.state.weather.rain.until + 1000;
  engine.tick(1);
  assert.equal(horta.info().raining, false);
  const after = remaining();
  pass(10);
  assert.ok(Math.abs(after - remaining() - 10) < 1.5);
  // A chuva também termina a espera: a planta no ponto não passa de pronta.
  engine.state.weather.rain = { born: clock.t, until: clock.t + 1e9 };
  for (let i = 0; i < 400; i++) pass(1);
  assert.equal(horta.info().plots[0].ready, true);
});

test('horta: a borboleta da sorte só vem com planta crescendo, adianta a mais atrasada, some sozinha e o save não a guarda', () => {
  const { engine, clock, pass } = newEngine(30);
  const horta = engine.mini('horta');
  const c = data.minis.horta;
  orderless(engine);
  engine.state.minis.horta.crowAt = clock.t + 1e9;
  pass(1);
  assert.ok(engine.state.minis.horta.butterflyAt > clock.t, 'a próxima borboleta está sorteada');
  clock.t = engine.state.minis.horta.butterflyAt + 1;
  pass(1);
  assert.equal(horta.info().butterfly, null, 'sem planta crescendo ela não vem');
  assert.ok(engine.state.minis.horta.butterflyAt > clock.t, 'e fica para depois');
  horta.plant(0, 'milho');
  horta.plant(1, 'abobora');
  events(engine);
  clock.t = engine.state.minis.horta.butterflyAt + 1;
  pass(1);
  const butterfly = horta.info().butterfly;
  assert.ok(butterfly && butterfly.left > c.butterfly.seconds - 2 && butterfly.left <= c.butterfly.seconds);
  assert.ok(events(engine).some(event => event.kind === 'butterfly'));
  // O save não guarda a visita (e a borboleta é uma de cada vez).
  assert.equal(new GameEngine(data, engine.exportState(), { rng: () => 0.5, now: () => clock.t }).mini('horta').info().butterfly, null);
  // Pegar: adianta a planta mais atrasada (a abóbora), dá Amor e a próxima vem depois.
  const slow = horta.info().plots[1].remaining;
  const fast = horta.info().plots[0].remaining;
  const love = engine.mood().amor;
  engine.state.humor.amor = 0;
  engine.state.humor.at = clock.t;
  const got = horta.catchButterfly();
  assert.equal(got.ok, true);
  assert.equal(got.index, 1);
  assert.ok(Math.abs(horta.info().plots[1].remaining - slow * (1 - c.butterfly.skip)) < 1);
  assert.ok(Math.abs(horta.info().plots[0].remaining - fast) < 1, 'só a mais atrasada');
  assert.ok(engine.mood().amor > 0 && love >= 0, 'rende Amor');
  assert.equal(horta.info().butterfly, null);
  assert.equal(horta.catchButterfly().reason, 'none');
  assert.equal(engine.state.minis.horta.caught, 1);
  // Sem ser pega, ela vai embora no prazo.
  clock.t = engine.state.minis.horta.butterflyAt + 1;
  pass(1);
  assert.ok(horta.info().butterfly);
  clock.t += (c.butterfly.seconds + 1) * 1000;
  pass(1);
  assert.equal(horta.info().butterfly, null);
  assert.ok(events(engine).some(event => event.kind === 'butterfly-gone'));
  assert.equal(engine.state.minis.horta.caught, 1);
});

test('horta: a feira faz duas encomendas por vez, cada colheita conta, o prêmio vem ao completar e a próxima chega depois', () => {
  const { engine, clock, pass } = newEngine(90);
  const horta = engine.mini('horta');
  const c = data.minis.horta;
  engine.state.minis.horta.crowAt = clock.t + 1e9;
  engine.state.minis.horta.butterflyAt = clock.t + 1e9;
  pass(1);
  const orders = horta.info().orders;
  assert.equal(orders.length, 2, 'duas encomendas logo de saída');
  assert.notEqual(orders[0].crop, orders[1].crop, 'de plantas diferentes');
  for (const order of orders) {
    const item = c.crops.find(entry => entry.id === order.crop);
    assert.ok(order.n >= item.order.n[0] && order.n <= item.order.n[1] && order.have === 0, JSON.stringify(order));
    assert.deepEqual([order.tickets, order.cheer], [c.orders.tickets + (order.n >= c.orders.bigAt ? c.orders.bigTickets : 0), item.order.cheer * order.n]);
  }
  // Colher a planta pedida conta; uma planta que ninguém pediu não conta.
  const wanted = orders[0].crop;
  const other = c.crops.find(item => !orders.some(order => order.crop === item.id)).id;
  ripe(engine, clock, 0, other);
  assert.deepEqual(horta.harvest(0).orders, []);
  assert.equal(horta.info().orders[0].have, 0);
  const tickets = engine.state.tickets;
  let done = [];
  for (let i = 0; i < orders[0].n && !done.length; i++) {
    clock.t += 4000;
    ripe(engine, clock, 1, wanted);
    done = horta.harvest(1).orders;
    if (!done.length) assert.equal(horta.info().orders.find(order => order.crop === wanted).have, i + 1);
  }
  assert.equal(done.length, 1, 'a última colheita completa o pedido');
  assert.equal(done[0].crop, wanted);
  assert.ok(engine.state.tickets >= tickets + orders[0].tickets, 'as fichas da encomenda');
  assert.equal(engine.state.minis.horta.delivered, 1);
  assert.equal(horta.info().orders.length, 1, 'o pedido entregue sai do quadro');
  assert.ok(events(engine).some(event => event.kind === 'order-done' && event.crop === wanted));
  // O próximo pedido chega de 30 a 70 s depois.
  pass(c.orders.wait[0] - 5);
  assert.equal(horta.info().orders.length, 1);
  for (let i = 0; i < 80; i++) pass(1);
  assert.equal(horta.info().orders.length, 2);
  // Planta em dobro ou dourada conta duas unidades.
  const last = horta.info().orders[0];
  engine.state.minis.horta.orders = [{ crop: last.crop, n: Math.max(2, last.n), have: 0 }];
  clock.t += 4000;
  ripe(engine, clock, 2, last.crop, 'dobro');
  horta.harvest(2);
  assert.equal(horta.info().orders.find(order => order.crop === last.crop).have, 2, 'em dobro vale duas unidades');
});

test('horta: o save guarda as encomendas, as contas e a borboleta futura, e limpa lixo', () => {
  const { engine, clock, pass } = newEngine(90);
  const horta = engine.mini('horta');
  pass(1);
  const orders = horta.info().orders.map(order => ({ crop: order.crop, n: order.n, have: order.have }));
  engine.state.minis.horta.delivered = 7;
  engine.state.minis.horta.caught = 3;
  engine.state.minis.horta.harvests = 40;
  const saved = engine.exportState();
  const back = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.t });
  assert.deepEqual(back.mini('horta').info().orders.map(order => ({ crop: order.crop, n: order.n, have: order.have })), orders);
  assert.deepEqual([back.state.minis.horta.delivered, back.state.minis.horta.caught, back.state.minis.horta.harvests], [7, 3, 40]);
  const messy = JSON.parse(JSON.stringify(saved));
  messy.minis.horta.orders = [{ crop: 'fantasma', n: 3, have: 0 }, { crop: 'milho', n: 99, have: 50 }, { crop: 'milho', n: 3, have: 0 }, 'x', null,
    { crop: 'abobora', n: 'dois', have: -4 }, { crop: 'mandioca', n: 2, have: 0 }];
  messy.minis.horta.delivered = 'muitas';
  messy.minis.horta.orderAt = 1e18;
  const clean = new GameEngine(data, messy, { rng: () => 0.5, now: () => clock.t });
  const list = clean.mini('horta').info().orders;
  assert.ok(list.length <= data.minis.horta.orders.slots);
  assert.deepEqual([...new Set(list.map(order => order.crop))].length, list.length, 'sem planta repetida');
  for (const order of list) {
    const item = data.minis.horta.crops.find(entry => entry.id === order.crop);
    assert.ok(item && order.n >= item.order.n[0] && order.n <= item.order.n[1] && order.have >= 0 && order.have < order.n, JSON.stringify(order));
  }
  assert.equal(clean.state.minis.horta.delivered, 0);
  assert.ok(clean.state.minis.horta.orderAt <= clock.t + data.minis.horta.orders.wait[1] * 1000, 'o prazo não vira eternidade');
});

test('horta: todos os números do texto de ajuda existem (os de data.minis.horta e os que o modelo calcula)', () => {
  const { engine } = newEngine(30);
  const numbers = Object.fromEntries(Object.entries(data.minis.horta).filter(([, value]) => typeof value === 'number'));
  const vars = { ...numbers, ...engine.mini('horta').helpVars() };
  const I18N = require('../src/i18n.js');
  for (const lang of Object.keys(I18N.dictionaries())) {
    const text = I18N.dictionaries()[lang].ui['mini.help.horta'];
    for (const name of new Set(text.match(/\{\w+\}/g))) assert.ok(name.slice(1, -1) in vars, `${lang}: ${name} não existe`);
  }
  assert.equal(vars.friendPct, 25);
  assert.equal(vars.comboMax, 5);
});

test('horta: uma planta por dia fica em alta (muda com a data) e rende +50% na colheita; o arco-íris da festa chama a borboleta dourada', () => {
  const { engine, clock, pass } = newEngine(90);
  const horta = engine.mini('horta');
  const c = data.minis.horta;
  orderless(engine);
  engine.state.minis.horta.crowAt = clock.t + 1e9;
  engine.state.minis.horta.butterflyAt = clock.t + 1e9;
  const todayOn = date => { clock.t = new Date(date).getTime(); return horta.info().today; };
  // Cada dia uma planta (as cinco passam por todos os dias de uma semana, sem repetir em dias seguidos), e a mesma o dia inteiro.
  const week = [10, 11, 12, 13, 14, 15, 16].map(day => todayOn(`2026-03-${day}T12:00:00`));
  const seen = new Set(week);
  assert.ok(week.every(id => c.crops.some(item => item.id === id)));
  for (let i = 1; i < week.length; i++) assert.notEqual(week[i], week[i - 1], 'dias seguidos, plantas diferentes');
  assert.equal(seen.size, 5, 'em cinco dias passam as cinco plantas');
  assert.equal(todayOn('2026-03-12T00:05:00'), todayOn('2026-03-12T23:55:00'), 'a mesma o dia inteiro');
  // O prêmio da planta em alta vale `daily.bonus` a mais.
  const previous = c.daily.bonus;
  c.daily.bonus = 0.5;
  try {
    clock.t = new Date('2026-03-12T12:00:00').getTime();
    const hot = horta.info().today;
    const cold = c.crops.find(item => item.id !== hot && item.reward.cheer).id;
    ripe(engine, clock, 0, hot === 'milho' ? 'mandioca' : hot);
    const cps = engine.cheerPerSecond();
    const got = horta.harvest(0);
    assert.equal(got.today, hot === 'milho' ? false : true);
    clock.t += 5000;
    ripe(engine, clock, 1, cold);
    const other = horta.harvest(1);
    assert.equal(other.today, false);
    assert.ok(Math.abs(other.mult - 1) < 1e-9, 'sem ser a planta em alta: sem bônus');
    if (got.today) assert.ok(Math.abs(got.mult - 1.5) < 1e-9, 'em alta: +50%');
    assert.ok(horta.helpVars().dailyPct === 50);
  } finally {
    c.daily.bonus = previous;
  }
  // O arco-íris chama a borboleta (uma vez por arco-íris); sem planta crescendo ela não vem.
  clock.t = new Date('2026-03-12T12:00:00').getTime();
  horta.plant(2, 'abobora');
  engine.state.minis.horta.butterflyAt = clock.t + 1e9;
  pass(1);
  assert.equal(horta.info().rainbow, false);
  engine.state.weather.rainbow = { born: clock.t, until: clock.t + 45000 };
  assert.equal(horta.info().rainbow, true);
  pass(1);
  assert.ok(engine.state.minis.horta.butterflyAt - clock.t <= 1600, 'o arco-íris adianta a borboleta');
  pass(2);
  assert.ok(horta.info().butterfly, 'e ela vem');
  horta.catchButterfly();
  engine.state.minis.horta.butterflyAt = clock.t + 1e9;
  pass(2);
  assert.ok(engine.state.minis.horta.butterflyAt > clock.t + 1e6, 'o mesmo arco-íris não chama outra');
});

test('horta: as fichas do prêmio não crescem com as amigas, o combo nem a planta em alta; só a sorte as multiplica', () => {
  const { engine, clock } = newEngine(90);
  const horta = engine.mini('horta');
  const c = data.minis.horta;
  orderless(engine);
  engine.state.minis.horta.harvested.milho = 5;           // sem o bônus da primeira colheita
  const previous = c.daily.bonus;
  c.daily.bonus = 0.5;
  try {
    clock.t = new Date('2026-03-12T12:00:00').getTime();   // a planta em alta é uma só: o teste usa as amigas e o combo
    ripe(engine, clock, 6, 'milho');
    ripe(engine, clock, 5, 'amendoim');
    ripe(engine, clock, 7, 'abobora');
    const tickets = engine.state.tickets;
    const got = horta.harvest(6);
    assert.equal(got.friends, 2);
    assert.ok(got.mult >= 1.5 - 1e-9, `o prêmio todo vale ${got.mult}`);
    assert.equal(got.reward.tickets, 1, 'mas a ficha do milho continua uma');
    assert.equal(engine.state.tickets, tickets + 1);
    assert.ok(got.reward.belly > c.crops[0].reward.belly, 'a Barriga cresce com a vizinhança');
    // A sorte multiplica as fichas.
    clock.t += 5000;
    ripe(engine, clock, 6, 'milho', 'dobro');
    assert.equal(horta.harvest(6).reward.tickets, 2, 'em dobro: 2 fichas');
  } finally {
    c.daily.bonus = previous;
  }
});

test('horta: o temporal e o granizo (eventos do mundo) molham a horta como a chuva, e os outros eventos não', () => {
  for (const [id, wet] of [['temporal', true], ['granizo', true], ['estrelas', false], ['ventania', false], ['calorao', false]]) {
    const { engine, clock, pass } = newEngine(60);
    const horta = engine.mini('horta');
    const c = data.minis.horta;
    orderless(engine);
    engine.state.minis.horta.crowAt = clock.t + 1e9;
    engine.state.minis.horta.butterflyAt = clock.t + 1e9;
    engine.state.mundo.nextAt = 1e18;
    horta.plant(0, 'amendoim');
    engine.state.minis.horta.water = 0;
    engine.state.minis.horta.waterAt = clock.t + 1e9;
    engine.mundo.start(id);
    assert.equal(horta.info().raining, wet, `${id}: chovendo na horta`);
    const before = horta.info().plots[0].remaining;
    for (let i = 0; i < 20; i++) pass(1);
    const grown = before - horta.info().plots[0].remaining;
    if (wet) {
      assert.ok(Math.abs(grown - 20 * (1 + c.rainBoost)) < 2.5, `${id}: cresce mais depressa (${grown})`);
      assert.equal(horta.info().water, Math.floor(20 / c.rainWater), `${id}: enche a regadora`);
    } else {
      assert.ok(Math.abs(grown - 20) < 1.5, `${id}: ritmo normal (${grown})`);
    }
    // O evento acaba: volta ao normal.
    clock.t = engine.state.mundo.active.until + 1000;
    engine.tick(1);
    assert.equal(horta.info().raining, false, `${id}: acabou`);
  }
});
