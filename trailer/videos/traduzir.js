// Gera, a partir dos vídeos em português (videos/<nome>), as versões <nome>-en e <nome>-es em videos/gerados/:
// legendas e nome do jogo de traducoes.js e a gameplay gravada no idioma
// (node_modules/.bin/electron trailer/captura/gravar.js --idioma=en).
// Cada versão é um projeto HyperFrames próprio (um projeto só pode ter uma composição raiz). O português continua
// sendo a fonte: mude o original ou as traduções e rode de novo. Não edite videos/gerados à mão.
// Uso: node trailer/videos/traduzir.js [nome ...]
const fs = require('node:fs');
const path = require('node:path');
const TRADUCOES = require('./traducoes.js');
const { GRAVACOES, SO_PT, copiarAssets } = require('./copiar-assets.js');

const GERADOS = path.join(__dirname, 'gerados');
const IDIOMAS = { en: 1, es: 2 };
// Arquivos do projeto que vão junto (o resto é gerado ou vem de copiar-assets).
const PROJETO = ['hyperframes.json', 'package.json', 'CLAUDE.md', 'AGENTS.md'];
// O que alguns vídeos têm a mais: cenas em sub-composições, a própria música e o plano (copiados como estão; o HTML
// das cenas passa pela tradução junto com o index.html).
const EXTRAS = {
  steam: ['compositions', 'frame.md', 'BRIEF.md', 'STORYBOARD.md']
};

// Todo HTML da composição: o index.html e as sub-composições (compositions/**/*.html).
function paginas(pasta) {
  const lista = ['index.html'];
  const visitar = relativo => {
    const absoluto = path.join(pasta, relativo);
    if (!fs.existsSync(absoluto)) return;
    for (const item of fs.readdirSync(absoluto, { withFileTypes: true })) {
      const caminho = path.join(relativo, item.name);
      if (item.isDirectory()) visitar(caminho);
      else if (item.name.endsWith('.html')) lista.push(caminho);
    }
  };
  visitar('compositions');
  return lista;
}

// Cada linha de traducoes.js troca o texto em todas as páginas; a linha tem que existir em pelo menos uma.
function traduzir(originais, video, idioma) {
  const saida = { ...originais };
  for (const linha of TRADUCOES[video]) {
    const [original, traducao] = [linha[0], linha[IDIOMAS[idioma]]];
    if (!Object.values(saida).some(html => html.includes(original))) {
      throw new Error(`${video}-${idioma}: não achei "${original}" no vídeo em português`);
    }
    for (const pagina of Object.keys(saida)) saida[pagina] = saida[pagina].split(original).join(traducao);
  }
  return saida;
}

function gerar(video, idioma, nome, traduzidas) {
  const origem = path.join(__dirname, video);
  const projeto = path.join(GERADOS, nome);
  copiarAssets(video, idioma, projeto);
  for (const arquivo of [...PROJETO, ...(EXTRAS[video] || [])]) {
    const de = path.join(origem, arquivo);
    if (!fs.existsSync(de)) continue;
    fs.mkdirSync(path.dirname(path.join(projeto, arquivo)), { recursive: true });
    fs.cpSync(de, path.join(projeto, arquivo), { recursive: true });
  }
  fs.writeFileSync(path.join(projeto, 'meta.json'), `${JSON.stringify({ id: nome, name: nome }, null, 2)}\n`);
  for (const [pagina, html] of Object.entries(traduzidas)) fs.writeFileSync(path.join(projeto, pagina), html);
  console.log(`gerados/${nome}`);
}

const pedidos = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const videos = (pedidos.length ? pedidos : Object.keys(GRAVACOES)).filter(video => !SO_PT.includes(video));
for (const video of videos) {
  // Só os projetos deste vídeo são refeitos: não sobra variante antiga, e os outros vídeos ficam como estão.
  for (const idioma of Object.keys(IDIOMAS)) fs.rmSync(path.join(GERADOS, `${video}-${idioma}`), { recursive: true, force: true });
  const pasta = path.join(__dirname, video);
  // O Studio do HyperFrames marca cada elemento com data-hf-id ao abrir o projeto; a marca não é conteúdo e quebraria a
  // busca exata das traduções (<span data-hf-id="…" class="l1">), então sai antes de traduzir.
  const limpo = html => html.replace(/ data-hf-id="[^"]*"/g, '');
  const originais = Object.fromEntries(paginas(pasta).map(pagina =>
    [pagina, limpo(fs.readFileSync(path.join(pasta, pagina), 'utf8'))]));
  for (const idioma of Object.keys(IDIOMAS)) gerar(video, idioma, `${video}-${idioma}`, traduzir(originais, video, idioma));
}
