---
workflow: general-video
flow: automation
storyboard: no
message: "Esse jogo de festa junina na sua área de trabalho tem eventos aleatórios absurdos: tornado de tubarões, zumbis, meteoro, palhaço-bala, balão gigante"
destination: tiktok
aspect: 1080x1920
language: pt-BR
length: 23s
angle: gravação de tela crua (menos trailer, mais footage)
---

## Intent

Pedido do usuário (2026-10-04): "outro trailer para o tiktok/instagram que tenha menos cara de trailer e mais cara de footage
sendo gravado, já inicie no primeiro frame com algo que chame a atenção e meio chocante e depois mostre mais do jogo, em
português". Resposta: o vídeo parece uma gravação de tela de um monitor na vertical, sem placa de título batendo, sem
transições chiques: cortes secos, legendas no estilo nativo do TikTok, cursor do mouse de verdade clicando, um "REC 00:07"
de gravador de tela e o som do próprio jogo (sintetizado pelo `src/som.js`). O primeiro quadro já é o susto: o tornado de
tubarões girando em cima da roda-gigante da festa, em close de pixels enormes, com a legenda "isso é um jogo de festa
junina?!". Depois recua (a festa nem liga), mostra a área de trabalho de verdade ("é um joguinho que fica na sua área de
trabalho"), uma sequência rápida de "às vezes..." (zumbis, meteoro, palhaço-bala, balão gigante, balada) e fecha com a festa
calma e o nome do jogo.

## Customizations

- Gameplay gravada em 4K vertical (`captura/cenas.js`, cenas `caos-*`), a "câmera" da montagem dá zoom em escala que casa com
  o pixel de arte (10, 6, 4 e 3 px por pixel de arte) e o vídeo usa `image-rendering: pixelated`.
- Sons: os do jogo, renderizados por `audio/renderizar-som-jogo.js` (`assets/audio/jogo-*.wav`), mais um estrondo de abertura.
- Cursor e cliques desenhados na montagem nas posições medidas na gravação (`gravar.js --medir`).

## Notes

- Regras de todos os vídeos do jogo: o nome do jogo aparece desde o primeiro quadro (aqui, uma etiqueta pequena no topo, para
  não pesar a cara de gravação, e grande só no fim), nome em português, sem botão de teste, sem música (o som em alta entra
  pelo editor do TikTok).
- Só em português (o usuário pediu "em português").
- Zonas seguras do TikTok em `design.md`: nada importante em y < 170, em y > 1500 nem em x > 900 entre y 900 e 1500.
