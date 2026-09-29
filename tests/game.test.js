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

test('a Mandioca começa broto e cresce com as melhorias, rendendo mais a cada tamanho', () => {
  const { engine } = game();
  const first = data.config.growthAt[0];
  assert.equal(engine.growthStage(), 0, 'partida nova: broto');
  assert.equal(engine.growthInfo().goal, first);
  const base = engine.multiplier();
  engine.state.cheer = 1e300;
  const events = [];
  while (engine.growthTotal() < first - 1) engine.buyLevel('rebolado');
  assert.equal(engine.growthStage(), 0, 'um nível a menos do marco ainda é broto');
  assert.equal(engine.buyLevel('rebolado'), true);
  assert.equal(engine.growthStage(), 1, 'no marco vira mudinha');
  events.push(...engine.drainEvents().filter(event => event.type === 'grow'));
  assert.deepEqual(events.map(event => event.stage), [1], 'avisa a festa uma vez');
  assert.ok(Math.abs(engine.multiplier() / base - 1.08) < 1e-9, 'cada tamanho rende +8%');
  assert.ok(engine.state.log.some(entry => entry.type === 'grow' && entry.stage === 1), 'fica no diário');
  assert.equal(engine.state.achievements.includes('crescida'), false);
  while (engine.growthStage() < 3) engine.buyLevel('folego');
  assert.equal(engine.growthInfo().last, true);
  assert.ok(engine.state.achievements.includes('crescida'), 'tamanho máximo dá a conquista');
  assert.equal(engine.growthInfo().goal, null);
  // Quem já tinha um save grande nasce inteira, sem o clarão de crescimento.
  const saved = engine.exportState();
  const again = new GameEngine(data, saved, { now: () => 1_000_000 });
  assert.equal(again.growthStage(), 3);
  assert.equal(again.drainEvents().filter(event => event.type === 'grow').length, 0);
});

test('a Mandioca aprende passos de dança dançando, troca de passo e rende mais com o repertório', () => {
  const { engine } = game({ rng: () => 0.5 });
  const ids = data.dances.map(dance => dance.id);
  assert.deepEqual(ids, ['forro', 'xote', 'polichinelo', 'sanfona', 'rebolado', 'baiao', 'giro', 'moonwalk', 'frevo', 'lambada', 'macarena', 'robo', 'arrasta-pe', 'coco',
    'passinho']);
  assert.deepEqual(engine.learnedDances().map(dance => dance.id), ['forro'], 'começa só com o forró');
  assert.equal(engine.danceBonus(), 0);
  const base = engine.multiplier();
  engine.state.stats.steps = data.dances[1].at - 1;
  engine.state.runtime.danceLeft = 999;
  engine.step();
  const events = engine.drainEvents();
  assert.deepEqual(events.filter(event => event.type === 'learn').map(event => event.id), ['xote'], 'o passo do marco ensina o xote');
  assert.equal(engine.state.runtime.dance, 'xote', 'e ela já mostra o passo novo');
  assert.ok(events.some(event => event.type === 'dance' && event.id === 'xote'));
  assert.ok(engine.state.log.some(entry => entry.type === 'learn' && entry.id === 'xote'), 'fica no diário');
  assert.ok(Math.abs(engine.multiplier() / base - 1.02) < 1e-9, 'cada passo novo rende +2%');
  // A cada 10 passos ela sorteia outro passo entre os que sabe (nunca o mesmo).
  engine.state.runtime.danceLeft = 1;
  engine.step();
  assert.equal(engine.state.runtime.dance, 'forro');
  assert.equal(engine.state.runtime.danceLeft, data.config.danceSteps);
  // Todos aprendidos: conquista.
  engine.state.stats.steps = data.dances.at(-1).at - 1;
  engine.step();
  assert.equal(engine.learnedDances().length, data.dances.length);
  assert.ok(engine.state.achievements.includes('repertorio'));
  assert.equal(engine.state.runtime.dance, 'passinho');
  // Um save que já passou dos passos sabe tudo sem ganhar aviso.
  const saved = engine.exportState();
  const again = new GameEngine(data, saved, { now: () => 1_000_000 });
  assert.equal(again.learnedDances().length, data.dances.length);
  assert.equal(again.drainEvents().filter(event => event.type === 'learn').length, 0);
});

test('carinho na Mandioca rende passos, com um tempo entre um e outro', () => {
  const { engine, clock } = game();
  const before = engine.state.cheer;
  const first = engine.pokeHost();
  assert.equal(first.ready, true);
  assert.ok(Math.abs(first.value - engine.stepValue() * data.config.pokeSteps) < 1e-9, 'vale pokeSteps passos');
  assert.ok(Math.abs(engine.state.cheer - before - first.value) < 1e-9);
  assert.equal(engine.pokeHost().ready, false, 'logo em seguida ela só faz graça');
  assert.equal(engine.state.stats.pokes, 1);
  assert.equal(engine.drainEvents().filter(event => event.type === 'poke').length, 2, 'a festa reage nos dois cliques');
  clock.now += data.config.pokeCooldown * 1000 + 1;
  assert.equal(engine.pokeHost().ready, true);
  for (let i = 0; i < 98; i++) { clock.now += data.config.pokeCooldown * 1000 + 1; engine.pokeHost(); }
  assert.ok(engine.state.achievements.includes('dengosa'), '100 carinhos dão a conquista');
});

test('o balão de sorte aparece com a festa cheia e dá um prêmio para quem clica; o frenesi multiplica tudo', () => {
  const rolls = [];
  const { engine, clock } = game({ rng: () => (rolls.length ? rolls.shift() : 0.5) });
  const s = engine.state;
  engine.updateTimers(clock.now);
  assert.equal(s.balloon.active, null, 'sem convidados suficientes não há balão');
  growTo(engine, data.config.balloonMin);
  engine.updateTimers(clock.now);
  assert.ok(s.balloon.nextAt > clock.now, 'o próximo balão fica agendado');
  clock.now = s.balloon.nextAt + 1;
  engine.updateTimers(clock.now);
  assert.ok(s.balloon.active, 'chegou um balão');
  assert.ok(engine.drainEvents().some(event => event.type === 'balloon'));
  clock.now = s.balloon.active.until + 1;
  engine.updateTimers(clock.now);
  assert.equal(s.balloon.active, null, 'quem não pegou perde o balão');
  // Sorteio: frenesi (< 0,35), Animação, fichas e lenha, pela ordem.
  const claim = roll => {
    engine.debug('balao');
    rolls.push(roll);
    return engine.claimBalloon();
  };
  const cheer = s.cheer;
  const frenzy = claim(0.1);
  assert.equal(frenzy.kind, 'frenzy');
  assert.equal(s.runtime.frenzyLeft, data.config.frenzySeconds);
  s.runtime.quadrilhaLeft = 0;
  s.quadrilha.nextAt = clock.now + 1e9;
  const normal = engine.stepValue();
  engine.step();
  assert.ok(Math.abs(s.runtime.lastStep - normal * data.config.frenzyMult) < 1e-9, 'em frenesi cada passo rende ×3');
  engine.tick(1);
  s.runtime.frenzyLeft = 0.5;
  engine.tick(1);
  assert.equal(s.runtime.frenzyLeft, 0);
  assert.ok(engine.drainEvents().some(event => event.type === 'frenzy-end'));
  assert.equal(claim(0.5).kind, 'cheer');
  assert.ok(s.cheer > cheer);
  const tickets = s.tickets;
  assert.equal(claim(0.8).kind, 'tickets');
  assert.ok(s.tickets > tickets);
  const wood = s.wood;
  assert.equal(claim(0.95).kind, 'wood');
  assert.ok(s.wood > wood);
  assert.equal(engine.claimBalloon(), null, 'sem balão não há prêmio');
  assert.equal(s.stats.balloons, 4);
  for (let i = 0; i < 6; i++) claim(0.5);
  assert.ok(s.achievements.includes('balao-de-sorte'), '10 balões dão a conquista');
});

