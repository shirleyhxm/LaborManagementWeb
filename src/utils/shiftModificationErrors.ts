import { ApiError } from "../services/api";
import type { ViolationDto, ViolationType } from "../types/scheduling";

/**
 * A rejected shift move, phrased for the person who attempted it.
 *
 * `reasons` is the point of this type: the backend rejects a move with one
 * violation per broken rule, and the manager needs to know *which* rule broke
 * (availability? contract cap?) to know what to try instead. Collapsing them
 * into the response's summary message — "Cannot modify shift due to constraint
 * violations" — throws away the only part that tells them what to do next.
 */
export interface ShiftMoveError {
  /** One short line naming what went wrong overall. */
  title: string;
  /** The individual broken rules, most useful first. Possibly empty. */
  reasons: ShiftMoveReason[];
  /** True when the move may have partly applied and the grid can't be trusted. */
  requiresReload?: boolean;
}

export interface ShiftMoveReason {
  /** Short category label, e.g. "Availability". */
  label: string;
  /** The specific explanation, e.g. "Ann Lee isn't available Tuesday 09:00–17:00." */
  detail: string;
}

// Violation types the backend can return for a move, in the order a manager can
// act on them: the ones about *this* shift's placement come before the ones
// about the employee's totals, since fixing placement is usually the next step.
const REASON_ORDER: ViolationType[] = [
  "AVAILABILITY_CONFLICT",
  "SHIFT_OVERLAP",
  "CONTRACT_HOURS_EXCEEDED",
  "MISSING_BREAK",
  "BUDGET_EXCEEDED",
  "UNDERSTAFFING",
];

const REASON_LABELS: Record<ViolationType, string> = {
  AVAILABILITY_CONFLICT: "Availability",
  SHIFT_OVERLAP: "Overlapping shift",
  CONTRACT_HOURS_EXCEEDED: "Contract hours",
  MISSING_BREAK: "Break required",
  BUDGET_EXCEEDED: "Labor budget",
  UNDERSTAFFING: "Understaffed",
};

const titleCaseDay = (day: string): string =>
  day.charAt(0) + day.slice(1).toLowerCase();

// Times arrive as LocalTime's "HH:MM:SS"; the seconds are always zero here and
// only add noise to a sentence a human reads.
const formatTime = (time: string): string => time.slice(0, 5);

/**
 * Backend descriptions are already specific ("Employee Ann Lee is not available
 * on TUESDAY from 09:00 to 17:00"), so they're used as-is apart from tidying the
 * machine formatting: SCREAMING day names and seconds-precision times.
 */
