const test = require('node:test');
const assert = require('node:assert/strict');
const { createCloudSave, CLOUD_FILE, CLOUD_BACKUP, PUSH_EVERY_MS } = require('../desktop/cloud-save');

const quiet = { warn() {} };
const save = (year, size, lastSeen) => ({ year, size, records: { size }, lastSeen });

// A Steam de mentira: a nuvem é um dicionário de arquivos.
function fakeSteam({ enabled = true, files = {}, writeOk = true } = {}) {
  const calls = [];
  return { files, calls,
    cloudEnabled: () => enabled,
    cloudRead: name => (name in files ? files[name] : null),
    cloudWrite: (name, content) => { calls.push(name); if (!writeOk) return false; files[name] = content; return true; } };
}

function setup(options = {}, extra = {}) {
  const steam = fakeSteam(options);
  const adopted = [];
  const asked = [];
  const timers = [];
  const clock = { t: 1_000_000 };
  const cloud = createCloudSave({ steam, log: quiet, now: () => clock.t,
    adoptLocal: (state, displaced) => adopted.push([state, displaced]),
    ask: extra.ask === undefined ? args => { asked.push(args); return null; } : extra.ask && (args => { asked.push(args); return extra.ask(args); }),
    schedule: (fn, ms) => { const timer = { fn, ms, cleared: false }; timers.push(timer); return timer; },
    cancel: timer => { timer.cleared = true; }, ...extra.create });
  return { steam, cloud, adopted, asked, timers, clock };
}

test('nuvem: sem a nuvem ligada (ou sem a Steam) nada muda e nada é enviado', () => {
  const { steam, cloud } = setup({ enabled: false });
  const local = save(1, 30, 100);
  assert.equal(cloud.enabled(), false);
  assert.equal(cloud.reconcile(local), local);
  assert.equal(cloud.reconcile(null), null);
  cloud.push(local);
  assert.equal(cloud.flush(), false);
  assert.deepEqual(steam.calls, []);
});

test('nuvem: na abertura a nuvem vazia (ou ilegível) recebe o save daqui', () => {
  for (const content of [undefined, '', 'isto não é json', '[1,2]', '"texto"', JSON.stringify(save(1, 5, 1)) + ' '.repeat(3 * 1024 * 1024)]) {
    const files = content === undefined ? {} : { [CLOUD_FILE]: content };
    const { steam, cloud, adopted } = setup({ files });
    const local = save(1, 30, 100);
    assert.equal(cloud.reconcile(local), local);
    assert.deepEqual(JSON.parse(steam.files[CLOUD_FILE]), local, `a nuvem recebe o save daqui (${String(content).slice(0, 12)})`);
    assert.deepEqual(adopted, []);
  }
  // Sem save daqui nem na nuvem não há o que enviar.
  const empty = setup();
  assert.equal(empty.cloud.reconcile(null), null);
  assert.deepEqual(empty.steam.calls, []);
});

test('nuvem: a validação do jogo também vale para o save da nuvem', () => {
  const files = { [CLOUD_FILE]: JSON.stringify(save(3, 80, 999)) };
  const steam = fakeSteam({ files });
  const cloud = createCloudSave({ steam, log: quiet, validate: state => state.year < 3, adoptLocal() { throw new Error('não devia adotar'); } });
  const local = save(1, 30, 100);
  assert.equal(cloud.reconcile(local), local, 'um save que o jogo recusa não substitui o daqui');
  assert.deepEqual(JSON.parse(steam.files[CLOUD_FILE]), local);
});

