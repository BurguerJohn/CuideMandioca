const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../src/data.js');
const { GameEngine } = require('../src/core.js');
const I18N = require('../src/i18n.js');
const { fakeDocument } = require('./fake-dom');

require('../src/festa-sprites.js');
const bundle = globalThis.FESTA_SPRITES;

const engineAt = (level, record = level) => {
  const engine = new GameEngine(data, null, { rng: () => 0.5 });
  engine.state.size = level;
  engine.state.records.size = record;
  return engine;
};

test('a casa começa no convidado 100: um cômodo, depois a esposa, depois o filho, e de novo um cômodo', () => {
  const engine = engineAt(1);
  const at = level => engine.houseInfo(level);
  assert.equal(at(99).open, false);
  assert.deepEqual([at(100).rooms, at(100).residents], [1, 0], 'no 100 só o cômodo');
  assert.deepEqual([at(101).rooms, at(101).residents], [1, 1], 'no 101 a esposa');
  assert.deepEqual([at(102).rooms, at(102).residents], [1, 2], 'no 102 o filho');
  assert.deepEqual([at(103).rooms, at(103).residents], [2, 2], 'enchido o cômodo, o próximo convidado traz outro');
  assert.deepEqual([at(104).rooms, at(104).residents], [2, 3]);
  assert.deepEqual([at(105).rooms, at(105).residents], [2, 4]);
  assert.deepEqual([at(106).rooms, at(106).residents], [3, 4]);
  assert.deepEqual([at(200).rooms, at(200).residents], [34, 67], 'até o 200 são 34 cômodos e 67 moradores');
  // Sem repetir cômodo: o último (o 36º) chega no 205, os moradores dele no 206 e no 207, e a casa para de crescer.
  assert.deepEqual([at(205).rooms, at(205).residents], [36, 70]);
  assert.deepEqual([at(206).rooms, at(206).residents], [36, 71]);
  assert.deepEqual([at(207).rooms, at(207).residents], [36, 72], 'casa completa: 36 cômodos e 72 moradores');
  assert.equal(at(206).complete, false);
  assert.equal(at(207).complete, true);
  assert.deepEqual([at(208).rooms, at(208).residents, at(208).complete], [36, 72, true], 'depois disso não cresce mais');
  assert.deepEqual([at(5000).rooms, at(5000).residents], [36, 72]);
  assert.equal(engine.houseInfo().open, false, 'a partida nova ainda não tem casa');
});

test('os moradores: a esposa e o filho primeiro, todos com nome, atividade do cômodo e visual próprio', () => {
  const engine = engineAt(200);
  const wife = engine.houseResident(0);
  const son = engine.houseResident(1);
  assert.deepEqual([wife.name, wife.role, wife.activity, wife.room, wife.slot], ['Macaxeira', 'esposa', 'trico', 0, 0]);
  assert.deepEqual([son.name, son.role, son.activity, son.room, son.slot], ['Aipinzinho', 'filho', 'aviao', 0, 1]);
  const designs = new Set();
  for (let i = 0; i < 67; i++) {
    const who = engine.houseResident(i);
    const room = engine.houseRoom(who.room);
    assert.equal(who.room, Math.floor(i / 2));
    assert.equal(who.activity, room.acts[i % 2], `atividade do morador ${i}`);
    assert.ok(who.name && who.activityName, `nome e atividade do morador ${i}`);
    assert.equal(who.role, i === 0 ? 'esposa' : i === 1 ? 'filho' : null);
    designs.add(who.design);
  }
  assert.equal(designs.size, 67, 'cada morador até o 200 tem um visual diferente');
  const activities = new Set();
  const roomIds = new Set();
  for (let i = 0; i < 67; i++) activities.add(engine.houseResident(i).activity);
  for (let r = 0; r < 34; r++) roomIds.add(engine.houseRoom(r).id);
  assert.equal(activities.size, 67, 'cada morador até o 200 faz uma atividade diferente');
  assert.equal(roomIds.size, 34, 'cada cômodo até o 200 é de um tipo diferente');
  // A casa inteira: 36 cômodos diferentes e 72 moradores, cada um com nome, atividade e visual só dele (nada se repete).
  assert.deepEqual(['sala', 'cozinha'], [engine.houseRoom(0).id, engine.houseRoom(1).id]);
  assert.equal(data.house.rooms.length, 36);
  assert.equal(engine.houseRoom(12).id, 'oficina');
  assert.equal(engine.houseRoom(35).id, 'robos');
  const full = engineAt(207);
  const all = Array.from({ length: full.houseInfo().residents }, (_, i) => full.houseResident(i));
  assert.equal(all.length, 72);
  assert.equal(new Set(all.map(who => who.name)).size, 72, 'nomes todos diferentes');
  assert.equal(new Set(all.map(who => who.activity)).size, 72, 'atividades todas diferentes');
  assert.equal(new Set(all.map(who => who.design)).size, 72, 'visuais todos diferentes');
  assert.equal(new Set(Array.from({ length: 36 }, (_, r) => full.houseRoom(r).id)).size, 36, 'cômodos todos diferentes');
});

