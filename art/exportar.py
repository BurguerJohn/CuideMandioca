"""Exporta toda a arte do jogo para src/festa-sprites.js e gera o ícone do aplicativo.

Cada sprite vira uma tira horizontal de quadros (PNG em data URL) com um manifesto de tamanho,
quadros, pivôs e âncoras. O cenário que depende da largura da festa (terreiro, varal, tablado,
fogos) é desenhado em tempo real pelo jogo; aqui saem só as paletas dele.

Uso: py -3.12 art/exportar.py
Saídas: src/festa-sprites.js, assets/festa/folha.png (conferência), desktop/icon.ico, desktop/tray.png
"""

import base64
import io
import json
import math
import random
from pathlib import Path

from PIL import Image

import sprites
from render import hex_rgb, outline, shade, sprite, tint
import animar
import casamento
import casa_salas
import janelas
import cenario
import crescer
import danca
import tamanhos
from scene import (BACK_TINT, HEART, Layer, awning, bonfire, booth_back, booth_counter, crate, flag_mast, mastro_sao_joao,
                   sign, stage)
from sprites import PALETTE

ROOT = Path(__file__).resolve().parents[1]
BUNDLE = ROOT / 'src' / 'festa-sprites.js'
SHEET = ROOT / 'assets' / 'festa' / 'folha.png'

PAD = 4
FRAME_W, FRAME_H = 24 + PAD * 2, 40 + PAD
# Tamanhos da Mandioca que cresce com as melhorias: broto, mudinha, mandioquinha e mandioca inteira. Os menores têm o
# corpo e o rosto desenhados no próprio tamanho (art/tamanhos.py) e os mesmos braços, pernas e poses em escala, então toda
# dança nova já vem nos quatro tamanhos. Chapéus e itens de mão dos tamanhos menores saem reduzidos (art/crescer.py).
GROWTH = [0.62, 0.75, 0.88, 1.0]
FABRICS = ['xadrez-vermelho', 'xadrez-azul', 'xadrez-verde', 'remendado', 'chita', 'chita-rosa', 'xadrez-ouro', 'chita-amarela',
           'xadrez-roxo']
CROWD_FABRICS = ['xadrez-azul', 'chita', 'xadrez-vermelho', 'chita-rosa', 'xadrez-verde', 'remendado']
# Cada pessoa da festa é um tecido com um chapéu: palha (o de sempre), de couro, azul ou lenço vermelho; nas damas, a coroa
# de flores troca de cor. Quatro "jeitos" por tecido, então a multidão deixa de ser uma fila de gêmeos.
CROWD_LOOKS = [(fabric, look) for look in range(4) for fabric in CROWD_FABRICS]
HAT_LOOKS = [{}, {'Y': 'l', 'y': 'D', 'o': 'd'}, {'Y': 'b', 'y': 'J', 'o': 'j'}, {'Y': 'p', 'y': 'R', 'o': 'r'}]
FLOWER_LOOKS = [{}, {'H': 'J'}, {'H': 'K'}, {'H': 'P'}]


def dressed(grid, look):
    """A grade da pessoa com as cores do chapéu (ou da coroa de flores) do jeito `look`; o resto não muda."""
    table = (FLOWER_LOOKS if grid is sprites.DAMA else HAT_LOOKS)[look]
    head = 8 if grid is sprites.DAMA else 4
    rows = grid.strip('\n').split('\n')
    return '\n'.join(''.join(table.get(c, c) for c in row) if index < head else row for index, row in enumerate(rows))


sprites.FABRICS.update(casamento.FABRICS)
sprites.FABRICS.update({
    'xadrez-verde': ['vvgg', 'vvgg', 'ggXX', 'ggXX'],
    'remendado': ['RRRJJJ', 'RRRJJJ', 'RRRJJJ', 'AAAPPP', 'AAAPPP', 'AAAPPP'],
    'xadrez-ouro': ['aaAA', 'aaAA', 'AAFF', 'AAFF'],
    # Chita amarela (cor de milho com florzinha vermelha e azul) e xadrez roxo.
    'chita-amarela': ['AAAAAA', 'AARAAA', 'ARJRAA', 'AARAAg', 'AAAAAA', 'AgAAJA'],
    'xadrez-roxo': ['iiPP', 'iiPP', 'PPXX', 'PPXX'],
})

images = {}
manifest = {'mandioca': {}, 'hats': {}, 'hand': {}, 'chars': {}, 'crowd': {}, 'sides': {}, 'props': {},
            'fires': {}, 'requests': {}, 'terrains': {}, 'rings': {}, 'scenery': {}, 'varais': {}}
icons = {}


def strip(frames):
    width = max(frame.width for frame in frames)
    height = max(frame.height for frame in frames)
    sheet = Image.new('RGBA', (width * len(frames), height), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * width, height - frame.height))
    return sheet, width, height


# Volume: luz quente na borda de cima/esquerda e sombra arroxeada na de baixo/direita, 1 pixel para dentro do
# contorno (o contorno não muda). Vale para quem fica na frente da festa: gente, bichos, chapéus, itens e barracas.
VOLUME = ('mandioca-', 'chapeu-', 'mao-', 'turma-', 'multidao', 'plateia', 'criancas', 'penetra', 'casamento', 'lado-', 'caixote',
          'cenario-galinha', 'cenario-pintinho', 'cenario-gato', 'cenario-bode', 'cenario-balao', 'cenario-mandioquinha',
          'cenario-milharal', 'cenario-bananeira', 'cenario-coqueiro', 'cenario-mandacaru', 'cenario-carrossel',
          'cenario-balao-grande', 'cenario-boi', 'cenario-balao-ouro', 'cenario-pote', 'cenario-caramelo', 'cenario-pombo', 'cenario-trem', 'cenario-sapo', 'cenario-saco', 'cenario-leiloeiro', 'cenario-kombi', 'cenario-jegue', 'cenario-sanfoneiro', 'cenario-fotografo', 'cenario-carro-boi', 'cenario-papagaio', 'compadres', 'casa-moradores')
LUZ_QUENTE = (255, 236, 196)


def volume(image, light=0.16, dark=0.30):
    out = image.copy()
    src, px = image.load(), out.load()
    w, h = image.size

    def empty(x, y):
        return x < 0 or y < 0 or x >= w or y >= h or src[x, y][3] < 128 or sum(src[x, y][:3]) < 90

    for y in range(h):
        for x in range(w):
            r, g, b, a = src[x, y]
            if a < 128 or r + g + b < 90:
                continue
            lit = empty(x, y - 1) or empty(x - 1, y)
            shaded = empty(x, y + 1) or empty(x + 1, y)
            if shaded and not lit:
                px[x, y] = shade((r, g, b), -dark) + (a,)
            elif lit and not shaded:
                px[x, y] = tuple(round(c + (l - c) * light) for c, l in zip((r, g, b), LUZ_QUENTE)) + (a,)
    return out


sources = {}


