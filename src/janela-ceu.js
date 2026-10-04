// Céu de São João: clique no céu para soltar um foguete (vários seguidos fazem a Grande Final), na estrela cadente para fazer um
// pedido e na mesinha para fazer a simpatia (3 cartas, escolha uma). O motor está em src/mini-ceu.js.
//
// O céu: Via Láctea, nuvens que passam, fumaça nas chaminés, janelas que piscam, lampiões. Cada foguete deixa um rastro de faíscas, estoura
// numa bola de luz que acende o arraial inteiro e as faíscas brilham (somam luz), deixam rastro e, nas peônias, ainda crepitam no fim.
(function (root) {
  'use strict';

  const Base = root.ArraiaJanelaBase;
  const W = 176;
  const H = 120;
  const COLORS = [['#ff4f6a', '#ffd21e'], ['#4fd4ff', '#ffffff'], ['#9dff4f', '#ffee5a'], ['#ff8a2a', '#ffd21e'], ['#b07af0', '#ff9ad0'], ['#ffffff', '#ffe27a']];
  const MAX_SPARKS = 420;
  const compact = n => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(Math.round(n)));
  const clock = seconds => `${Math.floor(seconds / 3600) ? `${Math.floor(seconds / 3600)}H` : ''}${Math.floor(seconds % 3600 / 60)}M`;

  function create(canvas, bundle, hooks = {}) {
    const meta = bundle.janelas.ceu;
    const base = Base.create(canvas, bundle, { width: W, height: H, sound: hooks.sound, images: [meta.fundo.image, meta.foguete.image, meta.cartas.image, meta.nuvens.image,
      bundle.scenery.balao.image, bundle.scenery.pipa.image] });
    const tr = hooks.t || Base.tr;
    const g = base.g;
    const shells = [];
    const sparks = [];
    const halos = [];            // as bolas de luz das explosões (acendem o céu e o arraial)
    const delayed = [];
    const feel = { launchAt: -1e9, stock: -1, stockAt: -1e9, cardsAt: 0, picked: null, pickedAt: 0, finale: 0 };
    let engineRef = null;
    let lastNow = 0;
    let seed = 5;
    const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const between = (a, b) => a + (b - a) * rand();
    const stars = Array.from({ length: 26 }, (_, i) => ({ x: 4 + (i * 53) % 168, y: 3 + (i * 37) % 70, phase: i * 1.7 }));

    const simpatiaOf = id => engineRef?.data.minis.ceu.simpatias.find(entry => entry.id === id);

    function rewardLines(reward) {
      const lines = [];
      if (reward.cheer) lines.push(tr('gain.cheer', { n: compact(reward.cheer) }));
      if (reward.tickets) lines.push(tr('gain.tickets', { n: reward.tickets }));
      if (reward.wood) lines.push(tr('gain.wood', { n: reward.wood }));
      if (reward.belly) lines.push(tr('mini.gain.belly', { n: Math.round(reward.belly) }));
      if (reward.love) lines.push(tr('mini.gain.love', { n: Math.round(reward.love) }));
      if (reward.frenzy) lines.push(tr('mini.ceu.frenzy', { n: reward.frenzy }));
      return lines;
    }

    // --- Fogos ----------------------------------------------------------------------------------------------------------
    function addSpark(x, y, vx, vy, life, color, size = 1, gravity = 22, glitter = false) {
      sparks.push({ x, y, px: x, py: y, vx, vy, life, max: life, color, size, gravity, glitter });
      if (sparks.length > MAX_SPARKS) sparks.shift();
    }

    function explode(x, y, shape, colors, now) {
      halos.push({ x, y, color: colors[0], born: now });
      if (halos.length > 8) halos.shift();
      hooks.sound?.('estalo');
      const [c1, c2] = colors;
      if (shape === 'coracao') {
        for (let k = 0; k < 34; k++) {
          const a = k / 34 * Math.PI * 2;
          const hx = 16 * Math.sin(a) ** 3;
          const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
          addSpark(x, y, hx * 1.7, hy * 1.7, 1.4, k % 3 ? c1 : c2, 1, 8, true);
        }
      } else if (shape === 'estrela') {
        for (let k = 0; k < 40; k++) {
          const arm = Math.floor(k / 8);
          const t = (k % 8) / 8;
          const a0 = arm / 5 * Math.PI * 2 - Math.PI / 2;
          const a1 = (arm + 1) / 5 * Math.PI * 2 - Math.PI / 2;
          const r = 30;
          const px = Math.cos(a0) * r * (1 - t) + Math.cos(a1 + 0) * r * t;
          const py = Math.sin(a0) * r * (1 - t) + Math.sin(a1) * r * t;
          const inner = 0.55 + 0.45 * Math.abs(0.5 - t) * 2;
          addSpark(x, y, px * inner * 1.2, py * inner * 1.2, 1.3, k % 2 ? c1 : c2, 1, 6, true);
        }
      } else if (shape === 'chuva') {
        // Chuva de ouro (salgueiro): faíscas lentas que caem em arco e deixam rastro comprido.
        for (let k = 0; k < 44; k++) {
          const a = k / 44 * Math.PI * 2 + rand() * 0.2;
          const v = between(14, 30);
          addSpark(x, y, Math.cos(a) * v, Math.sin(a) * v - 8, between(1.6, 2.4), k % 2 ? c1 : c2, 1, 20, true);
        }
      } else {
        // Peônia: duas camadas de faíscas (a de dentro mais lenta) e um miolo que crepita.
        for (let k = 0; k < 40; k++) {
          const a = k / 40 * Math.PI * 2;
          const v = k % 2 ? 26 : 38;
          addSpark(x, y, Math.cos(a) * v, Math.sin(a) * v, 1.2, k % 2 ? c1 : c2, 1, 16, k % 4 === 0);
        }
        for (let k = 0; k < 8; k++) addSpark(x, y, between(-10, 10), between(-10, 10), 0.8, '#ffffff', 1, 10);
      }
      for (let k = 0; k < 6; k++) base.spawn('brilho', x + between(-12, 12), y + between(-12, 12), now);
      base.ring(x, y, now, { from: 3, to: 26, color: c2, ms: 520 });
    }

    // Um foguete sobe da caixa até onde se clicou e estoura (com `delay` ms de atraso, para a Grande Final).
    function shoot(tx, ty, shape, now, delay = 0) {
      const colors = COLORS[Math.floor(rand() * COLORS.length)];
      const [bx0, , bx1] = meta.caixa;
      shells.push({ x0: (bx0 + bx1) / 2 + between(-10, 10), y0: meta.caixa[1], tx, ty, t0: now + delay, dur: 650 + Math.abs(meta.caixa[1] - ty) * 4, shape, colors, puffAt: 0 });
    }

    function updateFx(dt, now) {
      for (let i = shells.length - 1; i >= 0; i--) {
        const s = shells[i];
        const t = (now - s.t0) / s.dur;
        if (t >= 1) { explode(s.tx, s.ty, s.shape, s.colors, now); shells.splice(i, 1); }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life -= dt;
        if (p.life <= 0) {
          // No fim da vida, as faíscas "de brilho" soltam duas faiscazinhas douradas (o crepitar).
          if (p.glitter && sparks.length < MAX_SPARKS - 4) {
            addSpark(p.x, p.y, between(-6, 6), between(-6, 6), 0.45, '#fff0a0', 1, 14);
            if (rand() < 0.5) addSpark(p.x, p.y, between(-6, 6), between(-4, 8), 0.35, '#ffffff', 1, 14);
          }
          sparks.splice(i, 1);
          continue;
        }
        p.px = p.x;
        p.py = p.y;
        p.vy += p.gravity * dt;
        p.vx *= 1 - 0.8 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }

    function drawFx(now) {
      // As bolas de luz das explosões: um clarão que cresce e some, e o arraial lá embaixo acendendo na cor do fogo.
      for (let i = halos.length - 1; i >= 0; i--) {
        const h = halos[i];
        const t = (now - h.born) / 520;
        if (t >= 1) { halos.splice(i, 1); continue; }
        base.glow(h.x, h.y, 10 + t * 24, h.color, 0.34 * (1 - t));
        base.glow(h.x, meta.chao - 6, 64, h.color, 0.09 * (1 - t));
      }
      for (const s of shells) {
        const t = (now - s.t0) / s.dur;
        if (t < 0) continue;
        const e = 1 - (1 - t) * (1 - t);
        const x = s.x0 + (s.tx - s.x0) * e;
        const y = s.y0 + (s.ty - s.y0) * e;
        g.fillStyle = '#fff2b0';
        g.fillRect(Math.round(x), Math.round(y), 1, 2);
        g.fillStyle = '#ff9a2a';
        g.fillRect(Math.round(x), Math.round(y) + 2, 1, 2);
        g.globalAlpha = 0.5;
        g.fillRect(Math.round(x), Math.round(y) + 4, 1, 3);
        g.globalAlpha = 1;
        base.glow(x, y + 1, 4, '#ffd070', 0.18);
        // Rastro: faíscas que se soltam do pavio e caem, e um fio de fumaça.
        if (now - s.puffAt > 40) {
          s.puffAt = now;
          base.bits(x, y + 4, 1, now, { colors: ['#ffb040', '#ff8a2a', '#fff2b0'], speed: 10, up: -4, gravity: 50, ms: 420 });
          base.bits(x, y + 6, 1, now, { colors: ['#6a6488', '#8a84a8'], speed: 5, gravity: -6, ms: 900 });
        }
      }
      g.globalCompositeOperation = 'lighter';
      for (const p of sparks) {
        const alpha = Math.max(0, Math.min(1, p.life / p.max * 1.4));
        g.fillStyle = p.color;
        // O rastro: o ponto de antes, mais fraquinho.
        g.globalAlpha = alpha * 0.45;
        g.fillRect(Math.round(p.px - (p.x - p.px) * 0.5), Math.round(p.py - (p.y - p.py) * 0.5), p.size, p.size);
        g.globalAlpha = alpha;
        g.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
    }

    // --- Cena -------------------------------------------------------------------------------------------------------------
    function drawAmbient(now) {
      const t = now / 1000;
      stars.forEach(star => {
        g.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(now / 700 + star.phase));
        g.fillStyle = '#fff6e0';
        g.fillRect(star.x, star.y, 1, 1);
      });
      g.globalAlpha = 1;
      // Nuvens que atravessam o céu bem devagar (cada uma no seu passo e na sua altura).
      [[0, 0.8, 18], [1, 0.5, 34], [2, 1.1, 8]].forEach(([index, speed, y], i) => {
        const x = ((t * speed * 2 + i * 70) % (W + 60)) - 55;
        g.globalAlpha = 0.55;
        base.sprite(meta.nuvens, index, x, y);
      });
      g.globalAlpha = 1;
      const balloon = bundle.scenery.balao;
      [[0.9, 0, 26], [0.6, 80, 44]].forEach(([speed, offset, y], i) => {
        const x = ((now / 1000 * speed * 3 + offset) % (W + 40)) - 20;
        base.sprite(balloon, Math.floor(now / 300 + i) % 2, x, y + Math.sin(now / 1500 + i) * 3);
      });
      const kite = bundle.scenery.pipa;
      base.sprite(kite, Math.floor(now / 250) % 3, 122 + Math.sin(now / 1200) * 4, 18 + Math.sin(now / 1700) * 3);
      // Janelas que acendem e apagam, fumaça das chaminés e o fogo lá longe que respira.
      meta.janelasAcesas.forEach(([x, y], i) => {
        if (Math.sin(t * 0.35 + i * 2.9) > 0.88) { g.fillStyle = '#120a22'; g.fillRect(x, y, 2, 2); }
      });
      meta.chamines.forEach(([x, y], i) => {
        for (let k = 0; k < 3; k++) {
          const phase = (t * 0.3 + i * 0.37 + k / 3) % 1;
          g.globalAlpha = (1 - phase) * 0.45;
          g.fillStyle = '#9a90b8';
          g.fillRect(Math.round(x + Math.sin(phase * 6 + i) * 2 + phase * 4), Math.round(y - phase * 12), phase < 0.4 ? 1 : 2, phase < 0.4 ? 1 : 2);
        }
      });
      g.globalAlpha = 1;
      meta.lampioes.forEach(([x, y], i) => base.glow(x + 0.5, y - 8, 9, '#ffb040', 0.07 + 0.03 * Math.sin(now / 160 + i * 2)));
      base.glow(88, meta.chao - 2, 60, '#ff8a3a', 0.04 + 0.015 * Math.sin(now / 230));
    }

    function drawLauncher(info, now) {
      const [x0, y0] = meta.caixa;
      // A caixa dá um solavanco quando solta o foguete.
      const kick = now - feel.launchAt < 160 ? Math.round(Math.sin((now - feel.launchAt) / 160 * Math.PI) * -2) : 0;
      for (let k = 0; k < info.rocketMax; k++) {
        if (k < info.rockets) base.sprite(meta.foguete, Math.floor(now / 200 + k) % 2, x0 + 4 + k * 8 - 0, y0 - 10 + kick);
      }
      // O estoque que acabou de mudar pisca (e um foguete novo "pula" para o lugar dele).
      if (feel.stock !== info.rockets) {
        if (feel.stock >= 0 && info.rockets > feel.stock) {
          const slot = info.rockets - 1;
          base.ring(x0 + 7 + slot * 8, y0 - 5, now, { from: 2, to: 9, color: '#9ef05a', ms: 380 });
          base.bits(x0 + 7 + slot * 8, y0 - 5, 5, now, { colors: ['#ffd21e', '#fff0a0', '#9ef05a'], speed: 18, gravity: 40, ms: 500 });
          hooks.sound?.('aviso');
        }
        feel.stock = info.rockets;
        feel.stockAt = now;
      }
      base.text(`${info.rockets}`, x0 + 26, y0 + 11, now - feel.stockAt < 250 ? '#ffffff' : info.rockets > 0 ? '#ffe27a' : '#9a9ca8');
      // Quanto falta para o próximo foguete (barrinha na beira da caixa) e a Grande Final (quatro pontinhos).
      if (info.rockets < info.rocketMax) {
        const total = engineRef.data.minis.ceu.rocketEvery;
        const frac = Math.max(0, Math.min(1, 1 - info.rocketIn / total));
        g.fillStyle = '#26242e';
        g.fillRect(x0 + 2, y0 + 15, 48, 3);
        g.fillStyle = '#7ad0ee';
        g.fillRect(x0 + 3, y0 + 16, Math.round(46 * base.ease('recarga', frac, now, 6)), 1);
      }
      if (info.volley > 0 && info.finaleIn <= 0) {
        for (let k = 0; k < info.volleyNeed; k++) {
          g.fillStyle = k < info.volley ? '#ffd21e' : '#4a3a28';
          g.fillRect(x0 + 40 + k * 5, y0 + 11, 3, 3);
        }
      }
      base.region('caixa', x0, y0 - 12, meta.caixa[2] - x0, meta.caixa[3] - y0 + 12, { hot: info.rockets > 0, tip: info.rockets > 0
        ? tr('mini.ceu.tipRockets', { n: info.rockets, max: info.rocketMax, need: info.volleyNeed }) : tr('mini.ceu.tipNoRockets', { t: Math.ceil(info.rocketIn) }) });
    }

    function drawTable(info, now) {
      const [x0, y0] = meta.mesa;
      // A chama da vela, com brilho (e mais forte quando a simpatia está pronta).
      const flick = Math.floor(now / 150) % 2;
      const ready = info.simpatiaIn <= 0;
      g.fillStyle = '#ffd21e';
      g.fillRect(x0 + 3, y0 + 0 + flick, 1, 2);
      g.fillStyle = '#ff8a12';
      g.fillRect(x0 + 3, y0 + 2, 1, 1);
      base.glow(x0 + 3, y0 + 1, ready ? 11 : 6, '#ffb040', (ready ? 0.14 : 0.07) + 0.03 * Math.sin(now / 120));
      if (ready && Math.floor(now / 500) % 2 === 0) base.spawn('brilho', x0 + 10, y0 - 6, now);
      const tip = ready ? tr('mini.ceu.tipSimpatia') : tr('mini.ceu.tipSimpatiaWait', { t: clock(info.simpatiaIn) });
      base.region('mesa', x0, y0 - 2, meta.mesa[2] - x0, meta.mesa[3] - y0 + 2, { tip, hot: ready });
    }

    function drawStar(info, now) {
      if (!info.star) return;
      const { seed: sd, progress } = info.star;
      const dir = sd % 2 ? 1 : -1;
      const x0 = dir > 0 ? 8 + sd % 60 : 168 - sd % 60;
      const y0 = 6 + Math.floor(sd / 7) % 24;
      const x = x0 + dir * (60 + sd % 40) * progress;
      const y = y0 + (38 + sd % 20) * progress;
      g.globalCompositeOperation = 'lighter';
      for (let k = 14; k >= 1; k--) {
        g.globalAlpha = 0.6 * (1 - k / 15);
        g.fillStyle = k < 6 ? '#fff6c8' : '#ffc060';
        g.fillRect(Math.round(x - dir * k * 2.2), Math.round(y - k * 1.5), 1 + (k < 4 ? 1 : 0), 1);
      }
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      base.glow(x, y, 9, '#fff0b0', 0.2 + 0.08 * Math.sin(now / 90));
      g.fillStyle = '#ffffff';
      g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
      g.fillStyle = '#ffe27a';
      g.fillRect(Math.round(x) - 2, Math.round(y), 5, 1);
      g.fillRect(Math.round(x), Math.round(y) - 2, 1, 5);
      if (Math.floor(now / 200) % 2 === 0) base.spawn('brilho', x - 2, y - 3, now);
      base.region('estrela', x - 9, y - 9, 18, 18, { born: info.star.born, seed: sd, hot: true, tip: tr('mini.ceu.tipStar') });
    }

    // As 3 cartas da simpatia (de costas; depois de escolher, a escolhida vira para mostrar a face) e o resultado.
    function drawCards(info, now) {
      const cards = info.cards;
      g.fillStyle = 'rgba(8, 6, 24, 0.86)';
      g.fillRect(0, 22, W, 78);
      g.fillStyle = '#ffd21e';
      g.fillRect(0, 22, W, 1);
      g.fillRect(0, 99, W, 1);
      const picked = cards.picked;
      if (feel.picked !== picked) { feel.picked = picked; feel.pickedAt = now; }
      base.text(tr(picked === null ? 'mini.ceu.pickCard' : 'mini.ceu.revealed'), 88, 26, '#fff8e8');
      cards.ids.forEach((id, i) => {
        const x = 20 + i * 52;
        const chosen = picked === i;
        const bob = picked === null ? Math.round(Math.sin(now / 420 + i * 1.3) * 1.5) : 0;
        const y = (chosen ? 36 : 40) + bob;
        // A carta escolhida gira: encolhe até sumir de lado, troca para a face e abre de novo.
        const flip = chosen ? Math.min(1, (now - feel.pickedAt) / 420) : 1;
        const width = Math.max(2, Math.round(44 * Math.abs(Math.cos(flip * Math.PI))));
        const face = picked !== null && (!chosen || flip >= 0.5);
        g.globalAlpha = picked === null || chosen ? 1 : 0.5;
        if (chosen) base.glow(x + 22, y + 30, 28, '#ffd860', 0.08 + 0.05 * flip);
        base.sprite(meta.cartas, face ? 1 + meta.cartas.ids.indexOf(id) : 0, x + Math.round((44 - width) / 2), y, { w: width, h: 60 });
        g.globalAlpha = 1;
        if (picked === null) base.region(`carta:${i}`, x, y, 44, 60, { carta: i, hot: true, tip: tr('mini.ceu.tipCard') });
      });
      if (picked !== null) {
        const entry = simpatiaOf(cards.ids[picked]);
        base.text(plain(entry ? entry.name : ''), 88, 99 - 8, '#ffe27a');
        base.region('fechar', 0, 22, W, 78, { fechar: true, tip: tr('mini.ceu.tipCloseCards') });
      }
    }
    const plain = text => String(text).replace(/[’'`¡¿]/g, '');

    function draw(engine, now) {
      engineRef = engine;
      const dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0;
      lastNow = now;
      const info = engine.mini('ceu').info();
      for (let i = delayed.length - 1; i >= 0; i--) {
        if (now >= delayed[i].at) { shoot(delayed[i].x, delayed[i].y, delayed[i].shape, now); delayed.splice(i, 1); }
      }
      updateFx(dt, now);
      base.clear();
      base.clearRegions();
      base.region('ceu', 0, 0, W, meta.chao, { tip: tr('mini.ceu.tipSky') });
      base.picture(meta.fundo.image);
      drawAmbient(now);
      drawFx(now);
      drawStar(info, now);
      drawLauncher(info, now);
      drawTable(info, now);
      base.drawParticles(now);
      if (info.cards) drawCards(info, now);
      base.drawSays(now);
      base.drawFx(now);
      return true;
    }

    function click(clientX, clientY, now = 0) {
      if (!engineRef) return false;
      const model = engineRef.mini('ceu');
      const info = model.info();
      const found = base.hit(clientX, clientY);
      const point = base.toArt(clientX, clientY);
      if (info.cards) {
        if (found?.carta !== undefined) {
          const got = model.pick(found.carta);
          if (got.ok) {
            hooks.sound?.('sino');
            const cx = 20 + found.carta * 52 + 22;
            base.spawn('estrela', cx - 10, 36, now);
            base.spawn('brilho', cx + 6, 40, now);
            base.ring(cx, 66, now, { from: 6, to: 36, color: '#ffe27a', ms: 600, thick: 2 });
            base.bits(cx, 66, 26, now, { colors: ['#ffd21e', '#fff0a0', '#ff4f9e', '#4fd4ff', '#ffffff'], speed: 52, gravity: 40, ms: 1100 });
            base.flash('#ffe27a', 0.12, 260, now, { x: 0, y: 22, w: W, h: 78 });
            base.tag(rewardLines(got.reward).map(line => [line, '#ffe27a']), 88, 96, now, { ms: 3200 });
            hooks.toast?.(tr('mini.ceu.simpatiaToast', { name: got.simpatia.name, text: got.simpatia.text }), 'ouro');
          }
        } else if (found?.fechar) { model.ack(); hooks.sound?.('clique'); }
        return true;
      }
      if (found?.id === 'estrela') {
        // Ao reabrir antes do próximo desenho, a região antiga não pode resgatar outra estrela.
        if (found.born !== info.star?.born || found.seed !== info.star?.seed) return true;
        const got = model.wish();
        if (got.ok) {
          hooks.sound?.('sino');
          base.spawn('estrela', point.x - 4, point.y - 4, now);
          base.spawn('brilho', point.x + 4, point.y - 6, now);
          base.ring(point.x, point.y, now, { from: 3, to: 28, color: '#fff0b0', ms: 560, thick: 2 });
          base.bits(point.x, point.y, 22, now, { colors: ['#fff0a0', '#ffffff', '#ffd21e', '#b8a8ff'], speed: 46, gravity: 20, ms: 1000 });
          base.flash('#fff6c8', 0.14, 260, now);
          base.pop(tr('mini.ceu.wished'), point.x, point.y - 12, now, '#fff8e8', { scale: 2, ms: 1500, rise: 8 });
          base.tag(rewardLines(got.reward).map(line => [line, '#ffe27a']), point.x, point.y - 22, now, { ms: 2800 });
        }
        return true;
      }
      if (found?.id === 'mesa') {
        const got = model.deal();
        if (got.ok) { hooks.sound?.('abrir'); base.bits(meta.mesa[0] + 18, meta.mesa[1], 12, now, { colors: ['#ffd21e', '#ff4f9e', '#4fd4ff', '#ffffff'], speed: 30, up: 18, gravity: 40, ms: 800 }); }
        else if (got.reason === 'wait') { hooks.sound?.('erro'); base.say(tr('mini.ceu.simpatiaWait', { t: clock(got.wait) }), 40, 80, now, '#8ed6ff'); base.tap(point.x, point.y, now); }
        return true;
      }
      // Céu (ou a caixa): um foguete para onde se clicou.
      if (found?.id !== 'ceu' && found?.id !== 'caixa') return false;
      const target = found.id === 'caixa' ? { x: between(30, 146), y: between(14, 56) } : { x: Math.max(8, Math.min(W - 8, point.x)), y: Math.max(8, Math.min(70, point.y)) };
      const got = model.launch();
      if (!got.ok) {
        hooks.sound?.('erro');
        base.say(tr('mini.ceu.noRockets'), 88, 60, now, '#ff9a8a');
        base.tap(point.x, point.y, now);
        base.shake(0.6, 140, now);
        return true;
      }
      hooks.sound?.('arremesso');
      shoot(target.x, target.y, got.shape, now);
      feel.launchAt = now;
      // Saída do foguete: nuvenzinha de fumaça e faíscas na boca da caixa.
      const mouth = (meta.caixa[0] + meta.caixa[2]) / 2;
      base.bits(mouth, meta.caixa[1] - 6, 9, now, { colors: ['#6a6488', '#8a84a8', '#b8b0d0'], speed: 12, arc: [-2.6, -0.5], gravity: -8, ms: 1000, size: 2 });
      base.bits(mouth, meta.caixa[1] - 4, 8, now, { colors: ['#ffd070', '#ff8a2a', '#ffffff'], speed: 26, arc: [-2.6, -0.5], gravity: 70, ms: 500 });
      if (got.finale) {
        base.pop(tr('mini.ceu.finale'), 88, 30, now, '#ffe27a', { scale: 2, ms: 2200, rise: 6 });
        hooks.sound?.('conquista');
        base.shake(1.4, 900, now);
        base.flash('#fff2c8', 0.16, 300, now);
        for (let k = 0; k < 6; k++) delayed.push({ at: now + 500 + k * 220, x: between(20, 156), y: between(12, 50), shape: ['peonia', 'coracao', 'estrela', 'chuva'][k % 4] });
        base.tag(rewardLines(got.finale).map(line => [line, '#9ef05a']), 88, 70, now, { ms: 3400 });
      }
      return true;
    }

    function status(engine) {
      const info = engine.mini('ceu').info();
      return tr('mini.ceu.status', { n: info.rockets, m: info.rocketMax, w: info.wishes });
    }

    function onEvents(engine, events, now) {
      engineRef = engine;
      for (const event of events) {
        if (event.type !== 'mini' || event.mini !== 'ceu') continue;
        if (event.kind === 'star') { hooks.sound?.('aviso'); hooks.toast?.(tr('mini.ceu.starToast'), ''); base.flash('#e8e0ff', 0.08, 240, now); }
      }
    }

    function probe() {
      return { ...base.probeBase(), shells: shells.length, sparks: sparks.length };
    }

    return { size: base.size, setScale: base.setScale, draw, hit: base.hit, click, status, onEvents, probe };
  }

  root.ArraiaJanelas.registerView('ceu', create);
})(typeof globalThis !== 'undefined' ? globalThis : this);
