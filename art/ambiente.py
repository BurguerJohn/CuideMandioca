"""Ferramentas de ambiente para o fundo das janelas: luz que mistura com o que já está pintado, sombra, céu em degradê
tramado, nuvens, plantas e peças soltas (lampião, barril, pedra...). Tudo em pixels inteiros, no estilo do resto do jogo.

As funções recebem uma `Tela` (art/casa.py) e mexem direto nos pixels dela.
"""

import math
import random

from casa import rgb


# --- Cor ---------------------------------------------------------------------------------------------------------------
def misturar(cor_a, cor_b, f):
    """`cor_a` indo para `cor_b` (f de 0 a 1), os dois como tuplas RGB."""
    return tuple(round(a + (b - a) * f) for a, b in zip(cor_a[:3], cor_b[:3]))


def tingir(tela, x, y, cor, f):
    """Mistura o pixel de (x, y) com `cor` (só onde já tem tinta)."""
    x, y = round(x), round(y)
    if 0 <= x < tela.w and 0 <= y < tela.h:
        atual = tela.px[x, y]
        if atual[3]:
            tela.px[x, y] = misturar(atual, rgb(cor), f) + (255,)


# --- Luz e sombra ------------------------------------------------------------------------------------------------------
def luz(tela, cx, cy, rx, ry, cor, forca=0.5, passos=4):
    """Poça de luz: `passos` anéis de elipse, cada um mais claro para o centro, tramados nas bordas (nada de degradê liso)."""
    cor = rgb(cor)
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            d = math.hypot((x - cx) / rx, (y - cy) / ry)
            if d >= 1:
                continue
            nivel = (1 - d) * passos
            degrau = int(nivel)
            frac = nivel - degrau
            if frac > 0.5 and (x + y) % 2 == 0:
                degrau += 1
            elif frac > 0.25 and frac <= 0.5 and (x % 2 == 0 and y % 2 == 0):
                degrau += 1
            if degrau > 0:
                tingir(tela, x, y, cor, min(1.0, forca * degrau / passos))


def sombra(tela, cx, cy, rx, ry, forca=0.35, cor='#0c0a1e'):
    """Elipse que escurece o que está embaixo."""
    cor = rgb(cor)
    for y in range(int(cy - ry), int(cy + ry) + 1):
        for x in range(int(cx - rx), int(cx + rx) + 1):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                tingir(tela, x, y, cor, forca)


# --- Céu ---------------------------------------------------------------------------------------------------------------
def ceu(tela, x0, y0, x1, y1, cores):
    """Faixas horizontais de céu com a divisa tramada (uma linha xadrez entre uma faixa e a seguinte)."""
    altura = y1 - y0 + 1
    for k, cor in enumerate(cores):
        ya = y0 + k * altura // len(cores)
        yb = y0 + (k + 1) * altura // len(cores) - 1
        tela.rect(x0, ya, x1, yb, cor)
        if k + 1 < len(cores):
            proxima = cores[k + 1]
            for x in range(x0, x1 + 1):
                if x % 2 == 0:
                    tela.put(x, yb, proxima)
                if (x + 1) % 2 == 0 and yb - 1 >= ya:
                    tela.put(x, yb - 1, cor)


