import { AttendanceRecord, AttendanceStatus, AttendanceType, Branch, Employee, Language, LeaveRequest, Shift } from '../types';
import { 
  DAY_OF_WEEK_NAMES_EN, 
  DAY_OF_WEEK_NAMES_KH, 
  isEmployeeDayOff, 
  isEmployeeSundayRest,
  getEmployeeLeaveOnDate 
} from './dayOffUtils';
import { doesRecordMatchEmployee } from './attendanceSyncManager';

export interface StaffRosterDay {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  dayIndex: number; // 0..6 (0 is Sunday, 1 is Monday...)
  dayNameKh: string; // e.g. "ច័ន្ទ"
  dayNameEn: string; // e.g. "Monday"
  dayShortKh: string; // e.g. "ច័ន្ទ"
  dayShortEn: string; // e.g. "Mon"
  formattedDateKh: string; // e.g. "២៩ កញ្ញា"
  formattedDateEn: string; // e.g. "29 Sep"
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;

  // Shift assignment
  shift: Shift;
  isDayOff: boolean;
  dayOffReasonKh?: string;
  dayOffReasonEn?: string;

  // Leave info
  isOnLeave: boolean;
  leaveRequest?: LeaveRequest;

  // Scan info
  hasScanned: boolean;
  hasScannedIn: boolean;
  hasScannedOut: boolean;
  checkInRecord?: AttendanceRecord;
  checkOutRecord?: AttendanceRecord;
  records: AttendanceRecord[];

  // Overall Status
  status: 'completed' | 'scanned_in' | 'not_scanned' | 'day_off' | 'on_leave' | 'future';
  statusLabelKh: string;
  statusLabelEn: string;
  statusDescriptionKh: string;
  statusDescriptionEn: string;
  badgeVariant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';

  // Times
  scheduledStart: string; // e.g. "06:30"
  scheduledEnd: string;   // e.g. "14:30"
  actualInTime?: string;  // e.g. "06:28 AM"
  actualOutTime?: string; // e.g. "02:35 PM"
  durationWorkedMinutes?: number;
  durationWorkedText?: string; // e.g. "8 ម៉ោង 07 នាទី" / "8h 07m"

  // Geofence & Lateness
  isWithinGeofence?: boolean;
  distanceToBranch?: number;
  isLate?: boolean;
  lateMinutes?: number;

  // Actions
  canScanIn: boolean;
  canScanOut: boolean;
}

/**
 * Returns Monday-Sunday week dates for the week containing referenceDate.
 */
export function getWeekDates(referenceDate: Date = new Date()): Date[] {
  const current = new Date(referenceDate);
  // Get day: 0 is Sunday, 1 is Monday, ... 6 is Saturday
  const day = current.getDay();
  // We want Monday as day 1 of the week. If day is 0 (Sunday), diff to Monday is -6.
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(current);
  monday.setDate(current.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const week: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    week.push(d);
  }
  return week;
}

/**
 * Formats a Date to YYYY-MM-DD in local time
 */
export function formatDateToYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats duration in minutes to localized string
 */
export function formatDurationMinutes(mins: number, lang: Language = 'km'): string {
  if (mins <= 0) return lang === 'km' ? '០ នាទី' : '0 min';
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;

  if (lang === 'km') {
    if (hours > 0 && remainingMins > 0) return `${hours} ម៉ោង ${remainingMins} នាទី`;
    if (hours > 0) return `${hours} ម៉ោង`;
    return `${remainingMins} នាទី`;
  } else {
    if (hours > 0 && remainingMins > 0) return `${hours}h ${remainingMins}m`;
    if (hours > 0) return `${hours}h`;
    return `${remainingMins}m`;
  }
}

/**
 * Intelligently resolves the assigned Shift for an employee.
 * Avoids blindly defaulting unassigned staff to half-day morning shifts (14:30),
 * respecting employee role, department, branch type, and punch time-of-day.
 */
