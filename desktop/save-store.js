'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MAX_SAVE_BYTES = 2 * 1024 * 1024;
const BACKUP_EVERY_MS = 10 * 60 * 1000;
const isSaveObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
const acceptObject = () => true;
// Se o principal estava inacessível na carga, o backup recuperado pode conter uma festa anterior à dele.
const unreadableSaves = new Set();

function readJson(filename, validate = acceptObject, onReadError) {
  let data;
  try {
    if (fs.statSync(filename).size > MAX_SAVE_BYTES) return null;
    data = fs.readFileSync(filename, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('Save não pôde ser lido:', filename, error.message);
      if (onReadError) onReadError(error);
    }
    return null;
  }
  try {
    const state = JSON.parse(data);
    return isSaveObject(state) && validate(state) === true ? state : null;
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn('Save não pôde ser lido:', filename, error.message);
    return null;
  }
}

// Carrega o save; se ele estiver corrompido, usa a cópia de segurança.
function loadSave(filename, validate = acceptObject) {
  const key = path.resolve(filename);
  return readJson(filename, validate, () => unreadableSaves.add(key)) || readJson(`${filename}.bak`, validate);
}

function removeTemporary(filename) {
  try { fs.unlinkSync(filename); } catch (_) { /* inexistente ou inacessível: preserva o erro da gravação */ }
}

function writeSave(filename, state, validate = acceptObject, onSnapshot) {
  if (!isSaveObject(state)) return false;
  let data;
  try {
    data = JSON.stringify(state);
    if (typeof data !== 'string' || Buffer.byteLength(data, 'utf8') > MAX_SAVE_BYTES) return false;
    const serialized = JSON.parse(data);
    if (!isSaveObject(serialized) || validate(serialized) !== true) return false;
  } catch (_) { return false; }
  // A sessão guarda o mesmo JSON que vai ao arquivo, antes de qualquer falha de disco.
  // Uma segunda leitura também isola o snapshot de alterações feitas pelo validador.
  if (onSnapshot) onSnapshot(JSON.parse(data));
  const key = path.resolve(filename);
  const preservePrimary = unreadableSaves.has(key);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const backup = `${filename}.bak`;
  const backupTemporary = `${backup}.tmp`;
  try {
    const readError = preservePrimary ? error => { throw error; } : undefined;
    if ((preservePrimary || fs.existsSync(filename)) && readJson(filename, validate, readError)) {
      const age = !preservePrimary && fs.existsSync(backup) ? Date.now() - fs.statSync(backup).mtimeMs : Infinity;
      if (age >= BACKUP_EVERY_MS || !readJson(backup, validate)) {
        fs.copyFileSync(filename, backupTemporary);
        fs.renameSync(backupTemporary, backup);
      }
    }
  } catch (error) {
    // A sessão veio do backup: só sobrescreve o principal depois de conseguir preservar a versão legível dele.
    if (preservePrimary) throw error;
    console.warn('Cópia de segurança do save falhou:', error.message);
  } finally { removeTemporary(backupTemporary); }
  const temporary = `${filename}.tmp`;
  try {
    fs.writeFileSync(temporary, data, 'utf8');
    fs.renameSync(temporary, filename);
  } finally { removeTemporary(temporary); }
  unreadableSaves.delete(key);
  return true;
}

module.exports = { loadSave, writeSave };
