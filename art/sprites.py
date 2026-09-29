"""Sprites do conceito inicial do Arraiá, desenhados pixel a pixel.

Cada sprite é uma grade de caracteres; '.' é transparente. As cores-chave
'#', '+' e '-' marcam a roupa (luz, meio, sombra) e são preenchidas com o
ladrilho do tecido, como descrito no plano técnico.
"""

PALETTE = {
    '0': '#120906',  # contorno quase preto
    '1': '#2e1812',
    '2': '#4a2418',  # casca escura, puxada para o roxo
    '3': '#80482a',  # casca
    '4': '#bd7a3e',  # casca clara
    '5': '#f0b56a',  # casca brilho
    '6': '#fff8e8',  # polpa clara
    '7': '#efd29a',  # polpa sombra
    '8': '#c0965c',  # polpa sombra funda
    '9': '#ffffff',
    'e': '#140c1c',  # olho
    'm': '#6a1026',  # boca
    'n': '#ff5c7a',  # língua
    'c': '#ff8a96',  # bochecha
    'Y': '#ffe27a',  # palha clara
    'y': '#e3a232',  # palha
    'o': '#94541a',  # palha escura
    'R': '#ee2f3c',
    'r': '#8a1030',
    'p': '#ff907a',
    'X': '#fff4e4',
    'J': '#3a6cf0',
    'j': '#1c2f8a',
    'b': '#9fc8ff',
    'G': '#9ef05a',
    'g': '#35a03a',
    'v': '#155428',
    'F': '#fff07a',
    'f': '#ffac2a',
    'q': '#ff5a1e',
    'Q': '#a8180e',
    'z': '#fffff0',
    'D': '#7c421e',  # madeira
    'd': '#361a0c',
    'l': '#c07a36',
    'T': '#dca66a',  # terra batida
    'U': '#9a6030',
    'u': '#58341c',
    'P': '#9d5cf0',  # batata-doce
    'i': '#44208a',
    'I': '#cfa2ff',
    'K': '#ff8a12',  # cenoura
    'k': '#b44a0a',
    'O': '#ffc460',
    'S': '#c8ccd6',  # metal
    's': '#5e6474',
    'H': '#ff4f9e',
    'h': '#ad1e66',
    'A': '#ffd21e',
    'a': '#c07e08',
    'C': '#3fd6f0',
    'x': '#f0d49a',  # papel, barbante
    'W': '#fff6f0',
    'N': '#1e3a8a',  # água funda
    'B': '#48a8ff',  # água
    'E': '#c9a98e',  # pelo bege-acinzentado do Sopinha
    'V': '#9a7e6c',  # sombra do bege
    'M': '#8f807e',  # orelha cinza-taupe
    'L': '#5f5050',  # dobra da orelha, focinho
    'w': '#ddd3d6',  # sombra do pelo branco
}

# Ladrilhos de tecido: cada letra é uma cor da paleta.
FABRICS = {
    'xadrez-vermelho': ['rrRR', 'rrRR', 'RRXX', 'RRXX'],
    'xadrez-azul': ['jjJJ', 'jjJJ', 'JJXX', 'JJXX'],
    'chita': ['JJJJJJ', 'JJRJJJ', 'JRARJJ', 'JJRJJG', 'JJJJJJ', 'JGJJJJ'],
    'chita-rosa': ['HHHHHH', 'HHJHHH', 'HJAJHH', 'HHJHHG', 'HHHHHH', 'HGHHHH'],
}

MANDIOCA = """
........00000000........
.......0YYYYYYYy0.......
......0YYyYYYYYyy0......
......0yYYyYYYyyo0......
..00000RARRRRRRrr00000..
.0YYYYYooooooooooYYYyy0.
0yYYyYYYyYYYYyYYYyYYyyo0
0oyyyyyyyyyyyyyyyyyyyoo0
.0000000000000000000000.
.....02233333333220.....
....0433377777733220....
....0543766666673220....
....04236ee66ee73220....
....044369e669e73120....
.00.04436ee66ee73220....
054004336c6666c73220....
0430042366mmmm673120....
.030043337mnnm733220....
.030.043337mm733220.....
..0300JbJJ9JJJJ9Jj0.....
..0300jJjjjJJjjjJj0.....
...03##+++jJJj+++--00...
....0###+++jj++++--330..
....0##+++++A++++--0030.
....0##++++++++++--0.030
....0#++++++A+++---0.050
....0#++++++++jJJ--0.040
....0#++++++A+jJJ--0..0.
....0+++++++++jjj--0....
....0++++++++++----0....
....0000000000000000....
.....04433323332220.....
.....04333233322220.....
......043323332220......
.......0433233220.......
........04332220........
........04300320........
........04300320........
.......0ddD00Ddd0.......
.......0000..0000.......
"""

