"""Terreiros do tema Halloween, bem criativos: o Cemitério Mal-Assombrado (cruzes, lápide "RIP", cerca de ferro, caveira na estaca e mão de esqueleto em cima; caixão,
esqueleto deitado e pilhas de caveiras enterrados), o Aboboral (jack-o-lanterns, espantalho de cabeça de abóbora, milharal e abóboras acesas enterradas na terra) e o
Piso da Mansão (candelabro, gato preto, fantasma de corrente, relógio de carrilhão, e baú, chave e aranha escondidos debaixo do assoalho)."""

import math

from itens_novos import Grade, elipse
from tema_comum import ret, lin, grosso, poligono, contornar, peca_de, mini_texto
from tema_dino import paleta
from tema_halloween import terreno_proprio

C = dict(g='#8a8aa0', G='#b4b4cc', k='#3a3a4c', K='#22222e', m='#4a7a4a', M='#6aa060', c='#2a2430', w='#f4ecd8', W='#c8c0a8', y='#fff07a', o='#ff9a2a', r='#c0302c',
         n='#6a4a2a', N='#4a3018', p='#9a6a3a', s='#b8b4c0', S='#7a7684', e='#5ae0a0', t='#d8d8ea', u='#2e2a3c')


def cruz_musgo():
    g = Grade(10, 12)
    ret(g, 4, 1, 5, 11, 'g')
    ret(g, 1, 3, 8, 4, 'g')
    ret(g, 4, 1, 4, 11, 'G')
    ret(g, 1, 3, 8, 3, 'G')
    for x, y in ((5, 6), (5, 7), (6, 4), (2, 4), (4, 10), (5, 10), (3, 11), (6, 11)):
        g.pôr(x, y, 'm')
    g.pôr(5, 8, 'k')
    return g


def lapide_rip():
    """Lápide redonda com "RIP" gravado, uma rachadura e musgo na base."""
    g = Grade(12, 14)
    for y in range(14):
        meia = 5.5 if y > 4 else 5.5 * math.sqrt(max(0.0, 1 - ((4 - y) / 4.4) ** 2))
        for x in range(round(5.5 - meia), round(5.5 + meia) + 1):
            g.pôr(x, y, 'g' if x < 9 else 'S')
    for y in range(2, 8):
        g.pôr(2, y, 'G')
    mini_texto(g, 'RIP', 1, 5, 'k')
    lin(g, 8, 1, 6, 4, 'k')
    lin(g, 6, 4, 7, 7, 'k')
    for x in range(0, 12):
        if g.ler(x, 13) != '.':
            g.pôr(x, 13, 'm' if x % 2 else 'M')
            if x % 3 == 0:
                g.pôr(x, 12, 'm')
    return g


def obelisco():
    g = Grade(6, 15)
    ret(g, 1, 4, 4, 14, 'g')
    ret(g, 4, 4, 4, 14, 'S')
    poligono(g, [(1, 4), (2, 0), (3, 0), (4, 4)], 'G')
    ret(g, 0, 13, 5, 14, 'S')
    for y in (7, 9, 11):
        ret(g, 2, y, 3, y, 'k')
    return g


def cerca_ferro():
    """Cerquinha de ferro preto com pontas de lança e uma barra no meio, meio torta."""
    g = Grade(16, 10)
    for x in (1, 4, 7, 10, 13):
        ret(g, x, 3 + (1 if x == 7 else 0), x, 9, 'c')
        g.pôr(x, 1 + (1 if x == 7 else 0), 'c')
        g.pôr(x - 1, 3 + (1 if x == 7 else 0), 'c')
        g.pôr(x + 1, 3 + (1 if x == 7 else 0), 'c')
        g.pôr(x, 2 + (1 if x == 7 else 0), 'k')
    ret(g, 0, 5, 15, 5, 'c')
    ret(g, 0, 8, 15, 8, 'c')
    return g


def caveira_estaca():
    g = Grade(7, 11)
    ret(g, 3, 5, 3, 10, 'n')
    elipse(g, 3, 3, 3.0, 2.8, 'w')
    ret(g, 1, 5, 5, 5, 'w')
    for x, y in ((2, 2), (4, 2), (2, 3), (4, 3)):
        g.pôr(x, y, 'c')
    g.pôr(3, 4, 'c')
    for x in (2, 4):
        g.pôr(x, 5, 'c')
    return g


