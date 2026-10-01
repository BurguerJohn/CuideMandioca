"""Os troféus da Mata Encantada: 12 itens que só se ganham derrotando os chefes (chapéus, itens de mão, um tecido, dois terreiros e um
varal). Registram-se nas mesmas tabelas de `itens_novos` (CHAPEUS, MAOS, TECIDOS, FORMAS, VARAIS_NOVOS, TERRENOS_NOVOS), então a
exportação (art/exportar.py) já os pega.
"""

import math
import random

import sprites
from itens_novos import (CHAPEUS, FORMAS, MAOS, TECIDOS, TERRENOS_NOVOS, VARAIS_NOVOS, Grade, chapeu, elipse, espelhar, ladrilho, mao,
                         paleta, pintar)


# --- Chapéus ----------------------------------------------------------------------------------------------------------------
def cabeleira_curupira():
    """Uma cabeleira de fogo: labaredas altas por cima, franja vermelha caindo nas têmporas (os pés do Curupira ficam pra trás)."""
    return espelhar("""
...........y
..........yo
.....y...yoo
....yy..yooo
....yyo.yooo
...yyooyoooo
...yooooyooo
..yoooyooooo
..oooyyooooo
.ooooyoooooo
.ooooooooooo
.OooooooooOo
.OOooooooooo
..OOooooooyo
..OOOOooooOo
...OOOOOOOOO
""")


chapeu('cabelo-curupira', cabeleira_curupira(), {'o': '#ff7a1c', 'O': '#d8301a', 'y': '#ffe04a'}, acima=7)


def concha(g, cx, base, raio, clara, escura, ribs=5):
    """Uma concha-leque (semicírculo com nervuras que saem da base) em pé sobre a linha `base`."""
    for y in range(base - raio, base + 1):
        for x in range(cx - raio, cx + raio + 1):
            dx, dy = x - cx, base - y
            dist = math.hypot(dx, dy)
            if dist <= raio + 0.4:
                angulo = math.atan2(dy, dx)
                nervura = round(angulo / math.pi * ribs * 2) % 2 == 0
                g.pôr(x, y, escura if (nervura or dist > raio - 0.6) else clara)


def coroa_iara():
    """Coroa de conchas-leque e pérolas, com uma faixa de ouro verde-água: pérola, concha e um canto que ninguém esquece."""
    g = Grade(24, 13)
    concha(g, 12, 9, 7, 'p', 'P', 4)
    concha(g, 3, 9, 3, 'p', 'P', 2)
    concha(g, 21, 9, 3, 'p', 'P', 2)
    for x in range(1, 23):
        g.pôr(x, 10, 'g')
        g.pôr(x, 11, 'T')
        g.pôr(x, 12, 'T' if x % 2 else 't')
    for x in range(2, 23, 4):
        g.pôr(x, 11, 'w')
        g.pôr(x, 10, 'z')
    for x, y in ((12, 1), (3, 5), (21, 5)):
        g.pôr(x, y, 'w')
        g.pôr(x + 1, y, 'w')
        g.pôr(x, y - 1, 'z')
    return g.texto()


chapeu('coroa-iara', coroa_iara(), {'p': '#ffb0d0', 'P': '#e0689a', 'g': '#ffd860', 'T': '#2ab8b0', 't': '#128078', 'w': '#ffffff', 'z': '#d8f4ff'}, acima=4)


