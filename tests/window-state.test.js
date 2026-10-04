const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { normalizeSettings, mergeSettings, publicSettings, pickDisplay } = require('../desktop/window-state');

test('preferências inválidas voltam ao padrão', () => {
  assert.deepEqual(normalizeSettings({ pinned: 'sim', zoom: 9, x: 9, lift: -3, hud: 'x', hidden: 1, display: 'a' }),
    { pinned: true, zoom: 3, x: 1, lift: 0, hud: 'sempre', hidden: false, placa: null, gaveta: null, casa: null, casaHidden: false, minis: {}, display: null, language: 'auto',
      sound: true, volume: 0.5, perf: 'suave', flash: true, music: false, startup: false, calm: false });
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
  assert.deepEqual(Object.keys(publicSettings(next)), ['pinned', 'zoom', 'x', 'lift', 'hud', 'hidden', 'placa', 'gaveta', 'casa', 'casaHidden', 'minis', 'sound', 'volume', 'perf', 'flash', 'music', 'startup', 'calm']);
  assert.equal(normalizeSettings({ music: true }).music, true);
  assert.equal(normalizeSettings({ startup: true }).startup, true);
  assert.equal(normalizeSettings({ startup: 1 }).startup, false, 'abrir com o Windows só liga com true de verdade');
  assert.equal(mergeSettings(current, { startup: true }).startup, true, 'dá para mudar pelos Ajustes');
  assert.equal(normalizeSettings({ music: 'sim' }).music, false, 'a música só liga com true de verdade');
  assert.equal(normalizeSettings({ flash: false }).flash, false);
  assert.equal(normalizeSettings({ flash: 'talvez' }).flash, true, 'valor estranho: com clarão');
  assert.equal(normalizeSettings({ calm: true }).calm, true);
  assert.equal(normalizeSettings({ calm: 'sim' }).calm, false, 'valor estranho: com letreiros');
  assert.equal(normalizeSettings({ perf: 'economia' }).perf, 'economia');
  assert.equal(normalizeSettings({ perf: 'turbo' }).perf, 'suave', 'valor estranho: suave');
  assert.equal(mergeSettings(next, { volume: 0.25 }).volume, 0.25, 'a página muda o volume');
  assert.deepEqual(mergeSettings(next, { placa: { dx: -300.4, dy: 20 } }).placa, { dx: -300, dy: 20 }, 'placa arrastada');
  assert.equal(mergeSettings(next, { placa: { dx: 'a', dy: 1 } }).placa, null, 'posição inválida volta ao automático');
  assert.equal(mergeSettings(next, { placa: null }).placa, null);
});

test('entradas inválidas de minis não ocupam o limite nem descartam posições válidas', () => {
  const invalid = Object.fromEntries(Array.from({ length: 32 }, (_, index) => [`Entrada inválida ${index}`, { hidden: false }]));
  const raw = { minis: { ...invalid, bichos: { hidden: false, dx: 123.4, dy: -42.2 } } };
  const expected = { bichos: { hidden: false, dx: 123, dy: -42 } };
  assert.deepEqual(normalizeSettings(raw).minis, expected, 'a janela visível no save mantém sua posição');
  assert.deepEqual(mergeSettings(normalizeSettings(null), raw).minis, expected, 'atualizações usam o mesmo saneamento');

  const manyValid = Object.fromEntries(Array.from({ length: 33 }, (_, index) => [`janela-${index}`, { hidden: false }]));
  const bounded = normalizeSettings({ minis: { ...invalid, ...manyValid } }).minis;
  assert.equal(Object.keys(bounded).length, 32, 'o limite continua valendo para entradas válidas');
  assert.equal(Object.hasOwn(bounded, 'janela-31'), true);
  assert.equal(Object.hasOwn(bounded, 'janela-32'), false);
});

test('monitor escolhido some e a festa volta para o principal', () => {
  const primary = { id: 1 };
  assert.equal(pickDisplay([primary, { id: 2 }], 2, primary).id, 2);
  assert.equal(pickDisplay([primary], 2, primary).id, 1);
});

test('desktop reutiliza o módulo de preferências compartilhado', () => {
  const shared = require('../src/settings');
  const desktop = require('../desktop/window-state');
  for (const key of Object.keys(shared)) assert.equal(desktop[key], shared[key]);
});

test('navegador normaliza preferências corrompidas com os mesmos limites do desktop', () => {
  const browser = vm.createContext({});
  for (const file of ['i18n.js', 'settings.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), browser, { filename: file });
  }
  const corrupt = { zoom: { valueOf: null, toString: null }, placa: { dx: 'corrompido', dy: 7 }, volume: 7 };
  const settings = browser.ArraiaSettings.publicSettings(browser.ArraiaSettings.normalizeSettings(corrupt));
  assert.equal(settings.zoom, 1);
  assert.equal(settings.placa, null);
  assert.equal(settings.volume, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(settings)), publicSettings(normalizeSettings(corrupt)));
  const next = browser.ArraiaSettings.mergeSettings(settings, { zoom: 'corrompido', volume: 'alto', placa: { dx: 20, dy: 30 } });
  assert.equal(next.zoom, 1);
  assert.equal(next.volume, 0.5);
  assert.deepEqual(JSON.parse(JSON.stringify(next.placa)), { dx: 20, dy: 30 });
});

test('gaveta da placa: só aceita janelas ou coleções (o resto fecha a gaveta) e dá para mudar pelas preferências', () => {
  assert.equal(normalizeSettings({}).gaveta, null);
  assert.equal(normalizeSettings({ gaveta: 'janelas' }).gaveta, 'janelas');
  assert.equal(normalizeSettings({ gaveta: 'colecoes' }).gaveta, 'colecoes');
  for (const estranho of ['album', '', 3, true, {}, [], 'JANELAS']) assert.equal(normalizeSettings({ gaveta: estranho }).gaveta, null, String(estranho));
  const aberta = normalizeSettings({ gaveta: 'janelas' });
  assert.equal(mergeSettings(aberta, { gaveta: 'colecoes' }).gaveta, 'colecoes', 'troca de gaveta');
  assert.equal(mergeSettings(aberta, { gaveta: null }).gaveta, null, 'fecha a gaveta');
  assert.equal(mergeSettings(aberta, { zoom: 2 }).gaveta, 'janelas', 'outras mudanças não mexem nela');
  assert.equal(mergeSettings(aberta, { gaveta: 'lixo' }).gaveta, null);
  assert.equal(publicSettings(aberta).gaveta, 'janelas');
});
