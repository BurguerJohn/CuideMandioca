const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../src/data.js');
// Quantos eventos do mundo existem (e quantos são raros: peso 1): os testes contam a partir dos dados, para um evento novo não quebrar a conta.
const TOTAL = data.mundo.eventos.length;
const RARES = data.mundo.eventos.filter(entry => entry.weight === 1).length;
const { GameEngine } = require('../src/core.js');
const UI = require('../src/ui.js');

const ctx = (engine, extra = {}) => ({ tab: 'festa', shopCat: 'chapeu', poleFraction: 0.1, settings: { scale: 3, pinned: true, hud: 'sempre' },
  desktop: true, icon: () => '', now: Date.now(), ...extra });

test('o prêmio importado do Bingo conserva os valores válidos sem impedir de mostrar o resultado', () => {
  const now = 1000000;
  const source = new GameEngine(data, null, { now: () => now, rng: () => 0 });
  while (source.state.size < 10) source.addFame(source.fameNeed() - source.state.fame);
  source.state.tickets = 100;
  assert.equal(source.buyBingo(), true);
  while (!source.state.bingo.round.result) source.drawBingo();
  assert.equal(source.state.bingo.round.result, 'bingo');
  const original = source.exportState();
  const originalPrize = original.bingo.round.prize;
  for (const field of ['tickets', 'amount']) {
    for (const value of [undefined, null, {}, [], { toString: null, valueOf: null }, '3', true, -1, NaN, Infinity]) {
      const saved = structuredClone(original);
      saved.bingo.round.prize[field] = value;
      const loaded = new GameEngine(data, saved, { now: () => now, rng: () => 0 });
      let html;
      assert.doesNotThrow(() => { html = UI.tela(loaded, ctx(loaded, { tela: 'bingo', now })); }, field);
      assert.doesNotMatch(html, /NaN|Infinity|\[object Object\]/);
      assert.deepEqual(loaded.state.bingo.round.prize, { ...originalPrize, [field]: 0 });
      assert.equal(loaded.state.tickets, original.tickets, 'limpar o resultado não cobra nem paga o prêmio de novo');
      assert.equal(loaded.state.cheer, original.cheer);
      assert.equal(loaded.state.stats.bingos, 1);
      const reloaded = new GameEngine(data, loaded.exportState(), { now: () => now, rng: () => 0 });
      assert.deepEqual(reloaded.state.bingo.round.prize, loaded.state.bingo.round.prize);
      assert.equal(reloaded.buyBingo(), true, 'a próxima rodada continua disponível');
    }
  }
  for (const prize of [null, 'prêmio', [], { toString: null, valueOf: null }]) {
    const saved = structuredClone(original);
    saved.bingo.round.prize = prize;
    const loaded = new GameEngine(data, saved, { now: () => now, rng: () => 0 });
    assert.doesNotThrow(() => UI.tela(loaded, ctx(loaded, { tela: 'bingo', now })));
    assert.equal(loaded.state.tickets, original.tickets);
  }
  const loaded = new GameEngine(data, original, { now: () => now, rng: () => 0 });
  assert.deepEqual(loaded.state.bingo.round.prize, originalPrize, 'uma vitória normal conserva o prêmio completo');
  assert.deepEqual(loaded.state.bingo.round.card, original.bingo.round.card);
  assert.deepEqual(loaded.state.bingo.round.drawn, original.bingo.round.drawn);
});

test('a barra da cozinha conserva o tempo da panela quando a Canjica sai para um rolê', () => {
  let clock = 1000000;
  const engine = new GameEngine(data, null, { now: () => clock, rng: () => 0.5 });
  engine.state.size = 30;
  engine.state.crew.canjica = { level: 1 };
  engine.addItem('fogao-lenha');
  engine.equip('fogao-lenha', 'direita');
  engine.state.wood = 100;
  assert.equal(engine.cook('pamonha'), true);
  const pot = engine.state.cozinha.pot;
  clock += (pot.readyAt - pot.startAt) / 4;
  const progress = () => Number(UI.tela(engine, ctx(engine, { tela: 'cozinha', now: clock }))
    .match(/<div class="barra fogo"><i[^>]*style="width:([^%]+)%"/)[1]);
  assert.equal(progress(), 25);
  assert.equal(engine.startOuting(0, 'canjica'), true);
  assert.equal(progress(), 25, 'a saída da cozinheira não altera o intervalo já reservado para esta panela');
});

test('o rolê com carroça começa em zero e mantém seu intervalo depois de trocar o enfeite', () => {
  let clock = 1000000;
  const engine = new GameEngine(data, null, { now: () => clock, rng: () => 0.5 });
  engine.state.size = 30;
  engine.state.crew.cenoura = { level: 1 };
  engine.addItem('carroca');
  engine.equip('carroca', 'direita');
  assert.equal(engine.startOuting(0, 'cenoura'), true);
  const outing = engine.state.outings[0];
  const duration = outing.endsAt - clock;
  const progress = () => Number(UI.tela(engine, ctx(engine, { tela: 'roles', now: clock }))
    .match(/<div class="barra "><i[^>]*style="width:([^%]+)%"/)[1]);
  assert.equal(progress(), 0, 'a viagem reduzida não parece já estar em andamento no instante da partida');
  clock += duration / 4;
  engine.addItem('barraca-comidas');
  assert.equal(engine.equip('barraca-comidas', 'direita'), true);
  assert.equal(progress(), 25, 'trocar o enfeite não recalcula a duração da viagem que já partiu');
});

test('a descrição do rolê mostra a duração efetiva e conserva a viagem contratada após trocar a carroça', () => {
  for (const withCart of [true, false]) {
    const engine = new GameEngine(data, null, { now: () => 1000000, rng: () => 0.5 });
    engine.state.size = 30;
    engine.state.crew.cenoura = { level: 1 };
    engine.addItem('carroca');
    if (withCart) engine.equip('carroca', 'direita');
    const info = () => UI.tela(engine, ctx(engine, { tela: 'roles', now: engine.now() }))
      .match(/<h3>.*?<\/h3><p class="miudo">([^<]*)<\/p>/)[1];
    const before = info();
    assert.equal(engine.startOuting(0, 'cenoura'), true);
    const outing = engine.state.outings[0];
    const travelTime = outing.endsAt - outing.startAt;
    assert.ok(before.includes(UI.duration(travelTime)), 'antes de enviar, a descrição combina com o prazo que será reservado');
    assert.equal(engine.equip(withCart ? 'mastro' : 'carroca', 'direita'), true);
    assert.ok(info().includes(UI.duration(travelTime)), 'a descrição da viagem em andamento não muda com o enfeite');
    const loaded = new GameEngine(data, engine.exportState(), { now: () => engine.now(), rng: () => 0.5 });
    const restored = UI.tela(loaded, ctx(loaded, { tela: 'roles', now: loaded.now() }))
      .match(/<h3>.*?<\/h3><p class="miudo">([^<]*)<\/p>/)[1];
    assert.ok(restored.includes(UI.duration(travelTime)), 'o prazo da viagem também vale depois de recarregar');
    engine.cancelOuting(0);
    const nextTime = data.outings[0].minutes * 60000 * (withCart ? 1 : 0.85);
    assert.ok(info().includes(UI.duration(nextTime)), 'com o posto livre, o tempo volta a refletir o enfeite atual');
  }
});

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
  assert.match(UI.vitrine(engine, ctx(engine, { dockCat: 'chapeu' })), new RegExp(`--colunas:${Math.ceil(hats / 2)}`),
    'itens da loja em duas fileiras, rolando de lado');
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

