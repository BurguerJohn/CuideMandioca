"""Pescaria: a cena da barraca que aparece na tela da Pescaria (src/pescaria.js): a barraca de lona azul e branca com lampiões, a placa,
o tanque redondo de água e os peixinhos de papel (cada um com a argolinha de metal) que boiam nele, mais a boia da linha.
"""

import math
import random

import ambiente as amb
import janelas
from casa import Tela, rgb
from render import outline
from scene import FONT

W, H = 176, 92
AGUA = (88, 58, 56, 11)             # centro x, centro y, meio-largura e meia-altura da superfície da água
VARA = (160, 4)                      # onde a vara se apoia (ponta de cima)
LAMPIOES = [(22, 28), (154, 28)]
PEIXES = [('#ee4c4c', '#ff9a9a'), ('#ffd21e', '#fff07a'), ('#3fa0f0', '#a8d8ff'), ('#ff6ab0', '#ffc0e0'), ('#46c860', '#a8f0b0'), ('#b07af0', '#dcc0ff')]


def letra(t, ch, x, y, cor):
    for dy, linha in enumerate(FONT[ch]):
        for dx, bit in enumerate(linha):
            if bit == '1':
                t.put(x + dx, y + dy, cor)


def fundo():
    t = Tela(W, H)
    # Parede de tábuas de noite, com a luz quente dos lampiões.
    amb.ceu(t, 0, 0, W - 1, H - 1, ['#1a1430', '#221a3c', '#2a2048'])
    for x in range(0, W, 11):
        t.rect(x, 0, x, H - 1, '#150f28')
    for x in range(0, W, 11):
        t.rect(x + 1, 0, x + 1, H - 1, '#2e2452')
    for lx, ly in LAMPIOES:
        amb.luz(t, lx, ly, 34, 28, '#ffb050', 0.34, 5)
    # Toldo de lona azul e branca com a barra recortada e uma fileira de bandeirinhas.
    for x in range(W):
        cor = '#3a6cc8' if (x // 8) % 2 == 0 else '#f4f4ec'
        sombra = '#2a4c98' if (x // 8) % 2 == 0 else '#c8c8c0'
        t.rect(x, 0, x, 7, cor)
        t.rect(x, 7, x, 8, sombra)
        t.rect(x, 9, x, 9 + (3 if (x % 8) in (2, 3, 4, 5) else 1), cor)
    t.rect(0, 0, W - 1, 0, '#8ab4ff')
    cores = ['#ee2f3c', '#ffd21e', '#35a03a', '#3a6cf0', '#ff4f9e', '#ff8a12']
    for k, x in enumerate(range(4, W - 4, 9)):
        c = cores[k % len(cores)]
        t.rect(x, 14, x + 2, 15, c)
        t.put(x + 1, 16, c)
    t.rect(0, 13, W - 1, 13, '#2a1810')
    # Placa de madeira com PESCARIA, pendurada por duas correntes.
    t.rect(54, 17, 122, 31, '#3a2210')
    t.rect(55, 18, 121, 30, '#8a5a34')
    t.rect(55, 18, 121, 18, '#b98048')
    t.rect(56, 20, 120, 29, '#4a2c18')
    for k, ch in enumerate('PESCARIA'):
        letra(t, ch, 60 + k * 7, 22, '#ffd860')
    t.rect(58, 14, 58, 17, '#7a7a90')
    t.rect(118, 14, 118, 17, '#7a7a90')
    # Lampiões nas pontas.
    for lx, ly in LAMPIOES:
        t.rect(lx, 14, lx, ly - 4, '#2a1c18')
        t.rect(lx - 3, ly - 4, lx + 3, ly + 4, '#2a1c18')
        t.rect(lx - 2, ly - 3, lx + 2, ly + 3, '#ffd860')
        t.rect(lx - 1, ly - 2, lx + 1, ly - 1, '#fff6c0')
        t.rect(lx - 3, ly + 4, lx + 3, ly + 5, '#6a4a28')
    # O balcão de madeira na frente e a sombra do tanque.
    t.rect(0, 76, W - 1, H - 1, '#6e3c1c')
    t.rect(0, 76, W - 1, 78, '#a66a34')
    t.rect(0, 76, W - 1, 76, '#d8a060')
    for x in range(0, W, 12):
        t.rect(x, 79, x, H - 1, '#4a2410')
    amb.sombra(t, 88, 76, 62, 4, 0.4, '#04020c')
    # O tanque: corpo azul esmaltado com listras e pintinhas, aro de metal e a água por cima.
    cx, cy, rx, ry = AGUA
    for y in range(cy, 76):
        frac = (y - cy) / (76 - cy)
        meia = rx + 2 - round(4 * frac ** 2 * 6)
        t.rect(cx - meia, y, cx + meia, y, '#2a6ac8' if (y // 4) % 2 == 0 else '#2058b0')
        t.put(cx - meia, y, '#6aa4f0')
        t.put(cx + meia, y, '#16408a')
    for k in range(10):
        a = (k + 0.5) / 10
        px = round(cx - rx + 10 + a * (2 * rx - 20))
        t.rect(px - 1, 66, px + 1, 67, '#f4f4ec')
        t.put(px, 65, '#f4f4ec')
    janelas.elipse(t, cx, cy, rx + 3, ry + 2, '#c8ccd6', '#8a8e9c')
    janelas.elipse(t, cx, cy, rx, ry, '#2a98d8')
    janelas.elipse(t, cx, cy + 1, rx - 3, ry - 3, '#4ab8f0')
    # Água com brilho do alto (a janela acrescenta as ondas que se mexem).
    for y in range(cy - ry + 1, cy + ry):
        for x in range(cx - rx + 2, cx + rx - 1):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 0.92 and (x * 3 + y * 7) % 11 == 0:
                t.put(x, y, '#a8e4ff')
    for dx in range(-30, -8):
        t.put(cx + dx, cy - ry + 3, '#d8f4ff')
    return t.im


def peixinho(cor, clara, quadro):
    """Um peixinho de papel de 11 x 7 (cauda para cima ou para baixo no quadro 1), com a argolinha de metal na boca, para boiar no tanque."""
    t = Tela(11, 8)
    for x in range(2, 9):
        meia = 2 if 3 <= x <= 6 else 1
        t.rect(x, 4 - meia, x, 4 + meia, cor)
    t.rect(3, 2, 5, 2, clara)
    t.put(7, 3, '#26242e')
    cauda = 1 if quadro else 0
    t.rect(0, 2 + cauda, 1, 5 + cauda, cor)
    t.put(0, 3 + cauda, clara)
    t.rect(9, 4, 10, 4, '#c8ccd6')          # a argolinha
    t.put(10, 3, '#8a8e9c')
    t.put(10, 5, '#8a8e9c')
    return outline(t.im)


def peixes():
    return [peixinho(cor, clara, q) for cor, clara in PEIXES for q in range(2)]


def boia():
    """A boia da linha: bolinha vermelha e branca com o pino de cima, 2 quadros (parada e afundando)."""
    quadros = []
    for q in range(2):
        t = Tela(7, 10)
        t.rect(3, 0, 3, 3, '#f4f4ec')
        altura = 4 if q == 0 else 6
        for y in range(altura, altura + 4):
            t.rect(1, y, 5, y, '#ee2f3c' if y < altura + 2 else '#f4f4ec')
        t.rect(2, altura - 1, 4, altura - 1, '#ee2f3c')
        t.rect(2, altura + 4, 4, altura + 4, '#c8c8c0')
        t.put(2, altura, '#ffb0b0')
        quadros.append(outline(t.im))
    return quadros


def exportar(add):
    return {
        'fundo': add('pescaria-fundo', fundo()),
        'peixes': {**add('pescaria-peixes', peixes()), 'cores': [cor for cor, _ in PEIXES]},
        'boia': add('pescaria-boia', boia()),
        'agua': list(AGUA), 'vara': list(VARA), 'lampioes': [list(p) for p in LAMPIOES], 'w': W, 'h': H,
    }
