(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./i18n.js'));
  else root.ArraiaSettings = factory(root.ArraiaI18n);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (i18n) {
  'use strict';

  const { LANGUAGES } = i18n;

  // Preferências da festa, sempre normalizadas antes de usar ou salvar.
  const DEFAULTS = Object.freeze({ pinned: true, zoom: 1, x: 0.72, lift: 0, hud: 'sempre', hidden: false, placa: null, casa: null, casaHidden: false,
    display: null, language: 'auto', sound: true, volume: 0.5, perf: 'suave', flash: true, music: false, startup: false, calm: false });
  const PUBLIC = ['pinned', 'zoom', 'x', 'lift', 'hud', 'hidden', 'placa', 'casa', 'casaHidden', 'sound', 'volume', 'perf', 'flash', 'music', 'startup', 'calm'];
  // Quadros por segundo com foco / de fundo: suave 60/30, normal 30/20, economia 20/12.
  const PERFS = ['suave', 'normal', 'economia'];
  const language = value => (LANGUAGES.some(entry => entry.id === value) ? value : 'auto');

  function bounded(value, low, high, fallback) {
    return Number.isFinite(value) ? Math.min(high, Math.max(low, value)) : fallback;
  }

  // Posição da placa em pixels a partir do pé esquerdo da festa (null = ao lado dela).
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
      casa: placaOffset(r.casa),
      casaHidden: r.casaHidden === true,
      display: Number.isInteger(r.display) ? r.display : null,
      language: language(r.language),
      sound: r.sound !== false,
      volume: bounded(r.volume, 0, 1, DEFAULTS.volume),
      perf: PERFS.includes(r.perf) ? r.perf : DEFAULTS.perf,
      flash: r.flash !== false,
      music: r.music === true,
      startup: r.startup === true,
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

  return { DEFAULTS, normalizeSettings, mergeSettings, publicSettings };
});
