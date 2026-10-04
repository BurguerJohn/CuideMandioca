(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ArraiaLooks = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Guarda-roupa: a pessoa salva o visual de agora (chapéu, mão, tecido, chão, os dois cenários dos lados e o varal) com um nome e volta a ele com um
  // clique; também tem o "look surpresa", que veste peças sorteadas das que ela já tem. O estado é `state.looks = { list, seq }` e vai no save (e passa
  // de um São João para o outro, como o inventário).
  const SLOTS = ['chapeu', 'mao', 'tecido', 'terreiro', 'esquerda', 'direita', 'varal'];
  const CATEGORY = { chapeu: 'chapeu', mao: 'mao', tecido: 'tecido', terreiro: 'terreiro', esquerda: 'lado', direita: 'lado', varal: 'varal' };
  const NAME_MAX = 24;

  class Looks {
    constructor(engine) {
      this.engine = engine;
    }

    get cfg() { return this.engine.data.looks; }
    get state() { return this.engine.state.looks; }
    get slots() { return SLOTS; }

    fresh() { return { list: [], seq: 0 }; }

    // O que vem do save: no máximo `max` looks, cada um com nome curto e só as peças que existem na categoria certa (uma peça estranha vira vazia);
    // um look sem nenhuma peça boa some. Os ids não se repetem e o contador nunca fica atrás do maior id.
    load(raw) {
      const base = this.fresh();
      if (!raw || typeof raw !== 'object' || !Array.isArray(raw.list)) return base;
      const taken = new Set();
      for (const entry of raw.list) {
        if (base.list.length >= this.cfg.max) break;
        if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string' || !/^look-\d{1,6}$/.test(entry.id) || taken.has(entry.id)) continue;
        const pieces = {};
        let count = 0;
        for (const slot of SLOTS) {
          const item = this.engine.items[entry.pieces?.[slot]];
          pieces[slot] = item && item.cat === CATEGORY[slot] ? item.id : null;
          if (pieces[slot]) count++;
        }
        if (!count) continue;
        taken.add(entry.id);
        const name = typeof entry.name === 'string' ? entry.name.trim().slice(0, NAME_MAX) : '';
        base.list.push({ id: entry.id, name: name || `Look ${base.list.length + 1}`, pieces });
      }
      const top = base.list.reduce((max, look) => Math.max(max, Number(look.id.slice(5))), 0);
      const seq = Number.isInteger(raw.seq) ? Math.min(999999, Math.max(0, raw.seq)) : 0;
      base.seq = Math.max(seq, top);
      return base;
    }

    // O visual de agora (uma peça por espaço).
    current() {
      const equipped = this.engine.state.equipped;
      return Object.fromEntries(SLOTS.map(slot => [slot, equipped[slot] || null]));
    }

    get(id) { return this.state.list.find(look => look.id === id) || null; }

    // O look está vestido quando todas as peças dele (as que não são vazias) são as de agora.
    isWorn(look) {
      const now = this.current();
      return SLOTS.every(slot => !look.pieces[slot] || look.pieces[slot] === now[slot]);
    }

    // As peças que a pessoa ainda não tem (por exemplo, de um save mexido): o look se veste só com o que existe.
    missing(look) {
      return SLOTS.map(slot => look.pieces[slot]).filter(id => id && !this.engine.owned(id));
    }

    // Salva o visual de agora. O nome é o dado, ou o do conjunto que está valendo, ou "Look N". Recusa quando o guarda-roupa está cheio ou quando
    // já existe um look igual ao de agora.
    save(name) {
      const s = this.state;
      if (s.list.length >= this.cfg.max) return { ok: false, reason: 'full', max: this.cfg.max };
      const pieces = this.current();
      const same = s.list.find(look => SLOTS.every(slot => look.pieces[slot] === pieces[slot]));
      if (same) return { ok: false, reason: 'same', id: same.id, name: same.name };
      s.seq = Math.min(999999, s.seq + 1);
      const wanted = typeof name === 'string' ? name.trim().slice(0, NAME_MAX) : '';
      const set = this.engine.activeSet();
      const look = { id: `look-${s.seq}`, name: wanted || set?.name || `Look ${s.seq}`, pieces };
      s.list.push(look);
      this.engine.emit('look', { kind: 'saved', id: look.id, name: look.name });
      if (s.list.length >= this.cfg.achievementAt) this.engine.unlock('guarda-roupa');
      return { ok: true, look };
    }

    // Veste o look: cada peça que a pessoa tem entra no lugar dela (os dois cenários dos lados também). Devolve quantas entraram e as que faltaram.
    wear(id) {
      const look = this.get(id);
      if (!look) return { ok: false, reason: 'none' };
      const lacking = this.missing(look);
      let worn = 0;
      for (const slot of SLOTS) {
        const piece = look.pieces[slot];
        if (!piece || !this.engine.owned(piece)) continue;
        if (this.engine.equip(piece, slot === 'direita' ? 'direita' : 'esquerda')) worn++;
      }
      // Os dois lados: com o mesmo cenário nos dois, `equip` troca de lado; o look manda no que fica em cada um.
      const equipped = this.engine.state.equipped;
      for (const side of ['esquerda', 'direita']) {
        const piece = look.pieces[side];
        if (piece && this.engine.owned(piece)) equipped[side] = piece;
      }
      this.engine.emit('look', { kind: 'worn', id: look.id, name: look.name, worn, lacking });
      return { ok: true, look, worn, lacking };
    }

    remove(id) {
      const s = this.state;
      const index = s.list.findIndex(look => look.id === id);
      if (index < 0) return { ok: false, reason: 'none' };
      const [look] = s.list.splice(index, 1);
      this.engine.emit('look', { kind: 'deleted', id: look.id, name: look.name });
      return { ok: true, look };
    }

    // O look surpresa: sorteia, para cada espaço, uma peça das que a pessoa tem (os dois lados sorteiam cenários diferentes quando há mais de um).
    random() {
      const engine = this.engine;
      const rng = () => engine.rng();
      const own = cat => engine.data.items.filter(item => item.cat === cat && engine.owned(item.id));
      const pick = list => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
      const chosen = {};
      for (const slot of ['chapeu', 'mao', 'tecido', 'terreiro', 'varal']) {
        const list = own(CATEGORY[slot]);
        if (list.length) chosen[slot] = pick(list).id;
      }
      const sides = own('lado');
      if (sides.length) {
        chosen.esquerda = pick(sides).id;
        const rest = sides.filter(item => item.id !== chosen.esquerda);
        chosen.direita = rest.length ? pick(rest).id : chosen.esquerda;
      }
      for (const slot of SLOTS) if (chosen[slot]) engine.equip(chosen[slot], slot === 'direita' ? 'direita' : 'esquerda');
      const equipped = engine.state.equipped;
      if (chosen.esquerda) equipped.esquerda = chosen.esquerda;
      if (chosen.direita) equipped.direita = chosen.direita;
      engine.emit('look', { kind: 'random', pieces: chosen });
      return { ok: true, pieces: chosen };
    }

    // Para a tela: os looks, quantos cabem e quantos estão salvos.
    info() {
      const s = this.state;
      return { list: s.list, count: s.list.length, max: this.cfg.max, full: s.list.length >= this.cfg.max };
    }
  }

  return { Looks, SLOTS, CATEGORY, NAME_MAX };
});
