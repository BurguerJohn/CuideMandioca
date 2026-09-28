"""Ícones das conquistas para o Steamworks (64x64): o ícone em pixel do jogo sobre uma placa de madeira.

Gera steam/conquistas/<API>.jpg (destravada) e <API>_bloqueada.jpg (cinza) a partir de src/festa-sprites.js.
Uso: npm run steam:icons   (py -3.12 art/conquistas_steam.py)
"""
import base64
import io
import json
import pathlib
import re

from PIL import Image, ImageOps

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'steam' / 'conquistas'
SIZE = 64

# Ícone e cor de fundo de cada conquista (ids de src/data.js).
ICONS = {
    'primeiro-passo': ('ui:rebolado', '#ff4f9e'),
    'mil': ('ui:animacao', '#ffd21e'),
    'quermesse': ('item:barraca-comidas', '#35a03a'),
    'cidade': ('ui:festa', '#3a6cf0'),
    'regional': ('ui:lotacao', '#9d5cf0'),
    'maior': ('item:coroa-milho', '#ee2f3c'),
    'primeira-prenda': ('ui:pescaria', '#3a6cf0'),
    'turma-completa': ('char:milho', '#35a03a'),
    'primeiro-role': ('ui:role', '#ff8a12'),
    'lendaria': ('ui:fogueira', '#ee2f3c'),
    'mira-de-ouro': ('ui:presente', '#ffd21e'),
    'estiloso': ('item:chapeu-palha', '#ff4f9e'),
    'correio': ('ui:carta', '#ee2f3c'),
    'atenciosa': ('item:espiga', '#ff8a12'),
    'seguranca': ('item:cadeia', '#9d5cf0'),
    'mao-boa': ('ui:argolas', '#35a03a'),
}
INK = (18, 9, 6, 255)
WOOD = (192, 122, 54, 255)
WOOD_DARK = (124, 66, 30, 255)


def api_name(id_):
    return re.sub(r'[^A-Z0-9]+', '_', id_.upper())


def load_icons():
    source = (ROOT / 'src' / 'festa-sprites.js').read_text(encoding='utf-8')
    bundle = json.loads(source[source.index('{'):source.rindex('}') + 1])
    icons = {}
    for key, entry in bundle['icons'].items():
        raw = base64.b64decode(entry['src'].split(',', 1)[1])
        icons[key] = Image.open(io.BytesIO(raw)).convert('RGBA')
    return icons


def outline(sprite):
    """Contorno escuro de 1 pixel em volta do desenho, como os ícones da placa do jogo."""
    w, h = sprite.size
    out = Image.new('RGBA', (w + 2, h + 2), (0, 0, 0, 0))
    alpha = sprite.split()[3]
    ink = Image.new('RGBA', sprite.size, INK)
    for dx in (0, 1, 2):
        for dy in (0, 1, 2):
            out.paste(ink, (dx, dy), alpha)
    out.paste(sprite, (1, 1), sprite)
    return out


def badge(sprite, color):
    image = Image.new('RGBA', (SIZE, SIZE), INK)
    image.paste(WOOD_DARK, (2, 2, SIZE - 2, SIZE - 2))
    image.paste(WOOD, (4, 4, SIZE - 4, SIZE - 4))
    image.paste(color, (7, 7, SIZE - 7, SIZE - 7))
    # Faixa de bandeirinhas no topo, como nas janelas do jogo.
    flags = ['#ee2f3c', '#ffd21e', '#35a03a', '#3a6cf0', '#ff4f9e', '#ff8a12']
    for i, flag in enumerate(flags):
        x = 9 + i * 8
        image.paste(flag, (x, 7, x + 6, 11))
        image.paste(flag, (x + 1, 11, x + 5, 12))
    art = outline(sprite)
    # Escala inteira (pixel nítido) que cabe na área abaixo das bandeirinhas: 46 x 44 pixels.
    scale = max(1, min(46 // art.width, 44 // art.height))
    art = art.resize((art.width * scale, art.height * scale), Image.NEAREST)
    if art.width > 46 or art.height > 44:
        art.thumbnail((46, 44), Image.NEAREST)
    image.alpha_composite(art, ((SIZE - art.width) // 2, 13 + (44 - art.height) // 2))
    return image.convert('RGB')


def main():
    icons = load_icons()
    OUT.mkdir(parents=True, exist_ok=True)
    for id_, (key, color) in ICONS.items():
        image = badge(icons[key], color)
        name = api_name(id_)
        image.save(OUT / f'{name}.jpg', quality=95)
        locked = ImageOps.grayscale(image).point(lambda v: int(v * 0.55))
        locked.convert('RGB').save(OUT / f'{name}_bloqueada.jpg', quality=95)
    sheet = Image.new('RGB', (SIZE * 8, SIZE * 4), (28, 26, 58))
    for i, id_ in enumerate(ICONS):
        name = api_name(id_)
        sheet.paste(Image.open(OUT / f'{name}.jpg'), ((i % 8) * SIZE, (i // 8) * 2 * SIZE))
        sheet.paste(Image.open(OUT / f'{name}_bloqueada.jpg'), ((i % 8) * SIZE, (i // 8) * 2 * SIZE + SIZE))
    sheet.save(OUT / '_todas.png')
    print(f'{len(ICONS) * 2} ícones em {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
