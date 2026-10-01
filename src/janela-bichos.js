// Quintal dos Bichos: os bichos do cenário da festa passeiam num quintal. Clique no bicho para fazer carinho (sobe o Amor da
// Mandioca e o laço do bicho); clique no chão para jogar milho (o bicho mais perto vem comer); com o laço cheio ele mostra
// um presente: clique nele para pegar. O motor está em src/mini-bichos.js.
(function (root) {
  'use strict';

  const Base = root.ArraiaJanelaBase;
  const W = 176;
  const H = 104;
  const ZONE = { x0: 10, x1: 166, y0: 60, y1: 98 };

  // Cada bicho: o quadro de andar, de bicar/pastar, de sentar e dormir (índices dos quadros do sprite do cenário), a velocidade
  // (pixels de arte por segundo) e o som. Gato e papagaio ficam no lugar deles.
  const SPECIES = {
    galinha: { speed: 13, walk: [0, 1], walkFps: 6, peck: [2, 3], peckFps: 5, sound: 'galinha', wait: [1.2, 3.5], eats: true },
    bode: { speed: 8, walk: [0, 1], walkFps: 3, peck: [2, 3], peckFps: 2, sound: 'bode', wait: [2, 5], eats: true },
    caramelo: { speed: 20, walk: [0, 1, 2, 3], walkFps: 8, sit: [4, 5], sitFps: 2, sleep: [6, 7], sleepFps: 1, sound: 'latido', wait: [2, 6], eats: true },
    jegue: { speed: 7, walk: [0, 1, 2], walkFps: 2.5, peck: [3], peckFps: 1, sound: 'boi', wait: [2, 6], eats: true },
    boi: { speed: 6, walk: [0, 1, 2, 3], walkFps: 5, sound: 'boi', wait: [2, 6], eats: true },
    gato: { fixed: 'cama', still: [0, 1], stillFps: 1, sound: 'gato' },
    papagaio: { fixed: 'pouso', still: [0, 1, 2], stillFps: 2, sound: 'papagaio' }
  };

  const compact = n => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(Math.round(n)));

  function create(canvas, bundle, hooks = {}) {
    const meta = bundle.janelas.bichos;
    const base = Base.create(canvas, bundle, { width: W, height: H, sound: hooks.sound, images: [meta.fundo.image, meta.presentes.image] });
    const tr = hooks.t || Base.tr;
    const animals = new Map();
    const chicks = [];
    const grains = [];
    let lastNow = 0;
    let engineRef = null;
    let seed = 7;
    const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const between = (low, high) => low + (high - low) * rand();

    function spriteOf(id) { return bundle.scenery[id]; }
    function frameOf(list, fps, now, phase = 0) { return list[Math.floor(now / 1000 * fps + phase) % list.length]; }

    // Põe o bicho no quintal (uma vez) e o devolve.
    function animal(id) {
      let a = animals.get(id);
      if (a) return a;
      const spec = SPECIES[id];
      const fixed = spec.fixed === 'cama' ? meta.cama : spec.fixed === 'pouso' ? meta.pouso : null;
      a = { id, spec, x: fixed ? fixed[0] : between(ZONE.x0 + 20, ZONE.x1 - 20), y: fixed ? fixed[1] : between(ZONE.y0 + 6, ZONE.y1 - 6), dir: rand() < 0.5 ? -1 : 1,
        mode: 'idle', until: 0, target: null, eating: null, phase: rand() * 5 };
      animals.set(id, a);
      return a;
    }

    function think(a, now) {
      const spec = a.spec;
      a.target = null;
      a.until = now + between(...spec.wait) * 1000;
      const roll = rand();
      if (spec.sleep && roll < 0.25) a.mode = 'sleep';
      else if (spec.sit && roll < 0.45) a.mode = 'sit';
      else if (spec.peck && roll < 0.65) a.mode = 'peck';
      else if (roll < 0.9) {
        a.mode = 'walk';
        a.target = { x: between(ZONE.x0, ZONE.x1), y: between(ZONE.y0, ZONE.y1) };
      } else a.mode = 'idle';
    }

    function update(info, dt, now) {
      for (const pet of info.pets) {
        const a = animal(pet.id);
        if (a.spec.fixed) continue;
        // Milho no chão: o bicho que foi chamado vai até lá e come.
        const grain = a.eating;
        if (grain) {
          const dx = grain.x - a.x;
          const dy = grain.y - a.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 2) {
            a.mode = 'walk';
            a.dir = dx < 0 ? -1 : 1;
            const step = Math.min(dist, a.spec.speed * 1.6 * dt);
            a.x += dx / dist * step;
            a.y += dy / dist * step;
          } else {
            if (a.mode !== 'peck' || !grain.eatAt) { a.mode = 'peck'; grain.eatAt = now + 1300; }
            if (now >= grain.eatAt) {
              base.spawn('coracao', a.x - 2, a.y - 14, now);
              base.spawn('estrela', a.x + 3, a.y - 12, now);
              grains.splice(grains.indexOf(grain), 1);
              a.eating = null;
              a.mode = 'idle';
              a.until = now + 800;
              hooks.sound?.(a.spec.sound);
            }
          }
          continue;
        }
        if (now >= a.until) think(a, now);
        if (a.mode === 'walk' && a.target) {
          const dx = a.target.x - a.x;
          const dy = a.target.y - a.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 1.5) { a.mode = 'idle'; a.until = now + between(...a.spec.wait) * 1000; }
          else {
            a.dir = dx < -0.5 ? -1 : dx > 0.5 ? 1 : a.dir;
            const step = Math.min(dist, a.spec.speed * dt);
            a.x += dx / dist * step;
            a.y += dy / dist * step;
          }
        }
      }
      // Os pintinhos seguem a galinha, cada um um pouco atrás.
      const hen = animals.get('galinha');
      while (chicks.length < info.chicks) chicks.push({ x: (hen ? hen.x : 80) + chicks.length * 3, y: (hen ? hen.y : 80) + 2, dir: 1, walking: false, phase: rand() * 3 });
      chicks.length = info.chicks;
      chicks.forEach((chick, i) => {
        if (!hen) return;
        const tx = hen.x - hen.dir * (9 + (i % 4) * 5) + ((i % 2) ? 3 : -3);
        const ty = hen.y + 1 + (i % 3) * 2 - 2;
        const dx = tx - chick.x;
        const dy = ty - chick.y;
        const dist = Math.hypot(dx, dy);
        chick.walking = dist > 3;
        if (chick.walking) {
          chick.dir = dx < 0 ? -1 : 1;
          const step = Math.min(dist, 17 * dt);
          chick.x += dx / dist * step;
          chick.y += dy / dist * step;
        }
      });
    }

    function drawAnimal(a, pet, now) {
      const spec = a.spec;
      const sheet = spriteOf(a.id);
      let list;
      let fps;
      if (spec.still) { list = spec.still; fps = spec.stillFps; }
      else if (a.mode === 'walk') { list = spec.walk; fps = spec.walkFps; }
      else if (a.mode === 'peck' && spec.peck) { list = spec.peck; fps = spec.peckFps; }
      else if (a.mode === 'sit' && spec.sit) { list = spec.sit; fps = spec.sitFps; }
      else if (a.mode === 'sleep' && spec.sleep) { list = spec.sleep; fps = spec.sleepFps; }
      else { list = [spec.walk ? spec.walk[0] : 0]; fps = 1; }
      const frame = frameOf(list, fps, now, a.phase);
      const x = a.x - sheet.w / 2;
      const y = a.y - sheet.h;
      // O bicho ao lado do bicho: sombrinha no chão.
      base.g.globalAlpha = 0.25;
      base.g.fillStyle = '#10200c';
      base.g.fillRect(Math.round(a.x - sheet.w / 2 + 1), Math.round(a.y - 1), Math.round(sheet.w - 2), 2);
      base.g.globalAlpha = 1;
      // Os desenhos olham para a direita; para a esquerda, espelha.
      base.sprite(sheet, frame, x, y, { flip: a.dir < 0 && !spec.fixed });
      const tip = pet.ready ? tr('mini.bichos.tipReady', { name: pet.name }) : tr('mini.bichos.tip', { name: pet.name, bond: pet.bond, max: engineRef.data.minis.bichos.bondMax });
      base.region(`pet:${a.id}`, x - 1, y - 6, sheet.w + 2, sheet.h + 6, { pet: a.id, tip });
      // Laço do bicho (barrinha) ou, cheio, o presente balançando em cima dele.
      const top = y - 8;
      if (pet.ready) {
        const gift = meta.presentes.ids.indexOf(pet.gift);
        const bob = Math.round(Math.sin(now / 260 + a.phase) * 1.5);
        base.sprite(meta.presentes, gift, a.x - 4, top - 4 + bob);
        if (Math.floor(now / 500) % 2 === 0) base.spawn('brilho', a.x + 4, top - 8 + bob, now);
      } else if (pet.bond > 0) {
        const max = engineRef.data.minis.bichos.bondMax;
        base.g.fillStyle = '#26242e';
        base.g.fillRect(Math.round(a.x - 7), Math.round(top + 3), 14, 4);
        base.g.fillStyle = '#5a2a3a';
        base.g.fillRect(Math.round(a.x - 6), Math.round(top + 4), 12, 2);
        base.g.fillStyle = '#ff6a8a';
        base.g.fillRect(Math.round(a.x - 6), Math.round(top + 4), Math.round(12 * pet.bond / max), 2);
      }
    }

    function drawChick(chick, i, now) {
      const sheet = spriteOf('pintinho');
      const frame = chick.walking ? Math.floor(now / 1000 * 8 + chick.phase) % 2 : 2;
      base.sprite(sheet, frame, chick.x - sheet.w / 2, chick.y - sheet.h, { flip: chick.dir < 0 });
      base.region(`chick:${i}`, chick.x - 4, chick.y - 8, 8, 8, { chick: i, tip: tr('mini.bichos.chick') });
    }

    function drawGrain(now) {
      const sheet = meta.presentes;
      const index = sheet.ids.indexOf('grao');
      for (const grain of grains) base.sprite(sheet, index, grain.x - 4, grain.y - 6);
    }

    function draw(engine, now) {
      engineRef = engine;
      const dt = lastNow ? Math.min(0.1, Math.max(0, (now - lastNow) / 1000)) : 0;
      lastNow = now;
      const info = engine.mini('bichos').info();
      update(info, dt, now);
      base.clear();
      base.clearRegions();
      base.picture(meta.fundo.image);
      drawGrain(now);
      // Quem está mais embaixo na tela fica na frente.
      const drawables = [...info.pets.map(pet => ({ y: animal(pet.id).y, pet })), ...chicks.map((chick, i) => ({ y: chick.y, chick, i }))].sort((p, q) => p.y - q.y);
      for (const item of drawables) {
        if (item.pet) drawAnimal(animal(item.pet.id), item.pet, now);
        else drawChick(item.chick, item.i, now);
      }
      base.drawParticles(now);
      base.drawSays(now);
      // Milho que sobrou, no canto de baixo.
      base.sprite(meta.presentes, meta.presentes.ids.indexOf('grao'), 4, H - 12);
      base.text(String(info.grain), 18, H - 10, info.grain > 0 ? '#ffe27a' : '#9a9ca8');
      base.region('milho', 2, H - 14, 36, 12, { tip: tr('mini.bichos.grainTip') });
      return true;
    }

    // Texto do prêmio de um presente (fichas, Animação, lenha, Barriga, Amor).
    function rewardLines(reward) {
      const lines = [];
      if (reward.tickets) lines.push(tr('gain.tickets', { n: reward.tickets }));
      if (reward.cheer) lines.push(tr('gain.cheer', { n: compact(reward.cheer) }));
      if (reward.wood) lines.push(tr('gain.wood', { n: reward.wood }));
      if (reward.belly) lines.push(tr('mini.gain.belly', { n: Math.round(reward.belly) }));
      if (reward.love) lines.push(tr('mini.gain.love', { n: Math.round(reward.love) }));
      return lines;
    }

    function click(clientX, clientY, now = lastNow) {
      if (!engineRef) return false;
      const model = engineRef.mini('bichos');
      const found = base.hit(clientX, clientY);
      if (found?.pet) {
        const a = animals.get(found.pet);
        const state = model.info().pets.find(pet => pet.id === found.pet);
        if (state?.ready) {
          const got = model.collect(found.pet);
          if (got.ok) {
            hooks.sound?.('moeda');
            base.spawn('estrela', a.x - 4, a.y - 20, now);
            base.spawn('brilho', a.x + 3, a.y - 22, now);
            rewardLines(got.reward).forEach((line, i) => base.say(line, a.x, a.y - 26 - i * 7, now, '#ffe27a'));
            hooks.toast?.(tr('mini.bichos.gift', { pet: state.name, gift: got.pet.giftName }), 'ouro');
          }
          return true;
        }
        const got = model.pet(found.pet);
        if (got.ok) {
          hooks.sound?.(a.spec.sound);
          hooks.sound?.('carinho');
          base.spawn('coracao', a.x - 3, a.y - 14, now);
          base.say(tr(`fx.bichos.${found.pet}.${Math.floor(now / 1000) % 2}`), a.x, a.y - 22, now, '#ffb0c8');
        } else if (got.reason === 'cooldown') base.spawn('exclama', a.x - 2, a.y - 16, now);
        return true;
      }
      if (found?.chick !== undefined) {
        const chick = chicks[found.chick];
        hooks.sound?.('pintinho');
        base.spawn('coracao', chick.x - 2, chick.y - 10, now);
        base.say(tr(`fx.bichos.pintinho.${found.chick % 2}`), chick.x, chick.y - 16, now, '#fff8e8');
        return true;
      }
      // Chão: um grão de milho para o bicho mais perto que gosta de milho.
      const point = base.toArt(clientX, clientY);
      if (point.y < ZONE.y0 - 8 || point.y > H - 2) return false;
      const info = model.info();
      if (info.grain <= 0) { hooks.sound?.('erro'); return true; }
      const eaters = info.pets.map(pet => animals.get(pet.id)).filter(a => a && a.spec.eats && !a.eating);
      if (!eaters.length) return false;
      const where = { x: Math.min(ZONE.x1, Math.max(ZONE.x0, point.x)), y: Math.min(ZONE.y1, Math.max(ZONE.y0, point.y)) };
      const chosen = eaters.sort((p, q) => Math.hypot(p.x - where.x, p.y - where.y) - Math.hypot(q.x - where.x, q.y - where.y))[0];
      if (!model.feed(chosen.id).ok) return true;
      const grain = { x: where.x, y: where.y, eatAt: 0 };
      grains.push(grain);
      chosen.eating = grain;
      hooks.sound?.('clique');
      return true;
    }

    function status(engine) {
      const info = engine.mini('bichos').info();
      return `${tr('mini.bichos.count', { n: info.pets.length })} · ${tr('mini.bichos.grain', { g: info.grain, m: info.grainMax })}`;
    }

    function onEvents(engine, events, now) {
      for (const event of events) {
        if (event.type !== 'mini' || event.mini !== 'bichos' || event.kind !== 'gift-ready') continue;
        const a = animals.get(event.id);
        if (a) { base.spawn('brilho', a.x, a.y - 18, now); hooks.sound?.('aviso'); }
      }
    }

    function probe() {
      return { ...base.probeBase(), animals: animals.size, chicks: chicks.length, grains: grains.length };
    }

    return { size: base.size, setScale: base.setScale, draw, hit: base.hit, click, status, onEvents, probe };
  }

  root.ArraiaJanelas.registerView('bichos', create);
})(typeof globalThis !== 'undefined' ? globalThis : this);
