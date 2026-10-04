"""As coisas dos oito acontecimentos da festa que também têm prêmio (Carinho, Balão dourado, Pote de ouro do arco-íris, Bandeirinha, Visitante,
Compadres, Carro de boi e Pedidos). Cada função devolve os quadros (sem contorno; quem exporta contorna), com a base na última linha."""

import math

from casa import Tela
from premios_coisas import tabua
from premios_pessoas import disco, luz, sombra


def almofada_coracao():
    quadros = []
    for q in range(3):
        t = Tela(26, 20)
        # o banquinho de madeira
        t.rect(5, 15, 20, 16, '#a8743a')
        t.rect(5, 15, 20, 15, '#d89a58')
        t.rect(7, 17, 8, 19, '#8a5a2a')
        t.rect(17, 17, 18, 19, '#8a5a2a')
        # a almofada de coração, que pulsa
        alto = (0, 1, 0)[q]
        lin = ['..xxxx....xxxx..', '.xxxxxx..xxxxxx.', 'xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxx', '.xxxxxxxxxxxxxx.', '..xxxxxxxxxxxx..',
               '...xxxxxxxxxx...', '....xxxxxxxx....', '.....xxxxxx.....', '......xxxx......']
        for ry, linha in enumerate(lin):
            for rx, c in enumerate(linha):
                if c == 'x':
                    cor = '#ee2f3c'
                    if ry <= 2 and rx <= 6:
                        cor = '#ff6a7a'
                    if rx >= 12 or ry >= 8:
                        cor = '#c8203a'
                    t.put(5 + rx, 4 + ry - alto, cor)
        t.put(7, 6 - alto, '#ffd0d8')
        t.put(8, 6 - alto, '#ffd0d8')
        # a renda e um botão
        t.rect(5, 14, 20, 14, '#fffaf0')
        for x in range(5, 21, 2):
            t.put(x, 13, '#fffaf0')
        t.put(13, 8 - alto, '#ffd21e')
        # coraçõezinhos que sobem
        t.put(3 + (q * 7) % 18, 3 - q % 2, '#ff8ab8')
        quadros.append(t.im)
    return quadros


def cacho_baloes():
    quadros = []
    cores = ['#ee2f3c', '#ffd21e', '#3a8ae8', '#35a03a', '#ff8ac0']
    for q in range(3):
        t = Tela(24, 38)
        # o cesto de vime na base, onde os fios estão amarrados
        t.rect(8, 31, 15, 37, '#c8944a')
        t.rect(8, 31, 15, 31, '#e8b868')
        t.rect(8, 34, 15, 34, '#a8743a')
        t.rect(8, 37, 15, 37, '#6a4420')
        # os balões balançando
        for k, cor in enumerate(cores):
            bal = round(math.sin(q * 2.1 + k * 1.3) * 1.5)
            bx = 3 + k * 4 + bal
            by = 3 + (k % 2) * 3 + (1 if k == 2 else 0)
            disco(t, bx + 1, by + 3, 2.6, 3.4, cor, sombra(cor, 0.78), luz(cor, 1.35))
            t.put(bx + 1, by + 7, sombra(cor))
            t.line(bx + 1, by + 8, 11 + k % 2 * 2, 31, '#e8e8f0')
        quadros.append(t.im)
    return quadros


def pote_ouro_arco():
    quadros = []
    faixas = ['#ee2f3c', '#ff8a12', '#ffd21e', '#35a03a', '#3a8ae8', '#9d5cf0']
    for q in range(3):
        t = Tela(34, 28)
        # o arco-íris atrás: seis faixas
        for k, cor in enumerate(faixas):
            r = 15 - k * 1.5
            for ang in range(0, 181, 4):
                x = round(17 - math.cos(math.radians(ang)) * r)
                y = round(18 - math.sin(math.radians(ang)) * r * 0.9)
                t.put(x, y, cor)
                t.put(x, y + 1, cor)
        # o caldeirão preto transbordando de moedas
        disco(t, 17, 22, 9.0, 5.0, '#3a3a46', '#26242e', '#6a6a78')
        t.rect(8, 17, 26, 18, '#4a4a58')
        t.rect(8, 17, 26, 17, '#8a8a98')
        for k in range(7):
            x = 9 + k * 2
            t.rect(x, 14 - (k % 3), x + 1, 16, '#ffd21e')
            t.put(x, 14 - (k % 3), '#fff6b8')
        t.rect(6, 25, 9, 27, '#26242e')
        t.rect(25, 25, 28, 27, '#26242e')
        # os brilhos das moedas
        t.put(11 + (q * 5) % 12, 12 - q % 2, '#ffffff')
        t.put(20 - (q * 3) % 9, 11 + q % 2, '#fffbe0')
        quadros.append(t.im)
    return quadros


