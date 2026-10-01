"""Cômodos da Casa da Mandioca, telhado, jardim, efeitos e o ícone do botão da casa.

36 cômodos (sala, cozinha, quarto... até a fábrica de robôs), cada um com duas atividades (uma por morador) e 2 quadros de
animação (o brilho da TV, a chama do fogão...). O cômodo `r` da casa é o `r`-ésimo da lista: nenhum se repete, e a casa para
de crescer quando o último enche. Os 12 primeiros ficam aqui; os outros 24, em casa_salas_mais.py.
"""

import random

from PIL import Image

from casa import Tela, rgb

RW, RH = 68, 46            # um cômodo (pixels de arte)
PAREDE_H = 38              # do teto ao rodapé; embaixo vem o piso (8 linhas)
VARIACOES = 1              # cada cômodo existe uma vez só
TELHADOS = 4               # cores de telhado (um por andar, em ciclo)
POR_FOLHA_SALAS = 36       # cômodos por folha de imagem (36 x 2 quadros de 68 px)

SALAS = [
    ('sala', ['trico', 'aviao']),
    ('cozinha', ['cozinhar', 'bolo']),
    ('quarto', ['dormir', 'ler']),
    ('banheiro', ['banho', 'dentes']),
    ('musica', ['violao', 'bateria']),
    ('atelie', ['pintar', 'malabares']),
    ('jardim', ['regar', 'flor']),
    ('academia', ['halteres', 'corda']),
    ('laboratorio', ['experimento', 'telescopio']),
    ('jogos', ['videogame', 'pingpong']),
    ('escritorio', ['digitar', 'ioga']),
    ('danca', ['danca', 'cantar']),
]


