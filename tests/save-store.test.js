const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { loadSave, writeSave } = require('../desktop/save-store');

test('save desktop grava atômico, recusa saves gigantes e usa a cópia se o principal quebrar', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'arraia-save-'));
  const filename = path.join(directory, 'save.json');
  try {
    const first = { version: 1, name: 'Mandioca', size: 10 };
    assert.equal(writeSave(filename, first), true);
    assert.deepEqual(loadSave(filename), first);
    assert.equal(fs.existsSync(`${filename}.tmp`), false);
    const second = { version: 1, name: 'Mandioca', size: 11 };
    assert.equal(writeSave(filename, second), true);
    assert.deepEqual(JSON.parse(fs.readFileSync(`${filename}.bak`, 'utf8')), first, 'a gravação anterior vira cópia');
    assert.equal(writeSave(filename, { data: 'x'.repeat(2 * 1024 * 1024) }), false);
    fs.writeFileSync(filename, '{quebrado', 'utf8');
    assert.deepEqual(loadSave(filename), first);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('JSON sem um objeto de save usa o backup e não o substitui ao salvar', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'arraia-save-'));
  const filename = path.join(directory, 'save.json');
  const backup = `${filename}.bak`;
  const saved = { version: 1, name: 'Mandioca', size: 10 };
  try {
    for (const invalid of [[], 'corrompido', 42, true, null]) {
      fs.writeFileSync(filename, JSON.stringify(invalid));
      fs.writeFileSync(backup, JSON.stringify(saved));
      fs.utimesSync(backup, new Date(0), new Date(0));
      assert.deepEqual(loadSave(filename), saved, `recupera o backup quando o principal contém ${JSON.stringify(invalid)}`);
      assert.equal(writeSave(filename, { ...saved, size: 11 }), true);
      assert.deepEqual(JSON.parse(fs.readFileSync(backup, 'utf8')), saved, 'o principal inválido não vira backup');
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('a validação do jogo recupera o backup e impede substituir uma cópia boa por um objeto corrompido', () => {
  const { GameEngine } = require('../src/core.js');
  const data = require('../src/data.js');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'arraia-save-'));
  const filename = path.join(directory, 'save.json');
  const backup = `${filename}.bak`;
  const saved = new GameEngine(data, null, { now: () => 1000, rng: () => 0.5 }).exportState();
  const valid = state => { new GameEngine(data, state, { now: () => 1000, rng: () => 0.5 }); return true; };
  try {
    for (const invalid of [{}, { ...saved, size: -1 }, { ...saved, levels: null }]) {
      fs.writeFileSync(filename, JSON.stringify(invalid));
      fs.writeFileSync(backup, JSON.stringify(saved));
      fs.utimesSync(backup, new Date(0), new Date(0));
      assert.deepEqual(loadSave(filename, valid), saved, 'o mesmo loader do jogo escolhe a cópia válida');
      assert.equal(writeSave(filename, { ...saved, size: 2 }, valid), true);
      assert.deepEqual(JSON.parse(fs.readFileSync(backup, 'utf8')), saved, 'o objeto que o jogo rejeita não vira backup');
      assert.equal(writeSave(filename, invalid, valid), false, 'recusa saves que o jogo rejeita');
      assert.equal(loadSave(filename, valid).size, 2);
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('um backup corrompido recente é reparado antes de salvar novamente', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'arraia-save-'));
  const filename = path.join(directory, 'save.json');
  const saved = { version: 1, name: 'Mandioca', size: 10 };
  try {
    writeSave(filename, saved);
    fs.writeFileSync(`${filename}.bak`, '[]');
    assert.equal(writeSave(filename, { ...saved, size: 11 }), true);
    fs.writeFileSync(filename, 'null');
    assert.deepEqual(loadSave(filename), saved, 'a cópia foi recuperada sem esperar dez minutos');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('serialização inválida não altera o principal nem o backup', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'arraia-save-'));
  const filename = path.join(directory, 'save.json');
  const saved = { version: 1, size: 10 };
  const circular = {}; circular.self = circular;
  try {
    writeSave(filename, saved);
    writeSave(filename, { ...saved, size: 11 });
    for (const invalid of [circular, { value: 1n }, { toJSON: () => null }, { toJSON: () => 'texto' }]) {
      assert.equal(writeSave(filename, invalid), false);
      assert.deepEqual(loadSave(filename), { ...saved, size: 11 });
      assert.deepEqual(JSON.parse(fs.readFileSync(`${filename}.bak`, 'utf8')), saved);
      assert.equal(fs.existsSync(`${filename}.tmp`), false);
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('falha ao substituir o principal limpa o arquivo temporário', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'arraia-save-'));
  const filename = path.join(directory, 'save.json');
  try {
    fs.mkdirSync(filename);
    assert.throws(() => writeSave(filename, { version: 1, size: 10 }));
    assert.equal(fs.existsSync(`${filename}.tmp`), false, 'a tentativa falha não deixa um temporário pendurado');
    assert.equal(fs.statSync(filename).isDirectory(), true, 'o destino não foi alterado');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('falha durante a cópia do backup preserva a última cópia completa', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'arraia-save-'));
  const filename = path.join(directory, 'save.json');
  const saved = { version: 1, size: 10 };
  const previous = { version: 1, size: 9 };
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '..', 'desktop', 'save-store.js'), 'utf8');
  vm.runInNewContext(source, { module, Buffer, console: { warn() {} }, require: name => name === 'node:path' ? path : {
    ...fs,
    copyFileSync: (_from, to) => { fs.writeFileSync(to, '{parcial'); throw new Error('disco cheio'); }
  } });
  try {
    fs.writeFileSync(filename, JSON.stringify(saved));
    fs.writeFileSync(`${filename}.bak`, JSON.stringify(previous));
    fs.utimesSync(`${filename}.bak`, new Date(0), new Date(0));
    assert.equal(module.exports.writeSave(filename, { ...saved, size: 11 }), true);
    assert.deepEqual(JSON.parse(fs.readFileSync(`${filename}.bak`, 'utf8')), previous, 'a cópia parcial não destrói a cópia existente');
    assert.equal(fs.existsSync(`${filename}.bak.tmp`), false, 'limpa a cópia parcial');
    assert.equal(loadSave(filename).size, 11, 'a falha no backup não impede o save principal');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
