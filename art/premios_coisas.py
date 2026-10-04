"""As coisas dos prêmios dos minigames: pequenos objetos animados que ficam no mapa principal (um por minigame).

Cada função devolve a lista de quadros (sem contorno; quem exporta contorna). A base do objeto (onde ele pisa no chão) é a última linha; os
que ficam pendurados (`pote`, `cordeis`, `lanterna`) têm o gancho na primeira.
"""

import math

from casa import Tela
from premios_pessoas import disco, luz, sombra


def tabua(t, x0, y0, x1, y1, cor='#a8743a'):
    t.rect(x0, y0, x1, y1, cor)
    t.rect(x0, y0, x1, y0, luz(cor, 1.25))
    t.rect(x0, y1, x1, y1, sombra(cor, 0.7))
    t.rect(x1, y0, x1, y1, sombra(cor, 0.82))


def urso(t, cx, cy, cor, braco=0, laco=None):
    """Um ursinho sentado: cabeça redonda com orelhas e focinho, corpo gordinho e bracinhos (`braco` 1: um levantado)."""
    claro, escuro = luz(cor, 1.22), sombra(cor, 0.78)
    disco(t, cx, cy + 5, 3.6, 3.4, cor, escuro, claro)
    disco(t, cx, cy, 3.4, 3.2, cor, escuro, claro)
    for lado in (-1, 1):
        disco(t, cx + lado * 3, cy - 3, 1.5, 1.5, cor, escuro, claro)
        t.put(cx + lado * 3, cy - 3, '#e8a0a0')
    disco(t, cx, cy + 1, 1.8, 1.4, '#f4dcb8', '#d8b890', '#fff0d8')
    t.put(cx, cy, '#3a2418')
    t.put(cx - 2, cy - 1, '#3a2418')
    t.put(cx + 2, cy - 1, '#3a2418')
    if laco:
        t.rect(cx - 2, cy + 3, cx + 2, cy + 3, laco)
        t.put(cx, cy + 4, sombra(laco))
    # os bracinhos
    t.rect(cx - 5, cy + 4, cx - 4, cy + 6, cor)
    if braco:
        t.rect(cx + 4, cy - 1, cx + 5, cy + 2, cor)
        t.put(cx + 5, cy - 2, claro)
    else:
        t.rect(cx + 4, cy + 4, cx + 5, cy + 6, cor)
    for lado in (-1, 1):
        t.put(cx + lado * 2, cy + 8, escuro)


def ursinhos():
    quadros = []
    for q in range(3):
        t = Tela(26, 22)
        urso(t, 6, 8, '#f08aa8', laco='#ffffff')
        urso(t, 20, 8, '#5aa0e8', laco='#ffd21e')
        tabua(t, 1, 15, 24, 21, '#b07a44')
        for x in (5, 12, 19):
            t.rect(x, 16, x, 21, '#8a5a2a')
        urso(t, 13, 9, '#c8844a', braco=1 if q == 1 else 0, laco='#ee2f3c')
        t.rect(1, 15, 24, 15, '#d89a58')
        if q == 2:
            t.put(13, 0, '#ffd21e')
            t.put(12, 1, '#ffd21e')
            t.put(14, 1, '#ffd21e')
        quadros.append(t.im)
    return quadros


