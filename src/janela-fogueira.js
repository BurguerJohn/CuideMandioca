// Fogueira de Perto: clique na lenha para pôr no fogo, num pacote da faixa de baixo para escolher a comida, num espeto livre para
// pôr a comida, no espeto com comida para virar (cedo) ou tirar (no ponto), e no fogo para pular a fogueira. O motor está em
// src/mini-fogueira.js; o fogo é o mesmo sprite da festa.
(function (root) {
  'use strict';

  const Base = root.ArraiaJanelaBase;
  const W = 176;
  const H = 112;
  const compact = n => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(Math.round(n)));
  const STATE_INDEX = { cru: 0, dourando: 1, ponto: 2, passou: 2, queimado: 3 };

  function create(canvas, bundle, hooks = {}) {
    const meta = bundle.janelas.fogueira;
    const base = Base.create(canvas, bundle, { width: W, height: H, sound: hooks.sound, images: [meta.fundo.image, meta.comidas.image,
      ...Object.values(bundle.fires).map(entry => entry.image), bundle.scenery.mandioquinha.image] });
    const tr = hooks.t || Base.tr;
    let engineRef = null;
    let jump = null;
    let smokeAt = 0;
    const nameOf = id => engineRef?.data.minis.fogueira.foods.find(entry => entry.id === id)?.name || id;

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

    // O fogo no tamanho do calor (os mesmos sprites da festa); apagado, só brasa.
    function drawFire(info, now) {
      const [fx, fy] = meta.fogo;
      const level = fireLevel(info.heat, engineRef.data.minis.fogueira.minHeat);
      if (level < 0) {
        base.g.fillStyle = '#7a1e0e';
        for (const [dx, dy] of [[-12, -4], [-4, -6], [5, -5], [12, -3], [0, -3]]) base.g.fillRect(fx + dx, fy + dy, 3, 2);
        if (info.heat > 0 && Math.floor(now / 400) % 2 === 0) { base.g.fillStyle = '#ff7a1e'; base.g.fillRect(fx - 4, fy - 6, 2, 1); base.g.fillRect(fx + 6, fy - 5, 2, 1); }
        if (info.heat > 0 && now - smokeAt > 900) { smokeAt = now; base.spawn('fumaca', fx - 2, fy - 8, now); }
        return;
      }
      const sheet = bundle.fires[String(level)];
      const frame = Math.floor(now / 1000 * sheet.fps) % sheet.frames;
      base.sprite(sheet, frame, fx - sheet.w / 2, fy - sheet.h + 4);
      if (info.heat > 30 && Math.floor(now / 90) % 3 === 0) base.spawn('faisca', fx + ((now % 17) - 8), fy - sheet.h * 0.7, now);
    }

    function drawStick(slot, stick, info, now) {
      const [hx, hy] = meta.cabos[slot];
      const [tx, ty] = meta.pontas[slot];
      // O espeto: da mão até a ponta.
      base.line(hx, hy, tx, ty, '#8a5a34');
      base.line(hx, hy - 1, tx, ty - 1, '#b07a48');
      let tip;
      if (!stick) {
        base.g.globalAlpha = 0.45 + 0.25 * Math.sin(now / 400 + slot);
        base.sprite(meta.comidas, meta.comidas.ids.indexOf(info.selected) * 4 + 2, tx - 8, ty - 5);
        base.g.globalAlpha = 1;
        tip = tr('mini.fogueira.tipEmpty', { food: nameOf(info.selected) });
      } else {
        const index = meta.comidas.ids.indexOf(stick.food) * 4 + STATE_INDEX[stick.state];
        // Vira: a comida balança um pouco; no ponto, brilha.
        const wobble = stick.state === 'ponto' && Math.floor(now / 300) % 2 === 0 ? -1 : 0;
        base.sprite(meta.comidas, index, tx - 8, ty - 5 + wobble);
        if (stick.state === 'ponto' && Math.floor(now / 500) % 3 === 0) base.spawn('brilho', tx - 2, ty - 12, now);
        if (stick.state === 'queimado' && Math.floor(now / 350) % 3 === 0) base.spawn('fumaca', tx - 2, ty - 10, now);
        // Quanto já assou: barrinha em cima da comida.
        if (!stick.burnt) {
          const cfg = engineRef.data.minis.fogueira;
          base.g.fillStyle = '#26242e';
          base.g.fillRect(tx - 8, ty - 10, 16, 3);
          base.g.fillStyle = stick.progress < cfg.perfect[0] ? '#ffb84a' : stick.progress <= cfg.perfect[1] ? '#9ef05a' : '#ff5a5a';
          base.g.fillRect(tx - 7, ty - 9, Math.round(14 * Math.min(1, stick.progress / cfg.burnAt)), 1);
          // O pedacinho "no ponto" da barra.
          base.g.fillStyle = '#ffffff';
          base.g.fillRect(tx - 7 + Math.round(14 * cfg.perfect[0] / cfg.burnAt), ty - 9, 1, 1);
        }
        const state = tr(`mini.fogueira.state.${stick.state}`);
        const action = stick.burnt ? 'mini.fogueira.tipTrash' : stick.progress >= engineRef.data.minis.fogueira.perfect[0] ? 'mini.fogueira.tipTake'
          : stick.progress >= 0.1 && stick.progress <= 0.9 && stick.turns < engineRef.data.minis.fogueira.turnMax ? 'mini.fogueira.tipTurn' : 'mini.fogueira.tipWait';
        tip = tr('mini.fogueira.tipStick', { food: nameOf(stick.food), state }) + tr(action);
      }
      base.region(`espeto:${slot}`, tx - 10, ty - 12, 20, 18, { espeto: slot, tip });
    }

    function drawThermometer(info) {
      const x = 6;
      const y0 = 44;
      const h = 54;
      base.g.fillStyle = '#26242e';
      base.g.fillRect(x - 1, y0 - 1, 8, h + 2);
      base.g.fillStyle = '#4a4858';
      base.g.fillRect(x, y0, 6, h);
      const fill = Math.round(h * info.heat / info.heatMax);
      base.g.fillStyle = info.heat < engineRef.data.minis.fogueira.minHeat ? '#4a78d8' : info.heat < 60 ? '#ffb84a' : '#ff5a2a';
      base.g.fillRect(x, y0 + h - fill, 6, fill);
      // Marca de "dá para assar".
      const mark = y0 + h - Math.round(h * engineRef.data.minis.fogueira.minHeat / info.heatMax);
      base.g.fillStyle = '#ffffff';
      base.g.fillRect(x - 1, mark, 8, 1);
      base.region('termometro', x - 2, y0 - 2, 12, h + 4, { tip: tr('mini.fogueira.tipHeat', { n: Math.round(info.heat), min: engineRef.data.minis.fogueira.minHeat }) });
    }

    function draw(engine, now) {
      engineRef = engine;
      const info = engine.mini('fogueira').info();
      base.clear();
      base.clearRegions();
      base.picture(meta.fundo.image);
      // Os dois espectadores nos bancos (pulam de alegria quando alguém pula a fogueira).
      const small = bundle.scenery.mandioquinha;
      [[14, 68], [158, 70]].forEach(([x, y], i) => base.sprite(small, Math.floor(now / 600 + i) % 2, x, y - small.h - (jump && now - jump.t0 < 900 ? Math.abs(Math.sin(now / 90)) * 5 : 0), { flip: i === 1 }));
      base.region('fogo', meta.fogo[0] - 26, meta.fogo[1] - 40, 52, 46, { tip: info.canJump ? tr('mini.fogueira.tipFire')
        : info.heat < engine.data.minis.fogueira.jumpMinHeat ? tr('mini.fogueira.tipFireCold') : tr('mini.fogueira.tipFireWait', { n: Math.ceil(info.jumpWait) }) });
      // O fogo primeiro e os espetos por cima: a comida assando fica na frente das chamas, não escondida atrás delas.
      drawFire(info, now);
      info.sticks.forEach((stick, slot) => drawStick(slot, stick, info, now));
      // Quem pula passa por cima do fogo.
      if (jump) {
        const t = (now - jump.t0) / 900;
        if (t >= 1) {
          base.spawn('estrela', jump.to - 4, meta.fogo[1] - 12, now);
          base.spawn('coracao', jump.to, meta.fogo[1] - 16, now);
          jump = null;
        } else {
          const x = 36 + 104 * t;
          const y = meta.fogo[1] - 8 - Math.sin(Math.PI * t) * 46;
          base.sprite(small, Math.floor(now / 120) % 2, x - 7, y - 20, { w: 14, h: 20, flip: false });
        }
      }
      drawThermometer(info);
      // Lenha e o menu de comidas.
      base.text(String(info.wood), meta.lenha[0] + 14, meta.lenha[1] - 9, info.wood > 0 ? '#ffe27a' : '#9a9ca8');
      base.region('lenha', meta.lenha[0], meta.lenha[1], meta.lenha[2] - meta.lenha[0], meta.lenha[3] - meta.lenha[1], { tip: tr('mini.fogueira.tipWood', { n: info.wood }) });
      info.foods.forEach((item, i) => {
        const x = 38 + i * 24;
        const chosen = info.selected === item.id;
        if (chosen) { base.g.fillStyle = '#ffe27a'; base.g.fillRect(x - 1, meta.menu + 1, 19, 14); }
        base.g.fillStyle = chosen ? '#7a4a1c' : '#52301a';
        base.g.fillRect(x, meta.menu + 2, 17, 12);
        base.sprite(meta.comidas, i * 4 + 2, x, meta.menu + 3);
        base.region(`comida:${item.id}`, x, meta.menu + 1, 17, 14, { comida: item.id, tip: tr('mini.fogueira.tipFood', { food: nameOf(item.id) }) });
      });
      base.drawParticles(now);
      base.drawSays(now);
      return true;
    }

    function click(clientX, clientY, now = 0) {
      if (!engineRef) return false;
      const model = engineRef.mini('fogueira');
      const found = base.hit(clientX, clientY);
      if (!found) return false;
      const cfg = engineRef.data.minis.fogueira;
      if (found.id === 'lenha') {
        const got = model.addWood();
        if (got.ok) {
          hooks.sound?.('lenha');
          for (let k = 0; k < 3; k++) base.spawn('faisca', meta.fogo[0] - 6 + k * 6, meta.fogo[1] - 14, now);
        } else { hooks.sound?.('erro'); base.say(tr(got.reason === 'wood' ? 'mini.fogueira.noWood' : 'mini.fogueira.full'), meta.lenha[0] + 14, meta.lenha[1] - 14, now, '#ff9a8a'); }
        return true;
      }
      if (found.comida) { if (model.select(found.comida)) hooks.sound?.('clique'); return true; }
      if (found.id === 'fogo') {
        const got = model.jump();
        if (got.ok) {
          hooks.sound?.('pulo');
          jump = { t0: now, to: meta.fogo[0] + 30 };
          base.say(tr('mini.fogueira.jumped'), meta.fogo[0], meta.fogo[1] - 52, now, '#fff8e8');
          rewardLines(got.reward).forEach((line, i) => base.say(line, meta.fogo[0], meta.fogo[1] - 60 - i * 7, now, '#ffe27a'));
        } else { hooks.sound?.('erro'); base.say(tr(got.reason === 'cold' ? 'mini.fogueira.cold' : 'mini.fogueira.waitJump'), meta.fogo[0], meta.fogo[1] - 40, now, '#ff9a8a'); }
        return true;
      }
      if (found.espeto === undefined) return true;
      const slot = found.espeto;
      const [tx, ty] = meta.pontas[slot];
      const stick = model.info().sticks[slot];
      if (!stick) {
        if (model.put(slot).ok) { hooks.sound?.('clique'); base.spawn('poeira', tx, ty, now, { dx: 1 }); }
        return true;
      }
      if (stick.burnt || stick.progress >= cfg.perfect[0]) {
        const got = model.take(slot);
        if (got.ok && got.burnt) { hooks.sound?.('errou'); base.say(tr('mini.fogueira.burnt'), tx, ty - 12, now, '#ff9a8a'); }
        else if (got.ok) {
          hooks.sound?.(got.perfect ? 'moeda' : 'carinho');
          base.spawn(got.perfect ? 'estrela' : 'coracao', tx - 4, ty - 8, now);
          if (got.perfect) base.say(tr('mini.fogueira.perfect'), tx, ty - 14, now, '#9ef05a');
          rewardLines(got.reward).forEach((line, i) => base.say(line, tx, ty - 22 - i * 7, now, '#ffe27a'));
        }
        return true;
      }
      const got = model.turn(slot);
      if (got.ok) { hooks.sound?.('pulo'); base.spawn('brilho', tx - 2, ty - 8, now); }
      else base.say(tr(got.reason === 'early' ? 'mini.fogueira.early' : got.reason === 'turned' ? 'mini.fogueira.turned' : 'mini.fogueira.late'), tx, ty - 14, now, '#8ed6ff');
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
        if (event.kind === 'burnt') { hooks.sound?.('errou'); hooks.toast?.(tr('mini.fogueira.burntToast', { food: nameOf(event.food) }), 'erro'); }
      }
    }

    function probe() {
      return { ...base.probeBase(), jumping: !!jump };
    }

    return { size: base.size, setScale: base.setScale, draw, hit: base.hit, click, status, onEvents, probe };
  }

  root.ArraiaJanelas.registerView('fogueira', create);
})(typeof globalThis !== 'undefined' ? globalThis : this);
