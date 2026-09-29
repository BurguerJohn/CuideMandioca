# Cuide bem da sua mandioca

Uma festa junina em pixel art que flutua na área de trabalho e cresce enquanto você usa o computador. A Mandioca dança sozinha, cansa, descansa e volta com tudo; cada passo rende Animação, e a festa vai de um arraiá de quintal ao Maior São João do Mundo.

## Jogar no Windows

Abra `dist/CuideBemDaSuaMandioca-win32-x64/CuideBemDaSuaMandioca.exe`. Para distribuir, leve a pasta inteira: o `.exe` sozinho não roda.

A festa aparece sobre a barra de tarefas, e o resto da tela continua clicável. Segure e arraste qualquer parte da festa para mudar ela de lugar, até as partes que abrem algo ao clicar (barracas, fogueira, palco, pedido, Sopinha): só o clique sem arrastar abre. A placa, a loja, o painel e as Argolas vão junto. Para mudar só a placa de lugar, arraste ela pelo fundo (fora dos botões); o painel e as Argolas também se arrastam sozinhos pela faixa do título, e a loja desliza para os lados arrastada por qualquer parte fora dos botões e itens. Em Ajustes, "Grudar a placa na festa" devolve a placa ao lugar automático. A placa tem uma barra de ferramentas:

- **Vitrine:** a loja abre em cima da festa. Passe o mouse num item para ver uma prévia na própria festa. Segure o botão de uma melhoria para comprar vários níveis.
- **Conjuntos:** vestir juntos o chapéu, o item de mão e o tecido de um conjunto (Caipira de Raiz, Pescador, Peão de Boiadeiro, Dama de Chita, Namorados, Circo da Quermesse, Lampião, Noiva, Noivo, Rainha do Milho, Rei do Baião, Maria Chiquinha, Arraiá Aceso, Forrozeiro de Caruaru, Arrematador) rende o bônus dele em cima de tudo (de +3% a +8%). A aba **Conjuntos** da loja lista todos (prévia ao passar o mouse; um clique veste as três peças, se você tem todas); passando o mouse numa peça você vê de quais conjuntos ela faz parte, e o Painel mostra o conjunto que está valendo (5 conjuntos diferentes dão "Estilista caipira").
- **Argolas da Sorte:** um minijogo que começa custando 1 ficha. Cada rodada dobra o preço da próxima, e a cada 10 minutos sem jogar o preço cai pela metade, até voltar a 1 (o número vermelho no botão da placa mostra o preço quando ele subiu). Você joga 3 argolas nas garrafas, e cada garrafa esconde um prêmio: fichas, Animação, lenha, ×2, ×3 ou um item exclusivo. A garrafa de Animação (a estrela) multiplica a Animação que a festa já tem, por 2 ou por 3; duas delas se multiplicam (×2 e ×3 dão ×6). As garrafas ×2 e ×3 sem estrela valem para a rodada inteira, inclusive para o que a estrela rendeu. Quanto melhor o prêmio, mais larga a boca da garrafa e mais certeira a argola precisa cair: a garrafinha de fichas dá 5 pixels de folga para cada lado, e o presente dá só 1 (`ringAim` em `src/data.js`). A Barraca das Argolas dá uma argola a mais e põe a Paçoca, a Argoleira, no balcão: com ela, o preço baixa mais rápido.
- **Turma, Pescaria, Rolês, Fogueira e Correio:** cada um tem seu botão na placa e abre na própria janela (clicar de novo fecha). Os botões aparecem conforme a festa libera cada parte, e um número vermelho avisa quando tem prenda, carta ou rolê esperando.
- **Painel:** só os números da festa, o histórico, as conquistas e os ajustes.
- **Histórico:** o jogo guarda um diário de cada acontecimento (convidado novo, porte, turma, item, conquista, compra, rolê, pedido, penetra, carta, Argolas) com o tempo de jogo em que aconteceu. A aba Histórico do Painel mostra um gráfico da lotação pelo tempo de jogo com cada desbloqueio marcado (passe o mouse para ver o que foi) e o diário, filtrável entre só desbloqueios e tudo. O diário guarda até 4.000 linhas; quando enche, saem primeiro os acontecimentos miúdos, nunca os desbloqueios. `npm run simulate -- 12 {} partida.json` salva uma partida simulada para testar.
- **Botão de tamanho** (a seta com a porcentagem): arraste para cima ou para a direita para aumentar o jogo, e para baixo ou para a esquerda para diminuir. Um clique, sem arrastar, volta para 100%. A roda do mouse em cima dele também funciona. A festa para de crescer quando chega ao tamanho da tela, e a placa nunca sai dela.
- **✕:** fecha o jogo. Clique duas vezes em até 3 segundos; o jogo salva antes de sair.

