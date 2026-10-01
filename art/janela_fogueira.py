"""Fogueira de Perto: a clareira à noite (pinheiros, pedras em volta do fogo, bancos de tronco, pilha de lenha), as comidas dos
espetos em 4 pontos (crua, dourando, no ponto, queimada) e o termômetro do fogo. O fogo vem dos sprites da festa.
"""

import math
import random

import janelas
from casa import Tela, rgb
from render import outline

W, H = 176, 112
FOGO = (88, 94)                        # onde fica o pé do fogo
PONTAS = [(72, 76), (70, 90), (106, 90), (104, 76)]      # a ponta de cada espeto (onde a comida fica)
CABOS = [(14, 58), (10, 94), (166, 94), (162, 58)]       # o cabo de cada espeto
LENHA = (136, 82, 168, 104)            # a pilha de lenha (x0, y0, x1, y1)
MENU_Y = 98
COMIDAS = ['milho', 'batata', 'linguica', 'queijo']
ESTADOS = ['cru', 'dourando', 'ponto', 'queimado']

CORES = {
    'milho': [('#f8e8a0', '#e8d078'), ('#f4c850', '#d8a028'), ('#e8a030', '#a86a18'), ('#2a2420', '#14100e')],
    'batata': [('#9a6aa8', '#6a3a78'), ('#b8806a', '#8a5a48'), ('#e8883a', '#a85a1c'), ('#2a2420', '#14100e')],
    'linguica': [('#e8a0a0', '#c86a6a'), ('#d8683a', '#a83a1c'), ('#9a4a2a', '#5a2a14'), ('#2a2420', '#14100e')],
    'queijo': [('#fff0c8', '#e8d8a0'), ('#f8d878', '#d8b048'), ('#e8a838', '#a87018'), ('#2a2420', '#14100e')],
}


def comida(nome, estado):
    """A comida no espeto (16x10): `nome` no `estado` (0 crua, 1 dourando, 2 no ponto, 3 queimada)."""
    t = Tela(16, 10)
    cor, sombra = CORES[nome][estado]
    if nome == 'milho':
        t.rect(2, 2, 13, 7, cor)
        t.rect(2, 7, 13, 7, sombra)
        for x in range(3, 13, 2):
            for y in (3, 5):
                t.put(x, y, sombra if estado < 3 else '#4a4038')
        t.rect(0, 3, 2, 6, '#7ab048' if estado < 3 else '#2a3a24')   # palha
        t.rect(13, 4, 15, 5, '#7ab048' if estado < 3 else '#2a3a24')
    elif nome == 'batata':
        t.rect(2, 3, 13, 7, cor)
        t.rect(1, 4, 14, 6, cor)
        t.rect(2, 7, 13, 7, sombra)
        t.rect(3, 3, 8, 3, sombra if estado == 3 else '#c8a0d8' if estado == 0 else '#e8b878')
        if estado == 2:
            t.rect(5, 4, 9, 5, '#ffd860')
    elif nome == 'linguica':
        t.rect(1, 3, 14, 7, cor)
        t.rect(0, 4, 15, 6, cor)
        t.rect(1, 7, 14, 7, sombra)
        for x in (4, 8, 12):
            t.rect(x, 3, x, 7, sombra if estado != 3 else '#4a4038')
    else:
        for k in range(3):
            x = 1 + k * 5
            t.rect(x, 2, x + 3, 7, cor)
            t.rect(x, 7, x + 3, 7, sombra)
            t.rect(x, 2, x + 3, 2, '#ffffff' if estado == 0 else cor)
        t.put(2, 4, sombra)
        t.put(7, 5, sombra)
        t.put(12, 4, sombra)
    return outline(t.im)


def comidas():
    return [comida(nome, estado) for nome in COMIDAS for estado in range(4)]


