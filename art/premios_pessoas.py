"""Os personagens dos prêmios dos minigames: bonequinhos de cabeça grande que andam pela festa (um por minigame).

Todos saem do mesmo gerador (`pessoa`), com a pele, o cabelo, o chapéu, a roupa e uma coisa na mão de cada um (`item`). 8 quadros de 18x25
(sem contorno; quem exporta contorna): 0 e 1 parado (respirando), 2 a 5 andando, 6 e 7 na ação própria do personagem (os dois quadros da
animação). Olham para a frente; a festa espelha para andar para os dois lados.
"""

import math

from casa import Tela
from janelas import elipse

OX, OY = 3, 4                 # as coordenadas do desenho vão de -3 a 20 na horizontal e de -4 a 24 na vertical (itens grandes e chapéus altos)
LARG, ALT = 24, 29
CX = 9


class Pano(Tela):
    """A tela do personagem: desenha-se em coordenadas lógicas (o corpo no meio, de 5 a 12), e a margem fica para chapéus e itens."""

    def put(self, x, y, cor):
        super().put(round(x) + OX, round(y) + OY, cor)

POSES = {'parado': [0, 1], 'anda': [2, 3, 4, 5], 'acao': [6, 7]}

PELES = {'clara': ('#f6cfa8', '#dca884', '#fbe2c8'), 'media': ('#e8b080', '#c88a5c', '#f4c8a0'), 'morena': ('#d09a68', '#ac7448', '#e4b080'),
         'escura': ('#a06c48', '#7e5030', '#bc8a62'), 'branca': ('#fff4ec', '#e8d0c4', '#ffffff')}


def sombra(cor, k=0.78):
    r, g, b = int(cor[1:3], 16), int(cor[3:5], 16), int(cor[5:7], 16)
    return '#%02x%02x%02x' % (int(r * k), int(g * k), int(b * k))


def luz(cor, k=1.22):
    r, g, b = int(cor[1:3], 16), int(cor[3:5], 16), int(cor[5:7], 16)
    return '#%02x%02x%02x' % (min(255, int(r * k)), min(255, int(g * k)), min(255, int(b * k)))


def disco(t, cx, cy, rx, ry, cor, cor2=None, cor3=None):
    """Elipse sombreada: luz em cima e à esquerda, sombra embaixo e à direita."""
    for y in range(math.floor(cy - ry), math.ceil(cy + ry) + 1):
        for x in range(math.floor(cx - rx), math.ceil(cx + rx) + 1):
            dx, dy = (x - cx) / rx, (y - cy) / ry
            if dx * dx + dy * dy <= 1.0:
                l = -(dx * 0.6 + dy * 0.8)
                t.put(x, y, (cor3 or luz(cor)) if l > 0.55 else (cor2 or sombra(cor)) if l < -0.45 else cor)


# --- Partes -----------------------------------------------------------------------------------------------------------------------
def pernas(t, cfg, pose, i):
    """As duas pernas e os sapatos: parado, ou andando em 4 tempos (pé da frente, passando, pé de trás, passando)."""
    calca, escura = cfg['calca'], sombra(cfg['calca'])
    sapato = cfg.get('sapato', '#3a2418')
    if pose == 'anda':
        passo = [(-1, 1), (0, 0), (1, -1), (0, 0)][i]
        esq, dir_ = passo
    else:
        esq = dir_ = 0
    for lado, x0, dx in ((-1, 6, esq), (1, 10, dir_)):
        alto = 1 if (pose == 'anda' and dx == 0 and i in (1, 3) and lado == (1 if i == 1 else -1)) else 0
        topo = 19
        base = 23 - alto
        t.rect(x0 + dx, topo, x0 + dx + 1, base, calca)
        t.put(x0 + dx + 1, topo + 1, escura)
        t.put(x0 + dx + 1, topo + 2, escura)
        # o sapato (maior que a perna)
        t.rect(x0 + dx - (1 if lado < 0 else 0), base + 1, x0 + dx + (2 if lado > 0 else 1), base + 1, sapato)
        t.rect(x0 + dx, base, x0 + dx + 1, base, sapato)


