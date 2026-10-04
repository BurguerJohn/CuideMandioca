// Palco do Forró: escolha uma música e marque o ritmo clicando na pista (triângulo, zabumba ou sanfona), ou apertando a tecla 1, 2 ou 3,
// na hora em que a nota chega no círculo. O trio toca junto. No fim, estrelas e o prêmio. O motor está em src/mini-palco.js.
(function (root) {
  'use strict';

  const Base = root.ArraiaJanelaBase;
  const W = 176;
  const H = 120;
  const LANE_SOUND = ['palco-triangulo', 'palco-zabumba', 'palco-sanfona'];
  const LANE_KEYS = ['1', '2', '3'];
  const compact = n => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(Math.round(n)));
  const clock = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

  function create(canvas, bundle, hooks = {}) {
    const meta = bundle.janelas.palco;
    const base = Base.create(canvas, bundle, { width: W, height: H, sound: hooks.sound, images: [meta.fundo.image, meta.trio.image, meta.notas.image] });
    const tr = hooks.t || Base.tr;
    const fx = bundle.casa.fx;
    const starIndex = fx.ids.indexOf('estrela');
    let engineRef = null;
    let drawnNotes = 0;
    let shownMode = null;
    const reactUntil = [0, 0, 0];
    const flash = [0, 0, 0];

    const songName = id => engineRef?.data.minis.palco.songs.find(entry => entry.id === id)?.name || id;
    const laneAt = x => Math.max(0, Math.min(2, Math.floor(x / (W / 3))));
    const modeOf = info => info.last ? 'result' : info.show ? 'show' : 'menu';

    function panel(x, y, w, h) {
      base.g.fillStyle = 'rgba(14, 10, 30, 0.86)';
      base.g.fillRect(x, y, w, h);
      base.g.fillStyle = '#ffd21e';
      base.g.fillRect(x, y, w, 1);
      base.g.fillRect(x, y + h - 1, w, 1);
      base.g.fillRect(x, y, 1, h);
      base.g.fillRect(x + w - 1, y, 1, h);
    }

    function stars(x, y, count, size = 1) {
      for (let i = 0; i < 3; i++) {
        base.g.globalAlpha = i < count ? 1 : 0.25;
        base.sprite(fx, starIndex, x + i * (6 * size), y, { w: fx.w * size, h: fx.h * size });
      }
      base.g.globalAlpha = 1;
    }

    function ring(cx, cy, r, color) {
      base.g.fillStyle = color;
      for (let k = 0; k < 28; k++) {
        const a = k / 28 * Math.PI * 2;
        base.g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
      }
    }

    function drawBand(show, now) {
      const sheet = meta.trio;
      meta.x.forEach((x, i) => {
        const reacting = reactUntil[i] > now;
        const frame = i * (meta.trio.quadros + 1) + (reacting ? meta.trio.quadros : Math.floor(now / 1000 * (show ? 5 : 2.5) + i) % meta.trio.quadros);
        base.sprite(sheet, frame, x - sheet.w / 2, meta.pes - sheet.h + (reacting ? -3 : 0));
      });
    }

    function drawShow(info, now) {
      const cfg = engineRef.data.minis.palco;
      const show = info.show;
      // As três pistas: o círculo onde acertar (acende quando acerta) e as notas que descem.
      meta.x.forEach((x, lane) => {
        const lit = flash[lane] > now;
        ring(x, meta.alvo, 8, lit ? '#ffffff' : '#ffe27a');
        ring(x, meta.alvo, 7, lit ? '#ffe27a' : '#8a6a1c');
        base.text(LANE_KEYS[lane], x, meta.alvo + 10, lit ? '#ffffff' : '#ffe27a');
        if (lit) { base.g.fillStyle = 'rgba(255, 240, 160, 0.35)'; base.g.fillRect(x - 6, meta.alvo - 6, 13, 13); }
      });
      drawnNotes = 0;
      for (const note of show.notes) {
        if (note.state) continue;
        const ahead = note.t - show.time;
        if (ahead > cfg.travel || ahead < -cfg.good) continue;
        const progress = 1 - ahead / cfg.travel;
        const y = meta.topo + (meta.alvo - meta.topo) * progress;
        base.sprite(meta.notas, note.lane, meta.x[note.lane] - 7, y - 7);
        drawnNotes++;
      }
      // Combo e quanto da música já foi.
      if (show.combo >= 2) base.text(tr('mini.palco.combo', { n: show.combo }), 150, 26, '#ffe27a');
      const total = show.notes[show.notes.length - 1].t + 1200;
      base.g.fillStyle = '#26242e';
      base.g.fillRect(0, 0, W, 2);
      base.g.fillStyle = '#ff6a8a';
      base.g.fillRect(0, 0, Math.round(W * Math.min(1, show.time / total)), 2);
      if (show.practice) base.text(tr('mini.palco.practice'), 26, 26, '#8ed6ff');
    }

    function drawMenu(info, now) {
      panel(18, 26, 140, 64);
      base.text(tr('mini.palco.pick'), 88, 30, '#fff8e8');
      info.songs.forEach((song, i) => {
        const y = 39 + i * 11;
        base.g.fillStyle = song.open ? '#52301a' : '#2a2430';
        base.g.fillRect(22, y, 132, 10);
        base.text(song.open ? song.name : tr('mini.palco.locked'), 70, y + 2, song.open ? '#ffe27a' : '#8a8a98');
        if (song.open) stars(124, y + 2, song.stars);
        base.region(`musica:${song.id}`, 22, y, 132, 10, { musica: song.id, open: song.open,
          tip: song.open ? tr('mini.palco.tipSong', { song: song.name, n: song.stars, bpm: song.bpm }) : tr('mini.palco.tipLocked') });
      });
      const rest = info.cooldown > 0;
      base.text(rest ? tr('mini.palco.rest', { t: clock(info.cooldown) }) : tr('mini.palco.ready'), 88, 83, rest ? '#8ed6ff' : '#9ef05a');
    }

    function drawResult(info, now) {
      const last = info.last;
      panel(22, 24, 132, 78);
      base.text(tr(last.aborted ? 'mini.palco.stopped' : 'mini.palco.result'), 88, 28, '#fff8e8');
      base.text(songName(last.song), 88, 36, '#ffe27a');
      stars(66, 46, last.stars, 2);
      base.text(tr('mini.palco.accuracy', { n: Math.round(last.accuracy * 100) }), 88, 62, '#fff8e8');
      base.text(tr('mini.palco.counts', { p: last.perfect, g: last.good, m: last.miss }), 88, 70, '#8ed6ff');
      let y = 78;
      if (last.practice) base.text(tr('mini.palco.practiceNote'), 88, y, '#8ed6ff');
      else {
        if (last.first) { base.text(tr('mini.palco.first3'), 88, y, '#9ef05a'); y += 7; }
        const reward = last.reward || {};
        const lines = [];
        if (reward.cheer) lines.push(tr('gain.cheer', { n: compact(reward.cheer) }));
        if (reward.tickets) lines.push(tr('gain.tickets', { n: reward.tickets }));
        if (reward.love) lines.push(tr('mini.gain.love', { n: Math.round(reward.love) }));
        base.text(lines.join('  ') || tr('mini.palco.noReward'), 88, y, '#ffe27a');
      }
      if (Math.floor(now / 500) % 2 === 0) base.text(tr('mini.palco.close'), 88, 94, '#9a9ca8');
      base.region('resultado', 22, 24, 132, 78, { tip: tr('mini.palco.tipClose') });
    }

    function draw(engine, now) {
      engineRef = engine;
      const info = engine.mini('palco').info();
      base.clear();
      base.clearRegions();
      meta.x.forEach((x, lane) => base.region(`pista:${lane}`, x - 29, meta.topo - 6, 58, meta.pes - meta.topo + 6, { lane, tip: tr(`mini.palco.lane.${lane}`) }));
      base.picture(meta.fundo.image);
      drawBand(info.show, now);
      if (info.show) drawShow(info, now);
      base.drawParticles(now);
      base.drawSays(now);
      if (info.last) drawResult(info, now);
      else if (!info.show) drawMenu(info, now);
      shownMode = modeOf(info);
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
        if (!found.open) { hooks.sound?.('erro'); return true; }
        if (model.start(found.musica).ok) hooks.sound?.('abrir');
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
        hooks.sound?.(LANE_SOUND[lane], { pitch: [0, 2, 4, 7][got.combo % 4] });
        reactUntil[lane] = now + 220;
        flash[lane] = now + 140;
        base.spawn(lane === 1 ? 'nota' : 'nota2', x - 2, meta.pes - 40, now);
        base.say(tr(perfect ? 'mini.palco.perfect' : 'mini.palco.good'), x, meta.alvo - 18, now, perfect ? '#ffe27a' : '#9ef05a');
        if (perfect) base.spawn('estrela', x + 8, meta.alvo - 8, now);
      } else {
        hooks.sound?.('errou');
        base.say(tr('mini.palco.off'), x, meta.alvo - 18, now, '#ff9a8a');
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
        if (event.kind === 'miss') base.say(tr('mini.palco.miss'), meta.x[event.lane], meta.alvo - 18, now, '#ff6a6a');
        else if (event.kind === 'show-end' && !event.practice && !event.aborted && event.stars === 3) hooks.toast?.(tr('mini.palco.threeStars', { song: songName(event.song) }), 'ouro');
      }
    }

    function probe() {
      return { ...base.probeBase(), notes: drawnNotes };
    }

    return { size: base.size, setScale: base.setScale, draw, hit: base.hit, click, key, status, onEvents, probe };
  }

  root.ArraiaJanelas.registerView('palco', create);
})(typeof globalThis !== 'undefined' ? globalThis : this);