export function resolveEmployeeShift(
  emp?: Partial<Employee> | null,
  shifts: Shift[] = [],
  branch?: { type?: string; id?: string } | null,
  punchDate?: Date | null
): Shift {
  const safeShifts = Array.isArray(shifts) && shifts.length > 0 ? shifts : [];

  // 1. Direct match by emp.shiftId
  if (emp && emp.shiftId) {
    const matched = safeShifts.find((s) => s && s.id === emp.shiftId);
    if (matched) {
      // If punchDate provided and employee is punching for an afternoon shift (12:30 - 15:30)
      // while their profile had morning shift, check if branch provides an afternoon shift
      if (punchDate instanceof Date && !isNaN(punchDate.getTime())) {
        const punchHour = punchDate.getHours();
        const punchMins = punchHour * 60 + punchDate.getMinutes();
        if (
          matched.shiftCategory === 'morning' &&
          punchMins >= 12 * 60 + 15 &&
          punchMins <= 16 * 60
        ) {
          const afternoonShift = safeShifts.find(
            (s) =>
              s.shiftCategory === 'afternoon' &&
              (branch?.type ? s.branchTypes.includes(branch.type) : true)
          );
          if (afternoonShift) return afternoonShift;
        }
      }
      return matched;
    }
  }

  // 2. Intelligent fallback based on branch type or department
  const branchType = branch?.type || '';
  const dept = String(emp?.department || emp?.departmentKh || '').toLowerCase();
  const role = String(emp?.role || '').toLowerCase();

  const isOffice =
    branchType === 'office' ||
    dept.includes('office') ||
    dept.includes('finance') ||
    dept.includes('hr') ||
    dept.includes('admin') ||
    dept.includes('គណនេយ្យ') ||
    dept.includes('ធនធានមនុស្ស') ||
    role.includes('admin') ||
    role.includes('manager') ||
    role.includes('hr');

  if (isOffice) {
    const officeShift = safeShifts.find(
      (s) => s.id === 'shift_office' || s.shiftCategory === 'office'
    );
    if (officeShift) return officeShift;
  }

  // Cafe or Gas Station full-time default (07:00 - 16:30, 8.5h)
  if (branchType === 'cafe') {
    const cafeFulltime = safeShifts.find(
      (s) => s.id === 'shift_cafe_fulltime' || (s.shiftCategory === 'full_time' && s.branchTypes.includes('cafe'))
    );
    if (cafeFulltime) return cafeFulltime;
  }

  if (branchType === 'gas_station') {
    const gasFulltime = safeShifts.find(
      (s) => s.id === 'shift_gas_fulltime' || (s.shiftCategory === 'full_time' && s.branchTypes.includes('gas_station'))
    );
    if (gasFulltime) return gasFulltime;
  }

  // General full-time shift fallback (instead of half-day morning shift)
  const anyFulltime = safeShifts.find(
    (s) => s.shiftCategory === 'full_time' || s.id.includes('fulltime') || s.id === 'shift_office'
  );
  if (anyFulltime) return anyFulltime;

  // Safe standard default
  return safeShifts[0] || {
    id: 'shift_default',
    nameKh: 'វេនស្តង់ដារពេញម៉ោង (08:00 - 17:30)',
    nameEn: 'Full-Time Standard Shift (08:00 - 17:30)',
    startTime: '08:00',
    endTime: '17:30',
    gracePeriodMins: 15,
    branchTypes: ['cafe', 'gas_station', 'office'],
    workHours: 8.5,
  };
}

/**
 * Finds the assigned Shift for an employee, or falls back to smart default
 */
export function getEmployeeAssignedShift(emp?: Employee, shifts: Shift[] = []): Shift {
  return resolveEmployeeShift(emp, shifts);
}

/**
 * Determines whether a punch record is on_time, late, overtime, or early_leave
 * based on the employee's assigned or custom work shift and grace period.
 */
