"""O Rafael (segredo do jogo: digite "yeye" com o jogo em foco): um amigo de óculos, barba e jaqueta preta de nylon andando pela festa
com uma caneca de quentão na mão, que grita "YEAH YEAH" quando clica nele. É um desenho de pixel feito a partir de uma foto (topo da
cabeça limpo com cabelo só nas laterais, óculos finos retangulares, barba castanha com fios grisalhos, jaqueta preta acolchoada).

12 quadros (olhando para a frente; a festa espelha para andar para os dois lados): 0 parado, 1 a 4 andando, 5 a 7 bebendo o quentão,
8 a 10 gritando (braços para cima, boca aberta, pulinho) e 11 piscando.
"""

import math

from casa import Tela
from render import outline

W, H = 24, 32
CX = 12
COR = {
    'pele': '#ecbc98', 'pelesombra': '#cc9672', 'pelebrilho': '#f8d4b4', 'cabelo': '#3a2a22', 'cabelob': '#5a463a',
    'barba': '#74503a', 'barbasombra': '#523624', 'barbacinza': '#b0a692', 'oculos': '#2c2c36', 'oculosfino': '#5c606e', 'lente': '#f2e6dc', 'brilho': '#d6ecfa', 'olho': '#2a1a14',
    'boca': '#a03a34', 'bocafundo': '#5a1816', 'dente': '#fff4e8', 'jaqueta': '#363640', 'jaquetasombra': '#202028',
    'jaquetabrilho': '#50505e', 'ziper': '#9a9aaa', 'jeans': '#3e5290', 'jeanssombra': '#2c3c6c', 'sapato': '#2a2222',
    'caneca': '#c06c30', 'canecasombra': '#8e4c20', 'canecabrilho': '#e89a52', 'quentao': '#7a1c24', 'quentaobrilho': '#b03a30',
    'vapor': '#f6f6fc', 'vaporsombra': '#c8ccde',
}


def c(nome):
    return COR[nome]


def cabeca(t, cy, boca='fechada', olhos='abertos', cx=CX):
    """A cabeça: topo sem cabelo (com um brilho), cabelo só nas laterais, óculos finos e a barba que desce até o peito."""
    for y in range(-6, 7):
        for x in range(-5, 6):
            if (x / 5.6) ** 2 + (y / 6.4) ** 2 <= 1.0:
                cor = c('pele')
                if x >= 4 or (y >= 5 and x >= 3):
                    cor = c('pelesombra')
                t.put(cx + x, cy + y, cor)
    for x in (-1, 0):
        t.put(cx + x, cy - 5, c('pelebrilho'))
    t.put(cx - 2, cy - 4, c('pelebrilho'))
    # orelhas e o cabelo das laterais
    for y in (0, 1, 2):
        t.put(cx - 6, cy + y, c('pelesombra'))
        t.put(cx + 6, cy + y, c('pelesombra'))
    for y in range(-3, 2):
        t.put(cx - 5, cy + y, c('cabelo'))
        t.put(cx + 5, cy + y, c('cabelo'))
    for x in (-4, 4):
        t.put(cx + x, cy - 3, c('cabelo'))
    t.put(cx - 5, cy - 4, c('cabelob'))
    t.put(cx + 5, cy - 4, c('cabelob'))
    # sobrancelhas
    alto = -1 if olhos == 'animado' else 0
    for x in (-4, -3, -2, 2, 3, 4):
        t.put(cx + x, cy - 2 + alto, c('cabelo'))
    # óculos: armação fina (4 de largura por 3 de altura) e a ponte no meio
    for lado in (-1, 1):
        x0 = cx - 5 if lado < 0 else cx + 2
        for x in range(x0, x0 + 4):
            t.put(x, cy - 1, c('oculos'))
            t.put(x, cy + 1, c('oculosfino'))
        t.put(x0, cy, c('oculos'))
        t.put(x0 + 3, cy, c('oculos'))
        t.put(x0 + 1, cy, c('lente'))
        t.put(x0 + 2, cy, c('lente'))
        t.put(x0 + 1, cy + 1, c('brilho'))
    t.put(cx - 1, cy - 1, c('oculos'))
    t.put(cx, cy - 1, c('oculos'))
    t.put(cx + 1, cy - 1, c('oculos'))
    t.put(cx - 6, cy - 1, c('oculos'))     # hastes
    t.put(cx + 6, cy - 1, c('oculos'))
    if olhos == 'abertos':
        t.put(cx - 3, cy, c('olho'))
        t.put(cx + 3, cy, c('olho'))
    elif olhos == 'fechados':
        for x in (-4, -3, 3, 4):
            t.put(cx + x, cy, c('barbasombra'))
    elif olhos == 'animado':                # olhos fechados de alegria: ^ ^
        for x0 in (-4, 3):
            t.put(cx + x0, cy, c('olho'))
            t.put(cx + x0 + 1, cy - 1 + 0, c('olho'))
    t.put(cx, cy + 2, c('pelesombra'))
    t.put(cx + 1, cy + 2, c('pelesombra'))
    # a barba: do bigode até o queixo, descendo mais que o rosto, com uns fios grisalhos
    larg = {3: 5, 4: 5, 5: 5, 6: 4, 7: 4, 8: 3, 9: 2}
    for y, meia in larg.items():
        for x in range(-meia, meia + 1):
            cor = c('barba') if (x + y) % 4 else c('barbasombra')
            if y >= 7 and (x * 3 + y * 2) % 5 == 0:
                cor = c('barbacinza')
            if y == 3 and abs(x) <= 3:
                cor = c('barbasombra')          # o bigode
            t.put(cx + x, cy + y, cor)
    # a boca no meio da barba
    if boca == 'aberta':
        t.rect(cx - 2, cy + 4, cx + 1, cy + 6, c('bocafundo'))
        t.rect(cx - 2, cy + 4, cx + 1, cy + 4, c('dente'))
        t.rect(cx - 1, cy + 6, cx, cy + 6, c('boca'))
    elif boca == 'bebendo':
        pass
    else:
        t.rect(cx - 1, cy + 5, cx + 1, cy + 5, c('boca'))
        t.put(cx - 2, cy + 4, c('barbasombra'))
        t.put(cx + 2, cy + 4, c('barbasombra'))


