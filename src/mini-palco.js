(function (root, factory) {
  const Minis = typeof module === 'object' && module.exports ? require('./minis.js') : root.ArraiaMinis;
  factory(Minis);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Minis) {
  'use strict';

  // Palco do Forró: o trio toca, você marca o ritmo em 3 pistas. O show é uma lista de notas com a hora de cada uma (a partir de
  // `startAt`); `hit(lane)` julga pelo relógio do jogo e `tick` marca como errada a nota que passou. Configuração em
  // `data.minis.palco`.
  Minis.define('palco', (engine, tools) => {
    const { clamp, finite, int } = tools;
    const song = id => tools.cfg().songs.find(entry => entry.id === id) || null;

    // A partitura: sempre a mesma para a mesma música (a semente). Notas a cada meio tempo, às vezes pulando, sem repetir a
    // mesma pista mais de duas vezes seguidas.
    function chart(entry) {
      const c = tools.cfg();
      let seed = entry.seed;
      const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
      const half = 60000 / entry.bpm / 2;
      const notes = [];
      let step = 0;
      let last = -1;
      let same = 0;
      for (let i = 0; i < entry.notes; i++) {
        step += i === 0 ? 0 : rand() < 0.4 ? 1 : rand() < 0.75 ? 2 : 3;
        let lane = Math.floor(rand() * 3);
        if (lane === last && same >= 2) lane = (lane + 1 + Math.floor(rand() * 2)) % 3;
        same = lane === last ? same + 1 : 1;
        last = lane;
        notes.push({ t: Math.round(c.lead + step * half), lane, state: null });
      }
      return notes;
    }

    const unlocked = (index, best) => index === 0 || (best[tools.cfg().songs[index - 1].id] || 0) >= 1;

    function finish(s, now, aborted = false) {
      const c = tools.cfg();
      const show = s.show;
      const n = show.notes.length;
      const perfect = show.notes.filter(note => note.state === 'perfect').length;
      const good = show.notes.filter(note => note.state === 'good').length;
      const accuracy = n ? (perfect * 3 + good * 2) / (3 * n) : 0;
      const stars = aborted ? 0 : c.stars.filter(min => accuracy >= min).length;
      let reward = {};
      let first = false;
      if (!show.practice && !aborted) {
        reward = tools.reward(c.rewards[stars]);
        if (stars === 3 && (s.best[show.song] || 0) < 3) { first = true; Object.assign(reward, { tickets: (reward.tickets || 0) + (tools.reward(c.firstThree).tickets || 0) }); }
        if (stars >= 1) s.cooldownAt = now + c.wait * 1000;   // desafinou (0 estrelas): sem descanso, tenta de novo
        s.shows++;
        s.stars += stars;
      }
      if (!aborted) s.best[show.song] = Math.max(s.best[show.song] || 0, show.practice ? Math.min(stars, s.best[show.song] || 0) : stars);
      s.last = { song: show.song, stars, accuracy, perfect, good, miss: n - perfect - good, maxCombo: show.maxCombo, practice: !!show.practice, aborted, reward, first };
      s.show = null;
      tools.emit('show-end', s.last);
    }

    return {
      fresh() { return { show: null, last: null, best: {}, cooldownAt: 0, shows: 0, stars: 0 }; },

      load(raw) {
        const c = tools.cfg();
        const base = this.fresh();
        if (!raw) return base;
        const best = {};
        for (const entry of c.songs) if (finite(raw.best?.[entry.id]) > 0) best[entry.id] = int(raw.best[entry.id], 0, 3, 0);
        // Um show no meio não volta: o palco recomeça do começo.
        return { show: null, last: null, best, cooldownAt: clamp(finite(raw.cooldownAt), 0, tools.now() + c.wait * 1000),
          shows: int(raw.shows, 0, 1e9, 0), stars: int(raw.stars, 0, 1e9, 0) };
      },

      shift(ms) {
        const s = tools.state();
        if (s.cooldownAt) s.cooldownAt -= ms;
        if (s.show) s.show.startAt -= ms;
      },

      // As notas que passaram da hora sem acerto viram erro; passada a última, o show acaba.
      tick() {
        const s = tools.state();
        const c = tools.cfg();
        if (!s.show) return;
        const now = tools.now();
        const at = now - s.show.startAt;
        for (const note of s.show.notes) {
          if (!note.state && at > note.t + c.good) {
            note.state = 'miss';
            s.show.combo = 0;
            tools.emit('miss', { lane: note.lane });
          }
        }
        const lastNote = s.show.notes[s.show.notes.length - 1];
        if (at > lastNote.t + 1200) finish(s, s.show.startAt + lastNote.t + 1200);
      },

      info() {
        const s = tools.state();
        const c = tools.cfg();
        const now = tools.now();
        const show = s.show;
        return {
          songs: c.songs.map((entry, index) => ({ ...entry, stars: s.best[entry.id] || 0, open: unlocked(index, s.best) })),
          cooldown: Math.max(0, (s.cooldownAt - now) / 1000), last: s.last, shows: s.shows, stars: s.stars,
          show: show ? { song: show.song, time: now - show.startAt, notes: show.notes, combo: show.combo, maxCombo: show.maxCombo, score: show.score,
            practice: show.practice, total: show.notes.length } : null
        };
      },

      // Começar uma música (aberta): no descanso do palco é só ensaio, sem prêmio.
      start(id) {
        this.tick();
        const s = tools.state();
        const c = tools.cfg();
        const index = c.songs.findIndex(entry => entry.id === id);
        if (index < 0) return { ok: false, reason: 'song' };
        if (s.show) return { ok: false, reason: 'playing' };
        if (!unlocked(index, s.best)) return { ok: false, reason: 'locked' };
        const now = tools.now();
        s.last = null;
        s.show = { song: id, startAt: now, notes: chart(c.songs[index]), combo: 0, maxCombo: 0, score: 0, practice: now < s.cooldownAt };
        tools.emit('show-start', { song: id, practice: s.show.practice });
        return { ok: true, practice: s.show.practice };
      },

      // Um clique na pista: acerta a nota mais antiga da pista que está dentro da janela de tempo.
      hit(lane) {
        this.tick();
        const s = tools.state();
        const c = tools.cfg();
        if (!s.show) return { ok: false, reason: 'idle' };
        const at = tools.now() - s.show.startAt;
        const note = s.show.notes.find(entry => !entry.state && entry.lane === lane && Math.abs(entry.t - at) <= c.good);
        if (!note) return { ok: false, reason: 'none', lane };
        const diff = Math.abs(note.t - at);
        note.state = diff <= c.perfect ? 'perfect' : 'good';
        s.show.combo++;
        s.show.maxCombo = Math.max(s.show.maxCombo, s.show.combo);
        s.show.score += note.state === 'perfect' ? 3 : 2;
        tools.emit('note', { lane, judge: note.state, combo: s.show.combo });
        return { ok: true, judge: note.state, lane, combo: s.show.combo };
      },

      // Parar o show no meio (sem prêmio, sem descanso).
      abort() {
        this.tick();
        const s = tools.state();
        if (!s.show) return { ok: false };
        finish(s, tools.now(), true);
        return { ok: true };
      },

      // Fechar o resultado do último show.
      ack() { tools.state().last = null; },

      chart(id) { const entry = song(id); return entry ? chart(entry) : []; }
    };
  });
});
