const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../src/data.js');
const { GameEngine } = require('../src/core.js');

const cfg = data.mundo;

function newEngine(size = 40, rngValue = 0.5, saved = null) {
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(data, saved, { rng: () => rngValue, now: () => clock.t });
  engine.state.size = engine.state.records.size = size;
  return { engine, clock };
}
// Pega o alvo k de uma vez (nos eventos de vários golpes, bate até estourar).
function grab(engine, k) {
  let result;
  do { result = engine.mundo.catchTarget(k); } while (result.partial);
  return result;
}
const tick = (engine, clock, seconds) => { clock.t += seconds * 1000; engine.tick(Math.min(1, seconds)); };

test('mundo: os trinta e um eventos têm nome, texto, tempo, peso, alvos e prêmios válidos', () => {
  assert.equal(cfg.eventos.length, 31);
  const ids = new Set();
  for (const entry of cfg.eventos) {
    assert.ok(!ids.has(entry.id), `${entry.id}: id repetido`);
    ids.add(entry.id);
    assert.ok(entry.name && entry.text, entry.id);
    assert.ok(entry.seconds >= 20 && entry.seconds <= 120, `${entry.id}: tempo`);
    assert.ok(entry.weight >= 1, `${entry.id}: peso`);
    assert.ok(Number.isInteger(entry.targets) && entry.targets >= 0 && entry.targets <= 16, `${entry.id}: alvos`);
    if (entry.hits !== undefined) assert.ok(Number.isInteger(entry.hits) && entry.hits >= 2 && entry.hits <= 12, `${entry.id}: golpes`);
    if (entry.targets === 0) assert.ok(entry.bonus >= 0.1, `${entry.id}: sem alvos o bônus é o prêmio`);
    assert.ok(entry.bonus >= 0 && entry.bonus <= 0.3, `${entry.id}: bônus`);
    for (const spec of [entry.reward, entry.finale]) {
      for (const key of Object.keys(spec)) assert.ok(['tickets', 'wood', 'cheer', 'love', 'belly'].includes(key), `${entry.id}: ${key}`);
    }
    if (entry.shop) {
      assert.equal(entry.shop.length, entry.targets, `${entry.id}: uma oferta por barraca`);
      entry.shop.forEach((offer, k) => { assert.ok(offer.cost >= 1 && offer.bonus > 0 && offer.bonus <= 0.5 && offer.seconds >= 30, `${entry.id}: oferta ${k}`); assert.ok(entry[`shop${k}`], `${entry.id}: nome da barraca ${k}`); });
    } else if (entry.loot) {
      assert.ok(entry.loot.length >= 3, `${entry.id}: tem o que sortear`);
      for (const spec of entry.loot) for (const key of Object.keys(spec)) assert.ok(['tickets', 'wood', 'cheer', 'love', 'belly'].includes(key), `${entry.id}: ${key}`);
    } else if (entry.targets) {
      assert.ok(Object.keys(entry.reward).length, `${entry.id}: cada alvo paga alguma coisa`);
    }
  }
  assert.ok(cfg.every[0] > 0 && cfg.every[1] >= cfg.every[0]);
  assert.ok(cfg.minSize >= 1);
});

test('mundo: só começa com convidados suficientes, depois da pausa sorteada, e avisa o começo e o fim', () => {
  const { engine, clock } = newEngine(cfg.minSize - 1);
  tick(engine, clock, 1);
  assert.deepEqual(engine.state.mundo.active, null);
  assert.equal(engine.state.mundo.nextAt, 0, 'festa pequena: nada marcado');
  engine.state.size = cfg.minSize;
  tick(engine, clock, 1);
  const next = engine.state.mundo.nextAt;
  assert.ok(next >= clock.t + cfg.every[0] * 1000 - 1000 && next <= clock.t + cfg.every[1] * 1000 + 1000, 'marcou o primeiro evento');
  engine.drainEvents();
  clock.t = next;
  engine.tick(0.1);
  const active = engine.mundo.active();
  assert.ok(active, 'começou');
  assert.equal(active.until - active.born, active.entry.seconds * 1000);
  assert.ok([-1, 1].includes(active.dir));
  assert.deepEqual(active.got, []);
  const started = engine.drainEvents().filter(event => event.type === 'mundo');
  assert.deepEqual(started.map(event => [event.id, event.seconds, event.n]), [[active.id, active.entry.seconds, active.entry.targets]]);
  assert.equal(engine.state.mundo.seen[active.id], 1);
  assert.equal(engine.state.log.at(-1).type, 'mundo');
  // Acabou o tempo: some, avisa quantos alvos foram pegos e marca o próximo.
  const id = active.id;
  clock.t += active.entry.seconds * 1000 + 1;
  engine.tick(0.1);
  assert.equal(engine.state.mundo.active, null);
  assert.deepEqual(engine.drainEvents().filter(event => event.type === 'mundo-fim').map(event => [event.id, event.got]), [[id, 0]]);
  assert.ok(engine.state.mundo.nextAt > clock.t);
});

test('mundo: só entra no sorteio o que cabe na festa, pelo peso, e nunca repete o último', () => {
  const small = newEngine(cfg.minSize).engine;
  const fit = cfg.eventos.filter(entry => entry.minSize <= cfg.minSize).map(entry => entry.id);
  for (let i = 0; i < 20; i++) {
    small.state.mundo.last = '';
    assert.ok(fit.includes(small.mundo.pick()), 'só os que cabem');
  }
  // O peso: com o sorteio no começo da roleta vem o primeiro; no fim, o último.
  const big = newEngine(200, 0).engine;
  assert.equal(big.mundo.pick(), cfg.eventos[0].id);
  const last = newEngine(200, 0.999999).engine;
  assert.equal(last.mundo.pick(), cfg.eventos.at(-1).id);
  // Nunca o mesmo duas vezes seguidas.
  const again = newEngine(200, 0).engine;
  again.state.mundo.last = cfg.eventos[0].id;
  assert.notEqual(again.mundo.pick(), cfg.eventos[0].id);
});

