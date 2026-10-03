'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const asar = require('@electron/asar');
const root = path.resolve(__dirname, '../..');
const folder = path.join(root, 'dist/CuideBemDaSuaMandioca-win32-x64');
const archive = path.join(folder, 'resources/app.asar');
const runtime = [];
function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(filename);
    else if (entry.isFile() && entry.name.endsWith('.js')) runtime.push(path.relative(root, filename));
  }
}
collect(path.join(root, 'src'));
runtime.push(...['main', 'preload', 'save-store', 'window-state', 'steam'].map(name => `desktop/${name}.js`));
function same(filename) {
  assert.ok(asar.extractFile(archive, path.normalize(filename)).equals(fs.readFileSync(path.join(root, filename))),
    `O pacote contém a versão atual de ${filename}.`);
}
for (const filename of runtime) same(filename);
same('src/style.css');
same('index.html');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const references = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map(match => match[1])
  .filter(value => !/^(?:https?:|data:|#)/.test(value));
for (const reference of references) asar.statFile(archive, path.normalize(reference));
assert.ok(fs.statSync(path.join(folder, 'CuideBemDaSuaMandioca.exe')).isFile());
const report = { runtimeFiles: runtime.length, styleFiles: 1, htmlFiles: 1, htmlReferences: references.length,
  packagedAt: fs.statSync(archive).mtime.toISOString() };
fs.writeFileSync(path.join(__dirname, 'package-verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
