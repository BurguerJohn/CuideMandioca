// Fogueira de Perto: clique na lenha para pôr no fogo, num pacote da faixa de baixo para escolher a comida, num espeto livre para pôr a comida, na comida
// pronta (ela espera, nunca queima) para comer, e no fogo para pular a fogueira. O motor está em src/mini-fogueira.js; o fogo é o mesmo sprite da festa.
(function (root) {
  'use strict';

  const Base = root.ArraiaJanelaBase;
  const compact = n => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(Math.round(n)));
  const STATE_INDEX = { cru: 0, dourando: 1, pronto: 2 };
  const HOP_MS = 700;
  const FLIGHT_MS = 520;
  // Os vaga-lumes: cada um anda numa curva própria e pisca.
  const FIREFLIES = [[34, 52, 0], [58, 66, 1.7], [88, 44, 3.1], [136, 50, 4.4], [170, 62, 2.3], [196, 48, 5.2], [120, 70, 0.9]];

  function create(canvas, bundle, hooks = {}) {
    const meta = bundle.janelas.fogueira;
    const W = meta.w;
    const H = meta.h;
    const base = Base.create(canvas, bundle, { width: W, height: H, sound: hooks.sound, images: [meta.fundo.image, meta.frente.image, meta.comidas.image,
      ...Object.values(bundle.fires).map(entry => entry.image), bundle.scenery.mandioquinha.image] });
    const tr = hooks.t || Base.tr;
    let engineRef = null;
    let jump = null;
    let smokeAt = 0;
    const flights = [];                              // comidas voando do espeto até quem vai comer
    const logs = [];                                 // lenha voando da pilha até o fogo
    const feel = { flare: -1e9 };                    // o fogo acabou de ganhar lenha (a chama cresce e o termômetro pisca)
    const hops = meta.bancos.map(() => 0);           // quando cada espectador pulou (comeu) pela última vez
    const steamAt = new Map();
    const nameOf = id => engineRef?.data.minis.fogueira.foods.find(entry => entry.id === id)?.name || id;
    const benchOf = slot => (slot < 2 ? 0 : 1);
    // Onde cada espectador fica (sentado no banco) e a boca dele, para onde a comida voa.
    const seat = i => ({ x: meta.bancos[i][0] + 12, y: meta.bancos[i][1] + 2 });

    function fireLevel(heat, min) {
      if (heat < min) return -1;
      return heat < 35 ? 0 : heat < 55 ? 1 : heat < 75 ? 2 : heat < 92 ? 3 : 4;
    }

    function rewardLines(reward) {
      const lines = [];
      if (reward.bellyFull) lines.push(tr('mini.gain.bellyFull', { h: reward.bellyFull }));
      if (reward.cheer) lines.push(tr('gain.cheer', { n: compact(reward.cheer) }));
      if (reward.wood) lines.push(tr('gain.wood', { n: reward.wood }));
      if (reward.belly) lines.push(tr('mini.gain.belly', { n: Math.round(reward.belly) }));
      if (reward.love) lines.push(tr('mini.gain.love', { n: Math.round(reward.love) }));
      return lines;
    }

    // Uma elipse de pixels (o brilho em volta da comida pronta).
    function glow(cx, cy, rx, ry, color, alpha) {
      base.g.globalAlpha = alpha;
      base.g.fillStyle = color;
      for (let dy = -ry; dy <= ry; dy++) {
        const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
        base.g.fillRect(Math.round(cx) - half, Math.round(cy) + dy, half * 2 + 1, 1);
      }
      base.g.globalAlpha = 1;
    }

    function drawFireflies(now) {
      for (const [x, y, phase] of FIREFLIES) {
        const t = now / 1000;
        const fx = x + Math.sin(t * 0.7 + phase) * 9 + Math.sin(t * 1.9 + phase * 2) * 3;
        const fy = y + Math.cos(t * 0.5 + phase) * 6;
        const on = 0.35 + 0.65 * Math.max(0, Math.sin(t * 2.2 + phase * 3));
        glow(fx, fy, 3, 2, '#ffe27a', 0.14 * on);
        base.g.globalAlpha = on;
        base.g.fillStyle = '#fff6b0';
        base.g.fillRect(Math.round(fx), Math.round(fy), 1, 1);
        base.g.globalAlpha = 1;
      }
    }

    // O fogo no tamanho do calor (os mesmos sprites da festa); apagado, só brasa.
    function drawFire(info, now) {
      const [fx, fy] = meta.fogo;
      const level = fireLevel(info.heat, engineRef.data.minis.fogueira.minHeat);
      if (level < 0) {
        base.g.fillStyle = '#7a1e0e';
        for (const [dx, dy] of [[-12, -4], [-4, -6], [5, -5], [12, -3], [0, -3]]) base.g.fillRect(fx + dx, fy + dy, 3, 2);
        if (info.heat > 0 && Math.floor(now / 400) % 2 === 0) { base.g.fillStyle = '#ff7a1e'; base.g.fillRect(fx - 4, fy - 6, 2, 1); base.g.fillRect(fx + 6, fy - 5, 2, 1); }
        if (info.heat > 0 && now - smokeAt > 900) { smokeAt = now; base.spawn('fumaca', fx - 2, fy - 8, now); }
        return undefined;
      }
      const sheet = bundle.fires[String(level)];
      const frame = Math.floor(now / 1000 * sheet.fps) % sheet.frames;
      const top = fy - sheet.h + 4;
      // A luz do fogo no chão em volta.
      glow(fx, fy + 4, 34 + level * 6, 12 + level * 2, '#ff9a3a', 0.07 + level * 0.015);
      base.sprite(sheet, frame, fx - sheet.w / 2, top);
      if (info.heat > 30 && Math.floor(now / 90) % 3 === 0) base.spawn('faisca', fx + ((now % 17) - 8), fy - sheet.h * 0.7, now);
      return top;
    }

    // O espeto: uma vara fincada no chão (com montinho de terra) apontando para o fogo, e a comida na ponta.
    function drawStick(slot, stick, info, now) {
      const [hx, hy] = meta.cabos[slot];
      const [tx, ty] = meta.pontas[slot];
      const dx = Math.sign(meta.fogo[0] - hx);
      base.line(hx, hy, tx + dx * 9, ty + 4, '#3e2410');
      base.line(hx, hy - 1, tx + dx * 9, ty + 3, '#8a5a34');
      base.line(hx, hy - 2, tx + dx * 9, ty + 2, '#c8985c');
      base.g.fillStyle = '#5a4028';
      base.g.fillRect(hx - 2, hy, 5, 2);
      base.g.fillStyle = '#7a5a38';
      base.g.fillRect(hx - 1, hy - 1, 3, 1);
      const cw = meta.comidas.w;
      const ch = meta.comidas.h;
      let tip;
      if (!stick) {
        base.g.globalAlpha = 0.4 + 0.2 * Math.sin(now / 400 + slot);
        base.sprite(meta.comidas, meta.comidas.ids.indexOf(info.selected) * 3 + 0, tx - cw / 2, ty - ch / 2);
        base.g.globalAlpha = 1;
        tip = tr('mini.fogueira.tipEmpty', { food: nameOf(info.selected) });
      } else {
        const index = meta.comidas.ids.indexOf(stick.food) * 3 + STATE_INDEX[stick.state];
        if (stick.ready) {
          // Pronta: brilha, balança de leve e uma bolha com coração chama para comer.
          const bob = Math.round(Math.sin(now / 260 + slot) * 1);
          glow(tx, ty, 17, 10, '#fff0a0', 0.16 + 0.1 * Math.sin(now / 300 + slot));
          base.sprite(meta.comidas, index, tx - cw / 2, ty - ch / 2 + bob);
          // A bolha fica em cima dos espetos de trás e ao lado dos da frente (para não cobrir a comida do espeto de trás).
          const front = slot === 1 || slot === 2;
          drawBubble(front ? tx + (slot === 1 ? -24 : 24) : tx, (front ? ty - 3 : ty - ch / 2 - 9) + bob + Math.round(Math.sin(now / 200 + slot) * 1.5));
          if (Math.floor(now / 480 + slot) % 3 === 0) base.spawn('brilho', tx - 8 + ((now / 7) % 16), ty - 8, now);
          if (now - (steamAt.get(slot) || 0) > 700) { steamAt.set(slot, now); base.spawn('vapor', tx - 2 + ((now % 5) - 2), ty - 10, now); }
          tip = tr('mini.fogueira.tipStick', { food: nameOf(stick.food), state: tr('mini.fogueira.state.pronto') }) + tr('mini.fogueira.tipEat');
        } else {
          base.sprite(meta.comidas, index, tx - cw / 2, ty - ch / 2);
          if (stick.state === 'dourando' && info.burning && now - (steamAt.get(slot) || 0) > 1600) { steamAt.set(slot, now); base.spawn('vapor', tx - 2, ty - 10, now); }
          // O quanto já assou: barrinha em cima da comida.
          base.g.fillStyle = '#26242e';
          base.g.fillRect(tx - 11, ty - ch / 2 - 5, 22, 4);
          base.g.fillStyle = stick.progress < 0.5 ? '#ffb84a' : '#ff8a3a';
          base.g.fillRect(tx - 10, ty - ch / 2 - 4, Math.max(1, Math.round(20 * stick.progress)), 2);
          tip = tr('mini.fogueira.tipStick', { food: nameOf(stick.food), state: tr(`mini.fogueira.state.${stick.state}`) }) +
            (stick.left === null ? tr('mini.fogueira.tipNoHeat') : tr('mini.fogueira.tipLeft', { n: stick.left }));
        }
      }
      base.region(`espeto:${slot}`, tx - 14, ty - 14, 28, 24, { espeto: slot, tip, hot: !stick || stick.ready });
    }

    // A bolha branca com um coração vermelho (a comida está pronta: é só comer).
    function drawBubble(cx, cy) {
      const g = base.g;
      g.fillStyle = '#26242e';
      g.fillRect(cx - 7, cy - 6, 15, 12);
      g.fillRect(cx - 1, cy + 6, 3, 2);
      g.fillStyle = '#ffffff';
      g.fillRect(cx - 6, cy - 5, 13, 10);
      g.fillRect(cx - 1, cy + 5, 3, 2);
      g.fillStyle = '#e8302c';
      for (const [x, y, w] of [[-4, -3, 3], [1, -3, 3], [-5, -2, 11], [-5, -1, 11], [-4, 0, 9], [-3, 1, 7], [-2, 2, 5], [-1, 3, 3]]) g.fillRect(cx + x, cy + y, w, 1);
      g.fillStyle = '#ff9a8a';
      g.fillRect(cx - 4, cy - 2, 2, 1);
    }

    // O termômetro do fogo (tubo com bulbo): azul sem fogo, laranja e vermelho com fogo; a marca branca é onde a comida começa a assar.
    function drawGauge(info, now) {
      const [x0, y0, x1, y1] = meta.medidor;
      const g = base.g;
      const cfg = engineRef.data.minis.fogueira;
      const tx = x0 + 3;
      const top = y0 + 4;
      const bottom = y1 - 8;
      const height = bottom - top;
      const shown = base.ease('heat', info.heat, now, 5);
      g.fillStyle = '#26242e';
      g.fillRect(tx - 1, top - 1, 8, height + 3);
      g.fillRect(tx - 2, bottom - 1, 10, 10);
      g.fillStyle = '#4a4858';
      g.fillRect(tx, top, 6, height + 1);
      const color = info.heat < cfg.minHeat ? '#4a78d8' : info.heat < 60 ? '#ffb84a' : '#ff5a2a';
      g.fillStyle = color;
      g.fillRect(tx - 1, bottom, 8, 7);
      g.fillRect(tx, bottom - 1, 6, 1);
      const fill = Math.round(height * shown / info.heatMax);
      g.fillRect(tx + 1, bottom - fill, 4, fill + 1);
      g.fillStyle = '#ffffff';
      g.fillRect(tx + 1, bottom + 1, 2, 2);
      const mark = bottom - Math.round(height * cfg.minHeat / info.heatMax);
      // Tem comida no fogo mas ele está frio demais para assar: a marca pisca em vermelho (ponha lenha).
      const stalled = info.heat < cfg.minHeat && info.sticks.some(stick => stick && !stick.ready);
      g.fillStyle = stalled && Math.floor(now / 260) % 2 === 0 ? '#ff5a5a' : '#ffffff';
      g.fillRect(tx - 2, mark, 10, 1);
      // Lenha nova: o tubo brilha por um instante.
      const pulse = now - feel.flare;
      if (pulse < 420) {
        g.globalAlpha = 0.6 * (1 - pulse / 420);
        g.fillStyle = '#fff2b0';
        g.fillRect(tx - 1, top - 1, 8, height + 3);
        g.globalAlpha = 1;
      }
      // A chama em cima do termômetro.
      g.fillStyle = info.heat < cfg.minHeat ? '#7a8aa8' : '#ffb84a';
      for (const [dx, dy, w] of [[2, 0, 2], [1, 1, 4], [1, 2, 4], [0, 3, 6], [1, 4, 4]]) g.fillRect(tx + dx, y0 - 5 + dy, w, 1);
      if (stalled) base.glow(tx + 3, mark, 8, '#ff5a5a', 0.1 + 0.06 * Math.sin(now / 130));
      base.region('termometro', x0 - 2, y0 - 8, x1 - x0 + 8, y1 - y0 + 10, { tip: tr('mini.fogueira.tipHeat', { n: Math.round(info.heat), min: cfg.minHeat }) });
    }

    function drawSpectators(now) {
      const small = bundle.scenery.mandioquinha;
      meta.bancos.forEach((_, i) => {
        const { x, y } = seat(i);
        const hopping = now - hops[i] < HOP_MS ? Math.abs(Math.sin((now - hops[i]) / 110)) * 5 : 0;
        const jumping = jump && now - jump.t0 < 900 ? Math.abs(Math.sin(now / 90)) * 5 : 0;
        base.sprite(small, Math.floor(now / 600 + i) % 2, x - small.w / 2, y - small.h - Math.max(hopping, jumping), { flip: i === 1 });
      });
    }

    function drawFlights(now) {
      const small = bundle.scenery.mandioquinha;
      for (let i = flights.length - 1; i >= 0; i--) {
        const f = flights[i];
        const t = (now - f.t0) / FLIGHT_MS;
        if (t >= 1) {
          // Chegou: o espectador comeu, pula de alegria e o prêmio aparece.
          const to = seat(f.bench);
          hops[f.bench] = now;
          base.spawn('coracao', to.x - 4, to.y - small.h - 4, now);
          base.spawn('estrela', to.x + 2, to.y - small.h - 10, now);
          base.bits(to.x, to.y - small.h, 14, now, { colors: ['#ffd21e', '#ff8aa8', '#ffffff', '#9ef05a', '#ff8a12'], speed: 44, up: 24, gravity: 90, ms: 850 });
          base.ring(to.x, to.y - small.h * 0.6, now, { from: 3, to: 20, color: '#ffe27a', ms: 500, thick: 2 });
          base.pop(tr('mini.fogueira.eat'), to.x, to.y - small.h - 14, now, '#9ef05a', { scale: 2, ms: 1200, rise: 10 });
          base.tag(f.lines.map(line => [line, '#ffe27a']), to.x, to.y - small.h - 24, now);
          base.shake(0.8, 200, now);
          flights.splice(i, 1);
          continue;
        }
        const to = seat(f.bench);
        const x = f.from[0] + (to.x - f.from[0]) * t;
        const y = f.from[1] + (to.y - small.h * 0.6 - f.from[1]) * t - Math.sin(Math.PI * t) * 26;
        base.sprite(meta.comidas, f.index, x - meta.comidas.w / 2, y - meta.comidas.h / 2);
      }
    }

    // Uma tora sai da pilha em arco e cai no fogo: faísca, anel, clarão laranja e o fogo cresce.
    function drawLogs(now) {
      for (let i = logs.length - 1; i >= 0; i--) {
        const l = logs[i];
        const t = (now - l.t0) / 380;
        if (t >= 1) {
          logs.splice(i, 1);
          feel.flare = now;
          base.bits(meta.fogo[0], meta.fogo[1] - 8, 14, now, { colors: ['#ffd21e', '#ff8a12', '#ff5a2a', '#fff0a0'], speed: 46, arc: [-2.8, -0.35], gravity: 80, ms: 800 });
          base.ring(meta.fogo[0], meta.fogo[1] - 6, now, { from: 3, to: 18, color: '#ffb84a', ms: 440 });
          base.flash('#ff9a3a', 0.1, 220, now, { x: meta.fogo[0] - 30, y: meta.fogo[1] - 50, w: 60, h: 56 });
          continue;
        }
        const x = l.from[0] + (meta.fogo[0] - l.from[0]) * t;
        const y = l.from[1] + (meta.fogo[1] - 6 - l.from[1]) * t - Math.sin(Math.PI * t) * 28;
        base.g.fillStyle = '#26242e';
        base.g.fillRect(Math.round(x) - 5, Math.round(y) - 2, 11, 5);
        base.g.fillStyle = '#8a5a34';
        base.g.fillRect(Math.round(x) - 4, Math.round(y) - 1, 9, 3);
        base.g.fillStyle = '#c88a50';
        base.g.fillRect(Math.round(x) - 4, Math.round(y) - 1, 9, 1);
        base.g.fillStyle = '#e8c488';
        base.g.fillRect(Math.round(x) + 4, Math.round(y) - 1, 1, 3);
      }
    }

    function draw(engine, now) {
      engineRef = engine;
      const info = engine.mini('fogueira').info();
      const cfg = engine.data.minis.fogueira;
      base.clear();
      base.clearRegions();
      base.picture(meta.fundo.image);
      drawFireflies(now);
      drawSpectators(now);
      // O fogo, as pedras da frente, e os espetos por cima: a comida assando fica na frente das chamas, não escondida atrás delas.
      const flareT = now - feel.flare;
      if (flareT < 700) base.glow(meta.fogo[0], meta.fogo[1] - 10, 30, '#ff8a2a', 0.2 * (1 - flareT / 700));
      const fireTop = drawFire(info, now);
      base.picture(meta.frente.image);
      const hitTop = Math.min(meta.fogo[1] - 40, fireTop ?? meta.fogo[1] - 40);
      base.region('fogo', meta.fogo[0] - 22, hitTop, 44, meta.fogo[1] + 6 - hitTop, { tip: info.canJump ? tr('mini.fogueira.tipFire')
        : info.heat < cfg.jumpMinHeat ? tr('mini.fogueira.tipFireCold') : tr('mini.fogueira.tipFireWait', { n: Math.ceil(info.jumpWait) }), hot: info.canJump });
      info.sticks.forEach((stick, slot) => drawStick(slot, stick, info, now));
      // Quem pula passa por cima do fogo.
      if (jump) {
        const small = bundle.scenery.mandioquinha;
        const t = (now - jump.t0) / 900;
        if (t >= 1) {
          base.spawn('estrela', jump.to - 4, meta.fogo[1] - 12, now);
          base.spawn('coracao', jump.to, meta.fogo[1] - 16, now);
          jump = null;
        } else {
          const from = seat(0).x;
          const x = from + (jump.to - from) * t;
          const y = meta.fogo[1] - 8 - Math.sin(Math.PI * t) * 46;
          base.sprite(small, Math.floor(now / 120) % 2, x - 7, y - 20, { w: 14, h: 20, flip: false });
        }
      }
      drawGauge(info, now);
      // Lenha (a pilha clicável, com o que sobrou) e o menu de comidas.
      const [lx0, ly0, lx1, ly1] = meta.lenha;
      base.text(String(info.wood), (lx0 + lx1) / 2, ly0 - 8, info.wood > 0 ? '#ffe27a' : '#9a9ca8');
      base.region('lenha', lx0, ly0, lx1 - lx0, ly1 - ly0, { tip: tr('mini.fogueira.tipWood', { n: info.wood }), hot: info.wood > 0 && info.heat < info.heatMax - 1 });
      info.foods.forEach((item, i) => {
        const x = meta.menuX[i];
        const chosen = info.selected === item.id;
        if (chosen) {
          base.g.fillStyle = '#ffe27a';
          base.g.fillRect(x - 1, meta.menu + 1, 29, H - meta.menu - 3);
          base.g.fillStyle = '#8a5a2c';
          base.g.fillRect(x, meta.menu + 2, 27, H - meta.menu - 5);
        }
        base.sprite(meta.comidas, i * 3 + 2, x + 1, meta.menu + 2);
        base.region(`comida:${item.id}`, x - 1, meta.menu + 1, 29, H - meta.menu - 3, { comida: item.id, tip: tr('mini.fogueira.tipFood', { food: nameOf(item.id) }), hot: !chosen });
      });
      drawLogs(now);
      drawFlights(now);
      base.drawParticles(now);
      base.drawSays(now);
      base.drawFx(now);
      return true;
    }

    function click(clientX, clientY, now = 0) {
      if (!engineRef) return false;
      const model = engineRef.mini('fogueira');
      const found = base.hit(clientX, clientY);
      if (!found) return false;
      if (found.id === 'lenha') {
        const got = model.addWood();
        const [lx0, ly0] = meta.lenha;
        if (got.ok) {
          hooks.sound?.('lenha');
          for (let k = 0; k < 3; k++) base.spawn('faisca', meta.fogo[0] - 6 + k * 6, meta.fogo[1] - 14, now);
          logs.push({ t0: now, from: [lx0 + 14, ly0 + 6] });
          base.bits(lx0 + 14, ly0 + 4, 4, now, { colors: ['#c88a50', '#8a5a34', '#e8c488'], speed: 16, up: 12, gravity: 60, ms: 400 });
        } else {
          hooks.sound?.('erro');
          base.say(tr(got.reason === 'wood' ? 'mini.fogueira.noWood' : 'mini.fogueira.full'), lx0 + 18, ly0 - 14, now, '#ff9a8a');
          base.tap(found.point.x, found.point.y, now);
        }
        return true;
      }
      if (found.comida) { if (model.select(found.comida)) hooks.sound?.('clique'); return true; }
      if (found.id === 'fogo') {
        const got = model.jump();
        if (got.ok) {
          hooks.sound?.('pulo');
          jump = { t0: now, to: seat(1).x };
          base.pop(tr('mini.fogueira.jumped'), meta.fogo[0], meta.fogo[1] - 56, now, '#fff8e8', { scale: 2, ms: 1400, rise: 8 });
          base.tag(rewardLines(got.reward).map(line => [line, '#ffe27a']), meta.fogo[0], meta.fogo[1] - 66, now);
          // O fogo sopra uma coluna de faíscas para o alto e a janela inteira dá uma sacudida.
          base.bits(meta.fogo[0], meta.fogo[1] - 12, 22, now, { colors: ['#ffd21e', '#ff8a12', '#ff5a2a', '#fff0a0'], speed: 52, arc: [-2.4, -0.75], gravity: 60, ms: 1000 });
          base.ring(meta.fogo[0], meta.fogo[1] - 6, now, { from: 4, to: 28, color: '#ffb84a', ms: 560, thick: 2 });
          base.flash('#ffb04a', 0.18, 300, now);
          base.shake(1.4, 320, now);
        } else {
          hooks.sound?.('erro');
          base.say(tr(got.reason === 'cold' ? 'mini.fogueira.cold' : 'mini.fogueira.waitJump'), meta.fogo[0], meta.fogo[1] - 40, now, '#ff9a8a');
          base.tap(found.point.x, found.point.y, now);
        }
        return true;
      }
      if (found.espeto === undefined) return true;
      const slot = found.espeto;
      const [tx, ty] = meta.pontas[slot];
      const stick = model.info().sticks[slot];
      if (!stick) {
        if (model.put(slot).ok) {
          hooks.sound?.('clique');
          base.spawn('poeira', tx, ty, now, { dx: 1 });
          base.ring(tx, ty, now, { from: 2, to: 10, color: '#fff8e8', ms: 340 });
          base.bits(tx, ty, 5, now, { colors: ['#ffe27a', '#fff8e8'], speed: 18, up: 12, gravity: 60, ms: 450 });
        }
        return true;
      }
      if (!stick.ready) { hooks.sound?.('erro'); base.say(tr('mini.fogueira.notYet'), tx, ty - 18, now, '#8ed6ff'); base.tap(tx, ty, now); return true; }
      const got = model.eat(slot);
      if (got.ok) {
        hooks.sound?.('carinho');
        const index = meta.comidas.ids.indexOf(stick.food) * 3 + 2;
        // A comida voa até o espectador do banco mais perto; o prêmio aparece quando ela chega.
        flights.push({ index, from: [tx, ty], bench: benchOf(slot), t0: now, lines: rewardLines(got.reward) });
        base.spawn('brilho', tx - 2, ty - 8, now);
        base.ring(tx, ty, now, { from: 3, to: 14, color: '#ffe27a', ms: 400 });
        base.bits(tx, ty, 8, now, { colors: ['#ffd21e', '#fff0a0', '#ffffff'], speed: 28, up: 16, gravity: 70, ms: 550 });
      }
      return true;
    }

    function status(engine) {
      const info = engine.mini('fogueira').info();
      return `${tr('mini.fogueira.count', { n: info.sticks.filter(Boolean).length })} · ${tr('mini.fogueira.heat', { n: Math.round(info.heat) })}`;
    }

    function onEvents(engine, events, now) {
      engineRef = engine;
      for (const event of events) {
        if (event.type !== 'mini' || event.mini !== 'fogueira') continue;
        if (event.kind === 'ready') {
          hooks.sound?.('brilho');
          hooks.toast?.(tr('mini.fogueira.readyToast', { food: nameOf(event.food) }));
          const [tx, ty] = meta.pontas[event.slot] || meta.fogo;
          base.spawn('estrela', tx - 3, ty - 10, now);
          // Ficou no ponto: estouro de brilhos e o aviso em cima do espeto.
          base.ring(tx, ty - 4, now, { from: 3, to: 16, color: '#9ef05a', ms: 520, thick: 2 });
          base.bits(tx, ty - 4, 10, now, { colors: ['#ffd21e', '#fff0a0', '#9ef05a'], speed: 30, up: 14, gravity: 40, ms: 700 });
          base.pop(`${tr('mini.fogueira.state.pronto')}!`, tx, ty - 22, now, '#9ef05a', { ms: 1300 });
        }
      }
    }

    function probe() {
      return { ...base.probeBase(), jumping: !!jump, flights: flights.length };
    }

    return { size: base.size, setScale: base.setScale, draw, hit: base.hit, click, status, onEvents, probe };
  }

  root.ArraiaJanelas.registerView('fogueira', create);
})(typeof globalThis !== 'undefined' ? globalThis : this);
