const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../src/data.js');
const { GameEngine } = require('../src/core.js');
const UI = require('../src/ui.js');

require('../src/festa-mundo-temas.js');

const cfg = data.mundo;
const TOTAL = cfg.eventos.length;
const THEMES = { dino: ['pterodatilos', 'manada', 'ovos', 'meteoro'], halloween: ['bruxas', 'abobora', 'fantasmas', 'luasangue'], zumbi: ['horda', 'gosma', 'helicoptero', 'surto'] };
const SETS = { dino: 'era-jurassica', halloween: 'bruxa', zumbi: 'zumbi-de-festa' };

function newEngine(size = 60, rngValue = 0.5, options = {}, source = data) {
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(source, null, { rng: typeof rngValue === 'function' ? rngValue : () => rngValue, now: () => clock.t, ...options });
  engine.state.size = engine.state.records.size = size;
  return { engine, clock };
}
// Veste as três peças de um conjunto (dá as peças antes).
function wear(engine, setId) {
  const set = data.sets.find(entry => entry.id === setId);
  for (const piece of [set.hat, set.hand, set.fabric]) { if (!engine.owned(piece)) engine.state.inventory.push(piece); engine.equip(piece); }
}
const tick = (engine, clock, seconds) => { clock.t += seconds * 1000; engine.tick(Math.min(1, seconds)); };

test('eventos de tema: são doze (quatro por tema), cada um de um tema que existe, e todos os temas têm um comum, dois incomuns e um raro', () => {
  const themed = cfg.eventos.filter(entry => entry.tema);
  assert.equal(themed.length, 12);
  for (const [theme, ids] of Object.entries(THEMES)) {
    assert.ok(data.themes.some(entry => entry.id === theme), `${theme}: tema da loja`);
    assert.deepEqual(themed.filter(entry => entry.tema === theme).map(entry => entry.id), ids, `${theme}: os quatro eventos`);
    const { engine } = newEngine();
    const rarities = ids.map(id => engine.mundo.rarity(cfg.eventos.find(entry => entry.id === id))).sort();
    assert.deepEqual(rarities, ['common', 'rare', 'uncommon', 'uncommon'], `${theme}: raridades`);
  }
  // Os eventos de vários golpes e o ordenado dos dados.
  const byId = id => cfg.eventos.find(entry => entry.id === id);
  assert.equal(byId('abobora').ordered, true);
  assert.deepEqual([byId('ovos').hits, byId('meteoro').hits, byId('luasangue').hits, byId('surto').hits], [3, 8, 3, 3]);
  assert.ok(cfg.temaChance > 0 && cfg.temaChance < 1);
});

test('conjunto vestido: só vale o tema se as três peças são do mesmo tema (e o conjunto é completo)', () => {
  const { engine } = newEngine();
  assert.equal(engine.wornTheme(), null, 'de saída, sem tema');
  for (const [theme, setId] of Object.entries(SETS)) {
    wear(engine, setId);
    assert.equal(engine.wornTheme(), theme, `${setId} é um conjunto de ${theme}`);
  }
  // Todo conjunto da loja de um tema tem as três peças do mesmo tema.
  for (const set of data.sets) {
    const themes = [set.hat, set.hand, set.fabric].map(id => data.items.find(item => item.id === id).tema || null);
    if (!themes[0] && !themes[1] && !themes[2]) continue;
    assert.ok(themes.every(entry => entry === themes[0]), `${set.id}: peças do mesmo tema`);
    wear(engine, 'caipira');
    wear(engine, set.id);
    assert.equal(engine.wornTheme(), themes[0], `${set.id}`);
  }
  // Peças de temas diferentes (chapéu de dinossauro, mão de Halloween) não fazem conjunto nenhum.
  wear(engine, 'era-jurassica');
  engine.state.inventory.push('balde-doces');
  engine.equip('balde-doces');
  assert.equal(engine.activeSet(), null);
  assert.equal(engine.wornTheme(), null);
  // Um conjunto comum completo (sem tema) também não conta.
  wear(engine, 'caipira');
  assert.ok(engine.activeSet());
  assert.equal(engine.wornTheme(), null);
});

test('conjunto vestido: um conjunto com peças de temas misturados não vale tema nenhum', () => {
  const source = JSON.parse(JSON.stringify(data));
  source.sets.push({ id: 'misturado', name: 'Misturado', hat: 'capuz-dino', hand: 'balde-doces', fabric: 'pele-dino', bonus: 0.05 });
  const { engine } = newEngine(60, 0.5, {}, source);
  for (const piece of ['capuz-dino', 'balde-doces', 'pele-dino']) { engine.state.inventory.push(piece); engine.equip(piece); }
  assert.equal(engine.activeSet().id, 'misturado', 'o conjunto vale pelo bônus');
  assert.equal(engine.wornTheme(), null, 'mas não é de tema nenhum');
  assert.ok(!source.mundo.eventos.find(entry => entry.id === engine.mundo.pick()).tema);
});

