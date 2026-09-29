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
  const LOG_KEEP = new Set(['year', 'comeco', 'inicio', 'size', 'tier', 'achievement', 'item', 'legendary', 'fishing-open', 'grow',
    'learn']);
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
        cheer: 0, tickets: 0, wood: 0, fame: 0, size: 1, ticketLevel: 1, year: 1,
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
        balloon: { active: null, nextAt: 0 },
        pote: { active: null, nextAt: 0 },
        saco: { active: null, nextAt: 0 },
        leilao: { active: null, nextAt: 0 },
        hints: {},
        bingo: { round: null },
        setsWorn: [],
        daily: { day: null, streak: 0 },
        kissAt: 0,
        yearStart: 0,
        records: { maior: null, size: 1 },
        weather: { rain: null, rainbow: null, nextAt: 0, thunderAt: 0 },
        goals: [],
        quadrilha: { nextAt: 0 },
        rings: { cost: this.cfg.ringCost, nextAt: 0 },
        stats: { playtime: 0, steps: 0, cheerEarned: 0, cheerSpent: 0, fished: 0,
          outings: 0, letters: 0, requests: 0, crashers: 0, ringRounds: 0, ringHits: 0, pokes: 0, balloons: 0, rainbows: 0, upgrades: 0, goals: 0, weddings: 0, rice: 0, potes: 0, bingoCards: 0, bingos: 0, contests: 0, contestWins: 0, sacoRaces: 0, sacoWins: 0, leiloes: 0 },
        achievements: [],
        log: [{ t: 0, type: 'comeco' }],
        runtime: this.freshRuntime(),
        lastSeen: now
      };
    }

    freshRuntime() {
      return { stamina: this.stats.folego.base, dancing: true, lift: 0, flareWait: this.cfg.flareEvery,
        flareLeft: 0, emberLeft: 0, lastStep: 0, dance: 'forro', danceLeft: this.cfg.danceSteps, frenzyLeft: 0,
        pokeAt: 0, quadrilhaLeft: 0, callIn: 0, calls: 0, weddingLeft: 0, rice: 0, riceAt: 0 };
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
      s.year = Math.max(1, Math.floor(finite(s.year, 1)));
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
      s.hints = s.hints && typeof s.hints === 'object' ? { ...s.hints } : {};
      s.bingo = { round: this.cleanBingo(raw.bingo?.round) };
      s.kissAt = Math.max(0, finite(raw.kissAt));
      // A corrida de saco não volta no meio: a próxima continua agendada.
      s.saco = { active: null, nextAt: Math.max(0, finite(raw.saco?.nextAt)) };
      // Leilão no meio: o lance guardado volta para o bolso e o próximo leilão continua agendado.
      s.tickets += Math.max(0, Math.floor(finite(raw.leilao?.active?.held)));
      s.leilao = { active: null, nextAt: Math.max(0, finite(raw.leilao?.nextAt)) };
      s.yearStart = Math.max(0, finite(raw.yearStart));
      s.records = { maior: Number.isFinite(raw.records?.maior) ? raw.records.maior : null, size: Math.max(s.size, Math.floor(finite(raw.records?.size, 1))) };
      s.daily = { day: typeof raw.daily?.day === 'string' ? raw.daily.day : null, streak: clamp(Math.floor(finite(raw.daily?.streak)), 0, 999) };
      s.setsWorn = Array.isArray(raw.setsWorn) ? [...new Set(raw.setsWorn)].filter(id => this.data.sets.some(set => set.id === id)) : [];
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
        } else if (op === 'quadrilha' || op === 'concurso') {
          s.runtime.quadrilhaLeft = this.cfg.quadrilhaSeconds;
          s.runtime.callIn = 0;
          s.runtime.calls = 0;
          s.runtime.contest = op === 'concurso';
          this.emit('quadrilha', { bonus: this.quadrilhaBonus(), seconds: this.cfg.quadrilhaSeconds });
          note = 'Quadrilha marcada';
        } else if (op === 'bingo') {
          s.tickets += this.bingoCost();
          this.buyBingo();
          note = 'Cartela de bingo';
        } else if (op === 'pote') {
          s.pote.active = { born: now, until: now + this.cfg.poteSeconds * 1000, x: this.rng(), hits: 0, hitAt: 0 };
          this.emit('pote');
          note = 'Pote pendurado';
        } else if (op === 'saco') {
          this.startSaco(now);
          note = 'Corrida de saco';
        } else if (op === 'leilao') {
          if (!s.leilao.active) this.startLeilao(now);
          note = 'Leilão de prendas';
        } else if (op === 'casamento') {
          this.startWedding(true);
          note = 'Casamento na roça';
        } else if (op === 'metas') {
          s.goals.forEach(goal => { goal.from -= goal.target; });
          note = 'Metas cumpridas';
        } else if (op === 'chuva') {
          s.weather.rain = { born: now, until: now + this.cfg.rainSeconds * 1000 };
          s.weather.rainbow = null;
          note = 'Começou a chover';
        } else if (op === 'balao') {
          s.balloon.active = { born: now, until: now + this.cfg.balloonSeconds * 1000, x: this.rng() };
          note = 'Chegou um balão dourado';
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
      // Os eventos da festa com relógio de verdade também andam: balão, chuva e arco-íris, quadrilha, quebra-pote e corrida de saco.
      for (const clock of [s.balloon, s.pote, s.saco, s.leilao, s.quadrilha, s.weather]) clock.nextAt = back(clock.nextAt);
      s.weather.thunderAt = back(s.weather.thunderAt);
      for (const live of [s.balloon.active, s.pote.active, s.saco.active, s.weather.rain, s.weather.rainbow]) {
        if (live) { live.born -= ms; live.until -= ms; }
      }
      const race = s.saco.active;
      if (race) for (const key of ['start', 'at', 'fallUntil']) race[key] = back(race[key]);
      const auction = s.leilao.active;
      if (auction) for (const key of ['born', 'bidAt', 'rivalAt']) auction[key] = back(auction[key]);
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
        // Recorde: quanto tempo de festa este São João levou para virar o Maior do Mundo.
        if (index === this.data.tiers.length - 1) {
          const took = s.stats.playtime - (s.yearStart || 0);
          const best = s.records.maior;
          if (best === null || took < best) {
            s.records.maior = took;
            if (best !== null) this.emit('record', { kind: 'maior', seconds: took, before: best });
          }
        }
      }
      if (s.size > s.records.size) s.records.size = s.size;
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
      this.state.stats.upgrades++;
      this.recordMerged('level', stat, { from: level - 1, level }, () => ({ level }));
      this.emit('level-up', { stat });
      const stage = this.growthStage();
      if (stage > this.growthStage({ ...this.state.levels, [stat]: level - 1 })) {
        this.record('grow', { stage });
        this.emit('grow', { stage });
        if (stage >= this.cfg.growthAt.length) this.unlock('crescida');
      }
      return true;
    }

    // Metas da festa. O número que cada tipo acompanha, o alvo (que acompanha o poder da festa), a recompensa e o resgate.
    goalCounter(type) {
      const s = this.state;
      return { steps: s.stats.steps, guests: s.size, levels: s.stats.upgrades, pokes: s.stats.pokes, letters: s.stats.letters,
        fish: s.stats.fished, requests: s.stats.requests, rings: s.stats.ringRounds, outings: s.stats.outings,
        crashers: s.stats.crashers }[type] || 0;
    }
    goalTarget(type) {
      const tier = this.tierIndex();
      const size = this.state.size;
      const r = () => this.rng();
      switch (type) {
        case 'steps': return Math.max(30, Math.round(this.speed() * (240 + r() * 420) / 10) * 10);
        case 'guests': return Math.max(2, Math.round(size * (0.05 + r() * 0.05)));
        case 'levels': return 3 + Math.floor(this.growthTotal() / 40) + Math.floor(r() * 3);
        case 'pokes': return 10 + Math.floor(r() * 4) * 5;
        case 'letters': return 1 + Math.floor(r() * 2);
        case 'fish': return 1 + Math.floor(r() * 2);
        case 'requests': return 2 + Math.floor(r() * 3);
        case 'rings': return 1 + Math.floor(r() * 3);
        case 'outings': return 1 + Math.floor(r() * 2);
        case 'crashers': return 1 + Math.floor(r() * 2) + Math.floor(tier / 3);
        default: return 1;
      }
    }
    newGoal(taken = []) {
      const tier = this.tierIndex();
      const open = this.data.goals.filter(entry => entry.tier <= tier && !taken.includes(entry.id));
      const pool = open.length ? open : this.data.goals.filter(entry => entry.tier <= tier);
      const type = pool[Math.floor(this.rng() * pool.length)].id;
      const target = this.goalTarget(type);
      const tickets = 2 + tier + (target > 1 ? Math.min(3, Math.floor(Math.log2(target) / 2)) : 0);
      return { type, target, from: this.goalCounter(type), reward: { tickets, wood: tier >= 2 ? 1 + tier : 0 } };
    }
    updateGoals() {
      const s = this.state;
      while (s.goals.length < this.cfg.goalSlots) s.goals.push(this.newGoal(s.goals.map(goal => goal.type)));
      s.goals.forEach((goal, index) => {
        if (!goal.notified && this.goalProgress(goal) >= goal.target) {
          goal.notified = true;
          this.emit('goal-done', { index });
        }
      });
    }
    goalProgress(goal) { return Math.max(0, Math.min(goal.target, this.goalCounter(goal.type) - goal.from)); }
    claimGoal(index) {
      const s = this.state;
      const goal = s.goals[index];
      if (!goal || this.goalProgress(goal) < goal.target) return null;
      // O Amendoim, o ambulante, faz as metas renderem mais fichas.
      const reward = { ...goal.reward, tickets: Math.round(goal.reward.tickets * (1 + this.effect('goal'))) };
      s.tickets += reward.tickets;
      s.wood += reward.wood;
      s.stats.goals++;
      const others = s.goals.filter((_, i) => i !== index).map(entry => entry.type);
      s.goals[index] = this.newGoal([...others, goal.type]);
      this.record('goal', { type: goal.type, tickets: reward.tickets });
      if (s.stats.goals >= 10) this.unlock('metodica');
      return reward;
    }

    // Tamanho da Mandioca: 0 (broto) até growthAt.length (inteira), pela soma dos níveis dos quatro atributos.
    growthTotal(levels = this.state.levels) {
      return Object.values(levels).reduce((sum, level) => sum + level, 0);
    }
    growthStage(levels = this.state.levels) {
      const total = this.growthTotal(levels);
      return this.cfg.growthAt.filter(at => total >= at).length;
    }
    // Para o Painel: em que tamanho está, quantas melhorias já valem e qual o próximo marco (null no tamanho máximo).
    growthInfo() {
      const stage = this.growthStage();
      const total = this.growthTotal();
      const goal = this.cfg.growthAt[stage] ?? null;
      return { stage, total, goal, last: stage >= this.cfg.growthAt.length, bonus: this.cfg.growthBonus * stage };
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
        (1 + this.cfg.heatPerLevel * b.calor) * (1 + this.cfg.growthBonus * this.growthStage()) *
        (1 + this.danceBonus()) * (1 + this.setBonus()) * (1 + this.tradition()) * (1 + this.trioBonus()) * (1 + (this.specialDay()?.bonus || 0)) * (this.legendary() ? 2 : 1);
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
      this.updateGoals();
      if (!r.dayAnnounced && this.specialDay()) { r.dayAnnounced = true; this.emit('special-day', { id: this.specialDay().id, bonus: this.specialDay().bonus }); }
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
      if (r.frenzyLeft > 0) {
        r.frenzyLeft -= dt;
        if (r.frenzyLeft <= 0) { r.frenzyLeft = 0; this.emit('frenzy-end'); }
      }
      if (r.quadrilhaLeft > 0) {
        r.quadrilhaLeft -= dt;
        if ((r.callIn -= dt) <= 0 && r.quadrilhaLeft > 1.5) { r.callIn = this.cfg.callEvery; this.emit('quadrilha-call', { n: r.calls++ }); }
        if (r.quadrilhaLeft <= 0) {
          r.quadrilhaLeft = 0;
          this.emit('quadrilha-end');
          // Quadrilha de concurso: os jurados dão nota. Senão, às vezes tem casamento.
          if (r.contest) { r.contest = false; this.judgeContest(); }
          else if (this.rng() < this.cfg.weddingChance) this.startWedding();
        }
      }
      if (r.weddingLeft > 0) {
        r.weddingLeft -= dt;
        if (r.weddingLeft <= 0) this.endWedding();
      }
      const bingo = s.bingo.round;
      if (bingo && !bingo.result) {
        bingo.wait -= dt;
        while (bingo.wait <= 0 && !bingo.result) {
          bingo.wait += this.cfg.bingoEvery;
          this.drawBingo();
        }
      }
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
      if (r.frenzyLeft > 0) value *= this.cfg.frenzyMult;
      if (r.quadrilhaLeft > 0) value *= 1 + this.quadrilhaBonus();
      const cobra = this.effect('crit');
      const crit = cobra > 0 && this.rng() < cobra;
      if (crit) value *= this.cfg.cobraMult;
      this.earn(value);
      s.stats.steps++;
      r.lastStep = value;
      if (s.stats.steps === 1) this.unlock('primeiro-passo');
      this.emit('step', { value, crit });
      const learned = this.data.dances.find(dance => dance.at > 0 && dance.at === s.stats.steps);
      if (learned) {
        // Passo novo: entra no repertório e ela já mostra na hora.
        this.record('learn', { id: learned.id });
        this.emit('learn', { id: learned.id });
        if (this.learnedDances().length === this.data.dances.length) this.unlock('repertorio');
        this.setDance(learned.id);
      } else if (--r.danceLeft <= 0) this.nextDance();
    }

    // Repertório: os passos que ela já sabe (pelos passos dançados), o que rende cada um e a troca de passo.
    learnedDances() { return this.data.dances.filter(dance => this.state.stats.steps >= dance.at); }
    danceBonus() { return this.cfg.danceBonus * (this.learnedDances().length - 1); }
    setDance(id) {
      const r = this.state.runtime;
      r.dance = id;
      r.danceLeft = this.cfg.danceSteps;
      this.emit('dance', { id });
    }
    nextDance() {
      const known = this.learnedDances().filter(dance => dance.id !== this.state.runtime.dance);
      if (!known.length) { this.state.runtime.danceLeft = this.cfg.danceSteps; return; }
      this.setDance(known[Math.floor(this.rng() * known.length)].id);
    }

    flareDuration() { return this.cfg.flareFor * (1 + this.effect('flare')); }
    get flareActive() { return this.state.runtime.flareLeft > 0; }
    get emberActive() { return this.state.runtime.emberLeft > 0; }

    // Fichas e loja
    ticketCost() {
      const price = this.cfg.ticketBase + this.cfg.ticketStep * (this.state.ticketLevel - 1);
      return Math.max(1, Math.round(price * (1 - Math.min(0.7, this.effect('ticket')))));
    }
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
      const before = this.activeSet()?.id;
      if (item.cat === 'lado') {
        const slot = side === 'direita' ? 'direita' : 'esquerda';
        const other = slot === 'esquerda' ? 'direita' : 'esquerda';
        if (e[other] === id) e[other] = e[slot];
        e[slot] = id;
      } else e[item.cat] = id;
      this.emit('equip', { id });
      const set = this.activeSet();
      if (set && set.id !== before) {
        this.emit('set', { id: set.id, bonus: set.bonus });
        if (!this.state.setsWorn.includes(set.id)) this.state.setsWorn.push(set.id);
        if (this.state.setsWorn.length >= 5) this.unlock('estilista');
      }
      return true;
    }
    // Conjunto que está valendo: chapéu, mão e tecido vestidos juntos (null se nenhum).
    activeSet() {
      const e = this.state.equipped;
      return this.data.sets.find(set => e.chapeu === set.hat && e.mao === set.hand && e.tecido === set.fabric) || null;
    }
    setBonus() { return this.activeSet()?.bonus || 0; }

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
      this.checkDaily(now);
      // Dicas de uma vez só para quem ainda não achou uma parte do jogo.
      if (s.stats.playtime >= 1800) this.hint('music');
      if (s.inventory.length >= 5 && !this.activeSet()) this.hint('sets');
      if (tier >= this.cfg.poteMinTier) {
        const p = s.pote;
        if (p.active && now >= p.active.until) { p.active = null; this.emit('pote-gone'); }
        if (!p.active) {
          if (!p.nextAt) p.nextAt = now + this.between(this.cfg.poteEvery);
          if (now >= p.nextAt) {
            p.active = { born: now, until: now + this.cfg.poteSeconds * 1000, x: this.rng(), hits: 0, hitAt: 0 };
            p.nextAt = 0;
            this.emit('pote');
          }
        }
      }
      if (tier >= this.cfg.sacoMinTier) {
        const p = s.saco;
        if (p.active && now >= p.active.until) {
          // Ninguém deu a largada (ou o corredor não chegou a tempo): a turma desiste e a próxima fica agendada.
          const started = !!p.active.start;
          p.active = null;
          this.emit('saco-gone', { started });
        }
        if (!p.active) {
          if (!p.nextAt) p.nextAt = now + this.between(this.cfg.sacoEvery);
          if (now >= p.nextAt) this.startSaco(now);
        }
      }
      if (tier >= this.cfg.leilaoMinTier) {
        const p = s.leilao;
        const a = p.active;
        if (a && a.rivalAt && now >= a.rivalAt) {
          // A plateia cobre (ou abre, se ninguém deu lance), até o teto dela.
          a.rivalAt = 0;
          const bid = this.leilaoNext();
          if (bid <= a.max) {
            if (a.leader === 'voce') { s.tickets += a.held; a.held = 0; }
            a.price = bid;
            a.leader = 'plateia';
            a.bidAt = now;
            a.calls = 0;
            this.emit('leilao-bid', { who: 'plateia', price: bid });
          }
        }
        if (a && a.leader && now >= a.bidAt + (a.calls + 1) * this.cfg.leilaoCall * 1000) {
          // Ninguém cobriu: "dou-lhe uma, dou-lhe duas..." e, na terceira, vendido.
          a.calls++;
          if (a.calls < 3) this.emit('leilao-call', { n: a.calls, price: a.price, leader: a.leader });
          else this.sellLeilao();
        }
        if (!p.active) {
          if (!p.nextAt) p.nextAt = now + this.between(this.cfg.leilaoEvery);
          if (now >= p.nextAt) this.startLeilao(now);
        }
      }
      if (s.size >= this.cfg.balloonMin) {
        const b = s.balloon;
        if (b.active && now >= b.active.until) { b.active = null; this.emit('balloon-gone'); }
        if (!b.active) {
          if (!b.nextAt) b.nextAt = now + this.between(this.cfg.balloonEvery);
          if (now >= b.nextAt) {
            b.active = { born: now, until: now + this.cfg.balloonSeconds * 1000, x: this.rng() };
            b.nextAt = 0;
            this.emit('balloon');
          }
        }
      }
      if (tier >= 1) {
        const q = s.quadrilha;
        if (s.runtime.quadrilhaLeft <= 0) {
          if (!q.nextAt) q.nextAt = now + this.between(this.cfg.quadrilhaEvery);
          if (now >= q.nextAt) {
            s.runtime.quadrilhaLeft = this.cfg.quadrilhaSeconds;
            s.runtime.callIn = 0;
            s.runtime.calls = 0;
            s.runtime.contest = tier >= this.cfg.contestMinTier && this.rng() < this.cfg.contestChance;
            q.nextAt = 0;
            this.emit('quadrilha', { bonus: this.quadrilhaBonus(), seconds: this.cfg.quadrilhaSeconds, contest: s.runtime.contest });
          }
        }
      }
      // Chuva de São João: agenda, trovões durante a chuva e, quando ela para, o arco-íris com o pote de ouro.
      const w = s.weather;
      if (w.rain) {
        if (!w.thunderAt) w.thunderAt = now + 6000 + this.rng() * 14000;
        if (now >= w.thunderAt) { w.thunderAt = now + 8000 + this.rng() * 16000; this.emit('thunder'); }
        if (now >= w.rain.until) {
          w.rain = null;
          w.thunderAt = 0;
          w.rainbow = { born: now, until: now + this.cfg.rainbowSeconds * 1000, side: this.rng() < 0.5 ? 0 : 1 };
          this.emit('rain-end');
        }
      } else if (w.rainbow) {
        if (now >= w.rainbow.until) { w.rainbow = null; this.emit('rainbow-gone'); }
      } else if (s.size >= this.cfg.rainMin) {
        if (!w.nextAt) w.nextAt = now + this.between(this.cfg.rainEvery);
        if (now >= w.nextAt) {
          w.rain = { born: now, until: now + this.cfg.rainSeconds * 1000 };
          w.nextAt = 0;
          this.emit('rain');
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
      this.emit('crasher-caught', { tickets, jailed: this.isPlaced('cadeia') });
      return { tickets };
    }

    // Dica que aparece uma vez só por save (o aviso sai no `hint`).
    hint(id) {
      if (this.state.hints[id]) return false;
      // Uma dica de cada vez: a próxima só depois de uns 90 s de festa (não chegam todas juntas ao abrir um save antigo).
      const now = this.state.stats.playtime;
      if (this.hintAt !== undefined && now - this.hintAt < 90) return false;
      this.hintAt = now;
      this.state.hints[id] = true;
      this.emit('hint', { id });
      return true;
    }

    // Visita do dia: na primeira vez de cada dia (pelo relógio do computador), um presentinho em fichas, maior a cada dia
    // seguido de visita. Pular um dia recomeça a sequência.
    checkDaily(now = this.now()) {
      const s = this.state;
      const date = new Date(now);
      const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (s.daily.day === day) return null;
      const yesterday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
      const before = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      const streak = s.daily.day === before ? s.daily.streak + 1 : 1;
      const tickets = this.cfg.dailyBase + this.cfg.dailyStep * (Math.min(streak, this.cfg.dailyMax) - 1);
      s.daily = { day, streak };
      s.tickets += tickets;
      this.record('daily', { streak, tickets });
      this.emit('daily', { streak, tickets });
      return { streak, tickets };
    }

    // --- São João do ano que vem ---------------------------------------------------------------------------------
    // Quanto falta para as conquistas de contar (para o Painel): [agora, meta], ou null para as de uma vez só. Os números são
    // os mesmos dos `unlock` espalhados pelo motor.
    achievementProgress(id) {
      const s = this.state;
      const st = s.stats;
      const bonfire = this.bonfireTotal();
      const tier = this.data.tiers.find(entry => entry.id === id);
      const table = {
        mil: [st.cheerEarned, 1000], crescida: [this.growthStage(), this.cfg.growthAt.length],
        repertorio: [this.learnedDances().length, this.data.dances.length], 'balao-de-sorte': [st.balloons, 10],
        dengosa: [st.pokes, 100], 'arco-iris': [st.rainbows, 5], metodica: [st.goals, 10], madrinha: [st.weddings, 5],
        bingo: [st.bingos, 3], 'quebra-pote': [st.potes, 5], canguru: [st.sacoWins, 5], 'dou-lhe-tres': [st.leiloes, 3], estilista: [s.setsWorn.length, 5],
        'turma-completa': [this.data.chars.filter(c => s.crew[c.id]).length, this.data.chars.length],
        lendaria: [bonfire, this.cfg.legendary], estiloso: [s.inventory.length, 15], correio: [st.letters, 10],
        atenciosa: [st.requests, 25], seguranca: [st.crashers, 10]
      };
      const entry = tier ? [s.size, tier.size] : table[id];
      return entry ? [Math.min(entry[0], entry[1]), entry[1]] : null;
    }

    // Mandioca lendária: do tamanho máximo, com todos os passos de dança e a fogueira lendária (só enfeite: ela brilha).
    goldenHost() {
      return this.growthStage() >= this.cfg.growthAt.length && this.learnedDances().length === this.data.dances.length && this.legendary();
    }

    // Barraca do Beijo: um beijinho (clique) rende ficha, um a cada kissMinutes. `ready` diz se esse valeu ficha.
    kiss() {
      const s = this.state;
      if (!this.isPlaced('barraca-beijo')) return { ready: false };
      const now = this.now();
      const wait = s.kissAt + this.cfg.kissMinutes * 60000 - now;
      if (wait > 0) return { ready: false, wait };
      s.kissAt = now;
      s.tickets += this.cfg.kissTickets;
      return { ready: true, tickets: this.cfg.kissTickets };
    }

    // Concurso de quadrilha: cada jurado parte de 7 e soma a marcadora (Pamonha), o conjunto que a Mandioca veste, a pista
    // cheia de pares e o repertório; mais um tantinho de sorte. A média decide o lugar e o prêmio.
    contestScore() {
      const pairs = Math.min(1, (this.state.size - 1) / 60);
      const base = 7 + (this.charActive('pamonha') ? 0.6 : 0) + this.setBonus() * 12 + pairs * 0.8 +
        this.learnedDances().length / this.data.dances.length * 0.6 + Math.min(0.4, this.tradition());
      return Math.min(10, base);
    }
    judgeContest() {
      const s = this.state;
      const base = this.contestScore();
      const notes = [0, 1, 2].map(() => Math.max(5, Math.min(10, Math.round((base + (this.rng() - 0.5) * 1.2) * 2) / 2)));
      const average = notes.reduce((a, b) => a + b, 0) / notes.length;
      const place = average >= this.cfg.contestFirst ? 1 : average >= this.cfg.contestSecond ? 2 : 3;
      const tickets = [0, 6, 3, 1][place] + this.tierIndex();
      const amount = Math.max(60, this.cheerPerSecond() * [0, 180, 90, 30][place]);
      s.tickets += tickets;
      this.earn(amount);
      s.stats.contests++;
      if (place === 1) s.stats.contestWins++;
      this.record('contest', { place, average, tickets, amount });
      this.emit('contest', { notes, average, place, tickets, amount });
      return { notes, average, place, tickets, amount };
    }

    // Trio pé-de-serra: Cenoura (sanfona), Inhame (zabumba) e Batata-Doce (triângulo), os três no palco.
    trioComplete() { return ['cenoura', 'inhame', 'batata'].every(id => this.charActive(id)); }
    trioBonus() { return this.trioComplete() ? this.cfg.trioBonus : 0; }

    // Tradição: quanto a festa rende a mais pelos São Joões já encerrados.
    tradition() { return this.cfg.yearBonus * ((this.state.year || 1) - 1); }
    canNewYear() { return this.tierIndex() >= this.data.tiers.length - 1; }

    // Encerra este São João e começa o do ano que vem, de volta ao quintal. Fica o que é da pessoa (turma, roupas e
    // barracas, fichas, conquistas, números, diário, passos aprendidos); o resto da festa recomeça, e a Mandioca é
    // replantada (volta a broto, porque as melhorias recomeçam).
    newYear() {
      if (!this.canNewYear()) return false;
      const old = this.state;
      const next = this.fresh();
      for (const key of ['seed', 'name', 'tickets', 'inventory', 'crew', 'achievements', 'stats', 'log', 'hints', 'setsWorn', 'mail', 'daily', 'records']) {
        next[key] = old[key];
      }
      next.year = (old.year || 1) + 1;
      next.yearStart = old.stats.playtime;
      // Cartela de bingo no meio da rodada: o preço volta (a rodada acaba com a festa). O lance guardado do leilão também.
      if (old.bingo?.round && !old.bingo.round.result) next.tickets += old.bingo.round.cost;
      if (old.leilao?.active?.held) next.tickets += old.leilao.active.held;
      const equipped = { ...old.equipped };
      // Barraca que ainda não abriu no quintal volta a ser o enfeite de sempre.
      for (const side of ['esquerda', 'direita']) {
        if ((this.items[equipped[side]]?.tier || 0) > 0) equipped[side] = this.data.equipped[side];
      }
      if (equipped.esquerda === equipped.direita) equipped.direita = this.data.equipped.direita;
      next.equipped = equipped;
      this.state = next;
      next.runtime.stamina = this.maxStamina();
      this.record('year', { year: next.year, bonus: this.tradition() });
      this.unlock('ano-que-vem');
      this.emit('new-year', { year: next.year, bonus: this.tradition() });
      return true;
    }

    // --- Bingo da quermesse ---------------------------------------------------------------------------------------
    bingoCost() { return this.cfg.bingoCost + this.tierIndex(); }
    bingoOpen() { return this.tierIndex() >= this.cfg.bingoMinTier; }

    // Uma rodada salva que não faça sentido (save antigo ou mexido) vira nenhuma rodada.
    cleanBingo(round) {
      if (!round || !Array.isArray(round.card) || round.card.length !== 9 || !Array.isArray(round.drawn)) return null;
      const card = round.card.map(n => Math.floor(finite(n)));
      if (card.some((n, i) => (i === 4 ? n !== 0 : n < 1 || n > this.cfg.bingoMax))) return null;
      return { card, drawn: round.drawn.filter(n => Number.isInteger(n) && n >= 1 && n <= this.cfg.bingoMax),
        wait: clamp(finite(round.wait, this.cfg.bingoEvery), 0, this.cfg.bingoEvery),
        rival: clamp(Math.floor(finite(round.rival, this.cfg.bingoRival[1])), 1, this.cfg.bingoRival[1]),
        line: round.line === true, result: ['bingo', 'rival'].includes(round.result) ? round.result : null,
        cost: Math.max(0, Math.floor(finite(round.cost))), prize: round.prize && typeof round.prize === 'object' ? { ...round.prize } : null };
    }

    // Compra uma cartela nova: 8 números sorteados (o meio é livre) e o sorteio em que a plateia vai gritar BINGO.
    buyBingo() {
      const s = this.state;
      const round = s.bingo.round;
      if (!this.bingoOpen() || (round && !round.result)) return false;
      const cost = this.bingoCost();
      if (s.tickets < cost) return false;
      s.tickets -= cost;
      const pool = Array.from({ length: this.cfg.bingoMax }, (_, i) => i + 1);
      const picked = [];
      for (let i = 0; i < 8; i++) picked.push(pool.splice(Math.floor(this.rng() * pool.length), 1)[0]);
      picked.sort((a, b) => a - b);
      const [lo, hi] = this.cfg.bingoRival;
      s.bingo.round = { card: [...picked.slice(0, 4), 0, ...picked.slice(4)], drawn: [], wait: this.cfg.bingoEvery,
        rival: lo + Math.floor(this.rng() * (hi - lo + 1)), line: false, result: null, cost, prize: null };
      s.stats.bingoCards++;
      this.emit('bingo-start', { cost });
      return true;
    }

    // Quantas casas da cartela já estão marcadas (o meio conta) e se uma linha, coluna ou diagonal fechou.
    bingoMarks(round = this.state.bingo.round) {
      if (!round) return { marked: [], count: 0, line: false, full: false };
      const drawn = new Set(round.drawn);
      const marked = round.card.map(n => n === 0 || drawn.has(n));
      const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
      return { marked, count: marked.filter(Boolean).length, line: lines.some(line => line.every(i => marked[i])),
        full: marked.every(Boolean) };
    }

    // O locutor sorteia o próximo número: marca a cartela, paga a primeira linha e vê se deu BINGO (ou se a plateia ganhou).
    drawBingo() {
      const s = this.state;
      const round = s.bingo.round;
      if (!round || round.result) return null;
      const left = [];
      for (let n = 1; n <= this.cfg.bingoMax; n++) if (!round.drawn.includes(n)) left.push(n);
      if (!left.length) { round.result = 'rival'; return null; }
      const n = left[Math.floor(this.rng() * left.length)];
      round.drawn.push(n);
      const marks = this.bingoMarks(round);
      this.emit('bingo-number', { n, mine: round.card.includes(n), count: marks.count });
      if (!round.line && marks.line) {
        round.line = true;
        const tickets = Math.ceil(round.cost / 2);
        s.tickets += tickets;
        this.emit('bingo-line', { tickets });
      }
      if (marks.full) {
        const tickets = round.cost * this.cfg.bingoPrize;
        const amount = Math.max(60, this.cheerPerSecond() * this.cfg.bingoCheer);
        s.tickets += tickets;
        this.earn(amount);
        s.stats.bingos++;
        if (s.stats.bingos >= 3) this.unlock('bingo');
        round.result = 'bingo';
        round.prize = { tickets, amount };
        this.record('bingo', { draws: round.drawn.length, tickets, amount });
        this.emit('bingo-win', { tickets, amount, draws: round.drawn.length });
      } else if (round.drawn.length >= round.rival) {
        round.result = 'rival';
        this.record('bingo-lost', { draws: round.drawn.length });
        this.emit('bingo-lost', { draws: round.drawn.length, count: marks.count });
      }
      return n;
    }

    // Quebra-pote: uma paulada no pote pendurado (no máximo uma a cada poteCooldown segundos). Com poteHits pauladas ele
    // quebra e dá Animação e fichas. `ready` diz se a paulada contou.
    hitPote() {
      const a = this.state.pote.active;
      if (!a) return { ready: false, active: false };
      const now = this.now();
      if (now - a.hitAt < this.cfg.poteCooldown * 1000) return { ready: false, active: true, hits: a.hits };
      a.hitAt = now;
      a.hits++;
      this.emit('pote-hit', { hits: a.hits, of: this.cfg.poteHits });
      if (a.hits < this.cfg.poteHits) return { ready: true, active: true, hits: a.hits };
      const s = this.state;
      s.pote.active = null;
      s.pote.nextAt = 0;
      const amount = Math.max(100, this.cheerPerSecond() * this.cfg.poteCheer);
      const tickets = 2 + this.tierIndex();
      this.earn(amount);
      s.tickets += tickets;
      s.stats.potes++;
      if (s.stats.potes >= 5) this.unlock('quebra-pote');
      this.record('pote', { amount, tickets });
      this.emit('pote-break', { amount, tickets });
      return { ready: true, active: true, broke: true, amount, tickets };
    }

    // Corrida de saco: três crianças de saco na linha de largada. O primeiro clique no corredor do jogador (o da listra
    // vermelha) é a largada; os outros dois vão sozinhos, cada um no seu tempo (sacoRival). Cada clique é um pulo, mas no
    // ritmo: pulo a menos de sacoRhythm s do anterior dá tombo, e caído ele perde sacoFall s. Com sacoHops pulos ele cruza a
    // chegada, e o lugar decide o prêmio.
    startSaco(now = this.now()) {
      const s = this.state;
      const [low, high] = this.cfg.sacoRival;
      const rivals = [0, 1].map(() => Math.round((low + this.rng() * (high - low)) * 1000));
      s.saco.active = { born: now, until: now + this.cfg.sacoWait * 1000, start: 0, hops: 0, at: 0, fallUntil: 0, falls: 0, rivals };
      s.saco.nextAt = 0;
      this.emit('saco', { hops: this.cfg.sacoHops });
    }

    hopSaco() {
      const s = this.state;
      const a = s.saco.active;
      if (!a) return { active: false };
      const now = this.now();
      if (!a.start) {
        a.start = now;
        a.until = now + this.cfg.sacoLimit * 1000;
        this.emit('saco-go');
      }
      if (now < a.fallUntil) return { active: true, down: true, hops: a.hops };
      if (a.at && now - a.at < this.cfg.sacoRhythm * 1000) {
        a.at = now;
        a.fallUntil = now + this.cfg.sacoFall * 1000;
        a.falls++;
        this.emit('saco-fall', { hops: a.hops });
        return { active: true, fell: true, hops: a.hops };
      }
      a.at = now;
      a.hops++;
      if (a.hops < this.cfg.sacoHops) {
        this.emit('saco-hop', { hops: a.hops, of: this.cfg.sacoHops });
        return { active: true, hops: a.hops };
      }
      // Cruzou a chegada: o lugar é um a mais que os rivais que já tinham chegado.
      const place = 1 + a.rivals.filter(ms => a.start + ms <= now).length;
      const share = [1, 0.4, 0.15][place - 1];
      const amount = Math.max(place === 1 ? 100 : 20, this.cheerPerSecond() * this.cfg.sacoCheer * share);
      const tickets = place === 1 ? 2 + this.tierIndex() + (a.falls ? 0 : 1) : place === 2 ? 1 : 0;
      s.saco.active = null;
      s.saco.nextAt = 0;
      this.earn(amount);
      s.tickets += tickets;
      s.stats.sacoRaces++;
      if (place === 1) {
        s.stats.sacoWins++;
        if (s.stats.sacoWins >= 5) this.unlock('canguru');
      }
      const seconds = (now - a.start) / 1000;
      this.record('saco', { place, amount, tickets, seconds });
      this.emit('saco-end', { place, amount, tickets, falls: a.falls, seconds });
      return { active: true, done: true, place, amount, tickets, falls: a.falls, seconds };
    }

    // Leilão de prendas: o leiloeiro sobe no palco com uma prenda (um item que só sai no leilão; com todos na mão, uns
    // minutos de Animação). Cada clique nele é um lance de uma ficha a mais (o primeiro é o lance inicial); as fichas do
    // lance ficam guardadas até alguém cobrir. A plateia cobre depois de uns segundos, até um teto sorteado. Sem lance novo,
    // o leiloeiro conta até três e vende para quem deu o último.
    startLeilao(now = this.now()) {
      const s = this.state;
      const open = this.data.items.filter(item => item.source === 'leilao' && !this.owned(item.id));
      const item = open.length ? open[Math.floor(this.rng() * open.length)] : null;
      const prize = item ? { item: item.id } : { cheer: Math.max(200, this.cheerPerSecond() * this.cfg.leilaoCheer) };
      const base = this.cfg.leilaoBase + this.tierIndex();
      const [low, high] = this.cfg.leilaoMax;
      s.leilao.active = { born: now, prize, base, price: 0, leader: null, held: 0, bidAt: now, calls: 0,
        max: Math.round(base * (low + this.rng() * (high - low))), rivalAt: now + this.cfg.leilaoWait * 1000 };
      s.leilao.nextAt = 0;
      this.emit('leilao', { prize, price: base });
    }

    // Quanto vale o próximo lance.
    leilaoNext() {
      const a = this.state.leilao.active;
      return a ? (a.leader ? a.price + 1 : a.base) : 0;
    }

    bidLeilao() {
      const s = this.state;
      const a = s.leilao.active;
      if (!a) return { active: false };
      if (a.leader === 'voce') return { active: true, leading: true, price: a.price };
      const bid = this.leilaoNext();
      if (s.tickets < bid) return { active: true, broke: true, bid };
      const now = this.now();
      s.tickets -= bid;
      a.held = bid;
      a.price = bid;
      a.leader = 'voce';
      a.bidAt = now;
      a.calls = 0;
      a.rivalAt = bid + 1 <= a.max ? now + this.between(this.cfg.leilaoRival) : 0;
      this.emit('leilao-bid', { who: 'voce', price: bid });
      return { active: true, bid };
    }

    sellLeilao() {
      const s = this.state;
      const a = s.leilao.active;
      if (!a) return null;
      s.leilao.active = null;
      s.leilao.nextAt = 0;
      if (a.leader !== 'voce') {
        this.emit('leilao-sold', { winner: a.leader || null, price: a.price, prize: a.prize });
        return { winner: a.leader };
      }
      // As fichas do lance já estavam guardadas: agora são do leiloeiro.
      if (a.prize.item) this.addItem(a.prize.item);
      else this.earn(a.prize.cheer);
      s.stats.leiloes++;
      if (s.stats.leiloes >= 3) this.unlock('dou-lhe-tres');
      this.record('leilao', { price: a.price, item: a.prize.item || null, amount: a.prize.cheer || 0 });
      this.emit('leilao-sold', { winner: 'voce', price: a.price, prize: a.prize });
      return { winner: 'voce', price: a.price, prize: a.prize };
    }

    // Balão de sorte: um prêmio sorteado para quem pegou o balão dourado (frenesi, Animação, fichas ou lenha).
    claimBalloon() {
      const s = this.state;
      const b = s.balloon;
      if (!b.active) return null;
      b.active = null;
      b.nextAt = 0;
      s.stats.balloons++;
      const roll = this.rng();
      const tier = this.tierIndex();
      let result;
      if (roll < 0.35) {
        s.runtime.frenzyLeft = this.cfg.frenzySeconds;
        result = { kind: 'frenzy', mult: this.cfg.frenzyMult, seconds: this.cfg.frenzySeconds };
        this.emit('frenzy-start', result);
      } else if (roll < 0.7) {
        const amount = Math.max(50, this.cheerPerSecond() * this.cfg.balloonCheer);
        this.earn(amount);
        result = { kind: 'cheer', amount };
      } else if (roll < 0.9) {
        const amount = 2 + tier + Math.floor(s.size / 40);
        s.tickets += amount;
        result = { kind: 'tickets', amount };
      } else {
        const amount = 2 + tier * 2;
        s.wood += amount;
        result = { kind: 'wood', amount };
      }
      this.record('balloon', result);
      if (s.stats.balloons >= 10) this.unlock('balao-de-sorte');
      return result;
    }

    // Dia de Santo Antônio (13/06), São João (24/06) ou São Pedro (29/06) no relógio do computador: a festa rende mais.
    // O dia é conferido de hora em hora, não a cada passo.
    specialDay() {
      const hour = Math.floor(this.now() / 3600000);
      if (this.dayCache?.hour !== hour) {
        const date = new Date(this.now());
        this.dayCache = { hour, day: this.cfg.specialDays.find(entry => entry.month === date.getMonth() + 1 && entry.day === date.getDate()) || null };
      }
      return this.dayCache.day;
    }

    // Casamento na roça: os noivos e o padre entram na pista e o jogador joga arroz neles (clique). Só da Festa da Cidade
    // em diante, que tem pista para eles; `force` (botão de teste) ignora isso.
    startWedding(force = false) {
      const r = this.state.runtime;
      if (r.weddingLeft > 0 || (!force && this.tierIndex() < this.cfg.weddingMinTier)) return false;
      r.weddingLeft = this.cfg.weddingSeconds;
      r.rice = 0;
      r.riceAt = 0;
      this.emit('wedding', { seconds: this.cfg.weddingSeconds, rice: this.cfg.weddingRice });
      return true;
    }

    // Um punhado de arroz nos noivos: no máximo um a cada riceCooldown segundos. `ready` diz se o grão contou.
    throwRice() {
      const r = this.state.runtime;
      if (r.weddingLeft <= 0) return { ready: false, active: false };
      const now = this.now();
      if (now - r.riceAt < this.cfg.riceCooldown * 1000) return { ready: false, active: true, n: r.rice };
      r.riceAt = now;
      r.rice++;
      this.state.stats.rice++;
      this.emit('rice', { n: r.rice, of: this.cfg.weddingRice });
      return { ready: true, active: true, n: r.rice };
    }

    // O presente dos noivos ao fim da cerimônia: Animação e fichas, mais quanto mais arroz jogaram.
    endWedding() {
      const s = this.state;
      const r = s.runtime;
      r.weddingLeft = 0;
      const rice = r.rice;
      const share = Math.min(1, rice / this.cfg.weddingRice);
      const amount = Math.max(60, this.cheerPerSecond() * this.cfg.weddingCheer) * (0.4 + 0.6 * share);
      const tickets = 1 + Math.floor(share * (2 + this.tierIndex()));
      this.earn(amount);
      s.tickets += tickets;
      s.stats.weddings++;
      r.rice = 0;
      // Chuva de arroz de verdade: os noivos deixam uma peça de casamento (véu, cartola, buquê) que ainda falta.
      const gift = share >= this.cfg.weddingGiftShare ? this.data.items.find(item => item.source === 'casamento' && !this.owned(item.id)) : null;
      if (gift) this.addItem(gift.id);
      this.record('wedding', { rice, amount, tickets, item: gift?.id });
      this.emit('wedding-end', { rice, amount, tickets, share, item: gift?.id || null });
      if (s.stats.weddings >= 5) this.unlock('madrinha');
      return { rice, amount, tickets, item: gift?.id || null };
    }

    // Quadrilha marcada: quanto a festa rende a mais enquanto ela dura.
    quadrilhaBonus() { return this.cfg.quadrilhaBonus * (this.charActive('pamonha') ? 2 : 1); }

    // O pote de ouro no pé do arco-íris: Animação de alguns minutos e fichas.
    claimRainbow() {
      const s = this.state;
      const w = s.weather;
      if (!w.rainbow) return null;
      w.rainbow = null;
      w.nextAt = 0;
      const amount = Math.max(100, this.cheerPerSecond() * this.cfg.rainbowCheer);
      const tickets = 3 + this.tierIndex();
      this.earn(amount);
      s.tickets += tickets;
      s.stats.rainbows++;
      this.record('rainbow', { amount, tickets });
      if (s.stats.rainbows >= 5) this.unlock('arco-iris');
      return { amount, tickets };
    }

    // Carinho na Mandioca (clique): rende alguns passos de uma vez, com um tempo entre um carinho e outro.
    pokeHost() {
      const s = this.state;
      const r = s.runtime;
      const now = this.now();
      const ready = now >= r.pokeAt;
      let value = 0;
      if (ready) {
        r.pokeAt = now + this.cfg.pokeCooldown * 1000;
        value = this.stepValue() * this.cfg.pokeSteps;
        this.earn(value);
        s.stats.pokes++;
        if (s.stats.pokes >= 100) this.unlock('dengosa');
      }
      this.emit('poke', { value });
      return { ready, value };
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
