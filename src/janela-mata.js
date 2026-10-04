// Mata Encantada: o auto battler. A Mandioca (vestida com o que está equipada) luta sozinha contra as criaturas do folclore, uma etapa de
// 4 batalhas e um chefe por vez; embaixo ficam os status dela (vindos das melhorias, da comida e da felicidade), o bicho que acompanha e
// a lista de itens que cada chefe libera. Cliques: nas setas escolhem a etapa, no botão do meio pausam, no bichinho trocam quem
// acompanha e numa criatura mandam a Mandioca bater nela primeiro. O motor está em src/mini-mata.js.
(function (root) {
  'use strict';

  const Base = root.ArraiaJanelaBase;
  const W = 224;
  const H = 160;
  const ARENA = 88;
  const FOOT = 76;
  const HERO_X = 62;
  const PET_X = 24;
  const CELL = 18;                 // uma casinha da lista de itens
  const compact = n => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}K` : String(Math.round(n)));
  const sized = (meta, stage) => (meta.growth && stage < meta.growth.length ? meta.growth[stage] : meta);
  const percent = value => `${Math.round(value * 100)}`;
  // A fonte de pixel não tem apóstrofo nem ¡ ¿: tira para o texto não ficar com buraco.
  const plain = text => String(text).replace(/[’'`¡¿]/g, '');
  // Cada situação com o ícone e a cor dos números que ela mostra.
  const STATUS_ICON = { burn: 'queima', poison: 'veneno', stun: 'tontura', slow: 'lento', weak: 'fraqueza', confuse: 'confusao', charge: 'investida',
    heal: 'cura', enrage: 'enrage', revive: 'cura' };

  function create(canvas, bundle, hooks = {}) {
    const meta = bundle.janelas.mata;
    const base = Base.create(canvas, bundle, { width: W, height: H, sound: hooks.sound, images: [meta.fundos.image, meta.comuns.image, meta.chefes.image, meta.ui.image, meta.painel.image] });
    const tr = hooks.t || Base.tr;
    const icons = {};
    const tints = new Map();
    const places = new Map();        // uid -> onde a criatura está agora (para os números dos golpes)
    const floaters = [];
    let engineRef = null;
    let lastSeq = -1;
    let lastPhase = '';
    let banner = null;

    // --- Peças ---------------------------------------------------------------------------------------------------------------
    function ui(name, x, y, alpha = 1) {
      const index = meta.ui.ids.indexOf(name);
      if (index < 0) return;
      base.sprite(meta.ui, index, Math.round(x), Math.round(y), alpha < 1 ? { alpha } : {});
    }

    function itemIcon(id) {
      const entry = bundle.icons[`item:${id}`];
      if (!entry) return null;
      if (!icons[id]) { icons[id] = new Image(); icons[id].src = entry.src; }
      return base.ready(icons[id]) ? { image: icons[id], w: entry.w, h: entry.h } : null;
    }
    function drawItemIcon(id, cx, cy, alpha, box) {
      const found = itemIcon(id);
      if (!found) return;
      const k = Math.min(1, box / found.w, box / found.h);
      const w = Math.max(1, Math.round(found.w * k));
      const h = Math.max(1, Math.round(found.h * k));
      base.g.globalAlpha = alpha;
      base.g.drawImage(found.image, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
      base.g.globalAlpha = 1;
    }

    // A mesma folha com uma cor por cima (o clarão de quando alguém apanha): pinta só onde já tem desenho.
    function tinted(sheet, frame, color, strength = 0.8) {
      const key = `${sheet.image}|${frame}|${color}|${strength}`;
      if (tints.has(key)) return tints.get(key);
      const image = base.imageOf(sheet.image);
      if (!base.ready(image) || !root.document?.createElement) return null;
      let made = null;
      try {
        made = root.document.createElement('canvas');
        made.width = sheet.w;
        made.height = sheet.h;
        const g = made.getContext('2d');
        g.drawImage(image, frame * sheet.w, 0, sheet.w, sheet.h, 0, 0, sheet.w, sheet.h);
        g.globalCompositeOperation = 'source-atop';
        g.globalAlpha = strength;
        g.fillStyle = color;
        g.fillRect(0, 0, sheet.w, sheet.h);
      } catch (_) { made = null; }
      tints.set(key, made);
      return made;
    }
    function spriteTinted(sheet, frame, x, y, color, extra = {}) {
      const made = tinted(sheet, frame, color, extra.strength);
      if (!made) return base.sprite(sheet, frame, x, y, extra);
      if (extra.alpha !== undefined) base.g.globalAlpha = extra.alpha;
      base.g.drawImage(made, Math.round(x), Math.round(y));
      base.g.globalAlpha = 1;
      return true;
    }

    // `trail`: onde a barra estava (o pedaço que acabou de se perder aparece claro e some devagar).
    function bar(x, y, w, h, fraction, fill, back = '#2a1a14', trail = null) {
      base.g.fillStyle = '#0e0a08';
      base.g.fillRect(x - 1, y - 1, w + 2, h + 2);
      base.g.fillStyle = back;
      base.g.fillRect(x, y, w, h);
      if (trail !== null && trail > fraction) {
        base.g.fillStyle = '#f4e8d0';
        base.g.fillRect(x, y, Math.max(0, Math.min(w, Math.round(w * trail))), h);
      }
      const filled = Math.max(0, Math.min(w, Math.round(w * fraction)));
      if (filled > 0) {
        base.g.fillStyle = fill;
        base.g.fillRect(x, y, filled, h);
        if (h >= 3) { base.g.globalAlpha = 0.35; base.g.fillStyle = '#ffffff'; base.g.fillRect(x, y, filled, 1); base.g.globalAlpha = 1; }
      }
    }
    // A vida que vai caindo devagar atrás da barra: sobe na hora e desce suave.
    const trails = new Map();
    function trailOf(key, value, now) {
      let slot = trails.get(key);
      if (!slot) { slot = { v: value, at: now, hold: 0 }; trails.set(key, slot); }
      if (value >= slot.v) { slot.v = value; slot.hold = now + 350; }
      else if (now > slot.hold) slot.v += (value - slot.v) * (1 - Math.exp(-Math.min(0.25, (now - slot.at) / 1000) * 3));
      slot.at = now;
      return slot.v;
    }

    function box(x, y, w, h, fill = '#6a4428', border = '#150c06', lit = '#a8743c') {
      base.g.fillStyle = border;
      base.g.fillRect(x, y, w, h);
      base.g.fillStyle = fill;
      base.g.fillRect(x + 1, y + 1, w - 2, h - 2);
      base.g.fillStyle = lit;
      base.g.fillRect(x + 1, y + 1, w - 2, 1);
      base.g.fillRect(x + 1, y + 1, 1, h - 2);
      base.g.fillStyle = '#3a2210';
      base.g.fillRect(x + 1, y + h - 2, w - 2, 1);
      base.g.fillRect(x + w - 2, y + 1, 1, h - 2);
    }

    function floatIcon(kind, x, y, now) {
      floaters.push({ icon: STATUS_ICON[kind] || kind, x, y, born: now });
      if (floaters.length > 12) floaters.shift();
    }
    function drawFloaters(now) {
      for (let i = floaters.length - 1; i >= 0; i--) {
        const f = floaters[i];
        const t = (now - f.born) / 1100;
        if (t >= 1) { floaters.splice(i, 1); continue; }
        ui(f.icon, f.x - 5, f.y - 5 - t * 12, t > 0.7 ? (1 - t) / 0.3 : 1);
      }
    }

    // --- A Mandioca e o bichinho ----------------------------------------------------------------------------------------------------
    function drawHero(info, now) {
      const engine = engineRef;
      const stage = Math.min(engine.growthStage(), bundle.mandioca.growth.length - 1);
      const kit = bundle.mandioca.growth[stage];
      const eq = engine.state.equipped;
      const sheet = kit.sheets[eq.tecido] || kit.sheets['xadrez-vermelho'];
      const tags = bundle.mandioca.meta.tags;
      const hero = info.hero;
      const down = info.phase === 'lose';
      const stunned = !!hero && hero.status.stun > 0;
      let list;
      let fps;
      if (down || stunned) { list = tags.descanso; fps = 3; }
      else if (info.phase === 'win' || (hero && info.clock - hero.special < 0.9)) { list = tags.comemora; fps = 8; }
      else { list = (tags.dancas && tags.dancas[engine.state.runtime.dance]) || tags.danca; fps = hero && hero.status.slow > 0 ? 3 : 6; }
      const frame = list[Math.floor(now / 1000 * fps) % list.length];
      const anchors = kit.anchors[frame];
      const age = hero ? info.clock - hero.acted : 9;
      const lunge = age >= 0 && age < 0.24 ? Math.round(Math.sin(age / 0.24 * Math.PI) * 11) : 0;
      const hurtAge = hero ? info.clock - hero.hurt : 9;
      const hurt = hurtAge >= 0 && hurtAge < 0.14;
      const x = HERO_X - Math.round(kit.cx) + lunge + (hurt ? (Math.floor(now / 40) % 2 ? 1 : -1) : 0);
      const y = FOOT - kit.h + 1;
      base.g.globalAlpha = 0.3;
      base.g.fillStyle = '#10200c';
      base.g.fillRect(HERO_X - Math.round(11 * kit.scale), FOOT + 1, Math.round(22 * kit.scale), 3);
      base.g.globalAlpha = 1;
      const handMeta = bundle.hand[eq.mao];
      const item = handMeta && sized(handMeta, stage);
      const front = anchors.frente !== false && kit.hand;
      const drawItem = () => {
        const itemFrame = item.fps ? Math.floor(now / 1000 * item.fps) % item.frames : 0;
        base.sprite(item, itemFrame, x + Math.round(anchors.hand[0] - item.pivot[0]), y + Math.round(anchors.hand[1] - item.pivot[1]));
      };
      if (item && !front) drawItem();
      if (hurt) spriteTinted(sheet, frame, x, y, '#ff3a3a', { strength: 0.5 }); else base.sprite(sheet, frame, x, y);
      if (item && front) { drawItem(); base.sprite(kit.hand, frame, x, y); }
      const hatBase = bundle.hats[eq.chapeu];
      if (hatBase) {
        const hat = sized(hatBase, stage);
        base.sprite(hat, 0, x + Math.round(anchors.head[0] + hat.ox), y + Math.round(anchors.head[1] + hat.oy));
      }
      places.set('hero', { x: HERO_X + lunge, top: y });
      if (hero && hero.meter >= 1 && info.phase === 'fight') base.glow(HERO_X, FOOT + 1, 18, '#ffd21e', 0.1 + 0.07 * Math.sin(now / 130));
      base.region('hero', HERO_X - 14, y, 28, kit.h, { hero: true, tip: heroTip(info) });
      // O relógio do golpe: uma linha embaixo dos pés enchendo até a próxima pancada.
      if (hero && info.phase === 'fight') {
        base.g.fillStyle = '#10200c';
        base.g.fillRect(HERO_X - 12, FOOT + 5, 24, 2);
        base.g.fillStyle = stunned ? '#8a8a9a' : '#ffe27a';
        base.g.fillRect(HERO_X - 12, FOOT + 5, Math.round(24 * hero.swing), 2);
      }
      if (down && Math.floor(now / 700) % 2 === 0) base.spawn('zzz', HERO_X + 6, y + 6, now);
      return { top: y, height: kit.h };
    }

    function drawPet(info, now) {
      const pet = info.stats.pet;
      if (!pet) return;
      const sheet = bundle.scenery[pet.id];
      if (!sheet) return;
      const frame = sheet.fps ? Math.floor(now / 1000 * sheet.fps + pet.bond) % sheet.frames : 0;
      const age = info.hero ? info.clock - info.hero.acted : 9;
      const hop = age >= 0 && age < 0.2 ? -Math.round(Math.sin(age / 0.2 * Math.PI) * 4) : 0;
      const idle = Math.abs(Math.sin(now / 500 + pet.bond)) < 0.12 ? -1 : 0;
      const x = PET_X - sheet.w / 2;
      const y = FOOT + 4 - sheet.h + hop + idle;
      base.g.globalAlpha = 0.25;
      base.g.fillStyle = '#10200c';
      base.g.fillRect(Math.round(PET_X - sheet.w / 2 + 1), FOOT + 4, Math.round(sheet.w - 2), 2);
      base.g.globalAlpha = 1;
      base.sprite(sheet, frame, x, y);
      const fraction = pet.bond / pet.max;
      if (fraction >= 0.7 && Math.floor(now / 1200) % 3 === 0) base.spawn('coracao', PET_X - 2, y - 6, now);
      base.region('pet-arena', x, y, sheet.w, sheet.h, { petArena: true, tip: petTip(info) });
    }

    // --- As criaturas -----------------------------------------------------------------------------------------------------------
    // Onde cada uma fica: o chefe um pouco à direita e as outras espalhadas na frente dele.
    function slots(enemies) {
      const count = enemies.length;
      const xs = { 1: [160], 2: [136, 186], 3: [118, 158, 198], 4: [108, 140, 172, 204] }[count] || [160];
      const boss = enemies.findIndex(enemy => enemy.boss);
      const out = [];
      if (boss >= 0) {
        const others = enemies.filter(enemy => !enemy.boss).length;
        const side = others === 2 ? [116, 208] : [122];
        let next = 0;
        enemies.forEach((enemy, i) => {
          out[i] = enemy.boss ? { x: 168, y: FOOT + 2 } : { x: side[next++] || 120, y: FOOT - 2 + (next % 2) * 4 };
        });
        return out;
      }
      enemies.forEach((enemy, i) => { out[i] = { x: xs[i], y: FOOT + (i % 2 ? -3 : 3) }; });
      return out;
    }

    function drawEnemy(info, enemy, slot, now) {
      const sheet = enemy.boss ? meta.chefes : meta.comuns;
      const index = sheet.ids.indexOf(enemy.id);
      if (index < 0) return;
      const frame = index * 2 + (Math.floor(now / 340 + enemy.uid) % 2);
      let x = slot.x - sheet.w / 2;
      let y = slot.y - sheet.h + 1;
      let alpha = 1;
      if (info.phase === 'intro') x += Math.round((1 - Math.min(1, info.t / 1.1)) * 72);
      if (!enemy.dead) y += Math.round(Math.sin(now / 430 + enemy.uid * 1.7));
      const age = info.clock - enemy.acted;
      if (age >= 0 && age < 0.3) x -= Math.round(Math.sin(age / 0.3 * Math.PI) * 10);
      const hurtAge = info.clock - enemy.hurt;
      const flash = hurtAge >= 0 && hurtAge < 0.12;
      if (flash) x += Math.floor(now / 40) % 2 ? 1 : -1;
      if (enemy.dead) {
        const gone = info.clock - enemy.diedAt;
        if (gone > 0.9) return;
        alpha = 1 - gone / 0.9;
        y += Math.round(gone * 8);
      }
      const reborn = info.clock - enemy.bornAt;
      const cx = x + sheet.w / 2;
      base.g.globalAlpha = enemy.dead ? alpha * 0.3 : 0.28;
      base.g.fillStyle = '#10200c';
      base.g.fillRect(Math.round(cx - sheet.w / 3), slot.y + 1, Math.round(sheet.w * 2 / 3), 2);
      base.g.globalAlpha = 1;
      if (enemy.focus && !enemy.dead) ui('alvo', cx - 5, slot.y + 3, 1);
      if (flash) spriteTinted(sheet, frame, x, y, '#ffffff', { alpha });
      else if (reborn >= 0 && reborn < 0.5 && !enemy.dead) spriteTinted(sheet, frame, x, y, '#ffe27a', { alpha });
      else base.sprite(sheet, frame, x, y, alpha < 1 ? { alpha } : {});
      places.set(enemy.uid, { x: cx, top: y, mid: y + sheet.h / 2 });
      if (enemy.dead) return;
      // Vida em cima, e o aviso do golpe especial que vem (um ícone balançando).
      const barW = enemy.boss ? 30 : 20;
      const barY = Math.max(10, y - 5);
      bar(Math.round(cx - barW / 2), barY, barW, 3, enemy.hp / enemy.max, enemy.boss ? '#e0343e' : '#e8742a', '#2a1a14', trailOf(`foe${enemy.uid}`, enemy.hp / enemy.max, now));
      if (enemy.next) ui(STATUS_ICON[enemy.next] || 'investida', cx - 5, barY - 13 + Math.round(Math.sin(now / 120) * 1.5));
      const tip = enemyTip(info, enemy);
      base.region(`foe:${enemy.uid}`, x, y - 6, sheet.w, sheet.h + 8, { foe: enemy.uid, tip, hot: !enemy.focus });
    }

    // --- Textos de dica -----------------------------------------------------------------------------------------------------------
    function heroTip(info) {
      const s = info.stats;
      const lines = [tr('mini.mata.tipHero', { hp: s.hp, atk: Math.round(s.atk), def: percent(s.red), spd: (1 / s.interval).toFixed(2) })];
      lines.push(tr('mini.mata.tipFrom', { rebolado: engineRef.level('rebolado'), folego: engineRef.level('folego'), refresco: engineRef.level('refresco'),
        ritmo: engineRef.level('ritmo') }));
      lines.push(tr('mini.mata.tipMood', { belly: percent(s.belly), bellyMult: s.bellyMult.toFixed(2), love: percent(s.love), loveMult: s.loveMult.toFixed(2),
        crit: percent(s.crit) }));
      if (s.pet) lines.push(tr('mini.mata.tipPetBonus', { name: s.pet.name, n: percent(s.petBonus) }));
      if (s.teimosia > 0) lines.push(tr('mini.mata.tipTeimosia', { n: percent(s.teimosia) }));
      return lines.join('\n');
    }
    function petTip(info) {
      const pet = info.stats.pet;
      if (!pet) return info.pets.length ? tr('mini.mata.petNone') : tr('mini.mata.petEmpty');
      return tr('mini.mata.petTip', { name: pet.name, bond: pet.bond, max: pet.max, n: percent(info.stats.petBonus), max2: engineRef.data.minis.mata.petPercent });
    }
    function powerText(power) {
      return tr(`mini.mata.power.${power.kind}`, { every: power.every, dur: power.dur, mult: power.mult, share: percent(power.share || 0), pct: percent(power.below || 0) });
    }
    function enemyTip(info, enemy) {
      const k = engineRef.data.minis.mata;
      const entry = (enemy.boss ? k.bosses : k.creatures).find(item => item.id === enemy.id);
      const lines = [tr('mini.mata.tipFoe', { name: entry?.name || enemy.id, hp: Math.max(0, Math.ceil(enemy.hp)), max: enemy.max })];
      if (entry?.lore) lines.push(entry.lore);
      for (const power of entry?.powers || []) lines.push(powerText(power));
      lines.push(tr('mini.mata.tipKills', { n: info.kills[enemy.id] || 0 }));
      lines.push(tr('mini.mata.tipFocus'));
      return lines.join('\n');
    }
    function itemTip(entry) {
      const state = entry.owned ? tr('mini.mata.itemOwned') : tr('mini.mata.itemLocked', { stage: entry.stage });
      return `${entry.name}\n${entry.desc}\n${state}`;
    }

    // --- Painel de baixo ---------------------------------------------------------------------------------------------------------------
    function drawPanel(info, now) {
      const g = base.g;
      base.sprite(meta.painel, 0, 0, ARENA);
      // Linha 1: etapa, batalhas, pausa, teimosia.
      const y1 = ARENA + 4;
      const canPrev = info.stage > 1;
      const canNext = info.stage <= info.best;
      box(3, y1, 14, 14);
      ui('esq', 4.5, y1 + 1.5, canPrev ? 1 : 0.3);
      base.region('prev', 3, y1, 14, 14, { prev: true, tip: tr('mini.mata.tipPrev') });
      base.text(tr('mini.mata.stage', { n: info.stage }), 43, y1 + 5, info.stage > info.best ? '#ffe27a' : '#9ef05a');
      box(69, y1, 14, 14);
      ui('dir', 70.5, y1 + 1.5, canNext ? 1 : 0.3);
      base.region('next', 69, y1, 14, 14, { next: true, tip: canNext ? tr('mini.mata.tipNext') : tr('mini.mata.tipNextLocked') });
      for (let i = 0; i <= info.battles; i++) {
        const x = 90 + i * 12 + (i === info.battles ? 3 : 0);
        const done = i < info.battle;
        const current = i === info.battle;
        if (i === info.battles) ui('caveira', x, y1 + 1.5, current ? 1 : 0.55);
        else ui(done ? 'ponto-cheio' : 'ponto', x, y1 + 1.5, current && Math.floor(now / 300) % 2 ? 0.45 : 1);
      }
      base.region('dots', 90, y1, 12 * info.battles + 14, 14, { tip: tr('mini.mata.tipBattles', { n: info.battles }) });
      box(152, y1, 14, 14);
      ui(info.auto ? 'pausa' : 'play', 153.5, y1 + 1.5);
      base.region('auto', 152, y1, 14, 14, { auto: true, tip: info.auto ? tr('mini.mata.tipPause') : tr('mini.mata.tipPlay') });
      if (info.teimosia > 0) {
        ui('teimosia', 172, y1 + 1.5);
        base.text(`+${percent(info.stats.teimosia)}`, 194, y1 + 5, '#ffe27a');
        base.region('teimosia', 172, y1, 30, 14, { tip: tr('mini.mata.tipTeimosia', { n: percent(info.stats.teimosia) }) });
      } else base.text(tr('mini.mata.best', { n: info.best }), 197, y1 + 5, '#a89878');
      // Linha 2: status, comida e felicidade, bichinho.
      const y2 = ARENA + 22;
      const s = info.stats;
      const chips = [['espada', Math.round(s.atk)], ['cruz', s.hp], ['escudo', percent(s.red)], ['raio', (1 / s.interval).toFixed(1)]];
      chips.forEach(([icon, value], i) => {
        const x = 3 + i * 31;
        ui(icon, x, y2 + 1);
        const label = typeof value === 'number' ? compact(value) : String(value);
        base.text(label, x + 12 + (label.length * 4 - 1) / 2, y2 + 4, '#fff8e8');
      });
      base.region('stats', 3, y2, 124, 13, { tip: heroTip(info) });
      ui('coracao', 128, y2 + 1);
      bar(140, y2 + 4, 18, 4, s.love, '#ff5a8a');
      ui('milho', 163, y2 + 1);
      bar(175, y2 + 4, 18, 4, s.belly, '#ffd21e');
      base.region('mood', 128, y2, 68, 13, { tip: tr('mini.mata.tipMoodShort', { belly: percent(s.belly), bellyMult: s.bellyMult.toFixed(2), love: percent(s.love), loveMult: s.loveMult.toFixed(2) }) });
      box(199, y2 - 1, 22, 15, s.pet ? '#6a4a2c' : '#4a2e1c');
      if (s.pet) {
        const sheet = bundle.scenery[s.pet.id];
        if (sheet) {
          const k = Math.min(1, 14 / sheet.h, 18 / sheet.w);
          const frame = sheet.fps ? Math.floor(now / 1000 * sheet.fps) % sheet.frames : 0;
          base.sprite(sheet, frame, 210 - Math.round(sheet.w * k / 2), y2 + 10 - Math.round(sheet.h * k), { w: Math.max(1, Math.round(sheet.w * k)), h: Math.max(1, Math.round(sheet.h * k)) });
        }
        bar(202, y2 + 12, 16, 1, s.pet.bond / s.pet.max, '#ff5a8a', '#2a1a14');
      } else ui('pata', 204.5, y2 + 1.5, 0.45);
      base.region('pet', 199, y2 - 1, 22, 15, { pet: true, tip: petTip(info) });
      // Lista de itens que os chefes liberam.
      const y3 = ARENA + 40;
      const list = info.unlocks;
      const x0 = Math.round((W - list.length * CELL) / 2);
      list.forEach((entry, i) => {
        const x = x0 + i * CELL;
        const lit = entry.next && Math.floor(now / 400) % 2 === 0;
        g.fillStyle = entry.owned ? '#ffd860' : entry.next ? (lit ? '#f4e0a0' : '#c8a868') : '#4a3020';
        g.fillRect(x, y3, CELL - 1, CELL + 3);
        g.fillStyle = entry.owned ? '#fff2b0' : '#2e1c12';
        g.fillRect(x + 1, y3 + 1, CELL - 3, CELL + 1);
        drawItemIcon(entry.item, x + (CELL - 1) / 2, y3 + 8, entry.owned ? 1 : 0.4, 15);
        base.text(String(entry.stage), x + (CELL - 1) / 2, y3 + 16, entry.owned ? '#7c421e' : entry.stage <= info.best + 1 ? '#ffe27a' : '#8a7a68');
        base.region(`item:${entry.item}`, x, y3, CELL - 1, CELL + 3, { item: entry.item, tip: itemTip(entry) });
      });
      const next = list.find(entry => entry.next);
      base.text(plain(next ? tr('mini.mata.next', { name: next.name, stage: next.stage }) : tr('mini.mata.allDone')), W / 2, H - 9, next ? '#ffe27a' : '#9ef05a');
    }

    // --- O cenário que se mexe ---------------------------------------------------------------------------------------------------
    // Cada cenário (a ordem de art/janela_mata.py) tem o seu jeito: folhas caindo, brasas, brilhos na água, vagalumes, bolhas, neblina, confete.
    const AMBIENT = ['folhas', 'folhas', 'agua', 'brasas', 'folhas', 'vagalumes', 'vagalumes', 'brejo', 'agua', 'confete'];
    function drift(count, speed, now, paint) {
      const t = now / 1000;
      for (let k = 0; k < count; k++) {
        const phase = (t * speed + k / count) % 1;
        paint(k, phase, Math.sin(phase * 7 + k * 1.7));
      }
    }
    function drawAmbient(info, now) {
      const g = base.g;
      const t = now / 1000;
      const kind = AMBIENT[info.scene] || 'folhas';
      if (kind === 'folhas') {
        const greens = ['#7ac85a', '#a8d84a', '#4a9a3a', '#d8c84a'];
        drift(8, 0.1, now, (k, phase, wave) => {
          g.globalAlpha = Math.sin(phase * Math.PI) * 0.9;
          g.fillStyle = greens[k % 4];
          const x = (k * 29 + phase * 36 + wave * 9) % W;
          g.fillRect(Math.round(x), Math.round(phase * (FOOT - 8)), 2, 1);
          g.fillRect(Math.round(x) + (k % 2), Math.round(phase * (FOOT - 8)) + 1, 1, 1);
        });
        if (info.scene === 0) {
          // Raios de sol entre os troncos.
          g.globalCompositeOperation = 'lighter';
          g.fillStyle = '#fff6c0';
          [34, 96, 158].forEach((x0, i) => {
            g.globalAlpha = 0.035 + 0.02 * Math.sin(t * 0.7 + i * 2);
            for (let y = 0; y < FOOT; y++) g.fillRect(Math.round(x0 + y * 0.45), y, 9, 1);
          });
          g.globalCompositeOperation = 'source-over';
        }
      } else if (kind === 'agua') {
        g.fillStyle = '#ffffff';
        for (let k = 0; k < 16; k++) {
          const x = (k * 41 + t * 4) % W;
          const y = 52 + ((k * 17) % 22);
          g.globalAlpha = Math.max(0, Math.sin(t * 2.3 + k * 1.9)) * 0.7;
          g.fillRect(Math.round(x), y, 2, 1);
        }
      } else if (kind === 'brasas') {
        const colors = ['#ffd23a', '#ff8a1c', '#ff5a1c'];
        drift(14, 0.16, now, (k, phase, wave) => {
          g.globalAlpha = (1 - phase) * 0.9;
          g.fillStyle = colors[k % 3];
          g.fillRect(Math.round((k * 23 + wave * 6) % W), Math.round(FOOT + 6 - phase * 60), 1, 1);
        });
      } else if (kind === 'vagalumes' || kind === 'brejo') {
        base.fireflies({ x: 6, y: 20, w: W - 12, h: 56 }, 9, now, kind === 'brejo' ? '#9aff7a' : '#e8ff8a');
        if (kind === 'brejo') {
          g.fillStyle = '#c8ffb0';
          drift(5, 0.2, now, (k, phase, wave) => {
            g.globalAlpha = (1 - phase) * 0.8;
            g.fillRect(Math.round(30 + k * 37 + wave * 2), Math.round(FOOT + 4 - phase * 14), 1, 1);
          });
        }
      } else if (kind === 'confete') {
        const colors = ['#ee2f3c', '#ffd21e', '#35a03a', '#3a6cf0', '#ff4f9e', '#ff8a12'];
        drift(14, 0.1, now, (k, phase, wave) => {
          g.globalAlpha = Math.sin(phase * Math.PI);
          g.fillStyle = colors[k % 6];
          g.fillRect(Math.round((k * 17 + wave * 8 + phase * 20) % W), Math.round(phase * (FOOT - 4)), 2, 2);
        });
      }
      g.globalAlpha = 1;
      // Neblina rasteira que passa devagar (em todos): duas faixas claras e muito leves.
      g.fillStyle = '#e8f0f8';
      [[FOOT - 6, 0.7, 0], [FOOT - 12, 0.4, 3]].forEach(([y, speed, seed]) => {
        g.globalAlpha = 0.05;
        const x = ((t * 3 * speed + seed * 60) % (W + 80)) - 80;
        g.fillRect(Math.round(x), y, 80, 4);
        g.fillRect(Math.round(x) + 12, y - 2, 50, 2);
      });
      g.globalAlpha = 1;
    }

    // --- Cena -------------------------------------------------------------------------------------------------------------------------
    function drawHud(info, now) {
      const hero = info.hero;
      const fraction = hero ? hero.hp / hero.max : 1;
      ui('cruz', 3, 3);
      bar(16, 5, 66, 5, fraction, fraction > 0.5 ? '#56c860' : fraction > 0.25 ? '#ffd21e' : '#e0343e', '#2a1a14', trailOf('hero', fraction, now));
      // Vida baixa: a barra pisca em vermelho.
      if (hero && fraction <= 0.25 && Math.floor(now / 220) % 2 === 0) { base.g.globalAlpha = 0.5; base.g.fillStyle = '#ff2a2a'; base.g.fillRect(15, 4, 68, 7); base.g.globalAlpha = 1; }
      base.text(`${hero ? Math.ceil(hero.hp) : info.stats.hp}`, 16 + 33, 12, '#fff8e8');
      if (hero) {
        ui('estrela', 3, 17, 0.9);
        bar(16, 20, 40, 3, hero.meter, '#ffd21e');
        // O golpe especial está cheio: a barrinha pisca e brilha.
        if (hero.meter >= 1 && Math.floor(now / 160) % 2 === 0) { base.g.globalAlpha = 0.6; base.g.fillStyle = '#ffffff'; base.g.fillRect(16, 20, 40, 3); base.g.globalAlpha = 1; }
        const flags = Object.entries(hero.status).filter(([, left]) => left > 0).map(([kind]) => kind);
        flags.forEach((kind, i) => ui(STATUS_ICON[kind], 60 + i * 12, 14));
      }
      // O nome do lugar (embaixo, à direita) e, na batalha do chefe, o nome dele (embaixo, no meio), onde não tapa ninguém.
      const stageName = plain(info.lap > 0 ? `${info.name} ${info.lap + 1}` : info.name);
      base.text(stageName, W - 3 - (String(stageName).length * 4) / 2, ARENA - 8, '#fff8e8');
      const boss = info.enemies.find(enemy => enemy.boss);
      if (boss && info.boss) {
        const entry = engineRef.data.minis.mata.bosses.find(item => item.id === boss.id);
        base.text(plain(entry?.name || boss.id), 118, ARENA - 8, '#ff9a8a');
      }
    }

    function drawBanner(info, now) {
      if (!banner) return;
      const t = (now - banner.born) / banner.ms;
      if (t >= 1) { banner = null; return; }
      const y = banner.y + (t < 0.15 ? (1 - t / 0.15) * -6 : 0);
      base.text(banner.text, W / 2, y, banner.color, t > 0.8 ? (1 - t) * 5 : 1);
      base.text(banner.text, W / 2 + 1, y, banner.color, t > 0.8 ? (1 - t) * 5 : 1);
    }

    // Os acontecimentos novos do motor viram números, ícones, faíscas e sons.
    function handle(info, now) {
      const model = engineRef.mini('mata');
      const events = model.events(lastSeq);
      if (lastSeq < 0) { lastSeq = info.seq; return; }
      const fresh = engineRef.now();
      for (const ev of events) {
        lastSeq = Math.max(lastSeq, ev.seq);
        if (fresh - ev.at > 2500) continue;
        const foe = places.get(ev.uid);
        const hero = places.get('hero') || { x: HERO_X, top: FOOT - 40 };
        switch (ev.kind) {
          case 'hit':
            if (ev.side === 'foe') {
              if (foe) {
                // O número sai um pouco para o lado (cada golpe o seu) e sobe; o crítico vem grande e dourado, com anel e clarão.
                const jitter = ((ev.seq * 7) % 9) - 4;
                base.pop(ev.crit ? `${ev.amount}!` : String(ev.amount), foe.x + jitter, foe.top - 2, now, ev.crit ? '#ffe27a' : '#fff8e8',
                  { scale: ev.crit ? 2 : 1, ms: ev.crit ? 1100 : 800, rise: ev.crit ? 16 : 10 });
                base.spawn(ev.crit ? 'estrela' : 'faisca', foe.x - 3, foe.mid ?? foe.top + 8, now);
                base.bits(foe.x, foe.mid ?? foe.top + 8, ev.crit ? 14 : 6, now, { colors: ev.crit ? ['#ffd21e', '#fff0a0', '#ffffff'] : ['#ffffff', '#ffe27a', '#ffb04a'],
                  speed: ev.crit ? 52 : 34, gravity: 80, ms: ev.crit ? 700 : 450 });
                if (ev.crit) {
                  base.ring(foe.x, foe.mid ?? foe.top + 8, now, { from: 3, to: 20, color: '#ffe27a', ms: 420, thick: 2 });
                  base.flash('#fff6c0', 0.1, 140, now);
                  base.shake(1, 180, now);
                }
              }
              hooks.sound?.(ev.crit ? 'mata-critico' : 'mata-golpe');
            } else {
              const dot = ev.how === 'burn' || ev.how === 'poison';
              base.pop(`-${ev.amount}`, hero.x + (((ev.seq * 5) % 7) - 3), hero.top - 2, now, dot ? (ev.how === 'burn' ? '#ffb04a' : '#9ef05a') : ev.how === 'charge' ? '#ff6a5a' : '#ff9a8a',
                { scale: dot ? 1 : ev.amount >= info.stats.hp * 0.1 ? 2 : 1, ms: 900, rise: 10 });
              if (!dot) {
                // Apanhou de verdade: a tela fica avermelhada e treme, e voam gotinhas.
                base.flash('#ff2a2a', 0.1, 170, now);
                base.shake(ev.how === 'charge' ? 1.3 : 0.8, 170, now);
                base.bits(hero.x, hero.top + 14, 6, now, { colors: ['#ff5a5a', '#ffb0b0', '#ffffff'], speed: 30, gravity: 90, ms: 450 });
              } else base.bits(hero.x, hero.top + 12, 3, now, { colors: [ev.how === 'burn' ? '#ff8a1c' : '#9ef05a'], speed: 14, up: 14, gravity: -10, ms: 500 });
              hooks.sound?.('mata-dano');
            }
            break;
          case 'miss': if (foe) base.say(plain(tr('mini.mata.miss')), foe.x, foe.top - 4, now, '#8ed6ff'); break;
          case 'special':
            base.pop(plain(tr('mini.mata.special', { dance: danceName(ev.dance) })), hero.x + 6, hero.top - 12, now, '#ffe27a', { scale: 2, ms: 1500, rise: 6 });
            for (let i = 0; i < 3; i++) base.spawn('estrela', hero.x - 10 + i * 10, hero.top + 6 + (i % 2) * 8, now);
            base.ring(hero.x, hero.top + 20, now, { from: 4, to: 34, color: '#ffe27a', ms: 600, thick: 2 });
            base.ring(hero.x, hero.top + 20, now, { from: 2, to: 20, color: '#ffffff', ms: 420 });
            base.bits(hero.x, hero.top + 20, 22, now, { colors: ['#ffd21e', '#ff4f9e', '#3a6cf0', '#35a03a', '#ffffff'], speed: 60, gravity: 40, ms: 900 });
            base.flash('#ffe27a', 0.18, 260, now);
            base.shake(1.2, 240, now);
            hooks.sound?.('mata-especial');
            break;
          case 'status': {
            const kind = ev.power;
            const onFoe = ['heal', 'enrage', 'revive'].includes(kind);
            const where = onFoe ? foe : hero;
            if (where) floatIcon(kind, where.x, where.top - 2, now);
            if (kind === 'revive') base.say(plain(tr('mini.mata.revive')), where?.x || 160, (where?.top || 40) - 10, now, '#ffe27a');
            break;
          }
          case 'die':
            if (foe) {
              base.spawn('poeira', foe.x - 3, foe.mid ?? foe.top + 8, now, { dx: 1 });
              base.spawn('estrela', foe.x, foe.top + 6, now);
              // A criatura se desmancha em pedacinhos (e o chefe, numa explosão de confete).
              base.bits(foe.x, foe.mid ?? foe.top + 8, ev.boss ? 36 : 14, now, { colors: ev.boss ? ['#ffd21e', '#ff4f9e', '#3a6cf0', '#35a03a', '#ff8a12', '#ffffff'] : ['#ffffff', '#c8d8c0', '#8a9a80', '#ffe27a'],
                speed: ev.boss ? 70 : 40, gravity: 70, ms: ev.boss ? 1200 : 700 });
              base.ring(foe.x, foe.mid ?? foe.top + 8, now, { from: 4, to: ev.boss ? 36 : 22, color: '#fff8e8', ms: 500, thick: ev.boss ? 2 : 1 });
              if (ev.boss) { base.flash('#ffffff', 0.3, 320, now); base.shake(2, 420, now); }
            }
            hooks.sound?.(ev.boss ? 'mata-especial' : 'mata-golpe');
            break;
          case 'begin':
            if (ev.boss) {
              banner = { text: plain(tr('mini.mata.boss')), born: now, ms: 1600, y: 30, color: '#ff9a8a' };
              hooks.sound?.('mata-chefe');
              base.flash('#ff2a2a', 0.18, 360, now);
              base.shake(1.6, 400, now);
            }
            break;
          case 'win': {
            banner = { text: plain(tr('mini.mata.victory')), born: now, ms: 1500, y: 26, color: '#9ef05a' };
            hooks.sound?.('mata-vitoria');
            const lines = [];
            if (ev.reward?.cheer) lines.push(tr('gain.cheer', { n: compact(ev.reward.cheer) }));
            if (ev.reward?.tickets) lines.push(tr('gain.tickets', { n: ev.reward.tickets }));
            if (ev.reward?.wood) lines.push(tr('gain.wood', { n: ev.reward.wood }));
            base.tag(lines.map(line => [line, '#ffe27a']), hero.x + 30, hero.top + 2, now, { ms: 3000 });
            base.bits(112, 14, 40, now, { colors: ['#ffd21e', '#ff4f9e', '#3a6cf0', '#35a03a', '#ff8a12', '#ffffff'], speed: 70, arc: [0.2, 2.9], gravity: 70, ms: 1500 });
            base.flash('#fff6c0', 0.14, 300, now);
            break;
          }
          case 'lose':
            banner = { text: plain(tr('mini.mata.defeat')), born: now, ms: 1800, y: 26, color: '#ff9a8a' };
            hooks.sound?.('mata-derrota');
            base.flash('#10101c', 0.35, 600, now);
            base.bits(hero.x, hero.top + 12, 12, now, { colors: ['#8a8a9a', '#c8c8d8', '#ffffff'], speed: 26, up: 12, gravity: 40, ms: 800 });
            break;
          default: break;
        }
      }
    }
    const danceName = id => engineRef.data.dances.find(entry => entry.id === id)?.name || id;

    function draw(engine, now) {
      engineRef = engine;
      const model = engine.mini('mata');
      const info = model.info();
      base.clear();
      base.clearRegions();
      base.g.imageSmoothingEnabled = false;
      base.sprite(meta.fundos, info.scene, 0, 0);
      drawAmbient(info, now);
      places.clear();
      // Quem está mais atrás (maior y menor) desenha primeiro.
      drawPet(info, now);
      const heroBox = drawHero(info, now);
      const spots = slots(info.enemies);
      info.enemies.map((enemy, i) => ({ enemy, slot: spots[i] })).sort((a, b) => a.slot.y - b.slot.y).forEach(({ enemy, slot }) => drawEnemy(info, enemy, slot, now));
      base.drawParticles(now);
      drawFloaters(now);
      drawHud(info, now);
      handle(info, now);
      drawBanner(info, now);
      base.drawSays(now);
      drawPanel(info, now);
      base.drawFx(now);
      lastPhase = info.phase;
      return heroBox && true;
    }

    function click(clientX, clientY, now = 0) {
      if (!engineRef) return false;
      const model = engineRef.mini('mata');
      const found = base.hit(clientX, clientY);
      if (!found) return false;
      if (found.prev || found.next) {
        const moved = model.step(found.prev ? -1 : 1);
        hooks.sound?.(moved ? 'clique' : 'erro');
        if (moved) { banner = { text: tr('mini.mata.stage', { n: model.info().stage }), born: now, ms: 900, y: 30, color: '#fff8e8' }; }
        return true;
      }
      if (found.auto) { model.setAuto(!model.info().auto); hooks.sound?.('clique'); return true; }
      if (found.pet) { model.choosePet(); hooks.sound?.('carinho'); base.spawn('coracao', found.point.x, found.point.y - 6, now); base.ring(found.point.x, found.point.y, now, { from: 2, to: 9, color: '#ffb0c8', ms: 340 }); return true; }
      if (found.foe) {
        if (model.focus(found.foe)) {
          hooks.sound?.('clique');
          const spot = places.get(found.foe);
          if (spot) base.ring(spot.x, spot.mid ?? spot.top + 8, now, { from: 3, to: 15, color: '#ff8a8a', ms: 380, thick: 2 });
        }
        return true;
      }
      if (found.item) {
        const entry = model.info().unlocks.find(item => item.item === found.item);
        if (entry) hooks.toast?.(itemTip(entry).replace(/\n/g, ' - '), entry.owned ? 'ouro' : undefined);
        hooks.sound?.('clique');
        return true;
      }
      return true;
    }

    function status(engine) {
      const info = engine.mini('mata').info();
      const where = info.boss ? tr('mini.mata.statusBoss') : tr('mini.mata.statusBattle', { n: info.battle + 1, m: info.battles });
      return `${tr('mini.mata.statusStage', { n: info.stage })} · ${where}${info.paused ? ` · ${tr('mini.mata.paused')}` : ''}`;
    }

    function onEvents() {}

    function probe() {
      return { ...base.probeBase(), banner: banner ? banner.text : null, floaters: floaters.length, lastPhase };
    }

    return { size: base.size, setScale: base.setScale, draw, hit: base.hit, click, status, onEvents, probe };
  }

  root.ArraiaJanelas.registerView('mata', create);
})(typeof globalThis !== 'undefined' ? globalThis : this);
