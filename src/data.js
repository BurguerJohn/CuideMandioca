// Conteúdo de Cuide bem da sua mandioca: números, catálogo, turma e textos. Tudo o que o motor lê vem daqui.
globalThis.GAME_DATA = {
  // Atributos da anfitriã. Valor no nível L = base + per × (L − 1); preço = price × growth^(L − 1).
  stats: [
    { id: 'rebolado', name: 'Rebolado', unit: 'por passo', desc: 'Animação que cada passo rende.',
      base: 1, per: 1, price: 72, growth: 1.21 },
    { id: 'folego', name: 'Fôlego', unit: 'passos', desc: 'Quantos passos ela aguenta antes de cansar.',
      base: 8, per: 2, price: 54, growth: 1.15 },
    { id: 'refresco', name: 'Refresco', unit: '× descanso', desc: 'Quanto mais refresco, mais curto o descanso.',
      base: 1, per: 0.12, price: 150, growth: 1.18 },
    { id: 'ritmo', name: 'Ritmo', unit: 'passos/s', desc: 'Velocidade da dança. A animação acelera junto.',
      base: 1, per: 0.03, price: 96, growth: 1.20 }
  ],

  // Porte do arraiá: a lotação (convidados) decide o porte, e cada porte libera coisas novas.
  tiers: [
    { id: 'quintal', name: 'Arraiá de Quintal', size: 1,
      unlocks: 'Melhorias, loja, correio elegante e Argolas da Sorte.' },
    { id: 'quermesse', name: 'Quermesse do Bairro', size: 10,
      unlocks: 'Pescaria, par da quadrilha, barracas, pedidos dos convidados, quadrilha marcada, bingo e corrida de saco.' },
    { id: 'cidade', name: 'Festa da Cidade', size: 25,
      unlocks: 'Palco com trio de forró, rolês, fogueira, tablado de dança, quebra-pote, casamento na roça, leilão de prendas e a cozinha do Fogão a Lenha.' },
    { id: 'regional', name: 'São João Regional', size: 50,
      unlocks: 'Marcadora da quadrilha, foguista, penetras e roda-gigante.' },
    { id: 'maior', name: 'Maior São João do Mundo', size: 100,
      unlocks: 'Lâmpadas no varal, fogos de artifício, telão no palco, show de drones e o São João do ano que vem.' }
  ],

  // Postos da festa: onde cada papel trabalha e quando o posto abre.
  posts: {
    par: { name: 'Par da quadrilha', tier: 1 },
    sanfona: { name: 'Sanfona do palco', tier: 2 },
    zabumba: { name: 'Zabumba do palco', tier: 2 },
    triangulo: { name: 'Triângulo do palco', tier: 2 },
    marcador: { name: 'Caixote da marcadora', tier: 3 },
    foguista: { name: 'Beira da fogueira', tier: 3 },
    beijo: { name: 'Barraca do Beijo', item: 'barraca-beijo' },
    pescaria: { name: 'Barraca de Pescaria', item: 'barraca-pescaria' },
    argolas: { name: 'Barraca das Argolas', item: 'barraca-argolas' },
    mascote: { name: 'Terreiro', tier: 1 },
    comidas: { name: 'Barraca de Comidas', item: 'barraca-comidas' },
    ambulante: { name: 'Ambulante da festa', tier: 1 },
    fogao: { name: 'Fogão a Lenha', item: 'fogao-lenha' },
    cordel: { name: 'Barraca de Cordel', item: 'barraca-cordel' }
  },

  // A turma. Vem da pescaria; peixe repetido sobe o nível (até 10).
  chars: [
    { id: 'milho', name: 'Milho', rarity: 0, post: 'par', role: 'Par da quadrilha',
      effect: 'cheer', base: 0.10, per: 0.05, text: '+{v}% de Animação por passo' },
    { id: 'cenoura', name: 'Cenoura', rarity: 0, post: 'sanfona', role: 'Sanfoneira',
      effect: 'speed', base: 0.10, per: 0.04, text: '+{v}% de Ritmo' },
    { id: 'inhame', name: 'Inhame', rarity: 0, post: 'zabumba', role: 'Zabumbeiro',
      effect: 'stamina', base: 3, per: 1, text: '+{n} de Fôlego' },
    { id: 'batata', name: 'Batata-Doce', rarity: 0, post: 'triangulo', role: 'Triângulo',
      effect: 'recovery', base: 0.15, per: 0.05, text: '+{v}% de Refresco' },
    { id: 'pamonha', name: 'Pamonha', rarity: 1, post: 'marcador', role: 'Marcadora da quadrilha',
      effect: 'crit', base: 0.04, per: 0.01, text: '{v}% de chance de “Olha a cobra!” (passo ×3)' },
    { id: 'aipim', name: 'Aipim', rarity: 1, post: 'beijo', role: 'Barraqueira do Beijo',
      effect: 'request', base: 0.5, per: 0.1, text: 'Pedidos pagam +{v}%' },
    { id: 'cachorro', name: 'Cachorro-Quente', rarity: 1, post: 'pescaria', role: 'Pescador',
      effect: 'fishing', base: 0.2, per: 0.05, text: 'Prendas {v}% mais rápidas' },
    { id: 'pacoca', name: 'Paçoca', rarity: 2, post: 'argolas', role: 'Argoleira',
      effect: 'rings', base: 0.2, per: 0.05, text: 'O preço das Argolas baixa {v}% mais rápido' },
    { id: 'faisca', name: 'Faísca', rarity: 3, post: 'foguista', role: 'Foguista',
      effect: 'flare', base: 0.5, per: 0.1, text: 'Labareda dura +{v}%' },
    // O coelho das fotos em sopinha/: pula pelo terreiro e cuida da festa enquanto o jogo está fechado.
    { id: 'sopinha', name: 'Sopinha', rarity: 1, post: 'mascote', role: 'Mascote da festa',
      effect: 'offline', base: 0.2, per: 0.05, text: 'Com o jogo fechado, a festa rende +{v}%' },
    // Pipoca vende na Barraca de Comidas (fichas mais baratas) e Amendoim passeia pela festa (metas rendem mais fichas).
    { id: 'pipoca', name: 'Pipoca', rarity: 2, post: 'comidas', role: 'Pipoqueira',
      effect: 'ticket', base: 0.10, per: 0.03, text: 'Fichas custam {v}% menos' },
    { id: 'amendoim', name: 'Amendoim', rarity: 1, post: 'ambulante', role: 'Ambulante',
      effect: 'goal', base: 0.20, per: 0.08, text: 'Metas dão {v}% mais fichas' },
    { id: 'canjica', name: 'Canjica', rarity: 2, post: 'fogao', role: 'Cozinheira',
      effect: 'feast', base: 0.20, per: 0.05, text: 'Brincadeiras (pote, saco, burro, cobra e compadres) rendem +{v}% de Animação, e o fogão cozinha na metade do tempo' },
    { id: 'cocada', name: 'Cocada', rarity: 1, post: 'cordel', role: 'Cordelista',
      effect: 'letter', base: 0.15, per: 0.04, text: 'Cartas do correio elegante chegam {v}% mais depressa' }
  ],
  rarities: [
    { name: 'Comum', chance: 0.70, wood: 1 },
    { name: 'Rara', chance: 0.22, wood: 1.25 },
    { name: 'Super-rara', chance: 0.06, wood: 1.5 },
    { name: 'Ultra-rara', chance: 0.02, wood: 2 }
  ],

  // Passos de dança da Mandioca: cada um vem depois de tantos passos dançados (na ordem de art/danca.py). Ela troca de
  // passo a cada danceSteps passos, sorteando entre os que já sabe; cada passo a mais rende danceBonus por passo.
  dances: [
    { id: 'forro', name: 'Forró', at: 0 },
    { id: 'xote', name: 'Xote', at: 100 },
    { id: 'polichinelo', name: 'Polichinelo', at: 1250 },
    { id: 'sanfona', name: 'Sanfona', at: 5000 },
    { id: 'rebolado', name: 'Rebolado', at: 13750 },
    { id: 'baiao', name: 'Baião', at: 32500 },
    { id: 'giro', name: 'Giro', at: 75000 },
    { id: 'moonwalk', name: 'Moonwalk', at: 137500 },
    { id: 'frevo', name: 'Frevo', at: 250000 },
    { id: 'lambada', name: 'Lambada', at: 375000 },
    { id: 'macarena', name: 'Macarena', at: 537500 },
    { id: 'boi-bumba', name: 'Boi-bumbá', at: 625000 },
    { id: 'robo', name: 'Robô', at: 750000 },
    { id: 'balance', name: 'Balancê', at: 875000 },
    { id: 'arrasta-pe', name: 'Arrasta-pé', at: 1000000 },
    { id: 'ciranda', name: 'Ciranda', at: 1150000 },
    { id: 'coco', name: 'Coco', at: 1300000 },
    { id: 'passinho', name: 'Passinho', at: 1650000 },
    { id: 'pisa-fulo', name: 'Pisa na Fulô', at: 1825000 },
    { id: 'xaxado', name: 'Xaxado', at: 2000000 }
  ],

  // Metas da festa: sempre 3 abertas. Cada tipo conta um número do jogo a partir de quando a meta entrou (engine.goalCounter);
  // `tier` é o porte mínimo. Ao resgatar, uma meta nova (de outro tipo) entra no lugar.
  goals: [
    { id: 'steps', tier: 0 }, { id: 'guests', tier: 0 }, { id: 'levels', tier: 0 }, { id: 'pokes', tier: 0 },
    { id: 'letters', tier: 0 }, { id: 'fish', tier: 1 }, { id: 'requests', tier: 1 }, { id: 'rings', tier: 0 },
    { id: 'outings', tier: 2 }, { id: 'crashers', tier: 3 }, { id: 'sacos', tier: 1 }, { id: 'potes', tier: 2 }, { id: 'lances', tier: 2 }, { id: 'cobras', tier: 1 }, { id: 'burros', tier: 2 }, { id: 'fantasias', tier: 2 }, { id: 'compadres', tier: 1 },
    // `needs`: a meta só é sorteada com esse enfeite num dos lados da festa.
    { id: 'pratos', tier: 2, needs: 'fogao-lenha' }
  ],

  // Temas da loja (cada item dos temas tem `tema`): ter todos os itens de um tema abre a conquista dele.
  themes: [
    { id: 'dino', achievement: 'era-dos-dinossauros' },
    { id: 'halloween', achievement: 'noite-de-halloween' },
    { id: 'zumbi', achievement: 'apocalipse-zumbi' }
  ],

  // Loja. Lados aceitam enfeites desde o início e barracas a partir da Quermesse.
  categories: [
    { id: 'chapeu', name: 'Chapéus' }, { id: 'mao', name: 'Na mão' }, { id: 'tecido', name: 'Tecidos' },
    { id: 'terreiro', name: 'Terreiros' }, { id: 'lado', name: 'Barracas e enfeites' }, { id: 'varal', name: 'Varais' }
  ],
  items: [
    { id: 'chapeu-palha', cat: 'chapeu', name: 'Chapéu de Palha', price: 0, source: 'inicial',
      desc: 'Clássico. Esconde a careca da mandioca.' },
    { id: 'palha-furada', cat: 'chapeu', name: 'Palha Furada', price: 6, desc: 'Mais furo que desculpa de atrasado.' },
    { id: 'lenco-chita', cat: 'chapeu', name: 'Lenço de Chita', price: 5, desc: 'Florido e amarrado bem firme.' },
    { id: 'coroa-flores', cat: 'chapeu', name: 'Coroa de Flores', price: 7, desc: 'Noiva caipira sem noivo (ainda).' },
    { id: 'vaqueiro', cat: 'chapeu', name: 'Chapéu de Vaqueiro', price: 8, desc: 'Pra laçar um coração na pescaria.' },
    { id: 'tiara-chifrinho', cat: 'chapeu', name: 'Tiara de Chifrinho', price: 9,
      desc: 'Casamento caipira tem dessas coisas.' },
    { id: 'cangaceiro', cat: 'chapeu', name: 'Chapéu de Cangaceiro', price: 11, desc: 'Meia-lua de couro. Respeito no salão.' },
    { id: 'coroa-milho', cat: 'chapeu', name: 'Coroa da Rainha do Milho', price: 18,
      desc: 'Só pra quem sabe descascar uma espiga.' },
    { id: 'rei-baiao', cat: 'chapeu', name: 'Chapéu do Rei do Baião', price: 0, source: 'role',
      desc: 'Couro, estrela e muito xote.' },
    { id: 'oculos-coracao', cat: 'chapeu', name: 'Óculos de Coração', price: 0, source: 'argolas',
      desc: 'Pra ver a festa com mais amor.' },
    { id: 'chapeu-palhaco', cat: 'chapeu', name: 'Chapéu de Palhaço', price: 0, source: 'argolas',
      desc: 'Direto da barraca das argolas.' },
    { id: 'maria-chiquinha', cat: 'chapeu', name: 'Maria Chiquinha', price: 10,
      desc: 'Chapéu de palha e duas tranças com fita. Sardas por conta da casa.' },
    { id: 'tiara-bandeirinhas', cat: 'chapeu', name: 'Tiara de Bandeirinhas', price: 6, desc: 'O varal da festa, na cabeça.' },
    { id: 'veu-noiva', cat: 'chapeu', name: 'Véu de Noiva', price: 0, source: 'casamento',
      desc: 'Tule, uma rosa e cara de quem já disse sim.' },
    { id: 'cartola-noivo', cat: 'chapeu', name: 'Cartola de Noivo', price: 0, source: 'casamento',
      desc: 'Só falta o terno remendado.' },
    { id: 'chapeu-coco', cat: 'chapeu', name: 'Chapéu-coco', price: 0, source: 'leilao',
      desc: 'De quem sempre dá o último lance.' },
    // Itens caros e criativos (sem relação com São João): liberam por porte da festa e custam bem mais fichas. A arte vem de
    // art/itens_novos.py.
    { id: 'fatia-melancia', cat: 'chapeu', name: 'Fatia de Melancia', price: 26, tier: 2,
      desc: 'Refresca a cabeça e esconde as sementes (quase todas).' },
    { id: 'abacaxi-real', cat: 'chapeu', name: 'Abacaxi Real', price: 30, tier: 2,
      desc: 'Coroa de rei de verdade: espinhosa por fora, doce por dentro.' },
    { id: 'gorro-tubarao', cat: 'chapeu', name: 'Gorro de Tubarão', price: 34, tier: 3,
      desc: 'Ele só morde as ideias ruins. A testa fica por sua conta.' },
    { id: 'cartola-magica', cat: 'chapeu', name: 'Cartola Mágica', price: 38, tier: 3,
      desc: 'Tem um coelho dentro. Ninguém sabe quem o colocou lá.' },
    { id: 'chapeu-mago', cat: 'chapeu', name: 'Chapéu de Mago', price: 44, tier: 3,
      desc: 'Estrelas, uma lua e um feitiço que sempre sai pela culatra.' },
    { id: 'capacete-astronauta', cat: 'chapeu', name: 'Capacete de Astronauta', price: 52, tier: 4,
      desc: 'Um pequeno passo para a Mandioca, um grande salto na pista.' },

    { id: 'bandeirinha', cat: 'mao', name: 'Bandeirinha', price: 0, source: 'inicial', desc: 'Pra acenar pra todo mundo.' },
    { id: 'espiga', cat: 'mao', name: 'Espiga de Milho', price: 5, desc: 'Grande, amarelinha e cheia de grão.' },
    { id: 'leque', cat: 'mao', name: 'Leque de Chita', price: 5, desc: 'Pra abanar o calor da fogueira.' },
    { id: 'maca-amor', cat: 'mao', name: 'Maçã do Amor', price: 6, desc: 'Durinha por fora, docinha por dentro.' },
    { id: 'vara-pescar', cat: 'mao', name: 'Vara de Pescar', price: 8, desc: 'Tamanho não é documento; paciência é.' },
    { id: 'triangulo', cat: 'mao', name: 'Triângulo Amoroso', price: 9, desc: 'Três pontas e nenhum ciúme.' },
    { id: 'pau-selfie', cat: 'mao', name: 'Pau de Selfie', price: 10, desc: 'Pra registrar a festa lá de cima.' },
    { id: 'lampiao', cat: 'mao', name: 'Lampião', price: 12, desc: 'Ilumina até a pescaria mais escura.' },
    { id: 'ursinho', cat: 'mao', name: 'Ursinho de Pelúcia', price: 0, source: 'argolas',
      desc: 'Prêmio clássico de quem tem mira.' },
    { id: 'peixinho', cat: 'mao', name: 'Peixinho no Saquinho', price: 0, source: 'argolas',
      desc: 'Não é da pescaria. É seu mesmo.' },
    { id: 'sanfona-ouro', cat: 'mao', name: 'Sanfona de Ouro', price: 0, source: 'role',
      desc: 'Trazida de Caruaru. Toca sozinha de tão boa.' },
    { id: 'zabumba', cat: 'mao', name: 'Zabumba de Campina', price: 0, source: 'role',
      desc: 'Trazida do Parque do Povo, em Campina Grande. Tum, tum-tum.' },
    { id: 'estrelinha', cat: 'mao', name: 'Estrelinha', price: 9, desc: 'Faísca pra todo lado. Longe da fogueira, hein!' },
    { id: 'buque', cat: 'mao', name: 'Buquê da Noiva', price: 0, source: 'casamento', desc: 'Quem pegar é a próxima.' },
    { id: 'frango-assado', cat: 'mao', name: 'Frango Assado', price: 0, source: 'leilao', desc: 'Arrematado no leilão, douradinho e suculento.' },
    { id: 'bolo-fuba', cat: 'mao', name: 'Bolo de Fubá', price: 0, source: 'leilao', desc: 'Com erva-doce. Receita da vó do leiloeiro.' },
    { id: 'pandeiro', cat: 'mao', name: 'Pandeiro', price: 11, desc: 'Tchic-tchic-tum: segura o ritmo do coco.' },
    { id: 'sombrinha', cat: 'mao', name: 'Sombrinha de Frevo', price: 9, desc: 'Pequenininha e colorida: pede um passo de frevo.' },
    { id: 'cobra-de-pano', cat: 'mao', name: 'Cobra de Pano', price: 0, source: 'cobra', desc: 'A da quadrilha. Olha a cobra! É mentira.' },
    { id: 'balao-estrela', cat: 'mao', name: 'Balão Estrela', price: 26, tier: 2,
      desc: 'Inflado com pura animação. Nem os estalinhos têm coragem de furar.' },
    { id: 'sorvete-triplo', cat: 'mao', name: 'Sorvete Triplo', price: 28, tier: 2,
      desc: 'Hortelã, morango e chocolate. Derrete mais rápido que a vergonha na pista.' },
    { id: 'espada-neon', cat: 'mao', name: 'Espada de Neon', price: 36, tier: 3,
      desc: 'Muda de cor a cada passo de dança. Só corta o tédio.' },
    { id: 'cajado-cristal', cat: 'mao', name: 'Cajado de Cristal', price: 42, tier: 3,
      desc: 'O cristal flutua sozinho. Ninguém sabe por quê, e ele não conta.' },
    { id: 'bola-cristal', cat: 'mao', name: 'Bola de Cristal', price: 46, tier: 4,
      desc: 'Ela prevê que a festa vai ser boa. Até hoje não errou.' },
    { id: 'agua-viva', cat: 'mao', name: 'Guarda-chuva de Água-viva', price: 50, tier: 4,
      desc: 'Não molha ninguém, mas dá um choquinho em quem chega perto demais.' },

    { id: 'xadrez-vermelho', cat: 'tecido', name: 'Xadrez Vermelho', price: 0, source: 'inicial',
      desc: 'O uniforme oficial de qualquer arraiá.' },
    { id: 'xadrez-azul', cat: 'tecido', name: 'Xadrez Azul', price: 5, desc: 'Pra combinar com o céu de junho.' },
    { id: 'xadrez-verde', cat: 'tecido', name: 'Xadrez Verde', price: 5, desc: 'Da cor do milho verde.' },
    { id: 'remendado', cat: 'tecido', name: 'Remendado com Orgulho', price: 7, desc: 'Cada remendo, uma quadrilha.' },
    { id: 'chita', cat: 'tecido', name: 'Chita Florida', price: 8, desc: 'Florzinha pra todo lado.' },
    { id: 'chita-rosa', cat: 'tecido', name: 'Chita Rosa', price: 8, desc: 'A preferida da Barraca do Beijo.' },
    { id: 'xadrez-ouro', cat: 'tecido', name: 'Xadrez de Ouro', price: 0, source: 'role', desc: 'Brilha mais que a fogueira.' },
    { id: 'chita-amarela', cat: 'tecido', name: 'Chita Amarela', price: 9, desc: 'Cor de milho, com florzinha.' },
    { id: 'xadrez-roxo', cat: 'tecido', name: 'Xadrez Roxo', price: 10, desc: 'Pra quem é da roça e da cidade.' },
    { id: 'onca', cat: 'tecido', name: 'Estampa de Onça', price: 22, tier: 2,
      desc: 'Rrrrr! Só no tecido, pode chegar mais perto.' },
    { id: 'psicodelico', cat: 'tecido', name: 'Listras Psicodélicas', price: 26, tier: 2,
      desc: 'Não encare por muito tempo. As listras te encaram de volta.' },
    { id: 'galaxia', cat: 'tecido', name: 'Galáxia', price: 30, tier: 3,
      desc: 'Estrelas, nebulosas e uma pitada de poeira cósmica.' },
    { id: 'sereia', cat: 'tecido', name: 'Escamas de Sereia', price: 34, tier: 3,
      desc: 'Brilha na água, na terra e principalmente na pista.' },
    { id: 'neon-retro', cat: 'tecido', name: 'Neon Retrô', price: 38, tier: 4,
      desc: 'Direto de 1985, com grade e tudo.' },

    // Varais: as bandeirinhas da festa inteira (cores e desenho vêm de art/exportar.py, VARAIS).
    { id: 'varal-colorido', cat: 'varal', name: 'Bandeirinhas Coloridas', price: 0, source: 'inicial',
      desc: 'Uma de cada cor, como manda o figurino.' },
    { id: 'varal-azul', cat: 'varal', name: 'Bandeirinhas Azul e Branco', price: 8, desc: 'O céu de junho, pendurado.' },
    { id: 'varal-chita', cat: 'varal', name: 'Bandeirinhas de Chita', price: 10, desc: 'Florzinha de tecido balançando no vento.' },
    { id: 'varal-brasil', cat: 'varal', name: 'Bandeirinhas Verde e Amarelo', price: 12, desc: 'Arraiá em clima de Copa.' },
    { id: 'varal-ouro', cat: 'varal', name: 'Bandeirinhas Douradas', price: 16, desc: 'Pra festa que já virou tradição.' },
    { id: 'varal-pizza', cat: 'varal', name: 'Bandeirinhas de Pizza', price: 30, tier: 2,
      desc: 'Fatias penduradas no fio. O cheiro de queijo vem junto.' },
    { id: 'varal-coracao', cat: 'varal', name: 'Corações ao Vento', price: 34, tier: 2,
      desc: 'Balançam de amor e de vento.' },
    { id: 'varal-peixe', cat: 'varal', name: 'Peixes de Vento', price: 38, tier: 3,
      desc: 'Nadam no ar de boca aberta, contra a corrente do vento.' },
    { id: 'varal-lanterna', cat: 'varal', name: 'Lanternas de Papel', price: 44, tier: 3,
      desc: 'Redondas, vermelhas e cheias de sorte.' },
    { id: 'varal-estrelas', cat: 'varal', name: 'Céu Estrelado', price: 50, tier: 4,
      desc: 'Uma constelação inteira pendurada num fio.' },

    { id: 'terra-batida', cat: 'terreiro', name: 'Terra Batida', price: 0, source: 'inicial',
      desc: 'Poeira boa de levantar no xote.' },
    { id: 'lamacal', cat: 'terreiro', name: 'Lamaçal Pós-Chuva', price: 6, desc: 'Escorrega, mas não cai.' },
    { id: 'gramado', cat: 'terreiro', name: 'Gramado da Praça', price: 8, desc: 'Verdinho, com florzinha.' },
    { id: 'areia', cat: 'terreiro', name: 'Areia de Praia', price: 10, desc: 'São João com pé na areia.' },
    { id: 'sertao', cat: 'terreiro', name: 'Chão do Sertão', price: 9, desc: 'Terra vermelha rachada de sol, com florzinha da caatinga.' },
    { id: 'tablado', cat: 'terreiro', name: 'Tablado de Madeira', price: 12, desc: 'Pra ouvir o arrasta-pé.' },
    { id: 'pista-forro', cat: 'terreiro', name: 'Pista de Forró', price: 0, source: 'role',
      desc: 'Xadrez no chão e brilho no olhar.' },
    { id: 'nuvem', cat: 'terreiro', name: 'Nuvem Fofa', price: 36, tier: 3,
      desc: 'Pise leve: a pista flutua de verdade, e sem avião.' },
    { id: 'gelo', cat: 'terreiro', name: 'Iceberg', price: 38, tier: 3,
      desc: 'Escorrega mais que o lamaçal e ninguém reclama do calor.' },
    { id: 'lava', cat: 'terreiro', name: 'Rocha de Lava', price: 42, tier: 3,
      desc: 'Chão de vulcão: quente, rachado e cheio de brasas.' },
    { id: 'bolo-confeitado', cat: 'terreiro', name: 'Bolo de Confeitaria', price: 46, tier: 4,
      desc: 'Cobertura de morango por cima, massa fofa por baixo. Pise com educação.' },
    { id: 'pista-disco', cat: 'terreiro', name: 'Pista de Disco', price: 54, tier: 4,
      desc: 'Luzes coloridas no chão e nenhuma vergonha de dançar.' },

    // Troféus da Mata Encantada: só se ganham derrotando o chefe de cada etapa (`minis.mata.unlocks`).
    { id: 'cabelo-curupira', cat: 'chapeu', name: 'Cabeleira do Curupira', price: 0, source: 'luta',
      desc: 'Vermelha feito brasa. Os pés ficam pra trás, o estilo vai pra frente.' },
    { id: 'coroa-iara', cat: 'chapeu', name: 'Coroa da Iara', price: 0, source: 'luta',
      desc: 'Pérola, concha e um canto que ninguém esquece.' },
    { id: 'capuz-lobisomem', cat: 'chapeu', name: 'Capuz de Lobisomem', price: 0, source: 'luta',
      desc: 'Pelo, orelha e uma lua cheia escondida no bolso.' },
    { id: 'cobra-grande', cat: 'chapeu', name: 'Cobra Grande', price: 0, source: 'luta',
      desc: 'A Boiúna enrolada na cabeça, quietinha (por enquanto).' },
    { id: 'chapeu-boto', cat: 'chapeu', name: 'Chapéu do Boto', price: 0, source: 'luta',
      desc: 'Branquinho, pra esconder o buraco da cabeça. Ninguém vai notar.' },
    { id: 'tocha-caipora', cat: 'mao', name: 'Tocha da Caipora', price: 0, source: 'luta',
      desc: 'Acende a mata inteira e ainda pede um fuminho.' },
    { id: 'ferradura-fogo', cat: 'mao', name: 'Ferradura de Fogo', price: 0, source: 'luta',
      desc: 'Sobrou da mula. O coice vem de brinde.' },
    { id: 'caldeirao-cuca', cat: 'mao', name: 'Caldeirão da Cuca', price: 0, source: 'luta',
      desc: 'Borbulha sozinho. Nem pergunte o que tem dentro.' },
    { id: 'capa-boi-bumba', cat: 'tecido', name: 'Capa do Boi-Bumbá', price: 0, source: 'luta',
      desc: 'Veludo, lantejoula e fita: o boi nunca morre de verdade.' },
    { id: 'brejo-mapinguari', cat: 'terreiro', name: 'Brejo do Mapinguari', price: 0, source: 'luta',
      desc: 'Lama, cogumelo e um cheiro que a gente nunca esquece.' },
    { id: 'clareira-encantada', cat: 'terreiro', name: 'Clareira Encantada', price: 0, source: 'luta',
      desc: 'Cogumelo que brilha, vagalume de verdade e nenhuma pressa.' },
    { id: 'varal-boitata', cat: 'varal', name: 'Varal do Boitatá', price: 0, source: 'luta',
      desc: 'Bandeirinhas de fogo-fátuo, e o barbante nem chamusca.' },

    { id: 'fardo', cat: 'lado', kind: 'enfeite', name: 'Fardo de Feno', price: 0, source: 'inicial',
      desc: 'Banco, palco e esconderijo.' },
    { id: 'mastro', cat: 'lado', kind: 'enfeite', name: 'Mastro de Bandeirinhas', price: 0, source: 'inicial',
      desc: 'Fita em espiral, bandeira no topo, laranja e espiga penduradas e fitas dançando no vento.' },
    { id: 'espantalho', cat: 'lado', kind: 'enfeite', name: 'Espantalho Galã', price: 8,
      desc: 'Pose de galã, coração de palha.', effect: 'Galã do correio: cada carta rende +1 ficha.' },
    { id: 'carroca', cat: 'lado', kind: 'enfeite', name: 'Carroça Enfeitada', price: 12, desc: 'Leva a turma e a pamonha.',
      effect: 'Leva a turma: os rolês voltam 15% mais rápido.' },
    { id: 'barril-quentao', cat: 'lado', kind: 'enfeite', name: 'Barril de Quentão', price: 14,
      desc: 'Quentão quentinho pra espantar o frio de junho.', effect: 'No friozinho vende quentão que gera 1 ficha a cada 15 segundos.' },
    { id: 'fogao-lenha', cat: 'lado', kind: 'enfeite', name: 'Fogão a Lenha', price: 16,
      desc: 'Canjica e pamonha no fogo, cheirinho pela festa toda.',
      effect: 'Pedidos dos convidados rendem +50%. Da Festa da Cidade em diante, cozinha pratos que animam a festa.' },
    { id: 'barraca-pescaria', cat: 'lado', kind: 'barraca', tier: 1, name: 'Barraca de Pescaria', price: 15,
      desc: 'Onde o Cachorro-Quente joga a vara.', effect: 'Ativa o Pescador.' },
    { id: 'barraca-beijo', cat: 'lado', kind: 'barraca', tier: 1, name: 'Barraca do Beijo', price: 15,
      desc: 'Uma ficha por beijinho. Só na bochecha!', effect: 'Ativa a Barraqueira do Beijo. Clique nela: um beijinho a cada 5 min rende 1 ficha.' },
    { id: 'barraca-comidas', cat: 'lado', kind: 'barraca', tier: 1, name: 'Barraca de Comidas', price: 18,
      desc: 'Pamonha, canjica e curau.', effect: '+10% de Refresco.' },
    { id: 'cadeia', cat: 'lado', kind: 'barraca', tier: 1, name: 'Cadeia do Arraiá', price: 20,
      desc: 'Penetra aqui paga fiança.', effect: 'Penetras rendem o dobro de fichas.' },
    { id: 'correio', cat: 'lado', kind: 'barraca', tier: 1, name: 'Correio Elegante', price: 20,
      desc: 'Recadinho anônimo com duplo sentido.', effect: 'Cartas chegam 30% mais rápido.' },
    { id: 'barraca-cordel', cat: 'lado', kind: 'barraca', tier: 1, name: 'Barraca de Cordel', price: 14,
      desc: 'Folhetos pendurados no barbante, cheios de rima.', effect: 'Pedidos dos convidados aparecem mais vezes.' },
    { id: 'barraca-argolas', cat: 'lado', kind: 'barraca', tier: 1, name: 'Barraca das Argolas', price: 16,
      desc: 'Garrafa, argola e muita mira.', effect: '+1 argola por rodada nas Argolas e ativa a Argoleira.' },
    // Temas novos (dinossauros, Halloween e terra de zumbis): terreiros, cenários dos lados, chapéus, itens de mão e tecidos. A arte vem
    // de art/tema_dino.py, art/tema_halloween.py e art/tema_zumbi.py.
    { id: 'capuz-dino', tema: 'dino', cat: 'chapeu', name: 'Dino de Estimação', price: 28, tier: 2,
      desc: 'Um T-Rex bebê tirando uma soneca na sua cabeça. Se você mexer, ele morde. Sem querer.' },
    { id: 'crista-estegossauro', tema: 'dino', cat: 'chapeu', name: 'Crista de Bandeirinhas', price: 36, tier: 3,
      desc: 'As placas do estegossauro foram trocadas por bandeirinhas. Ele aprovou.' },
    { id: 'osso-dino', tema: 'dino', cat: 'mao', name: 'Coxa de Dinossauro Assada', price: 26, tier: 2,
      desc: 'Bem passada, com caramelo e fumacinha. A mordida é de brinde.' },
    { id: 'ovo-dino', tema: 'dino', cat: 'mao', name: 'Ovinho de Dinossauro', price: 40, tier: 3,
      desc: 'Chocou e o bebê já saiu de chapéu de palha. Vai por mim, é melhor sair de perto.' },
    { id: 'pele-dino', tema: 'dino', cat: 'tecido', name: 'Pele de Dinossauro', price: 32, tier: 2,
      desc: 'Escamas verdes, resistentes a garras e a comentários.' },
    { id: 'fossil', tema: 'dino', cat: 'terreiro', name: 'Sítio de Fósseis', price: 30, tier: 2,
      desc: 'Camadas de sedimento com crânio de T-Rex, costelas e âmbar com mosquito. O paleontólogo deixou o guarda-sol.' },
    { id: 'jurassico', tema: 'dino', cat: 'terreiro', name: 'Selva Jurássica', price: 40, tier: 3,
      desc: 'Âmbar com mosquito, ovo enterrado, cogumelo gigante e uma bandeirinha que alguém espetou na mata.' },
    { id: 'ninho', tema: 'dino', cat: 'terreiro', name: 'Ninho de Ovos', price: 46, tier: 3,
      desc: 'Palha em camadas, um ovo de ouro enterrado e filhote de chapéu de palha espiando.' },
    { id: 'rex-sanfoneiro', tema: 'dino', cat: 'lado', kind: 'enfeite', name: 'T-Rex Sanfoneiro', price: 46, tier: 3,
      desc: 'Chapéu de palha, sanfona vermelha e braços curtos demais. Toca forró mesmo assim.' },
    { id: 'ovo-quadrilha', tema: 'dino', cat: 'lado', kind: 'enfeite', name: 'Ovo da Quadrilha', price: 34, tier: 2,
      desc: 'Chocou no meio do arraiá: o bebê já nasceu marcando o passo.' },
    { id: 'vulcao-pipoca', tema: 'dino', cat: 'lado', kind: 'enfeite', name: 'Vulcão de Pipoca', price: 52, tier: 4,
      desc: 'Em vez de lava, cospe pipoca e caramelo. Só é perigoso para o seu dente.' },
    { id: 'bronto-varal', tema: 'dino', cat: 'lado', kind: 'enfeite', name: 'Brontossauro do Varal', price: 44, tier: 3,
      desc: 'Pescoço de poste: segura as bandeirinhas do arraiá inteiro e ainda mastiga uma folha.' },
    { id: 'chapeu-bruxa', tema: 'halloween', cat: 'chapeu', name: 'Chapéu de Bruxa', price: 30, tier: 2,
      desc: 'Ponta dobrada, aba larga e um feitiço de simpatia.' },
    { id: 'abobora-cabeca', tema: 'halloween', cat: 'chapeu', name: 'Abóbora na Cabeça', price: 34, tier: 2,
      desc: 'Esculpida com carinha, acesa por dentro e com um morcego pendurado no cabinho.' },
    { id: 'fantasminha', tema: 'halloween', cat: 'chapeu', name: 'Fantasminha Caipira', price: 42, tier: 3,
      desc: 'De chapéu de palha e bandeirinha na mão. Assusta, mas só depois da quadrilha.' },
    { id: 'vassoura-bruxa', tema: 'halloween', cat: 'mao', name: 'Vassoura com Gato Passageiro', price: 32, tier: 2,
      desc: 'Voa com um gato preto agarrado no cabo. Ele não pagou a passagem.' },
    { id: 'balde-doces', tema: 'halloween', cat: 'mao', name: 'Balde de Doces Guloso', price: 28, tier: 2,
      desc: 'Doce ou travessura? Ele mastiga os doces e ainda quer o seu.' },
    { id: 'lanterna-abobora', tema: 'halloween', cat: 'mao', name: 'Lampião Mal-Assombrado', price: 38, tier: 3,
      desc: 'Cada vez que a chama pisca, sai um fantasminha. Ninguém sabe de onde.' },
    { id: 'teias-aboboras', tema: 'halloween', cat: 'tecido', name: 'Teias e Abóboras', price: 34, tier: 2,
      desc: 'Estampa de casa abandonada. A aranha já se mudou.' },
    { id: 'aboboral', tema: 'halloween', cat: 'terreiro', name: 'Aboboral', price: 30, tier: 2,
      desc: 'Abóbora acesa até debaixo da terra, milharal e um espantalho de cabeça de abóbora.' },
    { id: 'cemiterio', tema: 'halloween', cat: 'terreiro', name: 'Cemitério Mal-Assombrado', price: 42, tier: 3,
      desc: 'Caixão e esqueleto enterrados, lápide RIP, corvo na cruz e uma árvore seca que parece olhar.' },
    { id: 'mansao', tema: 'halloween', cat: 'terreiro', name: 'Piso da Mansão Assombrada', price: 50, tier: 4,
      desc: 'Candelabro, gato preto, fantasma de corrente e um baú escondido debaixo do assoalho.' },
    { id: 'caldeirao-canjica', tema: 'halloween', cat: 'lado', kind: 'enfeite', name: 'Caldeirão de Canjica', price: 36, tier: 2,
      desc: 'A canjica da bruxa nunca esfria. De vez em quando sai um fantasminha da panela.' },
    { id: 'casinha-pe-de-galinha', tema: 'halloween', cat: 'lado', kind: 'enfeite', name: 'Casinha Pé-de-Galinha', price: 54, tier: 4,
      desc: 'Anda sozinha, pisca as janelas e já vem com bandeirinha no beiral.' },
    { id: 'pescaria-fantasmas', tema: 'halloween', cat: 'lado', kind: 'enfeite', name: 'Pescaria dos Fantasmas', price: 44, tier: 3,
      desc: 'Quem pesca leva uma prenda. O fantasma pescado leva um susto.' },
    { id: 'esqueleto-quadrilha', tema: 'halloween', cat: 'lado', kind: 'enfeite', name: 'Esqueleto Marcador de Quadrilha', price: 40, tier: 3,
      desc: 'Grita "anarriê" no megafone e ainda bate o queixo no ritmo.' },
    { id: 'cerebro-exposto', tema: 'zumbi', cat: 'chapeu', name: 'Cérebro Exposto', price: 30, tier: 2,
      desc: 'Com a tampa levantada e um canudinho listrado. Alguém está tomando o miolo.' },
    { id: 'capacete-sobrevivente', tema: 'zumbi', cat: 'chapeu', name: 'Panela de Pressão de Sobrevivente', price: 36, tier: 3,
      desc: 'Alumínio amassado, fita adesiva e uma colher de pau de antena. Apita quando tem perigo.' },
    { id: 'mao-zumbi', tema: 'zumbi', cat: 'mao', name: 'Mão Olhuda de Zumbi', price: 28, tier: 2,
      desc: 'Tem um olho na palma que olha para os lados e pisca. Dá aperto de mão com muita educação.' },
    { id: 'taco-pregos', tema: 'zumbi', cat: 'mao', name: 'Taco Embandeirado', price: 34, tier: 3,
      desc: 'Pregos, pão de queijo espetado e bandeirinhas no cabo. Defesa pessoal com espírito junino.' },
    { id: 'antidoto', tema: 'zumbi', cat: 'mao', name: 'Seringa Antídoto', price: 44, tier: 4,
      desc: 'Brilha verde, cheira a hortelã e ninguém sabe se cura.' },
    { id: 'farrapos-zumbi', tema: 'zumbi', cat: 'tecido', name: 'Farrapos de Zumbi', price: 34, tier: 2,
      desc: 'Rasgado, remendado e com cheiro de coisa velha. Muito na moda.' },
    { id: 'asfalto-zumbi', tema: 'zumbi', cat: 'terreiro', name: 'Asfalto Rachado', price: 32, tier: 2,
      desc: 'Placa de zumbis atravessando, bueiro com mão e um carro enterrado debaixo da pista.' },
    { id: 'cova-zumbi', tema: 'zumbi', cat: 'terreiro', name: 'Terra de Cova', price: 40, tier: 3,
      desc: 'Cruz de chapéu de palha, mão fazendo joinha e um caixão com olhos brilhando na fresta.' },
    { id: 'gosma-toxica', tema: 'zumbi', cat: 'terreiro', name: 'Gosma Tóxica', price: 48, tier: 4,
      desc: 'Barris vazando, olho boiando e um patinho de borracha que já não é o mesmo.' },
    { id: 'barraca-miolo', tema: 'zumbi', cat: 'lado', kind: 'enfeite', name: 'Barraca do Miolo', price: 44, tier: 3,
      desc: 'Espetinho de miolo fresquinho! O vendedor é meio desatento, mas o olho dele está sempre de olho.' },
    { id: 'kombi-pamonha', tema: 'zumbi', cat: 'lado', kind: 'enfeite', name: 'Kombi da Pamonha', price: 46, tier: 3,
      desc: 'Olha a pamonha! O alto-falante ainda funciona; o motorista, nem tanto.' },
    { id: 'casal-zumbi-quadrilha', tema: 'zumbi', cat: 'lado', kind: 'enfeite', name: 'Casal Zumbi na Quadrilha', price: 40, tier: 2,
      desc: 'Dançam o balancê de braços dados, e ela perde a cabeça de vez em quando.' },
    { id: 'banheiro-quimico', tema: 'zumbi', cat: 'lado', kind: 'enfeite', name: 'Banheiro Químico Ocupado', price: 36, tier: 2,
      desc: 'A placa diz ocupado. Ninguém quer descobrir por quem.' }
  ],
  // Guarda-roupa (src/looks.js): quantos looks cabem e com quantos salvos abre a conquista.
  looks: { max: 12, achievementAt: 5 },
  equipped: { chapeu: 'chapeu-palha', mao: 'bandeirinha', tecido: 'xadrez-vermelho', terreiro: 'terra-batida',
    esquerda: 'fardo', direita: 'mastro', varal: 'varal-colorido' },

  // Rolês: um membro da turma sai para buscar lenha. Enquanto isso, o posto dele fica vazio.
  outings: [
    { id: 'quintal', name: 'Catar lenha no quintal', minutes: 20, wood: 6, tier: 2 },
    { id: 'roca', name: 'Buscar milho na roça', minutes: 60, wood: 15, tier: 2 },
    { id: 'vizinhanca', name: 'Convidar a vizinhança', minutes: 120, wood: 28, tier: 2, item: 'rei-baiao', chance: 0.2 },
    { id: 'penetra', name: 'Dar uma de penetra no arraiá vizinho', minutes: 240, wood: 50, tier: 3,
      item: 'pista-forro', chance: 0.15 },
    { id: 'maior', name: 'Visitar o Maior São João', minutes: 480, wood: 90, tier: 3, item: 'xadrez-ouro', chance: 0.12 },
    // A viagem longa, para deixar rodando durante a noite.
    { id: 'caruaru', name: 'Viagem a Caruaru', minutes: 720, wood: 160, tier: 4, item: 'sanfona-ouro', chance: 0.25 },
    // A outra capital do São João (a eterna rival de Caruaru pelo título de maior do mundo).
    { id: 'campina', name: 'Viagem a Campina Grande', minutes: 600, wood: 150, tier: 4, item: 'zabumba', chance: 0.25 }
  ],

  // Fogueira: melhorias pagas com lenha. Com 30 melhorias ela vira lendária.
  // Cozinha do Fogão a Lenha (Festa da Cidade em diante, com o fogão num dos lados): um prato por vez vai ao fogo, gasta
  // `wood` de lenha, fica `minutes` cozinhando (metade com a Canjica no fogão) e, servido, dá `bonus` a mais em tudo por
  // `buffMinutes`. Servir outro prato troca o que estava valendo.
  // Comidas da loja (aba Comidas): cada uma enche `fill` da Barriga da Mandioca e custa `share` da melhoria mais barata
  // do momento (em Animação), então o preço acompanha a festa sem pular com os bônus passageiros.
  foods: [
    { id: 'pipoca', name: 'Pipoca', fill: 12, share: 0.05, desc: 'Um saquinho listrado, quentinha da panela.' },
    { id: 'algodao-doce', name: 'Algodão-doce', fill: 18, share: 0.09, desc: 'Nuvem cor-de-rosa no palito.' },
    { id: 'milho-cozido', name: 'Milho cozido', fill: 25, share: 0.14, desc: 'Espiga na manteiga, com uma pitada de sal.' },
    { id: 'cuscuz', name: 'Cuscuz', fill: 35, share: 0.22, desc: 'Cuscuz de milho fofinho, saído do cuscuzeiro.' },
    { id: 'arroz-doce', name: 'Arroz-doce', fill: 50, share: 0.35, desc: 'Na tigela, com canela por cima.' },
    { id: 'bolo-milho', name: 'Bolo de milho', fill: 70, share: 0.55, desc: 'Fatia grande, do tabuleiro da vizinha.' }
  ],

  // A Casa da Mandioca (janela própria, do convidado `start` em diante). A cada `perRoom` convidados: um cômodo novo e, nos dois
  // seguintes, um morador novo dentro dele (o primeiro cômodo: a esposa e depois o filho). Cada cômodo de `rooms` aparece uma
  // vez só, na ordem da lista, e cada tipo de cômodo tem duas atividades (uma por morador): o morador `i` mora no cômodo `i / 2`,
  // no lugar `i % 2`. Quando o último cômodo enche com os moradores dele (convidado 207) a casa está completa e para de crescer.
  // `designs` é quantos visuais próprios existem na arte: um por morador (o dobro dos cômodos).
  house: {
    start: 100, perRoom: 3, columns: 5, designs: 72,
    rooms: [
      { id: 'sala', name: 'Sala de estar', acts: ['trico', 'aviao'] },
      { id: 'cozinha', name: 'Cozinha', acts: ['cozinhar', 'bolo'] },
      { id: 'quarto', name: 'Quarto', acts: ['dormir', 'ler'] },
      { id: 'banheiro', name: 'Banheiro', acts: ['banho', 'dentes'] },
      { id: 'musica', name: 'Sala de música', acts: ['violao', 'bateria'] },
      { id: 'atelie', name: 'Ateliê', acts: ['pintar', 'malabares'] },
      { id: 'jardim', name: 'Jardim de inverno', acts: ['regar', 'flor'] },
      { id: 'academia', name: 'Academia', acts: ['halteres', 'corda'] },
      { id: 'laboratorio', name: 'Laboratório', acts: ['experimento', 'telescopio'] },
      { id: 'jogos', name: 'Sala de jogos', acts: ['videogame', 'pingpong'] },
      { id: 'escritorio', name: 'Escritório', acts: ['digitar', 'ioga'] },
      { id: 'danca', name: 'Pista de dança', acts: ['danca', 'cantar'] },
      { id: 'oficina', name: 'Oficina', acts: ['martelar', 'serrar'] },
      { id: 'pizzaria', name: 'Pizzaria', acts: ['massa', 'pizza'] },
      { id: 'cafeteria', name: 'Cafeteria', acts: ['barista', 'cafezinho'] },
      { id: 'cinema', name: 'Cinema', acts: ['filme', 'pipoca'] },
      { id: 'estudio', name: 'Estúdio de rádio', acts: ['podcast', 'camera'] },
      { id: 'costura', name: 'Ateliê de costura', acts: ['costurar', 'medir'] },
      { id: 'spa', name: 'Spa', acts: ['mascara', 'sauna'] },
      { id: 'aquario', name: 'Aquário', acts: ['racao', 'mergulho'] },
      { id: 'horta', name: 'Horta', acts: ['cavar', 'colher'] },
      { id: 'ringue', name: 'Ringue de boxe', acts: ['boxe', 'sombra'] },
      { id: 'skate', name: 'Pista de skate', acts: ['skate', 'patins'] },
      { id: 'circo', name: 'Circo', acts: ['equilibrio', 'magica'] },
      { id: 'teatro', name: 'Teatro', acts: ['drama', 'marionete'] },
      { id: 'garagem', name: 'Garagem', acts: ['bicicleta', 'chave'] },
      { id: 'padaria', name: 'Padaria', acts: ['sovar', 'pao'] },
      { id: 'lavanderia', name: 'Lavanderia', acts: ['lavar', 'varal'] },
      { id: 'xadrez', name: 'Sala de xadrez', acts: ['xadrez', 'quebra'] },
      { id: 'churrasqueira', name: 'Churrasqueira', acts: ['churrasco', 'abanar'] },
      { id: 'escola', name: 'Sala de aula', acts: ['lousa', 'ponteiro'] },
      { id: 'consultorio', name: 'Consultório', acts: ['medico', 'resfriado'] },
      { id: 'espaco', name: 'Nave espacial', acts: ['astronauta', 'foguete'] },
      { id: 'praia', name: 'Praia', acts: ['surfar', 'castelo'] },
      { id: 'neve', name: 'Cabana na neve', acts: ['boneco', 'patinar'] },
      { id: 'robos', name: 'Fábrica de robôs', acts: ['robo', 'solda'] }
    ],
    activities: [
      { id: 'trico', name: 'Tricô' },
      { id: 'aviao', name: 'Aviãozinho' },
      { id: 'cozinhar', name: 'Cozinhando' },
      { id: 'bolo', name: 'Fazendo bolo' },
      { id: 'dormir', name: 'Dormindo' },
      { id: 'ler', name: 'Lendo' },
      { id: 'banho', name: 'Tomando banho' },
      { id: 'dentes', name: 'Escovando os dentes' },
      { id: 'violao', name: 'Tocando violão' },
      { id: 'bateria', name: 'Tocando bateria' },
      { id: 'pintar', name: 'Pintando' },
      { id: 'malabares', name: 'Malabarismo' },
      { id: 'regar', name: 'Regando' },
      { id: 'flor', name: 'Cheirando flor' },
      { id: 'halteres', name: 'Malhando' },
      { id: 'corda', name: 'Pulando corda' },
      { id: 'experimento', name: 'Experimento' },
      { id: 'telescopio', name: 'Olhando as estrelas' },
      { id: 'videogame', name: 'Videogame' },
      { id: 'pingpong', name: 'Pingue-pongue' },
      { id: 'digitar', name: 'Trabalhando' },
      { id: 'ioga', name: 'Ioga' },
      { id: 'danca', name: 'Dançando' },
      { id: 'cantar', name: 'Cantando' },
      { id: 'martelar', name: 'Martelando' },
      { id: 'serrar', name: 'Serrando' },
      { id: 'massa', name: 'Girando a massa' },
      { id: 'pizza', name: 'Montando a pizza' },
      { id: 'barista', name: 'Passando café' },
      { id: 'cafezinho', name: 'Tomando um cafezinho' },
      { id: 'filme', name: 'Vendo filme em 3D' },
      { id: 'pipoca', name: 'Comendo pipoca' },
      { id: 'podcast', name: 'Gravando um podcast' },
      { id: 'camera', name: 'Filmando' },
      { id: 'costurar', name: 'Costurando' },
      { id: 'medir', name: 'Medindo' },
      { id: 'mascara', name: 'Máscara de pepino' },
      { id: 'sauna', name: 'Na sauna' },
      { id: 'racao', name: 'Alimentando os peixes' },
      { id: 'mergulho', name: 'Mergulhando' },
      { id: 'cavar', name: 'Cavando' },
      { id: 'colher', name: 'Colhendo cenouras' },
      { id: 'boxe', name: 'Socando o saco' },
      { id: 'sombra', name: 'Boxe de sombra' },
      { id: 'skate', name: 'Andando de skate' },
      { id: 'patins', name: 'Patinando' },
      { id: 'equilibrio', name: 'Equilibrando na bola' },
      { id: 'magica', name: 'Mágica' },
      { id: 'drama', name: 'Fazendo drama' },
      { id: 'marionete', name: 'Brincando de marionete' },
      { id: 'bicicleta', name: 'Pedalando' },
      { id: 'chave', name: 'Consertando o motor' },
      { id: 'sovar', name: 'Sovando o pão' },
      { id: 'pao', name: 'Levando pão quente' },
      { id: 'lavar', name: 'Lavando roupa' },
      { id: 'varal', name: 'Estendendo roupa' },
      { id: 'xadrez', name: 'Jogando xadrez' },
      { id: 'quebra', name: 'Quebra-cabeça' },
      { id: 'churrasco', name: 'Fazendo churrasco' },
      { id: 'abanar', name: 'Abanando as brasas' },
      { id: 'lousa', name: 'Escrevendo na lousa' },
      { id: 'ponteiro', name: 'Dando aula' },
      { id: 'medico', name: 'Atendendo' },
      { id: 'resfriado', name: 'Resfriado' },
      { id: 'astronauta', name: 'Flutuando no espaço' },
      { id: 'foguete', name: 'Lançando foguete' },
      { id: 'surfar', name: 'Surfando' },
      { id: 'castelo', name: 'Castelo de areia' },
      { id: 'boneco', name: 'Boneco de neve' },
      { id: 'patinar', name: 'Patinando no gelo' },
      { id: 'robo', name: 'Dançando de robô' },
      { id: 'solda', name: 'Soldando' }
    ],
    names: ['Macaxeira', 'Aipinzinho', 'Tapioca', 'Beiju', 'Farinha', 'Polvilho', 'Tucupi', 'Maniva', 'Goma', 'Puba', 'Carimã', 'Mané', 'Bolinho', 'Nhoque', 'Biscoito', 'Rapadura', 'Quindim', 'Pudim', 'Mingau', 'Fubá', 'Xerém', 'Tutu', 'Virado', 'Acarajé', 'Moqueca', 'Vatapá', 'Caruru', 'Baião', 'Xote', 'Frevo', 'Coquinho', 'Jabuti', 'Tatu', 'Sabiá', 'Caju', 'Jabuticaba', 'Pitanga', 'Umbu', 'Graviola', 'Mangaba', 'Cupuaçu', 'Açaí', 'Buriti', 'Pequi', 'Jenipapo', 'Cambuci', 'Araçá', 'Guaraná', 'Tamarindo', 'Sapoti', 'Cajá', 'Bacuri', 'Taperebá', 'Pipi', 'Zeca', 'Nina', 'Dudu', 'Lulu', 'Tico', 'Bidu', 'Cocada', 'Paçoca', 'Canjica', 'Pamonha', 'Brigadeiro', 'Beijinho', 'Curau', 'Mungunzá', 'Tacacá', 'Farofa', 'Pirão', 'Sequilho']
  },

  // Janelas extras da festa (retângulos soltos, como a Casa da Mandioca): cada uma abre no convidado `start` (o recorde conta,
  // um ano novo não fecha janela nenhuma) e ganha um botão na placa. A Casa abre no convidado 100 (`house.start`). O resto da
  // configuração de cada janela fica no próprio bloco dela, mais abaixo.
  minis: {
    windows: [
      { id: 'cordel', name: 'Cordel da Mandioca', start: 10 },
      { id: 'bichos', name: 'Quintal dos Bichos', start: 12 },
      { id: 'aquario', name: 'Aquário', start: 18 },
      { id: 'horta', name: 'Horta', start: 22 },
      { id: 'fogueira', name: 'Fogueira de Perto', start: 30 },
      { id: 'palco', name: 'Palco do Forró', start: 38 },
      { id: 'mata', name: 'Mata Encantada', start: 50 },
      { id: 'ceu', name: 'Céu de São João', start: 60 },
      { id: 'bairro', name: 'Bairro', start: 75 }
    ],

    // Cordel da Mandioca (convidado 10): o folheto com a história da Mandioca. A cada `every` convidados novos abre uma página (a primeira
    // com 10, a segunda com 20... até `count`); cada página tem uma ilustração animada e uma coisa para clicar: `goal` cliques completam a
    // página, e a primeira vez rende o prêmio de `reward` (Animação por página, Amor e fichas a cada `ticketsEvery` páginas e na última).
    // As páginas 1 a 5 contam um São João bem tradicional, de 6 a 10 a história sai do trilho, de 11 a 15 vira uma loucura épica e de 16 a 20
    // ela acaba na festa do próprio jogo. `arc` é o trecho (0 a 3) e `{n}` no texto vira o número de convidados.
    cordel: {
      every: 10, count: 20,
      reward: { cheer: 20, cheerPerPage: 4, love: 2, ticketsEvery: 5, tickets: 2, finalTickets: 4 },
      pages: [
        { id: 'quintal', arc: 0, goal: 3, sound: 'pesca', title: 'O Quintal ao Amanhecer',
          text: 'Num quintal de terra fofa,\nnasceu uma mandioca miúda.\nO galo cantou três vezes\ne a manhã foi bem-vinda.',
          hint: 'Clique na regadora para molhar a muda.', say: 'GLUG GLUG!', done: 'A MUDA CRESCEU!' },
        { id: 'convite', arc: 0, goal: 3, sound: 'pombo', title: 'O Convite do Vento',
          text: 'Passou um vento faceiro\nlevando um papelzinho:\nera o convite do São João,\ncom bandeira e carinho.',
          hint: 'Clique no convite para pegá-lo no ar.', say: 'QUASE!', done: 'PEGOU O CONVITE!' },
        { id: 'cozinha', arc: 0, goal: 4, sound: 'pote', title: 'A Cozinha da Canjica',
          text: 'Na cozinha da Canjica\no fogão fazia fumaça.\nMexe daqui, mexe de lá,\ne a panela cantava de graça.',
          hint: 'Clique na panela para mexer a canjica.', say: 'MEXE, MEXE!', done: 'FICOU NO PONTO!' },
        { id: 'fogueira', arc: 0, goal: 4, sound: 'estalo', title: 'A Fogueira Acesa',
          text: 'Quando a noite ficou grande\na fogueira se acendeu.\nTodo mundo dançou junto\ne a mandioca cresceu.',
          hint: 'Clique na lenha para jogar uma tora na fogueira.', say: 'ESTALA!', done: 'FOGUEIRA E FESTA!' },
        { id: 'balao', arc: 0, goal: 3, sound: 'crescer', title: 'O Balão de Papel',
          text: 'Soltou um balão de papel\ncom um pedido de coração.\nO balão piscou esquisito\ne subiu sem direção!',
          hint: 'Clique no balão para ele subir.', say: 'SOBE!', done: 'PRA LONGE, MUITO LONGE!' },
        { id: 'lua', arc: 1, goal: 3, sound: 'sapo', title: 'A Lua de Queijo',
          text: 'Subiu, passou nuvem e estrela,\nfoi parar na lua, então.\nE a lua era de queijo coalho,\ncom buraco e cheiro de pão.',
          hint: 'Clique nas crateras para ver quem mora nelas.', say: 'PLOC!', done: 'A LUA TEM MORADOR!' },
        { id: 'dj', arc: 1, goal: 4, sound: 'palco-zabumba', title: 'O Coelho DJ',
          text: 'Na lua morava um coelho\ntocando forró espacial.\nA mandioca dançou tanto\nque ficou tonta e sem sinal.',
          hint: 'Clique na picape do DJ para trocar a música.', say: 'TUNTS TUNTS!', done: 'PISTA EM CHAMAS!' },
        { id: 'submarino', arc: 1, goal: 3, sound: 'apito', title: 'O Submarino de Abóbora',
          text: 'Caiu da lua num mergulho\nno fundo azul do mar.\nEntrou num submarino de abóbora\ncom um peixe pra ajudar.',
          hint: 'Clique no periscópio para o sonar apitar.', say: 'PIIIM!', done: 'ACHOU UM CARDUME!' },
        { id: 'doces', arc: 1, goal: 4, sound: 'carinho', title: 'A Cidade de Cocada',
          text: 'Chegou numa cidade de doce:\ncasa de cocada, rua de paçoca.\nLambeu o poste de pirulito\ne choveu confete e pipoca!',
          hint: 'Clique no pirulito gigante para lambê-lo.', say: 'LAMBE!', done: 'TÁ DOCE DEMAIS!' },
        { id: 'dragao', arc: 1, goal: 3, sound: 'zurro', title: 'O Dragão de Feijão',
          text: 'Mas no meio da cidade\num dragão de feijão acordou.\nSoltou fogo de panela\ne o balão dela roubou!',
          hint: 'Clique no nariz do dragão.', say: 'ATCHIM!', done: 'O DRAGÃO ESPIROU!' },
        { id: 'relogios', arc: 2, goal: 4, sound: 'sino', title: 'A Guerra dos Relógios',
          text: 'No reino dos mil relógios\no tempo virou do avesso.\nA mandioca, de capa e coragem,\njurou: Eu paro esse tropeço!',
          hint: 'Clique no relógio gigante para parar o tempo.', say: 'TIC TAC!', done: 'O TEMPO PAROU!' },
        { id: 'coliseu', arc: 2, goal: 4, sound: 'grito', title: 'O Coliseu das Mil Mandiocas',
          text: 'No Coliseu das Mandiocas\no povo gritava: Atacar!\nCada uma tinha um sabor\ne todas queriam lutar.',
          hint: 'Clique na plateia para fazer a ola.', say: 'OLÁ, OLA!', done: 'A OLA DEU A VOLTA!' },
        { id: 'galaxia', arc: 2, goal: 4, sound: 'drones', title: 'A Via Láctea de Pamonha',
          text: 'A galáxia era de pamonha,\nde palha, milho e creme.\nPlaneta de melancia girava\ne a mandioca surfava no cometa.',
          hint: 'Clique nos planetas para fazê-los girar.', say: 'GIRA!', done: 'TUDO EM ÓRBITA!' },
        { id: 'rei', arc: 2, goal: 5, sound: 'trovao', title: 'O Rei Mandiocão',
          text: 'No trono de raiz e raio\nsentou o Rei Mandiocão.\nMas a faísca da fogueira\nvirou espada em sua mão.',
          hint: 'Clique na espada para carregar a faísca.', say: 'ZZZAP!', done: 'ESPADA CARREGADA!' },
        { id: 'bigbang', arc: 2, goal: 3, sound: 'drones', title: 'O Big Bang Junino',
          text: 'Bum! A faísca explodiu\nnum mar de fogos de artifício.\nO rei virou confete e festa\ne o universo, um bom início.',
          hint: 'Clique na faísca para a explosão.', say: 'BUM!', done: 'UNIVERSO NOVO!' },
        { id: 'bandeirinhas', arc: 3, goal: 5, sound: 'palco-sanfona', title: 'O Caminho de Bandeirinhas',
          text: 'Das estrelas brotou uma trilha\nde bandeirinhas a tremular.\nLá longe tocava uma sanfona\ne deu vontade de chegar.',
          hint: 'Clique nas bandeirinhas para tocar as notas.', say: 'DÓ RÉ MI!', done: 'A MÚSICA DEU O CAMINHO!' },
        { id: 'arcoiris', arc: 3, goal: 3, sound: 'arcoiris', title: 'A Ponte do Arco-íris',
          text: 'Um arco-íris de milho e doce\nfez uma ponte no ar.\nE lá embaixo, bem pequena,\na festa a brilhar.',
          hint: 'Clique no arco-íris para ele brilhar.', say: 'BRILHA!', done: 'A PONTE ACENDEU!' },
        { id: 'portao', arc: 3, goal: 3, sound: 'sino', title: 'O Portão do Arraiá',
          text: 'Chegou no portão do arraiá\nde lanterna na mão.\nO povo gritou: Chegou!\ne abriu alas, de coração.',
          hint: 'Clique no sino do portão.', say: 'DOOOM!', done: 'CHEGOU!' },
        { id: 'quadrilha', arc: 3, goal: 4, sound: 'grito', title: 'A Quadrilha de Todo Mundo',
          text: 'Juntou o coelho, o dragão e o rei\nnuma quadrilha de arrasar.\nAnarriê! gritou a marcadora\ne o mundo inteiro a dançar.',
          hint: 'Clique na marcadora para gritar anarriê.', say: 'ANARRIÊ!', done: 'TODO MUNDO GIROU!' },
        { id: 'festa', arc: 3, goal: 5, sound: 'quebra', title: 'A Festa É Sua',
          text: 'E a festa que ela buscou\né essa que você faz:\nfogueira, sanfona e bandeira\ncom {n} convidados e mais!',
          hint: 'Clique para soltar os fogos da sua festa.', say: 'POU POU!', done: 'A FESTA É SUA!' }
      ]
    },

    // Quintal dos Bichos (convidado 12): os bichos do cenário da festa moram num quintal. Carinho e milho enchem o laço de cada
    // um (`bond`); com o laço cheio ele dá um presente (clique no presente), e só dá outro depois de `giftWait` s. O carinho
    // também enche o Amor da Mandioca. Os grãos de milho (`grainMax`, um novo a cada `grainEvery` s) chamam o bicho mais perto.
    bichos: {
      grainMax: 5, grainEvery: 15, petCooldown: 5, bondMax: 10, petBond: 1, grainBond: 2, giftWait: 420, lovePet: 3,
      pets: [
        { id: 'galinha', scenery: 'galinha', name: 'Galinha', gift: 'ovo', giftName: 'um ovo fresquinho', reward: { tickets: 2 } },
        { id: 'gato', scenery: 'gato', name: 'Gato dorminhoco', gift: 'rato', giftName: 'um ratinho de pano', reward: { cheer: 90 } },
        { id: 'bode', scenery: 'bode', name: 'Bode', gift: 'leite', giftName: 'uma garrafa de leite', reward: { belly: 25 } },
        { id: 'caramelo', scenery: 'caramelo', name: 'Vira-lata caramelo', gift: 'graveto', giftName: 'um graveto para a fogueira', reward: { wood: 3 } },
        { id: 'papagaio', scenery: 'papagaio', name: 'Papagaio fofoqueiro', gift: 'carta', giftName: 'uma fofoca escrita', reward: { tickets: 1, love: 4 } },
        { id: 'jegue', scenery: 'jegue', name: 'Jegue da manta azul', gift: 'cesta', giftName: 'uma cesta de prendas', reward: { wood: 4, tickets: 1 } },
        { id: 'boi', scenery: 'boi', name: 'Bumba-meu-boi', gift: 'fita', giftName: 'uma fita de campeão', reward: { cheer: 300, tickets: 2 } }
      ]
    },

    // Aquário (convidado 18): cada prenda fisgada na pescaria solta um peixe no tanque (3 de saída). Ração faz o peixe crescer
    // (`growth`: quantas rações para virar médio e depois grande); peixe grande solta, de tempos em tempos (`bubbleEvery` s, dividido
    // pelos grandes), uma bolha dourada que rende Animação (`bubbleCheer` s da festa) e, às vezes, uma ficha. Cada espécie nova rende
    // fichas; as 12 juntas rendem o prêmio da coleção. A raridade (`rarity`) sorteia a espécie com as chances de `rarityChance`.
    aquario: {
      tankMax: 14, starter: 3, foodMax: 6, foodEvery: 20, growth: [3, 6], bubbleEvery: 1800, bubbleMax: 6, bubbleCheer: 20, bubbleTicketChance: 0.1,
      discoverTickets: 3, completeReward: { cheer: 600, tickets: 10 }, rarityChance: [0.55, 0.3, 0.12, 0.03],
      species: [
        { id: 'lambari', name: 'Lambari', rarity: 0 }, { id: 'piaba', name: 'Piaba', rarity: 0 }, { id: 'tilapia', name: 'Tilápia', rarity: 0 },
        { id: 'acara', name: 'Acará-bandeira', rarity: 0 }, { id: 'bagre', name: 'Bagre', rarity: 1 }, { id: 'traira', name: 'Traíra', rarity: 1 },
        { id: 'pacu', name: 'Pacu', rarity: 1 }, { id: 'tucunare', name: 'Tucunaré', rarity: 1 }, { id: 'dourado', name: 'Dourado', rarity: 2 },
        { id: 'pintado', name: 'Pintado', rarity: 2 }, { id: 'piranha', name: 'Piranha', rarity: 2 }, { id: 'pirarucu', name: 'Pirarucu', rarity: 3 }
      ]
    },

    // Horta (convidado 22): canteiros onde a Mandioca planta (a semente é de graça). Cada planta leva `minutes` para ficar no ponto
    // (também com o jogo fechado) e rende o prêmio dela; regar corta `waterCut` do que falta (até `waterLimit` vezes por planta,
    // com a regadora que volta a cada `waterEvery` s). A horta começa com `plotsStart` canteiros e ganha um a cada `plotEvery`
    // convidados depois da abertura, até `plotMax`. De tempos em tempos (`crowEvery` s) um corvo pousa num canteiro: se ninguém
    // espantar em `crowSeconds` s, ele come a planta (o Espantalho Galã num dos lados da festa afasta os corvos). A primeira colheita
    // de cada planta rende `firstHarvest` a mais e deixa para sempre `permanentPct`% de Animação (por planta: com as 5, +50%; fica de
    // um ano para o outro). Toda colheita dá também o `buff` da planta por `buffMinutes` min (`kind`: `cheer` = Animação, `speed` =
    // Ritmo, `recovery` = Refresco, `crit` = chance de “Olha a cobra!”; colher a mesma planta de novo recomeça a contagem dela e
    // plantas diferentes somam). As plantas mais demoradas dão o bônus maior.
    // Além disso (tudo no prêmio das colheitas, sem mexer nos bônus acima; as fichas do prêmio só ganham a sorte, o resto vale para tudo):
    // - Vizinhas amigas (`friends`: pares de plantas que se gostam): cada vizinha amiga ao lado (em cima, embaixo, esquerda ou direita)
    //   no dia da colheita rende `friendBonus` a mais no prêmio, até `friendMax`.
    // - Sorte (sorteada na hora de plantar): a planta pode nascer em dobro (`luck.double`: o prêmio vale `doubleMult` vezes) ou dourada
    //   (`luck.golden`: vale `goldenMult` vezes e dá `goldenTickets` fichas).
    // - Combo: colher de novo em até `combo.window` s da colheita anterior soma `combo.step` ao prêmio, até `combo.max` colheitas seguidas.
    // - Planta em alta (uma por dia, a que muda à meia-noite): a colheita dela rende `daily.bonus` a mais. O arco-íris da festa chama a borboleta.
    // - Chuva de São João: enquanto chove na festa, a horta cresce mais depressa (`rainBoost` s a mais por segundo) e a regadora enche
    //   uma vez a cada `rainWater` s.
    // - Borboleta da sorte (a cada `butterfly.every` s, se tem planta crescendo): voa pela horta por `butterfly.seconds` s; quem pegar
    //   corta `butterfly.skip` do que falta da planta mais atrasada e ganha `butterfly.reward`.
    // - Encomendas da feira: `orders.slots` pedidos ao mesmo tempo (`order` de cada planta: quantas unidades de `n[0]` a `n[1]` e quanto de
    //   Animação por unidade, em segundos da festa); cada colheita da planta pedida conta, e ao completar o pedido vêm fichas
    //   (`orders.tickets`, mais `orders.bigTickets` se pediu `orders.bigAt` ou mais) e a Animação. O próximo pedido chega de `orders.wait` s depois.
    horta: {
      plotsStart: 4, plotEvery: 10, plotMax: 10, waterMax: 5, waterEvery: 20, waterCut: 0.2, waterLimit: 2,
      crowEvery: [480, 900], crowSeconds: 25, crowReward: { cheer: 40 }, firstHarvest: { tickets: 2 }, permanentPct: 10, buffMinutes: 10,
      friendBonus: 0.25, friendMax: 0.5,
      friends: [['milho', 'abobora'], ['abobora', 'mandioca'], ['mandioca', 'batata-doce'], ['batata-doce', 'amendoim'], ['amendoim', 'milho']],
      luck: { double: 0.12, golden: 0.04 }, doubleMult: 2, goldenMult: 3, goldenTickets: 3,
      combo: { window: 3, step: 0.1, max: 5 },
      rainBoost: 1, rainWater: 5, daily: { bonus: 0.5 },
      butterfly: { every: [150, 330], seconds: 14, skip: 0.4, reward: { love: 1 } },
      orders: { slots: 2, wait: [30, 70], tickets: 1, bigTickets: 1, bigAt: 4 },
      crops: [
        { id: 'milho', name: 'Milho', minutes: 4, reward: { tickets: 1, belly: 8 }, buff: { kind: 'cheer', value: 0.1 }, order: { n: [3, 5], cheer: 8 } },
        { id: 'amendoim', name: 'Amendoim', minutes: 8, reward: { wood: 2, belly: 6 }, buff: { kind: 'speed', value: 0.15 }, order: { n: [2, 4], cheer: 12 } },
        { id: 'batata-doce', name: 'Batata-doce', minutes: 12, reward: { belly: 18, love: 2 }, buff: { kind: 'recovery', value: 0.5 }, order: { n: [2, 3], cheer: 18 } },
        { id: 'mandioca', name: 'Mandioca', minutes: 15, reward: { cheer: 120, love: 3 }, buff: { kind: 'cheer', value: 0.25 }, order: { n: [2, 3], cheer: 30 } },
        { id: 'abobora', name: 'Abóbora', minutes: 25, reward: { tickets: 3, cheer: 60 }, buff: { kind: 'crit', value: 0.15 }, order: { n: [1, 2], cheer: 40 } }
      ]
    },

    // Fogueira de Perto (convidado 30): a fogueira em close. Lenha (`heatPerWood`) acende o fogo, que esfria `heatLoss` por segundo;
    // com calor a partir de `minHeat` os espetos assam (quanto mais quente, mais depressa: de 40% a 100% da velocidade). Cada comida
    // assa em `seconds` s no calor cheio e, ao ficar pronta, espera para ser comida: não queima nem passa do ponto. Comer rende o
    // `reward` da comida e deixa a Barriga da Mandioca 100% cheia e parada por `bellyHold` horas (só começa a baixar depois). Pular a
    // fogueira (com calor a partir de `jumpMinHeat`) rende `jump` e espera `jumpWait` s. Gasta lenha, não rende ficha à toa.
    fogueira: {
      heatMax: 100, heatPerWood: 20, heatLoss: 0.15, minHeat: 15, slots: 4,
      jumpWait: 90, jumpMinHeat: 30, jump: { cheer: 45, love: 3 }, bellyHold: 2,
      foods: [
        { id: 'milho', name: 'Milho assado', seconds: 60, reward: { cheer: 40 } },
        { id: 'batata', name: 'Batata-doce assada', seconds: 90, reward: { wood: 4 } },
        { id: 'linguica', name: 'Linguiça', seconds: 75, reward: { cheer: 80 } },
        { id: 'queijo', name: 'Queijo coalho', seconds: 45, reward: { love: 8 } }
      ]
    },

    // Palco do Forró (convidado 38): o trio toca e você marca o ritmo. Cada música cai em 3 pistas (triângulo, zabumba e sanfona);
    // clicar na pista na hora certa acerta (perfeito até `perfect` ms de diferença, bom até `good`). No fim a nota (acertos
    // perfeitos valem 3, bons 2, sobre 3 por nota) dá 0 a 3 estrelas (`stars`: o mínimo de cada uma) e o prêmio de `rewards`; a
    // primeira vez que uma música tira 3 estrelas rende `firstThree` a mais. Depois de um show premiado o palco descansa `wait` s
    // (dá para ensaiar nesse tempo, sem prêmio). Cada música só abre depois de 1 estrela na anterior. As notas saem de `seed`
    // (sempre as mesmas) a cada meio tempo, `lead` ms depois de começar. Cada música tem a sua trilha (src/som.js, no mesmo `bpm`); `key` é
    // quantos semitons a tonalidade dela fica abaixo do sol, para o acorde de sanfona da pista casar com a trilha.
    palco: {
      lead: 2200, travel: 1700, perfect: 80, good: 150, wait: 480, stars: [0.45, 0.7, 0.9],
      rewards: [{}, { cheer: 60 }, { cheer: 150, love: 3 }, { cheer: 300, love: 6, tickets: 1 }], firstThree: { tickets: 2 },
      songs: [
        { id: 'xote', name: 'Xote da Mandioca', bpm: 100, notes: 26, seed: 11, key: 0 },
        { id: 'baiao', name: 'Baião Quentinho', bpm: 118, notes: 34, seed: 23, key: -5 },
        { id: 'forro-ouro', name: 'Forró de Ouro', bpm: 136, notes: 42, seed: 37, key: -7 },
        { id: 'arrasta-pe', name: 'Arrasta-pé', bpm: 150, notes: 52, seed: 41, key: -5 }
      ]
    },

    // Céu de São João (convidado 60): o céu da festa à noite. Foguetes (até `rocketMax`, um novo a cada `rocketEvery` s) sobem onde
    // você clicar e rendem `rocketCheer` s de Animação; `volley` foguetes em `volleyMs` ms fazem a Grande Final (`finale`, no máximo
    // uma a cada `finaleWait` s). A cada `starEvery` s uma estrela cadente cruza o céu por `starSeconds` s: clique nela para fazer
    // um pedido (um dos `wishes`, sorteado). A cada `simpatiaWait` s dá para fazer uma simpatia: escolha uma de 3 cartas e valha o
    // prêmio dela (`frenzy` é o frenesi, em segundos).
    ceu: {
      rocketMax: 6, rocketEvery: 40, rocketCheer: 10, volley: 4, volleyMs: 12000, finale: { cheer: 60, tickets: 1 }, finaleWait: 300,
      starEvery: [180, 360], starSeconds: 5, wishes: [{ cheer: 90 }, { tickets: 2 }, { wood: 4 }, { love: 6 }, { belly: 20 }],
      simpatiaWait: 10800,
      simpatias: [
        { id: 'faca', name: 'Faca na bananeira', text: 'Crava a faca na bananeira e, de manhã, o nome do amor aparece no corte.', reward: { love: 15 } },
        { id: 'alianca', name: 'Aliança no copo', text: 'Pendura a aliança num fio dentro do copo d’água: as batidas contam os anos de sorte.', reward: { tickets: 3 } },
        { id: 'ovo', name: 'Clara de ovo', text: 'Põe a clara na água ao sereno e de manhã ela desenha o futuro da festa.', reward: { cheer: 150 } },
        { id: 'agulha', name: 'Agulha na água', text: 'Se a agulha boiar na bacia, o ano vem de sorte.', reward: { tickets: 2, love: 4 } },
        { id: 'milho', name: 'Espiga de cabelo comprido', text: 'Quem acha espiga com cabelo comprido tem fartura na mesa o ano inteiro.', reward: { belly: 30 } },
        { id: 'fogueira', name: 'Pular três vezes', text: 'Pula a fogueira três vezes sem olhar para trás e o frio passa.', reward: { wood: 8 } },
        { id: 'cebola', name: 'Cebola na cabeceira', text: 'Dorme com a cebola no travesseiro e sonha com a festa do ano que vem.', reward: { cheer: 90, love: 6 } },
        { id: 'banho', name: 'Banho de ervas', text: 'Banho de alecrim e manjericão na noite de São João: dá um gás danado!', frenzy: 15 },
        { id: 'papel', name: 'Papelzinho com nomes', text: 'Escreve os nomes no papelzinho, põe debaixo da fronha e o primeiro que cair é o escolhido.', reward: { tickets: 2, cheer: 40 } },
        { id: 'estalinho', name: 'Estalinho contra mau-olhado', text: 'Estalinho no chão espanta o mau-olhado e acorda a alegria.', reward: { cheer: 120 } }
      ]
    },

    // Bairro (convidado 75): a rua onde mora a turma (uma casa para cada integrante que a Mandioca já pescou, na ordem de
    // `data.chars`). Visitar um vizinho rende `giftBase` s de Animação mais `giftPerLevel` s por nível dele, com um recado (uma das
    // cartas do correio elegante), e cada vizinho só recebe visita de novo depois de `visitWait` s; a cada `ticketEvery` visitas
    // seguidas ao mesmo vizinho ele dá também uma ficha. Quem está no rolê não está em casa.
    bairro: {
      visitWait: 2400, giftBase: 20, giftPerLevel: 4, ticketEvery: 4
    },

    // Mata Encantada (convidado 50): um auto battler. A Mandioca enfrenta criaturas do folclore em etapas de `battles` batalhas mais
    // um chefe (a batalha de um grupo de 1 a 4 criaturas), enquanto a janela está visível. Os 4 atributos viram status (Rebolado: Ataque,
    // Fôlego: Vida, Refresco: Defesa e o descanso entre as batalhas, Ritmo: velocidade), a Barriga mexe na Vida e o Amor no Ataque (de
    // -`moodPercent`% a +`moodPercent`%, e o Amor também aumenta a chance de acerto crítico) e um bicho do Quintal pode acompanhar:
    // todos dão o mesmo bônus em tudo (`petPercent`% no máximo), proporcional ao laço dele. Cada derrota seguida dá `teimosiaPercent`%
    // a mais (até `teimosiaMax` vezes) até a etapa cair. Vitórias rendem Animação (segundos da festa), os chefes também rendem
    // fichas e lenha, e cada batalha gasta um pouquinho de Barriga e devolve um pouquinho de Amor. `unlocks` é a lista de itens que a
    // primeira vitória sobre o chefe da etapa (`stage`) libera para a Mandioca vestir. Depois da última etapa da lista as etapas
    // repetem os chefes, cada vez mais fortes (o crescimento é por etapa, sem fim).
    mata: {
      battles: 4, petPercent: 20, moodPercent: 20, teimosiaPercent: 3, teimosiaMax: 5, specialEvery: 8,
      hero: { hpBase: 40, hpPerLevel: 3, atkBase: 5, atkPerLevel: 0.7, intervalBase: 2, speedPerLevel: 0.02, minInterval: 0.4, defHalf: 150,
        defMax: 0.6, restHeal: 0.15, restDef: 0.2, critBase: 0.05, critLove: 0.2, critMult: 2, specialMult: 1.6, specialHeal: 0.05 },
      foe: { hp: 150, atk: 9, hpGrowth: 1.18, atkGrowth: 1.16, step: 0.12, bossHp: 5, bossAtk: 1.8, crowdShare: 0.4, escortShare: 0.7 },
      reward: { cheer: 1.2, cheerPerStage: 0.12, bossMult: 3, love: 0.15, loveBoss: 0.6, firstClear: { tickets: 2, wood: 3 }, bossWood: 1,
        ticketEvery: 15, belly: 0.15, bellyBoss: 0.5 },
      creatures: [
        { id: 'fogo-fatuo', name: 'Fogo-fátuo', lore: 'Luzinha azul que dança nos pântanos e faz o viajante se perder.', hp: 0.55, atk: 0.8, interval: 1.5, powers: [{ kind: 'burn', every: 3, dur: 4, dps: 0.2 }] },
        { id: 'mao-de-cabelo', name: 'Mão-de-cabelo', lore: 'Mão cabeluda que sai do escuro e agarra quem passa distraído.', hp: 0.8, atk: 0.9, interval: 1.8, powers: [{ kind: 'slow', every: 3, dur: 4, factor: 1.6 }] },
        { id: 'cabeca-de-cuia', name: 'Cabeça-de-cuia', lore: 'Dizem que era um homem castigado: a cabeça virou uma cuia assustadora.', hp: 0.9, atk: 1, interval: 2, powers: [{ kind: 'weak', every: 3, dur: 5, factor: 0.7 }] },
        { id: 'boto', name: 'Boto Cor-de-Rosa', lore: 'De dia é boto rosa; de noite vira rapaz de chapéu para encantar as moças da festa.', hp: 1, atk: 0.8, interval: 1.9, powers: [{ kind: 'confuse', every: 3, dur: 4 }] },
        { id: 'anhanga', name: 'Anhangá', lore: 'Espírito do veado branco de olhos de brasa, protetor dos bichos do mato.', hp: 1.1, atk: 1.1, interval: 2, powers: [{ kind: 'burn', every: 4, dur: 5, dps: 0.3 }] },
        { id: 'boi-cara-preta', name: 'Boi da Cara Preta', lore: 'O boi da cantiga de ninar, que vem pegar criança que não quer dormir.', hp: 1.5, atk: 1.2, interval: 2.4, powers: [{ kind: 'charge', every: 3, mult: 2.2 }] },
        { id: 'pisadeira', name: 'Pisadeira', lore: 'Velha magrela de unhas enormes que pisa no peito de quem dorme de barriga cheia.', hp: 0.9, atk: 1, interval: 2.2, powers: [{ kind: 'stun', every: 3, dur: 1.2 }] },
        { id: 'homem-do-saco', name: 'Homem do Saco', lore: 'O velho do saco, que leva embora criança desobediente.', hp: 1.2, atk: 0.9, interval: 2.2, powers: [{ kind: 'stun', every: 4, dur: 1.6 }] },
        { id: 'corpo-seco', name: 'Corpo-seco', lore: 'Gente má que a terra não quis: ficou seca, de casca dura, e anda por aí.', hp: 1.4, atk: 1.1, interval: 2, powers: [{ kind: 'drain', share: 0.5 }] }
      ],
      bosses: [
        { id: 'curupira', name: 'Curupira', lore: 'Protetor da mata, tem o cabelo de fogo e os pés virados para trás para despistar caçador.', hp: 1, atk: 1, interval: 2, powers: [{ kind: 'confuse', every: 4, dur: 5 }] },
        { id: 'caipora', name: 'Caipora', lore: 'Guardiã dos bichos, anda montada num porco-do-mato e adora um fumo de rolo.', hp: 1.1, atk: 1, interval: 2, powers: [{ kind: 'slow', every: 3, dur: 4, factor: 1.7 }, { kind: 'charge', every: 5, mult: 2.5 }] },
        { id: 'iara', name: 'Iara', lore: 'A mãe-d’água que canta nos rios e leva para o fundo quem se deixa encantar.', hp: 1.1, atk: 0.9, interval: 2, powers: [{ kind: 'stun', every: 4, dur: 1.5 }, { kind: 'heal', every: 6, share: 0.12 }] },
        { id: 'boitata', name: 'Boitatá', lore: 'A cobra de fogo que vigia os campos e castiga quem queima a mata.', hp: 1.2, atk: 1, interval: 1.8, powers: [{ kind: 'burn', every: 2, dur: 5, dps: 0.3 }] },
        { id: 'mula-sem-cabeca', name: 'Mula-sem-cabeça', lore: 'Mula que galopa pelas noites com uma labareda no lugar da cabeça.', hp: 1.2, atk: 1.1, interval: 2, powers: [{ kind: 'charge', every: 3, mult: 2.4 }, { kind: 'burn', every: 4, dur: 4, dps: 0.25 }] },
        { id: 'lobisomem', name: 'Lobisomem', lore: 'Na noite de lua cheia, o homem vira lobo e uiva pelos terreiros.', hp: 1.3, atk: 1.2, interval: 1.9, powers: [{ kind: 'enrage', below: 0.5, atk: 1.4, speed: 0.8 }, { kind: 'drain', share: 0.25 }] },
        { id: 'cuca', name: 'Cuca', lore: 'A velha jacaré do sítio, que canta de ninar e leva criança que não dorme.', hp: 1.3, atk: 1.1, interval: 2, powers: [{ kind: 'weak', every: 3, dur: 6, factor: 0.6 }, { kind: 'stun', every: 6, dur: 1.5 }] },
        { id: 'mapinguari', name: 'Mapinguari', lore: 'Gigante peludo de um olho só e boca na barriga, cujo fedor se sente de longe.', hp: 1.6, atk: 1.2, interval: 2.4, powers: [{ kind: 'weak', every: 2, dur: 5, factor: 0.7 }, { kind: 'charge', every: 5, mult: 2.5 }] },
        { id: 'boiuna', name: 'Boiúna', lore: 'A cobra grande do rio, preta e enorme, com olhos que brilham como lanternas.', hp: 1.35, atk: 1.15, interval: 2, powers: [{ kind: 'stun', every: 4, dur: 2 }, { kind: 'poison', every: 2, dur: 5, dps: 0.25 }] },
        { id: 'boi-bumba', name: 'Boi-Bumbá', lore: 'O boi da festa que morre e ressuscita, e faz o arraiá inteiro dançar.', hp: 1.2, atk: 1.15, interval: 2, powers: [{ kind: 'revive', hp: 0.5 }, { kind: 'charge', every: 4, mult: 2.2 }, { kind: 'confuse', every: 3, dur: 3 }] }
      ],
      stages: [
        { id: 'mata-fechada', name: 'Mata Fechada', boss: 'curupira', mobs: ['fogo-fatuo', 'mao-de-cabelo'] },
        { id: 'clareira', name: 'Clareira da Caipora', boss: 'caipora', mobs: ['fogo-fatuo', 'mao-de-cabelo', 'cabeca-de-cuia'] },
        { id: 'beira-do-rio', name: 'Beira do Rio', boss: 'iara', mobs: ['boto', 'cabeca-de-cuia', 'mao-de-cabelo'] },
        { id: 'campo-queimado', name: 'Campo Queimado', boss: 'boitata', mobs: ['fogo-fatuo', 'anhanga', 'boi-cara-preta'] },
        { id: 'encruzilhada', name: 'Encruzilhada', boss: 'mula-sem-cabeca', mobs: ['boi-cara-preta', 'pisadeira', 'homem-do-saco'] },
        { id: 'lua-cheia', name: 'Noite de Lua Cheia', boss: 'lobisomem', mobs: ['corpo-seco', 'pisadeira', 'anhanga'] },
        { id: 'casa-da-cuca', name: 'Casa da Cuca', boss: 'cuca', mobs: ['pisadeira', 'homem-do-saco', 'corpo-seco'] },
        { id: 'brejo', name: 'Brejo Fedorento', boss: 'mapinguari', mobs: ['corpo-seco', 'mao-de-cabelo', 'boto'] },
        { id: 'rio-negro', name: 'Rio Negro', boss: 'boiuna', mobs: ['boto', 'cabeca-de-cuia', 'anhanga'] },
        { id: 'arraia-encantado', name: 'Arraiá Encantado', boss: 'boi-bumba', mobs: ['fogo-fatuo', 'boi-cara-preta', 'pisadeira', 'corpo-seco', 'boto'] }
      ],
      unlocks: [
        { item: 'cabelo-curupira', stage: 1 }, { item: 'tocha-caipora', stage: 2 }, { item: 'coroa-iara', stage: 3 },
        { item: 'varal-boitata', stage: 4 }, { item: 'ferradura-fogo', stage: 5 }, { item: 'capuz-lobisomem', stage: 6 },
        { item: 'caldeirao-cuca', stage: 7 }, { item: 'brejo-mapinguari', stage: 8 }, { item: 'cobra-grande', stage: 9 },
        { item: 'capa-boi-bumba', stage: 10 }, { item: 'clareira-encantada', stage: 15 }, { item: 'chapeu-boto', stage: 20 }
      ]
    },

    // Visitas do folclore (convidado 50 em diante, depois da primeira criatura derrotada na Mata Encantada): de tempos em tempos
    // (`every` s, sorteado) uma das criaturas que a Mandioca já enfrentou passa pela festa por `seconds` s e quem clicar nela pega o prêmio
    // (`reward`; a Cuca sorteia um de `pick`). São 20 eventos, um por criatura (as 9 comuns e os 10 chefes) e o Desfile Encantado, que só vem
    // com todas elas. Cada um abre quando a criatura (`creature`) é derrotada pela primeira vez, e isso fica guardado para sempre.
    // Depois do clique a criatura fica `exit` ms para ir embora. `motion` diz como ela anda (src/festa-folclore.js): voa, rasteja,
    // rola, surge (fica no lugar), salta, cruza, mastro, galopa, orbita (em volta da fogueira), sobe, dança e desfile.
    folclore: {
      every: [300, 600], exit: 1800, wake: [30, 120],
      events: [
        { id: 'luzinha', creature: 'fogo-fatuo', seconds: 24, motion: 'voa', reward: { cheer: 25 }, name: 'Luzinha na Noite', say: 'OLHA A LUZINHA!', text: 'O Fogo-fátuo deixou uma faísca de sorte.' },
        { id: 'mao', creature: 'mao-de-cabelo', seconds: 28, motion: 'rasteja', reward: { tickets: 2 }, name: 'Mão Fujona', say: 'PSIU... PSIU...', text: 'A Mão-de-cabelo largou o que tinha agarrado.' },
        { id: 'cuia', creature: 'cabeca-de-cuia', seconds: 18, motion: 'rola', reward: { wood: 5 }, name: 'Cuia Rolante', say: 'ROLA, CUIA!', text: 'A Cabeça-de-cuia rolou e deixou lenha pelo caminho.' },
        { id: 'boto', creature: 'boto', seconds: 30, motion: 'surge', reward: { love: 5, cheer: 15 }, name: 'Boto Dançarino', say: 'BORA DANCAR?', text: 'Uma dança com o Boto e o coração ficou leve.' },
        { id: 'veado', creature: 'anhanga', seconds: 16, motion: 'salta', reward: { belly: 14, love: 2 }, name: 'Veado Branco', say: 'O VEADO BRANCO!', text: 'O Anhangá cuidou dos bichos e da barriga da Mandioca.' },
        { id: 'boi', creature: 'boi-cara-preta', seconds: 30, motion: 'cruza', reward: { tickets: 2, love: 1 }, name: 'Boi da Cara Preta', say: 'DORME, NENE...', text: 'O boi cantou de ninar e a festa ganhou fichas.' },
        { id: 'pisadeira', creature: 'pisadeira', seconds: 28, motion: 'mastro', reward: { cheer: 40 }, name: 'Pisadeira no Mastro', say: 'UUUI... SAI DAI!', text: 'A Pisadeira correu do mastro e deixou Animação.' },
        { id: 'saco', creature: 'homem-do-saco', seconds: 26, motion: 'cruza', reward: { tickets: 2, wood: 3 }, name: 'Homem do Saco', say: 'CORRE, MENINADA!', text: 'O Homem do Saco largou o saco e saiu correndo.' },
        { id: 'seco', creature: 'corpo-seco', seconds: 30, motion: 'surge', reward: { wood: 8 }, name: 'Corpo-seco', say: 'SECO... SECO...', text: 'O Corpo-seco virou pó e sobrou lenha seca.' },
        { id: 'curupira', creature: 'curupira', seconds: 28, motion: 'cruza', reward: { cheer: 50, love: 3 }, name: 'Passos do Curupira', say: 'PASSOS AO CONTRARIO!', text: 'O Curupira abençoou a festa antes de sumir na mata.' },
        { id: 'caipora', creature: 'caipora', seconds: 10, motion: 'galopa', reward: { wood: 8, tickets: 1 }, name: 'Caipora Passando', say: 'FUMO, FUMO!', text: 'A Caipora jogou lenha da garupa do porco-do-mato.' },
        { id: 'iara', creature: 'iara', seconds: 30, motion: 'surge', reward: { love: 6, belly: 10 }, name: 'Canto da Iara', say: 'OUCA O CANTO...', text: 'A Iara cantou e a festa inteira ficou apaixonada.' },
        { id: 'boitata', creature: 'boitata', seconds: 30, motion: 'orbita', reward: { wood: 10, cheer: 20 }, name: 'Boitatá na Fogueira', say: 'FOGO NA MATA!', text: 'O Boitatá avivou a fogueira e deixou lenha e brasa.' },
        { id: 'mula', creature: 'mula-sem-cabeca', seconds: 9, motion: 'galopa', reward: { tickets: 3 }, name: 'Galope da Mula', say: 'TIM-TIM-TIM!', text: 'A Mula-sem-cabeça perdeu uma ferradura de sorte.' },
        { id: 'lobisomem', creature: 'lobisomem', seconds: 26, motion: 'surge', reward: { cheer: 70 }, name: 'Uivo na Lua', say: 'AUUUUUUU!', text: 'O Lobisomem uivou e a festa ganhou ânimo.' },
        { id: 'cuca', creature: 'cuca', seconds: 34, motion: 'surge', pick: [{ tickets: 3 }, { cheer: 90 }, { wood: 8 }, { love: 7 }, { belly: 25 }], name: 'Caldeirão da Cuca', say: 'HI HI HI HI!', text: 'A Cuca mexeu o caldeirão e saiu uma poção.' },
        { id: 'mapinguari', creature: 'mapinguari', seconds: 32, motion: 'cruza', reward: { belly: 20, cheer: 40 }, name: 'Fedor do Mapinguari', say: 'QUE FEDOR!', text: 'O Mapinguari soltou um pé-de-moleque e foi embora.' },
        { id: 'boiuna', creature: 'boiuna', seconds: 30, motion: 'sobe', reward: { tickets: 4 }, name: 'Olhos da Boiúna', say: 'OLHOS DE LANTERNA!', text: 'A Boiúna piscou os olhos e escorregaram fichas.' },
        { id: 'bumba', creature: 'boi-bumba', seconds: 32, motion: 'dança', reward: { frenzy: 12, cheer: 60 }, name: 'Boi-Bumbá Dançando', say: 'VIVA O BOI!', text: 'O Boi-Bumbá ressuscitou a festa inteira.' },
        { id: 'desfile', creature: null, seconds: 44, motion: 'desfile', reward: { tickets: 5, cheer: 150, love: 6, frenzy: 15 }, name: 'Desfile Encantado', say: 'DESFILE ENCANTADO!', text: 'Toda a bicharada do folclore desfilou na festa.' }
      ]
    }
  },

  recipes: [
    { id: 'pamonha', name: 'Pamonha', wood: 4, minutes: 3, bonus: 0.2, buffMinutes: 15,
      desc: 'Milho verde ralado, cozido na palha e amarradinho.' },
    { id: 'curau', name: 'Curau', wood: 10, minutes: 8, bonus: 0.35, buffMinutes: 25,
      desc: 'Creme de milho verde com canela por cima.' },
    { id: 'pe-de-moleque', name: 'Pé-de-moleque', wood: 25, minutes: 20, bonus: 0.5, buffMinutes: 60,
      desc: 'Amendoim torrado no melado de rapadura.' }
  ],

  bonfire: [
    { id: 'labareda', name: 'Labareda', text: 'A cada 60 s a fogueira sobe por 8 s: Animação +{v}%.' },
    { id: 'brasa', name: 'Brasa Viva', text: 'Depois do descanso, 6 s de Animação +{v}%.' },
    { id: 'calor', name: 'Calor', text: 'Animação +{v}% o tempo todo.' }
  ],

  // Cenário: cada convidado novo (lotação) põe uma peça na festa. Os marcos entram em lotações certas; nas outras,
  // entra o próximo enfeite da rotação que ainda tem vaga (e cujo marco de origem já chegou).
  // Prêmios dos minigames: jogar cada minigame (`jogos`: o que conta como uma vez, por evento do motor, com `when` para filtrar o que vem no
  // evento e `min` para exigir um mínimo) libera coisas e personagens que aparecem na festa (`itens`). Cada jogo tem uma coisa (`tipo: 'coisa'`:
  // um objeto animado no mapa, no `lugar` chao, varal ou fundo) e um personagem (`tipo: 'personagem'`: anda pela festa e, clicado, dá o
  // presente `gift` de `giftMinutes` em `giftMinutes` minutos); `feitos` é quantas vezes o jogo precisa ter sido feito. A contagem e os
  // prêmios são para sempre (passam de um São João para o outro). Cada prêmio liberado soma `bonus` à Animação (o dele, ou o padrão). O terceiro de
  // cada jogo (`tipo: 'ouro'`, `de`: a coisa) é o troféu: a coisa vira ouro maciço e o personagem ganha uma coroa; vale o dobro.
  premios: {
    bonus: 0.005, giftMinutes: 20,
    // O Desfile dos Prêmios: com `minPeople` personagens na festa, de `minutes[0]` a `minutes[1]` minutos depois do último os personagens (até
    // `maxPeople`) atravessam a festa em fila por `seconds` s; quem clica em qualquer um ganha o prêmio (uma vez por desfile): `tickets` mais
    // `ticketsPer` a cada 3 personagens, `cheer` (segundos de Animação) mais `cheerPer` por personagem e `love` de Amor.
    desfile: { minPeople: 6, maxPeople: 10, minutes: [8, 14], seconds: 40, tickets: 2, ticketsPer: 1, cheer: 60, cheerPer: 12, love: 4 },
    jogos: [
      { id: 'argolas', name: 'Argolas da Sorte', icon: 'ui:argolas', count: [{ on: 'rings' }] },
      { id: 'pescaria', name: 'Pescaria', icon: 'ui:pescaria', count: [{ on: 'fished' }] },
      { id: 'bingo', name: 'Bingo da quermesse', icon: 'ui:bingo', count: [{ on: 'bingo-win' }, { on: 'bingo-lost' }] },
      { id: 'burro', name: 'Rabo no burro', icon: 'ui:burro', count: [{ on: 'burro-pin' }] },
      { id: 'saco', name: 'Corrida de saco', icon: 'ui:saco', count: [{ on: 'saco-end' }] },
      { id: 'pote', name: 'Quebra-pote', icon: 'ui:pote', count: [{ on: 'pote-break' }] },
      { id: 'leilao', name: 'Leilão de prendas', icon: 'ui:leilao', count: [{ on: 'leilao-sold', when: { winner: 'voce' } }] },
      { id: 'cobra', name: 'Olha a cobra!', icon: 'ui:cobra', count: [{ on: 'cobra-caught' }] },
      { id: 'cordel', name: 'Cordel da Mandioca', icon: 'ui:cordel', count: [{ on: 'mini:cordel:page-done' }] },
      { id: 'bichos', name: 'Quintal dos Bichos', icon: 'ui:bichos', count: [{ on: 'mini:bichos:pet' }] },
      { id: 'aquario', name: 'Aquário', icon: 'ui:aquario', count: [{ on: 'mini:aquario:fed' }, { on: 'mini:aquario:grew' }, { on: 'mini:aquario:pop' }] },
      { id: 'horta', name: 'Horta', icon: 'ui:horta', count: [{ on: 'mini:horta:harvest' }] },
      { id: 'fogueira', name: 'Fogueira de Perto', icon: 'ui:fogueira', count: [{ on: 'mini:fogueira:roasted' }] },
      { id: 'palco', name: 'Palco do Forró', icon: 'ui:palco', count: [{ on: 'mini:palco:show-end', when: { practice: false, aborted: false }, min: { stars: 1 } }] },
      { id: 'mata', name: 'Mata Encantada', icon: 'ui:mata', count: [{ on: 'mini:mata:win' }] },
      { id: 'ceu', name: 'Céu de São João', icon: 'ui:ceu', count: [{ on: 'mini:ceu:rocket' }] },
      { id: 'bairro', name: 'Bairro', icon: 'ui:bairro', count: [{ on: 'mini:bairro:visit' }] },
      { id: 'folclore', name: 'Visitas do folclore', icon: 'ui:lendaria', count: [{ on: 'mini:folclore:catch' }] },
      { id: 'cozinha', name: 'Cozinha do Fogão', icon: 'ui:panela', count: [{ on: 'cook-served' }] },
      { id: 'fantasia', name: 'Concurso de fantasia', icon: 'ui:fantasia', count: [{ on: 'fantasia' }] },
      { id: 'casamento', name: 'Casamento na roça', icon: 'ui:casamento', count: [{ on: 'wedding-end' }] },
      { id: 'fotografo', name: 'Fotógrafo lambe-lambe', icon: 'ui:foto', count: [{ on: 'foto' }] },
      { id: 'penetra', name: 'Penetras', icon: 'ui:penetra', count: [{ on: 'crasher-caught' }] },
      { id: 'correio', name: 'Correio elegante', icon: 'ui:carta', count: [{ on: 'letter' }] },
      { id: 'album', name: 'Álbum da Festa', icon: 'ui:album', count: [{ on: 'sticker' }] },
      { id: 'quadrilha', name: 'Quadrilha', icon: 'ui:quadrilha', count: [{ on: 'quadrilha-end' }] },
      { id: 'carinho', name: 'Carinho na Mandioca', icon: 'ui:amor', count: [{ on: 'poke', min: { value: 1 } }] },
      { id: 'balao', name: 'Balão dourado', icon: 'ui:balao', count: [{ on: 'balloon-claimed' }] },
      { id: 'arco', name: 'Pote de ouro', icon: 'ui:arco', count: [{ on: 'rainbow-claimed' }] },
      { id: 'bandeirinha', name: 'Bandeirinha solta', icon: 'item:bandeirinha', count: [{ on: 'flag-caught' }] },
      { id: 'visitante', name: 'Visitante', icon: 'ui:sanfoneiro', count: [{ on: 'visitor-greet' }] },
      { id: 'compadres', name: 'Compadres', icon: 'ui:compadres', count: [{ on: 'compadres' }] },
      { id: 'carro', name: 'Carro de boi', icon: 'ui:carro-boi', count: [{ on: 'cart-wood' }] },
      { id: 'pedido', name: 'Pedidos', icon: 'ui:pedido', count: [{ on: 'request-done' }] },
      { id: 'mundo', name: 'Eventos do mundo', icon: 'ui:chuva', count: [{ on: 'mundo-pego' }] }
    ],
    itens: [
      { id: 'ursinhos', jogo: 'argolas', tipo: 'coisa', lugar: 'chao', feitos: 3, name: 'Pilha de Ursinhos', text: 'Os ursinhos que a barraca das argolas dá de prêmio, empilhados num caixote.', say0: 'QUE FOFOS!', say1: 'ABRACA O URSO!' },
      { id: 'zeca-argolas', jogo: 'argolas', tipo: 'personagem', feitos: 12, name: 'Zeca das Argolas', text: 'O menino que nunca erra uma garrafa (só quando tem gente olhando).', gift: { tickets: 2 }, say0: 'ARGOLA NA GARRAFA!', say1: 'MIRA DE OURO!', say2: 'LANCA MAIS UMA!' },
      { id: 'balde-peixes', jogo: 'pescaria', tipo: 'coisa', lugar: 'chao', feitos: 4, name: 'Balde de Peixes', text: 'Um balde cheio de peixe vivo, pulando de contente.', say0: 'PLOFT!', say1: 'FRESQUINHOS!' },
      { id: 'seu-tainha', jogo: 'pescaria', tipo: 'personagem', feitos: 15, name: 'Seu Tainha', text: 'O pescador mais velho da festa: diz que já pescou até bota com chorume.', gift: { wood: 4, belly: 10 }, say0: 'TA BELISCANDO!', say1: 'PEIXE GRANDE!', say2: 'SHHH, ASSUSTA' },
      { id: 'globo-bingo', jogo: 'bingo', tipo: 'coisa', lugar: 'chao', feitos: 2, name: 'Globo do Bingo', text: 'O globo de vidro com as bolinhas que cantam a sorte.', say0: 'GIRA GIRA!', say1: 'SORTE GRANDE!' },
      { id: 'dona-bola', jogo: 'bingo', tipo: 'personagem', feitos: 8, name: 'Dona Bola', text: 'Joga bingo desde antes do bingo existir e confere a cartela com lupa.', gift: { tickets: 1, cheer: 30 }, say0: 'BINGO!', say1: 'FALTA UM NUMERO!', say2: 'ESSE EU TENHO!' },
      { id: 'burrico', jogo: 'burro', tipo: 'coisa', lugar: 'chao', feitos: 3, name: 'Burrico de Pano', text: 'O burrico de pano que perde o rabo toda hora.', say0: 'HIIIN-HOO!', say1: 'CADE O RABO?' },
      { id: 'palhaco-pirulito', jogo: 'burro', tipo: 'personagem', feitos: 10, name: 'Palhaço Pirulito', text: 'Faz graça de olhos vendados e dá pirulito a quem acerta o rabo.', gift: { love: 6 }, say0: 'HONK HONK!', say1: 'QUER PIRULITO?', say2: 'RISOS PRA TODOS!' },
      { id: 'fita-chegada', jogo: 'saco', tipo: 'coisa', lugar: 'chao', feitos: 2, name: 'Fita de Chegada', text: 'A fita quadriculada que o campeão da corrida de saco rompe.', say0: 'CHEGADA!', say1: 'RASGA A FITA!' },
      { id: 'juiz-apito', jogo: 'saco', tipo: 'personagem', feitos: 8, name: 'Juiz Apito', text: 'Apita tudo: largada, chegada e quem pula fora da fila.', gift: { cheer: 45 }, say0: 'PREPARAR!', say1: 'FOI FALTA!', say2: 'VALEU, CAMPEAO!' },
      { id: 'pote-enfeitado', jogo: 'pote', tipo: 'coisa', lugar: 'varal', feitos: 3, name: 'Pote Enfeitado', text: 'Um pote de barro cheio de fitas pendurado no varal, esperando a paulada.', say0: 'PAULADA NELE!', say1: 'CHEIO DE DOCE!' },
      { id: 'menino-vendado', jogo: 'pote', tipo: 'personagem', feitos: 10, name: 'Menino Vendado', text: 'De olhos vendados e paulada na mão, acha que o pote está sempre para o outro lado.', gift: { wood: 5, tickets: 1 }, say0: 'ONDE TA O POTE?', say1: 'PARA A ESQUERDA!', say2: 'VOU ACERTAR!' },
      { id: 'martelo-banco', jogo: 'leilao', tipo: 'coisa', lugar: 'chao', feitos: 1, name: 'Martelo do Leilão', text: 'O martelo do leiloeiro em cima do banquinho: dado, dado, vendido!', say0: 'DADO!', say1: 'VENDIDO!' },
      { id: 'dona-lance', jogo: 'leilao', tipo: 'personagem', feitos: 5, name: 'Dona Lance', text: 'Levanta a plaquinha antes de todo mundo e nunca abre a bolsa à toa.', gift: { tickets: 2, cheer: 20 }, say0: 'LANCE!', say1: 'EU DOU MAIS!', say2: 'VENDIDO PRA MIM!' },
      { id: 'cesto-cobra', jogo: 'cobra', tipo: 'coisa', lugar: 'chao', feitos: 3, name: 'Cesto da Cobra', text: 'O cesto de vime de onde a cobra de pano sai balançando.', say0: 'SSSSS!', say1: 'E DE PANO!' },
      { id: 'faquir', jogo: 'cobra', tipo: 'personagem', feitos: 10, name: 'Faquir Ali', text: 'Toca a flauta e a cobra dança. (A cobra é de pano, mas ela não sabe.)', gift: { love: 4, cheer: 25 }, say0: 'OLHA A COBRA!', say1: 'ESCUTA A FLAUTA!', say2: 'ELA DANCA!' },
      { id: 'varal-cordeis', jogo: 'cordel', tipo: 'coisa', lugar: 'varal', feitos: 2, name: 'Varal de Cordéis', text: 'Folhetos de cordel pendurados num barbante, balançando ao vento.', say0: 'CORDEL FRESCO!', say1: 'OLHA O FOLHETO!' },
      { id: 'ze-poeta', jogo: 'cordel', tipo: 'personagem', feitos: 8, name: 'Zé Poeta', text: 'Declama versos de improviso e rima até a palavra "mandioca".', gift: { cheer: 40, love: 3 }, say0: 'OUCAM OS VERSOS!', say1: 'RIMA COM MANDIOCA?', say2: 'CORDEL FRESQUINHO!' },
      { id: 'cocho-milho', jogo: 'bichos', tipo: 'coisa', lugar: 'chao', feitos: 10, name: 'Cocho de Milho', text: 'O cocho com milho do quintal, onde um pintinho não larga o osso.', say0: 'PIU PIU!', say1: 'MILHO BOM!' },
      { id: 'sinha-terreiro', jogo: 'bichos', tipo: 'personagem', feitos: 50, name: 'Sinhá do Terreiro', text: 'Chama as galinhas pelo nome e joga milho para todo bicho da festa.', gift: { belly: 20 }, say0: 'PIU PIU PIU!', say1: 'VEM, GALINHA!', say2: 'MILHO FRESQUINHO!' },
      { id: 'barril-aquario', jogo: 'aquario', tipo: 'coisa', lugar: 'chao', feitos: 4, name: 'Barril-Aquário', text: 'Um tonel com um aquário em cima e os peixes da Mandioca nadando.', say0: 'BLUB BLUB!', say1: 'PEIXE FELIZ!' },
      { id: 'menina-peixe', jogo: 'aquario', tipo: 'personagem', feitos: 20, name: 'Menina do Peixe', text: 'Carrega o peixinho de estimação para toda festa, que nem solta bolha sem ela.', gift: { tickets: 1, love: 3 }, say0: 'MEU PEIXINHO!', say1: 'BOLHINHAS!', say2: 'ELE SE CHAMA BOLHA' },
      { id: 'carrinho-legumes', jogo: 'horta', tipo: 'coisa', lugar: 'chao', feitos: 6, name: 'Carrinho de Legumes', text: 'O carrinho de mão carregando a colheita da horta.', say0: 'COLHEITA FARTA!', say1: 'LEGUME FRESCO!' },
      { id: 'seu-tomate', jogo: 'horta', tipo: 'personagem', feitos: 30, name: 'Seu Tomate', text: 'O hortelão de macacão que conversa com as plantas (e elas respondem).', gift: { wood: 3, belly: 15 }, say0: 'TA REGADO!', say1: 'OLHA ESSE TOMATE!', say2: 'PLANTA FELIZ!' },
      { id: 'panela-fogo', jogo: 'fogueira', tipo: 'coisa', lugar: 'chao', feitos: 4, name: 'Panela no Fogo', text: 'A panela de ferro borbulhando num tripé, cheirando a festa.', say0: 'BORBULHA!', say1: 'CHEIRINHO BOM!' },
      { id: 'chico-assador', jogo: 'fogueira', tipo: 'personagem', feitos: 20, name: 'Chico Assador', text: 'Assa espetinho no ponto certinho e jura que nunca queimou nada.', gift: { belly: 25 }, say0: 'NO PONTO!', say1: 'CHEIRINHO BOM!', say2: 'VIRA O ESPETO!' },
      { id: 'zabumba', jogo: 'palco', tipo: 'coisa', lugar: 'chao', feitos: 2, name: 'Zabumba', text: 'A zabumba do trio pé-de-serra, pronta para o próximo xote.', say0: 'BUM BUM!', say1: 'POOM!' },
      { id: 'zabumbeiro-mirim', jogo: 'palco', tipo: 'personagem', feitos: 8, name: 'Zabumbeiro Mirim', text: 'Toca zabumba maior que ele e acompanha qualquer forró.', gift: { cheer: 60 }, say0: 'BUM BUM BUM!', say1: 'FORRO NA VEIA!', say2: 'MAIS UM XOTE!' },
      { id: 'totem-curupira', jogo: 'mata', tipo: 'coisa', lugar: 'fundo', feitos: 8, name: 'Totem do Curupira', text: 'Um totem entalhado com a cara do Curupira, de cabelo em chamas e pés para trás.', say0: 'CURUPIRAAA!', say1: 'PES PRA TRAS!' },
      { id: 'mateiro-bento', jogo: 'mata', tipo: 'personagem', feitos: 40, name: 'Mateiro Bento', text: 'Conhece a Mata de cor e salteado, e nunca segue as pegadas do Curupira.', gift: { wood: 8 }, say0: 'SHHH... A MATA OUVE', say1: 'CUIDADO COM O CURUPIRA', say2: 'SIGA A LANTERNA' },
      { id: 'telescopio', jogo: 'ceu', tipo: 'coisa', lugar: 'chao', feitos: 20, name: 'Telescópio de Latão', text: 'Um telescópio de latão apontado para as estrelas e os foguetes.', say0: 'OLHA A ESTRELA!', say1: 'ZOOM!' },
      { id: 'seu-estrelinha', jogo: 'ceu', tipo: 'personagem', feitos: 100, name: 'Seu Estrelinha', text: 'O astrônomo da festa: conta as estrelas cadentes e faz pedido em todas.', gift: { cheer: 50, tickets: 1 }, say0: 'UMA ESTRELA CADENTE!', say1: 'FACA UM PEDIDO!', say2: 'OLHA O FOGUETE!' },
      { id: 'caixa-correio', jogo: 'bairro', tipo: 'coisa', lugar: 'chao', feitos: 4, name: 'Caixa de Correio', text: 'A caixinha vermelha do bairro, sempre com uma carta aparecendo.', say0: 'TEM CARTA!', say1: 'CORREIO!' },
      { id: 'ze-carteiro', jogo: 'bairro', tipo: 'personagem', feitos: 16, name: 'Zé Carteiro', text: 'Entrega recado de casa em casa e sabe a fofoca de todo vizinho.', gift: { tickets: 2 }, say0: 'CARTA PRA VOCE!', say1: 'RECADO DO VIZINHO!', say2: 'TEM CORRESPONDENCIA!' },
      { id: 'lanterna-boitata', jogo: 'folclore', tipo: 'coisa', lugar: 'varal', feitos: 3, name: 'Lanterna do Boitatá', text: 'Uma lanterna de papel com a cobra de fogo desenhada, acesa no varal.', say0: 'FOGO FATUO!', say1: 'BOITATA!' },
      { id: 'vovo-contadora', jogo: 'folclore', tipo: 'personagem', feitos: 12, name: 'Vovó Contadora', text: 'Conta os causos das criaturas do folclore e jura que viu todas.', gift: { love: 8, cheer: 20 }, say0: 'ERA UMA VEZ...', say1: 'ISSO EU VI!', say2: 'QUER OUVIR UM CAUSO?' },
      { id: 'ursinhos-ouro', jogo: 'argolas', tipo: 'ouro', de: 'ursinhos', feitos: 60, bonus: 0.01, name: 'Ursinhos de Ouro', text: 'O troféu de quem joga Argolas da Sorte de verdade: Pilha de Ursinhos em ouro maciço. Zeca das Argolas ganha uma coroa e o presente dele dobra.' },
      { id: 'balde-peixes-ouro', jogo: 'pescaria', tipo: 'ouro', de: 'balde-peixes', feitos: 80, bonus: 0.01, name: 'Balde de Ouro', text: 'O troféu de quem joga Pescaria de verdade: Balde de Peixes em ouro maciço. Seu Tainha ganha uma coroa e o presente dele dobra.' },
      { id: 'globo-bingo-ouro', jogo: 'bingo', tipo: 'ouro', de: 'globo-bingo', feitos: 40, bonus: 0.01, name: 'Globo de Ouro', text: 'O troféu de quem joga Bingo da quermesse de verdade: Globo do Bingo em ouro maciço. Dona Bola ganha uma coroa e o presente dele dobra.' },
      { id: 'burrico-ouro', jogo: 'burro', tipo: 'ouro', de: 'burrico', feitos: 50, bonus: 0.01, name: 'Burrico de Ouro', text: 'O troféu de quem joga Rabo no burro de verdade: Burrico de Pano em ouro maciço. Palhaço Pirulito ganha uma coroa e o presente dele dobra.' },
      { id: 'fita-chegada-ouro', jogo: 'saco', tipo: 'ouro', de: 'fita-chegada', feitos: 40, bonus: 0.01, name: 'Fita Dourada', text: 'O troféu de quem joga Corrida de saco de verdade: Fita de Chegada em ouro maciço. Juiz Apito ganha uma coroa e o presente dele dobra.' },
      { id: 'pote-enfeitado-ouro', jogo: 'pote', tipo: 'ouro', de: 'pote-enfeitado', feitos: 50, bonus: 0.01, name: 'Pote de Ouro', text: 'O troféu de quem joga Quebra-pote de verdade: Pote Enfeitado em ouro maciço. Menino Vendado ganha uma coroa e o presente dele dobra.' },
      { id: 'martelo-banco-ouro', jogo: 'leilao', tipo: 'ouro', de: 'martelo-banco', feitos: 25, bonus: 0.01, name: 'Martelo de Ouro', text: 'O troféu de quem joga Leilão de prendas de verdade: Martelo do Leilão em ouro maciço. Dona Lance ganha uma coroa e o presente dele dobra.' },
      { id: 'cesto-cobra-ouro', jogo: 'cobra', tipo: 'ouro', de: 'cesto-cobra', feitos: 50, bonus: 0.01, name: 'Cesto Dourado', text: 'O troféu de quem joga Olha a cobra! de verdade: Cesto da Cobra em ouro maciço. Faquir Ali ganha uma coroa e o presente dele dobra.' },
      { id: 'varal-cordeis-ouro', jogo: 'cordel', tipo: 'ouro', de: 'varal-cordeis', feitos: 15, bonus: 0.01, name: 'Cordéis de Ouro', text: 'O troféu de quem joga Cordel da Mandioca de verdade: Varal de Cordéis em ouro maciço. Zé Poeta ganha uma coroa e o presente dele dobra.' },
      { id: 'cocho-milho-ouro', jogo: 'bichos', tipo: 'ouro', de: 'cocho-milho', feitos: 200, bonus: 0.01, name: 'Milho de Ouro', text: 'O troféu de quem joga Quintal dos Bichos de verdade: Cocho de Milho em ouro maciço. Sinhá do Terreiro ganha uma coroa e o presente dele dobra.' },
      { id: 'barril-aquario-ouro', jogo: 'aquario', tipo: 'ouro', de: 'barril-aquario', feitos: 80, bonus: 0.01, name: 'Aquário de Ouro', text: 'O troféu de quem joga Aquário de verdade: Barril-Aquário em ouro maciço. Menina do Peixe ganha uma coroa e o presente dele dobra.' },
      { id: 'carrinho-legumes-ouro', jogo: 'horta', tipo: 'ouro', de: 'carrinho-legumes', feitos: 120, bonus: 0.01, name: 'Carrinho de Ouro', text: 'O troféu de quem joga Horta de verdade: Carrinho de Legumes em ouro maciço. Seu Tomate ganha uma coroa e o presente dele dobra.' },
      { id: 'panela-fogo-ouro', jogo: 'fogueira', tipo: 'ouro', de: 'panela-fogo', feitos: 80, bonus: 0.01, name: 'Panela de Ouro', text: 'O troféu de quem joga Fogueira de Perto de verdade: Panela no Fogo em ouro maciço. Chico Assador ganha uma coroa e o presente dele dobra.' },
      { id: 'zabumba-ouro', jogo: 'palco', tipo: 'ouro', de: 'zabumba', feitos: 30, bonus: 0.01, name: 'Zabumba de Ouro', text: 'O troféu de quem joga Palco do Forró de verdade: Zabumba em ouro maciço. Zabumbeiro Mirim ganha uma coroa e o presente dele dobra.' },
      { id: 'totem-curupira-ouro', jogo: 'mata', tipo: 'ouro', de: 'totem-curupira', feitos: 150, bonus: 0.01, name: 'Totem de Ouro', text: 'O troféu de quem joga Mata Encantada de verdade: Totem do Curupira em ouro maciço. Mateiro Bento ganha uma coroa e o presente dele dobra.' },
      { id: 'telescopio-ouro', jogo: 'ceu', tipo: 'ouro', de: 'telescopio', feitos: 400, bonus: 0.01, name: 'Telescópio de Ouro', text: 'O troféu de quem joga Céu de São João de verdade: Telescópio de Latão em ouro maciço. Seu Estrelinha ganha uma coroa e o presente dele dobra.' },
      { id: 'caixa-correio-ouro', jogo: 'bairro', tipo: 'ouro', de: 'caixa-correio', feitos: 60, bonus: 0.01, name: 'Caixa de Ouro', text: 'O troféu de quem joga Bairro de verdade: Caixa de Correio em ouro maciço. Zé Carteiro ganha uma coroa e o presente dele dobra.' },
      { id: 'lanterna-boitata-ouro', jogo: 'folclore', tipo: 'ouro', de: 'lanterna-boitata', feitos: 40, bonus: 0.01, name: 'Lanterna de Ouro', text: 'O troféu de quem joga Visitas do folclore de verdade: Lanterna do Boitatá em ouro maciço. Vovó Contadora ganha uma coroa e o presente dele dobra.' },
      { id: 'cesta-pamonhas', jogo: 'cozinha', tipo: 'coisa', lugar: 'chao', feitos: 3, name: 'Cesta de Pamonhas', text: 'Pamonhas quentinhas amarradas na palha, direto do Fogão a Lenha.', say0: 'QUENTINHA!', say1: 'CHEIRO DE MILHO!' },
      { id: 'dona-concha', jogo: 'cozinha', tipo: 'personagem', feitos: 12, name: 'Dona Concha', text: 'Cozinheira de mão cheia: prova o tempero de tudo e nunca solta a concha.', gift: { belly: 20, wood: 2 }, say0: 'TA NO PONTO!', say1: 'FALTA UM SAL!', say2: 'PROVA ESSE!' },
      { id: 'cabide-fantasias', jogo: 'fantasia', tipo: 'coisa', lugar: 'chao', feitos: 2, name: 'Cabide de Fantasias', text: 'Fantasias de todo jeito esperando o próximo concurso.', say0: 'QUAL VAI SER?', say1: 'FANTASIA NOVA!' },
      { id: 'seu-figurino', jogo: 'fantasia', tipo: 'personagem', feitos: 6, name: 'Seu Figurino', text: 'O alfaiate da festa: mede, alfineta e garante que a fantasia vai cair bem.', gift: { tickets: 1, cheer: 25 }, say0: 'FICA PARADO!', say1: 'CAIU BEM!', say2: 'MAIS UM ALFINETE!' },
      { id: 'bolo-noiva', jogo: 'casamento', tipo: 'coisa', lugar: 'chao', feitos: 1, name: 'Bolo da Noiva', text: 'Três andares de glacê com os noivinhos no topo.', say0: 'VIVA OS NOIVOS!', say1: 'UMA FATIA?' },
      { id: 'madrinha-flor', jogo: 'casamento', tipo: 'personagem', feitos: 4, name: 'Madrinha Flor', text: 'Atira o buquê para o alto e jura que não olhou quem pegou.', gift: { love: 6, cheer: 30 }, say0: 'JOGA O BUQUE!', say1: 'QUEM VAI PEGAR?', say2: 'VIVA OS NOIVOS!' },
      { id: 'camera-tripe', jogo: 'fotografo', tipo: 'coisa', lugar: 'chao', feitos: 3, name: 'Câmera de Tripé', text: 'A câmera de caixa do lambe-lambe, com o pano preto e o flash de pólvora.', say0: 'OLHA O PASSARINHO!', say1: 'FLASH!' },
      { id: 'dona-pose', jogo: 'fotografo', tipo: 'personagem', feitos: 10, name: 'Dona Pose', text: 'Posa para qualquer retrato e sempre sai com o melhor ângulo.', gift: { tickets: 1, love: 3 }, say0: 'TIRA MAIS UMA!', say1: 'SAIU BEM?', say2: 'MEU LADO BOM!' },
      { id: 'placa-penetra', jogo: 'penetra', tipo: 'coisa', lugar: 'chao', feitos: 3, name: 'Placa Anti-Penetra', text: 'Penetra não entra! (Mas a placa já foi riscada por alguém.)', say0: 'PENETRA NAO!', say1: 'SO COM CONVITE!' },
      { id: 'seu-seguranca', jogo: 'penetra', tipo: 'personagem', feitos: 10, name: 'Seu Segurança', text: 'Fica de óculos escuros até de noite e nunca deixou passar um penetra. (Quase nunca.)', gift: { tickets: 2 }, say0: 'CONVITE?', say1: 'PARA TRAS!', say2: 'ESTOU DE OLHO!' },
      { id: 'poleiro-pombos', jogo: 'correio', tipo: 'coisa', lugar: 'chao', feitos: 5, name: 'Poleiro dos Pombos', text: 'Os pombos-correio descansam aqui entre uma carta e outra.', say0: 'ARRULHA!', say1: 'CARTA NOVA?' },
      { id: 'dona-cartinha', jogo: 'correio', tipo: 'personagem', feitos: 20, name: 'Dona Cartinha', text: 'Escreve cartas de amor por encomenda e sabe de cor todos os recados do bairro.', gift: { tickets: 1, love: 4 }, say0: 'CARTA PRA VOCE!', say1: 'QUE LINDO!', say2: 'ASSINA AQUI' },
      { id: 'album-gigante', jogo: 'album', tipo: 'coisa', lugar: 'chao', feitos: 5, name: 'Álbum Gigante', text: 'O Álbum da Festa em tamanho de verdade, com as figurinhas já coladas.', say0: 'FALTA UMA!', say1: 'COLA ESSA!' },
      { id: 'seu-figurinha', jogo: 'album', tipo: 'personagem', feitos: 20, name: 'Seu Figurinha', text: 'Colecionador que troca figurinha repetida por uma ficha e uma boa conversa.', gift: { tickets: 2, cheer: 20 }, say0: 'TENHO REPETIDA!', say1: 'TROCO POR OUTRA!', say2: 'FALTA SO UMA!' },
      { id: 'corneta-alto', jogo: 'quadrilha', tipo: 'coisa', lugar: 'fundo', feitos: 2, name: 'Corneta da Quadrilha', text: 'A cornetona de latão que anuncia a quadrilha: balancê, anarriê, olha a chuva!', say0: 'ANARRIE!', say1: 'BALANCE!' },
      { id: 'marcador-anarrie', jogo: 'quadrilha', tipo: 'personagem', feitos: 8, name: 'Marcador Anarriê', text: 'Comanda a quadrilha com o megafone e nunca erra o passo (só o nome do passo).', gift: { cheer: 50, love: 3 }, say0: 'ANARRIE!', say1: 'OLHA A CHUVA!', say2: 'BALANCE!' },
      { id: 'cesta-pamonhas-ouro', jogo: 'cozinha', tipo: 'ouro', de: 'cesta-pamonhas', feitos: 60, bonus: 0.01, name: 'Cesta de Ouro', text: 'O troféu de quem joga Cozinha do Fogão de verdade: Cesta de Pamonhas em ouro maciço. Dona Concha ganha uma coroa e o presente dele dobra.' },
      { id: 'cabide-fantasias-ouro', jogo: 'fantasia', tipo: 'ouro', de: 'cabide-fantasias', feitos: 25, bonus: 0.01, name: 'Cabide de Ouro', text: 'O troféu de quem joga Concurso de fantasia de verdade: Cabide de Fantasias em ouro maciço. Seu Figurino ganha uma coroa e o presente dele dobra.' },
      { id: 'bolo-noiva-ouro', jogo: 'casamento', tipo: 'ouro', de: 'bolo-noiva', feitos: 15, bonus: 0.01, name: 'Bolo de Ouro', text: 'O troféu de quem joga Casamento na roça de verdade: Bolo da Noiva em ouro maciço. Madrinha Flor ganha uma coroa e o presente dele dobra.' },
      { id: 'camera-tripe-ouro', jogo: 'fotografo', tipo: 'ouro', de: 'camera-tripe', feitos: 40, bonus: 0.01, name: 'Câmera de Ouro', text: 'O troféu de quem joga Fotógrafo lambe-lambe de verdade: Câmera de Tripé em ouro maciço. Dona Pose ganha uma coroa e o presente dele dobra.' },
      { id: 'placa-penetra-ouro', jogo: 'penetra', tipo: 'ouro', de: 'placa-penetra', feitos: 40, bonus: 0.01, name: 'Placa de Ouro', text: 'O troféu de quem joga Penetras de verdade: Placa Anti-Penetra em ouro maciço. Seu Segurança ganha uma coroa e o presente dele dobra.' },
      { id: 'poleiro-pombos-ouro', jogo: 'correio', tipo: 'ouro', de: 'poleiro-pombos', feitos: 80, bonus: 0.01, name: 'Poleiro de Ouro', text: 'O troféu de quem joga Correio elegante de verdade: Poleiro dos Pombos em ouro maciço. Dona Cartinha ganha uma coroa e o presente dele dobra.' },
      { id: 'album-gigante-ouro', jogo: 'album', tipo: 'ouro', de: 'album-gigante', feitos: 35, bonus: 0.01, name: 'Álbum de Ouro', text: 'O troféu de quem joga Álbum da Festa de verdade: Álbum Gigante em ouro maciço. Seu Figurinha ganha uma coroa e o presente dele dobra.' },
      { id: 'corneta-alto-ouro', jogo: 'quadrilha', tipo: 'ouro', de: 'corneta-alto', feitos: 30, bonus: 0.01, name: 'Corneta de Ouro', text: 'O troféu de quem joga Quadrilha de verdade: Corneta da Quadrilha em ouro maciço. Marcador Anarriê ganha uma coroa e o presente dele dobra.' },
      { id: 'almofada-coracao', jogo: 'carinho', tipo: 'coisa', lugar: 'chao', feitos: 25, name: 'Almofada de Coração', text: 'Uma almofada em forma de coração, de tanto carinho que a Mandioca recebe.', say0: 'QUE FOFA!', say1: 'BATE BATE!' },
      { id: 'tia-dengo', jogo: 'carinho', tipo: 'personagem', feitos: 100, name: 'Tia Dengo', text: 'Faz carinho em tudo que se mexe e dá abraço apertado de graça.', gift: { love: 8 }, say0: 'VEM CA, FILHA!', say1: 'QUE DENGO!', say2: 'UM ABRACO!' },
      { id: 'cacho-baloes', jogo: 'balao', tipo: 'coisa', lugar: 'chao', feitos: 3, name: 'Cacho de Balões', text: 'Balões coloridos amarrados num cesto, só esperando o vento.', say0: 'ESTOURA NAO!', say1: 'COLORIDINHOS!' },
      { id: 'seu-balao', jogo: 'balao', tipo: 'personagem', feitos: 10, name: 'Seu Balão', text: 'Vende balão pela festa inteira e jura que nunca deixou nenhum fugir.', gift: { tickets: 2, cheer: 20 }, say0: 'BALAO, BALAO!', say1: 'QUAL COR?', say2: 'ELE FUGIU!' },
      { id: 'pote-ouro-arco', jogo: 'arco', tipo: 'coisa', lugar: 'chao', feitos: 2, name: 'Caldeirão do Arco-Íris', text: 'No fim do arco-íris tem um caldeirão cheio de moedas (e é de verdade).', say0: 'RICO!', say1: 'BRILHA, BRILHA!' },
      { id: 'dona-arco-iris', jogo: 'arco', tipo: 'personagem', feitos: 6, name: 'Dona Arco-Íris', text: 'Veste todas as cores e jura que nasceu depois da chuva.', gift: { tickets: 2, love: 3 }, say0: 'OLHA A CHUVA!', say1: 'TODAS AS CORES!', say2: 'SOL E CHUVA!' },
      { id: 'mastro-bandeirinhas', jogo: 'bandeirinha', tipo: 'coisa', lugar: 'fundo', feitos: 3, name: 'Mastro de Bandeirinhas', text: 'Um mastro alto cheio de bandeirinhas ao vento, pra ninguém perder o São João.', say0: 'ARRAIA EM FESTA!', say1: 'VIVA SAO JOAO!' },
      { id: 'menina-bandeira', jogo: 'bandeirinha', tipo: 'personagem', feitos: 10, name: 'Menina Bandeirinha', text: 'Corre atrás de toda bandeirinha que o vento leva.', gift: { tickets: 1, wood: 3 }, say0: 'PEGA ESSA!', say1: 'O VENTO LEVOU!', say2: 'BANDEIRINHA!' },
      { id: 'banco-praca', jogo: 'visitante', tipo: 'coisa', lugar: 'chao', feitos: 3, name: 'Banco da Praça', text: 'Um banco de ripas verdes com um chapéu esquecido, esperando quem vem de longe.', say0: 'SENTA UM POUCO!', say1: 'CHAPEU DE QUEM?' },
      { id: 'seu-visita', jogo: 'visitante', tipo: 'personagem', feitos: 10, name: 'Seu Visita', text: 'Chega de mala na mão, cumprimenta todo mundo e nunca diz quando vai embora.', gift: { tickets: 1, cheer: 30 }, say0: 'BOA NOITE!', say1: 'CHEGUEI!', say2: 'POSSO FICAR?' },
      { id: 'mesa-compadres', jogo: 'compadres', tipo: 'coisa', lugar: 'chao', feitos: 2, name: 'Mesa dos Compadres', text: 'A mesa onde dois compadres brindam e contam as mesmas histórias de sempre.', say0: 'SAUDE!', say1: 'UM BRINDE!' },
      { id: 'compadre-ze', jogo: 'compadres', tipo: 'personagem', feitos: 6, name: 'Compadre Zé', text: 'Nunca bebe sozinho e sempre acha que o outro pagou a rodada.', gift: { cheer: 40, belly: 10 }, say0: 'SAUDE, COMPADRE!', say1: 'OUTRA RODADA!', say2: 'QUEM PAGA?' },
      { id: 'roda-carro-boi', jogo: 'carro', tipo: 'coisa', lugar: 'chao', feitos: 3, name: 'Roda de Carro de Boi', text: 'A roda maciça do carro de boi, que chia mais do que a sanfona.', say0: 'NHEC NHEC!', say1: 'CHIA, CHIA!' },
      { id: 'carreiro-tiao', jogo: 'carro', tipo: 'personagem', feitos: 10, name: 'Carreiro Tião', text: 'Conduz o carro de boi de vara em punho e fala com os bois como gente.', gift: { wood: 6 }, say0: 'OH, BOI!', say1: 'ANDA, MIMOSO!', say2: 'DEVAGAR!' },
      { id: 'caderno-pedidos', jogo: 'pedido', tipo: 'coisa', lugar: 'chao', feitos: 5, name: 'Caderno de Pedidos', text: 'O caderno onde a festa anota tudo o que o povo pede (e o sininho avisa).', say0: 'ANOTADO!', say1: 'TLIM TLIM!' },
      { id: 'dona-atenta', jogo: 'pedido', tipo: 'personagem', feitos: 20, name: 'Dona Atenta', text: 'Anota todos os pedidos e nunca esquece nenhum (só onde guardou o caderno).', gift: { tickets: 2, cheer: 15 }, say0: 'ANOTADO!', say1: 'QUE MAIS?', say2: 'JA VOLTO!' },
      { id: 'almofada-coracao-ouro', jogo: 'carinho', tipo: 'ouro', de: 'almofada-coracao', feitos: 500, bonus: 0.01, name: 'Almofada de Ouro', text: 'O troféu de quem joga Carinho na Mandioca de verdade: Almofada de Coração em ouro maciço. Tia Dengo ganha uma coroa e o presente dele dobra.' },
      { id: 'cacho-baloes-ouro', jogo: 'balao', tipo: 'ouro', de: 'cacho-baloes', feitos: 40, bonus: 0.01, name: 'Balões de Ouro', text: 'O troféu de quem joga Balão dourado de verdade: Cacho de Balões em ouro maciço. Seu Balão ganha uma coroa e o presente dele dobra.' },
      { id: 'pote-ouro-arco-ouro', jogo: 'arco', tipo: 'ouro', de: 'pote-ouro-arco', feitos: 20, bonus: 0.01, name: 'Caldeirão de Ouro', text: 'O troféu de quem joga Pote de ouro de verdade: Caldeirão do Arco-Íris em ouro maciço. Dona Arco-Íris ganha uma coroa e o presente dele dobra.' },
      { id: 'mastro-bandeirinhas-ouro', jogo: 'bandeirinha', tipo: 'ouro', de: 'mastro-bandeirinhas', feitos: 40, bonus: 0.01, name: 'Mastro de Ouro', text: 'O troféu de quem joga Bandeirinha solta de verdade: Mastro de Bandeirinhas em ouro maciço. Menina Bandeirinha ganha uma coroa e o presente dele dobra.' },
      { id: 'banco-praca-ouro', jogo: 'visitante', tipo: 'ouro', de: 'banco-praca', feitos: 30, bonus: 0.01, name: 'Banco de Ouro', text: 'O troféu de quem joga Visitante de verdade: Banco da Praça em ouro maciço. Seu Visita ganha uma coroa e o presente dele dobra.' },
      { id: 'mesa-compadres-ouro', jogo: 'compadres', tipo: 'ouro', de: 'mesa-compadres', feitos: 20, bonus: 0.01, name: 'Mesa de Ouro', text: 'O troféu de quem joga Compadres de verdade: Mesa dos Compadres em ouro maciço. Compadre Zé ganha uma coroa e o presente dele dobra.' },
      { id: 'roda-carro-boi-ouro', jogo: 'carro', tipo: 'ouro', de: 'roda-carro-boi', feitos: 30, bonus: 0.01, name: 'Roda de Ouro', text: 'O troféu de quem joga Carro de boi de verdade: Roda de Carro de Boi em ouro maciço. Carreiro Tião ganha uma coroa e o presente dele dobra.' },
      { id: 'caderno-pedidos-ouro', jogo: 'pedido', tipo: 'ouro', de: 'caderno-pedidos', feitos: 60, bonus: 0.01, name: 'Caderno de Ouro', text: 'O troféu de quem joga Pedidos de verdade: Caderno de Pedidos em ouro maciço. Dona Atenta ganha uma coroa e o presente dele dobra.' },
      { id: 'estacao-tempo', jogo: 'mundo', tipo: 'coisa', lugar: 'chao', feitos: 10, name: 'Estação do Tempo', text: 'O cata-vento, o anemômetro e o barômetro da festa: sabem do tempo antes de todo mundo.', say0: 'VEM CHUVA!', say1: 'VENTO DE LESTE!' },
      { id: 'seu-barometro', jogo: 'mundo', tipo: 'personagem', feitos: 40, name: 'Seu Barômetro', text: 'Prevê o tempo pelo joelho e erra menos que o rádio.', gift: { cheer: 60, wood: 3 }, say0: 'VAI CHOVER!', say1: 'OLHA O BALAO!', say2: 'PRESSAO CAINDO!' },
      { id: 'estacao-tempo-ouro', jogo: 'mundo', tipo: 'ouro', de: 'estacao-tempo', feitos: 150, bonus: 0.01, name: 'Estação de Ouro', text: 'O troféu de quem joga Eventos do mundo de verdade: Estação do Tempo em ouro maciço. Seu Barômetro ganha uma coroa e o presente dele dobra.' }
    ]
  },

  // Eventos do mundo (src/mundo.js, desenho em src/festa-mundo.js): com `minSize` convidados, de `every[0]` a `every[1]` segundos depois do
  // último evento, um dos `eventos` (sorteado pelo `weight`, sem repetir o anterior) toma conta do mapa por `seconds` segundos. Soma `bonus` à
  // Animação enquanto dura e tem `targets` alvos para clicar: cada um paga `reward`, e pegando todos vem o `finale`. `folclore` chama as
  // visitas do folclore. Nunca acontece durante a chuva nem o arco-íris (e a chuva espera o evento acabar). Na feira (`shop`) cada alvo é uma barraca:
  // pagar `cost` fichas dá `bonus` de Animação por `seconds` segundos (os nomes das barracas são `shop0`, `shop1`...). Sem alvos (`targets: 0`) o evento
  // só dá o bônus; no tesouro (`loot`) cada alvo guarda um prêmio sorteado dessa lista; com `ordered` os alvos só valem na ordem (0, 1, 2...); com `hits` cada alvo aguenta tantos golpes (cliques) antes de pagar (só o último paga).
  // `chat0` e `chat1` são as duas falas da turma durante o evento (só A-Z, 0-9 e ` .,:!?+%-`, até 24 letras: vão na fonte de pixel).
  // Eventos de tema (`tema`: dino, halloween ou zumbi, os ids de `themes`): só entram no sorteio com um conjunto completo daquele tema vestido (chapéu, mão e
  // tecido do mesmo tema: Era Jurássica, Bruxa, Zumbi de Festa...). Vestido, cada sorteio tem `temaChance` de sair da lista do tema; trocar de roupa refaz a
  // previsão na hora. Ver o evento de tema sem o conjunto só dá pelo botão de teste.
  // Nos dias de santo (`saintDays`, ids de `specialDays`) a pausa entre eventos cai pela metade, e em cada dia especial de `dayBoost` alguns eventos
  // ficam `x` vezes mais comuns no sorteio (os da época: pétalas e procissão em Santo Antônio, fogos e pinhata em São João, temporal em São Pedro).
  // `chains`: ao acabar um evento, com a chance dada o seguinte vem `delay` segundos depois (e aparece na previsão); só se já couber na festa.
  mundo: {
    minSize: 12, every: [900, 1800], saintDays: ['antonio', 'joao', 'pedro'],
    // A conquista Céu completo: pegar todos os alvos de `completeKinds` tipos de evento diferentes.
    completeKinds: 12,
    // A placa avisa "Em breve" quando o próximo evento está a `soon` segundos ou menos.
    soon: 90,
    temaChance: 0.5,
    dayBoost: {
      namorados: { ids: ['petalas', 'estrelas', 'lua', 'constelacao'], x: 3 },
      antonio: { ids: ['petalas', 'procissao', 'revoada', 'baloes'], x: 3 },
      joao: { ids: ['fogos', 'baloes', 'boitata', 'pinhata', 'feira'], x: 3 },
      pedro: { ids: ['temporal', 'granizo', 'ventania', 'redemoinho'], x: 3 },
    },
    chains: {
      calorao: { id: 'temporal', chance: 0.5, delay: 8 },
      temporal: { id: 'cheia', chance: 0.3, delay: 10 },
      ventania: { id: 'redemoinho', chance: 0.4, delay: 6 },
      granizo: { id: 'neve', chance: 0.25, delay: 10 },
      poente: { id: 'lua', chance: 0.6, delay: 6 },
      lua: { id: 'amanhecer', chance: 0.35, delay: 12 },
      eclipse: { id: 'estrelas', chance: 0.4, delay: 6 },
      fogos: { id: 'pinhata', chance: 0.3, delay: 8 },
      tesouro: { id: 'fichas', chance: 0.25, delay: 6 },
    },
    eventos: [
      { id: 'estrelas', chat0: 'FAZ UM PEDIDO!', chat1: 'OLHA, CADENTE!', name: 'Chuva de estrelas', text: 'Uma chuva de estrelas cadentes risca o céu: clique nelas para fazer pedidos.', seconds: 50, weight: 3, minSize: 12, bonus: 0.1, targets: 8,
        reward: { cheer: 45 }, finale: { tickets: 5, cheer: 120, love: 4 } },
      { id: 'ventania', chat0: 'SEGURA O CHAPEU!', chat1: 'QUE VENTO!', name: 'Ventania', text: 'Um vento forte leva pipas soltas pelo céu: pegue as pipas antes que sumam.', seconds: 40, weight: 3, minSize: 12, bonus: 0.05, targets: 6,
        reward: { wood: 1, cheer: 25 }, finale: { wood: 4, tickets: 3 } },
      { id: 'vagalumes', chat0: 'QUANTO VAGA-LUME!', chat1: 'QUE LINDO!', name: 'Noite de vaga-lumes', text: 'A neblina desce e os vaga-lumes acendem: pegue quantos puder.', seconds: 55, weight: 3, minSize: 15, bonus: 0.08, targets: 10,
        reward: { love: 2, cheer: 15 }, finale: { tickets: 4, belly: 15 } },
      { id: 'calorao', chat0: 'QUE CALOR!', chat1: 'ME DA UM AGUA!', name: 'Calorão', text: 'O sol esquenta a festa e a turma joga balão d’água para se refrescar: estoure os balões no ar.', seconds: 45, weight: 2, minSize: 20, bonus: 0.06, targets: 5,
        reward: { love: 1, cheer: 30 }, finale: { tickets: 3, belly: 20, love: 3 } },
      { id: 'temporal', chat0: 'FUJAM DA CHUVA!', chat1: 'CADE A LUZ?', name: 'Temporal com apagão', text: 'Um temporal derruba a luz da festa: acenda os três lampiões antes que ele passe.', seconds: 45, weight: 2, minSize: 20, bonus: 0, targets: 3,
        reward: { cheer: 60, love: 2 }, finale: { tickets: 6, wood: 3, love: 6 } },
      { id: 'lua', chat0: 'QUE LUA GRANDE!', chat1: 'OUVI UM UIVO...', name: 'Lua cheia', text: 'Lua cheia de arrepiar: as criaturas do folclore visitam a festa e há olhos brilhando no escuro.', seconds: 60, weight: 2, minSize: 30, bonus: 0.12, targets: 3, folclore: true,
        reward: { tickets: 1, cheer: 50 }, finale: { tickets: 4, cheer: 100 } },
      { id: 'petalas', chat0: 'QUE CHEIRINHO!', chat1: 'FLORES NO AR!', name: 'Chuva de flores', text: 'Pétalas de todas as cores caem sobre a festa: pegue as flores douradas que descem devagar.', seconds: 55, weight: 3, minSize: 15, bonus: 0.07, targets: 8,
        reward: { love: 2, cheer: 20 }, finale: { tickets: 3, love: 6, belly: 10 } },
      { id: 'baloes', chat0: 'SOLTA O BALAO!', chat1: 'OLHA COMO SOBE!', name: 'Balões juninos', text: 'Balões de papel sobem de todos os cantos da festa: pegue os maiores antes que cheguem ao céu.', seconds: 50, weight: 3, minSize: 20, bonus: 0.08, targets: 6,
        reward: { tickets: 1, cheer: 30 }, finale: { tickets: 4, wood: 3 } },
      { id: 'granizo', chat0: 'ABRE O GUARDA-CHUVA!', chat1: 'ISSO DOI!', name: 'Chuva de granizo', text: 'Cai granizo do céu: quebre as pedras grandes antes que cheguem ao chão.', seconds: 40, weight: 2, minSize: 25, bonus: 0, targets: 8,
        reward: { cheer: 40 }, finale: { tickets: 5, belly: 15 } },
      { id: 'eclipse', chat0: 'O DIA VIROU NOITE!', chat1: 'NAO OLHA DIRETO!', name: 'Eclipse', text: 'A lua cobre o sol e o dia vira noite: no escuro aparecem estrelas, pegue todas.', seconds: 40, weight: 1, minSize: 35, bonus: 0.15, targets: 4,
        reward: { cheer: 120 }, finale: { tickets: 12, cheer: 300, love: 10 } },
      { id: 'redemoinho', chat0: 'E O SACI!', chat1: 'QUE POEIRA!', name: 'Redemoinho do Saci', text: 'O Saci passa girando pela festa num redemoinho de poeira: pegue o gorro dele em cada volta.', seconds: 45, weight: 2, minSize: 30, bonus: 0.1, targets: 3,
        reward: { tickets: 2, cheer: 50 }, finale: { tickets: 4, wood: 4, love: 4 } },
      { id: 'pipoca', chat0: 'PIPOCA DO CEU!', chat1: 'TA QUENTINHA!', name: 'Chuva de pipoca', text: 'Cai pipoca do céu e fica quicando no chão: pegue as pipocas antes que parem de pular.', seconds: 45, weight: 3, minSize: 15, bonus: 0.06, targets: 12,
        reward: { belly: 6, cheer: 10 }, finale: { tickets: 4, belly: 20, love: 4 } },
      { id: 'fogos', chat0: 'OLHA OS FOGOS!', chat1: 'UAU, QUE ESTOURO!', name: 'Show de fogos', text: 'Foguetes sobem de todos os cantos: clique neles ainda no ar para fazer o estouro maior.', seconds: 45, weight: 2, minSize: 25, bonus: 0.08, targets: 8,
        reward: { tickets: 1, cheer: 30 }, finale: { tickets: 5, wood: 2 } },
      { id: 'boitata', chat0: 'E O BOITATA!', chat1: 'QUE MEDO!', name: 'Boitatá no céu', text: 'A cobra de fogo cruza o céu devagar: apague os pedaços do corpo dela antes que ela passe.', seconds: 40, weight: 1, minSize: 40, bonus: 0.12, targets: 6,
        reward: { wood: 3, cheer: 80 }, finale: { tickets: 14, wood: 12, love: 10, cheer: 250 } },
      { id: 'revoada', chat0: 'ASA-BRANCA VOANDO!', chat1: 'VAO PRA LONGE...', name: 'Revoada de asa-branca', text: 'Um bando de asa-branca atravessa o céu em V: pegue as aves do bando enquanto voam.', seconds: 40, weight: 2, minSize: 20, bonus: 0.06, targets: 6,
        reward: { love: 3, cheer: 20 }, finale: { tickets: 3, love: 8 } },
      { id: 'procissao', chat0: 'SILENCIO, PROCISSAO!', chat1: 'QUANTAS VELAS!', name: 'Procissão de velas', text: 'Uma fila de velas acesas passa pela frente da festa: acenda as velas com um clique antes que a procissão passe.', seconds: 50, weight: 2, minSize: 25, bonus: 0.08, targets: 5,
        reward: { love: 2, cheer: 30 }, finale: { tickets: 4, belly: 10, love: 5 } },
      { id: 'ovni', chat0: 'UM DISCO VOADOR!', chat1: 'LEVARAM A VACA!', name: 'Disco voador', text: 'Um disco voador paira sobre a festa e puxa as vacas com um raio: clique nelas para devolver ao chão.', seconds: 45, weight: 1, minSize: 35, bonus: 0.1, targets: 4,
        reward: { tickets: 2, cheer: 100 }, finale: { tickets: 12, wood: 6, love: 8, cheer: 250 } },
      { id: 'feira', chat0: 'TEM PAMONHA!', chat1: 'QUANTO CUSTA?', name: 'Feira de São João', text: 'Três barracas abrem na festa: gaste fichas para ganhar bônus de Animação por alguns minutos.', seconds: 70, weight: 2, minSize: 30, bonus: 0, targets: 3,
        shop0: 'Pamonha quentinha', shop1: 'Quentão do Seu Zé', shop2: 'Algodão-doce',
        shop: [{ cost: 4, bonus: 0.15, seconds: 180 }, { cost: 7, bonus: 0.25, seconds: 120 }, { cost: 3, bonus: 0.1, seconds: 300 }],
        reward: {}, finale: { tickets: 4, love: 4 } },
      { id: 'poente', chat0: 'QUE POR DO SOL!', chat1: 'TUDO LARANJA!', name: 'Pôr do sol de São João', text: 'O sol se põe devagar e pinta a festa de laranja: o bônus é grande, é só aproveitar (sem alvos para clicar).', seconds: 35, weight: 2, minSize: 20, bonus: 0.2, targets: 0,
        reward: {}, finale: {} },
      { id: 'tesouro', chat0: 'ACHEI UM X!', chat1: 'VAMOS CAVAR!', name: 'Tesouro enterrado', text: 'Três marcas vermelhas aparecem no chão da festa: cave em cada uma para descobrir o que o mapa escondeu.', seconds: 45, weight: 2, minSize: 25, bonus: 0, targets: 3,
        loot: [{ tickets: 4 }, { wood: 5 }, { cheer: 150 }, { love: 8 }, { belly: 20 }, { tickets: 2, wood: 2 }], reward: {}, finale: { tickets: 6, cheer: 100 } },
      { id: 'neve', chat0: 'NEVA NA FESTA!', chat1: 'BRRR, QUE FRIO!', name: 'Neve em São Joaquim', text: 'Neva na festa! Flocos descem devagar, o chão fica branquinho e todo mundo solta fumacinha: pegue os flocos grandes para fazer pedidos.', seconds: 60, weight: 1, minSize: 35, bonus: 0.12, targets: 6,
        reward: { cheer: 100, love: 3 }, finale: { tickets: 10, love: 12, cheer: 250 } },
      { id: 'tremor', chat0: 'O CHAO TREME!', chat1: 'FORRO PESADO!', name: 'Tremor de forró', text: 'O povo pisa tão forte no forró que o chão da festa treme: moedas pulam da terra, pegue antes que parem de quicar.', seconds: 45, weight: 2, minSize: 25, bonus: 0.1, targets: 5,
        reward: { tickets: 1, cheer: 40 }, finale: { tickets: 5, wood: 4 } },
      { id: 'cheia', chat0: 'O RIO SUBIU!', chat1: 'MEU CHINELO!', name: 'Cheia do rio', text: 'A água sobe na frente da festa e leva tudo o que estava no chão: resgate o que vai boiando.', seconds: 60, weight: 1, minSize: 40, bonus: 0.05, targets: 5,
        reward: { belly: 16, love: 2 }, finale: { tickets: 10, love: 12, belly: 40, cheer: 200 } },
      { id: 'constelacao', chat0: 'O CRUZEIRO DO SUL!', chat1: 'LIGA AS ESTRELAS!', name: 'Cruzeiro do Sul', text: 'O Cruzeiro do Sul aparece no céu: clique nas cinco estrelas na ordem, sempre na que está piscando, para desenhar a constelação.', seconds: 50, weight: 2, minSize: 25, bonus: 0.1, targets: 5, ordered: true,
        reward: { cheer: 50, love: 1 }, finale: { tickets: 6, cheer: 150, love: 4 } },
      { id: 'sapos', chat0: 'CHOVEU SAPO!', chat1: 'CROAC, CROAC!', name: 'Chuva de sapos', text: 'Caem sapos do céu e saem pulando pela festa: pegue os sapos antes que sumam no meio da turma.', seconds: 50, weight: 1, minSize: 30, bonus: 0.08, targets: 8,
        reward: { love: 3, belly: 10 }, finale: { tickets: 12, love: 12, belly: 30 } },
      { id: 'trem', chat0: 'OLHA O TREM!', chat1: 'TCHAU, PASSAGEIROS!', name: 'Maria-fumaça', text: 'Um trem de nuvens cruza o céu com a turma acenando nas janelas: acene de volta para cada passageiro e ganhe o presente dele.', seconds: 55, weight: 2, minSize: 30, bonus: 0.08, targets: 5,
        reward: { tickets: 1, cheer: 30 }, finale: { tickets: 5, wood: 3 } },
      { id: 'pinhata', chat0: 'DA NELA!', chat1: 'QUERO DOCE!', name: 'Pinhata gigante', text: 'Três pinhatas gigantes penduradas nas bandeirinhas: clique em cada uma várias vezes até estourar e chover doce.', seconds: 55, weight: 2, minSize: 30, bonus: 0.06, targets: 3, hits: 6,
        reward: { tickets: 3, cheer: 120 }, finale: { tickets: 8, love: 6, belly: 20 } },
      { id: 'amanhecer', chat0: 'JA AMANHECEU?', chat1: 'BOM DIA, ROCA!', name: 'Amanhecer na roça', text: 'O sol nasce devagar, a névoa da manhã sobe e os galos cantam: acorde cada galo com um clique antes que ele se cale.', seconds: 50, weight: 2, minSize: 20, bonus: 0.1, targets: 3,
        reward: { tickets: 1, love: 2 }, finale: { tickets: 4, cheer: 120, belly: 15 } },
      { id: 'turbulencia', chat0: 'SEGURA FIRME!', chat1: 'QUE BALANCO!', name: 'Turbulência', text: 'A ilha balança numa bolsa de ar e as coisas escorregam pelo chão: pegue o que está deslizando antes que caia da festa.', seconds: 50, weight: 2, minSize: 25, bonus: 0.07, targets: 5,
        reward: { wood: 1, cheer: 35 }, finale: { tickets: 4, wood: 4 } },
      { id: 'fichas', chat0: 'CHOVE FICHA!', chat1: 'PEGA, PEGA, PEGA!', name: 'Chuva de fichas', text: 'Fichas douradas caem do céu aos montes e por pouco tempo: seja rápido e pegue todas.', seconds: 25, weight: 1, minSize: 50, bonus: 0.05, targets: 15,
        reward: { tickets: 2 }, finale: { tickets: 24, cheer: 400 } },
      { id: 'cometa', chat0: 'UM COMETA!', chat1: 'NUNCA VI IGUAL!', name: 'Cometa de São João', text: 'Um cometa raro cruza o céu devagar: o pedido feito nele sempre se realiza.', seconds: 28, weight: 1, minSize: 40, bonus: 0.2, targets: 1,
        reward: { tickets: 10, cheer: 300 }, finale: { tickets: 10, love: 10, cheer: 300 } },

      // Eventos avulsos (sem tema e nem precisam ser de São João): bolhas, aviõezinhos de papel, abelhas, patinhos de borracha, planeta com luas, canhão do circo,
      // balão gigante da Mandioca, balada, baleia voadora e uma fada desastrada (src/festa-mundo-extras.js).
      { id: 'bolhas', chat0: 'QUE BOLHA GRANDE!', chat1: 'NAO ESTOURA ELA!', name: 'Bolhas de sabão gigantes', text: 'Bolhas de sabão enormes sobem pela festa brilhando em todas as cores: estoure cada uma com um clique antes que subam demais.', seconds: 45, weight: 3, minSize: 12, bonus: 0.05, targets: 8,
        reward: { love: 1, cheer: 25 }, finale: { tickets: 4, belly: 10, love: 3 } },
      { id: 'avioes', chat0: 'OLHA O AVIAOZINHO!', chat1: 'DOBRA OUTRO DAI!', name: 'Esquadrilha de aviõezinhos de papel', text: 'Aviões de papel dobrados pela turma planam pela festa fazendo piruetas: clique em cada um antes que pouse.', seconds: 42, weight: 3, minSize: 15, bonus: 0.05, targets: 6,
        reward: { tickets: 1, cheer: 20 }, finale: { tickets: 4, wood: 3, love: 2 } },
      { id: 'patinhos', chat0: 'QUAC QUAC QUAC!', chat1: 'QUE FOFURA DE PATO!', name: 'Parada de patinhos de borracha', text: 'Uma fila de patinhos de borracha desfila pelo chão da festa apitando: cumprimente cada patinho com um clique.', seconds: 45, weight: 2, minSize: 20, bonus: 0.06, targets: 6,
        reward: { love: 2, cheer: 20 }, finale: { tickets: 5, belly: 10, love: 4 } },
      { id: 'abelhas', chat0: 'ZZZZZ! ABELHAS!', chat1: 'CUIDADO COM O FERRAO!', name: 'Enxame de abelhas', text: 'Um enxame de abelhas zumbe pela festa em zigue-zague: clique nelas rápido, que elas não param, e leve o mel!', seconds: 40, weight: 2, minSize: 20, bonus: 0.07, targets: 7,
        reward: { belly: 6, cheer: 25 }, finale: { tickets: 4, belly: 20, love: 3 } },
      { id: 'planetas', chat0: 'OLHA O PLANETA!', chat1: 'TEM ANEL E TUDO!', name: 'Alinhamento planetário', text: 'Um planeta de anéis aparece no céu com as luas girando em volta: clique nas luas em órbita.', seconds: 50, weight: 2, minSize: 30, bonus: 0.08, targets: 5,
        reward: { love: 1, cheer: 40 }, finale: { tickets: 6, wood: 3, love: 4, cheer: 80 } },
      { id: 'circo', chat0: 'PALHACO NO AR!', chat1: 'LA VAI O HOMEM-BALA!', name: 'Canhão do circo', text: 'O circo chegou! O canhão dispara palhaços pelo céu da festa: clique em cada palhaço no ar antes que ele caia na rede.', seconds: 50, weight: 2, minSize: 35, bonus: 0.08, targets: 5,
        reward: { tickets: 1, cheer: 40 }, finale: { tickets: 6, wood: 4, love: 4, cheer: 60 } },
      { id: 'balada', chat0: 'ABRE A RODA!', chat1: 'SOBE O SOM!', name: 'Noite de balada', text: 'Uma bola de espelhos desce do céu e a festa vira balada: raios de luz colorida varrem o mapa e dá para pegar os pontinhos de luz que dançam no chão.', seconds: 50, weight: 2, minSize: 40, bonus: 0.12, targets: 6,
        reward: { love: 1, cheer: 45 }, finale: { tickets: 6, belly: 15, love: 5, cheer: 80 } },
      { id: 'baleia', chat0: 'UMA BALEIA NO CEU!', chat1: 'OLHA O CARDUME!', name: 'Baleia voadora', text: 'Uma baleia azul gigante nada pelo céu seguida de um cardume de peixinhos: pegue os peixes enquanto ela passa.', seconds: 50, weight: 2, minSize: 45, bonus: 0.1, targets: 6,
        reward: { belly: 5, love: 1, cheer: 30 }, finale: { tickets: 6, belly: 20, love: 5, cheer: 60 } },
      { id: 'baloagigante', chat0: 'QUE BALAO ENORME!', chat1: 'E A MANDIOCA!', name: 'Balão gigante da Mandioca', text: 'Um balão inflável gigante da Mandioca cruza o céu da festa: cutuque o balão várias vezes até ele estourar numa chuva de confete e prêmios.', seconds: 45, weight: 1, minSize: 50, bonus: 0.15, targets: 1, hits: 7,
        reward: { tickets: 10, cheer: 400, love: 6 }, finale: { tickets: 14, wood: 10, love: 8, cheer: 400, belly: 20 } },
      { id: 'fada', chat0: 'UMA FADA NA FESTA!', chat1: 'ELA ESCAPOU DE NOVO!', name: 'Fada desastrada', text: 'Uma fadinha atrapalhada voa pela festa espalhando purpurina: ela some e reaparece em outro lugar a cada clique, então cutuque a fada cinco vezes para pegar o desejo dela.', seconds: 45, weight: 1, minSize: 40, bonus: 0.12, targets: 1, hits: 5,
        reward: { tickets: 8, cheer: 300, love: 6 }, finale: { tickets: 12, wood: 6, love: 10, cheer: 300 } },

      // Segunda leva de eventos avulsos (src/festa-mundo-extras2.js): chuva de chapéus, pelada, toupeiras, coelho da cartola, aurora, a vaca e a lua, Esquadrilha da Fumaça
      // e o tornado de tubarões.
      { id: 'chapeus', chat0: 'ESSE CHAPEU E MEU!', chat1: 'CHOVEU CHAPEU!', name: 'Chuva de chapéus', text: 'Chapéus de todos os tipos caem do céu, de cartola a chapéu de pirata: pegue cada um antes que chegue ao chão.', seconds: 45, weight: 3, minSize: 15, bonus: 0.05, targets: 8,
        reward: { love: 1, cheer: 20 }, finale: { tickets: 4, wood: 3, love: 2 } },
      { id: 'toupeiras', chat0: 'OLHA A TOUPEIRA!', chat1: 'CADE ELA AGORA?', name: 'Toupeiras no terreiro', text: 'Toupeiras de capacete aparecem nos buracos do terreiro e se escondem logo: acerte cada uma antes que ela suma.', seconds: 45, weight: 2, minSize: 20, bonus: 0.06, targets: 8,
        reward: { belly: 3, cheer: 25 }, finale: { tickets: 5, belly: 12, love: 3 } },
      { id: 'pelada', chat0: 'PASSA A BOLA!', chat1: 'CHUTA PRO GOL!', name: 'Pelada de futebol', text: 'Uma bola de futebol quica pela festa: dê vários chutes (cliques) nela até ela entrar no gol.', seconds: 45, weight: 2, minSize: 25, bonus: 0.08, targets: 1, hits: 6,
        reward: { tickets: 3, cheer: 120, love: 2 }, finale: { tickets: 6, wood: 4, belly: 12, love: 3 } },
      { id: 'vacalua', chat0: 'A VACA PULOU A LUA!', chat1: 'MUUUUU NO CEU!', name: 'A vaca pulou a lua', text: 'Uma lua enorme sobe e a vaca pula por cima dela: clique na vaca no ar (e olha o prato fugindo com a colher).', seconds: 40, weight: 2, minSize: 25, bonus: 0.07, targets: 4,
        reward: { tickets: 1, cheer: 40, love: 1 }, finale: { tickets: 6, wood: 3, love: 5, cheer: 90 } },
      { id: 'coelho', chat0: 'ABRACADABRA!', chat1: 'SAIU UM COELHO!', name: 'Coelho da cartola', text: 'Um mágico tira coelhos de uma cartola gigante: clique em cada coelho enquanto ele pula para longe.', seconds: 45, weight: 2, minSize: 30, bonus: 0.07, targets: 6,
        reward: { love: 2, cheer: 30 }, finale: { tickets: 5, wood: 3, love: 5, cheer: 60 } },
      { id: 'fumaca', chat0: 'E A FUMACA!', chat1: 'QUE VOO LINDO!', name: 'Esquadrilha da Fumaça', text: 'Jatinhos de acrobacia cruzam o céu deixando rastros de fumaça verde, amarela e azul: clique em cada jato.', seconds: 50, weight: 2, minSize: 35, bonus: 0.08, targets: 6,
        reward: { tickets: 1, cheer: 30 }, finale: { tickets: 5, wood: 3, love: 3 } },
      { id: 'aurora', chat0: 'QUE LUZES BONITAS!', chat1: 'PARECE MAGICA!', name: 'Aurora na festa', text: 'Cortinas de luz verde e roxa dançam no céu e espíritos da aurora passeiam: clique neles.', seconds: 50, weight: 2, minSize: 35, bonus: 0.12, targets: 5,
        reward: { love: 1, cheer: 35 }, finale: { tickets: 5, love: 6, cheer: 100 } },
      { id: 'tubaroes', chat0: 'CHOVEU TUBARAO!', chat1: 'FUJAM PARA AS COLINAS!', name: 'Tornado de tubarões', text: 'Um tornado passa pela festa levando tubarões de pelúcia: clique em cada tubarão que gira no vento.', seconds: 50, weight: 1, minSize: 40, bonus: 0.12, targets: 6,
        reward: { tickets: 2, cheer: 120 }, finale: { tickets: 12, wood: 6, love: 8, cheer: 250 } },

      // Dinossauros (com um conjunto de dinossauros vestido).
      { id: 'pterodatilos', tema: 'dino', chat0: 'LEVOU MINHA BANDEIRA!', chat1: 'OLHA O PTERODATILO!', name: 'Revoada de pterodátilos', text: 'Pterodátilos atravessam o céu levando bandeirinhas no bico: clique em cada um antes que sumam com elas.', seconds: 42, weight: 3, minSize: 12, bonus: 0.05, targets: 5,
        reward: { love: 2, cheer: 30 }, finale: { tickets: 4, wood: 3, love: 2 } },
      { id: 'manada', tema: 'dino', chat0: 'O CHAO ESTA TREMENDO!', chat1: 'QUE FILHOTE FOFO!', name: 'Debandada da manada', text: 'Uma manada de dinossauros passa correndo ao longe e o chão treme: pegue os filhotinhos de chapéu de palha que vão atrás.', seconds: 48, weight: 2, minSize: 12, bonus: 0.08, targets: 6,
        reward: { tickets: 1, cheer: 35 }, finale: { tickets: 5, belly: 15, love: 3 } },
      { id: 'ovos', tema: 'dino', chat0: 'ELE VAI NASCER!', chat1: 'OVO RACHANDO!', name: 'Choca-choca de ovos', text: 'Quatro ovos de dinossauro estão quase chocando na frente da festa: clique três vezes em cada um para ajudar o bichinho a sair da casca.', seconds: 55, weight: 2, minSize: 12, bonus: 0.06, targets: 4, hits: 3,
        reward: { love: 2, cheer: 50 }, finale: { tickets: 6, wood: 4, love: 4 } },
      { id: 'meteoro', tema: 'dino', chat0: 'OLHA O METEORO!', chat1: 'SALVE-SE QUEM PUDER!', name: 'Meteoro da extinção', text: 'Uma bola de fogo gigante desce do céu: clique várias vezes para quebrar o meteoro antes que ele chegue (os dinossauros agradecem).', seconds: 40, weight: 1, minSize: 25, bonus: 0.12, targets: 1, hits: 8,
        reward: { tickets: 10, cheer: 300, love: 4 }, finale: { tickets: 12, wood: 8, love: 8, cheer: 300 } },

      // Halloween (com um conjunto de Halloween vestido).
      { id: 'bruxas', tema: 'halloween', chat0: 'HIHIHI! QUE SUSTO!', chat1: 'VASSOURA VELOZ!', name: 'Revoada de bruxas', text: 'Bruxas em vassouras cruzam o céu da festa cacarejando: clique em cada bruxa para ganhar o doce dela.', seconds: 45, weight: 3, minSize: 12, bonus: 0.05, targets: 5,
        reward: { tickets: 1, cheer: 30 }, finale: { tickets: 5, wood: 3, love: 3 } },
      { id: 'abobora', tema: 'halloween', chat0: 'ABOBORA SORRINDO!', chat1: 'DOCE OU TRAVESSURA!', name: 'Abóboras acesas', text: 'Abóboras com vela dentro vão acendendo uma de cada vez no escuro: clique nelas na ordem em que acendem.', seconds: 50, weight: 2, minSize: 12, bonus: 0.08, targets: 6, ordered: true,
        reward: { love: 2, cheer: 25 }, finale: { tickets: 6, belly: 15, love: 5 } },
      { id: 'fantasmas', tema: 'halloween', chat0: 'BUUU! QUE ARREPIO!', chat1: 'TEM FANTASMA DANCANDO!', name: 'Fantasmas na quadrilha', text: 'Fantasmas de chapéu de palha aparecem e somem no escuro, dançando no meio da turma: clique neles enquanto dá para ver.', seconds: 50, weight: 2, minSize: 12, bonus: 0.08, targets: 6,
        reward: { tickets: 1, cheer: 40, love: 1 }, finale: { tickets: 5, wood: 3, love: 5 } },
      { id: 'luasangue', tema: 'halloween', chat0: 'A LUA FICOU VERMELHA!', chat1: 'QUE ARANHA GRANDE!', name: 'Lua de sangue', text: 'Uma lua vermelha sobe e as aranhas descem pelos fios das bandeirinhas: clique três vezes em cada aranha para derrubá-la.', seconds: 55, weight: 1, minSize: 25, bonus: 0.12, targets: 3, hits: 3,
        reward: { tickets: 4, cheer: 120 }, finale: { tickets: 14, wood: 8, love: 8, cheer: 250 } },

      // Zumbis (com um conjunto de zumbi vestido).
      { id: 'horda', tema: 'zumbi', chat0: 'MIOOOLO!', chat1: 'QUERO PAMONHA!', name: 'Horda de zumbis', text: 'Zumbis de camisa de chita arrastam os pés pela festa atrás de pamonha (e de miolo): clique em cada um para dar a pamonha e matar a fome dele.', seconds: 50, weight: 3, minSize: 12, bonus: 0.05, targets: 6,
        reward: { wood: 1, cheer: 30 }, finale: { tickets: 5, wood: 4, love: 3 } },
      { id: 'gosma', tema: 'zumbi', chat0: 'QUE NOJO!', chat1: 'NAO PISA NA GOSMA!', name: 'Chuva de gosma', text: 'Gotas de gosma tóxica caem do céu e fazem poças que borbulham: estoure as gotas grandes antes que cheguem ao chão.', seconds: 45, weight: 2, minSize: 12, bonus: 0.07, targets: 8,
        reward: { belly: 5, cheer: 30 }, finale: { tickets: 5, belly: 20, love: 3 } },
      { id: 'helicoptero', tema: 'zumbi', chat0: 'OLHA A CAIXA CAINDO!', chat1: 'CHEGOU O RESGATE!', name: 'Suprimentos do helicóptero', text: 'Um helicóptero passa lançando caixas de suprimentos de paraquedas: pegue as caixas antes que toquem o chão.', seconds: 45, weight: 2, minSize: 12, bonus: 0.08, targets: 5,
        reward: { tickets: 1, wood: 1, cheer: 20 }, finale: { tickets: 6, wood: 5, love: 3 } },
      { id: 'surto', tema: 'zumbi', chat0: 'MAO SAINDO DA TERRA!', chat1: 'FUJAM! E O SURTO!', name: 'Surto zumbi', text: 'A sirene toca e mãos de zumbi saem das covas: clique três vezes em cada mão para empurrá-la de volta para baixo da terra.', seconds: 55, weight: 1, minSize: 25, bonus: 0.12, targets: 4, hits: 3,
        reward: { tickets: 3, cheer: 100 }, finale: { tickets: 14, wood: 10, love: 8, cheer: 250 } }
    ]
  },

  scenery: {
    landmarks: [
      { size: 2, id: 'milharal', name: 'Pé de milho' },
      { size: 4, id: 'galinha', name: 'Galinha' },
      { size: 6, id: 'bananeira', name: 'Bananeira' },
      { size: 9, id: 'gato', name: 'Gato dorminhoco' },
      { size: 12, id: 'mandacaru', name: 'Mandacaru' },
      { size: 15, id: 'casinha', name: 'Casinha de taipa' },
      { size: 19, id: 'pipa', name: 'Pipa no céu' },
      { size: 23, id: 'coqueiro', name: 'Coqueiro' },
      { size: 28, id: 'bode', name: 'Bode' },
      { size: 31, id: 'caramelo', name: 'Vira-lata caramelo' },
      { size: 34, id: 'igrejinha', name: 'Igrejinha' },
      { size: 41, id: 'casinha-azul', name: 'Casinha azul' },
      { size: 44, id: 'papagaio', name: 'Papagaio fofoqueiro' },
      { size: 48, id: 'lua', name: 'Lua de São João' },
      { size: 56, id: 'catavento', name: 'Cata-vento' },
      { size: 66, id: 'balao', name: 'Balão de papel' },
      { size: 71, id: 'jegue', name: 'Jegue da manta azul' },
      { size: 78, id: 'estrelas', name: 'Céu estrelado' },
      // Festas bem grandes: o arraiá vira parque.
      { size: 92, id: 'carrossel', name: 'Carrossel' },
      { size: 108, id: 'balao-grande', name: 'Balão de ar quente' },
      { size: 125, id: 'boi', name: 'Bumba-meu-boi' },
      // O mapa cresce para cima: ilhas flutuando no céu, presas aos mastros.
      { size: 150, id: 'ilha-quadrilha', name: 'Ilha flutuante da quadrilha' },
      { size: 185, id: 'ilha-baloes', name: 'Ilha flutuante dos balões' },
      { size: 240, id: 'trem', name: 'Trem da alegria' },
      { size: 300, id: 'kombi', name: 'Carro da pamonha' }
    ],
    cycle: [
      { id: 'balaozinho', name: 'Balãozinho no varal', max: 40 },
      { id: 'pintinho', name: 'Pintinho', max: 12, after: 'galinha' },
      { id: 'mandioquinha', name: 'Mandioquinha na raiz', max: 36 },
      { id: 'vagalume', name: 'Vaga-lume', max: 999 }
    ]
  },

  requests: [
    { id: 'milho', text: 'Cadê o milho cozido?' },
    { id: 'pamonha', text: 'Uma pamonha, por favor!' },
    { id: 'musica', text: 'Toca um xote!' },
    { id: 'foto', text: 'Tira uma foto nossa!' },
    { id: 'pipoca', text: 'Pipoca doce ou salgada?' },
    { id: 'coracao', text: 'Me manda um correio elegante!' },
    { id: 'quentao', text: 'Um quentão pra esquentar!' },
    { id: 'cocada', text: 'Tem cocada aí?' },
    { id: 'bandeirinha', text: 'Faltou bandeirinha naquele canto!' },
    { id: 'danca', text: 'Me ensina esse passo?' },
    { id: 'canjica', text: 'Tem canjica no fogão?' },
    { id: 'fogueira', text: 'Bota mais lenha na fogueira!' },
    { id: 'sanfona', text: 'Cadê o sanfoneiro?' }
  ],

  letters: [
    'Vi você rebolando perto da fogueira. Quase me queimei.',
    'Se você fosse milho, eu te chamava de pipoca: estourou meu coração.',
    'Tô de olho na sua bandeirinha desde o começo da festa.',
    'Me encontra na Barraca do Beijo. Eu levo a ficha.',
    'Seu xadrez combina com o meu. Vamos formar par?',
    'Pescaria é igual amor: às vezes só vem botina.',
    'Você é a mandioca mais bem descascada do terreiro.',
    'Não sou sanfona, mas abro e fecho só pra você.',
    'Anarriê! Volta aqui, que eu não terminei de te olhar.',
    'Olha a cobra! É mentira. Só queria sua atenção.',
    'Quero ser seu par até o fim do balancê.',
    'Seu rebolado deixou a fogueira com inveja.',
    'Me dá um pedaço de paçoca que eu te conto um segredo.',
    'O Inhame espalhou que você tem pegada na quadrilha.',
    'Você não é chapéu de palha, mas me deixou todo furado.',
    'Guardei um lugar pra você no fardo de feno.',
    'Casamento caipira? Eu topo. O juiz pode ser o Milho.',
    'Sua maçã do amor é a mais durinha da festa.',
    'Assinado: alguém que dança atrás de você na quadrilha.',
    'Não vale espiar quem mandou. Mas é quem tem a maior espiga.',
    'No bingo da quermesse eu só preciso de um número: o seu.',
    'Joguei arroz nos noivos pensando em você. Acertei o padre.',
    'O caramelo me seguiu a festa toda. Igualzinho eu faço com você.',
    'Dei seis pauladas no pote e ele não quebrou. Meu coração quebrou na primeira olhada.',
    'Aprendi a lambada só pra dançar colado em você.',
    'Você dança a macarena e eu perco a conta dos braços.',
    'Dois patinhos na lagoa: eu e você, que tal?',
    'Entrei na ciranda só pra dar a volta e cair do seu lado.',
    'Se você for a noiva, eu corro pra ser o noivo. O véu eu arrumo no casamento.',
    'Comi uma espiga inteira de nervoso antes de escrever isto.',
    'Pode cochilar em pé que eu fico de olho na festa pra você.',
    'O vento levou minha bandeirinha. Você leva meu coração?',
    'Vi você no robô. Me programa pra dançar do seu lado?',
    'Linha no bingo, cartela cheia no coração.',
    'Sou como o balão de sorte: passo rapidinho. Me pega!',
    'Corri de saco só pra chegar mais rápido perto de você.',
    'No leilão do meu coração, você arrematou tudo no primeiro lance.',
    'Tá frio? Me deixa ser o seu quentão.',
    'O alto-falante anunciou: tem alguém apaixonado na festa. Era eu.',
    'Colei sua figurinha no meu álbum. Página completa.',
    'Se o jegue da manta azul é de alguém, eu quero ser seu.',
    'Passei a noite atrás do carro da pamonha só pra te achar.',
    'Xaxado, xote ou forró: com você eu danço qualquer um.',
    'Sou pescador de primeira: fisguei o seu olhar.',
    'Troquei o varal inteiro de bandeirinhas só pra combinar com você.',
    'Meu coração é igual pé de moleque: duro por fora, doce por dentro.',
    'Se a fogueira apagar, a gente esquenta a festa.',
    'Você é o meu dou-lhe três: vendido!',
    'Tomei tanto tombo na corrida de saco que caí de amores.',
    'Com você até o friozinho de junho vira calorzinho.',
    'Olha a cobra! É mentira. O que é verdade é que eu gosto de você.',
    'Se eu pregasse o rabo no burro de olho vendado, ia acertar você.',
    'O lambe-lambe disse "olha o passarinho", mas eu só olhei pra você.',
    'Meu coração bate igual pandeiro quando você passa.',
    'No balancê da quadrilha eu balancei foi por você.',
    'Toca um baião, que eu quero dançar agarradinho.',
    'Você é o estalinho da minha festa: pá, e eu pulei.',
    'Vi uma estrela cadente e pedi você de novo.',
    'Faltam poucos dias pro São João e zero pra eu gostar de você.',
    'Na foto da festa, o mais bonito do quadro é você.'
  ],

  achievements: [
    { id: 'primeiro-passo', name: 'Primeiro passo', text: 'Dançar o primeiro passo.' },
    { id: 'crescida', name: 'Crescida', text: 'A Mandioca chegar ao tamanho máximo.' },
    { id: 'repertorio', name: 'Pé de valsa', text: 'Aprender todos os passos de dança.' },
    { id: 'balao-de-sorte', name: 'Balão de sorte', text: 'Pegar 10 balões dourados.' },
    { id: 'dengosa', name: 'Dengosa', text: 'Fazer carinho na Mandioca 100 vezes.' },
    { id: 'arco-iris', name: 'Pote de ouro', text: 'Achar o pote de ouro no fim do arco-íris 5 vezes.' },
    { id: 'metodica', name: 'Metódica', text: 'Cumprir 10 metas da festa.' },
    { id: 'madrinha', name: 'Madrinha de casamento', text: 'Ver 5 casamentos na roça.' },
    { id: 'ano-que-vem', name: 'Ano que vem tem mais', text: 'Encerrar um São João e começar o do ano que vem.' },
    { id: 'bingo', name: 'Bingo!', text: 'Ganhar 3 bingos na quermesse.' },
    { id: 'quebra-pote', name: 'Quebra-pote', text: 'Quebrar 5 potes.' },
    { id: 'canguru', name: 'Canguru da roça', text: 'Ganhar 5 corridas de saco.' },
    { id: 'dou-lhe-tres', name: 'Dou-lhe três!', text: 'Arrematar 3 prendas no leilão.' },
    { id: 'album', name: 'Álbum completo', text: 'Colar todas as figurinhas do Álbum da Festa.' },
    { id: 'quentao', name: 'Quentão quentinho', text: 'Vender 20 quentões no friozinho.' },
    { id: 'na-mosca', name: 'Na mosca', text: 'Pregar o rabo no burro bem no X 3 vezes.' },
    { id: 'retratista', name: 'Retrato na parede', text: 'Tirar 5 retratos com o fotógrafo lambe-lambe.' },
    { id: 'pega-cobra', name: 'Pega a cobra', text: 'Pegar 5 cobras de pano na quadrilha.' },
    { id: 'estilista', name: 'Estilista caipira', text: 'Vestir 5 conjuntos diferentes.' },
    { id: 'guarda-roupa', name: 'Guarda-roupa', text: 'Salvar 5 looks no guarda-roupa.' },
    { id: 'mil', name: 'Mil de animação', text: 'Juntar 1.000 de Animação na festa toda.' },
    { id: 'quermesse', name: 'Quermesse', text: 'Chegar à Quermesse do Bairro.' },
    { id: 'cidade', name: 'Festa da Cidade', text: 'Chegar à Festa da Cidade.' },
    { id: 'regional', name: 'São João Regional', text: 'Chegar ao São João Regional.' },
    { id: 'maior', name: 'Maior São João do Mundo', text: 'Chegar ao maior de todos.' },
    { id: 'primeira-prenda', name: 'Primeira prenda', text: 'Fisgar alguém na pescaria.' },
    { id: 'turma-completa', name: 'Turma completa', text: 'Ter a turma inteira.' },
    { id: 'primeiro-role', name: 'Primeiro rolê', text: 'Voltar de um rolê com lenha.' },
    { id: 'lendaria', name: 'Fogueira lendária', text: 'Fazer 30 melhorias na fogueira.' },
    { id: 'mira-de-ouro', name: 'Mira de ouro', text: 'Encaixar uma argola no pote do presente.' },
    { id: 'estiloso', name: 'Estiloso', text: 'Ter 15 itens da loja.' },
    { id: 'correio', name: 'Coração de papel', text: 'Abrir 10 cartas do correio.' },
    { id: 'atenciosa', name: 'Anfitriã atenciosa', text: 'Atender 25 pedidos.' },
    { id: 'seguranca', name: 'Segurança da festa', text: 'Pôr 10 penetras pra correr.' },
    { id: 'mao-boa', name: 'Mão boa', text: 'Encaixar todas as argolas de uma rodada.' },
    { id: 'colecionador', name: 'Colecionador de prêmios', text: 'Liberar 10 prêmios dos minigames.' },
    { id: 'elenco-completo', name: 'Elenco completo', text: 'Ter os 35 personagens dos minigames na festa.' },
    { id: 'festa-de-ouro', name: 'Festa de ouro', text: 'Conseguir os 35 troféus de ouro dos minigames.' },
    { id: 'ceu-aberto', name: 'Céu aberto', text: 'Ver todos os 61 eventos do mundo (estrelas, ventania, eclipse, cometa, bolhas, baleia, tornado de tubarões, meteoro, bruxas, zumbis...).' },
    { id: 'cacador-de-alvos', name: 'Caçador de alvos', text: 'Pegar 100 alvos dos eventos do mundo.' },
    { id: 'ceu-completo', name: 'Céu completo', text: 'Pegar todos os alvos de 12 tipos diferentes de evento do mundo.' },
    { id: 'mestre-da-pinhata', name: 'Mestre da pinhata', text: 'Estourar 9 pinhatas gigantes.' },
    { id: 'astronomo', name: 'Astrônomo', text: 'Desenhar o Cruzeiro do Sul inteiro 3 vezes.' },
    { id: 'fregues-da-feira', name: 'Freguês da feira', text: 'Comprar 10 vezes nas barracas da Feira de São João.' },
    { id: 'era-dos-dinossauros', name: 'Era dos Dinossauros', text: 'Ter todos os itens do tema dinossauros: chão, cenário, chapéus, itens de mão e tecido.' },
    { id: 'noite-de-halloween', name: 'Noite de Halloween', text: 'Ter todos os itens do tema Halloween: chão, cenário, chapéus, itens de mão e tecido.' },
    { id: 'apocalipse-zumbi', name: 'Apocalipse Zumbi', text: 'Ter todos os itens do tema terra de zumbis: chão, cenário, chapéus, itens de mão e tecido.' }
  ],

  // Conjuntos: vestir as três peças juntas (chapéu, mão e tecido) rende o bônus do conjunto em cima de tudo.
  // Álbum da Festa: figurinhas dos momentos vividos, em páginas de cinco. Cada figurinha sai de um acontecimento do motor
  // (`event`; com `tier`, só a partir desse porte) ou de uma entrada do diário (`record`). Página completa: albumBonus a
  // mais em tudo, para sempre, e albumTickets fichas.
  album: [
    { id: 'brincadeiras', name: 'Brincadeiras', stickers: [
      { id: 'argolas', name: 'Argolas da Sorte', icon: 'ui:argolas', record: 'rings' },
      { id: 'pescaria', name: 'Pescaria', icon: 'ui:pescaria', record: 'fished' },
      { id: 'pote', name: 'Quebra-pote', icon: 'ui:pote', record: 'pote' },
      { id: 'saco', name: 'Corrida de saco', icon: 'ui:saco', record: 'saco' },
      { id: 'leilao', name: 'Arremate no leilão', icon: 'ui:leilao', record: 'leilao' }] },
    { id: 'tradicoes', name: 'Tradições', stickers: [
      { id: 'quadrilha', name: 'Quadrilha marcada', icon: 'ui:quadrilha', event: 'quadrilha' },
      { id: 'casamento', name: 'Casamento na roça', icon: 'ui:casamento', event: 'wedding' },
      { id: 'bingo', name: 'Bingo!', icon: 'ui:bingo', record: 'bingo' },
      { id: 'fogueira', name: 'Fogueira', icon: 'ui:fogueira', record: 'bonfire' },
      { id: 'concurso', name: 'Concurso de quadrilha', icon: 'ui:conquista', record: 'contest' }] },
    { id: 'ceu', name: 'Céu e tempo', stickers: [
      { id: 'chuva', name: 'Chuva de São João', icon: 'ui:chuva', event: 'rain' },
      { id: 'arco-iris', name: 'Pote de ouro', icon: 'ui:arco', record: 'rainbow' },
      { id: 'frio', name: 'Friozinho', icon: 'ui:frio', event: 'cold' },
      { id: 'balao', name: 'Balão de sorte', icon: 'ui:balao', record: 'balloon' },
      { id: 'fogos', name: 'Fogos do Maior São João', icon: 'ui:fogos', event: 'tier-up', tier: 4 }] },
    { id: 'gente', name: 'Gente da festa', stickers: [
      { id: 'pedido', name: 'Pedido atendido', icon: 'ui:pedido', record: 'request' },
      { id: 'penetra', name: 'Penetra expulso', icon: 'ui:penetra', record: 'crasher' },
      { id: 'pombo', name: 'Pombo-correio', icon: 'ui:pombo', event: 'letter-ready' },
      { id: 'alto', name: 'Alto-falante', icon: 'ui:alto', event: 'announce' },
      { id: 'role', name: 'Volta do rolê', icon: 'ui:role', record: 'outing' }] },
    { id: 'surpresas', name: 'Surpresas', stickers: [
      { id: 'sanfoneiro', name: 'Sanfoneiro Andarilho', icon: 'ui:sanfoneiro', record: 'visitor' },
      { id: 'trovao', name: 'Trovão na chuva', icon: 'ui:trovao', event: 'thunder' },
      { id: 'frenesi', name: 'Frenesi', icon: 'ui:animacao', event: 'frenzy-start' },
      { id: 'dia-santo', name: 'Dia de festa', icon: 'ui:festa', event: 'special-day' },
      { id: 'conjunto', name: 'Conjunto completo', icon: 'ui:loja', event: 'set' }] },
    // `when` filtra o acontecimento: um número é o mínimo (streak: 7), o resto tem que ser igual (grade: 'mosca').
    { id: 'folguedos', name: 'Folguedos', stickers: [
      { id: 'cobra', name: 'Olha a cobra!', icon: 'ui:cobra', event: 'cobra-caught' },
      { id: 'retrato', name: 'Retrato do lambe-lambe', icon: 'ui:fotografo', record: 'foto' },
      { id: 'mosca', name: 'Rabo na mosca', icon: 'ui:burro', event: 'burro-pin', when: { grade: 'mosca' } },
      { id: 'pandeiro', name: 'Pandeiro na mão', icon: 'item:pandeiro', event: 'item', when: { id: 'pandeiro' } },
      { id: 'semana', name: 'Uma semana de festa', icon: 'ui:presente', event: 'daily', when: { streak: 7 } }] },
    { id: 'causos', name: 'Causos da festa', stickers: [
      { id: 'compadres', name: 'Compadres de fogueira', icon: 'ui:compadres', record: 'compadres' },
      { id: 'bandeirinha', name: 'Bandeirinha no ar', icon: 'item:bandeirinha', record: 'bandeirinha' },
      { id: 'fantasia', name: 'Fantasia campeã', icon: 'ui:fantasia', event: 'fantasia', when: { win: true } },
      { id: 'carro-boi', name: 'Carro de boi', icon: 'ui:carro-boi', record: 'carro-boi' },
      { id: 'lendaria', name: 'Fogueira lendária', icon: 'ui:lendaria', record: 'legendary' }] }
  ],

  sets: [
    { id: 'caipira', name: 'Caipira de Raiz', hat: 'chapeu-palha', hand: 'espiga', fabric: 'remendado', bonus: 0.03 },
    { id: 'pescador', name: 'Pescador', hat: 'palha-furada', hand: 'vara-pescar', fabric: 'xadrez-azul', bonus: 0.04 },
    { id: 'peao', name: 'Peão de Boiadeiro', hat: 'vaqueiro', hand: 'vara-pescar', fabric: 'xadrez-vermelho', bonus: 0.04 },
    { id: 'dama', name: 'Dama de Chita', hat: 'lenco-chita', hand: 'leque', fabric: 'chita', bonus: 0.04 },
    { id: 'namorados', name: 'Namorados', hat: 'oculos-coracao', hand: 'maca-amor', fabric: 'chita-rosa', bonus: 0.05 },
    { id: 'circo', name: 'Circo da Quermesse', hat: 'chapeu-palhaco', hand: 'ursinho', fabric: 'chita', bonus: 0.05 },
    { id: 'lampiao', name: 'Lampião', hat: 'cangaceiro', hand: 'lampiao', fabric: 'xadrez-verde', bonus: 0.06 },
    { id: 'noiva', name: 'Noiva', hat: 'veu-noiva', hand: 'buque', fabric: 'chita-rosa', bonus: 0.06 },
    { id: 'noivo', name: 'Noivo', hat: 'cartola-noivo', hand: 'pau-selfie', fabric: 'remendado', bonus: 0.06 },
    { id: 'rainha', name: 'Rainha do Milho', hat: 'coroa-milho', hand: 'leque', fabric: 'xadrez-ouro', bonus: 0.08 },
    { id: 'rei', name: 'Rei do Baião', hat: 'rei-baiao', hand: 'triangulo', fabric: 'xadrez-ouro', bonus: 0.08 },
    { id: 'caipirinha', name: 'Maria Chiquinha', hat: 'maria-chiquinha', hand: 'espiga', fabric: 'xadrez-vermelho', bonus: 0.04 },
    { id: 'arraia', name: 'Arraiá Aceso', hat: 'tiara-bandeirinhas', hand: 'estrelinha', fabric: 'xadrez-azul', bonus: 0.05 },
    { id: 'caruaru', name: 'Forrozeiro de Caruaru', hat: 'vaqueiro', hand: 'sanfona-ouro', fabric: 'xadrez-vermelho', bonus: 0.07 },
    { id: 'arrematador', name: 'Arrematador', hat: 'chapeu-coco', hand: 'frango-assado', fabric: 'xadrez-azul', bonus: 0.06 },
    { id: 'luxo', name: 'Caipira de Luxo', hat: 'chapeu-coco', hand: 'bolo-fuba', fabric: 'xadrez-roxo', bonus: 0.05 },
    { id: 'milho-verde', name: 'Milho Verde', hat: 'coroa-flores', hand: 'espiga', fabric: 'chita-amarela', bonus: 0.04 },
    { id: 'pe-de-serra', name: 'Forró Pé-de-Serra', hat: 'rei-baiao', hand: 'zabumba', fabric: 'xadrez-vermelho', bonus: 0.07 },
    { id: 'passista', name: 'Passista de Frevo', hat: 'coroa-flores', hand: 'sombrinha', fabric: 'chita-rosa', bonus: 0.04 },
    { id: 'roda-de-coco', name: 'Roda de Coco', hat: 'lenco-chita', hand: 'pandeiro', fabric: 'chita-amarela', bonus: 0.04 },
    { id: 'olha-a-cobra', name: 'Olha a Cobra!', hat: 'tiara-chifrinho', hand: 'cobra-de-pano', fabric: 'xadrez-verde', bonus: 0.05 },
    { id: 'mago', name: 'Mago Supremo', hat: 'chapeu-mago', hand: 'cajado-cristal', fabric: 'galaxia', bonus: 0.11 },
    { id: 'astronauta', name: 'Astronauta do Arraiá', hat: 'capacete-astronauta', hand: 'espada-neon', fabric: 'neon-retro', bonus: 0.12 },
    { id: 'magico', name: 'Mágico de Palco', hat: 'cartola-magica', hand: 'bola-cristal', fabric: 'psicodelico', bonus: 0.1 },
    { id: 'rei-dos-mares', name: 'Rei dos Mares', hat: 'gorro-tubarao', hand: 'agua-viva', fabric: 'sereia', bonus: 0.1 },
    { id: 'sobremesa', name: 'Sobremesa Tropical', hat: 'abacaxi-real', hand: 'sorvete-triplo', fabric: 'onca', bonus: 0.09 },
    { id: 'infantil', name: 'Festa Infantil', hat: 'fatia-melancia', hand: 'balao-estrela', fabric: 'psicodelico', bonus: 0.09 },
    { id: 'guardiao-da-mata', name: 'Guardião da Mata', hat: 'cabelo-curupira', hand: 'tocha-caipora', fabric: 'capa-boi-bumba', bonus: 0.1 },
    { id: 'lenda-viva', name: 'Lenda Viva', hat: 'capuz-lobisomem', hand: 'caldeirao-cuca', fabric: 'capa-boi-bumba', bonus: 0.11 },
    { id: 'era-jurassica', name: 'Era Jurássica', hat: 'capuz-dino', hand: 'osso-dino', fabric: 'pele-dino', bonus: 0.1 },
    { id: 'paleontologo', name: 'Paleontólogo Maluco', hat: 'crista-estegossauro', hand: 'ovo-dino', fabric: 'pele-dino', bonus: 0.12 },
    { id: 'bruxa', name: 'Bruxa da Festa', hat: 'chapeu-bruxa', hand: 'vassoura-bruxa', fabric: 'teias-aboboras', bonus: 0.1 },
    { id: 'doce-ou-travessura', name: 'Doce ou Travessura', hat: 'abobora-cabeca', hand: 'balde-doces', fabric: 'teias-aboboras', bonus: 0.1 },
    { id: 'assombracao', name: 'Assombração', hat: 'fantasminha', hand: 'lanterna-abobora', fabric: 'teias-aboboras', bonus: 0.12 },
    { id: 'zumbi-de-festa', name: 'Zumbi de Festa', hat: 'cerebro-exposto', hand: 'mao-zumbi', fabric: 'farrapos-zumbi', bonus: 0.1 },
    { id: 'sobrevivente', name: 'Sobrevivente', hat: 'capacete-sobrevivente', hand: 'taco-pregos', fabric: 'farrapos-zumbi', bonus: 0.11 },
    { id: 'apocalipse', name: 'Doutor do Apocalipse', hat: 'capacete-sobrevivente', hand: 'antidoto', fabric: 'farrapos-zumbi', bonus: 0.12 }
  ],

  config: {
    // Faixas dos conjuntos na loja: de qual bônus em diante o cartão sobe de cor (abaixo do primeiro, a faixa comum).
    setTiers: [0.05, 0.07, 0.1],
    // Ritmo da festa (calibrado com tools/simulate.js, um jogador guloso e sem minijogos): o convidado de número N custa fameBase × N^famePow × fameGrowth^(N−1)
    // de Animação, e as melhorias custam price × growth^(nível−1). Os marcos da simulação: 10 convidados em ~1,3 h, 25 em ~7 h, 50 em ~29 h, 100 em ~180 h.
    fameBase: 1000, famePow: 1, fameGrowth: 1.105,
    // A Mandioca cresce com as melhorias: cada número é a soma dos níveis dos quatro atributos que muda o tamanho
    // (broto, mudinha, mandioquinha, mandioca inteira). Cada tamanho a mais rende growthBonus a mais por passo.
    growthAt: [40, 130, 220], growthBonus: 0.08,
    danceSteps: 10, danceBonus: 0.02,
    // Carinho na Mandioca (clique): rende pokeSteps passos, no máximo um a cada pokeCooldown segundos.
    pokeCooldown: 3, pokeSteps: 3,
    // Felicidade da Mandioca (placa e aba Comidas da loja): Amor (carinho e estalinho no chão) e Barriga (comida), de 0 a
    // moodMax, que baixam sozinhos (de cheio a vazio em loveHours e bellyHours, com o jogo aberto ou fechado). A média dos
    // dois mexe no Rebolado: tudo vazio ×moodLow, metade ×1, tudo cheio ×moodHigh, em linha reta entre esses pontos.
    // Carinho dá lovePet de Amor; estalinho no chão, lovePop (no máximo um a cada popCooldown segundos).
    moodMax: 100, moodStart: 50, loveHours: 8, bellyHours: 6, moodLow: 0.5, moodHigh: 1.25,
    lovePet: 5, lovePop: 2, popCooldown: 1, foodMinCost: 5,
    // Balão de sorte: de tempos em tempos (com balloonMin convidados) um balão dourado sobe pela festa e vale um prêmio
    // para quem clica nele antes de sumir. Frenesi: tudo rende frenzyMult vezes por frenzySeconds segundos.
    balloonEvery: [360, 720], balloonSeconds: 22, balloonMin: 15, balloonCheer: 90, frenzySeconds: 30, frenzyMult: 3,
    // Chuva de São João: com rainMin convidados, de tempos em tempos chove por rainSeconds segundos (guarda-chuvas, trovão)
    // e, quando para, sai um arco-íris por rainbowSeconds segundos: o pote de ouro no pé dele rende rainbowCheer segundos
    // de Animação e fichas para quem clicar.
    rainEvery: [1200, 2400], rainSeconds: 50, rainbowSeconds: 45, rainMin: 10, rainbowCheer: 240,
    goalSlots: 3,
    // Trocar uma meta que ainda não foi cumprida por outra, de outro tipo: custa goalSwapCost fichas.
    goalSwapCost: 1,
    // Dias de santo de verdade (pelo relógio do computador): a festa rende mais o dia todo e solta fogos em qualquer porte.
    // Sem `day`, vale o mês inteiro (as festas julinas de julho); um dia exato sempre ganha de um mês inteiro.
    // 12 de junho é o Dia dos Namorados no Brasil (véspera de Santo Antônio, o casamenteiro): +20% e carta vale 1 ficha a mais.
    specialDays: [{ id: 'namorados', month: 6, day: 12, bonus: 0.2 }, { id: 'antonio', month: 6, day: 13, bonus: 0.5 }, { id: 'joao', month: 6, day: 24, bonus: 1 },
      { id: 'pedro', month: 6, day: 29, bonus: 0.5 }, { id: 'julina', month: 7, bonus: 0.2 }],
    // Aniversário da festa (todo ano, no dia em que a partida começou): a festa rende birthdayBonus a mais o dia todo.
    birthdayBonus: 0.3,
    // Sanfoneiro Andarilho: raro (a cada visitorEvery s, da Quermesse em diante) ele atravessa a festa tocando por
    // visitorSeconds s. Enquanto toca, tudo rende visitorBonus a mais; cumprimentar (clique) dá visitorTickets + porte fichas.
    visitorEvery: [5400, 9000], visitorSeconds: 40, visitorBonus: 0.5, visitorTickets: 3, visitorMinTier: 1,
    // Fotógrafo lambe-lambe: de vez em quando (fotoEvery s, da Quermesse em diante) ele monta a câmera ao lado da
    // Mandioca e espera fotoSeconds s pela pose. Clicar nele tira o retrato da festa e rende fotoTickets fichas + o porte.
    fotoEvery: [3600, 7200], fotoSeconds: 50, fotoWalk: 6, fotoTickets: 2, fotoMinTier: 1,
    // Rabo no burro: de tempos em tempos (burroEvery s, da Festa da Cidade em diante) o cavalete aparece na beira da pista
    // por burroSeconds s. O rabo balança "de olhos vendados" por cima do papel (burroSwing px em volta de burroCenter px do
    // X, que fica perto da borda, na anca do jegue; burroPeriods s) e o clique prega: pela
    // distância até o X, na mosca (até 2 px) leva burroTickets fichas + o porte e burroCheer s de Animação; perto (até 5),
    // 1 ficha e metade; longe (até 9), um quinto; fora, só a risada (e 5 s).
    burroEvery: [1200, 2100], burroSeconds: 40, burroMinTier: 2, burroSwing: [9.5, 2], burroCenter: -6.5, burroPeriods: [1.7, 1.1],
    burroCheer: 50, burroTickets: 3,
    // Concurso de fantasia: a cada fantasiaEvery s (da Festa da Cidade em diante) avisa com fantasiaPrep s de antecedência
    // (dá tempo de trocar a roupa) e os três jurados dão nota para a roupa da Mandioca. 1º lugar com média de fantasiaFirst.
    // Carro de boi: lenha que o carreiro deixa no clique (cartWood + porte), no máximo a cada cartCooldown s.
    cartWood: 3, cartCooldown: 150,
    // Bandeirinha que o vento solta: pegar antes de cair rende 1 ficha, no máximo a cada flagCooldown s.
    flagCooldown: 120,
    // Porte em que o Fogão a Lenha passa a cozinhar (o mesmo em que a lenha aparece na placa).
    cookTier: 2,
    // Compadres de fogueira: ser a testemunha (clicar no casal enquanto recitam) rende compadreCheer s de Animação,
    // no máximo a cada compadreCooldown s.
    compadreCheer: 30, compadreCooldown: 150,
    fantasiaEvery: [2700, 4500], fantasiaPrep: 60, fantasiaMinTier: 2, fantasiaFirst: 9, fantasiaSecond: 7.5,
    // Quadrilha marcada: de tempos em tempos (com a festa na Quermesse ou maior) a quadrilha toda anda em zigue-zague pela
    // pista, com os gritos da marcação a cada callEvery segundos, e a festa rende mais por quadrilhaSeconds segundos
    // (o dobro do bônus com a Pamonha, a marcadora, no caixote).
    quadrilhaEvery: [300, 540], quadrilhaSeconds: 24, quadrilhaBonus: 0.25, callEvery: 4,
    // "Olha a cobra!": no grito da cobra (o 5º da marcação), às vezes uma cobra de pano atravessa a pista de verdade.
    // Clicar nela antes que fuja (cobraSeconds) rende cobraCheer s de Animação, e a primeira vez dá a Cobra de Pano.
    cobraChance: 0.5, cobraSeconds: 4.5, cobraCheer: 25,
    // São João do ano que vem: no Maior São João do Mundo dá para encerrar a festa e recomeçar no quintal, com a turma, as
    // roupas, as barracas, as fichas e as conquistas. Cada ano encerrado vira Tradição: a festa rende yearBonus a mais.
    yearBonus: 0.25,
    // Trio pé-de-serra: com a sanfona, a zabumba e o triângulo tocando juntos no palco, a festa rende trioBonus a mais.
    trioBonus: 0.1,
    // Concurso de quadrilha (do São João Regional em diante): com chance contestChance, a quadrilha marcada vale nota. Três
    // jurados dão notas; a média decide o lugar (1º com contestFirst ou mais, 2º com contestSecond) e o prêmio em fichas e
    // segundos de Animação.
    contestChance: 0.35, contestMinTier: 3, contestFirst: 9, contestSecond: 8,
    // Barraca do Beijo: um clique nela rende kissTickets ficha, no máximo uma vez a cada kissMinutes minutos.
    kissMinutes: 5, kissTickets: 1,
    // Visita do dia: a primeira vez que a festa abre em cada dia do calendário rende dailyBase fichas, mais dailyStep por dia
    // seguido de visita (até dailyMax dias de sequência).
    dailyBase: 3, dailyStep: 1, dailyMax: 7,
    // Bingo da quermesse (da Quermesse em diante): uma cartela 3x3 de números de 1 a bingoMax (o meio é livre) custa
    // bingoCost + porte fichas. O locutor sorteia um número a cada bingoEvery segundos; a primeira linha fechada rende metade
    // do preço e a cartela cheia é BINGO: bingoPrize vezes o preço em fichas e bingoCheer segundos de Animação. Alguém da
    // plateia grita BINGO num sorteio entre bingoRival[0] e bingoRival[1] e, se for antes, leva a rodada. O último grito tem
    // que vir antes da última bola (se saíssem todas, a cartela fecharia sempre): com [22, 29], ganha-se uns 30% das rodadas.
    bingoMax: 30, bingoEvery: 2.2, bingoCost: 4, bingoPrize: 3, bingoCheer: 90, bingoRival: [22, 29], bingoMinTier: 1,
    // Quebra-pote: de tempos em tempos (da Festa da Cidade em diante) um pote de barro enfeitado com papel crepom fica pendurado
    // no varal por poteSeconds segundos. Cada clique é uma paulada (uma a cada poteCooldown s) e, com poteHits, o pote quebra e
    // chove bala: fichas e poteCheer segundos de Animação.
    poteEvery: [660, 1140], poteSeconds: 45, poteHits: 6, poteCooldown: 0.25, poteCheer: 60, poteMinTier: 2,
    // Corrida de saco: de tempos em tempos (da Quermesse em diante) três crianças de saco esperam a largada por sacoWait s;
    // o primeiro clique no corredor do jogador larga. Cada clique é um pulo (sacoHops até a chegada), mas pulo a menos de
    // sacoRhythm s do anterior dá tombo (sacoFall s no chão). Os rivais chegam em sacoRival s. Prêmio pelo lugar: o 1º leva
    // fichas (uma a mais sem tombo) e sacoCheer segundos de Animação; o 2º, 1 ficha e 40%; o 3º, 15%. Largou e não chegou
    // em sacoLimit s, a corrida acaba.
    sacoEvery: [720, 1260], sacoWait: 40, sacoHops: 12, sacoRhythm: 0.42, sacoFall: 1.2, sacoRival: [6.5, 9.5], sacoCheer: 75, sacoLimit: 30,
    sacoMinTier: 1,
    // Leilão de prendas: da Festa da Cidade em diante, a cada leilaoEvery s o leiloeiro sobe no palco com uma prenda. O lance
    // começa em leilaoBase + porte fichas e cada clique cobre com +1. A plateia cobre depois de leilaoRival s, até um teto de
    // leilaoMax vezes o lance inicial; sem lance em leilaoWait s, ela mesma abre. Sem lance novo, o leiloeiro conta um a cada
    // leilaoCall s e vende na terceira. Quem já tem todas as prendas do leilão disputa leilaoCheer s de Animação.
    leilaoEvery: [1080, 1800], leilaoBase: 3, leilaoMax: [1.3, 2.6], leilaoRival: [1.2, 4.2], leilaoCall: 2.6, leilaoWait: 20,
    leilaoCheer: 300, leilaoMinTier: 2,
    // Alto-falante da quermesse: da Quermesse em diante, um aviso a cada announceEvery segundos (piada ou dica).
    announceEvery: [150, 300],
    // Friozinho de São João: da Quermesse em diante, a cada coldEvery segundos (fora da chuva) a noite esfria por
    // coldSeconds s: a festa solta fumacinha pela boca e, com o Barril de Quentão num dos lados, vende uma ficha de
    // quentão a cada coldSale s.
    coldEvery: [1500, 2700], coldSeconds: 75, coldSale: 15, coldMinTier: 1,
    // Álbum da Festa: cada página completa rende albumBonus a mais em tudo (para sempre) e albumTickets fichas.
    albumBonus: 0.02, albumTickets: 5,
    // Casamento na roça: quando a quadrilha acaba (a partir do porte weddingMinTier, o da Festa da Cidade, que tem pista para
    // ele), com chance weddingChance sai um casamento. Os noivos e o padre entram na
    // pista por weddingSeconds segundos; cada clique neles joga arroz (um a cada riceCooldown s) e o presente dos noivos
    // (weddingCheer segundos de Animação e fichas) vai de 40% (sem arroz) a 100% (com weddingRice grãos).
    // Com pelo menos weddingGiftShare do arroz (10 punhados de 15), os noivos ainda dão de presente uma das peças de casamento
    // que faltam (véu, cartola e buquê, `source: 'casamento'`).
    weddingChance: 0.4, weddingMinTier: 2, weddingSeconds: 30, weddingRice: 15, riceCooldown: 0.2, weddingCheer: 90, weddingGiftShare: 0.66,
    ticketBase: 60, ticketStep: 45,
    sizeBonus: 0.02, cosmeticBonus: 0.01, sideBonus: 0.02,
    restSeconds: 10, maxLevel: 10,
    flareEvery: 60, flareFor: 8, flarePerLevel: 0.2, emberFor: 6, emberPerLevel: 0.2, heatPerLevel: 0.03,
    bonfireBase: 8, bonfireStep: 4, legendary: 30, cobraMult: 3,
    fishingMinutes: 45, prizeCap: 3,
    letterMinutes: 180, letterCap: 3, letterTickets: 3,
    requestEvery: [180, 360], requestSeconds: 60, requestReward: 45,
    crasherEvery: [480, 900], crasherSeconds: 45, crasherTickets: 2,
    offlineRate: 0.25, offlineCapHours: 12,
    // Cada rodada dobra o preço da próxima; a cada espera sem jogar, o preço cai pela metade até voltar ao início.
    // A garrafa de Animação (a estrela) só aparece uma vez por rodada: as outras garrafas sorteiam entre os demais prêmios.
    ringCost: 1, ringCooldownMinutes: 10, ringThrows: 3, ringBottles: 5,
    ringTable: [['fichas', 0.34], ['animacao', 0.3], ['lenha', 0.14], ['x2', 0.13], ['x3', 0.05], ['item', 0.04]],
    // Folga da mira, em pixels para cada lado: prêmio melhor, garrafa de boca mais larga, mira mais certeira.
    ringAim: { fichas: 5, animacao: 4, lenha: 4, x2: 3, x3: 2, item: 1 },
    // Botão de teste na placa (dar recursos, avançar o tempo). Deixe false antes de lançar o jogo.
    debugMenu: false
  }
};
if (typeof module === 'object' && module.exports) module.exports = globalThis.GAME_DATA;
