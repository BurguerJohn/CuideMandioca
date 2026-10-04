(function (root) {
  'use strict';

  // Pescaria: a cena da barraca na tela da Pescaria. Os peixinhos de papel que estão prontos (as prendas) boiam no tanque, cada um com a
  // argolinha de metal; ao pescar, a vara balança, a boia voa até a água, um peixinho morde, a linha estica e a prenda (o integrante da
  // turma) sobe num estouro de brilhos. Só depois a janela do resultado abre (`cast(resultado, agora, depois)`).
  const W = 176;
  const H = 92;
  const CAST_MS = 1900;
  const RARITY = ['#fff8e8', '#9fc8ff', '#ff9a8a', '#ffd21e'];
  const NO_FX = new Proxy({}, { get: () => () => {} });
  const tr = (key, vars) => (root.ArraiaI18n ? root.ArraiaI18n.t(key, vars) : key);

  function create(canvas, bundle, hooks = {}) {
    const meta = bundle.pescaria;
    const images = {};
    const ready = image => image && image.complete !== false && image.width > 0;
    const load = (name, src) => {
      const image = new Image();
      image.onerror = () => { const blank = document.createElement('canvas'); blank.width = blank.height = 1; images[name] = blank; };
      images[name] = image;
      image.src = src;
    };
    for (const key of ['fundo', 'peixes', 'boia']) load(key, bundle.images[meta[key].image]);
    const buffer = document.createElement('canvas');
    buffer.width = W;
    buffer.height = H;
    const g = buffer.getContext('2d');
    const out = canvas.getContext('2d');
    const text = root.ArraiaFesta?.pixelText;
    const view = { width: W, height: H, get physical() { return (canvas.width / W) || 1; } };
    const fx = root.ArraiaJanelaBase?.createFx && text
      ? root.ArraiaJanelaBase.createFx(g, { view, canvas, text: (value, cx, y, color, alpha = 1, scale = 1) => text(g, value, cx, y, color, alpha, scale) })
      : NO_FX;
    const queue = [];            // pescarias na fila (a janela do resultado de cada uma abre quando ela termina)
    let current = null;          // { result, at, done, ghost, target, flags }
    let ripples = 0;
    const portraits = {};

    function setScale(css) {
      const dpr = root.devicePixelRatio || 1;
      const physical = Math.max(1, Math.round(css * dpr));
      canvas.width = W * physical;
      canvas.height = H * physical;
      canvas.style.width = `${canvas.width / dpr}px`;
      canvas.style.height = `${canvas.height / dpr}px`;
      out.imageSmoothingEnabled = false;
    }

    function portrait(id) {
      if (portraits[id] !== undefined) return portraits[id];
      const entry = bundle.icons?.[`char:${id}`];
      if (!entry) { portraits[id] = null; return null; }
      const image = new Image();
      image.src = entry.src;
      portraits[id] = { image, w: entry.w, h: entry.h };
      return portraits[id];
    }

    // Onde o peixinho `i` está agora: dá voltas lentas no tanque, cada um no seu passo e no seu raio.
    function fishAt(i, now) {
      const [cx, cy, rx, ry] = meta.agua;
      const a = now / 1000 * (0.28 + (i % 3) * 0.07) * (i % 2 ? 1 : -1) + i * 2.1;
      const radius = 0.5 + 0.28 * ((i * 37) % 10) / 10;
      return { x: cx + Math.cos(a) * rx * radius, y: cy + 1 + Math.sin(a) * ry * radius * 0.7, dir: Math.sin(a) * (i % 2 ? 1 : -1) > 0 ? 1 : -1 };
    }
    const fishSprite = (i, x, y, dir, now, alpha = 1) => {
      const sheet = meta.peixes;
      const frame = (i % meta.peixes.cores.length) * 2 + (Math.floor(now / 300 + i) % 2);
      if (!ready(images.peixes)) return;
      g.globalAlpha = alpha;
      const px = Math.round(x - sheet.w / 2);
      const py = Math.round(y - sheet.h / 2 + Math.sin(now / 420 + i * 1.7));
      if (dir > 0) {
        g.save();
        g.translate(px + sheet.w, 0);
        g.scale(-1, 1);
        g.drawImage(images.peixes, frame * sheet.w, 0, sheet.w, sheet.h, 0, py, sheet.w, sheet.h);
        g.restore();
      } else g.drawImage(images.peixes, frame * sheet.w, 0, sheet.w, sheet.h, px, py, sheet.w, sheet.h);
      g.globalAlpha = 1;
    };

    // A ponta da vara: parada, ou balançando para trás e para a frente no arremesso.
    function rodTip(t) {
      const idle = { x: 126, y: 18 };
      if (t === null || t < 0 || t > 520) return idle;
      if (t < 160) { const k = t / 160; return { x: idle.x + 26 * k, y: idle.y - 12 * k }; }
      if (t < 340) { const k = (t - 160) / 180; return { x: idle.x + 26 - 44 * k, y: idle.y - 12 + 22 * k }; }
      const k = (t - 340) / 180;
      return { x: idle.x - 18 + 18 * k, y: idle.y + 10 - 10 * k };
    }
    function line(x0, y0, x1, y1, color) {
      g.fillStyle = color;
      const steps = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
      for (let k = 0; k <= steps; k++) g.fillRect(Math.round(x0 + (x1 - x0) * k / steps), Math.round(y0 + (y1 - y0) * k / steps), 1, 1);
    }
    function drawRod(tip) {
      const [bx, by] = meta.vara;
      line(bx, by, tip.x, tip.y, '#3a2210');
      line(bx, by + 1, tip.x, tip.y + 1, '#8a5a34');
      line(bx - 1, by, bx - 5, by + 6, '#26242e');
      g.fillStyle = '#c8ccd6';
      g.fillRect(Math.round(tip.x), Math.round(tip.y), 1, 1);
    }

    function start(now) {
      current = queue.shift();
      current.at = now;
      const [cx, cy, rx, ry] = meta.agua;
      // O peixinho fisgado é o que sumiu da conta; a boia cai perto dele.
      current.ghost = current.ghostIndex;
      current.target = { x: cx + (current.ghost % 2 ? 22 : -22) + ((current.ghost * 13) % 17) - 8, y: cy + 1 + ((current.ghost * 7) % 5) - 2 };
      current.flags = {};
      portrait(current.result.char.id);
    }

    function cast(result, now, done) {
      const ghostIndex = Math.max(0, Math.min(5, (bundleState.ready | 0) - 1));
      queue.push({ result, done: done || (() => {}), ghostIndex });
      if (!current) start(now);
      return true;
    }
    const bundleState = { ready: 0 };

    function finish() {
      const done = current.done;
      current = null;
      done();
    }

    function drawCast(now) {
      const c = current;
      const t = now - c.at;
      const [cx, cy] = meta.agua;
      const tip = rodTip(t);
      const flags = c.flags;
      const target = c.target;
      // O peixinho fisgado nada até a boia (na espera), morde e é puxado.
      const ghost = fishAt(c.ghost, now);
      let bobber = null;
      let fishPos = null;
      if (t < 340) bobber = null;
      else if (t < 520) {
        const k = (t - 340) / 180;
        bobber = { x: tip.x + (target.x - tip.x) * k, y: tip.y + (target.y - tip.y) * k - Math.sin(k * Math.PI) * 14 };
      } else bobber = { x: target.x, y: target.y };
      const wait = t >= 520 && t < 1000;
      if (bobber) {
        if (t >= 520 && !flags.splash) {
          flags.splash = true;
          fx.ring(target.x, target.y + 1, now, { from: 2, to: 12, color: '#e8fcff', ms: 520 });
          fx.bits(target.x, target.y, 8, now, { colors: ['#e8fcff', '#b0ecff', '#4ab8f0'], speed: 26, arc: [-2.6, -0.5], gravity: 90, ms: 520 });
          hooks.sound?.('bolha');
        }
        if (wait && Math.floor(now / 380) !== flags.nibble) { flags.nibble = Math.floor(now / 380); fx.ring(target.x, target.y + 1, now, { from: 1, to: 6, color: '#b0ecff', ms: 360 }); }
      }
      // O peixinho se aproxima da boia ao longo da espera.
      if (t >= 340 && t < 1000) {
        const k = Math.min(1, Math.max(0, (t - 340) / 560));
        fishPos = { x: ghost.x + (target.x + 6 - ghost.x) * k, y: ghost.y + (target.y + 3 - ghost.y) * k, dir: target.x > ghost.x ? 1 : -1 };
      }
      if (t >= 900 && !flags.bite) {
        flags.bite = true;
        fx.pop('!', target.x, target.y - 14, now, '#ff6a6a', { scale: 2, ms: 600, rise: 4 });
        fx.shake(0.6, 140, now);
        hooks.sound?.('aviso');
      }
      if (t >= 1000 && t < 1150) {
        if (!flags.dip) { flags.dip = true; fx.ring(target.x, target.y + 2, now, { from: 2, to: 10, color: '#e8fcff', ms: 400 }); fx.bits(target.x, target.y, 6, now, { colors: ['#e8fcff', '#b0ecff'], speed: 24, arc: [-2.6, -0.5], gravity: 90, ms: 420 }); }
      }
      // A puxada: o peixinho sobe em arco da boia até o alto do tanque, deixando gotas e brilhos.
      let rise = null;
      if (t >= 1150) {
        const k = Math.min(1, (t - 1150) / 550);
        const e = 1 - (1 - k) * (1 - k);
        rise = { x: target.x + (cx - target.x) * e, y: target.y + (16 - target.y) * e - Math.sin(k * Math.PI) * 10, k };
        if (Math.floor(now / 50) !== flags.drip) { flags.drip = Math.floor(now / 50); fx.bits(rise.x, rise.y + 3, 1, now, { colors: ['#b0ecff', '#e8fcff'], speed: 8, gravity: 80, ms: 400 }); }
        if (!flags.out) { flags.out = true; fx.ring(target.x, target.y + 2, now, { from: 2, to: 14, color: '#e8fcff', ms: 460, thick: 2 }); fx.bits(target.x, target.y, 10, now, { colors: ['#e8fcff', '#b0ecff', '#4ab8f0'], speed: 34, arc: [-2.7, -0.4], gravity: 90, ms: 600 }); }
      }
      // Estouro: o peixinho vira o integrante (o retrato aparece num clarão da cor da raridade).
      const color = RARITY[c.result.char.rarity] || RARITY[0];
      if (t >= 1700 && !flags.poof) {
        flags.poof = true;
        fx.flash('#fff6c8', 0.18, 280, now);
        fx.ring(cx, 16, now, { from: 3, to: c.result.isNew ? 34 : 24, color, ms: 600, thick: 2 });
        fx.bits(cx, 16, c.result.isNew ? 40 : 22, now, { colors: [color, '#ffffff', '#ffd21e', '#ff4f9e', '#3a6cf0'], speed: c.result.isNew ? 64 : 46, gravity: 50, ms: 1100 });
        fx.shake(c.result.isNew ? 1.4 : 0.8, 260, now);
        fx.pop(tr(c.result.isNew ? 'fx.newMember' : 'fx.levelUp'), cx, 34, now, color, { ms: 1100, rise: 6 });
      }
      return { tip, bobber, fishPos, rise, color, t, wait };
    }

    function draw(now, info = {}) {
      bundleState.ready = info.ready || 0;
      if (!ready(images.fundo)) return;
      if (!current && queue.length) start(now);
      g.clearRect(0, 0, W, H);
      g.drawImage(images.fundo, 0, 0);
      const count = Math.min(info.ready || 0, 6);
      const act = current ? drawCast(now) : null;
      // As ondas do tanque: um vaivém de brilhos pela água e aneizinhos de vez em quando.
      for (let k = 0; k < 14; k++) {
        const [cx, cy, rx, ry] = meta.agua;
        const px = cx - rx * 0.8 + ((k * 29 + now * 0.012) % (rx * 1.6));
        const py = cy - ry * 0.6 + ((k * 13) % (ry * 1.1));
        g.globalAlpha = Math.max(0, Math.sin(now / 520 + k * 1.9)) * 0.7;
        g.fillStyle = '#e8fcff';
        g.fillRect(Math.round(px), Math.round(py), 2, 1);
      }
      g.globalAlpha = 1;
      if (Math.floor(now / 2300) !== ripples) { ripples = Math.floor(now / 2300); const f = fishAt(ripples % 6, now); fx.ring(f.x, f.y + 2, now, { from: 1, to: 8, color: '#b0ecff', ms: 700 }); }
      // Os peixinhos de papel prontos para pescar (o que está sendo fisgado já saiu da conta).
      for (let i = 0; i < count; i++) {
        const f = fishAt(i, now);
        fishSprite(i, f.x, f.y, f.dir, now);
      }
      if (act) {
        if (act.fishPos && !act.rise) fishSprite(current.ghost, act.fishPos.x, act.fishPos.y, act.fishPos.dir, now);
        if (act.rise && act.rise.k < 1) fishSprite(current.ghost, act.rise.x, act.rise.y, 1, now);
        drawRod(act.tip);
        // A linha e a boia: parada, afundando quando morde.
        const hook = act.rise && act.rise.k < 1 ? { x: act.rise.x, y: act.rise.y } : act.bobber;
        if (hook) line(act.tip.x, act.tip.y, hook.x, hook.y - 3, '#e8ecf4');
        if (act.bobber && !act.rise) {
          const dip = act.t >= 1000 ? 1 : 0;
          if (ready(images.boia)) g.drawImage(images.boia, dip * meta.boia.w, 0, meta.boia.w, meta.boia.h, Math.round(act.bobber.x - meta.boia.w / 2), Math.round(act.bobber.y - 6 + (act.wait ? Math.round(Math.sin(now / 160)) : 0)), meta.boia.w, meta.boia.h);
        }
        // O retrato do integrante, depois do estouro: cresce com um brilho da cor da raridade.
        if (act.t >= 1700) {
          const p = portrait(current.result.char.id);
          const k = Math.min(1, (act.t - 1700) / 200);
          if (p && ready(p.image)) {
            fx.glow(meta.agua[0], 18, 18, act.color, 0.2 * k);
            const w = Math.round(p.w * 2 * k);
            const h = Math.round(p.h * 2 * k);
            g.drawImage(p.image, Math.round(meta.agua[0] - w / 2), Math.round(16 - h / 2), w, h);
          }
        }
        if (act.t >= CAST_MS) finish();
      } else {
        drawRod(rodTip(null));
        // A boia parada em cima da água, esperando.
        const [cx, cy] = meta.agua;
        const bx = cx - 34;
        const by = cy + 2;
        line(126, 18, bx, by - 3, '#e8ecf4');
        if (ready(images.boia)) g.drawImage(images.boia, 0, 0, meta.boia.w, meta.boia.h, bx - 3, by - 6 + Math.round(Math.sin(now / 600)), meta.boia.w, meta.boia.h);
      }
      fx.drawFx(now);
      out.clearRect(0, 0, canvas.width, canvas.height);
      out.imageSmoothingEnabled = false;
      out.drawImage(buffer, 0, 0, canvas.width, canvas.height);
    }

    setScale(3);
    // A tela fechou no meio da animação: os resultados que estavam esperando abrem agora, em ordem (ninguém perde uma prenda).
    function flush() {
      const pending = [current, ...queue].filter(Boolean);
      current = null;
      queue.length = 0;
      for (const entry of pending) entry.done();
    }

    return { cast, draw, flush, setScale, get busy() { return !!current || queue.length > 0; } };
  }

  root.ArraiaPescaria = { create, CAST_MS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
