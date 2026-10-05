const test = require('node:test');
const assert = require('node:assert/strict');
const I18N = require('../src/i18n.js');
const data = require('../src/data.js');
const { GameEngine } = require('../src/core.js');
const { fakeDocument } = require('./fake-dom');

require('../src/festa-sprites.js');
const Mq = require('../src/festa-mandioquinhas.js');

const bundle = globalThis.FESTA_SPRITES;
const langs = I18N.dictionaries();
const ids = I18N.LANGUAGES.map(lang => lang.id);
const { ROSTER, ILHAS, CAST, PAL, MANIAS } = Mq;
// Quantas mandioquinhas o cenário pode ter (o `max` do item do ciclo): uma personalidade para cada.
const MAX = data.scenery.cycle.find(entry => entry.id === 'mandioquinha').max;
const FONT = /^[A-Z0-9+\-.,!?: ]*$/;

// O navegador carrega os módulos como globais; no Node eles só são exportados, e o teste que precisa da festa com eles liga o global só enquanto roda
// (senão todos os outros testes da festa passariam a ter a plateia e as mandioquinhas ligadas).
const comGlobais = (globais, corpo) => () => {
  const antes = Object.keys(globais).map(chave => [chave, globalThis[chave]]);
  Object.assign(globalThis, globais);
  try { corpo(); } finally { for (const [chave, valor] of antes) { if (valor === undefined) delete globalThis[chave]; else globalThis[chave] = valor; } }
};
const plain = text => text.normalize('NFD').replace(/[̀-ͯ]/g, '');

test('mandioquinhas: uma por vaga do cenário (mais as quatro das ilhas), cada uma com id, nome, jeito e fala próprios em todos os idiomas', () => {
  assert.equal(ROSTER.length, MAX);
  assert.equal(ILHAS.length, 4, 'duas em cada ilha flutuante');
  assert.deepEqual(CAST, [...ROSTER, ...ILHAS]);
  assert.equal(new Set(CAST.map(entry => entry.id)).size, CAST.length, 'ids únicos');
  for (const lang of ids) {
    const ui = langs[lang].ui;
    const names = new Set();
    const lines = new Set();
    const traits = new Set();
    for (const entry of CAST) {
      const name = ui[`fx.mq.${entry.id}.n`], line = ui[`fx.mq.${entry.id}.s`], trait = ui[`mq.${entry.id}.t`];
      assert.ok(name && line && trait, `${lang}: ${entry.id} tem nome, fala e jeito`);
      // Nome e fala saem em letras de pixel da festa: só a fonte do jogo (sem apóstrofo nem sinais invertidos).
      assert.match(plain(name), FONT, `${lang}: nome de ${entry.id}`);
      assert.match(plain(line), FONT, `${lang}: fala de ${entry.id}`);
      assert.ok(name.length <= 22 && line.length <= 30, `${lang}: ${entry.id} cabe na festa`);
      names.add(name); traits.add(trait);
      lines.add(line);
    }
    // A Bia e a Pipoca repetem a fala entre idiomas ("La la la!", "POP POP POP!"), mas dentro de um idioma o nome e o jeito são de uma só.
    assert.equal(names.size, CAST.length, `${lang}: nomes únicos`);
    assert.equal(traits.size, CAST.length, `${lang}: jeitos únicos`);
    assert.ok(lines.size >= CAST.length - 2, `${lang}: falas únicas`);
  }
  for (const lang of ids) assert.ok(langs[lang].ui['fx.mq.new'].includes('{n}'), `${lang}: o aviso de mandioquinha nova leva o nome`);
});

test('mandioquinhas: cada desenho é único, cabe em 7x10 pixels (mais o acessório) e só usa cores da paleta', () => {
  const seen = new Set();
  const voices = new Set();
  for (const entry of CAST) {
    const layers = [...(entry.behind || []), ...entry.art];
    assert.ok(layers.length, `${entry.id}: tem acessório`);
    for (const [x, y, rows] of layers) {
      for (const row of rows) {
        for (const ch of row) assert.ok(ch === '.' || PAL[ch], `${entry.id}: cor ${ch}`);
        assert.ok(x + row.length <= 8 && x >= -1, `${entry.id}: largura (${x}, ${row.length})`);
      }
      assert.ok(y >= -4 && y + rows.length <= 10, `${entry.id}: altura (${y}, ${rows.length})`);
    }
    assert.ok(entry.face.length <= 4 && entry.face.every(row => row.length <= 3), `${entry.id}: rosto 3x4`);
    for (const row of entry.face) for (const ch of row) assert.ok(ch === '.' || PAL[ch], `${entry.id}: cor do rosto ${ch}`);
    const signature = JSON.stringify([entry.behind || [], entry.art, entry.face]);
    assert.ok(!seen.has(signature), `${entry.id}: desenho repetido`);
    seen.add(signature);
    assert.ok(entry.quirk.length && entry.quirk.every(kind => MANIAS.includes(kind)), `${entry.id}: mania conhecida`);
    assert.equal(typeof entry.voice, 'number');
    assert.ok(entry.voice >= -12 && entry.voice <= 14, `${entry.id}: tom`);
    voices.add(entry.voice);
  }
  assert.equal(voices.size, CAST.length, 'cada uma tem a sua voz');
  // Nenhuma mania da lista fica sem dona.
  for (const kind of MANIAS) assert.ok(CAST.some(entry => entry.quirk.includes(kind)), `mania ${kind} sem dona`);
});

