"""Cômodos 13 a 36 da Casa da Mandioca (os 12 primeiros ficam em casa_salas.py).

Cada função desenha o fundo do cômodo (68x46) na tela `r`; `e` é o esquema de cores (e['v'] a variação) e `a` o quadro de
animação (0 ou 1: a chama que balança, a luz que pisca...). Os moradores ficam em pé na frente, nos lugares 17 e 51.
"""

import random

import casa_salas
from casa_salas import RW, RH, PAREDE_H, SALAS, FUNDOS, caixa, janela, sombra


def pontos(r, x0, y0, x1, y1, passo, cor):
    for y in range(y0, y1 + 1, passo):
        for x in range(x0, x1 + 1, passo):
            r.put(x, y, cor)


def piso(r, cor_a, cor_b, lado=6, alt=2):
    """Piso de quadrados alternados (xadrez)."""
    for k, x in enumerate(range(0, RW, lado)):
        for j, y in enumerate(range(PAREDE_H, RH, alt + 1)):
            r.rect(x, y, x + lado - 1, min(RH - 1, y + alt), cor_a if (k + j) % 2 == 0 else cor_b)


# --- 13 oficina ------------------------------------------------------------------------------------------------------
def c_oficina(r, e, a):
    r.rect(3, 3, 35, 25, '#6e4a2a')
    r.rect(4, 4, 34, 24, '#b08a5a')
    pontos(r, 6, 6, 33, 23, 4, '#7a5a34')
    # ferramentas penduradas no painel
    r.rect(8, 7, 8, 15, '#8a5a34')
    r.rect(6, 6, 10, 8, '#6a6a76')
    r.line(14, 6, 14, 16, '#c8ccd8')
    r.rect(13, 6, 18, 8, '#c8ccd8')
    for k in range(4):
        r.put(14 + k, 9 + k % 2, '#8c94a2')
    r.rect(22, 7, 22, 17, '#8c94a2')
    r.rect(20, 6, 24, 9, '#8c94a2')
    r.rect(21, 7, 23, 8, '#b08a5a')
    r.rect(28, 7, 28, 14, '#ee4c4c')
    r.rect(30, 7, 30, 14, '#ee4c4c')
    r.rect(27, 14, 31, 17, '#3a3a44')
    # prateleira com latas de tinta
    caixa(r, 38, 10, 66, 11, '#6e3c1c')
    for x, cor in ((40, '#ee4c4c'), (47, '#4a78d8'), (54, '#ffd21e'), (61, '#56b050')):
        r.rect(x, 3, x + 4, 9, '#aeb4c0')
        r.rect(x, 4, x + 4, 6, cor)
    # bancada com morsa
    caixa(r, 40, 27, 66, 31, '#8a5a34')
    r.rect(42, 32, 43, 37, '#5a3a20')
    r.rect(63, 32, 64, 37, '#5a3a20')
    r.rect(58, 21, 62, 26, '#ee4c4c')
    r.rect(60, 18, 61, 20, '#8c94a2')
    # lâmpada
    r.rect(50, 14, 54, 15, '#ffe890' if a else '#ffd860')
    r.rect(52, 12, 52, 13, '#6a6a76')
    # serragem no chão
    gerador = random.Random(11)
    for _ in range(14):
        r.put(gerador.randrange(0, RW), gerador.randrange(PAREDE_H + 1, RH), '#e8c488')


# --- 14 pizzaria -----------------------------------------------------------------------------------------------------
def c_pizzaria(r, e, a):
    piso(r, '#e8e0d0', '#c84b4b')
    # toldo listrado
    for x in range(0, RW, 8):
        r.rect(x, 0, x + 3, 6, '#ee4c4c')
        r.rect(x + 4, 0, x + 7, 6, '#ffffff')
    r.rect(0, 7, RW - 1, 8, '#8a2434')
    # lousa do cardápio
    caixa(r, 4, 12, 30, 28, '#6e3c1c')
    r.rect(5, 13, 29, 27, '#26382e')
    for y in (16, 20, 24):
        r.rect(8, y, 20, y, '#e8f4e0')
        r.rect(23, y, 26, y, '#ffd860')
    r.rect(8, 14, 12, 14, '#ff9a8a')
    # forno de pedra
    caixa(r, 42, 12, 64, 37, '#b8573a')
    for y in range(14, 37, 4):
        r.rect(42, y, 64, y, '#8a3a24')
    for k, y in enumerate(range(12, 37, 4)):
        for x in range(42 + (k % 2) * 3, 64, 6):
            r.rect(x, y, x, y + 3, '#8a3a24')
    r.rect(48, 22, 58, 36, '#26242e')
    r.rect(49, 21, 57, 21, '#26242e')
    r.rect(50, 20, 56, 20, '#26242e')
    r.rect(50, 32, 56, 36, '#ff6a1a' if a == 0 else '#ff9a2a')
    r.rect(52, 28 + a, 54, 33, '#ffd21e')
    r.rect(53, 26 + a, 53, 30, '#fff0a0')
    caixa(r, 50, 5, 56, 8, '#3a3a44')
    # latas de tomate e queijo na prateleira
    caixa(r, 4, 31, 30, 32, '#6e3c1c')
    for x, cor in ((6, '#ee4c4c'), (11, '#ee4c4c'), (16, '#ffd21e'), (21, '#ee4c4c'), (26, '#ffd21e')):
        r.rect(x, 26, x + 3, 30, cor)
        r.rect(x, 26, x + 3, 26, '#ffffff')


