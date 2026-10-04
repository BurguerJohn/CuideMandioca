"""Arte dos prêmios dos minigames (src/festa-premios.js): as coisas animadas e os personagens que aparecem na festa, mais os ícones."""

from PIL import Image

from casa import Tela, rgb
from render import outline

import premios_coisas
import premios_coisas2
import premios_coisas3
import premios_elenco
import premios_elenco2
import premios_elenco3
import premios_pessoas

# Ícone do botão da placa: um troféu (11x10).
TROFEU = ['.yyyyyyyyy.', 'yYyyyyyyyYy', 'y.yyyyyyy.y', 'y.yyyyyyy.y', '.yyyyyyyyy.', '...yyyyy...', '....yyy....', '....yyy....', '...ooooo...', '..ooooooo..']
TROFEU_LEG = {'y': '#ffd21e', 'Y': '#e8a812', 'o': '#a8743a'}

QUADROS_POR_SEGUNDO = {'coisas': 4, 'pessoas': 8}

# O troféu de ouro de cada coisa: o mesmo desenho em ouro maciço (a luz do pixel escolhe o tom) com brilhinhos que cintilam de um quadro para o outro.
OURO = [(0.0, (92, 54, 8)), (0.35, (176, 118, 20)), (0.65, (240, 184, 40)), (0.85, (255, 226, 110)), (1.0, (255, 250, 200))]
BRILHOS = [((0.2, 0.25), (0.75, 0.6)), ((0.5, 0.15), (0.3, 0.7)), ((0.8, 0.3), (0.45, 0.55)), ((0.35, 0.4), (0.7, 0.2))]


def tom_ouro(luz):
    for (a, ca), (b, cb) in zip(OURO, OURO[1:]):
        if luz <= b:
            k = (luz - a) / (b - a)
            return tuple(round(x + (y - x) * k) for x, y in zip(ca, cb))
    return OURO[-1][1]


def dourar(quadros):
    """Os quadros de uma coisa em ouro: o contorno escuro fica, o resto vira ouro pela luz de cada pixel, e um brilho branco pisca."""
    saida = []
    for numero, quadro in enumerate(quadros):
        imagem = quadro.copy()
        pixels = imagem.load()
        for y in range(imagem.height):
            for x in range(imagem.width):
                r, g, b, a = pixels[x, y]
                if a == 0 or r + g + b < 90:
                    continue
                luz = (0.299 * r + 0.587 * g + 0.114 * b) / 255
                # Realça o contraste: o ouro liso ficaria chapado.
                luz = max(0.0, min(1.0, (luz - 0.15) * 1.25))
                pixels[x, y] = tom_ouro(luz) + (a,)
        for fx, fy in BRILHOS[numero % len(BRILHOS)]:
            x, y = round(fx * (imagem.width - 1)), round(fy * (imagem.height - 1))
            if pixels[x, y][3] and sum(pixels[x, y][:3]) > 90:
                pixels[x, y] = (255, 255, 255, 255)
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if 0 <= x + dx < imagem.width and 0 <= y + dy < imagem.height and pixels[x + dx, y + dy][3] and sum(pixels[x + dx, y + dy][:3]) > 90:
                        pixels[x + dx, y + dy] = (255, 244, 170, 255)
        saida.append(imagem)
    return saida


def cortar(imagem):
    return imagem.crop(imagem.getbbox())


def exportar(add, icons):
    """Junta a arte no pacote e devolve o `manifest['premios']`: `{id: folha}`; as folhas dos personagens levam `poses`."""
    saida = {}
    for nome, desenhar in {**premios_coisas.COISAS, **premios_coisas2.COISAS2, **premios_coisas3.COISAS3}.items():
        quadros = [outline(f) for f in desenhar()]
        saida[nome] = add(f'premio-{nome}', quadros, fps=QUADROS_POR_SEGUNDO['coisas'])
        icons[f'premio:{nome}'] = cortar(quadros[0])
        ouro = dourar(quadros)
        saida[f'{nome}-ouro'] = add(f'premio-{nome}-ouro', ouro, fps=QUADROS_POR_SEGUNDO['coisas'])
        icons[f'premio:{nome}-ouro'] = cortar(ouro[0])
    elenco = {**premios_elenco.ELENCO, **premios_elenco2.ELENCO2, **premios_elenco3.ELENCO3}
    for nome in elenco:
        quadros = [outline(f) for f in premios_pessoas.quadros(elenco[nome])]
        saida[nome] = add(f'premio-{nome}', quadros, fps=QUADROS_POR_SEGUNDO['pessoas'], poses=premios_pessoas.POSES)
        icons[f'premio:{nome}'] = cortar(quadros[0])
    tela = Tela(11, 10)
    tela.grade(TROFEU, 0, 0, {k: rgb(v) for k, v in TROFEU_LEG.items()})
    icons['ui:premios'] = tela.im
    return saida
