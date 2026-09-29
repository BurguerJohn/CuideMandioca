"""Peças de cenário que a festa ganha a cada convidado novo: marcos do fundo, bichos, céu e enfeites.

Os marcos do fundo saem com a tinta de distância (ficam atrás da plateia); bichos e enfeites do céu saem
com cor cheia. Cada função devolve uma lista de quadros.
"""

import math

from PIL import Image

from render import outline, sprite, tint
from scene import BACK_TINT, Layer

import animar
import sprites

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


# --- Marcos das festas bem grandes (depois dos 78 convidados) ---------------------------------

CAVALINHO = ['......XX', '.....XeX', 'XXXXXXX.', 'X{s}XX..', '.X..X...', 'X....X..']


def carrossel():
    """Carrossel: o toldo listrado gira e os cavalinhos sobem e descem em volta do mastro."""
    frames = []
    for step in range(8):
        layer = Layer(40, 38)
        layer.line(20, 0, 20, 4, 'd')
        layer.grid(['RR', 'R.'], 21, 0)
        for y in range(5, 14):
            half = 3 + (y - 5) * 2
            for x in range(20 - half, 20 + half + 1):
                band = int(((x - 20) / (half + 1) + 1) * 4 + step / 2) % 2
                layer.put(x, y, 'R' if band else 'X')
        for x in range(1, 40):
            layer.put(x, 14, 'A' if (x + step) % 4 == 0 else 'r')
            if x % 3 != 1:
                layer.put(x, 15, 'r')
        for x in (3, 36):
            layer.rect(x, 16, x, 33, 'l')
        layer.rect(19, 13, 20, 33, 'S')
        # Cavalinhos da frente: andam da esquerda para a direita (a volta do carrossel) e sobem e descem.
        for k, saddle in enumerate('JHG'):
            phase = (step / 8 + k / 3) % 1
            x = 5 + round(phase * 26)
            bob = round(2 * math.sin((phase * 3 + k) * math.pi))
            layer.line(x + 4, 16, x + 4, 22 + bob, 'S')
            layer.grid([row.replace('{s}', saddle * 3) for row in CAVALINHO], x, 22 + bob)
        layer.rect(2, 33, 37, 34, 'D')
        layer.rect(2, 33, 37, 33, 'l')
        layer.rect(3, 35, 36, 35, 'd')
        for x in range(4, 36, 4):
            layer.put(x, 34, 'A' if (x // 4 + step) % 2 else 'F')
        frames.append(far(layer.image))
    return frames


def pote():
    """Quebra-pote: pote de barro com as tiras de papel crepom penduradas no pescoço; três quadros, inteiro e cada vez mais trincado."""
    frames = []
    for crack in range(3):
        layer = Layer(16, 19)
        cx = 8
        # Bojo redondo com luz na esquerda e sombra na direita.
        for y in range(7, 18):
            t = (y - 12.5) / 5.5
            half = int(7.4 * math.sqrt(max(0.0, 1 - t * t)))
            for x in range(cx - half, cx + half + 1):
                u = (x - cx) / max(1, half)
                char = 'T' if u < -0.45 else 'l' if u < 0.4 else 'D'
                if y >= 16 and u > -0.2:
                    char = 'D'
                layer.put(x, y, char)
        # Pescoço e boca do pote.
        layer.rect(5, 4, 10, 6, 'l')
        layer.rect(5, 4, 6, 6, 'T')
        layer.rect(10, 4, 10, 6, 'D')
        layer.rect(4, 2, 11, 3, 'D')
        layer.rect(4, 2, 9, 2, 'T')
        # Tiras de papel crepom penduradas em volta do pescoço, cada uma de uma cor.
        colors = 'HJAGHJAGHJAG'
        for k, x in enumerate(range(3, 14)):
            length = 4 + (k * 5) % 4
            for y in range(6, 6 + length):
                layer.put(x, y, colors[k])
        # Rachaduras.
        if crack >= 1:
            layer.line(9, 9, 7, 13, 'd')
            layer.line(7, 13, 9, 16, 'd')
        if crack >= 2:
            layer.line(11, 11, 12, 15, 'd')
            layer.line(5, 12, 4, 15, 'd')
            layer.put(8, 12, '1')
        # Argola da corda.
        layer.grid(['.xx.', 'x..x'], 6, 0)
        frames.append(outline(layer.image))
    return frames


# Vira-lata caramelo, de perfil olhando para a direita. Cores: l caramelo, O caramelo claro, D orelha e sombra, X peito
# branco, e olho e nariz, n língua.
CABECA = [
    '..DD....',
    '.DllOl..',
    '.DlelOO.',
    '.DllOOOe',
    '..lXXXn.',
]
CABECA_DORME = [
    '..DD....',
    '.DllOl..',
    '.DlDlOO.',
    '.DllOOOe',
    '..lXXX..',
]


def caramelo():
    """Vira-lata caramelo: anda (4 quadros, rabo abanando), senta abanando o rabo (2) e dorme enrolado (2)."""
    frames = []
    # Andando: corpo comprido, rabo para cima, quatro pernas alternando.
    for step in range(4):
        layer = Layer(18, 13)
        bob = (0, 1, 0, 1)[step]
        top = 4 + bob
        # Corpo.
        layer.rect(3, top + 1, 12, top + 4, 'l')
        layer.rect(4, top + 1, 11, top + 1, 'O')
        layer.rect(4, top + 4, 11, top + 4, 'D')
        layer.rect(10, top + 2, 12, top + 4, 'X')
        # Rabo em pé, abanando.
        wag = (0, 1, 0, -1)[step]
        layer.line(3, top + 1, 1 + wag, top - 2, 'l')
        layer.put(1 + wag, top - 3, 'O')
        # Cabeça.
        layer.grid(CABECA if step % 2 else CABECA[:4] + ['..lXXX..'], 10, top - 4)
        # Pernas: dianteiras e traseiras alternando.
        legs = [(4, 0), (6, 0), (10, 0), (12, 0)] if step % 2 == 0 else [(3, 0), (7, 0), (9, 0), (12, 0)]
        for x, _ in legs:
            layer.rect(x, top + 5, x, 11, 'l')
            layer.put(x, 12, 'O')
        frames.append(outline(layer.image))
    # Sentado, abanando o rabo no chão.
    for wag in range(2):
        layer = Layer(18, 13)
        layer.grid(CABECA, 8, 1)
        layer.rect(5, 5, 10, 10, 'l')
        layer.rect(8, 5, 10, 9, 'X')
        layer.rect(5, 10, 11, 11, 'l')
        layer.rect(4, 8, 6, 11, 'D')
        layer.rect(9, 10, 9, 12, 'l')
        layer.rect(11, 10, 11, 12, 'l')
        layer.put(9, 12, 'O')
        layer.put(11, 12, 'O')
        layer.line(4, 11, 1, 12 - wag, 'l')
        layer.put(1, 12 - wag, 'O')
        frames.append(outline(layer.image))
    # Dormindo enrolado, a cabeça deitada na ponta e o rabo em volta (a barriga sobe e desce).
    sono = ['....lllllll.......',
            '..llOOOOOOll..D...',
            '.lOlllllllllDDlO..',
            '.llllllllllDlllOO.',
            '.llllllllllDlDDlOe',
            '.OlllllllllDlXXXX.',
            '..OOOllllllllll...']
    for breath in range(2):
        layer = Layer(18, 13)
        rows = list(sono)
        if breath:
            rows[0] = '.....lllll........'
        layer.grid(rows, 0, 6)
        frames.append(outline(layer.image))
    return frames


def pombo():
    """Pombo-correio gordinho voando para a direita com a cartinha no bico: quatro quadros de asa (alto, meio, baixo,
    meio). Cinza, pescoço furta-cor, peito rosado."""
    frames = []
    for index in range(4):
        layer = Layer(19, 14)
        bob = (0, 1, 2, 1)[index]
        oy = 2 + bob
        # Rabo em leque.
        for y, (x0, x1) in enumerate(((0, 2), (0, 3), (1, 3))):
            layer.rect(x0, oy + 5 + y, x1, oy + 5 + y, 's')
        # Corpo redondinho: cinza em cima, rosado no peito, mais escuro embaixo.
        for y, (x0, x1) in enumerate(((5, 9), (3, 11), (2, 12), (2, 12), (3, 11), (5, 9))):
            for x in range(x0, x1 + 1):
                char = 'S'
                if y >= 4:
                    char = 's'
                elif y >= 2 and x >= 9:
                    char = 'p'
                layer.put(x, oy + 3 + y, char)
        # Cabeça com pescoço furta-cor, olho e bico, e a cartinha com coração no bico.
        layer.rect(11, oy + 1, 13, oy + 1, 'S')
        layer.rect(10, oy + 2, 14, oy + 3, 'S')
        layer.rect(10, oy + 4, 12, oy + 4, 'G')
        layer.put(11, oy + 4, 'P')
        layer.put(13, oy + 2, 'e')
        layer.put(15, oy + 3, 'A')
        layer.rect(16, oy + 2, 18, oy + 4, 'X')
        layer.put(17, oy + 3, 'H')
        # Asa: lá em cima, aberta de lado ou lá embaixo.
        if index == 0:
            for k, (x, y) in enumerate(((8, 3), (7, 2), (6, 1), (5, 0), (4, 0))):
                layer.rect(x - 2, oy + y - 2, x, oy + y - 1 + (k == 0), 'S')
            layer.line(3, oy - 2, 7, oy + 1, 's')
        elif index == 2:
            layer.rect(5, oy + 8, 8, oy + 9, 'S')
            layer.rect(6, oy + 10, 7, oy + 10, 's')
        else:
            layer.rect(3, oy + 4, 9, oy + 4, 's')
            layer.rect(4, oy + 5, 8, oy + 5, 'S')
        frames.append(outline(layer.image))
    return frames


def trem():
    """Trem da alegria: a locomotiva vermelha com chaminé e dois vagões abertos cheios de criança de chapéu de palha,
    andando para a direita. Dois quadros (os raios das rodas giram e as crianças balançam)."""
    frames = []
    for step in range(2):
        layer = Layer(58, 20)
        # Vagões (atrás, à esquerda): caixa aberta com listra e as cabeças das crianças.
        for vx, body, trim in ((0, 'J', 'b'), (19, 'G', 'g')):
            layer.rect(vx + 1, 10, vx + 16, 15, body)
            layer.rect(vx + 1, 10, vx + 16, 10, trim)
            layer.rect(vx + 1, 13, vx + 16, 13, 'A')
            for k, hx in enumerate((vx + 3, vx + 8, vx + 13)):
                bob = (k + step) % 2
                layer.rect(hx, 6 + bob, hx + 2, 9 + bob, '6')
                layer.put(hx, 7 + bob, 'e')
                layer.put(hx + 2, 7 + bob, 'e')
                layer.rect(hx - 1, 5 + bob, hx + 3, 5 + bob, 'Y')
                layer.rect(hx, 4 + bob, hx + 2, 4 + bob, 'y')
            # Engate entre os vagões.
            layer.rect(vx + 17, 13, vx + 18, 13, 's')
        # Locomotiva: cabine, caldeira, chaminé, farol e o limpa-trilhos.
        lx = 38
        layer.rect(lx, 5, lx + 7, 15, 'R')
        layer.rect(lx + 1, 6, lx + 6, 9, 'b')
        layer.rect(lx, 4, lx + 8, 4, 'r')
        layer.rect(lx + 8, 9, lx + 17, 15, 'R')
        layer.rect(lx + 8, 9, lx + 17, 9, 'A')
        layer.rect(lx + 8, 12, lx + 17, 12, 'A')
        layer.rect(lx + 13, 4, lx + 15, 8, 'e')
        layer.rect(lx + 12, 3, lx + 16, 3, 'e')
        layer.put(lx + 18, 11, 'F')
        layer.line(lx + 17, 15, lx + 19, 17, 's')
        # Rodas com raios que giram.
        for wx in (4, 13, 23, 32, 41, 48, 54):
            for a in range(0, 360, 20):
                r = math.radians(a)
                layer.put(wx + 2.4 * math.cos(r), 17 + 2.4 * math.sin(r), 'd')
            spoke = math.radians(45 * step)
            layer.line(wx - 1.6 * math.cos(spoke), 17 - 1.6 * math.sin(spoke), wx + 1.6 * math.cos(spoke), 17 + 1.6 * math.sin(spoke), 'S')
            layer.put(wx, 17, 'S')
        frames.append(outline(layer.image))
    return frames


def sapo():
    """Sapinho verde de perfil (olhando para a direita): sentado (dois quadros, a papada infla) e no pulo."""
    sentado = ['...GG.GG..',
               '..GeGGeG..',
               '.GGGGGGGG.',
               'gGGGGGGGGm',
               'gGGXXXXGG.',
               '.gg....gg.']
    papada = ['...GG.GG..',
              '..GeGGeG..',
              '.GGGGGGGG.',
              'gGGGGGGGGm',
              'gGXXXXXXG.',
              '.gg....gg.']
    pulo = ['...GG.GG...',
            '..GeGGeGG..',
            '.GGGGGGGGGm',
            'gGGXXXXGG..',
            'g.g.....g..',
            'g........g.']
    frames = []
    for rows in (sentado, papada, pulo):
        layer = Layer(12, 7)
        layer.grid(rows, 0, 7 - len(rows))
        frames.append(outline(layer.image))
    return frames


def balao_ouro():
    """Balão de sorte: gomos dourados com brilho, a cestinha e a chama do maçarico em três quadros."""
    widths = [6, 10, 12, 14, 14, 14, 14, 12, 12, 10, 8, 6]
    frames = []
    for flame in range(3):
        layer = Layer(16, 26)
        for y, w in enumerate(widths):
            left = 8 - w // 2
            for x in range(left, left + w):
                gomo = (x - left) * 4 // w
                char = 'F' if gomo % 2 == 0 else 'A'
                if x - left >= w - 2:
                    char = 'a'
                if y == 1 and x - left in (2, 3):
                    char = 'z'
                if y in (5, 6):
                    char = 'O' if gomo % 2 == 0 else 'A'
                layer.put(x, y, char)
        layer.put(4, 3, 'z')
        layer.put(4, 4, 'z')
        layer.line(6, 12, 6, 15, 'd')
        layer.line(9, 12, 9, 15, 'd')
        layer.grid([['.q.', '.F.'], ['.F.', 'qFq'], ['.F.', '.q.']][flame], 6, 13)
        layer.rect(5, 17, 10, 21, 'D')
        layer.rect(5, 17, 10, 17, 'l')
        layer.rect(6, 20, 9, 20, 'd')
        frames.append(outline(layer.image))
    return frames


def balao_grande():
    """Balão de ar quente amarrado: gomos coloridos, a cesta e a chama do maçarico piscando."""
    widths = [8, 12, 16, 18, 20, 22, 22, 22, 22, 22, 20, 20, 18, 16, 14, 12, 10, 8]
    colors = 'RAJGHK'
    frames = []
    for flame in range(2):
        layer = Layer(24, 32)
        for y, w in enumerate(widths):
            left = 12 - w // 2
            for x in range(left, left + w):
                gomo = int((x - 12) / (w / 2 + 0.01) * 3 + 3)
                char = colors[gomo % len(colors)]
                if y in (6, 7):
                    char = 'X'
                layer.put(x, y, char)
        for x0, x1 in ((8, 10), (15, 13)):
            layer.line(x0, 18, x1, 23, 'd')
        layer.grid(['.q.', 'qFq'] if flame else ['.F.', 'FzF'], 10, 18)
        layer.rect(9, 24, 14, 27, 'D')
        layer.rect(9, 24, 14, 24, 'l')
        layer.rect(10, 26, 13, 26, 'd')
        frames.append(outline(layer.image))
    return frames


def boi():
    """Bumba-meu-boi: a saia de chita cheia de lantejoulas, chifres, fitas que balançam e o brincante por baixo."""
    frames = []
    sequins = 'RAJGHK'
    for step in range(4):
        layer = Layer(26, 22)
        bob = (0, -1, 0, -1)[step]
        nod = (0, 1, 0, -1)[step]
        top = 6 + bob
        # Corpo (a saia de veludo escuro): uma elipse larga, bordada de lantejoulas coloridas.
        for y in range(top, top + 9):
            t = (y - top) / 8
            half = round(10 * math.sqrt(max(0.0, 1 - (2 * t - 1) ** 2 * 0.6)))
            for x in range(11 - half, 12 + half):
                char = 'i' if (x + y * 2) % 4 else sequins[(x * 7 + y * 3 + step) % len(sequins)]
                if y == top + 4 and (x + step) % 2 == 0:
                    char = 'A'
                layer.put(x, y, char)
        # Franja da barra: listra dourada que ondula com o passo.
        for x in range(2, 21):
            layer.put(x, top + 9 + ((x + step) % 2), 'A' if x % 2 else 'X')
        # Rabo.
        layer.line(0, top + 2, 1, top + 4 + (step % 2), 'd')
        # Cabeça branca com estrela na testa, focinho escuro e chifres curvados para cima.
        hx, hy = 19, top - 4 + nod
        layer.rect(hx, hy + 1, hx + 4, hy + 5, 'X')
        layer.rect(hx + 1, hy + 5, hx + 5, hy + 6, 'X')
        layer.rect(hx + 4, hy + 5, hx + 5, hy + 6, 'L')
        layer.put(hx + 3, hy + 3, 'e')
        layer.put(hx + 2, hy + 1, 'A')
        for side, x0 in ((-1, hx), (1, hx + 4)):
            layer.put(x0 + side, hy, 'x')
            layer.put(x0 + side * 2, hy - 1, 'x')
            layer.put(x0 + side * 2, hy - 2, 'W')
        # Fitas coloridas saindo do pescoço, balançando.
        for k, color in enumerate('RJA'):
            sway = (0, 1, 0, -1)[(step + k) % 4]
            layer.line(hx - 1, hy + 3 + k, hx - 3 + sway, hy + 9 + k, color)
        # Pernas do brincante (passo de dança: uma perna de cada vez).
        base = top + 11
        legs = ((6, 0), (15, 0)) if step % 2 == 0 else ((6, -1), (15, 0)) if step == 1 else ((6, 0), (15, -1))
        for lx, lift in legs:
            layer.rect(lx, base + lift, lx + 1, base + 3 + lift, 'u')
            layer.rect(lx, base + 4 + lift, lx + 2, base + 4 + lift, 'k')
        frames.append(outline(layer.image))
    return frames


# Corrida de saco: a criança de chapéu de palha dentro de um saco de estopa, segurando a boca do saco. A listra do
# saco (R) muda de cor para cada corredor; o chapéu também (as cores de HAT_LOOKS).
SACO_PRONTO = """
....0000....
...0YYYy0...
..0YYYYYo0..
...000000...
...046620...
...0e66e0...
...04mm20...
..04xTTl40..
..0xTTTTl0..
.0xTTTTTTl0.
.0xTTTTTTl0.
.0RRRRRRRR0.
.0xTTTTTTl0.
.0TTTTTTTD0.
.0lTTTTTlD0.
..0DllllD0..
...000000...
"""

SACO_PULO = """
....0000....
...0YYYy0...
..0YYYYYo0..
...000000...
...046620...
...0e66e0...
...04mm20...
..04xTTl40..
..0xTTTTl0..
.0xTTTTTTl0.
.0xTTTTTTl0.
.0RRRRRRRR0.
.0xTTTTTTl0.
.0TTTTTTTD0.
..0TTTTTD0..
...0DllD0...
....0000....
"""

SACO_VENCE = """
.00......00.
0440....0440
.040....040.
..04000040..
...0YYYy0...
..0YYYYYo0..
...000000...
...0c66c0...
...0e66e0...
...0mnnm0...
..0xTTTTl0..
.0xTTTTTTl0.
.0xTTTTTTl0.
.0RRRRRRRR0.
.0xTTTTTTl0.
.0TTTTTTTD0.
.0lTTTTTlD0.
..0DllllD0..
...000000...
"""

# Corredores: (cor da listra, cores do chapéu). O primeiro é o do jogador.
CORREDORES = [('R', {}), ('J', {'Y': 'l', 'y': 'D', 'o': 'd'}), ('g', {'Y': 'b', 'y': 'J', 'o': 'j'})]
SACO_W, SACO_H = 18, 19


def saco():
    """Corrida de saco: quatro poses por corredor (pronto, no pulo, caído de lado e comemorando), três corredores."""
    frames = []
    for stripe, hat in CORREDORES:
        def look(grid):
            rows = grid.strip('\n').split('\n')
            out = []
            for index, row in enumerate(rows):
                row = row.replace('R', stripe)
                if index < 7:
                    row = ''.join(hat.get(c, c) for c in row)
                out.append(row)
            return '\n'.join(out)
        stand = sprite(look(SACO_PRONTO))
        hop = sprite(look(SACO_PULO))
        # Caído: o mesmo corredor tombado para a frente (cabeça para a direita), deitado no chão.
        fallen = sprite(look(SACO_PRONTO)).rotate(-90, expand=True)
        win_rows = SACO_VENCE.strip('\n').split('\n')
        win = sprite(look('\n'.join(win_rows[:3]) + '\n' + '\n'.join(win_rows[3:])))
        for image, x, y in ((stand, 3, SACO_H - 17), (hop, 3, SACO_H - 17), (fallen, 0, SACO_H - 12), (win, 3, 0)):
            frame = Image.new('RGBA', (SACO_W, SACO_H), (0, 0, 0, 0))
            frame.alpha_composite(image, (x, y))
            frames.append(frame)
    return frames


# Leiloeiro: o cavalheiro da quadrilha de chapéu de couro, bigode e gravata-borboleta vermelha, com o martelo de
# madeira na mão direita. Quadros: parado, falando (boca aberta, martelo no alto), falando com a boca fechada e batendo
# o martelo (o braço desce na frente do corpo).
_LEILOEIRO = animar.edit(sprites.CAVALHEIRO, {
    (4, 6): 'd', (7, 6): 'd',
    (5, 8): 'R', (6, 8): 'R',
})
LEILOEIRO = '\n'.join(''.join({'Y': 'l', 'y': 'D', 'o': 'd'}.get(c, c) for c in row) if i < 3 else row
                      for i, row in enumerate(_LEILOEIRO.strip('\n').split('\n')))
LEILOEIRO_FALA = animar.edit(LEILOEIRO, {(5, 6): 'e', (6, 6): 'n'})
MARTELO_ALTO = ['DDd', '.l.', '.l.']
MARTELO_BATE = ['.D.', '.Dl', '.dl']


def leiloeiro():
    frames = []
    alto = ((0, 9), (-1, 8), (-1, 4))
    for grid, pose, extra in (
            (LEILOEIRO, ('baixo', 'baixo', 0, None), [(['DDd', '.l.'], 10, 9)]),
            (LEILOEIRO_FALA, ('baixo', 'alto', -1, None), [(MARTELO_ALTO, 11, 1)]),
            (LEILOEIRO, ('baixo', 'alto', 0, None), [(MARTELO_ALTO, 11, 1)]),
            (LEILOEIRO_FALA, ('baixo', 'palma', 0, None), [(MARTELO_BATE, 6, 7)])):
        frames.append(animar.person(grid, 'xadrez-azul', pose, sleeve='J', extra=extra))
    return frames


def export(add):
    """Registra as folhas do cenário no manifesto, com o tipo de camada de cada peça."""
    sheets = {
        'milharal': (milharal(), 0), 'bananeira': (bananeira(), 0), 'mandacaru': (mandacaru(), 0),
        'casinha': (casinha(), 0), 'casinha-azul': (casinha('b', 'J', 'K', 'k'), 0), 'coqueiro': (coqueiro(), 0),
        'igrejinha': (igrejinha(), 1), 'catavento': (catavento(), 6), 'galinha': (galinha(), 6),
        'pintinho': (pintinho(), 6), 'gato': (gato(), 1), 'bode': (bode(), 4), 'pipa': (pipa(), 4), 'lua': (lua(), 0),
        'balao': (balao(), 5), 'mandioquinha': (mandioquinha(), 2),
        'carrossel': (carrossel(), 6), 'balao-grande': (balao_grande(), 3), 'boi': (boi(), 6),
        'balao-ouro': (balao_ouro(), 8), 'pote': (pote(), 0), 'caramelo': (caramelo(), 0), 'pombo': (pombo(), 11), 'trem': (trem(), 0), 'sapo': (sapo(), 0), 'saco': (saco(), 0), 'leiloeiro': (leiloeiro(), 0),
    }
    return {name: add(f'cenario-{name}', frames, fps=fps) for name, (frames, fps) in sheets.items()}