def balde_peixes():
    quadros = []
    o = 6                                              # o balde fica embaixo; em cima sobra espaço para os peixes pularem
    for q in range(3):
        t = Tela(20, 26)
        for y in range(8, 19):
            meia = 6 if y < 14 else 5
            t.rect(10 - meia, y + o, 10 + meia, y + o, '#aeb4c0')
            t.put(10 - meia, y + o, '#d8dce8')
            t.put(10 + meia, y + o, '#7a808c')
        t.rect(4, 8 + o, 16, 9 + o, '#d8dce8')
        t.rect(4, 9 + o, 16, 9 + o, '#8a909c')
        t.rect(5, 8 + o, 15, 8 + o, '#3a8ae8')
        t.rect(5, 9 + o, 15, 9 + o, '#2a6ac8')
        t.rect(4, 17 + o, 16, 18 + o, '#7a808c')
        t.line(4, 8 + o, 6, 4 + o, '#8a909c')
        t.line(16, 8 + o, 14, 4 + o, '#8a909c')
        t.rect(6, 3 + o, 14, 4 + o, '#8a909c')

        def peixe(cx, cy, cor, inclina):
            t.rect(cx - 3, cy, cx + 2, cy + 2, cor)
            t.rect(cx - 2, cy - 1, cx + 1, cy - 1, cor)
            t.rect(cx - 2, cy + 3, cx + 1, cy + 3, sombra(cor))
            t.put(cx + 3, cy - inclina, cor)
            t.put(cx + 4, cy - 1 - inclina, cor)
            t.put(cx + 3, cy + 3 - inclina, cor)
            t.put(cx - 2, cy, '#26242e')
            t.put(cx - 1, cy + 2, luz(cor, 1.3))
            t.put(cx, cy + 1, '#ffffff')
        if q == 0:
            peixe(7, 3, '#ff8a3a', 1)
            t.put(12, 6 + o, '#d8f4ff')
            t.put(13, 5 + o, '#ffffff')
        elif q == 1:
            peixe(13, 1, '#ffd21e', -1)
            t.put(7, 6 + o, '#d8f4ff')
            t.put(6, 5 + o, '#ffffff')
        else:
            peixe(7, 6, '#ff8a3a', 0)
            peixe(14, 4, '#ffd21e', 1)
        quadros.append(t.im)
    return quadros


def globo_bingo():
    quadros = []
    cores = ['#ee2f3c', '#ffd21e', '#3a6cf0', '#35a03a', '#ff8ac0', '#ffffff']
    for q in range(4):
        t = Tela(24, 28)
        # o suporte de madeira
        t.rect(4, 22, 19, 27, '#a8743a')
        t.rect(4, 22, 19, 22, '#d89a58')
        t.rect(4, 27, 19, 27, '#6a4420')
        t.rect(9, 20, 14, 22, '#8a5a2a')
        # a gaiola de arame (bolha de vidro) com as bolas rodando
        disco(t, 11, 11, 9.2, 9.2, '#cfe8f8', '#9ab8d0', '#eaf6ff')
        t.rect(2, 11, 20, 11, '#9ab8d0')
        for k in range(8):
            ang = (k / 8 + q / 16.0) * math.tau
            x = round(11 + math.cos(ang) * 5.6 * (0.55 + 0.45 * ((k * 5) % 3) / 2))
            y = round(11 + math.sin(ang) * 5.2 * (0.55 + 0.45 * ((k * 3) % 3) / 2))
            cor = cores[k % len(cores)]
            t.rect(x - 1, y - 1, x + 1, y + 1, cor)
            t.put(x - 1, y - 1, luz(cor, 1.5))
        t.put(7, 5, '#ffffff')
        t.put(8, 4, '#ffffff')
        # a manivela
        mx = 21 + (1 if q % 2 else 0)
        my = 12 + (q % 3 - 1) * 2
        t.line(19, 12, mx, my, '#6a4420')
        t.rect(mx, my, mx + 1, my + 1, '#ee2f3c')
        quadros.append(t.im)
    return quadros


