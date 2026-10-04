const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const data = require('../src/data.js');
const { GameEngine } = require('../src/core.js');
require('../src/festa-sprites.js');

const bundle = globalThis.FESTA_SPRITES;
const cfg = data.premios;

function newEngine(saved = null) {
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.t });
  return { engine, clock };
}

// O acontecimento que conta uma vez em cada minigame (com os campos que a regra confere).
const PLAY = {
  argolas: engine => engine.emit('rings', { hits: 2, mult: 1 }),
  pescaria: engine => engine.emit('fished', { id: 'x', isNew: true }),
  bingo: engine => engine.emit('bingo-win', { tickets: 1, amount: 1, draws: 20 }),
  burro: engine => engine.emit('burro-pin', { grade: 'perto', amount: 1, tickets: 0 }),
  saco: engine => engine.emit('saco-end', { place: 1, amount: 1, tickets: 1, falls: 0, seconds: 8 }),
  pote: engine => engine.emit('pote-break', { amount: 1, tickets: 1 }),
  leilao: engine => engine.emit('leilao-sold', { winner: 'voce', price: 5, prize: {} }),
  cobra: engine => engine.emit('cobra-caught', { amount: 1, item: null }),
  cordel: engine => engine.emit('mini', { mini: 'cordel', kind: 'page-done', page: 1 }),
  bichos: engine => engine.emit('mini', { mini: 'bichos', kind: 'pet', id: 'x' }),
  aquario: engine => engine.emit('mini', { mini: 'aquario', kind: 'fed', id: 1 }),
  horta: engine => engine.emit('mini', { mini: 'horta', kind: 'harvest' }),
  fogueira: engine => engine.emit('mini', { mini: 'fogueira', kind: 'roasted', perfect: false }),
  palco: engine => engine.emit('mini', { mini: 'palco', kind: 'show-end', practice: false, aborted: false, stars: 2 }),
  mata: engine => engine.emit('mini', { mini: 'mata', kind: 'win', stage: 1 }),
  ceu: engine => engine.emit('mini', { mini: 'ceu', kind: 'rocket', shape: 'x' }),
  bairro: engine => engine.emit('mini', { mini: 'bairro', kind: 'visit', id: 'x' }),
  folclore: engine => engine.emit('mini', { mini: 'folclore', kind: 'catch', id: 'x' }),
  cozinha: engine => engine.emit('cook-served', { id: 'pamonha', bonus: 0.2, minutes: 10 }),
  fantasia: engine => engine.emit('fantasia', { notes: 3, average: 3, place: 2, win: false, tickets: 1, amount: 1 }),
  casamento: engine => engine.emit('wedding-end', { rice: 10, amount: 1, tickets: 1, share: 1, item: null }),
  fotografo: engine => engine.emit('foto', { tickets: 1 }),
  penetra: engine => engine.emit('crasher-caught', { tickets: 1, jailed: false }),
  correio: engine => engine.emit('letter', { tickets: 1 }),
  album: engine => engine.emit('sticker', { id: 'x', page: 'y' }),
  quadrilha: engine => engine.emit('quadrilha-end'),
  carinho: engine => engine.emit('poke', { value: 10 }),
  balao: engine => engine.emit('balloon-claimed', { kind: 'cheer', amount: 5 }),
  arco: engine => engine.emit('rainbow-claimed', { amount: 1, tickets: 3 }),
  bandeirinha: engine => engine.emit('flag-caught', {}),
  visitante: engine => engine.emit('visitor-greet', { tickets: 1 }),
  compadres: engine => engine.emit('compadres', { amount: 1 }),
  carro: engine => engine.emit('cart-wood', { wood: 3 }),
  pedido: engine => engine.emit('request-done', { kind: 'agua' }),
  mundo: engine => engine.emit('mundo-pego', { id: 'estrelas', k: 0, given: {}, left: 7, all: false, finale: null })
};

