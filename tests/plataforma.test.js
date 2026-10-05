const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { spawnSync } = require('node:child_process');
const P = require('../desktop/plataforma.js');
const Tar = require('../desktop/tar.js');

const ROOT = path.resolve(__dirname, '..');
const x11 = { XDG_SESSION_TYPE: 'x11', DISPLAY: ':0' };
const wayland = { XDG_SESSION_TYPE: 'wayland', WAYLAND_DISPLAY: 'wayland-0', DISPLAY: ':0' };

test('plataforma: Windows e macOS sempre abrem em sobreposição; Linux no Wayland ou sem compositor abre em janela; no X11 com compositor (ou sem saber), em sobreposição', () => {
  const modo = options => P.escolherModo({ argv: [], env: {}, ...options });
  assert.deepEqual(modo({ platform: 'win32' }), { modo: 'sobreposicao', motivo: 'padrao', sessao: '' });
  assert.equal(modo({ platform: 'darwin', env: wayland }).modo, 'sobreposicao', 'fora do Linux o Wayland não conta');
  assert.deepEqual(modo({ platform: 'linux', env: wayland }), { modo: 'janela', motivo: 'wayland', sessao: 'wayland' });
  assert.deepEqual(modo({ platform: 'linux', env: x11, compositor: false }), { modo: 'janela', motivo: 'sem-compositor', sessao: 'x11' });
  assert.deepEqual(modo({ platform: 'linux', env: x11, compositor: true }), { modo: 'sobreposicao', motivo: 'x11', sessao: 'x11' });
  assert.equal(modo({ platform: 'linux', env: x11, compositor: null }).modo, 'sobreposicao', 'sem saber, tenta a sobreposição');
  // A escolha manual vale mais que tudo (a linha de comando mais que o ambiente).
  assert.deepEqual(modo({ platform: 'linux', env: wayland, argv: ['--sobreposicao'] }), { modo: 'sobreposicao', motivo: 'escolha', sessao: 'wayland' });
  assert.equal(modo({ platform: 'linux', env: x11, compositor: true, argv: ['--janela'] }).modo, 'janela');
  assert.equal(modo({ platform: 'win32', argv: ['--janela'] }).modo, 'janela');
  assert.equal(modo({ platform: 'linux', env: { ...x11, ARRAIA_MODO: 'janela' } }).modo, 'janela');
  assert.equal(modo({ platform: 'linux', env: { ...wayland, ARRAIA_MODO: 'sobreposicao' } }).modo, 'sobreposicao');
  assert.equal(modo({ platform: 'linux', env: { ...x11, ARRAIA_MODO: 'sobreposicao' }, argv: ['--janela'] }).modo, 'janela', 'a linha de comando vence a variável');
  assert.equal(modo({ platform: 'linux', env: { ...wayland, ARRAIA_MODO: 'xyz' } }).modo, 'janela', 'valor inválido é ignorado');
  assert.equal(P.modoEscolhido([], { ARRAIA_MODO: 'xyz' }), null);
});

test('plataforma: o tipo de sessão vem de XDG_SESSION_TYPE e, sem ele, de WAYLAND_DISPLAY e DISPLAY', () => {
  assert.equal(P.sessao({ XDG_SESSION_TYPE: 'Wayland' }), 'wayland');
  assert.equal(P.sessao({ XDG_SESSION_TYPE: 'tty', WAYLAND_DISPLAY: 'w' }), 'wayland');
  assert.equal(P.sessao({ WAYLAND_DISPLAY: 'wayland-0', DISPLAY: ':0' }), 'wayland');
  assert.equal(P.sessao({ DISPLAY: ':0' }), 'x11');
  assert.equal(P.sessao({}), '');
});

