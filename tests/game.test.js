const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../src/data.js');
const { GameEngine } = require('../src/core.js');

const MINUTE = 60000;

function game({ rng = () => 0.5, saved = null } = {}) {
  const clock = { now: 1_000_000 };
  const engine = new GameEngine(data, saved, { rng, now: () => clock.now });
  return { engine, clock };
}

function growTo(engine, size) {
  while (engine.state.size < size) engine.addFame(engine.fameNeed() - engine.state.fame);
}

test('partida nova começa no Arraiá de Quintal com os itens iniciais', () => {
  const { engine } = game();
  const s = engine.state;
  assert.equal(engine.tier().id, 'quintal');
  assert.equal(s.size, 1);
  assert.deepEqual(s.equipped, data.equipped);
  assert.equal(engine.maxStamina(), 8);
  assert.equal(s.mail.ready, 1, 'a carta de boas-vindas já está esperando');
  assert.equal(engine.owned('fardo'), true);
  assert.equal(engine.owned('espiga'), false);
});

test('o Sopinha aumenta o que a festa rende com o jogo fechado', () => {
  const away = withBunny => {
    const { engine, clock } = game();
    growTo(engine, 10);
    if (withBunny) engine.state.crew.sopinha = { level: 3 };
    const saved = engine.exportState();
    clock.now += 2 * 3600 * 1000;
    return new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.now }).welcome;
  };
  const plain = away(false);
  const bunny = away(true);
  assert.equal(plain.bunny, 0);
  assert.ok(Math.abs(bunny.bunny - 0.3) < 1e-9, 'nível 3: +30%');
  assert.ok(Math.abs(bunny.cheer / plain.cheer - 1.3) < 1e-9);
});

test('dança, cansa, descansa e recomeça', () => {
  const { engine } = game();
  for (let i = 0; i < 11; i++) engine.tick(0.1);
  assert.equal(engine.state.stats.steps, 1);
  assert.ok(engine.state.cheer > 1);
  for (let i = 0; i < 80; i++) engine.tick(0.1);
  assert.equal(engine.state.runtime.dancing, false);
  const types = engine.drainEvents().map(event => event.type);
  assert.ok(types.includes('step'));
  assert.ok(types.includes('rest-start'));
  for (let i = 0; i < 101; i++) engine.tick(0.1);
  assert.equal(engine.state.runtime.dancing, true);
  assert.ok(engine.drainEvents().some(event => event.type === 'rest-end'));
});

test('ritmo alto dá vários passos num mesmo tick', () => {
  const { engine } = game();
  engine.state.levels.ritmo = 60;
  engine.state.levels.folego = 50;
  engine.state.runtime.stamina = engine.maxStamina();
  engine.tick(1);
  assert.ok(engine.state.stats.steps >= 4);
});

test('juntar Animação vira fama aos poucos; gastar não mexe na fama', () => {
  const { engine } = game();
  engine.earn(120);
  assert.equal(engine.state.fame, 120, 'o que a festa junta vira fama');
  engine.tick(1);
  assert.ok(engine.state.fame > 120, 'cada passo dançado soma fama');
  const fame = engine.state.fame;
  engine.state.cheer = 1000;
  assert.equal(engine.buyLevel('rebolado'), true);
  assert.equal(engine.state.levels.rebolado, 2);
  assert.equal(engine.state.fame, fame, 'comprar melhoria não pula a barra de fama');
  growTo(engine, 10);
  assert.equal(engine.tier().id, 'quermesse');
  assert.ok(engine.state.achievements.includes('quermesse'));
  assert.equal(engine.state.fishing.ready, 1, 'a Quermesse abre a pescaria com uma prenda pronta');
});

test('a primeira prenda é sempre o Milho, e repetidos sobem de nível', () => {
  const { engine } = game({ rng: () => 0.1 });
  growTo(engine, 10);
  const first = engine.fish();
  assert.equal(first.char.id, 'milho');
  assert.equal(first.isNew, true);
  assert.equal(engine.charActive('milho'), true, 'o par abre na Quermesse');
  const before = engine.stepValue();
  engine.state.fishing.ready = 1;
  const again = engine.fish();
  assert.equal(again.isNew, false);
  assert.equal(engine.charLevel(again.char.id), 2);
  assert.ok(engine.stepValue() >= before);
});

