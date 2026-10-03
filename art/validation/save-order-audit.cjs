'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../../src/core');
const data = require('../../src/data');
const { fakeDocument } = require('../../tests/fake-dom');
const stamp = new Date(2026, 10, 4, 12).getTime();
const appSource = fs.readFileSync(path.join(__dirname, '../../src/app.js'), 'utf8');
const ids = ['festa', 'festa-canvas', 'placa', 'avisos', 'painel', 'painel-abas', 'painel-corpo',
  'painel-titulo', 'janela', 'janela-corpo', 'importar', 'vitrine', 'argolas', 'argolas-canvas', 'argolas-info',
  'tela', 'tela-corpo', 'tela-titulo', 'zoom-guia', 'casa', 'casa-canvas', 'casa-contagem', 'casa-cena'];
const report = { cases: [], saves: 0, reloads: 0, failures: [] };
const copy = value => JSON.parse(JSON.stringify(value));

function initial(clock) {
  const engine = new core.GameEngine(data, null, { now: () => clock.now, rng: () => 0.5 });
  while (engine.state.size < 75) engine.addFame(engine.fameNeed() - engine.state.fame);
  engine.state.cheer = 100000;
  engine.state.tickets = 1000;
  engine.state.fame = engine.fameNeed() - 1;
  engine.mini('mata').setAuto(false);
  engine.tick(0.001);
  return engine.exportState();
}

