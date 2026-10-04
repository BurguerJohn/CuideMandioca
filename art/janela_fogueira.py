"""Fogueira de Perto: a clareira à noite (lua, capelinha lá longe, pinheiros, varal de bandeirinhas, bancos de tronco, pilha de lenha com machado, barraca de
comidas embaixo), as pedras da frente do fogo e as comidas dos espetos em 3 pontos (crua, dourando, no ponto). O fogo vem dos sprites da festa.
"""

import math
import random

import janelas
from casa import Tela, rgb
from render import outline

W, H = 224, 144
FOGO = (112, 106)                                          # onde fica o pé do fogo
# Os quatro espetos: a ponta de cada um (centro da comida) e o cabo (onde o espeto está fincado no chão).
PONTAS = [(80, 92), (86, 111), (138, 111), (144, 92)]
CABOS = [(52, 101), (52, 119), (172, 119), (172, 101)]
LENHA = (6, 102, 44, 128)                                  # a pilha de lenha (x0, y0, x1, y1): clicável
MEDIDOR = (6, 22, 18, 72)                                  # o termômetro do fogo (x0, y0, x1, y1)
BANCOS = [(4, 78), (176, 78)]                              # os bancos de tronco (canto de cima à esquerda); cada um tem um espectador
MENU_Y = 124
MENU_X = [52, 84, 116, 148]                                # onde ficam os quatro pacotes de comida
COMIDAS = ['milho', 'batata', 'linguica', 'queijo']
ESTADOS = ['cru', 'dourando', 'ponto']


# --- As comidas (24x14 + contorno): crua, dourando, no ponto -------------------------------------------------------------------
def tom(cor, f):
    """Clareia (f > 0) ou escurece (f < 0) uma cor hexadecimal."""
    r, g, b = rgb(cor)
    if f >= 0:
        return '#%02x%02x%02x' % (round(r + (255 - r) * f), round(g + (255 - g) * f), round(b + (255 - b) * f))
    return '#%02x%02x%02x' % (round(r * (1 + f)), round(g * (1 + f)), round(b * (1 + f)))


def triangulo(t, pontos, cor):
    """Triângulo cheio (os três vértices em (x, y))."""
    (x0, y0), (x1, y1), (x2, y2) = pontos
    area = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
    for y in range(min(y0, y1, y2), max(y0, y1, y2) + 1):
        for x in range(min(x0, x1, x2), max(x0, x1, x2) + 1):
            a = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / area
            b = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / area
            if a >= -0.01 and b >= -0.01 and 1 - a - b >= -0.01:
                t.put(x, y, cor)


def milho(estado):
    """Espiga de milho com a palha aberta numa ponta (como quem acabou de descascar): os grãos em grade, mais dourados e queimadinhos a cada ponto, e uma noz de
    manteiga derretendo no ponto."""
    t = Tela(24, 14)
    grao, luz, sombra = [('#f6e69a', '#fff8c8', '#d8c070'), ('#f2c040', '#ffe27a', '#c8902a'), ('#e8942a', '#ffcf5a', '#8a4a14')][estado]
    palha, palha_luz, palha_sombra = [('#7ab048', '#a6d868', '#4a7a2c'), ('#6e9a3c', '#98c85c', '#46682a'), ('#5a6a2c', '#7a8a3c', '#32401a')][estado]
    # A palha aberta na ponta da esquerda (duas folhas caídas e uma de trás).
    triangulo(t, [(8, 3), (0, 0), (3, 6)], palha)
    triangulo(t, [(8, 10), (0, 13), (3, 7)], palha)
    triangulo(t, [(7, 4), (1, 3), (4, 8)], palha_sombra)
    t.put(1, 1, palha_luz)
    t.put(2, 2, palha_luz)
    t.put(1, 12, palha_luz)
    t.put(2, 11, palha_luz)
    # O sabugo arredondado (mais fino na ponta) e os grãos.
    for y in range(3, 11):
        meia = 7.4 if 4 <= y <= 9 else 6.0
        for x in range(int(15 - meia), int(15 + meia) + 1):
            t.put(x, y, grao if y < 8 else sombra)
    for y in (4, 6, 8):
        for x in range(9, 22, 2):
            t.put(x, y, luz if y == 4 else sombra if y == 8 else tom(grao, -0.1))
    t.put(22, 6, sombra)
    # Marcas de brasa: dourando ganha pintinhas; no ponto, manchas escuras de queimadinho.
    if estado >= 1:
        for x, y in ((11, 5), (14, 7), (18, 4), (20, 8), (13, 9)):
            t.put(x, y, '#b87a20' if estado == 1 else '#6a3a10')
    if estado == 2:
        for x, y in ((12, 6), (13, 6), (17, 8), (18, 8), (16, 5)):
            t.put(x, y, '#3a2010')
        t.rect(10, 5, 16, 5, '#fff0a0')      # a manteiga brilhando
        t.rect(11, 4, 14, 4, '#ffffff')
        t.put(19, 10, '#ffd060')
    return outline(t.im)


