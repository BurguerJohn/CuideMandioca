"""Tema terra de zumbis: terreiros (asfalto rachado, terra de cova, gosma tóxica), cenários (barricada de tábuas, carro abandonado, zumbi saindo
da cova), chapéus (cérebro exposto, capacete de sobrevivente), itens de mão (mão de zumbi de borracha, taco com pregos, seringa antídoto) e o
tecido de farrapos de zumbi. Tudo de desenho animado, sem nada de pesado."""

import math

from itens_novos import Grade, chapeu, elipse, ladrilho, mao, pintar
from tema_comum import ret, lin, grosso, novo_registro, tecido, terreno
from tema_dino import peca, paleta

LADOS, lado = novo_registro()
CHAPEUS_PROPRIOS = {}
MAOS_PROPRIAS = {}
TECIDOS_PROPRIOS = {}
TERRENOS_PROPRIOS = {}


def chapeu_proprio(id_, texto, cores, acima):
    chapeu(id_, texto, cores, acima=acima)
    CHAPEUS_PROPRIOS[id_] = True


def mao_propria(id_, quadros, pivo, fps):
    mao(id_, quadros, pivo, fps=fps)
    MAOS_PROPRIAS[id_] = True


# --- Chapéus ----------------------------------------------------------------------------------------------------------------

def cerebro_exposto():
    """Cérebro à mostra com tampa de panela: o couro cabeludo é a tampa, levantada de um lado com vapor saindo, e no cérebro rosa vai um canudinho listrado de
    vermelho e branco (alguém está tomando o miolo)."""
    g = Grade(24, 18)
    # O cérebro: duas bolotas com dobras e a fenda no meio.
    elipse(g, 7.6, 10.2, 6.6, 4.6, 'p')
    elipse(g, 16.4, 10.2, 6.6, 4.6, 'p')
    for y in range(g.h):
        for x in range(g.w):
            if g.ler(x, y) != 'p':
                continue
            if y <= 7 and x < 12:
                g.pôr(x, y, 'L')
            elif y >= 13:
                g.pôr(x, y, 'd')
    for lado in (0, 1):
        cx = 7.6 if lado == 0 else 16.4
        for n, dy in enumerate((-2.0, 0.2, 2.2)):
            for x in range(int(cx - 5), int(cx + 6)):
                y = round(10.2 + dy + math.sin((x - cx) * 0.9 + n + lado) * 0.9)
                if g.ler(x, y) in ('p', 'L', 'd'):
                    g.pôr(x, y, 'P')
    for y in range(6, 14):
        g.pôr(11, y, 'P')
        g.pôr(12, y, 'P')
    # Faixa do couro cabeludo embaixo, rasgada, com os pontos de costura.
    for x in range(1, 23):
        topo = 13 + (1 if x % 3 == 0 else 0)
        for y in range(topo, 18):
            g.pôr(x, y, 'z')
        g.pôr(x, topo, 'Z')
        if x % 3 == 1:
            g.pôr(x, 15, 'k')
            g.pôr(x, 16, 'k')
    # A tampa levantada do lado esquerdo (uma calota verde-murcha torta, com um puxador) e o vapor saindo da fresta.
    for y in range(2, 9):
        for x in range(0, 13):
            if ((x - 6) / 7.0) ** 2 + ((y - 9.0) / 6.5) ** 2 <= 1.0 and y < 9 and x + (8 - y) * 0.6 < 13:
                g.pôr(x, y, 'z' if y > 3 else 'Z')
    ret(g, 4, 0, 6, 2, 'k')
    ret(g, 0, 8, 12, 8, 'Z')
    for x in (1, 5, 9):
        g.pôr(x, 4, 'k')
    for x, y in ((14, 6), (15, 4), (14, 2), (15, 0)):
        g.pôr(x, y, 'W')
    # O canudinho listrado entrando no cérebro e dobrando para cima.
    for i, (x, y) in enumerate(((17, 9), (18, 8), (18, 7), (19, 6), (19, 5), (19, 4), (19, 3), (20, 2), (21, 2), (22, 2))):
        g.pôr(x, y, 'r' if i % 2 == 0 else 'W')
    return g.texto()


