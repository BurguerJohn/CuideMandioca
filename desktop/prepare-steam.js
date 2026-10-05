'use strict';

// Prepara a publicação na Steam, a partir do App ID e do Depot ID que o Steamworks deu:
//  - desktop/steam.json: o App ID de verdade. O executável passa a abrir só pela Steam (em desenvolvimento, nunca trava).
//  - steam/app_build_<APP_ID>.vdf: script do SteamPipe que envia dist/CuideBemDaSuaMandioca-win32-x64 (e, com o terceiro número, o depot de
//    Linux: dist/CuideBemDaSuaMandioca-linux-x64, do npm run build:linux).
//  - steam/rich_presence.vdf: o que os amigos veem na lista da Steam, em todos os idiomas do jogo.
//  - steam/conquistas.md: as conquistas para cadastrar no Steamworks (nome da API, nomes e descrições por idioma).
// Uso: npm run steam:config -- APP_ID DEPOT_ID [DEPOT_LINUX_ID]   (depois: npm run steam:icons, npm run build:win e, com Linux, npm run build:linux)
const fs = require('node:fs');
const path = require('node:path');
const I18N = require('../src/i18n.js');
const data = require('../src/data.js');
const { achievementName } = require('./steam');

// Nomes de idioma da Steam para cada idioma do jogo (os dois primeiros são os da API; o resto, variantes que caem nele).
const STEAM_LANGUAGES = { 'pt-BR': ['brazilian', 'portuguese'], en: ['english'], es: ['spanish', 'latam'] };

const quote = value => `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const copyOf = value => JSON.parse(JSON.stringify(value));

// Sem o depot de Linux: só o Windows (a pasta do build é a própria raiz). Com ele: a raiz é dist/ e cada depot leva a pasta do seu sistema
// (barras normais, que o steamcmd aceita no Windows e no Linux).
function buildScript(appId, depotId, linuxDepotId = null) {
  if (!linuxDepotId) {
    return `"AppBuild"
{
  "AppID" "${appId}"
  "Desc" "Cuide bem da sua mandioca Windows x64"
  "ContentRoot" "..\\dist\\CuideBemDaSuaMandioca-win32-x64"
  "BuildOutput" "..\\steam-build-output"
  "Depots"
  {
    "${depotId}"
    {
      "FileMapping"
      {
        "LocalPath" "*"
        "DepotPath" "."
        "Recursive" "1"
      }
    }
  }
}
`;
  }
  const depot = (id, folder) => `    "${id}"
    {
      "FileMapping"
      {
        "LocalPath" "${folder}/*"
        "DepotPath" "."
        "Recursive" "1"
      }
    }
`;
  return `"AppBuild"
{
  "AppID" "${appId}"
  "Desc" "Cuide bem da sua mandioca Windows x64 e Linux x64"
  "ContentRoot" "../dist"
  "BuildOutput" "../steam-build-output"
  "Depots"
  {
${depot(depotId, 'CuideBemDaSuaMandioca-win32-x64')}${depot(linuxDepotId, 'CuideBemDaSuaMandioca-linux-x64')}  }
}
`;
}

// "#Festa" mostra o porte e a lotação: {tier} vira o token do porte e {n} vira a variável "convidados".
function richPresence() {
  let out = '"lang"\n{\n';
  for (const lang of I18N.LANGUAGES) {
    const tokens = {};
    const template = I18N.dictionaries()[lang.id].ui['presence.party'];
    tokens['#Festa'] = template.replace('{tier}', '{#Porte_%porte%}').replace('{n}', '%convidados%');
    for (const tier of I18N.localizeData(copyOf(data), lang.id).tiers) tokens[`#Porte_${tier.id}`] = tier.name;
    for (const steamName of STEAM_LANGUAGES[lang.id]) {
      out += `\t${quote(steamName)}\n\t{\n\t\t"tokens"\n\t\t{\n`;
      for (const [key, value] of Object.entries(tokens)) out += `\t\t\t${quote(key)}\t${quote(value)}\n`;
      out += '\t\t}\n\t}\n';
    }
  }
  return `${out}}\n`;
}

function achievementList() {
  const byLang = Object.fromEntries(I18N.LANGUAGES.map(lang => [lang.id, I18N.localizeData(copyOf(data), lang.id)]));
  let out = '# Conquistas para o Steamworks\n\n' +
    'Cadastre em **Steamworks > Stats & Achievements > Achievements**. O **nome da API** tem que ser exatamente este: ' +
    'é ele que o jogo destrava. Os ícones ficam em `steam/conquistas/` (`npm run steam:icons`): ' +
    '`<API>.jpg` para destravada e `<API>_bloqueada.jpg` para bloqueada.\n\n' +
    'Nenhuma conquista é secreta. Quem já tinha a conquista no save antes de jogar pela Steam recebe na hora ao abrir o jogo.\n\n';
  for (const entry of data.achievements) {
    out += `## ${achievementName(entry.id)}\n\n| Idioma (Steam) | Nome | Descrição |\n| --- | --- | --- |\n`;
    for (const lang of I18N.LANGUAGES) {
      const text = byLang[lang.id].achievements.find(a => a.id === entry.id);
      out += `| ${lang.name} (${STEAM_LANGUAGES[lang.id][0]}) | ${text.name} | ${text.text} |\n`;
    }
    out += '\n';
  }
  return out;
}

function main() {
  const [appId, depotId, linuxDepotId] = process.argv.slice(2);
  if (!/^\d+$/.test(appId || '') || !/^\d+$/.test(depotId || '') || (linuxDepotId !== undefined && !/^\d+$/.test(linuxDepotId))) {
    console.error('Uso: npm run steam:config -- APP_ID DEPOT_ID [DEPOT_LINUX_ID]');
    process.exit(1);
  }
  const root = path.resolve(__dirname, '..');
  const output = path.join(root, 'steam');
  fs.mkdirSync(output, { recursive: true });
  const files = {
    [path.join(__dirname, 'steam.json')]: `${JSON.stringify({ appId: Number(appId), required: true, overlay: false }, null, 2)}\n`,
    [path.join(output, `app_build_${appId}.vdf`)]: buildScript(appId, depotId, linuxDepotId),
    [path.join(output, 'rich_presence.vdf')]: richPresence(),
    [path.join(output, 'conquistas.md')]: achievementList()
  };
  for (const [file, content] of Object.entries(files)) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(path.relative(root, file));
  }
  console.log('Agora rode npm run build:win: o App ID novo precisa entrar no executável.');
  if (linuxDepotId) console.log('Com o depot de Linux, rode também npm run build:linux (veja COMANDO-STEAM.txt, "Versão de Linux").');
}

if (require.main === module) main();

module.exports = { richPresence, achievementList, buildScript, STEAM_LANGUAGES };
