// Horta: clique no pacote para escolher a semente, no canteiro livre para plantar, na planta crescendo para regar e na planta no ponto
// para colher; clique no corvo para espantar e na borboleta dourada para pegar. Na prateleira, a regadora rega tudo, a cesta colhe tudo e a
// pá planta em todos os canteiros livres. No quadro, as encomendas da feira. O motor está em src/mini-horta.js.
(function (root) {
  'use strict';

  const Base = root.ArraiaJanelaBase;
  const compact = n => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(Math.round(n)));
  const timeText = seconds => (seconds >= 90 ? `${Math.ceil(seconds / 60)} min` : `${Math.max(1, Math.ceil(seconds))} s`);
  const TAU = Math.PI * 2;
  const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };

  function create(canvas, bundle, hooks = {}) {
    const meta = bundle.janelas.horta;
    const W = meta.w;
    const H = meta.h;
    const base = Base.create(canvas, bundle, { width: W, height: H, sound: hooks.sound,
      images: [meta.fundo.image, meta.plantas.image, meta.douradas.image, meta.solo.image, meta.pacotes.image, meta.icones.image, meta.bilhetes.image,
        meta.corvo.image, meta.regadora.image, meta.cesta.image, meta.pa.image, meta.borboleta.image, meta.galinha.image, meta.espantalho.image] });
    const tr = hooks.t || Base.tr;
    const g = base.g;
    let engineRef = null;
    const nameOf = id => engineRef?.data.minis.horta.crops.find(entry => entry.id === id)?.name || id;
    const spot = i => ({ x: meta.colunas[i % 5], y: meta.linhas[Math.floor(i / 5)] });
    const [PW, PH] = meta.canteiro;
    const shelf = meta.prateleira;
    const SLOTS = { can: { x: 108, y: shelf + 3 }, basket: { x: 129, y: shelf + 2 }, shovel: { x: 151, y: shelf + 2 } };

    // O que se mexe sozinho (não vai para o save): a galinha, o espantalho, o moinho, os voos da colheita...
    const toy = { hen: { x: 50, dir: 1, mode: 'anda', until: 0, at: 0, hop: -1e9 }, wave: -1e9, mill: -1e9, jiggle: -1e9, dig: -1e9, flights: [], pours: [] };
    const seen = {};          // canteiro -> { crop, stage }: para a planta dar um pulinho quando cresce
    const pop = {};           // canteiro -> quando foi o último pulinho
    const hearted = {};       // canteiro -> o último coração solto

    const effectText = buff => tr(`horta.buff.${buff.kind}`, { v: Math.round(buff.value * 100) });

    function rewardLines(reward) {
      const lines = [];
      if (reward.tickets) lines.push(tr('gain.tickets', { n: reward.tickets }));
      if (reward.cheer) lines.push(tr('gain.cheer', { n: compact(reward.cheer) }));
      if (reward.wood) lines.push(tr('gain.wood', { n: reward.wood }));
      if (reward.belly) lines.push(tr('mini.gain.belly', { n: Math.round(reward.belly) }));
      if (reward.love) lines.push(tr('mini.gain.love', { n: Math.round(reward.love) }));
      return lines;
    }

    // --- Desenho de pedacinhos --------------------------------------------------------------------------------------------------
    function disc(cx, cy, r, color, alpha) {
      g.globalAlpha = alpha;
      g.fillStyle = color;
      for (let dy = -r; dy <= r; dy++) {
        const half = Math.round(Math.sqrt(r * r - dy * dy));
        g.fillRect(Math.round(cx - half), Math.round(cy + dy), half * 2 + 1, 1);
      }
      g.globalAlpha = 1;
    }
    // Brilho macio: discos cada vez menores e mais fortes.
    function glow(cx, cy, r, color, alpha) {
      for (let k = 0; k < 3; k++) disc(cx, cy, Math.max(1, Math.round(r * (1 - k * 0.3))), color, alpha * (0.5 + k * 0.25) / 1.5);
    }
    // A planta com o topo envergando ao vento (`bend` px) e, se `squash` for diferente de 1, esticada a partir do pé (o pulinho de crescer).
    function bentSprite(sheet, index, x, y, bend, squash = 1) {
      const img = base.imageOf(sheet.image);
      if (!base.ready(img)) return;
      const sx = (index % sheet.frames) * sheet.w;
      const cut = Math.round(sheet.h * 0.55);
      const height = Math.round(sheet.h * squash);
      const top = y + sheet.h - height;
      const upper = Math.round(cut * squash);
      g.drawImage(img, sx, 0, sheet.w, cut, Math.round(x + bend), Math.round(top), sheet.w, upper);
      g.drawImage(img, sx, cut, sheet.w, sheet.h - cut, Math.round(x), Math.round(top + upper), sheet.w, height - upper);
    }
    function drop(x, y, color = '#56c8ee') {
      g.fillStyle = color;
      g.fillRect(x + 1, y, 1, 1);
      g.fillRect(x, y + 1, 3, 2);
      g.fillRect(x + 1, y + 3, 1, 1);
      g.fillStyle = '#d8f4ff';
      g.fillRect(x + 1, y + 1, 1, 1);
    }

    // O solzinho da planta em alta do dia, no canto do pacote.
    function sunBadge(x, y, now) {
      const rays = Math.floor(now / 400) % 2 === 0;
      g.fillStyle = '#26242e';
      g.fillRect(x - 1, y - 1, 8, 8);
      g.fillStyle = rays ? '#ffe27a' : '#ffd21e';
      g.fillRect(x + 2, y, 2, 6);
      g.fillRect(x, y + 2, 6, 2);
      g.fillStyle = '#ff8a12';
      g.fillRect(x + 1, y + 1, 4, 4);
      g.fillStyle = '#fff6c4';
      g.fillRect(x + 2, y + 2, 2, 2);
    }

    // --- O cenário que se mexe ----------------------------------------------------------------------------------------------------
    function drawSky(now, info) {
      // Estrelas que piscam.
      meta.estrelas.forEach(([x, y], i) => {
        if (Math.sin(now / 420 + i * 2.7) > 0.72) {
          g.fillStyle = '#fffbe0';
          g.fillRect(x - 1, y, 3, 1);
          g.fillRect(x, y - 1, 1, 3);
        }
      });
      // O arco-íris que saiu na festa também aparece no céu da horta.
      if (info.rainbow) {
        const colors = ['#ee2f3c', '#ff8a12', '#ffd21e', '#35a03a', '#3a6cf0', '#9d5cf0'];
        g.globalAlpha = 0.55;
        colors.forEach((color, k) => {
          const r = 58 - k * 2.2;
          g.fillStyle = color;
          for (let a = Math.PI; a <= TAU; a += 0.007) g.fillRect(Math.round(W / 2 + Math.cos(a) * r * 1.5), Math.round(46 + Math.sin(a) * r * 0.62), 2, 2);
        });
        g.globalAlpha = 1;
      }
      // O moinho: as pás giram (mais depressa depois de um clique).
      const m = meta.moinho;
      const fast = now - toy.mill < 2600;
      const angle = now / (fast ? 380 : 1900);
      for (let b = 0; b < 4; b++) {
        const a = angle + b * TAU / 4;
        const ex = m.x + Math.cos(a) * m.raio;
        const ey = m.y + Math.sin(a) * m.raio;
        base.line(m.x, m.y, ex, ey, '#e8c898');
        base.line(m.x + Math.sin(a) * 1.2, m.y - Math.cos(a) * 1.2, ex + Math.sin(a) * 1.2, ey - Math.cos(a) * 1.2, '#b88a5a');
        base.line(m.x + Math.sin(a) * 2.4, m.y - Math.cos(a) * 2.4, ex + Math.sin(a) * 2.4, ey - Math.cos(a) * 2.4, '#b88a5a');
      }
      g.fillStyle = '#3a2418';
      g.fillRect(m.x - 1, m.y - 1, 3, 3);
      g.fillStyle = '#c8884a';
      g.fillRect(m.x, m.y, 1, 1);
      // A luz do sótão do celeiro, tremendo como vela.
      const w = meta.janelaCeleiro;
      g.fillStyle = `rgba(255, 226, 122, ${0.16 + 0.1 * Math.sin(now / 230) + 0.05 * Math.sin(now / 71)})`;
      g.fillRect(w.x - 1, w.y - 1, w.w + 2, w.h + 2);
      // As lanternas da cerca.
      meta.lanternas.forEach((x, i) => {
        const flicker = 0.7 + 0.3 * Math.sin(now / 190 + i * 1.9);
        glow(x + 1, 44, 6, '#ffd86a', 0.18 * flicker);
        g.fillStyle = '#ffe27a';
        g.fillRect(x, 43, 3, 3);
        g.fillStyle = '#fff6c4';
        g.fillRect(x + 1, 44, 1, 1);
      });
    }

    function drawHen(now) {
      const hen = toy.hen;
      const dt = Math.min(100, Math.max(0, now - (hen.at || now)));
      hen.at = now;
      if (now >= hen.until) {
        const roll = (Math.floor(now / 1000) * 7919 + Math.floor(hen.x)) % 100;
        hen.mode = hen.mode === 'anda' ? (roll < 45 ? 'bica' : 'para') : 'anda';
        hen.until = now + (hen.mode === 'anda' ? 2600 : hen.mode === 'bica' ? 1500 : 900);
        if (hen.mode === 'anda' && roll > 60) hen.dir = -hen.dir;
      }
      if (hen.mode === 'anda') {
        hen.x += hen.dir * 0.014 * dt;
        if (hen.x < 8) { hen.x = 8; hen.dir = 1; }
        if (hen.x > 112) { hen.x = 112; hen.dir = -1; }
      }
      const hopping = now - toy.hen.hop < 420;
      const hop = hopping ? -Math.round(Math.sin((now - toy.hen.hop) / 420 * Math.PI) * 5) : 0;
      const frame = hopping ? 2 + (Math.floor(now / 90) % 2) : hen.mode === 'anda' ? 2 + (Math.floor(now / 160) % 2) : hen.mode === 'bica' ? (Math.floor(now / 280) % 2 ? 1 : 0) : 0;
      const x = Math.round(hen.x);
      const y = 53 - meta.galinha.h + 1 + hop;
      base.sprite(meta.galinha, frame, x, y, { flip: hen.dir > 0 });
      base.region('galinha', x, y, meta.galinha.w, meta.galinha.h, { tip: tr('mini.horta.tipHen') });
    }

    function drawScarecrow(now) {
      const p = meta.espantalhoPos;
      const waving = now - toy.wave < 1500;
      base.sprite(meta.espantalho, waving && Math.floor(now / 160) % 2 === 0 ? 1 : 0, p.x, p.y + (waving ? Math.round(Math.sin(now / 90)) : 0));
      base.region('espantalho', p.x + 4, p.y, meta.espantalho.w - 8, meta.espantalho.h, { tip: tr('mini.horta.tipScarecrow') });
    }

    function drawFireflies(now) {
      for (let i = 0; i < 7; i++) {
        const t = now / 1000 * (0.35 + (i % 3) * 0.12) + i * 4.1;
        const x = Math.round(W / 2 + Math.sin(t * 0.9 + i) * (W * 0.42) + Math.sin(t * 2.3) * 6);
        const y = Math.round(58 + (i % 4) * 11 + Math.cos(t * 1.3 + i * 2) * 10);
        const blink = Math.sin(t * 3.1 + i * 5);
        if (blink < -0.1) continue;
        glow(x, y, 3, '#fff07a', 0.3 * (0.4 + blink * 0.6));
        g.fillStyle = '#fff6a0';
        g.fillRect(x, y, 1, 1);
      }
    }

    function drawAmbientButterflies(now) {
      for (let i = 0; i < 2; i++) {
        const t = now / 1000 * 0.55 + i * 3.3;
        const x = Math.round(30 + i * 90 + Math.sin(t) * 38 + Math.sin(t * 2.7) * 6);
        const y = Math.round(94 + Math.sin(t * 1.4 + i) * 5 + Math.cos(t * 3.3) * 2);
        base.sprite(meta.borboleta, Math.floor(now / 140 + i * 3) % 2, x, y);
      }
    }

    function drawRain(now, info) {
      if (!info.raining) return;
      g.fillStyle = 'rgba(8, 14, 40, 0.26)';
      g.fillRect(0, 0, W, 52);
      g.globalAlpha = 0.7;
      for (let i = 0; i < 70; i++) {
        const x = ((i * 53 + now * 0.06) % (W + 24)) - 12;
        const y = (i * 31 + now * 0.4 + (i % 5) * 17) % H;
        base.line(x, y, x - 1, y + 3, i % 3 ? '#a8dcff' : '#e8f6ff');
      }
      g.globalAlpha = 1;
      // Respingos nos canteiros.
      for (let i = 0; i < 10; i++) {
        const phase = (now / 700 + i * 0.37) % 1;
        const { x, y } = spot(i);
        const dx = Math.round(((i * 13) % 20) + 4);
        g.fillStyle = `rgba(216, 244, 255, ${1 - phase})`;
        g.fillRect(x + dx - Math.round(phase * 2), y + 4 + (i % 3) * 4, 1, 1);
        g.fillRect(x + dx + Math.round(phase * 2) + 1, y + 4 + (i % 3) * 4, 1, 1);
      }
      base.text(tr('mini.horta.rain'), 22, 3, '#8ed6ff');
    }

    // --- Canteiros ------------------------------------------------------------------------------------------------------------------
    function growthPulse(plot, now) {
      // Quando a planta ganha uma fase (ou é plantada), ela dá um pulinho e solta brilhos.
      const prev = seen[plot.index];
      if (plot.crop && prev && prev.crop === plot.crop && plot.stage > prev.stage && plot.stage < 3) {
        pop[plot.index] = now;
        const { x, y } = spot(plot.index);
        base.spawn('brilho', x + 6, y - 2, now);
        base.spawn('brilho', x + 18, y + 2, now);
      } else if (plot.crop && prev && prev.crop === plot.crop && plot.stage === 3 && prev.stage < 3) {
        pop[plot.index] = now;
      }
      seen[plot.index] = plot.crop ? { crop: plot.crop, stage: plot.stage } : null;
    }

    function drawPlot(plot, info, now) {
      const { x, y } = spot(plot.index);
      base.sprite(meta.solo, !plot.open ? 2 : plot.waters > 0 ? 1 : 0, x, y);
      growthPulse(plot, now);
      let tip;
      if (!plot.open) {
        tip = tr('mini.horta.tipLocked', { n: info.nextPlotAt });
      } else if (!plot.crop) {
        tip = tr('mini.horta.tipEmpty', { crop: nameOf(info.seed) });
      } else {
        const sheet = plot.luck === 'dourada' ? meta.douradas : meta.plantas;
        const index = meta.plantas.ids.indexOf(plot.crop) * 4 + plot.stage;
        const px = x + Math.round((PW - meta.plantas.w) / 2);
        const py = y + PH - meta.plantas.h + 1;
        const wind = plot.stage > 0 ? Math.round(Math.sin(now / 1000 * 1.1 + plot.index * 1.7) * (0.4 + plot.stage * 0.25)) : 0;
        const since = now - (pop[plot.index] ?? -1e9);
        const squash = since < 380 ? 1 + 0.16 * Math.sin(since / 380 * Math.PI) : 1;
        // Pronta: um pulinho de tempos em tempos, chamando para colher.
        const cycle = (now / 1000 + plot.index * 0.61) % 2.8;
        const lift = plot.ready && cycle < 0.45 ? -Math.round(Math.sin(cycle / 0.45 * Math.PI) * 2) : 0;
        if (plot.luck === 'dourada') glow(px + 13, py + 14, 15, '#ffd21e', 0.16 + 0.07 * Math.sin(now / 260 + plot.index));
        // Em dobro: a segunda plantinha aparece atrás quando a primeira já cresceu.
        if (plot.luck === 'dobro' && plot.stage >= 1) bentSprite(sheet, index, px - 6, py + 1 + lift, -wind, squash);
        bentSprite(sheet, index, px + (plot.luck === 'dobro' && plot.stage >= 1 ? 5 : 0), py + lift, wind, squash);
        if (plot.luck && now >= (hearted[`l${plot.index}`] || 0)) {
          hearted[`l${plot.index}`] = now + 900 + (plot.index % 3) * 150;
          base.spawn('brilho', x + 4 + Math.round(((now / 97) % 20)), y + 2, now);
        }
        const luckTip = plot.luck ? ` ${tr(`mini.horta.tipLuck.${plot.luck}`, { m: plot.luck === 'dourada' ? engineRef.data.minis.horta.goldenMult : engineRef.data.minis.horta.doubleMult })}` : '';
        const friendTip = plot.friends ? ` ${tr('mini.horta.tipFriends', { n: plot.friends, v: Math.round(Math.min(engineRef.data.minis.horta.friendMax, plot.friends * engineRef.data.minis.horta.friendBonus) * 100) })}` : '';
        if (plot.ready) {
          tip = tr('mini.horta.tipReady', { crop: nameOf(plot.crop) }) + luckTip + friendTip;
          if (Math.floor(now / 700 + plot.index) % 3 === 0) base.spawn('brilho', x + 18, y - 2, now);
        } else {
          tip = tr('mini.horta.tipGrowing', { crop: nameOf(plot.crop), time: timeText(plot.remaining), w: plot.waters, max: engineRef.data.minis.horta.waterLimit }) + luckTip + friendTip;
          // Barrinha do quanto já cresceu (verde, e amarela perto de ficar no ponto).
          g.fillStyle = '#2e2018';
          g.fillRect(x + 5, y + PH - 5, PW - 10, 3);
          g.fillStyle = plot.progress > 0.66 ? '#ffe27a' : '#9ef05a';
          g.fillRect(x + 6, y + PH - 4, Math.round((PW - 12) * plot.progress), 1);
        }
        for (let k = 0; k < plot.waters; k++) drop(x + 3 + k * 4, y + 2);
        // As vizinhas amigas soltam coraçõezinhos de vez em quando.
        if (plot.friends && now >= (hearted[plot.index] || 0)) {
          hearted[plot.index] = now + 4200 + (plot.index % 4) * 700;
          base.spawn('coracao', x + 4 + ((plot.index * 7) % 16), y - 4, now);
        }
      }
      // A folha tem linhas transparentes no topo: a região só cobre a parte que tem planta (a da fileira da frente não pega a de trás).
      const top = plot.crop ? y + PH - meta.plantas.h + 6 : y;
      const bottom = y + PH + (plot.crop ? 1 : 0);
      base.region(`plot:${plot.index}`, x, top, PW, bottom - top, { plot: plot.index, tip });
    }

    // --- Prateleira, quadro, bichos ------------------------------------------------------------------------------------------------
    function badge(text, x, y, color) {
      g.fillStyle = '#26242e';
      g.fillRect(x - 1, y - 1, String(text).length * 4 + 3, 8);
      base.text(text, x + (String(text).length * 4) / 2, y, color);
    }

    function drawShelf(info, now) {
      info.crops.forEach((item, i) => {
        const x = 5 + i * 20;
        const chosen = info.seed === item.id;
        const y = shelf + 1 - (chosen ? 3 : 0);
        if (chosen) { g.fillStyle = '#ffe27a'; g.fillRect(x - 1, y - 1, meta.pacotes.w + 2, meta.pacotes.h + 2); }
        base.sprite(meta.pacotes, meta.plantas.ids.indexOf(item.id), x, y);
        // A estrelinha dourada: essa planta já deu o bônus fixo. A barrinha verde: o bônus da colheita ainda valendo.
        const have = info.harvested[item.id] > 0;
        if (have) { g.fillStyle = '#ffe27a'; g.fillRect(x + 14, y + 2, 1, 3); g.fillRect(x + 13, y + 3, 3, 1); }
        const running = info.buffs.find(entry => entry.crop === item.id);
        if (running) {
          g.fillStyle = '#26242e';
          g.fillRect(x + 2, y + 15, 14, 3);
          g.fillStyle = '#9ef05a';
          g.fillRect(x + 3, y + 16, Math.max(1, Math.round(12 * running.left / (info.buffMinutes * 60))), 1);
        }
        const friends = engineRef.data.minis.horta.friends.filter(pair => pair.includes(item.id)).map(pair => nameOf(pair.find(id => id !== item.id))).join(', ');
        const today = info.today === item.id;
        if (today) sunBadge(x + 1, y + 1, now);
        const tip = (today ? `${tr('mini.horta.tipToday', { v: Math.round(engineRef.data.minis.horta.daily.bonus * 100) })} ` : '') + tr('mini.horta.tipSeed', { crop: nameOf(item.id), time: timeText(item.minutes * 60), buff: effectText(item.buff), m: info.buffMinutes, friends,
          perm: tr(have ? 'mini.horta.permHave' : 'mini.horta.permNew', { v: info.permanentPct }) });
        base.region(`semente:${item.id}`, x, y, meta.pacotes.w, meta.pacotes.h, { semente: item.id, tip });
      });
      // A regadora (rega tudo), a cesta (colhe tudo) e a pá (planta em todos os canteiros livres), cada uma com o número do que dá para fazer.
      const can = SLOTS.can;
      base.sprite(meta.regadora, info.water > 0 ? 0 : 2, can.x, can.y);
      badge(String(info.water), can.x + 13, can.y - 3, info.water > 0 ? '#8ed6ff' : '#9a9ca8');
      base.region('regadora', can.x, can.y, 19, 16, { tip: tr('mini.horta.tipCan', { n: info.water, max: info.waterMax }) });
      const basket = SLOTS.basket;
      const jiggle = now - toy.jiggle < 300 ? Math.round(Math.sin((now - toy.jiggle) / 40)) : 0;
      const bounce = info.ready > 0 && Math.floor(now / 1700) % 2 === 0 && now % 1700 < 300 ? -1 : 0;
      base.sprite(meta.cesta, info.ready > 0 ? 1 : 0, basket.x, basket.y + jiggle + bounce);
      if (info.ready > 0) badge(String(info.ready), basket.x + 14, basket.y - 3, '#ffe27a');
      base.region('cesta', basket.x, basket.y, 20, 17, { tip: tr('mini.horta.tipBasket', { n: info.ready }) });
      if (info.combo.n >= 2) {
        base.text(`X${info.combo.n}`, basket.x + 10, basket.y - 9, '#ffe27a');
        g.fillStyle = '#26242e';
        g.fillRect(basket.x + 1, basket.y - 3, 18, 2);
        g.fillStyle = '#ff8a5a';
        g.fillRect(basket.x + 1, basket.y - 3, Math.max(1, Math.round(18 * info.combo.left / engineRef.data.minis.horta.combo.window)), 2);
      }
      const shovel = SLOTS.shovel;
      base.sprite(meta.pa, now - toy.dig < 450 ? 1 : 0, shovel.x, shovel.y);
      if (info.empty > 0) badge(String(info.empty), shovel.x + 8, shovel.y - 3, '#fff8e8');
      base.region('pa', shovel.x, shovel.y, 16, 19, { tip: tr('mini.horta.tipShovel', { crop: nameOf(info.seed), n: info.empty }) });
    }

    function drawBoard(info) {
      const slots = engineRef.data.minis.horta.orders.slots;
      for (let k = 0; k < slots; k++) {
        const [x, y] = meta.quadro.notas[k];
        const order = info.orders[k];
        if (!order) {
          base.sprite(meta.bilhetes, 0, x, y, { alpha: 0.3 });
          base.region(`nota:${k}`, x, y, meta.bilhetes.w, meta.bilhetes.h, { nota: k, tip: tr('mini.horta.tipOrderWait') });
          continue;
        }
        const index = meta.plantas.ids.indexOf(order.crop);
        base.sprite(meta.bilhetes, 0, x, y);
        base.sprite(meta.icones, index, x + 4, y + 4);
        base.text(`${order.have}/${order.n}`, x + 8, y + 13, '#9a3a14');
        base.region(`nota:${k}`, x, y, meta.bilhetes.w, meta.bilhetes.h, { nota: k,
          tip: tr('mini.horta.tipOrder', { crop: nameOf(order.crop), have: order.have, n: order.n, tickets: order.tickets, cheer: compact(order.cheer) }) });
      }
    }

    function drawFlights(now) {
      const basket = SLOTS.basket;
      for (let i = toy.flights.length - 1; i >= 0; i--) {
        const f = toy.flights[i];
        const p = (now - f.at) / 650;
        if (p < 0) continue;
        if (p >= 1) {
          toy.flights.splice(i, 1);
          toy.jiggle = now;
          base.spawn('estrela', basket.x + 8, basket.y - 2, now);
          continue;
        }
        const e = smooth(p);
        const x = f.x + (basket.x + 8 - f.x) * e;
        const y = f.y + (basket.y + 2 - f.y) * e - Math.sin(Math.PI * e) * 16;
        base.sprite(meta.icones, f.icon, x - 5, y - 5);
      }
      for (let i = toy.pours.length - 1; i >= 0; i--) {
        const p = toy.pours[i];
        const t = now - p.at;
        if (t < 0) continue;
        if (t > 700) { toy.pours.splice(i, 1); continue; }
        const { x, y } = spot(p.plot);
        base.sprite(meta.regadora, 1, x - 6, y - 15 + Math.round(Math.sin(t / 60)));
        for (let k = 0; k < 3; k++) {
          const dy = ((t / 4 + k * 9) % 22);
          g.fillStyle = k % 2 ? '#8ed6ff' : '#d8f4ff';
          g.fillRect(x + 8 + k * 2, y - 8 + dy, 1, 2);
        }
      }
    }

    function drawCrow(info, now) {
      if (!info.crow) return;
      const { x, y } = spot(info.crow.plot);
      const bob = Math.round(Math.sin(now / 90) * 1);
      const hurry = info.crow.left < 6;
      const frame = hurry ? 2 : Math.floor(now / 900) % 4 === 0 ? 1 : 0;
      base.sprite(meta.corvo, frame, x + 5, y - 12 + bob);
      const total = engineRef.data.minis.horta.crowSeconds;
      g.fillStyle = '#26242e';
      g.fillRect(x + 2, y + 2, 24, 3);
      g.fillStyle = '#ff5a5a';
      g.fillRect(x + 3, y + 3, Math.round(22 * info.crow.left / total), 1);
      base.region('corvo', x + 5, y - 12 + bob, meta.corvo.w, meta.corvo.h, { crowPlot: info.crow.plot, until: info.crow.until, tip: tr('mini.horta.tipCrow') });
    }

    // A borboleta da sorte voa em oito pela horta; a posição vem do relógio do jogo (a mesma que o clique usa).
    function butterflyAt(info) {
      const t = (engineRef.now() - info.butterfly.born) / 1000;
      const seed = info.butterfly.seed % 100 / 100 * TAU;
      return { x: Math.round(W / 2 + Math.sin(t * 0.8 + seed) * 66 + Math.sin(t * 2.1) * 6 - 6), y: Math.round(70 + Math.sin(t * 1.3 + seed * 2) * 24 + Math.cos(t * 3.1) * 3 - 5) };
    }
    function drawButterfly(info, now) {
      if (!info.butterfly) return;
      const { x, y } = butterflyAt(info);
      glow(x + 4, y + 4, 9, '#ffd21e', 0.22 + 0.08 * Math.sin(now / 150));
      base.sprite(meta.borboleta, 2 + (Math.floor(now / 110) % 2), x, y);
      if (now >= (hearted.butterfly || 0)) { hearted.butterfly = now + 260; base.spawn('brilho', x + 4, y + 7, now); }
      base.region('borboleta', x - 3, y - 3, 15, 14, { tip: tr('mini.horta.tipButterfly', { s: Math.ceil(info.butterfly.left) }) });
    }

    function draw(engine, now) {
      engineRef = engine;
      const info = engine.mini('horta').info();
      base.clear();
      base.clearRegions();
      base.picture(meta.fundo.image);
      drawSky(now, info);
      drawScarecrow(now);
      drawBoard(info);
      drawHen(now);
      for (const plot of info.plots) drawPlot(plot, info, now);
      drawFireflies(now);
      drawShelf(info, now);
      drawFlights(now);
      drawAmbientButterflies(now);
      drawCrow(info, now);
      drawButterfly(info, now);
      drawRain(now, info);
      base.drawParticles(now);
      base.drawSays(now);
      return true;
    }

    // --- Cliques ----------------------------------------------------------------------------------------------------------------------
    // Os avisos de uma (ou várias) colheitas: o prêmio, a sorte, as amigas e o combo; as encomendas entregues; e o voo da planta para a cesta.
    function showHarvests(results, now, bulk) {
      const total = {};
      let best = 0;
      results.forEach((got, k) => {
        const { x, y } = spot(got.index);
        toy.flights.push({ at: now + k * 110, x: x + 14, y: y + 8, icon: meta.plantas.ids.indexOf(got.crop.id) });
        base.spawn('estrela', x + 6, y - 4, now);
        base.spawn('brilho', x + 18, y - 6, now);
        for (const [key, value] of Object.entries(got.reward)) total[key] = (total[key] || 0) + value;
        best = Math.max(best, got.combo);
      });
      const last = results[results.length - 1];
      const { x, y } = spot(last.index);
      const lines = rewardLines(total).map(line => [line, '#ffe27a']);
      if (results.some(got => got.luck === 'dourada')) lines.push([tr('mini.horta.golden', { m: engineRef.data.minis.horta.goldenMult }), '#ffd21e']);
      else if (results.some(got => got.luck === 'dobro')) lines.push([tr('mini.horta.double', { m: engineRef.data.minis.horta.doubleMult }), '#fff8e8']);
      const friends = Math.max(...results.map(got => got.friends));
      if (friends) lines.push([tr('mini.horta.friendSay', { v: Math.round(Math.min(engineRef.data.minis.horta.friendMax, friends * engineRef.data.minis.horta.friendBonus) * 100) }), '#ffb0c8']);
      if (best >= 2) lines.push([tr('mini.horta.combo', { n: best }), '#ff8a5a']);
      const first = results.find(got => got.permanent);
      if (first) lines.push([tr('mini.horta.permSay', { v: first.permanent }), '#9ef05a']);
      const buff = results.find(got => got.buff)?.buff;
      if (buff && !bulk) lines.push([tr('mini.horta.buffSay', { effect: effectText(buff), m: buff.minutes }), '#8ed6ff']);
      lines.forEach(([line, color], i) => base.say(line, bulk ? SLOTS.basket.x + 8 : x + 14, (bulk ? shelf - 12 : y - 8) - i * 7, now, color));
      for (const got of results) if (got.first) hooks.toast?.(tr('mini.horta.first', { crop: nameOf(got.crop.id), v: got.permanent, total: got.total }), 'ouro');
      for (const got of results) for (const order of got.orders || []) {
        base.say(tr('mini.horta.orderDone'), meta.quadro.x + 19, meta.quadro.y + 12, now, '#9ef05a');
        for (let k = 0; k < 4; k++) base.spawn('estrela', meta.quadro.x + 6 + k * 8, meta.quadro.y + 16 - (k % 2) * 4, now + k * 60);
        hooks.sound?.('conquista');
        hooks.toast?.(tr('mini.horta.orderToast', { n: order.n, crop: nameOf(order.crop), gains: rewardLines(order.reward).join(' ') }), 'ouro');
      }
      hooks.sound?.(best >= 3 ? 'conquista' : 'moeda', { pitch: Math.min(10, (best - 1) * 2) });
    }

    function click(clientX, clientY, now = 0) {
      if (!engineRef) return false;
      const model = engineRef.mini('horta');
      const found = base.hit(clientX, clientY);
      if (!found) return false;
      if (found.id === 'borboleta') {
        const got = model.catchButterfly();
        if (got.ok) {
          hooks.sound?.('brilho');
          base.say(tr('mini.horta.butterflyCaught'), found.point.x, found.point.y - 6, now, '#ffe27a');
          for (let k = 0; k < 5; k++) base.spawn(k % 2 ? 'coracao' : 'estrela', found.x + 2 + k * 3, found.y + 4, now);
          if (got.index !== null) {
            const { x, y } = spot(got.index);
            base.say(tr('mini.horta.pollinated'), x + 14, y - 6, now, '#ffb0c8');
            for (let k = 0; k < 4; k++) base.spawn('brilho', x + 4 + k * 6, y + 2, now);
          }
        }
        return true;
      }
      if (found.id === 'corvo') {
        // A região guardada ao esconder a janela pertence à visita que foi desenhada.
        const crow = model.info().crow;
        if (found.crowPlot !== crow?.plot || found.until !== crow?.until) return true;
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
      if (found.id === 'regadora') {
        const info = model.info();
        const got = model.waterAll();
        if (got.ok) {
          hooks.sound?.('bola');
          got.wet.forEach((index, k) => toy.pours.push({ plot: index, at: now + k * 260 }));
          base.say(tr('mini.horta.wateredAll', { n: got.wet.length }), SLOTS.can.x + 8, shelf - 10, now, '#8ed6ff');
        } else if (info.water <= 0) { hooks.sound?.('erro'); base.say(tr('mini.horta.noWater'), SLOTS.can.x + 8, shelf - 10, now, '#ff9a8a'); }
        else base.say(tr('mini.horta.nothingToWater'), SLOTS.can.x + 8, shelf - 10, now, '#fff8e8');
        return true;
      }
      if (found.id === 'cesta') {
        const got = model.harvestAll();
        if (got.ok) showHarvests(got.results, now, true);
        else { hooks.sound?.('erro'); base.say(tr('mini.horta.nothingReady'), SLOTS.basket.x + 8, shelf - 10, now, '#fff8e8'); }
        return true;
      }
      if (found.id === 'pa') {
        const got = model.plantAll();
        if (got.ok) {
          hooks.sound?.('pulo');
          toy.dig = now;
          for (const index of got.planted) {
            const { x, y } = spot(index);
            for (let k = 0; k < 4; k++) base.spawn('poeira', x + 8 + k * 4, y + 12, now, { dx: k % 2 ? 1 : -1 });
          }
          base.say(tr('mini.horta.plantedAll', { n: got.planted.length }), SLOTS.shovel.x + 6, shelf - 19, now, '#ffe27a');
        } else { hooks.sound?.('erro'); base.say(tr('mini.horta.noFreePlot'), SLOTS.shovel.x + 6, shelf - 19, now, '#fff8e8'); }
        return true;
      }
      if (found.id === 'galinha') {
        toy.hen.hop = now;
        toy.hen.mode = 'anda';
        toy.hen.until = now + 1800;
        hooks.sound?.('galinha');
        base.say(tr(`mini.horta.hen.${Math.floor(now / 7) % 2}`), found.x + 7, found.y - 4, now, '#fff8e8');
        for (let k = 0; k < 4; k++) base.spawn('poeira', found.x + 2 + k * 3, found.y + 10, now, { dx: k % 2 ? 1 : -1 });
        return true;
      }
      if (found.id === 'espantalho') {
        toy.wave = now;
        hooks.sound?.('crianca');
        base.say(tr(`mini.horta.scarecrow.${Math.floor(now / 7) % 3}`), found.x + 11, found.y - 2, now, '#ffe27a');
        base.spawn('nota', found.x + 6, found.y + 4, now);
        return true;
      }
      if (found.nota !== undefined) {
        const order = model.info().orders[found.nota];
        const [x, y] = meta.quadro.notas[found.nota];
        hooks.sound?.('clique');
        base.say(order ? tr('mini.horta.orderSay', { have: order.have, n: order.n, crop: nameOf(order.crop) }) : tr('mini.horta.orderWaitSay'), x + 8, y - 4, now, '#fff8e8');
        return true;
      }
      if (found.semente) {
        if (model.select(found.semente)) hooks.sound?.('clique');
        return true;
      }
      if (found.plot === undefined) {
        // O moinho (a região fica por baixo de tudo): as pás giram mais depressa.
        return true;
      }
      const { x, y } = spot(found.plot);
      const info = model.info();
      const plot = info.plots[found.plot];
      if (!plot.open) { hooks.sound?.('erro'); base.say(tr('mini.horta.locked', { n: info.nextPlotAt }), x + 14, y, now, '#ff9a8a'); return true; }
      if (!plot.crop) {
        const got = model.plant(found.plot);
        if (got.ok) {
          hooks.sound?.('pulo');
          pop[found.plot] = now;
          for (let k = 0; k < 4; k++) base.spawn('poeira', x + 8 + k * 4, y + 12, now, { dx: k % 2 ? 1 : -1 });
          if (got.luck) {
            base.say(tr(got.luck === 'dourada' ? 'mini.horta.goldenSeed' : 'mini.horta.doubleSeed'), x + 14, y - 6, now, got.luck === 'dourada' ? '#ffd21e' : '#fff8e8');
            for (let k = 0; k < 4; k++) base.spawn('brilho', x + 4 + k * 6, y + 2, now);
          }
        }
        return true;
      }
      if (plot.ready) {
        const got = model.harvest(found.plot);
        if (got.ok) showHarvests([{ index: found.plot, ...got }], now, false);
        return true;
      }
      const got = model.water(found.plot);
      if (got.ok) {
        hooks.sound?.('bola');
        toy.pours.push({ plot: found.plot, at: now });
      } else if (got.reason === 'water') { hooks.sound?.('erro'); base.say(tr('mini.horta.noWater'), x + 14, y, now, '#ff9a8a'); }
      else if (got.reason === 'watered') base.say(tr('mini.horta.alreadyWatered'), x + 14, y, now, '#8ed6ff');
      return true;
    }

    // O moinho e a lua não são regiões do motor: quem clica nas pás faz elas girarem.
    function poke(clientX, clientY, now) {
      const point = base.toArt(clientX, clientY);
      const m = meta.moinho;
      if (Math.hypot(point.x - m.x, point.y - m.y) <= m.raio + 2) {
        toy.mill = now;
        hooks.sound?.('clique');
        base.say(tr('mini.horta.mill'), m.x, m.y - m.raio - 6, now, '#fff8e8');
        return true;
      }
      return false;
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
        else if (event.kind === 'butterfly') { hooks.sound?.('brilho'); hooks.toast?.(tr('mini.horta.butterflyLanded'), 'ouro'); }
      }
    }

    function probe() {
      return { ...base.probeBase(), hen: { x: toy.hen.x, mode: toy.hen.mode }, flights: toy.flights.length, pours: toy.pours.length };
    }

    // O clique nas pás do moinho passa por aqui antes do clique normal (as pás ficam no céu, onde não há região).
    function clickAll(clientX, clientY, now = 0) {
      if (click(clientX, clientY, now)) return true;
      return poke(clientX, clientY, now);
    }

    return { size: base.size, setScale: base.setScale, draw, hit: base.hit, click: clickAll, status, onEvents, probe };
  }

  root.ArraiaJanelas.registerView('horta', create);
})(typeof globalThis !== 'undefined' ? globalThis : this);
