"""Céu de São João: o céu à noite com a silhueta do arraial (casas, igrejinha, árvores), a caixa dos foguetes, a mesinha da simpatia
e as cartas (o verso e uma face para cada simpatia).
"""

import math
import random

import janelas
from casa import Tela, rgb
from render import outline

W, H = 176, 120
CHAO_Y = 92                          # onde o céu acaba e a silhueta começa
CAIXA = (62, 98, 114, 119)           # a caixa dos foguetes (x0, y0, x1, y1)
MESA = (4, 96, 40, 119)              # a mesinha da simpatia
SIMPATIAS = ['faca', 'alianca', 'ovo', 'agulha', 'milho', 'fogueira', 'cebola', 'banho', 'papel', 'estalinho']


def fundo():
    t = Tela(W, H)
    janelas.degrade(t, 0, 0, W - 1, CHAO_Y, ['#080618', '#0c0a22', '#120e2e', '#1a1440', '#241a50', '#2e2060', '#3c2870', '#4e3280', '#663c82', '#84487e'])
    janelas.estrelas(t, 1, 1, W - 1, 70, 60, 33)
    # Lua cheia no canto.
    t.rect(146, 8, 156, 18, '#fff3c4')
    t.rect(145, 9, 157, 17, '#fff3c4')
    t.rect(147, 7, 155, 19, '#fff3c4')
    t.rect(149, 11, 151, 13, '#e8d596')
    t.rect(152, 14, 153, 15, '#e8d596')
    # Silhueta do arraial: casinhas, a igrejinha com cruz, árvores e palmeiras.
    escuro, medio = '#0e0a1c', '#160f28'
    t.rect(0, CHAO_Y, W - 1, H - 1, escuro)
    casas = [(2, 12, 16), (20, 14, 12), (36, 10, 14), (52, 13, 15), (92, 12, 16), (110, 10, 14), (148, 13, 13), (164, 11, 12)]
    gerador = random.Random(5)
    for x, largura, altura in casas:
        topo = CHAO_Y - altura
        t.rect(x, topo, x + largura, CHAO_Y + 4, medio)
        for k in range(largura // 2):
            t.rect(x - 1 + k, topo - 1 - k, x + largura + 1 - k, topo - 1 - k, escuro)
        for _ in range(2):
            jx, jy = x + 2 + gerador.randrange(max(1, largura - 5)), topo + 2 + gerador.randrange(max(1, altura - 5))
            t.rect(jx, jy, jx + 1, jy + 1, '#ffd860')
    # Igrejinha.
    t.rect(122, CHAO_Y - 22, 134, CHAO_Y + 4, medio)
    t.rect(126, CHAO_Y - 34, 130, CHAO_Y - 22, medio)
    for k in range(5):
        t.rect(125 + k, CHAO_Y - 40 + k, 131 - k, CHAO_Y - 40 + k, escuro)
    t.rect(127, CHAO_Y - 46, 129, CHAO_Y - 40, escuro)
    t.rect(126, CHAO_Y - 44, 130, CHAO_Y - 43, escuro)
    t.rect(127, CHAO_Y - 30, 129, CHAO_Y - 27, '#ffd860')
    t.rect(126, CHAO_Y - 14, 130, CHAO_Y - 6, '#ffd860')
    # Árvores e palmeiras.
    for cx, raio in ((46, 7), (84, 8), (142, 7), (172, 6)):
        janelas.elipse(t, cx, CHAO_Y - 8, raio, raio * 0.9, '#0a1420')
        t.rect(cx - 1, CHAO_Y - 3, cx, CHAO_Y + 4, '#0a0a14')
    t.rect(100, CHAO_Y - 20, 101, CHAO_Y + 4, '#0a0a14')
    for dx, dy in ((-7, 3), (-4, -1), (0, -4), (4, -1), (7, 3)):
        t.line(100, CHAO_Y - 20, 100 + dx, CHAO_Y - 20 + dy, '#0a1420')
    # Varal de bandeirinhas entre os telhados.
    janelas.varal(t, 4, 170, CHAO_Y - 14, CHAO_Y - 2, 7)
    # Chão da praça.
    t.rect(0, CHAO_Y + 4, W - 1, H - 1, '#140c24')
    janelas.ruido(t, 0, CHAO_Y + 6, W - 1, H - 1, 60, 9, ['#1c1432', '#0c0818'])
    # Caixa dos foguetes: madeira com seis encaixes.
    x0, y0, x1, y1 = CAIXA
    t.rect(x0, y0, x1, y1, '#6e3c1c')
    t.rect(x0 + 1, y0 + 1, x1 - 1, y1, '#8a5a34')
    t.rect(x0, y0, x1, y0, '#b07a48')
    for k in range(6):
        t.rect(x0 + 4 + k * 8, y0 + 3, x0 + 8 + k * 8, y0 + 8, '#3a2418')
    # Mesinha da simpatia: toalha vermelha, vela e as cartas em leque.
    x0, y0, x1, y1 = MESA
    t.rect(x0, y0 + 8, x1, y1, '#a82838')
    t.rect(x0, y0 + 8, x1, y0 + 9, '#d8485a')
    for x in range(x0 + 2, x1, 5):
        t.rect(x, y0 + 12, x + 1, y1, '#8a1c2c')
    t.rect(x0 + 2, y0 + 3, x0 + 4, y0 + 8, '#f4f4ec')
    for k in range(3):
        t.rect(x0 + 10 + k * 5, y0 + 3 - k % 2, x0 + 14 + k * 5, y0 + 8, '#f4e4c0')
        t.rect(x0 + 10 + k * 5, y0 + 3 - k % 2, x0 + 14 + k * 5, y0 + 3 - k % 2, '#ffd21e')
    return t.im


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
        'foguete': add('janela-ceu-foguete', [foguete(0), foguete(1)]),
        'cartas': {**add('janela-ceu-cartas', cartas()), 'ids': SIMPATIAS},
        'chao': CHAO_Y, 'caixa': list(CAIXA), 'mesa': list(MESA), 'w': W, 'h': H,
    }