test('mundo: não começa durante a chuva nem o arco-íris, e a chuva também espera o evento acabar', () => {
  const { engine, clock } = newEngine(60);
  tick(engine, clock, 1);
  clock.t = engine.state.mundo.nextAt + 5;
  engine.state.weather.rain = { born: clock.t, until: clock.t + 60000 };
  engine.tick(0.1);
  assert.equal(engine.state.mundo.active, null, 'chovendo: o evento espera');
  assert.ok(engine.state.mundo.nextAt > 0, 'e continua marcado');
  engine.state.weather.rain = null;
  engine.state.weather.rainbow = { born: clock.t, until: clock.t + 60000, side: 0 };
  engine.tick(0.1);
  assert.equal(engine.state.mundo.active, null, 'arco-íris: também espera');
  engine.state.weather.rainbow = null;
  engine.tick(0.1);
  assert.ok(engine.state.mundo.active, 'passou a chuva: começa');
  // Com o evento no ar a chuva de São João não começa, mesmo na hora dela.
  engine.state.weather.nextAt = clock.t - 1;
  engine.tick(0.1);
  assert.equal(engine.state.weather.rain, null);
});

test('mundo: o bônus de Animação vale só enquanto o evento dura', () => {
  const { engine, clock } = newEngine(60);
  const base = engine.multiplier();
  assert.equal(engine.mundoBonus(), 0);
  engine.mundo.start('estrelas');
  assert.equal(engine.mundoBonus(), cfg.eventos[0].bonus);
  assert.ok(Math.abs(engine.multiplier() / base - (1 + cfg.eventos[0].bonus)) < 1e-9);
  clock.t += cfg.eventos[0].seconds * 1000 + 1;
  assert.equal(engine.mundoBonus(), 0, 'o prazo passou');
  engine.tick(0.1);
  assert.equal(engine.mundoBonus(), 0);
  engine.mundo.start('temporal');
  assert.equal(engine.mundoBonus(), 0, 'o temporal não dá bônus');
});

test('mundo: cada alvo vale uma vez, paga o prêmio do evento e o último paga também o final', () => {
  const { engine, clock } = newEngine(60);
  engine.mundo.start('ventania');
  const entry = cfg.eventos.find(item => item.id === 'ventania');
  const wood = engine.state.wood;
  engine.drainEvents();
  assert.deepEqual(engine.mundo.catchTarget(-1), { ok: false, reason: 'none' });
  assert.deepEqual(engine.mundo.catchTarget(entry.targets), { ok: false, reason: 'none' });
  assert.deepEqual(engine.mundo.catchTarget(1.5), { ok: false, reason: 'none' });
  const first = engine.mundo.catchTarget(2);
  assert.equal(first.ok, true);
  assert.equal(first.left, entry.targets - 1);
  assert.equal(first.given.wood, entry.reward.wood);
  assert.equal(engine.state.wood, wood + entry.reward.wood);
  assert.deepEqual(engine.mundo.catchTarget(2), { ok: false, reason: 'taken' }, 'o mesmo alvo não paga de novo');
  assert.equal(engine.state.mundo.caught.ventania, 1);
  assert.deepEqual(engine.drainEvents().filter(event => event.type === 'mundo-pego').map(event => [event.k, event.all]), [[2, false]]);
  // Pegando todos: o último traz o prêmio final, o aviso e o diário.
  const tickets = engine.state.tickets;
  let last = null;
  for (let k = 0; k < entry.targets; k++) if (k !== 2) last = engine.mundo.catchTarget(k);
  assert.equal(last.all, true);
  assert.equal(last.finale.tickets, entry.finale.tickets);
  assert.equal(engine.state.tickets, tickets + entry.finale.tickets);
  assert.equal(engine.state.log.at(-1).type, 'mundo-completo');
  assert.equal(engine.state.mundo.caught.ventania, entry.targets);
  // Passou do tempo: nada para pegar.
  clock.t += entry.seconds * 1000 + 1;
  assert.deepEqual(engine.mundo.catchTarget(0), { ok: false, reason: 'none' });
  engine.tick(0.1);
  assert.deepEqual(engine.mundo.catchTarget(0), { ok: false, reason: 'none' });
});

test('mundo: cada evento paga com o que o jogo sabe dar (todos os alvos de todos os eventos)', () => {
  for (const entry of cfg.eventos) {
    const { engine } = newEngine(100);
    engine.state.tickets = 1000;
    engine.mundo.start(entry.id);
    let result = null;
    if (!entry.targets) { assert.deepEqual(engine.mundo.catchTarget(0), { ok: false, reason: 'none' }, `${entry.id}: sem alvos`); continue; }
    for (let k = 0; k < entry.targets; k++) {
      result = grab(engine, k);
      assert.equal(result.ok, true, `${entry.id}:${k}`);
      assert.ok(entry.shop ? result.buff : Object.keys(result.given).length, `${entry.id}: o alvo pagou algo`);
    }
    assert.equal(result.all, true);
    if (Object.keys(entry.finale).length) assert.ok(Object.keys(result.finale).length, `${entry.id}: o final pagou`);
  }
});

test('mundo: o save guarda o que já passou e ignora o evento no meio; ano novo e advance mexem nos relógios', () => {
  const { engine, clock } = newEngine(120);
  engine.mundo.start('lua');
  engine.mundo.catchTarget(0);
  clock.t += 100;
  const saved = JSON.parse(JSON.stringify(engine.exportState()));
  assert.ok(saved.mundo.active, 'o save guarda o que está passando');
  const back = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.t });
  assert.equal(back.state.mundo.active, null, 'mas ao abrir o jogo ele já acabou');
  assert.equal(back.state.mundo.seen.lua, 1);
  assert.equal(back.state.mundo.caught.lua, 1);
  assert.equal(back.state.mundo.last, 'lua');
  // Save mexido: contagens inválidas, eventos que não existem e um relógio para daqui a séculos.
  const bad = JSON.parse(JSON.stringify(saved));
  bad.mundo = { nextAt: 1e18, active: { id: 'x' }, seen: { lua: -5, fantasma: 9, estrelas: 'muito' }, caught: { lua: 1e30 }, last: 'fantasma' };
  const odd = new GameEngine(data, bad, { rng: () => 0.5, now: () => clock.t });
  assert.deepEqual([odd.state.mundo.active, odd.state.mundo.last, odd.state.mundo.seen], [null, '', {}]);
  assert.ok(odd.state.mundo.nextAt <= clock.t + cfg.every[1] * 1000);
  assert.equal(odd.state.mundo.caught.lua, 1e9);
  for (const raw of [null, 7, 'x', [], { seen: 5 }]) {
    const copy = JSON.parse(JSON.stringify(saved));
    copy.mundo = raw;
    assert.deepEqual(new GameEngine(data, copy, { rng: () => 0.5, now: () => clock.t }).state.mundo, { nextAt: 0, nextId: '', active: null, seen: {}, caught: {}, done: {}, last: '', buffs: [] });
  }
  // O ano novo guarda quantos já foram vistos.
  back.state.size = back.state.records.size = 100;
  assert.equal(back.newYear(), true);
  assert.equal(back.state.mundo.seen.lua, 1);
  // advance: o tempo passou de uma vez e o evento já acabou.
  engine.advance(cfg.eventos.find(item => item.id === 'lua').seconds + 5);
  assert.equal(engine.state.mundo.active, null);
});

