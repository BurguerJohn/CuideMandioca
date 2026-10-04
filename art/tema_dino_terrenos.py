"""Terreiros do tema dinossauros, bem criativos: o Sítio de Fósseis (um corte de terra em camadas de sedimento com crânio de T-Rex, costelas, amonite, trilobita, peixe
e ambar com mosquito enterrados, e o canteiro de obras do paleontólogo em cima), a Selva Jurássica (âmbar, ovos e raízes enterrados, cogumelos gigantes, cicas e uma
bandeirinha de São João na mata) e o Ninho de Ovos (palha em camadas, ovo de ouro enterrado e um filhote de chapéu de palha espiando de dentro do ovo)."""

import math

from itens_novos import Grade, elipse
from tema_comum import ret, lin, grosso, poligono, contornar, peca_de
from tema_dino import terreno_proprio, paleta

OSSO = {'w': '#f6efd8', 'b': '#d8cca4', 'k': '#3a2c18', 'D': '#6a4a28', 'a': '#e89a2a', 'A': '#ffd060', 'e': '#fffaf0'}


def cranio_trex():
    """Crânio de T-Rex de perfil, com a órbita, as narinas e a fileira de dentes, enterrado no sedimento."""
    g = Grade(20, 12)
    poligono(g, [(2, 4), (8, 1), (14, 2), (18, 4), (18, 7), (13, 8), (4, 10), (1, 7)], 'w')
    for y in range(g.h):
        for x in range(g.w):
            if g.ler(x, y) == 'w' and (y >= 8 or x <= 3):
                g.pôr(x, y, 'b')
    elipse(g, 9.5, 4.6, 1.9, 2.1, 'k')
    g.pôr(17, 4, 'k')
    ret(g, 7, 7, 17, 7, 'k')
    for x in range(8, 18, 2):
        ret(g, x, 7, x, 8, 'w')
        g.pôr(x, 8, 'e')
    ret(g, 4, 9, 14, 9, 'D')
    return contornar(g, 'D')


def costelas():
    g = Grade(18, 10)
    lin(g, 0, 1, 17, 1, 'w')
    for i in range(5):
        x0 = 2 + i * 3
        for x, y in ((x0, 2), (x0 + 1, 3), (x0 + 1, 4), (x0 + 1, 5), (x0, 6), (x0 - 1, 7)):
            g.pôr(x, y, 'w')
        g.pôr(x0 + 2, 4, 'b')
    return contornar(g, 'D')


def amonite():
    g = Grade(11, 11)
    elipse(g, 5, 5, 5.0, 5.0, 'w')
    elipse(g, 5, 5, 3.6, 3.6, 'b')
    elipse(g, 5, 5, 2.3, 2.3, 'w')
    elipse(g, 5, 5, 1.0, 1.0, 'b')
    for n in range(8):
        a = n * math.pi / 4
        g.pôr(round(5 + math.cos(a) * 4.3), round(5 + math.sin(a) * 4.3), 'D')
    return contornar(g, 'D')


def trilobita():
    g = Grade(12, 8)
    elipse(g, 6, 4, 5.4, 2.8, 'w')
    for x in (4, 6, 8):
        ret(g, x, 2, x, 6, 'b')
    ret(g, 1, 3, 2, 5, 'b')
    for x, y in ((0, 1), (1, 0), (10, 0), (11, 1)):
        g.pôr(x, y, 'D')
    return contornar(g, 'D')


