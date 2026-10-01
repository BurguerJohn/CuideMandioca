"""Atividades dos cômodos 13 a 36 da Casa da Mandioca (os 12 primeiros ficam em casa.py).

Cada cômodo tem duas atividades. Aqui entram os props (grades curtas), os chapéus e enfeites de rosto novos e as próprias
atividades; tudo é registrado nos dicionários de casa.py quando este módulo é importado (por casa.py, no fim).
"""

import casa
from casa import PROPS, ATIVIDADES, TOPOS, FACES, seq6, ATIVIDADES_ALTAS_NAO

# --- Chapéus e enfeites do rosto -----------------------------------------------------------------------------------------
TOPOS.update({
    'capacete_obra': ['..yyyy..', '.yyyyyy.', 'yyyyyyyy', 'YYYYYYYY'],
    'toalha': ['.wwww.', 'wwppww', 'wwwwww', 'pwwwwp'],
    'palha': ['..yyyy..', '.yYyyYy.', 'YYYYYYYYYY'],
    'boina': ['.kkkk.', 'kkkkkk', '.kkkkk'],
    'palhaco': ['pp.rr.bb', 'ppprrbbb', '.pprrbb.'],
    'capacete': ['.wwwww.', 'wwwwwww', 'wwwwwww', 'sssssss'],
    'medico': ['..sss..', '.sSSSs.', 'wwwwwww'],
    'cartola_mago': ['.mmmm.', '.mmmm.', '.mymm.', 'mmmmmm'],
    'gorro_neve': ['..w..', '.bbb.', 'bbwbb', 'wwwww'],
})

FACES.update({
    'oculos3d': ('topo', 2, ['kkkkkkkkk', 'krrkkkcck', 'krrkkkcck', '.kk...kk.']),
    'pepino': ('topo', 2, ['lll...lll', 'lLl...lLl', 'lll...lll']),
    'visor': ('topo', 1, ['cwwwwwwwwc', 'w........w', 'w........w', 'w........w', 'w........w', '.wwwwwwww.']),
    'robo': ('topo', 2, ['kkkkkkkkkk', 'kccGkkGcck', 'kccGkkGcck', 'kkkkkkkkkk', 'kyyGyyGyyk', 'kkkkkkkkkk']),
    'solda': ('topo', 2, ['kkkkkkkkkk', 'kkkkkkkkkk', 'kkkcckkkkk', 'kkkkkkkkkk']),
    'faixa': ('topo', 1, ['rrrrrrrrrr', '........rr']),
    'nariz': ('topo', 5, ['.rr.', 'rrrr']),
})

# --- Props ------------------------------------------------------------------------------------------------------------
PROPS.update({
    # oficina
    'martelo_0': ['.GGGGGG.', '.GsssGG.', '.GGGGGG.', '...NN...', '...NN...', '...NN...', '...NN...'],
    'martelo_1': ['...NN...', '...NN...', '...NN...', '.GGGGGG.', '.GsssGG.', '.GGGGGG.'],
    'toco': ['..kk......', 'nnnnnnnnnn', 'nNnNnNnNnn', 'NNNNNNNNNN'],
    'serrote': ['ssssssssss.', 'SsSsSsSsSsN', '.........NN'],
    'tabua': ['nnnnnnnnnnnnnnnn', 'NnNNnnNNnNnnNNnn', 'NNNNNNNNNNNNNNNN'],
    # pizzaria
    'massa_0': ['.tttttt.', 'tttTTttt', '.tttttt.'],
    'massa_1': ['..tttttttt..', '.tttTTTTttt.', '..tttttttt..'],
    'massa_2': ['.tttt.', 'ttTTtt', 'ttTTtt', '.tttt.'],
    'tabua_pizza': ['....kkkkkkkk....', '..kkooooooookk..', '.koorrYrrrYroook', 'kooorrrYrrrrrook', '.koorYrrrrYrrook', '..kkooooooookk..', 'NNNNNNNNNNNNNNNN'],
    # cafeteria
    'jarra_0': ['.sss..', 'ssSssn', 'ssSssn', 'ssSssn', 'sssss.', '.sss..'],
    'jarra_1': ['...ss.', '..ssSs', '.ssSsn', 'ssSssn', 'ssss.n', 'sss..n'],
    'xicara': ['.wwwww.', 'wnnnnnww', '.wwwww.', '..wwww.'],
    'xicara_c': ['.wwwww.', 'wnnnnnw', 'wwwwwww', '.wwwww.'],
    'balcao': ['tttttttttttttttttttttttt', 'nnnnnnnnnnnnnnnnnnnnnnnn', 'nNnNnNnNnNnNnNnNnNnNnNnN', 'NNNNNNNNNNNNNNNNNNNNNNNN'],
    # cinema
    'balde_pipoca': ['wywywywyw', 'wwywywyww', 'rwrwrwrwr', 'rwrwrwrwr', '.rwrwrwr.', '.rwrwrwr.'],
    # estúdio
    'mic_boom': ['.kkkk.', 'kGgGGk', 'kGgGGk', 'kGGGGk', '.kkkk.', '..SS..', '..SS..', '..SS..', '..SS..', '..SS..', '..SS..', '..SS..', '.SSSS.'],
    'camera_a': ['ssssssss', 'sGGGGGGs', 'sGkkGrGs', 'sGkkGGGs', 'ssssssss', '..SSSS..'],
    'camera_b': ['ssssssss', 'sGGGGGGs', 'sGkkGRGs', 'sGkkGGGs', 'ssssssss', '..SSSS..'],
    # costura
    'maquina_a': ['.....rr.......', '..sssrrsssss..', '..sSSSSSSSSs..', '..ss.k.....ss.', '..ss.g.....ss.', 'sssssssssssssss', 'sGGGGGGGGGGGGGs', 'NNNNNNNNNNNNNNN'],
    'maquina_b': ['.....rr.......', '..sssrrsssss..', '..sSSSSSSSSs..', '..ss.k.....ss.', '..ss.......ss.', 'sssssssssssssss', 'sGGGGGGGGGGGGGs', 'NNNNNNNNNNNNNNN'],
})

