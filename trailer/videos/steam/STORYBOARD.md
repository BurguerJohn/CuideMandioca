---
format: 1920x1080
duration: 58.7s
message: "Uma festa junina em pixel art que dança na sua área de trabalho e cresce enquanto você trabalha"
arc: Gancho (a festa sem nada, na área de trabalho) → melhorias → Quermesse → Cidade → Regional → Maior São João do Mundo → placa do título
audience: jogadores da Steam que curtem jogos idle, aconchegantes e em pixel art
mode: collaborative
---

# Trailer da Steam — plano (v2)

## Changes from v1

- Usuário: "Não sei se precisa da mensagem para adicionar na lista de desejos, pois esse trailer vai ficar mesmo depois
  de estar disponivel para jogar". A cena 7 troca o botão da lista de desejos por uma linha que vale para sempre.

## Locked

- Plano v2 e rascunhos (`storyboard.html` v2) aprovados pelo usuário ("Sim pode gravar"): 7 cenas, tempos da música,
  selo fixo no canto, legendas no terço de cima, final com a placa do título e a linha "Um jogo idle de festa junina
  para a sua área de trabalho" (sem lista de desejos).

## Depois da montagem (o que mudou em relação aos rascunhos)

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

- scene: A Mandioca dança sozinha; a câmera recua e revela que a festa inteira flutua sobre uma planilha
- duration: 9.73s
- poster: 7s
- transition_in: cut
- status: animated
- src: compositions/frames/01-quintal.html
- blueprint: zoom-out-workspace-reveal
- rules: coordinate-target-zoom, spring-pop-entrance
- voiceover: onscreen — "Uma festa junina que dança na sua área de trabalho"

0,0–9,7 s (compassos em 0,58 · 2,89 · 5,19 · 7,50). Abre fechado na Mandioca dançando sozinha no terreiro de terra,
sem nenhuma melhoria (1 convidado). No primeiro tempo forte (1,0 s) a **placa do título** cai do alto e balança. No
compasso 2 a câmera recua num zoom-out só, desacelerando, até mostrar a festa inteira, pequena, flutuando sobre uma
planilha de escritório ("Relatorio_trimestral_FINAL_v7_agora_vai.xlsx"), com a barra de tarefas embaixo. No compasso
3 a placa encolhe para virar o **selo da festa** ("Arraiá de Quintal · 👥 1") no canto; entra a legenda "Uma festa
junina que dança na sua **área de trabalho**". Por que: é o que ninguém mais tem — o jogo mora em cima do seu trabalho.
Não: sem logo girando, sem texto antes da Mandioca aparecer.

## Frame 2 — Primeiras melhorias

- scene: De perto, a Mandioca ganha chapéu, roupa e terreiro novos a cada compasso; os primeiros convidados chegam
- duration: 9.22s
- poster: 5s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/02-melhorias.html
- blueprint: fixed-anchor-cycle
- rules: spring-pop-entrance, counting-dynamic-scale
- voiceover: onscreen — "Cada passo rende Animação. Melhore a dança e vista a Mandioca."

9,7–18,9 s. A câmera mergulha de volta na festa (sobre o céu de São João). O selo fica parado; em volta dele a festa
muda a cada compasso: 12,0 s (o pico mais forte da música) — **chapéu de vaqueiro** cai na cabeça dela; 14,3 s —
roupa **xadrez azul** e espiga na mão; 16,6 s — convidados chegam e o selo conta 👥 1 → 9. Números "+1" de Animação
sobem a cada passo. Legenda: "Cada passo rende **Animação**" → "Melhore a dança e **vista a Mandioca**". Por que: mostra o laço do
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

- scene: Com 25 convidados a festa vira Festa da Cidade; uma rodada das Argolas acerta a estrela ×2
- duration: 9.24s
- poster: 6s
- transition_in: cut
- status: animated
- src: compositions/frames/04-cidade.html
- blueprint: device-surface-showcase
- rules: coordinate-target-zoom, spring-pop-entrance
- voiceover: onscreen — "Argolas da Sorte, pescaria e uma turma inteira"

28,2–37,4 s. O selo vira "Festa da Cidade · 👥 25". A janela das **Argolas da Sorte** abre sobre a festa e ocupa o
centro: duas argolas encaixam (fichas, depois a garrafa da estrela: "ANIMAÇÃO X2!") e a Animação do selo dobra. No
último compasso, corte para a turma no palco. Legenda: "**Argolas da Sorte**, pescaria e uma turma inteira". Por que:
tem coisa pra fazer quando você quer jogar de verdade. Não: sem explicar regras.

## Frame 5 — São João Regional

- scene: 50 convidados: forró no palco, roda-gigante e a fogueira crescendo até a labareda
- duration: 9.22s
- poster: 5s
- transition_in: cut
- status: animated
- src: compositions/frames/05-regional.html
- blueprint: camera-journey
- rules: viewport-change, particle-burst
- voiceover: onscreen — "Forró no palco e fogueira acesa"

37,4–46,6 s. O selo vira "São João Regional · 👥 50". A câmera anda pela festa larga numa panorâmica: o palco com a
turma tocando, a roda-gigante, e para na fogueira, que solta a labareda no último compasso. Legenda: "**Forró** no
palco e **fogueira** acesa". Por que: é o meio do caminho, a festa já é grande. Não: sem cortar a panorâmica no meio.

## Frame 6 — O Maior São João do Mundo

- scene: Clímax: a festa gigante com 101 convidados; a câmera recua até a área de trabalho de novo
- duration: 6.91s
- poster: 3s
- transition_in: flash-through-white
- status: animated
- src: compositions/frames/06-maior.html
- blueprint: zoom-out-workspace-reveal
- rules: particle-burst, counting-dynamic-scale
- voiceover: onscreen — "o MAIOR SÃO JOÃO DO MUNDO"

46,6–53,5 s (a emenda da música: entra a última frase). Flash branco no tempo forte: a Mandioca de coroa de milho no
meio da maior festa, confete, e o selo conta até "Maior São João do Mundo · 👥 101". A câmera recua, como na cena 1,
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
