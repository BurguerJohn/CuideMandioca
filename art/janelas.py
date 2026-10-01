"""Arte das janelas extras da festa (src/janela-<id>.js): os fundos e peças de cada janela, mais os ícones dos botões da placa.

Cada janela tem o seu módulo (`janela_<id>.py`) com uma função `exportar(add)` que devolve o trecho dela do manifesto
(`manifest['janelas'][id]`); aqui ficam as ferramentas comuns (degradê, ruído, elipse...) e os ícones.
"""

import random

from casa import Tela, rgb, LEG


# --- Ferramentas --------------------------------------------------------------------------------------------------------
def degrade(tela, x0, y0, x1, y1, cores):
    """Faixas horizontais de `y0` a `y1`, de cima para baixo, passando pelas `cores` (lista de cores, cada uma uma faixa)."""
    altura = y1 - y0 + 1
    for k, cor in enumerate(cores):
        ya = y0 + k * altura // len(cores)
        yb = y0 + (k + 1) * altura // len(cores) - 1
        tela.rect(x0, ya, x1, yb, cor)


def estrelas(tela, x0, y0, x1, y1, quantas, semente, cores=('#fff6e0', '#ffe27a', '#bcd0ff')):
    gerador = random.Random(semente)
    for _ in range(quantas):
        tela.put(gerador.randrange(x0, x1), gerador.randrange(y0, y1), gerador.choice(cores))


def elipse(tela, cx, cy, rx, ry, cor, cor2=None):
    """Elipse cheia; `cor2` pinta a metade de baixo (sombra)."""
    for y in range(int(cy - ry), int(cy + ry) + 1):
        for x in range(int(cx - rx), int(cx + rx) + 1):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                tela.put(x, y, cor2 if cor2 and y > cy + ry * 0.35 else cor)


def ruido(tela, x0, y0, x1, y1, quantas, semente, cores):
    gerador = random.Random(semente)
    for _ in range(quantas):
        tela.put(gerador.randrange(x0, x1 + 1), gerador.randrange(y0, y1 + 1), gerador.choice(cores))


def varal(tela, x0, x1, y_ponta, y_meio, semente=3):
    """Varal de bandeirinhas de um poste ao outro (corda curva com triângulos coloridos)."""
    cores = ['#ee2f3c', '#ffd21e', '#35a03a', '#3a6cf0', '#ff4f9e', '#ff8a12']
    gerador = random.Random(semente)
    pontos = []
    for x in range(x0, x1 + 1):
        t = (x - x0) / (x1 - x0)
        y = y_ponta + (y_meio - y_ponta) * 4 * t * (1 - t)
        pontos.append((x, round(y)))
        tela.put(x, round(y), '#3a2418')
    for k, (x, y) in enumerate(pontos):
        if k % 6 == 3:
            cor = cores[gerador.randrange(len(cores))]
            tela.rect(x - 1, y + 1, x + 1, y + 2, cor)
            tela.put(x, y + 3, cor)


def poste(tela, x, y0, y1, cor='#6e3c1c', luz='#9a5a2c'):
    tela.rect(x, y0, x + 1, y1, cor)
    tela.rect(x, y0, x, y1, luz)


# --- Ícones dos botões da placa (11x10) ----------------------------------------------------------------------------------
ICONES = {
    'bichos': ['....rr.....', '...rwwr....', '...wwwwy...', '..wwwwwyy..', '.wwwwwwww..', '.wwwwwwww..', '..wwwwww...', '...wwww....', '....o.o.....', '...oo.oo....'],
    'aquario': ['...........', '..cccccccc.', '.cbbbbbbbc.', '.cbboobbbc.', '.cboooobbc.', '.cbboooybc.', '.cbbbbbbbc.', '.cLLbbbLLc.', '.ctttttttc.', '..ccccccc..'],
    'horta': ['...l.l.l...', '..lLlLlLl..', '...L.L.L...', '..ooo.ooo..', '..ooo.ooo..', '...o...o...', 'nnnnnnnnnnn', 'NnNnNnNnNnN', 'NNNNNNNNNNN', '...........'],
    'fogueira': ['....y......', '...yoy.....', '..yoroy.y..', '.yorrroyy..', '.yorrrroy..', '..orRRro...', '..nnrrnn...', '.nNnnnnNn..', '.NNNnnNNN..', '...........'],
    'palco': ['rrrrrrrrrrr', 'rRrRrRrRrRr', 'r.........r', 'r..y...y..r', 'r.yyy.yyy.r', 'r..k...k..r', 'r.........r', 'nnnnnnnnnnn', 'NNNNNNNNNNN', '...........'],
    'provador': ['....yy.....', '...y..y....', '....yy.....', '...yyyy....', '..yyyyyy...', '.rrrrrrrrr.', '.rrbbbbrrr.', '.rrbbbbrrr.', '..rrrrrrr..', '...........'],
    'ceu': ['....y......', '...yyy..y..', '..yyyyy.yy.', '...yyy.yyy.', '..y.y.y.y..', '.y..y..y...', '.......y...', 'bbbbbbbbbbb', 'BBBBBBBBBBB', '...........'],
    'bairro': ['..r....r...', '.rrr..rrr..', 'rrrrrrrrrr.', 'tttt.tttt..', 'tbbt.tbbt..', 'ttttntttt..', 'tttnntttt..', 'GGGGGGGGGG.', '...........', '...........'],
}
ICONE_LEG = {'r': '#e0343e', 'R': '#9a1a2e', 'w': '#f8f4ea', 'y': '#ffd21e', 'o': '#ff8a12', 'b': '#3a78d8', 'B': '#1a3a8a', 'c': '#8fd4ee',
             'l': '#56c860', 'L': '#2e8a44', 'n': '#8a5a34', 'N': '#5a3a20', 't': '#f8e0b0', 'k': '#26242e', 'G': '#56a050', 'g': '#9a9ca8'}


def icones():
    saida = {}
    for nome, linhas in ICONES.items():
        tela = Tela(11, 10)
        tela.grade(linhas, 0, 0, {k: rgb(v) for k, v in ICONE_LEG.items()})
        saida[nome] = tela.im
    return saida


# --- Exportação ---------------------------------------------------------------------------------------------------------------
def exportar(add, icons):
    """Junta a arte das janelas no pacote e devolve o `manifest['janelas']`."""
    import janela_bichos
    import janela_aquario
    import janela_horta
    import janela_fogueira
    import janela_palco
    import janela_provador
    import janela_ceu
    import janela_bairro
    for nome, imagem in icones().items():
        icons[f'ui:{nome}'] = imagem
    return {'bichos': janela_bichos.exportar(add), 'aquario': janela_aquario.exportar(add), 'horta': janela_horta.exportar(add), 'fogueira': janela_fogueira.exportar(add), 'palco': janela_palco.exportar(add), 'provador': janela_provador.exportar(add), 'ceu': janela_ceu.exportar(add), 'bairro': janela_bairro.exportar(add)}