# --- Atividades ---------------------------------------------------------------------------------------------------------
ATIVIDADES.update({
    # Oficina
    'martelar': dict(fps=6, bob=[0] * 6, L=[(-3, 4)] * 6, R=[(4, -3), (4, -4), (4, -5), (4, -1), (5, 3), (4, 0)],
                     chapeu='capacete_obra',
                     props=[('toco', 'S', 15, 28, 'frente'),
                            (['martelo_0', 'martelo_0', 'martelo_0', 'martelo_1', 'martelo_1', 'martelo_1'], 'R', -3,
                             [-6, -6, -6, -1, -1, -1], 'frente')],
                     fx=('faisca', 21, 22, 520)),
    'serrar': dict(fps=8, bob=[0] * 6, L=[(-2, 5)] * 6, R=[(3, 3), (4, 3), (5, 3), (4, 3), (3, 3), (2, 3)], boca='dente',
                   props=[('tabua', 'S', 5, 27, 'frente'), ('serrote', 'R', [-12, -11, -10, -11, -12, -13], -1, 'frente')],
                   fx=('poeira', 12, 25, 380)),
    # Pizzaria
    'massa': dict(fps=8, bob=[0, 0, -1, 0, 0, -1], L=[(-1, -16), (-1, -17), (-1, -16), (-1, -17), (-1, -16), (-1, -17)],
                  R=[(1, -16), (1, -17), (1, -16), (1, -17), (1, -16), (1, -17)], chapeu='chef', boca='aberta',
                  props=[(seq6('massa_0', 'massa_1', 'massa_2', 'massa_1', 'massa_0', 'massa_1'), 'S', [7, 6, 9, 6, 7, 6], [3, 2, 1, 2, 3, 2], 'frente')],
                  fx=('poeira', 12, 2, 450)),
    'pizza': dict(fps=5, bob=[0] * 6, L=[(-3, 4)] * 6, R=[(-1, -1), (0, -3), (1, -4), (0, -3), (-1, -1), (0, -2)], olhos='baixo',
                  props=[('tabua_pizza', 'S', 5, 25, 'frente')], fx=('vapor', 13, 22, 700)),
    # Cafeteria
    'barista': dict(fps=4, bob=[0] * 6, L=[(-3, 4)] * 6, R=[(4, 0), (4, -1), (4, 1), (4, 2), (4, 1), (4, 0)],
                    props=[('balcao', 'S', 1, 27, 'frente'), ('xicara', 'S', 17, 24, 'frente'),
                           (seq6('jarra_0', 'jarra_0', 'jarra_1', 'jarra_1', 'jarra_1', 'jarra_0'), 'R', [-5, -5, -4, -4, -4, -5], -6, 'frente')],
                    fx=('vapor', 20, 18, 500)),
    'cafezinho': dict(fps=3, bob=[0] * 6, L=[(-3, 4)] * 6, R=[(3, 3), (2, -2), (1, -5), (1, -5), (2, -2), (3, 3)],
                      olhos=['baixo', 'baixo', 'fechado', 'fechado', 'baixo', 'baixo'], boca='sorriso',
                      props=[('xicara_c', 'R', -3, -1, 'mao')], fx=('vapor', 15, 6, 500)),
    # Cinema
    'filme': dict(fps=4, bob=[0, 0, -1, 0, 0, -1], L=[(-3, -2), (-4, -4), (-3, -2), (-4, -4), (-3, -2), (-4, -4)],
                  R=[(3, -2), (4, -4), (3, -2), (4, -4), (3, -2), (4, -4)], olhos='grande', boca='aberta', rosto=['oculos3d'],
                  props=[], fx=('exclama', 22, 6, 800)),
    'pipoca': dict(fps=6, bob=[0] * 6, L=[(-1, 6)] * 6, R=[(0, 5), (2, 1), (2, -5), (2, -5), (1, 1), (0, 5)], boca='aberta',
                   olhos='grande', props=[('balde_pipoca', 'C', -4, 3, 'mao')], fx=('pipoca', 20, 12, 380)),
    # Estúdio
    'podcast': dict(fps=5, bob=[0] * 6, L=[(-3, 4)] * 6, R=[(3, 4), (5, 0), (3, -2), (5, 1), (4, 4), (5, 0)], chapeu='fone',
                    boca=['aberta', 'reto', 'aberta', 'dente', 'aberta', 'reto'],
                    props=[('mic_boom', 'S', 1, 18, 'frente')], fx=('nota2', 22, 6, 600)),
    'camera': dict(fps=3, bob=[0, 0, 1, 0, 0, -1], L=[(-2, 1)] * 6, R=[(3, 5)] * 6, olhos='grande',
                   props=[(seq6('camera_a', 'camera_a', 'camera_a', 'camera_b', 'camera_b', 'camera_b'), 'C', -9, -3, 'mao')],
                   fx=('brilho', 3, 8, 900)),
    # Costura
    'costurar': dict(fps=8, bob=[0, -1, 0, -1, 0, -1], L=[(-1, 5)] * 6, R=[(2, 5), (3, 5), (2, 5), (3, 5), (2, 5), (3, 5)], olhos='baixo',
                     props=[(seq6('maquina_a', 'maquina_b', 'maquina_a', 'maquina_b', 'maquina_a', 'maquina_b'), 'S', 6, 23, 'frente')],
                     fx=('estrela', 20, 14, 700)),
    'medir': dict(fps=4, bob=[0] * 6, L=[(-4, 3), (-5, 3), (-6, 3), (-5, 3), (-4, 3), (-3, 3)],
                  R=[(4, 3), (5, 3), (6, 3), (5, 3), (4, 3), (3, 3)], fita=True, props=[], fx=('brilho', 13, 4, 700)),
})
ATIVIDADES_ALTAS_NAO.update({'massa'})


