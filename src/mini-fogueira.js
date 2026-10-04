(function (root, factory) {
  const Minis = typeof module === 'object' && module.exports ? require('./minis.js') : root.ArraiaMinis;
  factory(Minis);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Minis) {
  'use strict';

  // Fogueira de Perto: lenha acende o fogo, os espetos assam sozinhos e, quando a comida fica pronta, é só comer. Nada queima nem passa do ponto: pronta,
  // a comida espera no espeto o tempo que for. Dá para pular a fogueira. Toda comida comida deixa a Barriga da Mandioca cheia e parada por `bellyHold` horas.
  // Configuração em `data.minis.fogueira`. O calor e o ponto da comida andam com o jogo aberto (fechado, a fogueira espera).
  Minis.define('fogueira', (engine, tools) => {
    const { clamp, finite } = tools;
    const food = id => tools.cfg().foods.find(entry => entry.id === id) || null;
    const rate = heat => { const c = tools.cfg(); return heat >= c.minHeat ? 0.4 + 0.6 * heat / c.heatMax : 0; };

    // A comida vai de crua a dourando e fica pronta ao chegar em 1 (e fica assim).
    function stateOf(stick) {
      if (stick.progress >= 1) return 'pronto';
      return stick.progress < 0.5 ? 'cru' : 'dourando';
    }

    return {
      fresh() {
        return { heat: 0, sticks: Array.from({ length: tools.cfg().slots }, () => null), selected: tools.cfg().foods[0].id, jumpAt: 0, roasted: 0, jumped: 0 };
      },

      load(raw) {
        const c = tools.cfg();
        const base = this.fresh();
        if (!raw) return base;
        const sticks = Array.from({ length: c.slots }, (_, i) => {
          const entry = Array.isArray(raw.sticks) ? raw.sticks[i] : null;
          if (!tools.object(entry) || !food(entry.food)) return null;
          return { food: entry.food, progress: clamp(finite(entry.progress), 0, 1) };
        });
        return { heat: clamp(finite(raw.heat), 0, c.heatMax), sticks, selected: food(raw.selected) ? raw.selected : base.selected,
          jumpAt: clamp(finite(raw.jumpAt), 0, tools.now() + c.jumpWait * 1000), roasted: tools.int(raw.roasted, 0, 1e9, 0), jumped: tools.int(raw.jumped, 0, 1e9, 0) };
      },

      shift(ms) {
        const s = tools.state();
        if (s.jumpAt) s.jumpAt -= ms;
      },

      // O fogo esfria; os espetos assam no ritmo do calor e, ao chegar no ponto, avisam (e esperam).
      tick(dt) {
        const s = tools.state();
        const c = tools.cfg();
        const speed = rate(s.heat);
        s.heat = Math.max(0, s.heat - dt * c.heatLoss);
        if (!speed) return;
        for (const [slot, stick] of s.sticks.entries()) {
          if (!stick || stick.progress >= 1) continue;
          stick.progress = Math.min(1, stick.progress + dt / food(stick.food).seconds * speed);
          if (stick.progress >= 1) tools.emit('ready', { slot, food: stick.food });
        }
      },

      // Quantas comidas já estão prontas esperando (o número vermelho do botão da janela na placa).
      pending() {
        return tools.state().sticks.filter(stick => stick && stick.progress >= 1).length;
      },

      info() {
        const s = tools.state();
        const c = tools.cfg();
        const now = tools.now();
        const speed = rate(s.heat);
        return { heat: s.heat, heatMax: c.heatMax, wood: engine.state.wood, foods: c.foods, selected: s.selected, burning: s.heat >= c.minHeat,
          canJump: s.heat >= c.jumpMinHeat && now >= s.jumpAt, jumpWait: Math.max(0, (s.jumpAt - now) / 1000),
          sticks: s.sticks.map((stick, slot) => (stick ? { slot, food: stick.food, progress: stick.progress, state: stateOf(stick), ready: stick.progress >= 1,
            // Quanto falta (em segundos) no calor de agora; sem calor não anda.
            left: stick.progress >= 1 ? 0 : speed ? Math.ceil((1 - stick.progress) * food(stick.food).seconds / speed) : null } : null)) };
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
        s.sticks[slot] = { food: id, progress: 0 };
        tools.emit('put', { slot, food: id });
        return { ok: true, food: food(id) };
      },

      // Comer a comida pronta: o espeto fica livre e vem o prêmio (o extra da comida e a Barriga cheia e parada). Crua ou dourando ainda não dá.
      eat(slot) {
        const s = tools.state();
        const c = tools.cfg();
        const stick = Number.isInteger(slot) ? s.sticks[slot] : null;
        if (!stick) return { ok: false, reason: 'empty' };
        if (stick.progress < 1) return { ok: false, reason: 'raw' };
        const item = food(stick.food);
        const reward = tools.reward({ ...item.reward, bellyFull: c.bellyHold });
        s.sticks[slot] = null;
        s.roasted++;
        tools.emit('roasted', { slot, food: stick.food, reward });
        return { ok: true, food: item, reward };
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
