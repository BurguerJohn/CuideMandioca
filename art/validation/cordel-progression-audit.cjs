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
const report = { cases: [], actions: 0, reloads: 0, newYears: 0, completedPages: 0, failures: [] };

globalThis.Image = class { set src(value) { this.complete = true; this.width = 12; this.onload?.(); } };
require('../../src/festa-sprites');
require('../../src/festa');
require('../../src/janela-base');
require('../../src/janelas');
require('../../src/janela-cordel');

function setup(language) {
  const data = copy(originalData);
  I18N.setLanguage(language);
  I18N.localizeData(data);
  let engine = new GameEngine(data, null, { now: () => stamp, rng: () => 0.5 });
  const document = fakeDocument([]);
  const settings = { zoom: 1, hidden: false, minis: { cordel: { hidden: false } } };
  let visualTime = 1000;
  const grow = () => {
    while (engine.state.size < 200) engine.addFame(engine.fameNeed() - engine.state.fame);
    engine.mini('mata').setAuto(false);
    engine.drainEvents();
  };
  grow();
  const host = globalThis.ArraiaJanelas.create({ document, engine, sprites: globalThis.FESTA_SPRITES,
    anchor: () => ({ left: 400, width: 800, lift: 20, top: 100 }), settings: () => settings,
    changeSettings: partial => Object.assign(settings, partial), placaRect: () => null,
    size: () => ({ width: 1600, height: 1000 }), t: (key, vars) => I18N.t(key, vars), sound() {}, toast() {} });
  host.restore();
  const draw = () => { visualTime += 100; host.draw(visualTime); };
  draw();
  const item = () => host.windows.get('cordel');
  const point = id => {
    const probe = item().view.probe();
    const area = probe.areas.find(entry => entry.id === id);
    assert.ok(area, 'the actual book has region ' + id);
    const box = item().canvas.getBoundingClientRect();
    return { x: box.left + (area.x + area.w / 2) * box.width / probe.size.width,
      y: box.top + (area.y + area.h / 2) * box.height / probe.size.height };
  };
  const click = id => {
    const spot = point(id);
    report.actions++;
    assert.equal(item().view.click(spot.x, spot.y, visualTime), true);
    draw();
  };
  const monetary = () => ({ cheer: engine.state.cheer, earned: engine.state.stats.cheerEarned,
    tickets: engine.state.tickets, love: engine.mood().amor });
  return {
    get engine() { return engine; }, data, host, item, draw, click, monetary,
    go(page) {
      const oldPoint = point('ponto');
      click('pagina:' + page);
      if (item().view.probe().turning) {
        const unchanged = copy(engine.state.minis.cordel);
        const money = monetary();
        report.actions++;
        assert.equal(item().view.click(oldPoint.x, oldPoint.y, visualTime), false, 'a click during the page turn cannot complete another page');
        assert.deepEqual(engine.state.minis.cordel, unchanged);
        assert.deepEqual(monetary(), money);
        visualTime += 1000;
        draw();
        draw(); // O primeiro quadro encerra a virada; o seguinte desenha o ponto clicável da página parada.
      }
      assert.equal(item().view.probe().shown, page);
      assert.equal(engine.mini('cordel').info().page, page);
    },
    reload() {
      const saved = engine.exportState();
      const money = monetary();
      engine = new GameEngine(data, copy(saved), { now: () => stamp, rng: () => 0.5 });
      host.setEngine(engine);
      draw();
      assert.deepEqual(monetary(), money, 'the reload cannot repeat a book reward');
      assert.deepEqual(engine.state.minis.cordel, saved.minis.cordel);
      report.reloads++;
    },
    nextYear() {
      grow();
      const book = copy(engine.state.minis.cordel);
      const tickets = engine.state.tickets, earned = engine.state.stats.cheerEarned;
      assert.equal(engine.newYear(), true);
      host.onEvents(engine.drainEvents(), visualTime);
      draw();
      assert.deepEqual(engine.state.minis.cordel, book, 'the new year retains page selection, partial clicks and completed rewards');
      assert.equal(engine.state.tickets, tickets);
      assert.equal(engine.state.stats.cheerEarned, earned);
      assert.equal(engine.mini('cordel').unlocked(), 20, 'the guest record retains all unlocked pages');
      report.newYears++;
    }
  };
}

