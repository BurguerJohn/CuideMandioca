"""Animações da turma, da multidão e dos enfeites da festa.

Cada função devolve a lista de quadros (imagens RGBA do mesmo tamanho) de um sprite. As grades vêm de
sprites.py; braços, baquetas, argolas e bichinhos são desenhados por cima, quadro a quadro.
"""

import math

from PIL import Image

import sprites
from render import hex_rgb, outline, sprite
from scene import HEART, Layer, hay_bale
from sprites import PALETTE


def blank(width, height):
    return Image.new('RGBA', (width, height), (0, 0, 0, 0))


def place(frame, image, x, y):
    """Cola a imagem no quadro, cortando o que passar das bordas."""
    left, top = max(0, -x), max(0, -y)
    right, bottom = min(image.width, frame.width - x), min(image.height, frame.height - y)
    if right > left and bottom > top:
        frame.alpha_composite(image.crop((left, top, right, bottom)), (x + left, y + top))
    return frame


def edit(grid, changes):
    """Troca pixels de uma grade: changes = {(x, y): letra}."""
    rows = [list(row) for row in grid.strip('\n').split('\n')]
    for (x, y), char in changes.items():
        rows[y][x] = char
    return '\n'.join(''.join(row) for row in rows)


def strokes(width, height, lines, dots=()):
    """Braços, baquetas e cordinhas: linhas de 1 pixel com contorno, do mesmo tamanho do quadro."""
    layer = Layer(width + 2, height + 2)
    for points, color in lines:
        for (x0, y0), (x1, y1) in zip(points, points[1:]):
            layer.line(x0 + 1, y0 + 1, x1 + 1, y1 + 1, color)
    for rows, x, y in dots:
        layer.grid(rows, x + 1, y + 1)
    return outline(layer.image).crop((2, 2, width + 2, height + 2))


def wiggle(image, pivot, shift):
    """Balanço de vento: as linhas acima do pivô andam de lado, mais quanto mais alto."""
    out = blank(image.width, image.height)
    for y in range(image.height):
        dx = round(shift * max(0, pivot - y) / pivot)
        row = image.crop((0, y, image.width, y + 1))
        place(out, row, dx, y)
    return out


def lift_columns(image, x0, x1, y0, y1):
    """Levanta um pedaço (um pé, por exemplo) um pixel para cima."""
    out = image.copy()
    part = image.crop((x0, y0, x1, y1))
    clear = blank(x1 - x0, y1 - y0)
    out.paste(clear, (x0, y0))
    out.alpha_composite(part, (x0, y0 - 1))
    return out


# --- Turma ------------------------------------------------------------------------------------

def sanfona(bellows, press):
    """Sanfona com o fole em `bellows` gomos; `press` alterna os botões apertados."""
    rows = []
    for y in range(8):
        if y in (0, 7):
            rows.append('0' * (7 + bellows))
            continue
        left = '0lD0' if y < 6 else '0dD0'
        light = y % 2 == 1
        fold = ''.join(('R' if light else 'r') if i % 2 == 0 else 'X' for i in range(bellows))
        if y == 6:
            keys = '0d0'
        else:
            pressed = (y + press) % 2 == 0
            keys = '0e0' if pressed else '090'
        rows.append(left + fold + keys)
    return sprite('\n'.join(rows))


def cenoura():
    """Sanfoneira: o fole abre e fecha, os dedos correm nos botões e o corpo acompanha."""
    body = sprite(sprites.CENOURA, 'chita')
    frames = []
    for index, bellows in enumerate((5, 4, 3, 2, 3, 4)):
        bob = 1 if bellows <= 3 else 0
        frame = blank(18, 25)
        place(frame, body, 1, 1 + bob)
        box = sanfona(bellows, index)
        sx, sy = 15 - box.width, 13 + bob
        place(frame, box, sx, sy)
        hands = strokes(18, 25, [], [(['OK', 'Kk'], sx - 1, sy + 3), (['OK', 'Kk'], sx + box.width - 2, sy + 2 + index % 2)])
        frame.alpha_composite(hands)
        frames.append(frame)
    return frames


