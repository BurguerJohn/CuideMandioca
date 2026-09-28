"""Peças de cenário que a festa ganha a cada convidado novo: marcos do fundo, bichos, céu e enfeites.

Os marcos do fundo saem com a tinta de distância (ficam atrás da plateia); bichos e enfeites do céu saem
com cor cheia. Cada função devolve uma lista de quadros.
"""

import math

from render import outline, sprite, tint
from scene import BACK_TINT, Layer

import animar

FAR = 0.2


def far(image):
    return tint(outline(image), BACK_TINT, FAR)


def frond(layer, points, light='G', dark='g', rib=None):
    """Folha comprida: a linha do meio e uma sombra embaixo, para ter volume."""
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        layer.line(x0, y0 + 1, x1, y1 + 1, dark)
        layer.line(x0, y0, x1, y1, light)
        if rib:
            layer.line(x0, y0, x1, y1, rib)


def milharal():
    layer = Layer(15, 28)
    for x, height, cob in ((3, 21, False), (7, 27, True), (11, 19, False)):
        top = 28 - height
        layer.rect(x, top + 3, x, 27, 'G')
        layer.rect(x + 1, top + 3, x + 1, 27, 'g')
        layer.grid(['.y.', 'yoY', '.y.'], x - 1, top)
        for index, y in enumerate(range(top + 6, 26, 5)):
            if index % 2:
                layer.line(x - 1, y, x - 4, y + 3, 'G')
            else:
                layer.line(x + 2, y, x + 5, y + 3, 'G')
        if cob:
            layer.grid(['A.', 'AA', 'Aa', 'aa', 'G.'], x + 2, top + 10)
    return [far(layer.image)]


def bananeira():
    layer = Layer(26, 32)
    layer.rect(11, 13, 13, 31, 'g')
    layer.rect(11, 13, 11, 31, 'G')
    layer.rect(13, 13, 13, 31, 'v')
    for y in (18, 23, 28):
        layer.put(12, y, 'T')
    for points in (((12, 12), (6, 8), (1, 11), (0, 15)), ((12, 12), (8, 5), (5, 1)), ((12, 12), (15, 4), (18, 0)),
                   ((12, 12), (19, 7), (24, 10), (25, 14)), ((13, 13), (19, 14), (22, 18))):
        frond(layer, points)
    layer.grid(['.AA.', 'AAAa', 'AAa.', '.a..'], 14, 15)
    layer.grid(['PP', 'iP', '.i'], 15, 19)
    return [far(layer.image)]


def mandacaru():
    layer = Layer(15, 26)
    layer.rect(6, 3, 8, 25, 'g')
    layer.rect(6, 3, 6, 25, 'G')
    layer.rect(8, 3, 8, 25, 'v')
    layer.rect(7, 2, 7, 2, 'g')
    layer.rect(2, 7, 4, 14, 'g')
    layer.rect(2, 7, 2, 14, 'G')
    layer.rect(3, 6, 3, 6, 'g')
    layer.rect(4, 13, 6, 14, 'g')
    layer.rect(10, 10, 12, 18, 'g')
    layer.rect(12, 10, 12, 18, 'v')
    layer.rect(11, 9, 11, 9, 'g')
    layer.rect(8, 16, 10, 17, 'g')
    for x, y in ((7, 6), (7, 11), (7, 17), (7, 22), (3, 10), (11, 14)):
        layer.put(x, y, 'X')
    layer.grid(['.X.', 'XFX'], 6, 0)
    return [far(layer.image)]


def casinha(walls='x', shade='T', roof='R', roof_dark='r'):
    layer = Layer(30, 24)
    layer.rect(21, 1, 23, 7, 'U')
    layer.rect(21, 1, 23, 1, 'u')
    for y in range(3, 10):
        half = 5 + round((y - 3) * 1.6)
        layer.rect(max(0, 15 - half), y, min(29, 14 + half), y, roof if y % 2 else roof_dark)
    layer.rect(2, 10, 27, 23, walls)
    layer.rect(27, 10, 27, 23, shade)
    layer.rect(2, 22, 27, 23, shade)
    layer.rect(2, 10, 27, 10, roof_dark)
    layer.rect(5, 15, 9, 23, 'D')
    layer.rect(5, 15, 5, 23, 'd')
    layer.put(8, 19, 'A')
    layer.rect(16, 13, 23, 18, '0')
    layer.rect(17, 14, 22, 17, 'F')
    layer.rect(19, 14, 20, 17, 'd')
    layer.rect(17, 15, 22, 15, 'd')
    layer.put(17, 14, 'z')
    return [far(layer.image)]


