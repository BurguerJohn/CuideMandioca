// A segunda leva de eventos avulsos do mundo (no mesmo formato de src/festa-mundo-extras.js: `TARGETS`, `SKY`, `OVER`, `TRACE`, `catchFx`, `hitFx`, `reset`, `probe`,
// `DRAW`): chuva de chapéus, pelada de futebol, toupeiras nos buracos, coelho da cartola, aurora, a vaca que pulou a lua, a Esquadrilha da Fumaça e um tornado de
// tubarões. Cada um se mexe de um jeito (cair rodando, quicar e entrar no gol, surgir e sumir do buraco, saltar da cartola, flutuar entre cortinas de luz, voar em
// arco, riscar o céu com fumaça colorida, girar em volta de um funil). Só retângulos; os alvos saem do tempo do evento.
(function (root) {
  'use strict';

  const Formas = typeof module === 'object' && module.exports ? require('./festa-mundo-formas.js') : root.ArraiaMundoFormas;
  const TAU = Math.PI * 2;
  const R = Math.round;
  // Os chapéus que caíram e ninguém pegou ficam no chão por uns minutos.
  const TRACE_MS = { chapeus: 80000 };

  function create(h) {
    const { g, halo, say, float, confetti, sound, rng, fx, layout, ground, poleTop, tint, particle, rnd, clamp, spread, step, tr } = h;
    const { rect, mirror, disc, ellipse, tri, bit, skyBottom, dodge } = Formas.shapes(g, poleTop);
    let ambientAt = 0;
    let ambientKey = '';
    let sprinkleAt = 0;
    const fired = new Set();   // as cartolas que já soltaram o coelho (`<nascimento>:<alvo>`)
    const hitAt = new Map();   // quando a bola levou o último chute
    let goal = null;           // o chute final da pelada: { born, x, y, side }

    const every = (c, now, ms, first = ms) => {
      const key = `${c.id}:${c.a.born}`;
      if (key !== ambientKey) { ambientKey = key; ambientAt = now + first; }
      if (now < ambientAt) return false;
      ambientAt = now + ms * (0.8 + rng() * 0.4);
      return true;
    };
    const sprinkle = (now, ms, make) => { if (now - sprinkleAt > ms && fx().particles.length < 400) { sprinkleAt = now; make(); } };

    // --- Os bichos e as coisas ---------------------------------------------------------------------------------------------------------
    // Os oito chapéus (um para cada alvo): cartola, sombreiro, chapéu de festa, de pirata, de cozinheiro, capacete, boina e coroa.
    function hat(x, y, k, wob = 0) {
      const cx = x + wob;
      switch (k % 8) {
        case 0:
          rect(cx - 3, y - 6, 7, 7, '#26242e');
          rect(cx - 5, y + 1, 11, 2, '#26242e');
          rect(cx - 3, y - 1, 7, 1, '#ee2f3c');
          rect(cx - 2, y - 5, 1, 3, '#4a4a58');
          break;
        case 1:
          ellipse(cx, y + 1, 8, 2, '#e8c060');
          ellipse(cx, y - 2, 3, 3, '#d8a840');
          rect(cx - 3, y - 1, 7, 1, '#ee2f3c');
          bit(cx - 6, y + 1, '#c89a30');
          break;
        case 2:
          tri(cx, y - 8, cx - 4, y + 3, cx + 4, y + 3, '#ff4f9e');
          rect(cx - 2, y - 3, 5, 1, '#ffd21e');
          rect(cx - 3, y, 7, 1, '#ffd21e');
          disc(cx, y - 8, 1, '#ffffff');
          break;
        case 3:
          ellipse(cx, y, 7, 3, '#1a1226');
          tri(cx - 7, y, cx - 4, y - 4, cx - 2, y, '#1a1226');
          tri(cx + 7, y, cx + 4, y - 4, cx + 2, y, '#1a1226');
          rect(cx - 1, y - 1, 2, 2, '#fffaf0');
          bit(cx, y - 1, '#1a1226');
          break;
        case 4:
          ellipse(cx, y - 3, 5, 4, '#ffffff');
          rect(cx - 4, y - 1, 9, 5, '#ffffff');
          rect(cx - 4, y + 3, 9, 1, '#d8d8e0');
          rect(cx - 1, y - 3, 1, 4, '#e8e8f0');
          break;
        case 5:
          ellipse(cx, y - 1, 5, 4, '#ffd21e');
          rect(cx - 7, y + 1, 15, 2, '#e8a812');
          rect(cx - 1, y - 5, 3, 2, '#ffe27a');
          break;
        case 6:
          ellipse(cx + 1, y, 7, 3, '#ee2f3c');
          rect(cx - 1, y - 4, 2, 2, '#9a1a2e');
          rect(cx - 5, y - 1, 3, 1, '#ff7a7a');
          break;
        default:
          rect(cx - 5, y - 2, 11, 5, '#ffd21e');
          for (const dx of [-5, -1, 3]) tri(cx + dx, y - 2, cx + dx + 2, y - 6, cx + dx + 4, y - 2, '#ffd21e');
          rect(cx - 5, y + 2, 11, 1, '#c89a12');
          bit(cx - 2, y, '#ee2f3c');
          bit(cx + 2, y, '#3a78d8');
          bit(cx, y - 5, '#ffffff');
      }
    }
    // A bola de futebol: branca com os gomos pretos e uma sombra no chão (`air` é a altura).
    function ball(x, y, now, air) {
      g.globalAlpha = 0.3;
      ellipse(x, ground() - 1, Math.max(2, 5 - air * 0.08), 1, '#000000');
      g.globalAlpha = 1;
      disc(x, y, 5, '#26242e');
      disc(x, y, 4, '#ffffff');
      const spin = Math.floor(now / 90) % 3;
      rect(x - 1, y - 1, 3, 3, '#26242e');
      rect(x - 4 + spin, y - 2, 2, 2, '#26242e');
      rect(x + 3 - spin, y + 1, 2, 2, '#26242e');
      rect(x - 1, y + 3, 2, 1, '#26242e');
      bit(x - 2, y - 3, '#ffffff');
    }
    // O gol: as duas traves e o travessão brancos com a rede (que balança quando entra bola, `ripple` de 0 a 1).
    function goalFrame(x, side, ripple, now) {
      const top = ground() - 22;
      const px = side > 0 ? x - 16 : x;
      g.globalAlpha = 0.4;
      for (let i = 0; i < 16; i += 3) rect(px + i + R(Math.sin(now / 40 + i) * ripple * 2), top, 1, 22, '#e8f0f8');
      for (let j = 0; j < 22; j += 3) rect(px, top + j, 16, 1, '#e8f0f8');
      g.globalAlpha = 1;
      rect(side > 0 ? x : x - 1, top, 2, 22, '#ffffff');
      rect(px, top, 16, 2, '#ffffff');
    }
    // A toupeira de capacete: focinho rosa, olhinhos, garras. Sobe do buraco (`rise` de 0 a 1) e some no monte.
    function mole(x, y, rise, now, k) {
      const hy = y - R(8 * rise);
      const wig = Math.floor(now / 140 + k) % 2;
      ellipse(x, hy + 4, 5, 6, '#8a5a34');
      ellipse(x, hy, 5, 4, '#a06a3c');
      rect(x - 1, hy + 1, 3, 2, '#ff8ac8');
      rect(x - 3, hy - 1, 1, 1, '#26242e');
      rect(x + 3, hy - 1, 1, 1, '#26242e');
      // O capacete amarelo com a lâmpada.
      ellipse(x, hy - 3, 5, 3, '#ffd21e');
      rect(x - 6, hy - 2, 13, 1, '#e8a812');
      rect(x - 1, hy - 6, 3, 1, '#fff7b0');
      halo(x, hy - 4, 8, '#fff7b0', 0.25);
      // As garras de fora do buraco.
      if (rise > 0.6) { rect(x - 6, hy + 5 - wig, 3, 2, '#ffd8b0'); rect(x + 4, hy + 5 - (1 - wig), 3, 2, '#ffd8b0'); }
    }
    // O monte de terra e o buraco (`front` é a beirada da frente, que esconde a parte de baixo da toupeira).
    function mound(x, front) {
      if (!front) { ellipse(x, ground() - 1, 10, 3, '#3a2616'); return; }
      rect(x - 10, ground() - 1, 21, 3, '#6a4a2a');
      ellipse(x, ground() + 1, 10, 2, '#7a5a34');
      rect(x - 8, ground() - 1, 5, 1, '#8a6a44');
      bit(x + 6, ground(), '#4a3220');
    }
    // A cartola gigante do mágico, com a fita estrelada e um brilho; solta uma fumacinha de estrelas a cada coelho.
    function magicHat(x, y, now) {
      halo(x, y - 8, 20, '#c88aff', 0.3 + 0.1 * Math.sin(now / 200));
      rect(x - 8, y - 18, 16, 16, '#26242e');
      rect(x - 8, y - 18, 16, 2, '#3a3a4a');
      rect(x - 8, y - 6, 16, 3, '#8a4ad8');
      for (const dx of [-5, 0, 5]) bit(x + dx, y - 5, '#ffe27a');
      rect(x - 13, y - 2, 26, 3, '#26242e');
      rect(x - 13, y + 1, 26, 1, '#1a1a24');
      ellipse(x, y - 18, 8, 2, '#4a4a5a');
    }
    // O coelho: corpo branco, orelhas compridas rosadas, rabinho de algodão; pulando (`air` > 0) estica as pernas.
    function rabbit(x, y, d, air) {
      const put = mirror(x, y, d);
      put(-4, -2, 8, 5, '#ffffff');
      put(-6, -1, 3, 3, '#ffffff');
      put(2, -6, 4, 4, '#ffffff');
      put(3, -12, 2, 7, '#ffffff');
      put(5, -11, 2, 6, '#ffffff');
      put(4, -11, 1, 4, '#ff9ac8');
      put(6, -4, 1, 1, '#26242e');
      put(7, -3, 1, 1, '#ff8ac8');
      put(-4, 3, air > 0 ? 3 : 2, 2, '#e8e8f0');
      put(1, 3, air > 0 ? 4 : 2, 2, '#e8e8f0');
      put(-7, -1, 2, 2, '#fff8e8');
    }
    // As cortinas da aurora: colunas de luz que ondulam no céu (verde, azul-esverdeado e roxo), mais claras na barra de baixo.
    const AURORA = ['#5aff9a', '#4af0e8', '#b08aff'];
    function aurora(c, now, lay) {
      const bottomMax = Math.max(18, skyBottom() - 2);
      for (let x = lay.L; x < lay.R; x += 2) {
        const hem = 10 + (bottomMax - 10) * (0.5 + 0.5 * Math.sin(x * 0.045 + now / 1100)) + 3 * Math.sin(x * 0.12 - now / 700);
        const color = AURORA[Math.floor(x * 0.018 + now / 5000) % 3];
        g.fillStyle = color;
        g.globalAlpha = 0.1 * c.k;
        g.fillRect(x, 0, 2, R(hem));
        g.globalAlpha = 0.2 * c.k;
        g.fillRect(x, R(hem) - 8, 2, 6);
        g.globalAlpha = 0.38 * c.k;
        g.fillRect(x, R(hem) - 3, 2, 3);
      }
      g.globalAlpha = 1;
    }
    // O espírito da aurora: uma gotinha de luz com cauda comprida e brilho, verde-água.
    function wisp(x, y, now, k) {
      halo(x, y, 14, '#7affd8', 0.45);
      for (let i = 1; i <= 7; i++) {
        g.globalAlpha = 0.6 - i * 0.07;
        disc(x - i * 2, y + Math.sin(now / 200 + i * 0.7 + k) * 2, Math.max(1, 3 - R(i / 3)), i % 2 ? '#7affd8' : '#b08aff');
      }
      g.globalAlpha = 1;
      disc(x, y, 3, '#e8fff8');
      bit(x - 1, y - 1, '#ffffff');
    }
    // A vaca: manchas pretas, chifres, focinho rosa, as quatro pernas esticadas no pulo e o rabinho para cima.
    function cow(x, y, d, now) {
      const put = mirror(x, y, d);
      const kick = Math.floor(now / 120) % 2;
      put(-8, -3, 14, 7, '#fffaf0');
      put(-6, -2, 4, 3, '#26242e');
      put(0, 0, 4, 3, '#26242e');
      put(5, -6, 6, 6, '#fffaf0');
      put(6, -8, 1, 2, '#e8d8a8');
      put(10, -8, 1, 2, '#e8d8a8');
      put(9, -4, 3, 3, '#ff9ab0');
      put(7, -5, 1, 1, '#26242e');
      put(5, -6, 2, 3, '#26242e');
      put(-12, -5, 2, 6, '#fffaf0');
      put(-13, -6, 2, 2, '#26242e');
      put(-9 - kick, 4, 3, 2, '#fffaf0');
      put(-4, 4 + kick, 3, 2, '#fffaf0');
      put(2, 4, 3, 2 + kick, '#fffaf0');
      put(8 + kick, 3, 3, 2, '#fffaf0');
      put(-1, 4, 2, 2, '#26242e');
    }
    // O prato e a colher que fogem juntos pelo chão (de brincadeira): o prato tem carinha e a colher, pernas.
    function dish(x, y, now) {
      const step = Math.floor(now / 100) % 2;
      disc(x, y - 4, 4, '#f4f8ff');
      disc(x, y - 4, 2, '#cfe0ff');
      rect(x - 2, y - 5, 1, 1, '#26242e');
      rect(x + 1, y - 5, 1, 1, '#26242e');
      rect(x - 1, y - 3, 2, 1, '#26242e');
      rect(x - 2 + step, y, 1, 2, '#9a9ca8');
      rect(x + 1 - step, y, 1, 2, '#9a9ca8');
    }
    function spoon(x, y, now) {
      const step = Math.floor(now / 100) % 2;
      ellipse(x, y - 8, 2, 3, '#cfd4e0');
      rect(x, y - 5, 1, 6, '#b0b6c4');
      rect(x - 1 + step, y + 1, 1, 2, '#9a9ca8');
      rect(x + 1 - step, y + 1, 1, 2, '#9a9ca8');
    }
    // O jatinho da Esquadrilha da Fumaça, olhando para onde voa (`d`): fuselagem branca, asas e leme na cor da fumaça dele e a cabine azul.
    function jet(x, y, d, color) {
      const put = mirror(x, y, d);
      put(-6, -1, 13, 3, '#f4f8ff');
      put(7, 0, 2, 1, '#f4f8ff');
      put(2, -2, 3, 1, '#9ad0ff');
      tri(x - d * 2, y + 1, x - d * 7, y + 6, x + d * 1, y + 1, color);
      tri(x - d * 2, y - 1, x - d * 7, y - 5, x + d * 1, y - 1, color);
      put(-7, -4, 2, 3, color);
      put(-6, 2, 1, 1, '#ff9a3a');
      bit(x - d * 8, y, '#ffe27a');
    }
    // O tubarão de pelúcia girando no vento: corpo azul-acinzentado, barriga clara, nadadeira, rabo, olho e um sorriso cheio de dentes.
    function shark(x, y, d, now, k) {
      const put = mirror(x, y, d);
      const tail = Math.floor(now / 110 + k) % 2;
      ellipse(x, y, 9, 4, '#1e2a44');
      tri(x - d * 7, y, x - d * 12, y - 6 + tail * 2, x - d * 12, y + 5 - tail * 2, '#1e2a44');
      tri(x - d * 1, y - 3, x - d * 6, y - 3, x - d * 3, y - 9, '#1e2a44');
      ellipse(x, y, 8, 3, '#5a78a8');
      put(-6, 1, 12, 2, '#f4f8ff');
      tri(x - d * 1, y - 3, x - d * 5, y - 3, x - d * 3, y - 8, '#4a6490');
      tri(x - d * 7, y, x - d * 11, y - 5 + tail * 2, x - d * 11, y + 4 - tail * 2, '#4a6490');
      put(4, -1, 1, 1, '#26242e');
      put(5, 2, 1, 1, '#ffffff');
      put(3, 2, 1, 1, '#ffffff');
      put(7, 0, 1, 1, '#ff8ac8');
    }
    // O funil do tornado: faixas que ondulam, mais largas no alto, com redemoinhos mais claros girando e detritos.
    function funnel(cx, topY, bottomY, now, k) {
      const span = bottomY - topY;
      for (let y = topY; y <= bottomY; y += 2) {
        const f = (y - topY) / span;
        const half = 4 + R(26 * (1 - f) ** 1.2);
        const sway = Math.sin(y * 0.16 + now / 160) * 4 * (1 - f) + Math.sin(now / 700) * 3 * f;
        g.globalAlpha = 0.66 * k;
        g.fillStyle = Math.floor((y + now / 40) / 5) % 2 ? '#4a5262' : '#6a7484';
        g.fillRect(R(cx + sway - half), y, half * 2 + 1, 2);
      }
      g.globalAlpha = 1;
    }

    // --- Onde ficam os alvos ---------------------------------------------------------------------------------------------------------
    const moundX = (c, m, lay) => dodge(lay.L + lay.width * (0.12 + 0.19 * m), lay, 18, 24);
    const moleAt = (c, k, lay) => ({ x: moundX(c, (k * 3 + 1) % 5, lay), t0: 1800 + k * step(c, 1800, 6500) });
    const magicAt = (c, lay) => ({ x: lay.L + lay.width * (0.3 + 0.4 * rnd(c.seed, 1)), y: ground() - 4 });
    const moonAt = (c, lay) => ({ x: lay.L + lay.width * 0.62, y: Math.max(32, R(poleTop() * 0.62)) });
    const funnelAt = (c, lay) => lay.L + lay.width * (0.5 + 0.28 * Math.sin(c.t / 6500 + rnd(c.seed, 1) * TAU));
    const goalAt = (c, lay) => (c.dir > 0 ? lay.R - 6 : lay.L + 6);
    const JET_COLORS = ['#35a03a', '#ffd21e', '#3a78d8'];
    const jetPos = (c, k, lay, t) => {
      const life = 16000;
      const from = 2000 + k * step(c, 2000, life + 500);
      const p = (t - from) / life;
      if (p < 0 || p >= 1) return null;
      const lane = k % 3;
      const x0 = c.dir > 0 ? lay.L - 14 : lay.R + 14;
      return { x: x0 + c.dir * (lay.width + 28) * p, y: 12 + lane * 8 + Math.sin(p * TAU * 2 + k) * 7, p };
    };

    const TARGETS = {
      // Chapéus: caem do céu sacudindo de um lado ao outro, cada um de um tipo.
      chapeus(c, k, lay) {
        const p = spread(c, k, 1800, step(c, 1800, 8000), 5600);
        if (p < 0) return null;
        return { x: lay.L + 14 + rnd(c.seed, k) * (lay.width - 28) + Math.sin(p * 7 + k) * 6, y: 2 + p * (ground() - 16), w: 17, h: 13, p, wob: Math.sin(p * 18 + k) * 2 };
      },
      // A bola: um alvo só, que passeia pela festa quicando (e quica mais alto a cada chute).
      pelada(c, k, lay) {
        if (c.t < 800) return null;
        const hits = (c.a.hits && c.a.hits[0]) || 0;
        const air = Math.abs(Math.sin(c.t / 430)) * (12 + hits * 5);
        return { x: lay.L + lay.width * (0.45 + 0.35 * Math.sin(c.t / 2600)), y: ground() - 8 - air, w: 17, h: 17, p: 0, air, hits };
      },
      // Toupeiras: sobem de um dos cinco buracos e voltam a se esconder; só dá para acertar quando já estão quase todas fora.
      toupeiras(c, k, lay) {
        const at = moleAt(c, k, lay);
        const p = (c.t - at.t0) / 3600;
        if (p < 0 || p >= 1) return null;
        const rise = p < 0.18 ? p / 0.18 : p > 0.82 ? (1 - p) / 0.18 : 1;
        if (rise < 0.5) return null;
        return { x: at.x, y: ground() - 6 - R(8 * rise), w: 15, h: 15, p, rise };
      },
      // Coelhos: cada um sai da cartola numa hora e pula para longe em saltinhos, para um lado e para o outro.
      coelho(c, k, lay) {
        const hatPos = magicAt(c, lay);
        const t0 = 2200 + k * step(c, 2200, 9000);
        const p = (c.t - t0) / 6500;
        if (p < 0 || p >= 1) return null;
        const side = k % 2 ? 1 : -1;
        const reach = lay.width * 0.3 + 40 * rnd(c.seed, k, 2);
        const emerge = p < 0.1 ? (1 - p / 0.1) * 14 : 0;
        return { x: hatPos.x + side * (6 + p * reach), y: hatPos.y - 8 - Math.abs(Math.sin(p * 4 * Math.PI)) * (12 + 6 * rnd(c.seed, k, 3)) - emerge, w: 15, h: 17, p, side };
      },
      // Espíritos da aurora: flutuam de um lado ao outro do céu, dois de cada vez no ar, ondulando.
      aurora(c, k, lay) {
        const p = spread(c, k, 2500, step(c, 2500, 11000), 11000);
        if (p < 0) return null;
        const dir = (k % 2 ? -1 : 1) * c.dir;
        const x = (dir > 0 ? lay.L + 10 : lay.R - 10) + dir * (lay.width - 20) * p;
        return { x, y: 10 + Math.max(6, skyBottom() - 16) * (0.5 + 0.5 * Math.sin(p * 5 + k)), w: 17, h: 17, p, dir };
      },
      // A vaca: pula por cima da lua de um lado ao outro, uma vez a cada tantos segundos, num arco bem alto.
      vacalua(c, k, lay) {
        const t0 = 2500 + k * step(c, 2500, 9000);
        const p = (c.t - t0) / 5200;
        if (p < 0 || p >= 1) return null;
        const moon = moonAt(c, lay);
        const dir = k % 2 ? -1 : 1;
        const y0 = ground() - 26;
        return { x: moon.x - dir * 74 + dir * 148 * p, y: y0 + (moon.y - 16 - y0) * 4 * p * (1 - p), w: 25, h: 17, p, dir };
      },
      // Jatinhos: cada um cruza o céu em S, um depois do outro, na sua faixa de altura.
      fumaca(c, k, lay) {
        const pos = jetPos(c, k, lay, c.t);
        return pos ? { x: pos.x, y: pos.y, w: 19, h: 13, p: pos.p } : null;
      },
      // Tubarões: giram em volta do funil, cada um numa altura e numa velocidade (mais abertos lá em cima), passando pela frente e por trás.
      tubaroes(c, k, lay) {
        const cx = funnelAt(c, lay);
        const f = 0.12 + 0.76 * ((k * 0.37) % 1);
        const a = c.t / (1300 + k * 170) + k * TAU / c.n;
        const radius = 10 + 30 * (1 - f);
        return { x: cx + Math.cos(a) * radius, y: ground() - 8 - f * (ground() - 26), w: 23, h: 13, p: 0, front: Math.sin(a) > 0, d: -Math.sin(a) >= 0 ? 1 : -1 };
      }
    };

    // --- O céu (atrás da festa) ------------------------------------------------------------------------------------------------------
    const SKY = {
      aurora(c, now) { aurora(c, now, layout()); },
      // A lua enorme e redonda, com um halo, atrás da festa.
      vacalua(c, now) {
        const lay = layout();
        const moon = moonAt(c, lay);
        halo(moon.x, moon.y, 36, '#fff4c0', 0.35 * c.k);
        g.globalAlpha = c.k;
        disc(moon.x, moon.y, 11, '#fff0b8');
        disc(moon.x + 1, moon.y - 1, 9, '#fffae0');
        rect(moon.x - 5, moon.y - 4, 3, 2, '#e8d8a0');
        rect(moon.x + 2, moon.y + 2, 4, 3, '#e8d8a0');
        rect(moon.x - 3, moon.y + 5, 2, 2, '#e8d8a0');
        g.globalAlpha = 1;
      }
    };

    // --- O ar e os bichos (por cima da festa) ---------------------------------------------------------------------------------------------
    const OVER = {
      chapeus(c, now) {
        const lay = layout();
        tint('#ffe8c0', 0.04 * c.k);
        for (const item of c.items) hat(item.x, item.y, item.k, item.wob);
        if (every(c, now, 6000, 3000)) say(tr('fx.chapeuChoveu'), lay.L + 30 + rng() * (lay.width - 60), 14, now, '#ffe27a', 900, 5);
      },
      pelada(c, now) {
        const lay = layout();
        const side = c.dir > 0 ? 1 : -1;
        const gx = goalAt(c, lay);
        const sinceGoal = goal ? now - goal.born : -1;
        goalFrame(gx, side, sinceGoal >= 0 && sinceGoal < 1200 ? 1 - sinceGoal / 1200 : 0, now);
        for (const item of c.items) {
          const since = now - (hitAt.get(0) ?? -1e9);
          ball(item.x, item.y - (since < 300 ? Math.sin(since / 300 * Math.PI) * 8 : 0), now, item.air);
        }
        // O chute final: a bola voa até o gol, a rede balança e sai a festa.
        if (goal && sinceGoal >= 0 && sinceGoal < 1500) {
          const q = clamp(sinceGoal / 700, 0, 1);
          ball(goal.x + (gx - side * 8 - goal.x) * q, goal.y + (ground() - 12 - goal.y) * q - Math.sin(q * Math.PI) * 18, now, 0);
        }
      },
      toupeiras(c, now) {
        const lay = layout();
        tint('#d8c090', 0.04 * c.k);
        for (let m = 0; m < 5; m++) mound(moundX(c, m, lay), false);
        // As toupeiras primeiro (a beirada da frente cobre a parte de baixo delas).
        for (const item of c.items) mole(item.x, ground() - 4, item.rise, now, item.k);
        for (let m = 0; m < 5; m++) mound(moundX(c, m, lay), true);
        if (every(c, now, 5500, 3000) && sound) sound('estalo');
      },
      coelho(c, now) {
        const lay = layout();
        tint('#1a0a2a', 0.1 * c.k);
        const hatPos = magicAt(c, lay);
        magicHat(hatPos.x, hatPos.y, now);
        // A cada coelho que sai, uma nuvem de estrelas da cartola (uma vez só).
        for (let k = 0; k < c.n; k++) {
          const t0 = 2200 + k * step(c, 2200, 9000);
          const key = `${c.a.born}:${k}`;
          if (c.t >= t0 && c.t < t0 + 1500 && !fired.has(key)) {
            fired.add(key);
            for (let i = 0; i < 10; i++) particle({ x: hatPos.x + (rng() - 0.5) * 12, y: hatPos.y - 16, vx: (rng() - 0.5) * 0.04, vy: -0.02 - rng() * 0.03, gravity: 0.00004, born: now, ttl: 900, colors: ['#ffe27a', '#c88aff', '#ffffff'], twinkle: true });
            if (sound) sound('brilho');
          }
        }
        for (const item of c.items) rabbit(item.x, item.y, item.side, Math.sin(item.p * 4 * Math.PI) > 0.1 ? 1 : 0);
      },
      aurora(c, now) {
        const lay = layout();
        tint('#0a2a3a', 0.1 * c.k);
        for (const item of c.items) wisp(item.x, item.y, now, item.k);
        sprinkle(now, 140, () => particle({ x: lay.L + rng() * lay.width, y: rng() * Math.max(10, skyBottom()), vx: 0, vy: 0, born: now, ttl: 800, colors: ['#ffffff', '#bfffe8'], twinkle: true }));
        if (every(c, now, 8000, 4000) && sound) sound('brilho');
      },
      vacalua(c, now) {
        const lay = layout();
        tint('#1c2872', 0.1 * c.k);
        // O prato e a colher fogem juntos pelo chão, de um lado ao outro.
        const run = ((now / 7000 + rnd(c.seed, 3)) % 1);
        const rx = c.dir > 0 ? lay.L + (lay.width + 40) * run - 20 : lay.R - (lay.width + 40) * run + 20;
        if (c.k > 0.5) { dish(rx, ground() - 2, now); spoon(rx - c.dir * 9, ground() - 2, now); }
        for (const item of c.items) cow(item.x, item.y, item.dir, now);
        if (every(c, now, 7000, 4000) && sound) sound('boi');
      },
      fumaca(c, now) {
        const lay = layout();
        tint('#cfe8ff', 0.04 * c.k);
        for (let k = 0; k < c.n; k++) {
          const color = JET_COLORS[k % 3];
          // A fumaça é o caminho do jato nos últimos instantes (calculado da posição, sem guardar nada).
          for (let i = 1; i <= 45; i++) {
            const prev = jetPos(c, k, lay, c.t - i * 70);
            if (!prev) break;
            g.globalAlpha = 0.85 * (1 - i / 48);
            g.fillStyle = i < 5 ? '#ffffff' : color;
            const s = i < 15 ? 2 : 1;
            g.fillRect(R(prev.x - c.dir * 7), R(prev.y), s, s);
          }
          g.globalAlpha = 1;
        }
        for (const item of c.items) jet(item.x, item.y, c.dir, JET_COLORS[item.k % 3]);
      },
      tubaroes(c, now) {
        const lay = layout();
        tint('#3a4458', 0.14 * c.k);
        const cx = funnelAt(c, lay);
        for (const item of c.items) if (!item.front) shark(item.x, item.y, item.d, now, item.k);
        funnel(cx, 2, ground() - 2, now, c.k);
        for (const item of c.items) if (item.front) shark(item.x, item.y, item.d, now, item.k);
        // Detritos girando: pedacinhos escuros e folhas.
        for (let i = 0; i < 16; i++) {
          const f = (i * 0.0625 + (now / 4000 + rnd(c.seed, i)) % 1) % 1;
          const a = now / (500 + i * 40) + i * 2;
          bit(cx + Math.cos(a) * (6 + 24 * (1 - f)), ground() - 4 - f * (ground() - 10), i % 3 ? '#3a3a44' : '#56c860', 0.8);
        }
        if (every(c, now, 6000, 2500) && sound) sound('assobio');
      }
    };

    // --- Vestígios no chão ---------------------------------------------------------------------------------------------------------
    const TRACE = {
      // Os chapéus que ninguém pegou, jogados no chão.
      chapeus(left, at, now, lay, seed) {
        for (let i = 0; i < 8; i++) hat(R(lay.L + 14 + rnd(seed, i) * (lay.width - 28)), ground() + 1 + (i % 2), i, 0);
      }
    };

    // --- Reações ---------------------------------------------------------------------------------------------------------------------
    function catchFx(c, event, x, y, now) {
      if (!c) return;
      const lay = layout();
      const spot = clamp(x, lay.L + 18, lay.R - 18);
      if (c.id === 'chapeus') {
        for (let i = 0; i < 6; i++) float('brilho', x + (i - 2.5) * 4, y - i * 2, now, ['#ffd21e', '#ff4f9e']);
        if (sound) sound('equipar');
      } else if (c.id === 'pelada') {
        // O gol: a bola voa até a rede, o estádio vibra e chove confete.
        goal = { born: now, x, y, side: c.dir > 0 ? 1 : -1 };
        confetti(now, goalAt(c, lay), ground() - 20, 70);
        say(tr('fx.peladaGol'), clamp(goalAt(c, lay), lay.L + 30, lay.R - 30), Math.max(14, ground() - 52), now, '#ffe27a', 1800, 8);
        if (sound) sound('yeah');
      } else if (c.id === 'toupeiras') {
        for (let i = 0; i < 8; i++) particle({ x, y: ground() - 3, vx: (rng() - 0.5) * 0.05, vy: -0.015 - rng() * 0.025, gravity: 0.00006, born: now, ttl: 600, colors: ['#6a4a2a', '#8a6a44'] });
        say(tr('fx.toupeiraAi'), spot, y - 14, now, '#ffd8b0', 800, 5);
        if (sound) sound('tombo');
      } else if (c.id === 'coelho') {
        for (let i = 0; i < 8; i++) particle({ x, y, vx: (rng() - 0.5) * 0.04, vy: -0.01 - rng() * 0.02, gravity: 0.00003, born: now, ttl: 800, colors: ['#ffffff', '#ff9ac8', '#ffe27a'], twinkle: true });
        say(tr('fx.coelhoTcharam'), spot, y - 16, now, '#c88aff', 900, 5);
        if (sound) sound('acerto');
      } else if (c.id === 'aurora') {
        for (let i = 0; i < 12; i++) particle({ x, y, vx: (rng() - 0.5) * 0.05, vy: (rng() - 0.5) * 0.04, born: now, ttl: 1000, colors: ['#7affd8', '#b08aff', '#ffffff'], twinkle: true });
        if (sound) sound('brilho');
      } else if (c.id === 'vacalua') {
        confetti(now, x, y, 26);
        say(tr('fx.vacaMuu'), spot, Math.max(12, y - 16), now, '#fffaf0', 1000, 5);
        if (sound) sound('boi');
      } else if (c.id === 'fumaca') {
        const color = JET_COLORS[event.k % 3];
        for (let i = 0; i < 14; i++) particle({ x, y, vx: (rng() - 0.5) * 0.08, vy: (rng() - 0.5) * 0.06, born: now, ttl: 900, colors: ['#ffffff', color], twinkle: true });
        if (sound) sound('assobio');
      } else if (c.id === 'tubaroes') {
        for (let i = 0; i < 10; i++) particle({ x, y, vx: (rng() - 0.5) * 0.06, vy: -0.01 - rng() * 0.02, gravity: 0.00004, born: now, ttl: 800, colors: ['#9ad0ff', '#ffffff'], drop: true });
        say(tr('fx.tubaraoNham'), spot, Math.max(12, y - 14), now, '#9ad0ff', 800, 5);
        if (sound) sound('bolha');
      }
    }
    // Um chute na bola (a pelada): ela salta mais alto, solta uns pedacinhos de grama e o estalo do chute. Devolve true se tratou.
    function hitFx(c, event, x, y, now) {
      if (!c || c.id !== 'pelada') return false;
      hitAt.set(0, now);
      for (let i = 0; i < 6; i++) particle({ x, y: ground() - 2, vx: (rng() - 0.5) * 0.05, vy: -0.015 - rng() * 0.02, gravity: 0.00006, born: now, ttl: 500, colors: ['#56c860', '#2e8a44'] });
      say(tr('fx.peladaChute'), clamp(x, layout().L + 20, layout().R - 20), Math.max(12, y - 14), now, '#ffffff', 600, 4);
      if (sound) sound('martelo');
      return true;
    }
    const shake = () => null;
    function reset() {
      hitAt.clear();
      fired.clear();
      goal = null;
      ambientKey = '';
      ambientAt = 0;
    }
    const probe = () => ({ fired: fired.size, hits: hitAt.size, goal: !!goal });
    const DRAW = { hat, ball, goalFrame, mole, mound, magicHat, rabbit, wisp, cow, dish, spoon, jet, shark, funnel };
    // Os pontos fixos de cada cena (para os testes): o funil, a lua, a cartola e o gol.
    const GEO = { funnelAt: c => funnelAt(c, layout()), moonAt: c => moonAt(c, layout()), magicAt: c => magicAt(c, layout()), goalAt: c => goalAt(c, layout()) };
    return { TARGETS, SKY, OVER, TRACE, DRAW, GEO, shake, catchFx, hitFx, reset, probe };
  }

  root.ArraiaMundoExtras2 = { create, TRACE_MS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
