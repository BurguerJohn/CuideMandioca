'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sourceData = require('../../src/data');
const { GameEngine } = require('../../src/core');
const I18N = require('../../src/i18n');
const { fakeDocument } = require('../../tests/fake-dom');
const copy = value => JSON.parse(JSON.stringify(value));
const originalData = copy(sourceData);
const stamp = new Date(2026, 10, 4, 12).getTime();
const report = { cases: [], actions: 0, reloads: 0, newYears: 0, wishes: 0, simpatias: 0, rockets: 0, finales: 0, failures: [] };
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-7, `${message}: ${actual} versus ${expected}`);

globalThis.Image = class { set src(value) { this.complete = true; this.width = 12; this.onload?.(); } };
require('../../src/festa-sprites');
require('../../src/festa');
require('../../src/janela-base');
require('../../src/janelas');
require('../../src/janela-ceu');

function setup(language) {
  const data = copy(originalData);
  I18N.setLanguage(language);
  I18N.localizeData(data);
  let wall = stamp, visualTime = 1000, random = [];
  const rng = () => random.length ? random.shift() : .5;
  let engine = new GameEngine(data, null, { now: () => wall, rng });
  const grow = () => {
    while (engine.state.size < 200) engine.addFame(engine.fameNeed() - engine.state.fame);
    engine.mini('mata').setAuto(false);
    engine.drainEvents();
  };
  grow();
  engine.tick(.001);
  engine.drainEvents();
  const document = fakeDocument([]), settings = { zoom: 1, hidden: false, minis: { ceu: { hidden: false } } };
  const host = globalThis.ArraiaJanelas.create({ document, engine, sprites: globalThis.FESTA_SPRITES,
    anchor: () => ({ left: 400, width: 800, lift: 20, top: 100 }), settings: () => settings,
    changeSettings: partial => Object.assign(settings, partial), placaRect: () => null,
    size: () => ({ width: 1600, height: 1000 }), t: (key, vars) => I18N.t(key, vars), sound() {}, toast() {} });
  host.restore();
  const model = () => engine.mini('ceu'), item = () => host.windows.get('ceu');
  const resources = () => ({ cheer: engine.state.cheer, earned: engine.state.stats.cheerEarned,
    tickets: engine.state.tickets, wood: engine.state.wood, love: engine.mood().amor, belly: engine.mood().barriga });
  const draw = () => { visualTime += 100; host.draw(visualTime); };
  const point = id => {
    const probe = item().view.probe(), area = probe.areas.find(entry => entry.id === id);
    assert.ok(area, 'the actual sky has region ' + id);
    const box = item().canvas.getBoundingClientRect();
    for (const fx of [.5, .15, .85, .02, .98]) for (const fy of [.5, .15, .85, .02, .98]) {
      const spot = { x: box.left + (area.x + area.w * fx) * box.width / probe.size.width,
        y: box.top + (area.y + area.h * fy) * box.height / probe.size.height };
      if (item().view.hit(spot.x, spot.y)?.id === id) return spot;
    }
    assert.fail('the control has no visible point: ' + id);
  };
  const click = (id, redraw = true) => {
    engine.wake();
    draw();
    const spot = point(id);
    report.actions++;
    assert.equal(item().view.click(spot.x, spot.y, visualTime), true);
    const events = engine.drainEvents();
    if (redraw) draw();
    return { events, spot };
  };
  const reload = () => {
    const money = resources(), saved = engine.exportState(), old = copy(saved.minis.ceu);
    engine = new GameEngine(data, copy(saved), { now: () => wall, rng });
    host.setEngine(engine);
    draw();
    assert.deepEqual(resources(), money, 'an immediate reload cannot pay a sky prize again');
    assert.deepEqual(engine.state.minis.ceu.cards, old.cards);
    for (const key of ['fired', 'finales', 'wishes', 'simpatias', 'simpatiaAt', 'finaleAt']) assert.equal(engine.state.minis.ceu[key], old[key]);
    assert.deepEqual(engine.state.minis.ceu.volley, [], 'a closed game discards the unfinished volley');
    assert.equal(model().info().star, null, 'a shooting star cannot wait in a closed save');
    assert.equal(item().view.probe().shells, 0, 'reopening does not relaunch awarded rockets');
    report.reloads++;
  };
  const until = (at, tick = true) => {
    assert.ok(at >= wall, 'the audit clock only moves forward');
    wall = at;
    engine.wake();
    if (tick) engine.tick(.001);
    host.onEvents(engine.drainEvents(), visualTime);
    draw();
  };
  const expectReward = (before, spec, cps) => {
    const after = resources(), cheer = spec.cheer ? Math.max(20, cps * spec.cheer) : 0;
    near(after.cheer, before.cheer + cheer, 'the prize uses the production before receiving it');
    near(after.earned, before.earned + cheer, 'the earned total records the prize once');
    assert.equal(after.tickets, before.tickets + (spec.tickets || 0));
    assert.equal(after.wood, before.wood + (spec.wood || 0));
    near(after.love, Math.min(data.config.moodMax, before.love + (spec.love || 0)), 'love comes from the selected prize');
    near(after.belly, Math.min(data.config.moodMax, before.belly + (spec.belly || 0)), 'food comes from the selected prize');
  };
  draw();
  return { data, host, model, item, resources, draw, click, point, reload, until, expectReward,
    get engine() { return engine; }, get wall() { return wall; },
    random(values) { assert.equal(random.length, 0); random = values.slice(); },
    usedRandom() { assert.equal(random.length, 0, 'the actual action consumed the selected random draws'); },
    clickStale(spot) { report.actions++; assert.equal(item().view.click(spot.x, spot.y, visualTime), true); return engine.drainEvents(); },
    deal(id, index) {
      const pool = data.minis.ceu.simpatias.map(entry => entry.id);
      const at = pool.indexOf(id);
      const selected = [pool[(at + 1) % pool.length], pool[(at + 2) % pool.length]];
      selected.splice(index, 0, id);
      const remaining = pool.slice(), values = selected.map(chosen => {
        const slot = remaining.indexOf(chosen), value = (slot + .5) / remaining.length;
        remaining.splice(slot, 1);
        return value;
      });
      this.random(values);
      this.click('mesa');
      this.usedRandom();
      assert.deepEqual(model().info().cards, { ids: selected, picked: null });
    },
    nextYear() {
      grow();
      const old = item(), money = resources(), stats = copy(engine.state.stats);
      assert.equal(engine.newYear(), true);
      host.onEvents(engine.drainEvents(), visualTime);
      draw();
      assert.notEqual(item(), old, 'the new year recreates the sky view');
      assert.equal(engine.state.tickets, money.tickets);
      assert.deepEqual(engine.state.stats, stats, 'resetting the sky cannot repay a prize');
      const s = engine.state.minis.ceu;
      assert.equal(s.cards, null);
      assert.equal(s.star, null);
      assert.deepEqual(s.volley, []);
      for (const key of ['fired', 'finales', 'wishes', 'simpatias', 'simpatiaAt', 'finaleAt']) assert.equal(s[key], 0);
      assert.equal(s.rockets, data.minis.ceu.rocketMax);
      assert.equal(item().view.probe().shells, 0);
      assert.equal(item().view.probe().sparks, 0);
      report.newYears++;
      reload();
    }
  };
}

