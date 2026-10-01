(function (root, factory) {
  const Minis = typeof module === 'object' && module.exports ? require('./minis.js') : root.ArraiaMinis;
  factory(Minis);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Minis) {
  'use strict';

  // Cordel da Mandioca: o folheto com a história da Mandioca, que ganha uma página nova a cada `every` convidados novos (a primeira com 10, a
  // segunda com 20...). Cada página tem uma ilustração animada e uma coisa para clicar: clicar `goal` vezes completa a página (e rende um
  // prêmio uma vez só). O estado guarda a página aberta e o que já foi clicado; as páginas liberadas vêm do recorde de convidados. Os textos e
  // os números ficam em `data.minis.cordel` (a arte, em art/livro_*.py).
  Minis.define('cordel', (engine, tools) => {
    const { int } = tools;
    const cfg = () => tools.cfg();
    const state = () => tools.state();
    const pages = () => cfg().pages;

    // Quantas páginas já estão liberadas: 1 a cada `every` convidados do recorde, até a última.
    const unlocked = () => Math.min(pages().length, Math.floor(engine.houseLevel() / cfg().every));

    return {
      fresh() { return { page: 1, seen: 1, clicks: {}, done: {} }; },

      load(raw) {
        const base = this.fresh();
        if (!raw) return base;
        const clicks = {};
        const done = {};
        for (const page of pages()) {
          const count = int(raw.clicks?.[page.id], 0, page.goal, 0);
          if (count) clicks[page.id] = count;
          if (raw.done?.[page.id] === true && count >= page.goal) done[page.id] = true;
        }
        const total = pages().length;
        return { page: int(raw.page, 1, total, 1), seen: int(raw.seen, 1, total, 1), clicks, done };
      },

      unlocked,

      // Quantas páginas já liberadas ainda esperam a ação (o botão da janela na placa chama a atenção por elas).
      pending() {
        const s = state();
        return pages().filter((page, i) => i < unlocked() && !s.done[page.id]).length;
      },

      // Tudo para a janela desenhar: a página aberta, as liberadas e o que cada uma já teve de clique.
      info() {
        const s = state();
        const open = unlocked();
        return {
          page: Math.min(s.page, Math.max(1, open)), unlocked: open, total: pages().length, every: cfg().every, seen: s.seen,
          completed: pages().filter(page => s.done[page.id]).length,
          list: pages().map((page, i) => ({ n: i + 1, id: page.id, arc: page.arc, goal: page.goal, clicks: s.clicks[page.id] || 0,
            done: !!s.done[page.id], open: i < open, fresh: i < open && i + 1 > s.seen }))
        };
      },

      // Abrir a página `n` (só as liberadas).
      go(n) {
        const target = Math.floor(n);
        if (!(target >= 1) || target > unlocked()) return false;
        const s = state();
        s.page = target;
        s.seen = Math.max(s.seen, target);
        return true;
      },
      turn(delta) { return this.go(this.info().page + delta); },

      // O clique na coisa da página `n`: soma um clique (até o objetivo); no último, a página fica completa e rende o prêmio (uma vez).
      poke(n) {
        const index = Math.floor(n) - 1;
        const page = pages()[index];
        if (!page || index >= unlocked()) return { ok: false, reason: 'locked' };
        const s = state();
        const had = s.clicks[page.id] || 0;
        const clicks = Math.min(page.goal, had + 1);
        s.clicks[page.id] = clicks;
        let reward = null;
        let finished = false;
        if (clicks >= page.goal && !s.done[page.id]) {
          s.done[page.id] = true;
          finished = true;
          const r = cfg().reward;
          const last = index === pages().length - 1;
          reward = tools.reward({ cheer: r.cheer + r.cheerPerPage * index, love: r.love,
            tickets: last ? r.finalTickets : (index + 1) % r.ticketsEvery === 0 ? r.tickets : 0 });
          tools.emit('page-done', { page: index + 1, reward, completed: Object.keys(s.done).length });
        }
        return { ok: true, page: index + 1, clicks, goal: page.goal, finished, reward };
      },

      // Convidado novo (nunca visto): se fecha um múltiplo de `every` depois da abertura da janela, sai uma página nova.
      grew(size) {
        const c = cfg();
        const entry = engine.data.minis.windows.find(window => window.id === 'cordel');
        if (size <= entry.start || size % c.every !== 0 || size / c.every > pages().length) return;
        tools.emit('page', { page: size / c.every });
      }
    };
  });
});
