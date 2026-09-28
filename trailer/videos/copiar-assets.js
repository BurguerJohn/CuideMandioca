// Copia os assets compartilhados (trailer/assets) para dentro de cada projeto de vídeo: o HyperFrames só enxerga
// arquivos da pasta do projeto. Cada vídeo leva a fonte, os sprites, o áudio e só as gravações que usa.
// As versões geradas por traduzir.js (videos/gerados/...) levam a gameplay gravada no idioma delas
// (assets/gameplay-<idioma>).
// Uso: node trailer/videos/copiar-assets.js   (o traduzir.js chama para os projetos traduzidos)
const fs = require('node:fs');
const path = require('node:path');

const TRAILER = path.resolve(__dirname, '..');
const ASSETS = path.join(TRAILER, 'assets');
// Música própria de um vídeo (fica na pasta do jogo, fora dos assets compartilhados): vai para assets/audio do projeto.
const MUSICAS = { steam: [path.join(TRAILER, '..', 'Balanço de Pixel.mp3'), 'balanco-de-pixel.mp3'] };
const GRAVACOES = {
  evolucao: ['estagio-1', 'estagio-2', 'estagio-3', 'estagio-4', 'estagio-5'],
  mesa: ['mesa'],
  argolas: ['argolas'],
  presentes: ['presentes'],
  turma: ['palco'],
  // Trailer da Steam (16:9, gravado em 4K): uma gravação por cena, mais o palco do fim da cena 4.
  steam: ['steam-quintal', 'steam-melhorias', 'steam-quermesse', 'steam-cidade', 'steam-palco', 'steam-regional',
    'steam-maior', 'steam-final']
};

const copiarPasta = (origem, destino) => {
  fs.mkdirSync(destino, { recursive: true });
  for (const nome of fs.readdirSync(origem)) {
    if (nome.endsWith('.js')) continue;
    fs.copyFileSync(path.join(origem, nome), path.join(destino, nome));
  }
};

function copiarAssets(video, idioma = 'pt-BR', projeto = path.join(__dirname, video)) {
  const destino = path.join(projeto, 'assets');
  const gravacoes = path.join(ASSETS, idioma === 'pt-BR' ? 'gameplay' : `gameplay-${idioma}`);
  copiarPasta(path.join(ASSETS, 'fontes'), path.join(destino, 'fontes'));
  copiarPasta(path.join(ASSETS, 'sprites'), path.join(destino, 'sprites'));
  copiarPasta(path.join(ASSETS, 'audio'), path.join(destino, 'audio'));
  fs.mkdirSync(path.join(destino, 'gameplay'), { recursive: true });
  for (const clipe of GRAVACOES[video]) {
    fs.copyFileSync(path.join(gravacoes, `${clipe}.mp4`), path.join(destino, 'gameplay', `${clipe}.mp4`));
  }
  if (MUSICAS[video]) fs.copyFileSync(MUSICAS[video][0], path.join(destino, 'audio', MUSICAS[video][1]));
  fs.copyFileSync(path.join(TRAILER, 'design.md'), path.join(projeto, 'design.md'));
  return projeto;
}

if (require.main === module) {
  for (const video of Object.keys(GRAVACOES)) {
    copiarAssets(video);
    console.log(`${video}: ${GRAVACOES[video].join(', ')}`);
  }
}

module.exports = { GRAVACOES, copiarAssets };
