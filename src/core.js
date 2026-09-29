(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ArraiaCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SAVE_VERSION = 1;
  const STATS = ['rebolado', 'folego', 'refresco', 'ritmo'];
  const BONFIRE = ['labareda', 'brasa', 'calor'];
  const SLOTS = ['chapeu', 'mao', 'tecido', 'terreiro', 'esquerda', 'direita'];
  const MINUTE = 60000;

  const SCENERY_PLAN = 400;
  // Diário: no máximo tantas entradas; quando passa, somem primeiro os acontecimentos miúdos, nunca os desbloqueios.
  const LOG_CAP = 4000;
  const LOG_KEEP = new Set(['comeco', 'inicio', 'size', 'tier', 'achievement', 'item', 'legendary', 'fishing-open']);
  // Compras em sequência viram uma linha só no diário, se acontecem com menos disto de diferença (segundos de jogo).
  const LOG_MERGE = 20;

  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

  // Qual peça de cenário cada lotação traz: o marco daquela lotação ou o próximo enfeite da rotação com vaga.
  function planScenery(scenery, upTo) {
    const plan = [null, null];
    const counts = {};
    const have = new Set();
    let turn = 0;
    for (let size = 2; size <= upTo; size++) {
      const mark = scenery.landmarks.find(entry => entry.size === size);
      let piece = null;
      if (mark) {
        piece = { id: mark.id, name: mark.name, landmark: true };
        have.add(mark.id);
      } else {
        for (let k = 0; k < scenery.cycle.length; k++) {
          const entry = scenery.cycle[(turn + k) % scenery.cycle.length];
          if ((counts[entry.id] || 0) >= entry.max || (entry.after && !have.has(entry.after))) continue;
          counts[entry.id] = (counts[entry.id] || 0) + 1;
          piece = { id: entry.id, name: entry.name, index: counts[entry.id] };
          turn = (turn + k + 1) % scenery.cycle.length;
          break;
        }
      }
      plan.push(piece);
    }
    return plan;
  }
  const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
  const copy = value => JSON.parse(JSON.stringify(value));

  class GameEngine {
    constructor(data, saved, options = {}) {
      this.data = data;
      this.cfg = data.config;
      this.rng = options.rng || Math.random;
      this.clock = options.now || (() => Date.now());
      this.stats = Object.fromEntries(data.stats.map(stat => [stat.id, stat]));
      this.items = Object.fromEntries(data.items.map(item => [item.id, item]));
      this.chars = Object.fromEntries(data.chars.map(char => [char.id, char]));
      this.validate();
      this.sceneryPlan = planScenery(data.scenery, SCENERY_PLAN);
      this.events = [];
      this.welcome = null;
      this.state = saved ? this.load(saved) : this.fresh();
    }

    validate() {
      const d = this.data;
      const fail = message => { throw new Error(`Dados inválidos: ${message}`); };
      if (STATS.some(id => !this.stats[id])) fail('atributo ausente');
      for (const char of d.chars) if (!d.posts[char.post] || !d.rarities[char.rarity]) fail(char.id);
      for (const post of Object.values(d.posts)) if (post.item && !this.items[post.item]) fail(post.item);
      for (const outing of d.outings) if (outing.item && !this.items[outing.item]) fail(outing.item);
      for (const [slot, id] of Object.entries(d.equipped)) if (!this.items[id]) fail(`${slot}: ${id}`);
    }

    now() { return this.clock(); }

    fresh() {
      const now = this.now();
      return {
        version: SAVE_VERSION,
        seed: Math.floor(this.rng() * 2 ** 31),
        name: 'Mandioca',
        cheer: 0, tickets: 0, wood: 0, fame: 0, size: 1, ticketLevel: 1,
        levels: Object.fromEntries(STATS.map(id => [id, 1])),
        bonfire: Object.fromEntries(BONFIRE.map(id => [id, 0])),
        inventory: [],
        equipped: { ...this.data.equipped },
        crew: {},
        outings: this.data.outings.map(() => ({ char: null, endsAt: 0 })),
        fishing: { ready: 0, nextAt: 0, unlocked: false },
        mail: { ready: 1, nextAt: now + this.letterInterval() },
        request: { active: null, nextAt: 0 },
        crasher: { active: null, nextAt: 0 },
        rings: { cost: this.cfg.ringCost, nextAt: 0 },
        stats: { playtime: 0, steps: 0, cheerEarned: 0, cheerSpent: 0, fished: 0,
          outings: 0, letters: 0, requests: 0, crashers: 0, ringRounds: 0, ringHits: 0 },
        achievements: [],
        log: [{ t: 0, type: 'comeco' }],
        runtime: this.freshRuntime(),
        lastSeen: now
      };
    }

    freshRuntime() {
      return { stamina: this.stats.folego.base, dancing: true, lift: 0, flareWait: this.cfg.flareEvery,
        flareLeft: 0, emberLeft: 0, lastStep: 0 };
    }

    load(raw) {
      if (!raw || raw.version !== SAVE_VERSION || typeof raw.levels !== 'object' || !Array.isArray(raw.outings)) {
        throw new Error('Save incompatível ou corrompido.');
      }
      const base = this.fresh();
      const s = { ...base, ...copy(raw) };
      for (const id of STATS) {
        if (!Number.isInteger(s.levels[id]) || s.levels[id] < 1) throw new Error('Nível inválido no save.');
      }
      for (const field of ['cheer', 'tickets', 'wood', 'fame']) {
        if (!Number.isFinite(s[field]) || s[field] < 0) throw new Error('Saldo inválido no save.');
      }
      if (!Number.isInteger(s.size) || s.size < 1) throw new Error('Lotação inválida no save.');
      s.bonfire = Object.fromEntries(BONFIRE.map(id => [id, Math.max(0, Math.floor(finite(s.bonfire?.[id])))]));
      s.inventory = [...new Set((s.inventory || []).filter(id => this.items[id]))];
      s.equipped = Object.fromEntries(SLOTS.map(slot => {
        const id = s.equipped?.[slot];
        return [slot, this.items[id] && this.owned(id, s) ? id : this.data.equipped[slot]];
      }));
      const crew = {};
      for (const [id, entry] of Object.entries(s.crew || {})) {
        if (this.chars[id]) crew[id] = { level: clamp(Math.floor(finite(entry.level, 1)), 1, this.cfg.maxLevel) };
      }
      s.crew = crew;
      s.outings = this.data.outings.map((_, index) => {
        const entry = raw.outings[index] || {};
        return { char: this.chars[entry.char] && crew[entry.char] ? entry.char : null, endsAt: finite(entry.endsAt) };
      });
      s.stats = { ...base.stats, ...s.stats };
      delete s.stats.bestPole;
      const known = new Set(this.data.achievements.map(entry => entry.id));
      s.achievements = Array.isArray(s.achievements) ? [...new Set(s.achievements)].filter(id => known.has(id)) : [];
      const cost = Math.floor(finite(s.rings?.cost, this.cfg.ringCost));
      s.rings = { cost: clamp(cost, this.cfg.ringCost, this.cfg.ringCost * 2 ** 12), nextAt: finite(s.rings?.nextAt) };
      s.log = Array.isArray(raw.log)
        ? raw.log.filter(entry => entry && typeof entry.type === 'string' && Number.isFinite(entry.t)).slice(-LOG_CAP)
        : [{ t: Math.round(finite(s.stats.playtime)), type: 'inicio', size: s.size }];
      s.runtime = { ...this.freshRuntime(), dancing: true };
      this.state = s;
      s.runtime.stamina = this.maxStamina();
      this.catchUp(finite(s.lastSeen, this.now()));
      return s;
    }

    // Quanto a festa rende com o jogo fechado: 25% (cfg.offlineRate), mais o que o Sopinha acrescenta.
    offlineRate() { return this.cfg.offlineRate * (1 + this.effect('offline')); }

    // Enquanto o jogo esteve fechado, a festa rendeu no ritmo de offlineRate(), até 12 horas (cfg.offlineCapHours).
    catchUp(lastSeen) {
      const away = (this.now() - lastSeen) / 1000;
      const seconds = Math.min(away, this.cfg.offlineCapHours * 3600);
      if (seconds < 60) return;
      const bunny = this.effect('offline');
      const cheer = this.cheerPerSecond() * seconds * this.offlineRate();
      this.offline = true;
      this.earn(cheer);
      this.offline = false;
      this.welcome = { seconds, cheer, bunny, capped: away > seconds };
    }

    exportState() {
      this.state.lastSeen = this.now();
      return copy(this.state);
    }

    emit(type, detail = {}) {
      this.events.push({ type, ...detail });
      if (this.events.length > 200) this.events.shift();
    }

    // Diário da festa: cada acontecimento com o tempo de jogo (em segundos) em que aconteceu.
    record(type, detail = {}) {
      const log = this.state.log;
      const entry = { t: Math.round(this.state.stats.playtime), type, ...detail };
      if (this.offline) entry.offline = true;
      if (this.testing) entry.test = true;
      log.push(entry);
      if (log.length > LOG_CAP) {
        const index = log.findIndex(old => !LOG_KEEP.has(old.type));
        log.splice(index >= 0 ? index : 0, 1);
      }
      return entry;
    }

    // Compra repetida (vários níveis, várias fichas) estica a linha recente do mesmo tipo em vez de criar outra.
    recordMerged(type, key, detail, merge) {
      const log = this.state.log;
      const now = Math.round(this.state.stats.playtime);
      for (let i = log.length - 1; i >= Math.max(0, log.length - 12); i--) {
        const entry = log[i];
        if (entry.type !== type || entry.key !== key) continue;
        if (now - (entry.until ?? entry.t) > LOG_MERGE) break;
        return Object.assign(entry, merge(entry), { until: now });
      }
      return this.record(type, { key, ...detail });
    }

    // Modo de teste: atalhos para testar o jogo. Tudo o que sai daqui fica marcado como teste no diário.
    debug(op, value = 0) {
      const s = this.state;
      const n = Math.max(0, Number(value) || 0);
      const now = this.now();
      this.testing = true;
      let note = '';
      let extra = {};
      try {
        if (op === 'animacao') {
          const amount = Math.max(100, Math.round(this.cheerPerSecond() * n));
          s.cheer += amount;
          extra = { amount };
          note = `+${amount} de Animação`;
        } else if (op === 'fichas') { s.tickets += n; note = `+${n} fichas`; }
        else if (op === 'lenha') { s.wood += n; note = `+${n} de lenha`; }
        else if (op === 'convidados') {
          for (let i = 0; i < n; i++) this.addFame(this.fameNeed() - s.fame);
          note = `+${n} convidados`;
        } else if (op === 'porte') {
          const target = Math.min(this.data.tiers.length - 1, this.tierIndex() + 1);
          while (s.size < this.data.tiers[target].size) this.addFame(this.fameNeed() - s.fame);
          extra = { value: this.tierIndex() };
          note = `A festa virou ${this.tier().name}`;
        } else if (op === 'tempo') {
          this.advance(n);
          note = `Passou ${Math.round(n / 60)} min de festa`;
        } else if (op === 'prendas') {
          if (!s.fishing.unlocked) s.fishing = { ready: 0, nextAt: 0, unlocked: true };
          s.fishing.ready = this.cfg.prizeCap;
          note = 'Prendas prontas na pescaria';
        } else if (op === 'cartas') { s.mail.ready = this.cfg.letterCap; note = 'Cartas no correio'; }
        else if (op === 'roles') {
          s.outings.forEach(entry => { if (entry.char) entry.endsAt = now; });
          note = 'Rolês prontos';
        } else if (op === 'turma') {
          for (const char of this.data.chars) if (!s.crew[char.id]) s.crew[char.id] = { level: 1 };
          this.unlock('turma-completa');
          note = 'Turma completa';
        } else if (op === 'itens') {
          for (const item of this.data.items) this.addItem(item.id);
          note = 'Todos os itens';
        } else if (op === 'pedido') {
          const kinds = this.data.requests;
          s.request.active = { kind: kinds[Math.floor(this.rng() * kinds.length)].id,
            until: now + this.cfg.requestSeconds * 1000, who: Math.floor(this.rng() * 1000) };
          note = 'Chegou um pedido';
        } else if (op === 'penetra') {
          s.crasher.active = { until: now + this.cfg.crasherSeconds * 1000, side: this.rng() < 0.5 ? -1 : 1 };
          note = 'Chegou um penetra';
        } else if (op === 'argolas') { s.rings = { cost: this.cfg.ringCost, nextAt: 0 }; note = 'Argolas no preço mínimo'; }
        else return null;
        this.record('debug', { op, value: n, note, ...extra });
        return note;
      } finally {
        this.testing = false;
      }
    }

    // Avança o tempo de jogo como se a festa tivesse rodado: os relógios de tempo real andam junto.
    advance(seconds) {
      const s = this.state;
      const ms = seconds * 1000;
      const back = value => (value ? value - ms : value);
      s.fishing.nextAt = back(s.fishing.nextAt);
      s.mail.nextAt = back(s.mail.nextAt);
      s.request.nextAt = back(s.request.nextAt);
      s.crasher.nextAt = back(s.crasher.nextAt);
      s.rings.nextAt = back(s.rings.nextAt);
      if (s.request.active) s.request.active.until -= ms;
      if (s.crasher.active) s.crasher.active.until -= ms;
      s.outings.forEach(entry => { entry.endsAt = back(entry.endsAt); });
      for (let left = seconds; left > 0; left -= 1) this.tick(Math.min(1, left));
    }

    drainEvents() {
      const events = this.events;
      this.events = [];
      return events;
    }

    unlock(id) {
      if (this.state.achievements.includes(id)) return;
      this.state.achievements.push(id);
      this.record('achievement', { id });
      this.emit('achievement', { id });
    }

    // Porte, lotação e fama
    tierIndex(size = this.state.size) {
      let index = 0;
      this.data.tiers.forEach((tier, i) => { if (size >= tier.size) index = i; });
      return index;
    }
    tier() { return this.data.tiers[this.tierIndex()]; }
    nextTier() { return this.data.tiers[this.tierIndex() + 1] || null; }
    fameNeed(size = this.state.size) {
      return Math.round(this.cfg.fameBase * size ** this.cfg.famePow * this.cfg.fameGrowth ** (size - 1));
    }

    addFame(amount) {
      const s = this.state;
      const before = this.tierIndex();
      s.fame += amount;
      let grew = 0;
      while (s.fame >= this.fameNeed()) {
        s.fame -= this.fameNeed();
        s.size++;
        grew++;
        this.record('size', { size: s.size });
      }
      if (!grew) return;
      this.emit('size-up', { size: s.size, count: grew });
      const after = this.tierIndex();
      for (let index = before + 1; index <= after; index++) {
        this.record('tier', { tier: index });
        this.emit('tier-up', { tier: index });
        this.unlock(this.data.tiers[index].id);
      }
      this.updateTimers(this.now());
    }

    // Cenário: a peça que a lotação `size` trouxe e tudo o que a festa já ganhou até agora.
    sceneryPiece(size) { return this.sceneryPlan[size] || null; }
    scenery(size = this.state.size) {
      const landmarks = [];
      const counts = {};
      for (let s = 2; s <= Math.min(size, SCENERY_PLAN); s++) {
        const piece = this.sceneryPlan[s];
        if (!piece) continue;
        if (piece.landmark) landmarks.push(piece.id);
        else counts[piece.id] = (counts[piece.id] || 0) + 1;
      }
      return { landmarks, counts };
    }

    // Toda Animação que a festa junta vira fama aos pouquinhos; gastar não dá fama, só deixa a festa render mais.
    earn(amount) {
      const s = this.state;
      s.cheer += amount;
      s.stats.cheerEarned += amount;
      if (s.stats.cheerEarned >= 1000) this.unlock('mil');
      this.addFame(amount);
    }

    spend(amount) {
      const s = this.state;
      if (!(amount > 0) || s.cheer < amount) return false;
      s.cheer -= amount;
      s.stats.cheerSpent += amount;
      return true;
    }

    // Turma e postos
    hasChar(id) { return !!this.state.crew[id]; }
    charLevel(id) { return this.state.crew[id]?.level || 0; }
    awayOuting(id) { return this.state.outings.findIndex(entry => entry.char === id); }
    postOpen(postId) {
      const post = this.data.posts[postId];
      if (post.item) return this.isPlaced(post.item);
      return this.tierIndex() >= post.tier;
    }
    charActive(id) {
      return this.hasChar(id) && this.awayOuting(id) < 0 && this.postOpen(this.chars[id].post);
    }
    charValue(id, level = this.charLevel(id)) {
      const char = this.chars[id];
      return char.base + char.per * (level - 1);
    }
    effect(kind) {
      const char = this.data.chars.find(entry => entry.effect === kind);
      return char && this.charActive(char.id) ? this.charValue(char.id) : 0;
    }
    effectText(id, level = this.charLevel(id) || 1) {
      const char = this.chars[id];
      const value = this.charValue(id, level);
      return char.text.replace('{v}', Math.round(value * 100)).replace('{n}', value);
    }

    // Atributos
    level(stat) { return this.state.levels[stat]; }
    statValue(stat, level = this.level(stat)) {
      const config = this.stats[stat];
      return config.base + config.per * (level - 1);
    }
    levelCost(stat) {
      const config = this.stats[stat];
      return Math.round(config.price * config.growth ** (this.level(stat) - 1));
    }
    buyLevel(stat) {
      if (!this.stats[stat] || !this.spend(this.levelCost(stat))) return false;
      this.state.levels[stat]++;
      const level = this.state.levels[stat];
      this.recordMerged('level', stat, { from: level - 1, level }, () => ({ level }));
      this.emit('level-up', { stat });
      return true;
    }
    maxStamina() { return this.statValue('folego') + this.effect('stamina'); }
    speed() { return this.statValue('ritmo') * (1 + this.effect('speed')); }
    recovery() {
      const food = this.isPlaced('barraca-comidas') ? 0.1 : 0;
      return this.maxStamina() / this.cfg.restSeconds * this.statValue('refresco') * (1 + this.effect('recovery') + food);
    }
    collection() {
      const extras = this.state.inventory.map(id => this.items[id]);
      const sides = extras.filter(item => item.cat === 'lado').length;
      return (extras.length - sides) * this.cfg.cosmeticBonus + sides * this.cfg.sideBonus;
    }
    multiplier() {
      const b = this.state.bonfire;
      return (1 + this.cfg.sizeBonus * this.state.size) * (1 + this.collection()) * (1 + this.effect('cheer')) *
        (1 + this.cfg.heatPerLevel * b.calor) * (this.legendary() ? 2 : 1);
    }
    stepValue() { return this.statValue('rebolado') * this.multiplier(); }
    cheerPerSecond() {
      const stamina = this.maxStamina();
      return this.stepValue() * stamina / (stamina / this.speed() + stamina / this.recovery());
    }

    // Treino: dança, cansa, descansa, recomeça.
    tick(dt) {
      if (!(dt > 0)) return;
      dt = Math.min(dt, 1);
      const s = this.state;
      const r = s.runtime;
      s.stats.playtime += dt;
      this.updateTimers(this.now());
      if (s.bonfire.labareda > 0) {
        if (r.flareLeft > 0) {
          r.flareLeft -= dt;
          if (r.flareLeft <= 0) { r.flareLeft = 0; this.emit('flare-end'); }
        } else if ((r.flareWait -= dt) <= 0) {
          r.flareWait = this.cfg.flareEvery;
          r.flareLeft = this.flareDuration();
          this.emit('flare-start');
        }
      }
      if (r.emberLeft > 0) r.emberLeft = Math.max(0, r.emberLeft - dt);
      if (r.dancing) {
        r.lift += this.speed() * dt;
        while (r.lift >= 1 && r.dancing) {
          r.lift -= 1;
          this.step();
          r.stamina -= 1;
          if (r.stamina <= 0) {
            r.stamina = 0;
            r.dancing = false;
            r.lift = 0;
            this.emit('rest-start');
          }
        }
      } else {
        r.stamina += this.recovery() * dt;
        if (r.stamina >= this.maxStamina()) {
          r.stamina = this.maxStamina();
          r.dancing = true;
          if (s.bonfire.brasa > 0) r.emberLeft = this.cfg.emberFor;
          this.emit('rest-end');
        }
      }
    }

    step() {
      const s = this.state;
      const r = s.runtime;
      let value = this.stepValue();
      if (r.flareLeft > 0) value *= 1 + this.cfg.flarePerLevel * s.bonfire.labareda;
      if (r.emberLeft > 0) value *= 1 + this.cfg.emberPerLevel * s.bonfire.brasa;
      const cobra = this.effect('crit');
      const crit = cobra > 0 && this.rng() < cobra;
      if (crit) value *= this.cfg.cobraMult;
      this.earn(value);
      s.stats.steps++;
      r.lastStep = value;
      if (s.stats.steps === 1) this.unlock('primeiro-passo');
      this.emit('step', { value, crit });
    }

    flareDuration() { return this.cfg.flareFor * (1 + this.effect('flare')); }
    get flareActive() { return this.state.runtime.flareLeft > 0; }
    get emberActive() { return this.state.runtime.emberLeft > 0; }

    // Fichas e loja
    ticketCost() { return this.cfg.ticketBase + this.cfg.ticketStep * (this.state.ticketLevel - 1); }
    buyTicket() {
      if (!this.spend(this.ticketCost())) return false;
      this.state.tickets++;
      this.state.ticketLevel++;
      this.recordMerged('ticket', 'ficha', { count: 1 }, entry => ({ count: entry.count + 1 }));
      return true;
    }
    owned(id, s = this.state) {
      const item = this.items[id];
      return !!item && (item.source === 'inicial' || s.inventory.includes(id));
    }
    itemLocked(id) {
      const item = this.items[id];
      return (item.tier || 0) > this.tierIndex();
    }
    buyItem(id) {
      const item = this.items[id];
      if (!item || this.owned(id) || item.source || this.itemLocked(id) || this.state.tickets < item.price) return false;
      this.state.tickets -= item.price;
      this.addItem(id);
      return true;
    }
    addItem(id) {
      if (this.owned(id)) return false;
      this.state.inventory.push(id);
      this.record('item', { id });
      if (this.state.inventory.length >= 15) this.unlock('estiloso');
      this.emit('item', { id });
      return true;
    }
    isPlaced(id) { return this.state.equipped.esquerda === id || this.state.equipped.direita === id; }
    equip(id, side) {
      const item = this.items[id];
      if (!item || !this.owned(id)) return false;
      const e = this.state.equipped;
      if (item.cat === 'lado') {
        const slot = side === 'direita' ? 'direita' : 'esquerda';
        const other = slot === 'esquerda' ? 'direita' : 'esquerda';
        if (e[other] === id) e[other] = e[slot];
        e[slot] = id;
      } else e[item.cat] = id;
      this.emit('equip', { id });
      return true;
    }

    // Relógios de tempo real: pescaria, cartas, pedidos, penetras.
    fishingInterval() { return this.cfg.fishingMinutes * MINUTE * (1 - Math.min(0.6, this.effect('fishing'))); }
    letterInterval() {
      const fast = this.state?.equipped && this.isPlaced('correio') ? 0.7 : 1;
      return this.cfg.letterMinutes * MINUTE * fast;
    }
    between([low, high]) { return (low + (high - low) * this.rng()) * 1000; }

    updateTimers(now) {
      const s = this.state;
      const tier = this.tierIndex();
      if (tier >= 1 && !s.fishing.unlocked) {
        s.fishing = { ready: 1, nextAt: now + this.fishingInterval(), unlocked: true };
        this.record('fishing-open');
        this.emit('fishing-open');
      }
      for (const [clock, cap, interval] of [[s.fishing, this.cfg.prizeCap, () => this.fishingInterval()],
        [s.mail, this.cfg.letterCap, () => this.letterInterval()]]) {
        if (clock === s.fishing && !clock.unlocked) continue;
        if (clock.ready >= cap) { clock.nextAt = 0; continue; }
        if (!clock.nextAt) clock.nextAt = now + interval();
        while (clock.nextAt && now >= clock.nextAt && clock.ready < cap) {
          clock.ready++;
          clock.nextAt = clock.ready < cap ? clock.nextAt + interval() : 0;
          this.emit(clock === s.fishing ? 'prize-ready' : 'letter-ready');
        }
      }
      if (tier >= 1) {
        const q = s.request;
        if (q.active && now >= q.active.until) q.active = null;
        if (!q.active) {
          if (!q.nextAt) q.nextAt = now + this.between(this.cfg.requestEvery);
          if (now >= q.nextAt) {
            const kinds = this.data.requests;
            q.active = { kind: kinds[Math.floor(this.rng() * kinds.length)].id, until: now + this.cfg.requestSeconds * 1000,
              who: Math.floor(this.rng() * 1000) };
            q.nextAt = 0;
            this.emit('request', { kind: q.active.kind });
          }
        }
      }
      if (tier >= 3) {
        const c = s.crasher;
        if (c.active && now >= c.active.until) { c.active = null; this.emit('crasher-left'); }
        if (!c.active) {
          if (!c.nextAt) c.nextAt = now + this.between(this.cfg.crasherEvery);
          if (now >= c.nextAt) {
            c.active = { until: now + this.cfg.crasherSeconds * 1000, side: this.rng() < 0.5 ? -1 : 1 };
            c.nextAt = 0;
            this.emit('crasher');
          }
        }
      }
      const rings = s.rings;
      while (rings.cost > this.cfg.ringCost && rings.nextAt && now >= rings.nextAt) {
        rings.cost = Math.max(this.cfg.ringCost, rings.cost / 2);
        rings.nextAt = rings.cost > this.cfg.ringCost ? rings.nextAt + this.ringCooldown() : 0;
        this.emit('rings-cheaper', { cost: rings.cost });
      }
      s.outings.forEach((entry, index) => {
        if (entry.char && entry.endsAt && now >= entry.endsAt && !entry.announced) {
          entry.announced = true;
          this.emit('outing-done', { index });
        }
      });
    }

    // Pescaria
    fish() {
      const s = this.state;
      if (!s.fishing.unlocked || s.fishing.ready <= 0) return null;
      s.fishing.ready--;
      if (!s.fishing.nextAt) s.fishing.nextAt = this.now() + this.fishingInterval();
      let char;
      if (s.stats.fished === 0) char = this.chars.milho;
      else {
        let roll = this.rng();
        let rarity = this.data.rarities.length - 1;
        for (let index = 0; index < this.data.rarities.length; index++) {
          roll -= this.data.rarities[index].chance;
          if (roll < 0) { rarity = index; break; }
        }
        const pool = this.data.chars.filter(entry => entry.rarity === rarity);
        char = pool[Math.min(pool.length - 1, Math.floor(this.rng() * pool.length))];
      }
      s.stats.fished++;
      this.unlock('primeira-prenda');
      const entry = s.crew[char.id];
      let result;
      if (!entry) {
        s.crew[char.id] = { level: 1 };
        result = { char, isNew: true, level: 1 };
      } else if (entry.level < this.cfg.maxLevel) {
        entry.level++;
        result = { char, isNew: false, level: entry.level };
      } else {
        s.tickets += 5;
        result = { char, isNew: false, level: entry.level, tickets: 5 };
      }
      this.record('fished', { id: char.id, isNew: result.isNew, level: result.level });
      if (this.data.chars.every(c => s.crew[c.id])) this.unlock('turma-completa');
      this.emit('fished', { id: char.id, isNew: result.isNew });
      return result;
    }

    // Rolês
    outingOpen(index) { return this.tierIndex() >= this.data.outings[index].tier; }
    outingState(index) {
      const entry = this.state.outings[index];
      if (!entry.char) return 'livre';
      return this.now() >= entry.endsAt ? 'pronto' : 'fora';
    }
    availableForOuting() { return this.data.chars.filter(char => this.hasChar(char.id) && this.awayOuting(char.id) < 0); }
    startOuting(index, charId) {
      const entry = this.state.outings[index];
      if (!entry || entry.char || !this.outingOpen(index) || !this.hasChar(charId) || this.awayOuting(charId) >= 0) return false;
      entry.char = charId;
      entry.endsAt = this.now() + this.data.outings[index].minutes * MINUTE;
      entry.announced = false;
      this.emit('outing-start', { index, id: charId });
      return true;
    }
    cancelOuting(index) {
      const entry = this.state.outings[index];
      if (!entry?.char || this.outingState(index) !== 'fora') return false;
      entry.char = null;
      entry.endsAt = 0;
      return true;
    }
    outingWood(index, charId) {
      const outing = this.data.outings[index];
      return Math.round(outing.wood * this.data.rarities[this.chars[charId].rarity].wood);
    }
    claimOuting(index) {
      const entry = this.state.outings[index];
      if (!entry?.char || this.outingState(index) !== 'pronto') return null;
      const outing = this.data.outings[index];
      const wood = this.outingWood(index, entry.char);
      this.state.wood += wood;
      let item = null;
      if (outing.item && !this.owned(outing.item) && this.rng() < outing.chance) {
        this.addItem(outing.item);
        item = this.items[outing.item];
      }
      const char = this.chars[entry.char];
      entry.char = null;
      entry.endsAt = 0;
      this.state.stats.outings++;
      this.record('outing', { id: char.id, wood });
      this.unlock('primeiro-role');
      return { wood, item, char };
    }

    // Fogueira
    bonfireTotal() { return BONFIRE.reduce((sum, id) => sum + this.state.bonfire[id], 0); }
    bonfireCost() { return this.cfg.bonfireBase + this.cfg.bonfireStep * this.bonfireTotal(); }
    bonfireValue(id, level = this.state.bonfire[id]) {
      const per = { labareda: this.cfg.flarePerLevel, brasa: this.cfg.emberPerLevel, calor: this.cfg.heatPerLevel }[id];
      return per * level;
    }
    legendary() { return this.bonfireTotal() >= this.cfg.legendary; }
    buyBonfire(id) {
      const s = this.state;
      const cost = this.bonfireCost();
      if (!BONFIRE.includes(id) || this.tierIndex() < 2 || s.wood < cost) return false;
      const wasLegendary = this.legendary();
      s.wood -= cost;
      s.bonfire[id]++;
      this.record('bonfire', { id, level: s.bonfire[id] });
      if (!wasLegendary && this.legendary()) {
        this.record('legendary');
        this.unlock('lendaria');
        this.emit('legendary');
      }
      return true;
    }

    // Correio elegante
    openLetter() {
      const s = this.state;
      if (s.mail.ready <= 0) return null;
      s.mail.ready--;
      if (!s.mail.nextAt) s.mail.nextAt = this.now() + this.letterInterval();
      const tickets = this.cfg.letterTickets + this.tierIndex();
      s.tickets += tickets;
      s.stats.letters++;
      this.record('letter', { tickets });
      if (s.stats.letters >= 10) this.unlock('correio');
      const letters = this.data.letters;
      const text = letters[(s.stats.letters * 7 + Math.floor(this.rng() * letters.length)) % letters.length];
      return { tickets, text };
    }

    // Pedidos e penetras
    requestReward() {
      return this.cheerPerSecond() * this.cfg.requestReward * (1 + this.effect('request'));
    }
    claimRequest() {
      const q = this.state.request;
      if (!q.active) return null;
      const reward = this.requestReward();
      const kind = q.active.kind;
      q.active = null;
      q.nextAt = 0;
      this.earn(reward);
      this.state.stats.requests++;
      this.record('request', { kind });
      if (this.state.stats.requests >= 25) this.unlock('atenciosa');
      return { reward, kind };
    }
    shooCrasher() {
      const c = this.state.crasher;
      if (!c.active) return null;
      c.active = null;
      c.nextAt = 0;
      const tickets = (this.cfg.crasherTickets + this.tierIndex()) * (this.isPlaced('cadeia') ? 2 : 1);
      this.state.tickets += tickets;
      this.state.stats.crashers++;
      this.record('crasher', { tickets });
      if (this.state.stats.crashers >= 10) this.unlock('seguranca');
      return { tickets };
    }

    // Argolas da Sorte: cada rodada dobra o preço da próxima, e cada espera sem jogar corta o preço pela metade.
    // Garrafas de Animação multiplicam a Animação que a festa já tem (×2 ou ×3); garrafas ×2 e ×3 multiplicam o que
    // a rodada render.
    ringThrows() { return this.cfg.ringThrows + (this.isPlaced('barraca-argolas') ? 1 : 0); }
    ringCost() { return this.state.rings.cost; }
    ringCooldown() { return this.cfg.ringCooldownMinutes * MINUTE * (1 - Math.min(0.6, this.effect('rings'))); }

    // Cada prêmio leva a folga da mira da sua garrafa: quanto melhor, mais certeira a argola precisa cair.
    ringPrize(kind, exclusives) {
      const tier = this.tierIndex();
      if (kind === 'lenha' && tier < 2) kind = 'fichas';
      if (kind === 'item' && !exclusives.length) kind = 'x2';
      const aim = this.cfg.ringAim[kind];
      if (kind === 'fichas') return { kind, aim, amount: 1 + Math.floor(this.rng() * 3) + tier };
      if (kind === 'animacao') return { kind, aim, factor: this.rng() < 0.25 ? 3 : 2 };
      if (kind === 'lenha') return { kind, aim, amount: 4 + Math.floor(this.rng() * 8) + tier * 2 };
      if (kind === 'item') return { kind, aim, id: exclusives[Math.floor(this.rng() * exclusives.length)].id };
      return { kind, aim, mult: kind === 'x3' ? 3 : 2 };
    }

    startRings() {
      const cost = this.ringCost();
      if (this.round || this.state.tickets < cost) return null;
      this.state.tickets -= cost;
      this.state.rings = { cost: cost * 2, nextAt: this.now() + this.ringCooldown() };
      const exclusives = this.data.items.filter(item => item.source === 'argolas' && !this.owned(item.id));
      const prizes = Array.from({ length: this.cfg.ringBottles }, () => {
        let roll = this.rng();
        for (const [kind, chance] of this.cfg.ringTable) {
          roll -= chance;
          if (roll < 0) return this.ringPrize(kind, exclusives);
        }
        return this.ringPrize('fichas', exclusives);
      });
      this.round = { prizes, total: this.ringThrows(), left: this.ringThrows(), hits: [] };
      this.state.stats.ringRounds++;
      return this.round;
    }

    ringHit(index) {
      const round = this.round;
      if (!round || round.left <= 0) return null;
      round.left--;
      if (!Number.isInteger(index) || index < 0 || index >= round.prizes.length || round.hits.includes(index)) {
        return { hit: false, left: round.left };
      }
      round.hits.push(index);
      this.state.stats.ringHits++;
      return { hit: true, prize: round.prizes[index], left: round.left };
    }

    finishRings() {
      const round = this.round;
      if (!round) return null;
      this.round = null;
      const got = round.hits.map(index => round.prizes[index]);
      const sum = kind => got.filter(prize => prize.kind === kind).reduce((total, prize) => total + (prize.amount || 0), 0);
      const mult = got.filter(prize => prize.mult).reduce((total, prize) => total * prize.mult, 1);
      const tickets = sum('fichas') * mult;
      // Duas garrafas de Animação se multiplicam (×2 e ×3 = ×6); o ×2/×3 da rodada multiplica o que elas renderam.
      const factor = got.filter(prize => prize.kind === 'animacao').reduce((total, prize) => total * prize.factor, 1);
      const cheer = factor > 1 ? this.state.cheer * (factor - 1) * mult : 0;
      const wood = sum('lenha') * mult;
      const items = got.filter(prize => prize.kind === 'item' && !this.owned(prize.id))
        .map(prize => { this.addItem(prize.id); return this.items[prize.id]; });
      this.state.tickets += tickets;
      this.state.wood += wood;
      if (cheer > 0) this.earn(cheer);
      if (round.total > 0 && round.hits.length === round.total) this.unlock('mao-boa');
      this.record('rings', { hits: round.hits.length, total: round.total, mult });
      if (got.some(prize => prize.kind === 'item')) this.unlock('mira-de-ouro');
      this.emit('rings', { hits: round.hits.length, mult });
      // cheerTimes: quantas vezes a Animação ficou maior (×2 com um ×3 da rodada vira ×4: ganha 3 vezes o que tinha).
      return { hits: round.hits.length, total: round.total, mult, tickets, cheer, wood, items,
        cheerTimes: factor > 1 ? 1 + (factor - 1) * mult : 1, empty: tickets + cheer + wood === 0 && !items.length };
    }

    rename(name) {
      const clean = String(name || '').trim().slice(0, 24);
      this.state.name = clean || 'Mandioca';
    }
  }

  return { GameEngine, STATS, BONFIRE, SLOTS, SAVE_VERSION };
});
