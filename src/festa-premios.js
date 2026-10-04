// Os prêmios dos minigames na festa: as coisas (objetos animados) e os personagens que cada minigame libera (o motor é src/premios.js, os dados
// estão em `data.premios`). Quatro lugares: `varal` (pendurado na corda de bandeirinhas), `fundo` (atrás da plateia, como os marcos do cenário),
// `chao` (na frente da festa, nas vagas que sobram dos dois lados da Mandioca) e os personagens, que andam por essas mesmas vagas, fazem a
// gracinha de tempos em tempos e, quando têm presente, mostram um embrulhinho em cima da cabeça (um clique pega).
// A festa pequena não tem lugar para tudo: cada lugar tem um teto que cresce com a largura do terreiro e, passando dele, quem aparece muda de
// tempos em tempos (revezamento); o prêmio que acabou de chegar fica na festa até a próxima troca.
// Com o troféu de ouro de um jogo a coisa dele aparece em ouro maciço (a arte `<id>-ouro`, com brilhos) e o personagem ganha uma coroa flutuando.
// Quem passeia e esbarra em outro troca uma fala (o segundo responde logo depois); a Dona Bola, às vezes, canta um número do bingo.
// Quem joga o minigame de um prêmio vê a coisa dar um pulinho e o personagem comemorar (`onPlay`). De vez em quando os personagens todos
// atravessam a festa em fila, o Desfile dos Prêmios (o motor sorteia, `engine.premios.tick`): quem clica num deles ganha o prêmio do desfile.
// `update` decide o que aparece (uma vez por quadro) e `draw` pinta uma camada: 'hang' (no varal), 'back' (atrás da plateia) e 'front'.
(function (root) {
  'use strict';

  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const SLOT = 40;            // largura de cada vaga de coisa no chão
  const ZONE = 80;            // largura da área por onde cada personagem anda
  const ROTATE = 150000;      // de quanto em quanto tempo o revezamento troca quem aparece (ms)
  const SPOT_MS = 300000;     // o prêmio recém-chegado aparece mesmo sem vaga por tanto tempo (ms)
  const FEET = 3;             // a coisa pisa tantos px abaixo da linha do chão (fica na frente de quem dança)
  const CHAR_FEET = 5;
  const FADE = 600;           // entrar e sair da festa (ms)
  const HANG = [0.25, 0.75, 0.42];   // onde cada coisa do varal fica (fração da largura do terreiro)
  const CAP = { chao: 9, varal: 3, fundo: 2, pessoa: 6 };
  // As coisas de dois quadros (o 0 é a pose parada; o 1, o "bateu") só mexem de tempos em tempos e quando clicadas.
  const TWO_FRAMES = new Set(['martelo-banco', 'zabumba', 'caixa-correio', 'burrico', 'carrinho-legumes', 'camera-tripe', 'placa-penetra', 'banco-praca']);
  const RATE = { ursinhos: 0.5, 'cocho-milho': 0.7, 'fita-chegada': 0.8, 'varal-cordeis': 0.7, 'cesto-cobra': 0.9 };
  const TOUCH = { ursinhos: 'coracao', 'cocho-milho': 'coracao', zabumba: 'nota', 'ze-poeta': 'nota', faquir: 'nota', 'zabumbeiro-mirim': 'nota',
    'bolo-noiva': 'coracao', 'madrinha-flor': 'coracao', 'dona-cartinha': 'coracao', 'corneta-alto': 'nota', 'marcador-anarrie': 'nota',
    'almofada-coracao': 'coracao', 'tia-dengo': 'coracao', 'mesa-compadres': 'nota',
    'sinha-terreiro': 'coracao', 'menina-peixe': 'coracao' };
  const GIFT = ['.r.r.', '..r..', 'yyryy', 'yyryy', 'yyryy'];
  const GIFT_COLORS = { r: '#ee2f3c', y: '#ffd21e' };
  const CROWN = ['y..y..y', 'yyyyyyy', 'yryryry', 'ooooooo'];
  const CROWN_COLORS = { y: '#ffd21e', o: '#c8841a', r: '#ee2f3c' };
  const CHAT_GAP = 25000;     // no mínimo esse tempo entre duas conversas do mesmo personagem (ms)
  const CHAT_NEAR = 34;       // quão perto dois personagens precisam estar para conversar (px)
  const REACT_GAP = 2500;     // no mínimo esse tempo entre duas reações do mesmo prêmio ao jogo (ms)

  function create(ctx) {
    const { bundle, g, sprite, halo, say, float, confetti, region, rng, fx, layout, ground, poleTop, lift, roam, tr } = ctx;
    const states = new Map();   // id → { a, want, phase, hit, ... }
    let spot = null;            // { id, until, shown }: o prêmio que acabou de chegar
    let engineNow = null;
    let lists = { chao: [], varal: [], fundo: [], pessoa: [], parade: [] };
    let paradeKey = null;       // o desfile que já tem o grito dado
    const backX = new Map();    // lugar de cada coisa do fundo (por layout)
    let chats = 0;              // quantas conversas já houve (para o `probe`)
    let lastChat = [];          // quem conversou por último
    const said = [];            // as últimas falas dos personagens (para o `probe`)
    let glints = 0;             // quantas vezes uma coisa soltou vapor, bolha ou brilho sozinha (para o `probe`)

    const metaOf = id => (bundle.premios ? bundle.premios[id] : null);
    // A arte da coisa: a de ouro, se o troféu já veio e a pasta de arte tem.
    const artOf = st => (st.gold && metaOf(`${st.entry.id}-ouro`)) || metaOf(st.entry.id);

    // Os pedaços do chão da frente por onde dá para passar: o terreiro de dança menos o canto da Mandioca (ela não pode ficar atrás de nada).
    function segments(lay) {
      const lo = lay.danceLeft + 1;
      const hi = lay.danceRight - 1;
      const from = lay.host.x - 6;
      const to = lay.host.x + (lay.par ? 52 : 36);
      const out = [];
      if (from - lo >= 24) out.push([lo, from]);
      if (hi - to >= 24) out.push([to, hi]);
      return out;
    }

    // As vagas das coisas do chão (centros, esquerda e direita alternadas) e as áreas dos personagens.
    function cellsOf(segs) {
      const per = segs.map(([a, b]) => {
        const count = Math.floor((b - a) / SLOT);
        return Array.from({ length: count }, (_, k) => a + (k + 0.5) * (b - a) / count);
      });
      const out = [];
      for (let k = 0; per.some(list => k < list.length); k++) for (const list of per) if (k < list.length) out.push(list[k]);
      return out;
    }
    function zonesOf(segs) {
      const per = segs.map(([a, b]) => {
        const count = Math.max(1, Math.floor((b - a) / ZONE));
        return Array.from({ length: count }, (_, k) => [a + k * (b - a) / count, a + (k + 1) * (b - a) / count]);
      });
      const out = [];
      for (let k = 0; per.some(list => k < list.length); k++) for (const list of per) if (k < list.length) out.push(list[k]);
      return out;
    }

    // Quem aparece: tudo, se couber; senão uma janela que anda pela lista a cada ROTATE (o recém-chegado sempre entra).
    function pick(list, cap, now) {
      if (list.length <= cap) return list;
      const start = (Math.floor(now / ROTATE) * cap) % list.length;
      const out = [];
      for (let i = 0; i < cap; i++) out.push(list[(start + i) % list.length]);
      if (spot && now < spot.until && !out.includes(spot.entry) && list.includes(spot.entry) && cap > 0) out[cap - 1] = spot.entry;
      return out;
    }

    // O estado visual de cada prêmio; vagas (`slot`) e áreas (`zone`) são fixas enquanto ele fica.
    function stateOf(entry, now) {
      let st = states.get(entry.id);
      if (!st) {
        st = { entry, a: 0, want: false, phase: rng() * 10, hit: -1e9, slot: undefined, nextAct: now + 6000 + rng() * 10000, actUntil: 0, nextGlint: 0, born: now };
        states.set(entry.id, st);
      }
      return st;
    }

    function assign(list, count, key) {
      const used = new Set();
      for (const st of list) {
        if (st[key] !== undefined && st[key] < count && !used.has(st[key])) used.add(st[key]);
        else st[key] = undefined;
      }
      for (const st of list) {
        if (st[key] !== undefined) continue;
        let k = 0;
        while (used.has(k)) k++;
        st[key] = k;
        used.add(k);
      }
    }

    // O lugar de uma coisa do fundo: perto de onde gosta, sem ficar atrás da barraca, do palco ou da fogueira nem em cima de um marco.
    function backPlace(lay, meta, extra = []) {
      const key = `${lay.key}|${meta.image}|${extra.map(item => item.x0).join(',')}`;
      if (backX.has(key)) return backX.get(key);
      const top = ground() - 2 - lift() - meta.h + 1;
      const blocks = [{ x0: lay.fire.x - 2, x1: lay.fire.x + lay.fire.meta.w + 2, top: ground() - lay.fire.meta.h + 1 }];
      for (const side of [lay.leftSide, lay.rightSide]) if (side.meta.w >= 20) blocks.push({ x0: side.x, x1: side.x + side.meta.w, top: ground() - side.meta.h + 1 });
      if (lay.stage) blocks.push({ x0: lay.stage.x + 4, x1: lay.stage.x + lay.stage.meta.w - 4, top: ground() - 6 - lay.stage.meta.h + 1 });
      const hiding = blocks.filter(block => block.top <= top + 10);
      const taken = (lay.back || []).map(item => ({ x0: item.x, x1: item.x + item.meta.w })).concat(extra);
      const overlap = (x, list) => list.reduce((sum, b) => sum + Math.max(0, Math.min(x + meta.w, b.x1) - Math.max(x, b.x0)), 0);
      const lo = lay.L + 1;
      const hi = lay.R - 1 - meta.w;
      const prefer = Math.round(lay.L + lay.width * 0.64 - meta.w / 2);
      let best = lo;
      let least = Infinity;
      for (let x = lo; x <= hi; x++) {
        const cost = overlap(x, hiding) * 6 + overlap(x, taken) * 2 + Math.abs(x - prefer) * 0.02;
        if (cost < least) { least = cost; best = x; }
      }
      if (backX.size > 40) backX.clear();
      backX.set(key, best);
      return best;
    }

    // --- Um quadro: o que aparece e onde -----------------------------------------------------------------------------------------
    function update(engine, now) {
      engineNow = engine;
      const lay = layout();
      lists = { chao: [], varal: [], fundo: [], pessoa: [], parade: [] };
      if (!lay || !engine.premios || !bundle.premios) { for (const st of states.values()) st.want = false; return; }
      const parade = engine.state.premios.parade && engine.state.premios.parade.active;
      if (spot && now >= spot.until) spot = null;
      const got = engine.premios.unlocked();
      const segs = segments(lay);
      const cells = cellsOf(segs);
      const zones = zonesOf(segs);
      const caps = {
        chao: Math.min(CAP.chao, cells.length),
        varal: lay.width >= 110 ? Math.min(CAP.varal, 1 + Math.floor((lay.width - 110) / 120)) : 0,
        fundo: lay.width >= 260 ? CAP.fundo : lay.width >= 150 ? 1 : 0,
        pessoa: parade ? 0 : Math.min(CAP.pessoa, zones.length)    // no desfile os personagens saem do passeio e vão para a fila
      };
      const shown = new Set();
      const place = (list, cap) => { for (const entry of pick(list, cap, now)) shown.add(entry.id); };
      place(got.filter(entry => entry.tipo === 'coisa' && entry.lugar === 'chao'), caps.chao);
      place(got.filter(entry => entry.tipo === 'coisa' && entry.lugar === 'varal'), caps.varal);
      place(got.filter(entry => entry.tipo === 'coisa' && entry.lugar === 'fundo'), caps.fundo);
      place(got.filter(entry => entry.tipo === 'personagem'), caps.pessoa);
      for (const entry of got) {
        if (entry.tipo === 'ouro') continue;
        const st = stateOf(entry, now);
        st.want = shown.has(entry.id);
        st.gold = entry.tipo === 'personagem' ? engine.premios.goldOfGame(entry.jogo) : engine.premios.hasGold(entry.id);
      }
      // Quem saiu do revezamento some devagar; quem já sumiu sai da lista.
      const dt = clamp(now - (update.at || now), 0, 100);
      update.at = now;
      for (const [id, st] of states) {
        st.a = clamp(st.a + (st.want ? dt : -dt) / FADE, 0, 1);
        if (!st.want && st.a <= 0) states.delete(id);
      }
      const live = lane => [...states.values()].filter(st => (st.want || st.a > 0) && lane(st.entry));
      const props = live(entry => entry.tipo === 'coisa' && entry.lugar === 'chao').sort((x, y) => x.born - y.born);
      assign(props, cells.length, 'slot');
      for (const st of props) {
        const meta = artOf(st);
        if (meta && cells[st.slot] !== undefined) lists.chao.push({ st, meta, x: Math.round(cells[st.slot] - meta.w / 2), y: ground() + FEET - meta.h + 1 });
      }
      const hung = live(entry => entry.tipo === 'coisa' && entry.lugar === 'varal').sort((x, y) => x.born - y.born);
      assign(hung, 3, 'slot');
      for (const st of hung) {
        const meta = artOf(st);
        if (meta) lists.varal.push({ st, meta, cx: Math.round(lay.L + lay.width * HANG[st.slot]) });
      }
      const placedBack = [];
      for (const st of live(entry => entry.tipo === 'coisa' && entry.lugar === 'fundo').sort((x, y) => x.born - y.born)) {
        const meta = artOf(st);
        if (!meta) continue;
        const x = backPlace(lay, meta, placedBack);
        placedBack.push({ x0: x, x1: x + meta.w });
        lists.fundo.push({ st, meta, x, y: ground() - 2 - lift() - meta.h + 1 });
      }
      const people = live(entry => entry.tipo === 'personagem').sort((x, y) => x.born - y.born);
      assign(people, zones.length, 'zone');
      for (const st of people) {
        const meta = artOf(st);
        const zone = zones[st.zone];
        if (!meta || !zone) continue;
        const lo = zone[0];
        const hi = Math.max(lo, zone[1] - meta.w);
        const acting = now < st.actUntil;
        if (acting) { st.mode = 'para'; st.until = Math.max(st.until || 0, st.actUntil); st.at = now; }
        else roam(st, now, lo, hi, 0.028, 0.5);
        if (st.x < lo - 2 || st.x > hi + 2) st.x = clamp(st.x, lo, hi);
        // A gracinha de tempos em tempos, com o grito em cima da cabeça.
        if (!acting && st.a > 0.9 && now >= st.nextAct) perform(st, meta, now);
        lists.pessoa.push({ st, meta, x: st.x, y: ground() + CHAR_FEET - meta.h + 1, acting: now < st.actUntil });
      }
      // O segundo de uma conversa responde um pouquinho depois.
      for (const item of lists.pessoa) {
        if (item.st.replyAt && now >= item.st.replyAt && !item.acting) { item.st.replyAt = 0; perform(item.st, item.meta, now); item.acting = true; }
      }
      // Dois que esbarram no passeio trocam uma fala.
      for (let a = 0; a < lists.pessoa.length; a++) {
        for (let b = a + 1; b < lists.pessoa.length; b++) {
          const one = lists.pessoa[a];
          const two = lists.pessoa[b];
          if (one.acting || two.acting || one.st.a < 0.9 || two.st.a < 0.9 || now < (one.st.chatAt || 0) || now < (two.st.chatAt || 0)) continue;
          if (Math.abs((one.x + one.meta.w / 2) - (two.x + two.meta.w / 2)) > CHAT_NEAR) continue;
          one.st.chatAt = two.st.chatAt = now + CHAT_GAP;
          two.st.replyAt = now + 1100;
          perform(one.st, one.meta, now);
          one.acting = true;
          chats++;
          lastChat = [one.st.entry.id, two.st.entry.id];
        }
      }
      if (parade) buildParade(engine, lay, parade, now);
      else paradeKey = null;
      // O que acabou de chegar: confete e o nome subindo no lugar dele.
      if (spot && !spot.shown) {
        const hit = [...lists.chao, ...lists.fundo, ...lists.pessoa].find(item => item.st.entry === spot.entry)
          || lists.varal.find(item => item.st.entry === spot.entry);
        if (hit) {
          spot.shown = true;
          const x = hit.cx !== undefined ? hit.cx : hit.x + hit.meta.w / 2;
          const y = hit.y !== undefined ? hit.y : poleTop() + 24;
          confetti(now, x, y + 6, 16);
          for (let i = 0; i < 4; i++) float('brilho', x + (i - 1.5) * 7, y + 8, now, ['#ffd21e', '#fff07a']);
          say(`+ ${spot.label || spot.entry.name}`, clamp(x, lay.L + 28, lay.R - 28), Math.max(10, y - 8), now, spot.gold ? '#ffd21e' : '#9ef05a', 2200, 8);
          if (spot.gold) { confetti(now, x, y + 4, 24); for (let i = 0; i < 6; i++) float('brilho', x + (i - 2.5) * 8, y + 4 + (i % 2) * 6, now, ['#ffd21e', '#fffbe0']); }
        }
      }
    }

    // A fila do desfile: a cabeça atravessa a festa de ponta a ponta e cada um vem atrás, com uma saltitada.
    const GAP = 22;
    function buildParade(engine, lay, parade, now) {
      const t = engine.now() - parade.born;
      const p = clamp(t / Math.max(1, parade.until - parade.born), 0, 1);
      const n = parade.ids.length;
      const travel = (lay.R - lay.L) + n * GAP + 40;
      const head = parade.dir > 0 ? lay.L - 30 + p * travel : lay.R + 30 - p * travel;
      const key = `${parade.born}`;
      parade.ids.forEach((id, i) => {
        const entry = engine.premios.item(id);
        const meta = entry && metaOf(id);
        if (!meta) return;
        const x = Math.round(head - parade.dir * i * GAP - meta.w / 2);
        if (x < lay.L - meta.w || x > lay.R) return;
        const y = ground() + CHAR_FEET - meta.h + 1 - Math.round(Math.abs(Math.sin(now / 190 + i * 0.9)) * 2);
        lists.parade.push({ id, entry, meta, x, y, i, dir: parade.dir, gold: engine.premios.goldOfGame(entry.jogo), caught: !!parade.caught });
      });
      const lead = lists.parade[0];
      if (paradeKey !== key) {
        paradeKey = key;
        if (lead) say(tr ? tr('fx.premiosDesfile') : '', clamp(lead.x + lead.meta.w / 2, lay.L + 40, lay.R - 40), Math.max(10, lead.y - 8), now, '#ffd21e', 2200, 8);
      }
      if (lead && now >= (update.noteAt || 0)) {
        update.noteAt = now + 650;
        float('nota', lead.x + lead.meta.w / 2 + (rng() - 0.5) * 14, lead.y - 2, now, [['#ee2f3c', '#ffd21e', '#3a6cf0', '#35a03a'][Math.floor(rng() * 4)], '#fff4e4']);
      }
    }

    // O prêmio do desfile foi pego (evento `premio-parade-caught`): confete na fila toda.
    function onParadeCaught(event, now) {
      const lay = layout();
      if (!lay) return;
      for (const member of lists.parade) {
        glints++;
        confetti(now, member.x + member.meta.w / 2, member.y + 6, 10);
        float('brilho', member.x + member.meta.w / 2, member.y - 2, now, ['#ffd21e', '#fff07a']);
      }
    }

    // A gracinha do personagem: pose de ação, o grito e a coisa que sai dele (nota, coração, brilho).
    function perform(st, meta, now, line) {
      st.actUntil = now + 1500;
      st.nextAct = now + 9000 + rng() * 14000;
      const entry = st.entry;
      // Falas sorteadas na hora: a Dona Bola canta um número do bingo (letra e número de 1 a 75).
      const spoken = !line && entry.id === 'dona-bola' && rng() < 0.6 ? `${'BINGO'[Math.floor(rng() * 5)]} ${1 + Math.floor(rng() * 75)}!` : null;
      const text = line || spoken || entry[`say${Math.floor(rng() * 3)}`] || entry.say0;
      const cx = (st.x || 0) + meta.w / 2;
      const top = ground() + CHAR_FEET - meta.h;
      if (text) { say(text, cx, top - 6, now, '#fff07a', 1700, 6); said.push(text); if (said.length > 12) said.shift(); }
      float(TOUCH[entry.id] || 'brilho', cx + (rng() - 0.5) * 8, top + 2, now, TOUCH[entry.id] === 'nota' ? ['#ffd21e', '#fff4e4'] : ['#ffd21e', '#fff07a']);
    }

    // O clique (festa.poke): a coisa dá um pulinho e fala, o personagem faz a gracinha.
    function poke(id, now) {
      const st = states.get(id);
      if (!st) return;
      st.hit = now;
      const entry = st.entry;
      const meta = artOf(st);
      if (!meta) return;
      if (entry.tipo === 'personagem') {
        const ready = engineNow && engineNow.premios.giftReady(id);
        // Se tem presente, quem avisa é o `premio-gift`; senão faz só a gracinha.
        if (!ready && now >= st.actUntil) perform(st, meta, now);
        return;
      }
      const item = [...lists.chao, ...lists.fundo].find(entryItem => entryItem.st === st) || lists.varal.find(entryItem => entryItem.st === st);
      if (!item) return;
      const cx = item.cx !== undefined ? item.cx : item.x + meta.w / 2;
      const top = item.y !== undefined ? item.y : poleTop() + 24;
      say(entry[`say${Math.floor(rng() * 2)}`] || entry.say0 || '!', cx, top - 4, now, '#fff8e8', 1000, 8);
      float(TOUCH[id] || 'brilho', cx + (rng() - 0.5) * 6, top + 2, now, TOUCH[id] === 'coracao' ? ['#ff4f9e', '#ff8a96'] : ['#ffd21e', '#fff07a']);
    }

    // O presente do personagem foi pego (evento `premio-gift`): ele comemora, com confete.
    function onGift(event, now) {
      const st = states.get(event.id);
      const item = st && lists.pessoa.find(entryItem => entryItem.st === st);
      if (!item) return;
      st.hit = now;
      perform(st, item.meta, now, null);
      confetti(now, item.x + item.meta.w / 2, item.y + 10, 14);
    }

    // Um prêmio novo chegou (evento `premio`): fica na festa até a próxima troca do revezamento.
    function onUnlock(event, now) {
      const prize = engineNow && engineNow.premios.item(event.id);
      if (!prize) return;
      // O troféu de ouro mostra a coisa dele em ouro; o nome que sobe na festa é o do troféu.
      const entry = prize.tipo === 'ouro' ? engineNow.premios.item(prize.de) : prize;
      if (!entry) return;
      spot = { id: event.id, entry, label: prize.name, gold: prize.tipo === 'ouro', until: now + SPOT_MS, shown: false };
    }

    // Quem joga o minigame de um prêmio vê a coisa dele dar um pulinho e o personagem comemorar (no máximo uma vez a cada REACT_GAP).
    function onPlay(event, now) {
      if (!engineNow || !engineNow.premios) return;
      for (const gameId of engineNow.premios.gamesFor(event.type, event)) {
        for (const entry of engineNow.premios.cfg.itens) {
          if (entry.jogo !== gameId || entry.tipo === 'ouro') continue;
          const st = states.get(entry.id);
          const meta = st && artOf(st);
          if (!meta || st.a < 0.5 || now - (st.reactAt || -1e9) < REACT_GAP) continue;
          st.reactAt = now;
          if (entry.tipo === 'personagem') { if (now >= st.actUntil) perform(st, meta, now); }
          else st.hit = now;
        }
      }
    }

    // --- O desenho -----------------------------------------------------------------------------------------------------------------
    const hop = (st, now) => {
      const t = now - st.hit;
      return t >= 0 && t < 380 ? -Math.round(3 * Math.sin(Math.PI * t / 380)) : 0;
    };
    function groundShadow(cx, width, y, alpha) {
      g.globalAlpha = alpha * 0.55;
      g.fillStyle = '#120906';
      g.fillRect(Math.round(cx - width / 2), y, Math.round(width), 1);
      g.fillRect(Math.round(cx - width / 2 + 2), y + 1, Math.max(0, Math.round(width) - 4), 1);
      g.globalAlpha = alpha;
    }
    function propFrame(entry, meta, st, now) {
      const n = meta.frames;
      if (n <= 1) return 0;
      if (TWO_FRAMES.has(entry.id)) {
        if (now - st.hit < 900) return Math.floor((now - st.hit) / 140) % 2;
        return (now / 1000 + st.phase) % 5 < 0.22 ? 1 : 0;
      }
      const fps = (meta.fps || 4) * (RATE[entry.id] || 1);
      return Math.floor(now / 1000 * fps + st.phase) % n;
    }
    function personFrame(meta, pose, now, st) {
      const frames = meta.poses[pose];
      const step = pose === 'anda' ? 130 : pose === 'acao' ? 220 : 650;
      return frames[Math.floor((now + st.phase * 100) / step) % frames.length];
    }
    const shape = (rows, x, y, palette) => {
      rows.forEach((row, dy) => [...row].forEach((c, dx) => {
        if (palette[c]) { g.fillStyle = palette[c]; g.fillRect(Math.round(x + dx), Math.round(y + dy), 1, 1); }
      }));
    };
    const particle = p => fx().particles.push(p);

    // A corda do varal (a mesma curva das bandeirinhas): a coisa pende dela por um barbante e balança.
    function stringY(lay, x) {
      const top = poleTop() + 2;
      const sag = 8 + lay.tier * 3;
      const left = lay.L - 1;
      const right = lay.R + 1;
      const mid = (left + right) / 2;
      const half = (right - left) / 2;
      return Math.round(top + sag * (1 - ((x - mid) / half) ** 2));
    }

    // O brilho do troféu de ouro: uma luz dourada que pulsa e um brilhinho que sobe de vez em quando.
    function goldGlow(st, cx, cy, radius, now) {
      halo(cx, cy, radius, '#ffd21e', 0.16 * st.a * (0.8 + 0.2 * Math.sin(now / 300 + st.phase)));
      if (st.a > 0.9 && now >= (st.nextShine || 0)) {
        st.nextShine = now + 1600 + rng() * 1800;
        glints++;
        float('brilho', cx + (rng() - 0.5) * radius, cy + (rng() - 0.5) * radius * 0.6, now, ['#ffd21e', '#fffbe0']);
      }
    }
    // Uma figura com contorno escuro (a coroa por cima da cabeça).
    function outlined(rows, x, y, palette) {
      g.fillStyle = '#26242e';
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        rows.forEach((row, ry) => [...row].forEach((c, rx) => { if (palette[c]) g.fillRect(Math.round(x + rx + dx), Math.round(y + ry + dy), 1, 1); }));
      }
      shape(rows, x, y, palette);
    }

    function draw(layer, engine, now) {
      const lay = layout();
      if (!lay) return;
      if (layer === 'hang') {
        for (const { st, meta, cx } of lists.varal) {
          const y = stringY(lay, cx);
          const swing = Math.round(Math.sin(now / 700 + st.phase) * 1.1) + (now - st.hit < 700 ? Math.round(Math.sin((now - st.hit) / 90) * 2 * (1 - (now - st.hit) / 700)) : 0);
          g.globalAlpha = st.a;
          g.fillStyle = '#361a0c';
          g.fillRect(cx, y + 1, 1, 2);
          const x = cx - Math.floor(meta.w / 2) + swing;
          const top = y + 2;
          const frame = propFrame(st.entry, meta, st, now);
          if (st.entry.id === 'lanterna-boitata') halo(cx + swing, top + 16, 14, '#ff8a12', 0.22 * st.a * (0.8 + 0.2 * Math.sin(now / 160 + st.phase)));
          if (st.gold) goldGlow(st, cx + swing, top + meta.h / 2, meta.w * 0.7, now);
          sprite(meta, frame, x, top);
          g.globalAlpha = 1;
          region(`premio:${st.entry.id}`, x, top, meta.w, meta.h);
        }
      } else if (layer === 'back') {
        for (const { st, meta, x, y } of lists.fundo) {
          g.globalAlpha = st.a;
          if (st.entry.id === 'totem-curupira') halo(x + meta.w / 2, y + 6, 14, '#ff8a12', 0.2 * st.a * (0.8 + 0.2 * Math.sin(now / 130 + st.phase)));
          if (st.gold) goldGlow(st, x + meta.w / 2, y + meta.h / 2, meta.w * 0.9, now);
          sprite(meta, propFrame(st.entry, meta, st, now), x, y + hop(st, now));
          g.globalAlpha = 1;
          region(`premio:${st.entry.id}`, x, y, meta.w, meta.h);
          // A corneta solta as notas da quadrilha.
          if (st.entry.id === 'corneta-alto' && st.a > 0.9 && now >= st.nextGlint) {
            st.nextGlint = now + 1400 + rng() * 1200;
            glints++;
            float('nota', x + 3 + rng() * 4, y + 14, now, [['#ee2f3c', '#ffd21e', '#3a6cf0'][Math.floor(rng() * 3)], '#fff4e4']);
          }
        }
      } else if (layer === 'front') {
        for (const { st, meta, x, y } of lists.chao) {
          const entry = st.entry;
          g.globalAlpha = st.a;
          groundShadow(x + meta.w / 2, meta.w - 4, ground() + FEET + 1, st.a);
          const jump = hop(st, now);
          const frame = propFrame(entry, meta, st, now);
          if (entry.id === 'panela-fogo') halo(x + meta.w / 2, y + meta.h - 8, 13, '#ff8a12', 0.22 * st.a * (0.8 + 0.2 * Math.sin(now / 110 + st.phase)));
          if (st.gold) goldGlow(st, x + meta.w / 2, y + meta.h / 2, meta.w * 0.7, now);
          sprite(meta, frame, x, y + jump);
          g.globalAlpha = 1;
          region(`premio:${entry.id}`, x, y + jump, meta.w, meta.h);
          // O que cada coisa solta sozinha: vapor da panela, bolhas do aquário, brilho do telescópio.
          if (st.a > 0.9 && now >= st.nextGlint) {
            const cx = x + meta.w / 2;
            glints++;
            if (entry.id === 'panela-fogo') {
              st.nextGlint = now + 520 + rng() * 300;
              particle({ x: cx + (rng() - 0.5) * 6, y: y + 2, vx: 0.003, vy: -0.01, born: now, ttl: 1400, colors: ['rgba(255, 248, 232, 0.7)', 'rgba(200, 204, 214, 0.45)', 'rgba(200, 204, 214, 0.2)'], wobble: rng() * 6 });
            } else if (entry.id === 'barril-aquario') {
              st.nextGlint = now + 900 + rng() * 700;
              particle({ x: cx + (rng() - 0.5) * 12, y: y + 12, vx: 0.001, vy: -0.012, born: now, ttl: 900, colors: ['#d8f4ff', '#ffffff'], wobble: rng() * 6 });
            } else if (entry.id === 'telescopio') {
              st.nextGlint = now + 1800 + rng() * 2400;
              float('brilho', x + meta.w - 4, y + 2, now, ['#fff07a', '#fffbe0']);
            } else if (entry.id === 'cesta-pamonhas') {
              st.nextGlint = now + 600 + rng() * 400;
              particle({ x: cx + (rng() - 0.5) * 8, y: y + 3, vx: 0.003, vy: -0.01, born: now, ttl: 1300, colors: ['rgba(255, 248, 232, 0.7)', 'rgba(200, 204, 214, 0.45)', 'rgba(200, 204, 214, 0.2)'], wobble: rng() * 6 });
            } else if (entry.id === 'pote-ouro-arco') {
              st.nextGlint = now + 1200 + rng() * 1600;
              float('brilho', cx - 6 + rng() * 12, y + 4 + rng() * 6, now, ['#fff6b8', '#ffffff']);
            } else if (entry.id === 'globo-bingo') {
              st.nextGlint = now + 2600 + rng() * 2400;
              float('brilho', cx - 4 + rng() * 8, y + 4, now, ['#ffffff', '#d8f4ff']);
            } else st.nextGlint = now + 5000;
          }
        }
        for (const member of lists.parade) {
          const { meta, x, y } = member;
          groundShadow(x + meta.w / 2, 14, ground() + CHAR_FEET + 1, 1);
          sprite(meta, personFrame(meta, 'anda', now, { phase: member.i * 0.7 }), x, y, member.dir < 0);
          if (member.gold) outlined(CROWN, x + meta.w / 2 - 3, y - 4 + Math.round(Math.sin(now / 420 + member.i)), CROWN_COLORS);
          if (!member.caught) region('premio:desfile', x, y, meta.w, meta.h);
        }
        for (const { st, meta, x, y, acting } of lists.pessoa) {
          const entry = st.entry;
          const jump = hop(st, now);
          const dir = st.dir || 1;
          const pose = acting ? 'acao' : st.mode === 'anda' ? 'anda' : 'parado';
          g.globalAlpha = st.a;
          groundShadow(x + meta.w / 2, 14, ground() + CHAR_FEET + 1, st.a);
          sprite(meta, personFrame(meta, pose, now, st), x, y + jump, dir < 0);
          g.globalAlpha = 1;
          region(`premio:${entry.id}`, x, y + jump, meta.w, meta.h);
          // A coroa de quem ganhou o troféu de ouro do jogo, flutuando em cima da cabeça.
          const crown = st.gold ? 6 : 0;
          if (st.gold) {
            g.globalAlpha = st.a;
            outlined(CROWN, x + meta.w / 2 - 3, y - 4 + jump + Math.round(Math.sin(now / 420 + st.phase)), CROWN_COLORS);
            g.globalAlpha = 1;
            if (st.a > 0.9 && now >= (st.nextShine || 0)) {
              st.nextShine = now + 1800 + rng() * 1800;
              glints++;
              float('brilho', x + meta.w / 2 + (rng() - 0.5) * 10, y - 4, now, ['#ffd21e', '#fffbe0']);
            }
          }
          // O embrulhinho do presente: balança em cima da cabeça enquanto o presente está pronto.
          if (engine.premios.giftReady(entry.id) && st.a > 0.9) {
            const bob = Math.round(Math.sin(now / 260 + st.phase) * 1.2);
            halo(x + meta.w / 2, y - 4 + bob - crown, 7, '#ffd21e', 0.2);
            shape(GIFT, x + meta.w / 2 - 2, y - 7 + bob - crown, GIFT_COLORS);
            if (now >= st.nextGlint) {
              st.nextGlint = now + 1300 + rng() * 600;
              float('brilho', x + meta.w / 2 + (rng() - 0.5) * 12, y - 6 - crown, now, ['#ffd21e', '#fff07a']);
            }
          }
        }
      }
    }

    function reset() { states.clear(); spot = null; glints = 0; chats = 0; lastChat = []; said.length = 0; paradeKey = null; lists = { chao: [], varal: [], fundo: [], pessoa: [], parade: [] }; backX.clear(); }

    function probe() {
      const ids = list => list.map(item => item.st.entry.id);
      return { chao: ids(lists.chao), varal: ids(lists.varal), fundo: ids(lists.fundo), pessoa: ids(lists.pessoa), spot: spot ? spot.id : null,
        acting: lists.pessoa.filter(item => item.acting).map(item => item.st.entry.id), glints, chats, lastChat, said: [...said],
        gold: [...states.values()].filter(st => st.gold && st.want).map(st => st.entry.id), parade: lists.parade.map(item => item.id) };
    }

    return { update, draw, poke, onGift, onUnlock, onPlay, onParadeCaught, reset, probe };
  }

  root.ArraiaFestaPremios = { create };
})(typeof globalThis !== 'undefined' ? globalThis : this);
