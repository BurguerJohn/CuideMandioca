"""Terreiros do tema terra de zumbis, bem criativos: o Asfalto Rachado (cone, placa "cuidado, zumbis atravessando", bueiro com mão, carrinho de mercado e canos e um carro
enterrado debaixo da pista), a Terra de Cova (cruz de chapéu de palha, pá fincada, mão de zumbi fazendo joinha, lápide "ZZZ", caixão com olhos brilhando) e a Gosma
Tóxica (barris vazando, olho boiando, patinho de borracha mutante, bolhas e esqueleto afundando)."""

import math

from itens_novos import Grade, elipse
from tema_comum import ret, lin, grosso, poligono, contornar, peca_de, mini_texto
from tema_dino import paleta
from tema_zumbi import terreno_proprio

Z = dict(o='#ff7a1a', w='#f4f4f4', k='#2a2a34', g='#6a6a74', G='#9a9aa6', y='#e8c020', r='#e8302c', z='#7aa850', Z='#587a38', d='#5a4a3a', n='#7a5028', N='#4a3018',
         b='#3a78d8', t='#4cb4a4', T='#2e8a7c', c='#b8c0cc', e='#fffaf0', p='#ff9ab8', P='#c04a70', s='#8a8e9c', h='#f0c050', H='#c89030', l='#1c1610', v='#9ad048', V='#d8ffa0')


def cone():
    g = Grade(9, 10)
    ret(g, 0, 8, 8, 9, 'o')
    poligono(g, [(4, 0), (6, 0), (7, 8), (2, 8)], 'o')
    ret(g, 3, 3, 5, 3, 'w')
    ret(g, 2, 5, 6, 5, 'w')
    ret(g, 3, 0, 4, 7, 'o')
    ret(g, 6, 1, 6, 7, 'r')
    return g


def placa_zumbi():
    """Placa de losango amarelo de "cuidado, zumbis atravessando", com a silhueta de um zumbi de braços esticados."""
    g = Grade(15, 18)
    ret(g, 7, 11, 7, 17, 'g')
    for y in range(0, 12):
        meia = 7 - abs(y - 5.5) * 1.25
        for x in range(round(7 - meia), round(7 + meia) + 1):
            g.pôr(x, y, 'y')
    for y in range(0, 12):
        row = [x for x in range(g.w) if g.ler(x, y) == 'y']
        if row:
            g.pôr(row[0], y, 'k')
            g.pôr(row[-1], y, 'k')
    elipse(g, 6, 3.4, 1.3, 1.3, 'k')
    ret(g, 6, 5, 6, 8, 'k')
    lin(g, 6, 5, 10, 6, 'k')
    lin(g, 6, 5, 9, 4, 'k')
    lin(g, 6, 8, 4, 10, 'k')
    lin(g, 6, 8, 8, 10, 'k')
    return g


def bueiro_mao():
    """Tampa de bueiro redonda levantada de lado, com uma mão de zumbi saindo do buraco."""
    g = Grade(14, 10)
    elipse(g, 5, 7.5, 5.2, 1.8, 'g')
    elipse(g, 5, 7.0, 4.2, 1.2, 'G')
    for x in (3, 5, 7):
        g.pôr(x, 7, 'k')
    ret(g, 10, 3, 11, 8, 'z')
    for x, y in ((9, 1), (10, 0), (11, 0), (12, 1), (12, 2), (13, 3)):
        g.pôr(x, y, 'z')
    ret(g, 10, 5, 11, 5, 'Z')
    ret(g, 9, 8, 12, 9, 'l')
    return g


def pneu():
    g = Grade(10, 10)
    elipse(g, 4.5, 4.5, 4.5, 4.5, 'k')
    elipse(g, 4.5, 4.5, 2.4, 2.4, 'g')
    elipse(g, 4.5, 4.5, 1.0, 1.0, 'G')
    for x, y in ((1, 2), (2, 1), (7, 1), (8, 2)):
        g.pôr(x, y, 's')
    return g


