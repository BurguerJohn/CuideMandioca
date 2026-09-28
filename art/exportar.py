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
from render import hex_rgb, outline, sprite, tint
import animar
import cenario
from scene import (BACK_TINT, HEART, Layer, awning, bonfire, booth_back, booth_counter, crate, flag_mast,
                   sign, stage)
from sprites import PALETTE

ROOT = Path(__file__).resolve().parents[1]
BUNDLE = ROOT / 'src' / 'festa-sprites.js'
SHEET = ROOT / 'assets' / 'festa' / 'folha.png'

PAD = 4
FRAME_W, FRAME_H = 24 + PAD * 2, 40 + PAD
FABRICS = ['xadrez-vermelho', 'xadrez-azul', 'xadrez-verde', 'remendado', 'chita', 'chita-rosa', 'xadrez-ouro']
CROWD_FABRICS = ['xadrez-azul', 'chita', 'xadrez-vermelho', 'chita-rosa', 'xadrez-verde', 'remendado']

sprites.FABRICS.update({
    'xadrez-verde': ['vvgg', 'vvgg', 'ggXX', 'ggXX'],
    'remendado': ['RRRJJJ', 'RRRJJJ', 'RRRJJJ', 'AAAPPP', 'AAAPPP', 'AAAPPP'],
    'xadrez-ouro': ['aaAA', 'aaAA', 'AAFF', 'AAFF'],
})

images = {}
manifest = {'mandioca': {}, 'hats': {}, 'hand': {}, 'chars': {}, 'crowd': {}, 'sides': {}, 'props': {},
            'fires': {}, 'requests': {}, 'terrains': {}, 'rings': {}, 'scenery': {}}
icons = {}


def strip(frames):
    width = max(frame.width for frame in frames)
    height = max(frame.height for frame in frames)
    sheet = Image.new('RGBA', (width * len(frames), height), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * width, height - frame.height))
    return sheet, width, height