function audit(entry, run) {
  report.cases.push(entry);
  try { run(); entry.passed = true; }
  catch (error) { entry.error = error.stack || String(error); report.failures.push(entry); }
}

for (const language of ['pt-BR', 'en', 'es']) {
  for (const card of sourceData.minis.ceu.simpatias) for (const index of [0, 1, 2]) for (const mode of ['continuous', 'reload-cards']) {
    audit({ kind: 'cards', language, card: card.id, index, mode }, () => {
      const game = setup(language), cfg = game.data.minis.ceu;
      for (let round = 0; round < 2; round++) {
        game.deal(card.id, index);
        if (mode === 'reload-cards') game.reload();
        const concealed = copy(game.model().info().cards), beforeBlocked = game.resources();
        game.click('mesa');
        assert.deepEqual(game.model().info().cards, concealed, 'an open deal cannot be replaced from the table');
        assert.deepEqual(game.resources(), beforeBlocked);
        const before = game.resources(), cps = game.engine.cheerPerSecond();
        const { events, spot } = game.click('carta:' + index, false);
        game.expectReward(before, card.reward || {}, cps);
        assert.equal(game.model().info().cards.picked, index);
        assert.equal(game.engine.state.minis.ceu.simpatias, round + 1);
        assert.equal(events.filter(event => event.type === 'mini' && event.mini === 'ceu' && event.kind === 'simpatia').length, 1);
        if (card.frenzy) assert.equal(game.engine.state.runtime.frenzyUntil, game.wall + card.frenzy * 1000);
        const paid = game.resources();
        game.clickStale(spot);
        assert.deepEqual(game.resources(), paid, 'a second click before redraw cannot receive another card');
        report.simpatias++;
        game.draw();
        if (mode === 'reload-cards') game.reload();
        const until = game.wall + cfg.simpatiaWait * 1000;
        assert.equal(game.engine.state.minis.ceu.simpatiaAt, until);
        game.click('fechar');
        assert.equal(game.model().info().cards, null);
        game.click('mesa');
        assert.equal(game.model().info().cards, null, 'the table respects the wait after acknowledging the prize');
        if (round === 0) {
          game.until(until - 1);
          game.click('mesa');
          assert.equal(game.model().info().cards, null, 'the next deal is still unavailable one millisecond before the deadline');
          if (mode === 'reload-cards') game.reload();
          game.until(until);
        }
      }
      game.nextYear();
      game.deal(card.id, index);
      assert.equal(game.model().info().cards.picked, null, 'the new year allows a fresh unrewarded deal');
    });
  }

  for (let prize = 0; prize < sourceData.minis.ceu.wishes.length; prize++) for (const mode of ['live', 'expired', 'reload-live']) {
    audit({ kind: 'stars', language, prize, mode }, () => {
      const game = setup(language), cfg = game.data.minis.ceu;
      const spawn = () => {
        game.until(game.engine.state.minis.ceu.starAt);
        assert.ok(game.model().info().star);
      };
      spawn();
      if (mode === 'reload-live') {
        const before = game.resources();
        game.reload();
        assert.deepEqual(game.resources(), before);
        assert.equal(game.engine.state.minis.ceu.wishes, 0);
        assert.ok(game.engine.state.minis.ceu.starAt > game.wall);
        spawn();
      }
      if (mode === 'expired') {
        const deadline = game.engine.state.minis.ceu.star.until;
        game.until(deadline, false);
        const before = game.resources(), rockets = game.model().info().rockets;
        game.click('estrela');
        assert.deepEqual(game.resources(), before, 'an expired star cannot pay a wish');
        assert.equal(game.engine.state.minis.ceu.wishes, 0);
        assert.equal(game.model().info().rockets, rockets, 'an expired star click cannot launch a rocket');
        spawn();
      }
      game.until(game.engine.state.minis.ceu.star.until - 1, false);
      game.random([(prize + .5) / cfg.wishes.length, .5]);
      const before = game.resources(), cps = game.engine.cheerPerSecond(), rockets = game.model().info().rockets;
      const { events, spot } = game.click('estrela', false);
      game.usedRandom();
      game.expectReward(before, cfg.wishes[prize], cps);
      assert.equal(game.engine.state.minis.ceu.wishes, 1);
      assert.equal(game.model().info().star, null);
      assert.equal(game.model().info().rockets, rockets);
      assert.equal(events.filter(event => event.type === 'mini' && event.mini === 'ceu' && event.kind === 'wish').length, 1);
      const paid = game.resources();
      game.clickStale(spot);
      assert.deepEqual(game.resources(), paid, 'a stale star region cannot repeat the wish or launch a rocket');
      game.draw();
      game.reload();
      assert.equal(game.engine.state.minis.ceu.wishes, 1);
      report.wishes++;
      game.nextYear();
    });
  }

  for (const mode of ['continuous', 'reload-each', 'reload-before-finale']) for (const spaced of [false, true]) {
    audit({ kind: 'rockets', language, mode, spaced }, () => {
      const game = setup(language), cfg = game.data.minis.ceu;
      let fired = 0, finales = 0;
      const launch = expectedFinale => {
        const before = game.resources(), cps = game.engine.cheerPerSecond();
        const rocket = Math.max(20, cps * cfg.rocketCheer);
        const reference = new GameEngine(game.data, game.engine.exportState(), { now: () => game.wall, rng: () => .5 });
        reference.earn(rocket);
        const extra = expectedFinale ? Math.max(20, reference.cheerPerSecond() * cfg.finale.cheer) : 0;
        const { events } = game.click('ceu');
        near(game.resources().cheer, before.cheer + rocket + extra, 'rocket and finale pay their own production-based prizes');
        near(game.resources().earned, before.earned + rocket + extra, 'each rocket contributes once to earned Animação');
        assert.equal(game.resources().tickets, before.tickets + (expectedFinale ? cfg.finale.tickets : 0));
        assert.equal(events.filter(event => event.type === 'mini' && event.mini === 'ceu' && event.kind === 'rocket').length, 1);
        assert.equal(events.filter(event => event.type === 'mini' && event.mini === 'ceu' && event.kind === 'finale').length, Number(expectedFinale));
        fired++;
        if (expectedFinale) { finales++; report.finales++; }
        assert.equal(game.engine.state.minis.ceu.fired, fired);
        assert.equal(game.engine.state.minis.ceu.finales, finales);
        report.rockets++;
      };
      for (let shot = 0; shot < cfg.rocketMax; shot++) {
        if (shot && spaced) game.until(game.wall + cfg.volleyMs + 1);
        if (mode === 'reload-before-finale' && shot === cfg.volley - 1) game.reload();
        launch(!spaced && mode === 'continuous' && shot === cfg.volley - 1);
        if (mode === 'reload-each') game.reload();
      }
      assert.equal(game.model().info().rockets, spaced ? 1 : 0, 'only elapsed real recharge periods restore rockets');
      if (spaced) while (game.model().info().rockets) launch(false);
      const empty = game.resources(), count = fired;
      game.click('ceu');
      assert.deepEqual(game.resources(), empty, 'an empty launcher cannot pay a rocket');
      assert.equal(game.engine.state.minis.ceu.fired, count);
      const refill = game.engine.state.minis.ceu.rocketAt + cfg.rocketEvery * 1000;
      game.until(refill - 1, false);
      assert.equal(game.model().info().rockets, 0);
      game.until(refill, false);
      assert.equal(game.model().info().rockets, 1);
      launch(false);
      assert.equal(game.model().info().rockets, 0);
      game.reload();
      if (mode === 'continuous' && !spaced) {
        const deadline = game.engine.state.minis.ceu.finaleAt;
        assert.equal(finales, 1);
        assert.ok(deadline > game.wall, 'the finale wait survives reopening');
        game.until(deadline - 1);
        for (let shot = 0; shot < cfg.volley; shot++) launch(false);
        assert.equal(game.engine.state.minis.ceu.finales, 1, 'a full volley one millisecond early cannot repay the finale');
        game.until(deadline, false);
        launch(true);
        assert.equal(game.engine.state.minis.ceu.finales, 2, 'the next rocket at the deadline completes exactly one new finale');
        assert.equal(game.engine.state.minis.ceu.finaleAt, deadline + cfg.finaleWait * 1000);
        launch(false);
        game.reload();
        assert.equal(game.engine.state.minis.ceu.finales, 2);
        assert.equal(game.engine.state.minis.ceu.finaleAt, deadline + cfg.finaleWait * 1000);
      }
      game.nextYear();
    });
  }
}

assert.deepEqual(sourceData, originalData, 'the audit leaves the shared game data unchanged');
fs.writeFileSync(path.join(__dirname, 'ceu-progression-verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ cases: report.cases.length, passed: report.cases.filter(entry => entry.passed).length,
  actions: report.actions, reloads: report.reloads, newYears: report.newYears, wishes: report.wishes,
  simpatias: report.simpatias, rockets: report.rockets, finales: report.finales,
  failures: report.failures.map(entry => ({ kind: entry.kind, language: entry.language, card: entry.card,
    index: entry.index, mode: entry.mode, prize: entry.prize, spaced: entry.spaced, error: entry.error })) }));
process.exitCode = report.failures.length ? 1 : 0;
