"""Ferramentas comuns dos temas novos da loja (dinossauros, Halloween e terra de zumbis): formas básicas em grades de letras e o
registro dos itens de cenário (`LADOS`), que o exportador põe ao lado da fogueira como os outros enfeites.

Cada tema (art/tema_dino.py, art/tema_halloween.py, art/tema_zumbi.py) registra os chapéus, itens de mão, tecidos e terreiros nos
mesmos dicionários de art/itens_novos.py e guarda os cenários no próprio `LADOS`.
"""

import math

import sprites
import itens_novos
from itens_novos import Grade, elipse, pintar


def ret(g, x0, y0, x1, y1, letra):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g.pôr(x, y, letra)


def lin(g, x0, y0, x1, y1, letra):
    passos = max(abs(x1 - x0), abs(y1 - y0), 1)
    for i in range(passos + 1):
        t = i / passos
        g.pôr(round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t), letra)


def grade(linhas, x, y, g, letra_por_letra=None):
    """Cola linhas de letras na grade `g` a partir de (x, y); `.` não pinta e `letra_por_letra` troca letras."""
    for dy, linha in enumerate(linhas):
        for dx, letra in enumerate(linha):
            if letra != '.':
                g.pôr(x + dx, y + dy, (letra_por_letra or {}).get(letra, letra))


def grosso(g, x0, y0, x1, y1, letra, raio=1.0):
    """Linha grossa: um pincel redondo de `raio` pixels passeia de (x0, y0) até (x1, y1)."""
    passos = max(int(abs(x1 - x0)), int(abs(y1 - y0)), 1) * 2
    for i in range(passos + 1):
        t = i / passos
        cx, cy = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        for y in range(int(cy - raio - 1), int(cy + raio + 2)):
            for x in range(int(cx - raio - 1), int(cx + raio + 2)):
                if (x - cx) ** 2 + (y - cy) ** 2 <= raio * raio + 0.25:
                    g.pôr(x, y, letra)


class Deslocada:
    """Uma janela deslocada de uma Grade: tudo o que as funções de desenho pintam em (x, y) cai em (x + dx, y + dy) da grade de verdade (o que sai fora é cortado)."""

    def __init__(self, g, dx=0, dy=0):
        self.g, self.dx, self.dy = g, dx, dy
        self.w, self.h = g.w, g.h

    def pôr(self, x, y, letra):
        self.g.pôr(x + self.dx, y + self.dy, letra)

    def ler(self, x, y):
        return self.g.ler(x + self.dx, y + self.dy)


def cortar_linhas(g, a, b):
    """Tira as linhas a..b-1 da grade (para encurtar um desenho por uma parte lisa, como as canelas de uma perna)."""
    del g.c[a:b]
    g.h = len(g.c)


def cortar_colunas(g, a, b):
    """Tira as colunas a..b-1 da grade."""
    for linha in g.c:
        del linha[a:b]
    g.w = len(g.c[0])


LETRAS = {
    'H': ['101', '101', '111', '101', '101'], 'N': ['111', '101', '101', '101', '101'], 'T': ['111', '010', '010', '010', '010'],
    'U': ['101', '101', '101', '101', '111'], 'V': ['101', '101', '101', '101', '010'], 'W': ['101', '101', '111', '111', '101'],
    'X': ['101', '101', '010', '101', '101'], 'Y': ['101', '101', '010', '010', '010'], 'Z': ['111', '001', '010', '100', '111'],
    'K': ['101', '101', '110', '101', '101'], 'Q': ['010', '101', '101', '111', '011'], '!': ['010', '010', '010', '000', '010'],
    ' ': ['000'] * 5, '?': ['110', '001', '010', '000', '010'], '-': ['000', '000', '111', '000', '000'], '.': ['000', '000', '000', '000', '010'],
}


def mini_texto(g, palavra, x, y, letra):
    """Texto minúsculo (letras de 3x5 pixels, espaço de 4) para placas e plaquinhas; usa as letras da fonte do jogo e as que faltam nela."""
    from scene import FONT
    for i, ch in enumerate(palavra):
        glifo = LETRAS.get(ch) or FONT.get(ch)
        if not glifo:
            continue
        for dy, linha in enumerate(glifo):
            for dx, bit in enumerate(linha):
                if bit == '1':
                    g.pôr(x + i * 4 + dx, y + dy, letra)


