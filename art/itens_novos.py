"""Itens novos e mais caros da vitrine (chapéus, itens de mão, tecidos, terreiros e varais), de ideias sem relação com São João.

Cada item é uma grade de caracteres como as de sprites.py, mas com uma paleta só dele (`cores`): a letra vale para aquele item,
então dá para usar quantas cores for preciso sem brigar com a paleta do resto do jogo. Letras que não estão na paleta do item
caem na paleta geral (`sprites.PALETTE`). `.` é transparente.
"""

import math

from PIL import Image

import sprites
from render import hex_rgb, outline


def pintar(texto, cores=None, contorno=True):
    """Converte a grade em imagem RGBA (com contorno de 1 pixel, como os outros itens)."""
    linhas = [linha for linha in texto.strip('\n').split('\n')]
    largura = len(linhas[0])
    for numero, linha in enumerate(linhas):
        if len(linha) != largura:
            raise ValueError(f'linha {numero} tem {len(linha)} colunas, esperado {largura}: {linha!r}')
    imagem = Image.new('RGBA', (largura, len(linhas)), (0, 0, 0, 0))
    for y, linha in enumerate(linhas):
        for x, letra in enumerate(linha):
            if letra == '.':
                continue
            cor = (cores or {}).get(letra) or sprites.PALETTE[letra]
            imagem.putpixel((x, y), hex_rgb(cor) + (255,))
    return outline(imagem) if contorno else imagem


class Grade:
    """Uma grade editável de letras (para formas geométricas que dão trabalho de digitar)."""

    def __init__(self, largura, altura):
        self.w, self.h = largura, altura
        self.c = [['.'] * largura for _ in range(altura)]

    def pôr(self, x, y, letra):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.c[y][x] = letra

    def ler(self, x, y):
        return self.c[y][x] if 0 <= x < self.w and 0 <= y < self.h else '.'

    def texto(self):
        return '\n'.join(''.join(linha) for linha in self.c)


def espelhar(meias):
    """Linhas de 12 colunas (a metade esquerda) viram linhas de 24, espelhadas."""
    return '\n'.join(linha + linha[::-1] for linha in meias.strip('\n').split('\n'))


# --- Chapéus ----------------------------------------------------------------------------------------------------------------
# A grade tem 24 colunas como a da Mandioca; a última linha da grade fica na altura da aba do chapéu de palha (linha 8 da
# Mandioca) e as de cima sobem: `acima` é quantas linhas passam do topo (o jogo desloca o chapéu para cima por elas).

CHAPEUS = {}


def chapeu(id_, texto, cores, acima=0):
    linhas = texto.strip('\n').split('\n')
    CHAPEUS[id_] = {'texto': '\n'.join(linhas), 'cores': cores, 'acima': acima}


def fatia_melancia():
    """Meia-lua de melancia em pé: casca verde, casca branca, miolo vermelho com sementes e um brilho."""
    g = Grade(24, 9)
    for y in range(9):
        for x in range(24):
            dx = (x - 11.5) / 9.4
            dy = (9 - y - 0.5) / 9.0
            rho = math.hypot(dx, dy)
            if rho > 1.0:
                continue
            g.pôr(x, y, 'g' if rho > 0.93 else 'G' if rho > 0.84 else 'w' if rho > 0.77 else 'r')
    for x in range(24):
        if g.ler(x, 8) != '.':
            g.pôr(x, 8, 'g' if g.ler(x, 8) in 'gGw' else 'q')
    # Sementes e um brilho no miolo.
    for x, y in ((7, 6), (10, 4), (13, 6), (16, 5), (9, 7), (14, 3), (12, 7)):
        if g.ler(x, y) == 'r':
            g.pôr(x, y, 'k')
    for x, y in ((8, 5), (7, 4), (15, 5)):
        if g.ler(x, y) == 'r':
            g.pôr(x, y, 'R')
    return g.texto()


chapeu('fatia-melancia', fatia_melancia(), {'g': '#1f6a30', 'G': '#4cc24a', 'w': '#d8f2b0', 'r': '#f0405a', 'R': '#ff8a96', 'q': '#c02040',
                                           'k': '#2a1018'})