MILHO = """
.....o.o.o......
......oyYo......
.....0yYyo0.....
....0FAFAFA0....
...0AFAFAFAa0...
...0FAFAFAaa0...
...0AeAFAeaa0...
..00FeFAFeaa00..
.0G0FcmmmcFa0G0.
.0Gg0FAFAFa0vG0.
..0Gg0AFAa0vG0..
..0GGg0FA0vgG0..
..0gGGg00vgGg0..
...0gGGgvgGg0...
...0vgGGGGgv0...
....0vggggv0....
.....000000.....
.....0d00d0.....
....0dd00dd0....
....00000000....
"""

FAISCA = """
.....q.....
....qfq....
...qfFfq...
..qfFzFfq..
.qfFzzzFfq.
.qFzezezFq.
qfFzezezFfq
qfFzzmzzFfq
qfFFzzzFFfq
.qfFFFFFfq.
..qffFffq..
...qqqqq...
"""

CENOURA = """
.....0G0.0G0....
....0GgG0GvG0...
.....0gGgGv0....
......0vgv0.....
.....0OOKKk0....
....0OKKKKKk0...
...0OKKKKKKKk0..
...0OKeKKKeKk0..
...0OKeKKKeKk0..
...0KcKmKmKck0..
...0OKKKmKKKk0..
...0#++++++--0..
..0##++++++---0.
..0#+++++++---0.
.0##++++++++---0
.0#+++++++++---0
.000000000000000
.....0KKKk0.....
.....0OKKk0.....
......0Kk0......
....0k0..0k0....
....0k0..0k0....
...0Hh0..0Hh0...
...0000..0000...
"""

BATATA = """
......0H0.......
.....0GgG0......
......0v0.......
.....0IPPP0.....
....0IIPPPPi0...
...0IPPPPPPPi0..
...0IPPPIPPPi0..
..0IPeePPeePi0..
..0IPPPPPPPPi0..
..0IcPPmmPPci0..
..0IPPPPPPPPi0..
..0##++++++--0..
.0###++++++---0.
.0##+++++++---0.
.0##+++++++---0.
..0#++++++---0..
..000000000000..
...0IPPPPPPi0...
....0iPPPPi0....
.....0iiii0.....
....0i0..0i0....
....0i0..0i0....
...0dd0..0dd0...
...0000..0000...
"""

INHAME = """
................
....00000000....
...0YYYYYYyo0...
..0RARRRRRRr0...
0YYYYYYYYYYYYyo0
.00000000000000.
..043333332220..
.10433333332201.
..0439e339e220..
.1043ee33ee220..
..0411111112201.
..04333m333220..
.0##+++++++---0.
.0###++++++---0.
0##+++++++++---0
0#++++++++++---0
.0#++++++++---0.
.00000000000000.
...0433332220...
....04333220....
....040..030....
....040..030....
...0dd0..0dd0...
...0000..0000...
"""

AIPIM = """
.....000000.....
....0YYYYyy0....
..00RRRRRRRr00..
.0YYYYYYYYYYyo0.
..000000000000..
..y0436666320y..
..o0466666620o..
..y046e66e620y..
..o04ue66eu20o..
..y0466mm6620y..
..o0436776320o..
..H0##++++--0H..
...0##++++---0..
..0##++++++---0.
..0#+++++++---0.
.0##++++++++---0
.0#+++++++++---0
.000000000000000
.....0433220....
......04320.....
....040..030....
....040..030....
...0HH0..0HH0...
...0000..0000...
"""

BANDEIRINHA = """
000000d
0HHHH0D
0HhHH0D
0HHHH0D
0H00H0D
00..00D
......D
......D
......D
......D
......d
"""

