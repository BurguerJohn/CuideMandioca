const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../src/data.js');
const { GameEngine } = require('../src/core.js');
const UI = require('../src/ui.js');

const ctx = (engine, extra = {}) => ({ tab: 'festa', shopCat: 'chapeu', poleFraction: 0.1, settings: { scale: 3, pinned: true, hud: 'sempre' },
  desktop: true, icon: () => '', now: Date.now(), ...extra });

test('o painel tem só números e ajustes; as telas de jogo montam e as trancadas explicam o porte', () => {
  const engine = new GameEngine(data);
  for (const tab of UI.TABS) assert.ok(UI.panel(engine, ctx(engine, { tab: tab.id })).length > 50, tab.id);
  assert.deepEqual(UI.TABS.map(tab => tab.id), ['festa', 'historico', 'conquistas', 'ajustes']);
  for (const tela of UI.TELAS) {
    const html = UI.tela(engine, ctx(engine, { tela: tela.id }));
    assert.ok(html.length > 50, tela.id);
    if (tela.tier) assert.match(html, /Libera quando a festa virar/, tela.id);
  }
  const hud = UI.hud(engine, ctx(engine));
  assert.match(hud, /Arraiá de Quintal/);
  assert.match(hud, /data-tela="correio"/);
  assert.doesNotMatch(hud, /data-tela="turma"|data-tela="fogueira"/, 'botão de jogo só aparece quando libera');
  assert.equal((hud.match(/data-action="zoom/g) || []).length, 1, 'um botão só de tamanho');
  assert.match(hud, /data-action="zoom-alca"[^>]*title="[^"]*100%[^"]*">.*data-live="zoom"/, 'mostra o tamanho e explica o clique');

  const settings = on => UI.panel(engine, ctx(engine, { tab: 'ajustes', settings: { sound: on, volume: 0.3 } }));
  assert.match(settings(true), /data-action="som" data-value="on"[^>]*>Ligado/);
  assert.match(settings(true), /<input type="range" id="volume"[^>]*value="30">/);
  assert.match(settings(false), /class="volume apagado"/, 'som desligado apaga a barra');
  assert.match(settings(false), /value="30" disabled>/);
});

test('as abas mostram preços, postos e rolês no fim do jogo', () => {
  const engine = new GameEngine(data);
  const s = engine.state;
  while (s.size < 60) engine.addFame(engine.fameNeed() - s.fame);
  s.crew = { milho: { level: 2 }, cenoura: { level: 1 }, cachorro: { level: 1 } };
  s.inventory.push('barraca-pescaria');
  engine.equip('barraca-pescaria', 'direita');
  engine.startOuting(0, 'cenoura');
  const render = tab => (UI.TELAS.some(tela => tela.id === tab) ? UI.tela(engine, ctx(engine, { tela: tab }))
    : UI.panel(engine, ctx(engine, { tab })));
  const dock = cat => UI.vitrine(engine, ctx(engine, { dockCat: cat, dockSide: 'direita' }));
  assert.match(dock('melhorias'), /data-hold="melhorar"/);
  assert.match(dock('lado'), /Em uso/);
  assert.match(dock('chapeu'), /Só nas Argolas/);
  assert.match(dock('chapeu'), /data-preview="vaqueiro"/);
  assert.match(render('turma'), /Trabalhando: Par da quadrilha/);
  assert.match(render('turma'), /Em rolê/);
  assert.match(render('turma'), /\?\?\?/, 'quem não foi pescado aparece como mistério');
  assert.match(render('roles'), /volta em/);
  assert.match(UI.argolas(engine, ctx(engine)), /argolas-jogar/);
  engine.state.rings = { cost: 4, nextAt: Date.now() + 60000 };
  assert.match(UI.argolas(engine, ctx(engine)), /Cai para 2 em/);
  assert.match(UI.hud(engine, ctx(engine)), /data-live="ringCost">4</);
  engine.state.rings = { cost: 1, nextAt: 0 };
  assert.match(UI.argolas(engine, ctx(engine, { ringResult: { hits: 2, total: 3, mult: 2, tickets: 6, cheer: 0, wood: 0,
    items: [engine.items.ursinho] } })), /Ursinho de Pelúcia/);
  assert.match(UI.hud(engine, ctx(engine)), /zoom-alca/);
  assert.match(UI.hud(engine, ctx(engine)), /Próximo convidado traz: <b>/);
  assert.match(render('festa'), /Próximo marco:/);
  assert.doesNotMatch(UI.hud(engine, ctx(engine)), /data-tela="teste"/, 'o jogo lançado vem sem o botão de teste');
  engine.cfg.debugMenu = true;
  try {
    assert.match(UI.hud(engine, ctx(engine)), /data-tela="teste"/, 'com debugMenu, botão de teste na placa');
  } finally {
    engine.cfg.debugMenu = false;
  }
  assert.match(UI.tela(engine, ctx(engine, { tela: 'teste' })), /data-op="convidados"/);
  assert.equal(UI.telaName('teste'), 'Modo de teste');
  assert.doesNotMatch(render('festa'), /data-action="vitrine"/, 'a loja fica só na placa');
  const hats = engine.data.items.filter(item => item.cat === 'chapeu').length;
  assert.match(UI.vitrine(engine, ctx(engine, { dockCat: 'chapeu' })), new RegExp(`--colunas:${Math.ceil(hats / 3)}`),
    'itens da loja em 3 fileiras, sem rolagem');
  assert.doesNotMatch(render('ajustes'), /placa-auto/);
  assert.match(UI.panel(engine, ctx(engine, { tab: 'ajustes', settings: { placa: { dx: 10, dy: 20 } } })), /placa-auto/);
  assert.match(UI.hud(engine, ctx(engine)), /fechar-jogo/);
  assert.match(render('fogueira'), /Rumo à fogueira lendária/);
  assert.equal(UI.TABS.some(tab => tab.id === 'sebo'), false, 'o pau de sebo saiu do jogo');
  assert.match(render('pescaria'), /Pescar!/);
});

test('histórico mostra o gráfico dos desbloqueios e o diário filtrável', () => {
  const engine = new GameEngine(data, null, { rng: () => 0.5 });
  engine.state.stats.playtime = 90;
  engine.addFame(engine.fameNeed());
  engine.state.stats.playtime = 4000;
  while (engine.state.size < 12) engine.addFame(engine.fameNeed() - engine.state.fame);
  engine.state.cheer = 1e6;
  engine.buyLevel('rebolado');
  engine.buyLevel('rebolado');
  const html = UI.panel(engine, ctx(engine, { tab: 'historico' }));
  assert.match(html, /<svg class="grafico"/);
  assert.match(html, /<circle class="marco/, 'desbloqueios viram bolinhas no gráfico');
  assert.match(html, /Quermesse/, 'a mudança de porte aparece no gráfico');
  assert.match(html, /1min 30s · 2º convidado chegou e trouxe: Pé de milho/, 'cada bolinha diz quando e o quê');
  assert.doesNotMatch(html, /Rebolado: nível/, 'o filtro padrão mostra só desbloqueios');
  assert.match(UI.panel(engine, ctx(engine, { tab: 'historico', logFilter: 'tudo' })), /Rebolado: nível 1 → 3/,
    'compras seguidas viram uma linha só');
});

test('formatos de número e tempo em português', () => {
  assert.equal(UI.compact(999), '999');
  assert.equal(UI.compact(12345), '12,3 mil');
  assert.equal(UI.compact(2_500_000), '2,5 mi');
  assert.equal(UI.duration(65000), '1min 05s');
  assert.equal(UI.duration(3_720_000), '1h 02min');
  assert.equal(UI.esc('<b>'), '&lt;b&gt;');
});
