"""Tema Halloween: terreiros (cemitério, aboboral, piso da mansão), cenários (abóbora gigante, lápide com corvo, casinha assombrada), chapéus
(chapéu de bruxa, abóbora na cabeça, fantasminha), itens de mão (vassoura de bruxa, balde de doces, lanterna de abóbora) e o tecido de
teias e abóboras."""

import math

from itens_novos import Grade, chapeu, elipse, ladrilho, mao, pintar
from tema_comum import ret, lin, grosso, novo_registro, poligono, tecido, terreno
from tema_dino import deslocar, peca, paleta

LADOS, lado = novo_registro()
CHAPEUS_PROPRIOS = {}
MAOS_PROPRIAS = {}
TECIDOS_PROPRIOS = {}
TERRENOS_PROPRIOS = {}


def chapeu_proprio(id_, texto, cores, acima):
    chapeu(id_, texto, cores, acima=acima)
    CHAPEUS_PROPRIOS[id_] = True


def mao_propria(id_, quadros, pivo, fps):
    mao(id_, quadros, pivo, fps=fps)
    MAOS_PROPRIAS[id_] = True


# --- Chapéus ----------------------------------------------------------------------------------------------------------------

def chapeu_bruxa():
    """Chapéu de bruxa: aba larga, cone roxo com a ponta dobrada para o lado, faixa laranja com fivela dourada e uma estrelinha."""
    g = Grade(24, 21)
    # Aba: elipse achatada nas duas últimas linhas.
    elipse(g, 11.5, 20.2, 11.9, 1.9, 'u')
    # Cone: cada linha mais larga que a de cima; o eixo se dobra para a direita lá em cima.
    for y in range(2, 19):
        eixo = 11.0 + max(0.0, 8 - y) * 0.55
        meia = 1.2 + (y - 2) * 0.42
        for x in range(24):
            if abs(x - eixo) <= meia:
                g.pôr(x, y, 'u')
    # Luz à esquerda, sombra à direita.
    for y in range(g.h):
        linha = [x for x in range(24) if g.ler(x, y) == 'u']
        if not linha or y > 18:
            continue
        for x in linha:
            if x <= linha[0] + 1 and len(linha) > 3:
                g.pôr(x, y, 'U')
            elif x >= linha[-1] - 1 and len(linha) > 3:
                g.pôr(x, y, 'd')
    for x in range(1, 23):
        if g.ler(x, 20) != '.':
            g.pôr(x, 20, 'd')
        if g.ler(x, 19) != '.' and x < 6:
            g.pôr(x, 19, 'U')
    # Faixa laranja e a fivela.
    for y in (15, 16):
        for x in range(24):
            if g.ler(x, y) != '.':
                g.pôr(x, y, 'A')
    ret(g, 10, 14, 13, 17, 'Y')
    ret(g, 11, 15, 12, 16, 'k')
    # Estrelinha amarela na lateral do cone.
    for x, y in ((9, 9), (8, 10), (9, 10), (10, 10), (9, 11)):
        g.pôr(x, y, 'Y')
    return g.texto()


chapeu_proprio('chapeu-bruxa', chapeu_bruxa(), {'u': '#6a38b8', 'U': '#9a6ae8', 'd': '#43228a', 'A': '#ff8a12', 'Y': '#ffd21e', 'k': '#3a2410'}, acima=12)


def abobora_cabeca():
    """Abóbora de Halloween na cabeça: gomos laranja, cabinho verde com cipó e uma carinha esculpida acesa por dentro."""
    g = Grade(24, 14)
    elipse(g, 11.5, 9.0, 10.8, 5.6, 'o')
    for y in range(g.h):
        for x in range(g.w):
            if g.ler(x, y) != 'o':
                continue
            if x in (5, 8, 15, 18) or (x in (4, 19) and y > 8):
                g.pôr(x, y, 'q')
            elif y <= 4 and x < 12:
                g.pôr(x, y, 'O')
            elif y >= 11 or x >= 19:
                g.pôr(x, y, 'd')
    # Cabinho e cipó.
    ret(g, 11, 1, 12, 4, 'v')
    ret(g, 12, 0, 14, 1, 'v')
    g.pôr(15, 0, 'V')
    g.pôr(14, 2, 'V')
    g.pôr(15, 2, 'V')
    # A carinha: olhos de triângulo, nariz e boca de dentes, tudo aceso.
    for x0 in (6, 15):
        for dy, linha in enumerate(('..Y..', '.YYY.', 'YYYYY')):
            for dx, letra in enumerate(linha):
                if letra == 'Y':
                    g.pôr(x0 + dx, 6 + dy, 'Y')
    ret(g, 11, 8, 12, 8, 'Y')
    for x in range(7, 17):
        g.pôr(x, 10, 'Y')
    for x in range(8, 16, 2):
        g.pôr(x, 11, 'Y')
    for x in (9, 13):
        g.pôr(x, 10, 'o')
    # Um morceguinho pendurado de cabeça para baixo no cipó, com as asas fechadas e um olhinho.
    ret(g, 16, 0, 16, 1, 'V')
    ret(g, 15, 2, 17, 4, 'k')
    g.pôr(14, 3, 'k')
    g.pôr(18, 3, 'k')
    g.pôr(15, 5, 'k')
    g.pôr(17, 5, 'k')
    g.pôr(15, 4, 'Y')
    return g.texto()


