"""Quintal dos Bichos: o fundo do quintal (cerca, galinheiro, coqueiro, chão de terra) e os presentes que os bichos dão.

Os bichos são os mesmos do cenário da festa (sprites `cenario-*`); aqui só entram o cenário e os presentes.
"""

import math
import random

from casa import Tela, rgb, LEG
import janelas

W, H = 176, 104
CHAO_Y = 50                       # onde o chão começa (os bichos andam daqui para baixo)
POUSO = (136, 40)                 # onde o papagaio pousa (pés)
CAMA = (40, 74)                   # a caminha do gato (pés)

PRESENTES = ['ovo', 'rato', 'leite', 'graveto', 'carta', 'cesta', 'fita', 'grao']
GRADES = {
    'ovo': ['.........', '...ttt...', '..ttwtt..', '.ttwtttt.', '.tttttTt.', '.tttttTT.', '.TttttTT.', '..TTTTT..', '...TTT...'],
    'rato': ['.........', '..pp.....', '.pgggg...', 'kgggggg.s', 'gggggggss', '.ggggg...', '..G.G....', '.........', '.........'],
    'leite': ['...ww....', '...ww....', '..wwww...', '.wwwwww..', '.wwbbww..', '.wwbbww..', '.wwwwww..', '.wwwwww..', '..wwww...'],
    'graveto': ['......nn.', '.....nNn.', '....nNn..', '...nNn.l.', '..nNn.lL.', '.nNn.....', 'nNn......', '.n.......', '.........'],
    'carta': ['.........', 'wwwwwwwww', 'wrwwwwwrw', 'wwrwwwrww', 'wwwrwrwww', 'wwwwrwwww', 'wwwwwwwww', 'ggggggggg', '.........'],
    'cesta': ['..nnnnn..', '.n.....n.', '.n.rrl.n.', 'nnnnnnnnn', 'nNnNnNnNn', 'nnnnnnnnn', '.nNnNnNn.', '..nnnnn..', '.........'],
    'fita': ['..rrrrr..', '.rryyyrr.', 'rryywyyrr', 'rryywyyrr', '.rryyyrr.', '..rrrrr..', '..r...r..', '.rr...rr.', '.........'],
    'grao': ['.........', '.........', '.........', '....yy...', '...yYYy..', '...yYYy..', '....yy...', '.........', '.........'],
}


