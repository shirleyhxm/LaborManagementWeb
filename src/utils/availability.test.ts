import { describe, it, expect } from "vitest";
import {
  backendToUIAvailability,
  uiToBackendAvailability,
  parseEndHour,
} from "./availability";

const weekly = (dayOfWeek: string, startTime: string, endTime: string) => ({
  availabilityType: "WEEKLY_RECURRING" as const,
  dayOfWeek,
  startTime,
  endTime,
});

describe("parseEndHour", () => {
  it("reads a midnight end as the end of the day, not the start", () => {
    expect(parseEndHour("00:00")).toBe(24);
  });

  it("leaves every other hour alone", () => {
    expect(parseEndHour("17:00")).toBe(17);
    expect(parseEndHour("09:00")).toBe(9);
  });
});

describe("backendToUIAvailability", () => {
  it("expands a range into its half-open hours", () => {
    const ui = backendToUIAvailability([weekly("MONDAY", "09:00", "12:00")]);
    expect(ui.MONDAY).toEqual([9, 10, 11]);
  });

  // The regression: LocalTime normalizes an end of "24:00" to "00:00", which read
  // literally is hour 0 and yields an empty day. The editor then saves that
  // emptiness back, deleting availability nobody touched.
  it("does not drop a range that ends at midnight", () => {
    const ui = backendToUIAvailability([weekly("FRIDAY", "22:00", "00:00")]);
    expect(ui.FRIDAY).toEqual([22, 23]);
  });

  it("keeps untouched days intact alongside a midnight-ending one", () => {
    const ui = backendToUIAvailability([
      weekly("THURSDAY", "05:00", "06:00"),
      weekly("FRIDAY", "12:00", "00:00"),
    ]);
    expect(ui.THURSDAY).toEqual([5]);
    expect(ui.FRIDAY).toEqual([12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);
  });

  it("leaves days with no stored availability empty", () => {
    const ui = backendToUIAvailability([weekly("MONDAY", "09:00", "10:00")]);
    expect(ui.SUNDAY).toEqual([]);
  });
});

describe("uiToBackendAvailability", () => {
  it("merges consecutive hours into a single range", () => {
    expect(uiToBackendAvailability({ MONDAY: [9, 10, 11, 12, 13, 14, 15, 16] })).toEqual([
      weekly("MONDAY", "09:00", "17:00"),
    ]);
  });

  it("splits non-consecutive hours into separate ranges", () => {
    expect(uiToBackendAvailability({ MONDAY: [9, 10, 14, 15] })).toEqual([
      weekly("MONDAY", "09:00", "11:00"),
      weekly("MONDAY", "14:00", "16:00"),
    ]);
  });

  it("omits days with nothing selected", () => {
    expect(uiToBackendAvailability({ MONDAY: [], TUESDAY: [9] })).toEqual([
      weekly("TUESDAY", "09:00", "10:00"),
    ]);
  });
});

describe("availability round trip", () => {
  // What the editors actually do: load stored ranges into the grid, then save the
  // grid back unchanged. This must be a no-op — anything else is silent data loss.
  // Expected hours are written out literally rather than derived with
  // backendToUIAvailability: reusing the reader on both sides would compare the
  // parser against itself, and a reader that drops midnight ranges would drop
  // them from the expectation too and still pass.
  it.each([
    ["a normal day", [weekly("MONDAY", "09:00", "17:00")], { MONDAY: [9, 10, 11, 12, 13, 14, 15, 16] }],
    ["a day ending at midnight", [weekly("FRIDAY", "22:00", "00:00")], { FRIDAY: [22, 23] }],
    [
      "several days including a midnight end",
      [weekly("THURSDAY", "05:00", "06:00"), weekly("FRIDAY", "12:00", "00:00")],
      { THURSDAY: [5], FRIDAY: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23] },
    ],
  ])("survives opening and saving %s", (_label, stored, expectedHours) => {
    const reSaved = uiToBackendAvailability(backendToUIAvailability(stored));

    // Every hour the editor showed must still be covered after saving. A midnight
    // end is legitimately re-emitted as "24:00" (the backend normalizes it back to
    // "00:00"), so ranges are compared by the hours they cover, not by their text.
    const covered: Record<string, number[]> = {};
    reSaved.forEach(row => {
      const day = row.dayOfWeek!;
      covered[day] ??= [];
      for (let h = parseInt(row.startTime.split(':')[0]); h < parseEndHour(row.endTime); h++) {
        covered[day].push(h);
      }
    });

    Object.entries(expectedHours).forEach(([day, hoursForDay]) => {
      expect(covered[day] ?? []).toEqual(hoursForDay);
    });
  });
});