def vela_prato():
    g = Grade(6, 9)
    ret(g, 0, 7, 5, 8, 's')
    ret(g, 2, 3, 3, 7, 'w')
    ret(g, 3, 3, 3, 7, 'W')
    g.pôr(2, 2, 'o')
    g.pôr(3, 2, 'o')
    g.pôr(2, 1, 'y')
    g.pôr(2, 0, 'y')
    g.pôr(3, 1, 'o')
    g.pôr(1, 6, 'W')
    g.pôr(4, 5, 'w')
    return g


def mao_esqueleto():
    """Mão de esqueleto saindo do chão, com os dedos abertos."""
    g = Grade(9, 10)
    ret(g, 3, 6, 4, 9, 'w')
    ret(g, 2, 4, 5, 6, 'w')
    for x, y in ((0, 1), (0, 2), (1, 2), (2, 0), (2, 1), (3, 0), (3, 1), (5, 0), (5, 1), (6, 1), (7, 3), (7, 4), (6, 2), (6, 4)):
        g.pôr(x, y, 'w')
    for y in range(4, 10):
        g.pôr(4, y, 'W')
    ret(g, 0, 8, 8, 9, 'N')
    return g


def corvo_cruz():
    g = cruz_musgo()
    h = Grade(10, 15)
    for y in range(12):
        for x in range(10):
            if g.c[y][x] != '.':
                h.pôr(x, y + 3, g.c[y][x])
    elipse(h, 5, 2.2, 2.6, 1.8, 'c')
    h.pôr(7, 2, 'o')
    h.pôr(8, 2, 'o')
    h.pôr(6, 1, 'w')
    lin(h, 2, 2, 0, 4, 'c')
    return h


def arvore_seca():
    """Árvore seca e retorcida, sem folhas, com um buraco no tronco que parece uma carinha."""
    g = Grade(18, 17)
    ret(g, 8, 8, 10, 16, 'n')
    ret(g, 7, 13, 11, 16, 'n')
    ret(g, 8, 8, 8, 16, 'p')
    for x, y, x2, y2 in ((9, 8, 4, 3), (9, 7, 14, 2), (9, 9, 2, 8), (9, 9, 16, 7), (5, 4, 3, 1), (13, 3, 15, 0), (4, 3, 7, 1), (14, 2, 12, 0)):
        lin(g, x, y, x2, y2, 'n')
    ret(g, 8, 11, 9, 12, 'c')
    g.pôr(10, 11, 'c')
    return g


def caixao():
    """Caixão de madeira de seis lados, com uma cruz na tampa, enterrado na terra."""
    g = Grade(20, 9)
    poligono(g, [(0, 3), (3, 0), (16, 0), (19, 3), (16, 8), (3, 8)], 'n')
    for y in range(9):
        for x in range(20):
            if g.ler(x, y) == 'n' and (y >= 6 or x >= 17):
                g.pôr(x, y, 'N')
            elif g.ler(x, y) == 'n' and y == 1:
                g.pôr(x, y, 'p')
    ret(g, 9, 2, 10, 6, 'y')
    ret(g, 7, 3, 12, 3, 'y')
    return contornar(g, 'k')


def esqueleto_deitado():
    g = Grade(20, 7)
    elipse(g, 2.5, 3, 2.6, 2.6, 'w')
    g.pôr(2, 2, 'c')
    g.pôr(4, 2, 'c')
    lin(g, 5, 3, 18, 3, 'w')
    for x in (7, 9, 11, 13):
        ret(g, x, 1, x, 5, 'w')
    ret(g, 16, 2, 19, 4, 'w')
    return contornar(g, 'k')


def pilha_caveiras():
    g = Grade(13, 8)
    for cx, cy, r in ((3.5, 4.5, 3.2), (9.5, 4.5, 3.2), (6.5, 2.8, 2.8)):
        elipse(g, cx, cy, r, r, 'w')
    for x, y in ((2, 4), (4, 4), (8, 4), (10, 4), (5, 2), (7, 2)):
        g.pôr(x, y, 'c')
    ret(g, 3, 6, 10, 7, 'W')
    return contornar(g, 'k')


