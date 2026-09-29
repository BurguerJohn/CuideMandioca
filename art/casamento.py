"""Casamento na roça: noivo remendado, noiva de véu, padre de óculos e o caramanchão de flores.

As pessoas saem das mesmas grades da quadrilha (sprites.CAVALHEIRO e sprites.DAMA), trocando roupa, chapéu e rosto, e
usam os mesmos braços de art/animar.py (person). A folha de pessoas tem três quadros para cada uma, na ordem
NOIVO, NOIVA, PADRE: parado, respirando e comemorando.
"""

import animar
import sprites
from animar import edit
from render import outline
from scene import Layer

# Tecidos novos (art/exportar.py os junta aos da paleta): vestido branco com renda e batina preta.
FABRICS = {
    'renda': ['XXzX', 'XzXX', 'zXXX', 'XXXz'],
    'batina': ['1122', '1211', '2112', '1121'],
}

NOIVO = edit(sprites.CAVALHEIRO, {
    # Bigode pintado ao lado da boca, gravata-borboleta e camisa por cima do tecido remendado, cravo na lapela.
    (4, 6): 'd', (7, 6): 'd',
    (5, 8): 'R', (6, 8): 'R', (4, 9): 'X', (5, 9): 'X', (6, 9): 'X', (7, 9): 'X', (5, 10): 'X', (6, 10): 'X', (3, 9): 'H',
})

NOIVA = '''
....0000....
..0XzzzzX0..
.0XzXHHXzX0.
.0XXXXXXXX0.
0X04366320X0
0X04e66e20X0
0X046mm620X0
0z04366320z0
..0#++++-0..
.0##++++--0.
.0#+++++--0.
0##+++++---0
000000000000
...04320....
..040..030..
..040..030..
.0XX0..0XX0.
.0000..0000.
'''

# Padre: chapéu preto de aba larga, óculos redondos, colarinho branco, cruz dourada e batina até o chão (no lugar do
# tronco e das pernas do Cavalheiro).
_PADRE = edit(sprites.CAVALHEIRO, {
    (1, 1): '.', (2, 1): '0', (3, 1): '1', (4, 1): '1', (5, 1): '1', (6, 1): '1', (7, 1): '1', (8, 1): '2', (9, 1): '0',
    (1, 2): '1', (2, 2): '1', (3, 2): '1', (4, 2): '1', (5, 2): '1', (6, 2): '1', (7, 2): '1', (8, 2): '1', (9, 2): '1',
    (10, 2): '2',
    (3, 5): 'S', (5, 5): 'S', (6, 5): 'S', (8, 5): 'S',
    (5, 8): 'X', (6, 8): 'X',
    (4, 9): 'A', (5, 9): 'A', (6, 9): 'A', (5, 10): 'A',
}).strip('\n').split('\n')
PADRE = '\n'.join(_PADRE[:11] + ['.0##++++--0.', '.0##++++--0.', '.0#+++++--0.', '.0#+++++--0.', '0##++++++--0',
                                 '0##++++++--0', '000000000000'])


BUQUE = ['.G.', 'HXH', '.H.']
LIVRO = ['DDDD', 'DADD', 'DDDD']


def personagens():
    """Nove quadros: cada personagem parado, respirando e comemorando (o buquê e o livro seguem as mãos)."""
    parado = ('baixo', 'baixo', 0, None)
    respira = ('baixo', 'baixo', -1, None)
    festa = ('alto', 'alto', -1, None)
    frames = []
    # Noivo: braços ao lado, depois erguidos.
    for pose in (parado, respira, festa):
        frames.append(animar.person(NOIVO, 'remendado', pose, sleeve='J'))
    # Noiva: as duas mãos juntas segurando o buquê; ao comemorar, ergue o buquê.
    for pose in (('palma', 'palma', 0, None), ('palma', 'palma', -1, None), ('alto', 'palma', -1, None)):
        extra = [(BUQUE, 4, 8)] if pose[0] == 'palma' else [(BUQUE, -2, 0)]
        frames.append(animar.person(NOIVA, 'renda', pose, sleeve='X', extra=extra))
    # Padre: mãos juntas com o livro; ao comemorar, abre os braços.
    for pose in (('palma', 'palma', 0, None), ('palma', 'palma', -1, None), ('aberto', 'aberto', -1, None)):
        extra = [(LIVRO, 4, 9)] if pose[0] == 'palma' else []
        frames.append(animar.person(PADRE, 'batina', pose, sleeve='1', extra=extra))
    return frames


def caramanchao(width=50, height=34):
    """Arco de galhos com flores e fitas: dois mourões de madeira, folhagem em cima e um laço no meio. Dois quadros
    (a fita balança)."""
    frames = []
    for sway in (0, 1):
        layer = Layer(width, height)
        mid = width // 2
        # Mourões.
        for x in (3, width - 4):
            layer.rect(x, 9, x + 1, height - 1, 'D')
            layer.rect(x, 9, x, height - 1, 'l')
        # Arco de folhas: uma curva de folhagem entre os mourões, com flores rosa e brancas.
        for x in range(2, width - 2):
            t = (x - mid) / (mid - 2)
            top = int(1 + 9 * t * t)
            for y in range(top, top + 4):
                layer.put(x, y, 'g' if (x + y) % 3 == 0 else 'G' if y == top else 'v' if y == top + 3 else 'g')
        for k, x in enumerate(range(5, width - 5, 4)):
            t = (x - mid) / (mid - 2)
            y = int(1 + 9 * t * t) + 1
            layer.put(x, y, 'H' if k % 2 else 'X')
            layer.put(x + 1, y, 'H' if k % 2 else 'X')
            layer.put(x, y - 1, 'z' if k % 2 == 0 else 'p')
        for x in (6, width - 8):
            layer.rect(x, 10, x + 1, 12, 'g')
            layer.put(x, 13, 'H')
        # Laço no meio, com as pontas da fita balançando.
        layer.grid(['HH.HH', 'HHHHH', 'HHzHH', '.HHH.'], mid - 2, 3)
        layer.line(mid - 1, 7, mid - 3 + sway, 14, 'H')
        layer.line(mid + 1, 7, mid + 3 - sway, 14, 'H')
        layer.put(mid - 3 + sway, 15, 'h')
        layer.put(mid + 3 - sway, 15, 'h')
        # Grama na base e pétalas caídas.
        for x in range(1, width - 1):
            if x % 3 != 0:
                layer.put(x, height - 1, 'G')
        for x in (10, 19, 31, 40):
            layer.put(x, height - 1, 'X')
        frames.append(outline(layer.image))
    return frames
