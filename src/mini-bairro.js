(function (root, factory) {
  const Minis = typeof module === 'object' && module.exports ? require('./minis.js') : root.ArraiaMinis;
  factory(Minis);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Minis) {
  'use strict';

  // Bairro: a rua da turma. Cada integrante que a Mandioca já pescou mora numa casa; visitar rende Animação (mais por nível) e um
  // recado, e cada casa só recebe visita de tempos em tempos. Configuração em `data.minis.bairro`.
  Minis.define('bairro', (engine, tools) => {
    const { clamp, finite, int } = tools;
    const char = id => engine.data.chars.find(entry => entry.id === id) || null;

    return {
      fresh() { return { homes: {}, visits: 0 }; },

      load(raw) {
        const c = tools.cfg();
        const base = this.fresh();
        if (!raw) return base;
        const homes = {};
        for (const entry of engine.data.chars) {
          const home = raw.homes?.[entry.id];
          if (!tools.object(home)) continue;
          homes[entry.id] = { nextAt: clamp(finite(home.nextAt), 0, tools.now() + c.visitWait * 1000), visits: int(home.visits, 0, 1e9, 0) };
        }
        return { homes, visits: int(raw.visits, 0, 1e9, 0) };
      },

      shift(ms) {
        for (const home of Object.values(tools.state().homes)) if (home.nextAt) home.nextAt -= ms;
      },

      // As casas da rua: quem mora (já foi pescado), quem está no rolê e quem pode receber visita agora.
      info() {
        const s = tools.state();
        const now = tools.now();
        return { visits: s.visits, houses: engine.data.chars.map(entry => {
          const home = s.homes[entry.id] || { nextAt: 0, visits: 0 };
          const owned = engine.hasChar(entry.id);
          const away = owned && engine.awayOuting(entry.id) >= 0;
          const wait = Math.max(0, (home.nextAt - now) / 1000);
          return { id: entry.id, name: entry.name, role: entry.role, rarity: entry.rarity, owned, away, level: engine.charLevel(entry.id), visits: home.visits,
            wait, ready: owned && !away && wait <= 0 };
        }) };
      },

      // Visitar o vizinho: Animação pelo nível dele, uma ficha a cada `ticketEvery` visitas e um recado.
      visit(id) {
        const s = tools.state();
        const c = tools.cfg();
        const entry = char(id);
        if (!entry) return { ok: false, reason: 'char' };
        if (!engine.hasChar(id)) return { ok: false, reason: 'empty' };
        if (engine.awayOuting(id) >= 0) return { ok: false, reason: 'away' };
        const now = tools.now();
        const home = s.homes[id] || (s.homes[id] = { nextAt: 0, visits: 0 });
        if (now < home.nextAt) return { ok: false, reason: 'wait', wait: (home.nextAt - now) / 1000 };
        home.visits++;
        s.visits++;
        home.nextAt = now + c.visitWait * 1000;
        const level = engine.charLevel(id);
        const ticket = home.visits % c.ticketEvery === 0;
        const reward = tools.reward({ cheer: c.giftBase + level * c.giftPerLevel, tickets: ticket ? 1 : 0 });
        const letters = engine.data.letters;
        const recado = letters[(s.visits * 7 + Math.floor(tools.rng() * letters.length)) % letters.length];
        tools.emit('visit', { id, level, reward, recado });
        return { ok: true, char: entry, level, reward, recado, ticket };
      }
    };
  });
});