def inhame():
    """Zabumbeiro: levanta a maceta, desce no couro (que brilha) e o bacalhau responde no aro."""
    body = sprite(sprites.INHAME, 'xadrez-vermelho')
    drum = sprite(sprites.ZABUMBA)
    flash = sprite(sprites.ZABUMBA.replace('X', 'z').replace('x', 'F'))
    poses = [  # cabeça da maceta, bacalhau batendo, batida no couro, quique do corpo
        ((17, 4), False, False, 0), ((18, 10), True, False, 0), ((12, 15), False, True, 1), ((18, 9), True, False, 0)]
    frames = []
    for head, tap, hit, bob in poses:
        frame = blank(20, 26)
        place(frame, body, 0, 2 + bob)
        place(frame, flash if hit else drum, 2, 16)
        hand = (14, 13 + bob)
        tip = (2, 19) if tap else (0, 16)
        sticks = strokes(20, 26, [([hand, head], 'l'), ([(3, 14 + bob), tip], 'D')],
                         [(['XX', 'XX'], head[0] - 1, head[1] - 1), (['43', '32'], hand[0] - 1, hand[1] - 1),
                          (['43', '32'], 2, 13 + bob)])
        frame.alpha_composite(sticks)
        if hit:
            burst = Layer(20, 26)
            for x, y in ((9, 13), (15, 13), (8, 16), (16, 16)):
                burst.put(x, y, 'z')
            frame.alpha_composite(burst.image)
        frames.append(frame)
    return frames


def batata():
    """Triângulo: a vareta bate dos dois lados de dentro, o ferro balança e brilha a cada ding."""
    body = sprite(sprites.BATATA, 'xadrez-azul')
    triangle = outline(sprite(sprites.TRIANGULO))
    frames = []
    for index in range(4):
        ding = index % 2 == 1
        swing = (0, 1, 0, -1)[index]
        frame = blank(24, 25)
        place(frame, body, 0, 1 - (1 if ding else 0))
        tx, ty = 12 + swing, 10
        place(frame, triangle, tx, ty)
        inside = (tx + (5 if ding else 3), ty + 5)
        grip = (inside[0] - 5, inside[1] + 4)
        arms = strokes(24, 25, [([(tx + 4, ty - 1), (tx + 4, ty - 3)], 'x'), ([inside, grip], 'S')],
                       [(['PP', 'Pi'], tx + 3, ty - 4), (['PP', 'Pi'], grip[0] - 1, grip[1])])
        frame.alpha_composite(arms)
        if ding:
            sparkle = Layer(24, 25)
            sx = tx + 9 if index == 1 else tx - 1
            sparkle.grid(['.9.', '9z9', '.9.'], sx, ty - 2)
            frame.alpha_composite(sparkle.image)
        frames.append(frame)
    return frames


