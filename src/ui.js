(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ArraiaUI = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  // Textos vêm do dicionário do idioma (src/lang); no Node (testes), o módulo é carregado direto.
  const I18N = root.ArraiaI18n || (typeof require === 'function' ? require('./i18n.js') : null);
  const t = (key, vars) => I18N.t(key, vars);

  // Abas do Painel da festa: só números, dados, conquistas e ajustes.
  const TABS = [
    { id: 'festa', icon: 'festa' },
    { id: 'historico', icon: 'grafico' },
    { id: 'conquistas', icon: 'conquista' },
    { id: 'ajustes', icon: 'config' }
  ];
  // Telas de jogo: cada uma tem seu botão na placa e abre na própria janela. `tier` é o porte que libera.
  const TELAS = [
    { id: 'turma', icon: 'lotacao', tier: 1 },
    { id: 'pescaria', icon: 'pescaria', tier: 1 },
    { id: 'roles', icon: 'role', tier: 2 },
    { id: 'fogueira', icon: 'fogueira', tier: 2 },
    { id: 'correio', icon: 'carta' },
    { id: 'bingo', icon: 'bingo', tier: 1 },
    // A cozinha só aparece com o Fogão a Lenha num dos lados da festa.
    { id: 'cozinha', icon: 'panela', tier: 2, needs: 'fogao-lenha' }
  ];
  const STAT_ICONS = { rebolado: 'rebolado', folego: 'folego', refresco: 'refresco', ritmo: 'ritmo' };
  // Categorias da vitrine encaixada na festa.
  const DOCK = [
    { id: 'melhorias', icon: 'ui:melhoria' },
    { id: 'comidas', icon: 'ui:comida-pipoca' },
    { id: 'chapeu', icon: 'item:chapeu-palha' },
    { id: 'mao', icon: 'item:bandeirinha' },
    { id: 'tecido', icon: 'item:xadrez-vermelho' },
    { id: 'terreiro', icon: 'item:terra-batida' },
    { id: 'lado', icon: 'item:barraca-pescaria' },
    { id: 'varal', icon: 'item:varal-colorido' },
    { id: 'conjuntos', icon: 'item:coroa-flores' }
  ];
  // Tamanhos prontos em Ajustes (e no menu da bandeja): do menor ao maior que a alça de arrastar alcança (25% a 300%).
  const ZOOMS = [25, 50, 75, 100, 150, 200, 300];
  const BONFIRE_ICONS = { labareda: 'fogueira', brasa: 'fogueira', calor: 'fogueira' };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const number = (value, digits = 0) => new Intl.NumberFormat(I18N.locale(), { maximumFractionDigits: digits }).format(value);

  function compact(value) {
    value = Math.max(0, value || 0);
    if (value < 1000) return number(Math.floor(value));
    const units = [[1e12, 'num.trillion'], [1e9, 'num.billion'], [1e6, 'num.million'], [1e3, 'num.thousand']];
    for (const [size, key] of units) {
      if (value >= size) return t(key, { n: number(value / size, value / size < 100 ? 1 : 0) });
    }
    return number(value);
  }

  function duration(ms) {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = seconds % 60;
    if (h) return `${h}h ${String(m).padStart(2, '0')}min`;
    if (m) return `${m}min ${String(s).padStart(2, '0')}s`;
    return `${s}s`;
  }

  const percent = value => `${number(value * 100, value < 0.1 ? 1 : 0)}%`;
  // Tempo redondo em minutos ("15 min", "1 h", "1 h 30 min"); com segundos quebrados, o formato longo.
  function roundTime(ms) {
    if (ms % 60000) return duration(ms);
    const n = ms / 60000;
    return n < 60 ? `${n} min` : `${Math.floor(n / 60)} h${n % 60 ? ` ${n % 60} min` : ''}`;
  }

  const tabName = id => t(`tab.${id}`);
  const tabOf = id => [...TABS, ...TELAS].find(tab => tab.id === id);
  function tabLocked(tab, engine) { return (tab.tier || 0) > engine.tierIndex(); }

  function lockNote(engine, tier) {
    const target = engine.data.tiers[tier];
    return `<div class="trava">${t('lock.note', { tier: esc(target.name), size: target.size, now: engine.state.size })}</div>`;
  }

  function costButton(action, attrs, cost, currency, label, icon) {
    return `<button class="btn" data-action="${action}" ${attrs} data-cost="${cost}" data-currency="${currency}">` +
      `${esc(label)} <span class="preco">${icon}${compact(cost)}</span></button>`;
  }

  function bar(value, max, kind = '') {
    const width = Math.max(0, Math.min(100, 100 * value / Math.max(max, 1e-9)));
    return `<div class="barra ${kind}"><i style="width:${width}%"></i></div>`;
  }

  function header(title, subtitle, right = '') {
    return `<div class="aba-topo"><div><h2>${esc(title)}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div>${right}</div>`;
  }

  const until = (at, now) => `<b data-until="${at}">${duration(at - now)}</b>`;

  // Placa sobre a festa: recursos, porte e avisos.
  // Felicidade da Mandioca: as barrinhas de Amor e Barriga e o quanto o Rebolado vale com elas (atualizadas ao vivo pelo
  // app em [data-humor]). Clicar abre a aba Comidas da loja.
  function moodTitle(engine, mood = engine.mood()) {
    const max = engine.cfg.moodMax;
    return t('hud.moodTitle', { love: Math.round(100 * mood.amor / max), belly: Math.round(100 * mood.barriga / max),
      stat: engine.stats.rebolado.name, f: number(engine.moodFactor(mood), 2) });
  }
  // `named`: com o nome de cada barra (na aba Comidas; na placa só os ícones).
  function moodBars(engine, mood, icon, named = false) {
    const max = engine.cfg.moodMax;
    const bar = key => `<span class="mini-barra ${key}"><i data-humor="${key}" style="width:${Math.round(100 * mood[key] / max)}%"></i></span>`;
    const name = key => (named ? `<span class="humor-nome">${esc(t(key === 'amor' ? 'mood.love' : 'mood.belly'))}</span>` : '');
    return ['amor', 'barriga'].map(key => `<span class="humor-item">${icon(key === 'amor' ? 'ui:amor' : 'ui:barriga')}${name(key)}${bar(key)}</span>`).join('');
  }
  function moodRow(engine, ctx) {
    const mood = engine.mood();
    const factor = engine.moodFactor(mood);
    return `<button class="placa-humor ${factor < 1 ? 'triste' : factor > 1 ? 'feliz' : ''}" data-action="comidas" data-humor="linha" ` +
      `title="${esc(moodTitle(engine, mood))}">${moodBars(engine, mood, ctx.icon)}<b data-humor="fator">×${number(factor, 2)}</b></button>`;
  }

  function hud(engine, ctx) {
    const s = engine.state;
    const tier = engine.tierIndex();
    const next = engine.nextTier();
    const ready = s.outings.filter((_, i) => engine.outingState(i) === 'pronto').length;
    const counts = { pescaria: s.fishing.unlocked ? s.fishing.ready : 0, correio: s.mail.ready, roles: ready,
      cozinha: s.cozinha.pot?.ready ? 1 : 0 };
    const shown = TELAS.filter(tela => !tabLocked(tela, engine) && (!tela.needs || engine.isPlaced(tela.needs)));
    const telas = shown.map(tela => {
      const count = counts[tela.id] || 0;
      return `<button class="ferramenta ${count ? 'chama' : ''} ${ctx.tela === tela.id ? 'aberta' : ''}" data-action="tela" ` +
        `data-tela="${tela.id}" title="${esc(tabName(tela.id))}">${ctx.icon(`ui:${tela.icon}`)}` +
        `${count ? `<i class="selo-botao">${count}</i>` : ''}</button>`;
    }).join('');
    const upcoming = engine.sceneryPiece(s.size + 1);
    const goalsReady = engine.goalsReady();
    // O que está valendo agora: frenesi (do balão de sorte) e quadrilha marcada, cada um com os segundos que faltam.
    const r = s.runtime;
    const buffs = [
      r.frenzyLeft > 0 ? `<span class="selo ouro" title="${esc(t('hud.frenzyTitle'))}">${esc(t('hud.frenzy', { mult: engine.cfg.frenzyMult }))} ` +
        `<b data-buff="frenzy">${Math.ceil(r.frenzyLeft)}s</b></span>` : '',
      engine.specialDay() ? `<span class="selo ouro">${esc(t('hud.day', { name: t(`day.${engine.specialDay().id}`),
        v: Math.round(engine.specialDay().bonus * 100) }))}</span>` : '',
      // Em junho, até o dia 23: quantos dias faltam para o São João.
      engine.daysToSaoJoao?.() ? `<span class="selo">${esc(t('hud.countdown', { n: engine.daysToSaoJoao() }))}</span>` : '',
      s.bingo.round && !s.bingo.round.result ? `<span class="selo verde" title="${esc(t('hud.bingoTitle'))}">` +
        `${esc(t('hud.bingo', { n: engine.bingoMarks().count, total: 9 }))}</span>` : '',
      r.weddingLeft > 0 ? `<span class="selo ouro" title="${esc(t('hud.weddingTitle'))}">${esc(t('hud.wedding'))} ` +
        `<b data-buff="wedding">${Math.ceil(r.weddingLeft)}s</b></span>` : '',
      r.quadrilhaLeft > 0 ? `<span class="selo verde" title="${esc(t('hud.quadrilhaTitle'))}">${esc(t('hud.quadrilha', { v: Math.round(engine.quadrilhaBonus() * 100) }))} ` +
        `<b data-buff="quadrilha">${Math.ceil(r.quadrilhaLeft)}s</b></span>` : '',
      // Eventos que pedem clique na festa: leilão (lance e de quem), corrida de saco e friozinho.
      s.leilao?.active ? `<span class="selo ouro" title="${esc(t('hud.leilaoTitle'))}">${esc(t(`hud.leilao.${s.leilao.active.leader || 'open'}`,
        { n: s.leilao.active.leader ? s.leilao.active.price : s.leilao.active.base }))}</span>` : '',
      s.saco?.active ? `<span class="selo verde" title="${esc(t('hud.sacoTitle'))}">${esc(t('hud.saco'))}</span>` : '',
      s.visitor?.active ? `<span class="selo ouro" title="${esc(t('hud.visitorTitle'))}">${esc(t('hud.visitor', { v: Math.round(engine.cfg.visitorBonus * 100) }))}</span>` : '',
      s.fotografo?.active && !s.fotografo.active.shot ? `<span class="selo ouro" title="${esc(t('hud.fotoTitle'))}">${esc(t('hud.foto'))}</span>` : '',
      s.burro?.active && !s.burro.active.pinned ? `<span class="selo" title="${esc(t('hud.burroTitle'))}">${esc(t('hud.burro'))}</span>` : '',
      s.fantasia?.judgeAt ? `<span class="selo ouro" title="${esc(t('hud.fantasiaTitle'))}">${esc(t('hud.fantasia'))}</span>` : '',
      engine.cookBonus() > 0 ? `<span class="selo ouro" title="${esc(t('hud.cookTitle'))}">${esc(t('hud.cook', { dish: engine.recipe(s.cozinha.buff.id).name,
        v: Math.round(engine.cookBonus() * 100) }))} ${until(s.cozinha.buff.until, ctx.now)}</span>` : '',
      s.cold?.active ? `<span class="selo azul" title="${esc(t(engine.quentaoOn() ? 'hud.coldQuentao' : 'hud.coldTitle'))}">${esc(t('hud.cold'))}</span>` : ''
    ].join('');
    return `<div class="placa-linha">` +
      `<span class="recurso" title="${esc(t('res.cheer'))}">${ctx.icon('ui:animacao')}<b data-live="cheer">${compact(s.cheer)}</b></span>` +
      `<span class="recurso" title="${esc(t('res.tickets'))}">${ctx.icon('ui:fichas')}<b data-live="tickets">${compact(s.tickets)}</b></span>` +
      (tier >= 2 ? `<span class="recurso" title="${esc(t('res.wood'))}">${ctx.icon('ui:lenha')}<b data-live="wood">${compact(s.wood)}</b></span>` : '') +
      `</div>` + (buffs ? `<div class="placa-buffs">${buffs}</div>` : '') +
      `<div class="placa-porte"><span>${esc(engine.tier().name)}${s.year > 1 ? ` <small>${esc(t('hud.year', { n: s.year }))}</small>` : ''}</span>` +
      `<span class="convidados">${ctx.icon('ui:lotacao')}${s.size}${next ? `/${next.size}` : ''}</span></div>` +
      bar(s.fame, engine.fameNeed(), 'fama') +
      (upcoming ? `<div class="proximo" title="${esc(t('hud.nextTitle'))}">${t('hud.next', { piece: esc(upcoming.name) })}</div>` : '') +
      moodRow(engine, ctx) +
      // Loja e argolas mais as telas: com mais de 8 botões (a cozinha), a grade ganha a 5ª coluna em vez de outra fileira.
      `<div class="placa-barra"><div class="barra-jogo${shown.length + 2 > 8 ? ' cheia' : ''}">` +
      `<button class="ferramenta" data-action="vitrine" title="${esc(t('hud.shop'))}">${ctx.icon('ui:loja')}</button>` +
      `<button class="ferramenta argolas" data-action="argolas" title="${esc(t('rings.title'))}">${ctx.icon('ui:argolas')}` +
      `<i class="preco-argolas" data-live="ringCost"${engine.ringCost() > engine.cfg.ringCost ? '' : ' hidden'}>` +
      `${engine.ringCost()}</i></button>` + telas + `</div><div class="barra-sistema">` +
      `<button class="ferramenta" data-action="abrir" title="${esc(t('hud.panel'))}">` +
      `${ctx.icon('ui:painel')}</button>` +
      // Conquistas: abre o painel nessa aba; o selo conta as metas cumpridas esperando o resgate.
      `<button class="ferramenta ${goalsReady ? 'chama' : ''} ${ctx.tab === 'conquistas' && ctx.panelOpen ? 'aberta' : ''}" ` +
      `data-action="tab" data-tab="conquistas" data-alternar="1" title="${esc(goalsReady ? t('hud.goalsReady', { n: goalsReady }) : tabName('conquistas'))}">` +
      `${ctx.icon('ui:conquista')}${goalsReady ? `<i class="selo-botao">${goalsReady}</i>` : ''}</button>` +
      // Álbum de figurinhas, na janela dele.
      `<button class="ferramenta ${ctx.tela === 'album' ? 'aberta' : ''}" data-action="tela" data-tela="album" ` +
      `title="${esc(tabName('album'))}">${ctx.icon('ui:album')}</button>` +
      (engine.cfg.debugMenu || ctx.debug ? `<button class="ferramenta teste ${ctx.tela === 'teste' ? 'aberta' : ''}" data-action="tela" ` +
        `data-tela="teste" title="${esc(t('hud.test'))}">${ctx.icon('ui:teste')}</button>` : '') +
      `<span class="espaco"></span>` +
      // Tamanho num botão só: arrastar aumenta ou diminui; um clique (sem arrastar) volta a 100%.
      `<button class="ferramenta zoom alca" data-action="zoom-alca" title="${esc(t('hud.resize'))}">` +
      `${ctx.icon('ui:redimensionar')}<b data-live="zoom">${esc(ctx.zoomLabel || '100%')}</b></button>` +
      (ctx.desktop ? `<button class="ferramenta fechar-jogo ${ctx.closeArmed ? 'armado' : ''}" data-action="fechar-jogo" ` +
        `title="${esc(ctx.closeArmed ? t('hud.closeAgain') : t('hud.close'))}">${ctx.icon('ui:fechar')}</button>` : '') +
      `</div></div>`;
  }

  // Vitrine: loja e melhorias encaixadas em cima da festa. Passar o mouse num item mostra a prévia na festa.
  function vitrine(engine, ctx) {
    const s = engine.state;
    const cat = ctx.dockCat || 'melhorias';
    const tabs = DOCK.map(entry => `<button class="vaba ${entry.id === cat ? 'ativa' : ''}" data-action="vitrine-cat" ` +
      `data-cat="${entry.id}">${ctx.icon(entry.icon, 'icone-aba')}<span>${esc(t(`dock.${entry.id}`))}</span></button>`).join('');
    // Em cima, uma linha só com saldo e botões; embaixo, as abas. Nada disso muda de altura com o saldo.
    // Arrastar a vitrine por qualquer parte fora dos botões leva ela para os lados (a dica fica na faixa vermelha).
    const top = `<div class="vitrine-topo" title="${esc(t('shop.drag'))}"><div class="vitrine-saldo">` +
      `<span class="recurso" title="${esc(t('res.cheer'))}">${ctx.icon('ui:animacao')}<b data-live="cheer">${compact(s.cheer)}</b></span>` +
      `<span class="recurso" title="${esc(t('res.tickets'))}">${ctx.icon('ui:fichas')}<b data-live="tickets">${compact(s.tickets)}</b></span>` +
      // Segurar compra várias fichas seguidas (como as melhorias); um clique compra uma.
      costButton('ficha', 'data-hold="ficha"', engine.ticketCost(), 'cheer', t('shop.buyTicket'), ctx.icon('ui:animacao')) +
      `<button class="fechar" data-action="vitrine-fechar" title="${esc(t('shop.close'))}">×</button></div>` +
      `<div class="vabas">${tabs}</div></div>`;
    let body;
    if (cat === 'melhorias') {
      body = engine.data.stats.map(stat => {
        const level = engine.level(stat.id);
        const fmt = value => stat.id === 'refresco' || stat.id === 'ritmo' ? number(value, 2) : number(value);
        return `<div class="vcard melhoria" data-stat="${stat.id}"><div class="vcard-topo">${ctx.icon(`ui:${STAT_ICONS[stat.id]}`)}` +
          `<b>${esc(stat.name)}</b><small data-field="nivel">${esc(t('level.short', { n: level }))}</small></div>` +
          `<p class="miudo"><span data-field="valor">${fmt(engine.statValue(stat.id))} → ${fmt(engine.statValue(stat.id, level + 1))}</span>` +
          ` ${esc(stat.unit)}</p><button class="btn" data-action="melhorar" data-hold="melhorar" data-stat="${stat.id}" ` +
          `data-cost="${engine.levelCost(stat.id)}" data-currency="cheer" title="${esc(t('shop.hold'))}">${esc(t('shop.upgrade'))} ` +
          `<span class="preco">${ctx.icon('ui:animacao')}<b data-field="custo">${compact(engine.levelCost(stat.id))}</b></span></button></div>`;
      }).join('');
    } else if (cat === 'comidas') {
      const mood = engine.mood();
      const full = engine.bellyFull();
      const foods = engine.data.foods || [];
      const status = `<div class="vhumor">${moodBars(engine, mood, ctx.icon, true)}<b data-humor="fator-loja">` +
        `${esc(t('shop.moodNow', { stat: engine.stats.rebolado.name, f: number(engine.moodFactor(mood), 2) }))}</b></div>`;
      // Duas fileiras (as comidas são poucas): cartões mais largos, a grade ocupa a vitrine.
      body = status + `<div class="vgrade duas" style="--colunas:${Math.max(1, Math.ceil(foods.length / 2))}">` + foods.map(food => {
        const cost = engine.foodCost(food.id);
        const state = full ? esc(t('shop.bellyFull'))
          : `<span class="preco" data-cost="${cost}" data-currency="cheer">${ctx.icon('ui:animacao')}${compact(cost)}</span>`;
        return `<div class="vcard item comida ${full ? 'especial' : ''}" role="button" tabindex="0" data-action="vitrine-comida" ` +
          `data-id="${food.id}" title="${esc(food.desc)}"><div class="vcard-img">${ctx.icon(`ui:comida-${food.id}`, 'icone-mini')}</div>` +
          `<b class="nome">${esc(food.name)} <small>${esc(t('shop.foodFill', { n: food.fill }))}</small></b><span class="estado">${state}</span></div>`;
      }).join('') + `</div>`;
    } else if (cat === 'conjuntos') {
      // Os conjuntos: um cartão cada, com o chapéu dele de rosto; clicar veste as três peças (se a pessoa tem todas).
      const sets = engine.data.sets;
      const active = engine.activeSet();
      const rows = sets.length > 12 ? 4 : 3;
      body = `<div class="vgrade ${rows === 4 ? 'quatro' : ''}" style="--colunas:${Math.max(1, Math.ceil(sets.length / rows))}">` +
        sets.map(set => {
          const pieces = [set.hat, set.hand, set.fabric];
          const missing = pieces.filter(piece => !engine.owned(piece)).length;
          const [state, cls] = active?.id === set.id ? [esc(t('shop.inUse')), 'uso']
            : missing ? [esc(t(missing === 1 ? 'shop.setMissingOne' : 'shop.setMissing', { n: missing })), 'especial'] : [esc(t('shop.use')), 'tem'];
          return `<div class="vcard item ${cls}" role="button" tabindex="0" data-action="vitrine-conjunto" data-id="${set.id}" ` +
            `data-preview="set:${set.id}" title="${esc(pieces.map(piece => engine.items[piece]?.name || piece).join(' + '))}">` +
            `<div class="vcard-img">${ctx.icon(`item:${set.hat}`, 'icone-mini')}</div>` +
            `<b class="nome">${esc(set.name)} +${Math.round(set.bonus * 100)}%</b><span class="estado">${state}</span></div>`;
        }).join('') + `</div>`;
    } else {
      const items = engine.data.items.filter(item => item.cat === cat);
      const side = ctx.dockSide || 'esquerda';
      const sides = cat === 'lado' ? `<div class="vlados">${['esquerda', 'direita'].map(name =>
        `<button class="chip ${side === name ? 'ativa' : ''}" data-action="vitrine-lado" data-side="${name}">` +
        `${esc(t(name === 'esquerda' ? 'shop.sideLeft' : 'shop.sideRight'))}</button>`).join('')}</div>` : '';
      // Itens numa grade de 3 fileiras (4 se a categoria crescer), com colunas que dividem a largura: tudo cabe sem rolar.
      const rows = items.length > 12 ? 4 : 3;
      const columns = Math.max(1, Math.ceil(items.length / rows));
      body = sides + `<div class="vgrade ${rows === 4 ? 'quatro' : ''}" style="--colunas:${columns}">` + items.map(item => {
        const owned = engine.owned(item.id);
        const inUse = cat === 'lado' ? s.equipped[side] === item.id : s.equipped[cat] === item.id;
        let state;
        let cls = '';
        if (inUse) { state = esc(t('shop.inUse')); cls = 'uso'; }
        else if (owned) { state = esc(t(cat === 'lado' ? `shop.place.${side}` : 'shop.use')); cls = 'tem'; }
        else if (item.source === 'role') { state = esc(t('shop.onlyOutings')); cls = 'especial'; }
        else if (item.source === 'argolas') { state = esc(t('shop.onlyRings')); cls = 'especial'; }
        else if (item.source === 'casamento') { state = esc(t('shop.onlyWedding')); cls = 'especial'; }
        else if (item.source === 'leilao') { state = esc(t('shop.onlyAuction')); cls = 'especial'; }
        else if (item.source === 'cobra') { state = esc(t('shop.onlySnake')); cls = 'especial'; }
        else if (engine.itemLocked(item.id)) { state = `🔒 ${esc(engine.data.tiers[item.tier].name)}`; cls = 'especial'; }
        else state = `<span class="preco" data-cost="${item.price}" data-currency="tickets">${ctx.icon('ui:fichas')}${item.price}</span>`;
        return `<div class="vcard item ${cls}" role="button" tabindex="0" data-action="vitrine-item" data-id="${item.id}" ` +
          `data-preview="${item.id}" title="${esc(item.name)}"><div class="vcard-img">${ctx.icon(`item:${item.id}`, 'icone-mini')}</div>` +
          `<b class="nome">${esc(item.name)}</b><span class="estado">${state}</span></div>`;
      }).join('') + `</div>`;
    }
    const hint = cat === 'comidas'
      ? t('shop.hintFoods', { stat: engine.stats.rebolado.name, high: number(engine.cfg.moodHigh, 2), low: number(engine.cfg.moodLow, 2) })
      : t(cat === 'melhorias' ? 'shop.hintUpgrades' : cat === 'conjuntos' ? 'shop.hintSets' : 'shop.hintItems');
    return top + `<div class="vitrine-corpo">${body}</div><div class="vitrine-detalhe" id="vitrine-detalhe">${esc(hint)}</div>`;
  }

  // Área de texto da janela das Argolas da Sorte.
  function argolas(engine, ctx) {
    const s = engine.state;
    const throws = engine.ringThrows();
    const exclusives = engine.data.items.filter(item => item.source === 'argolas');
    if (ctx.ringPlaying) {
      return `<p>${t('rings.howTo')}</p><p class="miudo">${esc(t('rings.howTo2', { n: throws }))}</p>`;
    }
    let html = '';
    const r = ctx.ringResult;
    if (r) {
      const won = [];
      if (r.tickets) won.push(`${ctx.icon('ui:fichas')} ${esc(t('gain.tickets', { n: compact(r.tickets) }))}`);
      if (r.cheer) {
        won.push(`${ctx.icon('ui:animacao')} ${esc(r.cheerTimes > 1 ? t('gain.cheerTimes', { n: compact(r.cheer), f: r.cheerTimes })
          : t('gain.cheer', { n: compact(r.cheer) }))}`);
      }
      if (r.wood) won.push(`${ctx.icon('ui:lenha')} ${esc(t('gain.wood', { n: compact(r.wood) }))}`);
      for (const item of r.items) won.push(`${ctx.icon(`item:${item.id}`)} ${esc(item.name)}!`);
      html += `<div class="cartao resultado ${r.hits ? 'ganhou' : 'perdeu'}"><b>${esc(t('rings.hits', { hits: r.hits, total: r.total }))}` +
        `${r.mult > 1 ? esc(t('rings.allTimes', { mult: r.mult })) : ''}</b>` +
        (won.length ? `<div class="premios">${won.map(w => `<span>${w}</span>`).join('')}</div>`
          : `<p>${esc(t(r.mult > 1 ? 'rings.noPrize' : 'rings.miss'))}</p>`) +
        `</div>`;
    }
    const cost = engine.ringCost();
    const cheaper = s.rings.nextAt && cost > engine.cfg.ringCost;
    html += `<div class="cartao preco-rodada"><b>${t('rings.round', { n: cost, icon: ctx.icon('ui:fichas') })}</b>` +
      (cheaper ? `<span>${t('rings.dropsTo', { n: cost / 2, time: until(s.rings.nextAt, ctx.now) })}</span>`
        : `<span>${esc(t('rings.minimum'))}</span>`) + `</div>` +
      `<p class="miudo">${esc(t('rings.rules', { time: duration(engine.ringCooldown()), n: throws,
        pacoca: engine.charActive('pacoca') ? t('rings.rulesPacoca') : '',
        booth: engine.isPlaced('barraca-argolas') ? t('rings.rulesBooth') : '' }))}</p>` +
      `<div class="botoes"><button class="btn grande" data-action="argolas-jogar" data-cost="${cost}" ` +
      `data-currency="tickets">${esc(t('rings.play'))} · <span class="preco">${ctx.icon('ui:fichas')}${cost}</span></button>` +
      `<span class="recurso">${esc(t('rings.youHave'))} ${ctx.icon('ui:fichas')}<b data-live="tickets">${compact(s.tickets)}</b></span></div>` +
      `<div class="exclusivos">${exclusives.map(item => `<span class="${engine.owned(item.id) ? 'tem' : ''}" ` +
        `title="${esc(item.name)}">${ctx.icon(`item:${item.id}`)}</span>`).join('')}</div>`;
    return html;
  }

  function tabs(engine, ctx) {
    return TABS.map(tab => {
      const locked = tabLocked(tab, engine);
      return `<button class="aba ${ctx.tab === tab.id ? 'ativa' : ''} ${locked ? 'trancada' : ''}" data-action="tab" ` +
        `data-tab="${tab.id}">${ctx.icon(`ui:${tab.icon}`)}<span>${esc(tabName(tab.id))}</span>${locked ? '<i>🔒</i>' : ''}</button>`;
    }).join('');
  }

  // O tamanho da Mandioca: o nome do tamanho, a barra até o próximo e o que falta.
  function growthBlock(engine, growth) {
    const name = t(`growth.stage.${growth.stage}`);
    const first = engine.cfg.growthAt[growth.stage - 1] ?? 4;
    const body = growth.last
      ? `<p class="miudo">${esc(t('growth.max'))}</p>`
      : bar(growth.total - first, growth.goal - first, 'fama') +
        `<p class="miudo">${esc(t('growth.next', { n: growth.goal - growth.total, total: growth.total, goal: growth.goal }))}</p>`;
    const golden = engine.goldenHost() ? `<p class="miudo">✨ ${esc(t('growth.golden'))}</p>` : '';
    return `<div class="rotulo">${esc(t('growth.title'))}: <b>${esc(engine.goldenHost() ? t('growth.goldenName') : name)}</b></div>${body}${golden}`;
  }

  function festa(engine, ctx) {
    const s = engine.state;
    const tier = engine.tierIndex();
    const next = engine.nextTier();
    const b = s.bonfire;
    const growth = engine.growthInfo();
    const pieces = [
      [t('party.guests'), `+${percent(engine.cfg.sizeBonus * s.size)}`],
      [t('party.collection'), `+${percent(engine.collection())}`],
      [t('party.partner'), engine.effect('cheer') ? `+${percent(engine.effect('cheer'))}` : '—'],
      [t('party.heat'), b.calor ? `+${percent(engine.cfg.heatPerLevel * b.calor)}` : '—'],
      [t('party.growth'), growth.bonus ? `+${percent(growth.bonus)}` : '—'],
      [t('party.dances'), engine.danceBonus() ? `+${percent(engine.danceBonus())}` : '—'],
      [t('party.set'), engine.activeSet() ? `+${percent(engine.setBonus())}` : '—'],
      [t('party.tradition'), engine.tradition() ? `+${percent(engine.tradition())}` : '—'],
      [t('party.trio'), engine.trioBonus() ? `+${percent(engine.trioBonus())}` : '—'],
      [t('party.legendary'), engine.legendary() ? '×2' : '—']
    ];
    const rest = engine.maxStamina() / engine.recovery();
    return header(s.name, esc(t('party.subtitle', { tier: engine.tier().name, n: s.size }))) +
      `<div class="grade2"><div class="cartao"><div class="rotulo">${esc(t('party.tier'))}</div>` +
      `<h3>${esc(engine.tier().name)}</h3>${bar(s.fame, engine.fameNeed(), 'fama')}` +
      `<p>${t('party.fame', { fame: `<b data-live="fame">${compact(s.fame)}</b>`, need: compact(engine.fameNeed()) })}</p>` +
      (next ? `<p class="miudo">${t('party.nextTier', { n: next.size, tier: esc(next.name), unlocks: esc(next.unlocks) })}</p>`
        : `<p class="miudo">${esc(t('party.biggest'))}</p>` +
          `<p class="miudo">${esc(t('year.offer', { v: Math.round(engine.cfg.yearBonus * 100) }))}</p>` +
          `<div class="botoes"><button class="btn" data-action="ano-novo">${esc(t('year.button'))}</button></div>`) +
      (s.year > 1 ? `<p class="miudo">${esc(t('year.current', { n: s.year, v: Math.round(engine.tradition() * 100) }))}</p>` : '') +
      (s.records?.maior !== null && s.records?.maior !== undefined ? `<p class="miudo">${esc(t('records.maior', { time: duration(s.records.maior * 1000),
        size: s.records.size }))}</p>` : '') +
      `</div><div class="cartao"><div class="rotulo">${esc(t('party.host'))}</div>` +
      `<label class="campo">${esc(t('party.name'))}<input id="nome" maxlength="24" value="${esc(s.name)}"></label>` +
      `<p class="miudo">${esc(t('party.panelHint'))}</p>` + growthBlock(engine, growth) +
      `<div class="botoes"><button class="btn claro" data-action="foto">${ctx.icon('ui:foto')} ${esc(t('party.photo'))}</button>` +
      `<button class="btn claro" data-action="retrato">${ctx.icon('ui:foto')} ${esc(t('party.portrait'))}</button></div></div></div>` +
      `<div class="cartao"><div class="rotulo">${esc(t('party.yield'))}</div><div class="numeros">` +
      [[t('party.perStep'), compact(engine.stepValue())], [t('party.stepsPerSecond'), number(engine.speed(), 2)],
        [t('party.stamina'), t('party.staminaValue', { n: number(engine.maxStamina(), 0) })], [t('party.rest'), `${number(rest, 1)} s`],
        [t('party.perSecond'), compact(engine.cheerPerSecond())],
        [t('party.offline'), t('party.offlineValue', { v: Math.round(engine.offlineRate() * 100), h: engine.cfg.offlineCapHours })]]
        .map(([label, value]) => `<div><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join('') +
      `</div><p class="miudo">${esc(t('party.offlineHint', { v: Math.round(engine.offlineRate() * 100), h: engine.cfg.offlineCapHours }))}</p>` +
      `<div class="rotulo">${esc(t('party.multipliers'))}</div><div class="numeros">` +
      pieces.map(([label, value]) => `<div><span>${esc(label)}</span><b>${value}</b></div>`).join('') + `</div></div>` +
      repertoire(engine) + scenery(engine) +
      (tier === 0 ? `<div class="dica">${t('party.tip')}</div>` : '');
  }

  // Repertório: os passos de dança já aprendidos e o que falta para cada um dos outros.
  function repertoire(engine) {
    const steps = engine.state.stats.steps;
    const learned = engine.learnedDances().length;
    const chips = engine.data.dances.map(dance => steps >= dance.at
      ? `<span class="selo verde">${esc(dance.name)}</span>`
      : `<span class="selo" title="${esc(t('dances.locked', { n: number(dance.at) }))}">🔒 ${esc(t('dances.unlockAt', { n: number(dance.at) }))}</span>`).join(' ');
    return `<div class="cartao"><div class="rotulo">${esc(t('dances.title'))} · ${esc(t('dances.count', { n: learned, total: engine.data.dances.length }))}</div>` +
      `<p class="miudo">${esc(t('dances.hint', { v: percent(engine.cfg.danceBonus), n: engine.cfg.danceSteps }))}</p><div class="selos">${chips}</div></div>`;
  }

  // Cenário: o que os convidados já trouxeram para a festa e o próximo marco.
  function scenery(engine) {
    const size = engine.state.size;
    const got = engine.scenery();
    const marks = engine.data.scenery.landmarks;
    const next = marks.find(mark => mark.size > size);
    const counts = engine.data.scenery.cycle.map(entry => [entry.name, number(got.counts[entry.id] || 0)]);
    return `<div class="cartao"><div class="rotulo">${esc(t('scenery.title'))}</div>` +
      `<p class="miudo">${esc(t('scenery.hint'))}</p><div class="numeros">` +
      [[t('scenery.landmarks'), t('count.of', { n: got.landmarks.length, total: marks.length })], ...counts]
        .map(([label, value]) => `<div><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join('') + `</div>` +
      (next ? `<p class="miudo">${t('scenery.next', { name: esc(next.name), n: next.size })}</p>` : '') + `</div>`;
  }

  function charStatus(engine, char, now) {
    const post = engine.data.posts[char.post];
    const away = engine.awayOuting(char.id);
    if (away >= 0) {
      const endsAt = engine.state.outings[away].endsAt;
      return `<span class="selo azul">${t('crew.away', { time: `<span data-until="${endsAt}">${duration(endsAt - now)}</span>` })}</span>`;
    }
    if (engine.charActive(char.id)) return `<span class="selo verde">${esc(t('crew.working', { post: post.name }))}</span>`;
    if (post.item) return `<span class="selo">${esc(t('crew.needs', { item: engine.items[post.item].name }))}</span>`;
    return `<span class="selo">${esc(t('crew.opensAt', { tier: engine.data.tiers[post.tier].name }))}</span>`;
  }

  function turma(engine, ctx) {
    if (tabLocked(tabOf('turma'), engine)) return header(tabName('turma'), '') + lockNote(engine, 1);
    const owned = engine.data.chars.filter(char => engine.hasChar(char.id)).length;
    return header(tabName('turma'), esc(t('crew.subtitle')),
      `<span class="selo">${esc(t('crew.count', { n: owned, total: engine.data.chars.length }))}</span>`) +
      `<p class="miudo">${esc(t(engine.trioComplete() ? 'crew.trioOn' : 'crew.trioOff', { v: Math.round(engine.cfg.trioBonus * 100) }))}</p>` +
      `<div class="grade-itens">${engine.data.chars.map(char => {
        if (!engine.hasChar(char.id)) {
          return `<div class="cartao item misterio"><div class="mostruario">?</div><h4>???</h4>` +
            `<p class="miudo">${esc(t('crew.mystery', { rarity: engine.data.rarities[char.rarity].name }))}</p></div>`;
        }
        const level = engine.charLevel(char.id);
        return `<div class="cartao item tem"><div class="mostruario">${ctx.icon(`char:${char.id}`, 'item')}</div>` +
          `<h4>${esc(char.name)} <small>${esc(t('level.short', { n: level }))}</small></h4><p class="papel">${esc(char.role)}</p>` +
          `<p class="miudo">${esc(engine.effectText(char.id))}</p>${charStatus(engine, char, ctx.now)}` +
          `<p class="miudo raridade r${char.rarity}">${esc(engine.data.rarities[char.rarity].name)}</p></div>`;
      }).join('')}</div>`;
  }

  function pescaria(engine, ctx) {
    if (tabLocked(tabOf('pescaria'), engine)) return header(tabName('pescaria'), '') + lockNote(engine, 1);
    const f = engine.state.fishing;
    const cap = engine.cfg.prizeCap;
    const odds = engine.data.rarities.map(r => `${r.name} ${percent(r.chance)}`).join(' · ');
    return header(tabName('pescaria'), esc(t('fish.subtitle'))) +
      `<div class="cartao pesca"><div class="prendas">${Array.from({ length: cap }, (_, i) =>
        `<div class="prenda ${i < f.ready ? 'cheia' : ''}">${i < f.ready ? ctx.icon('ui:pescaria', 'grande') : ''}</div>`).join('')}</div>` +
      `<div class="botoes"><button class="btn grande" data-action="pescar"${f.ready ? '' : ' disabled'}>${esc(t('fish.fish'))}</button></div>` +
      `<p>${f.ready >= cap ? esc(t('fish.full')) : t('fish.next', { time: until(f.nextAt, ctx.now) })}</p>` +
      `<p class="miudo">${esc(t('fish.odds', { odds, max: engine.cfg.maxLevel }))}` +
      `${engine.charActive('cachorro') ? esc(t('fish.hotDog')) : ''}</p></div>`;
  }

  function roles(engine, ctx) {
    if (tabLocked(tabOf('roles'), engine)) return header(tabName('roles'), '') + lockNote(engine, 2);
    const free = engine.availableForOuting();
    return header(tabName('roles'), esc(t('outing.subtitle')),
      `<span class="selo">${ctx.icon('ui:lenha')} ${t('outing.wood', { n: `<b data-live="wood">${compact(engine.state.wood)}</b>` })}</span>`) +
      `<div class="lista">${engine.data.outings.map((outing, index) => {
        const entry = engine.state.outings[index];
        const state = engine.outingState(index);
        const open = engine.outingOpen(index);
        let body;
        if (!open) body = lockNote(engine, outing.tier);
        else if (state === 'livre') {
          body = free.length ? `<div class="botoes"><select class="campo" data-role="${index}">${free.map(char =>
            `<option value="${char.id}">${esc(t('outing.option', { name: char.name, n: engine.outingWood(index, char.id) }))}</option>`).join('')}</select>` +
            `<button class="btn" data-action="role-enviar" data-index="${index}">${esc(t('outing.send'))}</button></div>`
            : `<p class="miudo">${esc(t('outing.nobody'))}</p>`;
        } else if (state === 'fora') {
          const total = outing.minutes * 60000;
          body = `<p>${t('outing.back', { name: esc(engine.chars[entry.char].name), time: until(entry.endsAt, ctx.now) })}</p>` +
            bar(total - (entry.endsAt - ctx.now), total) +
            `<div class="botoes"><button class="btn claro" data-action="role-cancelar" data-index="${index}">${esc(t('outing.recall'))}</button></div>`;
        } else {
          body = `<p>${esc(t('outing.returned', { name: engine.chars[entry.char].name }))}</p><div class="botoes">` +
            `<button class="btn verde" data-action="role-resgatar" data-index="${index}">${esc(t('outing.claim'))}</button></div>`;
        }
        const prize = outing.item ? t('outing.prize', { chance: percent(outing.chance), item: engine.items[outing.item].name }) : '';
        return `<div class="cartao"><div class="linha">${ctx.icon('ui:role', 'grande')}<div><h3>${esc(outing.name)}</h3>` +
          // Com alguém no rolê, a lenha que essa pessoa traz de verdade (a raridade dela multiplica a lenha do rolê).
          `<p class="miudo">${esc(t('outing.info', { time: duration(outing.minutes * 60000),
            n: entry.char && engine.chars[entry.char] ? engine.outingWood(index, entry.char) : outing.wood, prize }))}</p></div></div>${body}</div>`;
      }).join('')}</div>`;
  }

  function fogueira(engine, ctx) {
    if (tabLocked(tabOf('fogueira'), engine)) return header(tabName('fogueira'), '') + lockNote(engine, 2);
    const total = engine.bonfireTotal();
    const goal = engine.cfg.legendary;
    return header(tabName('fogueira'), esc(t('fire.subtitle', { n: goal })),
      `<span class="selo">${ctx.icon('ui:lenha')} ${t('outing.wood', { n: `<b data-live="wood">${compact(engine.state.wood)}</b>` })}</span>`) +
      `<div class="cartao"><div class="rotulo">${esc(t('fire.goal'))}</div>${bar(Math.min(total, goal), goal, 'fogo')}` +
      `<p>${esc(engine.legendary() ? t('fire.legendary') : t('fire.progress', { n: total, total: goal }))}</p></div>` +
      `<div class="grade3">${engine.data.bonfire.map(entry => {
        const level = engine.state.bonfire[entry.id];
        const value = Math.round(engine.bonfireValue(entry.id, level + 1) * 100);
        return `<div class="cartao">${ctx.icon(`ui:${BONFIRE_ICONS[entry.id]}`, 'grande')}<h3>${esc(entry.name)} ` +
          `<small>${esc(t('level.long', { n: level }))}</small></h3><p class="miudo">${esc(entry.text.replace('{v}', value))}</p><div class="botoes">` +
          costButton('fogueira', `data-id="${entry.id}"`, engine.bonfireCost(), 'wood', t('shop.upgrade'), ctx.icon('ui:lenha')) +
          `</div></div>`;
      }).join('')}</div>` + (engine.charActive('faisca') ? `<p class="miudo">${esc(t('fire.spark'))}</p>` : '');
  }

  function cozinha(engine, ctx) {
    const s = engine.state;
    const wood = `<span class="selo">${ctx.icon('ui:lenha')} ${t('outing.wood', { n: `<b data-live="wood">${compact(s.wood)}</b>` })}</span>`;
    if (tabLocked(tabOf('cozinha'), engine)) return header(tabName('cozinha'), '') + lockNote(engine, engine.cfg.cookTier);
    if (!engine.isPlaced('fogao-lenha')) return header(tabName('cozinha'), esc(t('cook.subtitle'))) + `<p>${esc(t('cook.needStove'))}</p>`;
    const pot = s.cozinha.pot;
    const dish = id => engine.recipe(id)?.name || id;
    let status;
    if (pot && pot.ready) {
      status = `<div class="linha">${ctx.icon(`ui:prato-${pot.id}`, 'grande')}<p><b>${esc(t('cook.ready', { dish: dish(pot.id) }))}</b></p></div>` +
        `<div class="botoes"><button class="btn verde grande" data-action="servir">${esc(t('cook.serve'))}</button></div>`;
    } else if (pot) {
      const total = engine.cookTime(engine.recipe(pot.id));
      status = `<div class="linha">${ctx.icon(`ui:prato-${pot.id}`, 'grande')}<p>${t('cook.cooking', { dish: esc(dish(pot.id)), time: until(pot.readyAt, ctx.now) })}</p></div>` +
        bar(total - (pot.readyAt - ctx.now), total, 'fogo');
    } else status = `<p>${esc(t('cook.empty'))}</p>`;
    const served = engine.cookBonus() > 0 ? `<p class="miudo">${t('cook.active', { dish: esc(dish(s.cozinha.buff.id)),
      v: Math.round(engine.cookBonus() * 100), time: until(s.cozinha.buff.until, ctx.now) })}</p>` : '';
    return header(tabName('cozinha'), esc(t('cook.subtitle')), wood) +
      `<div class="cartao">${status}${served}</div>` +
      `<div class="grade3">${engine.data.recipes.map(recipe => `<div class="cartao">${ctx.icon(`ui:prato-${recipe.id}`, 'grande')}` +
        `<h3>${esc(recipe.name)}</h3><p class="miudo">${esc(recipe.desc)}</p>` +
        `<p class="miudo">${esc(t('cook.info', { v: Math.round(recipe.bonus * 100), buff: roundTime(recipe.buffMinutes * 60000),
          time: roundTime(engine.cookTime(recipe)) }))}</p><div class="botoes">` +
        (pot ? `<button class="btn claro" disabled>${esc(t('cook.busy'))}</button>`
          : costButton('cozinhar', `data-id="${recipe.id}"`, recipe.wood, 'wood', t('cook.cook'), ctx.icon('ui:lenha'))) +
        `</div></div>`).join('')}</div>` +
      `<p class="miudo">${esc(t('cook.replace'))}${engine.charActive('canjica') ? ` ${esc(t('cook.canjica'))}` : ''}</p>` +
      `<p class="miudo">${esc(t('cook.stats', { n: s.stats.dishes }))}</p>`;
  }

  function correio(engine, ctx) {
    const mail = engine.state.mail;
    const letter = ctx.lastLetter;
    return header(t('mail.title'), esc(t('mail.subtitle'))) +
      `<div class="cartao pesca"><div class="prendas">${Array.from({ length: engine.cfg.letterCap }, (_, i) =>
        `<div class="prenda ${i < mail.ready ? 'cheia' : ''}">${i < mail.ready ? ctx.icon('ui:carta', 'grande') : ''}</div>`).join('')}</div>` +
      `<div class="botoes"><button class="btn grande" data-action="carta"${mail.ready ? '' : ' disabled'}>${esc(t('mail.open'))}</button></div>` +
      `<p>${mail.ready >= engine.cfg.letterCap ? esc(t('mail.full')) : t('mail.next', { time: until(mail.nextAt, ctx.now) })}</p></div>` +
      (letter ? `<div class="cartao bilhete"><p>${esc(t('quote', { text: letter.text }))}</p>` +
        `<p class="miudo">${esc(t('gain.tickets', { n: letter.tickets }))}</p></div>` : '') +
      `<p class="miudo">${esc(t('mail.opened', { n: engine.state.stats.letters }))}</p>`;
  }

  // Metas da festa: 3 cartões com a barra de cada uma; a cumprida ganha o botão de resgatar. Os números e as barras
  // andam sozinhos com o jogo (data-meta, ver refreshLive em app.js).
  function metas(engine) {
    const cards = engine.state.goals.map((goal, index) => {
      const value = engine.goalProgress(goal);
      const ready = value >= goal.target;
      const reward = t('goals.reward', { tickets: goal.reward.tickets }) +
        (goal.reward.wood ? ` + ${t('goals.wood', { wood: goal.reward.wood })}` : '');
      return `<div class="cartao meta ${ready ? 'feita' : ''}" data-meta="${index}"><div class="linha"><div><h3>${esc(t(`goal.${goal.type}`, { n: goal.target }))}</h3>` +
        `${bar(value, goal.target, 'fama')}` +
        `<p class="miudo"><b data-meta-n>${number(value)}/${number(goal.target)}</b> · ${esc(reward)}</p></div>` +
        `<div class="botoes">` + (ready ? '' : `<button class="btn claro trocar" data-action="meta-trocar" data-index="${index}" ` +
        `title="${esc(t('goals.swapTitle', { n: engine.cfg.goalSwapCost }))}">↻ ${esc(t('goals.swap'))}</button>`) +
        `<button class="btn ${ready ? '' : 'claro'}" data-action="meta-resgatar" data-index="${index}"${ready ? '' : ' disabled'}>` +
        `${esc(t('goals.claim'))}</button></div></div></div>`;
    }).join('');
    return `<div class="rotulo">${esc(t('goals.title'))}</div><p class="miudo">${esc(t('goals.hint'))}</p><div class="lista">${cards}</div>`;
  }

  // Barrinha de quanto já foi (só nas conquistas de contar que ainda faltam).
  function progress(engine, id) {
    const entry = engine.achievementProgress(id);
    if (!entry || entry[0] <= 0) return '';
    return `<div class="progresso">${bar(entry[0], entry[1], 'fama')}<small>${compact(entry[0])}/${compact(entry[1])}</small></div>`;
  }

  // Álbum da Festa (tela própria, botão na placa): uma página por tema, cinco figurinhas cada. A que falta aparece com
  // "?" e o nome, para dar vontade.
  function album(engine, ctx) {
    const have = new Set(engine.state.album || []);
    const pages = engine.data.album || [];
    const full = engine.albumPages();
    return header(tabName('album'), esc(t('album.hint', { v: Math.round(engine.cfg.albumBonus * 100), n: engine.cfg.albumTickets,
      pages: full, total: pages.length })), `<span class="selo">${esc(t('count.of', { n: have.size, total: pages.reduce((sum, page) => sum + page.stickers.length, 0) }))}</span>`) +
      `<div class="album">${pages.map(page => {
        const got = page.stickers.filter(sticker => have.has(sticker.id)).length;
        const done = got === page.stickers.length;
        return `<div class="cartao pagina ${done ? 'feita' : ''}"><div class="linha"><h3>${esc(page.name)}</h3>` +
          `<span class="selo ${done ? 'verde' : ''}">${got}/${page.stickers.length}</span></div><div class="figurinhas">` +
          page.stickers.map(sticker => have.has(sticker.id)
            ? `<div class="figurinha" title="${esc(sticker.name)}">${ctx.icon(sticker.icon)}<span>${esc(sticker.name)}</span></div>`
            : `<div class="figurinha vazia" title="${esc(t('album.missing'))}"><b>?</b><span>${esc(sticker.name)}</span></div>`).join('') +
          `</div></div>`;
      }).join('')}</div>`;
  }

  function conquistas(engine, ctx) {
    const done = engine.state.achievements;
    return header(tabName('conquistas'), esc(t('count.of', { n: done.length, total: engine.data.achievements.length }))) +
      metas(engine) + `<div class="rotulo">${esc(t('goals.achievements'))}</div>` +
      `<div class="lista">${engine.data.achievements.map(a =>
        `<div class="cartao conquista ${done.includes(a.id) ? 'feita' : ''}"><div class="linha">` +
        `${ctx.icon('ui:conquista', 'grande')}<div><h3>${esc(a.name)}</h3><p class="miudo">${esc(a.text)}</p>` +
        (done.includes(a.id) ? '' : progress(engine, a.id)) + `</div>` +
        `<span class="selo ${done.includes(a.id) ? 'verde' : ''}">${esc(t(done.includes(a.id) ? 'ach.done' : 'ach.todo'))}</span></div></div>`).join('')}</div>`;
  }

  // Idioma: "Automático" segue a Steam (ou o sistema, fora da Steam); fora da lista, inglês.
  function languageCard(ctx) {
    const lang = ctx.language || {};
    const choice = lang.choice || 'auto';
    const auto = I18N.LANGUAGES.find(entry => entry.id === lang.auto)?.name || 'English';
    const chips = [['auto', t('settings.languageAuto', { lang: auto })], ...I18N.LANGUAGES.map(entry => [entry.id, entry.name])]
      .map(([id, label]) => `<button class="chip ${choice === id ? 'ativa' : ''}" data-action="idioma" data-value="${id}">` +
        `${esc(label)}</button>`).join('');
    const steam = ctx.steam;
    return `<div class="rotulo">🌐 ${esc(t('settings.language'))}</div><div class="chips">${chips}</div>` +
      `<p class="miudo">${esc(t(steam?.on ? 'settings.languageSteam' : 'settings.languageSystem'))}</p>` +
      (ctx.desktop ? `<div class="rotulo">Steam</div><p class="miudo">${steam?.on
        ? t('settings.steamOn', { name: esc(steam.name || '') }) : esc(t('settings.steamOff'))}</p>` : '');
  }

  // Som: liga e desliga os efeitos e escolhe o volume (a barra fica apagada com o som desligado).
  function soundCard(st) {
    const on = st.sound !== false;
    const volume = Math.round(100 * (Number.isFinite(st.volume) ? st.volume : 0.5));
    return `<div class="rotulo">🔊 ${esc(t('settings.sound'))}</div><div class="chips">` +
      [[true, 'settings.soundOn'], [false, 'settings.soundOff']].map(([value, key]) =>
        `<button class="chip ${on === value ? 'ativa' : ''}" data-action="som" data-value="${value ? 'on' : 'off'}">` +
        `${esc(t(key))}</button>`).join('') + `</div>` +
      `<label class="volume ${on ? '' : 'apagado'}">${esc(t('settings.volume'))}` +
      `<input type="range" id="volume" min="0" max="100" step="5" value="${volume}"${on ? '' : ' disabled'}>` +
      `<b id="volume-valor">${volume}%</b></label>` +
      `<p class="miudo">${esc(t('settings.soundHint'))}</p>` +
      `<div class="rotulo">🎵 ${esc(t('settings.music'))}</div><div class="chips">` +
      [[true, 'settings.musicOn'], [false, 'settings.musicOff']].map(([value, key]) =>
        `<button class="chip ${(st.music === true) === value ? 'ativa' : ''}" data-action="musica" data-value="${value ? 'on' : 'off'}">` +
        `${esc(t(key))}</button>`).join('') + `</div><p class="miudo">${esc(t('settings.musicHint'))}</p>`;
  }

  // Desempenho: quantos quadros por segundo a festa desenha (menos quadros, menos uso do computador).
  function perfCard(st) {
    const mode = st.perf || 'suave';
    return `<div class="rotulo">⚙ ${esc(t('settings.perf'))}</div><div class="chips">` +
      ['suave', 'normal', 'economia'].map(id => `<button class="chip ${mode === id ? 'ativa' : ''}" data-action="perf" data-value="${id}">` +
        `${esc(t(`settings.perf.${id}`))}</button>`).join('') + `</div><p class="miudo">${esc(t('settings.perfHint'))}</p>` +
      `<div class="rotulo">⚡ ${esc(t('settings.flash'))}</div><div class="chips">` +
      [[true, 'settings.flashOn'], [false, 'settings.flashOff']].map(([value, key]) =>
        `<button class="chip ${(st.flash !== false) === value ? 'ativa' : ''}" data-action="flash" data-value="${value ? 'on' : 'off'}">` +
        `${esc(t(key))}</button>`).join('') + `</div><p class="miudo">${esc(t('settings.flashHint'))}</p>` +
      `<div class="rotulo">✎ ${esc(t('settings.calm'))}</div><div class="chips">` +
      [[false, 'settings.calmOff'], [true, 'settings.calmOn']].map(([value, key]) =>
        `<button class="chip ${(st.calm === true) === value ? 'ativa' : ''}" data-action="calmo" data-value="${value ? 'on' : 'off'}">` +
        `${esc(t(key))}</button>`).join('') + `</div><p class="miudo">${esc(t('settings.calmHint'))}</p>`;
  }

  function ajustes(engine, ctx) {
    const s = engine.state;
    const st = ctx.settings || {};
    const stats = [
      [t('stats.playtime'), duration(s.stats.playtime * 1000)], [t('stats.steps'), number(s.stats.steps)],
      [t('stats.cheerEarned'), compact(s.stats.cheerEarned)], [t('stats.cheerSpent'), compact(s.stats.cheerSpent)],
      [t('stats.fished'), number(s.stats.fished)], [t('stats.outings'), number(s.stats.outings)],
      [t('stats.requests'), number(s.stats.requests)], [t('stats.crashers'), number(s.stats.crashers)],
      [t('stats.ringRounds'), number(s.stats.ringRounds)], [t('stats.ringHits'), number(s.stats.ringHits)],
      [t('stats.pokes'), number(s.stats.pokes)], [t('stats.balloons'), number(s.stats.balloons)],
      [t('stats.rainbows'), number(s.stats.rainbows)], [t('stats.goals'), number(s.stats.goals)],
      [t('stats.weddings'), number(s.stats.weddings)], [t('stats.potes'), number(s.stats.potes)],
      [t('stats.sacos'), `${number(s.stats.sacoWins)}/${number(s.stats.sacoRaces)}`], [t('stats.leiloes'), number(s.stats.leiloes)], [t('stats.quentao'), number(s.stats.quentao)], [t('stats.visitors'), number(s.stats.visitors)], [t('stats.cobras'), number(s.stats.cobras)], [t('stats.fotos'), number(s.stats.fotos)], [t('stats.burros'), `${number(s.stats.burroMoscas)}/${number(s.stats.burros)}`], [t('stats.fantasias'), `${number(s.stats.fantasiaWins)}/${number(s.stats.fantasias)}`], [t('stats.compadres'), number(s.stats.compadres)], [t('stats.dishes'), number(s.stats.dishes)], [t('stats.foods'), number(s.stats.foods)],
      [t('stats.bingos'), number(s.stats.bingos)], [t('stats.contests'), `${number(s.stats.contestWins)}/${number(s.stats.contests)}`]
    ];
    const zoom = Math.round((st.zoom || 1) * 100);
    const scale = ZOOMS.map(value => `<button class="chip ${Math.abs(zoom - value) < 3 ? 'ativa' : ''}" data-action="zoom" ` +
      `data-value="${value / 100}">${value}%</button>`).join('');
    // O idioma vem primeiro: quem abriu o jogo num idioma que não lê precisa achar isso sem procurar.
    return header(tabName('ajustes'), '') +
      `<div class="grade2"><div class="cartao">${languageCard(ctx)}<div class="rotulo">${esc(t('settings.size'))}</div>` +
      `<div class="chips">${scale}</div>` +
      `<p class="miudo">${esc(t('settings.sizeHint'))}</p>` + soundCard(st) + perfCard(st) +
      (ctx.desktop ? `<div class="rotulo">${esc(t('settings.window'))}</div><div class="botoes">` +
        `<button class="btn ${st.pinned ? 'verde' : 'claro'}" data-action="fixar">${esc(t(st.pinned ? 'settings.pinned' : 'settings.behind'))}</button>` +
        `<button class="btn claro" data-action="esconder">${esc(t('settings.hide'))}</button>` +
        `<button class="btn vermelho" data-action="sair">${esc(t('settings.quit'))}</button></div>` +
        `<div class="rotulo">🚀 ${esc(t('settings.startup'))}</div><div class="chips">` +
        [[true, 'settings.startupOn'], [false, 'settings.startupOff']].map(([value, key]) =>
          `<button class="chip ${(st.startup === true) === value ? 'ativa' : ''}" data-action="inicio" data-value="${value ? 'on' : 'off'}">` +
          `${esc(t(key))}</button>`).join('') + `</div><p class="miudo">${esc(t('settings.startupHint'))}</p>` : '') +
      `<div class="rotulo">${esc(t('settings.sign'))}</div><div class="chips">` +
      ['sempre', 'passar'].map(mode => `<button class="chip ${st.hud === mode ? 'ativa' : ''}" data-action="placa" ` +
        `data-value="${mode}">${esc(t(mode === 'sempre' ? 'settings.signAlways' : 'settings.signHover'))}</button>`).join('') +
      `</div><p class="miudo">${esc(t('settings.signHint'))}</p>` +
      (st.placa ? `<div class="botoes"><button class="btn claro" data-action="placa-auto">${esc(t('settings.signAuto'))}</button></div>` : '') +
      `</div><div class="cartao"><div class="rotulo">${esc(t('settings.numbers'))}</div><div class="numeros">` +
      stats.map(([label, value]) => `<div><span>${esc(label)}</span><b>${value}</b></div>`).join('') + `</div></div></div>` +
      `<div class="cartao"><div class="rotulo">${esc(t('settings.game'))}</div><p class="miudo">${esc(t('settings.saveHint'))}</p>` +
      `<div class="botoes"><button class="btn claro" data-action="exportar">${esc(t('settings.export'))}</button>` +
      `<button class="btn claro" data-action="importar">${esc(t('settings.import'))}</button>` +
      `<button class="btn vermelho" data-action="reiniciar">${esc(t('settings.restart'))}</button></div></div>` +
      `<p class="miudo creditos">${esc(t('settings.credits'))}</p>`;
  }


  // --- Histórico: diário da festa e gráfico dos desbloqueios pelo tempo de jogo --------------------------
  const MARCOS = {
    porte: { color: '#ee2f3c' },
    cenario: { color: '#35a03a' },
    turma: { color: '#3a6cf0' },
    item: { color: '#9d5cf0' },
    conquista: { color: '#ffd21e' }
  };
  const TIME_TICKS = [[60, '1min'], [300, '5min'], [900, '15min'], [3600, '1h'], [3 * 3600, '3h'], [10 * 3600, '10h'],
    [30 * 3600, '30h'], [100 * 3600, '100h'], [300 * 3600, '300h']];

  // Qual desbloqueio a linha do diário representa (ou null, se for um acontecimento comum).
  function unlockKind(engine, entry) {
    if (['tier', 'fishing-open', 'legendary', 'grow', 'learn', 'year'].includes(entry.type)) return 'porte';
    if (entry.type === 'size') return engine.sceneryPiece(entry.size)?.landmark ? 'cenario' : null;
    if (entry.type === 'fished') return entry.isNew ? 'turma' : null;
    if (entry.type === 'item') return 'item';
    if (entry.type === 'achievement') return 'conquista';
    return null;
  }

  // Texto de um atalho do modo de teste, montado de novo no idioma atual a partir da operação.
  function debugText(engine, entry) {
    const n = entry.value;
    if (entry.op === 'porte') {
      const tier = engine.data.tiers[n] || null;
      return tier ? t('log.tier', { tier: tier.name }) : entry.note || entry.op;
    }
    if (entry.op === 'tempo') return t('debug.time', { n: Math.round(n / 60) });
    if (entry.op === 'animacao' && entry.amount) return t('gain.cheer', { n: entry.amount });
    return I18N.has(`debug.${entry.op}`) || I18N.has(`debug.${entry.op}`, I18N.FALLBACK)
      ? t(`debug.${entry.op}`, { n }) : entry.note || entry.op;
  }

  function logText(engine, entry) {
    const d = engine.data;
    const named = (list, id) => list.find(item => item.id === id)?.name || id;
    const char = engine.chars[entry.id]?.name || entry.id;
    switch (entry.type) {
      case 'comeco': return t('log.start');
      case 'inicio': return t('log.begin', { n: entry.size });
      case 'size': {
        const piece = engine.sceneryPiece(entry.size);
        return piece ? t('log.guestBrought', { n: entry.size, piece: piece.name }) : t('log.guest', { n: entry.size });
      }
      case 'tier': return t('log.tier', { tier: d.tiers[entry.tier]?.name || '' });
      case 'achievement': return t('log.achievement', { name: named(d.achievements, entry.id) });
      case 'fished': return entry.isNew ? t('log.fishedNew', { name: char }) : t('log.fishedAgain', { name: char, n: entry.level });
      case 'item': return t('log.item', { name: engine.items[entry.id]?.name || entry.id });
      case 'level': return t('log.level', { stat: engine.stats[entry.key]?.name || entry.key, from: entry.from, to: entry.level });
      case 'ticket': return t('log.ticket', { n: entry.count || 1 });
      case 'rings': return t('log.rings', { hits: entry.hits, total: entry.total }) +
        (entry.mult > 1 ? t('log.ringsMult', { mult: entry.mult }) : '');
      case 'request': return t('log.request');
      case 'crasher': return t('log.crasher', { n: entry.tickets });
      case 'letter': return t('log.letter', { n: entry.tickets });
      case 'outing': return t('log.outing', { name: char, n: entry.wood });
      case 'bonfire': return t('log.bonfire', { name: named(d.bonfire, entry.id), n: entry.level });
      case 'legendary': return t('log.legendary');
      case 'goal': return t('log.goal', { tickets: entry.tickets });
      case 'rainbow': return t('log.rainbow', { n: Math.round(entry.amount || 0), tickets: entry.tickets });
      case 'daily': return t('log.daily', { n: entry.tickets, streak: entry.streak });
      case 'contest': return t('log.contest', { place: entry.place, avg: number(entry.average, 1), tickets: entry.tickets });
      case 'year': return t('log.year', { n: entry.year, v: Math.round((entry.bonus || 0) * 100) });
      case 'bingo': return t('log.bingo', { draws: entry.draws, tickets: entry.tickets, n: Math.round(entry.amount || 0) });
      case 'bingo-lost': return t('log.bingoLost', { draws: entry.draws });
      case 'pote': return t('log.pote', { n: Math.round(entry.amount || 0), tickets: entry.tickets });
      case 'visitor': return t('log.visitor', { tickets: entry.tickets });
      case 'cobra': return t('log.cobra', { n: compact(entry.amount || 0) });
      case 'foto': return t('log.foto', { tickets: entry.tickets });
      case 'carro-boi': return t('log.cartWood', { n: entry.wood || 0 });
      case 'bandeirinha': return t('log.flag');
      case 'compadres': return t('log.compadres', { n: compact(entry.amount || 0) });
      case 'cozinha': return t('log.cozinha', { dish: engine.recipe?.(entry.id)?.name || entry.id });
      case 'comida': return t('log.comida', { food: engine.food?.(entry.id)?.name || entry.id, n: entry.count || 1 });
      case 'fantasia': return t(`log.fantasia.${[1, 2, 3].includes(entry.place) ? entry.place : 3}`, { tickets: entry.tickets || 0 });
      case 'burro': return t(`log.burro.${['mosca', 'perto', 'longe'].includes(entry.grade) ? entry.grade : 'fora'}`,
        { n: compact(entry.amount || 0), tickets: entry.tickets || 0 });
      case 'leilao': return entry.item ? t('log.leilao', { item: engine.items[entry.item]?.name || entry.item, price: entry.price })
        : t('log.leilaoCheer', { n: Math.round(entry.amount || 0), price: entry.price });
      case 'saco': return t(`log.saco.${entry.place}`, { n: Math.round(entry.amount || 0), tickets: entry.tickets, s: number(entry.seconds || 0, 1) });
      case 'wedding': return t('log.wedding', { rice: entry.rice, n: Math.round(entry.amount || 0), tickets: entry.tickets });
      case 'balloon': return t(`log.balloon.${entry.kind}`, { n: Math.round(entry.amount || 0), mult: entry.mult, s: entry.seconds });
      case 'grow': return t('log.grow', { stage: t(`growth.stage.${entry.stage}`) });
      case 'learn': return t('log.learn', { name: named(d.dances, entry.id) });
      case 'fishing-open': return t('log.fishingOpen');
      case 'debug': return t('log.debug', { note: debugText(engine, entry) });
      default: return entry.type;
    }
  }

  const clock = seconds => duration(seconds * 1000);

  // Gráfico: convidados ao longo do tempo de jogo (escada) e cada desbloqueio marcado em cima da curva.
  // O tempo é logarítmico, para os primeiros minutos (cheios de novidade) não sumirem perto das horas seguintes.
  function chart(engine) {
    const log = engine.state.log;
    const total = Math.max(60, engine.state.stats.playtime);
    const start = log.find(entry => entry.type === 'inicio');
    const points = [[start ? start.t : 0, start ? start.size : 1]];
    for (const entry of log) {
      if (entry.type === 'size') points.push([entry.t, entry.size]);
      else if (entry.type === 'year') points.push([entry.t, 1]);
    }
    const top = Math.max(2, engine.state.size, ...points.map(p => p[1]));
    const [L, R, T, B] = [44, 630, 22, 214];
    const fx = t => L + (R - L) * Math.log1p(Math.max(0, t) / 60) / Math.log1p(total / 60);
    const fy = size => B - (B - T) * (size - 1) / (top - 1);
    const sizeAt = t => { let size = points[0][1]; for (const [pt, ps] of points) if (pt <= t) size = ps; return size; };
    const f = value => Math.round(value * 10) / 10;
    let path = `M${f(fx(points[0][0]))},${f(fy(points[0][1]))}`;
    for (const [time, size] of points.slice(1)) path += `H${f(fx(time))}V${f(fy(size))}`;
    path += `H${f(fx(total))}`;
    const area = `${path}V${B}H${f(fx(points[0][0]))}Z`;
    const ticks = [[0, '0'], ...TIME_TICKS.filter(([time]) => time <= total)];
    const yTicks = [...new Set([1, Math.round((top + 1) / 2), top])];
    let svg = `<svg class="grafico" viewBox="0 0 640 252" role="img" aria-label="${esc(t('history.chartLabel'))}">` +
      `<path class="area" d="${area}"/>` +
      ticks.map(([time, label]) => `<line class="eixo" x1="${f(fx(time))}" y1="${T}" x2="${f(fx(time))}" y2="${B}"/>` +
        `<text class="rotulo-eixo" x="${f(fx(time))}" y="${B + 16}" text-anchor="middle">${label}</text>`).join('') +
      yTicks.map(size => `<line class="eixo" x1="${L}" y1="${f(fy(size))}" x2="${R}" y2="${f(fy(size))}"/>` +
        `<text class="rotulo-eixo" x="${L - 6}" y="${f(fy(size)) + 4}" text-anchor="end">${size}</text>`).join('') +
      `<text class="rotulo-eixo" x="${L - 36}" y="${T - 8}">${esc(t('history.axisGuests'))}</text>` +
      `<text class="rotulo-eixo" x="${R}" y="${B + 30}" text-anchor="end">${esc(t('history.axisTime'))}</text>`;
    log.filter(entry => entry.type === 'tier').forEach((entry, index) => {
      const x = f(fx(entry.t));
      const id = engine.data.tiers[entry.tier]?.id || '';
      svg += `<line class="porte-linha" x1="${x}" y1="${T}" x2="${x}" y2="${B}"/>` +
        `<text class="rotulo-porte" x="${x + 3}" y="${T + 10 + (index % 2) * 11}">${esc(t(`tierShort.${id}`))}</text>`;
    });
    svg += `<path class="curva" d="${path}"/>`;
    const stacks = new Map();
    for (const entry of log) {
      const kind = unlockKind(engine, entry);
      if (!kind) continue;
      const x = f(fx(entry.t));
      const slot = Math.round(x / 5);
      const level = stacks.get(slot) || 0;
      stacks.set(slot, level + 1);
      const y = f(Math.max(T + 4, fy(sizeAt(entry.t)) - level * 9));
      svg += `<circle class="marco ${entry.offline || entry.test ? 'fora' : ''}" cx="${x}" cy="${y}" r="4.5" ` +
        `fill="${MARCOS[kind].color}"><title>${esc(clock(entry.t))} · ${esc(logText(engine, entry))}` +
        `${entry.test ? ` ${esc(t('history.test'))}` : ''}</title></circle>`;
    }
    return svg + `</svg>`;
  }

  function historico(engine, ctx) {
    const log = engine.state.log;
    const filter = ctx.logFilter === 'tudo' ? 'tudo' : 'desbloqueios';
    const counts = {};
    for (const entry of log) {
      const kind = unlockKind(engine, entry);
      if (kind) counts[kind] = (counts[kind] || 0) + 1;
    }
    const shown = log.filter(entry => filter === 'tudo' || unlockKind(engine, entry) || ['comeco', 'inicio'].includes(entry.type));
    const rows = shown.slice(-300).reverse().map(entry => {
      const kind = unlockKind(engine, entry);
      return `<li class="${kind ? 'desbloqueio' : ''}"><span class="quando">${esc(clock(entry.t))}</span>` +
        `<i style="background:${kind ? MARCOS[kind].color : 'transparent'}"></i>` +
        `<span>${esc(logText(engine, entry))}${entry.offline ? ` <small>${esc(t('history.offline'))}</small>` : ''}` +
        `${entry.test ? ` <small>${esc(t('history.test'))}</small>` : ''}</span></li>`;
    }).join('');
    return header(tabName('historico'), esc(t('history.subtitle', { time: clock(engine.state.stats.playtime), n: log.length }))) +
      `<div class="cartao">${chart(engine)}<div class="legenda">` +
      Object.entries(MARCOS).map(([id, mark]) => `<span><i style="background:${mark.color}"></i>${esc(t(`history.kind.${id}`))} ` +
        `<b>${counts[id] || 0}</b></span>`).join('') + `</div>` +
      `<p class="miudo">${esc(t('history.hint'))}</p></div>` +
      `<div class="cartao"><div class="linha-diario"><div class="rotulo">${esc(t('history.diary'))}</div><div class="chips">` +
      [['desbloqueios', t('history.onlyUnlocks')], ['tudo', t('history.all')]].map(([id, label]) => `<button class="chip ` +
        `${filter === id ? 'ativa' : ''}" data-action="historico-filtro" data-value="${id}">${esc(label)}</button>`).join('') +
      `</div></div><ol class="diario">${rows}</ol>` +
      (shown.length > 300 ? `<p class="miudo">${esc(t('history.showing'))}</p>` : '') + `</div>`;
  }

  const RENDER = { festa, historico, conquistas, ajustes };
  // Modo de teste: atalhos para dar recursos e avançar o tempo (só aparece com config.debugMenu).
  function teste(engine) {
    const button = (op, value, label) => `<button class="btn claro" data-action="debug" data-op="${op}" data-value="${value}">` +
      `${esc(label)}</button>`;
    const group = (title, buttons, note = '') => `<div class="cartao"><div class="rotulo">${esc(title)}</div>` +
      `<div class="botoes">${buttons.join('')}</div>${note ? `<p class="miudo">${esc(note)}</p>` : ''}</div>`;
    const rate = engine.cheerPerSecond();
    return header(t('tab.teste'), esc(t('debug.subtitle'))) +
      group(t('res.cheer'), [button('animacao', 60, t('debug.plusMinutes', { n: 1 })), button('animacao', 600, t('debug.plusMinutes', { n: 10 })),
        button('animacao', 3600, t('debug.plusHours', { n: 1 })), button('animacao', 86400, t('debug.plusDays', { n: 1 }))],
      t('debug.cheerNote', { rate: rate < 10 ? number(rate, 1) : compact(rate) })) +
      group(t('debug.ticketsWood'), [button('fichas', 10, t('gain.tickets', { n: 10 })), button('fichas', 100, t('gain.tickets', { n: 100 })),
        button('lenha', 50, t('gain.wood', { n: 50 })), button('lenha', 500, t('gain.wood', { n: 500 }))]) +
      group(t('party.guests'), [button('convidados', 1, '+1'), button('convidados', 5, '+5'), button('convidados', 25, '+25'),
        button('porte', 0, t('debug.nextTier'))], t('debug.guestsNote')) +
      group(t('debug.timeTitle'), [button('tempo', 600, t('debug.skipMinutes', { n: 10 })), button('tempo', 3600, t('debug.skipHours', { n: 1 })),
        button('tempo', 8 * 3600, t('debug.skipHours', { n: 8 }))], t('debug.timeNote')) +
      group(t('debug.crewBooths'), [button('prendas', 0, t('debug.prendas')), button('cartas', 0, t('debug.cartas')),
        button('roles', 0, t('debug.roles')), button('turma', 0, t('debug.turma')), button('itens', 0, t('debug.itens'))]) +
      group(t('debug.atParty'), [button('pedido', 0, t('debug.callRequest')), button('penetra', 0, t('debug.callCrasher')),
        button('balao', 0, t('debug.callBalloon')), button('chuva', 0, t('debug.callRain')), button('metas', 0, t('debug.doneGoals')), button('quadrilha', 0, t('debug.callQuadrilha')), button('casamento', 0, t('debug.callWedding')), button('pote', 0, t('debug.callPote')), button('saco', 0, t('debug.callSaco')), button('leilao', 0, t('debug.callLeilao')), button('aviso', 0, t('debug.callAnnounce')), button('frio', 0, t('debug.callCold')), button('sanfoneiro', 0, t('debug.callVisitor')), button('cobra', 0, t('debug.callSnake')), button('fotografo', 0, t('debug.callPhotographer')), button('burro', 0, t('debug.callBurro')), button('fantasia', 0, t('debug.callFantasia')), button('cozinha', 0, t('debug.callCook')), button('feliz', 0, t('debug.feliz')), button('triste', 0, t('debug.triste')), button('bingo', 0, t('debug.callBingo')), button('concurso', 0, t('debug.callContest')),
        button('argolas', 0, t('debug.cheapRings'))]);
  }

  // Bingo da quermesse: a cartela (o meio é livre, as casas sorteadas ganham um grão de milho), os últimos números e a compra.
  function bingo(engine, ctx) {
    if (tabLocked(tabOf('bingo'), engine)) return header(tabName('bingo'), '') + lockNote(engine, 1);
    const s = engine.state;
    const round = s.bingo.round;
    const cost = engine.bingoCost();
    const playing = round && !round.result;
    let body = '';
    if (round) {
      const marks = engine.bingoMarks(round);
      const last = round.drawn.at(-1);
      body += `<div class="cartao bingo"><div class="bingo-cartela">` + round.card.map((n, i) =>
        `<div class="bingo-casa ${marks.marked[i] ? 'marcada' : ''} ${n && n === last ? 'nova' : ''}">${n ? n : '★'}</div>`).join('') +
        `</div><div class="bingo-lado"><div class="rotulo">${esc(t('bingo.last'))}</div>` +
        `<div class="bingo-bola">${last ?? '–'}</div>` +
        `<p class="miudo">${esc(t('bingo.recent', { list: round.drawn.slice(-6, -1).reverse().join(' · ') || '–' }))}</p>` +
        `<p class="miudo">${esc(t('bingo.count', { n: round.drawn.length, max: engine.cfg.bingoMax, marked: marks.count }))}</p></div></div>`;
      if (round.result === 'bingo') {
        body += `<div class="cartao bilhete"><p><b>${esc(t('bingo.won'))}</b> ${esc(t('bingo.prize', { tickets: round.prize?.tickets ?? 0,
          n: compact(round.prize?.amount ?? 0) }))}</p></div>`;
      } else if (round.result === 'rival') {
        body += `<div class="cartao bilhete"><p>${esc(t('bingo.lost'))}</p></div>`;
      } else if (round.line) body += `<p class="miudo">${esc(t('bingo.lineDone'))}</p>`;
    }
    return header(t('tab.bingo'), esc(t('bingo.subtitle', { s: number(engine.cfg.bingoEvery, 1) }))) + body +
      `<div class="botoes">` + (playing ? `<button class="btn" disabled>${esc(t('bingo.playing'))}</button>`
        : costButton('bingo-comprar', '', cost, 'tickets', t(round ? 'bingo.again' : 'bingo.buy'), ctx.icon('ui:fichas'))) + `</div>` +
      `<p class="miudo">${esc(t('bingo.rules', { line: Math.ceil(cost / 2), prize: cost * engine.cfg.bingoPrize }))}</p>` +
      `<p class="miudo">${esc(t('bingo.stats', { cards: s.stats.bingoCards, wins: s.stats.bingos }))}</p>`;
  }

  const RENDER_TELA = { turma, pescaria, roles, fogueira, correio, bingo, cozinha, album, teste };
  const telaName = id => (id === 'teste' || id === 'album' || TELAS.some(entry => entry.id === id) ? tabName(id) : '');

  function panel(engine, ctx) {
    const tab = RENDER[ctx.tab] ? ctx.tab : 'festa';
    return RENDER[tab](engine, ctx);
  }

  // Corpo da janela de uma tela de jogo (turma, pescaria, rolês, fogueira, correio).
  function tela(engine, ctx) {
    const id = RENDER_TELA[ctx.tela] ? ctx.tela : 'correio';
    return RENDER_TELA[id](engine, ctx);
  }

  return { TABS, TELAS, DOCK, hud, moodTitle, tabs, panel, tela, telaName, vitrine, argolas, compact, duration, percent, number, esc,
    logText, debugText, t };
});