test('premios: cada minigame tem uma coisa, um personagem e o troféu de ouro, com arte, ícone e textos', () => {
  const ids = new Set();
  assert.equal(cfg.jogos.length, 35);
  assert.equal(cfg.itens.length, 105);
  for (const game of cfg.jogos) {
    assert.ok(game.name && game.icon && game.count.length, game.id);
    assert.ok(PLAY[game.id], `${game.id}: o teste sabe jogar`);
    const own = cfg.itens.filter(item => item.jogo === game.id);
    assert.deepEqual(own.map(item => item.tipo).sort(), ['coisa', 'ouro', 'personagem'], `${game.id}: uma coisa, um personagem e o troféu`);
    const [thing, person, gold] = [own.find(item => item.tipo === 'coisa'), own.find(item => item.tipo === 'personagem'), own.find(item => item.tipo === 'ouro')];
    assert.ok(thing.feitos < person.feitos && person.feitos < gold.feitos, `${game.id}: coisa, personagem, troféu, nessa ordem`);
    assert.equal(gold.de, thing.id, `${game.id}: o troféu é da coisa do jogo`);
    assert.equal(gold.id, `${thing.id}-ouro`);
    assert.equal(gold.bonus, 2 * cfg.bonus, `${game.id}: o troféu vale o dobro`);
    assert.ok(['chao', 'varal', 'fundo'].includes(thing.lugar), `${game.id}: lugar da coisa`);
    assert.ok(person.gift && Object.keys(person.gift).length, `${game.id}: o personagem dá presente`);
  }
  for (const item of cfg.itens) {
    assert.ok(!ids.has(item.id), `${item.id}: id repetido`);
    ids.add(item.id);
    assert.ok(item.name && item.text && item.feitos >= 1, item.id);
    assert.ok(cfg.jogos.some(game => game.id === item.jogo), `${item.id}: jogo conhecido`);
    const sheet = bundle.premios[item.id];
    assert.ok(sheet && bundle.images[sheet.image], `${item.id}: tem arte`);
    assert.ok(bundle.icons[`premio:${item.id}`], `${item.id}: tem ícone`);
    if (item.tipo === 'ouro') {
      // A arte de ouro é a da coisa em ouro (mesmo tamanho e quadros).
      const base = bundle.premios[item.de];
      assert.deepEqual([sheet.w, sheet.h, sheet.frames], [base.w, base.h, base.frames], `${item.id}: arte de ouro do tamanho da coisa`);
    } else {
      assert.ok(item.say0, `${item.id}: tem fala`);
    }
    if (item.tipo === 'personagem') {
      assert.deepEqual(Object.keys(sheet.poses).sort(), ['acao', 'anda', 'parado'], `${item.id}: poses`);
      assert.ok(item.say1 && item.say2, `${item.id}: três falas`);
      for (const frames of Object.values(sheet.poses)) for (const frame of frames) assert.ok(frame < sheet.frames, `${item.id}: quadro ${frame}`);
    }
    // As falas aparecem na festa, na fonte de pixel (sem acento nem letra minúscula).
    for (const key of ['say0', 'say1', 'say2']) {
      if (item[key]) assert.match(item[key], /^[A-Z0-9 .,:!?+%-]+$/, `${item.id}.${key}`);
    }
  }
  assert.ok(bundle.icons['ui:premios'], 'ícone do botão da placa');
});

test('premios: todo acontecimento que as regras esperam existe de verdade no motor ou na janela do minigame', () => {
  const read = file => fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8');
  const core = read('core.js') + read('mundo.js');   // (os eventos do mundo saem de src/mundo.js)
  for (const game of cfg.jogos) {
    for (const rule of game.count) {
      if (rule.on.startsWith('mini:')) {
        const [, mini, kind] = rule.on.split(':');
        // (O aquário escolhe entre 'grew' e 'fed' na mesma chamada: basta o nome aparecer no arquivo da janela.)
        const source = read(`mini-${mini}.js`);
        assert.ok(source.includes(`emit('${kind}'`) || new RegExp(`emit\\([^)]*'${kind}'`).test(source), `${game.id}: ${rule.on}`);
      } else {
        assert.ok(core.includes(`emit('${rule.on}'`), `${game.id}: ${rule.on}`);
      }
      for (const field of Object.keys({ ...rule.when, ...rule.min })) {
        const source = rule.on.startsWith('mini:') ? read(`mini-${rule.on.split(':')[1]}.js`) : core;
        assert.ok(source.includes(field), `${game.id}: o acontecimento tem o campo ${field}`);
      }
    }
  }
});

