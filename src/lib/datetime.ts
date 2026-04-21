/**
 * Helpers for `<input type="datetime-local">` ⇄ ISO-8601 (UTC) round-trips.
 *
 * Why this exists:
 *   `<input type="datetime-local">` produces a string like `YYYY-MM-DDTHH:MM`
 *   that represents a *local* wall-clock time with no timezone information.
 *   If you feed it an ISO UTC string via `.slice(0, 16)`, the input shows the
 *   UTC clock as if it were local — and when the user submits, `new Date(...)`
 *   parses it as local time, shifting the value by the local UTC offset every
 *   time the form is saved. These helpers do the timezone math correctly so
 *   values round-trip without drift.
 */

/** Convert an ISO (UTC) string to the local wall-clock form `datetime-local` expects. */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // Build the local components by hand so we don't accidentally show UTC.
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/** Interpret a `datetime-local` value (in the user's local TZ) as an ISO UTC string. */
export function localInputToISO(local: string): string {
  if (!local) return '';
  // `new Date(YYYY-MM-DDTHH:MM)` is parsed as local time by every modern
  // browser, so converting to ISO gives us the correct UTC instant.
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}
