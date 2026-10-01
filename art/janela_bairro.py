"""Bairro: a rua à noite com 14 casinhas (uma para cada integrante da turma, cada uma de uma cor), a casa vazia de janelas
fechadas, a praça com chafariz e os postes de luz.
"""

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


def casa(indice):
    """A casa `indice` (0 a 13): parede, telhado, porta, janela com luz e uma chaminé; 14 é a casa vazia (janelas fechadas)."""
    t = Tela(*CASA)
    vazia = indice >= QUANTAS
    parede = '#5a4a58' if vazia else PAREDES[indice % len(PAREDES)]
    telhado = '#3a2e3e' if vazia else TELHADOS[indice % len(TELHADOS)]
    porta = '#3a2a32' if vazia else PORTAS[(indice * 3) % len(PORTAS)]
    t.rect(1, 12, 22, 33, parede)
    t.rect(1, 12, 22, 13, janelas_claro(parede))
    t.rect(1, 32, 22, 33, janelas_escuro(parede))
    # telhado de duas águas com chaminé
    for k in range(11):
        t.rect(0 + k, 11 - k, 23 - k, 11 - k, telhado if k % 3 else janelas_escuro(telhado))
    t.rect(17, 0, 19, 6, janelas_escuro(telhado))
    t.rect(16, 0, 20, 1, telhado)
    # porta e janela
    t.rect(9, 21, 15, 33, porta)
    t.rect(9, 21, 15, 21, janelas_claro(porta))
    t.put(14, 28, '#ffd21e' if not vazia else '#8a8a9a')
    if vazia:
        t.rect(3, 17, 7, 22, '#2a2030')
        t.rect(3, 17, 7, 22, '#3a2e3e')
        t.rect(4, 18, 6, 21, '#2a2030')
        t.rect(17, 17, 21, 22, '#3a2e3e')
        t.rect(18, 18, 20, 21, '#2a2030')
    else:
        t.rect(3, 16, 7, 21, '#6e3c1c')
        t.rect(4, 17, 6, 20, '#ffe27a')
        t.rect(5, 16, 5, 21, '#6e3c1c')
        t.rect(17, 16, 21, 21, '#6e3c1c')
        t.rect(18, 17, 20, 20, '#ffe27a')
        t.rect(19, 16, 19, 21, '#6e3c1c')
    # bandeirinha na porta
    if not vazia:
        t.rect(10, 18, 14, 18, '#ee4c4c')
    return outline(t.im)


def janelas_claro(cor, f=1.18):
    c = rgb(cor)
    return tuple(min(255, int(v * f)) for v in c)


def janelas_escuro(cor, f=0.72):
    c = rgb(cor)
    return tuple(int(v * f) for v in c)


def casas():
    return [casa(i) for i in range(QUANTAS + 1)]


def fundo():
    t = Tela(W, H)
    janelas.degrade(t, 0, 0, W - 1, 56, ['#0c0a22', '#14102e', '#1c1640', '#281e52', '#382a64', '#4a3676'])
    janelas.estrelas(t, 1, 1, W - 1, 12, 14, 51)
    # Primeira rua (entre as duas fileiras) e a praça de baixo.
    t.rect(0, 43, W - 1, 57, '#3a3644')
    t.rect(0, 43, W - 1, 44, '#5a5666')
    for x in range(4, W, 14):
        t.rect(x, 50, x + 6, 50, '#c8c0a0')
    t.rect(0, 57, W - 1, 57, '#26222e')
    t.rect(0, 58, W - 1, H - 1, '#26382e')
    janelas.ruido(t, 0, 58, W - 1, H - 1, 160, 61, ['#344a3a', '#1e2c24', '#3a5440'])
    # Calçada embaixo da fileira de baixo e a praça com chafariz.
    t.rect(0, 93, W - 1, H - 1, '#5a5666')
    t.rect(0, 93, W - 1, 94, '#7a7686')
    for x in range(0, W, 12):
        t.rect(x, 93, x, H - 1, '#4a4656')
    janelas.elipse(t, 88, 108, 17, 7, '#8c8e9a', '#6a6c78')
    janelas.elipse(t, 88, 107, 14, 5, '#56c8ee')
    t.rect(86, 96, 90, 107, '#aeb4c0')
    t.rect(84, 96, 92, 98, '#c8ccd8')
    for dx, dy in ((-3, 0), (-1, -3), (2, -2), (3, 1)):
        t.put(88 + dx, 93 + dy, '#bff0ff')
    # Bancos, árvores e postes.
    for x0 in (14, 142):
        t.rect(x0, 106, x0 + 16, 108, '#8a5a34')
        t.rect(x0, 109, x0 + 1, 112, '#5c3820')
        t.rect(x0 + 15, 109, x0 + 16, 112, '#5c3820')
    for cx in (6, 170):
        janelas.elipse(t, cx, 104, 7, 8, '#1e4a2c')
        t.rect(cx - 1, 108, cx + 1, 116, '#5c3820')
    for x in (12, 62, 112, 162):
        t.rect(x, 36, x + 1, 56, '#3a3844')
        t.rect(x - 1, 34, x + 2, 36, '#ffe27a')
    # Varal de bandeirinhas atravessando a rua.
    janelas.varal(t, 12, 162, 36, 46, 17)
    return t.im


def exportar(add):
    return {
        'fundo': add('janela-bairro-fundo', fundo()),
        'casas': {**add('janela-bairro-casas', casas()), 'quantas': QUANTAS},
        'colunas': COLUNAS, 'topos': TOPOS, 'chaos': CHAOS, 'casa': list(CASA), 'w': W, 'h': H,
    }
