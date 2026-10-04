// Palco do Forró: escolha uma música e marque o ritmo clicando na pista (triângulo, zabumba ou sanfona), ou apertando a tecla 1, 2 ou 3,
// na hora em que a nota chega no círculo. O trio toca junto. No fim, estrelas e o prêmio. O motor está em src/mini-palco.js.
//
// O palco: pano de fundo de chita, cortinas, letreiro com lâmpadas que correm, holofotes que balançam e acendem a cada acerto, monitores que
// batem no ritmo, plateia de silhuetas e, na frente, as lâmpadas do chão, que acendem aos poucos conforme a música avança. O placar mostra três
// estrelas que acendem sozinhas quando a pontuação já garante cada uma.
(function (root) {
  'use strict';

  const Base = root.ArraiaJanelaBase;
  const W = 176;
  const H = 120;
  const LANE_SOUND = ['palco-triangulo', 'palco-zabumba', 'palco-sanfona'];
  const LANE_KEYS = ['1', '2', '3'];
  const LANE_COLORS = ['#56c8ee', '#ee4c4c', '#ffd21e'];
  const FOOT = { y: 110, x0: 6, step: 8, count: 22 };
  const compact = n => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(Math.round(n)));
  const clock = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

  function create(canvas, bundle, hooks = {}) {
    const meta = bundle.janelas.palco;
    const base = Base.create(canvas, bundle, { width: W, height: H, sound: hooks.sound,
      images: [meta.fundo.image, meta.trio.image, meta.notas.image, meta.alvoImg.image, meta.monitor.image, meta.plateia.image, meta.varal.image] });
    const tr = hooks.t || Base.tr;
    const g = base.g;
    const fx = bundle.casa.fx;
    const starIndex = fx.ids.indexOf('estrela');
    let engineRef = null;
    let drawnNotes = 0;
    let shownMode = null;
    const reactUntil = [0, 0, 0];
    const pulse = [-1e9, -1e9, -1e9];            // quando cada pista acertou por último (acende o círculo, o holofote e a pista)
    const hud = { stars: 0, combo: 0, comboAt: -1e9, show: null, lastTier: 0 };
    const result = { at: 0, stars: 0, announced: -1, counted: 0 };

    const songOf = id => engineRef?.data.minis.palco.songs.find(entry => entry.id === id) || null;
    const songName = id => songOf(id)?.name || id;
    const laneAt = x => Math.max(0, Math.min(2, Math.floor(x / (W / 3))));
    const modeOf = info => info.last ? 'result' : info.show ? 'show' : 'menu';
    const tierOf = combo => (combo >= 50 ? 3 : combo >= 25 ? 2 : combo >= 10 ? 1 : 0);
    const TIER_COLORS = ['#ffe27a', '#ff9a3a', '#ff5ab0', '#8ed6ff'];

    function panel(x, y, w, h) {
      g.fillStyle = 'rgba(14, 10, 30, 0.9)';
      g.fillRect(x, y, w, h);
      g.fillStyle = '#ffd21e';
      g.fillRect(x, y, w, 1);
      g.fillRect(x, y + h - 1, w, 1);
      g.fillRect(x, y, 1, h);
      g.fillRect(x + w - 1, y, 1, h);
      g.fillStyle = '#8a6a1c';
      g.fillRect(x + 1, y + 1, w - 2, 1);
      g.fillRect(x + 1, y + h - 2, w - 2, 1);
    }

    function stars(x, y, count, size = 1, now = 0, popFrom = -1) {
      for (let i = 0; i < 3; i++) {
        const lit = i < count;
        g.globalAlpha = lit ? 1 : 0.25;
        // A estrela que acabou de acender dá um pulinho (cresce e volta).
        const grow = lit && popFrom >= 0 && i === count - 1 && now - popFrom < 260 ? 1 + Math.sin((now - popFrom) / 260 * Math.PI) * 0.6 : 1;
        const s = size * grow;
        base.sprite(fx, starIndex, x + i * (6 * size) - (s - size) * fx.w / 2, y - (s - size) * fx.h / 2, { w: Math.round(fx.w * s), h: Math.round(fx.h * s) });
      }
      g.globalAlpha = 1;
    }

    // --- O palco que se mexe ------------------------------------------------------------------------------------------------------
    function drawLights(info, now) {
      g.globalCompositeOperation = 'lighter';
      meta.x.forEach((cx, lane) => {
        const boost = Math.max(0, 1 - (now - pulse[lane]) / 380);
        const sway = Math.sin(now / 1700 + lane * 2) * 3;
        g.fillStyle = '#fff0b0';
        g.globalAlpha = 0.04 + boost * 0.09;
        for (let y = 10; y < 108; y++) {
          const half = 3 + (y - 10) * 0.215;
          g.fillRect(Math.round(cx + sway * (y - 10) / 98 - half), y, Math.round(half * 2), 1);
        }
        g.globalAlpha = 0.03 + boost * 0.06;
        g.fillStyle = LANE_COLORS[lane];
        for (let y = 10; y < 108; y += 2) {
          const half = 2 + (y - 10) * 0.1;
          g.fillRect(Math.round(cx + sway * (y - 10) / 98 - half), y, Math.round(half * 2), 2);
        }
      });
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      meta.x.forEach((cx, lane) => base.glow(cx, 100, 15, LANE_COLORS[lane], 0.05 + Math.max(0, 1 - (now - pulse[lane]) / 380) * 0.14));
    }

    // O letreiro: as lâmpadas da moldura correm em volta (mais depressa quando o show está rolando).
    function drawMarquee(info, now) {
      const speed = info.show ? 110 : 190;
      meta.lampadas.forEach(([x, y], i) => {
        const lit = (i + Math.floor(now / speed)) % 3 === 0;
        g.fillStyle = lit ? '#fff6c0' : '#8a6a2a';
        g.fillRect(x, y, 2, 2);
        if (lit) base.glow(x + 1, y + 1, 4, '#ffd860', 0.12);
      });
      // O letreiro respira mais claro a cada acerto perfeito.
      const boost = Math.max(...pulse.map(at => Math.max(0, 1 - (now - at) / 300)));
      if (boost > 0) {
        g.globalAlpha = 0.18 * boost;
        g.fillStyle = '#ffd21e';
        const [x0, y0, x1, y1] = meta.letreiro;
        g.fillRect(x0 + 3, y0 + 3, x1 - x0 - 5, y1 - y0 - 5);
        g.globalAlpha = 1;
      }
    }

    // As lâmpadas da frente do palco: o fim da fileira acesa mostra quanto da música já tocou.
    function drawFootlights(info, now) {
      const total = info.show ? info.show.notes[info.show.notes.length - 1].t + 1200 : 0;
      const progress = info.show ? Math.min(1, info.show.time / total) : 0;
      for (let i = 0; i < FOOT.count; i++) {
        const x = FOOT.x0 + i * FOOT.step;
        const lit = info.show ? i / FOOT.count < progress : Math.floor(now / 260 + i) % 4 === 0;
        g.fillStyle = lit ? '#ffe27a' : '#6a5028';
        g.fillRect(x, FOOT.y, 3, 2);
        if (lit) base.glow(x + 1, FOOT.y + 1, 5, '#ffd860', info.show ? 0.1 : 0.08);
      }
    }

    function beatOf(info, now) {
      const song = info.show ? songOf(info.show.song) : null;
      if (!song) return 0;
      const period = 60000 / song.bpm;
      return (info.show.time % period) / period;
    }

    function drawBand(info, now) {
      const sheet = meta.trio;
      const beat = beatOf(info, now);
      meta.x.forEach((x, i) => {
        const reacting = reactUntil[i] > now;
        const frame = i * (meta.trio.quadros + 1) + (reacting ? meta.trio.quadros : Math.floor(now / 1000 * (info.show ? 5 : 2.5) + i) % meta.trio.quadros);
        // Sombra no chão, depois o músico (que dá um pulinho no tempo forte e quando acerta).
        g.globalAlpha = 0.3;
        g.fillStyle = '#1a0c06';
        g.fillRect(x - 10, meta.pes - 1, 20, 2);
        g.globalAlpha = 1;
        const lift = reacting ? -3 : info.show && beat < 0.12 ? -1 : 0;
        base.sprite(sheet, frame, x - sheet.w / 2, meta.pes - sheet.h + lift);
      });
      // Monitores de chão: o cone bate no tempo (e mais forte quando alguém acerta).
      const hit = Math.max(...pulse.map(at => Math.max(0, 1 - (now - at) / 160)));
      [52, 108].forEach(x => base.sprite(meta.monitor, info.show && (beat < 0.16 || hit > 0.4) ? 1 : 0, x, 101));
      // Plateia: as silhuetas balançam e, no resultado de 3 estrelas, levantam os braços (o quadro muda mais depressa).
      const cheering = shownMode === 'result' && result.stars >= 2;
      base.sprite(meta.plateia, Math.floor(now / (cheering ? 180 : info.show ? 420 : 800)) % 2, 0, 110);
    }

    function drawTargets(info, now) {
      meta.x.forEach((x, lane) => {
        const lit = now - pulse[lane] < 150;
        base.sprite(meta.alvoImg, lit ? 1 : 0, x - 14, meta.alvo - 14);
        if (info.show) base.text(LANE_KEYS[lane], x, meta.alvo + 15, lit ? '#ffffff' : '#ffe27a');
        if (lit) base.glow(x, meta.alvo, 14, '#fff0a0', 0.2);
      });
    }

    // --- O show ---------------------------------------------------------------------------------------------------------------------
    function drawShow(info, now) {
      const cfg = engineRef.data.minis.palco;
      const show = info.show;
      // As três pistas: uma coluna de cor bem fraquinha, com tracinhos que descem no ritmo das notas.
      meta.x.forEach((x, lane) => {
        const boost = Math.max(0, 1 - (now - pulse[lane]) / 320);
        g.globalAlpha = 0.07 + boost * 0.18;
        g.fillStyle = LANE_COLORS[lane];
        g.fillRect(x - 9, meta.topo - 4, 18, meta.alvo - meta.topo + 6);
        g.globalAlpha = 0.18;
        for (let k = 0; k < 5; k++) g.fillRect(x - 1, meta.topo + ((now / (cfg.travel / (meta.alvo - meta.topo)) / 1 + k * 11) % (meta.alvo - meta.topo)), 2, 2);
      });
      g.globalAlpha = 1;
      drawTargets(info, now);
      drawnNotes = 0;
      for (const note of show.notes) {
        if (note.state) continue;
        const ahead = note.t - show.time;
        if (ahead > cfg.travel || ahead < -cfg.good) continue;
        const progress = 1 - ahead / cfg.travel;
        const y = meta.topo + (meta.alvo - meta.topo) * progress;
        // Rastro: duas cópias apagadas logo acima, e um brilho crescendo quando a nota chega perto do círculo.
        g.globalAlpha = 0.28;
        base.sprite(meta.notas, note.lane, meta.x[note.lane] - 8, y - 12);
        g.globalAlpha = 0.14;
        base.sprite(meta.notas, note.lane, meta.x[note.lane] - 8, y - 18);
        g.globalAlpha = 1;
        const near = Math.max(0, 1 - Math.abs(ahead) / 260);
        if (near > 0) base.glow(meta.x[note.lane], y, 9, LANE_COLORS[note.lane], 0.16 * near);
        base.sprite(meta.notas, note.lane, meta.x[note.lane] - 8, y - 8);
        drawnNotes++;
      }
      drawHud(info, now);
    }

    // O placar: três estrelas que acendem quando a pontuação já garante a nota, uma barrinha de pontos e o combo grande.
    function drawHud(info, now) {
      const cfg = engineRef.data.minis.palco;
      const show = info.show;
      const total = show.notes.length;
      const frac = total ? show.score / (3 * total) : 0;
      const lit = cfg.stars.filter(min => frac >= min).length;
      if (hud.show !== show.song || lit < hud.stars) { hud.show = show.song; hud.stars = lit; hud.starAt = -1e9; hud.combo = show.combo; }
      if (lit > hud.stars) {
        hud.stars = lit;
        hud.starAt = now;
        base.ring(22 + (lit - 1) * 6 + 2, 20, now, { from: 3, to: 14, color: '#ffe27a', ms: 520, thick: 2 });
        base.bits(22 + (lit - 1) * 6 + 2, 20, 12, now, { colors: ['#ffd21e', '#fff0a0', '#ffffff'], speed: 36, gravity: 40, ms: 800 });
        hooks.sound?.('brilho');
      }
      panel(15, 12, 34, 22);
      stars(19, 15, hud.stars, 1, now, hud.starAt);
      // Barrinha de pontos com as marcas de 1, 2 e 3 estrelas.
      g.fillStyle = '#26242e';
      g.fillRect(18, 26, 28, 4);
      g.fillStyle = frac >= cfg.stars[2] ? '#9ef05a' : '#ff6a8a';
      g.fillRect(19, 27, Math.max(0, Math.round(26 * base.ease('score', Math.min(1, frac), now, 8))), 2);
      g.fillStyle = '#ffffff';
      cfg.stars.forEach(min => g.fillRect(19 + Math.round(26 * min), 26, 1, 4));
      // Combo: número grande no canto de cima, que pula quando sobe e muda de cor a cada patamar.
      if (show.combo >= 2) {
        if (show.combo > hud.combo) hud.comboAt = now;
        const bounce = Math.max(0, 1 - (now - hud.comboAt) / 160);
        const tier = tierOf(show.combo);
        panel(126, 12, 36, 22);
        base.text(tr('mini.palco.comboLabel'), 144, 15, '#fff8e8');
        base.text(`X${show.combo}`, 144, 22 - Math.round(bounce * 2), TIER_COLORS[tier], 1, 2);
      }
      if (show.combo !== hud.combo) {
        // Quebrou um combo bom: pedacinhos caem do contador.
        if (show.combo === 0 && hud.combo >= 5) base.bits(144, 26, 10, now, { colors: ['#ff6a6a', '#ffb0b0', '#8a2a2a'], speed: 26, up: -6, gravity: 120, ms: 700 });
        hud.combo = show.combo;
      }
      if (show.practice) base.text(tr('mini.palco.practice'), 88, 31, '#8ed6ff');
    }

    // --- Menu e resultado -----------------------------------------------------------------------------------------------------------
    function drawMenu(info, now) {
      panel(14, 31, 148, 56);
      base.text(tr('mini.palco.pick'), 88, 35, '#fff8e8');
      info.songs.forEach((song, i) => {
        const y = 44 + i * 9;
        g.fillStyle = song.open ? '#52301a' : '#2a2430';
        g.fillRect(18, y, 140, 8);
        if (song.open) { g.fillStyle = '#7a4a28'; g.fillRect(18, y, 140, 1); }
        if (song.open) {
          base.text(song.name, 18 + (song.name.length * 4) / 2 + 3, y + 1, '#ffe27a');
          stars(130, y + 1, song.stars);
          base.text(`${song.bpm}`, 119, y + 1, '#8ed6ff');
        } else {
          // Cadeado: argola, corpo e buraquinho.
          g.fillStyle = '#9a9ca8';
          g.fillRect(22, y + 1, 3, 1);
          g.fillRect(21, y + 2, 1, 2);
          g.fillRect(25, y + 2, 1, 2);
          g.fillStyle = '#ffd21e';
          g.fillRect(20, y + 4, 7, 4);
          g.fillStyle = '#26242e';
          g.fillRect(23, y + 5, 1, 2);
          base.text(tr('mini.palco.locked'), 70, y + 1, '#8a8a98');
        }
        base.region(`musica:${song.id}`, 18, y, 140, 8, { musica: song.id, open: song.open, hot: song.open,
          tip: song.open ? tr('mini.palco.tipSong', { song: song.name, n: song.stars, bpm: song.bpm }) : tr('mini.palco.tipLocked') });
      });
      const rest = info.cooldown > 0;
      base.text(rest ? tr('mini.palco.rest', { t: clock(info.cooldown) }) : tr('mini.palco.ready'), 88, 81, rest ? '#8ed6ff' : '#9ef05a');
      // O trio toca baixinho enquanto espera: notas sobem dos músicos de vez em quando.
      if (Math.floor(now / 900) !== result.menuTick) {
        result.menuTick = Math.floor(now / 900);
        const lane = result.menuTick % 3;
        base.spawn(lane === 1 ? 'nota' : 'nota2', meta.x[lane] - 2, meta.pes - 42, now);
      }
    }

    // O resultado vai aparecendo: as estrelas acendem uma a uma (cada uma com pulinho e brilho), a precisão sobe contando e, por fim, o prêmio.
    function drawResult(info, now) {
      const last = info.last;
      if (result.announced !== last) {
        result.announced = last;
        result.at = now;
        result.stars = 0;
        result.counted = 0;
        base.clearFx();
      }
      const t = now - result.at;
      panel(22, 28, 132, 78);
      base.text(tr(last.aborted ? 'mini.palco.stopped' : 'mini.palco.result'), 88, 32, '#fff8e8');
      base.text(songName(last.song), 88, 40, '#ffe27a');
      // Estrelas, uma a cada 380 ms depois de 300 ms.
      const shownStars = Math.min(last.stars, Math.max(0, Math.floor((t - 300) / 380) + 1));
      if (shownStars > result.stars) {
        result.stars = shownStars;
        result.starAt = now;
        const x = 66 + (shownStars - 1) * 12 + 5;
        base.ring(x, 51, now, { from: 3, to: 18, color: '#ffe27a', ms: 560, thick: 2 });
        base.bits(x, 51, 14, now, { colors: ['#ffd21e', '#fff0a0', '#ffffff'], speed: 40, gravity: 40, ms: 900 });
        base.flash('#fff2b0', 0.1, 220, now);
        hooks.sound?.(shownStars === 3 ? 'conquista' : 'brilho');
        if (shownStars === 3) {
          base.bits(88, 26, 40, now, { colors: ['#ffd21e', '#ff4f9e', '#3a6cf0', '#35a03a', '#ff8a12', '#ffffff'], speed: 70, arc: [0.3, 2.85], gravity: 70, ms: 1700 });
          base.shake(1.4, 420, now);
        }
      }
      stars(66, 46, shownStars, 2, now, result.starAt);
      // A precisão sobe contando.
      const counted = Math.round(last.accuracy * 100 * Math.min(1, Math.max(0, (t - 200) / 800)));
      base.text(tr('mini.palco.accuracy', { n: counted }), 88, 60, '#fff8e8');
      if (t > 900) base.text(tr('mini.palco.counts', { p: last.perfect, g: last.good, m: last.miss }), 88, 67, '#8ed6ff');
      if (t > 1200) {
        let y = 75;
        if (last.practice) base.text(tr('mini.palco.practiceNote'), 88, y, '#8ed6ff');
        else {
          if (last.first) { base.text(tr('mini.palco.first3'), 88, y, '#9ef05a'); y += 7; }
          const reward = last.reward || {};
          const first = [];
          const second = [];
          if (reward.cheer) first.push(tr('gain.cheer', { n: compact(reward.cheer) }));
          if (reward.tickets) second.push(tr('gain.tickets', { n: reward.tickets }));
          if (reward.love) second.push(tr('mini.gain.love', { n: Math.round(reward.love) }));
          if (!first.length && !second.length) base.text(tr('mini.palco.noReward'), 88, y, '#ffe27a');
          for (const rowText of [first, second]) if (rowText.length) { base.text(rowText.join('  '), 88, y, '#ffe27a'); y += 7; }
        }
        if (result.counted !== 1) {
          result.counted = 1;
          if (!last.practice && last.reward && (last.reward.cheer || last.reward.tickets)) base.pop(tr('mini.palco.rewardPop'), 88, 28, now, '#ffe27a', { scale: 2, ms: 1400, rise: 8 });
        }
      }
      if (t > 1500 && Math.floor(now / 500) % 2 === 0) base.text(tr('mini.palco.close'), 88, 98, '#9a9ca8');
      base.region('resultado', 22, 28, 132, 78, { tip: tr('mini.palco.tipClose') });
    }

    function draw(engine, now) {
      engineRef = engine;
      const info = engine.mini('palco').info();
      base.clear();
      base.clearRegions();
      meta.x.forEach((x, lane) => base.region(`pista:${lane}`, x - 29, meta.topo - 6, 58, meta.pes - meta.topo + 6, { lane, tip: tr(`mini.palco.lane.${lane}`) }));
      base.picture(meta.fundo.image);
      base.sprite(meta.varal, [0, 1, 2, 1][Math.floor(now / 520) % 4], 0, 24);
      drawLights(info, now);
      drawMarquee(info, now);
      drawBand(info, now);
      drawFootlights(info, now);
      if (info.show) drawShow(info, now);
      else drawTargets(info, now);
      base.drawParticles(now);
      base.drawSays(now);
      if (info.last) drawResult(info, now);
      else if (!info.show) drawMenu(info, now);
      shownMode = modeOf(info);
      base.drawFx(now);
      return true;
    }

    function click(clientX, clientY, now = 0) {
      if (!engineRef) return false;
      const model = engineRef.mini('palco');
      const info = model.info();
      if (shownMode !== modeOf(info)) return true;
      if (info.last) { model.ack(); hooks.sound?.('clique'); return true; }
      const found = base.hit(clientX, clientY);
      if (!info.show) {
        if (!found?.musica) return false;
        if (!found.open) { hooks.sound?.('erro'); base.tap(found.point.x, found.point.y, now); return true; }
        if (model.start(found.musica).ok) {
          hooks.sound?.('abrir');
          base.flash('#fff2b0', 0.15, 240, now);
          base.bits(88, 40, 18, now, { colors: ['#ffd21e', '#ff4f9e', '#3a6cf0', '#35a03a', '#ff8a12'], speed: 60, arc: [-3.0, -0.1], gravity: 60, ms: 1000 });
        }
        return true;
      }
      playLane(model, found?.lane ?? laneAt(base.toArt(clientX, clientY).x), now);
      return true;
    }

    // Marca a nota da pista (clique ou tecla): o músico reage, a nota acende e o aviso diz o quanto acertou.
    function playLane(model, lane, now) {
      const got = model.hit(lane);
      const x = meta.x[lane];
      if (got.ok) {
        const perfect = got.judge === 'perfect';
        // O acorde de sanfona acompanha a tonalidade da música (o triângulo e a zabumba ficam como estão).
        const key = lane === 2 ? songOf(model.info().show?.song)?.key || 0 : 0;
        hooks.sound?.(LANE_SOUND[lane], { pitch: [0, 2, 4, 7][got.combo % 4] + key });
        reactUntil[lane] = now + 220;
        pulse[lane] = now;
        base.spawn(lane === 1 ? 'nota' : 'nota2', x - 2, meta.pes - 42, now);
        // O acerto estoura no círculo: anel da cor da pista, anel branco, faíscas e o aviso grande.
        base.ring(x, meta.alvo, now, { from: 6, to: perfect ? 22 : 16, color: LANE_COLORS[lane], ms: 420, thick: perfect ? 2 : 1 });
        if (perfect) base.ring(x, meta.alvo, now, { from: 3, to: 12, color: '#ffffff', ms: 300 });
        base.bits(x, meta.alvo, perfect ? 12 : 6, now, { colors: [LANE_COLORS[lane], '#ffffff', '#fff0a0'], speed: perfect ? 46 : 30, gravity: 50, ms: 650 });
        base.pop(tr(perfect ? 'mini.palco.perfect' : 'mini.palco.good'), x, meta.alvo - 22, now, perfect ? '#ffe27a' : '#9ef05a', { ms: 800, rise: 8 });
        if (perfect) base.spawn('estrela', x + 8, meta.alvo - 8, now);
        // Patamares do combo: a cada 10 acertos seguidos, uma comemoração do palco inteiro.
        if (got.combo >= 10 && got.combo % 10 === 0) {
          base.flash('#fff2b0', 0.16, 260, now);
          base.shake(1.2, 260, now);
          base.bits(88, 30, 24, now, { colors: ['#ffd21e', '#ff4f9e', '#3a6cf0', '#35a03a', '#ff8a12'], speed: 56, arc: [0.2, 2.9], gravity: 70, ms: 1100 });
          base.pop(tr('mini.palco.combo', { n: got.combo }), 88, 38, now, TIER_COLORS[tierOf(got.combo)], { scale: 2, ms: 1200, rise: 6 });
          hooks.sound?.('conquista');
        }
      } else {
        hooks.sound?.('errou');
        base.pop(tr('mini.palco.off'), x, meta.alvo - 22, now, '#ff9a8a', { ms: 700, rise: 4 });
        base.tap(x, meta.alvo, now);
      }
    }

    // As teclas 1, 2 e 3 tocam as pistas da esquerda para a direita, só com o show rolando (no menu e no resultado não fazem nada,
    // para a pessoa que continua marcando o ritmo não fechar o resultado sem querer). Devolve se a tecla foi usada.
    function key(name, now = 0) {
      const lane = LANE_KEYS.indexOf(name);
      if (lane < 0 || !engineRef) return false;
      const model = engineRef.mini('palco');
      if (!model.info().show || shownMode !== 'show') return false;
      playLane(model, lane, now);
      return true;
    }

    function status(engine) {
      const info = engine.mini('palco').info();
      if (info.show) return `${songName(info.show.song)} · ${tr('mini.palco.combo', { n: info.show.combo })}`;
      return tr('mini.palco.stars', { n: info.songs.reduce((sum, song) => sum + song.stars, 0), m: info.songs.length * 3 });
    }

    // Nota que o jogo marcou como errada (passou da hora): o músico faz careta e o aviso aparece.
    function onEvents(engine, events, now) {
      engineRef = engine;
      for (const event of events) {
        if (event.type !== 'mini' || event.mini !== 'palco') continue;
        if (event.kind === 'miss') {
          const x = meta.x[event.lane];
          base.pop(tr('mini.palco.miss'), x, meta.alvo - 22, now, '#ff6a6a', { ms: 700, rise: 4 });
          base.flash('#ff2a2a', 0.1, 160, now, { x: x - 14, y: meta.topo - 6, w: 28, h: meta.alvo - meta.topo + 22 });
          base.bits(x, meta.alvo, 6, now, { colors: ['#ff6a6a', '#8a2a2a', '#3a2a40'], speed: 20, up: -8, gravity: 90, ms: 600 });
          base.shake(0.6, 150, now);
        } else if (event.kind === 'show-end' && !event.practice && !event.aborted && event.stars === 3) hooks.toast?.(tr('mini.palco.threeStars', { song: songName(event.song) }), 'ouro');
      }
    }

    function probe() {
      return { ...base.probeBase(), notes: drawnNotes };
    }

    return { size: base.size, setScale: base.setScale, draw, hit: base.hit, click, key, status, onEvents, probe };
  }

  root.ArraiaJanelas.registerView('palco', create);
})(typeof globalThis !== 'undefined' ? globalThis : this);
