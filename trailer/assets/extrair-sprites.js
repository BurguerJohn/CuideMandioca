// Tira do pacote de arte do jogo (src/festa-sprites.js) os sprites que os vídeos usam, em PNG no tamanho original
// (os vídeos ampliam com image-rendering: pixelated), e copia a fonte do jogo. Gera sprites/sprites.json com medidas.
// Uso: node trailer/assets/extrair-sprites.js
const fs = require('node:fs');
const path = require('node:path');

const JOGO = path.resolve(__dirname, '..', '..');
require(path.join(JOGO, 'src', 'festa-sprites.js'));
const bundle = globalThis.FESTA_SPRITES;
const SAIDA = path.join(__dirname, 'sprites');
fs.mkdirSync(SAIDA, { recursive: true });

const png = (arquivo, dataUrl) => fs.writeFileSync(path.join(SAIDA, arquivo), Buffer.from(dataUrl.split(',')[1], 'base64'));
const manifesto = {};

// Folhas animadas (tira horizontal): a Mandioca de xadrez vermelho e a turma.
const folha = (nome, meta, extra = {}) => {
  png(`${nome}.png`, bundle.images[meta.image]);
  manifesto[nome] = { w: meta.w, h: meta.h, frames: meta.frames, fps: meta.fps || 0, ...extra };
};
folha('mandioca', bundle.mandioca['xadrez-vermelho'], { tags: bundle.mandioca.meta.tags });
for (const id of ['milho', 'cenoura', 'inhame', 'batata', 'pamonha', 'faisca', 'pacoca', 'aipim', 'cachorro']) {
  folha(`turma-${id}`, bundle.chars[id]);
}
folha('chapeu-palha', bundle.hats['chapeu-palha']);

// Ícones parados: retratos de corpo inteiro da turma e ícones da interface.
for (const [chave, icone] of Object.entries(bundle.icons)) {
  if (!chave.startsWith('char:') && !['ui:animacao', 'ui:fichas', 'ui:lotacao', 'ui:argolas', 'ui:presente'].includes(chave)) continue;
  const nome = chave.replace(':', '-');
  png(`${nome}.png`, icone.src);
  manifesto[nome] = { w: icone.w, h: icone.h, frames: 1, fps: 0 };
}
fs.writeFileSync(path.join(SAIDA, 'sprites.json'), JSON.stringify(manifesto, null, 2));

fs.mkdirSync(path.join(__dirname, 'fontes'), { recursive: true });
fs.copyFileSync(path.join(JOGO, 'src', 'fonts', 'Fredoka.ttf'), path.join(__dirname, 'fontes', 'Fredoka.ttf'));
fs.copyFileSync(path.join(JOGO, 'src', 'fonts', 'OFL.txt'), path.join(__dirname, 'fontes', 'OFL-Fredoka.txt'));
console.log(`${Object.keys(manifesto).length} sprites em ${path.relative(JOGO, SAIDA)}`);
