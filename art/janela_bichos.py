"""Quintal dos Bichos: o fundo do quintal (cerca, galinheiro, coqueiro, lampiões, chão de terra), o varal que balança, o saco de milho
e os presentes que os bichos dão.

Os bichos são os mesmos do cenário da festa (sprites `cenario-*`); aqui só entram o cenário e os presentes. As luzes dos lampiões,
os vagalumes e a fumacinha da casa ao longe são desenhados pela janela (src/janela-bichos.js) em cima deste fundo.
"""

import math
import random



from casa import Tela, rgb, LEG
import ambiente as amb
import janelas

W, H = 176, 104
CHAO_Y = 50                       # onde o chão começa (os bichos andam daqui para baixo)
POUSO = (136, 40)                 # onde o papagaio pousa (pés)
CAMA = (40, 74)                   # a caminha do gato (pés)
LAMPIOES = [(60, 36), (110, 36)]  # onde a chama de cada lampião fica (a janela acende a luz em cima)
CASA_LONGE = (93, 36)             # a casinha lá no fundo (a chaminé solta fumaça)
FOGUEIRA_LONGE = (78, 42)         # a fogueira lá longe, no morro
SACO = (3, 88)                    # o saco de milho (canto de baixo, à esquerda)

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

CEU = ['#100d28', '#150f34', '#1b1440', '#241a4e', '#30235e', '#42306e', '#5a3c7c', '#7a4a84', '#9a5a86']


def galinheiro(t):
    """Galinheiro à esquerda: tábuas, telhado de duas águas com telhas, janela acesa, porta com ninho e rampa."""
    # Parede de tábuas com sombra embaixo do beiral.
    t.rect(8, 30, 40, 54, '#a8703a')
    for x in range(10, 40, 4):
        t.rect(x, 30, x, 54, '#7c4a24')
        t.rect(x + 1, 31, x + 1, 54, '#b98048')
    t.rect(8, 30, 40, 31, '#6e4020')
    t.rect(8, 53, 40, 54, '#6e4020')
    t.rect(8, 30, 8, 54, '#5c3418')
    t.rect(40, 30, 40, 54, '#5c3418')
    # Telhado: telhas vermelhas em fileiras, borda clara em cima, sombra embaixo.
    for k in range(9):
        cor = '#c84a58' if k % 2 else '#e0606e'
        t.rect(5 + k, 29 - k, 43 - k, 29 - k, cor)
        for x in range(5 + k, 44 - k, 3):
            t.put(x, 29 - k, '#9a2a3c' if k % 2 else '#f08a94')
    t.rect(10, 20, 38, 20, '#f6a0a8')
    t.rect(5, 30, 43, 30, '#5a1a28')
    t.rect(6, 31, 42, 31, '#7c2a38')
    # Porta aberta, escura, com um montinho de palha e os olhos da escuridão.
    t.rect(14, 38, 26, 54, '#3a2418')
    t.rect(15, 39, 25, 54, '#1f130c')
    t.rect(14, 38, 26, 38, '#5c3a1e')
    t.rect(16, 50, 24, 53, '#e8c44a')
    for x in range(16, 25, 2):
        t.put(x, 50, '#fff0a0')
        t.put(x + 1, 51, '#b8942a')
    t.put(19, 46, '#ffe9a0')
    t.put(21, 46, '#ffe9a0')
    # Janelinha acesa (luz quente de dentro) e uma tabuleta de ovo.
    t.rect(28, 36, 36, 42, '#3a2418')
    t.rect(29, 37, 35, 41, '#ffd27a')
    t.rect(29, 37, 35, 38, '#fff0b8')
    t.rect(32, 37, 32, 41, '#3a2418')
    t.rect(29, 39, 35, 39, '#3a2418')
    t.rect(28, 43, 36, 43, '#5c3a1e')
    amb.luz(t, 32, 40, 9, 8, '#ffc060', 0.28, 3)
    t.rect(29, 46, 35, 50, '#e8d4a0')
    t.rect(29, 46, 35, 46, '#fff6e0')
    t.rect(29, 50, 35, 50, '#a8844a')
    t.rect(31, 47, 33, 49, '#fff6e0')
    t.put(32, 48, '#ffd21e')
    # Rampa de tábuas.
    t.rect(12, 54, 28, 57, '#8a5a34')
    t.rect(12, 54, 28, 54, '#b98048')
    for x in range(14, 28, 4):
        t.rect(x, 54, x, 57, '#5c3418')
    amb.sombra(t, 24, 58, 17, 2, 0.35, '#10200c')