test('convidados novos trazem o cômodo e os moradores em eventos; níveis que já existiram não repetem', () => {
  const engine = engineAt(98);
  engine.state.cheer = 1e12;
  const grow = () => engine.addFame(engine.fameNeed() - engine.state.fame);
  const houseEvents = () => engine.drainEvents().filter(event => event.type.startsWith('house'));
  grow(); // 99
  assert.deepEqual(houseEvents(), []);
  grow(); // 100
  assert.deepEqual(houseEvents().map(e => [e.type, e.room, e.first]), [['house-room', 0, true]]);
  grow(); // 101
  assert.deepEqual(houseEvents().map(e => [e.type, e.index, e.room]), [['house-resident', 0, 0]]);
  grow(); // 102
  assert.deepEqual(houseEvents().map(e => [e.type, e.index]), [['house-resident', 1]]);
  grow(); // 103
  assert.deepEqual(houseEvents().map(e => [e.type, e.room, e.first]), [['house-room', 1, false]]);
  const log = engine.state.log.filter(entry => entry.type.startsWith('casa'));
  assert.deepEqual(log.map(entry => entry.type), ['casa-comodo', 'casa-morador', 'casa-morador', 'casa-comodo']);
  // Vários de uma vez (tempo fora): um evento por convidado novo.
  engine.state.cheer = 1e15;
  engine.addFame(1e15);
  assert.ok(engine.drainEvents().filter(event => event.type.startsWith('house')).length > 3);
  // A casa segue o recorde: depois de um ano novo (a festa recomeça no quintal) ela continua lá.
  const big = engineAt(130);
  big.state.size = 100;
  assert.equal(big.canNewYear(), true);
  const records = big.state.records.size;
  assert.equal(big.newYear(), true);
  assert.ok(big.state.size < 10 && big.state.records.size === records, 'recorde guardado');
  assert.equal(big.houseInfo().open, true, 'a casa não some no ano novo');
  // Quem já passou por esses convidados (recorde maior) não ganha os eventos de novo.
  const again = engineAt(60, 130);
  again.state.cheer = 1e12;
  again.addFame(again.fameNeed() - again.state.fame);
  assert.deepEqual(again.drainEvents().filter(event => event.type.startsWith('house')), []);
});