# --- 15 cafeteria ---------------------------------------------------------------------------------------------------
def c_cafeteria(r, e, a):
    piso(r, '#c9a070', '#8a5a34', 5, 2)
    # prateleira de xícaras
    caixa(r, 3, 12, 32, 13, '#6e3c1c')
    for x in range(5, 31, 5):
        r.rect(x, 8, x + 3, 11, '#ffffff')
        r.rect(x + 1, 8, x + 2, 9, '#b9793c')
    # máquina de café
    caixa(r, 4, 18, 26, 34, '#c8ccd8')
    r.rect(4, 18, 26, 21, '#8c94a2')
    r.rect(7, 24, 10, 26, '#26242e')
    r.rect(16, 24, 19, 26, '#26242e')
    r.rect(8, 27, 9, 29, '#6e3c1c')
    r.rect(17, 27, 18, 29, '#6e3c1c')
    r.put(22, 20, '#ee4c4c' if a == 0 else '#ffffff')
    r.put(24, 20, '#56d66a')
    # cardápio
    caixa(r, 36, 5, 52, 22, '#6e3c1c')
    r.rect(37, 6, 51, 21, '#26382e')
    r.rect(40, 9, 48, 13, '#e8f4e0')
    r.rect(42, 14, 46, 15, '#e8f4e0')
    r.rect(44, 7, 44, 8, '#ffffff' if a == 0 else '#9a9ca8')
    r.rect(39, 17, 49, 17, '#ffd860')
    r.rect(39, 19, 45, 19, '#ffd860')
    # luminárias
    for x in (36, 58):
        r.rect(x + 3, 0, x + 3, 3, '#26242e')
        r.rect(x, 4, x + 6, 6, '#ffd860')
        r.rect(x + 1, 7, x + 5, 7, '#fff2b0' if a == 0 else '#ffe890')
    # vitrine de bolos
    caixa(r, 54, 23, 66, 37, '#dff0f8')
    r.rect(55, 24, 65, 36, '#bfe4ff')
    r.rect(54, 30, 66, 30, '#8c94a2')
    for x, cor in ((56, '#f08aa0'), (61, '#8a5a34')):
        r.rect(x, 26, x + 3, 29, cor)
        r.rect(x, 26, x + 3, 26, '#ffffff')
    for x, cor in ((56, '#ffd860'), (61, '#ee4c4c')):
        r.rect(x, 32, x + 3, 35, cor)


# --- 16 cinema -------------------------------------------------------------------------------------------------------
def c_cinema(r, e, a):
    r.rect(0, 0, RW - 1, PAREDE_H - 1, '#241a3a')
    r.rect(0, PAREDE_H, RW - 1, RH - 1, '#8a1c34')
    r.rect(0, PAREDE_H + 3, RW - 1, PAREDE_H + 3, '#ffd860')
    # tela
    r.rect(11, 3, 57, 27, '#14101c')
    r.rect(12, 4, 56, 26, '#e8f4ff' if a == 0 else '#d0e4f6')
    r.rect(12, 18, 56, 26, '#7ec080')
    r.rect(12, 14, 56, 17, '#8fd4ee')
    r.rect(22, 9, 26, 13, '#ffe66a')
    r.rect(36, 12, 46, 18, '#8c94a2')
    r.rect(40, 10, 43, 12, '#c8ccd8')
    r.rect(18 + a * 2, 19, 21 + a * 2, 22, '#b9793c')
    # cortinas
    for x0, x1 in ((0, 9), (58, 67)):
        r.rect(x0, 0, x1, 31, '#c8283c')
        for x in range(x0 + 1, x1, 3):
            r.rect(x, 0, x, 31, '#9a1a2e')
        r.rect(x0, 0, x1, 2, '#ffd860')
    # poltronas ao fundo
    for x in range(3, 66, 12):
        r.rect(x, 30, x + 8, 37, '#a01c34')
        r.rect(x + 1, 29, x + 7, 30, '#c8283c')
    # feixe do projetor
    r.rect(32, 0, 36, 1, '#ffe890' if a == 0 else '#fff6c8')


