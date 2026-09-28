"""Funções de desenho do conceito: grades, tecidos, contorno e ampliação."""

from PIL import Image

from sprites import PALETTE, FABRICS

KEYS = {'#': 0.3, '+': 0.0, '-': -0.42}
SHADOW = '#2a1026'


def hex_rgb(value):
    value = value.lstrip('#')
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def shade(rgb, amount):
    if amount >= 0:
        return tuple(round(c + (255 - c) * amount) for c in rgb)
    dark = hex_rgb(SHADOW)
    return tuple(round(c + (d - c) * -amount) for c, d in zip(rgb, dark))


def grid_lines(text):
    lines = [line for line in text.strip('\n').split('\n')]
    width = len(lines[0])
    for number, line in enumerate(lines):
        if len(line) != width:
            raise ValueError(f'linha {number} tem {len(line)} colunas, esperado {width}: {line!r}')
    return lines


def sprite(text, fabric='xadrez-vermelho', flip=False):
    """Converte uma grade em imagem RGBA; as cores-chave viram o tecido."""
    lines = grid_lines(text)
    tile = FABRICS[fabric]
    image = Image.new('RGBA', (len(lines[0]), len(lines)), (0, 0, 0, 0))
    for y, line in enumerate(lines):
        for x, char in enumerate(line):
            if char == '.':
                continue
            if char in KEYS:
                base = hex_rgb(PALETTE[tile[y % len(tile)][x % len(tile[0])]])
                rgb = shade(base, KEYS[char])
            else:
                rgb = hex_rgb(PALETTE[char])
            image.putpixel((x, y), rgb + (255,))
    return image.transpose(Image.FLIP_LEFT_RIGHT) if flip else image


def outline(image, color='0'):
    """Contorna por fora os pixels opacos (4 vizinhos)."""
    rgb = hex_rgb(PALETTE[color]) + (255,)
    out = Image.new('RGBA', (image.width + 2, image.height + 2), (0, 0, 0, 0))
    out.paste(image, (1, 1))
    source = out.copy()
    px = source.load()
    for y in range(out.height):
        for x in range(out.width):
            if px[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < out.width and 0 <= ny < out.height and px[nx, ny][3]:
                    out.putpixel((x, y), rgb)
                    break
    return out


def paste(canvas, image, x, y):
    canvas.alpha_composite(image, (x, y))


def upscale(image, factor):
    return image.resize((image.width * factor, image.height * factor), Image.NEAREST)


def on_background(image, color):
    back = Image.new('RGBA', image.size, hex_rgb(color) + (255,))
    back.alpha_composite(image)
    return back


def tint(image, color, amount):
    """Mistura os pixels opacos com uma cor; usado para empurrar o fundo para trás."""
    target = hex_rgb(color)
    out = image.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a:
                px[x, y] = (round(r + (target[0] - r) * amount), round(g + (target[1] - g) * amount),
                            round(b + (target[2] - b) * amount), a)
    return out
