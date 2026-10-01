(function (root, factory) {
  const Minis = typeof module === 'object' && module.exports ? require('./minis.js') : root.ArraiaMinis;
  factory(Minis);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Minis) {
  'use strict';

  // Horta: canteiros onde a Mandioca planta. A planta cresce com o relógio (também com o jogo fechado), regar encurta a espera e
  // colher dá o prêmio. Um corvo de vez em quando tenta comer uma planta. Configuração em `data.minis.horta`.
  Minis.define('horta', (engine, tools) => {
    const { clamp, finite, int } = tools;
    const crop = id => tools.cfg().crops.find(entry => entry.id === id) || null;
    const plotsOpen = () => {
      const c = tools.cfg();
      const start = engine.data.minis.windows.find(entry => entry.id === 'horta').start;
      return Math.min(c.plotMax, c.plotsStart + Math.max(0, Math.floor((engine.houseLevel() - start) / c.plotEvery)));
    };
    const emptyPlot = () => ({ crop: null, plantedAt: 0, readyAt: 0, waters: 0 });

    function nextCrow() { return tools.now() + tools.between(...tools.cfg().crowEvery) * 1000; }

    function plotInfo(plot, index, now) {
      if (!plot.crop) return { index, crop: null, stage: 0, progress: 0, ready: false, waters: 0, remaining: 0 };
      const total = Math.max(1, plot.readyAt - plot.plantedAt);
      const progress = clamp((now - plot.plantedAt) / total, 0, 1);
      const ready = now >= plot.readyAt;
      return { index, crop: plot.crop, stage: ready ? 3 : Math.min(2, Math.floor(progress * 3)), progress: ready ? 1 : progress, ready,
        waters: plot.waters, remaining: ready ? 0 : (plot.readyAt - now) / 1000 };
    }

    return {
      fresh() {
        const c = tools.cfg();
        return { plots: Array.from({ length: c.plotMax }, emptyPlot), water: c.waterMax, waterAt: tools.now(), seed: c.crops[0].id, crow: null,
          crowAt: 0, harvested: {}, planted: 0, scared: 0, eaten: 0 };
      },

      load(raw) {
        const c = tools.cfg();
        const now = tools.now();
        const base = this.fresh();
        if (!raw) return base;
        const plots = Array.from({ length: c.plotMax }, (_, i) => {
          const entry = Array.isArray(raw.plots) ? raw.plots[i] : null;
          if (!tools.object(entry) || !crop(entry.crop)) return emptyPlot();
          const plantedAt = clamp(finite(entry.plantedAt, now), 0, now);
          const longest = crop(entry.crop).minutes * 60000;
          return { crop: entry.crop, plantedAt, readyAt: clamp(finite(entry.readyAt, plantedAt + longest), plantedAt, plantedAt + longest),
            waters: int(entry.waters, 0, c.waterLimit, 0) };
        });
        const harvested = {};
        for (const item of c.crops) if (finite(raw.harvested?.[item.id]) > 0) harvested[item.id] = int(raw.harvested[item.id], 0, 1e9, 0);
        // O corvo não espera o jogo fechado: ao voltar, não tem corvo e o próximo vem com calma.
        return { plots, water: int(raw.water, 0, c.waterMax, c.waterMax), waterAt: clamp(finite(raw.waterAt, now), 0, now),
          seed: crop(raw.seed) ? raw.seed : c.crops[0].id, crow: null, crowAt: clamp(finite(raw.crowAt), 0, now + c.crowEvery[1] * 1000), harvested,
          planted: int(raw.planted, 0, 1e9, 0), scared: int(raw.scared, 0, 1e9, 0), eaten: int(raw.eaten, 0, 1e9, 0) };
      },

      shift(ms) {
        const s = tools.state();
        const back = value => (value ? value - ms : value);
        s.waterAt = back(s.waterAt);
        s.crowAt = back(s.crowAt);
        for (const plot of s.plots) if (plot.crop) { plot.plantedAt -= ms; plot.readyAt -= ms; }
        if (s.crow) s.crow.until -= ms;
      },

      // A regadora enche com o tempo; o corvo vem de vez em quando e come a planta de quem não o espantar.
      tick() {
        const s = tools.state();
        const c = tools.cfg();
        const now = tools.now();
        if (s.water >= c.waterMax) s.waterAt = now;
        else {
          const n = Math.floor((now - s.waterAt) / (c.waterEvery * 1000));
          if (n > 0) {
            s.water = Math.min(c.waterMax, s.water + n);
            s.waterAt = s.water >= c.waterMax ? now : s.waterAt + n * c.waterEvery * 1000;
          }
        }
        const open = plotsOpen();
        if (s.crow) {
          const plot = s.plots[s.crow.plot];
          if (!plot?.crop) s.crow = null;
          else if (now >= s.crow.until) {
            const eaten = { index: s.crow.plot, crop: plot.crop };
            s.plots[s.crow.plot] = emptyPlot();
            s.crow = null;
            s.eaten++;
            s.crowAt = nextCrow();
            tools.emit('crow-ate', eaten);
          }
          return;
        }
        if (!s.crowAt) s.crowAt = nextCrow();
        if (now < s.crowAt) return;
        // O Espantalho Galã num dos lados da festa: corvo nenhum se atreve.
        const growing = s.plots.slice(0, open).map((plot, index) => ({ plot, index })).filter(entry => entry.plot.crop && now < entry.plot.readyAt);
        if (engine.isPlaced('espantalho') || !growing.length) { s.crowAt = nextCrow(); return; }
        const target = tools.pick(growing);
        s.crow = { plot: target.index, until: now + tools.cfg().crowSeconds * 1000 };
        tools.emit('crow', { index: target.index });
      },

      info() {
        const s = tools.state();
        const c = tools.cfg();
        const now = tools.now();
        const open = plotsOpen();
        const start = engine.data.minis.windows.find(entry => entry.id === 'horta').start;
        return { plots: s.plots.slice(0, c.plotMax).map((plot, i) => ({ ...plotInfo(plot, i, now), open: i < open })), open, plotMax: c.plotMax,
          nextPlotAt: open < c.plotMax ? start + (open - c.plotsStart + 1) * c.plotEvery : null,
          water: s.water, waterMax: c.waterMax, seed: s.seed, crow: s.crow ? { plot: s.crow.plot, left: Math.max(0, (s.crow.until - now) / 1000) } : null,
          crops: c.crops, harvested: { ...s.harvested } };
      },

      select(id) {
        if (!crop(id)) return false;
        tools.state().seed = id;
        return true;
      },

      // Plantar no canteiro `index` (livre e aberto) a semente escolhida (ou `id`).
      plant(index, id = tools.state().seed) {
        const s = tools.state();
        const item = crop(id);
        if (!item) return { ok: false, reason: 'crop' };
        if (!(index >= 0 && index < plotsOpen())) return { ok: false, reason: 'closed' };
        if (s.plots[index].crop) return { ok: false, reason: 'busy' };
        const now = tools.now();
        s.plots[index] = { crop: id, plantedAt: now, readyAt: now + item.minutes * 60000, waters: 0 };
        s.planted++;
        tools.emit('plant', { index, crop: id });
        return { ok: true, crop: item };
      },

      // Regar: gasta uma da regadora e corta uma parte do que falta (até waterLimit vezes por planta).
      water(index) {
        const s = tools.state();
        const c = tools.cfg();
        const plot = s.plots[index];
        const now = tools.now();
        if (!plot?.crop || !(index < plotsOpen())) return { ok: false, reason: 'empty' };
        if (now >= plot.readyAt) return { ok: false, reason: 'ready' };
        if (plot.waters >= c.waterLimit) return { ok: false, reason: 'watered' };
        if (s.water <= 0) return { ok: false, reason: 'water' };
        if (s.water >= c.waterMax) s.waterAt = now;
        s.water--;
        plot.waters++;
        plot.readyAt = now + (plot.readyAt - now) * (1 - c.waterCut);
        tools.emit('water', { index, waters: plot.waters });
        return { ok: true, waters: plot.waters };
      },

      // Colher a planta no ponto: o prêmio dela (e, na primeira vez de cada planta, as fichas extras).
      harvest(index) {
        const s = tools.state();
        const c = tools.cfg();
        const plot = s.plots[index];
        if (!plot?.crop || !(index < plotsOpen())) return { ok: false, reason: 'empty' };
        if (tools.now() < plot.readyAt) return { ok: false, reason: 'growing' };
        const item = crop(plot.crop);
        const first = !s.harvested[item.id];
        const reward = tools.reward(item.reward);
        if (first) Object.assign(reward, tools.reward(c.firstHarvest), { tickets: (reward.tickets || 0) + (c.firstHarvest.tickets || 0) });
        s.harvested[item.id] = (s.harvested[item.id] || 0) + 1;
        s.plots[index] = emptyPlot();
        tools.emit('harvest', { index, crop: item.id, reward, first });
        return { ok: true, crop: item, reward, first };
      },

      // Espantar o corvo: ele voa embora e deixa uma gorjeta de Animação.
      scare() {
        const s = tools.state();
        if (!s.crow) return { ok: false, reason: 'none' };
        const index = s.crow.plot;
        s.crow = null;
        s.scared++;
        s.crowAt = nextCrow();
        const reward = tools.reward(tools.cfg().crowReward);
        tools.emit('scared', { index, reward });
        return { ok: true, index, reward };
      }
    };
  });
});
