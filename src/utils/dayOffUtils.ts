import { Employee, Language, LeaveRequest } from '../types';

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
 * Checks if a given employee has a designated weekly day off on the given date.
 * - For Cafe shop staff: They don't have Sunday rest, but 1 day off per week (e.g. Monday, Tuesday, etc.)
 * - For Standard staff: Default day off is Sunday (0).
 */
export function isEmployeeDayOff(emp: Employee, dateInput: Date | string): boolean {
  const d = typeof dateInput === 'string'
    ? new Date(dateInput.includes('T') ? dateInput : `${dateInput}T12:00:00`)
    : dateInput;
  const dayIndex = d.getDay(); // 0 is Sunday, 1 is Monday, ...

  // Explicit weeklyDayOff set (0..6)
  if (emp.weeklyDayOff !== undefined && emp.weeklyDayOff !== null) {
    return emp.weeklyDayOff === dayIndex;
  }

  // Check if cafe staff by department or branch
  const isCafe =
    emp.hasSundayRest === false ||
    emp.branchId?.toLowerCase().includes('cafe') ||
    emp.department?.toLowerCase().includes('cafe') ||
    emp.department?.toLowerCase().includes('barista') ||
    emp.departmentKh?.includes('កាហ្វេ');

  if (isCafe) {
    // Default day off for cafe staff if not explicitly assigned: Monday (1)
    return dayIndex === 1;
  }

  // Standard office staff: Sunday (0) is weekly day off
  return dayIndex === 0;
}

/**
 * Checks if the employee is subject to standard Sunday company rest.
 * Returns false for Cafe shop / weekend shift staff who work on Sunday.
 */
export function isEmployeeSundayRest(emp: Employee): boolean {
  if (emp.hasSundayRest === false) {
    return false;
  }
  if (emp.weeklyDayOff !== undefined && emp.weeklyDayOff !== null) {
    return emp.weeklyDayOff === 0;
  }
  const isCafe =
    emp.branchId?.toLowerCase().includes('cafe') ||
    emp.department?.toLowerCase().includes('cafe') ||
    emp.department?.toLowerCase().includes('barista') ||
    emp.departmentKh?.includes('កាហ្វេ');

  return !isCafe;
}

/**
 * Returns formatted Day Off name for display.
 */
export function getEmployeeDayOffName(emp: Employee, lang: Language = 'km'): string {
  let dayIdx = 0;
  if (emp.weeklyDayOff !== undefined && emp.weeklyDayOff !== null) {
    dayIdx = emp.weeklyDayOff;
  } else if (!isEmployeeSundayRest(emp)) {
    dayIdx = 1; // Monday for cafe staff
  } else {
    dayIdx = 0; // Sunday
  }

  return lang === 'km' ? `ថ្ងៃ${DAY_OF_WEEK_NAMES_KH[dayIdx]}` : DAY_OF_WEEK_NAMES_EN[dayIdx];
}

/**
 * Retrieves any active approved or submitted leave request for an employee on a given date string (YYYY-MM-DD).
 */
export function getEmployeeLeaveOnDate(
  emp: Employee,
  dateStr: string,
  leaveRequests: LeaveRequest[]
): LeaveRequest | undefined {
  if (!leaveRequests || leaveRequests.length === 0) return undefined;

  return leaveRequests.find((lr) => {
    const isSameEmp = lr.employeeId === emp.id || lr.employeeCode === emp.code;
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
  const dayIndex = dateInput.getDay();
  const year = dateInput.getFullYear();
  const month = String(dateInput.getMonth() + 1).padStart(2, '0');
  const day = String(dateInput.getDate()).padStart(2, '0');
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
