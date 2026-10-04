"""Aquário: o tanque (vidro, água, areia, castelo, baú, gabinete), os 12 peixes em 3 tamanhos e as peças que se mexem.

Os peixes são desenhados por código (corpo, cauda, nadadeiras, olho e um padrão por espécie), olhando para a direita, em 3
tamanhos (pequeno, médio e grande) e 2 quadros (a cauda balança).
"""

import math
import random

from PIL import Image

import ambiente as amb
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


def volume(im):
    """Luz na borda de cima do corpo e sombra na de baixo (de dentro do contorno), para o peixe não ficar chapado."""
    src = im.load()
    out = im.copy()
    px = out.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, alfa = src[x, y]
            if not alfa:
                continue
            acima = y == 0 or not src[x, y - 1][3]
            abaixo = y == im.height - 1 or not src[x, y + 1][3]
            if acima and not abaixo:
                px[x, y] = tuple(round(c + (255 - c) * 0.22) for c in (r, g, b)) + (alfa,)
            elif abaixo and not acima:
                px[x, y] = tuple(round(c * 0.78) for c in (r, g, b)) + (alfa,)
    return out


def celula(nome, tamanho, quadro):
    """O peixe com contorno, centrado numa célula de tamanho fixo."""
    im = outline(volume(peixe(nome, tamanho, quadro)))
    box = im.getbbox()
    im = im.crop(box)
    saida = Image.new('RGBA', CELULA, (0, 0, 0, 0))
    saida.alpha_composite(im, ((CELULA[0] - im.width) // 2, (CELULA[1] - im.height) // 2))
    return saida


def peixes():
    return [celula(nome, tamanho, quadro) for nome in ESPECIES for tamanho in range(3) for quadro in range(2)]


# --- Tanque -----------------------------------------------------------------------------------------------------------------
AGUA_CORES = ['#b4f0fc', '#98e2f6', '#80d2ee', '#68c0e6', '#52acdc', '#4298d0', '#3584c4', '#2a70b4', '#2160a2', '#1a5090', '#16427e', '#12366c']
CASTELO = (122, 50)           # canto de cima à esquerda do castelo
BAU = (22, 66)                # canto de cima à esquerda do baú
PEDRA_AR = (62, 80)           # a pedrinha da bomba de ar (de onde sobe a coluna de bolhas)
LAMPADAS = (30, 88, 146)


def coral_leque(t, cx, base, altura, cor, clara, escura):
    """Leque de coral: um tronco que se abre em galhos com pontinhas claras."""
    t.rect(cx, base - 4, cx + 1, base, escura)
    for k in range(altura):
        abre = k * 0.55
        y = base - 4 - k
        for lado in (-1, 1):
            x = cx + (0 if lado < 0 else 1) + round(lado * abre)
            t.put(x, y, cor)
            t.put(x + lado, y, cor if k % 3 else clara)
        if k % 3 == 2:
            t.put(cx + round(-abre), y - 1, clara)
            t.put(cx + 1 + round(abre), y - 1, clara)
    for k in range(0, altura, 2):
        t.put(cx, base - 4 - k, escura)


def coral_tubos(t, cx, base, cor, clara, escura):
    """Três tubos de coral de alturas diferentes, com a boca mais clara."""
    for dx, alt in ((0, 9), (4, 13), (8, 7)):
        t.rect(cx + dx, base - alt, cx + dx + 2, base, cor)
        t.rect(cx + dx, base - alt, cx + dx, base, clara)
        t.rect(cx + dx + 2, base - alt + 1, cx + dx + 2, base, escura)
        t.rect(cx + dx + 1, base - alt, cx + dx + 1, base - alt, escura)
        t.put(cx + dx, base - alt - 1, clara)


def coral_cerebro(t, cx, base, raio, cor, clara, escura):
    """Coral-cérebro: cúpula cheia de sulcos."""
    for y in range(base - raio, base + 1):
        for x in range(cx - raio - 2, cx + raio + 3):
            if ((x - cx) / (raio + 2)) ** 2 + ((y - base) / raio) ** 2 <= 1:
                t.put(x, y, clara if y < base - raio * 0.6 and x < cx else escura if y > base - raio * 0.25 else cor)
    for y in range(base - raio + 1, base):
        for x in range(cx - raio, cx + raio + 1):
            if (x * 2 + y) % 5 == 0 and ((x - cx) / (raio + 1)) ** 2 + ((y - base) / raio) ** 2 < 0.9:
                t.put(x, y, escura)


def estrela_do_mar(t, cx, cy, cor='#f0603a', clara='#ffa078'):
    for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1), (-2, 0), (2, 0), (0, -2), (0, 2), (-2, -1), (2, -1), (-2, 1), (2, 1)):
        t.put(cx + dx, cy + dy, cor)
    t.put(cx, cy, clara)
    t.put(cx - 2, cy, clara)


