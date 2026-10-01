"""Ferramentas das ilustrações do Cordel da Mandioca (as 20 páginas, art/livro_a.py a livro_d.py).

Cada página é uma classe com `fundo(t)` (o que não mexe, desenhado uma vez) e `animar(t, k, r)` (o que mexe: `k` é o quadro do laço, de 0 a
3, e `r` o quadro da reação ao clique, de 0 a 3, ou None). O exportador junta 4 quadros do laço e 4 da reação em cada página. A Mandioca e os
personagens da turma entram por cima, no jogo, nas posições que cada página declara (`heroi` e `elenco`).
"""

import functools
import math
import random

from PIL import Image

import casa
from casa import Tela

# Cores repetidas o tempo todo: guardar a conversão de texto para RGB deixa as 160 telas muito mais rápidas.
casa.rgb = functools.lru_cache(maxsize=None)(casa.rgb)

W, H = 224, 112
PAGINAS = {}

BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def pagina(numero, heroi, ponto, elenco=(), pose='danca'):
    """Registra a classe da página: `heroi` = (x do centro, y dos pés, maior tamanho da Mandioca, 0 a 3), `ponto` = o retângulo que se
    clica (x, y, w, h) e `elenco` = quem da turma aparece (id, x do centro, y dos pés, espelhar)."""
    def registrar(classe):
        classe.numero = numero
        classe.heroi = heroi
        classe.ponto = ponto
        classe.elenco = list(elenco)
        classe.pose = pose
        PAGINAS[numero] = classe
        return classe
    return registrar


def copiar(t):
    novo = Tela(t.w, t.h)
    novo.im = t.im.copy()
    novo.px = novo.im.load()
    return novo


# --- Cores e degradês --------------------------------------------------------------------------------------------------------
def mix(a, b, f):
    a, b = casa.rgb(a), casa.rgb(b)
    return tuple(round(a[i] + (b[i] - a[i]) * f) for i in range(3))


def degrade(t, y0, y1, cores, x0=0, x1=W - 1):
    """Degradê vertical em tramado (cada faixa mistura a cor de cima com a de baixo em pontinhos), do jeito de pixel art."""
    n = len(cores) - 1
    for y in range(y0, y1 + 1):
        v = (y - y0) / max(1, y1 - y0) * n
        i = min(n - 1, int(v))
        f = v - i
        for x in range(x0, x1 + 1):
            t.put(x, y, cores[i + 1] if f > (BAYER[y % 4][x % 4] + 0.5) / 16 else cores[i])


def degrade_h(t, x0, x1, y0, y1, cores):
    """Degradê horizontal em tramado."""
    n = len(cores) - 1
    for x in range(x0, x1 + 1):
        v = (x - x0) / max(1, x1 - x0) * n
        i = min(n - 1, int(v))
        f = v - i
        for y in range(y0, y1 + 1):
            t.put(x, y, cores[i + 1] if f > (BAYER[y % 4][x % 4] + 0.5) / 16 else cores[i])


# --- Formas ----------------------------------------------------------------------------------------------------------------------
def disco(t, cx, cy, r, cor, sombra=None, luz=None):
    """Círculo cheio; `sombra` pinta a parte de baixo e à direita, `luz` a de cima e à esquerda."""
    for y in range(int(cy - r) - 1, int(cy + r) + 2):
        for x in range(int(cx - r) - 1, int(cx + r) + 2):
            d = math.hypot(x - cx, y - cy)
            if d <= r:
                c = cor
                if sombra and (x - cx) * 0.5 + (y - cy) * 0.8 > r * 0.55:
                    c = sombra
                elif luz and (x - cx) * 0.6 + (y - cy) * 0.8 < -r * 0.55:
                    c = luz
                t.put(x, y, c)