def lapide_caida():
    g = Grade(14, 8)
    poligono(g, [(1, 2), (11, 0), (13, 5), (3, 7)], 'g')
    lin(g, 3, 3, 10, 2, 'k')
    lin(g, 4, 5, 11, 4, 'k')
    return contornar(g, 'k')


def hand_enterrada():
    return mao_esqueleto()


terreno_proprio('cemiterio', {
    'top': paleta('#3e4e52', '#324246', '#4a5c60', '#3a4a4e'), 'mid': paleta('#26343a', '#2c3a42'), 'sub': paleta('#241c2c', '#1c1624'),
    'soil': paleta('#2a2030', '#1c1624', '#241a2a', '#150f1c'), 'deep': paleta('#150f1c', '#1c1624'), 'low': paleta('#0c0810'),
    'edge': paleta('#06040a'), 'speck': paleta('#c8c8dc', '#8a8aa4'), 'flowers': paleta('#d8d8f0', '#b8b8d0'),
    'tuft': paleta('#5a7a74', '#3a5a54', '#6a8a84'), 'root': paleta('#8a8aa0', '#5a5a74', '#a8a8c0', '#d8d8ea'), 'puddle': paleta('#5a6a8a', '#7a8aaa'),
    'decoGap': 18, 'buriedGap': 13,
    'deco': [peca_de(f(), **C) for f in (cruz_musgo, lapide_rip, obelisco, cerca_ferro, caveira_estaca, vela_prato, mao_esqueleto, corvo_cruz, arvore_seca)],
    'buried': [peca_de(f(), **C) for f in (caixao, esqueleto_deitado, pilha_caveiras, lapide_caida, hand_enterrada)]})


# --- Aboboral ------------------------------------------------------------------------------------------------------------------

A = dict(s='#3a8a2a', S='#7ad040', o='#ff8a12', O='#ffc23a', q='#d85a0a', d='#b8480a', y='#fff07a', k='#2a1c10', h='#f0c050', H='#c89030', r='#ee2f3c', n='#7a4a28',
         g='#5a9a32', G='#9ad060', w='#fffaf0', c='#e8c050', C='#b88a20', m='#8a5a28')


def abobora(rx, ry, cara=False, chapeu=False):
    g = Grade(round(rx * 2) + 3, round(ry * 2) + 5)
    cx, cy = rx + 1.4, ry + 3.2
    elipse(g, cx, cy, rx, ry, 'o')
    for y in range(g.h):
        for x in range(g.w):
            if g.ler(x, y) == 'o':
                if abs(x - cx) < 0.6 or abs(x - (cx - rx * 0.55)) < 0.5 or abs(x - (cx + rx * 0.55)) < 0.5:
                    g.pôr(x, y, 'q')
                elif x <= cx - rx * 0.6 and y < cy:
                    g.pôr(x, y, 'O')
                elif x >= cx + rx * 0.7 or y >= cy + ry * 0.7:
                    g.pôr(x, y, 'd')
    ret(g, round(cx) - 1, 0, round(cx), 3, 's')
    g.pôr(round(cx) + 1, 1, 'S')
    if cara:
        for dx in (-rx * 0.45, rx * 0.35):
            x0 = round(cx + dx)
            g.pôr(x0 + 1, round(cy - ry * 0.35), 'y')
            ret(g, x0, round(cy - ry * 0.2), x0 + 2, round(cy - ry * 0.2), 'y')
        ret(g, round(cx - rx * 0.5), round(cy + ry * 0.35), round(cx + rx * 0.5), round(cy + ry * 0.35), 'y')
        for x in range(round(cx - rx * 0.5), round(cx + rx * 0.5) + 1, 2):
            g.pôr(x, round(cy + ry * 0.35) + 1, 'y')
    if chapeu:
        elipse(g, cx, 3.6, rx * 0.9 + 1.0, 1.1, 'h')
        elipse(g, cx, 2.0, rx * 0.5, 1.3, 'h')
        ret(g, round(cx - rx * 0.5), 2, round(cx + rx * 0.5), 2, 'r')
    return g