chapeu_proprio('abobora-cabeca', abobora_cabeca(), {'o': '#ff8a12', 'O': '#ffb84a', 'q': '#d85a0a', 'd': '#b8480a', 'v': '#3a8a2a', 'V': '#7ad040', 'Y': '#fff07a', 'k': '#2a2430'}, acima=5)


def fantasminha():
    """Fantasminha de estimação pousado na cabeça: lençol branco com a barra ondulada, olhos e boquinha pretos e um ar de quem se assustou."""
    g = Grade(24, 17)
    elipse(g, 11.5, 7.8, 7.2, 6.4, 'w')
    for y in range(7, 14):
        for x in range(4, 20):
            g.pôr(x, y, 'w')
    # A barra ondulada: pontas e vãos alternados.
    for i, x in enumerate(range(4, 20)):
        fundo = 15 if (x // 2) % 2 == 0 else 13
        for y in range(13, fundo + 1):
            g.pôr(x, y, 'w')
    # Sombra azulada do lado direito e luz no esquerdo.
    for y in range(g.h):
        for x in range(g.w):
            if g.ler(x, y) == 'w':
                if x >= 17:
                    g.pôr(x, y, 'u')
                elif x <= 6 and y < 10:
                    g.pôr(x, y, 'W')
    # Olhos, boquinha e as bochechas rosadas.
    ret(g, 8, 6, 9, 8, 'k')
    ret(g, 14, 6, 15, 8, 'k')
    g.pôr(8, 6, 'w')
    g.pôr(14, 6, 'w')
    ret(g, 11, 9, 12, 10, 'k')
    for x, y in ((7, 9), (16, 9)):
        g.pôr(x, y, 'p')
    # Bracinhos para cima.
    for x, y in ((3, 8), (2, 7), (20, 8), (21, 7)):
        g.pôr(x, y, 'w')
    # Chapéu de palha caído de lado e a bandeirinha de São João que ele segura com o bracinho esquerdo.
    elipse(g, 12.5, 2.4, 7.0, 1.5, 'h')
    elipse(g, 12.5, 1.0, 3.4, 1.6, 'h')
    ret(g, 9, 1, 16, 1, 'r')
    ret(g, 2, 1, 2, 7, 'n')
    for dy in range(4):
        for dx in range(4 - dy):
            g.pôr(3 + dx, 1 + dy, 'r' if dy % 2 == 0 else 'y')
    return g.texto()


chapeu_proprio('fantasminha', fantasminha(), {'w': '#fafbff', 'W': '#ffffff', 'u': '#c8d4ee', 'k': '#26242e', 'p': '#ffa0b8', 'h': '#f0c050', 'r': '#ee2f3c', 'n': '#7a4a28',
                                              'y': '#ffd21e'}, acima=8)


# --- Itens de mão -----------------------------------------------------------------------------------------------------------

def vassoura_bruxa():
    """Vassoura de bruxa com um gato preto de passageiro: ele se agarra ao cabo de olhos verdes (pisca num quadro), o rabo balança e a poeira de estrelas roxa e
    amarela pula de lugar a cada quadro."""
    quadros = []
    faiscas = [[(2, 22, 'P'), (16, 25, 'Y'), (4, 28, 'Y')], [(1, 25, 'Y'), (17, 22, 'P'), (7, 29, 'P')],
               [(3, 20, 'Y'), (15, 28, 'P'), (1, 28, 'P')], [(17, 26, 'Y'), (2, 23, 'Y'), (8, 30, 'Y')]]
    rabo = [[(12, 14), (14, 16), (15, 19)], [(12, 14), (15, 15), (17, 17)], [(12, 14), (14, 16), (14, 19)], [(12, 14), (13, 17), (12, 20)]]
    for k in range(4):
        g = Grade(20, 31)
        ret(g, 8, 0, 9, 18, 'm')
        for y in range(0, 18):
            g.pôr(8, y, 'M')
        ret(g, 7, 16, 10, 17, 'r')
        # Cerdas: um leque que se abre para baixo.
        for y in range(18, 29):
            meia = 2 + round((y - 18) * 0.5)
            for x in range(9 - meia, 9 + meia):
                g.pôr(x, y, 'y' if (x + y) % 3 else 'Y' if (x * 3 + y) % 4 else 'o')
        for y in range(27, 29):
            for x in range(3, 15):
                if (x + k) % 3 == 0:
                    g.pôr(x, y, '.')
        # O gato: corpo agarrado ao cabo, cabeça com orelhas e olhos verdes, patinhas na madeira e o rabo balançando.
        elipse(g, 12.5, 10.5, 3.6, 3.0, 'c')
        elipse(g, 14.5, 6.6, 3.0, 2.7, 'c')
        for x, y in ((12, 3), (12, 4), (13, 4), (17, 3), (16, 4), (17, 4)):
            g.pôr(x, y, 'c')
        g.pôr(13, 4, 'p')
        g.pôr(16, 4, 'p')
        for x in (13, 16):
            g.pôr(x, 6, 'g' if k != 2 else 'c')
            g.pôr(x, 7, 'g' if k != 2 else 'c')
        g.pôr(15, 8, 'p')
        for x, y in ((10, 11), (10, 12), (11, 12)):
            g.pôr(x, y, 'C')
        g.pôr(11, 6, 'C')
        g.pôr(11, 8, 'C')
        for n, (x, y) in enumerate(rabo[k]):
            ret(g, x, y, x + 1, y + 1, 'c')
        for x, y, letra in faiscas[k]:
            g.pôr(x, y, letra)
            if letra == 'P':
                g.pôr(x + 1, y, 'P')
                g.pôr(x, y - 1, 'P')
        quadros.append(pintar(g.texto(), {'m': '#8a5a2a', 'M': '#b88444', 'r': '#c02a2a', 'y': '#d8a838', 'Y': '#f0cc58', 'o': '#a87820', 'P': '#c46aff',
                                          'c': '#2a2430', 'C': '#4e465e', 'g': '#9ad048', 'p': '#ff8aa8'}))
    return quadros


mao_propria('vassoura-bruxa', vassoura_bruxa(), (8, 13), 5)


def balde_doces():
    """Balde de abóbora guloso: a boca abre e fecha mastigando as balas, os olhos arregalam quando abre e uma bala pula para cima a cada mordida."""
    quadros = []
    boca = (1, 3, 4, 2)
    for k in range(4):
        g = Grade(16, 20)
        # Alça de arame.
        for x, y in ((3, 8), (3, 7), (3, 6), (4, 5), (5, 4), (6, 3), (7, 3), (8, 3), (9, 3), (10, 4), (11, 5), (12, 6), (12, 7), (12, 8)):
            g.pôr(x, y, 'k')
        elipse(g, 7.5, 12.5, 7.0, 5.0, 'o')
        for y in range(g.h):
            for x in range(g.w):
                if g.ler(x, y) == 'o':
                    if x in (4, 7, 11) and 9 <= y <= 16:
                        g.pôr(x, y, 'q')
                    elif x >= 12 or y >= 16:
                        g.pôr(x, y, 'd')
        ret(g, 2, 8, 13, 9, 'v')
        # Balas na boca do balde (a de cima pula a cada mordida).
        pulo = (0, 0, 3, 1)[k]
        for i, (x, y, letra) in enumerate(((3, 5, 'p'), (6, 3, 'b'), (9, 5, 'g'), (11, 4, 'y'), (5, 6, 'y'), (8, 6, 'p'))):
            yy = y + 2 - (pulo if i == 1 else 0)
            g.pôr(x, yy, letra)
            g.pôr(x + 1, yy, letra)
        # Olhos triangulares (arregalam com a boca aberta) e a boca de dentes que mastiga.
        grande = boca[k] >= 3
        for x0 in (4, 9):
            g.pôr(x0 + 1, 10 - (1 if grande else 0), 'Y')
            ret(g, x0, 11 - (1 if grande else 0), x0 + 2, 11, 'Y')
        altura = boca[k]
        ret(g, 4, 13, 11, 13 + altura - 1 + (1 if altura == 1 else 0), 'k') if altura > 1 else ret(g, 4, 13, 11, 13, 'Y')
        if altura > 1:
            for x in (4, 6, 8, 10):
                g.pôr(x, 13, 'w')
                g.pôr(x + 1, 13 + altura - 1, 'w')
            if altura >= 3:
                ret(g, 6, 13 + altura - 1, 9, 13 + altura - 1, 'r')
        quadros.append(pintar(g.texto(), {'o': '#ff8a12', 'q': '#d85a0a', 'd': '#b8480a', 'v': '#3a8a2a', 'k': '#2a2430', 'Y': '#fff07a', 'p': '#ff6aa8', 'b': '#4aa8ff',
                                          'g': '#5ad070', 'y': '#ffd21e', 'w': '#fffaf0', 'r': '#e8302c'}))
    return quadros


mao_propria('balde-doces', balde_doces(), (7, 4), 5)


def lanterna_abobora():
    """Lanterna de abóbora de mão, pendurada numa argola: a chama lá dentro treme e, a cada volta, um fantasminha sai da lanterna, sobe de lado e some."""
    quadros = []
    for k in range(4):
        g = Grade(18, 27)
        ret(g, 6, 8, 7, 8, 'k')
        g.pôr(5, 9, 'k')
        g.pôr(8, 9, 'k')
        lin(g, 5, 10, 7, 11, 'k')
        lin(g, 8, 10, 7, 11, 'k')
        ret(g, 6, 12, 7, 13, 'v')
        elipse(g, 6.5, 19.0, 6.2, 6.0, 'o')
        for y in range(g.h):
            for x in range(g.w):
                if g.ler(x, y) == 'o':
                    if x in (3, 6, 10) and 15 <= y <= 24:
                        g.pôr(x, y, 'q')
                    elif x >= 10 or y >= 23:
                        g.pôr(x, y, 'd')
        brilho = 'Y' if k % 2 == 0 else 'y'
        for x, y in ((4, 17), (5, 17), (4, 18), (8, 17), (9, 17), (9, 18), (6, 19), (7, 19)):
            g.pôr(x, y, brilho)
        for x in range(4, 10):
            g.pôr(x, 21, brilho)
        for x in (5, 8):
            g.pôr(x, 22, brilho)
        # O fantasminha que sai: pequeno e claro ao lado da argola, subindo e esvaindo (some no último quadro).
        if k < 3:
            fx, fy = 12 + k, 9 - k * 3
            for dy, linha in enumerate(('.www.', 'wwwww', 'wkwkw', 'wwwww', 'wwwww', 'w.w.w')):
                for dx, letra in enumerate(linha):
                    if letra != '.':
                        g.pôr(fx - 2 + dx, fy - 1 + dy, ('u' if k == 2 and letra == 'w' else letra))
        quadros.append(pintar(g.texto(), {'o': '#ff8a12', 'q': '#d85a0a', 'd': '#b8480a', 'v': '#3a8a2a', 'k': '#2a2430', 'Y': '#fff07a', 'y': '#ffc23a', 'w': '#fafbff',
                                          'u': '#aab8d8'}))
    return quadros


mao_propria('lanterna-abobora', lanterna_abobora(), (6, 9), 4)


# --- Tecido -----------------------------------------------------------------------------------------------------------------

def tecido_teias():
    """Teias de aranha em fundo roxo-escuro, com uma aboborinha laranja aparecendo no ladrilho."""
    cores = {'n': '#2a1a3c', 'm': '#3a2652', 'w': '#b8a8d8', 'o': '#ff8a12', 'g': '#5ad070', 'd': '#b8480a'}
    base = [['n'] * 12 for _ in range(12)]
    for y in range(12):
        for x in range(12):
            if (x + y) % 5 == 2:
                base[y][x] = 'm'
    # A teia, a partir do canto de cima à esquerda: raios e arcos.
    for i in range(12):
        base[i][0] = 'w'
        base[0][i] = 'w'
        base[i][i] = 'w'
    for raio in (4, 8):
        for ang in range(0, 91, 5):
            x = round(raio * math.cos(math.radians(ang)))
            y = round(raio * math.sin(math.radians(ang)))
            if x < 12 and y < 12:
                base[y][x] = 'w'
    for x, y in ((8, 7), (9, 7), (10, 7), (8, 8), (9, 8), (10, 8), (8, 9), (9, 9), (10, 9)):
        base[y][x] = 'o'
    base[8][9] = 'd'
    base[6][9] = 'g'
    return ladrilho([''.join(linha) for linha in base], cores)


tecido('teias-aboboras', tecido_teias())
TECIDOS_PROPRIOS['teias-aboboras'] = True


# --- Terreiros --------------------------------------------------------------------------------------------------------------

def terreno_proprio(id_, paleta_):
    terreno(id_, paleta_)
    TERRENOS_PROPRIOS[id_] = True


import tema_halloween_terrenos  # noqa: E402,F401  (os terreiros registram-se em TERRENOS_NOVOS)
import tema_halloween_lados  # noqa: E402,F401  (os cenários registram-se em LADOS)