test('sorteio: sem conjunto de tema nenhum evento de tema entra; com ele, a chance é a de `temaChance` e só do tema vestido', () => {
  // Sem conjunto: nem com a sorte no começo, no meio ou no fim da roleta.
  for (const roll of [0, 0.25, 0.5, 0.75, 0.999999]) {
    const { engine } = newEngine(200, roll);
    assert.ok(!cfg.eventos.find(entry => entry.id === engine.mundo.pick()).tema, `sem conjunto (${roll})`);
  }
  for (const [theme, ids] of Object.entries(THEMES)) {
    // Dado de tema abaixo da chance: sai da lista do tema (e só dela); em cima, volta para os eventos do céu.
    let calls = 0;
    const rolls = [0.1, 0.9];
    const { engine } = newEngine(200, () => { const value = rolls[Math.min(calls, 1)]; calls++; return value; });
    wear(engine, SETS[theme]);
    calls = 0;
    const picked = engine.mundo.pick();
    assert.ok(ids.includes(picked), `${theme}: ${picked}`);
    const { engine: high } = newEngine(200, 0.9);
    wear(high, SETS[theme]);
    assert.ok(!cfg.eventos.find(entry => entry.id === high.mundo.pick()).tema, `${theme}: com o dado alto vem do céu e do tempo`);
    // Nenhum evento de outro tema entra, em qualquer ponto da roleta.
    for (let roll = 0; roll < 1; roll += 0.0625) {
      const test = newEngine(200, () => roll).engine;
      wear(test, SETS[theme]);
      const entry = cfg.eventos.find(item => item.id === test.mundo.pick());
      assert.ok(!entry.tema || entry.tema === theme, `${theme}: ${entry.id}`);
    }
  }
  // Nunca repete o último, também dentro do tema.
  const rolls = [0.1, 0];
  let n = 0;
  const { engine: again } = newEngine(200, () => rolls[n++ % 2]);
  wear(again, SETS.dino);
  again.state.mundo.last = 'pterodatilos';
  n = 0;
  assert.equal(again.mundo.pick(), 'manada', 'o primeiro do tema é o último que veio: pula para o seguinte');
});

test('sorteio: o peso manda dentro do tema, e o convidado mínimo também', () => {
  const rolls = [0.1, 0.999999];
  let n = 0;
  const { engine } = newEngine(200, () => rolls[n++ % 2]);
  wear(engine, SETS.halloween);
  n = 0;
  assert.equal(engine.mundo.pick(), 'luasangue', 'o fim da roleta do tema é o último dos quatro');
  // Os raros do tema pedem mais convidados (25) que os outros (12).
  const small = newEngine(cfg.minSize, () => 0.999999).engine;
  wear(small, SETS.halloween);
  n = 0;
  const seen = new Set();
  for (const roll of [0, 0.3, 0.6, 0.9]) {
    const test = newEngine(cfg.minSize, () => roll < 0.5 ? 0.1 : roll).engine;
    wear(test, SETS.halloween);
    seen.add(test.mundo.pick());
  }
  assert.ok(!seen.has('luasangue'), 'o raro não cabe numa festa de 12');
});

test('previsão: trocar de roupa sorteia de novo na hora, e o evento da previsão que perdeu o tema não vem', () => {
  const { engine, clock } = newEngine(60, () => 0.3);
  tick(engine, clock, 1);
  const first = engine.state.mundo.nextId;
  assert.ok(first && !cfg.eventos.find(entry => entry.id === first).tema, 'sem conjunto: previsão do céu');
  // Veste um conjunto de zumbi: a previsão passa a ser de zumbi (o dado 0,3 está abaixo da chance).
  wear(engine, SETS.zumbi);
  tick(engine, clock, 1);
  assert.ok(THEMES.zumbi.includes(engine.state.mundo.nextId), `previsão de zumbi (${engine.state.mundo.nextId})`);
  // Tirou o conjunto: a previsão volta para o céu e o tempo.
  wear(engine, 'caipira');
  tick(engine, clock, 1);
  assert.ok(!cfg.eventos.find(entry => entry.id === engine.state.mundo.nextId).tema, 'sem conjunto outra vez');
  // Trocou de tema (zumbi para dino): a previsão acompanha.
  wear(engine, SETS.zumbi);
  tick(engine, clock, 1);
  wear(engine, SETS.dino);
  tick(engine, clock, 1);
  assert.ok(THEMES.dino.includes(engine.state.mundo.nextId), 'agora de dinossauro');
  // Na hora H, sem o tema, o evento previsto de tema não vem: sorteia outro, do céu. (A roupa já foi anotada: nada de re-sorteio antes da hora.)
  wear(engine, 'caipira');
  tick(engine, clock, 0.1);
  engine.state.mundo.nextId = 'ovos';
  engine.state.mundo.nextAt = clock.t - 1;
  engine.tick(0.1);
  const active = engine.state.mundo.active;
  assert.ok(active && !cfg.eventos.find(entry => entry.id === active.id).tema, `começou ${active && active.id}`);
});

test('previsão: carregar o jogo guarda a previsão sem sorteá-la de novo (a primeira vez que olha a roupa só anota)', () => {
  const { engine, clock } = newEngine(60, () => 0.3);
  wear(engine, SETS.halloween);
  tick(engine, clock, 1);
  const planned = engine.state.mundo.nextId;
  assert.ok(THEMES.halloween.includes(planned));
  const saved = JSON.parse(JSON.stringify(engine.state));
  const loaded = new GameEngine(data, saved, { rng: () => 0.3, now: () => clock.t });
  assert.equal(loaded.state.mundo.nextId, planned);
  loaded.tick(0.1);
  assert.equal(loaded.state.mundo.nextId, planned, 'o mesmo evento depois de carregar');
});

