"""Bairro: a rua à noite com 14 casinhas (uma para cada integrante da turma, cada uma de uma cor), a casa vazia de janelas
fechadas, a praça com chafariz e os postes de luz.
"""

import random

import ambiente as amb
import janelas
from casa import Tela, rgb
from render import outline

W, H = 176, 120
CASA = (24, 34)                      # uma casa
COLUNAS = [1 + i * 25 for i in range(7)]
TOPOS = [8, 58]                      # o topo de cada fileira de casas
CHAOS = [42, 92]                     # o chão (onde o vizinho pisa) de cada fileira
QUANTAS = 14

PAREDES = ['#f4d9a8', '#c4e2f2', '#f6c8d2', '#cdeabc', '#f8e8a0', '#d8c8f0', '#f4b890', '#b8e0d8', '#f0c0c0', '#c8d4f8', '#e8d8a8', '#d0f0c8', '#f4c8e0', '#ffe0b0']
TELHADOS = ['#b23a48', '#3a6cc8', '#3a9a58', '#c87a30', '#8a4aa8', '#2a8a9a', '#a85a30']
PORTAS = ['#6e3c1c', '#3a6cc8', '#c83c4c', '#2e8a44', '#8a5a34', '#b07af0', '#e8a030']


EMBLEMA_LEG = {'y': '#ffd21e', 'Y': '#c89a10', 'l': '#56c860', 'L': '#2e8a44', 'o': '#ff8a12', 'O': '#c8680a', 'r': '#ee4c4c', 'R': '#9a1a2e', 'w': '#ffffff',
               'k': '#26242e', 'b': '#3a78d8', 'B': '#1a3a8a', 'n': '#8a5a34', 'p': '#ff80b8', 'g': '#9a9ca8', 'c': '#8fd4ee', 'm': '#a066e0', 's': '#f0c8a0'}
# Um sinal de 9 x 7 em cima de cada porta, do ofício de quem mora lá (na ordem de `data.chars`).
EMBLEMAS = [
    ['....y....', '...yyy...', '..yYyYy..', '..yyyyy..', '..lyyyl..', '...lll...', '....l....'],                 # milho: espiga
    ['.........', '.kkkkkkk.', 'krrwrwrrk', 'krrwrwrrk', 'krrwrwrrk', '.kkkkkkk.', '.........'],                  # cenoura: sanfona
    ['.nnnnnnn.', 'nwwwwwwwn', 'nrwrwrwrn', 'nrwrwrwrn', '.nnnnnnn.', '.........', '.........'],                  # inhame: zabumba
    ['....g....', '...g.g...', '..g...g..', '.g.....g.', 'ggggggggg', '.........', '.........'],                  # batata: triângulo
    ['.......g.', '.....ggg.', '..rrrggg.', '.rrrrggg.', '..rrrggg.', '.....ggg.', '.......g.'],                  # pamonha: megafone
    ['.rr...rr.', 'rrrr.rrrr', 'rrrrrrrrr', '.rrrrrrr.', '..rrrrr..', '...rrr...', '....r....'],                  # aipim: coração
    ['.........', '..bbb..bb', '.bbwbbbb.', 'bbbbbbbbb', '.bbbbbbbb', '..bbb..bb', '.........'],                  # cachorro: peixe
    ['....n....', '..yyyyy..', '.y.....y.', '.y..n..y.', '..yyyyy..', '....n....', '..nnnnn..'],                  # paçoca: argolas
    ['....r....', '...rrr...', '...rwr...', '...rrr...', '..brrrb..', '...bbb...', '...o.o...'],                  # faísca: foguete
    ['..p...p..', '.ppp.ppp.', '.ppp.ppp.', '..p...p..', '...ppp...', '..ppppp..', '.pp.p.pp.'],                  # sopinha: patinha
    ['.w.ww.w..', 'wwwwwwww.', '.rwrwrwr.', '.rwrwrwr.', '..rwrwr..', '..rwrwr..', '..rrrrr..'],                  # pipoca: balde
    ['...nnn...', '..n...n..', '.bbbbbbb.', '.bBBBBBb.', '.bbyybbb.', '.bbbbbbb.', '.bbbbbbb.'],                  # amendoim: mala
    ['..w.w....', '.w.w.w...', '.nnnnnnn.', 'nyyyyyyyn', 'nyyyyyyyn', '.nnnnnnn.', '.........'],                  # canjica: panela
    ['.........', 'kkkkkkkkk', '.r.y.b.g.', '.r.y.b.g.', '.r.y.b.g.', '.........', '.........'],                  # cocada: cordel
]
CHAMINES_CASA = {}                          # índice da casa -> onde sobe a fumaça (x, y) dentro dela, para a janela desenhar
LUZ_JANELAS = [(5, 25), (19, 25)]           # o centro de cada janela (dentro da casa)
LANTERNA = (19, 14)                          # a lanterninha ao lado do sinal (a janela faz a luz tremer)


