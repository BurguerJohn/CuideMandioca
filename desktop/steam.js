'use strict';

// Integração com a Steam (steamworks.js): idioma do jogo, nome do jogador, conquistas e o que os amigos veem
// ("Rich Presence"). Sem a Steam aberta, ou em desenvolvimento, tudo vira no-op e o jogo roda normal.
const fs = require('node:fs');
const path = require('node:path');

// App ID 480 é o "Spacewar", o app de testes da Valve: serve para desenvolver sem ter o jogo publicado.
// `npm run steam:config -- APP_ID DEPOT_ID` grava o App ID de verdade em desktop/steam.json.
const DEFAULTS = Object.freeze({ appId: 480, required: false, overlay: false });
const CONFIG_FILE = path.join(__dirname, 'steam.json');

function readConfig(file = CONFIG_FILE) {
  let raw = {};
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { raw = {}; }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) raw = {};
  const appId = Number.isInteger(raw.appId) && raw.appId > 0 ? raw.appId : DEFAULTS.appId;
  return { appId, required: raw.required === true, overlay: raw.overlay === true };
}

// Nome da conquista no Steamworks: o id do jogo em maiúsculas, com _ (primeiro-passo → PRIMEIRO_PASSO).
const achievementName = id => String(id).toUpperCase().replace(/[^A-Z0-9]+/g, '_');

function createSteam({ config = readConfig(), load = () => require('steamworks.js'), log = console } = {}) {
  let steamworks = null;
  let client = null;
  let name = null;
  const confirmed = new Set();
  let pendingStore = false;
  let presence = '';

  const lib = () => {
    if (!steamworks) steamworks = load();
    return steamworks;
  };
  const safe = (fn, fallback = null) => {
    if (!client) return fallback;
    try { return fn(client); } catch (error) { log.warn('Steam:', error.message); return fallback; }
  };

  return {
    config,
    // Jogo aberto fora da Steam com um App ID de verdade: a Steam reabre ele por ela (e este processo deve sair).
    restartIfNeeded() {
      if (config.appId === DEFAULTS.appId) return false;
      try { return lib().restartAppIfNecessary(config.appId) === true; } catch (error) {
        log.warn('Steam indisponível:', error.message);
        return false;
      }
    },
    // A sobreposição (Shift+Tab) precisa de chaves do Chromium antes da janela existir.
    enableOverlay() {
      try { lib().electronEnableSteamOverlay(); return true; } catch (error) {
        log.warn('Sobreposição da Steam desligada:', error.message);
        return false;
      }
    },
    init() {
      if (client) return true;
      try {
        client = lib().init(config.appId);
        name = client.localplayer.getName() || null;
      } catch (error) {
        client = null;
        log.warn('Jogando sem a Steam:', error.message);
      }
      return !!client;
    },
    get available() { return !!client; },
    // Idioma escolhido para o jogo na Steam (nomes da API: "brazilian", "english", "spanish", "latam"...).
    language() { return safe(c => c.apps.currentGameLanguage() || null); },
    info() { return { on: !!client, name: client ? name : null, appId: config.appId }; },
    // Destrava na Steam tudo o que o save já tem. Quem já está destravado é lembrado, para não pedir de novo.
    syncAchievements(ids) {
      if (!client || !Array.isArray(ids)) return 0;
      let changed = 0;
      for (const id of ids) {
        const api = achievementName(id);
        if (confirmed.has(api)) continue;
        const done = safe(c => c.achievement.isActivated(api) || (c.achievement.activate(api) && ++changed > 0), false);
        if (done) confirmed.add(api);
      }
      if (changed) pendingStore = true;
      if (pendingStore && safe(c => c.stats.store(), false) === true) pendingStore = false;
      return changed;
    },
    // O que os amigos veem na lista da Steam. Os textos ficam no Steamworks (steam/rich_presence.vdf).
    setPresence({ tier, size }) {
      const key = `${tier}|${size}`;
      if (!client || key === presence) return;
      const sent = safe(c => {
        c.localplayer.setRichPresence('porte', String(tier));
        c.localplayer.setRichPresence('convidados', String(size));
        c.localplayer.setRichPresence('steam_display', '#Festa');
        return true;
      }, false);
      if (sent) presence = key;
    }
  };
}

module.exports = { createSteam, readConfig, achievementName, DEFAULTS };
