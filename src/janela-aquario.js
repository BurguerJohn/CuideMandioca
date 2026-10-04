// Aquário: o tanque da pescaria. Clique na água (ou no pote de ração) para jogar ração: o peixe menor vem comer e cresce. Os
// peixes grandes soltam bolhas douradas: clique para estourar e ganhar Animação. Cada prenda fisgada solta um peixe novo. O
// motor está em src/mini-aquario.js.
(function (root) {
  'use strict';

  const Base = root.ArraiaJanelaBase;
  const W = 176;
  const H = 104;
  const SWIM = { x0: 12, x1: 164 };

  function create(canvas, bundle, hooks = {}) {
    const meta = bundle.janelas.aquario;
    const base = Base.create(canvas, bundle, { width: W, height: H, sound: hooks.sound,
      images: [meta.fundo.image, meta.peixes.image, meta.plantas.image, meta.frente.image, meta.superficie.image, meta.ouro.image, meta.flocos.image, meta.pote.image] });
    const tr = hooks.t || Base.tr;
    const swim = { y0: meta.agua[0] + 9, y1: meta.areia - 5 };
    const fishes = new Map();      // id do peixe -> corpo no tanque
    const flakes = [];
    const bubbles = [];            // bolhas douradas na tela
    let engineRef = null;
    let lastNow = 0;
    let seed = 11;
    const pote = { usedAt: 0 };
    const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const between = (a, b) => a + (b - a) * rand();
    const speciesIndex = id => meta.peixes.especies.indexOf(id);
    const clockNow = () => lastNow;
    const nameOf = id => engineRef?.data.minis.aquario.species.find(entry => entry.id === id)?.name || id;

    function body(info) {
      let f = fishes.get(info.id);
      if (!f) {
        f = { id: info.id, x: between(SWIM.x0 + 10, SWIM.x1 - 10), y: between(swim.y0, swim.y1), dir: rand() < 0.5 ? -1 : 1, targetY: 0, nextTurn: 0,
          phase: rand() * 6, speed: 0, eating: null, joy: 0 };
        f.targetY = f.y;
        fishes.set(info.id, f);
      }
      f.species = info.species;
      f.stage = info.stage;
      return f;
    }

    function update(info, dt, now) {
      const live = new Set(info.fish.map(entry => entry.id));
      for (const id of [...fishes.keys()]) if (!live.has(id)) fishes.delete(id);
      for (const entry of info.fish) {
        const f = body(entry);
        const speed = [15, 11, 8][f.stage];
        if (f.eating) {
          const flake = f.eating;
          const dx = flake.x - f.x;
          const dy = flake.y - f.y;
          const dist = Math.hypot(dx, dy);
          f.dir = dx < -0.5 ? -1 : dx > 0.5 ? 1 : f.dir;
          if (dist > 3) {
            const step = Math.min(dist, speed * 2.2 * dt);
            f.x += dx / dist * step;
            f.y += dy / dist * step;
          } else if (flake.landed || flake.life > 7) {
            eat(f, flake, now);
          }
          continue;
        }
        if (now >= f.nextTurn) {
          f.nextTurn = now + between(1.5, 5) * 1000;
          f.targetY = between(swim.y0, swim.y1);
          if (rand() < 0.35) f.dir = -f.dir;
        }
        f.x += f.dir * speed * dt;
        if (f.x < SWIM.x0) { f.x = SWIM.x0; f.dir = 1; }
        if (f.x > SWIM.x1) { f.x = SWIM.x1; f.dir = -1; }
        f.y += Math.max(-1, Math.min(1, f.targetY - f.y)) * 5 * dt;
        if (rand() < dt * 0.25) base.spawn('bolha', f.x + f.dir * 6, f.y - 4, now);
        if (f.joy > 0) f.joy -= dt;
      }
      for (let i = flakes.length - 1; i >= 0; i--) {
        const flake = flakes[i];
        flake.life += dt;
        if (!flake.landed) {
          flake.y = Math.min(flake.y1, flake.y + 16 * dt);
          if (rand() < dt * 6) base.spawn('bolha', flake.x + between(-2, 2), flake.y - 2, clockNow());
          if (flake.y >= flake.y1) flake.landed = true;
        }
        if (flake.life > 9) {
          flakes.splice(i, 1);
          for (const f of fishes.values()) if (f.eating === flake) f.eating = null;
        }
      }
    }

    function eat(f, flake, now) {
      const index = flakes.indexOf(flake);
      f.eating = null;
      if (index < 0) return;
      flakes.splice(index, 1);
      f.joy = 1.2;
      base.spawn('bolha', f.x + f.dir * 6, f.y - 3, now);
      base.bits(f.x + f.dir * 6, f.y, 5, now, { colors: ['#ffb84a', '#ff8a2a', '#e8fcff'], speed: 16, up: 10, gravity: -10, ms: 500 });
      hooks.sound?.(flake.grew ? 'crescer' : 'bola');
      if (flake.grew) {
        // Cresceu: anel dourado, chuva de pontinhos, brilho em volta do peixe e o nome na tela.
        f.growAt = now;
        base.spawn('estrela', f.x - 4, f.y - 12, now);
        base.spawn('brilho', f.x + 4, f.y - 14, now);
        base.ring(f.x, f.y, now, { from: 4, to: 22, color: '#ffe27a', ms: 600, thick: 2 });
        base.ring(f.x, f.y, now, { from: 2, to: 12, color: '#ffffff', ms: 420 });
        base.bits(f.x, f.y, 14, now, { colors: ['#ffd21e', '#fff0a0', '#ffffff', '#8ed6ff'], speed: 36, gravity: -12, ms: 800 });
        base.flash('#fff6c0', 0.14, 220, now);
        base.pop(tr('mini.aquario.grew', { name: nameOf(f.species) }), Math.max(40, Math.min(W - 40, f.x)), f.y - 18, now, '#ffe27a', { ms: 1500 });
      } else base.spawn('coracao', f.x, f.y - 8, now);
    }

    function drawFish(f, now) {
      const sheet = meta.peixes;
      const frame = (speciesIndex(f.species) * 3 + f.stage) * 2 + (Math.floor(now / 1000 * 4 + f.phase) % 2);
      const bob = Math.sin(now / 700 + f.phase) * 0.8;
      const x = Math.round(f.x - sheet.w / 2);
      const y = Math.round(f.y - sheet.h / 2 + bob - (f.joy > 0 ? Math.sin(f.joy * 6) * 1.2 : 0));
      if (f.growAt && now - f.growAt < 900) base.glow(f.x, f.y, 11, '#ffe27a', 0.2 * (1 - (now - f.growAt) / 900));
      base.sprite(sheet, frame, x, y, { flip: f.dir < 0 });
      base.region(`fish:${f.id}`, x, y, sheet.w, sheet.h, { fish: f.id, hot: true,
        tip: tr('mini.aquario.fishTip', { name: nameOf(f.species), size: tr(`mini.aquario.size.${f.stage}`) }) });
    }

    // Bolhas douradas: uma por bolha pendente, boiando perto da superfície (cada uma num lugar fixo).
    function drawBubbles(info, now) {
      while (bubbles.length < info.bubbles) {
        const bubble = { x: between(20, W - 20), y: between(meta.agua[0] + 6, meta.agua[0] + 30), phase: rand() * 6, born: now };
        bubbles.push(bubble);
        // Bolha nova: um anel e um brilhinho avisam onde ela apareceu.
        base.ring(bubble.x, bubble.y, now, { from: 2, to: 13, color: '#ffe27a', ms: 520 });
        base.bits(bubble.x, bubble.y, 6, now, { colors: ['#ffd21e', '#fff0a0'], speed: 16, gravity: -6, ms: 600 });
      }
      bubbles.length = info.bubbles;
      bubbles.forEach((bubble, i) => {
        const bob = Math.sin(now / 600 + bubble.phase) * 2.2;
        const x = bubble.x + Math.sin(now / 900 + bubble.phase) * 2;
        const y = bubble.y + bob;
        base.glow(x, y, 9, '#ffd860', 0.08 + 0.05 * Math.sin(now / 240 + i));
        base.sprite(meta.ouro, Math.floor(now / 300 + i) % 2, x - 5, y - 5);
        base.region(`ouro:${i}`, x - 7, y - 7, 14, 14, { ouro: i, bubble, hot: true, tip: tr('mini.aquario.bubbleTip') });
      });
    }

    // Plantas que balançam: [x do canto, tipo]; as de trás ficam atrás dos peixes e as da frente, na frente deles.
    const PLANTS_BACK = [[4, 2], [54, 1], [84, 3], [112, 0], [152, 2]];
    const PLANTS_FRONT = [[2, 0], [90, 0], [117, 1], [164, 0]];
    function drawPlants(list, now, offset) {
      const sheet = meta.plantas;
      list.forEach(([x, tipo], i) => base.sprite(sheet, tipo * 2 + (Math.floor(now / 700 + i + offset) % 2), x, meta.areia + 9 - sheet.h));
    }

    // Luz que mexe: raios que balançam, brilhos de água na areia, as lâmpadas, a coluna de bolhas da bomba de ar e as bolhinhas do baú.
    function drawLight(now) {
      const t = now / 1000;
      const g = base.g;
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = '#d8f8ff';
      [20, 58, 98, 136].forEach((x0, i) => {
        g.globalAlpha = 0.05 + 0.035 * Math.sin(t * 0.9 + i * 1.7);
        const sway = Math.sin(t * 0.5 + i) * 3;
        for (let y = meta.agua[0]; y < meta.areia; y += 1) g.fillRect(Math.round(x0 + (y - meta.agua[0]) / 3 + sway), y, 5, 1);
      });
      // Brilhos de água na areia (as luzes dançando no fundo).
      g.fillStyle = '#fff6d0';
      for (let k = 0; k < 18; k++) {
        const x = (k * 37 + Math.sin(t * 0.7 + k) * 5 + t * 3) % 160 + 8;
        const y = meta.areia + 4 + ((k * 11) % 9);
        g.globalAlpha = Math.max(0, Math.sin(t * 1.6 + k * 2.3)) * 0.35;
        g.fillRect(Math.round(x), y, 2, 1);
      }
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      meta.lampadas.forEach((x, i) => base.glow(x, 12, 14, '#fff2b0', 0.05 + 0.015 * Math.sin(t * 2 + i)));
      // Bolhas subindo: a bomba de ar (coluna) e o baú (de vez em quando).
      g.fillStyle = '#e8fcff';
      const air = (x0, y0, count, speed, wobble) => {
        for (let k = 0; k < count; k++) {
          const phase = (t * speed + k / count) % 1;
          const y = y0 - phase * (y0 - meta.agua[0] - 3);
          g.globalAlpha = 0.85 * (1 - phase * 0.5);
          const size = phase > 0.55 ? 2 : 1;
          g.fillRect(Math.round(x0 + Math.sin(phase * 9 + k * 2) * wobble), Math.round(y), size, size);
        }
      };
      air(meta.pedraAr[0], meta.pedraAr[1], 7, 0.32, 1.6);
      air(meta.bau[0] + 9, meta.bau[1] + 1, 3, 0.16, 2.2);
      g.globalAlpha = 1;
    }

    function draw(engine, now) {
      engineRef = engine;
      const dt = lastNow ? Math.min(0.1, Math.max(0, (now - lastNow) / 1000)) : 0;
      lastNow = now;
      const info = engine.mini('aquario').info();
      update(info, dt, now);
      base.clear();
      base.clearRegions();
      base.region('agua', 6, meta.agua[0], 164, meta.areia - meta.agua[0], { tip: '' });
      base.picture(meta.fundo.image);
      drawLight(now);
      drawPlants(PLANTS_BACK, now, 0);
      // Quem está mais fundo fica na frente.
      for (const f of [...fishes.values()].sort((p, q) => p.y - q.y)) drawFish(f, now);
      for (const flake of flakes) base.sprite(meta.flocos, Math.floor(now / 250) % 2, flake.x - 2, flake.y - 2);
      drawPlants(PLANTS_FRONT, now, 1);
      drawBubbles(info, now);
      base.sprite(meta.superficie, Math.floor(now / 500) % 2, 6, meta.agua[0] - 1);
      base.picture(meta.frente.image);
      base.drawParticles(now);
      // O pote de ração, em cima do gabinete: dá uma sacudida quando alguém usa.
      const shakeT = pote.usedAt ? (now - pote.usedAt) / 260 : 1;
      const jiggle = shakeT < 1 ? Math.round(Math.sin(shakeT * Math.PI * 6) * 1.5 * (1 - shakeT)) : 0;
      base.sprite(meta.pote, 0, 8 + jiggle, 79);
      base.text(String(info.food), 24, 85, info.food > 0 ? (shakeT < 0.5 ? '#ffffff' : '#ffe27a') : '#9a9ca8');
      base.region('pote', 6, 78, 30, 16, { tip: tr('mini.aquario.foodTip', { n: info.food, max: info.foodMax }), hot: info.food > 0 });
      base.drawSays(now);
      base.drawFx(now);
      return true;
    }

    // Joga ração em (x, y) da água; o peixe menor vem comer.
    function dropAt(x, y, now) {
      const model = engineRef.mini('aquario');
      const got = model.drop();
      if (!got.ok) {
        hooks.sound?.('erro');
        base.say(tr(got.reason === 'food' ? 'mini.aquario.noFood' : 'mini.aquario.allGrown'), W / 2, meta.agua[0] + 14, now, '#ff9a8a');
        base.tap(x, y, now);
        pote.usedAt = got.reason === 'food' ? now : pote.usedAt;
        return;
      }
      hooks.sound?.('clique');
      pote.usedAt = now;
      // A ração bate na água: anel e respingo no ponto de entrada.
      base.ring(Math.max(SWIM.x0, Math.min(SWIM.x1, x)), meta.agua[0] + 2, now, { from: 2, to: 9, color: '#e8fcff', ms: 420 });
      base.bits(Math.max(SWIM.x0, Math.min(SWIM.x1, x)), meta.agua[0] + 1, 5, now, { colors: ['#e8fcff', '#b0ecff', '#ffb84a'], speed: 22, arc: [-2.4, -0.7], gravity: 90, ms: 450 });
      const flake = { x: Math.max(SWIM.x0, Math.min(SWIM.x1, x)), y: meta.agua[0] + 2, y1: Math.max(swim.y0, Math.min(swim.y1, y)), landed: false, life: 0,
        grew: got.grew };
      flakes.push(flake);
      const f = fishes.get(got.fish.id);
      if (f) f.eating = flake;
    }

    function click(clientX, clientY, now = lastNow) {
      if (!engineRef) return false;
      const model = engineRef.mini('aquario');
      const found = base.hit(clientX, clientY);
      const point = base.toArt(clientX, clientY);
      if (found?.ouro !== undefined) {
        const bubble = found.bubble;
        if (!bubbles.includes(bubble)) return true;
        const got = model.pop();
        if (got.ok) {
          bubbles.splice(bubbles.indexOf(bubble), 1);
          hooks.sound?.('moeda');
          const x = bubble.x;
          const y = bubble.y;
          base.spawn('estrela', x - 4, y - 4, now);
          base.spawn('brilho', x + 3, y - 6, now);
          // A bolha estoura numa chuva de moedinhas de luz, com anel e tremidinha.
          base.bits(x, y, 16, now, { colors: ['#ffd21e', '#fff0a0', '#ffffff', '#ffb84a'], speed: 42, gravity: 40, ms: 900 });
          base.ring(x, y, now, { from: 3, to: 20, color: '#ffe27a', ms: 480, thick: 2 });
          base.flash('#fff6c0', 0.12, 200, now);
          base.shake(0.8, 200, now);
          if (got.reward.cheer) base.pop(tr('gain.cheer', { n: Math.round(got.reward.cheer) }), x, y - 8, now, '#ffe27a', { ms: 1400 });
          if (got.reward.tickets) base.pop(tr('gain.tickets', { n: got.reward.tickets }), x, y - 18, now, '#9ef05a', { ms: 1400 });
        }
        return true;
      }
      if (found?.id === 'pote') { dropAt(between(SWIM.x0 + 10, SWIM.x1 - 10), between(swim.y0, swim.y1), now); return true; }
      if (found?.fish !== undefined) {
        const f = fishes.get(found.fish);
        if (f) {
          f.joy = 1;
          base.spawn('coracao', f.x - 2, f.y - 10, now);
          base.ring(f.x, f.y, now, { from: 3, to: 11, color: '#e8fcff', ms: 400 });
          base.bits(f.x, f.y - 3, 6, now, { colors: ['#e8fcff', '#b0ecff'], speed: 14, up: 12, gravity: -14, ms: 700 });
          hooks.sound?.('bolha');
        }
        return true;
      }
      if (point.y >= meta.agua[0] && point.y <= meta.areia && point.x >= 6 && point.x <= 170) { dropAt(point.x, point.y, now); return true; }
      return false;
    }

    function status(engine) {
      const info = engine.mini('aquario').info();
      return `${tr('mini.aquario.count', { n: info.fish.length })} · ${tr('mini.aquario.species', { n: info.seen.length, m: info.total })}`;
    }

    // Peixe novo (da pescaria): cai do alto com um respingo e o nome aparece.
    function onEvents(engine, events, now) {
      engineRef = engine;
      for (const event of events) {
        if (event.type !== 'mini' || event.mini !== 'aquario') continue;
        if (event.kind === 'new-fish') {
          const f = [...engine.mini('aquario').info().fish].find(entry => entry.id === event.id);
          if (f) {
            const b = body(f);
            b.y = meta.agua[0] + 4;
            base.spawn('bolha', b.x, b.y + 4, now);
            base.spawn('bolha', b.x + 5, b.y + 6, now);
            base.ring(b.x, meta.agua[0] + 2, now, { from: 2, to: 16, color: '#e8fcff', ms: 560, thick: 2 });
            base.bits(b.x, meta.agua[0] + 1, 12, now, { colors: ['#e8fcff', '#b0ecff', '#80d2ee'], speed: 40, arc: [-2.6, -0.5], gravity: 110, ms: 700 });
            base.pop(nameOf(event.species), Math.max(40, Math.min(W - 40, b.x)), b.y + 12, now, event.isNew ? '#9ef05a' : '#fff8e8', { ms: 1700 });
            if (event.isNew) { base.flash('#e8fcff', 0.16, 260, now); base.ring(b.x, b.y + 6, now, { from: 4, to: 22, color: '#9ef05a', ms: 650 }); }
          }
          hooks.sound?.('pesca');
        } else if (event.kind === 'discover') hooks.toast?.(tr('mini.aquario.newSpecies', { name: nameOf(event.species) }), 'ouro');
        else if (event.kind === 'bubble') hooks.sound?.('aviso');
        else if (event.kind === 'complete') {
          hooks.toast?.(tr('mini.aquario.complete'), 'ouro');
          base.bits(W / 2, meta.agua[0] + 10, 40, now, { colors: ['#ffd21e', '#ff4f9e', '#3a6cf0', '#35a03a', '#ff8a12', '#ffffff'], speed: 70, gravity: 50, ms: 1600, arc: [-3, 0] });
          base.flash('#fff6c0', 0.25, 500, now);
          base.shake(1.5, 500, now);
        }
      }
    }

    function probe() {
      return { ...base.probeBase(), fish: fishes.size, flakes: flakes.length, bubbles: bubbles.length };
    }

    return { size: base.size, setScale: base.setScale, draw, hit: base.hit, click, status, onEvents, probe };
  }

  root.ArraiaJanelas.registerView('aquario', create);
})(typeof globalThis !== 'undefined' ? globalThis : this);
