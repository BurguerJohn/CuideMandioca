'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MAX_SAVE_BYTES = 2 * 1024 * 1024;
const BACKUP_EVERY_MS = 10 * 60 * 1000;

function readJson(filename) {
  try {
    if (fs.statSync(filename).size > MAX_SAVE_BYTES) return null;
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn('Save não pôde ser lido:', filename, error.message);
    return null;
  }
}

// Carrega o save; se ele estiver corrompido, usa a cópia de segurança.
function loadSave(filename) {
  return readJson(filename) || readJson(`${filename}.bak`);
}

function writeSave(filename, state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return false;
  const data = JSON.stringify(state);
  if (Buffer.byteLength(data, 'utf8') > MAX_SAVE_BYTES) return false;
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const backup = `${filename}.bak`;
  try {
    if (fs.existsSync(filename) && readJson(filename)) {
      const age = fs.existsSync(backup) ? Date.now() - fs.statSync(backup).mtimeMs : Infinity;
      if (age >= BACKUP_EVERY_MS) fs.copyFileSync(filename, backup);
    }
  } catch (error) {
    console.warn('Cópia de segurança do save falhou:', error.message);
  }
  const temporary = `${filename}.tmp`;
  fs.writeFileSync(temporary, data, 'utf8');
  fs.renameSync(temporary, filename);
  return true;
}

module.exports = { loadSave, writeSave };
