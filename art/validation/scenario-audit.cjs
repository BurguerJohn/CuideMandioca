'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const data = require(path.join(root, 'src/data.js'));
const { GameEngine } = require(path.join(root, 'src/core.js'));
const UI = require(path.join(root, 'src/ui.js'));
const report = { seeds: 12, actions: 0, reloads: 0, newYears: 0, rewards: 0, failures: [] };

function finiteTree(value, at) {
  if (typeof value === 'number') assert.ok(Number.isFinite(value), at);
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) finiteTree(child, `${at}.${key}`);
  }
}

for (let seed = 1; seed <= report.seeds; seed++) {
  let random = seed;
  const rng = () => ((random = random * 16807 % 2147483647) / 2147483647);
  let now = new Date(2026, 5, 12, 23, 45).getTime();
  let engine = new GameEngine(data, null, { rng, now: () => now });
  engine.state.cheer = 1000000;
  engine.state.tickets = engine.state.wood = 10000;
  const grow = () => { while (engine.state.size < 100) engine.addFame(engine.fameNeed() - engine.state.fame); };
  grow();
  const pick = list => list[Math.floor(rng() * list.length)];
  const index = count => Math.floor(rng() * count);
  const pet = () => pick(engine.mini('bichos').info().pets).id;
  const horta = () => engine.mini('horta');
  const fogueira = () => engine.mini('fogueira');
  const ceu = () => engine.mini('ceu');
  const palco = () => engine.mini('palco');
  const actions = [
    ['fish', () => engine.fish()], ['letter', () => engine.openLetter()],
    ['level', () => engine.buyLevel(pick(data.stats).id)], ['ticket', () => engine.buyTicket()],
    ['item', () => engine.buyItem(pick(data.items).id)], ['equip', () => engine.equip(pick(data.items).id, pick(['esquerda', 'direita']))],
    ['outing-start', () => engine.startOuting(index(data.outings.length), pick(data.chars).id)],
    ['outing-claim', () => engine.claimOuting(index(data.outings.length))],
    ['outing-cancel', () => engine.cancelOuting(index(data.outings.length))],
    ['bonfire', () => engine.buyBonfire(pick(['labareda', 'brasa', 'calor']))],
    ['cook', () => engine.cook(pick(data.recipes).id)], ['serve', () => engine.serve()],
    ['goal', () => engine.claimGoal(index(data.config.goalSlots))],
    ['request', () => engine.claimRequest()], ['crasher', () => engine.shooCrasher()],
    ['balloon', () => engine.claimBalloon()], ['rainbow', () => engine.claimRainbow()],
    ['pote', () => engine.hitPote()], ['saco', () => engine.hopSaco()],
    ['burro', () => engine.pinBurro()], ['leilao', () => engine.bidLeilao()],
    ['visitor', () => engine.greetVisitor()], ['foto', () => engine.shootFoto()],
    ['host', () => engine.pokeHost()], ['rice', () => engine.throwRice()],
    ['bingo', () => engine.buyBingo()],
    ['pet', () => engine.mini('bichos').pet(pet())],
    ['pet-feed', () => engine.mini('bichos').feed(pet())],
    ['pet-gift', () => engine.mini('bichos').collect(pet())],
    ['fish-feed', () => engine.mini('aquario').drop()], ['bubble', () => engine.mini('aquario').pop()],
    ['plant', () => horta().plant(index(horta().info().open), pick(data.minis.horta.crops).id)],
    ['water', () => horta().water(index(horta().info().open))],
    ['harvest', () => horta().harvest(index(horta().info().open))], ['crow', () => horta().scare()],
    ['wood', () => fogueira().addWood()], ['stick', () => fogueira().put(index(data.minis.fogueira.slots), pick(data.minis.fogueira.foods).id)],
    ['turn', () => fogueira().turn(index(data.minis.fogueira.slots))], ['take', () => fogueira().take(index(data.minis.fogueira.slots))],
    ['jump', () => fogueira().jump()], ['rocket', () => ceu().launch()], ['star', () => ceu().wish()],
    ['deal', () => ceu().deal()], ['card', () => ceu().pick(index(3))], ['card-ack', () => ceu().ack()],
    ['cordel', () => engine.mini('cordel').poke(1 + index(engine.mini('cordel').unlocked()))],
    ['page', () => engine.mini('cordel').go(1 + index(engine.mini('cordel').unlocked()))],
    ['visit', () => engine.mini('bairro').visit(pick(data.chars).id)],
    ['song', () => palco().start(pick(data.minis.palco.songs).id)],
    ['note', () => palco().hit(index(3))], ['song-stop', () => palco().abort()], ['song-ack', () => palco().ack()],
    ['companion', () => engine.mini('mata').choosePet(pet())],
    ['stage', () => engine.mini('mata').select(1 + index(engine.state.minis.mata.best + 1))],
    ['auto', () => engine.mini('mata').setAuto(rng() < 0.7)]
  ];
  let current = '';
  let step = 0;
  try {
    for (; step < 1000; step++) {
      now += pick([16, 250, 1000, 15000, 59000, 60000, 240000]);
      engine.wake();
      engine.tick(0.25);
      const [name, action] = pick(actions);
      current = name;
      const before = { tickets: engine.state.tickets, wood: engine.state.wood, cheer: engine.state.cheer };
      const result = action();
      if (result?.reward && typeof result.reward === 'object') {
        report.rewards++;
        for (const field of ['tickets', 'wood', 'cheer']) {
          if (result.reward[field]) assert.ok(engine.state[field] - before[field] + 1e-6 >= result.reward[field], `prêmio ${field}`);
        }
      }
      report.actions++;
      finiteTree(engine.state, 'state');
      for (const field of ['cheer', 'tickets', 'wood', 'fame']) assert.ok(engine.state[field] >= 0, field);
      const away = engine.state.outings.filter(entry => entry.char).map(entry => entry.char);
      assert.equal(new Set(away).size, away.length);
      assert.equal(new Set(engine.state.inventory).size, engine.state.inventory.length);
      if (step % 10 === 0) {
        for (const model of Object.values(engine.minis.api)) finiteTree(model.info(), 'mini-info');
        const ctx = { now, icon: () => '', settings: {}, logFilter: 'tudo' };
        for (const tab of UI.TABS) UI.panel(engine, { ...ctx, tab: tab.id });
        for (const tela of UI.TELAS) UI.tela(engine, { ...ctx, tela: tela.id });
      }
      if (step % 25 === 0) {
        const snapshot = engine.exportState();
        const immutable = JSON.stringify(snapshot);
        engine = new GameEngine(data, snapshot, { rng, now: () => now });
        assert.equal(JSON.stringify(snapshot), immutable, 'a carga não altera o snapshot');
        report.reloads++;
      }
      if (step % 200 === 199 && engine.canNewYear()) {
        assert.equal(engine.newYear(), true);
        report.newYears++;
        grow();
      }
      engine.drainEvents();
    }
  } catch (error) {
    report.failures.push({ seed, step, action: current, error: error.stack });
    break;
  }
}
fs.writeFileSync(path.join(__dirname, 'scenario-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
if (report.failures.length) process.exitCode = 1;
