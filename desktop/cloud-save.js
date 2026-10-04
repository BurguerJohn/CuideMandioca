'use strict';

// Save na nuvem da Steam (Steam Cloud pela API do steamworks.js), para a festa seguir a pessoa de um computador para outro.
//
// Na abertura (`reconcile`) o save daqui e o da nuvem são comparados: vale o mais recente (`lastSeen`). Se o mais recente tem MENOS progresso que o outro
// (por exemplo, uma festa nova começada num segundo computador), a pessoa escolhe qual manter; quem perde fica guardado como cópia (`save.json.conflito`
// aqui e `save.anterior.json` na nuvem). Depois de cada gravação (`push`) o save vai para a nuvem, no máximo uma vez por minuto, e ao sair (`flush`)
// vai o último. Sem a Steam, com a nuvem desligada na conta ou no jogo, ou com o App ID de testes, tudo vira no-op.
const CLOUD_FILE = 'save.json';
const CLOUD_BACKUP = 'save.anterior.json';
const MAX_BYTES = 2 * 1024 * 1024;
const PUSH_EVERY_MS = 60 * 1000;

const isObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
const stamp = state => (Number.isFinite(state.lastSeen) ? state.lastSeen : 0);
// Quanto a festa já andou: o ano e o recorde de convidados (o recorde não cai quando começa um ano novo).
const progress = state => [Number.isFinite(state.year) ? state.year : 1,
  Number.isFinite(state.records?.size) ? state.records.size : Number.isFinite(state.size) ? state.size : 1];
const lessProgress = (a, b) => (a[0] !== b[0] ? a[0] < b[0] : a[1] < b[1]);

function parse(text, validate) {
  if (typeof text !== 'string' || !text || Buffer.byteLength(text, 'utf8') > MAX_BYTES) return null;
  try {
    const state = JSON.parse(text);
    return isObject(state) && validate(state) === true ? state : null;
  } catch (_) { return null; }
}

function createCloudSave({ steam, validate = () => true, ask = null, adoptLocal = () => {}, now = Date.now, schedule = setTimeout, cancel = clearTimeout,
  every = PUSH_EVERY_MS, log = console } = {}) {
  let pending = null;
  let timer = null;
  let lastPush = -Infinity;
  let lastWritten = '';

  const write = text => {
    if (Buffer.byteLength(text, 'utf8') > MAX_BYTES) return false;
    return steam.cloudWrite(CLOUD_FILE, text) === true;
  };

  // Manda o último save pendente para a nuvem (se a gravação falhar, ele continua pendente para a próxima vez).
  function flush() {
    if (timer) { cancel(timer); timer = null; }
    if (!pending) return false;
    const state = pending;
    pending = null;
    lastPush = now();
    let text;
    try { text = JSON.stringify(state); } catch (_) { return false; }
    if (text === lastWritten) return true;
    if (!steam.cloudEnabled()) return false;
    if (write(text)) { lastWritten = text; return true; }
    pending = state;
    return false;
  }

  return {
    enabled: () => steam.cloudEnabled() === true,

    // Compara o save daqui (ou null) com o da nuvem e devolve o que vale. Quando o da nuvem vence, `adoptLocal(nuvem, daqui)` grava ele no disco.
    reconcile(local) {
      if (!steam.cloudEnabled()) return local;
      // Depois da abertura o próximo envio espera o minuto passar (o save que acabou de ser comparado já está na nuvem ou vai agora).
      lastPush = now();
      const cloudText = steam.cloudRead(CLOUD_FILE);
      const cloud = parse(cloudText, validate);
      if (!cloud) {
        // A nuvem está vazia (ou ilegível): ela passa a ter o save daqui.
        if (local) pending = local;
        flush();
        return local;
      }
      const localText = local ? JSON.stringify(local) : '';
      if (local && JSON.stringify(cloud) === localText) { lastWritten = cloudText; return local; }
      let useCloud = !local || stamp(cloud) > stamp(local);
      let conflict = false;
      if (local) {
        const newer = useCloud ? cloud : local;
        const older = useCloud ? local : cloud;
        conflict = lessProgress(progress(newer), progress(older));
        if (conflict && ask) {
          let choice = null;
          try { choice = ask({ local, cloud }); } catch (error) { log.warn('Escolha do save falhou:', error.message); }
          if (choice === 'cloud') useCloud = true;
          else if (choice === 'local') useCloud = false;
        }
      }
      if (useCloud) {
        try { adoptLocal(cloud, local); } catch (error) { log.warn('Save da nuvem não gravado aqui:', error.message); }
        lastWritten = cloudText;
        return cloud;
      }
      // O daqui vale: a nuvem passa a ter ele (num conflito, a versão que sai fica guardada como anterior).
      if (conflict) steam.cloudWrite(CLOUD_BACKUP, cloudText);
      pending = local;
      flush();
      return local;
    },

    // Depois de cada gravação boa: vai para a nuvem de vez em quando, sem martelar a Steam.
    push(state) {
      if (!steam.cloudEnabled()) return;
      pending = state;
      const wait = lastPush + every - now();
      if (wait <= 0) flush();
      else if (!timer) timer = schedule(() => { timer = null; flush(); }, wait);
    },

    flush
  };
}

module.exports = { createCloudSave, CLOUD_FILE, CLOUD_BACKUP, PUSH_EVERY_MS };
