(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ArraiaMinis = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // As janelas extras da festa (retângulos soltos, como a Casa da Mandioca): o motor delas. Cada janela é um modelo
  // (`src/mini-<id>.js`) que guarda o estado dentro do save (`state.minis[id]`), anda com o tempo e dá os prêmios;
  // quem desenha é `src/janela-<id>.js`. Todas abrem num número de convidados (`data.minis.windows[].start`) e o botão
  // delas aparece na placa. Aqui ficam o registro dos modelos, a abertura por convidados e as ferramentas comuns.
  const IDS = ['bichos', 'aquario', 'horta', 'fogueira', 'palco', 'provador', 'ceu', 'bairro'];
  const models = {};
  const define = (id, factory) => { models[id] = factory; };

  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const finite = (value, fallback = 0) => (Number.isFinite(value) ? value : fallback);
  const int = (value, low, high, fallback = low) => clamp(Math.floor(finite(value, fallback)), low, high);
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

  class Minis {
    constructor(engine) {
      this.engine = engine;
      this.api = {};
      for (const [id, factory] of Object.entries(models)) this.api[id] = factory(engine, this.tools(id));
    }

    // Ferramentas que todo modelo usa.
    tools(id) {
      const engine = this.engine;
      return {
        clamp, finite, int, object,
        now: () => engine.now(),
        rng: () => engine.rng(),
        between: (low, high) => low + (high - low) * engine.rng(),
        pick: list => list[Math.min(list.length - 1, Math.floor(engine.rng() * list.length))],
        // Os dados da janela em `data.minis[id]` e o estado dela no save.
        cfg: () => engine.data.minis[id],
        state: () => engine.state.minis[id],
        emit: (kind, detail = {}) => engine.emit('mini', { mini: id, kind, ...detail }),
        // Prêmio: fichas, Animação (em segundos da festa), lenha, Amor e Barriga da Mandioca. Devolve o que foi dado.
        reward(spec = {}) {
          const s = engine.state;
          const given = {};
          const tickets = Math.max(0, Math.floor(finite(spec.tickets)));
          if (tickets) { s.tickets += tickets; given.tickets = tickets; }
          const wood = Math.max(0, Math.floor(finite(spec.wood)));
          if (wood) { s.wood += wood; given.wood = wood; }
          if (finite(spec.cheer) > 0) {
            const amount = Math.max(20, engine.cheerPerSecond() * spec.cheer);
            engine.earn(amount);
            given.cheer = amount;
          }
          if (finite(spec.love) > 0) given.love = engine.addLove(spec.love);
          if (finite(spec.belly) > 0) {
            engine.settleMood();
            const before = s.humor.barriga;
            s.humor.barriga = Math.min(engine.cfg.moodMax, before + spec.belly);
            given.belly = s.humor.barriga - before;
          }
          return given;
        }
      };
    }

    list() { return this.engine.data.minis.windows; }
    window(id) { return this.list().find(entry => entry.id === id) || null; }
    // A janela abre no convidado `start` (o recorde conta: um ano novo não fecha janela nenhuma).
    open(id) {
      const entry = this.window(id);
      return !!entry && !!this.api[id] && this.engine.houseLevel() >= entry.start;
    }
    opened() { return this.list().filter(entry => this.open(entry.id)).map(entry => entry.id); }

    fresh() {
      return Object.fromEntries(Object.entries(this.api).map(([id, model]) => [id, model.fresh()]));
    }

    load(raw) {
      const saved = object(raw) ? raw : {};
      return Object.fromEntries(Object.entries(this.api).map(([id, model]) => [id, model.load(object(saved[id]) ? saved[id] : null)]));
    }

    tick(dt) {
      for (const id of this.opened()) this.api[id].tick?.(dt);
    }

    // `engine.advance`: o tempo passou de uma vez, então todo relógio guardado (em horas de verdade) anda para trás junto.
    shift(ms) {
      for (const id of this.opened()) this.api[id].shift?.(ms);
    }

    // Os acontecimentos da festa (`engine.emit`): as janelas abertas que querem saber (`hear(type, detail)`) ficam sabendo.
    hear(type, detail) {
      if (type === 'mini' || !this.engine.state?.minis) return;
      for (const id of this.opened()) this.api[id].hear?.(type, detail);
    }

    // Convidado novo (nunca visto antes): quem abre agora avisa.
    grew(size) {
      for (const entry of this.list()) {
        if (entry.start === size && this.api[entry.id]) {
          this.api[entry.id].opened?.();
          this.engine.record('mini', { id: entry.id });
          this.engine.emit('mini-open', { id: entry.id, size });
        }
      }
    }
  }

  return { Minis, define, IDS, clamp, finite, int, object };
});
