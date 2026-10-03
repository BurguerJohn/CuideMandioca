'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const data = require('../../src/data');
const { GameEngine } = require('../../src/core');
const beforeFile = path.join(__dirname, 'mata-balance-before.json');
const baseline = process.argv.includes('--before');
const levels = [15, 30, 50, 80, 120, 200, 300, 500];
const seeds = [7, 17, 29];
const seconds = 600;
const cases = [];
for (const level of levels) for (const seed of seeds) {
  let random = seed, now = 1_000_000_000;
  const engine = new GameEngine(data, null, { now: () => now,
    rng: () => ((random = (Math.imul(random, 1664525) + 1013904223) >>> 0) / 2 ** 32) });
  engine.state.size = engine.state.records.size = 50;
  for (const id of ['rebolado', 'folego', 'refresco', 'ritmo']) engine.state.levels[id] = level;
  engine.state.humor = { amor: 80, barriga: 100, at: now };
  const mata = engine.mini('mata');
  mata.setVisibilityCheck?.(() => true);
  for (let step = 0; step < seconds * 20; step++) {
    now += 50;
    engine.lastTick = now;
    mata.tick(0.05);
  }
  const state = engine.state.minis.mata;
  const info = mata.info();
  assert.ok(info.hero && Number.isFinite(info.hero.hp) && info.hero.hp >= 0 && info.hero.hp <= info.hero.max);
  cases.push({ level, seed, best: state.best, wins: state.wins, defeats: state.defeats, stage: state.stage });
}
const report = { secondsPerCase: seconds, cases, foe: data.minis.mata.foe,
  recovery: { restHeal: data.minis.mata.hero.restHeal, restDef: data.minis.mata.hero.restDef } };
if (!baseline) {
  const before = JSON.parse(fs.readFileSync(beforeFile, 'utf8'));
  report.comparison = cases.map((entry, index) => {
    const previous = before.cases[index];
    assert.equal(entry.level, previous.level);
    assert.equal(entry.seed, previous.seed);
    assert.ok(entry.best <= previous.best, `level ${entry.level}, seed ${entry.seed}: the new combat requires more upgrades`);
    return { level: entry.level, seed: entry.seed, before: previous.best, after: entry.best };
  });
  const progressed = report.comparison.filter(entry => entry.before > 0);
  const beforeTotal = progressed.reduce((sum, entry) => sum + entry.before, 0);
  const afterTotal = progressed.reduce((sum, entry) => sum + entry.after, 0);
  report.progressReduction = 1 - afterTotal / beforeTotal;
  assert.ok(report.progressReduction >= 0.25, 'the new difficulty meaningfully reduces stage progression over the same ten minutes');
  assert.ok(cases.filter(entry => entry.level === 500).every(entry => entry.best >= 10), 'a sufficiently upgraded hero still clears all ten bosses');
}
const filename = baseline ? beforeFile : path.join(__dirname, 'mata-balance-verification.json');
fs.writeFileSync(filename, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ cases: cases.length, secondsPerCase: seconds,
  progressReduction: report.progressReduction, levels: levels.map(level => ({ level,
    best: cases.filter(entry => entry.level === level).map(entry => entry.best) })) }));
