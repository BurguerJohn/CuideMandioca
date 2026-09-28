"""Gera as imagens do conceito do Arraiá: início e final do jogo, posições e elenco.

Uso: py -3.12 art/concept/gerar.py
Saídas nesta pasta:
- arraia-inicio.png / arraia-final.png: a festa sobre um desktop simulado, na escala 3x
- arraia-inicio-1x.png / arraia-final-1x.png: as cenas no tamanho real, fundo transparente
- arraia-posicoes.png: as posições da festa e o que ocupa cada uma
- arraia-elenco.png: personagens com o papel de cada um
"""

import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image, ImageDraw, ImageFilter, ImageFont

import sprites
from render import outline, sprite, upscale
from scene import (bonfire, booth, compose_end, compose_start, crate, ferris_wheel, flag_mast,
                   greasy_pole, hay_bale, mandioca, playing, stage)

HERE = Path(__file__).resolve().parent
FONTS = Path('C:/Windows/Fonts')

SLOT_INFO = {
    'varal': (1, 'Varal', 'bandeirinhas; no fim, varal triplo com lâmpadas'),
    'fundo': (2, 'Fundo do porte', 'cerca, arco de entrada, caixa-d\'água, roda-gigante'),
    'palco': (3, 'Palco', 'trio de forró: sanfona, zabumba e triângulo'),
    'lado-esq': (4, 'Lado esquerdo', 'um enfeite ou uma barraca, com barraqueiro'),
    'brinquedo': (5, 'Brinquedo', 'pau de sebo, argolas ou boca do palhaço'),
    'quadrilha': (6, 'Quadrilha', 'anfitriã, par e casais da lotação'),
    'marcador': (7, 'Marcador', 'quem grita os passos da quadrilha'),
    'fogueira': (8, 'Fogueira', 'cresce com o porte; o foguista cuida dela'),
    'lado-dir': (9, 'Lado direito', 'um enfeite ou uma barraca, com barraqueiro'),
    'plateia': (10, 'Plateia', 'convidados da lotação'),
    'terreiro': (11, 'Terreiro', 'o chão flutuante (item da loja)'),
}

ROLES = [
    ('Mandioca', 'Anfitriã', 'puxa a quadrilha; cada passo gera Animação'),
    ('Milho', 'Par da quadrilha', '+Rebolado: mais Animação por passo'),
    ('Cenoura', 'Sanfoneira', '+Ritmo: mais passos por segundo'),
    ('Inhame', 'Zabumbeiro', '+Resistência: mais passos antes de cansar'),
    ('Batata-Doce', 'Triângulo', '+Refresco: volta do descanso mais rápido'),
    ('Pamonha', 'Marcadora', 'grita “Olha a cobra!”: chance de passo crítico'),
    ('Faísca', 'Foguista', 'Labareda mais longa e mais frequente'),
    ('Cachorro-Quente', 'Pescador', 'prendas da Pescaria saem mais rápido'),
    ('Aipim', 'Barraqueira do Beijo', 'pedidos aparecem mais e pagam mais'),
    ('Paçoca', 'Pau de sebo', 'mais chance no minijogo de aposta'),
    ('Casais e plateia', 'Lotação', 'mais gente na festa, mais Animação'),
]

PORTES = [
    ('1 · Quintal', 'anfitriã, fogueirinha, varal, dois enfeites'),
    ('2 · Quermesse', '+ par, barraca com barraqueiro, primeiros casais'),
    ('3 · Festa da Cidade', '+ palco (um músico, depois o trio), segunda barraca'),
    ('4 · São João Regional', '+ marcador, foguista, plateia, fundo do porte'),
    ('5 · Maior São João', '+ brinquedo, lâmpadas, fogos, fogueira lendária'),
]

INK, SOFT, PAPER = (58, 36, 24), (128, 92, 60), (244, 231, 207)


def font(name, size):
    try:
        return ImageFont.truetype(str(FONTS / name), size)
    except OSError:
        return ImageFont.load_default()


