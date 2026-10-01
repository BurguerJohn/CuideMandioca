"""As criaturas do folclore da Mata Encantada: 9 comuns e 10 chefes, cada uma com 2 quadros (parada e balançando).

Cada criatura é uma grade de letras com a paleta dela (`cores`); `.` é transparente. Todas olham para a esquerda (a Mandioca fica do
lado esquerdo da janela). O quadro B é o A com algumas linhas trocadas (`troca`: {linha: novo texto}).
"""

import math
import random

from itens_novos import pintar, Grade, elipse


def grade(texto):
    return [linha for linha in texto.strip('\n').split('\n')]


def quadros(texto, cores, troca=None):
    """Os dois quadros (A e B) de uma criatura: B troca as linhas dadas (`troca`) e mantém o resto."""
    a = grade(texto)
    b = list(a)
    for linha, novo in (troca or {}).items():
        b[linha] = novo.ljust(len(a[0]), '.')[:len(a[0])]
    return [pintar('\n'.join(a), cores), pintar('\n'.join(b), cores)]


def espelho(meia):
    """A metade esquerda (linhas) vira a figura inteira, espelhada."""
    return '\n'.join(linha + linha[::-1] for linha in grade(meia))


COMUNS = {}
CHEFES = {}


def comum(id_, texto, cores, troca=None):
    COMUNS[id_] = quadros(texto, cores, troca)


def chefe(id_, texto, cores, troca=None):
    CHEFES[id_] = quadros(texto, cores, troca)


# --- Fogo-fátuo: uma chama azul-esverdeada flutuando, com olhinhos -------------------------------------------------------
comum('fogo-fatuo', """
.......c........
......cc........
......ccb.......
.....cccb.......
.....cbbbb......
....cbbwbbb.....
....bbwwwbb.....
...bbwwwwwbb....
...bbwkwwkwbB...
..bbbwkwwkwbbB..
..bbbwwwwwwbbB..
..bbbbwwwwbbbB..
...bbbbbbbbbBB..
...BbbbbbbbbBB..
....BBbbbbBBB...
.....BBBBBBB....
......BBBB......
""", {'c': '#9ffff0', 'b': '#27c0d8', 'B': '#1a6aa8', 'w': '#ffffff', 'k': '#0e2a44'},
    {0: '.........c......', 1: '........cc......', 2: '.......bcc......', 3: '.......bccc.....', 4: '.....cbbbbb.....'})


# --- Mão-de-cabelo: uma mão peluda que anda pelo chão, com um olho só ----------------------------------------------------
comum('mao-de-cabelo', """
..........hh..........
........hhhhhh....hh..
......hhhHhhhhhh.hhhh.
.....hhhhhhhhhhhhhhhHh
....hhhwwhhhhwwhhhhhh.
....hhhwkhhhhwkhhhhh..
.sS.hhhhhhhhhhhhhhhh..
.sSshhhhhhhhhhhhhhhh..
..sSsshhhhhhhhhhhhh...
..sSSssshhhhhhhhhh....
.ssS.ssSsshhHhhhs.....
sSs..sS.sSs.sSs.sS....
sS...sS.sS..sS..sS....
""", {'h': '#3a2a34', 'H': '#6a4a5c', 's': '#e8b890', 'S': '#b27850', 'w': '#ffffff', 'k': '#c01830'},
    {11: 'sSs.sS..sSs.sS..sS....', 12: 'sS.sS...sS..sS...sS....'})


# --- Cabeça-de-cuia: uma cuia grande no lugar da cabeça, em cima de um corpinho magro -----------------------------------
comum('cabeca-de-cuia', """
.........GG.........
........GggG........
.....ooooooooo......
...ooOOOOOOOOOoo....
..ooOOOOOOOOOOOoo...
..oOOOkkOOkkOOOOo...
.ooOOOkkOOkkOOOOoo..
.oOOOOOOOOOOOOOOOo..
.oOOOOkkkkkkkOOOOo..
.ooOOOkWkWkWkOOOoo..
..ooOOOkkkkkOOOoo...
...oooOOOOOOOooo....
......ooooooo.......
.....ttttttttt......
....ttttttttttt.....
...tttt.tttt.tttt...
...ttt..tttt..ttt...
..tt....tt.tt...tt..
""", {'o': '#7a3c14', 'O': '#c8742a', 'G': '#2e7a2e', 'g': '#52b24a', 'k': '#2a1408', 'W': '#fff0c0', 't': '#d8b078'},
    {15: '...tttt.tttt.tttt...', 16: '...ttt..tttt...ttt..', 17: '..tt....tt.tt....tt.'})