test('encadeamento: um evento só puxa o de tema se o conjunto do tema está vestido', () => {
  const source = JSON.parse(JSON.stringify(data));
  source.mundo.chains.bruxas = { id: 'abobora', chance: 1, delay: 5 };
  source.mundo.chains.estrelas = { id: 'manada', chance: 1, delay: 5 };
  const { engine } = newEngine(60, 0.1, {}, source);
  assert.equal(engine.mundo.follow(engine.mundo.event('estrelas')), '', 'sem o conjunto de dinossauros');
  wear(engine, SETS.dino);
  assert.equal(engine.mundo.follow(engine.mundo.event('estrelas')), 'manada');
  assert.equal(engine.mundo.follow(engine.mundo.event('bruxas')), '', 'o de Halloween continua fora com o conjunto de dinossauros');
  wear(engine, SETS.halloween);
  assert.equal(engine.mundo.follow(engine.mundo.event('bruxas')), 'abobora');
});

test('eventos de tema: o botão de teste e o início direto funcionam sem o conjunto, e o evento começa e acaba como qualquer outro', () => {
  const { engine, clock } = newEngine(60, 0.5);
  for (const id of Object.values(THEMES).flat()) {
    engine.state.mundo.active = null;
    assert.equal(engine.mundo.start(id), true, id);
    const entry = engine.mundo.event(id);
    assert.equal(engine.mundo.active().n, entry.targets);
    clock.t += entry.seconds * 1000 + 100;
    engine.tick(0.1);
    assert.equal(engine.state.mundo.active, null, `${id}: acabou`);
  }
  // Todos contam no almanaque.
  const info = engine.mundo.info();
  assert.equal(info.seenKinds, 12);
  assert.equal(info.kinds, TOTAL);
});

test('eventos de tema: o prêmio de cada alvo e o final saem do jeito dos dados (vários golpes, ordem e alvos únicos)', () => {
  const { engine } = newEngine(80, 0.5);
  // Ovo: três golpes antes de pagar.
  engine.mundo.start('ovos');
  const first = engine.mundo.catchTarget(0);
  assert.deepEqual([first.ok, first.partial, first.n, first.of], [true, true, 1, 3]);
  assert.equal(engine.state.mundo.caught.ovos, undefined, 'nada pago nos dois primeiros golpes');
  engine.mundo.catchTarget(0);
  const done = engine.mundo.catchTarget(0);
  assert.equal(done.ok && !done.partial, true);
  assert.equal(done.left, 3);
  // Meteoro: oito golpes, e o único alvo paga o prêmio e o final de uma vez.
  engine.state.mundo.active = null;
  engine.mundo.start('meteoro');
  for (let i = 0; i < 7; i++) assert.equal(engine.mundo.catchTarget(0).partial, true);
  const meteor = engine.mundo.catchTarget(0);
  assert.equal(meteor.all, true);
  assert.ok(meteor.given.tickets >= 10 && meteor.finale.tickets >= 12);
  // Abóboras: só na ordem.
  engine.state.mundo.active = null;
  engine.mundo.start('abobora');
  const wrong = engine.mundo.catchTarget(2);
  assert.deepEqual([wrong.ok, wrong.reason, wrong.next], [false, 'order', 0]);
  for (let k = 0; k < 6; k++) assert.equal(engine.mundo.catchTarget(k).ok, true, `abóbora ${k}`);
  assert.equal(engine.state.mundo.done.abobora, 1);
});

test('tela dos eventos: os de tema mostram o tema no cartão, a dica de que pedem o conjunto e, com ele vestido, que já podem vir', () => {
  const ctx = engine => ({ tela: 'mundo', icon: name => `<i data-icon="${name}"></i>`, now: engine.now(), settings: {}, desktop: true });
  const { engine } = newEngine(60, 0.5);
  let page = UI.tela(engine, ctx(engine));
  for (const theme of ['dino', 'halloween', 'zumbi']) assert.equal((page.match(new RegExp(`class="cartao evento-mundo[^"]*" data-raridade="[a-z]+" data-tema="${theme}"`, 'g')) || []).length, 4, `${theme}: a faixa de cor nos quatro cartões`);
  assert.equal((page.match(/data-tema=/g) || []).length, 12, 'e só nos de tema');
  assert.equal((page.match(/Dica: só aparece com um conjunto completo de dinossauros vestido\./g) || []).length, 4, 'um por evento de dinossauro');
  assert.equal((page.match(/Dica: só aparece com um conjunto completo de zumbis vestido\./g) || []).length, 4);
  assert.doesNotMatch(page, /Você está com o conjunto/);
  // Com o conjunto de dinossauros vestido, os quatro de dinossauro dizem que já podem vir (os de Halloween seguem pedindo).
  wear(engine, SETS.dino);
  page = UI.tela(engine, ctx(engine));
  assert.equal((page.match(/Você está com o conjunto: já pode aparecer!/g) || []).length, 4);
  assert.equal((page.match(/Dica: só aparece com um conjunto completo de halloween vestido\./g) || []).length, 4);
  assert.equal((page.match(/Dica: só aparece com um conjunto completo de dinossauros vestido\./g) || []).length, 0);
  // O que já passou lembra que é só com o conjunto, e o ícone é o do evento.
  engine.state.mundo.seen.ovos = 1;
  page = UI.tela(engine, ctx(engine));
  assert.match(page, /Só com um conjunto de dinossauros vestido\./);
  assert.match(page, /data-icon="mundo:ovos"/);
  // Um festa pequena demais continua dizendo quantos convidados faltam, antes do conjunto.
  const small = newEngine(14).engine;
  const row = small.mundo.almanac().find(entry => entry.entry.id === 'meteoro');
  assert.deepEqual([row.unlocked, row.needs, row.tema, row.themeOn], [false, 11, 'dino', false]);
});