def add(name, frames, **meta):
    sheet, width, height = strip(frames if isinstance(frames, list) else [frames])
    images[name] = sheet
    return {'image': name, 'w': width, 'h': height, 'frames': sheet.width // width, **meta}


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
DANCE = [(1, 0, 'diag', 'baixo', 'ambas', 'canta'), (0, -1, 'alto', 'baixo', 'esquerda', 'canta'),
         (-1, -1, 'alto', 'cintura', 'esquerda', 'sorri'), (0, 0, 'diag', 'cintura', 'ambas', 'sorri'),
         (1, 0, 'lado', 'baixo', 'ambas', 'canta'), (0, 1, 'diag', 'alto', 'direita', 'canta'),
         (-1, 1, 'alto', 'alto', 'direita', 'sorri'), (0, 0, 'diag', 'baixo', 'ambas', 'sorri')]
REST = [(1, 'ofega'), (2, 'ofega'), (2, 'sorri'), (1, 'ofega')]
CHEER = [(1, 0, 'diag', 'baixo', 'canta'), (0, 3, 'alto', 'alto', 'canta'), (-1, 4, 'alto', 'alto', 'canta'),
         (0, 2, 'lado', 'alto', 'sorri')]


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
        steps = max(abs(x1 - x0), abs(y1 - y0), 1)
        for step in range(steps + 1):
            t = step / steps
            layer.put(ox + x0 + (x1 - x0) * t, oy + y0 + (y1 - y0) * t, '3')
    layer.grid(['54', '43'], ox + hand[0], oy + hand[1])


def legs(layer, bob, sway, lifted):
    top = PAD + 8 + 28 + bob
    for side, x, colors in (('esquerda', PAD + 9 + sway, '43'), ('direita', PAD + 13 + sway, '32')):
        foot = FRAME_H - 2 - (2 if lifted == side else 0)
        for y in range(top, foot):
            layer.put(x, y, colors[0])
            layer.put(x + 1, y, colors[1])
        layer.grid(['ddD'] if side == 'esquerda' else ['Ddd'], x - 1 if side == 'esquerda' else x, foot)


def mandioca_frame(fabric, bob, sway, left, right, lifted, mouth, eyes='abertos', hop=0):
    frame = Image.new('RGBA', (FRAME_W, FRAME_H), (0, 0, 0, 0))
    leg_layer = Layer(FRAME_W, FRAME_H)
    legs(leg_layer, bob, sway, lifted)
    frame.alpha_composite(outline(leg_layer.image).crop((1, 1, FRAME_W + 1, FRAME_H + 1)))
    frame.alpha_composite(sprite(face(eyes, mouth), fabric), (PAD + sway, PAD + 8 + bob))
    arms = Layer(FRAME_W, FRAME_H)
    ox, oy = PAD + sway, PAD + bob
    arm(arms, (4, 22), *LEFT_ARM[left], ox, oy)
    arm(arms, (19, 22), *RIGHT_ARM[right], ox, oy)
    frame.alpha_composite(outline(arms.image).crop((1, 1, FRAME_W + 1, FRAME_H + 1)))
    anchors = {'head': [ox, oy - hop], 'eyes': [ox + 8, oy + 12 - hop],
               'hand': [ox + LEFT_ARM[left][1][0], oy + LEFT_ARM[left][1][1] - hop]}
    if hop:
        frame = shifted(frame, -hop)
    return frame, anchors


def export_mandioca():
    anchors = None
    for fabric in FABRICS:
        frames, marks = [], []
        for bob, sway, left, right, lifted, mouth in DANCE:
            frame, anchor = mandioca_frame(fabric, bob, sway, left, right, lifted, mouth)
            frames.append(frame)
            marks.append(anchor)
        for bob, mouth in REST:
            frame, anchor = mandioca_frame(fabric, bob, 0, 'joelho', 'joelho', 'ambas', mouth, 'cansados')
            frames.append(frame)
            marks.append(anchor)
        for bob, hop, left, right, mouth in CHEER:
            frame, anchor = mandioca_frame(fabric, bob, 0, left, right, 'ambas', mouth, hop=hop)
            frames.append(frame)
            marks.append(anchor)
        manifest['mandioca'][fabric] = add(f'mandioca-{fabric}', frames)
        anchors = marks
    manifest['mandioca']['meta'] = {
        'w': FRAME_W, 'h': FRAME_H, 'pad': PAD, 'anchors': anchors,
        'tags': {'danca': list(range(8)), 'descanso': list(range(8, 12)), 'comemora': list(range(12, 16))},
    }
    blink = sprite('\n'.join(EYES['fechados']))
    manifest['mandioca']['blink'] = add('piscar', blink)


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
    return outline(layer.image), [3, 12]


def export_hand():
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


# --- Turma: cada personagem com a animação do seu papel ---------------------------------------

def export_chars():
    milho = sprite(sprites.MILHO)
    manifest['chars']['milho'] = add('turma-milho', [shifted(milho, dy, 22) for dy in (0, -1, -2, -1)], fps=6)
    manifest['chars']['cenoura'] = add('turma-cenoura', animar.cenoura(), fps=8)
    manifest['chars']['inhame'] = add('turma-inhame', animar.inhame(), fps=6)
    manifest['chars']['batata'] = add('turma-batata', animar.batata(), fps=6)
    manifest['chars']['pamonha'] = add('turma-pamonha', animar.pamonha(), fps=4, shout=2)
    manifest['chars']['faisca'] = add('turma-faisca', animar.faisca(), fps=9)
    # Quem trabalha atrás de balcão tem `top`: quantos pixels do quadro ficam acima da linha do balcão.
    manifest['chars']['pacoca'] = add('turma-pacoca', animar.pacoca(), fps=8, top=11)
    manifest['chars']['aipim'] = add('turma-aipim', animar.aipim(), fps=3, top=1)
    manifest['chars']['cachorro'] = add('turma-cachorro', animar.cachorro(), fps=2)
    manifest['chars']['balcao-cavalheiro'] = add('turma-balcao-cavalheiro',
                                                 animar.keeper(sprites.CAVALHEIRO, 'xadrez-azul', [(4, 5), (7, 5)]), fps=2)
    manifest['chars']['balcao-dama'] = add('turma-balcao-dama', animar.keeper(sprites.DAMA, 'chita', [(4, 5), (7, 5)]), fps=2)

    full = {'aipim': sprite(sprites.AIPIM, 'chita-rosa'), 'cachorro': sprite(sprites.CACHORRO),
            'pacoca': sprite(sprites.PACOCA)}
    for char_id in ('milho', 'cenoura', 'inhame', 'batata', 'pamonha', 'faisca', 'pacoca', 'aipim', 'cachorro'):
        if char_id in full:
            icons[f'char:{char_id}'] = full[char_id]
        else:
            meta = manifest['chars'][char_id]
            image = images[meta['image']].crop((0, 0, meta['w'], meta['h']))
            icons[f'char:{char_id}'] = image.crop(image.getbbox())


def export_crowd():
    """Quadrilha (passo com braços e pé levantado) e plateia (palmas e aceno), 4 quadros por pessoa."""
    normal, faded = [], []
    for grid in (sprites.CAVALHEIRO, sprites.DAMA):
        for fabric in CROWD_FABRICS:
            normal.extend(animar.person(grid, fabric, pose) for pose in animar.DANCE_STEPS)
            faded.extend(tint(animar.person(grid, fabric, pose), BACK_TINT, 0.38) for pose in animar.CHEER_STEPS)
    manifest['crowd'] = {
        'dancers': add('multidao', normal), 'audience': add('plateia', faded),
        'fabrics': len(CROWD_FABRICS), 'steps': len(animar.DANCE_STEPS), 'pad': animar.CROWD_PAD,
    }
    manifest['props']['penetra'] = add('penetra', animar.penetra(), fps=8)


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
    manifest['sides']['mastro'] = add('lado-mastro', [flag_mast(phase=i * math.pi / 2) for i in range(4)], fps=5)
    manifest['sides']['espantalho'] = add('lado-espantalho', animar.espantalho(scarecrow()), fps=3)
    manifest['sides']['carroca'] = add('lado-carroca', [cart(phase) for phase in range(2)], fps=2)
    for kind in ('barraca-pescaria', 'barraca-beijo', 'barraca-comidas', 'cadeia', 'correio', 'barraca-argolas'):
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
    manifest['props']['roda'] = add('roda', [wheel(38, i * 45 / 8) for i in range(8)], fps=3)
    manifest['props']['arco'] = add('arco', arch())
    manifest['props']['cerca'] = add('cerca', fence())
    manifest['props']['caixote'] = add('caixote', crate())
    for index, (w, layers, flame) in enumerate(((18, 2, 13), (24, 3, 17), (30, 4, 22), (38, 5, 30), (46, 6, 38))):
        frames = [bonfire(w, layers, flame, phase=k * math.pi / 3, sparks=False) for k in range(6)]
        manifest['fires'][str(index)] = add(f'fogueira-{index}', frames, fps=9)
    legendary = [recolor(bonfire(46, 6, 38, phase=k * math.pi / 3, sparks=False),
                         {'Q': 'a', 'q': 'A', 'f': 'F', 'F': 'z'}) for k in range(6)]
    manifest['fires']['lendaria'] = add('fogueira-lendaria', legendary, fps=10)
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
    manifest['rings']['fundo'] = add('argolas-fundo', layer.image)
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


def export_icons():
    for name, text in sprites.UI_ICONS.items():
        icons[f'ui:{name}'] = fill(text)
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
