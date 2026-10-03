'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { GameEngine } = require('../../src/core');
const data = require('../../src/data');
const stamp = new Date(2026, 10, 4, 12).getTime();
const report = { cases: [], reloads: 0, actions: 0, failures: [] };

function setup(size = 125) {
  const clock = { now: stamp };
  let engine = new GameEngine(data, null, { rng: () => 0.5, now: () => clock.now });
  while (engine.state.size < size) engine.addFame(engine.fameNeed() - engine.state.fame);
  engine.mini('mata').setAuto(false);
  engine.drainEvents();
  return {
    clock,
    get engine() { return engine; },
    reload() {
      const saved = JSON.parse(JSON.stringify(engine.exportState()));
      engine = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.now });
      for (const field of ['tickets', 'cheer', 'wood']) assert.equal(engine.state[field], saved[field], 'recarregar sem tempo fora conserva ' + field);
      assert.equal(engine.drainEvents().some(event => event.type === 'foto' || event.type === 'mini' && event.kind === 'gift'), false);
      report.reloads++;
    }
  };
}
function audit(name, run) {
  const entry = { name };
  report.cases.push(entry);
  try { run(entry); entry.passed = true; }
  catch (error) { entry.error = error.stack || String(error); report.failures.push(name); }
}
const act = callback => { report.actions++; return callback(); };

for (const tier of data.tiers) for (const reloadEach of [false, true]) {
  audit(`mail-${tier.size}-${reloadEach ? 'reload' : 'continuous'}`, entry => {
    const game = setup(tier.size);
    const engine = game.engine;
    engine.state.mail = { ready: data.config.letterCap, nextAt: 0 };
    const tickets = engine.state.tickets, letters = engine.state.stats.letters;
    const expected = data.config.letterTickets + data.tiers.indexOf(tier);
    for (let index = 0; index < data.config.letterCap; index++) {
      const got = act(() => game.engine.openLetter());
      assert.ok(got && data.letters.includes(got.text));
      assert.equal(got.tickets, expected);
      assert.equal(game.engine.state.mail.ready, data.config.letterCap - index - 1);
      assert.equal(game.engine.state.tickets, tickets + expected * (index + 1));
      if (reloadEach) game.reload();
    }
    assert.equal(act(() => game.engine.openLetter()), null);
    game.reload();
    assert.equal(act(() => game.engine.openLetter()), null, 'a carta lida não reaparece no save');
    assert.equal(game.engine.state.stats.letters, letters + data.config.letterCap);
    game.clock.now = game.engine.state.mail.nextAt;
    assert.ok(act(() => game.engine.openLetter()), 'a próxima carta vence exatamente no prazo');
    assert.equal(act(() => game.engine.openLetter()), null);
    game.reload();
    entry.result = { letters: game.engine.state.stats.letters - letters, paid: expected * (data.config.letterCap + 1) };
  });
}

for (const pet of data.minis.bichos.pets) for (const reloadEach of [false, true]) {
  audit(`gift-${pet.id}-${reloadEach ? 'reload' : 'continuous'}`, entry => {
    const game = setup();
    const config = data.minis.bichos;
    const fill = () => {
      for (let touch = 0; touch < config.bondMax / config.petBond; touch++) {
        game.clock.now += config.petCooldown * 1000;
        assert.ok(act(() => game.engine.mini('bichos').pet(pet.id)).ok);
        if (reloadEach) game.reload();
      }
    };
    fill();
    game.engine.settleMood();
    const before = { tickets: game.engine.state.tickets, wood: game.engine.state.wood, cheer: game.engine.state.cheer,
      belly: game.engine.state.humor.barriga, love: game.engine.state.humor.amor };
    const expectedCheer = pet.reward.cheer ? Math.max(20, game.engine.cheerPerSecond() * pet.reward.cheer) : 0;
    assert.ok(act(() => game.engine.mini('bichos').collect(pet.id)).ok);
    assert.equal(game.engine.state.tickets, before.tickets + (pet.reward.tickets || 0));
    assert.equal(game.engine.state.wood, before.wood + (pet.reward.wood || 0));
    assert.equal(game.engine.state.cheer, before.cheer + expectedCheer);
    assert.equal(game.engine.state.humor.barriga, Math.min(data.config.moodMax, before.belly + (pet.reward.belly || 0)));
    assert.equal(game.engine.state.humor.amor, Math.min(data.config.moodMax, before.love + (pet.reward.love || 0)));
    assert.equal(act(() => game.engine.mini('bichos').collect(pet.id)).ok, false);
    game.reload();
    assert.equal(act(() => game.engine.mini('bichos').collect(pet.id)).ok, false);
    fill();
    assert.equal(act(() => game.engine.mini('bichos').collect(pet.id)).ok, false, 'encher o laço não elimina a espera do presente anterior');
    game.clock.now = game.engine.state.minis.bichos.pets[pet.id].giftAt;
    if (reloadEach) game.reload();
    assert.ok(act(() => game.engine.mini('bichos').collect(pet.id)).ok, 'a entrega funciona no prazo exato');
    assert.equal(act(() => game.engine.mini('bichos').collect(pet.id)).ok, false);
    game.reload();
    assert.equal(game.engine.state.minis.bichos.gifts, 2);
    assert.equal(act(() => game.engine.mini('bichos').collect(pet.id)).ok, false);
    entry.result = { gifts: game.engine.state.minis.bichos.gifts, reward: pet.reward };
  });
}

for (const offset of [-1, 0, 1]) {
  audit('photographer-arrival-' + offset, entry => {
    const game = setup();
    const engine = game.engine;
    engine.startFotografo(game.clock.now);
    const initial = engine.state.tickets;
    game.clock.now += data.config.fotoWalk * 1000 + offset;
    const shot = act(() => engine.shootFoto());
    assert.equal(!!shot, offset >= 0);
    const expected = offset >= 0 ? data.config.fotoTickets + engine.tierIndex() : 0;
    assert.equal(engine.state.tickets, initial + expected);
    assert.equal(act(() => engine.shootFoto()), null);
    game.reload();
    assert.equal(act(() => game.engine.shootFoto()), null, 'uma visita anterior não pode ser fotografada novamente após a carga');
    assert.equal(game.engine.state.stats.fotos, Number(offset >= 0));
    entry.result = { paid: expected, pictures: game.engine.state.stats.fotos };
  });
}
for (const offset of [-1, 0, 1]) {
  audit('photographer-departure-' + offset, entry => {
    const game = setup();
    const engine = game.engine;
    engine.startFotografo(game.clock.now);
    const initial = engine.state.tickets;
    game.clock.now = engine.state.fotografo.active.leaveAt + offset;
    assert.equal(!!act(() => engine.shootFoto()), offset < 0);
    assert.equal(engine.state.tickets, initial + (offset < 0 ? data.config.fotoTickets + engine.tierIndex() : 0));
    assert.equal(act(() => engine.shootFoto()), null);
    game.reload();
    assert.equal(act(() => game.engine.shootFoto()), null);
    entry.result = { pictures: game.engine.state.stats.fotos };
  });
}

fs.writeFileSync(path.join(__dirname, 'reward-roundtrip-verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ cases: report.cases.length, actions: report.actions, reloads: report.reloads, failures: report.failures }));
if (report.failures.length) process.exitCode = 1;