test('plataforma: o compositor do X11 é achado pela seleção _NET_WM_CM_S0 (que só existe com compositor), e sem xprop não dá para saber', () => {
  const chamadas = [];
  const executar = saida => (comando, args) => { chamadas.push([comando, ...args]); if (saida instanceof Error) throw saida; return saida; };
  assert.equal(P.temCompositor(executar('_NET_WM_CM_S0(WINDOW): window id # 0x2e00006\n')), true);
  assert.deepEqual(chamadas[0], ['xprop', '-root', '_NET_WM_CM_S0']);
  assert.equal(P.temCompositor(executar('_NET_WM_CM_S0:  not found.\n')), false);
  assert.equal(P.temCompositor(executar('_NET_WM_CM_S0:  não encontrado.\n')), false);
  assert.equal(P.temCompositor(executar(new Error('spawn xprop ENOENT'))), null);
  assert.equal(P.temCompositor(executar('')), null, 'saída que não diz nada');
});

test('plataforma: chaves do Chromium só no Linux (transparência na sobreposição, XWayland forçado, Wayland nativo na janela, sem GPU a pedido)', () => {
  const chaves = options => P.chavesChromium({ platform: 'linux', env: {}, argv: [], ...options });
  assert.deepEqual(chaves({ platform: 'win32', modo: 'sobreposicao', env: wayland }), []);
  assert.deepEqual(chaves({ modo: 'sobreposicao', env: x11 }), [['enable-transparent-visuals']]);
  assert.deepEqual(chaves({ modo: 'sobreposicao', env: wayland }), [['enable-transparent-visuals'], ['ozone-platform', 'x11']]);
  assert.deepEqual(chaves({ modo: 'janela', env: x11 }), []);
  assert.deepEqual(chaves({ modo: 'janela', env: wayland }), [['ozone-platform-hint', 'auto']]);
  assert.deepEqual(chaves({ modo: 'janela', env: x11, argv: ['--sem-gpu'] }), [['disable-gpu']]);
  assert.deepEqual(chaves({ modo: 'sobreposicao', env: { ...x11, ARRAIA_SEM_GPU: '1' } }), [['enable-transparent-visuals'], ['disable-gpu']]);
  assert.deepEqual(chaves({ modo: 'sobreposicao', env: { ...x11, ARRAIA_SEM_GPU: '0' } }), [['enable-transparent-visuals']]);
});

test('plataforma: o lugar da janela comum volta de onde estava, respeita o mínimo, e cai no meio se ficou fora de todos os monitores', () => {
  const monitores = [{ workArea: { x: 0, y: 0, width: 1920, height: 1032 } }, { workArea: { x: 1920, y: 0, width: 1280, height: 720 } }];
  // Sem nada salvo: o padrão (1100x720) no meio do primeiro monitor.
  assert.deepEqual(P.limitesJanela({ monitores }), { width: 1100, height: 720, x: 410, y: 156, maximizada: false });
  assert.deepEqual(P.limitesJanela({ salvo: 'lixo', monitores }), P.limitesJanela({ monitores }));
  assert.deepEqual(P.limitesJanela({ salvo: { x: 'a', y: 0, width: 1, height: 1 }, monitores }), P.limitesJanela({ monitores }));
  // Monitor pequeno: o padrão encolhe para caber.
  const pequeno = P.limitesJanela({ monitores: [{ workArea: { x: 0, y: 0, width: 800, height: 600 } }] });
  assert.deepEqual([pequeno.width, pequeno.height, pequeno.x, pequeno.y], [800, 600, 0, 0]);
  // Salvo e à vista (inclusive no segundo monitor): volta igual; o mínimo vale; maximizada acompanha.
  assert.deepEqual(P.limitesJanela({ salvo: { x: 300, y: 100, width: 1280, height: 800, maximizada: true }, monitores }), { x: 300, y: 100, width: 1280, height: 800, maximizada: true });
  assert.deepEqual(P.limitesJanela({ salvo: { x: 2000, y: 50, width: 900, height: 500 }, monitores }), { x: 2000, y: 50, width: 900, height: 500, maximizada: false });
  const miudo = P.limitesJanela({ salvo: { x: 100, y: 100, width: 100, height: 100 }, monitores });
  assert.deepEqual([miudo.width, miudo.height], [P.JANELA_MINIMA.width, P.JANELA_MINIMA.height]);
  // Fora de qualquer monitor (o monitor foi tirado), ou com a barra de título fora da tela: o meio do primeiro.
  assert.deepEqual(P.limitesJanela({ salvo: { x: 5000, y: 100, width: 900, height: 500 }, monitores }), P.limitesJanela({ monitores }));
  assert.deepEqual(P.limitesJanela({ salvo: { x: 300, y: -400, width: 900, height: 500 }, monitores }), P.limitesJanela({ monitores }));
  assert.deepEqual(P.limitesJanela({ salvo: { x: 300, y: 2000, width: 900, height: 500 }, monitores }), P.limitesJanela({ monitores }));
  assert.deepEqual(P.limitesJanela({ salvo: { x: -2000, y: 100, width: 900, height: 500 }, monitores }), P.limitesJanela({ monitores }));
  // Sem monitor nenhum informado: usa uma tela de 1920x1080.
  assert.deepEqual([P.limitesJanela({}).width, P.limitesJanela({}).x], [1100, 410]);
});

