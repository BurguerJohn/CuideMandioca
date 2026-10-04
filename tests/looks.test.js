const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../src/data.js');
const { GameEngine } = require('../src/core.js');

const cfg = data.looks;
const SLOTS = ['chapeu', 'mao', 'tecido', 'terreiro', 'esquerda', 'direita', 'varal'];

function newEngine(rngValue = 0.5, saved = null) {
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(data, saved, { rng: typeof rngValue === 'function' ? rngValue : () => rngValue, now: () => clock.t });
  return { engine, clock };
}

// Uma pessoa com algumas peças de cada espaço.
function wardrobe(engine) {
  for (const id of ['vaqueiro', 'espiga', 'chita', 'gramado', 'espantalho', 'carroca', 'varal-azul', 'chapeu-bruxa', 'vassoura-bruxa', 'teias-aboboras', 'cemiterio', 'caldeirao-canjica', 'varal-chita']) engine.addItem(id);
  return engine;
}

test('guarda-roupa: começa vazio, o visual de agora é o equipado e a configuração tem o limite', () => {
  const { engine } = newEngine();
  assert.deepEqual(engine.state.looks, { list: [], seq: 0 });
  assert.deepEqual(engine.looks.current(), engine.state.equipped);
  assert.deepEqual(Object.keys(engine.looks.current()), SLOTS);
  assert.deepEqual(engine.looks.info(), { list: [], count: 0, max: cfg.max, full: false });
  assert.ok(cfg.max >= 6 && cfg.achievementAt >= 3 && cfg.achievementAt <= cfg.max);
});

test('guarda-roupa: salvar guarda o visual de agora com nome (dado, do conjunto ou "Look N"), recusa repetido e cheio, e avisa', () => {
  const { engine } = newEngine();
  wardrobe(engine);
  engine.drainEvents();
  const first = engine.looks.save();
  assert.equal(first.ok, true);
  assert.equal(first.look.name, 'Look 1');
  assert.equal(first.look.id, 'look-1');
  assert.deepEqual(first.look.pieces, engine.state.equipped);
  assert.deepEqual(engine.drainEvents().filter(event => event.type === 'look').map(event => [event.kind, event.id, event.name]), [['saved', 'look-1', 'Look 1']]);
  // O mesmo visual de novo: recusa e diz qual look é.
  assert.deepEqual(engine.looks.save(), { ok: false, reason: 'same', id: 'look-1', name: 'Look 1' });
  // Nome dado: aparado e com no máximo 24 letras.
  engine.equip('vaqueiro');
  const named = engine.looks.save('   Meu visual de São João muito comprido mesmo   ');
  assert.equal(named.look.name.length, 24);
  assert.equal(named.look.name, 'Meu visual de São João m');
  // Com um conjunto valendo, o nome é o do conjunto.
  engine.equip('espiga');
  engine.equip('chita');
  const set = engine.activeSet();
  assert.ok(!set || set.fabric === 'chita');
  engine.equip('chapeu-bruxa');
  engine.equip('vassoura-bruxa');
  engine.equip('teias-aboboras');
  assert.equal(engine.activeSet().id, 'bruxa');
  assert.equal(engine.looks.save().look.name, 'Bruxa da Festa');
  assert.deepEqual(engine.state.looks.list.map(look => look.id), ['look-1', 'look-2', 'look-3']);
  // Cheio: recusa e diz o limite.
  const full = newEngine().engine;
  wardrobe(full);
  const items = full.data.items.filter(item => item.cat === 'varal' && full.owned(item.id));
  for (let i = 0; i < cfg.max; i++) {
    full.state.equipped.varal = items[i % items.length].id;
    full.state.equipped.chapeu = ['vaqueiro', 'chapeu-bruxa', 'chapeu-palha', 'palha-furada'][Math.floor(i / items.length) % 4];
    assert.equal(full.looks.save().ok, true, `look ${i + 1}`);
  }
  assert.equal(full.looks.info().full, true);
  full.state.equipped.chapeu = 'lenco-chita';
  full.addItem('lenco-chita');
  assert.deepEqual(full.looks.save(), { ok: false, reason: 'full', max: cfg.max });
  assert.equal(full.state.looks.list.length, cfg.max);
});

