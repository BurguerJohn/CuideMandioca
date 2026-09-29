# Cuide bem da sua mandioca

Uma festa junina em pixel art que flutua na área de trabalho e cresce enquanto você usa o computador. A Mandioca dança sozinha, cansa, descansa e volta com tudo; cada passo rende Animação, e a festa vai de um arraiá de quintal ao Maior São João do Mundo.

## Jogar no Windows

Abra `dist/CuideBemDaSuaMandioca-win32-x64/CuideBemDaSuaMandioca.exe`. Para distribuir, leve a pasta inteira: o `.exe` sozinho não roda.

A festa aparece sobre a barra de tarefas, e o resto da tela continua clicável. Segure e arraste qualquer parte da festa para mudar ela de lugar, até as partes que abrem algo ao clicar (barracas, fogueira, palco, pedido, Sopinha): só o clique sem arrastar abre. A placa, a loja, o painel e as Argolas vão junto. Para mudar só a placa de lugar, arraste ela pelo fundo (fora dos botões); o painel e as Argolas também se arrastam sozinhos pela faixa do título, e a loja desliza para os lados arrastada por qualquer parte fora dos botões e itens. Em Ajustes, "Grudar a placa na festa" devolve a placa ao lugar automático. A placa tem uma barra de ferramentas:

- **Vitrine:** a loja abre em cima da festa. Passe o mouse num item para ver uma prévia na própria festa. Segure o botão de uma melhoria para comprar vários níveis.
- **Argolas da Sorte:** um minijogo que começa custando 1 ficha. Cada rodada dobra o preço da próxima, e a cada 10 minutos sem jogar o preço cai pela metade, até voltar a 1 (o número vermelho no botão da placa mostra o preço quando ele subiu). Você joga 3 argolas nas garrafas, e cada garrafa esconde um prêmio: fichas, Animação, lenha, ×2, ×3 ou um item exclusivo. A garrafa de Animação (a estrela) multiplica a Animação que a festa já tem, por 2 ou por 3; duas delas se multiplicam (×2 e ×3 dão ×6). As garrafas ×2 e ×3 sem estrela valem para a rodada inteira, inclusive para o que a estrela rendeu. Quanto melhor o prêmio, mais larga a boca da garrafa e mais certeira a argola precisa cair: a garrafinha de fichas dá 5 pixels de folga para cada lado, e o presente dá só 1 (`ringAim` em `src/data.js`). A Barraca das Argolas dá uma argola a mais e põe a Paçoca, a Argoleira, no balcão: com ela, o preço baixa mais rápido.
- **Turma, Pescaria, Rolês, Fogueira e Correio:** cada um tem seu botão na placa e abre na própria janela (clicar de novo fecha). Os botões aparecem conforme a festa libera cada parte, e um número vermelho avisa quando tem prenda, carta ou rolê esperando.
- **Painel:** só os números da festa, o histórico, as conquistas e os ajustes.
- **Histórico:** o jogo guarda um diário de cada acontecimento (convidado novo, porte, turma, item, conquista, compra, rolê, pedido, penetra, carta, Argolas) com o tempo de jogo em que aconteceu. A aba Histórico do Painel mostra um gráfico da lotação pelo tempo de jogo com cada desbloqueio marcado (passe o mouse para ver o que foi) e o diário, filtrável entre só desbloqueios e tudo. O diário guarda até 4.000 linhas; quando enche, saem primeiro os acontecimentos miúdos, nunca os desbloqueios. `npm run simulate -- 12 {} partida.json` salva uma partida simulada para testar.
- **Botão de tamanho** (a seta com a porcentagem): arraste para cima ou para a direita para aumentar o jogo, e para baixo ou para a esquerda para diminuir. Um clique, sem arrastar, volta para 100%. A roda do mouse em cima dele também funciona. A festa para de crescer quando chega ao tamanho da tela, e a placa nunca sai dela.
- **✕:** fecha o jogo. Clique duas vezes em até 3 segundos; o jogo salva antes de sair.

Clicar na festa dá foco ao jogo; clicar fora dele (em outro programa ou na área de trabalho) tira o foco, e a placa some até você clicar na festa de novo. Clicar no cenário (a Mandioca, o chão, os enfeites) não abre nada; só o que tem função reage: o pedido e o penetra, a Barraca das Argolas (minijogo), a pescaria, o correio, o palco (turma), a fogueira e o Sopinha (carinho). Esc fecha a janela de cima, e Espaço joga uma argola.

O jogo tem botão na barra de tarefas: clicar nele minimiza a festa, e clicar de novo traz de volta, já com foco. Clicar no ícone da bandeja ou abrir o jogo de novo (atalho, Steam) também traz a festa para a frente, sem abrir janela nenhuma; o Painel fica no menu da bandeja.