def tronco(t, cfg, dy=0):
    """O corpo: camisa com sombra do lado direito e o detalhe da roupa (listras, xadrez, avental, colete, macacão, vestido)."""
    camisa = cfg['camisa']
    claro, escuro = luz(camisa, 1.18), sombra(camisa)
    x0, x1, y0, y1 = 5, 12, 12 + dy, 19 + dy
    t.rect(x0, y0, x1, y1, camisa)
    t.rect(x0, y0, x0, y1, claro)
    t.rect(x1, y0, x1, y1, escuro)
    t.rect(x0, y1, x1, y1, escuro)
    roupa = cfg.get('roupa', 'liso')
    if roupa == 'listras':
        for y in range(y0 + 1, y1, 2):
            t.rect(x0, y, x1, y, cfg.get('listra', '#ffffff'))
    elif roupa == 'xadrez':
        for y in range(y0 + 1, y1, 3):
            t.rect(x0, y, x1, y, cfg.get('listra', escuro))
        for x in range(x0 + 1, x1, 3):
            t.rect(x, y0, x, y1, cfg.get('listra', escuro))
    elif roupa == 'avental':
        t.rect(x0 + 1, y0 + 1, x1 - 1, y1, cfg.get('listra', '#fffaf0'))
        t.rect(x1 - 1, y0 + 1, x1 - 1, y1, '#d8d0c0')
        t.put(x0 + 2, y0 + 3, '#d8d0c0')
    elif roupa == 'colete':
        t.rect(x0, y0, x0 + 1, y1, cfg.get('listra', '#6a4a2a'))
        t.rect(x1 - 1, y0, x1, y1, cfg.get('listra', '#6a4a2a'))
        t.rect(CX, y0 + 1, CX, y1 - 1, luz(camisa))
    elif roupa == 'macacao':
        t.rect(x0, y0 + 3, x1, y1, cfg.get('listra', '#3e5a9a'))
        t.rect(x0 + 1, y0, x0 + 1, y0 + 3, cfg.get('listra', '#3e5a9a'))
        t.rect(x1 - 1, y0, x1 - 1, y0 + 3, cfg.get('listra', '#3e5a9a'))
        t.put(x0 + 1, y0 + 4, '#ffd21e')
        t.put(x1 - 1, y0 + 4, '#ffd21e')
        t.rect(CX - 1, y0 + 5, CX + 1, y0 + 6, sombra(cfg.get('listra', '#3e5a9a')))
    elif roupa == 'vestido':
        t.rect(x0, y1, x1, y1 + 1, camisa)
        t.rect(x0 - 1, y1 + 1, x1 + 1, y1 + 2, camisa)
        t.rect(x0 - 1, y1 + 2, x1 + 1, y1 + 2, escuro)
        for x, y in ((x0 + 1, y0 + 2), (x0 + 4, y0 + 4), (x0 + 6, y0 + 1), (x0 + 2, y0 + 6)):
            t.put(x, y, cfg.get('listra', '#ffffff'))
    elif roupa == 'tunica':
        t.rect(x0 - 1, y0 + 4, x1 + 1, y1 + 1, camisa)
        t.rect(x0 - 1, y1 + 1, x1 + 1, y1 + 1, escuro)
        for x in range(x0, x1 + 1, 3):
            t.put(x, y0 + 1, cfg.get('listra', '#ffe27a'))
    elif roupa == 'colorido':
        for k, cor in enumerate(('#ee2f3c', '#ffd21e', '#3a6cf0', '#35a03a')):
            t.rect(x0 + (k % 2) * 4, y0 + (k // 2) * 4, x0 + (k % 2) * 4 + 3, y0 + (k // 2) * 4 + 3, cor)
    t.put(CX, y0, sombra(camisa, 0.6))


def braco(t, cfg, lado, dy=0, alto=False, estendido=False):
    """Um braço (manga + mão). `alto`: levantado ao lado da cabeça; `estendido`: para o lado, na altura do ombro."""
    manga = cfg.get('manga', cfg['camisa'])
    pele = PELES[cfg['pele']][0]
    x = 4 if lado < 0 else 13
    if alto:
        t.rect(x + lado, 8 + dy, x + lado + 1, 13 + dy, manga)
        t.rect(x + lado, 6 + dy, x + lado + 1, 7 + dy, pele)
        return (x + lado, 6 + dy)
    if estendido:
        xe = x + lado * 2
        t.rect(min(x, xe), 12 + dy, max(x, xe) + 1, 13 + dy, manga)
        t.rect(xe + lado, 12 + dy, xe + lado + 1, 13 + dy, pele)
        return (xe + lado, 12 + dy)
    t.rect(x, 12 + dy, x + 1, 17 + dy, manga)
    t.put(x, 12 + dy, luz(manga))
    t.rect(x, 18 + dy, x + 1, 19 + dy, pele)
    return (x, 18 + dy)


def cabeca(t, cfg, dy=0, boca='sorriso', pisca=False):
    pele, escura, clara = PELES[cfg['pele']]
    disco(t, CX, 7 + dy, 4.7, 4.9, pele, escura, clara)
    # orelhas
    t.put(CX - 5, 8 + dy, escura)
    t.put(CX + 5, 8 + dy, escura)
    # olhos (ou pano nos olhos), bochechas e boca
    if cfg.get('venda'):
        t.rect(CX - 4, 6 + dy, CX + 4, 8 + dy, cfg['venda'])
        t.put(CX + 5, 7 + dy, cfg['venda'])
        t.put(CX - 5, 7 + dy, cfg['venda'])
        t.put(CX - 2, 7 + dy, luz(cfg['venda']))
    elif cfg.get('oculos'):
        for lado in (-1, 1):
            x = CX + lado * 2
            t.rect(x - 1, 6 + dy, x + 1, 8 + dy, cfg['oculos'])
            t.put(x, 7 + dy, '#d8ecfa')
            t.put(x - lado, 7 + dy, '#26242e' if not pisca else '#d8ecfa')
        t.put(CX, 7 + dy, cfg['oculos'])
    else:
        for lado in (-1, 1):
            x = CX + lado * 2
            if pisca:
                t.rect(x - 1, 7 + dy, x, 7 + dy, '#26242e')
            else:
                t.rect(x, 6 + dy, x, 7 + dy, '#26242e')
                t.put(x - 1, 6 + dy, '#ffffff')
    if cfg.get('nariz'):
        t.put(CX, 9 + dy, cfg['nariz'])
        t.put(CX - 1, 9 + dy, cfg['nariz'])
        t.put(CX, 8 + dy, cfg['nariz'])
    if cfg.get('bochecha', True) and not cfg.get('venda'):
        t.put(CX - 4, 9 + dy, '#ee8a8a')
        t.put(CX + 4, 9 + dy, '#ee8a8a')
    if boca == 'sorriso':
        t.rect(CX - 1, 10 + dy, CX + 1, 10 + dy, '#8a2a2a')
        t.put(CX - 2, 9 + dy, '#8a2a2a')
        t.put(CX + 2, 9 + dy, '#8a2a2a')
    elif boca == 'aberta':
        t.rect(CX - 1, 10 + dy, CX + 1, 11 + dy, '#5a1816')
        t.rect(CX - 1, 10 + dy, CX + 1, 10 + dy, '#fff4e8')
    elif boca == 'o':
        t.rect(CX, 10 + dy, CX, 11 + dy, '#5a1816')
        t.rect(CX - 1, 10 + dy, CX + 1, 10 + dy, '#8a2a2a')
    elif boca == 'reta':
        t.rect(CX - 1, 10 + dy, CX + 1, 10 + dy, '#8a3a3a')
    if cfg.get('bigode'):
        t.rect(CX - 3, 9 + dy, CX + 3, 9 + dy, cfg['bigode'])
        t.put(CX - 4, 10 + dy, cfg['bigode'])
        t.put(CX + 4, 10 + dy, cfg['bigode'])
    if cfg.get('barba'):
        for x in range(CX - 4, CX + 5):
            t.put(x, 10 + dy, cfg['barba'])
        t.rect(CX - 3, 11 + dy, CX + 3, 11 + dy, cfg['barba'])
        t.rect(CX - 2, 12 + dy, CX + 2, 12 + dy, sombra(cfg['barba'], 0.85))
        if cfg.get('barba_longa'):
            t.rect(CX - 2, 13 + dy, CX + 2, 14 + dy, cfg['barba'])
            t.rect(CX - 1, 15 + dy, CX + 1, 15 + dy, cfg['barba'])
    if cfg.get('nariz_palhaco'):
        t.rect(CX - 1, 8 + dy, CX, 9 + dy, '#ee2f3c')
        t.put(CX - 1, 8 + dy, '#ff8a8a')
    if cfg.get('maquiagem') == 'palhaco':
        t.put(CX - 2, 5 + dy, '#3a6cf0')
        t.put(CX + 2, 5 + dy, '#3a6cf0')
        t.rect(CX - 5, 9 + dy, CX - 4, 9 + dy, '#ee2f3c')
        t.rect(CX + 4, 9 + dy, CX + 5, 9 + dy, '#ee2f3c')


def cabelo(t, cfg, dy=0, parte='frente'):
    """O cabelo. `parte`: 'tras' (o que aparece atrás da cabeça: afro, coque, cabelo longo e tranças) ou 'frente' (a calota do alto e a franja, por
    cima do rosto, sem cobrir os olhos)."""
    estilo = cfg.get('cabelo', 'curto')
    cor = cfg.get('cabelo_cor', '#3a2a22')
    luzc, escuro = luz(cor, 1.3), sombra(cor, 0.7)
    if estilo == 'careca':
        return
    if parte == 'tras':
        if estilo == 'afro':
            disco(t, CX, 4 + dy, 6.8, 5.4, cor, escuro, luzc)
        elif estilo == 'longo':
            t.rect(CX - 5, 4 + dy, CX + 5, 15 + dy, cor)
            t.rect(CX + 3, 8 + dy, CX + 5, 15 + dy, escuro)
        elif estilo == 'coque':
            disco(t, CX, 0 + dy, 2.6, 2.2, cor, escuro, luzc)
        elif estilo == 'tranca':
            for lado in (-1, 1):
                x = CX + lado * 5
                for y in range(6 + dy, 14 + dy):
                    t.put(x, y, cor if (y % 2) else escuro)
                    t.put(x + lado, y, escuro if (y % 2) else cor)
                t.put(x, 14 + dy, '#ee2f3c')
                t.put(x + lado, 14 + dy, '#ee2f3c')
        return
    if estilo == 'lateral':
        for lado in (-1, 1):
            t.rect(CX + lado * 5 - (0 if lado > 0 else 0), 5 + dy, CX + lado * 5, 9 + dy, cor)
            t.rect(CX + lado * 4, 6 + dy, CX + lado * 4, 8 + dy, escuro)
        return
    # a calota do alto (da testa para cima)
    for y, meia in ((1, 2.6), (2, 4.4), (3, 5.2), (4, 5.4), (5, 5.4)):
        for x in range(-6, 7):
            if abs(x) <= meia:
                l = -(x / 6.0 * 0.6 + (y - 3) / 3.0 * 0.8)
                t.put(CX + x, y + dy, luzc if l > 0.5 else escuro if l < -0.5 else cor)
    # as laterais (costeletas)
    for lado in (-1, 1):
        t.rect(CX + lado * 5, 5 + dy, CX + lado * 5, 8 + dy, cor)
    # a franja deixa a testa e os olhos livres
    if estilo in ('curto', 'cacho', 'rebelde', 'longo', 'tranca', 'coque', 'afro'):
        for x in (-4, -3, -1, 1, 3, 4):
            t.put(CX + x, 5 + dy, cor)
    if estilo == 'cacho':
        for x in range(-5, 6, 2):
            t.put(CX + x, 1 + dy, cor)
            t.put(CX + x, 2 + dy, luzc)
    if estilo == 'rebelde':
        for x in (-3, 0, 3):
            t.put(CX + x, 0 + dy, cor)


def chapeu(t, cfg, dy=0):
    tipo = cfg.get('chapeu')
    if not tipo:
        return
    cor = cfg.get('chapeu_cor', '#e8c44a')
    escuro, claro = sombra(cor, 0.72), luz(cor, 1.2)
    top = 3 + dy
    if tipo == 'palha':
        t.rect(CX - 8, top + 1, CX + 8, top + 2, cor)
        t.rect(CX - 8, top + 2, CX + 8, top + 2, escuro)
        t.rect(CX - 4, top - 3, CX + 4, top, cor)
        t.rect(CX - 4, top, CX + 4, top, escuro)
        t.rect(CX - 4, top - 1, CX + 4, top - 1, cfg.get('fita', '#c85a2a'))
        for x in range(CX - 3, CX + 4, 2):
            t.put(x, top - 2, claro)
    elif tipo == 'cowboy':
        t.rect(CX - 7, top + 1, CX + 7, top + 1, cor)
        t.rect(CX - 8, top, CX - 7, top, cor)
        t.rect(CX + 7, top, CX + 8, top, cor)
        t.rect(CX - 4, top - 3, CX + 4, top, cor)
        t.rect(CX - 4, top, CX + 4, top, escuro)
        t.put(CX, top - 3, escuro)
    elif tipo == 'bone':
        t.rect(CX - 5, top - 1, CX + 5, top + 1, cor)
        t.rect(CX - 4, top - 2, CX + 4, top - 2, cor)
        t.rect(CX - 7, top + 1, CX - 4, top + 1, escuro)
        t.rect(CX - 6, top + 2, CX - 4, top + 2, escuro)
        t.put(CX, top - 2, claro)
        t.rect(CX - 1, top - 1, CX + 1, top, luz(cor, 1.5))
    elif tipo == 'cone':
        for k in range(7):
            t.rect(CX - 5 + k // 2, top + 1 - k, CX + 5 - k // 2, top + 1 - k, cor if k % 2 else escuro)
        t.rect(CX - 6, top + 1, CX + 6, top + 2, escuro)
        t.put(CX - 1, top - 2, '#ffd21e')
        t.put(CX + 2, top - 4, '#ffd21e')
        t.put(CX + 1, top, '#ffd21e')
        t.put(CX, top - 6, '#ffd21e')
    elif tipo == 'turbante':
        disco(t, CX, top, 5.6, 3.6, cor, escuro, claro)
        for k in range(4):
            t.line(CX - 5 + k, top + 1 - k // 2, CX + 2 + k, top - 3 + k // 2, escuro)
        t.put(CX, top, '#ffd21e')
        t.put(CX, top - 1, '#ee2f3c')
    elif tipo == 'lenco':
        t.rect(CX - 5, top, CX + 5, top + 2, cor)
        t.rect(CX - 5, top + 3, CX - 4, top + 5, cor)
        t.rect(CX + 4, top + 3, CX + 5, top + 5, cor)
        t.rect(CX + 3, top + 4, CX + 6, top + 6, claro)
        t.put(CX - 2, top, claro)
        t.put(CX + 1, top + 1, claro)
    elif tipo == 'chef':
        t.rect(CX - 4, top - 4, CX + 4, top - 1, '#fffaf0')
        t.rect(CX - 5, top - 5, CX + 5, top - 3, '#fffaf0')
        t.rect(CX - 4, top, CX + 4, top, '#e8e0d0')
        t.put(CX - 2, top - 3, '#e8e0d0')
        t.put(CX + 2, top - 4, '#e8e0d0')
    elif tipo == 'aba':
        t.rect(CX - 7, top + 1, CX + 7, top + 1, cor)
        t.rect(CX - 8, top + 2, CX + 8, top + 2, escuro)
        t.rect(CX - 4, top - 2, CX + 4, top, cor)
        t.rect(CX - 4, top, CX + 4, top, escuro)
    elif tipo == 'cartola':
        t.rect(CX - 6, top, CX + 6, top + 1, cor)
        t.rect(CX - 4, top - 5, CX + 4, top - 1, cor)
        t.rect(CX - 4, top - 2, CX + 4, top - 2, cfg.get('fita', '#ee2f3c'))
    elif tipo == 'boina':
        disco(t, CX, top, 5.6, 2.6, cor, escuro, claro)
        t.put(CX + 3, top - 3, cor)
    elif tipo == 'colorido':
        t.rect(CX - 3, top - 3, CX + 3, top, '#ee2f3c')
        t.rect(CX - 3, top - 3, CX - 1, top - 2, '#ffd21e')
        t.rect(CX + 1, top - 3, CX + 3, top - 2, '#3a6cf0')
        t.put(CX, top - 4, '#ffffff')
        t.put(CX, top - 5, '#ffd21e')


# --- O quadro ---------------------------------------------------------------------------------------------------------------------
def pessoa(cfg, quadro):
    """O quadro `quadro` (0 a 7) do personagem descrito por `cfg`. `cfg['item'](t, pose, i, cfg, mao)` desenha o que ele carrega; se `cfg` tem
    `acao`, essa função desenha a ação nos quadros 6 e 7."""
    t = Pano(LARG, ALT)
    pose = 'parado' if quadro < 2 else 'anda' if quadro < 6 else 'acao'
    i = quadro if quadro < 2 else quadro - 2 if quadro < 6 else quadro - 6
    # O corpo todo sobe e desce um pouquinho (respirar e passos).
    dy = 0
    if pose == 'parado':
        dy = 1 if i == 1 else 0
    elif pose == 'anda':
        dy = 1 if i in (1, 3) else 0
    elif pose == 'acao':
        dy = 0
    pernas(t, cfg, pose, i if pose == 'anda' else 0)
    if cfg.get('atras'):
        cfg['atras'](t, pose, i, cfg)
    tronco(t, cfg, dy)
    # Os braços: balançam ao andar, levantam na ação.
    mao_dir = mao_esq = None
    if pose == 'anda':
        sw = [1, 0, -1, 0][i]
        mao_esq = braco(t, cfg, -1, dy + sw)
        mao_dir = braco(t, cfg, 1, dy - sw)
    elif pose == 'acao':
        mao_esq = braco(t, cfg, -1, dy, estendido=cfg.get('acao_esq') == 'estendido', alto=cfg.get('acao_esq') == 'alto')
        mao_dir = braco(t, cfg, 1, dy, alto=cfg.get('acao_dir', 'alto') == 'alto', estendido=cfg.get('acao_dir') == 'estendido')
    else:
        mao_esq = braco(t, cfg, -1, dy)
        mao_dir = braco(t, cfg, 1, dy)
    if cfg.get('item'):
        cfg['item'](t, pose, i, cfg, mao_esq, mao_dir, dy)
    boca = cfg.get('boca', 'sorriso')
    if pose == 'acao' and cfg.get('fala'):
        boca = 'aberta' if i == 0 else 'o'
    pisca = pose == 'parado' and i == 1 and cfg.get('pisca', True) and quadro == 1 and False
    cabelo(t, cfg, dy, 'tras')
    cabeca(t, cfg, dy, boca=boca, pisca=pisca)
    cabelo(t, cfg, dy, 'frente')
    chapeu(t, cfg, dy)
    if cfg.get('frente'):
        cfg['frente'](t, pose, i, cfg, dy)
    return t.im


def quadros(cfg):
    return [pessoa(cfg, q) for q in range(8)]
