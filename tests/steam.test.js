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
  fs.writeFileSync(file, 'null');
  assert.deepEqual(readConfig(file), { appId: 480, required: false, overlay: false });
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

test('uma falha ao gravar conquistas tenta novamente no próximo save', () => {
  const lib = fakeSteamworks();
  const init = lib.init;
  let stores = 0;
  lib.init = appId => {
    const client = init(appId);
    client.stats.store = () => ++stores > 1;
    return client;
  };
  const steam = createSteam({ load: () => lib, log: quiet });
  steam.init();
  assert.equal(steam.syncAchievements(['cidade']), 1);
  assert.equal(stores, 1, 'a primeira gravação falhou');
  assert.equal(steam.syncAchievements(['cidade']), 0, 'não precisa ativar a conquista de novo');
  assert.equal(stores, 2, 'repete a gravação pendente mesmo sem novas conquistas');
  steam.syncAchievements(['cidade']);
  assert.equal(stores, 2, 'uma gravação confirmada não se repete');
});

test('uma falha transitória na presença permite reenviar o mesmo porte e lotação', () => {
  const lib = fakeSteamworks();
  const init = lib.init;
  let failed = false;
  lib.init = appId => {
    const client = init(appId);
    const set = client.localplayer.setRichPresence;
    client.localplayer.setRichPresence = (key, value) => {
      if (key === 'convidados' && !failed) { failed = true; throw new Error('sem conexão'); }
      return set(key, value);
    };
    return client;
  };
  const steam = createSteam({ load: () => lib, log: quiet });
  steam.init();
  steam.setPresence({ tier: 'cidade', size: 30 });
  steam.setPresence({ tier: 'cidade', size: 30 });
  const presence = () => lib.calls.filter(call => call[0] === 'presence');
  assert.deepEqual(presence().slice(-3),
    [['presence', 'porte', 'cidade'], ['presence', 'convidados', '30'], ['presence', 'steam_display', '#Festa']]);
  const count = presence().length;
  steam.setPresence({ tier: 'cidade', size: 30 });
  assert.equal(presence().length, count, 'a presença completa confirmada não se repete');
});

test('nuvem da Steam: só com o App ID de verdade e a nuvem ligada na conta e no jogo; ler, gravar e falhar viram no-op', () => {
  const files = new Map([['save.json', '{"a":1}']]);
  const flags = { account: true, app: true, boom: false };
  const lib = {
    init: () => ({
      localplayer: { getName: () => 'Ana' },
      apps: { currentGameLanguage: () => 'brazilian' },
      cloud: {
        isEnabledForAccount: () => flags.account,
        isEnabledForApp: () => flags.app,
        fileExists: name => files.has(name),
        readFile: name => { if (flags.boom) throw new Error('falhou'); return files.get(name); },
        writeFile: (name, content) => { if (flags.boom) throw new Error('falhou'); files.set(name, content); return true; }
      }
    })
  };
  const real = createSteam({ config: { appId: 5343830, required: true, overlay: false }, load: () => lib, log: quiet });
  assert.equal(real.cloudEnabled(), false, 'sem iniciar a Steam não há nuvem');
  assert.equal(real.cloudRead('save.json'), null);
  assert.equal(real.cloudWrite('save.json', 'x'), false);
  assert.equal(real.init(), true);
  assert.equal(real.cloudEnabled(), true);
  assert.equal(real.cloudRead('save.json'), '{"a":1}');
  assert.equal(real.cloudRead('nao-existe.json'), null);
  assert.equal(real.cloudWrite('save.json', '{"b":2}'), true);
  assert.equal(files.get('save.json'), '{"b":2}');
  flags.app = false;
  assert.equal(real.cloudEnabled(), false, 'desligada nas Propriedades do jogo');
  flags.app = true;
  flags.account = false;
  assert.equal(real.cloudEnabled(), false, 'desligada na conta');
  flags.account = true;
  flags.boom = true;
  assert.equal(real.cloudRead('save.json'), null, 'erro da Steam vira null');
  assert.equal(real.cloudWrite('save.json', 'y'), false, 'e gravação que falha vira false');
  // O App ID de testes (480) nunca mexe na nuvem de ninguém.
  flags.boom = false;
  const spacewar = createSteam({ config: { appId: 480, required: false, overlay: false }, load: () => lib, log: quiet });
  spacewar.init();
  assert.equal(spacewar.cloudEnabled(), false);
  // Uma Steam sem a parte da nuvem (biblioteca velha) também não derruba nada.
  const old = createSteam({ config: { appId: 5343830, required: true, overlay: false }, load: () => ({ init: () => ({ localplayer: { getName: () => 'Ana' } }) }), log: quiet });
  old.init();
  assert.equal(old.cloudEnabled(), false);
  assert.equal(old.cloudRead('save.json'), null);
  assert.equal(old.cloudWrite('save.json', 'z'), false);
});

