"""Palco do Forró: o palco (cortinas, letreiro, holofotes, chão de tábua), o trio (sanfoneiro, zabumbeiro e triangueiro, desenhados
com o mesmo sistema dos moradores da casa) e as notas das 3 pistas.
"""

import math
import random

from PIL import Image, ImageDraw

import ambiente as amb
import casa
import janelas
from casa import Tela, rgb, PROPS, ATIVIDADES, seq6
from render import outline

W, H = 176, 120
MUSICOS_X = [30, 88, 146]              # o centro de cada pista (e do músico dela)
PES_Y = 108                            # onde os músicos pisam
ALVO_Y = 62                            # a linha onde a nota tem de ser acertada (em cima da cabeça dos músicos)
TOPO_Y = 29                            # de onde as notas caem (embaixo do letreiro)
LETRAS = {
    'F': ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
    'O': ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    'R': ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
}

LETREIRO = (50, 9, 125, 27)             # o retângulo do letreiro FORRÓ (as lâmpadas ficam na borda dele)


def lampadas_do_letreiro():
    """Onde ficam as lâmpadas da moldura do letreiro (de seis em seis pixels, em volta), na ordem em que o pisca-pisca corre."""
    x0, y0, x1, y1 = LETREIRO
    pontos = [(x, y0) for x in range(x0 + 3, x1 - 2, 6)]
    pontos += [(x1, y) for y in range(y0 + 3, y1 - 2, 6)]
    pontos += [(x, y1) for x in range(x1 - 3, x0 + 2, -6)]
    pontos += [(x0, y) for y in range(y1 - 3, y0 + 2, -6)]
    return [list(p) for p in pontos]


# O trio: os visuais fixos e as atividades de cada um (as peças e os quadros seguem casa.py).
VISUAIS = [
    dict(forma='gorducha', casca='dourada', chapeu='cowboy', roupa='r', padrao='xadrez', olhos='feliz', boca='sorriso', extra='bigode', papel=None),
    dict(forma='media', casca='ruiva', chapeu='bandana', roupa='b', padrao='listras', olhos='grande', boca='aberta', extra='nenhum', papel=None),
    dict(forma='baixinha', casca='marrom', chapeu='palha', roupa='l', padrao='suspensorio', olhos='cilios', boca='sorriso', extra='sardas', papel=None),
]
ATIVIDADES_TRIO = ['sanfona_p', 'zabumba_p', 'triangulo_p']

PROPS.update({
    'sanfona_f': ['kkkkkkkkkkkkkk', 'rrwrwrwrkGkGkr', 'rrwrwrwrkkkkkr', 'rrwwwwwrGkGkGr', 'rrrrrrrrkkkkkr', 'kkkkkkkkkkkkkk'],
    'sanfona_a': ['kkkkkkkkkkkkkkkkkkkk', 'rrwrwrwrkGkGkGkGkGrr', 'rrwrwrwrkkkkkkkkkkrr', 'rrwwwwwrGkGkGkGkGkrr', 'rrrrrrrrkkkkkkkkkkrr', 'kkkkkkkkkkkkkkkkkkkk'],
    'zabumba': ['..nnnnnnnn..', '.nwwwwwwwwn.', 'nwwwwwwwwwwn', 'nrnrnrnrnrnn', 'nrnrnrnrnrnn', '.nnnnnnnnnn.'],
    'baqueta': ['.n', '.n', 'nn'],
    'triangulo': ['...ss...', '..s..s..', '.s....s.', 'ssssssss'],
    'bastao': ['sss'],
})
ATIVIDADES.update({
    'sanfona_p': dict(fps=4, bob=[0, -1, 0, -1, 0, -1], sway=[0, 1, 0, -1, 0, 1], L=[(-5, 3), (-6, 3), (-5, 3), (-6, 3), (-5, 3), (-6, 3)],
                      R=[(5, 3), (6, 3), (5, 3), (6, 3), (5, 3), (6, 3)], olhos='feliz', boca='sorriso',
                      props=[(seq6('sanfona_f', 'sanfona_a', 'sanfona_f', 'sanfona_a', 'sanfona_f', 'sanfona_a'), 'C', [-7, -10, -7, -10, -7, -10], 3, 'mao')], fx=None),
    'zabumba_p': dict(fps=4, bob=[0, -1, 0, -1, 0, -1], L=[(-3, 4)] * 6, R=[(5, -4), (4, 3), (5, -4), (4, 3), (5, -4), (4, 3)], boca='aberta',
                      props=[('zabumba', 'C', -6, 3, 'frente'), ('baqueta', 'R', -1, -1, 'mao')], fx=None),
    'triangulo_p': dict(fps=4, bob=[0, 0, -1, 0, 0, -1], L=[(-3, -2)] * 6, R=[(3, 1), (5, -3), (3, 1), (5, -3), (3, 1), (5, -3)], boca='sorriso',
                        props=[('triangulo', 'L', -4, -1, 'mao'), ('bastao', 'R', -1, -1, 'mao')], fx=None),
})


