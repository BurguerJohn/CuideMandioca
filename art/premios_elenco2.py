"""Mais oito personagens dos prêmios, um para cada minigame da segunda leva (Cozinha, Concurso de fantasia, Casamento, Fotógrafo, Penetras,
Correio, Álbum e Quadrilha). Mesma regra de `premios_elenco.py`: `item(t, pose, i, cfg, mao_esq, mao_dir, dy)` desenha o que o personagem carrega.
"""

from premios_elenco import brilho, nota
from premios_pessoas import luz, sombra


def item_concha(t, pose, i, cfg, me, md, dy):
    # a concha (cabo de madeira e a bacia de ferro) na mão direita; no braço esquerdo uma panelinha
    x, y = md
    if pose == 'acao':
        t.line(x, y, x + 4, y - 9 - i, '#8a5a2a')
        t.rect(x + 3, y - 12 - i, x + 6, y - 10 - i, '#7a808c')
        t.rect(x + 3, y - 12 - i, x + 6, y - 12 - i, '#d8dce8')
        for k in range(3):
            t.put(x + 4 + k - 1, y - 15 - i * 2 - k, '#f6f6fc')
    else:
        t.line(x, y, x + 2, y - 8, '#8a5a2a')
        t.rect(x + 1, y - 11, x + 4, y - 9, '#7a808c')
        t.rect(x + 1, y - 11, x + 4, y - 11, '#d8dce8')
    bx, by = me
    t.rect(bx - 4, by + 1, bx, by + 5, '#3a3a46')
    t.rect(bx - 4, by + 1, bx, by + 1, '#7a808c')
    t.rect(bx - 5, by + 2, bx - 5, by + 3, '#7a808c')


def item_figurino(t, pose, i, cfg, me, md, dy):
    # a fita métrica pendurada no pescoço e uma tesoura na mão; na ação ergue um vestido
    t.rect(7, 13 + dy, 7, 18 + dy, '#ffd21e')
    t.rect(11, 13 + dy, 11, 18 + dy, '#ffd21e')
    for k in range(3):
        t.put(7, 14 + k * 2 + dy, '#26242e')
        t.put(11, 15 + k * 2 + dy, '#26242e')
    x, y = md
    if pose == 'acao':
        t.rect(x - 1, y - 11 - i, x + 5, y - 3 - i, '#ee4a8a')
        t.rect(x - 1, y - 11 - i, x + 5, y - 10 - i, '#ff8ab8')
        t.rect(x + 1, y - 9 - i, x + 3, y - 3 - i, '#c82a68')
        brilho(t, x + 7, y - 11 - i)
    else:
        t.line(x, y, x + 2, y - 4, '#c8ccd8')
        t.line(x + 2, y, x + 1, y - 4, '#a8acb8')
        t.put(x, y + 1, '#ee2f3c')
        t.put(x + 2, y + 1, '#ee2f3c')


def item_madrinha(t, pose, i, cfg, me, md, dy):
    # o buquê na mão direita; na ação joga as flores para o alto
    x, y = md
    cores = ['#ff8ab8', '#ffffff', '#ffd21e', '#ff6aa0']
    if pose == 'acao':
        t.line(x, y, x + 1, y - 5 - i, '#35a03a')
        for k in range(4):
            t.rect(x - 1 + k * 2, y - 9 - i * 2 - (k % 2) * 2, x + k * 2, y - 8 - i * 2 - (k % 2) * 2, cores[k])
    else:
        t.line(x, y, x + 1, y - 4, '#35a03a')
        t.rect(x - 2, y - 7, x + 3, y - 5, '#35a03a')
        for k in range(3):
            t.rect(x - 2 + k * 2, y - 8, x - 1 + k * 2, y - 7, cores[k])
        t.put(x + 3, y - 8, cores[3])