// Uma festa de mentira só com o que o módulo usa: o desenho vira uma lista de retângulos.
function fakeFesta(options = {}) {
  const rects = [];
  const says = [];
  const floats = [];
  const fx = { particles: [], texts: [] };
  let now0 = 0;
  const g = { fillStyle: '', fillRect(x, y, w, h) { rects.push({ x, y, w, h, color: this.fillStyle }); } };
  const calm = { on: !!options.calm };
  const mq = Mq.create({
    g, rng: options.rng || (() => 0.5), fx: () => fx, tr: (key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key), calm: () => calm.on,
    say: (text, x, y, now, color, ttl, rise) => { says.push({ text, x, y, now, color, ttl, rise }); return {}; },
    float: (shape, x, y, now, colors) => floats.push({ shape, x, y, now, colors })
  });
  return { mq, rects, says, floats, fx, calm, clock: () => now0 };
}

test('mandioquinhas: o desenho de cada uma pinta o rosto, o acessório e o que vai atrás do sprite, e a piscada só nas que piscam', () => {
  CAST.forEach((entry, i) => {
    const f = fakeFesta();
    f.mq.back(i, 10, 20, 100);
    const behind = f.rects.length;
    assert.equal(behind > 0, !!entry.behind, `${entry.id}: atrás só quem tem asa, capa ou parecido`);
    f.mq.front(i, 10, 20, 100);
    assert.ok(f.rects.length > behind, `${entry.id}: pinta na frente`);
    // Cada pixel fica a poucos pixels do sprite (nada voando longe).
    for (const rect of f.rects) assert.ok(rect.x >= 0 && rect.x <= 25 && rect.y >= 12 && rect.y <= 30, `${entry.id}: ${rect.x},${rect.y}`);
  });
  // A piscada: os olhos viram casca escura por uns instantes. Quem tem os olhos desenhados de outro jeito não pisca.
  const eyeDraws = (i, now) => {
    const f = fakeFesta();
    f.mq.front(i, 0, 0, now);
    return f.rects.filter(rect => rect.color === PAL[2] && rect.y === 4 && (rect.x === 2 || rect.x === 4)).length;
  };
  const phase = i => ((i * 2654435761) >>> 0) % 4200;
  for (const [i, entry] of CAST.entries()) {
    const blinkAt = 4200 - phase(i);               // (now + fase) % 4200 === 0
    assert.equal(eyeDraws(i, blinkAt + 20), entry.blink === false ? 0 : 2, `${entry.id}: piscada`);
    assert.equal(eyeDraws(i, blinkAt + 2000), 0, `${entry.id}: de olho aberto`);
  }
});

