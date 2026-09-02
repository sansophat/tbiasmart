import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AttendanceRecord, Branch, Employee, Language } from '../types';

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
  daysLate: number;
  daysOnTime: number;
  daysOvertime: number;
  totalWorkHours: number;
  totalOtHours: number;
  sundaysCount: number;
  attendanceRate: number;
  dailyRecords: TimesheetRow[];
}

export function generateDailyTimesheetRows(
  records: AttendanceRecord[],
  employees: Employee[],
  branches: Branch[],
  startDateStr: string,
  endDateStr: string,
  branchFilter: string = 'all',
  employeeFilter: string = 'all'
): TimesheetRow[] {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  // Ensure valid date objects
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return [];
  }

  // Filter employees by branch and by employee
  let targetEmployees = branchFilter === 'all'
    ? employees
    : employees.filter((e) => e.branchId === branchFilter);

  if (employeeFilter !== 'all') {
    targetEmployees = targetEmployees.filter(
      (e) => e.id === employeeFilter || e.code === employeeFilter || e.nameEn === employeeFilter
    );
  }

  const dates: string[] = [];
  const curr = new Date(start);
  while (curr <= end) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }

  const rows: TimesheetRow[] = [];
  let rowNumber = 1;

  dates.forEach((dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const dayIndex = d.getDay(); // 0 is Sunday
    const isSunday = dayIndex === 0;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayNamesKh = ['អាទិត្យ', 'ច័ន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
    const dayOfWeekStr = `${dayNames[dayIndex]} (${dayNamesKh[dayIndex]})`;

    if (isSunday) {
      // Add special Sunday banner / summary marker row for each branch or global
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
        timeIn: '--:--',
        timeOut: '--:--',
        durationHours: '0.0h',
        status: 'SUNDAY_OFF',
        remark: 'Official Company Weekly Rest Day / ថ្ងៃសម្រាកផ្លូវការ',
      });
    }

    targetEmployees.forEach((emp) => {
      const empBranch = branches.find((b) => b.id === emp.branchId) || branches[0];
      
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
      let statusStr = isSunday ? 'Sunday Rest' : 'Absent / No Punch';
      let remarkStr = isSunday ? 'Weekly Rest Day' : 'No attendance logged for this date';
      let workHours = '0.0h';

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
      }

      // If not Sunday or employee actually worked on Sunday
      if (!isSunday || checkIns.length > 0 || checkOuts.length > 0) {
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
  employeeFilter: string = 'all'
): EmployeeMergedSummary[] {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return [];
  }

  // Filter target employees
  let targetEmployees = branchFilter === 'all'
    ? employees
    : employees.filter((e) => e.branchId === branchFilter);

  if (employeeFilter !== 'all') {
    targetEmployees = targetEmployees.filter(
      (e) => e.id === employeeFilter || e.code === employeeFilter || e.nameEn === employeeFilter
    );
  }

  // Calculate days in range
  const dates: string[] = [];
  const curr = new Date(start);
  let totalSundays = 0;
  while (curr <= end) {
    const dStr = curr.toISOString().split('T')[0];
    dates.push(dStr);
    if (curr.getDay() === 0) {
      totalSundays++;
    }
    curr.setDate(curr.getDate() + 1);
  }

  const workingDaysCount = dates.length - totalSundays;

  return targetEmployees.map((emp) => {
    const empBranch = branches.find((b) => b.id === emp.branchId) || branches[0];
    
    // Get all daily records for this employee
    const empDailyRows: TimesheetRow[] = [];
    let daysPresent = 0;
    let daysLate = 0;
    let daysOnTime = 0;
    let daysOvertime = 0;
    let totalWorkHoursNum = 0;
    let totalOtHoursNum = 0;

    dates.forEach((dateStr, idx) => {
      const d = new Date(dateStr + 'T00:00:00');
      const dayIndex = d.getDay();
      const isSunday = dayIndex === 0;
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
      let statusStr = isSunday ? 'Sunday Rest' : 'Absent';
      let remarkStr = isSunday ? 'Weekly Rest Day' : 'Absent';
      let workHours = '0.0h';
      let parsedHours = 0;

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
        timeIn: timeInStr,
        timeOut: timeOutStr,
        durationHours: workHours,
        status: statusStr,
        remark: remarkStr,
      });
    });

    const daysAbsent = Math.max(0, workingDaysCount - daysPresent);
    const attendanceRate = workingDaysCount > 0
      ? Math.min(100, Math.round((daysPresent / workingDaysCount) * 100))
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
      daysLate,
      daysOnTime,
      daysOvertime,
      totalWorkHours: parseFloat(totalWorkHoursNum.toFixed(1)),
      totalOtHours: parseFloat(totalOtHoursNum.toFixed(1)),
      sundaysCount: totalSundays,
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

export function exportTimesheetToPdf(
  rows: TimesheetRow[],
  branchTitle: string,
  dateRangeStr: string,
  companyName: string = 'ENTERPRISE MULTI-BRANCH HR SUITE'
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Top Header Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName.toUpperCase(), 14, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`ATTENDANCE AUDIT & TIMESHEET REPORT — BRANCH: ${branchTitle.toUpperCase()}`, 14, 18);

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Date Range: ${dateRangeStr}  |  Generated: ${new Date().toLocaleString()}`, 297 - 14, 15, {
    align: 'right',
  });

  // Summary Metrics Bar
  const totalPunches = rows.filter((r) => !r.isSunday && r.timeIn !== '--:--').length;
  const totalSundays = rows.filter((r) => r.isSunday).length;
  const onTimeCount = rows.filter((r) => r.status.toLowerCase().includes('on-time')).length;
  const lateCount = rows.filter((r) => r.status.toLowerCase().includes('late')).length;

  doc.setFillColor(241, 245, 249);
  doc.rect(14, 28, 269, 10, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, 28, 269, 10, 'S');

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Records: ${rows.length}`, 18, 34);
  doc.text(`Present Punches: ${totalPunches}`, 65, 34);
  doc.text(`On-Time: ${onTimeCount}`, 120, 34);
  doc.text(`Late Check-Ins: ${lateCount}`, 165, 34);
  doc.text(`Sundays Marked: ${totalSundays}`, 215, 34);

  // Table Data Mapping
  const tableData = rows.map((r) => {
    if (r.isSunday) {
      return [
        r.no,
        '---',
        '🔴 SUNDAY REST DAY',
        r.branchNameEn,
        r.date,
        r.dayOfWeek.split(' ')[0],
        '--:--',
        '--:--',
        '0.0h',
        'SUNDAY OFF',
        'Official Weekly Rest Day',
      ];
    }
    return [
      r.no,
      r.enrollId,
      r.nameEn,
      r.branchNameEn,
      r.date,
      r.dayOfWeek.split(' ')[0],
      r.timeIn,
      r.timeOut,
      r.durationHours,
      r.status,
      r.remark,
    ];
  });

  autoTable(doc, {
    startY: 42,
    head: [[
      'No',
      'Enroll ID',
      'User Name',
      'Branch',
      'Date',
      'Day',
      'Time In',
      'Time Out',
      'Work Hrs',
      'Status',
      'Remark & Geofence Verification',
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229], // Indigo 600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' }, // No
      1: { cellWidth: 18, fontStyle: 'bold' }, // Enroll ID
      2: { cellWidth: 32, fontStyle: 'bold' }, // User Name
      3: { cellWidth: 30 }, // Branch
      4: { cellWidth: 20 }, // Date
      5: { cellWidth: 18 }, // Day
      6: { cellWidth: 18, halign: 'center' }, // Time In
      7: { cellWidth: 18, halign: 'center' }, // Time Out
      8: { cellWidth: 16, halign: 'center' }, // Duration
      9: { cellWidth: 26 }, // Status
      10: { cellWidth: 'auto' }, // Remark
    },
    didParseCell: function (data) {
      // Check if Sunday row
      const rowIndex = data.row.index;
      const rowItem = rows[rowIndex];
      if (rowItem && rowItem.isSunday) {
        data.cell.styles.fillColor = [254, 242, 242]; // Red-50
        data.cell.styles.textColor = [185, 28, 28]; // Red-700
        data.cell.styles.fontStyle = 'bold';
      } else if (data.section === 'body' && data.column.index === 9) {
        // Status color highlights
        const val = String(data.cell.raw).toLowerCase();
        if (val.includes('late')) {
          data.cell.styles.textColor = [217, 119, 6]; // Amber-600
          data.cell.styles.fontStyle = 'bold';
        } else if (val.includes('on-time')) {
          data.cell.styles.textColor = [16, 185, 129]; // Emerald-600
        } else if (val.includes('overtime')) {
          data.cell.styles.textColor = [99, 102, 241]; // Indigo-600
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    didDrawPage: function (data) {
      // Footer Signatures on last page
      const pageCount = doc.internal.pages.length - 1;
      const currentPage = data.pageNumber;

      // Footer Note & Page Number
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${currentPage} of ${pageCount}  •  Enterprise Geofence Attendance System  •  Confidential`,
        14,
        205
      );

      if (currentPage === pageCount) {
        const signY = 188;
        doc.setDrawColor(203, 213, 225);
        doc.line(20, signY, 75, signY);
        doc.line(115, signY, 170, signY);
        doc.line(215, signY, 270, signY);

        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text('Prepared By (HR Officer)', 20, signY + 4);
        doc.text('Checked By (Branch Manager)', 115, signY + 4);
        doc.text('Approved By (Managing Director)', 215, signY + 4);
      }
    },
  });

  doc.save(
    `Attendance_Report_${branchTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
  );
}

export function exportMergedSummaryToPdf(
  summaries: EmployeeMergedSummary[],
  branchTitle: string,
  dateRangeStr: string,
  companyName: string = 'ENTERPRISE MULTI-BRANCH HR SUITE'
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Top Header Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName.toUpperCase(), 14, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`CONSOLIDATED EMPLOYEE ATTENDANCE & PAYROLL SUMMARY — BRANCH: ${branchTitle.toUpperCase()}`, 14, 18);

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Period: ${dateRangeStr}  |  Generated: ${new Date().toLocaleString()}`, 297 - 14, 15, {
    align: 'right',
  });

  // Summary Metrics Bar
  const totalEmployees = summaries.length;
  const totalWorkHours = summaries.reduce((acc, s) => acc + s.totalWorkHours, 0).toFixed(1);
  const totalOtHours = summaries.reduce((acc, s) => acc + s.totalOtHours, 0).toFixed(1);
  const avgAttendance = totalEmployees > 0
    ? Math.round(summaries.reduce((acc, s) => acc + s.attendanceRate, 0) / totalEmployees)
    : 100;

  doc.setFillColor(241, 245, 249);
  doc.rect(14, 28, 269, 10, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, 28, 269, 10, 'S');

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Employees: ${totalEmployees}`, 18, 34);
  doc.text(`Total Work Hours: ${totalWorkHours}h`, 65, 34);
  doc.text(`Total OT Hours: ${totalOtHours}h`, 125, 34);
  doc.text(`Avg Attendance Rate: ${avgAttendance}%`, 185, 34);

  const tableData = summaries.map((s, idx) => [
    idx + 1,
    s.enrollId,
    s.nameEn,
    s.department,
    s.branchNameEn,
    s.totalDaysInRange,
    s.daysPresent,
    s.daysLate,
    `${s.totalWorkHours}h`,
    `${s.totalOtHours}h`,
    s.sundaysCount,
    `${s.attendanceRate}%`,
  ]);

  autoTable(doc, {
    startY: 42,
    head: [[
      'No',
      'Enroll ID',
      'Employee Name',
      'Department',
      'Branch',
      'Days',
      'Present',
      'Late',
      'Work Hrs',
      'OT Hrs',
      'Sundays',
      'Attendance Rate',
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 20, fontStyle: 'bold' },
      2: { cellWidth: 40, fontStyle: 'bold' },
      3: { cellWidth: 32 },
      4: { cellWidth: 35 },
      5: { cellWidth: 15, halign: 'center' },
      6: { cellWidth: 16, halign: 'center' },
      7: { cellWidth: 14, halign: 'center' },
      8: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      9: { cellWidth: 18, halign: 'center' },
      10: { cellWidth: 16, halign: 'center' },
      11: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: function (data) {
      if (data.section === 'body' && data.column.index === 11) {
        const rate = parseInt(String(data.cell.raw));
        if (rate >= 90) {
          data.cell.styles.textColor = [16, 185, 129];
        } else if (rate >= 75) {
          data.cell.styles.textColor = [217, 119, 6];
        } else {
          data.cell.styles.textColor = [225, 29, 72];
        }
      }
    },
    didDrawPage: function (data) {
      const pageCount = doc.internal.pages.length - 1;
      const currentPage = data.pageNumber;

      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${currentPage} of ${pageCount}  •  Consolidated Employee Attendance Summary  •  Confidential`,
        14,
        205
      );

      if (currentPage === pageCount) {
        const signY = 188;
        doc.setDrawColor(203, 213, 225);
        doc.line(20, signY, 75, signY);
        doc.line(115, signY, 170, signY);
        doc.line(215, signY, 270, signY);

        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text('Prepared By (HR Officer)', 20, signY + 4);
        doc.text('Checked By (Branch Manager)', 115, signY + 4);
        doc.text('Approved By (Managing Director)', 215, signY + 4);
      }
    },
  });

  doc.save(
    `Merged_Employee_Summary_${branchTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
  );
}
