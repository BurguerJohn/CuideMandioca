'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const originalData = require('../../src/data');
const { GameEngine } = require('../../src/core');
const I18N = require('../../src/i18n');
const { fakeDocument } = require('../../tests/fake-dom');
const copy = value => JSON.parse(JSON.stringify(value));
const report = { cases: [], actions: 0, reloads: 0, newYears: 0, harvests: 0, failures: [] };
const stamp = new Date(2026, 10, 4, 12).getTime();
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-8, `${message}: ${actual} versus ${expected}`);

globalThis.Image = class { set src(value) { this.complete = true; this.width = 12; this.onload?.(); } };
require('../../src/festa-sprites');
require('../../src/festa');
require('../../src/janela-base');
require('../../src/janelas');
require('../../src/janela-horta');

function setup(language, level, mode) {
  const data = copy(originalData);
  I18N.setLanguage(language);
  I18N.localizeData(data);
  let wall = stamp, visualTime = 1000;
  let engine = new GameEngine(data, null, { now: () => wall, rng: () => 0.5 });
  const grow = target => {
    while (engine.state.size < target) engine.addFame(engine.fameNeed() - engine.state.fame);
    engine.mini('mata').setAuto(false);
    engine.drainEvents();
  };
  grow(level);
  engine.addItem('espantalho');
  assert.equal(engine.equip('espantalho', 'direita'), true);
  engine.tick(0.001);
  engine.drainEvents();
  const document = fakeDocument([]);
  const settings = { zoom: 1, hidden: false, minis: { horta: { hidden: false } } };
  const host = globalThis.ArraiaJanelas.create({ document, engine, sprites: globalThis.FESTA_SPRITES,
    anchor: () => ({ left: 400, width: 800, lift: 20, top: 100 }), settings: () => settings,
    changeSettings: partial => Object.assign(settings, partial), placaRect: () => null,
    size: () => ({ width: 1600, height: 1000 }), t: (key, vars) => I18N.t(key, vars), sound() {}, toast() {} });
  host.restore();
  const model = () => engine.mini('horta');
  const item = () => host.windows.get('horta');
  const draw = () => { visualTime += 100; host.draw(visualTime); };
  const resources = () => ({ cheer: engine.state.cheer, tickets: engine.state.tickets, wood: engine.state.wood,
    earned: engine.state.stats.cheerEarned, love: engine.mood().amor, belly: engine.mood().barriga });
  const summary = () => copy(model().info());
  const replace = saved => { engine = new GameEngine(data, copy(saved), { now: () => wall, rng: () => 0.5 }); host.setEngine(engine); draw(); report.reloads++; };
  const reload = () => {
    const before = summary(), money = resources();
    replace(engine.exportState());
    assert.deepEqual(summary(), before, 'the reload retains plots, water, seed, permanent bonus and active buff deadlines');
    assert.deepEqual(resources(), money, 'an immediate reload does not repeat income or harvest rewards');
  };
  const click = id => {
    // O app acorda o motor antes de entregar o clique à janela. Esta auditoria usa o modelo e a vista reais.
    engine.wake();
    draw();
    const probe = item().view.probe(), area = probe.areas.find(entry => entry.id === id);
    assert.ok(area, 'the actual garden has region ' + id);
    const box = item().canvas.getBoundingClientRect();
    const x = box.left + (area.x + area.w / 2) * box.width / probe.size.width;
    const y = box.top + (area.y + area.h / 2) * box.height / probe.size.height;
    assert.equal(item().view.hit(x, y)?.id, id, 'the displayed region belongs to the intended plot or seed');
    report.actions++;
    assert.equal(item().view.click(x, y, visualTime), true);
    draw();
    const events = engine.drainEvents();
    if (mode === 'reload-each') reload();
    return events;
  };
  const elapse = ms => {
    assert.ok(ms >= 0);
    const saved = engine.exportState();
    wall += ms;
    if (mode === 'reload-growth') replace(saved);
    else engine.wake();
    model().tick();
    draw();
  };
  draw();
  return { get engine() { return engine; }, get wall() { return wall; }, data, model, item, host, draw, click, reload, elapse, resources,
    nextYear() {
      grow(200);
      const previous = item(), harvested = copy(engine.state.minis.horta.harvested), tickets = engine.state.tickets;
      assert.equal(engine.newYear(), true);
      host.onEvents(engine.drainEvents(), visualTime);
      draw();
      assert.notEqual(item(), previous, 'the manager replaces the old year view');
      assert.deepEqual(engine.state.minis.horta.harvested, harvested, 'the new year retains harvest counts');
      assert.equal(engine.state.tickets, tickets, 'the new year does not repay a first harvest');
      assert.equal(model().info().open, data.minis.horta.plotMax, 'the guest record retains all plots');
      assert.ok(model().info().plots.every(plot => !plot.crop), 'unfinished plants restart with the new year');
      assert.equal(engine.hortaBuffs().length, 0, 'temporary harvest buffs restart with the new year');
      assert.equal(model().info().water, data.minis.horta.waterMax);
      report.newYears++;
      reload();
    } };
}

