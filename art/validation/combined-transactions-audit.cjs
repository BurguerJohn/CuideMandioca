'use strict';

// Exercise real engine actions together. The ledger records costs and rewards independently;
// time is advanced only to the auction's declared deadlines, without unrelated party events.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { GameEngine } = require('../../src/core');
const data = require('../../src/data');
const stamp = new Date(2026, 9, 3, 12).getTime();
const copy = value => JSON.parse(JSON.stringify(value));
const cfg = data.config;
const report = { cases: [], actions: 0, reloads: 0, years: 0, failures: [] };
const orders = [
  ['auction', 'bingo', 'rings'], ['auction', 'rings', 'bingo'],
  ['bingo', 'auction', 'rings'], ['bingo', 'rings', 'auction'],
  ['rings', 'auction', 'bingo'], ['rings', 'bingo', 'auction']
];
const themes = [
  { name: 'tickets-wood', rolls: [0.1, 0.74, 0.84, 0.94, 0.98], rng: 0.2 },
  { name: 'cheer-multipliers', rolls: [0.5, 0.84, 0.94, 0.1, 0.74], rng: 0.5 },
  { name: 'exclusive', rolls: [0.98, 0.98, 0.1, 0.5, 0.74], rng: 0.9 }
];

function setup(theme, tickets = 80, allAuctionItems = false) {
  const clock = { now: stamp };
  const rng = () => theme.rng;
  let engine = new GameEngine(data, null, { now: () => clock.now, rng });
  while (engine.state.size < 100) engine.addFame(engine.fameNeed() - engine.state.fame);
  engine.mini('mata').setAuto(false);
  // Funding uses normal purchases; the audit starts after setup, with no pending daily reward.
  // Opening the Aquarium legitimately grants three discovery tickets. Spend them in the shop
  // when preparing a smaller balance, rather than silently treating those tickets as a bug.
  if (engine.state.tickets > tickets) {
    const item = data.items.find(item => !item.source && item.price >= engine.state.tickets);
    assert.ok(item);
    while (engine.state.tickets < item.price) {
      engine.earn(engine.ticketCost(), false);
      assert.equal(engine.buyTicket(), true);
    }
    assert.equal(engine.buyItem(item.id), true);
    assert.equal(engine.state.tickets, 0);
  }
  while (engine.state.tickets < tickets) {
    engine.earn(engine.ticketCost(), false);
    assert.equal(engine.buyTicket(), true);
  }
  engine.earn(1000, false);
  if (allAuctionItems) for (const item of data.items.filter(item => item.source === 'leilao')) engine.addItem(item.id);
  engine.drainEvents();
  const ledger = {
    tickets: engine.state.tickets, cheer: engine.state.cheer, wood: engine.state.wood,
    inventory: new Set(engine.state.inventory),
    stats: Object.fromEntries(['ringRounds', 'ringHits', 'bingoCards', 'bingos', 'lances', 'leiloes'].map(id => [id, engine.state.stats[id]])),
    auction: 0, rings: 0
  };
  let actions = 0, reloads = 0, years = 0;
  function check(label) {
    for (const key of ['tickets', 'cheer', 'wood']) {
      assert.equal(engine.state[key], ledger[key], label + ': ' + key);
      assert.ok(Number.isFinite(engine.state[key]) && engine.state[key] >= 0, label + ': valid balance');
    }
    assert.deepEqual([...engine.state.inventory].sort(), [...ledger.inventory].sort(), label + ': inventory');
    for (const [key, value] of Object.entries(ledger.stats)) assert.equal(engine.state.stats[key], value, label + ': ' + key);
    assert.equal(engine.state.leilao.active?.held || 0, ledger.auction, label + ': auction escrow');
    assert.equal(engine.round?.cost || 0, ledger.rings, label + ': Argolas escrow');
    engine.drainEvents();
  }
  function act(label, callback) {
    actions++; report.actions++;
    const result = callback();
    check(label);
    return result;
  }
  function withRolls(values, callback) {
    const queue = [...values];
    engine.rng = () => { assert.ok(queue.length, 'only the expected random choices'); return queue.shift(); };
    try { const result = callback(); assert.equal(queue.length, 0); return result; }
    finally { engine.rng = rng; }
  }
  function bid() {
    return act('auction bid', () => {
      const a = engine.state.leilao.active;
      if (!a) return assert.deepEqual(engine.bidLeilao(), { active: false });
      const amount = a.leader ? a.price + 1 : a.base;
      const expected = a.leader === 'voce' ? 'leading' : ledger.tickets < amount ? 'broke' : 'bid';
      if (expected === 'bid') { ledger.tickets -= amount; ledger.auction = amount; ledger.stats.lances++; }
      const got = engine.bidLeilao();
      assert.equal(got[expected], expected === 'bid' ? amount : true);
      return got;
    });
  }
  function cover() {
    return act('rival covers auction', () => {
      const a = engine.state.leilao.active;
      assert.ok(a && a.rivalAt && a.price + 1 <= a.max);
      const next = a.price + 1;
      clock.now = a.rivalAt;
      ledger.tickets += ledger.auction; ledger.auction = 0;
      engine.updateLeilao();
      assert.equal(engine.state.leilao.active.leader, 'plateia');
      assert.equal(engine.state.leilao.active.price, next);
    });
  }
  function settleAuction(viaExport = false) {
    if (!engine.state.leilao.active) return;
    act(viaExport ? 'auction ends during export' : 'auction third call', () => {
      const a = engine.state.leilao.active;
      assert.ok(a.leader && !a.rivalAt);
      clock.now = a.bidAt + 3 * cfg.leilaoCall * 1000;
      if (a.leader === 'voce') {
        if (a.prize.item) ledger.inventory.add(a.prize.item);
        else ledger.cheer += a.prize.cheer;
        ledger.stats.leiloes++;
      }
      ledger.auction = 0;
      if (viaExport) engine.exportState(); else engine.updateLeilao();
      assert.equal(engine.state.leilao.active, null);
    });
  }
  function start(kind) {
    return act('start ' + kind, () => {
      if (kind === 'auction') { engine.startLeilao(); return bid(); }
      if (kind === 'bingo') {
        const amount = engine.bingoCost(), allowed = ledger.tickets >= amount;
        if (allowed) { ledger.tickets -= amount; ledger.stats.bingoCards++; }
        assert.equal(engine.buyBingo(), allowed);
        return allowed;
      }
      const amount = engine.ringCost(), allowed = ledger.tickets >= amount;
      const values = theme.rolls.flatMap(roll => roll < 0.78 || roll >= 0.96 ? [roll, theme.rng] : [roll]);
      if (allowed) { ledger.tickets -= amount; ledger.rings = amount; ledger.stats.ringRounds++; }
      const round = allowed ? withRolls(values, () => engine.startRings()) : engine.startRings();
      assert.equal(!!round, allowed);
      if (round) {
        assert.equal(round.cost, amount);
        assert.equal(engine.ringCost(), amount * 2);
      }
      return allowed;
    });
  }
  function draw(number) {
    return act('bingo draw', () => {
      const round = engine.state.bingo.round;
      if (!round || round.result) return assert.equal(engine.drawBingo(), null);
      const left = Array.from({ length: cfg.bingoMax }, (_, i) => i + 1).filter(n => !round.drawn.includes(n));
      assert.ok(left.includes(number));
      const drawn = new Set([...round.drawn, number]);
      const marked = round.card.map(n => n === 0 || drawn.has(n));
      const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
      if (!round.line && lines.some(line => line.every(index => marked[index]))) ledger.tickets += Math.ceil(round.cost / 2);
      const full = marked.every(Boolean);
      if (full) {
        ledger.tickets += round.cost * cfg.bingoPrize;
        ledger.cheer += Math.max(60, engine.cheerPerSecond() * cfg.bingoCheer);
        ledger.stats.bingos++;
      }
      const expectedResult = full ? 'bingo' : drawn.size >= round.rival ? 'rival' : null;
      const roll = (left.indexOf(number) + 0.5) / left.length;
      assert.equal(withRolls([roll], () => engine.drawBingo()), number);
      assert.equal(round.result, expectedResult);
    });
  }
  function progressBingo(phase) {
    const round = engine.state.bingo.round;
    if (!round || round.result || phase === 'open') return;
    const mine = round.card.filter(Boolean);
    const sequence = phase === 'line' ? round.card.slice(0, 3) : phase === 'win' ? mine : [
      ...Array.from({ length: cfg.bingoMax }, (_, i) => i + 1).filter(n => !mine.includes(n)), ...mine
    ];
    for (const n of sequence) { if (round.result) break; if (!round.drawn.includes(n)) draw(n); }
    assert.equal(round.result, phase === 'line' ? null : phase === 'win' ? 'bingo' : 'rival');
    if (phase === 'line') assert.equal(round.line, true);
  }
  function hit(index) {
    return act('Argolas throw', () => {
      const round = engine.round;
      const valid = round && round.left > 0;
      const fresh = valid && Number.isInteger(index) && index >= 0 && index < round.prizes.length && !round.hits.includes(index);
      if (fresh) ledger.stats.ringHits++;
      const got = engine.ringHit(index);
      assert.equal(got?.hit ?? null, valid ? !!fresh : null);
    });
  }
  function finish() {
    return act('finish Argolas', () => {
      const round = engine.round;
      if (!round) return assert.equal(engine.finishRings(), null);
      const got = round.hits.map(index => round.prizes[index]);
      const mult = got.reduce((value, prize) => value * (prize.mult || 1), 1);
      const factor = got.reduce((value, prize) => value * (prize.kind === 'animacao' ? prize.factor : 1), 1);
      for (const kind of ['fichas', 'lenha']) {
        const sum = got.filter(prize => prize.kind === kind).reduce((value, prize) => value + prize.amount, 0);
        ledger[kind === 'fichas' ? 'tickets' : 'wood'] += sum * mult;
      }
      const cheer = factor > 1 ? ledger.cheer * (factor - 1) * mult : 0;
      ledger.cheer += cheer;
      for (const prize of got) if (prize.kind === 'item') ledger.inventory.add(prize.id);
      ledger.rings = 0;
      const result = engine.finishRings();
      assert.equal(result.cheer, cheer);
      assert.equal(result.mult, mult);
    });
  }
  function reload() {
    return act('reload refunds only unsettled escrow', () => {
      // All deadlines are settled explicitly before this call; Bingo continues, Argolas and auction end.
      const saved = copy(engine.exportState());
      assert.equal(saved.rings.held || 0, ledger.rings);
      ledger.tickets += ledger.rings + ledger.auction;
      ledger.rings = ledger.auction = 0;
      engine = new GameEngine(data, saved, { now: () => clock.now, rng });
      assert.deepEqual(engine.state.bingo, saved.bingo);
      assert.equal(engine.welcome, null);
      reloads++; report.reloads++;
    });
  }
  function year() {
    return act('new year refunds interrupted rounds', () => {
      const bingo = engine.state.bingo.round;
      ledger.tickets += ledger.rings + ledger.auction + (bingo && !bingo.result ? bingo.cost : 0);
      ledger.rings = ledger.auction = 0;
      ledger.cheer = ledger.wood = 0;
      assert.equal(engine.newYear(), true);
      assert.equal(engine.state.bingo.round, null);
      years++; report.years++;
    });
  }
  return {
    get engine() { return engine; }, clock, ledger, start, bid, cover, settleAuction,
    progressBingo, draw, hit, finish, reload, year, check,
    result() { return { actions, reloads, years, tickets: ledger.tickets, cheer: ledger.cheer, wood: ledger.wood, stats: ledger.stats }; }
  };
}

