// Os eventos avulsos do mundo na festa (o motor é src/mundo.js, os dados estão em `data.mundo.eventos`): dez eventos que não pedem roupa nem tema e nem
// precisam ser de São João, só de serem divertidos: bolhas de sabão gigantes, aviõezinhos de papel, enxame de abelhas, patinhos de borracha, planeta com
// luas, canhão do circo, balão gigante da Mandioca, balada com bola de espelhos, baleia voadora com cardume e uma fada desastrada. Cada um tem a sua
// maneira de se mexer (subir, planar, zigue-zaguear, desfilar, orbitar, voar em parábola, balançar, quicar no ritmo, seguir a baleia, teletransportar).
// Este arquivo traz só o que cada um tem de próprio, no mesmo formato de src/festa-mundo-temas.js: `TARGETS` (onde ficam os alvos, calculados do tempo do
// evento), `SKY` (atrás da festa), `OVER` (por cima), `TRACE`, `catchFx` (alvo pego), `hitFx` (golpe), `shake`, `reset` e `probe`. Só retângulos.
(function (root) {
  'use strict';

  const Formas = typeof module === 'object' && module.exports ? require('./festa-mundo-formas.js') : root.ArraiaMundoFormas;
  const TAU = Math.PI * 2;
  const R = Math.round;
  // Nenhum destes deixa vestígios no chão.
  const TRACE_MS = {};

  function create(h) {
    const { g, halo, say, float, confetti, sound, rng, fx, layout, ground, poleTop, tint, particle, rnd, clamp, spread, step, tr } = h;
    const { rect, mirror, disc, ellipse, tri, bit, skyBottom } = Formas.shapes(g, poleTop);
    let ambientAt = 0;        // a próxima fala ou som de ambiente
    let ambientKey = '';
    let sprinkleAt = 0;       // o último brilho de enfeite solto
    const fired = new Set();  // os tiros do canhão que já saíram (`<nascimento>:<alvo>`)
    const hitAt = new Map();  // quando cada alvo levou o último golpe (o balão balança, a fada some)
    let fairyHits = -1;       // quantos golpes a fada tinha no último quadro (para a purpurina da chegada)

    // Uma fala ou um som de ambiente de tempos em tempos, uma vez por evento (a chave é o nascimento dele).
    const every = (c, now, ms, first = ms) => {
      const key = `${c.id}:${c.a.born}`;
      if (key !== ambientKey) { ambientKey = key; ambientAt = now + first; }
      if (now < ambientAt) return false;
      ambientAt = now + ms * (0.8 + rng() * 0.4);
      return true;
    };
    const sprinkle = (now, ms, make) => { if (now - sprinkleAt > ms && fx().particles.length < 400) { sprinkleAt = now; make(); } };

    // --- Os bichos e as coisas ---------------------------------------------------------------------------------------------------------
    const BUBBLE_COLORS = ['#ff8ac8', '#8ac8ff', '#9affc8', '#ffe27a', '#c88aff'];
    // Bolha de sabão: um anel de cores que giram, vidro clarinho por dentro e dois brilhos.
    function bubble(x, y, r, now, k) {
      g.globalAlpha = 0.3;
      disc(x, y, r, '#e8f6ff');
      g.globalAlpha = 1;
      const spin = Math.floor(now / 170 + k);
      for (let i = 0; i < 36; i++) {
        const a = i / 36 * TAU;
        g.fillStyle = BUBBLE_COLORS[(i + spin) % BUBBLE_COLORS.length];
        g.fillRect(R(x + Math.cos(a) * r), R(y + Math.sin(a) * r), 2, 1);
        g.fillRect(R(x + Math.cos(a) * (r - 1)), R(y + Math.sin(a) * (r - 1)), 1, 2);
      }
      g.globalAlpha = 0.5;
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU + 0.4;
        g.fillStyle = '#ffffff';
        g.fillRect(R(x + Math.cos(a) * (r - 2)), R(y + Math.sin(a) * (r - 2)), 1, 1);
      }
      g.globalAlpha = 1;
      rect(x - r * 0.55, y - r * 0.6, 3, 1, '#ffffff');
      rect(x - r * 0.65, y - r * 0.5, 1, 3, '#ffffff');
      bit(x + r * 0.5, y + r * 0.55, '#ffffff', 0.8);
    }
    const PLANE_COLORS = ['#ee2f3c', '#3a78d8', '#35a03a', '#ff8a12', '#8a4ad8', '#ff4f9e'];
    // Aviãozinho de papel visto de lado, olhando para onde voa (`d`), com o nariz mais alto ou mais baixo (`tilt`) e a dobra colorida.
    function plane(x, y, d, k, tilt) {
      const nx = x + d * 9;
      const ny = y + tilt;
      tri(x - d * 8, y - 1, nx, ny, x - d * 5, y + 4, '#ffffff');
      tri(x - d * 8, y - 1, nx, ny, x - d * 4, y - 2, '#d8e4f0');
      tri(x - d * 5, y + 4, nx, ny, x - d * 3, y + 2, '#b8c6d8');
      const color = PLANE_COLORS[k % PLANE_COLORS.length];
      rect(d > 0 ? x - 8 : x + 7, y - 4, 2, 4, color);
      for (let i = 0; i < 4; i++) bit(x - d * (6 - i * 2), y, color);
    }
    // Abelha: corpo listrado, cabeça escura, asas batendo e ferrãozinho (`d` é para onde ela vai).
    function bee(x, y, d, now, k) {
      const up = Math.floor(now / 45 + k) % 2;
      g.globalAlpha = 0.8;
      rect(x - 2, y - 4 + up, 3, 2, '#ffffff');
      rect(x + 1, y - 4 + (1 - up), 3, 2, '#ffffff');
      g.globalAlpha = 1;
      ellipse(x, y, 3, 2, '#ffd21e');
      rect(x - 1, y - 2, 1, 5, '#26242e');
      rect(x + 1, y - 2, 1, 5, '#26242e');
      rect(d > 0 ? x + 3 : x - 4, y - 1, 2, 2, '#26242e');
      bit(d > 0 ? x - 4 : x + 4, y, '#26242e');
      halo(x, y, 6, '#fff07a', 0.18);
    }
    // Patinho de borracha: corpinho amarelo, bico laranja, asa e uma pose de quem desfila; o da frente (`role` 1) usa um chapéu de festa e o último (`role` 2) um laço.
    function duck(x, y, d, now, k, role) {
      const bob = Math.sin(now / 130 + k * 1.7) > 0 ? 1 : 0;
      const put = mirror(x, y - bob, d);
      put(-5, -1, 10, 5, '#ffd21e');
      put(-6, -2, 3, 3, '#ffd21e');
      put(-4, 3, 8, 1, '#e8a812');
      put(2, -6, 5, 5, '#ffd21e');
      put(7, -4, 3, 2, '#ff8a12');
      put(5, -5, 1, 1, '#26242e');
      put(-3, 0, 5, 3, '#f4b412');
      put(-1, 1, 3, 1, '#ffe27a');
      put(-3, 5, 2, 1, '#ff8a12');
      put(1, 5, 2, 1, '#ff8a12');
      if (role === 1) { tri(x + d * 3, y - bob - 11, x + d * 1, y - bob - 6, x + d * 6, y - bob - 6, '#ee2f3c'); put(3, -12, 1, 1, '#fff07a'); }
      if (role === 2) { put(1, -7, 3, 2, '#ff4f9e'); put(3, -8, 1, 1, '#ff4f9e'); }
    }
    // O planeta de anéis: faixas laranja, anel inclinado (a metade de trás antes do planeta e a da frente depois) e uma sombra do lado de lá.
    function planet(px, py, now, back) {
      const ring = (front) => {
        for (let i = 0; i < 70; i++) {
          const a = i / 70 * TAU;
          const isFront = Math.sin(a) > 0;
          if (isFront !== front) continue;
          g.fillStyle = '#e8d8a8';
          g.fillRect(R(px + Math.cos(a) * 18), R(py + Math.sin(a) * 4.2), 1, 1);
          g.fillStyle = '#b8986a';
          g.fillRect(R(px + Math.cos(a) * 15.5), R(py + Math.sin(a) * 3.6), 1, 1);
          g.fillStyle = '#d8c898';
          g.fillRect(R(px + Math.cos(a) * 16.8), R(py + Math.sin(a) * 3.9), 1, 1);
        }
      };
      if (back) { ring(false); return; }
      halo(px, py, 24, '#ffc87a', 0.18);
      disc(px, py, 9, '#e8a84a');
      for (let dy = -7; dy <= 7; dy += 2) {
        const half = R(Math.sqrt(81 - dy * dy));
        g.fillStyle = (dy / 2) % 2 === 0 ? '#c8782a' : '#f4c878';
        g.fillRect(px - half, py + dy, half * 2 + 1, 1);
      }
      g.globalAlpha = 0.28;
      ellipse(px + 4, py + 2, 6, 8, '#3a1a08');
      g.globalAlpha = 1;
      rect(px - 6, py - 6, 3, 1, '#fff0c0');
      ring(true);
    }
    const MOON_COLORS = ['#d8d8e0', '#8ac8ff', '#ff8a7a', '#9affc8', '#ffe27a'];
    function moon(x, y, k) {
      halo(x, y, 8, MOON_COLORS[k % MOON_COLORS.length], 0.35);
      disc(x, y, 3, MOON_COLORS[k % MOON_COLORS.length]);
      rect(x - 1, y - 2, 2, 1, '#ffffff');
      bit(x + 1, y + 1, '#8a8a98');
    }
    // O canhão do circo: cano listrado de vermelho e branco apontando para cima e para dentro da festa, roda de madeira e, logo depois de um tiro, o clarão da boca.
    function cannon(x, y, d, now, since) {
      for (let i = 0; i < 11; i++) rect(d > 0 ? x + 2 + i : x - 2 - i - 2, y - 3 - i * 0.8, 4, 4, i % 4 < 2 ? '#e0343e' : '#fffaf0');
      rect(d > 0 ? x + 12 : x - 14, y - 12, 5, 5, '#26242e');
      ellipse(x, y + 3, 7, 3, '#4a3220');
      disc(x - d, y + 3, 4, '#8a5a2a');
      disc(x - d, y + 3, 2, '#c89a5a');
      rect(x - d, y + 3, 1, 1, '#26242e');
      if (since >= 0 && since < 260) {
        const bx = x + d * 17;
        const by = y - 12;
        halo(bx, by, 16, '#ffd27a', 0.7 * (1 - since / 260));
        for (let i = 0; i < 8; i++) bit(bx + Math.cos(i * 0.8) * (3 + since / 30), by + Math.sin(i * 0.8) * (3 + since / 30), '#ffe27a');
      }
    }
    // O palhaço voando: cabeça com nariz vermelho e peruca de arco-íris, macacão listrado e os braços e pernas girando, de ponta-cabeça de vez em quando.
    function clown(x, y, now, k) {
      const frame = Math.floor(now / 100 + k) % 4;
      const f = frame >= 2 ? -1 : 1;
      const at = (dx, dy, w, hh, color) => rect(x + dx, y + dy * f - (f < 0 ? hh - 1 : 0), w, hh, color);
      at(-3, 3, 3, 3, '#3a4a9a');
      at(1, 3, 3, 3, '#3a4a9a');
      at(-3, 6, 3, 1, '#ee2f3c');
      at(1, 6, 3, 1, '#ee2f3c');
      at(-3, -3, 7, 6, '#ffd21e');
      at(-3, -1, 7, 1, '#ee2f3c');
      at(-3, 1, 7, 1, '#ee2f3c');
      if (frame % 2 === 0) { at(-6, -5, 1, 3, '#ffd21e'); at(5, -5, 1, 3, '#ffd21e'); } else { at(-7, -2, 3, 1, '#ffd21e'); at(5, -2, 3, 1, '#ffd21e'); }
      at(-2, -8, 5, 5, '#ffe0c0');
      at(0, -6, 1, 1, '#ee2f3c');
      at(-1, -7, 1, 1, '#26242e');
      at(1, -7, 1, 1, '#26242e');
      at(-4, -9, 2, 2, '#ee2f3c');
      at(-2, -10, 2, 2, '#ffd21e');
      at(0, -10, 2, 2, '#35a03a');
      at(2, -9, 2, 2, '#3a78d8');
    }
    // A rede de lona onde os palhaços caem, esticada em quatro pés.
    function net(x, y) {
      rect(x - 13, y + 1, 1, 5, '#8a5a2a');
      rect(x + 13, y + 1, 1, 5, '#8a5a2a');
      ellipse(x, y, 13, 2, '#fffaf0');
      ellipse(x, y, 13, 1, '#ee2f3c');
      g.fillStyle = '#26242e';
      for (let i = -10; i <= 10; i += 5) g.fillRect(x + i, y - 1, 1, 3);
    }
    // O balão gigante da Mandioca: raiz marrom inflada com a ponta de baixo, casca com listras, olhos grandes, sorriso, bochechas, folhas e chapéu de palha no alto
    // (`sc` encolhe o balão a cada golpe e `pale` clareia o couro por um instante). Cordinhas e um laço vermelho na ponta.
    function balloon(x, y, now, sc, pale) {
      const S = v => R(v * sc);
      const body = pale ? '#f0d8a8' : '#c89a5a';
      const shade = pale ? '#e0c088' : '#a87a42';
      halo(x, y, S(30), '#ffe8b0', 0.18);
      ellipse(x, y - S(6), S(15), S(17), shade);
      tri(x - S(14), y + S(4), x + S(14), y + S(4), x + S(1), y + S(26), shade);
      ellipse(x - S(2), y - S(7), S(13), S(15), body);
      tri(x - S(12), y + S(4), x + S(11), y + S(4), x, y + S(23), body);
      ellipse(x - S(6), y - S(12), S(5), S(6), pale ? '#fff0c8' : '#dcb878');
      g.fillStyle = '#9a6a30';
      for (const [dy, w] of [[-14, 8], [-6, 13], [2, 12], [10, 8]]) g.fillRect(x - S(w), y + S(dy), S(w) * 2, 1);
      // Folhas e chapéu.
      tri(x - S(2), y - S(22), x - S(13), y - S(32), x - S(5), y - S(20), '#3a9a44');
      tri(x + S(1), y - S(22), x + S(12), y - S(33), x + S(5), y - S(20), '#56c860');
      tri(x, y - S(22), x - S(1), y - S(35), x + S(3), y - S(21), '#2e8a44');
      ellipse(x, y - S(19), S(12), 2, '#e8c060');
      ellipse(x, y - S(21), S(6), S(3), '#c89a30');
      rect(x - S(6), y - S(20), S(12), 1, '#ee2f3c');
      // O rosto.
      ellipse(x - S(6), y - S(7), S(3), S(4), '#ffffff');
      ellipse(x + S(5), y - S(7), S(3), S(4), '#ffffff');
      rect(x - S(5), y - S(6), 2, S(3), '#26242e');
      rect(x + S(5), y - S(6), 2, S(3), '#26242e');
      rect(x - S(5), y - S(2), 1, 1, '#ff8ac8');
      g.globalAlpha = 0.7;
      ellipse(x - S(10), y - S(1), S(2), 1, '#ff8ac8');
      ellipse(x + S(9), y - S(1), S(2), 1, '#ff8ac8');
      g.globalAlpha = 1;
      rect(x - S(5), y + S(1), 1, 1, '#6a2a1a');
      rect(x - S(4), y + S(2), S(8), 1, '#6a2a1a');
      rect(x + S(4), y + S(1), 1, 1, '#6a2a1a');
      // O laço e as cordinhas.
      rect(x - 2, y + S(25), 5, 3, '#ee2f3c');
      g.globalAlpha = 0.7;
      for (let i = 0; i < 3; i++) rect(x - 4 + i * 4, y + S(28), 1, 7, '#f4f0e8');
      g.globalAlpha = 1;
    }
    // A bola de espelhos: pastilhas quadradas que giram (a luz escorre por elas) e o fio que a segura no alto.
    function discoBall(x, y, now) {
      rect(x, 0, 1, Math.max(0, y - 6), '#9a9aa8');
      halo(x, y, 22, '#ffffff', 0.25);
      disc(x, y, 6, '#7a849a');
      const shift = Math.floor(now / 140);
      for (let dy = -5; dy <= 5; dy++) {
        const half = R(Math.sqrt(36 - dy * dy));
        for (let dx = -half; dx <= half; dx += 2) {
          const light = ((dx + dy + shift) >> 1) & 1;
          g.fillStyle = light ? '#ffffff' : '#b8c4d8';
          g.fillRect(x + dx, y + dy, Math.min(2, half - dx + 1), 1);
        }
      }
      rect(x - 6, y - 1, 1, 1, '#ffffff');
    }
    // A baleia azul, de lado: corpo comprido, barriga clara, nadadeira, olho, sorriso e a cauda com as duas abas, que balançam.
    function whale(x, y, d, now) {
      const wag = Math.sin(now / 420) * 4;
      const put = mirror(x, y, d);
      tri(x - d * 20, y - 1, x - d * 32, y - 10 + wag, x - d * 27, y, '#3a68b8');
      tri(x - d * 20, y, x - d * 32, y + 8 + wag, x - d * 27, y + 1, '#3a68b8');
      tri(x - d * 22, y - 1, x - d * 20, y + 3, x - d * 27, y, '#3a68b8');
      ellipse(x, y, 22, 8, '#3a68b8');
      ellipse(x + d * 2, y + 4, 19, 4, '#c8d8f0');
      ellipse(x - d, y - 3, 17, 3, '#4a7ac8');
      tri(x + d * 3, y + 6, x - d * 4, y + 13, x - d * 8, y + 6, '#2e5498');
      put(14, -2, 2, 2, '#ffffff');
      put(15, -2, 1, 1, '#26242e');
      put(9, 2, 12, 1, '#26386a');
      put(19, 2, 1, 1, '#26386a');
      // Os pontinhos de água do esguicho.
      if (Math.floor(now / 900) % 2 === 0) {
        const bx = x + d * 11;
        for (let i = 1; i <= 5; i++) { bit(bx + d * (i % 2), y - 8 - i * 2, '#cfeaff', 1 - i * 0.14); bit(bx - d * (i % 3), y - 9 - i * 2, '#ffffff', 0.8 - i * 0.12); }
      }
    }
    // O peixinho do cardume: corpo prateado ou laranja, cauda que bate e um olho (`d` é para onde nada).
    function fish(x, y, d, now, k) {
      const put = mirror(x, y, d);
      const flip = Math.floor(now / 120 + k) % 2;
      const body = k % 2 ? '#ff9a3a' : '#cfd8e8';
      const dark = k % 2 ? '#d8661a' : '#8a98b0';
      put(-3, -1, 7, 3, body);
      put(-1, 2, 4, 1, dark);
      put(4, 0, 1, 1, body);
      tri(x - d * 3, y, x - d * 7, y - 3 + flip * 2, x - d * 7, y + 3 - flip * 2, dark);
      put(3, -1, 1, 1, '#26242e');
      put(-2, -2, 3, 1, dark);
      halo(x, y, 7, '#bfe8ff', 0.15);
    }
    // A fadinha: vestido rosa, cabelo louro, asas translúcidas batendo e a varinha com a estrela; deixa um brilho em volta.
    function fairy(x, y, now) {
      const flap = Math.sin(now / 55);
      halo(x, y, 14, '#ff9ad8', 0.3);
      g.globalAlpha = 0.75;
      ellipse(x - 5, y - 1, 4, R(3 + flap * 2), '#bfe8ff');
      ellipse(x + 5, y - 1, 4, R(3 + flap * 2), '#bfe8ff');
      ellipse(x - 4, y + 2, 3, R(2 - flap), '#e8f4ff');
      ellipse(x + 4, y + 2, 3, R(2 - flap), '#e8f4ff');
      g.globalAlpha = 1;
      tri(x, y - 1, x - 3, y + 7, x + 3, y + 7, '#ff8ac8');
      rect(x - 1, y + 7, 1, 2, '#ffe0c0');
      rect(x + 1, y + 7, 1, 2, '#ffe0c0');
      disc(x, y - 3, 2, '#ffe0c0');
      rect(x - 2, y - 6, 5, 2, '#ffd21e');
      rect(x + 2, y - 5, 1, 4, '#ffd21e');
      rect(x + 4, y + 1, 5, 1, '#8a5a2a');
      rect(x + 9, y, 1, 3, '#fff07a');
      rect(x + 8, y + 1, 3, 1, '#fff07a');
      bit(x - 1, y - 3, '#26242e');
    }
    // As luzes que dançam no chão da balada: um ponto de cada cor com um brilho em volta.
    const ORB_COLORS = ['#ff4fd8', '#4fe8ff', '#ffe84f', '#7aff6a', '#ff7a4f', '#9a7aff'];
    function orb(x, y, now, k) {
      const color = ORB_COLORS[(k + Math.floor(now / 300)) % ORB_COLORS.length];
      halo(x, y, 12, color, 0.45);
      disc(x, y, 3, color);
      rect(x - 1, y - 2, 2, 1, '#ffffff');
    }

    // --- Onde ficam os alvos ---------------------------------------------------------------------------------------------------------
    // O planeta fica sempre num ponto da festa (sorteado pelo evento); as luas giram em volta dele, cada uma na sua órbita.
    const planetAt = (c, lay) => ({ x: lay.L + lay.width * (0.3 + 0.4 * rnd(c.seed, 1)), y: Math.max(24, R(poleTop() * 0.5)) });
    // O canhão fica de um lado e a rede do outro; cada palhaço sai numa hora e cai a uma distância (o tiro curto cai antes da rede).
    const shotAt = (c, k, lay) => {
      const t0 = 2500 + k * step(c, 2500, 9500);
      const from = c.dir > 0 ? lay.L + 8 : lay.R - 8;
      const reach = (lay.width - 52) * (0.6 + 0.4 * rnd(c.seed, k, 2));
      const lift = 52 + 28 * rnd(c.seed, k, 5);
      return { t0, from, reach, lift };
    };
    // O ponto da fada a cada golpe (ela some e reaparece em outro lugar): dentro da festa, na altura do povo.
    const spotOf = (c, hits, lay) => ({ x: lay.L + 24 + rnd(c.seed, hits, 3) * (lay.width - 48), y: ground() - 34 - rnd(c.seed, hits, 4) * 36 });

    const TARGETS = {
      // Bolhas gigantes: sobem do chão balançando e crescendo um pouquinho.
      bolhas(c, k, lay) {
        const p = spread(c, k, 1800, step(c, 1800, 8500), 7500);
        if (p < 0) return null;
        const r = 8 + (k % 3) * 1.5;
        return { x: lay.L + 16 + rnd(c.seed, k) * (lay.width - 32) + Math.sin(p * 6 + k) * 8, y: ground() - 8 - p * (ground() - 14), w: r * 2 + 4, h: r * 2 + 4, p, r: r + R(p * 2) };
      },
      // Aviõezinhos: cruzam a festa planando, com a altura subindo e descendo em S.
      avioes(c, k, lay) {
        const p = spread(c, k, 2000, step(c, 2000, 9000), 8500);
        if (p < 0) return null;
        const from = c.dir > 0 ? lay.L - 14 : lay.R + 14;
        const x = from + c.dir * (lay.width + 28) * p;
        const y = 12 + rnd(c.seed, k, 2) * Math.max(10, skyBottom() + 12) + Math.sin(p * 9 + k * 2) * 9;
        return { x, y, w: 21, h: 15, p, tilt: -R(Math.cos(p * 9 + k * 2) * 3) };
      },
      // Abelhas: cada uma voa em zigue-zague rápido por uma área grande (a posição é a soma de um passeio lento e de um tremelique), e entram uma a uma.
      abelhas(c, k, lay) {
        const born = 1500 + k * 500;
        if (c.t < born) return null;
        const t = c.t;
        const slow = 0.5 + 0.5 * Math.sin(t / 2300 + rnd(c.seed, k) * TAU);
        const x = lay.L + 20 + slow * (lay.width - 40) + Math.sin(t / 190 + k * 1.7) * 7;
        const y = ground() - 24 - 34 * (0.5 + 0.5 * Math.sin(t / 1700 + k * 2.3)) + Math.cos(t / 170 + k * 2) * 5;
        return { x, y, w: 15, h: 13, p: 0, d: Math.cos(t / 190 + k * 1.7) >= 0 ? 1 : -1 };
      },
      // Patinhos: desfilam em fila pelo chão, o da frente puxando; só aparecem os que já estão dentro da festa.
      patinhos(c, k, lay) {
        const q = clamp((c.t - 1500) / Math.max(1, c.dur - 4500), 0, 1);
        const gap = 20;
        const lead = (c.dir > 0 ? lay.L - 14 : lay.R + 14) + c.dir * (lay.width + c.n * gap + 28) * q;
        const x = lead - c.dir * k * gap;
        if (x < lay.L + 4 || x > lay.R - 4) return null;
        return { x, y: ground() - 8, w: 17, h: 15, p: q, role: k === 0 ? 1 : k === c.n - 1 ? 2 : 0 };
      },
      // Luas: giram em volta do planeta, cada uma numa órbita (elipse achatada, ao contrário de uma para outra) e numa velocidade.
      planetas(c, k, lay) {
        const at = planetAt(c, lay);
        const a = c.t / (2600 + k * 450) * (k % 2 ? -1 : 1) + k * TAU / c.n;
        const rx = 26 + k * 7;
        const ry = 6 + k * 1.6;
        return { x: at.x + Math.cos(a) * rx, y: at.y + Math.sin(a) * ry, w: 13, h: 13, p: 0, front: Math.sin(a) > 0 };
      },
      // Palhaços: saem do canhão de um em um e voam em parábola até a rede (ou perto).
      circo(c, k, lay) {
        const shot = shotAt(c, k, lay);
        const p = (c.t - shot.t0) / 4600;
        if (p < 0 || p >= 1) return null;
        const y0 = ground() - 20;
        return { x: shot.from + c.dir * (14 + shot.reach * p), y: y0 + (ground() - 16 - y0) * p - shot.lift * 4 * p * (1 - p), w: 17, h: 19, p };
      },
      // O balão: um só, que atravessa o céu devagar boiando e inclina para os lados.
      baloagigante(c, k, lay) {
        const p = clamp(c.t / c.dur, 0, 1);
        const from = c.dir > 0 ? lay.L - 30 : lay.R + 30;
        const hits = (c.a.hits && c.a.hits[0]) || 0;
        const sc = 1 - 0.07 * hits;
        return { x: from + c.dir * (lay.width + 60) * p + Math.sin(c.t / 700) * 3, y: Math.max(46, poleTop() * 0.5 + 14) + Math.sin(c.t / 900) * 5, w: R(32 * sc) + 4, h: R(66 * sc), p, sc };
      },
      // Luzes da balada: pulam no chão no ritmo e vão e vêm pela pista.
      balada(c, k, lay) {
        const x = lay.L + lay.width * (0.5 + 0.42 * Math.sin(c.t / 1700 + k * 1.1));
        return { x, y: ground() - 9 - Math.abs(Math.sin(c.t / 320 + k)) * 12, w: 15, h: 15, p: 0 };
      },
      // Peixinhos: vão atrás da baleia, em fila ondulada, e só valem enquanto estão dentro da festa.
      baleia(c, k, lay) {
        const w = whalePos(c, lay);
        const x = w.x - c.dir * (40 + k * 12);
        if (x < lay.L - 6 || x > lay.R + 6) return null;
        return { x, y: w.y + 8 + Math.sin(c.t / 420 + k * 0.9) * 6 + ((k % 3) - 1) * 6, w: 13, h: 11, p: 0 };
      },
      // A fadinha: só um alvo, que fica num ponto, esvoaçando, e muda de lugar a cada golpe.
      fada(c, k, lay) {
        if (c.t < 1500) return null;
        const hits = (c.a.hits && c.a.hits[0]) || 0;
        const spot = spotOf(c, hits, lay);
        return { x: spot.x + Math.sin(c.t / 260) * 8, y: spot.y + Math.cos(c.t / 310) * 5, w: 17, h: 19, p: 0, hits };
      }
    };
    // A baleia cruza o céu devagar durante o evento, de um lado ao outro.
    function whalePos(c, lay) {
      const q = clamp((c.t - 800) / Math.max(1, c.dur - 3500), 0, 1);
      const from = c.dir > 0 ? lay.L - 40 : lay.R + 40;
      return { x: from + c.dir * (lay.width + 130 + 8 * 12) * q, y: Math.max(20, R(poleTop() * 0.45)) + Math.sin(c.t / 1400) * 3 };
    }

    // --- O céu (atrás da festa) ------------------------------------------------------------------------------------------------------
    const SKY = {
      baleia(c, now) {
        const lay = layout();
        const w = whalePos(c, lay);
        g.globalAlpha = c.k;
        whale(w.x, w.y, c.dir, now);
        g.globalAlpha = 1;
      }
    };

    // --- O ar e os bichos (por cima da festa) ---------------------------------------------------------------------------------------------
    const OVER = {
      bolhas(c, now) {
        const lay = layout();
        tint('#bfe8ff', 0.05 * c.k);
        // Bolhinhas miúdas subindo de enfeite.
        sprinkle(now, 90, () => particle({ x: lay.L + rng() * lay.width, y: ground() - 2, vx: (rng() - 0.5) * 0.008, vy: -0.012 - rng() * 0.01, born: now, ttl: 2400 + rng() * 1200, colors: ['#cfeaff', '#ffffff'], twinkle: true, wobble: rng() * 6 }));
        for (const item of c.items) bubble(item.x, item.y, item.r, now, item.k);
      },
      avioes(c, now) {
        tint('#cfe8ff', 0.04 * c.k);
        for (const item of c.items) {
          // O risco pontilhado que ele deixa no ar.
          for (let i = 1; i <= 6; i++) bit(item.x - c.dir * (10 + i * 4), item.y, '#ffffff', 0.55 - i * 0.08);
          plane(item.x, item.y, c.dir, item.k, item.tilt);
        }
      },
      abelhas(c, now) {
        tint('#ffd060', 0.06 * c.k);
        for (const item of c.items) bee(item.x, item.y, item.d, now, item.k);
        if (every(c, now, 5000, 1500) && sound) sound('zumbido');
      },
      patinhos(c, now) {
        const lay = layout();
        tint('#fff0a0', 0.04 * c.k);
        for (const item of c.items) duck(item.x, item.y, c.dir, now, item.k, item.role);
        if (c.items.length && every(c, now, 4200, 2500)) {
          const item = c.items[Math.floor(rng() * c.items.length)];
          say(tr('fx.patinhoQuac'), clamp(item.x, lay.L + 18, lay.R - 18), item.y - 20, now, '#ffe27a', 800, 5);
          if (sound) sound('pato');
        }
      },
      planetas(c, now) {
        const lay = layout();
        const at = planetAt(c, lay);
        tint('#10183a', 0.12 * c.k);
        g.globalAlpha = c.k;
        // A metade de trás do anel e as luas que passam atrás do planeta, o planeta, o anel da frente e as luas da frente.
        planet(at.x, at.y, now, true);
        for (const item of c.items) if (!item.front) moon(item.x, item.y, item.k);
        planet(at.x, at.y, now, false);
        for (const item of c.items) if (item.front) moon(item.x, item.y, item.k);
        g.globalAlpha = 1;
        sprinkle(now, 200, () => particle({ x: lay.L + rng() * lay.width, y: rng() * Math.max(10, skyBottom()), vx: 0, vy: 0, born: now, ttl: 900, colors: ['#ffffff'], twinkle: true }));
      },
      circo(c, now) {
        const lay = layout();
        tint('#2a1a3a', 0.06 * c.k);
        const cx = c.dir > 0 ? lay.L + 8 : lay.R - 8;
        // Cada tiro solta fumaça, confete e o estrondo na hora em que sai.
        let since = -1;
        for (let k = 0; k < c.n; k++) {
          const shot = shotAt(c, k, lay);
          const age = c.t - shot.t0;
          if (age >= 0 && age < 260) since = age;
          const key = `${c.a.born}:${k}`;
          if (age >= 0 && age < 1500 && !fired.has(key)) {
            fired.add(key);
            confetti(now, cx + c.dir * 17, ground() - 32, 14);
            for (let i = 0; i < 6; i++) particle({ x: cx + c.dir * 17, y: ground() - 32, vx: c.dir * (0.01 + rng() * 0.02), vy: -0.004 - rng() * 0.01, born: now, ttl: 1000, smoke: true });
            if (sound) sound('canhao');
          }
        }
        cannon(cx, ground() - 6, c.dir, now, since);
        net(c.dir > 0 ? lay.R - 22 : lay.L + 22, ground() - 3);
        for (const item of c.items) clown(item.x, item.y, now, item.k);
      },
      baloagigante(c, now) {
        const lay = layout();
        tint('#ffe8c0', 0.04 * c.k);
        for (const item of c.items) {
          const since = now - (hitAt.get(0) ?? -1e9);
          const wob = since < 600 ? Math.sin(since / 55) * 6 * (1 - since / 600) : 0;
          balloon(item.x + wob, item.y, now, item.sc, since < 120);
        }
        if (c.items.length && every(c, now, 6000, 3000)) say(tr('fx.baloaMandioca'), clamp(c.items[0].x, lay.L + 30, lay.R - 30), c.items[0].y + 36, now, '#ffe27a', 1100, 5);
      },
      balada(c, now) {
        const lay = layout();
        tint('#10082a', 0.24 * c.k);
        const bx = R(lay.L + lay.width / 2);
        const by = Math.max(12, R(poleTop() * 0.4));
        // Os raios de luz: varrem o mapa de um lado ao outro, cada um de uma cor, e acendem um ponto no chão onde batem.
        const colors = ['#ff4fd8', '#4fe8ff', '#ffe84f', '#7aff6a'];
        colors.forEach((color, i) => {
          const a = Math.sin(now / 1500 + i * 1.6) * 1.0;
          const len = ground() - by + 6;
          g.globalAlpha = 0.14 * c.k;
          tri(bx, by, bx + Math.sin(a - 0.09) * len / Math.max(0.3, Math.cos(a)), ground() + 2, bx + Math.sin(a + 0.09) * len / Math.max(0.3, Math.cos(a)), ground() + 2, color);
          g.globalAlpha = 0.35 * c.k;
          ellipse(bx + Math.tan(a) * (ground() - by), ground(), 9, 2, color);
          g.globalAlpha = 1;
        });
        g.globalAlpha = c.k;
        discoBall(bx, by, now);
        g.globalAlpha = 1;
        // Brilhinhos de espelho em volta.
        for (let i = 0; i < 10; i++) {
          if (Math.sin(now / 160 + i * 2.7) > 0.4) bit(bx + Math.cos(i * 1.3 + now / 900) * 30, by + Math.sin(i * 1.7 + now / 700) * 18 + 8, ORB_COLORS[i % ORB_COLORS.length]);
        }
        for (const item of c.items) orb(item.x, item.y, now, item.k);
        if (every(c, now, 2000, 800) && sound) sound('palco-triangulo');
      },
      baleia(c, now) {
        const lay = layout();
        tint('#7aa8e8', 0.06 * c.k);
        // Bolhinhas de ar subindo do cardume.
        sprinkle(now, 200, () => {
          const item = c.items.length ? c.items[Math.floor(rng() * c.items.length)] : null;
          if (item) particle({ x: item.x, y: item.y - 3, vx: 0, vy: -0.008, born: now, ttl: 900, colors: ['#cfeaff', '#ffffff'], twinkle: true });
        });
        for (const item of c.items) fish(item.x, item.y, c.dir, now, item.k);
        if (every(c, now, 9000, 2500)) {
          const w = whalePos(c, lay);
          say(tr('fx.baleiaCanto'), clamp(w.x, lay.L + 30, lay.R - 30), w.y + 16, now, '#bfe8ff', 1400, 5);
          if (sound) sound('baleia');
        }
      },
      fada(c, now) {
        const lay = layout();
        tint('#ffb0e8', 0.05 * c.k);
        for (const item of c.items) {
          fairy(item.x, item.y, now);
          // A purpurina que ela vai deixando, e uma explosãozinha quando chega num ponto novo.
          if (fairyHits !== item.hits) {
            fairyHits = item.hits;
            for (let i = 0; i < 12; i++) particle({ x: item.x, y: item.y, vx: (rng() - 0.5) * 0.06, vy: (rng() - 0.5) * 0.06, born: now, ttl: 700, colors: ['#fff07a', '#ff8ac8', '#ffffff'], twinkle: true });
          }
          sprinkle(now, 45, () => particle({ x: item.x + (rng() - 0.5) * 8, y: item.y + 6, vx: (rng() - 0.5) * 0.01, vy: 0.012 + rng() * 0.01, born: now, ttl: 900, colors: ['#fff07a', '#ff8ac8'], twinkle: true }));
        }
        if (every(c, now, 7000, 5000) && sound) sound('brilho');
      }
    };

    // --- Reações ---------------------------------------------------------------------------------------------------------------------
    // O alvo foi pego: o que cada evento faz de próprio no lugar dele.
    function catchFx(c, event, x, y, now) {
      if (!c) return;
      const lay = layout();
      const spot = clamp(x, lay.L + 18, lay.R - 18);
      if (c.id === 'bolhas') {
        // A bolha estoura num anel de gotinhas coloridas.
        for (let i = 0; i < 14; i++) {
          const a = i / 14 * TAU;
          particle({ x, y, vx: Math.cos(a) * 0.03, vy: Math.sin(a) * 0.03, gravity: 0.00001, born: now, ttl: 700, colors: [BUBBLE_COLORS[i % BUBBLE_COLORS.length], '#ffffff'] });
        }
        if (sound) sound('bolha');
      } else if (c.id === 'avioes') {
        for (let i = 0; i < 6; i++) particle({ x, y, vx: (rng() - 0.5) * 0.03, vy: -0.004 + rng() * 0.01, gravity: 0.000008, born: now, ttl: 1500, colors: ['#ffffff', '#d8e4f0'], wobble: rng() * 6, flip: 90 + rng() * 80 });
        if (sound) sound('assobio');
      } else if (c.id === 'abelhas') {
        for (let i = 0; i < 8; i++) particle({ x, y, vx: (rng() - 0.5) * 0.03, vy: 0.008 + rng() * 0.012, gravity: 0.00003, born: now, ttl: 800, colors: ['#ffd21e', '#ff9a12'], drop: true });
        say(tr('fx.abelhaMel'), spot, y - 14, now, '#ffd21e', 900, 5);
        if (sound) sound('acerto');
      } else if (c.id === 'patinhos') {
        for (let i = 0; i < 8; i++) particle({ x, y, vx: (rng() - 0.5) * 0.03, vy: -0.01 - rng() * 0.012, gravity: 0.00003, born: now, ttl: 1000, colors: ['#ffd21e', '#fff07a'], wobble: rng() * 6, flip: 100 });
        if (sound) sound('pato');
      } else if (c.id === 'planetas') {
        for (let i = 0; i < 10; i++) particle({ x, y, vx: (rng() - 0.5) * 0.05, vy: (rng() - 0.5) * 0.05, born: now, ttl: 800, colors: ['#ffffff', '#ffe27a', '#8ac8ff'], twinkle: true });
        if (sound) sound('brilho');
      } else if (c.id === 'circo') {
        confetti(now, x, y, 30);
        say(tr('fx.circoTcharam'), spot, Math.max(12, y - 18), now, '#ff8ac8', 1000, 6);
        if (sound) sound('acerto');
      } else if (c.id === 'baloagigante') {
        // O balão estoura de vez: confete, ar escapando e prêmios chovendo.
        confetti(now, x, y, 90);
        for (let i = 0; i < 40; i++) particle({ x: x + (rng() - 0.5) * 24, y: y + (rng() - 0.5) * 30, vx: (rng() - 0.5) * 0.12, vy: (rng() - 0.6) * 0.1, gravity: 0.00004, born: now, ttl: 1500 + rng() * 500, colors: ['#c89a5a', '#ffd21e', '#ff4f9e', '#3a78d8'] });
        fx().flashUntil = now + 160;
        say(tr('fx.baloaPiu'), clamp(x, lay.L + 30, lay.R - 30), Math.max(12, y - 30), now, '#ffe27a', 1600, 8);
        if (sound) sound('murchar');
      } else if (c.id === 'balada') {
        for (let i = 0; i < 12; i++) particle({ x, y, vx: (rng() - 0.5) * 0.06, vy: -0.01 - rng() * 0.03, gravity: 0.00004, born: now, ttl: 800, colors: ORB_COLORS, twinkle: true });
        if (sound) sound('palco-triangulo');
      } else if (c.id === 'baleia') {
        for (let i = 0; i < 8; i++) particle({ x, y, vx: (rng() - 0.5) * 0.02, vy: -0.01 - rng() * 0.01, born: now, ttl: 900, colors: ['#cfeaff', '#ffffff'], twinkle: true });
        if (sound) sound('bolha');
      } else if (c.id === 'fada') {
        // A fada, pega de vez, solta o desejo numa chuva de purpurina.
        confetti(now, x, y, 60);
        for (let i = 0; i < 40; i++) particle({ x, y, vx: (rng() - 0.5) * 0.1, vy: (rng() - 0.6) * 0.1, gravity: 0.00003, born: now, ttl: 1500, colors: ['#fff07a', '#ff8ac8', '#ffffff', '#bfe8ff'], twinkle: true });
        say(tr('fx.fadaDesejo'), spot, Math.max(12, y - 20), now, '#ff8ac8', 1600, 8);
        if (sound) sound('brilho');
      }
    }
    // Um golpe num alvo de vários golpes (o balão e a fada): devolve true se já tratou (sem o martelo da pinhata).
    function hitFx(c, event, x, y, now) {
      if (!c) return false;
      if (c.id === 'baloagigante') {
        hitAt.set(0, now);
        for (let i = 0; i < 8; i++) particle({ x: x + (rng() - 0.5) * 20, y: y + (rng() - 0.3) * 24, vx: (rng() - 0.5) * 0.05, vy: (rng() - 0.5) * 0.04, born: now, ttl: 600, colors: ['#ffffff', '#ffe8b0'] });
        say(tr('fx.baloaSsh'), clamp(x, layout().L + 20, layout().R - 20), y - 10, now, '#ffffff', 600, 4);
        if (sound) sound('carinho');
        return true;
      }
      if (c.id === 'fada') {
        hitAt.set(0, now);
        for (let i = 0; i < 16; i++) particle({ x, y, vx: (rng() - 0.5) * 0.08, vy: (rng() - 0.5) * 0.08, born: now, ttl: 800, colors: ['#fff07a', '#ff8ac8', '#ffffff'], twinkle: true });
        if (sound) sound('brilho');
        return true;
      }
      return false;
    }
    const shake = () => null;
    function reset() {
      hitAt.clear();
      fired.clear();
      ambientKey = '';
      ambientAt = 0;
      fairyHits = -1;
    }
    const probe = () => ({ fired: fired.size, hits: hitAt.size });
    // Os bichos e as coisas de cada evento, um a um (para os testes e para a prévia da arte).
    const DRAW = { bubble, plane, bee, duck, planet, moon, cannon, clown, net, balloon, discoBall, whale, fish, fairy, orb };
    return { TARGETS, SKY, OVER, TRACE: {}, DRAW, shake, catchFx, hitFx, reset, probe };
  }

  root.ArraiaMundoExtras = { create, TRACE_MS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