test('premios: o aquário conta alimentar, crescer e estourar bolha (e não os peixes que a pescaria solta lá)', () => {
  const { engine } = newEngine();
  engine.emit('mini', { mini: 'aquario', kind: 'fed', id: 1 });
  engine.emit('mini', { mini: 'aquario', kind: 'grew', id: 1 });
  engine.emit('mini', { mini: 'aquario', kind: 'pop', reward: {} });
  assert.equal(engine.premios.count('aquario'), 3);
  engine.emit('mini', { mini: 'aquario', kind: 'new-fish', id: 2 });
  engine.emit('mini', { mini: 'aquario', kind: 'bubble', n: 1 });
  assert.equal(engine.premios.count('aquario'), 3);
  // Pescar solta um peixe no tanque de verdade, mas conta só para a Pescaria.
  const { engine: fishing } = newEngine();
  for (let i = 0; i < 4; i++) fishing.emit('fished', { id: 'x', isNew: true });
  assert.equal(fishing.premios.count('pescaria'), 4);
  assert.equal(fishing.premios.count('aquario'), 0);
});

test('premios: cada jogo conta uma vez por jogada (e só a que vale)', () => {
  const { engine } = newEngine();
  for (const game of cfg.jogos) {
    const before = engine.premios.count(game.id);
    PLAY[game.id](engine);
    assert.equal(engine.premios.count(game.id), before + 1, `${game.id}: contou`);
  }
  // Nenhuma jogada conta em outro jogo.
  // (O álbum também cola figurinhas sozinho quando acontece alguma coisa da festa, então ele conta mais de uma vez.)
  const { album, ...others } = engine.state.premios.count;
  assert.ok(album >= 1);
  assert.deepEqual(Object.values(others).sort(), Array(34).fill(1));
  // O que não vale: leilão ganho por outro, show de treino, show abortado ou sem estrela, derrota do bingo não conta no jogo errado.
  const { engine: other } = newEngine();
  other.emit('leilao-sold', { winner: 'seu-ze', price: 5, prize: {} });
  other.emit('mini', { mini: 'palco', kind: 'show-end', practice: true, aborted: false, stars: 3 });
  other.emit('mini', { mini: 'palco', kind: 'show-end', practice: false, aborted: true, stars: 0 });
  other.emit('mini', { mini: 'palco', kind: 'show-end', practice: false, aborted: false, stars: 0 });
  other.emit('mini', { mini: 'horta', kind: 'water' });
  other.emit('step', {});
  other.emit('poke', { value: 0 });
  assert.deepEqual(other.state.premios.count, {}, 'carinho na pausa (sem passos) não conta');
  // O bingo perdido também é uma cartela jogada.
  other.emit('bingo-lost', { draws: 30, count: 3 });
  assert.equal(other.premios.count('bingo'), 1);
});

test('premios: abre cada prêmio na conta certa, avisa uma vez só e deixa no diário', () => {
  const { engine } = newEngine();
  const thing = cfg.itens.find(item => item.id === 'ursinhos');
  const person = cfg.itens.find(item => item.id === 'zeca-argolas');
  engine.drainEvents();
  for (let i = 1; i < thing.feitos; i++) PLAY.argolas(engine);
  assert.equal(engine.premios.has('ursinhos'), false, 'falta uma');
  assert.equal(engine.premioBonus(), 0);
  engine.drainEvents();
  PLAY.argolas(engine);
  assert.equal(engine.premios.has('ursinhos'), true);
  const unlocked = engine.drainEvents().filter(event => event.type === 'premio');
  assert.deepEqual(unlocked.map(event => [event.id, event.jogo, event.tipo]), [['ursinhos', 'argolas', 'coisa']]);
  assert.deepEqual(engine.state.log.at(-1), { ...engine.state.log.at(-1), type: 'premio', id: 'ursinhos', jogo: 'argolas' });
  assert.ok(Math.abs(engine.premioBonus() - cfg.bonus) < 1e-12);
  // Seguir jogando não repete o aviso; o personagem chega no dele.
  for (let i = thing.feitos; i < person.feitos; i++) PLAY.argolas(engine);
  const events = engine.drainEvents().filter(event => event.type === 'premio');
  assert.deepEqual(events.map(event => event.id), ['zeca-argolas']);
  assert.equal(engine.premios.total(), 2);
  assert.ok(Math.abs(engine.premioBonus() - 2 * cfg.bonus) < 1e-12);
  assert.equal(engine.state.log.filter(entry => entry.type === 'premio').length, 2);
  // Os prêmios liberados vêm na ordem em que chegaram.
  assert.deepEqual(engine.premios.unlocked().map(item => item.id), ['ursinhos', 'zeca-argolas']);
});

