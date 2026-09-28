const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSettings, mergeSettings, publicSettings, pickDisplay } = require('../desktop/window-state');

test('preferências inválidas voltam ao padrão', () => {
  assert.deepEqual(normalizeSettings({ pinned: 'sim', zoom: 9, x: 9, lift: -3, hud: 'x', hidden: 1, display: 'a' }),
    { pinned: true, zoom: 3, x: 1, lift: 0, hud: 'sempre', hidden: false, placa: null, display: null, language: 'auto',
      sound: true, volume: 0.5 });
  assert.equal(normalizeSettings({ sound: false }).sound, false, 'som desligado fica desligado');
  assert.equal(normalizeSettings({ sound: 'não' }).sound, true, 'valor estranho: som ligado');
  assert.equal(normalizeSettings({ volume: 7 }).volume, 1, 'volume vai de 0 a 1');
  assert.equal(normalizeSettings({ volume: 'alto' }).volume, 0.5);
  assert.equal(normalizeSettings({ language: 'es' }).language, 'es');
  assert.equal(normalizeSettings({ language: 'klingon' }).language, 'auto', 'idioma desconhecido volta ao automático');
  assert.equal(normalizeSettings(null).zoom, 1);
  assert.equal(normalizeSettings({ scale: 2 }).zoom, 2 / 3, 'a escala antiga vira zoom');
});

test('mudanças parciais só alteram as chaves conhecidas', () => {
  const current = normalizeSettings({ zoom: 0.5, x: 0.3 });
  const next = mergeSettings(current, { zoom: 2, hud: 'passar', malicioso: true });
  assert.equal(next.zoom, 2);
  assert.equal(next.x, 0.3);
  assert.equal(next.hud, 'passar');
  assert.equal('malicioso' in next, false);
  assert.deepEqual(Object.keys(publicSettings(next)), ['pinned', 'zoom', 'x', 'lift', 'hud', 'hidden', 'placa', 'sound', 'volume']);
  assert.equal(mergeSettings(next, { volume: 0.25 }).volume, 0.25, 'a página muda o volume');
  assert.deepEqual(mergeSettings(next, { placa: { dx: -300.4, dy: 20 } }).placa, { dx: -300, dy: 20 }, 'placa arrastada');
  assert.equal(mergeSettings(next, { placa: { dx: 'a', dy: 1 } }).placa, null, 'posição inválida volta ao automático');
  assert.equal(mergeSettings(next, { placa: null }).placa, null);
});

test('monitor escolhido some e a festa volta para o principal', () => {
  const primary = { id: 1 };
  assert.equal(pickDisplay([primary, { id: 2 }], 2, primary).id, 2);
  assert.equal(pickDisplay([primary], 2, primary).id, 1);
});