test('a arte bate com os dados: cômodos, atividades, moradores e efeitos', () => {
  const casa = bundle.casa;
  assert.deepEqual(casa.salas.ids, data.house.rooms.map(room => room.id), 'mesmos tipos de cômodo, na mesma ordem');
  assert.deepEqual(casa.salas.atividades, data.house.rooms.map(room => room.acts), 'mesmas atividades por cômodo');
  assert.equal(casa.salas.folhas.reduce((total, folha) => total + folha.frames, 0), data.house.rooms.length * 2, 'duas animações por cômodo');
  assert.ok(casa.telhado.frames >= 2, 'cores de telhado');
  assert.ok(casa.salas.folhas.length * casa.salas.porFolha >= data.house.rooms.length, 'folhas de cômodos para todos os tipos');
  for (const folha of casa.salas.folhas) assert.match(bundle.images[folha.image], /^data:image\/png;base64,/);
  assert.equal(casa.moradores.desenhos, data.house.designs);
  // O visual de cada morador foi desenhado fazendo a atividade do cômodo dele, em todas as voltas do ciclo.
  assert.equal(data.house.designs, data.house.rooms.length * 2, 'um desenho para cada morador da casa completa');
  const engine = engineAt(207);
  for (let i = 0; i < engine.houseInfo().residents; i++) {
    const who = engine.houseResident(i);
    assert.equal(casa.moradores.atividades[who.design], who.activity, `o desenho ${who.design} faz ${who.activity} (morador ${i})`);
  }
  assert.equal(casa.moradores.folhas.length * casa.moradores.porFolha, casa.moradores.desenhos);
  for (const folha of casa.moradores.folhas) {
    assert.equal(folha.frames, casa.moradores.porFolha * (casa.moradores.quadros + 1), 'loop mais o quadro de reação');
    assert.match(bundle.images[folha.image], /^data:image\/png;base64,/);
  }
  for (const item of [casa.telhado, casa.jardim, casa.chamine, casa.fx]) assert.match(bundle.images[item.image], /^data:image\/png;base64,/);
  assert.match(bundle.icons['ui:casa'].src, /^data:image\/png;base64,/, 'ícone do botão da placa');
  const ids = new Set(data.house.activities.map(activity => activity.id));
  assert.equal(ids.size, 72);
  for (const room of data.house.rooms) for (const act of room.acts) assert.ok(ids.has(act), `atividade ${act} sem nome`);
  for (const id of ids) {
    const act = casa.atividades[id];
    assert.ok(act && act.fps > 0, `animação da atividade ${id}`);
    if (act.fx) assert.ok(casa.fx.ids.includes(act.fx.tipo), `efeito ${act.fx.tipo} de ${id}`);
  }
  for (const kind of ['coracao', 'estrela', 'brilho', 'poeira', 'vapor']) assert.ok(casa.fx.ids.includes(kind), `efeito ${kind}`);
  assert.deepEqual(casa.moradores.papeis, { 0: 'esposa', 1: 'filho' });
  assert.equal(casa.salas.slots.length, 2);
  assert.ok(data.house.names.length >= data.house.rooms.length * 2, 'um nome para cada morador');
  assert.equal(new Set(data.house.names).size, data.house.names.length, 'nomes sem repetição');
});

test('as falas dos moradores e os nomes dos cômodos e atividades existem nos três idiomas', () => {
  for (const id of ['pt-BR', 'en', 'es']) {
    I18N.setLanguage(id);
    const localized = I18N.localizeData(JSON.parse(JSON.stringify(data)), id);
    for (const key of [...data.house.activities.map(entry => entry.id), 'esposa', 'filho']) {
      for (const line of [0, 1]) assert.ok(I18N.has(`fx.casa.${key}.${line}`, id), `${id}: fala ${key}.${line}`);
    }
    for (const key of ['casa.title', 'casa.count', 'casa.hide', 'hud.casa', 'casa.tip', 'app.casaFirst', 'app.casaRoom', 'app.casaEsposa',
      'app.casaFilho', 'app.casaResident', 'app.casaGrew', 'log.casaRoom', 'log.casaMoved']) assert.ok(I18N.has(key, id), `${id}: ${key}`);
    if (id !== 'pt-BR') {
      assert.notEqual(localized.house.rooms[1].name, data.house.rooms[1].name, `${id}: cômodo traduzido`);
      assert.notEqual(localized.house.activities[0].name, data.house.activities[0].name, `${id}: atividade traduzida`);
    }
  }
  I18N.setLanguage('pt-BR');
});