export function determineAttendancePunchStatus(params: {
  punchDate: Date;
  targetType: AttendanceType;
  emp?: Employee | null;
  branch?: Branch | null;
  shifts?: Shift[];
  customStartTime?: string;
  customEndTime?: string;
}): AttendanceStatus {
  const { punchDate, targetType, emp, branch, shifts = [], customStartTime, customEndTime } = params;
  const safeDate = punchDate instanceof Date && !isNaN(punchDate.getTime()) ? punchDate : new Date();
  const punchHour = safeDate.getHours();
  const punchMins = safeDate.getMinutes();
  const currentTotalMins = punchHour * 60 + punchMins;

  const resolvedShift = resolveEmployeeShift(emp, shifts, branch, safeDate);
  const startTime = customStartTime || emp?.shiftStartTime || resolvedShift.startTime || '08:00';
  const endTime = customEndTime || emp?.shiftEndTime || resolvedShift.endTime || '17:30';
  const gracePeriodMins = resolvedShift.gracePeriodMins ?? 15;

  if (targetType === 'check_in') {
    const [startH, startM] = startTime.split(':').map(Number);
    const shiftStartTotalMins = (isNaN(startH) ? 8 : startH) * 60 + (isNaN(startM) ? 0 : startM);

    // If punch is at or before shift start + grace period, it is strictly ON-TIME
    // (Arriving early is always on-time!)
    if (currentTotalMins <= shiftStartTotalMins + gracePeriodMins) {
      return 'on_time';
    }

    // Check if employee is punching for an afternoon shift (e.g. arrived at 13:15 for 13:30 shift)
    if (shifts.length > 0 && currentTotalMins >= 12 * 60) {
      const afternoonShift = shifts.find(
        (s) =>
          (s.shiftCategory === 'afternoon' || s.id.includes('afternoon')) &&
          (branch?.type ? s.branchTypes?.includes(branch.type) : true)
      );
      if (afternoonShift) {
        const [aftH, aftM] = afternoonShift.startTime.split(':').map(Number);
        const aftStartTotalMins = (isNaN(aftH) ? 13 : aftH) * 60 + (isNaN(aftM) ? 30 : aftM);
        const aftGrace = afternoonShift.gracePeriodMins ?? 10;
        if (currentTotalMins <= aftStartTotalMins + aftGrace) {
          return 'on_time';
        }
      }
    }

    return 'late';
  } else {
    // Check-out
    const [endH, endM] = endTime.split(':').map(Number);
    const shiftEndTotalMins = (isNaN(endH) ? 17 : endH) * 60 + (isNaN(endM) ? 30 : endM);

    if (currentTotalMins >= shiftEndTotalMins + 30) {
      return 'overtime';
    }
    if (currentTotalMins < shiftEndTotalMins - 15) {
      return 'early_leave';
    }
    return 'on_time';
  }
}

/**
 * Accurately determines if a check-in record was on-time based on employee's shift.
 */
export function isRecordOnTime(
  rec: AttendanceRecord,
  employees: Employee[] = [],
  shifts: Shift[] = [],
  branches: Branch[] = []
): boolean {
  if (rec.type !== 'check_in') return false;
  if (rec.status === 'geofence_violation' || rec.status === 'pending_location_review') return false;

  const matchedEmp = employees.find((e) => doesRecordMatchEmployee(rec, e));
  const branch = branches.find((b) => b.id === (matchedEmp?.branchId || rec.branchId));
  const punchDate = new Date(rec.timestamp);

  const status = determineAttendancePunchStatus({
    punchDate,
    targetType: 'check_in',
    emp: matchedEmp,
    branch,
    shifts,
  });

  return status === 'on_time';
}

/**
 * Accurately determines if a check-in record was actually late based on employee's shift.
 */
export function isRecordLate(
  rec: AttendanceRecord,
  employees: Employee[] = [],
  shifts: Shift[] = [],
  branches: Branch[] = []
): boolean {
  if (rec.type !== 'check_in') return false;
  if (rec.status === 'geofence_violation' || rec.status === 'pending_location_review') return false;

  const matchedEmp = employees.find((e) => doesRecordMatchEmployee(rec, e));
  const branch = branches.find((b) => b.id === (matchedEmp?.branchId || rec.branchId));
  const punchDate = new Date(rec.timestamp);

  const status = determineAttendancePunchStatus({
    punchDate,
    targetType: 'check_in',
    emp: matchedEmp,
    branch,
    shifts,
  });

  return status === 'late';
}

