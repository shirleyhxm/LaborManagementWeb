import type { OptimizationObjective } from "./scheduling";

/**
 * A staffing requirement on the wire.
 *
 * `payRate` and `payUplift` are the two forms of an event pay override, and at most one is
 * ever set — the backend rejects a requirement carrying both. They are separate fields
 * rather than a tagged union because that is the shape JSON can carry; the form is what
 * guarantees only one is populated.
 */
export interface EventStaffingRequirement {
  groupName: string;
  count: number;
  /** Pay this rate for the event instead of the employee's normal rate. */
  payRate?: number | null;
  /** Add this much per hour to the employee's normal rate for the event. */
  payUplift?: number | null;
}

/**
 * The rules an event may bend.
 *
 * Statutory limits are deliberately absent: weekly hour caps, rest, consecutive days and
 * breaks are about how much a person may safely work and do not become negotiable because
 * the work is a party.
 *
 * Null means "inherit the business rule". Storing null rather than a copied value is what
 * keeps an event tracking later changes to the business's own rules.
 */
export interface EventRuleOverrides {
  minShiftLength?: number | null;
  maxShiftLength?: number | null;
  coverageFraction?: number | null;
  laborCostBudget?: number | null;
}

export interface SpecialEvent {
  id: string;
  businessId: string;
  name: string;
  /** ISO date (YYYY-MM-DD) the event opens on. */
  date: string;
  /** "HH:mm". `endTime` may be earlier than `startTime` for an event running past midnight. */
  startTime: string;
  endTime: string;
  /** The date the event finishes — the day after `date` when it crosses midnight. */
  endDate: string;
  crossesMidnight: boolean;
  notes: string | null;
  /** Who may be scheduled. Empty means every schedulable employee is a candidate. */
  employeeIds: string[];
  /** Expected revenue by hour ("HH:mm" → amount), replacing the business forecast. */
  expectedRevenue: Record<string, number> | null;
  objective: OptimizationObjective;
  requirements: EventStaffingRequirement[];
  ruleOverrides: EventRuleOverrides | null;
  /** The schedule generated from this definition, once one exists. */
  scheduleId: string | null;
  createdAt: string;
  createdBy: string;
}

/** Body for creating or replacing an event. */
export interface SpecialEventRequest {
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string | null;
  employeeIds?: string[];
  expectedRevenue?: Record<string, number> | null;
  objective?: OptimizationObjective;
  requirements?: EventStaffingRequirement[];
  ruleOverrides?: EventRuleOverrides | null;
}

export interface SpecialEventListResponse {
  events: SpecialEvent[];
  total: number;
}