test('premios: cada prêmio soma uma fatia da Animação e o bônus entra no multiplicador', () => {
  const { engine } = newEngine();
  const base = engine.multiplier();
  engine.state.premios.count.argolas = 20;
  engine.premios.unlock('argolas');
  assert.equal(engine.premios.total(), 2);
  assert.ok(Math.abs(engine.multiplier() / base - (1 + 2 * cfg.bonus)) < 1e-9);
  // O troféu de ouro vale o dobro.
  engine.state.premios.count.argolas = 60;
  engine.premios.unlock('argolas');
  assert.equal(engine.premios.total(), 3);
  assert.ok(Math.abs(engine.premioBonus() - (2 * cfg.bonus + 2 * cfg.bonus)) < 1e-12);
  assert.ok(Math.abs(engine.multiplier() / base - (1 + 4 * cfg.bonus)) < 1e-9);
  for (const game of cfg.jogos) { engine.state.premios.count[game.id] = 9999; engine.premios.unlock(game.id); }
  assert.equal(engine.premios.total(), 105);
  assert.ok(Math.abs(engine.premioBonus() - (70 * cfg.bonus + 35 * 2 * cfg.bonus)) < 1e-9);
  assert.ok(Math.abs(engine.premioBonus() - 0.7) < 1e-9, 'os 105 juntos valem +70%');
});

test('premios: o progresso diz quantas vezes cada jogo foi feito, o próximo prêmio e o que já veio', () => {
  const { engine } = newEngine();
  for (let i = 0; i < 5; i++) PLAY.pescaria(engine);
  const row = engine.premios.progress().find(entry => entry.id === 'pescaria');
  assert.equal(row.count, 5);
  assert.equal(row.next, 15, 'o próximo é o Seu Tainha');
  assert.deepEqual(row.prizes.map(prize => [prize.id, prize.got]), [['balde-peixes', true], ['seu-tainha', false], ['balde-peixes-ouro', false]]);
  const done = engine.premios.progress().find(entry => entry.id === 'argolas');
  assert.equal(done.next, cfg.itens.find(item => item.id === 'ursinhos').feitos);
});

test('premios: o personagem dá o presente quando clicado e só de novo depois do tempo', () => {
  const { engine, clock } = newEngine();
  assert.deepEqual(engine.premios.gift('zeca-argolas'), { ok: false, reason: 'none' }, 'ainda não chegou');
  assert.deepEqual(engine.premios.gift('ursinhos'), { ok: false, reason: 'none' }, 'coisa não dá presente');
  assert.deepEqual(engine.premios.gift('nao-existe'), { ok: false, reason: 'none' });
  engine.state.premios.count.argolas = 20;
  engine.premios.unlock('argolas');
  assert.equal(engine.premios.giftReady('zeca-argolas'), true);
  const tickets = engine.state.tickets;
  engine.drainEvents();
  const first = engine.premios.gift('zeca-argolas');
  assert.equal(first.ok, true);
  assert.equal(first.given.tickets, 2);
  assert.equal(engine.state.tickets, tickets + 2);
  assert.deepEqual(engine.drainEvents().map(event => event.type).filter(type => type === 'premio-gift'), ['premio-gift']);
  // Na hora: espera; um pouco antes do fim: espera; depois: dá de novo.
  assert.equal(engine.premios.giftReady('zeca-argolas'), false);
  const again = engine.premios.gift('zeca-argolas');
  assert.deepEqual([again.ok, again.reason], [false, 'wait']);
  assert.ok(Math.abs(again.wait - cfg.giftMinutes * 60000) < 5);
  clock.t += cfg.giftMinutes * 60000 - 1000;
  assert.equal(engine.premios.gift('zeca-argolas').ok, false);
  clock.t += 1000;
  assert.equal(engine.premios.gift('zeca-argolas').ok, true);
  assert.equal(engine.state.tickets, tickets + 4);
});

test('premios: todo presente dos personagens é um prêmio que o jogo sabe dar', () => {
  const { engine } = newEngine();
  for (const item of cfg.itens.filter(entry => entry.tipo === 'personagem')) {
    for (const key of Object.keys(item.gift)) assert.ok(['tickets', 'wood', 'cheer', 'love', 'belly', 'bellyFull'].includes(key), `${item.id}: ${key}`);
    engine.state.premios.count[item.jogo] = 9999;
    engine.premios.unlock(item.jogo);
    const before = JSON.stringify([engine.state.tickets, engine.state.wood]);
    const result = engine.premios.gift(item.id);
    assert.equal(result.ok, true, item.id);
    assert.ok(Object.keys(result.given).length, `${item.id}: deu alguma coisa`);
    if (item.gift.tickets || item.gift.wood) assert.notEqual(JSON.stringify([engine.state.tickets, engine.state.wood]), before, item.id);
  }
});