def add(name, frames, **meta):
    frames = frames if isinstance(frames, list) else [frames]
    sources[name] = frames
    sheet, width, height = strip(frames)
    if name.startswith(VOLUME):
        sheet = volume(sheet)
    images[name] = sheet
    return {'image': name, 'w': width, 'h': height, 'frames': sheet.width // width, **meta}


def add_scaled(name, stage, bias=0.34, **meta):
    """A mesma folha de `name` no tamanho `stage` da Mandioca (volume e luz de contorno saem do quadro reduzido). `bias` é
    quanto da área tem que ser contorno para o pixel novo virar contorno (coisa fina, como vara, pede mais)."""
    frames = [crescer.reduzir(frame, GROWTH[stage], bias) for frame in sources[name]]
    return add(f'{name}-t{stage}', frames, **meta)


def scaled_pair(value, stage):
    return [round(v * GROWTH[stage], 2) for v in value]


# Luz de contorno: a borda de cada quadro do lado de uma fonte de luz (a fogueira). O jogo desenha por cima do
# personagem, com a força e o tremor da chama; cada folha tem a versão da direita e a da esquerda.
RIM = (255, 214, 138)


def luz(name):
    sheet = images[name]
    px = sheet.load()
    out = {}
    for side, dx in (('right', 1), ('left', -1)):
        rim = Image.new('RGBA', sheet.size, (0, 0, 0, 0))
        rp = rim.load()
        for y in range(sheet.height):
            for x in range(sheet.width):
                if px[x, y][3] < 128:
                    continue
                nx = x + dx
                outside = nx < 0 or nx >= sheet.width or px[nx, y][3] < 128
                if outside:
                    # O contorno só esquenta um pouco (continua lendo como contorno); quem acende é o pixel de dentro.
                    rp[x, y] = RIM + (90,)
                    ix = x - dx
                    if 0 <= ix < sheet.width and px[ix, y][3] >= 128:
                        rp[ix, y] = RIM + (255,)
        images[f'{name}-luz-{side}'] = rim
        out[side] = f'{name}-luz-{side}'
    return out


def fill(text, fabric='xadrez-vermelho'):
    return outline(sprite(text, fabric))


def recolor(image, mapping):
    table = {hex_rgb(PALETTE[a]): hex_rgb(PALETTE[b]) for a, b in mapping.items()}
    out = image.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a and (r, g, b) in table:
                px[x, y] = table[(r, g, b)] + (a,)
    return out


def shifted(image, dy, height=None):
    frame = Image.new('RGBA', (image.width, height or image.height), (0, 0, 0, 0))
    frame.alpha_composite(image, (0, (height or image.height) - image.height + dy))
    return frame


# --- Mandioca: corpo, braços, pernas e rosto montados por quadro ------------------------------

CORE = [
    '.....00000000000000.....', '.....02233333333220.....', '....0433377777733220....',
    '....0543766666673220....', '....04236ee66ee73220....', '....044369e669e73120....',
    '....04436ee66ee73220....', '....04336c6666c73220....', '....042366mmmm673120....',
    '....043337mnnm733220....', '.....043337mm733220.....', '.....0JbJJ9JJJJ9Jj0.....',
    '.....0jJjjjJJjjjJj0.....', '....0##+++jJJj+++--0....', '....0###+++jj++++--0....',
    '....0##+++++A++++--0....', '....0##++++++++++--0....', '....0#++++++A+++---0....',
    '....0#++++++++jJJ--0....', '....0#++++++A+jJJ--0....', '....0+++++++++jjj--0....',
    '....0++++++++++----0....', '....0000000000000000....', '.....04433323332220.....',
    '.....04333233322220.....', '......043323332220......', '.......0433233220.......',
    '........04332220........',
]
EYES = {'abertos': None, 'fechados': ('66666667', '6ee66ee7', '66666667'),
        'cansados': ('6e6666e7', '66e66e67', '6e6666e7')}
MOUTHS = {'canta': None, 'sorri': ('6m6666m7', '7mmmm7', '7777'), 'ofega': ('666mm667', '7mnnm7', '7mm7')}
LEFT_ARM = {'diag': ((2, 19), (1, 15)), 'alto': ((3, 17), (3, 12)), 'lado': ((1, 21), (-1, 20)),
            'joelho': ((3, 27), (6, 31))}
RIGHT_ARM = {'baixo': ((21, 24), (22, 27)), 'cintura': ((22, 25), (19, 28)), 'alto': ((21, 19), (21, 14)),
             'joelho': ((21, 27), (17, 31))}
LEFT_ARM.update(danca.ESQUERDO)
RIGHT_ARM.update(danca.DIREITO)
# Toda pose de braço existe nos dois lados (a que faltar vira o espelho da do outro lado).
for _name, _points in list(RIGHT_ARM.items()):
    LEFT_ARM.setdefault(_name, tuple((23 - x, y) for x, y in _points))
for _name, _points in list(LEFT_ARM.items()):
    RIGHT_ARM.setdefault(_name, tuple((23 - x, y) for x, y in _points))
DANCE = [(1, 0, 'diag', 'baixo', 'ambas', 'canta'), (0, -1, 'alto', 'baixo', 'esquerda', 'canta'),
         (-1, -1, 'alto', 'cintura', 'esquerda', 'sorri'), (0, 0, 'diag', 'cintura', 'ambas', 'sorri'),
         (1, 0, 'lado', 'baixo', 'ambas', 'canta'), (0, 1, 'diag', 'alto', 'direita', 'canta'),
         (-1, 1, 'alto', 'alto', 'direita', 'sorri'), (0, 0, 'diag', 'baixo', 'ambas', 'sorri')]
REST = [(1, 'ofega'), (2, 'ofega'), (2, 'sorri'), (1, 'ofega')]
CHEER = [(1, 0, 'diag', 'baixo', 'canta'), (0, 3, 'alto', 'alto', 'canta'), (-1, 4, 'alto', 'alto', 'canta'),
         (0, 2, 'lado', 'alto', 'sorri')]


def face_back():
    """A Mandioca de costas (na volta do giro): o rosto vira casca, sem olho nem boca."""
    swap = str.maketrans({'6': '3', '7': '3', 'e': '3', '9': '4', 'm': '3', 'n': '3', 'c': '4'})
    rows = list(CORE)
    for index in range(3, 11):
        rows[index] = rows[index][:6] + rows[index][6:18].translate(swap) + rows[index][18:]
    return '\n'.join(rows)


def face(eyes, mouth):
    rows = list(CORE)
    if EYES[eyes]:
        for index, patch in enumerate(EYES[eyes]):
            rows[4 + index] = rows[4 + index][:8] + patch + rows[4 + index][16:]
    if MOUTHS[mouth]:
        a, b, c = MOUTHS[mouth]
        rows[8] = rows[8][:8] + a + rows[8][16:]
        rows[9] = rows[9][:9] + b + rows[9][15:]
        rows[10] = rows[10][:10] + c + rows[10][14:]
    return '\n'.join(rows)


def arm(layer, shoulder, elbow, hand, ox, oy):
    for (x0, y0), (x1, y1) in zip([shoulder, elbow], [elbow, hand]):
        steps = max(int(math.ceil(max(abs(x1 - x0), abs(y1 - y0)))), 1)
        for step in range(steps + 1):
            t = step / steps
            layer.put(ox + x0 + (x1 - x0) * t, oy + y0 + (y1 - y0) * t, '3')
    layer.grid(['54', '43'], ox + hand[0], oy + hand[1])


def lifts(lifted):
    """Quanto cada pé sobe: 'ambas' (nenhum), 'esquerda'/'direita' (2 px) ou um dicionário já interpolado."""
    if isinstance(lifted, dict):
        return lifted
    return {side: 2 if lifted == side else 0 for side in ('esquerda', 'direita')}


def legs(layer, bob, sway, lifted):
    top = PAD + 8 + 28 + bob
    up = lifts(lifted)
    for side, x, colors in (('esquerda', PAD + 9 + sway, '43'), ('direita', PAD + 13 + sway, '32')):
        foot = FRAME_H - 2 - up[side]
        for y in range(top, foot):
            layer.put(x, y, colors[0])
            layer.put(x + 1, y, colors[1])
        layer.grid(['ddD'] if side == 'esquerda' else ['Ddd'], x - 1 if side == 'esquerda' else x, foot)


def meio(a, b):
    """Meio do caminho entre duas poses inteiras, arredondando para cima (0,5 → 1, -0,5 → 0)."""
    return math.floor((a + b) / 2 + 0.5)


def mistura(table, a, b):
    """Braço no meio do caminho entre duas poses (cotovelo e mão), para o quadro intermediário."""
    pa = table[a] if isinstance(a, str) else a
    pb = table[b] if isinstance(b, str) else b
    return tuple(((p[0] + q[0]) / 2, (p[1] + q[1]) / 2) for p, q in zip(pa, pb))


def squeeze(frame, factor):
    """Aperta o quadro na horizontal em volta do meio do corpo (a Mandioca de lado, no meio do giro)."""
    width = max(2, round(frame.width * factor))
    small = frame.resize((width, frame.height), Image.NEAREST)
    out = Image.new('RGBA', frame.size, (0, 0, 0, 0))
    out.alpha_composite(small, ((frame.width - width) // 2, 0))
    return out


def squeezed_x(x, frame_width, factor):
    """Onde a coluna `x` vai parar depois de `squeeze` (a âncora da mão acompanha o corpo apertado no giro)."""
    width = max(2, round(frame_width * factor))
    return round((frame_width - width) // 2 + x * width / frame_width)


def mandioca_frame(fabric, bob, sway, left, right, lifted, mouth, eyes='abertos', hop=0, back=False, squash=1.0):
    frame = Image.new('RGBA', (FRAME_W, FRAME_H), (0, 0, 0, 0))
    leg_layer = Layer(FRAME_W, FRAME_H)
    legs(leg_layer, bob, sway, lifted)
    frame.alpha_composite(outline(leg_layer.image).crop((1, 1, FRAME_W + 1, FRAME_H + 1)))
    frame.alpha_composite(sprite(face_back() if back else face(eyes, mouth), fabric), (PAD + sway, PAD + 8 + bob))
    arms = Layer(FRAME_W, FRAME_H)
    ox, oy = PAD + sway, PAD + bob
    left_points = LEFT_ARM[left] if isinstance(left, str) else left
    right_points = RIGHT_ARM[right] if isinstance(right, str) else right
    arm(arms, (4, 22), *left_points, ox, oy)
    arm(arms, (19, 22), *right_points, ox, oy)
    frame.alpha_composite(outline(arms.image).crop((1, 1, FRAME_W + 1, FRAME_H + 1)))
    # A mão que segura o item, sozinha (com o antebraço, para o contorno emendar igual): o jogo desenha o item na frente
    # do corpo e esta camada por cima dele. De costas, o item fica atrás (`frente` falso).
    grip = Layer(FRAME_W, FRAME_H)
    arm(grip, left_points[0], left_points[0], left_points[1], ox, oy)
    hand = outline(grip.image).crop((1, 1, FRAME_W + 1, FRAME_H + 1))
    anchors = {'head': [ox, oy - hop], 'eyes': [ox + 8, oy + 12 - hop],
               'hand': [round(ox + left_points[1][0]), round(oy + left_points[1][1] - hop)], 'frente': not back}
    if hop:
        frame = shifted(frame, -hop)
        hand = shifted(hand, -hop)
    if squash < 1:
        anchors['hand'][0] = squeezed_x(anchors['hand'][0], frame.width, squash)
        frame = squeeze(frame, squash)
        hand = squeeze(hand, squash)
    anchors['_mao'] = hand
    return frame, anchors


def small_frame(stage, fabric, bob, sway, left, right, lifted, mouth, eyes='abertos', hop=0, back=False, squash=1.0):
    """Um quadro da Mandioca no tamanho `stage` (0 a 2): a grade do corpo desse tamanho (art/tamanhos.py), com o rosto
    desenhado nele, e os braços, as pernas, o balanço e o pulo do tamanho inteiro em escala."""
    s = GROWTH[stage]
    kit = tamanhos.KITS[stage]
    width, height = round(FRAME_W * s), round(FRAME_H * s)
    ox, oy = round((PAD + sway) * s), round((PAD + bob) * s)
    top = oy + round(8 * s)
    up = lifts(lifted)
    frame = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    leg_layer = Layer(width, height)
    for side, x, colors in (('esquerda', ox + kit['legs'][0], '43'), ('direita', ox + kit['legs'][1], '32')):
        foot = height - 2 - round(up[side] * s)
        for y in range(top + len(kit['core']), foot):
            leg_layer.put(x, y, colors[0])
            leg_layer.put(x + 1, y, colors[1])
        leg_layer.grid(['ddD'] if side == 'esquerda' else ['Ddd'], x - 1 if side == 'esquerda' else x, foot)
    frame.alpha_composite(outline(leg_layer.image).crop((1, 1, width + 1, height + 1)))
    frame.alpha_composite(sprite(tamanhos.face(stage, eyes, mouth, back), fabric), (ox, top))
    arms = Layer(width, height)
    left_points = LEFT_ARM[left] if isinstance(left, str) else left
    right_points = RIGHT_ARM[right] if isinstance(right, str) else right
    scaled = lambda points: tuple((x * s, y * s) for x, y in points)
    grip = Layer(width, height)
    for shoulder, points, layers in (((4, 22), left_points, (arms, grip)), ((19, 22), right_points, (arms,))):
        (sx, sy), (ex, ey), (hx, hy) = (shoulder[0] * s, shoulder[1] * s), *scaled(points)
        for index, ((x0, y0), (x1, y1)) in enumerate((((sx, sy), (ex, ey)), ((ex, ey), (hx, hy)))):
            steps = max(int(math.ceil(max(abs(x1 - x0), abs(y1 - y0)))), 1)
            for step in range(steps + 1):
                t = step / steps
                for layer in layers if index == 1 else (arms,):
                    layer.put(ox + x0 + (x1 - x0) * t, oy + y0 + (y1 - y0) * t, '3')
        for layer in layers:
            layer.grid(['54', '43'], round(ox + hx), round(oy + hy))
    frame.alpha_composite(outline(arms.image).crop((1, 1, width + 1, height + 1)))
    hand = outline(grip.image).crop((1, 1, width + 1, height + 1))
    lift = round(hop * s)
    eye_row, eye_col = kit['eyes_at']
    anchors = {'head': [ox, oy - lift], 'eyes': [ox + eye_col, top + eye_row - lift],
               'hand': [round(ox + left_points[1][0] * s), round(oy + left_points[1][1] * s - lift)], 'frente': not back}
    if lift:
        frame = shifted(frame, -lift)
        hand = shifted(hand, -lift)
    if squash < 1:
        anchors['hand'][0] = squeezed_x(anchors['hand'][0], frame.width, squash)
        frame = squeeze(frame, squash)
        hand = squeeze(hand, squash)
    anchors['_mao'] = hand
    return frame, anchors


def dance_poses(sequence=None):
    """As 8 poses de uma dança viram 16 quadros: cada pose e um quadro no meio do caminho até a próxima. Sem
    argumento, o passo de forró de sempre; as outras vêm de art/danca.py (o sétimo número da pose é o pulo)."""
    sequence = sequence or DANCE
    poses = []
    for index, pose in enumerate(sequence):
        bob, sway, left, right, lifted, mouth = pose[:6]
        hop = pose[6] if len(pose) > 6 else 0
        following = sequence[(index + 1) % len(sequence)]
        nb, ns, nl, nr, nlift = following[:5]
        nhop = following[6] if len(following) > 6 else 0
        poses.append((bob, sway, left, right, lifted, mouth, hop))
        a, b = lifts(lifted), lifts(nlift)
        half = {side: (a[side] + b[side]) // 2 for side in a}
        poses.append((meio(bob, nb), meio(sway, ns), mistura(LEFT_ARM, left, nl), mistura(RIGHT_ARM, right, nr), half,
                      mouth, meio(hop, nhop)))
    return poses


def spin_frames(fabric, build=None):
    """O giro: uma volta inteira em 16 quadros. De frente aperta até ficar de lado, aparece de costas (sem rosto) e
    volta a abrir até a frente, com os braços abertos e um pulinho no meio."""
    build = build or mandioca_frame
    frames, marks = [], []
    for index in range(16):
        angle = index * math.pi / 8
        squash = max(0.55, abs(math.cos(angle)))
        hop = round(3 * math.sin(math.pi * index / 16))
        back = 4 <= index <= 12
        frame, mark = build(fabric, 0, 0, 'aberto', 'aberto', 'ambas', 'canta', hop=hop, back=back, squash=squash)
        # De lado (apertada) ou de costas não tem rosto no lugar de sempre: sem âncora dos olhos, o jogo não pisca ali.
        if back or squash < 1:
            mark = {**mark, 'eyes': None}
        frames.append(frame)
        marks.append(mark)
    return frames, marks


def cheer_poses():
    """Comemoração com 8 quadros: pulo, braços subindo e descendo, com os quadros do meio."""
    poses = []
    for index, (bob, hop, left, right, mouth) in enumerate(CHEER):
        nb, nh, nl, nr, _ = CHEER[(index + 1) % len(CHEER)]
        poses.append((bob, 0, left, right, 'ambas', mouth, hop))
        poses.append((meio(bob, nb), 0, mistura(LEFT_ARM, left, nl), mistura(RIGHT_ARM, right, nr), 'ambas', mouth,
                      meio(hop, nh)))
    return poses


def mandioca_frames(fabric, build=None):
    """Todos os quadros da Mandioca num tecido, na ordem das tags: forró, descanso, comemoração, danças novas e
    descansos novos. `build` desenha cada quadro (o tamanho inteiro por padrão, ou um dos menores)."""
    build = build or mandioca_frame
    dance, cheer = dance_poses(), cheer_poses()
    frames, marks = [], []
    for bob, sway, left, right, lifted, mouth, hop in dance:
        frame, anchor = build(fabric, bob, sway, left, right, lifted, mouth, hop=hop)
        frames.append(frame)
        marks.append(anchor)
    for bob, mouth in REST:
        frame, anchor = build(fabric, bob, 0, 'joelho', 'joelho', 'ambas', mouth, 'cansados')
        frames.append(frame)
        marks.append(anchor)
    for bob, sway, left, right, lifted, mouth, hop in cheer:
        frame, anchor = build(fabric, bob, sway, left, right, lifted, mouth, hop=hop)
        frames.append(frame)
        marks.append(anchor)
    # Os descansos novos (se abana, se espreguiça e bebe): 4 quadros cada, depois de todas as danças.
    rest_frames, rest_marks = [], []
    for name, poses in danca.DESCANSOS.items():
        for bob, left, right, mouth, eyes in poses:
            frame, anchor = build(fabric, bob, 0, left, right, 'ambas', mouth, eyes)
            rest_frames.append(frame)
            rest_marks.append(anchor)
    # As danças novas: 16 quadros cada, na ordem de danca.ORDEM (o forró já está lá em cima).
    for name in danca.ORDEM[1:]:
        if name == 'giro':
            new_frames, new_marks = spin_frames(fabric, build)
        else:
            new_frames, new_marks = [], []
            for bob, sway, left, right, lifted, mouth, hop in dance_poses(danca.DANCAS[name]):
                frame, anchor = build(fabric, bob, sway, left, right, lifted, mouth, hop=hop)
                new_frames.append(frame)
                new_marks.append(anchor)
        frames.extend(new_frames)
        marks.extend(new_marks)
    frames.extend(rest_frames)
    marks.extend(rest_marks)
    hands = [mark.pop('_mao') for mark in marks]
    return frames, marks, hands


def export_mandioca():
    anchors = None
    dance, cheer = dance_poses(), cheer_poses()
    hands = None
    for fabric in FABRICS:
        frames, marks, hands = mandioca_frames(fabric)
        manifest['mandioca'][fabric] = add(f'mandioca-{fabric}', frames)
        manifest['mandioca'][fabric]['rim'] = luz(f'mandioca-{fabric}')
        anchors = marks
    # A mão que segura o item (igual em todos os tecidos): uma folha por tamanho.
    full_hand = add('mandioca-mao', hands)
    d, r = len(dance), len(REST)
    after = d + r + len(cheer)
    tags = {'danca': list(range(d)), 'descanso': list(range(d, d + r)), 'comemora': list(range(d + r, after)),
            'dancas': {'forro': list(range(d))}}
    for offset, name in enumerate(danca.ORDEM[1:]):
        tags['dancas'][name] = list(range(after + 16 * offset, after + 16 * (offset + 1)))
    rest_start = after + 16 * len(danca.ORDEM[1:])
    tags['descansos'] = {'ofega': tags['descanso']}
    for offset, name in enumerate(danca.DESCANSOS):
        tags['descansos'][name] = list(range(rest_start + 4 * offset, rest_start + 4 * (offset + 1)))
    manifest['mandioca']['meta'] = {'w': FRAME_W, 'h': FRAME_H, 'pad': PAD, 'anchors': anchors, 'tags': tags}
    blink = sprite('\n'.join(EYES['fechados']))
    manifest['mandioca']['blink'] = add('piscar', blink)
    # Olhares (coração, estrela, felizinha) que o jogo põe por cima dos olhos quando algo acontece, em cada tamanho.
    looks = lambda stage: {name: add(f'olhar-{name}' + (f'-t{stage}' if stage < 3 else ''), sprite(tamanhos.look(stage, name)))
                           for name in tamanhos.LOOKS_FULL}
    manifest['mandioca']['looks'] = looks(3)
    # Os quatro tamanhos: cada um com as suas folhas por tecido, âncoras (fracionárias: o jogo arredonda a soma) e o
    # ponto do chão (`cx`, o meio do corpo) que fica no mesmo lugar em todos.
    growth = []
    for stage, scale in enumerate(GROWTH):
        if scale == 1.0:
            sheets = {fabric: manifest['mandioca'][fabric] for fabric in FABRICS}
            growth.append({'scale': 1, 'w': FRAME_W, 'h': FRAME_H, 'cx': PAD + 12, 'anchors': anchors, 'tags': tags,
                           'sheets': sheets, 'blink': manifest['mandioca']['blink'], 'looks': manifest['mandioca']['looks'],
                           'hand': full_hand})
            continue
        sheets = {}
        small_marks = None
        build = lambda *args, stage=stage, **kwargs: small_frame(stage, *args, **kwargs)
        small_hands = None
        for fabric in FABRICS:
            frames, small_marks, small_hands = mandioca_frames(fabric, build)
            sheets[fabric] = add(f'mandioca-{fabric}-t{stage}', frames)
            sheets[fabric]['rim'] = luz(f'mandioca-{fabric}-t{stage}')
        first = sheets[FABRICS[0]]
        growth.append({'scale': scale, 'w': first['w'], 'h': first['h'], 'cx': round((PAD + 12) * scale, 2),
                       'anchors': small_marks, 'tags': tags, 'sheets': sheets,
                       'blink': add(f'piscar-t{stage}', sprite(tamanhos.blink(stage))), 'looks': looks(stage),
                       'hand': add(f'mandioca-mao-t{stage}', small_hands)})
    manifest['mandioca']['growth'] = growth


# --- Chapéus e itens de mão -------------------------------------------------------------------

def heart_glasses():
    layer = Layer(24, 16)
    for ox in (7, 12):
        layer.grid(['.H.H.', 'HHHHH', '.HhH.', '..H..'], ox, 11)
        layer.put(ox + 1, 12, 'W')
    for x in (5, 6, 17, 18):
        layer.put(x, 12, 'e')
    return outline(layer.image)


def clown_hat():
    layer = Layer(24, 10)
    for y in range(2, 8):
        half = 1 + (y - 2)
        for x in range(12 - half, 12 + half):
            layer.put(x, y, 'A' if (x * 3 + y) % 5 == 0 else 'J')
    layer.grid(['.X.', 'XWX', '.X.'], 11, 0)
    layer.rect(5, 8, 18, 8, 'R')
    return outline(layer.image)


def export_hats():
    palha = sprite('\n'.join(sprites.MANDIOCA.strip('\n').split('\n')[:9]))
    manifest['hats']['chapeu-palha'] = add('chapeu-chapeu-palha', palha, ox=0, oy=0)
    manifest['hats']['palha-furada'] = add('chapeu-palha-furada', sprite(sprites.PALHA_FURADA), ox=0, oy=0)
    for hat_id, text in sprites.HATS_FILL.items():
        image = fill(text, 'chita')
        manifest['hats'][hat_id] = add(f'chapeu-{hat_id}', image, ox=-1, oy=-1)
    manifest['hats']['oculos-coracao'] = add('chapeu-oculos-coracao', heart_glasses(), ox=-1, oy=-1)
    manifest['hats']['chapeu-palhaco'] = add('chapeu-chapeu-palhaco', clown_hat(), ox=-1, oy=-1)
    for hat_id, meta in manifest['hats'].items():
        image = images[meta['image']]
        icons[f'item:{hat_id}'] = image.crop(image.getbbox())
        # O mesmo chapéu nos tamanhos menores da Mandioca (o deslocamento também encolhe).
        meta['growth'] = [add_scaled(meta['image'], stage, ox=round(meta['ox'] * GROWTH[stage], 2),
                                     oy=round(meta['oy'] * GROWTH[stage], 2)) for stage in range(len(GROWTH) - 1)]


def flag_frames():
    width, height, stick = 8, 12, 6
    frames = []
    for index in range(4):
        layer = Layer(width, height)
        for y in range(height):
            layer.put(stick, y, 'D' if y else 'd')
        phase = index * math.pi / 2
        for column in range(5):
            distance = stick - column
            lift = round(1.2 * math.sin(phase + distance * 0.9) * distance / 5)
            for row in range(1, 6):
                if (row == 4 and column == 2) or (row == 5 and column in (1, 2, 3)):
                    continue
                layer.put(column, row + lift, 'h' if row == 1 or column == 4 else 'H')
        frames.append(outline(layer.image))
    return frames, [stick + 1, 8]


def fishing_rod():
    layer = Layer(14, 15)
    for step in range(12):
        layer.put(1 + step * 0.95, 13 - step * 1.1, 'l' if step % 3 else 'D')
    for y in range(1, 9):
        layer.put(12, y, 'x')
    layer.grid(['.KO', 'kKK'], 11, 9)
    # Espelhada: a vara aponta para fora do corpo e a linha com o anzol pende longe do rosto (o item fica na frente).
    image = outline(layer.image).transpose(Image.FLIP_LEFT_RIGHT)
    return image, [image.width - 1 - 3, 12]


def sparkler_frames():
    """Estrelinha (a vareta de faísca de São João): o arame de metal e a ponta soltando faíscas diferentes a cada quadro."""
    width, height = 11, 16
    rays = [[(0, -4), (3, -3), (4, 0), (-3, 2), (-4, -1)], [(-2, -4), (4, -2), (2, 3), (-4, 1), (1, -5)],
            [(1, -4), (-3, -3), (4, 1), (-2, 3), (3, -1)], [(-1, -5), (2, -3), (-4, -2), (3, 2), (-3, 1)]]
    frames = []
    for k, sparks in enumerate(rays):
        layer = Layer(width, height)
        layer.rect(5, 6, 5, 13, 'S')
        layer.rect(5, 12, 5, 15, 'D')
        cx, cy = 5, 5
        layer.rect(cx - 1, cy - 1, cx + 1, cy + 1, 'F')
        layer.put(cx, cy, 'z')
        for dx, dy in sparks:
            layer.line(cx, cy, cx + dx, cy + dy, 'A' if (dx + dy + k) % 2 else 'F')
            layer.put(cx + dx, cy + dy, 'z')
        frames.append(outline(layer.image))
    return frames, [6, 13]


def export_hand():
    sparkler, spark_pivot = sparkler_frames()
    manifest['hand']['estrelinha'] = add('mao-estrelinha', sparkler, pivot=spark_pivot, fps=12)
    frames, pivot = flag_frames()
    manifest['hand']['bandeirinha'] = add('mao-bandeirinha', frames, pivot=pivot, fps=9)
    rod, rod_pivot = fishing_rod()
    manifest['hand']['vara-pescar'] = add('mao-vara-pescar', rod, pivot=rod_pivot, fps=0)
    for item_id, (text, (px, py)) in sprites.HAND_FILL.items():
        if item_id == 'lampiao-2':
            continue
        frames = [fill(text, 'chita')]
        if item_id == 'lampiao':
            frames.append(fill(sprites.HAND_FILL['lampiao-2'][0]))
        manifest['hand'][item_id] = add(f'mao-{item_id}', frames, pivot=[px + 1, py + 1], fps=4)
    for item_id, meta in manifest['hand'].items():
        image = images[meta['image']].crop((0, 0, meta['w'], meta['h']))
        icons[f'item:{item_id}'] = image.crop(image.getbbox())
        meta['growth'] = [add_scaled(meta['image'], stage, bias=0.6, pivot=scaled_pair(meta['pivot'], stage), fps=meta['fps'])
                          for stage in range(len(GROWTH) - 1)]


# --- Turma: cada personagem com a animação do seu papel ---------------------------------------

def export_chars():
    milho = sprite(sprites.MILHO)
    manifest['chars']['milho'] = add('turma-milho', [shifted(milho, dy, 22) for dy in (0, -1, -2, -1)], fps=6)
    manifest['chars']['milho']['rim'] = luz('turma-milho')
    manifest['chars']['cenoura'] = add('turma-cenoura', animar.cenoura(), fps=8)
    manifest['chars']['inhame'] = add('turma-inhame', animar.inhame(), fps=6)
    manifest['chars']['batata'] = add('turma-batata', animar.batata(), fps=6)
    manifest['chars']['pamonha'] = add('turma-pamonha', animar.pamonha(), fps=4, shout=2)
    manifest['chars']['faisca'] = add('turma-faisca', animar.faisca(), fps=9)
    # Quem trabalha atrás de balcão tem `top`: quantos pixels do quadro ficam acima da linha do balcão.
    manifest['chars']['pacoca'] = add('turma-pacoca', animar.pacoca(), fps=8, top=11)
    manifest['chars']['aipim'] = add('turma-aipim', animar.aipim(), fps=4, top=1)
    manifest['chars']['cachorro'] = add('turma-cachorro', animar.cachorro(), fps=3)
    # O Sopinha não roda em laço: a festa escolhe a pose (sentado, fungando, piscando, orelha, no ar, deitado).
    manifest['chars']['sopinha'] = add('turma-sopinha', animar.sopinha(), fps=1,
                                       poses={'senta': 0, 'funga': 1, 'pisca': 2, 'orelha': 3, 'pulo': 4, 'deita': 5})
    manifest['chars']['sopinha']['rim'] = luz('turma-sopinha')
    # Pipoca atrás do balcão da Barraca de Comidas (`top`: pixels do quadro acima da linha do balcão) e Amendoim, o
    # ambulante, que passeia pela frente da festa.
    manifest['chars']['pipoca'] = add('turma-pipoca', animar.pipoca(), fps=7, top=1)
    manifest['chars']['amendoim'] = add('turma-amendoim', animar.amendoim(), fps=8)
    # Canjica, a cozinheira, mexendo a panela do lado do Fogão a Lenha.
    manifest['chars']['canjica'] = add('turma-canjica', animar.canjica(), fps=6)
    # Cocada, a cordelista, lendo o folheto no balcão da Barraca de Cordel.
    manifest['chars']['cocada'] = add('turma-cocada', animar.cocada(), fps=5, top=5)
    manifest['chars']['balcao-cavalheiro'] = add('turma-balcao-cavalheiro',
                                                 animar.keeper(sprites.CAVALHEIRO, 'xadrez-azul', [(4, 5), (7, 5)]), fps=3)
    manifest['chars']['balcao-dama'] = add('turma-balcao-dama', animar.keeper(sprites.DAMA, 'chita', [(4, 5), (7, 5)]), fps=3)

    full = {'aipim': sprite(sprites.AIPIM, 'chita-rosa'), 'cachorro': sprite(sprites.CACHORRO),
            'pacoca': sprite(sprites.PACOCA)}
    for char_id in ('milho', 'cenoura', 'inhame', 'batata', 'pamonha', 'faisca', 'pacoca', 'aipim', 'cachorro', 'sopinha',
                    'pipoca', 'amendoim', 'canjica', 'cocada'):
        if char_id in full:
            icons[f'char:{char_id}'] = full[char_id]
        else:
            meta = manifest['chars'][char_id]
            image = images[meta['image']].crop((0, 0, meta['w'], meta['h']))
            icons[f'char:{char_id}'] = image.crop(image.getbbox())


def export_crowd():
    """Quadrilha (passo com braços e pé levantado) e plateia (palmas e aceno), 8 quadros por pessoa. Com a festa
    cheia, a quadrilha ganha a fila de trás e a plateia mais duas fileiras, cada uma mais escura (mais longe)."""
    normal, cheer, ola = [], [], []
    for grid in (sprites.CAVALHEIRO, sprites.DAMA):
        for fabric, look in CROWD_LOOKS:
            dress = dressed(grid, look)
            normal.extend(animar.person(dress, fabric, pose) for pose in animar.DANCE_STEPS)
            cheer.extend(animar.person(dress, fabric, pose) for pose in animar.CHEER_STEPS)
            # A "ola" da plateia: os dois braços para o alto num pulinho (fica depois de todos os passos da folha).
            ola.append(animar.person(dress, fabric, ('alto', 'alto', -2, None)))
    cheer += ola
    manifest['crowd'] = {
        'dancers': add('multidao', normal),
        'dancersBack': add('multidao-fundo', [tint(image, BACK_TINT, 0.2) for image in normal]),
        'audience': add('plateia', [tint(image, BACK_TINT, 0.38) for image in cheer]),
        'audience2': add('plateia-2', [tint(image, BACK_TINT, 0.5) for image in cheer]),
        'audience3': add('plateia-3', [tint(image, BACK_TINT, 0.6) for image in cheer]),
        'kids': add('criancas', [frame for fabric, look in CROWD_LOOKS
                                 for frame in animar.crianca(fabric, lambda grid, look=look: dressed(grid, look))]),
        'fabrics': len(CROWD_LOOKS), 'steps': len(animar.DANCE_STEPS), 'pad': animar.CROWD_PAD,
        'ola': len(cheer) - len(ola),
    }
    manifest['crowd']['dancers']['rim'] = luz('multidao')
    # Compadres de fogueira: um rapaz de chapéu de couro e uma moça de coroa amarela, estendendo a mão por cima do fogo.
    manifest['props']['compadres'] = add('compadres', animar.compadres([(dressed(sprites.CAVALHEIRO, 1), 'xadrez-verde'),
                                                                        (dressed(sprites.DAMA, 1), 'chita-rosa')]))
    manifest['props']['compadres']['poses'] = len(animar.COMPADRE_POSES)
    # Os pratos do Fogão a Lenha, na ordem de sprites.DISHES (quadros do mesmo tamanho, apoiados embaixo).
    dishes = [fill(text) for text in sprites.DISHES.values()]
    dish_w, dish_h = max(d.width for d in dishes), max(d.height for d in dishes)
    manifest['props']['pratos'] = add('pratos', [animar.place(animar.blank(dish_w, dish_h), d, (dish_w - d.width) // 2,
                                                              dish_h - d.height) for d in dishes])
    manifest['props']['pratos']['ids'] = list(sprites.DISHES)
    # As comidas da loja, do mesmo jeito: voam até a Mandioca quando ela come.
    foods = [fill(text) for text in sprites.FOODS.values()]
    food_w, food_h = max(f.width for f in foods), max(f.height for f in foods)
    manifest['props']['comidas'] = add('comidas', [animar.place(animar.blank(food_w, food_h), f, (food_w - f.width) // 2,
                                                                food_h - f.height) for f in foods])
    manifest['props']['comidas']['ids'] = list(sprites.FOODS)
    manifest['props']['penetra'] = add('penetra', animar.penetra(), fps=8)
    # Casamento na roça: noivo, noiva e padre (3 quadros cada: parado, respirando, comemorando) e o caramanchão de flores.
    manifest['props']['casamento'] = add('casamento', casamento.personagens(), fps=1)
    manifest['props']['caramanchao'] = add('caramanchao', casamento.caramanchao(), fps=3)


# --- Barracas e enfeites -----------------------------------------------------------------------

BOOTH_FRAMES = 4
# Cores do toldo e a placa de cada barraca (x0..x1 no topo). A palavra da placa é escrita pelo jogo no idioma escolhido
# (src/lang, chaves sign.*): aqui a placa sai em branco.
BOOTHS = {
    'barraca-pescaria': ('JXj', 4, 43),
    'barraca-beijo': ('RXr', 8, 39),
    'barraca-comidas': ('KXk', 6, 41),
    'cadeia': ('sXs', 8, 39),
    'correio': ('HXh', 6, 41),
    'barraca-argolas': ('GXg', 6, 41),
    'barraca-cordel': ('PXi', 6, 41),
}


def booth_parts(kind, frame=0):
    """Fundo e balcão de uma barraca no quadro `frame`: o toldo balança e cada balcão tem seu detalhe animado."""
    width, height = 48, 56
    base = height - 1
    back = Layer(width, height)
    front = Layer(width, height)
    colors, x0, x1 = BOOTHS[kind]
    sign(back, x0, x1, '')
    awning(back, width, 15, colors, wave=frame)
    booth_back(back, width, base, 24)
    if kind == 'barraca-beijo':
        for hx in range(9, 40, 6):
            back.put(hx, 25, 'd')
            back.rect(hx, 26, hx + 1, 26, 'H')
            back.put(hx, 27, 'h')
    if kind == 'correio':
        for hx in range(8, 40, 7):
            back.put(hx + 1, 25, 'd')
            back.grid(['XXX', 'XHX'], hx, 26)
    if kind == 'barraca-cordel':
        # Os folhetos de cordel pendurados no barbante, cada um com a capa de xilogravura (um risco escuro no meio).
        for row, y in enumerate((25, 31)):
            back.rect(4, y - 1, width - 5, y - 1, 'x')
            for index, hx in enumerate(range(6 + row * 3, 42, 6)):
                cover = 'XxTXxT'[(index + row) % 6]
                back.put(hx + 1, y, 'd')
                back.rect(hx, y + 1, hx + 2, y + 4, cover)
                back.put(hx + 1, y + 2, '0')
                back.put(hx + 1, y + 3, '0')
    booth_counter(front, width, base)
    if kind == 'barraca-beijo':
        if frame == 1:  # o coração do balcão bate
            front.glyphs(['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'], 20, base - 12, 'H')
            front.put(21, base - 11, 'W')
        else:
            front.glyphs(HEART, 21, base - 11, 'H')
            front.put(22, base - 10, 'W')
    elif kind == 'barraca-pescaria':
        front.rect(3, base - 17, width - 4, base - 16, 'N')
        for x in range(3, width - 3):
            front.put(x, base - 17, 'B' if (x + frame) % 5 else 'b')
        for index, fx in enumerate((9, 19, 30, 38)):
            fx += (index + frame) % 2
            front.put(fx, base - 16, 'K')
            front.put(fx + 1, base - 16, 'O')
        # Um peixe pula fora da água e cai de volta espirrando.
        jump = {1: (21, base - 21, ['...00', '..0KO0', '.0Kk0.', '0k00..', 'b..b..']),
                2: (23, base - 24, ['.0000.', '0KKKO0', '0kKK00', '.0000k']),
                3: (27, base - 20, ['.00..', '0Kk0.', '0KO0.', 'b00.b', '.b.b.'])}.get(frame)
        if jump:
            x, y, rows = jump
            front.grid(rows, x, y)
    elif kind == 'barraca-comidas':
        for index, (x, treat) in enumerate(((5, ['.G.', 'GxG']), (12, ['AFA', 'aAa']), (20, ['XXX', '.X.']),
                                             (28, ['.G.', 'GxG']), (36, ['AFA', 'aAa']))):
            front.grid(treat, x, base - 20)
            for lap in (0, 2):  # fumacinha subindo e serpenteando
                rise = (frame + index + lap) % 4
                front.put(x + 1 + rise % 2, base - 22 - rise * 2, 'W' if rise < 2 else 'X')
    elif kind == 'cadeia':
        for x in range(5, width - 5, 3):
            front.rect(x, 24, x, base - 19, 'S')
        front.glyphs(['01110', '10001', '11111', '11011', '11111'], 21, base - 11, 'A')
        glint = {0: (22, base - 9), 1: (23, base - 8), 2: (24, base - 7)}.get(frame)
        if glint:
            front.put(*glint, 'z')
    elif kind == 'barraca-cordel':
        # Pilhas de folhetos no balcão e um aberto, virando a página.
        for x, color in ((6, 'x'), (11, 'T'), (33, 'X'), (38, 'x')):
            front.rect(x, base - 20, x + 3, base - 18, color)
            front.rect(x, base - 20, x + 3, base - 20, 'W')
        page = frame % 2
        front.rect(19, base - 21, 28, base - 18, 'X')
        front.rect(23, base - 21, 24, base - 18, 'd')
        front.rect(20, base - 20 + page, 22, base - 20 + page, 's')
        front.rect(25, base - 20 + (1 - page), 27, base - 20 + (1 - page), 's')
    elif kind == 'barraca-argolas':
        dark = {'G': 'g', 'J': 'j', 'R': 'r', 'A': 'a', 'P': 'i'}
        for index, (x, color) in enumerate(zip(range(7, 42, 7), 'GJRAP')):
            front.grid(['.s.', '.' + color + '.', color * 3, color * 2 + dark[color], color + 'X' + dark[color]], x, base - 23)
            if index % BOOTH_FRAMES == frame:  # brilho passando de garrafa em garrafa
                front.put(x + 1, base - 22, 'z')
                front.put(x, base - 20, 'z')
        for x, color in ((11, 'R'), (29, 'A')):
            front.grid(['.' + color * 3 + '.', color + '...' + color, '.' + color * 3 + '.'], x, base - 11)
    elif kind == 'correio':
        front.rect(19, base - 12, 28, base - 5, '0')
        front.rect(20, base - 11, 27, base - 6, 'R')
        front.rect(21, base - 9, 26, base - 9, '0')
        front.glyphs(HEART, 21, base - 17 + 3, 'H')
        letter = {1: ['000000', '0XXXX0'], 2: ['000000', '0XXXX0', '0XHXX0', '0XXXX0']}.get(frame)
        if letter:  # chega uma cartinha pela fresta
            front.grid(letter, 21, base - 9 - len(letter))
    return back.image, front.image


def scarecrow():
    layer = Layer(22, 34)
    for y in range(12, 34):
        layer.put(10, y, 'D')
        layer.put(11, y, 'd')
    for x in range(1, 21):
        layer.put(x, 14, 'D')
    shirt = sprite('\n'.join([
        '...#++++++++--..',
        '.##++++++++++--.',
        '##++++++++++++--',
        '.#++++++++++++-.',
        '..#++++++++++-..',
        '..#++++++++++-..',
        '..#++++++++++-..',
        '...++++++++++...',
    ]), 'remendado')
    layer.image.alpha_composite(shirt, (3, 12))
    for x, y in ((0, 13), (0, 15), (1, 16), (21, 13), (21, 15), (20, 16), (8, 20), (13, 20), (10, 21)):
        layer.put(x, y, 'Y')
    layer.grid(['..xxxxxx..', '.xxxxxxxx.', '.xexxxxex.', '.xxxxxxxx.', '.xmxmxmxx.', '..xxxxxx..'], 6, 5)
    layer.grid(['...YYYY...', '..YyyyyY..', 'yyyyyyyyyy'], 6, 1)
    layer.put(11, 3, 'R')
    return outline(layer.image)


def quentao_barrel(step=0):
    """Barril de quentão: o barril de madeira com aros de ferro, a torneirinha pingando, canecas de barro em cima de um
    caixote e o vapor subindo (quatro quadros: o vapor ondula e a gota cai)."""
    layer = Layer(34, 34)
    # Barril: bojo mais largo no meio, tábuas verticais e dois aros.
    for y in range(12, 31):
        t = (y - 21) / 9.5
        half = round(9 - 2 * t * t)
        for x in range(12 - half, 12 + half + 1):
            u = (x - 12) / max(1, half)
            char = 'l' if u < -0.3 else 'D' if u < 0.55 else 'd'
            if (x - 12 + half) % 4 == 0:
                char = 'd'
            layer.put(x, y, char)
    for y in (15, 26):
        t = (y - 21) / 9.5
        half = round(9 - 2 * t * t)
        layer.rect(12 - half, y, 12 + half, y, 's')
        layer.put(12 - half + 1, y, 'S')
    layer.rect(5, 11, 19, 11, 'd')
    layer.rect(6, 10, 18, 10, 'u')
    # Torneirinha e a gota que cai (desce um pixel por quadro e some).
    layer.rect(21, 23, 23, 23, 'S')
    layer.put(23, 24, 's')
    drop = step % 4
    if drop < 3:
        layer.put(23, 26 + drop * 2, 'q')
    # Caixote com duas canecas de barro, a da frente com o quentão escuro.
    layer.rect(24, 26, 33, 31, 'D')
    layer.rect(24, 26, 33, 26, 'l')
    layer.line(24, 31, 33, 26, 'd')
    for cx in (25, 30):
        layer.rect(cx, 22, cx + 2, 25, 'k')
        layer.rect(cx, 22, cx + 2, 22, 'Q')
        layer.put(cx + 3, 23, 'k')
    image = outline(layer.image)
    # Vapor por cima, sem contorno e meio transparente: três fios que ondulam subindo do barril.
    steam = Layer(image.width, image.height)
    for k, x0 in enumerate((9, 13, 17)):
        for y in range(2, 11):
            wiggle = round(math.sin((y + step * 1.6 + k * 2) * 0.9) * 1.2)
            if (y + k + step) % 3 != 0:
                steam.put(x0 + wiggle, y, 'X' if y < 6 else 'x')
    vapor = steam.image
    alpha = vapor.getchannel('A').point(lambda a: a * 150 // 255)
    vapor.putalpha(alpha)
    image.alpha_composite(vapor)
    return image


def wood_stove(step=0):
    """Fogão a lenha de barro: a boca com a brasa piscando, a chapa de ferro com a panela de barro (canjica) e o caldeirão
    preto (pamonha), a colher de pau, a chaminé fumegando e a lenha empilhada do lado (quatro quadros)."""
    layer = Layer(36, 32)
    # Lenha empilhada à esquerda: três toras com a ponta clara.
    for y, x0 in ((27, 0), (27, 5), (24, 2)):
        layer.rect(x0, y, x0 + 4, y + 2, 'D')
        layer.rect(x0, y, x0, y + 2, 'l')
        layer.put(x0, y + 1, 'T')
    # Corpo de barro (mais claro em cima), com a boca em arco.
    layer.rect(9, 18, 34, 31, 'U')
    layer.rect(9, 18, 34, 19, 'T')
    layer.rect(33, 18, 34, 31, 'u')
    # Juntas dos tijolos de barro, desencontradas.
    for row, y in enumerate((21, 25, 29)):
        for x in range(10 + (row % 2) * 3, 33, 6):
            if not (11 <= x <= 19 and y >= 24):
                layer.put(x, y, 'u')
                layer.put(x, y - 1, 'u')
    for y in range(24, 31):
        half = 4 if y > 25 else 3 if y == 25 else 2
        for x in range(15 - half, 16 + half):
            layer.put(x, y, 'd')
    # A brasa dentro da boca, piscando.
    embers = [(12, 29), (13, 28), (14, 29), (15, 28), (16, 29), (17, 28), (18, 29), (14, 27), (16, 27)]
    for k, (x, y) in enumerate(embers):
        layer.put(x, y, 'FfqK'[(k + step) % 4])
    layer.rect(12, 30, 18, 30, 'q')
    # Chapa de ferro por cima.
    layer.rect(9, 16, 34, 17, 's')
    layer.rect(9, 16, 34, 16, 'S')
    # Panela de barro com canjica (creme) e o caldeirão preto.
    layer.rect(11, 10, 19, 15, 'k')
    layer.rect(11, 10, 19, 10, 'K')
    layer.rect(12, 11, 18, 11, 'x')
    layer.put(10, 12, 'k')
    layer.put(20, 12, 'k')
    layer.rect(22, 11, 29, 15, '1')
    layer.rect(22, 11, 29, 11, 's')
    layer.rect(23, 12, 28, 12, 'A')
    # Colher de pau dentro da panela de barro.
    layer.line(17, 11, 21, 5, 'l')
    layer.put(21, 4, 'D')
    # Chaminé no fundo, à direita.
    layer.rect(31, 4, 33, 15, 's')
    layer.rect(31, 4, 31, 15, 'S')
    image = outline(layer.image)
    # Vapor das panelas e fumaça da chaminé, sem contorno e meio transparentes.
    steam = Layer(image.width, image.height)
    for k, (x0, top, bottom, char) in enumerate(((15, 2, 9, 'X'), (26, 4, 10, 'X'), (33, 0, 4, 'M'))):
        for y in range(top, bottom):
            wiggle = round(math.sin((y + step * 1.6 + k * 2) * 0.9) * 1.2)
            if (y + k + step) % 3 != 0:
                steam.put(x0 + wiggle, y, char)
    vapor = steam.image
    vapor.putalpha(vapor.getchannel('A').point(lambda a: a * 150 // 255))
    image.alpha_composite(vapor)
    return image


def cart(phase=0):
    layer = Layer(42, 26)
    layer.rect(2, 8, 37, 17, 'D')
    for x in range(2, 38):
        layer.put(x, 8, 'l')
        layer.put(x, 17, 'd')
    for x in range(2, 38, 6):
        layer.rect(x, 9, x, 16, 'd')
    for x in range(37, 42):
        layer.put(x, 14 + (x - 37) // 2, 'D')
    for cx in (9, 30):
        for angle in range(0, 360, 8):
            a = math.radians(angle)
            layer.put(cx + 5 * math.cos(a), 20 + 5 * math.sin(a), 'd')
            layer.put(cx + 4 * math.cos(a), 20 + 4 * math.sin(a), 'l')
        for angle in range(0, 180, 45):
            a = math.radians(angle)
            layer.line(cx - 3 * math.cos(a), 20 - 3 * math.sin(a), cx + 3 * math.cos(a), 20 + 3 * math.sin(a), 'D')
        layer.grid(['00', '00'], cx - 1, 19)
    for index, (x, color) in enumerate(zip(range(4, 36, 5), 'HAXGHAX')):
        bob = 1 if (index + phase) % 2 else 0
        layer.grid(['.' + color + '.', color + 'A' + color, '.g.'], x, 4 + bob)
    for x in range(3, 37, 4):
        layer.put(x, 7, 'g')
    return outline(layer.image)


def export_sides():
    rng = random.Random(3)
    manifest['sides']['fardo'] = add('lado-fardo', animar.fardo(rng), fps=4)
    manifest['sides']['mastro'] = add('lado-mastro', [mastro_sao_joao(phase=i * math.pi / 2) for i in range(4)], fps=5)
    manifest['sides']['espantalho'] = add('lado-espantalho', animar.espantalho(scarecrow()), fps=3)
    manifest['sides']['carroca'] = add('lado-carroca', [cart(phase) for phase in range(2)], fps=2)
    manifest['sides']['barril-quentao'] = add('lado-barril-quentao', [quentao_barrel(step) for step in range(4)], fps=4)
    manifest['sides']['fogao-lenha'] = add('lado-fogao-lenha', [wood_stove(step) for step in range(4)], fps=4)
    for kind in ('barraca-pescaria', 'barraca-beijo', 'barraca-comidas', 'cadeia', 'correio', 'barraca-argolas', 'barraca-cordel'):
        parts = [booth_parts(kind, frame) for frame in range(BOOTH_FRAMES)]
        _, x0, x1 = BOOTHS[kind]
        manifest['sides'][kind] = add(f'lado-{kind}', [back for back, _ in parts], fps=4,
                                      front=f'lado-{kind}-frente', keeper=[24, 24],
                                      sign={'x0': x0, 'x1': x1, 'y': 3, 'heart': kind == 'barraca-beijo',
                                            'color': PALETTE['r'], 'heartColor': PALETTE['H']})
        images[f'lado-{kind}-frente'] = strip([front for _, front in parts])[0]
    for side_id, meta in manifest['sides'].items():
        image = images[meta['image']].crop((0, 0, meta['w'], meta['h']))
        if meta.get('front'):
            image.alpha_composite(images[meta['front']].crop((0, 0, meta['w'], meta['h'])))
        icons[f'item:{side_id}'] = image.crop(image.getbbox())


# --- Estruturas do porte, fogueiras e ícones --------------------------------------------------

def wheel(radius, turn):
    size = radius * 2 + 12
    height = size + radius // 2
    layer = Layer(size, height)
    cx = cy = size // 2
    for dx in (-radius // 2 - 2, radius // 2 + 2):
        layer.line(cx, cy, cx + dx, height - 1, '0')
        layer.line(cx + 1, cy, cx + dx + 1, height - 1, 's')
        layer.line(cx + 2, cy, cx + dx + 2, height - 1, '0')
    for angle in range(0, 360, 30):
        a = math.radians(angle + turn)
        layer.line(cx, cy, cx + radius * math.cos(a), cy + radius * math.sin(a), 's')
    for step in range(720):
        a = math.radians(step / 2)
        for r, char in ((radius + 1, '0'), (radius, 'S'), (radius - 1, 's'), (radius - 2, '0')):
            layer.put(cx + r * math.cos(a), cy + r * math.sin(a), char)
    for angle in range(0, 360, 15):
        a = math.radians(angle + turn)
        layer.put(cx + radius * math.cos(a), cy + radius * math.sin(a), 'F')
    layer.rect(cx - 2, cy - 2, cx + 2, cy + 2, '0')
    layer.rect(cx - 1, cy - 1, cx + 1, cy + 1, 'A')
    for index, angle in enumerate(range(0, 360, 45)):
        a = math.radians(angle + 22 + turn)
        x, y = round(cx + radius * math.cos(a)), round(cy + radius * math.sin(a))
        color = 'RAJGHKPC'[index]
        layer.grid(['.0.', '.0.'], x - 1, y)
        layer.grid(['00000', '0' + color * 3 + '0', '0X' + color + 'X0', '0' + color * 3 + '0', '00000'], x - 2, y + 2)
    return tint(layer.image, BACK_TINT, 0.22)


def arch():
    layer = Layer(70, 58)
    for px in (3, 63):
        layer.rect(px, 14, px + 3, 57, 'D')
        layer.rect(px, 14, px, 57, 'l')
        layer.rect(px - 1, 14, px - 1, 57, '0')
        layer.rect(px + 4, 14, px + 4, 57, '0')
    for x in range(1, 69):
        t = (x - 35) / 34
        y = round(16 - 6 * (1 - t * t))
        layer.put(x, y - 1, '0')
        layer.put(x, y, 'l')
        layer.put(x, y + 1, 'D')
        layer.put(x, y + 2, '0')
    for index, x in enumerate(range(8, 64, 6)):
        t = (x - 35) / 34
        y = round(16 - 6 * (1 - t * t)) + 3
        color = 'RAGJHKCP'[index % 8]
        layer.grid([color * 3, color * 3, color + '.' + color], x - 1, y)
    sign(layer, 17, 52, 'ARRAIA', accent=5)
    return tint(layer.image, BACK_TINT, 0.12)


def fence():
    layer = Layer(16, 14)
    for px in (1, 9):
        layer.rect(px, 1, px + 1, 13, 'D')
        layer.put(px, 0, 'l')
    for y in (4, 9):
        layer.rect(0, y, 15, y, 'l')
        layer.rect(0, y + 1, 15, y + 1, 'D')
    return tint(outline(layer.image).crop((1, 1, 17, 15)), BACK_TINT, 0.2)


def export_props():
    stage_image, floor = stage()
    manifest['props']['palco'] = add('palco', tint(stage_image, BACK_TINT, 0.12), floor=floor, slots=[2, 44, 82])
    manifest['props']['roda'] = add('roda', [wheel(38, i * 45 / 16) for i in range(16)], fps=6)
    manifest['props']['arco'] = add('arco', arch())
    manifest['props']['cerca'] = add('cerca', fence())
    manifest['props']['caixote'] = add('caixote', crate())
    for index, (w, layers, flame) in enumerate(((18, 2, 13), (24, 3, 17), (30, 4, 22), (38, 5, 30), (46, 6, 38))):
        frames = [bonfire(w, layers, flame, phase=k * math.pi / 6, sparks=False) for k in range(12)]
        manifest['fires'][str(index)] = add(f'fogueira-{index}', frames, fps=15)
    legendary = [bonfire(46, 6, 38, phase=k * math.pi / 6, sparks=False, legendary=True) for k in range(12)]
    manifest['fires']['lendaria'] = add('fogueira-lendaria', legendary, fps=16)
    for kind, text in sprites.REQUEST_ICONS.items():
        manifest['requests'][kind] = add(f'pedido-{kind}', fill(text))


def export_rings():
    """Cenário, garrafas e argolas do minijogo Argolas da Sorte."""
    width, height = 176, 112
    layer = Layer(width, height)
    for y in range(80):
        for x in range(width):
            layer.put(x, y, 'd' if x % 12 == 0 else ('D' if (x // 12) % 2 else 'l'))
    awning(layer, width, 0, 'GXg')
    layer.rect(0, 12, width - 1, 12, 'd')
    for index, x in enumerate(range(6, width - 4, 10)):
        color = 'RAGJHK'[index % 6]
        layer.grid([color * 3, color * 3, color + '.' + color], x, 13)
    layer.rect(0, 78, width - 1, 78, '0')
    layer.rect(0, 79, width - 1, 80, 'l')
    layer.rect(0, 81, width - 1, 81, '0')
    for y in range(82, height):
        for x in range(width):
            layer.put(x, y, 'd' if (y - 82) % 6 == 5 else ('D' if (y // 6) % 2 else 'l'))
    # Prateleira de prêmios no alto da parede: ursinhos de cores diferentes e peixinhos no saquinho (os prêmios de
    # verdade das Argolas), com a tábua e as mãos-francesas.
    background = layer.image
    shelf = 31
    for x in range(6, width - 6):
        background.putpixel((x, shelf), hex_rgb(PALETTE['T']) + (255,))
        background.putpixel((x, shelf + 1), hex_rgb(PALETTE['u']) + (255,))
    for x in (12, width // 2, width - 13):
        for k in range(4):
            background.putpixel((x + k, shelf + 2 + k), hex_rgb(PALETTE['u']) + (255,))
    bear, bear_pivot = sprites.HAND_FILL['ursinho']
    fish, fish_pivot = sprites.HAND_FILL['peixinho']
    prizes = [fill(bear), fill(fish), recolor(fill(bear), {'U': 'H', 'T': 'c'}), fill(fish), recolor(fill(bear), {'U': 'b', 'T': 'X'}),
              fill(fish), recolor(fill(bear), {'U': 'A', 'T': 'F'})]
    step = (width - 28) / (len(prizes) - 1)
    for k, prize in enumerate(prizes):
        x = round(14 + k * step - prize.width / 2)
        background.alpha_composite(prize, (x, shelf - prize.height + 1))
    # Luz quente de cima: as tábuas mais claras perto do toldo e mais escuras embaixo, só um toque.
    glow = Image.new('RGBA', background.size, (0, 0, 0, 0))
    gp = glow.load()
    for y in range(13, 78):
        k = max(0.0, 1 - (y - 13) / 55)
        for x in range(width):
            gp[x, y] = (255, 214, 138, round(46 * k * k))
    background.alpha_composite(glow)
    manifest['rings']['fundo'] = add('argolas-fundo', background)
    # Uma garrafa por prêmio. Quanto melhor o prêmio, mais larga a boca e menos folga a argola tem para passar:
    # folga = (vão da argola - boca) / 2, que precisa bater com config.ringAim em src/data.js (há teste para isso).
    kinds = [  # prêmio, boca, linhas de gargalo, corpo, cor, sombra, faixa
        ('fichas', 1, 8, 5, 'G', 'g', None),
        ('animacao', 3, 6, 7, 'K', 'k', 'X'),
        ('lenha', 3, 6, 7, 'J', 'j', 'X'),
        ('x2', 5, 5, 9, 'R', 'r', 'A'),
        ('x3', 7, 4, 11, 'P', 'i', 'A'),
        ('item', 9, 2, 13, 'A', 'a', 'R'),
    ]
    bottles = []
    for kind, neck, neck_rows, body, color, shade, band in kinds:
        bottle = Layer(13, 18)
        center, half, wide = 6, (neck - 1) // 2, (body - 1) // 2
        for y in range(18):
            w = half if y < neck_rows else min(wide, half + y - neck_rows + 1)
            bottle.rect(center - w, y, center + w, y, color)
            if w:
                bottle.put(center + w, y, shade)
        bottle.rect(center - half, 0, center + half, 0, 'O' if kind == 'item' else 's')
        bottle.rect(center - wide, 17, center + wide, 17, shade)
        shoulder = neck_rows + wide - half
        for y in range(shoulder, 15):
            bottle.put(center - wide + 1, y, 'X')
        if band:
            bottle.rect(center - wide, 11, center + wide - 1, 12, band)
        if kind == 'item':
            bottle.grid(['R.R', '.R.'], center - 1, 9)
        bottles.append(outline(bottle.image))
    manifest['rings']['garrafa'] = add('argolas-garrafa', bottles, kinds=[k[0] for k in kinds],
                                       necks={k[0]: k[1] for k in kinds})
    rings = []
    for color in 'RAC':
        ring = Layer(14, 6)
        for angle in range(0, 360, 5):
            a = math.radians(angle)
            ring.put(7 + 6 * math.cos(a), 2.5 + 2 * math.sin(a), color)
        ring.put(4, 1, 'X')
        rings.append(outline(ring.image))
    # Vão da argola: os pixels coloridos ficam a 6 do centro, então cabe uma boca de até 11 pixels.
    manifest['rings']['argola'] = add('argolas-argola', rings, open=11)


def rainbow_icon():
    """O arco-íris pequeno (ícone da conquista do pote de ouro): sete faixas de 2 pixels numa meia elipse."""
    layer = Layer(30, 16)
    colors = ['R', 'K', 'A', 'G', 'C', 'J', 'P']
    for k, color in enumerate(colors):
        a, b = 14 - 1.4 * k, 13 - 1.4 * k
        for step in range(0, 181):
            angle = math.radians(step)
            layer.put(round(14.5 - a * math.cos(angle)), round(14 - b * math.sin(angle)), color)
            layer.put(round(14.5 - a * math.cos(angle)), round(15 - b * math.sin(angle)), color)
    return outline(layer.image)


def album_quentao():
    """Figurinha do friozinho: caneca de barro de quentão com o vapor subindo em dois fios."""
    layer = Layer(13, 14)
    layer.rect(2, 6, 8, 12, 'k')
    layer.rect(2, 6, 3, 12, 'K')
    layer.rect(8, 6, 8, 12, 'u')
    layer.rect(2, 6, 8, 6, 'Q')
    layer.rect(3, 6, 7, 6, 'q')
    layer.rect(9, 8, 10, 8, 'k')
    layer.rect(10, 8, 10, 10, 'k')
    layer.rect(9, 10, 10, 10, 'k')
    image = outline(layer.image)
    # Vapor por cima, sem contorno e meio transparente (como o do barril), em dois fios que ondulam.
    steam = Layer(image.width, image.height)
    for x0, shift in ((5, 0), (7, 1)):
        for y in range(0, 6):
            steam.put(x0 + ((y + shift) // 2) % 2, y, 'X')
    vapor = steam.image
    vapor.putalpha(vapor.getchannel('A').point(lambda a: a * 190 // 255))
    image.alpha_composite(vapor)
    return image


def album_thunder():
    """Figurinha do trovão: nuvem escura com o raio amarelo saindo dela."""
    layer = Layer(14, 16)
    for x, y, r in ((4, 4, 3), (8, 3, 3.5), (11, 5, 2.5)):
        for yy in range(9):
            for xx in range(14):
                if (xx - x) ** 2 + (yy - y) ** 2 <= r * r:
                    layer.put(xx, yy, 'M' if yy < y else 'L')
    layer.rect(2, 6, 12, 7, 'L')
    for x, y in ((8, 8), (7, 9), (6, 10), (7, 10), (8, 10), (7, 11), (6, 12), (5, 13), (5, 14)):
        layer.put(x, y, 'A')
    layer.put(8, 9, 'F')
    return outline(layer.image)


def album_rain():
    """Figurinha da chuva: nuvem cinza com gotas azuis caindo."""
    layer = Layer(14, 14)
    for x, y, r in ((4, 4, 3), (8, 3, 3.5), (11, 5, 2.5)):
        for yy in range(12):
            for xx in range(14):
                if (xx - x) ** 2 + (yy - y) ** 2 <= r * r:
                    layer.put(xx, yy, 'w' if yy < y else 'M')
    layer.rect(2, 6, 12, 7, 'M')
    for x, y in ((3, 9), (6, 11), (9, 9), (12, 11), (4, 13), (10, 13)):
        layer.put(x, y, 'B')
        layer.put(x, y - 1, 'C')
    return outline(layer.image)


def album_fireworks():
    """Figurinha dos fogos: um estouro de raios coloridos com o miolo branco."""
    layer = Layer(15, 15)
    colors = 'HAJGKP'
    for k in range(12):
        angle = k * math.pi / 6
        for step in range(2, 7):
            layer.put(7 + math.cos(angle) * step, 7 + math.sin(angle) * step, colors[k % 6] if step > 3 else 'F')
    layer.put(7, 7, 'z')
    return outline(layer.image)


def album_request():
    """Figurinha do pedido: o balão de fala da festa com a exclamação."""
    layer = Layer(13, 13)
    layer.rect(1, 1, 11, 8, 'X')
    layer.rect(1, 1, 11, 1, 'z')
    layer.rect(3, 9, 4, 9, 'X')
    layer.put(3, 10, 'X')
    layer.rect(6, 2, 6, 5, 'R')
    layer.put(6, 7, 'R')
    return outline(layer.image)


# Varais de bandeirinhas: cada bandeirinha é (cor, sombra, brilho[, florzinha]), repetidas ao longo do fio.
VARAIS = {
    'varal-colorido': [('R', 'r', 'p'), ('A', 'a', 'F'), ('g', 'v', 'G'), ('J', 'j', 'b'), ('H', 'h', 'c'), ('K', 'k', 'O'),
                       ('C', 'J', 'b'), ('P', 'i', 'I')],
    'varal-azul': [('J', 'j', 'b'), ('X', 'E', 'z')],
    'varal-chita': [('R', 'r', 'p', 'X'), ('H', 'h', 'c', 'A'), ('g', 'v', 'G', 'H'), ('A', 'a', 'F', 'R')],
    'varal-brasil': [('g', 'v', 'G'), ('A', 'a', 'F'), ('g', 'v', 'G'), ('A', 'a', 'F'), ('J', 'j', 'b')],
    'varal-ouro': [('A', 'a', 'F'), ('X', 'E', 'z'), ('f', 'k', 'O')],
}


def varal_icon(colors):
    """Ícone do varal na loja: um pedaço de fio com três bandeirinhas nas cores dele."""
    layer = Layer(17, 10)
    for x in range(17):
        layer.put(x, 1 + round(1.4 * math.sin(math.pi * x / 16)), 'd')
    for k, x0 in enumerate((1, 6, 11)):
        base, dark, light = colors[k % len(colors)][:3]
        top = 2 + round(1.4 * math.sin(math.pi * (x0 + 2) / 16))
        for dy in range(5):
            for dx in range(5):
                if (dy == 3 and dx in (0, 4)) or (dy == 4 and dx != 2):
                    continue
                layer.put(x0 + dx, top + dy, dark if dx == 4 or dy == 0 else light if dx == 0 and dy == 1 else base)
        if len(colors[k % len(colors)]) > 3:
            layer.put(x0 + 2, top + 2, colors[k % len(colors)][3])
    return outline(layer.image)


def album_compadres():
    """Figurinha dos compadres de fogueira: os dois de mão estendida, as mãos se encontrando, e um coraçãozinho em cima."""
    people = animar.compadres([(dressed(sprites.CAVALHEIRO, 1), 'xadrez-verde'), (dressed(sprites.DAMA, 1), 'chita-rosa')])
    poses = len(animar.COMPADRE_POSES)
    him = people[4].transpose(Image.FLIP_LEFT_RIGHT)
    her = people[poses + 4]
    width = him.width + her.width - 6
    image = animar.blank(width, him.height + 5)
    image.alpha_composite(him, (0, 5))
    image.alpha_composite(her, (him.width - 6, 5))
    image.alpha_composite(animar.strokes(width, image.height, [], [(['R.R', 'RRR', '.R.'], him.width - 5, 1)]))
    return image.crop(image.getbbox())


def export_icons():
    for name, text in sprites.UI_ICONS.items():
        icons[f'ui:{name}'] = fill(text)
    balloon = cenario.balao_ouro()[0]
    icons['ui:balao'] = balloon.crop(balloon.getbbox())
    icons['ui:arco'] = rainbow_icon()
    bride = casamento.personagens()[3]
    icons['ui:casamento'] = bride.crop(bride.getbbox())
    pot = cenario.pote()[0]
    icons['ui:pote'] = pot.crop(pot.getbbox())
    racer = cenario.saco()[3]
    icons['ui:saco'] = racer.crop(racer.getbbox())
    auctioneer = cenario.leiloeiro()[1]
    icons['ui:leilao'] = auctioneer.crop(auctioneer.getbbox())
    # Figurinhas do Álbum da Festa que ainda não tinham ícone.
    crop = lambda image: image.crop(image.getbbox())
    icons['ui:quadrilha'] = crop(animar.person(sprites.DAMA, 'chita', ('alto', 'alto', 0, None), sleeve='H'))
    icons['ui:frio'] = album_quentao()
    icons['ui:penetra'] = crop(animar.penetra()[0])
    icons['ui:pombo'] = crop(cenario.pombo()[0])
    icons['ui:alto'] = crop(cenario.altofalante()[1])
    icons['ui:chuva'] = album_rain()
    icons['ui:fogos'] = album_fireworks()
    icons['ui:pedido'] = album_request()
    icons['ui:sanfoneiro'] = crop(cenario.sanfoneiro()[1])
    icons['ui:fotografo'] = crop(cenario.fotografo()[0])
    icons['ui:cobra'] = crop(cenario.cobra()[0])
    icons['ui:burro'] = crop(cenario.burro()[0].crop((0, 0, 30, 22)))  # só o quadro, sem as pernas do cavalete
    icons['ui:trovao'] = album_thunder()
    icons['ui:compadres'] = album_compadres()
    for dish, text in sprites.DISHES.items():
        icons[f'ui:prato-{dish}'] = fill(text)
    for food, text in sprites.FOODS.items():
        icons[f'ui:comida-{food}'] = fill(text)
    icons['ui:carro-boi'] = crop(cenario.carro_de_boi()[0])
    legendary = images['fogueira-lendaria'].crop((0, 0, manifest['fires']['lendaria']['w'], manifest['fires']['lendaria']['h']))
    icons['ui:lendaria'] = crop(legendary)
    for varal, colors in VARAIS.items():
        icons[f'item:{varal}'] = varal_icon(colors)
        manifest['varais'][varal] = {'colors': [[f'#{PALETTE[c].lstrip("#")}' for c in flag] for flag in colors]}
    for fabric in FABRICS:
        icons[f'item:{fabric}'] = fill(sprites.SHIRT_ICON, fabric)


# --- Terreiros: paletas para o gerador do jogo -------------------------------------------------

TERRAINS = {
    'terra-batida': {'top': 'GGGGGGGg', 'mid': 'ggggG', 'sub': 'vvvT', 'soil': 'TTTTU', 'deep': 'UUUUT',
                     'low': 'u', 'edge': '1', 'speck': 'Ss', 'flowers': 'HAX', 'tuft': 'Gg'},
    'lamacal': {'top': 'UUUgUu', 'mid': 'uuUg', 'sub': 'uuu1', 'soil': 'UUuu', 'deep': 'uuu1',
                'low': '1', 'edge': '0', 'speck': 'NB', 'flowers': 'BN', 'tuft': 'gv', 'puddle': 'BN'},
    'gramado': {'top': 'GGGGGG', 'mid': 'GGGg', 'sub': 'gggv', 'soil': 'TTTU', 'deep': 'UUUT',
                'low': 'u', 'edge': '1', 'speck': 'Ss', 'flowers': 'HAXHAXP', 'tuft': 'GGg'},
    'areia': {'top': 'YYYYx', 'mid': 'xxxY', 'sub': 'xxTx', 'soil': 'TTxT', 'deep': 'TTU',
              'low': 'U', 'edge': 'u', 'speck': 'Xp', 'flowers': 'Xp', 'tuft': 'xY'},
    # Chão do Sertão: terra vermelha rachada de sol, com florzinha amarela da caatinga e tufo seco.
    'sertao': {'top': 'kkUkk', 'mid': 'kUkU', 'sub': 'Uuk', 'soil': 'kUUk', 'deep': 'UuuU', 'low': 'u', 'edge': '1',
               'speck': 'u1', 'flowers': 'AFA', 'tuft': 'oy'},
    'tablado': {'top': 'l', 'mid': 'D', 'sub': 'd', 'soil': 'TTTU', 'deep': 'UUUT', 'low': 'u', 'edge': '1',
                'speck': 'Ss', 'flowers': '', 'tuft': '', 'pattern': 'planks'},
    'pista-forro': {'top': 'e', 'mid': 'X', 'sub': 's', 'soil': 'TTTU', 'deep': 'UUUT', 'low': 'u', 'edge': '1',
                    'speck': 'Ss', 'flowers': '', 'tuft': '', 'pattern': 'checker'},
}


def mini_ground(palette):
    rng = random.Random(5)
    layer = Layer(22, 10)
    for x in range(22):
        t = (x - 10.5) / 10.5
        bottom = int(3 + 6 * max(0.0, 1 - t * t) ** 0.8)
        for y in range(bottom + 1):
            if y == 0:
                if palette.get('pattern') == 'checker':
                    char = 'e' if (x // 2) % 2 else 'X'
                elif palette.get('pattern') == 'planks':
                    char = 'd' if x % 6 == 0 else 'l'
                else:
                    char = rng.choice(palette['top'])
            elif y == 1:
                char = rng.choice(palette['mid'])
            elif y == 2:
                char = rng.choice(palette['sub'])
            elif y < 5:
                char = rng.choice(palette['soil'])
            else:
                char = rng.choice(palette['deep'])
            layer.put(x, y, char)
    return outline(layer.image)


def export_terrains():
    to_hex = lambda chars: [PALETTE[c] for c in chars]
    for terrain_id, palette in TERRAINS.items():
        manifest['terrains'][terrain_id] = {key: (to_hex(value) if key != 'pattern' else value)
                                            for key, value in palette.items()}
        icons[f'item:{terrain_id}'] = mini_ground(palette)


# --- Ícone do app e pacote ---------------------------------------------------------------------

def export_app_icon():
    meta = manifest['mandioca']['xadrez-vermelho']
    body = images[meta['image']].crop((0, 0, FRAME_W, FRAME_H))
    hat = images[manifest['hats']['chapeu-palha']['image']]
    head = anchors_head = manifest['mandioca']['meta']['anchors'][0]['head']
    body.alpha_composite(hat, tuple(anchors_head))
    crop = body.crop((anchors_head[0], anchors_head[1], anchors_head[0] + 24, anchors_head[1] + 24))
    base = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    base.alpha_composite(crop, (4, 5))
    base.save(ROOT / 'desktop' / 'tray.png')
    sizes = [16, 24, 32, 48, 64, 128, 256]
    frames = [base.resize((size, size), Image.NEAREST) for size in sizes]
    frames[-1].save(ROOT / 'desktop' / 'icon.ico', format='ICO', sizes=[(s, s) for s in sizes],
                    append_images=frames[:-1])
    return head


def data_url(image):
    buffer = io.BytesIO()
    image.save(buffer, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buffer.getvalue()).decode('ascii')


def contact_sheet():
    tiles = list(images.values()) + list(icons.values())
    width = 900
    x = y = row = 0
    placed = []
    for tile in tiles:
        if x + tile.width > width:
            x, y, row = 0, y + row + 4, 0
        placed.append((tile, x, y))
        x += tile.width + 4
        row = max(row, tile.height)
    sheet = Image.new('RGBA', (width, y + row + 4), (111, 127, 154, 255))
    for tile, tx, ty in placed:
        sheet.alpha_composite(tile, (tx, ty))
    SHEET.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(SHEET)


def main():
    export_mandioca()
    export_hats()
    export_hand()
    export_chars()
    export_crowd()
    export_sides()
    export_props()
    export_rings()
    manifest['scenery'] = cenario.export(add)
    manifest['casa'] = casa_salas.exportar(add, icons)
    manifest['janelas'] = janelas.exportar(add, icons)
    export_icons()
    export_terrains()
    export_app_icon()
    contact_sheet()
    bundle = dict(manifest, images={name: data_url(image) for name, image in images.items()},
                  icons={name: {'src': data_url(image), 'w': image.width, 'h': image.height}
                         for name, image in icons.items()})
    BUNDLE.write_text('// Gerado por art/exportar.py. Não edite à mão.\n'
                      'globalThis.FESTA_SPRITES = ' + json.dumps(bundle, separators=(',', ':')) + ';\n',
                      encoding='utf-8')
    print(f'{len(images)} folhas e {len(icons)} ícones; pacote com {BUNDLE.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