test('o diário mostra a meta concluída e suas fichas depois do resgate e de recarregar', () => {
  const engine = new GameEngine(data, null, { now: () => 1000000, rng: () => 0 });
  engine.updateGoals();
  const goal = engine.state.goals[0];
  assert.equal(goal.type, 'steps');
  for (let i = 0; i < goal.target; i++) engine.step();
  const reward = engine.claimGoal(0);
  assert.ok(reward);
  const text = `Meta cumprida: +${reward.tickets} fichas`;
  assert.ok(UI.panel(engine, ctx(engine, { tab: 'historico', logFilter: 'tudo' })).includes(text),
    'o resgate tem uma descrição de meta, em vez do identificador interno do contador');
  const loaded = new GameEngine(data, engine.exportState(), { now: () => 1000000, rng: () => 0 });
  const html = UI.panel(loaded, ctx(loaded, { tab: 'historico', logFilter: 'tudo' }));
  assert.ok(html.includes(text), 'o acontecimento continua legível após reabrir');
  assert.equal(loaded.state.log.filter(entry => entry.type === 'goal').length, 1);
  assert.equal(loaded.state.log.find(entry => entry.type === 'goal').id, 'steps');
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

test('o histórico carregado descarta cômodos e moradores inválidos sem perder a festa ou as entradas válidas', () => {
  const source = new GameEngine(data, null, { now: () => 1000000, rng: () => 0.5 });
  source.rename('Casa preservada');
  source.state.cheer = 321;
  const saved = source.exportState();
  const rooms = data.house.rooms.length;
  const residents = rooms * (data.house.perRoom - 1);
  const valid = [...saved.log,
    { type: 'casa-comodo', t: 10, room: 0 }, { type: 'casa-comodo', t: 11, room: rooms - 1 },
    { type: 'casa-morador', t: 12, index: 0 }, { type: 'casa-morador', t: 13, index: residents - 1 }];
  saved.log = [...valid];
  for (const [type, field, limit] of [['casa-comodo', 'room', rooms], ['casa-morador', 'index', residents]]) {
    for (const value of [undefined, null, -1, 0.5, '0', {}, limit, Number.MAX_VALUE]) {
      saved.log.push({ type, t: 14, [field]: value });
    }
  }
  const loaded = new GameEngine(data, saved, { now: () => 1000000, rng: () => 0.5 });
  let html;
  assert.doesNotThrow(() => { html = UI.panel(loaded, ctx(loaded, { tab: 'historico', logFilter: 'tudo' })); });
  assert.match(html, /A casa ganhou um cômodo: Sala/);
  assert.match(html, /Macaxeira se mudou para a casa/);
  assert.deepEqual(loaded.state.log, valid, 'o diário conserva inclusive os últimos cômodos e moradores da casa completa');
  assert.equal(loaded.state.name, 'Casa preservada');
  assert.equal(loaded.state.cheer, 321);
  const reloaded = new GameEngine(data, loaded.exportState(), { now: () => 1000000, rng: () => 0.5 });
  assert.deepEqual(reloaded.state.log, valid, 'os registros descartados não voltam no próximo save');
});

test('o histórico importado descarta marcos incompletos sem gerar coordenadas inválidas no gráfico', () => {
  const source = new GameEngine(data, null, { now: () => 1000000, rng: () => 0.5 });
  source.rename('Histórico preservado');
  while (source.state.size < 12) source.addFame(source.fameNeed() - source.state.fame);
  const saved = source.exportState();
  const valid = [...saved.log,
    { type: 'inicio', t: 1, size: 1 },
    { type: 'tier', t: 2, tier: data.tiers.length - 1 },
    { type: 'grow', t: 3, stage: data.config.growthAt.length }];
  saved.log = [...valid];
  for (const type of ['size', 'inicio']) {
    for (const size of [undefined, null, 0, -1, 0.5, '3', {}, Number.MAX_VALUE]) saved.log.push({ type, t: 4, size });
  }
  for (const [type, field, max] of [['tier', 'tier', data.tiers.length - 1], ['grow', 'stage', data.config.growthAt.length]]) {
    for (const value of [undefined, null, -1, 0.5, '1', {}, max + 1]) saved.log.push({ type, t: 5, [field]: value });
  }
  saved.log.push({ type: 'size', t: -1, size: 3 });
  const loaded = new GameEngine(data, saved, { now: () => 1000000, rng: () => 0.5 });
  for (const logFilter of ['desbloqueios', 'tudo']) {
    const html = UI.panel(loaded, ctx(loaded, { tab: 'historico', logFilter }));
    assert.doesNotMatch(html, /NaN|Infinity/, `${logFilter}: a curva e seus marcos têm coordenadas finitas`);
    assert.match(html, /2º convidado chegou e trouxe: Pé de milho/);
  }
  assert.deepEqual(loaded.state.log, valid);
  assert.equal(loaded.state.name, source.state.name);
  assert.equal(loaded.state.size, source.state.size);
  assert.deepEqual(new GameEngine(data, loaded.exportState(), { now: () => 1000000, rng: () => 0.5 }).state.log, valid);
});

test('objetos ou listas em registros importados não impedem o diário nem apagam os acontecimentos válidos', () => {
  const source = new GameEngine(data, null, { now: () => 1000000, rng: () => 0.5 });
  while (source.state.size < 12) source.addFame(source.fameNeed() - source.state.fame);
  source.state.cheer = 10000;
  source.buyLevel('rebolado');
  source.buyLevel('rebolado');
  source.openLetter();
  source.addItem('chapeu-coco');
  const saved = source.exportState();
  const valid = [...saved.log];
  const records = [['item', 'id'], ['letter', 'tickets'], ['level', 'key'], ['debug', 'op'], ['year', 'bonus'], ['rings', 'mult']];
  for (const [type, field] of records) {
    for (const value of [{}, [], { toString: null, valueOf: null }]) saved.log.push({ type, t: 6, [field]: value });
  }
  const loaded = new GameEngine(data, saved, { now: () => 1000000, rng: () => 0.5 });
  let html;
  assert.doesNotThrow(() => { html = UI.panel(loaded, ctx(loaded, { tab: 'historico', logFilter: 'tudo' })); });
  assert.match(html, /Rebolado: nível 1 → 3/);
  assert.ok(html.includes(source.items['chapeu-coco'].name));
  assert.deepEqual(loaded.state.log, valid, 'as compras e os desbloqueios da partida continuam no diário');
  assert.equal(loaded.state.cheer, source.state.cheer);
  assert.deepEqual(new GameEngine(data, loaded.exportState(), { now: () => 1000000, rng: () => 0.5 }).state.log, valid);
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

test('placa e painel: o bônus de 10 min da horta aparece como selo com o tempo e o bônus fixo entra no painel da festa', () => {
  const engine = new GameEngine(data);
  assert.doesNotMatch(UI.hud(engine, ctx(engine)), /Milho: Animação/);
  engine.state.minis.horta.buffs = { milho: engine.now() + 5 * 60000, abobora: engine.now() + 9 * 60000 };
  engine.state.minis.horta.harvested = { milho: 1, abobora: 2 };
  const hud = UI.hud(engine, ctx(engine));
  assert.match(hud, /Milho: Animação \+10%/);
  assert.match(hud, /Abóbora: Chance de cobra \+15%/);
  assert.match(UI.panel(engine, ctx(engine, { tab: 'festa' })), /Horta \(bônus fixo\)[^]*\+20%/);
});

test('loja: os conjuntos vêm do menor para o maior bônus, e o bônus é o destaque do cartão, com uma faixa de cor por nível', () => {
  const engine = new GameEngine(data);
  const html = UI.vitrine(engine, ctx(engine, { dockCat: 'conjuntos' }));
  const cards = [...html.matchAll(/data-id="([^"]+)" data-faixa="(\d)"[^]*?<b class="bonus">\+(\d+)%<\/b>/g)]
    .map(match => ({ id: match[1], tier: Number(match[2]), bonus: Number(match[3]) }));
  assert.equal(cards.length, data.sets.length, 'todos os conjuntos aparecem');
  const order = id => data.sets.findIndex(set => set.id === id);
  cards.forEach((card, index) => {
    const set = data.sets[order(card.id)];
    assert.equal(card.bonus, Math.round(set.bonus * 100), `${card.id}: o cartão mostra o bônus do conjunto`);
    assert.equal(card.tier, data.config.setTiers.filter(min => set.bonus >= min).length, `${card.id}: faixa de cor`);
    if (!index) return;
    const before = cards[index - 1];
    assert.ok(before.bonus <= card.bonus, `${before.id} (+${before.bonus}%) antes de ${card.id} (+${card.bonus}%)`);
    if (before.bonus === card.bonus) assert.ok(order(before.id) < order(card.id), 'empate: ordem dos dados');
    assert.ok(before.tier <= card.tier, 'a faixa só sobe');
  });
  assert.deepEqual([...new Set(cards.map(card => card.tier))], [0, 1, 2, 3], 'as quatro faixas existem');
  assert.match(html, /<b class="nome">Caipira de Raiz<\/b>/, 'o nome continua no cartão');
  assert.match(UI.vitrine(engine, ctx(engine, { dockCat: 'conjuntos' })), /Do menor para o maior bônus/, 'a dica diz a ordem');
});

test('painel e modo de teste: a linha das visitas do folclore só aparece com a Mata aberta e o botão chama as visitas', () => {
  const engine = new GameEngine(data);
  assert.doesNotMatch(UI.panel(engine, ctx(engine, { tab: 'festa' })), /Visitas do folclore/);
  engine.state.size = engine.state.records.size = 60;
  assert.match(UI.panel(engine, ctx(engine, { tab: 'festa' })), /Visitas do folclore: 0 de 20 liberadas, 0 vezes pegas\./);
  engine.state.minis.mata.kills['fogo-fatuo'] = 1;
  engine.state.minis.mata.kills['curupira'] = 1;
  engine.mini('folclore').start('luzinha');
  engine.mini('folclore').act();
  assert.match(UI.panel(engine, ctx(engine, { tab: 'festa' })), /Visitas do folclore: 2 de 20 liberadas, 1 vezes pegas\./);
  engine.cfg.debugMenu = true;
  try {
    assert.match(UI.tela(engine, ctx(engine, { tela: 'teste' })), /data-op="folclore"[^>]*>Visita do folclore/);
  } finally {
    engine.cfg.debugMenu = false;
  }
});

test('tela dos prêmios: um cartão por minigame, o que falta aparece com "?", o presente do personagem mostra se está pronto ou quando volta', () => {
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(data, null, { now: () => clock.t });
  const html = () => UI.tela(engine, ctx(engine, { tela: 'premios', now: clock.t }));
  let page = html();
  assert.equal((page.match(/class="cartao jogo-premio/g) || []).length, 35, 'um cartão por minigame');
  assert.match(page, /Prêmios dos minigames/);
  assert.match(page, /0 de 105/);
  assert.match(page, /\+0,5% de Animação/);
  assert.equal((page.match(/class="vazio">\?/g) || []).length, 105, 'tudo falta: 105 quadrinhos "?"');
  assert.match(page, /Faltam 60 vezes para o troféu de ouro\./);
  assert.match(page, /Ursinhos de Ouro/);
  assert.match(page, /Faltam 3 vezes para ir à festa\./);
  assert.match(page, /Faltam 12 vezes para chegar à festa\./);
  assert.match(page, /<small>0\/3<\/small>/);
  assert.match(page, /0 vezes/);
  // Liberou a coisa: nome, texto e o ícone no lugar do "?".
  const icons = [];
  const withIcons = () => UI.tela(engine, { ...ctx(engine, { tela: 'premios', now: clock.t }), icon: (key, size) => { icons.push(key); return `<img data-icone="${key}">`; } });
  for (let i = 0; i < 3; i++) engine.emit('rings', { hits: 1, mult: 1 });
  page = withIcons();
  assert.match(page, /Pilha de Ursinhos/);
  assert.match(page, /Os ursinhos que a barraca das argolas dá de prêmio/);
  assert.ok(icons.includes('premio:ursinhos'));
  assert.ok(!icons.includes('premio:zeca-argolas'), 'o personagem que falta não mostra a cara');
  assert.match(page, /Faltam 9 vezes para chegar à festa\./);
  assert.match(page, /1 de 105/);
  assert.match(page, /3 vezes/);
  // O personagem chegou: presente pronto; depois de pegar, o tempo que falta.
  for (let i = 3; i < 12; i++) engine.emit('rings', { hits: 1, mult: 1 });
  page = html();
  assert.match(page, /Zeca das Argolas/);
  assert.match(page, /Presente pronto! Clique nele na festa\./);
  assert.equal(engine.premios.gift('zeca-argolas').ok, true);
  page = html();
  assert.doesNotMatch(page, /Presente pronto!/);
  assert.match(page, /Próximo presente em <b data-until="\d+">20min/);
  assert.doesNotMatch(page, /jogo-premio feita/, 'falta o troféu de ouro: o cartão ainda não é verde');
  // O botão da placa, o nome da tela, a linha do painel e o diário.
  assert.equal(UI.telaName('premios'), 'Prêmios dos minigames');
  assert.match(UI.hud(engine, ctx(engine, { tela: 'premios' })), /<button class="ferramenta aberta" data-action="tela" data-tela="premios" title="Prêmios dos minigames"/);
  assert.match(UI.hud(engine, ctx(engine, { tela: 'album' })), /<button class="ferramenta " data-action="tela" data-tela="premios" title="Prêmios dos minigames"/);
  assert.match(UI.panel(engine, ctx(engine, { tab: 'festa' })), /Prêmios dos minigames \(fixo\)/);
  assert.match(UI.panel(engine, ctx(engine, { tab: 'historico' })), /Prêmio de Argolas da Sorte: Zeca das Argolas/);
});

test('tela dos prêmios: um minigame com os três prêmios vira cartão verde e o modo de teste tem o botão que libera o próximo', () => {
  const engine = new GameEngine(data);
  engine.state.premios.count.pescaria = 99;
  engine.premios.unlock('pescaria');
  const page = UI.tela(engine, ctx(engine, { tela: 'premios' }));
  const cards = page.split('class="cartao jogo-premio');
  const fishing = cards.find(card => card.includes('Pescaria'));
  assert.match(fishing, /^ feita/, 'cartão do jogo completo');
  assert.equal(cards.filter(card => card.startsWith(' feita')).length, 1);
  assert.match(fishing, /selo verde/);
  engine.cfg.debugMenu = true;
  try {
    assert.match(UI.tela(engine, ctx(engine, { tela: 'teste' })), /data-op="premio"[^>]*>Liberar o próximo prêmio/);
  } finally {
    engine.cfg.debugMenu = false;
  }
});

test('tela dos prêmios: explica o Desfile dos Prêmios e quantos personagens faltam; o diário e o modo de teste conhecem o desfile', () => {
  const engine = new GameEngine(data);
  assert.match(UI.tela(engine, ctx(engine, { tela: 'premios' })), /Desfile dos Prêmios: com 6 personagens ou mais na festa \(você tem 0\)/);
  for (const game of data.premios.jogos.slice(0, 7)) {
    engine.state.premios.count[game.id] = 99;
    engine.premios.unlock(game.id);
  }
  assert.match(UI.tela(engine, ctx(engine, { tela: 'premios' })), /\(você tem 7\)/);
  engine.premios.startParade();
  assert.equal(engine.premios.catchParade().ok, true);
  assert.match(UI.panel(engine, ctx(engine, { tab: 'historico', logFilter: 'tudo' })), /Desfile dos Prêmios com 7 personagens: prêmio pego/);
  engine.cfg.debugMenu = true;
  try {
    assert.match(UI.tela(engine, ctx(engine, { tela: 'teste' })), /data-op="desfile"[^>]*>Desfile dos Prêmios/);
  } finally {
    engine.cfg.debugMenu = false;
  }
});

test('eventos do mundo: a placa mostra o evento no ar com os alvos pegos e o tempo, o Painel conta os vistos e o diário e o modo de teste conhecem', () => {
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(data, null, { now: () => clock.t });
  engine.state.size = engine.state.records.size = 60;
  const now = clock.t;
  assert.doesNotMatch(UI.hud(engine, ctx(engine, { now })), /Chuva de estrelas/);
  assert.match(UI.panel(engine, ctx(engine, { tab: 'festa' })), new RegExp(`Eventos do mundo: 0 vistos, 0 de ${TOTAL} tipos\\.`));
  engine.mundo.start('estrelas');
  const hud = UI.hud(engine, ctx(engine, { now }));
  assert.match(hud, /Chuva de estrelas 0\/8 <b data-until="\d+">/);
  assert.match(hud, /title="Uma chuva de estrelas cadentes risca o céu/);
  engine.mundo.catchTarget(0);
  assert.match(UI.hud(engine, ctx(engine, { now })), /Chuva de estrelas 1\/8/);
  assert.match(UI.panel(engine, ctx(engine, { tab: 'festa' })), new RegExp(`Eventos do mundo: 1 vistos, 1 de ${TOTAL} tipos\\.`));
  assert.match(UI.panel(engine, ctx(engine, { tab: 'historico', logFilter: 'tudo' })), /Evento do mundo: Chuva de estrelas/);
  for (let k = 1; k < 8; k++) engine.mundo.catchTarget(k);
  assert.match(UI.panel(engine, ctx(engine, { tab: 'historico', logFilter: 'tudo' })), /Evento do mundo completo: Chuva de estrelas/);
  engine.cfg.debugMenu = true;
  try {
    assert.match(UI.tela(engine, ctx(engine, { tela: 'teste' })), /data-op="mundo"[^>]*>Evento do mundo \(o próximo da lista\)/);
  } finally {
    engine.cfg.debugMenu = false;
  }
});

test('tela dos eventos do mundo: um cartão por evento, o que não passou aparece com "?", o que está no ar fica em destaque, e o botão da placa abre a tela', () => {
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(data, null, { now: () => clock.t });
  engine.state.size = engine.state.records.size = 60;
  const icons = [];
  const view = () => UI.tela(engine, { ...ctx(engine, { tela: 'mundo', now: clock.t }), icon: key => { icons.push(key); return ''; } });
  let page = view();
  assert.equal((page.match(/class="cartao evento-mundo/g) || []).length, TOTAL, 'um cartão por evento');
  assert.equal((page.match(/class="cartao evento-mundo desconhecido/g) || []).length, TOTAL, 'nenhum passou ainda');
  assert.match(page, /Eventos do mundo/);
  assert.match(page, new RegExp(`0 de ${TOTAL}`));
  assert.match(page, /De 15 a 30 minutos depois do último/);
  assert.match(page, /Aparece com 12 convidados ou mais\./);
  assert.match(page, /Aparece com 40 convidados ou mais\./);
  assert.equal((page.match(/class="vazio">\?/g) || []).length, TOTAL);
  clock.t += 1000;
  engine.tick(1);
  // A previsão: o evento sorteado para a hora marcada aparece pelo nome (e some quando ele começa).
  const planned = engine.mundo.forecast().entry;
  assert.match(view(), new RegExp(String.raw`Previsão do tempo: ${planned.name} em cerca de <b data-until="[\d.]+">`));
  engine.state.mundo.nextId = '';
  assert.match(view(), /Próximo evento em cerca de <b data-until="[\d.]+">/, 'sem previsão, só a hora');
  // O evento no ar: nome, texto, números e os alvos pegos com o tempo que falta.
  engine.mundo.start('estrelas');
  icons.length = 0;
  page = view();
  assert.match(page, /class="cartao evento-mundo agora"/);
  assert.match(page, /<h3>Chuva de estrelas<\/h3>/);
  assert.match(page, /Uma chuva de estrelas cadentes risca o céu/);
  assert.match(page, /Passou 1× · alvos pegos: 0 · alvos por vez: 8 · bônus de \+10%/);
  assert.match(page, /No ar agora: 0 de 8 alvos, faltam <b data-until="\d+">/);
  assert.doesNotMatch(page, /Próximo evento/, 'enquanto passa não tem próximo marcado');
  assert.ok(icons.includes('mundo:estrelas'));
  assert.ok(!icons.includes('mundo:cometa'), 'o que não passou não mostra o ícone');
  assert.match(page, new RegExp(`1 de ${TOTAL}`));
  engine.mundo.catchTarget(0);
  engine.mundo.catchTarget(1);
  page = view();
  assert.match(page, /No ar agora: 2 de 8 alvos/);
  assert.match(page, /alvos pegos: 2 ·/);
  // O botão da placa e o nome da tela.
  assert.equal(UI.telaName('mundo'), 'Eventos do mundo');
  assert.match(UI.hud(engine, ctx(engine, { tela: 'mundo', now: clock.t })), /<button class="ferramenta aberta" data-action="tela" data-tela="mundo" title="Eventos do mundo"/);
  assert.match(UI.hud(engine, ctx(engine, { tela: 'album', now: clock.t })), /<button class="ferramenta " data-action="tela" data-tela="mundo" title="Eventos do mundo"/);
});

test('feira do mundo: a placa mostra cada bônus comprado com o nome, quanto soma e o tempo que falta', () => {
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(data, null, { now: () => clock.t });
  engine.state.size = engine.state.records.size = 60;
  engine.state.tickets = 50;
  assert.doesNotMatch(UI.hud(engine, ctx(engine, { now: clock.t })), /Pamonha quentinha/);
  engine.mundo.start('feira');
  engine.mundo.catchTarget(0);
  engine.mundo.catchTarget(1);
  const hud = UI.hud(engine, ctx(engine, { now: clock.t }));
  assert.match(hud, /Pamonha quentinha \+15% <b data-until="[\d.]+">/);
  assert.match(hud, /Quentão do Seu Zé \+25% <b data-until="[\d.]+">/);
  assert.match(hud, /Feira de São João 2\/3 <b data-until/);
  assert.match(hud, /title="Bônus comprado na feira: soma à Animação até acabar o tempo\."/);
});

test('evento do mundo sem alvos: a placa mostra o nome com o bônus (sem contar alvos) e a tela diz que é só o bônus', () => {
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(data, null, { now: () => clock.t });
  engine.state.size = engine.state.records.size = 60;
  engine.mundo.start('poente');
  const hud = UI.hud(engine, ctx(engine, { now: clock.t }));
  assert.match(hud, /Pôr do sol de São João \+20% <b data-until="[\d.]+">/);
  assert.doesNotMatch(hud, /Pôr do sol de São João 0\/0/);
  const page = UI.tela(engine, ctx(engine, { tela: 'mundo', now: clock.t }));
  assert.match(page, /Passou 1× · bônus de \+20% enquanto dura/);
  assert.match(page, /No ar agora: faltam <b data-until/);
  assert.doesNotMatch(page, /alvos por vez: 0/);
});

test('tela dos eventos do mundo: no dia certo marca "Mais comum hoje" nos eventos da época que já passaram (só nos vistos)', () => {
  const date = new Date(2026, 5, 24, 12).getTime();
  const engine = new GameEngine(data, null, { now: () => date });
  engine.state.size = engine.state.records.size = 60;
  engine.state.mundo.seen.fogos = 1;
  engine.state.mundo.seen.estrelas = 1;
  const page = UI.tela(engine, ctx(engine, { tela: 'mundo', now: date }));
  assert.match(page, /<h3>Show de fogos <span class="selo ouro">Mais comum hoje<\/span><\/h3>/);
  assert.match(page, /<h3>Chuva de estrelas<\/h3>/, 'o que não é da época não ganha selo');
  assert.equal((page.match(/Mais comum hoje/g) || []).length, 1, 'só o visto e reforçado');
  // Num dia comum nenhum selo aparece.
  const normal = new Date(2026, 10, 14, 12).getTime();
  const other = new GameEngine(data, null, { now: () => normal });
  other.state.size = other.state.records.size = 60;
  other.state.mundo.seen.fogos = 1;
  assert.doesNotMatch(UI.tela(other, ctx(other, { tela: 'mundo', now: normal })), /Mais comum hoje/);
});

test('placa: "Em breve" mostra o próximo evento com a contagem só quando falta pouco, e some quando ele começa', () => {
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(data, null, { now: () => clock.t });
  engine.state.size = engine.state.records.size = 60;
  assert.doesNotMatch(UI.hud(engine, ctx(engine, { now: clock.t })), /Em breve/);
  engine.state.mundo.nextId = 'tremor';
  engine.state.mundo.nextAt = clock.t + 600000;
  assert.doesNotMatch(UI.hud(engine, ctx(engine, { now: clock.t })), /Em breve/, 'dez minutos: ainda não avisa');
  engine.state.mundo.nextAt = clock.t + 45000;
  const hud = UI.hud(engine, ctx(engine, { now: clock.t }));
  assert.match(hud, /<span class="selo" title="O povo pisa tão forte no forró[^"]*">Em breve: Tremor de forró <b data-until="[\d.]+">/);
  engine.mundo.start('tremor');
  const during = UI.hud(engine, ctx(engine, { now: clock.t }));
  assert.doesNotMatch(during, /Em breve/);
  assert.match(during, /Tremor de forró 0\/5/);
});

test('tela dos eventos do mundo: o evento que puxa outro mostra o seguinte se já passou (senão só a dica), e o que não puxa nada não ganha linha', () => {
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(data, null, { now: () => clock.t });
  engine.state.size = engine.state.records.size = 60;
  engine.state.mundo.seen.calorao = 1;
  engine.state.mundo.seen.cometa = 1;
  let page = UI.tela(engine, ctx(engine, { tela: 'mundo', now: clock.t }));
  assert.match(page, /<h3>Calorão<\/h3>[\s\S]*?<small>Às vezes puxa outro evento que você ainda não viu\.<\/small>/);
  assert.equal((page.match(/Às vezes puxa/g) || []).length, 1, 'só o calorão (o cometa não puxa nada e os outros não passaram)');
  // O seguinte já visto aparece pelo nome.
  engine.state.mundo.seen.temporal = 1;
  page = UI.tela(engine, ctx(engine, { tela: 'mundo', now: clock.t }));
  assert.match(page, /Às vezes puxa: Temporal com apagão/);
  // O temporal também puxa (a cheia), que ainda não passou.
  assert.equal((page.match(/Às vezes puxa/g) || []).length, 2);
});

test('vitrine: cada item pertence a um grupo (clássicos, criativos, os três temas ou prêmios) e a conta bate com os dados', () => {
  const caso = { 'chapeu-palha': 'classicos', 'barraca-pescaria': 'classicos', 'cartola-magica': 'criativos', 'varal-peixe': 'criativos', 'capuz-dino': 'dino',
    'vulcao-pipoca': 'dino', 'chapeu-bruxa': 'halloween', 'casinha-pe-de-galinha': 'halloween', 'cerebro-exposto': 'zumbi', 'kombi-pamonha': 'zumbi',
    'cabelo-curupira': 'premios', 'veu-noiva': 'premios', 'sanfona-ouro': 'premios' };
  const byId = Object.fromEntries(data.items.map(item => [item.id, item]));
  for (const [id, grupo] of Object.entries(caso)) assert.equal(UI.itemGroup(byId[id]), grupo, id);
  assert.deepEqual(UI.GROUPS.map(group => group.id), ['classicos', 'criativos', 'dino', 'halloween', 'zumbi', 'premios']);
  for (const item of data.items) assert.ok(UI.GROUPS.some(group => group.id === UI.itemGroup(item)), item.id);
});

test('vitrine: as pílulas filtram a categoria por grupo (com quantos já são seus), a grade tem duas fileiras e cada grupo vai do mais barato ao mais caro', () => {
  const engine = new GameEngine(data, null, { rng: () => 0.5 });
  const todos = UI.vitrine(engine, ctx(engine, { dockCat: 'chapeu' }));
  // As pílulas: Todos e um por grupo que existe na categoria, a primeira ativa.
  assert.match(todos, /<button class="vfiltro ativa" data-action="vitrine-grupo" data-grupo="todos"><span>Todos<\/span><small>1\/\d+<\/small><\/button>/);
  for (const grupo of ['classicos', 'criativos', 'dino', 'halloween', 'zumbi', 'premios']) {
    assert.match(todos, new RegExp(`data-action="vitrine-grupo" data-grupo="${grupo}" data-cor="${grupo}"`), `pílula de ${grupo}`);
  }
  assert.match(todos, /<span>Dinossauros<\/span><small>0\/2<\/small>/);
  assert.match(todos, /<span>Halloween<\/span><small>0\/3<\/small>/);
  assert.match(todos, /<span>Zumbis<\/span><small>0\/2<\/small>/);
  const hats = data.items.filter(item => item.cat === 'chapeu').length;
  assert.match(todos, new RegExp(`--colunas:${Math.ceil(hats / 2)}`), 'duas fileiras, rolando de lado');
  assert.equal((todos.match(/data-action="vitrine-item"/g) || []).length, hats);
  // Ordem: os clássicos primeiro (do mais barato), os temas depois.
  const ids = [...todos.matchAll(/data-action="vitrine-item" data-id="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids[0], 'chapeu-palha');
  assert.ok(ids.indexOf('chapeu-palha') < ids.indexOf('fatia-melancia') && ids.indexOf('fatia-melancia') < ids.indexOf('capuz-dino') &&
    ids.indexOf('capuz-dino') < ids.indexOf('chapeu-bruxa') && ids.indexOf('chapeu-bruxa') < ids.indexOf('cerebro-exposto') &&
    ids.indexOf('cerebro-exposto') < ids.indexOf('cabelo-curupira'), 'grupos na ordem');
  const price = id => data.items.find(item => item.id === id).price;
  const classicos = ids.filter(id => UI.itemGroup(data.items.find(item => item.id === id)) === 'classicos');
  assert.deepEqual(classicos.map(price), [...classicos.map(price)].sort((a, b) => a - b), 'do mais barato ao mais caro');
  // Filtro: só os itens do grupo, a pílula dele ativa e as outras não.
  const dino = UI.vitrine(engine, ctx(engine, { dockCat: 'chapeu', dockGroups: { chapeu: 'dino' } }));
  assert.deepEqual([...dino.matchAll(/data-action="vitrine-item" data-id="([^"]+)"/g)].map(match => match[1]), ['capuz-dino', 'crista-estegossauro']);
  assert.match(dino, /<button class="vfiltro ativa" data-action="vitrine-grupo" data-grupo="dino" data-cor="dino">/);
  assert.doesNotMatch(dino, /vfiltro ativa" data-action="vitrine-grupo" data-grupo="todos"/);
  assert.match(dino, /--colunas:1\b/);
  // Cada categoria lembra o seu filtro: o de chapéus não vale para os varais, que nem têm o grupo (volta para Todos).
  const varais = UI.vitrine(engine, ctx(engine, { dockCat: 'varal', dockGroups: { chapeu: 'dino', varal: 'dino' } }));
  assert.match(varais, /<button class="vfiltro ativa" data-action="vitrine-grupo" data-grupo="todos">/);
  assert.doesNotMatch(varais, /data-grupo="dino"/);
  // Comprar muda a contagem das pílulas (um item de dinossauro, 1/2).
  engine.state.size = engine.state.records.size = 120;
  engine.addItem('capuz-dino');
  assert.match(UI.vitrine(engine, ctx(engine, { dockCat: 'chapeu' })), /<span>Dinossauros<\/span><small>1\/2<\/small>/);
});

test('vitrine: o cartão traz o grupo, o ícone e o estado (preço, usar, em uso, trancado ou só em algum lugar), e os cenários mantêm os botões dos lados', () => {
  const engine = new GameEngine(data, null, { rng: () => 0.5 });
  const lado = UI.vitrine(engine, ctx(engine, { dockCat: 'lado' }));
  assert.match(lado, /<span class="vlados">[\s\S]*data-action="vitrine-lado" data-side="esquerda"[\s\S]*data-action="vitrine-lado" data-side="direita"/);
  // Esquerda/Direita ficam fora da faixa de pílulas que rola de lado (com muitos temas, ficavam escondidas no fim dela).
  const pills = lado.match(/<div class="vfiltros" role="group">([\s\S]*?)<\/div><span class="vlados">/);
  assert.ok(pills, 'a faixa das pílulas fecha antes dos botões dos lados');
  assert.ok(!pills[1].includes('vitrine-lado'), 'nenhum botão de lado dentro da faixa que rola');
  assert.match(lado, /<div class="vfiltros-linha"><div class="vfiltros" role="group">/);
  assert.match(lado, /data-grupo="dino" data-preview="rex-sanfoneiro"/);
  assert.match(lado, /vcard item especial" role="button" tabindex="0" data-action="vitrine-item" data-id="rex-sanfoneiro"[\s\S]*?🔒 Festa da Cidade|🔒/);
  const card = id => UI.vitrine(engine, ctx(engine, { dockCat: 'chapeu' })).match(new RegExp(`<div class="vcard item[^>]+data-id="${id}"[\\s\\S]*?</span></div>`))[0];
  assert.match(card('chapeu-palha'), /vcard item uso/);
  assert.match(card('chapeu-palha'), /data-grupo="classicos"/);
  assert.match(card('palha-furada'), /<span class="preco" data-cost="6" data-currency="tickets">/);
  assert.match(card('capuz-dino'), /🔒/);
  assert.match(card('cabelo-curupira'), /Só na Mata Encantada/);
  assert.match(card('capuz-dino'), /<b class="nome">Dino de Estimação<\/b>/);
});

test('vitrine: o detalhe mostra o item com grupo, preço ou porte, texto e os conjuntos dele (e o conjunto com o que falta)', () => {
  const engine = new GameEngine(data, null, { rng: () => 0.5 });
  const trancado = UI.vitrineDetalhe(engine, ctx(engine), 'capuz-dino');
  assert.match(trancado, /<b>Dino de Estimação<\/b>/);
  assert.match(trancado, /<span class="vtag" data-grupo="dino">Dinossauros<\/span>/);
  assert.match(trancado, /<span class="vtag trava">🔒 /);
  assert.match(trancado, /T-Rex bebê/);
  assert.match(trancado, /Conjunto Era Jurássica \(\+10%\): Dino de Estimação \+ Coxa de Dinossauro Assada \+ Pele de Dinossauro/);
  const barato = UI.vitrineDetalhe(engine, ctx(engine), 'palha-furada');
  assert.match(barato, /<span class="vtag preco">[^<]*<img[^>]*>6<\/span>|<span class="vtag preco">6<\/span>/);
  assert.match(barato, /data-grupo="classicos">São João</);
  engine.state.size = engine.state.records.size = 120;
  engine.addItem('osso-dino');
  assert.match(UI.vitrineDetalhe(engine, ctx(engine), 'osso-dino'), /<span class="vtag tem">É seu<\/span>/);
  // Peça em mais de um conjunto: só os nomes e bônus (a linha é curta).
  assert.match(UI.vitrineDetalhe(engine, ctx(engine), 'capacete-sobrevivente'), /Conjuntos: Sobrevivente \+11%, Doutor do Apocalipse \+12%/);
  // O conjunto: nome, bônus, grupo e o que falta.
  const set = UI.vitrineDetalhe(engine, ctx(engine), 'set:era-jurassica');
  assert.match(set, /<b>Era Jurássica<\/b><span class="vtag bonus">\+10%<\/span><span class="vtag" data-grupo="dino">Dinossauros<\/span>/);
  assert.match(set, /Faltam: Dino de Estimação, Pele de Dinossauro\./);
  assert.equal(UI.vitrineDetalhe(engine, ctx(engine), 'nao-existe'), '');
  assert.equal(UI.vitrineDetalhe(engine, ctx(engine), 'set:nao-existe'), '');
});

test('vitrine: os conjuntos também têm pílulas por tema, cartões com as três peças (apagadas as que faltam) e o bônus em destaque', () => {
  const engine = new GameEngine(data, null, { rng: () => 0.5 });
  const todos = UI.vitrine(engine, ctx(engine, { dockCat: 'conjuntos' }));
  assert.equal((todos.match(/data-action="vitrine-conjunto"/g) || []).length, data.sets.length);
  for (const grupo of ['classicos', 'criativos', 'dino', 'halloween', 'zumbi', 'premios']) assert.match(todos, new RegExp(`data-action="vitrine-grupo" data-grupo="${grupo}" data-cor="${grupo}"`), grupo);
  assert.match(todos, /<span>Dinossauros<\/span><small>0\/2<\/small>/);
  assert.match(todos, /<span>Zumbis<\/span><small>0\/3<\/small>/);
  const halloween = UI.vitrine(engine, ctx(engine, { dockCat: 'conjuntos', dockGroups: { conjuntos: 'halloween' } }));
  assert.deepEqual([...halloween.matchAll(/data-action="vitrine-conjunto" data-id="([^"]+)"/g)].map(match => match[1]), ['bruxa', 'doce-ou-travessura', 'assombracao']);
  assert.match(halloween, /<b class="nome">Bruxa da Festa<\/b><b class="bonus">\+10%<\/b>/);
  // As peças: as que o jogador não tem aparecem apagadas (falta), as que tem acesas (tem).
  engine.addItem('chapeu-bruxa');
  const comPeca = UI.vitrine(engine, ctx(engine, { dockCat: 'conjuntos', dockGroups: { conjuntos: 'halloween' } }));
  const bruxa = comPeca.match(/data-id="bruxa"[\s\S]*?<span class="estado">[^<]*<\/span>/)[0];
  assert.equal((bruxa.match(/class="peca tem"/g) || []).length, 1);
  assert.equal((bruxa.match(/class="peca falta"/g) || []).length, 2);
  assert.match(bruxa, /Faltam 2/);
});

test('placa: o tamanho (com a porcentagem) e o botão de fechar ficam juntos no fim da barra, e o CSS não deixa o botão do tamanho encolher nem vazar o texto', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const engine = new GameEngine(data, null, { rng: () => 0.5 });
  const barra = UI.hud(engine, ctx(engine, { desktop: true, zoomLabel: '150%' })).match(/<div class="barra-sistema">[\s\S]*?<\/div>/)[0];
  // O grupo do fim leva o botão de tamanho (ícone + porcentagem) e o de fechar, nessa ordem, depois do espaço.
  assert.match(barra, /<span class="espaco"><\/span><span class="barra-fim"><button class="ferramenta zoom alca" data-action="zoom-alca"[^>]*>(<img[^>]*>)?<b data-live="zoom">150%<\/b><\/button>/);
  assert.match(barra, /<button class="ferramenta fechar-jogo[^>]*data-action="fechar-jogo"[\s\S]*?<\/button><\/span>/);
  // Sem o jogo de desktop não tem botão de fechar, e o de tamanho continua no grupo.
  assert.doesNotMatch(UI.hud(engine, ctx(engine, { desktop: false })), /fechar-jogo/);
  assert.match(UI.hud(engine, ctx(engine, { desktop: false })), /<span class="barra-fim"><button class="ferramenta zoom alca"/);
  assert.match(UI.hud(engine, ctx(engine)), /<b data-live="zoom">100%<\/b>/, 'sem rótulo, 100%');
  // O estilo: a barra quebra de linha em vez de espremer, o grupo do fim nunca encolhe e o texto do botão não quebra nem vaza.
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'style.css'), 'utf8');
  assert.match(css, /\.barra-sistema \{[^}]*flex-wrap: wrap/);
  assert.match(css, /\.barra-fim \{[^}]*margin-left: auto/);
  assert.match(css, /\.barra-fim \.ferramenta \{ flex: none; \}/);
  assert.match(css, /\.ferramenta\.zoom \{[^}]*white-space: nowrap/);
});

test('placa: as coleções e as janelas ficam em gavetas (fechadas por padrão, uma aberta de cada vez) e a barra de cima só leva o essencial', () => {
  const engine = new GameEngine(data);
  while (engine.state.size < 30) engine.addFame(engine.fameNeed() - engine.state.fame);
  const minis = [{ id: 'cordel', name: 'Cordel da Mandioca', visible: false, pending: 3 }, { id: 'bichos', name: 'Quintal dos Bichos', visible: true, pending: 2 }];
  const hud = (settings = {}, extra = {}) => UI.hud(engine, ctx(engine, { minis, settings: { scale: 3, pinned: true, hud: 'sempre', ...settings }, ...extra }));
  const barra = html => html.match(/<div class="barra-sistema">[\s\S]*?<\/div>/)[0];
  const gaveta = (html, id) => html.match(new RegExp(`<div class="barra-gaveta[^"]*" data-gaveta="${id}"[^>]*>[\\s\\S]*?</div>`))[0];
  // Fechadas: as duas gavetas existem mas escondidas, e a barra tem painel, conquistas e os dois botões de gaveta (álbum, prêmios e mundo não ficam nela).
  const fechada = hud();
  assert.match(gaveta(fechada, 'colecoes'), /data-gaveta="colecoes" hidden>/);
  assert.match(gaveta(fechada, 'janelas'), /data-gaveta="janelas" hidden>/);
  assert.match(barra(fechada), /data-action="abrir"/);
  assert.match(barra(fechada), /data-action="tab" data-tab="conquistas"/);
  assert.match(barra(fechada), /data-action="gaveta" data-gaveta="colecoes"/);
  assert.match(barra(fechada), /data-action="gaveta" data-gaveta="janelas"/);
  assert.doesNotMatch(barra(fechada), /data-tela="album"|data-tela="premios"|data-tela="mundo"|data-action="mini"/);
  assert.match(barra(fechada), /aria-expanded="false"/);
  // As coleções (álbum, prêmios, eventos do mundo) moram na gaveta delas e as janelas (a casa e os minijogos) na outra.
  for (const id of ['album', 'premios', 'mundo']) assert.match(gaveta(fechada, 'colecoes'), new RegExp(`data-action="tela" data-tela="${id}"`));
  assert.match(gaveta(fechada, 'janelas'), /data-action="mini" data-mini="cordel"/);
  assert.match(gaveta(fechada, 'janelas'), /data-action="mini" data-mini="bichos"/);
  // Aberta: a gaveta aparece, o botão dela fica marcado e a outra continua escondida.
  const colecoes = hud({ gaveta: 'colecoes' });
  assert.doesNotMatch(gaveta(colecoes, 'colecoes'), /hidden/);
  assert.match(gaveta(colecoes, 'janelas'), /hidden>/);
  assert.match(barra(colecoes), /class="ferramenta gaveta aberta " data-action="gaveta" data-gaveta="colecoes" aria-expanded="true"/);
  assert.match(barra(colecoes), /class="ferramenta gaveta  chama" data-action="gaveta" data-gaveta="janelas" aria-expanded="false"/);
  const janelas = hud({ gaveta: 'janelas' });
  assert.doesNotMatch(gaveta(janelas, 'janelas'), /hidden/);
  assert.match(gaveta(janelas, 'colecoes'), /hidden>/);
  // Valor estranho nas preferências: tudo fechado.
  assert.match(gaveta(hud({ gaveta: 'lixo' }), 'colecoes'), /hidden>/);
  // O botão das janelas leva a soma das pendências (3 + 2) e pisca; sem pendência não pisca nem leva número.
  assert.match(barra(fechada), /data-gaveta="janelas"[^>]*>[\s\S]*?<i class="selo-botao">5<\/i><\/button>/);
  const quieto = UI.hud(engine, ctx(engine, { minis: minis.map(mini => ({ ...mini, pending: 0 })) }));
  assert.doesNotMatch(barra(quieto), /gaveta  chama|selo-botao/);
  // Sem nenhuma janela (a casa só abre com 100 convidados e os minijogos com o porte), não tem gaveta de janelas.
  const novo = new GameEngine(data);
  const semJanelas = UI.hud(novo, ctx(novo, { minis: [] }));
  assert.doesNotMatch(semJanelas, /data-gaveta="janelas"/);
  assert.match(semJanelas, /data-gaveta="colecoes"/);
});

test('almanaque dos eventos do mundo: progresso, filtros, raridade, prêmio, dicas e o que falta para cada evento novo', () => {
  const clock = { t: 1_700_000_000_000 };
  const engine = new GameEngine(data, null, { now: () => clock.t });
  engine.state.size = engine.state.records.size = 30;
  const view = filter => UI.tela(engine, { ...ctx(engine, { tela: 'mundo', now: clock.t }), mundoFilter: filter, icon: () => '' });
  let page = view('todos');
  // O progresso no alto: vistos, completos (da meta do Céu Completo) e raros.
  assert.match(page, new RegExp(`<span>Vistos <b>0/${TOTAL}</b></span><div class="alma-barra"><i style="width:0%"></i></div>`));
  assert.match(page, /<span>Completos <b>0\/12<\/b>/);
  assert.match(page, new RegExp(`<span>Raros vistos <b>0/${RARES}</b>`));
  assert.match(page, /Com 35 convidados chega um evento novo ao céu\./, 'o próximo que se destrava (com 30 já cabem os de 30)');
  // Os filtros, com as contas.
  assert.match(page, new RegExp(`data-action="mundo-filtro" data-value="todos">Todos \\(${TOTAL}\\)<`));
  assert.match(page, /chip ativa" data-action="mundo-filtro" data-value="todos"/);
  assert.match(page, new RegExp(`data-value="faltam">Faltam \\(${TOTAL}\\)<`));
  assert.match(page, new RegExp(`data-value="raros">Raros \\(${RARES}\\)<`));
  assert.match(page, /data-value="vistos">Vistos \(0\)</);
  // Cada cartão que falta diz a raridade, se já cabe e quantos convidados faltam, e traz as dicas de onde vem.
  assert.match(page, /data-raridade="rare"><span class="selo raridade rare">Raro<\/span>/);
  assert.match(page, /data-raridade="common"><span class="selo raridade common">Comum<\/span>/);
  assert.match(page, /<small class="pronto">Já pode aparecer na sua festa!<\/small>/);
  assert.match(page, /<small class="">Faltam 5 convidados\.<\/small>/, 'eclipse e ovni: 35 - 30');
  assert.match(page, /Dica: aparece mais em Dia dos Namorados\./);
  assert.match(page, /Dica: aparece mais em São João\./);
  assert.doesNotMatch(page, /Dica: às vezes vem depois de/, 'sem ter visto quem puxa, não entrega');
  engine.state.mundo.seen.calorao = 1;
  assert.match(view('todos'), /Dica: às vezes vem depois de Calorão\./);
  // O filtro "Faltam" põe primeiro os de menos convidados; o "Raros" só os raros.
  page = view('faltam');
  assert.match(page, /chip ativa" data-action="mundo-filtro" data-value="faltam"/);
  const order = [...page.matchAll(/Aparece com (\d+) convidados ou mais\./g)].map(match => Number(match[1]));
  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'do que cabe agora para o mais difícil');
  assert.equal((page.match(/class="cartao evento-mundo/g) || []).length, TOTAL - 1, 'o calorão já passou');
  page = view('raros');
  assert.equal((page.match(/class="cartao evento-mundo/g) || []).length, RARES);
  assert.equal((page.match(/data-raridade="rare"/g) || []).length, RARES);
  // O que já passou mostra o prêmio de pegar tudo (o raro em destaque), as vezes que foi completo e a raridade.
  engine.state.mundo.seen.cometa = 2;
  engine.state.mundo.seen.estrelas = 1;
  engine.state.mundo.done.estrelas = 3;
  engine.state.size = engine.state.records.size = 60;
  page = view('vistos');
  assert.equal((page.match(/class="cartao evento-mundo/g) || []).length, 3);
  assert.match(page, /<h3>Cometa de São João<\/h3>/);
  assert.match(page, /Pegando tudo: \+10 fichas \+300 de Animação \+10 de Amor/);
  assert.match(page, /completo 3×|completo 3x/);
  assert.match(page, new RegExp(`<span>Raros vistos <b>1/${RARES}</b>`));
  assert.match(page, new RegExp(`<span>Vistos <b>3/${TOTAL}</b>`));
  // Filtro vazio e filtro desconhecido.
  engine.state.mundo.seen = {};
  assert.match(view('vistos'), /Nenhum evento neste filtro\./);
  assert.match(view('qualquer-coisa'), /chip ativa" data-action="mundo-filtro" data-value="todos"/);
});

test('modo de teste: duas abas (Geral e Eventos do mundo), a segunda com um botão por evento, o porte mínimo em cada um e o que está no ar marcado', () => {
  const engine = new GameEngine(data, null, { rng: () => 0.5 });
  const page = (extra = {}) => UI.tela(engine, { ...ctx(engine, { tela: 'teste' }), ...extra, icon: () => '' });
  // Geral (de fábrica): as abas e os atalhos de sempre, sem os botões dos eventos.
  let html = page();
  assert.match(html, /<button class="chip ativa" data-action="teste-aba" data-value="geral">Geral<\/button>/);
  assert.match(html, /<button class="chip " data-action="teste-aba" data-value="mundo">Eventos do mundo<\/button>/);
  assert.match(html, /data-op="animacao"/);
  assert.doesNotMatch(html, /data-op="evento"/);
  // Eventos do mundo: um botão para cada evento, em grupos (céu e tempo e os três temas), com o porte mínimo e o requisito no título.
  html = page({ testeTab: 'mundo' });
  assert.match(html, /<button class="chip ativa" data-action="teste-aba" data-value="mundo">Eventos do mundo<\/button>/);
  assert.doesNotMatch(html, /data-op="animacao"/);
  assert.equal((html.match(/data-op="evento" data-value="/g) || []).length, TOTAL);
  assert.match(html, /data-op="evento" data-value="eclipse" title="Pede 35 convidados ou mais\.">Eclipse <small>35<\/small><\/button>/);
  assert.match(html, /data-op="evento" data-value="ovos" title="Pede 12 convidados ou mais e um conjunto completo de dinossauros vestido\.">Choca-choca de ovos <small>12<\/small><\/button>/);
  assert.match(html, /data-op="evento-fim"/);
  for (const group of ['Céu e tempo', 'Dinossauros', 'Halloween', 'Zumbis']) assert.match(html, new RegExp(`<div class="rotulo">${group}</div>`), group);
  assert.match(html, /Nenhum evento no ar\./);
  assert.doesNotMatch(html, /class="btn claro ativa"/);
  // O que está no ar fica marcado, com o nome.
  engine.state.size = engine.state.records.size = 60;
  engine.mundo.start('lua');
  html = page({ testeTab: 'mundo' });
  assert.match(html, /<button class="btn claro ativa" data-action="debug" data-op="evento" data-value="lua"/);
  assert.equal((html.match(/class="btn claro ativa"/g) || []).length, 1);
  assert.match(html, /No ar agora: Lua cheia\./);
  // Qualquer outro valor de aba cai em Geral.
  assert.match(page({ testeTab: 'qualquer' }), /data-op="animacao"/);
  // O diário mostra o evento chamado pelo teste no idioma atual.
  engine.debug('evento', 'meteoro');
  assert.equal(UI.debugText(engine, engine.state.log.at(-1)), 'Evento do mundo: Meteoro da extinção');
});
