(function (root, factory) {
  const Minis = typeof module === 'object' && module.exports ? require('./minis.js') : root.ArraiaMinis;
  factory(Minis);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Minis) {
  'use strict';

  // Visitas do folclore: 20 eventos aleatórios na festa, um para cada criatura que a Mandioca enfrenta na Mata Encantada (as 9 comuns e os
  // 10 chefes) mais o Desfile Encantado. Não é uma janela (`background`): anda sozinho. Cada evento abre quando a criatura é derrotada pela
  // primeira vez na Mata (e isso fica guardado, até de um São João para o outro); o Desfile abre quando todas já foram. De tempos em tempos
  // (`every`) uma visita sorteada passa pela festa por alguns segundos e quem clicar nela pega o prêmio. Os dados estão em
  // `data.minis.folclore`; quem desenha é src/festa-folclore.js.
  Minis.define('folclore', (engine, tools) => {
    const { finite, int } = tools;
    const WAKE_GAP = 90000;          // um sumiço do relógio maior que isto (computador dormiu) adia a próxima visita
    const PARADE = 8;                // no máximo tantas criaturas no desfile
    const cfg = () => tools.cfg();
    const state = () => tools.state();
    const find = id => cfg().events.find(entry => entry.id === id) || null;
    const creatures = () => [...engine.data.minis.mata.creatures, ...engine.data.minis.mata.bosses].map(entry => entry.id);

    // A criatura já foi derrotada na Mata (agora ou em algum São João anterior, que fica guardado em `met`)?
    const met = id => !!state().met[id] || finite(engine.state.minis.mata?.kills?.[id]) > 0;
    const unlocked = entry => (entry.creature ? met(entry.creature) : creatures().every(met));

    // Guarda as criaturas derrotadas: a Mata recomeça no ano novo, a lista de visitas não. A primeira conferência depois de carregar é
    // quieta (o que já estava liberado não avisa de novo); depois, cada visita que abre avisa (`unlock`).
    let primed = false;
    function sync() {
      const s = state();
      const kills = engine.state.minis.mata?.kills || {};
      const quiet = !primed;
      primed = true;
      const fresh = [];
      for (const id of creatures()) {
        if (finite(kills[id]) > 0 && !s.met[id]) { s.met[id] = true; fresh.push(id); }
      }
      if (quiet || !fresh.length) return;
      for (const entry of cfg().events) {
        const opened = entry.creature ? fresh.includes(entry.creature) : creatures().every(met);
        if (opened) tools.emit('unlock', { id: entry.id });
      }
    }

    const schedule = (now, range = cfg().every) => { state().nextAt = now + tools.between(range[0], range[1]) * 1000; };

    return {
      background: true,

      fresh() { return { active: null, nextAt: 0, last: '', met: {}, seen: {}, caught: {} }; },

      // Uma visita no meio não volta, e a próxima só é sorteada depois que o jogo anda de novo.
      load(raw) {
        const base = this.fresh();
        if (!raw) return base;
        for (const id of creatures()) if (raw.met?.[id] === true) base.met[id] = true;
        for (const entry of cfg().events) {
          const seen = int(raw.seen?.[entry.id], 0, 1e9, 0);
          const caught = Math.min(seen, int(raw.caught?.[entry.id], 0, 1e9, 0));
          if (seen) base.seen[entry.id] = seen;
          if (caught) base.caught[entry.id] = caught;
        }
        base.last = typeof raw.last === 'string' && find(raw.last) ? raw.last : '';
        return base;
      },

      shift(ms) {
        const s = state();
        if (s.nextAt) s.nextAt -= ms;
        if (s.active) for (const key of ['born', 'until', 'doneAt']) if (s.active[key]) s.active[key] -= ms;
      },

      tick() {
        const s = state();
        const now = tools.now();
        sync();
        const pool = cfg().events.filter(unlocked);
        if (this.napped && now - this.napped > WAKE_GAP && s.nextAt) schedule(now, cfg().wake);
        this.napped = now;
        if (s.active && now >= s.active.until) {
          const done = s.active;
          s.active = null;
          schedule(now);
          tools.emit('end', { id: done.id, caught: done.done });
        }
        if (s.active) return;
        if (!pool.length) { s.nextAt = 0; return; }
        if (!s.nextAt) schedule(now);
        else if (now >= s.nextAt) this.start();
      },

      // Começa uma visita (a sorteada entre as abertas, sem repetir a anterior; ou a `id`, que o modo de teste usa mesmo fechada).
      start(id) {
        const s = state();
        const now = tools.now();
        sync();
        let entry = id ? find(id) : null;
        if (id && !entry) return null;
        if (!entry) {
          const pool = cfg().events.filter(unlocked);
          if (!pool.length) return null;
          entry = tools.pick(pool.length > 1 ? pool.filter(item => item.id !== s.last) : pool);
        }
        const first = !s.seen[entry.id];
        s.seen[entry.id] = (s.seen[entry.id] || 0) + 1;
        s.last = entry.id;
        s.nextAt = 0;
        let cast = [];
        if (entry.motion === 'desfile') {
          cast = creatures().filter(met);
          if (cast.length < 2) cast = creatures().slice(0, PARADE);
          for (let i = cast.length - 1; i > 0; i--) {
            const j = Math.floor(tools.rng() * (i + 1));
            [cast[i], cast[j]] = [cast[j], cast[i]];
          }
          cast = cast.slice(0, PARADE);
        }
        s.active = { id: entry.id, born: now, until: now + entry.seconds * 1000, dir: tools.rng() < 0.5 ? -1 : 1, at: tools.rng(),
          seed: Math.floor(tools.rng() * 1e6), done: false, doneAt: 0, got: null, cast };
        tools.emit('start', { id: entry.id, first });
        return s.active;
      },

      // O clique na criatura: o prêmio da visita, e ela vai embora em `exit` ms.
      act() {
        const s = state();
        const now = tools.now();
        const a = s.active;
        if (!a || a.done || now >= a.until) return null;
        const entry = find(a.id);
        if (!entry) return null;
        const spec = entry.pick ? tools.pick(entry.pick) : entry.reward;
        const given = tools.reward(spec);
        if (finite(spec.frenzy) > 0) {
          engine.startFrenzy(spec.frenzy, true);
          given.frenzy = spec.frenzy;
        }
        a.done = true;
        a.doneAt = now;
        a.until = now + cfg().exit;
        a.got = given;
        s.caught[a.id] = (s.caught[a.id] || 0) + 1;
        tools.emit('catch', { id: a.id, given });
        return { id: a.id, given };
      },

      // As visitas, quais já abriram (e quantas vezes vieram e foram pegas) e a de agora.
      info() {
        const s = state();
        const now = tools.now();
        const events = cfg().events.map(entry => ({ id: entry.id, name: entry.name, creature: entry.creature, open: unlocked(entry),
          seen: s.seen[entry.id] || 0, caught: s.caught[entry.id] || 0 }));
        return { active: s.active && now < s.active.until ? s.active : null, events, open: events.filter(entry => entry.open).length,
          total: events.length, seen: events.reduce((sum, entry) => sum + entry.seen, 0), caught: events.reduce((sum, entry) => sum + entry.caught, 0) };
      }
    };
  });
});