def mastro_bandeirinhas():
    quadros = []
    cores = ['#ee2f3c', '#ffd21e', '#3a6cf0', '#35a03a', '#ff4f9e', '#ff8a12']
    for q in range(3):
        t = Tela(28, 46)
        # o mastro
        t.rect(5, 6, 6, 45, '#8a5a2a')
        t.rect(5, 6, 5, 45, '#b07a44')
        t.rect(3, 44, 8, 45, '#6a4420')
        t.rect(4, 4, 7, 5, '#ffd21e')
        # a bandeira de cima e as bandeirinhas balançando num fio comprido
        t.rect(7, 6, 15, 10, '#ee2f3c')
        t.rect(7, 6, 15, 6, '#ff6a7a')
        t.put(10 + q % 2, 8, '#fffaf0')
        for k in range(6):
            y = 12 + k * 5
            sway = round(math.sin(q * 2.1 + k * 0.9) * 1.5) + 1 + k // 3
            t.line(6, y, 6 + 11 + sway, y + 2, '#3a2418')
            for j in range(3):
                bx = 9 + j * 5 + sway
                by = y + 1 + round(j * 0.7)
                cor = cores[(k + j) % 6]
                t.rect(bx, by, bx + 2, by + 1, cor)
                t.put(bx + 1, by + 2, cor)
        quadros.append(t.im)
    return quadros


def banco_praca():
    quadros = []
    for q in range(2):
        t = Tela(30, 20)
        # o encosto e o assento de ripas verdes
        for y in (3, 6, 9):
            t.rect(3, y, 26, y + 1, '#4a9a4a')
            t.rect(3, y, 26, y, '#7ac87a')
            t.rect(3, y + 1, 26, y + 1, '#2e6a30')
        for y in (12, 14):
            t.rect(1, y, 28, y + 1, '#4a9a4a')
            t.rect(1, y, 28, y, '#7ac87a')
        # os pés de ferro
        for x in (3, 24):
            t.rect(x, 3, x + 1, 19, '#3a3a46')
            t.rect(x - 1, 18, x + 2, 19, '#26242e')
            t.rect(x, 3, x, 17, '#6a6a78')
        # o chapéu de palha esquecido no banco e uma folha caindo
        t.rect(11, 9, 18, 11, '#e8c44a')
        t.rect(9, 11, 20, 12, '#e8c44a')
        t.rect(11, 9, 18, 9, '#f6e08a')
        t.rect(12, 10, 17, 10, '#ee2f3c')
        t.put(22 + q, 1 + q * 3, '#7ab04a')
        t.put(23 + q, 2 + q * 3, '#5a8a3a')
        quadros.append(t.im)
    return quadros


def mesa_compadres():
    quadros = []
    for q in range(3):
        t = Tela(32, 24)
        # a mesa redonda com toalha xadrez
        t.rect(9, 8, 22, 9, '#fffaf0')
        for x in range(9, 23):
            for y in (8, 9):
                if (x + y) % 2:
                    t.put(x, y, '#ee2f3c')
        t.rect(8, 10, 23, 11, '#ee2f3c')
        t.rect(8, 10, 23, 10, '#ff6a7a')
        t.rect(14, 12, 17, 22, '#a8743a')
        t.rect(11, 22, 20, 23, '#6a4420')
        # as canecas e a garrafa em cima
        for x in (10, 19):
            t.rect(x, 4, x + 3, 8, '#c8ccd8')
            t.rect(x, 4, x + 3, 4, '#fffaf0')
            t.rect(x + 3, 5, x + 4, 7, '#8a8e9c')
            t.rect(x + 1, 6, x + 2, 7, '#e8b838')
        t.rect(15, 2, 16, 8, '#2a6a3a')
        t.rect(15, 2, 16, 2, '#8ad898')
        t.rect(14, 5, 17, 7, '#3a8a4a')
        # um chapéu de palha de cada lado, nos bancos
        for x in (0, 25):
            t.rect(x + 1, 13, x + 5, 15, '#e8c44a')
            t.rect(x, 15, x + 6, 16, '#e8c44a')
            t.rect(x + 1, 14, x + 5, 14, '#ee2f3c')
            t.rect(x + 2, 17, x + 3, 23, '#8a5a2a')
        # a espuma que brilha
        t.put(10 + (q * 6) % 12, 2 + q % 2, '#ffffff')
        quadros.append(t.im)
    return quadros


def roda_carro_boi():
    quadros = []
    for q in range(3):
        t = Tela(30, 30)
        # um tronco de apoio
        t.rect(2, 26, 27, 29, '#6a4420')
        t.rect(2, 26, 27, 26, '#a8743a')
        # a roda maciça com raios que giram devagar
        disco(t, 15, 14, 12.4, 12.4, '#a8743a', '#6a4420', '#c8844a')
        disco(t, 15, 14, 9.4, 9.4, '#8a5a2a', '#5a3a18', '#a8743a')
        for k in range(6):
            ang = math.radians(q * 10 + k * 60)
            t.line(15, 14, round(15 + math.cos(ang) * 9), round(14 + math.sin(ang) * 9), '#c8944a')
        disco(t, 15, 14, 2.6, 2.6, '#3a2418', '#26180e', '#5a3a28')
        t.put(14, 13, '#8a6a4a')
        # o aro de ferro
        for k in range(32):
            ang = k / 32 * math.tau
            t.put(round(15 + math.cos(ang) * 12.4), round(14 + math.sin(ang) * 12.4), '#5a5a68')
        quadros.append(t.im)
    return quadros


