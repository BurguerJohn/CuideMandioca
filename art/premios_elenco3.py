"""Mais oito personagens dos prêmios, os da terceira leva: os acontecimentos da festa que também têm prêmio (Carinho, Balão dourado, Pote de
ouro do arco-íris, Bandeirinha, Visitante, Compadres, Carro de boi e Pedidos). Mesma regra de `premios_elenco.py`.
"""

from premios_elenco import brilho
from premios_pessoas import luz, sombra


def coracao(t, x, y, cor='#ee2f3c'):
    t.put(x, y, cor)
    t.put(x + 2, y, cor)
    t.rect(x, y + 1, x + 2, y + 1, cor)
    t.put(x + 1, y + 2, cor)
    t.put(x, y, luz(cor, 1.3))


def item_dengo(t, pose, i, cfg, me, md, dy):
    # um coração de pelúcia nos braços; na ação joga corações para cima
    x, y = md
    if pose == 'acao':
        for k in range(3):
            coracao(t, x - 3 + k * 4, y - 9 - i * 3 - (k % 2) * 3, ['#ee2f3c', '#ff4f9e', '#ff8a96'][k])
    else:
        t.rect(x - 4, y - 5, x + 2, y + 1, '#ee2f3c')
        coracao(t, x - 3, y - 4, '#ff6a7a')
        t.put(x - 4, y - 5, '#ff8a96')


def item_balao(t, pose, i, cfg, me, md, dy):
    # três balões amarrados na mão direita, ao lado da cabeça; na ação eles sobem e balançam
    x, y = md
    cores = ['#ee2f3c', '#ffd21e', '#3a8ae8']
    sobe = 2 if pose == 'acao' else 0
    for k, cor in enumerate(cores):
        bx = x - 1 + k * 3 + (i if k == 1 else 0)
        by = 3 + (k % 2) * 3 - sobe
        t.line(x, y, bx + 1, by + 4, '#e8e8f0')
        t.rect(bx, by, bx + 2, by + 3, cor)
        t.put(bx, by, luz(cor, 1.5))
        t.put(bx + 1, by + 4, sombra(cor))