PAMONHA = """
................
.....000000.....
....0GGGGGg0....
...0GGYGGGgg0...
...0gggggggv0...
..0GGGGGGGGgv0..
..0G9eGGG9egv0..
..0GeeGGGeegv0..
..0GcGmmmGcgv0..
..0GGGGnGGGgv0..
..0YYYYooYYYo0..
..0GGgGGGGGgv0..
..0GGGgGGGGgv0..
..0GGGGgGGggv0..
...0GGGGGgGv0...
....0gggggv0....
.....000000.....
.....0d00d0.....
....0dd00dd0....
....00000000....
"""

CACHORRO = """
...00000000000000...
..0RpRRRRRRRRRRRr0..
.0RpAaRAaRAaRAaRRr0.
0RRRR9eRRR9eRRRRRRr0
0RRRReeRRReeRRRRRrr0
0RRRcRRmmmRcRRRRrrr0
.0TTTTTTTTTTTTTTTT0.
0lTTTTTTTTTTTTTTTTl0
0llllllllllllllllll0
0DlllllllllllllllDD0
.0DDDDDDDDDDDDDDDD0.
..0000000000000000..
.....0d0....0d0.....
....0dd0....0dd0....
....0000....0000....
"""

# Criança da festa (aparece correndo quando a festa enche): a mesma cara de mandioca e chapéu de palha da
# quadrilha, em miniatura. Dois quadros de corrida: pernas abertas e pernas juntas.
CRIANCA = """
...0000...
..0YYYy0..
.0YYYYYo0.
..000000..
..046620..
..0e66e0..
..04mm20..
.0#++++-0.
.0#++++-0.
..000000..
..040030..
..0d00d0..
..00..00..
"""

CRIANCA_PASSO = """
...0000...
..0YYYy0..
.0YYYYYo0.
..000000..
..046620..
..0e66e0..
..04mm20..
.0#++++-0.
.0#++++-0.
..000000..
...0430...
...0dd0...
...0000...
"""

# Sopinha, o coelho mini lop (das fotos em sopinha/): branco com manta bege nas costas, orelhas caídas cinza,
# anel bege no olho, faixa branca da testa ao nariz e a mancha escura no focinho. De perfil, virado para a direita.
SOPINHA = """
...............EEEEE....
..............EEEEEEWW..
......EEEE...EEMMEEEEWW.
...EEEEEEEEEEVLMMME9eWW.
.EEEEEEEEEEEVLMMMMEeeWWW
WEEEEEEEEEVWWLMMMMWEEWVL
WWEEEEEEEVWWWLMMMMWWWWVL
WWWEEEEEVWWWWLMMMMWWWWW.
.WWWEEWWWWWWWLMMMMWWWW..
.wWWWWWWEWWWWWLMMMWWWw..
..wWWWWWWWWWWWWLMWWWW...
..wwWWWWWWWWWWWWWWWWWW..
...wwwwwww.....wwwwww...
"""

# No ar: corpo esticado e inclinado, patas de trás estendidas e a orelha voando para cima.
SOPINHA_PULO = """
..........MMMM..EEEEE....
.........MMMMMMEEEEEEWW..
......EEELLLLLLEMMEEEEWW.
...EEEEEEEEEEEEEVEEE9eWW.
.EEEEEEEEEEEEEEVWWWEeeWWW
WEEEEEEEEEEEEVWWWWWWEEWVL
WWEEEEEEEEEVWWWWWWWWWWWVL
WWWEEEEEEVWWWWWWWWWWWWWW.
.WWWWEEWWWWWWWWWWWWWWWW..
.WWwwwwwwwwwwww...WWWW...
WWWWw...............WWWW.
ww....................ww.
"""

# Deitado de lado, de olhos fechados e orelha esparramada no chão: o "flop" de coelho feliz.
SOPINHA_DEITADO = """
......EEEEEEE......EEEE...
...EEEEEEEEEEEE..EEEEEEEW.
.EEEEEEEEEEEEEEVEMMMEEEEWW
WEEEEEEEEEEEEVWMMMMMELLEWW
WWEEEEEEEEEVWWMMMMMMWEEWVL
WWWEEEEEEVWWWMMMMMMWWWWWVL
.WWWEEWWWWWWMMMMMMWWWWWWW.
WWWwwWWWWWWWLMMMMLWWWWWw..
wwww.wwwwwwwwLLLLwwwwww...
"""