def burrico():
    quadros = []
    for q in range(2):
        t = Tela(26, 24)
        cor = '#9a9aa8'
        # as pernas e o corpo de pano
        for x in (6, 9, 16, 19):
            t.rect(x, 17, x + 1, 22, '#7a7a88')
            t.rect(x, 22, x + 1, 23, '#3a2e30')
        disco(t, 13, 14, 8.4, 4.8, cor, sombra(cor, 0.82), luz(cor, 1.18))
        # remendos de pano colorido
        t.rect(8, 12, 10, 14, '#ee6a4a')
        t.rect(8, 12, 8, 12, '#ff8a6a')
        t.rect(17, 15, 19, 17, '#3a8ae8')
        # a cabeça com as orelhonas
        disco(t, 22, 9, 3.4, 3.4, cor, sombra(cor, 0.82), luz(cor, 1.18))
        t.rect(22, 11, 25, 13, '#f4dcb8')
        t.put(24, 12, '#3a2418')
        t.rect(20, 3 - q, 21, 7, cor)
        t.rect(23, 2 - q, 24, 6, cor)
        t.rect(21, 4 - q, 21, 6, '#e8a0a0')
        t.rect(23, 3 - q, 23, 5, '#e8a0a0')
        t.put(21, 8, '#26242e')
        t.put(23, 8, '#26242e')
        # o rabo (onde se pregava) balançando
        t.line(5, 12, 2 + q * 2, 17 - q, '#6a6a76')
        t.rect(1 + q * 2, 17 - q, 3 + q * 2, 19 - q, '#3a3a46')
        quadros.append(t.im)
    return quadros


