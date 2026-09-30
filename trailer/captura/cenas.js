// Roteiros de gravação: cada cena diz o save, o tamanho da janela, o fundo, quanto tempo grava e o que acontece
// em cada segundo (código que roda dentro da página; `__acao` e `__jogo` vêm do preload).
const fs = require('node:fs');
const path = require('node:path');

const save = nome => JSON.parse(fs.readFileSync(path.join(__dirname, 'saves', `${nome}.json`), 'utf8'));

// Céu de São João: noite azul com brilho no meio, estrelinhas de pixel e os avisos do jogo escondidos.
function estrelas(quantas, semente) {
  let s = semente;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const cores = ['#fff4e4', '#fff07a', '#cfe3ff'];
  return Array.from({ length: quantas }, () => `${(r() * 100).toFixed(2)}vw ${(r() * 62).toFixed(2)}vh 0 ` +
    `${r() < 0.15 ? 1 : 0}px ${cores[Math.floor(r() * cores.length)]}`).join(', ');
}
const NOITE = {
  html: `<div id="fundo-noite"><i></i></div>`,
  css: `html, body { background: #1c1a3a !important; }
    #fundo-noite { position: fixed; inset: 0; pointer-events: none;
      background: radial-gradient(ellipse 85% 48% at 50% 44%, rgba(98, 72, 176, .55), rgba(28, 26, 58, 0) 72%),
        radial-gradient(ellipse 100% 30% at 50% 100%, rgba(238, 47, 60, .16), rgba(28, 26, 58, 0) 70%); }
    #fundo-noite i { position: absolute; left: 0; top: 0; width: 2px; height: 2px; box-shadow: ${estrelas(70, 11)}; }
    #avisos { display: none !important; }`
};
const SEM_PLACA = '#placa { display: none !important; }';

// Área de trabalho de escritório falsa (sem marca nenhuma): planilha, papel de parede e barra de tarefas, no idioma
// da gravação.
const ESCRITORIO = {
  'pt-BR': { arquivo: 'Relatorio_trimestral_FINAL_v7_agora_vai.xlsx', locale: 'pt-BR', decimal: ',',
    menu: ['Arquivo', 'Editar', 'Exibir', 'Inserir', 'Formatar', 'Dados', 'Ajuda'],
    formula: '=SOMA(B2:B18)/CONT.VALORES(B2:B18)*(1+E19)', data: '24/06/2026', revisar: 'revisar',
    titulos: ['Região', 'Jan', 'Fev', 'Mar', 'Meta', 'Δ %', 'Status'],
    regioes: ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul', 'Filial 7', 'Filial 12', 'Online', 'Atacado',
      'Varejo', 'Parcerias', 'Exportação', 'Filial 3', 'Filial 9', 'Total parcial', 'Ajustes', 'Total'] },
  en: { arquivo: 'Quarterly_Report_FINAL_v7_for_real.xlsx', locale: 'en-US', decimal: '.',
    menu: ['File', 'Edit', 'View', 'Insert', 'Format', 'Data', 'Help'],
    formula: '=SUM(B2:B18)/COUNTA(B2:B18)*(1+E19)', data: '6/24/2026', revisar: 'review',
    titulos: ['Region', 'Jan', 'Feb', 'Mar', 'Target', 'Δ %', 'Status'],
    regioes: ['North', 'Northeast', 'Midwest', 'Southeast', 'South', 'Branch 7', 'Branch 12', 'Online', 'Wholesale',
      'Retail', 'Partners', 'Export', 'Branch 3', 'Branch 9', 'Subtotal', 'Adjustments', 'Total'] },
  es: { arquivo: 'Informe_trimestral_FINAL_v7_ahora_si.xlsx', locale: 'es-ES', decimal: ',',
    menu: ['Archivo', 'Editar', 'Ver', 'Insertar', 'Formato', 'Datos', 'Ayuda'],
    formula: '=SUMA(B2:B18)/CONTARA(B2:B18)*(1+E19)', data: '24/06/2026', revisar: 'revisar',
    titulos: ['Región', 'Ene', 'Feb', 'Mar', 'Meta', 'Δ %', 'Estado'],
    regioes: ['Norte', 'Noreste', 'Centro', 'Sudeste', 'Sur', 'Sucursal 7', 'Sucursal 12', 'En línea', 'Mayorista',
      'Minorista', 'Socios', 'Exportación', 'Sucursal 3', 'Sucursal 9', 'Subtotal', 'Ajustes', 'Total'] }
};
const TEXTO = ESCRITORIO[process.env.IDIOMA] || ESCRITORIO['pt-BR'];

