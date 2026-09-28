"""Prepara a festa para a arte da Steam: reduz as fotos do jogo (feitas em escala inteira) para 1 pixel por pixel da
arte, e na versão "limpa" apaga também as letras da placa do palco (FORRÓ vem pintado no sprite). As imagens que a
Steam exige sem texto nenhum (hero da biblioteca, fundo da página) usam essa versão.

Uso (da pasta do jogo), depois de trailer/captura/fotografar.js:  py -3.12 steam/loja/preparar_arte.py
"""
import json
import pathlib
from collections import Counter

from PIL import Image

FOTOS = pathlib.Path(__file__).resolve().parent / 'fotos'
# Miolo da placa do palco na festa do fim de jogo (save estagio-5), em pixels da arte.
PLACA_PALCO = (194, 84, 223, 93)


def reduzir(png):
    meta = json.loads(png.with_suffix('.json').read_text())
    k = meta['w'] // meta['logico']
    im = Image.open(png)
    return im.resize((im.width // k, im.height // k), Image.NEAREST).convert('RGBA')


def apagar_placa(im):
    x0, y0, x1, y1 = PLACA_PALCO
    px = im.load()
    cores = Counter(px[x, y] for y in range(y0, y1) for x in range(x0, x1))
    fundo = cores.most_common(1)[0][0]
    for y in range(y0, y1):
        for x in range(x0, x1):
            if px[x, y] != fundo and sum(px[x, y][:3]) < 300:
                px[x, y] = fundo


for pasta in sorted(p for p in FOTOS.iterdir() if p.is_dir()):
    for png in sorted(pasta.glob('festa-*.png')):
        if png.stem.endswith('-1x'):
            continue
        im = reduzir(png)
        if png.stem == 'festa-limpa':
            apagar_placa(im)
        im.save(png.with_name(f'{png.stem}-1x.png'))
        print(f'{pasta.name}/{png.stem}-1x.png {im.size}')
