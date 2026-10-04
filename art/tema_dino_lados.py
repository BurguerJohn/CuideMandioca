"""Cenários do tema dinossauros, bem criativos: o T-Rex do Forró (sanfoneiro de chapéu de palha), o Ovo da Quadrilha (choca um bebê dançarino), o Vulcão de
Pipoca (entra em erupção de milho estourado) e o Brontossauro do Varal (poste vivo das bandeirinhas)."""

import math

from itens_novos import Grade, elipse, pintar
from tema_comum import ret, lin, grosso, triangulo, poligono, mini_texto
from tema_dino import lado

REX = {'g': '#4cae4a', 'G': '#8ee06a', 'd': '#2f7a38', 's': '#256a30', 'c': '#f4e8b0', 'C': '#d8c888', 'h': '#ffd060', 'H': '#e8a838', 'r': '#ee2f3c', 'R': '#a81830',
       'a': '#d8303c', 'A': '#8a1c28', 'k': '#2a2430', 'w': '#fffaf0', 'p': '#ff6a8a', 'n': '#2a2430', 'y': '#ffe27a'}


def rex_sanfoneiro(k):
    """T-Rex verde de chapéu de palha tocando sanfona: os bracinhos mal alcançam, mas a barriga balança no ritmo, o pé bate no chão, a cauda abana, a boca
    canta e as notas sobem (8 quadros)."""
    g = Grade(48, 48)
    bob = (0, 1, 2, 1, 0, 1, 2, 1)[k]
    fole = (3, 4, 5, 6, 6, 5, 4, 3)[k]
    tap = k in (2, 3, 6, 7)
    # Cauda: do quadril para trás, abanando.
    ponta = (0, 1, 2, 1, 0, -1, -2, -1)[k]
    for i in range(14):
        x = 11 - i * 0.78
        y = 27 + i * 0.5 + math.sin(i * 0.35) * 0 + ponta * (i / 14) * 1.6
        grosso(g, x, y, x - 1.0, y + 0.3, 'g', 3.4 - i * 0.22)
    # Corpo: barriga redonda com a frente mais clara.
    elipse(g, 21, 28, 11.5, 9.5, 'g')
    for y in range(g.h):
        for x in range(g.w):
            if g.ler(x, y) == 'g':
                if ((x - 25) / 7.5) ** 2 + ((y - 32) / 6.5) ** 2 <= 1.0:
                    g.pôr(x, y, 'c' if y < 35 else 'C')
                elif y >= 33 and x < 25:
                    g.pôr(x, y, 'd')
    for x, y in ((13, 24), (17, 21), (21, 20), (15, 28), (11, 29)):
        elipse(g, x, y, 1.5, 1.2, 'd')
    # Pernas grossas e pés de três dedos (o da frente bate no chão).
    for cx, levanta in ((18, 0), (27, 1 if tap else 0)):
        grosso(g, cx, 34, cx, 41 - levanta, 'g', 3.0)
        elipse(g, cx + 2, 43 - levanta, 5.2, 2.4, 'g')
        for dx in (-1, 2, 5):
            g.pôr(cx + dx, 45 - levanta, 'w')
            g.pôr(cx + dx + 1, 45 - levanta, 'w')
        for y in range(36, 42):
            g.pôr(cx - 2, y - levanta, 'd')
    # Pescoço e cabeça: grandona, com a boca aberta cantando (a mandíbula de baixo desce e mostra a língua).
    hy = 12 + bob
    grosso(g, 29, 22, 33, hy + 6, 'g', 4.6)
    elipse(g, 35, hy, 8.5, 7.0, 'g')
    boca = (2, 3, 4, 3, 2, 3, 4, 3)[k]
    elipse(g, 41, hy + 0.5, 6.5, 3.2, 'g')
    ret(g, 36, hy + 3, 47, hy + 3 + boca, 'k')
    elipse(g, 41, hy + 4 + boca, 6.0, 2.2, 'g')
    ret(g, 36, hy + 4 + boca, 47, hy + 5 + boca, 'g')
    for x in range(37, 47):
        if (x + k) % 2 == 0:
            g.pôr(x, hy + 3, 'w')
        if (x + k) % 2 == 1:
            g.pôr(x, hy + 2 + boca, 'w')
    for x in range(39, 45):
        g.pôr(x, hy + 1 + boca, 'p')
    # Olho feliz (um arco), bochecha e narina.
    for x, dy in ((31, 1), (32, 0), (33, 0), (34, 1)):
        g.pôr(x, hy - 2 + dy, 'k')
    ret(g, 36, hy + 1, 37, hy + 2, 'p')
    g.pôr(45, hy - 1, 'd')
    g.pôr(44, hy - 1, 'd')
    # O chapéu de palha de lado, balançando com a cabeça.
    elipse(g, 34, hy - 5.5, 9.5, 2.2, 'h')
    elipse(g, 34, hy - 7.5, 5.2, 3.0, 'h')
    for x in range(29, 40):
        g.pôr(x, hy - 5, 'r')
    for x in range(26, 43):
        g.pôr(x, hy - 4, 'H')
    # A sanfona no peito: duas caixas vermelhas com teclas e o fole (que abre e fecha) no meio.
    x0 = 27
    ret(g, x0, 28, x0 + 3, 36, 'a')
    ret(g, x0 + 3 + fole, 28, x0 + 6 + fole, 36, 'a')
    for y in (29, 31, 33, 35):
        g.pôr(x0 + 1, y, 'w')
        g.pôr(x0 + 4 + fole, y, 'w')
    for i in range(fole):
        for y in range(29, 36):
            g.pôr(x0 + 4 + i, y, 'k' if (i + k) % 2 == 0 else 'y')
    ret(g, x0, 28, x0 + 6 + fole, 28, 'A')
    ret(g, x0, 37, x0 + 6 + fole, 37, 'A')
    # Os bracinhos de cada lado da sanfona.
    lin(g, 27, 27, 28, 30 + bob // 2, 'g')
    lin(g, 28, 27, 29, 31 + bob // 2, 'd')
    lin(g, 33 + fole, 28, 34 + fole, 31, 'g')
    # As notas douradas saem da boca e sobem para a direita, uma atrás da outra.
    for n in range(2):
        passo = (k + n * 4) % 8
        x = 40 + passo
        y = hy - 1 - passo * 2 + (2 if passo % 2 else 0)
        if y >= 0 and x < 47:
            for dy, linha in enumerate(('.yy', '.y.', '.y.', 'yy.', 'yy.')):
                for dx, letra in enumerate(linha):
                    if letra == 'y' and 0 <= y + dy and x + dx - 1 < 48:
                        g.pôr(x + dx - 1, y + dy, 'y')
    return pintar(g.texto(), REX)


lado('rex-sanfoneiro', [rex_sanfoneiro(k) for k in range(8)], fps=5)


OVO = {'e': '#f4ecc8', 'E': '#ffffff', 'd': '#cdbf94', 'g': '#5fb04a', 'k': '#2a2018', 'b': '#7ad060', 'B': '#4a9a3a', 'y': '#ffe27a', 'r': '#e8603a', 'p': '#c8a050',
       'P': '#e8c878', 'o': '#8a6428', 'f': '#ee2f3c', 'F': '#ffd21e', 'u': '#3a78d8', 'v': '#35a03a', 'w': '#ffffff', 'q': '#ff6a8a'}


def ovo_quadrilha(k):
    """Ovo gigante no ninho de palha, com as bandeirinhas penduradas atrás: balança, trinca, a casca de cima sobe e um bebê de chapéu de casca aparece, acena com
    uma bandeirinha, dança e se esconde de novo (8 quadros)."""
    g = Grade(44, 52)
    # As bandeirinhas atrás do ovo, num varal em curva.
    for x in range(1, 43):
        y = 3 + round(((x - 22) / 21) ** 2 * 4)
        g.pôr(x, y, 'k')
    for n, x in enumerate((3, 9, 15, 29, 35, 41)):
        y = 3 + round(((x - 22) / 21) ** 2 * 4)
        cor = 'fFuvqf'[n]
        for dy in range(4):
            for dx in range(-(3 - dy) // 2, (3 - dy) // 2 + 1):
                g.pôr(x + dx, y + 1 + dy, cor)
    # O ninho de palha embaixo.
    for x in range(44):
        t = (x - 21.5) / 21.5
        topo = 42 + round(6 * t * t)
        for y in range(topo, 52):
            g.pôr(x, y, 'p' if (x * 3 + y) % 4 else 'P' if (x + y * 2) % 5 else 'o')
    for x, y in ((2, 43), (5, 41), (38, 41), (41, 43), (10, 40), (33, 40), (14, 39), (29, 39)):
        lin(g, x, y, x + 2, y - 2, 'P')
    # Quanto cada parte se mexe neste quadro.
    balanco = (0, -1, 1, 0, 0, 0, 0, 0)[k]
    sobe = (0, 0, 0, 0, 4, 13, 13, 5)[k]
    bebe = (0, 0, 0, 0, 1, 2, 2, 1)[k]
    cx = 22 + balanco
    # O bebê (aparece quando a casca de cima sobe), atrás das cascas.
    if k >= 4:
        hy = (24, 18, 19, 25)[k - 4]
        elipse(g, cx, hy + 8, 6.5, 5.5, 'b')
        elipse(g, cx, hy, 6.0, 5.2, 'b')
        for x in (cx - 2.5, cx + 2.5):
            elipse(g, x, hy - 0.5, 2.0, 2.2, 'E')
            g.pôr(round(x) + (1 if k == 6 else 0), round(hy), 'k')
        ret(g, round(cx) - 1, round(hy) + 3, round(cx) + 1, round(hy) + 4 - (1 if k == 6 else 0), 'k')
        g.pôr(round(cx), round(hy) + 4, 'q')
        for x, y in ((cx - 4, hy + 2), (cx + 4, hy + 2)):
            g.pôr(round(x), round(y), 'q')
        # O chapéu de casca de ovo na cabeça, de banda.
        elipse(g, cx - 1 + (1 if k == 6 else 0), hy - 5, 4.5, 2.4, 'e')
        for x, y in ((cx - 2, hy - 6), (cx, hy - 5), (cx + 1, hy - 6)):
            g.pôr(round(x), round(y), 'd')
        # Nos quadros 5 e 6 a mãozinha segura uma bandeirinha que acena.
        if k in (5, 6):
            hx = cx + 7
            lin(g, hx - 2, hy + 5, hx, hy - 1, 'b')
            lin(g, hx, hy - 1, hx, hy - 9, 'o')
            ondula = 1 if k == 6 else 0
            for dy in range(4):
                for dx in range(4 - dy):
                    g.pôr(hx + 1 + dx, hy - 9 + dy + ondula * (dx // 2), 'f' if dy % 2 == 0 else 'F')
            lin(g, cx - 7, hy + 5, cx - 9, hy - 1 - (3 if k == 6 else 0), 'b')
    # As duas cascas do ovo: a de baixo fica, a de cima sobe (corte em zigue-zague).
    def casca(parte):
        for y in range(14, 46):
            for x in range(44):
                dentro = ((x - cx) / 12.5) ** 2 + ((y - 30) / 15.5) ** 2 <= 1.0
                if not dentro:
                    continue
                corte = 30 + (1 if (x // 2) % 2 else 0)
                if (parte == 'cima') != (y < corte):
                    continue
                yy = y - (sobe if parte == 'cima' else 0)
                letra = 'e'
                if any((x - sx) ** 2 + (y - sy) ** 2 <= sr * sr for sx, sy, sr in ((cx - 5, 21, 2.0), (cx + 5, 25, 1.7), (cx - 4, 37, 2.3), (cx + 6, 39, 1.5), (cx + 1, 17, 1.3))):
                    letra = 'g'
                elif x >= cx + 8:
                    letra = 'd'
                elif x <= cx - 8 and y < 28:
                    letra = 'E'
                g.pôr(x, yy, letra)
    casca('baixo')
    casca('cima')
    # Trincas no ovo (a de cima aparece no quadro 3 e cresce) e os tracinhos do balanço.
    if k >= 3:
        for x, y in ((cx + 2, 18), (cx + 1, 20), (cx + 3, 22), (cx + 2, 24), (cx + 4, 26), (cx + 3, 28)):
            g.pôr(round(x), y - sobe, 'k')
    if balanco:
        for dy in (20, 26, 32):
            g.pôr(cx - balanco * 14, dy, 'd')
            g.pôr(cx - balanco * 15, dy, 'd')
    # Confete no ar quando o bebê dança.
    if k in (5, 6):
        for n, (dx, dy) in enumerate(((-12, 8), (13, 6), (-9, 2), (10, -1), (0, -3))):
            g.pôr(cx + dx + (k - 5), 14 + dy - (k - 5) * 2, 'fFuvq'[n])
    return pintar(g.texto(), OVO)


lado('ovo-quadrilha', [ovo_quadrilha(k) for k in range(8)], fps=3)


VUL = {'r': '#8a7468', 'R': '#5a4a44', 'q': '#6e5c54', 'D': '#3a2c28', 'o': '#e8862a', 'O': '#ffd060', 'L': '#ffb040', 'w': '#fffaf0', 'y': '#ffe27a', 'f': '#f0eae0',
       'F': '#c8c0b4', 'k': '#2a2430', 'n': '#8a5a2a', 'm': '#c89a5a'}


def vulcao_pipoca(k):
    """Vulcão de bolso em erupção de pipoca: a cratera borbulha caramelo, estoura pipocas que sobem em arco e caem, a fumaça de milho se desfaz e escorrem fios
    de caramelo pelas encostas (8 quadros)."""
    g = Grade(46, 52)
    # O cone de rocha, com a cratera achatada em cima.
    for y in range(20, 52):
        meia = 6 + round((y - 20) * 0.62)
        for x in range(23 - meia, 23 + meia + 1):
            borda = x - (23 - meia)
            sorte = (x * 37 + y * 91 + x * y * 7) % 11
            g.pôr(x, y, 'r' if borda < 3 or sorte == 0 else 'R' if x > 23 + meia - 5 or sorte == 1 else 'q')
    for x, y in ((14, 36), (15, 37), (30, 32), (31, 33), (23, 42), (24, 43), (18, 46), (34, 44), (10, 48)):
        g.pôr(x, y, 'D')
    # A placa de madeira no pé do vulcão.
    ret(g, 9, 44, 36, 51, 'n')
    ret(g, 9, 44, 36, 44, 'm')
    ret(g, 22, 40, 23, 44, 'n')
    mini_texto(g, 'PIPOCA', 11, 46, 'w')
    # A cratera: boca cheia de caramelo que borbulha (o brilho muda de quadro).
    ret(g, 17, 18, 29, 21, 'o')
    ret(g, 18, 17, 28, 18, 'L' if k % 2 else 'O')
    for x, y in ((19, 19), (23, 18), (26, 19)):
        if (x + k) % 3 == 0:
            g.pôr(x, y - 1, 'O')
    # Fios de caramelo escorrendo pelas duas encostas.
    for lado_, base in ((-1, 0), (1, 0)):
        x0 = 23 + lado_ * 8
        for i, y in enumerate(range(21, 40)):
            x = x0 + lado_ * (y - 21) // 3 + round(math.sin(y * 0.5 + k * 0.4 * lado_) * 0.8)
            g.pôr(x, y, 'o')
            g.pôr(x + lado_, y, 'L' if (y + k) % 4 < 2 else 'o')
    # Fumaça de milho: bolas claras que sobem e crescem.
    for j in range(3):
        fase = (k / 8 + j / 3) % 1
        y = 14 - fase * 14
        x = 23 + math.sin(fase * 4 + j * 2) * 5 + (j - 1) * 4
        r = 1.8 + fase * 2.6
        elipse(g, x, y, r, r * 0.85, 'f' if fase < 0.5 else 'F')
    # As pipocas: seis estouram em arco, cada uma numa fase diferente.
    for n, (vx, vy, fase) in enumerate(((-0.55, 3.7, 0.0), (0.5, 3.4, 0.17), (-0.2, 4.1, 0.33), (0.75, 3.1, 0.5), (-0.8, 3.0, 0.67), (0.15, 3.8, 0.83))):
        t = ((k / 8) + fase) % 1 * 16
        x = 23 + vx * t * 1.6
        y = 19 - (vy * t - 0.2 * t * t)
        if 1 <= y <= 30:
            xi, yi = round(x), round(y)
            for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (-1, 1), (1, 1), (0, 1)):
                g.pôr(xi + dx, yi + dy, 'w')
            g.pôr(xi, yi, 'y')
            g.pôr(xi + 1, yi + 1, 'y' if n % 2 else 'w')
    return pintar(g.texto(), VUL)


lado('vulcao-pipoca', [vulcao_pipoca(k) for k in range(8)], fps=5)


BRO = {'u': '#5aa8c8', 'U': '#8acce8', 'd': '#3a7898', 's': '#2a5878', 'c': '#d8ecf4', 'k': '#2a2430', 'w': '#fffaf0', 'p': '#ff8aa8', 'h': '#ffd060', 'H': '#e8a838',
       'r': '#ee2f3c', 'f': '#ee2f3c', 'F': '#ffd21e', 'b': '#3a78d8', 'v': '#35a03a', 'q': '#ff4f9e', 'l': '#9ad048', 'y': '#fff07a', 'n': '#5a3a1a'}


def bronto_varal(k):
    """Brontossauro azul de pescoço comprido que serve de poste do varal: a bandeirinha vai da chapeuzinho dele até a ponta da cauda, tremulando no vento, e
    as lâmpadas do pescoço piscam enquanto ele mastiga uma folha (8 quadros)."""
    g = Grade(48, 52)
    bob = (0, 1, 1, 0, 0, -1, -1, 0)[k]
    # Cauda abanando.
    ponta = (0, 1, 2, 1, 0, -1, -2, -1)[k]
    for i in range(16):
        x = 12 - i * 0.7
        y = 42 + i * 0.25 + ponta * (i / 16) * 1.5
        grosso(g, x, y, x - 0.7, y + 0.2, 'u', 3.6 - i * 0.18)
    # Corpo e as quatro pernas.
    elipse(g, 19, 41, 13, 8, 'u')
    for y in range(g.h):
        for x in range(g.w):
            if g.ler(x, y) == 'u':
                if y >= 43:
                    g.pôr(x, y, 'U' if ((x - 22) / 9) ** 2 + ((y - 45) / 4) ** 2 <= 1 else 'd')
                elif (x * 7 + y * 3) % 13 == 0:
                    g.pôr(x, y, 'd')
    for cx in (9, 15, 24, 30):
        ret(g, cx - 2, 44, cx + 1, 51, 'u')
        ret(g, cx + 1, 44, cx + 1, 51, 'd')
        ret(g, cx - 3, 51, cx + 2, 51, 's')
    # O pescoço: uma curva comprida do ombro até a cabeça lá em cima.
    pontos = []
    for i in range(0, 25):
        t = i / 24
        x = 27 + 9 * t - 6 * t * (1 - t) * 2 + math.sin(t * 3 + k * 0.4) * 0.8
        y = 38 - 30 * t + bob * t
        pontos.append((x, y))
        grosso(g, x, y, x, y + 1, 'u', 3.8 - 1.6 * t)
    hx, hy = pontos[-1]
    hx, hy = round(hx), round(hy)
    # A cabeça pequena com um chapeuzinho, olho que pisca e a boca mastigando a folha.
    elipse(g, hx + 2, hy + 1, 5.2, 3.4, 'u')
    ret(g, hx - 1, hy - 1, hx + 1, hy, 'u')
    olho_aberto = k not in (3,)
    if olho_aberto:
        g.pôr(hx + 1, hy, 'w')
        g.pôr(hx + 2, hy, 'k')
    else:
        ret(g, hx + 1, hy, hx + 3, hy, 'k')
    boca = 1 if k % 2 == 0 else 0
    ret(g, hx + 3, hy + 3 + boca, hx + 7, hy + 3 + boca, 'k')
    lin(g, hx + 6, hy + 3, hx + 10, hy + 2 - (k % 3), 'l')
    g.pôr(hx + 3, hy + 2, 'p')
    elipse(g, hx + 1, hy - 3, 3.2, 1.4, 'h')
    ret(g, hx - 1, hy - 5, hx + 3, hy - 4, 'h')
    ret(g, hx - 1, hy - 4, hx + 3, hy - 4, 'r')
    # A bandeirinha: do chapeuzinho até a ponta da cauda, numa curva, com as bandeiras balançando em ondas.
    ax, ay = hx, hy - 6
    bx, by = 2, 40 + ponta
    pts = []
    for i in range(0, 41):
        t = i / 40
        x = ax + (bx - ax) * t
        y = ay + (by - ay) * t + math.sin(t * math.pi) * 9
        pts.append((x, y))
        g.pôr(round(x), round(y), 'k')
    for n in range(1, 8):
        x, y = pts[n * 5]
        ondula = round(math.sin(k * 0.8 + n * 1.1))
        cor = 'fFbvqf'[n % 6]
        for dy in range(5):
            for dx in range(-(4 - dy) // 2, (4 - dy) // 2 + 1):
                g.pôr(round(x) + dx + ondula, round(y) + 1 + dy, cor)
    # As lâmpadas do pescoço, piscando em turnos.
    for n in range(5):
        x, y = pontos[4 + n * 4]
        if (n + k) % 3 != 0:
            g.pôr(round(x) + 3, round(y), 'y')
            g.pôr(round(x) + 3, round(y) - 1, 'F')
    return pintar(g.texto(), BRO)


lado('bronto-varal', [bronto_varal(k) for k in range(8)], fps=4)
