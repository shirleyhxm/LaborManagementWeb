import type { Employee } from "../types/employee";

export const daysOfWeek = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

/**
 * Converting between the two shapes availability is expressed in.
 *
 * The editors (manager-side and employee-side) work in selected *hours* per day,
 * because that's what the clickable grid is. The API works in *ranges*. Both
 * conversions live here so the two editors can't drift apart — they were
 * duplicated, and the copies had already diverged on whether to send
 * `availabilityType`.
 */

/**
 * The exclusive end hour of a stored availability range.
 *
 * A range covering the last hour of the day is written as ending at "24:00" (see
 * uiToBackendAvailability), but the backend stores it as a LocalTime, which
 * normalizes that to "00:00" — so that's what comes back. Read literally, "00:00"
 * is hour 0, which is *before* every possible start hour, making the range empty:
 * the day would load with no hours selected, and saving the editor would then
 * write that emptiness back and silently delete the row.
 *
 * Midnight always means the end of the day here rather than the start of it,
 * because these are within-day ranges whose start is the earlier bound.
 */
export const parseEndHour = (endTime: string): number => {
  const hour = parseInt(endTime.split(':')[0]);
  return hour === 0 ? 24 : hour;
};

/** Stored ranges -> the hours each day's grid should show as selected. */
export const backendToUIAvailability = (
  backendAvailability: Employee['availability']
): Record<string, number[]> => {
  const uiAvailability: Record<string, number[]> = {};

  daysOfWeek.forEach(day => {
    uiAvailability[day] = [];
  });

  backendAvailability.forEach(avail => {
    if (!avail.dayOfWeek) return;
    const startHour = parseInt(avail.startTime.split(':')[0]);
    const endHour = parseEndHour(avail.endTime);

    // Ranges are half-open: an entry ending at 17:00 covers up to 16:59.
    for (let hour = startHour; hour < endHour; hour++) {
      if (!uiAvailability[avail.dayOfWeek].includes(hour)) {
        uiAvailability[avail.dayOfWeek].push(hour);
      }
    }
  });

  Object.keys(uiAvailability).forEach(day => {
    uiAvailability[day].sort((a, b) => a - b);
  });

  return uiAvailability;
};

/**
 * Selected hours -> stored ranges, merging consecutive hours into one entry.
 *
 * A day whose selection runs to the last hour ends at "24:00", which the backend
 * normalizes to "00:00" on the way in; parseEndHour reads it back.
 */
export const uiToBackendAvailability = (
  uiAvailability: Record<string, number[]>
): Employee['availability'] => {
  const backendAvailability: Employee['availability'] = [];

  Object.entries(uiAvailability).forEach(([day, hours]) => {
    if (hours.length === 0) return;

    const sortedHours = [...hours].sort((a, b) => a - b);
    let rangeStart = sortedHours[0];
    let rangeEnd = sortedHours[0] + 1;

    // Runs to length inclusive so the final range is flushed by the same branch
    // that closes every other one, rather than being appended separately.
    for (let i = 1; i <= sortedHours.length; i++) {
      const currentHour = sortedHours[i];

      if (currentHour === rangeEnd) {
        rangeEnd = currentHour + 1;
      } else {
        backendAvailability.push({
          availabilityType: "WEEKLY_RECURRING" as const,
          dayOfWeek: day,
          startTime: `${String(rangeStart).padStart(2, '0')}:00`,
          endTime: `${String(rangeEnd).padStart(2, '0')}:00`,
        });

        if (i < sortedHours.length) {
          rangeStart = currentHour;
          rangeEnd = currentHour + 1;
        }
      }
    }
  });

  return backendAvailability;
};