test('mundo: a lua cheia chama a visita do folclore logo', () => {
  const { engine, clock } = newEngine(120);
  const visits = engine.state.minis.folclore;
  visits.active = null;
  visits.nextAt = clock.t + 3_600_000;
  engine.mundo.start('lua');
  assert.ok(visits.nextAt <= clock.t + 12000 + 1, 'a próxima visita vem em segundos');
  // Os outros eventos não mexem nisso.
  visits.nextAt = clock.t + 3_600_000;
  engine.state.mundo.active = null;
  engine.mundo.start('estrelas');
  assert.equal(visits.nextAt, clock.t + 3_600_000);
});

test('mundo: o botão de teste chama os eventos um a um, na ordem, e encerra o que estava passando', () => {
  const { engine } = newEngine(120);
  const seen = [];
  for (let i = 0; i < cfg.eventos.length + 1; i++) {
    engine.debug('mundo');
    seen.push(engine.state.mundo.active.id);
  }
  assert.deepEqual(seen.slice(0, cfg.eventos.length), cfg.eventos.map(entry => entry.id));
  assert.equal(seen.at(-1), cfg.eventos[0].id, 'volta ao começo');
});

test('mundo: a informação para a tela conta quantas vezes e quantos tipos já passaram', () => {
  const { engine } = newEngine(120);
  assert.deepEqual([engine.mundo.info().seenTotal, engine.mundo.info().seenKinds, engine.mundo.info().kinds], [0, 0, 31]);
  engine.mundo.start('estrelas');
  engine.state.mundo.active = null;
  engine.mundo.start('estrelas');
  engine.state.mundo.active = null;
  engine.mundo.start('lua');
  assert.deepEqual([engine.mundo.info().seenTotal, engine.mundo.info().seenKinds], [3, 2]);
  assert.equal(engine.mundo.start('nao-existe'), false);
});

test('mundo: as conquistas do céu (ver os 15 eventos e juntar 100 alvos)', () => {
  const { engine } = newEngine(200);
  assert.deepEqual(engine.achievementProgress('ceu-aberto'), [0, 31]);
  assert.deepEqual(engine.achievementProgress('cacador-de-alvos'), [0, 100]);
  const done = () => engine.state.achievements.filter(id => ['ceu-aberto', 'cacador-de-alvos'].includes(id));
  // Cada tipo uma vez: só o último abre o Céu aberto.
  for (const entry of cfg.eventos.slice(0, -1)) { engine.state.mundo.active = null; engine.mundo.start(entry.id); }
  assert.deepEqual(done(), []);
  assert.deepEqual(engine.achievementProgress('ceu-aberto'), [30, 31]);
  engine.state.mundo.active = null;
  engine.mundo.start(cfg.eventos.at(-1).id);
  assert.deepEqual(done(), ['ceu-aberto']);
  // Os alvos de todos os eventos somam: a 100ª conquista abre o Caçador (uma vez só).
  let caught = 0;
  while (caught < 99) {
    for (const entry of cfg.eventos) {
      if (caught >= 99) break;
      engine.state.mundo.active = null;
      engine.mundo.start(entry.id);
      for (let k = 0; k < entry.targets && caught < 99; k++) { grab(engine, k); caught++; }
    }
  }
  assert.equal(engine.mundo.caughtTotal(), 99);
  assert.deepEqual(done(), ['ceu-aberto']);
  engine.state.mundo.active = null;
  engine.mundo.start('estrelas');
  engine.mundo.catchTarget(0);
  assert.deepEqual(done().sort(), ['cacador-de-alvos', 'ceu-aberto']);
  assert.equal(engine.state.achievements.filter(id => id === 'cacador-de-alvos').length, 1);
});

test('mundo: na feira cada barraca vende um bônus de Animação por fichas (sem ficha não vende) e o bônus vale até acabar o tempo', () => {
  const { engine, clock } = newEngine(100);
  const entry = cfg.eventos.find(item => item.id === 'feira');
  engine.mundo.start('feira');
  const base = engine.multiplier();
  engine.state.tickets = 3;
  // Sem ficha não vende, e a barraca continua à venda.
  assert.deepEqual(engine.mundo.catchTarget(0), { ok: false, reason: 'poor', id: 'feira', k: 0, cost: entry.shop[0].cost });
  assert.deepEqual(engine.state.mundo.active.got, []);
  assert.equal(engine.state.tickets, 3);
  assert.equal(engine.mundoBonus(), 0);
  // Com ficha: paga, soma o bônus e o aviso diz quanto custou.
  engine.state.tickets = 10;
  const bought = engine.mundo.catchTarget(0);
  assert.equal(bought.ok, true);
  assert.deepEqual(bought.buff, { bonus: entry.shop[0].bonus, seconds: entry.shop[0].seconds, cost: entry.shop[0].cost });
  assert.equal(engine.state.tickets, 10 - entry.shop[0].cost);
  assert.equal(engine.mundoBonus(), entry.shop[0].bonus);
  assert.ok(Math.abs(engine.multiplier() / base - (1 + entry.shop[0].bonus)) < 1e-9);
  assert.deepEqual(engine.mundo.catchTarget(0), { ok: false, reason: 'taken' }, 'a barraca já foi comprada');
  assert.deepEqual(engine.mundo.buffs().map(buff => [buff.name, buff.bonus]), [['Pamonha quentinha', entry.shop[0].bonus]]);
  // As três compradas somam os bônus; a última traz o prêmio final.
  engine.state.tickets = 100;
  engine.mundo.catchTarget(1);
  const last = engine.mundo.catchTarget(2);
  assert.equal(last.all, true);
  assert.equal(last.finale.tickets, entry.finale.tickets);
  assert.ok(Math.abs(engine.mundoBonus() - entry.shop.reduce((sum, offer) => sum + offer.bonus, 0)) < 1e-9);
  // O evento acaba, mas o bônus comprado continua até o fim do tempo dele (o menor primeiro).
  clock.t += entry.seconds * 1000 + 1;
  engine.tick(0.1);
  assert.equal(engine.state.mundo.active, null);
  assert.equal(engine.mundo.buffs().length, 3, 'os três ainda valem');
  clock.t += 55 * 1000;
  engine.tick(0.1);
  assert.deepEqual(engine.mundo.buffs().map(buff => buff.bonus).sort(), [0.1, 0.15], 'o de 120 s acabou');
  clock.t += 60 * 1000;
  engine.tick(0.1);
  assert.deepEqual(engine.mundo.buffs().map(buff => buff.bonus), [0.1], 'o de 180 s acabou');
  assert.equal(engine.mundoBonus(), 0.1);
  clock.t += 120 * 1000;
  engine.tick(0.1);
  assert.deepEqual(engine.mundo.buffs(), []);
  assert.equal(engine.mundoBonus(), 0);
  // Comprar de novo na feira seguinte renova a mesma barraca em vez de empilhar duas.
  engine.state.mundo.active = null;
  engine.mundo.start('feira');
  engine.mundo.catchTarget(0);
  engine.state.mundo.active = null;
  engine.mundo.start('feira');
  engine.mundo.catchTarget(0);
  assert.equal(engine.state.mundo.buffs.filter(buff => buff.id === 'feira:0').length, 1);
});