def coqueiro():
    layer = Layer(28, 44)
    for y in range(12, 44):
        x = 13 + round(3 * ((43 - y) / 31) ** 2)
        layer.put(x, y, 'l')
        layer.put(x + 1, y, 'D')
        if y % 3 == 0:
            layer.put(x, y, 'D')
    for points in (((16, 11), (10, 8), (4, 11), (2, 15)), ((16, 11), (12, 4), (7, 2)), ((16, 11), (19, 3), (22, 1)),
                   ((16, 11), (23, 7), (27, 12)), ((16, 11), (22, 13), (24, 18)), ((16, 11), (11, 14), (8, 19))):
        frond(layer, points)
    layer.grid(['UU', 'uU'], 14, 12)
    layer.grid(['UU', 'uu'], 17, 13)
    return [far(layer.image)]


def igrejinha():
    frames = []
    for swing in (0, 1):
        layer = Layer(32, 48)
        for y in range(18, 25):
            half = 4 + (y - 18) * 2
            layer.rect(max(0, 16 - half), y, min(31, 15 + half), y, 'R' if y % 2 else 'r')
        layer.rect(3, 25, 28, 47, 'X')
        layer.rect(28, 25, 28, 47, 'x')
        for y in range(3, 9):
            half = (y - 3) + 1
            layer.rect(16 - half, y, 15 + half, y, 'R' if y % 2 else 'r')
        layer.rect(11, 9, 20, 36, 'X')
        layer.rect(20, 9, 20, 36, 'x')
        layer.rect(13, 11, 18, 15, '1')
        layer.grid(['AA', 'Aa', 'aa'], 15 - swing, 12)
        layer.rect(15, 0, 16, 3, 'A')
        layer.rect(14, 1, 17, 1, 'A')
        layer.grid(['.JJ.', 'JbbJ', 'JbbJ', '.JJ.'], 14, 18)
        layer.rect(13, 30, 18, 36, 'D')
        layer.put(13, 30, 'X')
        layer.put(18, 30, 'X')
        layer.rect(15, 31, 16, 36, 'd')
        for x in (5, 24):
            layer.rect(x, 30, x + 2, 36, 'F')
            layer.put(x, 30, 'X')
            layer.put(x + 2, 30, 'X')
        layer.rect(3, 45, 28, 47, 'x')
        frames.append(far(layer.image))
    return frames


def catavento():
    frames = []
    for step in range(4):
        layer = Layer(24, 42)
        for x0, x1 in ((6, 11), (18, 13)):
            layer.line(x0, 41, x1, 13, 's')
        for y in range(18, 41, 6):
            t = (y - 13) / 28
            left, right = round(11 - 5 * t), round(13 + 5 * t)
            layer.line(left, y, right, y - 5, 'S')
        layer.rect(10, 11, 14, 13, 'D')
        layer.grid(['RRR', 'RR.', 'R..'], 17, 7)
        for blade in range(8):
            a = math.radians(blade * 45 + step * 11.25)
            layer.line(12, 8, 12 + 8 * math.cos(a), 8 + 8 * math.sin(a), 'X' if blade % 2 else 'R')
        layer.rect(11, 7, 13, 9, 'd')
        frames.append(far(layer.image))
    return frames


GALINHA = {
    'passo-a': ['.....R..', '....RXX.', '....XeXA', '.XX.XXX.', 'XXXXXXx.', '.XXXXx..', '..xxx...', '..K.K...'],
    'passo-b': ['.....R..', '....RXX.', '....XeXA', '.XX.XXX.', 'XXXXXXx.', '.XXXXx..', '..xxx...', '...KK...'],
    'bica-a': ['........', '........', '.XX.....', 'XXXX.R..', 'XXXXXXX.', '.XXXXeXA', '..xxx...', '..K.K...'],
    'bica-b': ['........', '........', '.XX.....', 'XXXX....', 'XXXXX.R.', '.XXXXXX.', '..xxxXeA', '..K.K...'],
}


def galinha():
    return [outline(sprite('\n'.join(GALINHA[pose]))) for pose in ('passo-a', 'passo-b', 'bica-a', 'bica-b')]


def pintinho():
    return [outline(sprite('\n'.join(rows))) for rows in (['.AA.', 'AeAK', 'AAA.', '.k..'], ['.AA.', 'AeAK', 'AAA.', '..k.'],
                                                          ['....', '.AA.', 'AAeK', '.k..'])]


GATO = [
    ['.K..K.......', '.KKKK..kk...', 'KkkKKKKKKK..', 'KKKKKKKkKKk.', '.KKkKKKKKKKK', '..kkkkkkkkk.'],
    ['.K..K.......', '.KKKK.......', 'KkkKKKKKKk..', 'KKKKKKKkKKkk', '.KKkKKKKKKKK', '..kkkkkkkkk.'],
]


