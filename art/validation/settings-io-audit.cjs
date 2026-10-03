'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const Settings = require('../../src/settings');
const I18N = require('../../src/i18n');
const copy = value => JSON.parse(JSON.stringify(value));
const fixtureSource = fs.readFileSync(path.join(root, 'tests/desktop-ipc.test.js'), 'utf8');
const firstTest = fixtureSource.indexOf('\ntest(');
assert.ok(firstTest > 0);
const fixture = { exports: {} };
// Reuse the existing main-process harness without registering or rerunning its tests.
vm.runInNewContext(fixtureSource.slice(0, firstTest) + '\nmodule.exports = { loadMain };', {
  module: fixture, require: name => name.startsWith('.') ? require(path.resolve(root, 'tests', name)) : require(name),
  __dirname: path.join(root, 'tests'), console, setTimeout, clearTimeout
});
assert.equal(typeof fixture.exports.loadMain, 'function');
const report = { cases: [], failures: [] };
const workspace = fs.mkdtempSync(path.join(__dirname, 'settings-io-cases-'));
assert.ok(workspace.startsWith(path.resolve(__dirname) + path.sep));

async function audit() {
  try {
    for (const existing of [false, true]) for (const trigger of ['debounce', 'language', 'late-quit']) {
      for (const operation of ['mkdir', 'write', 'partial-write', 'rename']) {
        const entry = { existing, trigger, operation };
        report.cases.push(entry);
        try {
          const directory = path.join(workspace, `${existing}-${trigger}-${operation}`);
          fs.mkdirSync(directory);
          const filename = path.join(directory, 'window-settings.json');
          const original = Settings.normalizeSettings({ volume: .25, x: .4, lift: 20, zoom: .75, language: 'en',
            placa: { dx: 60, dy: 40 }, minis: { ceu: { hidden: false, dx: 90, dy: 20 } } });
          if (existing) fs.writeFileSync(filename, JSON.stringify(original));
          let armed = false, hits = 0;
          const fault = () => {
            armed = false;
            hits++;
            const error = new Error('failure injected during ' + operation);
            error.code = 'AUDIT_SETTINGS_IO';
            return error;
          };
          const errors = [], warnings = [], timers = new Map();
          let nextTimer = 0;
          const injected = { ...fs,
            mkdirSync: (...args) => {
              if (armed && operation === 'mkdir' && args[0] === directory) throw fault();
              return fs.mkdirSync(...args);
            },
            writeFileSync: (...args) => {
              if (armed && ['write', 'partial-write'].includes(operation) && args[0] === filename + '.tmp') {
                if (operation === 'partial-write') fs.writeFileSync(args[0], '{"volume":');
                throw fault();
              }
              return fs.writeFileSync(...args);
            },
            renameSync: (...args) => {
              if (armed && operation === 'rename' && args[1] === filename) throw fault();
              return fs.renameSync(...args);
            }
          };
          const options = { filesystem: injected, paths: { userData: directory, appData: path.join(directory, 'appdata') },
            logger: { log() {}, warn: (...args) => warnings.push(args.map(String)), error: (...args) => errors.push(args.map(String)) },
            timeout: (fn, ms) => { const id = ++nextTimer; timers.set(id, { fn, ms }); return id; },
            clear: id => timers.delete(id) };
          const boot = async () => {
            const main = fixture.exports.loadMain(options);
            await Promise.resolve();
            assert.ok(main.window());
            return main;
          };
          const main = await boot();
          const own = () => ({ sender: main.window().webContents });
          const snapshot = () => copy(main.handlers.get('desktop:get-settings')(own()));
          const change = partial => main.handlers.get('desktop:update-settings')(own(), partial);
          const flush = () => {
            const scheduled = [...timers.values()].filter(timer => timer.ms === 300);
            assert.equal(scheduled.length, 1, 'the current change has one pending preference write');
            scheduled[0].fn();
          };
          if (trigger === 'late-quit') main.appEvents['before-quit']();
          const beforeDisk = fs.existsSync(filename) ? fs.readFileSync(filename, 'utf8') : null;
          const before = snapshot();
          const partial = { volume: .9, x: .81, lift: 70, zoom: 1.5, placa: { dx: 75, dy: 55 },
            casa: { dx: -80, dy: 20 }, minis: { ceu: { hidden: false, dx: 140, dy: 35 }, horta: { hidden: true } } };
          armed = true;
          change(partial);
          if (trigger === 'debounce') flush();
          if (trigger === 'language') main.listeners.get('desktop:set-language')(own(), 'es');
          assert.equal(hits, 1, 'the requested disk fault reached the actual main-process write');
          assert.equal(errors.length, 1, 'the failed write is reported without stopping the main process');
          assert.deepEqual(fs.existsSync(filename) ? fs.readFileSync(filename, 'utf8') : null, beforeDisk,
            'a failed preference write leaves the previous durable file unchanged');
          const live = snapshot();
          for (const [key, value] of Object.entries(partial)) assert.deepEqual(live[key], value, 'the live window retains ' + key);
          assert.ok(live.revision > before.revision);
          assert.equal(main.handlers.get('desktop:update-settings')({ sender: {} }, { volume: .1 }), null);
          const restarted = await boot();
          const recovered = copy(restarted.handlers.get('desktop:get-settings')({ sender: restarted.window().webContents }));
          assert.deepEqual(Settings.publicSettings(Settings.normalizeSettings(recovered)),
            Settings.publicSettings(Settings.normalizeSettings(beforeDisk ? JSON.parse(beforeDisk) : null)),
            'restart loads the valid previous preferences rather than the incomplete temporary file');
          assert.equal(warnings.length, 0, 'the protected preferences remain valid JSON');
          main.appEvents['before-quit']();
          const durable = JSON.parse(fs.readFileSync(filename, 'utf8'));
          for (const [key, value] of Object.entries(partial)) assert.deepEqual(durable[key], value, 'retry durably records ' + key);
          if (trigger === 'language') assert.equal(durable.language, 'es');
          assert.equal(fs.existsSync(filename + '.tmp'), false, 'successful retry consumes the temporary file');
          const afterRetry = await boot();
          const current = copy(afterRetry.handlers.get('desktop:get-settings')({ sender: afterRetry.window().webContents }));
          for (const [key, value] of Object.entries(partial)) assert.deepEqual(current[key], value, 'the next session restores ' + key);
          assert.equal(errors.length, 1, 'retry does not emit another disk error');
          entry.passed = true;
        } catch (error) {
          entry.error = error.stack || String(error);
          report.failures.push(entry);
        }
      }
    }
  } finally {
    const resolved = fs.realpathSync(workspace), validation = fs.realpathSync(__dirname);
    assert.ok(resolved.startsWith(validation + path.sep) && path.basename(resolved).startsWith('settings-io-cases-'));
    fs.rmSync(resolved, { recursive: true, force: true });
    I18N.setLanguage('pt-BR');
  }
  fs.writeFileSync(path.join(__dirname, 'settings-io-verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ cases: report.cases.length, passed: report.cases.filter(entry => entry.passed).length,
    failures: report.failures.map(entry => ({ existing: entry.existing, trigger: entry.trigger, operation: entry.operation,
      error: entry.error.split('\n')[0] })) }));
  process.exitCode = report.failures.length ? 1 : 0;
}
audit().catch(error => { console.error(error); process.exitCode = 1; });
