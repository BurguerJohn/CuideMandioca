"""Horta: o fundo (céu, morros, moinho, celeiro, quadro de encomendas, cerca, a terra da horta, canteiros e a prateleira das ferramentas), os
canteiros, as 5 plantas em 4 fases (e as versões douradas), o espantalho, o corvo, a borboleta, a galinha, a regadora, a cesta, a pá, os
pacotes de semente e os bilhetes das encomendas.
"""

import math
import random

import janelas
from casa import Tela, rgb
from render import outline
import horta_plantas

W, H = 176, 126
PLOT = (28, 22)                                   # um canteiro
COLUNAS = [10, 42, 74, 106, 138]                  # x de cada coluna
LINHAS = [55, 80]                                 # y de cada fileira
PRATELEIRA_Y = 105                                # onde começa a prateleira de baixo
PLANTAS = ['milho', 'amendoim', 'batata-doce', 'mandioca', 'abobora']
COR_PACOTE = {'milho': '#ffd21e', 'amendoim': '#d8a050', 'batata-doce': '#b868a8', 'mandioca': '#b88a52', 'abobora': '#f08a2a'}


# --- Plantas ------------------------------------------------------------------------------------------------------------------
def plantas():
    return [outline(horta_plantas.PLANTAS[nome](fase)) for nome in PLANTAS for fase in range(4)]


def dourar(imagem):
    """A mesma planta em ouro: cada cor vira um tom de dourado pelo brilho dela, esticado entre o mais escuro e o mais claro da planta (o
    contorno escuro fica), para a forma continuar legível."""
    rampa = [(86, 50, 6), (140, 90, 10), (196, 138, 20), (240, 184, 34), (255, 216, 70), (255, 238, 140)]
    out = imagem.copy()
    px = out.load()
    lumas = []
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a and (r + g + b) > 90:
                lumas.append(0.3 * r + 0.59 * g + 0.11 * b)
    if not lumas:
        return out
    baixo, alto = min(lumas), max(lumas)
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if not a or (r + g + b) <= 90:
                continue
            luz = (0.3 * r + 0.59 * g + 0.11 * b - baixo) / max(1, alto - baixo)
            k = min(len(rampa) - 1, int(luz * len(rampa)))
            px[x, y] = rampa[k] + (255,)
    return out


def plantas_douradas():
    return [dourar(imagem) for imagem in plantas()]


