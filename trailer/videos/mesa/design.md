# Cuide bem da sua mandioca — identidade dos vídeos de TikTok

**Conceito:** a festa junina de pixel que vive na sua área de trabalho — fofa, meio caótica, com humor de meme.
Os vídeos mostram a gameplay de verdade (gravada do próprio jogo) e falam como gente no TikTok.

## Formato
- 1080×1920, 30 fps, 12–22 s. Gancho nos primeiros 2 s.
- **O nome do jogo aparece logo no início de todo vídeo** (placa do título em até 0,3 s), fica pequeno no topo
  durante o vídeo e volta grande no fim.
- Zonas seguras do TikTok: nada importante em y < 170, em y > 1500 (legenda/usuário) nem em x > 900 entre y 900–1500
  (botões). Textos principais entre y 180 e 1450.

## Cores (as do jogo)
| Papel | Cor | Uso |
| --- | --- | --- |
| fundo | `#1c1a3a` | noite de São João (já vem nas gravações) |
| texto | `#fff4e4` | papel do jogo, legendas |
| destaque | `#ffd21e` | bandeirinha amarela: palavras-chave, números |
| tinta | `#2e1812` | contorno das letras, texto na placa |
| madeira | `#7c421e` / `#c07a36` / `#361a0c` | moldura da placa (igual à interface do jogo) |
| vermelho | `#ee2f3c` | só no nome grande da placa (MANDIOCA / CASSAVA) e em selos |

## Letras
- **Fredoka** (a fonte do jogo, arquivo local): títulos e legendas, peso 700, 80–120 px, contorno escuro grosso.
- **Space Mono** 700: dados (tempo de jogo, convidados), 34–44 px, em selo escuro com texto amarelo.

## Elementos da marca
- **Placa do título:** moldura de madeira como a da interface do jogo, papel claro, bandeirinhas em cima, o nome do jogo
  no idioma do vídeo ("CUIDE BEM DA SUA" / "TAKE GOOD CARE OF YOUR" / "CUIDA BIEN TU" pequeno e "MANDIOCA" / "CASSAVA"
  grande em vermelho), com a Mandioca dançando (sprite do jogo, ampliado em pixel exato).
- **Legendas:** frases curtas (até ~6 palavras por linha), creme com contorno, palavra-chave em amarelo, um emoji no máximo.
- **Selo de dado:** pílula escura com texto amarelo em Space Mono.

## Movimento
- Entradas com "pancada" (back.out/expo.out, 0,3–0,5 s), placa cai do alto e balança.
- Cortes de gameplay com flash curto + zoom de 1,06 → 1; zoom lento (Ken Burns) durante as cenas.
- Pixel art sempre em escala inteira ou com `image-rendering: pixelated` (nada de borrar o pixel).

## Som
- Sem trilha: o som em alta é escolhido no editor do TikTok.
- Efeitos: whoosh nos cortes, pop quando um número muda, ding em acerto, tada no clímax.
