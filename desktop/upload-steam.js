'use strict';

// Envia o jogo para a Steam pelo SteamPipe, com o steamcmd do SDK do Steamworks:
//  1. refaz o build do Windows (o mesmo de npm run build:win), a não ser que receba --sem-build;
//  2. confere se o build tem o executável e a biblioteca da Steam, e se o App ID é o de verdade;
//  3. roda o steamcmd com steam/app_build_<APP_ID>.vdf. A senha e o código do Steam Guard são digitados no próprio
//     steamcmd (nada fica salvo aqui); depois do primeiro login, o steamcmd lembra a sessão neste PC.
// O SDK é a pasta steamworks_sdk_<versão> ao lado do projeto (a mais nova, se houver mais de uma) ou STEAMWORKS_SDK.
// O build chega ao Steamworks sem ir ao ar: ative em SteamPipe > Builds (a Steam não deixa ativar o ramo padrão por
// script).
// Uso: npm run steam:upload -- <login da Steam> [--sem-build]
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { spawnSync } = require('node:child_process');
const { readConfig, DEFAULTS } = require('./steam');

const ROOT = path.resolve(__dirname, '..');
const BUILD = path.join(ROOT, 'dist', 'CuideBemDaSuaMandioca-win32-x64');
// O que não pode faltar no build: sem a biblioteca da Steam, o jogo abre sem conquistas nem presença.
const REQUIRED = [
  'CuideBemDaSuaMandioca.exe',
  'resources/app.asar',
  'resources/app.asar.unpacked/node_modules/steamworks.js/dist/win64/steam_api64.dll',
  'resources/app.asar.unpacked/node_modules/steamworks.js/dist/win64/steamworksjs.win32-x64-msvc.node'
];

// "steamworks_sdk_165" → 165, para escolher o SDK mais novo.
const sdkVersion = name => Number((name.match(/^steamworks_sdk_(\d+)$/) || [])[1] || 0);

function findSdk({ env = process.env, parent = path.dirname(ROOT) } = {}) {
  if (env.STEAMWORKS_SDK) return path.resolve(env.STEAMWORKS_SDK);
  let names = [];
  try { names = fs.readdirSync(parent).filter(name => sdkVersion(name) > 0); } catch (_) { names = []; }
  names.sort((a, b) => sdkVersion(b) - sdkVersion(a));
  return names.length ? path.join(parent, names[0]) : null;
}

// O zip da Valve às vezes vem com uma pasta sdk/ por fora; aceita os dois jeitos.
function findSteamcmd(sdk) {
  if (!sdk) return null;
  const candidates = [path.join(sdk, 'tools', 'ContentBuilder', 'builder', 'steamcmd.exe'),
    path.join(sdk, 'sdk', 'tools', 'ContentBuilder', 'builder', 'steamcmd.exe')];
  return candidates.find(file => fs.existsSync(file)) || null;
}

const steamcmdArgs = (login, script) => ['+login', login, '+run_app_build', script, '+quit'];

function problems({ config = readConfig(), build = BUILD, script } = {}) {
  const found = [];
  if (config.appId === DEFAULTS.appId) found.push(`desktop/steam.json ainda usa o App ID de testes (${DEFAULTS.appId}): rode npm run steam:config -- APP_ID DEPOT_ID`);
  if (!fs.existsSync(script)) found.push(`falta ${path.relative(ROOT, script)}: rode npm run steam:config -- APP_ID DEPOT_ID`);
  for (const file of REQUIRED) {
    if (!fs.existsSync(path.join(build, file))) found.push(`o build não tem ${file}`);
  }
  return found;
}

async function askLogin() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try { return (await rl.question('Login da Steam (o nome da conta, não o e-mail): ')).trim(); } finally { rl.close(); }
}

async function main() {
  const args = process.argv.slice(2);
  const config = readConfig();
  const script = path.join(ROOT, 'steam', `app_build_${config.appId}.vdf`);
  const steamcmd = findSteamcmd(findSdk());
  if (!steamcmd) {
    throw new Error('Não achei o steamcmd do SDK. Deixe a pasta steamworks_sdk_<versão> ao lado do projeto ' +
      '(ou defina STEAMWORKS_SDK) com tools/ContentBuilder/builder/steamcmd.exe dentro.');
  }

  if (!args.includes('--sem-build')) {
    const build = spawnSync(process.execPath, [path.join(__dirname, 'package-win.js')], { cwd: ROOT, stdio: 'inherit' });
    if (build.status !== 0) throw new Error('O build falhou; nada foi enviado.');
  }
  const found = problems({ config, script });
  if (found.length) throw new Error(`Não dá para enviar:\n - ${found.join('\n - ')}`);
  if (require('../src/data.js').config.debugMenu) {
    console.warn('\nAtenção: o botão de teste (debugMenu em src/data.js) está ligado neste build.\n');
  }

  const login = args.find(arg => !arg.startsWith('--')) || process.env.STEAM_LOGIN || await askLogin();
  if (!login) throw new Error('Sem login da Steam, nada foi enviado.');
  console.log(`Enviando ${path.relative(ROOT, BUILD)} (App ${config.appId}) com ${steamcmd}`);
  const upload = spawnSync(steamcmd, steamcmdArgs(login, script), { cwd: path.dirname(steamcmd), stdio: 'inherit' });
  if (upload.status !== 0) throw new Error(`O steamcmd terminou com erro (código ${upload.status}).`);
  console.log(`\nPronto. Para testar pela Steam, ative o build no ramo "default" em:\n` +
    `https://partner.steamgames.com/apps/builds/${config.appId}`);
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });

module.exports = { findSdk, findSteamcmd, steamcmdArgs, problems, sdkVersion };