test('chove de vez em quando, troveja, e a chuva termina num arco-íris com um pote de ouro', () => {
  const { engine, clock } = game();
  const s = engine.state;
  const w = s.weather;
  engine.updateTimers(clock.now);
  assert.equal(w.rain, null, 'sem convidados suficientes não chove');
  growTo(engine, data.config.rainMin);
  engine.updateTimers(clock.now);
  assert.ok(w.nextAt >= clock.now + data.config.rainEvery[0] * 1000, 'a próxima chuva fica agendada');
  clock.now = w.nextAt + 1;
  engine.updateTimers(clock.now);
  assert.ok(w.rain, 'começou a chover');
  assert.equal(engine.drainEvents().filter(event => event.type === 'rain').length, 1);
  // Trovões durante a chuva (mais de um em uma chuva comprida) e nenhum fora dela.
  let thunders = 0;
  const until = w.rain.until;
  while (clock.now < until - 1000) {
    clock.now += 1000;
    engine.updateTimers(clock.now);
    thunders += engine.drainEvents().filter(event => event.type === 'thunder').length;
  }
  assert.ok(thunders >= 1, 'troveja');
  clock.now = until + 1;
  engine.updateTimers(clock.now);
  assert.equal(w.rain, null, 'parou de chover');
  assert.ok(w.rainbow, 'saiu o arco-íris');
  assert.ok([0, 1].includes(w.rainbow.side));
  assert.ok(engine.drainEvents().some(event => event.type === 'rain-end'));
  const cheer = s.cheer;
  const tickets = s.tickets;
  const reward = engine.claimRainbow();
  assert.ok(reward.amount >= 100 && reward.tickets === 3 + engine.tierIndex());
  assert.ok(s.cheer > cheer && s.tickets > tickets);
  assert.equal(w.rainbow, null);
  assert.equal(engine.claimRainbow(), null, 'o pote só vale uma vez');
  // Arco-íris que ninguém pegou some sozinho e a chuva só volta depois de um tempo.
  engine.debug('chuva');
  clock.now = w.rain.until + 1;
  engine.updateTimers(clock.now);
  clock.now = w.rainbow.until + 1;
  engine.updateTimers(clock.now);
  assert.equal(w.rainbow, null);
  assert.equal(w.rain, null);
  for (let i = 0; i < 4; i++) { engine.debug('chuva'); clock.now = w.rain.until + 1; engine.updateTimers(clock.now); engine.claimRainbow(); }
  assert.ok(s.achievements.includes('arco-iris'), '5 potes dão a conquista');
});

test('metas da festa: três abertas de tipos diferentes, cumprem com o jogo e se renovam ao resgatar', () => {
  let seed = 7;
  const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const { engine } = game({ rng });
  const s = engine.state;
  engine.tick(0.1);
  assert.equal(s.goals.length, data.config.goalSlots);
  assert.equal(new Set(s.goals.map(goal => goal.type)).size, s.goals.length, 'três tipos diferentes');
  for (const goal of s.goals) {
    assert.ok(data.goals.find(entry => entry.id === goal.type).tier <= engine.tierIndex(), 'só metas do porte atual');
    assert.ok(goal.target >= 1 && goal.reward.tickets >= 2);
  }
  assert.equal(engine.claimGoal(0), null, 'meta não cumprida não resgata');
  // Cumpre a meta de passos dançando.
  s.goals[0] = { type: 'steps', target: 5, from: s.stats.steps, reward: { tickets: 3, wood: 0 } };
  for (let i = 0; i < 4; i++) engine.step();
  assert.equal(engine.goalProgress(s.goals[0]), 4);
  engine.drainEvents();
  engine.step();
  engine.tick(0.1);
  assert.deepEqual(engine.drainEvents().filter(event => event.type === 'goal-done').map(event => event.index), [0], 'avisa uma vez');
  engine.tick(0.1);
  assert.equal(engine.drainEvents().filter(event => event.type === 'goal-done').length, 0);
  const tickets = s.tickets;
  const others = s.goals.slice(1).map(goal => goal.type);
  assert.deepEqual({ ...engine.claimGoal(0) }, { tickets: 3, wood: 0 });
  assert.equal(s.tickets, tickets + 3);
  assert.notEqual(s.goals[0].type, 'steps', 'a nova meta é de outro tipo');
  assert.equal(engine.goalProgress(s.goals[0]), 0, 'e começa do zero');
  assert.deepEqual(s.goals.slice(1).map(goal => goal.type), others);
  // Cada tipo conta o seu número: melhorias, carinhos e convidados novos.
  s.goals[1] = { type: 'levels', target: 2, from: s.stats.upgrades, reward: { tickets: 2, wood: 0 } };
  s.goals[2] = { type: 'pokes', target: 1, from: s.stats.pokes, reward: { tickets: 2, wood: 0 } };
  s.cheer = 1e9;
  engine.buyLevel('rebolado');
  engine.buyLevel('folego');
  engine.pokeHost();
  assert.ok(engine.claimGoal(1) && engine.claimGoal(2));
  assert.equal(s.stats.goals, 3);
  for (let i = 0; i < 7; i++) { s.goals.forEach(goal => { goal.from -= goal.target; }); engine.claimGoal(0); }
  assert.ok(s.achievements.includes('metodica'), '10 metas dão a conquista');
});

