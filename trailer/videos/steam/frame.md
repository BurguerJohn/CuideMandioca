# Trailer da Steam — design (verdade de marca deste projeto)

Mesma marca dos vídeos do TikTok (`trailer/design.md`), no formato deitado da página da Steam. Onde os dois
discordarem, vale este arquivo (o `design.md` que o `copiar-assets.js` traz é a referência dos vídeos verticais).

**Conceito:** a festa junina de pixel que vive na área de trabalho e cresce de um quintal ao Maior São João do Mundo.
Gameplay de verdade, gravada do próprio jogo; nada de interface desenhada à mão imitando o jogo.

## Formato
- 1920×1080, 30 fps, ~58,7 s, H.264 + AAC (formato de trailer da Steam).
- A Steam toca o trailer sem som na página: as legendas contam a história sozinhas.
- Margem segura: texto a pelo menos 96 px das bordas laterais e 72 px de cima e de baixo.

## Cores (as do jogo)
| Papel | Cor | Uso |
| --- | --- | --- |
| fundo | `#1c1a3a` | noite de São João (vem nas gravações) e fundo entre cenas |
| texto | `#fff4e4` | papel do jogo, legendas |
| destaque | `#ffd21e` | bandeirinha amarela: palavra-chave da legenda, números do selo |
| tinta | `#2e1812` | contorno das letras, texto na placa |
| madeira | `#7c421e` / `#c07a36` / `#361a0c` | moldura da placa e do selo (igual à interface do jogo) |
| vermelho | `#ee2f3c` | só no nome grande da placa |
| vermelho escuro | `#8a1030` | sombra do nome grande da placa (a mesma da interface do jogo) |

Bandeirinhas (enfeite, nunca texto): `#ee2f3c` `#ffd21e` `#35a03a` `#3a6cf0` `#ff4f9e` `#ff8a12`.

## Letras
- **Fredoka** 700 (a fonte do jogo, arquivo local): legendas 72–96 px com contorno `#1c1a3a` de 14 px, títulos 110–150 px.
- **Space Mono** 700 (embutida no HyperFrames): o número de convidados do selo, 40 px, amarelo sobre escuro.

## Elementos
- **Placa do título:** a mesma dos vídeos (madeira, papel claro, bandeirinhas, Mandioca dançando em pixel exato), com o
  nome do jogo no idioma do vídeo.
- **Selo da festa (a espinha do trailer):** placa pequena de madeira no canto superior esquerdo com o porte ("Arraiá de
  Quintal") e a lotação ("👥 1"). Fica no mesmo lugar do início ao clímax; só o texto muda, e o número conta.
- **Legendas:** no máximo 7 palavras por linha, 2 linhas; creme com contorno, a palavra-chave em amarelo.
- **Linha final:** abaixo da placa, legenda de 72 px dizendo o que o jogo é (sem pedido de lista de desejos, que envelhece).

## Movimento
- Pixel art sempre em pixel exato: `image-rendering: pixelated` em todo vídeo e sprite.
- Cortes na batida (compasso de 2,305 s); cada fase da festa ocupa uma frase da música (4 compassos, 9,2 s).
- Entradas sem quicar (power3.out / expo.out, 0,35–0,6 s). Câmera só onde a cena pede: recuo único nas cenas 1 e 6, panorâmica
  na 5; nas cenas 2, 3, 4 e 7 ela fica parada (o selo é a âncora e a festa muda em volta).
- Proibido: brilho neon, gradiente de texto, cartões iguais em grade, interface falsa do jogo.
