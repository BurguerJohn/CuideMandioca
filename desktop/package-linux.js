'use strict';

// Empacota o jogo para Linux (x64): dist/CuideBemDaSuaMandioca-linux-x64/ e o .tar.gz dessa pasta. Dentro vão o inicializador
// (iniciar-linux.sh), o instalador do atalho (instalar-linux.sh), o ícone e as instruções; os arquivos nativos da Steam
// (steamworks.js para Linux) ficam fora do app.asar, ao lado do executável. Pode ser rodado no Windows: o .tar.gz guarda as permissões certas.
// Uso: npm run build:linux
const fs = require('node:fs');
const path = require('node:path');
const { packager } = require('@electron/packager');
const { empacotar } = require('./tar');

const NOME = 'CuideBemDaSuaMandioca';
// O que o inicializador e o instalador esperam encontrar na pasta do jogo (origem na pasta do projeto → nome no pacote).
const EXTRAS = [['iniciar-linux.sh', 'iniciar-linux.sh'], ['instalar-linux.sh', 'instalar-linux.sh'], ['LEIA-ME-LINUX.txt', 'LEIA-ME-LINUX.txt'],
  [path.join('desktop', 'icon.png'), 'icone.png']];

// Os scripts de shell precisam de fim de linha do Linux (um \r no fim da primeira linha quebra o #!).
const comoLinux = texto => texto.replace(/\r\n/g, '\n');

async function main() {
  const root = path.resolve(__dirname, '..');
  const out = path.resolve(root, 'dist');
  if (path.relative(root, out) !== 'dist') throw new Error('Destino de build fora do projeto.');
  const result = await packager({
    dir: root,
    name: NOME,
    appCopyright: 'Cuide bem da sua mandioca',
    platform: 'linux',
    arch: 'x64',
    out,
    overwrite: true,
    // A Steam (steamworks.js) é nativa: o .node e a libsteam_api.so precisam ficar juntos fora do app.asar.
    asar: { unpack: '**/{.**,**}/**/*.{node,so}' },
    prune: true,
    download: { cacheRoot: path.join(root, '.electron-cache') },
    ignore: [
      /^[\\/](?:dist|tests|art|assets|tools|steam|trailer|steam-build-output|\.npm-cache|\.electron-cache)(?:[\\/]|$)/,
      /(^|[\\/])(?:README\.md|COMANDO-STEAM\.txt|LEIA-ME-LINUX\.txt|iniciar-linux\.sh|instalar-linux\.sh|package-lock\.json|\.gitattributes|_backup[^\\/]*\.zip)$/,
      /(^|[\\/])desktop[\\/](?:package-win\.js|package-linux\.js|tar\.js|prepare-steam\.js|upload-steam\.js)$/,
      // Só o Linux é empacotado aqui: os binários da Steam para Windows e macOS ficam de fora.
      /(^|[\\/])node_modules[\\/]steamworks\.js[\\/]dist[\\/](?:win64|osx)(?:[\\/]|$)/
    ]
  });
  for (const pasta of result) {
    for (const [origem, destino] of EXTRAS) {
      const fonte = path.join(root, origem);
      if (!fs.existsSync(fonte)) throw new Error(`Falta ${origem}.`);
      const alvo = path.join(pasta, destino);
      if (/\.(sh|txt)$/.test(origem)) fs.writeFileSync(alvo, comoLinux(fs.readFileSync(fonte, 'utf8')), 'utf8');
      else fs.copyFileSync(fonte, alvo);
      // Num Linux ou macOS (e na pasta que a Steam envia) o inicializador e o executável precisam do bit de executável; no Windows isso não existe.
      if (/\.sh$/.test(origem)) fs.chmodSync(alvo, 0o755);
    }
    const pacote = `${pasta}.tar.gz`;
    const arquivos = await empacotar({ pasta, saida: pacote, raiz: path.basename(pasta),
      modos: { 'iniciar-linux.sh': 0o755, 'instalar-linux.sh': 0o755, [NOME]: 0o755 } });
    process.stdout.write(`Build Linux: ${pasta}\n${pacote} (${arquivos} arquivos, ${(fs.statSync(pacote).size / 1048576).toFixed(1)} MB)\n`);
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