def abacaxi():
    """Um abacaxi inteiro na cabeça: coroa de folhas para cima e a casca em losangos dourados."""
    g = Grade(24, 15)
    # Folhas da coroa (6 linhas): um leque que abre para cima.
    folhas = ['.....G........G.....'.replace('.', '.'), ]
    leque = [(11, 0), (12, 0), (9, 1), (14, 1), (11, 1), (12, 1), (7, 2), (10, 2), (13, 2), (16, 2), (11, 2), (12, 2),
             (8, 3), (9, 3), (11, 3), (12, 3), (14, 3), (15, 3), (10, 3), (13, 3), (10, 4), (11, 4), (12, 4), (13, 4)]
    for x, y in leque:
        g.pôr(x, y, 'V' if (x + y) % 3 else 'v')
    for x in range(8, 16):
        g.pôr(x, 5, 'v')
    for x in range(10, 14):
        g.pôr(x, 5, 'V')
    # Corpo: elipse de 14 colunas por 9 linhas com losangos.
    for y in range(6, 15):
        for x in range(24):
            dx = (x - 11.5) / 7.3
            dy = (y - 10.2) / 4.9
            if dx * dx + dy * dy <= 1.0:
                losango = (x + y) % 4 == 0 or (x - y) % 4 == 0
                g.pôr(x, y, 'o' if losango else ('A' if (x + y) % 2 else 'F'))
    # Sombra do lado direito e brilho do esquerdo.
    for y in range(6, 15):
        for x in range(23, -1, -1):
            if g.ler(x, y) != '.' and g.ler(x + 1, y) == '.' and g.ler(x + 2, y) == '.':
                g.pôr(x, y, 'a')
    return g.texto()


chapeu('abacaxi-real', abacaxi(), {'V': '#35b84a', 'v': '#1c7a30', 'A': '#ffd21e', 'F': '#fff07a', 'o': '#c8781a', 'a': '#c07e08'}, acima=6)


# Cartola mágica com um coelho que sai de dentro dela (as orelhas passam do topo, a cartola fica por cima do corpinho dele).
chapeu('cartola-magica', espelhar("""
........W...
........WP..
........WP..
........WP..
.......WWWWW
.......WWkWW
.......WWWWp
.....sssssss
......dDdddd
......dDdddd
......dDdddd
......PPPPPA
...ddddddddd
...dsssssssd
"""), {'d': '#1a1020', 'D': '#3e3058', 's': '#5a4a7a', 'P': '#9a3ae0', 'A': '#ffd21e', 'W': '#fff8f0', 'p': '#ff8aa8', 'k': '#1a1020'},
       acima=5)


