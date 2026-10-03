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
const report = { cases: [], actions: 0, steps: 0, reloads: 0, pauses: 0, newYears: 0,
  wins: 0, firstBosses: 0, trainingBosses: 0, defeats: 0, kills: 0, focused: 0, failures: [] };
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected)),
  `${message}: ${actual} versus ${expected}`);

globalThis.Image = class { set src(value) { this.complete = true; this.width = 12; this.onload?.(); } };
require('../../src/festa-sprites');
require('../../src/festa');
require('../../src/janela-base');
require('../../src/janelas');
require('../../src/janela-mata');

function setup(language, strong = true) {
  const data = copy(originalData);
  I18N.setLanguage(language);
  I18N.localizeData(data);
  let wall = stamp, visualTime = 1000, steps = 0;
  let engine = new GameEngine(data, null, { now: () => wall, rng: () => .5 });
  while (engine.state.size < 200) engine.addFame(engine.fameNeed() - engine.state.fame);
  if (strong) {
    // Only initial spending money is a fixture: levels, creatures and victories come from actual game actions.
    engine.state.cheer = 1e100;
    for (const id of ['rebolado', 'folego', 'refresco', 'ritmo']) {
      while (engine.level(id) < 350) assert.equal(engine.buyLevel(id), true);
    }
    engine.state.cheer = 0;
  }
  engine.drainEvents();
  const document = fakeDocument([]), settings = { zoom: 1, hidden: false, minis: { mata: { hidden: false } } };
  const host = globalThis.ArraiaJanelas.create({ document, engine, sprites: globalThis.FESTA_SPRITES,
    anchor: () => ({ left: 400, width: 800, lift: 20, top: 100 }), settings: () => settings,
    changeSettings: partial => Object.assign(settings, partial), placaRect: () => null,
    size: () => ({ width: 1600, height: 1000 }), t: (key, vars) => I18N.t(key, vars), sound() {}, toast() {} });
  host.restore();
  const model = () => engine.mini('mata'), state = () => engine.state.minis.mata;
  const item = () => host.windows.get('mata');
  const draw = () => { visualTime += 50; host.draw(visualTime); };
  const resources = () => ({ cheer: engine.state.cheer, earned: engine.state.stats.cheerEarned,
    tickets: engine.state.tickets, wood: engine.state.wood, love: engine.mood().amor, belly: engine.mood().barriga });
  const flush = () => { host.onEvents(engine.drainEvents(), visualTime); };
  const point = id => {
    const probe = item().view.probe(), area = probe.areas.find(entry => entry.id === id);
    assert.ok(area, 'the actual forest has region ' + id);
    const box = item().canvas.getBoundingClientRect();
    for (const fy of [.5, .02, .98]) for (const fx of [.5, .15, .85]) {
      const spot = { x: box.left + (area.x + area.w * fx) * box.width / probe.size.width,
        y: box.top + (area.y + area.h * fy) * box.height / probe.size.height };
      if (item().view.hit(spot.x, spot.y)?.id === id) return spot;
    }
    assert.fail('no visible point for ' + id);
  };
  const click = id => {
    engine.wake();
    draw();
    const spot = point(id);
    report.actions++;
    assert.equal(item().view.click(spot.x, spot.y, visualTime), true);
    flush();
    draw();
  };
  const reload = () => {
    const before = copy(state()), live = model().probe(), money = resources();
    const saved = engine.exportState();
    assert.deepEqual(state(), before, 'saving the victory checkpoint does not move the live celebration');
    const expected = copy(before);
    if (live.fight?.phase === 'win') {
      const win = model().events().findLast(event => event.kind === 'win');
      expected.stage = before.battle >= data.minis.mata.battles && win.first ? before.stage + 1 : before.stage;
      expected.battle = before.battle >= data.minis.mata.battles ? 0 : before.battle + 1;
    }
    assert.deepEqual(saved.minis.mata, expected, 'the saved checkpoint advances only a paid victory');
    engine = new GameEngine(data, copy(saved), { now: () => wall, rng: () => .5 });
    host.setEngine(engine);
    draw();
    assert.deepEqual(resources(), money, 'an immediate reload cannot repeat a forest prize');
    assert.deepEqual(state(), expected, 'loading retains every permanent forest counter');
    assert.equal(model().probe().fight, null, 'loading restarts the current battle without a live scene');
    assert.deepEqual(model().events(), [], 'loading cannot replay combat effects');
    report.reloads++;
  };
  const tick = () => {
    wall += 50;
    // This audit drives the battle model clock; income from dancing and the other eight windows is excluded.
    engine.lastTick = wall;
    engine.settleMood();
    const before = copy(state()), live = copy(model().info()), money = resources();
    const cps = engine.cheerPerSecond(), pet = model().companion();
    const seq = live.seq;
    model().tick(.05);
    steps++;
    report.steps++;
    const events = model().events(seq), won = events.filter(event => event.kind === 'win'), lost = events.filter(event => event.kind === 'lose');
    assert.ok(won.length <= 1 && lost.length <= 1, 'one combat step settles at most one battle');
    assert.equal(state().wins, before.wins + won.length);
    assert.equal(state().defeats, before.defeats + lost.length);
    const kills = copy(before.kills);
    for (const event of events.filter(event => event.kind === 'die')) {
      const enemy = live.enemies.find(entry => entry.uid === event.uid);
      assert.ok(enemy && !enemy.dead, 'a death belongs to a previously live enemy');
      kills[enemy.id] = (kills[enemy.id] || 0) + 1;
      report.kills++;
    }
    assert.deepEqual(state().kills, kills, 'each actual enemy death adds exactly one permanent kill');
    if (won.length) {
      const win = won[0], r = data.minis.mata.reward;
      assert.equal(win.stage, before.stage);
      assert.equal(win.boss, before.battle >= data.minis.mata.battles);
      const first = win.boss && win.stage > before.best;
      const tickets = first ? r.firstClear.tickets : win.boss && (before.bosses + 1) % r.ticketEvery === 0 ? 1 : 0;
      const wood = win.boss ? r.bossWood + (first ? r.firstClear.wood : 0) : 0;
      const cheer = Math.max(20, cps * (r.cheer + r.cheerPerStage * (win.stage - 1)) * (win.boss ? r.bossMult : 1));
      const love = Math.min(engine.cfg.moodMax - money.love, win.boss ? r.loveBoss : r.love);
      assert.equal(win.first, first, 'only a boss beyond the previous record earns a first-clear prize');
      assert.equal(win.reward.tickets || 0, tickets);
      assert.equal(win.reward.wood || 0, wood);
      near(win.reward.cheer, cheer, 'the combat prize follows the stage and current party income');
      near(win.reward.love, love, 'the love prize respects the remaining capacity');
      near(engine.state.cheer, money.cheer + cheer, 'the monetary prize is paid exactly once');
      near(engine.state.stats.cheerEarned, money.earned + cheer, 'the prize is recorded exactly once');
      assert.equal(engine.state.tickets, money.tickets + tickets);
      assert.equal(engine.state.wood, money.wood + wood);
      near(engine.mood().amor, money.love + love, 'the love prize is applied exactly once');
      near(engine.mood().barriga, engine.bellyHeld() ? money.belly : Math.max(0, money.belly - (win.boss ? r.bellyBoss : r.belly)),
        'winning spends belly unless a food bonus is holding it full');
      assert.equal(state().best, first ? win.stage : before.best);
      assert.equal(state().bosses, before.bosses + Number(win.boss));
      if (first) {
        const expectedItems = data.minis.mata.unlocks.filter(entry => entry.stage === win.stage).map(entry => entry.item);
        assert.deepEqual(win.items, expectedItems);
        assert.ok(expectedItems.every(id => engine.owned(id)), 'the first victory unlocks its actual wardrobe items');
        report.firstBosses++;
      } else {
        assert.deepEqual(win.items, [], 'training cannot give the same wardrobe items again');
        if (win.boss) report.trainingBosses++;
      }
      if (win.boss && pet) assert.equal(model().companion().bond, Math.min(pet.max, pet.bond + 1), 'the chosen pet gains one bond per boss');
      report.wins++;
    } else {
      assert.equal(state().bosses, before.bosses);
      assert.equal(state().best, before.best);
      assert.deepEqual(resources(), money, 'unfinished combat and defeats cannot pay a victory prize');
    }
    if (lost.length) {
      assert.equal(state().teimosia, Math.min(data.minis.mata.teimosiaMax, before.teimosia + 1));
      assert.equal(state().battle, 0, 'a defeat restarts the stage from its first battle');
      report.defeats++;
    }
    flush();
    if (steps % 5 === 0 || won.length || lost.length || events.some(event => event.kind === 'begin')) draw();
    return { won: won[0], lost: lost[0], events };
  };
  const pause = () => {
    assert.equal(model().info().auto, true);
    click('auto');
    const frozen = copy(model().info()), permanent = copy(state()), money = resources();
    for (let i = 0; i < 100; i++) tick();
    const after = copy(model().info());
    for (const key of ['phase', 'clock', 't', 'seq', 'hero', 'enemies']) assert.deepEqual(after[key], frozen[key], 'pausing freezes ' + key);
    assert.deepEqual(state(), permanent);
    for (const key of ['cheer', 'earned', 'tickets', 'wood']) assert.equal(resources()[key], money[key]);
    click('auto');
    assert.equal(model().info().auto, true);
    report.pauses++;
  };
  const newYear = () => {
    const tickets = engine.state.tickets, earned = engine.state.stats.cheerEarned;
    const inventory = copy(engine.state.inventory);
    assert.equal(engine.newYear(), true);
    flush();
    draw();
    assert.deepEqual(state(), { stage: 1, battle: 0, best: 0, auto: true, companion: '', teimosia: 0, wins: 0, bosses: 0, defeats: 0, kills: {} });
    assert.equal(model().probe().fight, null);
    assert.deepEqual(model().events(), []);
    assert.equal(item().view.probe().floaters, 0, 'new-year views cannot retain old combat damage');
    assert.equal(engine.state.tickets, tickets);
    assert.equal(engine.state.stats.cheerEarned, earned);
    assert.deepEqual(engine.state.inventory, inventory, 'the earned wardrobe remains owned in the new year');
    report.newYears++;
    reload();
    pause();
  };
  draw();
  return { data, model, state, item, draw, click, reload, tick, pause, newYear, resources,
    get engine() { return engine; } };
}