def carrinho():
    """Carrinho de supermercado abandonado, tombado de lado, com uma lata dentro."""
    g = Grade(15, 12)
    for y in range(2, 8):
        for x in range(1, 12):
            g.pôr(x, y, 'c' if (x + y) % 2 else '.')
    ret(g, 1, 2, 11, 2, 'G')
    ret(g, 1, 7, 11, 7, 'G')
    ret(g, 1, 2, 1, 7, 'G')
    ret(g, 11, 2, 11, 7, 'G')
    lin(g, 11, 2, 14, 0, 'G')
    ret(g, 13, 0, 14, 0, 'G')
    ret(g, 2, 8, 3, 9, 'k')
    ret(g, 9, 8, 10, 9, 'k')
    ret(g, 3, 10, 3, 10, 'g')
    ret(g, 5, 4, 7, 7, 'r')
    ret(g, 5, 4, 7, 4, 'e')
    return g


def chinelo():
    g = Grade(8, 4)
    elipse(g, 3.5, 2.5, 3.6, 1.4, 'b')
    lin(g, 2, 2, 4, 0, 'e')
    lin(g, 5, 2, 4, 0, 'e')
    ret(g, 6, 1, 7, 3, 'b')
    return g


def pare():
    """Placa de PARE vermelha, torta, com a faixa branca e a haste dobrada."""
    g = Grade(11, 16)
    ret(g, 5, 9, 5, 15, 'g')
    poligono(g, [(3, 0), (7, 0), (10, 3), (10, 6), (7, 9), (3, 9), (0, 6), (0, 3)], 'r')
    ret(g, 2, 4, 8, 5, 'w')
    for x, y in ((3, 0), (7, 0), (10, 3), (10, 6), (7, 9), (3, 9), (0, 6), (0, 3)):
        g.pôr(x, y, 'k')
    return g


def tubo():
    g = Grade(18, 6)
    ret(g, 0, 1, 17, 4, 's')
    ret(g, 0, 1, 17, 1, 'G')
    ret(g, 0, 4, 17, 4, 'g')
    ret(g, 0, 0, 1, 5, 'g')
    ret(g, 16, 0, 17, 5, 'g')
    ret(g, 8, 2, 9, 3, 'l')
    return contornar(g, 'k')


def esgoto_olhos():
    """Um buraco escuro de esgoto com dois olhos vermelhos brilhando lá no fundo e um pedaço de grade na frente."""
    g = Grade(12, 8)
    elipse(g, 5.5, 4, 5.4, 3.4, 'l')
    ret(g, 3, 3, 4, 4, 'r')
    ret(g, 7, 3, 8, 4, 'r')
    g.pôr(3, 3, 'y')
    g.pôr(7, 3, 'y')
    for x in range(1, 11, 3):
        ret(g, x, 0, x, 7, 'G')
    return contornar(g, 'k')


def carro_enterrado():
    g = Grade(20, 9)
    poligono(g, [(0, 8), (0, 5), (4, 4), (6, 0), (13, 0), (16, 4), (19, 5), (19, 8)], 't')
    poligono(g, [(6, 4), (7, 1), (10, 1), (10, 4)], 'e')
    poligono(g, [(11, 4), (11, 1), (13, 1), (15, 4)], 'e')
    ret(g, 0, 7, 19, 8, 'T')
    ret(g, 18, 5, 19, 6, 'y')
    return contornar(g, 'k')


def cabos():
    g = Grade(16, 5)
    for x in range(16):
        g.pôr(x, 1 + round(1.2 * math.sin(x * 0.5)), 'r')
        g.pôr(x, 3 + round(1.2 * math.sin(x * 0.5 + 1)), 'y')
    return g


def ossos_z():
    g = Grade(11, 5)
    lin(g, 1, 1, 9, 3, 'e')
    for x, y in ((0, 0), (0, 2), (10, 2), (10, 4)):
        g.pôr(x, y, 'e')
    return g