def batata(estado):
    """Batata-doce inteira: roxa e lisa crua; a casca escurece e enruga dourando; no ponto racha e mostra o miolo laranja macio."""
    t = Tela(24, 14)
    casca, luz, sombra = [('#a8607a', '#d08aa0', '#7a3a58'), ('#8a4a52', '#b87078', '#5a2a38'), ('#4a2a30', '#7a4a48', '#241014')][estado]
    # O corpo comprido, mais fino nas pontas.
    for x in range(1, 23):
        meia = 4.6 * math.sin(math.pi * (x - 0.5) / 22) ** 0.6
        for y in range(int(7 - meia), int(7 + meia) + 1):
            t.put(x, y, casca if y < 8 else sombra)
    for x in range(4, 20):
        t.put(x, 4 + (1 if x % 5 == 0 else 0), luz)
    if estado == 1:
        for x, y in ((7, 8), (8, 8), (13, 6), (14, 6), (17, 9)):
            t.put(x, y, '#3a2020')
    if estado == 2:
        # A casca rachada em cima: o miolo laranja aparece, cremoso, com brilho e uma gotinha de mel.
        t.rect(6, 4, 17, 7, '#ff9a30')
        t.rect(7, 4, 16, 5, '#ffc060')
        t.rect(9, 4, 13, 4, '#fff0b0')
        for x in range(6, 18, 3):
            t.put(x, 3, casca)
            t.put(x + 1, 8, '#241014')
        t.put(16, 8, '#ffb040')
        t.put(16, 9, '#ffd060')
    return outline(t.im)


