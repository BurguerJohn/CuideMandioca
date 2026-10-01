"""Páginas 11 a 15 do Cordel da Mandioca, quando vira uma loucura épica: a guerra dos relógios, o coliseu das mil mandiocas, a Via Láctea de
pamonha, o Rei Mandiocão e o Big Bang junino."""

import math
import random

from livro_base import W, H, pagina, degrade, elipse, disco, anel, ruido, nuvem, colinas, chao, brilho, mix, chama, estrelas, lua, balao, \
    coracao, poligono, estrela5, grade, fumaca, bandeirinhas, faiscas


def capa(t, x, y, k, cor='#d8283a', sombra='#8a1020'):
    """A capa vermelha da Mandioca voando atrás dela: (x, y) é o pescoço (a Mandioca é desenhada por cima, no jogo)."""
    onda = (0, 2, 4, 2)[k % 4]
    poligono(t, [(x - 4, y), (x + 4, y), (x + 3, y + 22), (x - 30 - onda, y + 18 + onda), (x - 36 - onda, y + 4)], cor)
    poligono(t, [(x - 4, y + 10), (x + 3, y + 22), (x - 30 - onda, y + 18 + onda), (x - 18, y + 8)], sombra)
    t.line(x - 4, y, x - 36 - onda, y + 4, '#ffd21e')


# --- Página 11: a guerra dos relógios --------------------------------------------------------------------------------------------------
def relogio(t, cx, cy, r, k, parado=False, cor='#e8d8a0', borda='#8a5a1c', ponteiros='#3a1a10'):
    disco(t, cx, cy, r + 2, borda)
    disco(t, cx, cy, r, cor, mix(cor, '#000000', 0.2), mix(cor, '#ffffff', 0.4))
    for h in range(12):
        a = math.radians(h * 30 - 90)
        t.put(cx + round(math.cos(a) * (r - 2)), cy + round(math.sin(a) * (r - 2)), ponteiros)
    a1 = math.radians(-90 + (30 if parado else k * 25))
    a2 = math.radians(-90 + (0 if parado else k * 90))
    t.line(cx, cy, cx + math.cos(a1) * r * 0.6, cy + math.sin(a1) * r * 0.6, ponteiros)
    t.line(cx, cy, cx + math.cos(a2) * r * 0.85, cy + math.sin(a2) * r * 0.85, ponteiros)
    t.put(cx, cy, '#ffd21e')


@pagina(11, heroi=(54, 103, 3, 'danca'), ponto=(122, 12, 70, 70), elenco=[])
class P11:
    @staticmethod
    def fundo(t):
        degrade(t, 0, H - 1, ['#2a0a4a', '#5a1a6a', '#a83a6a', '#f08a3a'])
        # um redemoinho de tempo atrás de tudo
        for i in range(160):
            a = i * 0.21
            d = 6 + i * 0.85
            x, y = 150 + math.cos(a) * d, 48 + math.sin(a) * d * 0.62
            if 0 <= x < W and 0 <= y < 84:
                t.put(round(x), round(y), mix('#ffd0f0', '#7a2a8a', i / 160))
        # as engrenagens e o piso de ladrilhos de bronze
        t.rect(0, 92, W - 1, H - 1, '#4a2a3a')
        for x in range(0, W, 16):
            t.rect(x, 92, x, H - 1, '#2a1424')
            t.rect(x, 92, x + 15, 93, '#8a5a4a')

    @staticmethod
    def animar(t, k, r):
        estrelas(t, 20, 9, 0, 40, k=k, cores=('#ffd0f0', '#ffffff'))
        # relógios marchando (com perninhas) lá no fundo
        for i, (x, y, rr) in enumerate(((12, 78, 8), (36, 82, 6), (190, 80, 7), (210, 76, 9), (84, 84, 5))):
            passo = (k + i) % 2
            relogio(t, x, y - 8, rr, k + i, parado=r is not None)
            t.line(x - 2, y - 8 + rr, x - 3 + passo * 2, y + 2, '#4a2a1c')
            t.line(x + 2, y - 8 + rr, x + 3 - passo * 2, y + 2, '#4a2a1c')
        # o relógio gigante da torre
        t.rect(148, 62, 168, 94, '#6a4a2a')
        t.rect(148, 62, 168, 64, '#8a6a3a')
        relogio(t, 158, 44, 28, k, parado=r is not None, cor='#f0e4b4', borda='#6a3a10')
        for ang in range(0, 360, 90):
            a = math.radians(ang + k * 20)
            t.line(158 + math.cos(a) * 30, 44 + math.sin(a) * 30, 158 + math.cos(a) * 36, 44 + math.sin(a) * 36, '#a87a2a')
        # engrenagens girando em cima da torre
        for cx, cy, rr, sentido in ((136, 18, 9, 1), (182, 14, 7, -1)):
            for i in range(8):
                a = math.radians(i * 45 + sentido * k * 11)
                t.rect(round(cx + math.cos(a) * rr) - 1, round(cy + math.sin(a) * rr) - 1, round(cx + math.cos(a) * rr), round(cy + math.sin(a) * rr), '#c8a85a')
            disco(t, cx, cy, rr - 2, '#a8883a')
            disco(t, cx, cy, 2, '#3a2a1a')
        capa(t, 58, 70, k)
        if r is not None:
            # o tempo para: ondas azuladas se alargando e raios congelados
            for j in range(3):
                raio = 8 + r * 12 + j * 14
                anel(t, 158, 44, raio, '#9ae8ff' if j % 2 else '#ffffff', 1)
            for i in range(12):
                a = i * math.pi / 6
                brilho(t, 158 + round(math.cos(a) * (30 + r * 8)), 44 + round(math.sin(a) * (30 + r * 8)), '#c8f4ff')