try {
  for (const language of ['pt-BR', 'en', 'es']) {
    for (const mode of ['continuous', 'reload-each', 'new-year-before-prize', 'new-year-after-prize']) {
      const entry = { language, mode };
      report.cases.push(entry);
      try {
        const game = setup(language);
        for (let index = 0; index < game.data.minis.cordel.pages.length; index++) {
          const page = game.data.minis.cordel.pages[index], number = index + 1;
          game.go(number);
          for (let click = 0; click < page.goal - 1; click++) {
            const before = game.monetary();
            game.click('ponto');
            assert.deepEqual(game.monetary(), before, 'partial progress cannot pay the page prize');
            assert.equal(game.engine.state.minis.cordel.clicks[page.id], click + 1);
            if (mode === 'reload-each') game.reload();
          }
          if (mode === 'new-year-before-prize') { game.nextYear(); game.reload(); }
          const config = game.data.minis.cordel.reward, before = game.monetary();
          const cheer = Math.max(20, game.engine.cheerPerSecond() * (config.cheer + config.cheerPerPage * index));
          const tickets = number === game.data.minis.cordel.pages.length ? config.finalTickets
            : number % config.ticketsEvery === 0 ? config.tickets : 0;
          const itemBeforePrize = game.item();
          game.click('ponto');
          const after = game.monetary();
          assert.ok(Math.abs(after.cheer - before.cheer - cheer) < 1e-9);
          assert.ok(Math.abs(after.earned - before.earned - cheer) < 1e-9);
          assert.equal(after.tickets - before.tickets, tickets);
          assert.equal(after.love - before.love, Math.min(config.love, game.data.config.moodMax - before.love));
          assert.equal(game.engine.state.minis.cordel.done[page.id], true);
          assert.equal(game.engine.mini('cordel').info().completed, number);
          assert.equal(game.engine.mini('cordel').pending(), game.data.minis.cordel.pages.length - number);
          report.completedPages++;
          if (mode === 'new-year-after-prize') {
            game.nextYear();
            assert.notEqual(game.item(), itemBeforePrize, 'the actual window manager replaces the view from the old year');
          }
          game.reload();
          const once = game.monetary();
          game.click('ponto');
          assert.deepEqual(game.monetary(), once, 'clicking a completed page after reloading or changing year cannot pay it again');
          assert.equal(game.engine.mini('cordel').pending(), game.data.minis.cordel.pages.length - number);
        }
        game.nextYear();
        game.reload();
        assert.equal(game.engine.mini('cordel').info().completed, 20);
        assert.equal(game.engine.mini('cordel').pending(), 0);
        for (const page of [20, 1, 10, 20]) {
          game.go(page);
          const money = game.monetary();
          game.click('ponto');
          assert.deepEqual(game.monetary(), money);
        }
        entry.passed = true;
        entry.result = { completed: game.engine.mini('cordel').info().completed,
          pending: game.engine.mini('cordel').pending(), year: game.engine.state.year, tickets: game.engine.state.tickets };
      } catch (error) {
        entry.error = error.stack || String(error);
        report.failures.push(language + '/' + mode);
      }
    }
  }
} finally {
  I18N.setLanguage('pt-BR');
  fs.writeFileSync(path.join(__dirname, 'cordel-progression-verification.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ cases: report.cases.length, actions: report.actions, reloads: report.reloads,
  newYears: report.newYears, completedPages: report.completedPages, failures: report.failures }));
if (report.failures.length) { console.error(report.cases.find(entry => entry.error).error); process.exitCode = 1; }