function progress(language, mode, companion) {
  const game = setup(language), cfg = game.data.minis.mata;
  if (companion) {
    for (let i = 0; game.state().companion !== companion && i < 10; i++) game.click('pet');
    assert.equal(game.state().companion, companion);
  }
  const locked = copy(game.state()), money = game.resources();
  game.click('prev');
  game.click('next');
  assert.deepEqual(game.state(), locked, 'stage arrows cannot leave the unlocked interval');
  assert.deepEqual(game.resources(), money);
  const paused = new Set(), restarted = new Set(), focused = new Set();
  const runUntil = (predicate, training = false) => {
    for (let i = 0; i < 60000 && !predicate(); i++) {
      const info = game.model().info(), key = info.stage + ':' + info.battle + ':' + info.wins;
      if (info.phase === 'fight') {
        if (!paused.has(key)) { paused.add(key); game.pause(); }
        if (info.enemies.length > 1 && !focused.has(key)) {
          focused.add(key);
          const foe = info.enemies.at(-1);
          game.click('foe:' + foe.uid);
          assert.equal(game.model().info().enemies.find(entry => entry.uid === foe.uid).focus, true);
          report.focused++;
        }
        if (mode === 'reload-fight' && !restarted.has(key)) {
          restarted.add(key);
          assert.ok(info.enemies.every(enemy => !enemy.dead), 'the unfinished-reload case begins before any kill');
          game.reload();
          continue;
        }
      }
      const result = game.tick();
      assert.equal(result.lost, undefined, 'the purchased attributes can complete the declared progression');
      if (result.won && mode === 'reload-win') game.reload();
      if (training && result.won?.boss) assert.equal(result.won.first, false);
    }
    assert.ok(predicate(), 'natural combat reaches its target within the audit budget');
  };
  runUntil(() => game.state().best === 20);
  assert.equal(game.state().wins, 20 * (cfg.battles + 1));
  assert.equal(game.state().bosses, 20);
  assert.ok(cfg.unlocks.every(entry => game.engine.owned(entry.item)), 'all twelve configured clothing rewards are unlocked through combat');
  game.reload();
  assert.equal(game.state().stage, 21, 'a saved first clear proceeds to the next loop of stronger enemies');
  assert.equal(game.model().info().lap, 2);
  while (game.state().stage > 1) game.click('prev');
  const before = game.resources(), previousBosses = game.state().bosses;
  const targetBosses = previousBosses + cfg.reward.ticketEvery - previousBosses % cfg.reward.ticketEvery;
  runUntil(() => game.state().bosses === targetBosses, true);
  assert.equal(game.state().stage, 1, 'training remains in the already cleared stage');
  assert.equal(game.state().best, 20, 'training cannot lower or replace the progression record');
  assert.equal(game.resources().tickets, before.tickets + 1, 'the periodic training ticket is paid once at the fifteenth boss');
  assert.equal(game.resources().wood, before.wood + targetBosses - previousBosses, 'training pays one wood per boss without a repeated first-clear bonus');
  const owned = cfg.unlocks[0].item;
  const same = game.resources();
  game.click('item:' + owned);
  assert.deepEqual(game.resources(), same, 'viewing the unlocked item does not pay its prize again');
  game.reload();
  assert.equal(game.state().stage, 1);
  game.newYear();
}

