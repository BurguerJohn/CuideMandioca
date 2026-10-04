"""Céu de São João: o céu à noite com a silhueta do arraial (casas, igrejinha, árvores), a caixa dos foguetes, a mesinha da simpatia
e as cartas (o verso e uma face para cada simpatia).
"""

import math
import random

import ambiente as amb
import janelas
from casa import Tela, rgb
from render import outline

W, H = 176, 120
CHAO_Y = 92                          # onde o céu acaba e a silhueta começa
CAIXA = (62, 98, 114, 119)           # a caixa dos foguetes (x0, y0, x1, y1)
MESA = (4, 96, 40, 119)              # a mesinha da simpatia
SIMPATIAS = ['faca', 'alianca', 'ovo', 'agulha', 'milho', 'fogueira', 'cebola', 'banho', 'papel', 'estalinho']


CEU = ['#06041a', '#0a0822', '#100c2c', '#181040', '#221652', '#2e1e64', '#3e2876', '#52328a', '#6c3c90', '#8a4a8a', '#a85a84']
CHAMINES = []                          # onde sobe a fumaça (preenchido por `vila`)
JANELAS = []                           # as janelinhas acesas (a janela pisca algumas)
LAMPIOES = [(46, 100), (118, 99)]      # postes de luz da praça (a chama fica no alto)