**Se travar:** a festa não para por causa de um erro num quadro, e se a página cair ou ficar 15 s sem responder, o jogo abre uma festa nova sozinho. O Electron também conta à festa onde o cursor está a cada 120 ms, para ela nunca ficar sem clique se o repasse do mouse do Windows falhar. Os erros ficam em `erros.log`, na pasta de dados do jogo (`%APPDATA%\Cuide bem da sua mandioca`); é o arquivo para pedir a quem relatar um travamento.

**Som:** o jogo tem efeitos sonoros (compras, melhorias, argolas, pescaria, cartas, convidados novos, porte, conquistas, pedido e penetra), sintetizados na hora em `src/som.js`, sem arquivo de áudio. Em **Painel > Ajustes > Som** dá para ligar, desligar e escolher o volume; o menu da bandeja também liga e desliga. Com a festa escondida, nada toca.

**Modo de teste:** o botão da joaninha na placa abre atalhos para testar: dar Animação, fichas e lenha, trazer convidados ou pular para o próximo porte, avançar o tempo, deixar prendas, cartas e rolês prontos, completar a turma, ganhar todos os itens e chamar pedido ou penetra. Tudo o que sai de lá fica marcado como teste no Histórico. Para esconder o botão (antes de lançar o jogo), mude `debugMenu` para `false` em `src/data.js`.

O ícone na bandeja do Windows tem: abrir painel, abrir a loja, Argolas da Sorte, tirar foto, fixar sobre as janelas, tamanho (50% a 200%), monitor, idioma, som, esconder a festa e fechar o jogo.

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
- **Cenário:** cada convidado novo põe uma peça na festa. Em lotações certas chegam os marcos (pé de milho, galinha, bananeira, gato, mandacaru, casinha, pipa, coqueiro, bode, igrejinha, lua, cata-vento, balão de papel e céu estrelado); nas outras, entra um enfeite da rotação: balãozinho no varal, pintinho atrás da galinha, mandioquinha nas raízes do terreiro ou vaga-lume. A placa mostra o que o próximo convidado traz, e a aba Festa mostra tudo o que já chegou. A lista fica em `scenery`, em `src/data.js`.
- **Porte:** a lotação muda o porte do arraiá (Quintal, Quermesse, Festa da Cidade, São João Regional, Maior São João do Mundo). Cada porte libera postos, sistemas e cenário novos, e o terreiro cresce com os convidados.
- **A festa não para de crescer:** o terreiro ganha 3 px por convidado até ~110 convidados e depois 2 px por convidado até 600 px (~190 convidados), e a ilha fica mais funda. A gente aparece na festa: a quadrilha enche a fila da frente e depois forma a fila de trás; a plateia enche até três fileiras (cada uma mais longe e mais escura, nunca na frente do palco). Com mais gente, mais movimento: crianças correndo pela frente (a partir de 45 convidados, até 6), a plateia puxando uma "ola" de tempos em tempos, balões de São João acesos subindo (a partir de 50, cada vez mais), fogos mais seguidos e mais varais com lâmpadas no Maior São João. Depois do céu estrelado vêm o carrossel (92), o balão de ar quente (108), o bumba-meu-boi dançando pelo terreiro (125) e duas ilhas flutuando no céu, presas aos mastros (150 e 185): aí a festa cresce para cima, onde a tela tem espaço. Numa tela muito grande (mais de 1,8 milhão de pixels por quadro), a festa desenha a 30 quadros com foco e 24 de fundo.
- **Turma:** personagens vêm da **pescaria**. Cada um tem um papel num posto: par da quadrilha, trio de forró no palco, marcadora, foguista, pescador, barraqueira, argoleira e mascote. O mascote é o Sopinha, um coelho mini lop feito a partir das fotos em `sopinha/`: pula pelo terreiro, deita quando a Mandioca descansa, dá um binky quando a festa comemora ou quando você clica nele, e faz a festa render mais com o jogo fechado. Peixe repetido sobe o nível.
- **Vitrine:** fichas compram chapéus, itens de mão, tecidos, terreiros, enfeites e barracas. Cada lado da festa aceita um enfeite ou uma barraca, e algumas barracas ativam personagens.
- **Argolas da Sorte:** o minijogo multiplica os recursos e dá itens que só existem lá. O preço que dobra a cada rodada segura quem quer jogar sem parar.
- **Rolês e fogueira:** a turma sai para buscar lenha, deixando o posto vazio. A lenha melhora a fogueira, que vira lendária com 30 melhorias.
- **Extras:** pedidos dos convidados e penetras aparecem na festa e são clicáveis. Também há o correio elegante (cartas com fichas) e as conquistas. Com o jogo fechado, a festa rende 25% por até 12 horas.

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
- `art/`: sprites desenhados em código (`sprites.py`, `scene.py`), animações da turma, da multidão e dos enfeites (`animar.py`), peças de cenário (`cenario.py`), exportador do jogo e gerador das imagens de conceito (`art/concept/`).
- `tools/simulate.js`: simulador de ritmo.

A fonte da interface é a Fredoka, sob a SIL Open Font License (`src/fonts/OFL.txt`).
