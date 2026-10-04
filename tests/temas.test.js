const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../src/data.js');
const { GameEngine } = require('../src/core.js');
const I18N = require('../src/i18n.js');
const { fakeContext, fakeDocument } = require('./fake-dom');

require('../src/festa-sprites.js');
const bundle = globalThis.FESTA_SPRITES;

// Os três temas novos da loja: dinossauros, Halloween e terra de zumbis (arte em art/tema_*.py).
const TEMAS = {
  dino: {
    chapeu: ['capuz-dino', 'crista-estegossauro'], mao: ['osso-dino', 'ovo-dino'], tecido: ['pele-dino'], terreiro: ['fossil', 'jurassico', 'ninho'],
    lado: ['rex-sanfoneiro', 'ovo-quadrilha', 'vulcao-pipoca', 'bronto-varal'], conjuntos: ['era-jurassica', 'paleontologo']
  },
  halloween: {
    chapeu: ['chapeu-bruxa', 'abobora-cabeca', 'fantasminha'], mao: ['vassoura-bruxa', 'balde-doces', 'lanterna-abobora'], tecido: ['teias-aboboras'],
    terreiro: ['aboboral', 'cemiterio', 'mansao'], lado: ['caldeirao-canjica', 'casinha-pe-de-galinha', 'pescaria-fantasmas', 'esqueleto-quadrilha'], conjuntos: ['bruxa', 'doce-ou-travessura', 'assombracao']
  },
  zumbi: {
    chapeu: ['cerebro-exposto', 'capacete-sobrevivente'], mao: ['mao-zumbi', 'taco-pregos', 'antidoto'], tecido: ['farrapos-zumbi'],
    terreiro: ['asfalto-zumbi', 'cova-zumbi', 'gosma-toxica'], lado: ['barraca-miolo', 'kombi-pamonha', 'casal-zumbi-quadrilha', 'banheiro-quimico'],
    conjuntos: ['zumbi-de-festa', 'sobrevivente', 'apocalipse']
  }
};
const CATS = ['chapeu', 'mao', 'tecido', 'terreiro', 'lado'];
const IDS = Object.values(TEMAS).flatMap(tema => CATS.flatMap(cat => tema[cat]));
const byId = Object.fromEntries(data.items.map(item => [item.id, item]));
const localized = lang => I18N.localizeData(JSON.parse(JSON.stringify(data)), lang);

function bigGame() {
  const engine = new GameEngine(data, null, { rng: () => 0.3 });
  while (engine.state.size < 120) engine.addFame(engine.fameNeed() - engine.state.fame);
  return engine;
}

test('temas: cada tema tem chão, cenário, chapéu, item de mão e tecido para comprar, cada um na sua categoria', () => {
  assert.equal(IDS.length, 39);
  assert.equal(new Set(IDS).size, 39, 'sem id repetido');
  for (const [nome, tema] of Object.entries(TEMAS)) {
    for (const cat of CATS) {
      assert.ok(tema[cat].length >= 1, `${nome}: tem ${cat}`);
      for (const id of tema[cat]) assert.equal(byId[id]?.cat, cat, `${id} é ${cat}`);
    }
    assert.ok(tema.terreiro.length >= 3 && tema.lado.length >= 3 && tema.chapeu.length >= 2 && tema.mao.length >= 2, `${nome}: variedade`);
  }
  for (const id of IDS) {
    const item = byId[id];
    assert.ok(item.price >= 26 && item.price <= 54 && !item.source, `${id}: se compra com fichas, no mesmo patamar dos itens caros (${item.price})`);
    assert.ok([2, 3, 4].includes(item.tier), `${id}: libera por porte da Festa da Cidade em diante`);
    assert.ok(item.name && item.desc && item.desc.length > 20, `${id}: nome e descrição`);
    if (item.cat === 'lado') assert.equal(item.kind, 'enfeite', `${id}: cenário é enfeite (vai à esquerda ou à direita)`);
  }
});

