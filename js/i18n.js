// fire-safety-bd -- language state + helpers (no DOM in here except storage keys).
(function (root) {
  'use strict';
  var LANG_KEY = 'fsbd-lang';
  var state = { lang: 'en' };
  try {
    var saved = (typeof localStorage !== 'undefined') ? localStorage.getItem(LANG_KEY) : null;
    if (saved === 'bn' || saved === 'en') state.lang = saved;
  } catch (e) { /* private mode: stay English */ }

  function t(key) {
    var s = (root.DATA && root.DATA.STRINGS[state.lang]) || {};
    return s[key] !== undefined ? s[key] : key;
  }
  function setLang(lang) {
    if (lang !== 'en' && lang !== 'bn') return;
    state.lang = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignore */ }
  }
  function getLang() { return state.lang; }
  function L(en, bn) { return state.lang === 'bn' ? bn : en; }

  root.I18N = { t: t, setLang: setLang, getLang: getLang, L: L };
})(typeof window !== 'undefined' ? window : globalThis);
