// Os eventos de tema do mundo na festa (o motor é src/mundo.js, os dados estão em `data.mundo.eventos` com `tema`): doze eventos que só entram no sorteio
// com um conjunto completo de um tema da loja vestido (dinossauros, Halloween ou zumbis). Este arquivo só traz o que cada um tem de próprio: onde ficam os
// alvos (`TARGETS`, a posição sai do tempo do evento, como em src/festa-mundo.js), o céu (`SKY`, atrás da festa), o ar e os bichos (`OVER`, por cima),
// os vestígios que ficam no chão (`TRACE`) e as reações a um clique (`catchFx`) ou a um golpe (`hitFx`). Quem chama é src/festa-mundo.js, que passa os
// ajudantes de desenho (`halo`, `say`, `tint`...). Tudo é desenhado com retângulos, como o resto da festa; cores por cima usam 'source-atop' (a
// janela é transparente).
(function (root) {
  'use strict';

  const Formas = typeof module === 'object' && module.exports ? require('./festa-mundo-formas.js') : root.ArraiaMundoFormas;
  const TAU = Math.PI * 2;
  const R = Math.round;
  // Quanto tempo (ms) os vestígios de cada evento ficam na festa (cascas de ovo e poças de gosma).
  const TRACE_MS = { ovos: 90000, gosma: 100000 };
  // Os eventos que balançam a festa (a debandada da manada pisa forte).
  const STOMP_MS = 880;

  function create(h) {
    const { g, halo, say, float, confetti, sound, rng, fx, layout, ground, poleTop, tint, particle, rnd, clamp, spread, step, tr } = h;
    let hatchlings = [];     // as crias que saíram do ovo: { x, y, born, side }
    let cured = [];          // os zumbis que ganharam a pamonha: { x, y, born, side }
    let ambientAt = 0;       // a próxima fala ou som de ambiente
    let ambientKey = '';
    const landed = new Set(); // as gotas de gosma que já bateram no chão (`<nascimento>:<alvo>`)

    // --- Formas (src/festa-mundo-formas.js) ---------------------------------------------------------------------------------------------
    const { rect, mirror, disc, ellipse, tri, bit, skyBottom, fogBand, dodge } = Formas.shapes(g, poleTop);
    // Uma fala ou um som de ambiente de tempos em tempos, uma vez por evento (a chave é o nascimento dele).
    const every = (c, now, ms, first = ms) => {
      const key = `${c.id}:${c.a.born}`;
      if (key !== ambientKey) { ambientKey = key; ambientAt = now + first; }
      if (now < ambientAt) return false;
      ambientAt = now + ms * (0.8 + rng() * 0.4);
      return true;
    };

    // --- Dinossauros ----------------------------------------------------------------------------------------------------------------
    // Pterodátilo levando uma bandeirinha no bico: asas largas batendo (a fase depende de `k`), crista vermelha, bico comprido.
    function ptero(x, y, d, now, k) {
      const put = mirror(x, y, d);
      const flap = Math.sin(now / 105 + k * 1.9);
      // A asa de trás (mais escura e curta), o corpo e a asa da frente, grande, com a borda da frente mais escura.
      tri(x + d * 2, y - 2, x - d * 4, y + 1, x - d * 6, y - 8 * flap - 4, '#a85a22');
      put(-4, -1, 9, 3, '#7aa84a');
      put(-3, 2, 7, 1, '#c8d890');
      put(-8, 0, 4, 1, '#4a7a2e');
      put(-10, 1, 2, 1, '#4a7a2e');
      put(4, -3, 4, 3, '#7aa84a');
      put(8, -2, 6, 1, '#ffd21e');
      put(8, -1, 4, 1, '#e8a812');
      put(6, -3, 1, 1, '#26242e');
      put(1, -5, 5, 2, '#e0343e');
      put(0, -4, 2, 1, '#e0343e');
      tri(x + d * 4, y - 2, x - d * 3, y + 2, x - d * 13, y - 11 * flap - 5, '#e89a48');
      tri(x + d * 4, y - 2, x + d * 1, y - 2, x - d * 13, y - 11 * flap - 5, '#c8742a');
      // A bandeirinha pendurada no bico, balançando.
      const sway = R(Math.sin(now / 150 + k));
      put(13, -1, 1, 2, '#fffaf0');
      put(12 + sway, 1, 4, 3, '#ee2f3c');
      put(12 + sway, 1, 4, 1, '#ffd21e');
    }
    // A cria de dinossauro de chapéu de palha (junina): corre com as perninhas alternando.
    function baby(x, y, d, now, k, jump = 0) {
      const put = mirror(x, y - jump, d);
      const f = Math.floor(now / 110 + k) % 2;
      put(-3, 3, 2, 2 + f, '#3a9a44');
      put(1, 3, 2, 3 - f, '#3a9a44');
      put(-5, -2, 8, 5, '#56c860');
      put(-4, 2, 6, 1, '#c8f0a0');
      put(-9, 0, 4, 2, '#56c860');
      put(-11, 1, 2, 1, '#56c860');
      put(3, -5, 5, 5, '#56c860');
      put(6, -4, 1, 1, '#26242e');
      put(7, -1, 1, 1, '#2e8a44');
      put(-3, -3, 1, 1, '#ff8a12');
      put(-1, -3, 1, 1, '#ff8a12');
      put(1, -3, 1, 1, '#ff8a12');
      // O chapéu de palha com a fita vermelha.
      put(2, -8, 7, 1, '#e8c060');
      put(4, -10, 3, 2, '#c89a30');
      put(4, -9, 3, 1, '#ee2f3c');
    }
    // Os gigantes que passam ao longe, atrás da festa: braquiossauros enormes (`sc` é o tamanho) em silhueta azul-esverdeada, de corpo oval, pescoço
    // curvo e comprido, cabecinha e rabo afinando. Do corpo só se vê o que passa por cima da turma; o pescoço e a cabeça aparecem lá no alto.
    // Cada curva é feita carimbando discos (opacos: com transparência os discos que se cruzam escureciam).
    function giant(x, base, d, now, i, sc) {
      const dark = '#24383c';
      const light = '#3c5a5e';
      const wx = dx => x + d * dx * sc;
      const wy = dy => base + dy * sc;
      const stride = Math.sin(now / 260 + i * 1.3);
      // As quatro pernas grossas, duas subindo e duas descendo.
      for (const [leg, phase] of [[-11, 1], [-4, -1], [4, 1], [11, -1]]) {
        const lift = R(stride * phase * 2 * sc);
        g.fillStyle = dark;
        g.fillRect(R(wx(leg) - (d > 0 ? 0 : 5 * sc)), R(wy(-12) - lift), R(5 * sc), R(12 * sc) + lift);
      }
      ellipse(wx(2), wy(-18), R(17 * sc), R(8 * sc), dark);
      ellipse(wx(2), wy(-21), R(14 * sc), R(4 * sc), light);
      // O pescoço: uma curva do peito para cima, afinando; a cabeça é um oval pequeno com o focinho para a frente.
      const neck = t => ({ x: 12 + 12 * t - 6 * t * t * 0, y: -22 - 36 * t + 6 * Math.sin(t * Math.PI) });
      for (let t = 0; t <= 1.001; t += 0.045) {
        const p = neck(t);
        disc(wx(p.x), wy(p.y), Math.max(1, R((4.6 - 2.8 * t) * sc)), dark);
      }
      ellipse(wx(27), wy(-60), R(5 * sc), R(2.4 * sc), dark);
      ellipse(wx(26), wy(-61), R(3 * sc), R(1.2 * sc), light);
      // O rabo comprido, afinando até a ponta.
      for (let t = 0; t <= 1.001; t += 0.06) {
        disc(wx(-14 - 30 * t), wy(-17 + 9 * t + Math.sin(now / 500 + i + t * 4) * 1.5), Math.max(1, R((4 - 3 * t) * sc)), dark);
      }
    }

    // Ovo malhado na palha, que balança quanto mais perto de nascer; cada golpe (`hits`) abre uma rachadura nova.
    function egg(x, y, hits, now, k, wobble) {
      const wob = R(Math.sin(now / 70 + k) * wobble);
      rect(x - 7, y + 6, 15, 2, '#c89a30');
      rect(x - 5, y + 5, 11, 1, '#e8c060');
      const cx = x + wob;
      ellipse(cx, y, 5, 7, '#f4ecd0');
      ellipse(cx + 2, y + 1, 3, 6, '#dcd0a8');
      rect(cx - 3, y - 5, 2, 2, '#fffef0');
      const spots = k % 2 ? ['#6aa84a', '#c87a3a'] : ['#c87a3a', '#6aa84a'];
      rect(cx - 2, y - 1, 2, 2, spots[0]);
      rect(cx + 1, y + 2, 2, 2, spots[1]);
      rect(cx - 3, y + 3, 1, 1, spots[0]);
      rect(cx + 2, y - 3, 1, 1, spots[1]);
      if (hits >= 1) {
        // Primeira rachadura, em zigue-zague, no alto do ovo.
        for (const [dx, dy] of [[0, -6], [1, -5], [0, -4], [-1, -3]]) rect(cx + dx, y + dy, 1, 1, '#4a3a1a');
      }
      if (hits >= 2) {
        // A segunda, atravessando o meio, e a casquinha aberta mostrando a cria lá dentro.
        for (const [dx, dy] of [[-4, 0], [-3, 1], [-2, 0], [-1, 1], [0, 0], [1, 1], [2, 0], [3, 1]]) rect(cx + dx, y + dy, 1, 1, '#4a3a1a');
        rect(cx - 2, y - 3, 3, 2, '#56c860');
        rect(cx - 1, y - 3, 1, 1, '#26242e');
      }
    }
    // A bola de fogo: pedra escura rachada de lava, com as chamas para trás (de onde veio) e brasas caindo.
    function meteor(x, y, size, trailDir, now) {
      for (let i = 1; i <= 34; i++) {
        const along = i * 2.2;
        const wob = Math.sin(now / 90 + i * 0.7) * (1 + i * 0.05);
        const px = x - trailDir * along * 1.1;
        const py = y - along * 0.55 + wob;
        g.globalAlpha = 0.8 * (1 - i / 36);
        g.fillStyle = i < 6 ? '#fff4a0' : i < 14 ? '#ffb02a' : '#e0481a';
        const s = Math.max(2, R(size * 0.45 * (1 - i / 40)));
        g.fillRect(R(px - s / 2), R(py - s / 2), s, s);
      }
      g.globalAlpha = 1;
      halo(x, y, size * 2.4, '#ff6a2a', 0.55);
      halo(x, y, size * 1.4, '#ffd27a', 0.5);
      disc(x, y, size + 2, '#e0481a');
      disc(x, y, size, '#3a2a2a');
      disc(x - size * 0.3, y - size * 0.3, R(size * 0.55), '#5a4040');
      g.fillStyle = '#ff8a12';
      for (const [dx, dy, w] of [[-0.5, -0.1, 0.6], [0.1, 0.3, 0.5], [-0.2, 0.55, 0.35], [0.45, -0.4, 0.3]]) g.fillRect(R(x + dx * size), R(y + dy * size), Math.max(1, R(w * size * 0.5)), 1);
      g.fillStyle = '#ffd21e';
      for (const [dx, dy] of [[-0.3, 0], [0.3, 0.3], [0, -0.55], [0.5, -0.1]]) g.fillRect(R(x + dx * size), R(y + dy * size), 1, 1);
    }

    // --- Halloween ------------------------------------------------------------------------------------------------------------------
    const BAT = [['b.....b', 'bb...bb', 'bbbbbbb', '.b.b.b.'], ['..b.b..', '.bbbbb.', 'bbbbbbb', 'b..b..b']];
    const bat = (x, y, now, i, color = '#1a1226') => {
      BAT[Math.floor(now / 140 + i) % 2].forEach((row, dy) => [...row].forEach((ch, dx) => { if (ch === 'b') { g.fillStyle = color; g.fillRect(R(x + dx), R(y + dy), 1, 1); } }));
    };
    // A bruxa na vassoura (de lado, olhando para onde voa), com um gato preto na ponta e o chapéu de ponta torta.
    function witch(x, y, d, now, k) {
      const put = mirror(x, y + R(Math.sin(now / 200 + k) * 1), d);
      // Palha da vassoura para trás e o cabo.
      put(-15, 1, 6, 4, '#c89a30');
      put(-15, 2, 6, 1, '#8a5a2a');
      put(-13, 3, 4, 1, '#e8c060');
      put(-9, 2, 18, 1, '#8a5a2a');
      // O gato de pé na ponta de trás.
      put(-10, -3, 4, 5, '#1a1226');
      put(-10, -5, 1, 2, '#1a1226');
      put(-7, -5, 1, 2, '#1a1226');
      put(-9, -2, 1, 1, '#ffd21e');
      put(-7, -2, 1, 1, '#ffd21e');
      put(-12, -1, 2, 1, '#1a1226');
      // A bruxa: capa roxa, cabeça verde com o narigão, pernas penduradas.
      put(-3, -5, 6, 7, '#6a2a9a');
      put(-3, 0, 6, 1, '#4a1a7a');
      put(-1, 3, 2, 3, '#1a1226');
      put(2, 3, 2, 3, '#1a1226');
      put(0, -9, 5, 4, '#9ad06a');
      put(5, -7, 2, 1, '#9ad06a');
      put(2, -8, 1, 1, '#26242e');
      put(-1, -8, 2, 3, '#b0b0b8');
      // O chapéu: aba larga, cone torto e a fita laranja.
      put(-1, -10, 9, 1, '#1a1226');
      put(1, -12, 5, 2, '#1a1226');
      put(2, -14, 3, 2, '#1a1226');
      put(4, -16, 2, 2, '#1a1226');
      put(1, -11, 5, 1, '#ff8a12');
      // A mão na frente do cabo.
      put(3, -3, 3, 2, '#9ad06a');
    }
    // A abóbora de lanterna: apagada (escura, olhos vazios) ou acesa (a luz amarela sai pelo rosto).
    function jack(x, y, lit, now, k, big = false) {
      const wob = big ? R(Math.sin(now / 120) * 1) : 0;
      const flick = lit ? 0.5 + 0.3 * Math.sin(now / 90 + k * 3) + 0.2 * Math.sin(now / 37 + k) : 0;
      if (lit) halo(x, y, 14, '#ffb02a', 0.3 + 0.25 * flick);
      ellipse(x + wob, y, 8, 6, lit ? '#ff8a12' : '#8a4a10');
      ellipse(x + wob, y + 1, 5, 5, lit ? '#ffa03a' : '#a05a14');
      rect(x + wob - 5, y - 4, 1, 9, lit ? '#d86a0a' : '#6a3408');
      rect(x + wob + 4, y - 4, 1, 9, lit ? '#d86a0a' : '#6a3408');
      rect(x + wob - 1, y - 8, 3, 3, '#3a7a2a');
      rect(x + wob + 1, y - 9, 2, 1, '#3a7a2a');
      const eye = lit ? '#fff07a' : '#2a1408';
      rect(x + wob - 5, y - 3, 3, 3, eye);
      rect(x + wob + 3, y - 3, 3, 3, eye);
      rect(x + wob - 4, y - 4, 1, 1, eye);
      rect(x + wob + 4, y - 4, 1, 1, eye);
      // A boca de dentes: zigue-zague.
      for (let i = 0; i < 5; i++) rect(x + wob - 5 + i * 2, y + 2 + (i % 2), 2, 2, eye);
    }
    // Fantasma de lençol com chapéu de palha: some e aparece (`a` é a opacidade), boiando.
    function ghost(x, y, a, now, k) {
      const bob = R(Math.sin(now / 300 + k * 2) * 2);
      const gy = y + bob;
      g.globalAlpha = a * 0.28;
      halo(x, gy, 14, '#9ad0ff', a * 0.5);
      g.globalAlpha = a * 0.92;
      ellipse(x, gy - 3, 5, 5, '#f4f8ff');
      rect(x - 5, gy - 3, 11, 9, '#f4f8ff');
      for (let i = 0; i < 4; i++) rect(x - 5 + i * 3 + (Math.floor(now / 260 + i) % 2), gy + 6, 2, 2 + (i % 2), '#f4f8ff');
      rect(x - 6, gy + 1, 2, 4, '#dce6f4');
      rect(x + 5, gy + 1, 2, 4, '#dce6f4');
      rect(x + 2, gy - 2, 3, 8, '#dce6f4');
      rect(x - 3, gy - 4, 2, 3, '#26242e');
      rect(x + 1, gy - 4, 2, 3, '#26242e');
      rect(x - 1, gy + 1, 2, 2, '#26242e');
      // O chapéu de palha.
      rect(x - 6, gy - 9, 13, 1, '#e8c060');
      rect(x - 3, gy - 12, 7, 3, '#c89a30');
      rect(x - 3, gy - 10, 7, 1, '#ee2f3c');
      g.globalAlpha = 1;
    }
    // A aranha pendurada no fio de teia: o corpo balança (e treme mais logo depois de um golpe, `shake`).
    function spider(x, y, shake, now, k) {
      const sx = x + R(Math.sin(now / 45) * shake);
      g.globalAlpha = 0.6;
      rect(x, 0, 1, y - 4, '#e8e8f4');
      g.globalAlpha = 1;
      ellipse(sx, y + 2, 4, 5, '#1a1226');
      disc(sx, y - 3, 3, '#1a1226');
      rect(sx - 1, y + 2, 2, 2, '#e0343e');
      rect(sx - 2, y - 4, 1, 1, '#e0343e');
      rect(sx + 1, y - 4, 1, 1, '#e0343e');
      const kick = Math.floor(now / 140 + k) % 2;
      g.fillStyle = '#1a1226';
      for (let i = 0; i < 4; i++) {
        const dy = -3 + i * 2 + (kick && i % 2 ? 1 : 0);
        g.fillRect(sx - 5 - i, y + dy, 2, 1);
        g.fillRect(sx + 4 + i, y + dy, 2, 1);
        g.fillRect(sx - 7 - i, y + dy + (i < 2 ? 1 : -1), 2, 1);
        g.fillRect(sx + 6 + i, y + dy + (i < 2 ? 1 : -1), 2, 1);
      }
    }

    // --- Zumbis ---------------------------------------------------------------------------------------------------------------------
    // O zumbi arrastando os pés, de braços esticados e camisa de chita rasgada (`tone` é a pele: verde, ou rosada depois de curado).
    function zombie(x, y, d, now, k, tone = '#8ab870') {
      const put = mirror(x, y, d);
      const step = Math.floor(now / 300 + k) % 2;
      const lurch = step ? 1 : 0;
      put(-3 + lurch, 5, 3, 5, '#3a4a7a');
      put(1 - lurch, 5, 3, 5, '#3a4a7a');
      put(-4 + lurch, 9, 4, 1, '#26242e');
      put(0 - lurch, 9, 4, 1, '#26242e');
      put(-4, -4, 9, 9, '#d8343e');
      put(-3, -3, 2, 2, '#ffd21e');
      put(0, 0, 2, 2, '#ffd21e');
      put(-4, 3, 2, 2, '#d8343e');
      put(-4, 5, 1, 1, '#d8343e');
      put(3, 4, 2, 1, '#9a1a2e');
      // Cabeça com o cabelo bagunçado, olhos (um vermelho) e a boca aberta.
      put(-3, -10, 7, 6, tone);
      put(-3, -11, 7, 2, '#3a3a2a');
      put(-4, -9, 1, 2, '#3a3a2a');
      put(2, -8, 2, 1, '#ffffff');
      put(3, -8, 1, 1, '#e0343e');
      put(-1, -8, 1, 1, '#ffffff');
      put(0, -6, 3, 1, '#2a1a1a');
      // Os dois braços esticados para a frente, um mais alto.
      put(4, -4 + lurch, 7, 2, tone);
      put(4, -1 - lurch, 6, 2, tone);
      put(10, -4 + lurch, 1, 2, '#6a9a50');
    }
    // A gota de gosma tóxica: gota de ponta para cima, verde forte, com brilho.
    function slime(x, y, now, k) {
      halo(x, y, 10, '#7aff4a', 0.3 + 0.1 * Math.sin(now / 130 + k));
      tri(x, y - 8, x - 4, y + 1, x + 4, y + 1, '#7aff4a');
      disc(x, y + 2, 4, '#7aff4a');
      rect(x - 2, y, 1, 3, '#d8ffb0');
      rect(x + 2, y + 3, 2, 1, '#3aa82a');
      rect(x - 1, y + 5, 3, 1, '#3aa82a');
    }
    // O helicóptero de resgate, olhando para onde voa (`d`): cabine com vidro, rotor borrado, cauda e patins; o farol cai em cone até o chão.
    function heli(x, y, d, now) {
      const put = mirror(x, y, d);
      // O cone de luz do farol.
      g.globalAlpha = 0.1;
      for (let i = 0; i < 30; i++) {
        const w = 2 + i;
        g.fillStyle = '#fffbd0';
        g.fillRect(R(x + d * (6 + i * 0.35) - w / 2), R(y + 5 + i * (Math.max(0, ground() - y - 5) / 30)), w, Math.max(1, R((ground() - y - 5) / 30) + 1));
      }
      g.globalAlpha = 1;
      put(-18, -2, 11, 2, '#4a6a4a');
      put(-20, -5, 2, 5, '#4a6a4a');
      put(-23, -6 + (Math.floor(now / 50) % 2) * 3, 4, 1, '#26242e');
      ellipse(x, y, 9, 5, '#4a6a4a');
      put(-4, 2, 12, 2, '#3a5a3a');
      put(3, -3, 5, 4, '#bfe8ff');
      put(4, -3, 1, 2, '#ffffff');
      put(-5, -1, 4, 3, '#fffaf0');
      put(-4, -1, 2, 3, '#e0343e');
      put(-5, 0, 4, 1, '#e0343e');
      put(-9, 6, 18, 1, '#26242e');
      put(-5, 4, 1, 2, '#26242e');
      put(5, 4, 1, 2, '#26242e');
      put(-1, -6, 2, 2, '#26242e');
      // O rotor: duas posições se alternando (a lâmina "borra").
      const long = Math.floor(now / 45) % 2;
      put(long ? -14 : -9, -7, long ? 28 : 18, 1, '#26242e');
      put(long ? -11 : -6, -8, long ? 22 : 12, 1, 'rgba(38, 36, 46, 0.4)');
      put(8, -2, 1, 1, '#ff3a3a');
    }
    // A caixa de suprimentos no paraquedas, balançando.
    function crate(x, y, now, k) {
      const sw = Math.sin(now / 420 + k * 2) * 2;
      const cx = x + sw;
      const top = y - 9;
      for (let i = -9; i <= 9; i++) {
        const rise = R(4 * Math.sqrt(Math.max(0, 1 - (i * i) / 81)));
        rect(cx + i, top - rise, 1, rise + 1, Math.floor((i + 9) / 3) % 2 ? '#fffaf0' : '#ff8a12');
      }
      rect(cx - 9, top + 1, 19, 1, '#c86a0a');
      g.fillStyle = 'rgba(255, 250, 240, 0.8)';
      for (let i = 0; i <= 5; i++) {
        g.fillRect(R(cx - 8 + i * 0.5), top + 2 + i, 1, 1);
        g.fillRect(R(cx + 8 - i * 0.5), top + 2 + i, 1, 1);
      }
      rect(cx - 4, y - 1, 9, 8, '#8a5a2a');
      rect(cx - 4, y - 1, 9, 1, '#b07a3a');
      rect(cx - 4, y + 3, 9, 1, '#6a4420');
      rect(cx - 1, y, 3, 6, '#fffaf0');
      rect(cx - 2, y + 2, 5, 2, '#fffaf0');
      rect(cx - 1, y + 1, 1, 4, '#e0343e');
      rect(cx - 1, y + 2, 3, 2, '#e0343e');
      halo(cx, y + 2, 11, '#fff4a0', 0.15);
    }
    // A cova: monte de terra com a lápide (e a cruz) e, se ainda não foi empurrada, a mão do zumbi saindo dela (`raise` em px).
    function grave(x, y, raise, done, now, k) {
      tri(x - 9, y + 5, x + 9, y + 5, x, y - 2, '#4a3220');
      rect(x - 8, y + 3, 17, 2, '#3a2616');
      // A lápide atrás, com a cruz.
      rect(x - 9, y - 8, 7, 12, '#8a8c98');
      rect(x - 9, y - 8, 7, 1, '#b0b2bc');
      rect(x - 7, y - 6, 3, 1, '#4a4c58');
      rect(x - 6, y - 7, 1, 5, '#4a4c58');
      rect(x - 9, y + 3, 3, 1, '#4a8a3a');
      if (done) {
        // Cova encerrada: um raminho de flor no monte.
        rect(x + 3, y - 3, 1, 4, '#3a7a2a');
        rect(x + 2, y - 5, 3, 2, '#ff8ac8');
        rect(x + 3, y - 4, 1, 1, '#ffd21e');
        return;
      }
      const wob = R(Math.sin(now / 130 + k * 2) * (1 + raise * 0.1));
      // O braço verde e a mão aberta, com os dedos.
      rect(x + 2 + wob, y - raise, 3, raise + 2, '#8ab870');
      rect(x + 1 + wob, y - raise - 3, 5, 3, '#8ab870');
      rect(x + wob, y - raise - 5, 1, 3, '#8ab870');
      rect(x + 2 + wob, y - raise - 6, 1, 3, '#8ab870');
      rect(x + 4 + wob, y - raise - 6, 1, 3, '#8ab870');
      rect(x + 6 + wob, y - raise - 5, 1, 3, '#8ab870');
      rect(x + 2 + wob, y - raise + 1, 3, 1, '#6a9a50');
      rect(x + 3 + wob, y - raise - 1, 2, 1, '#d8343e');
    }

    // --- Onde ficam os alvos ---------------------------------------------------------------------------------------------------------
    const TARGETS = {
      // Pterodátilos: cruzam o céu de um lado ao outro planando, cada um com a sua altura.
      pterodatilos(c, k, lay) {
        const p = spread(c, k, 2000, step(c, 2000, 9000), 8500);
        if (p < 0) return null;
        const from = c.dir > 0 ? lay.L - 18 : lay.R + 18;
        const x = from + c.dir * (lay.width + 36) * p;
        const y = 8 + rnd(c.seed, k, 2) * Math.max(4, skyBottom() - 24) + Math.sin(p * 7 + k) * 3;
        return { x, y, w: 25, h: 15, p };
      },
      // Filhotes: correm pelo chão atrás da manada, na mesma direção dela, dando pulinhos.
      manada(c, k, lay) {
        const p = spread(c, k, 2500, step(c, 2500, 9500), 8000);
        if (p < 0) return null;
        const from = c.dir > 0 ? lay.L - 14 : lay.R + 14;
        const x = from + c.dir * (lay.width + 28) * p;
        return { x, y: ground() - 8 - Math.abs(Math.sin(p * 46 + k)) * 3, w: 17, h: 15, p };
      },
      // Ovos de dinossauro no chão da frente, cada um num ninho de palha.
      ovos(c, k, lay) {
        const x = dodge(lay.L + lay.width * (0.14 + 0.24 * k) + (rnd(c.seed, k) - 0.5) * 10, lay, 24, 30);
        return { x, y: ground() - 5, w: 15, h: 17, p: 0 };
      },
      // O meteoro: um só, grande, que desce do canto até o meio da festa e vai se desfazendo (os golpes o encolhem).
      meteoro(c, k, lay) {
        if (c.t < 1200) return null;
        const q = clamp((c.t - 1200) / (c.dur - 1200), 0, 1);
        const sx = lay.L + lay.width * (c.dir > 0 ? 0.06 : 0.94);
        const ex = lay.L + lay.width * 0.5;
        const x = sx + (ex - sx) * Math.min(1, q * 1.12);
        const hits = (c.a.hits && c.a.hits[0]) || 0;
        const size = 6 + R(7 * (1 - hits / c.entry.hits));
        const y = size + 3 + (skyBottom() * 0.7) * Math.min(1, q * 1.12);
        return { x, y, w: size * 2 + 6, h: size * 2 + 6, p: q, size };
      },
      // Bruxas: cruzam o céu de um lado ao outro nas vassouras, cada uma numa altura.
      bruxas(c, k, lay) {
        const p = spread(c, k, 2000, step(c, 2000, 9000), 8500);
        if (p < 0) return null;
        const from = c.dir > 0 ? lay.L - 20 : lay.R + 20;
        const x = from + c.dir * (lay.width + 40) * p;
        const y = 12 + rnd(c.seed, k, 2) * Math.max(4, skyBottom() - 28) + Math.sin(p * 9 + k * 2) * 3;
        return { x, y, w: 27, h: 22, p };
      },
      // Abóboras na fila do chão; só a próxima da ordem está acesa.
      abobora(c, k, lay) {
        const x = dodge(lay.L + lay.width * (0.1 + 0.16 * k), lay, 20, 26);
        return { x, y: ground() - 7, w: 19, h: 17, p: 0 };
      },
      // Fantasmas: ficam boiando num cantinho cada um e somem e voltam (só dá para clicar enquanto estão visíveis).
      fantasmas(c, k, lay) {
        const wave = Math.sin(c.t / 520 + rnd(c.seed, k, 4) * TAU);
        if (wave < -0.3) return null;
        const a = clamp((wave + 0.3) / 0.5, 0.3, 1);
        const x = lay.L + 16 + rnd(c.seed, k) * (lay.width - 32) + Math.sin(c.t / 1900 + k) * 12;
        const y = ground() - 20 - rnd(c.seed, k, 1) * 36 + Math.sin(c.t / 700 + k) * 4;
        return { x, y, w: 17, h: 25, a, p: 0 };
      },
      // Aranhas penduradas no fio: sobem e descem, cada uma na sua posição.
      luasangue(c, k, lay) {
        const x = lay.L + lay.width * (0.2 + 0.3 * k);
        const len = 20 + 18 * (0.5 + 0.5 * Math.sin(c.t / 1100 + k * 2.1));
        return { x, y: 6 + len, w: 21, h: 19, p: 0 };
      },
      // Zumbis: entram de um lado e do outro (um de cada vez), arrastando os pés até uns 70% da festa, aos tranquitos.
      horda(c, k, lay) {
        const p = spread(c, k, 2000, step(c, 2000, 9500), 9500);
        if (p < 0) return null;
        const side = k % 2 === 0 ? 1 : -1;
        const x0 = side > 0 ? lay.L - 8 : lay.R + 8;
        const reach = lay.width * (0.55 + 0.25 * rnd(c.seed, k));
        const lurch = Math.floor(p * 34) / 34;
        return { x: x0 + side * reach * (0.5 * p + 0.5 * lurch), y: ground() - 9, w: 15, h: 23, p, side };
      },
      // Gotas de gosma: caem aceleradas do céu; se ninguém estourar, batem no chão e fazem uma poça.
      gosma(c, k, lay) {
        const p = spread(c, k, 2200, step(c, 2200, 9500), 5600);
        if (p < 0) return null;
        const x = lay.L + 12 + rnd(c.seed, k) * (lay.width - 24);
        return { x, y: 2 + p ** 1.6 * (ground() - 12), w: 13, h: 17, p };
      },
      // Caixas de suprimentos: o helicóptero cruza a festa e solta uma na frente de cada ponto; ela desce balançando no paraquedas.
      helicoptero(c, k, lay) {
        const at = crateAt(c, k, lay);
        const p = (c.t - at.t0) / 7200;
        if (p < 0 || p >= 1) return null;
        return { x: at.x + Math.sin(p * 9 + k) * 4, y: at.y + p * (ground() - 12 - at.y), w: 21, h: 25, p };
      },
      // Covas: uma para cada mão, paradas no chão da frente.
      surto(c, k, lay) {
        const x = dodge(lay.L + lay.width * (0.14 + 0.24 * k) + (rnd(c.seed, k) - 0.5) * 8, lay, 24, 30);
        const hits = (c.a.hits && c.a.hits[k]) || 0;
        return { x, y: ground() - 6, w: 21, h: 23, p: 0, hits };
      }
    };

    // O helicóptero cruza a festa (de um lado até o outro) durante quase todo o evento; a caixa k sai quando ele passa pelo ponto dela.
    const heliY = () => 14 + Math.max(4, skyBottom() * 0.28);
    function heliPos(c, lay) {
      const q = clamp((c.t - 1000) / Math.max(1, c.dur - 3500), 0, 1);
      const from = c.dir > 0 ? lay.L - 30 : lay.R + 30;
      return { x: from + c.dir * (lay.width + 60) * q, y: heliY(), q };
    }
    function crateAt(c, k, lay) {
      const frac = c.n > 1 ? 0.1 + 0.8 * k / (c.n - 1) : 0.5;
      const q = (frac * lay.width + 30) / (lay.width + 60);
      return { x: c.dir > 0 ? lay.L + frac * lay.width : lay.R - frac * lay.width, y: heliY() + 4, t0: 1000 + Math.max(1, c.dur - 3500) * q };
    }

    // --- O céu (atrás da festa) ----------------------------------------------------------------------------------------------------
    // Os gigantes da debandada: quatro silhuetas (braquiossauros e tricerátops) cruzando ao longe, atrás da festa.
    function herd(c, lay) {
      const q = clamp((c.t - 800) / Math.max(1, c.dur - 4000), 0, 1);
      const from = c.dir > 0 ? lay.L - 60 : lay.R + 60;
      const run = lay.width + 60 + 2 * 96 + 90;
      return [0, 1, 2].map(i => ({ i, x: from + c.dir * (run * q - i * 96), sc: [2.1, 2.7, 2.3][i] }));
    }
    const SKY = {
      manada(c, now) {
        const lay = layout();
        g.globalAlpha = 0.85 * c.k;
        for (const big of herd(c, lay)) giant(big.x, ground() - 3, c.dir, now, big.i, big.sc);
        g.globalAlpha = 1;
      },
      // A lua vermelha, enorme, com a luz em volta, e um bando de morcegos atravessando.
      luasangue(c, now) {
        const lay = layout();
        const mx = R(lay.L + lay.width * 0.74);
        const my = Math.max(20, R(poleTop() * 0.5));
        halo(mx, my, 44, '#ff2a2a', 0.45 * c.k);
        halo(mx, my, 24, '#ff6a4a', 0.4 * c.k);
        g.globalAlpha = c.k;
        disc(mx, my, 16, '#c0222a');
        disc(mx - 3, my - 3, 12, '#d83a38');
        rect(mx - 8, my - 6, 5, 3, '#8a141c');
        rect(mx + 3, my + 3, 6, 4, '#8a141c');
        rect(mx - 4, my + 6, 4, 3, '#8a141c');
        rect(mx + 5, my - 8, 3, 2, '#8a141c');
        rect(mx - 11, my - 2, 2, 2, '#f08070');
        for (let i = 0; i < 7; i++) {
          const speed = 0.016 + (i % 3) * 0.006;
          const bx = lay.L + ((now * speed + rnd(c.seed, i) * lay.width) % (lay.width + 24)) - 12;
          bat(bx, 8 + (i * 5) % Math.max(10, skyBottom() - 12) + Math.sin(now / 420 + i) * 3, now, i);
        }
        g.globalAlpha = 1;
      },
      // A lua pálida das bruxas e uns morcegos.
      bruxas(c, now) {
        const lay = layout();
        const mx = R(lay.L + lay.width * 0.84);
        const my = Math.max(16, R(poleTop() * 0.42));
        halo(mx, my, 30, '#c8a8ff', 0.4 * c.k);
        g.globalAlpha = c.k;
        disc(mx, my, 10, '#f0e8ff');
        disc(mx + 2, my - 1, 8, '#fffaff');
        rect(mx - 4, my - 3, 3, 2, '#d8cce8');
        rect(mx + 2, my + 3, 3, 2, '#d8cce8');
        for (let i = 0; i < 4; i++) {
          const bx = lay.L + ((now * (0.014 + i * 0.004) + rnd(c.seed, i) * lay.width) % (lay.width + 20)) - 10;
          bat(bx, 10 + i * 6 + Math.sin(now / 500 + i) * 2, now, i);
        }
        g.globalAlpha = 1;
      },
      // O brilho do vulcão ao longe, do lado de onde vem o meteoro (a luz laranja sobe pelo céu).
      meteoro(c, now) {
        const lay = layout();
        halo(lay.L + lay.width * (c.dir > 0 ? 0.1 : 0.9), 0, 70, '#ff7a2a', 0.38 * c.k);
        halo(lay.L + lay.width * 0.5, ground(), 80, '#e0481a', 0.12 * c.k);
      }
    };

    // --- O ar e os bichos (por cima da festa) -----------------------------------------------------------------------------------------
    // Brasas do meteoro, cinzas, faíscas de bruxa... uma partícula de enfeite de vez em quando.
    let sprinkleAt = 0;
    const sprinkle = (now, ms, make) => { if (now - sprinkleAt > ms && fx().particles.length < 400) { sprinkleAt = now; make(); } };

    const OVER = {
      pterodatilos(c, now) {
        const lay = layout();
        tint('#ffc070', 0.07 * c.k);
        // Pterodátilos bem ao longe, miudinhos e apagados.
        g.globalAlpha = 0.35 * c.k;
        for (let i = 0; i < 5; i++) {
          const q = (now / (30000 + i * 2200) + rnd(c.seed, i)) % 1;
          const x = c.dir > 0 ? lay.L - 8 + (lay.width + 16) * q : lay.R + 8 - (lay.width + 16) * q;
          const y = 6 + rnd(c.seed, i, 3) * Math.max(6, skyBottom() - 12);
          const up = Math.floor(now / 170 + i) % 2;
          rect(x - 3, y + (up ? 0 : 1), 3, 1, '#4a3a2a');
          rect(x + 1, y + (up ? 0 : 1), 3, 1, '#4a3a2a');
          rect(x, y + 1, 1, 1, '#4a3a2a');
        }
        g.globalAlpha = 1;
        for (const item of c.items) ptero(item.x, item.y, c.dir, now, item.k);
        if (every(c, now, 6500, 4000) && c.items.length) {
          const item = c.items[Math.floor(rng() * c.items.length)];
          say(tr('fx.pterodatiloGrito'), clamp(item.x, lay.L + 20, lay.R - 20), item.y - 12, now, '#ffe27a', 900, 5);
          if (sound) sound('papagaio');
        }
      },
      manada(c, now) {
        const lay = layout();
        tint('#c8985a', 0.09 * c.k);
        // A poeira que os gigantes levantam no chão, em nuvens.
        for (const big of herd(c, lay)) {
          if (big.x < lay.L + 10 || big.x > lay.R - 10) continue;
          const puff = (now / 90 + big.i * 7) % 8;
          g.globalAlpha = 0.5 * c.k * (1 - puff / 8);
          g.fillStyle = '#c8a070';
          const bx = R(big.x - c.dir * 18);
          g.fillRect(bx - R(puff), ground() - 1 - R(puff * 1.2), 6 + R(puff), 2);
          g.fillRect(bx - R(puff) + 2, ground() - 3 - R(puff * 1.2), 3 + R(puff), 1);
          g.globalAlpha = 1;
        }
        for (const item of c.items) baby(item.x, item.y, c.dir, now, item.k, 0);
        if (every(c, now, 7000, 3500)) {
          say(tr('fx.manadaRugido'), lay.L + lay.width * (0.2 + rng() * 0.6), Math.max(10, poleTop() - 12), now, '#ffe27a', 1000, 5);
          if (sound) sound('rugido');
        }
      },
      ovos(c, now) {
        const lay = layout();
        tint('#d8a050', 0.06 * c.k);
        // Os ovos balançam cada vez mais (e muito, logo depois de um golpe). Os que ainda estão inteiros ficam num ninho de palha.
        for (let i = 0; i < c.n; i++) {
          const pos = TARGETS.ovos(c, i, lay);
          const hits = (c.a.hits && c.a.hits[i]) || 0;
          if (c.got.has(i)) {
            // Casca aberta e a palha vazia.
            rect(pos.x - 7, pos.y + 5, 15, 2, '#c89a30');
            rect(pos.x - 5, pos.y + 4, 11, 1, '#e8c060');
            rect(pos.x - 5, pos.y + 1, 4, 3, '#f4ecd0');
            rect(pos.x + 2, pos.y + 2, 4, 2, '#f4ecd0');
            rect(pos.x - 4, pos.y + 1, 2, 1, '#6aa84a');
            continue;
          }
          const sinceHit = now - (hitAtOf(i) ?? -1e9);
          const shake = sinceHit < 450 ? 2.2 * (1 - sinceHit / 450) : 0;
          const near = clamp(c.t / c.dur, 0, 1);
          egg(pos.x, pos.y, hits, now, i, shake + (hits + near * 2) * 0.35);
        }
        // As crias que acabaram de nascer correm de chapéu e tudo.
        hatchlings = hatchlings.filter(item => now - item.born < 3200);
        for (const item of hatchlings) {
          const age = now - item.born;
          const x = item.x + item.side * age * 0.03;
          const jump = age < 500 ? Math.sin(age / 500 * Math.PI) * 9 : Math.abs(Math.sin(age / 130)) * 2;
          g.globalAlpha = age > 2600 ? (3200 - age) / 600 : 1;
          baby(x, item.y - 4, item.side, now, item.k, jump);
          g.globalAlpha = 1;
        }
      },
      meteoro(c, now) {
        const lay = layout();
        tint('#ff5a1a', 0.1 * c.k);
        tint('#400808', 0.08 * c.k);
        // O céu enfumaçado: cinzas descendo por todo o mapa.
        sprinkle(now, 70, () => {
          particle({ x: lay.L + rng() * lay.width, y: 0, vx: (rng() - 0.5) * 0.01, vy: 0.012 + rng() * 0.01, born: now, ttl: 4200 + rng() * 1800, colors: ['#8a7a7a', '#4a3a3a', '#ff8a12'], wobble: rng() * 6 });
        });
        for (const item of c.items) meteor(item.x, item.y, item.size, c.dir, now);
        if (c.items.length) sprinkle(now, 40, () => {
          const item = c.items[0];
          particle({ x: item.x + (rng() - 0.5) * item.size, y: item.y + (rng() - 0.3) * item.size, vx: (rng() - 0.5) * 0.02, vy: 0.008 + rng() * 0.02, gravity: 0.00002, born: now, ttl: 900, ember: true, big: rng() < 0.4, colors: ['#ffd21e'] });
        });
      },
      bruxas(c, now) {
        const lay = layout();
        tint('#3a1060', 0.14 * c.k);
        for (const item of c.items) {
          witch(item.x, item.y, c.dir, now, item.k);
          // O rastro de faíscas verdes e roxas que ficam para trás.
          if (rng() < 0.4) particle({ x: item.x - c.dir * 15, y: item.y + 3, vx: -c.dir * 0.004, vy: 0.006 + rng() * 0.006, born: now, ttl: 800, colors: rng() < 0.5 ? ['#9aff6a', '#3a9a2a'] : ['#c88aff', '#6a2a9a'], twinkle: true });
        }
        if (every(c, now, 6000, 3500) && c.items.length) {
          const item = c.items[Math.floor(rng() * c.items.length)];
          say(tr('fx.bruxaRisada'), clamp(item.x, lay.L + 22, lay.R - 22), item.y - 14, now, '#c88aff', 1000, 5);
          if (sound) sound('bruxa');
        }
      },
      abobora(c, now) {
        const lay = layout();
        tint('#14082a', 0.26 * c.k);
        // Névoa baixinha entre as abóboras.
        for (let i = 0; i < 4; i++) {
          const y = ground() - 6 + Math.sin(now / 2500 + i) * 2;
          const w = R(lay.width * (0.35 + 0.1 * rnd(c.seed, i)));
          const x = R(((now * (0.004 + 0.002 * rnd(c.seed, i, 1)) + rnd(c.seed, i, 2) * lay.width) % (lay.width + w)) - w + lay.L);
          g.globalAlpha = 0.14 * c.k;
          fogBand(x, R(y), w, 3, '#c8b8f0', lay);
          g.globalAlpha = 1;
        }
        const next = c.got.size;
        for (let i = 0; i < c.n; i++) {
          const pos = TARGETS.abobora(c, i, lay);
          const lit = c.got.has(i) || i === next;
          const pulse = i === next ? 0.5 + 0.5 * Math.sin(now / 170) : 0;
          jack(pos.x, pos.y - R(pulse * 1.5), lit, now, i, i === next);
          if (i === next) {
            // A próxima da ordem: um anel de brilho pulsando e faíscas em cima.
            halo(pos.x, pos.y, 20, '#ffd27a', 0.2 + 0.25 * pulse);
            g.globalAlpha = 0.5 + 0.4 * pulse;
            const ring = 11 + R(pulse * 2);
            rect(pos.x - ring, pos.y, 1, 1, '#fff8cc');
            rect(pos.x + ring, pos.y, 1, 1, '#fff8cc');
            rect(pos.x, pos.y - ring - 1, 1, 1, '#fff8cc');
            g.globalAlpha = 1;
          }
        }
        if (every(c, now, 7000, 5000)) {
          if (sound) sound('sinos');
        }
      },
      fantasmas(c, now) {
        const lay = layout();
        tint('#0a1236', 0.26 * c.k);
        // Brilhinhos azuis parados no escuro.
        for (let i = 0; i < 14; i++) {
          if (Math.sin(now / 420 + i * 2.4) > 0.2) bit(lay.L + rnd(c.seed, i, 6) * lay.width, ground() - 6 - rnd(c.seed, i, 7) * 50, '#bfe0ff', 0.5 * c.k);
        }
        for (const item of c.items) ghost(item.x, item.y, item.a, now, item.k);
        if (every(c, now, 6500, 4500)) {
          say(tr('fx.fantasmaBuu'), lay.L + 30 + rng() * (lay.width - 60), ground() - 50, now, '#bfe0ff', 1000, 6);
          if (sound) sound('canto');
        }
      },
      luasangue(c, now) {
        const lay = layout();
        tint('#5a0010', 0.2 * c.k);
        // Os fios de teia que descem das bandeirinhas e as aranhas balançando neles (tremem logo depois de um golpe).
        for (const item of c.items) {
          const since = now - (hitAtOf(item.k) ?? -1e9);
          spider(item.x, item.y, since < 500 ? 2.4 * (1 - since / 500) : 0.6, now, item.k);
        }
        // Teias de enfeite nos cantos de cima.
        g.globalAlpha = 0.28 * c.k;
        g.fillStyle = '#e8e8f4';
        for (let i = 0; i < 6; i++) {
          g.fillRect(lay.L + 1 + i, 1 + i * 2 % 7, 1, 1);
          g.fillRect(lay.R - 2 - i, 1 + i * 2 % 7, 1, 1);
          g.fillRect(lay.L + 1 + i * 2, 1 + i, 1, 1);
          g.fillRect(lay.R - 2 - i * 2, 1 + i, 1, 1);
        }
        g.globalAlpha = 1;
        if (every(c, now, 8000, 5000)) {
          if (sound) sound('uivo');
        }
      },
      horda(c, now) {
        const lay = layout();
        tint('#183a18', 0.12 * c.k);
        // A névoa verde rasteira por onde os zumbis passam.
        for (let i = 0; i < 5; i++) {
          const w = R(lay.width * (0.3 + 0.15 * rnd(c.seed, i)));
          const x = R(((now * (0.005 + 0.003 * rnd(c.seed, i, 1)) + rnd(c.seed, i, 2) * lay.width) % (lay.width + w)) - w + lay.L);
          g.globalAlpha = 0.16 * c.k;
          fogBand(x, ground() - 5 + R(Math.sin(now / 1900 + i) * 2), w, 4, '#9ad078', lay);
          g.globalAlpha = 1;
        }
        for (const item of c.items) zombie(item.x, item.y, item.side, now, item.k);
        // Os que já ganharam a pamonha: pele rosada, pulando de alegria até sumir.
        cured = cured.filter(item => now - item.born < 2400);
        for (const item of cured) {
          const age = now - item.born;
          g.globalAlpha = age > 1800 ? (2400 - age) / 600 : 1;
          zombie(item.x, item.y - R(Math.abs(Math.sin(age / 150)) * 4), item.side, now, item.k, '#f0b898');
          // A pamonha na mão.
          rect(item.x + item.side * 11 - 2, item.y - 6, 4, 3, '#ffd21e');
          rect(item.x + item.side * 11 - 2, item.y - 7, 4, 1, '#fff4a0');
          g.globalAlpha = 1;
        }
        if (every(c, now, 6500, 3500)) {
          if (sound) sound('gemido');
        }
      },
      gosma(c, now) {
        const lay = layout();
        tint('#20ff50', 0.06 * c.k);
        tint('#06200a', 0.1 * c.k);
        // Fiozinhos de gosma caindo por todo o mapa, de enfeite.
        sprinkle(now, 45, () => {
          particle({ x: lay.L + rng() * lay.width, y: 0, vx: 0, vy: 0.03 + rng() * 0.02, born: now, ttl: ground() / 0.04, colors: ['#7aff4a', '#3aa82a'], drop: true });
        });
        // As poças: uma debaixo de cada gota que não foi estourada e já bateu no chão, borbulhando.
        const gap = step(c, 2200, 9500);
        for (let i = 0; i < c.n; i++) {
          if (c.got.has(i) || c.t < 2200 + i * gap + 5600) continue;
          const x = lay.L + 12 + rnd(c.seed, i) * (lay.width - 24);
          const key = `${c.a.born}:${i}`;
          if (!landed.has(key)) {
            landed.add(key);
            for (let j = 0; j < 8; j++) particle({ x, y: ground() - 1, vx: (rng() - 0.5) * 0.05, vy: -0.02 - rng() * 0.03, gravity: 0.00006, born: now, ttl: 600, colors: ['#7aff4a', '#d8ffb0'], drop: true });
            if (sound) sound('bolha');
          }
          const wide = 9 + R(rnd(c.seed, i, 3) * 4);
          g.globalAlpha = 0.8;
          rect(x - wide / 2, ground() + 1, wide, 2, '#3aa82a');
          rect(x - wide / 2 + 2, ground(), wide - 4, 1, '#7aff4a');
          g.globalAlpha = 1;
          if (Math.sin(now / 260 + i * 2) > 0.5) rect(x + R(Math.sin(i) * 2), ground() - 1 - (Math.floor(now / 200 + i) % 3), 1, 1, '#d8ffb0');
        }
        for (const item of c.items) slime(item.x, item.y, now, item.k);
      },
      helicoptero(c, now) {
        const lay = layout();
        tint('#243024', 0.08 * c.k);
        const pos = heliPos(c, lay);
        if (pos.q > 0 && pos.q < 1) heli(pos.x, pos.y, c.dir, now);
        for (const item of c.items) crate(item.x, item.y, now, item.k);
        if (every(c, now, 5000, 1500) && pos.q > 0 && pos.q < 1 && sound) sound('helice');
      },
      surto(c, now) {
        const lay = layout();
        // A sirene: o mapa pisca em vermelho e uma luz giratória acende em cada canto de cima, uma de cada vez.
        const pulse = 0.5 + 0.5 * Math.sin(now / 260);
        tint('#3a0008', 0.22 * c.k);
        tint('#ff1010', (0.05 + 0.14 * pulse) * c.k);
        halo(lay.L + 8, 6, 44, '#ff2a2a', (pulse > 0.5 ? 0.7 : 0.15) * c.k);
        halo(lay.R - 8, 6, 44, '#ff2a2a', (pulse > 0.5 ? 0.15 : 0.7) * c.k);
        rect(lay.L + 5, 2, 6, 4, pulse > 0.5 ? '#ff4a4a' : '#7a1818');
        rect(lay.R - 11, 2, 6, 4, pulse > 0.5 ? '#7a1818' : '#ff4a4a');
        const grow = clamp(c.t / 6000, 0.25, 1);
        for (let i = 0; i < c.n; i++) {
          const pos = TARGETS.surto(c, i, lay);
          const hits = (c.a.hits && c.a.hits[i]) || 0;
          const since = now - (hitAtOf(i) ?? -1e9);
          const duck = since < 350 ? 5 * (1 - since / 350) : 0;
          grave(pos.x, pos.y, Math.max(2, R(10 * grow) - hits * 3 - R(duck)), c.got.has(i), now, i);
        }
        if (every(c, now, 6000, 800)) {
          if (sound) sound('sirene');
        }
      }
    };

    // --- Vestígios no chão ---------------------------------------------------------------------------------------------------------
    const TRACE = {
      // As cascas que ficaram onde os ovos chocaram.
      ovos(left, at, now, lay) {
        for (let i = 0; i < 4; i++) {
          const x = R(dodge(lay.L + lay.width * (0.14 + 0.24 * i), lay, 24, 30));
          rect(x - 3, ground() + 1, 3, 2, '#f4ecd0');
          rect(x + 1, ground() + 2, 4, 1, '#f4ecd0');
          rect(x - 2, ground() + 1, 1, 1, '#6aa84a');
        }
      },
      // As poças de gosma que não secam logo: borbulham devagar.
      gosma(left, at, now, lay, seed) {
        for (let i = 0; i < 8; i++) {
          const x = R(lay.L + 12 + rnd(seed, i) * (lay.width - 24));
          const wide = 9 + R(rnd(seed, i, 3) * 4);
          rect(x - wide / 2, ground() + 1, wide, 2, '#3aa82a');
          rect(x - wide / 2 + 2, ground(), wide - 4, 1, '#7aff4a');
          if (Math.sin(now / 520 + i * 2.2) > 0.6) rect(x + R(Math.sin(i) * 2), ground() - 1, 1, 1, '#d8ffb0');
        }
      }
    };

    // --- Reações ---------------------------------------------------------------------------------------------------------------------
    const hitAt = new Map();
    const hitAtOf = k => hitAt.get(k);
    // O alvo foi pego (a última batida, nos de vários golpes): o que cada evento faz de próprio no lugar dele.
    function catchFx(c, event, x, y, now) {
      if (!c) return;
      const side = x < layout().L + layout().width / 2 ? 1 : -1;
      if (c.id === 'ovos') {
        // A cria sai da casca e corre; cacos de casca voam.
        hatchlings.push({ x, y: ground() - 5, born: now, side, k: event.k });
        for (let i = 0; i < 8; i++) particle({ x, y: y - 2, vx: (rng() - 0.5) * 0.05, vy: -0.02 - rng() * 0.03, gravity: 0.00007, born: now, ttl: 800, colors: ['#f4ecd0', '#d8ccaa'] });
        say(tr('fx.ovoPiu'), clamp(x, layout().L + 16, layout().R - 16), y - 20, now, '#9ef05a', 1100, 6);
        if (sound) sound('quebra');
      } else if (c.id === 'meteoro') {
        // O meteoro se desfaz: bola de fogo, chuva de brasas e o estrondo.
        confetti(now, x, y, 40);
        for (let i = 0; i < 40; i++) particle({ x, y, vx: (rng() - 0.5) * 0.12, vy: (rng() - 0.5) * 0.1, gravity: 0.00003, born: now, ttl: 1400 + rng() * 600, ember: true, big: rng() < 0.5, colors: ['#ffd21e'] });
        fx().flashUntil = now + 220;
        say(tr('fx.meteoroFim'), clamp(x, layout().L + 40, layout().R - 40), Math.max(12, y - 20), now, '#ffe27a', 1800, 8);
        if (sound) sound('trovao');
      } else if (c.id === 'horda') {
        // O zumbi come a pamonha, ganha a cor de gente e pula de alegria.
        cured.push({ x, y, born: now, side: event.k % 2 === 0 ? 1 : -1, k: event.k });
        say(tr('fx.zumbiCurado'), clamp(x, layout().L + 16, layout().R - 16), y - 20, now, '#ffd8b8', 1100, 6);
        if (sound) sound('acerto');
      } else if (c.id === 'surto') {
        // A última batida empurra a mão de volta: poeira e terra voando.
        for (let i = 0; i < 12; i++) particle({ x, y: ground() - 2, vx: (rng() - 0.5) * 0.06, vy: -0.02 - rng() * 0.03, gravity: 0.00007, born: now, ttl: 700, colors: ['#4a3220', '#6a4a30', '#8ab870'] });
        if (sound) sound('lenha');
      } else if (c.id === 'luasangue') {
        for (let i = 0; i < 10; i++) particle({ x, y, vx: (rng() - 0.5) * 0.05, vy: -0.01 + rng() * 0.02, gravity: 0.00004, born: now, ttl: 900, colors: ['#1a1226', '#e0343e'] });
        if (sound) sound('estalo');
      } else if (c.id === 'abobora') {
        // Cada abóbora acertada solta doce.
        for (let i = 0; i < 6; i++) float('brilho', x + (i - 2.5) * 4, y - 4 - i, now, ['#ff8a12', '#ffd21e']);
        if (sound) sound('sino');
      } else if (c.id === 'bruxas') {
        for (let i = 0; i < 10; i++) particle({ x, y, vx: (rng() - 0.5) * 0.05, vy: (rng() - 0.5) * 0.04, born: now, ttl: 800, colors: ['#9aff6a', '#c88aff'], twinkle: true });
      } else if (c.id === 'fantasmas') {
        for (let i = 0; i < 8; i++) particle({ x, y, vx: (rng() - 0.5) * 0.03, vy: -0.012 - rng() * 0.012, born: now, ttl: 900, colors: ['#bfe0ff', '#ffffff'], twinkle: true });
      } else if (c.id === 'gosma') {
        for (let i = 0; i < 8; i++) particle({ x, y, vx: (rng() - 0.5) * 0.05, vy: -0.01 - rng() * 0.02, gravity: 0.00005, born: now, ttl: 700, colors: ['#7aff4a', '#d8ffb0'], drop: true });
      } else if (c.id === 'helicoptero') {
        for (let i = 0; i < 5; i++) float('brilho', x + (i - 2) * 4, y - 6 - i * 2, now, ['#ff8a12', '#fffaf0']);
        if (sound) sound('moeda');
      } else if (c.id === 'manada' || c.id === 'pterodatilos') {
        for (let i = 0; i < 6; i++) float('brilho', x + (i - 2.5) * 4, y - i * 2, now, ['#9ef05a', '#ffd21e']);
      }
      return side;
    }
    // Um golpe num alvo de vários golpes (ovo, meteoro, aranha, mão): cada evento reage do seu jeito. Devolve true se já tratou (sem o martelo da pinhata).
    function hitFx(c, event, x, y, now) {
      if (!c) return false;
      hitAt.set(event.k, now);
      if (c.id === 'ovos') {
        for (let i = 0; i < 4 + event.n * 2; i++) particle({ x, y: y - 3, vx: (rng() - 0.5) * 0.04, vy: -0.015 - rng() * 0.02, gravity: 0.00006, born: now, ttl: 600, colors: ['#f4ecd0', '#d8ccaa'] });
        if (sound) sound('estalo');
        return true;
      }
      if (c.id === 'meteoro') {
        for (let i = 0; i < 6 + event.n; i++) particle({ x: x + (rng() - 0.5) * 8, y: y + (rng() - 0.5) * 8, vx: (rng() - 0.5) * 0.08, vy: (rng() - 0.5) * 0.08, gravity: 0.00003, born: now, ttl: 900, ember: true, big: true, colors: ['#ffd21e'] });
        fx().flashUntil = now + 90;
        if (sound) sound('quebra');
        return true;
      }
      if (c.id === 'luasangue') {
        for (let i = 0; i < 6; i++) particle({ x, y, vx: (rng() - 0.5) * 0.05, vy: (rng() - 0.5) * 0.04, born: now, ttl: 500, colors: ['#e8e8f4', '#e0343e'] });
        if (sound) sound('estalo');
        return true;
      }
      if (c.id === 'surto') {
        for (let i = 0; i < 6; i++) particle({ x, y: ground() - 3, vx: (rng() - 0.5) * 0.05, vy: -0.015 - rng() * 0.02, gravity: 0.00006, born: now, ttl: 500, colors: ['#4a3220', '#6a4a30'] });
        if (sound) sound('lenha');
        return true;
      }
      return false;
    }
    // Os passos pesados da manada balançam o quadro todo um pixel a cada pisada (como o tremor de forró); com a festa fora do evento não faz nada.
    function shake(c, now) {
      if (c.id !== 'manada' || c.k < 0.25) return null;
      if ((now % STOMP_MS) >= 150) return null;
      const flip = Math.floor(now / 45) % 2;
      return { x: flip ? 1 : -1, y: flip ? 0 : 1 };
    }
    function reset() {
      hatchlings = [];
      cured = [];
      hitAt.clear();
      landed.clear();
      ambientKey = '';
      ambientAt = 0;
    }

    // Os bichos e as coisas de cada evento, um a um (para os testes e para a prévia da arte).
    const DRAW = { ptero, baby, giant, egg, meteor, witch, jack, ghost, spider, zombie, slime, heli, crate, grave, bat };
    const probe = () => ({ hatchlings: hatchlings.length, cured: cured.length, hits: hitAt.size });
    return { TARGETS, SKY, OVER, TRACE, DRAW, shake, catchFx, hitFx, reset, probe };
  }

  root.ArraiaMundoTemas = { create, TRACE_MS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
