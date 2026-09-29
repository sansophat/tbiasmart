import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas-pro';
import { AttendanceRecord, Branch, Employee, Language, LeaveRequest } from '../types';
import { isEmployeeDayOff, isEmployeeSundayRest, getEmployeeLeaveOnDate, getEmployeeDayOffName } from './dayOffUtils';

export interface TimesheetRow {
  no: number;
  enrollId: string;
  employeeId: string;
  nameEn: string;
  nameKh: string;
  avatar?: string;
  department: string;
  role: string;
  branchId: string;
  branchNameEn: string;
  branchNameKh: string;
  date: string;
  dayOfWeek: string;
  isSunday: boolean;
  isDayOff?: boolean;
  isLeave?: boolean;
  timeIn: string;
  timeOut: string;
  durationHours: string;
  status: string;
  remark: string;
}

export interface EmployeeMergedSummary {
  employeeId: string;
  enrollId: string;
  nameEn: string;
  nameKh: string;
  avatar?: string;
  department: string;
  role: string;
  branchId: string;
  branchNameEn: string;
  branchNameKh: string;
  totalDaysInRange: number;
  daysPresent: number;
  daysAbsent: number;
  daysOff: number;
  daysLeave: number;
  daysLate: number;
  daysOnTime: number;
  daysOvertime: number;
  totalWorkHours: number;
  totalOtHours: number;
  sundaysCount: number;
  attendanceRate: number;
  dailyRecords: TimesheetRow[];
}

