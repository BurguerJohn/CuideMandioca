"""Páginas 6 a 10 do Cordel da Mandioca, quando a história sai do trilho: a lua de queijo, o coelho DJ, o submarino de abóbora, a cidade de
cocada e o dragão de feijão."""

import math
import random

from livro_base import W, H, pagina, degrade, elipse, disco, anel, ruido, nuvem, colinas, chao, brilho, mix, chama, estrelas, lua, balao, passaro, \
    coracao, poligono, estrela5, grade, fumaca, sombra, gotas, bandeirinhas


# --- Página 6: a lua de queijo ---------------------------------------------------------------------------------------------------------
def terra(t, cx, cy, r, k=0):
    """O planeta Terra visto de longe: oceano, continentes e nuvens que passam (o quadro `k` gira as nuvens)."""
    disco(t, cx, cy, r, '#3a78d8', '#2a4a9a', '#5a9af0')
    for dx, dy, rx, ry in ((-4, -3, 6, 4), (5, 4, 5, 3), (-1, 8, 4, 2)):
        elipse(t, cx + dx, cy + dy, rx, ry, '#4aa84a', '#2e7a34')
    for i in range(3):
        x = cx + ((i * 9 + k * 3) % (2 * r)) - r
        if (x - cx) ** 2 < r * r - 25:
            t.rect(x - 3, cy - 7 + i * 6, x + 3, cy - 6 + i * 6, '#ffffff')


@pagina(6, heroi=(62, 101, 3, 'danca'), ponto=(132, 74, 52, 26), elenco=[('sopinha', 176, 100, False)])
class P06:
    @staticmethod
    def fundo(t):
        degrade(t, 0, H - 1, ['#05030f', '#0e0a28', '#1c1448', '#2a1c5a'])
        estrelas(t, 90, 7, 0, 84)
        # a superfície da lua: um arco enorme de queijo coalho cheio de buracos
        elipse(t, 112, 196, 200, 112, '#f4d870', '#d8b440')
        for y in range(84, H):
            for x in range(W):
                if ((x - 112) / 200) ** 2 + ((y - 196) / 112) ** 2 <= 1 and ((x * 3 + y * 5) % 17 == 0):
                    t.put(x, y, '#fbe99a')
        for cx, cy, rx, ry in ((30, 98, 9, 3), (96, 106, 8, 3), (206, 96, 10, 4), (164, 108, 7, 2), (116, 92, 6, 2)):
            elipse(t, cx, cy, rx, ry, '#a8801c', '#7a5a10')
            elipse(t, cx, cy + 1, rx - 2, ry - 1, '#5a3e0c')

    @staticmethod
    def animar(t, k, r):
        estrelas(t, 16, 71, 0, 70, k=k, cores=('#ffffff', '#bcd0ff'))
        terra(t, 36, 34, 16, k)
        # um balão murcho pousado e fumegando, e uma estrela cadente
        poligono(t, [(196, 88), (212, 96), (200, 100), (190, 96)], '#e8403c')
        poligono(t, [(200, 90), (208, 97), (200, 100)], '#ffd23a')
        fumaca(t, 200, 86, k, 2, '#f0f0f8', 4)
        f = (k + 1) / 4
        t.line(150 - f * 30, 18 + f * 10, 160 - f * 30, 22 + f * 10, '#ffffff')
        # o buraco do meio: quem mora nele? Orelhas de coelho na reação, um bichinho curioso no laço
        cx, cy = 156, 90
        elipse(t, cx, cy, 14, 5, '#a8801c', '#7a5a10')
        elipse(t, cx, cy + 1, 11, 4, '#4a3208')
        if r is None:
            if k in (1, 2):
                disco(t, cx - 3, cy - 2 - (k % 2), 2, '#e8e0d0')
                t.put(cx - 4, cy - 3, '#10100c')
                t.put(cx - 2, cy - 3, '#10100c')
        else:
            sobe = (2, 5, 8, 6)[r]
            for dx in (-5, 3):
                t.rect(cx + dx, cy - sobe - 6, cx + dx + 2, cy - 1, '#f4f0e8')
                t.rect(cx + dx + 1, cy - sobe - 4, cx + dx + 1, cy - 1, '#ffb0c8')
            elipse(t, cx, cy - 1, 6, 4, '#f4f0e8')
            t.put(cx - 2, cy - 2, '#10100c')
            t.put(cx + 2, cy - 2, '#10100c')
            for i in range(3):
                brilho(t, cx - 12 + i * 12, cy - 12 - ((r + i) % 3) * 3, '#fff6b8')
        # cubinhos de queijo flutuando em gravidade zero
        for i, (x, y) in enumerate(((88, 70), (190, 60), (120, 56))):
            yy = y + round(math.sin(k * 1.57 + i * 2) * 2)
            t.rect(x, yy, x + 4, yy + 3, '#ffe27a')
            t.rect(x, yy, x + 4, yy, '#fff4b0')
            t.put(x + 2, yy + 2, '#d8b440')