function newRenderer() {
  globalThis.document = fakeDocument([], { drawImage: 0 });
  globalThis.Image = class { set src(value) { this.value = value; this.complete = true; this.width = 12; this.onload?.(); } };
  require('../src/festa.js');
  require('../src/casa.js');
  const canvas = globalThis.document.createElement('canvas');
  const sounds = [];
  const casa = globalThis.ArraiaCasa.create(canvas, bundle, { sound: name => sounds.push(name) });
  return { casa, canvas, sounds };
}

test('a planta da casa: os andares sobem, o primeiro enche da esquerda para a direita e nada se sobrepõe', () => {
  newRenderer();
  const { plan, WALL } = globalThis.ArraiaCasa;
  const rw = bundle.casa.salas.rw;
  const rh = bundle.casa.salas.rh;
  let before = 0;
  for (const rooms of [1, 2, 4, 5, 6, 10, 34, 101]) {
    const layout = plan(rooms, data.house.columns, rw, rh);
    assert.equal(layout.spots.length, rooms);
    assert.equal(layout.floors, Math.ceil(rooms / data.house.columns));
    assert.ok(layout.width >= before, 'a casa só alarga (nunca encolhe)');
    before = layout.width;
    for (const [i, spot] of layout.spots.entries()) {
      assert.ok(spot.x >= 0 && spot.x + rw <= layout.width && spot.y >= 0 && spot.y + rh <= layout.groundY, `cômodo ${i} dentro da casa`);
      for (const other of layout.spots.slice(0, i)) {
        assert.ok(spot.x + rw + WALL <= other.x || other.x + rw + WALL <= spot.x || spot.y + rh + WALL <= other.y || other.y + rh + WALL <= spot.y,
          `cômodos ${i} e ${layout.spots.indexOf(other)} não se sobrepõem`);
      }
    }
  }
  // Os cômodos novos entram em cima: o andar seguinte fica acima do anterior e os de baixo não se mexem.
  const a = plan(5, 5, rw, rh).spots;
  const b = plan(6, 5, rw, rh).spots;
  assert.ok(b[5].y < b[0].y, 'o 6º cômodo está no andar de cima');
  assert.ok(b[0].y > 0 && a[0].x === b[0].x);
});

test('o renderizador da casa desenha os moradores, reage ao clique e dá festa na chegada', () => {
  const { casa, canvas, sounds } = newRenderer();
  const below = engineAt(99);
  assert.equal(casa.draw(below, 1000), false, 'sem casa antes do convidado 100');
  const engine = engineAt(102);
  assert.equal(casa.draw(engine, 1000), true);
  assert.equal(casa.probe().rooms, 1);
  assert.equal(casa.probe().residents, 2);
  assert.ok(canvas.width > 0 && canvas.height > 0, 'o canvas ganhou o tamanho da casa');
  for (let t = 1000; t < 4000; t += 33) casa.draw(engine, t);
  assert.ok(casa.probe().particles >= 1, 'efeitos saem dos moradores');
  // Clique: o morador reage com uma fala e coração.
  const who = casa.poke(1, 4000);
  assert.equal(who.name, 'Aipinzinho');
  assert.equal(casa.probe().says, 1);
  assert.equal(casa.probe().reacts, 1);
  assert.deepEqual(sounds, ['carinho']);
  assert.equal(casa.poke(9, 4000), null, 'morador que não existe');
  // Chegada: cômodo e morador novos.
  const grown = engineAt(103);
  casa.onEvents(grown, [{ type: 'house-room', room: 1, size: 103, first: false }], 5000);
  casa.draw(grown, 5033);
  assert.equal(casa.probe().rooms, 2);
  assert.ok(casa.probe().pops >= 1);
  casa.onEvents(engineAt(104), [{ type: 'house-resident', index: 2, room: 1, size: 104 }], 6000);
  assert.ok(casa.probe().pops >= 2);
  // A casa cheia de moradores desenha sem erro e sem acumular efeitos sem fim.
  const big = engineAt(200);
  for (let t = 10000; t < 40000; t += 33) casa.draw(big, t);
  assert.equal(casa.probe().rooms, 34);
  assert.equal(casa.probe().residents, 67);
  assert.ok(casa.probe().particles <= 160, 'no máximo 160 efeitos ao mesmo tempo');
  assert.ok(casa.probe().size.width >= 300 && casa.probe().size.height >= 300);
});