// --- A geometria de cada evento (src/festa-mundo-temas.js) -------------------------------------------------------------------------------

const rnd = (seed, i, j = 0) => { const x = Math.sin(seed * 12.9898 + i * 78.233 + j * 37.719) * 43758.5453; return x - Math.floor(x); };
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const spread = (c, k, from, stepMs, life) => { const p = (c.t - (from + k * stepMs)) / life; return p >= 0 && p < 1 ? p : -1; };
const step = (c, from, tail) => (c.n > 1 ? (c.dur - from - tail) / (c.n - 1) : 0);
const LAY = { L: 20, R: 420, width: 400, host: { x: 200 } };

function fakeHelpers(extra = {}) {
  const calls = { fills: [], particles: [], says: [], sounds: [], floats: [] };
  const g = { fillStyle: '', globalAlpha: 1, globalCompositeOperation: 'source-over', fillRect: (x, y, w, h) => calls.fills.push([x, y, w, h, g.fillStyle]) };
  const helpers = { g, halo: () => {}, say: text => calls.says.push(text), float: () => calls.floats.push(1), confetti: () => {}, sound: name => calls.sounds.push(name), rng: () => 0.5,
    fx: () => ({ particles: calls.particles, flashUntil: 0 }), layout: () => LAY, ground: () => 160, poleTop: () => 60, tint: () => {}, particle: p => calls.particles.push(p),
    rnd, clamp, spread, step, tr: key => key, ...extra };
  return { helpers, calls };
}
const eventC = (id, t, extra = {}) => {
  const entry = cfg.eventos.find(item => item.id === id);
  return { id, entry, t, dur: entry.seconds * 1000, n: entry.targets, seed: 12345, dir: 1, got: new Set(), now: 100000 + t, a: { born: 100000, hits: {} }, items: [], k: 1, ...extra };
};

test('alvos de tema: cada um nasce, anda e some dentro da festa e do tempo do evento (e só os clicáveis aparecem)', () => {
  const { helpers } = fakeHelpers();
  const T = globalThis.ArraiaMundoTemas.create(helpers);
  for (const id of Object.values(THEMES).flat()) {
    const entry = cfg.eventos.find(item => item.id === id);
    assert.equal(typeof T.TARGETS[id], 'function', `${id}: tem posição de alvo`);
    assert.equal(typeof T.OVER[id], 'function', `${id}: tem desenho`);
    let seen = 0;
    for (let t = 0; t <= entry.seconds * 1000; t += 250) {
      for (let k = 0; k < entry.targets; k++) {
        const item = T.TARGETS[id](eventC(id, t), k, LAY);
        if (!item) continue;
        seen++;
        assert.ok(item.w > 0 && item.h > 0, `${id}: caixa de clique`);
        assert.ok(Number.isFinite(item.x) && Number.isFinite(item.y), `${id}: posição`);
        // Dentro da festa, com folga para quem entra e sai pela borda.
        assert.ok(item.x >= LAY.L - 40 && item.x <= LAY.R + 40, `${id}: x ${item.x}`);
        assert.ok(item.y >= 0 && item.y <= 165, `${id}: y ${item.y}`);
      }
    }
    assert.ok(seen > 0, `${id}: aparece em algum momento`);
    // Cada alvo aparece em algum momento (todos podem ser pegos).
    for (let k = 0; k < entry.targets; k++) {
      let ever = false;
      for (let t = 0; t <= entry.seconds * 1000 && !ever; t += 250) ever = !!T.TARGETS[id](eventC(id, t), k, LAY);
      assert.ok(ever, `${id}: o alvo ${k} aparece`);
    }
  }
});