# --- Solo ---------------------------------------------------------------------------------------------------------------------
def solo():
    """3 quadros: terra seca, terra regada e canteiro fechado (grama com cerquinha e cadeado). Os dois primeiros têm moldura de tábua."""
    quadros = []
    for tipo in range(3):
        t = Tela(*PLOT)
        if tipo < 2:
            seco = tipo == 0
            base, sulco, luz = ('#8a6a3a', '#6a4a24', '#a8844a') if seco else ('#6a4c2c', '#4e341c', '#80603a')
            # A moldura de tábua (luz em cima e à esquerda, sombra embaixo e à direita).
            t.rect(0, 0, PLOT[0] - 1, PLOT[1] - 1, '#a8682e')
            t.rect(0, 0, PLOT[0] - 1, 0, '#d89a56')
            t.rect(0, 0, 0, PLOT[1] - 1, '#c07a3c')
            t.rect(0, PLOT[1] - 1, PLOT[0] - 1, PLOT[1] - 1, '#5a3418')
            t.rect(PLOT[0] - 1, 0, PLOT[0] - 1, PLOT[1] - 1, '#6e4020')
            for x in (3, PLOT[0] - 4):
                t.put(x, 1, '#4a2a14')
                t.put(x, PLOT[1] - 2, '#4a2a14')
            # A terra por dentro.
            t.rect(2, 2, PLOT[0] - 3, PLOT[1] - 3, base)
            for y in range(5, PLOT[1] - 3, 5):
                t.rect(3, y, PLOT[0] - 4, y, sulco)
                t.rect(3, y - 1, PLOT[0] - 4, y - 1, luz)
            janelas.ruido(t, 3, 3, PLOT[0] - 4, PLOT[1] - 4, 22, 4 + tipo, [luz, sulco])
            t.rect(2, 2, PLOT[0] - 3, 2, '#4a3018')
            if not seco:
                # Terra molhada: brilho azulado e uma poça pequena.
                for x, y in ((6, 8), (14, 12), (21, 7), (10, 15), (19, 15)):
                    t.put(x, y, '#7ab8e8')
                    t.put(x + 1, y, '#a8d8f8')
        else:
            t.rect(0, 0, PLOT[0] - 1, PLOT[1] - 1, '#3a7a44')
            janelas.ruido(t, 0, 0, PLOT[0] - 1, PLOT[1] - 1, 50, 9, ['#46a85a', '#2e6a38', '#56b860'])
            for x in (1, PLOT[0] - 3):
                t.rect(x, 3, x + 1, PLOT[1] - 2, '#8a5a34')
                t.rect(x, 3, x, PLOT[1] - 2, '#b07a48')
            t.rect(1, 6, PLOT[0] - 2, 7, '#a66a34')
            t.rect(1, 14, PLOT[0] - 2, 15, '#a66a34')
            t.rect(1, 6, PLOT[0] - 2, 6, '#c8884a')
            t.rect(11, 8, 17, 14, '#ffd21e')
            t.rect(12, 9, 16, 13, '#c89a10')
            t.rect(13, 5, 15, 8, '#9a9ca8')
            t.rect(13, 5, 13, 7, '#c8ccd8')
            t.put(14, 11, '#26242e')
            t.rect(14, 12, 14, 12, '#26242e')
        quadros.append(t.im)
    return quadros


# --- Pacotes de semente e ícones ------------------------------------------------------------------------------------------------
ICONES_GRADES = {
    'milho': ['....yY....', '...yyyY...', '..yyYyyY..', '..yyyyYy..', '..yYyyyy..', '..gyyyyg..', '..ggyygG..', '...ggGG...', '...gG.G...', '....g.....'],
    'amendoim': ['..........', '...bbbb...', '..bBBBBb..', '..bBbbBb..', '...bBBb...', '...bBBb...', '..bBbbBb..', '..bBBBBb..', '...bbbb...', '..........'],
    'batata-doce': ['..........', '..gg..gg..', '.gGg..gGg.', '..gg..gg..', '...pPPpp..', '..pPPPPpp.', '.pPPPPPPp.', '.pPPPPPPp.', '..pPPPPp..', '...pppp...'],
    'mandioca': ['..g.gg.g..', '...gGGg...', '..g.gg.g..', '....n.....', '....n.....', '..bBBBBb..', '.bBBBBBBb.', '.bBBBBBBb.', '..bBBBBb..', '...bbbb...'],
    'abobora': ['....gg....', '....g.....', '...oOoo...', '..oOOoOo..', '.oOoOOoOo.', '.oOoOOoOo.', '.oOoOOoOo.', '.oOoOOoOo.', '..oOoOoo..', '...oooo...'],
}
ICONE_LEG = {'y': '#ffd21e', 'Y': '#c89a10', 'g': '#56b858', 'G': '#2e7a3c', 'b': '#e8c08a', 'B': '#b8884a', 'p': '#c878b8', 'P': '#8a4a88',
             'n': '#8a6a3a', 'o': '#f08a2a', 'O': '#b85a14'}


def icones():
    """Os ícones das plantas (10x10), nos pacotes e nas encomendas."""
    quadros = []
    for nome in PLANTAS:
        t = Tela(10, 10)
        t.grade(ICONES_GRADES[nome], 0, 0, {k: rgb(v) for k, v in ICONE_LEG.items()})
        quadros.append(t.im)
    return quadros


