"""As plantas da Horta (milho, amendoim, batata-doce, mandioca, abóbora), cada uma em 4 fases: 0 semente, 1 broto, 2 crescendo, 3 no ponto.

Desenhadas com folhas e frutos sombreados (luz de cima, à esquerda): três tons por forma (luz, base, sombra) e um brilhinho. Cada quadro
é `LARG` x `ALT` sem contorno, com o pé da planta na linha `CHAO`; quem exporta contorna.
"""

import math

from casa import Tela

LARG, ALT = 26, 30
CHAO = 27                    # a linha do chão (a terra do montinho fica nela)
CX = 13                      # o meio

# Verdes das folhas: luz, base, sombra.
VERDE = ('#8ad868', '#4aa84e', '#2e7a3c')
VERDE_ESCURO = ('#5ab858', '#2e8a44', '#1f5e32')
TERRA = ('#8a6a3a', '#6a4a2a', '#4a3018')


def sombrear(luz_x, luz_y):
    """O quanto o ponto está no lado da luz (-1 a 1), com a luz vindo de cima à esquerda."""
    return -(luz_x * 0.6 + luz_y * 0.8)


def forma(t, cx, cy, rx, ry, cores, brilho=None):
    """Uma elipse sombreada (luz, base, sombra)."""
    luz, base, sombra = cores
    for y in range(math.floor(cy - ry), math.ceil(cy + ry) + 1):
        for x in range(math.floor(cx - rx), math.ceil(cx + rx) + 1):
            dx, dy = (x - cx) / max(rx, 0.5), (y - cy) / max(ry, 0.5)
            if dx * dx + dy * dy <= 1.05:
                l = sombrear(dx, dy)
                t.put(x, y, luz if l > 0.5 else base if l > -0.2 else sombra)
    if brilho:
        t.put(round(cx - rx * 0.45), round(cy - ry * 0.5), brilho)


def folha(t, x, y, comp, ang, larg, cores=VERDE, curva=0.0, veia=True):
    """Uma folha que nasce em (x, y), com `comp` pixels de comprimento, apontando para o ângulo `ang` (graus, 0 = direita, 90 = para
    cima) e envergando `curva` graus ao longo do comprimento (folha caída). Mais larga no meio; a borda de cima pega a luz."""
    luz, base, sombra = cores
    px, py = float(x), float(y)
    a = math.radians(ang)
    passo = comp * 2
    for i in range(passo + 1):
        s = i / passo
        a_i = a + math.radians(curva) * s
        cx = x + sum(math.cos(a + math.radians(curva) * k / passo) for k in range(i)) * comp / passo
        cy = y - sum(math.sin(a + math.radians(curva) * k / passo) for k in range(i)) * comp / passo
        meia = larg * math.sin(math.pi * min(1.0, s * 1.05)) * 0.5
        nx, ny = -math.sin(a_i), -math.cos(a_i)             # a normal (para o lado de cima da folha)
        for k in range(-int(math.ceil(meia)), int(math.ceil(meia)) + 1):
            if abs(k) > meia + 0.3:
                continue
            cor = luz if k * ny < 0 and abs(k) >= meia - 0.6 else sombra if k * ny > 0 and abs(k) >= meia - 0.6 else base
            t.put(round(cx + nx * k * -1), round(cy + ny * k * -1), cor)
        if veia and i % 2 == 0 and s < 0.9:
            t.put(round(cx), round(cy), luz)
    return px, py


def haste(t, x0, y0, x1, y1, cor, cor2=None):
    """Uma haste (linha de 1 pixel, com o lado de baixo mais escuro se `cor2`)."""
    t.line(x0, y0, x1, y1, cor)
    if cor2:
        t.line(x0 + 1, y0, x1 + 1, y1, cor2)


def montinho(t, largura=7, fase=0):
    """O montinho de terra no pé da planta (e a sombra dela)."""
    claro, medio, escuro = TERRA
    meio = largura // 2
    for k in range(-meio, meio + 1):
        alto = 2 if abs(k) <= meio - 2 else 1
        for h in range(alto):
            t.put(CX + k, CHAO - h, medio if h == 0 else claro)
    t.put(CX - meio, CHAO, escuro)
    t.put(CX + meio, CHAO, escuro)
    t.put(CX - 1, CHAO - 1, claro)
    t.put(CX + 1, CHAO, escuro)


def semente(t, nome):
    """A fase 0: o montinho com a semente (ou um brotinho de nada) e o brilho da terra molhada."""
    montinho(t, 7, 0)
    cores = {'milho': ('#ffe27a', '#d8a812'), 'amendoim': ('#e8c88a', '#a8783a'), 'batata-doce': ('#c878a8', '#7a3a68'),
             'mandioca': ('#d8a868', '#8a5a28'), 'abobora': ('#fff0b8', '#c8a850')}[nome]
    t.put(CX, CHAO - 3, cores[0])
    t.put(CX - 1, CHAO - 3, cores[1])
    t.put(CX + 1, CHAO - 3, cores[1])
    t.put(CX, CHAO - 4, cores[1])
    t.put(CX + 3, CHAO - 2, '#a8844a')