def caveira_z():
    g = Grade(9, 8)
    elipse(g, 4, 3.4, 3.8, 3.2, 'e')
    ret(g, 2, 6, 6, 7, 'e')
    for x, y in ((2, 3), (3, 3), (5, 3), (6, 3)):
        g.pôr(x, y, 'k')
    for x in (3, 5):
        g.pôr(x, 6, 'k')
    return contornar(g, 'l')


terreno_proprio('asfalto-zumbi', {
    'top': paleta('#3a3a44', '#e8c020'), 'mid': paleta('#2e2e38', '#34343e'), 'sub': paleta('#5a5a64', '#4a4a54'),
    'soil': paleta('#5a4a3a', '#4a3a2a', '#6a5a4a', '#5a4a3a'), 'deep': paleta('#4a3a2a', '#3a2c1c'), 'low': paleta('#2a1e12'),
    'edge': paleta('#120c06'), 'speck': paleta('#8a8a94', '#6a6a74'), 'flowers': [], 'tuft': paleta('#5a8a3a', '#3a6a28'),
    'root': paleta('#8a4a2a', '#6a3a1a', '#a85a30', '#c87a40'), 'pattern': 'road', 'puddle': paleta('#2a3a4a', '#4a5a6a'),
    'decoGap': 22, 'buriedGap': 13,
    'deco': [peca_de(f(), **Z) for f in (cone, placa_zumbi, bueiro_mao, pneu, carrinho, chinelo, pare)],
    'buried': [peca_de(f(), **Z) for f in (tubo, esgoto_olhos, carro_enterrado, cabos, ossos_z, caveira_z)]})


# --- Terra de Cova -------------------------------------------------------------------------------------------------------------

def cruz_chapeu():
    """Cruz de madeira torta com um chapéu de palha e um lenço de chita pendurados, como se o dono ainda estivesse ali."""
    g = Grade(12, 14)
    ret(g, 5, 3, 6, 13, 'n')
    ret(g, 1, 6, 10, 7, 'n')
    ret(g, 5, 3, 5, 13, 'h')
    elipse(g, 5.5, 3.0, 5.2, 1.1, 'h')
    elipse(g, 5.5, 1.5, 2.6, 1.3, 'h')
    ret(g, 3, 1, 8, 1, 'r')
    for x, y in ((9, 8), (9, 9), (10, 9), (10, 10), (9, 10)):
        g.pôr(x, y, 'r' if (x + y) % 2 else 'y')
    return g


def pa_fincada():
    g = Grade(8, 13)
    ret(g, 3, 1, 3, 8, 'n')
    ret(g, 1, 0, 5, 1, 'n')
    ret(g, 0, 0, 0, 2, 'n')
    ret(g, 6, 0, 6, 2, 'n')
    poligono(g, [(1, 8), (6, 8), (5, 12), (2, 12)], 'G')
    ret(g, 1, 8, 6, 8, 'c')
    return g


def mao_zumbi_alto():
    g = Grade(9, 11)
    ret(g, 3, 6, 5, 10, 'z')
    ret(g, 2, 4, 6, 6, 'z')
    for x, y in ((1, 2), (1, 3), (2, 1), (2, 2), (4, 0), (4, 1), (4, 2), (6, 1), (6, 2), (7, 3), (7, 4)):
        g.pôr(x, y, 'z')
    ret(g, 5, 4, 6, 10, 'Z')
    ret(g, 1, 9, 7, 10, 'd')
    return g


def mao_joinha():
    """Mão de zumbi saindo do chão fazendo "joinha" com o polegar para cima: está tudo bem lá embaixo."""
    g = Grade(9, 10)
    ret(g, 2, 4, 6, 9, 'z')
    ret(g, 6, 4, 6, 9, 'Z')
    ret(g, 3, 0, 4, 4, 'z')
    for x in (2, 4, 6):
        g.pôr(x, 5, 'Z')
    ret(g, 0, 8, 8, 9, 'd')
    return g