def pacotes():
    """Os pacotes de semente (16x18): papel creme com a borda de cima serrilhada na cor da planta e o ícone dela."""
    quadros = []
    for nome, icone in zip(PLANTAS, icones()):
        t = Tela(16, 18)
        t.rect(1, 2, 14, 16, '#f8f0e0')
        t.rect(14, 2, 14, 16, '#d8cba8')
        t.rect(1, 16, 14, 16, '#c8bca0')
        t.rect(1, 2, 14, 4, COR_PACOTE[nome])
        for x in range(1, 15, 2):
            t.put(x, 1, COR_PACOTE[nome])
        t.rect(2, 2, 13, 2, '#ffffff')
        t.rect(3, 13, 12, 13, '#c8bca0')
        t.rect(3, 15, 9, 15, '#d8cba8')
        for y in range(10):
            for x in range(10):
                px = icone.getpixel((x, y))
                if px[3]:
                    t.put(3 + x, 5 + y, px[:3])
        quadros.append(outline(t.im))
    return quadros


def bilhetes():
    """O bilhete de uma encomenda (15x17): papel com alfinete vermelho; o 2º quadro é o pedido pronto (verde, com visto)."""
    quadros = []
    for pronto in (False, True):
        t = Tela(15, 17)
        t.rect(0, 2, 14, 16, '#a8e8a0' if pronto else '#fdf3e0')
        t.rect(0, 2, 14, 2, '#ffffff' if not pronto else '#d8f8d0')
        t.rect(14, 2, 14, 16, '#78b870' if pronto else '#d8c8a0')
        t.rect(0, 16, 14, 16, '#78b870' if pronto else '#c8b890')
        t.rect(11, 13, 14, 16, '#d8c8a0' if not pronto else '#78b870')
        t.rect(6, 0, 8, 2, '#e0343e')
        t.put(6, 0, '#ff8a8a')
        t.put(7, 1, '#9a1a2e')
        if pronto:
            for x, y in ((3, 8), (4, 9), (5, 10), (6, 9), (7, 8), (8, 7), (9, 6), (10, 5)):
                t.rect(x, y, x, y + 1, '#1a7a2a')
        quadros.append(outline(t.im))
    return quadros


# --- Ferramentas da prateleira ----------------------------------------------------------------------------------------------------
def regadora():
    """3 quadros (16x13): de pé, regando (inclinada, com o jorro) e vazia (cinza)."""
    t = Tela(16, 13)
    t.grade(['................', '..ssss..........', '.sbbbbbs....s...', '.sbbbbbbbss.ss..', '.sbbbbbbbbbssss.', '.sbbbBBbbbs.....', '.sbbbBBbbbs.....', '.sbbbbbbbbs.....', '..sbbbbbbs......',
             '...ssssss.......', '................', '................', '................'], 0, 0,
            {'s': rgb('#aeb4c0'), 'b': rgb('#4a78d8'), 'B': rgb('#2a4aa8')})
    de_pe = t.im
    inclinada = Tela(16, 13)
    giro = de_pe.rotate(-28, resample=0, expand=False)
    inclinada.im.alpha_composite(giro, (1, 1))
    for k, (x, y) in enumerate(((12, 4), (13, 6), (13, 8), (14, 10), (12, 11), (14, 12))):
        inclinada.put(x, y, '#8ed6ff' if k % 2 else '#d8f0ff')
    vazia = de_pe.copy()
    px = vazia.load()
    for y in range(vazia.height):
        for x in range(vazia.width):
            r, g, b, a = px[x, y]
            if a:
                cinza = int(0.3 * r + 0.59 * g + 0.11 * b)
                px[x, y] = (cinza + 20, cinza + 22, cinza + 30, 255)
    return [outline(de_pe), outline(inclinada.im), outline(vazia)]


