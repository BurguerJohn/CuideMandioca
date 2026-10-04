// Base das janelas extras da festa (src/janela-<id>.js): o canvas em pixels de arte ampliado por um fator inteiro (CSS com
// image-rendering: pixelated), as imagens do pacote, as partículas (notas, corações, estrelas...), as falas em pixel e as
// áreas clicáveis. Cada janela só desenha a cena dela e diz o que cada área faz.
(function (root) {
  'use strict';

  const TEXT_COLORS = ['#fff8e8', '#ffe27a', '#9ef05a', '#8ed6ff', '#ffb0c8'];
  const SAY_MS = 1900;
  const hash = (a, b) => (Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 17, 0xc2b2ae35)) >>> 0;
  const tr = (key, vars) => (root.ArraiaI18n ? root.ArraiaI18n.t(key, vars) : key);

  // Como cada tipo de partícula se mexe (as imagens saem da folha `bundle.casa.fx`).
  function particleState(p, now) {
    const t = (now - p.born) / 1000;
    switch (p.kind) {
      case 'nota': case 'nota2': return { x: p.x + Math.sin(t * 4 + p.born) * 3, y: p.y - t * 11, life: 1.8, alpha: 1 - t / 1.8 };
      case 'zzz': return { x: p.x + t * 5, y: p.y - t * 7, life: 2.2, alpha: 1 - t / 2.2 };
      case 'vapor': return { x: p.x + Math.sin(t * 3 + p.born) * 2, y: p.y - t * 9, life: 1.5, alpha: 0.85 - t / 1.8 };
      case 'bolha': return { x: p.x + Math.sin(t * 5 + p.born) * 2, y: p.y - t * 10, life: 1.4, alpha: 1 - t / 1.4 };
      case 'gota': return { x: p.x - t * 4, y: p.y + t * t * 26, life: 0.75, alpha: 1 - t / 0.75 };
      case 'coracao': return { x: p.x + Math.sin(t * 4) * 3, y: p.y - t * 11, life: 1.6, alpha: 1 - t / 1.6 };
      case 'poeira': return { x: p.x + (p.dx || 0) * t * 10, y: p.y - t * 4, life: 1.0, alpha: 0.9 - t };
      case 'exclama': return { x: p.x, y: p.y - t * 4, life: 0.9, alpha: 1 - t / 0.9 };
      case 'faisca': return { x: p.x + ((p.born % 7) - 3) * 4 * t, y: p.y - 9 * t + 34 * t * t, life: 0.65, alpha: 1 - t / 0.65 };
      case 'fumaca': return { x: p.x + Math.sin(t * 2 + p.born) * 3, y: p.y - t * 7, life: 1.9, alpha: 0.8 - t / 2.4 };
      case 'pipoca': return { x: p.x + ((p.born % 5) - 2) * 4 * t, y: p.y - 15 * t + 28 * t * t, life: 0.95, alpha: 1 - t / 1.2 };
      case 'neve': return { x: p.x + Math.sin(t * 3 + p.born) * 3, y: p.y + t * 9, life: 1.9, alpha: 1 - t / 1.9 };
      default: return { x: p.x, y: p.y - t * 2, life: 0.8, alpha: Math.abs(Math.sin(t * 8)) * (1 - t / 0.8) };
    }
  }

  // Os efeitos de feedback e de ambiente de um canvas (tremida, clarão, anéis, farelo, números, painéis, luzes, vagalumes...). `ctx`: { view:
  // {width, height, physical}, canvas, text(valor, cx, y, cor, alpha, escala), hit(x, y) opcional (as áreas clicáveis, para a mira do mouse) }.
  function createFx(g, ctx) {
    const { view, canvas, text } = ctx;
    const hit = ctx.hit || (() => null);
    // --- Feedback e ambiente --------------------------------------------------------------------------------------------
    // Tremida da janela, clarão, anéis que se abrem, farelo de pixels (confete, faísca, poeira), números que pulam, luzes
    // e vagalumes. Tudo em pixels de arte e com o tempo `now` do quadro; `drawFx(now)` desenha por último e a janela só pede.
    const fxs = { shake: null, flash: null, rings: [], bits: [], pops: [], tags: [], hover: null, smooth: new Map(), shakeApplied: '' };
    const unit = (a, b) => (hash(Math.floor(a), b) % 10007) / 10007;
    const easeOut = t => 1 - (1 - t) * (1 - t);

    // Treme a janela inteira (o canvas anda uns pixels de arte e volta): `power` em pixels de arte, `ms` quanto dura.
    function shake(power, ms, now) {
      const current = fxs.shake;
      if (current && now - current.born < current.ms && current.power * (1 - (now - current.born) / current.ms) >= power) return;
      fxs.shake = { power, ms, born: now };
    }
    // Clarão que apaga sozinho (a janela toda ou só `area` = {x, y, w, h}).
    function flash(color, alpha, ms, now, area = null) { fxs.flash = { color, alpha, ms, born: now, area }; }
    // Círculo de pixels que se abre de `from` a `to` e some.
    function ring(x, y, now, opts = {}) {
      fxs.rings.push({ x, y, born: now, ms: opts.ms || 500, from: opts.from ?? 2, to: opts.to ?? 14, color: opts.color || '#fff8e8', thick: opts.thick || 1 });
      if (fxs.rings.length > 24) fxs.rings.shift();
    }
    // Farelo de pixels: `n` pedacinhos saem de (x, y) com velocidade (pixels por segundo), caem com `gravity` e somem em `ms`.
    function bits(x, y, n, now, opts = {}) {
      const colors = opts.colors || ['#ffd21e', '#ff4f9e', '#3a6cf0', '#35a03a', '#ff8a12'];
      const speed = opts.speed ?? 34;
      for (let i = 0; i < n; i++) {
        const angle = opts.arc ? opts.arc[0] + (opts.arc[1] - opts.arc[0]) * unit(now + i * 3, i * 7 + 1) : unit(now, i * 5 + 2) * Math.PI * 2;
        const power = speed * (0.45 + 0.55 * unit(now + i, i * 11 + 3));
        fxs.bits.push({ x, y, vx: Math.cos(angle) * power, vy: Math.sin(angle) * power - (opts.up || 0), gravity: opts.gravity ?? 70, born: now,
          ms: (opts.ms || 700) * (0.7 + 0.3 * unit(now + i, i * 13 + 5)), size: opts.size || 1, color: colors[i % colors.length] });
      }
      while (fxs.bits.length > 240) fxs.bits.shift();
    }
    // Número ou palavra que dá um pulo: aparece grande (`scale` + 1), encolhe e sobe sumindo.
    function pop(value, x, y, now, color = TEXT_COLORS[1], opts = {}) {
      fxs.pops.push({ text: value, x, y, born: now, ms: opts.ms || 1100, color, scale: opts.scale || 1, rise: opts.rise ?? 12 });
      if (fxs.pops.length > 10) fxs.pops.shift();
    }
    // Etiqueta com várias linhas ([texto, cor]...) num painel escuro com borda dourada: o prêmio e os bônus de uma jogada ficam legíveis
    // mesmo sobre a cena cheia. Sobe um pouquinho e some; `x` é o centro e `y` a base do painel.
    function tag(lines, x, y, now, opts = {}) {
      if (!lines.length) return;
      fxs.tags.push({ lines, x, y, born: now, ms: opts.ms || 2600, border: opts.border || '#ffd85a' });
      if (fxs.tags.length > 4) fxs.tags.shift();
    }
    // Disco de luz em degraus (acende o que está embaixo): imediato, a janela chama em todo quadro.
    function glow(x, y, radius, color, alpha = 0.22) {
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = color;
      for (let step = 0; step < 3; step++) {
        const r = Math.max(1, Math.round(radius * (1 - step * 0.3)));
        g.globalAlpha = alpha * (step === 0 ? 0.7 : 1);
        for (let dy = -r; dy <= r; dy++) {
          const half = Math.floor(Math.sqrt(r * r - dy * dy));
          g.fillRect(Math.round(x) - half, Math.round(y) + dy, half * 2 + 1, 1);
        }
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
    // Vagalumes: `n` pontinhos de luz que passeiam sozinhos pela caixa {x, y, w, h} (sem estado: tudo sai do relógio).
    function fireflies(box, n, now, color = '#d8ff6a') {
      const t = now / 1000;
      for (let i = 0; i < n; i++) {
        const blink = Math.sin(t * (1.1 + (i % 4) * 0.23) + i * 1.9);
        if (blink < 0.1) continue;
        const x = box.x + (0.5 + 0.5 * Math.sin(t * (0.17 + (i % 3) * 0.05) + i * 2.1)) * box.w;
        const y = box.y + (0.5 + 0.5 * Math.sin(t * (0.23 + (i % 5) * 0.03) + i * 3.3)) * box.h;
        glow(x, y, 3, color, 0.1 * blink);
        g.globalAlpha = Math.min(1, blink * 1.4);
        g.fillStyle = '#f6ffc0';
        g.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
      g.globalAlpha = 1;
    }
    // Valor que chega devagar ao alvo (barras que enchem): `key` identifica a barra; devolve o valor desenhado agora.
    function ease(key, target, now, rate = 7) {
      const slot = fxs.smooth.get(key);
      if (!slot) { fxs.smooth.set(key, { value: target, at: now }); return target; }
      const dt = Math.min(0.25, Math.max(0, (now - slot.at) / 1000));
      slot.at = now;
      slot.value += (target - slot.value) * (1 - Math.exp(-rate * dt));
      if (Math.abs(target - slot.value) < 0.002) slot.value = target;
      return slot.value;
    }
    // Apaga os avisos que ainda estão no ar (anéis, farelo, números e painéis): a janela troca de tela e não quer o resto da anterior.
    function clearFx() {
      fxs.rings.length = 0;
      fxs.bits.length = 0;
      fxs.pops.length = 0;
      fxs.tags.length = 0;
    }
    // Um toquinho no ponto clicado (anel pequeno): mostra que o clique chegou, mesmo quando não rende nada.
    function tap(x, y, now) { ring(x, y, now, { from: 1, to: 5, ms: 260, color: '#fff8e8' }); }

    function circle(cx, cy, r) {
      cx = Math.round(cx); cy = Math.round(cy);
      let x = r;
      let y = 0;
      let err = 1 - r;
      while (x >= y) {
        for (const [dx, dy] of [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]]) g.fillRect(cx + dx, cy + dy, 1, 1);
        y++;
        if (err < 0) err += 2 * y + 1;
        else { x--; err += 2 * (y - x) + 1; }
      }
    }
    // Cantos de mira em volta da área clicável sob o mouse (só as áreas marcadas com `hot`).
    function drawHover(now) {
      if (!fxs.hover) return;
      const found = hit(fxs.hover.x, fxs.hover.y);
      if (!found || !found.hot) return;
      const x0 = Math.round(found.x) - 1;
      const y0 = Math.round(found.y) - 1;
      const x1 = Math.round(found.x + found.w);
      const y1 = Math.round(found.y + found.h);
      const arm = Math.max(2, Math.min(4, Math.floor(Math.min(found.w, found.h) / 3)));
      g.globalAlpha = 0.55 + 0.35 * Math.sin(now / 150);
      g.fillStyle = '#fff8c8';
      for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
        g.fillRect(sx > 0 ? x : x - arm + 1, y, arm, 1);
        g.fillRect(x, sy > 0 ? y : y - arm + 1, 1, arm);
      }
      g.globalAlpha = 1;
    }
    // Desenha anéis, farelo, números, clarão e a mira do mouse e aplica a tremida. Vai por último no quadro.
    function drawFx(now) {
      for (let i = fxs.rings.length - 1; i >= 0; i--) {
        const r = fxs.rings[i];
        const t = (now - r.born) / r.ms;
        if (t >= 1) { fxs.rings.splice(i, 1); continue; }
        g.globalAlpha = 1 - t;
        g.fillStyle = r.color;
        const radius = Math.round(r.from + (r.to - r.from) * easeOut(t));
        circle(r.x, r.y, radius);
        if (r.thick > 1) circle(r.x, r.y, radius + 1);
      }
      for (let i = fxs.bits.length - 1; i >= 0; i--) {
        const b = fxs.bits[i];
        const t = (now - b.born) / 1000;
        if (t * 1000 >= b.ms) { fxs.bits.splice(i, 1); continue; }
        g.globalAlpha = Math.min(1, (1 - t * 1000 / b.ms) * 2);
        g.fillStyle = b.color;
        g.fillRect(Math.round(b.x + b.vx * t), Math.round(b.y + b.vy * t + 0.5 * b.gravity * t * t), b.size, b.size);
      }
      g.globalAlpha = 1;
      for (let i = fxs.tags.length - 1; i >= 0; i--) {
        const tg = fxs.tags[i];
        const t = (now - tg.born) / tg.ms;
        if (t >= 1) { fxs.tags.splice(i, 1); continue; }
        const longest = Math.max(...tg.lines.map(line => String(line[0]).length));
        const w = longest * 4 + 5;
        const h = tg.lines.length * 7 + 2;
        const px = Math.max(1, Math.min(view.width - w - 1, Math.round(tg.x - w / 2)));
        const py = Math.max(1, Math.min(view.height - h - 1, Math.round(tg.y - h - easeOut(Math.min(1, t * 3)) * 5)));
        const alpha = t > 0.82 ? (1 - t) / 0.18 : 1;
        g.globalAlpha = alpha * 0.92;
        g.fillStyle = '#1c1830';
        g.fillRect(px, py, w, h);
        g.fillStyle = tg.border;
        g.fillRect(px, py, w, 1);
        g.fillRect(px, py + h - 1, w, 1);
        g.fillRect(px, py, 1, h);
        g.fillRect(px + w - 1, py, 1, h);
        g.globalAlpha = 1;
        tg.lines.forEach(([value, color], k) => text(value, px + w / 2, py + 2 + k * 7, color, alpha));
      }
      for (let i = fxs.pops.length - 1; i >= 0; i--) {
        const p = fxs.pops[i];
        const t = (now - p.born) / p.ms;
        if (t >= 1) { fxs.pops.splice(i, 1); continue; }
        text(p.text, p.x, Math.max(3, p.y - easeOut(Math.min(1, t * 1.4)) * p.rise), p.color, t > 0.7 ? (1 - t) / 0.3 : 1, t < 0.12 ? p.scale + 1 : p.scale);
      }
      if (fxs.flash) {
        const t = (now - fxs.flash.born) / fxs.flash.ms;
        if (t >= 1) fxs.flash = null;
        else {
          const f = fxs.flash;
          g.globalAlpha = f.alpha * (1 - t);
          g.fillStyle = f.color;
          g.fillRect(f.area ? f.area.x : 0, f.area ? f.area.y : 0, f.area ? f.area.w : view.width, f.area ? f.area.h : view.height);
          g.globalAlpha = 1;
        }
      }
      drawHover(now);
      let transform = '';
      if (fxs.shake) {
        const t = (now - fxs.shake.born) / fxs.shake.ms;
        if (t >= 1) fxs.shake = null;
        else {
          const k = (1 - t) * fxs.shake.power * view.physical / (root.devicePixelRatio || 1);
          transform = `translate(${Math.round(Math.sin(now * 0.09) * k)}px, ${Math.round(Math.cos(now * 0.13) * k * 0.7)}px)`;
        }
      }
      if (transform !== fxs.shakeApplied) { fxs.shakeApplied = transform; canvas.style.transform = transform; }
    }
    canvas.addEventListener?.('mousemove', event => { fxs.hover = { x: event.clientX, y: event.clientY }; });
    canvas.addEventListener?.('mouseleave', () => { fxs.hover = null; });
    const probe = () => ({ rings: fxs.rings.length, bits: fxs.bits.length, pops: fxs.pops.length, tags: fxs.tags.length, shaking: !!fxs.shake, flashing: !!fxs.flash });
    return { shake, flash, ring, bits, pop, tag, glow, fireflies, ease, tap, clearFx, drawFx, probe };
  }

  // `canvas`: onde desenhar; `bundle`: o pacote de arte; `opts.width/height`: o tamanho da cena em pixels de arte;
  // `opts.images`: nomes das folhas de imagem do pacote que a janela usa.
  function create(canvas, bundle, opts = {}) {
    const g = canvas.getContext('2d');
    const sound = name => { try { opts.sound?.(name); } catch (_) { /* som é enfeite */ } };
    const images = {};
    const load = name => {
      if (!name || images[name] || !bundle?.images?.[name]) return;
      const image = new Image();
      image.src = bundle.images[name];
      images[name] = image;
    };
    const ready = image => !!image && image.complete !== false && (image.naturalWidth === undefined || image.naturalWidth > 0 || image.width > 0);
    const imageOf = name => { load(name); return images[name]; };
    const view = { css: 2, limit: null, width: opts.width || 160, height: opts.height || 100, physical: 1, applied: '' };
    const fxMeta = bundle?.casa?.fx;
    const fxIndex = {};
    (fxMeta?.ids || []).forEach((id, i) => { fxIndex[id] = i; });
    if (fxMeta) load(fxMeta.image);
    for (const name of opts.images || []) load(name);
    const particles = [];
    const says = [];
    const regions = [];

    function setSize(width, height) {
      if (width === view.width && height === view.height) return;
      view.width = width;
      view.height = height;
      view.applied = '';
      applyScale();
    }

    // `css`: pixels da tela por pixel de arte que a pessoa quer; `limit`: o maior tamanho que cabe na tela.
    function applyScale() {
      const dpr = root.devicePixelRatio || 1;
      const wanted = Math.max(1, Math.round(view.css * dpr));
      let physical = wanted;
      if (view.limit) {
        const fit = Math.min(view.limit.width / view.width, view.limit.height / view.height);
        physical = Math.max(1, Math.min(wanted, Math.floor(fit * dpr)));
      }
      const applied = `${view.width}|${view.height}|${physical}|${dpr}`;
      if (applied === view.applied) return;
      view.applied = applied;
      view.physical = physical;
      if (canvas.width !== view.width) canvas.width = view.width;
      if (canvas.height !== view.height) canvas.height = view.height;
      canvas.style.width = `${view.width * physical / dpr}px`;
      canvas.style.height = `${view.height * physical / dpr}px`;
    }
    function setScale(css, limit = null) {
      view.css = css;
      view.limit = limit;
      applyScale();
    }
    function size() {
      const dpr = root.devicePixelRatio || 1;
      return { width: view.width * view.physical / dpr, height: view.height * view.physical / dpr,
        art: { width: view.width, height: view.height }, physical: view.physical };
    }
    applyScale();

    // Posição do mouse (em pixels da tela) em pixels de arte da cena.
    function toArt(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const kx = rect.width ? view.width / rect.width : 1;
      const ky = rect.height ? view.height / rect.height : 1;
      return { x: (clientX - rect.left) * kx, y: (clientY - rect.top) * ky };
    }

    // Desenha um quadro de uma folha de imagem do pacote: `meta` é o item do manifesto ({image, w, h, frames}).
    function sprite(meta, frame, x, y, extra = {}) {
      const img = imageOf(meta.image);
      if (!ready(img)) return false;
      const f = ((frame % meta.frames) + meta.frames) % meta.frames;
      const w = extra.w || meta.w;
      const h = extra.h || meta.h;
      if (extra.alpha !== undefined) g.globalAlpha = extra.alpha;
      if (extra.flip) {
        g.save();
        g.translate(Math.round(x) + w, 0);
        g.scale(-1, 1);
        g.drawImage(img, f * meta.w, 0, meta.w, meta.h, 0, Math.round(y), w, h);
        g.restore();
      } else g.drawImage(img, f * meta.w, 0, meta.w, meta.h, Math.round(x), Math.round(y), w, h);
      if (extra.alpha !== undefined) g.globalAlpha = 1;
      return true;
    }

    // Uma folha inteira (fundo) numa posição.
    function picture(name, x = 0, y = 0) {
      const img = imageOf(name);
      if (!ready(img)) return false;
      g.drawImage(img, x, y);
      return true;
    }

    function spawn(kind, x, y, now, extra = {}) {
      if (!(kind in fxIndex)) return;
      particles.push({ kind, x, y, born: now, ...extra });
      if (particles.length > 160) particles.shift();
    }
    function drawParticles(now) {
      const img = fxMeta ? imageOf(fxMeta.image) : null;
      if (!ready(img)) { particles.length = 0; return; }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const s = particleState(p, now);
        if ((now - p.born) / 1000 >= s.life) { particles.splice(i, 1); continue; }
        g.globalAlpha = Math.max(0, Math.min(1, s.alpha));
        g.drawImage(img, fxIndex[p.kind] * fxMeta.w, 0, fxMeta.w, fxMeta.h, Math.round(s.x), Math.round(s.y), fxMeta.w, fxMeta.h);
      }
      g.globalAlpha = 1;
    }

    function say(text, x, y, now, color = TEXT_COLORS[0]) {
      says.push({ text, x, y, born: now, color });
      if (says.length > 8) says.shift();
    }
    function drawSays(now) {
      for (let i = says.length - 1; i >= 0; i--) {
        const s = says[i];
        const t = (now - s.born) / SAY_MS;
        if (t >= 1) { says.splice(i, 1); continue; }
        text(s.text, s.x, s.y - t * 8, s.color, t > 0.75 ? (1 - t) * 4 : 1);
      }
      g.globalAlpha = 1;
    }
    // Texto em fonte de pixel (só A-Z, 0-9 e pontuação simples), centrado em `cx`; `scale` 2 dobra o tamanho das letras.
    function text(value, cx, y, color = TEXT_COLORS[0], alpha = 1, scale = 1) {
      const half = (String(value).length * 4 * scale - scale) / 2 + 2;
      const x = Math.max(half, Math.min(view.width - half, cx));
      root.ArraiaFesta?.pixelText(g, value, x, y, color, alpha, scale);
    }
    const fx = createFx(g, { view, canvas, text, hit: (clientX, clientY) => hit(clientX, clientY) });
    const { shake, flash, ring, bits, pop, tag, glow, fireflies, ease, tap, clearFx, drawFx } = fx;


    // Áreas clicáveis (em pixels de arte) desta imagem: zera no começo de cada quadro e cada janela registra as suas.
    function clearRegions() { regions.length = 0; }
    function region(id, x, y, w, h, data = {}) { regions.push({ id, x, y, w, h, ...data }); }
    function hit(clientX, clientY) {
      const point = toArt(clientX, clientY);
      for (let i = regions.length - 1; i >= 0; i--) {
        const r = regions[i];
        if (point.x >= r.x && point.x < r.x + r.w && point.y >= r.y && point.y < r.y + r.h) return { ...r, point };
      }
      return null;
    }

    function clear() { g.clearRect(0, 0, view.width, view.height); }
    // Linha de pixels de (x0, y0) a (x1, y1).
    function line(x0, y0, x1, y1, color) {
      g.fillStyle = color;
      const steps = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
      for (let i = 0; i <= steps; i++) g.fillRect(Math.round(x0 + (x1 - x0) * i / steps), Math.round(y0 + (y1 - y0) * i / steps), 1, 1);
    }
    function probeBase() {
      return { size: { width: view.width, height: view.height }, particles: particles.length, says: says.length, regions: regions.length,
        physical: view.physical, areas: regions.map(r => ({ id: r.id, x: r.x, y: r.y, w: r.w, h: r.h })),
        fx: fx.probe() };
    }

    return { g, view, setScale, setSize, size, toArt, sprite, picture, imageOf, ready, spawn, drawParticles, say, drawSays, text, clearRegions,
      region, hit, clear, line, sound, probeBase, regions, particles, says,
      shake, flash, ring, bits, pop, tag, glow, fireflies, ease, tap, clearFx, drawFx };
  }

  root.ArraiaJanelaBase = { create, createFx, hash, tr, particleState, TEXT_COLORS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