test('plataforma: o arquivo .desktop do menu e do autostart (com aspas só onde precisa)', () => {
  const texto = P.entradaDesktop({ nome: 'Cuide bem da sua mandioca', comentario: 'Uma festa', exec: ['bash', '/opt/jogo/iniciar-linux.sh'], icone: '/opt/jogo/icone.png', pasta: '/opt/jogo' });
  assert.equal(texto, ['[Desktop Entry]', 'Type=Application', 'Version=1.0', 'Name=Cuide bem da sua mandioca', 'Comment=Uma festa', 'Exec=bash /opt/jogo/iniciar-linux.sh',
    'Path=/opt/jogo', 'Icon=/opt/jogo/icone.png', 'Terminal=false', 'Categories=Game;Simulation;', 'StartupWMClass=cuidebemdasuamandioca', ''].join('\n'));
  const auto = P.entradaDesktop({ nome: 'Jogo', exec: ['/home/ana maria/jogo/Cuide', '--janela'], autostart: true });
  assert.match(auto, /^Exec="\/home\/ana maria\/jogo\/Cuide" --janela$/m, 'espaço no caminho pede aspas');
  assert.match(auto, /^X-GNOME-Autostart-enabled=true$/m);
  assert.doesNotMatch(auto, /^(Icon|Path|Comment)=/m, 'sem ícone, pasta e comentário, as linhas nem aparecem');
  assert.match(P.entradaDesktop({ nome: 'x', exec: ['/a/$b"c`d\\e'] }), /^Exec="\/a\/\\\$b\\"c\\`d\\\\e"$/m, 'aspas, $, crase e barra são escapadas');
  assert.doesNotMatch(P.entradaDesktop({ nome: 'x', exec: ['a'] }), /Autostart/);
});

// --- O empacotador .tar.gz --------------------------------------------------------------------------------

// Lê um .tar.gz como o tar de verdade: devolve [{ nome, tipo, modo, tamanho, conteudo, destino }] (com a soma de conferência checada).
function lerTar(arquivo) {
  const dados = zlib.gunzipSync(fs.readFileSync(arquivo));
  const entradas = [];
  let longo = null;
  for (let posicao = 0; posicao + 512 <= dados.length;) {
    const bloco = dados.subarray(posicao, posicao + 512);
    if (bloco.every(byte => byte === 0)) break;
    const texto = (inicio, fim) => bloco.subarray(inicio, fim).toString('utf8').replace(/\0.*$/s, '');
    const soma = bloco.reduce((total, byte, i) => total + (i >= 148 && i < 156 ? 0x20 : byte), 0);
    assert.equal(soma, parseInt(texto(148, 156).trim(), 8), 'a soma de conferência do cabeçalho confere');
    const tamanho = parseInt(texto(124, 136), 8);
    const tipo = String.fromCharCode(bloco[156]);
    posicao += 512;
    const conteudo = dados.subarray(posicao, posicao + tamanho);
    posicao += Math.ceil(tamanho / 512) * 512;
    if (tipo === 'L') { longo = conteudo.toString('utf8').replace(/\0.*$/s, ''); continue; }
    entradas.push({ nome: longo || texto(0, 100), tipo, modo: parseInt(texto(100, 108), 8), tamanho, conteudo: Buffer.from(conteudo), destino: texto(157, 257) });
    longo = null;
  }
  return entradas;
}

test('tar: o pacote .tar.gz leva cada arquivo com o modo certo (executável ou não), nomes longos, e pastas, e o conteúdo intacto', async () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'mandioca-tar-'));
  try {
    const profundo = path.join('resources', 'app.asar.unpacked', 'node_modules', 'steamworks.js', 'dist', 'linux64', 'um-nome-bem-comprido-para-passar-dos-cem-bytes-no-caminho');
    fs.mkdirSync(path.join(pasta, profundo), { recursive: true });
    const arquivos = { CuideBemDaSuaMandioca: 'ELF', 'iniciar-linux.sh': '#!/usr/bin/env bash\necho oi\n', 'LEIA-ME.txt': 'texto', 'resources.pak': 'pak', 'libffmpeg.so': 'so', 'chrome-sandbox': 'sb',
      [path.join(profundo, 'steamworksjs.linux-x64-gnu.node')]: 'nativo', [path.join(profundo, 'libsteam_api.so')]: 'steam', 'acentuação-ç.json': '{}' };
    for (const [nome, conteudo] of Object.entries(arquivos)) fs.writeFileSync(path.join(pasta, nome), conteudo);
    fs.writeFileSync(path.join(pasta, 'grande.bin'), Buffer.alloc(1300, 7));      // passa de 2 blocos de 512 e não é múltiplo
    const saida = path.join(os.tmpdir(), `mandioca-${process.pid}.tar.gz`);
    const total = await Tar.empacotar({ pasta, saida, raiz: 'Jogo', modos: { 'LEIA-ME.txt': 0o600 }, tempo: 1_700_000_000 });
    assert.equal(total, 10);
    const entradas = lerTar(saida);
    fs.rmSync(saida);
    const por = Object.fromEntries(entradas.map(entrada => [entrada.nome, entrada]));
    assert.equal(entradas[0].nome, 'Jogo/');
    assert.equal(entradas[0].tipo, '5');
    assert.equal(por['Jogo/resources/'].tipo, '5', 'as pastas entram');
    const longo = `Jogo/${profundo.split(path.sep).join('/')}/steamworksjs.linux-x64-gnu.node`;
    assert.ok(longo.length > 100 && por[longo], 'nome com mais de 100 bytes (entrada L do GNU tar)');
    assert.equal(por[longo].conteudo.toString(), 'nativo');
    // Os modos: executável para o que não tem extensão, .sh, .so e .node; os outros, só leitura; o pedido por arquivo vence.
    assert.equal(por['Jogo/CuideBemDaSuaMandioca'].modo, 0o755);
    assert.equal(por['Jogo/iniciar-linux.sh'].modo, 0o755);
    assert.equal(por['Jogo/libffmpeg.so'].modo, 0o755);
    assert.equal(por['Jogo/chrome-sandbox'].modo, 0o755);
    assert.equal(por[longo].modo, 0o755);
    assert.equal(por['Jogo/resources.pak'].modo, 0o644);
    assert.equal(por['Jogo/acentuação-ç.json'].modo, 0o644);
    assert.equal(por['Jogo/LEIA-ME.txt'].modo, 0o600);
    assert.equal(por['Jogo/iniciar-linux.sh'].conteudo.toString(), '#!/usr/bin/env bash\necho oi\n', 'o conteúdo não muda');
    assert.deepEqual([...por['Jogo/grande.bin'].conteudo], new Array(1300).fill(7), 'arquivo que não fecha o bloco de 512 também');
    assert.ok(entradas.every(entrada => entrada.modo !== undefined && !Number.isNaN(entrada.modo)));
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
  }
});

test('tar: modoDoArquivo (executável: sem extensão, .sh, .so, .so.1 e .node)', () => {
  for (const nome of ['jogo', 'chrome-sandbox', 'chrome_crashpad_handler', 'a.sh', 'libGLESv2.so', 'libvk_swiftshader.so', 'libssl.so.3', 'x.node', 'resources/app/dir/jogo']) assert.equal(Tar.modoDoArquivo(nome), 0o755, nome);
  for (const nome of ['a.pak', 'v8_context_snapshot.bin', 'icone.png', 'LICENSE.electron.txt', 'locales/pt-BR.pak', 'package.json', 'a.so.txt']) assert.equal(Tar.modoDoArquivo(nome), 0o644, nome);
});

// --- O inicializador (iniciar-linux.sh) e o instalador ------------------------------------------------------

const bash = (() => { const r = spawnSync('bash', ['-c', 'echo ok'], { encoding: 'utf8' }); return r.status === 0 && r.stdout.trim() === 'ok' ? 'bash' : null; })();
const semBash = bash ? false : 'sem bash neste computador';

function inicializador(args, env = {}) {
  const resultado = spawnSync(bash, [path.join(ROOT, 'iniciar-linux.sh'), ...args], { encoding: 'utf8', env: { PATH: process.env.PATH, HOME: os.homedir(), SYSTEMROOT: process.env.SYSTEMROOT, ...env }, timeout: 20000 });
  return { codigo: resultado.status, saida: resultado.stdout, erro: resultado.stderr };
}

test('inicializador: os dois scripts têm fim de linha do Linux e sintaxe válida', { skip: semBash }, () => {
  for (const nome of ['iniciar-linux.sh', 'instalar-linux.sh']) {
    const texto = fs.readFileSync(path.join(ROOT, nome), 'utf8');
    assert.ok(texto.startsWith('#!/usr/bin/env bash\n'), `${nome}: #! na primeira linha`);
    assert.equal(texto.includes('\r'), false, `${nome}: sem \\r (quebraria o bash no Linux)`);
    const sintaxe = spawnSync(bash, ['-n', path.join(ROOT, nome)], { encoding: 'utf8' });
    assert.equal(sintaxe.status, 0, `${nome}: ${sintaxe.stderr}`);
  }
});