test('mandioquinhas: o rosto troca os pixels certos (3 colunas a partir de x 2, a partir de y 3) e os acessórios ficam onde foram desenhados', () => {
  const paint = (id, x = 0, y = 0) => {
    const f = fakeFesta();
    const i = ROSTER.findIndex(entry => entry.id === id);
    f.mq.back(i, x, y, 100);
    f.mq.front(i, x, y, 100 + 2000 - (((i * 2654435761) >>> 0) % 4200));      // olhos abertos
    const at = (px, py) => f.rects.filter(rect => rect.x === px && rect.y === py).map(rect => rect.color).at(-1);
    return at;
  };
  const lulu = paint('lulu');
  assert.equal(lulu(2, 3), PAL.H, 'olho de coração, em cima');
  assert.equal(lulu(2, 4), PAL.R, 'e embaixo');
  assert.equal(lulu(4, 4), PAL.R);
  assert.equal(lulu(3, 6), PAL.m, 'o sorriso');
  assert.equal(lulu(5, 0), PAL.A, 'a flor no cabelo');
  const zumbi = paint('zumbi');
  assert.equal(zumbi(2, 3), PAL[9], 'o olho grande');
  assert.equal(zumbi(2, 4), PAL.G);
  assert.equal(zumbi(4, 4), undefined, 'o outro olho fica o de fábrica');
  const mandi = paint('mandi', 10, 20);
  assert.equal(mandi(12, 18), PAL.A, 'a auréola');
  assert.equal(mandi(9, 24), PAL[9], 'a asa atrás do corpo');
  assert.equal(mandi(12, 25), PAL.m, 'o sorriso: cantos em 2,5 e 4,5');
  assert.equal(mandi(13, 26), PAL.m, 'e o meio embaixo, em 3,6');
  assert.equal(mandi(13, 25), PAL['3'], 'o meio da boca é casca (a bochecha de fábrica sumiu)');
  const dorminhoco = paint('dorminhoco', 4, 4);
  assert.equal(dorminhoco(5, 8), PAL.e, 'olho fechado: um traço de dois pixels');
  assert.equal(dorminhoco(9, 2), PAL[9], 'o pompom do gorro de dormir');
  const fausto = paint('fausto');
  assert.equal(fausto(3, 1), PAL.z, 'o lençol cobre tudo');
  assert.equal(fausto(2, 4), PAL.e, 'com dois buracos de olho');
});

test('mandioquinhas: o jeito de se mexer (tremer, rodopiar, flutuar, pular, balançar, sumir) é de cada uma', () => {
  const at = id => CAST.findIndex(entry => entry.id === id);
  const f = fakeFesta();
  const range = (id, key) => {
    const values = [];
    for (let t = 0; t < 6000; t += 17) values.push(f.mq.pose(at(id), 1000 + t)[key]);
    return [Math.min(...values), Math.max(...values)];
  };
  assert.deepEqual(range('dorminhoco', 'dx'), [0, 0], 'a dorminhoca não se mexe');
  assert.deepEqual(range('tico', 'dx'), [-1, 1], 'o medroso treme');
  assert.deepEqual(range('bia', 'dx'), [-2, 2], 'a bailarina roda');
  assert.deepEqual(range('quim', 'dx'), [-1, 1], 'o do quentão balança');
  assert.deepEqual(range('zumbi', 'dx'), [-1, 1], 'o zumbi cambaleia');
  assert.deepEqual(range('fausto', 'dy'), [-1, 1], 'o fantasma flutua');
  assert.deepEqual(range('pipoca', 'dy'), [-1, 0], 'a pipoca pula');
  assert.deepEqual(range('lulu', 'dy'), [0, 0]);
  assert.deepEqual(range('fred', 'dx'), [0, 0], 'o dino só estremece na hora do rugido');
  // A ninja some por meio segundo a cada catorze segundos (e a conta é só dela).
  const ninja = at('silencio');
  const hidden = [];
  for (let t = 0; t < 28000; t += 50) hidden.push(f.mq.pose(ninja, t).hide);
  assert.ok(hidden.some(Boolean) && hidden.some(value => !value));
  const share = hidden.filter(Boolean).length / hidden.length;
  assert.ok(share > 0.02 && share < 0.08, `some só uma fração do tempo (${share})`);
  for (let t = 0; t < 28000; t += 50) assert.equal(f.mq.pose(at('lulu'), t).hide, false);
});