test('temas: nome e descrição existem e estão traduzidos para inglês e espanhol', () => {
  const books = { en: localized('en'), es: localized('es') };
  for (const id of IDS) {
    for (const [lang, book] of Object.entries(books)) {
      const item = book.items.find(entry => entry.id === id);
      assert.ok(item.name && item.desc, `${lang}/${id}`);
      assert.notEqual(item.desc, byId[id].desc, `${lang}/${id}: descrição traduzida`);
      assert.doesNotMatch(item.desc, /[ãõç]/i, `${lang}/${id}: sem sobra de português`);
    }
  }
  for (const set of data.sets.filter(entry => Object.values(TEMAS).some(tema => tema.conjuntos.includes(entry.id)))) {
    for (const [lang, book] of Object.entries(books)) assert.notEqual(book.sets.find(entry => entry.id === set.id).name, set.name, `${lang}/${set.id}`);
  }
});

test('temas: a arte de cada item está no pacote (chapéus e mãos com tamanhos menores, tecidos em todos os tamanhos, cenários animados, ícones)', () => {
  for (const tema of Object.values(TEMAS)) {
    for (const id of tema.chapeu) {
      assert.ok(bundle.hats[id].w > 10 && bundle.hats[id].growth.length === 3, `chapéu ${id}`);
      assert.ok(bundle.hats[id].oy <= -1, `${id}: sobe do topo da cabeça pelo oy`);
    }
    for (const id of tema.mao) {
      assert.ok(bundle.hand[id].frames >= 2 && bundle.hand[id].growth.length === 3 && bundle.hand[id].pivot.length === 2, `mão ${id}`);
    }
    for (const id of tema.tecido) {
      assert.ok(bundle.mandioca[id].image, `tecido ${id}`);
      for (const kit of bundle.mandioca.growth) assert.ok(kit.sheets[id], `tecido ${id} em todos os tamanhos`);
    }
    for (const id of tema.lado) {
      const side = bundle.sides[id];
      assert.ok(side.frames >= 4, `${id} se mexe (${side.frames} quadros)`);
      assert.ok(side.fps >= 2 && side.w >= 28 && side.w <= 50 && side.h >= 30 && side.h <= 56, `${id}: cabe ao lado da festa (${side.w}x${side.h})`);
    }
    for (const id of [...tema.chapeu, ...tema.mao, ...tema.tecido, ...tema.terreiro, ...tema.lado]) assert.ok(bundle.icons[`item:${id}`], `ícone de ${id}`);
  }
});