def sala_de(i):
    """Índice (0 a 11) do tipo de cômodo do morador `i`."""
    return (i // 2) % len(SALAS)


def atividade_de(i):
    return SALAS[sala_de(i)][1][i % 2]


ESQUEMAS = [
    dict(parede='#f4d9a8', detalhe='#e8c488', piso='#b9793c', piso2='#9b602c', rodape='#7c421e'),
    dict(parede='#c4e2f2', detalhe='#a4cfe6', piso='#a8b0bc', piso2='#8c94a2', rodape='#5c6472'),
    dict(parede='#f6c8d2', detalhe='#eaa8ba', piso='#c08a5a', piso2='#a2703f', rodape='#804a34'),
    dict(parede='#cdeabc', detalhe='#add898', piso='#9c7a54', piso2='#80603c', rodape='#5a4026'),
]


def sombra(cor, f):
    c = rgb(cor)
    return tuple(max(0, min(255, int(v * f))) for v in c)


def caixa(r, x0, y0, x1, y1, cor, luz=True):
    """Retângulo com luz em cima e sombra embaixo (volume de pixel)."""
    r.rect(x0, y0, x1, y1, cor)
    if luz:
        r.rect(x0, y0, x1, y0, sombra(cor, 1.22))
        r.rect(x0, y1, x1, y1, sombra(cor, 0.72))


def janela(r, x0, y0, x1, y1, ceu, estrelas=(), cortina=None, anim=0):
    r.rect(x0 - 1, y0 - 1, x1 + 1, y1 + 1, '#6e3c1c')
    r.rect(x0, y0, x1, y1, ceu)
    for k, (sx, sy) in enumerate(estrelas):
        if (k + anim) % 2 == 0:
            r.put(x0 + sx, y0 + sy, '#fff6b8')
    r.rect((x0 + x1) // 2, y0, (x0 + x1) // 2, y1, '#6e3c1c')
    r.rect(x0, (y0 + y1) // 2, x1, (y0 + y1) // 2, '#6e3c1c')
    if cortina:
        r.rect(x0 - 1, y0 - 1, x0 + 2, y1 + 1, cortina)
        r.rect(x1 - 2, y0 - 1, x1 + 1, y1 + 1, cortina)
        r.rect(x0 - 1, y0 - 2, x1 + 1, y0 - 2, '#5a3018')


def fundo(r, esq, padrao, escuro=False):
    parede, detalhe = rgb(esq['parede']), rgb(esq['detalhe'])
    r.rect(0, 0, RW - 1, PAREDE_H - 1, parede)
    if padrao == 'listras':
        for x in range(2, RW, 6):
            r.rect(x, 0, x + 1, PAREDE_H - 1, detalhe)
    elif padrao == 'bolinhas':
        for y in range(3, PAREDE_H - 2, 6):
            for x in range(2 + (y // 6 % 2) * 3, RW, 6):
                r.put(x, y, detalhe)
    elif padrao == 'azulejo':
        for y in range(0, PAREDE_H, 6):
            r.rect(0, y, RW - 1, y, detalhe)
        for y in range(0, PAREDE_H, 6):
            for x in range((y // 6 % 2) * 3, RW, 6):
                r.rect(x, y, x, y + 5, detalhe)
    elif padrao == 'estrelas':
        gerador = random.Random(7)
        for _ in range(9):
            x, y = gerador.randrange(2, RW - 2), gerador.randrange(2, PAREDE_H - 6)
            r.put(x, y, detalhe)
            r.put(x + 1, y, detalhe)
            r.put(x, y + 1, detalhe)
    elif padrao == 'xadrez':
        for y in range(0, PAREDE_H, 4):
            for x in range(0, RW, 4):
                if (x // 4 + y // 4) % 2:
                    r.rect(x, y, x + 3, y + 3, detalhe)
    r.rect(0, 0, RW - 1, 1, sombra(esq['parede'], 0.78))
    r.rect(0, 2, RW - 1, 2, sombra(esq['parede'], 0.9))
    r.rect(0, PAREDE_H - 2, RW - 1, PAREDE_H - 1, esq['rodape'])
    # piso de tábuas
    r.rect(0, PAREDE_H, RW - 1, RH - 1, esq['piso'])
    for y in (PAREDE_H + 2, PAREDE_H + 5):
        r.rect(0, y, RW - 1, y, esq['piso2'])
    for y, desloc in ((PAREDE_H, 6), (PAREDE_H + 3, 22)):
        for x in range(desloc, RW, 26):
            r.rect(x, y, x, y + 1, esq['piso2'])


# --- Um cômodo de cada tipo ---------------------------------------------------------------------------------------
def c_sala(r, e, a):
    janela(r, 27, 5, 40, 19, '#22306a', [(2, 2), (8, 4), (5, 9), (10, 11)], '#c83c4c', a)
    caixa(r, 3, 27, 27, 37, '#b23a48')
    caixa(r, 3, 24, 7, 33, '#9a2e3c')
    caixa(r, 24, 24, 27, 33, '#9a2e3c')
    caixa(r, 9, 25, 20, 29, '#d65a68')
    r.rect(4, 38, 6, 38, '#3a2418')
    r.rect(24, 38, 26, 38, '#3a2418')
    r.rect(48, 5, 58, 14, '#6e3c1c')
    r.rect(49, 6, 57, 13, '#7ec0e8')
    r.rect(49, 10, 57, 13, '#56a050')
    r.rect(52, 8, 54, 9, '#ffe66a')
    r.rect(60, 12, 60, 33, '#3a2418')
    r.rect(57, 7 + 0, 63, 13 if a == 0 else 14, '#ffd860' if a == 0 else '#ffe890')
    r.rect(56, 34, 64, 37, '#3a2418')
    r.rect(10, 41, 58, 44, '#c84b4b')
    r.rect(12, 42, 56, 43, '#e88a6a')


def c_cozinha(r, e, a):
    caixa(r, 2, 4, 30, 14, '#b9793c')
    for x in (8, 16, 24):
        r.rect(x, 5, x, 13, '#7c421e')
        r.rect(x - 2, 9, x - 1, 10, '#ffd860')
    janela(r, 34, 7, 45, 17, '#8fd4ee', [], None)
    r.rect(35, 13, 44, 17, '#6ab04c')
    caixa(r, 2, 28, 42, 37, '#e8e0d0')
    r.rect(2, 26, 42, 27, '#8c94a2')
    caixa(r, 7, 22, 20, 27, '#3a3a44')
    r.rect(9, 20, 18, 21, '#aeb4c0')
    r.rect(10, 18, 11, 19, '#ff9a2a' if a == 0 else '#ffcc4a')
    r.rect(14, 18, 15, 19 - a, '#ff6a1a' if a == 0 else '#ff9a2a')
    caixa(r, 50, 6, 64, 37, '#e6ecf2')
    r.rect(50, 18, 64, 18, '#aeb4c0')
    r.rect(52, 10, 53, 14, '#8c94a2')
    r.rect(56, 22, 58, 24, '#ee5a6a')
    r.rect(60, 12, 62, 14, '#ffd860')
    r.rect(4, 16, 28, 16, '#6e3c1c')
    for x in (8, 16, 24):
        r.rect(x, 17, x, 19, '#6e3c1c')
        r.rect(x - 2, 19, x + 2, 22, '#9a9ca8')


def c_quarto(r, e, a):
    janela(r, 8, 6, 22, 20, '#1a2458', [(2, 2), (9, 3), (11, 9), (5, 12)], None, a)
    r.rect(17, 8, 19, 12, '#fff2b0')
    r.rect(16, 9, 16, 11, '#fff2b0')
    caixa(r, 40, 27, 66, 37, '#8a5a34')
    caixa(r, 42, 24, 64, 29, '#4a78d8')
    for x in range(44, 64, 4):
        r.rect(x, 24, x, 29, '#7aa2f0')
    caixa(r, 58, 20, 66, 27, '#fff6e8')
    caixa(r, 62, 14, 66, 37, '#6e3c1c')
    caixa(r, 30, 30, 37, 37, '#a66a34')
    r.rect(33, 23, 34, 29, '#3a2418')
    r.rect(31, 20, 36, 23, '#ffd860' if a == 0 else '#ffe48a')
    r.rect(28, 6, 38, 14, '#6e3c1c')
    r.rect(29, 7, 37, 13, '#f08aa0')
    r.rect(31, 9, 35, 11, '#ffe8ee')


def c_banheiro(r, e, a):
    caixa(r, 10, 6, 24, 20, '#aeb4c0')
    r.rect(11, 7, 23, 19, '#cfe8f6')
    r.rect(13, 9, 16, 10, '#ffffff')
    caixa(r, 7, 27, 27, 37, '#f4f4f8')
    r.rect(8, 25, 26, 26, '#d8dce4')
    r.rect(16, 21, 17, 25, '#9a9ca8')
    caixa(r, 40, 12, 52, 13, '#8c94a2')
    r.rect(41, 14, 51, 25, '#e84c6a')
    r.rect(41, 18, 51, 18, '#ffffff')
    caixa(r, 56, 14, 64, 15, '#6e3c1c')
    r.rect(58, 11, 60, 13, '#ffd21e')
    r.rect(61, 12, 62, 13, '#ff8a12')
    janela(r, 30, 5, 37, 13, '#cfe8f6', [], None)
    r.rect(55, 30, 66, 37, '#e4d6b8')
    r.rect(58, 28, 62, 30, '#ffffff')


def c_musica(r, e, a):
    caixa(r, 4, 20, 30, 37, '#26242e')
    r.rect(6, 22, 28, 27, '#3a3844')
    for x in range(7, 28, 3):
        r.rect(x, 28, x + 1, 33, '#f4f4ec')
    r.rect(6, 34, 28, 35, '#151319')
    caixa(r, 50, 12, 62, 37, '#3a2a30')
    r.rect(53, 15 + a, 59, 21 + a, '#d8cfd8')
    r.rect(55, 17 + a, 57, 19 + a, '#26242e')
    r.rect(53, 26, 59, 32, '#d8cfd8')
    r.rect(55, 28, 57, 30, '#26242e')
    r.rect(36, 8, 42, 24, '#b9793c')
    r.rect(34, 6, 44, 10, '#d08a42')
    r.rect(38, 14, 40, 16, '#3a2418')
    for x, y in ((46, 6), (52, 8), (58, 6)):
        r.rect(x, y, x + 5, y + 6, '#6e3c1c')
        r.rect(x + 1, y + 1, x + 4, y + 5, '#ffd860')
        r.rect(x + 2, y + 3, x + 3, y + 3, '#b9793c')


def c_atelie(r, e, a):
    r.rect(14, 2, 54, 16, '#ffe9a8')
    r.rect(15, 3, 53, 15, '#bfe4ff')
    for x in (26, 38, 50):
        r.rect(x, 2, x, 16, '#6e3c1c')
    r.rect(14, 9, 54, 9, '#6e3c1c')
    caixa(r, 2, 14, 12, 15, '#6e3c1c')
    for k, cor in enumerate(('#e84c4c', '#4a78d8', '#ffd21e', '#56b050')):
        r.rect(3 + k * 2, 10, 4 + k * 2, 13, cor)
    caixa(r, 56, 8, 66, 20, '#ffffff')
    r.rect(58, 10, 64, 18, '#f08aa0')
    r.rect(60, 12, 62, 16, '#ffd21e')
    for (x, y, cor) in ((8, 40, '#e84c4c'), (20, 42, '#4a78d8'), (34, 41, '#ffd21e'), (48, 43, '#56b050'), (58, 40, '#ff8a12')):
        r.rect(x, y, x + 2, y + 1, cor)
    caixa(r, 56, 28, 62, 37, '#b9793c')
    r.rect(57, 24, 61, 27, '#8a5a34')


def c_jardim(r, e, a):
    r.rect(0, 0, RW - 1, PAREDE_H - 1, '#bfe6c0')
    for x in range(4, RW, 12):
        r.rect(x, 2, x + 7, 30, '#dff4e8')
        r.rect(x, 2, x, 30, '#6e3c1c')
    r.rect(0, 14, RW - 1, 14, '#6e3c1c')
    gerador = random.Random(3)
    for _ in range(26):
        x, y = gerador.randrange(2, RW - 3), gerador.randrange(16, 34)
        r.rect(x, y, x + 2, y + 2, '#3a9a48')
    for x in (12, 30, 50):
        r.rect(x, 4, x, 10, '#3a2418')
        r.rect(x - 2, 10, x + 2, 12, '#b9793c')
        r.rect(x - 3, 12, x + 3, 15, '#46b04e')
    for x, cor in ((6, '#ee6a8a'), (22, '#ffd21e'), (40, '#ee6a8a'), (60, '#b07af0')):
        r.rect(x - 2, 33, x + 3, 37, '#a66a34')
        r.rect(x - 3, 27, x + 4, 33, '#3a9a48')
        r.rect(x - 1, 25, x + 1, 27, cor)
    bx = 30 + a * 6
    r.rect(bx, 20 - a, bx + 1, 20 - a, '#ffd21e')
    r.rect(bx - 1, 19 - a, bx - 1, 19 - a, '#ff8a12')
    r.rect(bx + 2, 19 - a, bx + 2, 19 - a, '#ff8a12')


def c_academia(r, e, a):
    caixa(r, 2, 4, 40, 28, '#cfe4f2')
    r.rect(3, 5, 39, 27, '#e8f4fc')
    r.rect(6, 8, 14, 10, '#ffffff')
    for x in (46, 50, 54, 58, 62):
        r.rect(x, 6, x, 34, '#8a5a34')
    for y in (10, 18, 26):
        r.rect(45, y, 63, y, '#8a5a34')
    caixa(r, 44, 30, 66, 37, '#3a3a44')
    for x, h in ((46, 2), (52, 3), (58, 2)):
        r.rect(x, 30 - h, x + 4, 30, '#2a2a30')
        r.rect(x + 1, 30 - h - 1, x + 3, 30 - h, '#9a9ca8')
    r.rect(14, 2, 26, 2, '#ee4c4c')
    r.rect(16, 3 + a, 24, 3 + a, '#ffd21e')


def c_laboratorio(r, e, a):
    caixa(r, 2, 10, 32, 11, '#6e3c1c')
    cores = ['#56d66a', '#ee6aaa', '#56c8ee', '#ffd21e', '#b07af0']
    for k in range(5):
        x = 4 + k * 6
        r.rect(x, 4, x + 3, 9, '#dff0f8')
        r.rect(x, 7 - (k + a) % 2, x + 3, 9, cores[(k + a) % 5])
    caixa(r, 36, 4, 66, 22, '#26382e')
    r.rect(37, 5, 65, 21, '#2f4a38')
    for x in range(40, 62, 6):
        r.rect(x, 9, x + 3, 9, '#e8f4e0')
        r.rect(x, 14, x + 4, 14, '#e8f4e0')
    r.rect(44, 17, 48, 18, '#ffd21e')
    caixa(r, 38, 29, 66, 37, '#b9793c')
    r.rect(42, 24, 46, 28, '#dff0f8')
    r.rect(43, 26 - a, 45, 28, '#56d66a')
    r.rect(55, 22, 60, 28, '#c8ccd8')
    r.rect(56, 23, 59, 26, '#ee5a6a' if a == 0 else '#ff9a8a')


def c_jogos(r, e, a):
    caixa(r, 4, 6, 36, 27, '#26242e')
    cores = [('#3a6cf0', '#ee4c6a'), ('#56d66a', '#ffd21e')][a]
    r.rect(6, 8, 34, 25, cores[0])
    r.rect(6, 17, 34, 25, cores[1])
    r.rect(14, 12, 20, 18, '#ffffff')
    r.rect(24, 14, 30, 22, '#26242e')
    caixa(r, 46, 12, 62, 37, '#6a3ab0')
    r.rect(49, 15, 59, 24, '#26242e')
    r.rect(50, 16 + a, 58, 18 + a, '#56d66a')
    r.rect(50, 21, 58, 23, '#ffd21e')
    r.rect(50, 28, 52, 30, '#ee4c4c')
    r.rect(56, 28, 58, 30, '#4a78d8')
    caixa(r, 4, 32, 18, 37, '#ee8a2a')
    caixa(r, 22, 34, 34, 37, '#3a6cf0')


def c_escritorio(r, e, a):
    caixa(r, 2, 4, 20, 37, '#6e3c1c')
    for y in (10, 17, 24, 31):
        r.rect(3, y, 19, y, '#3a2418')
    gerador = random.Random(5)
    cores = ['#e84c4c', '#4a78d8', '#ffd21e', '#56b050', '#b07af0', '#ff8a12']
    for y in (5, 11, 18, 25):
        x = 3
        while x < 19:
            larg = gerador.choice((1, 2, 2))
            r.rect(x, y, x + larg - 1, y + 4, gerador.choice(cores))
            x += larg
    janela(r, 26, 6, 45, 20, '#151a48', [(2, 4), (6, 9), (12, 3), (15, 10), (9, 13)], None, a)
    r.rect(28, 14, 30, 19, '#ffd860')
    r.rect(36, 12, 38, 19, '#ff8a12' if a else '#ffd860')
    r.rect(54, 6, 62, 14, '#fff6e8')
    r.rect(58, 8, 58, 10, '#26242e')
    r.rect(58, 10, 60, 10, '#26242e')
    caixa(r, 52, 30, 64, 37, '#8a5a34')
    r.rect(56, 24, 60, 29, '#56b050')


def c_danca(r, e, a):
    r.rect(0, 0, RW - 1, PAREDE_H - 1, '#2a1a48')
    neon = [('#ff4fa0', '#4fd4ff'), ('#9dff4f', '#ff8a2a'), ('#ffd21e', '#b07af0'), ('#4fd4ff', '#ff5a5a')][e['v'] % 4]
    luz = neon if a == 0 else (neon[1], neon[0])
    for k, cor in enumerate((luz[0], luz[1], luz[0])):
        x = 12 + k * 22
        for y in range(6, 34):
            larg = (y - 6) // 6
            r.rect(x - larg, y, x + larg, y, sombra(cor, 0.42))
    r.rect(33, 0, 34, 6, '#9a9ca8')
    r.rect(31, 6, 36, 11, '#dde2ee')
    for dx, dy in ((0, 0), (2, 3), (-1, 2), (3, 1)):
        if (dx + dy + a) % 2 == 0:
            r.put(33 + dx, 7 + dy, '#ffffff')
    r.rect(31, 6, 36, 6, '#ffffff')
    for x0 in (3, 56):
        caixa(r, x0, 18, x0 + 8, 37, '#151319')
        r.rect(x0 + 2, 21, x0 + 6, 25, '#3a3844')
        r.rect(x0 + 2, 28, x0 + 6, 33, '#3a3844')
    r.rect(24, 2, 44, 4, '#26242e')
    r.rect(25, 3, 43, 3, luz[0])
    # piso de pista: quadrados alternando
    for k in range(0, RW, 8):
        r.rect(k, PAREDE_H, k + 7, RH - 1, luz[0] if (k // 8 + a) % 2 == 0 else luz[1])
        r.rect(k, PAREDE_H, k + 7, PAREDE_H, '#ffffff')


FUNDOS = {
    'sala': ('listras', c_sala), 'cozinha': ('azulejo', c_cozinha), 'quarto': ('estrelas', c_quarto),
    'banheiro': ('azulejo', c_banheiro), 'musica': ('bolinhas', c_musica), 'atelie': ('liso', c_atelie),
    'jardim': ('liso', c_jardim), 'academia': ('liso', c_academia), 'laboratorio': ('liso', c_laboratorio),
    'jogos': ('xadrez', c_jogos), 'escritorio': ('listras', c_escritorio), 'danca': ('liso', c_danca),
}


def sala(tema, variacao, anim):
    nome = SALAS[tema][0]
    padrao, desenhar = FUNDOS[nome]
    esq = dict(ESQUEMAS[(tema + variacao) % 4], v=variacao)
    r = Tela(RW, RH)
    fundo(r, esq, padrao)
    desenhar(r, esq, anim)
    return r.im


def todas_as_salas():
    quadros = []
    for tema in range(len(SALAS)):
        for variacao in range(VARIACOES):
            for anim in (0, 1):
                quadros.append(sala(tema, variacao, anim))
    return quadros


# --- Telhado e jardim ---------------------------------------------------------------------------------------------
TELHADO_W, TELHADO_H = RW + 7, 13


def telhado(variacao=0):
    cores = [('#b23a48', '#8a2434', '#d65a68'), ('#3a6cc8', '#244a9a', '#5a8ce0'), ('#3a9a58', '#246e3c', '#5ac078'),
             ('#c87a30', '#8e4c18', '#e89a50')][variacao % 4]
    r = Tela(TELHADO_W, TELHADO_H)
    for y in range(TELHADO_H):
        recuo = max(0, (TELHADO_H - 1 - y) // 2 - 1)
        for x in range(recuo, TELHADO_W - recuo):
            cor = cores[0]
            if (y % 3 == 2):
                cor = cores[1]
            elif ((x + (y // 3) * 3) % 6 == 0):
                cor = cores[2]
            r.put(x, y, cor)
    r.rect(0, TELHADO_H - 2, TELHADO_W - 1, TELHADO_H - 1, cores[1])
    return r.im


def chamine():
    r = Tela(9, 14)
    r.rect(1, 3, 7, 13, '#8a4a34')
    for y in range(4, 13, 3):
        r.rect(1, y, 7, y, '#5a2c1e')
    r.rect(0, 1, 8, 3, '#6e3426')
    r.rect(0, 1, 8, 1, '#9a5a44')
    return r.im


def jardim():
    """Tira de enfeites do chão da casa: caixa de correio, canteiro, arbusto, placa, cerca e árvore."""
    itens = []
    c = Tela(9, 14)
    c.rect(4, 6, 5, 13, '#6e3c1c')
    c.rect(0, 0, 8, 6, '#3a6cc8')
    c.rect(0, 0, 8, 1, '#5a8ce0')
    c.rect(6, 2, 8, 4, '#e84c4c')
    itens.append(c.im)
    c = Tela(14, 8)
    c.rect(0, 5, 13, 7, '#7a4a28')
    for x, cor in ((2, '#ee4c6a'), (6, '#ffd21e'), (10, '#b07af0')):
        c.rect(x, 1, x + 1, 4, '#3a9a48')
        c.rect(x - 1, 0, x + 2, 1, cor)
    itens.append(c.im)
    c = Tela(16, 11)
    for y in range(11):
        for x in range(16):
            if (x - 8) ** 2 / 64 + (y - 6) ** 2 / 25 <= 1:
                c.put(x, y, '#3a9a48' if (x + y) % 5 else '#56b860')
    itens.append(c.im)
    c = Tela(12, 12)
    c.rect(5, 6, 6, 11, '#6e3c1c')
    c.rect(0, 0, 11, 6, '#b9793c')
    c.rect(1, 1, 10, 5, '#f4d9a8')
    c.rect(3, 3, 8, 3, '#7c421e')
    itens.append(c.im)
    c = Tela(20, 10)
    for x in range(0, 20, 5):
        c.rect(x, 2, x + 2, 9, '#f4f4ec')
        c.rect(x, 1, x + 2, 1, '#d8d8d0')
    c.rect(0, 4, 19, 4, '#f4f4ec')
    c.rect(0, 7, 19, 7, '#f4f4ec')
    itens.append(c.im)
    c = Tela(22, 30)
    c.rect(10, 16, 12, 29, '#6e3c1c')
    for (cx, cy, raio) in ((11, 9, 9), (6, 14, 6), (16, 14, 6)):
        for y in range(30):
            for x in range(22):
                if (x - cx) ** 2 + (y - cy) ** 2 <= raio ** 2:
                    c.put(x, y, '#2e8a44' if (x * 3 + y) % 7 else '#46a85a')
    c.rect(8, 7, 9, 8, '#ee4c4c')
    c.rect(14, 12, 15, 13, '#ee4c4c')
    itens.append(c.im)
    return itens


# --- Efeitos (a festa da casa desenha) ---------------------------------------------------------------------------------
FX = {
    'nota': ['..kk.', '..k.k', '..k..', 'kk...', 'kk...'],
    'nota2': ['.kkk.', '.k..k', '.k...', 'kk..k', 'kk.kk'],
    'zzz': ['wwwww', '...w.', '..w..', '.w...', 'wwwww'],
    'vapor': ['.w.w.', 'w.w.w', '.w.w.', 'w...w', '.w.w.'],
    'bolha': ['.www.', 'w...w', 'w.w.w', 'w...w', '.www.'],
    'gota': ['..c..', '.ccc.', '.ccc.', '.cCc.', '..c..'],
    'coracao': ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'],
    'estrela': ['..y..', '..y..', 'yyyyy', '.yyy.', 'y...y'],
    'brilho': ['..w..', '..w..', 'wwyww', '..w..', '..w..'],
    'exclama': ['..r..', '..r..', '..r..', '.....', '..r..'],
    'poeira': ['.g.g.', 'g.g.g', '.ggg.', 'g.g.g', '.g.g.'],
    'faisca': ['..o..', '.oyo.', 'oywyo', '.oyo.', '..o..'],
    'fumaca': ['.ggg.', 'ggGgg', 'gGGGg', 'ggGgg', '.ggg.'],
    'pipoca': ['..w..', '.wyw.', 'wwwyw', '.wyw.', '..w..'],
    'neve': ['..i..', '.iwi.', 'iwwwi', '.iwi.', '..i..'],
}
FX_LEG = {'k': '#2a1a2e', 'w': '#ffffff', 'c': '#56c8ee', 'C': '#2a8ac0', 'r': '#ee3a54', 'y': '#ffd21e', 'g': '#c8c0b0',
          'G': '#8a8a96', 'o': '#ff8a12', 'i': '#bfe4ff'}


def efeitos():
    saida = []
    for nome, linhas in FX.items():
        r = Tela(5, 5)
        r.grade(linhas, 0, 0, {k: rgb(v) for k, v in FX_LEG.items()})
        saida.append((nome, r.im))
    return saida


def icone():
    r = Tela(11, 10)
    r.grade(['....rr.....', '...rrrr....', '..rrrrrr...', '.rrrrrrrr..', 'rrrrrrrrrr.',
             '.tttttttt..', '.ttbbtttt..', '.ttbbttnn..', '.tttttnnn..', '.tttttnnn..'], 0, 0,
            {'r': rgb('#e0343e'), 't': rgb('#f8e0b0'), 'b': rgb('#58a0e8'), 'n': rgb('#8a4a24')})
    return r.im


# --- Exportação para o pacote de arte ----------------------------------------------------------------------------------
SLOTS = [17, 51]           # centro de cada morador no cômodo (x)
PE_Y = 43                  # linha do chão onde ficam os pés (a última linha do quadro do morador)


def exportar(add, icons):
    """Junta tudo da casa no pacote: devolve o trecho `casa` do manifesto."""
    import casa
    visuais, folhas = casa.moradores(atividade_de)
    folhas_meta = []
    for k in range(0, len(folhas), casa.POR_FOLHA):
        quadros = [quadro for morador in folhas[k:k + casa.POR_FOLHA] for quadro in morador]
        folhas_meta.append(add(f'casa-moradores-{k // casa.POR_FOLHA}', quadros))
    quadros_salas = todas_as_salas()
    por_folha = POR_FOLHA_SALAS * VARIACOES * 2
    folhas_salas = [add(f'casa-salas-{k // por_folha}', quadros_salas[k:k + por_folha]) for k in range(0, len(quadros_salas), por_folha)]
    telhados = add('casa-telhado', [telhado(v) for v in range(TELHADOS)])
    itens_jardim = jardim()
    jardim_meta = add('casa-jardim', itens_jardim)
    jardim_meta['itens'] = [{'w': im.width, 'h': im.height} for im in itens_jardim]
    chamine_meta = add('casa-chamine', chamine())
    efeitos_lista = efeitos()
    fx_meta = add('casa-fx', [im for _, im in efeitos_lista])
    fx_meta['ids'] = [nome for nome, _ in efeitos_lista]
    icons['ui:casa'] = icone()
    atividades = {}
    for nome, a in casa.ATIVIDADES.items():
        fx = a.get('fx')
        atividades[nome] = {'fps': a['fps'], 'fx': {'tipo': fx[0], 'x': fx[1] + 1, 'y': fx[2] + 1, 'cada': fx[3]} if fx else None}
    return {
        'moradores': {'w': 28, 'h': 34,
                      'quadros': casa.QUADROS, 'reacao': casa.REACAO, 'porFolha': casa.POR_FOLHA, 'desenhos': casa.DESENHOS,
                      'folhas': folhas_meta, 'papeis': {str(i): v['papel'] for i, v in enumerate(visuais) if v['papel']},
                      'atividades': [atividade_de(i) for i in range(len(visuais))]},
        'salas': {'folhas': folhas_salas, 'porFolha': POR_FOLHA_SALAS, 'rw': RW, 'rh': RH, 'ids': [nome for nome, _ in SALAS],
                  'atividades': [acts for _, acts in SALAS], 'slots': SLOTS, 'pe': PE_Y},
        'telhado': telhados, 'jardim': jardim_meta, 'chamine': chamine_meta, 'fx': fx_meta,
        'atividades': atividades,
    }


import casa_salas_mais  # noqa: E402,F401  (registra os cômodos 13 a 36)
