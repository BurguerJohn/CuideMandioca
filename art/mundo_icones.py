"""Ícones dos eventos do mundo (11x10): um por evento, para a tela deles, e o do botão da placa (`ui:mundo`)."""

from casa import Tela, rgb

LEG = {'y': '#ffd21e', 'Y': '#e8a812', 'w': '#f8f4ea', 'b': '#3a78d8', 'B': '#1a3a8a', 'c': '#8fd4ee', 'k': '#26242e', 'g': '#56c860', 'G': '#2e8a44',
       'r': '#e0343e', 'R': '#9a1a2e', 'o': '#ff8a12', 'p': '#ff8ac8', 'n': '#8a5a34', 's': '#9a9ca8', 'S': '#6a6c78',
       'v': '#8a4ad8', 'V': '#4a1a7a', 'l': '#7aff4a', 'L': '#3aa82a', 'h': '#8ab870', 'H': '#5a8a48', 'd': '#4a3220', 'm': '#e8c060'}

ICONES = {
    'estrelas': ['.....y.....', '....yyy....', '..yyyyyyy..', '...yyyyy...', '...yy.yy...', '..y.....y..', '...........', '.y.....y...', 'y.......y..', '...........'],
    'ventania': ['.....r.....', '....rrr....', '...rwrwr...', '..rrrwrrr..', '...rrwrr...', '....rwr....', '.....w.....', '......y....', '.....y.y...', '......y....'],
    'vagalumes': ['...........', '..y....y...', '.yYy..yYy..', '..y....y...', '.....y.....', '....yYy....', '.....y.....', '.y.....y...', 'yYy...yYy..', '.y.....y...'],
    'calorao': ['y....y....y', '.y..yyy..y.', '..yyyyyyy..', '.yyyyyyyyy.', 'yyyyyyyyyyy', '.yyyyyyyyy.', '..yyyyyyy..', '.y..yyy..y.', 'y....y....y', '...........'],
    'temporal': ['...sss.....', '..sssss.s..', '.sssssssss.', 'sssssssssss', '.sssssssss.', '.....yy....', '....yy.....', '...yyyy....', '.....y.....', '....y......'],
    'lua': ['...yyyyy...', '..yyyyyyy..', '.yyyYyyyyy.', '.yyyyyyYyy.', '.yyyyyyyyy.', '.yYyyyyyyy.', '.yyyyyyyyy.', '..yyyyyyy..', '...yyyyy...', '...........'],
    'petalas': ['...p...p...', '..ppp.ppp..', '...pwwwp...', '..ppwywpp..', '..pwwywwp..', '...ppwpp...', '....p.p....', '.....g.....', '....gGg....', '.....G.....'],
    'baloes': ['...rrrrr...', '..rrwrrrr..', '.rrwrrrrrr.', '.rrrrrrrrr.', '.rrrrrrrrr.', '..rrrrrrr..', '...rrrrr...', '.....y.....', '.....n.....', '....nnn....'],
    'granizo': ['..sssss....', '.sssssssss.', 'sssssssssss', '.sssssssss.', '...........', '..c...c....', '.cwc.cwc...', '..c...c..c.', '.....c..cwc', '..c......c.'],
    'eclipse': ['...yyyyy...', '..yyyyyyy..', '.yyyykkkyy.', '.yyykkkkky.', '.yyykkkkky.', '.yyykkkkky.', '.yyyykkkyy.', '..yyyyyyy..', '...yyyyy...', '...........'],
    'redemoinho': ['..nnnnnnn..', '...nnnnn...', '....nnnn...', '...nnnnn...', '....nnn....', '.....nn....', '....nnn....', '.....n.....', '....rr.....', '.....r.....'],
    'pipoca': ['..w.w.w....', '.wwywwyw...', '.wywwwwyw..', 'rrrrrrrrr..', 'rwrwrwrwr..', 'rrrrrrrrr..', 'rwrwrwrwr..', '.rrrrrrr...', '.rwrwrwr...', '...........'],
    'fogos': ['.....r.....', '..o..r..o..', '...o.r.o...', '....ooo....', 'rrrrooorrrr', '....ooo....', '...o.r.o...', '..o..r..o..', '.....r.....', '...........'],
    'boitata': ['.......rrr.', '......rrYr.', '.....rrr...', '....rro....', '..orrro....', '.orro......', 'orro.......', '.oo........', '...........', '...........'],
    'revoada': ['...........', '.w.....w...', 'w.w...w.w..', '...w.w.....', '.....w.....', '..w.....w..', '.w.w...w.w.', '...........', '...........', '...........'],
    'procissao': ['..o...o...o', '..y...y...y', '..w...w...w', '..w...w...w', '..w...w...w', '..w...w...w', '.sss.sss.ss', '...........', '...........', '...........'],
    'ovni': ['....sss....', '...sbbbs...', '..sssssss..', '.sssssssss.', '..y.r.y.r..', '...yyyyy...', '..yyyyyyy..', '.yyyyyyyyy.', '.yyywwwyyy.', 'yyyyyyyyyyy'],
    'feira': ['rrwrwrwrwrr', 'rwrwrwrwrwr', 'sssssssssss', '.n.......n.', '.n.ggoyy.n.', '.n.......n.', 'nnnnnnnnnnn', 'nnnnnnnnnnn', '...........', '...........'],
    'poente': ['....o.o....', '..o..o..o..', '...ooooo...', '..ooyyyoo..', '.ooyyyyyoo.', 'ooyyyyyyyoo', 'rrrrrrrrrrr', 'RRRRRRRRRRR', '...........', '...........'],
    'tesouro': ['...........', 'r.........r', '.r.......r.', '..r.....r..', '...r...r...', '....r.r....', '.....r.....', '..nnnnnnn..', '.nnyyyyynn.', '.nnnnnnnnn.'],
    'neve': ['.....c.....', '..c..w..c..', '...c.w.c...', '....cwc....', 'cwwwwwwwwwc', '....cwc....', '...c.w.c...', '..c..w..c..', '.....c.....', '...........'],
    'tremor': ['...........', '....YYY....', '...YyyyY...', '...YyYyY...', '...YyyyY...', '....YYY....', 'nnnnknnnnnn', 'nnnknnnnnnn', 'nnnnknnnnnn', 'nnnknnnnnnn'],
    'cheia': ['.....yy....', '....yyyo...', '....yky....', '..yyyyyyy..', '.yyyyyyyyy.', 'cbcbcbcbcbc', 'bcbcbcbcbcb', 'cbcbcbcbcbc', 'bcbcbcbcbcb', '...........'],
    'constelacao': ['...........', '.....y.....', '....yyy....', '.....y.....', '...........', '.y.....y...', 'yyy...yyy..', '.y..y..y...', '....yy.....', '.....y.....'],
    'sapos': ['...........', '..ggg.ggg..', '.gwkgggwkg.', '.ggggggggg.', 'ggGgggggGgg', 'gggkkkkkggg', '.ggggggggg.', '.gg.....gg.', 'ggg.....ggg', '...........'],
    'trem': ['...........', '...k.......', '..kkk..rrr.', '.kkkkk.rrr.', '.kkkkkkrrr.', '.kkkkkkrrr.', 'kkkkkkkkkkk', '.sk.sk.sk..', '...........', '...........'],
    'pinhata': ['..r.....b..', '...r.y.b...', '..rryybbb..', '.rryyyybbb.', '.ggyyyyppp.', '.ggyyyyppp.', '..ggyyppp..', '...g.y.p...', '..g..y..p..', '...........'],
    'amanhecer': ['.y...y...y.', '..y..y..y..', '...yyyyy...', '..yyyyyyy..', '.yyyyyyyyy.', 'ggggggggggg', 'GgGgGgGgGgG', '...........', '...........', '...........'],
    'turbulencia': ['...yyyyy...', '..yrrrrry..', '.yyyyyyyyy.', 'YYYYYYYYYYY', '...........', '.cc..cc..cc', 'c..cc..cc..', '...........', '...........', '...........'],
    'fichas': ['...........', '..yyyyyyy..', '.yyYyyyYyy.', 'yyyYyyyYyyy', 'yyyYyyyYyyy', '.yyYyyyYyy.', '..yyyyyyy..', '...........', '...........', '...........'],
    'cometa': ['.........yy', '........yyy', '......ww.yy', '....www....', '..www......', '.ww........', 'w..........', '...........', '...........', '...........'],
    # Eventos avulsos (sem tema): bolhas, aviõezinhos, patinhos, abelhas, planeta, circo, balada, baleia, balão gigante e fada.
    'bolhas': ['...bbbbb...', '..bcccccb..', '.bcwwcccpb.', '.bcwccccpb.', '.bccccccpb.', '.bcccccppb.', '..bcccppb.c', '...bbbbb.cw', '..........c', '...........'],
    'avioes': ['...........', '........ww.', '......wwwww', '..wwwwwwwcw', '.wwwwwcccc.', '..wwcccss..', '...wcssS...', '....s......', '...........', '...........'],
    'patinhos': ['...........', '....yyy....', '...yykyyoo.', '...yyyyyoo.', '....yyy....', '.yy.yyyyy..', 'yyyyyyyyyy.', '.yyyYyyyy..', '..yyyyyy...', '...........'],
    'abelhas': ['...ww......', '..wwww.....', '..yykyky.k.', '.yyykykyykk', '.yyykykyykk', '..yykyky.k.', '...yyyyy...', '...........', '..........o', '.........o.'],
    'planetas': ['.........c.', '....ooo....', '..ooooooo..', 'nnnooyooonn', '.ooooooooo.', '..ooyyooo..', '....ooo....', '...........', 'w..........', '...........'],
    'circo': ['..r.y.b.g..', '.rryybbggg.', '..wwwwwww..', '..wkwwwkw..', '..wwwrwww..', '..wrrrrrw..', '...wwwww...', '..yyyyyyy..', '.yyrryrryy.', '...........'],
    'balada': ['.....k.....', '...sssss...', '..swswswsw.', '.swswswswsw', '.wswswswsws', '.swswswswsw', '..swswswsw.', '...sssss...', '.p.y...c.g.', '...........'],
    'baleia': ['.......c.c.', '........c..', '..bbbbbbbb.', 'bbbbbbbbbbb', '.bbbbbbkbbb', '.bwwwwwwbb.', '..wwwwwww..', '...........', '.o.........', '..........o'],
    'baloagigante': ['...g.g.g...', '...ggggg...', '..nnnnnnn..', '.nnnnnnnnn.', '.nwknnwknn.', '.nnnnnnnnn.', '..nnrrrnn..', '...nnnnn...', '....nnn....', '.....r.....'],
    'fada': ['.......y...', '......yyy..', '.cc.c..y...', 'cccwcc.o...', '.ccpcc.o...', '...ppp.....', '..ppppp....', '...p.p.....', '...........', '...........'],
    # Segunda leva de avulsos: chapéus, pelada, toupeiras, coelho, aurora, vaca e lua, jatinhos e tubarão.
    'chapeus': ['...........', '...kkkkk...', '...kkkkk...', '...kkkkk...', '...rrrrr...', '...kkkkk...', '.kkkkkkkkk.', '.kkkkkkkkk.', '...........', '...........'],
    'pelada': ['...kkkkk...', '..kwwkwwk..', '.kwwkkkwwk.', '.kwkkkkkwk.', '.kkkkwkkkk.', '.kwkkkkkwk.', '.kwwkkkwwk.', '..kwwkwwk..', '...kkkkk...', '...........'],
    'toupeiras': ['...yyyyy...', '..yyyyyyy..', '..nnnnnnn..', '.nnknnnknn.', '.nnnpppnnn.', '.nnnnnnnnn.', 'dddnnnnnddd', 'ddddddddddd', '...........', '...........'],
    'coelho': ['..w.....w..', '..w.....w..', '..wp...pw..', '..wp...pw..', '...wwwww...', '..wkwwwkw..', '..wwwpwww..', '...wwwww...', '.kkkkkkkkk.', '.kkkkkkkkk.'],
    'aurora': ['.g...c...v.', '.gg..cc..vv', '.ggg.ccc.vv', '..gg..cc.vv', '..gg..cc..v', '.ggg.ccc..v', '.gg..cc..vv', '..g...c...v', '...........', '.w....w..w.'],
    'vacalua': ['..kw.kwk...', '.wwwwwwww..', '.w.w..w.w..', '...........', '...yyyyy...', '..yyyyyyy..', '.yyyyyyyyy.', '.yyyyyyyyy.', '..yyyyyyy..', '...yyyyy...'],
    'fumaca': ['...........', '...........', 'gggg.......', '.yyyyg.ss..', '..bbbbwwww.', '...yyywwwb.', '....g......', '...........', '...........', '...........'],
    'tubaroes': ['.....s.....', '....ss.....', '...sss...s.', '..ssssssss.', 'ssssssksss.', 'swwwwwwwww.', '.wwwwwwww..', '...........', '..S.S.S.S..', '.S.S.S.S.S.'],
    # Eventos de tema (só com um conjunto completo do tema vestido): dinossauros, Halloween e zumbis.
    'pterodatilos': ['o.........o', 'oo.......oo', '.oo.....oo.', '..oo.r.oo..', '...ooggoo..', '....ggggyy.', '.....gg.yy.', '..........r', '...........', '...........'],
    'manada': ['.........gg', '........ggk', '........g..', '.......gg..', '..ggggggg..', 'gggggggggg.', '.gggggggg..', '..g.g.g.g..', '..G.G.G.G..', 'nnnnnnnnnnn'],
    'ovos': ['....www....', '...wwwww...', '..wwgwwww..', '..wwwwwgw..', '.wwgwwwwww.', '.wwwwkwwww.', '.wwwwwkwww.', '..wwwkwww..', '...wwwww...', '..mmmmmmm..'],
    'meteoro': ['y..........', '.oy........', '..oo..rrr..', '...oorkkkr.', '....rkkokkr', '...rkkkkkkr', '...rkkokkkr', '....rkkkkr.', '.....rrrr..', '...........'],
    'bruxas': ['.....k.....', '....kkk....', '....koo....', '...kkkkk...', '.kkkkkkkkk.', '...........', 'nnnnnnnnnmm', '........mYm', '.........mm', '...........'],
    'abobora': ['.....gg....', '..ooogoooo.', '.oyyooyyoo.', 'ooyyyoyyyoo', 'ooooooooooo', 'oyoyoyoyooo', '.oyyyyyyyo.', '..ooooooo..', '...........', '...........'],
    'fantasmas': ['...wwwww...', '..wwwwwww..', '.wwkwwwkww.', '.wwkwwwkww.', '.wwwwkwwww.', '.wwwwkwwww.', '.wwwwwwwww.', '.wwwwwwwww.', '.ww.www.ww.', '...........'],
    'luasangue': ['.rrrrr.....', 'rrrRrrr....', 'rrrrrRr..k.', 'rrrrrrr..k.', '.rrrrr...k.', '........kkk', '.......kkRk', '......k.kkk', '.........k.', '...........'],
    'horda': ['..kkkkkk...', '.hhhhhhhh..', '.hwkhhwrh..', '.hhhhhhhh..', '.hhkkkkhh..', '..hhhhhh...', '.rrrrrrrr..', 'rryrrrryrr.', 'rrrrrrrrrr.', '...........'],
    'gosma': ['.....l.....', '....lll....', '...lllll...', '..lllllll..', '..lllwlll..', '..lllllll..', '...lllll...', '...........', '.l..lLl..l.', 'lLl.....lLl'],
    'helicoptero': ['.ssssssssss', '......k....', '..GGGGGGGk.', '.GGGGccGGGk', 'GGGGGccGGGG', '.GGrrGGGGG.', '..GGGGGG...', '..sssssss..', '...........', '...........'],
    'surto': ['..h.h.h.h..', '..h.h.h.h..', '..hhhhhhh..', '...hhhhh...', '....hhh....', '....hhh....', 'ss..hhh.ss.', 'ssdddddddss', 'sddddddddds', '...........'],
    # o botão da placa: um planetinha azul com terra verde
    'ui:mundo': ['...bbbbb...', '..bbgggbb..', '.bbggGgbbb.', '.bbbgggbbb.', '.bgggbbbbb.', '.bggGbbgbb.', '.bbbbbgggb.', '..bbbbgGb..', '...bbbbb...', '...........'],
}


def exportar(icons):
    """Põe os ícones no pacote: `mundo:<id>` para cada evento e `ui:mundo` para o botão da placa."""
    for nome, linhas in ICONES.items():
        tela = Tela(11, 10)
        tela.grade(linhas, 0, 0, {k: rgb(v) for k, v in LEG.items()})
        icons[nome if nome.startswith('ui:') else f'mundo:{nome}'] = tela.im