def desktop(scene, scale=3, size=(1920, 1080)):
    width, height = size
    bar = 48
    back = Image.new('RGBA', size)
    draw = ImageDraw.Draw(back)
    stops = [(0.0, (36, 52, 102)), (0.55, (92, 72, 138)), (1.0, (226, 138, 110))]
    for y in range(height):
        t = y / (height - 1)
        for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
            if t0 <= t <= t1:
                k = (t - t0) / (t1 - t0)
                color = tuple(round(a + (b - a) * k) for a, b in zip(c0, c1))
        draw.line([(0, y), (width, y)], fill=color + (255,))
    bokeh = Image.new('RGBA', size, (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(bokeh)
    rng = random.Random(3)
    for _ in range(30):
        x, y, r = rng.randrange(width), rng.randrange(height - 200), rng.randrange(30, 130)
        bdraw.ellipse((x - r, y - r, x + r, y + r), fill=(255, 225, 200, rng.randrange(10, 28)))
    back.alpha_composite(bokeh.filter(ImageFilter.GaussianBlur(18)))

    shade = Image.new('RGBA', size, (0, 0, 0, 0))
    ImageDraw.Draw(shade).rounded_rectangle((96, 90, 716, 430), 12, fill=(0, 0, 0, 90))
    back.alpha_composite(shade.filter(ImageFilter.GaussianBlur(14)))
    draw = ImageDraw.Draw(back)
    draw.rounded_rectangle((90, 80, 710, 420), 10, fill=(250, 250, 252, 255))
    draw.rounded_rectangle((90, 80, 710, 116), 10, fill=(236, 237, 242, 255))
    draw.rectangle((90, 106, 710, 116), fill=(236, 237, 242, 255))
    draw.text((108, 89), 'relatorio-junho.txt', fill=(60, 64, 78), font=font('segoeui.ttf', 15))
    for i, x in enumerate((650, 674, 694)):
        draw.text((x, 87), '–□×'[i], fill=(90, 94, 108), font=font('segoeui.ttf', 16))
    line_rng = random.Random(5)
    for row in range(11):
        y = 140 + row * 24
        draw.rounded_rectangle((114, y, 114 + line_rng.randrange(180, 560), y + 8), 4, fill=(214, 217, 226))

    label = font('segoeui.ttf', 13)
    for i, (name, color) in enumerate([('Documentos', (240, 190, 90)), ('Fotos', (110, 180, 230)),
                                       ('Lixeira', (170, 176, 190))]):
        x, y = width - 120, 40 + i * 96
        draw.rounded_rectangle((x + 14, y, x + 62, y + 48), 8, fill=color + (255,))
        text_w = draw.textlength(name, font=label)
        draw.text((x + 38 - text_w / 2 + 1, y + 57), name, fill=(0, 0, 0, 140), font=label)
        draw.text((x + 38 - text_w / 2, y + 56), name, fill=(255, 255, 255), font=label)

    back.alpha_composite(Image.new('RGBA', (width, bar), (22, 24, 38, 232)), (0, height - bar))
    draw = ImageDraw.Draw(back)
    draw.line([(0, height - bar), (width, height - bar)], fill=(255, 255, 255, 40))
    center = width // 2
    slots = [center - 132 + i * 44 for i in range(7)]
    colors = [(120, 170, 255), None, (255, 196, 80), (90, 200, 140), (230, 110, 110), (170, 140, 230), None]
    for x, color in zip(slots, colors):
        if color:
            draw.rounded_rectangle((x, height - 38, x + 28, height - 10), 6, fill=color + (255,))
    head = sprite(sprites.MANDIOCA).crop((0, 0, 24, 20)).resize((29, 24), Image.NEAREST)
    back.alpha_composite(head, (slots[1] - 1, height - 40))
    draw.rounded_rectangle((slots[1] + 6, height - 6, slots[1] + 22, height - 3), 2, fill=(255, 196, 80))
    draw.ellipse((slots[6] + 2, height - 36, slots[6] + 26, height - 12), outline=(220, 224, 236), width=3)
    clock = font('segoeui.ttf', 13)
    draw.text((width - 92, height - 42), '20:31', fill=(240, 242, 250), font=clock)
    draw.text((width - 104, height - 24), '24/06/2026', fill=(200, 204, 218), font=clock)

    festa = upscale(scene, scale)
    back.alpha_composite(festa, (width - festa.width - 60, height - bar - festa.height - 6))
    return back


def badge(draw, x, y, number, color, fnt):
    draw.ellipse((x - 15, y - 15, x + 15, y + 15), fill=color, outline=(20, 12, 8), width=3)
    text = str(number)
    w = draw.textlength(text, font=fnt)
    draw.text((x - w / 2, y - 12), text, fill=(20, 12, 8), font=fnt)


def mark_slots(canvas, origin, scale, slots, fnt):
    overlay = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    palette = [(255, 210, 30), (80, 220, 255), (255, 110, 170), (150, 240, 90)]
    ox, oy = origin
    for index, (key, (x0, y0, x1, y1)) in enumerate(sorted(slots.items(), key=lambda kv: SLOT_INFO[kv[0]][0])):
        number = SLOT_INFO[key][0]
        color = palette[index % len(palette)]
        box = (ox + x0 * scale, oy + y0 * scale, ox + x1 * scale, oy + y1 * scale)
        draw.rectangle(box, outline=color + (255,), width=3, fill=color + (28,))
    canvas.alpha_composite(overlay)
    draw = ImageDraw.Draw(canvas)
    for index, (key, (x0, y0, x1, y1)) in enumerate(sorted(slots.items(), key=lambda kv: SLOT_INFO[kv[0]][0])):
        color = palette[index % len(palette)]
        badge(draw, ox + x0 * scale + 4, oy + y0 * scale + 4, SLOT_INFO[key][0], color, fnt)


def positions(start, start_slots, end, end_slots):
    width, height = 1920, 1760
    sheet = Image.new('RGBA', (width, height), (28, 26, 40, 255))
    draw = ImageDraw.Draw(sheet)
    title, head, body, small = (font('segoeuib.ttf', 34), font('seguisb.ttf', 22),
                                font('segoeui.ttf', 18), font('segoeuib.ttf', 17))
    light, dim = (246, 238, 222), (190, 180, 200)
    draw.text((60, 36), 'Arraiá · posições da festa', fill=light, font=title)
    draw.text((60, 84), 'Cada posição aceita um item de cada vez; trocar o item troca o desenho. '
              'Os números são os mesmos no início e no final.', fill=dim, font=body)

    draw.text((60, 140), 'Início · Arraiá de Quintal', fill=light, font=head)
    sheet.alpha_composite(upscale(start, 4), (40, 170))
    mark_slots(sheet, (40, 170), 4, start_slots, small)
    y = 200
    draw.text((720, 170), 'Porte do arraiá: o que cada um libera', fill=light, font=head)
    for name, text in PORTES:
        y += 40
        draw.text((720, y), name, fill=(255, 210, 30), font=small)
        draw.text((940, y - 1), text, fill=dim, font=body)
    y += 70
    draw.text((720, y), 'Lado esquerdo e lado direito', fill=light, font=head)
    draw.text((720, y + 36), 'No início recebem enfeites (Fardo de Feno, Mastro de Bandeirinhas).', fill=dim, font=body)
    draw.text((720, y + 62), 'Com o porte, recebem barracas (Pescaria, Beijo, Pamonha, Cadeia…),', fill=dim, font=body)
    draw.text((720, y + 88), 'e cada barraca tem um barraqueiro com papel próprio.', fill=dim, font=body)

    draw.text((60, 640), 'Final · Maior São João do Mundo', fill=light, font=head)
    sheet.alpha_composite(upscale(end, 4), (80, 680))
    mark_slots(sheet, (80, 680), 4, end_slots, small)

    y0 = 1480
    draw.text((60, y0), 'Posições', fill=light, font=head)
    for index, key in enumerate(sorted(SLOT_INFO, key=lambda k: SLOT_INFO[k][0])):
        number, name, text = SLOT_INFO[key]
        col, row = divmod(index, 6)
        x, y = 60 + col * 900, y0 + 40 + row * 36
        badge(draw, x + 14, y + 12, number, (255, 210, 30), small)
        draw.text((x + 40, y), name, fill=light, font=small)
        draw.text((x + 200, y - 1), text, fill=dim, font=body)
    return sheet


def cast_sheet():
    width, height = 1920, 1000
    sheet = Image.new('RGBA', (width, height), PAPER + (255,))
    draw = ImageDraw.Draw(sheet)
    title, name_font, role_font, note_font = (font('segoeuib.ttf', 34), font('seguisb.ttf', 20),
                                              font('segoeuib.ttf', 15), font('segoeui.ttf', 14))
    draw.text((48, 30), 'Arraiá · elenco e papéis', fill=INK, font=title)
    draw.text((48, 76), 'Cada personagem tem um posto na festa e um efeito no jogo. '
              'Sem posto, ele só vira convidado na plateia.', fill=SOFT, font=note_font)

    def place(image, factor, x, bottom, name, role, effect):
        big = upscale(image, factor)
        sheet.alpha_composite(big, (x, bottom - big.height))
        cx = x + big.width / 2
        for text, fnt, color, dy in ((name, name_font, INK, 10), (role, role_font, (190, 60, 40), 36),
                                     (effect, note_font, SOFT, 58)):
            w = draw.textlength(text, font=fnt)
            draw.text((cx - w / 2, bottom + dy), text, fill=color, font=fnt)

    effects = {name: (role, effect) for name, role, effect in ROLES}
    host, _ = mandioca()
    row_a, row_b = 430, 830
    place(host, 7, 60, row_a, 'Mandioca', *effects['Mandioca'])
    place(sprite(sprites.MILHO), 7, 380, row_a, 'Milho', *effects['Milho'])
    trio = [(sprites.CENOURA, 'chita', sprite(sprites.SANFONA), (2, 12), 'Cenoura'),
            (sprites.INHAME, 'xadrez-vermelho', sprite(sprites.ZABUMBA), (2, 14), 'Inhame'),
            (sprites.BATATA, 'xadrez-azul', outline(sprite(sprites.TRIANGULO)), (10, 10), 'Batata-Doce')]
    for index, (grid, fabric, tool, at, name) in enumerate(trio):
        place(playing(sprite(grid, fabric), tool, at), 7, 660 + index * 300, row_a, name, *effects[name])
    pamonha = playing(sprite(sprites.PAMONHA), outline(sprite(sprites.MEGAFONE)), (12, 6))
    place(pamonha, 7, 1560, row_a, 'Pamonha', *effects['Pamonha'])

    place(sprite(sprites.FAISCA), 7, 90, row_b, 'Faísca', *effects['Faísca'])
    place(sprite(sprites.CACHORRO), 7, 360, row_b, 'Cachorro-Quente', *effects['Cachorro-Quente'])
    place(sprite(sprites.AIPIM, 'chita-rosa'), 7, 700, row_b, 'Aipim', *effects['Aipim'])
    place(sprite(sprites.PACOCA), 7, 990, row_b, 'Paçoca', *effects['Paçoca'])
    couple = Image.new('RGBA', (26, 18), (0, 0, 0, 0))
    couple.alpha_composite(sprite(sprites.CAVALHEIRO, 'xadrez-azul'), (0, 0))
    couple.alpha_composite(sprite(sprites.DAMA, 'chita-rosa', flip=True), (13, 0))
    place(couple, 7, 1300, row_b, 'Casais e plateia', *effects['Casais e plateia'])
    fires = Image.new('RGBA', (104, 68), (0, 0, 0, 0))
    for x, (w, layers, flame) in zip((0, 24, 58), ((18, 2, 13), (30, 4, 22), (46, 6, 38))):
        image = bonfire(w, layers, flame)
        fires.alpha_composite(image, (x, 68 - image.height))
    place(fires, 3, 1570, row_b, 'Fogueira', 'cresce com o porte', 'de quintal a lendária')
    return sheet


def main():
    start, start_slots = compose_start()
    end, end_slots = compose_end()
    start.save(HERE / 'arraia-inicio-1x.png')
    end.save(HERE / 'arraia-final-1x.png')
    desktop(start).convert('RGB').save(HERE / 'arraia-inicio.png')
    desktop(end).convert('RGB').save(HERE / 'arraia-final.png')
    positions(start, start_slots, end, end_slots).convert('RGB').save(HERE / 'arraia-posicoes.png')
    cast_sheet().convert('RGB').save(HERE / 'arraia-elenco.png')
    print('Imagens geradas em', HERE)


if __name__ == '__main__':
    main()