test('temas: os terreiros têm paleta completa e decorações bem formadas (cada letra tem cor, todas as linhas do mesmo tamanho)', () => {
  const chaves = ['top', 'mid', 'sub', 'soil', 'deep', 'low', 'edge', 'speck', 'flowers', 'tuft', 'root'];
  for (const tema of Object.values(TEMAS)) {
    for (const id of tema.terreiro) {
      const palette = bundle.terrains[id];
      for (const chave of chaves) assert.ok(Array.isArray(palette[chave]), `${id}.${chave}`);
      for (const chave of ['top', 'mid', 'sub', 'soil', 'deep', 'low', 'edge', 'speck']) assert.ok(palette[chave].length >= 1 && palette[chave].every(cor => /^#[0-9a-f]{6}$/i.test(cor)), `${id}.${chave}`);
      assert.ok(palette.deco.length >= 5 && palette.decoGap >= 14 && palette.decoGap <= 30, `${id}: decoração`);
      assert.ok(palette.buried.length >= 4 && palette.buriedGap >= 10 && palette.buriedGap <= 20, `${id}: peças enterradas no corte da terra`);
      const bem = (nome, lista, altura, largura) => {
        for (const piece of lista) {
          assert.ok(piece.rows.length >= 3 && piece.rows.length <= altura, `${id}.${nome}: altura (${piece.rows.length})`);
          assert.ok(piece.rows[0].length >= 3 && piece.rows[0].length <= largura, `${id}.${nome}: largura (${piece.rows[0].length})`);
          assert.ok(piece.rows.every(row => row.length === piece.rows[0].length), `${id}.${nome}: linhas do mesmo tamanho`);
          for (const letra of new Set(piece.rows.join('').replace(/\./g, ''))) assert.match(piece.colors[letra] || '', /^#[0-9a-f]{6}$/i, `${id}.${nome}: cor da letra ${letra}`);
        }
      };
      bem('deco', palette.deco, 18, 20);
      bem('buried', palette.buried, 16, 24);
      if (palette.pattern === 'strata') assert.ok(palette.strata.length >= 4 && palette.strata.every(cor => /^#[0-9a-f]{6}$/i.test(cor)), `${id}: camadas de sedimento`);
    }
  }
  assert.equal(bundle.terrains.fossil.pattern, 'strata');
  assert.equal(bundle.terrains.ninho.pattern, 'strata');
  assert.equal(bundle.terrains['asfalto-zumbi'].pattern, 'road');
  assert.equal(bundle.terrains.mansao.pattern, 'checker');
});

test('temas: os conjuntos fecham com chapéu, mão e tecido do mesmo tema e rendem o bônus (sem repetir a combinação)', () => {
  const seen = new Set();
  for (const [nome, tema] of Object.entries(TEMAS)) {
    for (const id of tema.conjuntos) {
      const set = data.sets.find(entry => entry.id === id);
      assert.ok(set, id);
      assert.ok(tema.chapeu.includes(set.hat) && tema.mao.includes(set.hand) && tema.tecido.includes(set.fabric), `${id}: peças do tema ${nome}`);
      assert.ok(set.bonus >= 0.1 && set.bonus <= 0.12, `${id}: bônus entre os dos conjuntos caros`);
      const key = [set.hat, set.hand, set.fabric].join('/');
      assert.ok(!seen.has(key), `${id}: combinação única`);
      seen.add(key);
    }
  }
  // Cada peça entra em algum conjunto do tema.
  for (const tema of Object.values(TEMAS)) {
    const sets = tema.conjuntos.map(id => data.sets.find(entry => entry.id === id));
    for (const id of [...tema.chapeu, ...tema.mao, ...tema.tecido]) assert.ok(sets.some(set => [set.hat, set.hand, set.fabric].includes(id)), `${id} entra num conjunto`);
  }
  const engine = bigGame();
  for (const id of TEMAS.zumbi.conjuntos) {
    const set = data.sets.find(entry => entry.id === id);
    for (const piece of [set.hat, set.hand, set.fabric]) { engine.state.inventory.push(piece); engine.equip(piece); }
    assert.equal(engine.activeSet().id, id);
    assert.equal(engine.setBonus(), set.bonus);
  }
});

test('temas: só se compra quando a festa chega ao porte do item, e paga em fichas', () => {
  const fresh = new GameEngine(data, null, { rng: () => 0.5 });
  fresh.state.tickets = 5000;
  for (const id of IDS) {
    assert.equal(fresh.itemLocked(id), true, `${id} começa trancado`);
    assert.equal(fresh.buyItem(id), false, `${id} não vende antes do porte`);
  }
  const big = bigGame();
  big.state.tickets = 5000;
  let gasto = 0;
  for (const id of IDS) {
    assert.equal(big.itemLocked(id), false, `${id} destrancou`);
    assert.equal(big.buyItem(id), true, `compra ${id}`);
    gasto += byId[id].price;
  }
  assert.equal(big.state.tickets, 5000 - gasto);
  assert.equal(big.buyItem(IDS[0]), false, 'já tem');
});

test('temas: a festa veste, pisa e decora cada item (cenários nos dois lados, terreiros com as decorações próprias)', () => {
  const pintadas = new Set();
  const doc = fakeDocument([], { drawImage: 0 });
  const original = doc.createElement;
  doc.createElement = tag => {
    const element = original(tag);
    if (tag === 'canvas') {
      const base = fakeContext();
      element.getContext = () => ({ ...base, fillRect() { pintadas.add(this.fillStyle); } });
    }
    return element;
  };
  globalThis.document = doc;
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(doc.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = bigGame();
  let now = 9000;
  const run = n => { for (let i = 0; i < n; i++) festa.draw(engine, (now += 40)); };
  for (const id of IDS) engine.state.inventory.push(id);
  for (const tema of Object.values(TEMAS)) {
    for (const cat of ['chapeu', 'mao', 'tecido', 'terreiro']) {
      for (const id of tema[cat]) {
        assert.ok(engine.equip(id), `veste ${id}`);
        run(4);
        festa.draw(engine, (now += 40), { [cat]: id });
      }
    }
    for (const id of tema.lado) {
      assert.ok(engine.equip(id, 'esquerda'), `${id} à esquerda`);
      run(4);
      assert.ok(engine.equip(id, 'direita'), `${id} à direita`);
      run(4);
      assert.equal(engine.state.equipped.direita, id);
    }
  }
  // Cada terreiro desenhou as peças dele (em pé e enterradas): pelo menos duas das cores que só elas usam.
  const proprias = {
    fossil: ['#f6efd8', '#3a78d8', '#e89a2a', '#6a4a28', '#ee2f3c'], jurassico: ['#2f9a3a', '#7ae060', '#c86aff', '#8a5a2a', '#ee2f3c'],
    ninho: ['#c8f0d8', '#f4ecc8', '#7ad060', '#f0c050', '#9ac4ff'], aboboral: ['#ffc23a', '#3a8a2a', '#e8c050', '#fff07a', '#d85a0a'],
    cemiterio: ['#3a3a4c', '#8a8aa0', '#b4b4cc', '#f4ecd8', '#4a7a4a'], mansao: ['#c8bca0', '#fff07a', '#f0f4ff', '#c4c0d0', '#8a1c28'],
    'asfalto-zumbi': ['#f4f4f4', '#ff7a1a', '#e8302c', '#2a2a34', '#3a78d8'], 'cova-zumbi': ['#7aa850', '#587a38', '#7a5028', '#f0c050', '#e8302c'],
    'gosma-toxica': ['#e8e020', '#4a8a2a', '#8a8e9c', '#e8302c', '#fffaf0']
  };
  for (const [id, cores] of Object.entries(proprias)) assert.ok(cores.filter(cor => pintadas.has(cor)).length >= 2, `peças de ${id} (${cores.join(' ')})`);
});

test('temas: ter todos os itens de um tema abre a conquista dele (só com o último item, uma vez só) e a conta aparece no progresso', () => {
  const ligacao = { dino: 'era-dos-dinossauros', halloween: 'noite-de-halloween', zumbi: 'apocalipse-zumbi' };
  assert.deepEqual(data.themes.map(theme => [theme.id, theme.achievement]), Object.entries(ligacao));
  for (const [nome, tema] of Object.entries(TEMAS)) {
    const ids = CATS.flatMap(cat => tema[cat]);
    assert.deepEqual(ids.map(id => byId[id].tema), ids.map(() => nome), `${nome}: todos os itens têm o tema`);
    assert.ok(data.achievements.some(entry => entry.id === ligacao[nome]), `${nome}: conquista existe`);
    const engine = bigGame();
    assert.deepEqual(engine.achievementProgress(ligacao[nome]), [0, ids.length]);
    ids.slice(0, -1).forEach(id => engine.addItem(id));
    assert.equal(engine.state.achievements.includes(ligacao[nome]), false, `${nome}: falta um`);
    assert.deepEqual(engine.achievementProgress(ligacao[nome]), [ids.length - 1, ids.length]);
    // Itens de outros temas não contam.
    for (const outro of Object.keys(TEMAS)) if (outro !== nome) assert.equal(engine.achievementProgress(ligacao[outro])[0], 0, `${outro} ainda zerado`);
    engine.addItem(ids.at(-1));
    assert.equal(engine.state.achievements.filter(id => id === ligacao[nome]).length, 1, `${nome}: abriu`);
    assert.deepEqual(engine.achievementProgress(ligacao[nome]), [ids.length, ids.length]);
    assert.equal(engine.addItem(ids[0]), false, 'comprar de novo não faz nada');
    assert.equal(engine.state.achievements.filter(id => id === ligacao[nome]).length, 1, 'uma vez só');
    assert.deepEqual(engine.themeCount(nome), [ids.length, ids.length]);
  }
  // As conquistas têm nome e texto traduzidos.
  for (const lang of ['en', 'es']) {
    const book = localized(lang);
    for (const id of Object.values(ligacao)) {
      const entry = book.achievements.find(item => item.id === id);
      assert.ok(entry.name && entry.text, `${lang}/${id}`);
      assert.notEqual(entry.text, data.achievements.find(item => item.id === id).text, `${lang}/${id}: traduzido`);
    }
  }
});

test('temas: o gerador de terreiro põe as peças enterradas no corte da terra (abaixo da superfície), as decorações em pé acima dela, sem sobreposição, e as camadas só no padrão strata', () => {
  const doc = fakeDocument([], { drawImage: 0 });
  const original = doc.createElement;
  let pixels = [];
  doc.createElement = tag => {
    const element = original(tag);
    if (tag === 'canvas') {
      const base = fakeContext();
      element.getContext = () => ({ ...base, fillRect(x, y, w, h) { pixels.push([this.fillStyle, x, y, w, h]); } });
    }
    return element;
  };
  globalThis.document = doc;
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(doc.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = bigGame();
  engine.state.inventory.push('fossil', 'jurassico');
  let now = 9000;
  const desenha = id => {
    pixels = [];
    assert.ok(engine.equip(id));
    festa.draw(engine, (now += 40), { terreiro: id });
    festa.draw(engine, (now += 40));
    return pixels;
  };
  // Sítio de Fósseis: o osso (cor cremosa) aparece em pé na beirada (decoração) e enterrado no corte (peça enterrada), e as camadas de sedimento pintam a terra.
  const fossil = desenha('fossil');
  const palette = bundle.terrains.fossil;
  const top = Math.max(...palette.deco.map(piece => piece.rows.length));
  const bone = fossil.filter(([cor]) => cor === '#f6efd8');
  assert.ok(bone.some(([, , y]) => y < top), 'osso em pé em cima da superfície');
  assert.ok(bone.some(([, , y]) => y >= top + 5), 'fóssil enterrado no corte da terra');
  for (const cor of ['#d0b078', '#9a7040']) assert.ok(fossil.some(([c, , y]) => c === cor && y >= top + 4), `a camada de sedimento ${cor} pinta a terra (e só vem do padrão strata)`);
  // Cada peça enterrada fica inteira dentro da terra: nenhum pixel dela aparece acima da superfície (o âmbar só existe como peça enterrada).
  const amber = fossil.filter(([cor]) => cor === '#e89a2a');
  assert.ok(amber.every(([, , y]) => y >= top + 5), 'o âmbar enterrado nunca sai da terra');
  // A selva não usa camadas: a terra dela vem das paletas de sempre, mas também ganha peças enterradas (âmbar com mosquito, ovo, raízes).
  const selva = desenha('jurassico');
  assert.equal(bundle.terrains.jurassico.pattern, undefined);
  assert.equal(bundle.terrains.jurassico.strata, undefined);
  const topoSelva = Math.max(...bundle.terrains.jurassico.deco.map(piece => piece.rows.length));
  assert.ok(selva.some(([cor, , y]) => cor === '#e89a2a' && y >= topoSelva + 5), 'âmbar enterrado na selva');
});

test('temas: as peças enterradas nunca se sobrepõem nem passam do fundo da terra (blocos sólidos contam exatamente os pixels)', () => {
  const doc = fakeDocument([], { drawImage: 0 });
  const original = doc.createElement;
  let pixels = [];
  doc.createElement = tag => {
    const element = original(tag);
    if (tag === 'canvas') {
      const base = fakeContext();
      element.getContext = () => ({ ...base, fillRect(x, y, w, h) { pixels.push([this.fillStyle, x, y, w, h]); } });
    }
    return element;
  };
  globalThis.document = doc;
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const engine = bigGame();
  engine.state.inventory.push('fossil');
  engine.equip('fossil');
  const palette = bundle.terrains.fossil;
  const guardado = { buried: palette.buried, buriedGap: palette.buriedGap, deco: palette.deco, decoGap: palette.decoGap };
  let now = 20000;
  const blocos = (largura, altura, cor, gap) => {
    palette.buried = [{ rows: Array.from({ length: altura }, () => 'X'.repeat(largura)), colors: { X: cor } }];
    palette.buriedGap = gap;
    // Uma festa nova para cada desenho: o terreiro pronto fica em cache e não seria gerado de novo.
    const festa = globalThis.ArraiaFesta.create(doc.createElement('canvas'), bundle);
    festa.setScale(3);
    pixels = [];
    festa.draw(engine, (now += 40), { terreiro: 'fossil' });
    festa.draw(engine, (now += 40));
    assert.ok(pixels.length > 1000, 'o terreiro foi gerado de verdade');
    return pixels.filter(([c]) => c === cor).length;
  };
  try {
    // Blocos de 6x6 bem apertados: se nenhum se sobrepõe, cada um pinta 36 pixels inteiros (o total é múltiplo de 36) e dá para ter vários.
    const cheios = blocos(6, 6, '#123456', 7);
    assert.ok(cheios >= 36 * 3, `vários blocos cabem (${cheios} pixels)`);
    assert.equal(cheios % 36, 0, 'nenhum bloco enterrado cobre outro');
    // Um bloco mais fundo do que a terra nunca é posto (e o jogo continua desenhando).
    assert.equal(blocos(8, 40, '#654321', 7), 0, 'peça mais funda que a terra fica de fora');
  } finally {
    Object.assign(palette, guardado);
  }
});