def milho():
    """Pé de milho com duas espigas de palha, a bandeirinha de pendão no alto e folhas compridas."""
    g = Grade(9, 16)
    ret(g, 4, 3, 4, 15, 'g')
    for x, y, x2, y2 in ((4, 12, 0, 9), (4, 10, 8, 7), (4, 14, 8, 11), (4, 8, 0, 5)):
        lin(g, x, y, x2, y2, 'g')
        lin(g, x, y + 1, x2, y2 + 1, 'G')
    elipse(g, 6.2, 8.5, 1.4, 2.4, 'c')
    elipse(g, 2.2, 6.5, 1.3, 2.2, 'c')
    g.pôr(6, 7, 'C')
    g.pôr(2, 5, 'C')
    for x, y in ((3, 0), (4, 0), (5, 1), (3, 1), (4, 2), (2, 2), (6, 2)):
        g.pôr(x, y, 'c')
    return g


def espantalho_abobora():
    """Espantalho de cabeça de abóbora e chapéu de palha, de braços abertos num cabo de madeira, com um corvo no ombro."""
    g = Grade(15, 17)
    ret(g, 7, 6, 7, 16, 'n')
    ret(g, 1, 8, 13, 8, 'n')
    ret(g, 4, 9, 10, 13, 'r')
    for x in range(4, 11):
        for y in range(9, 14):
            if (x + y) % 2:
                g.pôr(x, y, 'h')
    for x, y in ((0, 9), (1, 10), (13, 9), (14, 10), (0, 7), (14, 7)):
        g.pôr(x, y, 'h')
    elipse(g, 7, 4.6, 3.8, 3.2, 'o')
    for x, y in ((6, 4), (8, 4), (7, 5)):
        g.pôr(x, y, 'y')
    ret(g, 5, 6, 9, 6, 'y')
    elipse(g, 7, 2.2, 5.2, 1.0, 'h')
    elipse(g, 7, 1.0, 2.6, 1.2, 'h')
    ret(g, 5, 1, 9, 1, 'r')
    elipse(g, 12, 6.6, 1.6, 1.2, 'k')
    g.pôr(13, 6, 'o')
    return g


def videira():
    g = Grade(15, 6)
    for x in range(15):
        g.pôr(x, 3 + round(1.3 * math.sin(x * 0.6)), 'g')
    for x, y in ((3, 1), (4, 1), (4, 0), (10, 5), (11, 5), (11, 4)):
        g.pôr(x, y, 'S')
    elipse(g, 8, 3, 1.6, 1.4, 'o')
    g.pôr(8, 1, 's')
    return g


def abobora_bruta():
    return abobora(4.4, 3.4)


def doce_embrulhado():
    g = Grade(10, 5)
    ret(g, 3, 1, 6, 3, 'r')
    ret(g, 3, 1, 4, 1, 'y')
    for x, y in ((0, 0), (0, 2), (1, 1), (9, 0), (9, 2), (8, 1)):
        g.pôr(x, y, 'r')
    ret(g, 1, 1, 2, 1, 'y')
    ret(g, 7, 1, 8, 1, 'y')
    return contornar(g, 'k')


def sementes():
    g = Grade(8, 4)
    for x, y in ((1, 1), (3, 2), (5, 1), (6, 3), (2, 3)):
        g.pôr(x, y, 'w')
        g.pôr(x + 1, y, 'c')
    return g


def abobora_acesa_enterrada():
    """Abóbora de cara esculpida enterrada na terra, com a luz de dentro brilhando pelos buracos."""
    g = abobora(4.2, 3.6, cara=True)
    return contornar(g, 'k')


def raiz_grossa():
    g = Grade(16, 5)
    for x in range(16):
        g.pôr(x, 2 + round(1.2 * math.sin(x * 0.55)), 'n')
        g.pôr(x, 3 + round(1.2 * math.sin(x * 0.55)), 'm')
    return g


