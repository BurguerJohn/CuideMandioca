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
    return {'paginas': paginas, 'ui': {**add('cordel-ui', [imagens[nome] for nome in nomes]), 'ids': nomes}, 'w': W, 'h': H, 'cena': CENA}
