"""Palco do Forró: o palco (cortinas, letreiro, holofotes, chão de tábua), o trio (sanfoneiro, zabumbeiro e triangueiro, desenhados
com o mesmo sistema dos moradores da casa) e as notas das 3 pistas.
"""

from PIL import Image, ImageDraw

import casa
import janelas
from casa import Tela, rgb, PROPS, ATIVIDADES, seq6
from render import outline

W, H = 176, 120
MUSICOS_X = [30, 88, 146]              # o centro de cada pista (e do músico dela)
PES_Y = 114                            # onde os músicos pisam
ALVO_Y = 70                            # a linha onde a nota tem de ser acertada (em cima da cabeça dos músicos)
TOPO_Y = 22                            # de onde as notas caem (embaixo do letreiro)
LETRAS = {
    'F': ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
    'O': ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    'R': ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
}

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
    """3 notas (13x13), uma por pista: triângulo (azul), zabumba (vermelha) e sanfona (amarela)."""
    cores = [('#56c8ee', '#2a8ac0'), ('#ee4c4c', '#9a1a2e'), ('#ffd21e', '#c89a10')]
    quadros = []
    for lane, (cor, sombra) in enumerate(cores):
        t = Tela(13, 13)
        janelas.elipse(t, 6, 6, 6, 6, cor, sombra)
        t.rect(3, 2, 4, 3, '#ffffff')
        if lane == 0:
            t.line(6, 3, 3, 9, '#ffffff')
            t.line(6, 3, 9, 9, '#ffffff')
            t.line(3, 9, 9, 9, '#ffffff')
        elif lane == 1:
            t.rect(3, 4, 9, 8, '#ffffff')
            t.rect(3, 6, 9, 6, '#9a1a2e')
        else:
            for x in (3, 5, 7, 9):
                t.rect(x, 4, x, 8, '#ffffff')
        quadros.append(outline(t.im))
    return quadros


def fundo():
    t = Tela(W, H)
    janelas.degrade(t, 0, 0, W - 1, 100, ['#120d2c', '#1a1438', '#221a44', '#2a2058', '#322868', '#3a3078', '#443a88'])
    janelas.estrelas(t, 14, 2, W - 14, 40, 30, 21)
    # Holofotes: cones de luz translúcidos sobre cada músico.
    luz = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    desenho = ImageDraw.Draw(luz)
    for cx in MUSICOS_X:
        desenho.polygon([(cx - 3, 0), (cx + 3, 0), (cx + 26, 112), (cx - 26, 112)], fill=(255, 240, 160, 38))
        desenho.polygon([(cx - 2, 0), (cx + 2, 0), (cx + 12, 112), (cx - 12, 112)], fill=(255, 250, 200, 34))
    t.im.alpha_composite(luz)
    # Letreiro FORRÓ.
    t.rect(52, 3, 123, 19, '#6e3c1c')
    t.rect(53, 4, 122, 18, '#8a5a34')
    t.rect(54, 5, 121, 17, '#3a2418')
    for k, letra in enumerate('FORRO'):
        for y, linha in enumerate(LETRAS[letra]):
            for x, c in enumerate(linha):
                if c == '1':
                    t.put(59 + k * 12 + x, 6 + y, '#ffd21e')
    for x in range(56, 120, 6):
        t.put(x, 4, '#fff2b0')
        t.put(x, 18, '#fff2b0')
    # Varal de bandeirinhas e cortinas dos lados.
    janelas.varal(t, 2, W - 3, 30, 44, 12)
    for x0, x1 in ((0, 11), (W - 12, W - 1)):
        t.rect(x0, 0, x1, 106, '#a01c34')
        for x in range(x0 + 1, x1, 3):
            t.rect(x, 0, x, 106, '#6a1020')
        t.rect(x0, 0, x1, 3, '#ffd860')
        t.rect(x0, 104, x1, 106, '#ffd860')
    t.rect(0, 0, W - 1, 1, '#ffd860')
    # Palco de tábuas e as luzinhas da frente.
    t.rect(0, 100, W - 1, H - 1, '#a8703a')
    for k, x in enumerate(range(0, W, 11)):
        t.rect(x, 100, x, H - 1, '#7c4a24')
    t.rect(0, 100, W - 1, 100, '#d8a060')
    t.rect(0, 101, W - 1, 102, '#8a5a30')
    t.rect(0, H - 4, W - 1, H - 1, '#5c3820')
    for x in range(4, W, 12):
        t.rect(x, H - 4, x + 2, H - 3, '#ffe27a')
    return t.im


def exportar(add):
    return {
        'fundo': add('janela-palco-fundo', fundo()),
        'trio': {**add('janela-palco-trio', trio()), 'quadros': casa.QUADROS},
        'notas': add('janela-palco-notas', notas()),
        'x': MUSICOS_X, 'pes': PES_Y, 'alvo': ALVO_Y, 'topo': TOPO_Y, 'w': W, 'h': H,
    }