terreno_proprio('aboboral', {
    'top': paleta('#4a8a2a', '#3a7a22', '#5a9a32', '#2e6a1c'), 'mid': paleta('#3a6a22', '#2e5a1c'), 'sub': paleta('#5a3a1a', '#4a2e14'),
    'soil': paleta('#4a2e14', '#5a3a1a', '#3a2410', '#4a2e14'), 'deep': paleta('#3a2410', '#4a2e14'), 'low': paleta('#2a180a'),
    'edge': paleta('#140a04'), 'speck': paleta('#ff8a12', '#c06a10'), 'flowers': paleta('#ffd21e', '#ff8a12'),
    'tuft': paleta('#5a9a32', '#3a7a22', '#7ab842'), 'root': paleta('#3a7a22', '#2e5a1c', '#5a9a32', '#9ad060'),
    'decoGap': 15, 'buriedGap': 14,
    'deco': [peca_de(f, **A) for f in (abobora(4.2, 3.4, cara=True), abobora(5.4, 4.4, cara=True), abobora(3.2, 2.6), abobora(4.0, 3.2, chapeu=True), milho(), espantalho_abobora(),
                                       videira())],
    'buried': [peca_de(f, **A) for f in (abobora_acesa_enterrada(), doce_embrulhado(), sementes(), raiz_grossa(), abobora_bruta())]})


# --- Piso da Mansão ------------------------------------------------------------------------------------------------------------

M = dict(s='#c4c0d0', S='#8e8a9c', y='#fff07a', o='#ff9a2a', w='#f4ecd8', W='#c8bca0', k='#14101c', K='#2a2438', e='#9ad048', f='#f0f4ff', F='#b8c8e8', a='#6a6a80',
         n='#6a4a28', N='#4a3018', r='#c0302c', R='#8a1c28', g='#d8a838', G='#a8801c', p='#b04aff', P='#7a2ad8', b='#8a5a3a', B='#5a3a22', d='#8a8aa0', l='#3a2c18')


def candelabro():
    """Candelabro de prata de três velas acesas, com a cera escorrendo."""
    g = Grade(13, 15)
    for x in (2, 6, 10):
        ret(g, x, 4, x + 1, 8, 'w')
        g.pôr(x, 3, 'o')
        g.pôr(x + 1, 3, 'o')
        g.pôr(x, 2, 'y')
        g.pôr(x, 1, 'y')
        g.pôr(x + 1, 2, 'o')
    lin(g, 2, 9, 6, 11, 's')
    lin(g, 10, 9, 6, 11, 's')
    ret(g, 6, 9, 7, 13, 's')
    ret(g, 3, 9, 10, 9, 's')
    ret(g, 4, 13, 9, 14, 'S')
    g.pôr(3, 6, 'W')
    g.pôr(11, 7, 'W')
    return g


def gato_preto():
    g = Grade(11, 11)
    elipse(g, 4.5, 7.2, 3.6, 3.4, 'k')
    elipse(g, 4.5, 3.4, 2.8, 2.6, 'k')
    for x, y in ((2, 0), (2, 1), (3, 1), (6, 0), (6, 1), (5, 1)):
        g.pôr(x, y, 'k')
    for x in (3, 6):
        g.pôr(x, 3, 'e')
        g.pôr(x, 4, 'e')
    g.pôr(4, 5, 'r')
    lin(g, 8, 9, 10, 5, 'k')
    lin(g, 9, 9, 10, 6, 'k')
    ret(g, 2, 9, 3, 10, 'K')
    ret(g, 6, 9, 7, 10, 'K')
    return g


