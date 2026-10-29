/**
 * Date and Timezone Utilities
 * Ensures accurate date comparisons in Cambodia timezone (UTC+7 / Asia/Phnom_Penh)
 * preventing UTC shift bugs where morning punches (00:00-06:59 UTC / 07:00-13:59 ICT)
 * or device timezone differences cause punches to be misclassified as yesterday.
 */

export const CAMBODIA_TIMEZONE = 'Asia/Phnom_Penh';

export function normalizeDateInput(dateInput: Date | string | number): Date | null {
  if (!dateInput) return null;
  if (typeof dateInput === 'string') {
    let clean = dateInput.trim();
    if (clean.includes(' ') && !clean.includes('T') && !clean.includes('Z')) {
      clean = clean.replace(' ', 'T') + 'Z';
    }
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  return isNaN(d.getTime()) ? null : d;
}

export function getLocalDateString(dateInput: Date | string | number = new Date()): string {
  const d = normalizeDateInput(dateInput);
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: CAMBODIA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch (_) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export function isSameLocalDate(
  dateA?: Date | string | number | null,
  dateB: Date | string | number = new Date()
): boolean {
  if (!dateA || !dateB) return false;
  const strA = getLocalDateString(dateA);
  const strB = getLocalDateString(dateB);
  if (!strA || !strB) return false;
  return strA === strB;
}

export function isToday(dateInput?: Date | string | number | null): boolean {
  return isSameLocalDate(dateInput, new Date());
}
