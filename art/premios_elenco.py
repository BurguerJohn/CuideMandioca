"""O elenco dos prêmios dos minigames: a descrição (`cfg`) de cada personagem para o gerador de `premios_pessoas.py`, com o que carrega na mão
e a ação que faz quando alguém clica nele. Cada um é de um minigame.
"""

from premios_pessoas import luz, sombra

# --- Coisinhas desenhadas na mão ---------------------------------------------------------------------------------------------------


def anel(t, cx, cy, cor):
    t.rect(cx - 1, cy - 1, cx + 1, cy - 1, cor)
    t.rect(cx - 1, cy + 1, cx + 1, cy + 1, sombra(cor))
    t.put(cx - 2, cy, cor)
    t.put(cx + 2, cy, sombra(cor))


def nota(t, x, y, cor='#fff4e4'):
    t.put(x + 1, y, cor)
    t.put(x + 1, y + 1, cor)
    t.put(x + 1, y + 2, cor)
    t.put(x, y + 3, cor)
    t.put(x, y + 2, cor)


def brilho(t, x, y, cor='#fff07a'):
    t.put(x, y, cor)
    t.put(x - 1, y, cor)
    t.put(x + 1, y, cor)
    t.put(x, y - 1, cor)
    t.put(x, y + 1, cor)


# --- Um item por personagem: item(t, pose, i, cfg, mao_esq, mao_dir, dy) ------------------------------------------------------------
def item_zeca(t, pose, i, cfg, me, md, dy):
    x, y = md
    cores = ['#ee2f3c', '#ffd21e', '#3a6cf0']
    if pose == 'acao':
        anel(t, 9, -2 - i * 3, '#ee2f3c')
        for k in range(2):
            anel(t, x, y + 5 + k * 2, cores[1 + k])
        brilho(t, 13, -3 - i * 2, '#ffffff')
    else:
        for k in range(3):
            anel(t, x + 1, y - 1 - k * 2, cores[k])


def item_tainha(t, pose, i, cfg, me, md, dy):
    x, y = md
    if pose == 'acao':
        topo = (x + 6, y - 7 - i * 2)
        t.line(x, y, topo[0], topo[1], '#8a5a2a')
        t.line(topo[0], topo[1], topo[0], topo[1] + 12 + i * 3, '#e8e8f0')
        t.rect(topo[0] - 1, topo[1] + 12 + i * 3, topo[0] + 1, topo[1] + 14 + i * 3, '#ee2f3c')
    else:
        t.line(x, y, x + 6, y - 9, '#8a5a2a')
        t.line(x + 6, y - 9, x + 6, y - 2, '#e8e8f0')
        t.rect(x + 5, y - 2, x + 7, y, '#ee2f3c')
    bx, by = me
    t.rect(bx - 3, by, bx, by + 4, '#aeb4c0')
    t.rect(bx - 3, by, bx, by, '#d8dce8')
    t.rect(bx - 3, by + 4, bx, by + 4, '#7a808c')
    t.rect(bx - 2, by - 1, bx - 1, by - 1, '#7a808c')
    if pose == 'parado' or pose == 'anda':
        t.put(bx - 2, by + 1, '#ff8a3a')
        t.put(bx - 1, by + 2, '#ff8a3a')


