(function (root, factory) {
  const Minis = typeof module === 'object' && module.exports ? require('./minis.js') : root.ArraiaMinis;
  factory(Minis);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Minis) {
  'use strict';

  // Provador: o espelho onde a Mandioca veste o que já tem (chapéus, itens de mão e tecidos) e os conjuntos completos (que dão
  // bônus) com um clique. O motor só junta o que o jogo já sabe (`engine.equip`, os conjuntos de `data.sets`).
  Minis.define('provador', (engine, tools) => {
    const TABS = ['chapeu', 'mao', 'tecido', 'conjunto'];

    // Os itens da categoria que a Mandioca já tem, na ordem da loja.
    const owned = cat => engine.data.items.filter(item => item.cat === cat && engine.owned(item.id));
    const worn = () => engine.state.equipped;

    return {
      fresh() { return { tab: 'chapeu', worn: 0, sets: 0 }; },

      load(raw) {
        const base = this.fresh();
        if (!raw) return base;
        return { tab: TABS.includes(raw.tab) ? raw.tab : base.tab, worn: tools.int(raw.worn, 0, 1e9, 0), sets: tools.int(raw.sets, 0, 1e9, 0) };
      },

      tabs() { return TABS; },
      select(tab) {
        if (!TABS.includes(tab)) return false;
        tools.state().tab = tab;
        return true;
      },

      // Tudo para o provador desenhar: o que está vestido, a aba e os itens (com `owned`/`worn`) ou os conjuntos.
      info() {
        const s = tools.state();
        const e = worn();
        const items = cat => engine.data.items.filter(item => item.cat === cat).map(item => ({ id: item.id, name: item.name, desc: item.desc,
          owned: engine.owned(item.id), worn: e[cat] === item.id }));
        const sets = engine.data.sets.map(set => {
          const has = { hat: engine.owned(set.hat), hand: engine.owned(set.hand), fabric: engine.owned(set.fabric) };
          const missing = ['hat', 'hand', 'fabric'].filter(part => !has[part]).length;
          return { id: set.id, name: set.name, hat: set.hat, hand: set.hand, fabric: set.fabric, bonus: set.bonus, has, missing, complete: missing === 0,
            active: engine.activeSet()?.id === set.id, worn: engine.state.setsWorn.includes(set.id) };
        });
        return { tab: s.tab, equipped: { ...e }, hats: items('chapeu'), hands: items('mao'), fabrics: items('tecido'), sets, bonus: engine.setBonus(),
          stage: engine.growthStage ? engine.growthStage() : 0 };
      },

      // Vestir um item que a Mandioca tem.
      wear(id) {
        const item = engine.items[id];
        if (!item || !['chapeu', 'mao', 'tecido'].includes(item.cat)) return { ok: false, reason: 'item' };
        if (!engine.owned(id)) return { ok: false, reason: 'locked' };
        if (worn()[item.cat] === id) return { ok: false, reason: 'already' };
        const before = engine.activeSet()?.id;
        engine.equip(id);
        tools.state().worn++;
        const set = engine.activeSet();
        tools.emit('wear', { id, cat: item.cat, set: set && set.id !== before ? set.id : null });
        return { ok: true, item, set: set && set.id !== before ? set : null };
      },

      // Vestir o conjunto inteiro (se tem as três peças): o bônus dele vale na hora.
      wearSet(id) {
        const set = engine.data.sets.find(entry => entry.id === id);
        if (!set) return { ok: false, reason: 'set' };
        if (![set.hat, set.hand, set.fabric].every(piece => engine.owned(piece))) return { ok: false, reason: 'missing' };
        if (engine.activeSet()?.id === id) return { ok: false, reason: 'already' };
        engine.equip(set.hat);
        engine.equip(set.hand);
        engine.equip(set.fabric);
        tools.state().sets++;
        tools.emit('set', { id, bonus: set.bonus });
        return { ok: true, set };
      }
    };
  });
});
