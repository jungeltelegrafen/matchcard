// Language config shared by the client (toggles, storage, exports) and the AI
// routes (prompt output language). Add a language here and the CV content system
// picks it up; UI *chrome* strings stay bilingual (en/no) by design.

export const LANGS = ['en', 'no', 'es', 'sv', 'da', 'pl']

// Endonyms shown in the language toggles / menus.
export const LANG_ENDONYM = { en: 'English', no: 'Norsk', es: 'Español', sv: 'Svenska', da: 'Dansk', pl: 'Polski' }

// Names used inside AI prompts to set the output language.
export const LANG_NAME = { en: 'English', no: 'Norwegian (Bokmål)', es: 'Spanish', sv: 'Swedish', da: 'Danish', pl: 'Polish' }

export function langName(lang) {
  return LANG_NAME[lang] || LANG_NAME.en
}

// Coerce arbitrary input to a supported language code.
export function toLang(v, fallback = 'en') {
  return LANGS.includes(v) ? v : fallback
}