PACOCA = """
.0000000000.
0TxTTUTTxTU0
0TTTUTTTTUU0
0T9eTTT9eTU0
0TeeTTTeeTU0
0TcTmmmTcUU0
0TTTTnTTTUU0
0xTTUTTTxUU0
0TTUTTTUTUU0
0UUUUUUUUUu0
.0000000000.
..0d0..0d0..
..000..000..
"""

CAVALHEIRO = """
...000000...
..0YYYYYy0..
0YYYYYYYYYo0
.0000000000.
..04366320..
..04e66e20..
..046mm620..
..04366320..
.0##++++--0.
.0#+++++--0.
.0#+++++--0.
.0000000000.
..0433220...
...04320....
..040..030..
..040..030..
.0dd0..0dd0.
.0000..0000.
"""

DAMA = """
............
...0H0A0H0..
..0HGAGHG0..
..00000000..
.y04366320y.
.o04e66e20o.
.y046mm620y.
.H04366320H.
..0#++++-0..
.0##++++--0.
.0#+++++--0.
0##+++++---0
000000000000
...04320....
..040..030..
..040..030..
.0HH0..0HH0.
.0000..0000.
"""

SANFONA = """
000000000000
0lD0RXRXR090
0lD0rXrXr0e0
0lD0RXRXR090
0lD0rXrXr0e0
0lD0RXRXR090
0dD0rXrXr0d0
000000000000
"""

ZABUMBA = """
..00000000..
.0XXXXXXXX0.
0XXXXXXXXXx0
0RRRRRRRRRr0
0RARRARRARr0
0RRARRARRAr0
0RARRARRARr0
0RRRRRRRRRr0
0rrrrrrrrrr0
.0000000000.
"""

TRIANGULO = """
...9...
..S.S..
..S.S..
.S...S.
.S...S.
S99SSSs
"""

MEGAFONE = """
......Aa
....AAAe
.aAAAAAe
....AAAe
......Aa
"""

# ---------------------------------------------------------------------------------------------
# Itens da loja e ícones. As grades abaixo têm só o preenchimento; o exportador põe o contorno.
# Chapéus usam as mesmas coordenadas da Mandioca (24 colunas, linha 8 = topo da cabeça).

PALHA_FURADA = """
........00000000........
.......0YYY00YYy0.......
......0YYy0..0Yyy0......
......0yYYy00yyyo0......
..00000RRRRRRRRrr00000..
.0YYYYYooooooooooYYJJy0.
0yYYyYYYyYYYYyYYYyYJJyo0
0oyyyyyyyyy0.0yyyyyyyoo0
.000y0000000.0000000y00.
....y..............y....
"""

HATS_FILL = {
    'lenco-chita': """
........................
........................
........................
........................
........................
........................
.....++++++++++++++.....
....#+++++++++++++--....
....#++++++++++++---+...
...................++...
....................+...
""",
    'coroa-flores': """
........................
........................
........................
........................
........................
........................
.....H...A...X...H......
....HAH.AFA.XAX.HAH.....
...gGHgGgAgGgXgGgHgGg...
""",
    'vaqueiro': """
........................
........ll..ll..........
.......lDDllDDl.........
.......lDDDDDDDl........
.......lDDDDDDDd........
.......ddddAdddd........
.l....lDDDDDDDDDd....d..
llDDDDDDDDDDDDDDDDDDDDdd
.dddddddddddddddddddddd.
""",
    'tiara-chifrinho': """
........................
........................
........................
........................
........................
.......R........R.......
......RR........RR......
......Rr........Rr......
.....eeeeeeeeeeeeee.....
""",
    'cangaceiro': """
........................
.ll..................ll.
.lDl................lDl.
..lDl......AA......lDl..
..lDDl....AAAA....lDDl..
...lDDDllllAAllllDDDl...
...dDDDDDDDDDDDDDDDDd...
....ddAdddAddddAdddd....
.....dddddddddddddd.....
""",
    'rei-baiao': """
........................
.ll..................ll.
.lDl.......AA.......lDl.
..lDl.....AAAA.....lDl..
..lDDl...AAAAAA...lDDl..
...lDDDllllAAllllDDDl...
...rXrXrXrXrXrXrXrXrX...
....ddAdddAddddAdddd....
.....dddddddddddddd.....
""",
    'coroa-milho': """
........................
........................
........................
.....A..A..AA..A..A.....
.....A..A..AA..A..A.....
.....AAAFAAAAAAFAAA.....
.....aFaHaFaaFaHaFa.....
.....aaaaaaaaaaaaaa.....
.....aaaaaaaaaaaaaa.....
""",
}