test('a quadrilha marcada dura uns segundos, grita a marcação e rende mais (o dobro com a Pamonha)', () => {
  const { engine, clock } = game();
  const s = engine.state;
  engine.updateTimers(clock.now);
  assert.equal(s.runtime.quadrilhaLeft, 0, 'no quintal não tem quadrilha');
  growTo(engine, 10);
  engine.updateTimers(clock.now);
  assert.ok(s.quadrilha.nextAt >= clock.now + data.config.quadrilhaEvery[0] * 1000);
  clock.now = s.quadrilha.nextAt + 1;
  engine.updateTimers(clock.now);
  assert.equal(s.runtime.quadrilhaLeft, data.config.quadrilhaSeconds);
  const start = engine.drainEvents().find(event => event.type === 'quadrilha');
  assert.ok(start && Math.abs(start.bonus - data.config.quadrilhaBonus) < 1e-9, 'sem a Pamonha o bônus é o simples');
  // Rende mais durante a quadrilha.
  s.runtime.frenzyLeft = 0;
  const plain = engine.stepValue();
  engine.step();
  assert.ok(Math.abs(s.runtime.lastStep - plain * (1 + data.config.quadrilhaBonus)) < 1e-9);
  s.crew.pamonha = { level: 1 };
  assert.ok(Math.abs(engine.quadrilhaBonus() - data.config.quadrilhaBonus) < 1e-9, 'a Pamonha só vale com o caixote aberto (porte 3)');
  growTo(engine, 50);
  assert.ok(Math.abs(engine.quadrilhaBonus() - 2 * data.config.quadrilhaBonus) < 1e-9, 'com a Pamonha no caixote, o dobro');
  s.runtime.quadrilhaLeft = data.config.quadrilhaSeconds;
  s.runtime.callIn = 0;
  s.runtime.calls = 0;
  // Os gritos: um logo no começo e outro a cada callEvery segundos, nenhum no finzinho (últimos 1,5 s).
  const calls = [];
  for (let i = 0; i < data.config.quadrilhaSeconds * 4; i++) {
    engine.tick(0.25);
    calls.push(...engine.drainEvents().filter(event => event.type === 'quadrilha-call').map(event => event.n));
  }
  assert.deepEqual(calls, [0, 1, 2, 3, 4, 5], 'seis gritos numerados em 24 s');
  assert.equal(s.runtime.quadrilhaLeft, 0, 'a quadrilha acaba sozinha');
  assert.ok(s.quadrilha.nextAt === 0 || s.quadrilha.nextAt > clock.now, 'e a próxima só vem depois de um tempo');
});

test('depois da quadrilha pode ter casamento: o arroz jogado nos noivos aumenta o presente', () => {
  const { engine, clock } = game({ rng: () => 0.1 });
  const s = engine.state;
  assert.equal(engine.startWedding(), false, 'no quintal ninguém casa');
  growTo(engine, 10);
  assert.equal(engine.startWedding(), false, 'a Quermesse ainda não tem pista para o casamento');
  growTo(engine, 25);
  s.runtime.quadrilhaLeft = 0.1;
  engine.tick(0.2);
  const events = engine.drainEvents();
  assert.ok(events.some(event => event.type === 'quadrilha-end'));
  const start = events.find(event => event.type === 'wedding');
  assert.ok(start, 'a quadrilha terminou e, com sorte, sai um casamento');
  assert.ok(s.runtime.weddingLeft > data.config.weddingSeconds - 1, "a cerimônia começa com o tempo todo");
  assert.equal(engine.startWedding(), false, 'um casamento de cada vez');

  // Cada clique joga um punhado, mas dois colados contam um só.
  assert.equal(engine.throwRice().ready, true);
  assert.equal(engine.throwRice().ready, false);
  clock.now += data.config.riceCooldown * 1000 + 1;
  assert.equal(engine.throwRice().ready, true);
  assert.equal(s.runtime.rice, 2);
  assert.equal(s.stats.rice, 2);
  assert.ok(engine.drainEvents().some(event => event.type === 'rice' && event.n === 2));

  // O presente: 40% sem arroz nenhum, 100% com a cota inteira.
  const gift = rice => {
    const other = game({ rng: () => 0.1 });
    growTo(other.engine, 25);
    other.engine.startWedding();
    for (let i = 0; i < rice; i++) { other.engine.throwRice(); other.clock.now += 300; }
    other.engine.state.runtime.weddingLeft = 0.1;
    other.engine.tick(0.2);
    assert.equal(other.engine.state.runtime.weddingLeft, 0, 'a cerimônia acaba sozinha');
    assert.equal(other.engine.state.stats.weddings, 1);
    return other.engine.drainEvents().find(event => event.type === 'wedding-end');
  };
  const none = gift(0);
  const some = gift(data.config.weddingRice);
  const more = gift(data.config.weddingRice * 3);
  assert.equal(none.rice, 0);
  assert.ok(Math.abs(some.amount / none.amount - 2.5) < 1e-6, 'arroz de sobra não passa do máximo: 100% contra 40%');
  assert.equal(more.amount, some.amount);
  assert.equal(none.tickets, 1);
  assert.equal(some.tickets, 3 + engine.tierIndex());
  assert.ok(none.amount >= 60 * 0.4);

  // Sem casamento em andamento não tem arroz; cinco casamentos rendem a conquista.
  assert.equal(none.item, null, 'sem arroz não tem presente');
  assert.equal(some.item, 'veu-noiva', 'com a cota de arroz, os noivos deixam a primeira peça de casamento');
  // Uma peça por casamento, na ordem, até acabarem.
  const gifted = game({ rng: () => 0.1 });
  growTo(gifted.engine, 25);
  const got = [];
  for (let i = 0; i < 4; i++) {
    gifted.engine.startWedding();
    gifted.engine.state.runtime.rice = data.config.weddingRice;
    got.push(gifted.engine.endWedding().item);
  }
  assert.deepEqual(got, ['veu-noiva', 'cartola-noivo', 'buque', null]);
  assert.ok(gifted.engine.owned('buque') && gifted.engine.owned('cartola-noivo'));
  assert.equal(gifted.engine.buyItem('buque'), false, 'peça de casamento não se compra');
  const idle = game();
  assert.equal(idle.engine.throwRice().active, false);
  for (let i = 0; i < 5; i++) { engine.startWedding(); engine.endWedding(); }
  assert.ok(s.achievements.includes('madrinha'));
  assert.equal(engine.debug('casamento'), 'Casamento na roça');
  assert.ok(s.runtime.weddingLeft > 0, 'o botão de teste força um casamento');
  assert.ok(s.log.some(entry => entry.type === 'wedding' && Number.isFinite(entry.rice)));
});

test('vestir as três peças de um conjunto rende o bônus do conjunto em cima de tudo', () => {
  const { engine } = game();
  const s = engine.state;
  // Todo conjunto usa peças que existem, uma de cada tipo, e nenhum conjunto se repete.
  const keys = new Set();
  for (const set of data.sets) {
    assert.equal(engine.items[set.hat]?.cat, 'chapeu', `${set.id}: chapéu`);
    assert.equal(engine.items[set.hand]?.cat, 'mao', `${set.id}: mão`);
    assert.equal(engine.items[set.fabric]?.cat, 'tecido', `${set.id}: tecido`);
    assert.ok(set.bonus > 0 && set.bonus <= 0.1);
    keys.add(`${set.hat}|${set.hand}|${set.fabric}`);
  }
  assert.equal(keys.size, data.sets.length, 'nenhum conjunto repete as três peças de outro');
  assert.equal(engine.activeSet(), null);
  assert.equal(engine.setBonus(), 0);
  const plain = engine.multiplier();
  // Caipira de Raiz: chapéu de palha (o inicial) + espiga + tecido remendado.
  engine.addItem('espiga');
  engine.addItem('remendado');
  engine.drainEvents();
  engine.equip('espiga');
  assert.equal(engine.activeSet(), null, 'duas peças não fecham o conjunto');
  assert.ok(!engine.drainEvents().some(event => event.type === 'set'));
  engine.equip('remendado');
  const set = engine.activeSet();
  assert.equal(set?.id, 'caipira');
  const event = engine.drainEvents().find(entry => entry.type === 'set');
  assert.ok(event && event.id === 'caipira' && Math.abs(event.bonus - set.bonus) < 1e-9, 'o conjunto avisa quando fecha');
  assert.ok(Math.abs(engine.multiplier() / plain - (1 + set.bonus) * (1 + engine.cfg.cosmeticBonus * 2) / 1) < 0.02,
    'o multiplicador cresce pelo conjunto (e pelas duas peças na coleção)');
  // Trocar uma peça desfaz o conjunto; recolocar avisa de novo, mas repetir a mesma peça não.
  engine.equip('xadrez-vermelho');
  assert.equal(engine.activeSet(), null);
  engine.drainEvents();
  engine.equip('remendado');
  assert.equal(engine.drainEvents().filter(entry => entry.type === 'set').length, 1);
  engine.equip('remendado');
  assert.equal(engine.drainEvents().filter(entry => entry.type === 'set').length, 0, 'vestir o mesmo de novo não avisa outra vez');
  assert.ok(s.equipped.mao === 'espiga');
});

