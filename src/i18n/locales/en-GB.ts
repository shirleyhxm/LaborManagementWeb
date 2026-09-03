import type { DeepPartial } from '../types';
import type { TranslationBundle } from './en-US';

/**
 * British English — a sparse override of `en-US`.
 *
 * i18next resolves missing keys through the `en-US` fallback, so only the
 * strings that genuinely differ belong here: -our/-ise spellings, doubled
 * consonants, and the handful of terms with a different name in the UK
 * ("rota", "annual leave", "postcode").
 */
export const enGB: DeepPartial<TranslationBundle> = {
  common: {
    zipCode: 'Postcode',
    organization: 'Organisation',
  },

  nav: {
    schedule: 'Rota',
    optimize: 'Optimise',
  },

  dashboard: {
    laborCost: 'Labour Cost',
    scheduleCompliance: 'Rota Compliance',
    savesInLaborCost: 'Saves {{amount}} in labour cost',
  },

  schedule: {
    title: 'Rota',
    generate: 'Generate rota',
    newSchedule: 'New rota',
    untitled: 'Rota {{date}}',
    noShifts: 'No shifts scheduled',
    deleteShift: 'Delete shift',
    laborCostPercentOfSales: 'Labour Cost % of Sales',
  },

  analytics: {
    laborCost: 'Labour Cost',
    avgLaborCost: 'Avg Labour Cost',
    totalLaborCost: 'Total Labour Cost',
    laborCostVsSales: 'Labour Cost vs Sales Trend',
    laborPercent: 'Labour %',
  },

  rules: {
    laborBudget: 'Labour budget',
  },

  requests: {
    timeOff: 'Annual leave',
    vacation: 'Annual leave',
    sick: 'Sick leave',
    declined: 'Declined',
  },
};