# --- Boto Cor-de-Rosa: o boto em pé, de chapéu panamá --------------------------------------------------------------------
comum('boto', """
.........wwww...........
.......wwwwwwww.........
....wwwwwwwwwwwwww......
.....wwwwwwwwwwww.......
.......ppppppp..........
.....pPppppppppp........
....ppppkpppppppp.......
..PPppppppppppppPp......
.PPPpppppppppppppPp.....
..PPPpppppppppppppp.....
...PpppwwwwwwpppppP.....
....ppppwwwwwpppppp.....
.....pppppppppppppP.....
......ppppppppppP.......
.......pppppppPP........
........pppppPP.........
.........ppppP..........
..........pppP..........
.........PPppPP.........
........PPPpPPPP........
.......PPP..pPPPP.......
""", {'p': '#ff8cb4', 'P': '#d84a80', 'w': '#f4f0e8', 'k': '#2a1020'},
    {19: '........PPPpPPPP........', 20: '.......PPP...pPPPP......'})


# --- Anhangá: um veado branco quase transparente de olhos em brasa -------------------------------------------------------
comum('anhanga', """
..w..w..w....w..w..w........
..w..ww.w...ww..w.w.........
..ww.w.ww..ww..ww.w.........
...w.wwww..www.w.w..........
....wwwwwwwwww.ww...........
.....wwwwwwww...............
.....wwwwwwwww..............
...wwrwwwwwwwwww............
..wwwwwwwwwwwwwww...........
.wwwwwwwwwwwwwwwwwwwwwwww...
..w.wwwwwwwwwwwwwwwwwwwwwWw.
......wWwwwwwwwwwwwwwwwwwwW.
.......WwwwwwwwwwwwwwwwwwwW.
.......wwwwwwwwwwwwwwwwwww..
.......ww.ww.......ww.ww....
.......ww.ww.......ww.ww....
......wW..wW......wW..wW....
......ww..ww......ww..ww....
""", {'w': '#e8f4ff', 'W': '#a8c4ec', 'r': '#ff3a1c'},
    {16: '.......wW.wW.....wW..wW....', 17: '.......ww.ww.....ww..ww.....'})


# --- Boi da Cara Preta: o boi preto da cantiga, de olhos brancos -----------------------------------------------------------
comum('boi-cara-preta', """
.ww................ww....
.wwW..............wW.....
..wwk............kkw.....
...wkkkkkkkkkkkkkkkkk....
...kkkkkkkkkkkkkkkkkkkk..
..kkkkkkkkkkkkkkkkkkkkkk.
.kkEkkkkkkkkkkkkkkkkkkkk.
kkkkkkkkkkkkkkkkkkkkkkkkk
kkrkkkkkkkkkkkkkkkkkkkkkk
.kkkkkkkkkkkkkkkkkkkkkkkk
..kkkkkkkkkkkkkkkkkkkkkk.
...kkkkkkkkkkkkkkkkkkkk..
....kkk..kkk....kkk.kkk..
....kk...kk.....kk..kk...
....kk...kk.....kk..kk...
...kkk..kkk....kkk.kkk...
""", {'k': '#2e2a3c', 'w': '#f4f0e0', 'W': '#c8c0a8', 'E': '#ffe040', 'r': '#ff3a3a'},
    {12: '....kkk..kkk...kkk..kkk.', 13: '....kk...kk....kk...kk..', 14: '....kk...kk....kk...kk..', 15: '...kkk..kkk...kkk..kkk..'})


# --- Pisadeira: a velha magra de unhas compridas, em pé no escuro ----------------------------------------------------------
comum('pisadeira', espelho("""
.....hhhhhhh
....hhHhhhhh
...hhhhhhhhh
...hhssssshh
...hhsrrsrrh
...hhsskssks
....hsssssss
....hsssmmmm
.....sssssss
.....ddddddd
...sdddddddd
..ssdddDdddd
.ssdddddddDd
ssddddddddDd
sw.dddDddddd
sw.ddddddddd
w..ddddddddD
...dddDddddd
...ddddddddd
...dddddddDd
...dddDddddd
...ddddddddd
....ddddddDd
....dd.ddd.d
....dd.ddd.d
"""), {'h': '#3a3048', 'H': '#6a5a82', 's': '#c8b8d8', 'd': '#52405e', 'D': '#322640', 'r': '#ff3030', 'k': '#1a1020', 'm': '#7a2a4a', 'w': '#f4f0e8'},
    {})


# --- Homem do Saco: o velho curvado com o saco enorme nas costas ---------------------------------------------------------------
comum('homem-do-saco', """
............hhhhh.........
...........hhHhhhh........
.....ttt...hhhhhhhh.......
....tttttt.bbbbbbbbbb.....
...ttttttt.bBbbbbbbbbb....
..ttkttktt.bbbbbbbbbbbb...
..tttttttt.bbbbbbBbbbbbb..
..ttwwwwwt.bbbbbbbbbbbbb..
...twwwwwt.bbbbbbbbbbbbb..
....wwwwt..bbbbbbbbbbbbb..
....cccccc.bbbbbbbbbbbBb..
...ccccccccbbbbbbbbbbbbb..
..cccccccccbbbbbBbbbbbb...
..ccccccccc.bbbbbbbbbb....
..cccCcccc...bbbbbbb......
..ccc.ccc.................
..ccc.ccc.................
.nnnn.nnnn................
""", {'h': '#5a3a22', 'H': '#8a6a42', 't': '#e0b48a', 'k': '#1a1410', 'w': '#e8e4dc', 'c': '#5a4a38', 'C': '#3a2e22', 'b': '#a08a5a',
      'B': '#7a6a40', 'n': '#2a1a10'},
    {})


