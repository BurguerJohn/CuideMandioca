// Bairro: a rua da turma, uma casa para cada integrante que a Mandioca já pescou. Clique na casa de quem está esperando visita (com o
// coraçãozinho em cima) para ir lá: rende Animação e um recado. O motor está em src/mini-bairro.js.
//
// A rua à noite: janelas acesas que tremem, lanterninhas, postes, o chafariz esguichando, luzinhas nas árvores, fumaça nas chaminés e um
// cachorro caramelo que atravessa a rua de vez em quando (clique nele para fazer carinho). Cada casa tem o sinal do ofício de quem mora.
(function (root) {
  'use strict';

  const Base = root.ArraiaJanelaBase;
  const W = 176;
  const H = 120;
  const compact = n => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(Math.round(n)));
  const minutes = seconds => (seconds >= 90 ? `${Math.ceil(seconds / 60)} min` : `${Math.max(1, Math.ceil(seconds))} s`);

  function create(canvas, bundle, hooks = {}) {
    const meta = bundle.janelas.bairro;
    const base = Base.create(canvas, bundle, { width: W, height: H, sound: hooks.sound, images: [meta.fundo.image, meta.casas.image, meta.frente.image, meta.varal.image,
      bundle.scenery.caramelo.image, ...Object.values(bundle.chars).map(entry => entry.image)] });
    const tr = hooks.t || Base.tr;
    const g = base.g;
    let engineRef = null;
    const visited = {};                          // id -> quando a visita aconteceu (a casa acende, o vizinho dá um pulo)
    const knock = {};                            // id -> quando a casa balançou (visita cedo demais)
    const dog = { x: -30, dir: 1, at: 0, nextAt: 0, hop: -1e9 };

    function rewardLines(reward) {
      const lines = [];
      if (reward.cheer) lines.push(tr('gain.cheer', { n: compact(reward.cheer) }));
      if (reward.tickets) lines.push(tr('gain.tickets', { n: reward.tickets }));
      return lines;
    }

    const spot = i => ({ x: meta.colunas[i % 7], top: meta.topos[Math.floor(i / 7)], ground: meta.chaos[Math.floor(i / 7)] });

    function drawHouse(house, i, now, info) {
      const { x, top, ground } = spot(i);
      const [w, h] = meta.casa;
      const knockT = knock[house.id] ? (now - knock[house.id]) / 260 : 1;
      const shiver = knockT < 1 ? Math.round(Math.sin(knockT * Math.PI * 5) * 1.5 * (1 - knockT)) : 0;
      const hx = x + shiver;
      base.sprite(meta.casas, house.owned ? i : meta.casas.quantas, hx, top);
      let tip;
      if (!house.owned) tip = tr('mini.bairro.tipEmpty');
      else {
        const sheet = bundle.chars[house.id];
        const cx = x + w / 2;
        const sinceVisit = now - (visited[house.id] ?? -1e9);
        if (house.away) {
          // No rolê: a casa fica de janela apagada e uma plaquinha de "FORA" pendurada na porta.
          g.globalAlpha = 0.45;
          g.fillStyle = '#10101c';
          g.fillRect(hx + 3, top + 21, 5, 6);
          g.fillRect(hx + 17, top + 21, 5, 6);
          g.globalAlpha = 1;
          g.fillStyle = '#26242e';
          g.fillRect(Math.round(cx - 11), top + 26, 23, 9);
          g.fillStyle = '#4a7ab8';
          g.fillRect(Math.round(cx - 10), top + 27, 21, 7);
          base.text(tr('mini.bairro.away'), cx, top + 28, '#ffffff');
          tip = tr('mini.bairro.tipAway', { name: house.name });
        } else {
          const frame = Math.floor(now / 1000 * (sheet.fps || 4) + i) % sheet.frames;
          g.globalAlpha = house.ready ? 1 : 0.78;
          const fit = Math.min(1, (meta.casa[0] - 2) / sheet.w);
          const cw = Math.round(sheet.w * fit);
          const ch = Math.round(sheet.h * fit);
          const hop = sinceVisit < 420 ? Math.round(Math.abs(Math.sin(sinceVisit / 420 * Math.PI * 2)) * 5 * (1 - sinceVisit / 420)) : 0;
          base.sprite(sheet, frame, cx - cw / 2 + shiver, ground - ch + 1 - hop, { w: cw, h: ch });
          g.globalAlpha = 1;
          if (house.ready) {
            const bob = Math.round(Math.sin(now / 280 + i) * 1.2);
            base.glow(cx, ground - sheet.h - 2 + bob, 7, '#ff6a8a', 0.1 + 0.05 * Math.sin(now / 200 + i));
            base.sprite(bundle.casa.fx, bundle.casa.fx.ids.indexOf('coracao'), cx - 2, ground - sheet.h - 6 + bob);
            tip = tr('mini.bairro.tipReady', { name: house.name, level: house.level });
          } else {
            tip = tr('mini.bairro.tipWait', { name: house.name, t: minutes(house.wait) });
            // Falta quanto para a próxima visita: uma barrinha de pontinhos na soleira.
            const total = engineRef.data.minis.bairro.visitWait;
            const done = Math.max(0, Math.min(1, 1 - house.wait / total));
            g.fillStyle = '#26242e';
            g.fillRect(Math.round(cx - 8), ground + 1, 16, 3);
            g.fillStyle = '#7ad0ee';
            g.fillRect(Math.round(cx - 7), ground + 2, Math.round(14 * done), 1);
          }
          // O vizinho acabou de receber visita: a janela e a porta piscam na cor do carinho.
          if (sinceVisit < 700) {
            base.glow(cx, top + 24, 18, '#ffd860', 0.18 * (1 - sinceVisit / 700));
          }
        }
      }
      base.region(`casa:${house.id}`, x, top, w, ground - top + 2, { casa: house.id, tip, hot: house.ready });
    }

    // A rua viva: luz das janelas (tremendo como vela), lanterninhas, postes, fumaça, o chafariz, luzinhas nas árvores e vagalumes.
    function drawLights(info, now) {
      const t = now / 1000;
      info.houses.forEach((house, i) => {
        if (!house.owned || house.away) return;
        const { x, top } = spot(i);
        meta.luzJanelas.forEach(([wx, wy], k) => base.glow(x + wx, top + wy, 5, '#ffc860', 0.1 + 0.04 * Math.sin(t * 2.1 + i * 1.7 + k)));
        base.glow(x + meta.lanterna[0] + 0.5, top + meta.lanterna[1] + 1, 4, '#ffd070', 0.12 + 0.05 * Math.sin(now / 130 + i));
        // Chaminé de casa com gente: um fiozinho de fumaça.
        const chimney = meta.chaminesCasa[String(i)];
        if (chimney) {
          for (let k = 0; k < 3; k++) {
            const phase = (t * 0.28 + i * 0.31 + k / 3) % 1;
            g.globalAlpha = (1 - phase) * 0.4;
            g.fillStyle = '#b8b0d0';
            g.fillRect(Math.round(x + chimney[0] + Math.sin(phase * 6 + i) * 2 + phase * 3), Math.round(top + chimney[1] - phase * 9), phase < 0.4 ? 1 : 2, phase < 0.4 ? 1 : 2);
          }
          g.globalAlpha = 1;
        }
      });
      meta.lampioes.forEach((x, i) => base.glow(x + 0.5, 37, 9, '#ffc860', 0.1 + 0.03 * Math.sin(now / 150 + i * 2.2)));
      // Chafariz: três fios de água sobem, abrem e caem na bacia (sem estado: tudo sai do relógio).
      const [fx, fy] = meta.fonte;
      for (let k = 0; k < 14; k++) {
        const phase = (t * 0.9 + k / 14) % 1;
        const arm = ((k % 3) - 1);
        const px = fx + arm * phase * 7;
        const py = fy - 16 - Math.sin(phase * Math.PI) * 9 + phase * phase * 12;
        g.globalAlpha = 0.5 + 0.4 * Math.sin(phase * Math.PI);
        g.fillStyle = k % 2 ? '#bff0ff' : '#e8fcff';
        g.fillRect(Math.round(px), Math.round(py), 1, 1);
      }
      g.globalAlpha = 1;
      g.fillStyle = '#e8fcff';
      for (let k = 0; k < 5; k++) {
        g.globalAlpha = Math.max(0, Math.sin(t * 2.4 + k * 1.9)) * 0.7;
        g.fillRect(fx - 10 + k * 5, fy - 2 + (k % 2), 2, 1);
      }
      g.globalAlpha = 1;
      // Luzinhas penduradas nas duas árvores da praça piscando.
      meta.luzesArvore.forEach(([lx, ly], i) => {
        const on = Math.sin(t * 2 + i * 2.3) > -0.2;
        g.fillStyle = on ? '#fff0b0' : '#7a6a30';
        g.fillRect(lx, ly, 1, 1);
        if (on) base.glow(lx, ly, 2, '#ffd860', 0.08);
      });
      base.fireflies({ x: 4, y: 94, w: 168, h: 24 }, 5, now);
    }

    // O cachorro caramelo que atravessa a rua (a cada meio minuto): rápido, de cabeça baixa, e dá pulinhos de alegria quando alguém faz carinho.
    function drawDog(now) {
      const sheet = bundle.scenery.caramelo;
      if (dog.nextAt === 0) dog.nextAt = now + 6000;
      if (!dog.active && now >= dog.nextAt) { dog.active = true; dog.dir = dog.dir > 0 ? -1 : 1; dog.x = dog.dir > 0 ? -20 : W + 20; dog.at = now; }
      if (!dog.active) return;
      const dt = Math.min(0.1, (now - dog.at) / 1000);
      dog.at = now;
      dog.x += dog.dir * 22 * dt;
      if (dog.x > W + 24 || dog.x < -24) { dog.active = false; dog.nextAt = now + 24000 + (now % 9000); return; }
      const hopT = (now - dog.hop) / 360;
      const hop = hopT < 1 ? Math.round(Math.abs(Math.sin(hopT * Math.PI)) * 5) : 0;
      const frame = Math.floor(now / 1000 * 8) % 4;
      g.globalAlpha = 0.3;
      g.fillStyle = '#10101c';
      g.fillRect(Math.round(dog.x - sheet.w / 2 + 1), 56, Math.round(sheet.w - 2), 2);
      g.globalAlpha = 1;
      base.sprite(sheet, frame, dog.x - sheet.w / 2, 57 - sheet.h - hop, { flip: dog.dir < 0 });
      base.region('cachorro', dog.x - sheet.w / 2, 57 - sheet.h - 2, sheet.w, sheet.h + 4, { cachorro: true, tip: tr('mini.bairro.tipDog'), hot: true });
    }

    function draw(engine, now) {
      engineRef = engine;
      const info = engine.mini('bairro').info();
      base.clear();
      base.clearRegions();
      base.picture(meta.fundo.image);
      drawDog(now);
      info.houses.forEach((house, i) => drawHouse(house, i, now, info));
      base.picture(meta.frente.image);
      base.sprite(meta.varal, [0, 1, 2, 1][Math.floor(now / 520) % 4], 0, 34);
      drawLights(info, now);
      base.drawParticles(now);
      base.drawSays(now);
      base.drawFx(now);
      return true;
    }

    function click(clientX, clientY, now = 0) {
      if (!engineRef) return false;
      const model = engineRef.mini('bairro');
      const found = base.hit(clientX, clientY);
      if (found?.cachorro) {
        dog.hop = now;
        hooks.sound?.('latido');
        base.spawn('coracao', found.point.x - 2, found.point.y - 10, now);
        base.bits(found.point.x, found.point.y - 4, 6, now, { colors: ['#ff6a8a', '#ffb0c8', '#ffffff'], speed: 24, up: 18, gravity: 40, ms: 600 });
        base.pop(tr('mini.bairro.dogSay'), found.point.x, found.point.y - 14, now, '#ffe27a', { ms: 900 });
        return true;
      }
      if (!found?.casa) return false;
      const index = engineRef.data.chars.findIndex(entry => entry.id === found.casa);
      const { x, top, ground } = spot(index);
      const cx = x + meta.casa[0] / 2;
      const got = model.visit(found.casa);
      if (got.ok) {
        hooks.sound?.('carta');
        visited[found.casa] = now;
        base.spawn('coracao', cx - 2, top + 4, now);
        base.spawn('estrela', cx + 4, top + 8, now);
        // A visita: a casa se acende, chovem coraçõezinhos e confete da porta, e o prêmio sobe num painel (com a ficha em destaque).
        base.ring(cx, ground - 8, now, { from: 4, to: 24, color: '#ffe27a', ms: 520, thick: 2 });
        base.ring(cx, ground - 8, now, { from: 2, to: 14, color: '#ff8aa8', ms: 380 });
        base.bits(cx, ground - 10, 18, now, { colors: ['#ff6a8a', '#ffb0c8', '#ffd21e', '#ffffff', '#4fd4ff'], speed: 46, up: 20, gravity: 70, ms: 950 });
        base.pop(tr('mini.bairro.hello'), cx, top + 2, now, '#fff8e8', { scale: 2, ms: 1300, rise: 10 });
        base.tag(rewardLines(got.reward).map(line => [line, '#ffe27a']), cx, top - 6, now, { ms: 2800 });
        if (got.ticket) { base.flash('#ffe27a', 0.12, 240, now, { x: x - 2, y: top - 2, w: 28, h: 38 }); base.shake(0.8, 200, now); }
        hooks.toast?.(tr('mini.bairro.recado', { name: got.char.name, text: got.recado }), 'ouro');
      } else if (got.reason === 'empty') {
        hooks.sound?.('erro');
        base.say(tr('mini.bairro.empty'), cx, top + 6, now, '#ff9a8a');
        knock[found.casa] = now;
        base.tap(found.point.x, found.point.y, now);
      } else if (got.reason === 'away') {
        base.say(tr('mini.bairro.awaySay'), cx, top + 6, now, '#8ed6ff');
        knock[found.casa] = now;
      } else if (got.reason === 'wait') {
        base.say(tr('mini.bairro.comeBack', { t: minutes(got.wait).toUpperCase() }), cx, top + 6, now, '#8ed6ff');
        knock[found.casa] = now;
        base.tap(found.point.x, found.point.y, now);
      }
      return true;
    }

    function status(engine) {
      const info = engine.mini('bairro').info();
      const owned = info.houses.filter(house => house.owned).length;
      const ready = info.houses.filter(house => house.ready).length;
      return tr('mini.bairro.status', { n: owned, m: info.houses.length, r: ready });
    }

    function onEvents() {}

    function probe() {
      return { ...base.probeBase() };
    }

    return { size: base.size, setScale: base.setScale, draw, hit: base.hit, click, status, onEvents, probe };
  }

  root.ArraiaJanelas.registerView('bairro', create);
})(typeof globalThis !== 'undefined' ? globalThis : this);
