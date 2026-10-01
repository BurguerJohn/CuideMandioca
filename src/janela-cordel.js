// Cordel da Mandioca: o folheto com a história da Mandioca, uma página por vez. Cada página é uma ilustração animada (a Mandioca vestida com o
// que está equipado e a turma entram por cima da arte) com um quadro de versos embaixo e uma coisa para clicar: clicar `goal` vezes completa a
// página. As setas e as bolinhas viram as páginas (só as liberadas pelos convidados). O motor está em src/mini-cordel.js e a arte em
// art/livro_*.py.
(function (root) {
  'use strict';

  const Base = root.ArraiaJanelaBase;
  const W = 224;
  const H = 160;
  const SCENE = 112;               // altura da ilustração
  const TURN_MS = 280;             // a página que desliza
  const REACT_MS = 1300;           // quanto dura a reação ao clique
  const LOOP_FPS = 5;
  const sized = (meta, stage) => (meta.growth && stage < meta.growth.length ? meta.growth[stage] : meta);
  const plain = text => String(text).replace(/[’'`¡¿]/g, '');
  const compact = n => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}K` : String(Math.round(n)));
  // Cores das bolinhas das páginas, por trecho da história (tradicional, maluca, épica e a festa).
  const ARC = ['#9ef05a', '#8ed6ff', '#ff9a8a', '#ffe27a'];

  function create(canvas, bundle, hooks = {}) {
    const meta = bundle.janelas.cordel;
    const base = Base.create(canvas, bundle, { width: W, height: H, sound: hooks.sound,
      images: [...meta.paginas.map(page => page.image), meta.ui.image, ...Object.values(bundle.chars).map(entry => entry.image)] });
    const tr = hooks.t || Base.tr;
    let engineRef = null;
    let shown = 0;                   // a página que está na tela (a do motor, depois da virada)
    let turn = null;                 // { from, to, born }
    let reaction = null;             // { page, born }

    function ui(name, x, y, alpha = 1) {
      const index = meta.ui.ids.indexOf(name);
      if (index < 0) return;
      base.sprite(meta.ui, index, Math.round(x), Math.round(y), alpha < 1 ? { alpha } : {});
    }

    const pageData = n => engineRef.data.minis.cordel.pages[n - 1];
    const pageText = n => pageData(n).text.replace('{n}', String(engineRef.houseLevel()));

    // --- A Mandioca e a turma --------------------------------------------------------------------------------------------------------
    function drawHero(art, ox, now, reacting) {
      const engine = engineRef;
      const [hx, hy, maxStage] = art.heroi;
      const stage = Math.min(engine.growthStage(), maxStage, bundle.mandioca.growth.length - 1);
      const kit = bundle.mandioca.growth[stage];
      const eq = engine.state.equipped;
      const sheet = kit.sheets[eq.tecido] || kit.sheets['xadrez-vermelho'];
      const tags = bundle.mandioca.meta.tags;
      let list;
      let fps;
      const pose = reacting ? 'comemora' : art.pose;
      if (pose === 'comemora') { list = tags.comemora; fps = 8; }
      else if (pose === 'descanso') { list = tags.descanso; fps = 3; }
      else { list = (tags.dancas && tags.dancas[engine.state.runtime.dance]) || tags.danca; fps = 6; }
      const frame = list[Math.floor(now / 1000 * fps) % list.length];
      const anchors = kit.anchors[frame];
      const x = ox + hx - Math.round(kit.cx);
      const y = hy - kit.h + 1;
      const handMeta = bundle.hand[eq.mao];
      const item = handMeta && sized(handMeta, stage);
      const front = anchors.frente !== false && kit.hand;
      const drawItem = () => {
        const itemFrame = item.fps ? Math.floor(now / 1000 * item.fps) % item.frames : 0;
        base.sprite(item, itemFrame, x + Math.round(anchors.hand[0] - item.pivot[0]), y + Math.round(anchors.hand[1] - item.pivot[1]));
      };
      base.g.globalAlpha = 0.28;
      base.g.fillStyle = '#10200c';
      base.g.fillRect(ox + hx - Math.round(11 * kit.scale), hy + 1, Math.round(22 * kit.scale), 2);
      base.g.globalAlpha = 1;
      if (item && !front) drawItem();
      base.sprite(sheet, frame, x, y);
      if (item && front) { drawItem(); base.sprite(kit.hand, frame, x, y); }
      const hatBase = bundle.hats[eq.chapeu];
      if (hatBase) {
        const hat = sized(hatBase, stage);
        base.sprite(hat, 0, x + Math.round(anchors.head[0] + hat.ox), y + Math.round(anchors.head[1] + hat.oy));
      }
    }

    function drawCast(art, ox, now, flipped) {
      art.elenco.forEach((entry, i) => {
        const sheet = bundle.chars[entry.id];
        if (!sheet) return;
        const frame = Math.floor(now / 1000 * (sheet.fps || 4) + i) % sheet.frames;
        base.g.globalAlpha = 0.28;
        base.g.fillStyle = '#10200c';
        base.g.fillRect(ox + entry.x - Math.round(sheet.w / 2) + 1, entry.y + 1, sheet.w - 2, 2);
        base.g.globalAlpha = 1;
        base.sprite(sheet, frame, ox + entry.x - sheet.w / 2, entry.y - sheet.h + 1, { flip: entry.espelho !== flipped });
      });
    }

    // Uma página inteira (arte, turma e Mandioca), deslocada `ox` pixels: a que está na tela ou a que desliza.
    function drawScene(n, ox, now) {
      const art = meta.paginas[n - 1];
      const reacting = !!reaction && reaction.page === n && now - reaction.born < REACT_MS;
      const frame = reacting ? 4 + Math.floor((now - reaction.born) / 120) % 4 : Math.floor(now / 1000 * LOOP_FPS) % 4;
      base.sprite(art, frame, ox, 0);
      drawCast(art, ox, now, reacting);
      drawHero(art, ox, now, reacting);
      return { art, reacting };
    }

    // --- Quadro de versos e botões -------------------------------------------------------------------------------------------------
    function drawPanel(info, n, now) {
      const g = base.g;
      g.fillStyle = '#3a2418';
      g.fillRect(0, SCENE, W, H - SCENE);
      g.fillStyle = '#7a4e2c';
      g.fillRect(0, SCENE, W, 1);
      g.fillStyle = '#10100c';
      g.fillRect(0, SCENE + 1, W, 1);
      // o folheto: papel com os versos
      g.fillStyle = '#10100c';
      g.fillRect(3, SCENE + 2, W - 6, 31);
      g.fillStyle = '#2a1a10';
      g.fillRect(4, SCENE + 3, W - 8, 29);
      g.fillStyle = ARC[pageData(n).arc];
      g.fillRect(4, SCENE + 3, 2, 29);
      pageText(n).split('\n').forEach((line, i) => base.text(plain(line), W / 2 + 1, SCENE + 5 + i * 7, '#fff0cc'));
      // setas e as bolinhas das páginas
      const y = SCENE + 35;
      const canPrev = info.page > 1;
      const canNext = info.page < info.total;
      g.fillStyle = '#10100c';
      g.fillRect(3, y, 14, 12);
      g.fillStyle = '#5a3820';
      g.fillRect(4, y + 1, 12, 10);
      ui('esq', 4.5, y + 0.5, canPrev ? 1 : 0.3);
      base.region('prev', 3, y, 14, 12, { prev: true, tip: tr('mini.cordel.tipPrev') });
      g.fillStyle = '#10100c';
      g.fillRect(W - 17, y, 14, 12);
      g.fillStyle = '#5a3820';
      g.fillRect(W - 16, y + 1, 12, 10);
      ui('dir', W - 14.5, y + 0.5, canNext ? 1 : 0.3);
      base.region('next', W - 17, y, 14, 12, { next: true,
        tip: !canNext ? tr('mini.cordel.tipEnd') : info.page < info.unlocked ? tr('mini.cordel.tipNext') : tr('mini.cordel.tipNextLocked', { n: (info.page + 1) * info.every }) });
      const x0 = 22 + Math.round((W - 44 - info.total * 8) / 2);
      info.list.forEach(entry => {
        const x = x0 + (entry.n - 1) * 8;
        const dy = y + 3;
        const current = entry.n === info.page;
        g.fillStyle = current ? '#ffffff' : '#10100c';
        g.fillRect(x - 1, dy - 1, 8, 8);
        let cor = '#4a3020';
        if (entry.open) cor = entry.done ? '#ffd21e' : entry.fresh && Math.floor(now / 350) % 2 ? '#fff6b8' : ARC[entry.arc];
        g.fillStyle = cor;
        g.fillRect(x, dy, 6, 6);
        const title = pageData(entry.n).title;
        const tip = entry.open ? `${entry.n}. ${title}${entry.done ? ` ${tr('mini.cordel.tipDone')}` : ''}` : tr('mini.cordel.tipLockedPage', { n: entry.n, guests: entry.n * info.every });
        base.region(`pagina:${entry.n}`, x - 1, dy - 2, 8, 10, { go: entry.n, tip });
      });
    }

    // O ponto que se clica na página (com a mãozinha piscando enquanto ela não está completa) e as bolinhas de cliques.
    function drawSpot(info, art, now, reacting) {
      const [px, py, pw, ph] = art.ponto;
      const entry = info.list[info.page - 1];
      const data = pageData(info.page);
      const cx = px + pw / 2;
      const clicks = `${entry.clicks}/${entry.goal}`;
      base.region('ponto', px, py, pw, ph, { spot: true, tip: `${data.hint}\n${tr('mini.cordel.tipClicks', { n: entry.clicks, m: entry.goal })}` });
      if (!entry.done && !reacting) ui('seta', cx - 5, Math.max(1, py - 12) + Math.round(Math.sin(now / 160) * 2));
      const top = Math.max(2, py - 14);
      for (let i = 0; i < entry.goal; i++) {
        const bx = Math.round(cx - entry.goal * 3.5 + i * 7);
        base.g.fillStyle = '#10100c';
        base.g.fillRect(bx - 1, top + 11, 6, 6);
        base.g.fillStyle = i < entry.clicks ? '#ffd21e' : '#9a8a78';
        base.g.fillRect(bx, top + 12, 4, 4);
      }
      if (entry.done) ui('estrela', cx - 5, top - 2 + Math.round(Math.sin(now / 300) * 1));
      return clicks;
    }

    function draw(engine, now) {
      engineRef = engine;
      const info = engine.mini('cordel').info();
      base.clear();
      base.clearRegions();
      base.g.imageSmoothingEnabled = false;
      if (!shown) shown = info.page;
      if (shown !== info.page && !turn) turn = { from: shown, to: info.page, born: now };
      let n = shown;
      let reacting = false;
      let art = null;
      if (turn) {
        const t = Math.min(1, (now - turn.born) / TURN_MS);
        const dir = turn.to > turn.from ? 1 : -1;
        drawScene(turn.from, Math.round(-dir * W * t), now);
        drawScene(turn.to, Math.round(dir * W * (1 - t)), now);
        n = t < 0.5 ? turn.from : turn.to;
        if (t >= 1) { shown = turn.to; turn = null; n = shown; }
      } else {
        const drawn = drawScene(n, 0, now);
        reacting = drawn.reacting;
        art = drawn.art;
      }
      if (art) {
        // as partículas e as falas ficam por cima da cena (a página que desliza não tem)
        drawSpot(info, art, now, reacting);
      }
      base.drawParticles(now);
      base.drawSays(now);
      drawPanel(info, n, now);
      return true;
    }

    // --- Cliques ---------------------------------------------------------------------------------------------------------------------
    function click(clientX, clientY, now = 0) {
      if (!engineRef || turn) return false;
      const model = engineRef.mini('cordel');
      const found = base.hit(clientX, clientY);
      if (!found) return false;
      if (found.prev || found.next) {
        const moved = model.turn(found.prev ? -1 : 1);
        hooks.sound?.(moved ? 'clique' : 'erro');
        if (!moved && found.next && model.info().page < model.info().total) {
          base.say(tr('mini.cordel.locked', { n: (model.info().page + 1) * model.info().every }), W / 2, SCENE - 12, now, '#ff9a8a');
        }
        return true;
      }
      if (found.go) {
        const moved = model.go(found.go);
        hooks.sound?.(moved ? 'clique' : 'erro');
        if (!moved) base.say(tr('mini.cordel.locked', { n: found.go * model.info().every }), W / 2, SCENE - 12, now, '#ff9a8a');
        return true;
      }
      if (found.spot) {
        const page = model.info().page;
        const got = model.poke(page);
        if (!got.ok) return true;
        const art = meta.paginas[page - 1];
        const data = pageData(page);
        const [px, py, pw, ph] = art.ponto;
        const cx = px + pw / 2;
        reaction = { page, born: now };
        hooks.sound?.(data.sound);
        base.say(plain(data.say), cx, Math.max(8, py - 2), now, '#ffe27a');
        base.spawn('brilho', cx - 4, py + ph / 2, now);
        base.spawn('estrela', cx + 6, py + ph / 3, now);
        if (got.finished) {
          hooks.sound?.('conquista');
          base.say(plain(data.done), W / 2, 12, now, '#9ef05a');
          for (let i = 0; i < 6; i++) base.spawn(i % 2 ? 'estrela' : 'coracao', cx - 24 + i * 10, py + ph / 2 - (i % 3) * 5, now);
          const lines = [];
          if (got.reward?.cheer) lines.push(tr('gain.cheer', { n: compact(got.reward.cheer) }));
          if (got.reward?.tickets) lines.push(tr('gain.tickets', { n: got.reward.tickets }));
          lines.forEach((line, i) => base.say(line, W / 2, 22 + i * 7, now, '#ffe27a'));
        }
        return true;
      }
      return true;
    }

    function status(engine) {
      const info = engine.mini('cordel').info();
      const title = engine.data.minis.cordel.pages[info.page - 1].title;
      return `${tr('mini.cordel.statusPage', { n: info.page, m: info.total })} · ${title}`;
    }

    function onEvents() {}

    function probe() {
      return { ...base.probeBase(), shown, turning: !!turn, reacting: !!reaction };
    }

    return { size: base.size, setScale: base.setScale, draw, hit: base.hit, click, status, onEvents, probe };
  }

  root.ArraiaJanelas.registerView('cordel', create);
})(typeof globalThis !== 'undefined' ? globalThis : this);
