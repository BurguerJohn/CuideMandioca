(function (root) {
  'use strict';

  // Argolas da Sorte: a argola balança sobre as garrafas; clique para soltar e tente encaixar no gargalo.
  const W = 176;
  const H = 112;
  const BOTTLES = [24, 56, 88, 120, 152];
  const COUNTER = 78;
  const RING_Y = 24;
  const NECK_Y = COUNTER - 22;
  const PERIODS = [1800, 1400, 1150, 950];
  const FALL_MS = 340;
  const HIT_RANGE = 4;
  const NEAR = 8;
  // Textos do minijogo no idioma do jogo (src/i18n.js); sem o módulo, a própria chave.
  const tr = (key, vars) => (root.ArraiaI18n ? root.ArraiaI18n.t(key, vars) : key);

  // onLand: a argola caiu (acertou ou não), para o jogo tocar o som certo.
  function create(canvas, bundle, { onThrow, onEnd, onLand = () => {} }) {
    const text = root.ArraiaFesta.pixelText;
    const images = {};
    const ready = image => image && image.complete !== false && image.width > 0;
    const load = (name, src) => {
      const image = new Image();
      image.onerror = () => {
        const blank = document.createElement('canvas');
        blank.width = blank.height = 1;
        images[name] = blank;
      };
      images[name] = image;
      image.src = src;
    };
    for (const key of ['fundo', 'garrafa', 'argola']) load(key, bundle.images[bundle.rings[key].image]);
    for (const key of ['fichas', 'animacao', 'lenha', 'presente']) load(key, bundle.icons[`ui:${key}`].src);
    const meta = bundle.rings;
    const buffer = document.createElement('canvas');
    buffer.width = W;
    buffer.height = H;
    const g = buffer.getContext('2d');
    const out = canvas.getContext('2d');
    let game = null;

    function setScale(css) {
      const dpr = root.devicePixelRatio || 1;
      const physical = Math.max(1, Math.round(css * dpr));
      canvas.width = W * physical;
      canvas.height = H * physical;
      canvas.style.width = `${canvas.width / dpr}px`;
      canvas.style.height = `${canvas.height / dpr}px`;
      out.imageSmoothingEnabled = false;
    }

    function ringX(now) {
      const period = PERIODS[Math.min(game.thrown, PERIODS.length - 1)];
      return Math.round(W / 2 + 76 * Math.sin((now - game.aimFrom) / period * Math.PI * 2));
    }

    function start(round, now) {
      game = { round, thrown: 0, landed: [], phase: 'mirando', aimFrom: now, fall: null, says: [], ended: false };
    }

    function reset() { game = null; }

    // A argola só encaixa se passar pela boca da garrafa: a folga vem do prêmio (garrafa de boca larga, mira fina).
    function throwRing(now) {
      // O clique pode chegar depois do pouso e antes do desenho seguinte.
      const before = game;
      update(now);
      if (game !== before) return false;
      if (!game || game.phase !== 'mirando') return false;
      const current = game;
      const x = ringX(now);
      const prizes = game.round.prizes;
      const index = BOTTLES.findIndex((bx, i) => Math.abs(bx - x) <= (prizes[i]?.aim ?? HIT_RANGE));
      const bottle = index >= 0 && !game.landed.some(l => l.bottle === index) ? index : null;
      const near = BOTTLES.some(bx => Math.abs(bx - x) <= NEAR);
      game.phase = 'lancando';
      let result;
      try { result = onThrow(bottle); } catch (error) {
        if (game === current) game.phase = 'mirando';
        throw error;
      }
      if (game !== current) return true;
      game.phase = 'caindo';
      game.fall = { x, from: now, bottle, near, hit: !!result?.hit,
        prize: result?.prize ?? prizes[bottle], color: game.thrown % 3 };
      return true;
    }

    function prizeTag(prize, x, y) {
      if (prize.kind === 'x2' || prize.kind === 'x3') {
        text(g, `X${prize.mult}`, x, y + 4, '#ffd21e');
        return;
      }
      const iconName = { fichas: 'fichas', animacao: 'animacao', lenha: 'lenha', item: 'presente' }[prize.kind];
      const image = images[iconName];
      if (ready(image)) g.drawImage(image, Math.round(x - image.width / 2), y);
      const label = prize.kind === 'animacao' ? `X${prize.factor}` : prize.kind === 'item' ? '?' : `+${prize.amount}`;
      text(g, label, x, y + 12, '#fff4e4');
    }

    function say(message, color, now) {
      game.says.push({ message, color, from: now });
    }

    function update(now) {
      if (!game || game.phase !== 'caindo' || now - game.fall.from < FALL_MS) return;
      const fall = game.fall;
      const landedAt = fall.from + FALL_MS;
      game.thrown++;
      let result;
      if (fall.hit) {
        game.landed.push({ bottle: fall.bottle, color: fall.color });
        const p = fall.prize;
        say(p.mult ? tr('fx.ringsMult', { n: p.mult }) : p.kind === 'animacao' ? tr('fx.ringsCheer', { n: p.factor })
          : p.kind === 'item' ? tr('fx.gift') : tr('fx.ringsHit'), '#9ef05a', landedAt);
        result = { hit: true, prize: p };
      } else {
        game.misses = [...(game.misses || []), { x: fall.x, color: fall.color, from: landedAt }];
        say(tr(fall.near ? 'fx.ringsClose' : 'fx.ringsMiss'), '#ff907a', landedAt);
        result = { hit: false, near: fall.near };
      }
      game.fall = null;
      if (game.thrown >= game.round.total) {
        game.phase = 'fim';
        game.endAt = landedAt + 700;
      } else {
        game.phase = 'mirando';
        game.aimFrom = landedAt;
      }
      onLand(result);
    }

    function draw(now) {
      update(now);
      if (game?.phase === 'fim' && !game.ended && now >= game.endAt) {
        game.ended = true;
        onEnd();
      }
      if (!ready(images.fundo)) return;
      g.clearRect(0, 0, W, H);
      g.drawImage(images.fundo, 0, 0);
      const bottle = meta.garrafa;
      const ring = meta.argola;
      BOTTLES.forEach((x, i) => {
        const frame = game ? Math.max(0, bottle.kinds.indexOf(game.round.prizes[i].kind)) : i;
        g.drawImage(images.garrafa, frame * bottle.w, 0, bottle.w, bottle.h, x - Math.floor(bottle.w / 2),
          COUNTER - bottle.h + 1, bottle.w, bottle.h);
        if (game) prizeTag(game.round.prizes[i], x, COUNTER + 6);
        else text(g, '?', x, COUNTER + 12, '#fff4e4');
      });
      if (game) {
        for (const landed of game.landed) {
          g.drawImage(images.argola, landed.color * ring.w, 0, ring.w, ring.h, BOTTLES[landed.bottle] - ring.w / 2, NECK_Y + 2, ring.w, ring.h);
        }
        for (const miss of game.misses || []) {
          const t = Math.min(1, (now - miss.from) / 500);
          g.globalAlpha = 1 - t * 0.6;
          g.drawImage(images.argola, miss.color * ring.w, 0, ring.w, ring.h, miss.x - ring.w / 2 + t * 6,
            COUNTER - ring.h + Math.round(-Math.sin(t * Math.PI) * 6), ring.w, ring.h);
          g.globalAlpha = 1;
        }
        if (game.phase === 'mirando') {
          const x = ringX(now);
          g.fillStyle = 'rgba(255, 244, 228, 0.55)';
          for (let y = RING_Y + 8; y < NECK_Y; y += 4) g.fillRect(x, y, 1, 2);
          g.drawImage(images.argola, (game.thrown % 3) * ring.w, 0, ring.w, ring.h, x - ring.w / 2, RING_Y, ring.w, ring.h);
        } else if (game.phase === 'caindo') {
          const f = game.fall;
          const t = Math.min(1, (now - f.from) / FALL_MS);
          const targetY = f.hit ? NECK_Y + 2 : COUNTER - ring.h;
          const y = RING_Y + (targetY - RING_Y) * t * t;
          g.drawImage(images.argola, f.color * ring.w, 0, ring.w, ring.h, f.x - ring.w / 2, y, ring.w, ring.h);
        }
        for (let i = 0; i < game.round.total; i++) {
          g.drawImage(images.argola, (i % 3) * ring.w, 0, ring.w, ring.h, 4 + i * 15, 17, ring.w, ring.h);
          if (i < game.thrown) { g.fillStyle = 'rgba(46, 24, 18, 0.7)'; g.fillRect(4 + i * 15, 17, ring.w, ring.h); }
        }
        game.says = game.says.filter(s => now - s.from < 1100);
        for (const s of game.says) {
          const t = (now - s.from) / 1100;
          text(g, s.message, W / 2, 34 - t * 8, s.color, t > 0.7 ? (1 - t) * 3 : 1);
        }
      } else {
        text(g, tr('fx.ringsInsert'), W / 2, 36, '#ffd21e');
      }
      out.clearRect(0, 0, canvas.width, canvas.height);
      out.imageSmoothingEnabled = false;
      out.drawImage(buffer, 0, 0, canvas.width, canvas.height);
    }

    setScale(3);
    return { start, reset, throwRing, draw, setScale, get active() { return !!game && game.phase !== 'fim'; } };
  }

  root.ArraiaArgolas = { create, BOTTLES };
})(typeof globalThis !== 'undefined' ? globalThis : this);
