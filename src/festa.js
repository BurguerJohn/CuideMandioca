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
  const BASE_H = 204;
  const BASE_GROUND = 160;
  // Com ilhas flutuando no céu, a festa ganha céu em cima: a altura e o chão descem juntos, e o fundo do terreiro
  // continua no mesmo lugar da tela (a festa cresce para cima, onde a tela tem espaço).
  const ISLAND_SKY = 50;
  const ISLAND_W = 84;
  const ISLANDS = ['ilha-quadrilha', 'ilha-baloes'];
  const TIER_MIN = [128, 190, 270, 340, 400];
  const MAX_W = 600;
  const POLE_H = [40, 56, 92, 124, 140];
  const STRINGS = [1, 1, 2, 3, 3];
  // Formas das partículas desenhadas pixel a pixel (1 = pinta), com contorno escuro.
  // O que cada barraca ou enfeite do lado diz quando alguém clica (src/lang, fx.side.*).
  const SIDE_SAYS = { 'barraca-beijo': 'fx.side.beijo', 'barraca-comidas': 'fx.side.comidas', cadeia: 'fx.side.cadeia',
    espantalho: 'fx.side.espantalho', fardo: 'fx.side.fardo', mastro: 'fx.side.mastro', carroca: 'fx.side.carroca',
    'barril-quentao': 'fx.side.quentao', 'fogao-lenha': 'fx.side.fogao' };
  // Enfeites do fundo que giram mais depressa depois de um clique.
  const SPINNERS = new Set(['carrossel', 'catavento']);
  // Números do bingo que o locutor canta com apelido (src/lang, fx.bingoCall.<n>).
  const BINGO_CALLS = [1, 3, 7, 11, 13, 15, 18, 22, 24, 29];
  const SHAPES = { coracao: ['101', '111', '010'], nota: ['011', '010', '110', '110'], brilho: ['010', '111', '010'] };
  // Marcos de cenário que ficam no fundo, atrás da plateia.
  const BACK_AT = ['milharal', 'bananeira', 'mandacaru', 'casinha', 'coqueiro', 'igrejinha', 'casinha-azul', 'catavento',
    'carrossel'];
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
    // 3 px por convidado até ~110 convidados (440 px); depois a festa segue crescendo, 2 px por convidado, até 600.
    const size = engine.state.size;
    const grown = size <= 110 ? 112 + 3 * (size - 1) : 439 + 2 * (size - 110);
    return Math.min(MAX_W, Math.max(TIER_MIN[engine.tierIndex()], grown));
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

  // `hooks.sound(nome)` toca um som do jogo (a festa só pede; quem toca é o app, que respeita o som desligado).
  function create(canvas, bundle, hooks = {}) {
    let H = BASE_H;
    let GROUND = BASE_GROUND;
    const sound = name => { try { hooks.sound?.(name); } catch (_) { /* som é enfeite */ } };
    const images = {};
    let pending = 0;
    for (const [name, src] of Object.entries(bundle.images)) {
      const image = new Image();
      pending++;
      image.onload = () => { pending--; };
      image.src = src;
      images[name] = image;
    }
    // Ícones do painel que a festa também desenha (a figurinha nova do Álbum), carregados só quando precisa.
    const iconImages = {};
    function iconImage(key) {
      const entry = bundle.icons && bundle.icons[key];
      if (!entry) return null;
      if (!iconImages[key]) {
        const image = new Image();
        image.src = entry.src;
        iconImages[key] = image;
      }
      const image = iconImages[key];
      return image.complete && image.width ? { image, w: entry.w, h: entry.h } : null;
    }
    // A festa é pintada direto no canvas da página, no tamanho da arte (o CSS amplia). Ele fica na memória comum
    // (willReadFrequently) porque o clique lê os pixels para saber em que o cursor está.
    const buffer = canvas;
    const g = canvas.getContext('2d', { willReadFrequently: true });
    const view = { css: 3, physical: 3, width: 0, float: 0, limit: null, capped: false };
    // A Mandioca cresce: cada tamanho tem as suas folhas (art/exportar.py, GROWTH). `fx.scale` é o tamanho de agora,
    // para posicionar textos e efeitos em volta dela.
    const stageOf = engine => Math.min(engine.growthStage ? engine.growthStage() : 99, bundle.mandioca.growth.length - 1);
    const kitOf = engine => bundle.mandioca.growth[stageOf(engine)];
    const sized = (meta, stage) => (meta.growth && stage < meta.growth.length ? meta.growth[stage] : meta);
    const RING_MS = 11000;
    const SPROUT_MS = 1800;
    const TUNNEL_S = 3.2;
    const RING_EASE = 1200;
    const RING_TURN = 4200;
    const GROW_FLASH = 420;
    const GROW_MS = 950;
    const freshEffects = () => ({
      scale: 1, grow: null, react: {}, restKind: 'ofega', danceSayAt: 0, nextGlitter: 0, wx: { rain: 0, rainbow: 0 }, flashUntil: 0,
      particles: [], texts: [], arrivals: new Map(), shown: {}, celebrateUntil: 0, jumpUntil: 0,
      nextBlink: 0, blinkUntil: 0, nextSpark: 0, nextSweat: 0, nextFirework: 0, nextNote: 0, nextHeart: {}, frame: 0, previous: 0,
      lastDraw: 0, stepSum: 0, stepCrit: false, stepAt: 0, crasherSeen: null, leaving: null,
      frog: {}, jailUntil: 0, nextPlea: 0, spinners: {}, lanternId: 0, sprout: null, wet: 0, wetAt: 0, wind: null, nextWind: 0, windNow: 0, pote: { sway: 0, at: 0 }, potePos: null, look: null, announce: null, sticker: null, cold: 0, coldAt: 0, nextBreath: 0, saco: { hop: null, exit: null, last: null, nextYou: 0 }, sacoPos: null, leilao: { hit: 0, sold: null, bid: 0 }, leilaoPos: null, scorecards: null, scoreUntil: 0, pigeon: null, nextChat: 0, weddingStage: -1, riceUntil: 0, ring: null, nextRing: 0, kidDraw: [], hen: {}, goat: {}, boi: {}, jegue: {}, dog: {}, peddler: {}, bunny: {}, chicks: [], kids: [], lanterns: [], nextLantern: 0, wave: null, nextWave: 0,
      nextZ: 0, nextSmoke: 0, pops: [],
      light: null, nextFireSmoke: 0, dustAt: 0, rockets: [], flashes: [], shooting: null, nextShoot: 0, glintAt: 0
    });
    let fx = freshEffects();
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
    let sky = 0;
    let islandTerrains = [];
    let regions = [];
    let spots = new Map();
    const rng = Math.random;
    let rate = 60;
    let flashOn = true;
    let calm = false;
    let sleepy = false;
    let minFrame = 15;

    function resize(width) {
      view.width = width;
      buffer.width = width;
      buffer.height = H;
      applyScale();
    }

    // Altura do que aparece: do fundo do terreiro ao topo dos mastros, ou das ilhas do céu (o céu acima é transparente).
    const contentTop = () => GROUND - POLE_H[layout ? layout.tier : 0] - (sky ? ISLAND_SKY - 8 : 0);
    const contentHeight = () => H - contentTop() + 3;

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
      // O canvas é o próprio buffer (resize já mudou a largura dele): o que diz se falta atualizar é o tamanho que o CSS
      // mostra. Sem isso, a festa que ganhava largura com um convidado novo ficava esticada até a escala mudar.
      const applied = `${view.width}|${H}|${physical}|${dpr}`;
      if (applied === view.applied) return;
      view.applied = applied;
      view.physical = physical;
      // O canvas tem o tamanho da festa em pixels de arte; quem amplia é o CSS (image-rendering: pixelated), por um
      // fator inteiro de pixels da tela. Ampliar na mão a cada quadro era a maior conta da festa cheia.
      if (canvas.width !== view.width) canvas.width = view.width;
      if (canvas.height !== H) canvas.height = H;
      canvas.style.width = `${view.width * physical / dpr}px`;
      canvas.style.height = `${H * physical / dpr}px`;
      updateRate();
    }

    function setScale(css, limit = null) {
      view.css = css;
      view.limit = limit;
      if (view.width) applyScale();
    }

    function frameAt(meta, now, phase = 0) {
      return meta.frames > 1 && meta.fps ? Math.floor(now / 1000 * meta.fps + phase) % meta.frames : 0;
    }

    // Folhas espelhadas (quem anda ou olha para a esquerda): cada folha é espelhada uma vez só, na primeira vez que alguém
    // vira, e fica guardada. Espelhar a tira inteira inverte a ordem dos quadros. Poupa o save/translate/scale/restore de
    // cada sprite virado (na festa cheia eram centenas por quadro).
    const mirrored = new Map();
    function mirror(name) {
      if (mirrored.has(name)) return mirrored.get(name);
      const image = images[name];
      let out = null;
      if (image && image.width > 0 && image.height > 0) {
        const copy = document.createElement('canvas');
        copy.width = image.width;
        copy.height = image.height;
        const p = copy.getContext('2d');
        if (p) {
          p.translate(image.width, 0);
          p.scale(-1, 1);
          p.drawImage(image, 0, 0);
          out = copy;
        }
      }
      mirrored.set(name, out);
      return out;
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
      const flipped = mirror(meta.image);
      if (flipped) {
        g.drawImage(flipped, flipped.width - sx - meta.w, 0, meta.w, meta.h, x, y, meta.w, meta.h);
        return;
      }
      g.save();
      g.translate(x + meta.w, y);
      g.scale(-1, 1);
      g.drawImage(image, sx, 0, meta.w, meta.h, 0, 0, meta.w, meta.h);
      g.restore();
    }

    // Sombra de contato: miolo escuro, meia-sombra nas pontas e uma segunda linha mais curta (elipse achatada).
    // Cada sombra (largura e força) é pintada uma vez numa imagenzinha e reusada: eram quatro retângulos por sombra.
    const shadows = new Map();
    function shadow(cx, width, strength = 1) {
      const w = Math.max(1, Math.round(width));
      const x = Math.round(cx - w / 2);
      const level = Math.round(Math.max(0, Math.min(1, strength)) * 10);
      if (!level) return;
      const key = w * 16 + level;
      let image = shadows.get(key);
      if (!image) {
        image = document.createElement('canvas');
        image.width = w + 4;
        image.height = 3;
        const p = image.getContext('2d');
        p.globalAlpha = level / 10;
        p.fillStyle = 'rgba(18, 9, 6, 0.16)';
        p.fillRect(0, 0, w + 4, 1);
        p.fillStyle = SHADOW;
        p.fillRect(2, 0, w, 1);
        p.fillRect(4, 1, Math.max(0, w - 4), 1);
        p.fillStyle = 'rgba(18, 9, 6, 0.14)';
        p.fillRect(6, 2, Math.max(0, w - 8), 1);
        if (shadows.size > 200) shadows.clear();
        shadows.set(key, image);
      }
      g.drawImage(image, x - 2, GROUND);
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
      // A ilha fica mais funda conforme alarga (26 linhas com 440 px, 33 com 600).
      const depth = 12 + Math.round((width - 112) / 328 * 14);
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
      const lay = { tier, width, L, R, couples: [], backCouples: [], audience: [], audience2: [], audience3: [] };
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
      let rest = guests - couples * 2;
      // Quadrilha de verdade tem duas filas: com a da frente cheia, os pares seguintes dançam atrás, meio passo ao lado.
      if (tier >= 1 && couples === slots.length) {
        const back = slots.map(x => x + 13).filter(x => x + 25 <= right);
        const count = Math.min(Math.floor(rest / 2), back.length);
        for (let i = 0; i < count; i++) lay.backCouples.push({ x: back[i], index: 200 + i });
        rest -= count * 2;
      }
      // Casamento na roça: o par da frente mais perto da Mandioca que tem outro par do lado de fora vira os noivos, e o
      // padre fica no lugar do par vizinho; o caramanchão de flores fica atrás. Sem par vizinho, casa só o casal.
      if (lay.couples.length) {
        const options = lay.couples.map(couple => {
          const dir = couple.x > lay.host.x ? 1 : -1;
          const next = lay.couples.find(other => other.index !== couple.index && Math.abs(other.x - (couple.x + dir * 27)) <= 2);
          return { couple, dir, next };
        });
        const { couple, dir, next } = options.find(option => option.next) || options[0];
        const left = next && dir < 0 ? couple.x - 14 : couple.x;
        const width = next ? 41 : 27;
        lay.wedding = { x: couple.x, padreX: next ? (dir > 0 ? couple.x + 27 : couple.x - 14) : null, left, width,
          archX: Math.round(left + (width - 1) / 2 - bundle.props.caramanchao.w / 2),
          hide: new Set(next ? [couple.index, next.index] : [couple.index]) };
      }
      if (tier >= 2) {
        const stage = bundle.props.palco;
        lay.stage = { x: lay.host.x - 20, meta: stage };
      }
      if (tier >= 1) {
        // Plateia em até três fileiras: cada uma enche depois da da frente, mais alta e mais escura (mais longe).
        // As de trás não ficam na frente do palco (o trio de forró aparece).
        const stage = lay.stage ? [lay.stage.x - 8, lay.stage.x + lay.stage.meta.w - 6] : null;
        [[0, 'audience'], [5, 'audience2'], [2, 'audience3']].forEach(([offset, key], row) => {
          const spots = [];
          for (let x = L + 8 + offset; x < R - 20; x += 11) {
            if (row && stage && x > stage[0] && x < stage[1]) continue;
            spots.push(x);
          }
          const count = Math.min(rest, spots.length);
          const order = spots.map((x, i) => [x, hash(i, 91 + row * 17) % 1000]).sort((a, b) => a[1] - b[1]);
          for (let i = 0; i < count; i++) lay[key].push({ x: order[i][0], index: row * 100 + i });
          rest -= count;
        });
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
      lay.islands = ISLANDS.filter(id => lay.has.has(id));
      lay.key = [width, tier, eq.esquerda, eq.direita, eq.terreiro, engine.legendary(),
        withPar, engine.charActive('pamonha'), couples, lay.backCouples.length, lay.audience.length, lay.audience2.length,
        lay.audience3.length, s.size].join('|');
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
      if (id === 'barraca-comidas') return engine.charActive('pipoca') ? 'pipoca' : 'balcao-dama';
      if (id === 'barraca-cordel') return engine.charActive('cocada') ? 'cocada' : 'balcao-dama';
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
      const fitas = side.id === 'mastro' ? fitasNow(now) : null;
      if (fitas) drawFitas(fitas, side, y, now, true);
      shadow(side.x + meta.w / 2, meta.w - 2, 0.9);
      sprite(meta, frame, side.x, y);
      if (fitas) drawFitas(fitas, side, y, now, false);
      if (side.id === 'fogao-lenha' && engine.charActive('canjica') && bundle.chars.canjica) {
        // A cozinheira fica do lado do fogão que dá para o meio da festa, mexendo a canjica.
        const cook = bundle.chars.canjica;
        const cx = name === 'lado-esquerda' ? side.x + meta.w - 6 : side.x - cook.w + 6;
        sprite(cook, frameAt(cook, now, side.x), cx, GROUND - cook.h + 2, name !== 'lado-esquerda');
      }
      if (meta.sign) drawSign(meta.sign, side.x, y, tr(`sign.${side.id}`));
      if (meta.front) {
        const jailed = side.id === 'cadeia' && now < fx.jailUntil && bundle.props.penetra;
        if (jailed) {
          // O penetra pego fica um minuto atrás das grades da Cadeia do Arraiá, reclamando.
          const crook = bundle.props.penetra;
          sprite(crook, Math.floor(now / 700) % 2, side.x + meta.keeper[0] - crook.w / 2, y + meta.keeper[1] - 7);
          if (now >= (fx.nextPlea || 0)) {
            fx.nextPlea = now + 3500 + rng() * 2500;
            say(tr(`fx.jail.${Math.floor(rng() * 2)}`), side.x + meta.w / 2, y + meta.keeper[1] - 12, now, '#fff8e8', 1400, 8);
          }
        } else {
          const keeper = bundle.chars[keeperFor(engine, side.id)];
          sprite(keeper, frameAt(keeper, now, side.x), side.x + meta.keeper[0] - keeper.w / 2, y + meta.keeper[1] - (keeper.top || 0));
        }
        g.drawImage(images[meta.front], frame * meta.w, 0, meta.w, meta.h, side.x, y, meta.w, meta.h);
      }
      if (side.id === 'barraca-beijo' && now >= (fx.nextHeart[name] || 0)) {
        fx.nextHeart[name] = now + 900 + rng() * 1100;
        float('coracao', side.x + meta.keeper[0] + (rng() - 0.5) * 10, y + meta.keeper[1] + 2, now, ['#ff4f9e', '#ff8a96']);
      }
      regions.push({ id: name, x: side.x, y, w: meta.w, h: meta.h });
      if (side.id === 'fogao-lenha') drawKitchen(engine, side, y, now);
    }

    // Cozinha do Fogão a Lenha: com prato no fogo sai mais vapor da panela; pronto, o prato fica pulando em cima do
    // fogão com um brilho (clicar nele serve) e, servido, voa num arco até a Mandioca.
    function drawKitchen(engine, side, y, now) {
      const kitchen = engine.state.cozinha;
      const dishes = bundle.props.pratos;
      fx.stovePos = { x: side.x + side.meta.w / 2, y: y - 4 };
      const pot = kitchen && kitchen.pot;
      if (!pot || !dishes) return;
      if (!pot.ready) {
        // Barrinha de cozimento em cima do fogão: enche de laranja até o prato ficar pronto.
        const total = Math.max(1, pot.readyAt - (pot.startAt || pot.readyAt - 1));
        const done = Math.max(0, Math.min(1, 1 - (pot.readyAt - engine.now()) / total));
        const bx = Math.round(side.x + side.meta.w / 2 - 8);
        const by = y - 6;
        g.fillStyle = INK;
        g.fillRect(bx, by, 16, 4);
        g.fillStyle = '#58341c';
        g.fillRect(bx + 1, by + 1, 14, 2);
        g.fillStyle = Math.floor(now / 300) % 2 ? '#ffac2a' : '#ff8a12';
        g.fillRect(bx + 1, by + 1, Math.round(14 * done), 2);
        // De vez em quando sai um comentário do fogão (a Canjica, se estiver lá; o papagaio gosta de repetir).
        if (!calm && now >= (fx.nextCookTalk || (fx.nextCookTalk = now + 6000 + rng() * 6000))) {
          fx.nextCookTalk = now + 14000 + rng() * 12000;
          const text = tr(`fx.cook.talk.${Math.floor(rng() * 3)}`);
          say(text, Math.max(layout.L + 30, Math.min(layout.R - 30, side.x + side.meta.w / 2)), Math.max(10, y - 12), now, '#fff8e8', 1600, 6);
          fx.lastChat = { text, at: now, echoed: false };
        }
        if (now >= (fx.nextCookSteam || 0)) {
          fx.nextCookSteam = now + 160 + rng() * 160;
          fx.particles.push({ x: side.x + 16 + (rng() - 0.5) * 6, y: y + 8, vx: (rng() - 0.5) * 0.006, vy: -0.016 - rng() * 0.008,
            born: now, ttl: 1200 + rng() * 600, smoke: true, wobble: rng() * 6 });
        }
        return;
      }
      const frame = Math.max(0, dishes.ids.indexOf(pot.id));
      const dx = Math.round(side.x + side.meta.w / 2 - dishes.w / 2);
      const dy = y - dishes.h - 3 + Math.round(Math.sin(now / 260) * 2);
      halo(dx + dishes.w / 2, dy + dishes.h / 2, 10, '#ffd21e', 0.22 + 0.08 * Math.sin(now / 200));
      sprite(dishes, frame, dx, dy);
      if (now >= (fx.nextDishGlint || 0)) {
        fx.nextDishGlint = now + 500 + rng() * 500;
        fx.particles.push({ x: dx + rng() * dishes.w, y: dy + rng() * 3, vx: 0, vy: -0.01, born: now, ttl: 500, colors: ['#fff8e8', '#ffd21e'] });
      }
      regions.push({ id: 'prato', x: dx - 3, y: dy - 4, w: dishes.w + 6, h: dishes.h + 8 });
    }

    // O prato servido voa do fogão até a boca da Mandioca.
    const DISH_FLY_MS = 900;
    function drawDishFly(now) {
      const fly = fx.dishFly;
      const dishes = bundle.props[fly?.kind || 'pratos'];
      if (!fly || !dishes) return;
      const t = (now - fly.at) / DISH_FLY_MS;
      if (t >= 1) {
        fx.dishFly = null;
        const x = layout.host.x + 12;
        const y = GROUND - Math.round(34 * fx.scale);
        float('coracao', x, y - 6, now, ['#ff4f9e', '#ff8a96']);
        if (fly.kind === 'comidas') sound('carinho');
        // Do lado da Mandioca, para não brigar com os números dos passos que sobem em cima dela.
        say(tr(fly.kind === 'comidas' ? 'fx.food.yum' : 'fx.cook.yum'), Math.max(layout.L + 14, x - 24),
          Math.max(10, GROUND - Math.round(46 * fx.scale)), now, '#fff8e8', 1400, 8);
        return;
      }
      if (t < 0) return;
      const tx = layout.host.x + 12;
      const ty = GROUND - Math.round(34 * fx.scale);
      const x = fly.from.x + (tx - fly.from.x) * t;
      const y = fly.from.y + (ty - fly.from.y) * t - Math.sin(Math.PI * t) * 26;
      sprite(dishes, Math.max(0, dishes.ids.indexOf(fly.id)), Math.round(x - dishes.w / 2), Math.round(y - dishes.h / 2));
    }

    // A Mandioca pede o que falta (de 1,5 a 3 min, e só com a Barriga ou o Amor abaixo de 20%): comida ou carinho.
    function moodLines(engine, now) {
      if (typeof engine.mood !== 'function') return;
      if (!fx.moodAt) { fx.moodAt = now + 20000 + rng() * 30000; return; }
      if (now < fx.moodAt) return;
      fx.moodAt = now + 90000 + rng() * 90000;
      const m = engine.mood();
      const low = engine.cfg.moodMax * 0.2;
      const forced = fx.moodForce && m[fx.moodForce === 'fome' ? 'barriga' : 'amor'] < low ? fx.moodForce : null;
      const line = forced && Number.isInteger(fx.moodLine) ? fx.moodLine : Math.floor(rng() * 3);
      fx.moodForce = null;
      fx.moodLine = null;
      const kind = forced || (m.barriga < low && (m.amor >= low || rng() < 0.5) ? 'fome' : m.amor < low ? 'carente' : null);
      if (!kind) return;
      fx.moodSaid = kind;
      const x = layout.host.x + 12;
      say(tr(`fx.${kind}.${line}`), Math.max(layout.L + 30, x - 24), Math.max(10, GROUND - Math.round(46 * fx.scale)),
        now, kind === 'fome' ? '#ffc460' : '#ff8a96', 2400, 8);
    }

    // Dança das fitas: com o Mastro de São João na festa, de vez em quando quatro crianças pegam cada uma uma fita do topo
    // e rodam em volta dele, trançando as fitas no pau de cima para baixo. Quem está do lado de trás passa atrás do mastro.
    const FITAS_MS = 15000;
    const FITAS_EASE = 900;
    const FITAS_COLORS = ['#ee2f3c', '#ffd21e', '#3a6cf0', '#35a03a'];
    function fitasNow(now) {
      const f = fx.fitas || (fx.fitas = { at: 0, next: now + 35000 + rng() * 35000 });
      // Na chuva ninguém começa a dança das fitas: fica para quando parar.
      if (!f.at && now >= f.next && fx.wx.rain < 0.15) { f.at = now; f.said = false; sound('crianca'); }
      if (f.at && now - f.at > FITAS_MS) { f.at = 0; f.next = now + 100000 + rng() * 60000; }
      return f.at ? f : null;
    }

    function drawFitas(f, side, y, now, behind) {
      const kids = bundle.crowd.kids;
      if (!kids) return;
      const age = now - f.at;
      // O topo do mastro (a ponta de latão) e o pau, no desenho de art/scene.py (mastro_sao_joao, contornado).
      const poleX = side.x + 8;
      const topY = y + 8;
      const k = Math.max(0, Math.min(1, age / FITAS_EASE, (FITAS_MS - age) / FITAS_EASE));
      if (!behind && !f.said) {
        f.said = true;
        say(tr('fx.fitas'), poleX, Math.max(10, topY - 12), now, '#ffd21e', 2000, 8);
      }
      // A trança: desce pelo pau conforme as voltas, nas cores das quatro fitas (na frente do mastro).
      if (!behind) {
        const braided = Math.floor(Math.min(1, age / (FITAS_MS * 0.8)) * 22);
        for (let dy = 0; dy < braided; dy++) {
          g.fillStyle = FITAS_COLORS[(dy + (dy >> 1)) % 4];
          g.fillRect(poleX - 1, topY + 3 + dy, 2, 1);
        }
      }
      for (let i = 0; i < 4; i++) {
        const theta = age / 3400 * Math.PI * 2 + i * Math.PI / 2;
        const depth = Math.sin(theta);
        if ((depth < 0) !== behind) continue;
        const radius = 7 + 9 * k;
        const x = Math.round(Math.max(layout.L + 1, Math.min(layout.R - kids.w - 1, poleX + Math.cos(theta) * radius - kids.w / 2)));
        const ky = GROUND - kids.h + 2 + Math.round(depth * 2);
        g.globalAlpha = k;
        // A fita esticada do topo até a mão da criança.
        g.fillStyle = FITAS_COLORS[i];
        const hx = x + kids.w / 2;
        const hy = ky + 6;
        const steps = Math.max(Math.abs(hx - poleX), Math.abs(hy - topY));
        for (let s = 0; s <= steps; s += 1) {
          const t = s / steps;
          g.fillRect(Math.round(poleX + (hx - poleX) * t), Math.round(topY + (hy - topY) * t + Math.sin(t * Math.PI) * 2), 1, 1);
        }
        shadow(x + kids.w / 2, 6, 0.7 * k);
        const fabric = hash(i, 41) % bundle.crowd.fabrics;
        sprite(kids, fabric * 2 + (Math.floor(now / 120 + i) % 2), x, ky, Math.cos(theta + Math.PI / 2) < 0);
        g.globalAlpha = 1;
      }
    }

    // Varais e bandeirinhas desenhados uma vez só e reusados: a curva de cada varal (muda só com o tamanho da festa)
    // e cada bandeirinha em 7 jeitos de balançar. Pintar pixel a pixel era quase toda a conta do quadro na festa cheia.
    const strings = new Map();
    function stringCurve(left, right, top, sag) {
      const key = `${left}|${right}|${top}|${sag}`;
      let curve = strings.get(key);
      if (curve) return curve;
      const mid = (left + right) / 2;
      const half = (right - left) / 2;
      const points = [];
      const image = document.createElement('canvas');
      image.width = right - left + 1;
      image.height = Math.ceil(sag) + 2;
      const p = image.getContext('2d');
      p.fillStyle = '#361a0c';
      for (let x = left; x <= right; x++) {
        const t = (x - mid) / half;
        const y = Math.round(top + sag * (1 - t * t));
        p.fillRect(x - left, y - top, 1, 1);
        points.push([x, y]);
      }
      if (strings.size > 40) strings.clear();
      curve = { image, points };
      strings.set(key, curve);
      return curve;
    }

    const flags = new Map();
    // Cores do varal equipado: cada bandeirinha é [cor, sombra, brilho, florzinha?]. Sem varal no pacote, as de sempre.
    const DEFAULT_FLAGS = FLAGS.map((color, index) => [color, FLAG_DARK[index], FLAG_LIGHT[index]]);
    let varal = { id: 'varal-colorido', colors: DEFAULT_FLAGS };
    function setVaral(id) {
      const found = id !== 'varal-colorido' && bundle.varais && bundle.varais[id];
      varal = found ? { id, colors: found.colors } : { id: 'varal-colorido', colors: DEFAULT_FLAGS };
    }
    function flagImage(c, level) {
      const key = `${varal.id}:${c}:${level}`;
      let image = flags.get(key);
      if (image) return image;
      const [base, dark, light, dot] = varal.colors[c % varal.colors.length];
      image = document.createElement('canvas');
      image.width = 7;
      image.height = 6;
      const p = image.getContext('2d');
      const shift = level * 1.3 / 3;
      for (let dy = 1; dy < 7; dy++) {
        const ox = Math.round(shift * dy / 6);
        for (let dx = -2; dx <= 2; dx++) {
          if ((dy === 5 && dx === 0) || (dy === 6 && Math.abs(dx) <= 1)) continue;
          p.fillStyle = dx === 2 || dy === 1 ? dark : dx === -2 && dy === 2 ? light : dot && dx === 0 && dy === 3 ? dot : base;
          p.fillRect(dx + ox + 3, dy - 1, 1, 1);
        }
      }
      flags.set(key, image);
      return image;
    }

    // Lâmpada do varal (fio, bulbo e o brilho quando acesa), pintada uma vez para acesa e outra para apagada.
    const lampCache = {};
    function lampImage(on) {
      const key = on ? 'on' : 'off';
      if (lampCache[key]) return lampCache[key];
      const image = document.createElement('canvas');
      image.width = 2;
      image.height = 3;
      const p = image.getContext('2d');
      p.fillStyle = '#361a0c';
      p.fillRect(1, 0, 1, 1);
      p.fillStyle = on ? '#ffd21e' : '#c07e08';
      p.fillRect(0, 1, 2, 2);
      if (on) { p.fillStyle = '#fffff0'; p.fillRect(0, 1, 1, 1); }
      lampCache[key] = image;
      return image;
    }

    function drawBunting(left, right, top, sag, phase, lamps, now) {
      const curve = stringCurve(Math.round(left), Math.round(right), Math.round(top), sag);
      g.drawImage(curve.image, Math.round(left), Math.round(top));
      const points = curve.points;
      if (lamps) {
        for (let i = 2; i < points.length; i += 6) {
          const [x, y] = points[i];
          const on = Math.sin(now / 300 + i) > -0.6;
          if (on) halo(x, y + 3, 3, '#ffd21e', 0.4);
          g.drawImage(lampImage(on), x - 1, y + 1);
        }
        return;
      }
      let index = 0;
      for (let i = 3; i < points.length; i += 8, index++) {
        const [x, y] = points[i];
        const c = (index + phase) % varal.colors.length;
        const gust = fx.windNow;
        const level = Math.max(-3, Math.min(3, Math.round(3 * Math.sin(now / (420 - 230 * Math.abs(gust)) + index * 0.8) + 2.5 * gust)));
        g.drawImage(flagImage(c, level), x - 3, y + 1);
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

    // Figurinha nova do Álbum: um cartãozinho branco com fita adesiva e o desenho da figurinha sobe da cabeça da Mandioca,
    // balançando, e some.
    function drawSticker(now) {
      const st = fx.sticker;
      if (!st) return;
      const age = now - st.at;
      if (age > 2400) { fx.sticker = null; return; }
      const icon = iconImage(st.key);
      const t = age / 2400;
      const x = Math.round(layout.host.x + 12 - 11 + Math.sin(age / 260) * 2);
      const y = Math.round(GROUND - Math.round(58 * fx.scale) - 24 - 16 * Math.min(1, t * 2));
      g.globalAlpha = t > 0.8 ? (1 - t) / 0.2 : 1;
      g.fillStyle = INK;
      g.fillRect(x - 1, y - 1, 24, 26);
      g.fillStyle = '#fff8e8';
      g.fillRect(x, y, 22, 24);
      g.fillStyle = 'rgba(255, 210, 30, 0.75)';
      g.fillRect(x + 7, y - 2, 8, 3);
      if (icon) {
        const scale = Math.min(1, 18 / Math.max(icon.w, icon.h));
        const w = Math.max(1, Math.round(icon.w * scale));
        const h = Math.max(1, Math.round(icon.h * scale));
        g.imageSmoothingEnabled = false;
        g.drawImage(icon.image, x + Math.round((22 - w) / 2), y + Math.round((24 - h) / 2), w, h);
      }
      g.globalAlpha = 1;
    }

    // Friozinho de São João: a noite fica azulada (entra e sai devagar) e quem está na festa solta fumacinha pela boca; de
    // vez em quando alguém reclama do frio.
    function drawCold(engine, now) {
      const on = !!(engine.state.cold && engine.state.cold.active);
      const dt = Math.min(200, now - (fx.coldAt || now));
      fx.coldAt = now;
      fx.cold = Math.max(0, Math.min(1, fx.cold + (on ? 1 : -1) * dt / 2500));
      if (fx.cold <= 0) return;
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = `rgba(150, 190, 255, ${(0.17 * fx.cold).toFixed(3)})`;
      g.fillRect(0, 0, view.width, H);
      g.globalCompositeOperation = 'source-over';
      if (!on || now < fx.nextBreath) return;
      fx.nextBreath = now + 70 + rng() * 120;
      const rows = [[layout.audience, 9, 8], [layout.audience2, 14, 7], [layout.audience3, 19, 6]].filter(([list]) => list.length);
      const mouths = rows.length ? rows.map(([list, lift, face]) => ({ list, lift, face })) : [];
      const pick = mouths[Math.floor(rng() * (mouths.length + 1))];
      let x;
      let y;
      if (pick) {
        const guest = pick.list[Math.floor(rng() * pick.list.length)];
        x = guest.x + 7;
        y = GROUND - pick.lift - pick.face;
      } else {
        // A Mandioca também: a fumacinha sai da altura da boca dela.
        x = layout.host.x + 12;
        y = GROUND - Math.round(26 * fx.scale);
      }
      fx.particles.push({ x, y, vx: (rng() < 0.5 ? -1 : 1) * (0.004 + rng() * 0.004), vy: -0.006 - rng() * 0.004, born: now,
        ttl: 900 + rng() * 500, breath: true });
      if (rng() < 0.02 && pick) say(tr('fx.brrr'), x, y - 8, now, '#cfe3ff', 1000, 6);
    }

    // Alto-falante da quermesse no alto do mastro da direita (da Quermesse em diante). Quando fala, a boca treme e saem
    // as ondinhas do som; o aviso sobe num texto que sempre cabe dentro da festa.
    const ANNOUNCE_LINES = 10;
    function drawSpeaker(now, poleTop) {
      const meta = bundle.scenery.altofalante;
      if (!meta || layout.tier < 1) return;
      const talking = fx.announce && now < fx.announce.until;
      const x = layout.R + 1 - meta.w + 3;
      const y = poleTop - 2;
      sprite(meta, talking && Math.floor(now / 90) % 2 ? 1 : 0, x, y);
      if (talking) {
        const k = (now / 260) % 1;
        g.globalAlpha = 1 - k;
        g.fillStyle = '#fff8e8';
        for (const wave of [k, (k + 0.5) % 1]) {
          const r = 2 + Math.round(wave * 5);
          for (let dy = -r; dy <= r; dy += 2) g.fillRect(x - 2 - Math.round(Math.sqrt(Math.max(0, r * r - dy * dy))), y + 4 + dy, 1, 1);
        }
        g.globalAlpha = 1;
      }
    }
    function announce(engine, event, now) {
      const hint = event.hint && event.roll < 0.4 ? event.hint : null;
      const text = hint ? tr(`fx.alto.${hint.id}`, { n: hint.n }) : tr(`fx.alto.${Math.floor(event.roll * ANNOUNCE_LINES) % ANNOUNCE_LINES}`);
      const width = String(text).length * 4;
      const poleTop = GROUND - POLE_H[layout.tier];
      const x = Math.max(layout.L + width / 2 + 2, Math.min(layout.R - width / 2 - 2, layout.R - width / 2 - 8));
      fx.announce = { until: now + 3600, text };
      say(text, x, Math.max(8, poleTop - 10), now, '#fff8e8', 3600, 4);
      // O papagaio fofoqueiro repete o recado do alto-falante (depois que ele acaba).
      fx.lastChat = { text, at: now + 1500, echoed: false };
    }

    // Tablado de dança: pintado uma vez por largura e reusado (as tábuas não mudam de um quadro para o outro).
    let floorCache = null;
    function drawDanceFloor(left, right) {
      const width = right - left;
      if (!floorCache || floorCache.width !== width + 2) {
        const image = document.createElement('canvas');
        image.width = width + 2;
        image.height = 5;
        const p = image.getContext('2d');
        p.fillStyle = INK;
        p.fillRect(0, 0, width + 2, 5);
        p.fillStyle = '#c07a36';
        p.fillRect(1, 1, width, 1);
        p.fillStyle = '#7c421e';
        p.fillRect(1, 2, width, 2);
        p.fillStyle = '#361a0c';
        for (let x = 0; x < width; x += 6) p.fillRect(x + 1, 2, 1, 2);
        floorCache = image;
      }
      g.drawImage(floorCache, left - 1, GROUND - 4);
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
      if (!r.dancing) {
        // Cada descanso tem um jeito: ofega, se abana, se espreguiça ou bebe água (sorteado quando ela cansa).
        // A tigela de canjica usa o mesmo gesto da espiga (a mão vai da tigela à boca).
        const kind = fx.restKind === 'canjica' ? 'milho' : fx.restKind;
        const list = (tags.descansos && tags.descansos[kind]) || tags.descanso;
        return list[Math.floor(now / (fx.restKind === 'ofega' ? 260 : 340)) % list.length];
      }
      const speed = engine.speed();
      const phase = speed > 2.5 ? now / 1000 * 2.5 % 1 : r.lift;
      // O passo da vez (o repertório da Mandioca); sem ele, o forró de sempre.
      const list = (tags.dancas && tags.dancas[r.dance]) || tags.danca;
      const n = list.length;
      return list[Math.floor(Math.min(0.999, phase) * n) % n];
    }

    function drawHost(engine, now, dance, eq) {
      const s = engine.state;
      let stage = stageOf(engine);
      // Crescendo: o tamanho de antes e o novo piscam um no lugar do outro, depois ela dá um pulinho.
      const age = fx.grow ? now - fx.grow.at : Infinity;
      let bounce = 0;
      if (age < GROW_MS) {
        if (age < GROW_FLASH && Math.floor(age / 70) % 2 === 0) stage = Math.max(0, stage - 1);
        else if (age >= GROW_FLASH) bounce = -Math.round(4 * Math.sin(Math.PI * (age - GROW_FLASH) / (GROW_MS - GROW_FLASH)));
      } else fx.grow = null;
      const kit = bundle.mandioca.growth[stage];
      const sheet = kit.sheets[eq.tecido] || kit.sheets['xadrez-vermelho'];
      const frame = hostFrame(engine, now);
      if (frame !== fx.frame) { fx.previous = fx.frame; fx.frame = frame; }
      fx.scale = kit.scale;
      const cx = layout.host.x + 12;
      const x = cx - Math.round(kit.cx);
      const y = GROUND + dance - kit.h + 1 + bounce;
      const anchors = kit.anchors[frame];
      // Brotando: a Mandioca sai da terra (primeiro o topo), jogando terra para os lados, e dá um oi.
      const sprouting = fx.sprout !== null ? (now - fx.sprout) / SPROUT_MS : 1;
      if (sprouting < 1) {
        const t = Math.max(0, sprouting);
        const visible = Math.max(1, Math.round(kit.h * (1 - (1 - t) ** 2)));
        const sx = (frame % sheet.frames) * sheet.w;
        g.drawImage(images[sheet.image], sx, 0, sheet.w, visible, x, GROUND + dance - visible + 1, sheet.w, visible);
        if (now - fx.dustAt > 90) {
          fx.dustAt = now;
          for (let i = 0; i < 2; i++) {
            fx.particles.push({ x: cx + (rng() - 0.5) * 12, y: GROUND - 1, vx: (rng() - 0.5) * 0.05, vy: -0.03 - rng() * 0.02,
              gravity: 0.00008, born: now, ttl: 500 + rng() * 200, colors: ['#9a6030', '#58341c'] });
          }
        }
        regions.push({ id: 'host', x: x + 2, y: GROUND - visible, w: kit.w - 4, h: visible });
        return;
      }
      if (fx.sprout !== null) {
        fx.sprout = null;
        fx.celebrateUntil = now + 900;
        say(tr('fx.sprout'), cx, GROUND - kit.h - 8, now, '#9ef05a', 1600, 8);
      }
      shadow(cx, Math.round(16 * kit.scale), age < GROW_MS ? 0.6 : 1);
      const resting = !s.runtime.dancing && now >= fx.celebrateUntil;
      const drinking = resting && fx.restKind === 'bebe';
      const eating = resting && fx.restKind === 'milho';
      const tasting = resting && fx.restKind === 'canjica';
      const reading = resting && fx.restKind === 'carta';
      const base = bundle.hand[eq.mao];
      const item = !drinking && !eating && !reading && !tasting && base && sized(base, stage);
      // O item da mão fica na frente do corpo e atrás da mão que segura (a camada da mão vem por cima); de costas, no giro,
      // ele fica atrás dela.
      const front = anchors.frente !== false && kit.hand;
      const drawItem = () => {
        const itemFrame = item.fps && s.runtime.dancing ? frameAt(item, now) : 0;
        const ix = x + Math.round(anchors.hand[0] - item.pivot[0]);
        const iy = y + Math.round(anchors.hand[1] - item.pivot[1]);
        sprite(item, itemFrame, ix, iy);
        handFx(eq.mao, ix, iy, item, now, s.runtime.dancing);
      };
      if (item && !front) drawItem();
      sprite(sheet, frame, x, y);
      fx.hostShot = { sheet, frame };
      rim(sheet, frame, x, y, false, cx);
      if (item && front) {
        drawItem();
        sprite(kit.hand, frame, x, y);
      }
      if (drinking) {
        // Copo d'água na mão que sobe até a boca: vidro claro, água azul e um brilho.
        const cupX = x + Math.round(anchors.hand[0]) - 1;
        const cupY = y + Math.round(anchors.hand[1]) - 2;
        g.fillStyle = INK;
        g.fillRect(cupX - 1, cupY - 1, 5, 6);
        g.fillStyle = '#fff8e8';
        g.fillRect(cupX, cupY, 3, 4);
        g.fillStyle = '#48a8ff';
        g.fillRect(cupX, cupY + 1, 3, 3);
        g.fillStyle = '#ffffff';
        g.fillRect(cupX, cupY, 1, 2);
      }
      if (reading) {
        // Bilhete do correio elegante na mão: papel creme com as linhas escritas e o selo de coração.
        const px = x + Math.round(anchors.hand[0]) - 3;
        const py = y + Math.round(anchors.hand[1]) - 6;
        g.fillStyle = INK;
        g.fillRect(px - 1, py - 1, 9, 7);
        g.fillStyle = '#fff8e8';
        g.fillRect(px, py, 7, 5);
        g.fillStyle = '#c8b8a0';
        g.fillRect(px + 1, py + 1, 4, 1);
        g.fillRect(px + 1, py + 3, 3, 1);
        g.fillStyle = '#ee2f3c';
        g.fillRect(px + 5, py + 3, 2, 2);
      }
      if (tasting) {
        // Tigelinha de canjica da Canjica: barro por fora, creme com canela por cima e a colher.
        const bx = x + Math.round(anchors.hand[0]) - 2;
        const by = y + Math.round(anchors.hand[1]) - 3;
        g.fillStyle = INK;
        g.fillRect(bx - 1, by - 1, 7, 5);
        g.fillStyle = '#9a6030';
        g.fillRect(bx, by + 1, 5, 2);
        g.fillStyle = '#fff4e4';
        g.fillRect(bx, by, 5, 1);
        g.fillStyle = '#c07a36';
        g.fillRect(bx + 1, by, 1, 1);
        g.fillStyle = '#dca66a';
        g.fillRect(bx + 3, by - 2, 1, 2);
      }
      if (eating) {
        // Espiga de milho na mão: grãos amarelos com as fileiras mais escuras e a palha verde embaixo.
        const cobX = x + Math.round(anchors.hand[0]) - 1;
        const cobY = y + Math.round(anchors.hand[1]) - 5;
        g.fillStyle = INK;
        g.fillRect(cobX - 1, cobY - 1, 5, 9);
        g.fillStyle = '#ffd21e';
        g.fillRect(cobX, cobY, 3, 5);
        g.fillStyle = '#c07e08';
        for (let k = 0; k < 5; k += 2) g.fillRect(cobX + 1, cobY + k, 1, 1);
        g.fillStyle = '#fff07a';
        g.fillRect(cobX, cobY, 1, 3);
        g.fillStyle = '#35a03a';
        g.fillRect(cobX, cobY + 5, 3, 2);
        g.fillStyle = '#9ef05a';
        g.fillRect(cobX, cobY + 5, 1, 2);
      }
      if (resting && fx.restKind === 'cochilo' && now >= (fx.nextNapZ || 0)) {
        fx.nextNapZ = now + 900;
        say('Z', cx + Math.round(10 * kit.scale), y + 2, now, '#cfe3ff', 1300, 10);
      }
      if (engine.goldenHost()) {
        // Mandioca lendária: um brilho dourado em volta e estrelinhas que acendem e apagam no corpo dela.
        halo(cx, y + kit.h * 0.5, Math.round(kit.w * 0.7), '#ffd21e', 0.12 + 0.05 * Math.sin(now / 400));
        if (now >= (fx.nextGold || 0)) {
          fx.nextGold = now + 260 + rng() * 300;
          fx.particles.push({ x: x + 2 + rng() * (kit.w - 4), y: y + 2 + rng() * (kit.h - 8), vx: (rng() - 0.5) * 0.004, vy: -0.006,
            born: now, ttl: 900 + rng() * 400, colors: [rng() < 0.5 ? '#fff07a' : '#ffd21e'], shape: 'brilho' });
        }
      }
      if (now >= fx.nextBlink) { fx.blinkUntil = now + 130; fx.nextBlink = now + 2200 + rng() * 2600; }
      // No giro, de lado ou de costas, o quadro não tem olhos no lugar de sempre (âncora nula): nada de piscar ali.
      // Um olhar (coração, estrela, felizinha) vale mais que o piscar enquanto dura.
      const look = fx.look && now < fx.look.until && kit.looks ? kit.looks[fx.look.kind] : null;
      if (anchors.eyes && look) {
        sprite(look, 0, x + Math.round(anchors.eyes[0]), y + Math.round(anchors.eyes[1]));
      } else if (anchors.eyes && now < fx.blinkUntil && s.runtime.dancing && now >= fx.celebrateUntil) {
        sprite(kit.blink, 0, x + Math.round(anchors.eyes[0]), y + Math.round(anchors.eyes[1]));
      }
      const baseHat = bundle.hats[eq.chapeu];
      if (baseHat) {
        const hat = sized(baseHat, stage);
        const head = kit.anchors[fx.previous].head;
        let hx = x + Math.round(head[0] + hat.ox);
        let hy = y + Math.round(head[1] + hat.oy);
        const fly = fx.hatFly;
        if (fly && now >= fly.at) {
          const t = (now - fly.at) / HAT_FLY_MS;
          if (t >= 1) fx.hatFly = null;
          else {
            if (!fly.said) {
              fly.said = true;
              say(tr('fx.chapeu'), cx, y - 10, now, '#fff8e8', 1600, 8);
            }
            // Sobe, vai com o vento, para no alto balançando e volta pro lugar.
            const up = Math.sin(Math.min(1, t * 1.2) * Math.PI);
            hx += Math.round(fly.dir * Math.sin(t * Math.PI) * 12 + Math.sin(now / 90) * up);
            hy -= Math.round(up * 16);
          }
        }
        sprite(hat, 0, hx, hy);
        if (SHINY.has(eq.chapeu)) glint(now, hx + hat.w * 0.72, hy + 2);
      }
      if (fx.wx.rain > 0.15) {
        const top = baseHat ? y + Math.round(kit.anchors[fx.previous].head[1] + sized(baseHat, stage).oy) : y + 2;
        g.drawImage(umbrella(2, 13), cx - 6, top - 7);
      }
      if (age < GROW_MS) {
        // Clarão de quando cresce: um halo branco que abre e some em volta do corpo.
        const t = age / GROW_MS;
        halo(cx, y + kit.h * 0.55, Math.round(14 + 16 * t), '#ffffff', 0.6 * (1 - t));
      }
      regions.push({ id: 'host', x: x + 2, y, w: kit.w - 4, h: kit.h });
    }

    // Cada item de mão tem o seu jeitinho: o triângulo e a sanfona soltam notas no ritmo, a estrelinha solta faísca, o
    // lampião ilumina, o pau de selfie dispara o flash, o peixinho faz bolha, o frango e o bolo soltam vapor, o buquê
    // perde pétala, a maçã do amor solta coração e a cobra de pano faz "sss".
    const HAND_FX = {
      triangulo: { every: 640, dancing: true }, 'sanfona-ouro': { every: 420, dancing: true }, estrelinha: { every: 90 },
      'pau-selfie': { every: 7000 }, peixinho: { every: 850 }, 'frango-assado': { every: 520 }, 'bolo-fuba': { every: 700 },
      buque: { every: 1500 }, 'maca-amor': { every: 3200 }, 'cobra-de-pano': { every: 9000, dancing: true },
      pandeiro: { every: 380, dancing: true }, zabumba: { every: 560, dancing: true }
    };
    function handFx(id, ix, iy, item, now, dancing) {
      const top = ix + item.w / 2;
      if (id === 'lampiao') halo(top, iy + item.h * 0.55, 9, '#ffc460', 0.16 + 0.04 * Math.sin(now / 90));
      if (id === 'pau-selfie' && now < (fx.selfieUntil || 0)) {
        halo(top, iy + 1, 7, '#ffffff', 0.8 * (fx.selfieUntil - now) / 140);
        g.fillStyle = '#ffffff';
        g.fillRect(Math.round(top) - 1, iy, 3, 2);
      }
      const rule = HAND_FX[id];
      if (!rule || (rule.dancing && !dancing)) return;
      if (fx.handId !== id) { fx.handId = id; fx.handNext = now + rule.every * rng(); }
      if (now < fx.handNext) return;
      fx.handNext = now + rule.every * (0.7 + rng() * 0.6);
      if (id === 'triangulo') float('nota', top + 3, iy, now, ['#cfe3ff']);
      else if (id === 'sanfona-ouro') float('nota', top + (rng() < 0.5 ? -4 : 4), iy, now, ['#ffd21e', '#fff07a', FLAGS[Math.floor(rng() * 6)]]);
      else if (id === 'estrelinha') {
        // Faísca da estrelinha: sai da ponta para os lados e cai esfriando.
        fx.particles.push({ x: top + (rng() - 0.5) * 3, y: iy + 1, vx: (rng() - 0.5) * 0.05, vy: -0.02 - rng() * 0.02, gravity: 0.00006,
          born: now, ttl: 380 + rng() * 260, colors: SPARK, ember: true });
      } else if (id === 'pau-selfie') {
        fx.selfieUntil = now + 140;
        say(tr('fx.selfie'), top, iy - 6, now, '#ffffff', 800, 6);
      } else if (id === 'peixinho') {
        fx.particles.push({ x: top + (rng() - 0.5) * 3, y: iy + item.h * 0.6, vx: 0, vy: -0.006, born: now, ttl: 700, colors: ['#e8f6ff'], twinkle: true });
      } else if (id === 'frango-assado' || id === 'bolo-fuba') {
        fx.particles.push({ x: top + (rng() - 0.5) * item.w * 0.6, y: iy + 2, vx: (rng() - 0.5) * 0.003, vy: -0.008, born: now, ttl: 900, breath: true });
      } else if (id === 'buque') {
        fx.particles.push({ x: top + (rng() - 0.5) * item.w, y: iy + 2, vx: (rng() - 0.5) * 0.01, vy: 0.008, born: now, ttl: 1400,
          colors: ['#ff8a96', '#ff4f9e'], flip: 160, wobble: rng() * 6 });
      } else if (id === 'maca-amor') float('coracao', top, iy - 1, now, ['#ff4f9e']);
      else if (id === 'cobra-de-pano') say(tr('fx.sss'), top + 4, iy - 4, now, '#9ef05a', 900, 6);
      else if (id === 'zabumba') float('nota', top + (rng() < 0.5 ? -3 : 3), iy + 2, now, ['#ff907a', '#fff07a']);
      else if (id === 'pandeiro') {
        // Tchic-tchic: brilho numa platinela e, de vez em quando, uma nota.
        const side = rng() < 0.5 ? 0 : item.w - 1;
        fx.particles.push({ x: ix + side, y: iy + item.h / 2 - 1, vx: 0, vy: -0.004, born: now, ttl: 220, colors: ['#fffff0', '#c8ccd6'], twinkle: true });
        if (rng() < 0.4) float('nota', top, iy - 1, now, ['#fff07a', FLAGS[Math.floor(rng() * 6)]]);
      }
    }

    function drawCrowd(engine, now, list, sheet, bottom, flipEvery) {
      const crowd = bundle.crowd;
      const dancing = sheet === crowd.dancers || sheet === crowd.dancersBack;
      const jump = now < fx.jumpUntil ? -2 : 0;
      // A "ola": uma onda de braços abertos atravessa a plateia; nas comemorações a plateia inteira pula junto.
      // Quadrilha marcada: os casais andam em zigue-zague pela pista, cada um no seu ritmo, indo e voltando.
      const weave = sheet === crowd.dancers && engine.state.runtime.quadrilhaLeft > 0
        ? Math.min(1, engine.state.runtime.quadrilhaLeft / 2, (engine.cfg.quadrilhaSeconds - engine.state.runtime.quadrilhaLeft) / 1.5) : 0;
      // O túnel: nos últimos segundos da quadrilha marcada os pares erguem os braços e fazem o túnel.
      const left = engine.state.runtime.quadrilhaLeft;
      const tunnel = dancing && left > 0 && left <= TUNNEL_S;
      if (tunnel && !fx.tunnelSaid) {
        fx.tunnelSaid = true;
        say(tr('fx.tunnel'), layout.danceLeft + (layout.danceRight - layout.danceLeft) / 2, Math.max(10, GROUND - POLE_H[layout.tier] - 10), now,
          '#ffd21e', 2200, 8);
      }
      const wave = !dancing && fx.wave ? fx.wave : null;
      const waveAt = wave ? layout.L + (layout.R - layout.L + 40) * (now - wave.at) / 1700 - 20 : 0;
      const cheering = !dancing && now < fx.celebrateUntil;
      const aside = sheet === crowd.dancers && weddingOn(engine) ? layout.wedding.hide : null;
      // "Olha a chuva!" da marcação: os pares abrem o guarda-chuva por um instante (e é mentira).
      const joke = dancing && now < (fx.fakeRainUntil || 0);
      for (const guest of list) {
        if (aside && aside.has(guest.index)) continue;
        const seed = hash(guest.index, sheet === crowd.dancers ? 7 : 13);
        const fabric = seed % crowd.fabrics;
        const phase = (seed % 100) / 100;
        const steps = crowd.steps || 2;
        const beat = Math.floor(now / (760 / steps) + phase * steps) % steps;
        const entries = flipEvery ? [[0, false], [13, true]] : [[0, (seed >> 3) % 2 === 0]];
        for (const [dx, flip] of entries) {
          const type = flipEvery ? (dx ? 1 : 0) : (seed >> 5) % 2;
          let x = guest.x + dx;
          if (weave) x += Math.round((guest.index % 2 ? 1 : -1) * Math.sin(now / 620 + guest.index * 0.9) * 9 * weave);
          const move = dancing && fx.callMove && now - fx.callMove.at < 3500 ? fx.callMove : null;
          const moveT = move ? (now - move.at) / 3500 : 0;
          if (move && move.kind === 'caminho') x += Math.round(Math.sin(moveT * Math.PI) * 10);
          const step = move && (move.kind === 'anavan' || move.kind === 'anarrie') ? (move.kind === 'anavan' ? 1 : -1) * Math.round(Math.sin(moveT * Math.PI) * 1.4) : 0;
          const bow = (move && move.kind === 'cumprimenta' && moveT < 0.6 ? Math.round(Math.sin(moveT / 0.6 * Math.PI) * 2) : 0) + step;
          const front = wave ? Math.abs((wave.dir > 0 ? x : layout.R + layout.L - x) - waveAt) : Infinity;
          const person = type * crowd.fabrics + (flipEvery && dx ? (fabric + 2) % crowd.fabrics : fabric);
          // Dentro da onda: braços para o alto e um pulo que sobe e desce conforme a onda passa.
          const inWave = front < 18 && crowd.ola !== undefined;
          const frame = inWave ? crowd.ola + person : tunnel ? person * steps + (Math.floor(now / 420 + phase) % 2 ? 2 : 6) : person * steps + beat;
          const hop = inWave ? -Math.round(4 * Math.cos(front / 18 * Math.PI / 2))
            : cheering ? -Math.round(2 * Math.abs(Math.sin(now / 130 + seed))) : 0;
          // "Olha a cobra!": quem está perto da cobra de pano pula com os braços para cima.
          const scared = dancing && fx.cobraX != null && Math.abs(x + 6 - fx.cobraX) < 14;
          const startled = fx.startle && now < fx.startle.until && Math.abs(x + 6 - fx.startle.x) < 12;
          const arrival = fx.arrivals.get(`${sheet.image}:${guest.index}`);
          if (arrival) {
            const t = Math.min(1, (now - arrival.at) / 1200);
            x = arrival.from + (x - arrival.from) * t;
            if (t >= 1) fx.arrivals.delete(`${sheet.image}:${guest.index}`);
          }
          if (dancing) shadow(x + 6, 8, sheet === crowd.dancers ? 1 : 0.6);
          const leap = scared ? -3 - Math.round(4 * Math.abs(Math.sin(now / 95 + seed))) : startled ? -3 : 0;
          const shown = scared ? person * steps + 2 : frame;
          if (scared) fx.scared++;
          const top = bottom - sheet.h + 1 + (dancing ? Math.min(jump, leap) : Math.min(hop, leap)) + bow;
          sprite(sheet, shown, x - (crowd.pad || 0), top, flip);
          rim(sheet, shown, x - (crowd.pad || 0), top, flip, x + 6);
          guestUmbrella(seed + dx, x - (crowd.pad || 0), top, joke);
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
        // A roda-gigante gira no seu ritmo e, depois de um clique, mais depressa por uns segundos.
        const wheel = fx.wheel || (fx.wheel = { phase: 0, last: now });
        const step = Math.min(100, Math.max(0, now - wheel.last));
        wheel.last = now;
        wheel.phase += step / 1000 * (meta.fps || 0) * (now - (fx.react.roda ?? -1e9) < 3000 ? 4 : 1);
        const frame = meta.frames > 1 ? Math.floor(wheel.phase) % meta.frames : 0;
        const top = GROUND - 6 - meta.h + 1;
        critter('roda', b.x, top, meta.w, meta.h, now);
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

    // Casamento na roça: enquanto dura a cerimônia, o caramanchão entra atrás e os noivos e o padre no lugar de dois pares.
    function weddingOn(engine) { return !!layout.wedding && engine.state.runtime.weddingLeft > 0; }

    function drawWeddingArch(engine, now, floor) {
      if (!weddingOn(engine)) return;
      const arch = bundle.props.caramanchao;
      const w = layout.wedding;
      sprite(arch, frameAt(arch, now), w.archX, floor - arch.h + 1);
    }

    function drawWeddingParty(engine, now, floor) {
      if (!weddingOn(engine)) return;
      const meta = bundle.props.casamento;
      const w = layout.wedding;
      const r = engine.state.runtime;
      const cfg = engine.cfg;
      const elapsed = cfg.weddingSeconds - r.weddingLeft;
      // Comemoram quando alguém joga arroz e na hora do "sim".
      const cheering = now < fx.riceUntil || r.weddingLeft < 3;
      // O padre puxa os vivas a cada 6 segundos; perto do fim os noivos dizem "sim" e o casal solta corações.
      const stage = Math.floor(elapsed / 6);
      const centre = w.left + w.width / 2;
      if (stage > fx.weddingStage && r.weddingLeft > 3.5) {
        fx.weddingStage = stage;
        say(tr(`fx.vivas.${stage % 3}`), centre, Math.max(10, floor - 40), now, ['#ff8ac8', '#fff07a', '#9fc8ff'][stage % 3], 2200, 8);
        for (let i = 0; i < 2; i++) float('coracao', w.x + 10 + i * 14, floor - 26, now, ['#ff4f9e', '#ff8a96']);
      }
      if (r.weddingLeft <= 3.5 && fx.weddingStage < 99) {
        fx.weddingStage = 99;
        say(tr('fx.yes'), w.left + 14, Math.max(10, floor - 40), now, '#ffd21e', 2400, 8);
        for (let i = 0; i < 6; i++) float('coracao', w.x + 4 + i * 5, floor - 24 - (i % 2) * 5, now, ['#ff4f9e', '#ff8a96']);
      }
      const people = [[w.x - 1, 0, false], [w.x + 12, 1, true]];
      if (w.padreX !== null) people.push([w.padreX - 1, 2, false]);
      for (const [x, who, flip] of people) {
        const hop = cheering ? -Math.round(2 * Math.abs(Math.sin(now / 130 + who))) : 0;
        const pose = cheering ? 2 : Math.floor(now / 520 + who * 0.4) % 2;
        shadow(x + 7, 9);
        sprite(meta, who * 3 + pose, x, floor - meta.h + 1 + hop, flip);
      }
      // Barra de arroz embaixo dos noivos: enche a cada punhado até a cota do presente inteiro.
      const share = Math.min(1, r.rice / cfg.weddingRice);
      const barY = floor + 2;
      g.fillStyle = INK;
      g.fillRect(w.left - 1, barY - 1, w.width + 2, 4);
      g.fillStyle = '#4a2418';
      g.fillRect(w.left, barY, w.width, 2);
      g.fillStyle = share >= 1 ? '#ffd21e' : '#fff4e4';
      g.fillRect(w.left, barY, Math.round(w.width * share), 2);
      regions.push({ id: 'casamento', x: w.left, y: floor - meta.h, w: w.width + 1, h: meta.h + 3 });
      spots.set('casamento', { x: centre, y: floor - 12 });
    }

    function drawStage(engine, now) {
      if (!layout.stage) return;
      const meta = layout.stage.meta;
      const x = layout.stage.x;
      const y = GROUND - 6 - meta.h + 1;
      sprite(meta, 0, x, y);
      const floor = y + meta.floor;
      if (layout.tier >= 4) drawTelao(x + 63, y + 22, now);
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
      // Solo: de vez em quando um do trio dá um passo à frente pulando e as notas saem em rajada.
      if (!fx.solo || now - fx.solo.at > 2600) {
        if (fx.solo) fx.solo = null;
        if (!fx.nextSolo) fx.nextSolo = now + 60000 + rng() * 60000;
        if (now >= fx.nextSolo) {
          const active = ['cenoura', 'inhame', 'batata'].map((id, i) => (engine.charActive(id) ? i : -1)).filter(i => i >= 0);
          fx.nextSolo = now + 120000 + rng() * 120000;
          if (active.length) {
            const i = active[Math.floor(rng() * active.length)];
            fx.solo = { i, at: now };
            say(tr(`fx.solo.${i}`), x + meta.slots[i] + 8, Math.max(10, floor - 40), now, '#ffd21e', 1800, 8);
          }
        }
      }
      ['cenoura', 'inhame', 'batata'].forEach((id, i) => {
        if (!engine.charActive(id)) return;
        const char = bundle.chars[id];
        const solo = fx.solo && fx.solo.i === i;
        const lift = solo ? -Math.round(Math.abs(Math.sin((now - fx.solo.at) / 160)) * 3) : 0;
        sprite(char, frameAt(char, now * (solo ? 1.8 : 1), i * 0.5), x + meta.slots[i] - 1, floor - char.h + 1 + lift);
        playing.push(x + meta.slots[i] + 8);
        if (solo && rng() < 0.25) float('nota', x + meta.slots[i] + 8, floor - 22, now, [FLAGS[Math.floor(rng() * 6)]]);
      });
      // O trio toca: notinhas coloridas sobem do palco.
      if (playing.length && now >= fx.nextNote) {
        fx.nextNote = now + 700 - playing.length * 120 + rng() * 400;
        float('nota', playing[Math.floor(rng() * playing.length)], floor - 26, now, [FLAGS[Math.floor(rng() * 6)]]);
      }
      regions.push({ id: 'palco', x, y, w: meta.w, h: meta.h - 14 });
      drawAuctioneer(engine, now, x, floor);
    }

    // Telão do Maior São João do Mundo: um painel de LED no fundo do palco mostrando a Mandioca dançando ao vivo (o quadro
    // dela do último desenho, reduzido), com as linhas do LED e uma moldura de luzinhas piscando.
    function drawTelao(sx, sy, now) {
      const shot = fx.hostShot;
      if (!shot) return;
      const w = 32;
      const h = 18;
      g.fillStyle = INK;
      g.fillRect(sx - 2, sy - 2, w + 4, h + 4);
      g.fillStyle = '#0c1430';
      g.fillRect(sx, sy, w, h);
      const sheet = shot.sheet;
      const image = images[sheet.image];
      if (image) {
        // Close da câmera: só a parte de cima do quadro (rosto e tronco), maior.
        const top = Math.round(sheet.h * 0.2);
        const part = Math.round(sheet.h * 0.5);
        const scale = (h - 1) / part;
        const dw = Math.round(sheet.w * scale);
        g.drawImage(image, (shot.frame % sheet.frames) * sheet.w, top, sheet.w, part, sx + Math.round((w - dw) / 2), sy + 1, dw, h - 1);
      }
      // Linhas do LED e um brilho azulado por cima.
      g.fillStyle = 'rgba(12, 20, 48, 0.18)';
      for (let r = 1; r < h; r += 2) g.fillRect(sx, sy + r, w, 1);
      // Moldura de luzinhas que acendem em volta.
      for (let k = 0; k < 12; k++) {
        const t = k / 12;
        const px = t < 0.5 ? sx - 1 + Math.round(t * 2 * (w + 1)) : sx - 1 + Math.round((1 - (t - 0.5) * 2) * (w + 1));
        const py = t < 0.5 ? sy - 2 : sy + h + 1;
        g.fillStyle = Math.floor(now / 200 + k) % 3 === 0 ? '#fffff0' : FLAGS[k % 6];
        g.fillRect(px, py, 1, 1);
      }
    }

    // Leilão de prendas: o leiloeiro no palco, entre o Inhame e a Batata-Doce. Fala sem parar (boca e martelo no alto) e
    // bate o martelo a cada "dou-lhe"; depois de vendido, fica um tempinho batendo e sai.
    function drawAuctioneer(engine, now, stageX, floor) {
      const a = engine.state.leilao && engine.state.leilao.active;
      const meta = bundle.scenery.leiloeiro;
      const sold = fx.leilao.sold && now - fx.leilao.sold.at < 2200 ? fx.leilao.sold : null;
      if ((!a && !sold) || !meta) { fx.leilaoPos = null; return; }
      const x = stageX + 63;
      const y = floor - meta.h + 1;
      const frame = now - fx.leilao.hit < 260 ? 3 : sold ? 0 : Math.floor(now / 170) % 2 ? 1 : 2;
      sprite(meta, frame, x, y);
      fx.leilaoPos = { x: x + 7, y };
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
      // Milho assando: da Festa da Cidade em diante, duas espigas encostadas na beira da fogueira, tostadinhas.
      if (layout.tier >= 2) {
        for (const [dx, lean] of [[-2, 1], [f.meta.w - 1, -1]]) {
          const bx = f.x + dx;
          const by = GROUND - 8;
          for (let k = 0; k < 6; k++) {
            const px = bx + Math.round(lean * (k < 3 ? 0 : 1));
            g.fillStyle = INK;
            g.fillRect(px - 1, by + k, 4, 1);
          }
          for (let k = 0; k < 5; k++) {
            const px = bx + Math.round(lean * (k < 3 ? 0 : 1));
            g.fillStyle = k < 4 ? (k % 2 ? '#c07e08' : '#ffd21e') : '#35a03a';
            g.fillRect(px, by + k, 2, 1);
          }
          if (rng() < 0.01) {
            fx.particles.push({ x: bx + 1, y: by - 1, vx: (rng() - 0.5) * 0.004, vy: -0.01, born: now, ttl: 900, smoke: true, wobble: rng() * 6 });
          }
        }
      }
      if (engine.charActive('faisca')) {
        const spark = bundle.chars.faisca;
        sprite(spark, frameAt(spark, now), f.x + f.meta.w - 4, y + 4 + Math.round(Math.sin(now / 500) * 2));
      }
      regions.push({ id: 'fogueira', x: f.x, y, w: f.meta.w, h: f.meta.h });
      if (layout.has.has('gato')) {
        const cat = bundle.scenery.gato;
        const cx = Math.round(f.x + f.meta.w / 2 - cat.w / 2);
        const hop = critter('gato', cx, GROUND - cat.h + 3, cat.w, cat.h, now);
        sprite(cat, frameAt(cat, now), cx, GROUND - cat.h + 3 + hop);
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
      if (!active && !fx.crasherSeen) fx.crasherX = null;
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
        fx.crasherX = x + meta.w / 2;
        shadow(x + 7, 10);
        sprite(meta, t < 1 ? frameAt(meta, now) : 0, x, GROUND - meta.h + 1 + (t < 1 ? 0 : Math.round(Math.sin(now / 200))),
          fx.crasherSeen.side > 0);
        regions.push({ id: 'crasher', x: x - 2, y: GROUND - meta.h - 2, w: meta.w + 4, h: meta.h + 4 });
        if (t >= 1) write('?', x + 7, GROUND - meta.h - 7, '#fff07a');
      } else if (fx.leaving) {
        fx.crasherX = null;
        const t = (now - fx.leaving.at) / 700;
        if (t >= 1) fx.leaving = null;
        else {
          const x = fx.leaving.x + (edge(fx.leaving.side) - fx.leaving.x) * t;
          sprite(meta, Math.floor(now / 80) % meta.frames, x, GROUND - meta.h + 1, fx.leaving.side < 0);
        }
      }
    }

    function requestTarget(engine) {
      const spots = [{ x: layout.host.x + 12, y: GROUND - Math.round(44 * kitOf(engine).scale) }];
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

    // Estouro do fogo: o redondo de sempre, às vezes um coração (rosa) ou um anel duplo (duas cores).
    function burst(rocket, now) {
      const { x1: x, y1: y, color } = rocket;
      const palette = ['#fffff0', color, color, '#fff07a'];
      const kind = rng();
      if (kind < 0.12) {
        // Coração: cada faísca vai para um ponto da curva do coração, todas com o mesmo tempo, e o desenho aparece inteiro.
        const pink = ['#fffff0', '#ff8ac8', '#ff4f9e', '#ff4f9e'];
        for (let i = 0; i < 30; i++) {
          const a = i / 30 * Math.PI * 2;
          const hx = 16 * Math.sin(a) ** 3;
          const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
          fx.particles.push({ x, y, vx: hx * 0.0011, vy: hy * 0.0011, gravity: 0.000012, born: now, ttl: 1100 + rng() * 300,
            colors: pink, trail: true, twinkle: rng() < 0.25 });
        }
        fx.flashes.push({ x, y, born: now, color: '#ff4f9e' });
        return;
      }
      if (kind < 0.24) {
        // Anel duplo: um anel largo de uma cor e um estreito de outra por dentro.
        const inner = FLAGS[Math.floor(rng() * FLAGS.length)];
        for (const [count, speed, tint] of [[26, 0.03, color], [16, 0.016, inner]]) {
          for (let i = 0; i < count; i++) {
            const a = i / count * Math.PI * 2;
            fx.particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, gravity: 0.000018, born: now,
              ttl: 1000 + rng() * 300, colors: ['#fffff0', tint, tint, '#fff07a'], trail: true });
          }
        }
        fx.flashes.push({ x, y, born: now, color });
        return;
      }
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
    // --- Tempo: chuva de São João, guarda-chuvas, trovão e o arco-íris com o pote de ouro -----------------------------
    // Quanto está chovendo (0 a 1, entrando e saindo devagar) e quanto o arco-íris já apareceu, pelo relógio do motor.
    function weatherOf(engine) {
      const w = engine.state.weather;
      const t = engine.now();
      const out = { rain: 0, rainbow: 0 };
      if (w && w.rain) out.rain = Math.max(0, Math.min(1, (t - w.rain.born) / 3000, (w.rain.until - t) / 4000));
      if (w && w.rainbow) out.rainbow = Math.max(0, Math.min(1, (t - w.rainbow.born) / 2500, (w.rainbow.until - t) / 3000));
      return out;
    }

    // Poças da chuva: crescem no chão enquanto chove e secam devagar depois (uns dois minutos), com um brilho que pisca.
    // `fx.wet` vai de 0 (seco) a 1 (encharcado).
    function drawPuddles(now) {
      const dt = Math.min(200, Math.max(0, now - (fx.wetAt || now)));
      fx.wetAt = now;
      fx.wet = fx.wx.rain > 0.3 ? Math.min(1, fx.wet + dt / 15000) : Math.max(0, fx.wet - dt / 120000);
      if (fx.wet <= 0.02) return;
      const count = Math.max(3, Math.round(layout.width / 60));
      for (let i = 0; i < count; i++) {
        const w = Math.round((6 + hash(i, 71) % 9) * Math.min(1, fx.wet * 1.4));
        if (w < 2) continue;
        const x = Math.round(layout.L + 8 + spread(i, 0.37) * (layout.width - 24));
        const y = GROUND + 2 + hash(i, 73) % 3;
        g.globalAlpha = Math.min(1, fx.wet * 1.6) * 0.8;
        g.fillStyle = 'rgba(30, 58, 138, 0.55)';
        g.fillRect(x - 1, y, w + 2, 1);
        g.fillStyle = 'rgba(72, 168, 255, 0.6)';
        g.fillRect(x, y, w, 1);
        g.fillRect(x + 1, y + 1, Math.max(0, w - 2), 1);
        if (Math.sin(now / 500 + i * 1.9) > 0.3) {
          g.fillStyle = '#e8f4ff';
          g.fillRect(x + 1 + (i % Math.max(1, w - 2)), y, 1, 1);
        }
        g.globalAlpha = 1;
      }
    }

    // Rajada de vento (só enfeite, sem chuva): de tempos em tempos as bandeirinhas se agitam e pendem para o lado do sopro, a pipa
    // é puxada e folhas e pétalas atravessam a festa. `fx.windNow` vai de -1 a 1 (o sinal é o lado do sopro; 0 é calmaria).
    function updateWind(now) {
      if (!fx.nextWind) fx.nextWind = now + 30000 + rng() * 60000;
      if (!fx.wind && now >= fx.nextWind && fx.wx.rain < 0.2) {
        fx.wind = { at: now, until: now + 12000, dir: rng() < 0.5 ? -1 : 1 };
        fx.nextWind = now + 240000 + rng() * 240000;
        // Às vezes a rajada leva o chapéu da Mandioca: ele voa num arco e cai de volta na cabeça.
        if (rng() < 0.35) fx.hatFly = { at: now + 2500, dir: fx.wind.dir, said: false };
        // E às vezes solta uma bandeirinha do varal, que cai rodopiando (clicável até chegar no chão).
        if (layout.tier >= 1 && rng() < 0.6) {
          fx.looseFlag = { at: now + 1500 + rng() * 3000, x: layout.L + 20 + rng() * (layout.width - 40), dir: fx.wind.dir,
            color: FLAGS[Math.floor(rng() * FLAGS.length)] };
        }
        say(tr('fx.wind'), layout.L + layout.width / 2, Math.max(10, GROUND - POLE_H[layout.tier] - 18), now, '#cfe3ff', 1800, 6);
      }
      const gust = fx.wind;
      if (!gust || now > gust.until) { fx.wind = null; fx.windNow = 0; return; }
      const ease = Math.max(0, Math.min(1, (now - gust.at) / 1500, (gust.until - now) / 2000));
      fx.windNow = gust.dir * ease;
      if (rng() < 0.3 * ease) {
        const from = gust.dir > 0 ? layout.L - 6 : layout.R + 6;
        fx.particles.push({ x: from, y: GROUND - 20 - rng() * 60, vx: gust.dir * (0.035 + rng() * 0.03), vy: (rng() - 0.35) * 0.008,
          gravity: 0.000004, born: now, ttl: 2600 + rng() * 1800, wobble: rng() * 6, flip: 90 + rng() * 100,
          colors: [['#9ef05a', '#35a03a'], ['#ffd21e', '#c07e08'], ['#ff8ac8', '#ad1e66'], ['#fff4e4', '#c8ccd6']][Math.floor(rng() * 4)] });
      }
    }

    const HAT_FLY_MS = 1900;

    // A bandeirinha solta: sai do varal, cai devagar indo com o vento e rodopiando; no chão fica um tempinho e some.
    const FLAG_FALL_MS = 5200;
    function drawLooseFlag(now, poleTop) {
      const f = fx.looseFlag;
      if (!f || now < f.at) return;
      const t = (now - f.at) / FLAG_FALL_MS;
      if (t >= 1.5) { fx.looseFlag = null; return; }
      const k = Math.min(1, t);
      const x = Math.round(f.x + f.dir * 30 * k + Math.sin(now / 260) * 3 * (1 - k));
      const y = Math.round(poleTop + 6 + (GROUND - 3 - poleTop - 6) * k * k * (3 - 2 * k));
      const wide = t >= 1 || Math.floor(now / 180) % 2 === 0;
      g.fillStyle = INK;
      if (wide) { g.fillRect(x - 3, y - 1, 7, 4); g.fillRect(x - 1, y + 3, 3, 1); } else g.fillRect(x - 2, y - 1, 5, 5);
      g.fillStyle = f.color;
      if (wide) { g.fillRect(x - 2, y, 5, 1); g.fillRect(x - 1, y + 1, 3, 1); g.fillRect(x, y + 2, 1, 1); }
      else { g.fillRect(x - 1, y, 3, 1); g.fillRect(x - 1, y + 1, 2, 1); g.fillRect(x - 1, y + 2, 1, 1); }
      if (t < 1) regions.push({ id: 'bandeirinha', x: x - 7, y: y - 6, w: 15, h: 14 });
    }

    // Guarda-chuva desenhado uma vez por cor e largura: aba com brilho à esquerda e sombra à direita, cabo torto.
    const umbrellas = new Map();
    function umbrella(color, w) {
      const key = `${color}|${w}`;
      let image = umbrellas.get(key);
      if (image) return image;
      image = document.createElement('canvas');
      image.width = w;
      image.height = 8;
      const p = image.getContext('2d');
      const rows = [w - 6, w - 2, w];
      rows.forEach((rw, r) => {
        const x0 = (w - rw) >> 1;
        p.fillStyle = INK;
        p.fillRect(x0, r, rw, r === 0 ? 1 : 1);
        if (r > 0) {
          p.fillStyle = FLAGS[color];
          p.fillRect(x0 + 1, r, rw - 2, 1);
          p.fillStyle = FLAG_LIGHT[color];
          p.fillRect(x0 + 1, r, Math.max(1, (rw - 2) >> 2), 1);
          p.fillStyle = FLAG_DARK[color];
          p.fillRect(x0 + rw - 1 - Math.max(1, (rw - 2) >> 2), r, Math.max(1, (rw - 2) >> 2), 1);
        }
      });
      p.fillStyle = INK;
      p.fillRect(0, 3, w, 1);
      p.fillStyle = '#361a0c';
      p.fillRect(w >> 1, 4, 1, 3);
      p.fillRect((w >> 1) - 1, 7, 2, 1);
      if (umbrellas.size > 24) umbrellas.clear();
      umbrellas.set(key, image);
      return image;
    }

    // Nuvens escuras no alto da festa: uma faixa de bolotas que anda devagar (feita uma vez por largura).
    const cloudStrips = new Map();
    function cloudStrip(width) {
      let image = cloudStrips.get(width);
      if (image) return image;
      image = document.createElement('canvas');
      image.width = width;
      image.height = 24;
      const p = image.getContext('2d');
      const r = mulberry(width * 7 + 3);
      const puffs = [];
      for (let x = -10; x < width + 10; x += 9 + Math.floor(r() * 9)) puffs.push([x, 4 + r() * 5, 6 + r() * 7]);
      for (let y = 0; y < 24; y++) {
        const spans = [];
        for (const [cx, cy, radius] of puffs) {
          const dy = y - cy;
          if (Math.abs(dy) > radius) continue;
          const half = Math.sqrt(radius * radius - dy * dy);
          spans.push([cx - half, cx + half]);
        }
        p.fillStyle = y < 6 ? '#5f6a98' : y < 12 ? '#465178' : y < 17 ? '#343d60' : '#262c48';
        for (const [a, b] of spans) p.fillRect(Math.round(a), y, Math.max(1, Math.round(b - a)), 1);
      }
      if (cloudStrips.size > 8) cloudStrips.clear();
      cloudStrips.set(width, image);
      return image;
    }

    function drawClouds(now, poleTop) {
      const k = fx.wx.rain;
      if (k <= 0.02) return;
      const width = layout.width + 40;
      const strip = cloudStrip(width);
      const y = Math.max(0, poleTop - 34);
      const shift = Math.floor(now / 90) % width;
      g.globalAlpha = Math.min(1, k * 1.1);
      g.drawImage(strip, layout.L - 20 - shift, y);
      g.drawImage(strip, layout.L - 20 - shift + width, y);
      g.globalAlpha = 1;
    }

    // Chuva: duas camadas de gotinhas (uma rápida e densa, uma lenta e rala) desenhadas uma vez e roladas para baixo, e
    // três quadros de respingos na terra. Poucos desenhos por quadro, não uma gota por vez.
    const rainLayers = new Map();
    function rainLayer(width, height, kind) {
      const key = `${width}|${height}|${kind}`;
      let image = rainLayers.get(key);
      if (image) return image;
      image = document.createElement('canvas');
      image.width = width;
      image.height = height;
      const p = image.getContext('2d');
      const r = mulberry(width * 31 + height * 7 + kind);
      const count = Math.round(width * (kind ? 0.22 : 0.5));
      p.fillStyle = kind ? 'rgba(170, 200, 240, 0.5)' : 'rgba(214, 236, 255, 0.78)';
      for (let i = 0; i < count; i++) {
        const x = Math.floor(r() * (width - 2));
        const y = Math.floor(r() * (height - 4));
        p.fillRect(x + 1, y, 1, 2);
        p.fillRect(x, y + 2, 1, 2);
      }
      if (rainLayers.size > 8) rainLayers.clear();
      rainLayers.set(key, image);
      return image;
    }

    const splashes = new Map();
    function splashStrip(width, frame) {
      const key = `${width}|${frame}`;
      let image = splashes.get(key);
      if (image) return image;
      image = document.createElement('canvas');
      image.width = width;
      image.height = 2;
      const p = image.getContext('2d');
      const r = mulberry(width * 13 + frame * 101);
      p.fillStyle = 'rgba(226, 242, 255, 0.75)';
      for (let i = 0; i < width / 9; i++) p.fillRect(Math.floor(r() * (width - 3)), 1, 3, 1);
      if (splashes.size > 12) splashes.clear();
      splashes.set(key, image);
      return image;
    }

    function drawRain(now, poleTop) {
      const k = fx.wx.rain;
      if (k <= 0.02) return;
      const top = Math.max(0, poleTop - 20);
      const height = GROUND - top;
      const width = layout.width;
      for (const [kind, speed] of [[1, 0.13], [0, 0.26]]) {
        const layer = rainLayer(width, height, kind);
        const offset = Math.floor(now * speed) % height;
        g.globalAlpha = k;
        // O pedaço de cima da camada desce até o chão e o de baixo reaparece no alto: rolagem sem emenda.
        g.drawImage(layer, 0, 0, width, height - offset, layout.L, top + offset, width, height - offset);
        if (offset) g.drawImage(layer, 0, height - offset, width, offset, layout.L, top, width, offset);
      }
      g.globalAlpha = k;
      g.drawImage(splashStrip(width, Math.floor(now / 110) % 3), layout.L, GROUND - 2);
      g.globalAlpha = 1;
    }

    // O arco-íris: sete faixas numa elipse que vai do começo ao fim da pista de dança, desenhado uma vez e reusado.
    const rainbows = new Map();
    const RAINBOW = ['#ee2f3c', '#ff8a12', '#ffd21e', '#35a03a', '#3fd6f0', '#3a6cf0', '#9d5cf0'];
    function rainbowImage(x0, x1) {
      const key = `${x0}|${x1}|${GROUND}`;
      let image = rainbows.get(key);
      if (image) return image;
      image = document.createElement('canvas');
      image.width = view.width;
      image.height = H;
      const p = image.getContext('2d');
      const cx = (x0 + x1) / 2;
      const A = (x1 - x0) / 2;
      const B = Math.min(GROUND - 30, 96);
      RAINBOW.forEach((color, k) => {
        const a = A - 3 * k;
        const b = B - 3 * k;
        // Festa estreita: as faixas de dentro não cabem (raio zero ou negativo faria o passo do ângulo nunca chegar ao fim).
        if (a < 3 || b < 3) return;
        p.fillStyle = color;
        for (let angle = 0; angle <= Math.PI; angle += Math.min(0.5, 0.4 / a)) {
          p.fillRect(Math.round(cx - a * Math.cos(angle)) - 1, Math.round(GROUND - 2 - b * Math.sin(angle)) - 1, 3, 3);
        }
      });
      if (rainbows.size > 6) rainbows.clear();
      rainbows.set(key, image);
      return image;
    }

    function drawRainbow(engine) {
      const k = fx.wx.rainbow;
      const w = engine.state.weather.rainbow;
      if (k <= 0.02 || !w) return;
      g.globalAlpha = 0.6 * k;
      g.drawImage(rainbowImage(layout.danceLeft + 6, layout.danceRight - 6), 0, 0);
      g.globalAlpha = 1;
    }

    // O pote de ouro no pé do arco-íris (em frente da festa, clicável): panela preta cheia de moedas e brilhos.
    function drawPot(engine, now) {
      const k = fx.wx.rainbow;
      const w = engine.state.weather.rainbow;
      if (k <= 0.3 || !w) return;
      const x = w.side ? layout.danceRight - 22 : layout.danceLeft + 8;
      const y = GROUND - 11;
      halo(x + 6, y + 4, 10, '#ffd21e', 0.3 + 0.1 * Math.sin(now / 170));
      const coins = [[3, 0], [5, 0], [7, 0], [2, 1], [4, 1], [6, 1], [8, 1]];
      g.fillStyle = INK;
      g.fillRect(x + 1, y + 2, 10, 9);
      g.fillRect(x, y + 4, 12, 5);
      g.fillStyle = '#2a2030';
      g.fillRect(x + 2, y + 5, 8, 5);
      g.fillStyle = '#4a4058';
      g.fillRect(x + 2, y + 5, 2, 3);
      g.fillStyle = INK;
      g.fillRect(x + 1, y + 3, 10, 2);
      for (const [dx, dy] of coins) {
        g.fillStyle = (dx + dy) % 2 ? '#ffd21e' : '#fff07a';
        g.fillRect(x + dx + 1, y + dy + 1, 1, 1);
      }
      g.fillStyle = '#ffd21e';
      g.fillRect(x + 3, y, 6, 2);
      g.fillStyle = '#fff07a';
      g.fillRect(x + 4, y, 2, 1);
      const on = Math.floor(now / 200) % 4;
      const sx = x + 1 + on * 3;
      g.fillStyle = '#fffff0';
      g.fillRect(sx, y - 2, 1, 3);
      g.fillRect(sx - 1, y - 1, 3, 1);
      regions.push({ id: 'pote-ouro', x: x - 1, y: y - 3, w: 14, h: 15 });
      spots.set('pote-ouro', { x: x + 6, y: y - 4 });
    }

    // Guarda-chuva das pessoas da festa quando chove (a maioria abre um).
    function guestUmbrella(seed, x, top, joke = false) {
      if (joke ? seed % 4 === 0 : fx.wx.rain < 0.15 || seed % 3 === 0) return;
      g.drawImage(umbrella((seed >> 4) % FLAGS.length, 9), Math.round(x + 5), Math.round(top - 4));
    }

    // Lua de verdade: a fase vem do relógio (mês lunar de 29,53 dias a partir de uma lua nova conhecida). 0 = nova,
    // 0,5 = cheia. Desenhada como se vê do Brasil (hemisfério sul): a crescente acende do lado esquerdo.
    const SYNODIC = 29.530588853 * 86400000;
    const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
    function moonPhase(time) {
      const p = ((time - NEW_MOON) / SYNODIC) % 1;
      return p < 0 ? p + 1 : p;
    }
    // Quanto da lua está acesa (0 a 1).
    const moonLight = phase => (1 - Math.cos(phase * Math.PI * 2)) / 2;
    const moonCache = new Map();
    function moonImage(meta, phase) {
      const bucket = Math.round(phase * 16) % 16;
      if (moonCache.has(bucket)) return moonCache.get(bucket);
      const source = images[meta.image];
      if (!source || !source.complete || !source.width) return null;
      const image = document.createElement('canvas');
      image.width = meta.w;
      image.height = meta.h;
      const p = image.getContext('2d');
      p.drawImage(source, 0, 0, meta.w, meta.h, 0, 0, meta.w, meta.h);
      // Sombra: o que não está aceso fica quase transparente (dá para ver o contorno da lua nova de leve).
      const q = bucket / 16;
      const a = Math.cos(q * Math.PI * 2);
      const r = (meta.w - 2) / 2;
      const cx = meta.w / 2;
      const cy = meta.h / 2;
      p.globalCompositeOperation = 'destination-out';
      p.fillStyle = 'rgba(0, 0, 0, 0.82)';
      for (let py = 0; py < meta.h; py++) {
        for (let px = 0; px < meta.w; px++) {
          const u = (px + 0.5 - cx) / r;
          const v = (py + 0.5 - cy) / r;
          const edge = Math.sqrt(Math.max(0, 1 - v * v));
          // Hemisfério norte: crescendo, acende a direita; minguando, a esquerda. No sul é o espelho.
          const x = -u;
          const lit = q < 0.5 ? x > a * edge : x < -a * edge;
          if (!lit) p.fillRect(px, py, 1, 1);
        }
      }
      moonCache.set(bucket, image);
      return image;
    }

    function drawSky(engine, now, poleTop) {
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
        // Cruzeiro do Sul (o da bandeira): Gacrux em cima, Acrux embaixo, Mimosa e Delta dos lados e a Intrometida perto
        // do meio, um pouco à esquerda da lua (ou das ilhas), com brilho mais forte que o resto.
        const cx = Math.round(L + layout.width * (layout.islands.length ? 0.42 : 0.2));
        const cy = Math.max(4, Math.min(room - 12, 6));
        for (const [dx, dy, big, k] of [[0, 0, true, 0], [1, 10, true, 1], [-4, 4, true, 2], [5, 5, false, 3], [2, 7, false, 4]]) {
          const glow = Math.sin(now / 900 + k * 2.3);
          const x = cx + dx;
          const y = cy + dy;
          g.fillStyle = glow > 0.3 ? '#fffff0' : '#dfe8ff';
          g.fillRect(x, y, 1, 1);
          if (big) {
            g.fillStyle = `rgba(255, 255, 240, ${(0.35 + 0.25 * glow).toFixed(2)})`;
            g.fillRect(x - 1, y, 3, 1);
            g.fillRect(x, y - 1, 1, 3);
          }
        }
        spots.set('estrelas', { x: (L + R) / 2, y: 12 });
      }
      if (has.has('lua')) {
        const moon = bundle.scenery.lua;
        // Com as ilhas do céu ocupando os cantos, a lua vai para o meio do céu.
        const x = layout.islands.length ? Math.round(L + layout.width * 0.64) : R - moon.w - 6;
        const y = 4 + Math.round(Math.sin(now / 3000));
        const phase = moonPhase(engine.now());
        halo(x + moon.w / 2, y + moon.h / 2, 13, '#fff4c0', 0.2 * moonLight(phase));
        // Clicar na lua faz ela dar um pulinho.
        const bounce = Math.round(critter('lua', x, y, moon.w, moon.h, now) / 2);
        const image = moonImage(moon, phase);
        if (image) g.drawImage(image, x, y + bounce);
        else sprite(moon, 0, x, y + bounce);
        spots.set('lua', { x: x + moon.w / 2, y: y + 6 });
      }
      drawShootingStar(engine, now, poleTop);
      drawDrones(now);
      drawAsaBranca(now, poleTop);
      if (has.has('pipa')) {
        const kite = bundle.scenery.pipa;
        const kx = Math.round((layout.islands.length ? L + layout.width * 0.3 : L + 22) + Math.sin(now / 1700) * 5 + fx.windNow * 8);
        const ky = Math.round(Math.max(3, poleTop - 40) + Math.cos(now / 1300) * 3);
        const [ax, ay, bx, by] = [L - 2, poleTop, kx + 6, ky + 9];
        g.fillStyle = 'rgba(255, 244, 228, 0.8)';
        for (let k = 0; k <= 30; k++) {
          const t = k / 30;
          g.fillRect(Math.round(ax + (bx - ax) * t), Math.round(ay + (by - ay) * t + Math.sin(t * Math.PI) * 6), 1, 1);
        }
        // Clicar na pipa faz ela dar um puxão.
        const tug = Math.round(critter('pipa', kx, ky, kite.w, kite.h, now) / 2);
        sprite(kite, frameAt(kite, now), kx, ky + tug);
        spots.set('pipa', { x: kx + 6, y: ky + 4 });
      }
      // Balão de ar quente amarrado atrás do lado direito: balança devagar, a corda desce até o chão, e a chama do
      // maçarico acende o fundo do balão.
      if (has.has('balao-grande')) {
        const balloon = bundle.scenery['balao-grande'];
        const bx = Math.round(R - 46 + Math.sin(now / 2100) * 3);
        const by = Math.round(GROUND - 96 + Math.cos(now / 1500) * 2);
        g.fillStyle = 'rgba(54, 26, 12, 0.9)';
        for (let y = by + balloon.h - 3; y < GROUND - 6; y += 2) g.fillRect(bx + Math.round(balloon.w / 2), y, 1, 1);
        const frame = frameAt(balloon, now);
        if (frame) halo(bx + balloon.w / 2, by + 20, 6, '#ffac2a', 0.4);
        sprite(balloon, frame, bx, by);
        spots.set('balao-grande', { x: bx + balloon.w / 2, y: by + 10 });
      }
    }

    // Estrela cadente: de vez em quando (da Quermesse em diante) risca o céu acima do varal, com rastro que apaga.
    // Show de drones do Maior São João do Mundo (porte 4): de tempos em tempos, pontinhos de luz sobem de trás do palco e
    // desenham no céu um coração, uma estrela, um balão junino, um "VIVA" e a própria Mandioca, e descem apagando. Fica no
    // céu (atrás das bandeirinhas e do palco), como coisa longe.
    const DRONE_COUNT = 34;
    const DRONE_COLORS = { R: '#ff4f5e', A: '#ffe27a', J: '#6fa8ff', G: '#7ef07a', D: '#e3a232', K: '#ff8a12', H: '#ff8ad0', W: '#ffffff' };
    const DRONE_SHAPES = [
      ['.HH.HH.', 'HHHHHHH', 'HHHHHHH', '.HHHHH.', '..HHH..', '...H...'],
      ['...A...', '...A...', 'AAAAAAA', '.AAAAA.', '..AAA..', '.AA.AA.', 'A.....A'],
      ['...R...', '..RAR..', '.RAJAR.', 'RAJJJAR', '.RAJAR.', '..RAR..', '...R...', '...K...'],
      ['A...A.AAA.A...A..A..', 'A...A..A..A...A.A.A.', '.A.A...A...A.A..AAA.', '..A...AAA...A...A.A.'],
      ['..G.G..', '.GGGGG.', '...G...', '..DDD..', '..DDD..', '..DDD..', '...D...'],
      ['...K...', '..KAK..', '.KAWAK.', '.KAWAK.', '..RRR..', '.D.D.D.'],
      ['RRWWWRR', 'RWJWJWR', 'RRWWWRR', 'RWJWJWR', 'RRWWWRR']
    ];
    // Formas de 0 a 2 e 5 e 6 se revezam; o VIVA (3) e a Mandioca (4) fecham todo show.
    const DRONE_OPEN = [0, 1, 2, 5, 6];
    const DRONE_SHOW = 5;
    const DRONE_MOVE = 1800;
    const DRONE_HOLD = 3600;
    const dronePoints = DRONE_SHAPES.map(rows => {
      const points = [];
      rows.forEach((row, y) => [...row].forEach((char, x) => { if (char !== '.') points.push({ x, y, color: DRONE_COLORS[char] }); }));
      const w = rows[0].length;
      const h = rows.length;
      // Cada drone vai para um ponto (os que sobram repetem pontos, os que faltam pulam pontos igualmente).
      return Array.from({ length: DRONE_COUNT }, (_, i) => {
        const p = points[Math.floor(i * points.length / DRONE_COUNT)];
        return { x: (p.x - (w - 1) / 2) * 3, y: (p.y - (h - 1) / 2) * 3, color: p.color };
      });
    });
    function drawDrones(now) {
      if (layout.tier < 4) { fx.drones = null; return; }
      const d = fx.drones || (fx.drones = { at: 0, next: now + 60000 + rng() * 60000 });
      const total = DRONE_MOVE + DRONE_SHOW * (DRONE_MOVE + DRONE_HOLD) + DRONE_MOVE;
      if (!d.at && now >= d.next && fx.wx.rain < 0.15) {
        // Três formas sorteadas e depois VIVA e a Mandioca (com chuva, os drones esperam).
        const open = [...DRONE_OPEN].sort(() => rng() - 0.5).slice(0, 3);
        Object.assign(d, { at: now, said: false, viva: false, order: [...open, 3, 4] });
        sound('drones');
      }
      if (!d.at) return;
      const age = now - d.at;
      if (age > total) { d.at = 0; d.next = now + 480000 + rng() * 240000; return; }
      if (!d.said && age > DRONE_MOVE) {
        d.said = true;
        const guest = layout.audience[Math.floor(rng() * layout.audience.length)];
        if (guest) say(tr('fx.drones'), guest.x + 6, GROUND - 40, now, '#cfe3ff', 2200, 6);
      }
      const cx = Math.round(layout.L + layout.width * 0.4);
      const cy = 28 + (layout.islands.length ? ISLAND_SKY * 0.5 : 0);
      const base = { x: 0, y: GROUND - cy - 20 };
      const ease = t => t * t * (3 - 2 * t);
      // Em que forma está (e a anterior, para a travessia), e quanto já andou.
      const slot = DRONE_MOVE + DRONE_HOLD;
      const local = age - DRONE_MOVE;
      const index = Math.max(-1, Math.min(DRONE_SHOW, Math.floor(local / slot)));
      const order = d.order || [0, 1, 2, 3, 4];
      const shape = k => dronePoints[order[Math.max(0, Math.min(DRONE_SHOW - 1, k))]];
      // Quando os drones escrevem VIVA, a plateia comemora junto.
      if (order[index] === 3 && !d.viva) { d.viva = true; fx.celebrateUntil = now + 1600; }
      for (let i = 0; i < DRONE_COUNT; i++) {
        let from;
        let to;
        let t;
        let fade = 1;
        if (age < DRONE_MOVE) {
          from = { x: (i - DRONE_COUNT / 2) * 2, y: base.y };
          to = shape(0)[i];
          t = age / DRONE_MOVE;
          fade = Math.min(1, age / 400);
        } else if (index >= DRONE_SHOW) {
          from = shape(DRONE_SHOW - 1)[i];
          to = { x: (i - DRONE_COUNT / 2) * 2, y: base.y };
          t = Math.min(1, (local - DRONE_SHOW * slot) / DRONE_MOVE);
          fade = 1 - t;
        } else {
          const inSlot = local - index * slot;
          from = shape(index - 1)[i];
          to = shape(index)[i];
          t = index === 0 ? 1 : Math.min(1, inSlot / DRONE_MOVE);
        }
        const k = ease(Math.max(0, Math.min(1, t)));
        const x = Math.round(cx + from.x + (to.x - from.x) * k);
        const y = Math.round(cy + from.y + (to.y - from.y) * k + Math.sin(now / 500 + i) * 0.4);
        const color = (k > 0.5 ? to.color : from.color) || '#ffffff';
        const twinkle = 0.75 + 0.25 * Math.sin(now / 160 + i * 1.3);
        g.globalAlpha = fade * twinkle;
        halo(x, y, 2, color, 0.35 * fade);
        g.fillStyle = color;
        g.fillRect(x, y, 1, 1);
        g.globalAlpha = 1;
      }
    }

    // Asa-branca: de vez em quando um bando de pombas asa-branca (a da música do Luiz Gonzaga) cruza o céu em V, bem
    // longe, batendo as asas cada uma no seu tempo. Às vezes alguém da plateia repara.
    const FLOCK_MS = 9000;
    function drawAsaBranca(now, poleTop) {
      if (layout.tier < 1) return;
      const f = fx.flock || (fx.flock = { at: 0, next: now + 90000 + rng() * 90000 });
      if (!f.at && now >= f.next && fx.wx.rain < 0.15) {
        Object.assign(f, { at: now, dir: rng() < 0.5 ? 1 : -1, n: 5 + Math.floor(rng() * 3), y: 16 + rng() * Math.max(4, poleTop - 30), said: false });
      }
      if (!f.at) return;
      const t = (now - f.at) / FLOCK_MS;
      if (t >= 1) { f.at = 0; f.next = now + 180000 + rng() * 180000; return; }
      if (!f.said && t > 0.35 && layout.audience.length) {
        f.said = true;
        if (rng() < 0.4) {
          const guest = layout.audience[Math.floor(rng() * layout.audience.length)];
          say(tr('fx.asaBranca'), guest.x + 6, GROUND - 40, now, '#fff8e8', 2200, 6);
        }
      }
      const span = layout.width + 60;
      const lead = f.dir > 0 ? layout.L - 30 + span * t : layout.R + 30 - span * t;
      for (let i = 0; i < f.n; i++) {
        // Formação em V: a da frente puxa, as outras vêm atrás, alternando os lados.
        const rank = Math.ceil(i / 2);
        const side = i % 2 ? -1 : 1;
        const x = Math.round(lead - f.dir * rank * 7);
        const y = Math.round(f.y + side * rank * 4 + Math.sin(now / 600 + i) * 0.6);
        const up = Math.floor(now / 170 + i * 0.7) % 2 === 0;
        g.fillStyle = '#f4f2ea';
        g.fillRect(x - 1, y, 3, 1);
        g.fillRect(x - 2, y + (up ? -1 : 1), 1, 1);
        g.fillRect(x + 2, y + (up ? -1 : 1), 1, 1);
        g.fillStyle = '#9aa0ae';
        g.fillRect(x, y, 1, 1);
      }
    }

    // Chuvas de meteoros de verdade (mês, dia do pico): na noite do pico e na vizinha, o céu da festa ganha estrela
    // cadente a cada poucos segundos. Quadrântidas, Líridas, Eta Aquáridas, Delta Aquáridas, Perseidas, Oriônidas,
    // Leônidas e Geminídeas.
    const METEOR_PEAKS = [[1, 3], [4, 22], [5, 6], [7, 30], [8, 12], [10, 21], [11, 17], [12, 14]];
    function meteorNight(time) {
      const day = new Date(time);
      return METEOR_PEAKS.some(([month, peak]) => {
        const at = new Date(day.getFullYear(), month - 1, peak).getTime();
        return Math.abs(time - at) < 1.5 * 86400000;
      });
    }

    function drawShootingStar(engine, now, poleTop) {
      if (layout.tier < 1) return;
      if (!fx.nextShoot) fx.nextShoot = now + 6000 + rng() * 10000;
      const shower = meteorNight(engine.now());
      if (shower && !fx.showerSaid && layout.audience.length) {
        fx.showerSaid = true;
        const guest = layout.audience[Math.floor(rng() * layout.audience.length)];
        say(tr('fx.meteoros'), guest.x + 6, GROUND - 40, now + 3000, '#cfe3ff', 2400, 6);
      }
      if (shower && fx.nextShoot - now > 4500) fx.nextShoot = now + 1500 + rng() * 3000;
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
        // A igrejinha é clicável: o sino toca e ela dá um tremidinho. O carrossel e o cata-vento, clicados, giram mais
        // depressa por uns segundos (como a roda-gigante).
        const shake = item.id === 'igrejinha' ? Math.round(critter('igreja', item.x, y, item.meta.w, item.meta.h, now) / 4) : 0;
        let frame = frameAt(item.meta, now, item.x * 0.1);
        if (SPINNERS.has(item.id)) {
          critter(item.id, item.x, y, item.meta.w, item.meta.h, now);
          const spin = fx.spinners[item.id] || (fx.spinners[item.id] = { phase: item.x * 0.1, last: now });
          const step = Math.min(100, Math.max(0, now - spin.last));
          spin.last = now;
          spin.phase += step / 1000 * (item.meta.fps || 0) * (now - (fx.react[item.id] ?? -1e9) < 3000 ? 4 : 1);
          frame = item.meta.frames > 1 ? Math.floor(spin.phase) % item.meta.frames : 0;
        }
        sprite(item.meta, frame, item.x, y + shake);
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
    // Balãozinho de papel do varal (contorno, papel colorido e a chama no meio), um por cor e chama.
    const lanternCache = new Map();
    function paperLantern(color, bright) {
      const key = color * 2 + (bright ? 1 : 0);
      let image = lanternCache.get(key);
      if (image) return image;
      image = document.createElement('canvas');
      image.width = 5;
      image.height = 5;
      const p = image.getContext('2d');
      p.fillStyle = INK;
      p.fillRect(1, 0, 3, 1);
      p.fillRect(0, 1, 5, 3);
      p.fillRect(1, 4, 3, 1);
      p.fillStyle = FLAGS[color];
      p.fillRect(1, 1, 3, 3);
      p.fillStyle = bright ? '#fff8e8' : '#ffd21e';
      p.fillRect(2, 2, 1, 1);
      lanternCache.set(key, image);
      return image;
    }

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
        halo(lx + 2, ly + 2, 4, FLAGS[i % FLAGS.length], 0.28);
        g.drawImage(paperLantern(i % FLAGS.length, Math.sin(now / 400 + i * 2.3) > -0.7), lx, ly);
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

    // Bichos que reagem ao clique: pulinho, o grito escrito em cima e, para a galinha, umas penas. Cada bicho tem um
    // id de região `bicho:<tipo>[:<n>]`; `react` guarda a hora do último clique em cada um.
    const CRITTER_SAYS = { papagaio: ['CURRUPACO!', 'CRAAA!'], 'carro-boi': ['MUUU!', 'NHEC NHEC!'], galinha: ['CO-CO-CO!', 'COCORICO!'], pintinho: ['PIU!', 'PIU PIU!'], bode: ['BEEE!'],
      gato: ['MIAU!', 'RRRR...'], boi: ['MUUU!'], igreja: ['DENG DONG!', 'BLIM BLOM!'], lua: ['ZZZ...', 'WOW!'], roda: ['WHEEE!', 'UHUU!'], trem: ['PIUIII!', 'TCHU TCHU!'], sapo: ['CROAC!', 'COAX!'], carrossel: ['UIII!', 'OBA!'], jegue: ['IÓ-IÓ!', 'IÓÓÓ!', 'HUMF!'], kombi: ['BI-BI!', 'FOM FOM!'], catavento: ['VUUU!', 'FIU!'], caramelo: ['AU AU!', 'AUUU!', 'HUMF!'], pipa: ['ZUM!', 'WHOOSH!'], amendoim: ['QUEM QUER?', 'AMENDOIM!'], crianca: ['HIHI!', 'PEGA!', 'OBA!'] };
    const critterHop = (id, now) => {
      const t = now - (fx.react[id] ?? -1e9);
      return t >= 0 && t < 380 ? -Math.round(3 * Math.sin(Math.PI * t / 380)) : 0;
    };
    // Região clicável do bicho e o pulinho do clique: devolve o quanto ele subiu.
    function critter(id, x, y, w, h, now) {
      const hop = critterHop(id, now);
      regions.push({ id: `bicho:${id}`, x: Math.round(x), y: Math.round(y + hop), w, h });
      return hop;
    }

    // Vira-lata caramelo: passeia pela frente da festa, senta abanando o rabo e, de vez em quando, vai dormir do lado da
    // fogueira. Um clique acorda ele (se estiver dormindo), e ele late e solta corações.
    function drawDog(engine, now) {
      const dog = bundle.scenery.caramelo;
      const d = fx.dog;
      const lo = layout.L + 6;
      const hi = layout.R - dog.w - 6;
      const bed = Math.max(lo, Math.round(layout.fire.x - dog.w - 1));
      if (!d.plan) Object.assign(d, { plan: 'roam', nextNap: now + 20000 + rng() * 30000, poked: fx.react.caramelo || 0 });
      if ((fx.react.caramelo || 0) > d.poked) {
        d.poked = fx.react.caramelo;
        if (d.plan !== 'roam') Object.assign(d, { plan: 'roam', nextNap: now + 30000 + rng() * 30000 });
        for (let i = 0; i < 3; i++) float('coracao', (d.x || lo) + dog.w / 2 + (i - 1) * 6, GROUND - dog.h - 8 - (i % 2) * 3, now, ['#ff4f9e', '#ff8a96']);
      }
      let frame;
      const bunny = fx.bunny;
      if (!d.nextChase) d.nextChase = now + 45000 + rng() * 45000;
      if (d.plan === 'roam' && now >= d.nextChase && engine.charActive('sopinha') && bunny.x !== undefined && bunny.mode !== 'deita') {
        // Pega-pega: o caramelo late e sai correndo atrás do Sopinha, que foge pulando para o outro lado.
        d.nextChase = now + 90000 + rng() * 90000;
        Object.assign(d, { plan: 'chase', until: now + 4200 });
        say(tr('fx.woof'), d.x + dog.w / 2, GROUND - dog.h - 6, now, '#fff8e8', 900, 8);
        bunny.flee = { until: now + 4000 };
      }
      // Penetra na festa: o caramelo acorda, corre até ele e fica latindo enquanto ele estiver ali.
      if (fx.crasherX != null && d.plan !== 'guard') {
        Object.assign(d, { plan: 'guard', barkAt: now });
        if (d.x === undefined) d.x = lo;
      }
      if (d.plan === 'guard') {
        const step = Math.min(100, Math.max(0, now - (d.at || now))) * 0.05;
        d.at = now;
        if (fx.crasherX == null) Object.assign(d, { plan: 'roam', mode: 'para', until: now + 2000 });
        else {
          const target = Math.max(lo, Math.min(hi, fx.crasherX - dog.w / 2 - Math.sign(fx.crasherX - dog.w / 2 - d.x || 1) * 14));
          const gap = target - d.x;
          d.dir = Math.sign(fx.crasherX - (d.x + dog.w / 2)) || d.dir;
          d.x += Math.sign(gap) * Math.min(Math.abs(gap), step);
          frame = Math.abs(gap) > 1 ? Math.floor(now / 70) % 4 : 4 + Math.floor(now / 180) % 2;
          if (Math.abs(gap) <= 1 && now >= d.barkAt) {
            d.barkAt = now + 1300 + rng() * 800;
            say(tr('fx.woof'), d.x + dog.w / 2, GROUND - dog.h - 6, now, '#fff8e8', 800, 8);
            sound('latido');
          }
        }
      }
      // De guarda, o quadro já saiu acima; se o penetra foi embora neste quadro, ele cai no passeio logo abaixo.
      if (d.plan === 'guard') frame = frame ?? 4;
      else if (d.plan === 'chase') {
        const step = Math.min(100, Math.max(0, now - (d.at || now))) * 0.05;
        d.at = now;
        const target = (bunny.x ?? d.x) - Math.sign((bunny.x ?? d.x) - d.x || 1) * 10;
        const gap = target - d.x;
        if (Math.abs(gap) > 1) d.dir = Math.sign(gap);
        d.x = Math.max(lo, Math.min(hi, d.x + Math.sign(gap) * Math.min(Math.abs(gap), step)));
        frame = Math.floor(now / 70) % 4;
        if (now >= d.until) Object.assign(d, { plan: 'roam', mode: 'para', until: now + 2500, nextNap: Math.max(d.nextNap, now + 20000) });
      } else if (d.plan === 'roam') {
        const state = roam(d, now, lo, hi, 0.02, 0.45);
        frame = state.mode === 'anda' ? Math.floor(now / 110) % 4 : 4 + Math.floor(now / 260) % 2;
        if (now >= d.nextNap) d.plan = 'bed';
      } else if (d.plan === 'bed') {
        // Vai trotando até o cantinho quente do lado da fogueira.
        const step = Math.min(100, Math.max(0, now - (d.at || now))) * 0.024;
        d.at = now;
        const gap = bed - d.x;
        d.dir = Math.sign(gap) || d.dir;
        d.x += Math.sign(gap) * Math.min(Math.abs(gap), step);
        frame = Math.floor(now / 110) % 4;
        if (Math.abs(bed - d.x) < 0.5) Object.assign(d, { plan: 'sleep', wake: now + 9000 + rng() * 9000, dir: 1 });
      } else {
        d.at = now;
        frame = 6 + Math.floor(now / 900) % 2;
        if (now >= (d.nextZ || 0)) {
          d.nextZ = now + 2200 + rng() * 1600;
          say('Z', d.x + dog.w - 3, GROUND - dog.h + 4, now, '#cfe3ff', 1500, 9);
        }
        if (now >= d.wake) Object.assign(d, { plan: 'roam', until: 0, nextNap: now + 40000 + rng() * 40000 });
      }
      const y = GROUND - dog.h + 2;
      shadow(d.x + dog.w / 2, dog.w - 6, 0.7);
      const hop = critter('caramelo', d.x, y, dog.w, dog.h, now);
      sprite(dog, frame, d.x, y + hop, d.dir < 0);
      spots.set('caramelo', { x: d.x + dog.w / 2, y: y + 4 });
    }

    // Sapinho do quintal (só nas festas pequenas): de vez em quando entra por um lado e atravessa aos pulinhos, inflando a
    // papada entre um pulo e outro. Um clique faz ele coaxar e pular na hora.
    function drawFrog(now) {
      const frog = bundle.scenery.sapo;
      const f = fx.frog;
      if (!f.active) {
        if (!f.nextAt) f.nextAt = now + 15000 + rng() * 25000;
        if (now < f.nextAt) return;
        const dir = rng() < 0.5 ? 1 : -1;
        Object.assign(f, { active: true, dir, x: dir > 0 ? layout.L - frog.w : layout.R, hopAt: now + 400, from: 0, poked: fx.react.sapo || 0 });
      }
      if ((fx.react.sapo || 0) > f.poked) { f.poked = fx.react.sapo; f.hopAt = Math.min(f.hopAt, now); }
      let x = f.x;
      let lift = 0;
      let frame = Math.floor(now / 380) % 2;
      if (now >= f.hopAt) {
        if (!f.hopping) Object.assign(f, { hopping: true, from: f.x, start: now });
        const t = Math.min(1, (now - f.start) / 420);
        x = f.from + f.dir * 14 * t;
        lift = Math.round(Math.sin(Math.PI * t) * 6);
        frame = 2;
        if (t >= 1) {
          Object.assign(f, { hopping: false, x, hopAt: now + 500 + rng() * 900 });
          if (x < layout.L - frog.w - 2 || x > layout.R + 2) Object.assign(f, { active: false, nextAt: now + 30000 + rng() * 40000 });
        }
      }
      const y = GROUND - frog.h + 2 - lift;
      critter('sapo', x, y, frog.w, frog.h, now);
      sprite(frog, frame, x, y, f.dir < 0);
    }

    // Trem da alegria (festas enormes): dá a volta pela frente da festa com a criançada, soltando fumaça pela chaminé.
    function drawTrain(now) {
      const train = bundle.scenery.trem;
      const span = layout.width + train.w * 2;
      const x = Math.round(layout.L - train.w + ((now * 0.012) % span));
      const y = GROUND - train.h + 4;
      const hop = critter('trem', x, y, train.w, train.h, now);
      sprite(train, Math.floor(now / 150) % train.frames, x, y + hop);
      if (now >= (fx.nextTrainSmoke || 0)) {
        fx.nextTrainSmoke = now + 380 + rng() * 200;
        fx.particles.push({ x: x + train.w - 16, y: y + 2, vx: -0.004, vy: -0.01, born: now, ttl: 1400, smoke: true, wobble: rng() * 6 });
      }
      spots.set('trem', { x: x + train.w / 2, y: y + 6 });
    }

    // Sanfoneiro Andarilho: atravessa a festa pela frente, da esquerda para a direita, no tempo da visita (pelo relógio do
    // motor), abrindo e fechando o fole; halo dourado e notinhas subindo. Clicar cumprimenta.
    // "Olha a cobra!": a cobra de pano atravessa a pista rente ao chão, na frente dos pares, em cobraSeconds. Quem está
    // perto pula (drawCrowd lê fx.cobraX), clicar nela pega (região 'cobra') e, se chegar do outro lado, é mentira.
    function cobraTrack(engine, now) {
      const snake = bundle.scenery.cobra;
      const r = engine.state.runtime;
      if (!snake) return null;
      const total = engine.cfg.cobraSeconds * 1000;
      // Festa aberta no meio da travessia: a cobra entra de onde já devia estar.
      if (!fx.cobra && r.cobraLeft > 0) fx.cobra = { start: now - (total - r.cobraLeft * 1000), dir: r.cobraDir || 1, caught: null, shouts: 0 };
      const c = fx.cobra;
      if (!c) return null;
      if (c.caught != null) return c.at;
      // O motor já encerrou (ou a festa recarregou): a cobra não fica parada na beira da pista.
      if (!(r.cobraLeft > 0) && now - c.start > total + 500) { fx.cobra = null; return null; }
      const t = Math.max(0, Math.min(1, (now - c.start) / total));
      const from = layout.danceLeft - snake.w - 6;
      const to = layout.danceRight + 6;
      const x = Math.round(c.dir > 0 ? from + (to - from) * t : to - (to - from) * t);
      return { x, t };
    }

    function drawCobra(engine, now, floor) {
      const c = fx.cobra;
      const snake = bundle.scenery.cobra;
      if (!c || !snake) return;
      const flip = c.dir < 0;
      const base = floor - snake.h + 4;
      if (c.caught != null) {
        // Pegou: a cobra sobe molinha no ar e some.
        const t = (now - c.caught) / 800;
        if (t >= 1) { fx.cobra = null; return; }
        g.globalAlpha = Math.max(0, 1 - t * t);
        sprite(snake, Math.floor(now / 60) % snake.frames, c.at.x, base - Math.round(22 * Math.sin(t * Math.PI / 2)), flip);
        g.globalAlpha = 1;
        return;
      }
      const at = cobraTrack(engine, now);
      if (!at) return;
      shadow(at.x + snake.w / 2, snake.w - 6, 0.5);
      sprite(snake, Math.floor(now / 110) % snake.frames, at.x, base, flip);
      regions.push({ id: 'cobra', x: at.x - 4, y: base - 6, w: snake.w + 8, h: snake.h + 10 });
      // Duas vezes na travessia alguém do par mais perto grita.
      if (c.shouts < 2 && at.t > [0.3, 0.65][c.shouts] && layout.couples.length) {
        const guest = layout.couples.reduce((best, cand) => Math.abs(cand.x + 12 - at.x) < Math.abs(best.x + 12 - at.x) ? cand : best);
        say(tr(`fx.cobraAi.${Math.floor(rng() * 3)}`), guest.x + 12, floor - 32, now, '#fff07a', 900, 6);
        c.shouts++;
      }
    }

    // O peixinho que pula da pescaria quando sai prenda: laranja com a barbatana, virando no ar, e o respingo azul.
    const FISH_MS = 900;
    function drawFishJump(now) {
      const f = fx.fishJump;
      if (!f) return;
      const t = (now - f.at) / FISH_MS;
      if (t >= 1) {
        if (!f.splashed) {
          f.splashed = true;
          for (let i = 0; i < 6; i++) {
            fx.particles.push({ x: f.x + f.dir * 16 + (rng() - 0.5) * 4, y: f.y, vx: (rng() - 0.5) * 0.03, vy: -0.03 - rng() * 0.02,
              gravity: 0.00012, born: now, ttl: 380, colors: ['#9fc8ff', '#48a8ff'] });
          }
        }
        fx.fishJump = null;
        return;
      }
      const x = Math.round(f.x + f.dir * 16 * t);
      const y = Math.round(f.y - Math.sin(t * Math.PI) * 18);
      const head = t < 0.5 ? -1 : 1;
      g.fillStyle = INK;
      g.fillRect(x - 3, y - 1, 7, 4);
      g.fillStyle = '#ff8a12';
      g.fillRect(x - 2, y, 4, 2);
      g.fillStyle = '#ffc460';
      g.fillRect(x - 2, y, 2, 1);
      // Rabo do lado de trás do pulo e o olhinho na frente.
      g.fillStyle = '#b44a0a';
      g.fillRect(f.dir > 0 ? x - 3 : x + 2, y + (head < 0 ? 0 : 1), 1, 1);
      g.fillStyle = INK;
      g.fillRect(f.dir > 0 ? x + 1 : x - 2, y, 1, 1);
    }

    // Rabo no burro: o cavalete na beira da pista, o rabo balançando por cima do papel (vendado) e, depois do clique, o
    // rabo pregado onde caiu. O balanço vem do motor (engine.burroOffset), para o desenho e a nota baterem.
    const BURRO_ALVO = [23, 10];
    function drawBurro(engine, now) {
      const b = engine.state.burro && engine.state.burro.active;
      const meta = bundle.scenery.burro;
      if (!b || !meta) { fx.burroPos = null; return; }
      // Na beira esquerda da pista, sem nunca tapar a Mandioca.
      const x = Math.round(Math.min(layout.danceLeft + 2, layout.host.x - meta.w - 2));
      const y = GROUND - meta.h + 3;
      shadow(x + meta.w / 2, meta.w - 4, 0.8);
      sprite(meta, 0, x, y);
      const [dx, dy] = b.pinned ? [b.pinned.dx, b.pinned.dy] : engine.burroOffset(engine.now() - b.born);
      const tx = x + BURRO_ALVO[0] + dx;
      const ty = y + BURRO_ALVO[1] + dy;
      // O rabo: a cordinha marrom e o tufo escuro na ponta.
      g.fillStyle = '#58341c';
      g.fillRect(tx, ty, 1, 1);
      g.fillRect(tx + 1, ty + 1, 1, 1);
      g.fillRect(tx + 1, ty + 2, 1, 1);
      g.fillStyle = '#2e1812';
      g.fillRect(tx + 1, ty + 3, 2, 2);
      g.fillRect(tx + 2, ty + 5, 1, 1);
      fx.burroPos = { x: x + meta.w / 2, y, pinned: !!b.pinned };
      if (!b.pinned) {
        regions.push({ id: 'burro', x: x - 2, y: y - 4, w: meta.w + 4, h: meta.h + 6 });
        spots.set('burro', { x: x + meta.w / 2, y });
        if (now >= (fx.burroHintAt || 0)) {
          fx.burroHintAt = now + 3200;
          say(tr('fx.sacoYou'), x + meta.w / 2, Math.max(10, y - 8), now, '#fffff0', 1200, 6);
        }
      }
    }

    // Estalinho (a bombinha de papel que estoura no chão): as crianças jogam um de vez em quando no pé da plateia, e
    // clicar no chão da festa joga outro ali. Clarão, faísca, fumacinha, um "pá!" e quem está perto dá um pulo.
    function estalo(x, y, now) {
      if (now - (fx.estaloAt || -1e9) < 180) return false;
      fx.estaloAt = now;
      fx.particles.push({ x: x - 1, y: y - 2, vx: 0, vy: 0, born: now, ttl: 140, colors: ['#fffff0'], shape: 'brilho' });
      for (let k = 0; k < 6; k++) {
        fx.particles.push({ x, y: y - 1, vx: (rng() - 0.5) * 0.08, vy: -0.03 - rng() * 0.04, gravity: 0.00012, born: now,
          ttl: 200 + rng() * 180, colors: SPARK, ember: true });
      }
      fx.particles.push({ x, y: y - 3, vx: (rng() - 0.5) * 0.004, vy: -0.006, born: now, ttl: 800, smoke: true });
      say(tr(`fx.estalo.${Math.floor(rng() * 3)}`), x, y - 10, now, '#fff8e8', 650, 6);
      fx.startle = { x, until: now + 380 };
      // O Sopinha perto do estalo dá um binky (o pulinho de coelho feliz).
      if (fx.bunny && fx.bunny.x !== undefined && Math.abs(fx.bunny.x - x) < 24) fx.bunny.poke = true;
      sound('estalo');
      return true;
    }

    function ambientEstalo(now) {
      if (layout.tier < 1 || fx.wx.rain >= 0.15 || !layout.audience.length) return;
      if (!fx.nextEstalo) fx.nextEstalo = now + 20000 + rng() * 20000;
      if (now < fx.nextEstalo) return;
      fx.nextEstalo = now + 25000 + rng() * 30000;
      const guest = layout.audience[Math.floor(rng() * layout.audience.length)];
      estalo(Math.round(guest.x + 6 + (rng() - 0.5) * 8), GROUND - 8, now);
    }

    // Clique no chão (coordenadas da tela): estalinho no ponto, rente ao chão.
    function throwEstalo(clientX, clientY, now = root.performance?.now?.() || 0) {
      const point = locate(clientX, clientY);
      if (!point || !layout) return false;
      const y = Math.min(GROUND + 2, Math.max(GROUND - 12, point.y - view.float));
      return estalo(point.x, y, now);
    }

    function drawVisitor(engine, now) {
      const v = engine.state.visitor && engine.state.visitor.active;
      const meta = bundle.scenery.sanfoneiro;
      if (!v || !meta) { fx.visitorPos = null; return; }
      const p = Math.max(0, Math.min(1, (engine.now() - v.born) / Math.max(1, v.until - v.born)));
      const x = Math.round(layout.L - meta.w + p * (layout.width + meta.w));
      const y = GROUND - meta.h + 2 - (Math.floor(now / 180) % 2);
      halo(x + meta.w / 2, y + meta.h / 2, 14, '#ffd21e', 0.18 + 0.06 * Math.sin(now / 200));
      shadow(x + meta.w / 2, meta.w - 2, 0.8);
      sprite(meta, Math.floor(now / 180) % meta.frames, x, y);
      if (now >= (fx.nextVisitorNote || 0)) {
        fx.nextVisitorNote = now + 420 + rng() * 260;
        float('nota', x + meta.w / 2, y - 2, now, ['#ffd21e', '#fff07a', FLAGS[Math.floor(rng() * 6)]]);
      }
      fx.visitorPos = { x: x + meta.w / 2, y };
      if (!v.greeted) {
        regions.push({ id: 'sanfoneiro', x: x - 2, y: y - 4, w: meta.w + 4, h: meta.h + 6 });
        spots.set('sanfoneiro', { x: x + meta.w / 2, y });
      }
    }

    // Fotógrafo lambe-lambe: entra pela direita empurrando o tripé, monta a câmera ao lado da Mandioca e do par (a
    // lente virada para eles) e espera a pose debaixo do pano preto. Clicar nele (região 'fotografo') tira o retrato;
    // depois ele fecha o tripé e vai embora por onde veio.
    function drawFotografo(engine, now) {
      const f = engine.state.fotografo && engine.state.fotografo.active;
      const meta = bundle.scenery.fotografo;
      if (!f || !meta) { fx.fotoPos = null; return; }
      const t = engine.now();
      const walk = engine.cfg.fotoWalk * 1000;
      const beside = layout.par ? layout.par.x + 18 : layout.host.x + 30;
      const spot = Math.round(Math.min(layout.R - meta.w, beside));
      const out = layout.R + 10;
      let x = spot;
      let frame = 4 + (Math.floor(now / 700) % 2);
      let flip = false;
      if (t < f.born + walk) {
        x = Math.round(out + (spot - out) * Math.max(0, t - f.born) / walk);
        frame = Math.floor(now / 200) % 4;
      } else if (t >= f.leaveAt) {
        x = Math.round(spot + (out - spot) * Math.min(1, (t - f.leaveAt) / Math.max(1, f.until - f.leaveAt)));
        frame = Math.floor(now / 200) % 4;
        flip = true;
      }
      const y = GROUND - meta.h + 2;
      const ready = t >= f.born + walk && t < f.leaveAt && !f.shot;
      // Esperando a pose: um brilho claro pulsando em volta, para ele não sumir no meio da plateia.
      if (ready) halo(x + meta.w / 2, y + meta.h / 2, 15, '#fffff0', 0.14 + 0.06 * Math.sin(now / 240));
      shadow(x + meta.w / 2 + 3, meta.w - 6, 0.8);
      sprite(meta, frame, x, y, flip);
      const lens = { x: x + 7, y: y + 10 };
      if (now < (fx.fotoFlash || 0)) {
        const k = (fx.fotoFlash - now) / 260;
        halo(lens.x, lens.y, 16, '#ffffff', 0.9 * k);
        g.fillStyle = '#ffffff';
        g.fillRect(lens.x - 2, lens.y, 5, 1);
        g.fillRect(lens.x, lens.y - 2, 1, 5);
      }
      fx.fotoPos = { x: x + meta.w / 2, y, lens };
      if (ready) {
        regions.push({ id: 'fotografo', x: x - 2, y: y - 4, w: meta.w + 4, h: meta.h + 6 });
        spots.set('fotografo', { x: x + meta.w / 2, y });
        // "Olha o passarinho!": de vez em quando ele chama a pose, e a Mandioca faz a carinha para o retrato.
        if (now >= (fx.fotoCallAt || 0)) {
          fx.fotoCallAt = now + 8000 + rng() * 3000;
          if (!fx.look || now >= fx.look.until) fx.look = { kind: 'feliz', until: now + 1600 };
          say(tr('fx.fotoCall'), Math.min(layout.R - 30, x + meta.w / 2), Math.max(10, y - 8), now, '#fffff0', 1600, 6);
        }
      }
    }

    // Carro de boi (São João Regional em diante): de tempos em tempos a junta de bois passa devagar lá no fundo, atrás
    // da plateia, puxando o carro de palha com a roda maciça girando. Clicar nele dá um mugido.
    function drawCarroBoi(now) {
      const cart = bundle.scenery['carro-boi'];
      if (!cart || layout.tier < 3) return;
      const c = fx.carroBoi || (fx.carroBoi = { at: 0, next: now + 60000 + rng() * 90000 });
      if (!c.at && now >= c.next) { Object.assign(c, { at: now, dir: rng() < 0.5 ? 1 : -1 }); sound('boi'); }
      if (!c.at) return;
      const span = layout.width + cart.w * 2 + 20;
      const travel = (now - c.at) * 0.012;
      if (travel > span) { c.at = 0; c.next = now + 180000 + rng() * 120000; return; }
      const x = Math.round(c.dir > 0 ? layout.L - cart.w - 10 + travel : layout.R + 10 - travel);
      const y = GROUND - 19 - cart.h + 2;
      const hop = critter('carro-boi', x, y, cart.w, cart.h, now);
      shadow(x + cart.w / 2, cart.w - 8, 0.5);
      sprite(cart, Math.floor(now / 260) % cart.frames, x, y + hop, c.dir < 0);
    }

    // Carro da pamonha (com 300 convidados): a Kombi passa pela frente da festa de tempos em tempos, anunciando pelo
    // alto-falante do teto. Clicar nela dá uma buzinada.
    const KOMBI_LINES = 3;
    function drawKombi(now) {
      const van = bundle.scenery.kombi;
      const k = fx.kombi || (fx.kombi = { x: 0, on: false, nextAt: now + 20000, sayAt: 0, line: 0 });
      if (!k.on) {
        if (now < k.nextAt) return;
        Object.assign(k, { on: true, start: now, sayAt: now + 600, line: Math.floor(rng() * KOMBI_LINES) });
        sound('altofalante');
      }
      const x = Math.round(layout.L - van.w - 10 + (now - k.start) * 0.028);
      if (x > layout.R + 10) {
        k.on = false;
        k.nextAt = now + 70000 + rng() * 70000;
        return;
      }
      const y = GROUND - van.h + 3;
      const hop = critter('kombi', x, y, van.w, van.h, now);
      shadow(x + van.w / 2, van.w - 4, 0.7);
      sprite(van, Math.floor(now / 120) % van.frames, x, y + hop);
      if (now >= k.sayAt) {
        k.sayAt = now + 3400;
        k.line = (k.line + 1) % KOMBI_LINES;
        const text = tr(`fx.kombi.${k.line}`);
        const half = String(text).length * 2 + 2;
        say(text, Math.min(layout.R - half, Math.max(layout.L + half, x + van.w / 2)), Math.max(10, y - 10), now, '#fff07a', 2400, 6);
      }
      spots.set('kombi', { x: x + van.w / 2, y: y + 4 });
    }

    function drawCritters(now) {
      const has = layout.has;
      // Na quadrilha marcada os bichos dançam também: um pulinho no ritmo, cada um na sua batida.
      const dancing = now < (fx.bichosUntil || 0);
      const beat = offset => (dancing ? -Math.round(Math.abs(Math.sin(now / 190 + offset)) * 2) : 0);
      const lo = layout.danceLeft + 2;
      const hi = Math.max(lo + 10, layout.danceRight - 10);
      if (has.has('bode')) {
        const goat = bundle.scenery.bode;
        const state = roam(fx.goat, now, lo, Math.max(lo + 24, layout.host.x - 16), 0.004, 0.8);
        const frame = state.mode === 'anda' ? Math.floor(now / 260) % 2 : 2 + Math.floor(now / 420) % 2;
        const hop = critter('bode', state.x, GROUND - goat.h + 2, goat.w, goat.h, now);
        sprite(goat, frame, state.x, GROUND - goat.h + 2 + hop + beat(0), state.dir < 0);
        spots.set('bode', { x: state.x + goat.w / 2, y: GROUND - goat.h });
      }
      if (has.has('jegue')) {
        // Jegue da manta azul: anda devagar entre a Mandioca e a fogueira, para mexendo a orelha ou baixa a cabeça pra
        // pastar.
        const donkey = bundle.scenery.jegue;
        const left = Math.min(hi - donkey.w - 4, layout.host.x + 34);
        const state = roam(fx.jegue, now, left, Math.max(left + 20, hi - donkey.w), 0.006, 0.7);
        const frame = state.mode === 'anda' ? Math.floor(now / 300) % 2 : Math.floor(now / 2600) % 3 === 0 ? 2 : 3;
        const hop = critter('jegue', state.x, GROUND - donkey.h + 2, donkey.w, donkey.h, now);
        shadow(state.x + donkey.w / 2, donkey.w - 8, 0.7);
        sprite(donkey, frame, state.x, GROUND - donkey.h + 2 + hop + beat(1), state.dir < 0);
        spots.set('jegue', { x: state.x + donkey.w / 2, y: GROUND - donkey.h });
      }
      if (has.has('boi')) {
        // Bumba-meu-boi: dança pelo terreiro, para, rodopia (vira de lado) e segue; as fitas balançam no passo.
        const ox = bundle.scenery.boi;
        const state = roam(fx.boi, now, lo, Math.max(lo + 30, hi - ox.w), 0.01, 0.5);
        const spin = state.mode === 'para' && Math.floor(now / 380) % 2;
        shadow(state.x + ox.w / 2, ox.w - 6, 0.8);
        const hop = critter('boi', state.x, GROUND - ox.h + 2, ox.w, ox.h, now);
        sprite(ox, frameAt(ox, now), state.x, GROUND - ox.h + 2 + hop + beat(2), (state.dir < 0) !== !!spin);
        spots.set('boi', { x: state.x + ox.w / 2, y: GROUND - ox.h });
      }
      if (!has.has('galinha')) return;
      const hen = bundle.scenery.galinha;
      const state = roam(fx.hen, now, lo, hi, 0.008, 0.6);
      const chick = bundle.scenery.pintinho;
      const count = Math.min(12, layout.scenery.counts.pintinho || 0);
      // A galinha sumiu e voltou em outro lugar (cenário mudou): os pintinhos aparecem junto dela, já em fila atrás.
      const henX = state.x + hen.w / 2;
      if (fx.henX === undefined || Math.abs(henX - fx.henX) > 20) fx.chicks = [];
      fx.henX = henX;
      const babies = [];
      for (let i = 0; i < count; i++) {
        const baby = fx.chicks[i] || (fx.chicks[i] = { x: henX - state.dir * (8 + i * 5) - chick.w / 2, dir: state.dir, at: now, walking: false });
        const dt = Math.min(100, Math.max(0, now - baby.at));
        baby.at = now;
        babies.push({ baby, i, dt, behind: (henX - baby.x - chick.w / 2) * state.dir });
      }
      // Fila atrás da mãe: cada pintinho que já ficou para trás segue o da frente (o primeiro segue a galinha). Quem
      // ainda está na frente dela (ela virou) espera ela passar, em vez de atravessar a fila. Anda até encostar e só volta
      // a andar quando o da frente se afasta uns pixels: sem isso ele alternava andar/parar a cada quadro e piscava.
      let leader = henX;
      let spacing = 8;
      for (const entry of babies.filter(entry => entry.behind > 0).sort((a, b) => a.behind - b.behind || a.i - b.i)) {
        const { baby, dt } = entry;
        const center = baby.x + chick.w / 2;
        const distance = Math.abs(leader - center);
        if (!baby.walking && distance > spacing + 3) baby.walking = true;
        // Andando ou parado, fica virado para quem ele segue.
        if (distance >= 1) baby.dir = Math.sign(leader - center);
        if (baby.walking) {
          const step = Math.min(distance - spacing, 0.013 * dt);
          baby.x += baby.dir * Math.max(0, step);
          if (distance - step <= spacing + 0.5) baby.walking = false;
        }
        leader = baby.x + chick.w / 2;
        spacing = 5;
      }
      for (const { baby, i, behind } of babies) {
        if (behind <= 0) {
          baby.walking = false;
          // Parado na frente dela, olha para a mãe chegando.
          const toward = Math.sign(henX - baby.x - chick.w / 2);
          if (toward) baby.dir = toward;
        }
        const frame = baby.walking ? Math.floor(now / 120 + i) % 2 : (Math.floor(now / 700 + i) % 3 === 0 ? 2 : 0);
        const hop = critter(`pintinho:${i}`, baby.x, GROUND - chick.h + 2, chick.w, chick.h, now);
        sprite(chick, frame, baby.x, GROUND - chick.h + 2 + hop + beat(i * 0.7), baby.dir < 0);
        spots.set(`pintinho:${i + 1}`, { x: baby.x + 3, y: GROUND - 6 });
      }
      const frame = state.mode === 'anda' ? Math.floor(now / 170) % 2 : 2 + Math.floor(now / 150) % 2;
      const hop = critter('galinha', state.x, GROUND - hen.h + 2, hen.w, hen.h, now);
      sprite(hen, frame, state.x, GROUND - hen.h + 2 + hop + beat(3), state.dir < 0);
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
      if (b.flee && b.mode !== 'pula') {
        const dog = fx.dog;
        if (now >= b.flee.until) {
          b.flee = null;
          b.poke = true;
        } else {
          b.dir = dog.x !== undefined && dog.x > b.x ? -1 : 1;
          if (b.x + b.dir * HOP_DX > hi || b.x + b.dir * HOP_DX < lo) b.dir = -b.dir;
          Object.assign(b, { mode: 'pula', from: b.x, at: now, until: now + HOP_MS, hops: 0 });
        }
      }
      if (b.poke || party) {
        if (party) b.party = fx.celebrateUntil;
        b.poke = false;
        Object.assign(b, { mode: 'binky', at: now, until: now + BINKY_MS });
        for (let i = 0; i < 3; i++) float('coracao', b.x + meta.w / 2 + (i - 1) * 7, GROUND - meta.h - 16 - i % 2 * 3, now, HEARTS);
      } else if (now >= b.until) {
        const resting = !engine.state.runtime.dancing;
        // No friozinho ele vai pulando até a fogueira e deita do lado dela (um pouco antes da caminha do caramelo).
        const warm = engine.state.cold?.active ? Math.max(lo, Math.min(hi, layout.fire.x - meta.w - 14)) : null;
        if (warm !== null && Math.abs(b.x - warm) > HOP_DX) {
          b.dir = warm > b.x ? 1 : -1;
          b.hops = 1;
          hop();
        } else if (warm !== null) Object.assign(b, { mode: 'deita', until: now + 2500 });
        else if (b.mode === 'pula' && b.hops > 1) { b.hops--; hop(); }
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
    // Clique numa barraca ou enfeite do lado que não abre janela: cada um responde do seu jeito.
    function pokeSide(name) {
      const side = name === 'esquerda' ? layout?.leftSide : layout?.rightSide;
      if (!side || !side.meta) return;
      const now = root.performance?.now?.() || 0;
      const meta = side.meta;
      const top = GROUND - meta.h + 1;
      const cx = side.x + meta.w / 2;
      const keeperX = meta.keeper ? side.x + meta.keeper[0] : cx;
      const keeperY = meta.keeper ? top + meta.keeper[1] : top + 6;
      const line = side.id === 'barraca-cordel' ? `fx.cordel.${Math.floor(rng() * 6)}` : SIDE_SAYS[side.id];
      if (line) say(tr(line), cx, Math.max(10, top - 6), now, '#fff8e8', side.id === 'barraca-cordel' ? 2000 : 1100, 8);
      // O papagaio fofoqueiro também decora os versos do cordel.
      if (side.id === 'barraca-cordel') fx.lastChat = { text: tr(line), at: now, echoed: false };
      if (side.id === 'barraca-beijo') {
        for (let i = 0; i < 5; i++) float('coracao', keeperX + (i - 2) * 5, keeperY + 2 - (i % 2) * 3, now, ['#ff4f9e', '#ff8a96']);
      } else if (side.id === 'barraca-comidas') {
        // Pipoca estourando: pipocas brancas pulam do balcão e caem.
        for (let i = 0; i < 12; i++) {
          fx.particles.push({ x: keeperX + (rng() - 0.5) * 12, y: keeperY, vx: (rng() - 0.5) * 0.04, vy: -0.03 - rng() * 0.02,
            gravity: 0.00007, born: now, ttl: 700 + rng() * 300, colors: ['#fffff0', '#fff4e4', '#ffe27a'] });
        }
      } else if (side.id === 'espantalho') {
        for (let i = 0; i < 6; i++) {
          fx.particles.push({ x: cx + (rng() - 0.5) * 10, y: top + 8, vx: (rng() - 0.5) * 0.03, vy: -0.01 - rng() * 0.012,
            gravity: 0.00002, born: now, ttl: 900 + rng() * 400, colors: ['#e3a232', '#ffe27a'], wobble: rng() * 6, flip: 90 });
        }
      } else if (side.id === 'mastro') {
        confetti(now, cx, top + 4, 14);
      } else if (side.id === 'fogao-lenha') {
        // Mexe a panela: sobe um bafo de vapor e umas faíscas saem da boca do fogão.
        for (let i = 0; i < 4; i++) {
          fx.particles.push({ x: side.x + 16 + (rng() - 0.5) * 6, y: top + 10, vx: (rng() - 0.5) * 0.004, vy: -0.01, born: now, ttl: 900, breath: true });
          fx.particles.push({ x: side.x + 15 + (rng() - 0.5) * 6, y: top + 27, vx: (rng() - 0.5) * 0.04, vy: -0.03 - rng() * 0.02,
            gravity: 0.00008, born: now, ttl: 400 + rng() * 200, colors: SPARK, ember: true });
        }
      }
    }

    function poke(id) {
      if (id === 'sopinha') { fx.bunny.poke = true; return; }
      if (id === 'par' && layout && layout.par) {
        // O par (o Milho) também gosta de carinho: dá um pulinho, solta um coração e uma gracinha.
        const now = root.performance?.now?.() || 0;
        if (now - (fx.parHop || -1e9) < 500) return;
        fx.parHop = now;
        const px = layout.par.x + 8;
        say(tr(`fx.par.${Math.floor(rng() * 4)}`), px, GROUND - 34, now, '#9ef05a', 1100, 8);
        float('coracao', px, GROUND - 26, now, ['#ff4f9e', '#ff8a96']);
        return;
      }
      if (id === 'coracoes' && layout) {
        // Carta aberta: a Mandioca fica toda derretida (corações subindo em volta dela).
        const now = root.performance?.now?.() || 0;
        const hx = layout.host.x + 12;
        for (let i = 0; i < 6; i++) float('coracao', hx + (i - 2.5) * 5, GROUND - Math.round(40 * fx.scale) - (i % 2) * 4, now, ['#ff4f9e', '#ff8a96']);
        fx.celebrateUntil = now + 600;
        return;
      }
      if (typeof id === 'string' && id.startsWith('lado:')) { pokeSide(id.slice(5)); return; }
      if (typeof id === 'string' && id.startsWith('lanterna:')) {
        const lantern = fx.lanterns.find(entry => `lanterna:${entry.id}` === id);
        const now = root.performance?.now?.() || 0;
        if (lantern && !lantern.boost) {
          lantern.boost = now;
          const age = now - lantern.born;
          say(tr('fx.lantern'), lantern.x + 1, Math.max(10, lantern.y - age * lantern.speed - 8), now, '#ffd21e', 1200, 10);
        }
        return;
      }
      if (typeof id !== 'string' || !id.startsWith('bicho:')) return;
      const now = root.performance?.now?.() || 0;
      const key = id.slice(6);
      const kind = key.split(':')[0];
      fx.react[key] = now;
      const area = regions.find(entry => entry.id === id);
      if (!area) return;
      const words = CRITTER_SAYS[kind] || ['!'];
      const x = area.x + area.w / 2;
      say(words[Math.floor(rng() * words.length)], x, area.y - 4, now, kind === 'gato' ? '#cfe3ff' : '#fff8e8', 900, 8);
      if (kind === 'galinha' || kind === 'pintinho') {
        for (let i = 0; i < 5; i++) {
          fx.particles.push({ x: x + (rng() - 0.5) * 6, y: area.y + 2, vx: (rng() - 0.5) * 0.03, vy: -0.012 - rng() * 0.012,
            gravity: 0.00003, born: now, ttl: 600 + rng() * 300, colors: ['#fffff0', '#efd29a'] });
        }
      }
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

    // Crianças correndo pela frente da festa: a primeira chega com 45 convidados, e mais uma a cada 25 (até 6).
    // Cada uma corre para um lado, para, dá um pulinho e volta; às vezes uma corre atrás da outra.
    // Amendoim, o ambulante: passeia pela frente da festa com a cesta no braço, para de vez em quando e oferece.
    function drawPeddler(engine, now) {
      if (!engine.charActive('amendoim')) return;
      const meta = bundle.chars.amendoim;
      const state = roam(fx.peddler, now, layout.L + 6, layout.R - meta.w - 6, 0.014, 0.5);
      const moving = state.mode === 'anda';
      const frame = moving ? Math.floor(now / 140) % meta.frames : 0;
      shadow(state.x + meta.w / 2, 8, 0.7);
      const hop = critter('amendoim', state.x, GROUND - meta.h + 2, meta.w, meta.h, now);
      sprite(meta, frame, state.x, GROUND - meta.h + 2 + hop, state.dir < 0);
      spots.set('amendoim', { x: state.x + meta.w / 2, y: GROUND - meta.h });
    }

    // Ciranda: com duas ou mais crianças, de tempos em tempos elas dão a volta na fogueira por uns segundos. Passam por
    // trás (as chamas escondem) e pela frente, e depois voltam a correr por aí. O desenho de cada uma é separado da conta:
    // `updateKids` anda com todas e `drawKids` pinta as que estão atrás da fogueira antes dela e as outras depois.
    function updateKids(engine, now) {
      fx.kidDraw = [];
      const size = engine.state.size;
      const count = size < 45 ? 0 : Math.min(6, 1 + Math.floor((size - 45) / 25));
      const meta = bundle.crowd.kids;
      if (!count || !meta) return;
      const lo = layout.L + 6;
      const hi = layout.R - meta.w - 6;
      const fire = layout.fire;
      const fireMid = fire.x + fire.meta.w / 2;
      const radius = fire.meta.w / 2 + 9;
      if (fx.ring && now - fx.ring.at > RING_MS + RING_EASE) fx.ring = null;
      if (!fx.ring && count > 1 && !fx.compadre?.at) {
        if (!fx.nextRing) fx.nextRing = now + 30000 + rng() * 30000;
        if (now >= fx.nextRing) {
          fx.ring = { at: now, n: Math.min(count, 5) };
          fx.nextRing = now + 70000 + rng() * 50000;
          say(tr('fx.ciranda'), fireMid, Math.max(10, GROUND - fire.meta.h - 12), now, '#ffd21e', 2000, 8);
        }
      }
      for (let i = 0; i < count; i++) {
        const kid = fx.kids[i] || (fx.kids[i] = { fabric: hash(i, 29) % bundle.crowd.fabrics });
        const leader = i % 2 && fx.kids[i - 1]?.x !== undefined ? fx.kids[i - 1] : null;
        const state = roam(kid, now, lo, hi, 0.032, 0.35);
        // Pega-pega: a de número ímpar corre atrás da anterior quando está longe dela.
        if (leader && state.mode === 'anda' && Math.abs(leader.x - state.x) > 14) state.dir = Math.sign(leader.x - state.x);
        let x = state.x;
        let dir = state.dir;
        let moving = state.mode === 'anda';
        let depth = 0;
        if (fx.ring && i < fx.ring.n) {
          // Entra na roda deslizando, gira em volta da fogueira e sai do mesmo jeito; a caminhada dela fica parada esperando.
          const age = now - fx.ring.at;
          const k = Math.max(0, Math.min(1, age / RING_EASE, (RING_MS + RING_EASE - age) / RING_EASE));
          const ease = k * k * (3 - 2 * k);
          const theta = age / RING_TURN * Math.PI * 2 + i * Math.PI * 2 / fx.ring.n;
          const target = fireMid + Math.cos(theta) * radius - meta.w / 2;
          Object.assign(state, { mode: 'para', until: now + 300 });
          dir = ease > 0.5 ? (Math.sin(theta) > 0 ? -1 : 1) : Math.sign(target - state.x) || dir;
          x = state.x + (target - state.x) * ease;
          depth = Math.sin(theta) * ease;
          moving = true;
        }
        const step = moving ? Math.floor(now / 110 + i) % 2 : 0;
        const hopping = !moving && Math.floor(now / 500 + i) % 4 === 0;
        fx.kidDraw.push({ i, kid, x, moving, dir, behind: depth < -0.2,
          y: GROUND - meta.h + 2 - (hopping ? 2 : 0) + Math.round(depth * 3), frame: kid.fabric * 2 + step });
      }
    }

    function drawKids(now, behind) {
      const meta = bundle.crowd.kids;
      for (const item of fx.kidDraw) {
        if (item.behind !== behind) continue;
        const { i, kid, x, y, moving, dir } = item;
        shadow(x + meta.w / 2, 6, 0.7);
        const hop = critter(`crianca:${i}`, x, y, meta.w, meta.h, now);
        sprite(meta, item.frame, x, y + hop, dir < 0);
        if (moving && now - (kid.dustAt || 0) > 420) {
          kid.dustAt = now;
          fx.particles.push({ x: x + meta.w / 2 - dir * 3, y: GROUND - 1, vx: -dir * 0.006, vy: -0.004,
            gravity: 0.000008, born: now, ttl: 320, colors: ['rgba(236, 206, 156, 0.8)', 'rgba(206, 174, 132, 0.4)'] });
        }
      }
    }

    // Compadres de fogueira: de tempos em tempos um rapaz e uma moça saem da plateia e param um de cada lado da fogueira,
    // de mão estendida por cima do fogo (uma ponte de fagulhas liga as mãos), recitando os versos. Entre um verso e outro
    // trocam de lado dando a volta na fogueira: quem está na esquerda passa pela frente, o outro por trás. No fim viram
    // compadres: pulinhos e corações. Enquanto dura, clicar neles é ser a testemunha (engine.witnessCompadres).
    const COMPADRE = { in: 1600, verse: 2100, swap: 1500, end: 2000, out: 1600 };
    const COMPADRE_VERSES = 4;
    const COMPADRE_MS = COMPADRE.in + COMPADRE_VERSES * COMPADRE.verse + (COMPADRE_VERSES - 1) * COMPADRE.swap + COMPADRE.end +
      COMPADRE.out;
    function compadreStage(age) {
      let t = age;
      if (t < COMPADRE.in) return { kind: 'in', k: t / COMPADRE.in, swaps: 0 };
      t -= COMPADRE.in;
      for (let i = 0; i < COMPADRE_VERSES; i++) {
        if (t < COMPADRE.verse) return { kind: 'verse', index: i, age: t, swaps: i };
        t -= COMPADRE.verse;
        if (i === COMPADRE_VERSES - 1) break;
        if (t < COMPADRE.swap) return { kind: 'swap', k: t / COMPADRE.swap, swaps: i };
        t -= COMPADRE.swap;
      }
      const swaps = COMPADRE_VERSES - 1;
      if (t < COMPADRE.end) return { kind: 'end', age: t, swaps };
      return { kind: 'out', k: Math.min(1, (t - COMPADRE.end) / COMPADRE.out), swaps };
    }

    function updateCompadres(engine, now) {
      fx.compadreDraw = null;
      const meta = bundle.props.compadres;
      if (!meta || layout.tier < 1) { fx.compadre = null; return; }
      const c = fx.compadre || (fx.compadre = { at: 0, next: now + 90000 + rng() * 90000 });
      if (!c.at && now >= c.next) {
        // Não começa no meio da ciranda, do casamento, da quadrilha nem na chuva: tenta de novo daqui a pouco.
        const busy = fx.ring || weddingOn(engine) || engine.state.runtime.quadrilhaLeft > 0 || fx.wx.rain > 0.15;
        if (busy) c.next = now + 20000;
        else Object.assign(c, { at: now, said: -1, witnessed: false, ended: false });
      }
      if (!c.at) return;
      const age = now - c.at;
      if (age >= COMPADRE_MS) { c.at = 0; c.next = now + 240000 + rng() * 180000; return; }
      const stage = compadreStage(age);
      const fire = layout.fire;
      const mid = fire.x + fire.meta.w / 2;
      const rx = fire.meta.w / 2 + 10;
      const people = [];
      for (let p = 0; p < 2; p++) {
        // O rapaz começa na esquerda e a moça na direita; cada troca inverte.
        const side = (p === 0 ? -1 : 1) * (stage.swaps % 2 ? -1 : 1);
        let cx = mid + side * rx;
        let depth = 0;
        let alpha = 1;
        let walking = false;
        let pose = 0;
        let flip = side < 0;
        if (stage.kind === 'in' || stage.kind === 'out') {
          const away = stage.kind === 'in' ? 1 - stage.k : stage.k;
          cx = mid + side * (rx + 34 * away * away * (3 - 2 * away));
          alpha = Math.max(0, Math.min(1, (1 - away) * 2.5));
          walking = away > 0.03;
          flip = stage.kind === 'in' ? side < 0 : side > 0;
        } else if (stage.kind === 'swap') {
          const e = stage.k * stage.k * (3 - 2 * stage.k);
          const theta = side < 0 ? Math.PI * (1 - e) : -Math.PI * e;
          cx = mid + Math.cos(theta) * rx;
          depth = Math.sin(theta);
          walking = true;
          flip = side < 0;
        } else if (stage.kind === 'verse') {
          const speaking = stage.index % 2 === p && stage.age < 1400;
          pose = stage.age < 200 ? 0 : speaking && Math.floor(stage.age / 280) % 2 ? 5 : 4;
        } else if (stage.kind === 'end') {
          pose = Math.floor((stage.age + p * 180) / 240) % 2 ? 6 : 0;
        }
        if (walking) pose = Math.floor(now / 130 + p * 2) % 4;
        const x = Math.round(cx - meta.w / 2);
        const y = GROUND - meta.h + 1 + Math.round(depth * 2);
        people.push({ p, x, y, cx, flip, alpha, behind: depth < -0.2, frame: p * meta.poses + pose,
          hand: { x: flip ? x + meta.w - 3 : x + 2, y: y + 9 } });
      }
      fx.compadreDraw = { stage, people, mid };
      if (stage.kind === 'verse' && c.said < stage.index) {
        c.said = stage.index;
        const who = people[stage.index % 2];
        say(tr(`fx.compadre.${stage.index}`), Math.max(layout.L + 40, Math.min(layout.R - 40, who.cx)), Math.max(10, who.y - 8), now,
          '#fff8e8', COMPADRE.verse - 200, 6);
      }
      if (stage.kind === 'end' && !c.ended) {
        c.ended = true;
        const text = tr('fx.compadre.fim');
        say(text, mid, Math.max(10, GROUND - fire.meta.h - 12), now, '#ffd21e', COMPADRE.end, 8);
        // O papagaio fofoqueiro também gosta de repetir essa.
        fx.lastChat = { text, at: now, echoed: false };
        for (const who of people) float('coracao', who.cx, who.y + 2, now, ['#ff4f9e', '#ff8a96']);
        sound('carinho');
      }
    }

    function drawCompadres(now, behind) {
      const d = fx.compadreDraw;
      const meta = bundle.props.compadres;
      if (!d || !meta) return;
      for (const who of d.people) {
        if (who.behind !== behind) continue;
        g.globalAlpha = who.alpha;
        shadow(who.cx, 8, 0.7 * who.alpha);
        sprite(meta, who.frame, who.x, who.y, who.flip);
        g.globalAlpha = 1;
      }
      if (behind) return;
      const { stage, people } = d;
      if (stage.kind === 'verse' && stage.age >= 200) {
        // A ponte de fagulhas: sai das duas mãos e se encontra lá em cima, por cima das chamas.
        const [a, b] = people[0].hand.x < people[1].hand.x ? people : [people[1], people[0]];
        const top = Math.max(8, GROUND - layout.fire.meta.h - 4);
        const reveal = Math.min(1, (stage.age - 200) / 700);
        // Um ponto por pixel do arco (o comprimento é mais ou menos a largura mais duas vezes a altura), com contorno
        // escuro para não sumir em cima das chamas e o miolo piscando de dourado a branco.
        const rise = a.hand.y - top;
        const steps = Math.max(8, Math.round(b.hand.x - a.hand.x + rise * 2));
        const points = [];
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          if (t > reveal / 2 && t < 1 - reveal / 2) continue;
          points.push([Math.round(a.hand.x + (b.hand.x - a.hand.x) * t),
            Math.round(a.hand.y + (b.hand.y - a.hand.y) * t - rise * Math.sin(Math.PI * t)), s]);
        }
        g.fillStyle = INK;
        for (const [x, y] of points) g.fillRect(x - 1, y - 1, 3, 3);
        const glint = Math.floor(now / 40) % (steps + 20);
        for (const [x, y, s] of points) {
          g.fillStyle = Math.abs(s - glint) < 3 || Math.abs(steps - s - glint) < 3 ? '#ffffff' : (s >> 2) % 2 ? '#ffd21e' : '#ffac2a';
          g.fillRect(x, y, 1, 1);
        }
        if (reveal >= 1 && rng() < 0.12) {
          fx.particles.push({ x: a.hand.x + (b.hand.x - a.hand.x) / 2 + (rng() - 0.5) * 6, y: top, vx: (rng() - 0.5) * 0.01,
            vy: -0.01 - rng() * 0.01, gravity: 0.00002, born: now, ttl: 700, colors: ['#fff8e8', '#ffd21e'] });
        }
      }
      const c = fx.compadre;
      if (c && !c.witnessed && stage.kind !== 'out') {
        const x0 = Math.min(people[0].x, people[1].x);
        const x1 = Math.max(people[0].x, people[1].x) + meta.w;
        regions.push({ id: 'compadres', x: x0, y: GROUND - meta.h - 2, w: x1 - x0, h: meta.h + 3 });
      }
    }

    // Pombo-correio: quando chega carta, ele atravessa a festa com a cartinha no bico, desce até o correio (ou até a
    // Mandioca, sem correio na festa), solta um coração e vai embora pelo outro lado.
    const PIGEON_MS = 4200;
    function drawPigeon(now) {
      const p = fx.pigeon;
      const meta = bundle.scenery.pombo;
      if (!p || !meta) return;
      const t = (now - p.at) / PIGEON_MS;
      if (t >= 1 || t < 0) { fx.pigeon = null; return; }
      const from = p.dir > 0 ? layout.L - 24 : layout.R + 24;
      const to = p.dir > 0 ? layout.R + 24 : layout.L - 24;
      const x = t < 0.5 ? from + (p.target - from) * (t / 0.5) : p.target + (to - p.target) * ((t - 0.5) / 0.5);
      const top = Math.max(6, GROUND - POLE_H[layout.tier] - 20);
      const y = top + (p.low - top) * Math.sin(Math.PI * t);
      if (t >= 0.5 && !p.dropped) {
        p.dropped = true;
        float('coracao', p.target, p.low + 10, now, ['#ff4f9e', '#ff8a96']);
        say(tr('fx.pigeon'), p.target, p.low - 4, now, '#fff8e8', 1200, 8);
      }
      sprite(meta, Math.floor(now / 90) % meta.frames, Math.round(x - meta.w / 2), Math.round(y - meta.h / 2), p.dir < 0);
    }

    // Quebra-pote: o pote fica pendurado numa corda do varal de cima, balança a cada paulada (o balanço vai diminuindo) e
    // vai trincando. A posição vem do relógio do motor, como o balão de sorte.
    function drawPote(engine, now, poleTop) {
      const a = engine.state.pote && engine.state.pote.active;
      const meta = bundle.scenery.pote;
      if (!a || !meta) { fx.potePos = null; return; }
      const x = Math.round(layout.L + 20 + a.x * (layout.width - 40));
      const t = (x - (layout.L + layout.R) / 2) / ((layout.R - layout.L + 2) / 2);
      const top = poleTop + 2;
      const anchorY = Math.round(top + (8 + layout.tier * 3) * (1 - t * t));
      const rope = 16;
      const age = now - fx.pote.at;
      const angle = fx.pote.sway * Math.exp(-age / 900) * Math.sin(age / 130) + Math.sin(now / 1300) * 0.03;
      const bx = Math.round(x + Math.sin(angle) * rope);
      const by = Math.round(anchorY + Math.cos(angle) * rope);
      g.fillStyle = '#c9a26a';
      for (let k = 0; k <= rope; k++) g.fillRect(Math.round(x + Math.sin(angle) * k), Math.round(anchorY + Math.cos(angle) * k), 1, 1);
      const frame = Math.min(meta.frames - 1, Math.floor(a.hits / 2));
      halo(bx, by + 10, 10, '#ffd21e', 0.16 + 0.06 * Math.sin(now / 220));
      sprite(meta, frame, bx - Math.floor(meta.w / 2), by - 1);
      fx.potePos = { x: bx, y: by + 8 };
      regions.push({ id: 'pote', x: bx - Math.floor(meta.w / 2), y: by - 1, w: meta.w, h: meta.h });
      spots.set('pote', { x: bx, y: by + 8 });
    }

    // Corrida de saco: três crianças de saco pulando na frente da festa, da largada (esquerda) até a bandeira quadriculada
    // da chegada (direita). O corredor do jogador (listra vermelha) vai na frente e pula a cada clique; os rivais, atrás,
    // pulam sozinhos no tempo deles. Tudo sai do relógio do motor; o pulo desenhado é um arco curto.
    const SACO_HOP_MS = 260;
    // Raias escalonadas: cada rival corre um pouco mais para trás e para a esquerda, para os três aparecerem.
    const SACO_LANE = [7, 3];
    function sacoTrack() {
      const x0 = layout.danceLeft + 16;
      return { x0, x1: Math.max(x0 + 40, layout.danceRight - 20) };
    }
    // Onde está um rival (0 a sacoHops) e a altura do pulo dele agora.
    function sacoRival(race, ms, clock, hops) {
      if (!race.start) return { pos: 0, lift: 0, done: false };
      const r = Math.min(1, Math.max(0, (clock - race.start) / ms));
      const pos = r * hops;
      const phase = pos - Math.floor(pos);
      return { pos, lift: r < 1 ? Math.sin(phase * Math.PI) * 5 : 0, done: r >= 1, air: r < 1 && phase > 0.12 && phase < 0.88 };
    }
    function drawSaco(engine, now) {
      const a = engine.state.saco && engine.state.saco.active;
      const meta = bundle.scenery.saco;
      const exit = fx.saco.exit && now - fx.saco.exit.at < 2600 ? fx.saco.exit : null;
      fx.saco.exit = exit;
      const race = a || exit;
      if (!race || !meta) { fx.sacoPos = null; return; }
      if (a) fx.saco.last = { start: a.start, rivals: a.rivals.slice(), hops: a.hops };
      const { x0, x1 } = sacoTrack();
      const hops = engine.cfg.sacoHops;
      const clock = exit ? exit.clock + (now - exit.at) : engine.now();
      const step = (x1 - x0) / hops;
      // Largada (estaca com fitinha vermelha) e chegada (pau com a bandeira quadriculada).
      g.fillStyle = INK;
      g.fillRect(x0 + 8, GROUND - 9, 3, 10);
      g.fillRect(x1 + 14, GROUND - 17, 3, 18);
      g.fillStyle = '#dca66a';
      g.fillRect(x0 + 9, GROUND - 8, 1, 8);
      g.fillRect(x1 + 15, GROUND - 16, 1, 16);
      g.fillStyle = '#ee2f3c';
      g.fillRect(x0 + 10, GROUND - 8, 2, 2);
      const wave = Math.floor(now / 260) % 2;
      for (let fy = 0; fy < 4; fy++) {
        for (let fx2 = 0; fx2 < 6; fx2++) {
          g.fillStyle = (fx2 + fy) % 2 ? '#120906' : '#fff8e8';
          g.fillRect(x1 + 16 + fx2, GROUND - 16 + fy + (wave && fx2 > 3 ? 1 : 0), 1, 1);
        }
      }
      // Rivais: listra azul e verde, nas raias de trás.
      const rivalX = [];
      const firstRival = race.rivals ? race.rivals.indexOf(Math.min(...race.rivals)) : -1;
      [1, 2].forEach((runner, lane) => {
        const info = sacoRival(race, race.rivals[lane], clock, hops);
        const x = Math.round(x0 - (lane + 1) * SACO_LANE[0] + info.pos * step);
        const y = GROUND - meta.h + 1 - (lane + 1) * SACO_LANE[1] - Math.round(info.lift);
        const cheer = info.done && lane === firstRival && (!exit || exit.place !== 1);
        const frame = cheer ? 3 : info.air ? 1 : 0;
        sprite(meta, runner * 4 + frame, x, y - (!race.start ? Math.floor(now / 400 + lane) % 2 : 0));
        rivalX.push(x);
      });
      // O corredor do jogador, na frente.
      let pos = exit ? exit.hops : a.hops;
      let lift = 0;
      let frame = 0;
      const hop = fx.saco.hop;
      if (!exit && hop) {
        const t = Math.min(1, (now - hop.at) / SACO_HOP_MS);
        pos = hop.from + (hop.to - hop.from) * t;
        lift = Math.sin(t * Math.PI) * 7;
        if (t < 1) frame = 1;
      }
      const down = a && clock < a.fallUntil;
      if (down) frame = 2;
      if (exit && exit.place === 1) frame = 3;
      const px = Math.round(x0 + pos * step);
      const py = GROUND - meta.h + 1 - Math.round(lift) - (exit && exit.place === 1 ? Math.floor(now / 180) % 2 : 0);
      sprite(meta, frame, px, py);
      if (down) {
        // Tonto do tombo: três estrelinhas rodando em cima da cabeça.
        for (let k = 0; k < 3; k++) {
          const angle = now / 160 + k * 2.1;
          g.fillStyle = k % 2 ? '#fff07a' : '#ffd21e';
          g.fillRect(Math.round(px + 13 + Math.cos(angle) * 4), Math.round(GROUND - 12 + Math.sin(angle) * 1.5), 1, 1);
        }
      }
      if (a && !a.start) {
        // Antes da largada: uma setinha pulando em cima do corredor do jogador.
        const ay = py - 5 - (Math.floor(now / 220) % 2);
        g.fillStyle = INK;
        g.fillRect(px + 6, ay - 1, 7, 1);
        g.fillRect(px + 7, ay, 5, 1);
        g.fillRect(px + 8, ay + 1, 3, 1);
        g.fillRect(px + 9, ay + 2, 1, 1);
        g.fillStyle = '#ffd21e';
        g.fillRect(px + 7, ay - 1, 5, 1);
        g.fillRect(px + 8, ay, 3, 1);
        g.fillRect(px + 9, ay + 1, 1, 1);
        if (now >= fx.saco.nextYou) {
          fx.saco.nextYou = now + 3200;
          say(tr('fx.sacoYou'), px + 9, Math.max(10, ay - 4), now, '#ffd21e', 1400, 4);
        }
      }
      fx.sacoPos = { x: px + 9, y: py, rivals: rivalX };
      if (a) {
        regions.push({ id: 'saco', x: px - 3, y: GROUND - 28, w: 24, h: 30 });
        spots.set('saco', { x: px + 9, y: py });
      }
    }

    // A prenda do leilão erguida em cima do leiloeiro (o item de verdade, ou um presente quando é Animação) e a plaquinha
    // com o lance: quanto e de quem (amarelo quando é seu). Clicar no leiloeiro, na prenda ou na placa dá um lance.
    function drawAuctionPrize(engine, now) {
      const a = engine.state.leilao && engine.state.leilao.active;
      const at = fx.leilaoPos;
      if (!at) return;
      const sold = fx.leilao.sold;
      const prize = a ? a.prize : sold && sold.prize;
      if (!prize) return;
      const bob = Math.floor(now / 300) % 2;
      const bottom = at.y - 3 - bob;
      const meta = prize.item ? bundle.hand[prize.item] || bundle.hats[prize.item] : null;
      const lifted = !a && sold && sold.winner === 'voce';
      if (!lifted) {
        halo(at.x, bottom - 6, 10, '#ffd21e', 0.18 + 0.06 * Math.sin(now / 200));
        if (meta) sprite(meta, 0, Math.round(at.x - meta.w / 2), bottom - meta.h);
        else {
          // Presente embrulhado: caixa vermelha com fita dourada.
          g.fillStyle = INK;
          g.fillRect(at.x - 5, bottom - 9, 11, 10);
          g.fillStyle = '#ee2f3c';
          g.fillRect(at.x - 4, bottom - 8, 9, 8);
          g.fillStyle = '#ffd21e';
          g.fillRect(at.x, bottom - 8, 1, 8);
          g.fillRect(at.x - 4, bottom - 5, 9, 1);
          g.fillRect(at.x - 2, bottom - 10, 2, 2);
          g.fillRect(at.x + 1, bottom - 10, 2, 2);
        }
      }
      const top = bottom - (meta ? meta.h : 11) - 3;
      if (a) {
        const mine = a.leader === 'voce';
        const text = tr(`fx.leilaoSign.${a.leader || 'open'}`, { n: a.leader ? a.price : a.base });
        const blink = !a.leader && Math.floor(now / 400) % 2;
        if (!blink) write(text, at.x, Math.max(6, top - 4), mine ? '#ffd21e' : '#fff8e8');
        regions.push({ id: 'leilao', x: at.x - 12, y: Math.max(0, top - 10), w: 24, h: at.y + 20 - Math.max(0, top - 10) });
        spots.set('leilao', { x: at.x, y: top });
      }
    }

    // Plaquinhas dos jurados do concurso de quadrilha: papel branco com a nota (e a meia nota) em pixel, erguidas no alto.
    function drawScorecards(now) {
      if (!fx.scorecards || now > fx.scoreUntil) { fx.scorecards = null; return; }
      for (const card of fx.scorecards) {
        if (now < card.at) continue;
        const text = Number.isInteger(card.note) ? String(card.note) : `${Math.floor(card.note)},5`;
        const width = text.length * 4 + 3;
        const x = Math.round(card.x - width / 2);
        const lift = Math.min(1, (now - card.at) / 200);
        const y = Math.round(GROUND - 34 - 4 * lift);
        g.fillStyle = '#7c421e';
        g.fillRect(Math.round(card.x), y + 10, 1, 6);
        g.fillStyle = INK;
        g.fillRect(x - 1, y - 1, width + 2, 10);
        g.fillStyle = '#fffff0';
        g.fillRect(x, y, width, 8);
        write(text, card.x, y + 2, card.note >= 9 ? '#ff8a12' : '#48a8ff');
      }
    }

    // Conversa da plateia: de vez em quando (Quermesse em diante) alguém solta uma frase em cima da cabeça; na chuva, comenta a chuva.
    const CHAT = 24;
    const CHAT_RAIN = 3;
    // Madrugada: da meia-noite às 5 da manhã, pelo relógio do computador.
    const lateNight = engine => { const hour = new Date(engine.now()).getHours(); return hour < 5; };

    function drawChatter(engine, now) {
      if (calm || layout.tier < 1 || now < fx.nextChat) return;
      fx.nextChat = now + 8000 + rng() * 9000;
      // Enquanto os compadres recitam os versos, a plateia fica quietinha escutando.
      if (fx.compadre?.at) return;
      const rows = [[layout.audience, 9], [layout.audience2, 14], [layout.audience3, 19]].filter(([list]) => list.length);
      if (!rows.length) return;
      const [list, lift] = rows[Math.floor(rng() * rows.length)];
      const guest = list[Math.floor(rng() * list.length)];
      // O que está acontecendo puxa o assunto: chuva, casamento, pote pendurado ou rodada de bingo.
      const two = () => Math.floor(rng() * 2);
      const line = fx.wx.rain > 0.3 ? `fx.chatRain.${Math.floor(rng() * CHAT_RAIN)}`
        : weddingOn(engine) ? `fx.chatWedding.${two()}`
          : engine.state.pote?.active ? `fx.chatPote.${two()}`
            : engine.state.saco?.active?.start ? `fx.chatSaco.${two()}`
              : engine.state.cold?.active ? `fx.chatCold.${two()}`
              : engine.state.leilao?.active?.leader ? `fx.chatLeilao.${two()}`
            : engine.state.bingo?.round && !engine.state.bingo.round.result && rng() < 0.6 ? `fx.chatBingo.${two()}`
              : lateNight(engine) && rng() < 0.35 ? `fx.chatNight.${two()}`
              : `fx.chat.${Math.floor(rng() * CHAT)}`;
      say(tr(line), Math.max(layout.L + 14, Math.min(layout.R - 14, guest.x + 6)), GROUND - lift - 26, now, '#fff8e8', 2600, 6);
      fx.lastChat = { text: tr(line), at: now, echoed: false };
    }

    // Lanterninhas do celular: da Festa da Cidade em diante, de vez em quando a plateia acende a lanterna do celular e
    // balança os braços por uns 12 s (pontinhos de luz em cima das cabeças).
    const LIGHTS_MS = 12000;
    function drawPhoneLights(now) {
      if (layout.tier < 2 || !layout.audience.length) return;
      const l = fx.phones || (fx.phones = { at: 0, next: now + 90000 + rng() * 90000 });
      if (!l.at && now >= l.next && fx.wx.rain < 0.15) {
        l.at = now;
        const guest = layout.audience[Math.floor(rng() * layout.audience.length)];
        say(tr('fx.lanterna'), guest.x + 6, GROUND - 40, now, '#fffff0', 2000, 6);
      }
      if (!l.at) return;
      const age = now - l.at;
      if (age > LIGHTS_MS) { l.at = 0; l.next = now + 360000 + rng() * 240000; return; }
      const fade = Math.min(1, age / 800, (LIGHTS_MS - age) / 800);
      const rows = [[layout.audience3, 19], [layout.audience2, 14], [layout.audience, 9]];
      for (const [list, lift] of rows) {
        list.forEach((guest, i) => {
          if (hash(guest.index, 53) % 5 > 1) return;
          const x = Math.round(guest.x + 6 + Math.sin(now / 520 + i) * 2);
          const y = GROUND - lift - 22 + Math.round(Math.cos(now / 700 + i) * 1);
          g.globalAlpha = fade;
          halo(x, y + 1, 5, '#f4f8ff', 0.45 * fade);
          g.fillStyle = '#ffffff';
          g.fillRect(x, y, 1, 2);
          g.globalAlpha = 1;
        });
      }
    }

    // Papagaio fofoqueiro (44 convidados): pousado no alto do poste da esquerda, de vez em quando repete o que alguém
    // da plateia acabou de falar (em verde, de bico aberto) ou solta um "currupaco". Bate a asa às vezes.
    function drawParrot(now, poleTop) {
      const bird = bundle.scenery.papagaio;
      if (!bird || !layout.has.has('papagaio')) return;
      const x = layout.L - 3 - Math.round(bird.w / 2) + 1;
      const y = poleTop - bird.h + 2;
      const chat = fx.lastChat;
      if (chat && !chat.echoed && now - chat.at > 2600) {
        chat.echoed = true;
        if (rng() < 0.45) {
          fx.parrotTalk = now + 1400;
          sound('papagaio');
          say(chat.text, Math.max(layout.L + 20, x + 20), Math.max(10, y - 6), now, '#9ef05a', 2200, 6);
        }
      }
      const talking = now < (fx.parrotTalk || 0);
      const flap = !talking && Math.floor(now / 250) % 24 === 0;
      const hop = critter('papagaio', x, y, bird.w, bird.h, now);
      sprite(bird, talking ? Math.floor(now / 140) % 2 : flap ? 2 : 0, x, y + hop);
    }

    // Balões de São João: com 50 convidados, de vez em quando alguém solta um balão aceso, que sobe balançando até
    // sumir no céu. Quanto mais gente, mais balões.
    function drawLanterns(engine, now) {
      const size = engine.state.size;
      if (size >= 50 && now >= fx.nextLantern) {
        fx.nextLantern = now + Math.max(1800, 9000 - (size - 50) * 45) * (0.6 + rng() * 0.8);
        const island = fx.islands && fx.islands['ilha-baloes'];
        const fromIsland = island && rng() < 0.4;
        const from = fromIsland ? island.x0 + 10 + rng() * (ISLAND_W - 20)
          : layout.audience.length ? layout.audience[Math.floor(rng() * layout.audience.length)].x + 6
            : layout.L + rng() * layout.width;
        fx.lanterns.push({ id: ++fx.lanternId, x: from, y: fromIsland ? island.surface - 18 : GROUND - 26, born: now, sway: rng() * 6,
          speed: 0.009 + rng() * 0.005,
          color: rng() < 0.5 ? '#ee2f3c' : rng() < 0.5 ? '#ff8a12' : '#ffd21e' });
      }
      for (let i = fx.lanterns.length - 1; i >= 0; i--) {
        const b = fx.lanterns[i];
        const age = now - b.born;
        // Clicado: o balão dispara para o céu (a subida acelera a partir do clique) soltando faísca.
        const boost = b.boost ? Math.max(0, now - b.boost) ** 2 * 0.00004 : 0;
        const y = Math.round(b.y - age * b.speed - boost);
        if (y < -12) { fx.lanterns.splice(i, 1); continue; }
        const x = Math.round(b.x + Math.sin(age / 700 + b.sway) * 3);
        if (b.boost && rng() < 0.5) {
          fx.particles.push({ x: x + 1, y: y + 5, vx: (rng() - 0.5) * 0.01, vy: 0.01, born: now, ttl: 400, colors: SPARK, ember: true });
        }
        if (!b.boost) regions.push({ id: `lanterna:${b.id}`, x: x - 2, y: y - 2, w: 7, h: 9 });
        const flicker = 0.75 + 0.25 * Math.sin(age / 90 + b.sway);
        halo(x + 1, y + 3, 5, '#ffac2a', 0.35 * flicker);
        g.fillStyle = INK;
        g.fillRect(x - 1, y - 1, 5, 6);
        g.fillStyle = b.color;
        g.fillRect(x, y, 3, 4);
        g.fillStyle = '#fff07a';
        g.fillRect(x + 1, y + 1, 1, 2);
        g.fillStyle = flicker > 0.85 ? '#fffff0' : '#ffac2a';
        g.fillRect(x + 1, y + 4, 1, 1);
      }
    }

    // Balão de sorte: um balão dourado sobe da festa balançando (com brilhos em volta) e sai pelo topo; clicar nele
    // pega o prêmio. A posição vem do relógio do motor (engine.now), não do relógio do desenho.
    function drawLuckBalloon(engine, now) {
      const b = engine.state.balloon && engine.state.balloon.active;
      const meta = bundle.scenery['balao-ouro'];
      if (!b || !meta) return;
      const p = Math.min(1, Math.max(0, (engine.now() - b.born) / (b.until - b.born)));
      const sway = Math.sin(engine.now() / 800 + b.x * 6) * 5 + Math.sin(engine.now() / 2100 + b.x) * 3;
      const x = Math.round(layout.L + 14 + b.x * (layout.width - 44) + sway);
      const y = Math.round(GROUND - meta.h - 8 - p * (GROUND + meta.h - 8));
      halo(x + meta.w / 2, y + meta.h * 0.4, 14, '#ffd21e', 0.28 + 0.1 * Math.sin(now / 160));
      sprite(meta, frameAt(meta, now), x, y);
      // Brilhos: quatro estrelinhas de quatro pontas que acendem uma de cada vez em volta do balão.
      for (let k = 0; k < 4; k++) {
        const on = Math.floor(now / 170 + k * 2) % 6 === 0;
        if (!on) continue;
        const a = k * Math.PI / 2 + now / 900;
        const sx = Math.round(x + meta.w / 2 + Math.cos(a) * (meta.w * 0.75));
        const sy = Math.round(y + meta.h * 0.4 + Math.sin(a) * (meta.h * 0.5));
        g.fillStyle = '#fffff0';
        g.fillRect(sx - 1, sy, 3, 1);
        g.fillRect(sx, sy - 1, 1, 3);
      }
      regions.push({ id: 'balao-sorte', x: x - 2, y: y - 2, w: meta.w + 4, h: meta.h + 6 });
    }

    // Frenesi: a Mandioca brilha dourada e solta faíscas enquanto tudo rende em dobro (ou mais).
    function drawFrenzy(engine, now) {
      if (!(engine.state.runtime.frenzyLeft > 0)) return;
      const k = fx.scale;
      const cx = layout.host.x + 12;
      halo(cx, GROUND - Math.round(24 * k), Math.round(20 * k) + 4, '#ffd21e', 0.2 + 0.08 * Math.sin(now / 110));
      if (now >= fx.nextGlitter) {
        fx.nextGlitter = now + 60;
        fx.particles.push({ x: cx + (rng() - 0.5) * 22 * k, y: GROUND - Math.round(8 * k), vx: (rng() - 0.5) * 0.01,
          vy: -0.02 - rng() * 0.02, born: now, ttl: 500 + rng() * 300, colors: ['#fffff0', '#fff07a', '#ffd21e'], trail: true });
      }
    }

    function drawEffects(engine, now) {
      const tier = layout.tier;
      const holiday = !!engine.specialDay();
      if ((tier >= 4 || holiday) && now >= fx.nextFirework) {
        // Depois dos 100 convidados os fogos ficam cada vez mais seguidos (até o dobro); em dia de santo, sempre.
        const busy = holiday && tier < 4 ? 1.4 : Math.max(0.5, 1 - (engine.state.size - 100) / 200);
        fx.nextFirework = now + (900 + rng() * 1800) * busy;
        spawnFirework(now);
      }
      // A plateia puxa uma "ola" de tempos em tempos quando já tem bastante gente.
      const crowdSize = layout.audience.length + layout.audience2.length + layout.audience3.length;
      if (fx.wave && now - fx.wave.at > 1800) fx.wave = null;
      if (crowdSize >= 16) {
        if (!fx.nextWave) fx.nextWave = now + 5000;
        else if (now >= fx.nextWave) {
          fx.wave = { at: now, dir: rng() < 0.5 ? 1 : -1 };
          fx.nextWave = now + Math.max(9000, 26000 - crowdSize * 90) * (0.7 + rng() * 0.6);
        }
      }
      drawLanterns(engine, now);
      drawPigeon(now);
      drawPote(engine, now, GROUND - POLE_H[tier]);
      drawSaco(engine, now);
      drawAuctionPrize(engine, now);
      drawSticker(now);
      drawChatter(engine, now);
      drawScorecards(now);
      drawFrenzy(engine, now);
      drawLuckBalloon(engine, now);
      drawPot(engine, now);
      drawRain(now, GROUND - POLE_H[tier]);
      drawCold(engine, now);
      if (now < fx.flashUntil) {
        // Relâmpago: acende tudo o que já foi desenhado (nada vaza para o desktop transparente).
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = `rgba(214, 232, 255, ${0.4 * Math.min(1, (fx.flashUntil - now) / 100)})`;
        g.fillRect(0, 0, view.width, H);
        g.globalCompositeOperation = 'source-over';
      }
      const r = engine.state.runtime;
      if (!r.dancing && now >= fx.nextSweat) {
        fx.nextSweat = now + 750;
        fx.particles.push({ x: layout.host.x + 12 + Math.round(9 * fx.scale), y: GROUND - Math.round(30 * fx.scale),
          vx: 0.002, vy: 0.012, born: now, ttl: 420,
          colors: ['#9fc8ff'], drop: true });
      }
      drawRockets(now);
      const at = (p, age) => [p.x + p.vx * age + (p.wobble ? Math.sin(age / 120 + p.wobble) * (p.flip ? 2 : 0.8) : 0),
        p.y + p.vy * age + (p.gravity ? p.gravity * age * age : 0)];
      for (let i = fx.particles.length - 1; i >= 0; i--) {
        const p = fx.particles[i];
        const age = now - p.born;
        if (age < 0) continue;
        if (age > p.ttl) { fx.particles.splice(i, 1); continue; }
        const t = age / p.ttl;
        const [x, y] = at(p, age);
        if (p.shape) { drawShape(SHAPES[p.shape], Math.round(x), Math.round(y), p.colors[0], t > 0.7 ? (1 - t) / 0.3 : 1); continue; }
        if (p.breath) {
          // Fumacinha do friozinho: um sopro branco que sai da boca, cresce um pouco e some.
          const radius = 1 + Math.floor(t * 2.5);
          g.globalAlpha = 0.9 * (1 - t * t);
          g.drawImage(glow(radius, '#f4f8ff', 1.1), Math.round(x - radius), Math.round(y - radius));
          g.globalAlpha = 1;
          continue;
        }
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
      // Menos letreiros (Ajustes): os passos continuam rendendo, só não sobe o número.
      if (calm && fx.stepSum) { fx.stepSum = 0; fx.stepCrit = false; }
      if (fx.stepSum && now - fx.stepAt > 140) {
        // Os números dos passos não se atropelam: o novo empurra os anteriores para cima, em pilha.
        let top = GROUND - Math.round(50 * fx.scale);
        for (let i = fx.texts.length - 1; i >= 0; i--) {
          const item = fx.texts[i];
          if (!item.step) continue;
          const y = item.y - item.rise * Math.min(1, (now - item.born) / item.ttl * 1.6);
          if (y > top - 8) item.y -= y - (top - 8);
          top = Math.min(y, top - 8);
        }
        say(`+${amount(fx.stepSum)}`, layout.host.x + 12, GROUND - Math.round(50 * fx.scale), now, fx.stepCrit ? '#ff907a' : '#fff07a', 900, 12).step = true;
        fx.stepSum = 0;
        fx.stepCrit = false;
      }
      for (let i = fx.texts.length - 1; i >= 0; i--) {
        const item = fx.texts[i];
        const age = now - item.born;
        if (age > item.ttl) { fx.texts.splice(i, 1); continue; }
        // Texto marcado para depois (o resultado do concurso, o grito sobre os bichos): ainda não aparece.
        if (age < 0 || fx.hideTexts) continue;
        const t = age / item.ttl;
        // O letreiro inteiro dentro da festa: perto da borda (o mastro, a barraca do canto), ele desliza para dentro em vez
        // de sair cortado. Cada letra tem 4 px.
        const half = (String(item.text).length * 4 + 1) / 2 + 1;
        const x = view.width > half * 2 ? Math.max(half, Math.min(view.width - half, item.x)) : item.x;
        write(item.text, x, item.y - item.rise * Math.min(1, t * 1.6), item.color, t > 0.75 ? (1 - t) * 4 : 1);
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
    // Facho do canhão de luz do palco: um trapézio que alarga para baixo e fica mais forte perto do chão, pintado uma vez
    // por cor e altura (eram uma linha por pixel de altura a cada quadro).
    const beams = new Map();
    function beamImage(color, height) {
      const key = `${color}|${height}`;
      let image = beams.get(key);
      if (image) return image;
      const widest = Math.round((2 + height * 0.45) * 2) + 2;
      image = document.createElement('canvas');
      image.width = widest;
      image.height = height + 1;
      const p = image.getContext('2d');
      p.fillStyle = color;
      for (let y = 0; y <= height; y++) {
        const half = 2 + y * 0.45;
        p.globalAlpha = 0.14 * (0.5 + 0.5 * y / Math.max(1, height));
        p.fillRect(Math.round(widest / 2 - half), y, Math.round(half * 2), 1);
      }
      if (beams.size > 40) beams.clear();
      beams.set(key, image);
      return image;
    }

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
            const beam = beamImage(FLAGS[(Math.floor(now / 3000) + k * 3) % FLAGS.length], floor - top);
            g.drawImage(beam, Math.round(cx - beam.width / 2), top);
          }
          g.globalCompositeOperation = 'source-over';
        }
      }
    }

    // Eventos do motor viram efeitos na festa.
    const LOOKS = { wedding: 'coracao', 'wedding-end': 'coracao', 'letter-ready': 'coracao', achievement: 'estrela',
      'tier-up': 'estrela', 'bingo-win': 'estrela', 'leilao-sold': 'estrela', 'saco-end': 'estrela', 'pote-break': 'estrela',
      grow: 'estrela', learn: 'estrela', legendary: 'estrela', contest: 'estrela', poke: 'feliz', equip: 'feliz', 'cobra-caught': 'feliz', foto: 'estrela', 'burro-pin': 'feliz', compadres: 'coracao', 'flag-caught': 'feliz', 'cook-served': 'coracao', feed: 'feliz' };
    function onEvents(engine, events, now = root.performance?.now?.() || 0) {
      if (Array.isArray(events) && events.some(event => event.type === 'new-year')) {
        reset();
        draw(engine, now);
      }
      if (!layout) return;
      const hostX = layout.host.x + 12;
      const up = n => GROUND - Math.round(n * fx.scale);
      for (const event of events) {
        // A Mandioca reage com o olhar: coração no amor, estrela nas vitórias, felizinha no carinho e na roupa nova.
        const kind = LOOKS[event.type];
        if (kind && (event.type !== 'leilao-sold' || event.winner === 'voce') && (event.type !== 'saco-end' || event.place === 1) &&
          (event.type !== 'contest' || event.place === 1)) {
          fx.look = { kind, until: now + (kind === 'feliz' ? 1100 : 1800) };
        }
        if (event.type === 'grow') {
          // A Mandioca cresceu: clarão, estrelinhas em anel, confete e o aviso em cima dela.
          fx.grow = { at: now, stage: event.stage };
          fx.celebrateUntil = now + GROW_MS;
          confetti(now, hostX, up(40), 26);
          say(tr('fx.grew'), hostX, up(70), now, '#fff07a', 1500, 10);
          for (let i = 0; i < 18; i++) {
            const a = i / 18 * Math.PI * 2;
            const speed = 0.02 + (i % 3) * 0.006;
            fx.particles.push({ x: hostX, y: up(22), vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, gravity: 0.000012,
              born: now, ttl: 700 + (i % 4) * 120, colors: ['#fffff0', '#fff07a', '#9ef05a', '#fff07a'], trail: true });
          }
        } else if (event.type === 'dance') {
          // Trocou de passo: o nome sobe em cima dela (menos quando trocou há pouco, para não encher a tela).
          const dance = engine.data.dances.find(entry => entry.id === event.id);
          if (dance && dance.at >= 0 && now - fx.danceSayAt > 2500 && engine.state.runtime.dancing) {
            fx.danceSayAt = now;
            say(dance.name, hostX, up(64), now, '#9fc8ff', 1100, 6);
          }
        } else if (event.type === 'special-day') {
          confetti(now, layout.L + layout.width / 2, GROUND - 40, 50);
          for (let k = 0; k < 4; k++) spawnFirework(now, k * 300);
          say(tr('fx.specialDay'), layout.L + layout.width / 2, Math.max(10, GROUND - POLE_H[layout.tier] - 24), now, '#ffd21e', 2600, 8);
        } else if (event.type === 'set') {
          fx.celebrateUntil = now + 800;
          confetti(now, hostX, up(40), 22);
          say(tr('fx.set'), hostX, up(78), now, '#ff8ac8', 1600, 8);
        } else if (event.type === 'new-year') {
          // O São João do ano que vem: fogos, confete e a Mandioca replantada, que brota da terra de novo.
          fx.sprout = now;
          fx.celebrateUntil = now + 1600;
          confetti(now, hostX, GROUND - 40, 50);
          for (let k = 0; k < 5; k++) spawnFirework(now, k * 250);
          say(tr('fx.newYear'), hostX, Math.max(10, GROUND - POLE_H[layout.tier] - 14), now, '#ffd21e', 2600, 8);
        } else if (event.type === 'rings') {
          // Fim de rodada nas Argolas: a barraca comemora na festa (confete conforme os acertos) ou consola.
          const side = [layout.leftSide, layout.rightSide].find(entry => entry && entry.id === 'barraca-argolas');
          if (side) {
            const x = side.x + side.meta.w / 2;
            const top = GROUND - side.meta.h;
            if (event.hits > 0) confetti(now, x, top + 12, 6 + event.hits * 5);
            say(tr(event.hits > 0 ? 'fx.argolasHit' : 'fx.argolasMiss'), x, Math.max(10, top - 4), now, event.hits > 0 ? '#9ef05a' : '#fff8e8', 1400, 8);
          }
        } else if (event.type === 'fished') {
          // Pescou: um peixinho pula do tanque da Barraca de Pescaria, dá um arco e cai de volta com um respingo.
          const side = [layout.leftSide, layout.rightSide].find(entry => entry && entry.id === 'barraca-pescaria');
          if (side) fx.fishJump = { at: now, x: side.x + side.meta.w / 2, y: GROUND - 14, dir: rng() < 0.5 ? -1 : 1, splashed: false };
        } else if (event.type === 'letter-ready') {
          // Chegou carta: o pombo-correio traz, voando até a barraca do correio (ou até a Mandioca).
          const side = [layout.leftSide, layout.rightSide].find(entry => entry.id === 'correio');
          const target = side ? side.x + side.meta.w / 2 : hostX;
          const low = side ? GROUND - side.meta.h - 6 : up(58);
          fx.pigeon = { at: now, dir: target > layout.L + layout.width / 2 ? 1 : -1, target, low, dropped: false };
        } else if (event.type === 'crasher-caught' && event.jailed) {
          fx.jailUntil = now + 60000;
          fx.nextPlea = now + 800;
        } else if (event.type === 'fantasia-soon') {
          say(tr('fx.fantasia'), layout.danceLeft + (layout.danceRight - layout.danceLeft) / 2,
            Math.max(10, GROUND - POLE_H[layout.tier] - 30), now, '#ff8ad0', 2400, 8);
        } else if (event.type === 'contest' || event.type === 'fantasia') {
          // Os jurados (três pessoas da plateia da frente) levantam a plaquinha com a nota, e o lugar sobe em cima da pista.
          // No concurso de fantasia ela faz pose de passarela enquanto os jurados levantam as notas.
          if (event.type === 'fantasia') { fx.look = { kind: 'estrela', until: now + 2600 }; fx.celebrateUntil = now + 1800; }
          const judges = layout.audience.slice().sort((a, b) => a.x - b.x);
          const picks = judges.length >= 3 ? [judges[Math.floor(judges.length * 0.25)], judges[Math.floor(judges.length * 0.5)],
            judges[Math.floor(judges.length * 0.75)]] : [];
          fx.scorecards = picks.map((guest, i) => ({ x: guest.x + 6, note: event.notes[i], at: now + i * 500 }));
          fx.scoreUntil = now + 5200;
          const centre = layout.danceLeft + (layout.danceRight - layout.danceLeft) / 2;
          say(tr(`fx.contest.${event.place}`), centre, Math.max(10, GROUND - POLE_H[layout.tier] - 16), now + 1600, '#ffd21e', 2600, 8);
          if (event.place === 1) { confetti(now + 1600, centre, GROUND - 40, 50); for (let k = 0; k < 3; k++) spawnFirework(now, 1700 + k * 250); }
        } else if (event.type === 'quadrilha' && event.contest) {
          say(tr('fx.contestStart'), layout.danceLeft + (layout.danceRight - layout.danceLeft) / 2,
            Math.max(10, GROUND - POLE_H[layout.tier] - 30), now, '#9fc8ff', 2200, 8);
          fx.jumpUntil = now + 320;
        } else if (event.type === 'bingo-number') {
          // O locutor canta o número (alguns têm apelido) em cima da pista.
          const call = BINGO_CALLS.includes(event.n) ? tr(`fx.bingoCall.${event.n}`) : '';
          const x = layout.caller ? layout.caller.x + 8 : layout.danceLeft + (layout.danceRight - layout.danceLeft) / 2;
          say(call ? `${event.n}: ${call}` : tr('fx.bingoNumber', { n: event.n }), x, Math.max(10, GROUND - POLE_H[layout.tier] - 24), now,
            event.mine ? '#9ef05a' : '#fff8e8', 1900, 6);
          // Os números com apelido o papagaio adora repetir.
          if (call) fx.lastChat = { text: call, at: now, echoed: false };
        } else if (event.type === 'bingo-win') {
          fx.celebrateUntil = now + 1500;
          confetti(now, hostX, up(40), 40);
          say(tr('fx.bingo'), hostX, up(78), now, '#ffd21e', 2200, 10);
        } else if (event.type === 'bingo-lost' && layout.audience.length) {
          const guest = layout.audience[Math.floor(rng() * layout.audience.length)];
          say(tr('fx.bingo'), guest.x + 6, GROUND - 40, now, '#ff907a', 1800, 8);
        } else if (event.type === 'pote') {
          say(tr('fx.pote'), layout.L + layout.width / 2, Math.max(10, GROUND - POLE_H[layout.tier] - 14), now, '#ffd21e', 2200, 8);
        } else if (event.type === 'pote-hit') {
          // Paulada: o pote balança mais a cada uma e solta uns cacos de barro.
          fx.pote = { sway: 0.35 + 0.08 * event.hits, at: now };
          const at = fx.potePos;
          if (at) {
            say(tr(`fx.poc.${event.hits % 3}`), at.x, at.y - 14, now, '#ffd21e', 700, 6);
            for (let i = 0; i < 4; i++) {
              fx.particles.push({ x: at.x, y: at.y - 2, vx: (rng() - 0.5) * 0.03, vy: -0.01 - rng() * 0.012, gravity: 0.00004,
                born: now, ttl: 500 + rng() * 300, colors: ['#c07a36', '#7c421e', '#dca66a'] });
            }
          }
        } else if (event.type === 'pote-break') {
          // O pote quebra: cacos de barro e uma chuva de bala colorida; a plateia comemora.
          const at = fx.potePos || { x: layout.L + layout.width / 2, y: GROUND - 60 };
          fx.celebrateUntil = now + 1500;
          fx.jumpUntil = now + 320;
          say(tr('fx.poteBreak'), at.x, Math.max(10, at.y - 14), now, '#ff8ac8', 1800, 8);
          for (let i = 0; i < 12; i++) {
            fx.particles.push({ x: at.x, y: at.y, vx: (rng() - 0.5) * 0.05, vy: -0.015 - rng() * 0.02, gravity: 0.00005,
              born: now, ttl: 900 + rng() * 500, colors: ['#c07a36', '#7c421e', '#dca66a'] });
          }
          confetti(now, at.x, at.y, 34);
        } else if (event.type === 'sticker') {
          const sticker = (engine.data.album || []).flatMap(page => page.stickers).find(entry => entry.id === event.id);
          if (sticker) {
            fx.sticker = { key: sticker.icon, at: now };
            iconImage(sticker.icon);
            say(tr('fx.sticker'), layout.host.x + 12, GROUND - Math.round(58 * fx.scale) - 44, now, '#ffd21e', 1800, 6);
          }
        } else if (event.type === 'cobra') {
          fx.cobra = { start: now, dir: event.dir || 1, caught: null, shouts: 0 };
          // A galinha e os pintinhos também levam susto com a cobra (de pano, mas eles não sabem).
          const hen = layout.has.has('galinha') && spots.get('galinha');
          if (hen) {
            fx.react.galinha = now + 600;
            for (let i = 0; i < 12; i++) fx.react[`pintinho:${i}`] = now + 700 + i * 60;
            say('CO-CO-CO!', hen.x, Math.max(10, hen.y - 8), now + 600, '#fff8e8', 1100, 8);
          }
        } else if (event.type === 'cobra-caught') {
          const at = fx.cobra && cobraTrack(engine, now);
          if (at) {
            fx.cobra.caught = now;
            fx.cobra.at = { x: at.x };
            const x = at.x + (bundle.scenery.cobra?.w || 20) / 2;
            say(tr('fx.cobraPega'), Math.min(layout.R - 40, Math.max(layout.L + 40, x)), Math.max(10, GROUND - 40), now, '#9ef05a', 1600, 8);
            confetti(now, x, GROUND - 12, 14);
          }
        } else if (event.type === 'cobra-end') {
          fx.cobra = null;
          say(tr('fx.mentira'), layout.danceLeft + (layout.danceRight - layout.danceLeft) / 2,
            Math.max(10, GROUND - POLE_H[layout.tier] - 10), now, '#ff907a', 1800, 8);
        } else if (event.type === 'foto') {
          // O clique do lambe-lambe: flash na lente, a festa inteira acende um instante e todo mundo diz "xis".
          fx.fotoFlash = now + 260;
          if (flashOn) fx.flashUntil = now + 90;
          fx.celebrateUntil = now + 900;
          say(tr('fx.selfie'), hostX, up(66), now, '#ffffff', 1400, 8);
        } else if (event.type === 'cook-ready') {
          if (fx.stovePos) say(tr('fx.cook.ready'), fx.stovePos.x, Math.max(10, fx.stovePos.y - 14), now, '#ffd21e', 1800, 8);
        } else if (event.type === 'cook-served') {
          if (fx.stovePos) fx.dishFly = { at: now, id: event.id, from: { ...fx.stovePos } };
        } else if (event.type === 'feed') {
          // Comida da loja: cai do alto, um pouco à esquerda, e faz a curvinha até a boca dela.
          fx.dishFly = { at: now, id: event.id, kind: 'comidas', from: { x: layout.host.x - 26, y: Math.max(8, GROUND - Math.round(80 * fx.scale)) } };
        } else if (event.type === 'compadres') {
          const c = fx.compadre;
          const mid = layout.fire.x + layout.fire.meta.w / 2;
          if (c) c.witnessed = true;
          confetti(now, mid, GROUND - 20, 16);
          say(tr('fx.compadre.testemunha'), mid, Math.max(10, GROUND - layout.fire.meta.h - 22), now, '#9ef05a', 1600, 8);
        } else if (event.type === 'flag-caught') {
          const f = fx.looseFlag;
          if (f) {
            const t = Math.min(1, (now - f.at) / FLAG_FALL_MS);
            const x = f.x + f.dir * 30 * t;
            confetti(now, x, GROUND - 30, 10);
            say(tr('fx.flag'), x, Math.max(10, GROUND - 44), now, '#9ef05a', 1400, 8);
          }
          fx.looseFlag = null;
        } else if (event.type === 'burro') {
          say(tr('fx.burro'), layout.danceLeft + 16, Math.max(10, GROUND - 44), now, '#ffd21e', 2000, 8);
          // O jegue da festa desconfia do desenho no cavalete.
          const jegue = layout.has.has('jegue') && spots.get('jegue');
          if (jegue) {
            say(tr('fx.jegueBurro'), jegue.x, Math.max(10, jegue.y - 10), now + 1800, '#fff8e8', 1800, 6);
          }
        } else if (event.type === 'burro-pin') {
          const at = fx.burroPos || { x: layout.danceLeft + 16, y: GROUND - 30 };
          say(tr(`fx.burroPin.${event.grade}`), at.x, Math.max(10, at.y - 10), now, event.grade === 'mosca' ? '#9ef05a' : '#fff07a', 1800, 8);
          if (event.grade === 'mosca') { confetti(now, at.x, at.y + 6, 24); fx.celebrateUntil = now + 900; }
        } else if (event.type === 'fotografo') {
          fx.fotoCallAt = now + 7000;
        } else if (event.type === 'visitor') {
          say(tr('fx.visitor'), layout.L + layout.width / 2, Math.max(10, GROUND - POLE_H[layout.tier] - 18), now, '#ffd21e', 2400, 8);
        } else if (event.type === 'visitor-greet') {
          const at = fx.visitorPos;
          if (at) {
            say(tr('fx.visitorThanks'), at.x, Math.max(10, at.y - 10), now, '#9ef05a', 1400, 8);
            for (let i = 0; i < 4; i++) float('coracao', at.x + (i - 1.5) * 5, at.y - 4 - (i % 2) * 3, now, ['#ff4f9e', '#ff8a96']);
          }
        } else if (event.type === 'cold') {
          say(tr('fx.cold'), layout.L + layout.width / 2, Math.max(10, GROUND - POLE_H[layout.tier] - 18), now, '#cfe3ff', 2200, 6);
        } else if (event.type === 'quentao') {
          // Um gole de quentão vendido: a canequinha sobe do barril com a ficha.
          const side = layout.leftSide?.id === 'barril-quentao' ? layout.leftSide : layout.rightSide?.id === 'barril-quentao' ? layout.rightSide : null;
          if (side) {
            const x = side.x + Math.round(side.meta.w / 2);
            say(tr('fx.quentao'), x, GROUND - side.meta.h - 4, now, '#ffd21e', 1200, 10);
            for (let i = 0; i < 3; i++) {
              fx.particles.push({ x: x + (rng() - 0.5) * 6, y: GROUND - side.meta.h + 6, vx: (rng() - 0.5) * 0.006, vy: -0.01 - rng() * 0.006,
                born: now, ttl: 900 + rng() * 300, breath: true });
            }
          }
        } else if (event.type === 'announce') {
          announce(engine, event, now);
        } else if (event.type === 'leilao') {
          fx.leilao = { hit: now, sold: null, bid: 0 };
          const at = fx.leilaoPos || (layout.stage ? { x: layout.stage.x + 70, y: GROUND - 40 } : null);
          if (at) say(tr('fx.leilao'), at.x, Math.max(10, at.y - 30), now, '#ffd21e', 2200, 8);
        } else if (event.type === 'leilao-bid') {
          // Lance: o seu sai em cima do leiloeiro; o da plateia, de alguém da plateia de trás.
          const at = fx.leilaoPos;
          const text = tr('fx.leilaoBid', { n: event.price });
          if (event.who === 'voce' && at) say(text, at.x, Math.max(10, at.y - 34), now, '#ffd21e', 900, 6);
          else if (event.who === 'plateia') {
            const rows = [layout.audience3, layout.audience2, layout.audience].filter(list => list.length);
            const list = rows[0];
            const guest = list && list[Math.floor(rng() * list.length)];
            const gx = guest ? guest.x + 6 : at ? at.x - 30 : layout.L + layout.width / 2;
            say(text, Math.max(layout.L + 14, Math.min(layout.R - 14, gx)), GROUND - 44, now, '#fff8e8', 1000, 6);
          }
        } else if (event.type === 'leilao-call') {
          fx.leilao.hit = now;
          const at = fx.leilaoPos;
          if (at) say(tr(`fx.leilaoCall.${event.n}`), at.x, Math.max(10, at.y - 30), now, '#ff907a', 1400, 6);
        } else if (event.type === 'leilao-sold') {
          fx.leilao.hit = now;
          fx.leilao.sold = { at: now, winner: event.winner, prize: event.prize };
          const at = fx.leilaoPos;
          if (at && event.winner) say(tr('fx.leilaoSold'), at.x, Math.max(10, at.y - 30), now, '#ffd21e', 1800, 8);
          if (event.winner === 'voce') {
            // Arrematou: confete no palco e a festa comemora.
            fx.celebrateUntil = now + 1500;
            fx.jumpUntil = now + 320;
            if (at) confetti(now, at.x, at.y - 10, 26);
          }
        } else if (event.type === 'saco') {
          fx.saco = { hop: null, exit: null, last: null, nextYou: now + 1500 };
          const { x0, x1 } = sacoTrack();
          say(tr('fx.saco'), Math.round((x0 + x1) / 2), Math.max(10, GROUND - 44), now, '#ffd21e', 2400, 8);
        } else if (event.type === 'saco-go') {
          const { x0 } = sacoTrack();
          say(tr('fx.sacoGo'), x0 + 12, GROUND - 34, now, '#9ef05a', 900, 8);
        } else if (event.type === 'saco-hop') {
          fx.saco.hop = { at: now, from: event.hops - 1, to: event.hops };
          const at = fx.sacoPos;
          if (at) {
            for (let i = 0; i < 3; i++) {
              fx.particles.push({ x: at.x - 4, y: GROUND - 1, vx: -0.01 - rng() * 0.015, vy: -0.006 - rng() * 0.006, gravity: 0.00003,
                born: now, ttl: 300 + rng() * 200, colors: ['#dca66a', '#c07a36'] });
            }
            if (event.hops % 4 === 0) say(tr(`fx.sacoHop.${Math.floor(rng() * 3)}`), at.x, at.y - 2, now, '#9ef05a', 600, 6);
          }
        } else if (event.type === 'saco-fall') {
          fx.saco.hop = null;
          const at = fx.sacoPos;
          if (at) {
            say(tr(`fx.sacoFall.${Math.floor(rng() * 3)}`), at.x, Math.max(10, at.y - 2), now, '#ff907a', 900, 6);
            for (let i = 0; i < 6; i++) {
              fx.particles.push({ x: at.x + 4, y: GROUND - 2, vx: (rng() - 0.5) * 0.04, vy: -0.01 - rng() * 0.01, gravity: 0.00005,
                born: now, ttl: 400 + rng() * 250, colors: ['#dca66a', '#c07a36', '#7c421e'] });
            }
          }
        } else if (event.type === 'saco-end' || event.type === 'saco-gone') {
          const last = fx.saco.last || { start: 0, rivals: [1, 1], hops: 0 };
          const place = event.type === 'saco-end' ? event.place : 0;
          fx.saco.exit = { at: now, clock: engine.now(), place, start: last.start, rivals: last.rivals,
            hops: place ? engine.cfg.sacoHops : last.hops };
          fx.saco.hop = null;
          const { x0, x1 } = sacoTrack();
          if (place === 1) {
            fx.celebrateUntil = now + 1500;
            fx.jumpUntil = now + 320;
            confetti(now, x1 + 8, GROUND - 24, 30);
          }
          const text = place ? tr(`fx.sacoPlace.${place}`) : tr('fx.sacoGone');
          say(text, place ? x1 : Math.round((x0 + x1) / 2), Math.max(10, GROUND - 34), now, place === 1 ? '#ffd21e' : '#fff8e8', 1800, 8);
        } else if (event.type === 'wedding') {
          fx.weddingStage = -1;
          const w = layout.wedding;
          if (!w) continue;
          confetti(now, w.left + w.width / 2, GROUND - 30, 36);
          say(tr('fx.wedding'), w.left + w.width / 2, Math.max(10, GROUND - POLE_H[layout.tier] - 14), now, '#ff8ac8', 2400, 8);
        } else if (event.type === 'rice' && layout.wedding) {
          // Chuva de arroz: uns grãos brancos caem de cima dos noivos.
          const w = layout.wedding;
          fx.riceUntil = now + 450;
          for (let i = 0; i < 14; i++) {
            fx.particles.push({ x: w.left - 8 + rng() * (w.width + 16), y: GROUND - 44 - rng() * 12, vx: (rng() - 0.5) * 0.012,
              vy: 0.004 + rng() * 0.006, gravity: 0.000018, born: now, ttl: 900 + rng() * 500, colors: ['#fffff0', '#fff4e4', '#ffe27a'] });
          }
        } else if (event.type === 'wedding-end' && layout.wedding) {
          const w = layout.wedding;
          fx.celebrateUntil = now + 1500;
          fx.jumpUntil = now + 320;
          confetti(now, w.left + w.width / 2, GROUND - 30, 30 + Math.round(event.share * 40));
        } else if (event.type === 'quadrilha') {
          fx.tunnelSaid = false;
          fx.bichosUntil = now + engine.cfg.quadrilhaSeconds * 1000;
          // Com bicho na festa, alguém da plateia repara que eles entraram na dança.
          if (['bode', 'jegue', 'boi', 'galinha'].some(id => layout.has.has(id)) && layout.audience.length) {
            const guest = layout.audience[Math.floor(rng() * layout.audience.length)];
            say(tr('fx.bichos'), guest.x + 6, GROUND - 40, now + 2500, '#9ef05a', 2200, 6);
          }
          fx.jumpUntil = now + 320;
          confetti(now, layout.danceLeft + (layout.danceRight - layout.danceLeft) / 2, GROUND - 40, 30);
          say(tr('fx.quadrilha'), layout.danceLeft + (layout.danceRight - layout.danceLeft) / 2,
            Math.max(10, GROUND - POLE_H[layout.tier] - 18), now, '#ffd21e', 2000, 8);
        } else if (event.type === 'quadrilha-call') {
          // A marcadora grita e todo mundo dá um pulinho.
          fx.jumpUntil = now + 320;
          // O quarto grito varia (caminho da roça, cumprimenta a dama, então é São João); o da cobra e o da chuva ficam no lugar.
          const call = event.n % 8 === 3 ? [3, 6, 7][Math.floor(rng() * 3)] : event.n % 8;
          // O grito vira movimento: no caminho da roça a fila anda para o lado e volta; no cumprimento, os pares se curvam.
          if (call === 3 || call === 6) fx.callMove = { kind: call === 3 ? 'caminho' : 'cumprimenta', at: now };
          // Anavan: os pares dão um passo à frente; anarriê: um passo para trás.
          if (call === 0 || call === 1) fx.callMove = { kind: call === 0 ? 'anavan' : 'anarrie', at: now };
          say(tr(`fx.call.${call}`), layout.danceLeft + (layout.danceRight - layout.danceLeft) / 2,
            Math.max(10, GROUND - POLE_H[layout.tier] - 10 - (event.n % 2) * 10), now,
            ['#ff907a', '#9ef05a', '#9fc8ff', '#fff07a'][event.n % 4], 1800, 8);
          // "Olha a chuva!" sem chuva nenhuma: guarda-chuvas abertos por um instante e a marcadora desmente.
          if (event.n % 8 === 5 && fx.wx.rain < 0.15) {
            fx.fakeRainUntil = now + 1500;
            say(tr('fx.mentira'), layout.danceLeft + (layout.danceRight - layout.danceLeft) / 2,
              Math.max(10, GROUND - POLE_H[layout.tier] - 20), now + 1500, '#ff907a', 1600, 8);
          }
        } else if (event.type === 'rain') {
          say(tr('fx.rain'), layout.L + layout.width / 2, Math.max(8, GROUND - POLE_H[layout.tier] - 40), now, '#9fc8ff', 2200, 4);
        } else if (event.type === 'thunder') {
          if (flashOn) fx.flashUntil = now + 140;
        } else if (event.type === 'rain-end') {
          say(tr('fx.rainbow'), layout.L + layout.width / 2, Math.max(8, GROUND - POLE_H[layout.tier] - 40), now, '#ffd21e', 2200, 4);
        } else if (event.type === 'poke') {
          // Carinho na Mandioca: ela comemora um instante, solta uma gracinha e uns corações.
          fx.celebrateUntil = now + 650;
          say(tr(`fx.poke.${Math.floor(rng() * 3)}`), hostX, up(64), now, '#ff8a96', 900, 8);
          // Às vezes o par fica com ciúme do carinho.
          if (layout.par && rng() < 0.2) say(tr('fx.parCiume'), layout.par.x + 8, GROUND - 34, now + 700, '#9ef05a', 1200, 8);
          for (let i = 0; i < 3; i++) float('coracao', hostX + (i - 1) * 8, up(46) - i % 2 * 4, now, ['#ff4f9e', '#ff8a96']);
          if (event.value) { fx.stepSum += event.value; fx.stepAt = now; }
        } else if (event.type === 'balloon') {
          say(tr('fx.balloon'), layout.L + layout.width / 2, 24, now, '#ffd21e', 1800, 6);
        } else if (event.type === 'frenzy-start') {
          fx.celebrateUntil = now + 900;
          confetti(now, hostX, up(40), 40);
          say(tr('fx.frenzy'), hostX, up(78), now, '#ffd21e', 1800, 10);
        } else if (event.type === 'learn') {
          fx.celebrateUntil = now + 900;
          confetti(now, hostX, up(40), 24);
          say(tr('fx.newStep'), hostX, up(78), now, '#ffd21e', 1600, 8);
        } else if (event.type === 'step') {
          fx.stepSum += event.value;
          fx.stepAt = now;
          if (now - fx.dustAt > 170) {
            fx.dustAt = now;
            dust(hostX, layout.tier >= 2 ? GROUND - 4 : GROUND - 1, now);
          }
          if (event.crit) {
            fx.stepCrit = true;
            fx.jumpUntil = now + 320;
            say(tr('fx.cobra'), hostX, up(62), now, '#ff907a', 1100, 6);
          }
        } else if (event.type === 'rest-start') {
          // Com carta esperando no correio, às vezes ela descansa lendo uma (e fica toda derretida).
          if (engine.state.mail.ready > 0 && rng() < 0.35 && bundle.mandioca.meta.tags.descansos?.carta) {
            fx.restKind = 'carta';
            fx.look = { kind: 'coracao', until: now + 2200 };
          } else if ((sleepy && rng() < 0.7) || (lateNight(engine) && rng() < 0.5)) {
            // De madrugada (pelo relógio do computador), metade dos descansos vira cochilo.
            fx.restKind = 'cochilo';
          } else if (engine.charActive('canjica') && rng() < 0.3) {
            // Com a Canjica no fogão, às vezes o descanso é uma tigelinha de canjica.
            fx.restKind = 'canjica';
          } else fx.restKind = ['ofega', 'ofega', 'abana', 'alonga', 'bebe', 'milho', 'cochilo'][Math.floor(rng() * 7)];
          say(tr('fx.phew'), hostX + Math.round(14 * fx.scale), up(40), now, '#fff8e8', 1300, 5);
        }
        else if (event.type === 'rest-end' && engine.state.bonfire.brasa > 0) say(tr('fx.ember'), hostX, up(56), now, '#ffac2a');
        else if (event.type === 'flare-start') {
          say(tr('fx.flare'), layout.fire.x + layout.fire.meta.w / 2, GROUND - layout.fire.meta.h - 6, now, '#ffac2a', 1400, 8);
        } else if (event.type === 'tier-up' || event.type === 'legendary') {
          fx.celebrateUntil = now + 1400;
          confetti(now, hostX, GROUND - 40, 40);
          for (let k = 0; k < 3; k++) spawnFirework(now, k * 260);
        } else if (event.type === 'size-up') {
          say(tr('fx.guests', { n: event.count }), hostX, up(70), now, '#9ef05a', 1500, 8);
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
        confetti(now, layout.host.x + 12, GROUND - Math.round(40 * fx.scale), 20);
        if (text) say(text, layout.host.x + 12, GROUND - Math.round(64 * fx.scale), now, '#9ef05a', 1400, 8);
      }
    }

    // Pares novos (das duas filas da quadrilha) chegam andando da borda mais perto.
    function trackArrivals(now) {
      for (const [key, sheet] of [['couples', bundle.crowd.dancers], ['backCouples', bundle.crowd.dancersBack]]) {
        const list = layout[key];
        const before = fx.shown[key];
        if (before !== undefined && list.length > before) {
          for (const couple of list.slice(before)) {
            fx.arrivals.set(`${sheet.image}:${couple.index}`,
              { at: now, from: couple.x < layout.host.x ? layout.L - 30 : layout.R + 10 });
          }
        }
        fx.shown[key] = list.length;
      }
    }

    // Ilhas flutuantes no céu (festas enormes): cada uma balança no seu tempo, presa ao topo do mastro por uma corda
    // com lanternas. Na da quadrilha, dois pares dançam em volta de uma fogueirinha; na dos balões, gente aplaude
    // embaixo de um varal e os balões de São João sobem de lá.
    function drawIslands(engine, now, poleTop) {
      fx.islands = {};
      layout.islands.forEach((id, i) => {
        const land = islandTerrains[i];
        if (!land) return;
        const left = id === 'ilha-quadrilha';
        const x0 = left ? layout.L + 2 : layout.R - 2 - ISLAND_W;
        const surface = poleTop - 26 + Math.round(Math.sin(now / 1700 + i * 2.1) * 2);
        fx.islands[id] = { x0, surface };
        const [ax, ay] = left ? [x0 + 8, surface + 6] : [x0 + ISLAND_W - 8, surface + 6];
        const [bx, by] = left ? [layout.L - 2, poleTop] : [layout.R + 2, poleTop];
        for (let k = 0; k <= 24; k++) {
          const t = k / 24;
          const x = Math.round(ax + (bx - ax) * t);
          const y = Math.round(ay + (by - ay) * t + Math.sin(t * Math.PI) * 5);
          g.fillStyle = '#4a2418';
          g.fillRect(x, y, 1, 1);
          if (k % 6 === 3) {
            const color = FLAGS[(k + i) % FLAGS.length];
            halo(x, y + 2, 3, color, 0.35);
            g.fillStyle = color;
            g.fillRect(x, y + 1, 1, 2);
          }
        }
        g.drawImage(land.image, x0 - 1, surface - land.top);
        const baby = bundle.scenery.mandioquinha;
        for (const [k, col] of [[0, 0.3], [1, 0.7]]) {
          const cx = Math.round(x0 + ISLAND_W * col);
          const under = surface + land.bottoms[Math.round((ISLAND_W - 1) * col)] + 1;
          g.fillStyle = '#4a2418';
          g.fillRect(cx, under, 1, 2);
          const swing = Math.round(Math.sin(now / 900 + k + i) * 0.8);
          sprite(baby, frameAt(baby, now, k + i), cx - Math.floor(baby.w / 2) + swing, under + 2);
        }
        if (left) {
          const fire = bundle.fires['0'];
          const fx0 = Math.round(x0 + ISLAND_W / 2 - fire.w / 2);
          halo(fx0 + fire.w / 2, surface - 6, 14, FIRE_LIGHT, 0.22);
          drawCrowd(engine, now, [{ x: x0 + 3, index: 900 }], bundle.crowd.dancers, surface, true);
          sprite(fire, frameAt(fire, now), fx0, surface - fire.h + 1);
          drawCrowd(engine, now, [{ x: x0 + ISLAND_W - 30, index: 901 }], bundle.crowd.dancers, surface, true);
          if (rng() < 0.08) {
            fx.particles.push({ x: fx0 + fire.w * (0.3 + rng() * 0.4), y: surface - fire.h + 3, vx: (rng() - 0.5) * 0.01,
              vy: -0.012 - rng() * 0.01, born: now, ttl: 600 + rng() * 600, colors: SPARK, ember: true });
          }
        } else {
          g.fillStyle = '#7c421e';
          g.fillRect(x0 + 5, surface - 24, 1, 24);
          g.fillRect(x0 + ISLAND_W - 6, surface - 24, 1, 24);
          drawBunting(x0 + 5, x0 + ISLAND_W - 6, surface - 23, 5, i * 2, true, now);
          const people = [8, 22, 36, 50, 64].map((dx, k) => ({ x: x0 + dx, index: 950 + k }));
          drawCrowd(engine, now, people, bundle.crowd.audience, surface, false);
        }
        spots.set(id, { x: x0 + ISLAND_W / 2, y: surface - 10 });
      });
    }

    // Passos de embalo (o par balança de um lado para o outro) e de pisada (o par pula no ritmo).
    const PAR_SWAY = new Set(['xote', 'balance', 'ciranda', 'arrasta-pe', 'lambada']);
    const PAR_HOP = new Set(['coco', 'xaxado', 'passinho', 'boi-bumba', 'frevo', 'polichinelo']);

    // Tudo o que aparece num quadro, de trás para frente.
    function paint(engine, now, preview, eq) {
      const s = engine.state;
      setVaral(eq.varal);
      const tier = layout.tier;
      const poleTop = GROUND - POLE_H[tier];
      fx.wx = weatherOf(engine);
      updateWind(now);
      drawSky(engine, now, poleTop);
      drawRainbow(engine);
      drawClouds(now, poleTop);
      drawIslands(engine, now, poleTop);
      drawBack(now);
      drawBackdrop(now);
      drawCarroBoi(now);
      drawStage(engine, now);
      drawCrowd(engine, now, layout.audience3, bundle.crowd.audience3, GROUND - 19, false);
      drawCrowd(engine, now, layout.audience2, bundle.crowd.audience2, GROUND - 14, false);
      drawCrowd(engine, now, layout.audience, bundle.crowd.audience, GROUND - 9, false);
      drawPhoneLights(now);
      drawPole(layout.L - 3, poleTop);
      drawPole(layout.R + 1, poleTop);
      drawParrot(now, poleTop);
      drawSpeaker(now, poleTop);
      // No Maior São João do Mundo, a cada 40 convidados a mais entra outro varal (até 5), com lâmpadas.
      const strings = STRINGS[tier] + (tier >= 4 ? Math.min(2, Math.floor((s.size - 100) / 40)) : 0);
      for (let i = 0; i < strings; i++) {
        const lamps = tier >= 4 && (i === 1 || i >= 3);
        drawBunting(layout.L - 1, layout.R + 1, poleTop + 2 + i * 9, 8 + tier * 3 - i * 2, i * 3, lamps, now);
      }
      drawHanging(now, poleTop, tier);
      g.drawImage(terrain.image, layout.L - 1, GROUND - terrain.top);
      drawRoots(now);
      drawPuddles(now);
      regions.push({ id: 'terreiro', x: layout.L, y: GROUND, w: layout.width, h: terrain.bottom - terrain.top });
      if (tier >= 2) drawDanceFloor(layout.danceLeft, layout.danceRight);
      // O fogão marca onde está a cada quadro (se saiu da festa, não fica posição velha para o "tá pronto").
      fx.stovePos = null;
      drawSide(engine, layout.leftSide, now, 'lado-esquerda');
      const floor = GROUND - 3 * (tier >= 2 ? 1 : 0);
      const snakeAt = cobraTrack(engine, now);
      fx.cobraX = snakeAt ? snakeAt.x + bundle.scenery.cobra.w / 2 : null;
      fx.scared = 0;
      drawCrowd(engine, now, layout.backCouples, bundle.crowd.dancersBack, floor - 4, true);
      drawWeddingArch(engine, now, floor);
      drawCrowd(engine, now, layout.couples, bundle.crowd.dancers, floor, true);
      drawWeddingParty(engine, now, floor);
      const dance = tier >= 2 ? -3 : 0;
      // O carro da pamonha passa atrás da Mandioca (na frente dos pares), para não tapar a anfitriã.
      if (layout.has.has('kombi') && bundle.scenery.kombi) drawKombi(now);
      drawHost(engine, now, dance, eq);
      if (preview) write(tr('fx.preview'), layout.host.x + 12, GROUND + dance - Math.round(60 * fx.scale), '#9fc8ff');
      if (layout.par) {
        const milho = bundle.chars.milho;
        const frame = s.runtime.dancing ? Math.floor(s.runtime.lift * 4) % 4 : 0;
        const hopAge = now - (fx.parHop || -1e9);
        let hop = hopAge >= 0 && hopAge < 420 ? -Math.round(5 * Math.sin(hopAge / 420 * Math.PI)) : 0;
        // O par acompanha o jeito do passo da Mandioca: balança nos passos de embalo e pula nos de pisada.
        let sway = 0;
        if (s.runtime.dancing && PAR_SWAY.has(s.runtime.dance)) sway = Math.round(Math.sin(now / 380) * 1.5);
        if (s.runtime.dancing && PAR_HOP.has(s.runtime.dance) && !hop) hop = -Math.round(Math.max(0, Math.sin(now / 190)) * 2);
        const px = layout.par.x + sway;
        shadow(px + 8, 10);
        sprite(milho, frame, px, GROUND + dance - milho.h + 1 + hop);
        rim(milho, frame, px, GROUND + dance - milho.h + 1 + hop, false, px + 8);
        regions.push({ id: 'par', x: layout.par.x, y: GROUND + dance - milho.h, w: milho.w, h: milho.h });
      }
      drawCritters(now);
      drawSopinha(engine, now);
      drawCaller(engine, now);
      updateKids(engine, now);
      updateCompadres(engine, now);
      drawKids(now, true);
      drawCompadres(now, true);
      drawFire(engine, now);
      drawSide(engine, layout.rightSide, now, 'lado-direita');
      drawKids(now, false);
      drawCompadres(now, false);
      if (layout.has.has('caramelo') && bundle.scenery.caramelo) drawDog(engine, now);
      if (layout.has.has('trem') && bundle.scenery.trem) drawTrain(now);
      drawVisitor(engine, now);
      drawFotografo(engine, now);
      drawBurro(engine, now);
      drawFishJump(now);
      drawLooseFlag(now, GROUND - POLE_H[layout.tier]);
      drawDishFly(now);
      moodLines(engine, now);
      if (engine.state.size < 25 && bundle.scenery.sapo) drawFrog(now);
      drawPeddler(engine, now);
      drawCrasher(engine, now);
      drawRequest(engine, now);
      ambientEstalo(now);
      // A cobra passa por cima dos bichos e das flores da beira, para não sumir no meio da festa cheia.
      drawCobra(engine, now, floor);
      drawLights(engine, now);
      drawEffects(engine, now);
      popScenery(now);
    }

    // Voltando de um salto no relógio: os eventos da festa que venceram nesse meio-tempo (fitas, drones, carro de boi,
    // compadres, solos do trio...) não começam todos juntos; entram um de cada vez, com uns 30 s entre eles.
    function staggerFx(now) {
      const due = [];
      for (const key of ['fitas', 'drones', 'flock', 'carroBoi', 'compadre', 'phones']) {
        const f = fx[key];
        if (f && !f.at && f.next <= now) due.push(at => { f.next = at; });
      }
      for (const key of ['nextSolo', 'nextWind', 'nextRing', 'nextEstalo', 'moodAt']) {
        if (fx[key] && fx[key] <= now) due.push(at => { fx[key] = at; });
      }
      for (let i = due.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [due[i], due[j]] = [due[j], due[i]];
      }
      due.forEach((set, i) => set(now + 20000 + i * 30000 + rng() * 10000));
    }

    // Outra partida substitui os efeitos e os alvos, mantendo escala, ritmo e opções visuais.
    function reset() {
      fx = freshEffects();
      fx.lastDraw = -Infinity;
      layout = null;
      layoutKey = '';
      terrain = null;
      ridge = null;
      sky = 0;
      H = BASE_H;
      GROUND = BASE_GROUND;
      islandTerrains = [];
      regions = [];
      spots = new Map();
      view.float = 0;
      view.applied = null;
      g.clearRect(0, 0, buffer.width, buffer.height);
    }

    function draw(engine, now, preview = null) {
      if (pending > 0 || now - fx.lastDraw < minFrame) return;
      // Um salto no relógio (o computador dormiu, a janela ficou escondida): os eventos da festa espalham.
      if (fx.lastDraw > 0 && Number.isFinite(fx.lastDraw) && now - fx.lastDraw > 60000) staggerFx(now);
      fx.lastDraw = now;
      fx.lastArgs = { engine, now, preview };
      const s = engine.state;
      const eq = withPreview(s.equipped, preview);
      const next = buildLayout(engine, eq);
      if (next.key !== layoutKey) {
        layout = next;
        layoutKey = next.key;
        const extra = next.islands.length ? ISLAND_SKY : 0;
        if (extra !== sky) {
          sky = extra;
          H = BASE_H + sky;
          GROUND = BASE_GROUND + sky;
          view.width = 0;
        }
        const width = next.width + MARGIN * 2;
        if (width !== view.width) resize(width);
        else applyScale();
        const palette = bundle.terrains[eq.terreiro] || bundle.terrains['terra-batida'];
        terrain = buildTerrain(next.width, palette, (s.seed || 1) + next.width);
        islandTerrains = next.islands.map((id, i) => buildTerrain(ISLAND_W, palette, (s.seed || 1) + 311 * (i + 1)));
        ridge = next.tier >= 1 && next.back.length ? buildRidge(next.width) : null;
        trackArrivals(now);
      }
      regions = [];
      spots = new Map();
      view.float = Math.round(Math.sin(now / 1400));
      const fire = layout.fire;
      const flicker = 0.86 + 0.09 * Math.sin(now / 83) + 0.05 * Math.sin(now / 29 + 1.7);
      fx.light = { x: fire.x + fire.meta.w / 2, y: GROUND - fire.meta.h * 0.4,
        power: flicker * (engine.flareActive ? 1.3 : 1) * (1 - 0.3 * (fx.wx ? fx.wx.rain : 0)), reach: 60 + fire.meta.w * 1.8 };
      g.clearRect(0, 0, buffer.width, buffer.height);
      g.save();
      g.translate(0, view.float);
      // Um erro no meio do quadro não deixa o pincel torto (deslocamento, transparência, modo de mistura) para os
      // próximos: o quadro seguinte começa limpo e desenha tudo de novo.
      try {
        paint(engine, now, preview, eq);
      } finally {
        g.restore();
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
      }
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

    // Foto da festa: o céu de fundo e, embaixo, uma moldura de foto instantânea com o título e o porte (`caption`).
    // Tudo é montado no tamanho da arte e ampliado de uma vez, sem suavização.
    // `crop` ({x, y, w, h} no quadro da festa) recorta um pedaço, como o retrato do lambe-lambe; sem ele, a festa toda.
    // A foto sai sem os letreiros que voam (números dos passos, gritos, nome do passo): o último quadro é refeito limpo.
    function cleanFrame() {
      const last = fx.lastArgs;
      if (!last) return;
      fx.hideTexts = true;
      fx.lastDraw = -Infinity;
      try { draw(last.engine, last.now, last.preview); } finally { fx.hideTexts = false; }
    }

    // `raw` fica com o quadro como está na tela (letreiros e tudo), para as capturas de teste.
    function photo(scale = 4, caption = null, crop = null, raw = false) {
      if (!raw) cleanFrame();
      const area = crop || { x: 0, y: 0, w: view.width, h: H };
      const pad = 6;
      const bottom = caption ? 17 : pad;
      const art = document.createElement('canvas');
      art.width = area.w + pad * 2;
      art.height = area.h + pad + bottom;
      const p = art.getContext('2d');
      p.fillStyle = '#fdf3e0';
      p.fillRect(0, 0, art.width, art.height);
      p.fillStyle = INK;
      p.fillRect(0, 0, art.width, 1);
      p.fillRect(0, art.height - 1, art.width, 1);
      p.fillRect(0, 0, 1, art.height);
      p.fillRect(art.width - 1, 0, 1, art.height);
      p.fillStyle = INK;
      p.fillRect(pad - 1, pad - 1, area.w + 2, area.h + 2);
      const sky = p.createLinearGradient(0, pad - area.y, 0, pad - area.y + H);
      sky.addColorStop(0, '#1c1a3a');
      sky.addColorStop(0.7, '#5c4a8a');
      sky.addColorStop(1, '#e28a6e');
      p.fillStyle = sky;
      p.fillRect(pad, pad, area.w, area.h);
      p.drawImage(buffer, area.x, area.y, area.w, area.h, pad, pad, area.w, area.h);
      if (caption) {
        const words = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9+\-.,!?: ]/g, ' ');
        const line = (text, y, color) => {
          const clean = words(text).trim();
          if (clean.length * 4 - 1 > art.width - 8) return;
          let cursor = Math.round((art.width - (clean.length * 4 - 1)) / 2);
          p.fillStyle = color;
          for (const char of clean) {
            const glyph = FONT[char];
            if (glyph) for (let i = 0; i < 15; i++) if (glyph[i] === '1') p.fillRect(cursor + (i % 3), y + Math.floor(i / 3), 1, 1);
            cursor += 4;
          }
        };
        line(caption.title, area.h + pad + 3, '#7c421e');
        line(caption.subtitle, area.h + pad + 10, '#b44a0a');
      }
      const shot = document.createElement('canvas');
      shot.width = art.width * scale;
      shot.height = art.height * scale;
      const out = shot.getContext('2d');
      out.imageSmoothingEnabled = false;
      out.drawImage(art, 0, 0, shot.width, shot.height);
      return shot.toDataURL('image/png');
    }

    // Retrato do lambe-lambe: de perto, a Mandioca e o par no meio, do chapéu ao chão.
    function portrait(scale = 4, caption = null) {
      if (!layout) return photo(scale, caption);
      const hostX = layout.host.x + 12;
      const cx = layout.par ? (hostX + layout.par.x + 8) / 2 : hostX;
      const w = Math.min(view.width, 150);
      const x = Math.round(Math.max(0, Math.min(view.width - w, cx - w / 2)));
      const y = Math.max(0, GROUND - 84);
      return photo(scale, caption, { x, y, w, h: Math.min(H, GROUND + 12) - y });
    }

    function sizeInfo() {
      const dpr = root.devicePixelRatio || 1;
      const k = view.physical / dpr;
      return { width: view.width * k, height: H * k, ground: GROUND, logicalWidth: view.width,
        top: (H - contentTop() + 3) * k, physical: view.physical, base: Math.max(1, Math.round(3 * dpr)),
        capped: !!view.capped };
    }

    // Quadros por segundo: 60 com o jogo em foco (alguém olhando e clicando), menos quando ele fica de fundo. Festa
    // enorme na tela (mais de 1,8 milhão de pixels da tela a cada quadro) vai a 30 com foco e 24 de fundo: apresentar
    // tudo isso 60 vezes por segundo pesaria no computador.
    function setRate(fps) {
      rate = fps;
      updateRate();
    }

    function updateRate() {
      const area = view.width * view.physical * H * view.physical;
      const fps = Math.min(rate, area > 1.8e6 ? (rate >= 60 ? 30 : 24) : rate);
      minFrame = Math.max(0, 1000 / fps - 2);
    }

    // Clarão dos relâmpagos ligado ou desligado (Ajustes).
    function setFlash(on) { flashOn = on !== false; }
    // Menos letreiros: sem os números dos passos e sem a conversa da plateia (os avisos dos eventos continuam).
    function setCalm(on) { calm = on === true; }
    // Sonolenta: a pessoa está há muito tempo em outra janela (o app avisa); os descansos viram cochilo quase sempre.
    function setSleepy(on) { sleepy = on === true; }

    // Estado dos enfeites que vêm e vão sozinhos (para os testes e as fotos): vento (-1 a 1) e ciranda das crianças.
    function probe() { return { stove: fx.stovePos ? { ...fx.stovePos } : null, dishFly: !!fx.dishFly, compadres: fx.compadreDraw ? fx.compadreDraw.stage.kind : null, looseFlag: !!fx.looseFlag, phones: !!(fx.phones && fx.phones.at), hatFly: !!fx.hatFly, carroBoi: !!(fx.carroBoi && fx.carroBoi.at), flock: !!(fx.flock && fx.flock.at), drones: !!(fx.drones && fx.drones.at), fitas: !!(fx.fitas && fx.fitas.at), burro: fx.burroPos ? { ...fx.burroPos } : null, fotografo: fx.fotoPos ? { x: fx.fotoPos.x } : null, cobra: fx.cobra ? { x: fx.cobraX, caught: fx.cobra.caught != null, scared: fx.scared } : null, visitor: !!fx.visitorPos, bichos: fx.bichosUntil || 0, kombi: !!(fx.kombi && fx.kombi.on), sticker: fx.sticker && fx.sticker.key, cold: fx.cold, announce: fx.announce && fx.announce.text, look: fx.look && fx.look.kind, leilao: fx.leilaoPos && { ...fx.leilaoPos, sold: !!fx.leilao.sold }, saco: fx.sacoPos && { ...fx.sacoPos, exit: !!fx.saco.exit }, chase: fx.dog.plan === 'chase', rest: fx.restKind, wind: fx.windNow, ring: !!fx.ring, particles: fx.particles.length, texts: fx.texts.length, stepTexts: fx.texts.filter(item => item.step).length, arrivals: fx.arrivals.size, moodSaid: fx.moodSaid || null, hen: fx.hen.x === undefined ? null : { x: fx.hen.x, dir: fx.hen.dir }, chicks: fx.chicks.map(({ x, dir, walking }) => ({ x, dir, walking })) }; }

    // A pessoa voltou para a festa depois de um tempo fora: a Mandioca dá um pulinho, faz o olhar felizinho e cumprimenta.
    const GREETINGS = 4;
    function greet(now = root.performance?.now?.() || 0) {
      if (!layout) return;
      fx.look = { kind: 'feliz', until: now + 1600 };
      fx.celebrateUntil = now + 900;
      fx.jumpUntil = now + 300;
      say(tr(`fx.oi.${Math.floor(rng() * GREETINGS)}`), layout.host.x + 12, GROUND - Math.round(58 * fx.scale) - 6, now, '#fff07a', 1800, 8);
    }

    // Partida nova: a Mandioca brota da terra (a abertura do jogo).
    function sprout(now = root.performance?.now?.() || 0) { fx.sprout = now; }

    // Só para o gravador de vídeos (trailer/captura): começa agora um evento que a festa sorteia sozinha (drones, dança
    // das fitas, compadres, carro de boi), já `idade` ms adiantado, para ele cair no compasso da música. `ordem` escolhe
    // as cinco formas do show de drones (índices de DRONE_SHAPES).
    function provocar(kind, { idade = 0, ordem = null, lado = 1 } = {}) {
      const at = (fx.lastDraw || 0) - idade;
      if (kind === 'drones') fx.drones = { at, next: 0, said: idade > DRONE_MOVE, viva: false, order: ordem || [0, 1, 2, 3, 4] };
      else if (kind === 'fitas') fx.fitas = { at, next: 0, said: false };
      else if (kind === 'compadres') fx.compadre = { at, next: 0, said: -1, witnessed: false, ended: false };
      else if (kind === 'carroBoi') fx.carroBoi = { at, next: 0, dir: lado };
      // A Mandioca pede comida ou carinho no próximo quadro (se a Barriga ou o Amor estiverem baixos).
      else if (kind === 'fome' || kind === 'carente') { fx.moodAt = 1; fx.moodForce = kind; fx.moodLine = ordem; }
      // Qual descanso ela faz agora (ofega, abana, alonga...): o sorteio do jogo pode cair num que não combina com a cena.
      else if (kind === 'descanso') fx.restKind = ordem || 'ofega';
      else return false;
      return true;
    }

    return { draw, reset, setScale, setRate, setFlash, setCalm, setSleepy, hit, onEvents, celebrate, poke, photo, portrait, areas, probe, sprout, greet, moonPhase, estalo: throwEstalo, size: sizeInfo, provocar };
  }

  root.ArraiaFesta = { create, terrainWidth, amount, pixelText, withPreview };
})(typeof globalThis !== 'undefined' ? globalThis : this);
