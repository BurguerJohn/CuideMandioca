'use strict';

// Como o jogo abre em cada sistema. No Windows (e no macOS) a festa é uma janela transparente do tamanho da tela que deixa o clique
// passar por onde não tem jogo ("sobreposição"). No Linux isso só funciona direito no X11 com compositor (GNOME/KDE/XFCE com efeitos
// ligados): no Wayland o Electron não sabe onde o mouse está quando o clique atravessa, e sem compositor o fundo transparente
// sai preto. Nesses casos o jogo abre numa janela comum, com fundo (o modo "janela"). Este arquivo só decide; quem abre é o main.js.
const MODOS = Object.freeze(['sobreposicao', 'janela']);
const JANELA_PADRAO = Object.freeze({ width: 1100, height: 720 });
const JANELA_MINIMA = Object.freeze({ width: 640, height: 420 });

// A escolha manual vale mais que tudo: `--janela` / `--sobreposicao` na linha de comando ou ARRAIA_MODO no ambiente.
function modoEscolhido(argv = [], env = {}) {
  if (argv.includes('--janela')) return 'janela';
  if (argv.includes('--sobreposicao')) return 'sobreposicao';
  return MODOS.includes(env.ARRAIA_MODO) ? env.ARRAIA_MODO : null;
}

// O tipo de sessão gráfica: 'wayland', 'x11' ou '' (desconhecido).
function sessao(env = {}) {
  const tipo = String(env.XDG_SESSION_TYPE || '').toLowerCase();
  if (tipo === 'wayland' || tipo === 'x11') return tipo;
  if (env.WAYLAND_DISPLAY) return 'wayland';
  return env.DISPLAY ? 'x11' : '';
}

// `compositor`: true/false/null (se o gerenciador de janelas tem compositor; null = não deu para saber).
function escolherModo({ platform = process.platform, env = process.env, argv = process.argv, compositor = null } = {}) {
  const manual = modoEscolhido(argv, env);
  if (manual) return { modo: manual, motivo: 'escolha', sessao: sessao(env) };
  if (platform !== 'linux') return { modo: 'sobreposicao', motivo: 'padrao', sessao: '' };
  const tipo = sessao(env);
  if (tipo === 'wayland') return { modo: 'janela', motivo: 'wayland', sessao: tipo };
  if (compositor === false) return { modo: 'janela', motivo: 'sem-compositor', sessao: tipo };
  return { modo: 'sobreposicao', motivo: 'x11', sessao: tipo };
}

// Compositor no X11: quem o tem registra a seleção _NET_WM_CM_S0 na janela raiz. `executar(comando, argumentos)` devolve a saída
// (texto) ou lança se o comando não existe.
function temCompositor(executar) {
  try {
    const saida = String(executar('xprop', ['-root', '_NET_WM_CM_S0']));
    if (/not found|n[ãa]o encontrad/i.test(saida)) return false;
    return /_NET_WM_CM_S0/.test(saida) ? true : null;
  } catch (_) {
    return null;
  }
}

// As chaves do Chromium que o Linux precisa (aplicadas antes de o app abrir): [nome, valor?].
function chavesChromium({ platform = process.platform, modo, env = process.env, argv = process.argv } = {}) {
  if (platform !== 'linux') return [];
  const chaves = [];
  const tipo = sessao(env);
  if (modo === 'sobreposicao') {
    chaves.push(['enable-transparent-visuals']);
    // Sobrepor a tela no Wayland só dá com o XWayland (o Electron nativo não posiciona nem deixa o clique passar).
    if (tipo === 'wayland') chaves.push(['ozone-platform', 'x11']);
  } else if (tipo === 'wayland') {
    chaves.push(['ozone-platform-hint', 'auto']);
  }
  if (argv.includes('--sem-gpu') || env.ARRAIA_SEM_GPU === '1') chaves.push(['disable-gpu']);
  return chaves;
}

// O tamanho e o lugar da janela comum: o que ficou salvo se ainda cabe em algum monitor, senão o padrão no meio do primeiro.
// `salvo`: { x, y, width, height, maximizada }; `monitores`: [{ workArea: { x, y, width, height } }].
function limitesJanela({ salvo = null, monitores = [], padrao = JANELA_PADRAO } = {}) {
  const areas = monitores.map(monitor => monitor.workArea).filter(Boolean);
  const primeira = areas[0] || { x: 0, y: 0, width: 1920, height: 1080 };
  const numero = valor => Number.isFinite(valor);
  const largura = Math.min(primeira.width, padrao.width);
  const altura = Math.min(primeira.height, padrao.height);
  const centro = { width: largura, height: altura, x: primeira.x + Math.round((primeira.width - largura) / 2),
    y: primeira.y + Math.round((primeira.height - altura) / 2), maximizada: false };
  if (!salvo || typeof salvo !== 'object' || ![salvo.x, salvo.y, salvo.width, salvo.height].every(numero)) return centro;
  const width = Math.max(JANELA_MINIMA.width, Math.round(salvo.width));
  const height = Math.max(JANELA_MINIMA.height, Math.round(salvo.height));
  // Pelo menos um pedaço da barra de título tem que estar à vista (senão a janela ficaria fora de alcance depois de tirar um monitor).
  const aVista = areas.some(area => salvo.x + width > area.x + 80 && salvo.x < area.x + area.width - 80 &&
    salvo.y >= area.y - 10 && salvo.y < area.y + area.height - 60);
  if (!aVista) return centro;
  return { x: Math.round(salvo.x), y: Math.round(salvo.y), width, height, maximizada: salvo.maximizada === true };
}

// O texto de um arquivo .desktop (o atalho do menu e o de abrir ao iniciar a sessão). `exec` é o comando já separado em partes.
const aspas = parte => (/^[A-Za-z0-9_@%+=:,./-]+$/.test(parte) ? parte : `"${parte.replace(/(["`$\\])/g, '\\$1')}"`);
function entradaDesktop({ nome, comentario = '', exec, icone = '', autostart = false, categorias = 'Game;Simulation;', pasta = '' }) {
  const linhas = ['[Desktop Entry]', 'Type=Application', 'Version=1.0', `Name=${nome}`];
  if (comentario) linhas.push(`Comment=${comentario}`);
  linhas.push(`Exec=${exec.map(aspas).join(' ')}`);
  if (pasta) linhas.push(`Path=${pasta}`);
  if (icone) linhas.push(`Icon=${icone}`);
  linhas.push('Terminal=false', `Categories=${categorias}`, 'StartupWMClass=cuidebemdasuamandioca');
  if (autostart) linhas.push('X-GNOME-Autostart-enabled=true');
  return `${linhas.join('\n')}\n`;
}

module.exports = { MODOS, JANELA_PADRAO, JANELA_MINIMA, modoEscolhido, sessao, escolherModo, temCompositor, chavesChromium, limitesJanela, entradaDesktop };