def pamonha():
    """Marcadora da quadrilha: grita no megafone, as ondas crescem e ela pula no “Anarriê!”."""
    body = sprite(sprites.PAMONHA)
    horn = outline(sprite(sprites.MEGAFONE))
    poses = [(3, 10, 0, False), (2, 8, 1, False), (1, 7, 2, True), (2, 8, 3, False)]
    frames = []
    for top, horn_y, waves, pointing in poses:
        frame = blank(30, 24)
        place(frame, body, 0, top)
        place(frame, horn, 12, horn_y)
        cy = horn_y + 3
        arcs = Layer(30, 24)
        for n in range(waves):
            x0 = 22 + n * 3
            for x, y in ((x0, cy - 2 - n // 2), (x0 + 1, cy - 1), (x0 + 1, cy), (x0 + 1, cy + 1), (x0, cy + 2 + n // 2)):
                arcs.put(x, y, 'X' if n < 2 else 'x')
        frame.alpha_composite(arcs.image)
        hands = [(['Gg', 'gv'], 11, horn_y + 3)]
        lines = []
        if pointing:
            lines.append(([(3, top + 11), (1, top + 6), (1, top + 3)], 'G'))
            hands.append((['GG', 'Gg'], 0, top + 1))
        frame.alpha_composite(strokes(30, 24, lines, hands))
        frames.append(frame)
    return frames


FIRE_TIPS = {
    'meio': ['.....q.....', '....qfq....', '...qfFfq...'],
    'esquerda': ['....q......', '....qfq....', '...qfFfq...'],
    'direita': ['......q....', '....qfq....', '...qfFfq...'],
    'alta': ['.....q.....', '.....q.....', '....qfq....', '...qfFfq...'],
}


def faisca():
    """Foguista: a chama tremula para os lados, estica, acende mais forte e pisca."""
    rows = sprites.FAISCA.strip('\n').split('\n')
    bright = {'F': 'f', 'f': 'q', 'z': 'F'}
    plan = [('meio', False, False), ('alta', False, False), ('esquerda', True, False), ('meio', True, True),
            ('direita', False, False), ('alta', True, False)]
    frames = []
    for tip, hot, blink in plan:
        grid = FIRE_TIPS[tip] + rows[3:]
        if blink:
            grid[len(FIRE_TIPS[tip]) + 2] = grid[len(FIRE_TIPS[tip]) + 2].replace('e', 'z')
        image = sprite('\n'.join(grid))
        if hot:
            image = recolor(image, bright)
        frames.append(place(blank(11, 15), image, 0, 15 - image.height))
    return frames


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


def small_ring(edge, color='R'):
    rows = ['RRRRR'] if edge else ['.RRR.', 'R...R', '.RRR.']
    return outline(sprite('\n'.join(row.replace('R', color) for row in rows)))


def pacoca():
    """Argoleira atrás do balcão: joga a argola pro alto, a argola gira e ela pega de volta."""
    blink_grid = edit(sprites.PACOCA, {(2, 3): 'T', (3, 3): 'T', (7, 3): 'T', (8, 3): 'T'})
    look_up = edit(sprites.PACOCA, {(2, 3): 'e', (3, 3): 'e', (7, 3): 'e', (8, 3): 'e', (2, 4): 'T', (3, 4): 'T',
                                    (7, 4): 'T', (8, 4): 'T'})
    width, height = 18, 24
    # (corpo, mão, argola (x, y) ou None, argola de lado)
    plan = [('normal', 'baixo', (15, 18), False), ('normal', 'alto', (15, 11), False), ('olha', 'alto', (15, 6), True),
            ('olha', 'alto', (15, 1), False), ('olha', 'alto', (15, 5), True), ('normal', 'alto', (15, 11), False),
            ('normal', 'baixo', (15, 18), False), ('normal', 'baixo', (15, 18), False),
            ('normal', 'baixo', (15, 18), False), ('pisca', 'baixo', (15, 18), False),
            ('normal', 'baixo', (15, 18), False), ('normal', 'baixo', (15, 18), False)]
    grids = {'normal': sprites.PACOCA, 'olha': look_up, 'pisca': blink_grid}
    frames = []
    for mood, hand, ring, edge in plan:
        frame = blank(width, height)
        place(frame, sprite(grids[mood]), 2, 11)
        hx, hy = (14, 17) if hand == 'baixo' else (14, 12)
        frame.alpha_composite(strokes(width, height, [([(12, 17), (hx, hy)], 'T')], [(['TT', 'TU'], hx, hy)]))
        image = small_ring(edge)
        place(frame, image, ring[0] - image.width // 2, ring[1] - image.height // 2)
        frames.append(frame)
    return frames


def aipim():
    """Barraqueira do Beijo: pisca, faz biquinho e manda beijo."""
    rows = sprites.AIPIM
    blink = edit(rows, {(6, 7): '6', (9, 7): '6'})
    kiss = edit(rows, {(6, 7): '6', (9, 7): '6', (7, 9): '6', (8, 9): 'n'})
    plan = [(rows, 0), (rows, 0), (blink, 0), (rows, 0), (kiss, 1), (kiss, 1)]
    return [place(blank(16, 17), sprite(grid, 'chita-rosa').crop((0, 0, 16, 16)), 0, 1 - dy) for grid, dy in plan]


def crianca(fabric, dress=lambda grid: grid):
    """Criança correndo: pernas abertas no chão, pernas juntas um pixel acima (o pulinho da corrida). `dress` troca
    as cores do chapéu (art/exportar.py, dressed)."""
    return [place(blank(10, 14), sprite(dress(sprites.CRIANCA), fabric), 0, 1),
            place(blank(10, 14), sprite(dress(sprites.CRIANCA_PASSO), fabric), 0, 0)]


def pipoca():
    """Pipoqueira atrás do balcão: uma caixinha listrada de vermelho e creme com rosto, cheia de pipoca que estoura."""
    frames = []
    # (pipoca que pula, quanto sobe, piscando)
    plan = [(None, 0, False), (3, 1, False), (3, 3, False), (4, 3, False), (4, 1, False), (None, 0, False),
            (5, 2, False), (5, 3, False), (None, 0, True), (None, 0, False)]
    puffs = [(4, 4, 2), (8, 3, 2), (12, 4, 2), (6, 5, 2), (10, 5, 2), (3, 6, 1), (13, 6, 1), (8, 5, 3)]
    for jumper, rise, blink in plan:
        layer = Layer(17, 21)
        # A caixa: trapézio com listras verticais, borda de cima mais escura.
        for y in range(7, 20):
            half = 6 + (y - 7) // 7
            for x in range(8 - half, 8 + half + 1):
                layer.put(x, y, 'R' if ((x - (8 - half)) // 3) % 2 == 0 else 'X')
        layer.rect(1, 7, 15, 7, 'r')
        # Rosto no painel do meio.
        layer.rect(5, 9, 11, 15, 'X')
        eye = '6' if blink else 'e'
        layer.put(6, 10, eye)
        layer.put(10, 10, eye)
        if not blink:
            layer.put(6, 11, 'e')
            layer.put(10, 11, 'e')
        layer.put(5, 12, 'c')
        layer.put(11, 12, 'c')
        layer.rect(7, 13, 9, 13, 'm')
        layer.put(8, 14, 'n')
        # Pipocas: bolinhas creme com brilho no alto, manteiga embaixo e grãos amarelos; uma dá o pulinho.
        for index, (px, py, radius) in enumerate(puffs):
            lift = rise if index == jumper else 0
            for y in range(-radius, radius + 1):
                for x in range(-radius, radius + 1):
                    if x * x + y * y > radius * radius + 1:
                        continue
                    if x + y >= radius:
                        color = 'O'
                    elif x <= -1 and y <= -1:
                        color = 'z'
                    elif (x * 3 + y * 5 + index) % 7 == 0:
                        color = 'F'
                    else:
                        color = 'X'
                    layer.put(px + x, py + y - lift, color)
        frames.append(outline(layer.image))
    return frames


def amendoim(step_frames=4):
    """Ambulante: um amendoim com cesta de pé-de-moleque no braço; anda com um balancinho e às vezes acena."""
    rows = [
        '...00000...',
        '..0TTTTT0..',
        '.0TxTTTxT0.',
        '.0T9eTT9eT0',
        '.0TeeTTeeT0',
        '.0TcTmmTcT0',
        '..0TTnnT0..',
        '..0TxTTx0..',
        '.0TTTTTTT0.',
        '.0TxTTTTx0.',
        '..0TTTTT0..',
        '...00000...',
    ]
    frames = []
    for index in range(step_frames):
        bob = (0, 1, 0, 1)[index % 4]
        layer = Layer(16, 22)
        layer.grid(rows, 2, 6 + bob)
        # Pezinhos alternando.
        left, right = ((2, 0), (0, 0), (0, 2), (0, 0))[index % 4]
        layer.rect(4, 18 + bob, 5, 19 + bob - left // 2, 'd')
        layer.rect(9, 18 + bob, 10, 19 + bob - right // 2, 'd')
        layer.rect(3, 20, 6, 20, 'D')
        layer.rect(8, 20, 11, 20, 'D')
        # Chapeuzinho de palha.
        layer.grid(['..YYYYY..', '.YYyYYyY.', 'YYYYYYYYY'], 3, 3 + bob)
        # Cesta no braço (direita): alça e pé-de-moleque.
        layer.line(12, 12 + bob, 14, 13 + bob, 'o')
        layer.rect(12, 14 + bob, 15, 17 + bob, 'l')
        layer.rect(12, 14 + bob, 15, 14 + bob, 'D')
        layer.put(13, 13 + bob, 'K')
        layer.put(14, 13 + bob, 'A')
        frames.append(outline(layer.image))
    return frames


def sopinha():
    """Sopinha: sentado (fungando e piscando), no ar do pulinho e deitado. A festa escolhe o quadro pela pose."""
    rows = sprites.SOPINHA
    funga = edit(rows, {(23, 5): 'W', (22, 5): 'W', (23, 6): 'L', (22, 6): 'V', (22, 7): 'V'})
    pisca = edit(rows, {(19, 3): 'E', (20, 3): 'E', (19, 4): 'e', (20, 4): 'e'})
    orelha = edit(rows, {(14, 9): 'W', (15, 9): 'L', (18, 9): 'M', (15, 10): 'W', (16, 10): 'L', (17, 10): 'M'})
    poses = [(rows, 1), (funga, 1), (pisca, 1), (orelha, 1), (sprites.SOPINHA_PULO, 0), (sprites.SOPINHA_DEITADO, 0)]
    frames = []
    for grid, x in poses:
        image = outline(sprite(grid))
        frames.append(place(blank(28, 15), image, x, 15 - image.height))
    return frames


def cachorro():
    """Pescador: balança, pisca e lambe os beiços esperando o peixe."""
    rows = sprites.CACHORRO
    blink = edit(rows, {(5, 3): 'R', (6, 3): 'R', (10, 3): 'R', (11, 3): 'R'})
    tongue = edit(rows, {(8, 5): 'n', (8, 6): 'n'})
    plan = [(rows, 0), (rows, -1), (blink, 0), (tongue, -1)]
    return [place(blank(20, 13), sprite(grid).crop((0, 0, 20, 12)), 0, 1 + dy) for grid, dy in plan]


def keeper(grid, fabric, eyes):
    """Barraqueiros de balcão: sobem e descem e piscam de vez em quando."""
    blink = edit(grid, {xy: '6' for xy in eyes})
    plan = [(grid, 0), (grid, -1), (grid, 0), (grid, -1), (blink, 0), (grid, -1)]
    return [place(blank(12, 13), sprite(g, fabric).crop((0, 0, 12, 12)), 0, 1 + dy) for g, dy in plan]


def penetra():
    """Penetra de óculos escuros: passo de fininho, com o brilho correndo na lente."""
    frames = []
    for index in range(4):
        grid = sprites.PENETRA[index % 2].strip('\n').split('\n')
        row = list(grid[5])
        for x in (3, 4, 8, 9):
            if row[x] in 'b9':
                row[x] = 'e'
        glint = (index % 4) + 3 if index < 3 else None
        if glint is not None:
            row[glint] = '9'
            row[glint + 5] = '9'
        grid[5] = ''.join(row)
        image = outline(sprite('\n'.join(grid)))
        frames.append(place(blank(16, 18), image, 0, 1 - (index % 2)))
    return frames


# --- Multidão ---------------------------------------------------------------------------------

ARMS = {  # braço esquerdo em coordenadas do corpo (o direito é espelhado)
    'baixo': [(0, 9), (0, 11)],
    'alto': [(0, 9), (-1, 8), (-1, 4)],
    'aberto': [(0, 9), (-1, 11)],
    'palma': [(1, 10), (4, 9)],
}
def _tres(points):
    """Todo braço com 3 pontos (ombro, cotovelo, mão), para dar para misturar duas poses."""
    if len(points) == 3:
        return points
    (x0, y0), (x1, y1) = points
    return [(x0, y0), ((x0 + x1) / 2, (y0 + y1) / 2), (x1, y1)]


def _meio(a, b):
    pa, pb = _tres(ARMS[a] if isinstance(a, str) else a), _tres(ARMS[b] if isinstance(b, str) else b)
    return [((p[0] + q[0]) / 2, (p[1] + q[1]) / 2) for p, q in zip(pa, pb)]


def _dobrar(keys):
    """4 poses viram 8 quadros: cada pose e o quadro no meio do caminho até a próxima (pé no chão, meio pulinho)."""
    out = []
    for index, (left, right, bob, foot) in enumerate(keys):
        nl, nr, nb, _ = keys[(index + 1) % len(keys)]
        out.append((left, right, bob, foot))
        out.append((_meio(left, nl), _meio(right, nr), (bob + nb) // 2, None))
    return out


DANCE_STEPS = _dobrar([('baixo', 'baixo', 0, None), ('alto', 'alto', -1, 'esquerda'),
                       ('aberto', 'aberto', 0, None), ('alto', 'alto', -1, 'direita')])
CHEER_STEPS = _dobrar([('palma', 'palma', 0, None), ('aberto', 'aberto', -1, None),
                       ('palma', 'palma', 0, None), ('alto', 'baixo', -1, None)])
CROWD_W, CROWD_H, CROWD_PAD = 14, 20, 1


def person(grid, fabric, pose, sleeve='3', extra=()):
    """Uma pessoa da quadrilha num passo: braços, pé levantado e pulinho. `sleeve` é a cor dos braços e `extra` traz
    desenhos por cima (buquê, livro), como (linhas, x, y) nas coordenadas do corpo."""
    left, right, bob, foot = pose
    body = sprite(grid, fabric)
    if foot == 'esquerda':
        body = lift_columns(body, 0, 6, 14, 18)
    elif foot == 'direita':
        body = lift_columns(body, 6, 12, 14, 18)
    frame = blank(CROWD_W, CROWD_H)
    top = CROWD_H - 18 + bob
    ox = CROWD_PAD
    place(frame, body, ox, top)
    arms, hands = [], []
    for mirror, name in ((False, left), (True, right)):
        points = [(11 - x if mirror else x, y) for x, y in (ARMS[name] if isinstance(name, str) else name)]
        arms.append(([(ox + x, top + y) for x, y in points], sleeve))
        hx, hy = points[-1]
        hands.append((['4'], ox + hx, top + hy))
    hands += [(rows, ox + x, top + y) for rows, x, y in extra]
    frame.alpha_composite(strokes(CROWD_W, CROWD_H, arms, hands))
    return frame


# --- Enfeites dos lados -----------------------------------------------------------------------

BIRD = {
    'pousa': ['1..1', '1111', '.1A.'],
    'senta': ['.11.', '111A', '.1..'],
    'bica': ['.11.', '1111', '...A'],
}


def espantalho(base):
    """Espantalho balançando no vento; um anu pousa no braço, bica e vai embora."""
    frames = []
    for index in range(8):
        shift = (0, 1, 1, 0, -1, -1, 0, 1)[index]
        frame = wiggle(base, 30, shift * 1.4)
        bird = {4: 'pousa', 5: 'senta', 6: 'bica', 7: 'pousa'}.get(index)
        if bird:
            bar = round(shift * 1.4 * (30 - 15) / 30)
            frame.alpha_composite(strokes(frame.width, frame.height, [],
                                          [(BIRD[bird], 18 + bar, 12 - (1 if bird == 'pousa' else 0))]))
        frames.append(frame)
    return frames


CHICK = {
    'topo': ['.AA.'],
    'olha': ['.AA.', 'AeAK', 'AAAA'],
    'esquerda': ['.AA.', 'KeAA', 'AAAA'],
    'direita': ['.AA.', 'AAeK', 'AAAA'],
    'piu': ['.AA.', 'AeAK', 'AAAk'],
}


def fardo(rng):
    """Fardo de feno com um pintinho curioso que espia lá de trás."""
    bale = hay_bale(rng)
    extra = 5
    plan = [None] * 6 + ['topo', 'olha', 'esquerda', 'direita', 'piu', 'topo']
    frames = []
    for pose in plan:
        frame = blank(bale.width, bale.height + extra)
        if pose:
            rows = CHICK[pose]
            frame.alpha_composite(strokes(frame.width, frame.height, [], [(rows, 12, extra - len(rows))]))
        place(frame, bale, 0, extra)
        frames.append(frame)
    return frames
