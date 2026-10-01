(function (root, factory) {
  const Minis = typeof module === 'object' && module.exports ? require('./minis.js') : root.ArraiaMinis;
  factory(Minis);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Minis) {
  'use strict';

  // Quintal dos Bichos: os bichos do cenário da festa (os que já chegaram, pelo recorde de convidados) moram num quintal.
  // Carinho e milho enchem o laço de cada um; com o laço cheio ele dá um presente. Configuração em `data.minis.bichos`.
  Minis.define('bichos', (engine, tools) => {
    const { clamp, finite, int } = tools;
    let cache = { level: -1, pets: [], chicks: 0 };

    // Os bichos que já chegaram à festa (o cenário vem dos convidados) e quantos pintinhos.
    function present() {
      const level = engine.houseLevel();
      if (cache.level !== level) {
        const scenery = engine.scenery(level);
        cache = { level, pets: tools.cfg().pets.filter(pet => scenery.landmarks.includes(pet.scenery)),
          chicks: Math.min(8, scenery.counts.pintinho || 0) };
      }
      return cache;
    }
    const slot = id => {
      const pets = tools.state().pets;
      if (!pets[id]) pets[id] = { bond: 0, ready: false, giftAt: 0, petAt: 0 };
      return pets[id];
    };
    const find = id => present().pets.find(pet => pet.id === id) || null;

    function addBond(st, amount) {
      const c = tools.cfg();
      st.bond = Math.min(c.bondMax, st.bond + amount);
      if (st.bond >= c.bondMax && tools.now() >= st.giftAt) st.ready = true;
    }

    return {
      fresh() {
        const c = tools.cfg();
        return { grain: c.grainMax, grainAt: tools.now(), petted: 0, fed: 0, gifts: 0, pets: {} };
      },

      load(raw) {
        const c = tools.cfg();
        const now = tools.now();
        const base = this.fresh();
        if (!raw) return base;
        const pets = {};
        for (const pet of c.pets) {
          const entry = raw.pets?.[pet.id];
          if (!tools.object(entry)) continue;
          const bond = int(entry.bond, 0, c.bondMax, 0);
          pets[pet.id] = { bond, ready: entry.ready === true && bond >= c.bondMax,
            giftAt: clamp(finite(entry.giftAt), 0, now + c.giftWait * 1000), petAt: clamp(finite(entry.petAt), 0, now + c.petCooldown * 1000) };
        }
        return { grain: int(raw.grain, 0, c.grainMax, c.grainMax), grainAt: clamp(finite(raw.grainAt, now), 0, now),
          petted: int(raw.petted, 0, 1e9, 0), fed: int(raw.fed, 0, 1e9, 0), gifts: int(raw.gifts, 0, 1e9, 0), pets };
      },

      // Os grãos de milho voltam com o tempo (também com o jogo fechado); o presente fica pronto quando passa a espera.
      tick() {
        const s = tools.state();
        const c = tools.cfg();
        const now = tools.now();
        if (s.grain >= c.grainMax) s.grainAt = now;
        else {
          const n = Math.floor((now - s.grainAt) / (c.grainEvery * 1000));
          if (n > 0) {
            s.grain = Math.min(c.grainMax, s.grain + n);
            s.grainAt = s.grain >= c.grainMax ? now : s.grainAt + n * c.grainEvery * 1000;
          }
        }
        for (const pet of present().pets) {
          const st = slot(pet.id);
          if (!st.ready && st.bond >= c.bondMax && now >= st.giftAt) {
            st.ready = true;
            tools.emit('gift-ready', { id: pet.id });
          }
        }
      },

      // `engine.advance`: o tempo passou de uma vez, os relógios andam para trás.
      shift(ms) {
        const s = tools.state();
        const back = value => (value ? value - ms : value);
        s.grainAt = back(s.grainAt);
        for (const st of Object.values(s.pets)) { st.giftAt = back(st.giftAt); st.petAt = back(st.petAt); }
      },

      // Para a janela desenhar: os bichos que já moram no quintal, com o estado de cada um.
      info() {
        const { pets, chicks } = present();
        const now = tools.now();
        return { chicks, grain: tools.state().grain, grainMax: tools.cfg().grainMax,
          pets: pets.map(pet => { const st = slot(pet.id); return { ...pet, bond: st.bond, ready: st.ready, wait: Math.max(0, (st.petAt - now) / 1000) }; }) };
      },

      // Carinho num bicho: um pouco de Amor para a Mandioca e mais laço para o bicho (cada um aceita um carinho a cada petCooldown s).
      pet(id) {
        const pet = find(id);
        if (!pet) return { ok: false, reason: 'absent' };
        const c = tools.cfg();
        const st = slot(id);
        const now = tools.now();
        if (now < st.petAt) return { ok: false, reason: 'cooldown', wait: (st.petAt - now) / 1000 };
        st.petAt = now + c.petCooldown * 1000;
        const love = engine.addLove(c.lovePet);
        addBond(st, c.petBond);
        tools.state().petted++;
        tools.emit('pet', { id, bond: st.bond, ready: st.ready });
        return { ok: true, pet, love, bond: st.bond, ready: st.ready };
      },

      // Jogar um grão de milho para o bicho: gasta um grão e enche mais o laço dele.
      feed(id) {
        const pet = find(id);
        const s = tools.state();
        const c = tools.cfg();
        if (!pet) return { ok: false, reason: 'absent' };
        if (s.grain <= 0) return { ok: false, reason: 'grain' };
        if (s.grain >= c.grainMax) s.grainAt = tools.now();
        s.grain--;
        const st = slot(id);
        addBond(st, c.grainBond);
        s.fed++;
        tools.emit('feed', { id, bond: st.bond, ready: st.ready });
        return { ok: true, pet, bond: st.bond, ready: st.ready };
      },

      // Pegar o presente do bicho (o laço cheio): o prêmio dele, e o laço recomeça.
      collect(id) {
        const pet = find(id);
        const c = tools.cfg();
        if (!pet) return { ok: false, reason: 'absent' };
        const st = slot(id);
        if (!st.ready) return { ok: false, reason: 'empty' };
        const reward = tools.reward(pet.reward);
        st.bond = 0;
        st.ready = false;
        st.giftAt = tools.now() + c.giftWait * 1000;
        tools.state().gifts++;
        tools.emit('gift', { id, gift: pet.gift, reward });
        return { ok: true, pet, reward };
      },

      // Um agrado de fora (a Mata Encantada): o bicho que acompanhou a Mandioca ganha laço.
      comfort(id, amount) {
        if (!find(id)) return false;
        addBond(slot(id), amount);
        return true;
      },

      count() { return present().pets.length; }
    };
  });
});
