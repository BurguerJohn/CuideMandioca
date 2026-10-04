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
    // Toda aba da loja e do painel tem nome traduzido (senão aparece a chave, como "dock.varal").
    const UI = require('../src/ui.js');
    for (const entry of UI.DOCK) assert.ok(langs[id].ui[`dock.${entry.id}`], `${id}: aba da loja ${entry.id}`);
    for (const page of data.album) {
      assert.ok(d.album?.[page.id]?.name, `${id}: página ${page.id} do álbum`);
      for (const sticker of page.stickers) assert.ok(d.album[page.id].stickers?.[sticker.id], `${id}: figurinha ${sticker.id}`);
    }
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
  assert.equal(signs.length, 7, 'as sete barracas têm placa');
  for (const id of ids) {
    for (const [kind, meta] of signs) {
      const word = langs[id].ui[`sign.${kind}`];
      assert.match(word || '', /^[A-Z]+$/, `${id}: placa de ${kind}`);
      const width = word.length * 4 - 1 + (meta.sign.heart ? 6 : 0);
      assert.ok(width <= meta.sign.x1 - meta.sign.x0 - 1, `${id}: "${word}" não cabe na placa de ${kind}`);
    }
  }
});

test('as 20 visitas do folclore têm nome, grito e texto em todos os idiomas, e o grito só usa letras da fonte de pixel', () => {
  for (const id of ids) {
    const copy = localized(id);
    const source = data.minis.folclore.events;
    copy.minis.folclore.events.forEach((entry, index) => {
      assert.ok(entry.name && entry.say && entry.text, `${id}: ${entry.id}`);
      const shout = entry.say.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      assert.match(shout, /^[A-Z0-9 .,:!?+%-]+$/, `${id}: grito de ${entry.id}: ${entry.say}`);
      assert.ok(shout.length * 4 <= 110, `${id}: o grito de ${entry.id} cabe na festa`);
      if (id !== I18N.SOURCE) assert.notEqual(entry.text, source[index].text, `${id}: ${entry.id} traduzida`);
    });
  }
});

test('os prêmios dos minigames têm nome, texto e falas em todos os idiomas, e as falas só usam letras da fonte de pixel', () => {
  for (const id of ids) {
    const copy = localized(id);
    const source = data.premios;
    copy.premios.jogos.forEach((game, index) => {
      assert.ok(game.name, `${id}: jogo ${game.id}`);
      if (id !== I18N.SOURCE) assert.ok(langs[id].data.premiosJogos[game.id]?.name, `${id}: premiosJogos.${game.id}`);
      assert.equal(game.id, source.jogos[index].id);
    });
    copy.premios.itens.forEach((entry, index) => {
      assert.ok(entry.name && entry.text, `${id}: ${entry.id}`);
      if (id !== I18N.SOURCE) {
        const text = langs[id].data.premiosItens[entry.id];
        assert.ok(text?.name && text.text, `${id}: premiosItens.${entry.id}`);
        assert.notEqual(entry.text, source.itens[index].text, `${id}: ${entry.id} traduzido`);
      }
      for (const key of ['say0', 'say1', 'say2']) {
        if (!source.itens[index][key]) { assert.equal(entry[key], undefined, `${id}: ${entry.id}.${key} não existe no original`); continue; }
        const shout = entry[key].normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
        assert.match(shout, /^[A-Z0-9 .,:!?+%-]+$/, `${id}: fala ${entry.id}.${key}: ${entry[key]}`);
        assert.ok(shout.length * 4 <= 130, `${id}: a fala de ${entry.id}.${key} cabe na festa`);
      }
    });
  }
  // Nenhum idioma deixa sobrar prêmio que o jogo não tem.
  for (const id of ids.filter(lang => lang !== I18N.SOURCE)) {
    assert.deepEqual(Object.keys(langs[id].data.premiosJogos).sort(), data.premios.jogos.map(game => game.id).sort());
    assert.deepEqual(Object.keys(langs[id].data.premiosItens).sort(), data.premios.itens.map(item => item.id).sort());
  }
});

test('a tela dos prêmios desenha em inglês e espanhol, sem sobrar português', () => {
  for (const id of ids.filter(lang => lang !== I18N.SOURCE)) {
    I18N.setLanguage(id);
    try {
      const translated = localized(id);
      const engine = new GameEngine(translated, null, { now: () => 1_700_000_000_000 });
      for (let i = 0; i < 12; i++) engine.emit('rings', { hits: 1, mult: 1 });
      const html = UI.tela(engine, { tela: 'premios', icon: () => '', now: 1_700_000_000_000, settings: {} });
      assert.doesNotMatch(html, /Prêmios|Faltam|Presente|vezes|Animação/, `${id}: sobrou português`);
      assert.match(html, id === 'en' ? /Minigame prizes/ : /Premios de los minijuegos/);
      assert.match(html, id === 'en' ? /Zeca of the Rings/ : /Zeca de los Aros/);
      assert.match(html, id === 'en' ? /Gift ready!/ : /¡Regalo listo!/);
    } finally {
      I18N.setLanguage(I18N.SOURCE);
    }
  }
});