function planilha() {
  let s = 7;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const colunas = ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];
  let linhas = `<tr>${colunas.map(c => `<th>${c}</th>`).join('')}</tr><tr><th>1</th>${TEXTO.titulos.map(t => `<td class="cab">${t}</td>`).join('')}</tr>`;
  TEXTO.regioes.forEach((regiao, i) => {
    const n = () => (10000 + Math.floor(r() * 90000)).toLocaleString(TEXTO.locale);
    const delta = ((r() - 0.45) * 20).toFixed(1).replace('.', TEXTO.decimal);
    linhas += `<tr><th>${i + 2}</th><td>${regiao}</td><td>${n()}</td><td>${n()}</td><td>${n()}</td><td>${n()}</td>` +
      `<td class="${delta.startsWith('-') ? 'neg' : 'pos'}">${delta}</td><td>${r() < 0.3 ? TEXTO.revisar : 'ok'}</td></tr>`;
  });
  return linhas;
}
const MESA = {
  html: `<div id="mesa"><div class="planilha"><div class="titulo"><i></i>${TEXTO.arquivo}
      <span>—&nbsp;&nbsp;▢&nbsp;&nbsp;✕</span></div>
    <div class="menu">${TEXTO.menu.join('&nbsp;&nbsp; ')}</div>
    <div class="formula"><b>fx</b>${TEXTO.formula}</div>
    <table>${planilha()}</table></div>
    <div class="tarefas"><i class="iniciar"></i><i></i><i class="ativo"></i><i></i><i></i><span>21:07<br>${TEXTO.data}</span></div></div>`,
  css: `html, body { background: #2f5fb8 !important; }
    #mesa { position: fixed; inset: 0; pointer-events: none; font-family: 'Segoe UI', sans-serif;
      background: radial-gradient(ellipse 70% 60% at 30% 20%, #5a8ee8, #2f5fb8 60%, #1f3f86); }
    #mesa .planilha { position: absolute; left: 3%; top: 4%; width: 74%; height: 80%; background: #fff; border: 1px solid #9aa4b4;
      box-shadow: 0 10px 30px rgba(0, 0, 0, .35); overflow: hidden; font-size: 11px; color: #1d2330; }
    #mesa .titulo { height: 26px; display: flex; align-items: center; gap: 8px; padding: 0 10px; background: #1e6e42; color: #fff; font-size: 12px; }
    #mesa .titulo i { width: 12px; height: 12px; background: #fff; opacity: .85; }
    #mesa .titulo span { margin-left: auto; letter-spacing: 2px; }
    #mesa .menu { padding: 5px 10px; background: #f3f5f8; border-bottom: 1px solid #dde2ea; }
    #mesa .formula { padding: 4px 10px; border-bottom: 1px solid #dde2ea; color: #445; }
    #mesa .formula b { margin-right: 10px; color: #1e6e42; }
    #mesa table { border-collapse: collapse; width: 100%; }
    #mesa th { background: #eef1f5; color: #667; font-weight: 400; border: 1px solid #d5dbe4; padding: 3px 6px; }
    #mesa td { border: 1px solid #e3e7ee; padding: 3px 6px; text-align: right; }
    #mesa td:first-of-type, #mesa td.cab { text-align: left; }
    #mesa td.cab { font-weight: 700; background: #e8f3ec; }
    #mesa td.neg { color: #c62828; } #mesa td.pos { color: #1e6e42; }
    #mesa .tarefas { position: absolute; left: 0; right: 0; bottom: 0; height: 40px; background: rgba(20, 24, 36, .92);
      display: flex; align-items: center; gap: 12px; padding: 0 14px; }
    #mesa .tarefas i { width: 22px; height: 22px; border-radius: 4px; background: #6b7588; }
    #mesa .tarefas i.iniciar { background: #9fc8ff; } #mesa .tarefas i.ativo { background: #3fa06a; box-shadow: 0 3px 0 #9fc8ff; }
    #mesa .tarefas span { margin-left: auto; color: #e8ecf4; font-size: 11px; text-align: right; line-height: 1.3; }
    #avisos { display: none !important; }`
};