def capuz_lobisomem():
    """Capuz de pelo cinza com duas orelhas pontudas (e o miolo rosado), tufos soltos e a faixa escura na testa."""
    g = Grade(24, 12)
    rng = random.Random(4)
    elipse(g, 11.5, 11, 11.5, 7.2, 'f')
    for y in range(12):
        for x in range(24):
            if g.ler(x, y) == 'f':
                sorte = rng.random()
                g.pôr(x, y, 'F' if sorte < 0.18 else 'l' if sorte > 0.88 else 'f')
    for k in range(6):
        for dx in range(0, 6 - k):
            g.pôr(3 + dx + k // 2, k, 'f' if dx else 'F')
            g.pôr(20 - dx - k // 2, k, 'f' if dx else 'F')
    for k in range(1, 5):
        g.pôr(5 + k // 2, k + 1, 'r')
        g.pôr(18 - k // 2, k + 1, 'r')
    for x in range(2, 22):
        g.pôr(x, 11, 'k' if x % 3 else 'F')
    for x, y in ((6, 6), (16, 7), (11, 5)):
        g.pôr(x, y, 'l')
    return g.texto()


chapeu('capuz-lobisomem', capuz_lobisomem(), {'f': '#8a8a9c', 'F': '#55556a', 'l': '#bcbcd0', 'r': '#e89aa8', 'k': '#2a2a38'}, acima=3)


def cobra_grande():
    """A Boiúna (bem pequena) enrolada na cabeça: três voltas de escamas verdes e a cabeça levantada com a língua de fora."""
    g = Grade(24, 16)
    for cy, rx in ((14, 11), (11.5, 9.5), (9, 8)):
        for y in range(16):
            for x in range(24):
                dx = (x - 11.5) / rx
                dy = (y - cy) / 2.4
                if dx * dx + dy * dy <= 1.0:
                    g.pôr(x, y, 'L' if dy > 0.35 else 'G' if (x + y) % 3 else 'g')
    # Pescoço e cabeça levantados, virados para a esquerda.
    for y in range(5, 11):
        for x in range(10, 14):
            g.pôr(x, y, 'G' if x < 13 else 'L')
    elipse(g, 11.5, 4.5, 4.8, 3.4, 'G')
    elipse(g, 11, 4.0, 3.2, 1.8, 'g')
    for x, y in ((9, 3), (13, 3)):
        g.pôr(x, y, 'y')
        g.pôr(x, y + 1, 'k')
    for x, y in ((6, 6), (5, 6), (4, 5), (4, 7), (7, 6)):
        g.pôr(x, y, 'r')
    for x in range(4, 20, 3):
        g.pôr(x, 14, 'l')
        g.pôr(x + 1, 11, 'l')
    return g.texto()


chapeu('cobra-grande', cobra_grande(), {'G': '#2c8a3c', 'g': '#4cc05a', 'L': '#16502a', 'l': '#c8f0a0', 'y': '#ffe040', 'r': '#ff3a4a', 'k': '#101810'}, acima=7)

# O chapéu do Boto: panamá branco com fita preta, para esconder o buraco da cabeça.
chapeu('chapeu-boto', espelhar("""
......wwwwww
.....wwwWwww
....wwwwwwww
....wwwwwwww
....kkkkkkkk
..wwwwwwwwww
.wwwWwwwwwww
wwwwwwwwwwww
.WWWWWWWWWWW
"""), {'w': '#f8f4e8', 'W': '#c8c0a8', 'k': '#2a2430'}, acima=0)


# --- Itens de mão -----------------------------------------------------------------------------------------------------------
def tocha():
    """Tocha de madeira com a chama balançando (4 quadros), e uma faixa de couro no cabo."""
    quadros = []
    for k in range(4):
        g = Grade(13, 22)
        for y in range(8, 21):
            g.pôr(5, y, 'M')
            g.pôr(6, y, 'M')
            g.pôr(7, y, 'm')
        for y in (11, 12):
            for x in (5, 6, 7):
                g.pôr(x, y, 'c')
        for x in range(3, 10):
            g.pôr(x, 8, 'e')
        for y in range(1, 9):
            t = (8 - y) / 8
            meia = 3.6 * math.sin(math.pi * min(1.0, t * 1.0 + 0.1)) ** 0.7
            desloc = math.sin(k * math.pi / 2 + y * 0.8) * 0.9 * (1 - t) * 1.4
            for x in range(13):
                d = abs(x - 6 - desloc)
                if d <= meia:
                    n = d / max(meia, 0.5)
                    g.pôr(x, y, 'z' if n < 0.28 and y > 3 else 'y' if n < 0.58 else 'o' if n < 0.85 else 'r')
        g.pôr(6 + (k % 2), 0, 'y')
        quadros.append(pintar(g.texto(), {'M': '#8a5a2c', 'm': '#5e3a18', 'c': '#3a2a20', 'e': '#2a1a14', 'z': '#fff6b8', 'y': '#ffd23a',
                                           'o': '#ff8a1c', 'r': '#d8301a'}))
    return quadros


mao('tocha-caipora', tocha(), (6, 20), fps=6)


def ferradura():
    """Ferradura em brasa: o ferro brilha laranja e amarelo de quadro em quadro, com chamas lambendo as pontas."""
    quadros = []
    for k in range(4):
        g = Grade(15, 15)
        for y in range(15):
            for x in range(15):
                d = math.hypot(x - 7, y - 6.5)
                if 3.2 <= d <= 6.6:
                    brilho = 0.5 + 0.5 * math.sin(k * math.pi / 2 + math.atan2(y - 6.5, x - 7) * 2)
                    g.pôr(x, y, 'y' if brilho > 0.75 else 'o' if brilho > 0.35 else 'r')
        for y in range(0, 4):
            for x in (6, 7, 8):
                g.pôr(x, y, '.')
        for graus in (25, 55, 90, 125, 155):                        # os furos dos pregos, no meio do ferro
            g.pôr(round(7 + 4.9 * math.cos(math.radians(graus))), round(6.5 + 4.9 * math.sin(math.radians(graus))), 'h')
        for fx, base in ((3, 2), (11, 2)):
            for dy in range(3):
                g.pôr(fx + ((k + dy) % 2) * (1 if fx < 7 else -1), base - dy + 2, 'y' if dy < 2 else 'z')
        quadros.append(pintar(g.texto(), {'y': '#ffd23a', 'o': '#ff8a1c', 'r': '#c8301a', 'h': '#3a2a2e', 'z': '#fff6b8'}))
    return quadros


mao('ferradura-fogo', ferradura(), (7, 13), fps=5)


def caldeirao():
    """Caldeirãozinho preto de poção verde borbulhando: as bolhas sobem de quadro em quadro e estouram no alto."""
    quadros = []
    for k in range(4):
        g = Grade(16, 19)
        elipse(g, 7.5, 13, 7.0, 5.0, 'P')
        for y in range(8, 18):
            for x in range(16):
                if g.ler(x, y) == 'P' and x > 11:
                    g.pôr(x, y, 'Q')
        for x in range(2, 14):
            g.pôr(x, 9, 'V' if x % 3 else 'v')
        for x in range(1, 15):
            g.pôr(x, 8, 'B')
        for x, y in ((3, 18), (12, 18)):
            g.pôr(x, y, 'B')
            g.pôr(x + 1, y, 'B')
        for x, y in ((14, 11), (15, 11), (15, 12)):
            g.pôr(x, y, 'B')
        # Bolhas subindo, cada uma numa altura diferente conforme o quadro.
        for i, bx in enumerate((4, 8, 11)):
            altura = (k * 2 + i * 3) % 8
            y = 8 - altura
            if y >= 0:
                g.pôr(bx, y, 'b' if altura < 6 else '.')
                if altura < 4:
                    g.pôr(bx + 1, y, 'b')
        quadros.append(pintar(g.texto(), {'P': '#2e2a38', 'Q': '#1a1822', 'B': '#4a4658', 'V': '#7aff8a', 'v': '#3ad060', 'b': '#c8ffd0'}))
    return quadros


mao('caldeirao-cuca', caldeirao(), (8, 12), fps=4)


# --- Tecido: a capa do boi, de veludo vermelho com losangos dourados e miçangas azuis -------------------------------------------
def tecido_boi():
    base = []
    for yy in range(8):
        linha = ''
        for xx in range(8):
            d, e = (xx + yy) % 8, (xx - yy) % 8
            if d == 0 or e == 0:
                linha += 'A'
            elif (xx, yy) == (4, 0) or (xx, yy) == (0, 4):
                linha += 'C'
            elif (xx % 4 == 2 and yy % 4 == 2):
                linha += 'r'
            else:
                linha += 'R'
        base.append(linha)
    return ladrilho(base, {'A': '#ffd21e', 'C': '#3fd6f0', 'R': '#ee2f3c', 'r': '#c8203c'})


TECIDOS['capa-boi-bumba'] = tecido_boi()
sprites.FABRICS['capa-boi-bumba'] = TECIDOS['capa-boi-bumba']

# --- Varal do Boitatá: bandeirinhas em forma de chama de fogo-fátuo ----------------------------------------------------------------
FORMAS['chama'] = ['...b...', '..bb...', '.bblb..', '.bblbb.', 'bbllbbb', 'bblllbb', '.bbbbb.', '..ddd..']
VARAIS_NOVOS['varal-boitata'] = ('chama', [('|', '^', ')', 'z'), ('C', '^', ')', 'z'), ('=', 'g', 'G', 'z'), ('|', '^', ')', 'z')])


# --- Terreiros ----------------------------------------------------------------------------------------------------------------------
TERRENOS_NOVOS['brejo-mapinguari'] = {
    'top': paleta('#6a7a30', '#586a28', '#7a8a38', '#5a6a2a'), 'mid': paleta('#4a5a22', '#3a4a1c'), 'sub': paleta('#3a2e1c', '#2e2416'),
    'soil': paleta('#4a3a22', '#3a2e1a', '#5a4a2a', '#3a2e1a'), 'deep': paleta('#2e2416', '#241c10'), 'low': paleta('#1c140a'),
    'edge': paleta('#120c06'), 'speck': paleta('#a8e070', '#8ac05a', '#c8f090'), 'flowers': paleta('#b050e0', '#e070ff', '#7a30b0'),
    'tuft': paleta('#7aa040', '#98c050', '#587a2a'), 'root': paleta('#587a2a', '#3a4a1c', '#587a2a', '#98c050')}
TERRENOS_NOVOS['clareira-encantada'] = {
    'top': paleta('#2a8a6a', '#3aaa7a', '#2a7a60', '#34a070'), 'mid': paleta('#1c6a54', '#175a48'), 'sub': paleta('#14483c', '#103a32'),
    'soil': paleta('#2a3a3a', '#223030', '#1a2828', '#2a3a3a'), 'deep': paleta('#161e22', '#10181c'), 'low': paleta('#0c1216'),
    'edge': paleta('#06090c'), 'speck': paleta('#8affd0', '#d0fff0', '#fff4a0'), 'flowers': paleta('#5affe0', '#ff7af0', '#ffe070'),
    'tuft': paleta('#4aea9a', '#7affc0'), 'root': paleta('#4a2e6a', '#2e1a48', '#7a5aa0', '#a888d8')}