def cesta():
    """2 quadros (18x15): a cesta vazia e a cheia (espiga, abóbora e batata aparecendo)."""
    quadros = []
    for cheia in (False, True):
        t = Tela(18, 15)
        if cheia:
            t.rect(4, 3, 6, 8, '#8ad048')
            t.rect(5, 1, 6, 4, '#ffd21e')
            t.rect(8, 4, 13, 8, '#f08a2a')
            t.rect(10, 3, 11, 4, '#5a8a30')
            t.rect(8, 5, 8, 8, '#c85a14')
            t.rect(12, 5, 12, 8, '#c85a14')
            t.rect(13, 6, 15, 9, '#b868a8')
        t.rect(2, 8, 15, 13, '#c8944a')
        t.rect(2, 8, 15, 8, '#e8b868')
        for x in range(2, 16, 3):
            t.rect(x, 9, x, 13, '#a8743a')
        for y in (10, 12):
            t.rect(2, y, 15, y, '#a8743a')
        t.rect(2, 13, 15, 13, '#6e4420')
        t.rect(4, 3, 4, 8, '#6e4420') if not cheia else None
        t.rect(13, 3, 13, 8, '#6e4420') if not cheia else None
        t.rect(4, 2, 13, 2, '#8a5a2a') if not cheia else None
        quadros.append(outline(t.im))
    return quadros


def pa():
    """2 quadros (14x17): a pá encostada e a pá cavando (cabo inclinado, torrãozinho de terra)."""
    quadros = []
    for cavando in (False, True):
        t = Tela(14, 17)
        t.rect(6, 1, 7, 10, '#c8944a')
        t.rect(6, 1, 6, 10, '#e8b868')
        t.rect(4, 1, 9, 2, '#a8743a')
        t.rect(3, 10, 10, 15, '#aeb4c0')
        t.rect(4, 15, 9, 16, '#8a909c')
        t.rect(4, 10, 5, 14, '#d8dce8')
        t.rect(9, 10, 10, 15, '#8a909c')
        if cavando:
            t.rect(0, 14, 3, 16, '#8a6a3a')
            t.rect(1, 13, 2, 13, '#a8844a')
            t.put(12, 16, '#8a6a3a')
        quadros.append(outline(t.im))
    return quadros


# --- Bichos -----------------------------------------------------------------------------------------------------------------------
def corvo():
    """3 quadros (18x15): empoleirado, grasnando (bico aberto) e batendo as asas."""
    quadros = []
    for q in range(3):
        t = Tela(18, 15)
        t.rect(5, 5, 12, 10, '#26242e')
        t.rect(11, 3, 15, 7, '#26242e')
        t.rect(15, 5, 17, 6, '#e8a812')
        if q == 1:
            t.rect(15, 4, 17, 4, '#e8a812')
            t.rect(15, 7, 16, 7, '#e8a812')
        t.put(13, 4, '#ffffff')
        t.rect(2, 7, 5, 9, '#26242e')
        t.rect(3, 6, 4, 6, '#26242e')
        if q == 0:
            t.rect(6, 1, 9, 5, '#3a3844')
            t.rect(7, 0, 8, 0, '#3a3844')
        elif q == 1:
            t.rect(6, 2, 9, 5, '#3a3844')
        else:
            t.rect(6, 9, 9, 12, '#3a3844')
            t.rect(4, 11, 7, 13, '#3a3844')
        t.rect(7, 11, 8, 14, '#e8a812')
        t.rect(10, 11, 11, 14, '#e8a812')
        t.put(7, 6, '#4a4858')
        t.put(8, 6, '#4a4858')
        quadros.append(outline(t.im))
    return quadros


def borboleta():
    """4 quadros (9x8): borboleta com as asas para cima e para baixo; e a dourada (a borboleta da sorte)."""
    cima = ['oo.....oo', 'oLo.c.oLo', 'ooMocoMoo', '.ooocooo.', '..o.c.o..', '....c....']
    baixo = ['.........', '.........', '..o.c.o..', '.ooocooo.', 'oLMocoMLo', '.ooo.ooo.', '..o...o..', '....c....']
    quadros = []
    for ouro in (False, True):
        asa, luz, mancha, corpo = ('#ffb02a', '#ffe27a', '#ffffff', '#5a3418') if ouro else ('#ff7aa8', '#ffc0d8', '#ffe27a', '#3a2418')
        legenda = {'o': rgb(asa), 'L': rgb(luz), 'M': rgb(mancha), 'c': rgb(corpo)}
        for grade in (cima, baixo):
            t = Tela(9, 8)
            t.grade(grade, 0, 0, legenda)
            quadros.append(outline(t.im))
    return quadros