test('inicializador: escolhe o modo pelo ambiente (Wayland e X11 sem compositor em janela; X11 com compositor em sobreposição) e monta as chaves do Chromium', { skip: semBash }, () => {
  const mostrar = (env, ...args) => inicializador(['--mostrar-comando', ...args], env);
  let r = mostrar({ XDG_SESSION_TYPE: 'wayland', WAYLAND_DISPLAY: 'wayland-0' });
  assert.equal(r.codigo, 0, r.erro);
  assert.match(r.saida, /^ARRAIA_MODO=janela \(wayland\)$/m);
  assert.match(r.saida, /--ozone-platform-hint=auto/);
  assert.doesNotMatch(r.saida, /--enable-transparent-visuals/);
  r = mostrar({ XDG_SESSION_TYPE: 'x11', DISPLAY: ':0' });
  assert.match(r.saida, /^ARRAIA_MODO=sobreposicao \(x11\)$/m, 'sem xprop não dá para saber: tenta a sobreposição');
  assert.match(r.saida, /--enable-transparent-visuals/);
  // Escolhas manuais e opções.
  r = mostrar({ XDG_SESSION_TYPE: 'x11', DISPLAY: ':0' }, '--janela', '--sem-gpu', '--foo=bar');
  assert.match(r.saida, /^ARRAIA_MODO=janela \(escolha\)$/m);
  assert.match(r.saida, /--disable-gpu --foo=bar/);
  assert.doesNotMatch(r.saida, /--enable-transparent-visuals/);
  r = mostrar({ XDG_SESSION_TYPE: 'wayland' }, '--sobreposicao');
  assert.match(r.saida, /^ARRAIA_MODO=sobreposicao \(escolha\)$/m);
  assert.match(r.saida, /--enable-transparent-visuals --ozone-platform=x11/, 'sobrepor no Wayland passa pelo XWayland');
  r = mostrar({ DISPLAY: ':0', ARRAIA_MODO: 'janela', ARRAIA_SEM_GPU: '1' });
  assert.match(r.saida, /^ARRAIA_MODO=janela \(escolha\)$/m);
  assert.match(r.saida, /--disable-gpu/);
  r = mostrar({ DISPLAY: ':0', ARRAIA_MODO: 'xyz' });
  assert.equal(r.codigo, 2);
  assert.match(r.erro, /ARRAIA_MODO inválido/);
  r = inicializador(['--ajuda'], {});
  assert.equal(r.codigo, 0);
  assert.match(r.saida, /--janela/);
  assert.match(r.saida, /--sobreposicao/);
});