test('mundo: o bônus da feira passa pelo save (só o que ainda vale), pelo ano novo e pelo advance; save mexido não inventa bônus', () => {
  const { engine, clock } = newEngine(120);
  engine.state.tickets = 100;
  engine.mundo.start('feira');
  engine.mundo.catchTarget(1);
  engine.mundo.catchTarget(2);
  const saved = JSON.parse(JSON.stringify(engine.exportState()));
  const back = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.t });
  assert.deepEqual(back.state.mundo.buffs.map(buff => buff.id).sort(), ['feira:1', 'feira:2']);
  assert.ok(Math.abs(back.mundoBonus() - 0.35) < 1e-9);
  // Passado o tempo de uma barraca, ela não volta do save.
  const later = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.t + 130 * 1000 });
  assert.deepEqual(later.state.mundo.buffs.map(buff => buff.id), ['feira:2']);
  // Ano novo guarda; advance gasta o tempo.
  back.state.size = back.state.records.size = 100;
  assert.equal(back.newYear(), true);
  assert.equal(back.state.mundo.buffs.length, 2);
  engine.advance(130);
  assert.deepEqual(engine.mundo.buffs().map(buff => buff.bonus), [0.1]);
  // Save mexido: bônus absurdo, de daqui a séculos, sem id, mais de seis.
  const bad = JSON.parse(JSON.stringify(saved));
  bad.mundo.buffs = [{ id: 'x:1', until: clock.t + 1e15, bonus: 9 }, { id: 5, until: clock.t + 1000, bonus: 0.1 }, { id: 'y', until: clock.t - 5, bonus: 0.1 }, null, 'x',
    ...Array.from({ length: 10 }, (_, i) => ({ id: `z:${i}`, until: clock.t + 1000, bonus: 0.01 }))];
  const odd = new GameEngine(data, bad, { rng: () => 0.5, now: () => clock.t });
  assert.ok(odd.state.mundo.buffs.length <= 6);
  for (const buff of odd.state.mundo.buffs) assert.ok(buff.bonus <= 0.5 && buff.until <= clock.t + 3600000 && typeof buff.id === 'string');
  for (const raw of [null, 7, 'x', {}, { x: 1 }]) {
    const copy = JSON.parse(JSON.stringify(saved));
    copy.mundo.buffs = raw;
    assert.deepEqual(new GameEngine(data, copy, { rng: () => 0.5, now: () => clock.t }).state.mundo.buffs, []);
  }
});

test('mundo: no tesouro cada marca guarda um prêmio sorteado no começo (o mesmo para sempre) e o clique entrega esse prêmio', () => {
  let n = 0;
  const clock = { t: 1_700_000_000_000 };
  const rolls = [0.05, 0.5, 0.95, 0.3, 0.7, 0.1, 0.9, 0.4, 0.6, 0.2];
  const engine = new GameEngine(data, null, { rng: () => rolls[n++ % rolls.length], now: () => clock.t });
  engine.state.size = engine.state.records.size = 100;
  const entry = cfg.eventos.find(item => item.id === 'tesouro');
  engine.mundo.start('tesouro');
  const loot = engine.state.mundo.active.loot;
  assert.equal(loot.length, entry.targets);
  for (const spec of loot) assert.ok(entry.loot.includes(spec), 'veio da lista');
  const before = { tickets: engine.state.tickets, wood: engine.state.wood };
  const results = [0, 1, 2].map(k => engine.mundo.catchTarget(k));
  results.forEach((result, k) => {
    assert.equal(result.ok, true);
    // O que o clique deu é o que a marca guardava (fichas e lenha somam exatamente; os outros prêmios dão o que existe).
    if (loot[k].tickets) assert.equal(result.given.tickets, loot[k].tickets, `marca ${k}`);
    if (loot[k].wood) assert.equal(result.given.wood, loot[k].wood, `marca ${k}`);
    if (loot[k].love) assert.ok(result.given.love > 0);
    if (loot[k].cheer) assert.ok(result.given.cheer > 0);
    if (loot[k].belly) assert.ok(result.given.belly > 0);
  });
  assert.equal(results.at(-1).all, true);
  assert.equal(results.at(-1).finale.tickets, entry.finale.tickets);
  assert.ok(engine.state.tickets >= before.tickets + entry.finale.tickets);
  // O prêmio da marca não muda com o tempo nem com o save no meio.
  const { engine: again } = newEngine(100);
  again.mundo.start('tesouro');
  const saved = JSON.parse(JSON.stringify(again.state.mundo.active.loot));
  clock.t += 1000;
  assert.deepEqual(again.state.mundo.active.loot, saved);
});

test('mundo: o pôr do sol não tem alvos e só dá o bônus enquanto dura; a placa mostra o nome com o bônus', () => {
  const { engine, clock } = newEngine(100);
  const entry = cfg.eventos.find(item => item.id === 'poente');
  assert.equal(entry.targets, 0);
  engine.mundo.start('poente');
  assert.equal(engine.mundoBonus(), entry.bonus);
  assert.deepEqual(engine.mundo.catchTarget(0), { ok: false, reason: 'none' });
  assert.equal(engine.mundo.active().n, 0);
  assert.deepEqual(engine.mundo.active().got, []);
  clock.t += entry.seconds * 1000 + 1;
  engine.drainEvents();
  engine.tick(0.1);
  assert.equal(engine.state.mundo.active, null);
  assert.deepEqual(engine.drainEvents().filter(event => event.type === 'mundo-fim').map(event => [event.got, event.n]), [[0, 0]]);
  assert.equal(engine.mundoBonus(), 0);
});

