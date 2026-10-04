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
    const base = Base.create(canvas, bundle, { width: W, height: H, sound: hooks.sound, images: [meta.fundo.image, meta.presentes.image, meta.varal.image] });
    const tr = hooks.t || Base.tr;
    const animals = new Map();
    const chicks = [];
    const grains = [];
    let lastNow = 0;
    let engineRef = null;
    const ambient = { zzzAt: 0 };
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
              base.bits(grain.x, grain.y - 3, 7, now, { colors: ['#ffd21e', '#fff0a0', '#ff8aa8'], speed: 26, up: 22, ms: 600 });
              base.ring(a.x, a.y - 8, now, { from: 3, to: 11, color: '#ffe27a', ms: 380 });
              a.hopAt = now;
              a.bondFlashAt = now;
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

    // Coraçãozinho de 5x5 (o ícone do laço do bicho).
    function heart(x, y, color, dark) {
      const g = base.g;
      g.fillStyle = dark;
      g.fillRect(x, y + 1, 5, 2);
      g.fillRect(x + 1, y + 3, 3, 1);
      g.fillStyle = color;
      g.fillRect(x, y, 2, 2);
      g.fillRect(x + 3, y, 2, 2);
      g.fillRect(x + 1, y + 1, 3, 2);
      g.fillRect(x + 1, y + 3, 3, 1);
      g.fillRect(x + 2, y + 4, 1, 1);
      g.fillStyle = '#ffe6ee';
      g.fillRect(x, y, 1, 1);
    }

    // O laço do bicho: coração e barrinha que enche devagar; cheia, ela pisca em branco.
    function drawBond(a, top, pet, now) {
      const max = engineRef.data.minis.bichos.bondMax;
      const frac = base.ease(`bond:${a.id}`, pet.bond / max, now, 6);
      const x = Math.round(a.x) - 10;
      const y = Math.round(top);
      const g = base.g;
      const flash = a.bondFlashAt && now - a.bondFlashAt < 320 ? 1 - (now - a.bondFlashAt) / 320 : 0;
      g.fillStyle = '#26242e';
      g.fillRect(x, y + 1, 21, 7);
      g.fillStyle = '#4a2a3a';
      g.fillRect(x + 1, y + 2, 19, 5);
      heart(x + 2, y + 1, flash > 0.3 ? '#ffffff' : '#ff6a8a', '#c8284e');
      g.fillStyle = '#26242e';
      g.fillRect(x + 8, y + 3, 11, 3);
      g.fillStyle = '#5a2a3a';
      g.fillRect(x + 9, y + 4, 9, 1);
      const fill = Math.round(9 * frac);
      g.fillStyle = flash > 0.3 ? '#ffffff' : '#ff6a8a';
      g.fillRect(x + 9, y + 4, fill, 1);
      if (fill > 0) { g.fillStyle = '#ffb0c8'; g.fillRect(x + 9, y + 3, fill, 1); }
    }

    // O presente do bicho: balãozinho de fala com o presente dentro, balançando, com um brilho dourado em volta.
    function drawGift(a, top, pet, now) {
      const gift = meta.presentes.ids.indexOf(pet.gift);
      const bob = Math.round(Math.sin(now / 260 + a.phase) * 1.5);
      const x = Math.round(a.x) - 7;
      const y = Math.round(top) - 16 + bob;
      const g = base.g;
      base.glow(a.x, y + 7, 10, '#ffd85a', 0.08 + 0.05 * Math.sin(now / 200 + a.phase));
      g.fillStyle = '#26242e';
      g.fillRect(x + 1, y, 13, 1);
      g.fillRect(x + 1, y + 13, 13, 1);
      g.fillRect(x, y + 1, 1, 12);
      g.fillRect(x + 14, y + 1, 1, 12);
      g.fillRect(x + 6, y + 14, 1, 1);
      g.fillRect(x + 8, y + 14, 1, 1);
      g.fillRect(x + 7, y + 15, 1, 1);
      // Borda dourada e fundo escuro: o presente (ovo, leite, carta...) sempre se destaca.
      g.fillStyle = '#ffd85a';
      g.fillRect(x + 1, y + 1, 13, 12);
      g.fillRect(x + 6, y + 13, 3, 2);
      g.fillStyle = '#3e3a5e';
      g.fillRect(x + 2, y + 2, 11, 10);
      g.fillRect(x + 7, y + 13, 1, 1);
      g.fillStyle = '#56507e';
      g.fillRect(x + 2, y + 2, 11, 1);
      base.sprite(meta.presentes, gift, x + 3, y + 2);
      if (Math.floor(now / 520 + a.phase) % 2 === 0) base.spawn('brilho', a.x + 7, y - 2, now);
      return { x, y, w: 15, h: 16 };
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
      // Pulinho de alegria (carinho, comida) e balanço de "agora não" (carinho cedo demais).
      const hopT = a.hopAt ? (now - a.hopAt) / 380 : 1;
      const hop = hopT < 1 ? Math.round(Math.abs(Math.sin(hopT * Math.PI * 2)) * 4 * (1 - hopT)) : 0;
      const nopeT = a.nopeAt ? (now - a.nopeAt) / 320 : 1;
      const wiggle = nopeT < 1 ? Math.round(Math.sin(nopeT * Math.PI * 6) * 2 * (1 - nopeT)) : 0;
      const x = Math.round(a.x - sheet.w / 2) + wiggle;
      const y = Math.round(a.y - sheet.h) - hop;
      // O bicho ao lado do bicho: sombrinha no chão (encolhe quando ele pula).
      base.g.globalAlpha = 0.28;
      base.g.fillStyle = '#10200c';
      const shrink = hop > 1 ? 1 : 0;
      base.g.fillRect(Math.round(a.x - sheet.w / 2 + 1 + shrink), Math.round(a.y - 1), Math.round(sheet.w - 2 - shrink * 2), 2);
      base.g.globalAlpha = 1;
      // Os desenhos olham para a direita; para a esquerda, espelha.
      base.sprite(sheet, frame, x, y, { flip: a.dir < 0 && !spec.fixed });
      const tip = pet.ready ? tr('mini.bichos.tipReady', { name: pet.name }) : tr('mini.bichos.tip', { name: pet.name, bond: pet.bond, max: engineRef.data.minis.bichos.bondMax });
      base.region(`pet:${a.id}`, x - 1, y - 6, sheet.w + 2, sheet.h + 6, { pet: a.id, tip, hot: !pet.ready });
      // Laço do bicho (barrinha) ou, cheio, o presente balançando em cima dele.
      const top = y - 9;
      if (pet.ready) {
        const box = drawGift(a, top, pet, now);
        base.region(`gift:${a.id}`, box.x, box.y, box.w, box.h, { pet: a.id, gift: true, tip, hot: true });
      } else if (pet.bond > 0 || (a.bondFlashAt && now - a.bondFlashAt < 900)) drawBond(a, top, pet, now);
    }

    function drawChick(chick, i, now) {
      const sheet = spriteOf('pintinho');
      const frame = chick.walking ? Math.floor(now / 1000 * 8 + chick.phase) % 2 : 2;
      const x = Math.round(chick.x - sheet.w / 2);
      const hopT = chick.hopAt ? (now - chick.hopAt) / 300 : 1;
      const y = Math.round(chick.y - sheet.h) - (hopT < 1 ? Math.round(Math.sin(hopT * Math.PI) * 4) : 0);
      base.sprite(sheet, frame, x, y, { flip: chick.dir < 0 });
      base.region(`chick:${i}`, x - 1, y - 2, sheet.w + 2, sheet.h + 2, { chick: i, tip: tr('mini.bichos.chick'), hot: true });
    }

    // O quintal vivo: o varal balança, os lampiões (e a fogueira lá longe e a janela do galinheiro) tremem de luz, a casinha ao longe solta fumaça.
    function drawAmbient(now) {
      base.sprite(meta.varal, [0, 1, 2, 1][Math.floor(now / 420) % 4], 0, 0);
      meta.lampioes.forEach(([x, y], i) => {
        const flick = 0.5 + 0.5 * Math.sin(now / 130 + i * 2) * Math.sin(now / 370 + i);
        base.glow(x + 0.5, y + 1.5, 9, '#ffb040', 0.09 + 0.05 * flick);
      });
      base.glow(meta.fogueiraLonge[0], meta.fogueiraLonge[1], 8, '#ff8a2a', 0.09 + 0.05 * Math.sin(now / 90));
      base.glow(32, 40, 6, '#ffc060', 0.07 + 0.03 * Math.sin(now / 700));
      // Fumaça da casinha: quatro bolinhas que sobem, abrem e somem (sem estado: tudo sai do relógio).
      for (let k = 0; k < 4; k++) {
        const phase = (now / 1000 * 0.45 + k / 4) % 1;
        base.g.globalAlpha = (1 - phase) * 0.55;
        base.g.fillStyle = '#9a94b8';
        const size = phase < 0.4 ? 1 : 2;
        base.g.fillRect(Math.round(meta.casaLonge[0] + 7.5 + Math.sin(phase * 5 + k) * 2 + phase * 3), Math.round(meta.casaLonge[1] - 4 - phase * 11), size, size);
      }
      base.g.globalAlpha = 1;
    }

    // Por cima dos bichos: vagalumes e o ronco do gato.
    function drawAmbientFront(now) {
      base.fireflies({ x: 8, y: 54, w: 160, h: 44 }, 8, now);
      if (now - ambient.zzzAt > 2600 && animals.has('gato')) {
        ambient.zzzAt = now;
        base.spawn('zzz', meta.cama[0] + 4, meta.cama[1] - 15, now);
      }
    }

    // O grão sai da boca do saco em arco, cai no chão (levantando uma poeirinha) e fica lá esperando o bicho.
    function drawGrain(now) {
      const sheet = meta.presentes;
      const index = sheet.ids.indexOf('grao');
      for (const grain of grains) {
        const t = Math.min(1, (now - grain.born) / 430);
        const x = grain.from.x + (grain.x - grain.from.x) * t;
        const y = grain.from.y + (grain.y - grain.from.y) * t - Math.sin(t * Math.PI) * 18;
        if (t >= 1 && !grain.landed) {
          grain.landed = true;
          base.bits(grain.x, grain.y - 1, 4, now, { colors: ['#b8945a', '#d8b878', '#ffd21e'], speed: 16, up: 10, ms: 380 });
          base.spawn('poeira', grain.x - 2, grain.y - 3, now, { dx: 1 });
        }
        base.sprite(sheet, index, x - 4, y - 6);
      }
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
      drawAmbient(now);
      drawGrain(now);
      // Quem está mais embaixo na tela fica na frente.
      const drawables = [...info.pets.map(pet => ({ y: animal(pet.id).y, pet })), ...chicks.map((chick, i) => ({ y: chick.y, chick, i }))].sort((p, q) => p.y - q.y);
      for (const item of drawables) {
        if (item.pet) drawAnimal(animal(item.pet.id), item.pet, now);
        else drawChick(item.chick, item.i, now);
      }
      drawAmbientFront(now);
      // O saco de milho (parte do fundo) mostra na etiqueta quantos grãos sobraram.
      const [sx, sy] = meta.saco;
      base.text(String(info.grain), sx + 6, sy + 8, info.grain > 0 ? '#c8283a' : '#8a8d98');
      base.region('milho', sx - 1, sy - 2, 15, 18, { tip: tr('mini.bichos.grainTip'), hot: info.grain > 0 });
      base.drawParticles(now);
      base.drawSays(now);
      base.drawFx(now);
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
        if (found.gift && !state?.ready) return true;
        if (state?.ready) {
          const got = model.collect(found.pet);
          if (got.ok) {
            hooks.sound?.('moeda');
            base.spawn('estrela', a.x - 4, a.y - 20, now);
            base.spawn('brilho', a.x + 3, a.y - 22, now);
            // Festa do presente: confete dourado, dois anéis, um clarão e uma tremidinha; cada linha do prêmio pula na tela.
            base.bits(a.x, a.y - 26, 18, now, { colors: ['#ffd21e', '#fff0a0', '#ffffff', '#ff8aa8', '#8ed6ff'], speed: 48, up: 28, gravity: 90, ms: 950 });
            base.ring(a.x, a.y - 24, now, { from: 4, to: 24, color: '#ffe27a', ms: 560, thick: 2 });
            base.ring(a.x, a.y - 24, now, { from: 2, to: 14, color: '#ffffff', ms: 380 });
            base.flash('#fff2b0', 0.16, 240, now);
            base.shake(1, 260, now);
            a.hopAt = now;
            rewardLines(got.reward).forEach((line, i) => base.pop(line, a.x, a.y - 34 - i * 8, now, '#ffe27a', { ms: 1500 }));
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
          // O bicho dá um pulinho e solta corações; o laço pisca e o Amor que veio sobe do lado.
          a.hopAt = now;
          a.bondFlashAt = now;
          base.bits(a.x, a.y - 14, 6, now, { colors: ['#ff6a8a', '#ffb0c8', '#ffffff'], speed: 24, up: 22, ms: 650 });
          base.ring(a.x, a.y - 10, now, { from: 3, to: 12, color: '#ffb0c8', ms: 420 });
          if (got.love >= 0.5) base.pop(`+${Math.round(got.love)}`, a.x + 10, a.y - 28, now, '#ff9ab8');
        } else if (got.reason === 'cooldown') {
          // Ainda enjoado do último carinho: o bicho balança a cabeça (e o toque mostra que o clique chegou).
          base.spawn('exclama', a.x - 2, a.y - 16, now);
          a.nopeAt = now;
          base.tap(a.x, a.y - 8, now);
        }
        return true;
      }
      if (found?.chick !== undefined) {
        const chick = chicks[found.chick];
        hooks.sound?.('pintinho');
        base.spawn('coracao', chick.x - 2, chick.y - 10, now);
        base.bits(chick.x, chick.y - 6, 3, now, { colors: ['#ffd21e', '#fff0a0'], speed: 16, up: 14, ms: 450 });
        chick.hopAt = now;
        base.say(tr(`fx.bichos.pintinho.${found.chick % 2}`), chick.x, chick.y - 16, now, '#fff8e8');
        return true;
      }
      // Chão: um grão de milho para o bicho mais perto que gosta de milho.
      const point = base.toArt(clientX, clientY);
      if (point.y < ZONE.y0 - 8 || point.y > H - 2) return false;
      const info = model.info();
      const [sx, sy] = meta.saco;
      if (info.grain <= 0) {
        hooks.sound?.('erro');
        base.pop(tr('fx.bichos.noGrain'), sx + 10, sy - 6, now, '#ff8a8a');
        base.tap(point.x, point.y, now);
        return true;
      }
      const eaters = info.pets.map(pet => animals.get(pet.id)).filter(a => a && a.spec.eats && !a.eating);
      if (!eaters.length) { base.tap(point.x, point.y, now); return false; }
      const where = { x: Math.min(ZONE.x1, Math.max(ZONE.x0, point.x)), y: Math.min(ZONE.y1, Math.max(ZONE.y0, point.y)) };
      const chosen = eaters.sort((p, q) => Math.hypot(p.x - where.x, p.y - where.y) - Math.hypot(q.x - where.x, q.y - where.y))[0];
      if (!model.feed(chosen.id).ok) return true;
      const grain = { x: where.x, y: where.y, eatAt: 0, born: now, from: { x: sx + 6, y: sy + 1 }, landed: false };
      grains.push(grain);
      chosen.eating = grain;
      hooks.sound?.('clique');
      base.bits(sx + 6, sy, 4, now, { colors: ['#ffd21e', '#fff0a0'], speed: 14, up: 18, ms: 420 });
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
        if (a) {
          base.spawn('brilho', a.x, a.y - 18, now);
          base.bits(a.x, a.y - 20, 10, now, { colors: ['#ffd21e', '#fff0a0', '#ffffff'], speed: 30, up: 18, ms: 700 });
          base.ring(a.x, a.y - 18, now, { from: 3, to: 16, color: '#ffe27a', ms: 480 });
          a.hopAt = now;
          hooks.sound?.('aviso');
        }
      }
    }

    function probe() {
      return { ...base.probeBase(), animals: animals.size, chicks: chicks.length, grains: grains.length };
    }

    return { size: base.size, setScale: base.setScale, draw, hit: base.hit, click, status, onEvents, probe };
  }

  root.ArraiaJanelas.registerView('bichos', create);
})(typeof globalThis !== 'undefined' ? globalThis : this);
