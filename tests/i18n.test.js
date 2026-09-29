const test = require('node:test');
const assert = require('node:assert/strict');
const I18N = require('../src/i18n.js');
const data = require('../src/data.js');
const { GameEngine } = require('../src/core.js');
const UI = require('../src/ui.js');

const langs = I18N.dictionaries();
const ids = I18N.LANGUAGES.map(lang => lang.id);
const vars = template => {
  const text = typeof template === 'object' ? Object.values(template).join(' ') : String(template);
  return [...new Set(text.match(/\{\w+\}/g) || [])].sort();
};
// Cópia de GAME_DATA traduzida: nunca mexe no módulo compartilhado pelos outros testes.
const localized = id => I18N.localizeData(JSON.parse(JSON.stringify(data)), id);

test('idioma: escolha salva, depois o idioma do jogo na Steam, depois o sistema; fora da lista, inglês', () => {
  assert.equal(I18N.resolve({ steam: 'brazilian' }), 'pt-BR');
  assert.equal(I18N.resolve({ steam: 'portuguese' }), 'pt-BR');
  assert.equal(I18N.resolve({ steam: 'english' }), 'en');
  assert.equal(I18N.resolve({ steam: 'latam' }), 'es');
  assert.equal(I18N.resolve({ steam: 'spanish', system: 'pt-BR' }), 'es', 'a Steam vale mais que o sistema');
  assert.equal(I18N.resolve({ steam: 'japanese', system: 'pt-BR' }), 'en', 'idioma da Steam fora da lista: inglês');
  assert.equal(I18N.resolve({ system: 'pt-PT' }), 'pt-BR', 'sem Steam, o sistema');
  assert.equal(I18N.resolve({ system: 'es-MX' }), 'es');
  assert.equal(I18N.resolve({ system: 'de-DE' }), 'en');
  assert.equal(I18N.resolve({}), 'en');
  assert.equal(I18N.resolve({ choice: 'es', steam: 'english' }), 'es', 'a escolha do jogador vale mais que tudo');
  assert.equal(I18N.resolve({ choice: 'auto', steam: 'english' }), 'en');
  assert.equal(I18N.resolve({ choice: 'klingon', steam: 'brazilian' }), 'pt-BR');
});

test('todos os idiomas têm as mesmas chaves e as mesmas variáveis', () => {
  const source = langs['pt-BR'].ui;
  for (const id of ids) {
    const ui = langs[id].ui;
    for (const key of Object.keys(source)) {
      assert.ok(key in ui, `${id}: falta ${key}`);
      assert.deepEqual(vars(ui[key]), vars(source[key]), `${id}: variáveis de ${key}`);
    }
    for (const key of Object.keys(ui)) assert.ok(key in source, `${id}: ${key} não existe em pt-BR`);
  }
});

test('o conteúdo do jogo (itens, turma, cartas, conquistas...) tem tradução completa', () => {
  const lists = { stats: data.stats, tiers: data.tiers, chars: data.chars, categories: data.categories, items: data.items,
    outings: data.outings, bonfire: data.bonfire, landmarks: data.scenery.landmarks, cycle: data.scenery.cycle,
    requests: data.requests, achievements: data.achievements, dances: data.dances, sets: data.sets };
  for (const id of ids.filter(lang => lang !== I18N.SOURCE)) {
    const d = langs[id].data;
    for (const [name, list] of Object.entries(lists)) {
      for (const entry of list) assert.ok(d[name]?.[entry.id], `${id}: ${name}.${entry.id}`);
    }
    for (const post of Object.keys(data.posts)) assert.ok(d.posts[post], `${id}: posts.${post}`);
    for (const goal of data.goals) assert.ok(langs[id].ui[`goal.${goal.id}`], `${id}: texto da meta ${goal.id}`);
    for (let stage = 0; stage <= data.config.growthAt.length; stage++) {
      assert.ok(langs[id].ui[`growth.stage.${stage}`], `${id}: nome do tamanho ${stage}`);
    }
    for (let call = 0; call < 8; call++) assert.ok(langs[id].ui[`fx.call.${call}`], `${id}: grito ${call} da quadrilha`);
    assert.equal(d.rarities.length, data.rarities.length, `${id}: raridades`);
    assert.equal(d.letters.length, data.letters.length, `${id}: cartas`);
    for (const item of data.items) if (item.effect) assert.ok(d.items[item.id].effect, `${id}: efeito de ${item.id}`);
    for (const char of data.chars) {
      assert.deepEqual(vars(d.chars[char.id].text).map(v => v.replace(/[{}]/g, '')), vars(char.text).map(v => v.replace(/[{}]/g, '')),
        `${id}: variáveis do efeito de ${char.id}`);
    }
    const copy = localized(id);
    assert.notEqual(copy.items[0].name, data.items[0].name, `${id}: localizeData troca os nomes`);
    assert.equal(data.items[0].name, 'Chapéu de Palha', 'o original continua em português');
  }
});

