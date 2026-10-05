'use strict';

const path = require('node:path');
const { packager } = require('@electron/packager');

async function main() {
  const root = path.resolve(__dirname, '..');
  const out = path.resolve(root, 'dist');
  if (path.relative(root, out) !== 'dist') throw new Error('Destino de build fora do projeto.');
  const result = await packager({
    dir: root,
    name: 'CuideBemDaSuaMandioca',
    appCopyright: 'Cuide bem da sua mandioca',
    win32metadata: { ProductName: 'Cuide bem da sua mandioca', FileDescription: 'Cuide bem da sua mandioca' },
    platform: 'win32',
    arch: 'x64',
    out,
    overwrite: true,
    // A Steam (steamworks.js) é nativa: o .node e a steam_api64.dll precisam ficar juntos fora do app.asar.
    asar: { unpack: '**/{.**,**}/**/*.{node,dll}' },
    prune: true,
    icon: path.join(root, 'desktop', 'icon.ico'),
    download: { cacheRoot: path.join(root, '.electron-cache') },
    ignore: [
      // Pastas do projeto, só na raiz (node_modules/steamworks.js/dist é a Steam e precisa ir junto).
      /^[\\/](?:dist|tests|art|assets|tools|steam|trailer|steam-build-output|\.npm-cache|\.electron-cache)(?:[\\/]|$)/,
      /(^|[\\/])(?:README\.md|COMANDO-STEAM\.txt|LEIA-ME-LINUX\.txt|iniciar-linux\.sh|instalar-linux\.sh|package-lock\.json|\.gitattributes|_backup[^\\/]*\.zip)$/,
      /(^|[\\/])desktop[\\/](?:package-win\.js|package-linux\.js|tar\.js|prepare-steam\.js|upload-steam\.js)$/,
      // Só o Windows é empacotado: os binários da Steam para Linux e macOS ficam de fora.
      /(^|[\\/])node_modules[\\/]steamworks\.js[\\/]dist[\\/](?:linux64|osx)(?:[\\/]|$)/
    ]
  });
  for (const folder of result) process.stdout.write(`Build Windows: ${folder}\n`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
