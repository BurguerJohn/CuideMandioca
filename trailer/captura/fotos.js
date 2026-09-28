// Fotos para a página da Steam (fotografar.js): screenshots 1920x1080 de gameplay e a festa sozinha, em fundo
// transparente, para a arte das capas. Mesmos saves, relógio virtual e idioma do gravador de vídeos.
const { pecas } = require('./cenas.js');
const { save, MESA, MIRA, TEXTO } = pecas;

// Área de trabalho genérica (sem marca): papel de parede e barra de tarefas. O jogo flutua sobre ela, como no PC.
const DESKTOP = {
  html: `<div id="desktop"><div class="tarefas"><i class="iniciar"></i><i></i><i class="ativo"></i><i></i><i></i>
    <span>21:07<br>${TEXTO.data}</span></div></div>`,
  css: `html, body { background: #2f5fb8 !important; }
    #desktop { position: fixed; inset: 0; pointer-events: none; font-family: 'Segoe UI', sans-serif;
      background: radial-gradient(ellipse 80% 70% at 25% 15%, #6a9ef0, #2f5fb8 55%, #1d3a7c); }
    #desktop .tarefas { position: absolute; left: 0; right: 0; bottom: 0; height: 40px; background: rgba(20, 24, 36, .92);
      display: flex; align-items: center; gap: 12px; padding: 0 14px; }
    #desktop .tarefas i { width: 22px; height: 22px; border-radius: 4px; background: #6b7588; }
    #desktop .tarefas i.iniciar { background: #9fc8ff; } #desktop .tarefas i.ativo { background: #3fa06a; box-shadow: 0 3px 0 #9fc8ff; }
    #desktop .tarefas span { margin-left: auto; color: #e8ecf4; font-size: 11px; text-align: right; line-height: 1.3; }
    #avisos { display: none !important; }`
};

// A festa parada no meio da dança: sem passos, não sobem números; sem pedido nem penetra na frente.
const QUIETA = `const e = __jogo.engine(); e.speed = () => 0.000001;
  e.state.request.active = null; e.state.crasher.active = null;`;

const tela = (nome, extra) => ({ nome, tipo: 'tela', largura: 1920, altura: 1080, zoom: 1.5, aquecer: 1.5,
  html: DESKTOP.html, css: DESKTOP.css, ...extra });

module.exports = [
  // Arte das capas: a festa do fim de jogo inteira, grande e sem fundo.
  { nome: 'festa-arte', tipo: 'festa', save: save('estagio-5'), largura: 3840, altura: 2160, zoom: 1, aquecer: 1,
    ajustes: { zoom: 2, x: 0.5, lift: 200, hud: 'sempre' }, css: '#placa, #avisos { display: none !important; }',
    preparar: QUIETA, em: 3 },
  // Mesma festa com as placas das barracas em branco: para as imagens da Steam que não podem ter texto nenhum.
  { nome: 'festa-limpa', tipo: 'festa', save: save('estagio-5'), largura: 3840, altura: 2160, zoom: 1, aquecer: 1,
    ajustes: { zoom: 2, x: 0.5, lift: 200, hud: 'sempre' }, css: '#placa, #avisos { display: none !important; }',
    preparar: `${QUIETA} const t = ArraiaI18n.t; ArraiaI18n.t = (key, vars) => (key.startsWith('sign.') ? '' : t(key, vars));`,
    em: 3 },
  { nome: 'festa-meio', tipo: 'festa', save: save('meio'), largura: 3840, altura: 2160, zoom: 1, aquecer: 1,
    ajustes: { zoom: 2, x: 0.5, lift: 200, hud: 'sempre' }, css: '#placa, #avisos { display: none !important; }',
    preparar: QUIETA, em: 3 },

  // Screenshots (a Steam pede no mínimo 5, só gameplay).
  tela('1-festa', { save: save('estagio-5'), ajustes: { zoom: 1.35, x: 0.56, lift: 30, hud: 'sempre' }, em: 2.2 }),
  tela('2-vitrine', { save: save('meio'), ajustes: { zoom: 1.35, x: 0.5, lift: 30, hud: 'sempre' }, em: 2.6,
    acoes: [[0.3, `__acao.clicar('[data-action=vitrine]'); __acao.clicar('[data-cat=chapeu]')`],
      [0.8, `__acao.passarMouse('[data-preview=coroa-milho]')`]] }),
  tela('3-argolas', { save: save('meio'), ajustes: { zoom: 1.35, x: 0.5, lift: 30, hud: 'sempre' }, em: 3.05,
    cadaQuadro: MIRA,
    acoes: [[0.2, `__acao.clicar('[data-action=argolas]')`],
      [0.6, `__acao.clicar('[data-action=argolas-jogar]');
        window.__mira = { alvos: [0, 3, 2, 4], jogada: 0, aimFrom: performance.now(), depois: performance.now() + 900,
          esperas: [900, 700, 800, 1400] }`]] }),
  tela('4-turma', { save: save('estagio-5'), ajustes: { zoom: 1.2, x: 0.62, lift: 30, hud: 'sempre' }, em: 1.6,
    acoes: [[0.3, `__acao.acao('tela', { tela: 'turma' })`]] }),
  tela('5-mesa', { save: save('meio'), html: MESA.html, css: MESA.css, ajustes: { zoom: 0.9, x: 0.74, lift: 40, hud: 'sempre' },
    em: 2.4, acoes: [[1.0, `__acao.acao('debug', { op: 'pedido', value: '0' })`]] }),
  tela('6-historico', { save: save('estagio-5'), ajustes: { zoom: 1.2, x: 0.5, lift: 30, hud: 'sempre' }, em: 1.6,
    acoes: [[0.3, `__acao.acao('abrir'); __acao.acao('tab', { tab: 'historico' })`]] })
];
