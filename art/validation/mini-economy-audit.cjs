'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const { GameEngine } = require(path.join(root, 'src/core'));
const data = require(path.join(root, 'src/data'));
const report = { cases: [], reloads: 0, actions: 0, failures: [] };
const stamp = new Date(2026, 9, 3, 12).getTime();

function setup(rng = () => 0.5) {
  const clock = { now: stamp };
  let engine = new GameEngine(data, null, { now: () => clock.now, rng });
  while (engine.state.size < 75) engine.addFame(engine.fameNeed() - engine.state.fame);
  engine.mini('mata').setAuto(false);
  engine.tick(0.001);
  engine.drainEvents();
  return {
    clock,
    get engine() { return engine; },
    pass(ms) { clock.now += ms; engine.tick(0.001); },
    reload() {
      const saved = JSON.parse(JSON.stringify(engine.exportState()));
      engine = new GameEngine(data, saved, { now: () => clock.now, rng });
      assert.equal(engine.state.tickets, saved.tickets, 'carregar não repete fichas já recebidas');
      assert.equal(engine.state.cheer, saved.cheer, 'carregar sem tempo fora não repete Animação');
      const repeated = engine.drainEvents().filter(event => event.type === 'mini' && ['discover', 'complete', 'pop', 'visit'].includes(event.kind));
      assert.deepEqual(repeated, [], 'a carga não repete avisos de prêmios');
      report.reloads++;
    }
  };
}

function audit(name, run) {
  const entry = { name, actions: 0 };
  report.cases.push(entry);
  const act = () => { entry.actions++; report.actions++; };
  try { run(entry, act); entry.passed = true; }
  catch (error) { entry.error = error.stack || String(error); report.failures.push(name); }
}

const fishConfig = data.minis.aquario;
for (let rotation = 0; rotation < fishConfig.species.length; rotation++) {
  for (const full of [false, true]) for (const reloadEveryAction of [false, true]) {
    audit(`aquario-species-${rotation}-${full ? 'full' : 'space'}-${reloadEveryAction ? 'reload' : 'continuous'}`, (entry, act) => {
      const game = setup();
      const order = [...fishConfig.species.slice(rotation), ...fishConfig.species.slice(0, rotation)];
      const starterSpecies = game.engine.mini('aquario').info().seen[0];
      if (full) while (game.engine.mini('aquario').info().fish.length < fishConfig.tankMax) {
        assert.ok(game.engine.mini('aquario').addFish(starterSpecies).ok);
      }
      let discoveries = 0, completions = 0, conversions = 0;
      for (const species of [...order, ...order]) {
        const engine = game.engine;
        const model = engine.mini('aquario');
        const before = model.info();
        const tickets = engine.state.tickets;
        const cheer = engine.state.cheer;
        const isNew = !before.seen.includes(species.id);
        const converted = before.fish.length >= fishConfig.tankMax;
        const completed = isNew && !before.complete && before.seen.length + 1 === fishConfig.species.length;
        const expectedCheer = completed ? Math.max(20, engine.cheerPerSecond() * fishConfig.completeReward.cheer) : 0;
        const got = model.addFish(species.id);
        act();
        const expected = (isNew ? fishConfig.discoverTickets : 0) + (converted ? 1 : 0) + (completed ? fishConfig.completeReward.tickets : 0);
        assert.equal(engine.state.tickets, tickets + expected, 'cada captura paga descoberta, conversão e conclusão apenas quando cabíveis');
        assert.equal(engine.state.cheer, cheer + expectedCheer, 'a conclusão paga a Animação prevista, uma vez só');
        assert.equal(got.isNew, isNew);
        assert.equal(!!got.full, converted);
        assert.ok(model.info().fish.length <= fishConfig.tankMax);
        const events = engine.drainEvents().filter(event => event.type === 'mini' && event.mini === 'aquario');
        assert.equal(events.filter(event => event.kind === 'discover').length, Number(isNew));
        assert.equal(events.filter(event => event.kind === 'complete').length, Number(completed));
        discoveries += Number(isNew); completions += Number(completed); conversions += Number(converted);
        if (reloadEveryAction) game.reload();
      }
      game.reload();
      assert.equal(game.engine.mini('aquario').info().complete, true);
      assert.equal(completions, 1);
      entry.result = { discoveries, completions, conversions, fish: game.engine.mini('aquario').info().fish.length };
    });
  }
}

for (const species of fishConfig.species) {
  audit('aquario-fishing-full-' + species.id, (entry, act) => {
    const game = setup();
    const model = game.engine.mini('aquario');
    const known = model.info().seen[0];
    while (model.info().fish.length < fishConfig.tankMax) assert.ok(model.addFish(known).ok);
    const pool = fishConfig.species.filter(candidate => candidate.rarity === species.rarity);
    const roll = fishConfig.rarityChance.slice(0, species.rarity).reduce((sum, chance) => sum + chance, 0) + fishConfig.rarityChance[species.rarity] / 2;
    const choice = (pool.findIndex(candidate => candidate.id === species.id) + 0.5) / pool.length;
    for (let capture = 0; capture < 2; capture++) {
      if (!game.engine.state.fishing.ready) game.pass(game.engine.fishingInterval());
      const rngCalls = capture ? [0.1, 0.1, roll, choice] : [roll, choice];
      game.engine.rng = () => {
        assert.ok(rngCalls.length, 'a captura usa apenas as escolhas de turma e espécie previstas');
        return rngCalls.shift();
      };
      const isNew = !game.engine.mini('aquario').info().seen.includes(species.id);
      const tickets = game.engine.state.tickets;
      assert.ok(game.engine.fish(), 'a pescaria consumiu uma prenda realmente disponível');
      act();
      assert.equal(rngCalls.length, 0);
      assert.ok(game.engine.mini('aquario').info().seen.includes(species.id));
      assert.equal(game.engine.mini('aquario').info().fish.length, fishConfig.tankMax);
      assert.equal(game.engine.state.tickets, tickets + 1 + (isNew ? fishConfig.discoverTickets : 0));
      game.reload();
    }
    entry.result = { species: species.id, repeatedDiscovery: false, convertedCaptures: 2 };
  });
}