def caderno_pedidos():
    quadros = []
    for q in range(3):
        t = Tela(24, 32)
        # o atril de madeira
        t.rect(3, 14, 20, 15, '#a8743a')
        t.rect(3, 14, 20, 14, '#d89a58')
        t.rect(11, 15, 12, 31, '#8a5a2a')
        t.rect(6, 30, 17, 31, '#6a4420')
        # o caderno aberto com anotações e o lápis
        t.rect(2, 4, 21, 14, '#fffaf0')
        t.rect(2, 4, 21, 4, '#ffffff')
        t.rect(11, 4, 12, 14, '#c8b890')
        t.rect(2, 4, 2, 14, '#3a6cf0')
        t.rect(21, 4, 21, 14, '#3a6cf0')
        for y in (6, 8, 10, 12):
            t.rect(4, y, 9, y, '#8a8e9c')
            t.rect(14, y, 19, y, '#8a8e9c')
        t.rect(14, 6, 16, 6, '#3a6cf0')
        t.put(5, 8, '#ee2f3c')
        t.line(17, 3, 21, 0, '#ffd21e')
        t.put(17, 3, '#ee4a4a')
        # o sininho em cima, balançando
        bal = (-1, 0, 1)[q]
        t.rect(9, 0, 14, 0, '#ffd21e')
        t.rect(9 + bal, 1, 14 + bal, 2, '#d8a83a')
        t.put(11 + bal, 3, '#ffe27a')
        quadros.append(t.im)
    return quadros


def estacao_tempo():
    quadros = []
    for q in range(3):
        t = Tela(28, 44)
        # o poste e a base
        t.rect(13, 12, 14, 43, '#8a5a2a')
        t.rect(13, 12, 13, 43, '#b07a44')
        t.rect(9, 41, 18, 43, '#6a4420')
        # o cata-vento no alto: seta e galo que viram com o vento
        t.rect(13, 3, 14, 12, '#5a5a68')
        dir_ = (-1, 0, 1)[q]
        t.rect(6 + dir_, 6, 21 + dir_, 7, '#26242e')
        t.rect(6 + dir_, 4, 8 + dir_, 9, '#26242e')
        t.rect(19 + dir_, 5, 22 + dir_, 8, '#ee2f3c')
        t.rect(11, 1, 16, 3, '#ffd21e')
        t.rect(12, 0, 15, 0, '#ffd21e')
        # o anemômetro: três conchas girando
        t.rect(13, 14, 14, 17, '#5a5a68')
        for k in range(3):
            ang = (q * 40 + k * 120) * 3.14159 / 180
            import math
            cx = round(13.5 + math.cos(ang) * 6)
            cy = round(14 + math.sin(ang) * 1.5)
            t.rect(cx - 1, cy - 1, cx + 1, cy + 1, '#e8e8f0')
            t.put(cx - 1, cy - 1, '#ffffff')
            t.line(14, 15, cx, cy, '#5a5a68')
        # o barômetro: mostrador redondo com ponteiro
        disco(t, 13, 28, 8.0, 8.0, '#f4ecd8', '#c8b890', '#fffaf0')
        for k in range(8):
            ang = (k * 45 + 22) * 3.14159 / 180
            t.put(round(13 + math.cos(ang) * 6.5), round(28 + math.sin(ang) * 6.5), '#26242e')
        agulha = (-50, 10, 50)[q]
        ang = (agulha - 90) * 3.14159 / 180
        t.line(13, 28, round(13 + math.cos(ang) * 5), round(28 + math.sin(ang) * 5), '#ee2f3c')
        t.put(13, 28, '#26242e')
        t.rect(7, 21, 19, 21, '#8a8e9c')
        # o aro do mostrador
        for k in range(32):
            a2 = k / 32 * 6.2832
            t.put(round(13 + math.cos(a2) * 8.4), round(28 + math.sin(a2) * 8.4), '#6a4420')
        quadros.append(t.im)
    return quadros


COISAS3 = {
    'almofada-coracao': almofada_coracao, 'cacho-baloes': cacho_baloes, 'pote-ouro-arco': pote_ouro_arco, 'mastro-bandeirinhas': mastro_bandeirinhas,
    'banco-praca': banco_praca, 'mesa-compadres': mesa_compadres, 'roda-carro-boi': roda_carro_boi, 'caderno-pedidos': caderno_pedidos,
    'estacao-tempo': estacao_tempo,
}