# --- Lote 2: spa, aquário, horta, ringue, skate e circo -------------------------------------------------------------------
TOPOS.update({
    'feltro': ['.GGGG.', 'GGGGGG', 'sssssss'],
})
FACES.update({
    'rubor': ('boca', -2, ['rr......rr', '.r......r.']),
    'mascara_mergulho': ('topo', 2, ['kkkkkkkkkk', 'kcc....cck', 'k........k', 'kkkkkkkkkk']),
})
PROPS.update({
    # spa
    'toalha_ombro': ['wwwwwwwwwwwwww', 'wpwpwpwpwpwpwp', 'ww..........ww'],
    'leque': ['.rwrwrw.', 'rwrwrwrw', '.rwrwrw.', '...nn...', '...nn...'],
    'copo_suco': ['..r.', '.cccc', 'cooooc', '.cooc.', '.cccc.'],
    # aquário
    'lata_racao': ['.ss.', 'sGGs', 'sRRs', 'sRRs', 'ssss'],
    'flocos_0': ['.y.', '...', '...'],
    'flocos_1': ['...', 'o.y', '...'],
    'flocos_2': ['...', '...', '.o.'],
    'snorkel': ['.rr', '.y.', '.y.', '.y.', '.y.', 'yy.'],
    'nadadeira_e': ['.yyyyyy', 'yYYYYYY', 'yyyyyyy'],
    'nadadeira_d': ['yyyyyy.', 'YYYYYYy', 'yyyyyyy'],
    # horta
    'pa_jardim': ['.NN.', '.NN.', '.NN.', '.NN.', '.NN.', '.NN.', '.NN.', 'ssss', 'sSSs', '.ss.'],
    'terra': ['..nn..', '.nNnn.', 'nNnnNn', 'NNNNNN'],
    'cenoura': ['.l.l.', '..L..', '.ooo.', '.ooo.', '..o..'],
    'cesta': ['n.....n', 'nnnnnnn', 'nNnNnNn', '.nNnNn.', '..nnn..'],
    # ringue
    'saco': ['..kk....', '..kk....', 'rrrrrrrr', 'rRrrrrRr', 'rrrrrrrr', 'rrrrrrrr', 'rrrrrrrr', 'rrrrrrrr', 'rrrrrrrr', 'RRRRRRRR', '.RRRRRR.'],
    'luva_r': ['.rrr.', 'rrRrr', 'rrrrr', '.rrr.'],
    'luva_b': ['.bbb.', 'bbBbb', 'bbbbb', '.bbb.'],
    # skate
    'skate_0': ['bbbbbbbbbbbbbb', 'BBBBBBBBBBBBBB', '.kk........kk.'],
    'skate_1': ['..........bbbb.', '.....bbbbBBBB..', 'bbbbBBBB..kk...', 'BBBB..kk.......'],
    'rodas': ['k..k..k..k'],
    # circo
    'bola_circo': ['...rrrrrrrr...', '.rrrwwrrrwwrr.', 'rrwwwwrrwwwwrr', 'ryyyrrrrryyyrr', '.yyyyyyyyyyyy.', '...yyyyyyyy...'],
    'caixa_0': ['mmmmmmmmm', 'mymymymym', 'MMMMMMMMM'],
    'caixa_1': ['.p.p.....', '.w.w.....', 'mmmmmmmmm', 'mymymymym', 'MMMMMMMMM'],
    'caixa_2': ['.pp.pp...', '.ww.ww...', '.wwwww...', 'mmmmmmmmm', 'mymymymym', 'MMMMMMMMM'],
    'varinha': ['.y.', 'yyy', '.k.', '.k.', '.k.', '.k.'],
})
ATIVIDADES.update({
    # Spa
    'mascara': dict(fps=3, bob=[0, 0, -1, -1, 0, 0], L=[(-1, 6)] * 6, R=[(1, 6)] * 6, chapeu='toalha', boca='sorriso',
                    rosto=['pepino'], props=[], fx=('bolha', 20, 6, 800)),
    'sauna': dict(fps=6, bob=[0, -1, 0, -1, 0, -1], L=[(-3, 5)] * 6, R=[(5, -1), (7, -2), (5, -1), (3, -2), (5, -1), (7, -2)],
                  boca='aberta', olhos='baixo', rosto=['rubor'],
                  props=[('toalha_ombro', 'C', -7, -1, 'frente'), ('leque', 'R', -6, -4, 'mao')], fx=('gota', 6, 8, 500)),
    # Aquário
    'racao': dict(fps=4, bob=[0] * 6, L=[(-3, 4)] * 6, R=[(5, -2), (6, -3), (5, -1), (6, -3), (5, -2), (6, -1)], olhos='baixo',
                  props=[('lata_racao', 'R', -1, -4, 'mao'),
                         (seq6('flocos_0', 'flocos_1', 'flocos_2', 'flocos_0', 'flocos_1', 'flocos_2'), 'R', 1, 1, 'frente')],
                  fx=('bolha', 22, 4, 600)),
    'mergulho': dict(fps=6, bob=[0, -1, 0, -1, 0, -1], sway=[-1, 0, 1, 0, -1, 0], passo=True,
                     L=[(-3, -2), (-6, 2), (-6, 5), (-3, 4), (-3, 0), (-3, -2)], R=[(3, 4), (3, 0), (3, -2), (6, 2), (6, 5), (3, 4)],
                     rosto=['mascara_mergulho'], boca='reto',
                     props=[('snorkel', 'C', 7, -12, 'frente'), ('nadadeira_e', 'P', -9, -2, 'frente'), ('nadadeira_d', 'P', 3, -2, 'frente')],
                     fx=('bolha', 20, 8, 380)),
    # Horta
    'cavar': dict(fps=4, bob=[0] * 6, L=[(-3, 4)] * 6, R=[(4, -1), (4, -3), (4, -5), (4, -1), (4, 3), (4, 3)], chapeu='palha',
                  props=[('terra', 'S', 0, 28, 'costas'),
                         ('pa_jardim', 'R', -1, [-4, -6, -8, -4, 0, 0], 'frente')], fx=('poeira', 4, 24, 520)),
    'colher': dict(fps=4, bob=[0, 0, 0, 0, -1, 0], L=[(-1, 6)] * 6, R=[(4, 5), (4, 7), (3, 3), (2, -1), (3, 3), (4, 5)],
                   props=[('cesta', 'C', -9, 6, 'mao'),
                          (seq6('', '', 'cenoura', 'cenoura', 'cenoura', ''), 'R', -2, -4, 'mao')], fx=('estrela', 21, 12, 700)),
    # Ringue
    'boxe': dict(fps=8, bob=[0, 0, -1, 0, 0, 0], L=[(-3, 3)] * 6, R=[(3, 2), (4, 1), (5, 0), (4, 1), (3, 2), (3, 2)], boca='dente',
                 rosto=['faixa'], props=[('saco', 'S', [18, 18, 18, 19, 19, 18], 13, 'costas'),
                                         ('luva_r', 'L', -2, -1, 'mao'), ('luva_r', 'R', -2, -1, 'mao')],
                 fx=('estrela', 20, 10, 650)),
    'sombra': dict(fps=8, bob=[0, -1, 0, -1, 0, -1], sway=[-2, 0, 2, 0, -2, 0],
                   L=[(-4, -3), (1, 2), (5, -4), (1, 2), (-4, -3), (1, 2)], R=[(2, 1), (6, -4), (-1, 2), (4, -3), (2, 1), (6, -4)],
                   boca='dente', rosto=['faixa'], props=[('luva_b', 'L', -2, -1, 'mao'), ('luva_b', 'R', -2, -1, 'mao')],
                   fx=('gota', 3, 6, 420)),
    # Skate
    'skate': dict(fps=6, bob=[-3, -5, -7, -5, -3, -3], L=[(-5, 0), (-6, -2), (-6, -3), (-6, -2), (-5, 0), (-5, 1)],
                  R=[(5, 1), (6, -2), (6, -3), (6, -2), (5, 0), (5, 1)], boca='aberta',
                  props=[(seq6('skate_0', 'skate_1', 'skate_1', 'skate_1', 'skate_0', 'skate_0'), 'P', -7, 1, 'frente')],
                  fx=('poeira', 4, 27, 480)),
    'patins': dict(fps=6, bob=[-2] * 6, sway=[-2, -1, 0, 1, 2, 0], passo=True,
                   L=[(-4, -2), (-5, 0), (-5, 2), (-5, 0), (-4, -2), (-4, 0)], R=[(5, 2), (5, 0), (4, -2), (4, 0), (5, 2), (5, 0)],
                   boca='feliz', props=[('rodas', 'P', -5, 1, 'frente')], fx=('estrela', 4, 24, 700)),
    # Circo
    'equilibrio': dict(fps=6, bob=[-6] * 6, sway=[0, 1, 0, -1, 0, 1], L=[(-6, -3), (-6, -1), (-6, -4), (-6, -2), (-6, -3), (-6, -1)],
                       R=[(6, -2), (6, -4), (6, -1), (6, -3), (6, -2), (6, -4)], chapeu='palhaco', boca='aberta',
                       props=[('bola_circo', 'P', [-7, -6, -7, -8, -7, -6], 1, 'frente')], fx=('estrela', 22, 4, 700)),
    'magica': dict(fps=4, bob=[0, 0, -1, -1, 0, 0], L=[(-1, 5)] * 6, R=[(5, -3), (6, -6), (5, -3), (6, -6), (5, -3), (6, -6)],
                   chapeu='cartola_mago', olhos='grande',
                   props=[(seq6('caixa_0', 'caixa_0', 'caixa_1', 'caixa_2', 'caixa_2', 'caixa_1'), 'C', -9, 3, 'mao'),
                          ('varinha', 'R', -1, -5, 'mao')], fx=('brilho', 22, 6, 520)),
})
ATIVIDADES_ALTAS_NAO.update({'skate', 'patins', 'equilibrio', 'mergulho'})


