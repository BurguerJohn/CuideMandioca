(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ArraiaI18n = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  // Idiomas do jogo. `steam` são os nomes de idioma da Steam (API currentGameLanguage) que caem em cada um.
  const LANGUAGES = [
    { id: 'pt-BR', name: 'Português (Brasil)', locale: 'pt-BR', steam: ['brazilian', 'portuguese'] },
    { id: 'en', name: 'English', locale: 'en-US', steam: ['english'] },
    { id: 'es', name: 'Español', locale: 'es-ES', steam: ['spanish', 'latam'] }
  ];
  // Quando o idioma da Steam (ou do sistema) não está na lista, o jogo abre em inglês.
  const FALLBACK = 'en';
  // Os textos originais do jogo (e de data.js) são em português: é o último recurso de qualquer chave.
  const SOURCE = 'pt-BR';

  // Os dicionários (src/lang/*.js) se registram aqui; no Node, são carregados sob demanda.
  function dictionaries() {
    const all = root.ARRAIA_LANGS || (root.ARRAIA_LANGS = {});
    if (typeof require === 'function' && typeof module === 'object') {
      for (const lang of LANGUAGES) {
        if (!all[lang.id]) {
          try { require(`./lang/${lang.id}.js`); } catch (_) { /* sem o arquivo: usa os outros */ }
        }
      }
    }
    return all;
  }

  const known = id => LANGUAGES.some(lang => lang.id === id);

  function fromSteam(name) {
    const clean = String(name || '').trim().toLowerCase();
    if (!clean) return null;
    return LANGUAGES.find(lang => lang.steam.includes(clean))?.id || FALLBACK;
  }

  function fromLocale(locale) {
    const clean = String(locale || '').trim().toLowerCase().replace('_', '-');
    if (!clean) return null;
    const exact = LANGUAGES.find(lang => lang.id.toLowerCase() === clean || lang.locale.toLowerCase() === clean);
    if (exact) return exact.id;
    const prefix = clean.split('-')[0];
    return LANGUAGES.find(lang => lang.id.split('-')[0] === prefix)?.id || FALLBACK;
  }

  // Idioma de fato: a escolha do jogador; se for "auto", o idioma do jogo na Steam; sem Steam, o do sistema.
  // Fora da lista, inglês.
  function resolve({ choice, steam, system } = {}) {
    if (choice && choice !== 'auto' && known(choice)) return choice;
    return fromSteam(steam) || fromLocale(system) || FALLBACK;
  }

  let current = SOURCE;

  function setLanguage(id) {
    current = known(id) ? id : FALLBACK;
    return current;
  }

  const language = () => current;
  const locale = (id = current) => LANGUAGES.find(lang => lang.id === id)?.locale || 'en-US';

  function lookup(key, id) {
    const dict = dictionaries()[id];
    return dict && dict.ui && Object.prototype.hasOwnProperty.call(dict.ui, key) ? dict.ui[key] : undefined;
  }

  function format(template, vars, id) {
    if (typeof template === 'function') return String(template(vars || {}));
    if (template && typeof template === 'object') {
      const count = Number(vars?.n);
      const rule = new Intl.PluralRules(locale(id)).select(Number.isFinite(count) ? count : 0);
      template = template[rule] ?? template.other;
    }
    return String(template).replace(/\{(\w+)\}/g, (match, name) => (vars && name in vars ? String(vars[name]) : match));
  }

  // Texto da interface. Cai do idioma atual para o inglês e depois para o português; sem nada, mostra a chave.
  function t(key, vars) {
    for (const id of [current, FALLBACK, SOURCE]) {
      const template = lookup(key, id);
      if (template !== undefined) return format(template, vars, id);
    }
    return key;
  }

  const has = (key, id = current) => lookup(key, id) !== undefined;

  // Troca os textos de GAME_DATA (nomes, descrições, cartas...) pelos do idioma. Muda o objeto no lugar e devolve ele.
  // Quem troca de idioma abre a página de novo (janela nova no PC), então os dados nunca precisam voltar ao original.
  function localizeData(data, id = current) {
    const override = dictionaries()[id]?.data;
    if (!override || id === SOURCE) return data;
    const byId = (list, table, fields) => {
      if (!table) return;
      for (const entry of list) {
        const text = table[entry.id];
        if (!text) continue;
        for (const field of fields) if (typeof text[field] === 'string') entry[field] = text[field];
      }
    };
    byId(data.stats, override.stats, ['name', 'unit', 'desc']);
    byId(data.tiers, override.tiers, ['name', 'unlocks']);
    byId(data.chars, override.chars, ['name', 'role', 'text']);
    byId(data.dances, override.dances, ['name']);
    byId(data.sets, override.sets, ['name']);
    byId(data.categories, override.categories, ['name']);
    byId(data.items, override.items, ['name', 'desc', 'effect']);
    byId(data.outings, override.outings, ['name']);
    byId(data.bonfire, override.bonfire, ['name', 'text']);
    byId(data.recipes || [], override.recipes, ['name', 'desc']);
    byId(data.foods || [], override.foods, ['name', 'desc']);
    byId(data.scenery.landmarks, override.landmarks, ['name']);
    byId(data.scenery.cycle, override.cycle, ['name']);
    byId(data.requests, override.requests, ['text']);
    byId(data.achievements, override.achievements, ['name', 'text']);
    for (const page of data.album || []) {
      const text = override.album?.[page.id];
      if (!text) continue;
      if (typeof text.name === 'string') page.name = text.name;
      for (const sticker of page.stickers) if (typeof text.stickers?.[sticker.id] === 'string') sticker.name = text.stickers[sticker.id];
    }
    for (const [key, text] of Object.entries(override.posts || {})) {
      if (data.posts[key] && typeof text.name === 'string') data.posts[key].name = text.name;
    }
    (override.rarities || []).forEach((name, index) => { if (data.rarities[index] && name) data.rarities[index].name = name; });
    if (Array.isArray(override.letters) && override.letters.length) data.letters = override.letters.slice();
    return data;
  }

  return { LANGUAGES, FALLBACK, SOURCE, resolve, fromSteam, fromLocale, setLanguage, language, locale, t, has,
    localizeData, dictionaries };
});
