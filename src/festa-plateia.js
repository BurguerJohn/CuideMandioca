// Os números da plateia: além da ola (que continua em src/festa.js), a plateia faz 12 coisas, cada uma com o seu jeito de se mexer, o seu
// grito escrito, o seu som e o seu enfeite:
//   palmas       palmas no mesmo compasso, com faíscas entre as mãos            pulapula   as fileiras pulam em revezamento, de braços para o alto
//   bandeiras    metade ergue uma bandeirinha que balança                       balanco    balanço lento, todo mundo junto, e uns corações
//   fogos        "OOOH!" quando um fogo estoura (só reage)                      bis        punhos para o alto no ritmo, "BIS! BIS!"
//   cantoria     cantam junto da Mandioca, com notinhas                         serpente   o trenzinho: uma onda de lado que anda pela plateia
//   pisada       pisam no chão em compasso, levantando poeira                   rebola     tremem de lado, num rebolado só
//   oi           "BEM-VINDO!" quando chega gente nova (só reage)                ovacao     de braços para o alto e confete, quando a festa sobe de porte (só reage)
// Cada número começa por uma pessoa (`origin`) e se espalha pelas outras (RIPPLE ms por pixel), então não é todo mundo no mesmo quadro. Os
// sorteados vêm de tempos em tempos (mais seguidos com mais gente) e o jogador também puxa um: é só clicar em alguém da plateia.
// Cada quadro da festa chama `update` (agenda), e `drawCrowd` pede `pose` e `over` de cada pessoa das três fileiras.
(function (root) {
  'use strict';

  // Quadros da plateia (art/animar.py, CHEER_STEPS): 0 palma, 1, 2 braços abertos, 3, 4 palma, 5, 6 um braço para o alto, 7; e o 'ola' (os dois braços).
  const OLA = 'ola';
  const RIPPLE = 5;                       // ms de atraso por pixel de distância do começo
  const FLAGS = ['#ee2f3c', '#ffd21e', '#3a6cf0', '#35a03a', '#ff4f9e', '#ff8a12'];
  const NOTE_COLORS = ['#fff07a', '#ffd21e', '#ff8ac8', '#9fe8ff'];

  // Cada número: duração (ms), mínimo de pessoas na plateia, peso no sorteio (0 = só reage), som e cor do grito.
  const ACTS = {
    palmas: { dur: 5600, min: 10, weight: 3, sound: 'palmas', color: '#fff8c0' },
    pulapula: { dur: 5200, min: 12, weight: 2, sound: 'pulo', color: '#9ef05a' },
    bandeiras: { dur: 6400, min: 12, weight: 2, sound: 'sinos', color: '#ffd21e' },
    balanco: { dur: 6000, min: 8, weight: 2, sound: 'carinho', color: '#ff8ac8' },
    fogos: { dur: 1200, min: 6, weight: 0, sound: 'ooh', color: '#fff07a' },
    bis: { dur: 5400, min: 10, weight: 2, sound: 'vivas', color: '#ffac2a' },
    cantoria: { dur: 6400, min: 8, weight: 2, sound: 'canto', color: '#cfe3ff' },
    serpente: { dur: 5200, min: 14, weight: 2, sound: 'apito', color: '#ff7a4a' },
    pisada: { dur: 4800, min: 10, weight: 2, sound: 'pisada', color: '#ffd9a0' },
    rebola: { dur: 4200, min: 8, weight: 2, sound: 'estalo', color: '#ff4f9e' },
    oi: { dur: 1800, min: 4, weight: 0, sound: 'convidado', color: '#9ef05a' },
    ovacao: { dur: 3200, min: 8, weight: 0, sound: 'vivas', color: '#ffd21e' }
  };
  const IDS = Object.keys(ACTS);

  function create(ctx) {
    const { g, say, sayBig, float, confetti, dust, sound, fx, layout, tr, calm } = ctx;
    // O sorteio é só dos números (um gerador próprio, semeado de fora): sortear daqui não mexe na sequência de nada mais da festa, e com a
    // mesma semente a plateia faz sempre os mesmos números (os testes e as gravações dos vídeos contam com isso).
    let state = (ctx.seed ?? 20261005) >>> 0;
    const rng = ctx.rng || (() => { state = (state + 0x6d2b79f5) >>> 0; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; });
    let cur = null;               // o número que está acontecendo: { id, at, dur, origin, dir, tick, said }
    let next = 0;                 // quando o próximo sorteado começa
    let lastId = null;
    let lastEnd = 0;
    const cool = {};              // id -> até quando não repete
    const memo = new Map();       // poeira da pisada: quem já pisou nesta batida
    const stats = { started: [], pulled: 0, drawn: 0, frame: -1 };

    const crowd = () => { const lay = layout(); return lay.audience.length + lay.audience2.length + lay.audience3.length; };
    const rows = () => { const lay = layout(); return [lay.audience, lay.audience2, lay.audience3]; };
    const FIRST = [9, 14, 19];    // a altura de cada fileira (px acima do chão)
    const hash = (a, b) => (Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 17, 0xc2b2ae35)) >>> 0;
    const pick = list => list[Math.floor(rng() * list.length)];
    const anyGuest = () => { const all = rows().flat(); return all.length ? pick(all) : null; };

    // Começa um número. `origin` é o x de quem puxou (a onda nasce nele); `by` diz de onde veio ('sorteio', 'reacao' ou 'clique').
    function start(id, now, { origin = null, by = 'sorteio' } = {}) {
      const act = ACTS[id];
      if (!act) return false;
      const lay = layout();
      const x = origin !== null ? origin : (anyGuest()?.x ?? lay.L + lay.width / 2);
      cur = { id, at: now, dur: act.dur, origin: x, dir: rng() < 0.5 ? 1 : -1, tick: now, said: 0, by };
      lastId = id;
      cool[id] = now + act.dur + 20000;
      stats.started.push(id);
      if (stats.started.length > 40) stats.started.shift();
      const center = Math.max(lay.L + 30, Math.min(lay.R - 30, x));
      if (!(calm && calm())) {
        const label = tr(`fx.plateia.${id}`);
        const y = Math.max(10, ctx.ground() - 54);
        if (id === 'fogos') {
          // Três vozes soltam o "ooh" cada uma no seu tempo, em vez de um letreiro só.
          for (let k = 0; k < 3; k++) {
            const guest = anyGuest();
            if (guest) say(tr(k === 1 ? 'fx.plateia.fogos2' : 'fx.plateia.fogos'), guest.x + 6, y + 6 + k * 3, now + k * 140, act.color, 1100, 8);
          }
        } else sayBig(label, center, y, now, act.color, id === 'oi' ? 1500 : 1700, 10);
      }
      sound(act.sound);
      return true;
    }

    // De tempos em tempos a plateia faz um número sozinha (mais seguido com mais gente); só sem chuva forte, sem casamento e sem os
    // compadres recitando, e nunca no meio da ola.
    let wasDancing = null;        // a dança já estava ligada na primeira vez que se olha? Então não é "começou a dançar"
    function update(engine, now, quiet = false) {
      const dancing = !!engine?.state?.runtime?.dancing;
      if (wasDancing === false && dancing && !quiet) react('danca', now);
      wasDancing = dancing;
      if (cur && now - cur.at > cur.dur + 1600) { lastEnd = now; cur = null; memo.clear(); next = now + Math.max(12000, 30000 - crowd() * 120) * (0.7 + rng() * 0.6); }
      if (!next) next = now + 12000 + rng() * 10000;
      if (cur) { tick(engine, now); return; }
      if (now < next || quiet || fx().wave) return;
      const size = crowd();
      const choices = IDS.filter(id => ACTS[id].weight > 0 && size >= ACTS[id].min && id !== lastId && now >= (cool[id] || 0));
      if (!choices.length) { next = now + 8000; return; }
      // A cantoria é mais provável quando a Mandioca está dançando.
      const weights = choices.map(id => ACTS[id].weight * (id === 'cantoria' && dancing ? 3 : 1));
      let roll = rng() * weights.reduce((a, b) => a + b, 0);
      let chosen = choices[0];
      for (let i = 0; i < choices.length; i++) { roll -= weights[i]; if (roll <= 0) { chosen = choices[i]; break; } }
      start(chosen, now);
    }

    // O que o número solta durante todo o tempo (notinhas, corações, bis, confete, poeira).
    function tick(engine, now) {
      const c = cur;
      if (!c || now - c.at > c.dur) return;
      const t = now - c.at;
      const lay = layout();
      const quiet = !!(calm && calm());
      const every = { cantoria: 320, balanco: 700, bis: 440, ovacao: 380 }[c.id];
      if (!every || now < c.tick || quiet) return;
      c.tick = now + every;
      const guest = anyGuest();
      if (!guest) return;
      const row = rows().findIndex(list => list.includes(guest));
      const y = ctx.ground() - FIRST[Math.max(0, row)] - 24;
      if (c.id === 'cantoria') float('nota', guest.x + 4 + rng() * 4, y, now, [NOTE_COLORS[Math.floor(rng() * NOTE_COLORS.length)]]);
      else if (c.id === 'balanco') float('coracao', guest.x + 5, y, now, [rng() < 0.5 ? '#ff4f9e' : '#ff8a96']);
      else if (c.id === 'bis') say(tr('fx.plateia.bis1'), guest.x + 6, y - 2, now, '#fff8e8', 700, 6);
      else if (c.id === 'ovacao' && t < c.dur - 400) confetti(now, Math.max(lay.L + 8, Math.min(lay.R - 8, guest.x + 6)), y, 14);
    }

    // Quanto tempo desta pessoa dentro do número (ms), ou -1 se o número ainda não chegou nela ou já passou.
    function span(x, now) {
      if (!cur) return -1;
      const t = now - cur.at - Math.abs(x - cur.origin) * RIPPLE;
      return t >= 0 && t <= cur.dur ? t : -1;
    }

    // A pose desta pessoa agora: `step` (quadro 0 a 7 ou 'ola'), `hop` (negativo sobe), `dx`, `flip`; ou null se ela não está no número.
    function pose(row, guest, seed, x, now) {
      const t = span(x, now);
      if (t < 0) return null;
      const id = cur.id;
      const fade = Math.min(1, t / 400, (cur.dur - t) / 400);
      const jit = (seed % 7) * 6;
      const par = seed % 2;
      if (id === 'palmas') {
        const u = ((t + jit) % 520) / 520;
        return { step: u < 0.5 ? 0 : 2, hop: u < 0.18 ? -1 : 0, dx: 0 };
      }
      if (id === 'pulapula') {
        const u = ((t - row * 300 + 1100) % 1100) / 1100;
        const h = u < 0.5 ? Math.sin(u / 0.5 * Math.PI) : 0;
        return { step: h > 0.35 ? OLA : 0, hop: -Math.round(5 * h), dx: 0 };
      }
      if (id === 'bandeiras') {
        if (par) return { step: 6, hop: 0, dx: 0, flip: (seed >>> 3) % 2 === 0 };
        const u = ((t + jit) % 640) / 640;
        return { step: u < 0.5 ? 0 : 2, hop: 0, dx: 0 };
      }
      if (id === 'balanco') return { step: 2, hop: 0, dx: Math.round(Math.sin(t / 650) * 1.4 * fade) };
      if (id === 'fogos') return { step: OLA, hop: -Math.round(2 * Math.sin(t / cur.dur * Math.PI)), dx: 0 };
      if (id === 'bis') {
        const beat = Math.floor((t + jit) / 440);
        const u = ((t + jit) % 440) / 440;
        return { step: u < 0.55 ? 6 : 4, hop: u < 0.2 ? -1 : 0, dx: 0, flip: ((seed >>> 3) + beat) % 2 === 0 };
      }
      if (id === 'cantoria') return { step: Math.floor((t + jit) / 700) % 2 ? 1 : 3, hop: 0, dx: Math.round(Math.sin(t / 500 + row) * 1 * fade) };
      if (id === 'serpente') {
        const phase = t / 240 - cur.dir * x / 9;
        const up = Math.sin(phase);
        return { step: Math.floor(t / 200) % 2 ? 1 : 3, hop: up > 0.6 ? -1 : 0, dx: Math.round(up * 5 * fade) };
      }
      if (id === 'pisada') {
        const beat = Math.floor((t + jit) / 360);
        const u = ((t + jit) % 360) / 360;
        const mine = (beat + par) % 2 === 0;
        return { step: mine ? 2 : 0, hop: mine && u < 0.2 ? -1 : 0, dx: 0 };
      }
      if (id === 'rebola') {
        const shake = (Math.floor(t / 100) + par) % 2 ? 1 : -1;
        return { step: Math.floor(t / 300) % 2 ? 6 : 2, hop: 0, dx: shake * (fade > 0.5 ? 1 : 0), flip: shake > 0 };
      }
      if (id === 'oi') {
        const phase = Math.floor((t + jit) / 170) % 2;
        return { step: phase ? 6 : 4, hop: 0, dx: 0, flip: x > cur.origin };
      }
      if (id === 'ovacao') return { step: OLA, hop: -Math.round(3 * Math.abs(Math.sin(t / 150 + seed))), dx: 0 };
      return null;
    }

    // O enfeite de cada pessoa (por cima do sprite): a faísca da palma, a bandeirinha, a poeira da pisada.
    function over(row, guest, seed, x, top, flip, now) {
      const t = span(x, now);
      if (t < 0) return;
      stats.drawn++;
      const id = cur.id;
      if (id === 'palmas') {
        const u = ((t + (seed % 7) * 6) % 520) / 520;
        if (u < 0.18 && seed % 2 === 0) {
          g.fillStyle = '#fff8c0';
          g.fillRect(x + 6, top + 9, 3, 1);
          g.fillRect(x + 7, top + 8, 1, 3);
          g.fillStyle = '#ffd21e';
          g.fillRect(x + 4, top + 8, 1, 1);
          g.fillRect(x + 10, top + 8, 1, 1);
        }
      } else if (id === 'bandeiras' && seed % 2) {
        // O braço levantado fica do lado de onde a pessoa está virada (o sprite vem espelhado, o quadro 6 levanta o da esquerda).
        const hand = flipHand(flip, x);
        const sway = Math.round(Math.sin(now / 120 + seed));
        g.fillStyle = '#7c421e';
        g.fillRect(hand, top - 4, 1, 7);
        const color = FLAGS[seed % FLAGS.length];
        g.fillStyle = color;
        g.fillRect(hand + 1, top - 4, 4 + sway, 1);
        g.fillRect(hand + 1, top - 3, 4, 1);
        g.fillRect(hand + 1, top - 2, 3 + sway, 1);
      } else if (id === 'pisada') {
        const beat = Math.floor((t + (seed % 7) * 6) / 360);
        const u = ((t + (seed % 7) * 6) % 360) / 360;
        if (u < 0.12 && seed % 5 === 0 && (beat + seed) % 2 === 0 && memo.get(seed) !== beat && !(calm && calm())) {
          memo.set(seed, beat);
          dust(x + 7, ctx.ground() - FIRST[row] + 1, now);
        }
      }
    }
    const flipHand = (flip, x) => (flip ? x + 11 : x + 1);

    // Algo na festa chama a plateia: um fogo estoura (fogos), gente nova chega (oi), a festa sobe de porte (ovacao), a Mandioca começa a
    // dançar (cantoria), um bingo termina (pulapula) ou uma meta se cumpre (palmas). Não interrompe um número que já está no ar.
    function react(kind, now) {
      if (cur) return false;
      const wanted = { fogos: 'fogos', chegada: 'oi', porte: 'ovacao', danca: 'cantoria', bingo: 'pulapula', meta: 'palmas' }[kind];
      if (!wanted || crowd() < ACTS[wanted].min || fx().wave) return false;
      if (kind === 'fogos' && now < (cool.fogosReact || 0)) return false;
      if (kind === 'fogos') cool.fogosReact = now + 9000;
      if (wanted !== 'fogos' && wanted !== 'oi' && wanted !== 'ovacao' && now < (cool[wanted] || 0)) return false;
      return start(wanted, now, { by: 'reacao' });
    }

    // O jogador puxa um número clicando em alguém da plateia (x é onde a pessoa está): nasce nela e se espalha. Só se nenhum estiver no ar.
    function pull(x, now) {
      if (cur || fx().wave) return false;
      const size = crowd();
      const choices = IDS.filter(id => ACTS[id].weight > 0 && size >= ACTS[id].min && id !== lastId);
      if (!choices.length) return false;
      stats.pulled++;
      return start(pick(choices), now, { origin: x, by: 'clique' });
    }

    const busy = () => !!cur;
    const current = () => (cur ? { id: cur.id, at: cur.at, dur: cur.dur, by: cur.by, origin: cur.origin } : null);
    function reset() { cur = null; next = 0; lastId = null; lastEnd = 0; wasDancing = null; memo.clear(); for (const key of Object.keys(cool)) delete cool[key]; }
    const probe = () => ({ current: current(), started: stats.started.slice(), pulled: stats.pulled, drawn: stats.drawn, lastEnd });

    return { update, pose, over, react, pull, busy, current, reset, probe, start };
  }

  // O som que o jogo toca na entrada de cada número (src/som.js).
  const SOUNDS = Object.fromEntries(IDS.map(id => [id, ACTS[id].sound]));

  // No navegador vira o global `ArraiaFestaPlateia` (a festa procura ali); no Node (os testes) só é exportado, para um teste que carrega o
  // módulo não ligar os números da plateia em todos os outros testes da festa.
  const api = { create, ACTS, IDS, SOUNDS, RIPPLE, OLA };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ArraiaFestaPlateia = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