test('quebra-pote: o pote pendura de tempos em tempos, aguenta pauladas e quebra dando Animação e fichas', () => {
  const { engine, clock } = game();
  const s = engine.state;
  assert.equal(engine.hitPote().active, false, 'sem pote pendurado, sem paulada');
  growTo(engine, 10);
  engine.updateTimers(clock.now);
  assert.equal(s.pote.active, null, 'a Quermesse ainda não tem pote');
  growTo(engine, 25);
  engine.updateTimers(clock.now);
  assert.ok(s.pote.nextAt >= clock.now + data.config.poteEvery[0] * 1000);
  clock.now = s.pote.nextAt + 1;
  engine.updateTimers(clock.now);
  assert.ok(s.pote.active, 'o pote foi pendurado');
  assert.ok(engine.drainEvents().some(event => event.type === 'pote'));
  // Cada paulada conta uma vez por intervalo; o pote quebra na última e dá o prêmio.
  const cheer = s.cheer;
  const tickets = s.tickets;
  let last = null;
  for (let hit = 1; hit <= data.config.poteHits; hit++) {
    last = engine.hitPote();
    assert.equal(last.ready, true);
    if (hit < data.config.poteHits) {
      assert.equal(engine.hitPote().ready, false, 'duas pauladas coladas contam uma só');
      clock.now += data.config.poteCooldown * 1000 + 1;
    }
  }
  assert.equal(last.broke, true);
  assert.equal(s.pote.active, null);
  assert.equal(s.stats.potes, 1);
  assert.ok(s.cheer - cheer >= last.amount - 1e-6 && last.amount >= 100);
  assert.equal(s.tickets - tickets, 2 + engine.tierIndex());
  const events = engine.drainEvents();
  assert.equal(events.filter(event => event.type === 'pote-hit').length, data.config.poteHits);
  assert.ok(events.some(event => event.type === 'pote-break'));
  assert.ok(s.log.some(entry => entry.type === 'pote'));
  // Um pote que ninguém quebrou vai embora sozinho.
  engine.debug('pote');
  assert.ok(s.pote.active);
  clock.now += data.config.poteSeconds * 1000 + 1;
  engine.updateTimers(clock.now);
  assert.equal(s.pote.active, null);
  assert.ok(engine.drainEvents().some(event => event.type === 'pote-gone'));
});

test('as dicas aparecem uma vez só: a música depois de meia hora e os conjuntos com cinco peças sem conjunto', () => {
  const { engine, clock } = game();
  const s = engine.state;
  engine.updateTimers(clock.now);
  assert.equal(engine.drainEvents().filter(event => event.type === 'hint').length, 0, 'no começo, nenhuma dica');
  s.stats.playtime = 1800;
  engine.updateTimers(clock.now);
  assert.deepEqual(engine.drainEvents().filter(event => event.type === 'hint').map(event => event.id), ['music']);
  engine.updateTimers(clock.now);
  assert.equal(engine.drainEvents().filter(event => event.type === 'hint').length, 0, 'a dica não se repete');
  for (const id of ['espiga', 'leque', 'maca-amor', 'lenco-chita', 'remendado']) engine.addItem(id);
  engine.updateTimers(clock.now);
  assert.equal(engine.drainEvents().filter(event => event.type === 'hint').length, 0, 'uma dica de cada vez');
  s.stats.playtime += 91;
  engine.updateTimers(clock.now);
  assert.deepEqual(engine.drainEvents().filter(event => event.type === 'hint').map(event => event.id), ['sets']);
  // O save guarda quais dicas já saíram.
  const again = new GameEngine(data, engine.exportState(), { now: () => clock.now });
  again.updateTimers(clock.now);
  assert.equal(again.drainEvents().filter(event => event.type === 'hint').length, 0);
  assert.equal(again.state.hints.music, true);
});

test('Pipoca baixa o preço das fichas na Barraca de Comidas, e o Amendoim faz as metas renderem mais fichas', () => {
  const { engine } = game();
  const s = engine.state;
  const price = engine.ticketCost();
  s.crew.pipoca = { level: 1 };
  assert.equal(engine.ticketCost(), price, 'sem a Barraca de Comidas ela não trabalha');
  growTo(engine, 10);
  s.inventory.push('barraca-comidas');
  engine.equip('barraca-comidas', 'esquerda');
  assert.equal(engine.charActive('pipoca'), true);
  assert.equal(engine.ticketCost(), Math.round(price * (1 - data.chars.find(char => char.id === 'pipoca').base)), 'nível 1: 10% menos');
  s.crew.pipoca = { level: 10 };
  assert.ok(engine.ticketCost() < price * 0.7, 'no nível 10 as fichas custam bem menos');
  assert.ok(engine.ticketCost() >= 1);
  // O Amendoim (ambulante) abre no porte 1 e aumenta a recompensa das metas.
  s.goals = [{ type: 'steps', target: 1, from: s.stats.steps - 5, reward: { tickets: 10, wood: 0 } }];
  const withoutBonus = engine.claimGoal(0);
  assert.equal(withoutBonus.tickets, 10);
  s.goals = [{ type: 'steps', target: 1, from: s.stats.steps - 5, reward: { tickets: 10, wood: 0 } }];
  s.crew.amendoim = { level: 2 };
  assert.equal(engine.charActive('amendoim'), true);
  const tickets = s.tickets;
  const reward = engine.claimGoal(0);
  assert.equal(reward.tickets, Math.round(10 * (1 + 0.2 + 0.08)), 'nível 2: +28% de fichas');
  assert.equal(s.tickets, tickets + reward.tickets);
});