chapeu_proprio('cerebro-exposto', cerebro_exposto(), {'p': '#ff9ab8', 'L': '#ffc4d4', 'd': '#e0708e', 'P': '#c04a70', 'z': '#8aa860', 'Z': '#5a7a3c', 'k': '#26242e',
                                                      'W': '#f4f4ff', 'r': '#e8302c'}, acima=8)


def capacete_sobrevivente():
    """Panela de pressão como capacete de sobrevivente: alumínio amassado, as duas alças de baquelite, o pino de pressão soltando vapor, fita adesiva em X e uma
    colher de pau de antena."""
    g = Grade(24, 16)
    # A cúpula de alumínio, mais clara à esquerda e escura embaixo.
    elipse(g, 11.5, 14.0, 10.6, 8.6, 'a')
    ret(g, 1, 12, 22, 15, 'a')
    for y in range(g.h):
        for x in range(g.w):
            if g.ler(x, y) == 'a':
                if x <= 5 and y < 12:
                    g.pôr(x, y, 'A')
                elif y >= 14 or x >= 19:
                    g.pôr(x, y, 'd')
    for x in range(24):
        if g.ler(x, 12) != '.':
            g.pôr(x, 12, 'W')
    # As alças pretas dos lados e o puxador redondo da tampa no meio.
    ret(g, 0, 11, 2, 13, 'k')
    ret(g, 21, 11, 23, 13, 'k')
    ret(g, 10, 4, 13, 6, 'k')
    ret(g, 11, 4, 12, 4, 'a')
    # O pino de pressão no alto, com vapor, e a colher de pau espetada como antena.
    ret(g, 16, 3, 17, 5, 'k')
    g.pôr(16, 2, 'd')
    for x, y in ((16, 1), (17, 0), (15, 0)):
        g.pôr(x, y, 'W')
    ret(g, 5, 0, 5, 7, 'n')
    ret(g, 4, 0, 6, 2, 'n')
    # Fita adesiva prateada em X e um amassado.
    lin(g, 3, 6, 8, 12, 't')
    lin(g, 4, 6, 9, 12, 't')
    lin(g, 8, 6, 3, 12, 't')
    lin(g, 9, 6, 4, 12, 't')
    for x, y in ((15, 8), (16, 8), (15, 9), (14, 9), (16, 9)):
        g.pôr(x, y, 'd')
    return g.texto()


chapeu_proprio('capacete-sobrevivente', capacete_sobrevivente(), {'a': '#b4b8c4', 'A': '#e4e8f0', 'd': '#7a7e8c', 'W': '#ffffff', 'k': '#2a2a34', 'n': '#b8864a', 't': '#6a6e7c'},
                acima=3)


# --- Itens de mão -----------------------------------------------------------------------------------------------------------

def mao_zumbi():
    """Mão de zumbi com um olho na palma que olha para os lados e pisca, os dedos mexendo um de cada vez e uma pulseira de chita no punho rasgado."""
    quadros = []
    pontas = [[1, 0, 0, 1], [0, 0, 1, 1], [1, 1, 0, 0], [1, 0, 1, 0]]
    olhar = (-1, 0, 0, 1)
    for k in range(4):
        g = Grade(14, 22)
        for i, x in enumerate((2, 5, 8, 11)):
            topo = 1 + pontas[k][i] + (1 if i in (0, 3) else 0)
            ret(g, x, topo, x + 1, 9, 'g')
            g.pôr(x, topo, 'G')
            if i % 2 == 0:
                g.pôr(x + 1, topo + 3, 'd')
        lin(g, 1, 9, 0, 6, 'g')
        ret(g, 1, 9, 12, 14, 'g')
        for y in range(9, 15):
            g.pôr(1, y, 'G')
            g.pôr(12, y, 'd')
        # O olho da palma: branco arredondado, íris amarela que passeia, pupila e a pálpebra que desce no quadro 2.
        elipse(g, 6.5, 11.5, 3.6, 2.5, 'e')
        if k == 2:
            ret(g, 3, 11, 10, 12, 'g')
            ret(g, 3, 12, 10, 12, 'k')
        else:
            ret(g, 6 + olhar[k], 10, 7 + olhar[k], 13, 'y')
            g.pôr(6 + olhar[k] + (1 if olhar[k] >= 0 else 0), 11, 'k')
            g.pôr(6 + olhar[k] + (1 if olhar[k] >= 0 else 0), 12, 'k')
        for x in range(4, 10):
            g.pôr(x, 9, 'd')
        # O punho rasgado com um osso de fora e a pulseira de chita vermelha e amarela.
        ret(g, 3, 15, 10, 21, 's')
        for x in range(3, 11):
            g.pôr(x, 15, 'r' if x % 2 == 0 else 'o')
            g.pôr(x, 16, 'o' if x % 2 == 0 else 'r')
            if (x + k) % 2 == 0:
                g.pôr(x, 21, '.')
        ret(g, 6, 17, 7, 20, 'E')
        g.pôr(6, 20, 'e')
        g.pôr(7, 20, 'e')
        quadros.append(pintar(g.texto(), {'g': '#7aa850', 'G': '#a8d078', 'd': '#587a38', 's': '#8a8e7a', 'e': '#fffaf0', 'E': '#f4ecd0', 'y': '#d8c030', 'k': '#2e3a22',
                                          'r': '#e8302c', 'o': '#ffd21e'}))
    return quadros


