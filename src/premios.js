(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ArraiaPremios = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Prêmios dos minigames: cada minigame (`data.premios.jogos`) conta as vezes que foi jogado (pelos eventos do motor) e libera, na medida
  // em que a conta cresce, coisas e personagens para a festa (`data.premios.itens`). A conta e os prêmios ficam para sempre (passam de um São João
  // para o outro). Os personagens, clicados, dão um presente de tempos em tempos; cada prêmio soma um pouquinho à Animação. O terceiro prêmio de
  // cada jogo é o troféu de ouro (`tipo: 'ouro'`, `de` a coisa): a coisa vira ouro maciço, o personagem ganha uma coroa e o presente dele dobra.
  const finite = (value, fallback = 0) => (Number.isFinite(value) ? value : fallback);
  const int = (value, low, high, fallback = low) => Math.min(high, Math.max(low, Math.floor(finite(value, fallback))));
  const MINUTE = 60000;

  class Premios {
    constructor(engine) {
      this.engine = engine;
    }

    get cfg() { return this.engine.data.premios; }
    get state() { return this.engine.state.premios; }
    // Os prêmios por id (a festa pergunta toda hora, por quadro: um mapa em vez de procurar na lista).
    item(id) {
      if (!this.byId || this.byIdOf !== this.cfg) {
        this.byIdOf = this.cfg;
        this.byId = new Map(this.cfg.itens.map(entry => [entry.id, entry]));
      }
      return this.byId.get(id) || null;
    }
    game(id) { return this.cfg.jogos.find(entry => entry.id === id) || null; }

    fresh() { return { count: {}, got: {}, gifts: {}, parade: { nextAt: 0, active: null } }; }

    load(raw) {
      const base = this.fresh();
      if (!raw || typeof raw !== 'object') return base;
      const now = this.engine.now();
      for (const game of this.cfg.jogos) {
        const count = int(raw.count?.[game.id], 0, 1e9, 0);
        if (count) base.count[game.id] = count;
      }
      // Só vale o que o jogo conhece e que a conta de agora já merece (um save mexido não libera nada).
      const order = [];
      for (const entry of this.cfg.itens) {
        const at = finite(raw.got?.[entry.id]);
        if (at >= 1 && (base.count[entry.jogo] || 0) >= entry.feitos) order.push([entry.id, at]);
      }
      order.sort((a, b) => a[1] - b[1]).forEach(([id], index) => { base.got[id] = index + 1; });
      for (const entry of this.cfg.itens) {
        if (entry.tipo !== 'personagem' || !base.got[entry.id]) continue;
        const next = finite(raw.gifts?.[entry.id]);
        if (next > 0) base.gifts[entry.id] = Math.min(next, now + this.cfg.giftMinutes * MINUTE);
      }
      // O desfile que estava passando quando o jogo fechou acaba; o próximo vem no tempo que sobrava (no máximo o intervalo cheio).
      const next = finite(raw.parade?.nextAt);
      if (next > 0) base.parade.nextAt = Math.min(next, now + this.cfg.desfile.minutes[1] * MINUTE);
      return base;
    }

    // `engine.advance`: o tempo passou de uma vez, então o relógio dos presentes anda para trás junto.
    shift(ms) {
      const gifts = this.state.gifts;
      for (const id of Object.keys(gifts)) gifts[id] -= ms;
      const parade = this.state.parade;
      if (parade.nextAt) parade.nextAt -= ms;
      if (parade.active) { parade.active.born -= ms; parade.active.until -= ms; }
    }

    // --- O Desfile dos Prêmios -----------------------------------------------------------------------------------------------
    // Os personagens liberados, na ordem em que vieram (os que desfilam são os primeiros `maxPeople`).
    people() { return this.unlocked().filter(entry => entry.tipo === 'personagem'); }

    // A cada quadro: acaba o desfile que passou do tempo e, com personagens suficientes, marca e começa o próximo.
    tick() {
      const parade = this.state?.parade;
      if (!parade) return;
      const c = this.cfg.desfile;
      const now = this.engine.now();
      if (parade.active) {
        if (now >= parade.active.until) {
          parade.active = null;
          parade.nextAt = now + this.span();
        }
        return;
      }
      if (this.people().length < c.minPeople) { parade.nextAt = 0; return; }
      if (!parade.nextAt) { parade.nextAt = now + this.span(); return; }
      if (now >= parade.nextAt) this.startParade();
    }
    span() {
      const [low, high] = this.cfg.desfile.minutes;
      return (low + (high - low) * this.engine.rng()) * MINUTE;
    }

    // Põe o desfile na festa agora (o relógio, o botão de teste e o `tick` chamam).
    startParade() {
      const parade = this.state.parade;
      const c = this.cfg.desfile;
      const ids = this.people().slice(0, c.maxPeople).map(entry => entry.id);
      if (!ids.length) return false;
      const now = this.engine.now();
      parade.active = { born: now, until: now + c.seconds * 1000, dir: this.engine.rng() < 0.5 ? -1 : 1, ids, caught: false };
      parade.nextAt = 0;
      this.engine.emit('premio-parade', { n: ids.length });
      return true;
    }

    // Quem clica no desfile ganha o prêmio dele, uma vez só por desfile.
    catchParade() {
      const parade = this.state.parade;
      const active = parade.active;
      if (!active || active.caught || this.engine.now() >= active.until) return { ok: false };
      active.caught = true;
      const c = this.cfg.desfile;
      const n = active.ids.length;
      const given = this.engine.minis.tools('premios').reward({ tickets: c.tickets + Math.floor(n / 3) * c.ticketsPer, cheer: c.cheer + c.cheerPer * n, love: c.love });
      this.engine.record('desfile', { n });
      this.engine.emit('premio-parade-caught', { n, given });
      return { ok: true, n, given };
    }

    // Os minigames que um acontecimento do motor (`type`, e `mini`/`kind` quando vem de uma janela) conta como uma jogada.
    gamesFor(type, detail = {}) {
      const key = type === 'mini' ? `mini:${detail.mini}:${detail.kind}` : type;
      return this.cfg.jogos.filter(game => game.count.some(rule => rule.on === key
        && (!rule.when || Object.entries(rule.when).every(([field, value]) => detail[field] === value))
        && (!rule.min || Object.entries(rule.min).every(([field, value]) => finite(detail[field]) >= value)))).map(game => game.id);
    }

    // Conta a jogada no minigame que a espera e libera o que a conta merece.
    hear(type, detail = {}) {
      if (!this.engine.state?.premios) return;
      const s = this.state;
      for (const id of this.gamesFor(type, detail)) {
        s.count[id] = Math.min(1e9, (s.count[id] || 0) + 1);
        this.unlock(id);
      }
    }

    // Os prêmios do jogo `gameId` que a conta de agora já merece (e ainda não vieram).
    unlock(gameId) {
      const s = this.state;
      let changed = false;
      for (const entry of this.cfg.itens) {
        if (entry.jogo !== gameId || s.got[entry.id] || (s.count[gameId] || 0) < entry.feitos) continue;
        s.got[entry.id] = Object.keys(s.got).length + 1;
        this.engine.record('premio', { id: entry.id, jogo: gameId });
        this.engine.emit('premio', { id: entry.id, jogo: gameId, tipo: entry.tipo });
        changed = true;
      }
      if (changed) this.achievements();
    }

    // As conquistas de colecionar: 10 prêmios, os 18 personagens, os 18 troféus de ouro.
    achievements() {
      const t = this.tally();
      if (t.total >= 10) this.engine.unlock('colecionador');
      if (t.people >= t.peopleOf) this.engine.unlock('elenco-completo');
      if (t.golds >= t.goldsOf) this.engine.unlock('festa-de-ouro');
    }

    // Quantos prêmios, personagens e troféus de ouro já vieram (e quantos existem).
    tally() {
      const count = tipo => this.cfg.itens.filter(entry => entry.tipo === tipo);
      const got = list => list.filter(entry => this.has(entry.id)).length;
      return { total: this.total(), all: this.cfg.itens.length, people: got(count('personagem')), peopleOf: count('personagem').length,
        golds: got(count('ouro')), goldsOf: count('ouro').length };
    }

    has(id) { return !!this.state.got[id]; }
    count(gameId) { return this.state.count[gameId] || 0; }
    total() { return Object.keys(this.state.got).length; }
    // O troféu de ouro tem o `bonus` dele; os outros, o padrão.
    bonus() {
      const got = this.engine.state?.premios?.got;
      if (!got) return 0;
      return Object.keys(got).reduce((sum, id) => { const entry = this.item(id); return sum + (entry ? (entry.bonus ?? this.cfg.bonus) : 0); }, 0);
    }
    // O troféu de ouro de uma coisa (`id` da coisa) e o do jogo (para o personagem): já veio?
    hasGold(thingId) { return !!this.state.got[`${thingId}-ouro`]; }
    goldOfGame(gameId) { const gold = this.cfg.itens.find(entry => entry.jogo === gameId && entry.tipo === 'ouro'); return !!gold && this.has(gold.id); }

    // Os prêmios liberados, na ordem em que vieram (a festa põe cada um no seu lugar nessa ordem, para ninguém mudar de lugar).
    // (A lista só é refeita quando chega prêmio novo ou o save muda; a festa pede a cada quadro.)
    unlocked() {
      const got = this.state.got;
      const size = Object.keys(got).length;
      if (!this.listed || this.listed.got !== got || this.listed.size !== size) {
        this.listed = { got, size, list: Object.entries(got).sort((a, b) => a[1] - b[1]).map(([id]) => this.item(id)).filter(Boolean) };
      }
      return this.listed.list;
    }

    // O andamento de cada minigame: quantas vezes foi feito, o próximo prêmio e o que já veio.
    progress() {
      return this.cfg.jogos.map(game => {
        const entries = this.cfg.itens.filter(entry => entry.jogo === game.id);
        const next = entries.find(entry => !this.has(entry.id)) || null;
        return { id: game.id, name: game.name, icon: game.icon, count: this.count(game.id), next: next ? next.feitos : null,
          prizes: entries.map(entry => ({ id: entry.id, tipo: entry.tipo, name: entry.name, feitos: entry.feitos, got: this.has(entry.id) })) };
      });
    }

    // O presente do personagem `id` (clicado na festa): tem de esperar `giftMinutes` entre um e outro.
    giftReady(id, now = this.engine.now()) {
      const entry = this.item(id);
      return !!entry && entry.tipo === 'personagem' && this.has(id) && now >= (this.state.gifts[id] || 0);
    }

    gift(id) {
      const entry = this.item(id);
      const now = this.engine.now();
      if (!entry || entry.tipo !== 'personagem' || !this.has(id)) return { ok: false, reason: 'none' };
      const next = this.state.gifts[id] || 0;
      if (now < next) return { ok: false, reason: 'wait', wait: next - now };
      // Com o troféu de ouro do jogo o presente dobra.
      const scale = this.goldOfGame(entry.jogo) ? 2 : 1;
      const spec = Object.fromEntries(Object.entries(entry.gift || {}).map(([key, value]) => [key, typeof value === 'number' ? value * scale : value]));
      const given = this.engine.minis.tools('premios').reward(spec);
      this.state.gifts[id] = now + this.cfg.giftMinutes * MINUTE;
      this.engine.emit('premio-gift', { id, given });
      return { ok: true, given, id };
    }
  }

  return { Premios };
});