def galinha():
    """4 quadros (13x12): a galinha parada, bicando e andando (2 passos). Olha para a esquerda."""
    quadros = []
    for q in range(4):
        t = Tela(13, 12)
        cabeca_y = 3 if q != 1 else 6
        cabeca_x = 3 if q != 1 else 2
        # O corpo redondo e o rabo.
        horta_plantas.forma(t, 7.5, 6.5, 4.2, 3.3, ('#fffaf0', '#f0e4cc', '#cdbf9c'))
        t.rect(10, 3, 12, 5, '#f0e4cc')
        t.rect(11, 2, 12, 3, '#fffaf0')
        t.put(11, 4, '#cdbf9c')
        # A cabeça, a crista, o bico e a asinha.
        horta_plantas.forma(t, cabeca_x + 1.0, cabeca_y + 1.0, 1.8, 1.8, ('#fffaf0', '#f0e4cc', '#cdbf9c'))
        t.put(cabeca_x + 1, cabeca_y - 1, '#e0343e')
        t.put(cabeca_x + 2, cabeca_y - 1, '#e0343e')
        t.put(cabeca_x, cabeca_y + 1, '#26242e')
        t.put(cabeca_x - 1, cabeca_y + 2, '#ffb02a')
        t.put(cabeca_x - 2, cabeca_y + 2, '#ffb02a') if q == 1 else None
        t.put(cabeca_x + 1, cabeca_y + 3, '#e0343e')
        t.rect(6, 6, 9, 7, '#d8c8a8')
        # As perninhas.
        passo = [0, 0, 1, -1][q]
        for x in (6 + passo, 9 - passo):
            t.rect(x, 9, x, 10, '#e8a812')
            t.rect(x - 1, 11, x + 1, 11, '#e8a812')
        quadros.append(outline(t.im))
    return quadros


def espantalho():
    """2 quadros (28x36): o espantalho de braços para baixo e com um braço levantado, acenando."""
    quadros = []
    for aceno in (False, True):
        t = Tela(28, 36)
        # O poste e as pernas de palha.
        t.rect(13, 14, 14, 34, '#6e3c1c')
        t.rect(13, 14, 13, 34, '#9a5a2c')
        # Os braços de pau, com palha nas pontas.
        if aceno:
            t.line(14, 18, 4, 12, '#6e3c1c')
            t.line(14, 17, 4, 11, '#9a5a2c')
            for dx, dy in ((0, -1), (1, -2), (-1, -2), (2, -1)):
                t.put(3 + dx, 10 + dy, '#e8c44a')
        else:
            t.line(14, 18, 3, 22, '#6e3c1c')
            t.line(14, 17, 3, 21, '#9a5a2c')
            for dx, dy in ((0, 1), (-1, 2), (1, 2), (-1, 1)):
                t.put(2 + dx, 22 + dy, '#e8c44a')
        t.line(14, 18, 25, 22, '#6e3c1c')
        t.line(14, 17, 25, 21, '#9a5a2c')
        for dx, dy in ((0, 1), (1, 2), (-1, 2), (1, 1)):
            t.put(26 + dx, 22 + dy, '#e8c44a')
        # A camisa xadrez de remendos.
        t.rect(8, 14, 19, 25, '#ee6a4a')
        for x in range(9, 19, 4):
            t.rect(x, 14, x, 25, '#a8381c')
        for y in range(16, 25, 4):
            t.rect(8, y, 19, y, '#c84a2c')
        t.rect(8, 14, 8, 25, '#ff8a6a')
        t.rect(19, 14, 19, 25, '#a8381c')
        t.rect(11, 18, 14, 21, '#3a7ad8')
        t.rect(12, 19, 13, 20, '#6aa8f0')
        t.put(15, 22, '#ffd21e')
        # A cabeça de saco, com olhos de botão e sorriso torto.
        t.rect(9, 4, 18, 13, '#f4d8a0')
        t.rect(9, 4, 9, 13, '#fff0c8')
        t.rect(18, 4, 18, 13, '#d8b878')
        t.rect(11, 7, 12, 8, '#26242e')
        t.rect(15, 7, 16, 8, '#26242e')
        t.put(11, 7, '#ffffff')
        t.put(15, 7, '#ffffff')
        for x, y in ((11, 11), (12, 12), (13, 12), (14, 12), (15, 12), (16, 11)):
            t.put(x, y, '#7a3a1a')
        t.put(13, 9, '#d8a070')
        t.put(14, 9, '#d8a070')
        # O chapéu de palha com uma florzinha.
        t.rect(5, 3, 22, 4, '#e8c44a')
        t.rect(5, 4, 22, 4, '#b8942a')
        t.rect(8, 0, 19, 3, '#e8c44a')
        t.rect(8, 3, 19, 3, '#b8942a')
        for x in range(9, 19, 3):
            t.put(x, 1, '#f8dc78')
        t.rect(8, 2, 19, 2, '#c85a2a')
        t.put(17, 0, '#ff4f9e')
        t.put(18, 0, '#ff8ac0')
        t.put(18, 1, '#ffd21e')
        quadros.append(outline(t.im))
    return quadros


