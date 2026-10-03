const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { loadSave, writeSave } = require('../desktop/save-store');

function storageWithFilesystem(filesystem) {
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '..', 'desktop', 'save-store.js'), 'utf8');
  vm.runInNewContext(source, { module, Buffer, console: { warn() {} }, require: name => name === 'node:path' ? path : filesystem });
  return module.exports;
}

// As transições de recuperação injetam falhas; os testes de gravação atômica usam o disco real.
function memoryFilesystem() {
  const files = new Map();
  const read = filename => {
    const file = files.get(path.resolve(filename));
    if (!file) { const error = new Error('arquivo ausente'); error.code = 'ENOENT'; throw error; }
    return file;
  };
  const filesystem = {
    mkdirSync() {},
    existsSync: filename => files.has(path.resolve(filename)),
    statSync: filename => ({ size: Buffer.byteLength(read(filename).data), mtimeMs: read(filename).mtimeMs }),
    readFileSync: filename => read(filename).data,
    writeFileSync: (filename, data) => files.set(path.resolve(filename), { data: String(data), mtimeMs: Date.now() }),
    utimesSync: (filename, _atime, mtime) => { read(filename).mtimeMs = new Date(mtime).getTime(); },
    copyFileSync: (from, to) => filesystem.writeFileSync(to, read(from).data),
    renameSync: (from, to) => { files.set(path.resolve(to), read(from)); files.delete(path.resolve(from)); },
    unlinkSync: filename => { read(filename); files.delete(path.resolve(filename)); }
  };
  return filesystem;
}

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
  const filesystem = memoryFilesystem();
  const store = storageWithFilesystem(filesystem);
  const filename = path.resolve('save-validation.json');
  const backup = `${filename}.bak`;
  const saved = { version: 1, name: 'Mandioca', size: 10 };
  // O contrato aqui é a validação do JSON; os testes de troca atômica acima usam o disco real.
  for (const invalid of [[], 'corrompido', 42, true, null]) {
    filesystem.writeFileSync(filename, JSON.stringify(invalid));
    filesystem.writeFileSync(backup, JSON.stringify(saved));
    filesystem.utimesSync(backup, new Date(0), new Date(0));
    assert.deepEqual(JSON.parse(JSON.stringify(store.loadSave(filename))), saved, `recupera o backup quando o principal contém ${JSON.stringify(invalid)}`);
    assert.equal(store.writeSave(filename, { ...saved, size: 11 }), true);
    assert.deepEqual(JSON.parse(filesystem.readFileSync(backup, 'utf8')), saved, 'o principal inválido não vira backup');
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
    for (const invalid of [{}, { ...saved, size: -1 }, { ...saved, levels: null },
      { ...saved, levels: { ...saved.levels, folego: 1e100, ritmo: 1e100 } },
      { ...saved, tickets: Number.MAX_VALUE, leilao: { ...saved.leilao, active: { held: Number.MAX_VALUE } } }]) {
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

test('o snapshot da sessão é o JSON validado e chega antes de qualquer falha de disco', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'desktop', 'save-store.js'), 'utf8');
  for (const failure of [null, 'mkdir', 'write', 'rename']) {
    const module = { exports: {} };
    let data;
    let snapshot;
    let serializations = 0;
    const order = [];
    const operation = name => {
      order.push(name);
      if (failure === name) throw new Error('disco indisponível');
    };
    vm.runInNewContext(source, { module, Buffer, console: { warn() {} }, require: name => name === 'node:path' ? path : {
      mkdirSync: () => operation('mkdir'), existsSync: () => false, unlinkSync() {},
      writeFileSync: (_file, value) => { operation('write'); data = value; }, renameSync: () => operation('rename')
    } });
    const raw = { toJSON: () => {
      serializations++;
      return { version: 1, size: serializations, metadata: { absent: undefined, number: NaN }, date: new Date(0) };
    } };
    const validate = value => { value.changedByValidator = true; return value.version === 1; };
    const save = () => module.exports.writeSave('save.json', raw, validate, value => {
      order.push('snapshot');
      snapshot = value;
    });
    if (failure) assert.throws(save, /disco indisponível/);
    else assert.equal(save(), true);
    assert.equal(serializations, 1, 'toJSON só participa uma vez da gravação');
    assert.deepEqual(JSON.parse(JSON.stringify(snapshot)), { version: 1, size: 1, metadata: { number: null }, date: new Date(0).toISOString() });
    assert.equal(order[0], 'snapshot', `${failure || 'sucesso'}: cache atualizado antes de acessar o disco`);
    if (data) assert.equal(JSON.stringify(snapshot), data, 'a validação não altera o snapshot em relação ao arquivo');
  }
});

test('saves recusados nunca substituem o snapshot válido da sessão', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'desktop', 'save-store.js'), 'utf8');
  const module = { exports: {} };
  let calls = 0;
  vm.runInNewContext(source, { module, Buffer, console, require: name => name === 'node:path' ? path : {
    mkdirSync() { throw new Error('save inválido não deveria acessar o disco'); }
  } });
  const circular = {}; circular.self = circular;
  for (const invalid of [null, [], 4, {}, { version: 1, padding: 'á'.repeat(1024 * 1024) }, circular,
    { version: 1, value: 1n }, { toJSON: () => null }, { toJSON: () => ({}) }]) {
    assert.equal(module.exports.writeSave('save.json', invalid, value => value.version === 1, () => calls++), false);
  }
  assert.equal(calls, 0, 'objeto, tamanho em bytes, serialização e validação passam antes do callback');
});

