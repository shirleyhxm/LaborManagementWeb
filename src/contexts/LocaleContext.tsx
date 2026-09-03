import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import {
  DEFAULT_REGION,
  LOCALE_STORAGE_KEY,
  REGIONS,
  getRegion,
  resolveRegion,
} from '../i18n/regions';
import type { RegionCode, RegionDefinition } from '../i18n/regions';

interface LocaleContextType {
  /** The active region code, e.g. 'en-GB'. */
  locale: RegionCode;
  /** Currency, week start, clock convention and friends for the active region. */
  region: RegionDefinition;
  setLocale: (code: RegionCode) => void;
  availableRegions: RegionDefinition[];
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();

  // i18next is initialised with the detected region before render, so it is
  // the single source of truth rather than a duplicated piece of state.
  const locale = resolveRegion(i18n.resolvedLanguage ?? i18n.language);

  const setLocale = useCallback(
    (code: RegionCode) => {
      localStorage.setItem(LOCALE_STORAGE_KEY, code);
      void i18n.changeLanguage(code);
    },
    [i18n],
  );

  // Keep <html lang>/<html dir> in step so screen readers and browser features
  // (spellcheck, hyphenation, translation prompts) see the right language.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LocaleContextType>(
    () => ({
      locale,
      region: getRegion(locale),
      setLocale,
      availableRegions: Object.values(REGIONS),
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}

/**
 * Read the stored region outside React (services, non-component helpers).
 * Components should use `useLocale` so they re-render on a region change.
 */
export function getStoredLocale(): RegionCode {
  return resolveRegion(localStorage.getItem(LOCALE_STORAGE_KEY) ?? DEFAULT_REGION);
}