test('os textos que voam sobre a festa cabem na fonte de pixel', () => {
  const allowed = /^[A-Z0-9+\-.,!?: {}n]*$/;
  for (const id of ids) {
    for (const [key, value] of Object.entries(langs[id].ui)) {
      if (!key.startsWith('fx.')) continue;
      const texts = typeof value === 'object' ? Object.values(value) : [value];
      for (const text of texts) {
        const plain = text.normalize('NFD').replace(/[̀-ͯ]/g, '');
        assert.match(plain, allowed, `${id}: ${key} usa caractere fora da fonte`);
      }
    }
  }
});

test('plural e números seguem o idioma', () => {
  try {
    I18N.setLanguage('en');
    assert.equal(I18N.t('gain.tickets', { n: 1 }), '+1 ticket');
    assert.equal(I18N.t('gain.tickets', { n: 3 }), '+3 tickets');
    assert.equal(UI.compact(12345), '12.3K');
    I18N.setLanguage('es');
    assert.equal(I18N.t('party.subtitle', { tier: 'X', n: 1 }), 'X · 1 invitado');
    assert.equal(UI.compact(12345), '12,3 mil');
    assert.equal(I18N.t('chave.que.nao.existe'), 'chave.que.nao.existe', 'chave desconhecida aparece crua');
  } finally {
    I18N.setLanguage('pt-BR');
  }
});

test('o jogo inteiro desenha em inglês e espanhol, sem sobrar português nas telas', () => {
  const ctx = extra => ({ tab: 'festa', settings: { pinned: true, hud: 'sempre', zoom: 1 }, desktop: true, icon: () => '',
    now: Date.now(), language: { choice: 'auto', id: 'en', auto: 'en' }, steam: { on: true, name: 'Ana' }, ...extra });
  // Palavras que só existem no português do jogo ("Pescar!" e "Abrir carta" também são espanhol).
  const leftovers = /Libera quando|Próximo convidado|Convidados|Melhorar|Conquistas|Tamanho do jogo|Fôlego|lenha|Rolês|Turma/;
  try {
    for (const [id, expect] of [['en', /Next guest brings|Upgrade|Guests/], ['es', /El próximo invitado|Mejorar|Invitados/]]) {
      I18N.setLanguage(id);
      const engine = new GameEngine(localized(id), null, { rng: () => 0.4 });
      while (engine.state.size < 60) engine.addFame(engine.fameNeed() - engine.state.fame);
      engine.state.crew = { milho: { level: 2 }, cachorro: { level: 1 } };
      engine.fish();
      const screens = [UI.hud(engine, ctx()), UI.vitrine(engine, ctx({ dockCat: 'melhorias' })),
        UI.vitrine(engine, ctx({ dockCat: 'chapeu' })), UI.argolas(engine, ctx()),
        ...UI.TABS.map(tab => UI.panel(engine, ctx({ tab: tab.id }))),
        ...UI.TELAS.map(tela => UI.tela(engine, ctx({ tela: tela.id })))];
      const html = screens.join('\n');
      assert.match(html, expect, id);
      assert.equal(html.match(leftovers)?.[0], undefined, `${id}: texto em português sobrou`);
      assert.match(UI.panel(engine, ctx({ tab: 'ajustes' })), /data-action="idioma" data-value="es"/, 'troca de idioma nos Ajustes');
      assert.match(UI.panel(engine, ctx({ tab: 'ajustes' })), /Ana/, 'nome da Steam nos Ajustes');
    }
  } finally {
    I18N.setLanguage('pt-BR');
  }
});

test('as palavras das placas das barracas cabem na madeira, em letras da fonte de pixel', () => {
  require('../src/festa-sprites.js');
  const sides = globalThis.FESTA_SPRITES.sides;
  const signs = Object.entries(sides).filter(([, meta]) => meta.sign);
  assert.equal(signs.length, 6, 'as seis barracas têm placa');
  for (const id of ids) {
    for (const [kind, meta] of signs) {
      const word = langs[id].ui[`sign.${kind}`];
      assert.match(word || '', /^[A-Z]+$/, `${id}: placa de ${kind}`);
      const width = word.length * 4 - 1 + (meta.sign.heart ? 6 : 0);
      assert.ok(width <= meta.sign.x1 - meta.sign.x0 - 1, `${id}: "${word}" não cabe na placa de ${kind}`);
    }
  }
});
