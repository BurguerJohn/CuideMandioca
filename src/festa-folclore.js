// As visitas do folclore na festa: 20 eventos em que uma criatura da Mata Encantada passa, aparece ou desfila pelo cenário e quem clicar nela
// pega o prêmio (o motor é src/mini-folclore.js, os dados estão em `data.minis.folclore`). A arte das criaturas é a da própria Mata (duas
// quadros cada, olhando para a esquerda); o resto (pegadas, caldeirão, lua, poça, fedor, fogo) é desenhado aqui com retângulos.
// Cada quadro da festa chama `update` (calcula a pose de agora) e depois `draw` em três camadas: 'back' (atrás da plateia), 'mid' (atrás da
// fogueira) e 'front' (na frente de tudo). `ctx` traz as ferramentas da festa (sprite, sombra, brilho, falas, partículas, regiões clicáveis).
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const smooth = value => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };
  // Cada criatura tem a sua cor de brilho (halo, fagulha) e o ritmo de batida de asa/passo (ms por quadro).
  const GLOW = { luzinha: '#27c0d8', boto: '#ff4f9e', veado: '#fffff0', pisadeira: '#9d5cf0', boitata: '#ff8a12', mula: '#ff8a12', cuca: '#9ef05a',
    mapinguari: '#9ef05a', boiuna: '#ffd21e', lobisomem: '#fffff0', iara: '#3fd6f0', caipora: '#ffac2a' };

  function create(ctx) {
    const { bundle, g, sprite, spriteCut, shadow, halo, say, float, confetti, dust, sound, region, rng, fx, layout, ground, poleTop } = ctx;
    const { tr = key => key, ringFx = () => {}, starBurst = () => {}, impact = () => {}, sayBig = say } = ctx;
    let cur = null;           // a visita que está sendo desenhada: { key, items, ... }

    // A arte da criatura: { meta, base, w, h } (`base` é o primeiro dos dois quadros).
    function spriteOf(id) {
      const set = bundle.janelas && bundle.janelas.mata;
      if (!set) return null;
      for (const key of ['comuns', 'chefes']) {
        const meta = set[key];
        const index = meta ? meta.ids.indexOf(id) : -1;
        if (index >= 0) return { meta, base: index * 2, w: meta.w, h: meta.h };
      }
      return null;
    }

    const particle = p => fx().particles.push(p);
    const disc = (cx, cy, r, color) => {
      g.fillStyle = color;
      for (let y = -r; y <= r; y++) {
        const half = Math.round(Math.sqrt(r * r - y * y));
        g.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
      }
    };
    // Anel achatado (ondinha na água, poça): pontos no contorno de uma elipse.
    const ring = (cx, cy, rx, ry, color, alpha = 1) => {
      g.globalAlpha = alpha;
      g.fillStyle = color;
      const n = Math.max(12, Math.round(rx * 3));
      for (let i = 0; i < n; i++) g.fillRect(Math.round(cx + Math.cos(i / n * TAU) * rx), Math.round(cy + Math.sin(i / n * TAU) * ry), 1, 1);
      g.globalAlpha = 1;
    };
    // Uma figura de pixels: cada linha é um texto, e cada letra aponta para uma cor da paleta (`.` não pinta).
    const shape = (rows, x, y, palette, alpha = 1) => {
      g.globalAlpha = alpha;
      rows.forEach((row, dy) => [...row].forEach((c, dx) => {
        if (palette[c]) { g.fillStyle = palette[c]; g.fillRect(Math.round(x + dx), Math.round(y + dy), 1, 1); }
      }));
      g.globalAlpha = 1;
    };

    const CAULDRON = ['..oooooooo..', '.oBBBBBBBBo.', 'ooggggggggoo', 'oBBBBBBBBBBo', 'oBBBBBBBBBBo', '.oBBBBBBBBo.', '..oooooooo..', '.l........l.'];
    const CAULDRON_COLORS = { o: '#6a6478', B: '#2a2430', g: '#7ae040', l: '#2a2430' };
    const FOOT = ['11', '1.'];

    // O quanto a criatura anda sem passar por cima da Mandioca (o chefe de 52 px cobriria ela inteira).
    function clearOfHost(x, w) {
      const lay = layout();
      const from = lay.host.x - 8;
      const to = lay.host.x + (lay.par ? 52 : 36);
      if (x + w <= from || x >= to) return x;
      return (x + w / 2 < (from + to) / 2) ? from - w : to;
    }

    // --- A pose de cada visita -------------------------------------------------------------------------------------------------
    // Cada função devolve os desenhos do quadro (`items`): { layer, z, run(now) } (z: 0 atrás da criatura, 1 ela, 2 por cima).
    function build(engine, entry, a, now) {
      const lay = layout();
      const G = ground();
      const L = lay.L;
      const R = lay.R;
      const span = R - L;
      const t = engine.now() - a.born;
      const dur = entry.seconds * 1000;
      const p = clamp(t / dur, 0, 1);
      const caught = a.done;
      const leaving = caught ? clamp((engine.now() - a.doneAt) / Math.max(1, engine.data.minis.folclore.exit), 0, 1) : 0;
      const items = [];
      const st = cur;
      const sp = entry.creature ? spriteOf(entry.creature) : null;
      if (entry.creature && !sp) return items;
      const w = sp ? sp.w : 0;
      const h = sp ? sp.h : 0;
      const dir = a.dir;
      const frame = (rate, phase = 0) => sp.base + (Math.floor((t + phase) / rate) % 2);
      // Quanto aparece (some devagar depois do clique e nas pontas das visitas que ficam no lugar).
      const fade = (edge = 900) => Math.min(smooth(t / edge), smooth((dur - t) / edge)) * (1 - leaving);
      const crossX = (q, width = w) => (dir > 0 ? L - width + q * (span + width) : R - q * (span + width));
      const flipOf = dir > 0;
      const every = (key, ms) => { if (now >= (st[key] || 0)) { st[key] = now + ms; return true; } return false; };
      const clickable = !caught && t < dur;

      // Um bicho de pé no chão: sombra, quadro, região do clique. `o`: alpha, cut (rise), layer, flip, shake.
      const standing = (x, y, o = {}) => {
        st.head = { x: x + w / 2, y };
        items.push({ layer: o.layer || 'front', z: 1, run() {
        const alpha = o.alpha === undefined ? 1 - leaving : o.alpha;
        if (alpha <= 0.02) return;
        g.globalAlpha = alpha;
        if (o.shadow !== false) shadow(x + w / 2, Math.max(8, w - 8), 0.8 * alpha);
        // Esperando o clique, um brilho pulsando em volta ajuda a achar a criatura no meio da plateia.
        if (clickable && alpha > 0.35 && o.halo !== false) halo(x + w / 2, y + h / 2, Math.round(Math.max(w, h) * 0.6), GLOW[entry.id] || '#fff07a', (0.1 + 0.05 * Math.sin(now / 240)) * alpha);
        const fx0 = Math.round(x + (o.shake ? Math.round(Math.sin(now / 35) * o.shake) : 0));
        const flip = o.flip === undefined ? flipOf : o.flip;
        if (o.cut !== undefined) spriteCut(sp.meta, o.frame ?? frame(240), fx0, y + (h - o.cut), flip, o.cut);
        else sprite(sp.meta, o.frame ?? frame(240), fx0, y, flip);
        g.globalAlpha = 1;
        if (clickable && alpha > 0.35) {
          const visible = o.cut === undefined ? h : o.cut;
          region('folclore', x - 2, y + h - visible - 3, w + 4, visible + 6);
        }
        } });
      };
      const under = (layer, draw) => items.push({ layer, z: 0, run: draw });
      const over = (layer, draw) => items.push({ layer, z: 2, run: draw });
      const baseY = G - h + 2;

      switch (entry.id) {
        case 'luzinha': {
          // O fogo-fátuo voa em ondas pelo alto da festa, deixando um rastro de faíscas azuis.
          const x = crossX(p);
          const y = G - h - 38 - Math.sin(p * TAU * 3) * 13 - Math.sin(t / 310) * 2;
          under('front', () => halo(x + w / 2, y + h / 2, 15, GLOW.luzinha, (0.28 + 0.1 * Math.sin(t / 140)) * (1 - leaving)));
          standing(x, y, { shadow: false, frame: sp.base + (Math.floor(t / 200) % 2) });
          if (every('spark', 120)) float('brilho', x + w / 2 - dir * 6, y + h - 4, now, ['#9ffff0', '#27c0d8']);
          break;
        }
        case 'mao': {
          // A mão rasteja aos arrancos: anda um pouco, para, anda de novo, olhando em volta.
          const steps = 8;
          const q = (Math.floor(p * steps) + smooth(p * steps % 1 * 2)) / steps;
          const x = crossX(Math.min(1, q));
          const moving = (p * steps) % 1 < 0.5;
          standing(x, baseY, { frame: sp.base + (moving ? Math.floor(t / 110) % 2 : 0) });
          if (moving && every('dust', 160)) dust(x + w / 2 - dir * 6, G, now);
          break;
        }
        case 'cuia': {
          // A cuia rola pulando: cada pulo levanta poeira, e o rosto de abóbora balança de um lado para o outro.
          const x = crossX(p);
          const hop = Math.abs(Math.sin(p * TAU * 5.5));
          const y = baseY - hop * 9;
          standing(x, y, { frame: sp.base + (hop > 0.5 ? 1 : 0) });
          if (hop < 0.1 && every('land', 260)) { dust(x + w / 2, G, now); dust(x + w / 2 + 4, G, now); }
          break;
        }
        case 'boto': {
          // O boto de chapéu aparece na pista de dança, balança e solta corações cor-de-rosa.
          const lo = lay.danceLeft + 4;
          const hi = Math.max(lo, lay.danceRight - w - 4);
          const x = clearOfHost(clamp(lo + (hi - lo) * (0.15 + 0.7 * a.at), lo, hi), w);
          const sway = Math.round(Math.sin(t / 380) * 2);
          const y = baseY - Math.abs(Math.sin(t / 420)) * 2;
          under('front', () => halo(x + w / 2 + sway, y + h / 2, 18, GLOW.boto, 0.2 * fade()));
          standing(x + sway, y, { alpha: fade(), flip: dir > 0 });
          if (every('heart', 520)) float('coracao', x + w / 2 + (rng() - 0.5) * 14, y - 2, now, ['#ff4f9e', '#ff8aa8']);
          break;
        }
        case 'veado': {
          // O veado branco dá saltos largos pela festa; onde pisa, nasce um brilho branco.
          const x = crossX(p);
          const leap = 5;
          const phase = p * leap % 1;
          const y = baseY - Math.sin(phase * Math.PI) * 18;
          const lap = Math.floor(p * leap);
          under('front', () => halo(x + w / 2, y + h / 2, 17, GLOW.veado, 0.14 * (1 - leaving)));
          standing(x, y, { frame: sp.base + (phase > 0.15 && phase < 0.85 ? 1 : 0) });
          if (lap !== st.lap && p < 1) {
            st.lap = lap;
            for (let i = 0; i < 2; i++) float('brilho', x + w / 2 + (i ? 7 : -7), G - 8, now, ['#ffffff', '#cfe8ff']);
            dust(x + w / 2, G, now);
          }
          break;
        }
        case 'boi': {
          // O boi da cara preta atravessa devagar, a "cantiga de ninar" sobe em notas e a meninada se assusta quando ele passa.
          const x = crossX(p);
          standing(x, baseY, { frame: frame(380) });
          if (every('note', 640)) float('nota', x + w / 2, baseY - 2, now, ['#fff4e4', '#c8b8a0']);
          if (every('scare', 900) && !caught) { fx().startle = { x: x + w / 2, until: now + 420 }; }
          if (every('step', 420)) dust(x + w / 2 - dir * 8, G, now);
          break;
        }
        case 'pisadeira': {
          // A Pisadeira empoleirada no topo do mastro, tremendo, com um brilho roxo, olhando a festa lá de cima.
          const poleX = dir < 0 ? L - 3 : R + 1;
          const x = clamp(poleX - w / 2, 0, lay.R + 16 - w);
          const y = poleTop() - h + 10 + Math.round(Math.sin(t / 260) * 1.5);
          under('front', () => halo(x + w / 2, y + h / 2, 19, GLOW.pisadeira, 0.22 * fade()));
          standing(x, y, { alpha: fade(), shake: caught ? 0 : 1, shadow: false, flip: dir > 0, frame: frame(300) });
          if (every('boo', 700)) float('brilho', x + w / 2 + (rng() - 0.5) * 18, y + 4, now, ['#d9b8ff', '#9d5cf0']);
          break;
        }
        case 'saco': {
          // O homem do saco vem arrastando os pés; a meninada corre, e quando o saco cai solta uma chuva de fichas.
          const x = crossX(p);
          standing(x, baseY - (Math.floor(t / 260) % 2 ? 1 : 0), { frame: frame(330) });
          if (every('scare', 450) && !caught) fx().startle = { x: x + w / 2, until: now + 420 };
          if (every('step', 380)) dust(x + w / 2 - dir * 6, G, now);
          if (caught && !st.dropped) {
            st.dropped = true;
            for (let i = 0; i < 8; i++) float('brilho', x + 6 + rng() * (w - 8), baseY + 6, now, ['#ffd21e', '#fff07a']);
          }
          break;
        }
        case 'seco': {
          // O corpo-seco fica parado, rangendo; folhas secas caem em volta e, no clique, ele vira uma nuvem de pó.
          const lo = L + 14;
          const hi = Math.max(lo, R - w - 14);
          const x = clearOfHost(clamp(lo + (hi - lo) * (0.1 + 0.8 * a.at), lo, hi), w);
          const dry = caught ? 1 - leaving : fade();
          standing(x, baseY, { alpha: dry, shake: caught ? 0 : 0.6, flip: dir > 0, frame: frame(520) });
          if (every('leaf', 260)) particle({ x: x + 2 + rng() * (w - 4), y: baseY - 4, vx: (rng() - 0.5) * 0.012, vy: 0.012 + rng() * 0.01, born: now, ttl: 1100,
            colors: ['#b0803a', '#7c5a20'], wobble: rng() * 6 });
          if (caught && !st.dust) {
            st.dust = true;
            for (let i = 0; i < 9; i++) particle({ x: x + w / 2 + (rng() - 0.5) * w, y: baseY + h * (0.3 + 0.6 * rng()), vx: (rng() - 0.5) * 0.02, vy: -0.006 - rng() * 0.01, born: now, ttl: 900 + rng() * 500, smoke: true });
          }
          break;
        }
        case 'curupira': {
          // O Curupira anda de frente, mas as pegadas dele apontam para trás: quem segue o rastro anda em círculos.
          const x = crossX(p);
          const stride = 15;
          const walked = Math.abs(x - crossX(0));
          const count = Math.floor(walked / stride);
          st.prints = st.prints || [];
          while (st.prints.length < count) {
            const n = st.prints.length;
            st.prints.push({ x: crossX(0) + dir * (n * stride + w / 2) + 0, y: G + 1 + (n % 2 ? 2 : -1), at: now, dir });
          }
          standing(x, baseY - Math.abs(Math.sin(t / 170)) * 1.5, { frame: frame(220) });
          over('front', () => {
            for (const print of st.prints) {
              const age = now - print.at;
              const alpha = clamp(1 - Math.max(0, age - 9000) / 6000, 0, 1) * (1 - leaving * 0.5);
              if (alpha <= 0) continue;
              // A ponta dos dedos fica do lado de onde ele veio.
              g.globalAlpha = alpha;
              g.fillStyle = '#2e1812';
              g.fillRect(print.x - (print.dir > 0 ? 3 : 1), print.y + 1, 5, 3);
              g.fillStyle = '#f0d8a0';
              g.fillRect(print.x - (print.dir > 0 ? 2 : 0), print.y + 1, 3, 2);
              g.fillStyle = '#fff4e4';
              g.fillRect(print.x + (print.dir > 0 ? -2 : 2), print.y + 1, 1, 1);
              g.globalAlpha = 1;
            }
          });
          if (every('sparkle', 700)) float('brilho', x + w / 2, baseY, now, ['#ffac2a', '#ff5a1e']);
          break;
        }
        case 'caipora': {
          // A Caipora passa a galope no porco-do-mato, deixando poeira e brasinha do fumo para trás.
          const x = crossX(p);
          const y = baseY - Math.abs(Math.sin(t / 95)) * 4;
          standing(x, y, { frame: frame(110) });
          if (every('dust', 70)) dust(x + w / 2 - dir * 16, G, now);
          if (every('ember', 140)) particle({ x: x + w / 2 + dir * 4, y: y + 6, vx: -dir * 0.02, vy: -0.01, gravity: 0.00004, born: now, ttl: 520, ember: true });
          break;
        }
        case 'iara': {
          // A Iara sobe de uma poça d'água, canta (notas azuis) e a poça faz ondinhas.
          const lo = L + 20;
          const hi = Math.max(lo, R - w - 20);
          const x = clearOfHost(clamp(lo + (hi - lo) * (0.1 + 0.8 * a.at), lo, hi), w);
          const rise = smooth(t / 2200) * (1 - smooth((t - (dur - 2000)) / 1800)) * (caught ? 1 - leaving : 1);
          const cx = x + w / 2;
          under('front', () => {
            const pool = clamp(rise * 1.6, 0, 1);
            g.globalAlpha = 0.85 * pool;
            g.fillStyle = '#2a6aa8';
            g.fillRect(Math.round(cx - 17 * pool), G + 1, Math.round(34 * pool), 2);
            g.fillStyle = '#6ec8ff';
            g.fillRect(Math.round(cx - 12 * pool), G + 1, Math.round(24 * pool), 1);
            g.globalAlpha = 1;
            for (let i = 0; i < 2; i++) ring(cx, G + 2, 6 + ((t / 90 + i * 9) % 18), 1.2, '#a8e4ff', 0.7 * (1 - ((t / 90 + i * 9) % 18) / 18) * pool);
            halo(cx, G - h / 2, 20, GLOW.iara, 0.16 * rise);
          });
          standing(x, baseY, { cut: Math.max(1, h * rise), alpha: 1, flip: dir > 0, frame: frame(520), shadow: false });
          if (rise > 0.85 && every('song', 560)) float('nota', cx + (rng() - 0.5) * 24, baseY + 2, now, ['#a8e4ff', '#3fd6f0']);
          break;
        }
        case 'boitata': {
          // A cobra de fogo dá voltas em volta da fogueira: passa por trás (atrás das chamas) e por diante, soltando brasas.
          const center = lay.fire.x + lay.fire.meta.w / 2;
          const rx = Math.min(span / 2 - w / 2 - 4, lay.fire.meta.w / 2 + w / 2 + 14);
          const angle = p * TAU * 2.4 * dir;
          const x = clamp(center + Math.cos(angle) * rx - w / 2, L, R - w);
          const depth = Math.sin(angle);
          const y = baseY + 6 - depth * 4;
          const moveRight = -Math.sin(angle) * dir > 0;
          const layer = depth < 0 ? 'mid' : 'front';
          under(layer, () => halo(x + w / 2, y + h / 2, 22, GLOW.boitata, 0.22 * (1 - leaving)));
          standing(x, y, { layer, frame: frame(150), flip: moveRight });
          if (every('ember', 110)) particle({ x: x + w / 2 + (moveRight ? -14 : 14), y: y + h * 0.55, vx: (rng() - 0.5) * 0.02, vy: -0.012 - rng() * 0.01, gravity: 0.00003, born: now, ttl: 600, ember: true });
          break;
        }
        case 'mula': {
          // A mula-sem-cabeça passa em disparada, com o fogo no lugar da cabeça e faíscas de ferradura no chão.
          const x = crossX(p);
          const y = baseY - Math.abs(Math.sin(t / 80)) * 5;
          under('front', () => halo(x + (dir > 0 ? w - 12 : 12), y + 8, 12, GLOW.mula, 0.3 * (1 - leaving)));
          standing(x, y, { frame: frame(90) });
          if (every('dust', 60)) dust(x + w / 2 - dir * 14, G, now);
          if (every('spark', 90)) particle({ x: x + w / 2 - dir * 10, y: G - 1, vx: -dir * 0.015, vy: -0.016 - rng() * 0.01, gravity: 0.00005, born: now, ttl: 420, ember: true });
          break;
        }
        case 'lobisomem': {
          // O lobisomem fica num morrinho lá no fundo, com a lua cheia atrás dele, uivando: a plateia estremece.
          const lo = L + 6;
          const hi = Math.max(lo, R - w - 6);
          const x = dir > 0 ? lo : hi;
          const y = G - h - 48;
          const alpha = fade(1400);
          under('back', () => {
            g.globalAlpha = alpha;
            const mx = x + w / 2 + (dir > 0 ? 6 : -6);
            halo(mx, y + 6, 26, '#fffff0', 0.22 * alpha);
            disc(mx, y + 4, 10, '#fffff0');
            disc(mx - 3, y + 2, 2, '#e8e8d0');
            disc(mx + 3, y + 7, 1, '#e8e8d0');
            // O morrinho em que ele está.
            g.fillStyle = '#17432d';
            g.fillRect(Math.round(x - 8), Math.round(y + h - 3), w + 16, 6);
            g.fillRect(Math.round(x - 2), Math.round(y + h - 5), w + 4, 3);
            g.globalAlpha = 1;
          });
          const howl = Math.floor(t / 1800) % 2;
          standing(x, y, { layer: 'back', alpha, shadow: false, flip: dir > 0, frame: sp.base + howl });
          if (howl && every('howl', 700) && !caught) { fx().startle = { x: x + w / 2, until: now + 380 }; float('brilho', x + w / 2, y - 2, now, ['#ffffff', '#cfe8ff']); }
          break;
        }
        case 'cuca': {
          // A Cuca mexe o caldeirão do lado da fogueira: bolhas verdes sobem e o clique serve uma poção sorteada.
          const side = dir < 0 ? lay.fire.x - w - 24 : lay.fire.x + lay.fire.meta.w + 24;
          const x = clearOfHost(clamp(side, L + 2, R - w - 28), w);
          const potX = Math.round(dir < 0 ? x + w + 1 : x - 13);
          const alpha = fade();
          under('front', () => {
            g.globalAlpha = alpha;
            halo(potX + 6, G - 8, 14, GLOW.cuca, 0.24 * alpha);
            // O fogo embaixo e o caldeirão.
            for (let i = 0; i < 3; i++) {
              g.fillStyle = i === 1 ? '#fff07a' : '#ff8a12';
              g.fillRect(potX + 2 + i * 3, G - 2 - ((Math.floor(t / 120) + i) % 2), 2, 2 + ((Math.floor(t / 120) + i) % 2));
            }
            shape(CAULDRON, potX, G - 10, CAULDRON_COLORS, alpha);
            g.globalAlpha = 1;
          });
          standing(x, baseY, { alpha, flip: dir < 0, frame: frame(380) });
          if (every('bubble', 240)) particle({ x: potX + 2 + rng() * 8, y: G - 11, vx: (rng() - 0.5) * 0.006, vy: -0.016 - rng() * 0.008, born: now, ttl: 900, colors: ['#c8f58a', '#7ae040', '#35a03a'] });
          break;
        }
        case 'mapinguari': {
          // O gigante caminha devagar pelo meio da festa: o fedor (uma nuvem verde) vai na frente e a plateia leva a mão ao nariz.
          const x = crossX(p);
          standing(x, baseY - Math.abs(Math.sin(t / 380)) * 2, { frame: frame(520) });
          under('front', () => {
            for (let i = 0; i < 4; i++) halo(x + w / 2 + Math.sin(t / 700 + i * 1.7) * 20, baseY + 6 + Math.cos(t / 640 + i) * 6 - i * 7, 15, GLOW.mapinguari, 0.2 * (1 - leaving));
          });
          if (every('stink', 220)) particle({ x: x + 6 + rng() * (w - 12), y: baseY + 14, vx: (rng() - 0.5) * 0.01, vy: -0.01 - rng() * 0.006, born: now, ttl: 1100, colors: ['#c8f58a', '#9ef05a', '#35a03a'], wobble: rng() * 6 });
          if (every('scare', 600) && !caught) fx().startle = { x: x + w / 2, until: now + 420 };
          if (every('step', 700)) dust(x + w / 2 - dir * 10, G, now);
          break;
        }
        case 'boiuna': {
          // A cobra grande sobe devagar do chão e balança com os olhos brilhando como lanternas, e depois afunda.
          const lo = L + 24;
          const hi = Math.max(lo, R - w - 24);
          const x = clearOfHost(clamp(lo + (hi - lo) * (0.1 + 0.8 * a.at), lo, hi), w);
          const rise = smooth(t / 2600) * (1 - smooth((t - (dur - 2400)) / 2200)) * (caught ? 1 - leaving : 1);
          const sway = Math.round(Math.sin(t / 420) * 2);
          const cx = x + w * 0.62;
          under('front', () => {
            ring(x + w / 2, G + 2, 12 + (t / 140) % 10, 1.5, '#1c2f8a', 0.6 * rise);
            if (rise > 0.8) {
              const pulse = 0.35 + 0.2 * Math.sin(t / 160);
              halo(cx + sway - 3, G - h * rise + 8, 7, GLOW.boiuna, pulse);
              halo(cx + sway + 3, G - h * rise + 8, 7, GLOW.boiuna, pulse);
            }
          });
          standing(x + sway, baseY, { cut: Math.max(1, h * rise), alpha: 1, flip: dir > 0, frame: frame(480), shadow: false });
          if (rise > 0.8 && every('drip', 520)) float('brilho', cx, G - h * rise + 6, now, ['#ffd21e', '#fff07a']);
          break;
        }
        case 'bumba': {
          // O boi-bumbá dança pulando no meio da pista, a plateia faz a ola e o confete não para.
          const lo = lay.danceLeft + 6;
          const hi = Math.max(lo, lay.danceRight - w - 6);
          const x = clearOfHost(clamp(lo + (hi - lo) * (0.3 + 0.4 * a.at), lo, hi), w);
          const bounce = Math.abs(Math.sin(t / 240));
          standing(x, baseY - bounce * 9, { alpha: fade(1200), flip: Math.floor(t / 1200) % 2 === 0, frame: bounce > 0.5 ? sp.base + 1 : sp.base });
          if (every('confetti', 1500) && !caught) confetti(now, x + w / 2, baseY - 4, 10);
          if (every('wave', 7000) && !caught) fx().wave = { at: now, dir: rng() < 0.5 ? 1 : -1 };
          if (every('note', 600)) float('nota', x + w / 2 + (rng() - 0.5) * 30, baseY - 6, now, [['#ee2f3c', '#ffd21e', '#3a6cf0'][Math.floor(rng() * 3)], '#fff4e4']);
          break;
        }
        case 'desfile': {
          // O desfile: as criaturas que a Mandioca já enfrentou atravessam a festa em fila, de bandeirinha, com notas e confete.
          const cast = (a.cast && a.cast.length ? a.cast : []).map(spriteOf).filter(Boolean);
          const gap = 0.07;
          const travel = 1 - Math.max(0, cast.length - 1) * gap;
          cast.forEach((c, i) => {
            const q = clamp((p - i * gap) / travel, 0, 1);
            if (q <= 0 || q >= 1) return;
            const x = dir > 0 ? L - c.w + q * (span + c.w) : R - q * (span + c.w);
            const y = G - c.h + 2 - Math.abs(Math.sin(t / 220 + i * 1.3)) * 4;
            if (i === 0 || !st.head) st.head = { x: x + c.w / 2, y };
            items.push({ layer: 'front', z: 1, run() {
              const alpha = 1 - leaving;
              if (alpha <= 0.02) return;
              g.globalAlpha = alpha;
              shadow(x + c.w / 2, Math.max(8, c.w - 8), 0.7 * alpha);
              sprite(c.meta, c.base + (Math.floor((t + i * 90) / 220) % 2), Math.round(x), Math.round(y), dir > 0);
              g.globalAlpha = 1;
              if (clickable) region('folclore', x - 2, y - 3, c.w + 4, c.h + 6);
            } });
            if (i % 3 === 0 && every(`note${i}`, 900 + i * 40)) float('nota', x + c.w / 2, y - 2, now, [['#ee2f3c', '#ffd21e', '#35a03a', '#3a6cf0'][i % 4], '#fff4e4']);
          });
          if (every('confetti', 2400) && !caught) confetti(now, L + span * (0.2 + 0.6 * rng()), G - 40, 12);
          if (every('wave', 9000) && !caught) fx().wave = { at: now, dir };
          break;
        }
        default: break;
      }
      return items;
    }

    // --- Um quadro ---------------------------------------------------------------------------------------------------------------
    function update(engine, now) {
      const folclore = engine.state.minis && engine.state.minis.folclore;
      const a = folclore && folclore.active;
      if (!a || !layout()) { cur = null; return; }
      const entry = engine.data.minis.folclore.events.find(item => item.id === a.id);
      if (!entry) { cur = null; return; }
      const key = `${a.id}:${a.born}`;
      if (!cur || cur.key !== key) {
        cur = { key, said: now + 700, caught: false, items: [], head: null };
        sound(entry.sound || SOUNDS[entry.id] || 'aviso');
      }
      const st = cur;
      st.items = build(engine, entry, a, now);
      // O grito da criatura sobe de cima da cabeça dela, logo que chega e de tempos em tempos.
      if (!a.done && st.head && now >= st.said) {
        st.said = now + 9000;
        say(entry.say, st.head.x, st.head.y - 4, now, '#fff07a', 1800, 6);
        // Cada grito abre um aro suave na cor da criatura (e quem passou longe percebe de onde veio).
        ringFx(st.head.x, st.head.y + 8, now, GLOW[a.id] || '#fff07a', 24, 700);
      }
      // O clique: confete e fagulhas onde ela estava.
      if (a.done && !st.caught) {
        st.caught = true;
        sound('premio');
        if (st.head) {
          confetti(now, st.head.x, st.head.y + 10, 18);
          for (let i = 0; i < 4; i++) float('brilho', st.head.x + (i - 1.5) * 8, st.head.y + 14, now, ['#ffd21e', '#fff07a']);
          // Pegou: dois anéis (da cor da criatura e branco), uma chuva de faíscas, o letreiro grande e um solavanco na festa.
          const tint = GLOW[a.id] || '#ffd21e';
          ringFx(st.head.x, st.head.y + 12, now, tint, 32, 580, 3);
          ringFx(st.head.x, st.head.y + 12, now, '#fff8e8', 20, 420);
          starBurst(st.head.x, st.head.y + 12, now, [tint, '#fffff0', '#ffd21e', '#ffffff'], 20, 0.055);
          sayBig(tr('fx.folcloreCatch'), st.head.x, Math.max(14, st.head.y - 10), now, '#9ef05a', 1500, 8);
          impact(1.1, 340, now);
        }
      }
    }

    function draw(layer, engine, now) {
      if (!cur) return;
      const list = cur.items.filter(item => item.layer === layer).sort((x, y) => x.z - y.z);
      for (const item of list) item.run(now, engine);
    }

    function reset() { cur = null; }

    function probe() { return cur ? { key: cur.key, items: cur.items.length, caught: cur.caught, head: cur.head ? { ...cur.head } : null } : null; }

    return { update, draw, reset, probe };
  }

  // O som da chegada de cada visita (src/som.js).
  const SOUNDS = { luzinha: 'brilho', mao: 'assobio', cuia: 'pulo', boto: 'canto', veado: 'assobio', boi: 'boi', pisadeira: 'assobio', saco: 'aviso',
    seco: 'fedor', curupira: 'assobio', caipora: 'galope', iara: 'canto', boitata: 'chama', mula: 'galope', lobisomem: 'uivo', cuca: 'bolha',
    mapinguari: 'fedor', boiuna: 'brilho', bumba: 'quadrilha', desfile: 'quadrilha' };

  root.ArraiaFestaFolclore = { create, SOUNDS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