def elipse(t, cx, cy, rx, ry, cor, sombra=None, luz=None):
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                c = cor
                if sombra and (y - cy) / ry > 0.35:
                    c = sombra
                elif luz and (y - cy) / ry < -0.5 and (x - cx) / rx < 0.2:
                    c = luz
                t.put(x, y, c)


def anel(t, cx, cy, r, cor, esp=1):
    for y in range(int(cy - r) - 2, int(cy + r) + 3):
        for x in range(int(cx - r) - 2, int(cx + r) + 3):
            if r - esp < math.hypot(x - cx, y - cy) <= r:
                t.put(x, y, cor)


def poligono(t, pontos, cor):
    """Polígono cheio (varredura por linha)."""
    ys = [p[1] for p in pontos]
    for y in range(int(min(ys)), int(max(ys)) + 1):
        xs = []
        for i in range(len(pontos)):
            (x0, y0), (x1, y1) = pontos[i], pontos[(i + 1) % len(pontos)]
            if y0 == y1:
                continue
            if min(y0, y1) <= y + 0.5 < max(y0, y1):
                xs.append(x0 + (x1 - x0) * (y + 0.5 - y0) / (y1 - y0))
        xs.sort()
        for i in range(0, len(xs) - 1, 2):
            for x in range(round(xs[i]), round(xs[i + 1]) + 1):
                t.put(x, y, cor)


def ruido(t, x0, y0, x1, y1, quantos, semente, cores):
    g = random.Random(semente)
    for _ in range(quantos):
        t.put(g.randrange(x0, x1 + 1), g.randrange(y0, y1 + 1), g.choice(cores))


def grade(t, linhas, x, y, legenda, espelho=False):
    """Linhas de letras (`.` é vazio) com a legenda {letra: cor}."""
    for dy, linha in enumerate(linhas):
        if espelho:
            linha = linha[::-1]
        for dx, letra in enumerate(linha):
            if letra != '.':
                t.put(x + dx, y + dy, legenda[letra])


# --- Céu, terra e coisas grandes --------------------------------------------------------------------------------------------------------
def estrelas(t, quantas, semente, y0=0, y1=60, k=None, cores=('#fff6e0', '#ffe27a', '#bcd0ff')):
    """Estrelas fixas; com `k` (0 a 3), algumas piscam (somem em certos quadros)."""
    g = random.Random(semente)
    for i in range(quantas):
        x, y = g.randrange(2, W - 2), g.randrange(y0, y1)
        cor = g.choice(cores)
        if k is not None and i % 4 == (k % 4):
            t.put(x, y, mix(cor, '#000000', 0.5))
            continue
        t.put(x, y, cor)
        if i % 9 == 0:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                t.put(x + dx, y + dy, mix(cor, '#000000', 0.45))


def nuvem(t, x, y, esc=1.0, cor='#ffffff', sombra='#d4e2f4'):
    for dx, dy, rx, ry in ((0, 0, 10, 5), (-9, 2, 7, 4), (9, 2, 8, 4), (3, -3, 7, 5)):
        elipse(t, x + dx * esc, y + dy * esc, rx * esc, ry * esc, cor, sombra)


def sol(t, cx, cy, r, cor='#fff0a0', aura='#ffd870', k=0, raios=10):
    for i in range(raios):
        ang = i * 2 * math.pi / raios + 0.2
        comp = r + 5 + (3 if (i + k) % 2 else 0)
        for d in range(r + 2, comp + 1):
            t.put(cx + round(math.cos(ang) * d), cy + round(math.sin(ang) * d), aura)
    disco(t, cx, cy, r + 1, aura)
    disco(t, cx, cy, r, cor)


def lua(t, cx, cy, r, cor='#fff4c0', sombra='#e6d38e', crateras='#ecdc9c'):
    disco(t, cx, cy, r, cor)
    for dx, dy, rr in ((-r * 0.35, -r * 0.3, r * 0.22), (r * 0.3, r * 0.25, r * 0.28), (r * 0.25, -r * 0.45, r * 0.14), (-r * 0.2, r * 0.45, r * 0.13)):
        disco(t, cx + dx, cy + dy, rr, crateras)
    for y in range(int(cy - r), int(cy + r) + 1):
        for x in range(int(cx - r), int(cx + r) + 1):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r and x - cx > r * 0.6:
                t.put(x, y, sombra)


