// Legendas dos vídeos em inglês e espanhol: cada linha é [texto no index.html em português, inglês, espanhol].
// O texto em português tem que existir exatamente assim no vídeo (o traduzir.js confere). Os nomes do jogo
// (porte, cenário, turma) seguem as traduções de src/lang, para bater com o que aparece na gameplay.
const comum = [
  ['<html lang="pt-BR"', '<html lang="en"', '<html lang="es"'],
  // Placa do título: o nome do jogo em cada idioma, igual ao da Steam (app.title em src/lang).
  ['<span class="l1">CUIDE BEM DA SUA</span><span class="l2">MANDIOCA</span>',
    '<span class="l1">TAKE GOOD CARE OF YOUR</span><span class="l2">CASSAVA</span>',
    '<span class="l1">CUIDA BIEN TU</span><span class="l2">MANDIOCA</span>']
];
const tagline = [
  ['o joguinho de festa junina que dança na sua área de trabalho',
    'a tiny Brazilian June festival that dances on your desktop',
    'el jueguito de fiesta junina brasileña que baila en tu escritorio']
];
const segue = ['segue pra ver a festa crescer 🌽', 'follow to watch the party grow 🌽', 'sígueme para ver crecer la fiesta 🌽'];

module.exports = {
  evolucao: [
    ...comum,
    ...tagline,
    segue,
    ['Comecei a cuidar da minha <em>mandioca</em> 🌱', 'I started taking care of my <em>cassava</em> 🌱',
      'Empecé a cuidar mi <em>mandioca</em> 🌱'],
    ['⏱ 15 MIN DE JOGO', '⏱ 15 MIN OF PLAY', '⏱ 15 MIN DE JUEGO'],
    ['<em>10</em> convidados: virou quermesse 🎪', '<em>10</em> guests: now it’s a fair 🎪',
      '<em>10</em> invitados: ya es una kermés 🎪'],
    ['Festa da Cidade, com <em>palco</em> de forró 🪗', 'Town Festival, with a forró <em>stage</em> 🪗',
      'Fiesta de la Ciudad,<br />con <em>forró</em> en vivo 🪗'],
    ['⏱ 4 HORAS', '⏱ 4 HOURS', '⏱ 4 HORAS'],
    ['<em>50</em> convidados e roda&#8209;gigante 🎡', '<em>50</em> guests and a Ferris wheel 🎡',
      '<em>50</em> invitados y una noria 🎡'],
    ['⏱ 40 HORAS', '⏱ 40 HOURS', '⏱ 40 HORAS'],
    ['o <em>MAIOR SÃO JOÃO</em> DO MUNDO', 'the <em>WORLD’S BIGGEST</em> SÃO JOÃO',
      'el <em>SAN JUAN</em> MÁS GRANDE DEL MUNDO'],
    ['🎆 101 CONVIDADOS', '🎆 101 GUESTS', '🎆 101 INVITADOS']
  ],

  mesa: [
    ...comum,
    ...tagline,
    ['POV: você instalou isso no <em>PC do trabalho</em> 👀', 'POV: you installed this on your <em>work PC</em> 👀',
      'POV: instalaste esto en la <em>PC del trabajo</em> 👀'],
    ['ela fica <em>DANÇANDO</em> em cima da planilha 💃', 'she keeps <em>DANCING</em> on your spreadsheet 💃',
      'se queda <em>BAILANDO</em> encima de la hoja de cálculo 💃'],
    ['até <em>PENETRA</em> aparece 😂', 'even a <em>PARTY CRASHER</em> shows up 😂', 'hasta aparece un <em>COLADO</em> 😂'],
    ['a festa cresce enquanto você <em>“trabalha”</em> 📈', 'the party grows while you <em>“work”</em> 📈',
      'la fiesta crece mientras tú <em>«trabajas»</em> 📈'],
    ['PRODUTIVIDADE: 0%', 'PRODUCTIVITY: 0%', 'PRODUCTIVIDAD: 0%'],
    ['ANIMAÇÃO: 100%', 'CHEER: 100%', 'ANIMACIÓN: 100%'],
    ['comenta se você instalaria 👇', 'comment if you’d install it 👇', 'comenta si lo instalarías 👇']
  ],

  argolas: [
    ...comum,
    ...tagline,
    ['essa garrafa tem <em>1 PIXEL</em> de folga 😰', 'this bottle has <em>1 PIXEL</em> of wiggle room 😰',
      'esta botella tiene <em>1 PÍXEL</em> de margen 😰'],
    ['GARRAFA FINA: 5 PX DE FOLGA', 'THIN BOTTLE: 5 PX OF ROOM', 'BOTELLA FINA: 5 PX DE MARGEN'],
    ['essa é <em>fácil</em> ✅', 'this one’s <em>easy</em> ✅', 'esta es <em>fácil</em> ✅'],
    ['<em>×3</em> na garrafa<br />do meio ⚡', '<em>×3</em> on the<br />middle bottle ⚡', '<em>×3</em> en la botella<br />del medio ⚡'],
    ['agora o <em>PRESENTE</em>… 😬', 'now the <em>GIFT</em>… 😬', 'ahora el <em>REGALO</em>… 😬'],
    ['ACERTOU!!', 'NAILED IT!!', '¡¡ACERTÉ!!'],
    ['4 DE 4 · TUDO ×3', '4 OF 4 · EVERYTHING ×3', '4 DE 4 · TODO ×3'],
    ['e ganhei os <em>Óculos de Coração</em> 😍', 'and I won the <em>Heart Glasses</em> 😍',
      'y gané las <em>Gafas de Corazón</em> 😍'],
    ['e ela já tá <em>usando</em> 😎', 'and she’s already <em>wearing them</em> 😎', 'y ya las está <em>usando</em> 😎'],
    ['você acertaria? comenta 👇', 'could you land it? comment 👇', '¿lo lograrías? comenta 👇']
  ],

  presentes: [
    ...comum,
    ...tagline,
    segue,
    ['cada convidado traz um <em>PRESENTE</em> pra festa 🎁', 'every guest brings a <em>GIFT</em> to the party 🎁',
      'cada invitado trae un <em>REGALO</em> a la fiesta 🎁'],
    ['👥 22 CONVIDADOS', '👥 22 GUESTS', '👥 22 INVITADOS'],
    ['`👥 ${20 + n} CONVIDADOS`', '`👥 ${20 + n} GUESTS`', '`👥 ${20 + n} INVITADOS`'],
    ['virou<br /><em>FESTA DA CIDADE</em> 🎪', 'now it’s a<br /><em>TOWN FESTIVAL</em> 🎪',
      'ahora es la<br /><em>FIESTA DE LA CIUDAD</em> 🎪'],
    ['"Balãozinho no varal 🏮"', '"String lantern 🏮"', '"Farolito en la cuerda 🏮"'],
    ['"Pintinho 🐤"', '"Chick 🐤"', '"Pollito 🐤"'],
    ['"COQUEIRO 🌴"', '"COCONUT PALM 🌴"', '"COCOTERO 🌴"'],
    ['"Mandioquinha na raiz 🥔"', '"Baby cassava 🥔"', '"Mandioquita 🥔"'],
    ['"Vaga-lume ✨"', '"Firefly ✨"', '"Luciérnaga ✨"'],
    ['"BODE 🐐"', '"GOAT 🐐"', '"CHIVO 🐐"'],
    ['"IGREJINHA ⛪"', '"LITTLE CHAPEL ⛪"', '"CAPILLITA ⛪"']
  ],

  // Trailer da Steam: selo (portes com os nomes do jogo), legendas, etiquetas e a linha final.
  steam: [
    ...comum,
    ['Arraiá de Quintal</span>', 'Backyard Arraiá</span>', 'Arraiá del Patio</span>'],
    ['Quermesse do Bairro</span>', 'Neighborhood Fair</span>', 'Kermés del Barrio</span>'],
    ['Festa da Cidade</span>', 'Town Festival</span>', 'Fiesta de la Ciudad</span>'],
    ['São João Regional</span>', 'Regional São João</span>', 'San Juan Regional</span>'],
    ['Maior São João do Mundo</span>', 'World’s Biggest São João</span>', 'El San Juan Más Grande del Mundo</span>'],
    ['<span class="linha">Uma festa junina que dança</span><span class="linha">na sua <em>área de trabalho</em></span>',
      '<span class="linha">A June festival party that dances</span><span class="linha">on your <em>desktop</em></span>',
      '<span class="linha">Una fiesta junina que baila</span><span class="linha">en tu <em>escritorio</em></span>'],
    ['<span class="linha">Cada passo rende <em>Animação</em></span>', '<span class="linha">Every step earns <em>Cheer</em></span>',
      '<span class="linha">Cada paso da <em>Animación</em></span>'],
    ['<span class="linha">Melhore a dança</span><span class="linha">e veja a Mandioca <em>crescer</em></span>',
      '<span class="linha">Upgrade her dance</span><span class="linha">and watch Mandioca <em>grow</em></span>',
      '<span class="linha">Mejora el baile</span><span class="linha">y mira a Mandioca <em>crecer</em></span>'],
    ['<span class="linha">Cada convidado traz</span><span class="linha"><em>algo novo</em> pra festa</span>',
      '<span class="linha">Every guest brings</span><span class="linha"><em>something new</em> to the party</span>',
      '<span class="linha">Cada invitado trae</span><span class="linha"><em>algo nuevo</em> a la fiesta</span>'],
    ['<span class="linha"><em>Quebra-pote</em>, casamento na roça</span><span class="linha">e <em>muito mais</em></span>',
      '<span class="linha"><em>Pot smashing</em>, country weddings</span><span class="linha">and <em>so much more</em></span>',
      '<span class="linha"><em>Quiebra de la olla</em>, bodas campestres</span><span class="linha">y <em>mucho más</em></span>'],
    ['<span class="linha"><em>Dança das fitas</em>, forró</span><span class="linha">e <em>fogueira</em> acesa</span>',
      '<span class="linha"><em>Ribbon dance</em>, forró</span><span class="linha">and a blazing <em>bonfire</em></span>',
      '<span class="linha"><em>Danza de las cintas</em>, forró</span><span class="linha">y la <em>hoguera</em> encendida</span>'],
    ['<span class="linha">o <em>MAIOR SÃO JOÃO</em></span><span class="linha">DO MUNDO</span>',
      '<span class="linha">the <em>WORLD’S BIGGEST</em></span><span class="linha">SÃO JOÃO</span>',
      '<span class="linha">el <em>SAN JUAN</em></span><span class="linha">MÁS GRANDE DEL MUNDO</span>'],
    ['<span class="linha">Um jogo <em>idle</em> de festa junina</span><span class="linha">para a sua <em>área de trabalho</em></span>',
      '<span class="linha">An <em>idle</em> June festival game</span><span class="linha">for your <em>desktop</em></span>',
      '<span class="linha">Un juego <em>idle</em> de fiesta junina</span><span class="linha">para tu <em>escritorio</em></span>'],
    ['>Chapéu de Vaqueiro!<', '>Cowboy Hat!<', '>¡Sombrero Vaquero!<'],
    ['>Xadrez Azul!<', '>Blue Plaid!<', '>¡Cuadros Azules!<'],
    ['>Milho entrou na turma!<', '>Corn joined the crew!<', '>¡Maíz se unió a la pandilla!<']
  ],

  turma: [
    ...comum,
    segue,
    ['conheça a <em>TURMA</em><br />da festa 👇', 'meet the party<br /><em>CREW</em> 👇', 'conoce a la <em>PANDILLA</em><br />de la fiesta 👇'],
    ['(espera a última 🔥)', '(wait for the last one 🔥)', '(espera a la última 🔥)'],
    ['qual é o seu<br /><em>favorito</em>? 👇', 'who’s your<br /><em>favorite</em>? 👇', '¿quién es tu<br /><em>favorito</em>? 👇'],
    ['[["COMUM", "70%"], ["RARA", "22%"], ["SUPER-RARA", "6%"], ["ULTRA-RARA", "2%"]]',
      '[["COMMON", "70%"], ["RARE", "22%"], ["SUPER RARE", "6%"], ["ULTRA RARE", "2%"]]',
      '[["COMÚN", "70%"], ["RARA", "22%"], ["SÚPER RARA", "6%"], ["ULTRA RARA", "2%"]]'],
    ['nome: "Milho"', 'nome: "Corn"', 'nome: "Maíz"'],
    ['nome: "Cenoura"', 'nome: "Carrot"', 'nome: "Zanahoria"'],
    ['nome: "Inhame"', 'nome: "Yam"', 'nome: "Ñame"'],
    ['nome: "Batata‑Doce"', 'nome: "Sweet Potato"', 'nome: "Camote"'],
    ['nome: "Cachorro‑Quente"', 'nome: "Hot Dog"', 'nome: "Perrito Caliente"'],
    ['nome: "Faísca"', 'nome: "Spark"', 'nome: "Chispa"'],
    ['"Par da quadrilha"', '"Square-dance partner"', '"Pareja de la cuadrilla"'],
    ['"Sanfona do palco"', '"Stage accordion"', '"Acordeón del escenario"'],
    ['"Zabumba do palco"', '"Stage zabumba drum"', '"Zabumba del escenario"'],
    ['"Triângulo do palco"', '"Stage triangle"', '"Triángulo del escenario"'],
    ['"Marcadora da quadrilha"', '"Square-dance caller"', '"Marcadora de la cuadrilla"'],
    ['"Barraca do Beijo"', '"Kissing Booth"', '"Puesto de Besos"'],
    ['"Barraca de Pescaria"', '"Fishing Booth"', '"Puesto de Pesca"'],
    ['"Barraca das Argolas"', '"Ring Toss Booth"', '"Puesto de Aros"'],
    ['"Beira da fogueira"', '"By the bonfire"', '"Junto a la hoguera"'],
    ['"+ Animação a cada passo"', '"+ Cheer every step"', '"+ Animación en cada paso"'],
    ['"+ Ritmo: dança mais rápido"', '"+ Rhythm: dances faster"', '"+ Ritmo: baila más rápido"'],
    ['"+ Fôlego: mais passos"', '"+ Stamina: more steps"', '"+ Aliento: más pasos"'],
    ['"+ Refresco: descansa rápido"', '"+ Refreshment: rests faster"', '"+ Refresco: descansa rápido"'],
    ['"“Olha a cobra!” = passo ×3"', '"“Look, a snake!” = step ×3"', '"«¡Ojo, la culebra!» = paso ×3"'],
    ['"pedidos pagam mais 💋"', '"requests pay more 💋"', '"los pedidos pagan más 💋"'],
    ['"prendas mais rápidas 🎣"', '"prizes come faster 🎣"', '"premios más rápidos 🎣"'],
    ['"argolas baratas mais rápido"', '"rings get cheaper faster"', '"los aros se abaratan antes"'],
    ['"labareda dura mais 🔥"', '"the flare lasts longer 🔥"', '"la llamarada dura más 🔥"']
  ]
};