# Itens de mão: (grade, pivô de pegada em coordenadas da grade).
HAND_FILL = {
    'espiga': ("""
.AF.
AFAF
FAFA
AFAF
FAFA
AFAF
gAFg
GggG
.gG.
..g.
""", (1, 8)),
    'maca-amor': ("""
...g...
..RRR..
.RpRRR.
.RRRRr.
.RRRrr.
..rrr..
...l...
...l...
...l...
...l...
""", (3, 7)),
    'leque': ("""
.#+#+#+#.
#+#+#+#+#
.#+#+#+#.
..#+#+#..
...#+#...
....D....
....D....
""", (4, 6)),
    'pau-selfie': ("""
eeeee
ebbbe
ebb9e
eeeee
..s..
..S..
..S..
..S..
..S..
..S..
..S..
..S..
..s..
""", (2, 10)),
    'triangulo': ("""
...x...
...x...
...9...
..S.S..
..S.S..
.S...S.
.S...S.
S99SSSs
""", (3, 0)),
    'lampiao': ("""
..sss..
..s.s..
.sssss.
.sAFAs.
.sFzFs.
.sAFAs.
.sssss.
..sss..
""", (3, 0)),
    'ursinho': ("""
.UU...UU.
UTUUUUUTU
.UUUUUUU.
.UeUUUeU.
.UUTTTUU.
..UTeTU..
.UUHHHUU.
UUUUHUUUU
UUUUUUUUU
.UU...UU.
""", (4, 6)),
    'peixinho': ("""
...xx...
...xx...
..bbbb..
.bbbbbb.
bbbKKbbb
bbKKOKbb
bbbKKbbb
.bbbbbb.
..bbbb..
""", (3, 0)),
    'lampiao-2': ("""
..sss..
..s.s..
.sssss.
.sFAFs.
.sAzAs.
.sFAFs.
.sssss.
..sss..
""", (3, 0)),
}

PENETRA = ["""
......G.......
.....gGg......
....GGGGGg....
...GGGGGGGg...
..eeeeeeeeee..
..eb9eeeb9ee..
..GeeeGGeeeG..
..GGGGGGGGGg..
..GGmmmmmGGg..
..GGGmmmGGGg..
..gGGGGGGGgg..
...gGGGGGgg...
....ggggg.....
.....d..d.....
....dd..dd....
""", """
......G.......
.....gGg......
....GGGGGg....
...GGGGGGGg...
..eeeeeeeeee..
..eb9eeeb9ee..
..GeeeGGeeeG..
..GGGGGGGGGg..
..GGmmmmmGGg..
..GGGmmmGGGg..
..gGGGGGGGgg..
...gGGGGGgg...
....ggggg.....
....d....d....
...dd....dd...
"""]

SHIRT_ICON = """
...##..--...
.###+++++--.
####++++++--
.##++++++--.
..#++++++-..
..#++++++-..
..#++++++-..
..++++++--..
"""