def lapide_zzz():
    """Lápide torta onde está escrito "ZZZ": o morto dorme, sossegado."""
    g = Grade(12, 12)
    for y in range(12):
        meia = 4.8 if y > 3 else 4.8 * math.sqrt(max(0.0, 1 - ((3 - y) / 3.4) ** 2))
        for x in range(round(5.5 - meia), round(5.5 + meia) + 1):
            g.pôr(x, y, 'G' if x < 8 else 's')
    mini_texto(g, 'ZZZ', 0, 4, 'k')
    lin(g, 1, 11, 2, 9, 'Z')
    return g


def vaso_morto():
    g = Grade(7, 9)
    poligono(g, [(1, 5), (5, 5), (4, 8), (2, 8)], 'n')
    ret(g, 1, 5, 5, 5, 'N')
    lin(g, 3, 4, 3, 1, 'Z')
    lin(g, 3, 3, 5, 2, 'Z')
    lin(g, 3, 3, 1, 2, 'Z')
    return g


def corvo():
    g = Grade(9, 8)
    elipse(g, 4, 4, 3.2, 2.6, 'k')
    elipse(g, 7, 2.4, 1.6, 1.4, 'k')
    g.pôr(8, 2, 'o')
    g.pôr(9, 2, 'o')
    g.pôr(7, 1, 'e')
    lin(g, 1, 5, 0, 7, 'k')
    ret(g, 3, 7, 3, 7, 'o')
    ret(g, 5, 7, 5, 7, 'o')
    return g


def caixao_aberto():
    """Caixão com a tampa um pouco aberta e dois olhos verdes brilhando na fresta."""
    g = Grade(22, 10)
    poligono(g, [(0, 4), (4, 0), (17, 0), (21, 4), (17, 9), (4, 9)], 'n')
    ret(g, 6, 3, 15, 5, 'l')
    ret(g, 8, 3, 9, 4, 'v')
    ret(g, 12, 3, 13, 4, 'v')
    g.pôr(8, 3, 'V')
    g.pôr(12, 3, 'V')
    for x in range(4, 18):
        g.pôr(x, 1, 'h')
    return contornar(g, 'k')


def vermes():
    g = Grade(12, 5)
    for x in range(12):
        g.pôr(x, 1 + round(1.4 * math.sin(x * 0.9)), 'p')
        g.pôr(x, 3 + round(1.4 * math.sin(x * 0.9 + 2)), 'P')
    return g


def maos_agarrando():
    g = Grade(11, 10)
    for x0 in (1, 7):
        ret(g, x0 + 1, 4, x0 + 2, 9, 'z')
        for x, y in ((x0, 2), (x0, 3), (x0 + 1, 1), (x0 + 2, 2), (x0 + 3, 2), (x0 + 3, 3)):
            g.pôr(x, y, 'z')
    return g


def cerebro_enterrado():
    g = Grade(9, 6)
    elipse(g, 2.6, 3, 2.8, 2.6, 'p')
    elipse(g, 6.0, 3, 2.8, 2.6, 'p')
    ret(g, 4, 0, 4, 5, 'P')
    for x, y in ((1, 2), (2, 4), (6, 2), (7, 4)):
        g.pôr(x, y, 'P')
    return contornar(g, 'l')


terreno_proprio('cova-zumbi', {
    'top': paleta('#4a5a3a', '#3a4a2c', '#5a6a44', '#44543a'), 'mid': paleta('#2c3624', '#34402a'), 'sub': paleta('#2a2018', '#34281c'),
    'soil': paleta('#2a2018', '#3a2c20', '#1c1610', '#2a2018'), 'deep': paleta('#1c1610', '#2a2018'), 'low': paleta('#100c08'),
    'edge': paleta('#080604'), 'speck': paleta('#8ab070', '#a8d070'), 'flowers': paleta('#a8d070', '#c8e090'),
    'tuft': paleta('#6a7a4a', '#4a5a34', '#7a8a56'), 'root': paleta('#a8a890', '#7a7a68', '#c8c8b0', '#e8e8d0'),
    'decoGap': 16, 'buriedGap': 12,
    'deco': [peca_de(f(), **Z) for f in (cruz_chapeu, pa_fincada, mao_zumbi_alto, mao_joinha, lapide_zzz, vaso_morto, corvo)],
    'buried': [peca_de(f(), **Z) for f in (caixao_aberto, vermes, maos_agarrando, cerebro_enterrado, caveira_z, ossos_z)]})


