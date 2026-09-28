const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
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