/**
 * Computes the roster item for a specific employee on a specific date.
 */
export function getEmployeeRosterDay(
  emp: Employee,
  shifts: Shift[] = [],
  attendanceRecords: AttendanceRecord[] = [],
  leaveRequests: LeaveRequest[] = [],
  targetDate: Date = new Date()
): StaffRosterDay {
  const safeEmp: Employee = emp || {
    id: 'emp_default',
    code: 'EMP-000',
    nameKh: 'បុគ្គលិក',
    nameEn: 'Staff Member',
    branchId: 'br_main_hq',
    department: 'Operations',
    departmentKh: 'ប្រតិបត្តិការ',
    role: 'Staff',
    roleKh: 'បុគ្គលិក',
    shiftId: 'shift_office',
    avatar: '',
    phone: '',
    email: '',
    status: 'active',
    pinCode: '1234',
    weeklyDayOff: 0,
    hasSundayRest: true,
  };

  const safeTargetDate = targetDate instanceof Date && !isNaN(targetDate.getTime()) ? targetDate : new Date();
  const now = new Date();
  const todayStr = formatDateToYMD(now);
  const targetDateStr = formatDateToYMD(safeTargetDate);
  const dayIndex = safeTargetDate.getDay();

  const isToday = targetDateStr === todayStr;
  const isPast = targetDateStr < todayStr;
  const isFuture = targetDateStr > todayStr;

  const assignedShift = getEmployeeAssignedShift(safeEmp, shifts);
  const scheduledStart = safeEmp.shiftStartTime || assignedShift?.startTime || '08:00';
  const scheduledEnd = safeEmp.shiftEndTime || assignedShift?.endTime || '17:00';

  // 1. Check Day Off
  const isDayOff = isEmployeeDayOff(safeEmp, safeTargetDate);
  let dayOffReasonKh: string | undefined;
  let dayOffReasonEn: string | undefined;
  if (isDayOff) {
    if (dayIndex === 0 && isEmployeeSundayRest(safeEmp)) {
      dayOffReasonKh = 'ថ្ងៃអាទិត្យ សម្រាកប្រចាំសប្តាហ៍';
      dayOffReasonEn = 'Sunday Weekly Rest';
    } else {
      const dayKh = DAY_OF_WEEK_NAMES_KH[dayIndex] || 'សម្រាក';
      const dayEn = DAY_OF_WEEK_NAMES_EN[dayIndex] || 'Rest';
      dayOffReasonKh = `ថ្ងៃ${dayKh} សម្រាកប្រចាំសប្តាហ៍`;
      dayOffReasonEn = `${dayEn} Scheduled Day Off`;
    }
  }

  // 2. Check Leave
  const leave = getEmployeeLeaveOnDate(safeEmp, targetDateStr, leaveRequests);
  const isOnLeave = Boolean(leave);

  // 3. Find attendance records for this employee on this date (safely guarded)
  const safeRecords = Array.isArray(attendanceRecords) ? attendanceRecords : [];
  const records = safeRecords.filter((rec) => {
    if (!rec || !rec.timestamp) return false;
    const isSameEmp = 
      (safeEmp.id && rec.employeeId === safeEmp.id) || 
      (safeEmp.code && rec.employeeCode && rec.employeeCode.toLowerCase() === safeEmp.code.toLowerCase()) ||
      (safeEmp.id && rec.employeeId === safeEmp.id.replace('user_', '')) ||
      (safeEmp.nameEn && rec.employeeNameEn && safeEmp.nameEn.toLowerCase() === rec.employeeNameEn.toLowerCase());
    if (!isSameEmp) return false;
    const parsed = new Date(rec.timestamp);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-CA') === targetDateStr;
    }
    const rawDate = typeof rec.timestamp === 'string' ? rec.timestamp.slice(0, 10) : '';
    return rawDate === targetDateStr;
  });

  // Sort chronologically safely
  records.sort((a, b) => {
    const tA = a?.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tB = b?.timestamp ? new Date(b.timestamp).getTime() : 0;
    return (isNaN(tA) ? 0 : tA) - (isNaN(tB) ? 0 : tB);
  });

  let checkInRecord = records.find((r) => r && r.type === 'check_in');
  if (!checkInRecord && records.length > 0) {
    const earliest = records[0];
    if (new Date(earliest.timestamp).getHours() < 11 || records.length >= 2) {
      checkInRecord = earliest;
    }
  }

  let checkOutRecord = [...records]
    .reverse()
    .find((r) => r && r.type === 'check_out' && (!checkInRecord || r.id !== checkInRecord.id));
  if (!checkOutRecord && checkInRecord && records.length >= 2) {
    const latest = records[records.length - 1];
    const gapHours =
      (new Date(latest.timestamp).getTime() - new Date(checkInRecord.timestamp).getTime()) / (1000 * 60 * 60);
    if (latest.id !== checkInRecord.id && gapHours >= 1) {
      checkOutRecord = latest;
    }
  }

  const hasScannedIn = Boolean(checkInRecord);
  const hasScannedOut = Boolean(checkOutRecord);
  const hasScanned = hasScannedIn || hasScannedOut;

  // Calculate actual times safely
  let actualInTime: string | undefined;
  let actualOutTime: string | undefined;
  let durationWorkedMinutes: number | undefined;
  let durationWorkedText: string | undefined;
  let isWithinGeofence: boolean | undefined = undefined;
  let distanceToBranch: number | undefined = undefined;
  let isLate = false;
  let lateMinutes = 0;

  if (checkInRecord && checkInRecord.timestamp) {
    try {
      const dIn = new Date(checkInRecord.timestamp);
      actualInTime = isNaN(dIn.getTime()) ? undefined : dIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      isWithinGeofence = checkInRecord.isWithinGeofence;
      distanceToBranch = checkInRecord.distanceToBranch;

      // Lateness calculation
      const [startH, startM] = (scheduledStart || '08:00').split(':').map(Number);
      const scheduledStartMs = new Date(targetDate).setHours(startH || 0, startM || 0, 0, 0);
      const graceMins = assignedShift?.gracePeriodMins || 15;
      const graceThresholdMs = scheduledStartMs + graceMins * 60 * 1000;

      if (!isNaN(dIn.getTime()) && dIn.getTime() > graceThresholdMs) {
        isLate = true;
        lateMinutes = Math.max(1, Math.round((dIn.getTime() - scheduledStartMs) / 60000));
      }
    } catch {
      // Safe fallback
    }
  }

  if (checkOutRecord && checkOutRecord.timestamp) {
    try {
      const dOut = new Date(checkOutRecord.timestamp);
      actualOutTime = isNaN(dOut.getTime()) ? undefined : dOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (isWithinGeofence === undefined) {
        isWithinGeofence = checkOutRecord.isWithinGeofence;
        distanceToBranch = checkOutRecord.distanceToBranch;
      }
    } catch {
      // Safe fallback
    }
  }

  if (checkInRecord?.timestamp && checkOutRecord?.timestamp) {
    try {
      const startMs = new Date(checkInRecord.timestamp).getTime();
      const endMs = new Date(checkOutRecord.timestamp).getTime();
      if (!isNaN(startMs) && !isNaN(endMs) && endMs > startMs) {
        durationWorkedMinutes = Math.round((endMs - startMs) / 60000);
        durationWorkedText = formatDurationMinutes(durationWorkedMinutes, 'km');
      }
    } catch {}
  } else if (checkInRecord?.timestamp && isToday) {
    // Current duration ongoing
    try {
      const startMs = new Date(checkInRecord.timestamp).getTime();
      const nowMs = now.getTime();
      if (!isNaN(startMs) && nowMs > startMs) {
        durationWorkedMinutes = Math.round((nowMs - startMs) / 60000);
        durationWorkedText = formatDurationMinutes(durationWorkedMinutes, 'km');
      }
    } catch {}
  }

  // 4. Determine overall status & badges
  let status: StaffRosterDay['status'] = 'not_scanned';
  let statusLabelKh = 'មិនទាន់ស្កេន';
  let statusLabelEn = 'Not Scanned Yet';
  let statusDescriptionKh = 'មិនទាន់មានកំណត់ត្រាស្កេនវត្តមាននៅឡើយទេ';
  let statusDescriptionEn = 'No attendance punch recorded yet';
  let badgeVariant: StaffRosterDay['badgeVariant'] = 'warning';

  if (isOnLeave) {
    status = 'on_leave';
    const typeLabel = leave?.typeKh || leave?.type || 'ច្បាប់';
    statusLabelKh = `ច្បាប់ (${typeLabel})`;
    statusLabelEn = `On Leave (${leave?.type || 'Leave'})`;
    statusDescriptionKh = `បានអនុម័តច្បាប់ឈប់សម្រាក: ${leave?.reason || ''}`;
    statusDescriptionEn = `Approved leave: ${leave?.reason || ''}`;
    badgeVariant = 'info';
  } else if (isDayOff) {
    status = 'day_off';
    statusLabelKh = dayOffReasonKh || 'ថ្ងៃឈប់សម្រាក';
    statusLabelEn = dayOffReasonEn || 'Day Off';
    statusDescriptionKh = 'ថ្ងៃឈប់សម្រាកប្រចាំសប្តាហ៍ផ្លូវការ';
    statusDescriptionEn = 'Official weekly scheduled rest day';
    badgeVariant = 'neutral';
  } else if (hasScannedIn && hasScannedOut) {
    status = 'completed';
    statusLabelKh = 'បានស្កេនចូល & ចេញ';
    statusLabelEn = 'Completed (In & Out)';
    statusDescriptionKh = `ចូលម៉ោង ${actualInTime} • ចេញម៉ោង ${actualOutTime}`;
    statusDescriptionEn = `In at ${actualInTime} • Out at ${actualOutTime}`;
    badgeVariant = 'success';
  } else if (hasScannedIn && !hasScannedOut) {
    status = 'scanned_in';
    statusLabelKh = 'បានស្កេនចូលហើយ';
    statusLabelEn = 'Scanned In';
    statusDescriptionKh = `បានស្កេនចូលនៅម៉ោង ${actualInTime} (រង់ចាំស្កេនចេញ)`;
    statusDescriptionEn = `Clocked in at ${actualInTime} (awaiting clock out)`;
    badgeVariant = 'info';
  } else if (isFuture) {
    status = 'future';
    statusLabelKh = 'វេនគ្រោងទុក';
    statusLabelEn = 'Scheduled';
    statusDescriptionKh = `វេនការងារ ${scheduledStart} - ${scheduledEnd}`;
    statusDescriptionEn = `Shift planned ${scheduledStart} - ${scheduledEnd}`;
    badgeVariant = 'neutral';
  } else {
    // Past or today without scan
    status = 'not_scanned';
    if (isToday) {
      statusLabelKh = '⚠️ មិនទាន់ស្កេន!';
      statusLabelEn = '⚠️ Not Scanned Yet';
      statusDescriptionKh = `វេនចាប់ផ្តើមម៉ោង ${scheduledStart} • សូមស្កេន QR / GPS`;
      statusDescriptionEn = `Shift starts at ${scheduledStart} • Please punch QR / GPS`;
      badgeVariant = 'danger';
    } else {
      statusLabelKh = 'ខកខានស្កេន (Absent)';
      statusLabelEn = 'Missed Punch (Absent)';
      statusDescriptionKh = 'គ្មានកំណត់ត្រាស្កេនវត្តមានក្នុងប្រព័ន្ធឡើយ';
      statusDescriptionEn = 'No punch records detected for this working date';
      badgeVariant = 'danger';
    }
  }

  // Can scan rules
  const canScanIn = isToday && !isOnLeave && !isDayOff && !hasScannedIn;
  const canScanOut = isToday && hasScannedIn && !hasScannedOut;

  // Short formatting
  const monthsKh = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
  const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const mIdx = targetDate.getMonth();
  const dNum = targetDate.getDate();

  return {
    date: targetDate,
    dateStr: targetDateStr,
    dayIndex,
    dayNameKh: DAY_OF_WEEK_NAMES_KH[dayIndex] || '',
    dayNameEn: DAY_OF_WEEK_NAMES_EN[dayIndex] || '',
    dayShortKh: DAY_OF_WEEK_NAMES_KH[dayIndex] || '',
    dayShortEn: (DAY_OF_WEEK_NAMES_EN[dayIndex] || '').slice(0, 3),
    formattedDateKh: `${dNum} ${monthsKh[mIdx]}`,
    formattedDateEn: `${dNum} ${monthsEn[mIdx]}`,
    isToday,
    isPast,
    isFuture,
    shift: assignedShift,
    isDayOff,
    dayOffReasonKh,
    dayOffReasonEn,
    isOnLeave,
    leaveRequest: leave,
    hasScanned,
    hasScannedIn,
    hasScannedOut,
    checkInRecord,
    checkOutRecord,
    records,
    status,
    statusLabelKh,
    statusLabelEn,
    statusDescriptionKh,
    statusDescriptionEn,
    badgeVariant,
    scheduledStart,
    scheduledEnd,
    actualInTime,
    actualOutTime,
    durationWorkedMinutes,
    durationWorkedText,
    isWithinGeofence,
    distanceToBranch,
    isLate,
    lateMinutes,
    canScanIn,
    canScanOut,
  };
}