def fundo():
    t = Tela(W, H)
    # Céu de noite quente, com estrelas e a lua.
    janelas.degrade(t, 0, 0, W - 1, CHAO_Y, ['#15132e', '#1c1a3a', '#241f4a', '#2d2858', '#37306a', '#43397a'])
    janelas.estrelas(t, 2, 2, W - 2, 36, 46, 5)
    t.rect(110, 6, 116, 12, '#fff3c4')
    t.rect(109, 7, 117, 11, '#fff3c4')
    t.rect(112, 8, 113, 9, '#e8d596')
    # Morros e milharal ao longe.
    for x in range(W):
        alto = 36 + round(3 * math.sin(x / 9.0) + 2 * math.sin(x / 4.0 + 1))
        t.rect(x, alto, x, CHAO_Y, '#1d3a3a')
    for x in range(0, W, 5):
        t.rect(x, 40 + (x // 5) % 3, x + 1, CHAO_Y, '#26503c')
    # Varal de bandeirinhas entre dois postes.
    janelas.poste(t, 3, 4, 58)
    janelas.poste(t, 171, 4, 58)
    janelas.varal(t, 4, 171, 8, 20)
    # Cerca de madeira ao fundo.
    for x in range(8, W - 8, 13):
        t.rect(x, 40, x + 2, 56, '#8a5a34')
        t.rect(x, 40, x, 56, '#b07a48')
        t.rect(x + 2, 41, x + 2, 56, '#5c3a1e')
    t.rect(6, 44, W - 6, 45, '#a66a34')
    t.rect(6, 50, W - 6, 51, '#a66a34')
    t.rect(6, 45, W - 6, 45, '#6e3c1c')
    # Galinheiro à esquerda: paredes de tábua, telhado de duas águas e rampa.
    t.rect(8, 30, 40, 54, '#a8703a')
    for x in range(10, 40, 4):
        t.rect(x, 30, x, 54, '#7c4a24')
    for k in range(8):
        t.rect(6 + k, 30 - k, 42 - k, 30 - k, '#b23a48' if k % 2 else '#d65a68')
    t.rect(14, 38, 26, 54, '#3a2418')
    t.rect(15, 39, 25, 54, '#26180f')
    t.rect(28, 36, 36, 42, '#3a2418')
    t.rect(29, 37, 35, 41, '#e8c488')
    t.rect(12, 54, 28, 57, '#6e3c1c')
    # Coqueiro à direita.
    t.rect(153, 20, 155, 56, '#8a5a34')
    for y in range(22, 56, 4):
        t.rect(153, y, 155, y, '#6e3c1c')
    for dx, dy, cor in ((-14, 4, '#2e8a44'), (-8, -3, '#3a9a48'), (0, -6, '#46a85a'), (8, -3, '#3a9a48'), (14, 4, '#2e8a44'), (-10, 9, '#2a7a3c'), (11, 9, '#2a7a3c')):
        t.line(154, 20, 154 + dx, 20 + dy, cor)
        t.line(154, 21, 154 + dx, 21 + dy, cor)
        t.line(154, 19, 154 + dx, 19 + dy, cor)
    t.rect(152, 22, 156, 25, '#6e3c1c')
    # O poleiro do papagaio: poste com travessa.
    t.rect(POUSO[0], POUSO[1], POUSO[0] + 1, 58, '#6e3c1c')
    t.rect(POUSO[0] - 7, POUSO[1], POUSO[0] + 8, POUSO[1] + 1, '#8a5a34')
    t.rect(POUSO[0] - 7, POUSO[1], POUSO[0] + 8, POUSO[1], '#b07a48')
    # Chão: grama com remendos de terra.
    t.rect(0, CHAO_Y, W - 1, H - 1, '#3a9a48')
    janelas.ruido(t, 0, CHAO_Y + 2, W - 1, H - 1, 420, 11, ['#56b860', '#46a85a', '#2e8a44', '#2a7a3c'])
    janelas.elipse(t, 88, 80, 56, 15, '#8a6a3a', '#6e5230')
    janelas.ruido(t, 36, 68, 140, 94, 160, 12, ['#a8844a', '#7a5a30', '#9a7a42', '#6e5230'])
    # Caminha do gato (almofada redonda).
    janelas.elipse(t, CAMA[0], CAMA[1] - 1, 13, 5, '#e0607a', '#a8384e')
    janelas.elipse(t, CAMA[0], CAMA[1] - 2, 9, 3, '#f08aa0')
    # Cocho de água e fardo de feno.
    t.rect(8, 84, 32, 93, '#6e3c1c')
    t.rect(9, 85, 31, 92, '#8a5a34')
    t.rect(11, 86, 29, 90, '#56c8ee')
    t.rect(11, 86, 29, 86, '#bff0ff')
    t.rect(8, 93, 32, 94, '#3a2418')
    t.rect(146, 84, 168, 95, '#e8c44a')
    for y in (87, 90, 93):
        t.rect(146, y, 168, y, '#b8942a')
    t.rect(156, 84, 157, 95, '#8a5a1c')
    t.rect(146, 84, 168, 84, '#fff0a0')
    # Tufos de grama na frente.
    gerador = random.Random(21)
    for _ in range(40):
        x, y = gerador.randrange(2, W - 2), gerador.randrange(CHAO_Y + 8, H - 2)
        t.rect(x, y - 2, x, y, '#2e8a44')
        t.put(x - 1, y - 1, '#46a85a')
        t.put(x + 1, y - 2, '#46a85a')
    return t.im


def presentes():
    quadros = []
    for nome in PRESENTES:
        t = Tela(9, 9)
        t.grade(GRADES[nome], 0, 0, {**LEG, 't': rgb('#fff6e0'), 'T': rgb('#e8cfa0')})
        quadros.append(t.im)
    return quadros


def exportar(add):
    return {
        'fundo': add('janela-bichos-fundo', fundo()),
        'presentes': {**add('janela-bichos-presentes', presentes()), 'ids': PRESENTES},
        'chao': CHAO_Y, 'pouso': list(POUSO), 'cama': list(CAMA), 'w': W, 'h': H,
    }
