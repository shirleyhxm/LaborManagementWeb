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
    appDescriptor: 'Labour Management System',
    laborRequirements: 'Set up labour requirements and compliance',
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
    creator: 'Rota Creator',
    titleLabel: 'Rota Title',
    defaultTitle: 'Rota {{start}} - {{end}}',
    dropToInclude: 'Drop here to include in rota',
    headingWithCount_one: 'Rota ({{count}} shift)',
    headingWithCount_other: 'Rota ({{count}} shifts)',
    scheduleView: 'Rota View',
    undoTooltip: 'Restore the rota to before the last change',
    weekly: 'Weekly Rota',
    loading: 'Loading rota...',
    compliant: 'Rota is compliant with all constraints',
    levelIssues: 'Rota-Level Issues ({{count}})',
    replace: 'Replace Rota',
    replaceConfirmTitle: 'Replace Existing Rota?',
    replaceConfirmBody:
      'Creating a new rota for this date range will permanently delete the existing rota. This action cannot be undone.',
    rulesNoticeBefore: 'Labour cost budget and working-hour limits are configured in',
    rulesNoticeLink: 'Rules',
    rulesNoticeAfter: '.',
    businessHoursLabel: 'Business Hours',
    businessHoursReadOnlyHint:
      'Shifts are only created inside these hours. Only the account owner can change them.',
    businessHoursClosed: 'Closed',
    businessHoursOpen: 'Open',
    businessHoursEditDay: 'Edit hours for this day',
    businessHoursEveryWeek: 'Apply to every {{day}}',
    businessHoursAddLabel: 'Add label',
    businessHoursLabelPlaceholder: 'Example: Staff training',
    businessHoursClosedCount_one: '{{count}} closed day',
    businessHoursClosedCount_other: '{{count}} closed days',
    businessHoursLoading: 'Loading business hours…',
    optimizationObjective: 'Optimisation Objective',
    objectiveMinimizeCost: 'Minimise Labour Cost',
    objectiveMaximizeSales: 'Maximise Sales Coverage',
    objectiveBalanced: 'Balanced Approach',
    objectiveMaximizeFairness: 'Maximise Fairness',
    noShifts: 'No shifts scheduled',
    deleteShift: 'Delete shift',
    laborCostPercentOfSales: 'Labour Cost % of Sales',
  },

  event: {
    generate: 'Generate Rota',
    notGenerated: 'No rota has been generated for this event yet.',
    generateFailed: 'Could not generate the rota',
    replaceConfirmTitle: 'Replace this rota?',
    replaceConfirmBody:
      'The current rota is replaced, including any shifts you have moved by hand. It will also pick up any changes made to your business rules since it was last generated. This action cannot be undone.',
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
    hardBudgetHint: 'Rota cannot exceed the wage budget below.',
    budgetWarningHint: 'Alert when the rota approaches this percentage of the budget.',
    prioritiesHint: 'Order of importance when optimising rotas.',
    // Not "Minor Labour Laws": the UK equivalent of US child-labor law is the
    // young-worker provisions of the Working Time Regulations, and that is what
    // a UK manager would look for.
    minorLaborLaws: 'Young Worker Rules',
    onCostHint:
      'Employer-side costs on top of wage pay, such as Employer National Insurance. Reported alongside labour cost and used to validate true staffing cost - not counted against the wage cost budget.',
    laborCostBudget: 'Labour cost budget',
  },

  requests: {
    timeOff: 'Annual leave',
    vacation: 'Annual leave',
    sick: 'Sick leave',
    declined: 'Declined',
  },

  portal: {
    mySchedule: 'My Rota',
    // "PTO" is an Americanism; UK employment law and payroll call this
    // annual leave, counted in days of holiday.
    timeOff: 'Annual Leave',
    timeOffRequests: 'Annual Leave Requests',
    requestTimeOff: 'Request Annual Leave',
    availablePto: 'Available Annual Leave',
    vacationDays: 'Holiday Days',
    reasonPlaceholder: 'Holiday, personal, etc.',
    plannedVsActual: 'Planned vs. Actual',
    noTimeOffRequests: 'No annual leave requests',
    approvedTimeOff: 'Approved annual leave',
    approvedTimeOffReason: 'Approved annual leave: {{reason}}',
    requestTimeOffTitle: 'Request annual leave',
    timeOffSubmitted: 'Annual leave request submitted.',
    timeOffCancelled: 'Annual leave request cancelled.',
    timeOffSubmitFailed: 'Failed to submit annual leave request',
    timeOffCancelFailed: 'Failed to cancel annual leave request',
  },
};