// Argolas: mira cada jogada numa garrafa. A posição da argola é a mesma fórmula do jogo (seno sobre as garrafas),
// então o roteiro acha o instante exato em que ela passa no centro da garrafa e solta a argola ali.
const MIRA = `
  const PASSO = 1000 / 30, GARRAFAS = [24, 56, 88, 120, 152], PERIODOS = [1800, 1400, 1150, 950];
  const m = window.__mira, agora = performance.now();
  if (m && agora >= m.depois) {
    const P = PERIODOS[Math.min(m.jogada, 3)], d = (GARRAFAS[m.alvos[m.jogada]] - 88) / 76, base = Math.asin(d);
    let quando = null;
    for (let k = 0; k < 60 && quando === null; k++) {
      for (const fase of [base, Math.PI - base]) {
        const t = m.aimFrom + (fase / (2 * Math.PI) + k) * P;
        if (t > agora && t <= agora + PASSO && (quando === null || t < quando)) quando = t;
      }
    }
    if (quando !== null) {
      __jogo.ui.game.throwRing(quando);
      m.jogada++;
      m.aimFrom = agora + Math.ceil((quando + 340 - agora) / PASSO) * PASSO;
      m.depois = m.aimFrom + (m.esperas[m.jogada] || 700);
      if (m.jogada >= m.alvos.length) window.__mira = null;
    }
  }`;

function estagio(nome, extra = '') {
  return { save: save(nome), zoom: 2, segundos: 4.5, aquecer: 1.5,
    ajustes: { zoom: 3, x: 0.5, lift: 250 }, html: NOITE.html, css: NOITE.css + SEM_PLACA + extra };
}