test('inicializador: com xprop falso, "not found" vira janela (sem compositor) e "window id" vira sobreposição; sem ambiente gráfico, avisa e sai', { skip: semBash }, () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'mandioca-xprop-'));
  try {
    const falso = saida => { fs.writeFileSync(path.join(pasta, 'xprop'), `#!/usr/bin/env bash\necho "${saida}"\n`, { mode: 0o755 }); };
    const caminho = `${pasta}${path.delimiter}${process.env.PATH}`;
    falso('_NET_WM_CM_S0:  not found.');
    let r = inicializador(['--mostrar-comando'], { XDG_SESSION_TYPE: 'x11', DISPLAY: ':0', PATH: caminho });
    assert.match(r.saida, /^ARRAIA_MODO=janela \(sem-compositor\)$/m);
    falso('_NET_WM_CM_S0(WINDOW): window id # 0x2e00006');
    r = inicializador(['--mostrar-comando'], { XDG_SESSION_TYPE: 'x11', DISPLAY: ':0', PATH: caminho });
    assert.match(r.saida, /^ARRAIA_MODO=sobreposicao \(x11\)$/m);
    // O xprop só é perguntado no X11: no Wayland o modo vem direto.
    r = inicializador(['--mostrar-comando'], { XDG_SESSION_TYPE: 'wayland', PATH: caminho });
    assert.match(r.saida, /\(wayland\)/);
    r = inicializador([], { PATH: process.env.PATH });
    assert.equal(r.codigo, 1);
    assert.match(r.erro, /ambiente gráfico/);
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
  }
});