Clicar na festa dá foco ao jogo; clicar fora dele (em outro programa ou na área de trabalho) tira o foco, e a placa some até você clicar na festa de novo. Clicar no chão e nos enfeites não abre nada; o que tem função reage: a Mandioca (carinho), o pedido e o penetra, os balões e potes de prêmio, os noivos (arroz), as barracas (argolas, pescaria, correio, beijo), o palco (turma) e a fogueira. Os bichos, as crianças, o trem, a roda-gigante e o resto do cenário só reagem com uma animação e um som. A aba Festa tem o cartão **Dá para clicar**, com essa lista. Esc fecha a janela de cima, e Espaço joga uma argola.

O jogo tem botão na barra de tarefas: clicar nele minimiza a festa, e clicar de novo traz de volta, já com foco. Clicar no ícone da bandeja ou abrir o jogo de novo (atalho, Steam) também traz a festa para a frente, sem abrir janela nenhuma; o Painel fica no menu da bandeja.

**Se travar:** a festa não para por causa de um erro num quadro, e se a página cair ou ficar 15 s sem responder, o jogo abre uma festa nova sozinho. O Electron também conta à festa onde o cursor está a cada 120 ms, para ela nunca ficar sem clique se o repasse do mouse do Windows falhar. Os erros ficam em `erros.log`, na pasta de dados do jogo (`%APPDATA%\Cuide bem da sua mandioca`); é o arquivo para pedir a quem relatar um travamento.

**Abrir com o Windows:** em **Painel > Ajustes > Janela** (desligado de fábrica). Ligado, o jogo instalado se registra para abrir quando a pessoa entra no Windows (`app.setLoginItemSettings` em `desktop/main.js`, conferido a cada abertura para acompanhar a pasta da Steam). Como a versão da Steam só roda aberta por ela, o exe aberto pelo Windows pede para a Steam relançar e sai, então a festa sempre abre pela Steam, com conquistas e horas contando. Em desenvolvimento (`electron .`) o ajuste é guardado, mas não mexe no Windows.

**Desempenho:** em Painel > Ajustes, o perfil escolhe quantos quadros por segundo a festa desenha com o jogo em foco e de fundo: Suave (60 e 30, o padrão), Normal (30 e 20) ou Economia (20 e 12). Festa grande gasta mais do computador (com 220 convidados, cerca de um núcleo com o jogo em foco no Suave); o Normal corta isso quase pela metade.

**Foto da festa:** o botão da câmera salva um PNG com a festa numa moldura de foto instantânea, com o nome da festa (ou o título do jogo) e o porte com o número de convidados.

**Bichos clicáveis:** o sapinho que atravessa o quintal aos pulinhos (nas festas pequenas), a galinha, os pintinhos, o bode, o gato, o boi, as crianças, o vira-lata caramelo (que passeia, de vez em quando corre atrás do Sopinha e dorme do lado da fogueira), a igrejinha (o sino toca), a lua, a pipa, a roda-gigante, o carrossel e o cata-vento (que giram mais depressa) e o trem da alegria (que chega com 240 convidados e apita) reagem ao clique com um pulinho, um grito escrito em cima deles (e penas, no caso das aves) e um som. As barracas e enfeites dos lados que não abrem janela também respondem: a Barraca do Beijo manda beijo (corações e, a cada 5 minutos, 1 ficha), a de Comidas estoura pipoca, a cadeia grita "Tá preso!" (e o penetra que você expulsa com a cadeia montada fica um minuto atrás das grades, reclamando), o espantalho solta palha, o mastro solta confete. Segurar e arrastar continua movendo a festa.

**Ciranda:** com duas ou mais crianças (a partir de 70 convidados), a cada 1 a 2 minutos elas dão a volta na fogueira por uns 10 s, passando por trás das chamas e pela frente, e voltam a correr pela festa.

