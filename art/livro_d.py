"""Páginas 16 a 20 do Cordel da Mandioca, o fim da história: o caminho de bandeirinhas, a ponte do arco-íris, o portão do arraiá, a quadrilha de
todo mundo e a festa do próprio jogo."""

import math
import random

from livro_base import W, H, pagina, degrade, elipse, disco, anel, ruido, nuvem, colinas, chao, brilho, mix, chama, fogueira, estrelas, lua, balao, \
    coracao, poligono, estrela5, grade, fumaca, bandeirinhas, faiscas, passaro, arvore, sol, cerca

CORES_FESTA = ('#ee2f3c', '#ffd21e', '#35a03a', '#3a6cf0', '#ff4f9e', '#ff8a12')


def ilha(t, cx, y, larg, k=0, raizes=True):
    """Uma ilha flutuante do jogo: terreiro de capim em cima, terra embaixo e raízes de mandioca penduradas."""
    meia = larg // 2
    for x in range(cx - meia, cx + meia + 1):
        f = (x - cx) / meia
        fundo = round(7 + 12 * max(0.0, 1 - f * f) ** 0.8)
        t.put(x, y, '#5aa84a')
        t.put(x, y + 1, '#3a8a3c')
        for yy in range(y + 2, y + fundo):
            t.put(x, yy, '#8a5a34' if (yy + x) % 5 else '#6a4224')
        t.put(x, y + fundo, '#3a2418')
    if raizes:
        for i, dx in enumerate((-meia // 2, -meia // 5, meia // 8, meia // 2)):
            comp = 6 + (i % 2) * 3
            t.line(cx + dx, y + 14, cx + dx, y + 14 + comp, '#4a2a18')
            elipse(t, cx + dx, y + 16 + comp, 2, 3, '#80482a', '#4a2418')


# --- Página 16: o caminho de bandeirinhas ------------------------------------------------------------------------------------------------------
@pagina(16, heroi=(36, 102, 3, 'danca'), ponto=(56, 34, 120, 60), elenco=[])
class P16:
    @staticmethod
    def fundo(t):
        degrade(t, 0, H - 1, ['#06020e', '#14083a', '#2a1060', '#5a2878'])
        estrelas(t, 90, 16, 0, H - 1)
        # névoa de cor (nebulosa) atrás do caminho
        for x in range(W):
            for y in range(20, 90):
                if math.sin(x * 0.07 + y * 0.09) + math.sin(x * 0.03 - y * 0.05) > 1.35 and (x + y) % 3 == 0:
                    t.put(x, y, '#7a3a98')
        # um chão de nuvem de onde a Mandioca sai
        elipse(t, 36, 108, 40, 6, '#c8b8e0', '#8a78b0', '#ffffff')

    @staticmethod
    def animar(t, k, r):
        # a ilha da festa, lá longe, brilhando (com fogueira e sanfona)
        ilha(t, 196, 30, 36, k)
        chama(t, 196, 29, 7, 3, k)
        for x in range(176, 216, 4):
            t.put(x + (k % 2), 22, CORES_FESTA[(x // 4) % 6])
        for i in range(3):
            f = ((k + i * 1.3) % 4) / 4
            nx, ny = 180 - round(f * 30), 20 - round(f * 6)
            t.rect(nx, ny, nx + 1, ny + 1, '#ffe27a')
            t.line(nx + 1, ny, nx + 1, ny - 4, '#ffe27a')
        # o caminho: um varal de bandeirinhas no ar, serpenteando da Mandioca até a ilha
        pontos = []
        for i in range(60):
            f = i / 59
            x = 40 + f * 140
            y = 94 - f * 56 + math.sin(f * math.pi * 3 + k * 0.4) * 7
            pontos.append((x, y))
        for i in range(len(pontos) - 1):
            t.line(pontos[i][0], pontos[i][1], pontos[i + 1][0], pontos[i + 1][1], '#e8d8b0')
            t.line(pontos[i][0], pontos[i][1] + 1, pontos[i + 1][0], pontos[i + 1][1] + 1, '#8a6a3a')
        for i in range(2, len(pontos) - 2, 4):
            x, y = pontos[i]
            alto = 9 - i // 12
            cor = CORES_FESTA[(i // 4) % 6]
            ond = round(math.sin(i * 0.5 + k * 1.57) * 1.5)
            aceso = r is not None and (i // 4) % 4 == r
            poligono(t, [(x - 3, y + 1), (x + 3, y + 1), (x + ond, y + alto)], mix(cor, '#ffffff', 0.55) if aceso else cor)
            if aceso:
                brilho(t, round(x), round(y) - 4, '#ffffff', 2)
                # a nota da bandeirinha sobe
                nx, ny = round(x) + 4, round(y) - 8 - r * 3
                t.rect(nx, ny, nx + 2, ny + 2, '#fff6b8')
                t.line(nx + 2, ny, nx + 2, ny - 5, '#fff6b8')
        # estrelas cadentes e poeira de estrela
        for i in range(4):
            x = (200 - ((k + i * 7) * 19) % 220)
            t.line(x, 8 + i * 12, x + 8, 11 + i * 12, '#ffffff')


# --- Página 17: a ponte do arco-íris ---------------------------------------------------------------------------------------------------------------
@pagina(17, heroi=(34, 82, 3, 'danca'), ponto=(30, 18, 170, 60), elenco=[('pipoca', 100, 92, False), ('amendoim', 160, 94, True)])
class P17:
    @staticmethod
    def fundo(t):
        degrade(t, 0, H - 1, ['#4a9ae8', '#7ac0f0', '#b8e0f8', '#fff0d0'])
        # a nuvem onde a Mandioca está e o mar de nuvens embaixo
        for x, y, e in ((20, 98, 1.6), (70, 104, 1.8), (120, 100, 1.5), (180, 106, 1.9), (214, 98, 1.4)):
            nuvem(t, x, y, e)

    @staticmethod
    def animar(t, k, r):
        # o arco-íris: sete faixas, que se movem com o quadro (e brilham na reação)
        faixas = ('#e8283a', '#ff8a1c', '#ffd21e', '#4ac84a', '#3ab8ff', '#4a4aff', '#a04aff')
        deslocar = 0 if r is None else r + 1
        for i, cor in enumerate(faixas):
            rx = 92 - i * 4
            ry = 54 - i * 4
            for ang in range(180, 360, 1):
                a = math.radians(ang)
                x, y = 114 + math.cos(a) * rx, 78 + math.sin(a) * ry
                t.put(round(x), round(y), mix(cor, '#ffffff', 0.45) if (r is not None and (ang // 8 + deslocar) % 7 == i % 7) else cor)
                t.put(round(x), round(y) + 1, cor)
        for i in range(10):
            a = math.radians(190 + i * 16 + k * 2)
            brilho(t, round(114 + math.cos(a) * 76), round(78 + math.sin(a) * 44), '#ffffff')
        # a ilha do jogo lá do outro lado da ponte
        ilha(t, 188, 74, 52, k)
        chama(t, 192, 73, 9, 4, k)
        for x in range(170, 208, 5):
            t.put(x, 62 + (x // 5 % 2), CORES_FESTA[(x // 5) % 6])
        t.rect(168, 62, 169, 73, '#6a4a2a')
        t.rect(208, 62, 209, 73, '#6a4a2a')
        # passarinhos e o sol baixo
        for i in range(3):
            passaro(t, 60 + i * 14 + k * 2, 14 + (i % 2) * 6, k + i, '#4a3a5a')
        sol(t, 24, 28, 7, k=k)


# --- Página 18: o portão do arraiá -----------------------------------------------------------------------------------------------------------------
LETRAS = {
    'A': ['.xx.', 'x..x', 'xxxx', 'x..x', 'x..x'], 'R': ['xxx.', 'x..x', 'xxx.', 'x.x.', 'x..x'], 'I': ['xxx', '.x.', '.x.', '.x.', 'xxx'],
}


def palavra(t, texto, x, y, cor, esc=1):
    for letra in texto:
        g = LETRAS[letra]
        for dy, linha in enumerate(g):
            for dx, c in enumerate(linha):
                if c == 'x':
                    t.rect(x + dx * esc, y + dy * esc, x + dx * esc + esc - 1, y + dy * esc + esc - 1, cor)
        x += (len(g[0]) + 1) * esc


@pagina(18, heroi=(88, 103, 3, 'danca'), ponto=(30, 36, 30, 36), elenco=[('pamonha', 170, 104, True)])
class P18:
    @staticmethod
    def fundo(t):
        degrade(t, 0, 80, ['#1a0e40', '#4a2470', '#c8506a', '#ffb060'])
        estrelas(t, 40, 17, 0, 34)
        colinas(t, 80, 10, 22, '#2a1a48', 0.9)
        chao(t, 90, '#6a4a2a', '#4a3018', '#8a6a3a', 18)
        # o portão de madeira: dois mourões e a viga de cima, com o nome do arraiá
        for x in (72, 148):
            t.rect(x, 22, x + 5, 96, '#8a5a30')
            t.rect(x, 22, x, 96, '#b07a44')
            t.rect(x + 5, 22, x + 5, 96, '#5a3a1c')
        t.rect(66, 14, 160, 30, '#a8703a')
        t.rect(66, 14, 160, 15, '#c8905a')
        t.rect(66, 29, 160, 30, '#6a4220')
        palavra(t, 'ARRAIA', 82, 18, '#ffd21e', 2)
        # a cerca dos lados e as barraquinhas lá no fundo
        cerca(t, 0, 66, 78, 14)
        cerca(t, 160, W - 1, 78, 14)
        for x, cor in ((14, '#e0343e'), (44, '#3a6cc8'), (186, '#e8b030'), (210, '#35a03a')):
            poligono(t, [(x - 9, 66), (x + 9, 66), (x + 6, 58), (x - 6, 58)], cor)
            t.rect(x - 7, 66, x + 7, 76, '#f4e4c0')

    @staticmethod
    def animar(t, k, r):
        bandeirinhas(t, 0, 6, 70, 14, k, sag=6, bal=1.4)
        bandeirinhas(t, 160, 14, 224, 6, k + 1, sag=6, bal=1.4)
        # lanternas de papel penduradas na viga
        for i, x in enumerate((86, 106, 126, 142)):
            y = 34 + (k + i) % 2
            t.line(x, 30, x, y, '#3a2418')
            elipse(t, x, y + 6, 5, 6, ['#ee2f3c', '#ffd21e', '#ff8a12', '#ff4f9e'][i], mix(['#ee2f3c', '#ffd21e', '#ff8a12', '#ff4f9e'][i], '#000000', 0.3),
                   '#ffffff')
            t.rect(x - 2, y, x + 2, y, '#3a2418')
            t.rect(x - 1, y + 12, x + 1, y + 13, '#3a2418')
        # o sino do portão, pendurado numa trave à esquerda
        t.rect(24, 30, 66, 33, '#8a5a30')
        sino_dx = 0 if r is None else (-4, 4, -2, 2)[r]
        t.line(44, 33, 44 + sino_dx // 2, 40, '#3a2418')
        poligono(t, [(44 + sino_dx - 8, 56), (44 + sino_dx + 8, 56), (44 + sino_dx + 5, 42), (44 + sino_dx - 5, 42)], '#e8b030')
        t.rect(44 + sino_dx - 9, 56, 44 + sino_dx + 9, 58, '#c8901c')
        disco(t, 44 + sino_dx, 59, 2, '#8a5a1c')
        t.rect(44 + sino_dx - 5, 42, 44 + sino_dx + 5, 43, '#ffd870')
        if r is not None:
            for i in range(5):
                brilho(t, 20 + i * 11 + (r % 2) * 3, 24 + (i % 2) * 18 - r * 2, ['#ffd21e', '#ff4f9e', '#4ac8ff', '#9aff3a', '#ffffff'][i])
            for i in range(14):
                t.rect(8 + i * 5, 70 - ((r * 4 + i * 3) % 24), 9 + i * 5, 71 - ((r * 4 + i * 3) % 24), CORES_FESTA[i % 6])
        # a plateia chegando de braço levantado, pelo portão afora
        for i, x in enumerate((100, 118, 134, 190, 204)):
            y = 98
            cor = ['#c8483a', '#3a78d8', '#3a9a58', '#8a4aa8', '#e8a030'][i]
            t.rect(x - 2, y - 14, x + 2, y - 4, cor)
            disco(t, x, y - 18, 3, '#e8b890')
            t.rect(x - 4, y - 21, x + 4, y - 20, '#e8c460')
            t.rect(x - 3, y - 4, x - 1, y, '#3a2418')
            t.rect(x + 1, y - 4, x + 3, y, '#3a2418')
            up = (k + i) % 2
            t.line(x - 3, y - 12, x - 6, y - 12 - up * 5, '#e8b890')
            t.line(x + 3, y - 12, x + 6, y - 17 + up * 5, '#e8b890')


# --- Página 19: a quadrilha de todo mundo --------------------------------------------------------------------------------------------------------
@pagina(19, heroi=(92, 104, 3, 'danca'), ponto=(10, 56, 56, 48),
        elenco=[('pamonha', 38, 100, False), ('milho', 70, 88, False), ('sopinha', 154, 90, True), ('cenoura', 180, 100, False), ('faisca', 142, 104, False),
                ('canjica', 76, 106, False), ('batata', 200, 88, True)])
class P19:
    @staticmethod
    def fundo(t):
        degrade(t, 0, 76, ['#0e0a30', '#2a1a58', '#7a3a78', '#e8806a'])
        estrelas(t, 40, 19, 0, 40)
        colinas(t, 78, 10, 24, '#2a1a48', 1.4)
        chao(t, 84, '#7a5232', '#5a3a22', '#9a6a3a', 20)
        # a roda de poeira da quadrilha
        elipse(t, 112, 100, 90, 11, '#9a6a3a', '#7a5232')

    @staticmethod
    def animar(t, k, r):
        bandeirinhas(t, 0, 10, 224, 12, k, sag=10, bal=1.6)
        bandeirinhas(t, 0, 24, 224, 22, k + 2, sag=8, bal=1.3, cores=('#ffd21e', '#ff4f9e', '#4aff8a', '#4ab8ff'))
        # a fogueira no meio, atrás dela, e os convidados que sobraram: o dragão de feijão e o rei, miudinhos
        fogueira(t, 132, 92, k, 0.9)
        faiscas(t, 132, 90, 6, k, 7, 30)
        # o dragão de feijão ao fundo à direita
        for i in range(8):
            x = 164 + i * 6
            y = 74 + round(math.sin(i * 0.8 + k * 0.5) * 3) - (i * 1 if i > 5 else 0)
            elipse(t, x, y, 4, 3.5, ['#7a2418', '#a8402a'][i % 2], '#2a1008', '#d8805a')
        elipse(t, 214, 68, 6, 4, '#7a2418', '#5a1810')
        t.put(217, 67, '#ffd23a')
        # o rei, miudinho, de coroa na outra ponta
        elipse(t, 14, 80, 7, 10, '#8a5a34', '#5a3a1c')
        elipse(t, 14, 77, 4, 5, '#f0e0b8')
        t.rect(9, 68, 19, 70, '#e8b030')
        for dx in (-3, 0, 3):
            t.rect(14 + dx, 66, 14 + dx, 68, '#ffd21e')
        t.put(12, 76, '#10100c')
        t.put(16, 76, '#10100c')
        t.line(12, 80, 16, 80, '#e8283a')
        # o chão gira: pontinhos de poeira correndo pela roda (ao contrário depois do clique)
        sentido = 1 if r is None else -1
        for i in range(16):
            a = (i / 16 * 2 * math.pi) + sentido * k * 0.4
            t.put(round(112 + math.cos(a) * 80), round(100 + math.sin(a) * 9), '#c8a468')
        if r is not None:
            for i in range(5):
                coracao(t, 40 + i * 36, 40 - ((r + i) % 4) * 3, CORES_FESTA[i])


# --- Página 20: a festa é sua ---------------------------------------------------------------------------------------------------------------------
@pagina(20, heroi=(112, 100, 3, 'comemora'), ponto=(6, 2, 212, 58),
        elenco=[('cenoura', 52, 74, False), ('inhame', 72, 76, False), ('batata', 92, 74, False), ('canjica', 150, 98, True), ('milho', 176, 100, True),
                ('pipoca', 28, 100, False), ('faisca', 192, 94, True)])
class P20:
    @staticmethod
    def fundo(t):
        degrade(t, 0, 78, ['#080a2a', '#141c58', '#2a2c80', '#5a3a98'])
        estrelas(t, 70, 20, 0, 50)
        lua(t, 196, 18, 9)
        # a roda-gigante ao fundo
        anel(t, 176, 44, 22, '#3a3a68', 1)
        for i in range(8):
            a = i * math.pi / 4
            t.line(176, 44, 176 + math.cos(a) * 22, 44 + math.sin(a) * 22, '#3a3a68')
        t.rect(172, 44, 180, 70, '#2a2a50')
        # o palco: telhado listrado e fundo azul de estrelas (o do jogo!)
        t.rect(30, 56, 110, 82, '#1a2058')
        degrade(t, 58, 80, ['#2a3a98', '#4a58c8'], 32, 108)
        for y in range(46, 56):
            for x in range(26, 116):
                t.put(x, y, '#e8b030' if (x // 6 + y) % 2 else '#e0343e')
        t.rect(26, 56, 116, 58, '#8a5a1c')
        t.rect(26, 56, 28, 84, '#6e3c1c')
        t.rect(114, 56, 116, 84, '#6e3c1c')
        t.rect(30, 82, 112, 88, '#8a5a30')
        # a placa do arraiá
        t.rect(48, 34, 94, 44, '#f4e4c0')
        t.rect(48, 34, 94, 35, '#c8a468')
        t.rect(48, 43, 94, 44, '#c8a468')
        palavra(t, 'ARRAIA', 52, 37, '#e0343e', 1)
        # a ilha: terreiro de capim e terra por baixo, com as raízes da mandioca
        chao(t, 88, '#6aa84a', '#4a8a3c', '#8ac860', 22, 92)
        for x in range(0, W):
            f = (x - 112) / 118
            fundo = round(4 + 14 * max(0.0, 1 - f * f))
            for yy in range(93, 93 + fundo):
                t.put(x, yy, '#8a5a34' if (yy + x) % 5 else '#6a4224')
        for i, x in enumerate((36, 70, 112, 150, 188)):
            t.line(x, 104, x, 110, '#4a2a18')

    @staticmethod
    def animar(t, k, r):
        bandeirinhas(t, 0, 4, 224, 8, k, sag=14, bal=1.8)
        bandeirinhas(t, 0, 20, 224, 18, k + 1, sag=12, bal=1.5, cores=('#ffd21e', '#ff4f9e', '#4aff8a', '#4ab8ff'))
        # a roda-gigante girando
        for i in range(8):
            a = i * math.pi / 4 + k * 0.1
            cx, cy = 176 + math.cos(a) * 22, 44 + math.sin(a) * 22
            t.rect(round(cx) - 1, round(cy), round(cx) + 1, round(cy) + 2, CORES_FESTA[i % 6])
        # a fogueira grande do lado direito
        fogueira(t, 148, 96, k, 1.0)
        faiscas(t, 148, 94, 8, k, 5, 40)
        # fogos de artifício: um por quadro, ou foguetes subindo e estourando na reação
        cores = ('#ff3a9a', '#ffd21e', '#4aff8a', '#3ab8ff', '#ff8a1c', '#b04aff')
        rodada = [(40, 22), (126, 12), (210, 34), (84, 30)]
        for i, (x, y) in enumerate(rodada):
            fase = (k + i) % 4
            cor = cores[(i + (r or 0)) % 6]
            for j in range(12):
                a = j * math.pi / 6
                d = 2 + fase * 3.5
                t.put(x + round(math.cos(a) * d), y + round(math.sin(a) * d), cor)
                if fase > 1:
                    t.put(x + round(math.cos(a) * (d - 3)), y + round(math.sin(a) * (d - 3)), '#ffffff')
        if r is not None:
            for i in range(5):
                x = 20 + i * 44 + r * 3
                for dy in range(0, 18, 2):
                    t.put(x, 56 - dy - r * 4, '#fff6b8')
                disco(t, x, 36 - r * 6, 3 + r * 3, cores[(i + r) % 6])
                disco(t, x, 36 - r * 6, 1 + r, '#ffffff')
        # a plateia (cabecinhas de chapéu de palha) na frente, balançando
        for i in range(24):
            x = 4 + i * 9 + (k + i) % 2
            y = 108 + (i % 3)
            disco(t, x, y, 3, ['#c89a60', '#e8c490', '#a8743c'][i % 3])
            t.rect(x - 4, y - 4, x + 4, y - 3, '#e8c460')
            t.rect(x - 2, y - 6, x + 2, y - 4, '#e8c460')
        # balões soltos pelo céu
        for x, y, c1, c2 in ((14, 40, '#ff3a9a', '#ffd21e'), (130, 36, '#3ab8ff', '#4aff8a'), (206, 56, '#ff8a1c', '#b04aff')):
            balao(t, x, y - ((k + x) % 3), 0.6, c1, c2, k, cesto=False, luz=False)