test('instalador do atalho: --ajuda mostra o uso, e uma opção desconhecida é recusada', { skip: semBash }, () => {
  const rodar = (...args) => spawnSync(bash, [path.join(ROOT, 'instalar-linux.sh'), ...args], { encoding: 'utf8', env: { PATH: process.env.PATH, HOME: os.tmpdir(), SYSTEMROOT: process.env.SYSTEMROOT } });
  const ajuda = rodar('--ajuda');
  assert.equal(ajuda.status, 0, ajuda.stderr);
  assert.match(ajuda.stdout, /--autostart/);
  assert.match(ajuda.stdout, /--remover/);
  const errada = rodar('--x');
  assert.equal(errada.status, 2);
  assert.match(errada.stderr, /Opção desconhecida: --x/);
});

test('instalador do atalho: cria o .desktop do menu (e o do autostart a pedido) apontando para o iniciar-linux.sh, e --remover tira', { skip: semBash }, () => {
  const casa = fs.mkdtempSync(path.join(os.tmpdir(), 'mandioca-casa-'));
  try {
    const dados = path.join(casa, 'dados'), config = path.join(casa, 'config');
    const rodar = (...args) => spawnSync(bash, [path.join(ROOT, 'instalar-linux.sh'), ...args], { encoding: 'utf8',
      env: { PATH: process.env.PATH, HOME: casa, XDG_DATA_HOME: dados, XDG_CONFIG_HOME: config, SYSTEMROOT: process.env.SYSTEMROOT } });
    const menu = path.join(dados, 'applications', 'cuidebemdasuamandioca.desktop');
    const auto = path.join(config, 'autostart', 'cuidebemdasuamandioca.desktop');
    const icone = path.join(dados, 'icons', 'hicolor', '256x256', 'apps', 'cuidebemdasuamandioca.png');
    let r = rodar();
    assert.equal(r.status, 0, r.stderr);
    const texto = fs.readFileSync(menu, 'utf8');
    assert.match(texto, /^\[Desktop Entry\]\nType=Application\n/);
    assert.match(texto, /^Name=Cuide bem da sua mandioca$/m);
    assert.match(texto, /^Exec=bash ".*iniciar-linux\.sh"$/m);
    assert.match(texto, /^Icon=cuidebemdasuamandioca$/m, 'o ícone da pasta do projeto é copiado');
    assert.ok(fs.existsSync(icone), 'ícone copiado');
    assert.match(texto, /^Terminal=false$/m);
    assert.equal(fs.existsSync(auto), false, 'sem --autostart não cria o de abrir com a sessão');
    assert.doesNotMatch(texto, /Autostart/);
    r = rodar('--autostart');
    assert.equal(r.status, 0, r.stderr);
    assert.match(fs.readFileSync(auto, 'utf8'), /^X-GNOME-Autostart-enabled=true$/m);
    rodar();
    assert.equal(fs.existsSync(auto), false, 'rodar de novo sem --autostart tira o de abrir com a sessão');
    rodar('--autostart');
    r = rodar('--remover');
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual([menu, auto, icone].map(file => fs.existsSync(file)), [false, false, false]);
  } finally {
    fs.rmSync(casa, { recursive: true, force: true });
  }
});

