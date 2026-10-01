"""A Casa da Mandioca (do convidado 100 em diante): os moradores, os efeitos e o ícone.

Cada morador tem um visual próprio (forma do corpo, cor da casca, rosto, chapéu, roupa) e uma atividade que ele faz em
loop (6 quadros) mais um 7º quadro de reação ao clique. A atividade vem do cômodo: cada tipo de cômodo tem duas
(`SALAS`, em casa_salas.py; os 36 cômodos e as 72 atividades, uma para cada morador) e o morador `i` mora no cômodo `i // 2`, no lugar `i % 2`.
As 24 primeiras atividades estão aqui; as outras 48 ficam em casa_mais.py. O visual sai de uma semente fixa,
então o mesmo morador é sempre igual. Os desenhos são montados por código (nada de grade à mão por morador).
"""

import random

from PIL import Image

from render import outline

# Área de desenho do morador; o contorno de 1 px acrescenta uma borda (quadro final 28x34).
CW, CH = 26, 32
QUADROS = 6
REACAO = QUADROS
POR_FOLHA = 24            # moradores por folha de imagem (a tira fica com 24 x 7 quadros de 28 px)
DESENHOS = 72             # um visual para cada morador: 36 cômodos x 2 (a casa para de crescer quando o último enche)

# --- Cores -----------------------------------------------------------------------------------------------------------
LEG = {
    'k': (38, 26, 32), 'w': (250, 250, 244), 'g': (170, 172, 184), 'G': (96, 98, 112), 'r': (224, 52, 62), 'R': (150, 30, 44),
    'y': (255, 214, 48), 'Y': (204, 150, 24), 'o': (244, 146, 44), 'b': (64, 118, 232), 'B': (34, 62, 156), 'c': (88, 214, 232),
    'l': (116, 214, 84), 'L': (50, 142, 54), 'n': (156, 98, 52), 'N': (92, 56, 28), 'p': (255, 116, 174), 'P': (184, 52, 114),
    'm': (164, 92, 214), 'M': (98, 52, 146), 's': (204, 208, 220), 'S': (122, 128, 144), 't': (250, 226, 192), 'T': (214, 176, 130),
}

# Casca da mandioca: (casca, sombra, luz, rosto, sombra do rosto).
CASCAS = {
    'marrom': ('#8a5a34', '#5c3820', '#b07a48', '#f2dcb4', '#dcb98a'),
    'dourada': ('#c9923a', '#8e6320', '#e8b85a', '#fff0c8', '#ecd59a'),
    'ruiva': ('#a8523a', '#6e301f', '#cf7b5e', '#ffe2d0', '#ecbfa4'),
    'roxa': ('#7a4f9a', '#4a2c66', '#a27cc2', '#f0e0ff', '#d6bff0'),
    'musgo': ('#6b8a3a', '#3f5a1f', '#94b85a', '#f0f8d0', '#d0e4a0'),
    'azulada': ('#4f6f9a', '#2c4566', '#7c9cc8', '#e0f0ff', '#bcd8f0'),
    'rosada': ('#c4607a', '#8a3450', '#e890a8', '#ffe8ee', '#f4c8d4'),
    'cinza': ('#7d7d86', '#4a4a52', '#a8a8b2', '#f2f2f6', '#d4d4dc'),
    'laranja': ('#d2782c', '#8f4a14', '#f0a050', '#fff0d8', '#f4d4a8'),
    'palida': ('#b89a78', '#806646', '#d8bc9c', '#fff6e8', '#f0dcc0'),
}
ROUPAS = ['r', 'b', 'l', 'y', 'o', 'm', 'p', 'c', 'w', 'k', 'n', 'B']
PADROES = ['liso', 'listras', 'bolinhas', 'xadrez', 'suspensorio', 'colete']
OLHOS = ['ponto', 'grande', 'feliz', 'cilios', 'oculos']
BOCAS = ['sorriso', 'aberta', 'dente', 'reto', 'lingua']
EXTRAS = ['nenhum', 'nenhum', 'bigode', 'sardas', 'bochechas', 'nenhum']
CHAPEUS = ['folhas', 'laco', 'helice', 'chef', 'festa', 'coroa', 'gorro', 'fone', 'cowboy', 'bandana', 'flor', 'broto',
           'antena', 'cartola', 'nenhum']

# Corpo: largura/altura da cabeça, da roupa, tamanho das pernas.
FORMAS = {
    'media': dict(hw=12, hh=10, bw=14, bh=8, lh=4),
    'gorducha': dict(hw=14, hh=10, bw=18, bh=9, lh=3),
    'alta': dict(hw=10, hh=11, bw=11, bh=11, lh=5),
    'baixinha': dict(hw=12, hh=8, bw=13, bh=6, lh=3),
    'bolota': dict(hw=16, hh=14, bw=10, bh=5, lh=3),
    'comprida': dict(hw=9, hh=12, bw=10, bh=10, lh=6),
}
ALTAS = ('alta', 'comprida')


