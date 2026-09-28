// Português (Brasil): o idioma original do jogo. Os nomes e textos do conteúdo (itens, turma, cartas) ficam em
// src/data.js; aqui ficam só os textos da interface. {nome} é trocado pelo valor; {one, other} escolhe pelo número n.
(function (root) {
  const dict = {
    ui: {
      'tab.festa': 'Festa', 'tab.historico': 'Histórico', 'tab.conquistas': 'Conquistas', 'tab.ajustes': 'Ajustes',
      'tab.turma': 'Turma', 'tab.pescaria': 'Pescaria', 'tab.roles': 'Rolês', 'tab.fogueira': 'Fogueira',
      'tab.correio': 'Correio elegante', 'tab.teste': 'Modo de teste',
      'dock.melhorias': 'Melhorias', 'dock.chapeu': 'Chapéus', 'dock.mao': 'Na mão', 'dock.tecido': 'Tecidos',
      'dock.terreiro': 'Terreiros', 'dock.lado': 'Barracas',

      'num.thousand': '{n} mil', 'num.million': '{n} mi', 'num.billion': '{n} bi', 'num.trillion': '{n} tri',
      'count.of': '{n} de {total}',
      'level.short': 'nív. {n}', 'level.long': 'nível {n}',
      'quote': '“{text}”',

      'res.cheer': 'Animação', 'res.tickets': 'Fichas', 'res.wood': 'Lenha',
      'gain.tickets': '+{n} fichas', 'gain.cheer': '+{n} de Animação', 'gain.cheerTimes': '+{n} de Animação (×{f})', 'gain.wood': '+{n} lenha',
      'lock.note': '🔒 Libera quando a festa virar <b>{tier}</b> ({size} convidados). Agora: {now}.',

      'hud.nextTitle': 'Cada convidado novo põe uma peça no cenário',
      'hud.next': 'Próximo convidado traz: <b>{piece}</b>',
      'hud.shop': 'Loja e melhorias',
      'hud.panel': 'Painel: números da festa, conquistas e ajustes',
      'hud.test': 'Modo de teste: dar recursos e avançar o tempo',
      'hud.resize': 'Tamanho: arraste para aumentar ou diminuir o jogo, clique para voltar a 100%',
      'hud.close': 'Fechar o jogo', 'hud.closeAgain': 'Clique de novo para fechar',

      'shop.buyTicket': '+1 ficha', 'shop.close': 'Fechar a vitrine', 'shop.hold': 'Segure para comprar vários',
      'shop.upgrade': 'Melhorar', 'shop.sideLeft': '◀ Esquerdo', 'shop.sideRight': 'Direito ▶',
      'shop.inUse': 'Em uso', 'shop.use': 'Usar', 'shop.place.esquerda': 'Pôr à esquerda', 'shop.place.direita': 'Pôr à direita',
      'shop.onlyOutings': 'Só em rolês', 'shop.onlyRings': 'Só nas Argolas',
      'shop.hintUpgrades': 'Segure o botão para comprar vários níveis de uma vez.',
      'shop.hintItems': 'Passe o mouse num item para ver na festa. Clique para comprar e usar.',

      'rings.title': 'Argolas da Sorte',
      'rings.howTo': 'Clique na barraca ou aperte <b>espaço</b> para soltar a argola em cima de uma garrafa.',
      'rings.howTo2': 'A argola acelera a cada jogada. Garrafa fina é fácil; boca larga pede mira certeira. {n} argolas nesta rodada.',
      'rings.hits': '{hits} de {total} argolas encaixadas', 'rings.allTimes': ' · tudo ×{mult}',
      'rings.noPrize': 'Acertou o multiplicador, mas faltou prêmio pra multiplicar.',
      'rings.miss': 'Nenhuma encaixou. Tenta de novo!',
      'rings.round': { one: 'Rodada: {icon}{n} ficha', other: 'Rodada: {icon}{n} fichas' },
      'rings.dropsTo': 'Cai para {n} em {time}', 'rings.minimum': 'Preço mínimo',
      'rings.rules': 'Cada rodada dobra o preço da próxima. A cada {time} sem jogar, o preço cai pela metade{pacoca}. ' +
        'Cada rodada dá {n} argolas{booth}. Garrafas de Animação multiplicam a Animação que você tem (×2 ou ×3); garrafas ×2 e ×3 multiplicam tudo o que a rodada render. O presente é um item ' +
        'que só sai aqui. Quanto melhor o prêmio, mais larga a boca da garrafa, e a argola tem que cair mais certinha.',
      'rings.rulesPacoca': ' (a Paçoca apressa a espera)', 'rings.rulesBooth': ' (a Barraca das Argolas dá uma a mais)',
      'rings.play': 'Jogar', 'rings.youHave': 'Você tem',
      'rings.canvas': 'Barraca das argolas: clique para soltar a argola',

      'party.guests': 'Convidados', 'party.collection': 'Coleção da loja', 'party.partner': 'Par da quadrilha',
      'party.heat': 'Calor da fogueira', 'party.legendary': 'Fogueira lendária',
      'party.subtitle': { one: '{tier} · {n} convidado', other: '{tier} · {n} convidados' },
      'party.tier': 'Porte do arraiá',
      'party.fame': 'Fama para o próximo convidado: {fame} / {need}. Toda Animação que a festa junta vira fama, aos ' +
        'pouquinhos. Gastar não tira fama.',
      'party.nextTier': 'Com <b>{n}</b> convidados a festa vira <b>{tier}</b>: {unlocks}',
      'party.biggest': 'Este é o maior São João do mundo. A festa ainda cresce: cada convidado rende mais.',
      'party.host': 'Anfitriã', 'party.name': 'Nome',
      'party.panelHint': 'Os botões da placa abrem a loja, as Argolas e cada parte da festa (turma, pescaria, rolês, ' +
        'fogueira, correio). Este painel guarda os números, as conquistas e os ajustes.',
      'party.photo': 'Foto da festa', 'party.yield': 'Como a festa rende',
      'party.perStep': 'Animação por passo', 'party.stepsPerSecond': 'Passos por segundo', 'party.stamina': 'Fôlego',
      'party.staminaValue': '{n} passos', 'party.rest': 'Descanso', 'party.perSecond': 'Média por segundo',
      'party.multipliers': 'Multiplicadores',
      'party.tip': 'Dica: abra a <b>vitrine</b> (a etiqueta na placa) e melhore o <b>Rebolado</b> e o <b>Ritmo</b>. ' +
        'A festa rende mais, e toda Animação que ela junta vira fama, que traz convidados.',

      'scenery.title': 'Cenário', 'scenery.hint': 'Cada convidado novo põe uma peça na festa: um marco ou um enfeite.',
      'scenery.landmarks': 'Marcos', 'scenery.next': 'Próximo marco: <b>{name}</b>, com {n} convidados.',

      'crew.subtitle': 'Cada personagem tem um papel. No posto certo, ele muda a festa.',
      'crew.count': '{n}/{total} na turma', 'crew.mystery': '{rarity} · aparece na pescaria',
      'crew.away': 'Em rolê · {time}', 'crew.working': 'Trabalhando: {post}',
      'crew.needs': 'Precisa da {item} num dos lados', 'crew.opensAt': 'O posto abre quando a festa virar {tier}',

      'fish.subtitle': 'A cada pouco uma prenda cai no tanque. Pesque para chamar alguém da turma.',
      'fish.fish': 'Pescar!', 'fish.full': 'O tanque está cheio. Pesque para a próxima prenda cair.',
      'fish.next': 'Próxima prenda em {time}.',
      'fish.odds': 'Chances por raridade: {odds}. Repetido sobe o nível do personagem (até {max}).',
      'fish.hotDog': ' O Cachorro-Quente está pescando: prendas mais rápidas.',
      'fish.newMember': '{name} entrou na turma!', 'fish.again': '{name} de novo! Subiu para o nível {n}.',
      'fish.maxLevel': 'Já está no nível máximo: +{n} fichas.', 'fish.working': 'Já está trabalhando na festa.',
      'fish.postClosed': 'O posto ainda não abriu. Veja na Turma.', 'fish.ok': 'Oba!',

      'outing.subtitle': 'Mande alguém da turma buscar lenha. Quem sai deixa o posto vazio até voltar.',
      'outing.wood': '{n} lenha', 'outing.option': '{name} · {n} lenha', 'outing.send': 'Enviar',
      'outing.nobody': 'Ninguém livre. A turma vem da pescaria.', 'outing.back': '{name} volta em {time}',
      'outing.recall': 'Chamar de volta', 'outing.returned': '{name} voltou!', 'outing.claim': 'Pegar a lenha',
      'outing.prize': ' · {chance} de chance de {item}', 'outing.info': '{time} · {n} lenha (mais com raros){prize}',

      'fire.subtitle': 'Lenha dos rolês alimenta a fogueira. Com {n} melhorias ela vira lendária.',
      'fire.goal': 'Rumo à fogueira lendária', 'fire.legendary': 'A fogueira é lendária: toda Animação em dobro.',
      'fire.progress': '{n} de {total} melhorias.', 'fire.spark': 'A Faísca cuida do fogo: a Labareda dura mais.',

      'mail.title': 'Correio Elegante', 'mail.subtitle': 'Recadinhos anônimos da festa. Cada carta traz fichas.',
      'mail.open': 'Abrir carta', 'mail.full': 'A caixinha está cheia.', 'mail.next': 'Próxima carta em {time}.',
      'mail.opened': 'Cartas abertas: {n}.', 'mail.ok': 'Que fofo',

      'ach.done': 'Feita', 'ach.todo': 'A fazer',

      'settings.size': 'Tamanho do jogo', 'settings.sizeHint': 'Ou arraste o botão de tamanho na placa da festa (um clique volta a 100%).',
      'settings.sound': 'Som', 'settings.soundOn': 'Ligado', 'settings.soundOff': 'Desligado', 'settings.volume': 'Volume',
      'settings.soundHint': 'Efeitos da festa: compras, argolas, pescaria, convidados novos e conquistas.',
      'settings.window': 'Janela', 'settings.pinned': 'Fixada sobre as janelas', 'settings.behind': 'Atrás das janelas',
      'settings.hide': 'Esconder a festa', 'settings.quit': 'Sair do jogo',
      'settings.sign': 'Placa de recursos', 'settings.signAlways': 'Sempre visível', 'settings.signHover': 'Só com o mouse em cima',
      'settings.signHint': 'Arraste a placa pelo fundo para pôr onde quiser. Arrastar a festa leva tudo junto. Ao clicar ' +
        'fora do jogo a placa some; clique na festa para ela voltar.',
      'settings.signAuto': 'Grudar a placa na festa',
      'settings.language': 'Idioma', 'settings.languageAuto': 'Automático ({lang})',
      'settings.languageSteam': 'No automático, o jogo usa o idioma escolhido para ele na Steam.',
      'settings.languageSystem': 'No automático, o jogo usa o idioma do computador.',
      'settings.steamOn': 'Conectado como <b>{name}</b>. As conquistas vão para a sua conta.',
      'settings.steamOff': 'Steam desligada: o jogo funciona normal, mas as conquistas ficam só aqui.',
      'settings.numbers': 'Números da festa', 'settings.game': 'Partida',
      'settings.saveHint': 'O jogo salva sozinho. Exporte para guardar uma cópia.',
      'settings.export': 'Exportar save', 'settings.import': 'Importar save', 'settings.restart': 'Começar outra festa',
      'settings.credits': 'Cuide bem da sua mandioca. Fonte Fredoka (SIL Open Font License).',

      'stats.playtime': 'Tempo de festa', 'stats.steps': 'Passos dançados', 'stats.cheerEarned': 'Animação na festa toda',
      'stats.cheerSpent': 'Animação gasta', 'stats.fished': 'Prendas pescadas', 'stats.outings': 'Rolês',
      'stats.requests': 'Pedidos atendidos', 'stats.crashers': 'Penetras expulsos', 'stats.ringRounds': 'Rodadas nas Argolas',
      'stats.ringHits': 'Argolas encaixadas',

      'history.chartLabel': 'Convidados e desbloqueios pelo tempo de jogo',
      'history.axisGuests': 'convidados', 'history.axisTime': 'tempo de jogo',
      'history.test': '(teste)', 'history.offline': '(com o jogo fechado)',
      'history.subtitle': '{time} de festa · {n} acontecimentos no diário',
      'history.kind.porte': 'Porte da festa', 'history.kind.cenario': 'Cenário', 'history.kind.turma': 'Turma nova',
      'history.kind.item': 'Itens', 'history.kind.conquista': 'Conquistas',
      'history.hint': 'A linha é a lotação da festa; cada bolinha é um desbloqueio no momento em que aconteceu. Passe o ' +
        'mouse numa bolinha para ver o que foi.',
      'history.diary': 'Diário', 'history.onlyUnlocks': 'Só desbloqueios', 'history.all': 'Tudo',
      'history.showing': 'Mostrando os 300 mais recentes.',
      'tierShort.quintal': 'Quintal', 'tierShort.quermesse': 'Quermesse', 'tierShort.cidade': 'Cidade',
      'tierShort.regional': 'Regional', 'tierShort.maior': 'Maior',

      'log.start': 'A festa começou', 'log.begin': 'O diário começou aqui (a festa já tinha {n} convidados)',
      'log.guest': '{n}º convidado chegou', 'log.guestBrought': '{n}º convidado chegou e trouxe: {piece}',
      'log.tier': 'A festa virou {tier}', 'log.achievement': 'Conquista: {name}',
      'log.fishedNew': 'Pescou {name} para a turma', 'log.fishedAgain': 'Pescou {name} de novo (nível {n})',
      'log.item': 'Ganhou {name}', 'log.level': '{stat}: nível {from} → {to}',
      'log.ticket': { one: 'Trocou Animação por 1 ficha', other: 'Trocou Animação por {n} fichas' },
      'log.rings': 'Argolas: {hits} de {total} encaixadas', 'log.ringsMult': ', tudo ×{mult}',
      'log.request': 'Atendeu um pedido de convidado', 'log.crasher': 'Pôs um penetra pra correr (+{n} fichas)',
      'log.letter': 'Abriu um correio elegante (+{n} fichas)', 'log.outing': '{name} voltou do rolê com {n} de lenha',
      'log.bonfire': 'Fogueira: {name}, nível {n}', 'log.legendary': 'A fogueira ficou lendária',
      'log.fishingOpen': 'A pescaria abriu', 'log.debug': 'Teste: {note}',

      'debug.subtitle': 'Atalhos para testar o jogo. Tudo o que sai daqui fica marcado como teste no Histórico.',
      'debug.plusMinutes': '+{n} min', 'debug.plusHours': { one: '+{n} hora', other: '+{n} horas' },
      'debug.plusDays': { one: '+{n} dia', other: '+{n} dias' },
      'debug.cheerNote': 'Quanto a festa rende no tempo escolhido (agora: {rate}/s). Vai direto para o saldo, sem virar fama.',
      'debug.ticketsWood': 'Fichas e lenha', 'debug.nextTier': 'Próximo porte',
      'debug.guestsNote': 'Cada convidado traz a peça de cenário dele, como no jogo normal.',
      'debug.timeTitle': 'Tempo', 'debug.skipMinutes': 'Avançar {n} min',
      'debug.skipHours': { one: 'Avançar {n} hora', other: 'Avançar {n} horas' },
      'debug.timeNote': 'A festa roda de verdade nesse tempo: dança, rende, e os relógios (pescaria, cartas, rolês, ' +
        'pedidos, preço das Argolas) andam junto. Não compra nada sozinha.',
      'debug.crewBooths': 'Turma e barracas', 'debug.atParty': 'Na festa',
      'debug.callRequest': 'Chamar um pedido', 'debug.callCrasher': 'Chamar um penetra', 'debug.cheapRings': 'Argolas a 1 ficha',
      'debug.animacao': 'Animação extra', 'debug.fichas': '+{n} fichas', 'debug.lenha': '+{n} de lenha',
      'debug.convidados': '+{n} convidados', 'debug.time': 'Passou {n} min de festa',
      'debug.prendas': 'Prendas prontas', 'debug.cartas': 'Cartas prontas', 'debug.roles': 'Rolês prontos',
      'debug.turma': 'Turma completa', 'debug.itens': 'Todos os itens', 'debug.pedido': 'Chegou um pedido',
      'debug.penetra': 'Chegou um penetra', 'debug.argolas': 'Argolas no preço mínimo',

      'app.title': 'Cuide bem da sua mandioca',
      'app.canvas': 'A festa junina da Mandioca', 'app.shopLabel': 'Vitrine de compras', 'app.panelLabel': 'Painel da festa',
      'app.windowLabel': 'Janela da festa', 'app.tabsLabel': 'Abas', 'app.closeEsc': 'Fechar (Esc)',
      'app.saveFailedHere': 'Não consegui salvar a festa neste computador.', 'app.saveFailed': 'Não consegui salvar a festa.',
      'app.onlyOutings': '{item} só aparece em rolês.', 'app.onlyRings': '{item} só sai nas Argolas da Sorte.',
      'app.unlocksAt': 'Libera quando a festa virar {tier}.', 'app.needTickets': 'Faltam fichas: {item} custa {n}.',
      'app.yours': '{item} é seu!', 'app.needCheer': 'Falta Animação.', 'app.levels': '+{n} níveis!',
      'app.browserClose': 'No navegador, é só fechar a aba.',
      'app.closeAgain': 'Clique no X de novo para fechar. A festa rende metade enquanto estiver fechada.',
      'app.debug': 'Teste: {note}.', 'app.needTicket': 'Falta ficha. Troque Animação por fichas na vitrine.',
      'app.ticket': '+1 ficha.', 'app.outingStart': '{name} saiu para o rolê.', 'app.outingFail': 'Não deu para enviar.',
      'app.recalled': 'Chamou de volta.', 'app.woodGot': '+{n} lenha.', 'app.woodAndItem': '+{n} lenha e {item}!',
      'app.fireGrew': 'A fogueira cresceu.', 'app.needWood': 'Falta lenha.',
      'app.hidden': 'A festa está escondida. Use o ícone da bandeja para voltar.',
      'app.restartConfirm': 'Começar outra festa do zero? Exporte o save antes se quiser guardar esta.',
      'app.requestDone': 'Pedido atendido: +{n} de Animação!', 'app.crasherOut': 'Penetra pra fora! +{n} fichas.',
      'app.tierUp': 'A festa virou {tier}! {unlocks}', 'app.achievement': 'Conquista: {name}',
      'app.fishingOpen': 'A pescaria abriu! Tem uma prenda esperando.', 'app.prizeReady': 'Caiu uma prenda na pescaria.',
      'app.letterReady': 'Chegou um correio elegante.', 'app.outingDone': '{name} voltou do rolê.', 'app.someone': 'Alguém',
      'app.crasher': 'Chegou um penetra! Clique nele.', 'app.legendary': 'A fogueira ficou lendária! Animação em dobro.',
      'app.ringsReset': 'As Argolas da Sorte voltaram ao preço mínimo.',
      'app.importConfirm': 'Trocar a festa atual pela do arquivo?', 'app.imported': 'Festa importada.',
      'app.importFailed': 'Não deu para importar: o arquivo não é um save válido deste jogo.',
      'app.saveIgnored': 'Save ignorado: o arquivo estava corrompido ou é de outra versão.',
      'app.welcomeBack': 'A festa continuou sem você!',
      'app.welcomeBackText': 'Em {time} fora, a turma rendeu <b>{n}</b> de Animação.', 'app.welcomeBackOk': 'Bora dançar',
      'app.firstRun': '<p>A Mandioca dança sozinha: cada passo rende <b>Animação</b>. Quando cansa, ela descansa e volta ' +
        'com tudo.</p><p>O botão da <b>loja</b> na placa abre as melhorias, os chapéus, barracas e mais, com prévia na hora. ' +
        'Toda Animação que a festa junta vira fama, e fama traz convidados.</p><p class="miudo">Arraste o terreiro para ' +
        'mudar a festa de lugar. Segure a alça da placa para mudar o tamanho. Tem uma carta esperando no Correio.</p>',
      'app.firstRunOk': 'Bora pro arraiá!',
      'app.languageChanged': 'Idioma trocado.',

      'fx.cobra': 'OLHA A COBRA!', 'fx.phew': 'UFA!', 'fx.ember': 'BRASA VIVA!', 'fx.flare': 'LABAREDA!',
      'fx.guests': { one: '+{n} CONVIDADO', other: '+{n} CONVIDADOS' }, 'fx.preview': 'PREVIA',
      'fx.gift': 'PRESENTE!', 'fx.newMember': 'NOVO NA TURMA!', 'fx.levelUp': 'NIVEL UP!',
      'fx.ringsMult': 'X{n} NA RODADA!', 'fx.ringsCheer': 'ANIMACAO X{n}!', 'fx.ringsHit': 'ENCAIXOU!', 'fx.ringsClose': 'RASPOU!', 'fx.ringsMiss': 'ERROU!',
      'fx.ringsInsert': 'JOGUE UMA FICHA!',
      // Placas pintadas nas barracas (fonte de pixel, sem acento).
      'sign.barraca-pescaria': 'PESCARIA', 'sign.barraca-beijo': 'BEIJO', 'sign.barraca-comidas': 'COMIDAS',
      'sign.cadeia': 'CADEIA', 'sign.correio': 'CORREIO', 'sign.barraca-argolas': 'ARGOLAS',

      'tray.panel': 'Abrir painel', 'tray.shop': 'Abrir loja', 'tray.photo': 'Tirar foto da festa',
      'tray.pin': 'Fixar sobre as janelas', 'tray.size': 'Tamanho', 'tray.display': 'Monitor',
      'tray.displayItem': 'Monitor {n} ({w}×{h})', 'tray.hide': 'Esconder a festa', 'tray.language': 'Idioma', 'tray.sound': 'Som',
      'tray.quit': 'Fechar o jogo',
      'steam.required': 'Abra a Steam e inicie o jogo pela sua biblioteca.',
      'steam.requiredTitle': 'A Steam não está aberta',

      // Presença na Steam (o que os amigos veem): gerado para o Steamworks por desktop/prepare-steam.js.
      'presence.party': '{tier}: {n} convidados'
    }
  };
  (root.ARRAIA_LANGS || (root.ARRAIA_LANGS = {}))['pt-BR'] = dict;
  if (typeof module === 'object' && module.exports) module.exports = dict;
})(typeof globalThis !== 'undefined' ? globalThis : this);