function boot(clock, saved) {
  const document = fakeDocument(ids.map(id => '#' + id));
  const listeners = {}, frames = [], snapshots = [], errors = [];
  let api, command;
  class ClockGame extends core.GameEngine {
    constructor(gameData, raw) { super(gameData, raw, { now: () => clock.now, rng: () => 0.5 }); }
  }
  const desktop = {
    language: { choice: 'auto', id: 'pt-BR', auto: 'pt-BR' }, steam: { on: false },
    loadGame: () => copy(saved), saveGame: state => { snapshots.push(copy(state)); report.saves++; return true; },
    getSettings: () => Promise.resolve({ revision: 0, pinned: true, zoom: 1, x: 0.7, lift: 0, hud: 'sempre', hidden: false }),
    updateSettings: partial => Promise.resolve({ revision: 1, ...partial }),
    setInteractive() {}, setFocusable() {}, focusGame() {}, onCommand: callback => { command = callback; },
    logError: error => errors.push(error)
  };
  const sandbox = {
    ArraiaCore: { ...core, GameEngine: ClockGame }, ArraiaUI: require('../../src/ui'),
    ArraiaI18n: require('../../src/i18n'), ArraiaSettings: require('../../src/settings'), GAME_DATA: data,
    arraiaDesktop: desktop, document, __gravador: value => { api = value; },
    addEventListener: (name, callback) => { listeners[name] = callback; },
    requestAnimationFrame: callback => frames.push(callback),
    performance: { now: () => 1000 + clock.now - stamp },
    innerWidth: 1920, innerHeight: 1040, Intl, Date, Math, JSON, Promise,
    console: { error: error => errors.push(String(error)) },
    setInterval() {}, clearInterval() {}, setTimeout() { return 1; }, clearTimeout() {},
    localStorage: null, Blob: class {}, URL: { createObjectURL: () => 'blob:', revokeObjectURL() {} }, confirm: () => true
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(appSource, sandbox);
  return { engine: api.engine(), snapshots, errors, save(route) {
    if (route === 'close') listeners.beforeunload({ type: 'beforeunload' });
    else if (route === 'suspend') command('salvar');
    else frames.shift()(sandbox.performance.now());
  } };
}

function scene(engine, clock, kind) {
  engine.tick(0.001);
  if (kind === 'wedding') {
    assert.equal(engine.startWedding(), true);
    for (let rice = 0; rice < engine.cfg.weddingRice; rice++) {
      assert.equal(engine.throwRice().ready, true);
      clock.now += engine.cfg.riceCooldown * 1000;
    }
  } else if (kind === 'contest') {
    assert.ok(engine.debug('concurso'));
  } else if (kind === 'palco') {
    const palco = engine.mini('palco');
    const song = data.minis.palco.songs[0].id;
    assert.equal(palco.start(song).ok, true);
    const show = engine.state.minis.palco.show;
    for (const note of show.notes) {
      clock.now = show.startAt + note.t;
      assert.equal(palco.hit(note.lane).judge, 'perfect');
    }
    clock.now = show.startAt + show.notes.at(-1).t + 1199;
  } else if (kind === 'auction-win' || kind === 'auction-loss') {
    engine.startLeilao();
    assert.ok(engine.bidLeilao().bid);
    if (kind === 'auction-win') {
      while (engine.state.leilao.active.rivalAt) {
        clock.now = engine.state.leilao.active.rivalAt;
        engine.updateLeilao();
        assert.ok(engine.bidLeilao().bid);
      }
      assert.equal(engine.state.leilao.active.leader, 'voce');
    }
  } else if (kind === 'quentao') {
    assert.equal(engine.buyItem('barril-quentao'), true);
    assert.equal(engine.equip('barril-quentao', 'esquerda'), true);
    engine.startCold();
  } else throw new Error('unknown scene: ' + kind);
  engine.tick(0.001);
  engine.drainEvents();
}

function openRound(engine, kind) {
  if (kind === 'argolas') {
    assert.ok(engine.startRings());
    assert.equal(engine.ringHit(0).hit, true);
  } else if (kind === 'bingo') {
    assert.equal(engine.buyBingo(), true);
    assert.ok(engine.drawBingo());
    assert.equal(engine.state.bingo.round.result, null);
  }
}

function checkpoint(state) {
  return copy(Object.fromEntries(['cheer', 'tickets', 'wood', 'size', 'fame', 'stats', 'inventory', 'album',
    'achievements', 'bingo', 'lastSeen'].map(key => [key, state[key]])));
}

function reload(saved, clock) {
  report.reloads++;
  return new core.GameEngine(data, copy(saved), { now: () => clock.now, rng: () => 0.5 });
}

(async () => {
  for (const kind of ['wedding', 'contest', 'palco', 'auction-win', 'auction-loss', 'quentao']) {
    for (const route of ['close', 'suspend', 'auto']) for (const round of ['none', 'argolas', 'bingo']) {
      for (const hours of [1 / 3, 13]) {
        const entry = { scene: kind, route, round, hours };
        report.cases.push(entry);
        try {
          const clock = { now: stamp }, referenceClock = { now: stamp };
          const start = initial(clock), app = boot(clock, start);
          await Promise.resolve();
          const reference = new core.GameEngine(data, copy(start), { now: () => referenceClock.now, rng: () => 0.5 });
          scene(app.engine, clock, kind);
          scene(reference, referenceClock, kind);
          assert.equal(clock.now, referenceClock.now);
          openRound(app.engine, round);
          openRound(reference, round);
          clock.now += hours * 3600000;
          referenceClock.now = clock.now;
          const woke = reference.wake();
          assert.ok(woke && woke.cheer > 0);
          assert.equal(woke.capped, hours > data.config.offlineCapHours);
          const expected = reference.exportState();
          app.save(route);
          assert.equal(app.snapshots.length, 1, 'the actual app callback saved once');
          assert.deepEqual(app.errors, []);
          const saved = app.snapshots.at(-1);
          assert.deepEqual(checkpoint(saved), checkpoint(expected), 'the actual save route pays the pause before pending rewards');
          assert.equal(saved.lastSeen, clock.now);
          if (kind === 'wedding') assert.equal(saved.stats.weddings, start.stats.weddings + 1);
          if (kind === 'contest') assert.equal(saved.stats.contests, start.stats.contests + 1);
          if (kind === 'palco') {
            assert.equal(saved.minis.palco.shows, start.minis.palco.shows + 1);
            assert.equal(saved.minis.palco.best[data.minis.palco.songs[0].id], 3);
          }
          if (kind === 'auction-win') assert.equal(saved.stats.leiloes, start.stats.leiloes + 1);
          if (kind === 'auction-loss') assert.equal(saved.stats.leiloes, start.stats.leiloes);
          if (kind === 'quentao') assert.equal(saved.stats.quentao, start.stats.quentao, 'no quentao sales during sleep');
          const loaded = reload(saved, clock);
          assert.equal(loaded.welcome, null, 'the already-paid pause is not paid again on load');
          assert.equal(loaded.state.cheer, saved.cheer);
          const refund = round === 'argolas' ? saved.rings.held : 0;
          assert.equal(loaded.state.tickets, saved.tickets + refund, 'only the interrupted Argolas entry is refunded');
          if (round === 'bingo') assert.deepEqual(loaded.state.bingo, saved.bingo, 'Bingo retains the existing card and draws');
          const first = loaded.exportState();
          const twice = reload(first, clock);
          assert.deepEqual(checkpoint(twice.exportState()), checkpoint(first), 'a second save/load does not repeat a prize or refund');
          assert.deepEqual(twice.state.minis.palco.best, first.minis.palco.best);
          entry.result = { cheer: saved.cheer, tickets: saved.tickets, refund, offlineSeconds: woke.seconds, size: saved.size };
          entry.passed = true;
        } catch (error) {
          entry.error = error.stack || String(error);
          report.failures.push([kind, route, round, hours].join('/'));
        }
      }
    }
  }
  fs.writeFileSync(path.join(__dirname, 'save-order-verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ cases: report.cases.length, saves: report.saves, reloads: report.reloads, failures: report.failures }));
  if (report.failures.length) {
    console.error(report.cases.find(entry => entry.error).error);
    process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