try {
  for (const language of ['pt-BR', 'en', 'es']) for (const level of [22, 32, 42, 52, 62, 72, 82]) {
    for (const waters of [0, 1, 2]) for (const mode of ['continuous', 'reload-each', 'reload-growth']) {
      const entry = { language, level, waters, mode };
      report.cases.push(entry);
      try {
        const game = setup(language, level, mode), config = game.data.minis.horta;
        const harvested = new Map(), deadlines = new Map();
        const verifyBuffs = () => {
          for (const kind of ['cheer', 'speed', 'recovery', 'crit']) {
            const expected = config.crops.filter(crop => crop.buff.kind === kind && (deadlines.get(crop.id) || 0) > game.wall)
              .reduce((total, crop) => total + crop.buff.value, 0);
            near(game.engine.hortaBuff(kind), expected, 'only distinct unexpired crop buffs apply');
          }
          near(game.engine.hortaBonus(), harvested.size * config.permanentPct / 100, 'the permanent bonus counts distinct harvested crops');
        };
        assert.equal(game.model().info().open, Math.min(config.plotMax, config.plotsStart + (level - 22) / config.plotEvery));
        if (game.model().info().open < config.plotMax) {
          const before = copy(game.engine.state.minis.horta), money = game.resources();
          game.click('plot:' + game.model().info().open);
          assert.deepEqual(game.engine.state.minis.horta, before, 'a locked plot does not plant or spend water');
          assert.deepEqual(game.resources(), money);
        }
        for (let round = 0; round < 2; round++) {
          for (let index = 0; index < config.crops.length; index++) {
            const crop = config.crops[index], slot = index % game.model().info().open;
            game.click('semente:' + crop.id);
            assert.equal(game.model().info().seed, crop.id);
            game.click('plot:' + slot);
            let plot = game.engine.state.minis.horta.plots[slot];
            assert.equal(plot.crop, crop.id);
            assert.equal(plot.readyAt - plot.plantedAt, crop.minutes * 60000);
            for (let water = 0; water < waters; water++) {
              const before = { water: game.model().info().water, readyAt: plot.readyAt };
              game.click('plot:' + slot);
              plot = game.engine.state.minis.horta.plots[slot];
              near(plot.readyAt, game.wall + (before.readyAt - game.wall) * (1 - config.waterCut), 'watering shortens the remaining deadline');
              assert.equal(plot.waters, water + 1);
              assert.equal(game.model().info().water, before.water - 1);
            }
            if (waters === config.waterLimit) {
              const before = copy(game.engine.state.minis.horta);
              game.click('plot:' + slot);
              assert.deepEqual(game.engine.state.minis.horta, before, 'another click cannot exceed the watering limit');
            }
            game.elapse((plot.readyAt - game.wall) / 2);
            assert.equal(game.model().info().plots[slot].ready, false);
            assert.equal(game.model().info().plots[slot].stage, 1);
            game.elapse(game.engine.state.minis.horta.plots[slot].readyAt - game.wall - 1);
            assert.equal(game.model().info().plots[slot].ready, false, 'the crop is not ready one millisecond early');
            game.elapse(1);
            assert.equal(game.model().info().plots[slot].ready, true, 'the crop is ready at its exact deadline');
            game.engine.drainEvents();
            const before = game.resources(), count = harvested.get(crop.id) || 0;
            const cheer = crop.reward.cheer ? Math.max(20, game.engine.cheerPerSecond() * crop.reward.cheer) : 0;
            const events = game.click('plot:' + slot);
            const after = game.resources(), event = events.find(event => event.type === 'mini' && event.mini === 'horta' && event.kind === 'harvest');
            assert.ok(event, 'the UI click harvested the intended crop');
            assert.equal(event.crop, crop.id);
            assert.equal(event.first, count === 0);
            assert.equal(after.tickets - before.tickets, (crop.reward.tickets || 0) + (count ? 0 : config.firstHarvest.tickets));
            assert.equal(after.wood - before.wood, crop.reward.wood || 0);
            near(after.cheer - before.cheer, cheer, 'the harvest pays its cheer once with the prior bonuses');
            near(after.earned - before.earned, cheer, 'the earned counter records the actual reward');
            near(after.love, Math.min(game.data.config.moodMax, before.love + (crop.reward.love || 0)), 'the harvest adds its love');
            near(after.belly, Math.min(game.data.config.moodMax, before.belly + (crop.reward.belly || 0)), 'the harvest adds its food');
            assert.equal(game.model().info().plots[slot].crop, null);
            harvested.set(crop.id, count + 1);
            deadlines.set(crop.id, game.wall + config.buffMinutes * 60000);
            assert.equal(game.engine.state.minis.horta.harvested[crop.id], count + 1);
            assert.equal(game.engine.state.minis.horta.buffs[crop.id], deadlines.get(crop.id));
            verifyBuffs();
            report.harvests++;
            game.reload();
            verifyBuffs();
          }
          if (round === 0) {
            game.click('plot:0');
            assert.ok(game.model().info().plots[0].crop, 'the old year has an unfinished crop');
            game.nextYear();
            deadlines.clear();
            verifyBuffs();
          }
        }
        const latest = Math.max(...deadlines.values());
        game.elapse(latest - game.wall - 1);
        verifyBuffs();
        assert.ok(game.engine.hortaBuffs().length > 0);
        game.elapse(1);
        verifyBuffs();
        assert.equal(game.engine.hortaBuffs().length, 0, 'the last buff expires at its exact deadline');
        game.reload();
        assert.equal(game.engine.hortaBuffs().length, 0, 'reloading does not renew an expired buff');
        assert.ok(game.model().info().plots.every(plot => !plot.crop));
        entry.passed = true;
        entry.result = { distinctCrops: harvested.size, totalHarvests: [...harvested.values()].reduce((sum, count) => sum + count, 0),
          permanentBonus: game.engine.hortaBonus(), openPlots: game.model().info().open, year: game.engine.state.year };
      } catch (error) { entry.error = error.stack || String(error); report.failures.push(`${language}/${level}/${waters}/${mode}`); }
    }
  }
} finally {
  I18N.setLanguage('pt-BR');
  fs.writeFileSync(path.join(__dirname, 'horta-progression-verification.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ cases: report.cases.length, actions: report.actions, reloads: report.reloads,
  newYears: report.newYears, harvests: report.harvests, failures: report.failures }));
if (report.failures.length) { console.error(report.cases.find(entry => entry.error).error); process.exitCode = 1; }
