"""Cordel da Mandioca: as 20 ilustrações animadas (art/livro_a.py a livro_d.py) e os ícones pequenos da janela. Cada página vira uma folha de 8
quadros (4 do laço e 4 da reação ao clique) com o que o jogo precisa para montar a cena: onde a Mandioca fica, o retângulo que se clica e quem
da turma aparece. Quem desenha é src/janela-cordel.js.
"""

import importlib

import livro_base
from casa import Tela, rgb
from render import outline

for _modulo in ('livro_a', 'livro_a2', 'livro_b', 'livro_c', 'livro_d'):
    importlib.import_module(_modulo)

W, H = 224, 160
CENA = 112                      # altura da ilustração; embaixo ficam o texto e os botões
PAGINAS = 20


def quadros(pagina):
    """Os 8 quadros da página: 4 do laço (reação desligada) e 4 da reação ao clique."""
    fundo = Tela(livro_base.W, livro_base.H)
    pagina.fundo(fundo)
    saida = []
    for k in range(4):
        t = livro_base.copiar(fundo)
        pagina.animar(t, k, None)
        saida.append(t.im)
    for r in range(4):
        t = livro_base.copiar(fundo)
        pagina.animar(t, r, r)
        saida.append(t.im)
    return saida


LEG = {'k': '#26242e', 'r': '#e0343e', 'w': '#f8f4ea', 'y': '#ffd21e', 'Y': '#c8981a', 'o': '#ff8a12', 'n': '#8a5a34', 's': '#f0c8a0', 'g': '#9a9ca8',
       'G': '#56a050'}
ICONES = {
    'esq': ['.........', '....w....', '...ww....', '..www....', '.wwwwwww.', '..www....', '...ww....', '....w....', '.........'],
    'dir': ['.........', '....w....', '....ww...', '....www..', '.wwwwwww.', '....www..', '....ww...', '....w....', '.........'],
    'estrela': ['....y....', '....y....', '...yyy...', 'yyyyyyyyy', '.yyyyyyy.', '..yyyyy..', '..yyyyy..', '.yyy.yyy.', '.yy...yy.'],
    'estrela-vazia': ['....g....', '....g....', '...g.g...', 'ggg...ggg', '.g.....g.', '..g...g..', '..g...g..', '.gg.g.gg.', '.g.....g.'],
    'seta': ['...yyy...', '...yyy...', '...yoy...', '...yoy...', '.yyyoyyy.', '..yyoyy..', '...yoy...', '....y....', '.........'],
    'exclama': ['...rrr...', '...rrr...', '...rrr...', '...rrr...', '...rrr...', '.........', '...rrr...', '...rrr...', '.........'],
    'ponto': ['.........', '.........', '..ggggg..', '.ggkkkgg.', '.gkkkkkg.', '.ggkkkgg.', '..ggggg..', '.........', '.........'],
    'ponto-cheio': ['.........', '.........', '..yyyyy..', '.yyoooyy.', '.yooooOy.', '.yyoooyy.', '..yyyyy..', '.........', '.........'],
    'cadeado': ['..ggggg..', '.gg...gg.', '.g.....g.', 'yyyyyyyyy', 'yYYYYYYYy', 'yYYYkYYYy', 'yYYYkYYYy', 'yYYYYYYYy', 'yyyyyyyyy'],
}


def icones():
    saida = {}
    for nome, linhas in ICONES.items():
        tela = Tela(9, 9)
        tela.grade(linhas, 0, 0, {k: rgb(v) for k, v in dict(LEG, O='#c8680a').items()})
        saida[nome] = outline(tela.im)
    return saida


def painel():
    """O painel de baixo (224 x 48): uma mesa de madeira escura e, em cima, o folheto de cordel pendurado num barbante com dois pregadores
    (papel creme com a moldura de xilogravura em volta do bloco dos versos) e a trilha das bolinhas das páginas."""
    import random
    from casa import Tela as _Tela
    t = _Tela(W, H - CENA)
    gerador = random.Random(21)
    t.rect(0, 0, W - 1, H - CENA - 1, '#3a2418')
    for y in range(0, H - CENA, 3):
        for x in range(W):
            if (x * 7 + y * 13) % 11 < 2:
                t.put(x, y, '#46301f')
    t.rect(0, 0, W - 1, 0, '#8a5a30')
    t.rect(0, 1, W - 1, 1, '#d8a860')
    t.rect(0, 2, W - 1, 2, '#10100c')
    # O barbante e os pregadores (a folha pende dele).
    for x in range(W):
        t.put(x, 3 + (1 if 40 < x < 184 and x % 24 < 12 else 0), '#c8a868')
    # O papel do folheto: creme, com fibras, bordas gastas e a moldura de dentinhos pretos.
    t.rect(2, 3, 221, 35, '#e8d4a0')
    for _ in range(90):
        t.put(gerador.randrange(3, 221), gerador.randrange(4, 35), gerador.choice(['#d8c088', '#f4e4b8', '#c8b078']))
    t.rect(2, 3, 221, 3, '#f4e4b8')
    t.rect(2, 35, 221, 35, '#b89a58')
    t.rect(2, 3, 2, 35, '#f0dca8')
    t.rect(221, 3, 221, 35, '#b89a58')
    for y in range(5, 34, 4):                           # dentinhos de xilogravura nas margens dos lados
        t.rect(4, y, 6, y + 1, '#26242e')
        t.rect(217, y + 1, 219, y + 2, '#26242e')
    # O bloco escuro dos versos (onde a janela escreve): 4 linhas de texto cabem dentro dele.
    t.rect(10, 4, 213, 34, '#10100c')
    t.rect(11, 5, 212, 33, '#2a1a10')
    # Pregadores de madeira segurando o papel.
    for px in (34, 188):
        t.rect(px, 1, px + 4, 8, '#b07a48')
        t.rect(px, 1, px, 8, '#d8a060')
        t.rect(px + 4, 1, px + 4, 8, '#7a4a28')
        t.rect(px + 1, 4, px + 3, 4, '#5a3418')
        t.put(px + 2, 2, '#ffe0a0')
    # A trilha das bolinhas e as casinhas dos botões, fundas na madeira.
    t.rect(21, 37, 202, 47, '#150c06')
    t.rect(22, 38, 201, 46, '#241608')
    t.rect(22, 47, 201, 47, '#6a4428')
    for x0 in (3, W - 17):
        t.rect(x0 - 1, 36, x0 + 14, 48, '#150c06')
    return t.im


def exportar(add):
    paginas = []
    for numero in range(1, PAGINAS + 1):
        classe = livro_base.PAGINAS[numero]
        meta = add(f'cordel-p{numero:02d}', quadros(classe))
        meta.update(heroi=list(classe.heroi), pose=classe.pose, ponto=list(classe.ponto),
                    elenco=[{'id': id_, 'x': x, 'y': y, 'espelho': bool(espelho)} for id_, x, y, espelho in classe.elenco])
        paginas.append(meta)
    nomes = list(ICONES)
    imagens = icones()
    return {'paginas': paginas, 'ui': {**add('cordel-ui', [imagens[nome] for nome in nomes]), 'ids': nomes}, 'painel': add('cordel-painel', painel()), 'w': W, 'h': H, 'cena': CENA}