test('mundo: a previsão sorteia o próximo evento ao marcar a hora, o evento é esse mesmo (nunca o último) e a previsão passa pelo save', () => {
  const rolls = [0.9, 0.1, 0.6, 0.3, 0.8, 0.2, 0.5, 0.7, 0.4];
  let n = 0;
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(data, null, { rng: () => rolls[n++ % rolls.length], now: () => clock.t });
  engine.state.size = engine.state.records.size = 100;
  assert.equal(engine.mundo.forecast(), null, 'antes de marcar não há previsão');
  tick(engine, clock, 1);
  const plan = engine.mundo.forecast();
  assert.ok(plan && cfg.eventos.includes(plan.entry), 'tem previsão');
  assert.equal(plan.at, engine.state.mundo.nextAt);
  assert.equal(engine.state.mundo.nextId, plan.entry.id);
  // Salvar e carregar mantém a previsão (e um id inventado some).
  const saved = JSON.parse(JSON.stringify(engine.exportState()));
  const back = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.t });
  assert.equal(back.mundo.forecast().entry.id, plan.entry.id);
  for (const bad of ['inventado', 7, null, {}]) {
    const copy = JSON.parse(JSON.stringify(saved));
    copy.mundo.nextId = bad;
    const odd = new GameEngine(data, copy, { rng: () => 0.5, now: () => clock.t });
    assert.equal(odd.mundo.forecast(), null, `${bad}: sem previsão`);
    assert.equal(odd.state.mundo.nextId, '', `${bad}: o id inventado não fica guardado`);
  }
  // A festa encolheu abaixo do mínimo: a hora some, e a previsão junto (ainda que o id sobre guardado).
  back.state.size = cfg.minSize - 1;
  tick(back, clock, 1);
  assert.equal(back.state.mundo.nextAt, 0);
  assert.equal(back.mundo.forecast(), null, 'sem hora marcada não há previsão');
  // Chegou a hora: começa exatamente o que a previsão disse, e durante o evento não há previsão.
  clock.t = plan.at + 5;
  engine.tick(0.1);
  assert.equal(engine.state.mundo.active.id, plan.entry.id, 'o evento é o previsto');
  assert.equal(engine.mundo.forecast(), null);
  assert.equal(engine.state.mundo.nextId, '');
  // Acabou: marca outra hora com outra previsão, que não repete o que acabou de passar.
  clock.t += plan.entry.seconds * 1000 + 1;
  engine.tick(0.1);
  const second = engine.mundo.forecast();
  assert.ok(second && second.entry.id !== plan.entry.id, 'a previsão seguinte não repete');
  // A festa encolheu e o previsto não cabe mais: sorteia de novo entre os que cabem.
  engine.state.mundo.nextId = 'cometa';
  engine.state.size = cfg.minSize;
  engine.state.weather.rain = null;
  engine.state.weather.rainbow = null;
  engine.state.weather.nextAt = 1e18;   // (sem chuva marcada para esse tique)
  clock.t = engine.state.mundo.nextAt + 5;
  engine.tick(0.1);
  const now = engine.state.mundo.active;
  assert.ok(now && now.id !== 'cometa' && cfg.eventos.find(entry => entry.id === now.id).minSize <= cfg.minSize);
});

test('mundo: nos dias de santo a pausa entre eventos cai pela metade (Santo Antônio, São João, São Pedro), nos outros dias não', () => {
  const span = (date, size = 100) => {
    const clock = { t: date.getTime() };
    const engine = new GameEngine(data, null, { rng: () => 0.5, now: () => clock.t });
    engine.state.size = engine.state.records.size = size;
    return engine.mundo.span();
  };
  const normal = span(new Date(2026, 10, 14, 12));
  assert.equal(normal, (cfg.every[0] + (cfg.every[1] - cfg.every[0]) * 0.5) * 1000);
  for (const [month, day] of [[5, 13], [5, 24], [5, 29]]) assert.equal(span(new Date(2026, month, day, 12)), normal / 2, `${day}/${month + 1}`);
  // Os outros dias especiais (Namorados, mês de julho) seguem o ritmo normal.
  assert.equal(span(new Date(2026, 5, 12, 12)), normal, 'Dia dos Namorados');
  assert.equal(span(new Date(2026, 6, 10, 12)), normal, 'julho');
});

test('mundo: no Cruzeiro do Sul as estrelas só valem na ordem (fora dela nada é gasto) e a última traz o prêmio final', () => {
  const { engine } = newEngine(100);
  const entry = cfg.eventos.find(item => item.id === 'constelacao');
  assert.equal(entry.ordered, true);
  engine.mundo.start('constelacao');
  engine.drainEvents();
  // Fora de ordem: recusa, diz qual é a próxima, e não conta como pega.
  assert.deepEqual(engine.mundo.catchTarget(2), { ok: false, reason: 'order', id: 'constelacao', next: 0 });
  assert.deepEqual(engine.mundo.catchTarget(4), { ok: false, reason: 'order', id: 'constelacao', next: 0 });
  assert.deepEqual(engine.state.mundo.active.got, []);
  assert.equal(engine.state.mundo.caught.constelacao || 0, 0);
  assert.deepEqual(engine.drainEvents().filter(event => event.type === 'mundo-pego'), []);
  assert.equal(engine.mundo.catchTarget(0).ok, true);
  assert.deepEqual(engine.mundo.catchTarget(0), { ok: false, reason: 'taken' }, 'repetir a mesma é "já pega"');
  assert.deepEqual(engine.mundo.catchTarget(3), { ok: false, reason: 'order', id: 'constelacao', next: 1 });
  const before = engine.state.tickets;
  for (const k of [1, 2, 3]) assert.equal(engine.mundo.catchTarget(k).ok, true, `estrela ${k}`);
  const last = engine.mundo.catchTarget(4);
  assert.equal(last.ok, true);
  assert.equal(last.all, true);
  assert.equal(last.finale.tickets, entry.finale.tickets);
  assert.ok(engine.state.tickets >= before + entry.finale.tickets);
  assert.deepEqual(engine.state.mundo.active.got, [0, 1, 2, 3, 4]);
  // Os outros eventos continuam valendo em qualquer ordem.
  const other = newEngine(100).engine;
  other.mundo.start('estrelas');
  assert.equal(other.mundo.catchTarget(3).ok, true);
});

