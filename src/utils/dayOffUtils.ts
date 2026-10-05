import { Employee, Language, LeaveRequest, Shift } from '../types';

export const DAY_OF_WEEK_NAMES_EN = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const DAY_OF_WEEK_NAMES_KH = [
  'អាទិត្យ',
  'ច័ន្ទ',
  'អង្គារ',
  'ពុធ',
  'ព្រហស្បតិ៍',
  'សុក្រ',
  'សៅរ៍',
];

/**
 * Checks if staff belongs to shift-based operations (Cafe, Barista, Gas Station, Logistics, Club)
 * who do not follow standard Sunday-only office rest.
 */
export function isShiftBasedWorker(emp: Employee): boolean {
  if (!emp) return false;
  if (emp.hasSundayRest === false) return true;
  if (emp.weeklyDayOff !== undefined && emp.weeklyDayOff !== 0) return true;
  
  const text = `${emp.branchId || ''} ${emp.department || ''} ${emp.departmentKh || ''} ${emp.role || ''} ${emp.roleKh || ''} ${emp.shiftId || ''}`.toLowerCase();
  return (
    text.includes('cafe') ||
    text.includes('barista') ||
    text.includes('កាហ្វេ') ||
    text.includes('gas') ||
    text.includes('fuel') ||
    text.includes('ប្រេង') ||
    text.includes('ស្ថានីយ') ||
    text.includes('warehouse') ||
    text.includes('ឃ្លាំង') ||
    text.includes('club') ||
    text.includes('ក្លិប')
  );
}

/**
 * Checks if a given employee has a designated weekly day off on the given date.
 * - If weeklyDayOff is -1, it means rotating / no fixed day off (always allowed).
 * - For Cafe/Barista & Gas Station staff: They typically have 1 weekday off (e.g. Monday, Tuesday, etc.)
 * - For Standard office staff: Default day off is Sunday (0).
 */
export function isEmployeeDayOff(emp: Employee, dateInput: Date | string): boolean {
  if (!emp) return false;
  const d = typeof dateInput === 'string'
    ? new Date(dateInput.includes('T') ? dateInput : `${dateInput}T12:00:00`)
    : (dateInput instanceof Date && !isNaN(dateInput.getTime()) ? dateInput : new Date());
  const dayIndex = d.getDay(); // 0 is Sunday, 1 is Monday, ...

  // -1 means rotating or no fixed day off
  if (emp.weeklyDayOff === -1) {
    return false;
  }

  // Explicit weeklyDayOff set (0..6)
  if (emp.weeklyDayOff !== undefined && emp.weeklyDayOff !== null) {
    return emp.weeklyDayOff === dayIndex;
  }

  // Check if cafe/barista or gas station staff
  if (isShiftBasedWorker(emp)) {
    // Default day off if not specified: Monday (1)
    return dayIndex === 1;
  }

  // Standard office staff: Sunday (0) is weekly day off
  return dayIndex === 0;
}

/**
 * Checks if the employee is subject to standard Sunday company rest.
 * Returns false for Cafe shop / Gas station / shift staff who work on Sunday.
 */
export function isEmployeeSundayRest(emp: Employee): boolean {
  if (!emp) return false;
  if (emp.hasSundayRest === false) {
    return false;
  }
  if (emp.weeklyDayOff !== undefined && emp.weeklyDayOff !== null) {
    return emp.weeklyDayOff === 0;
  }
  return !isShiftBasedWorker(emp);
}

/**
 * Returns formatted Day Off name for display.
 */
export function getEmployeeDayOffName(emp: Employee, lang: Language = 'km'): string {
  if (!emp) return lang === 'km' ? 'ថ្ងៃសម្រាក' : 'Day Off';
  if (emp.weeklyDayOff === -1) {
    return lang === 'km' ? '🔄 វេនវិលជុំ (Rotating)' : '🔄 Rotating';
  }
  
  let dayIdx = 0;
  if (emp.weeklyDayOff !== undefined && emp.weeklyDayOff !== null) {
    dayIdx = emp.weeklyDayOff;
  } else if (!isEmployeeSundayRest(emp)) {
    dayIdx = 1; // Monday for shift staff
  } else {
    dayIdx = 0; // Sunday
  }

  const name = lang === 'km' ? `ថ្ងៃ${DAY_OF_WEEK_NAMES_KH[dayIdx] || 'សម្រាក'}` : (DAY_OF_WEEK_NAMES_EN[dayIdx] || 'Day Off');
  return name;
}

/**
 * Returns formatted working hours for an employee, taking into account custom overrides or shift defaults.
 */
export function getEmployeeWorkingHours(emp: Employee, shift?: Shift, lang: Language = 'km'): string {
  if (emp.workingHoursText) {
    return emp.workingHoursText;
  }
  if (emp.shiftStartTime && emp.shiftEndTime) {
    const hours = emp.scheduledDailyHours ? ` (${emp.scheduledDailyHours}${lang === 'km' ? ' ម៉ោង' : 'h'})` : '';
    return `${emp.shiftStartTime} - ${emp.shiftEndTime}${hours}`;
  }
  if (shift) {
    const hours = shift.workHours ? ` (${shift.workHours}${lang === 'km' ? ' ម៉ោង' : 'h'})` : '';
    return `${shift.startTime} - ${shift.endTime}${hours}`;
  }
  return lang === 'km' ? '០៨:០០ - ១៧:៣០ (៨.៥ ម៉ោង)' : '08:00 - 17:30 (8.5h)';
}

/**
 * Returns badge styling and icon name for an employee's shift category.
 */