def peixe_fossil():
    g = Grade(16, 9)
    lin(g, 3, 4, 12, 4, 'w')
    for x in (5, 7, 9, 11):
        ret(g, x, 2, x, 6, 'w')
    elipse(g, 2.5, 4, 2.6, 2.6, 'w')
    g.pôr(2, 3, 'k')
    for dy in range(-3, 4):
        g.pôr(13 + abs(dy) // 2 + 1, 4 + dy, 'w')
    ret(g, 6, 0, 8, 1, 'b')
    return contornar(g, 'D')


def ambar():
    """Pedaço de âmbar translúcido com um mosquito preso dentro (como em Jurassic Park)."""
    g = Grade(10, 10)
    elipse(g, 4.5, 4.5, 4.4, 4.4, 'a')
    elipse(g, 3.4, 3.4, 2.0, 2.0, 'A')
    g.pôr(4, 5, 'k')
    g.pôr(5, 5, 'k')
    g.pôr(3, 4, 'e')
    g.pôr(6, 4, 'e')
    g.pôr(3, 6, 'k')
    return contornar(g, 'D')


def folha_fossil():
    g = Grade(12, 7)
    elipse(g, 5.5, 3, 5.4, 2.8, 'D')
    elipse(g, 5.5, 3, 4.2, 1.8, 'S')
    lin(g, 1, 3, 10, 3, 'D')
    for x in (3, 5, 7):
        g.pôr(x, 2, 'D')
        g.pôr(x + 1, 4, 'D')
    return g


def estacas():
    """Estacas do canteiro de escavação com o barbante de bandeirinhas vermelhas e amarelas entre elas."""
    g = Grade(16, 9)
    ret(g, 1, 0, 1, 8, 'n')
    ret(g, 14, 0, 14, 8, 'n')
    for x in range(2, 14):
        g.pôr(x, 1 + (1 if 4 < x < 11 else 0), 'k')
    for n, x in enumerate((3, 6, 9, 12)):
        y = 2 + (1 if 4 < x < 11 else 0)
        for dy in range(3):
            for dx in range(-(2 - dy) // 2 + 0, (2 - dy) // 2 + 1):
                g.pôr(x + dx, y + dy, 'r' if n % 2 == 0 else 'y')
    return g


def cranio_saindo():
    g = Grade(10, 7)
    elipse(g, 4.5, 6, 4.6, 5.6, 'w')
    for y in range(g.h):
        for x in range(g.w):
            if g.ler(x, y) == 'w' and x >= 7:
                g.pôr(x, y, 'b')
    ret(g, 2, 3, 3, 4, 'k')
    ret(g, 6, 3, 7, 4, 'k')
    g.pôr(5, 5, 'k')
    ret(g, 3, 6, 6, 6, 'k')
    return g


def ossos_cruzados():
    g = Grade(11, 6)
    lin(g, 1, 1, 9, 4, 'w')
    lin(g, 1, 4, 9, 1, 'w')
    for x, y in ((0, 0), (0, 2), (1, 0), (10, 3), (10, 5), (9, 5), (0, 3), (0, 5), (1, 5), (10, 0), (10, 2), (9, 0)):
        g.pôr(x, y, 'w')
    return g


def balde_pincel():
    g = Grade(10, 9)
    poligono(g, [(1, 3), (8, 3), (7, 8), (2, 8)], 'u')
    ret(g, 1, 3, 8, 3, 'U')
    for x in (3, 4, 5, 6):
        g.pôr(x, 5, 'U')
    lin(g, 2, 3, 4, 0, 'n')
    lin(g, 8, 2, 6, 0, 'n')
    ret(g, 6, 0, 9, 1, 'y')
    g.pôr(9, 2, 'y')
    lin(g, 7, 3, 9, 6, 'm')
    return g


def picareta():
    g = Grade(9, 11)
    ret(g, 4, 2, 4, 10, 'n')
    for x, y in ((0, 4), (1, 3), (2, 2), (3, 1), (4, 1), (5, 1), (6, 2), (7, 3), (8, 4)):
        g.pôr(x, y, 'c')
    ret(g, 3, 2, 5, 2, 'C')
    return g


def placa_perigo():
    """Placa de losango amarelo com um osso desenhado, em cima de um poste de madeira: "cuidado, paleontólogo trabalhando"."""
    g = Grade(13, 15)
    ret(g, 6, 8, 6, 14, 'n')
    for y in range(0, 9):
        meia = 6 - abs(y - 4) * 1.5
        for x in range(round(6 - meia), round(6 + meia) + 1):
            g.pôr(x, y, 'y')
    for y in range(0, 9):
        row = [x for x in range(g.w) if g.ler(x, y) == 'y']
        if row:
            g.pôr(row[0], y, 'k')
            g.pôr(row[-1], y, 'k')
    lin(g, 3, 4, 9, 4, 'k')
    for x, y in ((3, 3), (3, 5), (9, 3), (9, 5), (2, 3), (2, 5), (10, 3), (10, 5)):
        g.pôr(x, y, 'k')
    return g


def sombrinha():
    """Guarda-sol listrado de vermelho e branco que o paleontólogo espetou no chão para não pegar sol."""
    g = Grade(15, 13)
    ret(g, 7, 4, 7, 12, 'n')
    for y in range(0, 6):
        meia = 7 * math.sqrt(max(0.0, 1 - ((y - 5.0) / 5.4) ** 2))
        for x in range(round(7 - meia), round(7 + meia) + 1):
            g.pôr(x, y, 'r' if ((x + 1) // 3) % 2 == 0 else 'e')
    for x in range(0, 15):
        if g.ler(x, 5) != '.' and x % 2 == 0:
            g.pôr(x, 6, 'r' if ((x + 1) // 3) % 2 == 0 else 'e')
    g.pôr(7, 0, 'y')
    return g


FOSSIL_CORES = dict(w='#f6efd8', b='#d8cca4', k='#3a2c18', D='#6a4a28', a='#e89a2a', A='#ffd060', e='#fffaf0', S='#a07840', n='#7a5028', r='#ee2f3c', y='#ffd21e',
                    u='#3a78d8', U='#2c5aa8', m='#c8a050', c='#8a90a0', C='#d8dce8')

# Sítio de Fósseis: sedimento em camadas, fósseis grandes enterrados no corte e o canteiro do paleontólogo em cima.
terreno_proprio('fossil', {
    'top': paleta('#e8d4a0', '#d8c088', '#f0e0b0'), 'mid': paleta('#d8c088', '#c8aa70'), 'sub': paleta('#c8aa70', '#b08850', '#d8c088'),
    'soil': paleta('#b08850', '#8a6a40'), 'deep': paleta('#8a6a40', '#6a4a2c'), 'low': paleta('#4a3018'), 'edge': paleta('#2a1a0c'),
    'strata': paleta('#c8aa70', '#b08850', '#d8c088', '#a87c48', '#c8aa70', '#8a6a40', '#d0b078', '#9a7040'), 'pattern': 'strata',
    'speck': paleta('#fffaf0', '#e8dcc0'), 'flowers': [], 'tuft': paleta('#c8b070', '#a89050'),
    'root': paleta('#8a6a40', '#6a4a2c', '#a08050', '#c8a870'),
    'decoGap': 24, 'buriedGap': 12,
    'deco': [peca_de(f(), **FOSSIL_CORES) for f in (estacas, cranio_saindo, ossos_cruzados, balde_pincel, picareta, placa_perigo, sombrinha)],
    'buried': [peca_de(f(), **FOSSIL_CORES) for f in (cranio_trex, costelas, amonite, trilobita, peixe_fossil, ambar, folha_fossil)]})


# --- Selva Jurássica -----------------------------------------------------------------------------------------------------------

JUNGLE = dict(b='#d8cca4', g='#2f9a3a', G='#7ae060', d='#1c5a2a', t='#8a5a2a', T='#5a3a1a', r='#ee2f3c', w='#fffaf0', p='#c86aff', P='#8a3ac8', y='#ffd21e', n='#7a5028', k='#2a1e10',
              e='#f4ecc8', s='#5fb04a', a='#e89a2a', A='#ffd060', R='#c02030', l='#ffb02a', u='#3a78d8')


def cica():
    """Cica (palmeirinha pré-histórica): tronco escamado e uma coroa de folhas em penca."""
    g = Grade(15, 15)
    ret(g, 6, 6, 8, 14, 't')
    for y in range(7, 14, 2):
        ret(g, 6, y, 8, y, 'T')
    for dx, dy in ((-6, 3), (-5, 0), (-3, -2), (0, -3), (3, -2), (5, 0), (6, 3)):
        lin(g, 7, 5, 7 + dx, 5 + dy, 'g')
        if dy < 0:
            lin(g, 7, 5, 7 + dx, 6 + dy, 'G')
    for dx, dy in ((-5, 4), (5, 4)):
        lin(g, 7, 5, 7 + dx, 5 + dy, 'd')
    return g


def cogumelo_gigante():
    g = Grade(11, 9)
    elipse(g, 5, 3.4, 5.2, 3.4, 'r')
    ret(g, 0, 4, 10, 5, '.')
    ret(g, 0, 3, 10, 3, 'r')
    ret(g, 4, 4, 6, 8, 'e')
    ret(g, 6, 4, 6, 8, 'b')
    for x, y in ((3, 1), (6, 2), (8, 3), (2, 3), (5, 3)):
        g.pôr(x, y, 'w')
    return g


def monstera():
    g = Grade(10, 8)
    for y in range(0, 6):
        meia = 4.8 * math.sqrt(max(0.0, 1 - ((y - 3.0) / 3.0) ** 2))
        for x in range(round(5 - meia), round(5 + meia) + 1):
            g.pôr(x, y, 'g' if x < 6 else 'd')
    for x, y in ((2, 2), (3, 4), (7, 2), (8, 4)):
        g.pôr(x, y, '.')
    lin(g, 5, 0, 5, 5, 'G')
    ret(g, 5, 6, 5, 7, 'd')
    return g


def orquidea():
    g = Grade(7, 9)
    ret(g, 3, 4, 3, 8, 'g')
    for x, y in ((2, 2), (4, 2), (3, 1), (2, 3), (4, 3), (1, 1), (5, 1)):
        g.pôr(x, y, 'p')
    g.pôr(3, 2, 'y')
    g.pôr(1, 2, 'P')
    g.pôr(5, 2, 'P')
    ret(g, 4, 6, 6, 6, 'g')
    return g


def bandeirinha_na_mata():
    """A bandeirinha de São João que alguém espetou na selva: um cabo de madeira com três bandeirinhas coloridas, como quem marca território."""
    g = Grade(11, 13)
    ret(g, 1, 0, 1, 12, 'n')
    lin(g, 1, 1, 9, 2, 'k')
    for n, x in enumerate((3, 5, 7, 9)):
        y = 2 + (x - 1) // 5
        for dy in range(4):
            for dx in range(-(3 - dy) // 2 + 0, (3 - dy) // 2 + 1):
                g.pôr(x + dx, y + dy, 'ryup'[n % 4])
    return g


def samambaia_grande():
    g = Grade(11, 11)
    ret(g, 5, 6, 5, 10, 'd')
    for k in range(-4, 5):
        h = 5 - abs(k) * 0.9
        lin(g, 5, 7, 5 + k, round(7 - h), 'g')
        g.pôr(5 + k, round(7 - h), 'G')
    return g


def raizes():
    g = Grade(16, 6)
    for x in range(16):
        g.pôr(x, 2 + round(1.6 * math.sin(x * 0.7)), 't')
        g.pôr(x, 3 + round(1.6 * math.sin(x * 0.7)), 'T')
    lin(g, 3, 4, 1, 5, 'T')
    lin(g, 11, 4, 13, 5, 'T')
    return g


def ovo_enterrado():
    g = Grade(8, 9)
    elipse(g, 3.5, 4.4, 3.4, 4.2, 'e')
    for x, y in ((2, 2), (4, 3), (3, 5), (5, 6), (2, 6)):
        g.pôr(x, y, 's')
    ret(g, 6, 3, 6, 6, 'b')
    return contornar(g, 'k')


def ambar_selva():
    return ambar()


terreno_proprio('jurassico', {
    'top': paleta('#2f8a3a', '#46a84a', '#1f6a30', '#3a9a40'), 'mid': paleta('#1f6a30', '#2a7a38'), 'sub': paleta('#4a3a20', '#3a2c18'),
    'soil': paleta('#3a2a18', '#4a3820', '#2a1e10', '#3a2a18'), 'deep': paleta('#2a1e10', '#3a2a18'), 'low': paleta('#1c1408'),
    'edge': paleta('#100a04'), 'speck': paleta('#6ed060', '#3fae4a'), 'flowers': paleta('#ff6a8a', '#ffb02a', '#c86aff'),
    'tuft': paleta('#3fae4a', '#6ed060', '#2a8a3a'), 'root': paleta('#2a7a3a', '#1a5a2a', '#3fae4a', '#7ae060'), 'puddle': paleta('#3a98b8', '#58b8d0'),
    'decoGap': 20, 'buriedGap': 14,
    'deco': [peca_de(f(), **JUNGLE) for f in (cica, cogumelo_gigante, monstera, orquidea, bandeirinha_na_mata, samambaia_grande)],
    'buried': [peca_de(f(), **{**JUNGLE, **FOSSIL_CORES}) for f in (raizes, ovo_enterrado, ambar_selva, costelas)]})


# --- Ninho de Ovos -------------------------------------------------------------------------------------------------------------

NINHO = dict(e='#f4ecc8', E='#ffffff', d='#cdbf94', g='#7ad0a8', G='#c8f0d8', c='#4a9a78', b='#7ad060', B='#4a9a3a', k='#26242e', h='#f0c050', H='#c89030', r='#ee2f3c',
             y='#ffd21e', Y='#fff0a0', p='#ff8aa8', s='#c8a050', S='#a07830', n='#e0c070', f='#f0f4ff', F='#b8d0ff', q='#ffb02a', Q='#c87a1a', w='#fffaf0', a='#9ac4ff')


def pilha_de_ovos():
    """Montinho de ovos de cores diferentes (creme, verde-água, azul e rajado), cada um com o brilho no lado esquerdo."""
    g = Grade(15, 10)
    for cx, cy, rx, ry, cor, luz in ((4, 6.5, 3.4, 3.8, 'e', 'E'), (10, 6.8, 3.4, 3.6, 'g', 'G'), (7, 3.4, 2.8, 3.2, 'a', 'f')):
        elipse(g, cx, cy, rx, ry, cor)
        g.pôr(round(cx - rx * 0.5), round(cy - ry * 0.4), luz)
        g.pôr(round(cx - rx * 0.5), round(cy - ry * 0.4) + 1, luz)
    for x, y in ((3, 7), (4, 5), (10, 8), (11, 6), (7, 4)):
        g.pôr(x, y, 'c' if (x + y) % 2 else 'd')
    return g


def filhote_espiando():
    """Ovo rachado em zigue-zague com um dinossaurinho de chapéu de palha espiando por cima da casca."""
    g = Grade(11, 12)
    elipse(g, 5, 8, 4.8, 4.2, 'e')
    ret(g, 0, 0, 10, 6, '.')
    elipse(g, 5, 5.5, 3.4, 2.8, 'b')
    for x in (4, 7):
        g.pôr(x, 5, 'w')
        g.pôr(x, 6, 'k')
    for x in range(1, 10):
        g.pôr(x, 7 + (x % 2), 'e')
    for x, y in ((1, 8), (3, 7), (5, 8), (7, 7), (9, 8)):
        g.pôr(x, y, 'd')
    ret(g, 3, 2, 7, 2, 'h')
    ret(g, 4, 1, 6, 1, 'h')
    ret(g, 4, 2, 6, 2, 'r')
    for x in range(2, 9):
        g.pôr(x, 3, 'H')
    return g


def pena():
    g = Grade(5, 9)
    for y in range(9):
        g.pôr(2, y, 'n')
    for y in range(1, 7):
        g.pôr(1 + (y % 2), y, 'Y' if y < 4 else 's')
        g.pôr(3 - (y % 2) * 0 + (0 if y % 2 else 1), y, 'Y' if y < 4 else 's')
    return g


def ovo_dourado():
    g = Grade(8, 10)
    elipse(g, 3.5, 5.0, 3.4, 4.4, 'q')
    for x, y in ((2, 2), (2, 3), (3, 2)):
        g.pôr(x, y, 'Y')
    for y in range(g.h):
        for x in range(g.w):
            if g.ler(x, y) == 'q' and (x >= 5 or y >= 8):
                g.pôr(x, y, 'Q')
    g.pôr(4, 6, 'y')
    return g


def casca_quebrada():
    g = Grade(12, 5)
    for x in range(12):
        topo = 1 + (x % 3 == 1) + (x % 5 == 3)
        for y in range(topo, 5):
            if ((x - 5.5) / 5.5) ** 2 + ((y - 1.0) / 4.4) ** 2 <= 1.0:
                g.pôr(x, y, 'e')
    for x in range(1, 11):
        g.pôr(x, 4, 'd')
    return g


def palha_fofa():
    g = Grade(15, 6)
    for i in range(14):
        x0 = 1 + i
        lin(g, x0, 5, x0 + (-2 if i % 3 == 0 else 2 if i % 3 == 1 else 0), 0 + i % 3, 'n' if i % 2 else 's')
    return g


def ovo_enterrado_ninho():
    g = Grade(10, 8)
    elipse(g, 4.5, 4.0, 4.3, 3.6, 'e')
    for x, y in ((2, 3), (5, 2), (6, 5), (3, 5)):
        g.pôr(x, y, 'c')
    return contornar(g, 'k')


terreno_proprio('ninho', {
    'top': paleta('#c8a050', '#e0c070', '#a07830', '#d8b060'), 'mid': paleta('#a07830', '#8a6428', '#c8a050'), 'sub': paleta('#6a4a2a', '#8a6a3a'),
    'soil': paleta('#6a4a2a', '#4a3018'), 'deep': paleta('#4a3018', '#3a2410'), 'low': paleta('#2a1a0a'), 'edge': paleta('#180e04'),
    'strata': paleta('#a07830', '#c8a050', '#8a6428', '#e0c070', '#6a4a2a', '#a07830', '#8a6a3a', '#5a3c20'), 'pattern': 'strata',
    'speck': paleta('#e0c070', '#a07830'), 'flowers': paleta('#fff0c8', '#c8e8a0', '#ffe0a0'),
    'tuft': paleta('#e0c070', '#c8a050', '#a07830'), 'root': paleta('#c8a050', '#8a6428', '#e0c070', '#f0d890'),
    'decoGap': 18, 'buriedGap': 13,
    'deco': [peca_de(f(), **NINHO) for f in (pilha_de_ovos, filhote_espiando, pena, ovo_dourado, casca_quebrada, palha_fofa)],
    'buried': [peca_de(f(), **{**FOSSIL_CORES, **NINHO}) for f in (ovo_enterrado_ninho, ovo_dourado, casca_quebrada, costelas, palha_fofa)]})
