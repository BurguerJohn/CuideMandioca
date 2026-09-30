---
format: 1920x1080
duration: 58.7s
message: "Uma festa junina em pixel art que dança na sua área de trabalho e cresce enquanto você trabalha"
arc: Gancho (a festa sem nada, na área de trabalho) → melhorias → Quermesse → Cidade → Regional → Maior São João do Mundo → placa do título
audience: jogadores da Steam que curtem jogos idle, aconchegantes e em pixel art
mode: collaborative
---

# Trailer da Steam — plano (v3)

## Changes from v2

- Usuário (2026-09-29): "Crie um trailer para a steam do jogo, atualizado com as coisas novas, nas tres linguas".
  Mesmo arco, música, tempos, selo e final da v2 (travados); o que muda é a gameplay, regravada com o jogo de hoje, e o
  conteúdo de quatro cenas para mostrar as novidades:
  - Cena 1: a Mandioca agora começa **brotinho** (antes ela já aparecia inteira).
  - Cena 2: ela **cresce** diante da câmera (brotinho → mudinha → mandioquinha) enquanto ganha chapéu e roupa; a
    segunda legenda passa a ser "Melhore a dança e veja a Mandioca **crescer**".
  - Cena 4: as Argolas saem; entram as **brincadeiras da Festa da Cidade**, uma por compasso: quebra-pote, rabo no
    burro, casamento na roça e o prato do Fogão a Lenha voando até a Mandioca.
  - Cena 5: a panorâmica passa pela **dança das fitas** no mastro, pelo palco e para na fogueira com os **compadres de
    fogueira** (a ponte de fagulhas) antes da labareda.
  - Cena 6: o clímax ganha o **show de drones** desenhando a Mandioca no céu (e o telão no palco).
- Técnico: a festa ganha um gancho só para o gravador (`festa.provocar`) que começa os eventos do desenho (drones, fitas,
  compadres) na hora do compasso; as câmeras são medidas de novo com `--medir`.

## Changes from v1 (histórico)

- Usuário: "Não sei se precisa da mensagem para adicionar na lista de desejos, pois esse trailer vai ficar mesmo depois
  de estar disponivel para jogar". A cena 7 troca o botão da lista de desejos por uma linha que vale para sempre.

## Locked

- Plano v2 e rascunhos (`storyboard.html` v2) aprovados pelo usuário ("Sim pode gravar"): 7 cenas, tempos da música,
  selo fixo no canto, legendas no terço de cima, final com a placa do título e a linha "Um jogo idle de festa junina
  para a sua área de trabalho" (sem lista de desejos). A v3 mantém tudo isso; muda só o que está em "Changes from v2".

## Depois da montagem v3 (o que mudou em relação às prévias)

- Cena 4: uma gravação só (9,24 s, do começo); a câmera empurra de leve para o pote (720, 441), o burro (588, 678), o
  casamento (1122, 684) e o meio do caminho entre o fogão e a Mandioca (1233, 640), limitada para a borda do vídeo não
  aparecer. O fecho no palco (`steam-palco`) saiu; o selo "Animação ×2!" das Argolas também.
- Cena 6: a legenda grande desceu para a parte de baixo (sobre a terra da ilha e a barra de tarefas) para o show de
  drones ficar à vista no céu. A planilha dessa gravação é mais estreita (38%) para os drones ficarem sobre o papel de
  parede.
- Jogo: os letreiros flutuantes ficam inteiros dentro da festa (o "DANÇA DAS FITAS!" saía cortado na borda).

## Depois da montagem v2 (o que mudou em relação aos rascunhos)

- Duração final: 58,65 s (igual ao plano). Cortes nos inícios de frase: 9,729 · 18,947 · 28,166 · 37,407 · 46,626 · 53,54.
- Cenas 2, 3 e 5: a legenda desceu para a parte de baixo (sobre a terra da ilha). Na gravação de perto, a cabeça da
  Mandioca e as barracas ocupam o terço de cima.
- Cena 1 → 2: a passagem é um desfoque (a cena 1 não tem zoom para dentro, pela regra do recuo único); a cena 2 entra do
  desfoque com um leve zoom.
- Cena 4: a janela das Argolas foi reenquadrada (1,1×, para a direita e para baixo) para o selo não cobrir o título.

## Decisões

- **Mensagem:** uma festa junina em pixel art que dança na sua área de trabalho e cresce enquanto você trabalha.
- **Público e arco:** quem procura idle aconchegante na Steam. A festa começa sem nenhuma melhoria e sobe um porte por
  frase da música, até o Maior São João do Mundo; fecha na placa do título e numa linha que diz o que o jogo é.