def item_pose(t, pose, i, cfg, me, md, dy):
    # a moldura dourada na mão direita; na ação ergue a moldura e dispara o flash
    x, y = md
    if pose == 'acao':
        t.rect(x - 1, y - 12 - i, x + 6, y - 5 - i, '#e8b838')
        t.rect(x, y - 11 - i, x + 5, y - 6 - i, '#9ad8f0')
        t.rect(x, y - 11 - i, x + 5, y - 10 - i, '#d8f4ff')
        brilho(t, x + 9, y - 13 - i * 2, '#ffffff')
    else:
        t.rect(x - 1, y - 8, x + 4, y - 2, '#e8b838')
        t.rect(x, y - 7, x + 3, y - 3, '#9ad8f0')
        t.put(x + 1, y - 6, '#d8f4ff')


def item_seguranca(t, pose, i, cfg, me, md, dy):
    # o apito prateado na mão direita e a prancheta no braço esquerdo; na ação mostra a palma (PARE)
    x, y = md
    if pose == 'acao':
        t.rect(x - 1, y - 9 - i, x + 4, y - 3 - i, '#d8906a')
        t.rect(x, y - 8 - i, x + 3, y - 4 - i, '#ee2f3c')
        t.rect(x + 1, y - 7 - i, x + 2, y - 5 - i, '#fffaf0')
    else:
        t.rect(x, y - 3, x + 3, y - 1, '#c8ccd8')
        t.put(x + 4, y - 2, '#8a8e9c')
    bx, by = me
    t.rect(bx - 4, by, bx, by + 6, '#a8743a')
    t.rect(bx - 3, by + 1, bx - 1, by + 5, '#fffaf0')
    t.rect(bx - 2, by, bx - 2, by, '#8a8e9c')


def item_cartinha(t, pose, i, cfg, me, md, dy):
    # a carta com lacre de coração na mão direita e uma pena atrás da orelha; na ação ergue a carta e solta corações
    x, y = md
    if pose == 'acao':
        t.rect(x - 1, y - 11 - i, x + 5, y - 5 - i, '#fffaf0')
        t.rect(x - 1, y - 11 - i, x + 5, y - 11 - i, '#c8b890')
        t.put(x + 2, y - 8 - i, '#ee2f3c')
        t.put(x + 1, y - 9 - i, '#ee2f3c')
        t.put(x + 3, y - 9 - i, '#ee2f3c')
        t.put(x + 8, y - 12 - i * 2, '#ff4f9e')
        t.put(x + 9, y - 13 - i * 2, '#ff8a96')
    else:
        t.rect(x - 1, y - 7, x + 5, y - 2, '#fffaf0')
        t.rect(x - 1, y - 7, x + 5, y - 7, '#c8b890')
        t.put(x + 2, y - 4, '#ee2f3c')
    t.line(15, 4 + dy, 18, 1 + dy, '#ffffff')
    t.put(15, 4 + dy, '#8a8e9c')