# --- Milho -------------------------------------------------------------------------------------------------------------------
def milho(fase):
    t = Tela(LARG, ALT)
    montinho(t, 7)
    if fase == 0:
        semente(t, 'milho')
        return t.im
    alto = [0, 7, 15, 22][fase]
    topo = CHAO - 2 - alto
    # O colmo: duas cores, com nós.
    for y in range(topo, CHAO - 1):
        t.put(CX, y, '#7ad048')
        t.put(CX + 1, y, '#46a040')
        if (CHAO - y) % 5 == 0:
            t.put(CX, y, '#b8e868')
    # As folhas, caídas, uma de cada lado em cada nó.
    nos = [(CHAO - 5, 6), (CHAO - 10, 8), (CHAO - 15, 9), (CHAO - 19, 8)][:fase + 1 if fase < 3 else 4]
    if fase == 1:
        nos = [(CHAO - 4, 5)]
    for k, (y, comp) in enumerate(nos):
        if y < topo + 2:
            continue
        lado = 1 if k % 2 == 0 else -1
        folha(t, CX + (1 if lado > 0 else 0), y, comp, 20 if lado > 0 else 160, 3, VERDE, curva=-40 * lado)
        folha(t, CX + (1 if lado < 0 else 0), y - 2, max(4, comp - 2), 160 if lado > 0 else 20, 2, VERDE_ESCURO, curva=40 * lado)
    if fase >= 2:
        # O pendão no alto.
        for dx, dy in ((0, -1), (-1, -2), (1, -2), (0, -3), (-2, -3), (2, -3)):
            t.put(CX + dx, topo + dy + 1, '#e8d498' if dx else '#c8a868')
    if fase == 3:
        # A espiga: palha verde por fora, grãos amarelos aparecendo na ponta e os cabelos dourados.
        ex, ey = CX + 2, CHAO - 12
        for y in range(ey, ey + 7):
            for x in range(ex, ex + 4):
                t.put(x, y, VERDE[0] if x == ex else VERDE[1] if x == ex + 1 else VERDE[2])
        for x in range(ex, ex + 4):
            t.put(x, ey - 1, '#ffd21e' if x < ex + 3 else '#c89a10')
            t.put(x, ey - 2, '#ffe27a' if x < ex + 2 else '#e8b812')
        t.put(ex + 1, ey - 3, '#ffe27a')
        t.put(ex + 3, ey - 3, '#ffe27a')
        t.put(ex + 4, ey - 4, '#e8c868')
        t.put(ex + 4, ey - 5, '#e8c868')
        # A segunda espiga, mais baixa, do outro lado.
        ex2, ey2 = CX - 4, CHAO - 7
        for y in range(ey2, ey2 + 5):
            for x in range(ex2, ex2 + 3):
                t.put(x, y, VERDE[0] if x == ex2 else VERDE[1] if x == ex2 + 1 else VERDE[2])
        t.put(ex2, ey2 - 1, '#ffd21e')
        t.put(ex2 + 1, ey2 - 1, '#ffe27a')
        t.put(ex2 + 2, ey2 - 1, '#c89a10')
    return t.im


# --- Amendoim ---------------------------------------------------------------------------------------------------------------
def cupula(t, largura, altura, base_y, cores, passo_x=3, passo_y=2, raio=(2.5, 1.9)):
    """Uma touceira: folhinhas redondas em fileiras que formam uma cúpula (de cima para baixo, as de baixo cobrem as de cima)."""
    fileiras = max(1, int(altura / passo_y))
    for r in range(fileiras):
        y = base_y - altura + r * passo_y
        frac = (r + 0.5) / fileiras
        meia = largura / 2 * math.sqrt(max(0.05, 1 - (1 - frac) ** 2 * 0.9))
        n = max(1, int(meia * 2 / passo_x) + 1)
        for k in range(n):
            x = CX - meia + (k + (0.5 if r % 2 else 0)) * (meia * 2 / max(1, n - 1)) if n > 1 else CX
            if abs(x - CX) > meia + 0.5:
                continue
            forma(t, x, y, raio[0], raio[1], cores[(k + r) % len(cores)])


