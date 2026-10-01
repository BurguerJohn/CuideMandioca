// A Casa da Mandioca: a janela onde os moradores vivem (do convidado 100 em diante). Desenha a casa em corte (cômodos
// empilhados), cada morador fazendo a sua atividade em loop, os efeitos (notas, vapor, zzz...) e a reação ao clique.
// A arte vem do pacote (`bundle.casa`, gerado por art/casa.py e art/casa_salas.py). Como a festa, o canvas tem o tamanho
// da casa em pixels de arte e quem amplia é o CSS (image-rendering: pixelated), por um fator inteiro.
(function (root) {
  'use strict';

  const tr = (key, vars) => (root.ArraiaI18n ? root.ArraiaI18n.t(key, vars) : key);
  const SIDE = 9;            // céu dos lados da casa
  const SKY = 12;            // céu em cima do telhado
  const WALL = 3;            // parede entre os cômodos
  const ROOF = 13;           // altura do telhado
  const GROUND = 18;         // chão (grama e terra)
  const WALL_COLOR = '#5a3018';
  const WALL_LIGHT = '#8a5228';
  const WALL_DARK = '#34190c';
  const SKY_BANDS = ['#15132e', '#1c1a3a', '#241f4a', '#2d2858', '#37306a', '#43397a'];
  const REACT_MS = 720;
  const POP_MS = 1100;
  const SAY_MS = 1900;
  const TEXT_COLORS = ['#fff8e8', '#ffe27a', '#9ef05a', '#8ed6ff', '#ffb0c8'];
  const hash = (a, b) => (Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 17, 0xc2b2ae35)) >>> 0;

  // Planta: onde fica cada cômodo e o tamanho da casa (em pixels de arte). Os andares sobem; o primeiro enche da esquerda
  // para a direita e depois vem o de cima. A largura só cresce enquanto o andar de baixo enche.
  function plan(rooms, columns, rw, rh) {
    const cols = Math.max(1, Math.min(columns, rooms));
    const floors = Math.max(1, Math.ceil(rooms / columns));
    const width = SIDE * 2 + WALL + cols * (rw + WALL);
    const height = SKY + ROOF + WALL + floors * (rh + WALL) + GROUND;
    const spots = [];
    for (let r = 0; r < rooms; r++) {
      const col = r % columns;
      const floor = Math.floor(r / columns);
      spots.push({ x: SIDE + WALL + col * (rw + WALL), y: SKY + ROOF + WALL + (floors - 1 - floor) * (rh + WALL), col, floor });
    }
    return { width, height, cols, floors, spots, groundY: height - GROUND };
  }

  function create(canvas, bundle, hooks = {}) {
    const meta = bundle.casa;
    const g = canvas.getContext('2d');
    const sound = name => { try { hooks.sound?.(name); } catch (_) { /* som é enfeite */ } };
    const images = {};
    const load = name => {
      if (!name || images[name] || !bundle.images?.[name]) return;
      const image = new Image();
      image.src = bundle.images[name];
      images[name] = image;
    };
    const ready = image => !!image && image.complete !== false && (image.naturalWidth === undefined || image.naturalWidth > 0 || image.width > 0);
    if (meta) {
      for (const sheet of meta.moradores.folhas) load(sheet.image);
      for (const sheet of meta.salas.folhas) load(sheet.image);
      for (const item of [meta.telhado, meta.jardim, meta.chamine, meta.fx]) load(item.image);
    }
    let engineRef = null;
    const view = { css: 2, limit: null, width: 0, height: 0, physical: 1, applied: '' };
    const rw = meta ? meta.salas.rw : 68;
    const rh = meta ? meta.salas.rh : 46;
    const fxIndex = {};
    (meta?.fx.ids || []).forEach((id, i) => { fxIndex[id] = i; });
    let layout = null;
    let layoutKey = '';
    const pops = new Map();       // 'r:<cômodo>' / 'm:<morador>' -> quando chegou
    const reacts = new Map();     // morador -> { at }
    const nextFx = new Map();     // morador -> quando solta o próximo efeito
    const particles = [];
    const says = [];
    let lastDraw = 0;
    const regions = [];
    const whoCache = new Map();   // morador -> dados (nome, atividade, visual): não mudam, e o cálculo roda a cada quadro
    const who = index => {
      let entry = whoCache.get(index);
      if (!entry) { entry = engineRef.houseResident(index); whoCache.set(index, entry); }
      return entry;
    };

    function applyScale() {
      if (!view.width) return;
      const dpr = root.devicePixelRatio || 1;
      const wanted = Math.max(1, Math.round(view.css * dpr));
      let physical = wanted;
      if (view.limit) {
        const fit = Math.min(view.limit.width / view.width, view.limit.height / view.height);
        physical = Math.max(1, Math.min(wanted, Math.floor(fit * dpr)));
      }
      const applied = `${view.width}|${view.height}|${physical}|${dpr}`;
      if (applied === view.applied) return;
      view.applied = applied;
      view.physical = physical;
      if (canvas.width !== view.width) canvas.width = view.width;
      if (canvas.height !== view.height) canvas.height = view.height;
      canvas.style.width = `${view.width * physical / dpr}px`;
      canvas.style.height = `${view.height * physical / dpr}px`;
    }

    // `css`: pixels da tela por pixel de arte que a pessoa quer (2 por padrão); `limit`: o maior tamanho que cabe na tela.
    function setScale(css, limit = null) {
      view.css = css;
      view.limit = limit;
      applyScale();
    }

    function size() {
      return { width: view.width * view.physical / (root.devicePixelRatio || 1), height: view.height * view.physical / (root.devicePixelRatio || 1),
        art: { width: view.width, height: view.height }, physical: view.physical };
    }

    const frameOf = (design, frame) => {
      const per = meta.moradores.porFolha;
      const sheet = meta.moradores.folhas[Math.floor(design / per)];
      const count = meta.moradores.quadros + 1;
      return { image: images[sheet.image], sx: ((design % per) * count + frame) * meta.moradores.w };
    };

    function spawn(kind, x, y, now, extra = {}) {
      if (!(kind in fxIndex)) return;
      particles.push({ kind, x, y, born: now, ...extra });
      if (particles.length > 160) particles.shift();
    }

    function say(text, x, y, now, color = TEXT_COLORS[0]) {
      says.push({ text, x, y, born: now, color });
      if (says.length > 8) says.shift();
    }

    function emit(engine, now) {
      const info = engine.houseInfo();
      for (let i = 0; i < info.residents; i++) {
        const person = who(i);
        const act = meta.atividades[person.activity];
        const spec = act?.fx;
        if (!spec) continue;
        const due = nextFx.get(i);
        if (due === undefined) { nextFx.set(i, now + 300 + (hash(i, 5) % 1200)); continue; }
        if (now < due) continue;
        nextFx.set(i, now + spec.cada * (0.6 + (hash(i, Math.floor(now / 250)) % 80) / 100));
        const spot = layout.spots[person.room];
        if (!spot) continue;
        const x = spot.x + meta.salas.slots[person.slot] - 14 + spec.x;
        const y = spot.y + meta.salas.pe - 33 + spec.y;
        spawn(spec.tipo, x, y, now);
      }
      // Fumaça da chaminé do telhado mais alto.
      const top = layout.spots.reduce((best, spot) => (spot.y < best.y ? spot : best), layout.spots[0]);
      if (top && (Math.floor(now / 900) !== Math.floor(lastDraw / 900))) spawn('vapor', top.x + 12, top.y - WALL - ROOF - 4, now);
    }

    function particleState(p, now) {
      const t = (now - p.born) / 1000;
      switch (p.kind) {
        case 'nota': case 'nota2': return { x: p.x + Math.sin(t * 4 + p.born) * 3, y: p.y - t * 11, life: 1.8, alpha: 1 - t / 1.8 };
        case 'zzz': return { x: p.x + t * 5, y: p.y - t * 7, life: 2.2, alpha: 1 - t / 2.2 };
        case 'vapor': return { x: p.x + Math.sin(t * 3 + p.born) * 2, y: p.y - t * 9, life: 1.5, alpha: 0.85 - t / 1.8 };
        case 'bolha': return { x: p.x + Math.sin(t * 5 + p.born) * 2, y: p.y - t * 10, life: 1.4, alpha: 1 - t / 1.4 };
        case 'gota': return { x: p.x - t * 4, y: p.y + t * t * 26, life: 0.75, alpha: 1 - t / 0.75 };
        case 'coracao': return { x: p.x + Math.sin(t * 4) * 3, y: p.y - t * 11, life: 1.6, alpha: 1 - t / 1.6 };
        case 'poeira': return { x: p.x + (p.dx || 0) * t * 10, y: p.y - t * 4, life: 1.0, alpha: 0.9 - t };
        case 'exclama': return { x: p.x, y: p.y - t * 4, life: 0.9, alpha: 1 - t / 0.9 };
        case 'faisca': return { x: p.x + ((p.born % 7) - 3) * 4 * t, y: p.y - 9 * t + 34 * t * t, life: 0.65, alpha: 1 - t / 0.65 };
        case 'fumaca': return { x: p.x + Math.sin(t * 2 + p.born) * 3, y: p.y - t * 7, life: 1.9, alpha: 0.8 - t / 2.4 };
        case 'pipoca': return { x: p.x + ((p.born % 5) - 2) * 4 * t, y: p.y - 15 * t + 28 * t * t, life: 0.95, alpha: 1 - t / 1.2 };
        case 'neve': return { x: p.x + Math.sin(t * 3 + p.born) * 3, y: p.y + t * 9, life: 1.9, alpha: 1 - t / 1.9 };
        default: return { x: p.x, y: p.y - t * 2, life: 0.8, alpha: Math.abs(Math.sin(t * 8)) * (1 - t / 0.8) };
      }
    }

    function drawParticles(now) {
      const img = images[meta.fx.image];
      if (!ready(img)) { particles.length = 0; return; }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const s = particleState(p, now);
        if ((now - p.born) / 1000 >= s.life) { particles.splice(i, 1); continue; }
        g.globalAlpha = Math.max(0, Math.min(1, s.alpha));
        g.drawImage(img, fxIndex[p.kind] * meta.fx.w, 0, meta.fx.w, meta.fx.h, Math.round(s.x), Math.round(s.y), meta.fx.w, meta.fx.h);
      }
      g.globalAlpha = 1;
    }

    function drawSky(now) {
      const band = Math.ceil(view.height / SKY_BANDS.length);
      SKY_BANDS.forEach((color, i) => { g.fillStyle = color; g.fillRect(0, i * band, view.width, band); });
      for (let i = 0; i < 38; i++) {
        const x = hash(i, 11) % view.width;
        const y = hash(i, 23) % Math.max(1, layout.groundY - 4);
        g.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(now / 900 + i * 1.7));
        g.fillStyle = i % 5 === 0 ? '#ffe27a' : '#fff6e0';
        g.fillRect(x, y, 1, 1);
      }
      g.globalAlpha = 1;
      // Lua cheia no canto de cima.
      const mx = view.width - 14;
      g.fillStyle = '#fff3c4';
      g.fillRect(mx - 3, 3, 7, 7);
      g.fillRect(mx - 4, 4, 9, 5);
      g.fillStyle = '#e8d596';
      g.fillRect(mx - 1, 5, 2, 2);
    }

    function drawGround(now) {
      const y = layout.groundY;
      g.fillStyle = '#3a9a48';
      g.fillRect(0, y, view.width, 4);
      g.fillStyle = '#56b860';
      for (let x = 1; x < view.width; x += 5) g.fillRect(x + (hash(x, 3) % 3), y, 1, 1);
      g.fillStyle = '#5c3a1e';
      g.fillRect(0, y + 4, view.width, GROUND - 4);
      g.fillStyle = '#7a4e2a';
      for (let x = 2; x < view.width; x += 7) g.fillRect(x + (hash(x, 9) % 4), y + 6 + (hash(x, 4) % 8), 2, 1);
      g.fillStyle = '#3e2714';
      for (let x = 5; x < view.width; x += 11) g.fillRect(x + (hash(x, 5) % 4), y + 9 + (hash(x, 6) % 6), 1, 1);
    }

    // Enfeites do jardim em volta da casa (em posições fixas em relação às bordas).
    function drawGarden() {
      const img = images[meta.jardim.image];
      if (!ready(img)) return;
      const cell = meta.jardim.w;
      const cellH = meta.jardim.h;
      const place = (index, x) => {
        const item = meta.jardim.itens[index];
        g.drawImage(img, index * cell, cellH - item.h, item.w, item.h, Math.round(x), layout.groundY + 3 - item.h, item.w, item.h);
      };
      place(0, 1);
      place(1, 10);
      place(3, SIDE - 8 + 2);
      if (layout.width >= 120) place(2, view.width - 40);
      place(5, view.width - 24);
      if (layout.width >= 170) place(4, layout.width / 2 - 10);
    }

    function drawRoom(index, spot, now) {
      const pop = pops.get(`r:${index}`);
      const t = pop === undefined ? 1 : Math.min(1, (now - pop) / POP_MS);
      const kind = engineRef.houseRoom(index);
      const sheet = meta.salas.folhas[Math.floor(kind.kind / meta.salas.porFolha)];
      const frame = (kind.kind % meta.salas.porFolha) * 2 + (Math.floor(now / 600) % 2);
      // Parede em volta (a parede entre dois cômodos é a mesma).
      g.fillStyle = WALL_COLOR;
      g.fillRect(spot.x - WALL, spot.y - WALL, rw + WALL * 2, rh + WALL * 2);
      g.fillStyle = WALL_LIGHT;
      g.fillRect(spot.x - WALL, spot.y - WALL, rw + WALL * 2, 1);
      g.fillRect(spot.x - WALL, spot.y - WALL, 1, rh + WALL * 2);
      g.fillStyle = WALL_DARK;
      g.fillRect(spot.x - WALL, spot.y + rh + WALL - 1, rw + WALL * 2, 1);
      g.fillRect(spot.x + rw + WALL - 1, spot.y - WALL, 1, rh + WALL * 2);
      const img = images[sheet.image];
      if (!ready(img)) return;
      // Cômodo novo: sobe do chão (a parte de baixo aparece primeiro).
      const visible = Math.max(1, Math.round(rh * (1 - (1 - t) * (1 - t))));
      g.drawImage(img, frame * rw, rh - visible, rw, visible, spot.x, spot.y + rh - visible, rw, visible);
    }

    function drawRoofs(info, now) {
      const img = images[meta.telhado.image];
      if (!ready(img)) return;
      const columns = engineRef.data.house.columns;
      for (let r = 0; r < info.rooms; r++) {
        if (r + columns < info.rooms) continue;
        const spot = layout.spots[r];
        const variant = spot.floor % meta.telhado.frames;
        const pop = pops.get(`r:${r}`);
        const t = pop === undefined ? 1 : Math.min(1, (now - pop) / POP_MS);
        const lift = Math.round((1 - t) * 10);
        g.globalAlpha = t;
        g.drawImage(img, variant * meta.telhado.w, 0, meta.telhado.w, meta.telhado.h, spot.x - 4, spot.y - WALL - meta.telhado.h + 2 - lift,
          meta.telhado.w, meta.telhado.h);
        g.globalAlpha = 1;
      }
      const top = layout.spots.reduce((best, spot) => (spot.y < best.y || (spot.y === best.y && spot.x < best.x) ? spot : best), layout.spots[0]);
      const chim = images[meta.chamine.image];
      if (top && ready(chim)) {
        g.drawImage(chim, 0, 0, meta.chamine.w, meta.chamine.h, top.x + 10, top.y - WALL - meta.telhado.h - 6, meta.chamine.w, meta.chamine.h);
      }
    }

    function residentPose(index, who, now) {
      const act = meta.atividades[who.activity];
      const react = reacts.get(index);
      const arrived = pops.get(`m:${index}`);
      let frame = Math.floor(now / 1000 * (act?.fps || 6) + (hash(index, 1) % 6)) % meta.moradores.quadros;
      let lift = 0;
      let alpha = 1;
      if (react && now - react.at < REACT_MS) {
        const t = (now - react.at) / REACT_MS;
        frame = meta.moradores.reacao;
        lift = -Math.round(4 * Math.sin(Math.PI * Math.min(1, t * 1.4)));
      } else if (react) reacts.delete(index);
      if (arrived !== undefined && now - arrived < POP_MS) {
        const t = (now - arrived) / POP_MS;
        lift -= Math.round((1 - t) * (1 - t) * 30);
        alpha = Math.min(1, t * 3);
      }
      return { frame, lift, alpha };
    }

    function drawResidents(info, now) {
      regions.length = 0;
      for (let i = 0; i < info.residents; i++) {
        const person = who(i);
        const spot = layout.spots[person.room];
        if (!spot) continue;
        const pose = residentPose(i, person, now);
        const { image, sx } = frameOf(person.design, pose.frame);
        const x = spot.x + meta.salas.slots[person.slot] - 14;
        const y = spot.y + meta.salas.pe - 33;
        if (ready(image)) {
          g.globalAlpha = pose.alpha;
          g.drawImage(image, sx, 0, meta.moradores.w, meta.moradores.h, x, y + pose.lift, meta.moradores.w, meta.moradores.h);
          g.globalAlpha = 1;
        }
        regions.push({ id: `casa-morador:${i}`, x, y: y - 4, w: meta.moradores.w, h: meta.moradores.h + 4, index: i, who: person });
      }
    }

    function drawSays(now) {
      for (let i = says.length - 1; i >= 0; i--) {
        const s = says[i];
        const t = (now - s.born) / SAY_MS;
        if (t >= 1) { says.splice(i, 1); continue; }
        const half = (s.text.length * 4 - 1) / 2 + 2;
        const x = Math.max(half, Math.min(view.width - half, s.x));
        root.ArraiaFesta?.pixelText(g, s.text, x, s.y - t * 8, s.color, t > 0.75 ? (1 - t) * 4 : 1);
      }
      g.globalAlpha = 1;
    }

    function draw(engine, now) {
      engineRef = engine;
      if (!meta) return false;
      const info = engine.houseInfo();
      if (!info.open) return false;
      const key = `${info.rooms}`;
      if (key !== layoutKey || !layout) {
        layout = plan(info.rooms, engine.data.house.columns, rw, rh);
        layoutKey = key;
        view.width = layout.width;
        view.height = layout.height;
        applyScale();
      }
      emit(engine, now);
      drawSky(now);
      drawGround(now);
      drawGarden();
      for (let r = 0; r < info.rooms; r++) drawRoom(r, layout.spots[r], now);
      drawRoofs(info, now);
      drawResidents(info, now);
      drawParticles(now);
      drawSays(now);
      lastDraw = now;
      return true;
    }

    // A janela da casa em pixels da tela: onde cada morador está (para o clique e a dica ao passar o mouse).
    function areas() {
      const rect = canvas.getBoundingClientRect();
      const kx = view.width ? rect.width / view.width : 1;
      const ky = view.height ? rect.height / view.height : 1;
      return regions.map(area => ({ id: area.id, index: area.index, who: area.who,
        box: [rect.left + area.x * kx, rect.top + area.y * ky, rect.left + (area.x + area.w) * kx, rect.top + (area.y + area.h) * ky] }));
    }

    function hit(clientX, clientY) {
      const list = areas();
      for (let i = list.length - 1; i >= 0; i--) {
        const { box } = list[i];
        if (clientX >= box[0] && clientX < box[2] && clientY >= box[1] && clientY < box[3]) return list[i];
      }
      return null;
    }

    // Clique num morador: ele reage (pulinho, coração, fala). Devolve o morador ou null.
    function poke(index, now = lastDraw) {
      const area = regions.find(region => region.index === index);
      if (!area) return null;
      const person = area.who;
      reacts.set(index, { at: now });
      const line = tr(`fx.casa.${person.role || person.activity}.${(hash(index, Math.floor(now / 1000)) % 2)}`);
      say(line, area.x + 14, area.y - 3, now, TEXT_COLORS[hash(index, 3) % TEXT_COLORS.length]);
      spawn('coracao', area.x + 6, area.y + 4, now);
      spawn('estrela', area.x + 20, area.y + 6, now);
      sound('carinho');
      return person;
    }

    // Um cômodo ou morador novo chegou: festa de chegada (poeira, brilho e som).
    function onEvents(engine, events, now) {
      engineRef = engine;
      if (!meta) return;
      const info = engine.houseInfo();
      const current = info.open ? plan(info.rooms, engine.data.house.columns, rw, rh) : null;
      for (const event of events) {
        if (event.type === 'house-room') {
          pops.set(`r:${event.room}`, now);
          const spot = current?.spots[event.room];
          if (spot) for (let k = 0; k < 6; k++) spawn('poeira', spot.x + (k % 2 ? rw - 6 : 4) + (k % 3) * 2, spot.y + rh - 6, now, { dx: k % 2 ? 1 : -1 });
        } else if (event.type === 'house-resident') {
          pops.set(`m:${event.index}`, now);
          const person = who(event.index);
          const spot = current?.spots[person.room];
          if (spot) {
            const x = spot.x + meta.salas.slots[person.slot];
            spawn('brilho', x - 8, spot.y + 12, now);
            spawn('estrela', x + 4, spot.y + 8, now);
            spawn('coracao', x, spot.y + 14, now);
          }
        }
      }
    }

    function probe() {
      return { rooms: layout ? layout.spots.length : 0, size: { width: view.width, height: view.height }, residents: regions.length,
        particles: particles.length, says: says.length, pops: pops.size, reacts: reacts.size, physical: view.physical };
    }

    return { draw, setScale, size, areas, hit, poke, onEvents, probe };
  }

  root.ArraiaCasa = { create, plan, SIDE, SKY, WALL, ROOF, GROUND };
})(typeof globalThis !== 'undefined' ? globalThis : this);