def vila(t):
    """O arraial: dois morros ao fundo, casinhas coloridas (escuras de noite, com a borda de luz da lua), a igrejinha com relógio aceso,
    árvores e palmeiras com luz na beirada, e o clarão laranja das fogueiras atrás de tudo."""
    CHAMINES.clear()
    JANELAS.clear()
    # O clarão das fogueiras da festa, lá atrás, iluminando a barriga das nuvens e o alto dos telhados.
    amb.luz(t, 88, CHAO_Y - 2, 92, 26, '#ff9a3a', 0.4, 5)
    # Morros ao longe, em duas camadas.
    for x in range(W):
        y1 = CHAO_Y - 24 - round(6 * math.sin(x / 19.0 + 1) + 3 * math.sin(x / 7.0))
        t.rect(x, y1, x, CHAO_Y, '#2a1c48')
        if x % 2 == 0:
            t.put(x, y1, '#3e2c64')
        y2 = CHAO_Y - 15 - round(4 * math.sin(x / 13.0 + 3) + 2 * math.sin(x / 5.0))
        t.rect(x, y2, x, CHAO_Y, '#1c1236')
    medio, escuro = '#160f2c', '#0e0a1c'
    cores_parede = ['#3a2448', '#2a2c50', '#38283e', '#2c3a4a', '#40302a', '#2c2848']
    gerador = random.Random(5)
    casas = [(1, 13, 18), (19, 14, 13), (36, 11, 15), (51, 14, 16), (88, 13, 17), (105, 11, 15), (146, 14, 15), (163, 12, 14)]
    for k, (x, largura, altura) in enumerate(casas):
        topo = CHAO_Y - altura
        parede = cores_parede[k % len(cores_parede)]
        t.rect(x, topo, x + largura, CHAO_Y + 4, parede)
        t.rect(x, topo, x, CHAO_Y + 4, '#58407a')                  # luz da lua na quina
        t.rect(x + largura, topo, x + largura, CHAO_Y + 4, escuro)
        # Telhado de duas águas, com telhas e a luz da lua em cima.
        for j in range(largura // 2 + 1):
            t.rect(x - 1 + j, topo - 1 - j, x + largura + 1 - j, topo - 1 - j, '#241438' if j % 2 else '#2e1a44')
        t.rect(x - 1, topo, x + largura + 1, topo, '#120a22')
        t.put(x + largura // 2, topo - 1 - largura // 2, '#7a60a0')
        # Chaminé.
        if k % 2 == 0:
            t.rect(x + largura - 4, topo - 8 - k % 3, x + largura - 2, topo - 2, '#1a1030')
            CHAMINES.append([x + largura - 3, topo - 9 - k % 3])
        # Porta e janelas acesas com caixilho.
        t.rect(x + largura // 2 - 1, CHAO_Y - 4, x + largura // 2 + 1, CHAO_Y + 4, '#241810')
        for _ in range(2):
            jx, jy = x + 2 + gerador.randrange(max(1, largura - 6)), topo + 3 + gerador.randrange(max(1, altura - 9))
            t.rect(jx - 1, jy - 1, jx + 2, jy + 2, '#120a22')
            t.rect(jx, jy, jx + 1, jy + 1, '#ffd860')
            t.put(jx, jy, '#fff6c0')
            JANELAS.append([jx, jy])
    # Igrejinha: nave, torre com relógio aceso e sino, cruz no alto.
    t.rect(120, CHAO_Y - 24, 136, CHAO_Y + 4, '#2c2448')
    t.rect(120, CHAO_Y - 24, 120, CHAO_Y + 4, '#5a4a80')
    for j in range(9):
        t.rect(119 + j, CHAO_Y - 25 - j, 137 - j, CHAO_Y - 25 - j, '#241438' if j % 2 else '#2e1a44')
    t.rect(125, CHAO_Y - 38, 131, CHAO_Y - 25, '#2c2448')
    t.rect(125, CHAO_Y - 38, 125, CHAO_Y - 25, '#5a4a80')
    for j in range(5):
        t.rect(124 + j, CHAO_Y - 44 + j, 132 - j, CHAO_Y - 44 + j, '#241438' if j % 2 else '#2e1a44')
    t.rect(127, CHAO_Y - 52, 129, CHAO_Y - 44, '#120a22')
    t.rect(126, CHAO_Y - 50, 130, CHAO_Y - 49, '#120a22')
    t.rect(126, CHAO_Y - 36, 130, CHAO_Y - 31, '#120a22')           # o relógio
    t.rect(127, CHAO_Y - 35, 129, CHAO_Y - 32, '#fff2b0')
    t.put(128, CHAO_Y - 34, '#26183a')
    t.put(129, CHAO_Y - 33, '#26183a')
    t.rect(127, CHAO_Y - 29, 129, CHAO_Y - 26, '#120a22')           # a janela do sino
    t.rect(128, CHAO_Y - 28, 128, CHAO_Y - 27, '#ffd860')
    t.rect(126, CHAO_Y - 14, 130, CHAO_Y - 6, '#ffd860')           # a porta acesa
    t.rect(127, CHAO_Y - 14, 129, CHAO_Y - 14, '#fff6c0')
    amb.luz(t, 128, CHAO_Y - 34, 9, 7, '#ffe27a', 0.3, 3)
    amb.luz(t, 128, CHAO_Y - 10, 10, 8, '#ffd860', 0.28, 3)
    JANELAS.append([128, CHAO_Y - 28])
    # Árvores e palmeiras com a borda clara do lado da lua.
    for cx, raio in ((46, 7), (84, 8), (142, 7), (172, 6)):
        janelas.elipse(t, cx, CHAO_Y - 8, raio, raio * 0.9, '#0a1624')
        for y in range(CHAO_Y - 8 - int(raio * 0.9), CHAO_Y - 8):
            t.put(cx + raio - 1 - (y - (CHAO_Y - 8 - int(raio * 0.9))) // 2, y, '#26405a')
        t.rect(cx - 1, CHAO_Y - 3, cx, CHAO_Y + 4, '#08080f')
    t.rect(100, CHAO_Y - 22, 101, CHAO_Y + 4, '#0a0a14')
    for dx, dy in ((-8, 3), (-5, -1), (0, -4), (5, -1), (8, 3), (-6, 6), (6, 6)):
        t.line(100, CHAO_Y - 22, 100 + dx, CHAO_Y - 22 + dy, '#0a1624')
        t.line(100, CHAO_Y - 21, 100 + dx, CHAO_Y - 21 + dy, '#0a1624')
    t.put(103, CHAO_Y - 19, '#26405a')


def praca(t):
    """A praça: pedras de calçada em fileiras, sombras e a luz quente dos lampiões."""
    t.rect(0, CHAO_Y + 4, W - 1, H - 1, '#150c26')
    for y in range(CHAO_Y + 5, H, 5):
        for x in range(0, W, 8):
            xx = x + (4 if ((y - CHAO_Y) // 5) % 2 else 0)
            t.rect(xx, y, xx + 6, y + 3, '#1f1436')
            t.rect(xx, y, xx + 6, y, '#2a1c48')
            t.put(xx + 6, y + 3, '#0c0818')
    amb.gradiente(t, 0, CHAO_Y + 4, W - 1, H - 1, '#0a0618', 0.0, 0.5, 6)
    for x, y in LAMPIOES:
        # Poste com lampião; a luz cai no chão em poça.
        t.rect(x, y - 6, x + 1, y + 16, '#2a1c18')
        t.rect(x - 2, y - 10, x + 3, y - 6, '#2a1c18')
        t.rect(x - 1, y - 9, x + 2, y - 7, '#ffd860')
        t.put(x, y - 9, '#fff6c0')
        amb.luz(t, x + 0.5, y + 12, 22, 6, '#ffb040', 0.34, 4)
        amb.luz(t, x + 0.5, y - 8, 8, 8, '#ffd070', 0.3, 3)


def caixa_dos_fogos(t):
    """A caixa dos foguetes: madeira reforçada com cintas de ferro, seis tubos de papel colorido e os pavios."""
    x0, y0, x1, y1 = CAIXA
    t.rect(x0, y0, x1, y1, '#4a2c18')
    t.rect(x0 + 1, y0 + 1, x1 - 1, y1, '#8a5a34')
    for x in range(x0 + 2, x1, 5):
        t.rect(x, y0 + 9, x, y1, '#6e3c1c')
    t.rect(x0, y0, x1, y0, '#c88a50')
    t.rect(x0, y0 + 1, x1, y0 + 1, '#b07a48')
    t.rect(x0, y0 + 9, x1, y0 + 10, '#3a3848')
    t.rect(x0, y0 + 9, x1, y0 + 9, '#7a7a90')
    for x in (x0 + 2, x1 - 3):
        t.rect(x, y0 + 9, x + 1, y0 + 10, '#c0c0d0')
    for k in range(6):
        cor = ('#c82838', '#e8a818', '#2a8a40', '#2860c8', '#c8388a', '#e86a18')[k]
        t.rect(x0 + 3 + k * 8, y0 + 2, x0 + 9 + k * 8, y0 + 8, '#1a1010')
        t.rect(x0 + 4 + k * 8, y0 + 3, x0 + 8 + k * 8, y0 + 8, cor)
    t.rect(x0 + 1, y1, x1 - 1, y1, '#2a1a10')
    amb.sombra(t, (x0 + x1) // 2, y1 + 1, 28, 1, 0.4, '#04020c')


def mesinha(t):
    """A mesinha da simpatia: toalha de xadrez vermelho, vela num copo, cartas em leque e um vasinho."""
    x0, y0, x1, y1 = MESA
    t.rect(x0, y0 + 8, x1, y1, '#a82838')
    for y in range(y0 + 8, y1 + 1):
        for x in range(x0, x1 + 1):
            if ((x - x0) // 3 + (y - y0 - 8) // 3) % 2 == 0:
                t.put(x, y, '#c83848')
    t.rect(x0, y0 + 8, x1, y0 + 9, '#e0586a')
    t.rect(x0, y1 - 1, x1, y1, '#701824')
    for x in range(x0 + 1, x1, 4):
        t.put(x, y1 - 2, '#701824')
    # Vela dentro de um copo.
    t.rect(x0 + 2, y0 + 3, x0 + 4, y0 + 8, '#f4f4ec')
    t.put(x0 + 2, y0 + 3, '#ffffff')
    t.rect(x0 + 1, y0 + 4, x0 + 5, y0 + 8, '#a8d8f0')
    t.rect(x0 + 2, y0 + 4, x0 + 4, y0 + 8, '#f4f4ec')
    # Leque de cartas.
    for k in range(3):
        t.rect(x0 + 10 + k * 5, y0 + 3 - k % 2, x0 + 14 + k * 5, y0 + 8, '#f4e4c0')
        t.rect(x0 + 10 + k * 5, y0 + 3 - k % 2, x0 + 14 + k * 5, y0 + 3 - k % 2, '#ffd21e')
        t.rect(x0 + 10 + k * 5, y0 + 3 - k % 2, x0 + 10 + k * 5, y0 + 8, '#d8c090')
    # Vasinho de flor do campo.
    t.rect(x0 + 29, y0 + 5, x0 + 33, y0 + 8, '#8a5a34')
    t.rect(x0 + 29, y0 + 5, x0 + 33, y0 + 5, '#b07a48')
    for dx, dy, cor in ((0, 0, '#ff7aa8'), (2, -2, '#ffd21e'), (4, 0, '#9ad0ff')):
        t.put(x0 + 29 + dx, y0 + 2 + dy, cor)
        t.rect(x0 + 30 + dx // 2, y0 + 3 + dy, x0 + 30 + dx // 2, y0 + 4, '#2e8a44')
    amb.sombra(t, (x0 + x1) // 2, y1 + 1, 18, 1, 0.4, '#04020c')


def fundo():
    t = Tela(W, H)
    amb.ceu(t, 0, 0, W - 1, CHAO_Y, CEU)
    # Via Láctea: uma faixa diagonal de poeira clara e estrelas mais juntinhas.
    for k in range(260):
        gerador = random.Random(k * 7 + 3)
        u = gerador.random()
        x = round(10 + u * 150 + gerador.gauss(0, 7))
        y = round(70 - u * 60 + gerador.gauss(0, 5))
        if 0 <= x < W and 0 <= y < CHAO_Y - 14:
            amb.tingir(t, x, y, '#c8b8ff', 0.5)
    janelas.estrelas(t, 1, 1, W - 1, 76, 70, 33)
    for x, y in ((12, 10), (60, 5), (96, 30), (28, 40), (164, 44), (74, 18)):
        t.put(x, y, '#ffffff')
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            t.put(x + dx, y + dy, '#b8b0e8')
    amb.lua(t, 150, 15, 6)
    vila(t)
    janelas.varal(t, 4, 170, CHAO_Y - 14, CHAO_Y - 2, 7)
    praca(t)
    caixa_dos_fogos(t)
    mesinha(t)
    return t.im


def nuvens():
    """Três nuvens (50x12) com a barriga alaranjada pela luz das fogueiras; a janela as empurra devagar pelo céu."""
    quadros = []
    for k, largura in enumerate((46, 34, 26)):
        t = Tela(50, 12)
        amb.nuvem(t, 2, 6, largura, '#3a2c64', '#8a78c0', '#c8683c')
        quadros.append(t.im)
    return quadros


def foguete(quadro):
    t = Tela(6, 14)
    t.grade(['..rr..', '.rrrr.', '.rwwr.', '.rwwr.', '.rrrr.', '.bbbb.', 'rbbbbr', 'r.bb.r', '..bb..', '..kk..'], 0, 0,
            {'r': rgb('#ee4c4c'), 'w': rgb('#ffffff'), 'b': rgb('#3a6cf0'), 'k': rgb('#26242e')})
    if quadro == 0:
        t.rect(2, 10, 3, 12, '#ff9a2a')
        t.put(2, 13, '#ffd21e')
    else:
        t.rect(2, 10, 3, 13, '#ff6a1a')
        t.rect(2, 10, 3, 11, '#ffd21e')
    return outline(t.im)


def carta(indice):
    """A carta (22x30): o verso (`indice` -1) ou a face com o símbolo da simpatia."""
    t = Tela(22, 30)
    if indice < 0:
        t.rect(0, 0, 21, 29, '#6a1030')
        t.rect(2, 2, 19, 27, '#a82050')
        for y in range(4, 27, 4):
            for x in range(4, 19, 4):
                t.rect(x, y, x + 1, y + 1, '#ffd21e')
        t.rect(8, 12, 13, 17, '#ffd21e')
        t.rect(9, 13, 12, 16, '#a82050')
        return outline(t.im)
    t.rect(0, 0, 21, 29, '#c8a860')
    t.rect(1, 1, 20, 28, '#fff4d8')
    t.rect(2, 2, 19, 27, '#f4e4b8')
    nome = SIMPATIAS[indice]
    cx, cy = 11, 14
    if nome == 'faca':
        t.line(cx - 4, cy + 7, cx + 4, cy - 7, '#aeb4c0')
        t.line(cx - 3, cy + 7, cx + 5, cy - 7, '#8c94a2')
        t.rect(cx - 6, cy + 6, cx - 3, cy + 9, '#6e3c1c')
    elif nome == 'alianca':
        janelas.elipse(t, cx, cy + 2, 5, 5, '#ffd21e')
        janelas.elipse(t, cx, cy + 2, 3, 3, '#f4e4b8')
        t.rect(cx - 1, cy - 5, cx + 1, cy - 3, '#56c8ee')
    elif nome == 'ovo':
        janelas.elipse(t, cx, cy, 5, 7, '#fff8e8', '#e8d8b0')
    elif nome == 'agulha':
        t.line(cx - 6, cy + 5, cx + 6, cy - 5, '#9a9ca8')
        t.put(cx + 6, cy - 5, '#ffffff')
        t.rect(cx - 8, cy + 4, cx - 6, cy + 6, '#ee4c4c')
        t.rect(cx - 7, cy + 7, cx + 7, cy + 8, '#56c8ee')
    elif nome == 'milho':
        janelas.elipse(t, cx, cy, 3, 8, '#ffd21e', '#c89a10')
        t.rect(cx - 4, cy + 2, cx + 4, cy + 9, '#56c860')
        t.rect(cx, cy - 11, cx + 1, cy - 7, '#c8a868')
    elif nome == 'fogueira':
        t.rect(cx - 6, cy + 7, cx + 6, cy + 9, '#6e3c1c')
        janelas.elipse(t, cx, cy + 1, 4, 7, '#ff8a12', '#ff4a1a')
        janelas.elipse(t, cx, cy + 3, 2, 4, '#ffd21e')
    elif nome == 'cebola':
        janelas.elipse(t, cx, cy + 3, 6, 6, '#c870a8', '#9a4a88')
        t.rect(cx - 1, cy - 7, cx + 1, cy - 2, '#56c860')
    elif nome == 'banho':
        for dx, dy in ((-5, 4), (-2, -2), (3, 0), (5, 6), (0, 7)):
            janelas.elipse(t, cx + dx, cy + dy, 3, 2.2, '#3a9a48', '#2a7a38')
        t.rect(cx - 6, cy + 9, cx + 6, cy + 10, '#56c8ee')
    elif nome == 'papel':
        t.rect(cx - 6, cy - 6, cx + 6, cy + 8, '#ffffff')
        for y in range(cy - 3, cy + 8, 4):
            t.rect(cx - 4, y, cx + 4, y, '#6a7aa8')
        t.rect(cx + 3, cy - 6, cx + 6, cy - 3, '#e8d8b0')
    else:
        for ang in range(0, 360, 45):
            x = cx + round(math.cos(math.radians(ang)) * 6)
            y = cy + round(math.sin(math.radians(ang)) * 6)
            t.line(cx, cy, x, y, '#ffb84a')
        t.rect(cx - 1, cy - 1, cx + 1, cy + 1, '#ffffff')
    return outline(t.im)


def cartas():
    return [carta(-1)] + [carta(i) for i in range(len(SIMPATIAS))]


def exportar(add):
    return {
        'fundo': add('janela-ceu-fundo', fundo()),
        'nuvens': add('janela-ceu-nuvens', nuvens()),
        'chamines': [list(p) for p in CHAMINES], 'janelasAcesas': [list(p) for p in JANELAS], 'lampioes': [list(p) for p in LAMPIOES],
        'foguete': add('janela-ceu-foguete', [foguete(0), foguete(1)]),
        'cartas': {**add('janela-ceu-cartas', cartas()), 'ids': SIMPATIAS},
        'chao': CHAO_Y, 'caixa': list(CAIXA), 'mesa': list(MESA), 'w': W, 'h': H,
    }
