// As formas de pixel que os pacotes de eventos do mundo desenham (src/festa-mundo-temas.js e src/festa-mundo-extras.js): retângulos espelháveis, discos,
// elipses e triângulos cheios, tudo com `fillRect` (a janela é transparente e o canvas de teste só sabe retângulos). `shapes(g, poleTop)` devolve as
// formas ligadas ao pincel `g`; `poleTop()` é a altura do alto dos mastros (o céu fica acima dela).
(function (root) {
  'use strict';

  const R = Math.round;

  function shapes(g, poleTop) {
    const rect = (x, y, w, hh, color) => { g.fillStyle = color; g.fillRect(R(x), R(y), w, hh); };
    // Um retângulo em coordenadas de quem olha para a direita (`d` 1) ou para a esquerda (`d` -1), em volta de (x, y).
    const mirror = (x, y, d) => (dx, dy, w, hh, color) => { g.fillStyle = color; g.fillRect(R(d > 0 ? x + dx : x - dx - w + 1), R(y + dy), w, hh); };
    const disc = (cx, cy, r, color) => {
      g.fillStyle = color;
      for (let y = -r; y <= r; y++) {
        const half = R(Math.sqrt(r * r - y * y));
        g.fillRect(R(cx) - half, R(cy) + y, half * 2 + 1, 1);
      }
    };
    const ellipse = (cx, cy, rx, ry, color) => {
      g.fillStyle = color;
      if (ry < 1) { g.fillRect(R(cx) - R(rx), R(cy), R(rx) * 2 + 1, 1); return; }
      for (let y = -ry; y <= ry; y++) {
        const half = R(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
        g.fillRect(R(cx) - half, R(cy) + y, half * 2 + 1, 1);
      }
    };
    // Um triângulo cheio, linha por linha.
    const tri = (ax, ay, bx, by, cx, cy, color) => {
      const [p0, p1, p2] = [[ax, ay], [bx, by], [cx, cy]].sort((a, b) => a[1] - b[1]);
      g.fillStyle = color;
      const edge = (a, b, y) => (b[1] === a[1] ? a[0] : a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]));
      for (let y = R(p0[1]); y <= R(p2[1]); y++) {
        const long = edge(p0, p2, y);
        const short = y < p1[1] ? edge(p0, p1, y) : edge(p1, p2, y);
        const x1 = R(Math.min(long, short));
        const x2 = R(Math.max(long, short));
        g.fillRect(x1, y, x2 - x1 + 1, 1);
      }
    };
    // Um ponto de 1 px (com opacidade).
    const bit = (x, y, color, alpha = 1) => { g.globalAlpha = alpha; g.fillStyle = color; g.fillRect(R(x), R(y), 1, 1); g.globalAlpha = 1; };
    // Onde acaba o céu livre (acima das bandeirinhas).
    const skyBottom = () => Math.max(26, poleTop() - 4);
    // Uma faixa de névoa, cortada nas pontas da festa (a janela é transparente: nada pode sobrar para fora da ilha).
    const fogBand = (x, y, w, hh, color, lay) => {
      const x1 = Math.max(lay.L, x);
      const x2 = Math.min(lay.R, x + w);
      if (x2 > x1) { g.fillStyle = color; g.fillRect(x1, y, x2 - x1, hh); }
    };
    // Para a esquerda ou a direita da Mandioca, sem pisar nela.
    const dodge = (x, lay, gap = 24, push = 30) => {
      const host = lay.host ? lay.host.x + 12 : -999;
      return Math.abs(x - host) < gap ? x + (x < host ? -push : push) : x;
    };
    return { R, rect, mirror, disc, ellipse, tri, bit, skyBottom, fogBand, dodge };
  }

  const api = { shapes };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ArraiaMundoFormas = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