def tronco(t, topo, cx=CX):
    """A jaqueta de nylon acolchoada: gola alta, costuras, zíper e a plaquinha do peito."""
    for y in range(10):
        for x in range(-6, 6):
            cor = c('jaqueta')
            if x < -3:
                cor = c('jaquetabrilho')
            elif x > 3:
                cor = c('jaquetasombra')
            if y % 3 == 2:
                cor = c('jaquetasombra')
            t.put(cx + x, topo + y, cor)
    for y in range(2, 10):
        t.put(cx + 1, topo + y, c('ziper') if y % 2 else c('jaquetasombra'))
    t.rect(cx + 3, topo + 5, cx + 4, topo + 6, c('ziper'))
    t.rect(cx - 5, topo, cx + 4, topo + 1, c('jaquetasombra'))     # a gola
    t.rect(cx - 5, topo, cx - 4, topo, c('jaquetabrilho'))


def manga(t, x0, y0, x1, y1, cx=CX):
    """Um braço de jaqueta (linha grossa de 2 pixels) de (x0, y0) até (x1, y1)."""
    t.line(cx + x0, y0, cx + x1, y1, c('jaqueta'))
    t.line(cx + x0 + 1, y0, cx + x1 + 1, y1, c('jaquetasombra'))
    t.line(cx + x0 - 0, y0 + 1, cx + x1 - 0, y1 + 1, c('jaqueta'))


def mao(t, x, y, cx=CX):
    t.rect(cx + x, y, cx + x + 1, y + 1, c('pele'))


def caneca(t, x, y, vapor=0, cx=CX, inclinada=False):
    """A caneca de barro (5 x 5) com o quentão escuro por cima e o vapor subindo; (x, y) é o canto de cima à esquerda."""
    X = cx + x
    t.rect(X, y, X + 4, y + 4, c('caneca'))
    t.rect(X, y, X + 1, y + 4, c('canecabrilho'))
    t.rect(X + 4, y, X + 4, y + 4, c('canecasombra'))
    t.rect(X, y + 4, X + 4, y + 4, c('canecasombra'))
    t.rect(X, y, X + 4, y, c('quentao'))
    t.put(X + 1, y, c('quentaobrilho'))
    t.put(X + 5, y + 1, c('canecasombra'))            # a alça
    t.put(X + 6, y + 2, c('canecasombra'))
    t.put(X + 5, y + 3, c('canecasombra'))
    if not inclinada:
        for i in range(3):
            dx = round(math.sin(vapor * 1.6 + i * 1.5))
            t.put(X + 3 + dx, y - 2 - i, c('vapor') if i != 1 else c('vaporsombra'))