def colinas(t, base, amp, per, cor, fase=0.0, fundo=H, cor2=None):
    for x in range(W):
        y = base - amp * (0.5 + 0.5 * math.sin(x / per + fase)) - amp * 0.3 * math.sin(x / (per * 0.43) + fase * 2)
        t.rect(x, round(y), x, fundo, cor)
        if cor2:
            t.put(x, round(y), cor2)


def chao(t, y0, cor, cor2, cor3, semente=2, y1=H - 1):
    t.rect(0, y0, W - 1, y1, cor)
    ruido(t, 0, y0 + 1, W - 1, y1, 280, semente, [cor2, cor3, cor2])
    for x in range(W):
        t.put(x, y0, cor3)


def arvore(t, x, base, alto, copa, copa2, tronco='#5a3a22', largura=3, brilho=None):
    t.rect(x - largura // 2, base - alto // 2, x + largura // 2, base, tronco)
    elipse(t, x, base - alto * 0.68, alto * 0.38, alto * 0.34, copa, copa2, brilho)
    ruido(t, x - alto // 3, round(base - alto), x + alto // 3, round(base - alto * 0.5), alto, x, [copa2, copa])


def pinheiro(t, x, base, alto, cor, claro):
    for k in range(alto):
        meia = 1 + (k * 5) // max(1, alto) + k // 3
        t.rect(x - meia, base - alto + k, x + meia, base - alto + k, cor if (k // 2) % 2 else claro)
    t.rect(x, base, x, base + 2, '#3a2418')


def casinha(t, x, y, w, h, parede='#f4e4c0', telhado='#c8483a', porta='#6e3c1c', janela='#ffe27a', fumaca=False):
    """Casinha com telhado de duas águas: (x, y) é o canto de cima à esquerda da parede."""
    t.rect(x, y, x + w - 1, y + h - 1, parede)
    t.rect(x, y + h - 2, x + w - 1, y + h - 1, mix(parede, '#000000', 0.18))
    for k in range(w // 2 + 2):
        t.rect(x - 2 + k, y - 1 - k // 1 if k < 8 else y - 8, x + w + 1 - k, y - 1 - k // 1 if k < 8 else y - 8, telhado if k % 3 else mix(telhado, '#000000', 0.2))
    t.rect(x + w // 2 - 3, y + h - 12, x + w // 2 + 2, y + h - 1, porta)
    t.rect(x + 3, y + 5, x + 8, y + 10, janela)
    t.rect(x + 5, y + 5, x + 5, y + 10, '#6e3c1c')
    t.rect(x + 3, y + 7, x + 8, y + 7, '#6e3c1c')


def cerca(t, x0, x1, y, alt=10, cor='#9a6a38', luz='#c08850', passo=12):
    t.rect(x0, y + 2, x1, y + 3, cor)
    t.rect(x0, y + alt - 3, x1, y + alt - 2, cor)
    t.rect(x0, y + 2, x1, y + 2, luz)
    for x in range(x0 + 2, x1, passo):
        t.rect(x, y, x + 2, y + alt, cor)
        t.rect(x, y, x, y + alt, luz)
        t.put(x + 1, y - 1, luz)


# --- Fogo, luz, festa -------------------------------------------------------------------------------------------------------------------
def chama(t, cx, base, alto, larg, k, cores=('#d8301a', '#ff8a1c', '#ffd23a', '#fff6b8')):
    """Uma chama de `alto` linhas subindo de `base`; a ponta balança com o quadro `k`."""
    for i in range(alto):
        f = i / alto
        meia = larg * (0.55 + 0.45 * math.sin(math.pi * min(1.0, f * 1.15 + 0.1))) * (1 - f ** 3)
        bal = math.sin(f * 5 + k * math.pi / 2) * 1.6 * f
        for x in range(int(cx - larg - 3), int(cx + larg + 4)):
            d = abs(x - (cx + bal))
            if d <= meia:
                n = d / max(meia, 0.5)
                t.put(x, base - i, cores[3] if (n < 0.3 and f < 0.55) else cores[2] if n < 0.55 else cores[1] if n < 0.85 else cores[0])


def fogueira(t, cx, base, k, esc=1.0):
    """Fogueira de lenha em pé com chama grande e faíscas (o quadro `k` mexe as chamas)."""
    larg = 12 * esc
    for i, dx in enumerate((-10, -5, 0, 5, 10)):
        t.line(cx + dx * esc, base, cx + dx * esc * 0.15, base - 14 * esc, '#5a3418' if i % 2 else '#7a4a24')
        t.line(cx + dx * esc + 1, base, cx + dx * esc * 0.15 + 1, base - 14 * esc, '#3a2010')
    chama(t, cx - 3 * esc, base - 4, round(26 * esc), 7 * esc, k)
    chama(t, cx + 4 * esc, base - 3, round(20 * esc), 5 * esc, k + 1)
    chama(t, cx, base - 2, round(34 * esc), larg * 0.6, k + 2)
    t.rect(cx - 12 * esc, base, cx + 12 * esc, base + 1, '#3a2010')


def faiscas(t, cx, base, quantas, k, semente, alto=34, cores=('#ffd23a', '#ff8a1c', '#fff6b8')):
    g = random.Random(semente)
    for i in range(quantas):
        fase = ((k / 4) + g.random()) % 1.0
        x = cx + g.randrange(-12, 13) + round(math.sin(fase * 6 + i) * 3)
        y = base - 8 - round(fase * alto)
        t.put(x, y, cores[i % len(cores)] if fase < 0.8 else '#a8180e')


def bandeirinhas(t, x0, y0, x1, y1, k, sag=8, bal=1.5, cores=('#ee2f3c', '#ffd21e', '#35a03a', '#3a6cf0', '#ff4f9e', '#ff8a12'), passo=7):
    """Varal de bandeirinhas de (x0, y0) a (x1, y1) com a corda caindo `sag` no meio; o quadro `k` balança as pontas."""
    pontos = []
    for x in range(x0, x1 + 1):
        f = (x - x0) / max(1, x1 - x0)
        y = y0 + (y1 - y0) * f + sag * 4 * f * (1 - f)
        pontos.append((x, round(y)))
        t.put(x, round(y), '#3a2418')
    for n, (x, y) in enumerate(pontos):
        if n % passo == 3:
            cor = cores[(n // passo) % len(cores)]
            ond = round(math.sin((n + k * 2) * 0.9) * bal)
            t.rect(x - 1, y + 1, x + 1, y + 2, cor)
            t.rect(x - 1 + ond // 2, y + 3, x + 1 + ond // 2, y + 3, cor)
            t.put(x + ond, y + 4, cor)


def brilho(t, x, y, cor='#fff6b8', tam=1):
    t.put(x, y, cor)
    for d in range(1, tam + 1):
        for dx, dy in ((d, 0), (-d, 0), (0, d), (0, -d)):
            t.put(x + dx, y + dy, cor if d == 1 else mix(cor, '#000000', 0.35))


def coracao(t, x, y, cor='#ff4f9e'):
    for dx, dy in ((0, 0), (2, 0), (-1, 1), (0, 1), (1, 1), (2, 1), (3, 1), (0, 2), (1, 2), (2, 2), (1, 3)):
        t.put(x + dx, y + dy, cor)


def estrela5(t, cx, cy, r, cor='#ffd21e', borda=None):
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * 0.45
        pts.append((cx + math.cos(ang) * rr, cy + math.sin(ang) * rr))
    poligono(t, pts, cor)
    if borda:
        for i in range(10):
            t.line(pts[i][0], pts[i][1], pts[(i + 1) % 10][0], pts[(i + 1) % 10][1], borda)


def balao(t, cx, cy, esc=1.0, cor='#e8403c', cor2='#ffd23a', k=0, cesto=True, luz=True):
    """Balão de papel de gomos (cor e cor2 alternadas) com a cestinha e a vela acesa embaixo."""
    r = 13 * esc
    for y in range(int(cy - r * 1.15), int(cy + r * 0.9)):
        f = (y - (cy - r * 1.15)) / (r * 2.05)
        meia = r * math.sin(math.pi * min(1.0, f * 0.95 + 0.06)) ** 0.7
        for x in range(int(cx - meia), int(cx + meia) + 1):
            gomo = int((x - (cx - meia)) / max(1, 2 * meia) * 5)
            t.put(x, y, cor if gomo % 2 == 0 else cor2)
            if x > cx + meia * 0.55:
                t.put(x, y, mix(cor if gomo % 2 == 0 else cor2, '#000000', 0.25))
    t.line(cx - r * 0.45, cy + r * 0.85, cx - 3 * esc, cy + r * 1.4, '#6e3c1c')
    t.line(cx + r * 0.45, cy + r * 0.85, cx + 3 * esc, cy + r * 1.4, '#6e3c1c')
    if cesto:
        t.rect(cx - 4 * esc, cy + r * 1.4, cx + 4 * esc, cy + r * 1.4 + 4 * esc, '#8a5a30')
        t.rect(cx - 4 * esc, cy + r * 1.4, cx + 4 * esc, cy + r * 1.4, '#b07a44')
    if luz:
        chama(t, cx, round(cy + r * 1.05), round(6 * esc), 2 * esc, k)


# --- Pequenos bichos e peças -------------------------------------------------------------------------------------------------------------------
def borboleta(t, x, y, k, cor='#ff8ac0', cor2='#ffe27a'):
    asas = ((-2, -1), (2, -1), (-2, 0), (2, 0)) if k % 2 == 0 else ((-1, -1), (1, -1), (-1, 0), (1, 0))
    for dx, dy in asas:
        t.put(x + dx, y + dy, cor if dx < 0 else cor2)
    t.put(x, y, '#3a2a30')


def passaro(t, x, y, k, cor='#2a2a3a'):
    if k % 2 == 0:
        for dx, dy in ((-3, 0), (-2, -1), (-1, 0), (0, 0), (1, 0), (2, -1), (3, 0)):
            t.put(x + dx, y + dy, cor)
    else:
        for dx, dy in ((-3, -1), (-2, 0), (-1, 0), (0, 0), (1, 0), (2, 0), (3, -1)):
            t.put(x + dx, y + dy, cor)


def fumaca(t, x, y, k, quantas=4, cor='#e8e8f0', espaco=6):
    for i in range(quantas):
        f = ((k + i * 4 / quantas) % 4) / 4
        disco(t, x + math.sin(f * 5 + i) * 3, y - f * espaco * quantas, 2 + f * 2.2, mix(cor, '#9a9aaa', f * 0.5))


def sombra(t, cx, cy, rx, cor='#10200c', alfa=0.35):
    for x in range(int(cx - rx), int(cx + rx) + 1):
        for y in (cy, cy + 1):
            c = casa.rgb(cor)
            ant = t.px[x, y] if 0 <= x < t.w and 0 <= y < t.h else None
            if ant:
                t.put(x, y, tuple(round(ant[i] * (1 - alfa) + c[i] * alfa) for i in range(3)))


def gotas(t, x0, y0, quantas, k, alcance=10, cor='#7ad0ff'):
    for i in range(quantas):
        f = ((k + i) % 4) / 4
        t.put(x0 + i * 2 - quantas, y0 + round(f * alcance), cor)