test('mandioquinhas: as manias saem sozinhas (z, notas, corações, suor, vapor, brilho, atchim...), uma só vez por vez, e quietas no modo calmo', () => {
  const at = id => CAST.findIndex(entry => entry.id === id);
  const run = (id, seconds, options) => {
    const f = fakeFesta(options);
    for (let t = 0; t < seconds * 1000; t += 33) f.mq.idle(at(id), 50, 40, 1000 + t);
    return f;
  };
  assert.ok(run('dorminhoco', 20).says.some(item => item.text === 'z'), 'o sono solta z');
  assert.ok(run('nana', 20).floats.some(item => item.shape === 'nota'), 'a poeta solta notas');
  const heart = run('lulu', 20).floats.find(item => item.shape === 'coracao');
  assert.ok(heart && heart.colors[0] === '#ff4f9e', 'a apaixonada solta coração rosa');
  assert.ok(run('tico', 20).fx.particles.some(item => item.drop), 'o medroso pinga suor');
  assert.ok(run('vovo', 20).fx.particles.some(item => item.smoke), 'a vovó solta o cheirinho do bolo');
  assert.ok(run('bento', 20).fx.particles.some(item => item.shape === 'brilho' && item.colors[0] === '#ffffff'), 'o descolado brilha');
  assert.ok(run('tonho', 40).says.some(item => item.text === 'ATCHIM!'), 'o gripado espirra');
  assert.ok(run('lili', 20).fx.particles.some(item => item.colors && item.gravity), 'a festeira solta confete');
  assert.ok(run('gil', 20).fx.particles.some(item => item.drop && item.vy > 0.01), 'o guarda-chuva garoa');
  assert.ok(run('dede', 30).says.some(item => item.text === '?'), 'o detetive pensa');
  assert.ok(run('sebastiao', 30).says.some(item => item.text === '...'), 'o filósofo também, mas com reticências');
  assert.ok(run('fred', 40).says.some(item => item.text === 'RAWR!'), 'o dino ruge');
  assert.ok(run('fofoca', 40).says.some(item => item.text === 'psiu...'), 'a fofoqueira cochicha');
  assert.ok(run('marquinhos', 20).fx.particles.some(item => item.wobble !== undefined), 'o pescador solta bolhas');
  assert.ok(run('marcador', 30).says.some(item => item.text === 'fx.mq.marcador.s'), 'o marcador da quadrilha grita a própria fala');
  // No modo calmo (sem balõezinhos de fala e sem efeitos soltos) nada disso acontece.
  for (const id of ['dorminhoco', 'nana', 'lulu', 'tico', 'tonho', 'lili', 'fred']) {
    const calm = run(id, 40, { calm: true });
    assert.equal(calm.says.length + calm.floats.length + calm.fx.particles.length, 0, `${id}: calma`);
  }
  // A ninja solta um pufe quando some e outro quando volta; os que não somem nunca.
  const f = fakeFesta();
  const ninja = at('silencio');
  for (let t = 0; t < 30000; t += 33) f.mq.idle(ninja, 50, 40, t, f.mq.pose(ninja, t).hide);
  assert.ok(f.fx.particles.filter(item => item.smoke).length >= 8, 'pufe de ida e de volta');
});

test('mandioquinhas: o clique mostra o nome e a fala dela, mais a mania de uma vez; a nova chegando se apresenta; de vez em quando uma fala sozinha', () => {
  const f = fakeFesta();
  const index = ROSTER.findIndex(entry => entry.id === 'lulu');
  f.mq.click(index, 30, 40, 5000);
  assert.deepEqual(f.says.slice(0, 2).map(item => item.text), ['fx.mq.lulu.n', 'fx.mq.lulu.s']);
  assert.ok(f.says[0].y < f.says[1].y, 'o nome fica acima da fala');
  assert.equal(f.floats.filter(item => item.shape === 'coracao').length, 3, 'três corações de uma vez');
  assert.equal(f.mq.probe().clicked, index);
  // Apresentação: "+ Nome" agora e a fala logo depois.
  const g = fakeFesta();
  g.mq.intro(0, 60, 40, 9000);
  assert.equal(g.says.length, 2);
  assert.ok(g.says[0].text.startsWith('fx.mq.new:') && g.says[0].text.includes('fx.mq.mandi.n'), 'o nome da primeira é a Mandi');
  assert.equal(g.says[1].text, 'fx.mq.mandi.s');
  assert.ok(g.says[1].now > g.says[0].now, 'a fala vem depois');
  // De vez em quando uma das que existem fala sozinha (nunca uma que ainda não chegou); no modo calmo, não.
  const m = fakeFesta({ rng: () => 0.999 });
  m.mq.murmur(5, 0, k => ({ x: 10 * k, y: 40 }));
  m.mq.murmur(5, 1000, k => ({ x: 10 * k, y: 40 }));
  assert.equal(m.says.length, 0, 'ninguém fala logo que a festa abre');
  for (let t = 0; t < 400000; t += 1000) m.mq.murmur(5, t, k => ({ x: 10 * k, y: 40 }));
  const spoke = m.says.length;
  assert.ok(spoke >= 4 && spoke <= 15, `fala sozinha de tempos em tempos (${spoke})`);
  assert.ok(m.says.every(item => item.text.startsWith('fx.mq.') && item.text.endsWith('.s')));
  assert.ok(m.says.every(item => ROSTER.slice(0, 5).some(entry => item.text === `fx.mq.${entry.id}.s`)), 'só as 5 que já chegaram');
  const quiet = fakeFesta({ calm: true });
  for (let t = 0; t < 400000; t += 1000) quiet.mq.murmur(5, t, () => ({ x: 1, y: 1 }));
  assert.equal(quiet.says.length, 0);
  const none = fakeFesta();
  for (let t = 0; t < 400000; t += 1000) none.mq.murmur(0, t, () => null);
  assert.equal(none.says.length, 0, 'sem mandioquinha, ninguém fala');
});