test('mundo: na pinhata cada alvo aguenta vários golpes (nada é pago até o último), cada golpe avisa e a pinhata estourada não leva outro', () => {
  const { engine } = newEngine(100);
  const entry = cfg.eventos.find(item => item.id === 'pinhata');
  assert.ok(entry.hits >= 3);
  engine.mundo.start('pinhata');
  engine.drainEvents();
  const tickets = engine.state.tickets;
  for (let n = 1; n < entry.hits; n++) {
    assert.deepEqual(engine.mundo.catchTarget(1), { ok: true, partial: true, id: 'pinhata', k: 1, n, of: entry.hits });
    assert.deepEqual(engine.state.mundo.active.got, [], 'nada pego ainda');
  }
  assert.equal(engine.state.tickets, tickets, 'nada pago antes do último golpe');
  assert.equal(engine.state.mundo.caught.pinhata || 0, 0);
  const events = engine.drainEvents();
  assert.deepEqual(events.filter(event => event.type === 'mundo-golpe').map(event => [event.k, event.n, event.of]), Array.from({ length: entry.hits - 1 }, (_, i) => [1, i + 1, entry.hits]));
  assert.deepEqual(events.filter(event => event.type === 'mundo-pego'), []);
  // As outras pinhatas contam os golpes separado.
  assert.equal(engine.mundo.catchTarget(0).partial, true);
  assert.deepEqual(engine.state.mundo.active.hits, { 0: 1, 1: entry.hits - 1 });
  // O último golpe paga uma vez só e a pinhata fica estourada.
  const last = engine.mundo.catchTarget(1);
  assert.equal(last.ok, true);
  assert.equal(last.partial, undefined);
  assert.deepEqual(engine.state.mundo.active.got, [1]);
  assert.ok(last.given.tickets >= 1 && last.given.cheer > 0, 'pagou o prêmio da pinhata');
  assert.equal(engine.state.mundo.caught.pinhata, 1);
  assert.equal(engine.state.mundo.active.hits[1], undefined, 'a conta de golpes dela acabou');
  assert.deepEqual(engine.mundo.catchTarget(1), { ok: false, reason: 'taken' });
  // Estourando as três, vem o prêmio final.
  grab(engine, 0);
  const all = grab(engine, 2);
  assert.equal(all.all, true);
  assert.equal(all.finale.tickets, entry.finale.tickets);
  // Um evento novo começa sem golpes.
  engine.state.mundo.active = null;
  engine.mundo.start('pinhata');
  assert.deepEqual(engine.state.mundo.active.hits, {});
  // Os outros eventos nunca respondem "parcial".
  const other = newEngine(100).engine;
  other.mundo.start('estrelas');
  assert.equal(other.mundo.catchTarget(0).partial, undefined);
});

test('mundo: as correntes ligam eventos que existem, sem laço consigo mesmo, e os dias especiais só reforçam eventos que existem', () => {
  const ids = new Set(cfg.eventos.map(entry => entry.id));
  for (const [from, link] of Object.entries(cfg.chains)) {
    assert.ok(ids.has(from) && ids.has(link.id), `${from} -> ${link.id}`);
    assert.notEqual(from, link.id);
    assert.ok(link.chance > 0 && link.chance < 1 && link.delay >= 3 && link.delay <= 30, `${from}: chance e espera`);
  }
  const days = new Set(data.config.specialDays.map(day => day.id));
  for (const [day, rule] of Object.entries(cfg.dayBoost)) {
    assert.ok(days.has(day), `${day} é um dia especial do jogo`);
    assert.ok(rule.x > 1 && rule.ids.length >= 2, `${day}: reforço`);
    for (const id of rule.ids) assert.ok(ids.has(id), `${day}: ${id}`);
  }
});

test('mundo: um evento puxa o outro (o calorão chama o temporal), o seguinte aparece na previsão e começa na hora; sem sorte ou sem tamanho, nada é puxado', () => {
  const link = cfg.chains.calorao;
  // Com sorte: o seguinte já está marcado para `delay` segundos depois e começa quando chega a hora.
  const lucky = (() => {
    const clock = { t: 1_700_000_000_000 };
    const engine = new GameEngine(data, null, { rng: () => 0, now: () => clock.t });
    engine.state.size = engine.state.records.size = 100;
    engine.state.weather.nextAt = 1e18;
    return { engine, clock };
  })();
  lucky.engine.mundo.start('calorao');
  lucky.clock.t += cfg.eventos.find(entry => entry.id === 'calorao').seconds * 1000 + 1;
  lucky.engine.tick(0.1);
  assert.equal(lucky.engine.state.mundo.active, null);
  assert.equal(lucky.engine.state.mundo.nextId, link.id);
  assert.equal(lucky.engine.state.mundo.nextAt, lucky.clock.t + link.delay * 1000);
  assert.equal(lucky.engine.mundo.forecast().entry.id, link.id, 'a previsão já mostra o seguinte');
  lucky.clock.t += link.delay * 1000 + 5;
  lucky.engine.tick(0.1);
  assert.equal(lucky.engine.state.mundo.active.id, link.id, 'o temporal chegou logo depois do calorão');
  // Sem sorte: o sorteio normal marca a próxima hora (longe, de 15 a 30 minutos).
  const { engine, clock } = newEngine(100, 0.99);
  engine.mundo.start('calorao');
  clock.t += 1000 * cfg.eventos.find(entry => entry.id === 'calorao').seconds + 1;
  engine.tick(0.1);
  assert.ok(engine.state.mundo.nextAt >= clock.t + cfg.every[0] * 1000 - 1000, 'sem corrente, a pausa é a normal');
  // Festa pequena demais para o seguinte (granizo -> neve pede mais convidados): nada é puxado.
  const small = new GameEngine(data, null, { rng: () => 0, now: () => clock.t });
  small.state.size = small.state.records.size = cfg.eventos.find(entry => entry.id === 'neve').minSize - 1;
  small.mundo.start('granizo');
  clock.t += 1000 * cfg.eventos.find(entry => entry.id === 'granizo').seconds + 1;
  small.tick(0.1);
  assert.notEqual(small.state.mundo.nextId, 'neve');
  assert.ok(small.state.mundo.nextAt >= clock.t + cfg.every[0] * 1000 - 1000, 'a pausa normal');
  // Evento sem corrente (o cometa) nunca puxa nada.
  const alone = newEngine(100, 0).engine;
  alone.mundo.start('cometa');
  alone.mundo.end();
  assert.ok(alone.state.mundo.nextAt - alone.now() >= cfg.every[0] * 1000 - 1000);
});