export function getDatesInRange(startDateStr: string, endDateStr: string): string[] {
  if (!startDateStr || !endDateStr) return [];
  const startParts = startDateStr.split('-').map(Number);
  const endParts = endDateStr.split('-').map(Number);
  if (startParts.length < 3 || endParts.length < 3) return [];

  const [sY, sM, sD] = startParts;
  const [eY, eM, eD] = endParts;

  // Set to 12:00:00 (noon) local time: immune to DST or midnight rollover
  const curr = new Date(sY, sM - 1, sD, 12, 0, 0);
  const end = new Date(eY, eM - 1, eD, 12, 0, 0);

  const dates: string[] = [];
  while (curr <= end) {
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

export function generateDailyTimesheetRows(
  records: AttendanceRecord[],
  employees: Employee[],
  branches: Branch[],
  startDateStr: string,
  endDateStr: string,
  branchFilter: string = 'all',
  employeeFilter: string = 'all',
  leaveRequests: LeaveRequest[] = []
): TimesheetRow[] {
  // Filter employees by branch and by employee
  let targetEmployees = branchFilter === 'all'
    ? employees
    : employees.filter((e) => e.branchId === branchFilter);

  if (employeeFilter !== 'all') {
    targetEmployees = targetEmployees.filter(
      (e) => e.id === employeeFilter || e.code === employeeFilter || e.nameEn === employeeFilter
    );
  }

  const dates = getDatesInRange(startDateStr, endDateStr);
  if (dates.length === 0) {
    return [];
  }

  const rows: TimesheetRow[] = [];
  let rowNumber = 1;

  dates.forEach((dateStr) => {
    const [y, m, dNum] = dateStr.split('-').map(Number);
    const d = new Date(y, m - 1, dNum, 12, 0, 0);
    const dayIndex = d.getDay(); // 0 is Sunday
    const isSunday = dayIndex === 0;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayNamesKh = ['អាទិត្យ', 'ច័ន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
    const dayOfWeekStr = `${dayNames[dayIndex]} (${dayNamesKh[dayIndex]})`;

    // Only add global sunday marker row if viewing multi-employee consolidated roster
    if (isSunday && employeeFilter === 'all') {
      rows.push({
        no: rowNumber++,
        enrollId: '---',
        employeeId: 'sunday_marker',
        nameEn: '🔴 SUNDAY REST DAY',
        nameKh: '🔴 ថ្ងៃអាទិត្យ (ទិវាសម្រាកប្រចាំសប្តាហ៍)',
        department: 'All Departments',
        role: 'Weekend Off-Duty',
        branchId: branchFilter,
        branchNameEn: branchFilter === 'all' ? 'All Enterprise Branches' : (branches.find(b => b.id === branchFilter)?.nameEn || 'Branch'),
        branchNameKh: branchFilter === 'all' ? 'គ្រប់សាខាទាំងអស់' : (branches.find(b => b.id === branchFilter)?.nameKh || 'សាខា'),
        date: dateStr,
        dayOfWeek: dayOfWeekStr,
        isSunday: true,
        isDayOff: true,
        timeIn: '--:--',
        timeOut: '--:--',
        durationHours: '0.0h',
        status: 'SUNDAY_OFF',
        remark: 'Official Company Weekly Rest Day / ថ្ងៃសម្រាកផ្លូវការ',
      });
    }

    targetEmployees.forEach((emp) => {
      const empBranch = branches.find((b) => b.id === emp.branchId) || branches[0];
      const isDayOff = isEmployeeDayOff(emp, dateStr);
      const isSunRest = isSunday && isEmployeeSundayRest(emp);
      const empLeave = getEmployeeLeaveOnDate(emp, dateStr, leaveRequests);
      
      // Find punches for this employee on this date
      const dayPunches = records.filter(
        (r) =>
          (r.employeeId === emp.id || r.employeeCode === emp.code) &&
          r.timestamp.startsWith(dateStr)
      );

      const checkIns = dayPunches.filter((p) => p.type === 'check_in').sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      const checkOuts = dayPunches.filter((p) => p.type === 'check_out').sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      let timeInStr = '--:--';
      let timeOutStr = '--:--';
      let statusStr = 'Absent / No Punch';
      let remarkStr = 'No attendance logged for this date';
      let workHours = '0.0h';
      let isDayOffFlag = false;
      let isLeaveFlag = false;

      if (checkIns.length > 0) {
        const firstIn = checkIns[0];
        const inDate = new Date(firstIn.timestamp);
        timeInStr = inDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        
        statusStr = firstIn.status === 'late' ? 'Late Check-in' : 'On-Time Present';
        remarkStr = firstIn.isWithinGeofence
          ? `Verified GPS (${firstIn.distanceToBranch}m from venue)`
          : `⚠️ Geofence Warning (${firstIn.distanceToBranch}m away)`;

        if (checkOuts.length > 0) {
          const lastOut = checkOuts[0];
          const outDate = new Date(lastOut.timestamp);
          timeOutStr = outDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

          const diffMs = outDate.getTime() - inDate.getTime();
          if (diffMs > 0) {
            const hours = (diffMs / (1000 * 60 * 60)).toFixed(1);
            workHours = `${hours}h`;
            if (parseFloat(hours) > 9) {
              statusStr = 'Overtime';
              remarkStr += ` • ${hours} hrs worked (OT included)`;
            }
          }
        }
      } else if (checkOuts.length > 0) {
        const lastOut = checkOuts[0];
        const outDate = new Date(lastOut.timestamp);
        timeOutStr = outDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        statusStr = 'Check-Out Only';
        remarkStr = 'Missing morning Check-In record';
      } else {
        // No punch: Determine if Leave, Day Off, Sunday Rest, or genuine Absent
        if (empLeave) {
          isLeaveFlag = true;
          statusStr = 'On Leave / សុំច្បាប់';
          const typeKh = empLeave.typeKh || empLeave.type || 'ច្បាប់ឈប់សម្រាក';
          remarkStr = `[ច្បាប់អនុញ្ញាត] ${typeKh}${empLeave.reason ? `: ${empLeave.reason}` : ''}`;
        } else if (isDayOff) {
          isDayOffFlag = true;
          statusStr = 'Day Off / ថ្ងៃសម្រាក';
          remarkStr = `Weekly Day Off (${getEmployeeDayOffName(emp, 'km')}) - ថ្ងៃឈប់សម្រាកប្រចាំសប្តាហ៍`;
        } else if (isSunRest) {
          statusStr = 'Sunday Rest';
          remarkStr = 'Company Sunday Rest Day / សម្រាកប្រចាំសប្តាហ៍';
        } else {
          statusStr = 'Absent / អវត្តមាន';
          remarkStr = 'No attendance logged for this date';
        }
      }

      // If printing individual employee roster, include every day so Day Off / Leave is clearly marked.
      // If multi-staff roster, include all working days, day off, leave or punch days.
      if (employeeFilter !== 'all' || !isSunRest || checkIns.length > 0 || checkOuts.length > 0) {
        rows.push({
          no: rowNumber++,
          enrollId: emp.code,
          employeeId: emp.id,
          nameEn: emp.nameEn,
          nameKh: emp.nameKh,
          avatar: emp.avatar,
          department: emp.department,
          role: emp.role,
          branchId: empBranch?.id || '',
          branchNameEn: empBranch?.nameEn || '',
          branchNameKh: empBranch?.nameKh || '',
          date: dateStr,
          dayOfWeek: dayOfWeekStr,
          isSunday: isSunday,
          isDayOff: isDayOffFlag,
          isLeave: isLeaveFlag,
          timeIn: timeInStr,
          timeOut: timeOutStr,
          durationHours: workHours,
          status: statusStr,
          remark: remarkStr,
        });
      }
    });
  });

  return rows;
}

export function generateEmployeeMergedSummaries(
  records: AttendanceRecord[],
  employees: Employee[],
  branches: Branch[],
  startDateStr: string,
  endDateStr: string,
  branchFilter: string = 'all',
  employeeFilter: string = 'all',
  leaveRequests: LeaveRequest[] = []
): EmployeeMergedSummary[] {
  // Filter target employees
  let targetEmployees = branchFilter === 'all'
    ? employees
    : employees.filter((e) => e.branchId === branchFilter);

  if (employeeFilter !== 'all') {
    targetEmployees = targetEmployees.filter(
      (e) => e.id === employeeFilter || e.code === employeeFilter || e.nameEn === employeeFilter
    );
  }

  // Calculate days in range using robust getDatesInRange
  const dates = getDatesInRange(startDateStr, endDateStr);
  if (dates.length === 0) {
    return [];
  }

  return targetEmployees.map((emp) => {
    const empBranch = branches.find((b) => b.id === emp.branchId) || branches[0];
    
    // Get all daily records for this employee
    const empDailyRows: TimesheetRow[] = [];
    let daysPresent = 0;
    let daysAbsent = 0;
    let daysOff = 0;
    let daysLeave = 0;
    let daysLate = 0;
    let daysOnTime = 0;
    let daysOvertime = 0;
    let totalWorkHoursNum = 0;
    let totalOtHoursNum = 0;
    let sundaysCount = 0;

    dates.forEach((dateStr, idx) => {
      const [y, m, dNum] = dateStr.split('-').map(Number);
      const d = new Date(y, m - 1, dNum, 12, 0, 0);
      const dayIndex = d.getDay();
      const isSunday = dayIndex === 0;
      const isDayOff = isEmployeeDayOff(emp, dateStr);
      const isSunRest = isSunday && isEmployeeSundayRest(emp);
      const empLeave = getEmployeeLeaveOnDate(emp, dateStr, leaveRequests);

      if (isSunRest) {
        sundaysCount++;
      }

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayNamesKh = ['អាទិត្យ', 'ច័ន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
      const dayOfWeekStr = `${dayNames[dayIndex]} (${dayNamesKh[dayIndex]})`;

      const dayPunches = records.filter(
        (r) =>
          (r.employeeId === emp.id || r.employeeCode === emp.code) &&
          r.timestamp.startsWith(dateStr)
      );

      const checkIns = dayPunches.filter((p) => p.type === 'check_in').sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      const checkOuts = dayPunches.filter((p) => p.type === 'check_out').sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      let timeInStr = '--:--';
      let timeOutStr = '--:--';
      let statusStr = 'Absent';
      let remarkStr = 'Absent';
      let workHours = '0.0h';
      let parsedHours = 0;
      let isDayOffFlag = false;
      let isLeaveFlag = false;

      if (checkIns.length > 0) {
        daysPresent++;
        const firstIn = checkIns[0];
        const inDate = new Date(firstIn.timestamp);
        timeInStr = inDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

        if (firstIn.status === 'late') {
          daysLate++;
          statusStr = 'Late Check-in';
        } else {
          daysOnTime++;
          statusStr = 'On-Time';
        }

        remarkStr = firstIn.isWithinGeofence
          ? `GPS Verified (${firstIn.distanceToBranch}m)`
          : `⚠️ Geofence Warning (${firstIn.distanceToBranch}m)`;

        if (checkOuts.length > 0) {
          const lastOut = checkOuts[0];
          const outDate = new Date(lastOut.timestamp);
          timeOutStr = outDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

          const diffMs = outDate.getTime() - inDate.getTime();
          if (diffMs > 0) {
            parsedHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(1));
            workHours = `${parsedHours}h`;
            totalWorkHoursNum += parsedHours;

            if (parsedHours > 8) {
              const ot = parseFloat((parsedHours - 8).toFixed(1));
              totalOtHoursNum += ot;
              daysOvertime++;
              statusStr = 'Overtime';
              remarkStr += ` • ${parsedHours}h worked (${ot}h OT)`;
            }
          }
        } else {
          // Standard shift assume 8h if checked in
          parsedHours = 8.0;
          totalWorkHoursNum += parsedHours;
          workHours = '8.0h (Est)';
        }
      } else if (checkOuts.length > 0) {
        daysPresent++;
        const lastOut = checkOuts[0];
        const outDate = new Date(lastOut.timestamp);
        timeOutStr = outDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        statusStr = 'Check-Out Only';
        remarkStr = 'Missing morning Check-In';
      } else {
        // No punch: Check if Leave, Day Off, or Sunday Rest
        if (empLeave) {
          daysLeave++;
          isLeaveFlag = true;
          statusStr = 'On Leave / សុំច្បាប់';
          const typeKh = empLeave.typeKh || empLeave.type || 'ច្បាប់';
          remarkStr = `[ច្បាប់អនុញ្ញាត] ${typeKh}${empLeave.reason ? `: ${empLeave.reason}` : ''}`;
        } else if (isDayOff) {
          daysOff++;
          isDayOffFlag = true;
          statusStr = 'Day Off / ថ្ងៃសម្រាក';
          remarkStr = `Weekly Day Off (${getEmployeeDayOffName(emp, 'km')})`;
        } else if (isSunRest) {
          statusStr = 'Sunday Rest';
          remarkStr = 'Company Sunday Rest Day';
        } else {
          daysAbsent++;
          statusStr = 'Absent / អវត្តមាន';
          remarkStr = 'No punch logged';
        }
      }

      empDailyRows.push({
        no: idx + 1,
        enrollId: emp.code,
        employeeId: emp.id,
        nameEn: emp.nameEn,
        nameKh: emp.nameKh,
        avatar: emp.avatar,
        department: emp.department,
        role: emp.role,
        branchId: empBranch?.id || '',
        branchNameEn: empBranch?.nameEn || '',
        branchNameKh: empBranch?.nameKh || '',
        date: dateStr,
        dayOfWeek: dayOfWeekStr,
        isSunday: isSunday,
        isDayOff: isDayOffFlag,
        isLeave: isLeaveFlag,
        timeIn: timeInStr,
        timeOut: timeOutStr,
        durationHours: workHours,
        status: statusStr,
        remark: remarkStr,
      });
    });

    const scheduledWorkDays = daysPresent + daysAbsent;
    const attendanceRate = scheduledWorkDays > 0
      ? Math.min(100, Math.round((daysPresent / scheduledWorkDays) * 100))
      : 100;

    return {
      employeeId: emp.id,
      enrollId: emp.code,
      nameEn: emp.nameEn,
      nameKh: emp.nameKh,
      avatar: emp.avatar,
      department: emp.department,
      role: emp.role,
      branchId: empBranch?.id || '',
      branchNameEn: empBranch?.nameEn || '',
      branchNameKh: empBranch?.nameKh || '',
      totalDaysInRange: dates.length,
      daysPresent,
      daysAbsent,
      daysOff,
      daysLeave,
      daysLate,
      daysOnTime,
      daysOvertime,
      totalWorkHours: parseFloat(totalWorkHoursNum.toFixed(1)),
      totalOtHours: parseFloat(totalOtHoursNum.toFixed(1)),
      sundaysCount,
      attendanceRate,
      dailyRecords: empDailyRows,
    };
  });
}

export function exportTimesheetToCsv(
  rows: TimesheetRow[],
  branchTitle: string,
  dateRangeStr: string
) {
  const headers = [
    'No',
    'Enroll ID',
    'User Name (EN)',
    'User Name (KH)',
    'Department',
    'Role',
    'Branch',
    'Date',
    'Day of Week',
    'Time In',
    'Time Out',
    'Work Duration',
    'Status',
    'Remark & GPS Verification',
  ];

  const csvRows = rows.map((r) => [
    r.no,
    `"${r.enrollId}"`,
    `"${r.nameEn}"`,
    `"${r.nameKh}"`,
    `"${r.department}"`,
    `"${r.role}"`,
    `"${r.branchNameEn}"`,
    `"${r.date}"`,
    `"${r.dayOfWeek}"`,
    `"${r.timeIn}"`,
    `"${r.timeOut}"`,
    `"${r.durationHours}"`,
    `"${r.status}"`,
    `"${r.remark.replace(/"/g, '""')}"`,
  ]);

  const csvContent =
    '\uFEFF' +
    `"ATTENDANCE & TIMESHEET AUDIT REPORT"\n` +
    `"Branch: ${branchTitle} | Date Range: ${dateRangeStr} | Generated: ${new Date().toLocaleString()}"\n\n` +
    [headers.join(','), ...csvRows.map((row) => row.join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `Attendance_Report_${branchTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportMergedSummaryToCsv(
  summaries: EmployeeMergedSummary[],
  branchTitle: string,
  dateRangeStr: string
) {
  const headers = [
    'No',
    'Enroll ID',
    'User Name (EN)',
    'User Name (KH)',
    'Department',
    'Role',
    'Branch',
    'Period Days',
    'Present Days',
    'Absent Days',
    'On-Time Days',
    'Late Days',
    'Overtime Days',
    'Total Work Hours',
    'OT Hours',
    'Sundays Off',
    'Attendance Rate (%)',
  ];

  const csvRows = summaries.map((s, idx) => [
    idx + 1,
    `"${s.enrollId}"`,
    `"${s.nameEn}"`,
    `"${s.nameKh}"`,
    `"${s.department}"`,
    `"${s.role}"`,
    `"${s.branchNameEn}"`,
    s.totalDaysInRange,
    s.daysPresent,
    s.daysAbsent,
    s.daysOnTime,
    s.daysLate,
    s.daysOvertime,
    `"${s.totalWorkHours}h"`,
    `"${s.totalOtHours}h"`,
    s.sundaysCount,
    `"${s.attendanceRate}%"`,
  ]);

  const csvContent =
    '\uFEFF' +
    `"MERGED EMPLOYEE ATTENDANCE & PAYROLL SUMMARY REPORT"\n` +
    `"Branch: ${branchTitle} | Date Range: ${dateRangeStr} | Generated: ${new Date().toLocaleString()}"\n\n` +
    [headers.join(','), ...csvRows.map((row) => row.join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `Merged_Employee_Summary_${branchTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportTimesheetToPdf(
  rows: TimesheetRow[],
  branchTitle: string,
  dateRangeStr: string,
  companyName: string = 'ENTERPRISE MULTI-BRANCH HR SUITE'
): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1450px';
  container.style.background = '#ffffff';
  container.style.fontFamily = "'Kantumruy Pro', 'Battambang', 'Noto Sans Khmer', sans-serif";
  container.className = 'pdf-render-target';

  const totalPunches = rows.filter((r) => !r.isSunday && r.timeIn !== '--:--').length;
  const totalSundays = rows.filter((r) => r.isSunday).length;
  const onTimeCount = rows.filter((r) => r.status.toLowerCase().includes('on-time')).length;
  const lateCount = rows.filter((r) => r.status.toLowerCase().includes('late')).length;

  container.innerHTML = `
    <div style="padding: 16px; background: white; font-family: 'Kantumruy Pro', 'Battambang', 'Noto Sans Khmer', sans-serif; width: 1450px;">
      <!-- Header -->
      <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px;">
        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">
          ${companyName}
        </div>
        <h1 style="font-size: 19px; font-weight: 900; margin: 3px 0; color: #0f172a; text-transform: uppercase;">
          Daily Attendance Audit & Punch Timesheet
        </h1>
        <p style="font-size: 13px; font-weight: 700; color: #475569; margin: 2px 0;">
          របាយការណ៍សវនកម្មវត្តមាន និងកត់ម៉ោងបុគ្គលិកប្រចាំថ្ងៃ
        </p>
        <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 14px; margin-top: 8px; font-size: 11.5px;">
          <div><span style="color: #64748b;">សាខា (Branch): </span><b style="color: #0f172a;">${branchTitle}</b></div>
          <div><span style="color: #64748b;">កាលបរិច្ឆេទ (Period): </span><b style="color: #4338ca;">${dateRangeStr}</b></div>
          <div><span style="color: #64748b;">បង្កើតនៅ (Generated): </span><b style="color: #0f172a;">${new Date().toLocaleDateString('km-KH')}</b></div>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 12px; text-align: center; font-size: 10.5px;">
        <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px;">
          <div style="color: #64748b; font-size: 9.5px;">កំណត់ត្រាសរុប (Total)</div>
          <div style="font-size: 15px; font-weight: 800; color: #0f172a;">${rows.length}</div>
        </div>
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 6px;">
          <div style="color: #065f46; font-size: 9.5px;">វត្តមានស្កេន (Punches)</div>
          <div style="font-size: 15px; font-weight: 800; color: #047857;">${totalPunches}</div>
        </div>
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 6px;">
          <div style="color: #1e40af; font-size: 9.5px;">ទាន់ពេល (On-Time)</div>
          <div style="font-size: 15px; font-weight: 800; color: #2563eb;">${onTimeCount}</div>
        </div>
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 6px;">
          <div style="color: #92400e; font-size: 9.5px;">មកយឺត (Late)</div>
          <div style="font-size: 15px; font-weight: 800; color: #d97706;">${lateCount}</div>
        </div>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 6px;">
          <div style="color: #991b1b; font-size: 9.5px;">ថ្ងៃអាទិត្យ (Sundays)</div>
          <div style="font-size: 15px; font-weight: 800; color: #dc2626;">${totalSundays}</div>
        </div>
      </div>

      <!-- Table scaled full width with readable font -->
      <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; line-height: 1.35;">
        <thead>
          <tr style="background: #1e293b; color: white; text-align: left; font-size: 10px; font-weight: bold;">
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 32px; white-space: nowrap;">No</th>
            <th style="padding: 6px 8px; border: 1px solid #334155; width: 85px; white-space: nowrap;">Date & Day</th>
            <th style="padding: 6px 8px; border: 1px solid #334155; white-space: nowrap;">Employee Name (ឈ្មោះបុគ្គលិក)</th>
            <th style="padding: 6px 8px; border: 1px solid #334155; width: 110px; white-space: nowrap;">Department (ផ្នែក)</th>
            <th style="padding: 6px 8px; border: 1px solid #334155; width: 110px; white-space: nowrap;">Branch (សាខា)</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 60px; white-space: nowrap;">Time In</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 60px; white-space: nowrap;">Time Out</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 60px; white-space: nowrap;">Work Hrs</th>
            <th style="padding: 6px 8px; border: 1px solid #334155; width: 100px; white-space: nowrap;">Status (ស្ថានភាព)</th>
            <th style="padding: 6px 8px; border: 1px solid #334155; white-space: nowrap;">Remark / Verification</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r, idx) => {
            const isSun = r.isSunday;
            const isOff = r.isDayOff;
            const isLv = r.isLeave;
            const bg = isSun ? '#fef2f2' : isOff ? '#fef3c7' : isLv ? '#f3e8ff' : idx % 2 === 0 ? '#ffffff' : '#f8fafc';
            const textColor = isSun ? '#991b1b' : isOff ? '#92400e' : isLv ? '#6b21a8' : '#1e293b';
            const nameDisplay = r.nameKh ? `${r.nameEn} (${r.nameKh})` : r.nameEn;
            const branchDisplay = r.branchNameKh ? `${r.branchNameEn} (${r.branchNameKh})` : r.branchNameEn;

            return `
              <tr style="background: ${bg}; color: ${textColor}; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">
                <td style="padding: 4px; text-align: center; border: 1px solid #e2e8f0;">${idx + 1}</td>
                <td style="padding: 4px 6px; border: 1px solid #e2e8f0; font-weight: 600;">${r.date} (${r.dayOfWeek})</td>
                <td style="padding: 4px 6px; border: 1px solid #e2e8f0; font-weight: 700;">${nameDisplay}</td>
                <td style="padding: 4px 6px; border: 1px solid #e2e8f0;">${r.department || 'Operations'}</td>
                <td style="padding: 4px 6px; border: 1px solid #e2e8f0;">${branchDisplay}</td>
                <td style="padding: 4px 2px; text-align: center; border: 1px solid #e2e8f0; font-weight: 600;">${r.timeIn}</td>
                <td style="padding: 4px 2px; text-align: center; border: 1px solid #e2e8f0; font-weight: 600;">${r.timeOut}</td>
                <td style="padding: 4px 2px; text-align: center; border: 1px solid #e2e8f0; font-weight: 700; color: #4338ca;">${r.durationHours !== '0.0h' ? r.durationHours : '--'}</td>
                <td style="padding: 4px 6px; border: 1px solid #e2e8f0; font-weight: 600;">${r.status}</td>
                <td style="padding: 4px 6px; border: 1px solid #e2e8f0; font-size: 9.5px;">${r.remark || '-'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.body.appendChild(container);
  try {
    await renderSingleContainerToA4Pdf(
      container,
      `Attendance_Report_${branchTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    );
  } finally {
    document.body.removeChild(container);
  }
}

export async function exportMergedSummaryToPdf(
  summaries: EmployeeMergedSummary[],
  branchTitle: string,
  dateRangeStr: string,
  companyName: string = "ENTERPRISE MULTI-BRANCH HR SUITE"
): Promise<void> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "1450px";
  container.style.background = "#ffffff";
  container.style.fontFamily = "'Kantumruy Pro', 'Battambang', 'Noto Sans Khmer', sans-serif";
  container.className = "pdf-render-target";

  const totalEmployees = summaries.length;
  const totalWorkHours = summaries.reduce((acc, s) => acc + s.totalWorkHours, 0).toFixed(1);
  const totalOtHours = summaries.reduce((acc, s) => acc + s.totalOtHours, 0).toFixed(1);
  const avgAttendance = totalEmployees > 0
    ? Math.round(summaries.reduce((acc, s) => acc + s.attendanceRate, 0) / totalEmployees)
    : 100;

  container.innerHTML = `
    <div style="padding: 16px; background: white; font-family: 'Kantumruy Pro', 'Battambang', 'Noto Sans Khmer', sans-serif; width: 1450px;">
      <!-- Header -->
      <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px;">
        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">
          ${companyName}
        </div>
        <h1 style="font-size: 19px; font-weight: 900; margin: 3px 0; color: #0f172a; text-transform: uppercase;">
          Consolidated Employee Attendance & Work Summary
        </h1>
        <p style="font-size: 13px; font-weight: 700; color: #475569; margin: 2px 0;">
          របាយការណ៍សង្ខេបវត្តមាន និងម៉ោងការងារបុគ្គលិកប្រចាំខែ
        </p>
        <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 14px; margin-top: 8px; font-size: 11.5px;">
          <div><span style="color: #64748b;">សាខា (Branch): </span><b style="color: #0f172a;">${branchTitle}</b></div>
          <div><span style="color: #64748b;">កាលបរិច្ឆេទ (Period): </span><b style="color: #4338ca;">${dateRangeStr}</b></div>
          <div><span style="color: #64748b;">ចំនួនបុគ្គលិក (Staff Count): </span><b style="color: #0f172a;">${totalEmployees} នាក់</b></div>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px; text-align: center; font-size: 10.5px;">
        <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px;">
          <div style="color: #64748b; font-size: 9.5px;">បុគ្គលិកសរុប (Total Staff)</div>
          <div style="font-size: 15px; font-weight: 800; color: #0f172a;">${totalEmployees}</div>
        </div>
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 6px;">
          <div style="color: #1e40af; font-size: 9.5px;">ម៉ោងការងារសរុប (Total Work Hours)</div>
          <div style="font-size: 15px; font-weight: 800; color: #2563eb;">${totalWorkHours}h</div>
        </div>
        <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 6px; padding: 6px;">
          <div style="color: #5b21b6; font-size: 9.5px;">ម៉ោងបន្ថែម OT (Total OT Hours)</div>
          <div style="font-size: 15px; font-weight: 800; color: #6d28d9;">${totalOtHours}h</div>
        </div>
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 6px;">
          <div style="color: #065f46; font-size: 9.5px;">អត្រាវត្តមានមធ្យម (Avg Attendance)</div>
          <div style="font-size: 15px; font-weight: 800; color: #047857;">${avgAttendance}%</div>
        </div>
      </div>

      <!-- Table scaled full width with readable font -->
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; line-height: 1.4;">
        <thead>
          <tr style="background: #1e293b; color: white; text-align: left; font-size: 10px; font-weight: bold;">
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 32px; white-space: nowrap;">No</th>
            <th style="padding: 6px 8px; border: 1px solid #334155; width: 60px; white-space: nowrap;">ID</th>
            <th style="padding: 6px 8px; border: 1px solid #334155; white-space: nowrap;">Employee Name (ឈ្មោះបុគ្គលិក)</th>
            <th style="padding: 6px 8px; border: 1px solid #334155; width: 110px; white-space: nowrap;">Department (ផ្នែក)</th>
            <th style="padding: 6px 8px; border: 1px solid #334155; width: 110px; white-space: nowrap;">Branch (សាខា)</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 60px; white-space: nowrap;">Present</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 60px; white-space: nowrap;">Off</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 60px; white-space: nowrap;">Leave</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 55px; white-space: nowrap;">Late</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 70px; white-space: nowrap;">Hours</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 60px; white-space: nowrap;">Rate</th>
          </tr>
        </thead>
        <tbody>
          ${summaries.map((s, idx) => {
            const nameDisplay = s.nameKh ? `${s.nameEn} (${s.nameKh})` : s.nameEn;
            const branchDisplay = s.branchNameKh ? `${s.branchNameEn} (${s.branchNameKh})` : s.branchNameEn;
            return `
              <tr style="background: ${idx % 2 === 0 ? "#ffffff" : "#f8fafc"}; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">
                <td style="padding: 5px 4px; text-align: center; border: 1px solid #e2e8f0;">${idx + 1}</td>
                <td style="padding: 5px 8px; border: 1px solid #e2e8f0; font-weight: 700; color: #4338ca;">${s.enrollId || s.employeeId.slice(0, 6)}</td>
                <td style="padding: 5px 8px; border: 1px solid #e2e8f0; font-weight: 700;">${nameDisplay}</td>
                <td style="padding: 5px 8px; border: 1px solid #e2e8f0;">${s.department}</td>
                <td style="padding: 5px 8px; border: 1px solid #e2e8f0;">${branchDisplay}</td>
                <td style="padding: 5px 4px; text-align: center; border: 1px solid #e2e8f0; font-weight: 700; color: #047857;">${s.daysPresent}</td>
                <td style="padding: 5px 4px; text-align: center; border: 1px solid #e2e8f0; font-weight: 700; color: #b45309;">${s.daysOff}</td>
                <td style="padding: 5px 4px; text-align: center; border: 1px solid #e2e8f0; font-weight: 700; color: #7e22ce;">${s.daysLeave}</td>
                <td style="padding: 5px 4px; text-align: center; border: 1px solid #e2e8f0; font-weight: 600;">${s.daysLate}</td>
                <td style="padding: 5px 4px; text-align: center; border: 1px solid #e2e8f0; font-weight: 800; color: #4338ca;">${s.totalWorkHours}h</td>
                <td style="padding: 5px 4px; text-align: center; border: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${s.attendanceRate}%</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;

  document.body.appendChild(container);
  try {
    await renderSingleContainerToA4Pdf(
      container,
      `Merged_Employee_Summary_${branchTitle.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`
    );
  } finally {
    document.body.removeChild(container);
  }
}

export interface PrintableDepartmentGroup {
  department: string;
  staffList: {
    employee: Employee;
    rows: TimesheetRow[];
    summary: {
      totalWorkHours: string;
      daysWorked: number;
      daysOff: number;
      daysLeave: number;
      lateDays: number;
      otDays: number;
    };
  }[];
}

/**
 * Ensures Google Fonts and document fonts are fully loaded before capturing canvas snapshots.
 */
export async function ensureKhmerFontsReady(): Promise<void> {
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore
    }
  }
  // Brief pause to allow browser glyph rasterization and OpenType tables to settle
  await new Promise((resolve) => setTimeout(resolve, 80));
}

/**
 * Common onclone handler for html2canvas to inject Google Fonts stylesheet and Khmer typography rules.
 */
export function injectKhmerTypographyToClone(clonedDoc: Document, targetEl?: HTMLElement | null): void {
  // 1. Clone all <link> and <style> from host document
  const headElements = document.querySelectorAll('link[rel="stylesheet"], style');
  headElements.forEach((node) => {
    clonedDoc.head.appendChild(node.cloneNode(true));
  });

  // 2. Inject explicit high-priority font rule into cloned document
  const khmerStyle = clonedDoc.createElement('style');
  khmerStyle.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Battambang:wght@400;700;900&family=Kantumruy+Pro:ital,wght@0,100..700;1,100..700&family=Noto+Sans+Khmer:wght@400;600;700&display=swap');
    *, html, body, table, th, td, tr, div, p, span, h1, h2, h3, b, strong, select, input {
      font-family: 'Kantumruy Pro', 'Battambang', 'Noto Sans Khmer', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }
    .border-dashed {
      border-style: none !important;
    }
    .page-break-after-staff {
      margin-bottom: 0 !important;
      padding-bottom: 0 !important;
    }
  `;
  clonedDoc.head.appendChild(khmerStyle);

  if (targetEl) {
    targetEl.style.fontFamily = "'Kantumruy Pro', 'Battambang', 'Noto Sans Khmer', sans-serif";
  }
}

/**
 * Renders an array of DOM sheet elements onto individual landscape A4 pages in jsPDF.
 * Uses html2canvas for 100% native Unicode Khmer script shaping and font rendering.
 */
export async function renderDomSheetsToA4Pdf(
  sheets: HTMLElement[],
  filename: string
): Promise<void> {
  await ensureKhmerFontsReady();

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = 297;
  const pdfHeight = 210;
  const margin = 5;
  const usableWidth = pdfWidth - margin * 2; // 287mm
  const usableHeight = pdfHeight - margin * 2; // 200mm

  for (let i = 0; i < sheets.length; i++) {
    if (i > 0) doc.addPage('a4', 'landscape');
    const sheet = sheets[i];

    const canvas = await html2canvas(sheet, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1600,
      onclone: (clonedDoc, clonedEl) => {
        injectKhmerTypographyToClone(clonedDoc, clonedEl);
        if (clonedEl) {
          clonedDoc.body.style.width = '1450px';
          clonedDoc.body.style.minWidth = '1450px';
          clonedDoc.body.style.overflow = 'visible';
          let p = clonedEl.parentElement;
          while (p && p !== clonedDoc.body) {
            p.style.width = '100%';
            p.style.maxWidth = 'none';
            p.style.minWidth = '1450px';
            p.style.overflow = 'visible';
            p = p.parentElement;
          }
          clonedEl.style.width = '1450px';
          clonedEl.style.minWidth = '1450px';
          clonedEl.style.maxWidth = '1450px';
          clonedEl.style.boxSizing = 'border-box';
          clonedEl.style.margin = '0';
          clonedEl.style.padding = '8px 12px';
        }
      },
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const imgWidth = usableWidth; // Always full landscape width (287mm)
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight <= usableHeight) {
      const yOffset = margin + (usableHeight - imgHeight) / 2;
      doc.addImage(imgData, 'JPEG', margin, yOffset, usableWidth, imgHeight, undefined, 'FAST');
    } else {
      // Fit vertically while keeping full 287mm width so table spans the full landscape page
      doc.addImage(imgData, 'JPEG', margin, margin, usableWidth, usableHeight, undefined, 'FAST');
    }
  }

  doc.save(filename);
}

/**
 * Renders a single DOM container onto landscape A4 pages in jsPDF, paginating automatically if necessary.
 */
export async function renderSingleContainerToA4Pdf(
  container: HTMLElement,
  filename: string
): Promise<void> {
  await ensureKhmerFontsReady();

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = 297;
  const pdfHeight = 210;
  const margin = 5;
  const usableWidth = pdfWidth - margin * 2;
  const usableHeight = pdfHeight - margin * 2;

  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 1600,
    onclone: (clonedDoc, clonedEl) => {
      injectKhmerTypographyToClone(clonedDoc, clonedEl);
      if (clonedEl) {
        clonedDoc.body.style.width = '1450px';
        clonedDoc.body.style.minWidth = '1450px';
        clonedDoc.body.style.overflow = 'visible';
        let p = clonedEl.parentElement;
        while (p && p !== clonedDoc.body) {
          p.style.width = '100%';
          p.style.maxWidth = 'none';
          p.style.minWidth = '1450px';
          p.style.overflow = 'visible';
          p = p.parentElement;
        }
        clonedEl.style.width = '1450px';
        clonedEl.style.minWidth = '1450px';
        clonedEl.style.maxWidth = '1450px';
        clonedEl.style.boxSizing = 'border-box';
        clonedEl.style.margin = '0';
        clonedEl.style.padding = '8px 12px';
      }
    },
  });

  const totalImgHeight = (canvas.height * usableWidth) / canvas.width;

  if (totalImgHeight <= usableHeight) {
    const yOffset = margin + (usableHeight - totalImgHeight) / 2;
    doc.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', margin, yOffset, usableWidth, totalImgHeight, undefined, 'FAST');
  } else {
    // Paginate vertically
    const pageCanvasHeight = (usableHeight * canvas.width) / usableWidth;
    let remainingHeight = canvas.height;
    let sourceY = 0;
    let pageIndex = 0;

    while (remainingHeight > 0) {
      if (pageIndex > 0) doc.addPage('a4', 'landscape');
      const chunkHeight = Math.min(pageCanvasHeight, remainingHeight);

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = chunkHeight;
      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, sourceY, canvas.width, chunkHeight, 0, 0, canvas.width, chunkHeight);
        const chunkData = pageCanvas.toDataURL('image/jpeg', 0.95);
        const chunkRenderHeight = (chunkHeight * usableWidth) / canvas.width;
        doc.addImage(chunkData, 'JPEG', margin, margin, usableWidth, chunkRenderHeight, undefined, 'FAST');
      }

      sourceY += chunkHeight;
      remainingHeight -= chunkHeight;
      pageIndex++;
    }
  }

  doc.save(filename);
}

/**
 * Generates an official, print-ready multi-page A4 landscape PDF
 * containing the exact timesheet rosters for every staff member in each department.
 * Uses html2canvas for 100% native Unicode Khmer font support and proper letter shaping.
 */
export async function exportRosterPrintSheetsToPdf(
  departmentStaffGroups: PrintableDepartmentGroup[],
  branchTitle: string,
  monthYearStr: string,
  dateRangeStr: string,
  companyName: string = 'ENTERPRISE ATTENDANCE & HR SUITE'
): Promise<void> {
  const container = document.getElementById('printable-timesheet-area');

  // When called from the Print Modal (active on screen)
  if (container) {
    const sheets = Array.from(container.querySelectorAll<HTMLElement>('.print-staff-sheet'));
    if (sheets.length > 0) {
      await renderDomSheetsToA4Pdf(
        sheets,
        `Official_Roster_${branchTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${monthYearStr.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      );
      return;
    }

    await renderSingleContainerToA4Pdf(
      container,
      `Official_Roster_${branchTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${monthYearStr.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    );
    return;
  }

  // Offscreen rendering fallback if called outside the modal:
  const offscreen = document.createElement('div');
  offscreen.style.position = 'fixed';
  offscreen.style.left = '-9999px';
  offscreen.style.top = '0';
  offscreen.style.width = '1450px';
  offscreen.style.background = '#ffffff';
  offscreen.style.fontFamily = "'Kantumruy Pro', 'Battambang', system-ui, sans-serif";

  // Build the HTML for each staff sheet
  let html = '';
  departmentStaffGroups.forEach((deptGroup) => {
    deptGroup.staffList.forEach((group) => {
      const emp = group.employee;
      html += `
        <div class="print-staff-sheet" style="padding: 16px; background: white; margin-bottom: 24px; font-family: 'Kantumruy Pro', 'Battambang', system-ui, sans-serif; width: 1450px;">
          <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 8px;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b;">${companyName}</div>
            <h1 style="font-size: 17px; font-weight: 900; margin: 2px 0; color: #0f172a;">Employee Attendance for ${monthYearStr}<br>for ${deptGroup.department}</h1>
            <p style="font-size: 11.5px; font-weight: 700; color: #475569; margin: 2px 0;">របាយការណ៍វត្តមានបុគ្គលិក ប្រចាំខែ ${monthYearStr}<br>សម្រាប់ផ្នែក: ${deptGroup.department}</p>
            <div style="display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 10px; margin-top: 6px; font-size: 11.5px;">
              <div><span>ឈ្មោះ: </span><b>${emp.nameEn} (${emp.nameKh})</b></div>
              <div><span>អត្តលេខ: </span><b style="color: #4338ca;">${emp.code}</b></div>
              <div><span>សាខា: </span><b>${branchTitle}</b></div>
              <div><span>តួនាទី: </span><b>${emp.role || emp.position || 'Staff'}</b></div>
            </div>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; line-height: 1.35;">
            <thead>
              <tr style="background: #1e293b; color: white; text-align: left; font-size: 9.5px; font-weight: bold;">
                <th style="padding: 5px 4px; text-align: center; border: 1px solid #334155; width: 32px; white-space: nowrap;">No</th>
                <th style="padding: 5px 6px; border: 1px solid #334155; width: 85px; white-space: nowrap;">Date</th>
                <th style="padding: 5px 6px; border: 1px solid #334155; width: 95px; white-space: nowrap;">Day</th>
                <th style="padding: 5px 8px; border: 1px solid #334155; white-space: nowrap;">Employee Name</th>
                <th style="padding: 5px 6px; border: 1px solid #334155; width: 110px; white-space: nowrap;">Department</th>
                <th style="padding: 5px 6px; border: 1px solid #334155; width: 110px; white-space: nowrap;">Branch</th>
                <th style="padding: 5px 4px; text-align: center; border: 1px solid #334155; width: 65px; white-space: nowrap;">Time In</th>
                <th style="padding: 5px 4px; text-align: center; border: 1px solid #334155; width: 65px; white-space: nowrap;">Time Out</th>
                <th style="padding: 5px 4px; text-align: center; border: 1px solid #334155; width: 65px; white-space: nowrap;">Work Hrs</th>
                <th style="padding: 5px 6px; border: 1px solid #334155; width: 105px; white-space: nowrap;">Status</th>
                <th style="padding: 5px 6px; border: 1px solid #334155; white-space: nowrap;">Remark / Verification</th>
              </tr>
            </thead>
            <tbody>
              ${group.rows.map((r, rIdx) => {
                const isSun = r.isSunday;
                const isOff = r.isDayOff;
                const isLv = r.isLeave;
                const bg = isSun || isOff ? '#fef3c7' : isLv ? '#f3e8ff' : rIdx % 2 === 0 ? '#ffffff' : '#f8fafc';
                const color = isSun || isOff ? '#92400e' : isLv ? '#6b21a8' : '#1e293b';
                return `
                  <tr style="background: ${bg}; color: ${color}; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">
                    <td style="padding: 3.5px 4px; text-align: center; border: 1px solid #e2e8f0;">${rIdx + 1}</td>
                    <td style="padding: 3.5px 6px; border: 1px solid #e2e8f0;">${r.date}</td>
                    <td style="padding: 3.5px 6px; border: 1px solid #e2e8f0;">${r.dayOfWeek}</td>
                    <td style="padding: 3.5px 8px; font-weight: bold; border: 1px solid #e2e8f0;">${r.nameEn} (${r.nameKh})</td>
                    <td style="padding: 3.5px 6px; border: 1px solid #e2e8f0;">${r.department}</td>
                    <td style="padding: 3.5px 6px; border: 1px solid #e2e8f0;">${r.branchNameEn}</td>
                    <td style="padding: 3.5px 4px; text-align: center; border: 1px solid #e2e8f0;">${r.timeIn}</td>
                    <td style="padding: 3.5px 4px; text-align: center; border: 1px solid #e2e8f0;">${r.timeOut}</td>
                    <td style="padding: 3.5px 4px; text-align: center; font-weight: bold; border: 1px solid #e2e8f0;">${r.durationHours !== '0.0h' ? r.durationHours : '--'}</td>
                    <td style="padding: 3.5px 6px; border: 1px solid #e2e8f0;">${r.status}</td>
                    <td style="padding: 3.5px 6px; border: 1px solid #e2e8f0; font-size: 9.5px;">${r.remark || '-'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="background: #f1f5f9; font-weight: bold; font-size: 9.5px; border-top: 2px solid #cbd5e1; white-space: nowrap;">
                <td colspan="8" style="padding: 5px 6px; text-align: right; text-transform: uppercase;">Monthly Total Work Hours / សរុបម៉ោងការងារ:</td>
                <td style="padding: 5px 4px; text-align: center; color: #4338ca;">${group.summary.totalWorkHours}h</td>
                <td colspan="2" style="padding: 5px 6px;">Present: ${group.summary.daysWorked} | Days Off: ${group.summary.daysOff} | Leave: ${group.summary.daysLeave} | Late: ${group.summary.lateDays}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    });
  });

  offscreen.innerHTML = html;
  document.body.appendChild(offscreen);

  try {
    const sheets = Array.from(offscreen.querySelectorAll<HTMLElement>('.print-staff-sheet'));
    await renderDomSheetsToA4Pdf(
      sheets,
      `Official_Roster_${branchTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${monthYearStr.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    );
  } finally {
    document.body.removeChild(offscreen);
  }
}
