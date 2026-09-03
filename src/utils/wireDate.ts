/**
 * Conversion for the employee API's `dd/MM/yyyy` date format.
 *
 * The backend accepts and returns dates only in this day-first form, so it is
 * what gets stored in form state and sent over the wire. It is deliberately
 * never *displayed* — "01/02/1995" reads as 1 February to a British user and
 * 2 January to an American one. Render with the locale formatters instead and
 * keep this string at the API boundary.
 */

/** `dd/MM/yyyy` -> Date, or undefined when empty or malformed. */
export function parseWireDate(value: string): Date | undefined {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return undefined;

  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  // The Date constructor silently rolls over impossible dates — 31/02 becomes
  // 3 March — so round-trip the parts to confirm it kept what we gave it.
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return undefined;
  }
  return date;
}

/** Date -> `dd/MM/yyyy`, using local parts so the day can't shift by timezone. */
export function formatWireDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}
