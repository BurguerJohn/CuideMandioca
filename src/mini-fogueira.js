(function (root, factory) {
  const Minis = typeof module === 'object' && module.exports ? require('./minis.js') : root.ArraiaMinis;
  factory(Minis);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Minis) {
  'use strict';

  // Fogueira de Perto: lenha acende o fogo, os espetos assam (vire na hora certa, tire no ponto) e dá para pular a fogueira. Toda comida
  // tirada do fogo deixa a Barriga da Mandioca cheia e parada por `bellyHold` horas.
  // Configuração em `data.minis.fogueira`. O calor e o ponto da comida andam com o jogo aberto (fechado, a fogueira espera).
  Minis.define('fogueira', (engine, tools) => {
    const { clamp, finite, int } = tools;
    const food = id => tools.cfg().foods.find(entry => entry.id === id) || null;
    const rate = heat => { const c = tools.cfg(); return heat >= c.minHeat ? 0.4 + 0.6 * heat / c.heatMax : 0; };

    function stateOf(stick) {
      const c = tools.cfg();
      if (stick.burnt) return 'queimado';
      if (stick.progress < 0.5) return 'cru';
      if (stick.progress < c.perfect[0]) return 'dourando';
      if (stick.progress <= c.perfect[1]) return 'ponto';
      return 'passou';
    }

    return {
      fresh() {
        return { heat: 0, sticks: Array.from({ length: tools.cfg().slots }, () => null), selected: tools.cfg().foods[0].id, jumpAt: 0,
          roasted: 0, perfect: 0, burnt: 0, jumped: 0 };
      },

      load(raw) {
        const c = tools.cfg();
        const base = this.fresh();
        if (!raw) return base;
        const sticks = Array.from({ length: c.slots }, (_, i) => {
          const entry = Array.isArray(raw.sticks) ? raw.sticks[i] : null;
          if (!tools.object(entry) || !food(entry.food)) return null;
          const progress = clamp(finite(entry.progress), 0, c.burnAt);
          return { food: entry.food, progress, turns: int(entry.turns, 0, c.turnMax, 0), burnt: progress >= c.burnAt };
        });
        return { heat: clamp(finite(raw.heat), 0, c.heatMax), sticks, selected: food(raw.selected) ? raw.selected : base.selected,
          jumpAt: clamp(finite(raw.jumpAt), 0, tools.now() + c.jumpWait * 1000), roasted: int(raw.roasted, 0, 1e9, 0), perfect: int(raw.perfect, 0, 1e9, 0),
          burnt: int(raw.burnt, 0, 1e9, 0), jumped: int(raw.jumped, 0, 1e9, 0) };
      },

      shift(ms) {
        const s = tools.state();
        if (s.jumpAt) s.jumpAt -= ms;
      },

      // O fogo esfria; os espetos assam no ritmo do calor e, passando do ponto, queimam.
      tick(dt) {
        const s = tools.state();
        const c = tools.cfg();
        const speed = rate(s.heat);
        s.heat = Math.max(0, s.heat - dt * c.heatLoss);
        if (!speed) return;
        for (const [slot, stick] of s.sticks.entries()) {
          if (!stick || stick.burnt) continue;
          stick.progress += dt / food(stick.food).seconds * speed;
          if (stick.progress >= c.burnAt) {
            stick.progress = c.burnAt;
            stick.burnt = true;
            s.burnt++;
            tools.emit('burnt', { slot, food: stick.food });
          }
        }
      },

      info() {
        const s = tools.state();
        const c = tools.cfg();
        const now = tools.now();
        return { heat: s.heat, heatMax: c.heatMax, wood: engine.state.wood, foods: c.foods, selected: s.selected, burning: s.heat >= c.minHeat,
          canJump: s.heat >= c.jumpMinHeat && now >= s.jumpAt, jumpWait: Math.max(0, (s.jumpAt - now) / 1000),
          sticks: s.sticks.map((stick, slot) => (stick ? { slot, food: stick.food, progress: stick.progress, turns: stick.turns, state: stateOf(stick), burnt: stick.burnt }
            : null)) };
      },

      select(id) {
        if (!food(id)) return false;
        tools.state().selected = id;
        return true;
      },

      // Mais lenha na fogueira: o calor sobe um tanto (até o máximo).
      addWood() {
        const s = tools.state();
        const c = tools.cfg();
        if (engine.state.wood < 1) return { ok: false, reason: 'wood' };
        if (s.heat >= c.heatMax - 1) return { ok: false, reason: 'full' };
        engine.state.wood--;
        s.heat = Math.min(c.heatMax, s.heat + c.heatPerWood);
        tools.emit('wood', { heat: s.heat });
        return { ok: true, heat: s.heat };
      },

      // Pôr a comida escolhida (ou `id`) num espeto livre.
      put(slot, id = tools.state().selected) {
        const s = tools.state();
        if (!food(id)) return { ok: false, reason: 'food' };
        if (!Number.isInteger(slot) || !(slot >= 0 && slot < s.sticks.length)) return { ok: false, reason: 'slot' };
        if (s.sticks[slot]) return { ok: false, reason: 'busy' };
        s.sticks[slot] = { food: id, progress: 0, turns: 0, burnt: false };
        tools.emit('put', { slot, food: id });
        return { ok: true, food: food(id) };
      },

      // Virar o espeto (a comida entre 10% e 90%): assa por igual e vale mais.
      turn(slot) {
        const s = tools.state();
        const c = tools.cfg();
        const stick = s.sticks[slot];
        if (!stick) return { ok: false, reason: 'empty' };
        if (stick.burnt || stick.progress > 0.9) return { ok: false, reason: 'late' };
        if (stick.progress < 0.1) return { ok: false, reason: 'early' };
        if (stick.turns >= c.turnMax) return { ok: false, reason: 'turned' };
        stick.turns++;
        tools.emit('turn', { slot, turns: stick.turns });
        return { ok: true, turns: stick.turns };
      },

      // Tirar do fogo: crua não sai; no ponto (e virada) vale mais; passada vale menos; queimada só vai para o lixo.
      take(slot) {
        const s = tools.state();
        const c = tools.cfg();
        const stick = s.sticks[slot];
        if (!stick) return { ok: false, reason: 'empty' };
        if (stick.burnt) {
          s.sticks[slot] = null;
          tools.emit('trash', { slot, food: stick.food });
          return { ok: true, burnt: true, reward: {} };
        }
        if (stick.progress < c.perfect[0]) return { ok: false, reason: 'raw' };
        const item = food(stick.food);
        const perfect = stick.progress <= c.perfect[1] && stick.turns >= 1;
        const mult = perfect ? c.perfectMult : stick.progress <= c.perfect[1] ? 1 : 0.7;
        const spec = Object.fromEntries(Object.entries(item.reward).map(([key, value]) => [key, Math.max(1, Math.round(value * mult))]));
        spec.bellyFull = c.bellyHold;                  // o prêmio da comida: Barriga cheia e parada por `bellyHold` horas
        const reward = tools.reward(spec);
        s.sticks[slot] = null;
        s.roasted++;
        if (perfect) s.perfect++;
        tools.emit('roasted', { slot, food: stick.food, perfect, reward });
        return { ok: true, food: item, perfect, mult, reward };
      },

      // Pular a fogueira (precisa de calor) rende Animação e Amor, e espera um tempo.
      jump() {
        const s = tools.state();
        const c = tools.cfg();
        const now = tools.now();
        if (s.heat < c.jumpMinHeat) return { ok: false, reason: 'cold' };
        if (now < s.jumpAt) return { ok: false, reason: 'wait', wait: (s.jumpAt - now) / 1000 };
        s.jumpAt = now + c.jumpWait * 1000;
        s.jumped++;
        const reward = tools.reward(c.jump);
        tools.emit('jump', { reward });
        return { ok: true, reward };
      }
    };
  });
});