def fantasma_corrente():
    """Fantasma preso a uma bola de ferro por uma corrente, de olhos tristes e a barra do lençol ondulada."""
    g = Grade(12, 14)
    elipse(g, 5.5, 4.6, 4.2, 4.0, 'f')
    ret(g, 1, 5, 10, 10, 'f')
    for x in range(1, 11):
        for y in range(10, 12 + (1 if (x // 2) % 2 == 0 else 0)):
            g.pôr(x, y, 'f')
    for x in range(8, 11):
        for y in range(2, 11):
            if g.ler(x, y) == 'f':
                g.pôr(x, y, 'F')
    ret(g, 3, 3, 4, 5, 'k')
    ret(g, 7, 3, 8, 5, 'k')
    ret(g, 5, 7, 6, 8, 'k')
    for x, y in ((9, 11), (10, 12)):
        g.pôr(x, y, 'a')
    elipse(g, 10.5, 12.3, 1.5, 1.5, 'a')
    return g


def relogio_carrilhao():
    g = Grade(9, 17)
    ret(g, 1, 3, 7, 16, 'n')
    ret(g, 1, 3, 1, 16, 'b')
    ret(g, 0, 15, 8, 16, 'B')
    ret(g, 2, 0, 6, 2, 'n')
    ret(g, 3, 0, 5, 0, 'b')
    elipse(g, 4, 6, 2.6, 2.6, 'w')
    g.pôr(4, 5, 'k')
    g.pôr(4, 6, 'k')
    g.pôr(5, 6, 'k')
    ret(g, 3, 10, 5, 14, 'l')
    g.pôr(4, 13, 'g')
    ret(g, 4, 10, 4, 12, 'g')
    return g


def vaso_rosa_murcha():
    g = Grade(8, 11)
    poligono(g, [(1, 6), (6, 6), (5, 10), (2, 10)], 'r')
    ret(g, 1, 6, 6, 6, 'R')
    lin(g, 3, 5, 3, 1, 'e')
    lin(g, 3, 3, 5, 2, 'e')
    elipse(g, 3, 1, 1.6, 1.4, 'R')
    g.pôr(3, 1, 'r')
    g.pôr(6, 4, 'R')
    g.pôr(1, 8, 'R')
    return g


def poltrona_assombrada():
    g = Grade(12, 10)
    ret(g, 1, 0, 10, 5, 'P')
    ret(g, 0, 4, 11, 8, 'p')
    ret(g, 0, 3, 1, 8, 'P')
    ret(g, 10, 3, 11, 8, 'P')
    ret(g, 1, 9, 2, 9, 'k')
    ret(g, 9, 9, 10, 9, 'k')
    for x, y in ((3, 2), (5, 2), (7, 2), (4, 6), (6, 6), (8, 6)):
        g.pôr(x, y, 'g')
    return g


def tijolos():
    g = Grade(16, 6)
    for y in range(6):
        for x in range(16):
            g.pôr(x, y, 'a' if (x + (3 if (y // 2) % 2 else 0)) % 6 != 0 and y % 2 == 0 else 'd' if y % 2 == 0 else 'S')
    return g


def bau():
    g = Grade(13, 9)
    ret(g, 0, 3, 12, 8, 'b')
    elipse(g, 6, 3.2, 6.4, 3.2, 'b')
    ret(g, 0, 4, 12, 4, 'B')
    ret(g, 0, 8, 12, 8, 'B')
    ret(g, 5, 4, 7, 7, 'g')
    g.pôr(6, 5, 'k')
    for x in (2, 10):
        ret(g, x, 0, x, 8, 'G')
    return contornar(g, 'l')


def chave():
    g = Grade(9, 5)
    elipse(g, 1.5, 2, 1.8, 1.8, 'g')
    g.pôr(1, 2, '.')
    ret(g, 3, 2, 8, 2, 'g')
    ret(g, 6, 3, 6, 4, 'g')
    ret(g, 8, 3, 8, 4, 'g')
    return contornar(g, 'l')


def aranha():
    g = Grade(11, 11)
    ret(g, 5, 0, 5, 4, 'S')
    elipse(g, 5, 7, 2.2, 2.2, 'k')
    elipse(g, 5, 5, 1.4, 1.2, 'k')
    for dx, dy in ((-4, 1), (-4, 3), (-3, 5), (4, 1), (4, 3), (3, 5)):
        lin(g, 5, 6, 5 + dx, 6 + dy - 3, 'k')
    g.pôr(4, 5, 'r')
    g.pôr(6, 5, 'r')
    return g


terreno_proprio('mansao', {
    'top': paleta('#4a2e7a'), 'mid': paleta('#14101c'), 'sub': paleta('#241638', '#1c1030'),
    'soil': paleta('#241638', '#1c1030', '#2e1c48', '#241638'), 'deep': paleta('#1c1030', '#140a24'), 'low': paleta('#0c0618'),
    'edge': paleta('#060210'), 'speck': paleta('#b04aff', '#7a2ad8'), 'flowers': [], 'tuft': [],
    'root': paleta('#8a8aa0', '#6a6a84', '#a8a8c0', '#d8d8ea'), 'pattern': 'checker', 'decoGap': 24, 'buriedGap': 14,
    'deco': [peca_de(f(), **M) for f in (candelabro, gato_preto, fantasma_corrente, relogio_carrilhao, vaso_rosa_murcha, poltrona_assombrada)],
    'buried': [peca_de(f(), **M) for f in (tijolos, bau, chave, aranha)] + [peca_de(f(), **C) for f in (pilha_caveiras, esqueleto_deitado)]})
