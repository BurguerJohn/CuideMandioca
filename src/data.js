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
      base: 1, per: 0.06, price: 48, growth: 1.17 }
  ],

  // Porte do arraiá: a lotação (convidados) decide o porte, e cada porte libera coisas novas.
  tiers: [
    { id: 'quintal', name: 'Arraiá de Quintal', size: 1,
      unlocks: 'Melhorias, loja, correio elegante e Argolas da Sorte.' },
    { id: 'quermesse', name: 'Quermesse do Bairro', size: 10,
      unlocks: 'Pescaria, par da quadrilha, barracas e pedidos dos convidados.' },
    { id: 'cidade', name: 'Festa da Cidade', size: 25,
      unlocks: 'Palco com trio de forró, rolês, fogueira e tablado de dança.' },
    { id: 'regional', name: 'São João Regional', size: 50,
      unlocks: 'Marcadora da quadrilha, foguista, penetras e roda-gigante.' },
    { id: 'maior', name: 'Maior São João do Mundo', size: 100,
      unlocks: 'Lâmpadas no varal e fogos de artifício.' }
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
    mascote: { name: 'Terreiro', tier: 1 }
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
      effect: 'offline', base: 0.2, per: 0.05, text: 'Com o jogo fechado, a festa rende +{v}%' }
  ],
  rarities: [
    { name: 'Comum', chance: 0.70, wood: 1 },
    { name: 'Rara', chance: 0.22, wood: 1.25 },
    { name: 'Super-rara', chance: 0.06, wood: 1.5 },
    { name: 'Ultra-rara', chance: 0.02, wood: 2 }
  ],

  // Loja. Lados aceitam enfeites desde o início e barracas a partir da Quermesse.
  categories: [
    { id: 'chapeu', name: 'Chapéus' }, { id: 'mao', name: 'Na mão' }, { id: 'tecido', name: 'Tecidos' },
    { id: 'terreiro', name: 'Terreiros' }, { id: 'lado', name: 'Barracas e enfeites' }
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

    { id: 'xadrez-vermelho', cat: 'tecido', name: 'Xadrez Vermelho', price: 0, source: 'inicial',
      desc: 'O uniforme oficial de qualquer arraiá.' },
    { id: 'xadrez-azul', cat: 'tecido', name: 'Xadrez Azul', price: 5, desc: 'Pra combinar com o céu de junho.' },
    { id: 'xadrez-verde', cat: 'tecido', name: 'Xadrez Verde', price: 5, desc: 'Da cor do milho verde.' },
    { id: 'remendado', cat: 'tecido', name: 'Remendado com Orgulho', price: 7, desc: 'Cada remendo, uma quadrilha.' },
    { id: 'chita', cat: 'tecido', name: 'Chita Florida', price: 8, desc: 'Florzinha pra todo lado.' },
    { id: 'chita-rosa', cat: 'tecido', name: 'Chita Rosa', price: 8, desc: 'A preferida da Barraca do Beijo.' },
    { id: 'xadrez-ouro', cat: 'tecido', name: 'Xadrez de Ouro', price: 0, source: 'role', desc: 'Brilha mais que a fogueira.' },

    { id: 'terra-batida', cat: 'terreiro', name: 'Terra Batida', price: 0, source: 'inicial',
      desc: 'Poeira boa de levantar no xote.' },
    { id: 'lamacal', cat: 'terreiro', name: 'Lamaçal Pós-Chuva', price: 6, desc: 'Escorrega, mas não cai.' },
    { id: 'gramado', cat: 'terreiro', name: 'Gramado da Praça', price: 8, desc: 'Verdinho, com florzinha.' },
    { id: 'areia', cat: 'terreiro', name: 'Areia de Praia', price: 10, desc: 'São João com pé na areia.' },
    { id: 'tablado', cat: 'terreiro', name: 'Tablado de Madeira', price: 12, desc: 'Pra ouvir o arrasta-pé.' },
    { id: 'pista-forro', cat: 'terreiro', name: 'Pista de Forró', price: 0, source: 'role',
      desc: 'Xadrez no chão e brilho no olhar.' },

    { id: 'fardo', cat: 'lado', kind: 'enfeite', name: 'Fardo de Feno', price: 0, source: 'inicial',
      desc: 'Banco, palco e esconderijo.' },
    { id: 'mastro', cat: 'lado', kind: 'enfeite', name: 'Mastro de Bandeirinhas', price: 0, source: 'inicial',
      desc: 'Fitas coloridas dançando no vento.' },
    { id: 'espantalho', cat: 'lado', kind: 'enfeite', name: 'Espantalho Galã', price: 8,
      desc: 'Pose de galã, coração de palha.' },
    { id: 'carroca', cat: 'lado', kind: 'enfeite', name: 'Carroça Enfeitada', price: 12, desc: 'Leva a turma e a pamonha.' },
    { id: 'barraca-pescaria', cat: 'lado', kind: 'barraca', tier: 1, name: 'Barraca de Pescaria', price: 15,
      desc: 'Onde o Cachorro-Quente joga a vara.', effect: 'Ativa o Pescador.' },
    { id: 'barraca-beijo', cat: 'lado', kind: 'barraca', tier: 1, name: 'Barraca do Beijo', price: 15,
      desc: 'Uma ficha por beijinho. Só na bochecha!', effect: 'Ativa a Barraqueira do Beijo.' },
    { id: 'barraca-comidas', cat: 'lado', kind: 'barraca', tier: 1, name: 'Barraca de Comidas', price: 18,
      desc: 'Pamonha, canjica e curau.', effect: '+10% de Refresco.' },
    { id: 'cadeia', cat: 'lado', kind: 'barraca', tier: 1, name: 'Cadeia do Arraiá', price: 20,
      desc: 'Penetra aqui paga fiança.', effect: 'Penetras rendem o dobro de fichas.' },
    { id: 'correio', cat: 'lado', kind: 'barraca', tier: 1, name: 'Correio Elegante', price: 20,
      desc: 'Recadinho anônimo com duplo sentido.', effect: 'Cartas chegam 30% mais rápido.' },
    { id: 'barraca-argolas', cat: 'lado', kind: 'barraca', tier: 1, name: 'Barraca das Argolas', price: 16,
      desc: 'Garrafa, argola e muita mira.', effect: '+1 argola por rodada nas Argolas e ativa a Argoleira.' }
  ],
  equipped: { chapeu: 'chapeu-palha', mao: 'bandeirinha', tecido: 'xadrez-vermelho', terreiro: 'terra-batida',
    esquerda: 'fardo', direita: 'mastro' },

  // Rolês: um membro da turma sai para buscar lenha. Enquanto isso, o posto dele fica vazio.
  outings: [
    { id: 'quintal', name: 'Catar lenha no quintal', minutes: 20, wood: 6, tier: 2 },
    { id: 'roca', name: 'Buscar milho na roça', minutes: 60, wood: 15, tier: 2 },
    { id: 'vizinhanca', name: 'Convidar a vizinhança', minutes: 120, wood: 28, tier: 2, item: 'rei-baiao', chance: 0.2 },
    { id: 'penetra', name: 'Dar uma de penetra no arraiá vizinho', minutes: 240, wood: 50, tier: 3,
      item: 'pista-forro', chance: 0.15 },
    { id: 'maior', name: 'Visitar o Maior São João', minutes: 480, wood: 90, tier: 3, item: 'xadrez-ouro', chance: 0.12 }
  ],

  // Fogueira: melhorias pagas com lenha. Com 30 melhorias ela vira lendária.
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
      { size: 34, id: 'igrejinha', name: 'Igrejinha' },
      { size: 41, id: 'casinha-azul', name: 'Casinha azul' },
      { size: 48, id: 'lua', name: 'Lua de São João' },
      { size: 56, id: 'catavento', name: 'Cata-vento' },
      { size: 66, id: 'balao', name: 'Balão de papel' },
      { size: 78, id: 'estrelas', name: 'Céu estrelado' },
      // Festas bem grandes: o arraiá vira parque.
      { size: 92, id: 'carrossel', name: 'Carrossel' },
      { size: 108, id: 'balao-grande', name: 'Balão de ar quente' },
      { size: 125, id: 'boi', name: 'Bumba-meu-boi' },
      // O mapa cresce para cima: ilhas flutuando no céu, presas aos mastros.
      { size: 150, id: 'ilha-quadrilha', name: 'Ilha flutuante da quadrilha' },
      { size: 185, id: 'ilha-baloes', name: 'Ilha flutuante dos balões' }
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
    { id: 'coracao', text: 'Me manda um correio elegante!' }
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
    'Não vale espiar quem mandou. Mas é quem tem a maior espiga.'
  ],

  achievements: [
    { id: 'primeiro-passo', name: 'Primeiro passo', text: 'Dançar o primeiro passo.' },
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

  config: {
    fameBase: 400, famePow: 1, fameGrowth: 1.085,
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