# --- Fundo -------------------------------------------------------------------------------------------------------------------------
def morros(t):
    """Duas fileiras de morros ao longe (com copas de árvore), e o moinho."""
    for x in range(W):
        alto = 38 + round(3 * math.sin(x / 11.0 + 2) + 2 * math.sin(x / 5.0))
        t.rect(x, alto, x, 50, '#1d3a44')
        alto2 = 43 + round(2 * math.sin(x / 9.0 + 5) + 1.5 * math.sin(x / 4.0))
        t.rect(x, alto2, x, 50, '#1d4a3a')
    gerador = random.Random(12)
    for x in range(6, W - 6, 9):
        y = 43 + round(2 * math.sin(x / 9.0 + 5))
        copa = gerador.choice(['#17452f', '#1f5a3a', '#17452f'])
        horta_plantas.forma(t, x, y - 3, 3.2, 3.4, (copa, copa, '#10301f'))


def moinho(t):
    """A torre de madeira do moinho (as pás giram por cima, desenhadas pelo jogo)."""
    cx, base = 27, 47
    for y in range(26, base + 1):
        meia = 3 + (y - 26) * 3 // 21
        t.rect(cx - meia, y, cx + meia, y, '#9a6a3a')
        t.rect(cx - meia, y, cx - meia, y, '#c08a50')
        t.rect(cx + meia, y, cx + meia, y, '#5a3a1c')
    t.rect(cx - 6, 21, cx + 6, 26, '#b87a3c')
    for k in range(6):
        t.rect(cx - 6 + k, 20 - k, cx + 6 - k, 20 - k, '#7a3a1c' if k % 2 else '#a85a2c')
    t.rect(cx - 1, 38, cx + 1, base, '#4a2a14')
    t.rect(cx - 1, 30, cx + 1, 33, '#ffd86a')


def celeiro(t):
    """O celeiro vermelho, com o sótão aceso e a porta de tábuas em X."""
    t.rect(132, 26, 172, 50, '#b23a48')
    for x in range(134, 172, 4):
        t.rect(x, 26, x, 50, '#8a2434')
    t.rect(132, 26, 132, 50, '#d85a62')
    for k in range(10):
        t.rect(130 + k * 2, 26 - k, 174 - k * 2, 26 - k, '#6e3c1c' if k % 2 else '#8a5a34')
    t.rect(143, 35, 161, 50, '#fff2d8')
    t.line(143, 35, 161, 50, '#b23a48')
    t.line(161, 35, 143, 50, '#b23a48')
    for x, y0, y1 in ((143, 35, 50), (161, 35, 50)):
        t.rect(x, y0, x, y1, '#b23a48')
    t.rect(143, 35, 161, 35, '#b23a48')
    t.rect(143, 35, 161, 36, '#b23a48')
    # A janelinha do sótão (o jogo pisca a luz dela).
    t.rect(148, 28, 156, 32, '#ffe27a')
    t.rect(147, 27, 157, 27, '#fff2d8')
    t.rect(147, 33, 157, 33, '#fff2d8')
    t.rect(152, 28, 152, 32, '#c89a10')
    # A cata-vento de galo no alto.
    t.rect(151, 10, 152, 17, '#4a4858')
    t.rect(148, 10, 155, 10, '#4a4858')
    t.rect(153, 8, 156, 11, '#e0343e')
    t.put(157, 9, '#ffb02a')


