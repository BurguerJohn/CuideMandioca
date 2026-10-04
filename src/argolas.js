(function (root) {
  'use strict';

  // Argolas da Sorte: a argola balança sobre as garrafas, pendurada num gancho que corre no trilho; clique para soltar e tente encaixar no gargalo.
  // Quando a argola está na altura de uma garrafa que aceita o encaixe, o gargalo brilha em verde (e a sombra da argola mostra onde ela cai).
  const W = 176;
  const H = 112;
  const BOTTLES = [24, 56, 88, 120, 152];
  const COUNTER = 78;
  const RING_Y = 24;
  const NECK_Y = COUNTER - 22;
  const RAIL_Y = 19;
  const PERIODS = [1800, 1400, 1150, 950];
  const FALL_MS = 340;
  const HIT_RANGE = 4;
  const NEAR = 8;
  const RING_COLORS = [['#ee2f3c', '#ff8a96'], ['#ffd21e', '#fff07a'], ['#3fd6f0', '#b8f4ff']];
  // Textos do minijogo no idioma do jogo (src/i18n.js); sem o módulo, a própria chave.
  const tr = (key, vars) => (root.ArraiaI18n ? root.ArraiaI18n.t(key, vars) : key);
  // Sem a base das janelas (os testes carregam só este arquivo), os efeitos viram nada.
  const NO_FX = new Proxy({}, { get: () => () => {} });

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
    // Os efeitos (tremida, anéis, confete, números) desenham no buffer; a tremida mexe no canvas de verdade.
    const view = { width: W, height: H, get physical() { return (canvas.width / W) || 1; } };
    const fx = root.ArraiaJanelaBase?.createFx
      ? root.ArraiaJanelaBase.createFx(g, { view, canvas, text: (value, cx, y, color, alpha = 1, scale = 1) => text(g, value, cx, y, color, alpha, scale) })
      : NO_FX;

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
      game = { round, thrown: 0, landed: [], phase: 'mirando', aimFrom: now, fall: null, says: [], ended: false, flashes: {} };
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
      // O arremesso: a argola sai do gancho com um estalinho de poeira prateada.
      fx.bits(x, RING_Y + 2, 5, now, { colors: ['#c8ccd6', '#ffffff'], speed: 16, arc: [1.0, 2.1], gravity: 60, ms: 300 });
      return true;
    }

    // O texto pequeno do prêmio (para pôr em cima da garrafa quando ela é acertada e embaixo, na plaquinha).
    function prizeLabel(prize) {
      if (prize.kind === 'x2' || prize.kind === 'x3') return `X${prize.mult}`;
      return prize.kind === 'animacao' ? `X${prize.factor}` : prize.kind === 'item' ? '?' : `+${prize.amount}`;
    }

    function prizeTag(prize, x, y, now, flashAt = -1e9) {
      const lit = now - flashAt < 420;
      // A plaquinha de madeira escura em que o prêmio está escrito (acende quando a garrafa é acertada).
      g.fillStyle = '#1e0e08';
      g.fillRect(x - 11, y - 2, 23, 19);
      g.fillStyle = lit ? '#8a5a1c' : '#4a2818';
      g.fillRect(x - 10, y - 1, 21, 17);
      g.fillStyle = lit ? '#ffd860' : '#7a4a28';
      g.fillRect(x - 10, y - 1, 21, 1);
      if (prize.kind === 'x2' || prize.kind === 'x3') {
        text(g, `X${prize.mult}`, x, y + 4, lit ? '#ffffff' : '#ffd21e');
        return;
      }
      const iconName = { fichas: 'fichas', animacao: 'animacao', lenha: 'lenha', item: 'presente' }[prize.kind];
      const image = images[iconName];
      if (ready(image)) g.drawImage(image, Math.round(x - image.width / 2), y);
      text(g, prizeLabel(prize), x, y + 12, lit ? '#ffffff' : '#fff4e4');
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
        game.landed.push({ bottle: fall.bottle, color: fall.color, at: landedAt });
        const p = fall.prize;
        say(p.mult ? tr('fx.ringsMult', { n: p.mult }) : p.kind === 'animacao' ? tr('fx.ringsCheer', { n: p.factor })
          : p.kind === 'item' ? tr('fx.gift') : tr('fx.ringsHit'), '#9ef05a', landedAt);
        result = { hit: true, prize: p };
        // Encaixou: o gargalo estala em verde, a argola vira festa e o prêmio pula em cima da garrafa.
        const bx = BOTTLES[fall.bottle];
        const big = p.kind === 'item' || p.kind === 'x3' || p.kind === 'x2';
        const [c1, c2] = RING_COLORS[fall.color];
        game.flashes[fall.bottle] = landedAt;
        fx.ring(bx, NECK_Y + 3, landedAt, { from: 3, to: big ? 24 : 16, color: '#9ef05a', ms: 520, thick: 2 });
        fx.ring(bx, NECK_Y + 3, landedAt, { from: 2, to: 11, color: c2, ms: 380 });
        fx.bits(bx, NECK_Y + 2, big ? 26 : 14, landedAt, { colors: [c1, c2, '#ffd21e', '#ffffff', '#9ef05a'], speed: big ? 56 : 42, arc: [-2.9, -0.25], gravity: 70, ms: 900 });
        fx.pop(prizeLabel(p), bx, NECK_Y - 14, landedAt, '#ffe27a', { scale: big ? 2 : 1, ms: 1100, rise: 10 });
        if (big) { fx.flash('#fff2b0', 0.18, 280, landedAt); fx.shake(1.3, 260, landedAt); } else fx.shake(0.6, 140, landedAt);
      } else {
        game.misses = [...(game.misses || []), { x: fall.x, color: fall.color, from: landedAt }];
        say(tr(fall.near ? 'fx.ringsClose' : 'fx.ringsMiss'), '#ff907a', landedAt);
        result = { hit: false, near: fall.near };
        // Errou: a argola quica no balcão levantando poeira, e a garrafa mais perto treme (quase!).
        fx.bits(fall.x, COUNTER - 1, 6, landedAt, { colors: ['#c8a468', '#8a6a3a', '#ffffff'], speed: 24, arc: [-2.8, -0.35], gravity: 90, ms: 450 });
        fx.shake(fall.near ? 0.7 : 0.4, 140, landedAt);
        if (fall.near) fx.pop('!', fall.x, COUNTER - 22, landedAt, '#ff907a', { scale: 2, ms: 700, rise: 4 });
      }
      game.fall = null;
      if (game.thrown >= game.round.total) {
        game.phase = 'fim';
        game.endAt = landedAt + 700;
        // Fim da rodada: se foi bem (3 ou mais), chove confete no balcão inteiro.
        if (game.landed.length >= 3) fx.bits(W / 2, 40, 36, landedAt + 150, { colors: ['#ffd21e', '#ff4f9e', '#3a6cf0', '#35a03a', '#ff8a12', '#ffffff'], speed: 64, arc: [0.2, 2.9], gravity: 60, ms: 1400 });
      } else {
        game.phase = 'mirando';
        game.aimFrom = landedAt;
      }
      onLand(result);
    }

    // O trilho do gancho: o carrinho com a rodinha e o fio até a argola (que balança de leve).
    function drawHook(x, now, swing) {
      g.fillStyle = '#26242e';
      g.fillRect(x - 4, RAIL_Y - 2, 9, 5);
      g.fillStyle = '#7a7a90';
      g.fillRect(x - 3, RAIL_Y - 1, 7, 2);
      g.fillStyle = '#c8ccd6';
      g.fillRect(x - 3, RAIL_Y - 1, 7, 1);
      g.fillStyle = '#26242e';
      g.fillRect(x - 3, RAIL_Y + 3, 2, 1);
      g.fillRect(x + 2, RAIL_Y + 3, 2, 1);
      g.fillStyle = '#9a9ca8';
      g.fillRect(x, RAIL_Y + 3, 1, RING_Y - RAIL_Y - 3);
      if (swing) { g.fillStyle = '#ffffff'; g.fillRect(x, RAIL_Y + 4, 1, 1); }
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
      const aimX = game?.phase === 'mirando' ? ringX(now) : null;
      BOTTLES.forEach((x, i) => {
        const frame = game ? Math.max(0, bottle.kinds.indexOf(game.round.prizes[i].kind)) : i;
        const landed = game?.landed.find(l => l.bottle === i);
        // Quando a argola está na altura de uma garrafa que aceita o encaixe, o gargalo brilha; quem acabou de ser acertada dá um tremelique.
        if (aimX !== null && !landed && Math.abs(aimX - x) <= (game.round.prizes[i]?.aim ?? HIT_RANGE)) fx.glow(x, NECK_Y + 1, 9, '#9ef05a', 0.2 + 0.08 * Math.sin(now / 80));
        const shake = landed && now - landed.at < 260 ? Math.round(Math.sin((now - landed.at) / 30) * 1.5 * (1 - (now - landed.at) / 260)) : 0;
        g.drawImage(images.garrafa, frame * bottle.w, 0, bottle.w, bottle.h, x - Math.floor(bottle.w / 2) + shake,
          COUNTER - bottle.h + 1, bottle.w, bottle.h);
        if (game) prizeTag(game.round.prizes[i], x, COUNTER + 6, now, game.flashes[i]);
        else text(g, '?', x, COUNTER + 12, '#fff4e4');
      });
      if (game) {
        // As argolas que ainda restam ficam penduradas na frente do balcão (as usadas ficam apagadas).
        for (let i = 0; i < game.round.total; i++) {
          const rx = 4 + i * 15;
          g.drawImage(images.argola, (i % 3) * ring.w, 0, ring.w, ring.h, rx, 100, ring.w, ring.h);
          if (i < game.thrown) { g.fillStyle = 'rgba(46, 24, 18, 0.7)'; g.fillRect(rx, 100, ring.w, ring.h); }
        }
        for (const landed of game.landed) {
          // A argola assentou no gargalo: dá uma balançadinha que vai morrendo.
          const age = now - (landed.at ?? -1e9);
          const wobble = age < 420 ? Math.round(Math.sin(age / 55) * 1.5 * (1 - age / 420)) : 0;
          const drop = age < 90 ? -2 : 0;
          g.drawImage(images.argola, landed.color * ring.w, 0, ring.w, ring.h, BOTTLES[landed.bottle] - ring.w / 2 + wobble, NECK_Y + 2 + drop, ring.w, ring.h);
        }
        for (const miss of game.misses || []) {
          const t = Math.min(1, (now - miss.from) / 500);
          g.globalAlpha = 1 - t * 0.6;
          g.drawImage(images.argola, miss.color * ring.w, 0, ring.w, ring.h, miss.x - ring.w / 2 + t * 6,
            COUNTER - ring.h + Math.round(-Math.sin(t * Math.PI) * 6), ring.w, ring.h);
          g.globalAlpha = 1;
        }
        if (game.phase === 'mirando') {
          const x = aimX;
          // Sombra da argola no balcão e linha pontilhada de queda: mostram onde ela vai cair.
          g.globalAlpha = 0.3;
          g.fillStyle = '#10080a';
          g.fillRect(x - 6, COUNTER, 13, 2);
          g.fillRect(x - 4, COUNTER + 2, 9, 1);
          g.globalAlpha = 1;
          g.fillStyle = 'rgba(255, 244, 228, 0.55)';
          for (let y = RING_Y + 8; y < NECK_Y; y += 4) g.fillRect(x, y, 1, 2);
          drawHook(x, now, Math.floor(now / 140) % 2 === 0);
          g.drawImage(images.argola, (game.thrown % 3) * ring.w, 0, ring.w, ring.h, x - ring.w / 2, RING_Y, ring.w, ring.h);
        } else if (game.phase === 'caindo') {
          const f = game.fall;
          const t = Math.min(1, (now - f.from) / FALL_MS);
          const targetY = f.hit ? NECK_Y + 2 : COUNTER - ring.h;
          const y = RING_Y + (targetY - RING_Y) * t * t;
          drawHook(f.x, now, false);
          // A argola gira no ar: de lado (fininha) no começo e abre de frente ao chegar.
          const spinning = t < 0.45 && meta.argola.frames >= 6;
          const frame = f.color + (spinning ? 3 : 0);
          // Rastro: duas cópias apagadas logo acima.
          g.globalAlpha = 0.25;
          g.drawImage(images.argola, frame * ring.w, 0, ring.w, ring.h, f.x - ring.w / 2, y - 6, ring.w, ring.h);
          g.globalAlpha = 0.12;
          g.drawImage(images.argola, frame * ring.w, 0, ring.w, ring.h, f.x - ring.w / 2, y - 12, ring.w, ring.h);
          g.globalAlpha = 1;
          g.drawImage(images.argola, frame * ring.w, 0, ring.w, ring.h, f.x - ring.w / 2, y, ring.w, ring.h);
        } else drawHook(W / 2, now, false);
        game.says = game.says.filter(s => now - s.from < 1100);
        for (const s of game.says) {
          const t = (now - s.from) / 1100;
          text(g, s.message, W / 2, 40 - t * 8, s.color, t > 0.7 ? (1 - t) * 3 : 1);
        }
      } else {
        drawHook(W / 2, now, false);
        text(g, tr('fx.ringsInsert'), W / 2, 40, '#ffd21e');
      }
      fx.drawFx(now);
      out.clearRect(0, 0, canvas.width, canvas.height);
      out.imageSmoothingEnabled = false;
      out.drawImage(buffer, 0, 0, canvas.width, canvas.height);
    }

    setScale(3);
    return { start, reset, throwRing, draw, setScale, get active() { return !!game && game.phase !== 'fim'; } };
  }

  root.ArraiaArgolas = { create, BOTTLES };
})(typeof globalThis !== 'undefined' ? globalThis : this);