function defeats(language) {
  const game = setup(language, false), cfg = game.data.minis.mata;
  const reloaded = new Set();
  for (let i = 0; i < 60000 && game.state().defeats <= cfg.teimosiaMax; i++) {
    const result = game.tick();
    if (result.lost && !reloaded.has(game.state().defeats)) {
      reloaded.add(game.state().defeats);
      const progress = copy(game.state());
      game.reload();
      assert.deepEqual(game.state(), progress, 'reloading a defeat retains earned wins, kills and the capped retry bonus');
      game.pause();
    }
  }
  assert.equal(game.state().defeats, cfg.teimosiaMax + 1);
  assert.equal(game.state().teimosia, cfg.teimosiaMax, 'further defeats cannot exceed the retry bonus cap');
  assert.equal(game.state().stage, 1);
  assert.equal(game.state().best, 0);
  game.newYear();
}

for (const language of ['pt', 'en', 'es']) {
  for (const mode of ['continuous', 'reload-win', 'reload-fight']) for (const companion of ['', 'galinha']) {
    const entry = { language, mode, companion };
    report.cases.push(entry);
    try { progress(language, mode, companion); entry.passed = true; }
    catch (error) { entry.error = error.stack || String(error); report.failures.push(entry); }
  }
  const entry = { language, mode: 'defeats', companion: '' };
  report.cases.push(entry);
  try { defeats(language); entry.passed = true; }
  catch (error) { entry.error = error.stack || String(error); report.failures.push(entry); }
}

assert.deepEqual(sourceData, originalData, 'the audit leaves the shared game data unchanged');
fs.writeFileSync(path.join(__dirname, 'mata-progression-verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ cases: report.cases.length, passed: report.cases.filter(entry => entry.passed).length,
  actions: report.actions, steps: report.steps, reloads: report.reloads, pauses: report.pauses, newYears: report.newYears,
  wins: report.wins, firstBosses: report.firstBosses, trainingBosses: report.trainingBosses, defeats: report.defeats,
  kills: report.kills, focused: report.focused,
  failures: report.failures.map(entry => ({ language: entry.language, mode: entry.mode, companion: entry.companion,
    error: entry.error.split('\n')[0] })) }));
process.exitCode = report.failures.length ? 1 : 0;
