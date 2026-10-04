// Os eventos do mundo na festa (o motor é src/mundo.js, os dados estão em `data.mundo`): o céu e o tempo mudam o mapa inteiro por alguns segundos.
// Cada evento mexe na luz e no ar (`tint`, neblina, escuridão, calor, vento) e tem alvos para clicar (estrelas, lampiões, vaga-lumes, olhos no
// escuro, pipas, balões d'água, o cometa), cada um uma região `mundo:<k>`; o motor sabe só o número do alvo, a posição é calculada aqui, a cada
// quadro, pelo tempo do evento (então não depende de nada guardado). Duas camadas: 'sky' (lua, sol, morcegos: atrás das bandeirinhas) e
// 'over' (luz, neblina, alvos: por cima da festa, antes dos textos). Depois de alguns eventos ficam vestígios no mapa por uns minutos (pétalas, gelo
// derretendo, pipocas, folhas e poeira, fumaça dos fogos, orvalho), que apagam devagar. Toda cor por cima da festa usa 'source-atop': só pinta o que já foi
// desenhado, nunca a área de trabalho atrás da janela transparente.
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  // Um número "sorteado" sempre igual para a mesma semente e os mesmos índices (a posição de cada alvo não pode mudar entre quadros).
  const rnd = (seed, i, j = 0) => {
    const x = Math.sin(seed * 12.9898 + i * 78.233 + j * 37.719) * 43758.5453;
    return x - Math.floor(x);
  };
  const EASE_IN = 2500;
  const EASE_OUT = 3000;
  // Quanto tempo (ms) os vestígios de cada evento ficam na festa.
  const TRACE_MS = { petalas: 150000, granizo: 90000, pipoca: 120000, redemoinho: 90000, fogos: 60000, vagalumes: 100000, neve: 120000, cheia: 100000 };
  // O Cruzeiro do Sul, na ordem em que se clica: a base (Acrux), a direita (Delta), o topo (Gacrux), a esquerda (Mimosa) e a pequena (Épsilon).
  const CROSS = [[0, 15], [10, 1], [0, -15], [-10, 2], [4, 5]];
  // A Maria-fumaça: a locomotiva na frente e quatro vagões, a 15 px um do outro, correndo por um trilho de nuvens lá no alto.
  const TRAIN_Y = 17;
  const TRAIN_STEP = 15;
  const KITES = ['#ee2f3c', '#ffd21e', '#3a6cf0', '#35a03a', '#ff4f9e', '#ff8a12'];

  function create(ctx) {
    const { g, halo, light, say, float, confetti, sound, region, rng, fx, layout, ground, poleTop, size, tr, write } = ctx;
    let cur = null;           // o evento que está sendo desenhado
    let trace = null;         // o último evento que acabou, enquanto os vestígios dele estão na festa: { id, at, seed }
    let said = null;          // a chave do evento que já deu o grito de chegada
    let lastBolt = 0;
    let effects = 0;          // quantas vezes o evento soltou um efeito sozinho (para o `probe`)
    const streaks = [];
    let streakAt = 0;
    let cometAt = 0;
    let beatAt = -1;          // a pisada do tremor de forró que já levantou poeira
    let nextChat = 0;         // quando a turma comenta o evento de novo
    let chats = 0;            // quantas falas a turma já soltou neste evento (para o `probe`)
    let lastChat = '';
    const hitAt = new Map();  // quando cada pinhata levou o último golpe (ela balança mais logo depois)
    const crowed = new Set(); // os galos que já cantaram (`<nascimento do evento>:<alvo>`)
    const landed = new Set(); // os balões d'água que já estouraram no chão
    const burstDone = new Set(); // os foguetes que já estouraram

    const particle = p => fx().particles.push(p);
    const tint = (color, alpha) => {
      if (alpha <= 0.005) return;
      const { width, height } = size();
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = color;
      g.globalAlpha = Math.min(1, alpha);
      g.fillRect(0, 0, width, height);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    };

    // Onde fica a cruz no céu (muda de evento para evento) e a posição de cada vagão do trem.
    const crossAt = (c, lay) => ({ cx: Math.round(lay.L + lay.width * (0.22 + 0.5 * rnd(c.seed, 9))), cy: Math.max(24, Math.round(poleTop() * 0.55)) });
    const trainPos = (c, lay, i) => {
      const prog = clamp((c.t - 1500) / Math.max(1, c.dur - 4500), 0, 1);
      const from = c.dir > 0 ? lay.L - 14 : lay.R + 14;
      return { x: from + c.dir * (lay.width + 5 * TRAIN_STEP + 40) * prog - c.dir * i * TRAIN_STEP, prog };
    };

    // --- Os alvos de cada evento: posição pelo tempo (ms desde o começo) ---------------------------------------------------------------
    // Cada função devolve { k, x, y, w, h } (a caixa clicável) ou null se o alvo ainda não chegou ou já passou.
    const spread = (c, k, from, step, life) => {
      // O alvo k aparece em `from + k * step` e fica `life` ms.
      const start = from + k * step;
      const p = (c.t - start) / life;
      return p >= 0 && p < 1 ? p : -1;
    };
    const step = (c, from, tail) => (c.n > 1 ? (c.dur - from - tail) / (c.n - 1) : 0);

    const TARGETS = {
      // Estrelas cadentes: descem em diagonal pelo céu, uma a cada tantos segundos.
      estrelas(c, k, lay) {
        const p = spread(c, k, 2500, step(c, 2500, 9500), 6500);
        if (p < 0) return null;
        const x = lay.L + 16 + rnd(c.seed, k) * (lay.width - 32) + c.dir * 64 * p;
        const y = 3 + rnd(c.seed, k, 1) * 8 + 40 * p;
        return { x, y, w: 15, h: 15, p };
      },
      // Pipas soltas: cruzam o céu de um lado ao outro com a cauda ondulando.
      ventania(c, k, lay) {
        const p = spread(c, k, 2000, step(c, 2000, 9000), 8000);
        if (p < 0) return null;
        const from = c.dir > 0 ? lay.L - 14 : lay.R + 14;
        const span = lay.width + 28;
        const top = Math.max(6, poleTop() - 8);
        const x = from + c.dir * span * p;
        const y = 6 + rnd(c.seed, k, 2) * Math.max(4, top - 14) + Math.sin(p * 9 + k) * 3;
        return { x, y, w: 15, h: 17, p };
      },
      // Vaga-lumes: cada um dá voltas num cantinho, sempre aqui.
      vagalumes(c, k, lay) {
        const cx = lay.L + 14 + rnd(c.seed, k) * (lay.width - 28);
        const cy = ground() - 14 - rnd(c.seed, k, 1) * 52;
        const rx = 6 + rnd(c.seed, k, 2) * 12;
        const ry = 3 + rnd(c.seed, k, 3) * 7;
        const w = 0.0006 + rnd(c.seed, k, 4) * 0.0006;
        const ph = rnd(c.seed, k, 5) * TAU;
        const x = cx + Math.cos(c.t * w + ph) * rx;
        const y = cy + Math.sin(c.t * w * 1.3 + ph) * ry;
        return { x, y, w: 13, h: 13, blink: 0.5 + 0.5 * Math.sin(c.t / 300 + ph) };
      },
      // Balões d'água: voam em arco de fora para dentro da festa e estouram no chão se ninguém pegar antes.
      calorao(c, k, lay) {
        const p = spread(c, k, 2500, step(c, 2500, 9500), 3500);
        if (p < 0) return null;
        const side = rnd(c.seed, k, 6) < 0.5 ? -1 : 1;
        const x0 = side < 0 ? lay.L + 4 : lay.R - 4;
        const x1 = lay.L + 24 + rnd(c.seed, k) * (lay.width - 48);
        const x = x0 + (x1 - x0) * p;
        const y = ground() - 30 + 28 * p - 4 * 36 * p * (1 - p);
        return { x, y, w: 13, h: 13, p };
      },
      // Lampiões: ficam parados em fila no chão; um fica de pé no mesmo lugar o evento inteiro.
      temporal(c, k, lay) {
        const fraction = c.n > 1 ? 0.12 + 0.76 * k / (c.n - 1) : 0.5;
        let x = lay.L + lay.width * fraction;
        const host = lay.host ? lay.host.x + 12 : -999;
        if (Math.abs(x - host) < 26) x += x < host ? -30 : 30;
        return { x, y: ground() - 14, w: 11, h: 30, p: 0 };
      },
      // Olhos no escuro: três moitas na frente da festa, os olhos piscam.
      lua(c, k, lay) {
        const x = lay.L + lay.width * (0.2 + 0.32 * k) + (rnd(c.seed, k) - 0.5) * 12;
        return { x, y: ground() - 2, w: 15, h: 11, p: 0 };
      },
      // Flores douradas: caem devagar balançando de um lado para o outro.
      petalas(c, k, lay) {
        const p = spread(c, k, 2000, step(c, 2000, 11000), 9000);
        if (p < 0) return null;
        const x = lay.L + 14 + rnd(c.seed, k) * (lay.width - 28) + Math.sin(p * 8 + k) * 8;
        const y = 4 + p * (ground() - 24);
        return { x, y, w: 15, h: 15, p };
      },
      // Balões juninos: sobem do chão da festa até o céu.
      baloes(c, k, lay) {
        const p = spread(c, k, 2500, step(c, 2500, 12000), 11000);
        if (p < 0) return null;
        const x = lay.L + 16 + rnd(c.seed, k) * (lay.width - 32) + Math.sin(p * 6 + k * 2) * 5;
        const y = ground() - 14 - p * (ground() - 30);
        return { x, y, w: 17, h: 21, p };
      },
      // Pedras de granizo: caem depressa do alto até o chão; quem clica antes quebra.
      granizo(c, k, lay) {
        const p = spread(c, k, 2000, step(c, 2000, 7000), 3300);
        if (p < 0) return null;
        const x = lay.L + 12 + rnd(c.seed, k) * (lay.width - 24);
        const y = 2 + p * (ground() - 8);
        return { x, y, w: 13, h: 13, p };
      },
      // Estrelas que aparecem em pleno dia, no meio do eclipse (ficam no lugar e piscam).
      eclipse(c, k, lay) {
        const p = c.t / c.dur;
        if (p < 0.28 || p > 0.78) return null;
        const x = lay.L + lay.width * (0.16 + 0.22 * k) + (rnd(c.seed, k) - 0.5) * 14;
        const y = 8 + rnd(c.seed, k, 1) * Math.max(6, poleTop() * 0.5);
        return { x, y, w: 15, h: 15, p };
      },
      // Redemoinhos: um de cada vez atravessam o chão da festa de um lado ao outro.
      redemoinho(c, k, lay) {
        const p = spread(c, k, 2000, step(c, 2000, 10500), 9500);
        if (p < 0) return null;
        const from = c.dir > 0 ? lay.L - 10 : lay.R + 10;
        const x = from + c.dir * (lay.width + 20) * p;
        return { x, y: ground() - 10, w: 17, h: 30, p };
      },
      // Pipocas: caem do céu e ficam quicando no chão por uns segundos (dá para pegar enquanto quica).
      pipoca(c, k, lay) {
        const p = spread(c, k, 1500, step(c, 1500, 8000), 6500);
        if (p < 0) return null;
        const x = lay.L + 12 + rnd(c.seed, k) * (lay.width - 24);
        const fall = 0.38;
        let y;
        if (p < fall) y = 2 + (p / fall) ** 2 * (ground() - 14);
        else {
          const q = (p - fall) / (1 - fall);
          y = ground() - 10 - Math.abs(Math.sin(q * 9)) * 14 * (1 - q);
        }
        return { x, y, w: 15, h: 15, p };
      },
      // Foguetes: sobem do chão até o alto e estouram (quem clica antes faz um estouro maior).
      fogos(c, k, lay) {
        const p = (c.t - (2000 + k * step(c, 2000, 6000))) / 2600;
        if (p < 0 || p >= 1) return null;
        const x = lay.L + 16 + rnd(c.seed, k) * (lay.width - 32);
        const apex = 6 + rnd(c.seed, k, 1) * Math.max(8, poleTop() * 0.5);
        const y = ground() - 6 - (ground() - 6 - apex) * (1 - (1 - p) * (1 - p));
        return { x, y, w: 15, h: 15, p, apex };
      },
      // Boitatá: a cobra de fogo atravessa o céu devagar; cada alvo é um pedaço do corpo (os segmentos 2, 4, 6...).
      boitata(c, k, lay) {
        const point = snake(c, 2 + 2 * k, lay);
        if (!point) return null;
        return { x: point.x, y: point.y, w: 15, h: 15, p: 0 };
      },
      // Revoada de asa-branca: um bando em V atravessa o céu; cada alvo é uma das aves (as de número ímpar).
      revoada(c, k, lay) {
        const point = flockBird(c, 1 + 2 * k, lay);
        if (!point) return null;
        return { x: point.x, y: point.y, w: 15, h: 13, p: 0 };
      },
      // Procissão de velas: uma fila de velas anda pela frente da festa; cada alvo é uma vela (as de número ímpar).
      procissao(c, k, lay) {
        const point = candlePoint(c, 1 + 2 * k, lay);
        if (!point) return null;
        return { x: point.x, y: point.y - 3, w: 13, h: 15, p: 0 };
      },
      // Vacas levadas pelo raio do disco voador: sobem do chão até a nave (quem clica antes devolve a vaca).
      ovni(c, k, lay) {
        const p = (c.t - (3000 + k * step(c, 3000, 9000))) / 6000;
        if (p < 0 || p >= 1) return null;
        const saucer = ufoAt(c, lay);
        const x = saucer.x + (rnd(c.seed, k) - 0.5) * 14 * (1 - p);
        const y = ground() - 8 - p * (ground() - 8 - saucer.y - 6);
        return { x, y, w: 17, h: 13, p };
      },
      // Barracas da feira: ficam paradas na frente da festa, uma em cada ponto (fora do canto da Mandioca).
      feira(c, k, lay) {
        let x = lay.L + lay.width * (0.16 + 0.34 * k);
        const host = lay.host ? lay.host.x + 12 : -999;
        if (Math.abs(x - host) < 32) x += x < host ? -36 : 36;
        return { x, y: ground() - 10, w: 27, h: 24, p: 0 };
      },
      // Flocos grandes de neve: descem devagar, balançando; cada um é um pedido.
      neve(c, k, lay) {
        const p = spread(c, k, 2200, step(c, 2200, 10500), 9000);
        if (p < 0) return null;
        const x = lay.L + 16 + rnd(c.seed, k) * (lay.width - 32) + Math.sin(p * 7 + k * 2) * 7;
        const y = 4 + p * (ground() - 15);
        return { x, y, w: 15, h: 15, p };
      },
      // Moedas que pulam de uma rachadura do chão e ficam quicando até parar.
      tremor(c, k, lay) {
        const p = spread(c, k, 2000, step(c, 2000, 8500), 7000);
        if (p < 0) return null;
        const x = lay.L + 14 + rnd(c.seed, k) * (lay.width - 28);
        const jump = 0.3;
        let y;
        if (p < jump) y = ground() - 6 - Math.sin(p / jump * Math.PI) * 30;
        else {
          const q = (p - jump) / (1 - jump);
          y = ground() - 6 - Math.abs(Math.sin(q * 10)) * 9 * (1 - q);
        }
        return { x, y, w: 13, h: 13, p };
      },
      // Coisas levadas pela água: atravessam a frente da festa boiando, uma de cada vez.
      cheia(c, k, lay) {
        const p = spread(c, k, 2000, step(c, 2000, 10500), 9500);
        if (p < 0) return null;
        const from = c.dir > 0 ? lay.L - 8 : lay.R + 8;
        const x = from + c.dir * (lay.width + 16) * p;
        return { x, y: ground() - 4 + Math.sin(p * 34 + k) * 1.5, w: 15, h: 13, p };
      },
      // Cruzeiro do Sul: as cinco estrelas ficam paradas no céu (o desenho da cruz vem de `crossAt`) e só valem na ordem.
      constelacao(c, k, lay) {
        const { cx, cy } = crossAt(c, lay);
        return { x: cx + CROSS[k][0], y: cy + CROSS[k][1], w: 13, h: 13, p: c.t / c.dur };
      },
      // Sapos: caem do céu e saem pulando pelo chão, cada um para um lado.
      sapos(c, k, lay) {
        const p = spread(c, k, 1800, step(c, 1800, 9500), 8500);
        if (p < 0) return null;
        const x0 = lay.L + 14 + rnd(c.seed, k) * (lay.width - 28);
        const fall = 0.25;
        let x = x0;
        let y;
        if (p < fall) y = 3 + (p / fall) ** 2 * (ground() - 14);
        else {
          const q = (p - fall) / (1 - fall);
          x = clamp(x0 + (rnd(c.seed, k, 3) < 0.5 ? -1 : 1) * q * 60, lay.L + 8, lay.R - 8);
          y = ground() - 6 - Math.abs(Math.sin(q * 6 * Math.PI)) * 10;
        }
        return { x, y, w: 13, h: 11, p };
      },
      // Maria-fumaça: cada passageiro é um alvo, que só existe enquanto o vagão dele está dentro da festa.
      trem(c, k, lay) {
        const pos = trainPos(c, lay, k);
        if (pos.x < lay.L + 6 || pos.x > lay.R - 6) return null;
        return { x: pos.x, y: TRAIN_Y - 6, w: 13, h: 12, p: pos.prog };
      },
      // Fichas douradas: caem depressa, rodando, uma atrás da outra (umas três de uma vez no ar).
      fichas(c, k, lay) {
        const p = spread(c, k, 1500, step(c, 1500, 5000), 3800);
        if (p < 0) return null;
        const x = lay.L + 12 + rnd(c.seed, k) * (lay.width - 24) + Math.sin(p * 8 + k) * 5;
        return { x, y: 2 + p * (ground() - 10), w: 13, h: 13, p };
      },
      // Pinhatas penduradas nas bandeirinhas: balançam sempre um pouco, e sacodem forte logo depois de um golpe.
      pinhata(c, k, lay) {
        const ax = lay.L + lay.width * (0.22 + 0.28 * k);
        const age = c.now - (hitAt.get(k) ?? -1e9);
        // Balanço calmo o tempo todo e, logo depois de um golpe, um sacolejo rápido que vai apagando em 0,6 s.
        const wobble = age < 600 ? Math.sin(age / 55) * 8 * (1 - age / 600) : 0;
        return { x: ax + Math.sin(c.t / 700 + k * 2) * 3 + wobble, y: 46, w: 21, h: 21, p: 0, ax };
      },
      // Galos: um de cada vez aparece num ponto do chão e canta por uns segundos.
      amanhecer(c, k, lay) {
        const p = spread(c, k, 3500, step(c, 3500, 9500), 9000);
        if (p < 0) return null;
        return { x: lay.L + 18 + rnd(c.seed, k) * (lay.width - 36), y: ground() - 9, w: 15, h: 17, p };
      },
      // Coisas escorregando pelo chão da ilha que balança: vão para um lado cada vez mais depressa e somem na beirada.
      turbulencia(c, k, lay) {
        const p = spread(c, k, 2500, step(c, 2500, 9000), 8500);
        if (p < 0) return null;
        const x = lay.L + lay.width * (0.3 + 0.4 * rnd(c.seed, k)) + (rnd(c.seed, k, 5) < 0.5 ? -1 : 1) * p * p * 260;
        if (x < lay.L + 4 || x > lay.R - 4) return null;
        return { x, y: ground() - 6 - Math.abs(Math.sin(p * 20 + k)) * 2, w: 15, h: 13, p };
      },
      // Marcas de tesouro: um X vermelho no chão da frente, uma em cada ponto.
      tesouro(c, k, lay) {
        let x = lay.L + lay.width * (0.2 + 0.3 * k) + (rnd(c.seed, k) - 0.5) * 16;
        const host = lay.host ? lay.host.x + 12 : -999;
        if (Math.abs(x - host) < 22) x += x < host ? -26 : 26;
        return { x, y: ground() + 3, w: 17, h: 13, p: 0 };
      },
      // O cometa: atravessa o céu devagar; um só.
      cometa(c) {
        const p = clamp(c.t / c.dur, 0, 1);
        if (p <= 0.02 || p >= 0.98) return null;
        const lay = layout();
        const from = c.dir > 0 ? lay.L - 30 : lay.R + 30;
        const x = from + c.dir * (lay.width + 60) * p;
        const y = 8 + Math.max(10, poleTop() * 0.55) * Math.sin(p * Math.PI * 0.5) * 0.6 + p * 4;
        return { x, y, w: 23, h: 23, p };
      }
    };

    // --- Update: o evento de agora e onde estão seus alvos ----------------------------------------------------------------------------
    function update(engine, now) {
      const lay = layout();
      const a = engine.mundo && engine.state.mundo ? engine.mundo.active() : null;
      if (!lay || !a) {
        if (cur && TRACE_MS[cur.id]) trace = { id: cur.id, at: now, seed: cur.seed };
        if (cur) { fx().shakeX = 0; fx().shakeY = 0; }
        cur = null;
        said = null;
        if (trace && now - trace.at > TRACE_MS[trace.id]) trace = null;
        return;
      }
      trace = null;
      const t = engine.now() - a.born;
      const dur = a.until - a.born;
      const k = clamp(Math.min(t / EASE_IN, (dur - t) / EASE_OUT), 0, 1);
      const c = { a, id: a.id, entry: a.entry, t, dur, k, n: a.n, seed: a.seed, dir: a.dir, got: new Set(a.got), items: [], now };
      cur = c;
      const place = TARGETS[a.id];
      if (place) {
        for (let i = 0; i < c.n; i++) {
          if (c.got.has(i)) continue;
          const item = place(c, i, lay);
          if (item) c.items.push({ k: i, ...item });
        }
      }
      // O grito de chegada, uma vez por evento.
      if (said !== `${a.id}:${a.born}`) {
        said = `${a.id}:${a.born}`;
        nextChat = now + 3500;
        chats = 0;
        lastChat = '';
        say(tr(`fx.mundo.${a.id}`), lay.L + lay.width / 2, Math.max(10, poleTop() - 16), now, '#ffe27a', 2400, 6);
      }
      // O tremor de forró: a cada pisada o quadro inteiro balança um pixel (para um lado e para o outro) por uns 150 ms.
      const stomp = a.id === 'tremor' && k > 0.2 && (now % 760) < 150;
      const flip = Math.floor(now / 45) % 2;
      // A turbulência balança a ilha devagar (sobe e desce uns 2 px, com um vaivém de 1 px para os lados).
      const heave = a.id === 'turbulencia';
      const herdShake = packs.map(pack => pack.api.shake(c, now)).find(Boolean) || null;
      fx().shakeX = herdShake ? herdShake.x : stomp ? (flip ? 1 : -1) : (heave ? Math.round(Math.sin(now / 910 + 1) * 1.2 * k) : 0);
      fx().shakeY = herdShake ? herdShake.y : stomp ? (flip ? 0 : 1) : (heave ? Math.round(Math.sin(now / 540) * 2.4 * k) : 0);
      // O vento sopra de verdade: as bandeirinhas, a pipa e o chapéu leem `windNow`.
      if (a.id === 'ventania') fx().windNow = a.dir * k;
      else if (a.id === 'redemoinho') fx().windNow = a.dir * k * 0.6;
      // O relâmpago do temporal: a cada tantos segundos, clarão no mapa inteiro e o trovão.
      if (a.id === 'temporal' && k > 0.5 && now >= lastBolt) {
        lastBolt = now + 2500 + rng() * 3500;
        fx().flashUntil = now + 150;
        effects++;
        if (sound) sound('trovao');
      }
    }

    // --- Desenho -----------------------------------------------------------------------------------------------------------------------
    // Neblina: faixas largas de névoa que andam devagar, cada uma na sua altura e no seu ritmo.
    function fog(c, now) {
      const lay = layout();
      const top = Math.max(2, poleTop() - 6);
      const height = ground() - top;
      for (let i = 0; i < 7; i++) {
        const y = top + (i + 0.5) * height / 7 + Math.sin(now / 2200 + i) * 2;
        const w = Math.round(lay.width * (0.5 + 0.2 * rnd(c.seed, i)));
        const x = Math.round(((now * (0.006 + 0.004 * rnd(c.seed, i, 1)) + rnd(c.seed, i, 2) * lay.width) % (lay.width + w)) - w + lay.L);
        g.fillStyle = 'rgba(220, 236, 240, 0.11)';
        g.globalAlpha = c.k;
        for (let band = 0; band < 3; band++) g.fillRect(x + band * 4, Math.round(y) + band, w - band * 8, 5 - band);
        g.globalAlpha = 1;
      }
    }

    // Uma figura de pixels (cada letra aponta para uma cor; `.` não pinta); `scale` aumenta cada pixel.
    const shape = (rows, x, y, palette, scale = 1) => {
      rows.forEach((row, dy) => [...row].forEach((ch, dx) => {
        if (palette[ch]) { g.fillStyle = palette[ch]; g.fillRect(Math.round(x + dx * scale), Math.round(y + dy * scale), scale, scale); }
      }));
    };

    // Os pacotes de eventos (src/festa-mundo-temas.js: dinossauros, Halloween e zumbis; src/festa-mundo-extras.js: os eventos avulsos) trazem os próprios
    // alvos, céu, ar, vestígios e reações. Cada pacote só mexe nos eventos dele.
    const helpers = { g, halo, say, float, confetti, sound, rng, fx, layout, ground, poleTop, tint, particle, rnd, clamp, spread, step, tr };
    const packs = [root.ArraiaMundoTemas, root.ArraiaMundoExtras, root.ArraiaMundoExtras2].filter(Boolean).map(pack => ({ api: pack.create(helpers), traceMs: pack.TRACE_MS }));
    for (const pack of packs) {
      Object.assign(TARGETS, pack.api.TARGETS);
      Object.assign(TRACE_MS, pack.traceMs);
    }
    const temas = packs[0] ? packs[0].api : null;

    // A cobra de fogo: a posição do segmento `i` (da cabeça para trás), ou null se está fora da festa.
    const SNAKE_SEGMENTS = 16;
    function snake(c, i, lay) {
      const progress = clamp((c.t - 2000) / 34000, 0, 1.05);
      const from = c.dir > 0 ? lay.L - 14 : lay.R + 14;
      const head = from + c.dir * (lay.width + 120) * progress;
      const x = head - c.dir * i * 7;
      if (x < lay.L - 8 || x > lay.R + 8 || c.t < 2000) return null;
      const y = Math.max(12, poleTop() * 0.55) + Math.sin(c.t / 420 + i * 0.55) * 8 + i * 0.4;
      return { x, y };
    }

    // As aves da revoada: o bando em V, a ave `i` (0 é a da frente), ou null se está fora da festa.
    const FLOCK = 14;
    function flockBird(c, i, lay) {
      const progress = clamp((c.t - 2000) / 28000, 0, 1.05);
      const from = c.dir > 0 ? lay.L - 30 : lay.R + 30;
      const head = from + c.dir * (lay.width + 90) * progress;
      const row = Math.floor((i + 1) / 2);
      const side = i % 2 ? 1 : -1;
      const x = head - c.dir * row * 9;
      if (x < lay.L - 8 || x > lay.R + 8 || c.t < 2000) return null;
      return { x, y: Math.max(10, poleTop() * 0.5) + side * row * 4 + Math.sin(c.t / 300 + i) * 1.5 };
    }
    // As velas da procissão: a vela `i` (0 é a da frente), ou null se está fora da festa.
    const CANDLES = 10;
    function candlePoint(c, i, lay) {
      const progress = clamp((c.t - 1500) / 38000, 0, 1.1);
      const from = c.dir > 0 ? lay.L - 14 : lay.R + 14;
      const lead = from + c.dir * (lay.width + CANDLES * 14) * progress;
      const x = lead - c.dir * i * 14;
      if (x < lay.L - 4 || x > lay.R + 4 || c.t < 1500) return null;
      return { x, y: ground() + 5 + Math.sin(c.t / 400 + i) * 0.5 };
    }
    // O disco voador: paira no alto e vai de um lado ao outro bem devagar.
    function ufoAt(c, lay) {
      return { x: lay.L + lay.width * (0.5 + 0.28 * Math.sin(c.t / 6500 + c.seed)), y: Math.max(12, poleTop() * 0.5) + Math.sin(c.t / 700) * 1.5 };
    }

    const STAR = ['...y...', '...y...', '..yWy..', 'yyWWWyy', '..yWy..', '...y...', '...y...'];
    const STAR_COLORS = { y: '#ffd21e', W: '#ffffff' };
    const BAT = [['b.b.b', '.bbb.'], ['.b.b.', 'bbbbb']];
    const WATER = ['..bb..', '.bWbb.', 'bWbbbb', 'bbbbbB', 'bbbbBB', '.bbBB.', '..BB..'];
    const WATER_COLORS = { b: '#4aa8ff', W: '#e8f6ff', B: '#2a6ac8' };

    function star(item, c, now) {
      const x = Math.round(item.x);
      const y = Math.round(item.y);
      // O rastro: seis pontinhos que apagam atrás dela.
      for (let i = 1; i <= 12; i++) {
        g.globalAlpha = 0.8 * (1 - i / 13);
        g.fillStyle = i < 5 ? '#ffffff' : '#fff4a0';
        g.fillRect(Math.round(x - c.dir * i * 2.2), Math.round(y - i * 1.4), i < 5 ? 2 : 1, i < 5 ? 2 : 1);
      }
      g.globalAlpha = 1;
      halo(x, y, 13, '#fff07a', 0.6 + 0.2 * Math.sin(now / 90 + item.k));
      shape(STAR, x - 3, y - 3, STAR_COLORS);
    }

    function kite(item, c, now) {
      const x = Math.round(item.x) - 4;
      const y = Math.round(item.y) - 4;
      const color = KITES[item.k % KITES.length];
      // O losango: contorno escuro por baixo, depois a cor e a cruz de varetas.
      for (let r = 0; r < 9; r++) {
        const half = r <= 4 ? r : 8 - r;
        g.fillStyle = '#26242e';
        g.fillRect(x + 4 - half - 1, y + r, half * 2 + 3, 1);
      }
      for (let r = 0; r < 9; r++) {
        const half = r <= 4 ? r : 8 - r;
        g.fillStyle = color;
        g.fillRect(x + 4 - half, y + r, half * 2 + 1, 1);
      }
      g.fillStyle = '#fffaf0';
      g.fillRect(x + 4, y, 1, 9);
      g.fillRect(x + 1, y + 4, 7, 1);
      // A cauda: laços que balançam atrás.
      for (let i = 0; i < 7; i++) {
        const tx = x + 4 - c.dir * (i * 2 + 4);
        g.fillStyle = i % 2 ? '#ffd21e' : color;
        g.fillRect(Math.round(tx), Math.round(y + 9 + i + Math.sin(now / 160 + i * 1.3 + item.k) * 1.5), 2, 1);
      }
    }

    function firefly(item, now) {
      const blink = item.blink;
      halo(item.x, item.y, 11, '#d8ff5a', 0.3 + 0.5 * blink);
      g.fillStyle = blink > 0.35 ? '#f6ffa0' : '#8aa83a';
      g.fillRect(Math.round(item.x) - 1, Math.round(item.y) - 1, 3, 3);
      g.fillStyle = '#ffffff';
      if (blink > 0.6) g.fillRect(Math.round(item.x), Math.round(item.y), 1, 1);
      g.fillStyle = 'rgba(40, 60, 30, 0.8)';
      g.fillRect(Math.round(item.x) + (Math.sin(now / 90 + item.k) > 0 ? -1 : 2), Math.round(item.y), 1, 1);
    }

    // O balão que ninguém pegou estoura no chão: respingos e um pouco do chão molhado.
    function waterBalloon(item, c, now) {
      shape(WATER, Math.round(item.x) - 3, Math.round(item.y) - 3, WATER_COLORS);
      const key = `${c.a.born}:${item.k}`;
      if (item.p > 0.93 && !landed.has(key)) {
        landed.add(key);
        for (let i = 0; i < 7; i++) particle({ x: item.x, y: ground() - 2, vx: (rng() - 0.5) * 0.04, vy: -0.008 - rng() * 0.014, gravity: 0.00003, born: now, ttl: 650, colors: ['#9fc8ff'], drop: true });
        effects++;
      }
    }

    // Lampião: poste, telhadinho, caixa de vidro e a luz (apagado fica cinza com um contorno amarelo que pisca, para chamar o clique).
    function lamp(x, lit, now, k) {
      const px = Math.round(x);
      const top = ground() - 28;
      g.fillStyle = '#4a2a14';
      g.fillRect(px, top + 11, 2, 17);
      g.fillStyle = '#26242e';
      g.fillRect(px - 4, top + 1, 10, 12);
      g.fillStyle = lit ? '#ffd21e' : '#4a4a5a';
      g.fillRect(px - 3, top + 2, 8, 10);
      g.fillStyle = lit ? '#fff6b8' : '#6a6a7a';
      g.fillRect(px - 2, top + 3, 2, 4);
      g.fillStyle = '#8a3a22';
      g.fillRect(px - 5, top - 1, 12, 3);
      g.fillRect(px - 3, top - 3, 8, 2);
      if (lit) {
        halo(px + 1, top + 7, 24, '#ffb347', 0.6);
        light(px + 1, top + 7, 30, '#ffd27a', 0.55);
      } else if (Math.sin(now / 260 + k * 2) > 0) {
        g.fillStyle = '#ffe27a';
        g.fillRect(px - 5, top - 4, 12, 1);
        g.fillRect(px - 5, top + 13, 12, 1);
        g.fillRect(px - 5, top - 4, 1, 18);
        g.fillRect(px + 6, top - 4, 1, 18);
      }
    }

    // Moita com os olhos que piscam.
    function bush(item, now) {
      const x = Math.round(item.x);
      const y = Math.round(item.y);
      g.fillStyle = '#10261a';
      g.fillRect(x - 6, y - 7, 13, 8);
      g.fillRect(x - 4, y - 9, 9, 3);
      g.fillStyle = '#1c3e28';
      g.fillRect(x - 5, y - 6, 3, 2);
      g.fillRect(x + 2, y - 8, 3, 2);
      const open = Math.sin(now / 400 + item.k * 2.3) > -0.55;
      if (open) {
        g.fillStyle = '#ffe27a';
        g.fillRect(x - 3, y - 5, 2, 2);
        g.fillRect(x + 2, y - 5, 2, 2);
        halo(x - 2, y - 4, 5, '#ffd21e', 0.25);
        halo(x + 3, y - 4, 5, '#ffd21e', 0.25);
      }
    }

    // Flor dourada: pétalas rosa em volta de um miolo amarelo.
    const FLOWER = ['..pp..', '.ppWpp', 'ppWyWp', 'pWyyyW', '.pWyWp', '..pp..'];
    const FLOWER_COLORS = { p: '#ff8ac8', W: '#fff4f8', y: '#ffd21e' };
    function flower(item, now) {
      halo(item.x, item.y, 11, '#ffd8f0', 0.35 + 0.25 * Math.sin(now / 200 + item.k));
      shape(FLOWER, Math.round(item.x) - 6, Math.round(item.y) - 6, FLOWER_COLORS, 2);
    }

    // Balão junino: papel colorido em gomos, a chama embaixo e o brilho quente em volta.
    const PAPER = ['..aaaa..', '.aabbaa.', 'aabbbbaa', 'aabbbbaa', 'aabbbbaa', 'aaabbaaa', '.aabbaa.', '..abba..', '...aa...'];
    function paperBalloon(item, now) {
      const x = Math.round(item.x) - 8;
      const y = Math.round(item.y) - 12;
      halo(item.x, item.y + 4, 20, '#ffb347', 0.4 + 0.1 * Math.sin(now / 130 + item.k));
      const colors = [['#ee2f3c', '#ffd21e'], ['#3a6cf0', '#ffffff'], ['#35a03a', '#ffd21e'], ['#ff4f9e', '#ffffff'], ['#ff8a12', '#fff4a0'], ['#9d5cf0', '#ffd21e']][item.k % 6];
      shape(PAPER, x, y, { a: colors[0], b: colors[1] }, 2);
      g.fillStyle = '#26242e';
      g.fillRect(x + 6, y + 18, 4, 2);
      g.fillStyle = Math.sin(now / 90 + item.k) > 0 ? '#ffe27a' : '#ff8a12';
      g.fillRect(x + 6, y + 20, 4, 3);
    }

    // Pedra de granizo: cristal branco azulado com brilho e um risquinho de queda.
    const HAIL = ['..w..', '.wWw.', 'wWWWw', '.wWw.', '..w..'];
    function hailstone(item) {
      const x = Math.round(item.x);
      const y = Math.round(item.y);
      g.fillStyle = 'rgba(220, 240, 255, 0.5)';
      g.fillRect(x, y - 8, 1, 3);
      g.fillRect(x, y - 5, 1, 2);
      halo(x, y, 9, '#cfe8ff', 0.5);
      shape(HAIL, x - 5, y - 5, { w: '#9ac8f0', W: '#ffffff' }, 2);
    }

    // Redemoinho: uma coluna de poeira que gira, com folhas em volta e o gorro vermelho do Saci no alto.
    function whirl(item, c, now) {
      const x = Math.round(item.x);
      const base = ground() + 1;
      for (let i = 0; i < 12; i++) {
        const half = 2 + i * 0.55;
        const y = base - i * 2.5;
        const off = Math.sin(now / 130 + i * 0.7 + item.k) * (1 + i * 0.25);
        g.fillStyle = i % 2 ? 'rgba(214, 178, 120, 0.85)' : 'rgba(168, 128, 80, 0.85)';
        g.fillRect(Math.round(x + off - half), Math.round(y), Math.round(half * 2), 2);
      }
      for (let i = 0; i < 5; i++) {
        const ang = now / 160 + i * 1.26 + item.k;
        g.fillStyle = ['#9ef05a', '#ffd21e', '#c08a3a'][i % 3];
        g.fillRect(Math.round(x + Math.cos(ang) * (5 + i)), Math.round(base - 6 - i * 5 + Math.sin(ang * 1.3) * 2), 2, 1);
      }
      // O gorro do Saci, rodando bem no alto.
      const cx = Math.round(x + Math.sin(now / 130 + item.k) * 3);
      const cy = base - 32;
      g.fillStyle = '#26242e';
      g.fillRect(cx - 3, cy - 1, 7, 5);
      g.fillRect(cx - 1, cy - 4, 3, 3);
      g.fillStyle = '#ee2f3c';
      g.fillRect(cx - 2, cy, 5, 3);
      g.fillRect(cx - 1, cy - 3, 2, 3);
      g.fillStyle = '#ff6a7a';
      g.fillRect(cx - 2, cy, 2, 1);
    }

    // Pipoca: um pipocão branco e amarelo.
    const POP = ['.wyw.', 'wwwyw', 'ywwww', 'wwyww', '.www.'];
    function popcorn(item) {
      shape(POP, Math.round(item.x) - 5, Math.round(item.y) - 5, { w: '#fffaf0', y: '#ffd21e' }, 2);
      g.fillStyle = 'rgba(255, 210, 30, 0.35)';
      g.fillRect(Math.round(item.x) - 6, Math.round(item.y) + 5, 12, 1);
    }

    // Foguete subindo: ponta clara, rastro de faísca laranja e brilho.
    function rocket(item, c, now) {
      const x = Math.round(item.x);
      const y = Math.round(item.y);
      for (let i = 1; i <= 10; i++) {
        g.globalAlpha = 0.8 * (1 - i / 11);
        g.fillStyle = i < 4 ? '#fff4a0' : '#ff8a12';
        g.fillRect(x + Math.round(Math.sin(now / 60 + i) * 0.8), y + i * 2, i < 4 ? 2 : 1, 2);
      }
      g.globalAlpha = 1;
      halo(x, y, 11, '#ffe27a', 0.55);
      g.fillStyle = '#ffffff';
      g.fillRect(x - 1, y - 2, 3, 5);
      g.fillStyle = '#ee2f3c';
      g.fillRect(x - 1, y - 3, 3, 2);
    }

    // Um estouro: bolinhas que saem em roda e caem apagando.
    const BURSTS = [['#ff4f5e', '#ffd0d4'], ['#ffe27a', '#fff8d0'], ['#6fa8ff', '#d0e4ff'], ['#7ef07a', '#d4ffd0'], ['#ff8ad0', '#ffd8f0']];
    function burst(x, y, count, now) {
      const colors = BURSTS[Math.floor(rng() * BURSTS.length)];
      for (let i = 0; i < count; i++) {
        const ang = i / count * TAU + rng() * 0.2;
        const speed = 0.022 + rng() * 0.02;
        particle({ x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, gravity: 0.00002, born: now, ttl: 900 + rng() * 400, colors });
      }
      effects++;
    }

    // A cobra de fogo inteira: do rabo escuro à cabeça amarela, com brilho; os pedaços pegos ficam azulados e apagados.
    function boitataBody(c, now) {
      const lay = layout();
      const taken = new Set([...c.got].map(k => 2 + 2 * k));
      for (let i = SNAKE_SEGMENTS - 1; i >= 0; i--) {
        const point = snake(c, i, lay);
        if (!point) continue;
        const heat = 1 - i / SNAKE_SEGMENTS;
        const out = taken.has(i);
        const r = i === 0 ? 5 : 3 + Math.round(heat * 2);
        if (!out) halo(point.x, point.y, 8 + r, '#ff8a12', 0.18 + 0.25 * heat);
        g.fillStyle = out ? '#5a6a88' : i === 0 ? '#ffe27a' : heat > 0.6 ? '#ffb02a' : heat > 0.3 ? '#ff6a1e' : '#a82a1a';
        g.fillRect(Math.round(point.x) - r, Math.round(point.y) - r + 1, r * 2, r * 2 - 1);
        g.fillRect(Math.round(point.x) - r + 1, Math.round(point.y) - r, r * 2 - 2, r * 2 + 1);
        if (!out && i > 1 && i % 2 === 0) {
          g.fillStyle = '#fff4a0';
          g.fillRect(Math.round(point.x) - 1, Math.round(point.y) - 1, 2, 2);
        }
        if (i === 0) {
          g.fillStyle = '#26242e';
          g.fillRect(Math.round(point.x) - 3, Math.round(point.y) - 2, 2, 2);
          g.fillRect(Math.round(point.x) + 1, Math.round(point.y) - 2, 2, 2);
          g.fillStyle = '#ee2f3c';
          g.fillRect(Math.round(point.x) - 2, Math.round(point.y) + 2, 4, 1);
        }
      }
    }

    // Ave de asa-branca: duas asas que sobem e descem; as pegas ficam douradas.
    const DOVE_UP = ['w.....w', '.ww.ww.', '..www..'];
    const DOVE_DOWN = ['..www..', '.ww.ww.', 'w.....w'];
    function dove(point, now, i, got) {
      const x = Math.round(point.x) - 7;
      const y = Math.round(point.y) - 3;
      const up = Math.floor(now / 130 + i) % 2 === 0;
      shape(up ? DOVE_UP : DOVE_DOWN, x, y, { w: got ? '#ffd21e' : '#fffaf0' }, 2);
      g.fillStyle = got ? '#fff6b8' : '#c8ccd8';
      g.fillRect(x + 6, y + (up ? 4 : 2), 2, 2);
      if (got) halo(point.x, point.y, 10, '#ffd21e', 0.45);
    }

    // Vela da procissão: corpo de cera e uma chama que pisca, com a luz em volta.
    function candle(point, now, i, got) {
      const x = Math.round(point.x);
      const y = Math.round(point.y);
      halo(x, y - 9, got ? 16 : 11, got ? '#ffd21e' : '#ff9a3c', got ? 0.6 : 0.4);
      g.fillStyle = '#26242e';
      g.fillRect(x - 3, y - 8, 6, 10);
      g.fillStyle = '#fffaf0';
      g.fillRect(x - 2, y - 7, 4, 9);
      g.fillStyle = '#c8b890';
      g.fillRect(x + 1, y - 7, 1, 9);
      g.fillStyle = '#26242e';
      g.fillRect(x - 1, y - 12, 2, 4);
      g.fillStyle = Math.sin(now / 90 + i * 2) > 0 ? '#ffe27a' : '#ff8a12';
      g.fillRect(x - 1, y - 12, 2, 4);
      g.fillStyle = got ? '#ffffff' : '#fff6b8';
      g.fillRect(x - 1, y - 11, 1, 2);
    }

    // O disco voador: casco cinza, cúpula de vidro, luzinhas que piscam e o raio verde-amarelado até o chão.
    function ufo(c, now) {
      const lay = layout();
      const pos = ufoAt(c, lay);
      const x = Math.round(pos.x);
      const y = Math.round(pos.y);
      // O raio: faixas largas e transparentes, mais largas perto do chão.
      const bottom = ground();
      for (let row = y + 5; row < bottom; row += 2) {
        const half = 4 + (row - y) * 0.22;
        g.globalAlpha = 0.16 * c.k;
        g.fillStyle = '#e8ff7a';
        g.fillRect(Math.round(x - half), row, Math.round(half * 2), 2);
      }
      g.globalAlpha = c.k;
      g.fillStyle = '#26242e';
      g.fillRect(x - 9, y + 1, 19, 5);
      g.fillRect(x - 5, y - 3, 11, 5);
      g.fillStyle = '#9a9ca8';
      g.fillRect(x - 8, y + 2, 17, 3);
      g.fillStyle = '#c8ccd8';
      g.fillRect(x - 7, y + 2, 15, 1);
      g.fillStyle = '#8fd4ee';
      g.fillRect(x - 4, y - 2, 9, 3);
      g.fillStyle = '#d8f4ff';
      g.fillRect(x - 3, y - 2, 3, 1);
      for (let i = 0; i < 5; i++) {
        g.fillStyle = Math.floor(now / 200 + i) % 3 === 0 ? '#ffffff' : ['#ee2f3c', '#ffd21e', '#35a03a'][i % 3];
        g.fillRect(x - 6 + i * 3, y + 4, 2, 1);
      }
      g.globalAlpha = 1;
      halo(x, y + 4, 18, '#e8ff7a', 0.3 * c.k);
    }

    // Vaca no raio: branca com manchas pretas, levitando de pernas para baixo.
    const COW = ['..k....k.', '.wwwwwwww', 'wwkwwwkww', 'wwwwwwwww', '.w.w.w.w.', '.k.k.k.k.'];
    function cow(item, now) {
      shape(COW, Math.round(item.x) - 5, Math.round(item.y) - 3 + Math.round(Math.sin(now / 150 + item.k) * 1), { w: '#fffaf0', k: '#26242e' }, 1);
      halo(item.x, item.y, 10, '#e8ff7a', 0.3);
    }

    // Barraca da feira: balcão de madeira, toldo listrado, as mercadorias em cima e o preço em fichas; a comprada fica apagada com um "ok".
    const STALL_COLORS = [['#ee2f3c', '#fffaf0'], ['#3a6cf0', '#fffaf0'], ['#ff4f9e', '#fffaf0']];
    function stall(x, k, cost, sold, now) {
      const px = Math.round(x);
      const top = ground() - 24;
      const [a, b] = sold ? ['#8a8e9c', '#c8ccd8'] : STALL_COLORS[k % 3];
      g.fillStyle = '#4a2a14';
      g.fillRect(px - 11, top + 4, 2, 20);
      g.fillRect(px + 10, top + 4, 2, 20);
      g.fillStyle = sold ? '#6a5a4a' : '#8a5a2a';
      g.fillRect(px - 11, ground() - 8, 24, 8);
      g.fillStyle = sold ? '#8a7a6a' : '#b07a44';
      g.fillRect(px - 11, ground() - 8, 24, 1);
      for (let i = 0; i < 12; i++) {
        g.fillStyle = i % 2 ? b : a;
        g.fillRect(px - 12 + i * 2, top, 2, 6);
      }
      g.fillStyle = '#26242e';
      g.fillRect(px - 12, top + 6, 26, 1);
      g.fillRect(px - 12, top - 1, 26, 1);
      // As mercadorias: pamonha (verde e amarela), copo de quentão (vermelho) e algodão-doce (rosa).
      if (!sold) {
        if (k % 3 === 0) { g.fillStyle = '#7ab04a'; g.fillRect(px - 6, ground() - 12, 4, 4); g.fillRect(px - 1, ground() - 12, 4, 4); g.fillStyle = '#ffe27a'; g.fillRect(px + 4, ground() - 11, 3, 3); }
        else if (k % 3 === 1) { g.fillStyle = '#c8ccd8'; g.fillRect(px - 6, ground() - 12, 4, 4); g.fillRect(px, ground() - 12, 4, 4); g.fillStyle = '#ee2f3c'; g.fillRect(px - 5, ground() - 11, 2, 2); g.fillRect(px + 1, ground() - 11, 2, 2); }
        else { g.fillStyle = '#ffb0d8'; g.fillRect(px - 6, ground() - 13, 4, 5); g.fillRect(px - 1, ground() - 13, 4, 5); g.fillRect(px + 4, ground() - 13, 4, 5); g.fillStyle = '#fff4f8'; g.fillRect(px - 5, ground() - 12, 1, 1); }
      }
      // O preço (ou o "ok"), uma fichinha dourada pequena ao lado.
      if (write) write(sold ? 'OK' : String(cost), px, top - 9, sold ? '#9ef05a' : '#ffd21e');
      if (!sold && Math.sin(now / 300 + k) > 0.2) {
        g.fillStyle = '#ffe27a';
        g.fillRect(px - 13, top - 3, 28, 1);
      }
    }

    // A marca do tesouro: um X vermelho que pisca; o buraco cavado fica escuro com um brilho de moedas.
    function treasureMark(item, dug, now) {
      const x = Math.round(item.x);
      const y = Math.round(item.y);
      if (dug) {
        g.fillStyle = '#26180e';
        g.fillRect(x - 6, y - 2, 13, 4);
        g.fillStyle = '#4a2a14';
        g.fillRect(x - 5, y - 3, 11, 1);
        g.fillStyle = '#ffd21e';
        if (Math.sin(now / 200 + item.k) > 0) g.fillRect(x - 1, y - 2, 2, 2);
        return;
      }
      g.fillStyle = 'rgba(80, 40, 20, 0.5)';
      g.fillRect(x - 7, y + 3, 15, 2);
      const on = Math.sin(now / 260 + item.k) > -0.2;
      g.fillStyle = on ? '#ee2f3c' : '#a82a22';
      for (let i = -4; i <= 4; i++) {
        g.fillRect(x + i, y - 3 + Math.round(i * 0.9) + 3, 2, 2);
        g.fillRect(x + i, y + 3 - Math.round(i * 0.9) - 3, 2, 2);
      }
      g.fillStyle = '#fff4a0';
      g.fillRect(x, y - 1, 2, 2);
      halo(x, y, 10, '#ff8a8a', on ? 0.35 : 0.15);
    }

    // Floco de neve grande (7x7 de pixels em dobro) com brilho azulado.
    const FLAKE = ['w..c..w', '.w.c.w.', '..wcw..', 'cccwccc', '..wcw..', '.w.c.w.', 'w..c..w'];
    function flake(item, now) {
      const x = Math.round(item.x);
      const y = Math.round(item.y);
      halo(x, y, 12, '#cfe8ff', 0.45 + 0.15 * Math.sin(now / 200 + item.k));
      shape(FLAKE, x - 7, y - 7, { w: '#ffffff', c: '#a8d0f8' }, 2);
    }

    // Moeda de ouro girando: a largura vai e volta como se virasse.
    function coin(item, now) {
      const x = Math.round(item.x);
      const y = Math.round(item.y);
      const half = Math.max(1, Math.round(Math.abs(Math.cos(now / 110 + item.k * 1.7)) * 3));
      halo(x, y, 9, '#ffd21e', 0.4);
      g.fillStyle = '#9a6a08';
      g.fillRect(x - half - 1, y - 4, half * 2 + 2, 8);
      g.fillRect(x - half, y - 5, half * 2, 10);
      g.fillStyle = '#ffd21e';
      g.fillRect(x - half, y - 4, half * 2, 8);
      g.fillStyle = '#fff07a';
      g.fillRect(x - half + 1, y - 3, 1, 4);
    }

    // As coisas que boiam na cheia (uma por alvo, na ordem): chinelo, galinha na boia, caixote, bola de praia e patinho de borracha.
    const FLOATIES = [
      { rows: ['..rwr....', '.r.w.r...', 'rrrwrrrr.', 'rrrrrrrrr', '.kkkkkkk.'], pal: { r: '#ee2f3c', w: '#fffaf0', k: '#6a1a1e' } },
      { rows: ['...r.....', '..www....', '..wkwo...', '.wwwww...', 'yyyyyyyyy', 'yoyoyoyoy', '.yyyyyyy.'], pal: { r: '#ee2f3c', w: '#fffaf0', k: '#26242e', o: '#ff8a12', y: '#ffd21e' } },
      { rows: ['nnnnnnnnn', 'nYYYYYYYn', 'nYnnnnnYn', 'nYnnnnnYn', 'nYYYYYYYn', 'nnnnnnnnn'], pal: { n: '#8a5a2a', Y: '#c89a5a' } },
      { rows: ['..rwb..', '.rrwbb.', 'rrrwbbb', 'rrrwbbb', 'rrrwbbb', '.rrwbb.', '..rwb..'], pal: { r: '#ee2f3c', w: '#fffaf0', b: '#3a78d8' } },
      { rows: ['..yy.....', '.yyyo....', '.ykyy....', '..yyyyy..', '.yyyyyyy.', '..yyyyy..'], pal: { y: '#ffd21e', o: '#ff8a12', k: '#26242e' } },
    ];
    function floatie(item, now) {
      const x = Math.round(item.x);
      const y = Math.round(item.y);
      const sprite = FLOATIES[item.k % FLOATIES.length];
      const w = sprite.rows[0].length;
      shape(sprite.rows, x - Math.floor(w / 2), y - sprite.rows.length + 2, sprite.pal);
      g.globalAlpha = 0.6;
      g.fillStyle = '#e8d0a0';
      g.fillRect(x - Math.floor(w / 2) - 1, y + 2, w + 2, 1);
      g.globalAlpha = 1;
      halo(x, y - 3, 11, '#fff4a0', 0.3 + 0.12 * Math.sin(now / 180 + item.k));
    }

    // Uma linha de pontinhos de (x0, y0) a (x1, y1) (a constelação sendo desenhada).
    const dotLine = (x0, y0, x1, y1) => {
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let s = 0; s <= steps; s++) g.fillRect(Math.round(x0 + (x1 - x0) * s / steps), Math.round(y0 + (y1 - y0) * s / steps), 1, 1);
    };

    // O sapo: sentado no chão ou esticado no ar, com os olhos de fora e uma sombrinha.
    const FROG_SIT = ['.gg...gg.', 'gwkg.gwkg', '.ggggggg.', 'ggGgggGgg', 'gGGGGGGGg', '.gg...gg.'];
    const FROG_JUMP = ['.gg...gg.', 'gwkg.gwkg', '.ggggggg.', '.gGgggGg.', '..ggggg..', '.g.....g.', 'gg.....gg'];
    const FROG_COLORS = { g: '#56c860', G: '#2e8a44', w: '#ffffff', k: '#26242e' };
    function frog(item, now) {
      const x = Math.round(item.x);
      const y = Math.round(item.y);
      const air = y < ground() - 8;
      if (air) {
        g.globalAlpha = 0.3;
        g.fillStyle = '#1f2a18';
        g.fillRect(x - 4, ground() - 1, 9, 1);
        g.globalAlpha = 1;
      }
      halo(x, y, 9, '#9ef05a', 0.22 + 0.08 * Math.sin(now / 160 + item.k));
      shape(air ? FROG_JUMP : FROG_SIT, x - 4, y - 3, FROG_COLORS);
    }

    // A locomotiva, desenhada olhando para a direita (`d` espelha): caldeira preta com faixa dourada, chaminé, cabine vermelha e farol.
    function locomotive(px, d, now) {
      const r = (off, w, y, h, color) => { g.fillStyle = color; g.fillRect(d > 0 ? px + off : px - off - w + 1, y, w, h); };
      const base = TRAIN_Y;
      r(-7, 15, base - 5, 2, '#26242e');
      for (const off of [-6, -1, 4]) r(off, 3, base - 3, 3, '#3a3a46');
      r(-7, 5, base - 12, 7, '#c0302a');
      r(-8, 7, base - 13, 1, '#26242e');
      r(-5, 2, base - 10, 3, '#fff4a0');
      r(-2, 9, base - 10, 5, '#2a2a32');
      r(2, 1, base - 10, 5, '#ffd21e');
      r(3, 3, base - 14, 4, '#26242e');
      r(2, 5, base - 15, 1, '#26242e');
      r(7, 2, base - 4, 2, '#8a8e9c');
      r(8, 1, base - 8, 2, '#fff07a');
      // A fumaça sobe da chaminé e fica para trás.
      for (let j = 0; j < 4; j++) {
        const age = (now / 800 + j / 4) % 1;
        const sy = base - 16 - age * 9;
        if (sy < 0) continue;
        g.globalAlpha = (1 - age) * 0.75;
        g.fillStyle = '#eef2f8';
        const size = 2 + Math.round(age * 2);
        g.fillRect(Math.round(px + d * 4 - d * age * 16) - 1, Math.round(sy), size, size);
      }
      g.globalAlpha = 1;
    }

    // Um vagão com a janela acesa e o passageiro acenando (se ainda não deu o presente, a janela fica apagada).
    const WAGONS = ['#ee2f3c', '#3a6cf0', '#35a03a', '#ff8a12'];
    function wagon(px, i, gone, now) {
      const base = TRAIN_Y;
      g.fillStyle = WAGONS[i % 4];
      g.fillRect(px - 6, base - 9, 13, 7);
      g.fillStyle = '#26242e';
      g.fillRect(px - 7, base - 10, 15, 1);
      g.fillRect(px - 5, base - 2, 3, 2);
      g.fillRect(px + 2, base - 2, 3, 2);
      g.fillRect(px - 7, base - 4, 1, 1);
      g.fillStyle = gone ? '#4a4a58' : '#fff4a0';
      g.fillRect(px - 2, base - 8, 5, 4);
      if (!gone) {
        g.fillStyle = '#f0c090';
        g.fillRect(px - 1, base - 7, 2, 2);
        g.fillStyle = WAGONS[(i + 2) % 4];
        g.fillRect(px - 1, base - 8, 2, 1);
        g.fillStyle = '#f0c090';
        g.fillRect(px + 2, base - 8 - (Math.floor(now / 220 + i) % 2), 1, 2);
      }
    }

    function train(c, lay, now) {
      // O trilho de nuvens por baixo.
      g.globalAlpha = 0.5 * c.k;
      g.fillStyle = '#ffffff';
      for (let x = lay.L; x < lay.R - 3; x += 6) g.fillRect(x, TRAIN_Y + 1, 4, 1);
      g.globalAlpha = c.k;
      for (let i = 4; i >= 0; i--) {
        const pos = trainPos(c, lay, i);
        if (pos.x < lay.L - 16 || pos.x > lay.R + 16) continue;
        const px = Math.round(pos.x);
        if (i === 0) locomotive(px, c.dir, now);
        else wagon(px, i, c.got.has(i), now);
        if (!c.got.has(i) && i > 0) halo(px, TRAIN_Y - 6, 9, '#fff4a0', 0.18);
      }
      g.globalAlpha = 1;
    }

    // A pinhata: bola de papel crepom em listras, com pontas, olhinhos, franja embaixo e a corda presa lá em cima; cada golpe racha mais.
    const PINATA_COLORS = ['#ee2f3c', '#ffd21e', '#3a6cf0', '#35a03a', '#ff4f9e'];
    function pinata(item, hits, now) {
      const x = Math.round(item.x);
      const y = Math.round(item.y);
      g.fillStyle = '#c8a070';
      dotLine(Math.round(item.ax), 16, x, y - 8);
      for (let a = 0; a < 5; a++) {
        const angle = -Math.PI / 2 + a * TAU / 5 + 0.25 * Math.sin(now / 500 + item.k);
        const tx = x + Math.cos(angle) * 10;
        const ty = y + Math.sin(angle) * 10;
        g.fillStyle = PINATA_COLORS[(a + item.k) % 5];
        g.fillRect(Math.round(tx) - 1, Math.round(ty) - 1, 3, 3);
        g.fillRect(Math.round((tx + x) / 2) - 1, Math.round((ty + y) / 2) - 1, 3, 3);
      }
      for (let dy = -6; dy <= 6; dy++) {
        const half = Math.round(Math.sqrt(36 - dy * dy));
        g.fillStyle = PINATA_COLORS[(((dy + 6) >> 1) + item.k) % 5];
        g.fillRect(x - half, y + dy, half * 2 + 1, 1);
      }
      for (let i = -5; i <= 5; i += 2) {
        g.fillStyle = PINATA_COLORS[(i + 5 + item.k) % 5];
        g.fillRect(x + i, y + 7, 1, i % 4 === 0 ? 3 : 2);
      }
      g.fillStyle = '#ffffff';
      g.fillRect(x - 3, y - 2, 2, 2);
      g.fillRect(x + 2, y - 2, 2, 2);
      g.fillStyle = '#26242e';
      g.fillRect(x - 2, y - 1, 1, 1);
      g.fillRect(x + 3, y - 1, 1, 1);
      g.fillRect(x - 2, y + 2, 5, 1);
      // Um risco de rachadura por golpe.
      for (let n = 0; n < hits; n++) {
        const cx = x - 4 + ((n * 5) % 9);
        const cy = y - 5 + ((n * 3) % 10);
        g.fillRect(cx, cy, 1, 2);
        g.fillRect(cx + 1, cy + 2, 1, 1);
      }
      halo(x, y, 14, '#ffe27a', 0.2);
    }

    // O galo: corpo laranja, cauda verde-azulada, crista vermelha; ao cantar, a cabeça sobe, o bico abre e saem ondinhas.
    function rooster(item, now) {
      const x = Math.round(item.x);
      const y = Math.round(item.y);
      const crow = Math.floor(now / 320 + item.k) % 2 === 0;
      g.fillStyle = '#e8a812';
      g.fillRect(x - 2, y + 4, 1, 3);
      g.fillRect(x + 1, y + 4, 1, 3);
      g.fillStyle = '#b8541e';
      g.fillRect(x - 4, y - 2, 9, 7);
      g.fillStyle = '#e07a2a';
      g.fillRect(x - 3, y - 1, 7, 4);
      g.fillStyle = '#1f7a5a';
      g.fillRect(x - 6, y - 5, 2, 7);
      g.fillRect(x - 7, y - 4, 1, 4);
      const hy = crow ? y - 9 : y - 6;
      g.fillStyle = '#e07a2a';
      g.fillRect(x + 2, hy + 1, 3, 6);
      g.fillStyle = '#f4f0e8';
      g.fillRect(x + 2, hy, 4, 3);
      g.fillStyle = '#ee2f3c';
      g.fillRect(x + 3, hy - 2, 3, 2);
      g.fillRect(x + 3, hy + 3, 1, 2);
      g.fillStyle = '#ffd21e';
      g.fillRect(x + 6, hy + 1, crow ? 3 : 2, 1);
      if (crow) g.fillRect(x + 6, hy + 3, 2, 1);
      g.fillStyle = '#26242e';
      g.fillRect(x + 4, hy + 1, 1, 1);
      if (crow) {
        for (let i = 0; i < 2; i++) {
          g.globalAlpha = 0.65 - i * 0.25;
          g.fillStyle = '#fff4a0';
          g.fillRect(x + 10 + i * 3, hy - 1 + i, 1, 4 - i);
        }
        g.globalAlpha = 1;
      }
      halo(x, y, 12, '#ffe27a', 0.2);
    }

    // As coisas que escorregam na turbulência (uma por alvo, na ordem): chapéu de palha, milho, garrafa de quentão, caixote e bola.
    const SLIDERS = [
      { rows: ['...yyyyy...', '..yyrrryy..', '.yyyyyyyyy.', 'YYYYYYYYYYY'], pal: { y: '#e8c060', Y: '#c89a30', r: '#ee2f3c' } },
      { rows: ['.gg......', 'ggyyyyyy.', 'gGyYyYyyy', 'ggyyyyyy.', '.gg......'], pal: { g: '#56c860', G: '#2e8a44', y: '#ffd21e', Y: '#e8a812' } },
      { rows: ['......kk.', 'ggggggggk', 'gwwggggkk', 'ggggggggk'], pal: { g: '#2e8a44', w: '#bfe8c0', k: '#26242e' } },
      FLOATIES[2],
      FLOATIES[3],
    ];
    function slider(item, now) {
      const x = Math.round(item.x);
      const y = Math.round(item.y);
      const sprite = SLIDERS[item.k % SLIDERS.length];
      const w = sprite.rows[0].length;
      shape(sprite.rows, x - Math.floor(w / 2), y - Math.floor(sprite.rows.length / 2), sprite.pal);
      halo(x, y, 11, '#fff4a0', 0.3 + 0.12 * Math.sin(now / 180 + item.k));
    }

    // A ficha dourada: um retângulo com picote que gira (a largura vai e volta), com brilho.
    function ticket(item, now) {
      const x = Math.round(item.x);
      const y = Math.round(item.y);
      const half = Math.max(1, Math.round(Math.abs(Math.cos(now / 140 + item.k * 1.3)) * 5));
      halo(x, y, 10, '#ffd21e', 0.4);
      g.fillStyle = '#a8740a';
      g.fillRect(x - half - 1, y - 4, half * 2 + 2, 8);
      g.fillStyle = '#ffd21e';
      g.fillRect(x - half, y - 3, half * 2, 6);
      g.fillStyle = '#fff07a';
      g.fillRect(x - half, y - 3, half * 2, 1);
      if (half > 2) {
        g.fillStyle = '#a8740a';
        g.fillRect(x, y - 2, 1, 1);
        g.fillRect(x, y, 1, 1);
        g.fillRect(x, y + 2, 1, 1);
      }
    }

    function comet(item, c, now) {
      const x = item.x;
      const y = item.y;
      // O rastro: um feixe longo de pontos que apagam, e brilhos que ficam para trás.
      for (let i = 1; i <= 46; i++) {
        const along = i * 2.6;
        const px = x - c.dir * along;
        const py = y - along * 0.28 + Math.sin(now / 200 + i * 0.6) * (i * 0.04);
        g.globalAlpha = 0.85 * (1 - i / 48);
        g.fillStyle = i < 10 ? '#fffbe0' : '#9fd0ff';
        const s = i < 8 ? 4 : i < 20 ? 3 : 2;
        g.fillRect(Math.round(px), Math.round(py), s, s);
      }
      g.globalAlpha = 1;
      halo(x, y, 22, '#cfe8ff', 0.6);
      halo(x, y, 11, '#ffffff', 0.75);
      g.fillStyle = '#ffffff';
      g.fillRect(Math.round(x) - 3, Math.round(y) - 3, 7, 7);
      g.fillStyle = '#fff6b8';
      g.fillRect(Math.round(x) - 1, Math.round(y) - 5, 3, 11);
      g.fillRect(Math.round(x) - 5, Math.round(y) - 1, 11, 3);
      if (now - cometAt > 120) {
        cometAt = now;
        particle({ x: x - c.dir * 6, y: y - 2, vx: -c.dir * 0.004, vy: 0.004, born: now, ttl: 900, colors: ['#fff6b8', '#9fd0ff'], wobble: rng() * 6 });
        effects++;
      }
    }

    function drawSky(c, now) {
      const lay = layout();
      if (c.id === 'lua') {
        // A lua cheia, enorme e cor de laranja, com a luz em volta, e três morcegos atravessando.
        const mx = Math.round(lay.L + lay.width * 0.2);
        const my = Math.max(14, Math.round(poleTop() * 0.45));
        halo(mx, my, 34, '#ffb347', 0.4 * c.k);
        g.globalAlpha = c.k;
        g.fillStyle = '#ffd99a';
        for (let y = -12; y <= 12; y++) {
          const half = Math.round(Math.sqrt(144 - y * y));
          g.fillRect(mx - half, my + y, half * 2 + 1, 1);
        }
        g.fillStyle = '#e8b36a';
        g.fillRect(mx - 5, my - 6, 4, 3);
        g.fillRect(mx + 3, my + 2, 5, 4);
        g.fillRect(mx - 8, my + 4, 3, 3);
        g.fillStyle = '#fff1c8';
        g.fillRect(mx - 9, my - 5, 3, 2);
        for (let i = 0; i < 3; i++) {
          const speed = 0.02 + i * 0.006;
          const bx = lay.L + ((now * speed + rnd(c.seed, i) * lay.width) % (lay.width + 24)) - 12;
          const by = 10 + i * 7 + Math.sin(now / 500 + i) * 3;
          shape(BAT[Math.floor(now / 140 + i) % 2], bx, by, { b: '#1a1226' });
        }
        g.globalAlpha = 1;
      } else if (c.id === 'eclipse') {
        // O sol com a lua passando na frente: no meio do evento cobre tudo e só sobra a coroa.
        const sx = Math.round(lay.L + lay.width * 0.5);
        const sy = Math.max(14, Math.round(poleTop() * 0.5));
        const p = clamp(c.t / c.dur, 0, 1);
        const cover = Math.sin(p * Math.PI);
        halo(sx, sy, 30 + 16 * cover, '#fff0a0', (0.55 - 0.3 * cover) * c.k);
        g.globalAlpha = c.k;
        const disc = (cx, cy, r, color) => {
          g.fillStyle = color;
          for (let y = -r; y <= r; y++) {
            const half = Math.round(Math.sqrt(r * r - y * y));
            g.fillRect(cx - half, cy + y, half * 2 + 1, 1);
          }
        };
        disc(sx, sy, 10, '#fff6b8');
        // A lua escura desliza da esquerda para a direita por cima do sol.
        disc(Math.round(sx + (p - 0.5) * 34), sy, 10, '#15122a');
        if (cover > 0.8) {
          halo(sx, sy, 26, '#fff4c0', 0.6 * c.k);
          g.fillStyle = '#fff4c0';
          for (let r = 0; r < 16; r++) {
            const ang = r / 16 * TAU + now / 3000;
            g.fillRect(Math.round(sx + Math.cos(ang) * 13), Math.round(sy + Math.sin(ang) * 13), 1, 1);
            g.fillRect(Math.round(sx + Math.cos(ang) * 16), Math.round(sy + Math.sin(ang) * 16), 1, 1);
          }
        }
        g.globalAlpha = 1;
      } else if (c.id === 'amanhecer') {
        // O sol subindo devagar atrás da festa, da esquerda, com a luz rosada se espalhando.
        const rise = clamp(c.t / (c.dur * 0.75), 0, 1);
        const sx = Math.round(lay.L + lay.width * 0.2);
        const sy = Math.round(Math.max(16, poleTop() * 0.8) + 30 * (1 - rise));
        halo(sx, sy, 44, '#ffb070', 0.5 * c.k);
        halo(sx, sy, 22, '#ffe0a0', 0.5 * c.k);
        g.globalAlpha = c.k;
        g.fillStyle = '#ffb347';
        for (let y = -11; y <= 11; y++) {
          const half = Math.round(Math.sqrt(121 - y * y));
          g.fillRect(sx - half, sy + y, half * 2 + 1, 1);
        }
        g.fillStyle = '#ffe9a0';
        for (let y = -7; y <= 4; y++) {
          const half = Math.round(Math.sqrt(49 - y * y));
          g.fillRect(sx - half - 2, sy + y - 2, half * 2 + 1, 1);
        }
        g.globalAlpha = 1;
      } else if (c.id === 'poente') {
        // O sol enorme, baixinho e alaranjado atrás da festa, com a luz se espalhando.
        const sx = Math.round(lay.L + lay.width * 0.72);
        const sy = Math.max(16, Math.round(poleTop() * 0.8));
        halo(sx, sy, 46, '#ff9a3c', 0.55 * c.k);
        halo(sx, sy, 24, '#ffd27a', 0.5 * c.k);
        g.globalAlpha = c.k;
        g.fillStyle = '#ffb347';
        for (let y = -12; y <= 12; y++) {
          const half = Math.round(Math.sqrt(144 - y * y));
          g.fillRect(sx - half, sy + y, half * 2 + 1, 1);
        }
        g.fillStyle = '#ffd98a';
        for (let y = -8; y <= 4; y++) {
          const half = Math.round(Math.sqrt(64 - y * y));
          g.fillRect(sx - half - 2, sy + y - 2, half * 2 + 1, 1);
        }
        // Passarinhos voltando para casa.
        for (let i = 0; i < 4; i++) {
          const bx = lay.L + ((now * (0.012 + i * 0.004) + rnd(c.seed, i) * lay.width) % (lay.width + 20)) - 10;
          const by = 12 + i * 5 + Math.sin(now / 400 + i) * 2;
          g.fillStyle = '#3a1a2a';
          g.fillRect(Math.round(bx), Math.round(by), 3, 1);
          g.fillRect(Math.round(bx) - 1, Math.round(by) - 1 + (Math.floor(now / 150 + i) % 2), 1, 1);
          g.fillRect(Math.round(bx) + 3, Math.round(by) - 1 + (Math.floor(now / 150 + i) % 2), 1, 1);
        }
        g.globalAlpha = 1;
      } else if (c.id === 'calorao') {
        // O sol forte no canto: disco claro, brilho em volta e raios.
        const sx = Math.round(lay.R - 26);
        const sy = Math.max(10, Math.round(poleTop() * 0.4));
        halo(sx, sy, 38, '#fff0a0', 0.55 * c.k);
        g.globalAlpha = c.k;
        g.fillStyle = '#fff6b8';
        for (let y = -8; y <= 8; y++) {
          const half = Math.round(Math.sqrt(64 - y * y));
          g.fillRect(sx - half, sy + y, half * 2 + 1, 1);
        }
        g.fillStyle = '#ffffff';
        g.fillRect(sx - 3, sy - 3, 4, 3);
        g.fillStyle = '#ffe27a';
        for (let r = 0; r < 12; r++) {
          const ang = r / 12 * TAU + now / 4000;
          g.fillRect(Math.round(sx + Math.cos(ang) * 12), Math.round(sy + Math.sin(ang) * 12), 1, 1);
          g.fillRect(Math.round(sx + Math.cos(ang) * 14), Math.round(sy + Math.sin(ang) * 14), 1, 1);
        }
        g.globalAlpha = 1;
      } else packs.forEach(pack => { if (pack.api.SKY[c.id]) pack.api.SKY[c.id](c, now); });
    }

    // O que muda a luz e o ar do mapa inteiro, por evento.
    function drawOver(c, now) {
      const lay = layout();
      const k = c.k;
      const targets = c.items;
      if (c.id === 'estrelas') {
        tint('#080e2e', 0.26 * k);
        // Estrelinhas de enfeite que riscam o céu e somem.
        if (now - streakAt > 170 && streaks.length < 14) {
          streakAt = now;
          streaks.push({ x: lay.L + rng() * lay.width, y: 2 + rng() * Math.max(6, poleTop() - 10), born: now, dir: c.dir });
          effects++;
        }
        for (let i = streaks.length - 1; i >= 0; i--) {
          const s = streaks[i];
          const age = (now - s.born) / 520;
          if (age >= 1) { streaks.splice(i, 1); continue; }
          g.globalAlpha = (1 - age) * k;
          g.fillStyle = '#fffff0';
          for (let j = 0; j < 6; j++) g.fillRect(Math.round(s.x + s.dir * (age * 26 - j * 2)), Math.round(s.y + age * 16 - j * 1.2), 1, 1);
          g.globalAlpha = 1;
        }
        for (const item of targets) star(item, c, now);
      } else if (c.id === 'ventania') {
        tint('#9fb8d0', 0.06 * k);
        // Folhas e pétalas atravessando, muitas.
        if (now - streakAt > 70 && fx().particles.length < 400) {
          streakAt = now;
          const from = c.dir > 0 ? lay.L - 6 : lay.R + 6;
          particle({ x: from, y: ground() - 10 - rng() * 80, vx: c.dir * (0.05 + rng() * 0.04), vy: (rng() - 0.4) * 0.01, gravity: 0.000004, born: now,
            ttl: 2200 + rng() * 1400, wobble: rng() * 6, flip: 90 + rng() * 100,
            colors: [['#9ef05a', '#35a03a'], ['#ffd21e', '#c07e08'], ['#ff8ac8', '#ad1e66'], ['#fff4e4', '#c8ccd6']][Math.floor(rng() * 4)] });
          effects++;
        }
        for (const item of targets) kite(item, c, now);
      } else if (c.id === 'vagalumes') {
        tint('#0c2a24', 0.12 * k);
        fog(c, now);
        for (const item of targets) firefly(item, now);
      } else if (c.id === 'calorao') {
        tint('#ff8a1e', 0.13 * k);
        // Ar tremendo em cima do chão: linhas claras ondulando.
        for (let i = 0; i < 5; i++) {
          const y = ground() - 8 - i * 8;
          g.globalAlpha = 0.11 * k;
          g.fillStyle = '#fff4d0';
          for (let x = lay.L; x < lay.R; x += 5) g.fillRect(x, y + Math.round(Math.sin(now / 280 + x / 7 + i * 1.7) * 1.5), 4, 1);
          g.globalAlpha = 1;
        }
        for (const item of targets) waterBalloon(item, c, now);
      } else if (c.id === 'temporal') {
        const lit = c.got.size;
        const dark = k * (1 - 0.9 * lit / c.n);
        tint('#06081a', 0.6 * dark);
        // O fogo da fogueira continua aceso no escuro.
        if (lay.fire) halo(lay.fire.x + lay.fire.meta.w / 2, ground() - lay.fire.meta.h * 0.5, 34, '#ff9a2a', 0.45 * dark);
        for (let i = 0; i < c.n; i++) {
          const pos = TARGETS.temporal(c, i, lay);
          lamp(pos.x, c.got.has(i), now, i);
        }
        // O raio: um risco quebrado do céu ao chão enquanto o clarão dura.
        if (now < fx().flashUntil - 40) {
          let x = lay.L + 20 + rnd(c.seed, Math.floor(lastBolt / 100)) * (lay.width - 40);
          g.fillStyle = '#f4faff';
          for (let y = 0; y < ground() - 4; y += 4) {
            x += (rnd(c.seed, y, Math.floor(lastBolt / 100)) - 0.5) * 7;
            g.fillRect(Math.round(x), y, 2, 4);
          }
        }
      } else if (c.id === 'lua') {
        tint('#1c2872', 0.2 * k);
        for (const item of targets) bush(item, now);
      } else if (c.id === 'cometa') {
        tint('#2a1c60', 0.14 * k);
        for (const item of targets) comet(item, c, now);
      } else if (c.id === 'petalas') {
        tint('#ff8ac8', 0.08 * k);
        // Pétalas caindo por toda a festa.
        if (now - streakAt > 55 && fx().particles.length < 420) {
          streakAt = now;
          particle({ x: lay.L + rng() * lay.width, y: 0, vx: (rng() - 0.5) * 0.012, vy: 0.012 + rng() * 0.008, born: now, ttl: 5200 + rng() * 2400, wobble: rng() * 6, flip: 90 + rng() * 100,
            colors: [['#ff8ac8', '#ad1e66'], ['#fff4f8', '#d8a8c8'], ['#ffd21e', '#c07e08'], ['#ffb0d8', '#c8508a']][Math.floor(rng() * 4)] });
          effects++;
        }
        for (const item of targets) flower(item, now);
      } else if (c.id === 'baloes') {
        tint('#ff9a3c', 0.1 * k);
        // Balõezinhos de enfeite subindo lá longe, bem pequenos e apagadinhos.
        for (let i = 0; i < 8; i++) {
          const prog = ((now / 26000 + rnd(c.seed, i)) % 1);
          const bx = lay.L + rnd(c.seed, i, 3) * lay.width + Math.sin(prog * 9 + i) * 6;
          const by = ground() - 20 - prog * (ground() - 14);
          g.globalAlpha = 0.5 * k * (1 - prog * 0.6);
          g.fillStyle = ['#ee2f3c', '#ffd21e', '#3a6cf0', '#35a03a'][i % 4];
          g.fillRect(Math.round(bx) - 1, Math.round(by) - 2, 3, 4);
          g.fillStyle = '#ffe27a';
          g.fillRect(Math.round(bx), Math.round(by) + 2, 1, 1);
          g.globalAlpha = 1;
        }
        for (const item of targets) paperBalloon(item, now);
      } else if (c.id === 'granizo') {
        tint('#566a8c', 0.2 * k);
        // Granizo miúdo quicando no chão, de enfeite.
        if (now - streakAt > 45 && fx().particles.length < 420) {
          streakAt = now;
          particle({ x: lay.L + rng() * lay.width, y: 0, vx: -0.004, vy: 0.05 + rng() * 0.02, born: now, ttl: ground() / 0.06, colors: ['#e8f4ff', '#9ac8f0'], drop: true });
          effects++;
        }
        for (const item of targets) hailstone(item);
      } else if (c.id === 'eclipse') {
        // Escuro no meio do evento, claro nas pontas.
        tint('#06081e', 0.5 * Math.sin(clamp(c.t / c.dur, 0, 1) * Math.PI) * k);
        for (const item of targets) {
          halo(item.x, item.y, 11, '#cfe8ff', 0.5 + 0.2 * Math.sin(now / 150 + item.k));
          shape(STAR, Math.round(item.x) - 3, Math.round(item.y) - 3, STAR_COLORS);
        }
      } else if (c.id === 'redemoinho') {
        tint('#b08a50', 0.07 * k);
        for (const item of targets) whirl(item, c, now);
      } else if (c.id === 'pipoca') {
        tint('#ffd860', 0.08 * k);
        // Pipoquinhas de enfeite caindo por toda a festa.
        if (now - streakAt > 60 && fx().particles.length < 420) {
          streakAt = now;
          particle({ x: lay.L + rng() * lay.width, y: 0, vx: (rng() - 0.5) * 0.01, vy: 0.014 + rng() * 0.01, born: now, ttl: 4200 + rng() * 1800, wobble: rng() * 6, flip: 70 + rng() * 80,
            colors: [['#fffaf0', '#e8d8a8'], ['#ffd21e', '#c8a008']][Math.floor(rng() * 2)] });
          effects++;
        }
        for (const item of targets) popcorn(item);
      } else if (c.id === 'fogos') {
        tint('#0a1038', 0.2 * k);
        for (const item of targets) {
          rocket(item, c, now);
          // Estoura sozinho lá em cima se ninguém pegar antes (uma vez por foguete).
          const key = `${c.a.born}:${item.k}`;
          if (item.p > 0.96 && !burstDone.has(key)) {
            burstDone.add(key);
            burst(item.x, item.y, 18, now);
          }
        }
      } else if (c.id === 'boitata') {
        tint('#4a1008', 0.12 * k);
        boitataBody(c, now);
      } else if (c.id === 'revoada') {
        tint('#e8e8ff', 0.05 * k);
        for (let i = 0; i < FLOCK; i++) {
          const point = flockBird(c, i, lay);
          if (!point) continue;
          const target = i % 2 === 1 && Math.floor((i - 1) / 2) < c.n ? Math.floor((i - 1) / 2) : -1;
          dove(point, now, i, target >= 0 && c.got.has(target));
        }
      } else if (c.id === 'procissao') {
        tint('#0a1038', 0.24 * k);
        for (let i = 0; i < CANDLES; i++) {
          const point = candlePoint(c, i, lay);
          if (!point) continue;
          const target = i % 2 === 1 && Math.floor((i - 1) / 2) < c.n ? Math.floor((i - 1) / 2) : -1;
          candle(point, now, i, target >= 0 && c.got.has(target));
        }
      } else if (c.id === 'ovni') {
        tint('#1a2a40', 0.12 * k);
        ufo(c, now);
        for (const item of targets) cow(item, now);
      } else if (c.id === 'fichas') {
        tint('#3a2a08', 0.06 * k);
        // Brilhos dourados caindo de enfeite por todo o mapa.
        if (now - streakAt > 80 && fx().particles.length < 400) {
          streakAt = now;
          particle({ x: lay.L + rng() * lay.width, y: 0, vx: (rng() - 0.5) * 0.01, vy: 0.03 + rng() * 0.02, born: now, ttl: ground() / 0.04, colors: ['#ffd21e', '#fff07a'], drop: true });
          effects++;
        }
        for (const item of targets) ticket(item, now);
      } else if (c.id === 'pinhata') {
        tint('#2a1a3a', 0.05 * k);
        for (const item of targets) pinata(item, (c.a.hits && c.a.hits[item.k]) || 0, now);
      } else if (c.id === 'amanhecer') {
        tint('#ffc890', 0.14 * k);
        tint('#ff9ab0', 0.05 * k);
        fog(c, now);
        for (const item of targets) {
          rooster(item, now);
          // Cada galo canta uma vez quando aparece.
          const key = `${c.a.born}:${item.k}`;
          if (!crowed.has(key)) {
            crowed.add(key);
            say(tr('fx.cocorico'), clamp(item.x, lay.L + 24, lay.R - 24), item.y - 18, now, '#ffe27a', 1300, 6);
            if (sound) sound('canto');
            effects++;
          }
        }
      } else if (c.id === 'turbulencia') {
        tint('#3a4a6a', 0.06 * k);
        for (const item of targets) slider(item, now);
        // De vez em quando alguém da turma solta um "opa!".
        if (now - streakAt > 1800) {
          streakAt = now;
          say(tr('fx.opa'), lay.L + 20 + rng() * (lay.width - 40), ground() - 26, now, '#fff4a0', 800, 6);
          effects++;
        }
      } else if (c.id === 'constelacao') {
        tint('#080e2e', 0.2 * k);
        const { cx, cy } = crossAt(c, lay);
        const got = c.got.size;
        // As linhas entre as estrelas já pegas (na ordem) e as próprias estrelas, douradas.
        g.globalAlpha = 0.9 * k;
        g.fillStyle = '#ffcf4a';
        for (let i = 1; i < got; i++) dotLine(cx + CROSS[i - 1][0], cy + CROSS[i - 1][1], cx + CROSS[i][0], cy + CROSS[i][1]);
        g.globalAlpha = k;
        for (let i = 0; i < got; i++) {
          halo(cx + CROSS[i][0], cy + CROSS[i][1], got === c.n ? 14 : 10, '#fff07a', got === c.n ? 0.65 : 0.5);
          shape(STAR, cx + CROSS[i][0] - 3, cy + CROSS[i][1] - 3, STAR_COLORS);
        }
        // As que faltam: azuladas e quietas; só a próxima brilha, com um anel pulsando.
        for (const item of targets) {
          const x = Math.round(item.x);
          const y = Math.round(item.y);
          if (item.k === got) {
            const pulse = 0.5 + 0.5 * Math.sin(now / 170);
            halo(x, y, 14, '#fff07a', 0.45 + 0.35 * pulse);
            shape(STAR, x - 3, y - 3, STAR_COLORS);
            g.globalAlpha = 0.5 + 0.4 * pulse;
            g.fillStyle = '#fff8cc';
            const ring = 7 + Math.round(pulse * 2);
            g.fillRect(x - ring, y, 1, 1);
            g.fillRect(x + ring, y, 1, 1);
            g.fillRect(x, y - ring, 1, 1);
            g.fillRect(x, y + ring, 1, 1);
            g.globalAlpha = k;
          } else {
            halo(x, y, 8, '#cfe0ff', 0.25);
            shape(STAR, x - 3, y - 3, { y: '#a8c0f0', W: '#e8f0ff' });
          }
        }
        g.globalAlpha = 1;
      } else if (c.id === 'sapos') {
        tint('#1c3a2a', 0.08 * k);
        for (const item of targets) frog(item, now);
        // De vez em quando um sapo solta um "croac".
        if (targets.length && now - streakAt > 2400) {
          streakAt = now;
          const item = targets[Math.floor(rng() * targets.length)];
          say(tr('fx.croac'), clamp(item.x, lay.L + 20, lay.R - 20), item.y - 10, now, '#9ef05a', 900, 6);
          if (sound) sound('sapo');
          effects++;
        }
      } else if (c.id === 'trem') {
        tint('#2a3a5a', 0.05 * k);
        train(c, lay, now);
      } else if (c.id === 'neve') {
        tint('#cfe0ff', 0.14 * k);
        // O chão branquinho, só em cima do que já foi desenhado (a terra da ilha), crescendo com o evento.
        g.globalCompositeOperation = 'source-atop';
        g.globalAlpha = 0.9 * k * Math.min(1, c.t / 20000 + 0.2);
        g.fillStyle = '#f4faff';
        g.fillRect(lay.L, ground() + 1, lay.width, 2);
        g.globalCompositeOperation = 'source-over';
        // Flocos miúdos descendo por todo o mapa, cada um no seu ritmo.
        g.globalAlpha = 0.9 * k;
        for (let i = 0; i < 150; i++) {
          const prog = (now / (7000 + (i % 5) * 900) + rnd(c.seed, i)) % 1;
          const x = lay.L + rnd(c.seed, i, 1) * lay.width + Math.sin(prog * 14 + i) * 4;
          const big = i % 5 === 0;
          g.fillStyle = big ? '#ffffff' : '#e6f2ff';
          g.fillRect(Math.round(x), Math.round(prog * (ground() + 4)), big ? 2 : 1, big ? 2 : 1);
        }
        g.globalAlpha = 1;
        for (const item of targets) flake(item, now);
      } else if (c.id === 'tremor') {
        tint('#6a4a2a', 0.06 * k);
        // Rachaduras escuras na terra e uma nuvem de poeira a cada pisada (o forró bate de uns 0,76 s em 0,76 s).
        g.globalAlpha = k;
        g.fillStyle = '#26180e';
        for (let i = 0; i < 4; i++) {
          const x = Math.round(lay.L + 14 + rnd(c.seed, i, 7) * (lay.width - 28));
          for (let j = 0; j < 5; j++) g.fillRect(x + (j % 2 ? 1 : -1) * (1 + (i % 2)), ground() + 1 + j, 1, 1);
        }
        const beat = Math.floor(now / 760);
        const age = (now % 760) / 760;
        if (beat !== beatAt) { beatAt = beat; effects++; }
        g.fillStyle = '#c8a070';
        for (let i = 0; i < 6; i++) {
          const x = lay.L + 6 + rnd(beat, i) * (lay.width - 12);
          const wide = 4 + Math.round(age * 7);
          g.globalAlpha = (1 - age) * 0.55 * k;
          g.fillRect(Math.round(x - wide / 2), ground() - 1 - Math.round(age * 6), wide, 2);
          g.fillRect(Math.round(x - wide / 2) + 1, ground() - 3 - Math.round(age * 6), wide - 2, 1);
        }
        g.globalAlpha = 1;
        for (const item of targets) coin(item, now);
      } else if (c.id === 'cheia') {
        tint('#4a6a8a', 0.1 * k);
        // A água barrenta: sobe na frente da festa até a canela da turma, com marolas e um brilho.
        const top = ground() + 3 - Math.round(12 * k);
        g.globalAlpha = 0.66;
        g.fillStyle = '#8a6a40';
        g.fillRect(lay.L - 2, top, lay.width + 4, ground() + 3 - top);
        g.fillStyle = '#6a4a28';
        g.fillRect(lay.L - 2, ground() - 2, lay.width + 4, 5);
        g.globalAlpha = 0.8 * k;
        g.fillStyle = '#e8d0a0';
        for (let x = lay.L; x < lay.R - 3; x += 5) g.fillRect(x, top + Math.round(Math.sin(now / 260 + x * 0.35)), 3, 1);
        g.fillStyle = '#b89462';
        for (let x = lay.L + 2; x < lay.R - 3; x += 7) g.fillRect(x, top + 4 + Math.round(Math.sin(now / 310 + x * 0.5)), 4, 1);
        g.fillStyle = '#ffffff';
        for (let i = 0; i < 10; i++) if (Math.sin(now / 340 + i * 2.3) > 0.7) g.fillRect(Math.round(lay.L + rnd(c.seed, i, 2) * lay.width), top + 1 + (i % 3), 1, 1);
        g.globalAlpha = 1;
        for (const item of targets) floatie(item, now);
      } else if (c.id === 'poente') {
        // A luz do fim de tarde: tudo ganha um laranja quente, e as sombras do chão esticam um pouquinho.
        tint('#ff8a3c', 0.26 * k);
        tint('#ff4f6e', 0.06 * k);
        g.globalAlpha = 0.22 * k;
        g.fillStyle = '#3a1a2a';
        for (let x = lay.L; x < lay.R; x += 17) g.fillRect(x + 4, ground() + 1, 9, 1);
        g.globalAlpha = 1;
      } else if (c.id === 'tesouro') {
        tint('#d8a050', 0.06 * k);
        for (let i = 0; i < c.n; i++) {
          const pos = TARGETS.tesouro(c, i, lay);
          treasureMark({ x: pos.x, y: pos.y, k: i }, c.got.has(i), now);
        }
      } else if (c.id === 'feira') {
        for (let i = 0; i < c.n; i++) {
          const pos = TARGETS.feira(c, i, lay);
          stall(pos.x, i, c.entry.shop[i].cost, c.got.has(i), now);
        }
      } else packs.forEach(pack => { if (pack.api.OVER[c.id]) pack.api.OVER[c.id](c, now); });
      // A turma comenta o evento de vez em quando (as duas falas de cada evento ficam em `chat0` e `chat1`, nos dados).
      if (c.entry.chat0 && now >= nextChat) {
        nextChat = now + 5500 + rng() * 4500;
        lastChat = c.entry[rng() < 0.5 ? 'chat0' : 'chat1'];
        say(lastChat, clamp(lay.L + 24 + rng() * (lay.width - 48), lay.L + 56, lay.R - 56), ground() - 30 - rng() * 8, now, '#fff4a0', 1700, 6);
        chats++;
      }
      // As regiões clicáveis dos alvos (uma por alvo que está na tela).
      for (const item of targets) {
        const box = item;
        region(`mundo:${item.k}`, box.x - box.w / 2, box.y - box.h / 2, box.w, box.h);
      }
    }

    // Os vestígios que ficam no chão depois de alguns eventos, apagando aos poucos (`left` de 1 a 0).
    function drawTrace(now) {
      const lay = layout();
      const left = 1 - (now - trace.at) / TRACE_MS[trace.id];
      if (left <= 0) return;
      const seed = trace.seed;
      const at = (i, j = 0) => lay.L + 4 + rnd(seed, i, j) * (lay.width - 8);
      g.globalAlpha = Math.min(1, left * 1.6);
      if (trace.id === 'petalas') {
        for (let i = 0; i < 44; i++) {
          g.fillStyle = ['#ff8ac8', '#fff4f8', '#ffd21e', '#ffb0d8'][i % 4];
          g.fillRect(Math.round(at(i)), ground() + 1 + (i % 3), 2, 1);
        }
      } else if (trace.id === 'granizo') {
        const size = left > 0.66 ? 3 : left > 0.33 ? 2 : 1;
        for (let i = 0; i < 16; i++) {
          const x = Math.round(at(i));
          const y = ground() + (i % 3);
          g.fillStyle = '#dff0ff';
          g.fillRect(x, y - size + 1, size, size);
          g.fillStyle = '#ffffff';
          g.fillRect(x, y - size + 1, 1, 1);
          g.fillStyle = 'rgba(120, 170, 230, 0.5)';
          g.fillRect(x - 1, y + 1, size + 2, 1);
        }
      } else if (trace.id === 'pipoca') {
        for (let i = 0; i < 22; i++) {
          const x = Math.round(at(i));
          g.fillStyle = i % 3 ? '#fffaf0' : '#ffd21e';
          g.fillRect(x, ground() + (i % 3) - 1, 2, 2);
        }
      } else if (trace.id === 'redemoinho') {
        for (let i = 0; i < 26; i++) {
          g.fillStyle = ['#9ef05a', '#c08a3a', '#ffd21e', '#8a6a3a'][i % 4];
          g.fillRect(Math.round(at(i)), ground() + (i % 3), 2, 1);
        }
        g.fillStyle = 'rgba(190, 150, 100, 0.35)';
        for (let i = 0; i < 6; i++) g.fillRect(Math.round(at(i, 5)), ground() + 1, 9, 1);
      } else if (trace.id === 'fogos') {
        // Fumaça cinza no céu, subindo e abrindo.
        const age = (now - trace.at) / TRACE_MS.fogos;
        for (let i = 0; i < 9; i++) {
          const x = Math.round(at(i, 2) + age * 14);
          const y = Math.round(10 + rnd(seed, i, 3) * Math.max(6, poleTop() * 0.5) - age * 10);
          g.fillStyle = 'rgba(190, 196, 210, 0.3)';
          g.fillRect(x - 4 - Math.round(age * 4), y, 9 + Math.round(age * 8), 3);
          g.fillRect(x - 2, y - 2, 6 + Math.round(age * 4), 2);
        }
      } else if (trace.id === 'neve') {
        // A neve derretendo: as manchas brancas encolhem e ganham um fio de água.
        const patch = left > 0.66 ? 5 : left > 0.33 ? 3 : 2;
        for (let i = 0; i < 14; i++) {
          const x = Math.round(at(i));
          const y = ground() + (i % 3);
          g.fillStyle = '#f4faff';
          g.fillRect(x - 1, y, patch + 2, 1);
          g.fillRect(x, y - 1, patch, 1);
          g.fillStyle = 'rgba(140, 180, 230, 0.5)';
          g.fillRect(x, y + 1, patch, 1);
        }
      } else if (trace.id === 'cheia') {
        // A lama e as poças que a água deixou.
        for (let i = 0; i < 9; i++) {
          const x = Math.round(at(i));
          const y = ground() + 1 + (i % 3);
          g.fillStyle = 'rgba(110, 80, 44, 0.7)';
          g.fillRect(x, y, 7, 1);
          g.fillStyle = 'rgba(190, 215, 240, 0.7)';
          g.fillRect(x + 1, y, 3, 1);
        }
      } else if (trace.id === 'vagalumes') {
        for (let i = 0; i < 20; i++) {
          if (Math.sin(now / 500 + i * 2.1) > 0.35) {
            g.fillStyle = '#e8fff0';
            g.fillRect(Math.round(at(i)), ground() + (i % 3), 1, 1);
          }
        }
      } else packs.forEach(pack => { if (pack.api.TRACE[trace.id]) pack.api.TRACE[trace.id](left, at, now, lay, seed); });
      g.globalAlpha = 1;
    }

    function draw(layer, engine, now) {
      if (!cur) {
        if (trace && layer === 'over') drawTrace(now);
        return;
      }
      if (layer === 'sky') drawSky(cur, now);
      else if (layer === 'over') drawOver(cur, now);
    }

    // O alvo foi pego (evento `mundo-pego`): faísca e confete no lugar dele; pegando todos, mais confete e o aviso.
    function onCatch(event, now) {
      const lay = layout();
      if (!lay || !cur) return;
      const item = lastItems.get(event.k);
      const x = item ? item.x : lay.L + lay.width / 2;
      const y = item ? item.y : ground() - 30;
      for (let i = 0; i < 4; i++) float('brilho', x + (i - 1.5) * 6, y + (i % 2) * 4, now, ['#ffd21e', '#fff07a']);
      confetti(now, x, y, event.all ? 28 : 10);
      for (const pack of packs) pack.api.catchFx(cur, event, x, y, now);
      if (event.all) say(tr('fx.mundoTudo'), clamp(x, lay.L + 30, lay.R - 30), Math.max(10, y - 10), now, '#9ef05a', 2200, 8);
      else if (cur.id === 'fogos') burst(x, y, 34, now);
      else if (cur.id === 'feira') { for (let i = 0; i < 5; i++) float('brilho', x + (i - 2) * 4, y - 8 - i, now, ['#ffd21e', '#fff07a']); }
      else if (cur.id === 'ovni') { for (let i = 0; i < 6; i++) float('brilho', x + (i - 2.5) * 4, y - i * 2, now, ['#e8ff7a', '#ffffff']); }
      else if (cur.id === 'pinhata') { confetti(now, x, y + 4, 46); for (let i = 0; i < 6; i++) float('brilho', x + (i - 2.5) * 5, y + 8 - i * 2, now, ['#ff4f9e', '#ffd21e', '#3a6cf0']); }
      else if (cur.id === 'trem') { for (let i = 0; i < 4; i++) float('brilho', x + (i - 1.5) * 5, y + 4 - i * 3, now, ['#ff4f9e', '#ffd21e']); }
      else if (cur.id === 'calorao' || cur.id === 'cheia') {
        for (let i = 0; i < 8; i++) particle({ x, y, vx: (rng() - 0.5) * 0.04, vy: -0.01 - rng() * 0.02, gravity: 0.00003, born: now, ttl: 700, colors: ['#9fc8ff'], drop: true });
      }
      effects++;
    }

    // Um golpe na pinhata (evento `mundo-golpe`): ela balança forte, solta doce e toca o martelo.
    function onHit(event, now) {
      const lay = layout();
      if (!lay || !cur) return;
      hitAt.set(event.k, now);
      const item = lastItems.get(event.k);
      const x = item ? item.x : lay.L + lay.width / 2;
      const y = item ? item.y : 46;
      if (packs.map(pack => pack.api.hitFx(cur, event, x, y, now)).some(Boolean)) { effects++; return; }
      confetti(now, x, y + 6, 5 + event.n * 2);
      if (sound) sound('martelo');
      effects++;
    }

    const lastItems = new Map();
    const baseUpdate = update;
    function updateWithMemory(engine, now) {
      baseUpdate(engine, now);
      lastItems.clear();
      if (cur) for (const item of cur.items) lastItems.set(item.k, item);
    }

    function reset() { for (const pack of packs) pack.api.reset(); nextChat = 0; chats = 0; lastChat = ''; hitAt.clear(); crowed.clear(); beatAt = -1; if (fx()) { fx().shakeX = 0; fx().shakeY = 0; } cur = null; trace = null; said = null; lastBolt = 0; effects = 0; streaks.length = 0; landed.clear(); burstDone.clear(); lastItems.clear(); }

    function probe() {
      return cur ? { id: cur.id, k: cur.k, items: cur.items.map(item => item.k), xs: cur.items.map(item => Math.round(item.x)), taken: [...cur.got], effects, chats, chat: lastChat,
        temas: temas ? temas.probe() : null, extras: packs[1] ? packs[1].api.probe() : null, extras2: packs[2] ? packs[2].api.probe() : null } : null;
    }

    const traceId = () => (trace ? trace.id : null);
    // A neve esfria a festa: o friozinho (neblina azul e fumacinha de quem respira) liga enquanto ela cai.
    const cold = () => !!(cur && cur.id === 'neve' && cur.k > 0.3);

    return { update: updateWithMemory, draw, onCatch, onHit, reset, probe, traceId, cold };
  }

  root.ArraiaFestaMundo = { create };
})(typeof globalThis !== 'undefined' ? globalThis : this);
