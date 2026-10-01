"""Páginas 1 a 5 do Cordel da Mandioca: um São João bem tradicional (o quintal, o convite, a cozinha, a fogueira e o balão)."""

import math

from livro_base import *  # noqa: F401,F403
from livro_base import W, H, pagina, degrade, elipse, disco, ruido, nuvem, sol, colinas, chao, cerca, casinha, fumaca, borboleta, brilho, mix, sombra, \
    grade, chama, fogueira, faiscas, bandeirinhas, estrelas, lua, balao, passaro, gotas, coracao, estrela5, anel, poligono, degrade_h, arvore, pinheiro


# --- Página 1: o quintal ao amanhecer ----------------------------------------------------------------------------------------------
@pagina(1, heroi=(88, 103, 3, 'danca'), ponto=(122, 84, 28, 24), elenco=[('milho', 58, 83, False)])
class P01:
    @staticmethod
    def fundo(t):
        degrade(t, 0, 70, ['#78b8ea', '#a6d6f2', '#ffe4ae', '#ffc490'])
        colinas(t, 66, 12, 21, '#9cc888', 0.5, cor2='#b4d89c')
        colinas(t, 74, 8, 15, '#6ea862', 2.0, cor2='#8cc07a')
        casinha(t, 14, 52, 30, 20, '#f6e6c4', '#c8483a')
        t.rect(34, 40, 38, 52, '#a8503a')
        cerca(t, 0, W - 1, 74, 12)
        chao(t, 84, '#8a5a34', '#6e4426', '#a8744a', 11)
        for fila, y in enumerate((92, 99, 106)):
            t.rect(0, y, W - 1, y, '#5e3a22')
            for x in range(4 + fila * 4, W, 11):
                t.put(x, y - 1, '#4aa046')
                t.put(x - 1, y - 2, '#6ac85a')
                t.put(x + 1, y - 2, '#6ac85a')
        # o canteiro da Mandioca: terra fofa mais clara
        elipse(t, 88, 104, 22, 4, '#a8744a', '#8a5a34')

    @staticmethod
    def animar(t, k, r):
        sol(t, 176, 66, 11, k=k)
        nuvem(t, 62 + (1 if k in (1, 2) else 0), 16, 1.0)
        nuvem(t, 150 - (1 if k in (2, 3) else 0), 26, 0.8)
        for i in range(3):
            passaro(t, 110 + i * 9 + k * 2, 30 + (i % 2) * 5 + (k % 2), k + i)
        fumaca(t, 36, 38, k)
        for x0, y0 in ((118, 78), (190, 88)):
            borboleta(t, round(x0 + math.sin(k * 1.6) * 6), round(y0 + math.cos(k * 1.6) * 3), k)
        P01.galo(t, 34, 71, k)
        P01.regador(t, 136, 100, r)
        P01.flores(t, r)

    @staticmethod
    def galo(t, x, y, k):
        corpo, peito, cauda = '#c8603a', '#e8924c', ('#2a9a8a', '#3ab8a0', '#1a6a6a')
        for i, (dx, dy) in enumerate(((5, -9), (7, -6), (8, -3))):
            t.line(x + 3, y - 4, x + dx + 1, y + dy, cauda[i])
            t.line(x + 4, y - 4, x + dx + 2, y + dy + 1, cauda[(i + 1) % 3])
        elipse(t, x, y - 4, 5, 4, corpo, '#a8482a')
        elipse(t, x - 2, y - 3, 3, 3, peito)
        t.line(x - 1, y, x - 1, y + 3, '#e8b030')
        t.line(x + 2, y, x + 2, y + 3, '#e8b030')
        disco(t, x - 5, y - 8 + (-1 if k in (1, 2) else 0), 2.6, peito)
        for dx in (-6, -5, -4):
            t.put(x + dx, y - 12 + (-1 if k in (1, 2) else 0) + (1 if dx == -5 else 0), '#e8283a')
        t.put(x - 6, y - 8 + (-1 if k in (1, 2) else 0), '#2a1a10')
        t.put(x - 8, y - 8 + (-1 if k in (1, 2) else 0), '#ffd23a')
        if k in (1, 2):
            t.put(x - 8, y - 6, '#ffd23a')
            t.put(x - 7, y - 6, '#e8283a')
            for i, (dx, dy) in enumerate(((-12, -10), (-13, -8), (-12, -6))):
                t.put(x + dx, y + dy, '#fff6d8')
                t.put(x + dx - 2, y + dy + (i - 1), '#fff6d8')

    @staticmethod
    def regador(t, x, y, r):
        """A regadora de lata: parada ou inclinada com a água saindo (reação)."""
        levanta = 0 if r is None else (1, 3, 3, 2)[r]
        cor, luz, sombra_ = '#7a9ab8', '#a8c4dc', '#566e88'
        yy = y - levanta
        t.rect(x - 8, yy - 12, x + 7, yy - 1, cor)
        t.rect(x - 8, yy - 12, x + 7, yy - 11, luz)
        t.rect(x + 4, yy - 12, x + 7, yy - 1, sombra_)
        t.rect(x - 8, yy - 6, x + 7, yy - 6, sombra_)
        t.line(x + 8, yy - 11, x + 12, yy - 9, sombra_)
        t.line(x + 12, yy - 9, x + 12, yy - 3, sombra_)
        t.line(x + 11, yy - 3, x + 8, yy - 3, sombra_)
        # o bico com a flor da regadora, apontado para a Mandioca
        incl = 0 if r is None else (0, 2, 3, 2)[r]
        t.line(x - 8, yy - 4, x - 15, yy - 10 - incl, cor)
        t.line(x - 8, yy - 3, x - 15, yy - 9 - incl, sombra_)
        t.rect(x - 18, yy - 12 - incl, x - 15, yy - 9 - incl, luz)
        t.rect(x - 18, yy - 12 - incl, x - 18, yy - 9 - incl, sombra_)
        if r is not None:
            ox, oy = x - 19, yy - 9 - incl
            for i in range(14):
                f = i / 13
                px = ox - f * 22
                py = oy + f * 14 + (1 - f) * -3 * (1 - f) + f * f * 8
                if (i + r) % 2 == 0 or i > 9:
                    t.put(px, py, '#7ad0ff')
                t.put(px, py + 1, '#bde9ff') if i % 3 == r % 3 else None

    @staticmethod
    def flores(t, r):
        """Depois de molhar, a terrinha do canteiro brota flores (crescem a cada quadro da reação)."""
        if r is None:
            return
        for i, x in enumerate((70, 76, 100, 106, 112)):
            alt = min(r + 1, 4) + (i % 2)
            if alt < 2:
                continue
            t.line(x, 104, x, 104 - alt, '#4aa046')
            cor = ('#ff8ac0', '#7ac8ff', '#ffe27a', '#ff6a6a', '#c8a0ff')[i]
            t.put(x, 104 - alt - 1, cor)
            t.put(x - 1, 104 - alt, cor)
            t.put(x + 1, 104 - alt, cor)
            t.put(x, 104 - alt, '#fff6d8')