test('guarda-roupa: vestir devolve cada peça ao lugar (os dois cenários dos lados também) e diz o que faltou', () => {
  const { engine } = newEngine();
  wardrobe(engine);
  engine.equip('vaqueiro');
  engine.equip('espiga');
  engine.equip('chita');
  engine.equip('gramado');
  engine.equip('varal-azul');
  engine.equip('carroca', 'esquerda');
  engine.equip('espantalho', 'direita');
  const saved = engine.looks.save('Roça').look;
  assert.equal(engine.looks.isWorn(saved), true);
  // Muda tudo e volta com um clique.
  engine.equip('chapeu-bruxa');
  engine.equip('vassoura-bruxa');
  engine.equip('teias-aboboras');
  engine.equip('cemiterio');
  engine.equip('varal-chita');
  engine.equip('caldeirao-canjica', 'esquerda');
  engine.equip('fardo', 'direita');
  assert.equal(engine.looks.isWorn(saved), false);
  engine.drainEvents();
  const result = engine.looks.wear(saved.id);
  assert.equal(result.ok, true);
  assert.equal(result.worn, 7);
  assert.deepEqual(result.lacking, []);
  assert.deepEqual(engine.state.equipped, saved.pieces);
  assert.equal(engine.state.equipped.esquerda, 'carroca');
  assert.equal(engine.state.equipped.direita, 'espantalho');
  assert.equal(engine.looks.isWorn(saved), true);
  assert.deepEqual(engine.drainEvents().filter(event => event.type === 'look').map(event => [event.kind, event.worn]), [['worn', 7]]);
  // O mesmo cenário nos dois lados continua do jeito que o look mandou.
  engine.state.looks.list[0].pieces.esquerda = 'espantalho';
  engine.state.looks.list[0].pieces.direita = 'carroca';
  engine.looks.wear(saved.id);
  assert.deepEqual([engine.state.equipped.esquerda, engine.state.equipped.direita], ['espantalho', 'carroca']);
  // Peça que a pessoa não tem: o resto veste e a falta é avisada.
  engine.state.looks.list[0].pieces.chapeu = 'capuz-dino';
  const partial = engine.looks.wear(saved.id);
  assert.equal(partial.ok, true);
  assert.deepEqual(partial.lacking, ['capuz-dino']);
  assert.equal(partial.worn, 6);
  assert.notEqual(engine.state.equipped.chapeu, 'capuz-dino');
  assert.deepEqual(engine.looks.missing(engine.state.looks.list[0]), ['capuz-dino']);
  assert.deepEqual(engine.looks.wear('nao-existe'), { ok: false, reason: 'none' });
});

test('guarda-roupa: apagar tira o look (e só ele) e avisa', () => {
  const { engine } = newEngine();
  wardrobe(engine);
  engine.looks.save();
  engine.equip('vaqueiro');
  engine.looks.save();
  engine.drainEvents();
  const gone = engine.looks.remove('look-1');
  assert.equal(gone.ok, true);
  assert.deepEqual(engine.state.looks.list.map(look => look.id), ['look-2']);
  assert.deepEqual(engine.drainEvents().filter(event => event.type === 'look').map(event => [event.kind, event.id]), [['deleted', 'look-1']]);
  assert.deepEqual(engine.looks.remove('look-1'), { ok: false, reason: 'none' });
  // O próximo look continua a numeração (não repete o id apagado).
  engine.equip('chapeu-bruxa');
  assert.equal(engine.looks.save().look.id, 'look-3');
});

test('guarda-roupa: o look surpresa veste peças sorteadas das que a pessoa tem (só das que tem, cenários diferentes nos dois lados)', () => {
  const { engine } = newEngine(() => 0);
  wardrobe(engine);
  const owned = cat => data.items.filter(item => item.cat === cat && engine.owned(item.id)).map(item => item.id);
  engine.drainEvents();
  const first = engine.looks.random();
  assert.equal(first.ok, true);
  // Com o sorteio no começo da lista vem a primeira peça de cada espaço.
  for (const [slot, cat] of [['chapeu', 'chapeu'], ['mao', 'mao'], ['tecido', 'tecido'], ['terreiro', 'terreiro'], ['varal', 'varal']]) assert.equal(engine.state.equipped[slot], owned(cat)[0], slot);
  assert.equal(engine.state.equipped.esquerda, owned('lado')[0]);
  assert.equal(engine.state.equipped.direita, owned('lado')[1], 'o outro lado é outro cenário');
  assert.deepEqual(engine.drainEvents().filter(event => event.type === 'look').map(event => event.kind), ['random']);
  // Com o sorteio no fim da lista vem a última.
  const last = newEngine(() => 0.999999).engine;
  wardrobe(last);
  last.looks.random();
  const lastOwned = cat => data.items.filter(item => item.cat === cat && last.owned(item.id)).map(item => item.id);
  assert.equal(last.state.equipped.chapeu, lastOwned('chapeu').at(-1));
  assert.equal(last.state.equipped.esquerda, lastOwned('lado').at(-1));
  assert.notEqual(last.state.equipped.direita, last.state.equipped.esquerda);
  // Tudo o que veste é da pessoa e da categoria certa.
  for (const slot of SLOTS) assert.ok(last.owned(last.state.equipped[slot]), slot);
  // Sem peça nenhuma além das iniciais, o look surpresa não inventa nada.
  const poor = newEngine(() => 0.7).engine;
  const before = JSON.stringify(poor.state.equipped);
  poor.looks.random();
  for (const slot of SLOTS) assert.ok(poor.owned(poor.state.equipped[slot]), `${slot}: da pessoa`);
  assert.equal(poor.state.equipped.terreiro, JSON.parse(before).terreiro, 'só tem um chão');
});

