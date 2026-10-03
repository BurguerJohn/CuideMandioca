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
const report = { cases: [], actions: 0, reloads: 0, newYears: 0, shows: 0, practices: 0, aborted: 0, notes: 0, firstPrizes: 0, failures: [] };
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-7, `${message}: ${actual} versus ${expected}`);

globalThis.Image = class { set src(value) { this.complete = true; this.width = 12; this.onload?.(); } };
require('../../src/festa-sprites');
require('../../src/festa');
require('../../src/janela-base');
require('../../src/janelas');
require('../../src/janela-palco');

function setup(language) {
  const data = copy(originalData);
  I18N.setLanguage(language);
  I18N.localizeData(data);
  let wall = stamp, visualTime = 1000;
  let engine = new GameEngine(data, null, { now: () => wall, rng: () => .5 });
  while (engine.state.size < 200) engine.addFame(engine.fameNeed() - engine.state.fame);
  engine.mini('mata').setAuto(false);
  engine.tick(.001);
  engine.drainEvents();
  const document = fakeDocument([]), settings = { zoom: 1, hidden: false, minis: { palco: { hidden: false } } };
  const host = globalThis.ArraiaJanelas.create({ document, engine, sprites: globalThis.FESTA_SPRITES,
    anchor: () => ({ left: 400, width: 800, lift: 20, top: 100 }), settings: () => settings,
    changeSettings: partial => Object.assign(settings, partial), placaRect: () => null,
    size: () => ({ width: 1600, height: 1000 }), t: (key, vars) => I18N.t(key, vars), sound() {}, toast() {} });
  host.restore();
  const model = () => engine.mini('palco'), item = () => host.windows.get('palco');
  const draw = () => { visualTime += 100; host.draw(visualTime); };
  const resources = () => ({ cheer: engine.state.cheer, earned: engine.state.stats.cheerEarned,
    tickets: engine.state.tickets, love: engine.mood().amor });
  const point = id => {
    const probe = item().view.probe(), area = probe.areas.find(entry => entry.id === id);
    assert.ok(area, 'the actual stage has region ' + id);
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
    const events = engine.drainEvents();
    host.onEvents(events, visualTime);
    draw();
    return events;
  };
  const until = (at, tick = false) => {
    assert.ok(at >= wall, 'the audit clock only moves forward');
    wall = at;
    engine.wake();
    if (tick) engine.tick(.001);
    draw();
  };
  const reload = () => {
    const saved = engine.exportState(), money = resources();
    engine = new GameEngine(data, copy(saved), { now: () => wall, rng: () => .5 });
    host.setEngine(engine);
    draw();
    assert.deepEqual(resources(), money, 'an immediate reload cannot repeat a performance prize');
    const s = engine.state.minis.palco;
    assert.equal(s.show, null, 'loading discards an unfinished performance');
    assert.equal(s.last, null, 'loading retains permanent results without replaying the result panel');
    for (const key of ['cooldownAt', 'shows', 'stars']) assert.deepEqual(s[key], saved.minis.palco[key]);
    for (const song of data.minis.palco.songs) assert.equal(s.best[song.id] || 0, saved.minis.palco.best[song.id] || 0,
      'an omitted zero-star entry retains the same song progress');
    report.reloads++;
  };
  draw();
  return { data, host, model, item, draw, resources, click, until, reload,
    get engine() { return engine; }, get wall() { return wall; },
    finish(song, profile, method = 'tick') {
      const cfg = data.minis.palco, state = engine.state.minis.palco;
      const previous = { best: state.best[song.id] || 0, shows: state.shows, stars: state.stars, cooldownAt: state.cooldownAt };
      this.click('musica:' + song.id);
      const live = engine.state.minis.palco.show;
      assert.ok(live && live.song === song.id);
      const practice = live.practice, start = live.startAt;
      const chart = copy(live.notes);
      assert.equal(chart.length, song.notes);
      let perfect = 0, good = 0, combo = 0, maxCombo = 0;
      for (let i = 0; i < chart.length; i++) {
        const note = chart[i];
        let offset = 0, hit = true;
        if (profile === 'perfect-early') offset = -cfg.perfect;
        if (profile === 'perfect-late') offset = cfg.perfect;
        if (profile === 'good-early') offset = -cfg.good;
        if (profile === 'good-late') offset = cfg.good;
        if (profile === 'mixed') offset = i % 3 ? cfg.perfect + 1 : 0;
        if (profile === 'half') hit = i % 2 === 0;
        if (profile === 'miss') hit = false;
        if (!hit) {
          this.until(start + note.t + cfg.good + 1, true);
          combo = 0;
          assert.equal(live.notes[i].state, 'miss', 'a deliberately missed note is settled by the game clock');
          engine.drainEvents();
          continue;
        }
        this.until(start + note.t + offset);
        const events = this.click('pista:' + note.lane);
        const judge = Math.abs(offset) <= cfg.perfect ? 'perfect' : 'good';
        const hits = events.filter(event => event.type === 'mini' && event.mini === 'palco' && event.kind === 'note');
        assert.equal(hits.length, 1, 'each actual lane click judges exactly one note');
        assert.equal(hits[0].lane, note.lane);
        assert.equal(hits[0].judge, judge, 'the timing boundary determines the judgement');
        assert.equal(live.notes[i].state, judge);
        if (judge === 'perfect') perfect++; else good++;
        combo++;
        maxCombo = Math.max(maxCombo, combo);
        assert.equal(live.combo, combo);
        assert.equal(live.maxCombo, maxCombo);
        report.notes++;
      }
      const accuracy = (3 * perfect + 2 * good) / (3 * chart.length);
      const stars = cfg.stars.filter(minimum => accuracy >= minimum).length;
      const first = !practice && stars === 3 && previous.best < 3;
      const end = start + chart.at(-1).t + 1200;
      this.until(end);
      assert.ok(engine.state.minis.palco.show, 'the exact end boundary still belongs to the live performance');
      this.until(end + 1);
      const before = this.resources(), cps = engine.cheerPerSecond();
      const spec = practice ? {} : cfg.rewards[stars];
      const cheer = spec.cheer ? Math.max(20, cps * spec.cheer) : 0;
      const tickets = (spec.tickets || 0) + (first ? cfg.firstThree.tickets : 0);
      const love = Math.min(data.config.moodMax, before.love + (spec.love || 0)) - before.love;
      let saved;
      if (method === 'save') saved = engine.exportState();
      else if (method === 'new-year') {
        assert.equal(engine.newYear(), true);
        report.newYears++;
      } else engine.tick(.001);
      const events = engine.drainEvents();
      const results = events.filter(event => event.type === 'mini' && event.mini === 'palco' && event.kind === 'show-end');
      assert.equal(results.length, 1, 'completion emits one result before resetting or saving');
      const result = results[0];
      assert.equal(result.song, song.id);
      assert.equal(result.stars, stars);
      near(result.accuracy, accuracy, 'the reported accuracy includes every missed note');
      assert.equal(result.perfect, perfect);
      assert.equal(result.good, good);
      assert.equal(result.miss, chart.length - perfect - good);
      assert.equal(result.maxCombo, maxCombo);
      assert.equal(result.practice, practice);
      assert.equal(result.aborted, false);
      assert.equal(result.first, first);
      near(result.reward.cheer || 0, cheer, 'the monetary prize follows the grade');
      assert.equal(result.reward.tickets || 0, tickets);
      near(result.reward.love || 0, love, 'the love prize respects the remaining capacity');
      near(engine.state.stats.cheerEarned, before.earned + cheer, 'completion records the reward exactly once');
      assert.equal(engine.state.tickets, before.tickets + tickets);
      if (method !== 'new-year') {
        near(engine.state.cheer, before.cheer + cheer, 'completion pays the expected Animação');
        near(engine.mood().amor, before.love + love, 'completion pays the expected love');
        assert.equal(engine.state.minis.palco.shows, previous.shows + Number(!practice));
        assert.equal(engine.state.minis.palco.stars, previous.stars + (practice ? 0 : stars));
        assert.equal(engine.state.minis.palco.best[song.id] || 0, practice ? previous.best : Math.max(previous.best, stars));
        assert.equal(engine.state.minis.palco.cooldownAt, !practice && stars >= 1 ? end + cfg.wait * 1000 : previous.cooldownAt);
      } else {
        assert.equal(engine.state.minis.palco.shows, 0);
        assert.equal(engine.state.minis.palco.stars, 0);
        assert.deepEqual(engine.state.minis.palco.best, {});
        assert.equal(engine.state.minis.palco.cooldownAt, 0);
      }
      if (saved) assert.equal(saved.minis.palco.shows, engine.state.minis.palco.shows);
      host.onEvents(events, visualTime);
      draw();
      report.shows++;
      if (practice) report.practices++;
      if (first) report.firstPrizes++;
      return { stars, practice, first, end };
    }
  };
}