def astronauta():
    """Capacete de astronauta com a viseira aberta: cúpula branca, aro de metal, vidro nas laterais e o colar."""
    g = Grade(24, 21)
    for y in range(9):
        for x in range(24):
            dx = (x - 11.5) / 10.2
            dy = (8.6 - y) / 9.0
            if math.hypot(dx, dy) <= 1.0:
                g.pôr(x, y, 'X' if x < 12 else 'w')
    # Brilho da cúpula e uma faixa azul com a luzinha de aviso.
    for x, y in ((6, 3), (7, 2), (8, 1), (5, 4), (9, 1), (6, 2)):
        g.pôr(x, y, 'z')
    for x in range(3, 21):
        if g.ler(x, 5) != '.':
            g.pôr(x, 5, 'B' if x < 12 else 'N')
    for x in (11, 12):
        g.pôr(x, 0, 'R')
        g.pôr(x, 1, 'R')
    # Aro da viseira (metal) e o vidro nas laterais, sobre o rosto vazado.
    for x in range(3, 21):
        g.pôr(x, 8, 'S' if x < 12 else 's')
        g.pôr(x, 7, 'X' if x < 12 else 'w')
    for y in range(9, 19):
        g.pôr(2, y, 'C' if y % 4 else 'z')
        g.pôr(21, y, 'c')
    g.pôr(3, 9, 'S')
    g.pôr(20, 9, 's')
    # O vidro reflete: três risquinhos de luz sobre o rosto.
    for x, y in ((7, 10), (8, 10), (7, 11), (14, 17)):
        g.pôr(x, y, 'z')
    # Colar com a faixa vermelha, por cima do lenço.
    for x in range(2, 22):
        g.pôr(x, 19, 'X' if x < 12 else 'w')
        g.pôr(x, 20, 'S' if x < 12 else 's')
    for x in range(4, 20):
        if x % 4 != 3:
            g.pôr(x, 19, 'R' if (x // 4) % 2 else g.ler(x, 19))
    return g.texto()


chapeu('capacete-astronauta', astronauta(), {'X': '#fafcff', 'w': '#c4cadc', 'z': '#ffffff', 'B': '#3a7af0', 'N': '#2a4fb8', 'R': '#ff4a3a',
                                             'S': '#aeb4c4', 's': '#7e86a0', 'C': '#8ae4ff', 'c': '#4ab8e8'}, acima=0)


# Gorro de tubarão: barbatana nas costas, olhinho de lado e a bocarra com dentes sobre a testa.
chapeu('gorro-tubarao', espelhar("""
...........F
..........FF
.........FFF
.........FFF
.....ssSSSSS
...sSSSSSSSS
..sSSWkSSSSS
..SSSSSSSSSS
..SSSSSSSSSS
..LLLLLLLLLL
..mmmmmmmmmm
..WWW.WWW.WW
...W...W...W
"""), {'F': '#2e4460', 'S': '#5e82a2', 's': '#8aaccb', 'L': '#c8dcea', 'W': '#ffffff', 'k': '#101820', 'm': '#a81a3a'}, acima=2)


def mago():
    """Chapéu de mago azul-noite com a ponta caída para o lado, estrelas, uma lua e a aba larga."""
    g = Grade(24, 18)
    for y in range(0, 15):
        t = (14 - y) / 14.0                 # 0 na aba, 1 na ponta
        centro = 11.5 + 5.2 * (t ** 2.2)
        meia = 1.2 + 4.8 * (1 - t) ** 0.9
        for x in range(24):
            if abs(x - centro) <= meia:
                g.pôr(x, y, 'u' if x < centro + meia * 0.45 else 'd')
    # Brilho no lado esquerdo e a faixa dourada na base.
    for y in range(2, 14):
        for x in range(24):
            if g.ler(x, y) == 'u' and g.ler(x - 1, y) == '.':
                g.pôr(x, y, 'U')
    for x in range(24):
        if g.ler(x, 13) != '.':
            g.pôr(x, 13, 'A' if x % 5 else 'a')
    # Aba: elipse achatada em duas linhas, mais clara em cima.
    for x in range(2, 22):
        g.pôr(x, 14 if 3 <= x <= 20 else 15, 'U' if x < 12 else 'u')
        g.pôr(x, 15, 'u' if x < 12 else 'd')
        if 3 <= x <= 20:
            g.pôr(x, 16, 'd')
    # Estrelas e uma luazinha na copa.
    for x, y in ((9, 8), (14, 9), (11, 11), (13, 5), (8, 11)):
        if g.ler(x, y) in 'uUd':
            g.pôr(x, y, 'A')
    # A luazinha (crescente aberto para a direita).
    for x, y in ((11, 8), (12, 8), (10, 9), (10, 10), (11, 11), (12, 11)):
        if g.ler(x, y) in 'uUd':
            g.pôr(x, y, 'F')
    return g.texto()


chapeu('chapeu-mago', mago(), {'u': '#4a38b8', 'U': '#7a68f0', 'd': '#2a1c78', 'A': '#ffd21e', 'a': '#c8981a', 'F': '#fff4a8'}, acima=9)


# --- Itens de mão -----------------------------------------------------------------------------------------------------------
# Cada item: quadros (imagens com contorno), o pivô (onde a mão segura, em pixels da imagem já com o contorno) e os quadros por
# segundo. Os que se mexem têm vários quadros.

MAOS = {}


def mao(id_, quadros, pivo, fps=4):
    """`pivo` vem em coordenadas da grade (sem o contorno); a imagem ganha 1 pixel em volta."""
    MAOS[id_] = {'quadros': quadros, 'pivo': [pivo[0] + 1, pivo[1] + 1], 'fps': fps}


def elipse(g, cx, cy, rx, ry, letra, so_se=None):
    for y in range(g.h):
        for x in range(g.w):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0 and (so_se is None or g.ler(x, y) in so_se):
                g.pôr(x, y, letra)


def balao_estrela():
    """Balão de festa em forma de estrela dourada: balança no ar preso pela fitinha."""
    quadros = []
    for dx in (0, 1, 0, -1):
        g = Grade(13, 18)
        forma = ['.....A.....', '.....A.....', '....AAA....', 'AAAAAAAAAAA', '.AAAAAAAAA.', '..AAAAAAA..', '..AAAAAAA..', '.AAAA.AAAA.',
                 '.AAA...AAA.', '.AA.....AA.']
        for y, linha in enumerate(forma):
            for x, letra in enumerate(linha):
                if letra != '.':
                    g.pôr(x + 1 + dx, y, 'F' if (x + y < 7 and letra == 'A') else 'a' if x + y > 12 else letra)
        for x, y in ((3 + dx, 4), (4 + dx, 3), (4 + dx, 5)):
            g.pôr(x + 1, y, 'z')
        g.pôr(6 + dx, 10, 'R')
        g.pôr(7 + dx, 10, 'R')
        for y in range(11, 18):
            g.pôr(6 + round(dx * (17 - y) / 7), y, 'x')
        quadros.append(pintar(g.texto(), {'A': '#ffd21e', 'F': '#fff07a', 'a': '#d89010', 'z': '#ffffff', 'R': '#ff4a5a', 'x': '#f4eadc'}))
    return quadros


mao('balao-estrela', balao_estrela(), (6, 16), fps=5)


def sorvete():
    """Sorvete de três bolas (hortelã, morango e chocolate) com cereja; um fio de sorvete derrete e pinga de quadro em quadro."""
    quadros = []
    for k in range(4):
        g = Grade(11, 20)
        elipse(g, 5, 3.6, 3.3, 2.5, 'M')
        elipse(g, 5, 7.0, 4.2, 2.6, 'P')
        elipse(g, 5, 10.6, 4.5, 2.7, 'C')
        for y in range(13, 20):
            meia = round(4.6 - (y - 13) * 0.7)
            for x in range(5 - meia, 5 + meia + 1):
                g.pôr(x, y, 'T' if (x + y) % 2 else 't')
        for x in range(1, 10):
            g.pôr(x, 13, 'T')
        g.pôr(5, 0, 'r')
        g.pôr(5, 1, 'R')
        g.pôr(4, 1, 'R')
        g.pôr(6, 1, 'r')
        g.pôr(6, 0, 'v')
        for x, y in ((4, 2), (3, 6), (3, 9), (4, 7)):
            if g.ler(x, y) != '.':
                g.pôr(x, y, 'W')
        # Uma gota rosa escorre da bola do meio para a de chocolate e pinga na casquinha.
        gotas = [(1, 8), (1, 9), (1, 11), (1, 14)]
        gx, gy = gotas[k]
        g.pôr(gx, gy, 'p')
        if k:
            g.pôr(gx, gy - 1, 'P')
        quadros.append(pintar(g.texto(), {'M': '#7ef0c8', 'P': '#ff8ab8', 'C': '#7a4020', 'T': '#e0a050', 't': '#b87830', 'R': '#e02848',
                                           'r': '#ff6a7a', 'v': '#3a8a2a', 'W': '#ffffff', 'p': '#ff6a9e'}))
    return quadros


mao('sorvete-triplo', sorvete(), (5, 17), fps=3)


def espada_neon():
    """Espada de luz neon: o miolo é branco e o brilho troca de cor a cada quadro (ciano, rosa, limão e âmbar)."""
    quadros = []
    for miolo, brilho, sombra in (('#aef8ff', '#3ae8ff', '#1a88c8'), ('#ffc0f0', '#ff4adc', '#a81a8a'),
                                   ('#e4ffb0', '#9aff3a', '#3aa81a'), ('#fff0b0', '#ffb83a', '#c8681a')):
        g = Grade(7, 21)
        for y in range(0, 14):
            g.pôr(3, y, 'W')
            g.pôr(2, y, 'b')
            g.pôr(4, y, 'b')
            if y > 0:
                g.pôr(1, y, 's')
                g.pôr(5, y, 's')
        g.pôr(2, 0, '.')
        g.pôr(4, 0, '.')
        g.pôr(3, 0, 'b')
        for y in range(14, 21):
            g.pôr(2, y, 'S')
            g.pôr(3, y, 'D')
            g.pôr(4, y, 'S')
        for x in range(1, 6):
            g.pôr(x, 14, 'A')
        g.pôr(3, 16, 'R')
        for y in (17, 19):
            for x in (2, 3, 4):
                g.pôr(x, y, 'd')
        g.pôr(3, 20, 'A')
        quadros.append(pintar(g.texto(), {'W': miolo, 'b': brilho, 's': sombra, 'S': '#aeb4c4', 'D': '#5e6474', 'd': '#2a2e3a', 'A': '#ffd21e',
                                           'R': '#ff3a4a'}))
    return quadros


mao('espada-neon', espada_neon(), (3, 18), fps=3)


def cajado():
    """Cajado de madeira retorcida segurando no ar um cristal que flutua, brilha e solta faíscas girando em volta."""
    quadros = []
    orbitas = [[(1, 4), (7, 2)], [(2, 6), (6, 1)], [(7, 5), (1, 2)], [(6, 7), (2, 1)]]
    for k in range(4):
        g = Grade(9, 25)
        subida = (0, 0, 1, 1)[k]
        brilho = ('C', 'C', 'E', 'C')[k]
        # Cristal: um losango facetado de 5 x 8.
        cristal = ['..A..', '.ACc.', 'ACWCc', 'AWCCc', 'ACCCc', 'aCCcc', '.aCc.', '..a..']
        for y, linha in enumerate(cristal):
            for x, letra in enumerate(linha):
                if letra != '.':
                    g.pôr(2 + x, 1 + y - subida + 1, {'A': 'L', 'a': 'n', 'C': brilho, 'c': 'c', 'W': 'W'}[letra])
        for x, y in orbitas[k]:
            g.pôr(x, y + 2, 'W')
        # Garra dourada e o cajado de madeira torcida.
        for x, y in ((2, 11), (3, 12), (6, 11), (5, 12), (4, 13)):
            g.pôr(x, y, 'A')
        g.pôr(4, 12, 'a')
        for y in range(14, 25):
            g.pôr(4, y, 'D' if (y // 2) % 2 else 'l')
            g.pôr(3 if (y // 3) % 2 else 5, y, 'd')
        g.pôr(4, 24, 'a')
        quadros.append(pintar(g.texto(), {'L': '#a8f4ff', 'C': '#3ad8f0', 'E': '#1ab0d8', 'c': '#1a78b8', 'n': '#116090', 'W': '#ffffff',
                                           'A': '#ffd21e', 'a': '#b88010', 'l': '#c07a36'}))
    return quadros


def bola_cristal():
    """Bola de cristal sobre um pedestal dourado: uma névoa roxa gira lá dentro e estrelinhas piscam."""
    quadros = []
    for k in range(4):
        g = Grade(13, 17)
        for y in range(12):
            for x in range(13):
                dx, dy = x - 6, y - 5.5
                rho = math.hypot(dx, dy)
                if rho > 5.6:
                    continue
                ang = math.atan2(dy, dx)
                v = math.sin(3 * ang + rho * 1.1 - k * math.pi / 2)
                g.pôr(x, y, 'L' if v > 0.55 else 'N' if v < -0.45 else 'M')
        # Brilho do vidro e estrelinhas que piscam.
        for x, y in ((3, 2), (4, 1), (3, 3), (2, 3)):
            g.pôr(x, y, 'z')
        for n, (x, y) in enumerate(((8, 3), (5, 7), (9, 7), (6, 4))):
            if (n + k) % 2 == 0 and g.ler(x, y) != '.':
                g.pôr(x, y, 'W')
        # Pedestal: tigela dourada com três pezinhos.
        for x in range(3, 10):
            g.pôr(x, 12, 'A')
        for x in range(4, 9):
            g.pôr(x, 13, 'a' if x < 8 else 'o')
        for x in range(2, 11):
            g.pôr(x, 14, 'A' if x % 4 else 'a')
        g.pôr(2, 15, 'a')
        g.pôr(6, 15, 'a')
        g.pôr(10, 15, 'a')
        quadros.append(pintar(g.texto(), {'L': '#c48aff', 'M': '#7a3ad8', 'N': '#3a1a90', 'z': '#ffffff', 'W': '#fff4a8', 'A': '#ffd21e',
                                           'a': '#c08a10', 'o': '#8a5a08'}))
    return quadros


def agua_viva():
    """Guarda-chuva de água-viva: a cúpula rosa brilha e os tentáculos balançam soltos nas bordas."""
    quadros = []
    for k in range(4):
        g = Grade(15, 22)
        for y in range(7):
            for x in range(15):
                dx, dy = (x - 7) / 7.2, (y - 6.6) / 6.6
                if dx * dx + dy * dy <= 1.0:
                    g.pôr(x, y, 'P' if dy < -0.35 else 'p' if dy < 0.45 else 'q')
        for x, y in ((3, 3), (4, 2), (5, 1), (4, 3)):
            g.pôr(x, y, 'z')
        for x, y in ((9, 2), (11, 4), (8, 4), (6, 4)):
            g.pôr(x, y, 'k')
        # Bainha com ondinhas e tentáculos que ondulam.
        for x in range(1, 14):
            g.pôr(x, 7, 'q' if x % 2 else 'p')
        for base in (2, 4, 10, 12):
            for y in range(8, 17):
                g.pôr(base + round(1.0 * math.sin(k * math.pi / 2 + y * 0.55 + base * 0.7)), y, 'p' if y < 15 else 'k')
        # Cabo curvo no meio.
        for y in range(8, 21):
            g.pôr(7, y, 'D')
        g.pôr(8, 21, 'D')
        g.pôr(9, 20, 'D')
        quadros.append(pintar(g.texto(), {'P': '#ffb0e8', 'p': '#ff80d0', 'q': '#c850b8', 'z': '#ffffff', 'k': '#ffe0f8', 'D': '#7c421e'}))
    return quadros


mao('cajado-cristal', cajado(), (4, 20), fps=4)
mao('bola-cristal', bola_cristal(), (6, 14), fps=3)
mao('agua-viva', agua_viva(), (7, 17), fps=4)


# --- Tecidos ----------------------------------------------------------------------------------------------------------------
# Um tecido é um ladrilho que se repete pelo corpo; cada letra é uma cor da paleta geral. Os tecidos novos precisam de cores que
# a paleta não tem, então elas entram nela (com letras que ninguém usava) quando este módulo é carregado.

_LIVRES = list("tZ@%$&*=:;!?<>^|_~()[]{}/,`\\\"'") + list("ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞß")  # (os temas novos precisam de muitas cores de tecido)
_REGISTRADAS = {}


def cor(hex_):
    """A letra da paleta geral para essa cor (registra se for nova)."""
    for letra, valor in sprites.PALETTE.items():
        if valor.lower() == hex_.lower():
            return letra
    if hex_ not in _REGISTRADAS:
        letra = _LIVRES.pop(0)
        sprites.PALETTE[letra] = hex_
        _REGISTRADAS[hex_] = letra
    return _REGISTRADAS[hex_]


def ladrilho(grade, mapa):
    """Linhas de letras locais viram um ladrilho com as letras da paleta geral."""
    return [''.join(cor(mapa[letra]) for letra in linha) for linha in grade]


def tecido_galaxia():
    n, m, p, w, y, b = '#1c1858', '#322a90', '#b03ad0', '#ffffff', '#ffe27a', '#8ad0ff'
    base = [['n'] * 11 for _ in range(11)]
    for yy in range(11):
        for xx in range(11):
            d = (xx + yy) % 11
            if d in (3, 4, 5, 6):
                base[yy][xx] = 'm'
            if d in (4, 5) and (xx % 3):
                base[yy][xx] = 'p'
    for xx, yy, letra in ((1, 1, 'w'), (7, 2, 'y'), (3, 6, 'w'), (9, 8, 'b'), (5, 9, 'y'), (10, 4, 'w'), (0, 8, 'b')):
        base[yy][xx] = letra
    return ladrilho([''.join(linha) for linha in base], {'n': n, 'm': m, 'p': p, 'w': w, 'y': y, 'b': b})


def tecido_onca():
    """Pele de onça: rosetas de contorno escuro com miolo alaranjado e pintas soltas, em ladrilho pequeno para caber no corpo."""
    return ladrilho(['kkkddd', 'kckddd', 'kkkdsd', 'dddkkk', 'sddkck', 'dsdkkk'],
                    {'d': '#e8a838', 'c': '#c87a20', 'k': '#3a1c0c', 's': '#f6cc68'})


def tecido_sereia():
    cores = {'a': '#117a88', 'b': '#2ad8c8', 'c': '#8af0e0', 'x': '#6a3ad8', 'y': '#9a6af0', 'z': '#d0b4ff'}
    base = [['a'] * 8 for _ in range(8)]
    # Escamas: semicírculos que descem, desenhados de cima para baixo para que cada fileira cubra a de cima.
    for j in range(-1, 3):
        for i in range(-1, 3):
            cx, cy = 8 * i + 4 * (j % 2), 4 * j + 1
            roxa = (i + j) % 2
            for yy in range(8):
                for xx in range(8):
                    for ox in (0, 8):
                        for oy in (0, 8):
                            x, y = xx + ox, yy + oy
                            dist = math.hypot(x - cx - 0.5, y - cy - 0.5)
                            if dist > 4.3 or y < cy:
                                continue
                            if dist > 3.5:
                                letra = 'a' if not roxa else 'x'
                            elif dist > 2.1:
                                letra = 'b' if not roxa else 'y'
                            else:
                                letra = 'c' if not roxa else 'z'
                            base[yy][xx] = letra
    return ladrilho([''.join(linha) for linha in base], cores)


def tecido_psicodelico():
    faixas = ['#ff3a7a', '#ffa03a', '#fff03a', '#3adc6a', '#3ab0ff', '#9a4aff']
    letras = 'abcdef'
    base = []
    for yy in range(12):
        linha = ''
        for xx in range(12):
            onda = round(1.6 * math.sin(2 * math.pi * xx / 12))
            linha += letras[((xx + yy + onda) % 12) // 2]
        base.append(linha)
    return ladrilho(base, dict(zip(letras, faixas)))


def tecido_neon():
    f, g, c, p = '#1c0a3c', '#ff3aa8', '#3af0ff', '#3a1a6a'
    base = []
    for yy in range(6):
        linha = ''
        for xx in range(6):
            if xx == 0 and yy == 0:
                linha += 'c'
            elif xx == 0 or yy == 0:
                linha += 'g'
            elif (xx + yy) % 5 == 0:
                linha += 'p'
            else:
                linha += 'f'
        base.append(linha)
    return ladrilho(base, {'f': f, 'g': g, 'c': c, 'p': p})


TECIDOS = {
    'onca': tecido_onca(),
    'psicodelico': tecido_psicodelico(),
    'galaxia': tecido_galaxia(),
    'sereia': tecido_sereia(),
    'neon-retro': tecido_neon(),
}
sprites.FABRICS.update(TECIDOS)


# --- Varais -----------------------------------------------------------------------------------------------------------------
# Os varais antigos só trocam as cores da bandeirinha; os novos também mudam o formato. A forma tem 7 colunas e as letras são o
# papel de cada pixel: b = cor, d = sombra, l = brilho, o = detalhe (olho, pepperoni, florzinha...). Tudo o que não é `.` pinta.

FORMAS = {
    'coracao': ['.bb.bb.', 'blbbbbd', 'bbbbbbd', '.bbbbd.', '..bbd..', '...d...'],
    'estrela': ['...b...', '...b...', 'bbbbbbb', '.blbbd.', '..bbd..', '.bd.bd.'],
    'peixe': ['..bbb.b', '.blbbbb', 'bobbbbb', '.bdddbb', '..ddd.b'],
    'lanterna': ['..ddd..', '.dbbbd.', 'dbldbbd', 'dbldbbd', 'dbldbbd', '.dbbbd.', '..ddd..', '...o...'],
    'fatia': ['ddddddd', '.bbobb.', '.blbbb.', '..bob..', '...b...'],
}

VARAIS_NOVOS = {
    'varal-pizza': ('fatia', [('A', 'a', 'F', 'R'), ('X', 'E', 'z', 'G'), ('A', 'a', 'F', 'g'), ('f', 'k', 'O', 'R')]),
    'varal-coracao': ('coracao', [('R', 'r', 'p'), ('H', 'h', 'c'), ('P', 'i', 'I'), ('R', 'r', 'p'), ('X', 'E', 'z')]),
    'varal-peixe': ('peixe', [('J', 'j', 'b', 'X'), ('K', 'k', 'O', 'X'), ('g', 'v', 'G', 'X'), ('R', 'r', 'p', 'X'), ('A', 'a', 'F', 'X')]),
    'varal-lanterna': ('lanterna', [('R', 'r', 'p', 'A'), ('A', 'a', 'F', 'R'), ('K', 'k', 'O', 'A'), ('H', 'h', 'c', 'A')]),
    'varal-estrelas': ('estrela', [('A', 'a', 'F'), ('X', 'E', 'z'), ('C', 'J', 'b'), ('F', 'f', 'z')]),
}


# --- Terreiros --------------------------------------------------------------------------------------------------------------
# Paletas para o gerador de ilhas do jogo (src/festa.js), em cores hexadecimais: `top`, `mid`, `sub`, `soil`, `deep`, `low` e
# `edge` são as camadas de cima para baixo; `speck` os pontinhos na terra; `flowers` e `tuft` o que cresce na beirada; `root` as
# cores das raízes que pendem (vazio: sem raízes) e `pattern` um desenho especial da camada de cima.


def paleta(*hexes):
    return list(hexes)


TERRENOS_NOVOS = {
    # Nuvem: a ilha é feita de algodão e não tem raízes.
    'nuvem': {'top': paleta('#ffffff', '#f4f8ff', '#ffffff', '#e8f0ff'), 'mid': paleta('#e8f0ff', '#d8e4fa'),
              'sub': paleta('#c8d8f4', '#b8cce8'), 'soil': paleta('#b0c4e4', '#a0b8de', '#c0d0ee'), 'deep': paleta('#98acd8', '#8aa0d0'),
              'low': paleta('#7a90c4'), 'edge': paleta('#6a80b8'), 'speck': paleta('#ffffff', '#e0ecff'), 'flowers': [],
              'tuft': paleta('#ffffff', '#e8f0ff'), 'root': []},
    # Iceberg: gelo azul com neve em cima e pingentes no lugar das raízes.
    'gelo': {'top': paleta('#f4feff', '#ffffff', '#d8f8ff'), 'mid': paleta('#c0f0ff', '#a8e4ff'), 'sub': paleta('#8ad4f8', '#74c4f0'),
             'soil': paleta('#5ab4e8', '#4aa4dc', '#6ac4f0'), 'deep': paleta('#3a88c8', '#2a78b8'), 'low': paleta('#1a5898'),
             'edge': paleta('#103c78'), 'speck': paleta('#ffffff', '#bff0ff'), 'flowers': [], 'tuft': paleta('#ffffff'),
             'root': paleta('#bff0ff', '#6ac4f0', '#bff0ff', '#ffffff')},
    # Rocha de lava: basalto escuro com veios de lava, chamas na beirada e gotas de lava pendendo.
    'lava': {'top': paleta('#2a2430', '#1c1820', '#3a3040'), 'mid': paleta('#1c1820', '#2a2430'),
             'sub': paleta('#c8300e', '#2a2430', '#1c1820', '#2a2430'), 'soil': paleta('#1c1820', '#2a2430', '#3a1010', '#1c1820', '#2a2430', '#ff5a1e'),
             'deep': paleta('#2a2430', '#1c1820', '#c8300e'), 'low': paleta('#3a1010'), 'edge': paleta('#120906'),
             'speck': paleta('#ffb02a', '#ff5a1e'), 'flowers': [], 'tuft': paleta('#ff5a1e', '#ffb02a', '#ffd060'),
             'root': paleta('#ff5a1e', '#c8300e', '#ff5a1e', '#ffd060')},
    # Bolo de confeitaria: cobertura rosa com granulado, creme, massa amarela e gotas de chocolate.
    'bolo-confeitado': {'top': paleta('#ff9ac8', '#ffb0d8', '#ff8ab8'), 'mid': paleta('#ffffff', '#fff0f8'), 'sub': paleta('#ff80b0', '#ff98c4'),
                        'soil': paleta('#ffd878', '#ffc858', '#f4b848'), 'deep': paleta('#f4b848', '#e8a838'), 'low': paleta('#c87a20'),
                        'edge': paleta('#7a3a10'), 'speck': paleta('#ffffff', '#ff4a6a'),
                        'flowers': paleta('#ff4a6a', '#ffd21e', '#3ab8ff', '#9aff3a', '#ffffff'), 'tuft': paleta('#ff4a8a'),
                        'root': paleta('#5a2c14', '#3a1c0c', '#5a2c14', '#7a3c1c')},
    # Pista de disco: o chão acende em quadrinhos coloridos (`pattern: 'disco'`) e os fios pendem no lugar das raízes.
    'pista-disco': {'top': paleta('#ff3a9a', '#ffb83a', '#4aff6a', '#3ab8ff', '#b04aff', '#ff4a3a'),
                    'mid': paleta('#b02a70', '#b08028', '#2aa848', '#2a80b0', '#7a2ab0', '#b03228'), 'sub': paleta('#2a1450', '#1c0a3c'),
                    'soil': paleta('#2a1450', '#1c0a3c', '#3a1c6a', '#2a1450', '#ff3a9a', '#3ab8ff', '#ffd21e', '#4aff6a'), 'deep': paleta('#1c0a3c', '#120628', '#2a1450', '#ff3a9a', '#3ab8ff'), 'low': paleta('#120628'),
                    'edge': paleta('#0a0418'), 'speck': paleta('#ffffff', '#bff0ff'), 'flowers': [], 'tuft': [],
                    'root': paleta('#5a5a70', '#3a3a50', '#8a8aa0', '#c8ccd8'), 'pattern': 'disco'},
}


def mini_terreno(paleta_, semente=5):
    """Ícone da loja do terreiro: um pedacinho de ilha de 22 x 10 pixels (como o dos outros terreiros)."""
    import random
    rng = random.Random(semente)
    imagem = Image.new('RGBA', (22, 10), (0, 0, 0, 0))
    for x in range(22):
        t = (x - 10.5) / 10.5
        fundo = int(3 + 6 * max(0.0, 1 - t * t) ** 0.8)
        for y in range(fundo + 1):
            if y == 0:
                if paleta_.get('pattern') == 'disco':
                    cor_ = paleta_['top'][(x // 3) % len(paleta_['top'])]
                else:
                    cor_ = rng.choice(paleta_['top'])
            elif y == 1:
                if paleta_.get('pattern') == 'disco':
                    cor_ = paleta_['mid'][(x // 3 + 1) % len(paleta_['mid'])]
                else:
                    cor_ = rng.choice(paleta_['mid'])
            elif y == 2:
                cor_ = rng.choice(paleta_['sub'])
            elif y < 5:
                cor_ = rng.choice(paleta_['soil'])
            else:
                cor_ = rng.choice(paleta_['deep'])
            imagem.putpixel((x, y), hex_rgb(cor_) + (255,))
    return outline(imagem)


def icone_varal(cores_, forma):
    """Ícone dos varais de formato novo na loja: um pedaço de fio com três bandeirinhas no formato e nas cores dele."""
    imagem = Image.new('RGBA', (23, 11), (0, 0, 0, 0))
    fio = hex_rgb(sprites.PALETTE['d']) + (255,)
    for x in range(23):
        imagem.putpixel((x, 1 + round(1.4 * math.sin(math.pi * x / 22))), fio)
    for k, x0 in enumerate((0, 8, 16)):
        flag = cores_[k % len(cores_)]
        base, escura, clara = (sprites.PALETTE[c] for c in flag[:3])
        detalhe = sprites.PALETTE[flag[3]] if len(flag) > 3 else base
        topo = 2 + round(1.4 * math.sin(math.pi * (x0 + 3) / 22))
        for dy, linha in enumerate(forma):
            for dx, letra in enumerate(linha):
                if letra != '.' and topo + dy < 11:
                    imagem.putpixel((x0 + dx, topo + dy), hex_rgb({'b': base, 'd': escura, 'l': clara, 'o': detalhe}[letra]) + (255,))
    return outline(imagem)