test('alvos de tema: os que cruzam o céu vão no sentido do evento, ficam no céu e terminam antes do evento acabar', () => {
  const { helpers } = fakeHelpers();
  const T = globalThis.ArraiaMundoTemas.create(helpers);
  for (const id of ['pterodatilos', 'bruxas']) {
    for (const dir of [1, -1]) {
      for (let k = 0; k < 5; k++) {
        const points = [];
        for (let t = 0; t <= 50000; t += 100) {
          const item = T.TARGETS[id](eventC(id, t, { dir }), k, LAY);
          if (item) points.push(item);
        }
        assert.ok(points.length > 20, `${id}: o alvo ${k} fica um bom tempo`);
        assert.ok(dir * (points.at(-1).x - points[0].x) > LAY.width * 0.8, `${id}: cruza a festa no sentido ${dir}`);
        assert.ok(points.every(item => item.y < 60), `${id}: fica no céu`);
      }
    }
  }
  // O helicóptero: as caixas saem na ordem do caminho do helicóptero, caem em 7,2 s e cada uma acaba antes do fim do evento.
  const entry = cfg.eventos.find(item => item.id === 'helicoptero');
  for (const dir of [1, -1]) {
    const lasts = [];
    const xs = [];
    for (let k = 0; k < entry.targets; k++) {
      let first = null;
      let last = null;
      for (let t = 0; t <= entry.seconds * 1000; t += 50) {
        const item = T.TARGETS.helicoptero(eventC('helicoptero', t, { dir }), k, LAY);
        if (item) { first = first || { t, item }; last = { t, item }; }
      }
      assert.ok(first && last, `caixa ${k}`);
      assert.ok(last.item.y > first.item.y + 80, `caixa ${k}: desce do helicóptero até o chão`);
      assert.ok(last.t - first.t >= 6800 && last.t - first.t <= 7300, `caixa ${k}: cai em uns 7 s (${last.t - first.t})`);
      assert.ok(last.t < entry.seconds * 1000, `caixa ${k}: acaba antes do evento`);
      lasts.push(first.t);
      xs.push(first.item.x);
    }
    assert.deepEqual([...lasts].sort((a, b) => a - b), lasts, 'saem uma depois da outra');
    assert.ok(lasts.at(-1) - lasts[0] > 15000, 'e espaçadas, na hora em que o helicóptero passa por cada ponto');
    assert.ok(dir * (xs.at(-1) - xs[0]) > LAY.width * 0.6, 'e o ponto de queda anda no sentido do helicóptero');
  }
});

test('alvos de tema: os fantasmas somem e voltam (só dá para clicar visíveis), os zumbis entram dos dois lados e as gotas caem aceleradas', () => {
  const { helpers } = fakeHelpers();
  const T = globalThis.ArraiaMundoTemas.create(helpers);
  // Fantasmas: visíveis entre 40% e 85% do tempo, com opacidade de 0,3 a 1.
  for (let k = 0; k < 6; k++) {
    let visible = 0;
    let total = 0;
    for (let t = 3000; t < 50000; t += 100) {
      total++;
      const item = T.TARGETS.fantasmas(eventC('fantasmas', t), k, LAY);
      if (!item) continue;
      visible++;
      assert.ok(item.a >= 0.3 && item.a <= 1, `fantasma ${k}: opacidade ${item.a}`);
    }
    assert.ok(visible / total > 0.4 && visible / total < 0.85, `fantasma ${k}: visível ${Math.round(visible / total * 100)}%`);
  }
  // Zumbis: os de número par entram pela esquerda e os ímpares pela direita, e nenhum passa de uns 80% da festa.
  for (let k = 0; k < 6; k++) {
    const points = [];
    for (let t = 0; t <= 50000; t += 100) { const item = T.TARGETS.horda(eventC('horda', t), k, LAY); if (item) points.push(item); }
    assert.ok(points.length > 50, `zumbi ${k}`);
    const side = k % 2 === 0 ? 1 : -1;
    assert.equal(points[0].side, side);
    assert.ok(side * (points.at(-1).x - points[0].x) > LAY.width * 0.3, `zumbi ${k}: anda para dentro`);
    assert.ok(points.every(item => item.x > LAY.L - 12 && item.x < LAY.R + 12));
    assert.ok(points.every((item, i) => i === 0 || side * (item.x - points[i - 1].x) >= -0.001), `zumbi ${k}: nunca anda para trás`);
  }
  // Gotas: caem cada vez mais depressa (a distância por passo só cresce) e chegam perto do chão no fim.
  for (let k = 0; k < 8; k++) {
    const ys = [];
    for (let t = 0; t <= 45000; t += 100) { const item = T.TARGETS.gosma(eventC('gosma', t), k, LAY); if (item) ys.push(item.y); }
    assert.ok(ys.length > 40, `gota ${k}`);
    const deltas = ys.slice(1).map((y, i) => y - ys[i]);
    assert.ok(deltas.every((delta, i) => i === 0 || delta >= deltas[i - 1] - 0.001), `gota ${k}: acelera`);
    assert.ok(deltas.at(-1) > deltas[0] * 2, `gota ${k}: no fim cai bem mais depressa que no começo`);
    assert.ok(ys.at(-1) > 120 && ys.at(-1) <= 150, `gota ${k}: termina perto do chão (${ys.at(-1)})`);
  }
});