mao_propria('mao-zumbi', mao_zumbi(), (7, 17), 4)


def taco_pregos():
    """Taco de madeira com pregos enferrujados, um pão de queijo espetado num deles e o varal de bandeirinhas amarrado na ponta que tremula no vento."""
    quadros = []
    for k in range(4):
        g = Grade(22, 30)
        for y in range(0, 30):
            meia = 1 if y >= 14 else 3 - round(y * 0.14)
            for x in range(6 - meia, 6 + meia + 1):
                g.pôr(x, y, 'w')
        ret(g, 5, 14, 6, 27, 'w')
        ret(g, 4, 26, 7, 29, 'k')
        for y in range(0, 30):
            xs = [x for x in range(12) if g.ler(x, y) == 'w']
            if xs:
                g.pôr(xs[0], y, 'W')
                g.pôr(xs[-1], y, 'd')
        for x, y in ((2, 3), (1, 3), (2, 7), (1, 7), (9, 5), (10, 5), (9, 9), (10, 9)):
            g.pôr(x, y, 'n')
        for x, y in ((1, 2), (1, 6), (10, 4), (10, 8)):
            g.pôr(x, y, 'N')
        # O pão de queijo espetado no prego da direita (bolinha dourada com furinhos).
        elipse(g, 12, 6, 2.6, 2.4, 'q')
        g.pôr(11, 5, 'Q')
        g.pôr(13, 7, 'D')
        g.pôr(12, 6, 'D')
        # O barbante das bandeirinhas: do prego de cima até o cabo, em curva, com as bandeirinhas de cores balançando.
        for i in range(0, 17):
            t = i / 16
            x = 10 - t * 4 + 5 * math.sin(t * math.pi) + 0
            y = 3 + t * 22
            g.pôr(round(x), round(y), 'k')
        for n, i in enumerate((3, 6, 9, 12, 15)):
            t = i / 16
            x = round(10 - t * 4 + 5 * math.sin(t * math.pi))
            y = round(3 + t * 22)
            ondula = round(math.sin(k * 1.6 + n * 1.2))
            cor = 'rybvp'[n]
            for dy in range(3):
                for dx in range(3 - dy):
                    g.pôr(x + 1 + dx + (ondula if dy else 0), y + dy, cor)
        quadros.append(pintar(g.texto(), {'w': '#b8864a', 'W': '#d8a868', 'd': '#8a5a2a', 'k': '#3a2a1a', 'n': '#a0a4b0', 'N': '#d08040', 'q': '#f0b858', 'Q': '#fff0c0',
                                          'D': '#b87820', 'r': '#e8302c', 'y': '#ffd21e', 'b': '#3a78d8', 'v': '#35a03a', 'p': '#ff6aa8'}))
    return quadros