def poligono(g, pontos, letra):
    """Preenche um polígono (lista de (x, y)) pelo método do cruzamento de linhas."""
    ys = [p[1] for p in pontos]
    for y in range(int(min(ys)), int(max(ys)) + 1):
        cruzamentos = []
        for (x0, y0), (x1, y1) in zip(pontos, pontos[1:] + pontos[:1]):
            if y0 == y1:
                continue
            if min(y0, y1) <= y + 0.5 < max(y0, y1):
                cruzamentos.append(x0 + (y + 0.5 - y0) * (x1 - x0) / (y1 - y0))
        cruzamentos.sort()
        for a, b in zip(cruzamentos[::2], cruzamentos[1::2]):
            for x in range(round(a), round(b)):
                g.pôr(x, y, letra)


def triangulo(g, cx, topo, base_y, meia_base, letra):
    """Triângulo de ponta para cima: a ponta em (cx, topo) e a base em `base_y` com `meia_base` pixels para cada lado."""
    altura = max(1, base_y - topo)
    for y in range(topo, base_y + 1):
        meia = round(meia_base * (y - topo) / altura)
        for x in range(cx - meia, cx + meia + 1):
            g.pôr(x, y, letra)


def sombrear(g, escura, clara, so_em):
    """Luz no alto e à esquerda, sombra embaixo e à direita, só nas letras de `so_em` (um pixel para dentro da borda)."""
    cópia = [linha[:] for linha in g.c]
    for y in range(g.h):
        for x in range(g.w):
            letra = cópia[y][x]
            if letra not in so_em:
                continue
            cima = y == 0 or cópia[y - 1][x] == '.'
            esq = x == 0 or cópia[y][x - 1] == '.'
            baixo = y == g.h - 1 or cópia[y + 1][x] == '.'
            dir_ = x == g.w - 1 or cópia[y][x + 1] == '.'
            if (baixo or dir_) and not (cima or esq):
                g.pôr(x, y, escura)
            elif (cima or esq) and not (baixo or dir_):
                g.pôr(x, y, clara)


def quadros_de(fabrica, n):
    """Chama `fabrica(k)` para k de 0 a n-1 e devolve a lista de imagens (cada uma já com contorno)."""
    return [fabrica(k) for k in range(n)]


def tecido(id_, ladrilho_):
    """Registra um tecido novo (um ladrilho de letras da paleta geral, de `itens_novos.ladrilho`)."""
    itens_novos.TECIDOS[id_] = ladrilho_
    sprites.FABRICS[id_] = ladrilho_


def contornar(g, letra):
    """Uma grade maior em 1 pixel de cada lado, com um contorno da `letra` em volta do desenho."""
    h = Grade(g.w + 2, g.h + 2)
    for y in range(g.h):
        for x in range(g.w):
            if g.c[y][x] != '.':
                h.pôr(x + 1, y + 1, g.c[y][x])
    for y in range(h.h):
        for x in range(h.w):
            if h.c[y][x] == '.' and any(h.ler(x + dx, y + dy) not in ('.', '#') for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                h.c[y][x] = '#'
    for y in range(h.h):
        for x in range(h.w):
            if h.c[y][x] == '#':
                h.c[y][x] = letra
    return h


def peca_de(g, /, **cores):
    """Uma peça de terreiro (`{rows, colors}`, uma letra por cor) a partir de uma grade."""
    return {'rows': g.texto().split(chr(10)), 'colors': cores}


def terreno(id_, paleta_):
    """Registra um terreiro novo (a paleta do gerador de ilhas do jogo, como as de itens_novos.TERRENOS_NOVOS)."""
    itens_novos.TERRENOS_NOVOS[id_] = paleta_


def novo_registro():
    """Um dicionário de cenários: `lado(id, quadros, fps)` guarda; o exportador lê `LADOS`."""
    lados = {}

    def lado(id_, quadros, fps=4):
        lados[id_] = {'quadros': quadros, 'fps': fps}

    return lados, lado


__all__ = ['contornar', 'peca_de', 'Deslocada', 'cortar_linhas', 'cortar_colunas', 'Grade', 'elipse', 'pintar', 'math', 'ret', 'lin', 'grosso', 'mini_texto', 'poligono', 'grade', 'triangulo', 'sombrear', 'quadros_de', 'novo_registro', 'tecido', 'terreno']
