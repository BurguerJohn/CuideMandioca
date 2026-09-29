// Textos da página da Steam em português, inglês e espanhol (espanhol vale para Espanha e América Latina).
// `node steam/loja/textos.js` gera storepage_<itemid>.json, o arquivo que a aba Tradução do Steamworks aceita em
// "Enviar tradução". O "Sobre o jogo" usa o BBCode da loja ([h2], [list], [b]).
const fs = require('node:fs');
const path = require('node:path');

const ITEM = '1348637';

const TEXTOS = {
  english: {
    short: 'A tiny Brazilian June festival that dances on your desktop. Mandioca dances on her own while you work: every ' +
      'step earns Cheer, Cheer brings guests, and a backyard party grows into the World’s Biggest São João.',
    about: `[h2]A June festival that lives on your desktop[/h2]
Take Good Care of Your Cassava is a cozy idle game inspired by Brazil’s festas juninas, the colorful June festivals full of bonfires, bunting, square dancing and corn treats. The party floats on top of your desktop, right next to your spreadsheets and browser tabs, and keeps growing while you work, study or play.

[h2]Dance, rest, repeat[/h2]
Mandioca dances all by herself, and every step earns Cheer. When she gets tired she takes a break, then comes back with everything she’s got. Upgrade her Wiggle, Stamina, Refreshment and Rhythm and watch the party earn more and more. She starts out as a tiny sprout and grows as you upgrade her, learning new dance moves along the way: xote, frevo, moonwalk, lambada and more.

[h2]From backyard party to the World’s Biggest São João[/h2]
All the Cheer you gather slowly turns into fame, and fame brings guests. Every new guest adds something to the scenery: a corn stalk, a hen and her chicks, a sleepy cat, a goat, a little chapel, a Ferris wheel. Your backyard arraiá becomes a neighborhood fair, a town festival and, one day, the biggest São João in the world.

[h2]Plenty to do (or not)[/h2]
[list]
[*][b]Lucky Rings:[/b] a ring toss minigame with multipliers and exclusive prizes. The better the prize, the steadier your hand needs to be.
[*][b]The crew:[/b] catch characters at the fishing pond, like Corn, Carrot, Yam, Hot Dog and the ultra-rare Spark. Each one has a job that changes the party.
[*][b]Outings and the bonfire:[/b] send the crew to fetch firewood and feed the bonfire until it becomes legendary, or cook pamonha, curau and pé-de-moleque on the Wood Stove.
[*][b]Shop:[/b] hats, fabrics, dance floors, bunting, decorations and booths, with an instant preview on the party. Wear a matching hat, hand item and fabric (Bride, Groom, Corn Queen, Baião King...) to earn an outfit set bonus.
[*][b]Party events:[/b] lucky golden balloons, June rain with a pot of gold at the rainbow’s end, called square dances, a fair bingo with the caller’s nicknames for the numbers, a clay pot to smash, sack races, pin the tail on the donkey, a prize auction against the crowd, June cold snaps with hot quentão, the fair loudspeaker, the square dance cloth snake, the street photographer, the ribbon dance and, in bigger parties, a country wedding where you throw rice at the newlyweds and a drone show in the sky.
[*][b]Party Album:[/b] 35 stickers of party moments to collect. Every full page makes the party earn more, forever.
[*][b]Next year’s São João:[/b] reached the World’s Biggest São João? Start over in the backyard with your crew and clothes, and earn a permanent Tradition bonus.
[*][b]Love letters, requests and party crashers:[/b] little surprises that keep the festival lively.
[*][b]History:[/b] a diary and a chart of everything your party unlocked, and when.
[/list]

[h2]Made for your desktop[/h2]
[list]
[*]Transparent window: click right through it while the rest of your screen keeps working.
[*]Drag it anywhere, resize it, pin it above your windows or hide it in the tray.
[*]The party keeps earning at 25% speed for up to 12 hours while the game is closed.
[*]Cheeky double-meaning jokes, in the spirit of the festa junina love letters.
[*]Optional background music (a forró, a xote, a baião and an arrasta-pé), off by default.
[*]Optionally opens with Windows, through Steam.
[*]Portuguese, English and Spanish.
[/list]`
  },

  brazilian: {
    short: 'Uma festa junina em pixel art que dança na sua área de trabalho. A Mandioca dança sozinha enquanto você ' +
      'trabalha: cada passo rende Animação, a Animação traz convidados e o arraiá de quintal vira o Maior São João do Mundo.',
    about: `[h2]Uma festa junina que mora na sua área de trabalho[/h2]
Cuide bem da sua mandioca é um jogo idle aconchegante inspirado nas festas juninas: fogueira, bandeirinha, quadrilha e comida de milho. A festa flutua por cima da sua área de trabalho, ao lado das planilhas e das abas do navegador, e continua crescendo enquanto você trabalha, estuda ou joga.

[h2]Dança, descansa, recomeça[/h2]
A Mandioca dança sozinha, e cada passo rende Animação. Quando cansa, ela descansa e volta com tudo. Melhore o Rebolado, o Fôlego, o Refresco e o Ritmo dela e veja a festa render cada vez mais. Ela começa um brotinho e cresce com as melhorias, aprendendo passos novos no caminho: xote, frevo, moonwalk, lambada e mais.

[h2]Do arraiá de quintal ao Maior São João do Mundo[/h2]
Toda Animação que a festa junta vira fama aos pouquinhos, e fama traz convidados. Cada convidado novo traz uma peça para o cenário: um pé de milho, a galinha com os pintinhos, um gato dorminhoco, um bode, uma igrejinha, uma roda-gigante. O arraiá de quintal vira quermesse do bairro, festa da cidade e, um dia, o maior São João do mundo.

[h2]Muito para fazer (ou não)[/h2]
[list]
[*][b]Argolas da Sorte:[/b] um minijogo de argolas com multiplicadores e prêmios exclusivos. Quanto melhor o prêmio, mais certeira tem que ser a mão.
[*][b]A turma:[/b] pesque personagens na pescaria, como o Milho, a Cenoura, o Inhame, o Cachorro-Quente e a ultra-rara Faísca. Cada um tem um papel que muda a festa.
[*][b]Rolês e fogueira:[/b] mande a turma buscar lenha e alimente a fogueira até ela ficar lendária, ou cozinhe pamonha, curau e pé-de-moleque no Fogão a Lenha.
[*][b]Loja:[/b] chapéus, tecidos, terreiros, varais de bandeirinhas, enfeites e barracas, com prévia na hora, direto na festa. Vista chapéu, item de mão e tecido combinando (Noiva, Noivo, Rainha do Milho, Rei do Baião...) e ganhe o bônus do conjunto.
[*][b]Eventos da festa:[/b] balões de sorte dourados, chuva de São João com pote de ouro no fim do arco-íris, quadrilha marcada, bingo da quermesse com os apelidos dos números, quebra-pote, corrida de saco, rabo no burro, leilão de prendas disputado com a plateia, friozinho com quentão, o alto-falante da quermesse, a cobra de pano da quadrilha, o fotógrafo lambe-lambe, a dança das fitas e, nas festas maiores, um casamento na roça em que você joga arroz nos noivos e um show de drones no céu.
[*][b]Álbum da Festa:[/b] 35 figurinhas dos momentos da festa para colecionar. Cada página completa faz a festa render mais, para sempre.
[*][b]São João do ano que vem:[/b] chegou ao Maior São João do Mundo? Recomece no quintal com a turma e as roupas e ganhe um bônus de Tradição para sempre.
[*][b]Correio elegante, pedidos e penetras:[/b] surpresinhas que deixam o arraiá animado.
[*][b]Histórico:[/b] um diário e um gráfico de tudo o que a sua festa desbloqueou, e quando.
[/list]

[h2]Feito para a sua área de trabalho[/h2]
[list]
[*]Janela transparente: o clique passa por ela e o resto da tela continua funcionando.
[*]Arraste para onde quiser, mude o tamanho, fixe sobre as janelas ou esconda na bandeja.
[*]Com o jogo fechado, a festa continua rendendo 25% por até 12 horas.
[*]Piadas de duplo sentido, no espírito do correio elegante.
[*]Música de fundo opcional (um forró, um xote, um baião e um arrasta-pé), desligada de fábrica.
[*]Abre com o Windows se você quiser, pela Steam.
[*]Português, inglês e espanhol.
[/list]`
  },

  spanish: {
    short: 'Una fiesta junina brasileña en pixel art que baila en tu escritorio. Mandioca baila sola mientras trabajas: cada ' +
      'paso da Animación, la Animación trae invitados y la fiesta del patio se vuelve el San Juan más grande del mundo.',
    about: `[h2]Una fiesta junina que vive en tu escritorio[/h2]
Cuida bien tu mandioca es un juego idle acogedor inspirado en las festas juninas de Brasil: hogueras, banderitas, cuadrillas y comida de maíz. La fiesta flota sobre tu escritorio, al lado de tus hojas de cálculo y las pestañas del navegador, y sigue creciendo mientras trabajas, estudias o juegas.

[h2]Baila, descansa, repite[/h2]
Mandioca baila sola, y cada paso da Animación. Cuando se cansa, descansa y vuelve con todo. Mejora su Meneo, su Aliento, su Refresco y su Ritmo y mira cómo la fiesta rinde cada vez más. Empieza como un brotecito y crece con las mejoras, aprendiendo pasos nuevos en el camino: xote, frevo, moonwalk, lambada y más.

[h2]Del arraiá del patio al San Juan más grande del mundo[/h2]
Toda la Animación que junta la fiesta se vuelve fama poco a poco, y la fama trae invitados. Cada invitado nuevo trae algo al escenario: una planta de maíz, la gallina con sus pollitos, un gato dormilón, un chivo, una capillita, una noria. Tu arraiá del patio se vuelve kermés del barrio, fiesta de la ciudad y, algún día, el San Juan más grande del mundo.

[h2]Mucho para hacer (o no)[/h2]
[list]
[*][b]Aros de la Suerte:[/b] un minijuego de lanzar aros con multiplicadores y premios exclusivos. Cuanto mejor el premio, más firme tiene que ser tu mano.
[*][b]La pandilla:[/b] pesca personajes en el estanque, como Maíz, Zanahoria, Ñame, Perrito Caliente y la ultra rara Chispa. Cada uno tiene un papel que cambia la fiesta.
[*][b]Salidas y hoguera:[/b] manda a la pandilla a buscar leña y alimenta la hoguera hasta que se vuelva legendaria, o cocina pamonha, curau y pé-de-moleque en el Fogón de Leña.
[*][b]Tienda:[/b] sombreros, telas, suelos, banderines, adornos y puestos, con vista previa al instante en la fiesta. Viste sombrero, objeto de mano y tela a juego (Novia, Novio, Reina del Maíz, Rey del Baião...) y gana la bonificación del conjunto.
[*][b]Eventos de la fiesta:[/b] globos de la suerte dorados, lluvia de San Juan con una olla de oro al final del arcoíris, cuadrillas marcadas, un bingo de kermés con los apodos de los números, una olla para romper, carreras de sacos, la cola del burro, una subasta de premios contra el público, friíto con quentão, el altavoz de la kermés, la culebra de tela de la cuadrilla, el fotógrafo ambulante, la danza de las cintas y, en las fiestas más grandes, una boda campestre en la que tiras arroz a los novios y un show de drones en el cielo.
[*][b]Álbum de la Fiesta:[/b] 35 estampas de momentos de la fiesta para coleccionar. Cada página completa hace que la fiesta rinda más, para siempre.
[*][b]El San Juan del año que viene:[/b] ¿llegaste al San Juan más grande del mundo? Vuelve a empezar en el patio con tu pandilla y tu ropa y gana una bonificación de Tradición para siempre.
[*][b]Correo del amor, pedidos y colados:[/b] pequeñas sorpresas que mantienen viva la fiesta.
[*][b]Historial:[/b] un diario y un gráfico de todo lo que desbloqueó tu fiesta, y cuándo.
[/list]

[h2]Hecho para tu escritorio[/h2]
[list]
[*]Ventana transparente: los clics la atraviesan y el resto de tu pantalla sigue funcionando.
[*]Arrástrala a donde quieras, cambia su tamaño, fíjala sobre tus ventanas o escóndela en la bandeja.
[*]Con el juego cerrado, la fiesta sigue rindiendo al 25% de velocidad hasta 12 horas.
[*]Chistes de doble sentido, al estilo del correo del amor de las festas juninas.
[*]Música de fondo opcional (un forró, un xote, un baião y un arrasta-pé), desactivada de fábrica.
[*]Se abre con Windows si quieres, por Steam.
[*]Portugués, inglés y español.
[/list]`
  }
};
TEXTOS.latam = TEXTOS.spanish;

if (require.main === module) {
  const languages = {};
  for (const [lang, texto] of Object.entries(TEXTOS)) {
    if (texto.short.length > 300) throw new Error(`${lang}: descrição curta com ${texto.short.length} caracteres (máximo 300)`);
    languages[lang] = { 'app[content][short_description]': texto.short, 'app[content][about]': texto.about };
    console.log(`${lang}: curta ${texto.short.length} caracteres, sobre ${texto.about.length}`);
  }
  const saida = path.join(__dirname, `storepage_${ITEM}.json`);
  fs.writeFileSync(saida, JSON.stringify({ itemid: ITEM, languages }));
  console.log(saida);
}

module.exports = { TEXTOS, ITEM };