test('postos dependem do porte e das barracas colocadas', () => {
  const { engine } = game();
  engine.state.crew = { cenoura: { level: 1 }, cachorro: { level: 1 }, pamonha: { level: 1 } };
  assert.equal(engine.charActive('cenoura'), false);
  growTo(engine, 25);
  assert.equal(engine.charActive('cenoura'), true);
  const speed = engine.speed();
  assert.ok(speed > engine.statValue('ritmo'));
  assert.equal(engine.charActive('pamonha'), false, 'a marcadora só trabalha no São João Regional');
  assert.equal(engine.charActive('cachorro'), false, 'sem Barraca de Pescaria, sem pescador');
  engine.state.tickets = 100;
  assert.equal(engine.buyItem('barraca-pescaria'), true);
  assert.equal(engine.equip('barraca-pescaria', 'direita'), true);
  assert.equal(engine.charActive('cachorro'), true);
  assert.ok(engine.fishingInterval() < data.config.fishingMinutes * MINUTE);
});

test('barracas só aparecem na loja depois da Quermesse', () => {
  const { engine } = game();
  engine.state.tickets = 100;
  assert.equal(engine.buyItem('barraca-beijo'), false);
  growTo(engine, 10);
  assert.equal(engine.buyItem('barraca-beijo'), true);
  assert.equal(engine.equip('barraca-beijo', 'esquerda'), true);
  assert.equal(engine.state.equipped.esquerda, 'barraca-beijo');
  assert.equal(engine.equip('barraca-beijo', 'direita'), true);
  assert.equal(engine.state.equipped.direita, 'barraca-beijo');
  assert.equal(engine.state.equipped.esquerda, 'mastro', 'trocar de lado leva o outro item junto');
});

test('rolê tira o personagem do posto e volta com lenha', () => {
  const { engine, clock } = game({ rng: () => 0.99 });
  growTo(engine, 25);
  engine.state.crew = { cenoura: { level: 1 } };
  assert.equal(engine.startOuting(0, 'cenoura'), true);
  assert.equal(engine.charActive('cenoura'), false);
  assert.equal(engine.outingState(0), 'fora');
  assert.equal(engine.claimOuting(0), null);
  clock.now += data.outings[0].minutes * MINUTE;
  engine.updateTimers(clock.now);
  assert.equal(engine.outingState(0), 'pronto');
  const result = engine.claimOuting(0);
  assert.equal(result.wood, data.outings[0].wood);
  assert.equal(engine.state.wood, data.outings[0].wood);
  assert.equal(engine.charActive('cenoura'), true);
});

test('fogueira gasta lenha e vira lendária com 30 melhorias', () => {
  const { engine } = game();
  growTo(engine, 25);
  engine.state.wood = 100000;
  const before = engine.multiplier();
  for (let i = 0; i < 30; i++) assert.equal(engine.buyBonfire(['labareda', 'brasa', 'calor'][i % 3]), true);
  assert.equal(engine.legendary(), true);
  assert.ok(engine.state.achievements.includes('lendaria'));
  assert.ok(engine.multiplier() > before * 2);
});

test('labareda e brasa multiplicam os passos', () => {
  const { engine } = game();
  engine.state.bonfire.labareda = 2;
  engine.state.runtime.flareLeft = 5;
  const base = engine.stepValue();
  engine.step();
  assert.ok(Math.abs(engine.state.runtime.lastStep - base * 1.4) < 1e-9);
});

