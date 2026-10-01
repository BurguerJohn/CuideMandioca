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
    // Texto em fonte de pixel (só A-Z, 0-9 e pontuação simples), centrado em `cx`.
    function text(value, cx, y, color = TEXT_COLORS[0], alpha = 1) {
      const half = (String(value).length * 4 - 1) / 2 + 2;
      const x = Math.max(half, Math.min(view.width - half, cx));
      root.ArraiaFesta?.pixelText(g, value, x, y, color, alpha);
    }

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
        physical: view.physical, areas: regions.map(r => ({ id: r.id, x: r.x, y: r.y, w: r.w, h: r.h })) };
    }

    return { g, view, setScale, setSize, size, toArt, sprite, picture, imageOf, ready, spawn, drawParticles, say, drawSays, text, clearRegions,
      region, hit, clear, line, sound, probeBase, regions, particles, says };
  }

  root.ArraiaJanelaBase = { create, hash, tr, particleState, TEXT_COLORS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