test('mundo: no dia de São João os eventos da época pesam mais no sorteio (e nos outros dias não), e a tela marca quais', () => {
  const tally = date => {
    let roll = 0;
    const engine = new GameEngine(data, null, { rng: () => roll, now: () => date.getTime() });
    engine.state.size = engine.state.records.size = 200;
    const counts = {};
    for (let i = 0; i < 4000; i++) {
      roll = (i + 0.5) / 4000;
      const id = engine.mundo.pick();
      counts[id] = (counts[id] || 0) + 1;
    }
    return counts;
  };
  const normal = tally(new Date(2026, 10, 14, 12));
  const joao = tally(new Date(2026, 5, 24, 12));
  const pedro = tally(new Date(2026, 5, 29, 12));
  for (const id of cfg.dayBoost.joao.ids) assert.ok(joao[id] > normal[id] * 1.8, `${id}: mais comum no São João (${joao[id]} contra ${normal[id]})`);
  assert.ok(joao.estrelas < normal.estrelas, 'o que não é da época fica menos comum');
  for (const id of cfg.dayBoost.pedro.ids) assert.ok(pedro[id] > normal[id] * 1.8, `${id}: mais comum em São Pedro`);
  assert.ok(pedro.fogos < normal.fogos);
  // O multiplicador do dia, para a tela.
  const today = new GameEngine(data, null, { rng: () => 0.5, now: () => new Date(2026, 5, 24, 12).getTime() });
  assert.equal(today.mundo.boost(cfg.eventos.find(entry => entry.id === 'fogos')), 3);
  assert.equal(today.mundo.boost(cfg.eventos.find(entry => entry.id === 'estrelas')), 1);
  assert.equal(newEngine(100).engine.mundo.boost(cfg.eventos.find(entry => entry.id === 'fogos')), 1, 'num dia comum nada é reforçado');
});

test('mundo: pegar todos os alvos conta o evento como completo (uma vez por vez) e o save guarda isso', () => {
  const { engine } = newEngine(100);
  assert.deepEqual(engine.state.mundo.done, {});
  engine.mundo.start('estrelas');
  engine.mundo.catchTarget(0);
  assert.deepEqual(engine.state.mundo.done, {}, 'um alvo só não completa');
  for (let k = 1; k < 8; k++) engine.mundo.catchTarget(k);
  assert.deepEqual(engine.state.mundo.done, { estrelas: 1 });
  assert.equal(engine.mundo.doneKinds(), 1);
  engine.state.mundo.active = null;
  engine.mundo.start('estrelas');
  for (let k = 0; k < 8; k++) engine.mundo.catchTarget(k);
  assert.equal(engine.state.mundo.done.estrelas, 2, 'cada vez completa conta');
  engine.state.mundo.active = null;
  engine.mundo.start('lua');
  engine.mundo.catchTarget(0);
  assert.equal(engine.state.mundo.done.lua, undefined, 'incompleto não conta');
  const saved = JSON.parse(JSON.stringify(engine.exportState()));
  const back = new GameEngine(data, saved, { rng: () => 0.5, now: () => engine.now() });
  assert.deepEqual(back.state.mundo.done, { estrelas: 2 });
  // Save mexido: contagem negativa, texto, tipo que não existe.
  const bad = JSON.parse(JSON.stringify(saved));
  bad.mundo.done = { estrelas: -4, lua: 'x', inventado: 9, ventania: 3.9 };
  assert.deepEqual(new GameEngine(data, bad, { rng: () => 0.5, now: () => engine.now() }).state.mundo.done, { ventania: 3 });
});

test('mundo: as conquistas de completar (12 tipos), pinhata (9), Cruzeiro do Sul (3 vezes) e feira (10 compras) abrem na conta certa e uma vez só', () => {
  const have = id => engine.state.achievements.filter(item => item === id).length;
  const { engine } = newEngine(200);
  engine.state.tickets = 1e6;
  const finish = id => { engine.state.mundo.active = null; engine.mundo.start(id); const entry = cfg.eventos.find(item => item.id === id); for (let k = 0; k < entry.targets; k++) grab(engine, k); };
  // Completar 12 tipos diferentes (a de completar abre no 12º, não antes).
  const kinds = cfg.eventos.filter(entry => entry.targets && entry.id !== 'constelacao' && entry.id !== 'feira').slice(0, cfg.completeKinds);
  assert.deepEqual(engine.achievementProgress('ceu-completo'), [0, cfg.completeKinds]);
  kinds.slice(0, -1).forEach(entry => finish(entry.id));
  assert.equal(have('ceu-completo'), 0);
  assert.deepEqual(engine.achievementProgress('ceu-completo'), [cfg.completeKinds - 1, cfg.completeKinds]);
  finish(kinds.at(-1).id);
  assert.equal(have('ceu-completo'), 1);
  finish(kinds[0].id);
  assert.equal(have('ceu-completo'), 1, 'uma vez só');
  // A pinhata: nove estouradas (cada evento tem 3).
  assert.deepEqual(engine.achievementProgress('mestre-da-pinhata'), [Math.min(engine.state.mundo.caught.pinhata || 0, 9), 9]);
  const burst = engine.state.mundo.caught.pinhata || 0;
  finish('pinhata');
  finish('pinhata');
  assert.equal(engine.state.mundo.caught.pinhata, burst + 6, 'três pinhatas por evento');
  assert.equal(have('mestre-da-pinhata'), 0);
  assert.deepEqual(engine.achievementProgress('mestre-da-pinhata'), [burst + 6, 9]);
  finish('pinhata');
  assert.equal(have('mestre-da-pinhata'), 1);
  // O Cruzeiro do Sul: três vezes inteiro.
  finish('constelacao');
  finish('constelacao');
  assert.equal(have('astronomo'), 0);
  assert.deepEqual(engine.achievementProgress('astronomo'), [2, 3]);
  finish('constelacao');
  assert.equal(have('astronomo'), 1);
  // A feira: dez compras (cada barraca de cada feira).
  assert.equal(have('fregues-da-feira'), 0);
  for (let i = 0; i < 3; i++) finish('feira');
  assert.deepEqual(engine.achievementProgress('fregues-da-feira'), [9, 10]);
  assert.equal(have('fregues-da-feira'), 0);
  engine.state.mundo.active = null;
  engine.mundo.start('feira');
  engine.mundo.catchTarget(0);
  assert.equal(have('fregues-da-feira'), 1);
});