for (const rng of [0, 0.5, 0.999]) {
  audit(`aquario-bubbles-${rng}`, (entry, act) => {
    const game = setup(() => rng);
    for (let food = 0; food < fishConfig.growth[1]; food++) assert.ok(game.engine.mini('aquario').drop().ok);
    assert.equal(game.engine.mini('aquario').info().adults, 1);
    game.pass(fishConfig.bubbleEvery * fishConfig.bubbleMax * 1000);
    assert.equal(game.engine.mini('aquario').info().bubbles, fishConfig.bubbleMax);
    game.reload();
    for (let bubble = 0; bubble < fishConfig.bubbleMax; bubble++) {
      const engine = game.engine;
      const tickets = engine.state.tickets, cheer = engine.state.cheer;
      const expectedCheer = Math.max(20, engine.cheerPerSecond() * fishConfig.bubbleCheer);
      const got = engine.mini('aquario').pop();
      act();
      assert.equal(got.ok, true);
      assert.equal(engine.state.tickets, tickets + (rng < fishConfig.bubbleTicketChance ? 1 : 0));
      assert.equal(got.reward.cheer, expectedCheer);
      assert.equal(engine.state.cheer, cheer + expectedCheer);
      assert.equal(engine.mini('aquario').info().bubbles, fishConfig.bubbleMax - bubble - 1);
      game.reload();
    }
    assert.equal(game.engine.mini('aquario').pop().reason, 'empty');
    const paid = game.engine.state.tickets;
    game.reload();
    assert.equal(game.engine.mini('aquario').pop().reason, 'empty');
    assert.equal(game.engine.state.tickets, paid);
    entry.result = { popped: game.engine.state.minis.aquario.popped, repeatedPayout: false };
  });
}

const neighborhoodConfig = data.minis.bairro;
for (const level of [1, 3, 5, 8, data.config.maxLevel]) {
  audit(`bairro-visits-${level}`, (entry, act) => {
    const game = setup();
    const ids = data.chars.slice(0, 3).map(char => char.id);
    for (const id of ids) game.engine.state.crew[id] = { level };
    game.reload();
    let paidTickets = 0;
    for (let visit = 1; visit <= neighborhoodConfig.ticketEvery * 2; visit++) {
      if (visit > 1) game.pass(neighborhoodConfig.visitWait * 1000);
      for (const id of ids) {
        const engine = game.engine;
        const tickets = engine.state.tickets, cheer = engine.state.cheer;
        const expectedTickets = visit % neighborhoodConfig.ticketEvery === 0 ? 1 : 0;
        const expectedCheer = Math.max(20, engine.cheerPerSecond() * (neighborhoodConfig.giftBase + level * neighborhoodConfig.giftPerLevel));
        const got = engine.mini('bairro').visit(id);
        act();
        assert.ok(got.ok);
        assert.equal(got.level, level);
        assert.equal(engine.state.tickets, tickets + expectedTickets);
        assert.equal(got.reward.cheer, expectedCheer);
        assert.equal(engine.state.cheer, cheer + expectedCheer);
        assert.ok(data.letters.includes(got.recado));
        assert.equal(engine.mini('bairro').visit(id).reason, 'wait');
        paidTickets += expectedTickets;
        game.reload();
        assert.equal(game.engine.mini('bairro').visit(id).reason, 'wait');
        assert.equal(game.engine.state.minis.bairro.homes[id].visits, visit);
      }
    }
    assert.equal(game.engine.state.minis.bairro.visits, ids.length * neighborhoodConfig.ticketEvery * 2);
    const away = ids[0];
    const visitDeadline = game.engine.state.minis.bairro.homes[away].nextAt;
    assert.equal(game.engine.startOuting(0, away), true);
    assert.equal(game.engine.mini('bairro').visit(away).reason, 'away');
    game.reload();
    assert.equal(game.engine.mini('bairro').visit(away).reason, 'away');
    game.pass(game.engine.state.outings[0].endsAt - game.clock.now);
    game.reload();
    assert.equal(game.engine.mini('bairro').visit(away).reason, 'away', 'o morador ainda espera ser resgatado do passeio');
    assert.ok(game.engine.claimOuting(0));
    assert.equal(game.engine.claimOuting(0), null);
    assert.equal(game.engine.state.minis.bairro.homes[away].nextAt, visitDeadline, 'o passeio não reinicia nem apaga a espera da casa');
    if (game.clock.now < visitDeadline) {
      assert.equal(game.engine.mini('bairro').visit(away).reason, 'wait', 'um passeio curto não elimina a espera da visita anterior');
      game.reload();
      game.pass(visitDeadline - game.clock.now);
    }
    assert.ok(game.engine.mini('bairro').visit(away).ok, 'depois do resgate o morador pode receber visita');
    act();
    game.reload();
    assert.equal(game.engine.mini('bairro').visit(away).reason, 'wait');
    entry.result = { paidTickets, visits: game.engine.state.minis.bairro.visits, returnRestored: true };
  });
}

fs.writeFileSync(path.join(__dirname, 'mini-economy-verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ cases: report.cases.length, actions: report.actions, reloads: report.reloads, failures: report.failures }));
if (report.failures.length) process.exitCode = 1;