# --- Gosma Tóxica --------------------------------------------------------------------------------------------------------------

G = dict(g='#7aff3a', G='#d8ffb0', m='#3ab01a', M='#1c5a10', k='#2a2a34', b='#4a8a2a', y='#e8e020', Y='#fff07a', e='#fffaf0', r='#e8302c', s='#8a8e9c', l='#103a08',
         o='#ff9a1a', w='#f4f4f4', v='#a8ff6a', u='#c8e8a0', c='#b8c0cc', p='#ff9ab8')


def barril_toxico():
    """Barril de resíduo tóxico enferrujado com o símbolo de perigo, vazando gosma verde pela rachadura."""
    g = Grade(11, 13)
    ret(g, 1, 1, 9, 11, 'b')
    ret(g, 0, 0, 10, 1, 's')
    ret(g, 0, 11, 10, 12, 's')
    ret(g, 0, 5, 10, 5, 's')
    ret(g, 1, 1, 2, 11, 'm')
    ret(g, 8, 1, 9, 11, 'M')
    elipse(g, 5, 8, 2.4, 2.4, 'y')
    ret(g, 4, 7, 6, 9, 'k')
    g.pôr(5, 8, 'y')
    for x, y in ((8, 5), (9, 6), (9, 7), (9, 8), (10, 9), (10, 10), (9, 12)):
        g.pôr(x, y, 'g')
    return g


def bolhas():
    g = Grade(13, 10)
    for cx, cy, r in ((3, 6.5, 2.9), (8.5, 4.0, 3.4), (11, 8, 1.7)):
        elipse(g, cx, cy, r, r, 'v')
        elipse(g, cx, cy, r - 1.0, r - 1.0, 'g')
        g.pôr(round(cx - r * 0.5), round(cy - r * 0.5), 'e')
        g.pôr(round(cx - r * 0.5) + 1, round(cy - r * 0.5), 'e')
    return g


def olho_gosma():
    g = Grade(10, 8)
    elipse(g, 4.5, 5.0, 4.5, 3.4, 'e')
    ret(g, 0, 5, 9, 7, 'g')
    elipse(g, 4.5, 4.0, 1.7, 1.7, 'o')
    ret(g, 4, 3, 5, 4, 'k')
    for x, y in ((1, 3), (2, 2), (7, 2), (8, 3)):
        g.pôr(x, y, 'r')
    return g


def caveira_gosma():
    g = Grade(11, 9)
    elipse(g, 5, 4.6, 4.4, 3.8, 'e')
    for x, y in ((3, 3), (4, 3), (6, 3), (7, 3), (3, 4), (7, 4)):
        g.pôr(x, y, 'k')
    g.pôr(4, 3, 'g')
    g.pôr(7, 3, 'g')
    ret(g, 0, 6, 10, 8, 'g')
    for x in (1, 4, 8):
        ret(g, x, 6, x, 5, 'g')
    return g


def placa_toxica():
    """Placa triangular amarela de perigo com o ponto de exclamação, num poste enferrujado, pingando gosma."""
    g = Grade(15, 17)
    ret(g, 7, 9, 7, 16, 's')
    for y in range(0, 10):
        meia = y * 0.78
        for x in range(round(7 - meia), round(7 + meia) + 1):
            g.pôr(x, y, 'y')
    for y in range(0, 10):
        row = [x for x in range(g.w) if g.ler(x, y) == 'y']
        if row:
            g.pôr(row[0], y, 'k')
            g.pôr(row[-1], y, 'k')
    ret(g, 0, 9, 14, 9, 'k')
    mini_texto(g, '!', 6, 3, 'k')
    for x, y in ((3, 10), (3, 11), (11, 10), (11, 11), (11, 12)):
        g.pôr(x, y, 'g')
    return g