# --- 17 estúdio ------------------------------------------------------------------------------------------------------
def c_estudio(r, e, a):
    for y in range(0, PAREDE_H, 4):
        for k, x in enumerate(range(0, RW, 4)):
            cor = '#3c3c4c' if (k + y // 4) % 2 == 0 else '#4a4a5c'
            r.rect(x, y, x + 3, y + 3, cor)
            r.rect(x, y, x + 3, y, '#5a5a70')
            r.put(x + 3, y + 3, '#2a2a38')
    # luz "NO AR"
    caixa(r, 26, 3, 42, 11, '#26242e')
    r.rect(27, 4, 41, 10, '#ee3a54' if a == 0 else '#8a1c34')
    for x in (29, 33, 37):
        r.rect(x, 6, x + 2, 8, '#ffe0e4' if a == 0 else '#c8606c')
    # caixas de som
    for x0 in (2, 56):
        caixa(r, x0, 16, x0 + 9, 36, '#14101c')
        r.rect(x0 + 2, 19, x0 + 7, 24, '#3a3844')
        r.rect(x0 + 3, 20, x0 + 6, 23, '#26242e')
        r.rect(x0 + 2, 27, x0 + 7, 34, '#3a3844')
        r.rect(x0 + 3, 29, x0 + 6, 32, '#26242e')
        r.put(x0 + 4, 21 + a, '#6a6a76')
    # painel de luzinhas
    caixa(r, 22, 15, 46, 22, '#26242e')
    for k, x in enumerate(range(24, 45, 3)):
        r.rect(x, 17, x + 1, 20, ('#56d66a', '#ffd21e', '#ee4c4c')[(k + a) % 3])
    r.rect(0, PAREDE_H, RW - 1, RH - 1, '#2a2a38')
    r.rect(8, PAREDE_H + 2, 60, PAREDE_H + 5, '#4a4a5c')


# --- 18 costura ------------------------------------------------------------------------------------------------------
def c_costura(r, e, a):
    # prateleiras de carretéis
    cores = ['#ee4c4c', '#ffd21e', '#4a78d8', '#56d66a', '#b07af0', '#ff8a12', '#f08aa0', '#56c8ee']
    for y in (6, 14, 22):
        caixa(r, 3, y + 6, 36, y + 7, '#6e3c1c')
        for k, x in enumerate(range(4, 35, 4)):
            cor = cores[(k + y) % len(cores)]
            r.rect(x, y, x + 2, y + 5, cor)
            r.rect(x, y, x + 2, y, '#ffffff')
            r.rect(x, y + 5, x + 2, y + 5, '#3a2418')
    # manequim
    r.rect(52, 7, 56, 9, '#d8b080')
    r.rect(48, 10, 60, 24, '#e8cc9c')
    r.rect(49, 10, 59, 12, '#f4dcb0')
    r.rect(50, 24, 58, 26, '#d8b080')
    r.rect(54, 26, 54, 36, '#6e3c1c')
    r.rect(50, 36, 58, 37, '#6e3c1c')
    r.rect(48, 16, 60, 20, '#f08aa0')
    r.rect(48, 16, 60, 16, '#f6a8ba')
    for x in (50, 53, 57):
        r.put(x, 13, '#ee4c4c' if (x + a) % 2 else '#ffd21e')
    # rolos de tecido
    for x, cor in ((38, '#4a78d8'), (43, '#ee6aaa'), (62, '#56d66a')):
        r.rect(x, 28, x + 3, 37, cor)
        r.rect(x, 28, x + 3, 29, sombra(cor, 1.3))
        r.rect(x, 36, x + 3, 37, sombra(cor, 0.7))
    # janela com cortina
    janela(r, 40, 7, 46, 17, '#bfe4ff', [], '#f08aa0')


# --- Registro ----------------------------------------------------------------------------------------------------------
def registrar(novas):
    """Põe os cômodos novos no fim da lista: (id, [atividade do 1º morador, do 2º], padrão da parede, função que desenha)."""
    for nome, acts, padrao, desenhar in novas:
        SALAS.append((nome, acts))
        FUNDOS[nome] = (padrao, desenhar)


registrar([
    ('oficina', ['martelar', 'serrar'], 'liso', c_oficina),
    ('pizzaria', ['massa', 'pizza'], 'liso', c_pizzaria),
    ('cafeteria', ['barista', 'cafezinho'], 'bolinhas', c_cafeteria),
    ('cinema', ['filme', 'pipoca'], 'liso', c_cinema),
    ('estudio', ['podcast', 'camera'], 'liso', c_estudio),
    ('costura', ['costurar', 'medir'], 'bolinhas', c_costura),
])


# --- Lote 2: spa, aquário, horta, ringue, skate e circo -------------------------------------------------------------------
def c_spa(r, e, a):
    # parede de pedra
    for k, y in enumerate(range(0, PAREDE_H, 5)):
        for x in range((k % 2) * 4, RW, 9):
            r.rect(x, y, x + 7, y + 3, '#9fb0a2' if (x // 9 + k) % 3 else '#b4c4b4')
            r.rect(x, y, x + 7, y, '#c8d8c8')
    # banheira de água quente
    caixa(r, 2, 27, 40, 37, '#aeb4c0')
    r.rect(4, 28, 38, 35, '#56c8ee')
    for x in range(5 + a * 2, 38, 5):
        r.rect(x, 30, x + 1, 30, '#bff0ff')
        r.rect(x + 2, 33, x + 3, 33, '#2a8ac0')
    # vapor
    for k in range(4):
        x = 8 + k * 9
        r.rect(x + a, 21 - (k % 2) * 3, x + a + 1, 24 - (k % 2) * 3, '#e8f4f8')
    # prateleira com velas e toalhas
    caixa(r, 44, 14, 66, 15, '#6e3c1c')
    for x, cor in ((46, '#f8e8d0'), (52, '#f08aa0'), (58, '#f8e8d0')):
        r.rect(x, 9, x + 2, 13, cor)
        r.rect(x + 1, 7 - a, x + 1, 8, '#ffd21e')
        r.rect(x + 1, 6 - a, x + 1, 6 - a, '#ff8a12')
    r.rect(46, 20, 62, 23, '#ffffff')
    r.rect(46, 24, 62, 27, '#f08aa0')
    r.rect(48, 28, 60, 31, '#bfe4ff')
    r.rect(46, 32, 62, 32, '#6e3c1c')
    # orquídea
    r.rect(63, 33, 66, 37, '#a66a34')
    r.rect(64, 24, 64, 33, '#3a9a48')
    for (x, y) in ((63, 22), (65, 24), (62, 26)):
        r.rect(x, y, x + 1, y + 1, '#f08aa0')


def c_aquario(r, e, a):
    caixa(r, 2, 3, 65, 31, '#6e3c1c')
    for k, y in enumerate(range(5, 30, 4)):
        r.rect(4, y, 63, y + 3, ('#2a78c8', '#3a8ad8', '#4a9ae0', '#5aaaf0', '#6abaf6', '#7acaf8', '#8adafc')[min(k, 6)])
    r.rect(4, 26, 63, 29, '#e8d29a')
    # plantas e castelo
    for x in (8, 20, 46, 58):
        for k in range(6):
            r.put(x + (k + a) % 2, 25 - k, '#3a9a48')
            r.put(x + 1 + (k + a) % 2, 25 - k, '#56c860')
    r.rect(30, 20, 40, 28, '#b8a8c8')
    r.rect(30, 17, 32, 20, '#b8a8c8')
    r.rect(35, 17, 37, 20, '#b8a8c8')
    r.rect(38, 17, 40, 20, '#b8a8c8')
    r.rect(34, 24, 36, 28, '#3a2a58')
    # peixes
    for (x, y, cor) in ((14, 10, '#ff8a12'), (44, 14, '#ee4c6a'), (28, 8, '#ffd21e'), (54, 20, '#b07af0')):
        x += a * 4 * (1 if cor in ('#ff8a12', '#ffd21e') else -1)
        r.rect(x, y, x + 4, y + 2, cor)
        r.rect(x + 5, y - 1, x + 6, y + 3, cor)
        r.put(x + 1, y, '#ffffff')
    # bolhas e luz
    for (x, y) in ((22, 12), (23, 8), (50, 10), (51, 6)):
        r.put(x, y - a * 2, '#d8f4ff')
    r.rect(4, 5, 63, 5, '#e8fcff')
    r.rect(2, 0, 65, 2, '#ffd860' if a == 0 else '#fff2b0')


def c_horta(r, e, a):
    # celeiro de madeira
    for x in range(0, RW, 6):
        r.rect(x, 0, x + 4, PAREDE_H - 1, '#b04a3a')
        r.rect(x + 5, 0, x + 5, PAREDE_H - 1, '#7a2e24')
    janela(r, 26, 6, 40, 18, '#bfe4ff', [], None)
    r.rect(27, 14, 39, 18, '#56a050')
    # prateleira com vasos e sementes
    caixa(r, 4, 14, 22, 15, '#6e3c1c')
    for x, cor in ((5, '#ee4c4c'), (10, '#ffd21e'), (15, '#56d66a')):
        r.rect(x, 8, x + 3, 13, '#f4f4ec')
        r.rect(x + 1, 10, x + 2, 11, cor)
    # carrinho de mão
    r.rect(44, 24, 62, 30, '#3a6cc8')
    r.rect(44, 24, 62, 24, '#5a8ce0')
    r.rect(56, 30, 64, 31, '#6e3c1c')
    r.rect(48, 31, 51, 36, '#26242e')
    r.rect(46, 22, 60, 23, '#7a4a28')
    # fardo de feno
    caixa(r, 46, 8, 64, 20, '#e8c44a')
    for y in (11, 14, 17):
        r.rect(46, y, 64, y, '#b8942a')
    r.rect(54, 8, 54, 20, '#8a5a1c')
    # chão de terra com mudas
    r.rect(0, PAREDE_H, RW - 1, RH - 1, '#7a4e2a')
    for y in (PAREDE_H + 2, PAREDE_H + 5):
        r.rect(0, y, RW - 1, y, '#5c3a1e')
    for x in range(3, RW, 8):
        r.rect(x, PAREDE_H + 1 - (x // 8 + a) % 2, x + 1, PAREDE_H + 1, '#3a9a48')


def c_ringue(r, e, a):
    r.rect(0, 0, RW - 1, PAREDE_H - 1, '#1c1a30')
    # plateia
    gerador = random.Random(2)
    for x in range(1, RW, 5):
        y = 10 + gerador.randrange(0, 4)
        cor = gerador.choice(('#3a3a58', '#4a3a58', '#ee4c4c', '#ffd21e', '#4a78d8', '#56b050'))
        r.rect(x, y, x + 3, y + 3, '#d8b080')
        r.rect(x, y - 1, x + 3, y, cor)
        r.rect(x - 1, y + 4, x + 4, y + 9, '#26263a')
    # refletor
    r.rect(30, 0, 38, 2, '#9a9ca8')
    r.rect(28, 3, 40, 5, '#fff2b0' if a == 0 else '#ffe890')
    # cordas e postes
    for y, cor in ((18, '#ee4c4c'), (25, '#ffffff'), (32, '#4a78d8')):
        r.rect(0, y, RW - 1, y + 1, cor)
        r.rect(0, y + 2, RW - 1, y + 2, sombra(cor, 0.6))
    for x0 in (0, 63):
        r.rect(x0, 14, x0 + 4, 37, '#6a6a76')
        r.rect(x0, 14, x0 + 4, 15, '#9a9ca8')
    # lona do ringue
    r.rect(0, PAREDE_H, RW - 1, RH - 1, '#cfd8e8')
    r.rect(0, PAREDE_H, RW - 1, PAREDE_H, '#4a78d8')
    for x in range(0, RW, 12):
        r.rect(x, PAREDE_H + 2, x + 5, PAREDE_H + 3, '#aebcd4')
    # cinturão de campeão no alto


def c_skate(r, e, a):
    r.rect(0, 0, RW - 1, PAREDE_H - 1, '#9a9ca8')
    for y in range(4, PAREDE_H, 6):
        r.rect(0, y, RW - 1, y, '#8c8e9a')
    for x in range(10, RW, 14):
        r.rect(x, 0, x, PAREDE_H - 1, '#8c8e9a')
    # grafites
    r.rect(6, 6, 26, 20, '#ff4fa0')
    r.rect(8, 8, 24, 18, '#4fd4ff')
    r.rect(12, 10, 20, 16, '#ffd21e')
    r.rect(15, 12, 17, 14, '#26242e')
    for k in range(5):
        r.rect(30 + k * 4, 8 + (k % 2) * 2, 32 + k * 4, 18 + (k % 2) * 2, ('#9dff4f', '#ff8a2a', '#b07af0', '#ee4c4c', '#ffd21e')[k])
    r.rect(48, 5, 62, 10, '#26242e')
    r.rect(50, 6, 60, 9, '#ffffff' if a == 0 else '#ffe890')
    r.rect(52, 7, 54, 8, '#ee4c4c')
    r.rect(57, 7, 59, 8, '#4a78d8')
    # rampa
    for k in range(14):
        r.rect(53 + k, 37 - k // 2 - (k * k) // 40, 66, 37, '#6a6a76')
    r.rect(52, 28, 53, 37, '#4a4a56')
    # chão de concreto
    r.rect(0, PAREDE_H, RW - 1, RH - 1, '#a8aab4')
    r.rect(0, PAREDE_H, RW - 1, PAREDE_H, '#c8cad4')
    for (x, y, w) in ((6, 40, 8), (30, 42, 6), (46, 41, 9)):
        r.rect(x, y, x + w, y, '#8c8e9a')
    # cones
    for x in (40, 44):
        r.rect(x, 34, x + 2, 37, '#ff8a12')
        r.rect(x, 35, x + 2, 35, '#ffffff')


def c_circo(r, e, a):
    for k, x in enumerate(range(0, RW, 8)):
        r.rect(x, 0, x + 3, PAREDE_H - 1, '#ee4c4c')
        r.rect(x + 4, 0, x + 7, PAREDE_H - 1, '#fff2d8')
    for x in range(0, RW, 8):
        r.rect(x, 0, x + 7, 3, '#ffd21e')
        r.rect(x + 1, 4, x + 6, 4, '#ffd21e')
        r.rect(x + 3, 5, x + 4, 5, '#ffd21e')
    # bandeirinhas
    for k, x in enumerate(range(2, RW - 4, 6)):
        cor = ('#4a78d8', '#ffd21e', '#ee4c4c', '#56b050')[k % 4]
        r.rect(x, 8 + (k % 2), x + 3, 11 + (k % 2), cor)
    # holofote
    for y in range(12, 37):
        larg = (y - 12) // 3
        r.rect(34 - larg, y, 34 + larg, y, '#ffe890' if a == 0 else '#fff2b0')
    r.rect(32, 6, 36, 11, '#6a6a76')
    # banquinho e tambor
    caixa(r, 52, 28, 62, 37, '#ee4c4c')
    r.rect(52, 31, 62, 32, '#ffd21e')
    r.rect(53, 25, 61, 27, '#fff2d8')
    # piso de serragem com círculo
    r.rect(0, PAREDE_H, RW - 1, RH - 1, '#d8a860')
    r.rect(0, PAREDE_H, RW - 1, PAREDE_H, '#ee4c4c')
    gerador = random.Random(13)
    for _ in range(18):
        r.put(gerador.randrange(0, RW), gerador.randrange(PAREDE_H + 1, RH), '#b98a40')


registrar([
    ('spa', ['mascara', 'sauna'], 'liso', c_spa),
    ('aquario', ['racao', 'mergulho'], 'liso', c_aquario),
    ('horta', ['cavar', 'colher'], 'liso', c_horta),
    ('ringue', ['boxe', 'sombra'], 'liso', c_ringue),
    ('skate', ['skate', 'patins'], 'liso', c_skate),
    ('circo', ['equilibrio', 'magica'], 'liso', c_circo),
])


# --- Lote 3: teatro, garagem, padaria, lavanderia, xadrez e churrasqueira ------------------------------------------------
def c_teatro(r, e, a):
    r.rect(0, 0, RW - 1, PAREDE_H - 1, '#3a2a58')
    # fundo pintado: lua e montanhas
    r.rect(12, 6, 56, 32, '#4a3a78')
    r.rect(12, 6, 56, 6, '#6a5a9a')
    r.rect(40, 9, 46, 15, '#fff3c4')
    r.rect(41, 10, 45, 14, '#fffbe0')
    for k in range(12, 56):
        r.rect(k, 26 - abs((k - 24) % 20 - 10) // 2, k, 32, '#2a1e48')
    r.put(20, 11 + a, '#ffe890')
    r.put(30, 9, '#ffe890')
    r.put(52, 18 - a, '#ffe890')
    # máscaras douradas
    for x, cor, boca in ((26, '#ffd21e', 0), (36, '#c8b4f0', 1)):
        r.rect(x, 1, x + 6, 5, cor)
        r.rect(x + 1, 2, x + 2, 2, '#26242e')
        r.rect(x + 4, 2, x + 5, 2, '#26242e')
        r.rect(x + 2, 4 - boca, x + 4, 4 - boca, '#26242e')
    # cortinas
    for x0, x1 in ((0, 10), (57, 67)):
        r.rect(x0, 0, x1, 35, '#b01c34')
        for x in range(x0 + 1, x1, 3):
            r.rect(x, 0, x, 35, '#7a1224')
        r.rect(x0, 0, x1, 2, '#ffd860')
    r.rect(0, 0, RW - 1, 1, '#ffd860')
    # palco de tábuas
    r.rect(0, PAREDE_H, RW - 1, RH - 1, '#a8703a')
    for x in range(0, RW, 9):
        r.rect(x, PAREDE_H, x, RH - 1, '#7c4a24')
    r.rect(0, PAREDE_H, RW - 1, PAREDE_H, '#d8a060')
    r.rect(0, PAREDE_H - 2, RW - 1, PAREDE_H - 1, '#6e3c1c')


def c_garagem(r, e, a):
    r.rect(0, 0, RW - 1, PAREDE_H - 1, '#b8b8c4')
    for y in range(0, PAREDE_H, 6):
        r.rect(0, y, RW - 1, y, '#a0a0ae')
    # porta de rolo meio aberta
    caixa(r, 10, 2, 42, 30, '#7a7a88')
    for y in range(4, 16, 3):
        r.rect(11, y, 41, y, '#9a9aa8')
        r.rect(11, y + 1, 41, y + 1, '#5a5a68')
    r.rect(11, 17, 41, 29, '#1a2250')
    r.put(18, 21 + a, '#fff6b8')
    r.put(33, 24, '#fff6b8')
    r.rect(11, 29, 41, 29, '#3a3a48')
    # pilha de pneus
    for y, x in ((26, 46), (31, 46), (28, 55), (33, 55)):
        r.rect(x, y, x + 7, y + 4, '#26242e')
        r.rect(x + 2, y + 1, x + 5, y + 3, '#6a6a76')
    # caixa de ferramentas
    caixa(r, 58, 16, 66, 37, '#d8283c')
    for y in (21, 27, 33):
        r.rect(59, y, 65, y, '#7a1224')
        r.rect(61, y + 2, 63, y + 2, '#ffd860')
    # lâmpada
    r.rect(24, 0, 26, 1, '#6a6a76')
    r.rect(22, 2, 28, 3, '#ffe890' if a == 0 else '#fff6c8')
    # mancha de óleo
    r.rect(20, 41, 34, 43, '#6a6a76')
    r.rect(0, PAREDE_H, RW - 1, RH - 1, '#8c8e9a')
    r.rect(0, PAREDE_H, RW - 1, PAREDE_H, '#b0b2bc')
    r.rect(22, 41, 36, 43, '#5a5a68')


def c_padaria(r, e, a):
    r.rect(0, 0, RW - 1, PAREDE_H - 1, '#f4e0a8')
    for x in range(0, RW, 7):
        r.rect(x, 0, x, PAREDE_H - 1, '#e8cc88')
    # prateleiras de pães
    for y in (8, 18, 28):
        caixa(r, 2, y + 5, 36, y + 6, '#6e3c1c')
        for k, x in enumerate(range(4, 34, 7)):
            r.rect(x, y, x + 5, y + 4, '#c8843a')
            r.rect(x + 1, y, x + 4, y, '#e8a45a')
            r.rect(x + 1, y + 2, x + 2, y + 2, '#a8622a')
            r.rect(x + 3, y + 2, x + 4, y + 2, '#a8622a')
    # placa
    caixa(r, 42, 6, 64, 16, '#26382e')
    r.rect(46, 9, 50, 13, '#f4f4ec')
    r.rect(52, 9, 54, 13, '#f4f4ec')
    r.rect(56, 9, 60, 13, '#f4f4ec')
    r.put(47, 8 + a, '#ffd860')
    # vitrine de doces
    caixa(r, 42, 24, 66, 37, '#dff0f8')
    r.rect(43, 25, 65, 36, '#bfe4ff')
    r.rect(42, 31, 66, 31, '#8c94a2')
    for x, cor in ((45, '#f08aa0'), (52, '#8a5a34'), (59, '#ffd860')):
        r.rect(x, 27, x + 4, 30, cor)
        r.rect(x, 27, x + 4, 27, '#ffffff')
    for x, cor in ((46, '#ee4c4c'), (54, '#ffffff'), (61, '#b07af0')):
        r.rect(x, 33, x + 3, 35, cor)
    # trigo no teto
    for x in (40, 52):
        r.rect(x, 0, x, 3, '#b8942a')
        r.rect(x - 1, 3, x + 1, 5, '#e8c44a')


def c_lavanderia(r, e, a):
    piso(r, '#dff0f8', '#8fb4d8')
    r.rect(0, 0, RW - 1, PAREDE_H - 1, '#cfe4f2')
    for x in range(0, RW, 8):
        r.rect(x, 0, x, PAREDE_H - 1, '#bcd8ec')
    # prateleira de sabão
    caixa(r, 3, 10, 40, 11, '#6e3c1c')
    for x, cor in ((5, '#4a78d8'), (11, '#ee6aaa'), (17, '#56d66a'), (24, '#ffd21e'), (31, '#b07af0')):
        r.rect(x, 3, x + 4, 9, cor)
        r.rect(x + 1, 1, x + 3, 2, '#f4f4ec')
        r.rect(x, 5, x + 4, 6, '#ffffff')
    # máquinas de lavar
    for x in (3, 22, 41):
        caixa(r, x, 18, x + 16, 37, '#f4f4f8')
        r.rect(x, 18, x + 16, 21, '#aeb4c0')
        r.rect(x + 3, 19, x + 5, 20, '#56d66a')
        r.rect(x + 4, 24, x + 12, 32, '#8c94a2')
        r.rect(x + 5, 25, x + 11, 31, '#56a8d8' if a == 0 else '#7ac4ee')
        r.rect(x + 6 + a, 27, x + 8 + a, 29, '#e8fcff')
    # varal com meias
    r.rect(46, 4, 66, 4, '#8c8e9a')
    for x, cor in ((48, '#ee4c4c'), (54, '#ffd21e'), (60, '#4a78d8')):
        r.rect(x, 5, x + 2, 9, cor)


def c_xadrez(r, e, a):
    r.rect(0, 0, RW - 1, PAREDE_H - 1, '#5a3a24')
    for x in range(0, RW, 5):
        r.rect(x, 0, x, PAREDE_H - 1, '#4a2e1a')
    # janela com lua
    janela(r, 6, 6, 18, 20, '#14183a', [(2, 3), (7, 9), (3, 11)], None, a)
    r.rect(12, 9, 15, 12, '#fff3c4')
    # quadro de tabuleiro
    caixa(r, 24, 5, 42, 23, '#c8a040')
    for j in range(8):
        for i in range(8):
            cor = '#f4f0e0' if (i + j) % 2 == 0 else '#26242e'
            r.rect(26 + i * 2, 7 + j * 2, 27 + i * 2, 8 + j * 2, cor)
    # estante
    caixa(r, 48, 3, 66, 36, '#3a2418')
    for y in (10, 18, 26):
        r.rect(49, y, 65, y, '#6e3c1c')
    gerador = random.Random(9)
    cores = ['#ee4c4c', '#4a78d8', '#ffd21e', '#56b050', '#b07af0', '#ff8a12']
    for y in (4, 11, 19, 27):
        x = 49
        while x < 65:
            larg = gerador.choice((1, 2, 2))
            r.rect(x, y, x + larg - 1, y + 5, gerador.choice(cores))
            x += larg
    # relógio
    r.rect(8, 26, 14, 32, '#d8c8a0')
    r.rect(9, 27, 13, 31, '#ffffff')
    r.put(11, 28, '#26242e')
    r.put(11, 29, '#26242e')
    r.put(12 if a else 10, 30, '#26242e')
    # piso xadrez
    piso(r, '#f4f0e0', '#26242e', 6, 2)


def c_churrasqueira(r, e, a):
    for y in range(0, PAREDE_H, 5):
        r.rect(0, y, RW - 1, y + 3, '#a8703a')
        r.rect(0, y + 4, RW - 1, y + 4, '#6e3c1c')
    # lareira de pedra com fogo
    caixa(r, 42, 8, 66, 37, '#8c8e9a')
    for k, y in enumerate(range(9, 37, 4)):
        for x in range(42 + (k % 2) * 4, 66, 8):
            r.rect(x, y, x + 6, y + 2, '#a8aab4' if (x + k) % 3 else '#6a6a76')
    r.rect(48, 22, 60, 37, '#26242e')
    r.rect(49, 21, 59, 21, '#26242e')
    r.rect(50, 32, 58, 36, '#ff6a1a' if a == 0 else '#ff9a2a')
    r.rect(52, 27 + a, 56, 33, '#ffd21e')
    r.rect(54, 25 + a, 54, 29, '#fff0a0')
    # carnes, linguiça, pimentas penduradas
    for x in (4, 10, 16, 22):
        r.rect(x, 0, x, 5, '#26242e')
    r.rect(3, 6, 5, 11, '#c83c3c')
    r.rect(9, 6, 11, 14, '#e8a090')
    r.rect(15, 6, 17, 10, '#ee4c4c')
    r.rect(21, 6, 23, 12, '#a85a3a')
    for k in range(5):
        r.rect(30, 2 + k * 3, 32, 3 + k * 3, '#ee3a3a')
        r.rect(34, 3 + k * 3, 36, 4 + k * 3, '#f4f4ec')
    # chifre decorativo e ferradura
    r.rect(28, 18, 32, 20, '#e8e0c8')
    r.rect(27, 16, 28, 18, '#e8e0c8')
    r.rect(32, 16, 33, 18, '#e8e0c8')
    # piso de ladrilho
    piso(r, '#c8643a', '#a8482a', 6, 2)


registrar([
    ('teatro', ['drama', 'marionete'], 'liso', c_teatro),
    ('garagem', ['bicicleta', 'chave'], 'liso', c_garagem),
    ('padaria', ['sovar', 'pao'], 'liso', c_padaria),
    ('lavanderia', ['lavar', 'varal'], 'liso', c_lavanderia),
    ('xadrez', ['xadrez', 'quebra'], 'liso', c_xadrez),
    ('churrasqueira', ['churrasco', 'abanar'], 'liso', c_churrasqueira),
])


# --- Lote 4: escola, consultório, espaço, praia, neve e robôs --------------------------------------------------------------
def c_escola(r, e, a):
    # alfabeto colorido no alto
    cores = ['#ee4c4c', '#4a78d8', '#ffd21e', '#56b050', '#b07af0', '#ff8a12']
    for k, x in enumerate(range(1, RW - 3, 5)):
        r.rect(x, 1, x + 3, 4, cores[k % 6])
        r.rect(x + 1, 2, x + 2, 3, '#ffffff')
    # lousa grande
    caixa(r, 4, 7, 42, 29, '#8a5a34')
    r.rect(5, 8, 41, 28, '#2f5a42')
    r.rect(8, 11, 20, 11, '#f4f4ec')
    r.rect(8, 15, 16, 15, '#f4f4ec')
    r.rect(8, 19, 22, 19, '#f4f4ec')
    r.rect(27, 12, 36, 21, '#2f5a42')
    r.rect(30, 14, 33, 17, '#ffd21e')
    r.put(31 + a, 12, '#ffd21e')
    r.rect(8, 23, 14, 23, '#ffd860')
    r.rect(5, 29, 41, 29, '#6e3c1c')
    r.rect(10, 28, 12, 28, '#f4f4ec')
    # globo e mapa
    r.rect(55, 22, 55, 33, '#6e3c1c')
    r.rect(51, 33, 59, 34, '#6e3c1c')
    for y in range(14, 25):
        for x in range(49, 62):
            if ((x - 55) / 6.4) ** 2 + ((y - 19) / 5.2) ** 2 <= 1:
                r.put(x, y, '#3a8ad8' if (x + y + a) % 5 else '#56b050')
    # sino
    r.rect(46, 8, 48, 11, '#ffd21e')


def c_consultorio(r, e, a):
    r.rect(0, 0, RW - 1, PAREDE_H - 1, '#d8f0e8')
    r.rect(0, 12, RW - 1, 12, '#b8dccc')
    # cruz verde
    r.rect(30, 3, 38, 11, '#ffffff')
    r.rect(33, 4, 35, 10, '#3aa858')
    r.rect(31, 6, 37, 8, '#3aa858')
    # tabela de olhos
    caixa(r, 4, 5, 20, 26, '#ffffff')
    r.rect(11, 7, 13, 8, '#26242e')
    for k, (y, w) in enumerate(((11, 3), (15, 2), (19, 2), (23, 1))):
        for x in range(6, 18, w + 3):
            r.rect(x, y, x + w - 1, y + 1, '#26242e')
    # monitor de batimentos
    caixa(r, 46, 6, 66, 22, '#3a3a48')
    r.rect(48, 8, 64, 20, '#0a1a12')
    pts = [14, 14, 14, 11, 17, 14, 14, 9, 19, 14, 14, 14, 13, 15, 14, 14, 14]
    for k, y in enumerate(pts):
        r.put(48 + (k + a * 3) % 17, 8 + y - 6, '#56ff7a')
    r.put(62, 9, '#ee4c4c' if a == 0 else '#8a1c34')
    # carrinho
    caixa(r, 50, 26, 64, 37, '#aeb4c0')
    r.rect(52, 22, 54, 26, '#ee4c4c')
    r.rect(58, 22, 60, 26, '#4a78d8')
    # armário
    caixa(r, 24, 18, 42, 37, '#e8ecf2')
    r.rect(33, 19, 33, 36, '#aeb4c0')
    for y in (22, 29):
        r.rect(26, y, 31, y + 3, '#bfe4ff')
        r.rect(35, y, 40, y + 3, '#f4c8d4')


def c_espaco(r, e, a):
    r.rect(0, 0, RW - 1, PAREDE_H - 1, '#0e0e2a')
    gerador = random.Random(21)
    for k in range(26):
        x, y = gerador.randrange(1, RW - 1), gerador.randrange(1, PAREDE_H - 4)
        r.put(x, y, '#ffffff' if (k + a) % 2 else '#9a9ae0')
    # planeta com anel
    for y in range(6, 20):
        for x in range(40, 62):
            if ((x - 51) / 8.0) ** 2 + ((y - 13) / 6.0) ** 2 <= 1:
                r.put(x, y, '#ee8a4a' if (y + x // 3) % 4 else '#c86a30')
    r.rect(38, 12, 64, 13, '#ffd860')
    # vigia redonda com a Terra
    for y in range(4, 24):
        for x in range(6, 26):
            d = ((x - 16) ** 2 + (y - 14) ** 2) ** 0.5
            if d <= 9.5:
                r.put(x, y, '#2a5ac8' if d < 8 else '#aeb4c0')
                if d < 8 and ((x * 3 + y * 2 + a * 2) % 7 < 2):
                    r.put(x, y, '#56b050')
    # painel de controle
    caixa(r, 36, 26, 66, 37, '#3a3a52')
    for k, x in enumerate(range(38, 64, 4)):
        r.rect(x, 28, x + 2, 29, ('#56ff7a', '#ffd21e', '#ee4c4c')[(k + a) % 3])
        r.rect(x, 32, x + 2, 34, '#14101c')
    # piso metálico
    r.rect(0, PAREDE_H, RW - 1, RH - 1, '#6a6a7e')
    for x in range(0, RW, 8):
        r.rect(x, PAREDE_H, x, RH - 1, '#4a4a5c')
    r.rect(0, PAREDE_H, RW - 1, PAREDE_H, '#9a9ab0')
    r.rect(0, PAREDE_H + 3, RW - 1, PAREDE_H + 3, '#4a4a5c')


def c_praia(r, e, a):
    for k, y in enumerate(range(0, 22, 3)):
        r.rect(0, y, RW - 1, y + 2, ('#4a9ae0', '#5aaaf0', '#6abaf6', '#7acaf8', '#8adafc', '#9ae6fe', '#aaf0fe', '#bcf6fe')[k])
    # sol e nuvens
    r.rect(52, 3, 60, 11, '#ffe66a')
    r.rect(51, 4, 61, 10, '#ffe66a')
    for x, y in ((8, 5), (28, 8)):
        r.rect(x, y, x + 10, y + 3, '#ffffff')
        r.rect(x + 2, y - 2, x + 7, y, '#ffffff')
    # mar com ondinhas
    r.rect(0, 22, RW - 1, 34, '#2a8ac0')
    r.rect(0, 22, RW - 1, 22, '#7ae0f0')
    for k, y in enumerate((25, 29, 33)):
        for x in range(((k + a) % 2) * 3, RW, 7):
            r.rect(x, y, x + 2, y, '#bff0ff')
    # coqueiro e guarda-sol
    r.rect(8, 12, 9, 34, '#8a5a34')
    for dx, dy in ((-6, 2), (-4, 0), (4, 0), (6, 2), (0, -2)):
        r.rect(9 + dx - 2, 11 + dy, 9 + dx + 3, 12 + dy, '#3a9a48')
    r.rect(8, 13, 10, 14, '#6e3c1c')
    r.rect(57, 20, 57, 36, '#6e3c1c')
    for k, x in enumerate(range(48, 67, 3)):
        r.rect(x, 19 + abs(k - 3) // 2, x + 2, 22 + abs(k - 3) // 2, '#ee4c4c' if k % 2 == 0 else '#ffffff')
    # areia
    r.rect(0, 35, RW - 1, RH - 1, '#f0d890')
    r.rect(0, 35, RW - 1, 35, '#fff0b8')
    gerador = random.Random(4)
    for _ in range(14):
        r.put(gerador.randrange(0, RW), gerador.randrange(37, RH), '#d8b868')
    r.rect(36, 40, 38, 41, '#f08aa0')


def c_neve(r, e, a):
    for x in range(0, RW, 6):
        r.rect(x, 0, x + 4, PAREDE_H - 1, '#9a6a3a')
        r.rect(x + 5, 0, x + 5, PAREDE_H - 1, '#6e4624')
    # janela com neve caindo
    caixa(r, 4, 6, 24, 24, '#e8f4ff')
    r.rect(5, 7, 23, 23, '#7ab0e8')
    gerador = random.Random(6)
    for k in range(14):
        x, y = gerador.randrange(6, 23), gerador.randrange(8, 22)
        r.put(x, (y + a * 2 - 8) % 15 + 8, '#ffffff')
    r.rect(5, 20, 23, 23, '#ffffff')
    r.rect(14, 7, 14, 23, '#e8f4ff')
    r.rect(5, 15, 23, 15, '#e8f4ff')
    # pinheiro enfeitado
    for k in range(4):
        w = 3 + k * 3
        r.rect(36 - w // 2, 8 + k * 6, 36 + w // 2, 13 + k * 6, '#2e8a44')
        r.rect(36 - w // 2, 13 + k * 6, 36 + w // 2, 13 + k * 6, '#1e6a34')
    r.rect(35, 32, 37, 36, '#6e3c1c')
    r.rect(35, 5, 37, 7, '#ffd21e')
    for k, (x, y) in enumerate(((33, 12), (38, 16), (32, 21), (40, 25), (35, 28), (31, 30), (41, 31))):
        r.rect(x, y, x + 1, y + 1, ('#ee4c4c', '#ffd21e', '#56c8ee')[(k + a) % 3])
    # lareira
    caixa(r, 48, 14, 66, 37, '#8c8e9a')
    r.rect(52, 22, 62, 37, '#26242e')
    r.rect(54, 31, 60, 36, '#ff6a1a' if a == 0 else '#ff9a2a')
    r.rect(56, 28 + a, 58, 32, '#ffd21e')
    r.rect(50, 10, 64, 13, '#6e3c1c')
    for x, cor in ((52, '#ee4c4c'), (57, '#ffffff'), (62, '#ee4c4c')):
        r.rect(x, 5, x + 1, 9, cor)
    # tapete branco felpudo
    r.rect(0, PAREDE_H, RW - 1, RH - 1, '#e8f0f8')
    r.rect(0, PAREDE_H, RW - 1, PAREDE_H, '#ffffff')
    for x in range(1, RW, 6):
        r.rect(x, PAREDE_H + 3, x + 2, PAREDE_H + 3, '#c8d8e8')


def c_robos(r, e, a):
    r.rect(0, 0, RW - 1, PAREDE_H - 1, '#4a5668')
    for x in range(0, RW, 17):
        r.rect(x, 0, x, PAREDE_H - 1, '#2e3848')
        for y in range(3, PAREDE_H, 8):
            r.put(x + 2, y, '#8a96aa')
            r.put(x + 14, y, '#8a96aa')
    # monitor gigante com olhos
    caixa(r, 20, 4, 48, 26, '#26303e')
    r.rect(22, 6, 46, 24, '#0a2a2e')
    olhos_y = 11 + (1 if a else 0)
    r.rect(26, olhos_y, 31, olhos_y + 5 - (3 if a else 0), '#56ffe0')
    r.rect(37, olhos_y, 42, olhos_y + 5 - (3 if a else 0), '#56ffe0')
    r.rect(28, 20, 40, 21, '#56ffe0')
    # engrenagens
    for cx, cy, cor in ((8, 10, '#ffd21e'), (60, 12, '#56c8ee')):
        for y in range(cy - 5, cy + 6):
            for x in range(cx - 5, cx + 6):
                d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
                if 2.2 <= d <= 4.2 or (d <= 5.2 and (x + y + a) % 3 == 0 and d > 3.5):
                    r.put(x, y, cor)
    # canos e luzes
    r.rect(2, 26, 12, 28, '#6a7a90')
    r.rect(56, 24, 66, 26, '#6a7a90')
    for k, x in enumerate(range(52, 66, 4)):
        r.rect(x, 4, x + 2, 5, ('#56ff7a', '#ee4c4c', '#ffd21e')[(k + a) % 3])
    # esteira no chão
    r.rect(0, PAREDE_H, RW - 1, RH - 1, '#2a2e3a')
    for x in range(-4 + a * 4, RW, 8):
        r.rect(x, PAREDE_H + 2, x + 3, PAREDE_H + 5, '#3e4658')
        r.rect(x + 2, PAREDE_H + 3, x + 3, PAREDE_H + 4, '#ffd21e')
    r.rect(0, PAREDE_H, RW - 1, PAREDE_H, '#6a7a90')


registrar([
    ('escola', ['lousa', 'ponteiro'], 'liso', c_escola),
    ('consultorio', ['medico', 'resfriado'], 'liso', c_consultorio),
    ('espaco', ['astronauta', 'foguete'], 'liso', c_espaco),
    ('praia', ['surfar', 'castelo'], 'liso', c_praia),
    ('neve', ['boneco', 'patinar'], 'liso', c_neve),
    ('robos', ['robo', 'solda'], 'liso', c_robos),
])
