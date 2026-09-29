(function (root) {
  'use strict';

  // Fonte bitmap 3x5 para os textos que aparecem na festa.
  const FONT = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
    E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
    I: '111010010010111', J: '011001001101010', K: '101101110101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
    Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111', 0: '111101101101111', 1: '010110010010111',
    2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111',
    6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111',
    '+': '000010111010000', '-': '000000111000000', '.': '000000000000010', ',': '000000000010100',
    '!': '010010010000010', '?': '111001011000010', ':': '000010000010000', ' ': '000000000000000'
  };
  const INK = '#120906';
  const HEART = ['01010', '11111', '11111', '01110', '00100'];
  // Textos da festa no idioma do jogo (src/i18n.js); sem o módulo (testes antigos), a própria chave.
  const tr = (key, vars) => (root.ArraiaI18n ? root.ArraiaI18n.t(key, vars) : key);
  const SHADOW = 'rgba(18, 9, 6, 0.32)';
  const FLAGS = ['#ee2f3c', '#ffd21e', '#35a03a', '#3a6cf0', '#ff4f9e', '#ff8a12', '#3fd6f0', '#9d5cf0'];
  const FLAG_DARK = ['#8a1030', '#c07e08', '#155428', '#1c2f8a', '#ad1e66', '#b44a0a', '#3a6cf0', '#44208a'];
  const SPARK = ['#fffff0', '#fff07a', '#ffac2a', '#ff5a1e', '#a8180e'];
  // Brilho do tecido de cada bandeirinha (o pixel de cima, do lado da luz).
  const FLAG_LIGHT = ['#ff8a8a', '#fff4a0', '#8ee07a', '#8eb4ff', '#ffa8d4', '#ffc07a', '#a8f4ff', '#cfa2ff'];
  const CONFETTI = ['#ee2f3c', '#ffd21e', '#35a03a', '#3a6cf0', '#ff4f9e', '#fff4e4'];
  const CONFETTI_BACK = ['#8a1030', '#c07e08', '#155428', '#1c2f8a', '#ad1e66', '#c8b8a0'];
  const FIRE_LIGHT = '#ff9438';
  const FIRE_CORE = '#ffd27a';
  const SMOKE = '#3b3346';
  // Chapéus de metal ou pedraria: ganham o brilho de joia.
  const SHINY = new Set(['coroa-milho', 'rei-baiao', 'coroa-flores', 'tiara-chifrinho']);
  const MARGIN = 16;
  const H = 204;
  const GROUND = 160;
  const TIER_MIN = [128, 190, 270, 340, 400];
  const MAX_W = 440;
  const POLE_H = [40, 56, 92, 124, 140];
  const STRINGS = [1, 1, 2, 3, 3];
  // Formas das partículas desenhadas pixel a pixel (1 = pinta), com contorno escuro.
  const SHAPES = { coracao: ['101', '111', '010'], nota: ['011', '010', '110', '110'] };
  // Marcos de cenário que ficam no fundo, atrás da plateia.
  const BACK_AT = ['milharal', 'bananeira', 'mandacaru', 'casinha', 'coqueiro', 'igrejinha', 'casinha-azul', 'catavento'];
  const RIDGE = { top: '#77b050', mid: '#2d783a', low: '#17432d' };
  const spread = (i, offset) => (offset + i * 0.618034) % 1;

  function mulberry(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const hash = (a, b) => (Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 17, 0xc2b2ae35)) >>> 0;
  const pick = (list, rng) => list[Math.floor(rng() * list.length) % list.length];

  function terrainWidth(engine) {
    return Math.min(MAX_W, Math.max(TIER_MIN[engine.tierIndex()], 112 + 3 * (engine.state.size - 1)));
  }

  function amount(value) {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1).replace(/\.0$/, '')}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
    if (value >= 1e4) return `${Math.round(value / 1e3)}K`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
    return String(Math.max(1, Math.round(value)));
  }

  function pixelText(g, text, cx, y, color, alpha = 1) {
    text = String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    g.globalAlpha = alpha;
    const x = Math.round(cx - (text.length * 4 - 1) / 2);
    y = Math.round(y);
    for (const pass of [INK, color]) {
      let cursor = x;
      g.fillStyle = pass;
      for (const char of text) {
        const glyph = FONT[char];
        if (glyph) {
          for (let i = 0; i < 15; i++) {
            if (glyph[i] !== '1') continue;
            const gx = cursor + (i % 3);
            const gy = y + Math.floor(i / 3);
            if (pass === INK) g.fillRect(gx - 1, gy - 1, 3, 3);
            else g.fillRect(gx, gy, 1, 1);
          }
        }
        cursor += 4;
      }
    }
    g.globalAlpha = 1;
  }

  // Equipamento com a prévia da vitrine por cima; trocar de lado leva o outro item junto, como no motor.
  function withPreview(equipped, preview) {
    if (!preview) return equipped;
    const eq = { ...equipped };
    for (const [slot, id] of Object.entries(preview)) {
      const other = slot === 'esquerda' ? 'direita' : slot === 'direita' ? 'esquerda' : null;
      if (other && eq[other] === id) eq[other] = eq[slot];
      eq[slot] = id;
    }
    return eq;
  }

  function create(canvas, bundle) {
    const images = {};
    let pending = 0;
    for (const [name, src] of Object.entries(bundle.images)) {
      const image = new Image();
      pending++;
      image.onload = () => { pending--; };
      image.src = src;
      images[name] = image;
    }
    const buffer = document.createElement('canvas');
    const g = buffer.getContext('2d', { willReadFrequently: true });
    const out = canvas.getContext('2d');
    const view = { css: 3, physical: 3, width: 0, float: 0, limit: null, capped: false };
    const fx = {
      particles: [], texts: [], arrivals: new Map(), guestsShown: null, celebrateUntil: 0, jumpUntil: 0,
      nextBlink: 0, blinkUntil: 0, nextSpark: 0, nextSweat: 0, nextFirework: 0, nextNote: 0, nextHeart: {}, frame: 0, previous: 0,
      lastDraw: 0, stepSum: 0, stepCrit: false, stepAt: 0, crasherSeen: null, leaving: null,
      hen: {}, goat: {}, bunny: {}, chicks: [], nextZ: 0, nextSmoke: 0, pops: [],
      light: null, nextFireSmoke: 0, dustAt: 0, rockets: [], flashes: [], shooting: null, nextShoot: 0, glintAt: 0
    };
    // Brilhos em pixel: anéis concêntricos de cor sólida, cada um mais transparente (a luz fica redonda e limpa,
    // sem o chuvisco do pontilhado). Feito uma vez por raio e cor, e reusado (luz, halo, fumaça).
    const glows = new Map();
    function glow(radius, color, falloff = 1.6) {
      const key = `${radius}|${color}|${falloff}`;
      if (glows.has(key)) return glows.get(key);
      const size = radius * 2 + 1;
      const image = document.createElement('canvas');
      image.width = size;
      image.height = size;
      const t = image.getContext('2d');
      const [r, gr, b] = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
      const bands = Math.max(2, Math.min(7, Math.round(radius / 2.5)));
      for (let band = 0; band < bands; band++) {
        t.fillStyle = `rgba(${r}, ${gr}, ${b}, ${(((bands - band) / bands) ** falloff).toFixed(3)})`;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const d = Math.hypot(x - radius, y - radius) / (radius + 0.5);
            if (d < 1 && Math.floor(d * bands) === band) t.fillRect(x, y, 1, 1);
          }
        }
      }
      glows.set(key, image);
      return image;
    }
    // Luz: 'source-atop' só pinta onde já tem desenho (terreiro, gente, barracas), nunca a área de trabalho atrás.
    function light(x, y, radius, color, alpha, mode = 'source-atop', falloff = 1.6) {
      if (alpha <= 0.01) return;
      g.globalCompositeOperation = mode;
      g.globalAlpha = Math.min(1, alpha);
      g.drawImage(glow(radius, color, falloff), Math.round(x - radius), Math.round(y - radius));
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
    const halo = (x, y, radius, color, alpha) => light(x, y, radius, color, alpha, 'source-over', 2.2);
    let layout = null;
    let layoutKey = '';
    let terrain = null;
    let ridge = null;
    let regions = [];
    let spots = new Map();
    const rng = Math.random;
    let minFrame = 15;

    function resize(width) {
      view.width = width;
      buffer.width = width;
      buffer.height = H;
      applyScale();
    }

    // Altura do que aparece: do fundo do terreiro ao topo dos mastros (o céu acima é transparente).
    const contentHeight = () => H - (GROUND - POLE_H[layout ? layout.tier : 0]) + 3;

    function applyScale() {
      const dpr = root.devicePixelRatio || 1;
      const wanted = Math.max(1, Math.round(view.css * dpr));
      let physical = wanted;
      if (view.limit) {
        // A festa inteira tem que caber na tela, senão a placa e as bordas somem.
        const fit = Math.min(view.limit.width / view.width, view.limit.height / contentHeight());
        physical = Math.max(1, Math.min(wanted, Math.floor(fit * dpr)));
      }
      view.capped = physical < wanted;
      if (physical === view.physical && canvas.width === view.width * physical) return;
      view.physical = physical;
      canvas.width = view.width * physical;
      canvas.height = H * physical;
      canvas.style.width = `${canvas.width / dpr}px`;
      canvas.style.height = `${canvas.height / dpr}px`;
      out.imageSmoothingEnabled = false;
    }

    function setScale(css, limit = null) {
      view.css = css;
      view.limit = limit;
      if (view.width) applyScale();
    }

    function frameAt(meta, now, phase = 0) {
      return meta.frames > 1 && meta.fps ? Math.floor(now / 1000 * meta.fps + phase) % meta.frames : 0;
    }

    function sprite(meta, frame, x, y, flip = false) {
      const image = images[meta.image];
      const sx = (frame % meta.frames) * meta.w;
      x = Math.round(x);
      y = Math.round(y);
      if (!flip) {
        g.drawImage(image, sx, 0, meta.w, meta.h, x, y, meta.w, meta.h);
        return;
      }
      g.save();
      g.translate(x + meta.w, y);
      g.scale(-1, 1);
      g.drawImage(image, sx, 0, meta.w, meta.h, 0, 0, meta.w, meta.h);
      g.restore();
    }

    // Sombra de contato: miolo escuro, meia-sombra nas pontas e uma segunda linha mais curta (elipse achatada).
    function shadow(cx, width, strength = 1) {
      const w = Math.round(width);
      const x = Math.round(cx - w / 2);
      g.globalAlpha = strength;
      g.fillStyle = 'rgba(18, 9, 6, 0.16)';
      g.fillRect(x - 2, GROUND, w + 4, 1);
      g.fillStyle = SHADOW;
      g.fillRect(x, GROUND, w, 1);
      g.fillRect(x + 2, GROUND + 1, Math.max(0, w - 4), 1);
      g.fillStyle = 'rgba(18, 9, 6, 0.14)';
      g.fillRect(x + 4, GROUND + 2, Math.max(0, w - 8), 1);
      g.globalAlpha = 1;
    }

    // Luz de contorno: a fogueira acende a borda do lado dela em quem está perto (com o tremor da chama).
    const rimMetas = new WeakMap();
    function rim(meta, frame, x, y, flip, cx) {
      const source = fx.light;
      if (!source || !meta.rim) return;
      const strength = Math.max(0, 1 - Math.abs(source.x - cx) / source.reach) * 0.95 * source.power;
      if (strength < 0.04) return;
      let side = source.x > cx ? 'right' : 'left';
      if (flip) side = side === 'right' ? 'left' : 'right';
      let metas = rimMetas.get(meta);
      if (!metas) {
        metas = { right: { ...meta, image: meta.rim.right }, left: { ...meta, image: meta.rim.left } };
        rimMetas.set(meta, metas);
      }
      g.globalAlpha = Math.min(1, strength);
      sprite(metas[side], frame, x, y, flip);
      g.globalAlpha = 1;
    }

    const write = (text, cx, y, color, alpha) => pixelText(g, text, cx, y, color, alpha);

    // Terreiro flutuante gerado na hora, com a paleta do terreiro equipado.
    function buildTerrain(width, palette, seed) {
      const r = mulberry(seed);
      const depth = 12 + Math.round((width - 112) / (MAX_W - 112) * 14);
      const w = width + 2;
      const h = depth + 22;
      const top = 3;
      const grid = new Array(w * h).fill(null);
      const put = (x, y, color) => { if (x >= 0 && y >= 0 && x < w && y < h) grid[y * w + x] = color; };
      const half = (width - 1) / 2;
      const wobble = Array.from({ length: width }, () => (r() - 0.5) * 3.2);
      const bottoms = [];
      for (let x = 0; x < width; x++) {
        let smooth = 0;
        for (let k = -2; k <= 2; k++) smooth += wobble[Math.min(width - 1, Math.max(0, x + k))] / 5;
        const t = (x - half) / half;
        const bottom = Math.floor(4 + depth * Math.max(0, 1 - t * t) ** 0.75 + smooth * 2);
        bottoms.push(bottom);
        const edge = x === 0 || x === width - 1 ? 1 : 0;
        for (let y = edge; y <= bottom; y++) {
          let color;
          if (y === edge) {
            if (palette.pattern === 'planks') color = x % 6 === 0 ? palette.sub[0] : palette.top[0];
            else if (palette.pattern === 'checker') color = (Math.floor(x / 2) + y) % 2 ? palette.top[0] : palette.mid[0];
            else color = pick(palette.top, r);
          } else if (y === edge + 1) {
            if (palette.pattern === 'checker') color = (Math.floor(x / 2) + y) % 2 ? palette.top[0] : palette.mid[0];
            else color = pick(palette.mid, r);
          } else if (y === edge + 2) color = pick(palette.sub, r);
          else if (y < 7) color = pick(palette.soil, r);
          else if (y < bottom * 0.62) color = pick(palette.deep, r);
          else if (y < bottom - 1) color = palette.low[0];
          else color = palette.edge[0];
          put(x + 1, top + y, color);
        }
      }
      for (let i = 0; i < width / 5; i++) {
        const x = 3 + Math.floor(r() * (width - 6));
        const y = 8 + Math.floor(r() * Math.max(1, bottoms[x] - 10));
        put(x + 1, top + y, palette.speck[0]);
        put(x + 2, top + y, palette.speck[1] || palette.speck[0]);
      }
      if (palette.puddle) {
        for (let i = 0; i < width / 30; i++) {
          const x = 4 + Math.floor(r() * (width - 12));
          for (let k = 0; k < 4 + Math.floor(r() * 4); k++) put(x + k + 1, top, palette.puddle[k % 2]);
        }
      }
      const roots = Math.max(3, Math.floor(width / 32));
      for (let n = 0; n < roots; n++) {
        let x = Math.floor(width * (0.15 + 0.7 * n / Math.max(1, roots - 1)));
        let y = bottoms[x];
        const length = 3 + Math.floor(r() * 6);
        for (let step = 0; step < length; step++) {
          y++;
          if (step % 3 === 2) x += r() < 0.5 ? -1 : 1;
          put(x + 1, top + y, '#4a2418');
        }
        if (n % 3 === 1) {
          ['343', '343', '232', '.2.'].forEach((row, dy) => [...row].forEach((c, dx) => {
            if (c !== '.') put(x + dx, top + y + 1 + dy, { 2: '#4a2418', 3: '#80482a', 4: '#bd7a3e' }[c]);
          }));
        }
      }
      const image = document.createElement('canvas');
      image.width = w;
      image.height = h;
      const t = image.getContext('2d');
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const color = grid[y * w + x];
          if (color) { t.fillStyle = color; t.fillRect(x, y, 1, 1); continue; }
          const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
            const nx = x + dx;
            const ny = y + dy;
            return nx >= 0 && ny >= 0 && nx < w && ny < h && grid[ny * w + nx];
          });
          if (near) { t.fillStyle = INK; t.fillRect(x, y, 1, 1); }
        }
      }
      // Sombreamento do bloco de terra: a beirada de cima pega luz e a terra escurece em direção à ponta de baixo,
      // em faixas de 1 pixel (degradê de pixel art), só onde já tem terra.
      t.globalCompositeOperation = 'source-atop';
      t.fillStyle = 'rgba(255, 238, 196, 0.22)';
      t.fillRect(0, top, w, 1);
      const deepest = Math.max(...bottoms) + top;
      for (let y = top + 6; y <= deepest + 2; y++) {
        const k = Math.min(1, (y - top - 6) / Math.max(1, deepest - top - 6));
        t.fillStyle = `rgba(20, 16, 44, ${(0.08 + 0.5 * k * k).toFixed(3)})`;
        t.fillRect(0, y, w, 1);
      }
      t.globalCompositeOperation = 'source-over';
      if (palette.tuft?.length) {
        for (let x = 3; x < width - 2; x++) {
          const roll = r();
          if (roll < 0.22) {
            t.fillStyle = pick(palette.tuft, r);
            t.fillRect(x, top - 1, 1, 1);
            if (roll < 0.07) t.fillRect(x, top - 2, 1, 1);
          } else if (roll < 0.25 && palette.flowers?.length) {
            t.fillStyle = pick(palette.flowers, r);
            t.fillRect(x, top - 1, 1, 1);
          }
        }
      }
      return { image, top, bottom: Math.max(...bottoms) + top + 2, bottoms };
    }

    // Posições da festa: cada posto no seu lugar, conforme o porte e o que está equipado.
    function buildLayout(engine, eq) {
      const s = engine.state;
      const tier = engine.tierIndex();
      const width = terrainWidth(engine);
      const L = MARGIN;
      const R = MARGIN + width;
      const sides = bundle.sides;
      const lay = { tier, width, L, R, couples: [], audience: [] };
      let left = L + 4;
      let right = R - 4;
      const leftItem = sides[eq.esquerda];
      lay.leftSide = { id: eq.esquerda, x: left, meta: leftItem };
      left += leftItem.w + 4;
      const rightItem = sides[eq.direita];
      lay.rightSide = { id: eq.direita, x: right - rightItem.w, meta: rightItem };
      right = lay.rightSide.x - 4;
      const fireMeta = engine.legendary() ? bundle.fires.lendaria : bundle.fires[String(Math.min(tier, 4))];
      lay.fire = { x: right - fireMeta.w, meta: fireMeta };
      right = lay.fire.x - 3;
      if (engine.charActive('pamonha')) { lay.caller = { x: right - 16 }; right -= 22; }
      const center = (left + right) / 2;
      const withPar = engine.charActive('milho');
      lay.host = { x: Math.round(center - (withPar ? 22 : 12)) };
      if (withPar) lay.par = { x: lay.host.x + 27 };
      lay.danceLeft = left;
      lay.danceRight = right;
      const slots = [];
      const rightStart = lay.host.x + (withPar ? 46 : 30);
      const leftEnd = lay.host.x - 9;
      for (let i = 0; ; i++) {
        const onRight = rightStart + i * 27;
        const onLeft = leftEnd - 26 - i * 27;
        const fitsRight = onRight + 25 <= right;
        const fitsLeft = onLeft >= left;
        if (!fitsRight && !fitsLeft) break;
        if (fitsRight) slots.push(onRight);
        if (fitsLeft) slots.push(onLeft);
      }
      const guests = Math.max(0, s.size - 1);
      const couples = Math.min(Math.floor(guests / 2), slots.length);
      for (let i = 0; i < couples; i++) lay.couples.push({ x: slots[i], index: i });
      if (tier >= 2) {
        const stage = bundle.props.palco;
        lay.stage = { x: lay.host.x - 20, meta: stage };
      }
      if (tier >= 1) {
        const rest = Math.max(0, guests - couples * 2);
        const spots = [];
        for (let x = L + 8; x < R - 20; x += 11) spots.push(x);
        const count = Math.min(rest, spots.length);
        const order = spots.map((x, i) => [x, hash(i, 91) % 1000]).sort((a, b) => a[1] - b[1]);
        for (let i = 0; i < count; i++) lay.audience.push({ x: order[i][0], index: i });
      }
      if (tier >= 3) lay.backdrop = { kind: 'roda', x: L + 2 };
      else if (tier === 2) {
        const arch = bundle.props.arco;
        const from = lay.stage.x + lay.stage.meta.w;
        const room = lay.fire.x - from;
        lay.backdrop = room >= arch.w * 0.7 ? { kind: 'arco', x: Math.round(from + (room - arch.w) / 2) } : { kind: 'cerca' };
      }
      else if (tier === 1) lay.backdrop = { kind: 'cerca' };
      // Cenário ganho com os convidados: marcos do fundo, enfeites e bichos.
      lay.scenery = engine.scenery();
      lay.has = new Set(lay.scenery.landmarks);
      lay.back = placeBack(lay, lay.scenery.landmarks.filter(id => BACK_AT.includes(id) && bundle.scenery[id]));
      lay.key = [width, tier, eq.esquerda, eq.direita, eq.terreiro, engine.legendary(),
        withPar, engine.charActive('pamonha'), couples, lay.audience.length, s.size].join('|');
      return lay;
    }

    // Marcos do fundo: cada um procura, perto do seu lugar preferido, um ponto onde nada alto na frente
    // (barraca, palco, fogueira) o esconda e onde não fique em cima de outro marco. Coisa alta aparece por cima
    // de coisa baixa, então o coqueiro pode ficar atrás da fogueira pequena, mas não atrás do palco.
    const BACK_PREFER = [0.12, 0.88, 0.3, 0.7, 0.5, 0.2, 0.8, 0.4];
    function placeBack(lay, ids) {
      const lift = lay.tier >= 1 ? 9 : 0;
      const blocks = [{ x0: lay.fire.x - 2, x1: lay.fire.x + lay.fire.meta.w + 2, top: GROUND - lay.fire.meta.h + 1 }];
      for (const side of [lay.leftSide, lay.rightSide]) {
        if (side.meta.w >= 20) {
          blocks.push({ x0: side.x, x1: side.x + side.meta.w, top: GROUND - side.meta.h + 1 });
        }
      }
      if (lay.stage) {
        blocks.push({ x0: lay.stage.x + 4, x1: lay.stage.x + lay.stage.meta.w - 4, top: GROUND - 6 - lay.stage.meta.h + 1 });
      }
      const placed = [];
      return ids.map((id, index) => {
        const meta = bundle.scenery[id];
        const top = GROUND - 2 - lift - meta.h + 1;
        const hiding = blocks.filter(block => block.top <= top + 10);
        const overlap = (x, list) => list.reduce((sum, b) => sum + Math.max(0, Math.min(x + meta.w, b.x1) - Math.max(x, b.x0)), 0);
        const lo = lay.L + 1;
        const hi = lay.R - 1 - meta.w;
        const prefer = Math.round(lay.L + lay.width * BACK_PREFER[index % BACK_PREFER.length] - meta.w / 2);
        let best = null;
        for (let d = 0; d <= lay.width && best === null; d++) {
          for (const x of [prefer + d, prefer - d]) {
            if (x >= lo && x <= hi && !overlap(x, hiding) && overlap(x, placed) <= 4) { best = x; break; }
          }
        }
        if (best === null) {
          let least = Infinity;
          for (let x = lo; x <= hi; x++) {
            const hidden = overlap(x, hiding) * 4 + overlap(x, placed);
            if (hidden < least) { least = hidden; best = x; }
          }
        }
        placed.push({ x0: best, x1: best + meta.w });
        return { id, x: best, meta };
      });
    }

    function keeperFor(engine, id) {
      if (id === 'barraca-pescaria') return engine.charActive('cachorro') ? 'cachorro' : 'balcao-cavalheiro';
      if (id === 'barraca-beijo') return engine.charActive('aipim') ? 'aipim' : 'balcao-dama';
      if (id === 'barraca-argolas') return engine.charActive('pacoca') ? 'pacoca' : 'balcao-cavalheiro';
      return id === 'cadeia' ? 'balcao-cavalheiro' : 'balcao-dama';
    }

    // Partícula com forma (coração, nota musical) que sobe balançando.
    function float(shape, x, y, now, colors) {
      fx.particles.push({ x, y, vx: (rng() - 0.5) * 0.006, vy: -0.011 - rng() * 0.006, born: now, ttl: 1500 + rng() * 600,
        colors, wobble: rng() * 6, shape });
    }

    // Barracas: toldo e balcão animados juntos; o barraqueiro fica entre os dois, com a cabeça na linha do balcão.
    // Placa da barraca: a palavra vem do idioma do jogo, em letras de pixel pintadas na madeira (sem contorno).
    function drawSign(sign, x, y, word) {
      const text = String(word).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      const width = text.length * 4 - 1 + (sign.heart ? 6 : 0);
      let cursor = x + sign.x0 + Math.floor((sign.x1 - sign.x0 + 1 - width) / 2);
      g.fillStyle = sign.color;
      for (const char of text) {
        const glyph = FONT[char];
        if (glyph) for (let i = 0; i < 15; i++) if (glyph[i] === '1') g.fillRect(cursor + (i % 3), y + sign.y + Math.floor(i / 3), 1, 1);
        cursor += 4;
      }
      if (!sign.heart) return;
      g.fillStyle = sign.heartColor;
      HEART.forEach((row, dy) => [...row].forEach((bit, dx) => {
        if (bit === '1') g.fillRect(cursor + dx, y + sign.y + dy, 1, 1);
      }));
    }

    function drawSide(engine, side, now, name) {
      const meta = side.meta;
      const y = GROUND - meta.h + 1;
      const frame = frameAt(meta, now, side.x * 0.37);
      shadow(side.x + meta.w / 2, meta.w - 2, 0.9);
      sprite(meta, frame, side.x, y);
      if (meta.sign) drawSign(meta.sign, side.x, y, tr(`sign.${side.id}`));
      if (meta.front) {
        const keeper = bundle.chars[keeperFor(engine, side.id)];
        sprite(keeper, frameAt(keeper, now, side.x), side.x + meta.keeper[0] - keeper.w / 2, y + meta.keeper[1] - (keeper.top || 0));
        g.drawImage(images[meta.front], frame * meta.w, 0, meta.w, meta.h, side.x, y, meta.w, meta.h);
      }
      if (side.id === 'barraca-beijo' && now >= (fx.nextHeart[name] || 0)) {
        fx.nextHeart[name] = now + 900 + rng() * 1100;
        float('coracao', side.x + meta.keeper[0] + (rng() - 0.5) * 10, y + meta.keeper[1] + 2, now, ['#ff4f9e', '#ff8a96']);
      }
      regions.push({ id: name, x: side.x, y, w: meta.w, h: meta.h });
    }

    function drawBunting(left, right, top, sag, phase, lamps, now) {
      const mid = (left + right) / 2;
      const half = (right - left) / 2;
      const points = [];
      g.fillStyle = '#361a0c';
      for (let x = left; x <= right; x++) {
        const t = (x - mid) / half;
        const y = Math.round(top + sag * (1 - t * t));
        g.fillRect(x, y, 1, 1);
        points.push([x, y]);
      }
      if (lamps) {
        for (let i = 2; i < points.length; i += 6) {
          const [x, y] = points[i];
          const on = Math.sin(now / 300 + i) > -0.6;
          g.fillStyle = '#361a0c';
          g.fillRect(x, y + 1, 1, 1);
          if (on) halo(x, y + 3, 3, '#ffd21e', 0.4);
          g.fillStyle = on ? '#ffd21e' : '#c07e08';
          g.fillRect(x - 1, y + 2, 2, 2);
          if (on) { g.fillStyle = '#fffff0'; g.fillRect(x - 1, y + 2, 1, 1); }
        }
        return;
      }
      let index = 0;
      for (let i = 3; i < points.length; i += 8, index++) {
        const [x, y] = points[i];
        const c = (index + phase) % FLAGS.length;
        const shift = 1.3 * Math.sin(now / 420 + index * 0.8);
        for (let dy = 1; dy < 7; dy++) {
          const ox = Math.round(shift * dy / 6);
          for (let dx = -2; dx <= 2; dx++) {
            if ((dy === 5 && dx === 0) || (dy === 6 && Math.abs(dx) <= 1)) continue;
            g.fillStyle = dx === 2 || dy === 1 ? FLAG_DARK[c] : dx === -2 && dy === 2 ? FLAG_LIGHT[c] : FLAGS[c];
            g.fillRect(x + dx + ox, y + dy, 1, 1);
          }
        }
      }
    }

    function drawPole(x, top) {
      g.fillStyle = INK;
      g.fillRect(x - 1, top - 1, 4, GROUND - top + 2);
      g.fillStyle = '#c07a36';
      g.fillRect(x, top, 1, GROUND - top + 1);
      g.fillStyle = '#7c421e';
      g.fillRect(x + 1, top, 1, GROUND - top + 1);
      g.fillStyle = '#361a0c';
      for (let y = top + 4; y < GROUND; y += 9) g.fillRect(x, y, 2, 1);
    }

    function drawDanceFloor(left, right) {
      g.fillStyle = INK;
      g.fillRect(left - 1, GROUND - 4, right - left + 2, 5);
      g.fillStyle = '#c07a36';
      g.fillRect(left, GROUND - 3, right - left, 1);
      g.fillStyle = '#7c421e';
      g.fillRect(left, GROUND - 2, right - left, 2);
      g.fillStyle = '#361a0c';
      for (let x = left; x < right; x += 6) g.fillRect(x, GROUND - 2, 1, 2);
    }

    // Brilho de joia: uma estrelinha de 4 pontas que cresce e some, de tempos em tempos, no ponto mais alto do chapéu.
    function glint(now, x, y) {
      if (now >= fx.glintAt + 380) { fx.glintAt = now + 1800 + rng() * 2600; }
      const t = (now - fx.glintAt) / 380;
      if (t < 0 || t > 1) return;
      const size = t < 0.5 ? Math.round(t * 6) : Math.round((1 - t) * 6);
      x = Math.round(x);
      y = Math.round(y);
      halo(x, y, 3, '#fff4c0', 0.5 * (1 - Math.abs(t - 0.5) * 2));
      g.fillStyle = '#fffff0';
      g.fillRect(x - size, y, size * 2 + 1, 1);
      g.fillRect(x, y - size, 1, size * 2 + 1);
    }

    function hostFrame(engine, now) {
      const tags = bundle.mandioca.meta.tags;
      const r = engine.state.runtime;
      if (now < fx.celebrateUntil) return tags.comemora[Math.floor(now / 85) % tags.comemora.length];
      if (!r.dancing) return tags.descanso[Math.floor(now / 260) % tags.descanso.length];
      const speed = engine.speed();
      const phase = speed > 2.5 ? now / 1000 * 2.5 % 1 : r.lift;
      const n = tags.danca.length;
      return tags.danca[Math.floor(Math.min(0.999, phase) * n) % n];
    }

    function drawHost(engine, now, dance, eq) {
      const s = engine.state;
      const meta = bundle.mandioca.meta;
      const sheet = bundle.mandioca[eq.tecido] || bundle.mandioca['xadrez-vermelho'];
      const frame = hostFrame(engine, now);
      if (frame !== fx.frame) { fx.previous = fx.frame; fx.frame = frame; }
      const x = layout.host.x - meta.pad;
      const y = GROUND + dance - meta.h + 1;
      const anchors = meta.anchors[frame];
      shadow(layout.host.x + 12, 16);
      const item = bundle.hand[eq.mao];
      if (item) {
        const itemFrame = item.fps && s.runtime.dancing ? frameAt(item, now) : 0;
        sprite(item, itemFrame, x + anchors.hand[0] - item.pivot[0], y + anchors.hand[1] - item.pivot[1]);
      }
      sprite(sheet, frame, x, y);
      rim(sheet, frame, x, y, false, layout.host.x + 12);
      if (now >= fx.nextBlink) { fx.blinkUntil = now + 130; fx.nextBlink = now + 2200 + rng() * 2600; }
      if (now < fx.blinkUntil && s.runtime.dancing && now >= fx.celebrateUntil) {
        sprite(bundle.mandioca.blink, 0, x + anchors.eyes[0], y + anchors.eyes[1]);
      }
      const hat = bundle.hats[eq.chapeu];
      if (hat) {
        const head = meta.anchors[fx.previous].head;
        const hx = x + head[0] + hat.ox;
        const hy = y + head[1] + hat.oy;
        sprite(hat, 0, hx, hy);
        if (SHINY.has(eq.chapeu)) glint(now, hx + hat.w * 0.72, hy + 2);
      }
      regions.push({ id: 'host', x: x + 2, y, w: meta.w - 4, h: meta.h });
    }

    function drawCrowd(engine, now, list, sheet, bottom, flipEvery) {
      const crowd = bundle.crowd;
      const jump = now < fx.jumpUntil ? -2 : 0;
      for (const guest of list) {
        const seed = hash(guest.index, sheet === crowd.dancers ? 7 : 13);
        const fabric = seed % crowd.fabrics;
        const phase = (seed % 100) / 100;
        const steps = crowd.steps || 2;
        const beat = Math.floor(now / (760 / steps) + phase * steps) % steps;
        const entries = flipEvery ? [[0, false], [13, true]] : [[0, (seed >> 3) % 2 === 0]];
        for (const [dx, flip] of entries) {
          const type = flipEvery ? (dx ? 1 : 0) : (seed >> 5) % 2;
          const frame = (type * crowd.fabrics + (flipEvery && dx ? (fabric + 2) % crowd.fabrics : fabric)) * steps + beat;
          let x = guest.x + dx;
          const arrival = fx.arrivals.get(`${sheet.image}:${guest.index}`);
          if (arrival) {
            const t = Math.min(1, (now - arrival.at) / 1200);
            x = arrival.from + (x - arrival.from) * t;
            if (t >= 1) fx.arrivals.delete(`${sheet.image}:${guest.index}`);
          }
          if (sheet === crowd.dancers) shadow(x + 6, 8);
          const top = bottom - sheet.h + 1 + (sheet === crowd.dancers ? jump : 0);
          sprite(sheet, frame, x - (crowd.pad || 0), top, flip);
          rim(sheet, frame, x - (crowd.pad || 0), top, flip, x + 6);
        }
      }
    }

    function drawBackdrop(now) {
      const b = layout.backdrop;
      if (!b) return;
      const props = bundle.props;
      if (b.kind === 'cerca') {
        const meta = props.cerca;
        for (let x = layout.L + 4; x < layout.R - meta.w; x += meta.w) sprite(meta, 0, x, GROUND - 8 - meta.h + 1);
      } else if (b.kind === 'arco') {
        sprite(props.arco, 0, b.x, GROUND - 6 - props.arco.h + 1);
      } else {
        const meta = props.roda;
        const frame = frameAt(meta, now);
        const top = GROUND - 6 - meta.h + 1;
        sprite(meta, frame, b.x, top);
        // Mesma geometria do desenho (art/exportar.py, wheel): centro no meio do quadrado, raio 38, uma lâmpada a
        // cada 15°, girando 45°/16 por quadro.
        const turn = frame * 45 / meta.frames;
        for (let k = 0; k < 24; k++) {
          const a = (k * 15 + turn) * Math.PI / 180;
          const on = Math.sin(now / 180 - k * 0.9) > 0.2;
          if (on) halo(b.x + 44 + 38 * Math.cos(a), top + 44 + 38 * Math.sin(a), 2, k % 3 ? '#fff07a' : '#ff8ac8', 0.55);
        }
      }
    }

    function drawStage(engine, now) {
      if (!layout.stage) return;
      const meta = layout.stage.meta;
      const x = layout.stage.x;
      const y = GROUND - 6 - meta.h + 1;
      sprite(meta, 0, x, y);
      const floor = y + meta.floor;
      for (let k = 0, lx = x + 5; lx < x + meta.w - 4; k++, lx += 7) {
        const lit = Math.floor(now / 160 - k) % 4 === 0;
        const color = FLAGS[k % 6];
        if (lit) halo(lx, floor + 2, 3, color, 0.5);
        g.fillStyle = INK;
        g.fillRect(lx - 1, floor + 1, 3, 2);
        g.fillStyle = lit ? '#fffff0' : color;
        g.fillRect(lx, floor + 1, 1, 1);
      }
      const playing = [];
      ['cenoura', 'inhame', 'batata'].forEach((id, i) => {
        if (!engine.charActive(id)) return;
        const char = bundle.chars[id];
        sprite(char, frameAt(char, now, i * 0.5), x + meta.slots[i] - 1, floor - char.h + 1);
        playing.push(x + meta.slots[i] + 8);
      });
      // O trio toca: notinhas coloridas sobem do palco.
      if (playing.length && now >= fx.nextNote) {
        fx.nextNote = now + 700 - playing.length * 120 + rng() * 400;
        float('nota', playing[Math.floor(rng() * playing.length)], floor - 26, now, [FLAGS[Math.floor(rng() * 6)]]);
      }
      regions.push({ id: 'palco', x, y, w: meta.w, h: meta.h - 14 });
    }

    function drawFire(engine, now) {
      const f = layout.fire;
      const y = GROUND - f.meta.h + 1;
      const cx = f.x + f.meta.w / 2;
      const power = fx.light ? fx.light.power : 1;
      // Halo quente atrás da chama (no céu também: é a própria luz do fogo).
      // A lendária já é dourada: com halo forte ela estouraria o branco.
      const legendary = f.meta.image === 'fogueira-lendaria';
      halo(cx, y + f.meta.h * 0.45, Math.round(f.meta.w * 0.85), FIRE_LIGHT, (legendary ? 0.14 : 0.3) * power);
      shadow(cx, f.meta.w + 2, 0.8);
      sprite(f.meta, frameAt(f.meta, now), f.x, y);
      if (now >= fx.nextFireSmoke) {
        fx.nextFireSmoke = now + 260 + rng() * 260;
        fx.particles.push({ x: cx + (rng() - 0.5) * f.meta.w * 0.3, y: y + 2, vx: (rng() - 0.3) * 0.006, vy: -0.012 - rng() * 0.006,
          born: now, ttl: 1800 + rng() * 900, smoke: true, wobble: rng() * 6 });
      }
      if (engine.charActive('faisca')) {
        const spark = bundle.chars.faisca;
        sprite(spark, frameAt(spark, now), f.x + f.meta.w - 4, y + 4 + Math.round(Math.sin(now / 500) * 2));
      }
      regions.push({ id: 'fogueira', x: f.x, y, w: f.meta.w, h: f.meta.h });
      if (layout.has.has('gato')) {
        const cat = bundle.scenery.gato;
        const cx = Math.round(f.x + f.meta.w / 2 - cat.w / 2);
        sprite(cat, frameAt(cat, now), cx, GROUND - cat.h + 3);
        spots.set('gato', { x: cx + cat.w / 2, y: GROUND - 8 });
        if (now >= fx.nextZ) {
          fx.nextZ = now + 2600 + rng() * 1800;
          say('Z', cx + cat.w - 2, GROUND - 6, now, '#cfe3ff', 1500, 9);
        }
      }
      const flare = engine.flareActive;
      if (now >= fx.nextSpark) {
        fx.nextSpark = now + (flare ? 30 : 90) + rng() * 90;
        fx.particles.push({ x: f.x + f.meta.w * (0.25 + rng() * 0.5), y: y + 3, vx: (rng() - 0.5) * 0.01,
          vy: -0.014 - rng() * 0.014, born: now, ttl: 700 + rng() * 900, colors: SPARK, wobble: rng() * 6, ember: true,
          big: flare && rng() < 0.3 });
      }
    }

    function drawCaller(engine, now) {
      if (!layout.caller) return;
      const box = bundle.props.caixote;
      sprite(box, 0, layout.caller.x, GROUND - box.h + 1);
      const caller = bundle.chars.pamonha;
      const shouting = now < fx.jumpUntil;
      sprite(caller, shouting ? caller.shout ?? 1 : frameAt(caller, now), layout.caller.x, GROUND - box.h - caller.h + 1);
    }

    function drawCrasher(engine, now) {
      const active = engine.state.crasher.active;
      const meta = bundle.props.penetra;
      if (active && !fx.crasherSeen) fx.crasherSeen = { at: now, side: active.side };
      if (!active && fx.crasherSeen) {
        fx.leaving = { at: now, side: fx.crasherSeen.side, x: fx.crasherSeen.x };
        fx.crasherSeen = null;
      }
      const edge = side => side < 0 ? layout.L - 20 : layout.R + 4;
      if (fx.crasherSeen) {
        const target = fx.crasherSeen.side < 0 ? layout.L + 30 : layout.R - 46;
        const t = Math.min(1, (now - fx.crasherSeen.at) / 2200);
        const x = edge(fx.crasherSeen.side) + (target - edge(fx.crasherSeen.side)) * t;
        fx.crasherSeen.x = x;
        shadow(x + 7, 10);
        sprite(meta, t < 1 ? frameAt(meta, now) : 0, x, GROUND - meta.h + 1 + (t < 1 ? 0 : Math.round(Math.sin(now / 200))),
          fx.crasherSeen.side > 0);
        regions.push({ id: 'crasher', x: x - 2, y: GROUND - meta.h - 2, w: meta.w + 4, h: meta.h + 4 });
        if (t >= 1) write('?', x + 7, GROUND - meta.h - 7, '#fff07a');
      } else if (fx.leaving) {
        const t = (now - fx.leaving.at) / 700;
        if (t >= 1) fx.leaving = null;
        else {
          const x = fx.leaving.x + (edge(fx.leaving.side) - fx.leaving.x) * t;
          sprite(meta, Math.floor(now / 80) % meta.frames, x, GROUND - meta.h + 1, fx.leaving.side < 0);
        }
      }
    }

    function requestTarget(engine) {
      const spots = [{ x: layout.host.x + 12, y: GROUND - 44 }];
      if (layout.par) spots.push({ x: layout.par.x + 8, y: GROUND - 25 });
      for (const couple of layout.couples) {
        spots.push({ x: couple.x + 6, y: GROUND - 22 }, { x: couple.x + 19, y: GROUND - 22 });
      }
      return spots[engine.state.request.active.who % spots.length];
    }

    function drawRequest(engine, now) {
      const active = engine.state.request.active;
      if (!active) return;
      const spot = requestTarget(engine);
      const icon = bundle.requests[active.kind];
      const bob = Math.round(Math.sin(now / 250));
      const w = icon.w + 4;
      const h = icon.h + 4;
      const x = Math.round(spot.x - w / 2);
      const y = spot.y - h - 5 + bob;
      g.fillStyle = INK;
      g.fillRect(x - 1, y, w + 2, h);
      g.fillRect(x, y - 1, w, h + 2);
      g.fillRect(spot.x - 1, y + h, 3, 2);
      g.fillRect(spot.x, y + h + 2, 1, 2);
      g.fillStyle = '#fff4e4';
      g.fillRect(x, y, w, h);
      g.fillRect(spot.x, y + h, 1, 2);
      sprite(icon, 0, x + 2, y + 2);
      regions.push({ id: 'request', x: x - 3, y: y - 3, w: w + 6, h: h + 10 });
    }

    function spawnFirework(now, delay = 0) {
      const x = layout.L + 20 + rng() * (layout.width - 40);
      const y = 12 + rng() * 34;
      fx.rockets.push({ x0: x + (rng() - 0.5) * 16, y0: GROUND - 4, x1: x, y1: y, born: now + delay, dur: 520 + rng() * 240,
        color: FLAGS[Math.floor(rng() * FLAGS.length)] });
    }

    function burst(rocket, now) {
      const { x1: x, y1: y, color } = rocket;
      const palette = ['#fffff0', color, color, '#fff07a'];
      const count = 20 + Math.floor(rng() * 8);
      for (let i = 0; i < count; i++) {
        const a = i / count * Math.PI * 2 + rng() * 0.2;
        const speed = 0.016 + rng() * 0.014;
        fx.particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, gravity: 0.000022,
          born: now, ttl: 900 + rng() * 600, colors: palette, trail: true, twinkle: rng() < 0.35 });
      }
      fx.flashes.push({ x, y, born: now, color });
    }

    // Foguetes subindo (desaceleram até estourar) e o clarão de cada estouro.
    function drawRockets(now) {
      for (let i = fx.rockets.length - 1; i >= 0; i--) {
        const r = fx.rockets[i];
        const t = (now - r.born) / r.dur;
        if (t < 0) continue;
        if (t >= 1) { burst(r, now); fx.rockets.splice(i, 1); continue; }
        const e = 1 - (1 - t) ** 2;
        for (let k = 0; k < 6; k++) {
          const tt = Math.max(0, e - k * 0.035);
          g.globalAlpha = 1 - k / 6;
          g.fillStyle = k === 0 ? '#fffff0' : k < 3 ? '#ffd21e' : '#ff8a12';
          g.fillRect(Math.round(r.x0 + (r.x1 - r.x0) * tt), Math.round(r.y0 + (r.y1 - r.y0) * tt), 1, 1);
        }
        g.globalAlpha = 1;
      }
      for (let i = fx.flashes.length - 1; i >= 0; i--) {
        const f = fx.flashes[i];
        const age = now - f.born;
        if (age > 320) { fx.flashes.splice(i, 1); continue; }
        halo(f.x, f.y, 11, f.color, 0.5 * (1 - age / 320));
        halo(f.x, f.y, 4, '#fffff0', 0.7 * (1 - age / 320));
      }
    }

    // Papel picado: cada pedaço tem frente e verso (vira enquanto cai), balança de lado e cai devagar.
    function confetti(now, x, y, count = 24) {
      for (let i = 0; i < count; i++) {
        const k = i % CONFETTI.length;
        fx.particles.push({ x, y, vx: (rng() - 0.5) * 0.055, vy: -0.035 - rng() * 0.03, gravity: 0.00005,
          born: now, ttl: 1800 + rng() * 900, colors: [CONFETTI[k], CONFETTI_BACK[k]], flip: 70 + rng() * 90,
          wobble: rng() * 6 });
      }
    }

    // Poeirinha do chão a cada passo da Mandioca.
    function dust(x, y, now) {
      for (let i = 0; i < 3; i++) {
        fx.particles.push({ x: x + (rng() - 0.5) * 10, y, vx: (rng() - 0.5) * 0.014, vy: -0.004 - rng() * 0.004,
          gravity: 0.000008, born: now, ttl: 380 + rng() * 220,
          colors: ['rgba(236, 206, 156, 0.85)', 'rgba(206, 174, 132, 0.55)', 'rgba(180, 150, 120, 0.25)'] });
      }
    }

    function say(text, x, y, now, color = '#fff07a', ttl = 1200, rise = 10) {
      const item = { text, x, y, born: now, ttl, color, rise };
      fx.texts.push(item);
      return item;
    }

    // Céu: lua, estrelas e a pipa amarrada no mastro da esquerda.
    function drawSky(now, poleTop) {
      const { L, R, has } = layout;
      if (has.has('estrelas')) {
        const room = Math.max(6, poleTop - 6);
        for (let i = 0; i < 28; i++) {
          const x = L + hash(i, 3) % layout.width;
          const y = 2 + hash(i, 5) % room;
          const glow = Math.sin(now / 700 + i * 1.7);
          g.fillStyle = glow > 0.6 ? '#fffff0' : glow > -0.3 ? '#fff07a' : 'rgba(255, 240, 122, 0.35)';
          g.fillRect(x, y, 1, 1);
          if (glow > 0.9) {
            g.fillStyle = 'rgba(255, 255, 240, 0.5)';
            g.fillRect(x - 1, y, 3, 1);
            g.fillRect(x, y - 1, 1, 3);
          }
        }
        spots.set('estrelas', { x: (L + R) / 2, y: 12 });
      }
      if (has.has('lua')) {
        const moon = bundle.scenery.lua;
        const x = R - moon.w - 6;
        const y = 4 + Math.round(Math.sin(now / 3000));
        halo(x + moon.w / 2, y + moon.h / 2, 13, '#fff4c0', 0.2);
        sprite(moon, 0, x, y);
        spots.set('lua', { x: x + moon.w / 2, y: y + 6 });
      }
      drawShootingStar(now, poleTop);
      if (has.has('pipa')) {
        const kite = bundle.scenery.pipa;
        const kx = Math.round(L + 22 + Math.sin(now / 1700) * 5);
        const ky = Math.round(Math.max(3, poleTop - 40) + Math.cos(now / 1300) * 3);
        const [ax, ay, bx, by] = [L - 2, poleTop, kx + 6, ky + 9];
        g.fillStyle = 'rgba(255, 244, 228, 0.8)';
        for (let k = 0; k <= 30; k++) {
          const t = k / 30;
          g.fillRect(Math.round(ax + (bx - ax) * t), Math.round(ay + (by - ay) * t + Math.sin(t * Math.PI) * 6), 1, 1);
        }
        sprite(kite, frameAt(kite, now), kx, ky);
        spots.set('pipa', { x: kx + 6, y: ky + 4 });
      }
    }

    // Estrela cadente: de vez em quando (da Quermesse em diante) risca o céu acima do varal, com rastro que apaga.
    function drawShootingStar(now, poleTop) {
      if (layout.tier < 1) return;
      if (!fx.nextShoot) fx.nextShoot = now + 6000 + rng() * 10000;
      if (!fx.shooting && now >= fx.nextShoot) {
        const dir = rng() < 0.5 ? -1 : 1;
        fx.shooting = { x: layout.L + layout.width * (dir > 0 ? 0.1 + rng() * 0.4 : 0.5 + rng() * 0.4), y: 3 + rng() * 10,
          vx: dir * (0.09 + rng() * 0.05), vy: 0.035 + rng() * 0.02, born: now, ttl: 650 };
        fx.nextShoot = now + 14000 + rng() * 22000;
      }
      const star = fx.shooting;
      if (!star) return;
      const age = now - star.born;
      if (age > star.ttl) { fx.shooting = null; return; }
      const fade = age > star.ttl * 0.7 ? (star.ttl - age) / (star.ttl * 0.3) : 1;
      for (let k = 0; k < 9; k++) {
        const t = Math.max(0, age - k * 14);
        const x = Math.round(star.x + star.vx * t);
        const y = Math.round(star.y + star.vy * t);
        if (y > poleTop - 2) continue;
        g.globalAlpha = fade * (1 - k / 9);
        g.fillStyle = k === 0 ? '#fffff0' : k < 3 ? '#fff07a' : '#cfe3ff';
        g.fillRect(x, y, 1, 1);
      }
      g.globalAlpha = 1;
    }

    // Morrinho verde atrás da plateia, onde os marcos do fundo ficam de pé (da Quermesse em diante).
    const RIDGE_H = 18;
    function buildRidge(width) {
      const image = document.createElement('canvas');
      image.width = width;
      image.height = RIDGE_H;
      const t = image.getContext('2d');
      for (let x = 0; x < width; x++) {
        const h = 12 + Math.round(1.5 + 1.5 * Math.sin(x / 19) + 0.8 * Math.sin(x / 7));
        const top = RIDGE_H - h;
        t.fillStyle = INK;
        t.fillRect(x, top - 1, 1, 1);
        t.fillStyle = RIDGE.top;
        t.fillRect(x, top, 1, 1);
        t.fillStyle = RIDGE.mid;
        t.fillRect(x, top + 1, 1, h - 4);
        t.fillStyle = RIDGE.low;
        t.fillRect(x, RIDGE_H - 3, 1, 3);
      }
      return image;
    }

    // Marcos do fundo: ficam atrás de tudo, com a tinta de distância; a casinha solta fumaça pela chaminé.
    function drawBack(now) {
      const lift = ridge ? 9 : 0;
      for (const item of layout.back) {
        const y = GROUND - 2 - lift - item.meta.h + 1;
        sprite(item.meta, frameAt(item.meta, now, item.x * 0.1), item.x, y);
        spots.set(item.id, { x: item.x + item.meta.w / 2, y });
        if (item.id.startsWith('casinha') && now >= fx.nextSmoke) {
          fx.nextSmoke = now + 450 + rng() * 400;
          fx.particles.push({ x: item.x + 23, y: y + 1, vx: 0.003, vy: -0.009, born: now, ttl: 1500 + rng() * 700,
            colors: ['rgba(255, 248, 232, 0.7)', 'rgba(200, 204, 214, 0.5)', 'rgba(200, 204, 214, 0.25)'], wobble: rng() * 6 });
        }
      }
      if (ridge) g.drawImage(ridge, layout.L, GROUND - RIDGE_H);
    }

    // Enfeites pendurados no primeiro varal: balõezinhos de papel e, mais tarde, o balão grande no meio.
    function drawHanging(now, poleTop, tier) {
      const top = poleTop + 2;
      const sag = 8 + tier * 3;
      const left = layout.L - 1;
      const right = layout.R + 1;
      const mid = (left + right) / 2;
      const half = (right - left) / 2;
      const stringY = x => Math.round(top + sag * (1 - ((x - mid) / half) ** 2));
      const lanterns = Math.min(40, layout.scenery.counts.balaozinho || 0);
      for (let i = 0; i < lanterns; i++) {
        const x = Math.round(left + (right - left) * (0.06 + 0.88 * spread(i, 0.31)));
        const y = stringY(x);
        const lx = x - 2 + Math.round(Math.sin(now / 520 + i * 1.3) * 0.9);
        const ly = y + 5;
        g.fillStyle = '#361a0c';
        g.fillRect(x, y + 1, 1, 4);
        g.fillStyle = INK;
        g.fillRect(lx + 1, ly, 3, 1);
        g.fillRect(lx, ly + 1, 5, 3);
        g.fillRect(lx + 1, ly + 4, 3, 1);
        halo(lx + 2, ly + 2, 4, FLAGS[i % FLAGS.length], 0.28);
        g.fillStyle = FLAGS[i % FLAGS.length];
        g.fillRect(lx + 1, ly + 1, 3, 3);
        g.fillStyle = Math.sin(now / 400 + i * 2.3) > -0.7 ? '#fff8e8' : '#ffd21e';
        g.fillRect(lx + 2, ly + 2, 1, 1);
        spots.set(`balaozinho:${i + 1}`, { x, y: ly });
      }
      if (layout.has.has('balao')) {
        const balloon = bundle.scenery.balao;
        const x = Math.round(mid);
        const y = stringY(x);
        g.fillStyle = '#361a0c';
        g.fillRect(x, y + 1, 1, 5);
        sprite(balloon, frameAt(balloon, now), x - Math.floor(balloon.w / 2) + Math.round(Math.sin(now / 900) * 1.2), y + 5);
        spots.set('balao', { x, y: y + 12 });
      }
    }

    // Mandioquinhas penduradas nas raízes, embaixo do terreiro flutuante.
    function drawRoots(now) {
      const count = Math.min(36, layout.scenery.counts.mandioquinha || 0);
      const baby = bundle.scenery.mandioquinha;
      for (let i = 0; i < count; i++) {
        const col = Math.round((layout.width - 1) * (0.08 + 0.84 * spread(i, 0.17)));
        const under = GROUND + terrain.bottoms[col] + 1;
        const length = 1 + hash(i, 29) % 4;
        const y = Math.min(under + length - 1, H - baby.h);
        g.fillStyle = '#4a2418';
        g.fillRect(layout.L + col, under, 1, Math.max(0, y - under + 1));
        // Penduradas na raiz, balançam devagar (cada uma no seu tempo).
        const swing = Math.round(Math.sin(now / 900 + i * 1.7) * 0.8);
        sprite(baby, frameAt(baby, now, i * 0.5), layout.L + col - Math.floor(baby.w / 2) + swing, y);
        spots.set(`mandioquinha:${i + 1}`, { x: layout.L + col, y: y + 4 });
      }
    }

    // Bichos que andam pelo terreiro: andam um pouco, param (bicar, pastar) e dão meia-volta nas bordas.
    function roam(state, now, lo, hi, speed, stop) {
      if (state.x === undefined || state.x < lo - 20 || state.x > hi + 20) {
        Object.assign(state, { x: lo + (hi - lo) * rng(), dir: rng() < 0.5 ? -1 : 1, mode: 'anda', until: 0, at: now });
      }
      const dt = Math.min(100, Math.max(0, now - state.at));
      state.at = now;
      if (now >= state.until) {
        state.mode = state.mode === 'anda' && rng() < stop ? 'para' : 'anda';
        state.until = now + (state.mode === 'anda' ? 1500 + rng() * 3500 : 1200 + rng() * 2400);
        if (state.mode === 'anda' && rng() < 0.35) state.dir = -state.dir;
      }
      if (state.mode === 'anda') {
        state.x += state.dir * speed * dt;
        if (state.x <= lo) { state.x = lo; state.dir = 1; }
        if (state.x >= hi) { state.x = hi; state.dir = -1; }
      }
      return state;
    }

    function drawCritters(now) {
      const has = layout.has;
      const lo = layout.danceLeft + 2;
      const hi = Math.max(lo + 10, layout.danceRight - 10);
      if (has.has('bode')) {
        const goat = bundle.scenery.bode;
        const state = roam(fx.goat, now, lo, Math.max(lo + 24, layout.host.x - 16), 0.004, 0.8);
        const frame = state.mode === 'anda' ? Math.floor(now / 260) % 2 : 2 + Math.floor(now / 420) % 2;
        sprite(goat, frame, state.x, GROUND - goat.h + 2, state.dir < 0);
        spots.set('bode', { x: state.x + goat.w / 2, y: GROUND - goat.h });
      }
      if (!has.has('galinha')) return;
      const hen = bundle.scenery.galinha;
      const state = roam(fx.hen, now, lo, hi, 0.008, 0.6);
      const chick = bundle.scenery.pintinho;
      const count = Math.min(12, layout.scenery.counts.pintinho || 0);
      for (let i = 0; i < count; i++) {
        const baby = fx.chicks[i] || (fx.chicks[i] = { x: state.x, dir: state.dir, at: now });
        const target = state.x + 2 - state.dir * (8 + i * 5);
        const dt = Math.min(100, Math.max(0, now - baby.at));
        baby.at = now;
        const gap = target - baby.x;
        const moving = Math.abs(gap) > 0.6;
        if (moving) {
          baby.x += Math.sign(gap) * Math.min(Math.abs(gap), 0.011 * dt);
          baby.dir = Math.sign(gap);
        }
        const frame = moving ? Math.floor(now / 120 + i) % 2 : (Math.floor(now / 700 + i) % 3 === 0 ? 2 : 0);
        sprite(chick, frame, baby.x, GROUND - chick.h + 2, (moving ? baby.dir : state.dir) < 0);
        spots.set(`pintinho:${i + 1}`, { x: baby.x + 3, y: GROUND - 6 });
      }
      const frame = state.mode === 'anda' ? Math.floor(now / 170) % 2 : 2 + Math.floor(now / 150) % 2;
      sprite(hen, frame, state.x, GROUND - hen.h + 2, state.dir < 0);
      spots.set('galinha', { x: state.x + hen.w / 2, y: GROUND - hen.h });
    }

    // Sopinha, o coelho mascote: anda aos pulinhos pelo terreiro, para para fungar e piscar, deita de lado quando a
    // Mandioca descansa e dá um binky (pulo de alegria com giro no ar) quando a festa comemora ou ganha carinho.
    const HOP_MS = 440;
    const HOP_DX = 9;
    const BINKY_MS = 760;
    const HEARTS = ['#ff4f9e', '#ff8a96'];
    function drawSopinha(engine, now) {
      if (!engine.charActive('sopinha')) return;
      const meta = bundle.chars.sopinha;
      const pose = meta.poses;
      const b = fx.bunny;
      const lo = layout.danceLeft + 2;
      const hi = Math.max(lo + 12, layout.danceRight - meta.w);
      if (b.x === undefined || b.x < lo - 20 || b.x > hi + 20) {
        Object.assign(b, { x: lo + (hi - lo) * rng(), dir: rng() < 0.5 ? -1 : 1, mode: 'senta', until: now + 1200,
          at: now, from: 0, hops: 0, seed: Math.floor(rng() * 5000), party: 0, poke: false });
      }
      const hop = () => {
        if (b.x + b.dir * HOP_DX > hi || b.x + b.dir * HOP_DX < lo) b.dir = -b.dir;
        Object.assign(b, { mode: 'pula', from: b.x, at: now, until: now + HOP_MS });
      };
      if (b.mode === 'pula' && now >= b.until) b.x = Math.max(lo, Math.min(hi, b.from + b.dir * HOP_DX));
      const party = now < fx.celebrateUntil && b.party !== fx.celebrateUntil;
      if (b.poke || party) {
        if (party) b.party = fx.celebrateUntil;
        b.poke = false;
        Object.assign(b, { mode: 'binky', at: now, until: now + BINKY_MS });
        for (let i = 0; i < 3; i++) float('coracao', b.x + meta.w / 2 + (i - 1) * 7, GROUND - meta.h - 16 - i % 2 * 3, now, HEARTS);
      } else if (now >= b.until) {
        const resting = !engine.state.runtime.dancing;
        if (b.mode === 'pula' && b.hops > 1) { b.hops--; hop(); }
        else if (resting && b.mode !== 'deita' && rng() < 0.6) Object.assign(b, { mode: 'deita', until: now + 3000 + rng() * 4000 });
        else if (resting && b.mode === 'deita') b.until = now + 1500;
        else if (b.mode === 'senta' && rng() < 0.65) {
          if (rng() < 0.35) b.dir = -b.dir;
          b.hops = 2 + Math.floor(rng() * 4);
          hop();
        } else {
          if (b.mode === 'senta' && rng() < 0.5) b.dir = -b.dir;
          Object.assign(b, { mode: 'senta', until: now + 1400 + rng() * 2600 });
        }
      }
      let x = b.x;
      let lift = 0;
      let frame = pose.senta;
      let flip = b.dir < 0;
      if (b.mode === 'pula') {
        const p = Math.min(1, (now - b.at) / HOP_MS);
        if (p >= 0.28) {
          const t = (p - 0.28) / 0.72;
          x = b.from + b.dir * HOP_DX * t;
          lift = Math.round(Math.sin(Math.PI * t) * 5);
          if (t < 0.85) frame = pose.pulo;
        } else x = b.from;
        if (p >= 1 && now - fx.dustAt > 170) { fx.dustAt = now; dust(x + meta.w / 2, GROUND - 1, now); }
      } else if (b.mode === 'binky') {
        const t = Math.min(1, (now - b.at) / BINKY_MS);
        lift = Math.round(Math.sin(Math.PI * t) * 11);
        frame = t < 0.9 ? pose.pulo : pose.senta;
        // O giro no ar: vira para o outro lado no alto do pulo e volta antes de pousar.
        if (t > 0.3 && t < 0.7) flip = !flip;
      } else if (b.mode === 'deita') {
        frame = pose.deita;
        if (now >= (fx.nextHeart.sopinha || 0)) {
          fx.nextHeart.sopinha = now + 2600 + rng() * 2400;
          float('coracao', x + meta.w / 2 + b.dir * 6, GROUND - 12, now, HEARTS);
        }
      } else {
        const t = now + b.seed;
        if (t % 2600 < 560) frame = Math.floor(t / 90) % 2 ? pose.funga : pose.senta;
        if (t % 3700 < 140) frame = pose.pisca;
        else if (t % 5300 < 220) frame = pose.orelha;
      }
      const cx = x + meta.w / 2;
      const y = GROUND - meta.h + 2 - lift;
      shadow(cx, Math.max(8, 18 - lift), 0.8);
      sprite(meta, frame, x, y, flip);
      rim(meta, frame, x, y, flip, cx);
      regions.push({ id: 'sopinha', x: Math.round(x), y: Math.round(y), w: meta.w, h: meta.h });
    }

    // Carinho no Sopinha (clique): ele responde com um binky.
    function poke(id) {
      if (id === 'sopinha') fx.bunny.poke = true;
    }

    // Peça nova de cenário: brilho no lugar dela e o nome subindo.
    function popScenery(now) {
      for (const pop of fx.pops.splice(0)) {
        const piece = pop.piece;
        const spot = spots.get(piece.landmark ? piece.id : `${piece.id}:${piece.index}`) || spots.get(piece.id) ||
          { x: layout.host.x + 12, y: GROUND - 50 };
        for (let i = 0; i < 14; i++) {
          const a = i / 14 * Math.PI * 2;
          fx.particles.push({ x: spot.x, y: spot.y, vx: Math.cos(a) * 0.02, vy: Math.sin(a) * 0.02, gravity: 0.00001,
            born: now, ttl: 700 + rng() * 300, colors: ['#fffff0', '#fff07a', '#9ef05a'] });
        }
        const label = `+ ${piece.name}`;
        const half = label.length * 2 + 2;
        const x = Math.min(layout.R - half, Math.max(layout.L + half, spot.x));
        say(label, x, Math.max(10, spot.y - 8), now, '#9ef05a', 2000, 8);
      }
    }

    function drawShape(rows, x, y, color, alpha) {
      g.globalAlpha = alpha;
      for (const [fill, grow] of [[INK, 1], [color, 0]]) {
        g.fillStyle = fill;
        rows.forEach((row, dy) => [...row].forEach((bit, dx) => {
          if (bit === '1') g.fillRect(x + dx - grow, y + dy - grow, 1 + grow * 2, 1 + grow * 2);
        }));
      }
      g.globalAlpha = 1;
    }

    function drawEffects(engine, now) {
      const tier = layout.tier;
      if (tier >= 4 && now >= fx.nextFirework) { fx.nextFirework = now + 900 + rng() * 1800; spawnFirework(now); }
      const r = engine.state.runtime;
      if (!r.dancing && now >= fx.nextSweat) {
        fx.nextSweat = now + 750;
        fx.particles.push({ x: layout.host.x + 21, y: GROUND - 30, vx: 0.002, vy: 0.012, born: now, ttl: 420,
          colors: ['#9fc8ff'], drop: true });
      }
      drawRockets(now);
      const at = (p, age) => [p.x + p.vx * age + (p.wobble ? Math.sin(age / 120 + p.wobble) * (p.flip ? 2 : 0.8) : 0),
        p.y + p.vy * age + (p.gravity ? p.gravity * age * age : 0)];
      for (let i = fx.particles.length - 1; i >= 0; i--) {
        const p = fx.particles[i];
        const age = now - p.born;
        if (age > p.ttl) { fx.particles.splice(i, 1); continue; }
        const t = age / p.ttl;
        const [x, y] = at(p, age);
        if (p.shape) { drawShape(SHAPES[p.shape], Math.round(x), Math.round(y), p.colors[0], t > 0.7 ? (1 - t) / 0.3 : 1); continue; }
        if (p.smoke) {
          // Fumaça: um disco pontilhado que cresce e some enquanto sobe.
          const radius = Math.min(5, 1 + Math.floor(t * 5));
          g.globalAlpha = 0.3 * (1 - t);
          g.drawImage(glow(radius, SMOKE, 1.1), Math.round(x - radius), Math.round(y - radius));
          g.globalAlpha = 1;
          continue;
        }
        if (p.ember) {
          // Brasa: brilha em volta no começo e esfria do branco ao vermelho escuro.
          if (t < 0.55) halo(x, y, 2, '#ffac2a', 0.4 * (1 - t / 0.55));
          g.fillStyle = SPARK[Math.min(SPARK.length - 1, Math.floor(t * SPARK.length))];
          g.fillRect(Math.round(x), Math.round(y), p.big ? 2 : 1, p.big ? 2 : 1);
          continue;
        }
        if (p.flip) {
          const face = Math.floor(age / p.flip) % 2;
          g.globalAlpha = t > 0.8 ? (1 - t) / 0.2 : 1;
          g.fillStyle = p.colors[face];
          g.fillRect(Math.round(x), Math.round(y), face ? 1 : 2, face ? 2 : 1);
          g.globalAlpha = 1;
          continue;
        }
        if (p.twinkle && t > 0.5 && Math.floor(age / 60) % 2) continue;
        if (p.trail && age > 50) {
          const [tx, ty] = at(p, age - 50);
          g.globalAlpha = 0.45 * (1 - t);
          g.fillStyle = p.colors[Math.min(p.colors.length - 1, Math.floor(t * p.colors.length) + 1)];
          g.fillRect(Math.round(tx), Math.round(ty), 1, 1);
          g.globalAlpha = 1;
        }
        g.fillStyle = p.colors[Math.min(p.colors.length - 1, Math.floor(t * p.colors.length))];
        g.fillRect(Math.round(x), Math.round(y), 1, p.drop ? 2 : 1);
        if (p.drop) { g.fillStyle = '#ffffff'; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
      }
      if (fx.stepSum && now - fx.stepAt > 140) {
        // Os números dos passos não se atropelam: o novo empurra os anteriores para cima, em pilha.
        let top = GROUND - 50;
        for (let i = fx.texts.length - 1; i >= 0; i--) {
          const item = fx.texts[i];
          if (!item.step) continue;
          const y = item.y - item.rise * Math.min(1, (now - item.born) / item.ttl * 1.6);
          if (y > top - 8) item.y -= y - (top - 8);
          top = Math.min(y, top - 8);
        }
        say(`+${amount(fx.stepSum)}`, layout.host.x + 12, GROUND - 50, now, fx.stepCrit ? '#ff907a' : '#fff07a', 900, 12).step = true;
        fx.stepSum = 0;
        fx.stepCrit = false;
      }
      for (let i = fx.texts.length - 1; i >= 0; i--) {
        const item = fx.texts[i];
        const age = now - item.born;
        if (age > item.ttl) { fx.texts.splice(i, 1); continue; }
        const t = age / item.ttl;
        write(item.text, item.x, item.y - item.rise * Math.min(1, t * 1.6), item.color, t > 0.75 ? (1 - t) * 4 : 1);
      }
      const bugs = Math.min(40, 3 + (layout.scenery.counts.vagalume || 0));
      // Vaga-lumes: três desde o começo e mais um a cada vaga-lume que o cenário ganha.
      for (let i = 0; i < bugs; i++) {
        const s = now / 1000 * (0.6 + (i % 5) * 0.15);
        const base = i < 3 ? 0.2 + 0.3 * i : 0.05 + 0.9 * spread(i, 0.13);
        const x = Math.round(layout.L + layout.width * base + Math.sin(s + i * 2.1) * 18);
        const y = Math.round(GROUND - 60 + (i % 6) * 7 + Math.cos(s * 1.3 + i) * 8);
        if (i >= 3) spots.set(`vagalume:${i - 2}`, { x, y });
        const glow = Math.sin(s * 3 + i * 6);
        if (glow < -0.2) continue;
        halo(x, y, 3, '#fff07a', 0.2 + 0.25 * Math.max(0, glow));
        if (glow > 0.5) {
          g.fillStyle = 'rgba(255,240,122,0.35)';
          g.fillRect(x - 1, y, 3, 1);
          g.fillRect(x, y - 1, 1, 3);
        }
        g.fillStyle = '#fff07a';
        g.fillRect(x, y, 1, 1);
      }
    }

    // Luz da cena: a fogueira pinta de laranja o chão e quem está perto (o miolo mais amarelo); o palco tem a sua
    // luz quente. Tudo em 'source-atop': a luz cai só no que foi desenhado.
    function drawLights(engine, now) {
      const source = fx.light;
      const reach = Math.round(Math.min(96, 30 + layout.fire.meta.w * 1.4));
      light(source.x, GROUND - 6, reach, FIRE_LIGHT, 0.34 * source.power);
      light(source.x, source.y, Math.round(reach * 0.5), FIRE_CORE, 0.22 * source.power);
      if (layout.stage) {
        const meta = layout.stage.meta;
        light(layout.stage.x + meta.w / 2, GROUND - 6 - meta.h * 0.45, Math.round(meta.w * 0.42), '#fff2c6', 0.13);
        // Canhões de luz do forró (do São João Regional em diante): dois fachos coloridos varrendo o palco.
        if (layout.tier >= 3) {
          const top = GROUND - 6 - meta.h + 12;
          const floor = GROUND - 6 - meta.h + 1 + meta.floor;
          g.globalCompositeOperation = 'source-atop';
          for (let k = 0; k < 2; k++) {
            const cx = layout.stage.x + meta.w * (0.5 + 0.34 * Math.sin(now / 1500 + k * Math.PI));
            g.fillStyle = FLAGS[(Math.floor(now / 3000) + k * 3) % FLAGS.length];
            for (let y = top; y <= floor; y++) {
              const half = 2 + (y - top) * 0.45;
              g.globalAlpha = 0.14 * (0.5 + 0.5 * (y - top) / (floor - top));
              g.fillRect(Math.round(cx - half), y, Math.round(half * 2), 1);
            }
          }
          g.globalAlpha = 1;
          g.globalCompositeOperation = 'source-over';
        }
      }
    }

    // Eventos do motor viram efeitos na festa.
    function onEvents(engine, events, now = root.performance?.now?.() || 0) {
      if (!layout) return;
      const hostX = layout.host.x + 12;
      for (const event of events) {
        if (event.type === 'step') {
          fx.stepSum += event.value;
          fx.stepAt = now;
          if (now - fx.dustAt > 170) {
            fx.dustAt = now;
            dust(hostX, layout.tier >= 2 ? GROUND - 4 : GROUND - 1, now);
          }
          if (event.crit) {
            fx.stepCrit = true;
            fx.jumpUntil = now + 320;
            say(tr('fx.cobra'), hostX, GROUND - 62, now, '#ff907a', 1100, 6);
          }
        } else if (event.type === 'rest-start') say(tr('fx.phew'), hostX + 14, GROUND - 40, now, '#fff8e8', 1300, 5);
        else if (event.type === 'rest-end' && engine.state.bonfire.brasa > 0) say(tr('fx.ember'), hostX, GROUND - 56, now, '#ffac2a');
        else if (event.type === 'flare-start') {
          say(tr('fx.flare'), layout.fire.x + layout.fire.meta.w / 2, GROUND - layout.fire.meta.h - 6, now, '#ffac2a', 1400, 8);
        } else if (event.type === 'tier-up' || event.type === 'legendary') {
          fx.celebrateUntil = now + 1400;
          confetti(now, hostX, GROUND - 40, 40);
          for (let k = 0; k < 3; k++) spawnFirework(now, k * 260);
        } else if (event.type === 'size-up') {
          say(tr('fx.guests', { n: event.count }), hostX, GROUND - 70, now, '#9ef05a', 1500, 8);
          for (let size = event.size - event.count + 1; size <= event.size; size++) {
            const piece = engine.sceneryPiece?.(size);
            if (piece) fx.pops.push({ piece });
          }
          fx.pops = fx.pops.slice(-3);
        } else if (event.type === 'fished' || event.type === 'item') {
          fx.celebrateUntil = now + 900;
          confetti(now, hostX, GROUND - 40, 18);
        }
      }
    }

    function celebrate(now, text) {
      fx.celebrateUntil = now + 1100;
      if (layout) {
        confetti(now, layout.host.x + 12, GROUND - 40, 20);
        if (text) say(text, layout.host.x + 12, GROUND - 64, now, '#9ef05a', 1400, 8);
      }
    }

    function trackArrivals(now) {
      const shown = layout.couples.length + layout.audience.length;
      if (fx.guestsShown !== null && shown > fx.guestsShown) {
        for (const couple of layout.couples.slice(-(shown - fx.guestsShown))) {
          fx.arrivals.set(`${bundle.crowd.dancers.image}:${couple.index}`,
            { at: now, from: couple.x < layout.host.x ? layout.L - 30 : layout.R + 10 });
        }
      }
      fx.guestsShown = shown;
    }

    // Tudo o que aparece num quadro, de trás para frente.
    function paint(engine, now, preview, eq) {
      const s = engine.state;
      const tier = layout.tier;
      const poleTop = GROUND - POLE_H[tier];
      drawSky(now, poleTop);
      drawBack(now);
      drawBackdrop(now);
      drawStage(engine, now);
      drawCrowd(engine, now, layout.audience, bundle.crowd.audience, GROUND - 9, false);
      drawPole(layout.L - 3, poleTop);
      drawPole(layout.R + 1, poleTop);
      for (let i = 0; i < STRINGS[tier]; i++) {
        const lamps = tier >= 4 && i === 1;
        drawBunting(layout.L - 1, layout.R + 1, poleTop + 2 + i * 9, 8 + tier * 3 - i * 2, i * 3, lamps, now);
      }
      drawHanging(now, poleTop, tier);
      g.drawImage(terrain.image, layout.L - 1, GROUND - terrain.top);
      drawRoots(now);
      regions.push({ id: 'terreiro', x: layout.L, y: GROUND, w: layout.width, h: terrain.bottom - terrain.top });
      if (tier >= 2) drawDanceFloor(layout.danceLeft, layout.danceRight);
      drawSide(engine, layout.leftSide, now, 'lado-esquerda');
      drawCrowd(engine, now, layout.couples, bundle.crowd.dancers, GROUND - 3 * (tier >= 2 ? 1 : 0), true);
      const dance = tier >= 2 ? -3 : 0;
      drawHost(engine, now, dance, eq);
      if (preview) write(tr('fx.preview'), layout.host.x + 12, GROUND + dance - 60, '#9fc8ff');
      if (layout.par) {
        const milho = bundle.chars.milho;
        const frame = s.runtime.dancing ? Math.floor(s.runtime.lift * 4) % 4 : 0;
        shadow(layout.par.x + 8, 10);
        sprite(milho, frame, layout.par.x, GROUND + dance - milho.h + 1);
        rim(milho, frame, layout.par.x, GROUND + dance - milho.h + 1, false, layout.par.x + 8);
        regions.push({ id: 'par', x: layout.par.x, y: GROUND + dance - milho.h, w: milho.w, h: milho.h });
      }
      drawCritters(now);
      drawSopinha(engine, now);
      drawCaller(engine, now);
      drawFire(engine, now);
      drawSide(engine, layout.rightSide, now, 'lado-direita');
      drawCrasher(engine, now);
      drawRequest(engine, now);
      drawLights(engine, now);
      drawEffects(engine, now);
      popScenery(now);
    }

    function draw(engine, now, preview = null) {
      if (pending > 0 || now - fx.lastDraw < minFrame) return;
      fx.lastDraw = now;
      const s = engine.state;
      const eq = withPreview(s.equipped, preview);
      const next = buildLayout(engine, eq);
      if (next.key !== layoutKey) {
        layout = next;
        layoutKey = next.key;
        const width = next.width + MARGIN * 2;
        if (width !== view.width) resize(width);
        else applyScale();
        const palette = bundle.terrains[eq.terreiro] || bundle.terrains['terra-batida'];
        terrain = buildTerrain(next.width, palette, (s.seed || 1) + next.width);
        ridge = next.tier >= 1 && next.back.length ? buildRidge(next.width) : null;
        trackArrivals(now);
      }
      regions = [];
      spots = new Map();
      view.float = Math.round(Math.sin(now / 1400));
      const fire = layout.fire;
      const flicker = 0.86 + 0.09 * Math.sin(now / 83) + 0.05 * Math.sin(now / 29 + 1.7);
      fx.light = { x: fire.x + fire.meta.w / 2, y: GROUND - fire.meta.h * 0.4,
        power: flicker * (engine.flareActive ? 1.3 : 1), reach: 60 + fire.meta.w * 1.8 };
      g.clearRect(0, 0, buffer.width, buffer.height);
      g.save();
      g.translate(0, view.float);
      // Um erro no meio do quadro não deixa o pincel torto (deslocamento, transparência, modo de mistura) para os
      // próximos: o quadro quebrado não vai para a tela e o seguinte começa limpo.
      try {
        paint(engine, now, preview, eq);
      } finally {
        g.restore();
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
      }
      out.clearRect(0, 0, canvas.width, canvas.height);
      out.imageSmoothingEnabled = false;
      out.drawImage(buffer, 0, 0, canvas.width, canvas.height);
    }

    function locate(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      const x = Math.floor((clientX - rect.left) / rect.width * view.width);
      const y = Math.floor((clientY - rect.top) / rect.height * H);
      if (x < 0 || y < 0 || x >= view.width || y >= H) return null;
      return { x, y };
    }

    // Devolve o que está sob o cursor: um alvo clicável, 'festa' (pixel opaco) ou null.
    function hit(clientX, clientY) {
      const point = locate(clientX, clientY);
      if (!point) return null;
      const y = point.y - view.float;
      for (let i = regions.length - 1; i >= 0; i--) {
        const area = regions[i];
        if (area.id === 'terreiro') continue;
        if (point.x >= area.x && point.x < area.x + area.w && y >= area.y && y < area.y + area.h) {
          const data = g.getImageData(Math.max(0, point.x - 1), Math.max(0, point.y - 1), 3, 3).data;
          for (let k = 3; k < data.length; k += 4) if (data[k] > 0) return area.id;
          if (['request', 'crasher'].includes(area.id)) return area.id;
        }
      }
      const data = g.getImageData(Math.max(0, point.x - 1), Math.max(0, point.y - 1), 3, 3).data;
      for (let k = 3; k < data.length; k += 4) {
        if (data[k] > 0) {
          const ground = regions.find(area => area.id === 'terreiro');
          return ground && y >= ground.y - 2 ? 'terreiro' : 'festa';
        }
      }
      return null;
    }

    // Onde fica cada região da festa na página (px), sem ler pixel nenhum: o gravador do trailer mira a câmera com isso.
    function areas() {
      const rect = canvas.getBoundingClientRect();
      const kx = rect.width / view.width;
      const ky = rect.height / H;
      return regions.map(area => ({ id: area.id, box: [rect.left + area.x * kx, rect.top + (area.y + view.float) * ky,
        rect.left + (area.x + area.w) * kx, rect.top + (area.y + area.h + view.float) * ky] }));
    }

    function photo(scale = 4) {
      const shot = document.createElement('canvas');
      shot.width = view.width * scale;
      shot.height = H * scale;
      const p = shot.getContext('2d');
      p.imageSmoothingEnabled = false;
      const sky = p.createLinearGradient(0, 0, 0, shot.height);
      sky.addColorStop(0, '#1c1a3a');
      sky.addColorStop(0.7, '#5c4a8a');
      sky.addColorStop(1, '#e28a6e');
      p.fillStyle = sky;
      p.fillRect(0, 0, shot.width, shot.height);
      p.drawImage(buffer, 0, 0, shot.width, shot.height);
      return shot.toDataURL('image/png');
    }

    function sizeInfo() {
      const dpr = root.devicePixelRatio || 1;
      const k = view.physical / dpr;
      const tier = layout ? layout.tier : 0;
      return { width: view.width * k, height: H * k, ground: GROUND, logicalWidth: view.width,
        top: (H - (GROUND - POLE_H[tier]) + 3) * k, physical: view.physical, base: Math.max(1, Math.round(3 * dpr)),
        capped: !!view.capped };
    }

    // Quadros por segundo: 60 com o jogo em foco (alguém olhando e clicando), menos quando ele fica de fundo.
    function setRate(fps) {
      minFrame = Math.max(0, 1000 / fps - 2);
    }

    return { draw, setScale, setRate, hit, onEvents, celebrate, poke, photo, areas, size: sizeInfo };
  }

  root.ArraiaFesta = { create, terrainWidth, amount, pixelText, withPreview };
})(typeof globalThis !== 'undefined' ? globalThis : this);