function audit(name, callback) {
  const entry = { name };
  report.cases.push(entry);
  try { entry.result = callback(); entry.passed = true; }
  catch (error) { entry.error = error.stack || String(error); report.failures.push(name); }
}

for (const order of orders) for (const bingo of ['open', 'line', 'win', 'loss']) {
  for (const auction of ['leading', 'covered', 'won', 'lost']) for (const rings of ['open', 'hit', 'paid']) {
    for (const route of ['reload-year', 'year-reload', 'reload-finish-bingo']) for (const theme of themes) {
      audit([order.join('-'), bingo, auction, rings, route, theme.name].join('/'), () => {
        const game = setup(theme);
        for (const kind of order) game.start(kind);
        // An extra start/bid cannot charge another entry while the existing round is open.
        const tickets = game.ledger.tickets;
        assert.equal(game.engine.buyBingo(), false);
        assert.equal(game.engine.startRings(), null);
        game.bid();
        assert.equal(game.ledger.tickets, tickets);
        game.check('repeated starts');
        game.progressBingo(bingo);
        if (auction !== 'leading') {
          game.cover();
          if (auction === 'won') {
            while (true) {
              game.bid();
              if (!game.engine.state.leilao.active.rivalAt) break;
              game.cover();
            }
            game.settleAuction(true);
          } else if (auction === 'lost') game.settleAuction();
        }
        if (rings !== 'open') {
          for (let index = 0; index < cfg.ringThrows; index++) game.hit(index);
          game.hit(0); // exhausted round, no extra throw or prize
          if (rings === 'paid') { game.finish(); game.finish(); }
        }
        if (route === 'year-reload') game.year();
        else {
          game.reload();
          if (route === 'reload-year') game.year();
          else { game.progressBingo('win'); game.draw(1); }
        }
        game.reload(); game.reload(); game.finish(); game.bid();
        return game.result();
      });
    }
  }
}