# --- Página 12: o coliseu das mil mandiocas -------------------------------------------------------------------------------------------------
MANDIOQUINHA = ['..yy..', '.kkkk.', '.kwkw.', '.nnnn.', '.nbbn.', '..nn..']
LEG_MANDIOQUINHA = {'y': '#e8c460', 'k': '#c89a60', 'w': '#2a1a10', 'n': '#8a5a34', 'b': '#6a3a1c'}


@pagina(12, heroi=(112, 104, 3, 'danca'), ponto=(10, 22, 204, 40), elenco=[])
class P12:
    @staticmethod
    def fundo(t):
        degrade(t, 0, 36, ['#f0a050', '#ffd890', '#fff0c0'])
        # arquibancadas de pedra em degraus, uma de cada lado e uma ao fundo
        for fila in range(4):
            y = 24 + fila * 9
            t.rect(0, y, W - 1, y + 8, ['#a89478', '#b8a488', '#c8b498', '#d8c4a8'][fila])
            t.rect(0, y, W - 1, y, '#e8d8bc')
            t.rect(0, y + 8, W - 1, y + 8, '#7a6648')
        for x in range(0, W, 28):
            t.rect(x, 24, x + 1, 60, '#7a6648')
        # areia da arena
        t.rect(0, 62, W - 1, H - 1, '#e8c888')
        ruido(t, 0, 64, W - 1, H - 1, 260, 12, ['#c8a868', '#f8e0a8', '#d8b878'])
        t.rect(0, 62, W - 1, 63, '#8a6a3a')
        elipse(t, 112, 108, 90, 8, '#d8b878', '#c8a868')

    @staticmethod
    def animar(t, k, r):
        # a plateia: mandioquinhas de chapéu de palha fazendo a ola
        veloc = 1 if r is None else 2
        for fila in range(4):
            y = 18 + fila * 9
            for i in range(30):
                x = 4 + i * 7 + (fila % 2) * 3
                fase = (i * 0.5 - (k * veloc if r is None else r * 2 + 0)) % 6
                alto = 2 if fase < 1.5 else 0
                grade(t, MANDIOQUINHA, x, y - alto, LEG_MANDIOQUINHA)
                if alto:
                    t.put(x - 1, y - alto + 3, '#8a5a34')
                    t.put(x + 6, y - alto + 3, '#8a5a34')
                if r is not None and (i + fila + r) % 9 == 0:
                    brilho(t, x + 2, y - 5, ['#ffd21e', '#ff4f9e', '#4ac8ff'][(i + r) % 3])
        # a mandioca de pedra gigante lá no fundo e as bandeiras
        elipse(t, 112, 18, 12, 8, '#a89478', '#7a6648', '#d8c8a8')
        t.rect(106, 6, 118, 12, '#a89478')
        for x, cor in ((20, '#e0343e'), (60, '#3a6cc8'), (164, '#e8b030'), (204, '#35a03a')):
            t.line(x, 28, x, 10, '#6a4a2a')
            poligono(t, [(x, 10), (x + 10 + (k % 2), 13), (x, 17)], cor)
        capa(t, 108, 72, k)
        # a espada de ouro da Mandioca, brilhando
        t.line(122, 86, 138, 62 - (r or 0) % 2, '#fff6b8')
        t.line(123, 86, 139, 62 - (r or 0) % 2, '#e8b030')
        t.rect(118, 86, 126, 88, '#8a5a1c')
        if k % 2 == 0:
            brilho(t, 138, 62, '#ffffff')