module.exports = {
  // Evolução: a mesma festa em cinco momentos, cada um no maior tamanho que cabe na largura.
  'estagio-1': estagio('estagio-1'),
  'estagio-2': estagio('estagio-2'),
  'estagio-3': estagio('estagio-3'),
  'estagio-4': estagio('estagio-4'),
  'estagio-5': { ...estagio('estagio-5'), segundos: 6 },
  // O Sopinha, coelho mascote que vem da pescaria, pulando pela Festa da Cidade.
  // Em 2 s ganha carinho (binky); em 4 s a Mandioca cansa e ele costuma deitar junto.
  sopinha: { ...estagio('estagio-3'), segundos: 10,
    preparar: `const e = __jogo.engine(); e.state.crew.sopinha = { level: 1 };`,
    acoes: [[2, `__jogo.ui.festa.poke('sopinha');`], [4, `__jogo.engine().state.runtime.stamina = 0;`]] },

  // Cada convidado traz uma peça: 14 convidados chegando, um a cada 0,9 s (passa pela Festa da Cidade).
  presentes: {
    save: save('presentes'), zoom: 2, segundos: 15, aquecer: 1.2,
    ajustes: { zoom: 0.5, x: 0.5, lift: 250 }, html: NOITE.html, css: NOITE.css + SEM_PLACA,
    acoes: Array.from({ length: 14 }, (_, i) => [1 + i * 0.9, `__acao.acao('debug', { op: 'convidados', value: '1' })`])
  },

  // Área de trabalho: a festa dançando por cima da planilha, com a placa, um pedido, um penetra e a cobra.
  mesa: {
    save: save('meio'), largura: 1920, altura: 1080, zoom: 1.5, segundos: 12, aquecer: 1.5,
    ajustes: { zoom: 0.667, x: 0.74, lift: 40, hud: 'sempre' }, html: MESA.html, css: MESA.css,
    acoes: [
      [1.5, `__acao.acao('debug', { op: 'pedido', value: '0' })`],
      [3.2, `__acao.evento('step', { value: __jogo.engine().stepValue() * 3, crit: true })`],
      [5.0, `__acao.acao('debug', { op: 'penetra', value: '0' })`],
      [8.0, `__acao.acao('debug', { op: 'convidados', value: '1' })`],
      [9.6, `__acao.evento('step', { value: __jogo.engine().stepValue() * 3, crit: true })`]
    ]
  },

  // Argolas da Sorte (a Barraca das Argolas dá 4 argolas): fichas, lenha, o ×3 no meio e por último o presente,
  // com a argola mais rápida e 1 pixel de folga.
  argolas: {
    save: save('meio'), zoom: 1.5, segundos: 15, aquecer: 1,
    ajustes: { zoom: 0.667, x: 0.5, lift: 30, hud: 'sempre' }, html: NOITE.html, css: NOITE.css,
    cadaQuadro: MIRA,
    acoes: [
      [0.5, `__acao.clicar('[data-action=argolas]')`],
      [1.3, `__acao.clicar('[data-action=argolas-jogar]');
        const aim = window.__jogo.engine().cfg.ringAim;
        const premio = (kind, extra) => ({ kind, aim: aim[kind], ...extra });
        __jogo.engine().round.prizes.splice(0, 5, premio('fichas', { amount: 5 }), premio('animacao', { factor: 2 }),
          premio('x3', { mult: 3 }), premio('lenha', { amount: 12 }), premio('item', { id: 'oculos-coracao' }));
        window.__mira = { alvos: [0, 3, 2, 4], jogada: 0, aimFrom: performance.now(), depois: performance.now() + 900,
          esperas: [900, 700, 800, 1400] }`],
      [11.0, `__acao.clicar('[data-action=argolas-fechar]')`],
      [11.6, `__acao.clicar('[data-action=vitrine]'); __acao.clicar('[data-cat=chapeu]')`],
      [12.4, `__acao.passarMouse('[data-preview=oculos-coracao]')`],
      [13.2, `__acao.clicar('[data-id=oculos-coracao]')`],
      [14.0, `__acao.clicar('[data-action=vitrine-fechar]')`]
    ]
  },

  // Palco cheio para a apresentação da turma (fim de jogo, fogueira lendária).
  palco: { ...estagio('estagio-5'), segundos: 8, ajustes: { zoom: 3, x: 0.5, lift: 250 } }
};

// --- Trailer da Steam (videos/steam): 16:9 em 4K (3840x2160) para os zooms na montagem ficarem em pixel exato. ---
// Densidade 3 = página de 1280x720 (área de trabalho e janelas do jogo no tamanho de sempre); densidade 4 = 960x540
// (a festa de perto). Os segundos das ações casam com os compassos da música (2,305 s) a partir do início do clipe.
const STEAM = { largura: 3840, altura: 2160 };
const COMPASSO = 2.305;
const noiteSteam = (nome, ajustes, extra = {}) => ({ ...STEAM, save: save(nome), zoom: 4, aquecer: 1.5,
  ajustes: { x: 0.5, ...ajustes }, html: NOITE.html, css: NOITE.css + SEM_PLACA, ...extra });
