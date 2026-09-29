"""Os tamanhos menores da Mandioca (broto, mudinha e mandioquinha), desenhados no próprio tamanho.

Reduzir o desenho inteiro borrava o rosto: os olhos de 2 px viravam meio pixel e sumiam conforme a Mandioca balançava.
Aqui cada tamanho tem a sua grade do corpo (cabeça, lenço, camisa e raiz), com os olhos e a boca desenhados pixel a
pixel. Braços e pernas continuam saindo da mesma geometria do tamanho inteiro (art/exportar.py), só que em escala.

Cada grade tem a largura do tamanho inteiro vezes a escala (24 × escala) e fica no mesmo lugar em que o corpo inteiro
reduzido ficaria, então chapéus e itens de mão (esses ainda reduzidos) continuam encaixando.
"""

# Grades: mesmas cores do CORE de art/exportar.py (contorno 0, casca 2-5, polpa 6-7, olho e, brilho 9, boca m, língua
# n, bochecha c, lenço J/j/b, camisa de tecido #/+/-, botão A, bolso jJJ).
KITS = [
    {   # Broto (0,62): 15 de largura, 17 de altura. Olhos de 1 × 2 px, boca de 2 × 2.
        'core': [
            '....00000000...',
            '....02333320...',
            '...0437777320..',
            '...046e66e730..',
            '...046e66e730..',
            '...03c6mm6c20..',
            '....037mm730...',
            '....0JbJ9Jj0...',
            '....0jJjjJj0...',
            '...0#+jJJj+-0..',
            '...0##+jj+--0..',
            '...0#+++A++-0..',
            '...0#++++jJJ0..',
            '...0000000000..',
            '...0443323220..',
            '....04332320...',
            '....04323220...',
        ],
        # Olhos: bloco (linha, coluna) e as trocas de cada jeito de olhar; boca: idem.
        'eyes_at': (3, 5),
        'eyes': {'abertos': None, 'fechados': ('666667', 'ee66ee'), 'cansados': ('e6666e', '6e66e7')},
        'mouth_at': (5, 5),
        'mouths': {'canta': None, 'sorri': ('cm66mc', '37mm73'), 'ofega': ('c6mm6c', '37nn73')},
        # Área do rosto que vira casca de costas (linhas e colunas, fim exclusivo).
        'face': (2, 7, 4, 12),
        # Pernas: coluna da esquerda e da direita (2 px cada), a partir do canto do corpo.
        'legs': (5, 9),
    },
    {   # Mudinha (0,75): 18 × 21. Olhos de 2 × 2 com brilho.
        'core': [
            '....0000000000....',
            '....0223333220....',
            '...043777777320...',
            '...0569e669e720...',
            '...046ee66ee730...',
            '...036c6666c720...',
            '...0466mmmm6730...',
            '....037mnnm730....',
            '....0Jb9JJ9Jj0....',
            '....0jJjjjjJj0....',
            '...0##+jJJj+--0...',
            '...0##++jj++--0...',
            '...0#++++A++--0...',
            '...0#+++++jJJ-0...',
            '...0#++++A+jJJ0...',
            '...0++++++++--0...',
            '...000000000000...',
            '....0443323220....',
            '....0433233220....',
            '.....04332320.....',
            '.....04323220.....',
        ],
        'eyes_at': (3, 5),
        'eyes': {'abertos': None, 'fechados': ('66666667', '6ee66ee7'), 'cansados': ('6e6666e7', '66e66e67')},
        'mouth_at': (6, 5),
        'mouths': {'canta': None, 'sorri': ('6m6666m7', '37mmmm73'), 'ofega': ('666mm667', '37mnnm73')},
        'face': (2, 8, 4, 14),
        'legs': (6, 10),
    },
    {   # Mandioquinha (0,88): 21 × 25. O rosto é o do tamanho inteiro, com menos casca dos lados.
        'core': [
            '....000000000000.....',
            '....022333333220.....',
            '...04337777773220....',
            '...05376666667220....',
            '...0426ee66ee7320....',
            '...04469e669e7310....',
            '...0446ee66ee7320....',
            '...0436c6666c7320....',
            '...04266mmmm67310....',
            '....0437mnnm7320.....',
            '....0JbJ9JJJ9Jj0.....',
            '....0jJjjJJjjJj0.....',
            '...0##++jJJj++--0....',
            '...0###++jj+++--0....',
            '...0##++++A+++--0....',
            '...0##++++++++--0....',
            '...0#+++++A++---0....',
            '...0#+++++++jJJ-0....',
            '...0#+++++A+jJJ-0....',
            '...0++++++++jjj-0....',
            '...00000000000000....',
            '....044332333220.....',
            '....043332332220.....',
            '.....0433233220......',
            '......04332220.......',
        ],
        'eyes_at': (4, 6),
        'eyes': {'abertos': None, 'fechados': ('66666667', '6ee66ee7', '66666667'),
                 'cansados': ('6e6666e7', '66e66e67', '6e6666e7')},
        'mouth_at': (8, 6),
        'mouths': {'canta': None, 'sorri': ('6m6666m7', '37mmmm73'), 'ofega': ('666mm667', '37mnnm73')},
        'face': (2, 10, 4, 16),
        'legs': (7, 11),
    },
]

BACK = str.maketrans({'6': '3', '7': '3', 'e': '3', '9': '4', 'm': '3', 'n': '3', 'c': '4'})


def face(stage, eyes='abertos', mouth='canta', back=False):
    """A grade do corpo do tamanho `stage` com o jeito de olhar e de boca pedidos (ou de costas, sem rosto)."""
    kit = KITS[stage]
    rows = list(kit['core'])
    if back:
        r0, r1, c0, c1 = kit['face']
        for index in range(r0, r1):
            rows[index] = rows[index][:c0] + rows[index][c0:c1].translate(BACK) + rows[index][c1:]
        return '\n'.join(rows)
    for (row, col), patch in ((kit['eyes_at'], kit['eyes'][eyes]), (kit['mouth_at'], kit['mouths'][mouth])):
        if patch:
            for index, text in enumerate(patch):
                line = rows[row + index]
                rows[row + index] = line[:col] + text + line[col + len(text):]
    return '\n'.join(rows)


def blink(stage):
    """Os olhos fechados do tamanho `stage` (o jogo desenha por cima do rosto na hora de piscar)."""
    return '\n'.join(KITS[stage]['eyes']['fechados'])


def check():
    """Toda linha de uma grade tem a mesma largura (24 × escala) e as trocas cabem no rosto."""
    widths = [15, 18, 21]
    for stage, kit in enumerate(KITS):
        for number, row in enumerate(kit['core']):
            assert len(row) == widths[stage], (stage, number, len(row), row)
        for table, (row, col) in ((kit['eyes'], kit['eyes_at']), (kit['mouths'], kit['mouth_at'])):
            base = kit['core']
            for patch in table.values():
                if patch:
                    for index, text in enumerate(patch):
                        assert col + len(text) <= len(base[row + index]), (stage, patch)