def casa(indice):
    """A casa `indice` (0 a 13): cada uma com o seu jeito (telhado de duas águas, de quatro águas ou plano com bandeirolas), janelas com cortina,
    persiana e vaso, porta com almofada, lanterna e o sinal do ofício de quem mora (14 é a casa vazia, de janelas fechadas)."""
    t = Tela(*CASA)
    vazia = indice >= QUANTAS
    parede = '#5a4a58' if vazia else PAREDES[indice % len(PAREDES)]
    telhado = '#3a2e3e' if vazia else TELHADOS[indice % len(TELHADOS)]
    porta = '#3a2a32' if vazia else PORTAS[(indice * 3) % len(PORTAS)]
    claro, escuro = janelas_claro(parede), janelas_escuro(parede)
    # Parede: reboco com pontinhos, quinas claras, rodapé escuro e um friso no alto.
    t.rect(1, 12, 22, 33, parede)
    gerador = random.Random(indice * 5 + 1)
    for _ in range(26):
        t.put(gerador.randrange(2, 22), gerador.randrange(14, 30), claro if gerador.random() < 0.5 else escuro)
    t.rect(1, 12, 22, 13, claro)
    t.rect(1, 12, 1, 33, claro)
    t.rect(22, 12, 22, 33, escuro)
    t.rect(1, 29, 22, 33, escuro)
    t.rect(1, 29, 22, 29, janelas_claro(escuro, 1.3))
    # Telhado: três jeitos, com telhas em fileiras, cumeeira clara e sombra do beiral.
    estilo = indice % 3
    if estilo == 0:
        for k in range(11):
            t.rect(0 + k, 11 - k, 23 - k, 11 - k, telhado if k % 3 else janelas_escuro(telhado))
        t.rect(11, 0, 12, 0, janelas_claro(telhado))
        t.rect(17, 0, 19, 6, janelas_escuro(telhado))
        t.rect(16, 0, 20, 1, telhado)
        CHAMINES_CASA[indice] = (18, -1)
    elif estilo == 1:
        for k in range(8):
            t.rect(k, 11 - k, 23 - k, 11 - k, telhado if k % 3 else janelas_escuro(telhado))
        t.rect(8, 3, 15, 3, janelas_claro(telhado))
        t.rect(10, 4, 13, 6, janelas_escuro(telhado))           # a lucarna (janelinha do sótão)
        t.rect(11, 5, 12, 5, '#ffe27a' if not vazia else '#2a2030')
        CHAMINES_CASA[indice] = (4, 2)
        t.rect(3, 1, 5, 5, janelas_escuro(telhado))
    else:
        t.rect(0, 5, 23, 11, telhado)
        t.rect(0, 5, 23, 5, janelas_claro(telhado))
        for x in range(0, 24, 3):
            t.rect(x, 7, x + 1, 7, janelas_escuro(telhado))
        t.rect(0, 4, 23, 4, janelas_escuro(telhado))
        for x in range(1, 23, 4):                                   # a mureta tem ameias
            t.rect(x, 3, x + 1, 4, telhado)
        t.rect(11, 0, 11, 3, '#5c3820')
        t.rect(12, 0, 15, 1, '#ee4c4c' if not vazia else '#4a3a4a')
        t.rect(12, 2, 14, 2, '#ffd21e' if not vazia else '#4a3a4a')
        CHAMINES_CASA[indice] = None
    t.rect(0, 11, 23, 11, janelas_escuro(telhado, 0.5))
    # Janelas (abaixo do sinal): caixilho claro, persianas nas pontas, cortina (ou fechada) e vaso embaixo da esquerda.
    persiana = porta
    wy = 21
    for x0 in (3, 17):
        t.rect(x0 - 1, wy, x0 + 5, wy + 7, '#f4f4ec' if not vazia else '#4a3e50')
        t.rect(x0, wy + 1, x0 + 4, wy + 6, '#6e3c1c' if not vazia else '#3a2e3e')
        if vazia:
            t.rect(x0 + 1, wy + 2, x0 + 3, wy + 5, '#2a2030')
            t.rect(x0 - 1, wy + 1, x0 - 1, wy + 6, persiana)
            t.rect(x0 + 5, wy + 1, x0 + 5, wy + 6, persiana)
        else:
            t.rect(x0 + 1, wy + 2, x0 + 3, wy + 5, '#ffe27a')
            t.rect(x0 + 1, wy + 2, x0 + 3, wy + 2, '#fff6c0')
            t.rect(x0 + 2, wy + 1, x0 + 2, wy + 6, '#6e3c1c')
            t.rect(x0, wy + 3, x0 + 4, wy + 3, '#6e3c1c')
            cortina_cor = PORTAS[(indice * 3 + 2) % len(PORTAS)]
            t.rect(x0 + 1, wy + 2, x0 + 1, wy + 4, cortina_cor)
            t.rect(x0 + 3, wy + 2, x0 + 3, wy + 4, cortina_cor)
            t.rect(x0 - 1, wy + 1, x0 - 1, wy + 6, persiana)
            t.rect(x0 + 5, wy + 1, x0 + 5, wy + 6, persiana)
        t.rect(x0 - 1, wy + 7, x0 + 5, wy + 7, '#d8d0c0' if not vazia else '#4a3e50')
    if not vazia and indice % 2 == 0:
        t.rect(2, wy + 8, 8, wy + 9, '#6e3c1c')
        for dx, cor in ((3, '#ff7aa8'), (5, '#ffd21e'), (7, '#ff4a5a')):
            t.put(dx, wy + 7, cor)
            t.put(dx, wy + 8, '#2e8a44')
    # Porta com almofadas, maçaneta e soleira; em cima o sinal do ofício e, ao lado, uma lanterninha.
    t.rect(8, 21, 16, 33, '#f4f4ec' if not vazia else '#4a3e50')
    t.rect(9, 22, 15, 33, porta)
    t.rect(9, 22, 15, 22, janelas_claro(porta))
    t.rect(10, 24, 14, 28, janelas_escuro(porta, 0.82))
    t.rect(11, 25, 13, 27, porta)
    t.put(14, 30, '#ffd21e' if not vazia else '#8a8a98')
    t.rect(8, 33, 16, 33, '#8a8a98')
    if not vazia:
        lx, ly = LANTERNA
        t.rect(lx, ly, lx + 1, ly + 2, '#ffd860')
        t.rect(lx - 1, ly - 1, lx + 2, ly - 1, '#2a2030')
        t.put(lx, ly, '#fff6c0')
        grade = EMBLEMAS[indice % len(EMBLEMAS)]
        t.rect(7, 12, 17, 19, '#4a2c18')
        t.rect(7, 12, 17, 12, '#8a5a34')
        t.grade(grade, 8, 12, {k: rgb(v) for k, v in EMBLEMA_LEG.items()})
        t.rect(7, 19, 17, 19, '#2a1810')
    return outline(t.im)


