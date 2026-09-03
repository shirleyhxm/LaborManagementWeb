import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { enUS } from './locales/en-US';
import { enGB } from './locales/en-GB';
import {
  DEFAULT_REGION,
  LOCALE_STORAGE_KEY,
  REGION_CODES,
  resolveRegion,
} from './regions';

/**
 * Picks the startup region: an explicit stored choice wins, otherwise we infer
 * one from the browser's preferred languages.
 */
function detectInitialRegion() {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored) return resolveRegion(stored);

  const browserLanguages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  // Prefer the first browser language we recognise outright before falling
  // back to the fuzzy English matching in `resolveRegion`.
  for (const tag of browserLanguages) {
    if (!tag) continue;
    const match = REGION_CODES.find(
      (code) => code.toLowerCase() === tag.toLowerCase(),
    );
    if (match) return match;
  }

  return resolveRegion(browserLanguages[0]);
}

i18n.use(initReactI18next).init({
  resources: {
    'en-US': { translation: enUS },
    'en-GB': { translation: enGB },
  },
  lng: detectInitialRegion(),
  // British English is a sparse override; anything it omits resolves here.
  fallbackLng: DEFAULT_REGION,
  supportedLngs: REGION_CODES,
  // Keys are namespaced with dots ('nav.dashboard'), so ':' must not also be
  // treated as a namespace separator.
  nsSeparator: false,
  interpolation: {
    // React escapes interpolated values already.
    escapeValue: false,
  },
  returnNull: false,
});

export default i18n;
export * from './regions';
