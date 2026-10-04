"""Ícones da placa organizada e do guarda-roupa (11x10): as gavetas de janelas e de coleções, o cabide dos looks e o dado do look surpresa."""

from casa import Tela, rgb
from mundo_icones import LEG

ICONES = {
    # duas janelinhas sobrepostas (a de trás com a barra azul e a da frente mais baixa)
    'ui:gaveta-janelas': ['kkkkkkkk...', 'kbbbbbbk...', 'kwwwwwwkkkk', 'kwwwwwkbbbk', 'kwwwwwkwwwk', 'kkkkkkkwwwk', '......kwwwk', '......kkkkk', '...........', '...........'],
    # uma estrela de coleção com a fita embaixo
    'ui:gaveta-colecoes': ['.....y.....', '....yyy....', 'yyyyyyyyyyy', '.yyyYyyyyy.', '..yyyyyyy..', '..yyyyyyy..', '.yyy...yyy.', '.yy.rr..yy.', '....rr.....', '...........'],
    # um cabide de madeira com o gancho em cima
    'ui:looks': ['....kkk....', '...k...k...', '....kk.....', '.....n.....', '...nnnnn...', '.nnn...nnn.', 'nn.......nn', 'nnnnnnnnnnn', '...........', '...........'],
    # um dado branco com as pintas
    'ui:dado': ['kkkkkkkkkk.', 'kwwwwwwwwk.', 'kwkwwwwkwk.', 'kwwwwwwwwk.', 'kwwwkkwwwk.', 'kwwwkkwwwk.', 'kwwwwwwwwk.', 'kwkwwwwkwk.', 'kwwwwwwwwk.', 'kkkkkkkkkk.'],
}


def exportar(icons):
    """Põe os ícones no pacote de ícones do jogo (`ui:<nome>`)."""
    for nome, linhas in ICONES.items():
        tela = Tela(11, 10)
        tela.grade(linhas, 0, 0, {k: rgb(v) for k, v in LEG.items()})
        icons[nome] = tela.im