def item_figurinha(t, pose, i, cfg, me, md, dy):
    # o álbum azul debaixo do braço esquerdo e uma cartela de figurinhas coloridas na mão direita; na ação cola uma
    bx, by = me
    t.rect(bx - 5, by - 1, bx - 1, by + 6, '#3a6cf0')
    t.rect(bx - 5, by - 1, bx - 5, by + 6, '#2a4cb0')
    t.rect(bx - 4, by + 1, bx - 2, by + 3, '#fffaf0')
    x, y = md
    cores = ['#ee2f3c', '#ffd21e', '#35a03a', '#ff8ac0']
    if pose == 'acao':
        for k in range(4):
            t.rect(x - 1 + (k % 2) * 3, y - 10 - i - (k // 2) * 3, x + 1 + (k % 2) * 3, y - 8 - i - (k // 2) * 3, cores[k])
        brilho(t, x + 7, y - 12 - i * 2, '#ffffff')
    else:
        for k in range(4):
            t.rect(x - 1 + (k % 2) * 3, y - 6 - (k // 2) * 3, x + 1 + (k % 2) * 3, y - 4 - (k // 2) * 3, cores[k])


def item_marcador(t, pose, i, cfg, me, md, dy):
    # o megafone (cone) na mão direita; na ação grita "ANARRIÊ" com ondas de som
    x, y = md
    if pose == 'acao':
        topo = (x + 3, y - 10 - i)
        t.rect(topo[0] - 1, topo[1], topo[0] + 3, topo[1] + 3, '#ee2f3c')
        t.rect(topo[0] + 3, topo[1] - 1, topo[0] + 6, topo[1] + 4, '#ffd21e')
        t.rect(topo[0] - 3, topo[1] + 4, topo[0], topo[1] + 5, '#8a5a2a')
        for k in range(2):
            t.put(topo[0] + 8 + k * 2, topo[1] + 1, '#fff4e4')
            t.put(topo[0] + 8 + k * 2, topo[1] + 3, '#fff4e4')
    else:
        t.rect(x - 1, y - 6, x + 3, y - 4, '#ee2f3c')
        t.rect(x + 3, y - 7, x + 5, y - 3, '#ffd21e')
        t.line(x - 1, y - 3, x - 2, y - 1, '#8a5a2a')


ELENCO2 = {
    'dona-concha': dict(pele='escura', cabelo='coque', cabelo_cor='#1a1218', camisa='#fffaf0', roupa='avental', listra='#ee4a4a', calca='#5a4a6a',
                        chapeu='lenco', chapeu_cor='#ee4a4a', item=item_concha, acao_dir='alto'),
    'seu-figurino': dict(pele='media', cabelo='lateral', cabelo_cor='#b8b8c0', camisa='#fff4e4', roupa='colete', listra='#6a3a8a', calca='#3a3a48',
                         oculos='#2a2a3a', bigode='#8a8a92', item=item_figurino, acao_dir='alto'),
    'madrinha-flor': dict(pele='clara', cabelo='longo', cabelo_cor='#8a4a2a', camisa='#e87ab0', roupa='vestido', listra='#ffe0f0', calca='#e87ab0',
                          chapeu='aba', chapeu_cor='#f8c8d8', item=item_madrinha, acao_dir='alto', fala=True),
    'dona-pose': dict(pele='morena', cabelo='cacho', cabelo_cor='#2a1a18', camisa='#3a9a8a', roupa='vestido', listra='#fffaf0', calca='#3a9a8a',
                      chapeu='aba', chapeu_cor='#f8e8c8', item=item_pose, acao_dir='alto', fala=True),
    'seu-seguranca': dict(pele='escura', cabelo='careca', cabelo_cor='#0a0a0e', camisa='#2a2a38', roupa='liso', calca='#2a2a38', oculos='#0a0a0e',
                          item=item_seguranca, acao_dir='estendido', boca='reta'),
    'dona-cartinha': dict(pele='clara', cabelo='tranca', cabelo_cor='#4a2a18', camisa='#c8402a', roupa='vestido', listra='#fffaf0', calca='#c8402a',
                          chapeu=None, item=item_cartinha, acao_dir='alto', fala=True),
    'seu-figurinha': dict(pele='media', cabelo='rebelde', cabelo_cor='#3a2a1a', camisa='#3ac85a', roupa='xadrez', listra='#1a8a3a', calca='#4a5aa8',
                          chapeu='bone', chapeu_cor='#e8442a', item=item_figurinha, acao_dir='alto'),
    'marcador-anarrie': dict(pele='media', cabelo='curto', cabelo_cor='#4a3022', camisa='#ee4a4a', roupa='xadrez', listra='#fffaf0', calca='#3a5aa8',
                             chapeu='cowboy', chapeu_cor='#8a5a2a', bigode='#4a3022', item=item_marcador, acao_dir='alto', fala=True),
}