def rgb(valor):
    if isinstance(valor, tuple):
        return valor
    valor = valor.lstrip('#')
    return tuple(int(valor[i:i + 2], 16) for i in (0, 2, 4))


class Tela:
    def __init__(self, largura, altura):
        self.im = Image.new('RGBA', (largura, altura), (0, 0, 0, 0))
        self.px = self.im.load()
        self.w, self.h = largura, altura

    def put(self, x, y, cor):
        x, y = round(x), round(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[x, y] = rgb(cor) + (255,)

    def apagar(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[x, y] = (0, 0, 0, 0)

    def rect(self, x0, y0, x1, y1, cor):
        for y in range(round(y0), round(y1) + 1):
            for x in range(round(x0), round(x1) + 1):
                self.put(x, y, cor)

    def line(self, x0, y0, x1, y1, cor):
        passos = max(abs(x1 - x0), abs(y1 - y0), 1)
        for i in range(int(passos) + 1):
            t = i / passos
            self.put(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, cor)

    def grade(self, linhas, x, y, legenda=LEG):
        for dy, linha in enumerate(linhas):
            for dx, letra in enumerate(linha):
                if letra != '.':
                    self.put(x + dx, y + dy, legenda[letra])


# --- Chapéus e enfeites da cabeça (centrados em cima da cabeça; 'x' marca o pixel central de baixo) --------------------
# Cada um é uma grade cuja última linha encosta no alto da cabeça.
TOPOS = {
    'folhas': ['l..l.l..l', '.lLlLlLl.', '..LLnLL..'],
    'laco': ['pp...pp', 'pPppPpp', 'pp.P.pp'],
    'helice': ['..sSs..', '...S...', '.rrrrrr', 'rrrrrrr'],
    'chef': ['.wwww.', 'wwwwww', 'wwwwww', 'wwwwww'],
    'festa': ['...y...', '..ppp..', '.ppbpp.', 'ppbppbp'],
    'coroa': ['y.y.y.y', 'yyyyyyy', 'yrYbYry'],
    'gorro': ['..w..', '.rrr.', 'rrwrr', 'wwwww'],
    'fone': ['.kkkkkk.', 'k......k'],
    'cowboy': ['..nnnn..', '.nnnnnn.', 'NNNNNNNNNN'],
    'bandana': ['rrrrrrr', 'wrwrwrw'],
    'flor': ['.p.p.', '..y..', '.p.p.', '..l..'],
    'broto': ['.l.l.', '..L..', '..L..'],
    'antena': ['.r.', '.S.', '.S.'],
    'cartola': ['.kkkk.', '.kkkk.', '.kbbk.', 'kkkkkk'],
    'nenhum': [],
}
GORRO_DORMIR = ['..wwp', '.wwww', 'wwwww', 'pppppp']


# --- Props (grades curtas): agulhas, avião, colher, etc. ------------------------------------------------------------
PROPS = {
    'agulhas': ['s.......s', '.s.....s.', '..s...s..', '...sSs...', '..rrRrr..', '.rrrrrrr.', '..rrrrr..'],
    'novelo': ['.rrr.', 'rRrrr', 'rrrRr', '.rrr.'],
    'aviao': ['...w...', '.rrrrrw', '...w...'],
    'colher': ['.n', '.n', 'nn'],
    'panela': ['.gggggggg.', 'GgggggggGG', 'GsssssssG.', '.GGGGGGGG.'],
    'batedor': ['.s.', 'sSs', 'sSs', '.n.', '.n.'],
    'tigela': ['.tttttt.', 'tttttttt', '.tttttt.'],
    'urso': ['.n..n.', 'nnnnnn', 'nkNNkn', '.nttn.', '.nnnn.', '.n..n.'],
    'livro_a': ['bwwwwwwb', 'bwkwwkwb', 'bwwwwwwb', 'bwkwwkwb', '.bbbbbb.'],
    'livro_b': ['bwwwwwwb', 'bkwwwwkb', 'bwwkwwwb', 'bwwwwkwb', '.bbbbbb.'],
    'patinho': ['.yy.', 'yyyo', '.yy.'],
    'escova': ['bbbbbw'],
    'violao': ['nn............', '.nN...........', '..NN..........', '...NN..ooo....', '....NNoooooo..', '.....oooYkooo.', '.....oooooooo.',
               '......oooooo..'],
    'tambor': ['.rrrrr.', 'rwwwwwr', 'rrrrrrr', 'rrrrrrr'],
    'cavalete_a': ['.wwwwwww.', '.wbbwwyw.', '.wwwwrww.', '.wwwwwww.', '..n...n..'],
    'cavalete_b': ['.wwwwwww.', '.wbbwwyw.', '.wwwwrrw.', '.wwwwwww.', '..n...n..'],
    'cavalete_c': ['.wwwwwww.', '.wbbwwyw.', '.wlwwrrw.', '.wwwlwww.', '..n...n..'],
    'pincel': ['.r', '.n', 'n.'],
    'regador': ['.ss...', 'sssssn', 'sssss.', 'GGGGG.'],
    'flor': ['.p.', 'ppp', '.l.', '.l.'],
    'halter': ['kk.....kk', 'kGGGGGGGk', 'kk.....kk'],
    'frasco_a': ['.gg.', '.ww.', 'wllw', 'wllw'],
    'frasco_b': ['.gg.', '.ww.', 'wppw', 'wppw'],
    'frasco_c': ['.gg.', '.ww.', 'wccw', 'wccw'],
    'luneta_a': ['.......ss', '.....sSs.', '...sSs...', '.nnss....', 'n..n.....'],
    'luneta_b': ['.........s', '......ssS.', '....sSs...', '..nnss....', '.n..n.....'],
    'luneta_c': ['.....ss...', '....sSs...', '...sSs....', '..nns.....', '.n..n.....'],
    'controle': ['.kkkk.', 'kgkkgk', '.kkkk.'],
    'raquete': ['.rr.', 'rrrr', 'rrrr', '.nn.', '.n..'],
    'bolinha': ['ww', 'ww'],
    'mesa': ['.ssssssss.', '.sbbbbbbs.', '.ssssssss.', 'gggggggggg'],
    'mesa_pp': ['.....ll.....', 'lllllllllllL', 'llllwwwwllll', '.n........n.', '.n........n.'],
    'microfone': ['.kk', 'kkk', '.n.', '.n.'],
    'banheira': ['wwwwwwwwwwww', 'wsssssssssww', 'wswwwwwwwsww', '.wwwwwwwwww.', '..S......S..'],
    'bola_a': ['rr', 'rr'], 'bola_b': ['yy', 'yy'], 'bola_c': ['bb', 'bb'],
}

def prop(tela, nome, x, y):
    tela.grade(PROPS[nome], round(x), round(y))


# --- Atividades ------------------------------------------------------------------------------------------------------
# bob: sobe/desce do corpo por quadro; sway: balanço para os lados; L/R: mão esquerda/direita relativa ao ombro;
# props: lista de (nome(s), âncora, dx, dy, camada). Âncora: 'R'/'L' (mão), 'C' (peito), 'P' (pés), 'F' (rosto), 'S' (fixo no quadro).
# nome pode ser uma lista (um por quadro). olhos/boca: 'fechado'/'feliz'/'grande'/... força o rosto; fx: efeito que
# sai do lugar (x, y) no quadro 26x32, de tempos em tempos (a festa desenha).
def seq6(*itens):
    itens = list(itens)
    return (itens * 6)[:6]


ATIVIDADES = {
    'trico': dict(fps=6, bob=[0] * 6, L=[(-4, 4), (-5, 3), (-4, 4), (-5, 3), (-4, 4), (-5, 3)],
                  R=[(4, 4), (5, 3), (4, 4), (5, 3), (4, 4), (5, 3)],
                  props=[('agulhas', 'C', -4, 1, 'mao'), ('novelo', 'S', 19, 27, 'frente')], fx=None),
    'aviao': dict(fps=8, bob=[0, 0, -1, 0, 0, -1], L=[(-3, 4)] * 6,
                  R=[(5, -5), (8, -8), (6, -11), (1, -9), (-1, -6), (2, -3)],
                  props=[('aviao', 'R', -3, -1, 'mao')], fx=('brilho', 22, 4, 500)),
    'cozinhar': dict(fps=6, bob=[0] * 6, L=[(-3, 4)] * 6,
                     R=[(6, 4), (8, 5), (7, 6), (5, 6), (4, 5), (5, 4)],
                     props=[('panela', 'S', 12, 25, 'frente'), ('colher', 'R', 0, -1, 'mao')],
                     fx=('vapor', 18, 22, 600)),
    'bolo': dict(fps=8, bob=[0] * 6, L=[(-3, 5)] * 6,
                 R=[(4, 2), (6, 3), (7, 5), (6, 6), (4, 6), (3, 4)],
                 props=[('tigela', 'S', 7, 24, 'frente'), ('batedor', 'R', -1, -4, 'mao')], fx=('brilho', 12, 22, 700)),
    'dormir': dict(fps=3, bob=[0, 0, 1, 1, 0, 0], sway=[0, 0, 0, 0, 0, 0], L=[(3, 4)] * 6, R=[(-3, 5)] * 6,
                   props=[('urso', 'C', -3, 1, 'mao')], olhos='fechado', boca='reto', chapeu='dormir',
                   fx=('zzz', 20, 2, 900)),
    'ler': dict(fps=4, bob=[0] * 6, L=[(-3, 4)] * 6, R=[(3, 4)] * 6, olhos='baixo', extra='oculos',
                props=[(seq6('livro_a', 'livro_a', 'livro_b', 'livro_b', 'livro_a', 'livro_b'), 'C', -4, 2, 'mao')], fx=None),
    'banho': dict(fps=4, bob=[0, -1, 0, -1, 0, 0], L=[(-5, 2)] * 6,
                  R=[(5, 1), (6, -1), (5, -3), (6, -1), (5, 1), (5, 2)],
                  props=[('patinho', 'R', -1, -2, 'mao'), ('banheira', 'S', 7, 21, 'frente')], fx=('bolha', 18, 14, 450)),
    'dentes': dict(fps=8, bob=[0] * 6, L=[(-3, 5)] * 6,
                   R=[(2, -3), (4, -3), (2, -3), (4, -3), (2, -3), (4, -3)], boca='aberta',
                   props=[('escova', 'R', -3, -1, 'mao')], fx=('bolha', 9, 10, 500)),
    'violao': dict(fps=8, bob=[0, 0, 0, 0, 0, 0], sway=[0, 1, 0, -1, 0, 1],
                   L=[(-6, -2)] * 6, R=[(2, 5), (3, 7), (2, 5), (3, 7), (2, 5), (3, 7)],
                   props=[('violao', 'C', -7, 0, 'mao')], fx=('nota', 20, 6, 480)),
    'bateria': dict(fps=8, bob=[0, -1, 0, -1, 0, -1],
                    L=[(-5, -2), (-5, 4), (-5, -2), (-5, 4), (-5, -2), (-5, 4)],
                    R=[(5, 4), (5, -2), (5, 4), (5, -2), (5, 4), (5, -2)],
                    props=[('tambor', 'S', 1, 24, 'frente'), ('tambor', 'S', 16, 24, 'frente')], fx=('nota', 20, 8, 420)),
    'pintar': dict(fps=6, bob=[0] * 6, L=[(-3, 5)] * 6,
                   R=[(4, -1), (6, -3), (8, -1), (6, 1), (4, 0), (6, -2)],
                   props=[(seq6('cavalete_a', 'cavalete_a', 'cavalete_b', 'cavalete_b', 'cavalete_c', 'cavalete_c'),
                           'S', 17, 9, 'costas'), ('pincel', 'R', -1, -2, 'mao')], fx=('brilho', 22, 8, 700)),
    'malabares': dict(fps=8, bob=[0] * 6, L=[(-5, -1), (-4, -3), (-5, -1), (-4, -3), (-5, -1), (-4, -3)],
                      R=[(5, -3), (4, -1), (5, -3), (4, -1), (5, -3), (4, -1)], props=[], bolas=True, fx=None),
    'regar': dict(fps=6, bob=[0] * 6, L=[(-3, 4)] * 6,
                  R=[(6, -1), (6, -2), (7, -3), (7, -2), (6, -1), (6, -2)],
                  props=[('regador', 'R', -2, -2, 'mao')], fx=('gota', 25, 11, 330)),
    'flor': dict(fps=4, bob=[0, -1, 0, 0, -1, 0], L=[(-3, 4)] * 6,
                 R=[(3, -3), (3, -4), (3, -3), (3, -3), (3, -4), (3, -3)], olhos='fechado', boca='feliz',
                 props=[('flor', 'R', -1, -3, 'mao')], fx=('coracao', 17, 4, 900)),
    'halteres': dict(fps=4, bob=[0, 1, 1, 0, 0, -1], L=[(-1, -2), (-1, 0), (-1, 1), (-1, 0), (-1, -2), (-1, -4)],
                     R=[(1, -2), (1, 0), (1, 1), (1, 0), (1, -2), (1, -4)], boca='dente', barra=True,
                     props=[], fx=('gota', 3, 3, 800)),
    'corda': dict(fps=10, bob=[0, -2, -3, -2, 0, 0], L=[(-5, 2)] * 6, R=[(5, 2)] * 6, corda=True, boca='aberta', fx=None),
    'experimento': dict(fps=4, bob=[0] * 6, L=[(-3, 4)] * 6, R=[(5, -1), (5, -2), (5, -1), (5, -2), (5, -1), (5, -2)],
                        props=[(seq6('frasco_a', 'frasco_a', 'frasco_b', 'frasco_b', 'frasco_c', 'frasco_c'), 'R', -2, -4, 'mao')],
                        olhos='grande', fx=('bolha', 24, 6, 400)),
    'telescopio': dict(fps=3, bob=[0] * 6, L=[(-3, 4)] * 6, R=[(3, 3)] * 6, olhos='grande',
                       props=[(seq6('luneta_a', 'luneta_a', 'luneta_b', 'luneta_b', 'luneta_c', 'luneta_c'), 'S', 10, 12, 'frente')],
                       fx=('brilho', 22, 3, 600)),
    'videogame': dict(fps=8, bob=[0, 0, -1, 0, 0, -1], sway=[0, 1, 0, -1, 0, 1], L=[(-3, 4), (-3, 3)] * 3,
                      R=[(3, 4), (3, 3)] * 3, olhos='grande', boca='aberta',
                      props=[('controle', 'C', -3, 4, 'mao')], fx=('estrela', 20, 6, 700)),
    'pingpong': dict(fps=8, bob=[0, 0, -1, 0, 0, -1], L=[(-3, 4)] * 6,
                     R=[(5, 1), (7, -1), (7, -3), (5, -1), (4, 2), (4, 3)], boca='dente',
                     props=[('raquete', 'R', -2, -4, 'mao'), ('mesa_pp', 'S', 8, 24, 'frente')], fx=('brilho', 24, 14, 500)),
    'digitar': dict(fps=8, bob=[0] * 6, L=[(-3, 4), (-2, 5), (-3, 4), (-2, 5), (-3, 4), (-2, 5)],
                    R=[(3, 5), (2, 4), (3, 5), (2, 4), (3, 5), (2, 4)], olhos='baixo', extra='oculos',
                    props=[('mesa', 'S', 8, 25, 'frente')], fx=None),
    'ioga': dict(fps=3, bob=[0, -1, -2, -2, -1, 0], L=[(-2, 2)] * 6, R=[(2, 2)] * 6, olhos='fechado', boca='reto',
                 props=[], fx=('brilho', 13, 2, 500)),
    'danca': dict(fps=8, bob=[0, -2, 0, -2, 0, -2], sway=[-1, 0, 1, 0, -1, 0], passo=True,
                  L=[(-5, -4), (-4, 4), (-5, -4), (-4, 4), (-5, -4), (-4, 4)],
                  R=[(4, 4), (5, -4), (4, 4), (5, -4), (4, 4), (5, -4)], boca='aberta',
                  props=[], fx=('nota', 4, 4, 420)),
    'cantar': dict(fps=6, bob=[0, 0, -1, 0, 0, -1], L=[(-3, 4)] * 6, R=[(2, -3)] * 6,
                   boca='aberta', olhos='fechado', props=[('microfone', 'R', -1, -2, 'mao')], fx=('nota', 20, 4, 450)),
}
FACES = {}                 # enfeites do rosto das atividades (casa_mais.py)
ATIVIDADES_ALTAS_NAO = {'corda', 'danca', 'halteres', 'malabares', 'ioga'}


# --- Um morador -------------------------------------------------------------------------------------------------------
def sortear_desenhos():
    """Um visual para cada morador: os dois primeiros (a esposa e o filho) são fixos; o resto sai de uma semente e nunca se
    repete; quem mora no mesmo cômodo nunca é igual (forma e casca diferentes)."""
    from casa_salas import atividade_de
    visuais = []
    usados = set()
    azar = random.Random(1979)
    for i in range(DESENHOS):
        if i == 0:
            v = dict(forma='media', casca='marrom', chapeu='laco', roupa='p', padrao='bolinhas', olhos='cilios', boca='sorriso',
                     extra='bochechas', papel='esposa')
        elif i == 1:
            v = dict(forma='baixinha', casca='dourada', chapeu='helice', roupa='r', padrao='listras', olhos='grande', boca='aberta',
                     extra='sardas', papel='filho')
        else:
            atividade = atividade_de(i)
            formas = [f for f in FORMAS if not (atividade in ATIVIDADES_ALTAS_NAO and f in ALTAS)]
            for _ in range(500):
                v = dict(forma=azar.choice(formas), casca=azar.choice(list(CASCAS)), chapeu=azar.choice(CHAPEUS),
                         roupa=azar.choice(ROUPAS), padrao=azar.choice(PADROES), olhos=azar.choice(OLHOS),
                         boca=azar.choice(BOCAS), extra=azar.choice(EXTRAS), papel=None)
                chave = (v['forma'], v['casca'], v['chapeu'], v['roupa'], v['padrao'])
                vizinho = visuais[-1] if i % 2 == 1 else None
                if chave in usados or (vizinho and (vizinho['forma'] == v['forma'] or vizinho['casca'] == v['casca'])):
                    continue
                usados.add(chave)
                break
        usados.add((v['forma'], v['casca'], v['chapeu'], v['roupa'], v['padrao']))
        visuais.append(v)
    return visuais


def _olhos(tela, v, cx, y, estado, forma):
    escuro, branco = rgb('#2a1a1e'), rgb('#ffffff')
    folga = 2 if FORMAS[forma]['hw'] <= 10 else 3
    esquerdo, direito = cx - folga - 1, cx + folga
    if estado == 'fechado':
        for x in (esquerdo, direito):
            tela.rect(x - 1, y + 1, x + 1, y + 1, escuro)
        return
    if estado == 'feliz':
        for x in (esquerdo, direito):
            tela.put(x - 1, y + 1, escuro)
            tela.put(x, y, escuro)
            tela.put(x + 1, y + 1, escuro)
        return
    if estado == 'grande':
        for x in (esquerdo, direito):
            tela.rect(x, y, x + 1, y + 2, escuro)
            tela.put(x, y, branco)
        return
    if estado == 'baixo':
        for x in (esquerdo, direito):
            tela.rect(x, y + 1, x + 1, y + 2, escuro)
        return
    for x in (esquerdo, direito):
        tela.rect(x, y, x, y + 1, escuro)
    if estado == 'cilios':
        for x in (esquerdo, direito):
            tela.put(x - 1, y - 1, escuro)
            tela.put(x + 1, y - 1, escuro)


def _boca(tela, cx, y, estado, cores):
    escuro, lingua, branco = rgb('#5a1426'), rgb('#ff6a84'), rgb('#ffffff')
    if estado == 'aberta':
        tela.rect(cx - 1, y, cx, y + 1, escuro)
        tela.put(cx, y + 1, lingua)
    elif estado == 'dente':
        tela.rect(cx - 2, y, cx + 1, y, escuro)
        tela.rect(cx - 1, y + 1, cx, y + 1, branco)
    elif estado == 'reto':
        tela.rect(cx - 1, y + 1, cx, y + 1, escuro)
    elif estado == 'lingua':
        tela.rect(cx - 1, y, cx + 1, y, escuro)
        tela.put(cx, y + 1, lingua)
    else:
        tela.put(cx - 2, y, escuro)
        tela.rect(cx - 1, y + 1, cx, y + 1, escuro)
        tela.put(cx + 1, y, escuro)


def _roupa(tela, x0, y0, x1, y1, cor, padrao, claro):
    base = rgb(LEG[cor])
    escura = tuple(int(c * 0.72) for c in base)
    clara = tuple(min(255, int(c + (255 - c) * 0.45)) for c in base)
    tela.rect(x0, y0, x1, y1, base)
    if padrao == 'listras':
        for y in range(y0 + 1, y1 + 1, 2):
            tela.rect(x0, y, x1, y, clara)
    elif padrao == 'bolinhas':
        for y in range(y0 + 1, y1 + 1, 3):
            for x in range(x0 + (1 if ((y - y0) // 3) % 2 == 0 else 2), x1 + 1, 4):
                tela.put(x, y, clara)
    elif padrao == 'xadrez':
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if ((x - x0) // 2 + (y - y0) // 2) % 2:
                    tela.put(x, y, clara)
    elif padrao == 'suspensorio':
        for x in (x0 + 2, x1 - 2):
            tela.rect(x, y0, x, y1, escura)
        tela.rect(x0, y1 - 1, x1, y1, escura)
    elif padrao == 'colete':
        tela.rect(x0 + 3, y0, x1 - 3, y1, clara)
        tela.rect((x0 + x1) // 2, y0, (x0 + x1) // 2, y1, escura)
    if padrao != 'suspensorio':
        tela.rect(x0, y1, x1, y1, escura)
    tela.rect(x0, y0, x1, y0, rgb(claro))


def _por_quadro(valor, f):
    return valor[f] if isinstance(valor, list) else valor


def _rosto(tela, nome, cx, cab_y0, hh, f):
    """Enfeite do rosto: `FACES[nome] = (ancora, dy, grade)`; âncora 'topo' (a partir do alto da cabeça) ou 'boca'; a grade
    (ou uma lista de grades, uma por quadro) fica centrada na cabeça."""
    ancora, dy, grades = FACES[nome]
    grade = grades[f % len(grades)] if isinstance(grades[0], list) else grades
    x0 = cx - len(grade[0]) // 2
    y0 = cab_y0 + dy + (hh - 3 if ancora == 'boca' else 0)
    for linha_i, linha in enumerate(grade):
        for dx, letra in enumerate(linha):
            if letra != '.':
                tela.put(x0 + dx, y0 + linha_i, LEG[letra])


def _chapeu(tela, nome, cx, topo, cascas):
    if nome == 'dormir':
        grade = GORRO_DORMIR
    else:
        grade = TOPOS.get(nome, [])
    if not grade:
        return
    largura = len(grade[0])
    x0 = cx - largura // 2
    for dy, linha in enumerate(grade):
        for dx, letra in enumerate(linha):
            if letra != '.':
                tela.put(x0 + dx, topo - len(grade) + dy, LEG[letra])
    if nome == 'fone':
        tela.rect(cx - largura // 2, topo, cx - largura // 2, topo + 3, LEG['k'])
        tela.rect(cx + largura // 2 - 1, topo, cx + largura // 2 - 1, topo + 3, LEG['k'])
        tela.rect(cx - largura // 2 - 1, topo + 1, cx - largura // 2, topo + 3, LEG['r'])
        tela.rect(cx + largura // 2 - 1, topo + 1, cx + largura // 2, topo + 3, LEG['r'])


def quadro(v, atividade, f, reacao=False):
    """O quadro `f` (0 a 5) do morador `v` fazendo `atividade`; `reacao` é o 7º quadro (braços para cima, boca aberta)."""
    a = ATIVIDADES[atividade]
    forma = FORMAS[v['forma']]
    casca, sombra, luz, rosto, rosto_s = CASCAS[v['casca']]
    tela = Tela(CW, CH)
    bob = 0 if reacao else a['bob'][f]
    dx = 0 if reacao else (a.get('sway') or [0] * 6)[f]
    cx = 13 + dx
    pes = CH - 1 + bob
    hw, hh, bw, bh, lh = forma['hw'], forma['hh'], forma['bw'], forma['bh'], forma['lh']
    topo_pernas = pes - lh + 1
    roupa_y0 = topo_pernas - bh
    cab_y0 = roupa_y0 - hh + 1
    cab_x0 = cx - hw // 2
    cab_x1 = cab_x0 + hw - 1
    rx0, rx1 = cx - bw // 2, cx - bw // 2 + bw - 1
    sapato = rgb('#3a2418')

    # Camada de trás (cavalete e afins).
    def props_de(camada):
        for p in a.get('props', []):
            nome, ancora, pdx, pdy, pcamada = p
            if pcamada != camada:
                continue
            nome = nome[f] if isinstance(nome, list) else nome
            pdx = pdx[f] if isinstance(pdx, list) else pdx
            pdy = pdy[f] if isinstance(pdy, list) else pdy
            if not nome:
                continue
            if ancora == 'S':
                x, y = pdx, pdy
            elif ancora == 'P':
                x, y = cx + pdx, pes + pdy
            elif ancora == 'F':
                x, y = cx + pdx, cab_y0 + pdy
            elif ancora == 'C':
                x, y = cx + pdx, roupa_y0 + pdy
            else:
                mx, my = maos[ancora]
                x, y = mx + pdx, my + pdy
            if ancora in ('R', 'L', 'C'):
                y = min(y, CH - len(PROPS[nome]))   # o que o morador segura não sai por baixo do quadro
            prop(tela, nome, x, y)

    # Ombros e mãos.
    ombro_y = roupa_y0 + 1 if forma['bw'] else cab_y0 + hh - 3
    ombros = {'L': (rx0, ombro_y), 'R': (rx1, ombro_y)}
    maos = {}
    for lado in ('L', 'R'):
        if reacao:
            off = (-5, -6) if lado == 'L' else (5, -6)
        else:
            off = a[lado][f]
        mx, my = ombros[lado][0] + off[0], ombros[lado][1] + off[1]
        maos[lado] = (max(1, min(CW - 3, mx)), min(CH - 2, my))   # a mão não sai do quadro (corpos largos, corpos baixos)

    props_de('costas')

    # Pernas (na dança, um pé levanta a cada quadro).
    for lado, px in (('L', cx - max(2, bw // 4) - 1), ('R', cx + max(1, bw // 4))):
        levantada = (a.get('passo') and ((f % 2 == 0) == (lado == 'L'))) and not reacao
        y0 = topo_pernas - (1 if levantada else 0)
        tela.rect(px, y0, px + 1, pes - 1 - (1 if levantada else 0), casca)
        tela.rect(px - 1, pes - (1 if levantada else 0), px + 2, pes - (1 if levantada else 0), sapato)

    # Roupa.
    _roupa(tela, rx0, roupa_y0, rx1, roupa_y0 + bh - 1, v['roupa'], v['padrao'], luz)

    # Cabeça (raiz): casca com cantos cortados, luz em cima/esquerda, sombra embaixo/direita, rosto claro no meio.
    tela.rect(cab_x0, cab_y0, cab_x1, cab_y0 + hh - 1, casca)
    for (x, y) in ((cab_x0, cab_y0), (cab_x1, cab_y0)):
        tela.apagar(x, y)
    tela.rect(cab_x0 + 1, cab_y0, cab_x1 - 1, cab_y0, luz)
    tela.rect(cab_x1, cab_y0 + 1, cab_x1, cab_y0 + hh - 1, sombra)
    tela.rect(cab_x0 + 2, cab_y0 + 2, cab_x1 - 2, cab_y0 + hh - 2, rosto)
    tela.rect(cab_x0 + 2, cab_y0 + hh - 2, cab_x1 - 2, cab_y0 + hh - 2, rosto_s)

    olhos = 'feliz' if reacao else _por_quadro(a.get('olhos'), f) or v['olhos']
    oculos = v['olhos'] == 'oculos' or a.get('extra') == 'oculos'
    if olhos == 'oculos':
        olhos = 'ponto'
    if not reacao and not a.get('olhos') and not a.get('rosto') and f == 3 and olhos != 'cilios':
        olhos = 'fechado'  # pisca
    _olhos(tela, v, cx, cab_y0 + 3, olhos, v['forma'])
    if oculos and olhos not in ('fechado',) or (oculos and f == 3):
        folga = 2 if hw <= 10 else 3
        esq, dir_ = cx - folga - 1, cx + folga
        for x in (esq, dir_):
            tela.rect(x - 1, cab_y0 + 2, x + 2, cab_y0 + 5, (40, 40, 52))
            tela.rect(x, cab_y0 + 3, x + 1, cab_y0 + 4, rgb('#bfe4ff'))
        tela.rect(esq + 3, cab_y0 + 3, dir_ - 2, cab_y0 + 3, (40, 40, 52))
        if olhos != 'fechado':
            for x in (esq, dir_):
                tela.rect(x, cab_y0 + 3, x, cab_y0 + 4, rgb('#2a1a1e'))
    boca = 'aberta' if reacao else _por_quadro(a.get('boca'), f) or v['boca']
    _boca(tela, cx, cab_y0 + hh - 3, boca if boca != 'feliz' else 'sorriso', (casca, sombra))
    extra = v['extra']
    if extra == 'bochechas':
        for x in (cx - (hw // 2) + 2, cx + (hw // 2) - 3):
            tela.put(x, cab_y0 + hh - 4, rgb('#ff9aaa'))
    elif extra == 'sardas':
        for x in (cx - 3, cx - 1, cx + 1, cx + 3):
            tela.put(x, cab_y0 + 5, sombra)
    elif extra == 'bigode':
        tela.rect(cx - 2, cab_y0 + hh - 4, cx + 1, cab_y0 + hh - 4, rgb('#3a2418'))

    # Enfeites do rosto (óculos 3D, pepino, visor...).
    for nome_rosto in (a.get('rosto') or []):
        _rosto(tela, nome_rosto, cx, cab_y0, hh, f)

    # Chapéu.
    chapeu = a.get('chapeu') or v['chapeu']
    _chapeu(tela, chapeu, cx, cab_y0, (casca, sombra, luz))

    # Braços (linha fina com mão) e props seguros nas mãos.
    braco = sombra
    for lado in ('L', 'R'):
        sx, sy = ombros[lado]
        hx, hy = maos[lado]
        tela.line(sx, sy, hx, hy, braco)
        tela.rect(hx - (1 if lado == 'L' else 0), hy, hx + (0 if lado == 'L' else 1), hy + 1, luz)

    # Props: os das mãos e os da frente por cima do corpo.
    if not reacao:
        if a.get('bolas'):
            fases = [(6, -6, 'bola_a'), (13, -10, 'bola_b'), (19, -6, 'bola_c')]
            for k, (bx, by, nome) in enumerate(fases):
                alt = (f + k * 2) % 6
                altura = [0, -3, -5, -6, -5, -3][alt]
                lado = (f * 2 + k * 4) % 12
                tela.grade(PROPS[nome], round(cx - 7 + (lado / 12) * 14), cab_y0 - 3 + altura - 2)
        if a.get('corda'):
            # A corda faz um laço: embaixo dos pés, sobe por trás, passa por cima da cabeça e desce na frente.
            cosv = [1.0, 0.2, -1.0, -1.0, 0.2, 1.0][f]
            topo = max(0, cab_y0 - 3)
            mao_y = maos['L'][1]
            ext = 9
            for k in range(-ext, ext + 1):
                t = k / ext
                alvo = pes if cosv > 0 else topo
                ponto = mao_y + (alvo - mao_y) * abs(cosv) * (1 - t * t)
                tela.put(cx + k, ponto, LEG['y'])
                tela.put(cx + k, ponto + 1, LEG['Y'])
        if a.get('fita'):
            esq, dir_ = maos['L'], maos['R']
            passos = max(abs(dir_[0] - esq[0]), 1)
            for k in range(passos + 2):
                t = k / (passos + 1)
                px_, py_ = esq[0] + (dir_[0] + 1 - esq[0]) * t, esq[1] + 1 + (dir_[1] - esq[1]) * t
                tela.put(px_, py_ - 1, LEG['k'])
                tela.put(px_, py_ + 1, LEG['k'])
                tela.put(px_, py_, LEG['y'] if k % 3 else LEG['r'])
        if a.get('barra'):
            esq, dir_ = maos['L'], maos['R']
            tela.line(esq[0] - 1, esq[1] - 1, dir_[0] + 2, dir_[1] - 1, LEG['G'])
            for (bx, by) in ((esq[0] - 2, esq[1] - 1), (dir_[0] + 2, dir_[1] - 1)):
                tela.rect(bx - 1, by - 1, bx + 1, by + 1, LEG['k'])
        props_de('mao')
        props_de('halter')
    else:
        props_de('mao')
    props_de('frente')

    imagem = outline(tela.im)
    return imagem


def moradores(atividade_de):
    """Todos os quadros de todos os moradores: [desenho][quadro] -> Image 28x34."""
    visuais = sortear_desenhos()
    folhas = []
    for i, v in enumerate(visuais):
        atividade = atividade_de(i)
        quadros = [quadro(v, atividade, f) for f in range(QUADROS)] + [quadro(v, atividade, 0, reacao=True)]
        folhas.append(quadros)
    return visuais, folhas


import casa_mais  # noqa: E402,F401  (registra as atividades dos cômodos 13 a 36)
