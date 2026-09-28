// Preload do gravador: roda antes do jogo, no mesmo mundo da página (contextIsolation desligado).
// Troca o relógio por um relógio virtual (o gravador avança 1/30 s por quadro), finge a ponte do desktop
// com o save e os ajustes da cena, desliga o botão de teste e expõe atalhos para roteirizar a gameplay.
const fs = require('node:fs');

const arg = process.argv.find(value => value.startsWith('--cena='));
const cena = JSON.parse(fs.readFileSync(arg.slice('--cena='.length), 'utf8'));

// --- Relógio virtual -------------------------------------------------------------------------------
const base = Date.parse(cena.data || '2026-06-24T21:00:00-03:00');
let now = 0;
let seq = 0;
const timers = new Map();
let frames = [];
window.performance.now = () => now;
Date.now = () => base + now;
window.setTimeout = (fn, ms = 0, ...args) => {
  const id = ++seq;
  timers.set(id, { at: now + Math.max(0, Number(ms) || 0), fn, args });
  return id;
};
window.setInterval = (fn, ms = 0, ...args) => {
  const id = ++seq;
  const every = Math.max(1, Number(ms) || 0);
  timers.set(id, { at: now + every, fn, args, every });
  return id;
};
window.clearTimeout = window.clearInterval = id => timers.delete(id);
window.requestAnimationFrame = fn => { const id = ++seq; frames.push({ id, fn }); return id; };
window.cancelAnimationFrame = id => { frames = frames.filter(frame => frame.id !== id); };

const started = new WeakMap();
// Avança o relógio: dispara os timers vencidos em ordem, depois um quadro de animação, e alinha as animações CSS.
window.__passo = ms => {
  const target = now + ms;
  for (;;) {
    let next = null;
    for (const [id, timer] of timers) if (timer.at <= target && (!next || timer.at < next[1].at)) next = [id, timer];
    if (!next) break;
    const [id, timer] = next;
    now = timer.at;
    if (timer.every) timer.at += timer.every; else timers.delete(id);
    try { if (typeof timer.fn === 'function') timer.fn(...timer.args); } catch (error) { console.error(error); }
  }
  now = target;
  const due = frames;
  frames = [];
  for (const frame of due) { try { frame.fn(now); } catch (error) { console.error(error); } }
  for (const animation of document.getAnimations()) {
    if (!started.has(animation)) started.set(animation, now);
    animation.pause();
    animation.currentTime = now - started.get(animation);
  }
  return now;
};
window.__agora = () => now;

// --- Jogo sem botão de teste ------------------------------------------------------------------------
let gameData;
Object.defineProperty(window, 'GAME_DATA', {
  configurable: true,
  get: () => gameData,
  set: value => { if (value?.config) value.config.debugMenu = false; gameData = value; }
});

// --- Ponte do desktop falsa: save e ajustes vêm da cena ------------------------------------------------
// Sem os efeitos do jogo na gravação: o som dos vídeos é montado no HyperFrames.
const settings = { pinned: true, zoom: 1, x: 0.5, lift: 0, hud: 'sempre', hidden: false, placa: null, sound: false, ...cena.ajustes };
window.arraiaDesktop = {
  // O idioma vem da gravação (--idioma), nunca do computador ou da Steam.
  language: { choice: cena.idioma || 'pt-BR', id: cena.idioma || 'pt-BR', auto: cena.idioma || 'pt-BR' },
  steam: { on: false, name: null },
  setLanguage() {},
  loadGame: () => cena.save,
  saveGame: () => true,
  getSettings: () => Promise.resolve(settings),
  updateSettings: partial => Promise.resolve(Object.assign(settings, partial)),
  setInteractive() {}, setFocusable() {}, focusGame() {}, quit() {},
  onCommand: callback => { window.__comando = callback; }
};

// --- Acesso ao jogo e atalhos de roteiro -----------------------------------------------------------------
window.__gravador = api => { window.__jogo = api; };
window.__acao = {
  clicar: selector => document.querySelector(selector)?.click(),
  // Dispara uma ação do jogo (data-action) como se fosse um botão, sem mostrar botão nenhum.
  acao: (action, dataset = {}) => {
    const button = document.createElement('button');
    Object.assign(button.dataset, { action, ...dataset });
    button.hidden = true;
    document.body.appendChild(button);
    button.click();
    button.remove();
  },
  evento: (type, detail = {}) => window.__jogo.engine().emit(type, detail),
  passarMouse: selector => document.querySelector(selector)
    ?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
};

// Fundo da cena: CSS e HTML extras que ficam atrás da festa (céu, área de trabalho falsa...).
window.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = cena.css || '';
  document.head.appendChild(style);
  if (cena.html) document.body.insertAdjacentHTML('afterbegin', cena.html);
});
