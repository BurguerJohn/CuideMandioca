// Renderiza todos os vídeos nos três idiomas para trailer/renders/<idioma>/<nome>.mp4 (só efeitos, sem trilha: o som
// em alta entra pelo TikTok).
// Uso: node trailer/videos/renderizar.js [nome ...] [--forcar]   (rode antes o traduzir.js)
// Sem --forcar, o que já existe em renders/ não é refeito.
const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { GRAVACOES, SO_PT } = require('./copiar-assets.js');

const RENDERS = path.resolve(__dirname, '..', 'renders');
const pedidos = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const forcar = process.argv.includes('--forcar');
const videos = pedidos.length ? pedidos : Object.keys(GRAVACOES);

for (const video of videos) {
  const variantes = [
    [path.join(__dirname, video), 'pt-BR'],
    [path.join(__dirname, 'gerados', `${video}-en`), 'en'],
    [path.join(__dirname, 'gerados', `${video}-es`), 'es']
  ].filter(([, idioma]) => idioma === 'pt-BR' || !SO_PT.includes(video));
  for (const [projeto, idioma] of variantes) {
    const saida = path.join(RENDERS, idioma, `${video}.mp4`);
    if (!forcar && fs.existsSync(saida)) { console.log(`${idioma}/${video}.mp4 (já existe)`); continue; }
    fs.mkdirSync(path.dirname(saida), { recursive: true });
    const inicio = Date.now();
    // Pelo script do projeto: ele fixa a versão do HyperFrames (um `npx hyperframes` solto pode pegar uma versão velha
    // em cache, e a 0.8.81 falhava na extração dos vídeos do trailer da Steam).
    execFileSync('npm', ['run', 'render', '--', '--quiet', '--output', saida], {
      cwd: projeto, stdio: 'inherit', shell: true, env: { ...process.env, HYPERFRAMES_NO_UPDATE_CHECK: '1' }
    });
    console.log(`${idioma}/${video}.mp4 (${Math.round((Date.now() - inicio) / 1000)} s)`);
  }
}
