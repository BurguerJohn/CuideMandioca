(function (root) {
  'use strict';

  // Bingo: a cena do globo na tela do Bingo. A gaiola gira com as bolas pulando lá dentro; a cada número sorteado ela dispara (gira rápido), a
  // bola rola pela rampa e cai na primeira casa da bandeja, empurrando as anteriores. Se o número está na sua cartela, a bola brilha em
  // verde; fechou uma linha ou deu BINGO, a cena inteira comemora. Tudo sai da rodada (`draw(agora, rodada)`): sem estado do motor.
  const W = 176;
  const H = 76;
  const ROLL_MS = 900;
  const NO_FX = new Proxy({}, { get: () => () => {} });
  const tr = (key, vars) => (root.ArraiaI18n ? root.ArraiaI18n.t(key, vars) : key);
  const colorOf = n => (n <= 10 ? 0 : n <= 20 ? 1 : 2);

  function create(canvas, bundle, hooks = {}) {
    const meta = bundle.bingo;
    const images = {};
    const ready = image => image && image.complete !== false && image.width > 0;
    const load = (name, src) => {
      const image = new Image();
      image.onerror = () => { const blank = document.createElement('canvas'); blank.width = blank.height = 1; images[name] = blank; };
      images[name] = image;
      image.src = src;
    };
    for (const key of ['fundo', 'bolas']) load(key, bundle.images[meta[key].image]);
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
    const [gx, gy, gr] = meta.globo;
    const [bx, by] = meta.bandeja;
    const seen = { drawn: -1, line: false, result: null, card: null };
    let roll = null;             // { n, at, mine }
    let spinUntil = 0;
    let spinFrom = 0;

    function setScale(css) {
      const dpr = root.devicePixelRatio || 1;
      const physical = Math.max(1, Math.round(css * dpr));
      canvas.width = W * physical;
      canvas.height = H * physical;
      canvas.style.width = `${canvas.width / dpr}px`;
      canvas.style.height = `${canvas.height / dpr}px`;
      out.imageSmoothingEnabled = false;
    }

    function ball(n, x, y, scale = 1, glowColor = null) {
      if (!ready(images.bolas)) return;
      const sheet = meta.bolas;
      if (glowColor) fx.glow(x, y, 9, glowColor, 0.28);
      g.drawImage(images.bolas, colorOf(n) * sheet.w, 0, sheet.w, sheet.h, Math.round(x - sheet.w / 2), Math.round(y - sheet.h / 2), sheet.w, sheet.h);
      if (text) text(g, String(n), x, y - 2, '#ffffff', 1, 1);
    }

    // A gaiola: o aro com os raios girando e as bolas pulando dentro dela.
    function drawCage(now) {
      const spinning = now < spinUntil;
      const speed = spinning ? 7 : 1;
      const turn = (now - spinFrom) * 0.0007 * speed + (spinning ? 0 : 0);
      for (let k = 0; k < 14; k++) {
        const a = k * 1.7 + now * 0.0009 * (k % 3 === 0 ? -1 : 1) * (spinning ? 5 : 1);
        const r = 5 + (k * 3) % (gr - 9);
        const x = gx + Math.cos(a) * r;
        const y = gy + Math.sin(a) * r * 0.9 + Math.abs(Math.sin(now / 170 + k)) * 2 * (spinning ? 2 : 1);
        if (ready(images.bolas)) g.drawImage(images.bolas, (k % 3) * meta.bolas.w, 0, meta.bolas.w, meta.bolas.h, Math.round(x - 5), Math.round(y - 5), meta.bolas.w, meta.bolas.h);
      }
      g.fillStyle = '#c8ccd6';
      for (let k = 0; k < 6; k++) {
        const a = turn + k * Math.PI / 3;
        for (let s = 3; s <= gr - 1; s++) g.fillRect(Math.round(gx + Math.cos(a) * s), Math.round(gy + Math.sin(a) * s), 1, 1);
      }
      for (let k = 0; k < 120; k++) {
        const a = k / 120 * Math.PI * 2;
        g.fillStyle = k % 2 ? '#8a8e9c' : '#e8ecf4';
        g.fillRect(Math.round(gx + Math.cos(a) * gr), Math.round(gy + Math.sin(a) * gr), 1, 1);
        g.fillRect(Math.round(gx + Math.cos(a) * (gr - 1)), Math.round(gy + Math.sin(a) * (gr - 1)), 1, 1);
      }
      // O cubo do meio e a manivela (gira junto).
      g.fillStyle = '#26242e';
      g.fillRect(gx - 2, gy - 2, 5, 5);
      g.fillStyle = '#ffd21e';
      g.fillRect(gx - 1, gy - 1, 3, 3);
      const crank = { x: gx + gr + 4 + Math.cos(turn * 2) * 3, y: gy + Math.sin(turn * 2) * 3 };
      g.fillStyle = '#4a2c18';
      g.fillRect(Math.round(gx + gr - 1), gy, 6, 1);
      g.fillStyle = '#ee2f3c';
      g.fillRect(Math.round(crank.x), Math.round(crank.y), 3, 3);
      if (spinning) fx.glow(gx, gy, gr + 4, '#ffd21e', 0.05 + 0.03 * Math.sin(now / 60));
    }

    // A bandeja: as últimas cinco bolas, a mais nova na primeira casa e maior; as outras deslizam para o lado quando chega uma nova.
    function drawTray(now, drawn, card, rolling) {
      const list = drawn.slice(-meta.casas).reverse();
      list.forEach((n, i) => {
        if (i === 0 && rolling) return;
        const x = fx.ease(`tray${n}`, bx + 7 + i * 18, now, 9);
        const mine = card.includes(n);
        ball(n, x, by + 7, 1, mine && i < 3 ? '#9ef05a' : null);
        if (mine) { g.fillStyle = '#9ef05a'; g.fillRect(Math.round(x - 4), by + 13, 9, 1); }
      });
    }

    function startRoll(n, now, mine) {
      roll = { n, at: now, mine, landed: false };
      spinFrom = now;
      spinUntil = now + 500;
      fx.shake(0.4, 160, now);
    }

    function draw(now, round) {
      if (!ready(images.fundo)) return;
      g.clearRect(0, 0, W, H);
      g.drawImage(images.fundo, 0, 0);
      const drawn = round?.drawn || [];
      const card = round?.card || [];
      // O que mudou desde o quadro anterior: bola nova, linha fechada, fim da rodada.
      if (round && seen.card !== card) { seen.card = card; seen.drawn = drawn.length; seen.line = !!round.line; seen.result = round.result || null; roll = null; }
      if (round && drawn.length > seen.drawn) {
        if (drawn.length === seen.drawn + 1 && seen.drawn >= 0) startRoll(drawn[drawn.length - 1], now, card.includes(drawn[drawn.length - 1]));
        seen.drawn = drawn.length;
      }
      if (!round) { seen.drawn = -1; seen.card = null; }
      drawCage(now);
      const rolling = roll && now - roll.at < ROLL_MS;
      drawTray(now, drawn, card, rolling);
      if (roll) {
        const t = (now - roll.at) / ROLL_MS;
        if (t < 1) {
          // Sai do aro, rola pela rampa e cai na primeira casa da bandeja com um quiquezinho.
          const sx = gx + gr - 4;
          const sy = gy + 7;
          const ex = bx + 7;
          const ey = by + 7;
          const k = Math.max(0, Math.min(1, (t - 0.25) / 0.5));
          const x = sx + (ex - sx) * k;
          const y = sy + (ey - sy) * k - (t > 0.75 ? Math.abs(Math.sin((t - 0.75) / 0.25 * Math.PI)) * 3 : 0);
          if (t < 0.25) { const popk = t / 0.25; ball(roll.n, gx + (sx - gx) * popk * 0.8, gy + (sy - gy) * popk, 1); } else ball(roll.n, x, y, 1, roll.mine ? '#9ef05a' : null);
        } else if (!roll.landed) {
          roll.landed = true;
          fx.ring(bx + 7, by + 7, now, { from: 3, to: roll.mine ? 18 : 12, color: roll.mine ? '#9ef05a' : '#fff8e8', ms: 480, thick: roll.mine ? 2 : 1 });
          fx.bits(bx + 7, by + 7, roll.mine ? 14 : 6, now, { colors: roll.mine ? ['#9ef05a', '#ffffff', '#ffd21e'] : ['#fff8e8', '#ffd21e'], speed: roll.mine ? 44 : 26, arc: [-2.8, -0.35], gravity: 70, ms: 700 });
          fx.pop(String(roll.n), bx + 7, by - 12, now, roll.mine ? '#9ef05a' : '#fff8e8', { scale: 2, ms: 1100, rise: 8 });
          if (roll.mine) fx.pop(tr('bingo.mine'), bx + 36, by - 12, now, '#9ef05a', { ms: 1100, rise: 6 });
          hooks.sound?.(roll.mine ? 'acerto' : 'bola');
        }
      }
      // Linha fechada e fim da rodada: festa na cena inteira.
      if (round && round.line && !seen.line) {
        seen.line = true;
        fx.flash('#fff6c8', 0.14, 260, now);
        fx.bits(W / 2, 14, 26, now, { colors: ['#ffd21e', '#ff4f9e', '#3a6cf0', '#35a03a', '#ff8a12', '#ffffff'], speed: 56, arc: [0.2, 2.9], gravity: 60, ms: 1200 });
        fx.pop(tr('bingo.lineShort'), W / 2, 26, now, '#ffd21e', { scale: 2, ms: 1500, rise: 6 });
        fx.shake(1, 220, now);
      }
      if (round && round.result && round.result !== seen.result) {
        seen.result = round.result;
        if (round.result === 'bingo') {
          fx.flash('#fff6c8', 0.24, 420, now);
          fx.bits(W / 2, 10, 60, now, { colors: ['#ffd21e', '#ff4f9e', '#3a6cf0', '#35a03a', '#ff8a12', '#ffffff'], speed: 72, arc: [0.1, 3.0], gravity: 60, ms: 1700 });
          fx.pop(tr('fx.bingo'), W / 2, 28, now, '#ffd21e', { scale: 2, ms: 2200, rise: 6 });
          fx.shake(1.6, 520, now);
        } else fx.bits(W / 2, 30, 14, now, { colors: ['#8a8a9a', '#c8c8d8', '#ffffff'], speed: 28, up: 8, gravity: 40, ms: 800 });
      }
      fx.drawFx(now);
      out.clearRect(0, 0, canvas.width, canvas.height);
      out.imageSmoothingEnabled = false;
      out.drawImage(buffer, 0, 0, canvas.width, canvas.height);
    }

    setScale(3);
    return { draw, setScale };
  }

  root.ArraiaBingo = { create };
})(typeof globalThis !== 'undefined' ? globalThis : this);