def tentaculo():
    g = Grade(9, 15)
    for y in range(0, 15):
        x = 4 + round(2.4 * math.sin(y * 0.55))
        ret(g, x - 1, y, x + 1, y, 'g')
        g.pôr(x - 1, y, 'v')
        g.pôr(x + 1, y, 'm')
    for y in (4, 8, 12):
        x = 4 + round(2.4 * math.sin(y * 0.55))
        g.pôr(x, y, 'G')
    return g


def patinho():
    """Patinho de borracha amarelo mutante, coberto de gosma, de olhos arregalados, boiando como se nada tivesse acontecido."""
    g = Grade(10, 9)
    elipse(g, 4.5, 6.0, 4.4, 2.7, 'y')
    elipse(g, 6.5, 2.8, 2.4, 2.4, 'y')
    ret(g, 8, 3, 9, 4, 'o')
    g.pôr(7, 2, 'k')
    g.pôr(6, 2, 'e')
    for x, y in ((1, 5), (2, 4), (3, 5)):
        g.pôr(x, y, 'Y')
    ret(g, 0, 7, 9, 8, 'g')
    return g


def barril_enterrado():
    g = Grade(11, 13)
    ret(g, 1, 1, 9, 11, 'b')
    ret(g, 0, 0, 10, 1, 's')
    ret(g, 0, 11, 10, 12, 's')
    ret(g, 0, 5, 10, 5, 's')
    ret(g, 3, 7, 7, 9, 'y')
    ret(g, 4, 8, 6, 8, 'k')
    return contornar(g, 'l')


def coluna_bolhas():
    g = Grade(5, 13)
    for y, r in ((10, 2.0), (6, 1.4), (3, 1.0), (0, 0.8)):
        elipse(g, 2, y + 1, r, r, 'v')
        g.pôr(2, y + 1, 'g')
    return g


def tubo_ensaio():
    g = Grade(6, 12)
    ret(g, 0, 0, 5, 1, 'c')
    ret(g, 1, 2, 4, 10, 'c')
    ret(g, 2, 5, 3, 9, 'g')
    ret(g, 2, 4, 3, 4, 'v')
    g.pôr(2, 3, 'e')
    ret(g, 1, 10, 4, 11, 'c')
    return contornar(g, 'l')


def olho_enterrado():
    g = Grade(9, 6)
    elipse(g, 4, 3, 4.0, 2.8, 'e')
    elipse(g, 4, 3, 1.5, 1.5, 'o')
    g.pôr(4, 3, 'k')
    for x, y in ((1, 2), (7, 2), (1, 4), (7, 4)):
        g.pôr(x, y, 'r')
    return contornar(g, 'l')


terreno_proprio('gosma-toxica', {
    'top': paleta('#7aff3a', '#a8ff6a', '#5ae02a', '#8aff4a'), 'mid': paleta('#3ab01a', '#46c820'), 'sub': paleta('#2a7a14', '#348a1a'),
    'soil': paleta('#1c5a10', '#26700e', '#103a08', '#1c5a10', '#7aff3a'), 'deep': paleta('#103a08', '#1c5a10'), 'low': paleta('#0a2406'),
    'edge': paleta('#041202'), 'speck': paleta('#e0ff90', '#a8ff6a'), 'flowers': paleta('#ccff88', '#e8ffc0'),
    'tuft': paleta('#a8ff6a', '#7aff3a'), 'root': paleta('#7aff3a', '#3ab01a', '#a8ff6a', '#d8ffa0'), 'puddle': paleta('#caff6a', '#8aff3a'),
    'decoGap': 18, 'buriedGap': 12,
    'deco': [peca_de(f(), **G) for f in (barril_toxico, bolhas, olho_gosma, caveira_gosma, placa_toxica, tentaculo, patinho)],
    'buried': [peca_de(f(), **G) for f in (barril_enterrado, coluna_bolhas, tubo_ensaio, olho_enterrado, patinho, caveira_gosma)]})