def janelas_claro(cor, f=1.18):
    c = rgb(cor)
    return tuple(min(255, int(v * f)) for v in c)


def janelas_escuro(cor, f=0.72):
    c = rgb(cor)
    return tuple(int(v * f) for v in c)


def casas():
    return [casa(i) for i in range(QUANTAS + 1)]


LAMPIOES = [12, 62, 112, 162]                # x de cada poste de luz (a lâmpada fica em y = 37)
LUZES_ARVORE = []                             # pontinhos de luz nas árvores da praça (a janela os faz piscar)
FONTE = (88, 105)                             # o centro do chafariz


def rua(t):
    """A rua entre as duas fileiras: asfalto com remendos, meio-fio claro dos dois lados, faixa tracejada, bueiro e uma poça."""
    t.rect(0, 43, W - 1, 57, '#34303e')
    janelas.ruido(t, 0, 47, W - 1, 56, 150, 7, ['#3e3a4a', '#2a2634', '#46425a'])
    t.rect(0, 43, W - 1, 45, '#6a667a')
    t.rect(0, 43, W - 1, 43, '#8a869a')
    t.rect(0, 46, W - 1, 46, '#26222e')
    t.rect(0, 55, W - 1, 57, '#5a566a')
    t.rect(0, 55, W - 1, 55, '#7a768a')
    t.rect(0, 54, W - 1, 54, '#26222e')
    for x in range(4, W, 14):
        t.rect(x, 50, x + 6, 50, '#d8d0a8')
        t.rect(x, 51, x + 6, 51, '#a8a080')
    # Remendos e rachaduras.
    for x0, y0 in ((30, 48), (96, 52), (150, 49)):
        t.rect(x0, y0, x0 + 6, y0 + 2, '#3a3646')
        t.line(x0 - 2, y0 + 3, x0 + 8, y0 - 1, '#26222e')
    # Bueiro redondo e poça que reflete a luz de um poste.
    janelas.elipse(t, 44, 52, 4, 2, '#4a4658', '#2a2634')
    t.rect(41, 52, 47, 52, '#26222e')
    janelas.elipse(t, 134, 51, 7, 2, '#3a4a78', '#2c3a68')
    t.rect(130, 51, 134, 51, '#6a7ab8')
    t.rect(0, 58, W - 1, 58, '#26222e')


