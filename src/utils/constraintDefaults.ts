import type { WorkingHoursRules } from "../types/constraints";

/**
 * What the working-hours rules are when a business has never saved any.
 *
 * The backend returns null rather than a default set, so anything displaying these rules
 * has to supply its own fallback. Shared rather than written out at each call site: the
 * event form shows these as the values an event inherits, and if its copy drifted from the
 * Rules page's, a manager would be told they were inheriting one thing while the page that
 * owns the setting showed another.
 *
 * Rest values follow UK statutory entitlements - 11 hours between working days and 24 hours
 * per week (gov.uk/rest-breaks-work).
 */
export const DEFAULT_WORKING_HOURS_RULES: Omit<WorkingHoursRules, "updatedAt"> = {
  maxHoursPerWeek: 40,
  maxOvertimeHours: 10,
  minRestBetweenShifts: 11,
  maxConsecutiveDays: 6,
  maxShiftLength: 12,
  minShiftLength: 1,
  minWeeklyRestHours: 24,
};