UI_ICONS = {
    'animacao': """
.....A.....
.....A.....
....AFA....
.AAAFzFAAA.
..AFzzzFA..
...AFzFA...
..AFA.AFA..
.AA.....AA.
""",
    'fichas': """
kKKKKKKKKKKk
KOOOOOOOOOOK
.OOOXXXXOOO.
.OOOOOOOOOO.
KOOOOOOOOOOK
kKKKKKKKKKKk
""",
    'lenha': """
.DDDDDDDDxx.
DlllllllxlDx
DDDDDDDDxDlx
dddddddddxx.
""",
    'lotacao': """
..44....44..
.4334..4334.
.4334..4334.
..44....44..
.JJJJ..RRRR.
JJJJJJRRRRRR
JJJJJJRRRRRR
""",
    'rebolado': """
..DD....
..DD....
..DD....
..DDD...
..DDDD..
.lDDDDDD
dddddddd
""",
    'folego': """
.RR..RR.
RpRRRRRR
RRRRRRRr
.RRRRRr.
..RRRr..
...Rr...
""",
    'refresco': """
.....H.
....H..
.XXXH..
XbbbbX.
XbbbbX.
.XbbX..
.XXXX..
""",
    'ritmo': """
...eeee
...e..e
...e..e
...e..e
.eee.ee
eeee.ee
.ee....
""",
    'pescaria': """
...KKK....K
.KKOOOK..KK
KeKOOOOKKKK
KKKOOOOKKK.
.KKOOOK..KK
...KKK....K
""",
    'carta': """
XXXXXXXXXX
XxXXXXXXxX
XXxXXXXxXX
XXXxHHxXXX
XXXXHhXXXX
XXXXXXXXXX
""",
    'role': """
.......RRR.
......RXRRR
......RRRXR
.....DRRRR.
....D......
...D.......
..D........
.D.........
""",
    'fogueira': """
....F....
...FfF...
..FfzfF..
.qFzzzFq.
.qfFzFfq.
..qfffq..
DDDDDDDDD
.dd...dd.
""",
    'conquista': """
AAAAAAA
AFFAAAA
.AFAAa.
..AAa..
...A...
..aaa..
.aaaaa.
""",
    'teste': """
..e.e..
...e...
.RReRR.
RReReRR
RRReRRR
RReReRR
.RReRR.
""",
    'grafico': """
......AA
......Aa
...JJ.Aa
...Jj.Aa
RR.Jj.Aa
Rr.Jj.Aa
Rr.Jj.Aa
xxxxxxxx
""",
    'config': """
..s.s..
.sSSSs.
sSSsSSs
.Ss.sS.
sSSsSSs
.sSSSs.
..s.s..
""",
    'loja': """
...AAAAAA
..AAAAAAA
.AeAAAAAA
..AAAAAAA
...AAAAAA
""",
    'melhoria': """
...G...
..GGG..
.GGGGG.
GGGGGGG
..GGG..
..GGG..
..ggg..
""",
    'festa': """
d.........d
dd.......dd
.RdAd.Gd.J.
.R.A..G..J.
.R.A..G..J.
""",
    'argolas': """
..RRRRR..
.R.....R.
R...s...R
.R..s..R.
..RRsRR..
....s....
...sss...
..sssss..
""",
    'painel': """
.xxxxxxx.
xXXXXXXXx
xXeeeeeXx
xXXXXXXXx
xXeeeXXXx
xXXXXXXXx
xXeeeeXXx
.xxxxxxx.
""",
    'fechar': """
RR....RR
RRR..RRR
.RRRRRR.
..RRRR..
..RRRR..
.RRRRRR.
RRR..RRR
RR....RR
""",
    'redimensionar': """
......SS
......SS
...SS...
...SS...
SS....SS
SS....SS
...SS.SS
...SS.SS
""",
    'presente': """
..A..A..
...AA...
HHHAAHHH
HhHAAHhH
HHHAAHHH
HhHAAHhH
HHHAAHHH
""",
    'foto': """
..ssss...
sssssssss
seebbbees
sebb9bbes
sebbbbbes
seebbbees
sssssssss
""",
}

REQUEST_ICONS = {
    'milho': """
.AF.
AFAF
FAFA
AFAF
gAFg
.gg.
""",
    'pamonha': """
..GG..
.GGGG.
GxxxxG
GGGGGG
.GGGG.
""",
    'musica': """
..eee
..e.e
..e.e
eee.e
eee..
""",
    'foto': """
.ss...
ssssss
sebbes
sb9bbs
ssssss
""",
    'pipoca': """
.X.X.
XXXXX
RXRXR
RXRXR
RXRXR
""",
    'coracao': """
.H.H.
HHHHH
HHHHh
.HHh.
..h..
""",
}