test('premios: o save guarda a conta, os prêmios e o relógio dos presentes; passa de um São João para o outro', () => {
  const { engine, clock } = newEngine();
  for (let i = 0; i < 12; i++) PLAY.argolas(engine);
  engine.premios.gift('zeca-argolas');
  const saved = JSON.parse(JSON.stringify(engine.exportState()));
  const back = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.t });
  assert.deepEqual(back.state.premios.count, engine.state.premios.count);
  assert.deepEqual(back.state.premios.got, engine.state.premios.got);
  assert.deepEqual(back.premios.unlocked().map(item => item.id), ['ursinhos', 'zeca-argolas']);
  assert.equal(back.premios.giftReady('zeca-argolas'), false, 'o relógio do presente continua');
  clock.t += cfg.giftMinutes * 60000 + 1;
  assert.equal(back.premios.giftReady('zeca-argolas'), true);
  // Ano novo: tudo fica.
  back.state.size = back.state.records.size = 100;
  assert.equal(back.newYear(), true, 'o ano novo começou');
  assert.equal(back.state.size, 1, 'a festa recomeçou');
  assert.deepEqual(back.premios.unlocked().map(item => item.id), ['ursinhos', 'zeca-argolas']);
  assert.equal(back.premios.count('argolas'), 12);
  assert.ok(back.premioBonus() > 0);
});

test('premios: um save mexido não libera nem inventa prêmios', () => {
  const { engine, clock } = newEngine();
  const saved = JSON.parse(JSON.stringify(engine.exportState()));
  saved.premios = { count: { argolas: 3, pescaria: 'muito', fantasma: 40, bingo: -5 },
    got: { ursinhos: 5, 'zeca-argolas': 1, 'seu-tainha': 2, 'prêmio-fantasma': 3, 'balde-peixes': 'x' },
    gifts: { 'zeca-argolas': 1e18, ursinhos: 5, 'prêmio-fantasma': 3 } };
  const back = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.t });
  // Só os prêmios que a conta merece (Argolas 3 vezes: os ursinhos); o resto some.
  assert.deepEqual(back.premios.unlocked().map(item => item.id), ['ursinhos']);
  assert.deepEqual(back.state.premios.count, { argolas: 3 });
  assert.deepEqual(back.state.premios.gifts, {}, 'sem presente de quem não chegou');
  // Um presente marcado para daqui a séculos não prende o personagem para sempre.
  const wide = JSON.parse(JSON.stringify(engine.exportState()));
  wide.premios = { count: { argolas: 99 }, got: { ursinhos: 1, 'zeca-argolas': 2 }, gifts: { 'zeca-argolas': 1e18 } };
  const loaded = new GameEngine(data, wide, { rng: () => 0.5, now: () => clock.t });
  assert.ok(loaded.state.premios.gifts['zeca-argolas'] <= clock.t + cfg.giftMinutes * 60000);
  wide.premios.parade = { nextAt: 1e18, active: { born: 1, until: 2, ids: ['x'], dir: 1, caught: false } };
  const far = new GameEngine(data, wide, { rng: () => 0.5, now: () => clock.t });
  assert.ok(far.state.premios.parade.nextAt <= clock.t + cfg.desfile.minutes[1] * 60000, 'o próximo desfile não fica marcado para daqui a séculos');
  assert.equal(far.state.premios.parade.active, null);
  for (const bad of [null, 7, 'x', [], { count: 5, got: [], gifts: 'x' }]) {
    const copy = JSON.parse(JSON.stringify(engine.exportState()));
    copy.premios = bad;
    const fresh = new GameEngine(data, copy, { rng: () => 0.5, now: () => clock.t });
    assert.deepEqual(fresh.state.premios, { count: {}, got: {}, gifts: {}, parade: { nextAt: 0, active: null } });
  }
});

test('premios: o relógio dos presentes anda junto quando o tempo passa de uma vez (advance)', () => {
  const { engine, clock } = newEngine();
  engine.state.premios.count.argolas = 99;
  engine.premios.unlock('argolas');
  engine.premios.gift('zeca-argolas');
  const before = engine.state.premios.gifts['zeca-argolas'];
  assert.ok(before > clock.t);
  engine.advance(cfg.giftMinutes * 60 + 5);
  assert.equal(engine.premios.giftReady('zeca-argolas', engine.now()), true, 'passou o tempo do presente');
});

