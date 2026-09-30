---
format: 1080x1920
duration: 16s
message: "Se você não cuidar da sua mandioca, ela fica triste; com comida e carinho a festa explode"
arc: Gancho (triste) → Comida → Carinho → Estalinho → Festa feliz → Placa final (volta ao começo, loop)
audience: TikTok Brasil, quem curte joguinho fofo, festa junina e meme
mode: autonomous-with-review
---

Um vídeo só (`index.html`), sem subcomposições: a gravação é uma tomada contínua da mesma festa, e a "câmera" (zoom
na gravação 4K vertical, sempre em escala que casa com o pixel do jogo) faz os cortes. Por cima: a placa do título, as
legendas e o medidor de Amor e Barriga no estilo da placa do jogo. Sem música; efeitos pop, ding, whoosh e tada.

Gravação `cuidar` (captura/cenas.js): Festa da Cidade, 2160x3840, placa do jogo escondida, Mandioca começando cansada,
com Amor e Barriga zerados. Ela pede comida sozinha ("TÔ COM FOME!"), come pipoca, milho e bolo ("NHAM!"), ganha
carinho seguido (corações, "HIHI!"), estalinhos pipocam em volta dela, e na virada a festa comemora (confete e fogos).

## Locked

- Folha de prévias v1 aprovada ("Esta boa"); fala final "qual nome você daria para sua mandioca? 👇".
- Montagem: placa encolhe em 1,1 s (a legenda do gancho sobe junto) e a fala "TÔ COM FOME!" vem em 1,35 s; comidas a
  cada 1 s (NHAM em 3,75 / 4,75 / 5,75); carinhos 6,0–8,0; estalinhos 8,6–9,8; virada 10,4; placa final 13,4–16,0.

## Frame 1 — Gancho: ela tá triste

- scene: Close na Mandioca cansada e com fome; medidor vazio; "REBOLADO ×0,5" vermelho
- duration: 2.8s
- poster: 1.6s
- transition_in: cut
- status: animated
- src: index.html
- rules: coordinate-target-zoom, kinetic-beat-slam, stat-bars-and-fills, spring-pop-entrance

A placa "CUIDE BEM DA SUA MANDIOCA" cai do alto no quadro 0 e encolhe para o topo. A câmera abre fechada (×3) na
Mandioca ofegando, e o jogo mostra "TÔ COM FOME!". Legenda em duas batidas: "se você não cuidar da sua mandioca…" e
"…ela fica TRISTE 😢". O medidor sobe de baixo com as duas barras vazias e o selo vermelho pulsando.

## Frame 2 — Comidinha

- scene: Pipoca, milho e bolo voam até ela; "NHAM!"; a Barriga enche
- duration: 2.8s
- poster: 1.8s
- transition_in: cut
- status: animated
- src: index.html
- rules: control-target-sync, stat-bars-and-fills

Legenda "dei comidinha 🍿". Três comidas caem do alto e fazem a curvinha até a boca dela, cada uma com "NHAM!" e olho
de coração. A barra da Barriga enche em três degraus no mesmo quadro de cada mordida (pop a cada degrau).

## Frame 3 — Carinho

- scene: Carinho seguido; corações e "HIHI!"; o Amor sobe até a metade
- duration: 2.8s
- poster: 1.6s
- transition_in: cut
- status: animated
- src: index.html
- rules: control-target-sync, stat-bars-and-fills

Legenda "fiz carinho 🥰". A Mandioca dá pulinhos de carinho, corações sobem, e a barra do Amor acompanha cada um.

## Frame 4 — Estalinho

- scene: Estalinhos pipocando no chão em volta dela; o Amor enche
- duration: 2.0s
- poster: 1.2s
- transition_in: cut
- status: animated
- src: index.html
- rules: control-target-sync, stat-bars-and-fills

Legenda "e joguei uns estalinhos 💥". "PÁ!" em volta dela, os vizinhos dão um pulo, e o Amor chega ao fim.

## Frame 5 — Agora ela tá feliz

- scene: Selo vira "REBOLADO ×1,25" verde; a câmera recua e mostra a festa inteira comemorando
- duration: 3.0s
- poster: 2.2s
- transition_in: cut
- status: animated
- src: index.html
- rules: zoom-out-workspace-reveal (blueprint), scale-swap-transition, particle-burst

O selo troca de "×0,5" vermelho para "×1,25" amarelo com um tranco; legenda "agora ela tá FELIZ 💃" e selo "2,5× mais
animação". Uma única puxada da câmera, desacelerando (×3 → ×1), revela a festa inteira com confete e fogos do jogo.

## Frame 6 — Placa final

- scene: Placa do título grande no centro, frase e pergunta para comentar
- duration: 2.6s
- poster: 1.8s
- transition_in: cut
- status: animated
- src: index.html
- rules: spring-pop-entrance, sine-wave-loop

A placa volta grande para o centro (a festa escurece atrás). Frase: "o joguinho de festa junina que vive na sua área de
trabalho". Pergunta: "qual nome você daria para sua mandioca? 👇". O último quadro corta de volta para a Mandioca triste do
começo, e o vídeo gira em loop.
