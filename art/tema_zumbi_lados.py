"""Cenários do tema terra de zumbis, bem criativos e com a cara da festa junina: a Barraca do Miolo (quermesse zumbi), a Kombi da Pamonha (carro de som),
o Casal Zumbi na Quadrilha (perde a cabeça no balancê) e o Banheiro Químico Ocupado (tem alguém aí... batendo na porta)."""

import math

from itens_novos import Grade, elipse, pintar
from tema_comum import ret, lin, grosso, triangulo, poligono, mini_texto, Deslocada, cortar_linhas, cortar_colunas
from tema_zumbi import lado

MIOLO = {'v': '#58b84a', 'V': '#e8f4d8', 'n': '#7a5028', 'N': '#a87a40', 'D': '#4a3018', 'u': '#2a2438', 'U': '#3e3454', 'z': '#8ec86a', 'Z': '#5a9a48', 'k': '#1a1420',
         'w': '#fffaf0', 'p': '#ff8aa8', 'P': '#c8506e', 'r': '#e8302c', 'e': '#fff6e0', 'y': '#ffd21e', 'g': '#9ad048', 's': '#cfeaf2', 'S': '#8ab8c8', 'h': '#fff4d8',
         'a': '#d8d4c8', 'c': '#b8b4a8', 'l': '#6a4a28'}


