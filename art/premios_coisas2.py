"""As coisas dos oito minigames da segunda leva dos prêmios (Cozinha, Concurso de fantasia, Casamento, Fotógrafo, Penetras, Correio, Álbum e
Quadrilha). Cada função devolve os quadros (sem contorno; quem exporta contorna), com a base na última linha."""

import math

from casa import Tela
from premios_coisas import tabua
from premios_pessoas import disco, luz, sombra


def cesta_pamonhas():
    quadros = []
    for q in range(3):
        t = Tela(26, 24)
        # as pamonhas: pacotes de palha de milho amarrados com barbante, em pé dentro da cesta
        for k, x in enumerate((5, 9, 13, 17)):
            alto = 5 + (k % 2) * 2
            t.rect(x, 6 + (k % 2), x + 3, 14, '#e8d49a')
            t.rect(x, 6 + (k % 2), x, 14, '#f6e8b4')
            t.rect(x + 3, 6 + (k % 2), x + 3, 14, '#b8a468')
            t.rect(x + 1, 6 + (k % 2), x + 2, 6 + (k % 2), '#7ab04a')
            t.rect(x, 10, x + 3, 10, '#8a5a2a')
            t.put(x + 1, 5 + (k % 2) - 1, '#6a9a3a')
        # a cesta de vime
        disco(t, 13, 18, 11.0, 5.0, '#c8944a', '#8a5a2a', '#e8b868')
        t.rect(3, 13, 22, 13, '#e8b868')
        for x in range(4, 22, 3):
            t.rect(x, 14, x, 22, '#a8743a')
        t.rect(3, 17, 22, 17, '#a8743a')
        t.rect(3, 22, 22, 22, '#6a4420')
        # o vapor que sobe
        for k in range(3):
            t.put(8 + k * 5 + (q + k) % 2, 3 - (q + k) % 3, '#f6f6fc' if k % 2 else '#c8ccde')
            t.put(9 + k * 5, 1 + (q * 2 + k) % 2, '#e8ecf4')
        quadros.append(t.im)
    return quadros


def cabide_fantasias():
    quadros = []
    for q in range(3):
        t = Tela(30, 34)
        # o cabide de madeira: dois pés e uma barra
        t.rect(3, 4, 4, 33, '#a8743a')
        t.rect(25, 4, 26, 33, '#a8743a')
        t.rect(3, 4, 3, 33, '#d89a58')
        t.rect(2, 3, 27, 4, '#8a5a2a')
        t.rect(2, 3, 27, 3, '#c8844a')
        t.rect(1, 32, 6, 33, '#6a4420')
        t.rect(23, 32, 28, 33, '#6a4420')
        # as fantasias penduradas, balançando
        cores = (('#ee4a8a', '#ff8ab8', '#c82a68'), ('#3a8ae8', '#6aaaff', '#2a5ab8'), ('#35a03a', '#6ac86a', '#1e7a28'))
        for k, (cor, claro, escuro) in enumerate(cores):
            bal = round(math.sin(q * 2.1 + k * 1.4) * 1.0)
            x = 6 + k * 7
            t.line(x + 3, 5, x + 3, 7, '#8a8e9c')
            t.rect(x + bal, 8, x + 5 + bal, 11, cor)
            t.rect(x + bal, 8, x + 5 + bal, 8, claro)
            t.rect(x - 1 + bal, 12, x + 6 + bal, 22, cor)
            t.rect(x + 6 + bal, 12, x + 6 + bal, 22, escuro)
            t.rect(x - 1 + bal, 12, x - 1 + bal, 22, claro)
            t.rect(x - 1 + bal, 21, x + 6 + bal, 22, escuro)
            t.rect(x + 1 + bal, 15, x + 4 + bal, 15, '#ffd21e')
            t.put(x + 2 + bal, 18, '#fffaf0')
            t.put(x + 3 + bal, 19, '#fffaf0')
        quadros.append(t.im)
    return quadros


def bolo_noiva():
    quadros = []
    for q in range(3):
        t = Tela(24, 30)
        # a mesinha
        t.rect(2, 24, 21, 25, '#a8743a')
        t.rect(2, 24, 21, 24, '#d89a58')
        t.rect(4, 26, 5, 29, '#8a5a2a')
        t.rect(18, 26, 19, 29, '#8a5a2a')
        # os três andares do bolo
        for (x0, x1, y0, y1) in ((3, 20, 17, 23), (6, 17, 11, 16), (9, 14, 6, 10)):
            t.rect(x0, y0, x1, y1, '#fffaf0')
            t.rect(x0, y0, x1, y0, '#ffffff')
            t.rect(x1, y0, x1, y1, '#d8d0c0')
            t.rect(x0, y1, x1, y1, '#ff8ab8')
            for x in range(x0 + 1, x1, 2):
                t.put(x, y1 - 1 if x % 4 else y1 - 2, '#ff8ab8')
        for x in range(4, 20, 3):
            t.put(x, 20, '#ee4a8a')
        for x in range(7, 17, 3):
            t.put(x, 13, '#ee4a8a')
        # os noivinhos no topo
        t.rect(10, 2, 11, 5, '#26242e')
        t.put(10, 1, '#f4dcb8')
        t.put(11, 1, '#f4dcb8')
        t.rect(12, 2, 14, 5, '#fffaf0')
        t.put(13, 1, '#f4dcb8')
        # brilhinhos
        t.put(3 + (q * 7) % 18, 12 + (q * 3) % 8, '#fff07a')
        t.put(18 - (q * 5) % 14, 8 + (q * 4) % 10, '#ffffff')
        quadros.append(t.im)
    return quadros


