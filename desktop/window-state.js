'use strict';

const { DEFAULTS, normalizeSettings, mergeSettings, publicSettings } = require('../src/settings.js');

function pickDisplay(displays, id, primary) {
  return displays.find(display => display.id === id) || primary;
}

module.exports = { DEFAULTS, normalizeSettings, mergeSettings, publicSettings, pickDisplay };
