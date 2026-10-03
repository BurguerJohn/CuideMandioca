'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sourceData = require('../../src/data');
const { GameEngine } = require('../../src/core');
const I18N = require('../../src/i18n');
const { fakeDocument } = require('../../tests/fake-dom');
const copy = value => JSON.parse(JSON.stringify(value));
const report = { cases: [], actions: 0, reloads: 0, newYears: 0, roasts: 0, discarded: 0, jumps: 0, ticks: 0, failures: [] };
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-8, `${message}: ${actual} versus ${expected}`);
const stamp = new Date(2026, 10, 4, 12).getTime();

globalThis.Image = class { set src(value) { this.complete = true; this.width = 12; this.onload?.(); } };
require('../../src/festa-sprites');
require('../../src/festa');
require('../../src/janela-base');
require('../../src/janelas');
require('../../src/janela-fogueira');

function setup(language, mode) {
  const data = copy(sourceData);
  I18N.setLanguage(language);
  I18N.localizeData(data);
  let wall = stamp, visualTime = 1000;
  let engine = new GameEngine(data, null, { now: () => wall, rng: () => 0.5 });
  const grow = () => {
    while (engine.state.size < 200) engine.addFame(engine.fameNeed() - engine.state.fame);
    engine.mini('mata').setAuto(false);
    engine.drainEvents();
  };
  grow();
  engine.state.wood = 200;
  engine.tick(.001);
  engine.drainEvents();
  const document = fakeDocument([]), settings = { zoom: 1, hidden: false, minis: { fogueira: { hidden: false } } };
  const host = globalThis.ArraiaJanelas.create({ document, engine, sprites: globalThis.FESTA_SPRITES,
    anchor: () => ({ left: 400, width: 800, lift: 20, top: 100 }), settings: () => settings,
    changeSettings: partial => Object.assign(settings, partial), placaRect: () => null,
    size: () => ({ width: 1600, height: 1000 }), t: (key, vars) => I18N.t(key, vars), sound() {}, toast() {} });
  host.restore();
  const model = () => engine.mini('fogueira'), item = () => host.windows.get('fogueira');
  const draw = () => { visualTime += 100; host.draw(visualTime); };
  const resources = () => ({ cheer: engine.state.cheer, earned: engine.state.stats.cheerEarned,
    tickets: engine.state.tickets, wood: engine.state.wood, love: engine.mood().amor, belly: engine.mood().barriga,
    holdUntil: engine.state.humor.holdUntil });
  const replace = saved => { engine = new GameEngine(data, copy(saved), { now: () => wall, rng: () => .5 }); host.setEngine(engine); draw(); report.reloads++; };
  const reload = () => {
    const state = copy(engine.state.minis.fogueira), money = resources();
    replace(engine.exportState());
    assert.deepEqual(engine.state.minis.fogueira, state, 'reloading retains heat, skewers, selection and reward counters');
    assert.deepEqual(resources(), money, 'an immediate reload does not repeat a roast or reset its fullness deadline');
  };
  const click = id => {
    engine.wake();
    draw();
    const probe = item().view.probe(), area = probe.areas.find(entry => entry.id === id), box = item().canvas.getBoundingClientRect();
    assert.ok(area, 'the actual bonfire has region ' + id);
    let spot;
    // Partes do fogo ficam sob os espetos. Escolhe uma parte visível da região real.
    for (const fx of [.5, .15, .85]) for (const fy of [.5, .15, .85]) {
      const point = { x: box.left + (area.x + area.w * fx) * box.width / probe.size.width,
        y: box.top + (area.y + area.h * fy) * box.height / probe.size.height };
      if (!spot && item().view.hit(point.x, point.y)?.id === id) spot = point;
    }
    assert.ok(spot, 'the desired bonfire control has a visible clickable point');
    report.actions++;
    assert.equal(item().view.click(spot.x, spot.y, visualTime), true);
    draw();
    const events = engine.drainEvents();
    if (mode === 'reload-each') reload();
    return events;
  };
  const cookUntil = progress => {
    let count = 0;
    while (engine.state.minis.fogueira.sticks.some(stick => stick && !stick.burnt && stick.progress < progress)) {
      assert.ok(count++ < 2000, 'cooking eventually reaches the requested stage');
      wall += 250;
      engine.tick(.25);
      report.ticks++;
      draw();
      if (mode === 'reload-cooking' && count % 37 === 0) reload();
    }
  };
  const pause = milliseconds => {
    const saved = engine.exportState(), oldBonfire = copy(engine.state.minis.fogueira), originalHumor = copy(engine.state.humor);
    wall += milliseconds;
    if (mode === 'continuous') engine.wake();
    else replace(saved);
    draw();
    assert.deepEqual(engine.state.minis.fogueira, oldBonfire, 'during a pause the bonfire and skewers wait');
    assert.equal(engine.state.humor.holdUntil, originalHumor.holdUntil, 'a pause cannot extend the fullness deadline');
    const bellyHours = Math.max(0, wall - Math.max(originalHumor.at, originalHumor.holdUntil || 0)) / 3600000;
    near(engine.mood().barriga, Math.max(0, originalHumor.barriga - bellyHours * data.config.moodMax / data.config.bellyHours), 'belly decay follows time after the hold');
  };
  draw();
  return { get engine() { return engine; }, get wall() { return wall; }, data, model, item, draw, click, reload, cookUntil, pause, resources,
    nextYear() {
      grow();
      const old = item(), humor = resources(), counters = copy(engine.state.stats);
      assert.equal(engine.newYear(), true);
      host.onEvents(engine.drainEvents(), visualTime);
      draw();
      assert.notEqual(item(), old);
      assert.equal(model().info().heat, 0);
      assert.ok(model().info().sticks.every(stick => stick === null));
      assert.equal(engine.state.minis.fogueira.roasted, 0);
      assert.equal(engine.state.minis.fogueira.burnt, 0);
      assert.equal(engine.state.minis.fogueira.jumped, 0);
      assert.equal(resources().holdUntil, humor.holdUntil, 'the new year retains the already earned fullness');
      near(resources().belly, humor.belly, 'the new year does not erase the current belly');
      assert.deepEqual(engine.state.stats, counters, 'the new year does not repeat bonfire rewards');
      report.newYears++;
      reload();
    } };
}

