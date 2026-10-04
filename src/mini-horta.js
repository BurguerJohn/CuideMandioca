(function (root, factory) {
  const Minis = typeof module === 'object' && module.exports ? require('./minis.js') : root.ArraiaMinis;
  factory(Minis);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Minis) {
  'use strict';

  // Horta: canteiros onde a Mandioca planta. A planta cresce com o relógio (também com o jogo fechado), regar encurta a espera e
  // colher dá o prêmio. Um corvo de vez em quando tenta comer uma planta. Além disso: vizinhas amigas dão prêmio a mais, a planta pode
  // nascer em dobro ou dourada (sorte na hora de plantar), colheitas seguidas viram combo, a chuva da festa faz a horta crescer mais
  // depressa, uma borboleta da sorte adianta a planta mais atrasada e a feira faz encomendas. Configuração em `data.minis.horta`.
  Minis.define('horta', (engine, tools) => {
    const { clamp, finite, int } = tools;
    const COLUMNS = 5;              // os canteiros ficam em fileiras de 5 (a vizinha é a de cima, de baixo, da esquerda e da direita)
    const LUCKS = ['dobro', 'dourada'];
    const crop = id => tools.cfg().crops.find(entry => entry.id === id) || null;
    const plotsOpen = () => {
      const c = tools.cfg();
      const start = engine.data.minis.windows.find(entry => entry.id === 'horta').start;
      return Math.min(c.plotMax, c.plotsStart + Math.max(0, Math.floor((engine.houseLevel() - start) / c.plotEvery)));
    };
    const emptyPlot = () => ({ crop: null, plantedAt: 0, readyAt: 0, waters: 0, luck: null });
    // A sequência de colheitas (o combo) não vai para o save: recomeça a cada partida.
    let combo = { n: 0, at: 0 };
    let rainClock = 0;
    let rainbowBorn = 0;

    function nextCrow() { return tools.now() + tools.between(...tools.cfg().crowEvery) * 1000; }
    const nextButterfly = () => tools.now() + tools.between(...tools.cfg().butterfly.every) * 1000;
    const nextOrder = () => tools.now() + tools.between(...tools.cfg().orders.wait) * 1000;

    function refillWater(now) {
      const s = tools.state();
      const c = tools.cfg();
      if (s.water >= c.waterMax) s.waterAt = now;
      else {
        const n = Math.floor((now - s.waterAt) / (c.waterEvery * 1000));
        if (n > 0) {
          s.water = Math.min(c.waterMax, s.water + n);
          s.waterAt = s.water >= c.waterMax ? now : s.waterAt + n * c.waterEvery * 1000;
        }
      }
    }

    function expireCrow(now) {
      const s = tools.state();
      if (!s.crow) return;
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
    }

    function plotInfo(plot, index, now) {
      if (!plot.crop) return { index, crop: null, stage: 0, progress: 0, ready: false, waters: 0, remaining: 0, luck: null, friends: 0 };
      const total = Math.max(1, plot.readyAt - plot.plantedAt);
      const progress = clamp((now - plot.plantedAt) / total, 0, 1);
      const ready = now >= plot.readyAt;
      return { index, crop: plot.crop, stage: ready ? 3 : Math.min(2, Math.floor(progress * 3)), progress: ready ? 1 : progress, ready,
        waters: plot.waters, remaining: ready ? 0 : (plot.readyAt - now) / 1000, luck: plot.luck, friends: friendsOf(index) };
    }

    // --- Vizinhas amigas -------------------------------------------------------------------------------------------------------
    const likes = (a, b) => a !== b && tools.cfg().friends.some(pair => pair.includes(a) && pair.includes(b));
    function neighbours(index) {
      const list = [];
      if (index % COLUMNS > 0) list.push(index - 1);
      if (index % COLUMNS < COLUMNS - 1) list.push(index + 1);
      if (index >= COLUMNS) list.push(index - COLUMNS);
      list.push(index + COLUMNS);
      return list.filter(other => other >= 0 && other < tools.cfg().plotMax);
    }
    // Quantas vizinhas amigas (de planta que gosta dela, em canteiro aberto) a planta do canteiro `index` tem.
    function friendsOf(index) {
      const s = tools.state();
      const plot = s.plots[index];
      if (!plot?.crop) return 0;
      const open = plotsOpen();
      return neighbours(index).filter(other => other < open && s.plots[other].crop && likes(plot.crop, s.plots[other].crop)).length;
    }

    // O prêmio vezes `mult` (as fichas só ganham a sorte, `ticketMult`: as amigas, o combo e a planta em alta não inflam a moeda mais rara).
    // Fichas e lenha são inteiras, e a sobra decide no sorteio (1,25 lenha é 1 lenha, com 25% de chance de 2).
    function scaled(spec, mult, ticketMult = mult) {
      const out = {};
      for (const [key, value] of Object.entries(spec)) {
        const raw = value * (key === 'tickets' ? ticketMult : mult);
        out[key] = key === 'tickets' || key === 'wood' ? Math.floor(raw + tools.rng()) : raw;
      }
      return out;
    }

    // --- Chuva, borboleta e encomendas (andam com o tempo) ---------------------------------------------------------------------
    // O temporal e o granizo (eventos do mundo) molham a horta como a chuva de São João.
    const stormy = now => { const m = engine.state.mundo?.active; return !!m && (m.id === 'temporal' || m.id === 'granizo') && now < m.until; };
    const raining = now => { const rain = engine.state.weather?.rain; return (!!rain && now < rain.until) || stormy(now); };
    const rainbow = now => { const arc = engine.state.weather?.rainbow; return !!arc && now < arc.until; };
    // A planta em alta do dia (muda à meia-noite, pelo relógio do computador): rende `daily.bonus` a mais.
    function todayCrop(now) {
      const date = new Date(now);
      const day = date.getFullYear() * 372 + date.getMonth() * 31 + date.getDate();
      const list = tools.cfg().crops;
      return list[day % list.length].id;
    }

    function growing(open) {
      const now = tools.now();
      return tools.state().plots.slice(0, open).map((plot, index) => ({ plot, index })).filter(entry => entry.plot.crop && now < entry.plot.readyAt);
    }

    function makeOrder(taken) {
      const c = tools.cfg();
      const options = c.crops.filter(item => !taken.includes(item.id));
      const item = tools.pick(options.length ? options : c.crops);
      const [low, high] = item.order.n;
      return { crop: item.id, n: low + Math.floor(tools.rng() * (high - low + 1)), have: 0 };
    }

    function updateOrders(now) {
      const s = tools.state();
      const c = tools.cfg().orders;
      while (s.orders.length < c.slots && now >= s.orderAt) s.orders.push(makeOrder(s.orders.map(order => order.crop)));
    }

    // Uma colheita de `units` unidades de `id`: conta no primeiro pedido dessa planta e, se completou, paga.
    function deliver(id, units) {
      const s = tools.state();
      const done = [];
      const order = s.orders.find(entry => entry.crop === id);
      if (!order) return done;
      order.have += units;
      if (order.have < order.n) return done;
      const c = tools.cfg().orders;
      const item = crop(id);
      const reward = tools.reward({ tickets: c.tickets + (order.n >= c.bigAt ? c.bigTickets : 0), cheer: item.order.cheer * order.n });
      s.orders.splice(s.orders.indexOf(order), 1);
      s.delivered++;
      s.orderAt = Math.max(s.orderAt, nextOrder());
      tools.emit('order-done', { crop: id, n: order.n, reward });
      done.push({ crop: id, n: order.n, reward });
      return done;
    }

    return {
      fresh() {
        const c = tools.cfg();
        combo = { n: 0, at: 0 };
        rainClock = 0;
        return { plots: Array.from({ length: c.plotMax }, emptyPlot), water: c.waterMax, waterAt: tools.now(), seed: c.crops[0].id, crow: null,
          crowAt: 0, harvested: {}, buffs: {}, planted: 0, scared: 0, eaten: 0, butterfly: null, butterflyAt: 0, caught: 0, orders: [], orderAt: 0,
          delivered: 0, harvests: 0 };
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
            waters: int(entry.waters, 0, c.waterLimit, 0), luck: LUCKS.includes(entry.luck) ? entry.luck : null };
        });
        const harvested = {};
        for (const item of c.crops) if (finite(raw.harvested?.[item.id]) > 0) harvested[item.id] = int(raw.harvested[item.id], 0, 1e9, 0);
        // Os bônus de 10 min das colheitas que ainda valem (no máximo `buffMinutes` à frente).
        const buffs = {};
        for (const item of c.crops) {
          const until = finite(raw.buffs?.[item.id]);
          if (item.buff && until > now) buffs[item.id] = Math.min(until, now + c.buffMinutes * 60000);
        }
        // As encomendas que ainda valem (planta que existe, quantidade e andamento dentro dos limites).
        const orders = [];
        for (const entry of Array.isArray(raw.orders) ? raw.orders : []) {
          const item = tools.object(entry) ? crop(entry.crop) : null;
          if (!item || orders.length >= c.orders.slots || orders.some(order => order.crop === item.id)) continue;
          const n = int(entry.n, item.order.n[0], item.order.n[1], item.order.n[0]);
          orders.push({ crop: item.id, n, have: int(entry.have, 0, n - 1, 0) });
        }
        // O corvo e a borboleta não esperam o jogo fechado: ao voltar, não tem visita e a próxima vem com calma.
        return { plots, water: int(raw.water, 0, c.waterMax, c.waterMax), waterAt: clamp(finite(raw.waterAt, now), 0, now),
          seed: crop(raw.seed) ? raw.seed : c.crops[0].id, crow: null,
          crowAt: tools.object(raw.crow) ? nextCrow() : clamp(finite(raw.crowAt), 0, now + c.crowEvery[1] * 1000), harvested, buffs,
          planted: int(raw.planted, 0, 1e9, 0), scared: int(raw.scared, 0, 1e9, 0), eaten: int(raw.eaten, 0, 1e9, 0), butterfly: null,
          butterflyAt: clamp(finite(raw.butterflyAt), 0, now + c.butterfly.every[1] * 1000), caught: int(raw.caught, 0, 1e9, 0), orders,
          orderAt: clamp(finite(raw.orderAt), 0, now + c.orders.wait[1] * 1000), delivered: int(raw.delivered, 0, 1e9, 0),
          harvests: int(raw.harvests, 0, 1e9, 0) };
      },

      shift(ms) {
        const s = tools.state();
        const back = value => (value ? value - ms : value);
        s.waterAt = back(s.waterAt);
        s.crowAt = back(s.crowAt);
        s.butterflyAt = back(s.butterflyAt);
        s.orderAt = back(s.orderAt);
        for (const plot of s.plots) if (plot.crop) { plot.plantedAt -= ms; plot.readyAt -= ms; }
        if (s.crow) s.crow.until -= ms;
        if (s.butterfly) { s.butterfly.born -= ms; s.butterfly.until -= ms; }
        for (const id of Object.keys(s.buffs)) s.buffs[id] -= ms;
        if (combo.at) combo.at -= ms;
      },

      // A regadora enche com o tempo; a chuva da festa adianta tudo; a borboleta e as encomendas chegam; o corvo vem de vez em
      // quando e come a planta de quem não o espantar.
      tick(dt = 0) {
        const s = tools.state();
        const c = tools.cfg();
        const now = tools.now();
        refillWater(now);
        const open = plotsOpen();
        // Chuva de São João: a horta cresce `rainBoost` s a mais por segundo e a regadora enche a cada `rainWater` s.
        if (raining(now) && dt > 0) {
          const extra = dt * c.rainBoost * 1000;
          for (const { plot } of growing(open)) plot.readyAt = Math.max(now, plot.readyAt - extra);
          if (s.water < c.waterMax) {
            rainClock += dt;
            if (rainClock >= c.rainWater) { rainClock = 0; s.water++; }
          }
        } else rainClock = 0;
        // O arco-íris que sai depois da chuva chama a borboleta da sorte (uma vez por arco-íris).
        const arc = engine.state.weather?.rainbow;
        if (arc && rainbow(now) && arc.born !== rainbowBorn) {
          rainbowBorn = arc.born;
          if (!s.butterfly) s.butterflyAt = Math.min(s.butterflyAt || Infinity, now + 1500);
        }
        // Borboleta da sorte.
        if (s.butterfly) {
          if (now >= s.butterfly.until) { s.butterfly = null; s.butterflyAt = nextButterfly(); tools.emit('butterfly-gone'); }
        } else if (!s.butterflyAt) s.butterflyAt = nextButterfly();
        else if (now >= s.butterflyAt) {
          if (growing(open).length) {
            s.butterfly = { born: now, until: now + c.butterfly.seconds * 1000, seed: Math.floor(tools.rng() * 1e6) };
            tools.emit('butterfly');
          } else s.butterflyAt = nextButterfly();
        }
        updateOrders(now);
        if (s.crow) {
          expireCrow(now);
          return;
        }
        if (!s.crowAt) s.crowAt = nextCrow();
        if (now < s.crowAt) return;
        // O Espantalho Galã num dos lados da festa: corvo nenhum se atreve.
        const targets = growing(open);
        if (engine.isPlaced('espantalho') || !targets.length) { s.crowAt = nextCrow(); return; }
        const target = tools.pick(targets);
        s.crow = { plot: target.index, until: now + c.crowSeconds * 1000 };
        tools.emit('crow', { index: target.index });
      },

      info() {
        const s = tools.state();
        const c = tools.cfg();
        const now = tools.now();
        refillWater(now);
        const open = plotsOpen();
        const start = engine.data.minis.windows.find(entry => entry.id === 'horta').start;
        const plots = s.plots.slice(0, c.plotMax).map((plot, i) => ({ ...plotInfo(plot, i, now), open: i < open }));
        const live = plots.filter(plot => plot.open);
        return { plots, open, plotMax: c.plotMax,
          nextPlotAt: open < c.plotMax ? start + (open - c.plotsStart + 1) * c.plotEvery : null,
          water: s.water, waterMax: c.waterMax, seed: s.seed, crow: s.crow ? { plot: s.crow.plot, until: s.crow.until, left: Math.max(0, (s.crow.until - now) / 1000) } : null,
          crops: c.crops, harvested: { ...s.harvested }, bonus: engine.hortaBonus(), permanentPct: c.permanentPct, buffMinutes: c.buffMinutes,
          buffs: engine.hortaBuffs().map(buff => ({ ...buff, left: Math.max(0, (buff.until - now) / 1000) })),
          raining: raining(now), rainbow: rainbow(now), today: todayCrop(now),
          butterfly: s.butterfly && now < s.butterfly.until ? { ...s.butterfly, left: (s.butterfly.until - now) / 1000 } : null,
          orders: s.orders.map(order => ({ ...order, tickets: c.orders.tickets + (order.n >= c.orders.bigAt ? c.orders.bigTickets : 0),
            cheer: crop(order.crop).order.cheer * order.n })),
          combo: combo.n && now - combo.at <= c.combo.window * 1000 ? { n: combo.n, left: (c.combo.window * 1000 - (now - combo.at)) / 1000 } : { n: 0, left: 0 },
          ready: live.filter(plot => plot.ready).length, empty: live.filter(plot => !plot.crop).length,
          thirsty: live.filter(plot => plot.crop && !plot.ready && plot.waters < c.waterLimit).length,
          delivered: s.delivered, caught: s.caught, harvests: s.harvests };
      },

      // Os números do texto de ajuda da janela (em % e segundos, para o texto não ficar velho).
      helpVars() {
        const c = tools.cfg();
        return { friendPct: Math.round(c.friendBonus * 100), friendMaxPct: Math.round(c.friendMax * 100), doublePct: Math.round(c.luck.double * 100),
          goldenPct: Math.round(c.luck.golden * 100), comboPct: Math.round(c.combo.step * 100), comboWindow: c.combo.window, comboMax: c.combo.max,
          skipPct: Math.round(c.butterfly.skip * 100), orderSlots: c.orders.slots, butterflySeconds: c.butterfly.seconds, dailyPct: Math.round(c.daily.bonus * 100) };
      },

      select(id) {
        if (!crop(id)) return false;
        tools.state().seed = id;
        return true;
      },

      // Plantar no canteiro `index` (livre e aberto) a semente escolhida (ou `id`); a sorte (dobro ou dourada) sai agora.
      plant(index, id = tools.state().seed) {
        const s = tools.state();
        const c = tools.cfg();
        const item = crop(id);
        expireCrow(tools.now());
        if (!item) return { ok: false, reason: 'crop' };
        if (!Number.isInteger(index) || !(index >= 0 && index < plotsOpen())) return { ok: false, reason: 'closed' };
        if (s.plots[index].crop) return { ok: false, reason: 'busy' };
        const now = tools.now();
        const roll = tools.rng();
        const luck = roll < c.luck.golden ? 'dourada' : roll < c.luck.golden + c.luck.double ? 'dobro' : null;
        s.plots[index] = { crop: id, plantedAt: now, readyAt: now + item.minutes * 60000, waters: 0, luck };
        s.planted++;
        tools.emit('plant', { index, crop: id, luck });
        return { ok: true, crop: item, luck };
      },

      // Plantar a semente escolhida em todos os canteiros abertos e livres.
      plantAll() {
        const planted = [];
        for (let i = 0; i < plotsOpen(); i++) {
          if (tools.state().plots[i].crop) continue;
          if (this.plant(i).ok) planted.push(i);
        }
        return { ok: planted.length > 0, planted };
      },

      // Regar: gasta uma da regadora e corta uma parte do que falta (até waterLimit vezes por planta).
      water(index) {
        const s = tools.state();
        const c = tools.cfg();
        expireCrow(tools.now());
        const plot = s.plots[index];
        const now = tools.now();
        refillWater(now);
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

      // Regar tudo o que ainda pode ser regado, a mais atrasada primeiro, até a regadora esvaziar.
      waterAll() {
        const c = tools.cfg();
        const now = tools.now();
        refillWater(now);
        const wet = [];
        const order = growing(plotsOpen()).filter(entry => entry.plot.waters < c.waterLimit).sort((a, b) => b.plot.readyAt - a.plot.readyAt);
        for (const { index } of order) {
          if (tools.state().water <= 0) break;
          if (this.water(index).ok) wet.push(index);
        }
        return { ok: wet.length > 0, wet, empty: tools.state().water <= 0 };
      },

      // Colher a planta no ponto: o prêmio dela (vezes a vizinhança, a sorte e o combo), o bônus de `buffMinutes` min da planta e,
      // na primeira vez de cada planta, as fichas extras e o bônus fixo de Animação (`permanent`: quantos % essa planta acrescentou;
      // `total`: o bônus fixo de agora). Colher a mesma planta de novo só recomeça a contagem dela.
      harvest(index) {
        const s = tools.state();
        const c = tools.cfg();
        expireCrow(tools.now());
        const plot = s.plots[index];
        if (!plot?.crop || !(index < plotsOpen())) return { ok: false, reason: 'empty' };
        const now = tools.now();
        if (now < plot.readyAt) return { ok: false, reason: 'growing' };
        const item = crop(plot.crop);
        const first = !s.harvested[item.id];
        // O combo: outra colheita em até `combo.window` s soma `combo.step` ao prêmio, até `combo.max` seguidas.
        combo = combo.n && now - combo.at <= c.combo.window * 1000 ? { n: Math.min(c.combo.max, combo.n + 1), at: now } : { n: 1, at: now };
        const friends = friendsOf(index);
        const luck = plot.luck;
        const today = item.id === todayCrop(now);
        const luckMult = luck === 'dourada' ? c.goldenMult : luck === 'dobro' ? c.doubleMult : 1;
        const mult = (1 + Math.min(c.friendMax, friends * c.friendBonus)) * luckMult * (1 + c.combo.step * (combo.n - 1)) * (today ? 1 + c.daily.bonus : 1);
        const reward = tools.reward(scaled(item.reward, mult, luckMult));
        if (luck === 'dourada') reward.tickets = (reward.tickets || 0) + tools.reward({ tickets: c.goldenTickets }).tickets;
        if (first) Object.assign(reward, tools.reward(c.firstHarvest), { tickets: (reward.tickets || 0) + (c.firstHarvest.tickets || 0) });
        s.harvested[item.id] = (s.harvested[item.id] || 0) + 1;
        s.harvests++;
        s.plots[index] = emptyPlot();
        if (item.buff) s.buffs[item.id] = now + c.buffMinutes * 60000;
        const permanent = first ? c.permanentPct : 0;
        const buff = item.buff ? { ...item.buff, minutes: c.buffMinutes } : null;
        const orders = deliver(item.id, luck ? 2 : 1);
        const done = { index, crop: item.id, reward, first, permanent, buff, luck, friends, combo: combo.n, mult, today, orders };
        tools.emit('harvest', done);
        return { ok: true, crop: item, reward, first, permanent, total: Math.round(engine.hortaBonus() * 100), buff, luck, friends, combo: combo.n, mult, today, orders };
      },

      // Colher todas as plantas no ponto, uma depois da outra (o combo sobe sozinho).
      harvestAll() {
        const results = [];
        for (let i = 0; i < plotsOpen(); i++) {
          const got = this.harvest(i);
          if (got.ok) results.push({ index: i, ...got });
        }
        return { ok: results.length > 0, results };
      },

      // A borboleta da sorte: quem pega adianta a planta mais atrasada (corta `skip` do que falta) e ganha o prêmio dela.
      catchButterfly() {
        const s = tools.state();
        const c = tools.cfg();
        const now = tools.now();
        if (!s.butterfly || now >= s.butterfly.until) return { ok: false, reason: 'none' };
        const target = growing(plotsOpen()).sort((a, b) => b.plot.readyAt - a.plot.readyAt)[0];
        if (target) target.plot.readyAt = now + (target.plot.readyAt - now) * (1 - c.butterfly.skip);
        const reward = tools.reward(c.butterfly.reward);
        s.butterfly = null;
        s.butterflyAt = nextButterfly();
        s.caught++;
        tools.emit('butterfly-caught', { index: target ? target.index : null, reward });
        return { ok: true, index: target ? target.index : null, reward };
      },

      // Espantar o corvo: ele voa embora e deixa uma gorjeta de Animação.
      scare() {
        const s = tools.state();
        expireCrow(tools.now());
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