export function getShiftCategoryBadge(shiftId: string = '', lang: Language = 'km'): {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  label: string;
  iconType: 'morning' | 'afternoon' | 'full_time' | 'night' | 'standard';
} {
  const s = shiftId.toLowerCase();
  if (s.includes('morning') || s.includes('ព្រឹក')) {
    return {
      badgeBg: 'bg-amber-50',
      badgeText: 'text-amber-800',
      badgeBorder: 'border-amber-200',
      label: lang === 'km' ? 'វេនព្រឹក (Morning)' : 'Morning Shift',
      iconType: 'morning',
    };
  }
  if (s.includes('afternoon') || s.includes('រសៀល')) {
    return {
      badgeBg: 'bg-orange-50',
      badgeText: 'text-orange-800',
      badgeBorder: 'border-orange-200',
      label: lang === 'km' ? 'វេនរសៀល (Afternoon)' : 'Afternoon Shift',
      iconType: 'afternoon',
    };
  }
  if (s.includes('full') || s.includes('fulltime') || s.includes('ពេញម៉ោង')) {
    return {
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-800',
      badgeBorder: 'border-emerald-200',
      label: lang === 'km' ? 'វេនពេញម៉ោង (Full-Time)' : 'Full-Time Shift',
      iconType: 'full_time',
    };
  }
  if (s.includes('night') || s.includes('យប់') || s.includes('club')) {
    return {
      badgeBg: 'bg-purple-50',
      badgeText: 'text-purple-800',
      badgeBorder: 'border-purple-200',
      label: lang === 'km' ? 'វេនយប់ (Night Shift)' : 'Night Shift',
      iconType: 'night',
    };
  }
  return {
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-800',
    badgeBorder: 'border-blue-200',
    label: lang === 'km' ? 'វេនស្តង់ដារ' : 'Standard Shift',
    iconType: 'standard',
  };
}

/**
 * Retrieves any active approved or submitted leave request for an employee on a given date string (YYYY-MM-DD).
 */
export function getEmployeeLeaveOnDate(
  emp: Employee,
  dateStr: string,
  leaveRequests: LeaveRequest[]
): LeaveRequest | undefined {
  if (!emp || !leaveRequests || leaveRequests.length === 0) return undefined;

  return leaveRequests.find((lr) => {
    if (!lr || !lr.startDate || !lr.endDate) return false;
    const isSameEmp = 
      (emp.id && lr.employeeId === emp.id) || 
      (emp.code && lr.employeeCode === emp.code);
    if (!isSameEmp) return false;
    // Consider approved or pending/submitted leaves
    if (lr.status !== 'approved' && lr.status !== 'pending') return false;

    const start = lr.startDate.slice(0, 10);
    const end = lr.endDate.slice(0, 10);
    return dateStr >= start && dateStr <= end;
  });
}

export interface PunchAllowanceResult {
  allowed: boolean;
  reason?: string;
  reasonKh?: string;
  type?: 'sunday_rest' | 'day_off' | 'leave';
}

/**
 * Validates whether an employee is permitted to punch attendance today.
 * Strictly enforces:
 * 1. Sunday rest is not allowed for staff with Sunday off
 * 2. Designated weekly Day Off is not allowed
 * 3. Approved / active Leave is not allowed
 */
export function validatePunchAllowance(
  emp: Employee,
  leaveRequests: LeaveRequest[] = [],
  dateInput: Date = new Date()
): PunchAllowanceResult {
  if (!emp) return { allowed: true };
  const d = dateInput instanceof Date && !isNaN(dateInput.getTime()) ? dateInput : new Date();
  const dayIndex = d.getDay();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  // 1. Check for Active / Approved Leave
  const leave = getEmployeeLeaveOnDate(emp, todayStr, leaveRequests);
  if (leave) {
    const typeLabel = leave.typeKh || leave.type || 'ច្បាប់ឈប់សម្រាក';
    return {
      allowed: false,
      type: 'leave',
      reason: `Employee is on scheduled leave (${leave.type}) on ${todayStr}. Attendance punch is not allowed.`,
      reasonKh: `បុគ្គលិកមានច្បាប់ឈប់សម្រាក (${typeLabel}) នៅថ្ងៃនេះ។ មិនអនុញ្ញាតឱ្យកត់ត្រាវត្តមានឡើយ!`,
    };
  }

  // 2. Check for Sunday Rest (for staff whose rest day is Sunday)
  if (dayIndex === 0 && isEmployeeSundayRest(emp)) {
    return {
      allowed: false,
      type: 'sunday_rest',
      reason: `Today is Sunday Weekly Rest Day for ${emp.nameEn}. Attendance punch is not allowed.`,
      reasonKh: `ថ្ងៃនេះជាថ្ងៃអាទិត្យ សម្រាកប្រចាំសប្តាហ៍ផ្លូវការ។ មិនអនុញ្ញាតឱ្យកត់ត្រាវត្តមានឡើយ!`,
    };
  }

  // 3. Check for Designated Weekly Day Off (e.g. Monday, Tuesday, etc. for Cafe staff)
  if (isEmployeeDayOff(emp, dateInput)) {
    const dayNameKh = DAY_OF_WEEK_NAMES_KH[dayIndex];
    const dayNameEn = DAY_OF_WEEK_NAMES_EN[dayIndex];
    return {
      allowed: false,
      type: 'day_off',
      reason: `Today is ${emp.nameEn}'s scheduled Day Off (${dayNameEn}). Attendance punch is not allowed.`,
      reasonKh: `ថ្ងៃនេះជាថ្ងៃឈប់សម្រាកប្រចាំសប្តាហ៍ (ថ្ងៃ${dayNameKh} - Day Off) របស់ ${emp.nameKh}។ មិនអនុញ្ញាតឱ្យកត់ត្រាវត្តមានឡើយ!`,
    };
  }

  return { allowed: true };
}