def item_bola(t, pose, i, cfg, me, md, dy):
    x, y = md
    if pose == 'acao':
        cy = y - 1
        t.rect(x - 1, cy - 3, x + 4, cy + 4, '#fffaf0')
        t.rect(x - 1, cy - 3, x + 4, cy - 3, '#ee2f3c')
        for k in range(6):
            t.put(x + (k % 3) * 2 - 1 + 1, cy - 1 + (k // 3) * 3, '#3a2418')
        t.put(x + 5, cy - 4, '#ffe27a')
        if i:
            brilho(t, x + 7, cy - 6)
    else:
        t.rect(x, y - 3, x + 4, y + 2, '#fffaf0')
        t.rect(x, y - 3, x + 4, y - 3, '#ee2f3c')
        for k in range(4):
            t.put(x + 1 + (k % 2) * 2, y - 1 + (k // 2) * 2, '#3a2418')


def item_palhaco(t, pose, i, cfg, me, md, dy):
    x, y = md
    topo = y - 11 - (2 if pose == 'acao' and i else 0)
    t.rect(x, topo + 4, x, y, '#fffaf0')
    t.rect(x - 3, topo, x + 3, topo + 4, '#ee2f3c')
    t.rect(x - 2, topo - 1, x + 2, topo - 1, '#ee2f3c')
    t.rect(x - 2, topo + 5, x + 2, topo + 5, '#ee2f3c')
    for k, (dx, dy2) in enumerate(((-2, 0), (0, 1), (2, 2), (-1, 3), (1, -1))):
        t.put(x + dx, topo + dy2 + 1, '#fffaf0')
    t.put(x - 2, topo, '#ffb0c8')


def item_juiz(t, pose, i, cfg, me, md, dy):
    x, y = md
    # a bandeirinha vermelha
    topo = y - 10
    t.rect(x, topo, x, y, '#8a5a2a')
    bando = 1 if (pose == 'acao' and i) else 0
    t.rect(x + 1, topo, x + 5, topo + 3 + bando, '#ee2f3c')
    t.rect(x + 1, topo + 1, x + 3, topo + 2, '#ffd21e')
    # o apito na boca
    t.rect(9, 10 + dy, 10, 10 + dy, '#d8dce8')
    t.put(11, 10 + dy, '#aeb4c0')
    if pose == 'acao':
        t.put(12, 9 + dy, '#fff4e4')
        t.put(13, 8 + dy, '#fff4e4')


def item_vendado(t, pose, i, cfg, me, md, dy):
    x, y = md
    if pose == 'acao':
        t.line(x - 1, y + 4, x + 5, y + 6 - i * 4, '#8a5a2a')
        t.line(x - 2, y + 4, x - 8, y - 2 + i * 3, '#8a5a2a')
    else:
        t.line(x, y, x + 5, y - 7, '#8a5a2a')
        t.rect(x - 1, y, x + 1, y + 1, '#6e3c1c')


def item_lance(t, pose, i, cfg, me, md, dy):
    x, y = md
    cy = y - 5 if pose != 'acao' else y - 1
    t.rect(x, cy + 3, x, cy + 8, '#8a5a2a')
    t.rect(x - 3, cy - 3, x + 3, cy + 3, '#fffaf0')
    t.rect(x - 3, cy - 3, x + 3, cy - 3, '#ee2f3c')
    t.rect(x - 1, cy - 1, x + 1, cy + 1, '#3a2418')
    t.put(x, cy, '#fffaf0')
    if pose == 'acao' and i:
        brilho(t, x + 5, cy - 4)


def item_faquir(t, pose, i, cfg, me, md, dy):
    # a flauta (pungi) na boca, apoiada nas duas mãos
    t.line(10, 11 + dy, 15, 16 + dy, '#c8944a')
    t.rect(9, 10 + dy, 11, 11 + dy, '#e8b868')
    t.rect(15, 16 + dy, 16, 17 + dy, '#ffd21e')
    if pose == 'acao':
        nota(t, 14 + i * 2, 4 - i * 3, '#ffe27a')
        nota(t, 18 - i * 2, 1 + i * 2, '#fff4e4')


def item_poeta(t, pose, i, cfg, me, md, dy):
    x, y = me
    # o folheto de cordel na mão esquerda
    t.rect(x - 2, y - 4, x + 3, y + 2, '#fffaf0')
    t.rect(x - 2, y - 4, x + 3, y - 4, '#ee2f3c')
    for k in range(3):
        t.rect(x - 1, y - 2 + k * 2, x + 2, y - 2 + k * 2, '#8a8a98')
    if pose == 'acao':
        nota(t, 15 + i, 6, '#ffe27a')


def item_sinha(t, pose, i, cfg, me, md, dy):
    x, y = me
    # a cesta de milho no braço esquerdo
    t.rect(x - 4, y - 1, x + 1, y + 4, '#c8944a')
    t.rect(x - 4, y - 1, x + 1, y - 1, '#e8b868')
    t.rect(x - 4, y + 2, x + 1, y + 2, '#a8743a')
    for k, cor in enumerate(('#ffd21e', '#ffe27a', '#ffd21e', '#ffe27a')):
        t.put(x - 3 + k, y - 2, cor)
    if pose == 'acao':
        for k in range(5):
            t.put(14 + k * 2 + i, 3 + (k % 2) * 3 + i * 3, '#ffd21e')


def item_menina(t, pose, i, cfg, me, md, dy):
    if pose == 'acao':
        cx, cy = 9, -3
        for k in range(3):
            t.put(cx - 3 + k * 3, cy - 5 - i, '#d8f4ff')
    else:
        cx, cy = 9, 17 + dy
    for y in range(-3, 4):
        for x in range(-4, 5):
            if x * x / 18.0 + y * y / 10.0 <= 1.0:
                borda = x * x / 18.0 + y * y / 10.0 > 0.62
                t.put(cx + x, cy + y, '#bfe8f8' if borda else '#d8f4ff')
    t.rect(cx - 1, cy, cx + 1, cy + 1, '#ff8a3a')
    t.put(cx + 2, cy, '#ff8a3a')
    t.put(cx - 2, cy + 1, '#ffb070')
    t.put(cx - 2, cy - 2, '#ffffff')
    t.rect(cx - 4, cy + 3, cx + 4, cy + 3, '#8ad0e8')


def item_tomate(t, pose, i, cfg, me, md, dy):
    x, y = md
    if pose == 'acao':
        cx, cy = x + 3, y + 2
        t.rect(cx - 3, cy - 2, cx + 1, cy + 2, '#aeb4c0')
        t.rect(cx + 1, cy, cx + 5, cy - 1, '#aeb4c0')
        t.rect(cx + 5, cy - 2, cx + 5, cy, '#d8dce8')
        for k in range(3):
            t.put(cx + 6 + k, cy + 1 + (k + i * 2) % 4, '#8ed6ff')
            t.put(cx + 6 + k, cy + 3 + (k + i) % 3, '#d8f4ff')
    else:
        t.rect(x - 1, y - 1, x + 3, y + 3, '#aeb4c0')
        t.rect(x + 3, y, x + 5, y - 1, '#aeb4c0')
        t.rect(x - 1, y - 1, x - 1, y + 3, '#d8dce8')
        t.rect(x, y - 3, x + 2, y - 2, '#7a808c')


def item_chico(t, pose, i, cfg, me, md, dy):
    x, y = md
    if pose == 'acao':
        t.line(x, y, x + 5, y - 12 - i * 3, '#c8ccd8')
        for k, cor in enumerate(('#c8402a', '#e8a050', '#c8402a')):
            t.rect(x + 2 + k, y - 5 - k * 3 - i * 2, x + 4 + k, y - 3 - k * 3 - i * 2, cor)
        if i:
            brilho(t, x + 8, y - 15, '#ffd21e')
    else:
        t.line(x, y, x + 5, y - 7, '#c8ccd8')
        for k, cor in enumerate(('#c8402a', '#e8a050', '#c8402a')):
            t.rect(x + 1 + k, y - 2 - k * 2, x + 3 + k, y - k * 2, cor)


def frente_zabumba(t, pose, i, cfg, dy):
    t.rect(4, 15 + dy, 13, 21 + dy, '#a8442a')
    t.rect(4, 15 + dy, 13, 16 + dy, '#f4e4c0')
    t.rect(4, 20 + dy, 13, 21 + dy, '#f4e4c0')
    for x in range(5, 13, 2):
        t.line(x, 17 + dy, x + 1, 19 + dy, '#6e2a1a')
    t.rect(4, 15 + dy, 4, 21 + dy, '#d86a4a')
    t.rect(13, 15 + dy, 13, 21 + dy, '#6e2a1a')
    # a baqueta
    if pose == 'acao':
        cy = 9 if i else 13
        t.line(14, cy + 5, 17, cy - 3, '#e8b868')
        t.put(17, cy - 3, '#fffaf0')
    else:
        t.line(14, 17 + dy, 17, 14 + dy, '#e8b868')


def item_zabumba(t, pose, i, cfg, me, md, dy):
    pass


def item_mateiro(t, pose, i, cfg, me, md, dy):
    x, y = me
    # a lanterna na mão esquerda
    top = y - (0 if pose != 'acao' else 1)
    t.rect(x - 1, top - 1, x + 1, top - 1, '#6a6a76')
    t.rect(x - 2, top, x + 2, top + 4, '#ffe27a')
    t.rect(x - 2, top, x + 2, top, '#8a8a98')
    t.rect(x - 2, top + 4, x + 2, top + 4, '#6a6a76')
    t.rect(x - 1, top + 1, x + 1, top + 3, '#fff6c4')
    if pose == 'acao' and i:
        brilho(t, x, top + 2, '#fff6c4')
    # o facão na direita
    xd, yd = md
    t.line(xd, yd, xd + 4, yd - 8, '#c8ccd8')
    t.rect(xd, yd - 1, xd + 1, yd + 1, '#6e3c1c')


def item_estrelinha(t, pose, i, cfg, me, md, dy):
    x, y = md
    if pose == 'acao':
        t.line(10, 8 + dy, 19, -3, '#5a78d8')
        t.line(11, 9 + dy, 20, -2, '#3a54a8')
        t.rect(19, -4, 21, -2, '#ffd21e')
        brilho(t, 22 - i, -6 + i, '#ffffff')
    else:
        t.line(x - 1, y + 1, x + 6, y - 9, '#5a78d8')
        t.line(x, y + 1, x + 7, y - 9, '#3a54a8')
        t.rect(x + 6, y - 11, x + 8, y - 9, '#ffd21e')


def item_carteiro(t, pose, i, cfg, me, md, dy):
    x, y = md
    # a carta
    if pose == 'acao':
        cy = y - 4 - i
        t.rect(x - 1, cy - 2, x + 4, cy + 2, '#fffaf0')
        t.line(x - 1, cy - 2, x + 1, cy, '#c8a868')
        t.line(x + 4, cy - 2, x + 2, cy, '#c8a868')
        t.put(x + 4, cy - 3, '#ee2f3c')
    else:
        t.rect(x - 1, y - 2, x + 3, y + 1, '#fffaf0')
        t.put(x + 1, y - 1, '#ee2f3c')


def atras_carteiro(t, pose, i, cfg):
    pass


def frente_carteiro(t, pose, i, cfg, dy):
    # a correia da bolsa em diagonal e a bolsa no quadril
    t.line(5, 12 + dy, 12, 19 + dy, '#6e3c1c')
    t.line(6, 12 + dy, 12, 18 + dy, '#8a5a2a')
    t.rect(10, 17 + dy, 15, 22 + dy, '#8a5a2a')
    t.rect(10, 17 + dy, 15, 18 + dy, '#a8743a')
    t.rect(10, 22 + dy, 15, 22 + dy, '#5a3418')
    t.put(12, 19 + dy, '#ffd21e')


def item_vovo(t, pose, i, cfg, me, md, dy):
    x, y = me
    # o livro de histórias aberto
    t.rect(x - 4, y - 2, x + 1, y + 3, '#a8442a')
    t.rect(x - 3, y - 2, x, y + 2, '#fff4e4')
    t.rect(x - 2, y - 2, x - 2, y + 2, '#c8a868')
    t.put(x - 3, y, '#8a8a98')
    t.put(x, y, '#8a8a98')
    if pose == 'acao':
        brilho(t, x - 2 + i * 4, y - 6 - i, '#ffe27a')
        brilho(t, x + 4 - i * 3, y - 9, '#fff4e4')
        brilho(t, 15, 2 + i * 2, '#ffd21e')


# --- Os personagens ---------------------------------------------------------------------------------------------------------------
ELENCO = {
    'zeca-argolas': dict(pele='media', cabelo='cacho', cabelo_cor='#4a2a18', camisa='#ee4a4a', roupa='listras', listra='#fff4e4', calca='#3a5aa8',
                         chapeu=None, item=item_zeca, acao_dir='alto', fala=True),
    'seu-tainha': dict(pele='morena', cabelo='lateral', cabelo_cor='#e8e8e8', camisa='#4a78d8', roupa='xadrez', listra='#2e4ea0', calca='#8a6a3a',
                       chapeu='palha', chapeu_cor='#e8c44a', bigode='#e8e8e8', item=item_tainha, acao_dir='alto'),
    'dona-bola': dict(pele='clara', cabelo='coque', cabelo_cor='#eeeeee', camisa='#e87ab0', roupa='vestido', listra='#ffe0f0', calca='#e87ab0',
                      oculos='#2e2e3a', item=item_bola, acao_dir='estendido', fala=True),
    'palhaco-pirulito': dict(pele='branca', cabelo='afro', cabelo_cor='#3a9ae8', camisa='#ffd21e', roupa='colorido', calca='#ee2f3c', sapato='#3a6cf0',
                             chapeu='colorido', nariz_palhaco=True, maquiagem='palhaco', bochecha=False, item=item_palhaco, acao_dir='alto', fala=True),
    'juiz-apito': dict(pele='escura', cabelo='curto', cabelo_cor='#1a1a1e', camisa='#f0f0f0', roupa='listras', listra='#26242e', calca='#26242e',
                       chapeu='bone', chapeu_cor='#26242e', item=item_juiz, acao_dir='alto'),
    'menino-vendado': dict(pele='clara', cabelo='rebelde', cabelo_cor='#2a1a14', camisa='#ffd21e', roupa='liso', calca='#c8402a', venda='#fffaf0',
                           item=item_vendado, acao_dir='estendido', boca='o'),
    'dona-lance': dict(pele='morena', cabelo='longo', cabelo_cor='#1a1218', camisa='#3a8ae8', roupa='vestido', listra='#fffaf0', calca='#3a8ae8',
                       item=item_lance, acao_dir='alto', fala=True),
    'faquir': dict(pele='morena', cabelo='curto', cabelo_cor='#1a1218', camisa='#f0e4c8', roupa='tunica', listra='#c850d8', calca='#f0e4c8',
                   chapeu='turbante', chapeu_cor='#9a3ac8', bigode='#1a1218', item=item_faquir, acao_dir='estendido', boca='reta'),
    'ze-poeta': dict(pele='media', cabelo='curto', cabelo_cor='#5a3a22', camisa='#f4ecd8', roupa='colete', listra='#6a4a2a', calca='#5a4228',
                     chapeu='cowboy', chapeu_cor='#a8743a', oculos='#5a3a22', item=item_poeta, acao_dir='estendido', fala=True),
    'sinha-terreiro': dict(pele='escura', cabelo='curto', cabelo_cor='#1a1218', camisa='#58a858', roupa='vestido', listra='#fffaf0', calca='#58a858',
                           chapeu='lenco', chapeu_cor='#ee4a4a', item=item_sinha, acao_dir='alto'),
    'menina-peixe': dict(pele='clara', cabelo='tranca', cabelo_cor='#c8742a', camisa='#2ab8c8', roupa='vestido', listra='#fffaf0', calca='#2ab8c8',
                         item=item_menina, acao_dir='alto'),
    'seu-tomate': dict(pele='media', cabelo='curto', cabelo_cor='#6a4a2a', camisa='#ee4a4a', roupa='macacao', listra='#3e5a9a', calca='#3e5a9a',
                       chapeu='palha', chapeu_cor='#e8d49a', bigode='#6a4a2a', item=item_tomate, acao_dir='estendido', nariz='#d8906a'),
    'chico-assador': dict(pele='escura', cabelo='curto', cabelo_cor='#1a1a1e', camisa='#fffaf0', roupa='avental', listra='#f4f4f4', calca='#3a3a48',
                          chapeu='chef', bigode='#1a1a1e', item=item_chico, acao_dir='alto'),
    'zabumbeiro-mirim': dict(pele='morena', cabelo='curto', cabelo_cor='#1a1218', camisa='#58b858', roupa='liso', calca='#c8a868', chapeu='bone',
                             chapeu_cor='#3a5aa8', item=item_zabumba, frente=frente_zabumba, acao_dir='alto'),
    'mateiro-bento': dict(pele='media', cabelo='curto', cabelo_cor='#4a3a22', camisa='#4a8a48', roupa='liso', calca='#6a4a2a', chapeu='aba',
                          chapeu_cor='#5a7a3a', barba='#6a4a2a', item=item_mateiro, acao_esq='alto', acao_dir='estendido'),
    'seu-estrelinha': dict(pele='clara', cabelo='lateral', cabelo_cor='#f0f0f8', camisa='#3a4aa8', roupa='tunica', listra='#ffd21e', calca='#3a4aa8',
                           chapeu='cone', chapeu_cor='#3a4aa8', barba='#f0f0f8', barba_longa=True, item=item_estrelinha, acao_dir='alto'),
    'ze-carteiro': dict(pele='escura', cabelo='curto', cabelo_cor='#1a1218', camisa='#ffd21e', roupa='liso', calca='#3a5aa8', chapeu='bone',
                        chapeu_cor='#3a5aa8', item=item_carteiro, frente=frente_carteiro, acao_dir='alto', fala=True),
    'vovo-contadora': dict(pele='clara', cabelo='coque', cabelo_cor='#d8d8e0', camisa='#a868c8', roupa='vestido', listra='#ffe27a', calca='#a868c8',
                           oculos='#8a6a3a', item=item_vovo, acao_esq='alto', acao_dir='estendido', fala=True),
}
