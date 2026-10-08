/**
 * Date and Timezone Utilities
 * Ensures accurate date comparisons in local timezone (e.g. UTC+7 in Cambodia / SE Asia)
 * preventing UTC shift bugs where morning punches (00:00-06:59 UTC) belong to the next local calendar day.
 */

export function getLocalDateString(dateInput: Date | string | number = new Date()): string {
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isSameLocalDate(
  dateA?: Date | string | number | null,
  dateB: Date | string | number = new Date()
): boolean {
  if (!dateA) return false;
  const da = typeof dateA === 'string' || typeof dateA === 'number' ? new Date(dateA) : dateA;
  const db = typeof dateB === 'string' || typeof dateB === 'number' ? new Date(dateB) : dateB;
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return false;
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function isToday(dateInput?: Date | string | number | null): boolean {
  return isSameLocalDate(dateInput, new Date());
}