def linguica(estado):
    """Linguiça roliça: rosada e brilhante crua, dourada com as marcas da brasa dourando, e morena e suculenta no ponto, com gordurinha pingando."""
    t = Tela(24, 14)
    cor, luz, sombra = [('#e8a0a0', '#ffd0d0', '#c86a6a'), ('#d8683a', '#f0904a', '#a83a1c'), ('#8a4222', '#c8783a', '#4a2010')][estado]
    for x in range(1, 23):
        arredonda = 0 if 3 <= x <= 20 else 1
        topo = 4 + arredonda + (1 if x in (1, 22) else 0)
        base = 10 - arredonda
        for y in range(topo, base + 1):
            t.put(x, y, cor if y < base - 1 else sombra)
    t.rect(4, 5, 19, 5, luz)
    # As marcas da grelha em diagonal (a partir de dourando).
    if estado >= 1:
        for x in range(5, 20, 4):
            for k in range(5):
                t.put(x + k // 2, 4 + k, '#4a2410' if estado == 2 else '#8a3a1c')
    if estado == 0:
        for x in (4, 11, 18):
            t.put(x, 7, '#c86a6a')
    if estado == 2:
        for x, y in ((8, 6), (15, 6)):
            t.put(x, y, '#ffe090')
        t.put(20, 11, '#ffd060')
        t.put(20, 12, '#ffe898')
        t.put(5, 11, '#ffd060')
    # As pontas amarradas.
    t.put(0, 6, sombra)
    t.put(23, 6, sombra)
    return outline(t.im)


def queijo(estado):
    """Queijo coalho em fatia: creme lisinho cru, dourando com pintas, e no ponto com a crosta morena, listras da grelha e brilho de derretido."""
    t = Tela(24, 14)
    cor, luz, sombra = [('#fff0c0', '#ffffff', '#e8d498'), ('#f8d070', '#fff0a0', '#d8a838'), ('#e8a838', '#ffe090', '#a8661c')][estado]
    t.rect(2, 3, 21, 10, cor)
    t.rect(2, 10, 21, 10, sombra)
    t.rect(2, 3, 21, 3, luz)
    for x in (2, 21):
        t.put(x, 3, sombra)
        t.put(x, 10, sombra)
    if estado == 0:
        for x, y in ((6, 6), (12, 7), (17, 5)):
            t.put(x, y, '#e8d498')
    if estado >= 1:
        for x, y in ((5, 5), (6, 5), (10, 8), (11, 8), (16, 5), (17, 6), (19, 8)):
            t.put(x, y, '#c88a30' if estado == 1 else '#8a4a14')
    if estado == 2:
        for x in range(4, 20, 4):
            for k in range(6):
                t.put(x + k // 2, 4 + k, '#7a3a10')
        t.rect(6, 4, 9, 4, '#fff0b0')
        t.put(18, 11, '#ffd878')
        t.put(18, 12, '#fff0b0')
    return outline(t.im)


def comidas():
    return [{'milho': milho, 'batata': batata, 'linguica': linguica, 'queijo': queijo}[nome](estado) for nome in COMIDAS for estado in range(3)]


# --- O cenário -----------------------------------------------------------------------------------------------------------------
def pinheiro(t, cx, base, alto, cor, luz, sombra=None):
    """Pinheiro de camadas, com a luz da lua à direita e o tronco curto embaixo."""
    for k in range(6):
        y = base - alto + k * alto // 7
        largura = 3 + k * 4
        altura = alto // 6 + 3
        for dy in range(altura):
            w = max(1, largura * (dy + 1) // altura)
            t.rect(cx - w, y + dy, cx + w, y + dy, cor)
            t.put(cx + w, y + dy, luz)
            if sombra:
                t.put(cx - w, y + dy, sombra)
        t.rect(cx - largura, y + altura - 1, cx + largura, y + altura - 1, luz if k % 2 == 0 else cor)
    t.rect(cx - 1, base, cx + 1, base + 6, '#3a2418')


def morro(t, base, amplitude, fase, cor, topo):
    """Uma serra de morros lá longe (silhueta)."""
    for x in range(W):
        y = round(base - amplitude * (0.5 + 0.5 * math.sin(x / 31 + fase)) - amplitude * 0.4 * math.sin(x / 11 + fase * 2))
        t.rect(x, y, x, 78, cor)
        t.put(x, y, topo)


def capelinha(t, x, y):
    """Igrejinha de roça iluminada, bem longe, com a torre e uma cruz."""
    t.rect(x, y + 6, x + 12, y + 14, '#1a1a38')
    t.rect(x + 4, y, x + 8, y + 6, '#1a1a38')
    t.rect(x + 5, y - 2, x + 7, y - 1, '#1a1a38')
    t.put(x + 6, y - 4, '#d8c890')
    t.put(x + 6, y - 3, '#d8c890')
    t.put(x + 5, y - 3, '#d8c890')
    t.put(x + 7, y - 3, '#d8c890')
    t.rect(x + 5, y + 2, x + 7, y + 4, '#ffd060')
    t.rect(x + 2, y + 9, x + 3, y + 11, '#ffd060')
    t.rect(x + 9, y + 9, x + 10, y + 11, '#ffd060')


def banco(t, x0, y0):
    """Banco de tronco de lado a lado, com os pés curtos e o assento riscado."""
    t.rect(x0, y0, x0 + 38, y0 + 8, '#6e4426')
    t.rect(x0, y0, x0 + 38, y0 + 1, '#9a6a3c')
    t.rect(x0, y0 + 7, x0 + 38, y0 + 8, '#3a2418')
    for x in range(x0 + 4, x0 + 36, 7):
        t.put(x, y0 + 3, '#8a5a30')
        t.put(x + 1, y0 + 4, '#5a3418')
    t.rect(x0 + 2, y0 + 9, x0 + 5, y0 + 14, '#3a2418')
    t.rect(x0 + 33, y0 + 9, x0 + 36, y0 + 14, '#3a2418')
    t.rect(x0 + 2, y0 + 9, x0 + 2, y0 + 14, '#5a3418')
    t.rect(x0 + 33, y0 + 9, x0 + 33, y0 + 14, '#5a3418')


def pilha_de_lenha(t):
    """Pilha de toras (cada tora com o miolo claro) encostada num cepo com o machado cravado."""
    x0, y0, x1, y1 = LENHA
    for fila, n in enumerate((5, 4, 3)):
        y = y1 - 7 - fila * 7
        for k in range(n):
            x = x0 + 1 + k * 7 + fila * 3
            t.rect(x, y, x + 6, y + 6, '#6e4426')
            t.rect(x, y, x + 6, y, '#9a6a3c')
            t.rect(x, y + 6, x + 6, y + 6, '#3a2418')
            t.rect(x + 2, y + 2, x + 4, y + 4, '#d8b078')
            t.put(x + 3, y + 3, '#a8782e')


def balcao(t):
    """A tábua de baixo, onde ficam os pacotes de comida (cada um num vãozinho escuro)."""
    t.rect(46, MENU_Y - 2, 182, H - 1, '#52301a')
    t.rect(46, MENU_Y - 2, 182, MENU_Y - 1, '#a8662c')
    t.rect(46, MENU_Y, 182, MENU_Y, '#7a4220')
    for x in range(50, 182, 14):
        t.rect(x, MENU_Y + 2, x, H - 1, '#3e2210')
    for x in MENU_X:
        t.rect(x - 1, MENU_Y + 1, x + 27, H - 2, '#2e1a0c')
        t.rect(x, MENU_Y + 2, x + 26, H - 3, '#6a3c1c')
        t.rect(x, MENU_Y + 2, x + 26, MENU_Y + 2, '#7a4a28')


def fundo():
    t = Tela(W, H)
    janelas.degrade(t, 0, 0, W - 1, 78, ['#0a0a20', '#0e0d28', '#131236', '#181640', '#1e1c4a', '#262258', '#2f2a64', '#3a3474'])
    janelas.estrelas(t, 2, 2, W - 2, 54, 70, 17)
    for x, y in ((24, 10), (60, 6), (96, 14), (140, 8), (204, 30), (40, 34), (118, 28)):
        t.put(x, y, '#ffffff')
        t.put(x - 1, y, '#bcd0ff')
        t.put(x + 1, y, '#bcd0ff')
        t.put(x, y - 1, '#bcd0ff')
        t.put(x, y + 1, '#bcd0ff')
    # A lua cheia, com a luz em volta e as crateras.
    janelas.elipse(t, 186, 22, 15, 15, '#2c2860')
    janelas.elipse(t, 186, 22, 12, 12, '#3a3478')
    janelas.elipse(t, 186, 22, 8, 8, '#fff3c4')
    t.rect(183, 18, 185, 19, '#e8d596')
    t.rect(188, 23, 190, 24, '#e8d596')
    t.put(184, 26, '#e8d596')
    # Morros lá longe, a capelinha acesa e os pinheiros de trás.
    morro(t, 72, 14, 0.8, '#1a1a42', '#2a2a58')
    capelinha(t, 150, 55)
    morro(t, 78, 9, 2.2, '#10122e', '#1c1c44')
    for cx, alto in ((60, 26), (74, 20), (92, 24), (128, 22), (172, 28), (192, 22)):
        pinheiro(t, cx, 76, alto, '#0c2e2a', '#12423a', '#08201e')
    # Pinheiros grandes dos dois lados.
    for cx, alto in ((14, 62), (36, 46), (190, 52), (212, 66)):
        pinheiro(t, cx, 72, alto, '#0e3a30', '#1a5a46', '#0a2a24')
    # Varal de bandeirinhas de um poste ao outro.
    janelas.poste(t, 3, 4, 74)
    janelas.poste(t, W - 5, 4, 74)
    janelas.varal(t, 4, W - 4, 12, 28, 9)
    # Chão da clareira: grama escura, a terra batida em volta do fogo e as cinzas.
    t.rect(0, 78, W - 1, H - 1, '#26361f')
    janelas.ruido(t, 0, 78, W - 1, H - 1, 520, 41, ['#304a28', '#1e2c1a', '#3a5a30', '#2a4022'])
    janelas.elipse(t, FOGO[0], FOGO[1] + 4, 94, 26, '#4a3420', '#3a2818')
    janelas.ruido(t, 22, 84, 202, 130, 360, 42, ['#5a4028', '#3a2818', '#6a4a30', '#4a3420'])
    janelas.elipse(t, FOGO[0], FOGO[1] + 1, 34, 10, '#2a2018', '#1e160e')
    janelas.ruido(t, 84, 98, 140, 112, 70, 43, ['#4a3a30', '#14100c', '#6a5a4a'])
    # Capim e flores do mato nos cantos.
    gerador = random.Random(7)
    for _ in range(46):
        x = gerador.randrange(2, W - 2)
        y = gerador.randrange(80, 128)
        if (x - FOGO[0]) ** 2 / 100 ** 2 + (y - FOGO[1]) ** 2 / 28 ** 2 < 1:
            continue
        t.put(x, y, '#4a7a38')
        t.put(x, y - 1, '#6aa04a')
    for x, y, c in ((12, 124, '#ff7aa8'), (30, 118, '#ffe27a'), (202, 124, '#ffe27a'), (212, 116, '#ff7aa8'), (66, 128, '#9ad8ff')):
        t.put(x, y, c)
        t.put(x, y + 1, '#4a7a38')
    # As pedras de trás do fogo (a metade da frente fica em outra camada).
    for k in range(10):
        ang = math.pi + k / 9 * math.pi
        x = FOGO[0] + math.cos(ang) * 29
        y = FOGO[1] + 2 + math.sin(ang) * 8
        janelas.elipse(t, x, y, 5, 3, '#8c8e9a', '#5a5c68')
        t.rect(int(x) - 2, int(y) - 2, int(x) - 1, int(y) - 2, '#b4b6c2')
    # Toras cruzadas debaixo do fogo e o carvão em brasa.
    for dx, dy, comp in ((-20, 0, 40), (-16, -3, 32)):
        t.rect(FOGO[0] + dx, FOGO[1] + dy - 3, FOGO[0] + dx + comp, FOGO[1] + dy + 1, '#5c3820')
        t.rect(FOGO[0] + dx, FOGO[1] + dy - 3, FOGO[0] + dx + comp, FOGO[1] + dy - 3, '#8a5a34')
        t.rect(FOGO[0] + dx + comp - 2, FOGO[1] + dy - 2, FOGO[0] + dx + comp, FOGO[1] + dy, '#d8b078')
    for x in range(FOGO[0] - 12, FOGO[0] + 13, 3):
        t.put(x, FOGO[1] - 1, '#7a1e0e')
    # Bancos de tronco, pilha de lenha com machado e o cepo da direita com uma caneca.
    for x0, y0 in BANCOS:
        banco(t, x0, y0)
    pilha_de_lenha(t)
    t.rect(188, 104, 204, 112, '#6e4426')
    t.rect(188, 104, 204, 105, '#a87a44')
    t.rect(188, 112, 204, 114, '#3a2418')
    t.rect(194, 101, 198, 103, '#d8d4c8')
    t.rect(194, 99, 198, 100, '#b8b4a8')
    t.put(199, 101, '#b8b4a8')
    t.put(199, 102, '#b8b4a8')
    # O machado cravado no cepo.
    t.rect(190, 96, 191, 104, '#8a5a34')
    t.rect(186, 94, 191, 98, '#aeb4c0')
    t.rect(186, 94, 191, 94, '#dfe4ee')
    balcao(t)
    return t.im


def frente():
    """As pedras da frente do fogo (por cima das chamas, por baixo da comida) e capim da frente nos cantos."""
    t = Tela(W, H)
    for k in range(12):
        ang = k / 11 * math.pi
        x = FOGO[0] + math.cos(ang) * 30
        y = FOGO[1] + 4 + math.sin(ang) * 9
        janelas.elipse(t, x, y, 5.4, 3.4, '#9a9ca8', '#5e606c')
        t.rect(int(x) - 3, int(y) - 2, int(x) - 1, int(y) - 2, '#c8cad4')
        t.put(int(x) + 2, int(y) + 1, '#44464f')
    for x, base in ((2, 140), (10, 138), (206, 140), (216, 138)):
        for k in range(5):
            t.put(x + k, base - (k % 3), '#4a7a38')
            t.put(x + k, base - (k % 3) - 1, '#6aa04a')
    return t.im


def exportar(add):
    return {
        'fundo': add('janela-fogueira-fundo', fundo()),
        'frente': add('janela-fogueira-frente', frente()),
        'comidas': {**add('janela-fogueira-comidas', comidas()), 'ids': COMIDAS, 'estados': ESTADOS},
        'fogo': list(FOGO), 'pontas': [list(p) for p in PONTAS], 'cabos': [list(p) for p in CABOS], 'lenha': list(LENHA), 'medidor': list(MEDIDOR),
        'bancos': [list(b) for b in BANCOS], 'menu': MENU_Y, 'menuX': MENU_X, 'w': W, 'h': H,
    }
