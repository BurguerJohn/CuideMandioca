// As 36 mandioquinhas penduradas nas raízes do terreiro (e mais 4 nas das ilhas do céu): cada uma tem o seu jeito. Uma é anjinho, outra dorminhoca, outra
// medrosa, tem fantasma, astronauta, zumbi... Cada jeito é uma combinação de acessório + expressão + mania, tudo desenhado aqui
// por cima do sprite do cenário (7x10 pixels de arte) com retângulos de 1 pixel; o sprite continua sendo o do cenário.
//
// Cada mandioquinha tem uma vaga fixa na ordem de compra (a primeira que a festa ganha é a Mandi Anjinho, a 36ª é a Rita Rainha):
//   art     camadas desenhadas na frente do sprite: [x, y, linhas]; x, y são em relação ao canto de cima do sprite (a folha da
//           mandioquinha fica em 3,1 e a cabeça vai de 1 a 5 em x e de 2 a 6 em y); '.' é transparente, as letras são da PAL.
//   behind  o mesmo, mas atrás do sprite (asas, capa).
//   face    uma grade de 3 colunas (x 2 a 4) por até 4 linhas (y 3 a 6) que troca os pixels do rosto; '.' deixa como está.
//   quirk   a(s) mania(s): o que ela faz sozinha de tempos em tempos (z de sono, nota, coração, suor, vapor...).
//   tint    a cor do brilho das manias dela;  voice  o tom (semitons) do som que ela faz quando é clicada.
// Os textos (nome, jeito e fala) ficam nos arquivos de idioma: fx.mq.<id>.n, .t e .s.
(function (root) {
  'use strict';

  // As cores do desenho (as mesmas letras da paleta da arte do jogo, art/sprites.py).
  const PAL = {
    0: '#120906', 1: '#2e1812', 2: '#4a2418', 3: '#80482a', 4: '#bd7a3e', 5: '#f0b56a', 6: '#fff8e8', 7: '#efd29a', 9: '#ffffff',
    e: '#140c1c', m: '#6a1026', n: '#ff5c7a', c: '#ff8a96', Y: '#ffe27a', y: '#e3a232', o: '#94541a', R: '#ee2f3c', r: '#8a1030', Q: '#a8180e',
    X: '#fff4e4', J: '#3a6cf0', j: '#1c2f8a', b: '#a9d1ff', G: '#9ef05a', g: '#35a03a', F: '#fff07a', f: '#ffac2a', k: '#b44a0a', z: '#fffff0',
    D: '#7c421e', d: '#361a0c', l: '#c07a36', P: '#9d5cf0', I: '#cfa2ff', A: '#ffd21e', a: '#c07e08', C: '#3fd6f0', S: '#c8ccd6', s: '#5e6474',
    H: '#ff4f9e', h: '#ad1e66', q: '#ff5a1e'
  };

  const SIZE = { w: 7, h: 10 };
  // O rosto de fábrica: olhos em 2,4 e 4,4 (letra e), bochecha rosa em 3,5.
  const EYES = [[2, 4], [4, 4]];
  const MANIAS = ['zzz', 'nota', 'coracao', 'suor', 'vapor', 'brilho', 'espirro', 'tremor', 'giro', 'pulinho', 'flutuar', 'confete', 'chuvisco', 'zumbido',
    'morcego', 'sumir', 'pensar', 'rugido', 'balanco', 'cochicho', 'cambaleio', 'bolha', 'grito'];

  const ROSTER = [
    { id: 'mandi', voice: 7.5, quirk: ['brilho', 'flutuar'], tint: '#fff07a',
      behind: [[-1, 3, ['.9', '99', '99', '.9']], [6, 3, ['9.', '99', '99', '9.']]],
      art: [[1, -2, ['.AAA.', 'A...A', '.aaa.']]], face: ['...', '...', 'm3m', '.m.'] },
    { id: 'dorminhoco', voice: -5, quirk: ['zzz'], blink: false,
      art: [[1, -2, ['....9', '...RR', '..RRR', '.RRRR', 'XXXXX']], [1, 4, ['ee.ee']]], face: ['...', '...', '.m.', '...'] },
    { id: 'lulu', voice: 4.5, quirk: ['coracao'], blink: false,
      art: [[4, -1, ['.H.', 'HAH', '.H.']]], face: ['H.H', 'R.R', 'cmc', '.m.'] },
    { id: 'tico', voice: 10, quirk: ['tremor', 'suor'],
      art: [[1, 0, ['.AAA.', 'AAAAA', 'aaaaa']], [6, 3, ['b', 'b']]], face: ['9.9', '...', '.m.', '...'] },
    { id: 'pipoca', voice: 6, quirk: ['pulinho'],
      art: [[1, -1, ['.F9F.', '9F9F9', 'F9F9F']]], face: ['...', '...', 'm9m', '.m.'] },
    { id: 'nana', voice: 2.5, quirk: ['nota'], tint: '#ff8a96', blink: false,
      art: [[1, -1, ['..r..', '.RRR.', 'RRRRR', 'rrrrr']]], face: ['e.e', '3.3', '.m.', '...'] },
    { id: 'chico', voice: -7.5, quirk: ['vapor'], tint: '#d8d8e8',
      art: [[1, 3, ['RRRRR']], [6, 3, ['R', 'R']], [5, 5, ['X']]], face: ['...', '...', 'mmm', '...'] },
    { id: 'bento', voice: -3, quirk: ['brilho'], tint: '#ffffff', blink: false,
      art: [[0, 4, ['e9eee9e']], [1, 3, ['ee.ee']], [5, 4, ['.Y', 'Y.']]], face: ['...', '...', '.mm', '...'] },
    { id: 'vovo', voice: -4.5, quirk: ['vapor'], tint: '#fff4e4',
      art: [[2, -2, ['SSS', 'SSS']], [1, 0, ['.SSS.', 'SSSSS']], [1, 4, ['A.A.A']], [1, 6, ['PPPPP', '.III.']]], face: ['...', '...', '.m.', '...'] },
    { id: 'gui', voice: 1.5, quirk: ['brilho'], tint: '#3fd6f0',
      art: [[2, 1, ['SSS']], [1, 2, ['s...s']], [0, 3, ['R', 'R']], [6, 3, ['R', 'R']]], face: ['...', 'C.C', '.m.', '...'] },
    { id: 'bia', voice: 5.5, quirk: ['giro', 'nota'], tint: '#ff4f9e',
      art: [[2, -2, ['dd', 'dd']], [1, 0, ['.ddd.', 'ddddd']], [4, -1, ['HH']], [1, 3, ['e...e']], [0, 7, ['.HHHHH.', 'HhHhHhH']]],
      face: ['...', '...', '.m.', '.m.'] },
    { id: 'marquinhos', voice: -2, quirk: ['bolha'],
      art: [[0, 0, ['..YYY..', '.YYYYY.', 'yyyyyyy']], [4, 4, ['..C', 'CC.', '..C']]], face: ['...', '...', '...', '...'] },
    { id: 'fofoca', voice: 3.5, quirk: ['cochicho'], tint: '#ff90b0',
      art: [[2, 0, ['H.H', 'H.H']], [0, 5, ['A']]], face: ['..9', '...', '.R.', '...'] },
    { id: 'sebastiao', voice: -6, quirk: ['pensar'], tint: '#cfe3ff',
      art: [[3, 3, ['AAA', 'A.A', 'AAA']], [6, 6, ['A', 'A']], [2, 6, ['zzz', '.z.']]], face: ['z..', '...', '...', '...'] },
    { id: 'dr', voice: -1, quirk: ['coracao'], tint: '#ee2f3c',
      art: [[2, 0, ['S9S', 'sss']], [1, 5, ['bbbbb', '.bbb.']]], face: ['...', '...', '...', '...'] },
    { id: 'capitao', voice: -8.5, quirk: ['brilho'], tint: '#ffd21e',
      art: [[1, 0, ['.RRR.', 'RRRRR', 'rrrrr']], [2, 3, ['e', 'e']], [3, 3, ['eee']]], face: ['...', '...', 'mAm', '...'] },
    { id: 'vivi', voice: 8.5, quirk: ['brilho'], tint: '#ff4f9e',
      art: [[1, 0, ['HH.HH', 'HHhHH']], [1, 3, ['e...e']]], face: ['...', '...', '.R.', '...'] },
    { id: 'tonho', voice: -3.5, quirk: ['espirro'], tint: '#e8f4ff',
      art: [[1, 6, ['JjJjJ', '....J', '....j']], [5, 5, ['XX']]], face: ['2.2', '...', '.R.', '...'] },
    { id: 'raimundo', voice: -4, quirk: ['nota'], tint: '#ffd21e',
      art: [[0, 0, ['..ooo..', '.ooAoo.', 'ooooooo']], [2, 5, ['ddd']]], face: ['...', '...', '...', '...'] },
    { id: 'dede', voice: 2, quirk: ['pensar'], tint: '#ffd21e',
      art: [[0, 0, ['..yyy..', '.yYkYy.', 'kkkkkkk']], [3, 3, ['AAA', 'A.A', 'AAA']], [5, 6, ['d.', '.d']]], face: ['...', '...', '...', '...'] },
    { id: 'caca', voice: 3, quirk: ['vapor'], tint: '#ffffff',
      art: [[1, -2, ['.999.', '99999', '99999', 'XXXXX']], [5, 4, ['z']]], face: ['...', '...', '.mn', '...'] },
    { id: 'tiao', voice: 10.5, quirk: ['suor'], blink: false,
      art: [[1, 5, ['c...c']], [4, 7, ['HAH', '.g.']]], face: ['...', '3.3', 'ece', '.m.'] },
    { id: 'silencio', voice: -10, quirk: ['sumir'], tint: '#d8d8e8',
      art: [[1, 3, ['XXRXX']], [6, 3, ['X', 'X']], [2, 5, ['eee', 'eee']]], face: ['...', '...', '...', '...'] },
    { id: 'lili', voice: 7, quirk: ['confete'],
      art: [[2, -2, ['.F.', '.R.', 'AJA', 'RAR']]], face: ['...', '...', 'mnm', '.n.'] },
    { id: 'nico', voice: 1, quirk: ['brilho'], tint: '#cfe3ff',
      art: [[1, 3, ['RRRRR', 'R.R.R', '.R.R.']], [3, 0, ['d']]], face: ['...', '...', '...', '...'] },
    { id: 'madrinha', voice: 10.8, quirk: ['brilho', 'brilho'], tint: '#fff07a',
      behind: [[-1, 4, ['.b', 'bb', '.b']], [6, 4, ['b.', 'bb', 'b.']]],
      art: [[5, 1, ['.F', 'a.']], [3, 2, ['F']]], face: ['...', 'F.F', '...', '...'] },
    { id: 'fred', voice: -11, quirk: ['rugido'],
      art: [[1, 0, ['.G.G.', 'GGGGG', 'ggggg']]], face: ['...', 'F.F', '9.9', '...'] },
    { id: 'ralf', voice: 0.5, quirk: ['flutuar', 'brilho'], tint: '#a9d1ff',
      art: [[0, 1, ['..bbb..', '.9...b.', 'b.....b', 'b.....b', 'b.....b', 'b.....b', '.b...b.', '..bbb..']], [3, -2, ['R', 'S', 'S']]],
      face: ['...', '...', '...', '...'] },
    { id: 'conde', voice: -6.5, quirk: ['morcego'],
      behind: [[-1, 3, ['ee', 'ee', '.e']], [6, 3, ['ee', 'ee', 'e.']]],
      art: [[2, 2, ['e.e', '.e.']]], face: ['...', 'R.R', '9m9', '...'] },
    { id: 'zumbi', voice: -12, quirk: ['cambaleio'], blink: false,
      art: [[2, 1, ['HhH']], [1, 3, ['g', 'g']], [5, 3, ['e', 'e', 'e']]], face: ['9..', 'G..', 'mmm', '.9.'] },
    { id: 'pamonha', voice: 4, quirk: ['vapor'], tint: '#fff4e4',
      art: [[1, -1, ['.GYG.', 'GGYGG', 'YYYYY']]], face: ['...', '...', 'H3H', '.m.'] },
    { id: 'quim', voice: -1.5, quirk: ['balanco', 'vapor'], tint: '#ffd9b0', blink: false,
      art: [[1, 0, ['qqqqq', 'lllllD', '.lll.']], [1, 5, ['R...R']]], face: ['..e', '..3', 'm.m', '...'] },
    { id: 'zunzum', voice: 11.5, quirk: ['zumbido'],
      behind: [[-1, 3, ['.9', '99']], [6, 3, ['9.', '99']]],
      art: [[1, -1, ['A...A', '.e.e.']], [2, 6, ['AeA', '.e.']]], face: ['...', '...', '...', '...'] },
    { id: 'gil', voice: -0.5, quirk: ['chuvisco'],
      art: [[0, -1, ['..JJJ..', '.JJJJJ.', 'JjJjJjJ']]], face: ['...', '...', '.m.', 'm.m'] },
    { id: 'fausto', voice: 13, quirk: ['flutuar', 'cochicho'], tint: '#e8f4ff', blink: false,
      art: [[0, 1, ['..zzz..', '.zzzzzb', 'zzzzzzb', 'zzezezb', 'zzezezb', 'zzzezzb', 'zzzzzzb', 'zzzzzzb', 'z.zzz.b']]], face: [] },
    { id: 'rita', voice: 9.5, quirk: ['brilho'], tint: '#ffd21e',
      art: [[1, 0, ['A.A.A', 'AAAAA', 'aaRaa']], [2, 6, ['zXz']]], face: ['P.P', '...', '.m.', '...'] }
  ];

  // As quatro mandioquinhas penduradas nas raízes das ilhas flutuantes do céu (duas em cada, as festas enormes): o marcador e a noiva da
  // quadrilha, na da esquerda, e o baloeiro e a pipa, na dos balões. Os números delas seguem os das 36 (37 a 40).
  const ILHAS = [
    { id: 'marcador', voice: -9, quirk: ['grito'], tint: '#ffd21e',
      art: [[0, 0, ['..YYY..', '.YRRRY.', 'yyyyyyy']]], face: ['...', '...', 'mmm', '.m.'] },
    { id: 'noiva', voice: 5, quirk: ['coracao'], tint: '#ff90b0', blink: false,
      art: [[1, 0, ['.zzz.', 'zzzzz', 'z...z']], [0, 3, ['z.....z', 'z.....z']], [3, -1, ['H']]], face: ['...', '...', 'R.R', '.R.'] },
    { id: 'baloeiro', voice: 12, quirk: ['flutuar', 'brilho'], tint: '#ee2f3c',
      art: [[1, 0, ['.JJJ.', 'JJJJJ', 'jjjjjjj']], [4, -4, ['RRR', 'RRR', '.R.', '.d.', '.d.']]], face: ['...', '...', 'cmc', '...'] },
    { id: 'pipa', voice: -2.5, quirk: ['balanco', 'brilho'], tint: '#ffd21e',
      art: [[1, -4, ['..R..', '.RYR.', 'RYYYR', '.RYR.']], [4, -1, ['.H', '..H']]], face: ['...', '...', '.9m', '...'] }
  ];
  const CAST = ROSTER.concat(ILHAS);

  // Quem não pode ser desenhada com esses mesmos olhos (o fantasma esconde o rosto e os olhos dos outros trocam de cor) não pisca.
  const blinks = entry => entry.blink !== false;

  function create(ctx) {
    const { g, say, float, fx, tr, calm } = ctx;
    // O sorteio das mandioquinhas (jeito de cada mania, quem fala sozinha) é de um gerador só delas, semeado de fora: não gasta a sequência
    // aleatória do resto da festa (a galinha e os pintinhos, por exemplo, andam por ela) e, com a mesma semente, repete sempre o mesmo.
    let state = (ctx.seed ?? 20261005) >>> 0;
    const rng = ctx.rng || (() => { state = (state + 0x6d2b79f5) >>> 0; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; });
    const timers = new Map();           // i -> { key: próximo instante }
    let nextMurmur = 0;
    const stats = { drawn: 0, behind: 0, frame: -1, clicked: -1, intro: -1, murmured: -1, at: {} };   // para os testes (probe)

    const paint = (rows, x0, y0) => {
      rows.forEach((row, dy) => {
        for (let dx = 0; dx < row.length; dx++) {
          const color = PAL[row[dx]];
          if (color) { g.fillStyle = color; g.fillRect(x0 + dx, y0 + dy, 1, 1); }
        }
      });
    };

    const phase = i => ((i * 2654435761) >>> 0) % 4200;
    const blinking = (i, now) => (now + phase(i)) % 4200 < 130;

    function wait(i, key, now, every, jitter = 0.4) {
      let t = timers.get(i);
      if (!t) timers.set(i, t = {});
      if (t[key] === undefined) t[key] = now + (phase(i) % every);
      if (now < t[key]) return false;
      t[key] = now + every * (1 - jitter / 2 + rng() * jitter);
      return true;
    }

    // Como ela se mexe agora: quanto desloca (dx, dy) e se some de vez (a ninja, no pufe).
    function pose(i, now) {
      const entry = CAST[i];
      const out = { dx: 0, dy: 0, hide: false };
      for (const kind of entry.quirk) {
        if (kind === 'tremor') out.dx += Math.round(Math.sin(now / 38 + i) * 0.8);
        else if (kind === 'giro') out.dx += Math.round(Math.sin(now / 300 + i) * 2);
        else if (kind === 'balanco') out.dx += Math.round(Math.sin(now / 520 + i) * 1.5);
        else if (kind === 'cambaleio') out.dx += Math.round(Math.sin(now / 760 + i) * 1.4);
        else if (kind === 'flutuar') out.dy += Math.round(Math.sin(now / 700 + i) * 1.2);
        else if (kind === 'pulinho') out.dy -= (now + phase(i)) % 1900 < 140 ? 1 : 0;
        else if (kind === 'sumir') out.hide = (now + phase(i)) % 14000 < 600;
        else if (kind === 'rugido') out.dx += (now + phase(i)) % 15000 < 400 ? Math.round(Math.sin(now / 30)) : 0;
      }
      return out;
    }

    function back(i, x, y, now) {
      const entry = CAST[i];
      if (stats.frame !== now) { stats.frame = now; stats.drawn = 0; stats.behind = 0; }
      if (entry.behind) stats.behind++;
      if (entry.behind) for (const [dx, dy, rows] of entry.behind) paint(rows, x + dx, y + dy);
    }

    // Rosto, piscada, acessórios e a mania que se vê (as órbitas) por cima do sprite.
    function front(i, x, y, now) {
      const entry = CAST[i];
      if (stats.frame !== now) { stats.frame = now; stats.drawn = 0; stats.behind = 0; }
      stats.drawn++;
      stats.at[i] = [x, y];
      entry.face.forEach((row, dy) => {
        for (let dx = 0; dx < row.length; dx++) {
          const color = PAL[row[dx]];
          if (color) { g.fillStyle = color; g.fillRect(x + 2 + dx, y + 3 + dy, 1, 1); }
        }
      });
      if (blinks(entry) && blinking(i, now)) {
        g.fillStyle = PAL[2];
        for (const [ex, ey] of EYES) g.fillRect(x + ex, y + ey, 1, 1);
      }
      for (const [dx, dy, rows] of entry.art) paint(rows, x + dx, y + dy);
      if (entry.quirk.includes('zumbido')) {
        const t = now / 420 + i;
        const ox = x + 3 + Math.round(Math.cos(t) * 7), oy = y + 1 + Math.round(Math.sin(t * 1.7) * 3);
        g.fillStyle = PAL.A; g.fillRect(ox, oy, 2, 1);
        g.fillStyle = PAL.e; g.fillRect(ox, oy + 1, 2, 1);
        g.fillStyle = PAL.b; g.fillRect(ox, oy - 1, 1, 1);
      }
      if (entry.quirk.includes('morcego')) {
        const t = now / 600 + i;
        const ox = x + 3 + Math.round(Math.cos(t) * 8), oy = y - 1 + Math.round(Math.sin(t * 1.3) * 3);
        const flap = Math.floor(now / 160) % 2;
        g.fillStyle = PAL.e;
        g.fillRect(ox, oy, 1, 1);
        g.fillRect(ox - 1, oy - flap, 1, 1);
        g.fillRect(ox + 1, oy - flap, 1, 1);
      }
    }

    // Uma mania: um estalo da personalidade dela (aparece sozinha de tempos em tempos; no clique vem mais forte).
    function emit(i, kind, x, y, now, strong = false) {
      const entry = CAST[i];
      const tint = entry.tint || '#fff07a';
      const cx = x + 3;
      const puff = (n, color, dx = 0, dy = -2) => {
        for (let k = 0; k < n; k++) {
          fx().particles.push({ x: cx + dx + (rng() - 0.5) * 2, y: y + dy, vx: (rng() - 0.5) * 0.004, vy: -0.006 - rng() * 0.004, born: now,
            ttl: 900 + rng() * 500, colors: [color], smoke: true });
        }
      };
      if (kind === 'zzz') say(strong ? 'ZZZ...' : 'z', cx + 3, y - 2, now, '#cfe3ff', 1600, 8);
      else if (kind === 'nota') float('nota', cx + (rng() < 0.5 ? -4 : 3), y, now, [tint]);
      else if (kind === 'coracao') float('coracao', cx - 1, y - 2, now, [tint === '#fff07a' ? '#ff4f9e' : tint]);
      else if (kind === 'suor') fx().particles.push({ x: x + 6, y: y + 3, vx: 0.002, vy: 0.012, born: now, ttl: 420, colors: ['#a9d1ff'], drop: true });
      else if (kind === 'vapor') puff(strong ? 3 : 1, tint);
      else if (kind === 'brilho') {
        fx().particles.push({ x: x + Math.round(rng() * 6), y: y - 2 + Math.round(rng() * 5), vx: 0, vy: 0, born: now, ttl: 520, colors: [tint], shape: 'brilho' });
      } else if (kind === 'espirro') {
        say('ATCHIM!', cx, y - 4, now, '#e8f4ff', 1100, 8);
        puff(4, '#e8f4ff', 2, 2);
      } else if (kind === 'confete') {
        for (let k = 0; k < (strong ? 8 : 4); k++) {
          fx().particles.push({ x: cx + (rng() - 0.5) * 4, y: y - 2, vx: (rng() - 0.5) * 0.03, vy: -0.012 - rng() * 0.012, gravity: 0.00003, born: now,
            ttl: 700 + rng() * 300, colors: [['#ee2f3c', '#ffd21e', '#3a6cf0', '#9ef05a', '#ff4f9e'][Math.floor(rng() * 5)]] });
        }
      } else if (kind === 'chuvisco') {
        for (const side of [-4, 10]) {
          fx().particles.push({ x: x + side, y: y - 1, vx: 0, vy: 0.014, born: now, ttl: 380, colors: ['#a9d1ff'], drop: true });
        }
      } else if (kind === 'pensar') say(entry.id === 'sebastiao' ? '...' : '?', cx + 4, y - 3, now, tint, 1300, 8);
      else if (kind === 'rugido') say('RAWR!', cx, y - 4, now, '#9ef05a', 1000, 8);
      else if (kind === 'cochicho') say('psiu...', cx, y - 4, now, tint, 1200, 7);
      else if (kind === 'grito') say(tr(`fx.mq.${entry.id}.s`), cx, y - 4, now, tint, 1300, 8);
      else if (kind === 'bolha') {
        fx().particles.push({ x: x + 5, y: y + 4, vx: 0, vy: -0.01, born: now, ttl: 1100, colors: ['#cfe3ff'], wobble: rng() * 6 });
      } else if (kind === 'sumir') puff(5, '#d8d8e8', 0, 4);
    }

    const EVERY = { zzz: 2400, nota: 2600, coracao: 1900, suor: 1100, vapor: 850, brilho: 2200, espirro: 9000, confete: 4200, chuvisco: 520,
      pensar: 8500, rugido: 15000, cochicho: 16000, bolha: 1500, grito: 11000 };

    // Manias paradas no tempo (as que se desenham todo quadro estão em pose e front).
    function idle(i, x, y, now, hidden = false) {
      const t = timers.get(i) || (timers.set(i, {}), timers.get(i));
      if (!!t.hid !== hidden) {
        t.hid = hidden;
        if (CAST[i].quirk.includes('sumir')) emit(i, 'sumir', x, y, now);
      }
      if (calm && calm()) return;
      for (const kind of CAST[i].quirk) {
        if (EVERY[kind] && wait(i, kind, now, EVERY[kind])) emit(i, kind, x, y, now);
      }
    }

    // Clique: o nome por cima da fala, e a mania dela de uma vez.
    function click(i, x, y, now) {
      const entry = CAST[i];
      stats.clicked = i;
      say(tr(`fx.mq.${entry.id}.n`), x + 3, y - 14, now, '#ffd21e', 1800, 7);
      say(tr(`fx.mq.${entry.id}.s`), x + 3, y - 6, now, '#fff8e8', 1800, 7);
      for (const kind of entry.quirk) for (let k = 0; k < 3; k++) emit(i, kind, x, y, now + k * 90, true);
    }

    // Mandioquinha nova: o nome aparece e, logo depois, a fala dela.
    function intro(i, x, y, now) {
      const entry = CAST[i];
      stats.intro = i;
      say(tr('fx.mq.new', { n: tr(`fx.mq.${entry.id}.n`) }), x, Math.max(10, y - 10), now, '#9ef05a', 2000, 8);
      say(tr(`fx.mq.${entry.id}.s`), x, Math.max(10, y - 2), now + 900, '#fff8e8', 1800, 7);
    }

    // De vez em quando uma delas fala sozinha (a fala que é a cara dela).
    function murmur(count, now, spotOf) {
      if (calm && calm()) return;
      // A primeira fala só vem depois de uns segundos (não logo que a festa abre).
      if (!nextMurmur) nextMurmur = now + 15000 + rng() * 20000;
      if (now < nextMurmur) return;
      nextMurmur = now + 32000 + rng() * 40000;
      if (count < 1) return;
      const i = Math.min(count - 1, Math.floor(rng() * count));
      const spot = spotOf(i);
      if (!spot) return;
      stats.murmured = i;
      say(tr(`fx.mq.${CAST[i].id}.s`), spot.x, Math.max(10, spot.y - 8), now, '#fff8e8', 1800, 7);
    }

    const probe = () => ({ ...stats, at: { ...stats.at } });

    return { pose, back, front, idle, click, intro, murmur, probe };
  }

  // No navegador vira o global `ArraiaFestaMandioquinhas`; no Node (os testes) só é exportado (ver src/festa-plateia.js).
  const api = { create, ROSTER, ILHAS, CAST, PAL, SIZE, MANIAS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ArraiaFestaMandioquinhas = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