def praca(t):
    """A praça de baixo: gramado, calçada de pedras em fileiras, chafariz de duas bacias, bancos, vasos e as duas árvores com luzinhas."""
    LUZES_ARVORE.clear()
    t.rect(0, 59, W - 1, H - 1, '#26382e')
    janelas.ruido(t, 0, 59, W - 1, H - 1, 200, 61, ['#344a3a', '#1e2c24', '#3a5440', '#2c4434'])
    # Cercas vivas entre a rua e a praça.
    for x in range(0, W, 2):
        t.rect(x, 93, x + 1, 95 + (x // 2) % 2, '#1e4a2c')
    t.rect(0, 94, W - 1, 94, '#2e6a3c')
    # Calçada de pedras.
    t.rect(0, 96, W - 1, H - 1, '#5a5666')
    for y in range(96, H, 5):
        for x in range(0, W, 10):
            xx = x + (5 if ((y - 96) // 5) % 2 else 0)
            t.rect(xx, y, xx + 8, y + 3, '#625e72')
            t.rect(xx, y, xx + 8, y, '#7a768a')
            t.put(xx + 8, y + 3, '#403c4c')
    amb.gradiente(t, 0, 96, W - 1, H - 1, '#0a0618', 0.0, 0.4, 5)
    # Chafariz: bacia larga embaixo, pedestal, bacia pequena em cima e o esguicho (que a janela anima).
    fx, fy = FONTE
    amb.sombra(t, fx, fy + 6, 20, 3, 0.4, '#04020c')
    janelas.elipse(t, fx, fy, 18, 7, '#8c8e9a', '#6a6c78')
    janelas.elipse(t, fx, fy - 1, 15, 5, '#3a98c8')
    janelas.elipse(t, fx, fy - 1, 12, 3, '#56c8ee')
    t.rect(fx - 2, fy - 12, fx + 2, fy - 1, '#aeb4c0')
    t.rect(fx - 2, fy - 12, fx - 2, fy - 1, '#d8dce8')
    janelas.elipse(t, fx, fy - 12, 8, 3, '#c8ccd8', '#9a9eac')
    janelas.elipse(t, fx, fy - 12, 6, 2, '#56c8ee')
    t.rect(fx - 1, fy - 16, fx + 1, fy - 12, '#c8ccd8')
    # Bancos de madeira com encosto.
    for x0 in (16, 144):
        t.rect(x0, 104, x0 + 16, 106, '#8a5a34')
        t.rect(x0, 104, x0 + 16, 104, '#b07a48')
        t.rect(x0, 100, x0 + 16, 102, '#7a4a28')
        t.rect(x0, 107, x0 + 1, 111, '#4a2c18')
        t.rect(x0 + 15, 107, x0 + 16, 111, '#4a2c18')
        amb.sombra(t, x0 + 8, 112, 10, 1, 0.35, '#04020c')
    # Árvores com luzinhas penduradas.
    for cx in (7, 169):
        t.rect(cx - 1, 108, cx + 1, 118, '#4a2c18')
        t.rect(cx - 1, 108, cx - 1, 118, '#6e3c1c')
        janelas.elipse(t, cx, 102, 9, 9, '#1e4a2c')
        janelas.elipse(t, cx - 2, 99, 6, 5, '#2e6a3c')
        gerador = random.Random(cx)
        for _ in range(9):
            lx, ly = cx + gerador.randrange(-8, 9), 96 + gerador.randrange(0, 14)
            LUZES_ARVORE.append([lx, ly])
            t.put(lx, ly, '#ffd860')
    # Vasos de flor nos cantos da calçada.
    for x0 in (52, 120):
        t.rect(x0, 108, x0 + 5, 112, '#a8502a')
        t.rect(x0, 108, x0 + 5, 108, '#c8683c')
        for dx, cor in ((0, '#ff7aa8'), (2, '#ffd21e'), (4, '#ff4a5a')):
            t.put(x0 + dx, 105, cor)
            t.put(x0 + dx + 1, 106, '#2e8a44')
            t.rect(x0 + dx, 106, x0 + dx, 107, '#2e8a44')


def fundo():
    t = Tela(W, H)
    janelas.degrade(t, 0, 0, W - 1, 58, ['#0c0a22', '#14102e', '#1c1640', '#281e52', '#382a64', '#4a3676', '#5e4486'])
    janelas.estrelas(t, 1, 1, W - 1, 14, 18, 51)
    amb.luz(t, 88, 42, 90, 12, '#ff9a3a', 0.2, 4)
    rua(t)
    praca(t)
    return t.im


def frente():
    """Por cima das casas: os quatro postes de luz na beira da rua (com a luz caindo no asfalto) e as sombras das casas na calçada."""
    t = Tela(W, H)
    for x in LAMPIOES:
        t.rect(x, 38, x + 1, 57, '#2a2830')
        t.rect(x, 38, x, 57, '#4a4854')
        t.rect(x - 2, 35, x + 3, 37, '#2a2830')
        t.rect(x - 1, 36, x + 2, 37, '#ffe27a')
        t.put(x, 36, '#ffffff')
        amb.luz(t, x + 0.5, 52, 18, 5, '#ffb040', 0.34, 4)
        amb.luz(t, x + 0.5, 37, 7, 6, '#ffd070', 0.3, 3)
    return t.im


def varal():
    """O varal de bandeirinhas atravessando a rua, em três quadros (as bandeiras balançam)."""
    cores = ['#ee2f3c', '#ffd21e', '#35a03a', '#3a6cf0', '#ff4f9e', '#ff8a12']
    quadros = []
    for f in range(3):
        t = Tela(W, 22)
        gerador = random.Random(17)
        x0, x1, ponta, meio = 12, 162, 2, 12
        pontos = []
        for x in range(x0, x1 + 1):
            u = (x - x0) / (x1 - x0)
            pontos.append((x, round(ponta + (meio - ponta) * 4 * u * (1 - u))))
        for x, y in pontos:
            t.put(x, y, '#3a2418')
        for k, (x, y) in enumerate(pontos):
            if k % 6 == 3:
                cor = cores[gerador.randrange(len(cores))]
                balanco = ((k // 6 + f) % 3) - 1
                t.rect(x - 1, y + 1, x + 1, y + 2, cor)
                t.put(x + balanco, y + 3, cor)
        quadros.append(t.im)
    return quadros


def exportar(add):
    return {
        'fundo': add('janela-bairro-fundo', fundo()),
        'frente': add('janela-bairro-frente', frente()),
        'varal': add('janela-bairro-varal', varal()),
        'lampioes': LAMPIOES, 'luzesArvore': [list(p) for p in LUZES_ARVORE], 'fonte': list(FONTE), 'luzJanelas': [list(p) for p in LUZ_JANELAS], 'lanterna': list(LANTERNA),
        'chaminesCasa': {str(k): (list(v) if v else None) for k, v in CHAMINES_CASA.items()},
        'casas': {**add('janela-bairro-casas', casas()), 'quantas': QUANTAS},
        'colunas': COLUNAS, 'topos': TOPOS, 'chaos': CHAOS, 'casa': list(CASA), 'w': W, 'h': H,
    }