test('argolas: cada rodada dobra o preço e cada espera sem jogar corta pela metade', () => {
  const { engine, clock } = game();
  const s = engine.state;
  s.tickets = 20;
  const cooldown = data.config.ringCooldownMinutes * MINUTE;
  const play = () => { engine.startRings(); engine.finishRings(); };
  assert.equal(engine.ringCost(), 1);
  play();
  assert.equal(engine.ringCost(), 2);
  play();
  play();
  assert.equal(engine.ringCost(), 8);
  assert.equal(s.tickets, 20 - 1 - 2 - 4);
  s.tickets = 7;
  assert.equal(engine.startRings(), null, 'sem fichas para o preço dobrado não joga');
  clock.now += cooldown - 1000;
  engine.updateTimers(clock.now);
  assert.equal(engine.ringCost(), 8, 'antes da espera acabar o preço não cai');
  clock.now += 1000;
  engine.updateTimers(clock.now);
  assert.equal(engine.ringCost(), 4);
  clock.now += cooldown * 5;
  engine.updateTimers(clock.now);
  assert.equal(engine.ringCost(), 1, 'nunca cai abaixo do preço inicial');
  assert.equal(s.rings.nextAt, 0);
  play();
  const saved = engine.exportState();
  const later = new GameEngine(data, saved, { now: () => clock.now + cooldown });
  later.updateTimers(clock.now + cooldown);
  assert.equal(later.ringCost(), 1, 'o preço cai mesmo com o jogo fechado');
  s.crew.pacoca = { level: 1 };
  s.inventory.push('barraca-argolas');
  engine.equip('barraca-argolas', 'direita');
  assert.ok(engine.charActive('pacoca'), 'a Paçoca trabalha na Barraca das Argolas');
  assert.equal(engine.ringCooldown(), cooldown * 0.8, 'a Argoleira apressa a espera');
});

test('cada convidado novo traz uma peça de cenário', () => {
  const { engine } = game();
  for (let size = 2; size <= 150; size++) assert.ok(engine.sceneryPiece(size), `lotação ${size} traz alguma coisa`);
  for (const mark of data.scenery.landmarks) {
    assert.equal(engine.sceneryPiece(mark.size).id, mark.id, `${mark.name} chega com ${mark.size} convidados`);
  }
  const hen = data.scenery.landmarks.find(mark => mark.id === 'galinha').size;
  for (let size = 2; size < hen; size++) assert.notEqual(engine.sceneryPiece(size).id, 'pintinho', 'pintinho só depois da galinha');
  const late = engine.scenery(150);
  for (const entry of data.scenery.cycle) assert.ok((late.counts[entry.id] || 0) <= entry.max, entry.id);
  assert.equal(late.landmarks.length, data.scenery.landmarks.length);
  assert.deepEqual(engine.scenery(1), { landmarks: [], counts: {} });
  const early = engine.scenery(5);
  assert.deepEqual([...early.landmarks], ['milharal', 'galinha']);
  assert.equal(Object.values(early.counts).reduce((a, b) => a + b, 0), 2, 'as outras lotações trouxeram enfeites');
});

test('o diário guarda cada acontecimento com o tempo de jogo', () => {
  const { engine, clock } = game();
  const s = engine.state;
  assert.deepEqual(s.log[0], { t: 0, type: 'comeco' });
  engine.tick(1);
  assert.equal(s.log.find(entry => entry.type === 'achievement').id, 'primeiro-passo');
  s.stats.playtime = 125;
  engine.addFame(engine.fameNeed());
  assert.deepEqual(s.log.at(-1), { t: 125, type: 'size', size: 2 });
  growTo(engine, 10);
  assert.ok(s.log.some(entry => entry.type === 'tier' && entry.tier === 1 && entry.t === 125));
  s.cheer = 1e6;
  s.stats.playtime = 200;
  engine.buyLevel('ritmo');
  s.stats.playtime = 210;
  engine.buyLevel('ritmo');
  s.stats.playtime = 400;
  engine.buyLevel('ritmo');
  const levels = s.log.filter(entry => entry.type === 'level');
  assert.equal(levels.length, 2, 'compras seguidas juntam; depois de uma pausa, linha nova');
  assert.equal(levels[0].from, 1);
  assert.equal(levels[0].level, 3);
  s.fame = engine.fameNeed() - 1;
  const saved = engine.exportState();
  clock.now += 3 * 3600 * 1000;
  const later = new GameEngine(data, saved, { now: () => clock.now });
  assert.ok(later.state.log.some(entry => entry.type === 'size' && entry.offline), 'o que rende com o jogo fechado fica marcado');
  for (let i = 0; i < 4100; i++) later.record('request', { kind: 'milho' });
  assert.equal(later.state.log.length, 4000, 'o diário tem teto');
  assert.ok(later.state.log.some(entry => entry.type === 'tier'), 'desbloqueio nunca sai do diário');
  const old = engine.exportState();
  delete old.log;
  old.stats.playtime = 777;
  assert.deepEqual(new GameEngine(data, old, { now: () => old.lastSeen }).state.log,
    [{ t: 777, type: 'inicio', size: old.size }], 'save antigo começa o diário de onde está');
});