test('alvos de tema: ovos e covas ficam parados (quatro lugares diferentes, longe da Mandioca) e o meteoro encolhe a cada golpe sem sair do céu', () => {
  const { helpers } = fakeHelpers();
  const T = globalThis.ArraiaMundoTemas.create(helpers);
  for (const id of ['ovos', 'surto', 'abobora']) {
    const entry = cfg.eventos.find(item => item.id === id);
    const xs = [];
    for (let k = 0; k < entry.targets; k++) {
      const a = T.TARGETS[id](eventC(id, 1000), k, LAY);
      const b = T.TARGETS[id](eventC(id, 30000), k, LAY);
      assert.deepEqual([a.x, a.y], [b.x, b.y], `${id}: ${k} não anda`);
      assert.ok(Math.abs(a.x - (LAY.host.x + 12)) >= 20, `${id}: ${k} longe da Mandioca (${a.x})`);
      xs.push(a.x);
    }
    assert.equal(new Set(xs.map(Math.round)).size, entry.targets, `${id}: cada um no seu lugar`);
    assert.deepEqual([...xs].sort((a, b) => a - b).map(Math.round), xs.map(Math.round).sort((a, b) => a - b));
  }
  // Meteoro: só aparece depois de 1,2 s, desce e vai para o meio; cada golpe encolhe (e a caixa de clique acompanha).
  assert.equal(T.TARGETS.meteoro(eventC('meteoro', 500), 0, LAY), null);
  let lastSize = 99;
  for (let hits = 0; hits < 8; hits++) {
    const item = T.TARGETS.meteoro(eventC('meteoro', 20000, { a: { born: 0, hits: { 0: hits } } }), 0, LAY);
    assert.ok(item.size <= lastSize && item.w === item.size * 2 + 6, `golpe ${hits}: tamanho ${item.size}`);
    assert.ok(item.y - item.size >= 0, `golpe ${hits}: dentro do céu (y ${item.y}, tamanho ${item.size})`);
    lastSize = item.size;
  }
  assert.ok(lastSize < 8, 'no último golpe é um pedacinho');
  const start = T.TARGETS.meteoro(eventC('meteoro', 1300), 0, LAY);
  const end = T.TARGETS.meteoro(eventC('meteoro', 38000), 0, LAY);
  assert.ok(end.y > start.y && Math.abs(end.x - (LAY.L + LAY.width / 2)) < Math.abs(start.x - (LAY.L + LAY.width / 2)), 'desce e chega ao meio da festa');
  // A debandada: a tremida só acontece nas pisadas (uns 150 ms a cada 880 ms) e só com o evento no ar.
  const manada = eventC('manada', 20000);
  assert.deepEqual(Object.keys(T.shake(manada, 880 * 10 + 20)).sort(), ['x', 'y']);
  assert.equal(T.shake(manada, 880 * 10 + 400), null, 'entre uma pisada e outra');
  assert.equal(T.shake(eventC('manada', 20000, { k: 0.1 }), 880 * 10 + 20), null, 'no começo, antes de entrar de verdade');
  assert.equal(T.shake(eventC('estrelas', 20000), 880 * 10 + 20), null, 'só a manada balança');
});

test('reações de tema: o ovo choca (cria correndo e casca), o zumbi vira gente, e os golpes de ovo, meteoro, aranha e mão soltam o que é deles', () => {
  const { helpers, calls } = fakeHelpers();
  const T = globalThis.ArraiaMundoTemas.create(helpers);
  const reset = () => { calls.fills.length = 0; calls.particles.length = 0; calls.says.length = 0; calls.sounds.length = 0; calls.floats.length = 0; };
  // Ovo: o último golpe solta cacos, fala "PIU" e toca o som de quebrar; um golpe do meio só estala.
  const eggs = eventC('ovos', 10000);
  assert.equal(T.hitFx(eggs, { k: 0, n: 1, of: 3 }, 100, 150, 1000), true);
  assert.ok(calls.particles.length >= 6, 'cacos');
  assert.deepEqual(calls.sounds, ['estalo']);
  reset();
  T.catchFx(eggs, { k: 0, all: false }, 100, 150, 2000);
  assert.deepEqual(calls.sounds, ['quebra']);
  assert.deepEqual(calls.says, ['fx.ovoPiu']);
  assert.ok(calls.particles.length >= 8);
  // A cria aparece no desenho (um chapéu de palha: amarelo-escuro) e some depois de uns 3 s.
  reset();
  T.OVER.ovos(eggs, 2100);
  assert.ok(calls.fills.some(fill => fill[4] === '#c89a30'), 'a palha do ninho e o chapéu da cria');
  const withBaby = calls.fills.filter(fill => fill[4] === '#56c860').length;
  assert.ok(withBaby > 0, 'a cria verde correndo');
  reset();
  T.OVER.ovos(eggs, 2100 + 4000);
  assert.equal(calls.fills.filter(fill => fill[4] === '#56c860').length, 0, 'depois de uns 3 s ela já foi embora');
  // Meteoro: cada golpe solta brasas; o fim, uma chuva delas e o aviso.
  reset();
  assert.equal(T.hitFx(eventC('meteoro', 10000), { k: 0, n: 3, of: 8 }, 200, 30, 1000), true);
  assert.ok(calls.particles.some(p => p.ember), 'brasas');
  reset();
  T.catchFx(eventC('meteoro', 10000), { k: 0, all: true }, 200, 30, 3000);
  assert.ok(calls.particles.length >= 40);
  assert.deepEqual(calls.says, ['fx.meteoroFim']);
  assert.deepEqual(calls.sounds, ['trovao']);
  // Aranha e mão: o golpe estala ou bate na terra; um evento sem golpes de tema deixa o martelo de sempre (devolve false).
  reset();
  assert.equal(T.hitFx(eventC('luasangue', 10000), { k: 1, n: 1, of: 3 }, 200, 30, 1000), true);
  assert.deepEqual(calls.sounds, ['estalo']);
  reset();
  assert.equal(T.hitFx(eventC('surto', 10000), { k: 1, n: 1, of: 3 }, 200, 150, 1000), true);
  assert.deepEqual(calls.sounds, ['lenha']);
  assert.equal(T.hitFx(eventC('pinhata', 10000), { k: 1, n: 1, of: 6 }, 200, 50, 1000), false);
  // Zumbi: ganha a pamonha, fala "NHAM" e aparece rosado (pele #f0b898) pulando.
  reset();
  const horde = eventC('horda', 12000);
  T.catchFx(horde, { k: 2, all: false }, 150, 150, 5000);
  assert.deepEqual(calls.says, ['fx.zumbiCurado']);
  reset();
  T.OVER.horda(horde, 5100);
  assert.ok(calls.fills.some(fill => fill[4] === '#f0b898'), 'o zumbi curado, de pele rosada');
  reset();
  T.OVER.horda(horde, 5100 + 3000);
  assert.ok(!calls.fills.some(fill => fill[4] === '#f0b898'), 'e some depois de uns 2 s');
  // reset limpa tudo.
  T.catchFx(eggs, { k: 1, all: false }, 100, 150, 9000);
  T.reset();
  reset();
  T.OVER.ovos(eggs, 9100);
  assert.equal(calls.fills.filter(fill => fill[4] === '#56c860').length, 0, 'sem cria depois do reset');
});