def gato():
    return [animar.place(animar.blank(14, 9), outline(sprite('\n'.join(rows))), 0, 1 - index)
            for index, rows in enumerate(GATO)]


BODE = {
    'passo-a': ['.........S.S..', '.........SXX..', '..........XeXx', 'XXXXXXXXXXXXXx', 'XXXXXXXXXXXx..',
                'xXXXXXXXXXx.x.', '.xXxxxxxXx....', '.d.d...d.d....', '.d.d...d.d....'],
    'passo-b': ['.........S.S..', '.........SXX..', '..........XeXx', 'XXXXXXXXXXXXXx', 'XXXXXXXXXXXx..',
                'xXXXXXXXXXx.x.', '.xXxxxxxXx....', '..dd....dd....', '..dd....dd....'],
    'pasta-a': ['..............', '..............', '..........S.S.', 'XXXXXXXXXXSXX.', 'XXXXXXXXXXXXeX',
                'xXXXXXXXXXXXXx', '.xXxxxxxXx.xG.', '.d.d...d.d.GgG', '.d.d...d.d....'],
    'pasta-b': ['..............', '..............', '..........S.S.', 'XXXXXXXXXXSXX.', 'XXXXXXXXXXXXeX',
                'xXXXXXXXXXXXXx', '.xXxxxxxXx..xG', '.d.d...d.d..Gg', '.d.d...d.d....'],
}


def bode():
    return [outline(sprite('\n'.join(BODE[pose]))) for pose in ('passo-a', 'passo-b', 'pasta-a', 'pasta-b')]


def pipa():
    frames = []
    for step in range(3):
        layer = Layer(13, 22)
        colors = {(0, 0): 'R', (1, 0): 'A', (0, 1): 'J', (1, 1): 'G'}
        for y in range(9):
            half = y if y <= 4 else 8 - y
            for x in range(6 - half, 7 + half):
                layer.put(x, y, colors[(int(x > 6), int(y > 4))])
        layer.line(6, 0, 6, 8, 'X')
        layer.line(2, 4, 10, 4, 'X')
        for index, y in enumerate(range(9, 22)):
            x = 6 + round(1.6 * math.sin(step * 2.1 + index * 0.7))
            layer.put(x, y, 'x')
            if index % 4 == 2:
                layer.grid(['H.H', '.H.'], x - 1, y)
        frames.append(outline(layer.image))
    return frames


def lua():
    layer = Layer(15, 15)
    for y in range(15):
        for x in range(15):
            if (x - 7) ** 2 + (y - 7) ** 2 <= 49:
                layer.put(x, y, 'F')
    for x, y in ((4, 4), (10, 9), (5, 10), (11, 4)):
        layer.put(x, y, 'f')
    layer.grid(['zz', 'z.'], 3, 2)
    layer.grid(['o.o', '...', '.o.'], 6, 6)
    return [outline(layer.image)]


def balao():
    frames = []
    widths = [4, 8, 10, 12, 12, 12, 10, 10, 8, 6, 4]
    stripes = 'RAGJHK'
    for flame in range(2):
        layer = Layer(12, 16)
        for y, w in enumerate(widths):
            left = 6 - w // 2
            for x in range(left, left + w):
                layer.put(x, y, stripes[(x // 2) % len(stripes)] if y % 5 else 'X')
        layer.rect(4, 11, 7, 11, 'd')
        layer.grid(['.F.', 'FqF'] if flame else ['.q.', '.F.'], 4, 12)
        frames.append(outline(layer.image))
    return frames


def mandioquinha():
    rows = ['..u..', '.343.', '43332', '4e3e2', '43c32', '.332.', '.32..', '..2..']
    tip = ['..u..', '.343.', '43332', '4e3e2', '43c32', '.332.', '..32.', '...2.']
    return [outline(sprite('\n'.join(r))) for r in (rows, tip)]


def export(add):
    """Registra as folhas do cenário no manifesto, com o tipo de camada de cada peça."""
    sheets = {
        'milharal': (milharal(), 0), 'bananeira': (bananeira(), 0), 'mandacaru': (mandacaru(), 0),
        'casinha': (casinha(), 0), 'casinha-azul': (casinha('b', 'J', 'K', 'k'), 0), 'coqueiro': (coqueiro(), 0),
        'igrejinha': (igrejinha(), 1), 'catavento': (catavento(), 6), 'galinha': (galinha(), 6),
        'pintinho': (pintinho(), 6), 'gato': (gato(), 1), 'bode': (bode(), 4), 'pipa': (pipa(), 4), 'lua': (lua(), 0),
        'balao': (balao(), 5), 'mandioquinha': (mandioquinha(), 2),
    }
    return {name: add(f'cenario-{name}', frames, fps=fps) for name, (frames, fps) in sheets.items()}
