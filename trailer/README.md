# Vídeos de divulgação — Cuide bem da sua mandioca

Seis vídeos para o TikTok e o trailer da página da Steam (seção [Trailer da Steam](#trailer-da-steam)).

Seis vídeos verticais (1080×1920, 30 fps) montados com [HyperFrames](https://www.hyperframes.dev/) em cima de
gameplay gravada do próprio jogo, em **português, inglês e espanhol**. Os MP4 prontos ficam em
`renders/<idioma>/<nome>.mp4`. Eles não têm trilha, só os efeitos (pop, ding, whoosh, tada): a música entra pelo
TikTok (veja abaixo).

| Vídeo | Duração | Gancho (pt-BR · en · es) |
| --- | --- | --- |
| `evolucao` | 21 s | a festa de 1 mandioca até o maior São João do mundo · I started taking care of my cassava · Empecé a cuidar mi mandioca |
| `mesa` | 15,5 s | POV: você instalou isso no PC do trabalho · POV: you installed this on your work PC · POV: instalaste esto en la PC del trabajo |
| `argolas` | 20,25 s | a garrafa com 1 pixel de folga · this bottle has 1 pixel of wiggle room · esta botella tiene 1 píxel de margen |
| `presentes` | 18,5 s | cada convidado traz um presente · every guest brings a gift · cada invitado trae un regalo |
| `turma` | 20 s | conheça a turma · meet the party crew · conoce a la pandilla |
| `cuidar` | 16 s | se você não cuidar da sua mandioca… ela fica triste (só em pt-BR) |

Em todos, a placa com o nome do jogo aparece desde o primeiro quadro, com o nome no idioma do vídeo (o mesmo da
Steam): "Cuide bem da sua mandioca", "Take Good Care of Your Cassava" e "Cuida bien tu mandioca". O texto
importante fica fora das áreas que o TikTok cobre (topo, rodapé e a coluna de botões à direita).

O `cuidar` ("Esqueci de cuidar da minha mandioca", só em português) mostra o medidor de Amor e Barriga: a gameplay é
gravada em 4K vertical (`gravar.js cuidar`) para a câmera da montagem dar zoom na Mandioca em escala exata do pixel
(×2 no close, ×0,5 na festa inteira), e o medidor da tela é um painel da montagem sincronizado com as ações da gravação.

## Música em alta

As músicas em alta no TikTok têm direitos autorais. Por isso elas **não** vêm embutidas no vídeo: o TikTok costuma
silenciar vídeos enviados com música comercial, e contas comerciais não podem usar essas faixas. O jeito certo, que
ainda leva o vídeo para a página do som (e dá alcance), é este:

1. Envie o `<nome>.mp4` do idioma.
2. No editor do TikTok, toque em **Adicionar som** e escolha o som em alta. Deixe o volume do som original baixo,
   perto de 30%, para os efeitos continuarem aparecendo.
3. Para achar o que está em alta em cada país, use o
   [TikTok Creative Center](https://ads.tiktok.com/business/creativecenter/inspiration/popular/music/pc/en), que
   permite filtrar pelo país (Brasil para pt-BR; EUA ou Reino Unido para en; México, Espanha ou Argentina para es). Conta
   comercial: use a aba *Commercial Music Library* do mesmo site, que é liberada para anúncios e marcas.

## Pastas

- `captura/`: gravador da gameplay. Ele abre o jogo numa janela invisível do Electron, com relógio virtual
  (cada quadro avança exatos 1/30 s) e captura via DevTools para o ffmpeg. Também tem os roteiros das cenas e os saves.
- `audio/gerar-audio.js`: gera os efeitos em WAV.
- `assets/`: gravações (`gameplay/` em português, `gameplay-en/`, `gameplay-es/`), sprites extraídos do jogo, fonte
  Fredoka e áudio compartilhados.
- `videos/<nome>/`: um projeto HyperFrames por vídeo, em português (`index.html` é a composição). O trailer da Steam
  é `videos/steam/`.
- `videos/gerados/`: as outras versões, **geradas** por `videos/traduzir.js` a partir do português:
  `<nome>-en` e `<nome>-es` (legendas e nome do jogo de `videos/traducoes.js`, gameplay no idioma). Cada uma é um
  projeto próprio, porque um projeto HyperFrames só pode ter uma composição
  raiz. Não edite essas pastas: mude o original ou as traduções e gere de novo.
- `design.md`: paleta, tipografia, áreas seguras e regras de legenda usadas em todos os vídeos.

## Refazer tudo

Rode a partir da pasta do jogo (`gog/`):

```bash
node trailer/captura/preparar-saves.js                                # saves de cada momento da partida
node_modules/.bin/electron trailer/captura/gravar.js                  # grava todas as cenas em português
node_modules/.bin/electron trailer/captura/gravar.js --idioma=en      # em inglês (assets/gameplay-en)
node_modules/.bin/electron trailer/captura/gravar.js --idioma=es      # em espanhol (assets/gameplay-es)
node_modules/.bin/electron trailer/captura/gravar.js argolas          # ou só algumas cenas
node trailer/audio/gerar-audio.js                                     # efeitos sonoros
node trailer/assets/extrair-sprites.js                                # sprites e fonte do jogo
node trailer/videos/copiar-assets.js                                  # assets dos projetos em português
node trailer/videos/traduzir.js                                       # gera os projetos -en e -es
```

A gameplay é gravada com o jogo no idioma do vídeo: menus, placas das barracas, textos que voam sobre a festa e até a
planilha falsa do vídeo "mesa" mudam de língua.

Depois, em cada projeto (`trailer/videos/<nome>/` ou `trailer/videos/gerados/<nome>-<idioma>/`):

```bash
npx hyperframes check                                   # lint, layout e contraste
npx hyperframes preview --background                    # abre o Studio para mexer
npx hyperframes render --output <arquivo>.mp4           # ex.: ../../renders/pt-BR/argolas.mp4
```

Para renderizar tudo de uma vez: `node trailer/videos/renderizar.js` (todos os vídeos nos três idiomas em
`renders/`).

O gravador desliga o botão de debug (joaninha) e os efeitos sonoros do jogo durante a gravação.

## Trailer da Steam

`videos/steam/` é o trailer da página da Steam: 1920×1080, 30 fps, **58,7 s**, com a música "Balanço de Pixel" (feita
no Suno, arquivo na pasta do jogo). A festa começa sem nenhuma melhoria na área de trabalho e sobe um porte por frase
da música, até o Maior São João do Mundo; fecha na placa do título e na linha "Um jogo idle de festa junina para a sua
área de trabalho" (sem "lista de desejos": o trailer fica na página depois do lançamento).

**v3 (2026-09-29):** mesma música, tempos e arco, com a gameplay regravada no jogo de hoje e as novidades: a Mandioca
começa brotinho e cresce na cena 2; a cena 4 mostra uma brincadeira por compasso (quebra-pote, rabo no burro na mosca,
casamento na roça e o prato do Fogão a Lenha voando até a Mandioca) no lugar das Argolas; a cena 5 passa pela dança
das fitas e pelos compadres de fogueira; o clímax tem o show de drones desenhando a Mandioca no céu. Os eventos que a
festa sorteia sozinha (drones, fitas, compadres) são começados pelo gravador com `__jogo.ui.festa.provocar(...)`, e o
pote tem posição fixa no roteiro, para as câmeras da montagem saberem onde mirar. Os MP4 ficam em
`renders/<idioma>/steam.mp4`.

- **Plano:** `STORYBOARD.md` (cenas, tempos na música, o que mudou na montagem), `storyboard.html` (rascunhos
  aprovados), `BRIEF.md` e `frame.md` (a marca adaptada ao 16:9). `audiomap.json` tem as batidas e as frases da
  música (103 BPM, compasso de 2,305 s).
- **Música:** o começo da faixa (0–46,6 s) emendado no início da última frase (2:37,3–2:49,3), com 60 ms de crossfade
  no tempo forte; o corte fica escondido no flash que abre o clímax.
- **Estrutura:** cada cena é uma sub-composição em `compositions/frames/` (só a gravação e a câmera); todo texto
  (selo do porte, legendas, etiquetas, placas) fica em `compositions/textos.html`, por cima do vídeo inteiro. Assim a
  tradução troca um arquivo de textos e a gameplay gravada no idioma.
- **Gravações:** as cenas `steam-*` de `captura/cenas.js`, em 4K (3840×2160) para os zooms ficarem em pixel exato:

```bash
CENAS="steam-quintal steam-melhorias steam-quermesse steam-cidade steam-palco steam-regional steam-maior steam-final"
node_modules/.bin/electron trailer/captura/gravar.js $CENAS                 # e de novo com --idioma=en e --idioma=es
node_modules/.bin/electron trailer/captura/gravar.js steam-cidade --quadro=2,3,4   # só fotos desses segundos (prévia)
node_modules/.bin/electron trailer/captura/gravar.js steam-maior --quadro=1 --medir  # + onde ficam Mandioca, palco,
                                                                                    #   fogueira e janelas (px 1920x1080)
node -e "require('./trailer/videos/copiar-assets.js').copiarAssets('steam')"
node trailer/videos/traduzir.js steam && node trailer/videos/renderizar.js steam --forcar
```

As câmeras das cenas miram nas coordenadas medidas com `--medir` (a Mandioca, o palco, a fogueira, a janela das
Argolas). Regravou com outro enquadramento? Meça de novo e atualize os números no topo do script de cada cena. Abrir o
Studio marca os elementos com `data-hf-id`; o `traduzir.js` ignora essas marcas.

## Observações

- Os tempos de jogo mostrados em "evolução" (15 min, 50 min, 4 h, 40 h) vêm do simulador jogando de forma
  gulosa. Um jogador real pode levar um pouco mais ou menos.
- **21st.dev:** a CLI (`@21st-dev/cli`) está instalada e `.mcp.json` já configura o servidor MCP. Para usar, é
  preciso entrar na conta: rode `npx 21st login` ou crie uma chave em https://21st.dev/mcp e defina
  `API_KEY_21ST`. Os componentes de lá são React para sites; nestes vídeos não foi preciso usar nenhum.