test('desenho de tema: todo bicho e toda cena desenha sem erro, só com retângulos, e os vestígios (ovos e gosma) também', () => {
  const { helpers, calls } = fakeHelpers();
  const T = globalThis.ArraiaMundoTemas.create(helpers);
  for (const [name, draw] of Object.entries(T.DRAW)) {
    calls.fills.length = 0;
    if (name === 'bat') draw(10, 10, 1000, 0);
    else if (name === 'egg') draw(50, 100, 2, 1000, 0, 1);
    else if (name === 'meteor') draw(100, 30, 10, 1, 1000);
    else if (name === 'giant') draw(100, 160, 1, 1000, 0, 2);
    else if (name === 'jack') draw(50, 100, true, 1000, 0, true);
    else if (name === 'ghost') draw(50, 100, 0.7, 1000, 0);
    else if (name === 'spider') draw(50, 40, 2, 1000, 0);
    else if (name === 'zombie') draw(50, 100, -1, 1000, 0, '#f0b898');
    else if (name === 'grave') draw(50, 150, 6, false, 1000, 0);
    else if (name === 'heli') draw(50, 30, -1, 1000);
    else draw(50, 100, 1, 1000, 0);
    assert.ok(calls.fills.length > 5, `${name}: desenhou`);
    assert.ok(calls.fills.every(fill => fill.slice(0, 4).every(Number.isFinite)), `${name}: só números`);
  }
  for (const id of Object.values(THEMES).flat()) {
    const entry = cfg.eventos.find(item => item.id === id);
    for (const t of [1500, 8000, entry.seconds * 1000 - 2000]) {
      calls.fills.length = 0;
      const c = eventC(id, t);
      c.items = [];
      for (let k = 0; k < entry.targets; k++) { const item = T.TARGETS[id](c, k, LAY); if (item) c.items.push({ k, ...item }); }
      assert.doesNotThrow(() => { (T.SKY[id] || (() => {}))(c, 100000 + t); T.OVER[id](c, 100000 + t); }, `${id} @${t}`);
      assert.ok(calls.fills.every(fill => fill.slice(0, 4).every(Number.isFinite)), `${id} @${t}: só números`);
    }
  }
  for (const id of ['ovos', 'gosma']) {
    calls.fills.length = 0;
    T.TRACE[id](0.8, 0, 1000, LAY, 12345);
    assert.ok(calls.fills.length > 4, `${id}: vestígios`);
  }
  assert.deepEqual(Object.keys(globalThis.ArraiaMundoTemas.TRACE_MS).sort(), ['gosma', 'ovos']);
});