def camera_tripe():
    quadros = []
    for q in range(2):
        t = Tela(26, 34)
        # o tripé
        t.line(13, 18, 5, 33, '#6a4420')
        t.line(13, 18, 21, 33, '#6a4420')
        t.line(13, 18, 13, 33, '#8a5a2a')
        t.rect(3, 33, 7, 33, '#3a2418')
        t.rect(19, 33, 23, 33, '#3a2418')
        # a câmera de caixa com a lente e o pano preto atrás
        t.rect(6, 7, 19, 17, '#3a3a46')
        t.rect(6, 7, 19, 8, '#5a5a68')
        t.rect(19, 7, 19, 17, '#26242e')
        t.rect(2, 5, 8, 19, '#1a1a22')
        t.rect(2, 5, 3, 19, '#3a3a46')
        t.rect(8, 9, 8, 19, '#0a0a10')
        disco(t, 14, 12, 3.3, 3.3, '#8a909c', '#5a606c', '#c8ccd8')
        t.rect(13, 11, 15, 13, '#2a6ac8')
        t.put(13, 11, '#9ad8f0')
        t.rect(9, 5, 12, 6, '#ffd21e')
        # o flash: no segundo quadro
        if q == 1:
            for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)):
                t.put(22 + dx, 6 + dy, '#ffffff')
            for dx, dy in ((-2, 0), (2, 0), (0, -2), (0, 2), (-1, -1), (1, 1), (-1, 1), (1, -1)):
                t.put(22 + dx, 6 + dy, '#fff4a0')
        else:
            t.put(22, 6, '#c8ccd8')
        quadros.append(t.im)
    return quadros


def placa_penetra():
    quadros = []
    for q in range(2):
        t = Tela(24, 34)
        # o poste
        t.rect(11, 14, 12, 33, '#8a5a2a')
        t.rect(11, 14, 11, 33, '#b07a44')
        t.rect(8, 32, 15, 33, '#6a4420')
        # a placa balançando (a corrente fica no mesmo lugar, a placa vai e vem)
        bal = (0, 1)[q]
        t.rect(2 + bal, 2, 21 + bal, 14, '#fffaf0')
        t.rect(2 + bal, 2, 21 + bal, 2, '#ffffff')
        t.rect(21 + bal, 2, 21 + bal, 14, '#c8b890')
        t.rect(2 + bal, 14, 21 + bal, 14, '#c8b890')
        # a pessoinha riscada
        disco(t, 11 + bal, 6, 1.6, 1.6, '#26242e', '#26242e', '#26242e')
        t.rect(10 + bal, 8, 12 + bal, 12, '#26242e')
        t.put(9 + bal, 9, '#26242e')
        t.put(13 + bal, 9, '#26242e')
        t.put(10 + bal, 13, '#26242e')
        t.put(12 + bal, 13, '#26242e')
        # o círculo vermelho e o risco
        for k in range(24):
            ang = k / 24 * math.tau
            t.put(round(11 + bal + math.cos(ang) * 6.2), round(8 + math.sin(ang) * 5.2), '#ee2f3c')
        t.line(7 + bal, 4, 16 + bal, 12, '#ee2f3c')
        t.line(7 + bal, 5, 15 + bal, 12, '#ee2f3c')
        quadros.append(t.im)
    return quadros