def coqueiro(t):
    """Coqueiro à direita: tronco com anéis, folhas de duas cores e cacho de cocos."""
    tronco = [(154, 56), (154, 48), (155, 40), (155, 32), (154, 26), (154, 22)]
    for (x0, y0), (x1, y1) in zip(tronco, tronco[1:]):
        for y in range(min(y0, y1), max(y0, y1) + 1):
            frac = (y - y0) / ((y1 - y0) or 1)
            x = round(x0 + (x1 - x0) * frac)
            t.rect(x - 1, y, x + 1, y, '#8a5a34')
            t.put(x - 1, y, '#a8703a')
            t.put(x + 1, y, '#5c3a1e')
    for y in range(24, 56, 3):
        t.rect(153, y, 156, y, '#5c3a1e')
    t.rect(150, 22, 158, 26, '#5c3a1e')
    # Folhas: cada uma é uma linha com a cor escura embaixo e a clara em cima.
    folhas = [(-17, 5), (-12, -3), (-5, -8), (4, -8), (12, -3), (17, 5), (-12, 11), (13, 11), (-2, -2)]
    for dx, dy in folhas:
        for k in range(0, 3):
            cor = ('#2a7a3c', '#3a9a48', '#5cc060')[k]
            t.line(154, 22 + k - 1, 154 + dx, 22 + dy + k - 1, cor)
        t.put(154 + dx, 22 + dy + 2, '#2a7a3c')
    # Cocos.
    for x, y in ((151, 25), (154, 27), (157, 25), (153, 29)):
        t.rect(x, y, x + 2, y + 2, '#6e4a22')
        t.put(x, y, '#a8703a')
        t.put(x + 2, y + 2, '#3a2418')