def nuvem(tela, x, y, largura, cor, luzinha, sombrinha):
    """Nuvem achatada: bolotas de elipse juntas; a borda de cima pega a luz da lua e a de baixo fica na sombra."""
    gerador = random.Random(x * 31 + y)
    alto = max(4, largura // 5)
    colunas = {}
    n = max(3, largura // 8)
    for i in range(n):
        cx = x + (i + 0.5) * largura / n + gerador.randrange(-1, 2)
        rx = largura / n * 0.95 + gerador.randrange(0, 3)
        ry = alto * (0.55 + 0.45 * math.sin(math.pi * (i + 0.5) / n)) * 0.5 + 1
        for px in range(int(cx - rx) - 1, int(cx + rx) + 2):
            for py in range(int(y - ry) - 1, int(y + ry) + 2):
                if ((px - cx) / rx) ** 2 + ((py - y) / ry) ** 2 <= 1:
                    topo, base = colunas.get(px, (py, py))
                    colunas[px] = (min(topo, py), max(base, py))
    for px, (topo, base) in colunas.items():
        for py in range(topo, base + 1):
            if py == topo:
                tela.put(px, py, luzinha)
            elif py >= base - 1 and base - topo >= 2:
                tela.put(px, py, sombrinha)
            else:
                tela.put(px, py, cor)


def lua(tela, cx, cy, r, cor='#fff3c4', sombra_cor='#e8d596', halo='#fff3c4'):
    """Lua cheia com crateras e uma auréola tramada."""
    luz(tela, cx, cy, r * 3, r * 3, halo, 0.22, 4)
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r + r // 2:
                tela.put(x, y, cor)
    for dx, dy, rr in ((-r // 3, -r // 4, 1), (r // 3, r // 5, 1), (0, r // 2, 1)):
        tela.rect(cx + dx, cy + dy, cx + dx + rr, cy + dy + rr - 1, sombra_cor)
    tela.put(cx - r // 2, cy + r // 3, sombra_cor)


# --- Plantas e peças ---------------------------------------------------------------------------------------------------------
def moita(tela, cx, base, largura, altura, cores, semente=1):
    """Moita arredondada: bolotas verdes com luz do lado de cima e sombra de baixo."""
    gerador = random.Random(semente)
    escura, media, clara = cores
    for _ in range(largura // 2):
        px = cx + gerador.randrange(-largura // 2, largura // 2 + 1)
        r = gerador.randrange(max(2, altura // 3), altura // 2 + 1)
        py = base - r + gerador.randrange(-1, 2)
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                if dx * dx + dy * dy <= r * r:
                    tela.put(px + dx, py + dy, escura if dy > r // 3 else clara if dy < -r // 2 and dx < 1 else media)


def flor(tela, x, y, cor, miolo='#ffd21e', haste='#2e8a44'):
    """Florzinha de 3x3 com haste: pétalas em cruz e miolo."""
    tela.rect(x, y + 1, x, y + 3, haste)
    for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        tela.put(x + dx, y + dy, cor)
    tela.put(x, y, miolo)


def pedra(tela, cx, cy, rx, ry, cores):
    """Pedra lisa: luz em cima, sombra embaixo e uma sombrinha no chão."""
    escura, media, clara = cores
    sombra(tela, cx + 1, cy + ry, rx + 1, 1, 0.4, '#102010')
    for y in range(cy - ry, cy + ry + 1):
        for x in range(cx - rx, cx + rx + 1):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                tela.put(x, y, escura if y > cy + ry // 3 else clara if (y < cy - ry // 3 and x < cx + 1) else media)


def barril(tela, x, y, larg, alt, madeira=('#8a5a34', '#b07a48', '#5c3a1e'), aro='#3a2418'):
    """Barril de pé: tábuas verticais, dois aros e a tampa de cima."""
    medio, claro, escuro = madeira
    tela.rect(x, y, x + larg - 1, y + alt - 1, medio)
    for dx in range(0, larg, 3):
        tela.rect(x + dx, y, x + dx, y + alt - 1, claro if dx % 6 == 0 else escuro)
    tela.rect(x, y + 2, x + larg - 1, y + 2, aro)
    tela.rect(x, y + alt - 3, x + larg - 1, y + alt - 3, aro)
    tela.rect(x, y, x + larg - 1, y, claro)
    tela.rect(x + larg - 1, y, x + larg - 1, y + alt - 1, escuro)
    tela.put(x, y, escuro)
    tela.put(x + larg - 1, y, escuro)


def lampiao(tela, x, topo, base, chama='#ffd86a', luz_cor='#ffb040'):
    """Poste com lampião no alto (vidro com chama) e a luz dele caindo no chão (a poça fica por conta de quem chama)."""
    tela.rect(x, topo + 5, x + 1, base, '#4a2c18')
    tela.rect(x, topo + 5, x, base, '#6e3c1c')
    tela.rect(x - 2, topo + 3, x + 3, topo + 4, '#2a1a10')
    tela.rect(x - 2, topo, x + 3, topo + 2, '#2a1a10')
    tela.rect(x - 1, topo + 1, x + 2, topo + 2, chama)
    tela.rect(x - 1, topo - 1, x + 2, topo - 1, '#2a1a10')
    tela.put(x, topo + 1, '#fff6c8')
    tela.put(x + 1, topo + 1, '#fff6c8')
    tela.put(x, topo - 2, '#2a1a10')
    tela.put(x + 1, topo - 2, '#2a1a10')
    luz(tela, x + 0.5, topo + 1.5, 12, 12, luz_cor, 0.32, 3)


def cogumelo(tela, x, y, chapeu='#e0343e', pinta='#f8f4ea'):
    tela.rect(x, y + 1, x + 1, y + 2, '#f2dcb4')
    tela.rect(x - 1, y - 1, x + 2, y, chapeu)
    tela.put(x, y - 1, pinta)
    tela.put(x + 2, y, pinta)


def balde(tela, x, y, cor='#8a8d98', luz_cor='#bcc0cc'):
    """Balde de lata: boca larga, corpo afunilado e alça."""
    tela.rect(x, y, x + 6, y, luz_cor)
    tela.rect(x, y + 1, x + 6, y + 5, cor)
    tela.rect(x + 1, y + 6, x + 5, y + 6, '#5a5d68')
    tela.rect(x + 6, y + 1, x + 6, y + 5, '#6e717e')
    tela.put(x + 1, y - 1, '#3a3c48')
    tela.put(x + 5, y - 1, '#3a3c48')
    tela.rect(x + 2, y - 2, x + 4, y - 2, '#3a3c48')


def gradiente(tela, x0, y0, x1, y1, cor, topo, base, passos=6):
    """Mistura `cor` por cima do que está pintado, indo da força `topo` (primeira linha) à `base` (última), em degraus tramados."""
    cor = rgb(cor)
    altura = max(1, y1 - y0)
    bayer = ((0, 2), (3, 1))
    for y in range(y0, y1 + 1):
        f = topo + (base - topo) * (y - y0) / altura
        nivel = f * passos
        degrau = int(nivel)
        for x in range(x0, x1 + 1):
            limiar = (bayer[y % 2][x % 2] + 0.5) / 4
            d = degrau + (1 if nivel - degrau > limiar else 0)
            if d > 0:
                tingir(tela, x, y, cor, min(1.0, d / passos))
