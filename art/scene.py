"""Cenário procedural do conceito e as duas composições: início e final do jogo."""

import math
import random

from PIL import Image

from render import hex_rgb, outline, sprite, paste, tint
from sprites import PALETTE
import sprites

FONT = {
    'A': ['010', '101', '111', '101', '101'],
    'B': ['110', '101', '110', '101', '110'],
    'C': ['011', '100', '100', '100', '011'],
    'D': ['110', '101', '101', '101', '110'],
    'E': ['111', '100', '110', '100', '111'],
    'F': ['111', '100', '110', '100', '100'],
    'G': ['011', '100', '101', '101', '011'],
    'I': ['111', '010', '010', '010', '111'],
    'J': ['011', '001', '001', '101', '010'],
    'L': ['100', '100', '100', '100', '111'],
    'M': ['101', '111', '111', '101', '101'],
    'O': ['010', '101', '101', '101', '010'],
    'P': ['110', '101', '110', '100', '100'],
    'R': ['110', '101', '110', '101', '101'],
    'S': ['011', '100', '010', '001', '110'],
}
HEART = ['01010', '11111', '11111', '01110', '00100']
BACK_TINT = '#1c1a3a'


class Layer:
    def __init__(self, width, height):
        self.image = Image.new('RGBA', (width, height), (0, 0, 0, 0))

    def put(self, x, y, char):
        x, y = round(x), round(y)
        if 0 <= x < self.image.width and 0 <= y < self.image.height:
            self.image.putpixel((x, y), hex_rgb(PALETTE[char]) + (255,))

    def rect(self, x0, y0, x1, y1, char):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.put(x, y, char)

    def glyphs(self, rows, x, y, char):
        for dy, row in enumerate(rows):
            for dx, bit in enumerate(row):
                if bit == '1':
                    self.put(x + dx, y + dy, char)

    def text(self, word, x, y, char, accent=None):
        for index, letter in enumerate(word):
            self.glyphs(FONT[letter], x + index * 4, y, char)
            if accent == index:
                self.put(x + index * 4 + 2, y - 2, char)

    def line(self, x0, y0, x1, y1, char):
        steps = max(abs(x1 - x0), abs(y1 - y0), 1)
        for step in range(int(steps) + 1):
            t = step / steps
            self.put(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, char)

    def grid(self, rows, x, y):
        for dy, row in enumerate(rows):
            for dx, char in enumerate(row):
                if char != '.':
                    self.put(x + dx, y + dy, char)


