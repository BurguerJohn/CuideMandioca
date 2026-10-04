"""Bingo: a cena do globo (src/bingo.js): a parede de tábuas com bandeirinhas, a mesa do locutor com o cavalete do globo e a bandeja das
últimas bolas, e as bolas numeradas em três cores (a janela desenha a gaiola girando e os números).
"""

import ambiente as amb
import janelas
from casa import Tela
from render import outline

W, H = 176, 76
GLOBO = (46, 33, 22)                 # centro x, centro y e raio da gaiola
BANDEJA = (84, 52)                   # canto de cima à esquerda da bandeja; as casas ficam de 18 em 18 pixels
CASAS = 5
CORES = [('#3a78d8', '#9ac0ff', '#1a3a8a'), ('#e0343e', '#ff9aa0', '#8a1a2e'), ('#35a03a', '#a8f0a0', '#155428')]


def fundo():
    t = Tela(W, H)
    amb.ceu(t, 0, 0, W - 1, H - 1, ['#1a1430', '#221a3c', '#2a2048'])
    for x in range(0, W, 11):
        t.rect(x, 0, x, H - 1, '#150f28')
        t.rect(x + 1, 0, x + 1, H - 1, '#2e2452')
    amb.luz(t, 46, 30, 44, 30, '#ffb050', 0.3, 5)
    amb.luz(t, 130, 30, 40, 26, '#ffb050', 0.2, 4)
    # Bandeirinhas no alto.
    cores = ['#ee2f3c', '#ffd21e', '#35a03a', '#3a6cf0', '#ff4f9e', '#ff8a12']
    t.rect(0, 3, W - 1, 3, '#2a1810')
    for k, x in enumerate(range(3, W - 3, 8)):
        c = cores[k % len(cores)]
        t.rect(x, 4, x + 2, 5, c)
        t.put(x + 1, 6, c)
    # A mesa de madeira embaixo e a sombra de tudo.
    t.rect(0, 64, W - 1, H - 1, '#6e3c1c')
    t.rect(0, 64, W - 1, 66, '#a66a34')
    t.rect(0, 64, W - 1, 64, '#d8a060')
    for x in range(0, W, 12):
        t.rect(x, 67, x, H - 1, '#4a2410')
    # O cavalete do globo: pés em A, eixo e a base.
    gx, gy, gr = GLOBO
    t.line(gx - 14, 64, gx - 4, gy + gr - 2, '#4a2c18')
    t.line(gx - 13, 64, gx - 3, gy + gr - 2, '#8a5a34')
    t.line(gx + 14, 64, gx + 4, gy + gr - 2, '#4a2c18')
    t.line(gx + 13, 64, gx + 3, gy + gr - 2, '#8a5a34')
    t.rect(gx - 17, 62, gx + 17, 64, '#5c3820')
    t.rect(gx - 17, 62, gx + 17, 62, '#b07a48')
    amb.sombra(t, gx, 66, 22, 2, 0.4, '#04020c')
    # A bandeja das últimas bolas: cinco casas fundas na madeira.
    bx, by = BANDEJA
    t.rect(bx - 3, by - 3, bx + CASAS * 18 - 3, by + 16, '#3a2210')
    t.rect(bx - 2, by - 2, bx + CASAS * 18 - 4, by + 15, '#6a4224')
    for i in range(CASAS):
        t.rect(bx + i * 18, by, bx + i * 18 + 13, by + 13, '#1e1208')
        t.rect(bx + i * 18 + 1, by + 1, bx + i * 18 + 12, by + 12, '#2e1c10')
        t.rect(bx + i * 18, by + 14, bx + i * 18 + 13, by + 14, '#8a5a34')
    # A rampa de onde a bola sai do globo até a primeira casa.
    t.line(gx + gr - 4, gy + 6, bx + 2, by - 4, '#c8ccd6')
    t.line(gx + gr - 4, gy + 8, bx + 2, by - 2, '#7a7a90')
    t.line(gx + gr - 4, gy + 9, bx + 2, by - 1, '#4a4a60')
    return t.im


def bola(cor):
    """Uma bola de bingo de 11 x 11: casca colorida com brilho em cima (o número é escrito por cima, em branco)."""
    base, luz, sombra = cor
    t = Tela(11, 11)
    janelas.elipse(t, 5, 5, 5, 5, base, sombra)
    t.rect(3, 1, 5, 1, luz)
    t.rect(2, 2, 3, 3, luz)
    return outline(t.im)


def bolas():
    return [bola(c) for c in CORES]


def exportar(add):
    return {
        'fundo': add('bingo-fundo', fundo()),
        'bolas': add('bingo-bolas', bolas()),
        'globo': list(GLOBO), 'bandeja': list(BANDEJA), 'casas': CASAS, 'w': W, 'h': H,
    }