try {
  for (const language of ['pt-BR', 'en', 'es']) {
    for (const foodId of sourceData.minis.fogueira.foods.map(food => food.id)) {
      for (const quality of ['normal', 'perfect', 'overcooked', 'burnt']) for (const mode of ['continuous', 'reload-each', 'reload-cooking']) {
        const entry = { language, foodId, quality, mode };
        report.cases.push(entry);
        try {
          const game = setup(language, mode), config = game.data.minis.fogueira;
          const food = config.foods.find(food => food.id === foodId);
          let before = game.resources();
          game.click('fogo');
          assert.deepEqual(game.resources(), before, 'a cold fire cannot pay a jump');
          for (let wood = 0; wood < config.heatMax / config.heatPerWood; wood++) {
            const previous = game.resources().wood;
            game.click('lenha');
            assert.equal(game.resources().wood, previous - 1);
          }
          assert.equal(game.model().info().heat, config.heatMax);
          before = game.resources();
          game.click('lenha');
          assert.deepEqual(game.resources(), before, 'a full fire does not consume another piece of wood');
          game.click('comida:' + foodId);
          assert.equal(game.model().info().selected, foodId);
          for (let slot = 0; slot < config.slots; slot++) {
            game.click('espeto:' + slot);
            assert.equal(game.model().info().sticks[slot].food, foodId);
            const state = copy(game.engine.state.minis.fogueira), money = game.resources();
            game.click('espeto:' + slot);
            assert.deepEqual(game.engine.state.minis.fogueira, state, 'an immediate click cannot turn or eat raw food');
            assert.deepEqual(game.resources(), money);
          }
          if (quality === 'perfect') {
            game.cookUntil(.4);
            for (let slot = 0; slot < config.slots; slot++) {
              for (let turn = 0; turn < config.turnMax; turn++) {
                game.click('espeto:' + slot);
                assert.equal(game.model().info().sticks[slot].turns, turn + 1);
              }
              const state = copy(game.engine.state.minis.fogueira);
              game.click('espeto:' + slot);
              assert.deepEqual(game.engine.state.minis.fogueira, state, 'turning cannot exceed the configured limit');
            }
          }
          game.cookUntil(quality === 'burnt' ? config.burnAt : quality === 'overcooked' ? 1.25 : 1.05);
          const expectedState = quality === 'burnt' ? 'queimado' : quality === 'overcooked' ? 'passou' : 'ponto';
          assert.ok(game.model().info().sticks.every(stick => stick.state === expectedState));
          const multiplier = quality === 'perfect' ? config.perfectMult : quality === 'overcooked' ? .7 : 1;
          for (let slot = 0; slot < config.slots; slot++) {
            const before = game.resources(), previous = copy(game.engine.state.minis.fogueira);
            const scaled = Object.fromEntries(Object.entries(food.reward).map(([key, value]) => [key, Math.max(1, Math.round(value * multiplier))]));
            const cheer = quality !== 'burnt' && scaled.cheer ? Math.max(20, game.engine.cheerPerSecond() * scaled.cheer) : 0;
            const events = game.click('espeto:' + slot);
            const event = events.find(event => event.type === 'mini' && event.mini === 'fogueira' && event.slot === slot
              && event.kind === (quality === 'burnt' ? 'trash' : 'roasted'));
            assert.ok(event, 'the UI removed the intended skewer');
            assert.equal(event.food, foodId);
            const after = game.resources();
            assert.equal(after.tickets, before.tickets, 'roasting does not create tickets');
            near(after.cheer - before.cheer, cheer, 'the food pays its cheer once');
            near(after.earned - before.earned, cheer, 'the earned counter records only the paid food reward');
            assert.equal(after.wood - before.wood, quality === 'burnt' ? 0 : scaled.wood || 0);
            near(after.love, Math.min(game.data.config.moodMax, before.love + (quality === 'burnt' ? 0 : scaled.love || 0)), 'the food pays its love');
            assert.equal(game.model().info().sticks[slot], null);
            if (quality === 'burnt') {
              assert.equal(after.holdUntil, before.holdUntil, 'burnt food cannot renew fullness');
              near(after.belly, before.belly, 'discarded food does not fill the belly');
              assert.equal(game.engine.state.minis.fogueira.roasted, previous.roasted);
              report.discarded++;
            } else {
              assert.equal(after.belly, game.data.config.moodMax);
              assert.equal(after.holdUntil, Math.max(before.holdUntil, game.wall + config.bellyHold * 3600000));
              assert.equal(game.engine.state.minis.fogueira.roasted, previous.roasted + 1);
              assert.equal(event.perfect, quality === 'perfect');
              report.roasts++;
            }
            game.reload();
            const once = game.resources(), roasted = game.engine.state.minis.fogueira.roasted;
            game.click('espeto:' + slot);
            assert.deepEqual(game.resources(), once, 'clicking the now empty skewer places food without repeating its old reward');
            assert.equal(game.engine.state.minis.fogueira.roasted, roasted);
            assert.equal(game.model().info().sticks[slot].progress, 0);
          }
          assert.equal(game.engine.state.minis.fogueira.perfect, quality === 'perfect' ? config.slots : 0);
          assert.equal(game.engine.state.minis.fogueira.burnt, quality === 'burnt' ? config.slots : 0);
          let events = game.click('fogo');
          assert.ok(events.some(event => event.type === 'mini' && event.mini === 'fogueira' && event.kind === 'jump'));
          assert.equal(game.engine.state.minis.fogueira.jumped, 1);
          report.jumps++;
          before = game.resources();
          game.click('fogo');
          assert.deepEqual(game.resources(), before, 'the same jump cannot pay twice');
          game.pause(config.jumpWait * 1000 - 1);
          before = game.resources();
          game.click('fogo');
          assert.deepEqual(game.resources(), before, 'a jump is still unavailable one millisecond early');
          game.pause(1);
          assert.equal(game.model().info().canJump, true);
          events = game.click('fogo');
          assert.ok(events.some(event => event.kind === 'jump'));
          assert.equal(game.engine.state.minis.fogueira.jumped, 2);
          report.jumps++;
          if (quality !== 'burnt') {
            game.pause(game.resources().holdUntil - game.wall - 1);
            assert.equal(game.engine.bellyHeld(), true);
            assert.equal(game.resources().belly, game.data.config.moodMax);
            game.pause(1);
            assert.equal(game.engine.bellyHeld(), false, 'the fullness hold expires at its exact deadline');
            assert.equal(game.resources().belly, game.data.config.moodMax);
          }
          game.pause(3600000);
          game.pause(13 * 3600000);
          assert.equal(game.resources().belly, 0, 'enough real time exhausts the belly without renewing it');
          assert.ok(game.model().info().sticks.every(stick => stick.progress === 0), 'all newly placed food remained raw throughout the pauses');
          game.nextYear();
          entry.passed = true;
          entry.result = { foodsRemoved: config.slots, quality, pausedSkewersPreserved: true, expiredFullnessRenewed: false };
        } catch (error) { entry.error = error.stack || String(error); report.failures.push(`${language}/${foodId}/${quality}/${mode}`); }
      }
    }
    console.log(JSON.stringify({ language, completedCases: report.cases.length, failedCases: report.failures.length }));
  }
} finally {
  I18N.setLanguage('pt-BR');
  fs.writeFileSync(path.join(__dirname, 'fogueira-progression-verification.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ cases: report.cases.length, actions: report.actions, reloads: report.reloads,
  newYears: report.newYears, roasts: report.roasts, discarded: report.discarded, jumps: report.jumps, ticks: report.ticks, failures: report.failures }));
if (report.failures.length) { console.error(report.cases.find(entry => entry.error).error); process.exitCode = 1; }