test('em dia de santo (13, 24 e 29 de junho) a festa rende mais e avisa uma vez', () => {
  const at = (month, day) => new Date(2026, month - 1, day, 15, 0, 0).getTime();
  const on = (month, day) => {
    const engine = new GameEngine(data, null, { rng: () => 0.5, now: () => at(month, day) });
    return engine;
  };
  const plain = on(9, 28);
  assert.equal(plain.specialDay(), null);
  const base = plain.multiplier();
  const joao = on(6, 24);
  assert.equal(joao.specialDay().id, 'joao');
  assert.ok(Math.abs(joao.multiplier() / base - 2) < 1e-9, 'dia de São João: em dobro');
  assert.ok(Math.abs(on(6, 13).multiplier() / base - 1.5) < 1e-9, 'Santo Antônio: +50%');
  assert.ok(Math.abs(on(6, 29).multiplier() / base - 1.5) < 1e-9, 'São Pedro: +50%');
  assert.equal(on(6, 25).specialDay(), null, 'o dia seguinte já é normal');
  joao.tick(0.1);
  assert.deepEqual(joao.drainEvents().filter(event => event.type === 'special-day').map(event => event.id), ['joao']);
  joao.tick(0.1);
  assert.equal(joao.drainEvents().filter(event => event.type === 'special-day').length, 0, 'só avisa uma vez');
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
  engine.state.levels.ritmo = 120;
  engine.state.levels.folego = 50;
  engine.state.runtime.stamina = engine.maxStamina();
  assert.ok(engine.speed() > 4);
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
  for (let size = 2; size <= 200; size++) assert.ok(engine.sceneryPiece(size), `lotação ${size} traz alguma coisa`);
  for (const mark of data.scenery.landmarks) {
    assert.equal(engine.sceneryPiece(mark.size).id, mark.id, `${mark.name} chega com ${mark.size} convidados`);
  }
  const hen = data.scenery.landmarks.find(mark => mark.id === 'galinha').size;
  for (let size = 2; size < hen; size++) assert.notEqual(engine.sceneryPiece(size).id, 'pintinho', 'pintinho só depois da galinha');
  const late = engine.scenery(Math.max(200, ...data.scenery.landmarks.map(mark => mark.size)));
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

test('avançar o tempo (modo de teste) também anda com o balão, a chuva e o quebra-pote', () => {
  const { engine, clock } = game();
  const s = engine.state;
  while (s.size < 30) engine.addFame(engine.fameNeed() - s.fame);
  engine.debug('balao');
  engine.debug('pote');
  engine.debug('chuva');
  const balloon = s.balloon.active.until;
  const rain = s.weather.rain.until;
  engine.advance(5);
  assert.ok(Math.abs(s.balloon.active.until - (balloon - 5000)) < 1e-6);
  assert.ok(Math.abs(s.weather.rain.until - (rain - 5000)) < 1e-6);
  engine.advance(120);
  engine.updateTimers(clock.now);
  assert.equal(s.balloon.active, null, 'o balão já foi embora');
  assert.equal(s.pote.active, null, 'o pote também');
  assert.equal(s.weather.rain, null, 'a chuva passou');
  assert.ok(s.weather.rainbow, 'e saiu o arco-íris');
});

test('bingo da quermesse: cartela com o meio livre, números cantados, linha, BINGO ou a plateia na frente', () => {
  const { engine } = game({ rng: Math.random });
  const s = engine.state;
  assert.equal(engine.buyBingo(), false, 'no quintal não tem bingo');
  while (s.size < 10) engine.addFame(engine.fameNeed() - s.fame);
  s.tickets = 0;
  assert.equal(engine.buyBingo(), false, 'sem fichas não compra');
  s.tickets = 100;
  const cost = engine.bingoCost();
  assert.equal(cost, data.config.bingoCost + 1);
  assert.equal(engine.buyBingo(), true);
  assert.equal(s.tickets, 100 - cost);
  assert.equal(engine.buyBingo(), false, 'uma cartela por rodada');
  const round = s.bingo.round;
  assert.equal(round.card.length, 9);
  assert.equal(round.card[4], 0, 'o meio é livre');
  const numbers = round.card.filter(n => n);
  assert.equal(new Set(numbers).size, 8, 'oito números diferentes');
  assert.ok(numbers.every(n => n >= 1 && n <= data.config.bingoMax));
  assert.ok(round.rival >= data.config.bingoRival[0] && round.rival <= data.config.bingoRival[1]);
  // O locutor canta um número a cada bingoEvery segundos, sem repetir, até a rodada acabar.
  engine.drainEvents();
  for (let i = 0; i < 200 && !round.result; i++) engine.tick(0.5);
  assert.ok(round.result === 'bingo' || round.result === 'rival');
  assert.equal(new Set(round.drawn).size, round.drawn.length, 'nenhum número repete');
  const events = engine.drainEvents();
  assert.equal(events.filter(event => event.type === 'bingo-number').length, round.drawn.length);
  if (round.result === 'bingo') assert.ok(engine.bingoMarks(round).full && events.some(event => event.type === 'bingo-win'));
  else assert.equal(round.drawn.length, round.rival);
  // Depois de uma rodada dá para comprar outra; o save guarda a rodada.
  assert.equal(engine.buyBingo(), true);
  const again = new GameEngine(data, engine.exportState(), { now: () => 1_000_000 });
  assert.deepEqual(again.state.bingo.round.card, s.bingo.round.card);
  assert.equal(new GameEngine(data, { ...engine.exportState(), bingo: { round: { card: [1, 2] } } }).state.bingo.round, null,
    'cartela estragada no save vira nenhuma');
});

test('bingo: a primeira linha paga metade do preço e a cartela cheia paga o prêmio', () => {
  const { engine } = game();
  const s = engine.state;
  while (s.size < 10) engine.addFame(engine.fameNeed() - s.fame);
  s.tickets = 100;
  engine.buyBingo();
  const round = s.bingo.round;
  round.rival = 99;
  const cost = round.cost;
  // Sorteia os números da cartela na ordem: a primeira linha (0, 1, 2) fecha no terceiro.
  const order = round.card.filter(n => n);
  const before = s.tickets;
  let draws = 0;
  engine.rng = () => 0;
  for (const n of order) {
    const left = [];
    for (let k = 1; k <= data.config.bingoMax; k++) if (!round.drawn.includes(k)) left.push(k);
    engine.rng = () => left.indexOf(n) / left.length + 1e-9;
    engine.drawBingo();
    draws++;
    if (draws === 3) assert.equal(s.tickets, before + Math.ceil(cost / 2), 'linha de cima fechada');
  }
  assert.equal(round.result, 'bingo');
  assert.equal(s.tickets, before + Math.ceil(cost / 2) + cost * data.config.bingoPrize);
  assert.equal(s.stats.bingos, 1);
  assert.ok(s.log.some(entry => entry.type === 'bingo' && entry.draws === 8));
});

test('bingo: a chance de ganhar da plateia fica perto de um terço', () => {
  let wins = 0;
  const rounds = 3000;
  for (let i = 0; i < rounds; i++) {
    let seed = i * 7919 + 1;
    const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const { engine } = game({ rng });
    const s = engine.state;
    while (s.size < 10) engine.addFame(engine.fameNeed() - s.fame);
    s.tickets = 100;
    engine.buyBingo();
    while (!s.bingo.round.result) engine.drawBingo();
    if (s.bingo.round.result === 'bingo') wins++;
  }
  assert.ok(wins / rounds > 0.22 && wins / rounds < 0.42, `ganhou ${wins} de ${rounds}`);
});

test('conquistas novas: três bingos, cinco potes quebrados e cinco conjuntos diferentes', () => {
  const { engine, clock } = game();
  const s = engine.state;
  while (s.size < 30) engine.addFame(engine.fameNeed() - s.fame);
  s.stats.potes = 4;
  engine.debug('pote');
  for (let i = 0; i < data.config.poteHits; i++) { s.pote.active.hitAt = 0; engine.hitPote(); }
  assert.ok(s.achievements.includes('quebra-pote'));
  s.stats.bingos = 2;
  s.tickets = 100;
  engine.buyBingo();
  s.bingo.round.rival = 99;
  while (!s.bingo.round.result) engine.drawBingo();
  assert.ok(s.achievements.includes('bingo'));
  for (const item of data.items) engine.addItem(item.id);
  for (const set of data.sets.slice(0, 5)) for (const id of [set.hat, set.hand, set.fabric]) engine.equip(id);
  assert.equal(new Set(s.setsWorn).size, 5);
  assert.ok(s.achievements.includes('estilista'));
  const again = new GameEngine(data, engine.exportState(), { now: () => clock.now });
  assert.equal(again.state.setsWorn.length, 5, 'o save lembra dos conjuntos vestidos');
});

test('São João do ano que vem: volta ao quintal com a turma, as roupas e as fichas, e ganha Tradição', () => {
  const { engine, clock } = game();
  let s = engine.state;
  assert.equal(engine.canNewYear(), false, 'só no Maior São João do Mundo');
  assert.equal(engine.newYear(), false);
  s.cheer = 1e12;
  for (let i = 0; i < 60; i++) engine.buyLevel(data.stats[i % 4].id);
  while (s.size < 100) engine.addFame(engine.fameNeed() - s.fame);
  s.crew.milho = { level: 4 };
  engine.addItem('vaqueiro');
  engine.addItem('barraca-pescaria');
  engine.equip('vaqueiro');
  engine.equip('barraca-pescaria', 'esquerda');
  s.tickets = 77 + engine.bingoCost();
  engine.buyBingo();
  s.wood = 50;
  s.bonfire.calor = 5;
  s.stats.steps = 1200000;
  assert.equal(engine.canNewYear(), true);
  assert.equal(engine.newYear(), true);
  s = engine.state;
  assert.equal(s.year, 2);
  assert.equal(s.size, 1, 'de volta ao quintal');
  assert.equal(engine.tierIndex(), 0);
  assert.equal(s.cheer, 0);
  assert.equal(s.wood, 0, 'a lenha acaba com a fogueira');
  assert.equal(s.bonfire.calor, 0);
  assert.ok(Object.values(s.levels).every(level => level === 1), 'as melhorias recomeçam');
  assert.equal(engine.growthStage(), 0, 'a Mandioca é replantada');
  assert.equal(s.tickets, 77 + data.config.bingoCost + 4, 'as fichas ficam (e a cartela de bingo no meio da rodada é devolvida)');
  assert.equal(s.bingo.round, null);
  assert.deepEqual(s.crew.milho, { level: 4 }, 'a turma fica');
  assert.ok(engine.owned('vaqueiro') && s.equipped.chapeu === 'vaqueiro', 'as roupas ficam');
  assert.equal(s.equipped.esquerda, data.equipped.esquerda, 'a barraca que ainda não abriu volta a ser enfeite');
  assert.ok(engine.owned('barraca-pescaria'), 'mas continua sendo sua');
  assert.equal(engine.learnedDances().length, data.dances.length, 'os passos aprendidos ficam');
  assert.ok(Math.abs(engine.tradition() - data.config.yearBonus) < 1e-9);
  assert.ok(s.achievements.includes('ano-que-vem'));
  assert.ok(s.log.some(entry => entry.type === 'year' && entry.year === 2));
  assert.ok(engine.drainEvents().some(event => event.type === 'new-year'));
  // O ano atravessa o save; um save sem ano começa no primeiro.
  const again = new GameEngine(data, engine.exportState(), { now: () => clock.now });
  assert.equal(again.state.year, 2);
  const legacy = engine.exportState();
  delete legacy.year;
  assert.equal(new GameEngine(data, legacy, { now: () => clock.now }).state.year, 1);
});

test('visita do dia: fichas na primeira vez de cada dia, mais com dias seguidos, e a sequência recomeça se pular um dia', () => {
  const day = (y, m, d, h = 10) => new Date(y, m - 1, d, h).getTime();
  const clock = { now: day(2026, 6, 20) };
  const engine = new GameEngine(data, null, { rng: () => 0.5, now: () => clock.now });
  const s = engine.state;
  const daily = () => engine.drainEvents().filter(event => event.type === 'daily');
  engine.updateTimers(clock.now);
  assert.deepEqual(daily().map(event => [event.streak, event.tickets]), [[1, data.config.dailyBase]]);
  clock.now = day(2026, 6, 20, 23);
  engine.updateTimers(clock.now);
  assert.equal(daily().length, 0, 'uma vez por dia');
  clock.now = day(2026, 6, 21, 8);
  engine.updateTimers(clock.now);
  assert.deepEqual(daily().map(event => event.streak), [2]);
  clock.now = day(2026, 6, 22);
  engine.updateTimers(clock.now);
  assert.equal(daily()[0].tickets, data.config.dailyBase + 2 * data.config.dailyStep);
  clock.now = day(2026, 6, 24);
  engine.updateTimers(clock.now);
  assert.equal(daily()[0].streak, 1, 'pulou um dia: recomeça');
  // Virada de mês e o teto da sequência.
  s.daily = { day: '2026-06-30', streak: 40 };
  clock.now = day(2026, 7, 1);
  engine.updateTimers(clock.now);
  const last = daily()[0];
  assert.equal(last.streak, 41);
  assert.equal(last.tickets, data.config.dailyBase + data.config.dailyStep * (data.config.dailyMax - 1));
  const again = new GameEngine(data, engine.exportState(), { now: () => clock.now });
  assert.deepEqual(again.state.daily, { day: '2026-07-01', streak: 41 });
});

test('as conquistas de contar mostram quanto falta, com a mesma meta que destrava', () => {
  const { engine } = game();
  const s = engine.state;
  for (const a of data.achievements) {
    const entry = engine.achievementProgress(a.id);
    if (entry) assert.ok(entry[1] > 0 && entry[0] >= 0 && entry[0] <= entry[1], a.id);
  }
  assert.deepEqual(engine.achievementProgress('madrinha'), [0, 5]);
  assert.deepEqual(engine.achievementProgress('quermesse'), [1, data.tiers[1].size]);
  assert.equal(engine.achievementProgress('primeiro-passo'), null, 'as de uma vez só não têm barra');
  // Chegou na meta de casamentos: a barra enche e a conquista vem junto.
  while (s.size < 30) engine.addFame(engine.fameNeed() - s.fame);
  for (let i = 0; i < 5; i++) { engine.startWedding(); engine.endWedding(); }
  assert.deepEqual(engine.achievementProgress('madrinha'), [5, 5]);
  assert.ok(s.achievements.includes('madrinha'));
});

test('trio pé-de-serra: sanfona, zabumba e triângulo juntos no palco rendem um bônus a mais', () => {
  const { engine } = game();
  const s = engine.state;
  while (s.size < 30) engine.addFame(engine.fameNeed() - s.fame);
  s.crew.cenoura = { level: 1 };
  s.crew.inhame = { level: 1 };
  assert.equal(engine.trioComplete(), false);
  const two = engine.multiplier();
  s.crew.batata = { level: 1 };
  assert.equal(engine.trioComplete(), true);
  assert.ok(Math.abs(engine.trioBonus() - data.config.trioBonus) < 1e-9);
  assert.ok(engine.multiplier() > two * (1 + data.config.trioBonus) - 1e-9, 'o trio completo rende o bônus');
  // Um músico saiu para um rolê: o trio desfaz.
  engine.state.outings[0] = { char: 'batata', endsAt: engine.now() + 60000 };
  assert.equal(engine.trioComplete(), false);
});

test('Barraca do Beijo: um beijinho rende uma ficha, um a cada poucos minutos', () => {
  const { engine, clock } = game();
  const s = engine.state;
  assert.equal(engine.kiss().ready, false, 'sem a barraca, sem beijo');
  while (s.size < 10) engine.addFame(engine.fameNeed() - s.fame);
  engine.addItem('barraca-beijo');
  engine.equip('barraca-beijo', 'esquerda');
  const tickets = s.tickets;
  assert.equal(engine.kiss().ready, true);
  assert.equal(s.tickets, tickets + data.config.kissTickets);
  const again = engine.kiss();
  assert.equal(again.ready, false);
  assert.ok(again.wait > 0 && again.wait <= data.config.kissMinutes * 60000);
  clock.now += data.config.kissMinutes * 60000;
  assert.equal(engine.kiss().ready, true, 'passou o tempo: outro beijinho');
  assert.equal(new GameEngine(data, engine.exportState(), { now: () => clock.now }).state.kissAt, s.kissAt);
});

test('concurso de quadrilha: jurados dão nota, conjunto e marcadora ajudam, e o lugar decide o prêmio', () => {
  const { engine } = game({ rng: () => 0.5 });
  const s = engine.state;
  while (s.size < 50) engine.addFame(engine.fameNeed() - s.fame);
  const plain = engine.contestScore();
  assert.ok(plain >= 7 && plain < data.config.contestFirst, `sem nada, nota média (${plain})`);
  // Marcadora no caixote e o conjunto mais caro: a nota sobe.
  s.crew.pamonha = { level: 1 };
  for (const item of data.items) engine.addItem(item.id);
  for (const id of ['coroa-milho', 'leque', 'xadrez-ouro']) engine.equip(id);
  assert.ok(engine.contestScore() > plain + 1, 'caprichar rende nota');
  engine.drainEvents();
  const result = engine.judgeContest();
  assert.equal(result.notes.length, 3);
  assert.ok(result.notes.every(note => note >= 5 && note <= 10 && Number.isInteger(note * 2)), 'notas de meio em meio ponto');
  assert.equal(result.place, result.average >= data.config.contestFirst ? 1 : result.average >= data.config.contestSecond ? 2 : 3);
  assert.equal(s.stats.contests, 1);
  assert.ok(engine.drainEvents().some(event => event.type === 'contest' && event.place === result.place));
  // Uma quadrilha de concurso termina com nota, não com casamento.
  engine.debug('concurso');
  assert.equal(s.runtime.contest, true);
  for (let i = 0; i < data.config.quadrilhaSeconds * 2 + 4; i++) engine.tick(0.5);
  assert.equal(s.stats.contests, 2);
  assert.equal(s.runtime.weddingLeft, 0, 'concurso não vira casamento');
  assert.ok(s.log.some(entry => entry.type === 'contest'));
});

test('recordes: o tempo até o Maior São João de cada ano e a festa mais cheia atravessam o ano que vem', () => {
  const { engine } = game();
  let s = engine.state;
  s.stats.playtime = 7200;
  while (s.size < 100) engine.addFame(engine.fameNeed() - s.fame);
  assert.equal(s.records.maior, 7200, 'primeiro São João: 2 horas');
  assert.equal(s.records.size, 100);
  engine.drainEvents();
  engine.newYear();
  s = engine.state;
  assert.equal(s.yearStart, 7200);
  assert.equal(s.records.maior, 7200, 'o recorde fica');
  s.stats.playtime = 7200 + 3600;
  while (s.size < 100) engine.addFame(engine.fameNeed() - s.fame);
  assert.equal(s.records.maior, 3600, 'o 2º ano foi mais rápido');
  assert.ok(engine.drainEvents().some(event => event.type === 'record' && event.before === 7200));
  const again = new GameEngine(data, engine.exportState(), { now: () => 1_000_000 });
  assert.deepEqual(again.state.records, { maior: 3600, size: 100 });
});

test('corrida de saco: espera a largada, um pulo por clique no ritmo, tombo no pulo apressado e prêmio pelo lugar', () => {
  const { engine, clock } = game();
  const s = engine.state;
  const cfg = data.config;
  assert.equal(engine.hopSaco().active, false, 'sem corrida, clique não faz nada');
  engine.updateTimers(clock.now);
  assert.equal(s.saco.active, null, 'o Quintal não tem corrida de saco');
  growTo(engine, 10);
  engine.updateTimers(clock.now);
  assert.ok(s.saco.nextAt >= clock.now + cfg.sacoEvery[0] * 1000);
  clock.now = s.saco.nextAt + 1;
  engine.updateTimers(clock.now);
  assert.ok(s.saco.active, 'a Quermesse chamou a corrida');
  assert.ok(engine.drainEvents().some(event => event.type === 'saco'));
  // Ninguém larga: a turma desiste depois de sacoWait segundos.
  clock.now += cfg.sacoWait * 1000 + 1;
  engine.updateTimers(clock.now);
  assert.equal(s.saco.active, null);
  assert.ok(engine.drainEvents().some(event => event.type === 'saco-gone' && !event.started));
  // Largada no primeiro clique, que já é o primeiro pulo.
  engine.debug('saco');
  s.saco.active.rivals = [60000, 60000];
  engine.drainEvents();
  assert.equal(engine.hopSaco().hops, 1);
  assert.ok(engine.drainEvents().some(event => event.type === 'saco-go'));
  // Pulo colado no anterior: tombo, e caído os cliques não contam.
  const fell = engine.hopSaco();
  assert.equal(fell.fell, true);
  clock.now += 500;
  assert.equal(engine.hopSaco().down, true);
  clock.now += cfg.sacoFall * 1000;
  assert.equal(engine.hopSaco().hops, 2, 'levantou e pulou de novo');
  const tickets = s.tickets;
  let last;
  do { clock.now += cfg.sacoRhythm * 1000 + 30; last = engine.hopSaco(); } while (!last.done);
  assert.equal(last.place, 1, 'rivais lentos: primeiro lugar');
  assert.equal(s.tickets - tickets, 2 + engine.tierIndex(), 'levou tombo: sem a ficha extra');
  assert.equal(s.stats.sacoWins, 1);
  assert.equal(s.stats.sacoRaces, 1);
  assert.ok(s.log.some(entry => entry.type === 'saco' && entry.place === 1));
  // Rivais rápidos: o jogador chega em último e leva só um pouco de Animação.
  engine.debug('saco');
  s.saco.active.rivals = [100, 200];
  const cheer = s.cheer;
  const t0 = s.tickets;
  do { clock.now += cfg.sacoRhythm * 1000 + 30; last = engine.hopSaco(); } while (!last.done);
  assert.equal(last.place, 3);
  assert.equal(s.tickets, t0);
  assert.ok(s.cheer > cheer);
  // Sem tombo, o primeiro lugar rende uma ficha a mais; cinco vitórias dão a conquista.
  s.stats.sacoWins = 4;
  engine.debug('saco');
  s.saco.active.rivals = [60000, 60000];
  const t1 = s.tickets;
  do { clock.now += cfg.sacoRhythm * 1000 + 30; last = engine.hopSaco(); } while (!last.done);
  assert.equal(s.tickets - t1, 3 + engine.tierIndex());
  assert.ok(s.achievements.includes('canguru'));
  assert.deepEqual(engine.achievementProgress('canguru'), [5, 5]);
});

test('corrida de saco: o save não guarda a corrida pela metade, e avançar o tempo anda com o relógio dela', () => {
  const { engine, clock } = game();
  growTo(engine, 10);
  engine.debug('saco');
  engine.hopSaco();
  const { engine: other } = game({ saved: JSON.parse(JSON.stringify(engine.state)) });
  assert.equal(other.state.saco.active, null);
  const race = engine.state.saco.active;
  const start = race.start;
  engine.advance(10);
  assert.equal(race.start, start - 10000, 'a largada anda junto');
  assert.equal(race.until - clock.now, (data.config.sacoLimit - 10) * 1000);
  engine.advance(25);
  assert.equal(engine.state.saco.active, null, 'largou e não chegou: acabou');
  assert.ok(engine.drainEvents().some(event => event.type === 'saco-gone' && event.started));
});

test('leilão de prendas: lance guardado, plateia cobre até o teto, dou-lhe três e a prenda vai para quem deu o último lance', () => {
  const { engine, clock } = game();
  const s = engine.state;
  const cfg = data.config;
  assert.equal(engine.bidLeilao().active, false, 'sem leilão, sem lance');
  growTo(engine, 10);
  engine.updateTimers(clock.now);
  assert.equal(s.leilao.active, null, 'a Quermesse ainda não tem leilão');
  growTo(engine, 25);
  engine.updateTimers(clock.now);
  assert.ok(s.leilao.nextAt >= clock.now + cfg.leilaoEvery[0] * 1000);
  clock.now = s.leilao.nextAt + 1;
  engine.updateTimers(clock.now);
  const a = s.leilao.active;
  assert.ok(a, 'o leiloeiro subiu no palco');
  assert.ok(data.items.find(item => item.id === a.prize.item)?.source === 'leilao', 'a prenda é um item do leilão');
  assert.equal(a.base, cfg.leilaoBase + engine.tierIndex());
  // Sem fichas não dá lance.
  s.tickets = 0;
  assert.equal(engine.bidLeilao().broke, true);
  s.tickets = 100;
  a.max = a.base + 1;
  assert.equal(engine.bidLeilao().bid, a.base);
  assert.equal(s.tickets, 100 - a.base, 'as fichas do lance ficam guardadas');
  assert.equal(engine.bidLeilao().leading, true, 'quem já está na frente não cobre a si mesmo');
  // A plateia cobre: as fichas voltam.
  clock.now = a.rivalAt + 1;
  engine.updateTimers(clock.now);
  assert.equal(a.leader, 'plateia');
  assert.equal(a.price, a.base + 1);
  assert.equal(s.tickets, 100);
  assert.equal(engine.bidLeilao().bid, a.base + 2);
  assert.equal(a.rivalAt, 0, 'passou do teto da plateia: ela não cobre mais');
  // Dou-lhe uma, dou-lhe duas, dou-lhe três: vendido.
  engine.drainEvents();
  for (let k = 0; k < 3; k++) {
    clock.now += cfg.leilaoCall * 1000 + 1;
    engine.updateTimers(clock.now);
  }
  const events = engine.drainEvents();
  assert.equal(events.filter(event => event.type === 'leilao-call').length, 2);
  assert.ok(events.some(event => event.type === 'leilao-sold' && event.winner === 'voce'));
  assert.equal(s.leilao.active, null);
  assert.ok(s.inventory.includes(a.prize.item), 'a prenda é sua');
  assert.equal(s.tickets, 100 - (a.base + 2));
  assert.equal(s.stats.leiloes, 1);
  assert.ok(s.log.some(entry => entry.type === 'leilao' && entry.item === a.prize.item));
});

test('leilão de prendas: ninguém dá lance e a plateia leva; com todas as prendas, disputa Animação; o save devolve o lance', () => {
  const { engine, clock } = game();
  const s = engine.state;
  const cfg = data.config;
  growTo(engine, 25);
  engine.debug('leilao');
  const a = s.leilao.active;
  clock.now = a.rivalAt + 1;
  engine.updateTimers(clock.now);
  assert.equal(a.leader, 'plateia', 'a plateia abriu o leilão');
  for (let k = 0; k < 3; k++) { clock.now += cfg.leilaoCall * 1000 + 1; engine.updateTimers(clock.now); }
  assert.equal(s.leilao.active, null);
  assert.ok(!s.inventory.includes(a.prize.item), 'a plateia levou');
  // Com todas as prendas do leilão, o prêmio vira Animação.
  for (const item of data.items.filter(entry => entry.source === 'leilao')) engine.addItem(item.id);
  engine.debug('leilao');
  assert.ok(s.leilao.active.prize.cheer > 0);
  s.tickets = 50;
  engine.bidLeilao();
  const held = s.leilao.active.held;
  assert.ok(held > 0);
  const { engine: other } = game({ saved: JSON.parse(JSON.stringify(s)) });
  assert.equal(other.state.leilao.active, null);
  assert.equal(other.state.tickets, 50, 'o lance guardado voltou');
  // Três arremates dão a conquista.
  s.stats.leiloes = 2;
  s.leilao.active.rivalAt = 0;
  for (let k = 0; k < 3; k++) { clock.now += cfg.leilaoCall * 1000 + 1; engine.updateTimers(clock.now); }
  assert.ok(s.achievements.includes('dou-lhe-tres'));
});

test('bingo: a plateia grita antes da última bola, então nenhuma cartela é vitória garantida, e ganha-se ~30%', () => {
  const { bingoMax, bingoRival: [low, high] } = data.config;
  assert.ok(high < bingoMax, 'se saíssem as 30 bolas, a cartela fecharia sempre');
  // Chance de as 8 casas da cartela saírem nos primeiros k sorteios: C(k, 8) / C(30, 8), na média dos gritos possíveis.
  const choose = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; };
  let sum = 0;
  for (let k = low; k <= high; k++) sum += choose(k, 8) / choose(bingoMax, 8);
  const win = sum / (high - low + 1);
  assert.ok(win > 0.25 && win < 0.35, `chance de ganhar: ${(win * 100).toFixed(1)}%`);
  // Save antigo com o grito na 30ª bola volta para dentro do intervalo.
  const { engine } = game();
  growTo(engine, 10);
  engine.state.tickets = 20;
  engine.buyBingo();
  const saved = JSON.parse(JSON.stringify(engine.state));
  saved.bingo.round.rival = 30;
  const { engine: again } = game({ saved });
  assert.equal(again.state.bingo.round.rival, high);
});
