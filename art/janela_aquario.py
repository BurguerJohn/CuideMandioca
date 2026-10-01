"""Aquário: o tanque (vidro, água, areia, castelo, baú, gabinete), os 12 peixes em 3 tamanhos e as peças que se mexem.

Os peixes são desenhados por código (corpo, cauda, nadadeiras, olho e um padrão por espécie), olhando para a direita, em 3
tamanhos (pequeno, médio e grande) e 2 quadros (a cauda balança).
"""

import math
import random

from PIL import Image

import janelas
from casa import Tela, rgb
from render import outline

W, H = 176, 104
AGUA = (8, 86)                # onde a água começa e termina (y)
AREIA_Y = 76
CELULA = (26, 15)             # um peixe com o contorno
ESPECIES = ['lambari', 'piaba', 'tilapia', 'acara', 'bagre', 'traira', 'pacu', 'tucunare', 'dourado', 'pintado', 'piranha', 'pirarucu']

PEIXES = {
    'lambari': dict(corpo='#c8d4e4', dorso='#8a9ab8', barriga='#eef2f8', nadadeira='#e8a0a0', cauda='#e0584a', padrao='faixa', cor='#4a5a8a', forma='fino'),
    'piaba': dict(corpo='#e8c050', dorso='#c89a28', barriga='#f8e8a8', nadadeira='#e8c050', cauda='#e8c050', padrao='mancha-cauda', cor='#26242e', forma='fino'),
    'tilapia': dict(corpo='#a0b090', dorso='#6a7a58', barriga='#d8e0c8', nadadeira='#8a9a78', cauda='#7a8a68', padrao='lisa', cor='#6a7a58', forma='alto'),
    'acara': dict(corpo='#f0e8c8', dorso='#d8c898', barriga='#fff8e8', nadadeira='#e8dcb0', cauda='#e8dcb0', padrao='listras', cor='#26242e', forma='disco'),
    'bagre': dict(corpo='#8a7a68', dorso='#5a4a3a', barriga='#c8b8a0', nadadeira='#6a5a4a', cauda='#6a5a4a', padrao='lisa', cor='#5a4a3a', forma='longo', extra='bigodes'),
    'traira': dict(corpo='#7a8a4a', dorso='#4a5a2a', barriga='#c8d098', nadadeira='#5a6a3a', cauda='#5a6a3a', padrao='manchas', cor='#3a4a22', forma='longo', extra='boca'),
    'pacu': dict(corpo='#d8a870', dorso='#a87a48', barriga='#e8584a', nadadeira='#e8584a', cauda='#c8483a', padrao='lisa', cor='#a87a48', forma='disco'),
    'tucunare': dict(corpo='#a8c858', dorso='#6a9a30', barriga='#f0e098', nadadeira='#e8b830', cauda='#c8981c', padrao='listras', cor='#3a5a18', forma='normal', extra='olho-cauda'),
    'dourado': dict(corpo='#f4b830', dorso='#d89018', barriga='#fff0a0', nadadeira='#e87a1c', cauda='#e87a1c', padrao='brilho', cor='#fff0a0', forma='alto'),
    'pintado': dict(corpo='#a8a8b8', dorso='#6a6a80', barriga='#e8e8f0', nadadeira='#8a8aa0', cauda='#8a8aa0', padrao='manchas', cor='#26242e', forma='longo', extra='bigodes'),
    'piranha': dict(corpo='#7a8aa0', dorso='#4a5a78', barriga='#e8683a', nadadeira='#d8482a', cauda='#d8482a', padrao='pintas', cor='#e8e8f0', forma='disco', extra='dentes'),
    'pirarucu': dict(corpo='#566a56', dorso='#3a4a3a', barriga='#a8b098', nadadeira='#c0402a', cauda='#c0402a', padrao='escamas', cor='#c0402a', forma='comprido'),
}
COMPRIMENTOS = [10, 16, 22]
ALTURA = {'fino': 0.27, 'normal': 0.34, 'alto': 0.44, 'disco': 0.52, 'longo': 0.26, 'comprido': 0.24}