def poleiro_pombos():
    quadros = []
    for q in range(3):
        t = Tela(28, 30)
        # o poste e a barra do poleiro
        t.rect(13, 12, 14, 29, '#8a5a2a')
        t.rect(13, 12, 13, 29, '#b07a44')
        t.rect(10, 28, 17, 29, '#6a4420')
        t.rect(3, 11, 24, 12, '#a8743a')
        t.rect(3, 11, 24, 11, '#d89a58')
        t.rect(1, 10, 3, 13, '#6a4420')
        t.rect(24, 10, 26, 13, '#6a4420')

        def pombo(x, bico, asa):
            disco(t, x, 7, 3.4, 3.0, '#aeb4c8', '#7a8098', '#d8dcec')
            disco(t, x + 3 * bico, 4, 1.9, 1.9, '#9aa0b8', '#7a8098', '#c8ccdc')
            t.put(x + 4 * bico, 4, '#ff8a3a')
            t.put(x + 3 * bico - 1, 3, '#26242e') if bico > 0 else t.put(x + 3 * bico + 1, 3, '#26242e')
            t.rect(x - 2, 6 + asa, x + 1, 8 + asa, '#8a90a8')
            t.rect(x - 1, 10, x - 1, 11, '#ff8a3a')
            t.rect(x + 1, 10, x + 1, 11, '#ff8a3a')
        pombo(8, 1, q % 2)
        pombo(19, -1, (q + 1) % 2)
        # uma carta pendurada no poste
        t.rect(15, 17, 20, 22, '#fffaf0')
        t.rect(15, 17, 20, 17, '#c8b890')
        t.put(17, 19, '#ee2f3c')
        t.put(18, 19, '#ee2f3c')
        quadros.append(t.im)
    return quadros


def album_gigante():
    quadros = []
    for q in range(3):
        t = Tela(30, 32)
        # o cavalete
        t.line(15, 22, 6, 31, '#6a4420')
        t.line(15, 22, 24, 31, '#6a4420')
        t.line(15, 22, 15, 31, '#8a5a2a')
        t.rect(4, 31, 8, 31, '#3a2418')
        t.rect(22, 31, 26, 31, '#3a2418')
        # o álbum aberto: capa azul e duas páginas com figurinhas coloridas
        t.rect(1, 3, 28, 22, '#2a4cb0')
        t.rect(1, 3, 28, 4, '#3a6cf0')
        t.rect(2, 5, 14, 21, '#fffaf0')
        t.rect(15, 5, 27, 21, '#fffaf0')
        t.rect(14, 5, 14, 21, '#c8b890')
        cores = ['#ee2f3c', '#ffd21e', '#35a03a', '#ff8ac0', '#3a8ae8', '#ff8a3a']
        for k in range(6):
            x = 4 + (k % 3) * 4
            y = 7 + (k // 3) * 7
            t.rect(x, y, x + 2, y + 4, cores[k])
            t.put(x, y, luz(cores[k], 1.4))
        for k in range(6):
            x = 17 + (k % 3) * 4
            y = 7 + (k // 3) * 7
            if k == 5:
                t.rect(x, y, x + 2, y + 4, '#e8e0cc')
                t.put(x + 1, y + 2, '#b8b098')
            else:
                t.rect(x, y, x + 2, y + 4, cores[(k + 3) % 6])
                t.put(x, y, luz(cores[(k + 3) % 6], 1.4))
        # o brilhinho que pisca numa figurinha nova
        px = 17 + (q % 3) * 4
        t.put(px + 1, 6, '#ffffff')
        t.put(px, 6, '#fff4a0')
        t.put(px + 2, 6, '#fff4a0')
        quadros.append(t.im)
    return quadros


def corneta_alto():
    quadros = []
    for q in range(3):
        t = Tela(24, 46)
        # o poste e a base
        t.rect(13, 14, 14, 45, '#8a5a2a')
        t.rect(13, 14, 13, 45, '#b07a44')
        t.rect(9, 43, 18, 45, '#6a4420')
        # a corneta: um funil de latão com a boca grande virada para a esquerda e o bocal à direita
        for x in range(0, 12):
            meia = 1.3 + (11 - x) * 0.85
            cor = '#d8a83a' if (x // 3) % 2 else '#b8841e'
            t.rect(x, round(12 - meia), x, round(12 + meia), cor)
            t.put(x, round(12 - meia), '#ffe27a')
            t.put(x, round(12 + meia), '#7a5a1a')
        t.rect(0, 1, 1, 23, '#ffe27a')
        t.rect(1, 1, 1, 23, '#d8a83a')
        t.rect(0, 1, 0, 23, '#8a5a1a')
        t.rect(12, 10, 15, 14, '#8a5a1a')
        t.rect(12, 10, 15, 10, '#d8a83a')
        t.rect(15, 11, 16, 13, '#6a4410')
        # as notas que saem da boca e vão embora
        for k in range(3):
            x = 3 + ((q + k) * 3) % 10
            t.put(x, 27 + k * 4, '#fff4e4')
            t.put(x + 1, 26 + k * 4, '#fff4e4')
            t.put(x + 1, 25 + k * 4, '#fff4e4')
        quadros.append(t.im)
    return quadros


COISAS2 = {
    'cesta-pamonhas': cesta_pamonhas, 'cabide-fantasias': cabide_fantasias, 'bolo-noiva': bolo_noiva, 'camera-tripe': camera_tripe,
    'placa-penetra': placa_penetra, 'poleiro-pombos': poleiro_pombos, 'album-gigante': album_gigante, 'corneta-alto': corneta_alto,
}