# --- Corpo-seco: o morto magro, de casca de árvore, braços esticados ------------------------------------------------------------
comum('corpo-seco', espelho("""
.....bbbbb
....bBbbbb
....bbbbbb
...bbwkbbw
...bbwkbbb
....bbbbbb
.....bbmmm
......bbbb
.bbb..bBbb
b.bbbbbbbb
bbBbbBbBbb
b..bbbbbbb
b..bBbbBbb
b...bbbbbb
.....bBbbb
......bbbb
......bbbb
.....bbbbb
.....bbbbb
....bbb.bb
....bbb.bb
...bbbb.bb
"""), {'b': '#8a7a5a', 'B': '#4a4030', 'w': '#fff4c8', 'k': '#e0281c', 'm': '#1a1410'},
    {})

def deslocar(texto, de, ate, dx):
    """Troca de lugar (em `dx` colunas) as linhas de `de` a `ate` (inclusive): o balanço do quadro B."""
    linhas = grade(texto)
    saida = {}
    for y in range(de, ate + 1):
        linha = linhas[y]
        saida[y] = ('.' * dx + linha)[:len(linha)] if dx > 0 else (linha[-dx:] + '.' * -dx)
    return saida


# =============================================================================================================================
# Chefes
# =============================================================================================================================

# --- Curupira: o menino de cabelo de fogo, com os pés virados para trás (os dedos apontam para a direita, de costas) -------------
CURUPIRA = """
............o.....o.........
...........oo....oo..o......
..........ooyo..ooyo.oo.....
.........ooyyoo.ooyyoooo....
........OoyyyoooyyyyooyoO...
.......OooyyyoooooyyyooooO..
.......OoooyyooooooyyoooOO..
......OooooooooooooooooooO..
......OoooooooooooooooooOO..
......OOooooooooooooooooO...
......kOOooooooooooooOOO....
.....kkkOOOoooooooOOO.......
....kkkkkkOOOOOOOOO.........
....kkwwkkkkkkkkk...........
....kkwpkkkkkkkkk...........
....kkkkkkkkkkkk............
....kmmkkkkkkkk.............
.....kkkkkkkkk..............
......kkkkkkk...............
.....kkkkkkkkkk.............
....kkkkkkkkkkkk............
...kkkKkkkkkkkkkk...........
...kk.kkkkkkkkkkk...........
...kk.GgGgGgGgGg............
......GGgGgGgGGG............
.......GgGgGgG..............
......kkk...kkk.............
......kkk...kkk.............
......kkk...kkk.............
......kkk...kkk.............
......kkk...kkk.............
......kkkkkkkkkkk...........
.......kkkkkkkkkkk..........
"""
chefe('curupira', CURUPIRA, {'o': '#ff7a1c', 'O': '#d8301a', 'y': '#ffe04a', 'k': '#b87848', 'K': '#8a5430', 'w': '#ffffff', 'p': '#1a1010',
                             'm': '#5a2a1a', 'g': '#46b04a', 'G': '#217a30'},
      {**deslocar(CURUPIRA, 0, 5, 1)})


