const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createSteam, readConfig, achievementName } = require('../desktop/steam');

const quiet = { warn() {} };

function fakeSteamworks({ fail = false, known = ['PRIMEIRO_PASSO', 'CIDADE'] } = {}) {
  const calls = [];
  const activated = new Set(['PRIMEIRO_PASSO']);
  return {
    calls,
    restartAppIfNecessary: appId => { calls.push(['restart', appId]); return true; },
    electronEnableSteamOverlay: () => calls.push(['overlay']),
    init: appId => {
      calls.push(['init', appId]);
      if (fail) throw new Error('Steam is not running');
      return {
        localplayer: { getName: () => 'Ana', setRichPresence: (key, value) => calls.push(['presence', key, value]) },
        apps: { currentGameLanguage: () => 'brazilian' },
        achievement: {
          isActivated: name => activated.has(name),
          activate: name => { calls.push(['activate', name]); if (!known.includes(name)) return false; activated.add(name); return true; }
        },
        stats: { store: () => { calls.push(['store']); return true; } }
      };
    }
  };
}

test('conquistas do jogo viram nomes de API da Steam', () => {
  assert.equal(achievementName('primeiro-passo'), 'PRIMEIRO_PASSO');
  assert.equal(achievementName('mao-boa'), 'MAO_BOA');
});

test('com a Steam: idioma, nome, conquistas (sem repetir) e presença', () => {
  const lib = fakeSteamworks();
  const steam = createSteam({ config: { appId: 480, required: false, overlay: false }, load: () => lib, log: quiet });
  assert.equal(steam.init(), true);
  assert.equal(steam.language(), 'brazilian');
  assert.deepEqual(steam.info(), { on: true, name: 'Ana', appId: 480 });
  assert.equal(steam.syncAchievements(['primeiro-passo', 'cidade', 'nao-configurada']), 1);
  assert.deepEqual(lib.calls.filter(call => call[0] === 'activate').map(call => call[1]), ['CIDADE', 'NAO_CONFIGURADA']);
  assert.ok(lib.calls.some(call => call[0] === 'store'), 'grava na Steam depois de destravar');
  lib.calls.length = 0;
  steam.syncAchievements(['primeiro-passo', 'cidade']);
  assert.equal(lib.calls.length, 0, 'o que já foi confirmado não é pedido de novo');
  steam.setPresence({ tier: 'cidade', size: 30 });
  steam.setPresence({ tier: 'cidade', size: 30 });
  assert.deepEqual(lib.calls.filter(call => call[0] === 'presence'),
    [['presence', 'porte', 'cidade'], ['presence', 'convidados', '30'], ['presence', 'steam_display', '#Festa']]);
});

test('sem a Steam o jogo segue: tudo vira no-op', () => {
  const steam = createSteam({ config: { appId: 480, required: false, overlay: false }, load: () => fakeSteamworks({ fail: true }), log: quiet });
  assert.equal(steam.init(), false);
  assert.equal(steam.language(), null);
  assert.deepEqual(steam.info(), { on: false, name: null, appId: 480 });
  assert.equal(steam.syncAchievements(['cidade']), 0);
  steam.setPresence({ tier: 'quintal', size: 1 });
  const broken = createSteam({ load: () => { throw new Error('sem steamworks.js'); }, log: quiet });
  assert.equal(broken.init(), false, 'nem a biblioteca carregou');
});

test('só reinicia pela Steam com App ID de verdade', () => {
  const lib = fakeSteamworks();
  assert.equal(createSteam({ config: { appId: 480, required: true, overlay: false }, load: () => lib, log: quiet }).restartIfNeeded(), false);
  assert.equal(createSteam({ config: { appId: 123456, required: true, overlay: false }, load: () => lib, log: quiet }).restartIfNeeded(), true);
  assert.deepEqual(lib.calls, [['restart', 123456]]);
});

test('configuração da Steam: padrão de desenvolvimento e arquivo inválido', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'steam-config-'));
  const file = path.join(dir, 'steam.json');
  assert.deepEqual(readConfig(file), { appId: 480, required: false, overlay: false });
  fs.writeFileSync(file, JSON.stringify({ appId: 123456, required: true }));
  assert.deepEqual(readConfig(file), { appId: 123456, required: true, overlay: false });
  fs.writeFileSync(file, '{ quebrado');
  assert.equal(readConfig(file).appId, 480);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('arquivos para o Steamworks: presença em todos os idiomas e a lista de conquistas', () => {
  const { richPresence, achievementList } = require('../desktop/prepare-steam');
  const data = require('../src/data.js');
  const vdf = richPresence();
  for (const lang of ['brazilian', 'portuguese', 'english', 'spanish', 'latam']) assert.match(vdf, new RegExp(`"${lang}"`));
  assert.match(vdf, /"#Festa"	"\{#Porte_%porte%\}: %convidados% guests"/);
  assert.match(vdf, /"#Porte_maior"	"World’s Biggest São João"/);
  const list = achievementList();
  for (const entry of data.achievements) assert.match(list, new RegExp(`## ${achievementName(entry.id)}\n`));
  assert.match(list, /Primer paso/);
  assert.equal(data.achievements[0].name, 'Primeiro passo', 'gerar os arquivos não traduz o jogo');
});

test('envio pelo SteamPipe: acha o SDK mais novo, o steamcmd e confere o build', () => {
  const { findSdk, findSteamcmd, steamcmdArgs, problems } = require('../desktop/upload-steam');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mandioca-sdk-'));
  for (const name of ['steamworks_sdk_99', 'steamworks_sdk_165', 'steamworks_sdk_extra']) fs.mkdirSync(path.join(dir, name));
  const builder = path.join(dir, 'steamworks_sdk_165', 'sdk', 'tools', 'ContentBuilder', 'builder');
  fs.mkdirSync(builder, { recursive: true });
  fs.writeFileSync(path.join(builder, 'steamcmd.exe'), '');
  const sdk = findSdk({ env: {}, parent: dir });
  assert.equal(path.basename(sdk), 'steamworks_sdk_165');
  assert.equal(findSdk({ env: { STEAMWORKS_SDK: dir }, parent: dir }), dir);
  assert.equal(findSteamcmd(sdk), path.join(builder, 'steamcmd.exe'));
  assert.equal(findSteamcmd(path.join(dir, 'steamworks_sdk_99')), null);
  assert.deepEqual(steamcmdArgs('conta', 'C:\app.vdf'), ['+login', 'conta', '+run_app_build', 'C:\app.vdf', '+quit']);

  const found = problems({ config: { appId: 480 }, build: dir, script: path.join(dir, 'nada.vdf') });
  assert.match(found.join('\n'), /App ID de testes/);
  assert.match(found.join('\n'), /nada\.vdf/);
  assert.match(found.join('\n'), /steam_api64\.dll/);
  fs.rmSync(dir, { recursive: true, force: true });
});