def deslocar(g, dx, dy):
    h = Grade(g.w + abs(dx), g.h + abs(dy))
    for y in range(g.h):
        for x in range(g.w):
            if g.c[y][x] != '.':
                h.pôr(x + max(dx, 0), y + max(dy, 0), g.c[y][x])
    return h.texto()


mao_propria('taco-pregos', taco_pregos(), (5, 24), 3)


def antidoto():
    """Seringa gigante de antídoto: êmbolo, cilindro de vidro com um líquido verde que borbulha e agulha brilhante."""
    quadros = []
    bolhas = [[(5, 11), (7, 14)], [(6, 9), (5, 13)], [(7, 12), (5, 8)], [(6, 14), (7, 10)]]
    for k in range(4):
        g = Grade(12, 28)
        ret(g, 3, 0, 8, 1, 'k')
        ret(g, 5, 2, 6, 6, 'm')
        ret(g, 2, 6, 9, 7, 'm')
        # O cilindro de vidro com o líquido verde.
        ret(g, 3, 8, 8, 22, 'v')
        ret(g, 4, 9, 7, 22, 'q')
        for y in range(8, 23):
            g.pôr(3, y, 'V')
        for y in range(12, 22):
            for x in range(4, 8):
                g.pôr(x, y, 'G' if y > 13 else 'g')
        for x, y in bolhas[k]:
            g.pôr(x, y, 'B')
        ret(g, 2, 22, 9, 23, 'm')
        # A agulha.
        ret(g, 5, 24, 6, 27, 's')
        g.pôr(5, 27, 'S')
        # Marcas de dose.
        for y in (11, 14, 17, 20):
            g.pôr(9, y, 'k')
        quadros.append(pintar(g.texto(), {'k': '#3a3a46', 'm': '#8a8e9c', 'v': '#c8e8f0', 'V': '#ffffff', 'q': '#b0d4dc', 'g': '#5aff6a', 'G': '#2ad84a',
                                          'B': '#d8ffd0', 's': '#d8dce8', 'S': '#ffffff'}))
    return quadros


mao_propria('antidoto', antidoto(), (5, 10), 4)


# --- Tecido -----------------------------------------------------------------------------------------------------------------

def tecido_farrapos():
    """Pano velho e puído de zumbi: verde-acinzentado remendado, com costuras pretas, manchas marrons e um rasgão mostrando a pele."""
    cores = {'o': '#6a7a5a', 'm': '#566648', 'r': '#4a5a3c', 's': '#8aa070', 'k': '#2a3020', 'x': '#7a3a2a', 'p': '#a8c090'}
    base = [['o'] * 10 for _ in range(10)]
    for y in range(10):
        for x in range(10):
            if (x * 3 + y * 5) % 7 == 0:
                base[y][x] = 'm'
    # Remendo escuro com a costura em volta.
    for y in range(1, 5):
        for x in range(1, 6):
            base[y][x] = 'r'
    for x in range(0, 7):
        base[0][x] = 'k' if x % 2 == 0 else 's'
        base[5][x] = 'k' if x % 2 == 0 else 's'
    for y in range(0, 6):
        base[y][0] = 'k' if y % 2 == 0 else 's'
        base[y][6] = 'k' if y % 2 == 0 else 's'
    # Rasgão mostrando a pele e uma mancha marrom.
    for x, y in ((7, 6), (8, 6), (7, 7), (8, 7), (9, 7), (8, 8)):
        base[y][x] = 'p'
    for x, y in ((2, 7), (3, 7), (3, 8), (2, 9)):
        base[y][x] = 'x'
    return ladrilho([''.join(linha) for linha in base], cores)


tecido('farrapos-zumbi', tecido_farrapos())
TECIDOS_PROPRIOS['farrapos-zumbi'] = True


# --- Terreiros --------------------------------------------------------------------------------------------------------------

def terreno_proprio(id_, paleta_):
    terreno(id_, paleta_)
    TERRENOS_PROPRIOS[id_] = True


import tema_zumbi_terrenos  # noqa: E402,F401  (os terreiros registram-se em TERRENOS_NOVOS)
import tema_zumbi_lados  # noqa: E402,F401  (os cenários registram-se em LADOS)
