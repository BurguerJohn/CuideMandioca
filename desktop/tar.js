'use strict';

// Um empacotador .tar.gz mínimo (formato ustar, com nome longo no estilo GNU) para o jogo de Linux. Existe porque o jogo é empacotado no Windows
// e um zip ou uma pasta copiada de lá perde a permissão de executar: aqui cada arquivo entra com o modo certo (executável ou não).
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const BLOCO = 512;

// Escreve um número em octal com zeros à esquerda, no campo de `tamanho` bytes (o último é o terminador).
function octal(valor, tamanho) {
  return Buffer.from(`${Math.max(0, Math.floor(valor)).toString(8).padStart(tamanho - 1, '0')}\0`, 'latin1');
}

function cabecalho({ nome, modo, tamanho, tipo, destino = '', tempo }) {
  const bloco = Buffer.alloc(BLOCO);
  const campo = (texto, inicio, comprimento) => Buffer.from(texto, 'utf8').copy(bloco, inicio, 0, comprimento);
  campo(nome, 0, 100);
  octal(modo, 8).copy(bloco, 100);
  octal(0, 8).copy(bloco, 108);              // uid
  octal(0, 8).copy(bloco, 116);              // gid
  octal(tamanho, 12).copy(bloco, 124);
  octal(tempo, 12).copy(bloco, 136);
  bloco.fill(0x20, 148, 156);                // a soma de conferência conta este campo como espaços
  bloco[156] = tipo.charCodeAt(0);
  campo(destino, 157, 100);
  campo('ustar\0', 257, 6);
  campo('00', 263, 2);
  campo('root', 265, 32);
  campo('root', 297, 32);
  let soma = 0;
  for (const byte of bloco) soma += byte;
  Buffer.from(`${soma.toString(8).padStart(6, '0')}\0 `, 'latin1').copy(bloco, 148);
  return bloco;
}

const preencher = tamanho => (tamanho % BLOCO ? Buffer.alloc(BLOCO - (tamanho % BLOCO)) : Buffer.alloc(0));

// Cada entrada do arquivo: o cabeçalho (com uma entrada 'L' antes se o caminho passa de 100 bytes) e o conteúdo em blocos de 512.
function entrada({ nome, modo, tipo = '0', conteudo = Buffer.alloc(0), destino = '', tempo = 0 }) {
  const partes = [];
  const bytes = Buffer.byteLength(nome, 'utf8');
  if (bytes > 99) {
    const longo = Buffer.from(`${nome}\0`, 'utf8');
    partes.push(cabecalho({ nome: '././@LongLink', modo: 0o644, tamanho: longo.length, tipo: 'L', tempo }), longo, preencher(longo.length));
  }
  partes.push(cabecalho({ nome, modo, tamanho: tipo === '0' ? conteudo.length : 0, tipo, destino, tempo }));
  if (tipo === '0') partes.push(conteudo, preencher(conteudo.length));
  return Buffer.concat(partes);
}

// Quem precisa de permissão de executar: o que não tem extensão (o executável, chrome-sandbox...), os .sh, .so e .node.
function modoDoArquivo(nome) {
  const base = path.posix.basename(nome);
  const semExtensao = !base.includes('.');
  return semExtensao || /\.(sh|so|node)(\.\d+)*$/.test(base) ? 0o755 : 0o644;
}

// Lista tudo dentro da pasta (pastas, arquivos e links), em ordem estável.
function listar(pasta, relativo = '') {
  const itens = [];
  for (const nome of fs.readdirSync(path.join(pasta, relativo)).sort()) {
    const caminho = relativo ? `${relativo}/${nome}` : nome;
    const info = fs.lstatSync(path.join(pasta, caminho));
    if (info.isDirectory()) { itens.push({ caminho, tipo: '5' }); itens.push(...listar(pasta, caminho)); }
    else if (info.isSymbolicLink()) itens.push({ caminho, tipo: '2', destino: fs.readlinkSync(path.join(pasta, caminho)) });
    else if (info.isFile()) itens.push({ caminho, tipo: '0' });
  }
  return itens;
}

// Empacota `pasta` em `saida` (.tar.gz); tudo vai dentro de `raiz/` (a pasta que aparece ao extrair). `modos` troca o modo de um arquivo
// pelo caminho relativo (por exemplo { 'iniciar-linux.sh': 0o755 }). Escreve aos poucos (o jogo passa de 200 MB) e devolve a quantidade
// de arquivos.
async function empacotar({ pasta, saida, raiz, modos = {}, tempo = Math.floor(Date.now() / 1000) }) {
  const gzip = zlib.createGzip({ level: 9 });
  const terminou = new Promise((resolve, reject) => {
    const arquivo = fs.createWriteStream(saida);
    arquivo.on('finish', resolve);
    arquivo.on('error', reject);
    gzip.on('error', reject);
    gzip.pipe(arquivo);
  });
  const escrever = buffer => new Promise(resolve => { if (gzip.write(buffer)) resolve(); else gzip.once('drain', resolve); });
  await escrever(entrada({ nome: `${raiz}/`, modo: 0o755, tipo: '5', tempo }));
  let arquivos = 0;
  for (const item of listar(pasta)) {
    const nome = `${raiz}/${item.caminho}`;
    if (item.tipo === '5') await escrever(entrada({ nome: `${nome}/`, modo: 0o755, tipo: '5', tempo }));
    else if (item.tipo === '2') await escrever(entrada({ nome, modo: 0o777, tipo: '2', destino: item.destino, tempo }));
    else {
      arquivos++;
      await escrever(entrada({ nome, modo: modos[item.caminho] ?? modoDoArquivo(item.caminho), conteudo: fs.readFileSync(path.join(pasta, item.caminho)), tempo }));
    }
  }
  await escrever(Buffer.alloc(BLOCO * 2));   // o fim do arquivo: dois blocos vazios
  gzip.end();
  await terminou;
  return arquivos;
}

module.exports = { empacotar, modoDoArquivo, entrada, cabecalho };
