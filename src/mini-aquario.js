(function (root, factory) {
  const Minis = typeof module === 'object' && module.exports ? require('./minis.js') : root.ArraiaMinis;
  factory(Minis);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Minis) {
  'use strict';

  // Aquário: o tanque da pescaria. Cada prenda fisgada solta um peixe; ração faz crescer; peixe grande solta bolhas douradas
  // (Animação). Configuração em `data.minis.aquario`.
  Minis.define('aquario', (engine, tools) => {
    const { clamp, finite, int } = tools;
    const stageOf = (growth, c) => (growth >= c.growth[1] ? 2 : growth >= c.growth[0] ? 1 : 0);
    const bubbleInterval = (adults, c) => Math.max(60, c.bubbleEvery / adults) * 1000;
    const fishInfo = (fish, c) => ({ id: fish.id, species: fish.species, stage: fish.stage, growth: fish.growth,
      next: fish.stage === 0 ? c.growth[0] : fish.stage === 1 ? c.growth[1] : null });

    function rollSpecies() {
      const c = tools.cfg();
      let roll = tools.rng();
      let rarity = c.rarityChance.length - 1;
      for (let i = 0; i < c.rarityChance.length; i++) {
        roll -= c.rarityChance[i];
        if (roll < 0) { rarity = i; break; }
      }
      const pool = c.species.filter(entry => entry.rarity === rarity);
      return (pool.length ? tools.pick(pool) : tools.pick(c.species)).id;
    }

    // Espécie vista pela primeira vez: fichas (os peixes de saída só entram na coleção, sem prêmio).
    function discover(species, quiet = false) {
      const s = tools.state();
      const c = tools.cfg();
      if (s.seen.includes(species)) return null;
      s.seen.push(species);
      if (quiet) return null;
      const reward = tools.reward({ tickets: c.discoverTickets });
      tools.emit('discover', { species, reward, count: s.seen.length });
      if (s.seen.length >= c.species.length && !s.complete) {
        s.complete = true;
        tools.emit('complete', { reward: tools.reward(c.completeReward) });
      }
      return reward;
    }

    return {
      fresh() {
        return { fish: [], seen: [], food: tools.cfg().foodMax, foodAt: tools.now(), bubbles: 0, bubbleAt: tools.now(), nextId: 1, fed: 0,
          popped: 0, complete: false, started: false };
      },

      load(raw) {
        const c = tools.cfg();
        const now = tools.now();
        const base = this.fresh();
        if (!raw) return base;
        const known = new Set(c.species.map(entry => entry.id));
        const fish = [];
        let nextId = 1;
        for (const entry of Array.isArray(raw.fish) ? raw.fish : []) {
          if (!tools.object(entry) || !known.has(entry.species) || fish.length >= c.tankMax) continue;
          const growth = int(entry.growth, 0, c.growth[1], 0);
          fish.push({ id: nextId++, species: entry.species, growth, stage: stageOf(growth, c) });
        }
        const seen = [...new Set((Array.isArray(raw.seen) ? raw.seen : []).filter(id => known.has(id)))];
        for (const entry of fish) if (!seen.includes(entry.species)) seen.push(entry.species);
        return { fish, seen, food: int(raw.food, 0, c.foodMax, c.foodMax), foodAt: clamp(finite(raw.foodAt, now), 0, now),
          bubbles: int(raw.bubbles, 0, c.bubbleMax, 0), bubbleAt: clamp(finite(raw.bubbleAt, now), 0, now), nextId,
          fed: int(raw.fed, 0, 1e9, 0), popped: int(raw.popped, 0, 1e9, 0), complete: raw.complete === true && seen.length >= c.species.length,
          started: raw.started === true };
      },

      // A janela acabou de abrir (ou o save é de antes dela): o tanque começa com uns peixinhos.
      opened() { this.start(); },
      start() {
        const s = tools.state();
        if (s.started) return;
        s.started = true;
        for (let i = 0; i < tools.cfg().starter; i++) this.addFish(null, true);
      },

      // Ração e bolhas voltam com o tempo (também com o jogo fechado).
      tick() {
        const s = tools.state();
        const c = tools.cfg();
        const now = tools.now();
        if (!s.started) this.start();
        if (s.food >= c.foodMax) s.foodAt = now;
        else {
          const n = Math.floor((now - s.foodAt) / (c.foodEvery * 1000));
          if (n > 0) {
            s.food = Math.min(c.foodMax, s.food + n);
            s.foodAt = s.food >= c.foodMax ? now : s.foodAt + n * c.foodEvery * 1000;
          }
        }
        const adults = s.fish.filter(entry => entry.stage === 2).length;
        if (!adults || s.bubbles >= c.bubbleMax) { s.bubbleAt = now; return; }
        const every = bubbleInterval(adults, c);
        const n = Math.floor((now - s.bubbleAt) / every);
        if (n > 0) {
          s.bubbles = Math.min(c.bubbleMax, s.bubbles + n);
          s.bubbleAt = s.bubbles >= c.bubbleMax ? now : s.bubbleAt + n * every;
          tools.emit('bubble', { n: s.bubbles });
        }
      },

      // `engine.advance`: o tempo passou de uma vez, os relógios andam para trás.
      shift(ms) {
        const s = tools.state();
        s.foodAt -= ms;
        s.bubbleAt -= ms;
      },

      // O tanque para desenhar.
      info() {
        const s = tools.state();
        const c = tools.cfg();
        if (!s.started) this.start();
        return { fish: s.fish.map(entry => fishInfo(entry, c)), food: s.food, foodMax: c.foodMax, bubbles: s.bubbles, bubbleMax: c.bubbleMax,
          seen: s.seen.slice(), total: c.species.length, tankMax: c.tankMax, adults: s.fish.filter(entry => entry.stage === 2).length,
          complete: s.complete };
      },

      // Peixe novo (da pescaria ou da abertura): espécie sorteada ou escolhida. Tanque cheio: o peixe vira uma ficha.
      addFish(species = null, quiet = false) {
        const s = tools.state();
        const c = tools.cfg();
        const id = species || rollSpecies();
        const discovery = discover(id, quiet);
        if (s.fish.length >= c.tankMax) {
          const reward = tools.reward({ tickets: 1 });
          reward.tickets += discovery?.tickets || 0;
          if (!quiet) tools.emit('tank-full', { species: id, isNew: !!discovery, reward });
          return { ok: false, full: true, isNew: !!discovery, reward };
        }
        const fish = { id: s.nextId++, species: id, growth: 0, stage: 0 };
        s.fish.push(fish);
        if (!quiet) tools.emit('new-fish', { species: id, isNew: !!discovery, id: fish.id });
        return { ok: true, fish: fishInfo(fish, c), isNew: !!discovery, reward: discovery };
      },

      // Jogar ração: gasta uma e alimenta o peixe que está mais perto de crescer (o que já comeu mais; se empatar, o mais antigo),
      // assim cada peixe cresce depressa em vez de todos devagar. Sem peixe para crescer, não gasta.
      drop() {
        this.tick();
        const s = tools.state();
        const c = tools.cfg();
        const now = tools.now();
        if (s.food <= 0) return { ok: false, reason: 'food' };
        const hungry = s.fish.filter(entry => entry.stage < 2).sort((p, q) => q.growth - p.growth || p.id - q.id)[0];
        if (!hungry) return { ok: false, reason: 'grown' };
        if (s.food >= c.foodMax) s.foodAt = now;
        s.food--;
        s.fed++;
        hungry.growth++;
        const before = hungry.stage;
        const adults = s.fish.filter(entry => entry.stage === 2).length;
        hungry.stage = stageOf(hungry.growth, c);
        const grew = hungry.stage > before;
        if (grew && hungry.stage === 2) {
          // O progresso já feito continua; o adulto novo só acelera o que ainda falta.
          const progress = adults ? (now - s.bubbleAt) / bubbleInterval(adults, c) : 0;
          s.bubbleAt = now - progress * bubbleInterval(adults + 1, c);
        }
        tools.emit(grew ? 'grew' : 'fed', { id: hungry.id, species: hungry.species, stage: hungry.stage });
        return { ok: true, fish: fishInfo(hungry, c), grew };
      },

      // Estourar uma bolha dourada.
      pop() {
        this.tick();
        const s = tools.state();
        const c = tools.cfg();
        if (s.bubbles <= 0) return { ok: false, reason: 'empty' };
        s.bubbles--;
        s.popped++;
        const reward = tools.reward({ cheer: c.bubbleCheer, tickets: tools.rng() < c.bubbleTicketChance ? 1 : 0 });
        tools.emit('pop', { reward });
        return { ok: true, reward };
      },

      // Uma prenda fisgada na pescaria solta um peixe no tanque.
      hear(type) {
        if (type !== 'fished') return;
        // No novo ano o aquário já está aberto pelo recorde, mesmo antes do primeiro quadro ou de abrir a janela.
        this.start();
        this.addFish();
      }
    };
  });
});