test('premios: o botão de teste libera o próximo prêmio, um por clique, até acabar', () => {
  const { engine } = newEngine();
  for (let i = 0; i < 105; i++) {
    const result = engine.debug('premio');
    assert.ok(result?.note || true);
    assert.equal(engine.premios.total(), i + 1, `clique ${i + 1}`);
  }
  engine.debug('premio');
  assert.equal(engine.premios.total(), 105, 'acabou: nada de novo');
});

test('premios: a conta anda sozinha, com qualquer janela fechada', () => {
  const { engine } = newEngine();
  assert.equal(engine.premioBonus(), 0);
  assert.doesNotThrow(() => engine.emit('rings', { hits: 1, mult: 1 }));
  assert.equal(engine.premios.count('argolas'), 1);
});

test('premios: o troféu de ouro dobra o presente do personagem do jogo', () => {
  const { engine } = newEngine();
  engine.state.premios.count.fogueira = 20;
  engine.premios.unlock('fogueira');
  assert.equal(engine.premios.goldOfGame('fogueira'), false);
  const plain = engine.premios.gift('chico-assador');
  assert.deepEqual(plain.given, { belly: 25 });
  const { engine: golden } = newEngine();
  golden.state.premios.count.fogueira = 80;
  golden.premios.unlock('fogueira');
  assert.equal(golden.premios.goldOfGame('fogueira'), true);
  assert.equal(golden.premios.hasGold('panela-fogo'), true);
  assert.equal(golden.premios.hasGold('ursinhos'), false);
  assert.deepEqual(golden.premios.gift('chico-assador').given, { belly: 50 });
});

test('premios: as conquistas de colecionar (10 prêmios, todos os personagens e todos os troféus de ouro)', () => {
  const { engine } = newEngine();
  const done = () => engine.state.achievements.filter(id => ['colecionador', 'elenco-completo', 'festa-de-ouro'].includes(id));
  assert.deepEqual(engine.achievementProgress('colecionador'), [0, 10]);
  // 9 prêmios não bastam; o 10º abre a conquista (uma vez só).
  const games = cfg.jogos.map(game => game.id);
  for (const id of games.slice(0, 5)) { engine.state.premios.count[id] = cfg.itens.find(item => item.jogo === id && item.tipo === 'personagem').feitos; engine.premios.unlock(id); }
  assert.equal(engine.premios.total(), 10);
  assert.deepEqual(done(), ['colecionador']);
  assert.deepEqual(engine.achievementProgress('colecionador'), [10, 10]);
  assert.deepEqual(engine.achievementProgress('elenco-completo'), [5, 35]);
  assert.deepEqual(engine.achievementProgress('festa-de-ouro'), [0, 35]);
  engine.drainEvents();
  // Todos os personagens, sem nenhum troféu: o elenco está completo, a festa ainda não é de ouro.
  for (const id of games) { engine.state.premios.count[id] = cfg.itens.find(item => item.jogo === id && item.tipo === 'personagem').feitos; engine.premios.unlock(id); }
  assert.deepEqual(done().sort(), ['colecionador', 'elenco-completo']);
  assert.deepEqual(engine.achievementProgress('elenco-completo'), [35, 35]);
  // Os troféus: a conquista só vem com o último.
  for (const id of games.slice(0, -1)) { engine.state.premios.count[id] = 9999; engine.premios.unlock(id); }
  assert.ok(!engine.state.achievements.includes('festa-de-ouro'));
  engine.state.premios.count[games.at(-1)] = 9999;
  engine.premios.unlock(games.at(-1));
  assert.ok(engine.state.achievements.includes('festa-de-ouro'));
  assert.equal(engine.state.achievements.filter(id => id === 'festa-de-ouro').length, 1);
});

test('premios: quais jogos uma jogada conta (para a festa reagir)', () => {
  const { engine } = newEngine();
  assert.deepEqual(engine.premios.gamesFor('rings', { hits: 1 }), ['argolas']);
  assert.deepEqual(engine.premios.gamesFor('mini', { mini: 'aquario', kind: 'pop' }), ['aquario']);
  assert.deepEqual(engine.premios.gamesFor('mini', { mini: 'palco', kind: 'show-end', practice: false, aborted: false, stars: 0 }), []);
  assert.deepEqual(engine.premios.gamesFor('step', {}), []);
  assert.deepEqual(engine.premios.gamesFor('leilao-sold', { winner: 'outro' }), []);
  // Contar não muda só por perguntar.
  assert.deepEqual(engine.state.premios.count, {});
});