# --- Página 7: o coelho DJ ---------------------------------------------------------------------------------------------------------------
PALETAS_DJ = (
    ('#ff3a9a', '#3ab8ff', '#ffd21e', '#9aff3a'),
    ('#3aff9a', '#ff8a1c', '#b04aff', '#3ae8ff'),
    ('#ff4a3a', '#ffd21e', '#4aff6a', '#ff4adc'),
    ('#9a4aff', '#ff3a9a', '#3ab8ff', '#ffe27a'),
)


@pagina(7, heroi=(70, 102, 3, 'danca'), ponto=(138, 62, 66, 28), elenco=[('sopinha', 176, 70, False)])
class P07:
    @staticmethod
    def fundo(t):
        degrade(t, 0, H - 1, ['#0a0418', '#1a0a38', '#2a1458'])
        estrelas(t, 60, 8, 0, 50)
        # piso da pista (ladrilhos se repetem; as cores entram no quadro)
        t.rect(0, 88, W - 1, H - 1, '#18082e')
        # caixas de som empilhadas dos dois lados
        for x in (4, 190):
            t.rect(x, 52, x + 28, 100, '#1c1c2c')
            t.rect(x, 52, x + 28, 54, '#3a3a52')
            t.rect(x + 28, 52, x + 28, 100, '#0e0e18')
        # a picape: mesa com dois toca-discos
        t.rect(130, 76, 206, 96, '#2a2a44')
        t.rect(130, 76, 206, 78, '#5a5a7a')
        t.rect(130, 94, 206, 96, '#14142a')

    @staticmethod
    def animar(t, k, r):
        pal = PALETAS_DJ[k % 4] if r is None else PALETAS_DJ[(r + 1) % 4]
        # ladrilhos da pista que acendem
        for i in range(14):
            for j in range(3):
                x0 = 4 + i * 16
                y0 = 90 + j * 7
                cor = pal[(i + j + (k if r is None else r)) % 4]
                t.rect(x0, y0, x0 + 14, y0 + 5, cor)
                t.rect(x0, y0, x0 + 14, y0, mix(cor, '#ffffff', 0.35))
                t.rect(x0, y0 + 5, x0 + 14, y0 + 5, mix(cor, '#000000', 0.4))
        # a bola de espelhos, girando
        t.line(112, 0, 112, 20, '#8a8aa0')
        disco(t, 112, 26, 11, '#9a9ab8', '#5a5a78', '#e8e8ff')
        for dy in range(-10, 11, 4):
            for dx in range(-10, 11, 4):
                if dx * dx + dy * dy <= 100 and ((dx // 4 + dy // 4 + k) % 3 == 0):
                    t.put(112 + dx, 26 + dy, '#ffffff')
        # raios laser saindo da bola
        for i in range(8):
            ang = math.radians(20 + i * 18 + (k * 6 if r is None else r * 10))
            cor = pal[i % 4]
            for d in range(14, 90):
                x = 112 + math.cos(ang) * d
                y = 26 + math.sin(ang) * d
                if 0 <= y < 90 and d % 3:
                    t.put(round(x), round(y), cor)
        # caixas de som que pulsam
        for x in (4, 190):
            esc = 1 + (k % 2)
            disco(t, x + 14, 66, 6 + esc, '#3a3a52', '#14142a', '#6a6a8a')
            disco(t, x + 14, 66, 3, '#14142a')
            disco(t, x + 14, 88, 4 + esc, '#3a3a52', '#14142a', '#6a6a8a')
        # os toca-discos girando
        for cx in (150, 190):
            disco(t, cx, 86, 9, '#0a0a14', '#000000', '#2a2a3a')
            disco(t, cx, 86, 3, pal[1])
            ang = (k if r is None else r) * math.pi / 2
            t.line(cx, 86, cx + math.cos(ang) * 8, 86 + math.sin(ang) * 8, '#ffffff')
        if r is not None:
            for i in range(4):
                x = 140 + i * 16
                t.put(x, 52 - ((r + i) % 4) * 4, pal[i])
                t.rect(x, 54 - ((r + i) % 4) * 4, x + 2, 56 - ((r + i) % 4) * 4, pal[i])
                t.line(x + 2, 54 - ((r + i) % 4) * 4, x + 2, 48 - ((r + i) % 4) * 4, pal[i])


# --- Página 8: o submarino de abóbora ------------------------------------------------------------------------------------------------------
@pagina(8, heroi=(52, 102, 3, 'danca'), ponto=(122, 24, 36, 40), elenco=[('cachorro', 190, 104, True)])
class P08:
    @staticmethod
    def fundo(t):
        degrade(t, 0, H - 1, ['#2a9ad8', '#1a78c0', '#10529a', '#0a3070', '#061e50'])
        chao(t, 98, '#c8b078', '#a89058', '#e0c890', 17)
        for cx, cor in ((24, '#e8506a'), (86, '#ff9a3a'), (208, '#b86af0')):
            for i in range(5):
                t.line(cx + i * 3 - 6, 100, cx + i * 3 - 8 + i, 84 - (i % 3) * 4, cor)
        for x in (10, 40, 170, 200):
            t.rect(x, 96, x + 3, 98, '#d8486a')

    @staticmethod
    def animar(t, k, r):
        # raios de luz vindos da superfície
        for i in range(5):
            x0 = 20 + i * 44 + (k % 2) * 2
            for y in range(0, 90):
                x = x0 + y // 3
                t.put(x, y, mix(t.px[x, y][:3] if 0 <= x < W else '#2a9ad8', '#aee8ff', 0.18) if 0 <= x < W else '#2a9ad8')
        # algas balançando
        for x in (6, 70, 100, 182, 214):
            for y in range(98, 70, -1):
                bal = round(math.sin((y * 0.25) + k * 1.57 + x) * 2.5)
                t.put(x + bal, y, '#3ab86a')
                t.put(x + bal + 1, y, '#2a8a50')
        # o submarino: uma abóbora gigante com hélice e periscópio
        cx, cy = 140, 74
        elipse(t, cx, cy, 25, 15, '#ff8a1c', '#c85a0c', '#ffb85a')
        for dx in (-14, -7, 0, 7, 14):
            t.line(cx + dx, cy - 14 + abs(dx) // 6, cx + dx - dx // 6, cy + 14 - abs(dx) // 6, '#c85a0c')
        t.rect(cx - 2, cy - 18, cx + 2, cy - 14, '#4a8a2a')
        t.line(cx, cy - 18, cx + 4, cy - 22, '#4a8a2a')
        disco(t, cx - 8, cy, 5, '#7ad8ff', '#3a90c0', '#c8f4ff')
        anel(t, cx - 8, cy, 6, '#8a5a30', 2)
        # periscópio no alto, com a lente brilhando
        t.rect(cx + 8, 28, cx + 11, cy - 12, '#7a7a8a')
        t.rect(cx + 8, 28, cx + 14, 31, '#7a7a8a')
        t.rect(cx + 12, 31, cx + 14, 34, '#7ad8ff')
        # hélice atrás, girando
        hx = cx + 27
        for i in range(2):
            ang = (k * math.pi / 2) + i * math.pi
            t.line(hx, cy, hx + math.cos(ang) * 2, cy + math.sin(ang) * 8, '#c8c8d8')
        # bolhas subindo do submarino e da Mandioca
        for i in range(5):
            f = ((k + i) % 4) / 4
            anel(t, cx + 28 + i * 3, round(cy - 4 - f * 40), 1 + (i % 2), '#d8f4ff', 1)
        # a bolha de ar em volta da Mandioca (ela respira lá dentro)
        anel(t, 52, 82, 24, '#aee8ff', 1)
        t.put(40, 70, '#ffffff')
        t.put(41, 71, '#ffffff')
        # cardume de peixinhos que passam
        for i in range(6):
            x = (190 - i * 12 + k * 4) % 240 - 8
            y = 24 + (i % 3) * 8 + round(math.sin(k + i))
            poligono(t, [(x, y), (x + 5, y - 2), (x + 5, y + 2)], ['#ffd23a', '#ff9a3a', '#ff5a8a'][i % 3])
            poligono(t, [(x + 5, y), (x + 8, y - 2), (x + 8, y + 2)], '#ffd23a')
        # sonar: ondas que se alargam
        if r is not None:
            for j in range(3):
                raio = 6 + (r * 3 + j * 8) % 26
                anel(t, cx + 13, 33, raio, '#9affc8', 1)
            for i in range(5):
                brilho(t, cx + 13 + round(math.cos(i * 1.3 + r) * 28), 33 + round(math.sin(i * 1.3 + r) * 20), '#ffffff')
            # o peixe-lanterna que o sonar acha
            px, py = 186, 56
            elipse(t, px, py, 6, 4, '#6a3a8a', '#3a1a5a')
            t.line(px - 4, py - 4, px - 7, py - 9, '#6a3a8a')
            disco(t, px - 7, py - 10, 2, '#fff6b8')
            t.put(px + 2, py - 1, '#ffffff')


# --- Página 9: a cidade de cocada ---------------------------------------------------------------------------------------------------------
@pagina(9, heroi=(60, 103, 3, 'danca'), ponto=(150, 12, 34, 72), elenco=[('cocada', 28, 103, False), ('pacoca', 202, 104, True)])
class P09:
    @staticmethod
    def fundo(t):
        degrade(t, 0, 80, ['#ffb8e0', '#ffd0ec', '#ffe8f4', '#c8f0ff'])
        # prédios de doce: cocada (branca com cobertura), paçoca (farelenta) e brigadeiro (marrom com granulado)
        for x, w, h, cor, topo in ((6, 26, 44, '#fff8f0', '#e8c890'), (40, 22, 56, '#d8a868', '#a87a3c'), (68, 28, 38, '#5a3426', '#8a5a40'),
                                    (120, 24, 48, '#fff8f0', '#e8c890'), (196, 26, 52, '#d8a868', '#a87a3c')):
            t.rect(x, 86 - h, x + w, 86, cor)
            t.rect(x, 86 - h, x + w, 86 - h + 4, topo)
            for j in range(3):
                for i in range(2):
                    t.rect(x + 4 + i * 10, 86 - h + 10 + j * 12, x + 9 + i * 10, 86 - h + 16 + j * 12, '#ffd0ec')
            ruido(t, x, 86 - h + 4, x + w, 86, 24, x, [mix(cor, '#000000', 0.15), mix(cor, '#ffffff', 0.3)])
        # a rua de pé de moleque, cheia de amendoim
        t.rect(0, 86, W - 1, H - 1, '#8a5a34')
        ruido(t, 0, 88, W - 1, H - 1, 160, 18, ['#6e4426', '#c8903c', '#e8b060'])
        for x in range(8, W, 24):
            elipse(t, x, 98 + (x // 24 % 3) * 4, 3, 2, '#d8a050')

    @staticmethod
    def animar(t, k, r):
        for x, y, c in ((24, 18, '#ff9ac8'), (96, 10, '#9ad8ff'), (178, 24, '#ff9ac8')):
            nuvem(t, x + (1 if k in (1, 2) else 0), y, 1.0, c, mix(c, '#ffffff', 0.4))
        # árvores de bala de goma
        for x, cor in ((100, '#ff4a6a'), (110, '#ffd21e'), (92, '#4ac86a')):
            t.rect(x, 78, x + 1, 90, '#8a5a30')
            disco(t, x + 1, 74, 6, cor, mix(cor, '#000000', 0.25), mix(cor, '#ffffff', 0.4))
        # o pirulito gigante: espiral vermelha e branca num palito
        cx, cy = 166, 30
        t.rect(cx - 1, cy + 14, cx + 1, 86, '#f4f0e8')
        disco(t, cx, cy, 17, '#fff8f0')
        for a in range(0, 360 * 3, 4):
            ang = math.radians(a + (k * 18 if r is None else r * 40))
            d = a / (360 * 3) * 17
            for e in (0, 1, 2):
                t.put(cx + round(math.cos(ang) * (d + e * 0.5)), cy + round(math.sin(ang) * (d + e * 0.5)), '#e8283a')
        anel(t, cx, cy, 17, '#c01828', 1)
        t.put(cx - 7, cy - 8, '#ffffff')
        t.put(cx - 6, cy - 9, '#ffffff')
        if r is not None:
            # a lambida: a língua rosada sobe do pé do pirulito e o confete pula
            for i in range(10):
                f = ((r * 3 + i * 3) % 12) / 12
                t.put(cx - 22 + i * 4, round(cy + 24 - f * 30), ['#ff4a6a', '#ffd21e', '#4ac8ff', '#9aff3a'][i % 4])
            elipse(t, cx - 12, cy + 10, 4, 2, '#ff7a9a')
        # chuva de confete (granulado colorido) caindo
        g = random.Random(5)
        for i in range(30):
            x0 = g.randrange(4, W - 4)
            y0 = g.randrange(0, 80)
            y = (y0 + k * 9 + i * 3) % 84
            t.put(x0, y, ['#ff4a6a', '#ffd21e', '#4ac8ff', '#9aff3a', '#ffffff'][i % 5])
            t.put(x0 + 1, y + 1, ['#ff4a6a', '#ffd21e', '#4ac8ff', '#9aff3a', '#ffffff'][i % 5])


# --- Página 10: o dragão de feijão ---------------------------------------------------------------------------------------------------------
@pagina(10, heroi=(44, 103, 3, 'danca'), ponto=(150, 42, 60, 46), elenco=[])
class P10:
    @staticmethod
    def fundo(t):
        degrade(t, 0, 76, ['#2a1018', '#5a2418', '#a04a22', '#e88a3a'])
        # montanhas de arroz branquinho e rio de caldo
        colinas(t, 78, 22, 19, '#f4ead4', 0.8, cor2='#ffffff')
        colinas(t, 88, 12, 13, '#d8c8a4', 2.5, cor2='#f0e4c8')
        t.rect(0, 92, W - 1, H - 1, '#6a3418')
        ruido(t, 0, 92, W - 1, H - 1, 200, 19, ['#8a4a22', '#4a2410', '#a8602c'])
        for x in range(0, W, 18):
            elipse(t, x + 6, 98 + (x // 18 % 3) * 4, 4, 2, '#e8dcc0')

    @staticmethod
    def animar(t, k, r):
        # o dragão: um corpo em S de feijões marrons e vermelhos, pescoço erguido, cabeça grande à direita
        cores = ('#7a2418', '#a8402a', '#5a3018', '#3a1810')
        pontos = []
        for i in range(30):
            f = i / 29
            x = 58 + f * 104
            y = 94 - 20 * math.sin(f * math.pi * 1.5 + k * 0.15) - 26 * f ** 2.0
            pontos.append((x, y, 8.2 - 3.6 * (1 - f)))
        for i, (x, y, rr) in enumerate(pontos):
            elipse(t, x, y, rr + 1, rr, cores[i % 2 if i % 3 else 2], '#2a1008', '#d8805a')
            t.put(round(x - 1), round(y - rr + 1), '#f0b890')
        # asas feitas de tampas de panela
        for dx, dy, esc in ((-8, -10, 1.0), (4, -14, 0.8)):
            wx, wy = pontos[16][0] + dx, pontos[16][1] + dy
            elipse(t, wx, wy - (k % 2), 14 * esc, 6 * esc, '#b8bcc8', '#7a7e8c', '#e8ecf4')
            disco(t, wx, wy - 4 * esc - (k % 2), 2, '#3a3a48')
        # a cabeça
        hx, hy = pontos[-1][0] + 5, pontos[-1][1] - (2 if r is not None and r in (1, 2) else 0)
        elipse(t, hx, hy, 19, 12, '#7a2418', '#5a1810', '#a8402a')
        elipse(t, hx + 12, hy + 3, 11, 7, '#a8402a', '#7a2418')
        t.rect(hx + 18, hy + 1, hx + 20, hy + 2, '#10100c')
        t.rect(hx + 18, hy + 5, hx + 20, hy + 6, '#10100c')
        t.rect(hx + 8, hy + 8, hx + 20, hy + 9, '#f4ead4')
        disco(t, hx - 3, hy - 4, 4, '#ffd23a', '#e8a01c')
        disco(t, hx - 3, hy - 4, 1.5, '#10100c')
        for dx in (-12, -4):
            t.line(hx + dx, hy - 10, hx + dx - 5, hy - 19, '#e8dcc0')
            t.line(hx + dx + 1, hy - 10, hx + dx - 4, hy - 19, '#b8a888')
        # o balão da Mandioca preso na garra (um balão de papel amassado)
        balao(t, 112, 36, 0.9, '#e8403c', '#ffd23a', k, cesto=False, luz=False)
        t.line(112, 49, hx - 8, hy + 10, '#e8e0c8')
        # fumaça de panela saindo do nariz; na reação, o espirro de fogo
        if r is None:
            fumaca(t, hx + 24, hy - 2, k, 3, '#f0e8e0', 4)
        else:
            alt = (6, 14, 22, 12)[r]
            for i in range(alt // 2):
                chama(t, hx + 24 + i * 4, hy + 4 + (i % 2), 6 + i // 2, 3, r + i)
            for i in range(6):
                brilho(t, hx + 16 + i * 6, hy - 6 + (i % 3) * 5 + r, '#ffd23a')
