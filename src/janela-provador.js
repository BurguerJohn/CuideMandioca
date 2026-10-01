// Provador: a Mandioca grande no espelho, vestindo o que está escolhido. Na bancada, as abas (chapéus, mão, tecidos e conjuntos):
// clique num item que a Mandioca tem para vestir; num conjunto completo, para vestir tudo de uma vez (o bônus vale na hora).
// Clique na Mandioca para ela posar. O motor está em src/mini-provador.js.
(function (root) {
  'use strict';

  const Base = root.ArraiaJanelaBase;
  const W = 176;
  const H = 120;
  const PAGE = 8;                 // itens por página (2 colunas x 4 linhas)
  const SET_ROWS = 6;             // conjuntos por página
  const TABS = ['chapeu', 'mao', 'tecido', 'conjunto'];
  const short = (name, max) => (name.length > max ? `${name.slice(0, max - 1)}.` : name);
  const sized = (meta, stage) => (meta.growth && stage < meta.growth.length ? meta.growth[stage] : meta);

  function create(canvas, bundle, hooks = {}) {
    const meta = bundle.janelas.provador;
    const base = Base.create(canvas, bundle, { width: W, height: H, sound: hooks.sound, images: [meta.fundo.image, meta.ui.image] });
    const tr = hooks.t || Base.tr;
    const icons = {};
    let engineRef = null;
    let pose = 0;
    let page = 0;
    let lastTab = null;
    let lit = 0;

    function icon(id) {
      const entry = bundle.icons[`item:${id}`];
      if (!entry) return null;
      if (!icons[id]) { icons[id] = new Image(); icons[id].src = entry.src; }
      return base.ready(icons[id]) ? { image: icons[id], w: entry.w, h: entry.h } : null;
    }
    function drawIcon(id, cx, cy, alpha = 1) {
      const found = icon(id);
      if (!found) return;
      base.g.globalAlpha = alpha;
      base.g.drawImage(found.image, Math.round(cx - found.w / 2), Math.round(cy - found.h / 2));
      base.g.globalAlpha = 1;
    }

    // Os quadros de cada pose: dançando (o passo dela), comemorando e descansando.
    function framesOf(kind) {
      const tags = bundle.mandioca.meta.tags;
      if (kind === 1) return tags.comemora;
      if (kind === 2) return tags.descanso;
      return (tags.dancas && tags.dancas[engineRef.state.runtime.dance]) || tags.danca;
    }

    // A Mandioca no espelho, no tamanho dela (ampliada por um fator inteiro), com o tecido, o item da mão e o chapéu vestidos.
    function drawMandioca(info, now) {
      const stage = Math.min(info.stage, bundle.mandioca.growth.length - 1);
      const kit = bundle.mandioca.growth[stage];
      const eq = info.equipped;
      const sheet = kit.sheets[eq.tecido] || kit.sheets['xadrez-vermelho'];
      const scale = Math.max(1, Math.min(3, Math.round(96 / kit.h)));
      const list = framesOf(pose);
      const frame = list[Math.floor(now / 1000 * (pose === 2 ? 3 : 8)) % list.length];
      const anchors = kit.anchors[frame];
      const x = meta.centro - Math.round(kit.cx * scale);
      const y = meta.chao - kit.h * scale + 1;
      base.g.globalAlpha = 0.3;
      base.g.fillStyle = '#10200c';
      base.g.fillRect(meta.centro - Math.round(11 * scale * kit.scale), meta.chao, Math.round(22 * scale * kit.scale), 3);
      base.g.globalAlpha = 1;
      const hand = bundle.hand[eq.mao];
      const item = hand && sized(hand, stage);
      const front = anchors.frente !== false && kit.hand;
      const big = meta2 => ({ w: meta2.w * scale, h: meta2.h * scale });
      const drawItem = () => {
        const itemFrame = item.fps ? Math.floor(now / 1000 * item.fps) % item.frames : 0;
        base.sprite(item, itemFrame, x + Math.round((anchors.hand[0] - item.pivot[0]) * scale), y + Math.round((anchors.hand[1] - item.pivot[1]) * scale), big(item));
      };
      if (item && !front) drawItem();
      base.sprite(sheet, frame, x, y, big(sheet));
      if (item && front) { drawItem(); base.sprite(kit.hand, frame, x, y, big(kit.hand)); }
      const hatBase = bundle.hats[eq.chapeu];
      if (hatBase) {
        const hat = sized(hatBase, stage);
        base.sprite(hat, 0, x + Math.round((anchors.head[0] + hat.ox) * scale), y + Math.round((anchors.head[1] + hat.oy) * scale), big(hat));
      }
      base.region('mandioca', x, y, sheet.w * scale, sheet.h * scale, { tip: tr('mini.provador.tipPose') });
      if (lit > now && Math.floor(now / 120) % 2 === 0) base.spawn('brilho', meta.centro + ((now / 40) % 30) - 15, y + 6 + ((now / 25) % 30), now);
    }

    function drawTabs(info) {
      const [px] = meta.painel;
      TABS.forEach((tab, i) => {
        const x = px + 4 + i * 20;
        const chosen = info.tab === tab;
        base.g.fillStyle = chosen ? '#ffd21e' : '#5c3820';
        base.g.fillRect(x - 1, meta.abasY - 1, 20, 17);
        base.g.fillStyle = chosen ? '#fff2b0' : '#7a4a28';
        base.g.fillRect(x, meta.abasY, 18, 15);
        base.sprite(meta.ui, i, x, meta.abasY + 1);
        base.region(`aba:${tab}`, x - 1, meta.abasY - 1, 20, 17, { aba: tab, tip: tr(`mini.provador.tab.${tab}`) });
      });
    }

    function drawPager(count, perPage) {
      const pages = Math.max(1, Math.ceil(count / perPage));
      page = Math.min(page, pages - 1);
      const [px, , px1, py1] = meta.painel;
      const y = py1 - 13;
      base.sprite(meta.ui, 4, px + 8, y);
      base.sprite(meta.ui, 5, px1 - 15, y);
      base.text(`${page + 1}:${pages}`, (px + px1) / 2, y + 2, '#6e3c1c');
      base.region('pagina:-', px + 4, y - 2, 16, 14, { pagina: -1, tip: tr('mini.provador.prev') });
      base.region('pagina:+', px1 - 20, y - 2, 16, 14, { pagina: 1, tip: tr('mini.provador.next') });
      return pages;
    }

    function drawItems(info) {
      const list = (info.tab === 'chapeu' ? info.hats : info.tab === 'mao' ? info.hands : info.fabrics).slice().sort((p, q) => Number(q.owned) - Number(p.owned));
      drawPager(list.length, PAGE);
      const shown = list.slice(page * PAGE, page * PAGE + PAGE);
      shown.forEach((item, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = meta.grade[0] + col * (meta.celula[0] + 1);
        const y = meta.grade[1] + row * (meta.celula[1] + 1);
        if (item.worn) { base.g.fillStyle = '#ffd860'; base.g.fillRect(x - 1, y - 1, meta.celula[0] + 2, meta.celula[1] + 2); }
        base.g.fillStyle = item.worn ? '#fff2b0' : '#efe0b8';
        base.g.fillRect(x, y, meta.celula[0], meta.celula[1]);
        drawIcon(item.id, x + meta.celula[0] / 2, y + meta.celula[1] / 2, item.owned ? 1 : 0.28);
        if (!item.owned) base.sprite(meta.ui, 6, x + meta.celula[0] - 10, y + meta.celula[1] - 11);
        if (item.worn) base.sprite(meta.ui, 7, x + 1, y + 1);
        const tip = `${tr('mini.provador.tipItem', { name: item.name, desc: item.desc || '' })}${item.worn ? tr('mini.provador.tipWorn') : item.owned ? '' : tr('mini.provador.notOwned')}`;
        base.region(`item:${item.id}`, x, y, meta.celula[0], meta.celula[1], { item: item.id, owned: item.owned, worn: item.worn, tip });
      });
    }

    function drawSets(info) {
      const sets = info.sets.slice().sort((p, q) => Number(q.active) - Number(p.active) || p.missing - q.missing);
      drawPager(sets.length, SET_ROWS);
      sets.slice(page * SET_ROWS, page * SET_ROWS + SET_ROWS).forEach((set, i) => {
        const x = meta.grade[0];
        const y = meta.grade[1] + i * (meta.linhasConjunto + 2);
        const w = meta.painel[2] - meta.painel[0] - 8;
        base.g.fillStyle = set.active ? '#ffd860' : set.complete ? '#fff8e0' : '#e8dcc0';
        base.g.fillRect(x, y, w, meta.linhasConjunto);
        const label = short(set.name, 14);
        base.text(label, x + 2 + (label.length * 4 - 1) / 2, y + 3, set.complete ? '#7c421e' : '#a89878');
        base.text(`+${Math.round(set.bonus * 100)}%`, x + w - 11, y + 3, set.active ? '#2a7a3a' : '#b44a0a');
        const state = set.active ? tr('mini.provador.setOn') : set.complete ? tr('mini.provador.setReady') : tr('mini.provador.setMissing', { n: set.missing });
        base.region(`conjunto:${set.id}`, x, y, w, meta.linhasConjunto, { conjunto: set.id, set,
          tip: `${tr('mini.provador.tipSet', { name: set.name, n: Math.round(set.bonus * 100) })} ${state}` });
      });
    }

    function draw(engine, now) {
      engineRef = engine;
      const model = engine.mini('provador');
      const info = model.info();
      if (info.tab !== lastTab) { page = 0; lastTab = info.tab; }
      base.clear();
      base.clearRegions();
      base.picture(meta.fundo.image);
      drawMandioca(info, now);
      drawTabs(info);
      if (info.tab === 'conjunto') drawSets(info);
      else drawItems(info);
      base.drawParticles(now);
      base.drawSays(now);
      return true;
    }

    function click(clientX, clientY, now = 0) {
      if (!engineRef) return false;
      const model = engineRef.mini('provador');
      const found = base.hit(clientX, clientY);
      if (!found) return false;
      if (found.aba) { if (model.select(found.aba)) { page = 0; hooks.sound?.('clique'); } return true; }
      if (found.pagina) { page = Math.max(0, page + found.pagina); hooks.sound?.('clique'); return true; }
      if (found.id === 'mandioca') {
        pose = (pose + 1) % 3;
        lit = now + 700;
        hooks.sound?.('carinho');
        base.spawn('coracao', meta.centro - 4, meta.chao - 60, now);
        return true;
      }
      if (found.item) {
        if (found.worn) return true;
        if (!found.owned) { hooks.sound?.('erro'); base.say(tr('mini.provador.nope'), meta.centro, meta.chao - 70, now, '#ff9a8a'); return true; }
        const got = model.wear(found.item);
        if (got.ok) {
          hooks.sound?.('equipar');
          lit = now + 900;
          base.say(tr('mini.provador.dressed'), meta.centro, meta.chao - 78, now, '#fff8e8');
          if (got.set) base.say(tr('mini.provador.setBonus', { n: Math.round(got.set.bonus * 100) }), meta.centro, meta.chao - 86, now, '#9ef05a');
        }
        return true;
      }
      if (found.conjunto) {
        if (found.set.active) return true;
        if (!found.set.complete) { hooks.sound?.('erro'); base.say(tr('mini.provador.need', { n: found.set.missing }), meta.centro, meta.chao - 70, now, '#ff9a8a'); return true; }
        const got = model.wearSet(found.conjunto);
        if (got.ok) {
          hooks.sound?.('equipar');
          lit = now + 1400;
          base.say(tr('mini.provador.setBonus', { n: Math.round(got.set.bonus * 100) }), meta.centro, meta.chao - 78, now, '#9ef05a');
          base.spawn('estrela', meta.centro - 16, meta.chao - 60, now);
          base.spawn('estrela', meta.centro + 12, meta.chao - 66, now);
        }
        return true;
      }
      return true;
    }

    function status(engine) {
      const set = engine.mini('provador').info().sets.find(entry => entry.active);
      return set ? tr('mini.provador.statusSet', { name: set.name, n: Math.round(set.bonus * 100) }) : tr('mini.provador.statusNone');
    }

    function onEvents() {}

    function probe() {
      return { ...base.probeBase(), pose, page };
    }

    return { size: base.size, setScale: base.setScale, draw, hit: base.hit, click, status, onEvents, probe };
  }

  root.ArraiaJanelas.registerView('provador', create);
})(typeof globalThis !== 'undefined' ? globalThis : this);
