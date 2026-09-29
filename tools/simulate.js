// Simula um jogador guloso para calibrar o ritmo: compra sempre a melhoria mais barata, troca
// Animação por fichas quando sobra, compra itens da loja, pesca, abre cartas, manda a turma em
// rolês e melhora a fogueira. Uso: node tools/simulate.js [horas] [ajustes em JSON] [arquivo para salvar a partida]
'use strict';

const fs = require('node:fs');
const data = require('../src/data.js');
const { GameEngine, STATS, BONFIRE } = require('../src/core.js');

const hours = Number(process.argv[2]) || 60;
Object.assign(data.config, JSON.parse(process.argv[3] || '{}'));
let now = 0;
let seed = 7;
const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const game = new GameEngine(data, null, { rng, now: () => now });
const marks = new Map();
const report = label => {
  if (marks.has(label)) return;
  marks.set(label, now);
  const s = game.state;
  console.log(`${(now / 3600000).toFixed(2).padStart(6)} h  ${label.padEnd(28)} lotação ${String(s.size).padStart(3)}  ` +
    `animação/s ${game.cheerPerSecond().toFixed(1).padStart(8)}  níveis ${STATS.map(id => s.levels[id]).join('/')}`);
};

for (let second = 0; second < hours * 3600; second++) {
  for (let i = 0; i < 4; i++) { now += 250; game.tick(0.25); }
  const s = game.state;
  for (;;) {
    const cheapest = STATS.reduce((a, b) => game.levelCost(a) <= game.levelCost(b) ? a : b);
    if (!game.buyLevel(cheapest)) break;
  }
  if (game.ticketCost() < s.cheer * 0.3) game.buyTicket();
  const shop = data.items.filter(item => !item.source && !game.owned(item.id) && !game.itemLocked(item.id))
    .sort((a, b) => a.price - b.price)[0];
  if (shop && game.buyItem(shop.id) && shop.cat === 'lado') {
    game.equip(shop.id, s.equipped.esquerda === 'fardo' ? 'esquerda' : 'direita');
  }
  while (game.fish()) { /* pesca tudo o que estiver pronto */ }
  while (game.openLetter()) { /* abre as cartas */ }
  if (s.request.active && second % 2 === 0) game.claimRequest();
  if (s.crasher.active) game.shooCrasher();
  data.outings.forEach((_, index) => {
    if (game.outingState(index) === 'pronto') game.claimOuting(index);
    if (game.outingState(index) === 'livre' && game.outingOpen(index)) {
      const free = game.availableForOuting().filter(char => !['par', 'sanfona'].includes(char.post));
      if (free[0]) game.startOuting(index, free[0].id);
    }
  });
  while (game.buyBonfire(BONFIRE[game.bonfireTotal() % 3])) { /* gasta a lenha */ }
  if (s.stats.steps >= 1) report('primeiro passo');
  if (STATS.some(id => s.levels[id] > 1)) report('primeira melhoria');
  if (s.inventory.length) report('primeiro item da loja');
  data.tiers.forEach(tier => { if (s.size >= tier.size) report(tier.name); });
  if (Object.keys(s.crew).length === data.chars.length) report('turma completa');
  if (game.legendary()) report('fogueira lendária');
  for (let stage = 1; stage <= data.config.growthAt.length; stage++) if (game.growthStage() >= stage) report(`Mandioca cresce (tamanho ${stage})`);
  for (const dance of data.dances) if (dance.at > 0 && s.stats.steps >= dance.at) report(`passo novo: ${dance.name}`);
}
console.log(`fim: ${hours} h, lotação ${game.state.size}, turma ${Object.keys(game.state.crew).length}/${data.chars.length}, ` +
  `fogueira ${game.bonfireTotal()}, itens ${game.state.inventory.length}`);
console.log(`diário: ${game.state.log.length} entradas`);
if (process.argv[4]) fs.writeFileSync(process.argv[4], JSON.stringify(game.exportState()));