test('mundo: a chuva de fichas é rápida (muitos alvos em pouco tempo), rara, só em festa grande, e o tesouro às vezes a chama', () => {
  const entry = cfg.eventos.find(item => item.id === 'fichas');
  assert.ok(entry.seconds <= 30 && entry.targets >= 12, 'curta e cheia de alvos');
  assert.ok(entry.minSize >= 50 && entry.weight === 1);
  assert.equal(cfg.chains.tesouro.id, 'fichas');
  const { engine } = newEngine(100);
  const before = engine.state.tickets;
  engine.mundo.start('fichas');
  for (let k = 0; k < entry.targets; k++) grab(engine, k);
  assert.equal(engine.state.tickets, before + entry.targets * entry.reward.tickets + entry.finale.tickets, 'uma ficha por alvo e o prêmio final');
  // Numa festa pequena ela não entra no sorteio.
  const ids = new Set();
  let n = 0;
  const e2 = new GameEngine(data, null, { rng: () => (n++ % 100) / 100, now: () => 1_700_000_000_000 });
  e2.state.size = e2.state.records.size = entry.minSize - 1;
  for (let i = 0; i < 100; i++) { e2.state.mundo.last = ''; ids.add(e2.mundo.pick()); }
  assert.ok(!ids.has('fichas'), 'festa pequena não sorteia fichas');
});

test('mundo: o aviso "em breve" só aparece nos últimos segundos antes do evento previsto (e nunca com um evento no ar)', () => {
  const { engine, clock } = newEngine(100);
  assert.equal(engine.mundo.soon(), null, 'sem hora marcada');
  tick(engine, clock, 1);
  const plan = engine.mundo.forecast();
  assert.ok(plan);
  assert.equal(engine.mundo.soon(), null, 'ainda falta muito');
  clock.t = plan.at - cfg.soon * 1000 - 1000;
  assert.equal(engine.mundo.soon(), null, 'um segundo antes do limite');
  clock.t = plan.at - cfg.soon * 1000 + 1000;
  assert.equal(engine.mundo.soon().entry.id, plan.entry.id, 'entrou na janela do aviso');
  clock.t = plan.at - 2000;
  assert.equal(engine.mundo.soon().entry.id, plan.entry.id);
  // Com um evento no ar não há aviso do próximo.
  engine.state.mundo.nextAt = clock.t + 5000;
  engine.state.mundo.nextId = 'cometa';
  engine.mundo.start('estrelas');
  assert.equal(engine.mundo.soon(), null);
  // O encadeamento também avisa (o seguinte vem em poucos segundos).
  const lucky = new GameEngine(data, null, { rng: () => 0, now: () => clock.t });
  lucky.state.size = lucky.state.records.size = 100;
  lucky.state.weather.nextAt = 1e18;
  lucky.mundo.start('poente');
  clock.t += cfg.eventos.find(entry => entry.id === 'poente').seconds * 1000 + 1;
  lucky.tick(0.1);
  assert.equal(lucky.mundo.soon().entry.id, cfg.chains.poente.id, 'depois do pôr do sol vem a lua, e já avisa');
});

test('almanaque: a raridade vem do peso do sorteio e os raros pagam bem mais que os comuns', () => {
  const { engine } = newEngine();
  const byRarity = { common: [], uncommon: [], rare: [] };
  for (const entry of cfg.eventos) byRarity[engine.mundo.rarity(entry)].push(entry);
  assert.equal(byRarity.common.length + byRarity.uncommon.length + byRarity.rare.length, cfg.eventos.length);
  assert.deepEqual(byRarity.rare.map(entry => entry.id), ['eclipse', 'boitata', 'ovni', 'neve', 'cheia', 'sapos', 'fichas', 'cometa']);
  assert.ok(byRarity.rare.every(entry => entry.weight === 1) && byRarity.common.every(entry => entry.weight >= 3));
  // O prêmio final de cada raro (fichas + animação/10 + carinho + lenha + barriga) vale pelo menos o dobro do de um evento comum.
  const worth = entry => { const f = entry.finale || {}; return (f.tickets || 0) + (f.cheer || 0) / 25 + (f.love || 0) + (f.wood || 0) + (f.belly || 0) / 4; };
  const common = byRarity.common.map(worth).sort((a, b) => a - b);
  const medianCommon = common[Math.floor(common.length / 2)];
  for (const entry of byRarity.rare) assert.ok(worth(entry) >= 2 * medianCommon, `${entry.id}: ${worth(entry)} contra ${medianCommon} dos comuns`);
  assert.ok(Object.keys(cfg.eventos.find(entry => entry.id === 'cometa').finale).length > 0, 'o cometa também tem prêmio final');
  assert.ok(cfg.eventos.find(entry => entry.id === 'fichas').finale.tickets >= 20);
});

test('almanaque: uma linha por evento com o que passou, a raridade, se já cabe na festa e as dicas de onde vem', () => {
  const { engine } = newEngine(20);
  let rows = engine.mundo.almanac();
  assert.deepEqual(rows.map(row => row.entry.id), cfg.eventos.map(entry => entry.id));
  assert.ok(rows.every(row => row.seen === 0 && row.caught === 0 && row.done === 0));
  const row = id => rows.find(entry => entry.entry.id === id);
  assert.equal(row('estrelas').unlocked, true);
  assert.equal(row('estrelas').needs, 0);
  assert.equal(row('eclipse').unlocked, false);
  assert.equal(row('eclipse').needs, 15, 'faltam 35 - 20 convidados');
  assert.equal(row('eclipse').rarity, 'rare');
  assert.equal(row('estrelas').rarity, 'common');
  assert.equal(row('lua').rarity, 'uncommon');
  // De onde vem: só conta quem puxa o evento se esse já passou; os dias de santo e o Dia dos Namorados favorecem eventos próprios.
  assert.deepEqual(row('temporal').via, []);
  engine.state.mundo.seen.calorao = 1;
  rows = engine.mundo.almanac();
  assert.deepEqual(row('temporal').via, ['calorao']);
  assert.deepEqual(row('fogos').days, ['joao']);
  assert.deepEqual(row('estrelas').days, ['namorados']);
  assert.deepEqual(row('lua').days, ['namorados']);
  assert.deepEqual(row('pipoca').days, []);
  // O que já passou, o que foi pego e quantas vezes foi completo.
  engine.state.mundo.seen.estrelas = 3;
  engine.state.mundo.caught.estrelas = 17;
  engine.state.mundo.done.estrelas = 2;
  rows = engine.mundo.almanac();
  assert.deepEqual([row('estrelas').seen, row('estrelas').caught, row('estrelas').done], [3, 17, 2]);
  const info = engine.mundo.info();
  assert.equal(info.rareKinds, 8);
  assert.equal(info.rareSeen, 0);
  assert.equal(info.doneKinds, 1);
  engine.state.mundo.seen.cometa = 1;
  engine.state.mundo.seen.eclipse = 1;
  assert.equal(engine.mundo.info().rareSeen, 2);
  engine.state.size = 60;
  assert.equal(engine.mundo.almanac().find(entry => entry.entry.id === 'eclipse').unlocked, true);
});