test('o pacote de Linux e o de Windows se conhecem: o do Windows deixa de fora os arquivos de Linux, e o de Linux leva o inicializador, o instalador, o ícone e as instruções', () => {
  const win = fs.readFileSync(path.join(ROOT, 'desktop', 'package-win.js'), 'utf8');
  const linuxScript = fs.readFileSync(path.join(ROOT, 'desktop', 'package-linux.js'), 'utf8');
  for (const nome of ['iniciar-linux\\.sh', 'instalar-linux\\.sh', 'LEIA-ME-LINUX\\.txt', 'package-linux\\.js', 'tar\\.js']) assert.ok(win.includes(nome), `package-win deixa ${nome} de fora`);
  for (const nome of ['iniciar-linux.sh', 'instalar-linux.sh', 'LEIA-ME-LINUX.txt', "'icone.png'"]) assert.ok(linuxScript.includes(nome), `package-linux leva ${nome}`);
  assert.match(linuxScript, /platform: 'linux'/);
  assert.ok(linuxScript.includes('win64|osx'), 'o pacote de Linux deixa os binários da Steam de Windows e macOS de fora');
  const pacote = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pacote.scripts['build:linux'], 'node desktop/package-linux.js');
  assert.equal(pacote.scripts['start:linux'], 'bash iniciar-linux.sh');
  assert.ok(fs.existsSync(path.join(ROOT, 'desktop', 'icon.png')));
  assert.ok(fs.existsSync(path.join(ROOT, 'LEIA-ME-LINUX.txt')));
  assert.ok(fs.readFileSync(path.join(ROOT, '.gitattributes'), 'utf8').includes('*.sh text eol=lf'), 'os .sh sempre com fim de linha do Linux no git');
  // O ícone é um PNG de verdade (a assinatura do formato).
  assert.deepEqual([...fs.readFileSync(path.join(ROOT, 'desktop', 'icon.png')).subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
});

test('inicializador: no pacote (executável ao lado do script) devolve o bit de executável perdido e abre o jogo; o --mostrar-comando não mexe em nada', { skip: semBash }, () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'mandioca-pacote-'));
  try {
    fs.copyFileSync(path.join(ROOT, 'iniciar-linux.sh'), path.join(pasta, 'iniciar-linux.sh'));
    // Um "jogo" de mentira, sem a permissão de executar (como chega de um depot enviado do Windows).
    fs.writeFileSync(path.join(pasta, 'CuideBemDaSuaMandioca'), '#!/usr/bin/env bash\necho "abriu com: $ARRAIA_MODO $*"\n', { mode: 0o644 });
    const rodar = (...args) => spawnSync(bash, [path.join(pasta, 'iniciar-linux.sh'), ...args], { encoding: 'utf8',
      env: { PATH: process.env.PATH, HOME: os.homedir(), SYSTEMROOT: process.env.SYSTEMROOT, DISPLAY: ':0', XDG_SESSION_TYPE: 'x11' } });
    const mostrar = rodar('--mostrar-comando');
    assert.equal(mostrar.status, 0, mostrar.stderr);
    assert.match(mostrar.stdout, /CuideBemDaSuaMandioca/, 'acha o executável mesmo sem a permissão');
    if (process.platform !== 'win32') assert.equal(fs.statSync(path.join(pasta, 'CuideBemDaSuaMandioca')).mode & 0o111, 0, 'só mostrar o comando não muda a permissão');
    const aberto = rodar('--janela', '--extra');
    assert.equal(aberto.status, 0, aberto.stderr);
    assert.match(aberto.stdout, /abriu com: janela --extra/);
    if (process.platform !== 'win32') assert.ok(fs.statSync(path.join(pasta, 'CuideBemDaSuaMandioca')).mode & 0o100, 'o executável ganhou o bit de executável');
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
  }
});

