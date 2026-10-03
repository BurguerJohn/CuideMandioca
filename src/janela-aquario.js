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
      images: [meta.fundo.image, meta.peixes.image, meta.algas.image, meta.superficie.image, meta.ouro.image, meta.flocos.image, meta.pote.image] });
    const tr = hooks.t || Base.tr;
    const swim = { y0: meta.agua[0] + 9, y1: meta.areia - 5 };
    const fishes = new Map();      // id do peixe -> corpo no tanque
    const flakes = [];
    const bubbles = [];            // bolhas douradas na tela
    let engineRef = null;
    let lastNow = 0;
    let seed = 11;
    const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const between = (a, b) => a + (b - a) * rand();
    const speciesIndex = id => meta.peixes.especies.indexOf(id);
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
      hooks.sound?.(flake.grew ? 'crescer' : 'bola');
      if (flake.grew) {
        base.spawn('estrela', f.x - 4, f.y - 12, now);
        base.spawn('brilho', f.x + 4, f.y - 14, now);
        base.say(tr('mini.aquario.grew', { name: nameOf(f.species) }), Math.max(40, Math.min(W - 40, f.x)), f.y - 14, now, '#ffe27a');
      } else base.spawn('coracao', f.x, f.y - 8, now);
    }

    function drawFish(f, now) {
      const sheet = meta.peixes;
      const frame = (speciesIndex(f.species) * 3 + f.stage) * 2 + (Math.floor(now / 1000 * 4 + f.phase) % 2);
      const bob = Math.sin(now / 700 + f.phase) * 0.8;
      const x = Math.round(f.x - sheet.w / 2);
      const y = Math.round(f.y - sheet.h / 2 + bob - (f.joy > 0 ? Math.sin(f.joy * 6) * 1.2 : 0));
      base.sprite(sheet, frame, x, y, { flip: f.dir < 0 });
      base.region(`fish:${f.id}`, x, y, sheet.w, sheet.h, { fish: f.id,
        tip: tr('mini.aquario.fishTip', { name: nameOf(f.species), size: tr(`mini.aquario.size.${f.stage}`) }) });
    }

    // Bolhas douradas: uma por bolha pendente, boiando perto da superfície (cada uma num lugar fixo).
    function drawBubbles(info, now) {
      while (bubbles.length < info.bubbles) bubbles.push({ x: between(20, W - 20), y: between(meta.agua[0] + 6, meta.agua[0] + 30), phase: rand() * 6 });
      bubbles.length = info.bubbles;
      bubbles.forEach((bubble, i) => {
        const bob = Math.sin(now / 600 + bubble.phase) * 2.2;
        const x = bubble.x + Math.sin(now / 900 + bubble.phase) * 2;
        const y = bubble.y + bob;
        base.sprite(meta.ouro, Math.floor(now / 300 + i) % 2, x - 5, y - 5);
        base.region(`ouro:${i}`, x - 7, y - 7, 14, 14, { ouro: i, bubble, tip: tr('mini.aquario.bubbleTip') });
      });
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
      // Algas balançando na areia.
      [14, 52, 106, 158].forEach((x, i) => base.sprite(meta.algas, Math.floor(now / 700 + i) % 2, x, meta.areia + 9 - 28));
      // Quem está mais fundo fica na frente.
      for (const f of [...fishes.values()].sort((p, q) => p.y - q.y)) drawFish(f, now);
      for (const flake of flakes) base.sprite(meta.flocos, Math.floor(now / 250) % 2, flake.x - 2, flake.y - 2);
      drawBubbles(info, now);
      base.sprite(meta.superficie, Math.floor(now / 500) % 2, 6, meta.agua[0] - 1);
      base.drawParticles(now);
      // O pote de ração, em cima do gabinete.
      base.sprite(meta.pote, 0, 8, 79);
      base.text(String(info.food), 24, 85, info.food > 0 ? '#ffe27a' : '#9a9ca8');
      base.region('pote', 6, 78, 30, 16, { tip: tr('mini.aquario.foodTip', { n: info.food, max: info.foodMax }) });
      base.drawSays(now);
      return true;
    }

    // Joga ração em (x, y) da água; o peixe menor vem comer.
    function dropAt(x, y, now) {
      const model = engineRef.mini('aquario');
      const got = model.drop();
      if (!got.ok) {
        hooks.sound?.('erro');
        base.say(tr(got.reason === 'food' ? 'mini.aquario.noFood' : 'mini.aquario.allGrown'), W / 2, meta.agua[0] + 14, now, '#ff9a8a');
        return;
      }
      hooks.sound?.('clique');
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
          if (got.reward.cheer) base.say(tr('gain.cheer', { n: Math.round(got.reward.cheer) }), x, y - 8, now, '#ffe27a');
          if (got.reward.tickets) base.say(tr('gain.tickets', { n: got.reward.tickets }), x, y - 16, now, '#9ef05a');
        }
        return true;
      }
      if (found?.id === 'pote') { dropAt(between(SWIM.x0 + 10, SWIM.x1 - 10), between(swim.y0, swim.y1), now); return true; }
      if (found?.fish !== undefined) {
        const f = fishes.get(found.fish);
        if (f) { f.joy = 1; base.spawn('coracao', f.x - 2, f.y - 10, now); hooks.sound?.('bolha'); }
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
            base.say(nameOf(event.species), Math.max(40, Math.min(W - 40, b.x)), b.y + 12, now, event.isNew ? '#9ef05a' : '#fff8e8');
          }
          hooks.sound?.('pesca');
        } else if (event.kind === 'discover') hooks.toast?.(tr('mini.aquario.newSpecies', { name: nameOf(event.species) }), 'ouro');
        else if (event.kind === 'bubble') hooks.sound?.('aviso');
        else if (event.kind === 'complete') hooks.toast?.(tr('mini.aquario.complete'), 'ouro');
      }
    }

    function probe() {
      return { ...base.probeBase(), fish: fishes.size, flakes: flakes.length, bubbles: bubbles.length };
    }

    return { size: base.size, setScale: base.setScale, draw, hit: base.hit, click, status, onEvents, probe };
  }

  root.ArraiaJanelas.registerView('aquario', create);
})(typeof globalThis !== 'undefined' ? globalThis : this);