# --- Lote 3: teatro, garagem, padaria, lavanderia, xadrez e churrasqueira ------------------------------------------------
def tela_grade(largura, altura):
    return [['.'] * largura for _ in range(altura)]


def grade_pontos(grade, pontos, letra):
    for x, y in pontos:
        if 0 <= y < len(grade) and 0 <= x < len(grade[0]):
            grade[y][x] = letra


def grade_texto(grade):
    return [''.join(linha) for linha in grade]


def circulo(grade, cx, cy, raio, letra):
    for y in range(len(grade)):
        for x in range(len(grade[0])):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if raio - 0.9 <= d <= raio + 0.4:
                grade[y][x] = letra


def bicicleta(fase):
    """Bicicleta de lado (26x11): duas rodas com raios que giram (`fase` 0 ou 1), quadro, banco e guidão."""
    g = tela_grade(26, 11)
    for cx in (4, 21):
        circulo(g, cx, 6, 4, 'k')
        raios = ([(0, -3), (0, 3), (-3, 0), (3, 0)] if fase == 0 else [(2, -2), (-2, 2), (2, 2), (-2, -2)])
        for dx, dy in raios:
            grade_pontos(g, [(cx + dx // 1, 6 + dy)], 's')
        grade_pontos(g, [(cx, 6)], 'S')
    linhas = [((4, 6), (11, 3)), ((11, 3), (21, 6)), ((11, 3), (9, 6)), ((9, 6), (4, 6)), ((9, 6), (14, 6)), ((14, 6), (21, 6))]
    for (x0, y0), (x1, y1) in linhas:
        passos = max(abs(x1 - x0), abs(y1 - y0))
        for i in range(passos + 1):
            t = i / max(passos, 1)
            grade_pontos(g, [(round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t))], 'r')
    grade_pontos(g, [(9, 2), (10, 2), (11, 2)], 'k')
    grade_pontos(g, [(20, 2), (21, 2), (22, 2), (21, 3), (21, 4)], 'k')
    return grade_texto(g)


def marionete(pose):
    """Marionete de 9x18: a barra no alto, os fios e o boneco (`pose` 0 a 3: braços e pernas diferentes)."""
    g = tela_grade(9, 18)
    for x in range(9):
        g[0][x] = 'n'
    braco_e = [(1, 11), (0, 8), (1, 9), (0, 12)][pose]
    braco_d = [(7, 12), (8, 9), (7, 8), (8, 11)][pose]
    perna_e = [(3, 17), (2, 16), (3, 17), (2, 17)][pose]
    perna_d = [(5, 17), (6, 17), (6, 16), (5, 17)][pose]
    for y in range(1, 6):
        g[y][4] = 'w'
    for hx, hy in (braco_e, braco_d):
        for y in range(1, hy):
            g[y][hx] = 'w'
    for y, linha in ((5, 'yyy'), (6, 'ppp'), (7, 'pkp'), (8, 'ppp')):
        for k, letra in enumerate(linha):
            g[y][3 + k] = letra
    for y in (9, 10, 11, 12):
        for x in (3, 4, 5):
            g[y][x] = 'o'
    for hx, hy in (braco_e, braco_d):
        g[hy][hx] = 'y'
    for px, py in (perna_e, perna_d):
        for dy in range(3):
            g[py - dy][px] = 'B'
    return grade_texto(g)


PROPS.update({
    # teatro
    'mascara_a': ['.yyyyyy.', 'yyyyyyyy', 'yykyykyy', 'yyyyyyyy', 'ykyyyyky', 'yykkkkyy', '.yyyyyy.'],
    'mascara_b': ['.bbbbbb.', 'bbbbbbbb', 'bbkbbkbb', 'bbbbbbbb', 'bbkkkkbb', 'bkbbbbkb', '.bbbbbb.'],
    'marionete_0': marionete(0), 'marionete_1': marionete(1), 'marionete_2': marionete(2), 'marionete_3': marionete(3),
    # garagem
    'bike_a': bicicleta(0), 'bike_b': bicicleta(1),
    'chave_inglesa': ['.ss.ss.', '.sssss.', '..sSs..', '..sSs..', '..sSs..', '..SSS..'],
    'motor': ['....rr......', '..gggggggg..', '.gGGGGGGGGg.', 'ggGggGggGggg', 'gGGGGGGGGGGg', 'GGGGGGGGGGGG', 'kk........kk'],
    # padaria
    'mesa_massa': ['nnnnnnnnnnnnnnnnnnnn', 'nNnNnNnNnNnNnNnNnNnN', 'NNNNNNNNNNNNNNNNNNNN'],
    'bolo_massa_0': ['..tttttt..', '.tttttttt.', 'tttTTTTttt'],
    'bolo_massa_1': ['.........', '.tttttt..', 'ttttTTtttt'],
    'tabuleiro': ['.NNN.NNN.NNN.NNN.', 'NooNNooNNooNNooN.', 'nnnnnnnnnnnnnnnnn', 'sssssssssssssssss'],
    # lavanderia
    'tina': ['..ww.www.ww....', '.wwwwwwwwwwww..', 'nnnnnnnnnnnnnnn', 'nNnNnNnNnNnNnNn', 'nnnnnnnnnnnnnnn', 'NNNNNNNNNNNNNNN'],
    'varal_linha': ['gggggggggggggggggggggggggg'],
    'camisa_p': ['pp.pp', 'ppppp', '.ppp.', '.ppp.', '.ppp.'],
    'camisa_b': ['bb.bb', 'bbbbb', '.bbb.', '.bbb.', '.bbb.'],
    'meia': ['yy', 'yy', 'yy', 'yyy'],
    # xadrez
    'mesa_xadrez': ['nnnnnnnnnnnnnn', 'wkwkwkwkwkwkwk', 'kwkwkwkwkwkwkw', 'wkwkwkwkwkwkwk', 'NNNNNNNNNNNNNN'],
    'peca_b': ['.k.', '.k.', 'kkk', 'kkk'],
    'peca_w': ['.w.', '.w.', 'www', 'sss'],
    'peca_mao': ['.k.', '.k.', 'kkk'],
    'puzzle': ['nnnnnnnnnnn', 'nrrbbyyllpn', 'nrrbbyyllpn', 'nccggr..ppn', 'nccggr..ppn', 'nnnnnnnnnnn'],
    'peca_puzzle': ['rr', 'rr'],
    # churrasqueira
    'grelha_a': ['sssssssssssss', 'GGGGGGGGGGGGG', 'kkRrRrRrRrRkk', 'kkkkkkkkkkkkk', '.k.........k.'],
    'grelha_b': ['sssssssssssss', 'GGGGGGGGGGGGG', 'kkrRrRrRrRrkk', 'kkkkkkkkkkkkk', '.k.........k.'],
    'espeto': ['..............', 'RRooRRooRRooRR', 'RRooRRooRRooRR', 'ssssssssssssss'],
    'abano': ['.yyyy.', 'yYyYyy', 'yyYyYy', '.yyyy.', '..nn..'],
})
ATIVIDADES.update({
    # Teatro
    'drama': dict(fps=3, bob=[0, 0, -1, 0, 1, 1], L=[(-6, -4), (-7, -6), (-7, -4), (-7, -2), (-6, 0), (-6, 1)],
                  R=[(0, -5)] * 6, chapeu='boina',
                  props=[(seq6('mascara_a', 'mascara_a', 'mascara_a', 'mascara_b', 'mascara_b', 'mascara_b'), 'F', -4, 1, 'frente')],
                  fx=('estrela', 22, 6, 800)),
    'marionete': dict(fps=5, bob=[0, 0, -1, 0, 0, -1], L=[(-3, 4)] * 6, R=[(3, -17)] * 6, olhos='baixo',
                      props=[(seq6('marionete_0', 'marionete_1', 'marionete_2', 'marionete_3', 'marionete_2', 'marionete_1'), 'S', 15, 3, 'frente')],
                      fx=('nota', 5, 4, 700)),
    # Garagem
    'bicicleta': dict(fps=8, bob=[-4, -3, -4, -3, -4, -3], L=[(3, 4)] * 6, R=[(4, 4)] * 6, passo=True, boca='aberta',
                      props=[(seq6('bike_a', 'bike_b', 'bike_a', 'bike_b', 'bike_a', 'bike_b'), 'S', 0, 21, 'costas')],
                      fx=('poeira', 2, 24, 380)),
    'chave': dict(fps=6, bob=[0] * 6, L=[(-3, 4)] * 6, R=[(4, -2), (4, -4), (4, -6), (4, -1), (4, 4), (4, 1)],
                  props=[('motor', 'S', 12, 24, 'frente'),
                         ('chave_inglesa', 'R', -3, [-5, -6, -7, -3, -1, -3], 'frente')], fx=('faisca', 20, 22, 520)),
    # Padaria
    'sovar': dict(fps=6, bob=[0] * 6, L=[(1, 5), (1, 7), (1, 5), (1, 3), (1, 5), (1, 7)], R=[(-1, 7), (-1, 5), (-1, 3), (-1, 5), (-1, 7), (-1, 5)],
                  chapeu='chef', olhos='baixo',
                  props=[(seq6('bolo_massa_0', 'bolo_massa_1', 'bolo_massa_0', 'bolo_massa_1', 'bolo_massa_0', 'bolo_massa_1'), 'S', 8, 24, 'frente'),
                         ('mesa_massa', 'S', 3, 28, 'frente')], fx=('poeira', 12, 20, 420)),
    'pao': dict(fps=6, bob=[0, -1, 0, -1, 0, -1], L=[(0, 5)] * 6, R=[(1, 5)] * 6, boca='sorriso',
                props=[('tabuleiro', 'C', -9, 3, 'mao')], fx=('vapor', 13, 14, 560)),
    # Lavanderia
    'lavar': dict(fps=8, bob=[0] * 6, L=[(0, 6), (0, 8), (0, 6), (0, 8), (0, 6), (0, 8)], R=[(0, 8), (0, 6), (0, 8), (0, 6), (0, 8), (0, 6)],
                  olhos='baixo', props=[('tina', 'S', 5, 25, 'frente')], fx=('bolha', 12, 20, 320)),
    'varal': dict(fps=4, bob=[0] * 6, L=[(-1, 3)] * 6, R=[(0, -14), (1, -15), (0, -14), (-1, -15), (0, -14), (1, -15)],
                  props=[('varal_linha', 'S', 0, 5, 'costas'),
                         (seq6('', 'camisa_p', 'camisa_p', 'camisa_p', 'camisa_p', 'camisa_p'), 'S', 3, 6, 'costas'),
                         (seq6('', '', '', 'camisa_b', 'camisa_b', 'camisa_b'), 'S', 17, 6, 'costas'),
                         (seq6('', '', '', '', 'meia', 'meia'), 'S', 11, 6, 'costas'),
                         ('cesta', 'L', -3, 0, 'mao')], fx=('gota', 18, 12, 700)),
    # Xadrez
    'xadrez': dict(fps=3, bob=[0] * 6, L=[(3, -2)] * 6, R=[(4, 5), (4, 3), (4, 0), (4, 3), (4, 5), (4, 5)],
                   olhos=['baixo', 'baixo', 'baixo', 'grande', 'baixo', 'baixo'], boca='reto',
                   props=[('mesa_xadrez', 'S', 6, 27, 'frente'), ('peca_b', 'S', 9, 23, 'frente'), ('peca_w', 'S', 17, 23, 'frente'),
                          (seq6('', '', 'peca_mao', 'peca_mao', '', ''), 'R', -1, -3, 'mao')], fx=('exclama', 21, 6, 900)),
    'quebra': dict(fps=3, bob=[0] * 6, L=[(-3, 4)] * 6, R=[(4, 5), (4, 2), (3, -1), (2, 1), (2, 4), (4, 5)], olhos='baixo',
                   props=[('puzzle', 'S', 13, 21, 'frente'),
                          (seq6('peca_puzzle', 'peca_puzzle', 'peca_puzzle', 'peca_puzzle', '', ''), 'R', 0, -2, 'mao')],
                   fx=('estrela', 19, 8, 900)),
    # Churrasqueira
    'churrasco': dict(fps=4, bob=[0] * 6, L=[(-3, 4)] * 6, R=[(5, 3), (5, 2), (5, 3), (5, 4), (5, 3), (5, 2)], chapeu='cowboy',
                      props=[(seq6('grelha_a', 'grelha_b', 'grelha_a', 'grelha_b', 'grelha_a', 'grelha_b'), 'S', 12, 26, 'frente'),
                             ('espeto', 'R', [-12, -12, -11, -12, -12, -11], [-3, -4, -3, -2, -3, -4], 'frente')],
                      fx=('fumaca', 16, 18, 420)),
    'abanar': dict(fps=8, bob=[0, -1, 0, -1, 0, -1], L=[(-3, 4)] * 6, R=[(4, 1), (6, -1), (4, 1), (2, -1), (4, 1), (6, -1)], boca='aberta',
                   props=[(seq6('grelha_b', 'grelha_a', 'grelha_b', 'grelha_a', 'grelha_b', 'grelha_a'), 'S', 12, 26, 'frente'),
                          ('abano', 'R', -2, -4, 'mao')], fx=('faisca', 18, 22, 300)),
})
ATIVIDADES_ALTAS_NAO.update({'bicicleta', 'marionete'})


# --- Lote 4: escola, consultório, espaço, praia, neve e robôs --------------------------------------------------------------
def lousa(n):
    """Lousa de cavalete (12x15) com `n` linhas de giz."""
    g = tela_grade(12, 15)
    for y in range(12):
        for x in range(12):
            g[y][x] = 'n' if y in (0, 11) or x in (0, 11) else 'L'
    for k in range(n):
        y = 2 + k * 3
        for x in range(2, 2 + (8 if k % 2 == 0 else 6)):
            g[y][x] = 'w'
    for y in range(12, 15):
        g[y][2] = 'n'
        g[y][9] = 'n'
    return grade_texto(g)


def onda(fase):
    """Onda (26x7): espuma branca na crista e água azul embaixo."""
    import math
    g = tela_grade(26, 7)
    for x in range(26):
        topo = 1 + round(1.4 * math.sin((x + fase * 5) / 2.6))
        for y in range(topo, 7):
            g[y][x] = 'w' if y == topo else ('c' if y < topo + 3 else 'b')
    return grade_texto(g)


def castelo(n):
    """Castelo de areia (14x10) que cresce com `n` (0 a 3): base, torres e a bandeirinha."""
    g = tela_grade(14, 10)
    for y in range(7, 10):
        for x in range(1, 13):
            g[y][x] = 't' if y == 7 else 'T'
    if n >= 1:
        for y in range(3, 7):
            for x in range(1, 4):
                g[y][x] = 't' if x == 1 else 'T'
            for x in range(10, 13):
                g[y][x] = 't' if x == 10 else 'T'
    if n >= 2:
        for y in range(1, 7):
            for x in range(5, 9):
                g[y][x] = 't' if x == 5 else 'T'
        for x in (5, 7):
            g[0][x] = 'T'
    if n >= 3:
        g[0][6] = 'r'
        g[0][7] = 'r'
        g[1][5] = 'N'
    for y, x in ((4, 2), (4, 11), (4, 6), (8, 4), (8, 8)):
        if g[y][x] != '.':
            g[y][x] = 'Y'
    return grade_texto(g)


def boneco(n):
    """Boneco de neve (9x20): `n` 0 só bolas, 1 com chapéu e cachecol, 2 com cenoura e botões."""
    g = tela_grade(9, 20)
    for cx, cy, r in ((4, 15, 4), (4, 8, 3), (4, 3, 2)):
        for y in range(20):
            for x in range(9):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r + 1:
                    g[y][x] = 'w' if (x - cx) + (y - cy) < 2 else 's'
    if n >= 1:
        for x in range(2, 7):
            g[5][x] = 'r'
        g[6][2] = 'r'
        g[6][3] = 'r'
        grade_pontos(g, [(3, 0), (4, 0), (5, 0), (2, 1), (3, 1), (4, 1), (5, 1), (6, 1)], 'k')
    if n >= 2:
        grade_pontos(g, [(3, 3), (5, 3)], 'k')
        grade_pontos(g, [(4, 4), (5, 4), (6, 4)], 'o')
        grade_pontos(g, [(4, 9), (4, 12), (4, 15)], 'k')
    return grade_texto(g)


PROPS.update({
    # escola
    'lousa_0': lousa(1), 'lousa_1': lousa(2), 'lousa_2': lousa(3), 'lousa_3': lousa(4),
    'giz': ['ww'],
    'ponteiro_a': ['........yy', '.......y..', '......y...', '.....y....', '....y.....', '...y......', '..n.......'],
    'ponteiro_b': ['.....yy', '....y..', '....y..', '...y...', '...y...', '..y....', '.n.....'],
    # consultório
    'estetoscopio': ['k.....k', 'k.....k', '.k...k.', '..kkk..', '...k...', '...s...'],
    'prancheta': ['.nnn.', 'nwwwn', 'nwrwn', 'nrrrn', 'nwrwn', 'nwwwn'],
    'lenco': ['wwww', 'wsww', 'wwww'],
    # espaço
    'foguete_a': ['..r..', '.rrr.', '.www.', '.wbw.', '.www.', 'rwwwr', 'r.w.r', '..o..', '.ooo.', '..y..'],
    'foguete_b': ['..r..', '.rrr.', '.www.', '.wbw.', '.www.', 'rwwwr', 'r.w.r', '.ooo.', '..y..', '.....'],
    # praia
    'prancha': ['..ooooooooooo..', '.oYwYwYwYwYwYo.', '..ooooooooooo..'],
    'onda_a': onda(0), 'onda_b': onda(1),
    'balde': ['.rrrr.', 'rrRRrr', '.rrrr.'],
    'castelo_0': castelo(0), 'castelo_1': castelo(1), 'castelo_2': castelo(2), 'castelo_3': castelo(3),
    # neve
    'boneco_0': boneco(0), 'boneco_1': boneco(1), 'boneco_2': boneco(2),
    'lamina': ['ssss...ssss'],
    # robôs
    'solda_a': ['sssssssssssss', 'SSSSSSSyySSSS'],
    'solda_b': ['sssssssssssss', 'SSSSSSSwwSSSS'],
    'macarico': ['.gg', '.gg', 'GGG', '.G.', '.o.'],
})
ATIVIDADES.update({
    # Escola
    'lousa': dict(fps=4, bob=[0] * 6, L=[(-3, 4)] * 6, R=[(4, -3), (5, -5), (6, -3), (5, -1), (4, -3), (6, -5)], extra='oculos',
                  props=[(seq6('lousa_0', 'lousa_0', 'lousa_1', 'lousa_1', 'lousa_2', 'lousa_3'), 'S', 13, 11, 'costas')],
                  fx=('poeira', 22, 14, 480)),
    'ponteiro': dict(fps=4, bob=[0] * 6, L=[(-3, 4)] * 6, R=[(4, 0), (4, -2), (4, -4), (4, -2), (4, 0), (4, 1)], extra='oculos',
                     boca=['aberta', 'reto', 'aberta', 'dente', 'aberta', 'reto'],
                     props=[('livro_a', 'L', -3, -2, 'mao'),
                            (seq6('ponteiro_b', 'ponteiro_b', 'ponteiro_a', 'ponteiro_a', 'ponteiro_b', 'ponteiro_b'), 'R', -2, -6, 'mao')],
                     fx=('exclama', 22, 4, 900)),
    # Consultório
    'medico': dict(fps=4, bob=[0] * 6, L=[(-1, 5)] * 6, R=[(2, 4), (2, 5), (2, 4), (2, 5), (2, 4), (2, 5)], chapeu='medico',
                   props=[('estetoscopio', 'C', -3, 0, 'frente'), ('prancheta', 'L', -3, -4, 'mao')],
                   fx=('coracao', 14, 8, 700)),
    'resfriado': dict(fps=3, bob=[0, 0, 0, -2, 0, 0], L=[(4, -4), (4, -4), (4, -4), (4, -7), (4, -4), (4, -4)], R=[(-3, 5)] * 6,
                      chapeu='gorro_neve', olhos=['baixo', 'baixo', 'baixo', 'fechado', 'baixo', 'baixo'], boca='reto',
                      rosto=['nariz'], props=[('lenco', 'L', -1, -2, 'mao')], fx=('gota', 18, 14, 700)),
    # Espaço
    'astronauta': dict(fps=3, bob=[0, -1, -2, -2, -1, 0], sway=[0, 1, 1, 0, -1, -1],
                       L=[(-5, -2), (-6, -3), (-6, -4), (-6, -3), (-5, -2), (-5, -1)], R=[(5, -4), (5, -3), (6, -2), (6, -3), (5, -4), (5, -5)],
                       chapeu='capacete', rosto=['visor'], boca='sorriso', olhos='grande', props=[], fx=('brilho', 22, 8, 520)),
    'foguete': dict(fps=5, bob=[0] * 6, L=[(-3, 4)] * 6, R=[(4, -3), (4, -3), (4, -3), (4, -3), (4, -3), (4, -3)], olhos='grande',
                    props=[(seq6('foguete_a', 'foguete_b', 'foguete_a', 'foguete_b', 'foguete_a', 'foguete_b'), 'R', -2,
                            [-12, -14, -17, -20, -23, -26], 'frente')], fx=('fumaca', 22, 17, 360)),
    # Praia
    'surfar': dict(fps=6, bob=[-3, -3, -4, -3, -3, -4], sway=[-1, 0, 1, 1, 0, -1], L=[(-6, -1), (-6, -2), (-6, -1), (-6, 0), (-6, -1), (-6, -2)],
                   R=[(6, 0), (6, -1), (6, 0), (6, 1), (6, 0), (6, -1)], chapeu='palha', boca='aberta',
                   props=[('prancha', 'P', -7, 1, 'frente'),
                          (seq6('onda_a', 'onda_b', 'onda_a', 'onda_b', 'onda_a', 'onda_b'), 'S', 0, 25, 'frente')],
                   fx=('gota', 4, 22, 520)),
    'castelo': dict(fps=2, bob=[0] * 6, L=[(-3, 4)] * 6, R=[(4, 6), (5, 8), (4, 6), (5, 8), (4, 6), (5, 8)], chapeu='palha', olhos='baixo',
                    props=[(seq6('castelo_0', 'castelo_1', 'castelo_1', 'castelo_2', 'castelo_3', 'castelo_3'), 'S', 11, 22, 'frente'),
                           ('balde', 'L', -3, 0, 'mao')], fx=('estrela', 18, 16, 900)),
    # Neve
    'boneco': dict(fps=2, bob=[0, 0, 0, -1, 0, 0], L=[(-3, 4)] * 6, R=[(4, 2), (5, 4), (4, 2), (5, 4), (4, 2), (5, 4)], chapeu='gorro_neve',
                   props=[(seq6('boneco_0', 'boneco_0', 'boneco_1', 'boneco_1', 'boneco_2', 'boneco_2'), 'S', 17, 11, 'costas')],
                   fx=('neve', 8, 0, 420)),
    'patinar': dict(fps=6, bob=[-1] * 6, sway=[-3, 0, 3, 0, -3, 0], passo=True,
                    L=[(-6, -3), (-5, -1), (-6, 1), (-5, -1), (-6, -3), (-5, -1)], R=[(6, 1), (5, -1), (6, -3), (5, -1), (6, 1), (5, -1)],
                    chapeu='boina', boca='sorriso', props=[('lamina', 'P', -5, 1, 'frente')], fx=('neve', 13, 6, 420)),
    # Robôs
    'robo': dict(fps=4, bob=[0, -1, 0, -1, 0, -1], sway=[-2, -2, 2, 2, 0, 0], chapeu='antena',
                 L=[(-4, -3), (-4, -3), (-4, 2), (-4, 2), (-4, -3), (-4, -3)], R=[(4, 2), (4, 2), (4, -3), (4, -3), (4, 2), (4, 2)],
                 rosto=['robo'], props=[], fx=('faisca', 20, 4, 420)),
    'solda': dict(fps=6, bob=[0] * 6, L=[(-2, 6)] * 6, R=[(4, 1), (4, 2), (4, 1), (4, 2), (4, 1), (4, 2)],
                  rosto=['solda'], props=[(seq6('solda_a', 'solda_b', 'solda_a', 'solda_b', 'solda_a', 'solda_b'), 'S', 5, 29, 'frente'),
                                          ('macarico', 'R', -1, 0, 'mao')], fx=('faisca', 21, 24, 240)),
})
ATIVIDADES_ALTAS_NAO.update({'astronauta', 'surfar', 'patinar', 'foguete'})
