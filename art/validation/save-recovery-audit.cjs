'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const { GameEngine } = require(path.join(root, 'src/core'));
const data = require(path.join(root, 'src/data'));
const source = fs.readFileSync(path.join(root, 'desktop/save-store.js'), 'utf8');
const report = { cases: [], failures: [] };
const stamp = new Date(2026, 9, 3, 12).getTime();
const valid = state => { new GameEngine(data, state, { now: () => stamp, rng: () => 0.5 }); return true; };
const seed = new GameEngine(data, null, { now: () => stamp, rng: () => 0.5 }).exportState();
const directory = fs.mkdtempSync(path.join(__dirname, 'save-recovery-cases-'));
const operations = ['mkdir', 'stat', 'read', 'copy', 'backup-rename', 'write', 'primary-rename'];
async function audit() {
try {
  for (const mode of ['normal', 'recovered']) for (const operation of operations) {
    const folder = path.join(directory, `${mode}-${operation}`);
    fs.mkdirSync(folder);
    const filename = path.join(folder, 'save.json'), backup = filename + '.bak';
    const previous = { ...seed, cheer: 50 }, primary = { ...seed, cheer: 100 };
    const next = { ...seed, cheer: mode === 'normal' ? 200 : 60 };
    fs.writeFileSync(filename, JSON.stringify(primary));
    fs.writeFileSync(backup, JSON.stringify(previous));
    fs.utimesSync(backup, new Date(0), new Date(0));
    let loading = mode === 'recovered', fail = true, snapshot = null, faultHits = 0;
    const fault = message => {
      fail = false;
      faultHits++;
      const error = new Error(message);
      error.code = 'AUDIT_INJECTED';
      return error;
    };
    const injected = { ...fs,
      mkdirSync: (...args) => { if (!loading && fail && operation === 'mkdir') throw fault('mkdir indisponível'); return fs.mkdirSync(...args); },
      statSync: (...args) => { if (!loading && fail && operation === 'stat' && args[0] === filename) throw fault('stat indisponível'); return fs.statSync(...args); },
      readFileSync: (...args) => {
        if (args[0] === filename && loading) {
          loading = false;
          const error = new Error('leitura indisponível'); error.code = 'EIO'; throw error;
        }
        if (args[0] === filename && fail && operation === 'read') throw fault('leitura indisponível');
        return fs.readFileSync(...args);
      },
      copyFileSync: (...args) => {
        if (fail && operation === 'copy') { fs.writeFileSync(args[1], '{cópia parcial'); throw fault('copy interrompido'); }
        return fs.copyFileSync(...args);
      },
      writeFileSync: (...args) => {
        if (fail && operation === 'write' && args[0] === filename + '.tmp') {
          fs.writeFileSync(args[0], '{gravação parcial'); throw fault('write interrompido');
        }
        return fs.writeFileSync(...args);
      },
      renameSync: (...args) => {
        if (fail && (operation === 'backup-rename' && args[1] === backup || operation === 'primary-rename' && args[1] === filename)) {
          throw fault('rename indisponível');
        }
        return fs.renameSync(...args);
      }
    };
    const module = { exports: {} };
    vm.runInNewContext(source, { module, Buffer, Date, console: { warn() {} },
      require: name => name === 'node:path' ? path : injected });
    const store = module.exports;
    const entry = { mode, operation };
    try {
      if (mode === 'recovered') {
        assert.equal(store.loadSave(filename, valid).cheer, previous.cheer);
      }
      try { entry.written = store.writeSave(filename, next, valid, state => { snapshot = state; }); }
      catch (error) { entry.written = false; entry.error = error.message; }
      entry.faultHits = faultHits;
      assert.equal(faultHits, 1, 'a falha simulada precisa chegar à etapa prevista da gravação');
      assert.deepEqual(JSON.parse(JSON.stringify(snapshot)), next, 'a sessão mantém o snapshot válido apesar da falha');
      const onDisk = JSON.parse(fs.readFileSync(filename, 'utf8'));
      const protectedBackup = JSON.parse(fs.readFileSync(backup, 'utf8'));
      assert.ok(onDisk.cheer === primary.cheer || onDisk.cheer === next.cheer, 'o principal nunca fica parcialmente gravado');
      assert.ok(protectedBackup.cheer === primary.cheer || protectedBackup.cheer === previous.cheer, 'o backup continua válido');
      if (mode === 'recovered' && entry.written) assert.equal(protectedBackup.cheer, primary.cheer, 'a versão mais nova foi preservada antes de substituir o principal');
      assert.equal(fs.existsSync(filename + '.tmp'), false);
      assert.equal(fs.existsSync(backup + '.tmp'), false);
      fail = false;
      entry.retryErrors = [];
      for (let attempt = 0; ; attempt++) {
        try {
          assert.equal(store.writeSave(filename, next, valid), true, 'tentar novamente termina a gravação');
          break;
        } catch (error) {
          if (error.code !== 'EPERM' || attempt >= 3) throw error;
          entry.retryErrors.push(error.message);
          assert.ok(valid(JSON.parse(fs.readFileSync(filename, 'utf8'))), 'uma recusa real do disco conserva o principal válido');
          assert.ok(valid(JSON.parse(fs.readFileSync(backup, 'utf8'))), 'uma recusa real do disco conserva o backup válido');
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      assert.equal(store.loadSave(filename, valid).cheer, next.cheer);
      fs.writeFileSync(filename, '{principal corrompido');
      const fallback = store.loadSave(filename, valid);
      assert.ok(fallback && valid(fallback), 'o backup ainda recupera uma partida válida depois da nova tentativa');
      entry.fallbackCheer = fallback.cheer;
      report.cases.push(entry);
    } catch (error) { report.failures.push({ ...entry, detail: error.stack || error.message }); }
  }
} finally {
  const resolved = path.resolve(directory), validationRoot = path.resolve(__dirname) + path.sep;
  assert.ok(resolved.startsWith(validationRoot), 'a limpeza só remove os arquivos temporários desta auditoria');
  fs.rmSync(resolved, { recursive: true, force: true });
  fs.writeFileSync(path.join(__dirname, 'save-recovery-audit.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report));
if (report.failures.length || report.cases.length !== operations.length * 2) process.exitCode = 1;
}
audit().catch(error => { console.error(error); process.exitCode = 1; });