test('guarda-roupa: a conquista abre ao salvar o 5º look (uma vez só) e o progresso conta os looks', () => {
  const { engine } = newEngine();
  wardrobe(engine);
  assert.deepEqual(engine.achievementProgress('guarda-roupa'), [0, cfg.achievementAt]);
  const hats = ['vaqueiro', 'chapeu-bruxa', 'palha-furada', 'chapeu-palha', 'lenco-chita', 'coroa-flores'];
  for (const id of ['lenco-chita', 'coroa-flores', 'palha-furada']) engine.addItem(id);
  for (let i = 0; i < cfg.achievementAt - 1; i++) { engine.equip(hats[i]); assert.equal(engine.looks.save().ok, true); }
  assert.equal(engine.state.achievements.includes('guarda-roupa'), false);
  assert.deepEqual(engine.achievementProgress('guarda-roupa'), [cfg.achievementAt - 1, cfg.achievementAt]);
  engine.equip(hats[cfg.achievementAt - 1]);
  engine.looks.save();
  assert.equal(engine.state.achievements.filter(id => id === 'guarda-roupa').length, 1);
  engine.equip(hats[cfg.achievementAt]);
  engine.looks.save();
  assert.equal(engine.state.achievements.filter(id => id === 'guarda-roupa').length, 1, 'uma vez só');
});

test('guarda-roupa: o save guarda os looks (e passam de um São João para o outro); save mexido não inventa peça, nome nem look', () => {
  const { engine, clock } = newEngine();
  wardrobe(engine);
  engine.looks.save('Roça');
  engine.equip('chapeu-bruxa');
  engine.looks.save();
  const saved = JSON.parse(JSON.stringify(engine.exportState()));
  const back = new (require('../src/core.js').GameEngine)(data, saved, { rng: () => 0.5, now: () => clock.t });
  assert.deepEqual(back.state.looks, engine.state.looks);
  // Passa de ano.
  back.state.size = back.state.records.size = 120;
  assert.equal(back.newYear(), true);
  assert.deepEqual(back.state.looks, engine.state.looks, 'o guarda-roupa não esvazia com o ano novo');
  // Save mexido.
  const bad = JSON.parse(JSON.stringify(saved));
  bad.looks = { seq: 'x', list: [
    { id: 'look-5', name: '   ', pieces: { chapeu: 'vaqueiro', mao: 'chapeu-palha', tecido: 'nao-existe', terreiro: 3, esquerda: 'espantalho', direita: 'tablado', varal: null } },
    { id: 'look-5', name: 'repetido', pieces: { chapeu: 'vaqueiro' } },
    { id: 'lixo', name: 'x', pieces: { chapeu: 'vaqueiro' } },
    { id: 'look-6', name: 'vazio', pieces: { chapeu: 'nao-existe' } },
    { id: 'look-7', name: 'n'.repeat(80), pieces: { chapeu: 'chapeu-bruxa' } },
    null, 7, 'x'
  ] };
  const odd = new (require('../src/core.js').GameEngine)(data, bad, { rng: () => 0.5, now: () => clock.t });
  assert.deepEqual(odd.state.looks.list.map(look => look.id), ['look-5', 'look-7']);
  assert.equal(odd.state.looks.list[0].name, 'Look 1', 'sem nome vira "Look N"');
  assert.deepEqual(odd.state.looks.list[0].pieces, { chapeu: 'vaqueiro', mao: null, tecido: null, terreiro: null, esquerda: 'espantalho', direita: null, varal: null },
    'peça de outra categoria, que não existe ou que não é texto vira vazia');
  assert.equal(odd.state.looks.list[1].name.length, 24);
  assert.equal(odd.state.looks.seq, 7, 'o contador nunca fica atrás do maior id');
  assert.equal(odd.looks.save().look.id, 'look-8');
  for (const raw of [null, 7, 'x', {}, { list: 5 }, { list: 'x' }]) {
    const copy = JSON.parse(JSON.stringify(saved));
    copy.looks = raw;
    assert.deepEqual(new (require('../src/core.js').GameEngine)(data, copy, { rng: () => 0.5, now: () => clock.t }).state.looks, { list: [], seq: 0 });
  }
  // Mais looks do que cabem: só os primeiros.
  const many = JSON.parse(JSON.stringify(saved));
  many.looks = { seq: 0, list: Array.from({ length: cfg.max + 5 }, (_, i) => ({ id: `look-${i + 1}`, name: `L${i}`, pieces: { chapeu: 'vaqueiro' } })) };
  assert.equal(new (require('../src/core.js').GameEngine)(data, many, { rng: () => 0.5, now: () => clock.t }).state.looks.list.length, cfg.max);
});