const humanizeDescription = (description: string): string => {
  let text = description.replace(
    /\b(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\b/g,
    (day) => titleCaseDay(day)
  );
  text = text.replace(/\b(\d{2}:\d{2}):\d{2}\b/g, "$1");
  return text;
};

/**
 * Falls back to a sentence built from the violation's own fields, for the case
 * where the backend sends a type we can categorize but no usable description.
 */
const describeFromFields = (violation: ViolationDto): string => {
  const when = [
    violation.dayOfWeek ? titleCaseDay(violation.dayOfWeek) : null,
    violation.startTime && violation.endTime
      ? `${formatTime(violation.startTime)}–${formatTime(violation.endTime)}`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  const label = REASON_LABELS[violation.type] ?? "Scheduling rule";
  return when ? `${label} conflict on ${when}.` : `${label} conflict.`;
};

const toReason = (violation: ViolationDto): ShiftMoveReason => ({
  label: REASON_LABELS[violation.type] ?? "Scheduling rule",
  detail: violation.description?.trim()
    ? humanizeDescription(violation.description.trim())
    : describeFromFields(violation),
});

const sortViolations = (violations: ViolationDto[]): ViolationDto[] => {
  // Unknown types sort last rather than to the front, which is where a -1 index
  // would otherwise put them.
  const rank = (v: ViolationDto) => {
    const index = REASON_ORDER.indexOf(v.type);
    return index === -1 ? REASON_ORDER.length : index;
  };
  return [...violations].sort((a, b) => rank(a) - rank(b));
};

/**
 * Turns whatever `modifyShift` rejected with into something displayable.
 *
 * The 422 body carries `violations` at the top level (`ValidationErrorResponse`),
 * which is the detail worth surfacing. Everything else — 403 on a published
 * schedule, 404 on a stale shift id, a network drop — has only a message, so it
 * becomes a title with no reason list.
 */
export const describeShiftMoveError = (
  error: unknown,
  employeeName?: string
): ShiftMoveError => {
  const movedTo = employeeName ? ` to ${employeeName}` : "";
  return describeFailure(error, {
    verb: "move",
    subject: `this shift${movedTo}`,
    ruleTitle: `Can't move this shift${movedTo}`,
    unsavedDetail: "The move wasn't saved. Check your connection and try again.",
  });
};

/**
 * The delete equivalent of [describeShiftMoveError].
 *
 * Its own entry point rather than a flag: the wording differs throughout ("remove"
 * vs "move", no target employee to name), and a 404 means something different —
 * the shift is already gone, which is the outcome the user wanted, not a failure
 * they need to retry.
 */
export const describeShiftDeleteError = (error: unknown): ShiftMoveError => {
  if (error instanceof ApiError && error.status === 404) {
    return {
      title: "This shift is out of date",
      reasons: [
        {
          label: "Stale view",
          detail:
            "The shift was already removed or changed since this page loaded. Reload the schedule.",
        },
      ],
      requiresReload: true,
    };
  }

  return describeFailure(error, {
    verb: "remove",
    subject: "this shift",
    ruleTitle: "Can't remove this shift",
    unsavedDetail:
      "The shift wasn't removed. Check your connection and try again.",
  });
};

interface FailureWording {
  /** Used in the generic fallback title: "Couldn't {verb} {subject}". */
  verb: string;
  subject: string;
  /** Title for a rule-based (422) rejection. */
  ruleTitle: string;
  /** What to say when the request never reached the server. */
  unsavedDetail: string;
}

/**
 * The shared shape of a rejected shift edit. Move and delete fail in the same
 * ways — a rule (422), a published schedule (403), a stale id (404), a dropped
 * connection — and differ only in how each is worded.
 */
const describeFailure = (
  error: unknown,
  wording: FailureWording
): ShiftMoveError => {
  const data = error instanceof ApiError ? error.data : undefined;
  const violations: ViolationDto[] | undefined = Array.isArray(data?.violations)
    ? data.violations
    : undefined;

  if (violations?.length) {
    const reasons = sortViolations(violations).map(toReason);
    return {
      title:
        reasons.length === 1
          ? wording.ruleTitle
          : `${wording.ruleTitle} — ${reasons.length} rules would break`,
      reasons,
    };
  }

  if (error instanceof ApiError) {
    // A 422 with no violations we can read still means the request was rejected by
    // a rule, so say that rather than implying a transient failure worth retrying.
    if (error.status === 422) {
      return {
        title: wording.ruleTitle,
        reasons: [
          {
            label: "Scheduling rule",
            detail:
              data?.message ||
              error.message ||
              "The change breaks a scheduling rule.",
          },
        ],
      };
    }

    if (error.status === 403) {
      return {
        title: "This schedule can't be edited",
        reasons: [
          {
            label: "Published schedule",
            detail:
              data?.error ||
              error.message ||
              "Only draft schedules can be changed. Revert it to draft to make edits.",
          },
        ],
      };
    }

    if (error.status === 404) {
      return {
        title: "This shift is out of date",
        reasons: [
          {
            label: "Stale view",
            detail:
              "The shift changed since this page loaded. Reload the schedule and try again.",
          },
        ],
        requiresReload: true,
      };
    }

    if (error.isNetworkError) {
      return {
        title: "Couldn't reach the server",
        reasons: [
          {
            label: "Connection",
            detail: wording.unsavedDetail,
          },
        ],
      };
    }
  }

  return {
    title: `Couldn't ${wording.verb} ${wording.subject}`,
    reasons:
      error instanceof Error && error.message
        ? [{ label: "Error", detail: error.message }]
        : [],
  };
};