test('a escala da casa é inteira e cabe na tela', () => {
  const { casa, canvas } = newRenderer();
  const engine = engineAt(200);
  casa.draw(engine, 1000);
  casa.setScale(3, { width: 1056, height: 915 });
  const { width, height, art, physical } = casa.size();
  assert.ok(Number.isInteger(physical) && physical >= 1);
  assert.ok(width <= 1056 + 1 && height <= 915 + 1, `cabe: ${width}x${height}`);
  assert.equal(Math.round(art.width * physical / (globalThis.devicePixelRatio || 1)), Math.round(width));
  casa.setScale(3, { width: 10, height: 10 });
  assert.equal(casa.size().physical, 1, 'num espaço minúsculo, a escala mínima');
  assert.ok(canvas.style.width);
});

test('o primeiro cômodo e o primeiro morador já chegam com festa, mesmo antes de a janela da casa ter sido desenhada', () => {
  const { casa } = newRenderer();
  const engine = engineAt(100);
  casa.onEvents(engine, [{ type: 'house-room', room: 0, size: 100, first: true }], 1000);
  assert.equal(casa.probe().pops, 1);
  assert.ok(casa.probe().particles >= 1, 'a poeira sobe junto');
  casa.draw(engine, 1033);
  assert.equal(casa.probe().rooms, 1);
  const wife = engineAt(101);
  casa.onEvents(wife, [{ type: 'house-resident', index: 0, room: 0, size: 101 }], 2000);
  assert.equal(casa.probe().pops, 2);
});

test('a placa (com o botão que mostra e esconde a casa) fica por cima da janela da casa', () => {
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  const placa = html.indexOf('id="placa"');
  const casaIndex = html.indexOf('id="casa"');
  assert.ok(placa > 0 && casaIndex > 0 && placa > casaIndex, 'a placa vem depois da casa no HTML, então desenha por cima dela');
  assert.match(require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'src', 'ui.js'), 'utf8'), /data-action="casa"/);
});

test('quando o último cômodo enche a casa para: sem evento, sem cômodo repetido e sem morador novo', () => {
  const engine = engineAt(204);
  engine.state.cheer = 1e15;
  const grow = () => engine.addFame(engine.fameNeed() - engine.state.fame);
  const houseEvents = () => engine.drainEvents().filter(event => event.type.startsWith('house'));
  grow(); // 205: o 36º cômodo, a fábrica de robôs
  assert.deepEqual(houseEvents().map(e => [e.type, e.room]), [['house-room', 35]]);
  grow(); // 206
  assert.deepEqual(houseEvents().map(e => [e.type, e.index]), [['house-resident', 70]]);
  grow(); // 207: o último morador
  assert.deepEqual(houseEvents().map(e => [e.type, e.index]), [['house-resident', 71]]);
  assert.equal(engine.houseInfo().complete, true);
  for (let i = 0; i < 6; i++) grow(); // 208 a 213: nada de novo
  assert.deepEqual(houseEvents(), []);
  assert.deepEqual([engine.houseInfo().rooms, engine.houseInfo().residents], [36, 72]);
  // Desenha completa, sem erro, e a janela tem o tamanho dos 36 cômodos (8 andares).
  const { casa } = newRenderer();
  for (let t = 1000; t < 4000; t += 33) casa.draw(engine, t);
  assert.deepEqual([casa.probe().rooms, casa.probe().residents], [36, 72]);
});
