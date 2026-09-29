'use strict';

const { LANGUAGES } = require('../src/i18n.js');

// Preferências da janela da festa, sempre normalizadas antes de usar ou salvar.
const DEFAULTS = Object.freeze({ pinned: true, zoom: 1, x: 0.72, lift: 0, hud: 'sempre', hidden: false, placa: null,
  display: null, language: 'auto', sound: true, volume: 0.5, perf: 'suave', flash: true, music: false, startup: false, calm: false });
const PUBLIC = ['pinned', 'zoom', 'x', 'lift', 'hud', 'hidden', 'placa', 'sound', 'volume', 'perf', 'flash', 'music', 'startup', 'calm'];
// Desempenho da festa: quadros por segundo com foco / de fundo (suave 60/30, normal 30/20, economia 20/12).
const PERFS = ['suave', 'normal', 'economia'];
// Idioma: "auto" segue o idioma do jogo na Steam (ou o do sistema); senão, um dos idiomas do jogo.
const language = value => (LANGUAGES.some(entry => entry.id === value) ? value : 'auto');

function bounded(value, low, high, fallback) {
  return Number.isFinite(value) ? Math.min(high, Math.max(low, value)) : fallback;
}

// Posição da placa arrastada pelo jogador, em pixels a partir do pé esquerdo da festa (null = ao lado dela).
function placaOffset(value) {
  if (!value || typeof value !== 'object' || !Number.isFinite(value.dx) || !Number.isFinite(value.dy)) return null;
  return { dx: Math.round(bounded(value.dx, -8000, 8000, 0)), dy: Math.round(bounded(value.dy, -8000, 8000, 0)) };
}

function normalizeSettings(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    pinned: r.pinned !== false,
    zoom: bounded(r.zoom, 0.25, 3, [2, 3, 4].includes(r.scale) ? r.scale / 3 : DEFAULTS.zoom),
    x: bounded(r.x, 0, 1, DEFAULTS.x),
    lift: Math.round(bounded(r.lift, 0, 4000, DEFAULTS.lift)),
    hud: r.hud === 'passar' ? 'passar' : 'sempre',
    hidden: r.hidden === true,
    placa: placaOffset(r.placa),
    display: Number.isInteger(r.display) ? r.display : null,
    language: language(r.language),
    // Efeitos sonoros: ligados por padrão, volume de 0 a 1.
    sound: r.sound !== false,
    volume: bounded(r.volume, 0, 1, DEFAULTS.volume),
    perf: PERFS.includes(r.perf) ? r.perf : DEFAULTS.perf,
    // Clarão dos relâmpagos na chuva: ligado por padrão (quem prefere sem clarões desliga em Ajustes).
    flash: r.flash !== false,
    // Música de fundo: desligada por padrão (o jogo fica aberto enquanto a pessoa trabalha).
    music: r.music === true,
    // Abrir com o Windows: desligado por padrão (só liga quem pedir, em Ajustes).
    startup: r.startup === true,
    // Menos letreiros (sem os números dos passos e a conversa da plateia): desligado por padrão.
    calm: r.calm === true
  };
}

function mergeSettings(current, partial) {
  const allowed = {};
  for (const key of [...PUBLIC, 'display', 'language']) {
    if (partial && Object.prototype.hasOwnProperty.call(partial, key)) allowed[key] = partial[key];
  }
  return normalizeSettings({ ...current, ...allowed });
}

function publicSettings(settings) {
  return Object.fromEntries(PUBLIC.map(key => [key, settings[key]]));
}

function pickDisplay(displays, id, primary) {
  return displays.find(display => display.id === id) || primary;
}

module.exports = { DEFAULTS, normalizeSettings, mergeSettings, publicSettings, pickDisplay };