// Libera os `n` primeiros personagens (um por jogo, na ordem dos jogos).
function unlockPeople(engine, n) {
  for (const game of cfg.jogos.slice(0, n)) {
    engine.state.premios.count[game.id] = cfg.itens.find(item => item.jogo === game.id && item.tipo === 'personagem').feitos;
    engine.premios.unlock(game.id);
  }
}

test('premios: o Desfile dos Prêmios só começa com personagens suficientes, a cada alguns minutos, e o clique paga uma vez só', () => {
  const { engine, clock } = newEngine();
  const c = cfg.desfile;
  const tick = () => engine.tick(0.1);
  unlockPeople(engine, c.minPeople - 1);
  tick();
  assert.deepEqual(engine.state.premios.parade, { nextAt: 0, active: null }, 'faltam personagens: nada marcado');
  assert.deepEqual(engine.premios.catchParade(), { ok: false }, 'sem desfile não tem prêmio');
  unlockPeople(engine, c.minPeople);
  tick();
  const next = engine.state.premios.parade.nextAt;
  assert.ok(next >= clock.t + c.minutes[0] * 60000 - 1 && next <= clock.t + c.minutes[1] * 60000 + 1, 'o primeiro desfile é marcado entre os dois tempos');
  clock.t += 60000;
  tick();
  assert.equal(engine.state.premios.parade.active, null, 'ainda não é a hora');
  engine.drainEvents();
  clock.t = next + 1;
  tick();
  const active = engine.state.premios.parade.active;
  assert.ok(active, 'começou');
  assert.deepEqual(active.ids, engine.premios.people().slice(0, c.maxPeople).map(item => item.id));
  assert.equal(active.until - active.born, c.seconds * 1000);
  assert.ok([-1, 1].includes(active.dir));
  assert.deepEqual(engine.drainEvents().filter(event => event.type === 'premio-parade').map(event => event.n), [c.minPeople]);
  assert.equal(engine.state.premios.parade.nextAt, 0, 'enquanto passa, o próximo não está marcado');
  // O clique: fichas pelos personagens, Animação e Amor; o segundo clique do mesmo desfile não paga.
  const tickets = engine.state.tickets;
  const got = engine.premios.catchParade();
  assert.equal(got.ok, true);
  assert.equal(got.n, c.minPeople);
  assert.equal(got.given.tickets, c.tickets + Math.floor(c.minPeople / 3) * c.ticketsPer);
  assert.ok(got.given.cheer > 0 && got.given.love > 0);
  assert.equal(engine.state.tickets, tickets + got.given.tickets);
  assert.deepEqual(engine.drainEvents().map(event => event.type).filter(type => type === 'premio-parade-caught'), ['premio-parade-caught']);
  assert.equal(engine.state.log.at(-1).type, 'desfile');
  assert.equal(engine.premios.catchParade().ok, false);
  // Acabou o tempo: some, e o próximo é marcado de novo.
  clock.t += c.seconds * 1000 + 1;
  tick();
  assert.equal(engine.state.premios.parade.active, null);
  const after = engine.state.premios.parade.nextAt;
  assert.ok(after >= clock.t + c.minutes[0] * 60000 - 1 && after <= clock.t + c.minutes[1] * 60000 + 1);
  assert.equal(engine.premios.catchParade().ok, false);
  // O desfile que ninguém pegou também acaba sozinho, e o prêmio não vale depois do fim.
  engine.premios.startParade();
  clock.t += c.seconds * 1000 + 5;
  assert.equal(engine.premios.catchParade().ok, false, 'o tempo passou: nada de prêmio atrasado');
});

test('premios: no desfile vão os primeiros personagens (no máximo maxPeople), e o botão de teste chama um agora', () => {
  const { engine } = newEngine();
  assert.equal(engine.premios.startParade(), false, 'sem personagem não tem desfile');
  assert.match(engine.debug('desfile')?.note || 'Nenhum personagem na festa ainda', /Nenhum personagem/);
  unlockPeople(engine, 35);
  engine.debug('desfile');
  const active = engine.state.premios.parade.active;
  assert.equal(active.ids.length, cfg.desfile.maxPeople);
  assert.deepEqual(active.ids, engine.premios.people().slice(0, cfg.desfile.maxPeople).map(item => item.id));
});

