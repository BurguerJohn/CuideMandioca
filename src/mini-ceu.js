(function (root, factory) {
  const Minis = typeof module === 'object' && module.exports ? require('./minis.js') : root.ArraiaMinis;
  factory(Minis);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Minis) {
  'use strict';

  // Céu de São João: foguetes que sobem onde você clicar (com a Grande Final), estrelas cadentes que realizam pedidos e uma
  // simpatia a cada tanto (3 cartas, escolha uma). Configuração em `data.minis.ceu`.
  Minis.define('ceu', (engine, tools) => {
    const { clamp, finite, int } = tools;
    const SHAPES = ['peonia', 'coracao', 'estrela', 'chuva'];
    const simpatia = id => tools.cfg().simpatias.find(entry => entry.id === id) || null;

    function nextStar(from = tools.now()) { return from + tools.between(...tools.cfg().starEvery) * 1000; }

    function refillRockets(now) {
      const s = tools.state();
      const c = tools.cfg();
      if (s.rockets >= c.rocketMax || !s.rocketAt) s.rocketAt = now;
      else {
        const n = Math.floor((now - s.rocketAt) / (c.rocketEvery * 1000));
        if (n > 0) {
          s.rockets = Math.min(c.rocketMax, s.rockets + n);
          s.rocketAt = s.rockets >= c.rocketMax ? now : s.rocketAt + n * c.rocketEvery * 1000;
        }
      }
    }

    function updateVolley(now) {
      const s = tools.state();
      const c = tools.cfg();
      s.volley = s.volley.filter(at => at <= now && now - at <= c.volleyMs);
      return s.volley.length;
    }

    function expireStar(now) {
      const s = tools.state();
      if (!s.star || now < s.star.until) return false;
      s.star = null;
      s.starAt = nextStar(now);
      tools.emit('star-gone');
      return true;
    }

    return {
      fresh() {
        return { rockets: tools.cfg().rocketMax, rocketAt: 0, volley: [], finaleAt: 0, fired: 0, finales: 0, starAt: 0, star: null, wishes: 0, simpatiaAt: 0,
          cards: null, simpatias: 0 };
      },

      load(raw) {
        const c = tools.cfg();
        const now = tools.now();
        const base = this.fresh();
        if (!raw) return base;
        let cards = null;
        if (tools.object(raw.cards) && Array.isArray(raw.cards.ids) && raw.cards.ids.length === 3 && raw.cards.ids.every(simpatia) &&
          new Set(raw.cards.ids).size === 3) cards = { ids: raw.cards.ids.slice(), picked: Number.isInteger(raw.cards.picked) ? clamp(raw.cards.picked, 0, 2) : null };
        // A estrela cadente não espera o jogo fechado: ao voltar, a próxima vem com calma.
        return { rockets: int(raw.rockets, 0, c.rocketMax, c.rocketMax), rocketAt: clamp(finite(raw.rocketAt), 0, now), volley: [],
          finaleAt: clamp(finite(raw.finaleAt), 0, now + c.finaleWait * 1000), fired: int(raw.fired, 0, 1e9, 0), finales: int(raw.finales, 0, 1e9, 0),
          starAt: tools.object(raw.star) ? nextStar(now) : clamp(finite(raw.starAt), 0, now + c.starEvery[1] * 1000), star: null, wishes: int(raw.wishes, 0, 1e9, 0),
          simpatiaAt: clamp(finite(raw.simpatiaAt), 0, now + c.simpatiaWait * 1000), cards, simpatias: int(raw.simpatias, 0, 1e9, 0) };
      },

      shift(ms) {
        const s = tools.state();
        const back = value => (value ? value - ms : value);
        s.rocketAt = back(s.rocketAt);
        s.finaleAt = back(s.finaleAt);
        s.starAt = back(s.starAt);
        s.simpatiaAt = back(s.simpatiaAt);
        s.volley = s.volley.map(at => at - ms);
        if (s.star) { s.star.born -= ms; s.star.until -= ms; }
      },

      // Os foguetes voltam com o tempo; a estrela cadente aparece de vez em quando e some se ninguém fizer o pedido.
      tick() {
        const s = tools.state();
        const c = tools.cfg();
        const now = tools.now();
        refillRockets(now);
        updateVolley(now);
        if (s.star) {
          expireStar(now);
          return;
        }
        if (!s.starAt) s.starAt = nextStar(now);
        if (now >= s.starAt) {
          s.star = { born: now, until: now + c.starSeconds * 1000, seed: Math.floor(tools.rng() * 1e6) };
          tools.emit('star', { seed: s.star.seed });
        }
      },

      info() {
        const s = tools.state();
        const c = tools.cfg();
        const now = tools.now();
        refillRockets(now);
        const recent = updateVolley(now);
        return { rockets: s.rockets, rocketMax: c.rocketMax, rocketIn: s.rockets >= c.rocketMax ? 0 : Math.max(0, (s.rocketAt + c.rocketEvery * 1000 - now) / 1000),
          volley: recent, volleyNeed: c.volley, finaleIn: Math.max(0, (s.finaleAt - now) / 1000),
          star: s.star ? { born: s.star.born, seed: s.star.seed, left: Math.max(0, (s.star.until - now) / 1000), progress: clamp((now - s.star.born) / (s.star.until - s.star.born), 0, 1) } : null,
          simpatiaIn: Math.max(0, (s.simpatiaAt - now) / 1000), cards: s.cards ? { ids: s.cards.ids.slice(), picked: s.cards.picked } : null,
          wishes: s.wishes, fired: s.fired, simpatias: s.simpatias };
      },

      // Soltar um foguete: sobe, estoura num desenho sorteado e rende Animação; vários em seguida fazem a Grande Final.
      launch() {
        const s = tools.state();
        const c = tools.cfg();
        const now = tools.now();
        refillRockets(now);
        if (s.rockets <= 0) return { ok: false, reason: 'empty' };
        if (s.rockets >= c.rocketMax) s.rocketAt = now;
        s.rockets--;
        s.fired++;
        updateVolley(now);
        s.volley.push(now);
        const reward = tools.reward({ cheer: c.rocketCheer });
        const shape = tools.pick(SHAPES);
        let finale = null;
        if (s.volley.length >= c.volley && now >= s.finaleAt) {
          s.volley = [];
          s.finaleAt = now + c.finaleWait * 1000;
          s.finales++;
          finale = tools.reward(c.finale);
          tools.emit('finale', { reward: finale });
        }
        tools.emit('rocket', { shape });
        return { ok: true, shape, reward, finale, volley: s.volley.length };
      },

      // Pedido à estrela cadente (clique nela enquanto cruza o céu).
      wish() {
        const s = tools.state();
        const c = tools.cfg();
        expireStar(tools.now());
        if (!s.star) return { ok: false, reason: 'none' };
        const pick = c.wishes[Math.floor(tools.rng() * c.wishes.length) % c.wishes.length];
        s.star = null;
        s.starAt = nextStar();
        s.wishes++;
        const reward = tools.reward(pick);
        tools.emit('wish', { reward });
        return { ok: true, reward };
      },

      // A simpatia da vez: 3 cartas viradas para baixo (se já passou a espera e não tem uma aberta).
      deal() {
        const s = tools.state();
        const c = tools.cfg();
        if (s.cards) return { ok: false, reason: 'open' };
        if (tools.now() < s.simpatiaAt) return { ok: false, reason: 'wait', wait: (s.simpatiaAt - tools.now()) / 1000 };
        const pool = c.simpatias.map(entry => entry.id);
        const ids = [];
        while (ids.length < 3) ids.push(pool.splice(Math.floor(tools.rng() * pool.length) % pool.length, 1)[0]);
        s.cards = { ids, picked: null };
        tools.emit('deal', { ids });
        return { ok: true, ids };
      },

      // Virar uma das cartas: vale o prêmio dela e a espera até a próxima simpatia começa.
      pick(index) {
        const s = tools.state();
        const c = tools.cfg();
        if (!s.cards || s.cards.picked !== null) return { ok: false, reason: 'none' };
        if (!Number.isInteger(index) || !(index >= 0 && index < 3)) return { ok: false, reason: 'card' };
        s.cards.picked = index;
        const entry = simpatia(s.cards.ids[index]);
        const reward = tools.reward(entry.reward || {});
        if (entry.frenzy) {
          engine.startFrenzy(entry.frenzy, true);
          reward.frenzy = entry.frenzy;
        }
        s.simpatiaAt = tools.now() + c.simpatiaWait * 1000;
        s.simpatias++;
        tools.emit('simpatia', { id: entry.id, reward });
        return { ok: true, simpatia: entry, reward };
      },

      // Fechar a simpatia já revelada.
      ack() {
        const s = tools.state();
        if (s.cards && s.cards.picked !== null) s.cards = null;
      },

      shapes() { return SHAPES.slice(); }
    };
  });
});
