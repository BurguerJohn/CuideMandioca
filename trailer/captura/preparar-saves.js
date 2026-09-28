// Gera os saves das cenas a partir do simulador do jogo (tools/simulate.js), em vários momentos da partida,
// e ajusta o visual de cada um (roupa, chapéu, barracas). Os relógios do save são trazidos para a data da cena.
// Uso: node trailer/captura/preparar-saves.js
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const JOGO = path.resolve(__dirname, '..', '..');
const SAVES = path.join(__dirname, 'saves');
const DATA_CENA = Date.parse('2026-06-24T21:00:00-03:00');
const data = require(path.join(JOGO, 'src', 'data.js'));
const { GameEngine } = require(path.join(JOGO, 'src', 'core.js'));

fs.mkdirSync(SAVES, { recursive: true });

// Traz todos os horários absolutos do save para perto da data da cena e tira pedidos/penetras aleatórios:
// nas cenas, eles só aparecem quando o roteiro chama.
function acertarRelogio(save) {
  const delta = DATA_CENA - save.lastSeen;
  const mover = value => (value ? value + delta : value);
  save.fishing.nextAt = mover(save.fishing.nextAt);
  save.mail.nextAt = mover(save.mail.nextAt);
  save.rings = { cost: 1, nextAt: 0 };
  save.outings.forEach(entry => { entry.endsAt = mover(entry.endsAt); });
  save.request = { active: null, nextAt: DATA_CENA + 1e9 };
  save.crasher = { active: null, nextAt: DATA_CENA + 1e9 };
  save.lastSeen = DATA_CENA;
  return save;
}

function vestir(save, equipped) {
  for (const id of Object.values(equipped)) {
    const item = data.items.find(entry => entry.id === id);
    if (item && item.source !== 'inicial' && !save.inventory.includes(id)) save.inventory.push(id);
  }
  Object.assign(save.equipped, equipped);
  return save;
}

function simular(horas) {
  const arquivo = path.join(SAVES, `sim-${horas}h.json`);
  execFileSync(process.execPath, [path.join(JOGO, 'tools', 'simulate.js'), String(horas), '{}', arquivo], { stdio: 'ignore' });
  return JSON.parse(fs.readFileSync(arquivo, 'utf8'));
}

function salvar(nome, save) {
  fs.writeFileSync(path.join(SAVES, `${nome}.json`), JSON.stringify(save));
  console.log(`${nome}: ${save.size} convidados, turma ${Object.keys(save.crew).length}, itens ${save.inventory.length}`);
}

// Estágio 1: festa nova, só a Mandioca no quintal.
const novo = new GameEngine(data, null, { now: () => DATA_CENA, rng: () => 0.42 });
novo.state.cheer = 3;
salvar('estagio-1', acertarRelogio(novo.exportState()));

const estagios = [
  ['estagio-2', 0.25, { chapeu: 'vaqueiro', mao: 'espiga', tecido: 'xadrez-azul', esquerda: 'barraca-pescaria', direita: 'mastro' }],
  ['estagio-3', 0.8, { chapeu: 'coroa-flores', mao: 'leque', tecido: 'chita', terreiro: 'gramado',
    esquerda: 'barraca-beijo', direita: 'barraca-comidas' }],
  ['estagio-4', 4.3, { chapeu: 'cangaceiro', mao: 'lampiao', tecido: 'remendado', terreiro: 'tablado',
    esquerda: 'barraca-pescaria', direita: 'barraca-argolas' }],
  ['estagio-5', 40, { chapeu: 'coroa-milho', mao: 'lampiao', tecido: 'xadrez-ouro', terreiro: 'pista-forro',
    esquerda: 'barraca-beijo', direita: 'barraca-argolas' }]
];
for (const [nome, horas, roupa] of estagios) salvar(nome, acertarRelogio(vestir(simular(horas), roupa)));

// Cena dos presentes: começa com 20 convidados, logo antes do coqueiro e da Festa da Cidade.
const presentes = acertarRelogio(vestir(simular(0.45), { chapeu: 'lenco-chita', mao: 'maca-amor', tecido: 'chita-rosa',
  esquerda: 'fardo', direita: 'espantalho' }));
presentes.size = 20;
presentes.fame = 0;
salvar('presentes', presentes);

// Cena da área de trabalho e das Argolas: meio de jogo, com fichas para jogar.
const meio = acertarRelogio(vestir(simular(1.2), { chapeu: 'vaqueiro', mao: 'bandeirinha', tecido: 'xadrez-vermelho',
  esquerda: 'barraca-pescaria', direita: 'barraca-argolas' }));
meio.tickets = 40;
meio.inventory = meio.inventory.filter(id => !['oculos-coracao', 'chapeu-palhaco', 'ursinho', 'peixinho'].includes(id));
salvar('meio', meio);
for (const horas of [0.25, 0.8, 4.3, 40, 0.45, 1.2]) fs.rmSync(path.join(SAVES, `sim-${horas}h.json`), { force: true });