- **Formato:** 1920×1080, 30 fps, 58,7 s, sem narração, com música. A Steam toca sem som: as legendas contam tudo.
- **Música:** "Balanço de Pixel" (103 BPM, compasso de 2,305 s, frases de 4 compassos). Trecho = 0:00–0:46,6 (cinco
  frases) emendado, no início de frase, em 2:37,3–2:49,3 (a última frase e o fim da música). A emenda cai no corte para
  o clímax, então o salto da música vira o salto da festa.
- **A espinha:** o **selo da festa** no canto superior esquerdo — porte + lotação — fica no mesmo lugar do começo ao
  clímax e conta 1 → 9 → 10 → 25 → 50 → 101. A Mandioca é a heroína de todas as cenas.
- **Marca:** `frame.md` (cores do jogo, Fredoka + Space Mono, placa de madeira com bandeirinhas).
- **Proibições:** nada de interface do jogo desenhada à mão (só gravação real); nada de slideshow (cada cena é a mesma
  festa crescendo, não um cartão novo); nada de "screensaver" (todo movimento mostra uma mudança da festa); piadas de
  duplo sentido fora (a loja mostra o trailer para qualquer idade).
- **Quadro parado:** a cena 7 segura a placa do título parada enquanto a música fecha.
- **Legendas no idioma:** as versões en e es trocam as legendas, o nome na placa e a gameplay gravada no idioma.

## Frame 1 — O quintal na área de trabalho

- scene: A Mandioca, ainda brotinho, dança sozinha; a câmera recua e revela que a festa inteira flutua sobre uma planilha
- duration: 9.73s
- poster: 7s
- transition_in: cut
- status: animated
- src: compositions/frames/01-quintal.html
- blueprint: zoom-out-workspace-reveal
- rules: coordinate-target-zoom, spring-pop-entrance
- voiceover: onscreen — "Uma festa junina que dança na sua área de trabalho"

0,0–9,7 s (compassos em 0,58 · 2,89 · 5,19 · 7,50). Abre fechado na Mandioca **brotinho** dançando sozinha no terreiro
de terra, sem nenhuma melhoria (1 convidado). No primeiro tempo forte (1,0 s) a **placa do título** cai do alto e balança. No
compasso 2 a câmera recua num zoom-out só, desacelerando, até mostrar a festa inteira, pequena, flutuando sobre uma
planilha de escritório ("Relatorio_trimestral_FINAL_v7_agora_vai.xlsx"), com a barra de tarefas embaixo. No compasso
3 a placa encolhe para virar o **selo da festa** ("Arraiá de Quintal · 👥 1") no canto; entra a legenda "Uma festa
junina que dança na sua **área de trabalho**". Por que: é o que ninguém mais tem — o jogo mora em cima do seu trabalho.
Não: sem logo girando, sem texto antes da Mandioca aparecer.

## Frame 2 — Primeiras melhorias

- scene: De perto, a Mandioca cresce (brotinho → mudinha → mandioquinha) e ganha chapéu e roupa; os primeiros convidados chegam
- duration: 9.22s
- poster: 5s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/02-melhorias.html
- blueprint: fixed-anchor-cycle
- rules: spring-pop-entrance, counting-dynamic-scale
- voiceover: onscreen — "Cada passo rende Animação. Melhore a dança e veja a Mandioca crescer."

9,7–18,9 s. A câmera mergulha de volta na festa (sobre o céu de São João). O selo fica parado; em volta dele a festa
muda a cada compasso: 12,0 s (o pico mais forte da música) — a Mandioca **cresce** para mudinha (a animação de crescer
do jogo, com terra e brilho) e o **chapéu de vaqueiro** cai na cabeça dela; 14,3 s — cresce de novo (mandioquinha),
roupa **xadrez azul** e espiga na mão; 16,6 s — convidados chegam e o selo conta 👥 1 → 9. Números "+1" de Animação
sobem a cada passo. Legenda: "Cada passo rende **Animação**" → "Melhore a dança e veja a Mandioca **crescer**". Por que: mostra o laço do
jogo (dança → Animação → melhoria) em 9 segundos. Não: sem menu de compra aberto ocupando a tela.

## Frame 3 — Quermesse do Bairro

- scene: O 10º convidado vira a festa em Quermesse: confete, barraca de pescaria e a primeira pessoa da turma
- duration: 9.22s
- poster: 4s
- transition_in: cut
- status: animated
- src: compositions/frames/03-quermesse.html
- blueprint: fixed-anchor-cycle
- rules: particle-burst, spring-pop-entrance
- voiceover: onscreen — "Cada convidado traz algo novo pra festa"