**Som:** o jogo tem efeitos sonoros (compras, melhorias, argolas, pescaria, cartas, convidados novos, porte, conquistas, pedido e penetra), sintetizados na hora em `src/som.js`, sem arquivo de áudio. Em **Painel > Ajustes > Som** dá para ligar, desligar e escolher o volume; o menu da bandeja também liga e desliga. Com a festa escondida, nada toca. **Música:** em **Ajustes > Som > Música** (desligada de fábrica) toca um forró de fundo em laço de 16 compassos (partes A e B) (zabumba, triângulo, baixo e acordes de sanfona, também sintetizados em `src/som.js`), no volume do som e mais baixinho que os efeitos.

**Modo de teste:** o botão da joaninha na placa abre atalhos para testar: dar Animação, fichas e lenha, trazer convidados ou pular para o próximo porte, avançar o tempo, deixar prendas, cartas e rolês prontos, completar a turma, ganhar todos os itens e chamar pedido ou penetra. Tudo o que sai de lá fica marcado como teste no Histórico. Para esconder o botão (antes de lançar o jogo), mude `debugMenu` para `false` em `src/data.js`.

O ícone na bandeja do Windows tem: abrir painel, abrir a loja, Argolas da Sorte, tirar foto, fixar sobre as janelas, tamanho (25% a 300%, os mesmos de Ajustes e da alça de arrastar), monitor, idioma, som, música, abrir com o Windows, desempenho (quadros por segundo), esconder a festa e fechar o jogo.

## Idiomas

O jogo tem português (Brasil), inglês e espanhol. Na primeira vez, ele abre no idioma escolhido para o jogo na Steam. Se esse idioma não estiver na lista, abre em inglês. Fora da Steam (em desenvolvimento ou no navegador), ele usa o idioma do computador, com a mesma regra.

Para trocar, abra **Painel > Ajustes > 🌐 Idioma** (é a primeira coisa da aba) ou use o menu da bandeja. "Automático" volta a seguir a Steam. Trocar salva a festa e reabre o jogo já no idioma novo, com os Ajustes abertos (numa janela nova: recarregar a página quebra o clique vazado no Windows, veja `desktop/main.js`). A escolha fica em `window-settings.json`.

- `src/lang/pt-BR.js`, `en.js` e `es.js`: os textos da interface (chaves `ui`). O inglês e o espanhol também trazem o conteúdo do jogo (chaves `data`: itens, turma, cartas, conquistas...). O original desse conteúdo continua em `src/data.js`, em português.
- `src/i18n.js`: a lista de idiomas, a regra da Steam (`brazilian`/`portuguese` → pt-BR, `english` → en, `spanish`/`latam` → es) e a função `t()`. Uma chave que faltar cai para o inglês e depois para o português.
- As placas pintadas nas barracas (PESCARIA, FISHING, PESCA...) também vêm do idioma (chaves `sign.*`). Só "FORRÓ", no palco, é igual em todas as línguas.
- Para adicionar um idioma, copie `src/lang/en.js`, traduza, ponha o idioma em `LANGUAGES` (`src/i18n.js`), em `index.html` e em `STEAM_LANGUAGES` (`desktop/prepare-steam.js`). `npm test` avisa se faltar alguma chave, se uma variável sumir, ou se uma palavra não couber na placa ou na fonte de pixel.

## Steam