def amendoim(fase):
    t = Tela(LARG, ALT)
    montinho(t, 9)
    if fase == 0:
        semente(t, 'amendoim')
        return t.im
    largura, altura = {1: (6, 4), 2: (15, 8), 3: (21, 12)}[fase]
    # Alguns talos finos por baixo da touceira.
    for dx in (-3, 0, 3) if fase > 1 else (0,):
        t.line(CX + dx, CHAO - 2, CX + dx, CHAO - 2 - altura // 2, '#2e7a3c')
    cupula(t, largura, altura, CHAO - 1, [VERDE, VERDE_ESCURO, VERDE, ('#a8e878', '#5ab858', '#2e8a44')])
    if fase >= 2:
        for x, y in ((CX - largura // 3, CHAO - altura // 2 - 1), (CX + largura // 3, CHAO - altura + 1), (CX + 1, CHAO - altura - 1)):
            t.put(x, y, '#ffd21e')
            t.put(x - 1, y, '#ffe27a')
            t.put(x, y - 1, '#ffe27a')
    if fase == 3:
        # As vagens de amendoim aparecendo na terra: casquinha clara, com o gominho no meio.
        for x0 in (CX - 9, CX + 6):
            forma(t, x0 + 1.5, CHAO - 1, 2.6, 1.6, ('#f0d49a', '#d8b078', '#a8783a'))
            t.put(x0 + 1, CHAO - 1, '#a8783a')
        forma(t, CX + 1, CHAO, 2.4, 1.4, ('#f0d49a', '#d8b078', '#a8783a'))
        t.put(CX, CHAO, '#a8783a')
    return t.im


# --- Batata-doce ------------------------------------------------------------------------------------------------------------
CORACOES = {
    's': ['.1.1.', '11111', '.111.', '..1..'],
    'm': ['.11.11.', '1111111', '1111111', '.11111.', '..111..', '...1...'],
    'g': ['.111.111.', '111111111', '111111111', '111111111', '.1111111.', '..11111..', '....1....'],
}


def coracao_folha(t, x, y, tamanho, cores):
    """Folha em forma de coração (centrada em x, com a ponta para baixo); a luz pega o canto de cima, à esquerda."""
    luz, base, sombra = cores
    grade = CORACOES[tamanho]
    larg, alto = len(grade[0]), len(grade)
    for j, linha in enumerate(grade):
        for i, c in enumerate(linha):
            if c != '1':
                continue
            dx, dy = (i - (larg - 1) / 2) / (larg / 2), (j - (alto - 1) / 2) / (alto / 2)
            l = sombrear(dx, dy)
            t.put(x - larg // 2 + i, y - alto // 2 + j, luz if l > 0.45 else base if l > -0.3 else sombra)
    t.put(x, y - alto // 2 + 1, base)
    t.put(x, y, sombra if tamanho != 's' else base)


def batata_doce(fase):
    t = Tela(LARG, ALT)
    montinho(t, 9)
    if fase == 0:
        semente(t, 'batata-doce')
        return t.im
    claro = ('#a8e078', '#56b058', '#2e7a3c')
    escuro = ('#7ac860', '#3a9a48', '#25683a')
    roxo = ('#c8a0e0', '#9a68b8', '#6a3a88')
    if fase == 1:
        t.line(CX, CHAO - 2, CX, CHAO - 4, '#7a9a48')
        coracao_folha(t, CX - 2, CHAO - 6, 's', claro)
        coracao_folha(t, CX + 3, CHAO - 5, 's', escuro)
        return t.im
    if fase == 2:
        t.line(CX, CHAO - 2, CX - 3, CHAO - 5, '#7a9a48')
        t.line(CX, CHAO - 2, CX + 3, CHAO - 5, '#7a9a48')
        t.line(CX, CHAO - 2, CX, CHAO - 7, '#7a9a48')
        coracao_folha(t, CX - 5, CHAO - 7, 'm', claro)
        coracao_folha(t, CX + 5, CHAO - 7, 'm', escuro)
        coracao_folha(t, CX, CHAO - 10, 'm', claro)
        return t.im
    # No ponto: folhas grandes por cima e dos lados, e a batata-doce roxa aparecendo no meio da frente.
    for linha in ((CX - 4, CHAO - 7), (CX + 4, CHAO - 7), (CX, CHAO - 9)):
        t.line(CX, CHAO - 2, linha[0], linha[1], '#7a9a48')
    coracao_folha(t, CX, CHAO - 17, 'g', claro)
    coracao_folha(t, CX - 6, CHAO - 14, 'm', escuro)
    coracao_folha(t, CX + 6, CHAO - 14, 'm', claro)
    coracao_folha(t, CX - 3, CHAO - 11, 'm', claro)
    coracao_folha(t, CX + 3, CHAO - 11, 'm', escuro)
    coracao_folha(t, CX, CHAO - 9, 'g', claro)
    forma(t, CX, CHAO - 3, 6.0, 3.2, ('#d890c8', '#a85098', '#6a2a62'), '#f0c0e8')
    t.line(CX - 4, CHAO - 3, CX + 2, CHAO - 3, '#7a3a72')
    t.put(CX + 4, CHAO - 1, '#6a2a62')
    coracao_folha(t, CX - 8, CHAO - 7, 'g', escuro)
    coracao_folha(t, CX + 8, CHAO - 7, 'g', claro)
    for x, y in ((CX - 8, CHAO - 11), (CX + 8, CHAO - 11), (CX, CHAO - 21)):
        t.put(x, y, roxo[0])
        t.put(x + 1, y, roxo[1])
    return t.im


# --- Mandioca -----------------------------------------------------------------------------------------------------------------
def mandioca(fase):
    t = Tela(LARG, ALT)
    montinho(t, 7)
    if fase == 0:
        semente(t, 'mandioca')
        return t.im
    alto = [0, 6, 13, 18][fase]
    topo = CHAO - 3 - alto
    # O caule marrom, com nós, e as folhas de sete pontas abertas como uma mão no alto.
    for y in range(topo, CHAO - 1):
        t.put(CX, y, '#a8824a')
        t.put(CX + 1, y, '#6e4a24')
        if (CHAO - y) % 4 == 0:
            t.put(CX, y, '#d8b070')
    leque = {1: 3, 2: 5, 3: 7}[fase]
    comp = {1: 4, 2: 6, 3: 8}[fase]
    for k in range(leque):
        ang = 180 - (k + 0.5) * 180 / leque
        folha(t, CX, topo + 1, comp, ang, 2, VERDE if k % 2 == 0 else VERDE_ESCURO, curva=(90 - ang) * 0.25, veia=False)
    if fase == 3:
        # As raízes grossas aparecendo na terra: casca marrom, ponta clara.
        forma(t, CX - 4, CHAO - 1, 4.2, 2.2, ('#c89a62', '#9a6a36', '#6a4220'), '#e8c690')
        forma(t, CX + 4, CHAO - 1, 4.0, 2.0, ('#c89a62', '#9a6a36', '#6a4220'), '#e8c690')
        t.put(CX - 7, CHAO - 1, '#f0e0b0')
        t.put(CX + 7, CHAO - 1, '#f0e0b0')
        t.put(CX - 7, CHAO, '#f8f0d0')
    return t.im


# --- Abóbora ------------------------------------------------------------------------------------------------------------------
def abobora(fase):
    t = Tela(LARG, ALT)
    montinho(t, 9)
    if fase == 0:
        semente(t, 'abobora')
        return t.im
    # Folhas grandes e redondas na rama que se espalha.
    folhas = {1: [(-2, 2, 2.0)], 2: [(-6, 3, 3.0), (6, 3, 3.0), (0, 6, 3.0)], 3: [(-9, 3, 3.4), (9, 3, 3.4), (-4, 8, 3.2), (5, 8, 3.2)]}[fase]
    t.line(CX, CHAO - 2, CX - 5, CHAO - 5, '#3a8a40')
    t.line(CX, CHAO - 2, CX + 5, CHAO - 5, '#3a8a40')
    for dx, alto, r in folhas:
        forma(t, CX + dx, CHAO - 3 - alto, r, r * 0.75, VERDE if dx % 2 == 0 else VERDE_ESCURO)
        t.put(CX + dx, CHAO - 3 - alto, '#2e7a3c')
        t.put(CX + dx, CHAO - 2 - alto, '#2e7a3c')
    if fase == 2:
        forma(t, CX + 1, CHAO - 3, 2.6, 2.2, ('#d8e868', '#9ac848', '#5a9a30'))
        t.put(CX + 6, CHAO - 9, '#ffd21e')
        t.put(CX + 7, CHAO - 9, '#ffe27a')
        t.put(CX + 6, CHAO - 10, '#ffe27a')
    if fase == 3:
        # A abóbora madura: gomos, caule marrom e um brilho no alto.
        forma(t, CX, CHAO - 4, 7.0, 5.0, ('#ffb04a', '#f08a2a', '#b85a14'), '#ffe0a0')
        for dx in (-4, -1, 2):
            t.line(CX + dx, CHAO - 8, CX + dx - 1, CHAO - 1, '#c85a14')
        t.line(CX + 4, CHAO - 7, CX + 5, CHAO - 2, '#d86a1c')
        t.rect(CX - 1, CHAO - 12, CX + 1, CHAO - 9, '#5a8a30')
        t.put(CX - 1, CHAO - 12, '#8ac048')
        t.put(CX + 2, CHAO - 13, '#5a8a30')
    return t.im


PLANTAS = {'milho': milho, 'amendoim': amendoim, 'batata-doce': batata_doce, 'mandioca': mandioca, 'abobora': abobora}
