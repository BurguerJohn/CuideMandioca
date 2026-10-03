(function (root, factory) {
  const Minis = typeof module === 'object' && module.exports ? require('./minis.js') : root.ArraiaMinis;
  factory(Minis);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Minis) {
  'use strict';

  // Mata Encantada: um auto battler. A Mandioca enfrenta criaturas do folclore em etapas de `battles` batalhas mais um chefe, uma
  // atrás da outra, enquanto a janela está visível. Os quatro atributos da loja viram os status dela (Rebolado: Ataque, Fôlego: Vida, Refresco:
  // Defesa e descanso entre as batalhas, Ritmo: velocidade), a Barriga mexe na Vida e o Amor no Ataque, e um bicho do Quintal pode
  // acompanhar (o laço dele dá bônus em tudo). A batalha em andamento não vai para o save (volta ao começo da batalha); o que vai é
  // a etapa, o recorde, as vitórias e as criaturas derrotadas. Configuração e criaturas em `data.minis.mata`.
  Minis.define('mata', (engine, tools) => {
    const { clamp, finite, int } = tools;
    const STEP = 0.05;          // a batalha anda de 50 em 50 ms, não importa o tamanho do quadro
    const INTRO = 1.1;          // as criaturas entram
    const OUTRO = 1.6;          // a comemoração depois da vitória
    const FAINT = 3;            // a Mandioca desmaiada depois da derrota
    const MAX_AHEAD = 2;        // no máximo isto de tempo atrasado é recuperado de uma vez
    const SHOW = ['charge', 'stun', 'slow', 'weak', 'confuse', 'burn', 'poison', 'heal'];   // o que a criatura anuncia antes de atacar

    let fight = null;           // a batalha de agora
    let ahead = 0;
    let seq = 0;
    let uid = 0;
    let isVisible = () => false;
    const events = [];

    const cfg = () => tools.cfg();
    const state = () => tools.state();
    const find = id => cfg().creatures.find(entry => entry.id === id) || cfg().bosses.find(entry => entry.id === id) || null;
    const note = (kind, detail = {}) => {
      events.push({ seq: ++seq, at: tools.now(), kind, ...detail });
      if (events.length > 80) events.shift();
    };

    // A etapa `n` (de 1 em diante; depois da última da lista os chefes e cenários repetem, mais fortes).
    function spec(n) {
      const list = cfg().stages;
      const index = (n - 1) % list.length;
      return { n, lap: Math.floor((n - 1) / list.length), scene: index, ...list[index] };
    }
    const bossBattle = battle => battle >= cfg().battles;

    // O bicho que acompanha (se ainda mora no quintal): o laço dele diz o bônus.
    function companion() {
      const id = state().companion;
      if (!id) return null;
      const entry = engine.mini('bichos').info().pets.find(pet => pet.id === id);
      if (!entry) return null;
      return { id, name: entry.name, bond: entry.bond, max: engine.data.minis.bichos.bondMax, ready: entry.ready };
    }

    // Os status da Mandioca agora: atributos, comida, felicidade, bicho e teimosia.
    function stats() {
      const k = cfg();
      const h = k.hero;
      const level = id => engine.level(id);
      const mood = engine.mood();
      const belly = mood.barriga / engine.cfg.moodMax;
      const love = mood.amor / engine.cfg.moodMax;
      const span = k.moodPercent / 100;
      const pet = companion();
      const petBonus = pet ? k.petPercent / 100 * pet.bond / pet.max : 0;
      const teimosia = state().teimosia * k.teimosiaPercent / 100;
      const mix = 1 + petBonus + teimosia;
      const bellyMult = 1 - span + 2 * span * belly;
      const loveMult = 1 - span + 2 * span * love;
      const refresco = level('refresco');
      const defense = Math.min(h.defMax, refresco / (refresco + h.defHalf));
      return {
        hp: Math.max(1, Math.round((h.hpBase + h.hpPerLevel * level('folego')) * bellyMult * mix)),
        atk: (h.atkBase + h.atkPerLevel * level('rebolado')) * loveMult * mix,
        interval: Math.max(h.minInterval, h.intervalBase / (1 + h.speedPerLevel * (level('ritmo') - 1)) / mix),
        red: 1 - (1 - defense) / mix,
        defense,
        crit: h.critBase + h.critLove * love,
        belly, love, bellyMult, loveMult, petBonus, teimosia, pet
      };
    }

    function makeHero(fraction) {
      const s = stats();
      const hp = Math.max(1, Math.round(s.hp * clamp(fraction, 0.01, 1)));
      return { hp, max: s.hp, atk: s.atk, interval: s.interval, red: s.red, defense: s.defense, crit: s.crit, cd: s.interval * 0.6,
        status: { stun: 0, slow: 0, weak: 0, confuse: 0, burn: { t: 0, dps: 0, next: 0 }, poison: { t: 0, dps: 0, next: 0 } },
        slowFactor: 1, weakFactor: 1, meter: 0, acted: -9, hurt: -9, special: -9 };
    }

    function makeEnemies(n, battle) {
      const k = cfg();
      const f = k.foe;
      const s = spec(n);
      const boss = bossBattle(battle);
      const step = 1 + f.step * Math.min(battle, k.battles);
      const hpScale = f.hp * f.hpGrowth ** (n - 1) * step;
      const atkScale = f.atk * f.atkGrowth ** (n - 1) * step;
      const list = [];
      const add = (id, share, isBoss) => {
        const base = find(id);
        const hp = Math.max(1, Math.round(hpScale * base.hp * share * (isBoss ? f.bossHp : 1)));
        list.push({ uid: ++uid, id, boss: isBoss, hp, max: hp, atk: Math.max(1, atkScale * base.atk * share * (isBoss ? f.bossAtk : 1)),
          interval: base.interval, cd: base.interval * (0.7 + 0.35 * list.length), hits: 0, powers: base.powers, enraged: false, revived: false,
          dead: false, acted: -9, hurt: -9, diedAt: -9, bornAt: 0 });
      };
      if (boss) {
        add(s.boss, 1, true);
        const escorts = clamp(Math.floor(n / 4), 0, 2);
        for (let i = 0; i < escorts; i++) add(tools.pick(s.mobs), f.escortShare, false);
      } else {
        const count = clamp(1 + Math.floor((n - 1) / 3) + (battle >= k.battles - 1 ? 1 : 0), 1, 4);
        const share = count ** -f.crowdShare;
        for (let i = 0; i < count; i++) add(tools.pick(s.mobs), share, false);
      }
      return list;
    }

    // Começa a batalha da vez da etapa de agora; a Mandioca chega com a vida que sobrou (`fraction` da vida máxima).
    function begin(fraction) {
      const s = state();
      fight = { phase: 'intro', t: 0, clock: 0, n: s.stage, battle: s.battle, boss: bossBattle(s.battle), hero: makeHero(fraction),
        enemies: makeEnemies(s.stage, s.battle), focus: 0 };
      note('begin', { boss: fight.boss, stage: s.stage, battle: s.battle });
    }

    // --- Um golpe de cada lado ------------------------------------------------------------------------------------------------
    function hurtEnemy(enemy, amount, crit) {
      const f = fight;
      enemy.hp -= amount;
      enemy.hurt = f.clock;
      note('hit', { side: 'foe', uid: enemy.uid, amount, crit });
      const rage = enemy.powers.find(power => power.kind === 'enrage');
      if (rage && !enemy.enraged && enemy.hp > 0 && enemy.hp <= enemy.max * rage.below) {
        enemy.enraged = true;
        enemy.atk *= rage.atk;
        enemy.interval *= rage.speed;
        note('status', { power: 'enrage', uid: enemy.uid });
      }
      if (enemy.hp > 0) return;
      const revive = enemy.powers.find(power => power.kind === 'revive');
      if (revive && !enemy.revived) {
        enemy.revived = true;
        enemy.hp = Math.max(1, Math.round(enemy.max * revive.hp));
        enemy.cd = enemy.interval;
        enemy.bornAt = f.clock;
        note('status', { power: 'revive', uid: enemy.uid });
        return;
      }
      enemy.hp = 0;
      enemy.dead = true;
      enemy.diedAt = f.clock;
      const kills = state().kills;
      kills[enemy.id] = (kills[enemy.id] || 0) + 1;
      note('die', { uid: enemy.uid, boss: enemy.boss });
    }

    function hurtHero(amount, how, extra = {}) {
      const h = fight.hero;
      h.hp -= amount;
      h.hurt = fight.clock;
      note('hit', { side: 'hero', amount, how, ...extra });
    }

    function heroAct() {
      const f = fight;
      const h = f.hero;
      const k = cfg();
      const alive = f.enemies.filter(enemy => !enemy.dead);
      if (!alive.length) return;
      h.acted = f.clock;
      const weak = h.status.weak > 0 ? h.weakFactor : 1;
      if (h.meter >= k.specialEvery) {
        h.meter = 0;
        h.special = f.clock;
        note('special', { dance: engine.state.runtime.dance });
        for (const enemy of alive) hurtEnemy(enemy, Math.max(1, Math.round(h.atk * k.hero.specialMult * weak * (0.9 + 0.2 * tools.rng()))), false);
        h.hp = Math.min(h.max, h.hp + Math.round(h.max * k.hero.specialHeal));
        return;
      }
      const target = alive.find(enemy => enemy.uid === f.focus) || alive[0];
      if (h.status.confuse > 0 && tools.rng() < 0.5) { note('miss', { uid: target.uid }); return; }
      const crit = tools.rng() < h.crit;
      const amount = Math.max(1, Math.round(h.atk * weak * (0.9 + 0.2 * tools.rng()) * (crit ? k.hero.critMult : 1)));
      h.meter++;
      hurtEnemy(target, amount, crit);
    }

    // O que a criatura anuncia para o próximo ataque dela (o que vai disparar quando `hits` chegar no múltiplo).
    function upcoming(enemy) {
      const kinds = enemy.powers.filter(power => power.every && (enemy.hits + 1) % power.every === 0).map(power => power.kind);
      return SHOW.find(kind => kinds.includes(kind)) || null;
    }

    function enemyAct(enemy) {
      const f = fight;
      const h = f.hero;
      enemy.acted = f.clock;
      enemy.hits++;
      const fired = enemy.powers.filter(power => power.every && enemy.hits % power.every === 0);
      const charge = fired.find(power => power.kind === 'charge');
      const amount = Math.max(1, Math.round(enemy.atk * (0.9 + 0.2 * tools.rng()) * (charge ? charge.mult : 1) * (1 - h.red)));
      hurtHero(amount, charge ? 'charge' : 'hit', { uid: enemy.uid });
      const drain = enemy.powers.find(power => power.kind === 'drain');
      if (drain) enemy.hp = Math.min(enemy.max, enemy.hp + Math.round(amount * drain.share));
      for (const power of fired) {
        switch (power.kind) {
          case 'burn': case 'poison':
            h.status[power.kind] = { t: power.dur, dps: Math.max(1, Math.round(enemy.atk * power.dps * (1 - h.red))), next: 1 };
            break;
          case 'slow': h.status.slow = power.dur; h.slowFactor = power.factor; break;
          case 'weak': h.status.weak = power.dur; h.weakFactor = power.factor; break;
          case 'confuse': h.status.confuse = power.dur; break;
          case 'stun': h.status.stun = Math.max(h.status.stun, power.dur); break;
          case 'heal': enemy.hp = Math.min(enemy.max, enemy.hp + Math.round(enemy.max * power.share)); break;
          default: break;
        }
        if (power.kind !== 'charge') note('status', { power: power.kind, uid: enemy.uid });
      }
    }

    function fighting(dt) {
      const f = fight;
      const h = f.hero;
      for (const key of ['stun', 'slow', 'weak', 'confuse']) if (h.status[key] > 0) h.status[key] = Math.max(0, h.status[key] - dt);
      for (const key of ['burn', 'poison']) {
        const dot = h.status[key];
        if (dot.t <= 0) continue;
        dot.t = Math.max(0, dot.t - dt);
        dot.next -= dt;
        if (dot.next <= 0) { dot.next += 1; hurtHero(dot.dps, key); }
      }
      if (h.hp > 0) {
        if (h.status.stun <= 0) h.cd -= dt / (h.status.slow > 0 ? h.slowFactor : 1);
        if (h.cd <= 0) { h.cd += h.interval; if (h.cd <= 0) h.cd = h.interval; heroAct(); }
      }
      if (f.enemies.every(enemy => enemy.dead)) { win(); return; }
      for (const enemy of f.enemies) {
        if (enemy.dead || h.hp <= 0) continue;
        enemy.cd -= dt;
        if (enemy.cd <= 0) { enemy.cd += enemy.interval; if (enemy.cd <= 0) enemy.cd = enemy.interval; enemyAct(enemy); }
      }
      if (h.hp <= 0) lose();
    }

    // --- Fim da batalha -------------------------------------------------------------------------------------------------------
    function unlockItems() {
      const s = state();
      const got = [];
      for (const entry of cfg().unlocks) {
        if (entry.stage > s.best || engine.owned(entry.item) || !engine.items[entry.item]) continue;
        if (engine.addItem(entry.item)) got.push(entry.item);
      }
      return got;
    }

    function win() {
      const f = fight;
      const s = state();
      const r = cfg().reward;
      f.phase = 'win';
      f.t = 0;
      s.wins++;
      const prize = { cheer: (r.cheer + r.cheerPerStage * (f.n - 1)) * (f.boss ? r.bossMult : 1), love: f.boss ? r.loveBoss : r.love };
      let first = false;
      if (f.boss) {
        s.bosses++;
        prize.wood = r.bossWood;
        if (f.n > s.best) { first = true; prize.tickets = r.firstClear.tickets; prize.wood += r.firstClear.wood; }
        else if (s.bosses % r.ticketEvery === 0) prize.tickets = 1;
        const pet = companion();
        if (pet) engine.mini('bichos').comfort?.(pet.id, 1);
      }
      const reward = tools.reward(prize);
      // Cada batalha custa um pouco de Barriga.
      engine.settleMood();
      const humor = engine.state.humor;
      if (!engine.bellyHeld()) humor.barriga = Math.max(0, humor.barriga - (f.boss ? r.bellyBoss : r.belly));
      let items = [];
      if (first) { s.best = f.n; items = unlockItems(); }
      if (f.boss) s.teimosia = 0;
      f.first = first;
      note('win', { boss: f.boss, reward, first, items, stage: f.n });
      tools.emit('win', { boss: f.boss, stage: f.n, first, items });
    }

    function lose() {
      const f = fight;
      const s = state();
      f.phase = 'lose';
      f.t = 0;
      s.defeats++;
      s.teimosia = Math.min(cfg().teimosiaMax, s.teimosia + 1);
      s.battle = 0;
      note('lose', { stage: f.n });
      tools.emit('lose', { stage: f.n });
    }

    // Depois da comemoração: a próxima batalha, ou a próxima etapa se acabou o chefe (a etapa só avança sozinha na primeira vitória
    // sobre o chefe dela: quem está treinando numa etapa que já venceu repete a mesma).
    function checkpoint() {
      return { stage: fight.boss && fight.first ? fight.n + 1 : fight.n, battle: fight.boss ? 0 : fight.battle + 1 };
    }

    function next() {
      const s = state();
      const k = cfg();
      const hero = fight.hero;
      Object.assign(s, checkpoint());
      let fraction;
      if (fight.boss) {
        fraction = 1;
      } else {
        fraction = hero.hp / hero.max + k.hero.restHeal + k.hero.restDef * hero.defense;
      }
      begin(Math.min(1, fraction));
    }

    function step(dt) {
      if (!fight) begin(1);
      const f = fight;
      f.clock += dt;
      f.t += dt;
      if (f.phase === 'intro') { if (f.t >= INTRO) { f.phase = 'fight'; f.t = 0; } return; }
      if (f.phase === 'win') { if (f.t >= OUTRO) next(); return; }
      if (f.phase === 'lose') { if (f.t >= FAINT) begin(1); return; }
      fighting(dt);
    }

    // As criaturas e os chefes que o jogador pode ver como "a lista de itens": cada item, a etapa que libera e se já é da Mandioca.
    function unlocks() {
      const list = cfg().unlocks.map(entry => {
        const item = engine.items[entry.item];
        return { item: entry.item, stage: entry.stage, cat: item.cat, name: item.name, desc: item.desc, owned: engine.owned(entry.item), next: false };
      });
      const next = list.find(entry => !entry.owned);
      if (next) next.next = true;
      return list;
    }

    return {
      // Estado de partida nova (também a de um novo São João): a batalha que estava rolando fica para trás junto.
      fresh() {
        fight = null;
        ahead = 0;
        events.length = 0;
        return { stage: 1, battle: 0, best: 0, auto: true, companion: '', teimosia: 0, wins: 0, bosses: 0, defeats: 0, kills: {} };
      },

      load(raw) {
        fight = null;
        ahead = 0;
        events.length = 0;
        const k = cfg();
        if (!raw) return this.fresh();
        const best = int(raw.best, 0, 1e6, 0);
        const pets = engine.data.minis.bichos.pets.map(pet => pet.id);
        const kills = {};
        for (const entry of [...k.creatures, ...k.bosses]) {
          const count = int(raw.kills?.[entry.id], 0, 1e9, 0);
          if (count) kills[entry.id] = count;
        }
        return { stage: int(raw.stage, 1, best + 1, 1), battle: int(raw.battle, 0, k.battles, 0), best, auto: raw.auto !== false,
          companion: typeof raw.companion === 'string' && pets.includes(raw.companion) ? raw.companion : '',
          teimosia: int(raw.teimosia, 0, k.teimosiaMax, 0), wins: int(raw.wins, 0, 1e9, 0), bosses: int(raw.bosses, 0, 1e9, 0),
          defeats: int(raw.defeats, 0, 1e9, 0), kills };
      },

      // A vitória já foi paga: reabrir durante a comemoração começa na batalha seguinte.
      save(saved) {
        if (fight?.phase === 'win') Object.assign(saved, checkpoint());
      },

      // A visibilidade pertence à interface, não ao save nem à escolha de pausar no botão.
      setVisibilityCheck(check) { isVisible = typeof check === 'function' ? check : () => false; },

      // O tempo escondido não entra no acumulador: reabrir continua exatamente de onde a luta parou.
      tick(dt) {
        if (!isVisible() || !state().auto || !(dt > 0)) return;
        ahead = Math.min(MAX_AHEAD, ahead + dt);
        while (ahead >= STEP) { ahead -= STEP; step(STEP); }
      },

      stats,
      spec,
      companion,
      unlocks,

      // Tudo o que a janela desenha: a etapa, os dois lados da batalha, os status, o bicho e a lista de itens.
      info() {
        const s = state();
        const k = cfg();
        const sp = spec(s.stage);
        const f = fight;
        return {
          stage: s.stage, best: s.best, battle: f ? f.battle : s.battle, battles: k.battles, boss: f ? f.boss : bossBattle(s.battle), name: sp.name, scene: sp.scene, lap: sp.lap,
          auto: s.auto, paused: !s.auto || !isVisible(), teimosia: s.teimosia, wins: s.wins, bosses: s.bosses, defeats: s.defeats, kills: s.kills, seq,
          phase: f ? f.phase : 'intro', t: f ? f.t : 0, clock: f ? f.clock : 0,
          hero: f ? { hp: Math.max(0, f.hero.hp), max: f.hero.max, swing: clamp(1 - f.hero.cd / f.hero.interval, 0, 1), meter: f.hero.meter / k.specialEvery,
            acted: f.hero.acted, hurt: f.hero.hurt, special: f.hero.special,
            status: { stun: f.hero.status.stun, slow: f.hero.status.slow, weak: f.hero.status.weak, confuse: f.hero.status.confuse,
              burn: f.hero.status.burn.t, poison: f.hero.status.poison.t } } : null,
          enemies: f ? f.enemies.map(enemy => ({ uid: enemy.uid, id: enemy.id, boss: enemy.boss, hp: enemy.hp, max: enemy.max, dead: enemy.dead, acted: enemy.acted,
            hurt: enemy.hurt, diedAt: enemy.diedAt, bornAt: enemy.bornAt, enraged: enemy.enraged, next: enemy.dead ? null : upcoming(enemy),
            focus: enemy.uid === f.focus })) : [],
          stats: stats(),
          pets: engine.mini('bichos').info().pets.map(pet => ({ id: pet.id, name: pet.name, bond: pet.bond })),
          unlocks: unlocks()
        };
      },

      // Acontecimentos novos (a janela mostra o número do golpe, a faísca da morte, os avisos...).
      events(since = 0) { return events.filter(entry => entry.seq > since); },

      // O jogador escolhe a etapa (de 1 até a próxima do recorde): a batalha recomeça por ela.
      select(n) {
        const s = state();
        const target = Math.floor(finite(n, NaN));
        if (!(target >= 1) || target > s.best + 1) return false;
        if (target === s.stage && s.battle === 0 && !fight) return true;
        s.stage = target;
        s.battle = 0;
        s.teimosia = 0;
        fight = null;
        ahead = 0;
        events.length = 0;
        return true;
      },
      step(delta) { return this.select(state().stage + delta); },

      setAuto(on) { state().auto = !!on; return state().auto; },

      // Quem acompanha: um bicho que já mora no quintal (ou ninguém, com ''). Sem argumento, passa para o próximo da fila.
      choosePet(id) {
        const ids = engine.mini('bichos').info().pets.map(pet => pet.id);
        const s = state();
        if (id === undefined) {
          const at = ids.indexOf(s.companion);
          id = at + 1 < ids.length ? ids[at + 1] : '';
          if (at < 0) id = ids[0] || '';
        }
        if (id !== '' && !ids.includes(id)) return false;
        s.companion = id;
        return true;
      },

      // Aponta quem a Mandioca ataca primeiro (padrão: o da frente).
      focus(id) {
        if (!fight) return false;
        const enemy = fight.enemies.find(entry => entry.uid === id && !entry.dead);
        if (!enemy) return false;
        fight.focus = enemy.uid;
        return true;
      },

      probe() { return { fight: fight ? { phase: fight.phase, battle: fight.battle, n: fight.n } : null, seq }; }
    };
  });
});