/**
 * Returns full weekly roster for an employee starting Monday.
 */
export function getEmployeeWeekRoster(
  emp: Employee,
  shifts: Shift[] = [],
  attendanceRecords: AttendanceRecord[] = [],
  leaveRequests: LeaveRequest[] = [],
  referenceDate: Date = new Date()
): StaffRosterDay[] {
  try {
    const safeRefDate = referenceDate instanceof Date && !isNaN(referenceDate.getTime()) ? referenceDate : new Date();
    const weekDates = getWeekDates(safeRefDate);
    return weekDates.map((d) =>
      getEmployeeRosterDay(emp, shifts, attendanceRecords, leaveRequests, d)
    );
  } catch (err) {
    console.error('getEmployeeWeekRoster error:', err);
    return [];
  }
}

/**
 * Team Roster Item
 */
export interface BranchTeamMemberRoster {
  employee: Employee;
  rosterDay: StaffRosterDay;
}

/**
 * Returns roster and scan status for all staff in a given branch on a specific date.
 */
export function getBranchTeamRoster(
  branchId: string,
  employees: Employee[] = [],
  shifts: Shift[] = [],
  attendanceRecords: AttendanceRecord[] = [],
  leaveRequests: LeaveRequest[] = [],
  targetDate: Date = new Date()
): BranchTeamMemberRoster[] {
  try {
    const safeEmployees = Array.isArray(employees) ? employees : [];
    const branchEmployees = safeEmployees.filter(
      (e) => e && (e.branchId === branchId || !branchId || branchId === 'all') && e.status !== 'inactive'
    );

    const teamList = branchEmployees.map((emp) => {
      const rosterDay = getEmployeeRosterDay(
        emp,
        shifts,
        attendanceRecords,
        leaveRequests,
        targetDate
      );
      return {
        employee: emp,
        rosterDay,
      };
    });

    // Sort order:
    // 1. Not scanned yet (working shift today)
    // 2. Scanned in (currently working)
    // 3. Completed (finished shift)
    // 4. On leave / Day off
    teamList.sort((a, b) => {
      const priority = (r: StaffRosterDay) => {
        if (!r) return 7;
        if (r.status === 'not_scanned') return 1;
        if (r.status === 'scanned_in') return 2;
        if (r.status === 'completed') return 3;
        if (r.status === 'on_leave') return 4;
        if (r.status === 'day_off') return 5;
        return 6;
      };
      return priority(a.rosterDay) - priority(b.rosterDay);
    });

    return teamList;
  } catch (err) {
    console.error('getBranchTeamRoster error:', err);
    return [];
  }
}
