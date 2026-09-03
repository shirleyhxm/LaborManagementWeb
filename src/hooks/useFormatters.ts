import { useMemo } from 'react';

import { useLocale } from '../contexts/LocaleContext';
import * as fmt from '../utils/formatters';
import type { DateInput } from '../utils/formatters';

/**
 * The formatting functions from `utils/formatters`, pre-bound to the region the
 * user has selected.
 *
 * Components call `formatCurrency(1234)` rather than threading the region
 * through every call site, and re-render automatically when the region changes
 * because the returned object identity changes with it.
 */
export function useFormatters() {
  const { region } = useLocale();

  return useMemo(
    () => ({
      region,

      formatCurrency: (amount: number, options?: Parameters<typeof fmt.formatCurrency>[2]) =>
        fmt.formatCurrency(region, amount, options),
      formatCurrencyCompact: (amount: number) => fmt.formatCurrencyCompact(region, amount),
      formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
        fmt.formatNumber(region, value, options),
      formatPercent: (ratio: number, options?: Intl.NumberFormatOptions) =>
        fmt.formatPercent(region, ratio, options),

      formatDate: (value: DateInput, options?: Intl.DateTimeFormatOptions) =>
        fmt.formatDate(region, value, options),
      formatDateMedium: (value: DateInput) => fmt.formatDateMedium(region, value),
      formatDateLong: (value: DateInput) => fmt.formatDateLong(region, value),
      formatDateShortWeekday: (value: DateInput) => fmt.formatDateShortWeekday(region, value),
      formatDateRange: (start: DateInput, end: DateInput) =>
        fmt.formatDateRange(region, start, end),

      formatTime: (value: DateInput, options?: Intl.DateTimeFormatOptions) =>
        fmt.formatTime(region, value, options),
      formatDateTime: (value: DateInput) => fmt.formatDateTime(region, value),
      formatClockTime: (time: string) => fmt.formatClockTime(region, time),
      formatClockTimeCompact: (time: string) => fmt.formatClockTimeCompact(region, time),
      formatHourLabel: (hour: number) => fmt.formatHourLabel(region, hour),

      getWeekdayNames: (format?: 'long' | 'short' | 'narrow') =>
        fmt.getWeekdayNames(region, format),
      getWeekdayNamesByEnum: (format?: 'long' | 'short' | 'narrow') =>
        fmt.getWeekdayNamesByEnum(region, format),
      getMonthNames: (format?: 'long' | 'short') => fmt.getMonthNames(region, format),

      /** 0 = Sunday, 1 = Monday. Pass straight to date-fns `weekStartsOn`. */
      weekStartsOn: region.weekStartsOn,
      currency: region.currency,
      /** Bare symbol ("$", "£") for labels that embed it inline. */
      currencySymbol: fmt.getCurrencySymbol(region),
    }),
    [region],
  );
}