# --- Caipora: a menina de cachimbo e tocha em cima do porco-do-mato, que arrepia as cerdas --------------------------------------
def caipora(fase=0):
    g = Grade(40, 34)
    elipse(g, 23, 22.5, 15.5, 7.0, 'n')
    for y in range(26, 30):                       # barriga mais escura
        for x in range(10, 38):
            if g.ler(x, y) == 'n':
                g.pôr(x, y, 'N')
    elipse(g, 7, 23, 6.5, 5.5, 'n')               # cabeça
    for x, y in ((0, 24), (1, 24), (0, 25), (1, 25), (2, 26)):
        g.pôr(x, y, 'q')                          # focinho
    g.pôr(0, 24, 'Q')
    for x, y in ((1, 22), (0, 21), (0, 20), (1, 19)):
        g.pôr(x, y, 'w')                          # presa que sobe
    for x, y in ((4, 20), (5, 20)):
        g.pôr(x, y, 'e')                          # olho
    g.pôr(4, 20, 'r')
    # Cerdas do dorso: espinhos pretos que se arrepiam.
    for k, x in enumerate(range(9, 38, 2)):
        topo = 15 if k % 2 else 14
        for y in range(topo, 17):
            g.pôr(x + (fase if k % 2 else 0), y, 'B')
    # Patas e cascos.
    for x in (10, 15, 27, 32):
        for y in range(27, 33):
            for dx in range(3):
                g.pôr(x + dx, y, 'n' if dx < 2 else 'N')
        for dx in range(3):
            g.pôr(x + dx, 33, 'B')
    # Rabinho.
    for x, y in ((38, 20), (39, 19), (39, 18)):
        g.pôr(x, y, 'N')
    # A menina: corpo laranja, cabeça escura de cabelo preto e cachimbo; um braço levanta a tocha.
    for y in range(11, 17):
        for x in range(19, 27):
            g.pôr(x, y, 'o' if y < 15 else 'O')
    elipse(g, 22.5, 7.5, 4.0, 4.0, 'k')
    for x in range(18, 28):
        for y in range(3, 7):
            if g.ler(x, y) == 'k':
                g.pôr(x, y, 'h')
    for x, y in ((20, 7), (23, 7)):
        g.pôr(x, y, 'w')
    g.pôr(20, 7, 'e')
    g.pôr(22, 10, 'p')
    g.pôr(21, 10, 'p')
    g.pôr(19, 10, 'p')
    g.pôr(19, 9, 'm')
    # Braço e tocha.
    for x, y in ((19, 12), (18, 11), (17, 10), (16, 9), (15, 8)):
        g.pôr(x, y, 'k')
    for y in range(4, 9):
        g.pôr(14, y, 't')
        g.pôr(15, y, 't')
    chama = [(13, 3), (14, 3), (15, 3), (12, 2), (13, 2), (14, 2), (15, 2), (16, 2), (13, 1), (14, 1), (15, 1), (14, 0), (14, 4)]
    for x, y in chama:
        g.pôr(x + (fase if y < 2 else 0), y, 'y' if y > 1 else 'f')
    for x, y in ((14, 2), (14, 3), (15, 3)):
        g.pôr(x, y, 'z')
    return g.texto()


CAIPORA_CORES = {'n': '#7a4a2a', 'N': '#4e2c18', 'B': '#2a1a14', 'q': '#c89a78', 'Q': '#8a5a40', 'w': '#fff4d8', 'e': '#1a1010', 'r': '#e8381c',
                 'o': '#ffa030', 'O': '#d07018', 'k': '#6a3c28', 'h': '#1a1214', 'p': '#8a6a3a', 'm': '#e0e0e0', 't': '#6a4018',
                 'y': '#ff8a1c', 'f': '#ffd23a', 'z': '#fff4a8'}
CHEFES['caipora'] = [pintar(caipora(0), CAIPORA_CORES), pintar(caipora(1), CAIPORA_CORES)]


