"""Tema dinossauros: terreiros (selva jurássica, sítio de fósseis, ninho de ovos), cenários (esqueleto de T-Rex, ovo gigante, vulcão
fumegante, samambaia pré-histórica), chapéus (capuz de dinossauro, crista de estegossauro), itens de mão (osso, ovinho que choca),
o tecido de pele de dinossauro e os conjuntos deles."""

import math

from itens_novos import Grade, chapeu, elipse, ladrilho, mao, pintar
from tema_comum import ret, triangulo, novo_registro, tecido, terreno, grosso, lin

LADOS, lado = novo_registro()
CHAPEUS_PROPRIOS = {}
MAOS_PROPRIAS = {}
TECIDOS_PROPRIOS = {}
TERRENOS_PROPRIOS = {}


def espelho(g):
    """A grade da metade esquerda vira a figura inteira (linhas de 24 colunas), espelhada no meio."""
    return '\n'.join(''.join(linha) + ''.join(reversed(linha)) for linha in g.c)


def chapeu_proprio(id_, texto, cores, acima):
    chapeu(id_, texto, cores, acima=acima)
    CHAPEUS_PROPRIOS[id_] = True


def mao_propria(id_, quadros, pivo, fps):
    mao(id_, quadros, pivo, fps=fps)
    MAOS_PROPRIAS[id_] = True


def deslocar(g, dx, dy):
    """A mesma grade com tudo andando (dx, dy) pixels (a folha cresce para caber)."""
    h = Grade(g.w + abs(dx), g.h + abs(dy))
    for y in range(g.h):
        for x in range(g.w):
            if g.c[y][x] != '.':
                h.pôr(x + max(dx, 0), y + max(dy, 0), g.c[y][x])
    return h.texto()


# --- Chapéus ----------------------------------------------------------------------------------------------------------------

def capuz_dino():
    """Dino de estimação: um T-rex bebê deitado em cima da cabeça como um gato, de chapeuzinho de palha, olho feliz, sorrisão com dentinhos, bracinho caído
    e a cauda enrolada para cima do outro lado."""
    g = Grade(24, 15)
    # Corpo deitado (uma almofada verde sobre a cabeça) com a barriga clara por baixo e as manchas escuras.
    elipse(g, 11, 12.4, 10.6, 4.2, 'g')
    for y in range(g.h):
        for x in range(g.w):
            if g.ler(x, y) == 'g':
                if y >= 13:
                    g.pôr(x, y, 'c')
                elif y == 8 and 5 < x < 15:
                    g.pôr(x, y, 'G')
                elif (x * 3 + y * 5) % 11 == 0:
                    g.pôr(x, y, 'd')
    # Cauda enrolando para cima na esquerda.
    for x, y in ((2, 11), (1, 10), (0, 9), (0, 8), (1, 7), (2, 7), (2, 8)):
        g.pôr(x, y, 'g')
        g.pôr(x + 1, y + 1 if x < 2 else y, 'g')
    g.pôr(2, 8, 'd')
    # Cabeça grande à direita, olhando de lado, com o chapeuzinho de palha.
    elipse(g, 18, 8.6, 5.2, 4.2, 'g')
    ret(g, 17, 10, 23, 12, 'g')
    ret(g, 18, 11, 23, 12, 'k')
    for x in (18, 20, 22):
        g.pôr(x, 11, 'w')
    g.pôr(21, 12, 'p')
    g.pôr(22, 12, 'p')
    for x, y in ((16, 7), (17, 6), (18, 7)):
        g.pôr(x, y, 'k')
    g.pôr(14, 9, 'r')
    g.pôr(15, 9, 'r')
    g.pôr(22, 8, 'd')
    g.pôr(21, 8, 'd')
    # Bracinho caído e pezinho aparecendo.
    ret(g, 9, 11, 10, 13, 'g')
    ret(g, 8, 13, 10, 13, 'c')
    # Chapeuzinho de palha na cabeça dele.
    elipse(g, 17.5, 4.2, 5.6, 1.5, 'h')
    elipse(g, 17.5, 2.6, 2.8, 1.8, 'h')
    ret(g, 15, 3, 20, 3, 'r')
    return g.texto()


chapeu_proprio('capuz-dino', capuz_dino(), {'g': '#3fae4a', 'G': '#8ee06a', 'd': '#237a38', 'c': '#f2e6a8', 'k': '#26242e', 'w': '#ffffff', 'p': '#ff6a8a',
                                            'r': '#ee2f3c', 'h': '#f0c050'}, acima=6)


