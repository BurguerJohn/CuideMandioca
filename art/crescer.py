"""Reduz pixel art por fatores fracionários para os tamanhos da Mandioca que cresce (chapéus e itens de mão; o corpo
dela nos tamanhos menores é desenhado no próprio tamanho, em art/tamanhos.py).

Cada pixel novo pega a cor que mais cobre a sua área (a moda ponderada, então a paleta continua a mesma) e o
contorno escuro ganha com pouca cobertura, para a silhueta não sumir. Nada de misturar cores: isso deixaria tudo
borrado. O contorno é o preto do jogo (`INK`).
"""

from PIL import Image

from render import hex_rgb

INK = hex_rgb('#120906')


def reduzir(image, s, outline_bias=0.34):
    """Devolve a imagem reduzida por `s` (0 < s <= 1). O quadro novo tem round(largura * s) por round(altura * s)."""
    if s >= 1:
        return image.copy()
    w, h = image.size
    nw, nh = max(1, round(w * s)), max(1, round(h * s))
    px = image.load()
    out = Image.new('RGBA', (nw, nh), (0, 0, 0, 0))
    put = out.load()
    for y in range(nh):
        y0, y1 = y / s, (y + 1) / s
        rows = [(sy, min(sy + 1, y1) - max(sy, y0)) for sy in range(int(y0), min(h, int(-(-y1 // 1))))]
        for x in range(nw):
            x0, x1 = x / s, (x + 1) / s
            cols = [(sx, min(sx + 1, x1) - max(sx, x0)) for sx in range(int(x0), min(w, int(-(-x1 // 1))))]
            votes = {}
            total = solid = 0.0
            for sy, wy in rows:
                for sx, wx in cols:
                    weight = wx * wy
                    total += weight
                    r, g, b, a = px[sx, sy]
                    if a < 128:
                        continue
                    solid += weight
                    key = (r, g, b)
                    votes[key] = votes.get(key, 0.0) + weight
            if not total or solid / total < 0.5:
                continue
            if votes.get(INK, 0.0) / total >= outline_bias:
                put[x, y] = INK + (255,)
            else:
                best = max((c for c in votes if c != INK), key=votes.get, default=INK)
                put[x, y] = best + (255,)
    return out