test('inicializador: aberto pela Steam, tira só as pastas do steam-runtime antigo do LD_LIBRARY_PATH (e ARRAIA_MANTER_LD=1 deixa como está)', { skip: semBash }, () => {
  const mostrar = (ld, extra = {}) => inicializador(['--mostrar-comando'], { DISPLAY: ':0', ...(ld === undefined ? {} : { LD_LIBRARY_PATH: ld }), ...extra }).saida;
  const steam = '/home/g/.steam/ubuntu12_32/steam-runtime/lib:/usr/lib/meu:/home/g/.steam/ubuntu12_64/steam-runtime/lib/x86_64-linux-gnu';
  assert.match(mostrar(steam), /^LD_LIBRARY_PATH=\/usr\/lib\/meu \(sem o steam-runtime antigo\)$/m, 'sobra só o que não é do runtime antigo');
  assert.match(mostrar('/a/steam-runtime/b'), /^LD_LIBRARY_PATH= \(sem o steam-runtime antigo\)$/m, 'se não sobra nada, a variável some (não fica vazia)');
  assert.doesNotMatch(mostrar('/usr/lib/x:/opt/y'), /LD_LIBRARY_PATH/, 'sem steam-runtime não mexe');
  assert.doesNotMatch(mostrar(undefined), /LD_LIBRARY_PATH/, 'sem a variável não mexe');
  assert.doesNotMatch(mostrar(steam, { ARRAIA_MANTER_LD: '1' }), /LD_LIBRARY_PATH/, 'ARRAIA_MANTER_LD=1 deixa como está');
  // De verdade (sem --mostrar-comando): o jogo abre já com a variável limpa.
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'mandioca-ld-'));
  try {
    fs.copyFileSync(path.join(ROOT, 'iniciar-linux.sh'), path.join(pasta, 'iniciar-linux.sh'));
    fs.writeFileSync(path.join(pasta, 'CuideBemDaSuaMandioca'), '#!/usr/bin/env bash\necho "LD=[${LD_LIBRARY_PATH-indefinida}]"\n', { mode: 0o755 });
    const rodar = (ld, extra = {}) => spawnSync(bash, [path.join(pasta, 'iniciar-linux.sh'), '--janela'], { encoding: 'utf8',
      env: { PATH: process.env.PATH, HOME: os.homedir(), SYSTEMROOT: process.env.SYSTEMROOT, DISPLAY: ':0', LD_LIBRARY_PATH: ld, ...extra } }).stdout.trim();
    assert.equal(rodar(steam), 'LD=[/usr/lib/meu]');
    assert.equal(rodar('/a/steam-runtime/b'), 'LD=[indefinida]');
    assert.equal(rodar(steam, { ARRAIA_MANTER_LD: '1' }), `LD=[${steam}]`);
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
  }
});