def item_arco(t, pose, i, cfg, me, md, dy):
    # um arco-íris pequeno que ela segura; na ação ele cresce e solta brilhos
    x, y = md
    cores = ['#ee2f3c', '#ff8a12', '#ffd21e', '#35a03a', '#3a8ae8', '#9d5cf0']
    r = 6 + (2 if pose == 'acao' else 0)
    for k, cor in enumerate(cores[:3]):
        t.rect(x - r + k, y - 6 - i - r // 2 + k, x - r + k, y - 5 - i, cor)
        t.rect(x + r - k - 1, y - 6 - i - r // 2 + k, x + r - k - 1, y - 5 - i, cor)
        t.rect(x - r + k, y - 6 - i - r // 2 + k, x + r - k - 1, y - 6 - i - r // 2 + k, cor)
    if pose == 'acao':
        brilho(t, x + r + 2, y - 11 - i)


def item_bandeira(t, pose, i, cfg, me, md, dy):
    # um fio de bandeirinhas na mão direita; na ação balança para os lados
    x, y = md
    cores = ['#ee2f3c', '#ffd21e', '#3a6cf0', '#35a03a', '#ff4f9e']
    sway = (-1, 1)[i] if pose == 'acao' else 0
    for k, cor in enumerate(cores):
        bx = x - 2 + k * 3 + sway * (k % 2)
        t.put(bx, y - 6, '#3a2418')
        t.put(bx + 1, y - 6, '#3a2418')
        t.rect(bx, y - 5, bx + 1, y - 4, cor)
        t.put(bx, y - 3 + (k % 2), cor)
    t.line(x - 3, y - 7, x + 12, y - 7, '#3a2418')


def item_visita(t, pose, i, cfg, me, md, dy):
    # a maleta de couro na mão direita; na ação ergue a maleta e solta uma estrelinha
    x, y = md
    alto = 4 + (4 if pose == 'acao' else 0) + i
    t.rect(x - 2, y - alto, x + 5, y - alto + 5, '#8a5a2a')
    t.rect(x - 2, y - alto, x + 5, y - alto, '#b07a44')
    t.rect(x - 2, y - alto + 2, x + 5, y - alto + 2, '#5a3a1a')
    t.rect(x, y - alto - 2, x + 3, y - alto - 1, '#3a2418')
    t.put(x + 1, y - alto + 3, '#ffd21e')
    if pose == 'acao':
        brilho(t, x + 8, y - alto - 3)


def item_compadre(t, pose, i, cfg, me, md, dy):
    # a caneca de lata na mão direita; na ação brinda com espuma e brilhos
    x, y = md
    alto = 3 + (5 if pose == 'acao' else 0) + i
    t.rect(x - 1, y - alto, x + 3, y - alto + 4, '#c8ccd8')
    t.rect(x - 1, y - alto, x + 3, y - alto, '#fffaf0')
    t.rect(x + 3, y - alto + 1, x + 4, y - alto + 3, '#8a8e9c')
    t.rect(x, y - alto + 2, x + 2, y - alto + 3, '#e8b838')
    if pose == 'acao':
        brilho(t, x + 7, y - alto - 2, '#ffffff')
        t.put(x - 2, y - alto - 1, '#fffaf0')
    gx, gy = me
    t.rect(gx - 3, gy, gx - 1, gy + 5, '#2a6a3a')
    t.rect(gx - 3, gy, gx - 1, gy, '#8ad898')


def item_carreiro(t, pose, i, cfg, me, md, dy):
    # a vara de ferrão do carreiro; na ação ergue a vara e grita
    x, y = md
    if pose == 'acao':
        t.line(x, y, x + 5, y - 15 - i, '#8a5a2a')
        t.put(x + 5, y - 16 - i, '#c8ccd8')
        t.put(x + 6, y - 17 - i, '#c8ccd8')
    else:
        t.line(x, y, x + 6, y - 12, '#8a5a2a')
        t.put(x + 6, y - 13, '#c8ccd8')


def item_atenta(t, pose, i, cfg, me, md, dy):
    # o caderninho no braço esquerdo e o lápis na mão direita; na ação anota e brilha
    bx, by = me
    t.rect(bx - 5, by, bx - 1, by + 6, '#fffaf0')
    t.rect(bx - 5, by, bx - 5, by + 6, '#3a6cf0')
    for k in range(3):
        t.put(bx - 3, by + 1 + k * 2, '#8a8e9c')
        t.put(bx - 2, by + 1 + k * 2, '#8a8e9c')
    x, y = md
    if pose == 'acao':
        t.line(x, y, x + 3, y - 8 - i, '#ffd21e')
        t.put(x + 3, y - 9 - i, '#ee4a4a')
        brilho(t, x + 7, y - 11 - i * 2)
    else:
        t.line(x, y, x + 2, y - 5, '#ffd21e')
        t.put(x + 2, y - 6, '#ee4a4a')


def item_tempo(t, pose, i, cfg, me, md, dy):
    # um balão-sonda branco amarrado na mão direita; na ação o balão sobe e solta um raiozinho
    x, y = md
    alto = 7 + (4 if pose == 'acao' else 0) + i
    t.line(x, y, x + 2, y - alto, '#e8e8f0')
    t.rect(x, y - alto - 4, x + 4, y - alto, '#fffaf0')
    t.rect(x, y - alto - 4, x + 1, y - alto - 3, '#ffffff')
    t.rect(x + 3, y - alto - 2, x + 4, y - alto, '#c8ccd8')
    if pose == 'acao':
        t.put(x + 7, y - alto - 6, '#ffd21e')
        t.put(x + 6, y - alto - 5, '#ffd21e')
        t.put(x + 7, y - alto - 4, '#ffd21e')
    # a prancheta no braço esquerdo
    bx, by = me
    t.rect(bx - 4, by, bx, by + 5, '#a8743a')
    t.rect(bx - 3, by + 1, bx - 1, by + 4, '#fffaf0')


ELENCO3 = {
    'tia-dengo': dict(pele='morena', cabelo='coque', cabelo_cor='#4a2a18', camisa='#ff8ab8', roupa='avental', listra='#ee4a6a', calca='#ff8ab8',
                      item=item_dengo, acao_dir='alto', fala=True),
    'seu-balao': dict(pele='clara', cabelo='curto', cabelo_cor='#c8742a', camisa='#3a8ae8', roupa='colete', listra='#ffd21e', calca='#3a3a48',
                      chapeu='bone', chapeu_cor='#ee2f3c', item=item_balao, acao_dir='alto', fala=True),
    'dona-arco-iris': dict(pele='escura', cabelo='afro', cabelo_cor='#2a1a14', camisa='#ffd21e', roupa='colorido', calca='#3a8ae8', sapato='#ee2f3c',
                           item=item_arco, acao_dir='alto', fala=True),
    'menina-bandeira': dict(pele='clara', cabelo='tranca', cabelo_cor='#2a1a14', camisa='#ee4a4a', roupa='vestido', listra='#fffaf0', calca='#ee4a4a',
                            chapeu='lenco', chapeu_cor='#ffd21e', item=item_bandeira, acao_dir='alto'),
    'seu-visita': dict(pele='media', cabelo='lateral', cabelo_cor='#b8b8c0', camisa='#8a6a3a', roupa='colete', listra='#fff4e4', calca='#4a3a2a',
                       chapeu='cartola', chapeu_cor='#3a3a48', bigode='#9a9aa2', item=item_visita, acao_dir='alto'),
    'compadre-ze': dict(pele='morena', cabelo='curto', cabelo_cor='#2a1a14', camisa='#58a858', roupa='xadrez', listra='#2a6a3a', calca='#6a4a2a',
                        chapeu='palha', chapeu_cor='#e8c44a', bigode='#2a1a14', item=item_compadre, acao_dir='alto', fala=True),
    'carreiro-tiao': dict(pele='media', cabelo='curto', cabelo_cor='#4a3022', camisa='#f4ecd8', roupa='listras', listra='#8a6a3a', calca='#5a4a3a',
                          chapeu='cowboy', chapeu_cor='#7a5a2a', barba='#4a3022', item=item_carreiro, acao_dir='alto'),
    'seu-barometro': dict(pele='media', cabelo='lateral', cabelo_cor='#b8b8c0', camisa='#f0c820', roupa='liso', calca='#3a3a48', chapeu='aba',
                          chapeu_cor='#f0c820', oculos='#3a3a48', item=item_tempo, acao_dir='alto', fala=True),
    'dona-atenta': dict(pele='clara', cabelo='curto', cabelo_cor='#8a3a2a', camisa='#3a9a8a', roupa='vestido', listra='#fffaf0', calca='#3a9a8a',
                        oculos='#8a6a3a', item=item_atenta, acao_dir='alto'),
}