def pernas(t, passo, lift=0, cx=CX):
    """Jeans e sapatos. `passo` -1, 0 ou 1: a perna do lado sobe um pouco e a outra desce."""
    for lado, x0 in ((-1, cx - 5), (1, cx + 1)):
        sobe = 2 if passo == lado else 0
        for y in range(3 - min(sobe, 2)):
            t.rect(x0 + (0 if lado < 0 else 1), 27 - lift + y, x0 + (2 if lado < 0 else 3), 27 - lift + y,
                   c('jeans') if lado < 0 else c('jeanssombra'))
        sapato_y = 30 - lift - sobe
        t.rect(x0, sapato_y, x0 + 3, sapato_y + 1, c('sapato'))
        t.put(x0 + (0 if lado < 0 else 3), sapato_y, c('sapato'))


def quadro(pose='parado', k=0):
    t = Tela(W, H)
    bob = 0
    lift = 0
    passo = 0
    boca = 'fechada'
    olhos = 'abertos'
    if pose == 'anda':
        passo = (1, 0, -1, 0)[k]
        bob = (0, 1, 0, 1)[k]
    elif pose == 'bebe':
        olhos = 'fechados' if k == 1 else 'abertos'
    elif pose == 'pisca':
        olhos = 'fechados'
    elif pose == 'yeah':
        boca = 'aberta'
        olhos = 'animado'
        lift = (0, 1, 0)[k]
        passo = (0, 0, 0)[k]
    topo = 17 - lift + bob            # topo da jaqueta
    cy = 10 - lift + bob              # centro da cabeça
    pernas(t, passo, lift)
    tronco(t, topo)
    if pose in ('parado', 'anda', 'pisca'):
        manga(t, -8, topo + 1, -8, topo + 8)                    # braço esquerdo caído
        mao(t, -8, topo + 9)
        manga(t, 6, topo + 1, 6, topo + 6)                      # braço direito dobrado segurando o quentão na frente do peito
        t.rect(CX + 4, topo + 7, CX + 7, topo + 8, c('jaqueta'))
        t.rect(CX + 4, topo + 8, CX + 7, topo + 8, c('jaquetasombra'))
    elif pose == 'bebe':
        manga(t, -8, topo + 1, -8, topo + 8)
        mao(t, -8, topo + 9)
        up = (0, 4, 0)[k]
        manga(t, 6, topo + 1, 6, topo + 6 - up // 2)
        mao(t, 4, topo + 7 - up)
    else:                                                       # grito: os dois braços para o alto
        manga(t, -6, topo + 1, -10, topo - 11)
        t.rect(CX - 11, topo - 14, CX - 9, topo - 12, c('pele'))
        manga(t, 5, topo + 1, 8, topo - 9)
        mao(t, 8, topo - 11)
    cabeca(t, cy, boca, olhos)
    # a caneca vem por cima do corpo (e do queixo, quando está bebendo)
    if pose in ('parado', 'anda', 'pisca'):
        caneca(t, 3, topo + 2, vapor=k + (0 if pose == 'parado' else 1))
        mao(t, 4, topo + 7)
    elif pose == 'bebe':
        up = (0, 4, 0)[k]
        if k == 1:
            caneca(t, 1, topo - 3, inclinada=True)
        else:
            caneca(t, 3, topo + 2 - up, vapor=k, inclinada=(k == 1))
        mao(t, 4, topo + 7 - up)
    else:
        caneca(t, 7, topo - 16, inclinada=True)
    return outline(t.im)


FRAMES = ([('parado', 0)] + [('anda', k) for k in range(4)] + [('bebe', k) for k in range(3)] + [('yeah', k) for k in range(3)] +
          [('pisca', 0)])
POSES = {'parado': 0, 'anda': [1, 2, 3, 4], 'bebe': [5, 6, 7], 'yeah': [8, 9, 10], 'pisca': 11}


def quadros():
    return [quadro(pose, k) for pose, k in FRAMES]