# --- Página 13: a Via Láctea de pamonha ---------------------------------------------------------------------------------------------------------
@pagina(13, heroi=(66, 99, 3, 'danca'), ponto=(110, 10, 108, 76), elenco=[])
class P13:
    @staticmethod
    def fundo(t):
        degrade(t, 0, H - 1, ['#04030c', '#0a0620', '#140a38'])
        estrelas(t, 110, 13, 0, H - 1)

    @staticmethod
    def animar(t, k, r):
        girar = k * 0.18 if r is None else r * 0.5
        # a galáxia: espirais de palha de milho e grãos amarelos
        for braco in range(3):
            for i in range(110):
                a = braco * 2.09 + i * 0.075 + girar
                d = 2 + i * 0.52
                x, y = 160 + math.cos(a) * d, 46 + math.sin(a) * d * 0.55
                if 0 <= x < W and 0 <= y < H:
                    cor = '#cfe89a' if i % 3 else '#f4d860'
                    t.put(round(x), round(y), mix(cor, '#1a0a40', min(0.7, i / 160)))
                    if i % 5 == 0:
                        t.put(round(x) + 1, round(y), '#ffe27a')
        disco(t, 160, 46, 5, '#fff6b8', '#ffd23a')
        # planetas: melancia, abóbora e abacaxi, cada um com um anel
        for cx, cy, rr, cor, cor2, anelcor in ((190, 24, 11, '#3aa04a', '#1a6a2a', '#ff6a8a'), (130, 70, 9, '#ff9a2a', '#c85a0c', '#ffe27a'),
                                               (196, 76, 8, '#f4d040', '#c89a10', '#7ae8a0')):
            for sinal in (-1, 1):
                if sinal == 1:
                    disco(t, cx, cy, rr, cor, cor2, mix(cor, '#ffffff', 0.4))
                    if cor == '#3aa04a':
                        for j in range(-2, 3):
                            t.line(cx + j * 4, cy - rr + 2, cx + j * 3, cy + rr - 2, cor2)
                    elif cor == '#f4d040':
                        for j in range(-3, 4, 2):
                            t.put(cx + j * 2, cy + (j % 3) * 2, cor2)
                            t.put(cx + j * 2 + 1, cy - 4 + (j % 2) * 4, cor2)
                for dx in range(-rr - 5, rr + 6):
                    x = cx + dx
                    y = cy + round(math.sin(math.radians(dx * 7 + (k * 40 if r is None else r * 60))) * 3) + (-2 if sinal < 0 else 2)
                    if (dx * sinal > 0 and abs(dx) > rr * 0.35) or sinal > 0:
                        pass
                    t.put(x, y, anelcor)
        # o cometa de canjica onde a Mandioca surfa, com a cauda de leite
        for i in range(30):
            f = i / 30
            t.put(36 + i - 2 * (i % 2), 98 + round(math.sin(i * 0.5 + k) * 2) - i // 6 * 0, mix('#ffffff', '#6a8aff', f))
        elipse(t, 66, 101, 14, 4, '#f8f4e8', '#c8c0a8', '#ffffff')
        for dx in (-8, -2, 4, 9):
            t.put(66 + dx, 100, '#f4d040')
        # cometas pequenos cruzando
        for i in range(3):
            x = (220 - ((k + i * 5) * 22) % 260)
            t.line(x, 12 + i * 22, x + 10, 15 + i * 22, '#ffffff')
        if r is not None:
            # faces nos planetas e brilhos: tudo acorda e gira
            for cx, cy in ((190, 24), (130, 70), (196, 76)):
                t.put(cx - 3, cy - 1, '#10100c')
                t.put(cx + 3, cy - 1, '#10100c')
                t.line(cx - 3, cy + 3, cx + 3, cy + 3, '#10100c')
                brilho(t, cx + 12, cy - 12 + r, '#ffffff')


# --- Página 14: o Rei Mandiocão ------------------------------------------------------------------------------------------------------------------
@pagina(14, heroi=(48, 102, 1, 'danca'), ponto=(60, 52, 36, 36), elenco=[])
class P14:
    @staticmethod
    def fundo(t):
        degrade(t, 0, H - 1, ['#10040a', '#3a0a14', '#7a1a1c', '#c8481c'])
        # o chão de pedra rachada, com lava nas frestas
        t.rect(0, 94, W - 1, H - 1, '#2a1018')
        ruido(t, 0, 94, W - 1, H - 1, 180, 14, ['#4a2028', '#1a0a10', '#6a3030'])
        for x, y in ((20, 100), (60, 106), (96, 98), (140, 108), (200, 100)):
            t.line(x, y, x + 12, y + 2, '#ff7a1c')
            t.line(x + 12, y + 2, x + 18, y - 2, '#ffd23a')

    @staticmethod
    def animar(t, k, r):
        relampago = k in (1,) if r is None else r % 2 == 0
        if relampago:
            for i, x0 in enumerate((38, 100, 196)):
                x, y = x0, 0
                while y < 70:
                    nx = x + [-5, 4, -3, 6][(y // 10 + i) % 4]
                    t.line(x, y, nx, y + 10, '#fff6b8')
                    t.line(x + 1, y, nx + 1, y + 10, '#ffffff')
                    x, y = nx, y + 10
            for xx in range(0, W, 3):
                t.put(xx, 0, '#ffe8c0')
        # ilhas de pedra flutuando
        for x, y, rx in ((20, 40, 14), (100, 28, 12), (206, 60, 12)):
            yy = y + round(math.sin(k * 1.57 + x) * 2)
            elipse(t, x, yy, rx, 4, '#4a3a4a', '#2a1c2a', '#7a6a7a')
            for i in range(3):
                t.line(x - rx // 2 + i * 6, yy + 3, x - rx // 2 + i * 6 + 1, yy + 9 + i, '#2a1c2a')
        # o trono de raízes e o Rei Mandiocão: uma mandioca gigante de coroa de fogo
        for i in range(7):
            ang = math.radians(200 + i * 22)
            t.line(150 + math.cos(ang) * 8, 96, 150 + math.cos(ang) * 40, 96 + math.sin(ang) * 10 - 22, '#4a2a18')
            t.line(151 + math.cos(ang) * 8, 96, 151 + math.cos(ang) * 40, 96 + math.sin(ang) * 10 - 22, '#2a160c')
        elipse(t, 150, 60, 27, 36, '#8a5a34', '#5a3a1c', '#b07a44')
        for i in range(6):
            t.line(130 + i * 8, 34 + (i % 2) * 6, 128 + i * 8 + (i % 3), 86, '#6a4224')
        elipse(t, 150, 52, 17, 20, '#f0e0b8', '#c8b080')
        raiva = 1 if r is not None and r % 2 else 0
        for dx in (-7, 7):
            t.rect(150 + dx - 3, 44 + raiva, 150 + dx + 3, 47 + raiva, '#e8283a')
            t.rect(150 + dx - 3, 43 + raiva, 150 + dx + (3 if dx < 0 else -3), 43 + raiva + (1 if dx < 0 else 0), '#2a0a0a')
        t.rect(142, 58, 158, 64, '#3a0a0a')
        for dx in range(143, 158, 3):
            t.rect(dx, 58, dx + 1, 60, '#ffffff')
        t.rect(120, 60, 128, 64, '#8a5a34')
        t.rect(172, 60, 180, 64, '#8a5a34')
        # a coroa de ouro com fogo
        t.rect(136, 28, 164, 33, '#e8b030')
        for dx in (-12, -4, 4, 12):
            poligono(t, [(150 + dx - 3, 28), (150 + dx + 3, 28), (150 + dx, 22)], '#ffd21e')
        chama(t, 142, 22, 14, 5, k)
        chama(t, 158, 22, 14, 5, k + 2)
        chama(t, 150, 20, 18, 6, k + 1)
        capa(t, 44, 72, k)
        # a espada de faísca da Mandioca: cresce a cada clique (na reação, solta um raio na coroa do rei)
        brilho_esp = 0 if r is None else r + 1
        t.line(60, 88, 76 + brilho_esp * 2, 58 - brilho_esp * 2, '#ffe27a')
        t.line(61, 88, 77 + brilho_esp * 2, 58 - brilho_esp * 2, '#ffffff')
        faiscas(t, 70, 84, 4 + brilho_esp * 2, k, 14, 30, ('#ffd23a', '#ff8a1c', '#ffffff'))
        if r is not None:
            x0, y0 = 76 + brilho_esp * 2, 58 - brilho_esp * 2
            passos = 12
            for i in range(passos):
                f = i / passos
                x = x0 + (146 - x0) * f + [-3, 3, -2, 2][i % 4]
                y = y0 + (30 - y0) * f
                t.line(x, y, x + 6, y - 2, '#fff6b8')
            brilho(t, 146, 28, '#ffffff', 2)


# --- Página 15: o Big Bang junino -----------------------------------------------------------------------------------------------------------------
@pagina(15, heroi=(52, 102, 3, 'danca'), ponto=(82, 18, 64, 64), elenco=[])
class P15:
    @staticmethod
    def fundo(t):
        degrade(t, 0, H - 1, ['#06020e', '#1a0a3a', '#3a1458', '#7a2a6a'])
        estrelas(t, 70, 15, 0, H - 1)
        t.rect(0, 100, W - 1, H - 1, '#1a0a2a')

    @staticmethod
    def animar(t, k, r):
        cores = ('#ff3a9a', '#ffd21e', '#4aff8a', '#3ab8ff', '#ff8a1c', '#b04aff')
        cx, cy = 114, 50
        crescer = 0 if r is None else (4, 10, 18, 26)[r]
        # a explosão do meio: núcleo branco, anéis de cor e raios de bandeirinha
        for raio, cor in ((22 + crescer, '#7a2a6a'), (17 + crescer, '#ff8a1c'), (12 + crescer, '#ffd21e'), (7 + crescer, '#fff6b8')):
            disco(t, cx, cy, raio, cor)
        disco(t, cx, cy, 4 + crescer // 2, '#ffffff')
        for i in range(24):
            ang = math.radians(i * 15 + k * 7)
            comp = 34 + crescer + (6 if i % 2 else 0)
            cor = cores[i % 6]
            for d in range(14 + crescer // 2, comp):
                t.put(cx + round(math.cos(ang) * d), cy + round(math.sin(ang) * d), cor)
            t.rect(cx + round(math.cos(ang) * comp) - 1, cy + round(math.sin(ang) * comp) - 1, cx + round(math.cos(ang) * comp) + 1, cy + round(math.sin(ang) * comp), cor)
        # fogos de artifício pelo céu todo (um em cada fase do ciclo)
        for i, (x, y) in enumerate(((30, 24), (196, 30), (30, 78), (194, 74))):
            fase = (k + i) % 4
            cor = cores[(i * 2 + k) % 6]
            for j in range(10):
                a = j * math.pi / 5
                d = 3 + fase * 3
                t.put(x + round(math.cos(a) * d), y + round(math.sin(a) * d), cor)
                if fase > 1:
                    t.put(x + round(math.cos(a) * (d - 3)), y + round(math.sin(a) * (d - 3)), '#ffffff')
        # o rei virou confete: uma chuva de pedacinhos coloridos
        g = random.Random(21)
        for i in range(40):
            x = g.randrange(0, W)
            y0 = g.randrange(0, 90)
            y = (y0 + k * 5 + i * 2) % 96
            t.rect(x, y, x + 1, y + 1, cores[i % 6])
        # bandeirinhas e balões nascendo do universo novo
        bandeirinhas(t, 0, 94, W - 1, 90, k, sag=6, bal=1.5)
        for x, y, c1, c2 in ((20, 44, '#ff3a9a', '#ffd21e'), (204, 50, '#3ab8ff', '#4aff8a')):
            balao(t, x, y - ((k + x) % 3), 0.7, c1, c2, k, cesto=False, luz=False)