# --- Iara: a mãe-d'água, de cabelo comprido e cauda de peixe, cantando em cima da água ----------------------------------------
def iara(fase=0):
    g = Grade(32, 40)
    # Cabelo comprido (atrás do corpo): cai pelos dois lados até a cintura.
    elipse(g, 15, 7.5, 7.5, 7.5, 'h')
    for y in range(9, 27):
        larg = 4 if y < 20 else 3
        for dx in range(larg):
            g.pôr(7 + dx - (1 if y > 18 else 0), y, 'h' if (y + dx) % 5 else 'H')
            g.pôr(23 - dx + (1 if y > 18 else 0), y, 'h' if (y + dx) % 5 else 'H')
    # Cauda: serpenteia para a direita e termina em nadadeira.
    for y in range(19, 36):
        t = (y - 19) / 16
        cx = 15 + 5 * math.sin(t * math.pi * 0.95) + (fase * 0.6 if y > 28 else 0)
        meia = 5.6 - 3.4 * t
        for x in range(32):
            if abs(x - cx) <= meia:
                escama = ((x + y) % 4 == 0)
                g.pôr(x, y, 'L' if escama else ('T' if x > cx + meia * 0.35 else 't'))
    cx_fim = 15 + 5 * math.sin(math.pi * 0.95) + fase * 0.6
    for k in range(7):
        g.pôr(round(cx_fim) + 1 + k, 36 - k // 2 - (1 if k > 3 else 0), 'F')
        g.pôr(round(cx_fim) + 1 + k, 37 + k // 3, 'F')
        g.pôr(round(cx_fim) + k, 36, 'f')
    # Corpo e rosto.
    for y in range(11, 21):
        meia = 4.2 if y < 14 else 3.4
        for x in range(32):
            if abs(x - 15) <= meia:
                g.pôr(x, y, 's' if x < 17 else 'S')
    elipse(g, 15, 7.5, 4.6, 5.2, 's')
    for x, y in ((12, 7), (17, 7)):
        g.pôr(x, y, 'w')
        g.pôr(x + 1, y, 'e')
    g.pôr(13, 10, 'm')
    g.pôr(14, 10, 'm')
    g.pôr(15, 10, 'm')
    for x in range(11, 20):
        g.pôr(x, 3, 'h')
        if x in (11, 12, 18, 19):
            g.pôr(x, 4, 'h')
    # Conchas no peito e colar de pérolas.
    for x, y in ((12, 14), (13, 14), (14, 14), (16, 14), (17, 14), (18, 14), (12, 15), (13, 15), (14, 15), (16, 15), (17, 15), (18, 15)):
        g.pôr(x, y, 'p')
    for x, y in ((13, 14), (17, 14)):
        g.pôr(x, y, 'P')
    for x in range(12, 19):
        g.pôr(x, 12 if x in (12, 18) else 13, 'z')
    # Braços para os lados, uma mão levantada.
    for x, y in ((11, 14), (10, 15), (9, 16), (9, 17), (8, 18)):
        g.pôr(x, y, 's')
    for x, y in ((19, 14), (20, 13), (21, 12), (22, 11), (22, 10)):
        g.pôr(x, y, 'S')
    # Ondas embaixo e uma vitória-régia.
    for x in range(2, 30):
        g.pôr(x, 38 + ((x // 3 + fase) % 2), 'a' if (x // 3) % 2 else 'A')
    return g.texto()


IARA_CORES = {'h': '#0e4a46', 'H': '#1c7a6a', 's': '#f0c8a0', 'S': '#d8a078', 'w': '#ffffff', 'e': '#1a2a4a', 'm': '#c83a5a', 'p': '#ff9ac0',
              'P': '#d8508a', 'z': '#f8f4ea', 't': '#1aa8a0', 'T': '#0e7a80', 'L': '#7ae8d8', 'F': '#58d0e0', 'f': '#2a98b0', 'a': '#58b0f0',
              'A': '#3a78d8'}
CHEFES['iara'] = [pintar(iara(0), IARA_CORES), pintar(iara(1), IARA_CORES)]


# --- Boitatá: a cobra de fogo, ondulando pelo chão com a crista em chamas --------------------------------------------------------
def boitata(fase=0):
    g = Grade(50, 34)
    rng = random.Random(7)
    corpo = []
    for x in range(10, 49):
        t = (x - 10) / 38
        cy = 22 + 5.5 * math.sin(t * math.pi * 2.3 + fase * 0.9 + 0.4)
        r = 4.6 - 2.6 * t
        corpo.append((x, cy, r))
    # Chamas nas costas.
    for x, cy, r in corpo:
        if x % 3 == 0:
            alt = 2 + rng.randrange(3) + (1 if (x // 3 + fase) % 2 else 0)
            for k in range(alt):
                g.pôr(x, round(cy - r) - 1 - k, 'y' if k < alt - 1 else 'f')
                if k < alt - 2:
                    g.pôr(x + 1, round(cy - r) - 1 - k, 'o')
    for x, cy, r in corpo:
        for y in range(int(cy - r), int(cy + r) + 2):
            d = abs(y - cy) / r
            if d <= 1.0:
                g.pôr(x, y, 'z' if d < 0.28 else 'y' if d < 0.55 else 'o' if d < 0.85 else 'r')
    # Cabeça grande com olho enorme, dentes e chifres de fogo.
    elipse(g, 8, 20.5, 8.0, 6.5, 'r')
    elipse(g, 8.5, 20.5, 6.6, 5.2, 'o')
    elipse(g, 9, 20, 4.5, 3.4, 'y')
    for x, y in ((4, 18), (5, 18), (6, 18), (4, 19), (5, 19), (6, 19), (4, 20), (5, 20), (6, 20)):
        g.pôr(x, y, 'w')
    g.pôr(4, 19, 'e')
    g.pôr(4, 20, 'e')
    g.pôr(5, 19, 'e')
    for x in range(1, 8):
        g.pôr(x, 24, 'k')
    for x in (2, 4, 6):
        g.pôr(x, 25, 'w')
    for k, (x, y) in enumerate(((4, 14), (3, 13), (3, 12), (9, 13), (10, 12), (10, 11), (7, 14), (7, 12), (6, 11))):
        g.pôr(x + (fase if y < 13 else 0), y, 'y' if k % 2 else 'f')
    # Ponta da cauda em chama.
    ponta = corpo[-1]
    for k in range(5):
        g.pôr(48, round(ponta[1]) - k, 'y' if k < 3 else 'f')
    return g.texto()


BOITATA_CORES = {'z': '#fff6b8', 'y': '#ffd23a', 'o': '#ff8a1c', 'r': '#d8301a', 'f': '#ff5a1c', 'w': '#ffffff', 'e': '#1a1010', 'k': '#4a1008'}
CHEFES['boitata'] = [pintar(boitata(0), BOITATA_CORES), pintar(boitata(1), BOITATA_CORES)]


def chama(g, cx, base, alto, larg, fase, cores='rofyz'):
    """Uma chama de `alto` linhas subindo de `base`, com `larg` de meia largura na base (a ponta balança com a `fase`)."""
    for k in range(alto):
        t = k / alto
        meia = larg * (0.55 + 0.45 * math.sin(math.pi * min(1.0, t * 1.15 + 0.1))) * (1 - t ** 3)
        bal = math.sin(t * 5 + fase * 2.2) * 1.4 * t
        for x in range(int(cx - larg - 3), int(cx + larg + 4)):
            d = abs(x - (cx + bal))
            if d <= meia:
                n = d / max(meia, 0.5)
                cor = cores[4] if (n < 0.3 and t < 0.55) else cores[3] if n < 0.55 else cores[1] if n < 0.85 else cores[0]
                g.pôr(x, base - k, cor)


# --- Mula-sem-cabeça: a mula a galope que, no lugar da cabeça, tem uma labareda --------------------------------------------------
def mula(fase=0):
    g = Grade(46, 40)
    elipse(g, 26, 23, 13.5, 6.8, 'n')
    for y in range(26, 30):
        for x in range(12, 40):
            if g.ler(x, y) == 'n':
                g.pôr(x, y, 'N')
    # Pescoço sem cabeça, subindo para a esquerda.
    for t in range(0, 12):
        x = 15 - t * 0.55
        y = 20 - t * 1.0
        elipse(g, x, y, 3.6, 3.0, 'n')
    # Cabeça de fogo.
    chama(g, 8, 11, 14, 6, fase)
    for k in range(5):                                  # crina em chamas descendo pelo pescoço
        g.pôr(15 - k // 2 + 3, 12 + k * 2, 'o')
        g.pôr(16 - k // 2 + 3, 12 + k * 2, 'r')
    # Patas em galope: as da frente levantadas, as de trás esticadas para trás.
    patas = (((13, 26), (8, 31), (6, 36)), ((17, 27), (15, 32), (14, 37)), ((34, 27), (38, 31), (41, 35)), ((30, 28), (30, 33), (31, 37)))
    if fase:
        patas = (((13, 26), (9, 29), (4, 33)), ((17, 27), (17, 32), (17, 37)), ((34, 27), (37, 32), (39, 36)), ((30, 28), (32, 33), (34, 37)))
    for pata in patas:
        for (x0, y0), (x1, y1) in zip(pata, pata[1:]):
            passos = max(abs(x1 - x0), abs(y1 - y0))
            for i in range(passos + 1):
                x = x0 + (x1 - x0) * i / passos
                y = y0 + (y1 - y0) * i / passos
                for dx in (0, 1):
                    g.pôr(round(x) + dx, round(y), 'n' if dx == 0 else 'N')
        xf, yf = pata[-1]
        for dx in range(-1, 3):
            g.pôr(xf + dx, yf + 1, 'k')
        g.pôr(xf, yf + 1, 'y')
        g.pôr(xf + 1, yf + 1, 'y')
    # Rabo de fogo.
    for t in range(9):
        g.pôr(38 + t // 2, 18 + t, 'r' if t % 2 else 'o')
        g.pôr(39 + t // 2, 18 + t, 'o' if t % 2 else 'y')
    chama(g, 43, 18, 6, 3, fase + 1)
    return g.texto()


MULA_CORES = {'n': '#8a5a34', 'N': '#5a3418', 'k': '#2a1a14', 'y': '#ffd23a', 'o': '#ff8a1c', 'r': '#d8301a', 'f': '#ff5a1c', 'z': '#fff6b8'}
CHEFES['mula-sem-cabeca'] = [pintar(mula(0), MULA_CORES), pintar(mula(1), MULA_CORES)]


# --- Lobisomem: o homem-lobo de pelo cinza e olho amarelo, com a calça rasgada ----------------------------------------------------
LOBISOMEM = espelho("""
......ff........
.....fFFf.......
.....fFFff......
.....ffffffff...
.....fffffffff..
.....ffffffffff.
.....ffyyfffffff
.....ffykffflfff
.....fffffffffnn
......ffffffffmm
......fffffffwmm
.......ffffffwwm
.......fffffffff
.....fffffffffff
...ffffffflfffff
.ffffffffffffff.
fffFffffffffffff
ffFFfffffFfffflf
ffFfffffffffFfff
ffff.fffffffFfff
fff..ffflfffFfff
cff..ffffffffffF
c.c..fffffffFfff
.....pppppppppp.
.....pppPpppppp.
....ppppppPppppp
....pppp.ppppppp
....pppp.pppp.pp
....ppPp.ppPp.pp
....ffff.ffff.ff
...ffffff.fffffp
...cc.cc..c.cc..
""")
chefe('lobisomem', LOBISOMEM, {'f': '#8a8a9c', 'F': '#55556a', 'l': '#b8b8cc', 'y': '#ffe040', 'k': '#1a1010', 'w': '#fff8e8', 'm': '#7a1a2a',
                               'n': '#2a1a20', 'c': '#f4f0e0', 'p': '#6a4a2a', 'P': '#4a3018'},
      {**deslocar(LOBISOMEM, 14, 22, 1)})


# --- Cuca: a bruxa de cabeça de jacaré, chapéu pontudo e vestido roxo -----------------------------------------------------------
CUCA = espelho("""
...............p
..............pp
.............ppp
............pppp
...........ppppp
..........pPpppp
.........pppppPp
.....yyyyyyyyyyy
....pppppppppppp
...jjjjjjjjjjjjj
..jjjJjjjjjjjjJj
..jjjjjjjjjjjjjj
..jjwkjjjjjjjjjj
..jjwkkjjjjjjjjj
..jjjjjjjjjjjjnn
...jjjjjjjnjjjjn
...jjjjjjjjjjjjj
...jmmmmmmmmmmmm
...jwmwmwmwmwmwm
....jjjjjjjjjjjj
.....jjjjjjjjjjj
..hh.vvvvvvvvvvv
.hhhvvvvvvvvvvVv
hhhhvvvVvvvvvvvv
hhhhvvvvvvvvvVvv
hhhvvvvvVvvvvvvv
.hhvvvvvvvvvvvvv
..hvvvvvvVvvvvvv
..jvvvvvvvvvvvVv
..jjvvvvvvvvvvvv
...jvvvvVvvvvvvv
....vvvvvvvvvVvv
....vvvvvvvvvvvv
...vVvvvvvVvvvvv
...vvvvvvvvvvvvV
""")
chefe('cuca', CUCA, {'p': '#6a3a98', 'P': '#4a2670', 'y': '#ffd23a', 'j': '#5ab048', 'J': '#2e7a30', 'w': '#fff8e8', 'k': '#1a1010', 'n': '#2a3a1a',
                     'm': '#3a1a2a', 'h': '#e8c448', 'v': '#48287a', 'V': '#2e1a50'},
      {**deslocar(CUCA, 21, 27, 1)})


# --- Mapinguari: o gigante peludo de um olho só e uma boca enorme na barriga ----------------------------------------------------
MAPINGUARI = espelho("""
.......rrrrrrrrr
.....rrrRrrrrrrr
....rrrrrrRrrrrr
...rrrRrrrrrrrrr
..rrrrrrrrrrrrrr
..rrrrrrrrrwwwww
..rrrrrrrrwwyyyy
..rrrrrrrrwwykkk
..rrrrrrrrrwwyyy
..rrrrrRrrrrwwww
...rrrrrrrrrrrrr
...rrrrRrrrrrrrr
..rrrrrrrrrrrrrr
.rrrRrrrrrrrrrrr
rrrrrrrrrRrrrrrr
rrRrrrrrrrrrrRrr
rrrrrrbbbbbbbbbb
rrrrrbbmmmmmmmmm
rRrrbbmwmwmwmwmw
rrrrbbmmmmmmmmmm
rrrrrbbmmmmmmmmm
rrRrrrbbmmmmmmmm
rrrrrrrbbbbbbbbb
rrrrrrrrrrrrrrrr
rcrrrrrrrRrrrrrr
rcrrrrrrrrrrrrRr
c.crrrrrrrrrrrrr
c.c.rrrrrrrrrrrr
.....rrrRrrrrrrr
....rrrrrrrrrrrr
....rrrrrrrrRrrr
....rrrr.rrrrrrr
....rrrr.rrrrrrr
...rrrrr.rrrrrrr
...cc.cc.c.cc.cc
""")
chefe('mapinguari', MAPINGUARI, {'r': '#a8503a', 'R': '#6e2e20', 'w': '#fff8e8', 'k': '#1a1010', 'y': '#ffe040', 'b': '#5a2a1c', 'm': '#4a0e1a',
                                  'c': '#f4f0e0'},
      {**deslocar(MAPINGUARI, 14, 22, 1)})


# --- Boiúna: a cobra grande, preta e brilhante, saindo do rio com olhos verdes de lanterna ----------------------------------------
def boiuna(fase=0):
    g = Grade(48, 44)
    passo = 0.004
    t = 0.0
    centro = None
    while t <= 1.0:
        x = 30 + 7 * math.sin(t * math.pi * 2.2 + 0.6 + fase * 0.25)
        y = 40 - t * 30
        raio = 5.2 - 1.8 * t
        for dy in range(-6, 7):
            for dx in range(-6, 7):
                d = math.hypot(dx, dy)
                if d <= raio:
                    px, py = round(x + dx), round(y + dy)
                    ladrilho = ((px + py) % 4 == 0) and d > raio * 0.35
                    g.pôr(px, py, 'l' if ladrilho else 'B' if dx > raio * 0.25 else 'b' if d > raio * 0.55 else 'm')
        centro = (x, y)
        t += passo
    # Cabeça virada para a esquerda, boca aberta com língua.
    hx, hy = centro[0] - 4, centro[1] - 1
    elipse(g, hx, hy, 7.0, 4.6, 'b')
    elipse(g, hx - 1, hy - 1, 5.0, 2.8, 'm')
    for dx in range(-7, 0):
        g.pôr(round(hx + dx), round(hy + 3), 'B')
    for x, y in ((hx - 4, hy - 2), (hx + 1, hy - 2)):
        g.pôr(round(x), round(y), 'g')
        g.pôr(round(x) + 1, round(y), 'g')
        g.pôr(round(x), round(y) + 1, 'G')
    for k in range(7):
        g.pôr(round(hx - 7 - k), round(hy + 1 + (k % 2) * (1 if fase else -1)), 'r')
    g.pôr(round(hx - 11), round(hy), 'r')
    g.pôr(round(hx - 11), round(hy + 2), 'r')
    for dx in (-5, -3, -1):
        g.pôr(round(hx + dx), round(hy + 2), 'w')
    # Rio em volta da base.
    for x in range(8, 46):
        for dy in (0, 1):
            g.pôr(x, 40 + dy + ((x // 3 + fase) % 2), 'a' if (x // 3) % 2 else 'A')
    for x in range(14, 40):
        g.pôr(x, 43, 'A')
    return g.texto()


BOIUNA_CORES = {'b': '#26344a', 'B': '#121a2a', 'm': '#3c5470', 'l': '#6a88a8', 'g': '#7affa0', 'G': '#2ab860', 'r': '#e83a4a', 'w': '#f4f0e8',
                'a': '#58a8e8', 'A': '#2e6ab8'}
CHEFES['boiuna'] = [pintar(boiuna(0), BOIUNA_CORES), pintar(boiuna(1), BOIUNA_CORES)]


# --- Boi-Bumbá: o boi de festa, de capa de veludo bordada, fitas coloridas e chifre enfeitado --------------------------------------
def boi_bumba(fase=0):
    g = Grade(46, 40)
    elipse(g, 26, 20, 14.5, 7.0, 'k')
    elipse(g, 8, 19.5, 6.8, 5.6, 'k')
    for x, y in ((1, 22), (2, 22), (1, 23), (2, 23), (3, 24), (0, 22)):
        g.pôr(x, y, 'g')
    g.pôr(1, 22, 'n')
    g.pôr(4, 18, 'w')
    g.pôr(5, 18, 'e')
    for x, y in ((8, 15), (7, 16), (9, 16), (8, 17)):
        g.pôr(x, y, 'w')                                 # estrela na testa
    # Chifres brancos curvos, com fitas e flores nas pontas.
    for k in range(9):
        g.pôr(5 - k // 3, 14 - k, 'h')
        g.pôr(6 - k // 3, 14 - k, 'h')
        g.pôr(11 + k // 3, 14 - k, 'h')
        g.pôr(12 + k // 3, 14 - k, 'h')
    for dx, cor in ((0, 'p'), (1, 'y'), (2, 'c')):
        for k in range(4):
            g.pôr(2 + dx + (fase if k > 1 else 0), 6 + k, cor)
            g.pôr(13 + dx + (fase if k > 1 else 0), 5 + k, cor)
    for x, y, cor in ((7, 11, 'p'), (9, 11, 'y'), (8, 12, 'c'), (10, 12, 'p'), (6, 12, 'y')):
        g.pôr(x, y, cor)
    # Capa de veludo vermelho com borda dourada e miçangas.
    for y in range(12, 22):
        for x in range(15, 40):
            if g.ler(x, y) != '.':
                g.pôr(x, y, 'r' if y < 21 else 'y')
    for x, y in ((19, 15), (24, 14), (30, 15), (35, 16), (21, 18), (27, 18), (33, 19), (17, 19)):
        g.pôr(x, y, 'y')
        g.pôr(x - 1, y, 'f')
        g.pôr(x + 1, y, 'f')
        g.pôr(x, y - 1, 'f')
        g.pôr(x, y + 1, 'f')
    # Saia de fitas coloridas até os joelhos.
    fitas = 'pycgbo'
    for x in range(15, 39):
        for y in range(22, 30):
            cor = fitas[(x // 2) % len(fitas)]
            if y > 26 and (x + fase) % 2:
                continue
            g.pôr(x, y, cor)
    # Patas, uma dançando.
    for x in (16, 21, 31, 36):
        for y in range(30, 37):
            if x == 21 and fase and y < 33:
                continue
            g.pôr(x, y, 'k')
            g.pôr(x + 1, y, 'k')
        g.pôr(x, 37, 'h')
        g.pôr(x + 1, 37, 'h')
    if fase:
        for x, y in ((21, 33), (20, 32), (19, 31)):
            g.pôr(x, y, 'k')
            g.pôr(x + 1, y, 'k')
        g.pôr(19, 30, 'h')
        g.pôr(20, 30, 'h')
    for x, y in ((40, 17), (41, 18), (41, 19), (41, 20), (40, 21), (40, 22)):
        g.pôr(x, y, 'k')
    for x, y in ((39, 22), (40, 23), (41, 23), (40, 24)):
        g.pôr(x, y, 'p')
    return g.texto()


BOI_CORES = {'k': '#2a2634', 'g': '#a89cb0', 'n': '#e06080', 'w': '#ffffff', 'e': '#101010', 'h': '#f8f0dc', 'p': '#ff4a9a', 'y': '#ffd23a',
             'c': '#3ad8f0', 'r': '#c8203c', 'f': '#fff4b0', 'b': '#3a6af0', 'o': '#ff8a1c'}
CHEFES['boi-bumba'] = [pintar(boi_bumba(0), BOI_CORES), pintar(boi_bumba(1), BOI_CORES)]