test('mandioquinhas na festa: com as 36 no cenário todas são clicáveis, desenhadas com o jeito próprio, e o clique abre o nome e a fala', comGlobais({ ArraiaFestaMandioquinhas: Mq }, () => {
  const calls = { drawImage: 0 };
  globalThis.document = fakeDocument([], calls);
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  const festa = globalThis.ArraiaFesta.create(globalThis.document.createElement('canvas'), bundle);
  festa.setScale(3);
  const engine = new GameEngine(data, null, { rng: () => 0.3 });
  engine.state.size = engine.state.records.size = 300;
  assert.equal(engine.scenery().counts.mandioquinha, MAX);
  let now = 5000;
  for (let i = 0; i < 40; i++) festa.draw(engine, (now += 17));
  const areas = festa.areas().filter(area => area.id.startsWith('bicho:mandioquinha:'));
  // As 36 das raízes do terreiro e as 4 das ilhas flutuantes (números 37 a 40), todas com região clicável.
  assert.equal(areas.length, CAST.length, 'uma região clicável para cada uma');
  assert.deepEqual(areas.map(area => area.id).sort(), Array.from({ length: CAST.length }, (_, i) => `bicho:mandioquinha:${i + 1}`).sort());
  assert.equal(festa.probe().mandioquinhas.drawn, CAST.length, 'todas desenhadas com o seu jeito');
  festa.poke('bicho:mandioquinha:39');
  assert.equal(festa.probe().mandioquinhas.clicked, 38, 'a das ilhas também reage (o baloeiro)');
  assert.equal(festa.probe().mandioquinhas.behind, ROSTER.filter(entry => entry.behind).length, 'asas e capas desenhadas atrás do sprite');
  const texts = festa.probe().texts;
  festa.poke('bicho:mandioquinha:5');
  assert.equal(festa.probe().mandioquinhas.clicked, 4, 'a quinta é a Pipoca');
  assert.ok(festa.probe().texts >= texts + 2, 'o nome e a fala');
  festa.poke('bicho:mandioquinha:99');       // vaga que não existe: nada acontece (e não quebra)
  // A mandioquinha nova se apresenta quando o porte da festa sobe até a peça dela.
  const size = [...Array(300).keys()].find(s => engine.sceneryPiece(s)?.id === 'mandioquinha' && engine.sceneryPiece(s).index === 3);
  festa.onEvents(engine, [{ type: 'size-up', size, count: 1 }], now);
  for (let i = 0; i < 4; i++) festa.draw(engine, (now += 17));
  assert.equal(festa.probe().mandioquinhas.intro, 2, 'a terceira que chega é a Lulu');
  for (let i = 0; i < 40; i++) festa.draw(engine, (now += 17));
  // Cada uma se mexe do jeito dela: o fantasma flutua (o y dele muda de quadro em quadro) e a dorminhoca fica parada.
  const ghost = ROSTER.findIndex(entry => entry.id === 'fausto'), sleeper = ROSTER.findIndex(entry => entry.id === 'dorminhoco');
  const ys = new Set(), sleeperYs = new Set();
  for (let i = 0; i < 120; i++) {
    festa.draw(engine, (now += 50));
    const at = festa.probe().mandioquinhas.at;
    ys.add(at[ghost][1]);
    sleeperYs.add(at[sleeper][1]);
  }
  assert.ok(ys.size >= 2, 'o fantasma flutua');
  assert.equal(sleeperYs.size, 1, 'a dorminhoca não se mexe');
  // De vez em quando uma delas fala sozinha (depois de uns segundos, e só uma das que existem).
  assert.equal(festa.probe().mandioquinhas.murmured, -1, 'ninguém fala logo que a festa abre');
  for (let i = 0; i < 90; i++) festa.draw(engine, (now += 1000));
  const murmured = festa.probe().mandioquinhas.murmured;
  assert.ok(murmured >= 0 && murmured < MAX, 'uma falou sozinha');
  // Com menos mandioquinhas, só as primeiras (a ordem de compra é a do elenco).
  engine.state.size = engine.state.records.size = 60;
  const few = engine.scenery().counts.mandioquinha || 0;
  for (let i = 0; i < 40; i++) festa.draw(engine, (now += 17));
  assert.equal(festa.probe().mandioquinhas.drawn, few, 'sem ilhas, só as das raízes do terreiro');
  assert.ok(few < MAX);
}));