def cerca(t):
    """Cerca de madeira ao fundo, com topo arredondado, tábuas com luz e sombra e duas travessas."""
    t.rect(6, 44, W - 6, 45, '#a66a34')
    t.rect(6, 50, W - 6, 51, '#a66a34')
    t.rect(6, 45, W - 6, 45, '#6e3c1c')
    t.rect(6, 51, W - 6, 51, '#6e3c1c')
    t.rect(6, 44, W - 6, 44, '#c88a50')
    for x in range(8, W - 8, 13):
        t.rect(x, 41, x + 2, 56, '#8a5a34')
        t.rect(x, 41, x, 56, '#b98048')
        t.rect(x + 2, 42, x + 2, 56, '#5c3a1e')
        t.put(x, 40, '#8a5a34')
        t.put(x + 1, 40, '#b98048')
        t.put(x + 1, 41, '#c88a50')
        t.rect(x, 54, x + 2, 56, '#4a2c18')
    amb.sombra(t, W // 2, 57, 78, 1, 0.25, '#0c1a0c')


def ao_longe(t):
    """Morros em duas camadas, milharal, a casinha com a janela acesa e a fogueira lá longe."""
    for x in range(W):
        alto = 31 + round(3 * math.sin(x / 11.0) + 2 * math.sin(x / 5.0 + 1))
        t.rect(x, alto, x, CHAO_Y, '#2c2a58')
        if x % 2 == 0:
            t.put(x, alto, '#3c3a70')
    for x in range(W):
        alto = 38 + round(3 * math.sin(x / 9.0 + 2) + 2 * math.sin(x / 4.0 + 1))
        t.rect(x, alto, x, CHAO_Y, '#1d3a46')
        if x % 3 == 0:
            t.put(x, alto, '#2c5a5c')
    # Copas de árvores no morro (bolotas escuras).
    gerador = random.Random(5)
    for _ in range(14):
        cx = gerador.randrange(2, W - 2)
        cy = 38 + round(3 * math.sin(cx / 9.0 + 2) + 2 * math.sin(cx / 4.0 + 1)) + 1
        r = gerador.randrange(2, 4)
        for dy in range(-r, 1):
            for dx in range(-r, r + 1):
                if dx * dx + dy * dy <= r * r:
                    t.put(cx + dx, cy + dy, '#17303a' if dy > -r + 1 else '#255048')
    # Milharal: fileiras com pendão.
    for x in range(0, W, 4):
        topo = 42 + (x // 4) % 3
        t.rect(x, topo, x + 1, CHAO_Y, '#26503c')
        t.put(x, topo - 1, '#46885a')
        t.put(x + 1, topo + 2, '#38744a')
    # A casinha ao longe: parede, telhado, chaminé e a janela acesa.
    cx, cy = CASA_LONGE
    t.rect(cx, cy + 3, cx + 10, cy + 9, '#5a4a7a')
    t.rect(cx - 1, cy + 2, cx + 11, cy + 2, '#8a4a4a')
    t.rect(cx, cy + 1, cx + 10, cy + 1, '#8a4a4a')
    t.rect(cx + 1, cy, cx + 9, cy, '#6a3a3a')
    t.rect(cx + 7, cy - 3, cx + 8, cy, '#4a3a5a')
    t.rect(cx + 2, cy + 5, cx + 4, cy + 7, '#ffd27a')
    t.put(cx + 3, cy + 6, '#fff0b8')
    amb.luz(t, cx + 3, cy + 6, 7, 5, '#ffc060', 0.3, 3)
    # Fogueira ao longe e o clarão dela no morro.
    fx, fy = FOGUEIRA_LONGE
    amb.luz(t, fx, fy, 14, 6, '#ff9a3a', 0.35, 4)
    t.rect(fx - 1, fy - 1, fx + 1, fy, '#ff8a12')
    t.put(fx, fy - 2, '#ffd21e')
    t.put(fx, fy - 1, '#fff0a0')


def chao(t):
    """Grama com remendos de terra, caminho de terra batida com pegadas e rastro de roda, flores, cogumelos e pedrinhas."""
    t.rect(0, CHAO_Y, W - 1, H - 1, '#2f8a46')
    janelas.ruido(t, 0, CHAO_Y + 2, W - 1, H - 1, 460, 11, ['#44a05a', '#3a9650', '#2a7a40', '#256e3a'])
    janelas.ruido(t, 0, CHAO_Y + 2, W - 1, H - 1, 80, 17, ['#58b868'])
    # Mais escuro lá no fundo (longe da luz) e um tom frio de noite por cima de tudo.
    amb.gradiente(t, 0, CHAO_Y, W - 1, CHAO_Y + 22, '#0e1a3a', 0.55, 0.0, 8)
    # Terra batida: contorno escuro, miolo claro e a borda esfarelando na grama.
    for cx, cy, rx, ry in ((88, 81, 52, 14), (58, 78, 26, 11), (122, 85, 28, 10), (96, 70, 22, 6)):
        janelas.elipse(t, cx, cy, rx, ry, '#8a6a3a', '#6e5230')
    for cx, cy, rx, ry in ((88, 80, 46, 11), (58, 77, 21, 8), (122, 84, 23, 7), (96, 70, 17, 4)):
        janelas.elipse(t, cx, cy, rx, ry, '#a8844a', '#8a6a3a')
    janelas.ruido(t, 34, 66, 146, 96, 240, 12, ['#b8945a', '#7a5a30', '#9a7a42', '#6e5230', '#c8a468'])
    # Rastro de roda e pegadas de bichos.
    for x in range(40, 138):
        y = 84 + round(2 * math.sin(x / 14.0))
        if x % 2 == 0:
            t.put(x, y, '#6e5230')
            t.put(x, y + 3, '#6e5230')
    for x, y in ((52, 72), (55, 74), (70, 90), (73, 88), (96, 70), (99, 72), (118, 86), (121, 84)):
        t.put(x, y, '#5c4426')
        t.put(x + 1, y, '#5c4426')
    # Cocho de água e saco de milho ficam de fora (ver cocho() e saco()).
    # Flores e cogumelos pelas bordas.
    gerador = random.Random(33)
    cores = ['#ff7aa8', '#fff8e8', '#ffd21e', '#9ad0ff']
    for k in range(18):
        x = gerador.randrange(4, W - 4)
        y = gerador.choice([gerador.randrange(CHAO_Y + 4, CHAO_Y + 10), gerador.randrange(H - 14, H - 3)])
        amb.flor(t, x, y, cores[k % len(cores)])
    for x, y in ((46, 60), (126, 62), (14, 66), (162, 70)):
        amb.cogumelo(t, x, y)
    for x, y, rx, ry in ((30, 98, 3, 2), (100, 64, 2, 1), (150, 100, 3, 2), (66, 60, 2, 1)):
        amb.pedra(t, x, y, rx, ry, ('#5a5d68', '#8a8d98', '#b8bcc8'))
    # Tufos de grama na frente.
    for _ in range(40):
        x, y = gerador.randrange(2, W - 2), gerador.randrange(CHAO_Y + 8, H - 2)
        t.rect(x, y - 2, x, y, '#2e8a44')
        t.put(x - 1, y - 1, '#46a85a')
        t.put(x + 1, y - 2, '#46a85a')


def cocho(t):
    """Cocho de água com água brilhando, balde de lata ao lado e palha na boca."""
    x0, y0, x1, y1 = 17, 86, 45, 95
    t.rect(x0, y0, x1, y1, '#6e3c1c')
    t.rect(x0 + 1, y0 + 1, x1 - 1, y1 - 1, '#8a5a34')
    t.rect(x0 + 3, y0 + 2, x1 - 3, y1 - 3, '#56c8ee')
    t.rect(x0 + 3, y0 + 2, x1 - 3, y0 + 2, '#bff0ff')
    t.rect(x0 + 3, y0 + 3, x1 - 3, y0 + 3, '#8ee0f6')
    for x in (x0 + 7, x0 + 15, x0 + 21):
        t.rect(x, y0 + 4, x + 2, y0 + 4, '#d8f8ff')
    t.rect(x0, y0, x1, y0, '#b98048')
    t.rect(x0, y1, x1, y1, '#3a2418')
    t.rect(x0 + 2, y1 + 1, x0 + 4, y1 + 2, '#3a2418')
    t.rect(x1 - 4, y1 + 1, x1 - 2, y1 + 2, '#3a2418')
    amb.balde(t, x1 + 3, y0 + 3)
    amb.sombra(t, 30, y1 + 3, 16, 1, 0.3, '#10200c')


def feno_e_barris(t):
    """Fardo de feno amarrado, forcado encostado e dois barris."""
    amb.sombra(t, 157, 96, 15, 2, 0.35, '#10200c')
    t.rect(146, 83, 168, 95, '#e8c44a')
    for y in (86, 89, 92):
        t.rect(146, y, 168, y, '#b8942a')
    t.rect(156, 83, 157, 95, '#8a5a1c')
    t.rect(146, 83, 168, 83, '#fff0a0')
    t.rect(146, 83, 146, 95, '#c8a438')
    t.rect(168, 83, 168, 95, '#a8841a')
    gerador = random.Random(8)
    for _ in range(18):
        x = gerador.randrange(146, 169)
        t.put(x, 83 - gerador.randrange(0, 3), '#e8c44a')
    # Forcado: cabo de madeira e três dentes.
    t.line(143, 98, 149, 80, '#8a5a34')
    t.line(144, 98, 150, 80, '#5c3a1e')
    for dx in (-1, 1, 3):
        t.rect(147 + dx, 76, 147 + dx, 80, '#a0a4b0')
    t.rect(146, 80, 152, 80, '#7c8090')
    # Barris.
    amb.barril(t, 128, 84, 9, 12)
    amb.barril(t, 136, 87, 8, 10)
    amb.sombra(t, 135, 97, 10, 1, 0.3, '#10200c')


def cama_do_gato(t):
    """Caminha do gato: almofada redonda com manta e um novelo de lã."""
    amb.sombra(t, CAMA[0] + 1, CAMA[1] + 3, 14, 3, 0.3, '#10200c')
    janelas.elipse(t, CAMA[0], CAMA[1] - 1, 13, 5, '#e0607a', '#a8384e')
    janelas.elipse(t, CAMA[0], CAMA[1] - 2, 10, 4, '#f08aa0', '#e0607a')
    janelas.elipse(t, CAMA[0], CAMA[1] - 2, 7, 2, '#ffc0d0')
    for x in range(CAMA[0] - 9, CAMA[0] + 10, 3):
        t.put(x, CAMA[1] + 2, '#ffd0dc')
    # Novelo de lã no chão.
    t.rect(CAMA[0] + 15, CAMA[1] + 1, CAMA[0] + 19, CAMA[1] + 4, '#4a78d8')
    t.rect(CAMA[0] + 16, CAMA[1], CAMA[0] + 18, CAMA[1], '#4a78d8')
    t.line(CAMA[0] + 15, CAMA[1] + 2, CAMA[0] + 19, CAMA[1] + 3, '#9ac0ff')
    t.line(CAMA[0] + 16, CAMA[1] + 4, CAMA[0] + 19, CAMA[1] + 1, '#2a4ca0')
    t.line(CAMA[0] + 14, CAMA[1] + 4, CAMA[0] + 8, CAMA[1] + 7, '#4a78d8')


def poleiro(t):
    """O poleiro do papagaio: poste com travessa e uma corda pendurada."""
    t.rect(POUSO[0], POUSO[1], POUSO[0] + 1, 58, '#6e3c1c')
    t.rect(POUSO[0], POUSO[1], POUSO[0], 58, '#9a5a2c')
    t.rect(POUSO[0] - 7, POUSO[1], POUSO[0] + 8, POUSO[1] + 1, '#8a5a34')
    t.rect(POUSO[0] - 7, POUSO[1], POUSO[0] + 8, POUSO[1], '#c88a50')
    t.rect(POUSO[0] + 7, POUSO[1] + 2, POUSO[0] + 7, POUSO[1] + 6, '#d8c090')
    t.rect(POUSO[0] + 6, POUSO[1] + 7, POUSO[0] + 8, POUSO[1] + 8, '#ff7aa8')


def fundo():
    t = Tela(W, H)
    # Céu de noite quente, com estrelas, a lua grande e nuvens iluminadas por ela.
    amb.ceu(t, 0, 0, W - 1, CHAO_Y, CEU)
    janelas.estrelas(t, 2, 2, W - 2, 30, 56, 5)
    amb.lua(t, 116, 13, 6)
    amb.nuvem(t, 18, 14, 34, '#4a3a7c', '#8a78b8', '#2c2258')
    amb.nuvem(t, 84, 24, 28, '#4a3a7c', '#a090c8', '#2c2258')
    amb.nuvem(t, 140, 8, 30, '#4a3a7c', '#a090c8', '#2c2258')
    ao_longe(t)
    # Postes do varal (o varal em si balança e vem de outra folha).
    janelas.poste(t, 3, 4, 58)
    janelas.poste(t, 171, 4, 58)
    cerca(t)
    galinheiro(t)
    coqueiro(t)
    poleiro(t)
    for x, topo in LAMPIOES:
        amb.lampiao(t, x, topo, 60)
    chao(t)
    # A poça de luz dos lampiões no chão (depois da grama).
    for x, topo in LAMPIOES:
        amb.luz(t, x + 0.5, 63, 26, 8, '#ffb040', 0.38, 4)
    cama_do_gato(t)
    cocho(t)
    feno_e_barris(t)
    saco_no(t)
    return t.im


def saco_no(t):
    """O saco de milho no canto de baixo: juta com boca aberta e milho amarelo transbordando."""
    x, y = SACO
    amb.sombra(t, x + 7, y + 15, 9, 2, 0.35, '#10200c')
    t.rect(x, y + 4, x + 12, y + 14, '#c8a468')
    t.rect(x + 1, y + 3, x + 11, y + 3, '#c8a468')
    for dx in range(1, 12, 2):
        t.rect(x + dx, y + 5, x + dx, y + 13, '#b08a4a')
    for dy in range(6, 14, 3):
        t.rect(x + 1, y + dy, x + 11, y + dy, '#d8b878')
    t.rect(x, y + 4, x, y + 14, '#a07a3c')
    t.rect(x + 12, y + 4, x + 12, y + 14, '#8a6a30')
    t.rect(x + 1, y + 14, x + 11, y + 14, '#8a6a30')
    # Boca aberta com milho.
    t.rect(x + 1, y + 1, x + 11, y + 3, '#e8c44a')
    for dx in range(2, 11, 2):
        t.put(x + dx, y + 1, '#fff0a0')
        t.put(x + dx + 1, y + 2, '#b8942a')
    t.rect(x + 3, y, x + 9, y, '#ffd21e')
    t.put(x + 5, y, '#fff0a0')
    t.put(x + 7, y - 1, '#ffd21e')
    # Etiqueta onde a janela escreve quantos grãos sobraram.
    t.rect(x + 3, y + 7, x + 9, y + 12, '#f4ead0')
    t.rect(x + 3, y + 7, x + 9, y + 7, '#fffaf0')
    t.rect(x + 3, y + 12, x + 9, y + 12, '#c8b890')


def varal():
    """O varal de bandeirinhas em três quadros: a corda fica parada e as bandeiras balançam (um pixel para cada lado)."""
    cores = ['#ee2f3c', '#ffd21e', '#35a03a', '#3a6cf0', '#ff4f9e', '#ff8a12']
    quadros = []
    for f in range(3):
        t = Tela(W, 34)
        gerador = random.Random(3)
        x0, x1, ponta, meio = 4, 171, 8, 20
        pontos = []
        for x in range(x0, x1 + 1):
            u = (x - x0) / (x1 - x0)
            pontos.append((x, round(ponta + (meio - ponta) * 4 * u * (1 - u))))
        for x, y in pontos:
            t.put(x, y, '#3a2418')
        for k, (x, y) in enumerate(pontos):
            if k % 6 == 3:
                cor = cores[gerador.randrange(len(cores))]
                balanco = ((k // 6 + f) % 3) - 1
                t.rect(x - 1, y + 1, x + 1, y + 2, cor)
                t.put(x + balanco, y + 3, cor)
                t.put(x - 1, y + 1, cor)
        quadros.append(t.im)
    return quadros


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
        'varal': add('janela-bichos-varal', varal()),
        'chao': CHAO_Y, 'pouso': list(POUSO), 'cama': list(CAMA), 'w': W, 'h': H,
        'lampioes': [list(p) for p in LAMPIOES], 'casaLonge': list(CASA_LONGE), 'fogueiraLonge': list(FOGUEIRA_LONGE),
        'saco': list(SACO),
    }