def peixe(nome, tamanho, quadro):
    """Um peixe de `nome` no `tamanho` (0 a 2) e o `quadro` (0 ou 1); olha para a direita."""
    e = PEIXES[nome]
    L = COMPRIMENTOS[tamanho] * (1.1 if e['forma'] == 'comprido' else 1.0)
    L = int(round(L))
    h = max(3, int(round(L * ALTURA[e['forma']])))
    cauda = max(2, int(round(L * 0.24)))
    corpo = L - cauda
    t = Tela(L + 3, h + 7)
    cy = (h + 6) // 2
    gerador = random.Random(sum(map(ord, nome)) + tamanho)

    def meia(x):
        # Meia altura do corpo na coluna x (0 = ponta da cauda).
        u = (x + 0.5) / corpo
        return max(0.6, h / 2 * (math.sin(math.pi * min(1, u * 0.92 + 0.04)) ** 0.7))

    # Corpo: costas, meio e barriga.
    for x in range(corpo):
        px = cauda + x
        m = meia(x)
        for y in range(int(cy - m), int(cy + m) + 1):
            dy = (y - cy) / (m + 0.01)
            cor = e['dorso'] if dy < -0.45 else e['barriga'] if dy > 0.38 else e['corpo']
            t.put(px, y, cor)
    # Cauda em leque: abre para a ponta (esquerda); o quadro 1 inclina a ponta.
    for x in range(cauda):
        abre = (cauda - x) / cauda
        meio = max(1, int(round((h / 2 + 1) * (0.35 + abre * 0.75))))
        desloca = (1 if quadro else -1) * round(abre * 1.0)
        for y in range(int(cy - meio + desloca), int(cy + meio + desloca) + 1):
            t.put(x, y, e['cauda'])
    # Nadadeira de cima e de baixo.
    alta = max(1, int(round(h * 0.38)))
    for k in range(alta):
        t.rect(cauda + int(corpo * 0.35) + k // 2, int(cy - meia(int(corpo * 0.4))) - 1 - k, cauda + int(corpo * 0.58) - k, int(cy - meia(int(corpo * 0.4))) - 1 - k, e['nadadeira'])
    if tamanho:
        for k in range(max(1, alta // 2)):
            t.rect(cauda + int(corpo * 0.4), int(cy + meia(int(corpo * 0.45))) + k, cauda + int(corpo * 0.58) - k, int(cy + meia(int(corpo * 0.45))) + k, e['nadadeira'])
    # Padrões.
    p = e['padrao']
    if p == 'faixa':
        t.rect(cauda + 1, cy, cauda + corpo - 3, cy, e['cor'])
    elif p == 'listras':
        for x in range(cauda + 2, cauda + corpo - 2, 3 if tamanho else 4):
            m = meia(x - cauda)
            t.rect(x, int(cy - m) + 1, x, int(cy + m) - 1, e['cor'])
    elif p == 'manchas':
        for _ in range(2 + tamanho * 3):
            x = gerador.randrange(cauda + 2, cauda + corpo - 3)
            y = int(cy + gerador.uniform(-1, 1) * meia(x - cauda) * 0.6)
            t.put(x, y, e['cor'])
            if tamanho > 1:
                t.put(x + 1, y, e['cor'])
    elif p == 'mancha-cauda':
        t.rect(cauda, cy - 1, cauda + 1, cy, e['cor'])
    elif p == 'brilho':
        t.rect(cauda + 2, int(cy - meia(corpo // 2)) + 1, cauda + corpo - 4, int(cy - meia(corpo // 2)) + 1, e['cor'])
    elif p == 'pintas':
        for _ in range(3 + tamanho * 3):
            t.put(gerador.randrange(cauda + 2, cauda + corpo - 3), int(cy + gerador.uniform(-0.9, 0.5) * meia(corpo // 2)), e['cor'])
    elif p == 'escamas':
        for x in range(cauda + 1, cauda + corpo // 2 + 1):
            for y in range(int(cy - meia(x - cauda)) + 1, int(cy + meia(x - cauda))):
                if (x + y) % 3 == 0:
                    t.put(x, y, e['cor'])
    if e.get('extra') == 'olho-cauda':
        t.rect(cauda + 1, cy - 1, cauda + 2, cy, '#26242e')
        t.put(cauda, cy - 1, '#ffd21e')
    # Olho e boca.
    ex, ey = cauda + corpo - max(2, corpo // 4), int(cy - max(0, h * 0.1))
    t.put(ex, ey, '#26242e')
    if tamanho:
        t.put(ex - 1, ey - 1, '#ffffff')
    t.put(cauda + corpo - 1, cy + 1, sombra(e['dorso']))
    if e.get('extra') == 'bigodes':
        t.put(cauda + corpo, cy + 1, '#26242e')
        t.put(cauda + corpo + 1, cy + 2, '#26242e')
    if e.get('extra') == 'dentes':
        t.rect(cauda + corpo - 2, cy + 1, cauda + corpo - 1, cy + 1, '#ffffff')
    if e.get('extra') == 'boca':
        t.rect(cauda + corpo - 3, cy + 1, cauda + corpo - 1, cy + 1, '#26242e')
    return t.im


def sombra(cor):
    c = rgb(cor)
    return tuple(int(v * 0.6) for v in c)


def celula(nome, tamanho, quadro):
    """O peixe com contorno, centrado numa célula de tamanho fixo."""
    im = outline(peixe(nome, tamanho, quadro))
    box = im.getbbox()
    im = im.crop(box)
    saida = Image.new('RGBA', CELULA, (0, 0, 0, 0))
    saida.alpha_composite(im, ((CELULA[0] - im.width) // 2, (CELULA[1] - im.height) // 2))
    return saida


def peixes():
    return [celula(nome, tamanho, quadro) for nome in ESPECIES for tamanho in range(3) for quadro in range(2)]


# --- Tanque -----------------------------------------------------------------------------------------------------------------
def fundo():
    t = Tela(W, H)
    # Parede escura atrás do tanque.
    t.rect(0, 0, W - 1, H - 1, '#1a2438')
    # Tampa de madeira com três lâmpadas.
    t.rect(0, 0, W - 1, 8, '#8a5a34')
    t.rect(0, 0, W - 1, 1, '#b07a48')
    t.rect(0, 7, W - 1, 8, '#5c3820')
    for x in (30, 88, 146):
        t.rect(x - 8, 3, x + 8, 6, '#fff2b0')
        t.rect(x - 6, 4, x + 6, 5, '#ffffff')
    # Água.
    janelas.degrade(t, 6, AGUA[0], 169, AGUA[1], ['#a8ecfa', '#8fdcf2', '#76cbe8', '#5ab4dc', '#4a9cd0', '#3a84c0', '#2e6cac', '#245a98', '#1c4a84', '#163c72'])
    # Raios de luz.
    for x0 in (22, 60, 100, 138):
        for y in range(AGUA[0], AREIA_Y):
            x = x0 + (y - AGUA[0]) // 3
            t.rect(x, y, x + 3, y, '#c8f4ff' if y % 2 == 0 else '#b0e8fa')
    # Areia, pedras e conchas.
    t.rect(6, AREIA_Y, 169, AGUA[1], '#e8d29a')
    janelas.ruido(t, 6, AREIA_Y, 169, AGUA[1], 90, 3, ['#f4e4b0', '#d8bc80', '#c8a868', '#fff2c8'])
    for cx, cy, rx, ry, cor in ((18, 80, 9, 4, '#8c8e9a'), (150, 81, 10, 4, '#7a7c88'), (60, 83, 6, 2, '#9a9ca8'), (112, 83, 5, 2, '#8c8e9a')):
        janelas.elipse(t, cx, cy, rx, ry, cor)
        t.rect(cx - rx + 2, cy - ry + 1, cx - 1, cy - ry + 1, '#b4b6c2')
    # Castelo.
    t.rect(124, 58, 146, 80, '#b8a8c8')
    t.rect(124, 54, 128, 58, '#b8a8c8')
    t.rect(133, 52, 138, 58, '#b8a8c8')
    t.rect(142, 54, 146, 58, '#b8a8c8')
    for x in (124, 126, 133, 135, 137, 142, 144):
        t.rect(x, 52 if x in (133, 135, 137) else 53, x, 53, '#8a7aa0')
    t.rect(131, 68, 139, 80, '#3a2a58')
    t.rect(132, 62, 134, 64, '#3a2a58')
    t.rect(138, 62, 140, 64, '#3a2a58')
    # Baú do tesouro.
    t.rect(24, 70, 42, 80, '#8a5a34')
    t.rect(24, 70, 42, 72, '#a66a34')
    t.rect(24, 74, 42, 74, '#ffd21e')
    t.rect(32, 73, 34, 77, '#ffd21e')
    t.rect(25, 80, 41, 80, '#5c3820')
    # Vidro: bordas e brilho.
    t.rect(0, 9, 5, 89, '#5a6a88')
    t.rect(170, 9, 175, 89, '#5a6a88')
    t.rect(4, 9, 5, 89, '#8aa0c8')
    t.rect(170, 9, 171, 89, '#8aa0c8')
    t.rect(0, 86, W - 1, 90, '#3a4a68')
    t.rect(0, 86, W - 1, 87, '#6a7aa0')
    # Gabinete de madeira embaixo.
    t.rect(0, 91, W - 1, H - 1, '#6e3c1c')
    t.rect(0, 91, W - 1, 92, '#9a5a2c')
    for x0 in (6, 92):
        t.rect(x0, 95, x0 + 76, H - 3, '#8a5a34')
        t.rect(x0 + 2, 97, x0 + 74, H - 5, '#7a4a28')
        t.rect(x0 + 34, 99, x0 + 35, 102, '#ffd21e')
    return t.im


def algas():
    quadros = []
    for q in range(2):
        t = Tela(9, 28)
        for y in range(28):
            x = 4 + round(2.2 * math.sin(y / 4.5 + q * math.pi))
            t.rect(x, y, x + 1, y, '#2e8a44' if y % 5 else '#46a85a')
            if y % 7 == 3:
                t.rect(x + 2, y, x + 3, y, '#46a85a')
            if y % 7 == 6:
                t.rect(x - 2, y, x - 1, y, '#3a9a48')
        quadros.append(t.im)
    return quadros


def superficie():
    quadros = []
    for q in range(2):
        t = Tela(W - 12, 3)
        for x in range(W - 12):
            t.put(x, 0 if (x // 4 + q) % 2 == 0 else 1, '#e8fcff')
            t.put(x, 2, '#7ad0ee')
        quadros.append(t.im)
    return quadros


def extras():
    saida = []
    # bolha dourada com moeda, 2 quadros
    for q in range(2):
        t = Tela(11, 11)
        t.rect(2, 0, 8, 10, '#ffe27a')
        t.rect(0, 2, 10, 8, '#ffe27a')
        t.rect(3, 1, 7, 9, '#ffd21e')
        t.rect(1, 3, 9, 7, '#ffd21e')
        t.rect(3, 3, 7, 7, '#ffe27a')
        t.rect(4, 4, 6, 6, '#e8a812')
        t.rect(5, 4, 5, 6, '#fff6c8')
        t.put(2 + q, 2, '#ffffff')
        t.put(3 + q, 2, '#ffffff')
        saida.append(t.im)
    return saida


def flocos():
    quadros = []
    for q in range(2):
        t = Tela(5, 5)
        for (x, y) in ((1, 1), (3, 2), (2, 4)) if q == 0 else ((2, 0), (0, 3), (4, 4)):
            t.put(x, y, '#ffb84a')
            t.put(x + (1 if q else 0), y, '#ff8a2a')
        quadros.append(t.im)
    return quadros


def pote():
    t = Tela(10, 13)
    t.grade(['...yyyy...', '..yyyyyy..', '..kkkkkk..', '.rrrrrrrr.', '.rwwwwwwr.', '.rwRRRRwr.', '.rwRRRRwr.', '.rwwwwwwr.', '.rrrrrrrr.', '.rrrrrrrr.',
             '.rrrrrrrr.', '..rrrrrr..', '..........'], 0, 0)
    return t.im


def exportar(add):
    return {
        'fundo': add('janela-aquario-fundo', fundo()),
        'peixes': {**add('janela-aquario-peixes', peixes()), 'especies': ESPECIES},
        'algas': add('janela-aquario-algas', algas()),
        'superficie': add('janela-aquario-superficie', superficie()),
        'ouro': add('janela-aquario-ouro', extras()),
        'flocos': add('janela-aquario-flocos', flocos()),
        'pote': add('janela-aquario-pote', pote()),
        'agua': list(AGUA), 'areia': AREIA_Y, 'w': W, 'h': H,
    }