test('SteamPipe com Linux: o script tem um depot por sistema (pasta de cada build), e sem o terceiro número continua só com o Windows', () => {
  const { buildScript } = require('../desktop/prepare-steam');
  const win = buildScript('5343830', '5343831');
  const barra = String.fromCharCode(92);
  assert.ok(win.includes(`"ContentRoot" "${['..', 'dist', 'CuideBemDaSuaMandioca-win32-x64'].join(barra)}"`), 'o de sempre não muda');
  assert.doesNotMatch(win, /linux/i);
  assert.equal((win.match(/"FileMapping"/g) || []).length, 1);
  const both = buildScript('5343830', '5343831', '5343832');
  assert.match(both, /"AppID" "5343830"/);
  assert.match(both, /"ContentRoot" "\.\.\/dist"/, 'a raiz passa a ser dist/, com uma pasta por depot');
  assert.match(both, /"5343831"\s*\{\s*"FileMapping"\s*\{\s*"LocalPath" "CuideBemDaSuaMandioca-win32-x64\/\*"/);
  assert.match(both, /"5343832"\s*\{\s*"FileMapping"\s*\{\s*"LocalPath" "CuideBemDaSuaMandioca-linux-x64\/\*"/);
  assert.equal((both.match(/"DepotPath" "\."/g) || []).length, 2);
  assert.equal((both.match(/"Recursive" "1"/g) || []).length, 2);
  // As chaves abrem e fecham (o arquivo é lido por quem não perdoa chave faltando).
  assert.equal((both.match(/\{/g) || []).length, (both.match(/\}/g) || []).length);
  assert.ok(both.indexOf('"5343831"') < both.indexOf('"5343832"'));
});

test('envio pelo SteamPipe com Linux: só confere o build de Linux se o script tem o depot dele, acha o steamcmd.sh no Linux e avisa do bit de executável no Windows', () => {
  const { findSteamcmd, problems, hasLinuxDepot, linuxPermissionNote, LINUX_REQUIRED } = require('../desktop/upload-steam');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mandioca-linux-'));
  try {
    const touch = (base, file) => { fs.mkdirSync(path.dirname(path.join(base, file)), { recursive: true }); fs.writeFileSync(path.join(base, file), ''); };
    const win = path.join(dir, 'win'), linux = path.join(dir, 'linux');
    for (const file of ['CuideBemDaSuaMandioca.exe', 'resources/app.asar', 'resources/app.asar.unpacked/node_modules/steamworks.js/dist/win64/steam_api64.dll',
      'resources/app.asar.unpacked/node_modules/steamworks.js/dist/win64/steamworksjs.win32-x64-msvc.node']) touch(win, file);
    const so = path.join(dir, 'so.vdf'), ambos = path.join(dir, 'ambos.vdf');
    fs.writeFileSync(so, '"AppBuild" { "ContentRoot" "..\dist\CuideBemDaSuaMandioca-win32-x64" }');
    fs.writeFileSync(ambos, '"AppBuild" { "LocalPath" "CuideBemDaSuaMandioca-linux-x64/*" }');
    assert.equal(hasLinuxDepot(so), false);
    assert.equal(hasLinuxDepot(ambos), true);
    assert.equal(hasLinuxDepot(path.join(dir, 'nao-existe.vdf')), false);
    const config = { appId: 5343830 };
    assert.deepEqual(problems({ config, build: win, script: so, linuxBuild: linux }), [], 'sem o depot de Linux o build de Linux nem é olhado');
    const faltando = problems({ config, build: win, script: ambos, linuxBuild: linux });
    assert.equal(faltando.length, LINUX_REQUIRED.length);
    assert.match(faltando.join('\n'), /build de Linux não tem iniciar-linux\.sh/);
    assert.match(faltando.join('\n'), /libsteam_api\.so/);
    assert.match(faltando.join('\n'), /npm run build:linux/);
    for (const file of LINUX_REQUIRED) touch(linux, file);
    assert.deepEqual(problems({ config, build: win, script: ambos, linuxBuild: linux }), []);
    // O steamcmd: .exe no Windows; .sh (nas pastas do SDK para Linux e macOS) nos outros.
    const builder = path.join(dir, 'sdk', 'tools', 'ContentBuilder');
    touch(builder, 'builder/steamcmd.exe');
    touch(builder, 'builder_linux/steamcmd.sh');
    assert.equal(findSteamcmd(path.join(dir, 'sdk'), 'win32'), path.join(builder, 'builder', 'steamcmd.exe'));
    assert.equal(findSteamcmd(path.join(dir, 'sdk'), 'linux'), path.join(builder, 'builder_linux', 'steamcmd.sh'));
    assert.equal(findSteamcmd(path.join(dir, 'sdk'), 'darwin'), path.join(builder, 'builder_linux', 'steamcmd.sh'), 'a ordem acha o que existir');
    fs.rmSync(path.join(builder, 'builder_linux'), { recursive: true });
    assert.equal(findSteamcmd(path.join(dir, 'sdk'), 'linux'), null, 'steamcmd.exe não serve no Linux');
    // O aviso do bit de executável só aparece enviando de um Windows.
    assert.match(linuxPermissionNote('win32'), /Windows.*bit de executável.*permission denied.*tar\.gz.*--sem-build/s);
    assert.equal(linuxPermissionNote('linux'), null);
    assert.equal(linuxPermissionNote('darwin'), null);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