// Dá à festa itens da loja (para vestir a Mandioca no meio da cena) sem aparecer compra nenhuma.
const darItens = ids => `const e = __jogo.engine(); for (const id of ${JSON.stringify(ids)}) if (!e.owned(id)) e.state.inventory.push(id);`;
const vestir = ids => `const e = __jogo.engine(); for (const id of ${JSON.stringify(ids)}) e.equip(id);`;
const convidados = n => `__acao.acao('debug', { op: 'convidados', value: '${n}' })`;
// A Mandioca cresce até o tamanho `n` (0 broto … 3 inteira): compra níveis (sem aparecer compra) até passar do limiar.
const crescer = n => `{ const e = __jogo.engine(); e.state.cheer = 1e15; const ids = ['rebolado', 'folego', 'refresco', 'ritmo'];
  for (let i = 0; e.growthStage() < ${n} && i < 2000; i++) e.buyLevel(ids[i % 4]); }`;
// Eventos que a festa sorteia sozinha (drones, dança das fitas, compadres), começados na hora (`idade` ms adiantados).
const provocar = (tipo, opcoes = {}) => `__jogo.ui.festa.provocar('${tipo}', ${JSON.stringify(opcoes)})`;
// Rabo no burro na mosca: acerta o nascimento do cavalete para o rabo passar pelo X daqui a `ms` (quando vem a pregada).
const burroNaMosca = ms => `const e = __jogo.engine(); const b = e.state.burro.active; let melhor = 0, dist = 1e9;
  for (let t = ${ms}; t < ${ms} + 6000; t += 10) { const [x, y] = e.burroOffset(t); const d = Math.hypot(x, y); if (d < dist) { dist = d; melhor = t; } }
  b.born = e.now() - (melhor - ${ms});`;