def quadro(t):
    """O quadro de encomendas: dois postes, o teto de tábua e a madeira onde ficam os bilhetes."""
    x0, x1, y0, y1 = 90, 128, 20, 48
    t.rect(x0 + 1, y0 + 2, x0 + 2, y1, '#6e3c1c')
    t.rect(x1 - 2, y0 + 2, x1 - 1, y1, '#6e3c1c')
    t.rect(x0 + 1, y0 + 2, x0 + 1, y1, '#9a5a2c')
    t.rect(x1 - 2, y0 + 2, x1 - 2, y1, '#9a5a2c')
    t.rect(x0 + 3, y0 + 4, x1 - 3, y1 - 6, '#8a5a30')
    t.rect(x0 + 3, y0 + 4, x1 - 3, y0 + 4, '#b07a44')
    for y in range(y0 + 7, y1 - 6, 6):
        t.rect(x0 + 3, y, x1 - 3, y, '#6e4420')
    t.rect(x0 + 3, y1 - 6, x1 - 3, y1 - 6, '#5a3418')
    for k in range(4):
        t.rect(x0 - 2 + k, y0 + k, x1 + 2 - k, y0 + k, '#c8884a' if k % 2 == 0 else '#8a5a2a')
    t.rect(x0 - 2, y0 + 3, x1 + 2, y0 + 3, '#5a3418')


def cerca_e_chao(t):
    # A cerca de tábuas ao longo da horta e o varal de bandeirinhas.
    for x in range(4, 130, 10):
        t.rect(x, 44, x + 2, 53, '#8a5a34')
        t.rect(x, 44, x, 53, '#b07a48')
        t.rect(x + 2, 44, x + 2, 53, '#5a3418')
        t.rect(x, 43, x + 2, 43, '#c8884a')
    t.rect(3, 47, 130, 48, '#a66a34')
    t.rect(3, 47, 130, 47, '#c8884a')
    t.rect(3, 50, 130, 50, '#8a5a34')
    janelas.poste(t, 2, 4, 56)
    janelas.poste(t, W - 4, 4, 56)
    janelas.varal(t, 3, W - 3, 8, 20, 5)
    # Grama de borda e a terra lavrada.
    t.rect(0, 51, W - 1, H - 1, '#3a9a48')
    janelas.ruido(t, 0, 51, W - 1, H - 1, 420, 31, ['#56b860', '#46a85a', '#2e8a44', '#2a7a3c', '#6ac868'])
    t.rect(3, 50, W - 4, 104, '#5a4028')
    t.rect(4, 51, W - 5, 103, '#6e5030')
    janelas.ruido(t, 4, 51, W - 5, 103, 160, 32, ['#7a5a38', '#52381e', '#8a6a3a', '#614428'])
    # Pedrinhas e uma trilha de pé no meio entre as fileiras.
    gerador = random.Random(5)
    for _ in range(14):
        x, y = gerador.randrange(6, W - 8), gerador.randrange(53, 102)
        t.put(x, y, '#a89a88')
        t.put(x + 1, y, '#7a6e60')
    # Flores na beira de baixo.
    cores = ['#ff4f9e', '#ffffff', '#ffd21e', '#e0343e', '#9a68e8']
    for k, x in enumerate(range(7, W - 6, 9)):
        cor = cores[k % len(cores)]
        y = 101 + (k % 2)
        t.put(x, y, cor)
        t.put(x - 1, y, cor)
        t.put(x + 1, y, cor)
        t.put(x, y - 1, cor)
        t.put(x, y + 1, '#2e7a3c')
        t.put(x, y, '#ffe27a' if cor != '#ffd21e' else '#ffffff')