test('nuvem: o mais recente vale (da nuvem, grava aqui e guarda o outro; daqui, vai para a nuvem) e iguais não escrevem nada', () => {
  // Outro computador jogou mais recentemente.
  let t = setup({ files: { [CLOUD_FILE]: JSON.stringify(save(1, 60, 500)) } });
  const local = save(1, 30, 100);
  assert.deepEqual(t.cloud.reconcile(local), save(1, 60, 500));
  assert.deepEqual(t.adopted, [[save(1, 60, 500), local]], 'o da nuvem vai para o disco e o daqui é entregue para virar cópia');
  assert.deepEqual(t.steam.calls, [], 'a nuvem não é mexida');
  assert.deepEqual(t.asked, [], 'sem conflito ninguém é perguntado');
  // Este computador jogou mais recentemente: a nuvem recebe o save daqui.
  t = setup({ files: { [CLOUD_FILE]: JSON.stringify(save(1, 30, 100)) } });
  const newer = save(1, 60, 500);
  assert.equal(t.cloud.reconcile(newer), newer);
  assert.deepEqual(JSON.parse(t.steam.files[CLOUD_FILE]), newer);
  assert.equal(CLOUD_BACKUP in t.steam.files, false, 'sem conflito não sobra cópia na nuvem');
  assert.deepEqual(t.adopted, []);
  // Mesmo instante com conteúdos diferentes: o daqui fica (a nuvem recebe ele), sem trocar nada no disco.
  t = setup({ files: { [CLOUD_FILE]: JSON.stringify(save(1, 60, 100)) } });
  assert.deepEqual(t.cloud.reconcile(save(1, 30, 100)), save(1, 30, 100));
  assert.deepEqual(t.adopted, []);
  assert.deepEqual(JSON.parse(t.steam.files[CLOUD_FILE]), save(1, 30, 100));
  // Sem save daqui (computador novo): vale o da nuvem, e não há save para guardar.
  t = setup({ files: { [CLOUD_FILE]: JSON.stringify(save(2, 5, 500)) } });
  assert.deepEqual(t.cloud.reconcile(null), save(2, 5, 500));
  assert.deepEqual(t.adopted, [[save(2, 5, 500), null]]);
  // Iguais: nada é gravado.
  t = setup({ files: { [CLOUD_FILE]: JSON.stringify(save(1, 30, 100)) } });
  assert.deepEqual(t.cloud.reconcile(save(1, 30, 100)), save(1, 30, 100));
  assert.deepEqual(t.steam.calls, []);
  assert.deepEqual(t.adopted, []);
  // O ano pesa mais que os convidados: um ano novo mais recente não é conflito, mesmo com recorde menor que o do ano velho.
  t = setup({ files: { [CLOUD_FILE]: JSON.stringify(save(2, 5, 500)) } });
  t.cloud.reconcile(save(1, 100, 100));
  assert.deepEqual(t.asked, []);
  assert.equal(t.adopted.length, 1);
});

test('nuvem: se o save mais recente tem menos progresso a pessoa escolhe, e o que perde fica guardado', () => {
  const old = save(1, 100, 100);
  const fresh = save(1, 3, 900);
  // Nuvem mais nova e com menos progresso (uma festa nova começada em outro computador): escolher a nuvem.
  let t = setup({ files: { [CLOUD_FILE]: JSON.stringify(fresh) } }, { ask: () => 'cloud' });
  assert.deepEqual(t.cloud.reconcile(old), fresh);
  assert.deepEqual(t.asked, [{ local: old, cloud: fresh }]);
  assert.deepEqual(t.adopted, [[fresh, old]]);
  // Escolher o daqui: ele vai para a nuvem e a versão da nuvem fica como anterior.
  t = setup({ files: { [CLOUD_FILE]: JSON.stringify(fresh) } }, { ask: () => 'local' });
  assert.deepEqual(t.cloud.reconcile(old), old);
  assert.deepEqual(JSON.parse(t.steam.files[CLOUD_FILE]), old);
  assert.deepEqual(JSON.parse(t.steam.files[CLOUD_BACKUP]), fresh);
  assert.deepEqual(t.adopted, []);
  // O contrário: o daqui é o mais novo e tem menos progresso; escolher a nuvem grava ela aqui.
  t = setup({ files: { [CLOUD_FILE]: JSON.stringify(old) } }, { ask: () => 'cloud' });
  assert.deepEqual(t.cloud.reconcile(fresh), old);
  assert.deepEqual(t.adopted, [[old, fresh]]);
  // Sem resposta (janela fechada, erro) vale o mais recente, como sempre; ainda assim o perdedor fica guardado.
  for (const ask of [() => null, () => { throw new Error('sem janela'); }]) {
    t = setup({ files: { [CLOUD_FILE]: JSON.stringify(fresh) } }, { ask });
    assert.deepEqual(t.cloud.reconcile(old), fresh);
    assert.deepEqual(t.adopted, [[fresh, old]]);
  }
  t = setup({ files: { [CLOUD_FILE]: JSON.stringify(old) } }, { ask: () => null });
  assert.deepEqual(t.cloud.reconcile(fresh), fresh, 'o daqui é o mais novo');
  assert.deepEqual(JSON.parse(t.steam.files[CLOUD_BACKUP]), old, 'a nuvem que sai fica como anterior');
  // Sem a função de perguntar também vale o mais recente.
  t = setup({ files: { [CLOUD_FILE]: JSON.stringify(fresh) } }, { ask: false });
  assert.deepEqual(t.cloud.reconcile(old), fresh);
});

