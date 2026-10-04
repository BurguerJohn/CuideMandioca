(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ArraiaMundo = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Eventos do mundo: coisas que acontecem com o céu e o tempo da festa inteira, como a chuva de São João que já existia (chuva, arco-íris e
  // friozinho continuam no motor, em src/core.js). De tempos em tempos (`data.mundo.every`) um evento sorteado toma conta do mapa por alguns
  // segundos: muda a luz e o ar (neblina, apagão, lua cheia, calor, vento, estrelas cadentes, cometa), soma um bônus de Animação enquanto dura e
  // pede cliques em alvos que passam (estrelas, lampiões, vaga-lumes, olhos no escuro, pipas, balões d'água): cada alvo pego paga o prêmio do
  // evento e, pegando todos, vem o prêmio final. Um evento de cada vez, e nunca durante a chuva nem o arco-íris. Quem desenha é src/festa-mundo.js.
  const finite = (value, fallback = 0) => (Number.isFinite(value) ? value : fallback);
  const int = (value, low, high, fallback = low) => Math.min(high, Math.max(low, Math.floor(finite(value, fallback))));

  class Mundo {
    constructor(engine) {
      this.engine = engine;
    }

    get cfg() { return this.engine.data.mundo; }
    get state() { return this.engine.state.mundo; }
    event(id) { return this.cfg.eventos.find(entry => entry.id === id) || null; }

    fresh() { return { nextAt: 0, nextId: '', active: null, seen: {}, caught: {}, done: {}, last: '', buffs: [] }; }

    // Os eventos de tema (`tema`) só entram no sorteio com um conjunto completo do tema vestido; os outros sempre.
    eligible(entry) { return !entry.tema || this.engine.wornTheme() === entry.tema; }

    // O que passou fica (quantas vezes cada evento veio e quantos alvos já foram pegos); o evento que estava no meio não volta.
    load(raw) {
      const base = this.fresh();
      if (!raw || typeof raw !== 'object') return base;
      for (const entry of this.cfg.eventos) {
        const seen = int(raw.seen?.[entry.id], 0, 1e9, 0);
        const caught = int(raw.caught?.[entry.id], 0, 1e9, 0);
        if (seen) base.seen[entry.id] = seen;
        if (caught) base.caught[entry.id] = caught;
        const done = int(raw.done?.[entry.id], 0, 1e9, 0);
        if (done) base.done[entry.id] = done;
      }
      base.last = typeof raw.last === 'string' && this.event(raw.last) ? raw.last : '';
      base.nextId = typeof raw.nextId === 'string' && this.event(raw.nextId) ? raw.nextId : '';
      // Os bônus comprados na feira que ainda valem (no máximo seis, de até uma hora).
      const now = this.engine.now();
      for (const buff of (Array.isArray(raw.buffs) ? raw.buffs : []).slice(0, 6)) {
        if (buff && typeof buff.id === 'string' && finite(buff.until) > now && finite(buff.bonus) > 0) {
          base.buffs.push({ id: buff.id.slice(0, 40), until: Math.min(buff.until, now + 3600000), bonus: Math.min(0.5, buff.bonus) });
        }
      }
      const next = finite(raw.nextAt);
      if (next > 0) base.nextAt = Math.min(next, this.engine.now() + this.cfg.every[1] * 1000);
      return base;
    }

    shift(ms) {
      const s = this.state;
      if (s.nextAt) s.nextAt -= ms;
      if (s.active) { s.active.born -= ms; s.active.until -= ms; }
      for (const buff of s.buffs) buff.until -= ms;
    }

    // A pausa até o próximo evento (sorteada); nos dias de santo (Santo Antônio, São João, São Pedro) os eventos vêm com o dobro da frequência.
    span() {
      const [low, high] = this.cfg.every;
      const day = this.engine.specialDay ? this.engine.specialDay() : null;
      return (low + (high - low) * this.engine.rng()) * 1000 * (day && this.cfg.saintDays.includes(day.id) ? 0.5 : 1);
    }

    // Marca a hora do próximo evento e já sorteia qual vai ser (a previsão que a tela mostra).
    schedule() {
      const s = this.state;
      s.nextAt = this.engine.now() + this.span();
      s.nextId = this.pick() || '';
    }

    // O evento de agora: { entry, born, until, got, n, dir, seed } ou null.
    active() {
      const s = this.state;
      if (!s || !s.active) return null;
      const entry = this.event(s.active.id);
      return entry ? { ...s.active, entry, n: entry.targets } : null;
    }

    // Soma à Animação enquanto o evento dura, e os bônus comprados na feira enquanto valem.
    bonus() {
      const now = this.engine.now();
      const s = this.engine.state?.mundo;
      if (!s) return 0;
      const bought = s.buffs.reduce((sum, buff) => sum + (now < buff.until ? buff.bonus : 0), 0);
      if (!s.active || now >= s.active.until) return bought;
      const entry = this.event(s.active.id);
      return bought + (entry ? finite(entry.bonus) : 0);
    }

    // Os bônus da feira que valem agora, para a placa: { name, bonus, until }.
    buffs() {
      const now = this.engine.now();
      return this.state.buffs.filter(buff => now < buff.until).map(buff => {
        const [id, k] = buff.id.split(':');
        const entry = this.event(id);
        return { name: (entry && entry[`shop${k}`]) || buff.id, bonus: buff.bonus, until: buff.until };
      });
    }

    // A cada quadro: acaba o evento que passou do tempo e, depois da pausa sorteada, começa outro.
    tick() {
      const s = this.state;
      if (!s) return;
      const now = this.engine.now();
      if (s.buffs.length) s.buffs = s.buffs.filter(buff => now < buff.until);
      if (s.active) {
        if (now >= s.active.until) this.end();
        return;
      }
      const weather = this.engine.state.weather;
      if (weather.rain || weather.rainbow) return;
      if (this.engine.state.size < this.cfg.minSize) { s.nextAt = 0; return; }
      // Trocou de roupa (ou tirou o conjunto): a previsão é sorteada de novo na hora, para valer o tema de agora. (A primeira vez só anota a roupa.)
      const theme = this.engine.wornTheme();
      const changed = this.theme !== undefined && theme !== this.theme;
      this.theme = theme;
      if (!s.nextAt) { this.schedule(); return; }
      if (changed) s.nextId = this.pick() || '';
      if (now < s.nextAt) return;
      // O que a previsão disse, se ainda cabe na festa (e no tema); senão sorteia de novo.
      const plan = s.nextId ? this.event(s.nextId) : null;
      const planned = plan && this.engine.state.size >= (plan.minSize || 0) && this.eligible(plan) ? s.nextId : this.pick();
      if (planned) this.start(planned);
      else this.schedule();
    }

    // Nos dias especiais (Namorados, Santo Antônio, São João, São Pedro) os eventos da época pesam mais no sorteio (`dayBoost`): o multiplicador de hoje.
    boost(entry) {
      const day = this.engine.specialDay ? this.engine.specialDay() : null;
      const rule = day && this.cfg.dayBoost ? this.cfg.dayBoost[day.id] : null;
      return rule && rule.ids.includes(entry.id) ? rule.x : 1;
    }

    // O encadeamento (`chains`): o evento seguinte do que acabou, se a sorte deixar e se já couber na festa; senão ''.
    follow(entry) {
      const link = entry && this.cfg.chains ? this.cfg.chains[entry.id] : null;
      const next = link ? this.event(link.id) : null;
      if (!next || this.engine.state.size < (next.minSize || 0) || !this.eligible(next)) return '';
      return this.engine.rng() < link.chance ? next.id : '';
    }

    // O próximo evento: sorteado pelo peso entre os que já cabem na festa, sem repetir o último (se houver outro). Com um conjunto de tema vestido, a cada
    // sorteio há `temaChance` de sair da lista do tema (e só dela); fora isso, os eventos sem tema.
    pick() {
      const size = this.engine.state.size;
      let pool = this.cfg.eventos.filter(entry => size >= (entry.minSize || 0) && this.eligible(entry));
      if (pool.some(entry => entry.tema) && this.engine.rng() < this.cfg.temaChance) pool = pool.filter(entry => entry.tema);
      else pool = pool.filter(entry => !entry.tema);
      if (pool.length > 1) pool = pool.filter(entry => entry.id !== this.state.last);
      const total = pool.reduce((sum, entry) => sum + entry.weight * this.boost(entry), 0);
      if (!total) return null;
      let roll = this.engine.rng() * total;
      for (const entry of pool) {
        roll -= entry.weight * this.boost(entry);
        if (roll <= 0) return entry.id;
      }
      return pool[pool.length - 1].id;
    }

    // Põe o evento no mapa agora (o relógio, o botão de teste e o `tick` chamam).
    start(id) {
      const entry = this.event(id);
      const s = this.state;
      if (!entry || s.active) return false;
      const now = this.engine.now();
      s.active = { id: entry.id, born: now, until: now + entry.seconds * 1000, got: [], dir: this.engine.rng() < 0.5 ? -1 : 1, seed: Math.floor(this.engine.rng() * 1e6), hits: {} };
      // O tesouro: cada marca do mapa guarda um prêmio sorteado da lista `loot` (a pessoa só descobre cavando).
      if (entry.loot) s.active.loot = Array.from({ length: entry.targets }, () => entry.loot[Math.min(entry.loot.length - 1, Math.floor(this.engine.rng() * entry.loot.length))]);
      s.nextAt = 0;
      s.nextId = '';
      s.last = entry.id;
      s.seen[entry.id] = Math.min(1e9, (s.seen[entry.id] || 0) + 1);
      this.engine.record('mundo', { id: entry.id });
      this.engine.emit('mundo', { id: entry.id, seconds: entry.seconds, n: entry.targets });
      this.afterStart(entry);
      this.achievements();
      return true;
    }

    // O que o evento muda fora do desenho: a lua cheia chama as visitas do folclore.
    afterStart(entry) {
      if (!entry.folclore) return;
      const visits = this.engine.state.minis?.folclore;
      const now = this.engine.now();
      if (visits && !visits.active && (!visits.nextAt || visits.nextAt > now + 12000)) visits.nextAt = now + 12000;
    }

    end() {
      const s = this.state;
      const active = s.active;
      if (!active) return;
      s.active = null;
      // Um evento puxa o outro às vezes (o calorão chama o temporal, o pôr do sol chama a lua): o seguinte vem logo, e já aparece na previsão.
      const following = this.follow(this.event(active.id));
      if (following) {
        s.nextAt = this.engine.now() + this.cfg.chains[active.id].delay * 1000;
        s.nextId = following;
      } else this.schedule();
      this.engine.emit('mundo-fim', { id: active.id, got: active.got.length, n: this.event(active.id)?.targets || 0 });
    }

    // Um alvo do evento pego (`k` de 0 a n-1, cada um uma vez só): paga o prêmio dele e, com todos pegos, o prêmio final.
    catchTarget(k) {
      const s = this.state;
      const active = s.active;
      const now = this.engine.now();
      if (!active || now >= active.until) return { ok: false, reason: 'none' };
      const entry = this.event(active.id);
      if (!entry || !Number.isInteger(k) || k < 0 || k >= entry.targets) return { ok: false, reason: 'none' };
      if (active.got.includes(k)) return { ok: false, reason: 'taken' };
      // Na constelação as estrelas só valem na ordem: clicar fora dela não gasta nada e não conta.
      if (entry.ordered && k !== active.got.length) return { ok: false, reason: 'order', id: entry.id, next: active.got.length };
      // Alvos de vários golpes (a pinhata): cada clique racha mais e avisa; só o último golpe paga.
      if (entry.hits > 1) {
        const n = (active.hits[k] || 0) + 1;
        if (n < entry.hits) {
          active.hits[k] = n;
          this.engine.emit('mundo-golpe', { id: entry.id, k, n, of: entry.hits });
          return { ok: true, partial: true, id: entry.id, k, n, of: entry.hits };
        }
        delete active.hits[k];
      }
      // Na feira cada alvo é uma barraca: pagar em fichas compra um bônus de Animação por alguns minutos.
      const offer = entry.shop ? entry.shop[k] : null;
      if (offer && this.engine.state.tickets < offer.cost) return { ok: false, reason: 'poor', id: entry.id, k, cost: offer.cost };
      active.got.push(k);
      s.caught[entry.id] = Math.min(1e9, (s.caught[entry.id] || 0) + 1);
      const tools = this.engine.minis.tools('mundo');
      let buff = null;
      if (offer) {
        this.engine.state.tickets -= offer.cost;
        s.buffs = s.buffs.filter(item => item.id !== `${entry.id}:${k}`);
        s.buffs.push({ id: `${entry.id}:${k}`, until: now + offer.seconds * 1000, bonus: offer.bonus });
        buff = { bonus: offer.bonus, seconds: offer.seconds, cost: offer.cost };
      }
      const given = tools.reward((active.loot && active.loot[k]) || entry.reward || {});
      const all = active.got.length >= entry.targets;
      let finale = null;
      if (all) {
        s.done[entry.id] = Math.min(1e9, (s.done[entry.id] || 0) + 1);
        finale = tools.reward(entry.finale || {});
        this.engine.record('mundo-completo', { id: entry.id });
      }
      this.engine.emit('mundo-pego', { id: entry.id, k, given, left: entry.targets - active.got.length, all, finale, buff });
      this.achievements();
      return { ok: true, id: entry.id, k, given, left: entry.targets - active.got.length, all, finale, buff };
    }

    // Quantos tipos de evento já foram completos (todos os alvos pegos) e quantas vezes cada um.
    doneKinds() { return Object.keys(this.state.done).length; }

    // As conquistas do céu: ver todos os tipos de evento, juntar 100 alvos, completar 12 tipos, estourar pinhatas, desenhar o Cruzeiro e comprar na feira.
    caughtTotal() { return Object.values(this.state.caught).reduce((sum, n) => sum + n, 0); }
    achievements() {
      const info = this.info();
      if (info.seenKinds >= info.kinds) this.engine.unlock('ceu-aberto');
      if (this.caughtTotal() >= 100) this.engine.unlock('cacador-de-alvos');
      if (this.doneKinds() >= this.cfg.completeKinds) this.engine.unlock('ceu-completo');
      if ((this.state.caught.pinhata || 0) >= 9) this.engine.unlock('mestre-da-pinhata');
      if ((this.state.done.constelacao || 0) >= 3) this.engine.unlock('astronomo');
      if ((this.state.caught.feira || 0) >= 10) this.engine.unlock('fregues-da-feira');
    }

    // Para a tela e a placa: o evento que está valendo, quantos alvos já foram pegos e quanto falta.
    // Falta pouco: a previsão, só quando o evento chega em até `soon` segundos (com um evento no ar não há hora marcada, então não há aviso); senão null.
    // A placa mostra o aviso com a contagem.
    soon() {
      const plan = this.forecast();
      if (!plan) return null;
      return plan.at - this.engine.now() <= this.cfg.soon * 1000 ? plan : null;
    }

    // A previsão: o evento que vem e quando (ou null, enquanto não há hora marcada).
    forecast() {
      const s = this.state;
      const entry = s.nextId ? this.event(s.nextId) : null;
      return entry && s.nextAt ? { entry, at: s.nextAt } : null;
    }

    info() {
      const active = this.active();
      const seen = this.state.seen;
      const rare = this.cfg.eventos.filter(entry => this.rarity(entry) === 'rare');
      return { active, seenTotal: Object.values(seen).reduce((sum, n) => sum + n, 0), kinds: this.cfg.eventos.length, seenKinds: Object.keys(seen).length,
        rareKinds: rare.length, rareSeen: rare.filter(entry => seen[entry.id]).length, doneKinds: this.doneKinds() };
    }

    // Quão raro é o evento, pelo peso do sorteio: 3 comum, 2 incomum, 1 raro (os raros pagam bem mais, e o aviso deles é mais chamativo).
    rarity(entry) {
      return entry.weight >= 3 ? 'common' : entry.weight === 2 ? 'uncommon' : 'rare';
    }

    // O almanaque: uma linha por evento, na ordem dos dados, com o que a tela precisa para dizer o que já foi visto e o que falta: quantas vezes veio,
    // quantos alvos foram pegos, quantas vezes foi completo, a raridade, se já cabe na festa (ou quantos convidados faltam) e as dicas de onde vem
    // (quem puxa o evento, desde que já tenha passado, e o dia de santo ou data que o favorece).
    almanac() {
      const cfg = this.cfg;
      const size = this.engine.state.size;
      const s = this.state;
      return cfg.eventos.map(entry => {
        const via = Object.keys(cfg.chains || {}).filter(from => cfg.chains[from].id === entry.id && s.seen[from]);
        const days = Object.keys(cfg.dayBoost || {}).filter(day => cfg.dayBoost[day].ids.includes(entry.id));
        return { entry, seen: s.seen[entry.id] || 0, caught: s.caught[entry.id] || 0, done: s.done[entry.id] || 0, rarity: this.rarity(entry),
          unlocked: size >= entry.minSize, needs: Math.max(0, Math.ceil(entry.minSize - size)), via, days, tema: entry.tema || null, themeOn: this.eligible(entry) };
      });
    }
  }

  return { Mundo };
});
