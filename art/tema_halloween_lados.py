"""Cenários do tema Halloween, bem criativos e com a cara da festa junina: o Caldeirão de Canjica da bruxa (borbulha e solta fantasminha), a Casinha
Pé-de-Galinha (anda!), a Pescaria dos Fantasmas (barraca de quermesse) e o Esqueleto Marcador da Quadrilha (grita "anarriê")."""

import math

from itens_novos import Grade, elipse, pintar
from tema_comum import ret, lin, grosso, triangulo, poligono, mini_texto, cortar_linhas
from tema_halloween import lado

CALD = {'k': '#2e2838', 'K': '#4e465e', 'D': '#16121c', 'w': '#fffaf0', 'g': '#5fb83a', 'G': '#b2ea4a', 'h': '#f0ff8a', 'y': '#ffd860', 'n': '#6a4220', 'N': '#9a6a34',
        'o': '#ff8a1e', 'O': '#ffd23a', 'r': '#e8401c', 's': '#8e8a9c', 'S': '#c4c0d0', 'b': '#7a5a30', 'p': '#a070d8', 'e': '#16121c', 'v': '#3a8a28'}


def caldeirao_canjica(k):
    """Caldeirão de ferro com "CANJICA" pintado na barriga: a colher de pau gira sozinha, as bolhas verdes sobem e estouram, o fogo dança e de vez em quando
    um fantasminha sai de dentro do mingau e sobe com a fumaça (8 quadros)."""
    g = Grade(44, 50)
    t = k / 8 * 2 * math.pi
    # Pedras da fogueira e o fogo (as línguas de fogo mudam a cada quadro) atrás da panela.
    for fase, (fx, alt) in enumerate(((11, 9), (15, 12), (21, 14), (27, 12), (31, 9))):
        altura = alt + ((k + fase * 2) % 4) - 1
        for y in range(46 - altura, 47):
            meia = max(0, (y - (46 - altura)) * 0.45 + 0.3)
            for x in range(round(fx - meia), round(fx + meia) + 1):
                g.pôr(x, y, 'r' if y < 46 - altura + 3 else 'o' if y < 44 else 'O')
    ret(g, 6, 45, 14, 49, 's')
    ret(g, 30, 45, 38, 49, 's')
    for x, y in ((8, 46), (11, 47), (33, 46), (36, 47)):
        g.pôr(x, y, 'S')
    # Lenha cruzada na frente do fogo.
    grosso(g, 12, 48, 32, 45, 'n', 1.6)
    grosso(g, 12, 45, 32, 48, 'N', 1.6)
    # Corpo do caldeirão: barriga redonda de ferro com brilho à esquerda e sombra à direita.
    elipse(g, 22, 29, 17, 13, 'k')
    for y in range(g.h):
        for x in range(g.w):
            if g.ler(x, y) == 'k':
                if x >= 22 + 10:
                    g.pôr(x, y, 'D')
                elif x <= 22 - 11 and y < 33:
                    g.pôr(x, y, 'K')
    for y in range(21, 27):
        g.pôr(9, y, 'S')
    # Línguas de fogo na frente, lambendo as laterais da panela (cada uma com altura e fase próprias).
    for fase, (fx, alt) in enumerate(((7, 13), (11, 10), (33, 10), (37, 13), (5, 8), (39, 8))):
        altura = alt + ((k + fase * 3) % 4) - 1
        for y in range(46 - altura, 47):
            meia = (y - (46 - altura)) * 0.32 + 0.2
            for x in range(round(fx - meia), round(fx + meia) + 1):
                g.pôr(x, y, 'r' if y < 46 - altura + 3 else 'o' if y < 43 else 'O')
    # "CANJICA" pintado na barriga.
    mini_texto(g, 'CANJICA', 9, 28, 'h')
    # Argolas de cada lado e a boca do caldeirão com o mingau verde.
    for x in (3, 4, 40, 41):
        ret(g, x, 17, x, 20, 'K')
    ret(g, 4, 17, 6, 17, 'K')
    ret(g, 38, 17, 40, 17, 'K')
    elipse(g, 22, 18, 17, 4.6, 'K')
    elipse(g, 22, 18.6, 14.6, 3.4, 'g')
    # O redemoinho do mingau: um arco claro que gira e grãos de milho que passeiam.
    for n in range(4):
        a = t + n * math.pi / 2
        px, py = 22 + math.cos(a) * 9.5, 18.6 + math.sin(a) * 2.0
        g.pôr(round(px), round(py), 'G')
        g.pôr(round(px) + 1, round(py), 'G')
    for n in range(3):
        a = -t * 0.6 + n * 2.1
        g.pôr(round(22 + math.cos(a) * 6), round(18.8 + math.sin(a) * 1.4), 'y')
    # A colher de pau gira: o cabo sai do mingau e vai para cima, inclinado conforme a volta.
    ponta = (22 + math.cos(t) * 6.5, 18.8 + math.sin(t) * 1.5)
    topo = (ponta[0] + 5 + math.cos(t) * 2, 4 + math.sin(t) * 1.5)
    grosso(g, ponta[0], ponta[1], topo[0], topo[1], 'N', 1.0)
    elipse(g, ponta[0], ponta[1] + 0.5, 2.2, 1.2, 'N')
    g.pôr(round(topo[0]), round(topo[1]) - 1, 'N')
    # Três bolhas sobem do mingau e estouram no alto.
    for n in range(3):
        fase = (k / 8 + n / 3) % 1
        bx = 14 + n * 8 + math.sin(fase * 6 + n) * 2
        by = 17 - fase * 12
        r = 1.0 + fase * 1.8
        if fase < 0.82:
            elipse(g, bx, by, r, r, 'G')
            g.pôr(round(bx - r * 0.4), round(by - r * 0.4), 'w')
        else:
            for dx, dy in ((-2, -1), (2, -1), (0, -3), (-1, 1), (1, 1)):
                g.pôr(round(bx) + dx, round(by) + dy, 'G')
    # O fantasminha que sai da panela nos quadros 3 a 6 e sobe devagar.
    if 3 <= k <= 7:
        sobe = (k - 3) * 3
        fx, fy = 29 + (k - 3) % 2, 16 - sobe
        poligono(g, [(fx - 3, fy + 5), (fx - 3, fy + 1), (fx - 2, fy - 2), (fx, fy - 3), (fx + 2, fy - 2), (fx + 3, fy + 1), (fx + 3, fy + 5), (fx + 2, fy + 3), (fx, fy + 5), (fx - 1, fy + 3)], 'w')
        g.pôr(fx - 1, fy, 'e')
        g.pôr(fx + 1, fy, 'e')
        g.pôr(fx, fy + 2, 'e')
    # Vapor: duas curvas brancas que sobem e somem.
    for n in range(2):
        fase = (k / 8 + n * 0.5) % 1
        vx, vy = 9 + n * 24 + math.sin(fase * 7) * 2, 14 - fase * 12
        if vy > 1:
            g.pôr(round(vx), round(vy), 'S')
            g.pôr(round(vx) + 1, round(vy) - 1, 'S')
    # Faísca do fogo.
    sx, sy = 17 + (k * 5) % 11, 43 - (k * 3) % 8
    g.pôr(sx, sy, 'O')
    return pintar(g.texto(), CALD)


