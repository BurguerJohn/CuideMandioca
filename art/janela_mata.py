"""Mata Encantada: os 10 cenários da batalha (um para cada etapa da lista), as 19 criaturas do folclore (comuns e chefes) e os ícones
pequenos da janela (status, avisos, botões). Quem desenha é src/janela-mata.js.
"""

import math
import random

from PIL import Image

import janelas
import mata_criaturas
from casa import Tela, rgb
from render import outline

W, H = 224, 160
ARENA = 88                      # altura do cenário (a batalha); embaixo ficam os controles e a lista de itens
CHAO = 76                       # a linha dos pés
FUNDOS = 10


# --- Ferramentas -----------------------------------------------------------------------------------------------------------
def colinas(t, base, amp, per, cor, fase=0.0, fundo=ARENA):
    for x in range(W):
        y = base - amp * (0.5 + 0.5 * math.sin(x / per + fase)) - amp * 0.3 * math.sin(x / (per * 0.43) + fase * 2)
        t.rect(x, round(y), x, fundo, cor)


def pinheiro(t, x, base, alto, cor, claro):
    for k in range(alto):
        meia = 1 + (k * 5) // max(1, alto) * 1 + k // 3
        y = base - alto + k
        t.rect(x - meia, y, x + meia, y, cor if (k // 2) % 2 else claro)
    t.rect(x, base, x, base + 2, '#3a2418')


def arvore(t, x, base, alto, copa, copa2, tronco='#4a3220', largura=2):
    t.rect(x - largura // 2, base - alto // 2, x + largura // 2, base, tronco)
    janelas.elipse(t, x, base - alto * 0.7, alto * 0.38, alto * 0.34, copa, copa2)
    janelas.ruido(t, x - alto // 3, round(base - alto), x + alto // 3, round(base - alto * 0.5), alto, x, [copa2, copa])


def galho_seco(t, x, base, alto, cor, semente=1):
    gerador = random.Random(semente)
    t.rect(x, base - alto, x + 1, base, cor)
    for k in range(4):
        y = base - alto + 3 + k * (alto // 5)
        dx = gerador.choice((-1, 1))
        for i in range(1, 5 + gerador.randrange(4)):
            t.put(x + dx * i, y - i // 2, cor)
        t.put(x + dx * 5, y - 3, cor)


def chao(t, y0, cor, cor2, cor3, semente=2):
    t.rect(0, y0, W - 1, ARENA - 1, cor)
    janelas.ruido(t, 0, y0 + 1, W - 1, ARENA - 1, 260, semente, [cor2, cor3, cor2])
    for x in range(W):
        t.put(x, y0, cor3)


def chama_pequena(t, x, y, alto=4, cores=('#ff5a1c', '#ff8a1c', '#ffd23a')):
    for k in range(alto):
        t.put(x, y - k, cores[min(2, k * 3 // alto)] if k else cores[0])
        if k < alto - 2:
            t.put(x - 1, y - k, cores[0])
            t.put(x + 1, y - k, cores[0])
    t.put(x, y - alto, cores[2])


def vagalumes(t, quantos, semente, cor='#e8ff8a', y0=18, y1=70):
    gerador = random.Random(semente)
    for _ in range(quantos):
        t.put(gerador.randrange(4, W - 4), gerador.randrange(y0, y1), cor)


def lua(t, cx, cy, raio, cor, sombra, cratera):
    janelas.elipse(t, cx, cy, raio, raio, cor)
    for dx, dy, r in ((-5, -3, 3), (4, 4, 4), (6, -6, 2), (-3, 6, 2)):
        janelas.elipse(t, cx + dx, cy + dy, r, r, cratera)
    for y in range(cy - raio, cy + raio + 1):
        for x in range(cx - raio, cx + raio + 1):
            if (x - cx) ** 2 + (y - cy) ** 2 <= raio * raio and x - cx > raio * 0.55:
                t.put(x, y, sombra)


# --- Os cenários -----------------------------------------------------------------------------------------------------------
def mata_fechada():
    t = Tela(W, ARENA)
    janelas.degrade(t, 0, 0, W - 1, 56, ['#d4f0b0', '#b4e49c', '#98d68e', '#7cc47e'])
    colinas(t, 52, 10, 17, '#4a8a52', 0.4)
    colinas(t, 58, 8, 13, '#2f6a3a', 2.0)
    for x in (10, 38, 70, 104, 138, 170, 202, 222):
        largura = 5 + (x // 7) % 4
        t.rect(x - largura // 2, 0, x + largura // 2, 70, '#4a3220')
        t.rect(x - largura // 2, 0, x - largura // 2, 70, '#6a4a30')
        t.rect(x + largura // 2, 0, x + largura // 2, 70, '#2e1e14')
        for y in range(6, 66, 9):
            t.put(x + ((y // 9) % 3) - 1, y, '#2e1e14')
        for k in range(0, 22, 3):
            t.put(x + (k % 5) - 2, 8 + k * 2, '#3a8a3a')
    janelas.ruido(t, 0, 0, W - 1, 14, 150, 3, ['#2a6a34', '#3a8a40', '#1c5028'])
    for x in range(0, W, 2):
        t.rect(x, 0, x, 6 + (x * 7) % 8, '#2a6a34' if x % 4 else '#1c5028')
    for x0 in (30, 96, 150, 196):                         # raios de sol entre as copas
        for k in range(46):
            t.put(x0 + k // 2, 14 + k, '#e6f4b4' if k % 3 else '#f4fcd0')
    chao(t, 66, '#3f7a38', '#2c5e2c', '#5a9a44', 4)
    for x in (14, 60, 118, 176, 210):
        for k in range(5):
            t.put(x + k - 2, 70 - abs(k - 2) // 1 - 1, '#6ac05a')
            t.put(x, 70, '#3a8a3a')
    vagalumes(t, 8, 11)
    return t.im


def clareira():
    t = Tela(W, ARENA)
    janelas.degrade(t, 0, 0, W - 1, 58, ['#ffe6a0', '#ffd080', '#ffb468', '#ff9a58', '#e87a52', '#c05a4c'])
    janelas.elipse(t, 160, 56, 22, 22, '#ffe890', '#ffd870')
    janelas.elipse(t, 160, 56, 15, 15, '#fff4c0')
    colinas(t, 60, 8, 21, '#7a4a48', 1.0)
    for x in (8, 26, 44, 190, 206, 218):
        arvore(t, x, 66, 40 + (x % 5) * 3, '#3a2a3a', '#4e3446', '#2a1c24', 3)
    for x in range(60, 130, 18):
        pinheiro(t, x, 64, 18 + x % 7, '#4a3042', '#5a3a4e')
    chao(t, 66, '#8a9a3a', '#6a8030', '#a8b04a', 5)
    # Uma fogueirinha da Caipora, de lado.
    t.rect(34, 72, 44, 73, '#4a2a14')
    t.rect(36, 70, 42, 71, '#6a3c1c')
    chama_pequena(t, 39, 69, 6)
    chama_pequena(t, 37, 69, 4)
    vagalumes(t, 10, 12, '#fff4a0', 30, 66)
    return t.im


def beira_do_rio():
    t = Tela(W, ARENA)
    janelas.degrade(t, 0, 0, W - 1, 44, ['#9ad8f8', '#b4e4fa', '#cdeefc', '#e4f6fe'])
    for cx, cy, r in ((30, 12, 9), (46, 14, 7), (130, 9, 8), (146, 12, 6), (196, 16, 8)):
        janelas.elipse(t, cx, cy, r * 1.5, r * 0.7, '#ffffff', '#e6f2fc')
    colinas(t, 48, 9, 19, '#5aa05a', 0.8, 52)
    janelas.degrade(t, 0, 46, W - 1, 66, ['#58b0e0', '#4aa0d4', '#3c90c8', '#3280b8'])
    for x in range(0, W, 3):
        t.put(x, 48 + (x // 3) % 3 * 5, '#a8e0f8')
        t.put(x + 1, 52 + (x // 3) % 4 * 4, '#8ecff0')
    for cx, cy in ((24, 56), (88, 60), (150, 53), (196, 59)):
        janelas.elipse(t, cx, cy, 6, 2, '#3a9a48', '#2a7a38')
        t.rect(cx - 1, cy - 2, cx + 1, cy - 1, '#ff8ac0')
        t.put(cx, cy - 3, '#fff0f8')
    chao(t, 66, '#c8b27a', '#a89460', '#e0cc92', 6)
    for x in range(4, W, 11):                              # juncos na margem
        for k in range(7):
            t.put(x, 66 - k, '#4a8a3a')
        t.rect(x - 1, 59, x + 1, 61, '#7a4a28')
    return t.im


def campo_queimado():
    t = Tela(W, ARENA)
    janelas.degrade(t, 0, 0, W - 1, 62, ['#2a1014', '#4a1a16', '#7a2a18', '#a8401c', '#d8641e', '#f0902a'])
    for x in (30, 82, 150, 196):                           # colunas de fumaça
        for k in range(60):
            t.put(x + round(4 * math.sin(k / 6.0 + x)) + k // 12, 62 - k, '#3a2a2a' if k % 3 else '#524040')
    colinas(t, 60, 6, 23, '#2a1410', 0.2)
    for i, x in enumerate((14, 46, 100, 132, 178, 212)):
        galho_seco(t, x, 70, 22 + (i * 5) % 14, '#1a0e0c', i + 3)
    chao(t, 66, '#2e1a14', '#1e100c', '#4a2a1c', 7)
    gerador = random.Random(9)
    for _ in range(26):                                    # rachaduras de brasa
        x = gerador.randrange(4, W - 8)
        y = gerador.randrange(68, ARENA - 2)
        for k in range(gerador.randrange(3, 8)):
            t.put(x + k, y + (k % 2), '#ff7a1c' if k % 3 else '#ffd23a')
    for _ in range(30):
        t.put(gerador.randrange(W), gerador.randrange(20, 80), '#ffb040')
    return t.im


def encruzilhada():
    t = Tela(W, ARENA)
    janelas.degrade(t, 0, 0, W - 1, 58, ['#2a1a4a', '#3e2468', '#5a3078', '#84407a', '#b8567a', '#e87a6a'])
    janelas.estrelas(t, 0, 0, W, 34, 40, 21)
    colinas(t, 62, 6, 25, '#3a2448', 0.9)
    chao(t, 64, '#7a5a3a', '#6a4a2e', '#9a7a52', 8)
    # As duas estradas se cruzam: uma de ponta a ponta e outra descendo para o espectador.
    t.rect(0, 70, W - 1, 80, '#b8946a')
    for x in range(0, W, 2):
        t.put(x, 70, '#d0ac80')
        t.put(x + 1, 80, '#8a6a48')
    for y in range(64, ARENA):
        meia = 6 + (y - 64) // 2
        t.rect(112 - meia, y, 112 + meia, y, '#b8946a')
        t.put(112 - meia, y, '#8a6a48')
        t.put(112 + meia, y, '#d0ac80')
    galho_seco(t, 24, 66, 34, '#1c1220', 5)
    galho_seco(t, 200, 66, 30, '#1c1220', 8)
    # A placa de madeira no meio da encruzilhada e três velas acesas.
    t.rect(112, 40, 113, 70, '#5a3a20')
    for y, x0, x1 in ((42, 100, 126), (50, 106, 130)):
        t.rect(x0, y, x1, y + 5, '#8a5a30')
        t.rect(x0, y, x1, y, '#a8723c')
    for x in (96, 128, 150):
        t.rect(x, 72, x, 74, '#f4f0e0')
        t.put(x, 71, '#ffd23a')
    return t.im


def lua_cheia():
    t = Tela(W, ARENA)
    janelas.degrade(t, 0, 0, W - 1, 60, ['#080c26', '#101640', '#18205a', '#242c70'])
    janelas.estrelas(t, 0, 0, W, 50, 60, 31)
    lua(t, 164, 28, 19, '#fff4c0', '#e8d492', '#ead890')
    colinas(t, 62, 6, 21, '#0e1636', 1.5)
    for i, x in enumerate((12, 50, 122, 196, 216)):
        galho_seco(t, x, 70, 30 + (i * 7) % 16, '#06081a', i + 11)
    chao(t, 66, '#1a3640', '#12282e', '#2a4e56', 9)
    for k in range(5):                                      # névoa baixa
        y = 60 + k * 5
        for x in range(W):
            if (x // 6 + k) % 2:
                t.put(x, y, '#3a5a6a')
    for x, y in ((90, 18), (100, 24), (108, 15)):           # morcegos
        for dx, dy in ((-2, 0), (-1, 1), (0, 0), (1, 1), (2, 0)):
            t.put(x + dx, y + dy, '#05060f')
    return t.im


def casa_da_cuca():
    t = Tela(W, ARENA)
    janelas.degrade(t, 0, 0, W - 1, 62, ['#0a1e22', '#0e2c30', '#143c3c', '#1c4a44'])
    janelas.estrelas(t, 0, 0, W, 30, 16, 41, ('#a8f4d8', '#e8fff4'))
    colinas(t, 60, 7, 19, '#0c2020', 0.3)
    # A casa torta da Cuca, com a janela acesa e chaminé soltando fumaça verde.
    t.rect(150, 36, 196, 68, '#3a2a30')
    for k in range(24):
        t.rect(146 + k, 36 - k // 2, 200 - k, 36 - k // 2, '#2a1c28' if k % 2 else '#3a2638')
    t.rect(182, 18, 188, 34, '#2a1c28')
    t.rect(158, 46, 168, 56, '#e8d060')
    t.rect(163, 46, 163, 56, '#6a4a20')
    t.rect(158, 51, 168, 51, '#6a4a20')
    t.rect(176, 50, 186, 68, '#1a1218')
    for k in range(22):
        t.put(185 + round(3 * math.sin(k / 3.0)), 16 - k // 1 if 16 - k > 0 else 0, '#58e07a' if k % 2 else '#3ab85a')
    chao(t, 66, '#243628', '#1a281e', '#34503a', 10)
    for x, y in ((24, 74), (60, 80), (96, 72), (132, 82), (210, 74)):    # cogumelos e ossinhos
        t.rect(x, y, x, y + 2, '#e8e0cc')
        janelas.elipse(t, x, y, 3, 2, '#c83a6a', '#8a2248')
    for x, y in ((40, 77), (112, 79)):
        t.rect(x, y, x + 4, y, '#f4f0e0')
        t.put(x, y - 1, '#f4f0e0')
        t.put(x + 4, y + 1, '#f4f0e0')
    vagalumes(t, 12, 17, '#7affa0', 20, 74)
    return t.im


def brejo():
    t = Tela(W, ARENA)
    janelas.degrade(t, 0, 0, W - 1, 60, ['#d4d880', '#c0c868', '#aab858', '#98a84c'])
    colinas(t, 56, 7, 17, '#7a8c40', 0.5)
    for i, x in enumerate((18, 66, 118, 170, 208)):
        galho_seco(t, x, 68, 34 + (i * 5) % 12, '#3a3a22', i + 21)
        for k in range(5):                                  # musgo pendurado
            t.rect(x + 3 + k, 34 + i, x + 3 + k, 40 + (k * 3) % 7, '#7a9a4a')
    janelas.degrade(t, 0, 60, W - 1, 70, ['#6a7a3a', '#5a6a30'])
    chao(t, 68, '#58602c', '#444c22', '#74803a', 11)
    gerador = random.Random(13)
    for _ in range(14):                                     # poças com alga e bolhas
        x, y = gerador.randrange(6, W - 14), gerador.randrange(72, ARENA - 3)
        janelas.elipse(t, x, y, 7, 2, '#3a5a34', '#2a4426')
        t.put(x + 1, y - 1, '#a8d8a0')
    for x in range(6, W, 17):                               # taboas
        for k in range(10):
            t.put(x, 70 - k, '#4a7a30')
        t.rect(x - 1, 58, x, 62, '#6a3a1c')
    return t.im


def rio_negro():
    t = Tela(W, ARENA)
    janelas.degrade(t, 0, 0, W - 1, 40, ['#04060e', '#080e1c', '#0e1a30', '#162840'])
    janelas.estrelas(t, 0, 0, W, 30, 36, 51)
    lua(t, 56, 22, 11, '#e8f0ff', '#b8c8e0', '#c8d8f0')
    colinas(t, 44, 8, 15, '#06140e', 2.0, 48)
    janelas.degrade(t, 0, 44, W - 1, 66, ['#0a1424', '#0e1c32', '#122440', '#0a1424'])
    for k in range(8):                                      # reflexo da lua na água
        t.rect(56 - 5 + k % 3, 48 + k * 2, 56 + 5 - k % 2, 48 + k * 2, '#8ca4c8')
    for x in range(0, W, 5):
        t.put(x, 50 + (x // 5) % 4 * 4, '#2a4468')
    # O píer de tábuas onde a batalha acontece.
    t.rect(0, 66, W - 1, ARENA - 1, '#5a3a22')
    for x in range(0, W, 14):
        t.rect(x, 66, x, ARENA - 1, '#3a2414')
    for y in (66, 72, 78, 84):
        t.rect(0, y, W - 1, y, '#7a5230')
    for x in (6, 70, 140, 210):                             # estacas do píer, lampiões
        t.rect(x, 52, x + 1, 66, '#3a2414')
        t.rect(x - 1, 49, x + 2, 52, '#ffd060')
        t.put(x, 48, '#fff0a0')
    vagalumes(t, 12, 19, '#9affb0', 18, 64)
    return t.im


def arraia_encantado():
    t = Tela(W, ARENA)
    janelas.degrade(t, 0, 0, W - 1, 60, ['#0c1034', '#161a54', '#242a74', '#3a3490'])
    janelas.estrelas(t, 0, 0, W, 34, 34, 61)
    cores = ['#ff4a6a', '#ffd23a', '#4aff8a', '#4ab8ff', '#ff9a3a', '#e870ff']
    for cx, cy, r in ((40, 18, 8), (118, 12, 10), (186, 22, 8)):    # fogos de artifício
        cor = cores[(cx // 7) % len(cores)]
        for k in range(16):
            ang = k * math.pi / 8
            for d in range(r // 2, r):
                t.put(cx + round(math.cos(ang) * d), cy + round(math.sin(ang) * d), cor if d < r - 1 else '#ffffff')
    colinas(t, 58, 5, 27, '#1a1a48', 1.0)
    for x, cor in ((20, '#ff4a6a'), (64, '#4a8aff'), (150, '#ffd23a'), (200, '#4aff8a')):  # barracas ao fundo
        for k in range(14):
            t.rect(x - 14 + k // 2, 46 + k, x + 14 - k // 2, 46 + k, cor if (k // 2) % 2 else '#fff4e0')
        t.rect(x - 9, 56, x + 9, 66, '#2a2040')
        t.rect(x - 5, 58, x + 5, 64, '#ffd870')
    for k in range(2):                                      # varal de bandeirinhas por cima de tudo
        for x in range(W):
            y = 6 + k * 10 + round(5 * math.sin(x / 36.0 * math.pi))
            t.put(x, y, '#d8c8a0')
            if x % 7 == 3:
                cor = cores[(x // 7 + k) % len(cores)]
                t.rect(x - 1, y + 1, x + 1, y + 2, cor)
                t.put(x, y + 3, cor)
    chao(t, 66, '#8a6a3a', '#6e5230', '#a88850', 12)
    for x in range(8, W, 9):                                # palha e confete no chão
        t.put(x, 68 + (x * 5) % 18, cores[(x // 9) % len(cores)])
    chama = [(18, 66), (206, 66)]
    for x, y in chama:                                      # duas fogueiras nos cantos
        t.rect(x - 5, y + 1, x + 5, y + 3, '#4a2a14')
        for k in range(10):
            chama_pequena(t, x - 3 + k % 7, y - 1, 3 + (k * 3) % 8)
    return t.im


CENARIOS = [mata_fechada, clareira, beira_do_rio, campo_queimado, encruzilhada, lua_cheia, casa_da_cuca, brejo, rio_negro, arraia_encantado]


def fundos():
    return [cenario() for cenario in CENARIOS]


# --- Criaturas ---------------------------------------------------------------------------------------------------------------
def celulas(tabela):
    """As criaturas numa só tira: cada uma com 2 quadros, centrada na célula (a maior de todas) e encostada embaixo."""
    ids = list(tabela)
    largura = max(f.width for q in tabela.values() for f in q)
    altura = max(f.height for q in tabela.values() for f in q)
    quadros = []
    for id_ in ids:
        for f in tabela[id_]:
            c = Image.new('RGBA', (largura, altura), (0, 0, 0, 0))
            c.alpha_composite(f, ((largura - f.width) // 2, altura - f.height))
            quadros.append(c)
    return ids, quadros, largura, altura


# --- Ícones pequenos (9 x 9, com contorno ficam 11 x 11) ----------------------------------------------------------------------
LEG = {'k': '#26242e', 'r': '#e0343e', 'R': '#9a1a2e', 'w': '#f8f4ea', 'y': '#ffd21e', 'Y': '#c8981a', 'o': '#ff8a12', 'b': '#3a78d8', 'B': '#1a3a8a',
       'c': '#8fd4ee', 'l': '#56c860', 'L': '#2e8a44', 'n': '#8a5a34', 'p': '#ff80b8', 'P': '#c04888', 'm': '#a066e0', 'M': '#6a3ca8', 'g': '#9a9ca8',
       's': '#f0c8a0', 'O': '#c8680a'}
ICONES = {
    'coracao': ['.........', '.rr...rr.', 'rwrr.rrrr', 'rrrrrrrrr', 'rrrrrrrrr', '.rrrrrrR.', '..rrrrR..', '...rrR...', '....R....'],
    'milho': ['....l....', '...lyl...', '..lyyyl..', '..yYyYy..', '..yyyyy..', '..YyYyY..', '..yyyyy..', '...yyy...', '....y....'],
    'espada': ['........w', '.......ww', '......ww.', '.....ww..', '.y..ww...', '.yyww....', '..yy.....', '.nyyy....', 'n...y....'],
    'cruz': ['...rrr...', '...rwr...', '...rrr...', 'rrrrrrrrr', 'rwrrrrrrr', 'rrrrrrrrr', '...rrr...', '...rrR...', '...RRR...'],
    'escudo': ['.bbbbbbb.', '.bwwbbbb.', '.bwbbbbb.', '.bbbbbbB.', '.bbbbbbB.', '..bbbbB..', '..bbbbB..', '...bbB...', '....B....'],
    'raio': ['.....yyy.', '....yyy..', '...yyy...', '..yyyyyy.', '...yyyy..', '....yyy..', '...yy....', '..yy.....', '..y......'],
    'pata': ['..p...p..', '.ppp.ppp.', '.ppp.ppp.', '..p...p..', '...ppp...', '..ppppp..', '.ppppppp.', '.pp.p.pp.', '..p...p..'],
    'play': ['.........', '.ww......', '.wwww....', '.wwwwww..', '.wwwwwww.', '.wwwwww..', '.wwww....', '.ww......', '.........'],
    'pausa': ['.........', '.www.www.', '.www.www.', '.www.www.', '.www.www.', '.www.www.', '.www.www.', '.www.www.', '.........'],
    'esq': ['.........', '....w....', '...ww....', '..www....', '.wwwwwww.', '..www....', '...ww....', '....w....', '.........'],
    'dir': ['.........', '....w....', '....ww...', '....www..', '.wwwwwww.', '....www..', '....ww...', '....w....', '.........'],
    'cadeado': ['..ggggg..', '.gg...gg.', '.g.....g.', 'yyyyyyyyy', 'yYYYYYYYy', 'yYYYkYYYy', 'yYYYkYYYy', 'yYYYYYYYy', 'yyyyyyyyy'],
    'caveira': ['..wwwww..', '.wwwwwww.', 'wwkwwwkww', 'wwkwwwkww', '.wwwkwww.', '..wwwww..', '..wkwkw..', '..wwwww..', '.........'],
    'ponto': ['.........', '.........', '..ggggg..', '.ggkkkgg.', '.gkkkkkg.', '.ggkkkgg.', '..ggggg..', '.........', '.........'],
    'ponto-cheio': ['.........', '.........', '..yyyyy..', '.yyoooyy.', '.yooooOy.', '.yyoooyy.', '..yyyyy..', '.........', '.........'],
    'estrela': ['....y....', '....y....', '...yyy...', 'yyyyyyyyy', '.yyyyyyy.', '..yyyyy..', '..yyyyy..', '.yyy.yyy.', '.yy...yy.'],
    'teimosia': ['..yyyyy..', '.yyyyyyy.', 'yyrryrryy', 'yyyryryyy', 'yykyykyyy', 'yyyyyyyyy', 'yykkkkkyy', '.yyyyyyy.', '..yyyyy..'],
    'queima': ['....o....', '...oo....', '...ooo.o.', '..ooyoo..', '.oooyyoo.', '.ooyyyyo.', '.ooyyyyo.', '..oooooo.', '...oooo..'],
    'veneno': ['....l....', '...ll....', '...lL....', '..lllL...', '.lllllL..', '.lwllllL.', '.lllllLL.', '..lLLLL..', '...LLL...'],
    'tontura': ['.y.....y.', 'yyy...yyy', '.y..y..y.', '....yy...', '..y.yy.y.', '.yyy..yyy', '..y....y.', '.........', '.........'],
    'lento': ['....bbb..', '...bbbbb.', '..bbwbbb.', '..bbbbbb.', '.bbbbbbb.', '.bbBBBbb.', '..bbBbb..', '...bbb...', '....b....'],
    'fraqueza': ['....mmm..', '....mmm..', '....mmm..', '.mmmmmmm.', '..mmmmm..', '...mmm...', '....m....', '.........', '.........'],
    'confusao': ['..ppppp..', '.pp...pp.', 'pp.ppp.pp', 'p.pp.pp.p', 'p.p.p.p.p', 'p.pp.pp.p', 'pp.ppp.pp', '.pp...pp.', '..ppppp..'],
    'investida': ['...rrr...', '...rrr...', '...rrr...', '...rrr...', '...rrr...', '.........', '...rrr...', '...rrr...', '...rrr...'],
    'cura': ['...lll...', '...lwl...', '...lll...', 'lllllllll', 'lwlllllll', 'lllllllll', '...lll...', '...lLl...', '...LLL...'],
    'miss': ['.........', 'w.......w', '.w.....w.', '..w...w..', '...w.w...', '....w....', '...w.w...', '..w...w..', '.w.....w.'],
    'alvo': ['....r....', '...rrr...', '..rrrrr..', '.rrrrrrr.', 'rrrrrrrrr', '.........', '.........', '.........', '.........'],
    'enrage': ['r.......r', 'rr.....rr', '.rr...rr.', '.rrr.rrr.', '..rrrrr..', '.rrwrwrr.', '..rrrrr..', '...rrr...', '....r....'],
}


def icones():
    saida = {}
    for nome, linhas in ICONES.items():
        tela = Tela(9, 9)
        tela.grade(linhas, 0, 0, {k: rgb(v) for k, v in LEG.items()})
        saida[nome] = outline(tela.im)
    return saida


# --- Exportação -------------------------------------------------------------------------------------------------------------------
def exportar(add):
    ids_comuns, quadros_comuns, wc, hc = celulas(mata_criaturas.COMUNS)
    ids_chefes, quadros_chefes, wb, hb = celulas(mata_criaturas.CHEFES)
    nomes = list(ICONES)
    imagens = icones()
    return {
        'fundos': add('mata-fundos', fundos()),
        'comuns': {**add('mata-comuns', quadros_comuns), 'ids': ids_comuns},
        'chefes': {**add('mata-chefes', quadros_chefes), 'ids': ids_chefes},
        'ui': {**add('mata-ui', [imagens[nome] for nome in nomes]), 'ids': nomes},
        'chao': CHAO, 'arena': ARENA, 'w': W, 'h': H,
    }