def trio():
    """21 quadros (28x34): para cada músico, 6 do loop e 1 de empolgação (braços para cima)."""
    quadros = []
    for visual, atividade in zip(VISUAIS, ATIVIDADES_TRIO):
        for f in range(casa.QUADROS):
            quadros.append(casa.quadro(visual, atividade, f))
        quadros.append(casa.quadro(visual, atividade, 0, reacao=True))
    return quadros


def notas():
    """3 notas (15x15), uma por pista: triângulo (azul), zabumba (vermelha) e sanfona (amarela). Cada uma é uma bola de vidro com brilho e o símbolo dentro."""
    cores = [('#56c8ee', '#2a8ac0', '#a8ecff'), ('#ee4c4c', '#9a1a2e', '#ffa0a0'), ('#ffd21e', '#c89a10', '#fff2a0')]
    quadros = []
    for lane, (cor, sombra, luz) in enumerate(cores):
        t = Tela(15, 15)
        janelas.elipse(t, 7, 7, 7, 7, cor, sombra)
        # Luz em cima e à esquerda, sombra embaixo e à direita.
        for y in range(15):
            for x in range(15):
                if ((x - 7) / 7) ** 2 + ((y - 7) / 7) ** 2 <= 1 and ((x - 5) ** 2 + (y - 4) ** 2) < 14:
                    t.put(x, y, luz) if (x + y) % 2 == 0 else None
        t.rect(3, 2, 5, 3, '#ffffff')
        t.put(2, 4, '#ffffff')
        if lane == 0:
            t.line(7, 4, 4, 10, '#ffffff')
            t.line(7, 4, 10, 10, '#ffffff')
            t.line(4, 10, 10, 10, '#ffffff')
            t.put(7, 3, '#ffffff')
        elif lane == 1:
            t.rect(4, 5, 10, 9, '#ffffff')
            t.rect(4, 7, 10, 7, '#9a1a2e')
            t.rect(5, 10, 9, 10, '#ffffff')
            t.put(4, 4, '#26242e')
            t.put(10, 4, '#26242e')
        else:
            for x in (4, 6, 8, 10):
                t.rect(x, 5, x, 10, '#ffffff')
            t.rect(3, 4, 11, 4, '#c89a10')
            t.rect(3, 11, 11, 11, '#c89a10')
        quadros.append(outline(t.im))
    return quadros


def alvo():
    """O círculo onde a nota tem de ser acertada (28x28): parado (anel dourado com quatro pontas e pino de luz) e aceso (anel branco com raios)."""
    quadros = []
    for aceso in range(2):
        t = Tela(28, 28)
        c = 13.5
        for y in range(28):
            for x in range(28):
                d = ((x - c) ** 2 + (y - c) ** 2) ** 0.5
                if aceso:
                    if 9.6 <= d <= 11.6:
                        t.put(x, y, '#ffffff')
                    elif 8.4 <= d < 9.6:
                        t.put(x, y, '#ffe27a')
                else:
                    if 10 <= d <= 11.3:
                        t.put(x, y, '#ffe27a' if (x + y) % 4 else '#fff8c8')
                    elif 8.8 <= d < 10 and (x + y) % 2 == 0:
                        t.put(x, y, '#8a6a1c')
        marca = '#ffd21e' if not aceso else '#ffffff'
        t.rect(13, 1, 14, 3, marca)
        t.rect(13, 24, 14, 26, marca)
        t.rect(1, 13, 3, 14, marca)
        t.rect(24, 13, 26, 14, marca)
        if aceso:
            for k in range(12, 14):
                for a in (0.8, 2.4, 3.9, 5.5):
                    t.put(c + math.cos(a) * k, c + math.sin(a) * k, '#fff2b0')
        quadros.append(t.im)
    return quadros