lado('caldeirao-canjica', [caldeirao_canjica(k) for k in range(8)], fps=6)


CASA = {'w': '#6a4a58', 'W': '#8a6070', 'd': '#3a2838', 'P': '#6a3a9a', 'q': '#472a6e', 'Q': '#8a5ac0', 'y': '#ffe27a', 'Y': '#fff6b0', 'l': '#f0b43a', 'L': '#c88a20',
        'c': '#fffaf0', 'e': '#1a1420', 'f': '#ee2f3c', 'F': '#ffd21e', 'b': '#3a78d8', 'v': '#35a03a', 'r': '#ff4f9e', 's': '#c4c0d0', 'S': '#8e8a9c', 'o': '#ff8a1e',
        'k': '#4a3020', 'K': '#7a5030', 'n': '#ffd860', 'g': '#5fb83a'}


def casinha_pe_de_galinha(k):
    """Casinha de bruxa sobre duas pernas de galinha: ela anda (uma perna levanta, a casa afunda e balança), as janelas-olho piscam e olham para os lados, a
    chaminé solta fumaça e a bandeirinha do beiral tremula (8 quadros)."""
    g = Grade(48, 58)
    ciclo = k / 8 * 2 * math.pi
    lev_e = max(0.0, math.sin(ciclo)) * 6
    lev_d = max(0.0, -math.sin(ciclo)) * 6
    baixa = 1 if max(lev_e, lev_d) > 3 else 0
    ox = (0, 1, 1, 0, 0, -1, -1, 0)[k]
    oy = baixa
    # Pernas de galinha (de frente): coxa amarela, "joelho" para trás, canela escamosa e pé de três dedos com garras. A perna levantada encolhe.
    for hx, lev in ((16, lev_e), (32, lev_d)):
        ay = 52 - round(lev)
        ax = hx + (-1 if hx < 24 else 1)
        grosso(g, hx, 41 + oy, hx + (-2 if hx < 24 else 2), 46 - round(lev * 0.5), 'l', 2.2)
        grosso(g, hx + (-2 if hx < 24 else 2), 46 - round(lev * 0.5), ax, ay, 'l', 1.6)
        for y in range(44 - round(lev * 0.5), ay):
            if y % 3 == 0:
                g.pôr(ax - 1 + (hx < 24) * 0, y, 'L')
        # Dedos: três para a frente, abertos em leque, com garra clara na ponta.
        for dx, dy in ((-5, 3), (0, 4), (5, 3)):
            ex, ey = ax + dx, min(55, ay + dy) if lev < 1 else ay + dy
            lin(g, ax, ay, ex, ey, 'l')
            g.pôr(ex, ey, 'c')
            g.pôr(ex + (1 if dx > 0 else -1 if dx < 0 else 0), ey, 'c')
        ret(g, ax - 1, ay - 1, ax + 1, ay, 'L')
    # O corpo da casa (tábuas verticais, claro à esquerda, escuro à direita), balançando de leve.
    for y in range(27 + oy, 42 + oy):
        for x in range(10 + ox, 39 + ox):
            tabua = (x - 10 - ox) % 5
            g.pôr(x, y, 'd' if tabua == 4 else 'W' if x < 18 + ox and tabua == 1 else 'w')
    ret(g, 10 + ox, 41 + oy, 38 + ox, 41 + oy, 'd')
    # Telhado: chapéu de bruxa torto, com a ponta caída para o lado, telhas em fileiras e a faixa de chita no beiral.
    poligono(g, [(2 + ox, 28 + oy), (21 + ox, 9 + oy), (25 + ox, 3 + oy), (31 + ox, 1 + oy), (28 + ox, 7 + oy), (30 + ox, 11 + oy), (46 + ox, 28 + oy)], 'P')
    for y in range(2 + oy, 28 + oy):
        for x in range(0, 48):
            if g.ler(x, y) == 'P':
                if (y + (x // 3)) % 4 == 0:
                    g.pôr(x, y, 'q')
                elif x < 17 + ox and (y + x // 3) % 4 == 1:
                    g.pôr(x, y, 'Q')
    # Remendo de xadrez no telhado e a faixa de chita no beiral.
    for dy in range(4):
        for dx in range(4):
            g.pôr(30 + dx + ox, 16 + dy + oy, 'f' if (dx + dy) % 2 == 0 else 'F')
    for x in range(3 + ox, 46 + ox):
        g.pôr(x, 26 + oy, 'f' if (x // 2) % 2 == 0 else 'F')
        g.pôr(x, 27 + oy, 'F' if (x // 2) % 2 == 0 else 'f')
    # Chaminé com fumaça subindo (bolas que crescem e clareiam).
    ret(g, 35 + ox, 7 + oy, 39 + ox, 15 + oy, 'd')
    ret(g, 34 + ox, 6 + oy, 40 + ox, 7 + oy, 'w')
    for j in range(3):
        fase = (k / 8 + j / 3) % 1
        x = 37 + ox + math.sin(fase * 5 + j) * 3
        y = 4 - fase * 7
        r = 1.2 + fase * 2.4
        if y > -3:
            elipse(g, x, y, r, r * 0.8, 's' if fase < 0.6 else 'S')
    # As janelas-olho (acendem, olham para os lados e piscam no quadro 3) e a porta-boca.
    for cx in (17 + ox, 31 + ox):
        elipse(g, cx, 36 + oy, 3.4, 3.4, 'y')
        elipse(g, cx, 36 + oy, 2.3, 2.3, 'Y')
        if k == 3:
            ret(g, cx - 3, 35 + oy, cx + 3, 37 + oy, 'd')
            ret(g, cx - 2, 36 + oy, cx + 2, 36 + oy, 'e')
        else:
            olha = (0, 0, 1, 1, 1, 0, -1, -1)[k]
            ret(g, cx + olha - 1, 35 + oy, cx + olha, 37 + oy, 'e')
            g.pôr(cx + olha - 1, 35 + oy, 'c')
    # A porta (arco) com maçaneta e o capacho de milho; as bandeirinhas descem do beiral.
    ret(g, 22 + ox, 36 + oy, 27 + ox, 41 + oy, 'k')
    ret(g, 23 + ox, 35 + oy, 26 + ox, 35 + oy, 'k')
    ret(g, 22 + ox, 36 + oy, 22 + ox, 41 + oy, 'K')
    g.pôr(26 + ox, 39 + oy, 'n')
    for n, x in enumerate((5, 11, 17, 31, 37, 43)):
        y = 28 + oy + round(math.sin((x - 5) / 38 * math.pi) * -0.0)
        ondula = round(math.sin(k * 0.9 + n * 1.3))
        cor = 'fFbvrf'[n]
        for dy in range(4):
            for dx in range(-(3 - dy) // 2, (3 - dy) // 2 + 1):
                g.pôr(x + dx + ondula + ox, y + dy, cor)
    cortar_linhas(g, 43, 47)
    return pintar(g.texto(), CASA)


lado('casinha-pe-de-galinha', [casinha_pe_de_galinha(k) for k in range(8)], fps=5)


PESC = {'f': '#ee2f3c', 'F': '#ffd9d4', 'n': '#7a5028', 'N': '#a87a40', 'D': '#4a3018', 'u': '#2a2040', 'U': '#3e3260', 'c': '#fff4d8', 'k': '#2a1c24', 'B': '#2f6ab8',
        'b': '#5ab8e8', 'W': '#3a98d0', 'w': '#fffaf0', 'e': '#16121c', 'y': '#ffe27a', 's': '#b8e8f8', 'p': '#ff6a8a', 'v': '#35a03a', 'g': '#c4c0d0', 'o': '#ff8a1e'}


def pescaria_fantasmas(k):
    """Barraca de pescaria da quermesse onde se pescam fantasmas: peixinhos-fantasma nadam na bacia, a linha da vara afunda, um deles morde o anzol, sobe
    gritando "BUU" e cai de volta com respingo (8 quadros)."""
    g = Grade(48, 52)
    ciclo = k / 8 * 2 * math.pi
    # O fundo escuro da barraca (cortina roxa com estrelinhas), os dois postes e o balcão.
    ret(g, 5, 12, 42, 36, 'u')
    for x, y in ((9, 16), (30, 15), (38, 22), (12, 26), (21, 14), (34, 27)):
        g.pôr(x, y, 'U')
    ret(g, 3, 8, 5, 51, 'n')
    ret(g, 42, 8, 44, 51, 'n')
    ret(g, 3, 8, 3, 51, 'N')
    ret(g, 42, 8, 42, 51, 'N')
    # O toldo listrado com a barra de festão e as bandeirinhas penduradas.
    poligono(g, [(0, 12), (7, 2), (41, 2), (48, 12)], 'f')
    for y in range(2, 12):
        for x in range(48):
            if g.ler(x, y) == 'f' and ((x - y // 3) // 4) % 2 == 1:
                g.pôr(x, y, 'F')
    for x in range(0, 48):
        meia = 2.6
        dentro = (x % 6) - 2.5
        for y in range(12, 15):
            if abs(dentro) <= meia * math.sqrt(max(0, 1 - ((y - 12) / 2.6) ** 2)):
                g.pôr(x, y, 'f' if (x // 6) % 2 == 0 else 'F')
    # A placa "PESCARIA" pendurada por dois fios.
    ret(g, 7, 17, 40, 25, 'c')
    ret(g, 7, 17, 40, 17, 'N')
    ret(g, 7, 25, 40, 25, 'N')
    mini_texto(g, 'PESCARIA', 8, 19, 'k')
    for x in (10, 37):
        ret(g, x, 15, x, 16, 'D')
    # A bacia (tina azul): borda, água e os peixinhos-fantasma nadando (cada um com a própria fase, olhando para onde vai).
    ret(g, 6, 38, 41, 51, 'B')
    ret(g, 6, 38, 6, 51, 'b')
    ret(g, 41, 38, 41, 51, 'D')
    elipse(g, 24, 38, 19, 5.4, 'B')
    elipse(g, 24, 38.5, 17, 4.2, 'W')
    for x, y in ((14, 38), (30, 40), (22, 36)):
        g.pôr(x, y, 's')
    for n in range(3):
        a = ciclo + n * 2.2
        fx = 24 + math.sin(a) * 11
        fy = 38.5 + math.cos(a * 1.3) * 1.2
        olha = 1 if math.cos(a) > 0 else -1
        # Corpo do fantasminha-peixe: bolinha branca, tracinho dos olhos e rabo ondulante.
        ret(g, round(fx) - 2, round(fy) - 1, round(fx) + 2, round(fy) + 1, 'w')
        g.pôr(round(fx) - 1, round(fy) - 2, 'w')
        g.pôr(round(fx) + 1, round(fy) - 2, 'w')
        g.pôr(round(fx) + olha * 1, round(fy) - 1, 'e')
        g.pôr(round(fx) + olha * 2, round(fy) + 1, 'p')
        tx = round(fx) - olha * 3
        g.pôr(tx, round(fy) + (k + n) % 2, 'w')
        g.pôr(tx - olha, round(fy) + 1 - (k + n) % 2, 'w')
    # A vara de bambu presa no poste da direita e a linha com anzol: o anzol afunda, o fantasma morde, sobe, grita e cai.
    grosso(g, 45, 24, 36, 26, 'N', 0.9)
    ponta = (36, 26)
    hy = (36, 38, 39, 38, 32, 27, 33, 39)[k]
    hx = (35, 35, 34, 33, 33, 33, 34, 35)[k]
    lin(g, ponta[0], ponta[1], hx, hy, 'w')
    g.pôr(hx, hy + 1, 'g')
    g.pôr(hx - 1, hy + 2, 'g')
    if 4 <= k <= 6:
        # O fantasma fisgado, pendurado pelo capuz, de olhos arregalados e boca aberta; no alto aparece "BUU".
        gy = hy + 3
        poligono(g, [(hx - 3, gy + 7), (hx - 3, gy + 1), (hx - 2, gy - 2), (hx, gy - 3), (hx + 2, gy - 2), (hx + 3, gy + 1), (hx + 3, gy + 7), (hx + 2, gy + 5), (hx, gy + 7), (hx - 1, gy + 5)], 'w')
        g.pôr(hx - 1, gy, 'e')
        g.pôr(hx + 1, gy, 'e')
        ret(g, hx - 1, gy + 2, hx, gy + 3, 'e')
        if k == 5:
            mini_texto(g, 'BUU', 13, 27, 'y')
    if k == 7:
        # Respingo na água quando o fantasma cai de volta.
        for dx, dy in ((-4, -2), (4, -3), (-2, -5), (2, -6), (0, -8), (6, -1), (-6, -1)):
            g.pôr(hx + dx, 38 + dy, 's')
    return pintar(g.texto(), PESC)


lado('pescaria-fantasmas', [pescaria_fantasmas(k) for k in range(8)], fps=4)


ESQ = {'b': '#f2ecd8', 'B': '#c8bea0', 'e': '#16121c', 'h': '#e8c060', 'H': '#b88a30', 'r': '#ee2f3c', 'R': '#9a1c2c', 'k': '#2a2430', 'w': '#fffaf0', 'j': '#3a6ac0',
       'J': '#284a90', 'n': '#7a4a28', 'N': '#4a2c18', 'y': '#ffd21e', 'g': '#c4c0d0', 'p': '#ff6a8a', 'c': '#fff0c0'}

FALAS = ('ANARIE', 'BALANCE', 'ALAVANTU', 'CAMINHO')


def esqueleto_quadrilha(k):
    """Esqueleto de chapéu de palha e camisa xadrez, o marcador da quadrilha: grita "anarriê", "balancê", "alavantú" no megafone, a mandíbula bate, o joelho dobra
    no ritmo e o outro braço rege com um osso de bandeirinha (8 quadros)."""
    g = Grade(46, 58)
    palavra = FALAS[k // 2]
    bate = k % 2
    bob = (0, 1, 0, 1, 0, 1, 0, 1)[k]
    # Balão de fala com a palavra do quadro (e a pontinha apontando para a caveira).
    largura = len(palavra) * 4 - 1
    ret(g, 3, 0, 42, 9, 'w')
    ret(g, 2, 1, 43, 8, 'w')
    for dy, dx in ((10, 0), (11, 0), (10, 1)):
        g.pôr(22 + dx, dy, 'w')
    mini_texto(g, palavra, 23 - largura // 2, 2, 'k')
    # Pernas: calça jeans com remendo até o joelho, canela de osso e bota; o pé do lado da batida levanta.
    for hx, par in ((19, 0), (27, 1)):
        ret(g, hx - 2, 45 + bob, hx + 2, 49 + bob, 'j')
        ret(g, hx + 1, 45 + bob, hx + 2, 49 + bob, 'J')
        levanta = 1 if bate == par else 0
        ret(g, hx - 1, 50 + bob, hx + 1, 53 - levanta, 'b')
        ret(g, hx - 3, 53 - levanta, hx + 3, 55 - levanta, 'n')
        ret(g, hx - 3, 55 - levanta, hx + 3, 55 - levanta, 'N')
    ret(g, 17, 47 + bob, 18, 48 + bob, 'y')
    # Pélvis e coluna: ossos claros.
    ret(g, 17, 42 + bob, 29, 44 + bob, 'b')
    ret(g, 22, 31 + bob, 24, 42 + bob, 'B')
    # Costelas: arcos que saem da coluna, com a camisa xadrez aberta dos lados (vermelho e escuro) e amarrada na barriga.
    for i, y in enumerate(range(32 + bob, 41 + bob, 2)):
        meia = 7 - (1 if i == 4 else 0)
        ret(g, 23 - meia, y, 23 + meia, y, 'b')
        ret(g, 23 - meia, y + 1, 23 - meia + 1, y + 1, 'B')
        ret(g, 23 + meia - 1, y + 1, 23 + meia, y + 1, 'B')
    for y in range(31 + bob, 43 + bob):
        for x in list(range(11, 16)) + list(range(31, 36)):
            g.pôr(x, y, 'r' if ((x // 2) + (y // 2)) % 2 == 0 else 'R')
    ret(g, 16, 41 + bob, 30, 42 + bob, 'R')
    g.pôr(23, 42 + bob, 'y')
    # Braço esquerdo: segura o megafone (cone vermelho com a boca branca virada para cima) e solta ondas de som.
    grosso(g, 12, 33 + bob, 11, 29 + bob, 'b', 1.0)
    grosso(g, 11, 29 + bob, 9, 26 + bob, 'b', 1.0)
    poligono(g, [(7, 27 + bob), (11, 24 + bob), (8, 17 + bob), (1, 19 + bob)], 'r')
    lin(g, 1, 19 + bob, 8, 17 + bob, 'w')
    lin(g, 2, 20 + bob, 8, 18 + bob, 'w')
    for x, y in ((8, 24), (9, 23)):
        g.pôr(x, y + bob, 'R')
    for n, (wx, wy) in enumerate(((1, 14), (4, 12), (7, 13))):
        if (k + n) % 2 == 0:
            g.pôr(wx, wy + bob, 'g')
            g.pôr(wx + 1, wy - 1 + bob, 'g')
            g.pôr(wx + 2, wy + bob, 'g')
    # Braço direito: rege com um osso de bandeirinha que balança.
    ponta = (39 + (1 if bate else -1), 22 + 2 * bate)
    grosso(g, 34, 33 + bob, 36, 30 + bob, 'b', 1.0)
    grosso(g, 36, 30 + bob, ponta[0], ponta[1] + 6, 'b', 0.8)
    lin(g, ponta[0], ponta[1] + 6, ponta[0], ponta[1] + 1, 'B')
    for dy in range(3):
        for dx in range(3 - dy):
            g.pôr(ponta[0] + 1 + dx, ponta[1] + dy, 'r' if dy % 2 == 0 else 'y')
    # Caveira: crânio, órbitas, nariz, dentes e a mandíbula que desce quando grita (ela bate no ritmo).
    elipse(g, 23, 22 + bob, 7.2, 6.4, 'b')
    ret(g, 17, 25 + bob, 29, 27 + bob, 'b')
    for x in (18, 19, 26, 27):
        ret(g, x, 20 + bob, x + 1, 22 + bob, 'e')
    for x, y in ((18, 20), (26, 20)):
        g.pôr(x, y + bob, 'e')
    g.pôr(23, 24 + bob, 'e')
    g.pôr(22, 25 + bob, 'e')
    g.pôr(24, 25 + bob, 'e')
    ret(g, 18, 27 + bob, 28, 27 + bob, 'e')
    for x in range(18, 29, 2):
        g.pôr(x, 27 + bob, 'w')
    abre = 1 + bate
    ret(g, 18, 28 + bob, 28, 28 + bob + abre, 'e')
    ret(g, 19, 28 + bob + abre, 27, 29 + bob + abre, 'b')
    for x in range(19, 28, 2):
        g.pôr(x, 28 + bob + abre, 'w')
    # Chapéu de palha: copa, faixa de chita e aba larga caída de um lado.
    elipse(g, 23, 14 + bob, 6.2, 3.4, 'h')
    ret(g, 17, 15 + bob, 29, 16 + bob, 'r')
    elipse(g, 23, 17 + bob, 12.2, 2.6, 'h')
    for x in range(12, 36, 3):
        g.pôr(x, 18 + bob, 'H')
    ret(g, 18, 14 + bob, 22, 14 + bob, 'c')
    cortar_linhas(g, 47, 49)
    cortar_linhas(g, 35, 37)
    return pintar(g.texto(), ESQ)


lado('esqueleto-quadrilha', [esqueleto_quadrilha(k) for k in range(8)], fps=3)
