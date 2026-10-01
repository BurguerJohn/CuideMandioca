"""Horta: o fundo (céu, celeiro, espantalho, cerca, chão e a prateleira das sementes), os canteiros, as 5 plantas em 4 fases, o
corvo, a regadora e os pacotes de semente.
"""

import math
import random

import janelas
from casa import Tela, rgb
from render import outline

W, H = 176, 116
PLOT = (28, 22)                                   # um canteiro
COLUNAS = [8, 40, 72, 104, 136]                  # x de cada coluna
LINHAS = [48, 74]                                # y de cada fileira
PRATELEIRA_Y = 100                               # onde começa a prateleira de baixo
CELULA = (28, 30)                                # uma planta (com contorno)
PLANTAS = ['milho', 'amendoim', 'batata-doce', 'mandioca', 'abobora']


def verde(t, x, y, claro=False):
    t.put(x, y, '#56c860' if claro else '#2e8a44')


def folha(t, cx, cy, tam, cor='#2e8a44', luz='#56c860', dir=1):
    """Uma folha: tira inclinada de `tam` pixels para o lado `dir`."""
    for k in range(tam):
        t.put(cx + dir * k, cy - k // 2, cor)
        t.put(cx + dir * k, cy - k // 2 + 1, cor)
    t.put(cx + dir * (tam - 1), cy - (tam - 1) // 2, luz)


def planta(nome, fase):
    """A planta `nome` na `fase` (0 semente, 1 broto, 2 crescendo, 3 no ponto), sem contorno, com o pé no meio da base."""
    t = Tela(26, 28)
    base = 26                                     # linha do chão
    cx = 13
    t.rect(cx - 3, base, cx + 3, base + 1, '#6a4a2a')   # montinho de terra
    t.rect(cx - 2, base - 1, cx + 2, base - 1, '#7a5a34')
    if fase == 0:
        t.put(cx, base - 2, '#e8d29a')
        t.put(cx + 1, base - 2, '#c8a868')
        return t.im
    if nome == 'milho':
        alto = [0, 6, 13, 20][fase]
        t.rect(cx, base - alto, cx, base - 1, '#46a85a')
        for k in range(1, (3 if fase > 1 else 1) + 1):
            y = base - 3 - k * 4 if fase > 1 else base - 4
            folha(t, cx + 1, y, 4 + k // 2, dir=1)
            folha(t, cx - 1, y - 1, 4 + k // 2, dir=-1)
        if fase == 3:
            t.rect(cx + 2, base - 11, cx + 4, base - 6, '#8ad048')       # palha da espiga
            t.rect(cx + 3, base - 12, cx + 3, base - 10, '#ffd21e')      # grãos
            t.rect(cx + 4, base - 9, cx + 4, base - 7, '#ffe27a')
            t.rect(cx - 1, base - alto - 2, cx + 1, base - alto, '#c8a868')  # pendão
    elif nome == 'amendoim':
        n = [0, 2, 4, 5][fase]
        for k in range(n):
            ang = (k - n / 2) * 0.9
            x = cx + round(math.sin(ang) * (2 + fase * 1.6))
            y = base - 2 - fase * 2 - round(abs(math.cos(ang)) * (fase + 1))
            t.rect(x - 1, y - 1, x + 1, y + 1, '#46a85a')
            t.put(x, y - 1, '#7ad060')
            t.put(x, y + 2, '#2e8a44')
        if fase >= 2:
            t.put(cx - 3, base - 6, '#ffd21e')
            t.put(cx - 4, base - 6, '#ffe27a')
        if fase == 3:
            for x in (cx - 5, cx + 4):
                t.rect(x, base - 1, x + 2, base, '#d8b078')
                t.put(x + 1, base - 1, '#b8884a')
    elif nome == 'batata-doce':
        n = [0, 2, 4, 6][fase]
        for k in range(n):
            lado = -1 if k % 2 else 1
            x = cx + lado * (2 + k // 2 * 2)
            y = base - 3 - (k // 2) * 2
            t.rect(x - 1, y - 1, x + 1, y, '#6a9a4a' if fase < 3 else '#7a5aa0')
            t.put(x, y + 1, '#4a7a30')
            t.put(x, y - 2, '#8aca6a')
        t.rect(cx, base - 4, cx, base - 1, '#6a9a4a')
        if fase == 3:
            t.rect(cx - 2, base - 1, cx + 3, base, '#9a4a8a')
            t.rect(cx - 1, base - 2, cx + 2, base - 2, '#b868a8')
    elif nome == 'mandioca':
        alto = [0, 6, 12, 18][fase]
        t.rect(cx, base - alto, cx, base - 1, '#8a6a3a')
        t.put(cx + 1, base - alto // 2, '#8a6a3a')
        for k in range(fase):
            y = base - alto + k * 3 + 2
            for ang in (-1.0, -0.4, 0.2, 0.8):
                for r in range(1, 4 + fase):
                    t.put(cx + round(math.sin(ang * 1.3) * r) + (1 if k % 2 else -1) * k, y - round(math.cos(ang) * r * 0.5), '#2e8a44' if r % 2 else '#46a85a')
        if fase == 3:
            t.rect(cx - 3, base - 2, cx + 3, base, '#b88a52')    # a raiz aparecendo na terra
            t.rect(cx - 2, base - 3, cx + 2, base - 3, '#d8aa6a')
            t.put(cx - 1, base - 1, '#2a1a0a')
            t.put(cx + 1, base - 1, '#2a1a0a')
    elif nome == 'abobora':
        n = [0, 2, 5, 7][fase]
        for k in range(n):
            ang = (k - n / 2) * 0.8
            x = cx + round(math.sin(ang) * (3 + fase * 2))
            y = base - 3 - abs(round(math.cos(ang) * 3))
            t.rect(x - 2, y - 1, x + 2, y + 1, '#3a9a48')
            t.rect(x - 1, y - 2, x + 1, y - 2, '#6ac860')
        if fase == 2:
            t.rect(cx - 2, base - 2, cx + 2, base, '#9ac848')
        if fase == 3:
            t.rect(cx - 6, base - 6, cx + 6, base, '#f08a2a')
            t.rect(cx - 4, base - 7, cx + 4, base - 7, '#f08a2a')
            for x in (cx - 3, cx, cx + 3):
                t.rect(x, base - 6, x, base, '#c85a14')
            t.rect(cx - 5, base - 5, cx - 4, base - 4, '#ffc07a')
            t.rect(cx, base - 10, cx + 1, base - 7, '#4a7a30')
    return t.im


def plantas():
    return [outline(planta(nome, fase)) for nome in PLANTAS for fase in range(4)]


def solo():
    """3 quadros: terra seca, terra regada e canteiro fechado (grama com cerquinha e cadeado)."""
    quadros = []
    for tipo in range(3):
        t = Tela(*PLOT)
        if tipo < 2:
            base, sulco = ('#8a6a3a', '#6a4a24') if tipo == 0 else ('#6e5030', '#52381e')
            t.rect(0, 0, PLOT[0] - 1, PLOT[1] - 1, base)
            for y in range(4, PLOT[1] - 2, 4):
                t.rect(2, y, PLOT[0] - 3, y, sulco)
                t.rect(2, y - 1, PLOT[0] - 3, y - 1, '#a8844a' if tipo == 0 else '#7a5a38')
            janelas.ruido(t, 1, 1, PLOT[0] - 2, PLOT[1] - 2, 20, 4 + tipo, ['#a8844a' if tipo == 0 else '#7a5a38', sulco])
            t.rect(0, 0, PLOT[0] - 1, 0, '#b07a48')
            t.rect(0, PLOT[1] - 1, PLOT[0] - 1, PLOT[1] - 1, '#4a2e1a')
            t.rect(0, 0, 0, PLOT[1] - 1, '#a66a34')
            t.rect(PLOT[0] - 1, 0, PLOT[0] - 1, PLOT[1] - 1, '#4a2e1a')
        else:
            t.rect(0, 0, PLOT[0] - 1, PLOT[1] - 1, '#3a7a44')
            janelas.ruido(t, 0, 0, PLOT[0] - 1, PLOT[1] - 1, 50, 9, ['#46a85a', '#2e6a38', '#56b860'])
            for x in (1, PLOT[0] - 3):
                t.rect(x, 3, x + 1, PLOT[1] - 2, '#8a5a34')
            t.rect(1, 6, PLOT[0] - 2, 7, '#a66a34')
            t.rect(1, 14, PLOT[0] - 2, 15, '#a66a34')
            t.rect(11, 8, 17, 14, '#ffd21e')
            t.rect(12, 9, 16, 13, '#c89a10')
            t.rect(13, 5, 15, 8, '#9a9ca8')
            t.rect(13, 5, 13, 7, '#c8ccd8')
            t.put(14, 11, '#26242e')
            t.rect(14, 12, 14, 12, '#26242e')
        quadros.append(t.im)
    return quadros


def pacotes():
    """Os pacotes de semente (16x18), com um desenho da planta."""
    cores = {'milho': '#ffd21e', 'amendoim': '#d8a050', 'batata-doce': '#b868a8', 'mandioca': '#b88a52', 'abobora': '#f08a2a'}
    quadros = []
    for nome in PLANTAS:
        t = Tela(16, 18)
        t.rect(1, 1, 14, 16, '#f8f0e0')
        t.rect(1, 1, 14, 4, cores[nome])
        t.rect(1, 16, 14, 16, '#c8bca0')
        t.rect(2, 2, 13, 2, '#ffffff')
        miniatura = outline(planta(nome, 3)).crop((4, 8, 24, 28)).resize((10, 10))
        # a planta em miniatura no meio do pacote
        for x in range(10):
            for y in range(10):
                px = miniatura.getpixel((x, y))
                if px[3] > 100:
                    t.put(3 + x, 6 + y, px[:3])
        quadros.append(t.im)
    return quadros


def corvo():
    quadros = []
    for q in range(2):
        t = Tela(18, 14)
        t.rect(5, 5, 12, 10, '#26242e')
        t.rect(11, 3, 15, 7, '#26242e')
        t.rect(15, 5, 17, 6, '#e8a812')
        t.put(13, 4, '#ffffff')
        t.rect(2, 7, 5, 9, '#26242e')
        t.rect(3, 6, 4, 6, '#26242e')
        if q == 0:
            t.rect(6, 1, 9, 5, '#3a3844')
            t.rect(7, 0, 8, 0, '#3a3844')
        else:
            t.rect(6, 9, 9, 12, '#3a3844')
        t.rect(7, 11, 8, 13, '#e8a812')
        t.rect(10, 11, 11, 13, '#e8a812')
        t.put(7, 6, '#4a4858')
        quadros.append(outline(t.im))
    return quadros


def regadora():
    t = Tela(16, 12)
    t.grade(['................', '..ssss..........', '.sbbbbbs....s...', '.sbbbbbbbss.ss..', '.sbbbbbbbbbssss.', '.sbbbBBbbbs.....', '.sbbbBBbbbs.....', '.sbbbbbbbbs.....', '..sbbbbbbs......',
             '...ssssss.......', '................', '................'], 0, 0,
            {'s': rgb('#aeb4c0'), 'b': rgb('#4a78d8'), 'B': rgb('#2a4aa8')})
    return outline(t.im)


def fundo():
    t = Tela(W, H)
    janelas.degrade(t, 0, 0, W - 1, 46, ['#15132e', '#1c1a3a', '#241f4a', '#2d2858', '#37306a', '#43397a'])
    janelas.estrelas(t, 2, 2, W - 2, 30, 40, 8)
    t.rect(14, 8, 20, 14, '#fff3c4')
    t.rect(13, 9, 21, 13, '#fff3c4')
    t.rect(16, 10, 17, 11, '#e8d596')
    # Morros ao longe.
    for x in range(W):
        alto = 38 + round(3 * math.sin(x / 11.0 + 2) + 2 * math.sin(x / 5.0))
        t.rect(x, alto, x, 48, '#1d3a3a')
    # Celeiro vermelho.
    t.rect(132, 24, 172, 48, '#b23a48')
    for x in range(134, 172, 4):
        t.rect(x, 24, x, 48, '#8a2434')
    for k in range(10):
        t.rect(130 + k * 2, 24 - k, 174 - k * 2, 24 - k, '#6e3c1c' if k % 2 else '#8a5a34')
    t.rect(143, 31, 161, 48, '#fff2d8')
    t.line(143, 31, 161, 48, '#b23a48')
    t.line(161, 31, 143, 48, '#b23a48')
    t.rect(143, 31, 161, 31, '#b23a48')
    t.rect(143, 31, 143, 48, '#b23a48')
    t.rect(161, 31, 161, 48, '#b23a48')
    # Espantalho.
    t.rect(87, 30, 88, 50, '#6e3c1c')
    t.rect(78, 35, 97, 36, '#6e3c1c')
    t.rect(81, 33, 94, 41, '#ee6a4a')
    for x in range(82, 94, 4):
        t.rect(x, 33, x, 41, '#a8381c')
    t.rect(84, 24, 91, 31, '#f4d8a0')
    t.put(86, 27, '#26242e')
    t.put(89, 27, '#26242e')
    t.rect(86, 29, 89, 29, '#7a3a1a')
    t.rect(80, 22, 95, 23, '#e8c44a')
    t.rect(83, 18, 92, 22, '#e8c44a')
    t.rect(83, 22, 92, 22, '#b8942a')
    t.rect(77, 36, 79, 38, '#e8c44a')
    t.rect(96, 36, 98, 38, '#e8c44a')
    # Cerca e varal de bandeirinhas.
    for x in range(6, W - 6, 11):
        t.rect(x, 43, x + 2, 52, '#8a5a34')
        t.rect(x, 43, x, 52, '#b07a48')
    t.rect(4, 46, W - 4, 47, '#a66a34')
    janelas.poste(t, 2, 4, 56)
    janelas.poste(t, W - 4, 4, 56)
    janelas.varal(t, 3, W - 3, 8, 20, 5)
    # Chão: grama e a terra lavrada do quintal.
    t.rect(0, 48, W - 1, H - 1, '#3a9a48')
    janelas.ruido(t, 0, 50, W - 1, H - 1, 360, 31, ['#56b860', '#46a85a', '#2e8a44', '#2a7a3c'])
    t.rect(4, 46, W - 5, 99, '#5a4028')
    t.rect(5, 47, W - 6, 98, '#6e5030')
    janelas.ruido(t, 5, 47, W - 6, 98, 120, 32, ['#7a5a38', '#52381e', '#8a6a3a'])
    # Prateleira das sementes.
    t.rect(0, PRATELEIRA_Y, W - 1, H - 1, '#8a5a34')
    for y in (PRATELEIRA_Y + 4, PRATELEIRA_Y + 9, PRATELEIRA_Y + 14):
        t.rect(0, y, W - 1, y, '#6e3c1c')
    t.rect(0, PRATELEIRA_Y, W - 1, PRATELEIRA_Y + 1, '#b07a48')
    t.rect(0, PRATELEIRA_Y - 1, W - 1, PRATELEIRA_Y - 1, '#3a2418')
    return t.im


def exportar(add):
    return {
        'fundo': add('janela-horta-fundo', fundo()),
        'plantas': {**add('janela-horta-plantas', plantas()), 'ids': PLANTAS},
        'solo': add('janela-horta-solo', solo()),
        'pacotes': add('janela-horta-pacotes', pacotes()),
        'corvo': add('janela-horta-corvo', corvo()),
        'regadora': add('janela-horta-regadora', regadora()),
        'colunas': COLUNAS, 'linhas': LINHAS, 'canteiro': list(PLOT), 'prateleira': PRATELEIRA_Y, 'w': W, 'h': H,
    }