def diamante(g, cx, cy, rx, ry, clara, escura, veio=None):
    """Placa de estegossauro: losango com a metade da esquerda mais clara e um veio no meio."""
    for y in range(g.h):
        for x in range(g.w):
            if abs(x - cx) / rx + abs(y - cy) / ry <= 1.0:
                g.pôr(x, y, clara if x <= cx else escura)
    if veio:
        for y in range(g.h):
            if g.ler(round(cx), y) in (clara, escura):
                g.pôr(round(cx), y, veio)


def crista_estegossauro():
    """Touca verde justa com as placas de estegossauro trocadas por bandeirinhas de São João (cada uma de uma cor), presas por um barbante pela base."""
    g = Grade(24, 15)
    elipse(g, 11.5, 15, 10.5, 6.8, 'g')
    for y in range(g.h):
        for x in range(g.w):
            if g.ler(x, y) == 'g' and (y == 9 or (y == 10 and x < 11)):
                g.pôr(x, y, 'G')
            elif g.ler(x, y) == 'g' and y >= 13:
                g.pôr(x, y, 'd')
    cores = ('r', 'y', 'b', 'v', 'q')
    for n, (cx, altura, largura) in enumerate(((3.5, 6, 2.6), (7.5, 8, 3.0), (11.5, 11, 3.4), (15.5, 8, 3.0), (19.5, 6, 2.6))):
        base = 15 - 6.8 * math.sqrt(max(0.0, 1 - ((cx - 11.5) / 10.5) ** 2)) + 1.2
        diamante(g, cx, base - altura / 2, largura, altura / 2, cores[n].upper(), cores[n], 'w')
    g.pôr(11, 0, 'w')
    return g.texto()


chapeu_proprio('crista-estegossauro', crista_estegossauro(), {'g': '#3fae4a', 'G': '#8ee06a', 'd': '#237a38', 'R': '#ff6a6a', 'r': '#e8302c', 'Y': '#ffe46a', 'y': '#e8b020',
                                                              'B': '#6aa8ff', 'b': '#2f62c8', 'V': '#7ae070', 'v': '#2f9a3a', 'Q': '#ff8ac8', 'q': '#d83a90', 'w': '#fffaf0',
                                                              'k': '#26242e'}, acima=7)


# --- Itens de mão -----------------------------------------------------------------------------------------------------------