def fita_chegada():
    quadros = []
    for q in range(3):
        t = Tela(34, 26)
        for x in (2, 31):
            t.rect(x, 3, x + 1, 25, '#c8844a')
            t.rect(x, 3, x, 25, '#e8a868')
            t.rect(x - 1, 23, x + 2, 25, '#6a4420')
            t.rect(x - 1, 2, x + 2, 3, '#ffd21e')
        # a fita quadriculada, ondulando
        for x in range(4, 31):
            onda = round(math.sin((x * 0.5) + q * 2.1) * 1.4)
            for k in range(3):
                cor = '#fffaf0' if (x // 2 + k) % 2 else '#ee2f3c'
                t.put(x, 9 + onda + k, cor)
        t.put(3, 9, '#ee2f3c')
        t.put(30, 9, '#fffaf0')
        # as bandeirinhas nos postes
        for x, dx in ((2, 1), (31, -1)):
            for k in range(3):
                t.put(x + dx * (1 + k), 5 + (k + q) % 2, ['#ee2f3c', '#ffd21e', '#3a6cf0'][k])
        quadros.append(t.im)
    return quadros


def pote_enfeitado():
    quadros = []
    for q in range(3):
        t = Tela(18, 26)
        desvio = [-1, 0, 1][q]
        t.line(9, 0, 9 + desvio, 8, '#8a5a2a')
        t.put(9, 0, '#ffd21e')
        cx = 9 + desvio
        # o pote de barro
        disco(t, cx, 15, 6.4, 6.6, '#d8844a', '#a8582a', '#f0a468')
        t.rect(cx - 4, 8, cx + 4, 9, '#b8683a')
        t.rect(cx - 4, 8, cx + 4, 8, '#e8a468')
        # as fitas coloridas e o desenho
        for k, cor in enumerate(('#ee2f3c', '#ffd21e', '#3a6cf0', '#35a03a')):
            x = cx - 4 + k * 2 + 1
            t.rect(x, 18, x, 22 + (k + q) % 3, cor)
        t.rect(cx - 5, 14, cx + 5, 14, '#fff4e4')
        for x in range(cx - 5, cx + 6, 2):
            t.put(x, 13, '#ee2f3c')
            t.put(x + 1, 15, '#3a6cf0')
        # a carinha do pote
        t.put(cx - 2, 12, '#26242e')
        t.put(cx + 2, 12, '#26242e')
        t.rect(cx - 1, 16, cx + 1, 16, '#8a2a2a')
        quadros.append(t.im)
    return quadros


def martelo_banco():
    quadros = []
    for q in range(2):
        t = Tela(22, 16)
        # o bloco de madeira e a base
        t.rect(8, 9, 20, 15, '#a8743a')
        t.rect(8, 9, 20, 10, '#d89a58')
        t.rect(8, 15, 20, 15, '#5a3418')
        t.rect(20, 9, 20, 15, '#7a4a22')
        t.rect(10, 12, 18, 12, '#8a5a2a')
        # o martelo (cabo e cabeça); no 2º quadro bate no bloco
        if q == 0:
            t.line(4, 6, 12, 1, '#c8844a')
            t.rect(11, 0, 15, 3, '#6e3c1c')
            t.rect(11, 0, 15, 0, '#a8743a')
        else:
            t.line(6, 8, 13, 5, '#c8844a')
            t.rect(12, 4, 16, 7, '#6e3c1c')
            t.rect(12, 4, 16, 4, '#a8743a')
            t.put(18, 7, '#ffe27a')
            t.put(19, 6, '#ffe27a')
            t.put(17, 8, '#fff6c4')
            t.put(1, 4, '#fff4e4')
            t.put(2, 3, '#fff4e4')
        # uma plaquinha de "vendido"
        t.rect(1, 11, 6, 15, '#fffaf0')
        t.rect(1, 11, 6, 11, '#ee2f3c')
        t.rect(2, 13, 5, 13, '#8a8a98')
        t.rect(2, 15, 5, 15, '#8a8a98')
        quadros.append(t.im)
    return quadros


def cesto_cobra():
    quadros = []
    for q in range(3):
        t = Tela(22, 30)
        # a cobra de pano (verde, listrada) subindo do cesto, balançando
        pontos = []
        for k in range(14):
            y = 17 - k
            x = 11 + round(math.sin(k * 0.55 + q * 2.1) * (1 + k * 0.28))
            pontos.append((x, y))
        for k, (x, y) in enumerate(pontos):
            cor = '#58b848' if k % 3 else '#2e8a38'
            t.rect(x - 1, y, x + 1, y, cor)
            if k % 3 == 0:
                t.put(x, y, '#c8f058')
        hx, hy = pontos[-1]
        disco(t, hx, hy - 1, 2.6, 2.2, '#58b848', '#2e8a38', '#8ad868')
        t.put(hx - 1, hy - 2, '#ffd21e')
        t.put(hx + 1, hy - 2, '#ffd21e')
        t.put(hx - 1, hy - 2, '#26242e') if q == 1 else None
        if q != 1:
            t.put(hx, hy + 1, '#ee2f3c')
            t.put(hx, hy + 2, '#ee2f3c')
        # o cesto de vime
        disco(t, 11, 24, 8.0, 5.4, '#c8944a', '#8a5a2a', '#e8b868')
        t.rect(3, 21, 19, 21, '#e8b868')
        for x in range(4, 19, 3):
            t.rect(x, 22, x, 28, '#a8743a')
        t.rect(3, 25, 19, 25, '#a8743a')
        t.rect(3, 28, 19, 28, '#6a4420')
        quadros.append(t.im)
    return quadros


def varal_cordeis():
    quadros = []
    cores = ['#ee2f3c', '#3a8ae8', '#35a03a', '#ffd21e', '#ff8ac0']
    for q in range(3):
        t = Tela(36, 24)
        for x in range(0, 36):
            t.put(x, 1 + round(math.sin(x / 36.0 * math.pi) * 1), '#3a2418')
        for k in range(5):
            x = 3 + k * 7
            bal = round(math.sin(q * 2.1 + k * 1.2) * 1.2)
            t.put(x + 1, 2, '#c8844a')
            t.rect(x, 3, x + 2, 3, '#c8844a')
            t.rect(x + bal, 4, x + 4 + bal, 15, '#fffaf0')
            t.rect(x + bal, 4, x + 4 + bal, 7, cores[k])
            t.rect(x + 4 + bal, 4, x + 4 + bal, 15, '#d8c8a0')
            t.rect(x + 1 + bal, 9, x + 3 + bal, 9, '#8a8a98')
            t.rect(x + 1 + bal, 11, x + 3 + bal, 11, '#8a8a98')
            t.rect(x + 1 + bal, 13, x + 2 + bal, 13, '#8a8a98')
        quadros.append(t.im)
    return quadros


def cocho_milho():
    quadros = []
    for q in range(3):
        t = Tela(26, 20)
        o = 4
        # o cocho de madeira cheio de milho
        t.rect(2, 9 + o, 23, 16 + o, '#a8743a')
        t.rect(2, 9 + o, 23, 9 + o, '#d89a58')
        t.rect(2, 16 + o, 23, 16 + o, '#5a3418')
        t.rect(23, 9 + o, 23, 16 + o, '#7a4a22')
        t.rect(4, 7 + o, 21, 9 + o, '#ffd21e')
        for x in range(4, 22, 2):
            t.put(x, 7 + o, '#ffe27a')
            t.put(x + 1, 8 + o, '#e8b812')
        t.rect(5, 12 + o, 20, 12 + o, '#8a5a2a')
        t.rect(1, 15 + o, 3, 17 + o, '#6a4420')
        t.rect(22, 15 + o, 24, 17 + o, '#6a4420')
        # o pintinho em cima do milho, bicando
        px, py = 13, 3 + o
        bica = [0, 3, 0][q]
        disco(t, px, py + 1, 3.0, 2.8, '#ffe27a', '#e8b812', '#fff6b8')
        disco(t, px + 2, py - 1 + bica // 2, 2.0, 2.0, '#ffe27a', '#e8b812', '#fff6b8')
        t.put(px + 3, py - 1 + bica // 2, '#26242e')
        t.rect(px + 4, py + bica, px + 5, py + bica, '#ff8a3a')
        t.put(px - 1, py + 4, '#ff8a3a')
        t.put(px + 1, py + 4, '#ff8a3a')
        t.put(px - 3, py, '#fff6b8')
        quadros.append(t.im)
    return quadros


def barril_aquario():
    quadros = []
    for q in range(4):
        t = Tela(24, 30)
        # o tonel de madeira
        t.rect(3, 17, 20, 29, '#a8743a')
        for x in (3, 8, 13, 18):
            t.rect(x, 17, x, 29, '#d89a58' if x == 3 else '#6a4420')
        t.rect(2, 20, 21, 21, '#6e6e7a')
        t.rect(2, 26, 21, 27, '#6e6e7a')
        t.rect(3, 17, 20, 17, '#d89a58')
        # o aquário de vidro em cima
        t.rect(2, 3, 21, 16, '#9ad8f0')
        t.rect(3, 4, 20, 15, '#4aa8d8')
        t.rect(3, 4, 20, 5, '#7ac8e8')
        t.rect(2, 3, 21, 3, '#d8f4ff')
        t.rect(2, 3, 2, 16, '#d8f4ff')
        t.rect(21, 3, 21, 16, '#7ab0c8')
        t.rect(2, 16, 21, 16, '#7ab0c8')
        # a areia e a plantinha
        t.rect(3, 14, 20, 15, '#e8d49a')
        t.line(5, 14, 4, 9, '#35a03a')
        t.line(5, 14, 6, 10, '#58b848')
        # os peixes nadando
        def peixe(cx, cy, cor, dir_):
            t.rect(cx - 2, cy, cx + 2, cy + 1, cor)
            t.rect(cx - 1, cy - 1, cx + 1, cy - 1, cor)
            t.put(cx - 3 * dir_, cy - 1, sombra(cor))
            t.put(cx - 3 * dir_, cy + 2, sombra(cor))
            t.put(cx + 2 * dir_, cy, '#26242e')
        fx = 6 + (q * 3) % 12
        peixe(fx, 8, '#ff8a3a', 1)
        peixe(20 - (q * 3) % 12, 11, '#ffd21e', -1)
        # as bolhas
        t.put(11, 12 - q * 2, '#ffffff') if q < 3 else None
        t.put(12, 9 - q % 3, '#d8f4ff')
        t.put(7, 6, '#ffffff')
        quadros.append(t.im)
    return quadros


def carrinho_legumes():
    quadros = []
    for q in range(2):
        t = Tela(30, 22)
        # os legumes dentro do carrinho
        disco(t, 9, 7, 3.4, 3.4, '#58b848', '#2e8a38', '#8ad868')
        disco(t, 15, 8, 3.2, 3.2, '#ee4a3a', '#a82a22', '#ff8a7a')
        t.rect(14, 4, 16, 5, '#35a03a')
        t.rect(18, 4 - q, 19, 10, '#ff8a2a')
        t.rect(18, 10, 19, 11, '#e86a14')
        t.rect(21, 5 + q, 22, 11, '#ff8a2a')
        t.rect(18, 2 - q, 19, 4 - q, '#35a03a')
        t.rect(21, 3 + q, 22, 5 + q, '#35a03a')
        # a caçamba de metal azul
        t.rect(3, 10, 25, 16, '#3a78d8')
        t.rect(3, 10, 25, 11, '#6aa0f0')
        t.rect(3, 16, 25, 16, '#1e48a0')
        t.rect(25, 10, 25, 16, '#2a5ab8')
        t.rect(6, 13, 22, 13, '#2a5ab8')
        # os cabos de madeira e a roda
        t.line(2, 11, 0, 17, '#c8844a')
        t.line(26, 11, 29, 17, '#c8844a')
        t.rect(0, 17, 2, 18, '#6a4420')
        t.rect(28, 17, 29, 18, '#6a4420')
        disco(t, 14, 18, 3.2, 3.2, '#3a3a46', '#26242e', '#5a5a68')
        t.rect(14, 16, 14, 20, '#8a909c')
        t.rect(12, 18, 16, 18, '#8a909c')
        quadros.append(t.im)
    return quadros


def panela_fogo():
    quadros = []
    for q in range(4):
        t = Tela(24, 28)
        # o tripé
        t.line(4, 27, 11, 14, '#6a4420')
        t.line(19, 27, 12, 14, '#6a4420')
        t.line(11, 27, 11, 14, '#8a5a2a')
        # o fogo (chamas mudam a cada quadro)
        alturas = [(4, 6), (5, 4), (3, 6), (5, 5)][q]
        for k, h in enumerate((alturas[0], alturas[1] + 2, alturas[0] + 1)):
            x = 8 + k * 3
            t.rect(x, 26 - h, x + 1, 26, '#ff8a12')
            t.rect(x, 26 - h + 2, x + 1, 26, '#ffd21e')
            t.put(x, 26 - h, '#ff5a1e')
        t.rect(6, 26, 17, 27, '#4a3a2a')
        # a panela de ferro com tampa
        disco(t, 12, 12, 6.6, 4.6, '#3a3a46', '#26242e', '#6a6a78')
        t.rect(6, 8, 18, 9, '#4a4a58')
        t.rect(6, 8, 18, 8, '#8a8a98')
        t.put(12, 5, '#8a8a98')
        t.rect(11, 6, 13, 7, '#6a6a78')
        # o vapor subindo
        for k in range(3):
            t.put(10 + k * 2 + (q + k) % 2, 3 - (q + k) % 3, '#f6f6fc' if k % 2 else '#c8ccde')
            t.put(11 + k * 2, 1 + (q * 2 + k) % 3, '#e8ecf4')
        quadros.append(t.im)
    return quadros


def zabumba():
    quadros = []
    for q in range(2):
        t = Tela(20, 22)
        # as pernas de apoio
        t.line(5, 15, 3, 21, '#6a4420')
        t.line(14, 15, 16, 21, '#6a4420')
        # o tambor
        t.rect(2, 6 + q, 17, 15 - q, '#a8442a')
        t.rect(2, 6 + q, 17, 7 + q, '#f4e4c0')
        t.rect(2, 14 - q, 17, 15 - q, '#f4e4c0')
        for x in range(3, 17, 3):
            t.line(x, 8 + q, x + 1, 13 - q, '#6e2a1a')
        t.rect(2, 6 + q, 2, 15 - q, '#d86a4a')
        t.rect(17, 6 + q, 17, 15 - q, '#6e2a1a')
        # as baquetas em cima
        t.line(5, 4 - q * 2, 9, 1 + q, '#e8b868')
        t.put(5, 4 - q * 2, '#fffaf0')
        t.line(14, 4 - (1 - q) * 2, 10, 1 + (1 - q), '#e8b868')
        t.put(14, 4 - (1 - q) * 2, '#fffaf0')
        t.rect(0, 0, 0, 0, '#00000000') if False else None
        quadros.append(t.im)
    return quadros


def totem_curupira():
    quadros = []
    for q in range(3):
        t = Tela(20, 44)
        # o tronco esculpido
        t.rect(5, 12, 14, 43, '#8a5a2a')
        t.rect(5, 12, 6, 43, '#b07a44')
        t.rect(14, 12, 14, 43, '#5a3a1a')
        for y in range(15, 43, 5):
            t.rect(7, y, 12, y, '#6a4420')
        t.rect(4, 41, 15, 43, '#6a4420')
        # a carranca do Curupira: olhos, nariz e boca
        t.rect(7, 17, 9, 19, '#fff4e4')
        t.rect(11, 17, 13, 19, '#fff4e4')
        t.rect(8, 18, 8, 19, '#26242e')
        t.rect(12, 18, 12, 19, '#26242e')
        t.rect(9, 20, 11, 24, '#6a4420')
        t.rect(7, 26, 13, 28, '#2a1208')
        for x in (8, 10, 12):
            t.put(x, 26, '#fff4e4')
        # os pés virados para trás, entalhados embaixo
        t.rect(7, 33, 8, 36, '#c8844a')
        t.rect(11, 33, 12, 36, '#c8844a')
        t.put(7, 36, '#6a4420')
        t.put(12, 36, '#6a4420')
        # o cabelo de fogo
        for k in range(9):
            x = 4 + k * 1
            alto = [3, 6, 4, 8, 5, 9, 4, 6, 3][(k + q * 2) % 9]
            for y in range(12 - alto, 12):
                cor = '#ff5a1e' if y > 12 - alto // 2 - 1 else '#ff8a12' if y > 12 - alto + 1 else '#ffd21e'
                t.put(x, y, cor)
        t.put(9 + q, 1, '#fff07a')
        quadros.append(t.im)
    return quadros


def telescopio():
    quadros = []
    for q in range(3):
        t = Tela(28, 30)
        # o tripé
        t.line(11, 16, 4, 29, '#6a4420')
        t.line(12, 16, 12, 29, '#8a5a2a')
        t.line(13, 16, 20, 29, '#6a4420')
        t.rect(3, 29, 6, 29, '#3a2418')
        t.rect(11, 29, 14, 29, '#3a2418')
        t.rect(19, 29, 22, 29, '#3a2418')
        # o tubo de latão apontado para o céu
        for k in range(14):
            x = 10 + k
            y = 15 - k // 1 * 1
            cor = '#d8a83a' if k % 5 else '#ffe27a'
            t.rect(x, y - 1, x + 1, y + 1, cor)
        t.line(10, 14, 23, 1, '#a8782a')
        t.rect(22, 0, 25, 3, '#8a5a1a')
        t.rect(22, 0, 25, 0, '#d8a83a')
        t.rect(9, 14, 12, 18, '#a8782a')
        # a estrela cintilando ao lado
        sx, sy = 25, 9 + q % 2
        t.put(sx, sy, '#fffbe0')
        if q != 1:
            t.put(sx - 1, sy, '#fff07a')
            t.put(sx + 1, sy, '#fff07a')
            t.put(sx, sy - 1, '#fff07a')
            t.put(sx, sy + 1, '#fff07a')
        t.put(3, 4 + q, '#fff07a')
        quadros.append(t.im)
    return quadros


def caixa_correio():
    quadros = []
    for q in range(2):
        t = Tela(20, 30)
        # o poste e a caixa vermelha
        t.rect(8, 15, 11, 29, '#8a5a2a')
        t.rect(8, 15, 8, 29, '#b07a44')
        t.rect(5, 28, 14, 29, '#6a4420')
        disco(t, 10, 9, 8.0, 6.4, '#e0343e', '#9a1a2e', '#ff6a72')
        t.rect(2, 9, 17, 14, '#e0343e')
        t.rect(2, 9, 2, 14, '#ff6a72')
        t.rect(17, 9, 17, 14, '#9a1a2e')
        t.rect(2, 14, 17, 14, '#9a1a2e')
        t.rect(5, 10, 14, 10, '#26242e')
        t.rect(8, 5, 11, 6, '#ffd21e')
        # a bandeirinha (levantada ou abaixada) e a carta aparecendo
        if q == 0:
            t.rect(16, 2, 17, 11, '#8a8a98')
            t.rect(14, 2, 16, 5, '#ffd21e')
        else:
            t.rect(17, 6, 18, 12, '#8a8a98')
            t.rect(18, 8, 19, 12, '#ffd21e')
            t.rect(5, 6, 12, 8, '#fffaf0')
            t.put(8, 7, '#ee2f3c')
        quadros.append(t.im)
    return quadros


def lanterna_boitata():
    quadros = []
    for q in range(3):
        t = Tela(16, 30)
        t.line(8, 0, 8, 6, '#8a5a2a')
        t.rect(6, 5, 10, 6, '#6a4420')
        # a lanterna de papel com a cobra de fogo desenhada
        disco(t, 8, 15, 6.0, 8.4, '#ffb04a', '#e0782a', '#ffd88a')
        t.rect(4, 6, 12, 7, '#6a4420')
        t.rect(5, 23, 11, 24, '#6a4420')
        # a cobra de fogo enrolada
        pontos = [(6, 11), (8, 10), (10, 11), (10, 13), (8, 14), (6, 15), (6, 17), (8, 18), (10, 18), (10, 20)]
        for k, (x, y) in enumerate(pontos):
            cor = '#ee2f3c' if (k + q) % 3 else '#ffd21e'
            t.rect(x, y, x + 1, y, cor)
        t.put(11, 21, '#ee2f3c')
        t.put(5, 11, '#ffd21e')
        t.put(5, 10, '#ee2f3c')
        # a chama do lado de dentro piscando
        glow = [(8, 14), (8, 15), (9, 14)][q]
        t.put(glow[0], glow[1], '#fff6c4')
        for y in (25, 26):
            t.rect(6, y, 10, y, ['#ff8a12', '#ffd21e', '#ff5a1e'][(q + y) % 3])
        t.put(7 + q % 2, 27, '#ff8a12')
        t.put(8, 28, '#ffd21e')
        quadros.append(t.im)
    return quadros


COISAS = {
    'ursinhos': ursinhos, 'balde-peixes': balde_peixes, 'globo-bingo': globo_bingo, 'burrico': burrico, 'fita-chegada': fita_chegada,
    'pote-enfeitado': pote_enfeitado, 'martelo-banco': martelo_banco, 'cesto-cobra': cesto_cobra, 'varal-cordeis': varal_cordeis,
    'cocho-milho': cocho_milho, 'barril-aquario': barril_aquario, 'carrinho-legumes': carrinho_legumes, 'panela-fogo': panela_fogo,
    'zabumba': zabumba, 'totem-curupira': totem_curupira, 'telescopio': telescopio, 'caixa-correio': caixa_correio,
    'lanterna-boitata': lanterna_boitata,
}