for (const language of ['pt-BR', 'en', 'es']) for (let songIndex = 0; songIndex < sourceData.minis.palco.songs.length; songIndex++) {
  for (const profile of ['perfect', 'perfect-early', 'perfect-late', 'good-early', 'good-late', 'mixed', 'half', 'miss']) {
    for (const method of ['tick', 'save', 'new-year']) {
      const entry = { language, songIndex, profile, method };
      report.cases.push(entry);
      try {
        const game = setup(language), cfg = game.data.minis.palco, song = cfg.songs[songIndex];
        for (let i = 0; i < songIndex; i++) {
          const blocked = game.resources();
          game.click('musica:' + cfg.songs[i + 1].id);
          assert.equal(game.model().info().show, null, 'the next song is locked before earning a star');
          assert.deepEqual(game.resources(), blocked);
          const opened = game.finish(cfg.songs[i], 'good-late');
          assert.equal(opened.stars, 1);
          assert.equal(opened.practice, false);
          game.click('resultado');
          game.until(game.engine.state.minis.palco.cooldownAt, true);
          game.reload();
        }
        const result = game.finish(song, profile, method);
        const money = game.resources(), stats = copy(game.engine.state.stats);
        game.reload();
        assert.deepEqual(game.resources(), money);
        assert.deepEqual(game.engine.state.stats, stats);
        if (method !== 'new-year') {
          if (result.stars > 0) {
            const rehearsal = game.finish(song, 'perfect');
            assert.equal(rehearsal.practice, true, 'an immediate repeat is a rehearsal');
            assert.equal(rehearsal.first, false, 'a rehearsal cannot award a first-three-star bonus');
            game.click('resultado');
            const deadline = game.engine.state.minis.palco.cooldownAt;
            game.until(deadline - 1);
            game.click('musica:' + song.id);
            assert.equal(game.model().info().show.practice, true, 'one millisecond before the wait ends is still rehearsal');
            const beforeAbort = game.resources();
            assert.equal(game.model().abort().ok, true);
            assert.deepEqual(game.resources(), beforeAbort);
            assert.equal(game.model().info().last.aborted, true);
            report.aborted++;
            game.draw();
            game.click('resultado');
            game.until(deadline);
          }
          const repeated = game.finish(song, profile);
          assert.equal(repeated.practice, false);
          assert.equal(repeated.first, false, 'reloading retains the already awarded first-three-star record');
          game.click('resultado');
          if (game.engine.state.minis.palco.cooldownAt > game.wall) game.until(game.engine.state.minis.palco.cooldownAt, true);
          game.click('musica:' + song.id);
          const unfinished = game.resources();
          game.reload();
          assert.deepEqual(game.resources(), unfinished, 'reloading an unfinished song cannot pay a prize');
        } else {
          assert.equal(game.model().info().songs[0].open, true);
          assert.ok(game.model().info().songs.slice(1).every(entry => !entry.open), 'the new year restarts song progression');
        }
        entry.passed = true;
      } catch (error) {
        entry.error = error.stack || String(error);
        report.failures.push(entry);
      }
    }
  }
}

assert.deepEqual(sourceData, originalData, 'the audit leaves the shared game data unchanged');
fs.writeFileSync(path.join(__dirname, 'palco-progression-verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ cases: report.cases.length, passed: report.cases.filter(entry => entry.passed).length,
  actions: report.actions, reloads: report.reloads, newYears: report.newYears, shows: report.shows,
  practices: report.practices, aborted: report.aborted, notes: report.notes, firstPrizes: report.firstPrizes,
  failures: report.failures.map(entry => ({ language: entry.language, songIndex: entry.songIndex,
    profile: entry.profile, method: entry.method, error: entry.error.split('\n')[0] })) }));
process.exitCode = report.failures.length ? 1 : 0;
