// Horta: clique no pacote para escolher a semente, no canteiro livre para plantar, na planta crescendo para regar e na planta no
// ponto para colher; clique no corvo para espantar. O motor está em src/mini-horta.js.
(function (root) {
  'use strict';

  const Base = root.ArraiaJanelaBase;
  const W = 176;
  const H = 116;
  const compact = n => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(Math.round(n)));
  const timeText = seconds => (seconds >= 90 ? `${Math.ceil(seconds / 60)} min` : `${Math.max(1, Math.ceil(seconds))} s`);

  function create(canvas, bundle, hooks = {}) {
    const meta = bundle.janelas.horta;
    const base = Base.create(canvas, bundle, { width: W, height: H, sound: hooks.sound,
      images: [meta.fundo.image, meta.plantas.image, meta.solo.image, meta.pacotes.image, meta.corvo.image, meta.regadora.image] });
    const tr = hooks.t || Base.tr;
    let engineRef = null;
    const nameOf = id => engineRef?.data.minis.horta.crops.find(entry => entry.id === id)?.name || id;
    const spot = i => ({ x: meta.colunas[i % 5], y: meta.linhas[Math.floor(i / 5)] });

    function rewardLines(reward) {
      const lines = [];
      if (reward.tickets) lines.push(tr('gain.tickets', { n: reward.tickets }));
      if (reward.cheer) lines.push(tr('gain.cheer', { n: compact(reward.cheer) }));
      if (reward.wood) lines.push(tr('gain.wood', { n: reward.wood }));
      if (reward.belly) lines.push(tr('mini.gain.belly', { n: Math.round(reward.belly) }));
      if (reward.love) lines.push(tr('mini.gain.love', { n: Math.round(reward.love) }));
      return lines;
    }

    function drawPlot(plot, info, now) {
      const { x, y } = spot(plot.index);
      const [w, h] = meta.canteiro;
      base.sprite(meta.solo, !plot.open ? 2 : plot.waters > 0 ? 1 : 0, x, y);
      let tip;
      if (!plot.open) {
        tip = tr('mini.horta.tipLocked', { n: info.nextPlotAt });
      } else if (!plot.crop) {
        tip = tr('mini.horta.tipEmpty', { crop: nameOf(info.seed) });
      } else {
        const index = meta.plantas.ids.indexOf(plot.crop) * 4 + plot.stage;
        const sway = plot.stage > 1 ? Math.round(Math.sin(now / 900 + plot.index) * 0.6) : 0;
        base.sprite(meta.plantas, index, x + (w - meta.plantas.w) / 2 + sway, y + h - meta.plantas.h + 1);
        if (plot.ready) {
          tip = tr('mini.horta.tipReady', { crop: nameOf(plot.crop) });
          if (Math.floor(now / 700 + plot.index) % 3 === 0) base.spawn('brilho', x + 18, y - 2, now);
        } else {
          tip = tr('mini.horta.tipGrowing', { crop: nameOf(plot.crop), time: timeText(plot.remaining), w: plot.waters, max: engineRef.data.minis.horta.waterLimit });
          // Barrinha do quanto já cresceu.
          base.g.fillStyle = '#26242e';
          base.g.fillRect(x + 3, y + h - 4, w - 6, 3);
          base.g.fillStyle = '#9ef05a';
          base.g.fillRect(x + 4, y + h - 3, Math.round((w - 8) * plot.progress), 1);
        }
        if (plot.waters > 0) { base.g.fillStyle = '#56c8ee'; base.g.fillRect(x + 3, y + 2, 2, 2); if (plot.waters > 1) base.g.fillRect(x + 6, y + 2, 2, 2); }
      }
      base.region(`plot:${plot.index}`, x, y - 8, w, h + 8, { plot: plot.index, tip });
    }

    function draw(engine, now) {
      engineRef = engine;
      const info = engine.mini('horta').info();
      base.clear();
      base.clearRegions();
      base.picture(meta.fundo.image);
      for (const plot of info.plots) drawPlot(plot, info, now);
      // Prateleira: os pacotes de semente (o escolhido sobe e ganha moldura) e a regadora.
      info.crops.forEach((item, i) => {
        const x = 6 + i * 20;
        const chosen = info.seed === item.id;
        const y = meta.prateleira - 2 - (chosen ? 3 : 0);
        if (chosen) { base.g.fillStyle = '#ffe27a'; base.g.fillRect(x - 1, y - 1, 18, 20); }
        base.sprite(meta.pacotes, meta.plantas.ids.indexOf(item.id), x, y);
        base.region(`semente:${item.id}`, x, y, 16, 18, { semente: item.id, tip: tr('mini.horta.tipSeed', { crop: nameOf(item.id), time: timeText(item.minutes * 60) }) });
      });
      base.sprite(meta.regadora, 0, 120, meta.prateleira + 2);
      base.text(String(info.water), 148, meta.prateleira + 5, info.water > 0 ? '#8ed6ff' : '#9a9ca8');
      base.region('regadora', 118, meta.prateleira, 40, 14, { tip: tr('mini.horta.tipCan', { n: info.water, max: info.waterMax }) });
      // O corvo, em cima do canteiro dele, com a barrinha de quanto falta para comer.
      if (info.crow) {
        const { x, y } = spot(info.crow.plot);
        const bob = Math.round(Math.sin(now / 90) * 1);
        base.sprite(meta.corvo, Math.floor(now / 200) % 2, x + 6, y - 12 + bob);
        const total = engine.data.minis.horta.crowSeconds;
        base.g.fillStyle = '#26242e';
        base.g.fillRect(x + 2, y + 2, 24, 3);
        base.g.fillStyle = '#ff5a5a';
        base.g.fillRect(x + 3, y + 3, Math.round(22 * info.crow.left / total), 1);
        base.region('corvo', x + 4, y - 14, 22, 18, { tip: tr('mini.horta.tipCrow') });
      }
      base.drawParticles(now);
      base.drawSays(now);
      return true;
    }

    function click(clientX, clientY, now = 0) {
      if (!engineRef) return false;
      const model = engineRef.mini('horta');
      const found = base.hit(clientX, clientY);
      if (!found) return false;
      if (found.id === 'corvo') {
        const got = model.scare();
        if (got.ok) {
          hooks.sound?.('grito');
          const { x, y } = spot(got.index);
          base.spawn('estrela', x + 8, y - 6, now);
          base.say(tr('mini.horta.scared'), x + 14, y - 14, now, '#fff8e8');
          rewardLines(got.reward).forEach((line, i) => base.say(line, x + 14, y - 22 - i * 7, now, '#ffe27a'));
        }
        return true;
      }
      if (found.semente) {
        if (model.select(found.semente)) hooks.sound?.('clique');
        return true;
      }
      if (found.plot === undefined) return true;
      const { x, y } = spot(found.plot);
      const info = model.info();
      const plot = info.plots[found.plot];
      if (!plot.open) { hooks.sound?.('erro'); base.say(tr('mini.horta.locked', { n: info.nextPlotAt }), x + 14, y, now, '#ff9a8a'); return true; }
      if (!plot.crop) {
        if (model.plant(found.plot).ok) {
          hooks.sound?.('pulo');
          for (let k = 0; k < 4; k++) base.spawn('poeira', x + 8 + k * 4, y + 12, now, { dx: k % 2 ? 1 : -1 });
        }
        return true;
      }
      if (plot.ready) {
        const got = model.harvest(found.plot);
        if (got.ok) {
          hooks.sound?.('moeda');
          base.spawn('estrela', x + 6, y - 4, now);
          base.spawn('brilho', x + 18, y - 6, now);
          rewardLines(got.reward).forEach((line, i) => base.say(line, x + 14, y - 8 - i * 7, now, '#ffe27a'));
          if (got.first) hooks.toast?.(tr('mini.horta.first', { crop: nameOf(got.crop.id) }), 'ouro');
        }
        return true;
      }
      const got = model.water(found.plot);
      if (got.ok) {
        hooks.sound?.('bola');
        for (let k = 0; k < 4; k++) base.spawn('gota', x + 8 + k * 4, y + 2, now);
      } else if (got.reason === 'water') { hooks.sound?.('erro'); base.say(tr('mini.horta.noWater'), x + 14, y, now, '#ff9a8a'); }
      else if (got.reason === 'watered') base.say(tr('mini.horta.alreadyWatered'), x + 14, y, now, '#8ed6ff');
      return true;
    }

    function status(engine) {
      const info = engine.mini('horta').info();
      const planted = info.plots.filter(plot => plot.open && plot.crop).length;
      return `${tr('mini.horta.count', { n: planted, m: info.open })} · ${tr('mini.horta.water', { n: info.water, m: info.waterMax })}`;
    }

    function onEvents(engine, events, now) {
      engineRef = engine;
      for (const event of events) {
        if (event.type !== 'mini' || event.mini !== 'horta') continue;
        if (event.kind === 'crow') { hooks.sound?.('papagaio'); hooks.toast?.(tr('mini.horta.crowLanded'), ''); }
        else if (event.kind === 'crow-ate') hooks.toast?.(tr('mini.horta.crowAte', { crop: nameOf(event.crop) }), 'erro');
      }
    }

    function probe() {
      return { ...base.probeBase() };
    }

    return { size: base.size, setScale: base.setScale, draw, hit: base.hit, click, status, onEvents, probe };
  }

  root.ArraiaJanelas.registerView('horta', create);
})(typeof globalThis !== 'undefined' ? globalThis : this);