def monitor():
    """Caixa de som de chão (monitor de palco), 2 quadros: parada e com o cone para a frente (bate no ritmo)."""
    quadros = []
    for q in range(2):
        t = Tela(16, 9)
        t.rect(0, 2, 15, 8, '#26242e')
        for k in range(3):
            t.rect(k, 2 - k // 1, 15 - k, 2 - k // 1, '#26242e')
        t.rect(1, 3, 14, 7, '#3a3848')
        t.rect(1, 3, 14, 3, '#5a5870')
        cone = 4 if not q else 5
        t.rect(8 - cone // 2, 4, 8 + cone // 2, 6, '#161420')
        t.rect(7, 5, 8, 5, '#8a8aa0' if not q else '#c8c8e0')
        t.put(2, 4, '#ff5a5a')
        quadros.append(t.im)
    return quadros


def plateia():
    """A plateia na frente do palco, só as silhuetas (cabeças com chapéu e mãos para cima), em 2 quadros que balançam."""
    quadros = []
    for q in range(2):
        t = Tela(W, 10)
        gerador = random.Random(9)
        for x in range(2, W - 6, 9):
            cx = x + 3 + gerador.randrange(-1, 2)
            y0 = 4 + (1 if (x // 9 + q) % 2 else 0) + gerador.randrange(0, 2)
            cor = ('#120d24', '#1a1230', '#0e0a1c')[(x // 9) % 3]
            # Cabeça, ombros e um chapéu (palha, couro ou lenço).
            for yy in range(y0, y0 + 5):
                t.rect(cx - 2, yy, cx + 2, yy, cor)
            t.rect(cx - 5, y0 + 5, cx + 5, 9, cor)
            kind = (x // 9) % 4
            if kind == 0:
                t.rect(cx - 4, y0 - 1, cx + 4, y0, cor)
                t.rect(cx - 2, y0 - 3, cx + 2, y0 - 2, cor)
            elif kind == 1:
                t.rect(cx - 3, y0 - 1, cx + 3, y0, cor)
            elif kind == 2:
                t.rect(cx - 3, y0 - 2, cx + 3, y0 - 1, cor)
            if (x // 9 + q) % 3 == 0:   # mão para cima, com uma luzinha de celular
                t.rect(cx + 4, y0 - 3, cx + 5, y0 + 4, cor)
                t.put(cx + 4, y0 - 4, '#fff2b0')
            # Um fiozinho de luz quente na borda de cima (vindo do palco).
            for dx in range(-2, 3):
                t.put(cx + dx, y0, '#3a2a58')
        quadros.append(t.im)
    return quadros


def varal():
    """O varal de bandeirinhas em três quadros (as bandeiras balançam), um pouco mais escuro para não competir com as notas."""
    cores = ['#c8283a', '#d8a818', '#2a8030', '#3058c8', '#c83a80', '#c86a10']
    quadros = []
    for f in range(3):
        t = Tela(W, 24)
        gerador = random.Random(12)
        x0, x1, ponta, meio = 12, W - 13, 8, 15
        pontos = []
        for x in range(x0, x1 + 1):
            u = (x - x0) / (x1 - x0)
            pontos.append((x, round(ponta + (meio - ponta) * 4 * u * (1 - u))))
        for x, y in pontos:
            t.put(x, y, '#2a1810')
        for k, (x, y) in enumerate(pontos):
            if k % 6 == 3:
                cor = cores[gerador.randrange(len(cores))]
                balanco = ((k // 6 + f) % 3) - 1
                t.rect(x - 1, y + 1, x + 1, y + 2, cor)
                t.put(x + balanco, y + 3, cor)
        quadros.append(t.im)
    return quadros


def chita(t, x0, y0, x1, y1):
    """O pano de fundo de chita (estampa de florzinha escura em fileiras alternadas)."""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            t.put(x, y, '#2a1238' if (x + y) % 5 else '#2e143c')
    for ry, y in enumerate(range(y0 + 2, y1 + 1, 10)):
        for x in range(x0 + (5 if ry % 2 else 0), x1 + 1, 10):
            for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)):
                t.put(x + dx, y + dy, '#5a2a58')
            t.put(x, y, '#a8782a')
            t.put(x + 3, y + 4, '#3a2a68')
            t.put(x - 3, y + 4, '#4a2260')


def cortina(t, x0, x1, esquerda):
    """Cortina de veludo vermelho com dobras e uma presilha dourada com borla."""
    for x in range(x0, x1 + 1):
        dobra = (x - x0) % 4
        cor = ('#a01c34', '#8a1228', '#c8283e', '#8a1228')[dobra]
        t.rect(x, 0, x, 106, cor)
    # As dobras ficam mais fechadas perto da presilha.
    meio = 66
    for y in range(meio - 8, meio + 9):
        pinça = (8 - abs(y - meio)) // 3
        for x in range(x0, x1 + 1):
            if (x - x0) % 4 in (1, 3) and pinça > 0:
                t.put(x + (pinça if esquerda else -pinça), y, '#6a1020')
    cx = x1 if esquerda else x0
    t.rect(cx - 2, meio - 1, cx + 2, meio + 1, '#ffd860')
    t.rect(cx - 1, meio + 2, cx + 1, meio + 8, '#ffd860')
    for k in range(2, 9, 2):
        t.put(cx - 1, meio + k, '#b8892a')
    t.rect(cx - 2, meio + 8, cx + 2, meio + 9, '#ffd860')
    t.rect(x0, 0, x1, 3, '#ffd860')
    t.rect(x0, 104, x1, 106, '#ffd860')


def fundo():
    t = Tela(W, H)
    chita(t, 0, 0, W - 1, 94)
    # Madeira do fundo do palco e a faixa de cima (bandô) com franja dourada.
    amb.gradiente(t, 0, 0, W - 1, 94, '#0a0618', 0.45, 0.05, 6)
    # Letreiro FORRÓ com a moldura de lâmpadas (as lâmpadas acendem pela janela).
    sx0, sx1, sy0, sy1 = 50, 125, 9, 27
    t.rect(sx0 - 1, 0, sx0, sy0, '#5a3a20')
    t.rect(sx1, 0, sx1 + 1, sy0, '#5a3a20')
    t.rect(sx0, sy0, sx1, sy1, '#4a2c18')
    t.rect(sx0 + 1, sy0 + 1, sx1 - 1, sy1 - 1, '#7a4a28')
    t.rect(sx0 + 2, sy0 + 2, sx1 - 2, sy1 - 2, '#2a1810')
    for k, letra in enumerate('FORRO'):
        for y, linha in enumerate(LETRAS[letra]):
            for x, c in enumerate(linha):
                if c == '1':
                    px, py = 57 + k * 12 + x, 12 + y
                    t.put(px, py, '#ffd21e')
                    t.put(px + 1, py + 1, '#a8781a')
    for x in range(57 + 4 * 12 + 1, 57 + 4 * 12 + 4):       # acento do Ó
        t.put(x + 2, 10, '#ffd21e')
    t.put(57 + 4 * 12 + 4, 9, '#ffd21e')
    t.put(57 + 4 * 12 + 3, 10, '#ffd21e')
    # Chão de tábuas com a luz do palco: fileiras mais altas para a frente.
    t.rect(0, 94, W - 1, 110, '#a8703a')
    for y0, y1 in ((94, 98), (99, 103), (104, 108)):
        for x in range(0, W):
            if (x + y0 * 3) % 22 == 0:
                t.rect(x, y0, x, y1, '#7c4a24')
        t.rect(0, y1, W - 1, y1, '#6e4020')
        t.rect(0, y0, W - 1, y0, '#c88a50' if y0 != 94 else '#d8a060')
    for x in range(0, W, 7):
        t.put(x, 97, '#b87a40')
        t.put(x + 3, 102, '#b87a40')
    amb.sombra(t, W // 2, 108, 80, 1, 0.3, '#2a1408')
    # Cortinas dos lados, bandô de cima e a beira da frente do palco.
    cortina(t, 0, 13, True)
    cortina(t, W - 14, W - 1, False)
    t.rect(0, 0, W - 1, 6, '#a01c34')
    for x in range(0, W):
        t.rect(x, 7, x, 7 + (1 if x % 6 < 3 else 0) + (1 if x % 12 < 6 else 0), '#a01c34')
        t.put(x, 0, '#ffd860')
        t.put(x, 6, '#6a1020')
        if x % 3 == 0:
            t.put(x, 9 + (x // 3) % 2, '#ffd860')
    t.rect(0, 109, W - 1, 111, '#5c3820')
    t.rect(0, 109, W - 1, 109, '#8a5a30')
    t.rect(0, 112, W - 1, H - 1, '#0e0a1c')
    return t.im


def exportar(add):
    return {
        'fundo': add('janela-palco-fundo', fundo()),
        'trio': {**add('janela-palco-trio', trio()), 'quadros': casa.QUADROS},
        'notas': add('janela-palco-notas', notas()),
        'alvoImg': add('janela-palco-alvo', alvo()),
        'monitor': add('janela-palco-monitor', monitor()),
        'plateia': add('janela-palco-plateia', plateia()),
        'varal': add('janela-palco-varal', varal()),
        'letreiro': LETREIRO, 'lampadas': lampadas_do_letreiro(),
        'x': MUSICOS_X, 'pes': PES_Y, 'alvo': ALVO_Y, 'topo': TOPO_Y, 'w': W, 'h': H,
    }
