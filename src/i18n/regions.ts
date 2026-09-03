/**
 * Region definitions for localization.
 *
 * A "region" bundles everything that varies by locale: the language resources,
 * the currency, the date/time conventions, and the day the working week starts
 * on. Adding a new region means adding an entry here plus a translation bundle
 * in `./locales`.
 */

export type RegionCode = 'en-US' | 'en-GB';

export interface RegionDefinition {
  /** BCP 47 tag, also used as the i18next language key. */
  code: RegionCode;
  /** Shown in the region picker. */
  label: string;
  /** Short label for compact UI (e.g. the collapsed sidebar). */
  shortLabel: string;
  flag: string;
  /** ISO 4217 code passed to Intl.NumberFormat. */
  currency: string;
  /** 0 = Sunday, 1 = Monday — matches date-fns `weekStartsOn`. */
  weekStartsOn: 0 | 1;
  /** True when the region writes times as 1:30 PM rather than 13:30. */
  use12HourClock: boolean;
  /** IANA zone used as the default when a business has none configured. */
  defaultTimezone: string;
}

export const REGIONS: Record<RegionCode, RegionDefinition> = {
  'en-US': {
    code: 'en-US',
    label: 'United States',
    shortLabel: 'US',
    flag: '🇺🇸',
    currency: 'USD',
    weekStartsOn: 0,
    use12HourClock: true,
    defaultTimezone: 'America/New_York',
  },
  'en-GB': {
    code: 'en-GB',
    label: 'United Kingdom',
    shortLabel: 'UK',
    flag: '🇬🇧',
    currency: 'GBP',
    weekStartsOn: 1,
    use12HourClock: false,
    defaultTimezone: 'Europe/London',
  },
};

export const REGION_CODES = Object.keys(REGIONS) as RegionCode[];

export const DEFAULT_REGION: RegionCode = 'en-US';

export const LOCALE_STORAGE_KEY = 'preferred_locale';

/**
 * Maps an arbitrary language tag onto a supported region. Anything we don't
 * recognise falls back to the default rather than leaving the UI untranslated.
 */
export function resolveRegion(tag: string | null | undefined): RegionCode {
  if (!tag) return DEFAULT_REGION;

  const normalized = tag.toLowerCase();
  const exact = REGION_CODES.find((code) => code.toLowerCase() === normalized);
  if (exact) return exact;

  // `en-AU`, `en-IE`, `en-NZ` etc. share British conventions far more than
  // American ones, so treat non-US English as en-GB.
  if (normalized.startsWith('en')) {
    return normalized.startsWith('en-us') ? 'en-US' : 'en-GB';
  }

  return DEFAULT_REGION;
}

export function getRegion(code: RegionCode): RegionDefinition {
  return REGIONS[code] ?? REGIONS[DEFAULT_REGION];
}