test('nuvem: o save vai para a nuvem no máximo uma vez por minuto (só o último), e sair manda o que faltou', () => {
  const t = setup({ files: { [CLOUD_FILE]: JSON.stringify(save(1, 30, 100)) } });
  t.cloud.reconcile(save(1, 30, 100));
  t.steam.calls.length = 0;
  // Logo depois da abertura: o save espera o minuto passar (um único temporizador).
  t.clock.t += 10_000;
  t.cloud.push(save(1, 31, 200));
  t.clock.t += 10_000;
  t.cloud.push(save(1, 32, 300));
  assert.deepEqual(t.steam.calls, []);
  assert.equal(t.timers.length, 1);
  assert.equal(t.timers[0].ms, PUSH_EVERY_MS - 10_000, 'espera o que falta do minuto, contado desde a abertura (o primeiro push veio 10 s depois)');
  // O temporizador dispara: vai só o último.
  t.clock.t += 40_000;
  t.timers[0].fn();
  assert.deepEqual(t.steam.calls, [CLOUD_FILE]);
  assert.deepEqual(JSON.parse(t.steam.files[CLOUD_FILE]), save(1, 32, 300));
  // Passado o minuto, a próxima gravação vai direto.
  t.clock.t += PUSH_EVERY_MS;
  t.cloud.push(save(1, 33, 400));
  assert.deepEqual(JSON.parse(t.steam.files[CLOUD_FILE]), save(1, 33, 400));
  // Sair: o que está esperando vai na hora e o temporizador some.
  t.clock.t += 1000;
  t.cloud.push(save(1, 34, 500));
  assert.equal(JSON.parse(t.steam.files[CLOUD_FILE]).size, 33);
  const waiting = t.timers.at(-1);
  assert.equal(t.cloud.flush(), true);
  assert.equal(waiting.cleared, true);
  assert.equal(JSON.parse(t.steam.files[CLOUD_FILE]).size, 34);
  // Sem nada pendente, flush não faz nada.
  const writes = t.steam.calls.length;
  assert.equal(t.cloud.flush(), false);
  assert.equal(t.steam.calls.length, writes);
});

test('nuvem: gravação que a Steam recusa fica pendente para a próxima vez, e o mesmo conteúdo não é enviado de novo', () => {
  const steam = fakeSteam({ files: {}, writeOk: false });
  const cloud = createCloudSave({ steam, log: quiet, now: () => 5_000_000, schedule: () => ({}), cancel() {} });
  cloud.push(save(1, 30, 100));
  assert.deepEqual(steam.calls, [CLOUD_FILE], 'o primeiro envio vai na hora, e a Steam recusou');
  assert.equal(cloud.flush(), false, 'continua pendente (tenta de novo)');
  assert.equal(steam.calls.length, 2);
  const state = save(1, 30, 100);
  const tentativa = fakeSteam({ files: {} });
  const ok = createCloudSave({ steam: tentativa, log: quiet, now: () => 5_000_000, schedule: () => ({}), cancel() {} });
  ok.push(state);
  assert.equal(tentativa.calls.length, 1, 'o primeiro envio vai na hora');
  ok.push(state);
  assert.equal(ok.flush(), true, 'conteúdo igual ao que já está na nuvem');
  assert.equal(tentativa.calls.length, 1, 'e não é enviado de novo');
  // Save grande demais não vai.
  const huge = { ...save(1, 30, 100), lixo: 'x'.repeat(3 * 1024 * 1024) };
  const grande = fakeSteam({ files: {} });
  const big = createCloudSave({ steam: grande, log: quiet, now: () => 5_000_000, schedule: () => ({}), cancel() {} });
  big.push(huge);
  assert.equal(big.flush(), false);
  assert.deepEqual(grande.calls, []);
});