18,9–28,2 s. Corte seco no compasso: o 10º convidado chega, a festa solta confete e o selo vira "Quermesse do Bairro ·
👥 10". Peças de cenário pipocam uma por compasso (pé de milho, galinha com pintinhos). A barraca de pescaria abre e
uma prenda revela o **Milho**, o primeiro da turma. Legenda: "Cada convidado traz **algo novo** pra festa". Por que:
o crescimento é visível — a festa ganha coisas, não só números. Não: sem tela de conquista, sem painel.

## Frame 4 — Festa da Cidade

- scene: Com 25 convidados a festa vira Festa da Cidade; uma brincadeira por compasso: quebra-pote, rabo no burro, casamento na roça e o prato do fogão
- duration: 9.24s
- poster: 5s
- transition_in: cut
- status: animated
- src: compositions/frames/04-cidade.html
- blueprint: fixed-anchor-cycle
- rules: coordinate-target-zoom, spring-pop-entrance
- voiceover: onscreen — "Quebra-pote, casamento na roça e muito mais"

28,2–37,4 s. O selo vira "Festa da Cidade · 👥 25". A festa inteira fica no quadro (a mesma festa, maior) e cada compasso
acende uma brincadeira de verdade do jogo, com a câmera dando um leve empurrão na direção dela: 28,2 s — o **pote** se
quebra e chove bala; 30,5 s — o **rabo no burro** prega na mosca; 32,8 s — os noivos do **casamento na roça** e a
chuva de arroz; 35,1 s — o **prato do Fogão a Lenha** voa até a Mandioca ("HUMMM!"). Legenda: "**Quebra-pote**,
casamento na roça e **muito mais**". Por que: a Festa da Cidade é onde as brincadeiras de festa junina viram jogo.
Não: sem explicar regras, sem janela de menu na frente.

## Frame 5 — São João Regional

- scene: 50 convidados: dança das fitas no mastro, forró no palco e os compadres de fogueira antes da labareda
- duration: 9.22s
- poster: 5s
- transition_in: cut
- status: animated
- src: compositions/frames/05-regional.html
- blueprint: camera-journey
- rules: viewport-change, particle-burst
- voiceover: onscreen — "Dança das fitas, forró e fogueira acesa"

37,4–46,6 s. O selo vira "São João Regional · 👥 50". A câmera anda pela festa larga numa panorâmica: começa no mastro
com as crianças na **dança das fitas**, passa pelo palco com a turma tocando e para na fogueira, onde os **compadres de
fogueira** estendem a mão por cima do fogo (a ponte de fagulhas); no último compasso sai a labareda. Legenda: "**Dança
das fitas**, forró e **fogueira** acesa". Por que: é o meio do caminho, a festa já é grande. Não: sem cortar a panorâmica no meio.

## Frame 6 — O Maior São João do Mundo

- scene: Clímax: a festa gigante com 101 convidados e o show de drones desenhando a Mandioca no céu; a câmera recua até a área de trabalho
- duration: 6.91s
- poster: 3s
- transition_in: flash-through-white
- status: animated
- src: compositions/frames/06-maior.html
- blueprint: zoom-out-workspace-reveal
- rules: particle-burst, counting-dynamic-scale
- voiceover: onscreen — "o MAIOR SÃO JOÃO DO MUNDO"

46,6–53,5 s (a emenda da música: entra a última frase). Flash branco no tempo forte: a Mandioca de coroa de milho no
meio da maior festa, confete, o **show de drones** desenhando a Mandioca no céu e o **telão** no palco, e o selo conta até
"Maior São João do Mundo · 👥 101". A câmera recua, como na cena 1,
e a festa gigante aparece de novo **em cima da planilha**. Legenda grande: "o **MAIOR SÃO JOÃO** DO MUNDO". Por que:
responde à cena 1 (mesmo recuo, mesma área de trabalho) — era a mesma festa o tempo todo. Não: sem fogos genéricos
por cima do jogo.

## Frame 7 — Placa do título

- scene: A placa do título no centro, a festa escurecida atrás, e a linha "Um jogo idle de festa junina para a sua área de trabalho"
- duration: 5.11s
- poster: 3s
- transition_in: crossfade
- status: animated
- src: compositions/frames/07-placa.html
- blueprint: logo-assemble-lockup
- rules: spring-pop-entrance
- voiceover: onscreen — "Cuide bem da sua mandioca · Um jogo idle de festa junina para a sua área de trabalho"

53,5–58,7 s. A festa escurece; a placa do título cai no centro e balança uma vez; embaixo, no último tempo forte,
sobe a linha "Um jogo **idle** de festa junina para a sua **área de trabalho**". Tudo para (quadro parado) enquanto a
música fecha. Por que: fixa o nome e o que o jogo é, antes e depois do lançamento (sem "lista de desejos", que
envelhece). Não: sem nada se mexendo depois que a linha entra.