test('modo de teste dá recursos, avança o tempo e marca tudo no diário', () => {
  const { engine } = game();
  const s = engine.state;
  assert.equal(engine.debug('fichas', 100), '+100 fichas');
  assert.equal(s.tickets, 100);
  engine.debug('lenha', 50);
  assert.equal(s.wood, 50);
  const fame = s.fame;
  engine.debug('animacao', 3600);
  assert.ok(s.cheer >= 100);
  assert.equal(s.fame, fame, 'Animação de teste vai para o saldo, sem virar fama');
  engine.debug('convidados', 12);
  assert.equal(s.size, 13);
  assert.ok(s.log.filter(entry => entry.type === 'size').every(entry => entry.test), 'convidados de teste ficam marcados');
  engine.debug('porte');
  assert.equal(engine.tierIndex(), 2);
  engine.debug('turma');
  assert.equal(Object.keys(s.crew).length, data.chars.length);
  assert.ok(engine.startOuting(0, 'milho'));
  engine.debug('roles');
  assert.equal(engine.outingState(0), 'pronto');
  engine.debug('cartas');
  assert.equal(s.mail.ready, data.config.letterCap);
  const playtime = s.stats.playtime;
  engine.debug('tempo', 600);
  assert.equal(s.stats.playtime, playtime + 600, 'avançar o tempo roda a festa de verdade');
  assert.equal(engine.debug('coisa-que-nao-existe'), null);
  assert.equal(s.log.at(-1).type, 'debug');
  assert.equal(engine.testing, false);
});

test('saves antigos do pau de sebo carregam sem ele', () => {
  const { engine } = game();
  const old = engine.exportState();
  old.stats.bestPole = 500;
  old.achievements = ['primeiro-passo', 'topo'];
  delete old.rings;
  const loaded = new GameEngine(data, old, { now: () => old.lastSeen });
  assert.deepEqual([...loaded.state.achievements], ['primeiro-passo']);
  assert.equal('bestPole' in loaded.state.stats, false);
  assert.equal(loaded.ringCost(), 1);
  assert.equal(data.chars.some(char => char.effect === 'pole'), false);
});

test('carta, pedido e penetra rendem fichas ou Animação', () => {
  const { engine, clock } = game();
  const letter = engine.openLetter();
  assert.ok(letter.tickets >= data.config.letterTickets);
  assert.ok(data.letters.includes(letter.text));
  assert.equal(engine.openLetter(), null);
  growTo(engine, 50);
  clock.now += 16 * MINUTE;
  engine.updateTimers(clock.now);
  assert.ok(engine.state.request.active, 'pedido aparece sozinho');
  assert.ok(engine.state.crasher.active, 'penetra aparece no Regional');
  assert.ok(engine.claimRequest().reward > 0);
  const tickets = engine.state.tickets;
  assert.ok(engine.shooCrasher().tickets > 0);
  assert.ok(engine.state.tickets > tickets);
});

test('save volta íntegro e a festa rende enquanto o jogo esteve fechado', () => {
  const { engine, clock } = game();
  engine.state.levels.rebolado = 5;
  engine.state.inventory.push('espiga');
  engine.equip('espiga');
  const saved = engine.exportState();
  const reopened = new GameEngine(data, saved, { now: () => clock.now + 3600000 });
  assert.equal(reopened.state.levels.rebolado, 5);
  assert.equal(reopened.state.equipped.mao, 'espiga');
  assert.ok(reopened.welcome.cheer > 0);
  assert.throws(() => new GameEngine(data, { version: 99 }), /Save incompatível/);
});