Object.assign(module.exports, {
  // 1. O quintal na área de trabalho: a festa sem nenhuma melhoria, pequena, sobre a planilha (a câmera recua na montagem).
  'steam-quintal': { ...STEAM, save: save('estagio-1'), zoom: 3, segundos: 11, aquecer: 1.5,
    ajustes: { zoom: 1, x: 0.72, lift: 48, hud: 'sempre' }, html: MESA.html, css: MESA.css },

  // 2. Primeiras melhorias, de perto: no pico da música ela cresce (broto → mudinha) e ganha o chapéu; no compasso
  // seguinte cresce de novo (mandioquinha) com roupa e espiga; e os convidados chegam até 9.
  'steam-melhorias': noiteSteam('estagio-1', { zoom: 1.5, lift: 40 }, { segundos: 11,
    preparar: darItens(['vaqueiro', 'xadrez-azul', 'espiga']),
    acoes: [
      [COMPASSO, crescer(1) + vestir(['vaqueiro'])],
      [COMPASSO * 2, crescer(2) + vestir(['xadrez-azul', 'espiga'])],
      [COMPASSO * 3, convidados(3)], [COMPASSO * 3 + 0.8, convidados(2)], [COMPASSO * 3 + 1.6, convidados(3)]
    ] }),

  // 3. Quermesse do Bairro: o 10º convidado (confete), peças de cenário pipocando e o Milho entrando na turma.
  'steam-quermesse': noiteSteam('estagio-2', { zoom: 1.2, lift: 10 }, { segundos: 11,
    preparar: `const e = __jogo.engine(); e.state.size = 9; e.state.fame = e.fameNeed() * 0.97; delete e.state.crew.milho;`,
    acoes: [
      [0.2, convidados(1)],
      [COMPASSO, convidados(1)], [COMPASSO * 2, convidados(1)],
      [COMPASSO * 3, `const e = __jogo.engine(); e.state.crew.milho = { level: 1 }; e.emit('fished', { id: 'milho', isNew: true });`]
    ] }),

  // 4. Festa da Cidade: uma brincadeira por compasso na festa inteira: o pote quebra (chove bala), o rabo prega no
  // burro na mosca, o casamento na roça com arroz e o prato do Fogão a Lenha voando até a Mandioca.
  'steam-cidade': noiteSteam('estagio-3', { zoom: 1.2, lift: 30 }, { segundos: 9.5, aquecer: 1,
    // Álbum cheio: sem "FIGURINHA NOVA!" pipocando por cima das brincadeiras.
    preparar: `const e = __jogo.engine(); if (!e.owned('fogao-lenha')) e.state.inventory.push('fogao-lenha');
      e.equip('fogao-lenha', 'direita'); e.state.wood = 50;
      e.state.album = e.data.album.flatMap(page => page.stickers.map(sticker => sticker.id));`,
    acoes: [
      // O pote aparece num lugar sorteado: fixo aqui, à esquerda do palco, para a câmera da montagem saber onde mirar.
      [0.1, `__acao.acao('debug', { op: 'pote', value: '0' }); __jogo.engine().state.pote.active.x = 0.3;`],
      // Uma paulada a cada 0,3 s (o jogo aceita uma a cada 0,25 s; as ações caem em quadros de 1/30 s).
      ...[0.3, 0.6, 0.9, 1.2, 1.5, 1.8].map(t => [t, `__jogo.engine().hitPote()`]),
      [COMPASSO + 0.05, `__acao.acao('debug', { op: 'burro', value: '0' })`],
      [COMPASSO + 0.1, burroNaMosca(1700)],
      [COMPASSO + 1.8, `__jogo.engine().pinBurro()`],
      [COMPASSO * 2 + 0.05, `__acao.acao('debug', { op: 'casamento', value: '0' })`],
      ...[0.6, 1.0, 1.4, 1.8].map(t => [COMPASSO * 2 + t, `__jogo.engine().throwRice()`]),
      [COMPASSO * 3 + 0.05, `__acao.acao('debug', { op: 'cozinha', value: '0' })`],
      [COMPASSO * 3 + 0.4, `__jogo.engine().serve()`]
    ] }),

  // 4b. A turma tocando no palco (o fecho da cena 4).
  'steam-palco': noiteSteam('estagio-4', { zoom: 3, lift: 0 }, { segundos: 4 }),

  // 5. São João Regional: a festa larga para a panorâmica. O mastro de São João na esquerda com as crianças na dança das
  // fitas (a câmera começa ali), o palco, e na fogueira os compadres no segundo verso (a ponte de fagulhas) quando a
  // câmera chega; a labareda sai no último compasso.
  'steam-regional': noiteSteam('estagio-4', { zoom: 1.25, lift: 40 }, { segundos: 11,
    preparar: `const e = __jogo.engine(); if (!e.owned('mastro')) e.state.inventory.push('mastro'); e.equip('mastro', 'esquerda');`,
    acoes: [
      [0.05, provocar('fitas', { idade: 1500 })],
      [0.3, provocar('compadres')],
      [COMPASSO * 3 - 0.3, `__jogo.engine().state.runtime.flareWait = 0.3`]
    ] }),

  // 6. O Maior São João do Mundo em cima da planilha: confete no começo e o show de drones no céu, do VIVA para a
  // Mandioca (a câmera recua na montagem). O telão no palco já vem com o porte.
  'steam-maior': { ...STEAM, save: save('estagio-5'), zoom: 3, segundos: 8, aquecer: 1.5,
    // A planilha mais estreita só aqui: o céu acima da festa, onde os drones desenham, fica sobre o papel de parede.
    ajustes: { zoom: 1.2, x: 0.6, lift: 40 }, html: MESA.html, css: MESA.css + SEM_PLACA + '#mesa .planilha { width: 38%; }',
    acoes: [
      [0, provocar('drones', { idade: 3600, ordem: [3, 4, 4, 4, 4] })],
      [0.1, `__acao.evento('tier-up', { tier: 4 })`]
    ] },

  // 7. A festa inteira de noite, larga, para o fundo da placa do título (com a Mandioca dos drones ainda no céu).
  'steam-final': noiteSteam('estagio-5', { zoom: 1.1, lift: 60 }, { segundos: 7,
    acoes: [[0, provocar('drones', { idade: 9000, ordem: [4, 4, 4, 4, 4] })]] })
});

// Peças para outros roteiros (fotos da loja da Steam em fotos.js). Não enumerável: gravar.js grava só as cenas.
Object.defineProperty(module.exports, 'pecas', { enumerable: false, value: { save, NOITE, SEM_PLACA, MESA, MIRA, TEXTO } });