test('fallback após erro de I/O preserva o principal que voltou a ser legível antes do autosave', () => {
  for (const operation of ['statSync', 'readFileSync']) {
    const directory = path.resolve('recovery-test');
    const disk = memoryFilesystem();
    const filename = path.join(directory, 'save.json');
    const backup = `${filename}.bak`;
    const primary = { version: 1, size: 20, cheer: 500 };
    const previous = { version: 1, size: 10, cheer: 100 };
    let fail = true;
    const storage = storageWithFilesystem({ ...disk, [operation]: (...args) => {
      if (path.resolve(args[0]) === filename && fail) {
        fail = false;
        const error = new Error('falha transitória de leitura'); error.code = 'EIO'; throw error;
      }
      return disk[operation](...args);
    } });
    disk.writeFileSync(filename, JSON.stringify(primary));
    disk.writeFileSync(backup, JSON.stringify(previous));
    const loaded = storage.loadSave(path.join(directory, 'unused', '..', 'save.json'));
    assert.equal(loaded.cheer, 100);
    const recovered = { ...loaded, cheer: 110 };
    assert.equal(storage.writeSave(filename, recovered), true);
    assert.deepEqual(JSON.parse(disk.readFileSync(backup, 'utf8')), primary, 'o backup recente não impede preservar o principal recuperado');
    assert.equal(storage.loadSave(filename).cheer, 110);
    assert.equal(storage.writeSave(filename, { ...recovered, cheer: 120 }), true);
    assert.deepEqual(JSON.parse(disk.readFileSync(backup, 'utf8')), primary, 'depois do sucesso, a cadência normal mantém o principal preservado');
  }
});

test('leitura ainda inacessível ou cópia de recuperação incompleta não sobrescrevem principal nem backup', () => {
  for (const failure of ['read', 'copy']) {
    const directory = path.resolve('recovery-test');
    const disk = memoryFilesystem();
    const filename = path.join(directory, 'save.json');
    const backup = `${filename}.bak`;
    const primary = { version: 1, size: 20, cheer: 500 };
    const previous = { version: 1, size: 10, cheer: 100 };
    let failRead = true;
    let failCopy = failure === 'copy';
    const storage = storageWithFilesystem({ ...disk,
      existsSync: name => name === filename && failRead ? false : disk.existsSync(name),
      readFileSync: (...args) => {
        if (args[0] === filename && failRead) { const error = new Error('leitura inacessível'); error.code = 'EACCES'; throw error; }
        return disk.readFileSync(...args);
      },
      copyFileSync: (...args) => {
        if (failCopy) { disk.writeFileSync(args[1], '{parcial'); throw new Error('cópia incompleta'); }
        return disk.copyFileSync(...args);
      }
    });
    disk.writeFileSync(filename, JSON.stringify(primary));
    disk.writeFileSync(backup, JSON.stringify(previous));
    const recovered = { ...storage.loadSave(filename), cheer: 110 };
    if (failure === 'copy') failRead = false;
    let snapshot;
    assert.throws(() => storage.writeSave(filename, recovered, undefined, value => { snapshot = value; }));
    assert.equal(snapshot.cheer, 110, 'o callback ainda preserva a sessão que não pôde ser gravada');
    assert.deepEqual(JSON.parse(disk.readFileSync(filename, 'utf8')), primary);
    assert.deepEqual(JSON.parse(disk.readFileSync(backup, 'utf8')), previous);
    assert.equal(disk.existsSync(`${backup}.tmp`), false, 'a cópia incompleta foi removida');
    failRead = false; failCopy = false;
    assert.equal(storage.writeSave(filename, recovered), true, 'a proteção continua ativa para o retry');
    assert.deepEqual(JSON.parse(disk.readFileSync(backup, 'utf8')), primary);
    assert.equal(storage.loadSave(filename).cheer, 110);
  }
});

test('a recuperação após erro de I/O pode substituir principal ausente ou semanticamente corrompido', () => {
  for (const invalid of [null, {}, []]) {
    const directory = path.resolve('recovery-test');
    const disk = memoryFilesystem();
    const filename = path.join(directory, 'save.json');
    const backup = `${filename}.bak`;
    const previous = { version: 1, size: 10 };
    let fail = true;
    const storage = storageWithFilesystem({ ...disk, readFileSync: (...args) => {
      if (args[0] === filename && fail) { fail = false; const error = new Error('leitura inacessível'); error.code = 'EIO'; throw error; }
      return disk.readFileSync(...args);
    } });
    const valid = state => state.version === 1;
    disk.writeFileSync(filename, JSON.stringify({ ...previous, size: 20 }));
    disk.writeFileSync(backup, JSON.stringify(previous));
    const recovered = { ...storage.loadSave(filename, valid), size: 11 };
    if (invalid === null) disk.unlinkSync(filename);
    else disk.writeFileSync(filename, JSON.stringify(invalid));
    assert.equal(storage.writeSave(filename, recovered, valid), true);
    assert.deepEqual(JSON.parse(disk.readFileSync(backup, 'utf8')), previous, 'o principal inválido nunca substitui a cópia válida');
    assert.equal(storage.loadSave(filename, valid).size, 11);
  }
});
