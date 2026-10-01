"""Provador: o camarim (parede listrada, espelho de moldura dourada com lâmpadas, tablado redondo) e a bancada de madeira com as
abas (chapéus, mão, tecidos e conjuntos), as setinhas, o cadeado e o visto.
"""

import math

import janelas
from casa import Tela, rgb
from render import outline

W, H = 176, 120
ESPELHO = (4, 4, 84, 114)              # x0, y0, x1, y1 do espelho (a moldura por fora)
CHAO_Y = 102                           # onde a Mandioca pisa
CENTRO_X = 44                          # o meio do espelho
PAINEL = (88, 4, 172, 116)             # a bancada com as abas e os itens
ABAS_Y = 7
CELULA = (40, 18)                      # uma casa da grade de itens
GRADE = (92, 26)                       # onde começa a grade
LINHAS_CONJUNTO = 11


def fundo():
    t = Tela(W, H)
    # Parede listrada de camarim.
    t.rect(0, 0, W - 1, H - 1, '#5a3a68')
    for x in range(0, W, 8):
        t.rect(x, 0, x + 3, H - 1, '#6e4a7e')
    t.rect(0, 0, W - 1, 1, '#3a2448')
    # Espelho: moldura dourada, vidro com degradê e brilhos.
    x0, y0, x1, y1 = ESPELHO
    t.rect(x0, y0, x1, y1, '#c89a28')
    t.rect(x0 + 1, y0 + 1, x1 - 1, y1 - 1, '#ffd860')
    t.rect(x0 + 3, y0 + 3, x1 - 3, y1 - 3, '#8a6a1c')
    janelas.degrade(t, x0 + 4, y0 + 4, x1 - 4, y1 - 4, ['#c8d8ec', '#bccce2', '#b0c0d8', '#a4b4ce', '#98a8c4', '#8c9cba', '#8090b0', '#7484a6'])
    for k in range(5):
        t.line(x0 + 10 + k * 14, y0 + 4, x0 + 2 + k * 14, y0 + 40, '#d8e4f4')
    t.line(x0 + 66, y1 - 40, x0 + 76, y1 - 4, '#d8e4f4')
    # Lâmpadas em volta da moldura.
    for x in range(x0 + 4, x1 - 2, 8):
        for y in (y0 - 1, y1 - 1):
            t.rect(x, y + 1, x + 2, y + 2, '#fff2b0')
    for y in range(y0 + 8, y1 - 6, 10):
        for x in (x0 - 1, x1 - 1):
            t.rect(x + 1, y, x + 2, y + 2, '#fff2b0')
    # Tablado redondo onde ela pisa.
    janelas.elipse(t, CENTRO_X, CHAO_Y + 4, 32, 7, '#a8703a', '#7c4a24')
    janelas.elipse(t, CENTRO_X, CHAO_Y + 2, 30, 5.5, '#d8a060')
    # Bancada de madeira com as abas.
    px0, py0, px1, py1 = PAINEL
    t.rect(px0, py0, px1, py1, '#6e3c1c')
    t.rect(px0 + 1, py0 + 1, px1 - 1, py1 - 1, '#8a5a34')
    t.rect(px0 + 3, py0 + 20, px1 - 3, py1 - 3, '#f4e4c0')
    t.rect(px0 + 3, py0 + 20, px1 - 3, py0 + 20, '#b8a070')
    for y in range(GRADE[1], py1 - 6, CELULA[1] + 1):
        t.rect(px0 + 4, y + CELULA[1], px1 - 4, y + CELULA[1], '#e4d2a8')
    return t.im


# --- Peças da interface (18x14) ---------------------------------------------------------------------------------------------
def aba(nome):
    t = Tela(18, 14)
    if nome == 'chapeu':
        t.grade(['................', '.....yyyyyy.....', '....yYyyyyYy....', '...yyyyyyyyyy...', '..yyyyyyyyyyyy..', '.rrrrrrrrrrrrrr.', 'yyyyyyyyyyyyyyyy'], 1, 3,
                {'y': rgb('#e8c44a'), 'Y': rgb('#b8942a'), 'r': rgb('#c8283c')})
    elif nome == 'mao':
        t.grade(['.....rr...rr...', '....rrrr.rrrr..', '....rrrrrrrrrr.', '.....rrrrrrrr..', '......rrrrrr...', '.......nn......', '.......nn......', '.......nn......'], 1, 2,
                {'r': rgb('#ee6aaa'), 'n': rgb('#8a5a34')})
    elif nome == 'tecido':
        for y in range(3, 12):
            for x in range(2, 16):
                t.put(x, y, '#c8283c' if ((x // 3) + (y // 3)) % 2 == 0 else '#f4e4c0')
    else:
        t.grade(['.......y.......', '......yyy......', '..yyyyyyyyyyy..', '...yyyyyyyyy...', '....yyyyyyy....', '...yyyy.yyyy...', '..yyy.....yyy..'], 1, 3,
                {'y': rgb('#ffd21e')})
    return outline(t.im)


def seta(direcao):
    """Setinha (7x9) para a esquerda ('e') ou a direita ('d')."""
    t = Tela(7, 9)
    for k in range(5):
        x = 1 + k if direcao == 'd' else 5 - k
        t.rect(x, k, x, 8 - k, '#ffd21e')
    return outline(t.im)


def cadeado():
    t = Tela(8, 10)
    t.rect(1, 4, 6, 8, '#ffd21e')
    t.rect(1, 4, 6, 4, '#fff2b0')
    t.rect(2, 1, 5, 3, '#9a9ca8')
    t.rect(3, 2, 4, 3, '#26242e')
    t.put(3, 6, '#26242e')
    t.put(4, 6, '#26242e')
    t.put(3, 7, '#26242e')
    return outline(t.im)


def visto():
    t = Tela(9, 8)
    t.line(1, 4, 3, 6, '#56d66a')
    t.line(3, 6, 7, 1, '#56d66a')
    t.line(1, 3, 3, 5, '#2a9a3a')
    return outline(t.im)


def ui():
    return [aba('chapeu'), aba('mao'), aba('tecido'), aba('conjunto'), seta('e'), seta('d'), cadeado(), visto()]


def exportar(add):
    return {
        'fundo': add('janela-provador-fundo', fundo()),
        'ui': {**add('janela-provador-ui', ui()), 'ids': ['aba-chapeu', 'aba-mao', 'aba-tecido', 'aba-conjunto', 'seta-e', 'seta-d', 'cadeado', 'visto']},
        'espelho': list(ESPELHO), 'chao': CHAO_Y, 'centro': CENTRO_X, 'painel': list(PAINEL), 'abasY': ABAS_Y, 'celula': list(CELULA),
        'grade': list(GRADE), 'linhasConjunto': LINHAS_CONJUNTO, 'w': W, 'h': H,
    }