test('os eventos do mundo têm nome e texto em todos os idiomas, e a tela deles não deixa sobrar português', () => {
  for (const id of ids.filter(lang => lang !== I18N.SOURCE)) {
    assert.deepEqual(Object.keys(langs[id].data.mundoEventos).sort(), data.mundo.eventos.map(entry => entry.id).sort(), `${id}: mundoEventos`);
    const copy = localized(id);
    copy.mundo.eventos.forEach((entry, index) => {
      assert.ok(entry.name && entry.text, `${id}: ${entry.id}`);
      assert.notEqual(entry.text, data.mundo.eventos[index].text, `${id}: ${entry.id} traduzido`);
      // (O nome pode ser igual ao português quando a palavra é a mesma, como Eclipse.)
      assert.ok(langs[id].data.mundoEventos[entry.id].name, `${id}: o nome de ${entry.id}`);
    });
    I18N.setLanguage(id);
    try {
      const engine = new GameEngine(localized(id), null, { now: () => 1_700_000_000_000 });
      engine.state.size = engine.state.records.size = 60;
      engine.mundo.start('lua');
      const html = UI.hud(engine, { icon: () => '', now: 1_700_000_000_000, settings: {}, desktop: true });
      assert.doesNotMatch(html, /Lua cheia|Eventos? do mundo/, `${id}: sobrou português na placa`);
      assert.match(html, id === 'en' ? /Full moon 0\/3/ : /Luna llena 0\/3/);
      const panel = UI.panel(engine, { tab: 'festa', icon: () => '', now: 1_700_000_000_000, settings: {}, desktop: true });
      assert.match(panel, id === 'en' ? /World events: 1 seen, 1 of 31 kinds\./ : /Eventos del mundo: 1 vistos, 1 de 31 tipos\./);
      const page = UI.tela(engine, { tela: 'mundo', icon: () => '', now: 1_700_000_000_000, settings: {}, desktop: true });
      assert.doesNotMatch(page, /Evento ainda|Aparece com|alvos pegos|bônus de|Próximo evento|Previsão do tempo|Mais comum hoje|Em breve|Às vezes puxa|Passou \d|minutos depois/, `${id}: sobrou português na tela dos eventos`);
      assert.match(page, id === 'en' ? /<h3>Full moon<\/h3>/ : /<h3>Luna llena<\/h3>/);
      assert.match(page, id === 'en' ? /Event not seen yet/ : /Evento aún no visto/);
    } finally {
      I18N.setLanguage(I18N.SOURCE);
    }
  }
});

test('eventos do mundo: a turma comenta cada evento com duas falas que cabem na fonte de pixel, em todos os idiomas', () => {
  for (const id of ['pt-BR', 'en', 'es']) {
    const book = id === 'pt-BR' ? data : localized(id);
    for (const entry of book.mundo.eventos) {
      for (const key of ['chat0', 'chat1']) {
        const line = entry[key];
        assert.ok(line, `${id}/${entry.id}: ${key}`);
        assert.match(line, /^[A-Z0-9 .,:!?+%-]+$/, `${id}/${entry.id}: só letras da fonte de pixel (${line})`);
        assert.ok(line.length <= 24, `${id}/${entry.id}: cabe no balão (${line.length})`);
      }
      assert.notEqual(entry.chat0, entry.chat1, `${id}/${entry.id}: duas falas diferentes`);
    }
  }
  // Em inglês e espanhol as falas são traduzidas (ao menos a maioria difere do português).
  for (const id of ['en', 'es']) {
    const other = localized(id).mundo.eventos;
    const same = data.mundo.eventos.filter((entry, i) => entry.chat0 === other[i].chat0 && entry.chat1 === other[i].chat1);
    assert.ok(same.length <= 2, `${id}: falas ainda em português em ${same.map(entry => entry.id)}`);
  }
});

test('Ajustes: a linha da nuvem da Steam aparece só com a Steam ligada, diz se está ligada ou como ligar, e existe em todos os idiomas', () => {
  const ctx = extra => ({ tab: 'ajustes', settings: { pinned: true, hud: 'sempre', zoom: 1 }, desktop: true, icon: () => '',
    now: Date.now(), language: { choice: 'auto', id: 'en', auto: 'en' }, steam: { on: true, name: 'Ana', cloud: true }, ...extra });
  try {
    for (const [id, ligada, desligada] of [['pt-BR', /Nuvem da Steam: ligada/, /Nuvem da Steam: desligada\. Ligue em Propriedades do jogo/],
      ['en', /Steam Cloud: on/, /Steam Cloud: off\. Turn it on/], ['es', /Nube de Steam: activada/, /Nube de Steam: desactivada\. Actívala/]]) {
      I18N.setLanguage(id);
      const engine = new GameEngine(localized(id), null, { rng: () => 0.4 });
      assert.match(UI.panel(engine, ctx()), ligada, `${id}: ligada`);
      assert.match(UI.panel(engine, ctx({ steam: { on: true, name: 'Ana', cloud: false } })), desligada, `${id}: desligada`);
      assert.doesNotMatch(UI.panel(engine, ctx({ steam: { on: true, name: 'Ana' } })), /Steam Cloud|Nuvem da Steam|Nube de Steam/, `${id}: sem informação da nuvem não mostra a linha`);
      assert.doesNotMatch(UI.panel(engine, ctx({ steam: { on: false, name: null, cloud: true } })), /Steam Cloud|Nuvem da Steam|Nube de Steam/, `${id}: sem a Steam não mostra a linha`);
    }
  } finally {
    I18N.setLanguage('pt-BR');
  }
});
