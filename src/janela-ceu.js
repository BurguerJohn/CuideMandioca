// Céu de São João: clique no céu para soltar um foguete (vários seguidos fazem a Grande Final), na estrela cadente para fazer um
// pedido e na mesinha para fazer a simpatia (3 cartas, escolha uma). O motor está em src/mini-ceu.js.
(function (root) {
  'use strict';

  const Base = root.ArraiaJanelaBase;
  const W = 176;
  const H = 120;
  const COLORS = [['#ff4f6a', '#ffd21e'], ['#4fd4ff', '#ffffff'], ['#9dff4f', '#ffee5a'], ['#ff8a2a', '#ffd21e'], ['#b07af0', '#ff9ad0'], ['#ffffff', '#ffe27a']];
  const MAX_SPARKS = 320;
  const compact = n => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(Math.round(n)));
  const clock = seconds => `${Math.floor(seconds / 3600) ? `${Math.floor(seconds / 3600)}H` : ''}${Math.floor(seconds % 3600 / 60)}M`;

  function create(canvas, bundle, hooks = {}) {
    const meta = bundle.janelas.ceu;
    const base = Base.create(canvas, bundle, { width: W, height: H, sound: hooks.sound, images: [meta.fundo.image, meta.foguete.image, meta.cartas.image,
      bundle.scenery.balao.image, bundle.scenery.pipa.image] });
    const tr = hooks.t || Base.tr;
    const shells = [];
    const sparks = [];
    const delayed = [];
    let engineRef = null;
    let lastNow = 0;
    let flash = 0;
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
    function addSpark(x, y, vx, vy, life, color, size = 1, gravity = 22) {
      sparks.push({ x, y, vx, vy, life, max: life, color, size, gravity });
      if (sparks.length > MAX_SPARKS) sparks.shift();
    }

    function explode(x, y, shape, colors, now) {
      flash = now + 140;
      hooks.sound?.('estalo');
      const [c1, c2] = colors;
      if (shape === 'coracao') {
        for (let k = 0; k < 28; k++) {
          const a = k / 28 * Math.PI * 2;
          const hx = 16 * Math.sin(a) ** 3;
          const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
          addSpark(x, y, hx * 1.7, hy * 1.7, 1.3, k % 3 ? c1 : c2, 1, 8);
        }
      } else if (shape === 'estrela') {
        for (let k = 0; k < 30; k++) {
          const arm = Math.floor(k / 6);
          const t = (k % 6) / 6;
          const a0 = arm / 5 * Math.PI * 2 - Math.PI / 2;
          const a1 = (arm + 1) / 5 * Math.PI * 2 - Math.PI / 2;
          const r = 30;
          const px = Math.cos(a0) * r * (1 - t) + Math.cos(a1 + 0) * r * t;
          const py = Math.sin(a0) * r * (1 - t) + Math.sin(a1) * r * t;
          const inner = 0.55 + 0.45 * Math.abs(0.5 - t) * 2;
          addSpark(x, y, px * inner * 1.2, py * inner * 1.2, 1.2, k % 2 ? c1 : c2, 1, 6);
        }
      } else if (shape === 'chuva') {
        for (let k = 0; k < 34; k++) {
          const a = k / 34 * Math.PI * 2 + rand() * 0.2;
          const v = between(14, 30);
          addSpark(x, y, Math.cos(a) * v, Math.sin(a) * v - 8, between(1.4, 2.1), k % 2 ? c1 : c2, 1, 20);
        }
      } else {
        for (let k = 0; k < 32; k++) {
          const a = k / 32 * Math.PI * 2;
          const v = k % 2 ? 26 : 38;
          addSpark(x, y, Math.cos(a) * v, Math.sin(a) * v, 1.1, k % 2 ? c1 : c2, 1, 16);
        }
      }
      for (let k = 0; k < 6; k++) base.spawn('brilho', x + between(-12, 12), y + between(-12, 12), now);
    }

    // Um foguete sobe da caixa até onde se clicou e estoura (com `delay` ms de atraso, para a Grande Final).
    function shoot(tx, ty, shape, now, delay = 0) {
      const colors = COLORS[Math.floor(rand() * COLORS.length)];
      const [bx0, , bx1] = meta.caixa;
      shells.push({ x0: (bx0 + bx1) / 2 + between(-10, 10), y0: meta.caixa[1], tx, ty, t0: now + delay, dur: 650 + Math.abs(meta.caixa[1] - ty) * 4, shape, colors });
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
        if (p.life <= 0) { sparks.splice(i, 1); continue; }
        p.vy += p.gravity * dt;
        p.vx *= 1 - 0.8 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }

    function drawFx(now) {
      for (const s of shells) {
        const t = (now - s.t0) / s.dur;
        if (t < 0) continue;
        const e = 1 - (1 - t) * (1 - t);
        const x = s.x0 + (s.tx - s.x0) * e;
        const y = s.y0 + (s.ty - s.y0) * e;
        base.g.fillStyle = '#fff2b0';
        base.g.fillRect(Math.round(x), Math.round(y), 1, 2);
        base.g.fillStyle = '#ff9a2a';
        base.g.fillRect(Math.round(x), Math.round(y) + 2, 1, 2);
        base.g.globalAlpha = 0.5;
        base.g.fillRect(Math.round(x), Math.round(y) + 4, 1, 3);
        base.g.globalAlpha = 1;
      }
      for (const p of sparks) {
        base.g.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.4));
        base.g.fillStyle = p.color;
        base.g.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
      base.g.globalAlpha = 1;
    }

    // --- Cena -------------------------------------------------------------------------------------------------------------
    function drawAmbient(now) {
      stars.forEach(star => {
        base.g.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(now / 700 + star.phase));
        base.g.fillStyle = '#fff6e0';
        base.g.fillRect(star.x, star.y, 1, 1);
      });
      base.g.globalAlpha = 1;
      const balloon = bundle.scenery.balao;
      [[0.9, 0, 26], [0.6, 80, 44]].forEach(([speed, offset, y], i) => {
        const x = ((now / 1000 * speed * 3 + offset) % (W + 40)) - 20;
        base.sprite(balloon, Math.floor(now / 300 + i) % 2, x, y + Math.sin(now / 1500 + i) * 3);
      });
      const kite = bundle.scenery.pipa;
      base.sprite(kite, Math.floor(now / 250) % 3, 122 + Math.sin(now / 1200) * 4, 18 + Math.sin(now / 1700) * 3);
    }

    function drawLauncher(info, now) {
      const [x0, y0] = meta.caixa;
      for (let k = 0; k < info.rocketMax; k++) {
        if (k < info.rockets) base.sprite(meta.foguete, Math.floor(now / 200 + k) % 2, x0 + 4 + k * 8 - 0, y0 - 10);
      }
      base.text(`${info.rockets}`, x0 + 26, y0 + 11, info.rockets > 0 ? '#ffe27a' : '#9a9ca8');
      if (info.volley > 0 && info.finaleIn <= 0) base.text(`${info.volley}:${info.volleyNeed}`, x0 + 44, y0 + 11, '#9ef05a');
      base.region('caixa', x0, y0 - 12, meta.caixa[2] - x0, meta.caixa[3] - y0 + 12, { tip: info.rockets > 0
        ? tr('mini.ceu.tipRockets', { n: info.rockets, max: info.rocketMax, need: info.volleyNeed }) : tr('mini.ceu.tipNoRockets', { t: Math.ceil(info.rocketIn) }) });
    }

    function drawTable(info, now) {
      const [x0, y0] = meta.mesa;
      // A chama da vela.
      const flick = Math.floor(now / 150) % 2;
      base.g.fillStyle = '#ffd21e';
      base.g.fillRect(x0 + 3, y0 + 0 + flick, 1, 2);
      base.g.fillStyle = '#ff8a12';
      base.g.fillRect(x0 + 3, y0 + 2, 1, 1);
      const ready = info.simpatiaIn <= 0;
      if (ready && Math.floor(now / 500) % 2 === 0) base.spawn('brilho', x0 + 10, y0 - 6, now);
      const tip = ready ? tr('mini.ceu.tipSimpatia') : tr('mini.ceu.tipSimpatiaWait', { t: clock(info.simpatiaIn) });
      base.region('mesa', x0, y0 - 2, meta.mesa[2] - x0, meta.mesa[3] - y0 + 2, { tip });
    }

    function drawStar(info, now) {
      if (!info.star) return;
      const { seed: sd, progress } = info.star;
      const dir = sd % 2 ? 1 : -1;
      const x0 = dir > 0 ? 8 + sd % 60 : 168 - sd % 60;
      const y0 = 6 + Math.floor(sd / 7) % 24;
      const x = x0 + dir * (60 + sd % 40) * progress;
      const y = y0 + (38 + sd % 20) * progress;
      for (let k = 9; k >= 1; k--) {
        base.g.globalAlpha = 0.5 * (1 - k / 10);
        base.g.fillStyle = '#fff6c8';
        base.g.fillRect(Math.round(x - dir * k * 2.2), Math.round(y - k * 1.5), 1 + (k < 3 ? 1 : 0), 1);
      }
      base.g.globalAlpha = 1;
      base.g.fillStyle = '#ffffff';
      base.g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
      base.g.fillStyle = '#ffe27a';
      base.g.fillRect(Math.round(x) - 2, Math.round(y), 5, 1);
      base.g.fillRect(Math.round(x), Math.round(y) - 2, 1, 5);
      if (Math.floor(now / 200) % 2 === 0) base.spawn('brilho', x - 2, y - 3, now);
      base.region('estrela', x - 9, y - 9, 18, 18, { born: info.star.born, seed: sd, tip: tr('mini.ceu.tipStar') });
    }

    // As 3 cartas da simpatia (de costas; depois de escolher, as faces) e o resultado.
    function drawCards(info, now) {
      const cards = info.cards;
      base.g.fillStyle = 'rgba(8, 6, 24, 0.82)';
      base.g.fillRect(0, 22, W, 78);
      const picked = cards.picked;
      base.text(tr(picked === null ? 'mini.ceu.pickCard' : 'mini.ceu.revealed'), 88, 26, '#fff8e8');
      cards.ids.forEach((id, i) => {
        const x = 20 + i * 52;
        const y = picked === i ? 36 : 40;
        const face = picked !== null;
        base.g.globalAlpha = picked === null || picked === i ? 1 : 0.55;
        base.sprite(meta.cartas, face ? 1 + meta.cartas.ids.indexOf(id) : 0, x, y, { w: 44, h: 60 });
        base.g.globalAlpha = 1;
        if (picked === null) base.region(`carta:${i}`, x, y, 44, 60, { carta: i, tip: tr('mini.ceu.tipCard') });
      });
      if (picked !== null) {
        const entry = simpatiaOf(cards.ids[picked]);
        base.text(entry ? entry.name : '', 88, 99, '#ffe27a');
        base.region('fechar', 0, 22, W, 78, { fechar: true, tip: tr('mini.ceu.tipCloseCards') });
      }
    }

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
      if (flash > now) { base.g.globalAlpha = 0.1; base.g.fillStyle = '#fff2c8'; base.g.fillRect(0, 0, W, meta.chao); base.g.globalAlpha = 1; }
      drawStar(info, now);
      drawLauncher(info, now);
      drawTable(info, now);
      base.drawParticles(now);
      if (info.cards) drawCards(info, now);
      base.drawSays(now);
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
            base.spawn('estrela', 20 + found.carta * 52 + 12, 36, now);
            base.spawn('brilho', 20 + found.carta * 52 + 28, 40, now);
            rewardLines(got.reward).forEach((line, i) => base.say(line, 88, 82 - i * 7, now, '#ffe27a'));
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
          base.say(tr('mini.ceu.wished'), point.x, point.y - 10, now, '#fff8e8');
          rewardLines(got.reward).forEach((line, i) => base.say(line, point.x, point.y - 18 - i * 7, now, '#ffe27a'));
        }
        return true;
      }
      if (found?.id === 'mesa') {
        const got = model.deal();
        if (got.ok) hooks.sound?.('abrir');
        else if (got.reason === 'wait') { hooks.sound?.('erro'); base.say(tr('mini.ceu.simpatiaWait', { t: clock(got.wait) }), 40, 80, now, '#8ed6ff'); }
        return true;
      }
      // Céu (ou a caixa): um foguete para onde se clicou.
      if (found?.id !== 'ceu' && found?.id !== 'caixa') return false;
      const target = found.id === 'caixa' ? { x: between(30, 146), y: between(14, 56) } : { x: Math.max(8, Math.min(W - 8, point.x)), y: Math.max(8, Math.min(70, point.y)) };
      const got = model.launch();
      if (!got.ok) { hooks.sound?.('erro'); base.say(tr('mini.ceu.noRockets'), 88, 60, now, '#ff9a8a'); return true; }
      hooks.sound?.('arremesso');
      shoot(target.x, target.y, got.shape, now);
      if (got.finale) {
        base.say(tr('mini.ceu.finale'), 88, 40, now, '#ffe27a');
        hooks.sound?.('conquista');
        for (let k = 0; k < 6; k++) delayed.push({ at: now + 500 + k * 220, x: between(20, 156), y: between(12, 50), shape: ['peonia', 'coracao', 'estrela', 'chuva'][k % 4] });
        rewardLines(got.finale).forEach((line, i) => base.say(line, 88, 52 + i * 7, now, '#9ef05a'));
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
        if (event.kind === 'star') { hooks.sound?.('aviso'); hooks.toast?.(tr('mini.ceu.starToast'), ''); }
      }
    }

    function probe() {
      return { ...base.probeBase(), shells: shells.length, sparks: sparks.length };
    }

    return { size: base.size, setScale: base.setScale, draw, hit: base.hit, click, status, onEvents, probe };
  }

  root.ArraiaJanelas.registerView('ceu', create);
})(typeof globalThis !== 'undefined' ? globalThis : this);