def osso_dino():
    """Coxa de dinossauro assada, como a do Flintstones: carne dourada com caramelo brilhando, uma mordida, o osso cremoso embaixo e fumacinha subindo; um
    fio de molho escorre e pinga (4 quadros)."""
    quadros = []
    cores = {'m': '#c26a22', 'M': '#e8a04a', 'd': '#7a3c14', 'L': '#ffd98a', 'e': '#f4ecd0', 'E': '#ffffff', 'b': '#c8bf9e', 's': '#ece6dc', 'S': '#c8c2b8', 'r': '#e8302c',
             'o': '#a04a14'}
    for k in range(4):
        g = Grade(16, 28)
        # A carne: bolota dourada com o lado esquerdo claro, o direito tostado e a mordida no canto de cima.
        elipse(g, 8, 12, 7.0, 7.4, 'm')
        for y in range(g.h):
            for x in range(g.w):
                if g.ler(x, y) == 'm':
                    if x <= 5 and y < 12:
                        g.pôr(x, y, 'M')
                    elif x >= 11 or y >= 17:
                        g.pôr(x, y, 'd' if (x + y) % 3 else 'o')
        for x, y in ((6, 7), (7, 6), (5, 9), (10, 10), (9, 14), (6, 13)):
            g.pôr(x, y, 'L')
        for dx, dy in ((10, 5), (11, 6), (12, 7), (11, 5), (12, 6), (13, 7)):
            g.pôr(dx, dy, '.')
        for x, y in ((10, 6), (11, 7), (12, 8)):
            g.pôr(x, y, 'e')
        # O osso saindo da carne, com os dois nós na ponta.
        ret(g, 7, 18, 9, 23, 'e')
        ret(g, 7, 18, 7, 23, 'E')
        ret(g, 9, 19, 9, 23, 'b')
        for cx in (6.4, 9.6):
            elipse(g, cx, 24.4, 2.0, 1.9, 'e')
        g.pôr(5, 24, 'E')
        # Um fio de molho que escorre da carne para o osso e pinga.
        gota = (0, 1, 2, 3)[k]
        ret(g, 10, 17, 10, 19 + gota // 2, 'r')
        if gota >= 2:
            g.pôr(10, 21 + gota, 'r')
        # Fumacinha subindo em curva (duas fitas que sobem e somem a cada quadro).
        for n, x0 in enumerate((5, 10)):
            fase = (k + n * 2) % 4
            y = 3 - fase
            for i in range(3):
                yy = y + i
                if 0 <= yy < 4:
                    g.pôr(x0 + (1 if (yy + k) % 2 else 0), yy, 'S' if i == 2 else 's')
        quadros.append(pintar(g.texto(), cores))
    return quadros


mao_propria('osso-dino', osso_dino(), (8, 20), 4)


def ovo_dino():
    """Ovinho de dinossauro pintado de verde: balança, trinca, a casquinha de cima levanta e um bebê põe a cabeça para fora."""
    quadros = []
    cores = {'e': '#f4ecc8', 'E': '#ffffff', 'd': '#cdbf94', 'g': '#5fb04a', 'G': '#3a8a38', 'y': '#ffe27a', 'k': '#26242e', 'b': '#7ad060', 'r': '#e8603a', 'h': '#f0c050'}
    corte = 8
    for k in range(4):
        base = Grade(13, 17)
        elipse(base, 6, 9.2, 5.2, 6.8, 'e')
        for y in range(base.h):
            for x in range(base.w):
                if base.ler(x, y) == 'e':
                    if (x * 5 + y * 3) % 11 == 0 or (x * 2 + y * 7) % 13 == 0:
                        base.pôr(x, y, 'g')
                    elif x >= 9:
                        base.pôr(x, y, 'd')
                    elif x <= 3 and y < 8:
                        base.pôr(x, y, 'E')
        if k < 2:
            g = base
            if k == 1:
                for x, y in ((4, 7), (5, 8), (6, 7), (7, 8), (8, 7)):
                    g.pôr(x, y, 'k')
        else:
            subida = 2 if k == 2 else 1
            g = Grade(13, 17)
            for y in range(base.h):
                for x in range(base.w):
                    letra = base.c[y][x]
                    if letra == '.':
                        continue
                    if y < corte:
                        if y - subida >= 0:
                            g.pôr(x, y - subida, letra)
                    else:
                        g.pôr(x, y, letra)
            for x in range(3, 10):
                g.pôr(x, corte - 1, 'k' if x in (3, 5, 7, 9) else 'd')
            elipse(g, 6, corte - 3 + subida, 3.0, 2.6, 'b')
            for x in (5, 7):
                g.pôr(x, corte - 4 + subida, 'y')
                g.pôr(x, corte - 3 + subida, 'k')
            if k == 3:
                g.pôr(6, corte - 2 + subida, 'r')
            ret(g, 4, corte - 6 + subida, 8, corte - 6 + subida, 'h')
            ret(g, 5, corte - 7 + subida, 7, corte - 7 + subida, 'h')
            ret(g, 5, corte - 6 + subida, 7, corte - 6 + subida, 'r')
        quadros.append(pintar(g.texto(), cores))
    return quadros


mao_propria('ovo-dino', ovo_dino(), (6, 15), 3)


# --- Tecido -----------------------------------------------------------------------------------------------------------------

def tecido_pele_dino():
    """Pele de dinossauro: escamas verdes em fileiras desencontradas, com uma manchinha laranja de vez em quando."""
    cores = {'a': '#2f8a3a', 'b': '#4cae4a', 'c': '#9ae878', 'd': '#1c5a2a', 'o': '#e8a030'}
    base = [['a'] * 8 for _ in range(8)]
    for fileira in range(2):
        for coluna in range(-1, 2):
            cx = 8 * coluna + 4 * (fileira % 2) + 3.5
            cy = 4 * fileira + 0.5
            for yy in range(8):
                for xx in range(8):
                    for ox in (0, 8):
                        for oy in (0, 8):
                            x, y = xx + ox, yy + oy
                            dist = math.hypot(x - cx, y - cy)
                            if dist > 4.2 or y < cy - 0.4:
                                continue
                            base[yy][xx] = 'd' if dist > 3.5 else 'b' if dist > 1.9 else 'c'
    base[2][2] = 'o'
    base[6][6] = 'o'
    return ladrilho([''.join(linha) for linha in base], cores)


tecido('pele-dino', tecido_pele_dino())
TECIDOS_PROPRIOS['pele-dino'] = True


# --- Terreiros --------------------------------------------------------------------------------------------------------------

def paleta(*hexes):
    return list(hexes)


def peca(rows, **cores):
    return {'rows': rows, 'colors': cores}


def terreno_proprio(id_, paleta_):
    terreno(id_, paleta_)
    TERRENOS_PROPRIOS[id_] = True


import tema_dino_terrenos  # noqa: E402,F401  (os terreiros registram-se em TERRENOS_NOVOS)
import tema_dino_lados  # noqa: E402,F401  (os cenários registram-se em LADOS)
