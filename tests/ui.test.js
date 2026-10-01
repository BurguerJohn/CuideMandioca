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
  assert.match(dock('melhorias'), /data-action="melhorar" data-hold="melhorar" data-stat="rebolado"/,
    'melhorias também têm ação para a ativação pelo teclado');
  assert.match(dock('lado'), /Em uso/);
  assert.match(dock('chapeu'), /Só nas Argolas/);
  assert.match(dock('chapeu'), /Só na Mata Encantada/, 'os troféus da Mata dizem de onde vêm');
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
  assert.match(UI.vitrine(engine, ctx(engine, { dockCat: 'chapeu' })), new RegExp(`--colunas:${Math.ceil(hats / (hats > 12 ? 4 : 3))}`),
    'itens da loja em 3 fileiras (4 se a categoria passar de 12), sem rolagem');
  // A aba de conjuntos tem um cartão para cada conjunto, mostrando o que falta e o que está em uso.
  const sets = UI.vitrine(engine, ctx(engine, { dockCat: 'conjuntos' }));
  assert.equal((sets.match(/data-action="vitrine-conjunto"/g) || []).length, engine.data.sets.length);
  assert.match(sets, /data-preview="set:caipira"/);
  assert.match(sets, /Faltam 2/, 'só o chapéu inicial: faltam a espiga e o tecido do Caipira de Raiz');
  engine.addItem('espiga');
  assert.match(UI.vitrine(engine, ctx(engine, { dockCat: 'conjuntos' })), /Falta 1/, 'no singular, falta uma peça só');
  engine.addItem('remendado');
  engine.equip('espiga');
  engine.equip('remendado');
  assert.match(UI.vitrine(engine, ctx(engine, { dockCat: 'conjuntos' })), /vcard item uso" role="button" tabindex="0" data-action="vitrine-conjunto" data-id="caipira"/);
  assert.match(UI.panel(engine, ctx(engine, { tab: 'festa' })), /Conjunto/);
  // Bingo: sem rodada, o botão de comprar; na rodada, a cartela e o botão travado; depois, o resultado.
  while (engine.state.size < 10) engine.addFame(engine.fameNeed() - engine.state.fame);
  engine.state.tickets = 50;
  assert.match(UI.tela(engine, ctx(engine, { tela: 'bingo' })), /data-action="bingo-comprar"/);
  engine.buyBingo();
  const playing = UI.tela(engine, ctx(engine, { tela: 'bingo' }));
  assert.equal((playing.match(/class="bingo-casa/g) || []).length, 9);
  assert.match(playing, /bingo-casa marcada[^"]*">★/, 'o meio livre já vem marcado');
  assert.doesNotMatch(playing, /data-action="bingo-comprar"/, 'na rodada não compra outra');
  assert.match(UI.hud(engine, ctx(engine)), /Bingo 1\/9/);
  engine.state.bingo.round.rival = 1;
  engine.drawBingo();
  assert.match(UI.tela(engine, ctx(engine, { tela: 'bingo' })), /gritou BINGO primeiro/);
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

test('o gráfico do histórico volta ao quintal quando começa um novo São João', () => {
  const engine = new GameEngine(data, null, { rng: () => 0.5 });
  engine.state.stats.playtime = 120;
  while (engine.state.size < 100) engine.addFame(engine.fameNeed() - engine.state.fame);
  engine.state.stats.playtime = 240;
  assert.equal(engine.newYear(), true);
  assert.equal(engine.state.size, 1);
  const html = UI.panel(engine, ctx(engine, { tab: 'historico' }));
  const curve = html.match(/<path class="curva" d="([^"]+)"/)[1];
  assert.match(curve, /V214H630$/, 'o fim da curva corresponde a um convidado, sem apagar o ano anterior');
  assert.match(html, /<text class="rotulo-eixo"[^>]*>100<\/text>/, 'o porte anterior continua no histórico');
});

test('formatos de número e tempo em português', () => {
  assert.equal(UI.compact(999), '999');
  assert.equal(UI.compact(12345), '12,3 mil');
  assert.equal(UI.compact(2_500_000), '2,5 mi');
  assert.equal(UI.duration(65000), '1min 05s');
  assert.equal(UI.duration(3_720_000), '1h 02min');
  assert.equal(UI.esc('<b>'), '&lt;b&gt;');
});

test('o Álbum da Festa tem janela própria (botão na placa): figurinha colada com ícone, a que falta com "?"', () => {
  const engine = new GameEngine(data, null, { rng: () => 0.5 });
  engine.emit('rain');
  const html = UI.tela(engine, ctx(engine, { tela: 'album', icon: key => `<i data-icon="${key}"></i>` }));
  assert.match(html, /class="figurinha" title="Chuva de São João"><i data-icon="ui:chuva">/);
  assert.match(html, /figurinha vazia[^>]*><b>\?<\/b><span>Quebra-pote<\/span>/);
  assert.match(html, /0 de 7 completas/);
  assert.equal(UI.telaName('album'), 'Álbum');
  // A aba Conquistas fica só com as metas e as conquistas.
  assert.doesNotMatch(UI.panel(engine, ctx(engine, { tab: 'conquistas' })), /class="figurinha/);
});

test('a placa tem os botões de Conquistas (com o selo das metas prontas para resgatar) e do Álbum', () => {
  const engine = new GameEngine(data, null, { rng: () => 0.5 });
  let html = UI.hud(engine, ctx(engine));
  assert.match(html, /data-action="tab" data-tab="conquistas"/);
  assert.match(html, /data-action="tela" data-tela="album"/);
  assert.doesNotMatch(html, /data-tab="conquistas"[^>]*><i[^>]*><\/i><i class="selo-botao">/);
  // Uma meta cumprida: o botão chama e mostra 1.
  if (!engine.state.goals.length) engine.state.goals.push(engine.newGoal());
  const goal = engine.state.goals[0];
  goal.from -= goal.target;
  assert.equal(engine.goalsReady(), 1);
  html = UI.hud(engine, ctx(engine));
  assert.match(html, /class="ferramenta chama[^"]*" data-action="tab" data-tab="conquistas"[^>]*>.*?<i class="selo-botao">1<\/i>/);
});

test('a placa mostra selos do leilão (lance e de quem), da corrida de saco e do friozinho', () => {
  const engine = new GameEngine(data, null, { rng: () => 0.5 });
  const s = engine.state;
  while (s.size < 25) engine.addFame(engine.fameNeed() - s.fame);
  engine.debug('leilao');
  engine.debug('saco');
  engine.debug('frio');
  let html = UI.hud(engine, ctx(engine));
  assert.match(html, /Leilão: \d+\?/);
  assert.match(html, /Corrida de saco!/);
  assert.match(html, /Friozinho/);
  s.tickets = 50;
  engine.bidLeilao();
  html = UI.hud(engine, ctx(engine));
  assert.match(html, /Leilão: \d+ \(seu\)/);
});

test('a placa mostra o Amor e a Barriga da Mandioca e quanto o Rebolado vale; a aba Comidas vende comida', () => {
  const engine = new GameEngine(data, null, { rng: () => 0.5 });
  engine.debug('triste');
  let hud = UI.hud(engine, ctx(engine));
  assert.match(hud, /class="placa-humor triste" data-action="comidas"/);
  assert.match(hud, /data-humor="amor" style="width:0%"/);
  assert.match(hud, /data-humor="fator">×0,5</);
  engine.debug('feliz');
  hud = UI.hud(engine, ctx(engine));
  assert.match(hud, /placa-humor feliz/);
  assert.match(hud, /data-humor="barriga" style="width:100%"/);
  assert.match(hud, /×1,25/);
  assert.match(hud, /Amor 100% .* Barriga 100%/);
  // Aba Comidas: barriga cheia, sem preço; vazia, com preço em Animação.
  const dock = () => UI.vitrine(engine, ctx(engine, { dockCat: 'comidas' }));
  assert.match(dock(), /data-cat="comidas"/);
  assert.match(dock(), /Barriga cheia/);
  engine.debug('triste');
  const html = dock();
  for (const food of data.foods) assert.match(html, new RegExp(`data-action="vitrine-comida" data-id="${food.id}"`));
  assert.match(html, /data-currency="cheer"/);
  assert.match(html, /\+70 Barriga/);
  assert.match(html, /Rebolado ×0,5/);
  assert.match(html, /Tudo cheio: Rebolado ×1,25; tudo vazio: ×0,5/);
});

test('a placa ganha o botão da casa da Mandioca do convidado 100 em diante, e o diário conta os cômodos e moradores', () => {
  const engine = new GameEngine(data, null, { rng: () => 0.5 });
  assert.doesNotMatch(UI.hud(engine, ctx(engine)), /data-action="casa"/, 'antes do 100 não tem casa');
  engine.state.size = 100;
  engine.state.records.size = 100;
  assert.match(UI.hud(engine, ctx(engine)), /data-action="casa"/);
  assert.doesNotMatch(UI.hud(engine, ctx(engine)), /ferramenta aberta" data-action="casa"/);
  assert.match(UI.hud(engine, ctx(engine, { casaVisible: true })), /ferramenta aberta" data-action="casa"/, 'aberta quando a casa aparece');
  // Diário (aba Histórico, filtro "tudo"): as duas entradas novas têm texto.
  engine.state.size = 103;
  engine.state.records.size = 103;
  engine.record('casa-comodo', { room: 1 });
  engine.record('casa-morador', { index: 0 });
  const log = UI.panel(engine, ctx(engine, { tab: 'historico', logFilter: 'tudo' }));
  assert.match(log, /A casa ganhou um cômodo: Cozinha/);
  assert.match(log, /Macaxeira se mudou para a casa/);
});

test('o botão de uma janela com coisa pendente pisca e mostra o número (o das outras não)', () => {
  const engine = new GameEngine(data);
  while (engine.state.size < 30) engine.addFame(engine.fameNeed() - engine.state.fame);
  const botoes = (pending) => UI.hud(engine, ctx(engine, { minis: [{ id: 'cordel', name: 'Cordel da Mandioca', visible: false, pending },
    { id: 'bichos', name: 'Quintal dos Bichos', visible: true, pending: 0 }] }));
  const html = botoes(3);
  assert.match(html, /class="ferramenta  chama" data-action="mini" data-mini="cordel"[^>]*title="[^"]*3 páginas da história para completar[^"]*">[\s\S]*?<i class="selo-botao">3<\/i><\/button>/);
  assert.match(html, /class="ferramenta aberta " data-action="mini" data-mini="bichos"/, 'a janela sem pendência não pisca');
  assert.equal((html.match(/data-mini="bichos"[^>]*>[\s\S]*?<\/button>/)[0].match(/selo-botao/g) || []).length, 0);
  assert.match(botoes(1), /1 página da história para completar/);
  assert.doesNotMatch(botoes(0), /chama" data-action="mini"|páginas da história/);
});