def island(width, rng, depth=19):
    """Terreiro flutuante: grama por cima, terra batida, raízes com mandioquinhas."""
    height = depth + 16
    layer = Layer(width, height)
    half = (width - 1) / 2
    wobble = [rng.uniform(-1.6, 1.6) for _ in range(width)]
    smooth = [sum(wobble[max(0, i - 2):i + 3]) / 5 for i in range(width)]
    bottoms = []
    for x in range(width):
        t = (x - half) / half
        bottom = int(4 + depth * max(0.0, 1 - t * t) ** 0.75 + smooth[x] * 2)
        bottoms.append(bottom)
        top = 1 if x in (0, width - 1) else 0
        for y in range(top, bottom + 1):
            if y == top:
                char = 'G' if rng.random() > 0.12 else 'g'
            elif y == top + 1:
                char = 'g' if rng.random() > 0.25 else 'G'
            elif y == top + 2:
                char = 'v' if rng.random() > 0.4 else 'T'
            elif y < 7:
                char = 'T' if rng.random() > 0.15 else 'U'
            elif y < bottom * 0.62:
                char = 'U' if rng.random() > 0.08 else 'T'
            elif y < bottom - 1:
                char = 'u'
            else:
                char = '1'
            layer.put(x, y, char)
    for _ in range(width // 5):
        x = rng.randrange(3, width - 3)
        y = rng.randrange(8, max(9, bottoms[x] - 2))
        layer.put(x, y, 'S')
        layer.put(x + 1, y, 's')
        layer.put(x, y + 1, 's')
    count = max(3, width // 32)
    for number in range(count):
        x = int(width * (0.15 + 0.7 * number / max(1, count - 1)))
        y = bottoms[x]
        for step in range(rng.randint(3, 8)):
            y += 1
            if step % 3 == 2:
                x += rng.choice((-1, 1))
            layer.put(x, y, '2')
        if number % 3 == 1:
            layer.grid(['343', '343', '232', '.2.'], x - 1, y + 1)
    return outline(layer.image), bottoms


def grass_details(layer, x0, x1, rng, ground_y):
    for x in range(x0 + 2, x1 - 2):
        roll = rng.random()
        if roll < 0.22:
            layer.put(x, ground_y - 1, 'G')
            if roll < 0.07:
                layer.put(x, ground_y - 2, 'g')
        elif roll < 0.25:
            layer.put(x, ground_y - 1, rng.choice('HAX'))


def bonfire(width=34, layers=5, flame=27, phase=None, sparks=True):
    """Fogueira junina: torre de toras cruzadas; cresce com o porte do arraiá."""
    height = flame + layers * 5
    tower_top = height - layers * 5
    flame_bottom = tower_top + 7
    w = width
    tongues = [(w * 0.5, 0, w * 0.22), (w * 0.32, flame * 0.33, w * 0.16), (w * 0.68, flame * 0.26, w * 0.16),
               (w * 0.2, flame * 0.62, w * 0.12), (w * 0.8, flame * 0.55, w * 0.12),
               (w * 0.44, flame * 0.14, w * 0.13)]
    if phase is not None:
        tongues = [(cx + 0.7 * math.sin(phase * 2 + i * 1.3),
                    max(0.0, top + flame * 0.13 * math.sin(phase + i * 1.9)),
                    spread * (1 + 0.1 * math.sin(phase * 1.5 + i))) for i, (cx, top, spread) in enumerate(tongues)]

    def flame_char(x, y):
        best = None
        for cx, top, spread in tongues:
            if y < top or y > flame_bottom:
                continue
            t = (y - top) / (flame_bottom - top)
            half = spread * max(t, 0.0) ** 0.6
            if half <= 0:
                continue
            d = abs(x + 0.5 - cx) / half
            if d <= 1 and (best is None or d < best[0]):
                best = (d, t)
        if best is None:
            return None
        d, t = best
        if t < 0.1:
            return 'Q' if d > 0.4 else 'q'
        if d > 0.84:
            return 'Q' if t < 0.4 else 'q'
        if d > 0.6:
            return 'q' if t < 0.25 else 'f'
        if d > 0.3 or t < 0.4:
            return 'f' if t < 0.3 else 'F'
        return 'z' if t > 0.5 else 'F'

    flames = Layer(width, height)
    for y in range(flame_bottom + 1):
        for x in range(width):
            char = flame_char(x, y)
            if char:
                flames.put(x, y, char)
    logs = Layer(width, height)
    for index in range(layers):
        y1 = height - 1 - index * 5
        y0 = y1 - 4
        span = width - 4 - 2 * index
        x0 = (width - span) // 2
        x1 = x0 + span - 1
        if index % 2 == 0:
            for x in range(x0 + 1, x1):
                logs.put(x, y0, '0')
                logs.put(x, y0 + 1, 'l')
                logs.put(x, y0 + 2, 'd' if (x * 7 + index) % 6 == 0 else 'D')
                logs.put(x, y0 + 3, 'd')
                logs.put(x, y1, '0')
            for ex, side in ((x0, 1), (x1, -1)):
                logs.rect(ex, y0 + 1, ex, y0 + 3, '0')
                logs.put(ex + side, y0 + 1, 'x')
                logs.put(ex + side, y0 + 2, 'l')
                logs.put(ex + side, y0 + 3, 'x')
        else:
            for x in range(x0 + 5, x1 - 4):
                tall = 2 + round(1.6 * (1 + math.sin(x * 1.7 + index * 2.1)))
                near = abs(x - width / 2 + 0.5) < 3
                for dy in range(5):
                    char = 'zFfqQ'[min(4, dy + (0 if near else 1))] if dy <= tall else '1'
                    logs.put(x, y1 - dy, char)
            for ex in (x0, x1 - 4):
                logs.grid(['.000.', '0xlx0', '0lDl0', '0xlx0', '.000.'], ex, y0)
    image = flames.image
    image.alpha_composite(logs.image)
    front = Layer(width, height)
    for y in range(tower_top - 2, tower_top + 2):
        for x in range(width):
            char = flame_char(x, y)
            if char and (x + y) % 3:
                front.put(x, y, char)
    image.alpha_composite(front.image)
    spark_rng = random.Random(width)
    for _ in range(max(3, width // 6) if sparks else 0):
        x, y = spark_rng.randrange(width), spark_rng.randrange(max(1, flame // 2))
        if not image.getpixel((x, y))[3]:
            image.putpixel((x, y), hex_rgb(PALETTE[spark_rng.choice('Ff')]) + (255,))
    return image


def awning(layer, width, top, colors, wave=None):
    """Toldo listrado com babados; `wave` escolhe qual babado desce um pixel (o vento passando)."""
    layer.rect(0, top, width - 1, top, '0')
    for x in range(width):
        stripe = colors[0] if (x // 4) % 2 == 0 else colors[1]
        drop = 1 if wave is not None and (x // 4 + wave) % 4 == 0 else 0
        for y in range(top + 1, top + 7):
            layer.put(x, y, colors[2] if y == top + 1 and stripe == colors[0] else stripe)
        layer.put(x, top + 7, stripe if x % 4 in (1, 2) else '0')
        if x % 4 in (1, 2):
            if drop:
                layer.put(x, top + 8, stripe)
            layer.put(x, top + 8 + drop, '0')
        elif drop:
            layer.put(x, top + 8, '0')
    layer.rect(0, top, 0, top + 7, '0')
    layer.rect(width - 1, top, width - 1, top + 7, '0')


def booth_back(layer, width, base, inner_top):
    layer.rect(5, inner_top, width - 6, base - 18, '1')
    for px in (2, width - 5):
        layer.rect(px, inner_top, px + 2, base, 'D')
        layer.rect(px, inner_top, px, base, 'l')
        layer.rect(px - 1, inner_top, px - 1, base, '0')
        layer.rect(px + 3, inner_top, px + 3, base, '0')


def booth_counter(layer, width, base):
    layer.rect(0, base - 18, width - 1, base - 18, '0')
    layer.rect(0, base - 17, width - 1, base - 16, 'l')
    layer.rect(0, base - 15, width - 1, base - 15, '0')
    for y in range(base - 14, base):
        char = 'd' if (y - (base - 14)) % 4 == 3 else ('D' if (y // 4) % 2 else 'l')
        layer.rect(2, y, width - 3, y, char)
    layer.rect(1, base - 14, 1, base, '0')
    layer.rect(width - 2, base - 14, width - 2, base, '0')
    layer.rect(1, base, width - 2, base, '0')


def sign(layer, x0, x1, word, accent=None, heart=False):
    layer.rect(x0, 0, x1, 11, '0')
    layer.rect(x0 + 1, 1, x1 - 1, 10, 'x')
    layer.rect(x0 + 1, 10, x1 - 1, 10, 'D')
    text_width = len(word) * 4 - 1 + (6 if heart else 0)
    tx = x0 + (x1 - x0 + 1 - text_width) // 2
    layer.text(word, tx, 3, 'r', accent)
    if heart:
        layer.glyphs(HEART, tx + len(word) * 4 + 1, 3, 'H')
    for sx in (x0 + 4, x1 - 4):
        layer.rect(sx, 12, sx, 14, 'd')


def booth(kind, keeper=None):
    """Barraca em duas camadas (fundo e balcão), com o barraqueiro entre elas."""
    width, height = 48, 56
    base = height - 1
    back = Layer(width, height)
    if kind == 'beijo':
        sign(back, 8, 39, 'BEIJO', heart=True)
        awning(back, width, 15, 'RXr')
    else:
        sign(back, 4, 43, 'PESCARIA')
        awning(back, width, 15, 'JXj')
    booth_back(back, width, base, 24)
    if kind == 'beijo':
        for hx in range(9, 40, 6):
            back.put(hx, 25, 'd')
            back.rect(hx, 26, hx + 1, 26, 'H')
            back.put(hx, 27, 'h')
    image = back.image
    if keeper is not None:
        image.alpha_composite(keeper[0], keeper[1])
    front = Layer(width, height)
    booth_counter(front, width, base)
    if kind == 'beijo':
        front.glyphs(HEART, 21, base - 11, 'H')
        front.put(22, base - 10, 'W')
    else:
        front.rect(3, base - 17, width - 4, base - 16, 'N')
        for x in range(3, width - 3):
            front.put(x, base - 17, 'B' if x % 5 else 'b')
        for fx in (9, 19, 30, 38):
            front.put(fx, base - 16, 'K')
            front.put(fx + 1, base - 16, 'O')
    image.alpha_composite(front.image)
    return image


def stage():
    """Palco coberto com cortina de chita, placa de forró e lâmpadas no beiral."""
    width, height = 104, 72
    layer = Layer(width, height)
    base = height - 1
    floor = base - 14
    sign(layer, 36, 67, 'FORRO', accent=4)
    roof = 14
    for y in range(roof, roof + 9):
        inset = (roof + 8 - y) * 2
        for x in range(inset, width - inset):
            char = 'R' if ((x - inset) // 5) % 2 == 0 else 'A'
            layer.put(x, y, '0' if y == roof + 8 else char)
        layer.put(inset - 1, y, '0')
        layer.put(width - inset, y, '0')
    layer.rect(16, roof - 1, width - 17, roof - 1, '0')
    tile = sprites.FABRICS['chita']
    curtain = Layer(width, height)
    for y in range(roof + 9, floor):
        for x in range(6, width - 6):
            curtain.put(x, y, tile[y % len(tile)][x % len(tile[0])])
    layer.image.alpha_composite(tint(curtain.image, BACK_TINT, 0.35))
    for x in range(2, width - 2, 4):
        layer.put(x, roof + 9, 'd')
        layer.put(x, roof + 10, 'A')
        layer.put(x, roof + 11, 'z' if x % 8 else 'F')
    for px in (2, width - 6):
        layer.rect(px, roof + 9, px + 3, floor, 'D')
        layer.rect(px, roof + 9, px, floor, 'l')
        layer.rect(px - 1, roof + 9, px - 1, floor, '0')
        layer.rect(px + 4, roof + 9, px + 4, floor, '0')
    layer.rect(0, floor, width - 1, floor, '0')
    layer.rect(0, floor + 1, width - 1, floor + 2, 'l')
    layer.rect(0, floor + 3, width - 1, floor + 3, '0')
    for y in range(floor + 4, base):
        for x in range(1, width - 1):
            layer.put(x, y, 'd' if x % 8 == 0 else ('D' if y % 3 else 'U'))
    layer.rect(0, floor + 3, 0, base, '0')
    layer.rect(width - 1, floor + 3, width - 1, base, '0')
    layer.rect(0, base, width - 1, base, '0')
    return layer.image, floor


def ferris_wheel(radius=38):
    size = radius * 2 + 12
    height = size + radius // 2
    layer = Layer(size, height)
    cx = cy = size // 2
    base = height - 1
    for dx in (-radius // 2 - 2, radius // 2 + 2):
        layer.line(cx, cy, cx + dx, base, '0')
        layer.line(cx + 1, cy, cx + dx + 1, base, 's')
        layer.line(cx + 2, cy, cx + dx + 2, base, '0')
    for angle in range(0, 360, 30):
        a = math.radians(angle)
        layer.line(cx, cy, cx + radius * math.cos(a), cy + radius * math.sin(a), 's')
    for step in range(720):
        a = math.radians(step / 2)
        for r, char in ((radius + 1, '0'), (radius, 'S'), (radius - 1, 's'), (radius - 2, '0')):
            layer.put(cx + r * math.cos(a), cy + r * math.sin(a), char)
    for angle in range(0, 360, 15):
        a = math.radians(angle)
        layer.put(cx + radius * math.cos(a), cy + radius * math.sin(a), 'F')
    layer.rect(cx - 2, cy - 2, cx + 2, cy + 2, '0')
    layer.rect(cx - 1, cy - 1, cx + 1, cy + 1, 'A')
    for index, angle in enumerate(range(0, 360, 45)):
        a = math.radians(angle + 22)
        x, y = round(cx + radius * math.cos(a)), round(cy + radius * math.sin(a))
        color = 'RAJGHKPC'[index]
        layer.grid(['.0.', '.0.'], x - 1, y)
        layer.grid(['00000', '0' + color * 3 + '0', '0X' + color + 'X0', '0' + color * 3 + '0', '00000'], x - 2, y + 2)
    return layer.image


def greasy_pole(height=100):
    width = 16
    layer = Layer(width, height)
    cx = width // 2
    for y in range(12, height):
        layer.put(cx - 2, y, '0')
        layer.put(cx - 1, y, 'l' if y % 7 else 'x')
        layer.put(cx, y, 'd' if (y // 3) % 3 == 0 else 'D')
        layer.put(cx + 1, y, '1')
        layer.put(cx + 2, y, '0')
    layer.grid(['...0000...', '..0xAAx0..', '.0HHHHHH0.', '0xxxAAxxx0', '0xxAxxAxx0',
                '0xxxAAxxx0', '0xxxxxxxx0', '.0xxxxxx0.', '..000000..'], cx - 5, 2)
    return layer.image


def crate():
    layer = Layer(16, 10)
    layer.rect(0, 0, 15, 9, '0')
    layer.rect(1, 1, 14, 8, 'D')
    layer.rect(1, 1, 14, 1, 'l')
    layer.rect(1, 5, 14, 5, 'd')
    layer.line(1, 8, 14, 1, 'l')
    return layer.image


def hay_bale(rng):
    width, height = 20, 12
    layer = Layer(width, height)
    for y in range(1, height - 1):
        for x in range(1, width - 1):
            roll = rng.random()
            char = 'Y' if y < 3 else 'y'
            if roll < 0.18:
                char = 'o'
            elif roll < 0.35:
                char = 'Y'
            layer.put(x, y, char)
    for tx in (5, 14):
        layer.rect(tx, 1, tx, height - 2, 'd')
    image = outline(layer.image.crop((1, 1, width - 1, height - 1)))
    for x, y in ((0, 4), (19, 6), (4, 0), (15, 0)):
        image.putpixel((x, y), hex_rgb(PALETTE['Y']) + (255,))
    return image


def flag_mast(height=34, phase=None):
    """Mastro de bandeirinhas: poste com fitas coloridas descendo do topo."""
    layer = Layer(14, height)
    cx = 4
    for y in range(3, height):
        layer.put(cx - 1, y, '0')
        layer.put(cx, y, 'l')
        layer.put(cx + 1, y, 'D')
        layer.put(cx + 2, y, '0')
    layer.grid(['.00.', '0AA0', '0aA0', '.00.'], cx - 1, 0)
    for index, color in enumerate('RJGH'):
        for step in range(8 + index * 3):
            wave = 0 if phase is None else 0.9 * math.sin(phase + step * 0.45 + index) * step / 12
            layer.put(cx + 3 + step * 0.35 + index * 0.4 + wave, 4 + step, color)
    return layer.image


def dance_floor(width):
    """Tablado de madeira sobre a grama, onde a quadrilha dança."""
    layer = Layer(width, 4)
    layer.rect(0, 0, width - 1, 0, 'l')
    layer.rect(0, 1, width - 1, 2, 'D')
    for x in range(0, width, 6):
        layer.rect(x, 1, x, 2, 'd')
    layer.rect(0, 3, width - 1, 3, 'd')
    return outline(layer.image)


def bunting(layer, left, right, top, sag, phase, lamps=False, sway=None):
    colors = 'RAGJHKCP'
    mid = (left + right) / 2
    half = (right - left) / 2
    points = []
    for x in range(left, right + 1):
        t = (x - mid) / half
        y = round(top + sag * (1 - t * t))
        layer.put(x, y, 'd')
        points.append((x, y))
    if lamps:
        for x, y in points[2::6]:
            layer.put(x, y + 1, 'd')
            layer.rect(x - 1, y + 2, x, y + 3, 'A')
            layer.put(x - 1, y + 2, 'z')
        return
    for index, (x, y) in enumerate(points[3::8]):
        color = colors[(index + phase) % len(colors)]
        dark = {'R': 'r', 'A': 'a', 'G': 'g', 'J': 'j', 'H': 'h', 'K': 'k', 'C': 'J', 'P': 'i'}[color]
        shift = 0 if sway is None else 1.3 * math.sin(sway + index * 0.8)
        for dy in range(1, 7):
            ox = round(shift * dy / 6)
            for dx in range(-2, 3):
                if (dy == 5 and dx == 0) or (dy == 6 and dx in (-1, 0, 1)):
                    continue
                layer.put(x + dx + ox, y + dy, dark if dx == 2 or dy == 1 else color)


def pole(layer, x, top, bottom):
    for y in range(top, bottom + 1):
        layer.put(x - 1, y, '0')
        layer.put(x, y, 'l')
        layer.put(x + 1, y, 'D')
        layer.put(x + 2, y, '0')
        if (y - top) % 9 == 4:
            layer.rect(x, y, x + 1, y, 'd')
    layer.rect(x - 1, top - 1, x + 2, top - 1, '0')


def fireworks(layer, cx, cy, radius, colors, seed):
    rng = random.Random(seed)
    for ray in range(14):
        a = math.radians(ray * 360 / 14 + rng.uniform(-6, 6))
        length = radius * rng.uniform(0.75, 1.0)
        for step in range(2, int(length) + 1, 2):
            t = step / length
            char = colors[0] if t < 0.45 else colors[1] if t < 0.8 else colors[2]
            layer.put(cx + step * math.cos(a), cy + step * math.sin(a) * 0.9, char)
    layer.put(cx, cy, 'z')


def shadow(canvas, cx, y, width):
    dot = Image.new('RGBA', (1, 1), hex_rgb(PALETTE['v']) + (160,))
    for x in range(cx - width // 2, cx + width // 2 + 1):
        canvas.alpha_composite(dot, (x, y))


def firelight(canvas, cx, cy, radius, strength=0.38, exclude=None):
    warm = hex_rgb('#ffb347')
    px = canvas.load()
    for y in range(canvas.height):
        for x in range(canvas.width):
            r, g, b, a = px[x, y]
            if not a or (exclude and exclude[0] <= x <= exclude[2] and exclude[1] <= y <= exclude[3]):
                continue
            d = math.hypot(x - cx, (y - cy) * 1.4) / radius
            if d >= 1:
                continue
            k = strength * (1 - d) ** 2
            px[x, y] = (round(r + (warm[0] - r) * k), round(g + (warm[1] - g) * k),
                        round(b + (warm[2] - b) * k), a)


def holding(body, item, hand, pivot):
    """Compõe um item preso à âncora da mão; devolve a imagem e o deslocamento do corpo."""
    ix, iy = hand[0] - pivot[0], hand[1] - pivot[1]
    left, top = min(0, ix), min(0, iy)
    right = max(body.width, ix + item.width)
    bottom = max(body.height, iy + item.height)
    image = Image.new('RGBA', (right - left, bottom - top), (0, 0, 0, 0))
    image.alpha_composite(item, (ix - left, iy - top))
    image.alpha_composite(body, (-left, -top))
    return image, (-left, -top)


def playing(body, item, at):
    """Instrumento na frente do corpo; a imagem cresce se o instrumento passar da borda."""
    width = max(body.width, at[0] + item.width)
    image = Image.new('RGBA', (width, body.height), (0, 0, 0, 0))
    image.alpha_composite(body)
    image.alpha_composite(item, at)
    return image


def mandioca(fabric='xadrez-vermelho'):
    return holding(sprite(sprites.MANDIOCA, fabric), sprite(sprites.BANDEIRINHA), (1, 15), (6, 7))


def stand(canvas, image, x, ground, offset=(0, 0), shade_width=None):
    """Põe um personagem com os pés na linha do chão; x é a borda esquerda do corpo."""
    if shade_width:
        shadow(canvas, x + (image.width - offset[0]) // 2, ground, shade_width)
    paste(canvas, image, x - offset[0], ground - image.height + 1)


def compose_start(seed=11):
    """Início: Arraiá de Quintal. Só a anfitriã, uma fogueirinha e os dois enfeites iniciais."""
    rng = random.Random(seed)
    width, height, ground = 158, 100, 66
    canvas = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    back = Layer(width, height)
    pole(back, 27, ground - 38, ground)
    pole(back, 129, ground - 38, ground)
    bunting(back, 29, 129, ground - 36, 8, 1)
    canvas.alpha_composite(back.image)
    ground_image, _ = island(112, rng, depth=12)
    canvas.alpha_composite(ground_image, (22, ground - 1))
    details = Layer(width, height)
    grass_details(details, 23, 133, rng, ground)
    canvas.alpha_composite(details.image)

    slots = {}
    bale = hay_bale(rng)
    paste(canvas, bale, 32, ground - bale.height + 1)
    slots['lado-esq'] = (32, ground - bale.height + 1, 32 + bale.width, ground)
    host, offset = mandioca()
    stand(canvas, host, 60, ground, offset, 16)
    slots['quadrilha'] = (60 - offset[0], ground - host.height + 1, 60 - offset[0] + host.width, ground)
    fire = bonfire(width=18, layers=2, flame=13)
    fire_x, fire_y = 89, ground - fire.height + 1
    paste(canvas, fire, fire_x, fire_y)
    slots['fogueira'] = (fire_x, fire_y, fire_x + fire.width, ground)
    mast = flag_mast()
    paste(canvas, mast, 111, ground - mast.height + 1)
    slots['lado-dir'] = (111, ground - mast.height + 1, 111 + mast.width - 2, ground)
    slots['varal'] = (26, ground - 39, 132, ground - 26)
    slots['terreiro'] = (22, ground + 1, 22 + ground_image.width, ground + ground_image.height - 1)
    firelight(canvas, fire_x + 9, ground - 8, 40, 0.3, exclude=(fire_x, fire_y, fire_x + fire.width - 1, ground))
    return canvas, slots


def compose_end(seed=7):
    """Final: Maior São João do Mundo. Todas as posições ocupadas, cada personagem no seu papel."""
    rng = random.Random(seed)
    width, height, ground = 440, 196, 156
    canvas = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    slots = {}

    sky = Layer(width, height)
    fireworks(sky, 150, 16, 14, 'zHh', 1)
    fireworks(sky, 300, 12, 16, 'zCJ', 2)
    fireworks(sky, 392, 24, 10, 'zAa', 3)
    fireworks(sky, 40, 26, 9, 'zGg', 4)
    canvas.alpha_composite(sky.image)

    # Fundo do porte final: roda-gigante. Palco com o trio de forró.
    wheel = tint(ferris_wheel(38), BACK_TINT, 0.22)
    wx, wy = 22, ground - 6 - wheel.height + 1
    paste(canvas, wheel, wx, wy)
    slots['fundo'] = (wx, wy, wx + wheel.width, ground - 6)
    stage_image, floor = stage()
    sx, sy = 90, ground - 6 - stage_image.height + 1
    paste(canvas, tint(stage_image, BACK_TINT, 0.12), sx, sy)
    slots['palco'] = (sx, sy, sx + stage_image.width, ground - 6)
    stage_floor = sy + floor
    trio = [(sprites.CENOURA, 'chita', sprite(sprites.SANFONA), (2, 12), 102),
            (sprites.INHAME, 'xadrez-vermelho', sprite(sprites.ZABUMBA), (2, 14), 128),
            (sprites.BATATA, 'xadrez-azul', outline(sprite(sprites.TRIANGULO)), (10, 10), 154)]
    for grid, fabric, tool, at, x in trio:
        stand(canvas, playing(sprite(grid, fabric), tool, at), x, stage_floor)
    plateia = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    for index, x in enumerate(range(208, 318, 11)):
        grid = sprites.CAVALHEIRO if index % 2 else sprites.DAMA
        fabric = ['xadrez-azul', 'chita', 'xadrez-vermelho', 'chita-rosa'][index % 4]
        person = sprite(grid, fabric, flip=index % 3 == 0)
        paste(plateia, person, x, ground - 9 - person.height + 1 - (index % 2))
    canvas.alpha_composite(tint(plateia, BACK_TINT, 0.3))
    slots['plateia'] = (206, ground - 30, 320, ground - 8)

    varal = Layer(width, height)
    pole(varal, 10, 20, ground)
    pole(varal, 428, 20, ground)
    bunting(varal, 12, 428, 22, 16, 0)
    bunting(varal, 12, 428, 30, 12, 0, lamps=True)
    bunting(varal, 12, 428, 40, 12, 4)
    canvas.alpha_composite(varal.image)
    slots['varal'] = (9, 19, 431, 60)

    ground_image, _ = island(424, rng, depth=24)
    canvas.alpha_composite(ground_image, (8, ground - 1))
    details = Layer(width, height)
    grass_details(details, 9, 431, rng, ground)
    canvas.alpha_composite(details.image)
    slots['terreiro'] = (8, ground + 1, 8 + ground_image.width, ground + ground_image.height - 1)

    # Brinquedo: pau de sebo com a Paçoca subindo.
    pole_image = greasy_pole(104)
    px = 14
    paste(canvas, pole_image, px, ground - pole_image.height + 1)
    paste(canvas, sprite(sprites.PACOCA), px + 2, ground - 62)
    slots['brinquedo'] = (px, ground - pole_image.height + 1, px + pole_image.width, ground)

    # Barraca esquerda: Pescaria, com o Cachorro-Quente de pescador.
    fisher = sprite(sprites.CACHORRO)
    fishing = booth('pescaria', (fisher.crop((0, 0, 20, 12)), (14, 25)))
    bx, by = 32, ground - fishing.height + 1
    paste(canvas, fishing, bx, by)
    rod = Layer(width, height)
    rod.line(bx + 33, by + 28, bx + 42, by + 22, 'l')
    rod.line(bx + 42, by + 23, bx + 42, by + 38, 'x')
    canvas.alpha_composite(rod.image)
    slots['lado-esq'] = (bx, by, bx + fishing.width, ground)

    # Quadrilha no tablado: anfitriã, par e os casais de dançarinos.
    paste(canvas, dance_floor(210), 84, ground - 3)
    dance_ground = ground - 3
    couples = [(94, 'xadrez-azul', 'chita-rosa'), (124, 'chita', 'xadrez-vermelho'),
               (238, 'xadrez-vermelho', 'chita'), (266, 'chita-rosa', 'xadrez-azul')]
    for x, fabric_a, fabric_b in couples:
        stand(canvas, sprite(sprites.CAVALHEIRO, fabric_a), x, dance_ground, shade_width=8)
        stand(canvas, sprite(sprites.DAMA, fabric_b, flip=True), x + 13, dance_ground, shade_width=8)
    host, offset = mandioca()
    stand(canvas, host, 182, dance_ground, offset, 16)
    stand(canvas, sprite(sprites.MILHO), 209, dance_ground, shade_width=10)
    slots['quadrilha'] = (84, ground - 50, 296, ground)

    # Marcador da quadrilha: Pamonha no caixote, com megafone.
    box = crate()
    cx = 302
    paste(canvas, box, cx, ground - box.height + 1)
    stand(canvas, sprite(sprites.PAMONHA), cx, ground - box.height)
    paste(canvas, outline(sprite(sprites.MEGAFONE)), cx + 12, ground - box.height - 14)
    slots['marcador'] = (cx, ground - box.height - 20, cx + 22, ground)

    # Fogueira lendária com a Faísca de foguista.
    fire = bonfire(width=46, layers=6, flame=38)
    fire_x, fire_y = 324, ground - fire.height + 1
    paste(canvas, fire, fire_x, fire_y)
    paste(canvas, sprite(sprites.FAISCA), 366, ground - 40)
    slots['fogueira'] = (fire_x, fire_y, 378, ground)

    # Barraca direita: Beijo, com a Aipim de barraqueira.
    keeper = sprite(sprites.AIPIM, 'chita-rosa')
    kiss = booth('beijo', (keeper, (16, 22)))
    kx, ky = 382, ground - kiss.height + 1
    paste(canvas, kiss, kx, ky)
    slots['lado-dir'] = (kx, ky, kx + kiss.width, ground)

    firelight(canvas, fire_x + 23, ground - 20, 90, 0.34,
              exclude=(fire_x, fire_y, fire_x + fire.width - 1, ground))
    return canvas, slots