def concha(t, cx, cy, cor='#f4d4e0', escura='#c89ab0'):
    t.rect(cx - 2, cy, cx + 2, cy, cor)
    t.rect(cx - 1, cy - 1, cx + 1, cy - 1, cor)
    t.put(cx, cy - 2, cor)
    for dx in (-1, 1):
        t.put(cx + dx, cy, escura)
    t.put(cx, cy - 1, escura)


def chapeu_de_palha(t, cx, cy):
    """Um chapéu de palha afundado na areia, meio de lado."""
    for y in range(cy - 3, cy + 1):
        for x in range(cx - 9, cx + 10):
            if ((x - cx) / 9) ** 2 + ((y - cy + 1) / 3) ** 2 <= 1:
                t.put(x, y, '#e0b058' if (x + y) % 3 else '#c8923a')
    t.rect(cx - 4, cy - 6, cx + 4, cy - 3, '#e8c070')
    t.rect(cx - 4, cy - 4, cx + 4, cy - 4, '#d03a3a')
    t.rect(cx - 4, cy - 3, cx + 4, cy - 3, '#b02a2a')
    for x in range(cx - 3, cx + 4, 2):
        t.put(x, cy - 5, '#c8923a')
    t.put(cx - 4, cy - 6, '#f4d890')


def castelo(t):
    """Castelo de pedra roxa afundado: três torres com ameias, janelas acesas, portão e bandeirinhas de São João no alto."""
    x0, y0 = CASTELO
    corpo, claro, escuro = '#b8a8d0', '#d4c8e8', '#8a7aa8'
    # Muralha do meio e três torres.
    t.rect(x0 + 2, y0 + 12, x0 + 24, y0 + 30, corpo)
    for ax, topo, larg in ((x0, y0 + 5, 7), (x0 + 9, y0, 8), (x0 + 19, y0 + 5, 7)):
        t.rect(ax, topo, ax + larg - 1, y0 + 30, corpo)
        t.rect(ax, topo, ax, y0 + 30, claro)
        t.rect(ax + larg - 1, topo, ax + larg - 1, y0 + 30, escuro)
        for k in range(0, larg, 2):
            t.rect(ax + k, topo - 2, ax + k, topo - 1, corpo)
            t.put(ax + k, topo - 2, claro)
    # Tijolos.
    for y in range(y0 + 8, y0 + 30, 3):
        for x in range(x0 + 1, x0 + 26, 5):
            t.put(x + (y // 3) % 2 * 2, y, escuro)
    # Janelas acesas e portão em arco.
    for jx, jy in ((x0 + 2, y0 + 9), (x0 + 12, y0 + 5), (x0 + 21, y0 + 9)):
        t.rect(jx, jy, jx + 2, jy + 3, '#3a2a58')
        t.rect(jx + 1, jy + 1, jx + 1, jy + 2, '#ffd27a')
    t.rect(x0 + 10, y0 + 20, x0 + 16, y0 + 30, '#3a2a58')
    t.rect(x0 + 11, y0 + 19, x0 + 15, y0 + 19, '#3a2a58')
    t.rect(x0 + 12, y0 + 18, x0 + 14, y0 + 18, '#3a2a58')
    for x in range(x0 + 11, x0 + 16, 2):
        t.rect(x, y0 + 21, x, y0 + 30, '#26183e')
    # Bandeirinha no mastro da torre do meio e um varalzinho de bandeirinhas até as torres.
    t.rect(x0 + 12, y0 - 8, x0 + 12, y0 - 2, '#5c3820')
    t.rect(x0 + 13, y0 - 8, x0 + 16, y0 - 6, '#ee2f3c')
    t.rect(x0 + 13, y0 - 6, x0 + 15, y0 - 5, '#ffd21e')
    for k, cor in enumerate(['#ee2f3c', '#ffd21e', '#3a6cf0', '#ff4f9e', '#35a03a']):
        px = x0 + 3 + k * 4
        t.put(px, y0 + 13 + (1 if k % 2 else 0), cor)
        t.put(px, y0 + 14 + (1 if k % 2 else 0), cor)
    # Limo e algas no pé.
    for x in range(x0, x0 + 27):
        t.put(x, y0 + 30, '#3a8a4a' if x % 2 else '#2e6a3c')
        if x % 4 == 0:
            t.put(x, y0 + 29, '#46a85a')


def bau(t):
    """Baú do tesouro aberto: tampa levantada, moedas e colar para fora e um brilho dourado."""
    x0, y0 = BAU
    # Tampa aberta (atrás).
    t.rect(x0 + 1, y0 - 4, x0 + 17, y0 + 1, '#6e3c1c')
    t.rect(x0 + 1, y0 - 4, x0 + 17, y0 - 4, '#a66a34')
    t.rect(x0 + 2, y0 - 2, x0 + 16, y0 - 2, '#ffd21e')
    t.rect(x0 + 1, y0 - 4, x0 + 1, y0 + 1, '#8a5a34')
    # Moedas amontoadas.
    for k in range(16):
        x = x0 + 2 + k
        topo = y0 + 2 - (2 if 3 < k < 12 else 1) - (1 if 6 < k < 10 else 0)
        t.rect(x, topo, x, y0 + 4, '#ffd21e' if k % 2 else '#e8a812')
        t.put(x, topo, '#fff6c8')
    t.put(x0 + 8, y0, '#ffffff')
    t.put(x0 + 12, y0 + 1, '#ffffff')
    # Corpo do baú.
    t.rect(x0, y0 + 4, x0 + 18, y0 + 14, '#8a5a34')
    t.rect(x0, y0 + 4, x0 + 18, y0 + 5, '#a66a34')
    for x in range(x0 + 2, x0 + 18, 4):
        t.rect(x, y0 + 5, x, y0 + 14, '#6e3c1c')
    t.rect(x0, y0 + 8, x0 + 18, y0 + 8, '#ffd21e')
    t.rect(x0 + 8, y0 + 7, x0 + 10, y0 + 11, '#ffd21e')
    t.put(x0 + 9, y0 + 9, '#26242e')
    t.rect(x0 + 1, y0 + 14, x0 + 17, y0 + 14, '#5c3820')
    amb.luz(t, x0 + 9, y0 + 2, 15, 9, '#ffd860', 0.34, 4)


def pedras(t):
    """Montes de pedra com musgo, de cada lado."""
    for cx, cy, rx, ry in ((14, 79, 8, 4), (21, 80, 6, 3), (156, 80, 9, 4), (166, 81, 6, 3), (100, 83, 5, 2), (50, 83, 5, 2)):
        amb.pedra(t, cx, cy, rx, ry, ('#4a5068', '#7a8098', '#a8aec4'))
    for x, y in ((11, 76), (13, 76), (154, 77), (157, 77), (159, 77)):
        t.put(x, y, '#46a85a')
        t.put(x + 1, y + 1, '#2e8a44')


def silhuetas(t):
    """O fundo do tanque ao longe: morrinhos de pedra e uma floresta de algas bem escuras, para dar profundidade."""
    for x in range(6, 170):
        alto = AREIA_Y - 14 - round(6 * max(0, math.sin(x / 17.0 + 1)) + 3 * math.sin(x / 6.0))
        for y in range(alto, AREIA_Y):
            atual = t.px[x, y]
            t.px[x, y] = amb.misturar(atual, (22, 54, 104), 0.5) + (255,)
    for x in range(10, 168, 7):
        h = 10 + (x * 7) % 11
        for y in range(AREIA_Y - h, AREIA_Y):
            xx = x + round(1.5 * math.sin(y / 3.0 + x))
            atual = t.px[xx, y]
            t.px[xx, y] = amb.misturar(atual, (24, 74, 96), 0.55) + (255,)


def fundo():
    t = Tela(W, H)
    # Parede escura atrás do tanque, com um degradê tramado.
    amb.ceu(t, 0, 0, W - 1, H - 1, ['#101a2e', '#121e34', '#16223c'])
    # Água em faixas com a divisa tramada.
    amb.ceu(t, 6, AGUA[0], 169, AGUA[1], AGUA_CORES)
    # Raios de luz de cima: três faixas inclinadas, tramadas, que a janela balança por cima.
    for x0 in (20, 58, 98, 136):
        for y in range(AGUA[0], AREIA_Y):
            x = x0 + (y - AGUA[0]) // 3
            for dx in range(0, 4):
                if (x + dx + y) % 2 == 0 or dx in (1, 2):
                    amb.tingir(t, x + dx, y, '#e8fcff', 0.28 - 0.18 * (y - AGUA[0]) / (AREIA_Y - AGUA[0]))
    silhuetas(t)
    # Areia com marolas, pedrinhas e conchas.
    t.rect(6, AREIA_Y, 169, AGUA[1], '#e8d29a')
    janelas.ruido(t, 6, AREIA_Y, 169, AGUA[1], 110, 3, ['#f4e4b0', '#d8bc80', '#c8a868', '#fff2c8'])
    for x in range(6, 170):
        y = AREIA_Y + 4 + round(1.3 * math.sin(x / 5.0) + 0.8 * math.sin(x / 2.3))
        if x % 2 == 0:
            t.put(x, y, '#d0b070')
        if x % 3 == 0:
            t.put(x, y + 1, '#f6e8b8')
    amb.gradiente(t, 6, AREIA_Y, 169, AGUA[1], '#1a3a6a', 0.35, 0.05, 6)
    pedras(t)
    coral_cerebro(t, 76, 84, 5, '#d8568a', '#f08ab4', '#9a3060')
    coral_tubos(t, 142, 84, '#e8883a', '#ffbe78', '#a8501c')
    coral_leque(t, 98, 84, 11, '#a85ad0', '#d49af0', '#6a3290')
    coral_leque(t, 44, 82, 9, '#e0584a', '#ff9a8a', '#8e2a22')
    estrela_do_mar(t, 118, 84)
    estrela_do_mar(t, 36, 85, '#f0a03a', '#ffd88a')
    concha(t, 88, 85)
    concha(t, 160, 84, '#ffe8c8', '#c8a078')
    chapeu_de_palha(t, 108, 83)
    # Pedrinha da bomba de ar e a mangueirinha que sobe pela lateral do vidro.
    t.rect(PEDRA_AR[0] - 2, PEDRA_AR[1], PEDRA_AR[0] + 2, PEDRA_AR[1] + 2, '#8c8e9a')
    t.rect(PEDRA_AR[0] - 1, PEDRA_AR[1], PEDRA_AR[0] + 1, PEDRA_AR[1], '#c4c6d2')
    t.line(PEDRA_AR[0] - 3, PEDRA_AR[1] + 2, 9, AREIA_Y + 5, '#1c2a46')
    t.rect(9, AGUA[0], 9, AREIA_Y + 5, '#1c2a46')
    castelo(t)
    bau(t)
    # Vidro: bordas grossas com brilho, cantos com rebites.
    t.rect(0, 9, 5, 89, '#4a5a78')
    t.rect(170, 9, 175, 89, '#4a5a78')
    t.rect(4, 9, 5, 89, '#8aa0c8')
    t.rect(170, 9, 171, 89, '#8aa0c8')
    t.rect(0, 9, 1, 89, '#34425c')
    t.rect(174, 9, 175, 89, '#34425c')
    t.rect(0, 86, W - 1, 90, '#3a4a68')
    t.rect(0, 86, W - 1, 87, '#6a7aa0')
    t.rect(0, 90, W - 1, 90, '#26324a')
    for x, y in ((2, 12), (2, 85), (173, 12), (173, 85)):
        t.put(x, y, '#c8d8f0')
    # Tampa de madeira com três lâmpadas (cada uma com refletor e a luz caindo na água).
    t.rect(0, 0, W - 1, 8, '#8a5a34')
    t.rect(0, 0, W - 1, 1, '#b98048')
    t.rect(0, 7, W - 1, 8, '#5c3820')
    for x in range(2, W, 6):
        t.put(x, 4, '#6e3c1c')
    for x in LAMPADAS:
        t.rect(x - 9, 3, x + 9, 6, '#4a2c18')
        t.rect(x - 8, 3, x + 8, 5, '#fff2b0')
        t.rect(x - 6, 3, x + 6, 4, '#ffffff')
        t.rect(x - 8, 6, x + 8, 6, '#c8a860')
    # Gabinete de madeira embaixo: tampo, duas gavetas com puxador de latão e pezinhos.
    t.rect(0, 91, W - 1, H - 1, '#6e3c1c')
    t.rect(0, 91, W - 1, 92, '#a66a34')
    t.rect(0, 93, W - 1, 93, '#4a2c18')
    for x0 in (6, 92):
        t.rect(x0, 95, x0 + 76, H - 3, '#4a2c18')
        t.rect(x0 + 1, 96, x0 + 75, H - 4, '#8a5a34')
        t.rect(x0 + 2, 97, x0 + 74, H - 5, '#7a4a28')
        for x in range(x0 + 4, x0 + 72, 6):
            t.put(x, 98, '#8a5a34')
            t.put(x + 2, 100, '#6a3a1c')
        t.rect(x0 + 32, 99, x0 + 43, 100, '#ffd21e')
        t.rect(x0 + 32, 99, x0 + 43, 99, '#fff2a0')
        t.rect(x0 + 32, 101, x0 + 43, 101, '#b8892a')
    return t.im


def plantas():
    """Quatro plantas que balançam (2 quadros cada, na ordem: capim, alga larga, alga alta, trecho de laço): `tipo * 2 + quadro`."""
    saida = []
    for tipo in range(4):
        for q in range(2):
            t = Tela(15, 40)
            fase = q * math.pi
            if tipo == 0:   # capim: oito fiozinhos
                for k in range(8):
                    x0 = 3 + k * 1.2
                    altura = 14 + (k * 5) % 9
                    for y in range(altura):
                        x = x0 + math.sin(y / 5.0 + fase + k) * 1.4 * (y / altura)
                        t.put(x, 39 - y, '#2e8a44' if k % 2 else '#46a85a')
            elif tipo == 1:  # alga larga: folha em fita com ondas
                for y in range(30):
                    x = 6 + 3 * math.sin(y / 6.0 + fase)
                    t.rect(round(x), 39 - y, round(x) + 2, 39 - y, '#2a8a50' if y % 7 else '#46b068')
                    t.put(round(x), 39 - y, '#5ccc80')
                    t.put(round(x) + 3, 39 - y, '#1e6a3a')
            elif tipo == 2:  # alga alta, com folhas dos lados
                for y in range(38):
                    x = 7 + 2.4 * math.sin(y / 7.0 + fase)
                    t.put(round(x), 39 - y, '#2e8a44')
                    t.put(round(x) + 1, 39 - y, '#46a85a')
                    if y % 6 == 3:
                        for k in range(1, 4):
                            t.put(round(x) + 1 + k, 39 - y - k // 2, '#3a9a48')
                    if y % 6 == 0 and y > 0:
                        for k in range(1, 4):
                            t.put(round(x) - k, 39 - y - k // 2, '#3a9a48')
            else:           # laço de fita: uma fitinha vermelha presa numa pedra, que balança com a corrente
                t.rect(5, 37, 9, 39, '#6a6e82')
                for y in range(20):
                    x = 7 + 2.5 * math.sin(y / 3.5 + fase)
                    t.rect(round(x), 36 - y, round(x) + 1, 36 - y, '#e0343e' if y % 5 else '#ff6a78')
            saida.append(t.im)
    return saida


def frente():
    """Por cima de tudo: o reflexo do vidro (duas faixas claras inclinadas, quase transparentes)."""
    t = Tela(W, H)
    for y in range(AGUA[0] + 2, AGUA[1] - 2):
        x = 14 + (AGUA[1] - y) // 2
        for dx in range(3):
            if 0 <= x + dx < W:
                t.px[x + dx, y] = (255, 255, 255, 34 if dx == 1 else 18)
    for y in range(AGUA[0] + 2, AGUA[1] - 24):
        x = 24 + (AGUA[1] - y) // 2
        t.px[x, y] = (255, 255, 255, 26)
    return t.im


def superficie():
    """A linha d'água: três fileiras (brilho, água clara, sombra) com as cristas das ondinhas andando de um quadro para o outro."""
    quadros = []
    for q in range(2):
        t = Tela(W - 12, 3)
        for x in range(W - 12):
            crista = (x // 3 + q * 2) % 5 in (0, 1)
            t.put(x, 0, '#ffffff' if crista and x % 2 == 0 else '#d8f8ff' if crista else '#9ee4f6')
            t.put(x, 1, '#b8f0ff' if crista else '#7ad0ee')
            t.put(x, 2, '#5ab4dc' if (x + q) % 4 else '#4a9cd0')
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
        'plantas': add('janela-aquario-plantas', plantas()),
        'frente': add('janela-aquario-frente', frente()),
        'superficie': add('janela-aquario-superficie', superficie()),
        'ouro': add('janela-aquario-ouro', extras()),
        'flocos': add('janela-aquario-flocos', flocos()),
        'pote': add('janela-aquario-pote', pote()),
        'agua': list(AGUA), 'areia': AREIA_Y, 'w': W, 'h': H,
        'castelo': list(CASTELO), 'bau': list(BAU), 'pedraAr': list(PEDRA_AR), 'lampadas': list(LAMPADAS),
    }
