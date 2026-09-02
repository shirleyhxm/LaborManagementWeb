import { describe, it, expect } from "vitest";
import { ApiError, NetworkError } from "../services/api";
import {
  describeShiftMoveError,
  describeShiftDeleteError,
} from "./shiftModificationErrors";

// Builds the 422 body the shift-modification endpoint actually returns:
// `violations` sits at the top level of ValidationErrorResponse.
const validationError = (violations: unknown[]) =>
  new ApiError("Cannot modify shift due to constraint violations", 422, {
    success: false,
    message: "Cannot modify shift due to constraint violations",
    violations,
  });

describe("describeShiftMoveError", () => {
  it("surfaces the availability reason instead of the generic message", () => {
    const result = describeShiftMoveError(
      validationError([
        {
          type: "AVAILABILITY_CONFLICT",
          description:
            "Employee Ann Lee is not available on TUESDAY from 09:00 to 17:00",
          scope: "SHIFT",
          employeeId: "e1",
          dayOfWeek: "TUESDAY",
          startTime: "09:00",
          endTime: "17:00",
        },
      ]),
      "Ann Lee"
    );

    expect(result.title).toBe("Can't move this shift to Ann Lee");
    expect(result.reasons).toEqual([
      {
        label: "Availability",
        detail: "Employee Ann Lee is not available on Tuesday from 09:00 to 17:00",
      },
    ]);
  });

  it("keeps the numbers in a contract-hours reason", () => {
    const result = describeShiftMoveError(
      validationError([
        {
          type: "CONTRACT_HOURS_EXCEEDED",
          description:
            "Total weekly hours (42.5) exceeds maximum (40.0) for Ann Lee",
          scope: "EMPLOYEE",
          employeeId: "e1",
        },
      ])
    );

    expect(result.reasons[0].label).toBe("Contract hours");
    expect(result.reasons[0].detail).toContain("42.5");
    expect(result.reasons[0].detail).toContain("40.0");
  });

  it("lists every broken rule, placement before totals", () => {
    const result = describeShiftMoveError(
      validationError([
        {
          type: "CONTRACT_HOURS_EXCEEDED",
          description: "Total weekly hours (42.5) exceeds maximum (40.0) for Ann Lee",
          scope: "EMPLOYEE",
          employeeId: "e1",
        },
        {
          type: "AVAILABILITY_CONFLICT",
          description: "Employee Ann Lee is not available on TUESDAY from 09:00 to 17:00",
          scope: "SHIFT",
          employeeId: "e1",
        },
      ])
    );

    expect(result.reasons.map((r) => r.label)).toEqual([
      "Availability",
      "Contract hours",
    ]);
    expect(result.title).toContain("2 rules would break");
  });

  it("strips the seconds the backend puts on times", () => {
    const result = describeShiftMoveError(
      validationError([
        {
          type: "SHIFT_OVERLAP",
          description: "Shift overlaps another from 09:00:00 to 17:00:00",
          scope: "SHIFT",
          employeeId: "e1",
        },
      ])
    );

    expect(result.reasons[0].detail).toBe("Shift overlaps another from 09:00 to 17:00");
  });

  it("falls back to the violation's own fields when the description is empty", () => {
    const result = describeShiftMoveError(
      validationError([
        {
          type: "AVAILABILITY_CONFLICT",
          description: "",
          scope: "SHIFT",
          employeeId: "e1",
          dayOfWeek: "SATURDAY",
          startTime: "10:00:00",
          endTime: "14:00:00",
        },
      ])
    );

    expect(result.reasons[0].detail).toBe(
      "Availability conflict on Saturday 10:00–14:00."
    );
  });

  it("still reports a rule failure on a 422 with no readable violations", () => {
    const result = describeShiftMoveError(validationError([]));

    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0].detail).toBe(
      "Cannot modify shift due to constraint violations"
    );
  });

  it("explains a published schedule rather than blaming a constraint", () => {
    const result = describeShiftMoveError(
      new ApiError("Forbidden", 403, {
        error:
          "Cannot modify shifts in PUBLISHED schedule. Only DRAFT schedules can be edited.",
      })
    );

    expect(result.title).toBe("This schedule can't be edited");
    expect(result.reasons[0].detail).toContain("PUBLISHED schedule");
  });

  it("asks for a reload when the shift id is stale", () => {
    const result = describeShiftMoveError(new ApiError("Not found", 404, {}));

    expect(result.requiresReload).toBe(true);
  });

  it("distinguishes a network drop from a rejected move", () => {
    const result = describeShiftMoveError(new NetworkError());

    expect(result.title).toBe("Couldn't reach the server");
    expect(result.reasons[0].detail).toContain("wasn't saved");
  });

  it("sorts unknown violation types last rather than first", () => {
    const result = describeShiftMoveError(
      validationError([
        { type: "SOMETHING_NEW", description: "A new rule", scope: "SCHEDULE" },
        {
          type: "AVAILABILITY_CONFLICT",
          description: "Not available",
          scope: "SHIFT",
        },
      ])
    );

    expect(result.reasons.map((r) => r.label)).toEqual([
      "Availability",
      "Scheduling rule",
    ]);
  });
});

describe("describeShiftDeleteError", () => {
  it("says the shift wasn't removed rather than not moved", () => {
    const result = describeShiftDeleteError(new NetworkError());

    expect(result.title).toBe("Couldn't reach the server");
    expect(result.reasons[0].detail).toContain("wasn't removed");
  });

  it("names removal, not movement, when nothing else is known", () => {
    const result = describeShiftDeleteError(new Error("boom"));

    expect(result.title).toBe("Couldn't remove this shift");
    expect(result.reasons[0].detail).toBe("boom");
  });

  it("treats a 404 as a stale view, since the shift is already gone", () => {
    const result = describeShiftDeleteError(new ApiError("Not found", 404, {}));

    expect(result.requiresReload).toBe(true);
    expect(result.reasons[0].detail).toContain("already removed");
  });

  it("explains a published schedule the same way a refused move does", () => {
    const result = describeShiftDeleteError(
      new ApiError("Forbidden", 403, {
        error:
          "Cannot delete shifts from PUBLISHED schedule. Only DRAFT schedules can be modified.",
      })
    );

    expect(result.title).toBe("This schedule can't be edited");
    expect(result.reasons[0].detail).toContain("PUBLISHED schedule");
  });

  it("still surfaces per-rule reasons if a delete is ever refused for them", () => {
    const result = describeShiftDeleteError(
      validationError([
        {
          type: "UNDERSTAFFING",
          description: "Only 1 of 3 required staff on MONDAY",
          scope: "TIME_BLOCK",
        },
      ])
    );

    expect(result.title).toBe("Can't remove this shift");
    expect(result.reasons[0].label).toBe("Understaffed");
    expect(result.reasons[0].detail).toBe("Only 1 of 3 required staff on Monday");
  });
});
