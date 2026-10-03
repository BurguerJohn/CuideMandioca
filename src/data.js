// Conteúdo de Cuide bem da sua mandioca: números, catálogo, turma e textos. Tudo o que o motor lê vem daqui.
globalThis.GAME_DATA = {
  // Atributos da anfitriã. Valor no nível L = base + per × (L − 1); preço = price × growth^(L − 1).
  stats: [
    { id: 'rebolado', name: 'Rebolado', unit: 'por passo', desc: 'Animação que cada passo rende.',
      base: 1, per: 1, price: 36, growth: 1.18 },
    { id: 'folego', name: 'Fôlego', unit: 'passos', desc: 'Quantos passos ela aguenta antes de cansar.',
      base: 8, per: 2, price: 27, growth: 1.12 },
    { id: 'refresco', name: 'Refresco', unit: '× descanso', desc: 'Quanto mais refresco, mais curto o descanso.',
      base: 1, per: 0.12, price: 75, growth: 1.15 },
    { id: 'ritmo', name: 'Ritmo', unit: 'passos/s', desc: 'Velocidade da dança. A animação acelera junto.',
      base: 1, per: 0.03, price: 48, growth: 1.17 }
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
    { id: 'polichinelo', name: 'Polichinelo', at: 500 },
    { id: 'sanfona', name: 'Sanfona', at: 2000 },
    { id: 'rebolado', name: 'Rebolado', at: 5500 },
    { id: 'baiao', name: 'Baião', at: 13000 },
    { id: 'giro', name: 'Giro', at: 30000 },
    { id: 'moonwalk', name: 'Moonwalk', at: 55000 },
    { id: 'frevo', name: 'Frevo', at: 100000 },
    { id: 'lambada', name: 'Lambada', at: 150000 },
    { id: 'macarena', name: 'Macarena', at: 215000 },
    { id: 'boi-bumba', name: 'Boi-bumbá', at: 250000 },
    { id: 'robo', name: 'Robô', at: 300000 },
    { id: 'balance', name: 'Balancê', at: 350000 },
    { id: 'arrasta-pe', name: 'Arrasta-pé', at: 400000 },
    { id: 'ciranda', name: 'Ciranda', at: 460000 },
    { id: 'coco', name: 'Coco', at: 520000 },
    { id: 'passinho', name: 'Passinho', at: 660000 },
    { id: 'pisa-fulo', name: 'Pisa na Fulô', at: 730000 },
    { id: 'xaxado', name: 'Xaxado', at: 800000 }
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
      desc: 'Garrafa, argola e muita mira.', effect: '+1 argola por rodada nas Argolas e ativa a Argoleira.' }
  ],
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
    horta: {
      plotsStart: 4, plotEvery: 10, plotMax: 10, waterMax: 5, waterEvery: 20, waterCut: 0.2, waterLimit: 2,
      crowEvery: [480, 900], crowSeconds: 25, crowReward: { cheer: 40 }, firstHarvest: { tickets: 2 }, permanentPct: 10, buffMinutes: 10,
      crops: [
        { id: 'milho', name: 'Milho', minutes: 4, reward: { tickets: 1, belly: 8 }, buff: { kind: 'cheer', value: 0.1 } },
        { id: 'amendoim', name: 'Amendoim', minutes: 8, reward: { wood: 2, belly: 6 }, buff: { kind: 'speed', value: 0.15 } },
        { id: 'batata-doce', name: 'Batata-doce', minutes: 12, reward: { belly: 18, love: 2 }, buff: { kind: 'recovery', value: 0.5 } },
        { id: 'mandioca', name: 'Mandioca', minutes: 15, reward: { cheer: 120, love: 3 }, buff: { kind: 'cheer', value: 0.25 } },
        { id: 'abobora', name: 'Abóbora', minutes: 25, reward: { tickets: 3, cheer: 60 }, buff: { kind: 'crit', value: 0.15 } }
      ]
    },

    // Fogueira de Perto (convidado 30): a fogueira em close. Lenha (`heatPerWood`) acende o fogo, que esfria `heatLoss` por segundo;
    // com calor a partir de `minHeat` os espetos assam (quanto mais quente, mais depressa: de 40% a 100% da velocidade). Cada comida
    // assa em `seconds` s no calor cheio; virar o espeto (até `turnMax` vezes, com a comida entre 10% e 90%) deixa a comida certinha:
    // tirada entre `perfect[0]` e `perfect[1]` do ponto e virada ao menos uma vez, o prêmio vale `perfectMult` vezes; passou do ponto
    // (até `burnAt`) vale 70%; depois disso queimou e não rende nada. Pular a fogueira (com calor a partir de `jumpMinHeat`) rende
    // `jump` e espera `jumpWait` s. O prêmio de toda comida tirada do fogo (no ponto ou passada; queimada não rende) é a Barriga da
    // Mandioca 100% cheia e parada por `bellyHold` horas (só começa a baixar depois); o `reward` de cada comida é um extra pequeno
    // (que vale mais no ponto e menos passado do ponto). Gasta lenha, não rende ficha à toa.
    fogueira: {
      heatMax: 100, heatPerWood: 20, heatLoss: 0.15, minHeat: 15, slots: 4, burnAt: 1.5, perfect: [1.0, 1.2], perfectMult: 1.5, turnMax: 2,
      jumpWait: 90, jumpMinHeat: 30, jump: { cheer: 45, love: 3 }, bellyHold: 2,
      foods: [
        { id: 'milho', name: 'Milho assado', seconds: 60, reward: { cheer: 30 } },
        { id: 'batata', name: 'Batata-doce assada', seconds: 90, reward: { wood: 3 } },
        { id: 'linguica', name: 'Linguiça', seconds: 75, reward: { cheer: 60 } },
        { id: 'queijo', name: 'Queijo coalho', seconds: 45, reward: { love: 6 } }
      ]
    },

    // Palco do Forró (convidado 38): o trio toca e você marca o ritmo. Cada música cai em 3 pistas (triângulo, zabumba e sanfona);
    // clicar na pista na hora certa acerta (perfeito até `perfect` ms de diferença, bom até `good`). No fim a nota (acertos
    // perfeitos valem 3, bons 2, sobre 3 por nota) dá 0 a 3 estrelas (`stars`: o mínimo de cada uma) e o prêmio de `rewards`; a
    // primeira vez que uma música tira 3 estrelas rende `firstThree` a mais. Depois de um show premiado o palco descansa `wait` s
    // (dá para ensaiar nesse tempo, sem prêmio). Cada música só abre depois de 1 estrela na anterior. As notas saem de `seed`
    // (sempre as mesmas) a cada meio tempo, `lead` ms depois de começar.
    palco: {
      lead: 2200, travel: 1700, perfect: 80, good: 150, wait: 480, stars: [0.45, 0.7, 0.9],
      rewards: [{}, { cheer: 60 }, { cheer: 150, love: 3 }, { cheer: 300, love: 6, tickets: 1 }], firstThree: { tickets: 2 },
      songs: [
        { id: 'xote', name: 'Xote da Mandioca', bpm: 100, notes: 26, seed: 11 },
        { id: 'baiao', name: 'Baião Quentinho', bpm: 118, notes: 34, seed: 23 },
        { id: 'forro-ouro', name: 'Forró de Ouro', bpm: 136, notes: 42, seed: 37 },
        { id: 'arrasta-pe', name: 'Arrasta-pé', bpm: 150, notes: 52, seed: 41 }
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
    { id: 'mao-boa', name: 'Mão boa', text: 'Encaixar todas as argolas de uma rodada.' }
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
    { id: 'lenda-viva', name: 'Lenda Viva', hat: 'capuz-lobisomem', hand: 'caldeirao-cuca', fabric: 'capa-boi-bumba', bonus: 0.11 }
  ],

  config: {
    fameBase: 400, famePow: 1, fameGrowth: 1.085,
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
    bonfireBase: 5, bonfireStep: 2, legendary: 30, cobraMult: 3,
    fishingMinutes: 45, prizeCap: 3,
    letterMinutes: 180, letterCap: 3, letterTickets: 3,
    requestEvery: [180, 360], requestSeconds: 60, requestReward: 45,
    crasherEvery: [480, 900], crasherSeconds: 45, crasherTickets: 2,
    offlineRate: 0.25, offlineCapHours: 12,
    // Cada rodada dobra o preço da próxima; a cada espera sem jogar, o preço cai pela metade até voltar ao início.
    ringCost: 1, ringCooldownMinutes: 10, ringThrows: 3, ringBottles: 5,
    ringTable: [['fichas', 0.34], ['animacao', 0.3], ['lenha', 0.14], ['x2', 0.13], ['x3', 0.05], ['item', 0.04]],
    // Folga da mira, em pixels para cada lado: prêmio melhor, garrafa de boca mais larga, mira mais certeira.
    ringAim: { fichas: 5, animacao: 4, lenha: 4, x2: 3, x3: 2, item: 1 },
    // Botão de teste na placa (dar recursos, avançar o tempo). Deixe false antes de lançar o jogo.
    debugMenu: false
  }
};
if (typeof module === 'object' && module.exports) module.exports = globalThis.GAME_DATA;
