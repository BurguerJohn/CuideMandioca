"""Páginas 2 a 5 do Cordel da Mandioca (o convite, a cozinha, a fogueira e o balão), continuação de livro_a.py."""

import math

from livro_base import W, H, pagina, degrade, elipse, disco, ruido, nuvem, colinas, chao, casinha, fumaca, brilho, mix, \
    chama, fogueira, faiscas, bandeirinhas, estrelas, lua, balao, passaro, coracao, poligono


# --- Página 2: o convite do vento --------------------------------------------------------------------------------------------------
def convite(t, cx, cy, tilt, cor='#fff4d8'):
    """O papelzinho do convite (com o lacre de cera vermelha e as linhas do texto), inclinado `tilt` pixels de um lado ao outro."""
    pts = [(cx - 9, cy - 5 + tilt), (cx + 9, cy - 5 - tilt), (cx + 9, cy + 5 - tilt), (cx - 9, cy + 5 + tilt)]
    poligono(t, pts, '#8a6a4a')
    poligono(t, [(x + (1 if i in (0, 3) else -1), y + (1 if i in (0, 1) else -1)) for i, (x, y) in enumerate(pts)], cor)
    for i in range(3):
        t.line(cx - 6, cy - 2 + i * 2 + tilt // 2, cx + 3, cy - 2 + i * 2 - tilt // 2, '#a89070')
    disco(t, cx + 5, cy + 2 - tilt // 2, 2, '#e0343e', '#a01828')


@pagina(2, heroi=(62, 103, 3, 'danca'), ponto=(104, 16, 70, 48), elenco=[('pamonha', 190, 102, False)])
class P02:
    @staticmethod
    def fundo(t):
        degrade(t, 0, 76, ['#4a9ad8', '#78bce8', '#b4dcf2', '#e4f2f4'])
        colinas(t, 78, 9, 24, '#7ab86a', 1.1, cor2='#98d082')
        colinas(t, 86, 7, 17, '#5ea450', 3.0, cor2='#7cbc66')
        # a festa lá longe: barracas, de onde vem o convite
        for x, cor in ((176, '#e0343e'), (194, '#3a6cc8'), (210, '#e8b030')):
            poligono(t, [(x - 7, 72), (x + 7, 72), (x + 4, 66), (x - 4, 66)], cor)
            t.rect(x - 5, 72, x + 5, 78, '#f4e4c0')
        chao(t, 90, '#5aa04a', '#4a8a3c', '#78bc62', 5)
        t.rect(0, 100, W - 1, 111, '#8a6a3c')
        ruido(t, 0, 100, W - 1, 111, 120, 8, ['#6e4e28', '#a88850'])

    @staticmethod
    def animar(t, k, r):
        sway = (0, 2, 3, 2)[k]
        # vento: nuvens esticadas e riscos no ar
        for x, y in ((20, 22), (90, 14), (170, 30)):
            nuvem(t, x + sway - 2, y, 1.1)
            for j in range(3):
                t.line(x + 14 + sway, y + 2 + j * 2, x + 28 + sway + j * 3, y + 2 + j * 2, '#ffffff')
        for i in range(4):
            x = (i * 56 + k * 14) % W
            t.line(x, 52 + i * 5, x + 12, 52 + i * 5 - 2, '#e4f6ff')
        bandeirinhas(t, 10, 8, 214, 8, k, sag=10, bal=2.4)
        # as árvores que se curvam com o vento
        for x, base, alto in ((16, 96, 46), (204, 96, 40)):
            t.rect(x - 1, base - alto // 2, x + 1, base, '#5a3a22')
            elipse(t, x + sway, base - alto * 0.68, alto * 0.38, alto * 0.32, '#3a8a3c', '#2a6a30', '#5aa854')
        # a pipa, presa por um fio comprido
        px, py = 150 + sway, 24 + (k % 2)
        poligono(t, [(px, py - 8), (px + 5, py), (px, py + 8), (px - 5, py)], '#ff4f9e')
        poligono(t, [(px, py - 8), (px + 5, py), (px, py)], '#ffd21e')
        t.line(px, py + 8, 120, 90, '#e8e8f0')
        for i in range(3):
            t.line(px - 1 + i % 2, py + 9 + i * 4, px - 2 + (i + k) % 2, py + 11 + i * 4, ['#ee2f3c', '#3a6cc8', '#ffd21e'][i])
        # o convite no ar (ou voando até a Mandioca na reação)
        if r is None:
            cx = round(138 + 22 * math.sin(k * math.pi / 2))
            cy = round(34 + 6 * math.cos(k * math.pi / 2))
            tilt = (-3, 0, 3, 0)[k]
        else:
            f = (r + 1) / 4
            cx = round(138 + (70 - 138) * f)
            cy = round(34 + (62 - 34) * f)
            tilt = (3, 2, 1, 0)[r]
            for i in range(4):
                brilho(t, cx + (i - 2) * 6 - 4, cy + 10 - i * 5 + (r % 2) * 2, '#fff6b8')
        convite(t, cx, cy, tilt)
        if r == 3:
            coracao(t, 66, 54, '#ff4f9e')
        # capim e flores se mexendo no chão
        for x in range(8, W, 14):
            t.line(x, 98, x + (1 if k in (1, 2) else -1), 93, '#3a8a3c')
            t.put(x + (1 if k in (1, 2) else -1), 92, ('#ff8ac0', '#ffe27a', '#ffffff')[(x // 14) % 3])


# --- Página 3: a cozinha da Canjica ------------------------------------------------------------------------------------------------
@pagina(3, heroi=(70, 103, 3, 'danca'), ponto=(132, 36, 46, 34), elenco=[('canjica', 192, 102, True)])
class P03:
    @staticmethod
    def fundo(t):
        t.rect(0, 0, W - 1, 82, '#c89462')
        for x in range(0, W, 14):
            t.rect(x, 0, x, 82, '#a8744a')
            ruido(t, x + 1, 0, x + 12, 82, 20, x, ['#b8844f', '#d8a472'])
        t.rect(0, 12, W - 1, 15, '#6e4426')
        t.rect(0, 12, W - 1, 12, '#9a6a3c')
        # janela com o entardecer
        t.rect(20, 24, 66, 62, '#6e4426')
        degrade(t, 26, 60, ['#ffd890', '#ff9a58', '#c8584a'], 22, 64)
        t.rect(43, 24, 44, 62, '#6e4426')
        t.rect(20, 42, 66, 43, '#6e4426')
        bandeirinhas(t, 22, 28, 64, 30, 0, sag=4, bal=0.5)
        # prateleira de potes
        t.rect(88, 38, 128, 40, '#6e4426')
        for i, cor in enumerate(('#e8b030', '#c8483a', '#7aa84a', '#e8b030')):
            t.rect(92 + i * 9, 28, 98 + i * 9, 37, cor)
            t.rect(92 + i * 9, 26, 98 + i * 9, 27, '#d8d0c0')
        # fogão a lenha de tijolo
        t.rect(130, 54, 180, 90, '#a8482a')
        for y in range(54, 90, 6):
            t.rect(130, y, 180, y, '#7a3018')
            for x in range(130 + (y // 6 % 2) * 5, 180, 10):
                t.rect(x, y, x, y + 5, '#7a3018')
        t.rect(130, 54, 180, 56, '#5a2a18')
        t.rect(142, 70, 168, 88, '#2a1a14')
        # piso de tábua e mesa
        t.rect(0, 90, W - 1, 111, '#9a6a3c')
        for x in range(0, W, 28):
            t.rect(x, 90, x, 111, '#6e4426')
        t.rect(0, 90, W - 1, 90, '#c08850')
        t.rect(8, 84, 52, 86, '#8a5a30')
        t.rect(12, 86, 14, 100, '#6e4426')
        t.rect(46, 86, 48, 100, '#6e4426')

    @staticmethod
    def animar(t, k, r):
        # carreira de milho e pimenta pendurada no teto
        for i, x in enumerate((84, 108, 132, 156, 180, 204)):
            alt = 16 + (i % 3) * 5 + (1 if k in (1, 2) and i % 2 else 0)
            t.line(x, 16, x, 16 + alt, '#5a3a22')
            if i % 2:
                for j in range(4):
                    t.rect(x - 1, 20 + j * 4, x + 1, 22 + j * 4, '#e0343e')
            else:
                elipse(t, x, 16 + alt + 2, 3, 5, '#f0c040', '#c8901c')
                t.line(x, 16 + alt - 2, x - 2, 16 + alt + 5, '#7aa84a')
        for x in (16, 28, 40):
            elipse(t, x + 3, 83, 5, 1.5, '#f4eee0', '#c8c0b0')
        # a panela de canjica sobre o fogão: borbulha e solta vapor
        subir = 0 if r is None else (0, 2, 3, 1)[r]
        topo = 40 - subir // 2
        t.rect(136, topo, 174, 52, '#4a4a58')
        t.rect(136, topo, 174, topo + 2, '#7a7a8a')
        t.rect(168, topo, 174, 52, '#33333f')
        t.rect(132, topo + 3, 135, topo + 5, '#7a7a8a')
        t.rect(175, topo + 3, 178, topo + 5, '#7a7a8a')
        elipse(t, 155, topo, 17, 3, '#f8e8a0', '#e0c870')
        for i in range(5):
            disco(t, 143 + i * 6 + (k * 2 + i) % 3, topo - ((k + i) % 3), 1.2, '#fff6c8')
        fumaca(t, 150, topo - 4, k, 4, '#f4f4fa', 5)
        fumaca(t, 162, topo - 4, k + 2, 3, '#f4f4fa', 5)
        chama(t, 150, 86, 12, 5, k)
        chama(t, 160, 86, 10, 4, k + 1)
        if r is not None:
            for i in range(3):
                coracao(t, 140 + i * 12, 26 - ((r + i) % 4) * 3, ['#ff4f9e', '#ffd21e', '#ff8a12'][i])
            ang = r * math.pi / 2
            t.line(155, 18, 155 + round(math.cos(ang) * 9), topo + 2 + round(math.sin(ang) * 3), '#d8a468')
            t.line(156, 18, 156 + round(math.cos(ang) * 9), topo + 2 + round(math.sin(ang) * 3), '#a8743c')
        for x in range(132, 180):
            if (x + k) % 5 == 0:
                t.put(x, 91, '#ffb060')


# --- Página 4: a fogueira acesa ----------------------------------------------------------------------------------------------------
@pagina(4, heroi=(66, 103, 3, 'danca'), ponto=(164, 70, 44, 34), elenco=[('faisca', 148, 103, False), ('milho', 34, 102, False)])
class P04:
    @staticmethod
    def fundo(t):
        degrade(t, 0, 70, ['#0a0e2a', '#141c48', '#26306a', '#4a3a78'])
        estrelas(t, 70, 4, 0, 52)
        colinas(t, 78, 10, 22, '#1a2450', 0.4)
        colinas(t, 86, 7, 16, '#141c3a', 2.2)
        chao(t, 92, '#5a3a22', '#3e2616', '#7a5232', 13)
        t.rect(0, 92, W - 1, 94, '#2a1810')
        # silhuetas de gente dançando, dos dois lados da fogueira
        for x, y in ((24, 98), (198, 98), (210, 100)):
            t.rect(x - 2, y - 14, x + 2, y - 3, '#10142a')
            disco(t, x, y - 18, 3, '#10142a')
            t.rect(x - 3, y - 3, x - 1, y, '#10142a')
            t.rect(x + 1, y - 3, x + 3, y, '#10142a')

    @staticmethod
    def animar(t, k, r):
        bandeirinhas(t, 0, 14, 224, 18, k, sag=12, bal=1.4)
        bandeirinhas(t, 0, 30, 224, 26, k + 1, sag=10, bal=1.2, cores=('#ffd21e', '#ff4f9e', '#4aff8a', '#4ab8ff'))
        esc = 1.0 if r is None else (1.2, 1.35, 1.2, 1.1)[r]
        for x in range(72, 152):
            for y in (95, 98):
                if (x + y + k) % 3 == 0:
                    t.put(x, y, '#a85a2a')
        fogueira(t, 112, 100, k, 1.2 * esc)
        faiscas(t, 112, 98, 9 if r is None else 16, k, 3, 44 if r is None else 60)
        # a pilha de lenha (e a tora que voa para o fogo)
        for i in range(3):
            for j in range(3 - i):
                x = 170 + j * 12 + i * 6
                y = 100 - i * 7
                t.rect(x, y - 6, x + 11, y, '#7a4a24' if (i + j) % 2 else '#8a5a2c')
                t.rect(x, y - 6, x + 11, y - 5, '#a87a44')
                disco(t, x + 11, y - 3, 3, '#c8a064', '#8a6a3c')
                disco(t, x + 11, y - 3, 1, '#7a4a24')
        if r is not None:
            f = (r + 1) / 4
            lx = round(176 + (118 - 176) * f)
            ly = round(86 - 22 * math.sin(f * math.pi) + 8 * f)
            t.rect(lx - 7, ly - 2, lx + 7, ly + 2, '#8a5a2c')
            t.rect(lx - 7, ly - 2, lx + 7, ly - 2, '#c8a064')
            for i in range(4):
                t.put(lx + 8 + i, ly + (i % 2), '#ffd23a')
        # o bule de café esperando no canto
        t.rect(18, 90, 26, 98, '#6a6a7a')
        t.rect(20, 87, 24, 89, '#8a8a9a')
        fumaca(t, 22, 84, k, 3, '#f0f0f8', 4)


# --- Página 5: o balão de papel ----------------------------------------------------------------------------------------------------
@pagina(5, heroi=(60, 103, 3, 'danca'), ponto=(78, 12, 50, 60), elenco=[])
class P05:
    @staticmethod
    def fundo(t):
        degrade(t, 0, 80, ['#080a24', '#141a4a', '#2a2a70', '#5a3a88', '#a85a90'])
        estrelas(t, 90, 6, 0, 58)
        lua(t, 190, 26, 12)
        colinas(t, 86, 10, 21, '#241a48', 0.7)
        colinas(t, 94, 6, 15, '#1a1238', 2.4)
        chao(t, 98, '#1a1030', '#120a24', '#2a1a48', 16)
        casinha(t, 150, 78, 26, 18, '#4a3a68', '#2a1a3a', '#1a1030', '#ffd870')
        bandeirinhas(t, 120, 90, 200, 92, 0, sag=4, bal=0.6, cores=('#6a2a3a', '#6a5a20', '#2a5a3a', '#2a3a6a'))

    @staticmethod
    def animar(t, k, r):
        estrelas(t, 14, 31, 0, 56, k=k, cores=('#ffffff',))
        subir = 0 if r is None else (4, 10, 18, 26)[r]
        bob = (0, 1, 2, 1)[k]
        cx, cy = 102, 46 - subir - bob
        # no laço o balão fica estranho aos poucos: as cores mudam de quadro em quadro
        if r is None:
            cores = (('#e8403c', '#ffd23a'), ('#e8403c', '#ffd23a'), ('#e86ab8', '#ffd23a'), ('#a86aff', '#5af0ff'))[k]
        else:
            cores = (('#e86ab8', '#5af0ff'), ('#a86aff', '#9aff5a'), ('#5af0ff', '#ff4adc'), ('#ffffff', '#ff4adc'))[r]
        for ang in range(0, 360, 20):
            a = math.radians(ang + k * 5)
            t.put(cx + round(math.cos(a) * 24), cy + round(math.sin(a) * 22), cores[1])
        balao(t, cx, cy, 1.5, cores[0], cores[1], k)
        t.line(cx, cy + 28, 66, 88 - subir // 2, '#e8e0c8')
        if r is not None and r >= 2:
            for i in range(8):
                ang = (i / 8) * 2 * math.pi + r
                brilho(t, cx + round(math.cos(ang) * 30), cy + round(math.sin(ang) * 26), '#ffffff')
        for i in range(6):
            t.put(20 + i * 30 + round(math.sin(k + i) * 4), 84 + round(math.cos(k * 1.3 + i) * 4), '#e8ff8a')