O jogo usa o [steamworks.js](https://github.com/ceifa/steamworks.js). Sem a Steam aberta, ele roda normal e só guarda as conquistas no save. Com a Steam aberta, ele faz o seguinte:

- **Conquistas:** cada conquista do jogo destrava na Steam com o nome de API em maiúsculas (`primeiro-passo` → `PRIMEIRO_PASSO`). Quem já tinha conquistas no save recebe todas ao abrir o jogo pela Steam.
- **Idioma:** o idioma escolhido para o jogo na Steam decide o idioma inicial (veja acima).
- **Presença para os amigos:** a lista de amigos mostra o porte e a lotação, por exemplo "Festa da Cidade: 30 convidados".
- **Nome do jogador:** aparece em Ajustes, junto com o estado da Steam.
- **Abrir pela Steam:** com o App ID de verdade, abrir o `.exe` fora da Steam faz a Steam reabrir o jogo por ela. Se a Steam estiver fechada, o jogo avisa e fecha. Em desenvolvimento (`npm start`), isso nunca acontece.

Enquanto o jogo não tem App ID, `desktop/steam.json` usa o **480** (Spacewar, o app de testes da Valve). Com a Steam aberta, `npm start` já conecta. Nesse modo, o idioma que a Steam informa é o do próprio cliente da Steam.

### Publicar

1. No Steamworks, crie o app e o depot. Depois rode `npm run steam:config -- APP_ID DEPOT_ID`. Ele grava o App ID em `desktop/steam.json` (com `"required": true`) e gera em `steam/`:
   - `app_build_<APP_ID>.vdf`: o script do SteamPipe;
   - `rich_presence.vdf`: os textos da presença nos três idiomas;
   - `conquistas.md`: nome de API, nomes e descrições de cada conquista por idioma.
2. `npm run steam:icons` gera os ícones das conquistas (64×64, destravada e bloqueada) em `steam/conquistas/`. Precisa de Python 3.12 com Pillow.
3. `npm run build:win` gera o executável já com o App ID novo.
4. Configure no Steamworks:
   - **Conquistas:** em Stats & Achievements, cadastre cada uma de `steam/conquistas.md` com os ícones.
   - **Presença:** em Community > Rich Presence, envie `steam/rich_presence.vdf`.
   - **Opções de inicialização:** o executável é `CuideBemDaSuaMandioca.exe`.
   - **Steam Cloud:** use o Auto-Cloud com a raiz `WinAppDataRoaming`, a subpasta `Cuide bem da sua mandioca` e o padrão `save.json`. Assim o save vai junto para outro PC, sem nada no código.
   - **Idiomas da loja:** marque português do Brasil, inglês e espanhol (Espanha e América Latina).
5. Envie com `npm run steam:upload -- <login da Steam>`. O comando refaz o build, confere se nada falta (o App ID de
   verdade e a biblioteca da Steam) e roda o `steamcmd` do SDK do Steamworks com `steam/app_build_<APP_ID>.vdf`.
   - **SDK:** a pasta `steamworks_sdk_<versão>` fica ao lado do projeto (hoje `Downloads\steamworks_sdk_165`), ou onde
     `STEAMWORKS_SDK` apontar.
   - **Login:** a senha e o código do Steam Guard são digitados no próprio `steamcmd` e não ficam salvos no projeto.
     Depois do primeiro login, ele lembra a sessão neste PC. Rode num terminal de verdade (PowerShell), porque o
     steamcmd pergunta a senha.
   - **Sem refazer o build:** `--sem-build` envia o que já está em `dist/`.
   - **Ativar:** o build chega ao Steamworks sem ir ao ar. Ative em **SteamPipe > Builds**, no ramo `default`; a Steam
     não deixa ativar o ramo padrão por script. Enquanto o jogo não é lançado, só quem tem as chaves de
     desenvolvedor (a sua conta) consegue baixar.

A **sobreposição da Steam** (Shift+Tab e os avisos da Steam na tela) está desligada: `"overlay": false` em `desktop/steam.json`. Ela exige desligar a composição do Chromium, e isso pode deixar preta a janela transparente em que a festa flutua. Antes de ligar, teste com `npm start` se a festa continua transparente.

O `app.asar` leva a biblioteca da Steam desempacotada (o `.node` e a `steam_api64.dll` ficam em `resources/app.asar.unpacked`).

O save fica em `%APPDATA%\Cuide bem da sua mandioca\save.json`, com uma cópia de segurança em `save.json.bak`. As preferências da janela ficam em `window-settings.json`, na mesma pasta. Na primeira vez, o jogo copia o save antigo de `%APPDATA%\Arraiá`, se existir.

## Desenvolvimento

Requer Node.js. Nesta pasta, rode `npm install` e depois `npm start`. Para jogar no navegador, rode `npm run start:web` e abra `http://localhost:8000`; lá o save fica no `localStorage`.

| Comando | O que faz |
| --- | --- |
| `npm test` | Roda os testes |
| `npm run simulate -- 60` | Simula 60 horas de um jogador guloso e mostra quando cada porte chega |
| `npm run build:art` | Gera a arte do jogo (`src/festa-sprites.js`) e o ícone, a partir de `art/` (Python 3.12 com Pillow) |
| `npm run build:win` | Gera `dist/CuideBemDaSuaMandioca-win32-x64` |
| `npm run steam:config -- APP_ID DEPOT_ID` | Grava o App ID e gera os arquivos da Steam (SteamPipe, presença, conquistas) |
| `npm run steam:icons` | Gera os ícones das conquistas para o Steamworks (Python 3.12 com Pillow) |

## Como o jogo funciona

- **Loop:** a Mandioca dança, cada passo rende Animação e gasta fôlego. Sem fôlego, ela descansa e recomeça.
- **Melhorias:** Rebolado, Fôlego, Refresco e Ritmo fazem a festa render mais. Toda Animação que a festa junta vira **fama** aos pouquinhos (gastar não dá nem tira fama), e fama traz **convidados**.
- **Cenário:** cada convidado novo põe uma peça na festa. Em lotações certas chegam os marcos (pé de milho, galinha, bananeira, gato, mandacaru, casinha, pipa, coqueiro, bode, vira-lata caramelo, igrejinha, lua, cata-vento, balão de papel e céu estrelado); nas outras, entra um enfeite da rotação: balãozinho no varal, pintinho atrás da galinha, mandioquinha nas raízes do terreiro ou vaga-lume. A placa mostra o que o próximo convidado traz, e a aba Festa mostra tudo o que já chegou. A lista fica em `scenery`, em `src/data.js`.
- **Porte:** a lotação muda o porte do arraiá (Quintal, Quermesse, Festa da Cidade, São João Regional, Maior São João do Mundo). Cada porte libera postos, sistemas e cenário novos, e o terreiro cresce com os convidados.
- **A festa não para de crescer:** o terreiro ganha 3 px por convidado até ~110 convidados e depois 2 px por convidado até 600 px (~190 convidados), e a ilha fica mais funda. A gente aparece na festa: a quadrilha enche a fila da frente e depois forma a fila de trás; a plateia enche até três fileiras (cada uma mais longe e mais escura, nunca na frente do palco). Com mais gente, mais movimento: crianças correndo pela frente (a partir de 45 convidados, até 6), a plateia puxando uma "ola" de tempos em tempos, balões de São João acesos subindo (a partir de 50, cada vez mais), fogos mais seguidos e mais varais com lâmpadas no Maior São João. Depois do céu estrelado vêm o carrossel (92), o balão de ar quente (108), o bumba-meu-boi dançando pelo terreiro (125) e duas ilhas flutuando no céu, presas aos mastros (150 e 185): aí a festa cresce para cima, onde a tela tem espaço. Numa tela muito grande (mais de 1,8 milhão de pixels por quadro), a festa desenha a 30 quadros com foco e 24 de fundo.
- **Turma:** personagens vêm da **pescaria**. Cada um tem um papel num posto: par da quadrilha, trio de forró no palco, marcadora, foguista, pescador, barraqueira, argoleira, pipoqueira (a Pipoca, na Barraca de Comidas: fichas mais baratas), ambulante (o Amendoim, que passeia pela festa: metas rendem mais fichas) e mascote. O mascote é o Sopinha, um coelho mini lop feito a partir das fotos em `sopinha/`: pula pelo terreiro, deita quando a Mandioca descansa, dá um binky quando a festa comemora ou quando você clica nele, e faz a festa render mais com o jogo fechado. Peixe repetido sobe o nível. Com a Cenoura (sanfona), o Inhame (zabumba) e a Batata-Doce (triângulo) os três no palco, forma-se o **trio pé-de-serra**: a festa rende +10% a mais (se um sai para um rolê, o trio desfaz).
- **Vitrine:** fichas compram chapéus, itens de mão, tecidos, terreiros, enfeites e barracas. Entre os chapéus, o Maria Chiquinha (palha com duas tranças de fita) e a Tiara de Bandeirinhas; na mão, a Estrelinha que solta faísca; nos lados, o Barril de Quentão fumegando. Cada lado da festa aceita um enfeite ou uma barraca, e algumas barracas ativam personagens.
- **Argolas da Sorte:** o minijogo multiplica os recursos e dá itens que só existem lá. O preço que dobra a cada rodada segura quem quer jogar sem parar.
- **Rolês e fogueira:** a turma sai para buscar lenha, deixando o posto vazio. O rolê mais longo, a Viagem a Caruaru (12 h, no Maior São João), é para deixar rodando à noite: 160 de lenha e 25% de chance de trazer a Sanfona de Ouro. A lenha melhora a fogueira, que vira lendária com 30 melhorias.
- **Abertura:** numa partida nova (e quando ela é replantada no São João do ano que vem), a Mandioca brota da terra, jogando terra para os lados, e dá um "Oi, gente!".
- **A Mandioca cresce:** ela começa um brotinho e cresce em quatro tamanhos (Broto, Mudinha, Mandioquinha e Mandioca) conforme a soma dos níveis de Rebolado, Fôlego, Refresco e Ritmo passa de 40, 130 e 220 (`growthAt` em `src/data.js`; no simulador: uns 13 min, 45 min e 4 h45 de jogo). Cada tamanho rende +8% por passo e a passagem tem clarão, confete e som. Os tamanhos menores têm o corpo e o rosto desenhados no próprio tamanho (`art/tamanhos.py`: olhos, boca e bochechas pixel a pixel, para o rosto não borrar) e usam os mesmos braços, pernas e poses do tamanho inteiro em escala, então toda dança nova já vem nos quatro tamanhos. Chapéus e itens de mão dos tamanhos menores saem do desenho inteiro reduzido por `art/crescer.py`. Em Painel > Festa aparecem o tamanho e a barra até o próximo; a conquista "Crescida" é do tamanho máximo. No tamanho máximo, com todos os passos de dança e a fogueira lendária, ela vira a **Mandioca lendária** e brilha com estrelinhas douradas.
- **Repertório de danças:** dançar ensina passos novos (Xote, Polichinelo, Sanfona, Rebolado, Baião, Giro, Moonwalk, Frevo, Lambada, Macarena, Robô, Arrasta-pé, Coco e Passinho, depois de 100, 600, 2.500, 8.000, 20.000, 45.000, 90.000, 160.000, 240.000, 340.000, 480.000, 650.000, 850.000 e 1.100.000 passos). A cada 10 passos ela sorteia outro passo entre os que sabe, com o nome subindo em cima dela, e cada passo aprendido rende +2% por passo. As poses ficam em `art/danca.py` (o Giro é uma volta inteira de 16 quadros, com as costas da Mandioca). A conquista "Pé de valsa" é saber todos.
- **Carinho na Mandioca:** clicar nela (sem arrastar) dá um carinho: ela comemora, solta uma gracinha e corações, e rende 3 passos de uma vez, no máximo a cada 3 segundos.
- **Balão de sorte:** com 15 convidados ou mais, de 6 em 6 a 12 minutos sobe um balão dourado pela festa. Clicar nele antes de sumir (22 s) dá um prêmio sorteado: **frenesi** (tudo rende ×3 por 30 s), Animação de 1min30 de festa, fichas ou lenha. Dez balões dão "Balão de sorte".
- **Chuva de São João:** com 10 convidados ou mais, a cada 20 a 40 minutos chove por 50 s: nuvens, gotas, respingos, trovão, a maioria da festa abre guarda-chuva, o chão ganha poças (que secam devagar depois) e a fogueira enfraquece. Quando para, sai um **arco-íris** (45 s) com um pote de ouro no pé: clicar no pote dá 4 minutos de Animação e fichas (5 potes dão "Pote de ouro").
- **Quadrilha marcada:** a partir da Quermesse, a cada 5 a 9 minutos a quadrilha toda anda em zigue-zague pela pista por 24 s, com os gritos da marcação ("Anavan!", "Anarriê!", "Olha a cobra!"...) a cada 4 s, terminando com o túnel (os pares erguem os braços), e a festa rende +25% (o dobro, +50%, com a Pamonha no caixote).
- **Descansos:** quando a Mandioca cansa, ela sorteia como descansar: ofega, se abana, se espreguiça, bebe um copo d'água, come uma espiga de milho ou tira um cochilo em pé (cabeceando, com "Z").
- **Metas da festa:** sempre 3 abertas em Painel > Conquistas (dançar passos, receber convidados, comprar melhorias, fazer carinho, abrir cartas, pescar, atender pedidos, jogar Argolas, resgatar rolês, expulsar penetras), com o alvo acompanhando o poder da festa. Cumprida a meta, "Resgatar" dá fichas (e lenha nos portes maiores) e uma meta nova de outro tipo entra no lugar. Dez metas dão "Metódica".
- **Dias de santo de verdade:** pelo relógio do computador, em 13 de junho (Santo Antônio), 24 de junho (São João, em dobro) e 29 de junho (São Pedro), a festa rende +50%/+100% o dia todo, solta fogos em qualquer porte, avisa com confete e mostra o dia na placa (`specialDays` em `src/data.js`).
- **Vento e conversa:** a cada 4 a 8 minutos (sem chuva) uma rajada agita as bandeirinhas, puxa a pipa e sopra folhas e pétalas pela festa; a plateia solta frases em cima da cabeça (e comenta a chuva). Só enfeite.
- **Bingo da quermesse:** da Quermesse em diante, a placa ganha o botão do bingo. Uma cartela 3x3 (números de 1 a 30, o meio é livre) custa 4 fichas + o porte; o locutor sorteia um número a cada 2,2 s e canta alguns com apelido ("22: dois patinhos na lagoa!", "24: São João!"). A primeira linha fechada rende metade do preço; a cartela cheia é BINGO (3× o preço em fichas e 1min30 de Animação). Mas alguém da plateia também joga e grita BINGO entre o 22º e o 29º número (sempre antes da última bola, então nenhuma cartela é vitória garantida): dá para ganhar uma rodada em cada três, mais ou menos (3 bingos dão "Bingo!"). A placa mostra quantas casas já foram marcadas.
- **Quebra-pote:** a partir da Festa da Cidade, a cada 11 a 19 minutos um pote de barro enfeitado com papel crepom fica pendurado no varal por 45 s. Cada clique é uma paulada (o pote balança e vai trincando); com 6 pauladas ele quebra e chove bala: 1 minuto de Animação e fichas (5 potes dão "Quebra-pote").
- **Corrida de saco:** da Quermesse em diante, a cada 12 a 21 minutos três crianças de saco param na largada, na frente da festa. O primeiro clique no corredor da listra vermelha (o seu, com a setinha em cima) dá a largada; cada clique é um pulo, mas no ritmo: pulo a menos de 0,42 s do anterior dá tombo e ele fica 1,2 s no chão. Os rivais pulam sozinhos e chegam em 6,5 a 9,5 s. O 1º lugar leva fichas (uma a mais sem tombo) e 75 s de Animação; o 2º, 1 ficha; o 3º, um pouco de Animação. Ninguém largou em 40 s, a turma desiste. 5 vitórias dão "Canguru da roça".
- **Leilão de prendas:** da Festa da Cidade em diante, a cada 18 a 30 minutos o leiloeiro sobe no palco (entre o Inhame e a Batata-Doce) com uma prenda erguida: **Frango Assado**, **Bolo de Fubá** ou **Chapéu-coco**, que só saem aqui (a loja mostra "Só no leilão"; com as três, a prenda vira 5 minutos de Animação). O lance começa em 3 fichas + o porte, e cada clique no leiloeiro cobre com +1; as fichas do lance ficam guardadas e voltam se alguém cobrir. A plateia cobre depois de 1 a 4 s, até um teto sorteado (1,3 a 2,6 vezes o lance inicial), e abre sozinha se ninguém der lance em 20 s. Sem lance novo, o leiloeiro bate o martelo a cada 2,6 s ("dou-lhe uma, dou-lhe duas...") e vende na terceira. A placa em cima dele mostra o lance e de quem é. 3 arremates dão "Dou-lhe três!", e Chapéu-coco + Frango Assado + Xadrez Azul formam o conjunto Arrematador (+6%). Recarregar o jogo no meio do leilão devolve o lance.
- **Concurso de quadrilha:** do São João Regional em diante, cerca de uma quadrilha marcada em três vale nota. No fim, três jurados da plateia levantam a plaquinha com a nota (de meio em meio ponto): a marcadora (Pamonha), o conjunto que a Mandioca veste, a pista cheia e o repertório de danças puxam a nota para cima. Média 9 ou mais é 1º lugar (6 fichas + porte e 3 minutos de Animação), 8 ou mais é 2º, abaixo é 3º. Quadrilha de concurso não vira casamento.
- **Casamento na roça:** a partir da Festa da Cidade, quando a quadrilha acaba, em 4 de cada 10 vezes sai um casamento. O caramanchão de flores abre na pista, o par da frente mais perto da Mandioca que tenha outro par do lado de fora vira os noivos (ele de terno remendado e chapéu de palha, ela de véu e buquê) e o padre entra no lugar do par vizinho. Por 30 s, cada clique nos noivos joga um punhado de arroz (barra embaixo deles); o padre puxa os vivas e no fim vem o "sim". O presente dos noivos é Animação e fichas: 40% sem arroz nenhum, 100% com 15 punhados (5 casamentos dão "Madrinha de casamento"). Com 10 punhados ou mais, os noivos ainda deixam de presente uma peça de casamento que falta, uma por casamento: **Véu de Noiva**, **Cartola de Noivo** e **Buquê da Noiva** (só saem daqui; a loja mostra "Só em casamentos").
- **Visita do dia:** a primeira vez que a festa roda em cada dia (pelo relógio do computador) rende 3 fichas, mais 1 por dia seguido de visita (até 9 fichas no 7º dia seguido). Pular um dia recomeça a sequência.
- **São João do ano que vem:** no Maior São João do Mundo, o Painel oferece "Encerrar este São João". A festa volta ao quintal e a Mandioca é replantada (broto de novo): recomeçam as melhorias, a lotação, a fogueira, a lenha e a Animação; ficam a turma, as roupas e barracas, as fichas, as conquistas, os números, o diário e os passos aprendidos. Cada São João encerrado vira **Tradição**: tudo rende +25% a mais para sempre (+25% no 2º ano, +50% no 3º...). A primeira vez dá "Ano que vem tem mais". O Painel guarda os recordes: em quanto tempo de festa o São João chegou ao Maior do Mundo (e avisa quando um ano bate o recorde) e a festa mais cheia.
- **Extras:** pedidos dos convidados e penetras aparecem na festa e são clicáveis. Também há o correio elegante (cartas com fichas; quando chega carta, um pombo-correio atravessa a festa com ela no bico e desce até o correio ou a Mandioca) e as conquistas. Com o jogo fechado, a festa rende 25% por até 12 horas. Os balões de São João que a plateia solta também são clicáveis: disparam para o céu soltando faísca.

## Código

- `src/data.js`: todo o conteúdo e os números do jogo.
- `src/core.js`: o motor (loop, economia, turma, relógios, argolas, save).
- `src/festa.js`: desenha a festa num canvas em escala inteira, a partir do estado, e diz o que está sob o cursor.
- `src/argolas.js`: desenha e anima o minijogo das Argolas da Sorte.
- `src/som.js`: os efeitos sonoros, sintetizados com a Web Audio (liga, desliga e volume).
- `src/ui.js`: monta o HTML da placa, da vitrine, das argolas e das abas do painel (funções puras).
- `src/i18n.js` e `src/lang/`: idiomas, a regra de idioma da Steam e os textos de cada língua.
- `src/app.js` e `src/style.css`: interface, cliques, arrasto, zoom, avisos e laço do jogo.
- `src/festa-sprites.js`: arte gerada por `art/exportar.py`. Não edite à mão.
- `desktop/`: janela do Electron, bandeja, preferências, save, Steam (`steam.js`, `steam.json`) e empacotamento.
- `art/`: sprites desenhados em código (`sprites.py`, `scene.py`), animações da turma, da multidão e dos enfeites (`animar.py`), peças de cenário (`cenario.py`), os passos de dança e descansos da Mandioca (`danca.py`), o corpo da Mandioca nos tamanhos menores (`tamanhos.py`), a redução em pixel de chapéus e itens de mão para esses tamanhos (`crescer.py`), o casamento na roça (`casamento.py`), os ícones das conquistas da Steam (`conquistas_steam.py`), o exportador do jogo e o gerador das imagens de conceito (`art/concept/`).
- `tools/simulate.js`: simulador de ritmo.

A fonte da interface é a Fredoka, sob a SIL Open Font License (`src/fonts/OFL.txt`).