def prateleira(t):
    t.rect(0, PRATELEIRA_Y, W - 1, H - 1, '#8a5a34')
    for y in (PRATELEIRA_Y + 5, PRATELEIRA_Y + 11, PRATELEIRA_Y + 17):
        t.rect(0, y, W - 1, y, '#6e3c1c')
    t.rect(0, PRATELEIRA_Y, W - 1, PRATELEIRA_Y + 1, '#c8884a')
    t.rect(0, PRATELEIRA_Y - 1, W - 1, PRATELEIRA_Y - 1, '#3a2418')
    t.rect(0, H - 1, W - 1, H - 1, '#5a3418')
    # Vãos escuros atrás de cada pacote e das ferramentas.
    for x in range(5, 104, 20):
        t.rect(x, PRATELEIRA_Y + 2, x + 17, H - 2, '#5a3a22')
    for x in (108, 128, 150):
        t.rect(x, PRATELEIRA_Y + 2, x + 18, H - 2, '#5a3a22')


def fundo():
    t = Tela(W, H)
    janelas.degrade(t, 0, 0, W - 1, 48, ['#12102a', '#18163a', '#1f1a48', '#282256', '#342b66', '#43377a', '#58458a', '#7a5a96'])
    janelas.estrelas(t, 2, 2, W - 2, 34, 46, 8)
    # A lua cheia com um halo.
    for r, cor in ((9, '#2c2860'), (7, '#403a78')):
        horta_plantas.forma(t, 52, 12, r, r, (cor, cor, cor))
    horta_plantas.forma(t, 52, 12, 5, 5, ('#fffbe0', '#fff3c4', '#e8d596'))
    t.put(50, 11, '#e8d596')
    t.put(54, 14, '#e8d596')
    morros(t)
    moinho(t)
    celeiro(t)
    quadro(t)
    cerca_e_chao(t)
    prateleira(t)
    return t.im


def estrelas_piscando():
    gerador = random.Random(21)
    return [[gerador.randrange(4, W - 4), gerador.randrange(3, 30)] for _ in range(9)]


def exportar(add):
    return {
        'fundo': add('janela-horta-fundo', fundo()),
        'plantas': {**add('janela-horta-plantas', plantas()), 'ids': PLANTAS},
        'douradas': add('janela-horta-douradas', plantas_douradas()),
        'solo': add('janela-horta-solo', solo()),
        'pacotes': add('janela-horta-pacotes', pacotes()),
        'icones': add('janela-horta-icones', icones()),
        'bilhetes': add('janela-horta-bilhetes', bilhetes()),
        'corvo': add('janela-horta-corvo', corvo()),
        'regadora': add('janela-horta-regadora', regadora()),
        'cesta': add('janela-horta-cesta', cesta()),
        'pa': add('janela-horta-pa', pa()),
        'borboleta': add('janela-horta-borboleta', borboleta()),
        'galinha': add('janela-horta-galinha', galinha()),
        'espantalho': add('janela-horta-espantalho', espantalho()),
        'colunas': COLUNAS, 'linhas': LINHAS, 'canteiro': list(PLOT), 'prateleira': PRATELEIRA_Y, 'w': W, 'h': H,
        # Onde o jogo desenha o que se mexe por cima do fundo.
        'moinho': {'x': 27, 'y': 27, 'raio': 12}, 'janelaCeleiro': {'x': 148, 'y': 28, 'w': 9, 'h': 5},
        'estrelas': estrelas_piscando(), 'lanternas': [4, 34, 64, 94, 124],
        'quadro': {'x': 90, 'y': 20, 'w': 38, 'h': 28, 'notas': [[94, 28], [111, 28]]},
        'espantalhoPos': {'x': 58, 'y': 15},
    }