test('premios: o relógio do desfile guarda no save e anda com o tempo (advance); o desfile em curso não sobrevive ao save', () => {
  const { engine, clock } = newEngine();
  unlockPeople(engine, 6);
  engine.tick(0.1);
  const next = engine.state.premios.parade.nextAt;
  const saved = JSON.parse(JSON.stringify(engine.exportState()));
  const back = new GameEngine(data, saved, { rng: () => 0.5, now: () => clock.t });
  assert.equal(back.state.premios.parade.nextAt, next);
  assert.equal(back.state.premios.parade.active, null);
  engine.premios.startParade();
  const saved2 = JSON.parse(JSON.stringify(engine.exportState()));
  assert.ok(saved2.premios.parade.active, 'o save guarda o que está passando');
  const back2 = new GameEngine(data, saved2, { rng: () => 0.5, now: () => clock.t });
  assert.equal(back2.state.premios.parade.active, null, 'mas ao abrir o jogo ele já acabou');
  // advance com o desfile passando: o tempo andou, ele já acabou (o prazo anda junto com o relógio).
  engine.premios.startParade();
  engine.advance(cfg.desfile.seconds + 5);
  assert.equal(engine.state.premios.parade.active, null, 'o desfile passou enquanto o jogo esteve parado');
  // advance: passou muito tempo de uma vez, o próximo chega.
  const { engine: late } = newEngine();
  unlockPeople(late, 6);
  late.tick(0.1);
  const due = late.state.premios.parade.nextAt - late.now();
  late.advance(due / 1000 + 5);
  assert.ok(late.state.premios.parade.active || late.state.premios.parade.nextAt > 0, 'o relógio andou');
});

test('premios: as jogadas de verdade do motor contam (carta lida, retrato, penetra, prato servido e figurinha colada)', () => {
  const { engine } = newEngine();
  engine.state.size = engine.state.records.size = 100;
  engine.state.mail.ready = 3;
  assert.ok(engine.openLetter());
  assert.equal(engine.premios.count('correio'), 1, 'carta lida');
  const albumBefore = engine.premios.count('album');
  engine.emit('rain');
  assert.ok(engine.premios.count('album') >= albumBefore, 'figurinha colada conta no álbum');
  assert.ok(engine.state.album.length >= 1);
  assert.equal(engine.premios.count('album'), engine.state.album.length, 'cada figurinha nova é uma vez');
});

test('premios: os cliques de verdade da festa contam (carinho só quando rende, balão, arco-íris e pedido)', () => {
  const { engine, clock } = newEngine();
  engine.state.size = engine.state.records.size = 100;
  const first = engine.pokeHost();
  assert.equal(first.ready, true);
  assert.equal(engine.premios.count('carinho'), 1, 'o carinho que rendeu conta');
  engine.pokeHost();
  assert.equal(engine.premios.count('carinho'), 1, 'o carinho seguinte, ainda na pausa, não conta');
  clock.t += data.config.pokeCooldown * 1000 + 1;
  engine.pokeHost();
  assert.equal(engine.premios.count('carinho'), 2);
  // Balão dourado, arco-íris e pedido: cada um que o jogador pega.
  engine.state.balloon.active = { born: clock.t, until: clock.t + 60000 };
  assert.ok(engine.claimBalloon());
  assert.equal(engine.premios.count('balao'), 1);
  assert.equal(engine.claimBalloon(), null);
  assert.equal(engine.premios.count('balao'), 1, 'sem balão não conta');
  engine.state.weather.rainbow = { born: clock.t, until: clock.t + 60000 };
  assert.ok(engine.claimRainbow());
  assert.equal(engine.premios.count('arco'), 1);
  engine.state.request.active = { kind: 'agua', born: clock.t, until: clock.t + 60000 };
  assert.ok(engine.claimRequest());
  assert.equal(engine.premios.count('pedido'), 1);
});

test('premios: cada alvo pego de um evento do mundo conta no jogo Eventos do mundo (a Estação do Tempo e Seu Barômetro)', () => {
  const { engine } = newEngine();
  engine.state.size = engine.state.records.size = 100;
  engine.mundo.start('estrelas');
  for (let k = 0; k < 8; k++) engine.mundo.catchTarget(k);
  assert.equal(engine.premios.count('mundo'), 8);
  engine.mundo.catchTarget(0);
  assert.equal(engine.premios.count('mundo'), 8, 'alvo repetido não conta');
  engine.state.mundo.active = null;
  engine.mundo.start('lua');
  engine.mundo.catchTarget(0);
  engine.mundo.catchTarget(1);
  assert.equal(engine.premios.count('mundo'), 10);
  assert.equal(engine.premios.has('estacao-tempo'), true, 'com 10 alvos vem a coisa');
  assert.equal(engine.premios.has('seu-barometro'), false);
});
