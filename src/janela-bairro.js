// Bairro: a rua da turma, uma casa para cada integrante que a Mandioca já pescou. Clique na casa de quem está esperando visita (com o
// coraçãozinho em cima) para ir lá: rende Animação e um recado. O motor está em src/mini-bairro.js.
(function (root) {
  'use strict';

  const Base = root.ArraiaJanelaBase;
  const W = 176;
  const H = 120;
  const compact = n => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(Math.round(n)));
  const minutes = seconds => (seconds >= 90 ? `${Math.ceil(seconds / 60)} min` : `${Math.max(1, Math.ceil(seconds))} s`);

  function create(canvas, bundle, hooks = {}) {
    const meta = bundle.janelas.bairro;
    const base = Base.create(canvas, bundle, { width: W, height: H, sound: hooks.sound, images: [meta.fundo.image, meta.casas.image,
      ...Object.values(bundle.chars).map(entry => entry.image)] });
    const tr = hooks.t || Base.tr;
    let engineRef = null;

    function rewardLines(reward) {
      const lines = [];
      if (reward.cheer) lines.push(tr('gain.cheer', { n: compact(reward.cheer) }));
      if (reward.tickets) lines.push(tr('gain.tickets', { n: reward.tickets }));
      return lines;
    }

    const spot = i => ({ x: meta.colunas[i % 7], top: meta.topos[Math.floor(i / 7)], ground: meta.chaos[Math.floor(i / 7)] });

    function drawHouse(house, i, now) {
      const { x, top, ground } = spot(i);
      const [w, h] = meta.casa;
      base.sprite(meta.casas, house.owned ? i : meta.casas.quantas, x, top);
      let tip;
      if (!house.owned) tip = tr('mini.bairro.tipEmpty');
      else {
        const sheet = bundle.chars[house.id];
        const cx = x + w / 2;
        if (house.away) {
          base.text(tr('mini.bairro.away'), cx, top + 24, '#8ed6ff');
          tip = tr('mini.bairro.tipAway', { name: house.name });
        } else {
          const frame = Math.floor(now / 1000 * (sheet.fps || 4) + i) % sheet.frames;
          base.g.globalAlpha = house.ready ? 1 : 0.78;
          const fit = Math.min(1, (meta.casa[0] - 2) / sheet.w);
          const w = Math.round(sheet.w * fit);
          const h = Math.round(sheet.h * fit);
          base.sprite(sheet, frame, cx - w / 2, ground - h + 1, { w, h });
          base.g.globalAlpha = 1;
          if (house.ready) {
            const bob = Math.round(Math.sin(now / 280 + i) * 1.2);
            base.sprite(bundle.casa.fx, bundle.casa.fx.ids.indexOf('coracao'), cx - 2, ground - sheet.h - 6 + bob);
            tip = tr('mini.bairro.tipReady', { name: house.name, level: house.level });
          } else tip = tr('mini.bairro.tipWait', { name: house.name, t: minutes(house.wait) });
        }
      }
      base.region(`casa:${house.id}`, x, top, w, ground - top + 2, { casa: house.id, tip });
    }

    function draw(engine, now) {
      engineRef = engine;
      const info = engine.mini('bairro').info();
      base.clear();
      base.clearRegions();
      base.picture(meta.fundo.image);
      info.houses.forEach((house, i) => drawHouse(house, i, now));
      base.drawParticles(now);
      base.drawSays(now);
      return true;
    }

    function click(clientX, clientY, now = 0) {
      if (!engineRef) return false;
      const model = engineRef.mini('bairro');
      const found = base.hit(clientX, clientY);
      if (!found?.casa) return false;
      const index = engineRef.data.chars.findIndex(entry => entry.id === found.casa);
      const { x, top } = spot(index);
      const cx = x + meta.casa[0] / 2;
      const got = model.visit(found.casa);
      if (got.ok) {
        hooks.sound?.('carta');
        base.spawn('coracao', cx - 2, top + 4, now);
        base.spawn('estrela', cx + 4, top + 8, now);
        base.say(tr('mini.bairro.hello'), cx, top - 2, now, '#fff8e8');
        rewardLines(got.reward).forEach((line, i) => base.say(line, cx, top - 10 - i * 7, now, '#ffe27a'));
        hooks.toast?.(tr('mini.bairro.recado', { name: got.char.name, text: got.recado }), 'ouro');
      } else if (got.reason === 'empty') { hooks.sound?.('erro'); base.say(tr('mini.bairro.empty'), cx, top + 6, now, '#ff9a8a'); }
      else if (got.reason === 'away') base.say(tr('mini.bairro.awaySay'), cx, top + 6, now, '#8ed6ff');
      else if (got.reason === 'wait') base.say(tr('mini.bairro.comeBack', { t: minutes(got.wait).toUpperCase() }), cx, top + 6, now, '#8ed6ff');
      return true;
    }

    function status(engine) {
      const info = engine.mini('bairro').info();
      const owned = info.houses.filter(house => house.owned).length;
      const ready = info.houses.filter(house => house.ready).length;
      return tr('mini.bairro.status', { n: owned, m: info.houses.length, r: ready });
    }

    function onEvents() {}

    function probe() {
      return { ...base.probeBase() };
    }

    return { size: base.size, setScale: base.setScale, draw, hit: base.hit, click, status, onEvents, probe };
  }

  root.ArraiaJanelas.registerView('bairro', create);
})(typeof globalThis !== 'undefined' ? globalThis : this);