test('desenho de tema: as abóboras acendem uma de cada vez (só a próxima da ordem pulsa) e as pegas ficam acesas; as covas se esvaziam', () => {
  const { helpers, calls } = fakeHelpers();
  const T = globalThis.ArraiaMundoTemas.create(helpers);
  const lit = c => { calls.fills.length = 0; T.OVER.abobora(c, 100000 + 10000); return calls.fills.filter(fill => fill[4] === '#fff07a').length; };
  const base = eventC('abobora', 10000);
  base.items = [];
  const none = lit(base);
  assert.ok(none > 0, 'a primeira abóbora já está acesa');
  const two = lit({ ...base, got: new Set([0, 1]) });
  assert.ok(two > none, 'as duas pegas e a próxima ficam acesas (mais luz que só a primeira)');
  const all = lit({ ...base, got: new Set([0, 1, 2, 3, 4, 5]) });
  assert.ok(all >= two, 'todas acesas no fim');
  // Gosma: a poça só aparece debaixo da gota que bateu no chão sem ser estourada.
  const gosma = eventC('gosma', 44500);
  gosma.items = [];
  calls.fills.length = 0;
  T.OVER.gosma(gosma, 144500);
  const puddles = calls.fills.filter(fill => fill[4] === '#3aa82a').length;
  assert.ok(puddles >= 8, 'uma poça por gota que caiu');
  calls.fills.length = 0;
  T.OVER.gosma({ ...gosma, got: new Set([0, 1, 2, 3, 4, 5, 6, 7]) }, 144500);
  assert.equal(calls.fills.filter(fill => fill[4] === '#3aa82a').length, 0, 'as gotas estouradas não fazem poça');
  calls.fills.length = 0;
  T.OVER.gosma(eventC('gosma', 4000), 104000);
  assert.equal(calls.fills.filter(fill => fill[4] === '#3aa82a').length, 0, 'no começo ainda não caiu nenhuma');
  // Cova pega: o raminho de flor (rosa) no monte e sem a mão verde.
  const surto = eventC('surto', 20000);
  calls.fills.length = 0;
  T.OVER.surto(surto, 120000);
  const hands = calls.fills.filter(fill => fill[4] === '#8ab870').length;
  assert.ok(hands > 0, 'as mãos verdes saindo das covas');
  calls.fills.length = 0;
  T.OVER.surto({ ...surto, got: new Set([0, 1, 2, 3]) }, 120000);
  assert.equal(calls.fills.filter(fill => fill[4] === '#8ab870').length, 0, 'sem mão depois de empurrar todas');
  assert.ok(calls.fills.some(fill => fill[4] === '#ff8ac8'), 'flor no monte');
});

test('modo de teste: começa qualquer evento do mundo completando o que ele pede (porte mínimo e, nos de tema, o conjunto do tema vestido)', () => {
  const { engine } = newEngine(1);
  engine.state.size = engine.state.records.size = 1;
  // Um evento do céu com porte alto: a festa sobe até o mínimo e nada é vestido.
  const note = engine.debug('evento', 'eclipse');
  assert.equal(note, 'Evento do mundo: Eclipse');
  assert.equal(engine.state.size, cfg.eventos.find(entry => entry.id === 'eclipse').minSize);
  assert.equal(engine.mundo.active().entry.id, 'eclipse');
  assert.equal(engine.wornTheme(), null, 'evento do céu não veste nada');
  assert.deepEqual(engine.state.log.at(-1) && { type: engine.state.log.at(-1).type, op: engine.state.log.at(-1).op, id: engine.state.log.at(-1).id }, { type: 'debug', op: 'evento', id: 'eclipse' });
  assert.equal(engine.testing, false);
  // Um de tema: encerra o que estava no ar, completa o porte e veste um conjunto completo do tema (as peças são dadas).
  engine.state.weather.rain = { until: engine.now() + 60000 };
  const before = engine.state.size;
  assert.equal(engine.debug('evento', 'surto'), 'Evento do mundo: Surto zumbi');
  assert.equal(engine.mundo.active().entry.id, 'surto', 'trocou o evento no ar');
  assert.equal(engine.state.weather.rain, null, 'e a chuva parou');
  assert.ok(engine.state.size >= before && engine.state.size >= 25);
  assert.equal(engine.wornTheme(), 'zumbi');
  for (const piece of ['cerebro-exposto', 'mao-zumbi', 'farrapos-zumbi']) assert.ok(engine.owned(piece), piece);
  // Trocou de tema: o conjunto novo substitui o antigo.
  engine.debug('evento', 'bruxas');
  assert.equal(engine.wornTheme(), 'halloween');
  // Já vestindo outro conjunto do mesmo tema, a roupa fica como está.
  wear(engine, 'paleontologo');
  const equipped = { ...engine.state.equipped };
  engine.debug('evento', 'ovos');
  assert.deepEqual(engine.state.equipped, equipped, 'o conjunto de dinossauros que já estava vestido continua');
  assert.equal(engine.wornTheme(), 'dino');
  // Id que não existe não faz nada (e não mexe no que está no ar).
  assert.equal(engine.debug('evento', 'nao-existe'), null);
  assert.equal(engine.debug('evento', ''), null);
  assert.equal(engine.mundo.active().entry.id, 'ovos');
});

test('modo de teste: todos os eventos começam pelo botão, a partir de uma festa de 1 convidado, e o botão de encerrar acaba com o que está no ar', () => {
  for (const entry of cfg.eventos) {
    const { engine } = newEngine(1);
    engine.state.size = engine.state.records.size = 1;
    assert.ok(engine.debug('evento', entry.id), entry.id);
    assert.equal(engine.mundo.active().entry.id, entry.id, `${entry.id}: no ar`);
    assert.ok(engine.state.size >= entry.minSize, `${entry.id}: porte mínimo`);
    assert.equal(engine.wornTheme(), entry.tema || null, `${entry.id}: conjunto`);
    assert.equal(engine.debug('evento-fim'), 'Evento do mundo encerrado');
    assert.equal(engine.state.mundo.active, null, `${entry.id}: encerrado`);
    assert.ok(engine.state.mundo.nextAt > 0, 'e já marca o próximo');
  }
  const { engine } = newEngine(30);
  assert.equal(engine.debug('evento-fim'), 'Nenhum evento no ar');
});