def barraca_miolo(k):
    """Barraca de quermesse zumbi: um vendedor de chapéu de papel e avental sujo oferece espetinho de miolo ("olha o miolo!") balançando o braço, o olho dele
    balança pendurado pelo fio e a placa pinga gosma verde (8 quadros)."""
    g = Grade(50, 58)
    bate = (0, 1, 2, 1, 0, 1, 2, 1)[k]
    # Placa do alto: tábua escura com "MIOLO" em gosma verde que escorre.
    ret(g, 13, 0, 36, 9, 'u')
    ret(g, 13, 0, 36, 0, 'U')
    mini_texto(g, 'MIOLO', 15, 2, 'g')
    for x, comp in ((16, 2), (21, 3), (26, 1), (31, 3), (34, 2)):
        for dy in range(comp):
            g.pôr(x, 8 + dy + (1 if (k + x) % 3 == 0 else 0), 'g')
    ret(g, 17, 9, 17, 10, 'D')
    ret(g, 32, 9, 32, 10, 'D')
    # Fundo da barraca, postes e o toldo listrado verde e creme com a franja.
    ret(g, 5, 20, 45, 42, 'u')
    for x, y in ((9, 24), (38, 26), (13, 33), (40, 36)):
        g.pôr(x, y, 'U')
    ret(g, 3, 10, 5, 57, 'n')
    ret(g, 45, 10, 47, 57, 'n')
    ret(g, 3, 10, 3, 57, 'N')
    ret(g, 45, 10, 45, 57, 'N')
    poligono(g, [(0, 19), (7, 10), (43, 10), (50, 19)], 'v')
    for y in range(10, 19):
        for x in range(50):
            if g.ler(x, y) == 'v' and ((x - y // 3) // 4) % 2 == 1:
                g.pôr(x, y, 'V')
    for x in range(50):
        dentro = (x % 6) - 2.5
        for y in range(19, 22):
            if abs(dentro) <= 2.6 * math.sqrt(max(0, 1 - ((y - 19) / 2.6) ** 2)):
                g.pôr(x, y, 'v' if (x // 6) % 2 == 0 else 'V')
    # O vendedor zumbi: cabeça verde-murcha, chapéu de papel, um olho normal e o outro pendurado, boca aberta com dente faltando.
    cx, cy = 24, 29 + (1 if bate == 2 else 0)
    ret(g, 18, 36, 30, 42, 'w')
    ret(g, 22, 37, 24, 39, 'r')
    ret(g, 26, 40, 28, 41, 'P')
    elipse(g, cx, cy, 7, 7, 'z')
    for y in range(cy - 7, cy + 8):
        for x in range(cx - 8, cx + 9):
            if g.ler(x, y) == 'z' and (x >= cx + 4 or y >= cy + 5):
                g.pôr(x, y, 'Z')
    ret(g, cx - 4, cy - 2, cx - 1, cy + 1, 'e')
    g.pôr(cx - 2 + (1 if bate == 1 else 0), cy - 1, 'k')
    ret(g, cx + 2, cy - 2, cx + 4, cy + 1, 'k')
    # O olho que pende pelo fio, balançando de um lado para o outro.
    balanco = (0, 1, 2, 1, 0, -1, -2, -1)[k]
    lin(g, cx + 3, cy + 1, cx + 3 + balanco, cy + 5, 'r')
    elipse(g, cx + 3 + balanco, cy + 6, 1.7, 1.7, 'e')
    g.pôr(cx + 3 + balanco, cy + 6, 'k')
    # Boca aberta com a língua, o dente que falta e as costuras.
    ret(g, cx - 4, cy + 3, cx + 2, cy + 5, 'k')
    for x in (cx - 4, cx - 2, cx):
        g.pôr(x, cy + 3, 'w')
    ret(g, cx - 2, cy + 5, cx, cy + 5, 'p')
    for x, y in ((cx - 3, cy - 5), (cx - 2, cy - 4), (cx - 1, cy - 5)):
        g.pôr(x, y, 'k')
    # Chapéu de papel branco de churrasqueiro (dobradinho e meio torto).
    ret(g, cx - 5, cy - 12, cx + 5, cy - 6, 'w')
    ret(g, cx - 6, cy - 7, cx + 6, cy - 6, 'a')
    for x in (cx - 3, cx, cx + 3):
        g.pôr(x, cy - 10, 'a')
    # Braço direito: o espetinho de miolo erguido, balançando ("olha o miolo!"); o braço esquerdo cai mole sobre o balcão.
    hx, hy = 36, 34 - bate
    grosso(g, 30, 39, hx, hy, 'z', 1.5)
    grosso(g, hx, hy, hx + 1, hy - 8, 'l', 0.5)
    elipse(g, hx + 1, hy - 10, 3.2, 2.6, 'p')
    for dx, dy in ((-1, -11), (1, -10), (0, -9), (2, -11)):
        g.pôr(hx + 1 + dx, hy + dy, 'P')
    ret(g, hx - 1, hy - 1, hx + 1, hy, 'Z')
    grosso(g, 18, 38, 13, 41, 'z', 1.4)
    # O balcão de madeira, com a boca da frente decorada com um miolo pintado, e os potes em cima.
    ret(g, 3, 43, 47, 57, 'n')
    ret(g, 2, 41, 48, 43, 'N')
    for x in range(6, 47, 7):
        ret(g, x, 44, x, 57, 'D')
    elipse(g, 25, 50, 6.4, 4.6, 'p')
    for dx, dy in ((-3, -1), (-1, -2), (1, -1), (3, -2), (0, 1), (-3, 2), (2, 2)):
        g.pôr(25 + dx, 50 + dy, 'P')
    ret(g, 25, 46, 25, 54, 'P')
    # Potinho de olhos de goiaba (vidro com bolinhas) e o copo de espetinhos, em cima do balcão.
    ret(g, 36, 37, 43, 42, 's')
    ret(g, 36, 37, 43, 37, 'S')
    for x, y in ((37, 40), (39, 39), (41, 40), (38, 41), (42, 41)):
        g.pôr(x, y, 'e')
        g.pôr(x + 1, y, 'r')
    ret(g, 7, 36, 12, 42, 'h')
    ret(g, 7, 36, 12, 36, 'a')
    for x, topo in ((8, 29), (10, 31), (12, 30)):
        ret(g, x, topo, x, 36, 'l')
        elipse(g, x, topo - 1, 1.8, 1.6, 'p')
    cortar_colunas(g, 49, 50)
    cortar_colunas(g, 0, 1)
    cortar_linhas(g, 56, 58)
    cortar_linhas(g, 15, 17)
    return pintar(g.texto(), MIOLO)


lado('barraca-miolo', [barraca_miolo(k) for k in range(8)], fps=5)


KOMBI = {'c': '#f0e6c8', 'C': '#c8bc98', 't': '#4cb4a4', 'T': '#2e8a7c', 'k': '#1a1420', 'e': '#3a4a58', 'E': '#9ac8d8', 'w': '#fffaf0', 'g': '#9ad048', 'G': '#6aa030',
         'z': '#8ec86a', 'Z': '#5a9a48', 'h': '#e8c060', 'H': '#b88a30', 'r': '#e8302c', 'y': '#ffd21e', 'o': '#b8642c', 'a': '#c4c0d0', 'A': '#8e8a9c', 'l': '#4a4658',
         'L': '#16121c', 'p': '#ff8aa8', 'm': '#e8d878', 'M': '#c8b040', 'v': '#58b84a', 'f': '#ee9a2a'}


def kombi_pamonha(k):
    """Kombi velha de carro de som: o zumbi motorista de chapéu de palha grita "olha a pamonha!" pela janela com um embrulho de milho na mão, o alto-falante do
    teto solta ondas de som, a lataria balança e as rodas giram (8 quadros)."""
    base = Grade(48, 46)
    g = Deslocada(base, -5, 0)
    ob = (0, 1, 0, 0, 1, 0, 1, 0)[k]
    ciclo = k / 8 * 2 * math.pi
    # A carroceria: parte de cima creme, parte de baixo turquesa com o V branco da Kombi, janelas e faróis.
    corpo = [(3, 18 + ob), (6, 13 + ob), (41, 13 + ob), (47, 22 + ob), (51, 27 + ob), (51, 38 + ob), (3, 38 + ob)]
    poligono(g, corpo, 'c')
    for y in range(13 + ob, 39 + ob):
        for x in range(54):
            if g.ler(x, y) == 'c' and y >= 27 + ob:
                g.pôr(x, y, 't' if y < 36 + ob else 'T')
    for x in range(4, 51):
        g.pôr(x, 27 + ob, 'w')
    # Ferrugem espalhada.
    for x, y in ((8, 30), (9, 31), (22, 33), (23, 33), (35, 31), (44, 35), (45, 35), (12, 24), (13, 24)):
        g.pôr(x, y + ob, 'o')
    # A placa "PAMONHA" pintada na lateral (letras vermelhas numa faixa creme).
    ret(g, 10, 28 + ob, 38, 34 + ob, 'c')
    mini_texto(g, 'PAMONHA', 11, 29 + ob, 'r')
    # Janelas laterais escuras com o brilho do vidro e a janela do motorista, com o zumbi.
    for x0, x1 in ((7, 15), (18, 26)):
        ret(g, x0, 16 + ob, x1, 23 + ob, 'e')
        lin(g, x0 + 1, 22 + ob, x0 + 3, 17 + ob, 'E')
    ret(g, 29, 16 + ob, 39, 24 + ob, 'e')
    poligono(g, [(40, 16 + ob), (44, 22 + ob), (40, 24 + ob)], 'e')
    # O motorista zumbi: cabeça verde de chapéu de palha, olhos arregalados e boca escancarada gritando.
    elipse(g, 34, 20 + ob, 4.2, 4.0, 'z')
    ret(g, 36, 17 + ob, 38, 23 + ob, 'Z')
    ret(g, 31, 18 + ob, 32, 19 + ob, 'w')
    ret(g, 35, 18 + ob, 36, 19 + ob, 'w')
    g.pôr(31, 19 + ob, 'k')
    g.pôr(36, 19 + ob, 'k')
    boca = 1 + (k % 2)
    ret(g, 32, 22 + ob, 36, 22 + boca + ob, 'L')
    ret(g, 28, 17 + ob, 40, 17 + ob, 'h')
    ret(g, 31, 14 + ob, 37, 16 + ob, 'h')
    ret(g, 31, 16 + ob, 37, 16 + ob, 'r')
    # O braço verde para fora da janela com um embrulho de pamonha (palha de milho amarrada) que balança.
    bx, by = 41 + (k % 2), 27 + ob - (1 if k % 2 else 0)
    grosso(g, 38, 24 + ob, bx, by, 'z', 1.3)
    poligono(g, [(bx - 1, by - 1), (bx + 4, by - 3), (bx + 7, by + 1), (bx + 4, by + 5), (bx - 1, by + 3)], 'm')
    lin(g, bx, by, bx + 5, by + 3, 'M')
    lin(g, bx + 2, by - 2, bx + 6, by + 1, 'M')
    # Roda de reserva... não: faróis, para-choque e a calota brilhando.
    ret(g, 49, 27 + ob, 51, 30 + ob, 'y' if k % 4 < 2 else 'h')
    ret(g, 3, 28 + ob, 4, 30 + ob, 'r')
    ret(g, 2, 37 + ob, 52, 38 + ob, 'A')
    # Alto-falante de corneta no teto (duas cornetas), com as ondas de som que saem e crescem.
    ret(g, 16, 10 + ob, 34, 12 + ob, 'l')
    for x0 in (18, 27):
        ret(g, x0, 8 + ob, x0 + 3, 10 + ob, 'L')
        poligono(g, [(x0 + 3, 8 + ob), (x0 + 3, 11 + ob), (x0 + 8, 12 + ob), (x0 + 8, 6 + ob)], 'a')
        ret(g, x0 + 7, 7 + ob, x0 + 8, 11 + ob, 'k')
    for n in range(3):
        fase = (k + n * 3) % 8
        x = 34 + fase * 2
        if x < 52:
            for dy in range(-fase // 2 - 1, fase // 2 + 2):
                g.pôr(x, 8 + ob + dy, 'w' if fase < 5 else 'a')
    # Rodas com calota que gira (um raio claro dá a volta) e o para-lama escuro.
    for cx in (13, 41):
        elipse(g, cx, 40, 5.6, 5.6, 'L')
        elipse(g, cx, 40, 3.2, 3.2, 'a')
        for n in range(3):
            a = ciclo * 2 + n * 2.0944
            g.pôr(round(cx + math.cos(a) * 2.3), round(40 + math.sin(a) * 2.3), 'A')
        g.pôr(cx, 40, 'k')
    return pintar(base.texto(), KOMBI)


lado('kombi-pamonha', [kombi_pamonha(k) for k in range(8)], fps=6)


CASAL = {'z': '#8ec86a', 'Z': '#5a9a48', 'K': '#2a2030', 'r': '#ee2f3c', 'R': '#9a1c2c', 'f': '#ee2f3c', 'F': '#ffd21e', 'b': '#4a78d8', 'B': '#2c4a98', 'w': '#fffaf0',
         'n': '#7a5a3a', 'N': '#4a3420', 'y': '#ffd21e', 'k': '#1a1420', 'h': '#e8c060', 'H': '#b88a30', 'p': '#ff6a8a', 'u': '#3a78d8', 'v': '#35a03a', 'e': '#fffaf0',
         'a': '#c4c0d0', 'o': '#e8803a'}


def cabeca_zumbi(g, hx, hy, ela, olha, boca, tomba=0):
    """Cabeça de zumbi de desenho animado: pele verde, um olho normal e outro em X, boca com dentes; ela tem tranças com laço e flor, ele chapéu de palha."""
    elipse(g, hx, hy, 4.8, 4.6, 'z')
    for y in range(hy - 5, hy + 6):
        for x in range(hx - 5, hx + 6):
            if g.ler(x, y) == 'z' and (x >= hx + 3 or y >= hy + 4):
                g.pôr(x, y, 'Z')
    ret(g, hx - 3, hy - 1, hx - 2, hy, 'e')
    g.pôr(hx - 3 + (1 if olha > 0 else 0), hy - (1 if olha == 2 else 0), 'k')
    for dx, dy in ((1, -1), (3, -1), (2, 0), (1, 1), (3, 1)):
        g.pôr(hx + dx, hy + dy, 'k')
    for dx in (-3, -2, 1, 2):
        g.pôr(hx + dx, hy + 1 - 0 if False else hy + 2, 'Z')
    # Boca: faixa escura com dentes; aberta em "O" quando surpresa.
    if boca == 2:
        ret(g, hx - 1, hy + 2, hx + 1, hy + 4, 'k')
        g.pôr(hx, hy + 3, 'p')
    else:
        ret(g, hx - 2, hy + 3, hx + 2, hy + 3 + boca, 'k')
        g.pôr(hx - 2, hy + 3, 'w')
        g.pôr(hx, hy + 3, 'w')
        g.pôr(hx + 2, hy + 3, 'w')
    if ela:
        ret(g, hx - 5, hy - 5, hx + 4, hy - 3, 'K')
        ret(g, hx - 4, hy - 6, hx + 3, hy - 6, 'K')
        for lado_, sinal in ((-6, -1), (5, 1)):
            for dy in range(-3, 6):
                g.pôr(hx + lado_ + (1 if dy > 2 else 0) * sinal * 0, hy + dy, 'K')
            ret(g, hx + lado_ - 1, hy + 3, hx + lado_ + 1, hy + 4, 'r')
        elipse(g, hx + 2, hy - 6, 1.6, 1.6, 'p')
        g.pôr(hx + 2, hy - 6, 'F')
    else:
        elipse(g, hx, hy - 4, 8.2, 1.6, 'h')
        elipse(g, hx, hy - 6, 4.0, 2.6, 'h')
        ret(g, hx - 4, hy - 5, hx + 4, hy - 5, 'r')
        for x in range(hx - 8, hx + 9, 3):
            g.pôr(x, hy - 3, 'H')


def casal_zumbi_quadrilha(k):
    """Casal de zumbis dançando o balancê de braços dados, ele de chapéu de palha e camisa xadrez, ela de vestido de chita e trança: eles balançam de um lado
    para o outro, o par de braços sobe e desce, e a cabeça dela salta numa mola, sobe e volta (8 quadros)."""
    base = Grade(48, 52)
    g = Deslocada(base, 0, -4)
    bal = (0, 1, 2, 1, 0, -1, -2, -1)[k]
    sobe = (0, 1, 2, 1, 0, 1, 2, 1)[k]
    pulo = 1 if k in (2, 6) else 0
    # As bandeirinhas do alto (um varal em curva) balançando.
    for x in range(1, 47):
        g.pôr(x, 11 + round(((x - 24) / 23) ** 2 * 2), 'k')
    for n, x in enumerate((5, 12, 19, 29, 36, 43)):
        y = 12 + round(((x - 24) / 23) ** 2 * 2)
        ondula = round(math.sin(k * 0.8 + n))
        for dy in range(4):
            for dx in range(-(3 - dy) // 2, (3 - dy) // 2 + 1):
                g.pôr(x + dx + ondula, y + dy, 'fFuvpf'[n])
    # Pernas dela (finas, de meia rasgada) e dele (calça com remendo), com os pés que pulam no ritmo.
    fx, mx = 15 + bal // 2, 32 + bal // 2
    for lx in (fx - 3, fx + 3):
        ret(g, lx, 46 - pulo, lx + 1, 51 - pulo, 'z')
        ret(g, lx - 1, 52 - pulo, lx + 2, 53 - pulo, 'k')
    ret(g, fx - 3, 48 - pulo, fx - 2, 48 - pulo, 'w')
    ret(g, fx + 3, 49 - pulo, fx + 4, 49 - pulo, 'w')
    ret(g, mx - 4, 41 - pulo, mx + 4, 50 - pulo, 'n')
    ret(g, mx, 42 - pulo, mx, 50 - pulo, 'N')
    ret(g, mx - 3, 44 - pulo, mx - 1, 46 - pulo, 'y')
    for lx in (mx - 4, mx + 1):
        ret(g, lx, 51 - pulo, lx + 3, 53 - pulo, 'k')
    # Vestido de chita dela: xadrez vermelho e amarelo, saia rodada que balança com o par.
    for y in range(32 - pulo, 46 - pulo):
        meia = 3 + (y - 32 + pulo) * 0.55
        for x in range(round(fx - meia - bal * (y - 32) * 0.05), round(fx + meia + 1 - bal * (y - 32) * 0.05)):
            g.pôr(x, y, 'f' if ((x // 2) + (y // 2)) % 2 == 0 else 'F')
    ret(g, fx - 3, 37 - pulo, fx + 3, 37 - pulo, 'R')
    # A camisa xadrez azul dele com suspensório, e o braço com a manga rasgada.
    for y in range(32 - pulo, 41 - pulo):
        for x in range(mx - 4, mx + 5):
            g.pôr(x, y, 'b' if ((x // 2) + (y // 2)) % 2 == 0 else 'w')
    ret(g, mx - 2, 32 - pulo, mx - 2, 41 - pulo, 'r')
    ret(g, mx + 2, 32 - pulo, mx + 2, 41 - pulo, 'r')
    # Os braços dados no meio: juntos no alto do arco, subindo e descendo; a outra mão de cada um na cintura.
    mxh, myh = 24 + bal // 2, 25 - sobe - pulo
    grosso(g, fx + 3, 33 - pulo, mxh, myh, 'z', 1.1)
    grosso(g, mx - 3, 33 - pulo, mxh, myh, 'z', 1.1)
    ret(g, mxh - 1, myh - 1, mxh + 1, myh, 'Z')
    grosso(g, fx - 3, 33 - pulo, fx - 6, 38 - pulo, 'z', 1.0)
    grosso(g, mx + 4, 33 - pulo, mx + 7, 38 - pulo, 'z', 1.0)
    # As cabeças: a dele fica no lugar (olha para cima quando a dela sai); a dela salta na mola nos quadros 4 a 7.
    cabeca_zumbi(g, mx + bal // 2, 26 - pulo, False, 2 if k in (5, 6) else 1, 1)
    altura = (0, 0, 0, 0, 2, 9, 13, 3)[k]
    hx, hy = fx + bal // 2, 26 - pulo - altura
    if altura > 1:
        # A mola entre o pescoço e a cabeça: espiral de arame cinza.
        for y in range(hy + 5, 31 - pulo):
            g.pôr(hx + (1 if (y // 2) % 2 else -1), y, 'a')
            g.pôr(hx, y, 'a')
    ret(g, fx - 1, 30 - pulo, fx + 1, 32 - pulo, 'Z')
    cabeca_zumbi(g, hx, hy, True, 1 if altura == 0 else 2, 2 if altura > 1 else 1)
    if altura >= 9:
        # Rastro de movimento (tracinhos) atrás da cabeça que sobe.
        for dx in (-6, 0, 6):
            ret(g, hx + dx, hy + 8, hx + dx, hy + 10, 'a')
    return pintar(base.texto(), CASAL)


lado('casal-zumbi-quadrilha', [casal_zumbi_quadrilha(k) for k in range(8)], fps=5)


BANH = {'w': '#e4ecf2', 'W': '#b4c4d4', 'u': '#3a78d8', 'U': '#2a5aa8', 'l': '#6aa0f0', 'd': '#4a88e8', 'r': '#e8302c', 'R': '#9a1c2c', 'k': '#1a1420', 'a': '#c4c0d0',
        'A': '#8e8a9c', 'z': '#8ec86a', 'Z': '#5a9a48', 'g': '#9ad048', 'G': '#c8f070', 'y': '#ffd21e', 'e': '#fff6e0', 'o': '#ff8a1e', 'p': '#ff6a8a', 'c': '#fffaf0'}


def banheiro_quimico(k):
    """Banheiro químico da festa com a placa "OCUPADO" acesa: tem um zumbi lá dentro batendo na porta, que treme e estufa nas batidas ("BAM"), uma mão verde
    escapa pela fresta mexendo os dedos, olhos vermelhos espiam pelas frestas, moscas rodeiam e um fedor verde sobe da ventilação (8 quadros)."""
    g = Grade(44, 60)
    ciclo = k / 8 * 2 * math.pi
    bam = k in (1, 3, 5, 7)
    ox = (0, 1, 0, -1, 0, 1, 0, -1)[k]
    # O fedor verde subindo da ventilação (curvas de pontinhos verdes) e as moscas rodeando o teto.
    for j in range(3):
        fase = (k / 8 + j / 3) % 1
        x = 22 + math.sin(fase * 6 + j * 2) * 5 + (j - 1) * 3
        y = 3 - fase * 3
        if y >= 0:
            elipse(g, x, y + 1, 1.2 + fase, 1.0, 'g' if fase < 0.6 else 'G')
    for n, (raio, vel) in enumerate(((11, 1), (8, -1))):
        a = ciclo * vel * 2 + n * 3.0
        fx, fy = 22 + math.cos(a) * raio, 8 + math.sin(a) * (raio * 0.35)
        g.pôr(round(fx), round(fy), 'k')
        g.pôr(round(fx) + 1, round(fy) - 1, 'W')
    # Teto inclinado com a ventilação.
    poligono(g, [(3 + ox, 14), (7 + ox, 7), (36 + ox, 7), (40 + ox, 14)], 'w')
    ret(g, 3 + ox, 13, 40 + ox, 14, 'W')
    ret(g, 19 + ox, 4, 24 + ox, 7, 'W')
    ret(g, 18 + ox, 3, 25 + ox, 4, 'A')
    # O corpo azul: lateral clara à esquerda, escura à direita, com a base de plástico.
    ret(g, 5 + ox, 14, 38 + ox, 58, 'u')
    ret(g, 5 + ox, 14, 7 + ox, 58, 'l')
    ret(g, 35 + ox, 14, 38 + ox, 58, 'U')
    ret(g, 5 + ox, 56, 38 + ox, 58, 'U')
    # A placa "OCUPADO": plaquinha vermelha acesa no alto da porta.
    ret(g, 6 + ox, 17, 37 + ox, 24, 'r')
    ret(g, 6 + ox, 17, 37 + ox, 17, 'R')
    mini_texto(g, 'OCUPADO', 8 + ox, 19, 'c' if k % 2 == 0 else 'y')
    # A porta (estufa nas batidas) com as frestas de ventilação, onde aparecem os olhos vermelhos, e a maçaneta.
    px = ox + (1 if bam else 0)
    ret(g, 9 + px, 27, 34 + px, 57, 'd')
    ret(g, 9 + px, 27, 9 + px, 57, 'l')
    ret(g, 34 + px, 27, 34 + px, 57, 'U')
    for y in (30, 33, 36):
        ret(g, 13 + px, y, 30 + px, y, 'U')
    for x, olha in ((16, 0), (25, 1)):
        ret(g, x + px, 31, x + 3 + px, 32, 'k')
        ret(g, x + px + (1 if bam else 0), 31, x + px + 1 + (1 if bam else 0), 32, 'r')
    ret(g, 12 + px, 45, 14 + px, 49, 'a')
    ret(g, 12 + px, 45, 12 + px, 49, 'A')
    ret(g, 15 + px, 46, 16 + px, 47, 'r')
    # A mão verde escapando pela beira direita da porta (os dedos mexem), com a manga rasgada.
    dedos = (3, 4, 5, 4, 3, 4, 5, 4)[k]
    for i, y in enumerate((41, 43, 45, 47)):
        comp = dedos + (1 if (k + i) % 2 else 0) - (1 if i == 3 else 0)
        ret(g, 35 + px, y, 35 + px + comp, y, 'z')
        g.pôr(35 + px + comp, y, 'Z')
        g.pôr(35 + px + comp + 1, y + (1 if (k + i) % 3 == 0 else 0), 'z')
    ret(g, 34 + px, 40, 36 + px, 48, 'Z')
    # "BAM": tracinhos amarelos saindo da porta quando ela bate.
    if bam:
        for dx, dy, ex, ey in ((-4, 40, -7, 38), (-4, 46, -7, 48), (-4, 52, -7, 55), (40, 32, 43, 30), (41, 52, 43, 55)):
            lin(g, dx + 8, dy, ex + 8, ey, 'y')
    cortar_linhas(g, 50, 56)
    return pintar(g.texto(), BANH)


lado('banheiro-quimico', [banheiro_quimico(k) for k in range(8)], fps=6)
