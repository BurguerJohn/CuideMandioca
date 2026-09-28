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
Mandioca dances all by herself, and every step earns Cheer. When she gets tired she takes a break, then comes back with everything she’s got. Upgrade her Wiggle, Stamina, Refreshment and Rhythm and watch the party earn more and more.

[h2]From backyard party to the World’s Biggest São João[/h2]
All the Cheer you gather slowly turns into fame, and fame brings guests. Every new guest adds something to the scenery: a corn stalk, a hen and her chicks, a sleepy cat, a goat, a little chapel, a Ferris wheel. Your backyard arraiá becomes a neighborhood fair, a town festival and, one day, the biggest São João in the world.

[h2]Plenty to do (or not)[/h2]
[list]
[*][b]Lucky Rings:[/b] a ring toss minigame with multipliers and exclusive prizes. The better the prize, the steadier your hand needs to be.
[*][b]The crew:[/b] catch characters at the fishing pond, like Corn, Carrot, Yam, Hot Dog and the ultra-rare Spark. Each one has a job that changes the party.
[*][b]Outings and the bonfire:[/b] send the crew to fetch firewood and feed the bonfire until it becomes legendary.
[*][b]Shop:[/b] hats, fabrics, dance floors, decorations and booths, with an instant preview on the party.
[*][b]Love letters, requests and party crashers:[/b] little surprises that keep the festival lively.
[*][b]History:[/b] a diary and a chart of everything your party unlocked, and when.
[/list]

[h2]Made for your desktop[/h2]
[list]
[*]Transparent window: click right through it while the rest of your screen keeps working.
[*]Drag it anywhere, resize it, pin it above your windows or hide it in the tray.
[*]The party keeps earning at half speed for up to 12 hours while the game is closed.
[*]Cheeky double-meaning jokes, in the spirit of the festa junina love letters.
[*]Portuguese, English and Spanish.
[/list]`
  },

  brazilian: {
    short: 'Uma festa junina em pixel art que dança na sua área de trabalho. A Mandioca dança sozinha enquanto você ' +
      'trabalha: cada passo rende Animação, a Animação traz convidados e o arraiá de quintal vira o Maior São João do Mundo.',
    about: `[h2]Uma festa junina que mora na sua área de trabalho[/h2]
Cuide bem da sua mandioca é um jogo idle aconchegante inspirado nas festas juninas: fogueira, bandeirinha, quadrilha e comida de milho. A festa flutua por cima da sua área de trabalho, ao lado das planilhas e das abas do navegador, e continua crescendo enquanto você trabalha, estuda ou joga.

[h2]Dança, descansa, recomeça[/h2]
A Mandioca dança sozinha, e cada passo rende Animação. Quando cansa, ela descansa e volta com tudo. Melhore o Rebolado, o Fôlego, o Refresco e o Ritmo dela e veja a festa render cada vez mais.

[h2]Do arraiá de quintal ao Maior São João do Mundo[/h2]
Toda Animação que a festa junta vira fama aos pouquinhos, e fama traz convidados. Cada convidado novo traz uma peça para o cenário: um pé de milho, a galinha com os pintinhos, um gato dorminhoco, um bode, uma igrejinha, uma roda-gigante. O arraiá de quintal vira quermesse do bairro, festa da cidade e, um dia, o maior São João do mundo.

[h2]Muito para fazer (ou não)[/h2]
[list]
[*][b]Argolas da Sorte:[/b] um minijogo de argolas com multiplicadores e prêmios exclusivos. Quanto melhor o prêmio, mais certeira tem que ser a mão.
[*][b]A turma:[/b] pesque personagens na pescaria, como o Milho, a Cenoura, o Inhame, o Cachorro-Quente e a ultra-rara Faísca. Cada um tem um papel que muda a festa.
[*][b]Rolês e fogueira:[/b] mande a turma buscar lenha e alimente a fogueira até ela ficar lendária.
[*][b]Loja:[/b] chapéus, tecidos, terreiros, enfeites e barracas, com prévia na hora, direto na festa.
[*][b]Correio elegante, pedidos e penetras:[/b] surpresinhas que deixam o arraiá animado.
[*][b]Histórico:[/b] um diário e um gráfico de tudo o que a sua festa desbloqueou, e quando.
[/list]

[h2]Feito para a sua área de trabalho[/h2]
[list]
[*]Janela transparente: o clique passa por ela e o resto da tela continua funcionando.
[*]Arraste para onde quiser, mude o tamanho, fixe sobre as janelas ou esconda na bandeja.
[*]Com o jogo fechado, a festa continua rendendo pela metade por até 12 horas.
[*]Piadas de duplo sentido, no espírito do correio elegante.
[*]Português, inglês e espanhol.
[/list]`
  },

  spanish: {
    short: 'Una fiesta junina brasileña en pixel art que baila en tu escritorio. Mandioca baila sola mientras trabajas: cada ' +
      'paso da Animación, la Animación trae invitados y la fiesta del patio se vuelve el San Juan más grande del mundo.',
    about: `[h2]Una fiesta junina que vive en tu escritorio[/h2]
Cuida bien tu mandioca es un juego idle acogedor inspirado en las festas juninas de Brasil: hogueras, banderitas, cuadrillas y comida de maíz. La fiesta flota sobre tu escritorio, al lado de tus hojas de cálculo y las pestañas del navegador, y sigue creciendo mientras trabajas, estudias o juegas.

[h2]Baila, descansa, repite[/h2]
Mandioca baila sola, y cada paso da Animación. Cuando se cansa, descansa y vuelve con todo. Mejora su Meneo, su Aliento, su Refresco y su Ritmo y mira cómo la fiesta rinde cada vez más.

[h2]Del arraiá del patio al San Juan más grande del mundo[/h2]
Toda la Animación que junta la fiesta se vuelve fama poco a poco, y la fama trae invitados. Cada invitado nuevo trae algo al escenario: una planta de maíz, la gallina con sus pollitos, un gato dormilón, un chivo, una capillita, una noria. Tu arraiá del patio se vuelve kermés del barrio, fiesta de la ciudad y, algún día, el San Juan más grande del mundo.

[h2]Mucho para hacer (o no)[/h2]
[list]
[*][b]Aros de la Suerte:[/b] un minijuego de lanzar aros con multiplicadores y premios exclusivos. Cuanto mejor el premio, más firme tiene que ser tu mano.
[*][b]La pandilla:[/b] pesca personajes en el estanque, como Maíz, Zanahoria, Ñame, Perrito Caliente y la ultra rara Chispa. Cada uno tiene un papel que cambia la fiesta.
[*][b]Salidas y hoguera:[/b] manda a la pandilla a buscar leña y alimenta la hoguera hasta que se vuelva legendaria.
[*][b]Tienda:[/b] sombreros, telas, suelos, adornos y puestos, con vista previa al instante en la fiesta.
[*][b]Correo del amor, pedidos y colados:[/b] pequeñas sorpresas que mantienen viva la fiesta.
[*][b]Historial:[/b] un diario y un gráfico de todo lo que desbloqueó tu fiesta, y cuándo.
[/list]

[h2]Hecho para tu escritorio[/h2]
[list]
[*]Ventana transparente: los clics la atraviesan y el resto de tu pantalla sigue funcionando.
[*]Arrástrala a donde quieras, cambia su tamaño, fíjala sobre tus ventanas o escóndela en la bandeja.
[*]Con el juego cerrado, la fiesta sigue rindiendo a mitad de velocidad hasta 12 horas.
[*]Chistes de doble sentido, al estilo del correo del amor de las festas juninas.
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