// Tight balances make action order matter: a held bid cannot also fund Bingo or Argolas.
for (const order of orders) for (const tickets of [0, cfg.ringCost, cfg.leilaoBase + 4, cfg.bingoCost + 4, cfg.ringCost + cfg.leilaoBase + cfg.bingoCost + 8]) {
  for (const route of ['reload-year', 'year-reload']) for (const theme of themes) {
    audit(['tight', order.join('-'), tickets, route, theme.name].join('/'), () => {
      const game = setup(theme, tickets);
      for (const kind of order) game.start(kind);
      if (route === 'reload-year') { game.reload(); game.year(); }
      else game.year();
      game.reload(); game.reload();
      assert.equal(game.ledger.tickets, tickets, 'every interrupted cost refunded once');
      return game.result();
    });
  }
}

// Once all auction items are owned, its Cheer prize changes the subsequent Argolas multiplier.
for (const order of orders) for (const theme of themes) for (const ringFirst of [false, true]) {
  audit(['auction-cheer', order.join('-'), theme.name, ringFirst].join('/'), () => {
    const game = setup(theme, 80, true);
    for (const kind of order) game.start(kind);
    for (let index = 0; index < cfg.ringThrows; index++) game.hit(index);
    game.progressBingo('win');
    if (ringFirst) game.finish();
    while (game.engine.state.leilao.active.rivalAt) { game.cover(); game.bid(); }
    game.settleAuction(true);
    if (!ringFirst) game.finish();
    game.reload(); game.reload(); game.year(); game.reload();
    return game.result();
  });
}

fs.writeFileSync(path.join(__dirname, 'combined-transactions-verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ cases: report.cases.length, actions: report.actions, reloads: report.reloads, years: report.years, failures: report.failures }));
if (report.failures.length) process.exitCode = 1;