test('argolas: a garrafa de Animação multiplica a Animação que a festa tem, e o ×2 da rodada multiplica o ganho', () => {
  const play = (prizes, hits, cheer) => {
    const { engine } = game();
    engine.state.tickets = 10;
    engine.state.inventory.push('barraca-argolas');
    engine.equip('barraca-argolas', 'direita');
    engine.startRings().prizes = prizes;
    engine.state.cheer = cheer;
    for (const index of hits) engine.ringHit(index);
    while (engine.round.left > 0) engine.ringHit(null);
    return { result: engine.finishRings(), engine };
  };
  const bottles = [{ kind: 'animacao', factor: 2 }, { kind: 'animacao', factor: 3 }, { kind: 'x2', mult: 2 },
    { kind: 'fichas', amount: 1 }, { kind: 'fichas', amount: 1 }];
  let { result, engine } = play(bottles, [0], 1000);
  assert.equal(result.cheer, 1000, '×2: ganha o que já tinha');
  assert.equal(result.cheerTimes, 2);
  assert.equal(engine.state.cheer, 2000);
  ({ result, engine } = play(bottles, [1], 1000));
  assert.equal(engine.state.cheer, 3000, '×3: fica com o triplo');
  ({ result } = play(bottles, [0, 1], 1000));
  assert.equal(result.cheer, 5000, '×2 e ×3 juntas: ×6');
  ({ result } = play(bottles, [0, 2], 1000));
  assert.equal(result.cheer, 2000, 'com o ×2 da rodada, o ganho dobra');
  assert.equal(result.cheerTimes, 3);
  ({ result } = play(bottles, [0], 0));
  assert.equal(result.cheer, 0, 'sem Animação, nada a multiplicar');
  const { engine: fresh } = game({ rng: () => 0.1 });
  fresh.state.tickets = 5;
  const prize = fresh.ringPrize('animacao', []);
  assert.ok([2, 3].includes(prize.factor) && !('seconds' in prize), 'a garrafa mostra ×2 ou ×3, não um valor fixo');
});

test('argolas da sorte: acertos pagam, ×2 multiplica a rodada e itens exclusivos saem', () => {
  const { engine } = game({ rng: () => 0.5 });
  assert.equal(engine.startRings(), null, 'sem ficha não joga');
  engine.state.tickets = 5;
  const round = engine.startRings();
  assert.equal(engine.state.tickets, 4);
  assert.equal(round.total, 3);
  for (const prize of round.prizes) assert.equal(prize.aim, data.config.ringAim[prize.kind], 'cada garrafa leva a folga do seu prêmio');
  const aim = data.config.ringAim;
  assert.ok(aim.fichas > aim.animacao && aim.animacao > aim.x2 && aim.x2 > aim.x3 && aim.x3 > aim.item,
    'prêmio melhor pede mira mais certeira');
  round.prizes = [{ kind: 'fichas', amount: 3 }, { kind: 'x2', mult: 2 }, { kind: 'item', id: 'ursinho' },
    { kind: 'animacao', factor: 2 }, { kind: 'fichas', amount: 1 }];
  assert.equal(engine.ringHit(0).hit, true);
  assert.equal(engine.ringHit(0).hit, false, 'a mesma garrafa não vale duas vezes');
  assert.equal(engine.ringHit(1).hit, true);
  assert.equal(engine.ringHit(2), null, 'acabaram as argolas');
  const result = engine.finishRings();
  assert.equal(result.mult, 2);
  assert.equal(result.tickets, 6);
  assert.equal(engine.state.tickets, 10);
  engine.state.tickets = 2;
  assert.equal(engine.ringCost(), 2, 'a rodada anterior dobrou o preço');
  engine.startRings().prizes[2] = { kind: 'item', id: 'ursinho' };
  engine.ringHit(2);
  engine.ringHit(null);
  engine.ringHit(null);
  assert.equal(engine.finishRings().items[0].id, 'ursinho');
  assert.equal(engine.owned('ursinho'), true);
  assert.equal(engine.buyItem('peixinho'), false, 'itens das argolas não se compram');
  engine.state.inventory.push('barraca-argolas');
  engine.equip('barraca-argolas', 'direita');
  assert.equal(engine.ringThrows(), 4);
});