def pinheiro(t, cx, base, alto, cor, luz):
    for k in range(5):
        y = base - alto + k * alto // 6
        largura = 3 + k * 4
        for dy in range(alto // 5 + 3):
            w = max(1, largura * (dy + 1) // (alto // 5 + 3))
            t.rect(cx - w, y + dy, cx + w, y + dy, cor)
        t.rect(cx - largura, y + alto // 5 + 2, cx + largura, y + alto // 5 + 2, luz)
    t.rect(cx - 1, base, cx + 1, base + 6, '#3a2418')


def fundo():
    t = Tela(W, H)
    janelas.degrade(t, 0, 0, W - 1, 64, ['#0e0d24', '#15132e', '#1c1a3a', '#241f4a', '#2d2858', '#37306a'])
    janelas.estrelas(t, 2, 2, W - 2, 44, 46, 17)
    t.rect(122, 9, 128, 15, '#fff3c4')
    t.rect(121, 10, 129, 14, '#fff3c4')
    t.rect(124, 11, 125, 12, '#e8d596')
    # Pinheiros dos dois lados.
    for cx, alto in ((10, 52), (28, 40), (150, 46), (167, 56)):
        pinheiro(t, cx, 66, alto, '#0e3a30', '#14503c')
    # Varal de bandeirinhas.
    janelas.poste(t, 3, 6, 64)
    janelas.poste(t, W - 4, 6, 64)
    janelas.varal(t, 4, W - 4, 14, 26, 9)
    # Chão da clareira e a terra batida em volta do fogo.
    t.rect(0, 64, W - 1, H - 1, '#2a3a24')
    janelas.ruido(t, 0, 66, W - 1, H - 1, 300, 41, ['#344a2c', '#223020', '#3a5030'])
    janelas.elipse(t, FOGO[0], FOGO[1], 72, 17, '#4a3420', '#3a2818')
    janelas.ruido(t, 22, 80, 154, 108, 160, 42, ['#5a4028', '#3a2818', '#6a4a30'])
    # Pedras em volta do fogo (a metade de trás; as da frente, mais embaixo).
    for k in range(16):
        ang = k / 16 * 2 * math.pi
        x = FOGO[0] + math.cos(ang) * 24
        y = FOGO[1] - 1 + math.sin(ang) * 7
        janelas.elipse(t, x, y, 4, 2.4, '#8c8e9a', '#5a5c68')
        t.rect(int(x) - 2, int(y) - 2, int(x) - 1, int(y) - 2, '#b4b6c2')
    # Toras cruzadas debaixo do fogo.
    t.rect(FOGO[0] - 18, FOGO[1] - 3, FOGO[0] + 18, FOGO[1] + 1, '#5c3820')
    t.rect(FOGO[0] - 18, FOGO[1] - 3, FOGO[0] + 18, FOGO[1] - 3, '#8a5a34')
    t.rect(FOGO[0] - 14, FOGO[1] - 6, FOGO[0] + 14, FOGO[1] - 2, '#6e4426')
    t.rect(FOGO[0] - 14, FOGO[1] - 6, FOGO[0] + 14, FOGO[1] - 6, '#9a6a3c')
    # Bancos de tronco.
    for x0 in (4, 140):
        pass
    for x0, y0 in ((4, 66), (146, 68)):
        t.rect(x0, y0, x0 + 26, y0 + 7, '#6e4426')
        t.rect(x0, y0, x0 + 26, y0 + 1, '#9a6a3c')
        t.rect(x0, y0 + 6, x0 + 26, y0 + 7, '#3a2418')
        t.rect(x0 + 1, y0 + 8, x0 + 3, y0 + 12, '#3a2418')
        t.rect(x0 + 23, y0 + 8, x0 + 25, y0 + 12, '#3a2418')
    # Pilha de lenha.
    x0, y0, x1, y1 = LENHA
    for fila, n in enumerate((5, 4, 3)):
        y = y1 - 6 - fila * 6
        for k in range(n):
            x = x0 + 1 + k * 6 + fila * 3
            t.rect(x, y, x + 5, y + 5, '#6e4426')
            t.rect(x, y, x + 5, y, '#9a6a3c')
            t.rect(x + 2, y + 2, x + 3, y + 3, '#d8b078')
            t.put(x + 1, y + 1, '#a8782e')
    t.rect(x0 + 24, y0 + 2, x0 + 25, y0 + 14, '#6e3c1c')
    t.rect(x0 + 21, y0, x0 + 27, y0 + 3, '#aeb4c0')
    # Faixa de madeira com os lugares das comidas.
    t.rect(32, MENU_Y, 138, H - 1, '#6e3c1c')
    t.rect(32, MENU_Y, 138, MENU_Y, '#9a5a2c')
    for x in (38, 62, 86, 110):
        t.rect(x, MENU_Y + 2, x + 17, MENU_Y + 13, '#52301a')
    return t.im


def exportar(add):
    return {
        'fundo': add('janela-fogueira-fundo', fundo()),
        'comidas': {**add('janela-fogueira-comidas', comidas()), 'ids': COMIDAS, 'estados': ESTADOS},
        'fogo': list(FOGO), 'pontas': [list(p) for p in PONTAS], 'cabos': [list(p) for p in CABOS], 'lenha': list(LENHA), 'menu': MENU_Y,
        'w': W, 'h': H,
    }
