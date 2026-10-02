import ExcelJS from 'exceljs';
import { TimesheetRow, EmployeeMergedSummary } from './reportExportUtils';
import { DAILY_TIMESHEET_COLUMNS, MERGED_SUMMARY_COLUMNS, ReportTableSettings, TableColumnDef } from '../types/tableCustomization';
import { Language } from '../types';

// Convert hex color like '#1e293b' to ARGB hex 'FF1E293B' for ExcelJS
function hexToArgb(hex: string, defaultArgb = 'FF000000'): string {
  if (!hex) return defaultArgb;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length === 6) {
    return `FF${clean.toUpperCase()}`;
  }
  if (clean.length === 8) {
    return clean.toUpperCase();
  }
  return defaultArgb;
}

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
};

const CARD_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'medium', color: { argb: 'FFCBD5E1' } },
  left: { style: 'medium', color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'medium', color: { argb: 'FFCBD5E1' } },
  right: { style: 'medium', color: { argb: 'FFCBD5E1' } },
};

/**
 * Export Daily Timesheet Matrix to beautifully styled XLSX matching PDF layout
 */
export async function exportTimesheetToXlsx(
  rows: TimesheetRow[],
  branchTitle: string,
  dateRangeStr: string,
  companyName: string = 'ENTERPRISE MULTI-BRANCH HR SUITE',
  tableSettings?: ReportTableSettings,
  availableColumns: TableColumnDef[] = DAILY_TIMESHEET_COLUMNS,
  lang: Language = 'km'
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = companyName;
  workbook.lastModifiedBy = 'Enterprise HR System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet('Attendance Timesheet', {
    views: [{ showGridLines: true }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });

  // Determine visible columns
  const visibleCols = tableSettings?.visibleColumns
    ? availableColumns.filter((col) => tableSettings.visibleColumns.includes(col.id))
    : availableColumns;

  const totalCols = Math.max(visibleCols.length, 5);

  // Compute KPI metrics just like PDF
  const totalPunches = rows.filter((r) => r.timeIn !== '--:--' || r.timeOut !== '--:--').length;
  const onTimeCount = rows.filter((r) => r.status.toLowerCase().includes('on-time')).length;
  const lateCount = rows.filter((r) => r.status.toLowerCase().includes('late')).length;
  const totalSundays = rows.filter((r) => r.isSunday).length;

  // Font family name for Excel
  const fontName = tableSettings?.fontFamily === 'Inter' ? 'Segoe UI' : 'Arial';

  // 1. Company Name Super-header Banner
  const compRow = sheet.addRow([companyName.toUpperCase()]);
  compRow.height = 20;
  sheet.mergeCells(1, 1, 1, totalCols);
  const compCell = sheet.getCell(1, 1);
  compCell.font = { name: fontName, size: 10, bold: true, color: { argb: 'FF64748B' } };
  compCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // 2. Report Main Title
  const titleRow = sheet.addRow(['DAILY ATTENDANCE AUDIT & PUNCH TIMESHEET']);
  titleRow.height = 28;
  sheet.mergeCells(2, 1, 2, totalCols);
  const titleCell = sheet.getCell(2, 1);
  titleCell.font = { name: fontName, size: 16, bold: true, color: { argb: 'FF0F172A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // 3. Khmer Subtitle
  const subRow = sheet.addRow(['របាយការណ៍សវនកម្មវត្តមាន និងកត់ម៉ោងបុគ្គលិកប្រចាំថ្ងៃ']);
  subRow.height = 20;
  sheet.mergeCells(3, 1, 3, totalCols);
  const subCell = sheet.getCell(3, 1);
  subCell.font = { name: fontName, size: 11, bold: true, color: { argb: 'FF475569' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // 4. Blank spacer
  sheet.addRow([]);

  // 5. Metadata Bar (Branch, Period, Generated timestamp)
  const metaText = `សាខា (Branch): ${branchTitle}    |    កាលបរិច្ឆេទ (Period): ${dateRangeStr}    |    បង្កើតនៅ (Generated): ${new Date().toLocaleString()}`;
  const metaRow = sheet.addRow([metaText]);
  metaRow.height = 24;
  sheet.mergeCells(5, 1, 5, totalCols);
  const metaCell = sheet.getCell(5, 1);
  metaCell.font = { name: fontName, size: 10, bold: true, color: { argb: 'FF1E293B' } };
  metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
  metaCell.border = THIN_BORDER;

  // 6. Blank spacer
  sheet.addRow([]);

  // 7 & 8. KPI Summary Cards (Just like the PDF header cards)
  const kpiRow1 = sheet.addRow(['កំណត់ត្រាសរុប (Total)', 'វត្តមានស្កេន (Punches)', 'ទាន់ពេល (On-Time)', 'មកយឺត (Late)', 'ថ្ងៃអាទិត្យ (Sundays)']);
  kpiRow1.height = 18;
  const kpiRow2 = sheet.addRow([rows.length, totalPunches, onTimeCount, lateCount, totalSundays]);
  kpiRow2.height = 26;

  const kpiFills = ['FFF1F5F9', 'FFECFDF5', 'FFEFF6FF', 'FFFFFBEB', 'FFFEF2F2'];
  const kpiTextColors = ['FF0F172A', 'FF047857', 'FF2563EB', 'FFD97706', 'FFDC2626'];

  for (let c = 1; c <= 5; c++) {
    const headerCell = kpiRow1.getCell(c);
    headerCell.font = { name: fontName, size: 9, bold: true, color: { argb: 'FF64748B' } };
    headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kpiFills[c - 1] } };
    headerCell.border = THIN_BORDER;

    const valCell = kpiRow2.getCell(c);
    valCell.font = { name: fontName, size: 14, bold: true, color: { argb: kpiTextColors[c - 1] } };
    valCell.alignment = { horizontal: 'center', vertical: 'middle' };
    valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kpiFills[c - 1] } };
    valCell.border = THIN_BORDER;
  }

  // 9. Blank spacer
  sheet.addRow([]);

  // 10. Table Column Header Row
  const headerLabels = visibleCols.map((c) => (lang === 'km' ? c.labelKh : c.labelEn));
  const tableHeaderRow = sheet.addRow(headerLabels);
  tableHeaderRow.height = 26;

  // Header Theme color
  let headerBgArgb = 'FF1E293B'; // Slate Dark (default)
  let headerTextArgb = 'FFFFFFFF';
  if (tableSettings?.headerTheme === 'indigo') {
    headerBgArgb = 'FF4338CA';
  } else if (tableSettings?.headerTheme === 'slate-light') {
    headerBgArgb = 'FFF1F5F9';
    headerTextArgb = 'FF1E293B';
  } else if (tableSettings?.headerTheme === 'clean-white') {
    headerBgArgb = 'FFFFFFFF';
    headerTextArgb = 'FF0F172A';
  }

  tableHeaderRow.eachCell((cell, colIndex) => {
    cell.font = { name: fontName, size: 10, bold: true, color: { argb: headerTextArgb } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBgArgb } };
    cell.border = THIN_BORDER;
    const colDef = visibleCols[colIndex - 1];
    cell.alignment = {
      horizontal: colDef?.align === 'center' ? 'center' : 'left',
      vertical: 'middle',
      wrapText: true
    };
  });

  // Freeze panes right below header row
  sheet.views = [{ state: 'frozen', ySplit: 10, showGridLines: true }];

  // 11. Table Data Rows
  rows.forEach((r, idx) => {
    const isSun = r.isSunday;
    const isOff = r.isDayOff;
    const isLv = r.isLeave;

    let rowBg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
    let textArgb = 'FF1E293B';
    let isBold = false;

    if (isSun) {
      rowBg = 'FFFEF2F2';
      textArgb = 'FF991B1B';
      isBold = true;
    } else if (isOff) {
      rowBg = 'FFFEF3C7';
      textArgb = 'FF92400E';
      isBold = true;
    } else if (isLv) {
      rowBg = 'FFF3E8FF';
      textArgb = 'FF6B21A8';
      isBold = true;
    }

    const rowValues = visibleCols.map((col) => {
      switch (col.id) {
        case 'no':
          return r.no;
        case 'date':
          return r.date;
        case 'dayOfWeek':
          return r.dayOfWeek;
        case 'name':
          return lang === 'km' ? (r.nameKh ? `${r.nameKh} (${r.nameEn})` : r.nameEn) : r.nameEn;
        case 'employeeId':
          return r.enrollId;
        case 'department':
          return r.department || '---';
        case 'branch':
          return lang === 'km' && r.branchNameKh ? r.branchNameKh : r.branchNameEn;
        case 'timeIn':
          return isSun || isOff || isLv ? '--:--' : r.timeIn;
        case 'timeOut':
          return isSun || isOff || isLv ? '--:--' : r.timeOut;
        case 'duration':
          return isSun || isOff || isLv ? '0.0h' : r.durationHours;
        case 'status':
          return isSun ? 'SUNDAY REST' : isOff ? 'DAY OFF' : isLv ? 'ON LEAVE' : r.status;
        case 'remark':
          return r.remark || '';
        default:
          return '';
      }
    });

    const dataRow = sheet.addRow(rowValues);
    dataRow.height = 20;

    dataRow.eachCell((cell, colIndex) => {
      const colDef = visibleCols[colIndex - 1];
      cell.font = { name: fontName, size: 9.5, bold: isBold, color: { argb: textArgb } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.border = THIN_BORDER;
      cell.alignment = {
        horizontal: colDef?.align === 'center' ? 'center' : 'left',
        vertical: 'middle'
      };

      // Custom cell highlights for status column
      if (colDef?.id === 'status' && !isSun && !isOff && !isLv) {
        const sLower = String(cell.value || '').toLowerCase();
        if (sLower.includes('on-time')) {
          cell.font = { name: fontName, size: 9.5, bold: true, color: { argb: 'FF047857' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
        } else if (sLower.includes('late')) {
          cell.font = { name: fontName, size: 9.5, bold: true, color: { argb: 'FFB45309' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
        } else if (sLower.includes('overtime')) {
          cell.font = { name: fontName, size: 9.5, bold: true, color: { argb: 'FF6D28D9' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };
        }
      }
    });
  });

  // Set explicit column widths matching user settings
  visibleCols.forEach((col, idx) => {
    const px = tableSettings?.columnWidths?.[col.id] || col.defaultWidth;
    // Excel column width in character units: ~ px / 7.5
    sheet.getColumn(idx + 1).width = Math.max(10, Math.round(px / 7.5));
  });

  // Generate buffer and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Timesheet_Report_${branchTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Merged Summary Table to beautifully styled XLSX matching PDF layout
 */
export async function exportMergedSummaryToXlsx(
  summaries: EmployeeMergedSummary[],
  branchTitle: string,
  dateRangeStr: string,
  companyName: string = 'ENTERPRISE MULTI-BRANCH HR SUITE',
  tableSettings?: ReportTableSettings,
  availableColumns: TableColumnDef[] = MERGED_SUMMARY_COLUMNS,
  lang: Language = 'km'
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = companyName;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Employee Summary', {
    views: [{ showGridLines: true }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });

  const visibleCols = tableSettings?.visibleColumns
    ? availableColumns.filter((col) => tableSettings.visibleColumns.includes(col.id))
    : availableColumns;

  const totalCols = Math.max(visibleCols.length, 4);

  const totalEmployees = summaries.length;
  const totalWorkHours = summaries.reduce((acc, s) => acc + s.totalWorkHours, 0).toFixed(1);
  const totalOtHours = summaries.reduce((acc, s) => acc + s.totalOtHours, 0).toFixed(1);
  const avgAttendance = totalEmployees > 0
    ? Math.round(summaries.reduce((acc, s) => acc + s.attendanceRate, 0) / totalEmployees)
    : 100;

  const fontName = tableSettings?.fontFamily === 'Inter' ? 'Segoe UI' : 'Arial';

  // 1. Company Name Super-header Banner
  const compRow = sheet.addRow([companyName.toUpperCase()]);
  compRow.height = 20;
  sheet.mergeCells(1, 1, 1, totalCols);
  const compCell = sheet.getCell(1, 1);
  compCell.font = { name: fontName, size: 10, bold: true, color: { argb: 'FF64748B' } };
  compCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // 2. Report Main Title
  const titleRow = sheet.addRow(['CONSOLIDATED EMPLOYEE ATTENDANCE & WORK SUMMARY']);
  titleRow.height = 28;
  sheet.mergeCells(2, 1, 2, totalCols);
  const titleCell = sheet.getCell(2, 1);
  titleCell.font = { name: fontName, size: 16, bold: true, color: { argb: 'FF0F172A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // 3. Khmer Subtitle
  const subRow = sheet.addRow(['របាយការណ៍សង្ខេបវត្តមាន និងម៉ោងការងារបុគ្គលិកប្រចាំខែ']);
  subRow.height = 20;
  sheet.mergeCells(3, 1, 3, totalCols);
  const subCell = sheet.getCell(3, 1);
  subCell.font = { name: fontName, size: 11, bold: true, color: { argb: 'FF475569' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // 4. Blank spacer
  sheet.addRow([]);

  // 5. Metadata Bar
  const metaText = `សាខា (Branch): ${branchTitle}    |    កាលបរិច្ឆេទ (Period): ${dateRangeStr}    |    ចំនួនបុគ្គលិក (Staff Count): ${totalEmployees} នាក់`;
  const metaRow = sheet.addRow([metaText]);
  metaRow.height = 24;
  sheet.mergeCells(5, 1, 5, totalCols);
  const metaCell = sheet.getCell(5, 1);
  metaCell.font = { name: fontName, size: 10, bold: true, color: { argb: 'FF1E293B' } };
  metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
  metaCell.border = THIN_BORDER;

  // 6. Blank spacer
  sheet.addRow([]);

  // 7 & 8. KPI Summary Cards
  const kpiRow1 = sheet.addRow([
    'បុគ្គលិកសរុប (Total Staff)',
    'ម៉ោងការងារសរុប (Total Work Hours)',
    'ម៉ោងបន្ថែម OT (Total OT Hours)',
    'អត្រាវត្តមានមធ្យម (Avg Attendance)'
  ]);
  kpiRow1.height = 18;

  const kpiRow2 = sheet.addRow([
    totalEmployees,
    `${totalWorkHours}h`,
    `${totalOtHours}h`,
    `${avgAttendance}%`
  ]);
  kpiRow2.height = 26;

  const kpiFills = ['FFF1F5F9', 'FFEFF6FF', 'FFF5F3FF', 'FFECFDF5'];
  const kpiTextColors = ['FF0F172A', 'FF2563EB', 'FF6D28D9', 'FF047857'];

  for (let c = 1; c <= 4; c++) {
    const headerCell = kpiRow1.getCell(c);
    headerCell.font = { name: fontName, size: 9, bold: true, color: { argb: 'FF64748B' } };
    headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kpiFills[c - 1] } };
    headerCell.border = THIN_BORDER;

    const valCell = kpiRow2.getCell(c);
    valCell.font = { name: fontName, size: 14, bold: true, color: { argb: kpiTextColors[c - 1] } };
    valCell.alignment = { horizontal: 'center', vertical: 'middle' };
    valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kpiFills[c - 1] } };
    valCell.border = THIN_BORDER;
  }

  // 9. Blank spacer
  sheet.addRow([]);

  // 10. Table Column Header Row
  const headerLabels = visibleCols.map((c) => (lang === 'km' ? c.labelKh : c.labelEn));
  const tableHeaderRow = sheet.addRow(headerLabels);
  tableHeaderRow.height = 26;

  let headerBgArgb = 'FF1E293B';
  let headerTextArgb = 'FFFFFFFF';
  if (tableSettings?.headerTheme === 'indigo') headerBgArgb = 'FF4338CA';
  else if (tableSettings?.headerTheme === 'slate-light') {
    headerBgArgb = 'FFF1F5F9';
    headerTextArgb = 'FF1E293B';
  } else if (tableSettings?.headerTheme === 'clean-white') {
    headerBgArgb = 'FFFFFFFF';
    headerTextArgb = 'FF0F172A';
  }

  tableHeaderRow.eachCell((cell, colIndex) => {
    cell.font = { name: fontName, size: 10, bold: true, color: { argb: headerTextArgb } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBgArgb } };
    cell.border = THIN_BORDER;
    const colDef = visibleCols[colIndex - 1];
    cell.alignment = {
      horizontal: colDef?.align === 'center' ? 'center' : 'left',
      vertical: 'middle'
    };
  });

  sheet.views = [{ state: 'frozen', ySplit: 10, showGridLines: true }];

  // 11. Table Data Rows
  summaries.forEach((s, idx) => {
    const rowBg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';

    const rowValues = visibleCols.map((col) => {
      switch (col.id) {
        case 'no':
          return idx + 1;
        case 'enrollId':
          return s.enrollId || s.employeeId.slice(0, 6);
        case 'name':
          return lang === 'km' ? (s.nameKh ? `${s.nameKh} (${s.nameEn})` : s.nameEn) : s.nameEn;
        case 'department':
          return s.department || '---';
        case 'role':
          return s.role || 'Staff';
        case 'branch':
          return lang === 'km' && s.branchNameKh ? s.branchNameKh : s.branchNameEn;
        case 'daysPresent':
          return s.daysPresent;
        case 'totalWorkHours':
          return `${s.totalWorkHours}h`;
        case 'daysOnTime':
          return s.daysOnTime;
        case 'daysLate':
          return s.daysLate;
        case 'totalOtHours':
          return `${s.totalOtHours}h`;
        case 'sundaysCount':
          return s.sundaysCount;
        case 'attendanceRate':
          return `${s.attendanceRate}%`;
        default:
          return '';
      }
    });

    const dataRow = sheet.addRow(rowValues);
    dataRow.height = 20;

    dataRow.eachCell((cell, colIndex) => {
      const colDef = visibleCols[colIndex - 1];
      cell.font = { name: fontName, size: 9.5, color: { argb: 'FF1E293B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.border = THIN_BORDER;
      cell.alignment = {
        horizontal: colDef?.align === 'center' ? 'center' : 'left',
        vertical: 'middle'
      };

      if (colDef?.id === 'enrollId') {
        cell.font = { name: fontName, size: 9.5, bold: true, color: { argb: 'FF4338CA' } };
      } else if (colDef?.id === 'name') {
        cell.font = { name: fontName, size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      } else if (colDef?.id === 'totalWorkHours') {
        cell.font = { name: fontName, size: 9.5, bold: true, color: { argb: 'FF4338CA' } };
      } else if (colDef?.id === 'daysPresent') {
        cell.font = { name: fontName, size: 9.5, bold: true, color: { argb: 'FF047857' } };
      } else if (colDef?.id === 'attendanceRate') {
        cell.font = { name: fontName, size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      }
    });
  });

  // Set explicit column widths
  visibleCols.forEach((col, idx) => {
    const px = tableSettings?.columnWidths?.[col.id] || col.defaultWidth;
    sheet.getColumn(idx + 1).width = Math.max(10, Math.round(px / 7.5));
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Merged_Employee_Summary_${branchTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Daily Timesheet to Formatted CSV with Metadata Header & KPI Summary
 */
export function exportTimesheetToFormattedCsv(
  rows: TimesheetRow[],
  branchTitle: string,
  dateRangeStr: string,
  companyName: string = 'ENTERPRISE MULTI-BRANCH HR SUITE',
  tableSettings?: ReportTableSettings,
  availableColumns: TableColumnDef[] = DAILY_TIMESHEET_COLUMNS,
  lang: Language = 'km'
): void {
  const visibleCols = tableSettings?.visibleColumns
    ? availableColumns.filter((col) => tableSettings.visibleColumns.includes(col.id))
    : availableColumns;

  const totalPunches = rows.filter((r) => r.timeIn !== '--:--' || r.timeOut !== '--:--').length;
  const onTimeCount = rows.filter((r) => r.status.toLowerCase().includes('on-time')).length;
  const lateCount = rows.filter((r) => r.status.toLowerCase().includes('late')).length;
  const totalSundays = rows.filter((r) => r.isSunday).length;

  const headerTitles = visibleCols.map((c) => `"${lang === 'km' ? c.labelKh : c.labelEn}"`);

  const csvRows = rows.map((r) => {
    const isSun = r.isSunday;
    const isOff = r.isDayOff;
    const isLv = r.isLeave;

    return visibleCols.map((col) => {
      switch (col.id) {
        case 'no':
          return r.no;
        case 'date':
          return `"${r.date}"`;
        case 'dayOfWeek':
          return `"${r.dayOfWeek}"`;
        case 'name':
          return `"${lang === 'km' ? (r.nameKh ? `${r.nameKh} (${r.nameEn})` : r.nameEn) : r.nameEn}"`;
        case 'employeeId':
          return `"${r.enrollId}"`;
        case 'department':
          return `"${r.department || '---'}"`;
        case 'branch':
          return `"${lang === 'km' && r.branchNameKh ? r.branchNameKh : r.branchNameEn}"`;
        case 'timeIn':
          return `"${isSun || isOff || isLv ? '--:--' : r.timeIn}"`;
        case 'timeOut':
          return `"${isSun || isOff || isLv ? '--:--' : r.timeOut}"`;
        case 'duration':
          return `"${isSun || isOff || isLv ? '0.0h' : r.durationHours}"`;
        case 'status':
          return `"${isSun ? 'SUNDAY REST' : isOff ? 'DAY OFF' : isLv ? 'ON LEAVE' : r.status}"`;
        case 'remark':
          return `"${(r.remark || '').replace(/"/g, '""')}"`;
        default:
          return '""';
      }
    }).join(',');
  });

  const metadataBlock = [
    `"${companyName.toUpperCase()}"`,
    `"DAILY ATTENDANCE AUDIT & PUNCH TIMESHEET / របាយការណ៍សវនកម្មវត្តមាន និងកត់ម៉ោងបុគ្គលិក"`,
    `"Branch / សាខា: ${branchTitle}"`,
    `"Period / កាលបរិច្ឆេទ: ${dateRangeStr}"`,
    `"Generated At / កាលបរិច្ឆេទបង្កើត: ${new Date().toLocaleString()}"`,
    `""`,
    `"--- KPI METRICS SUMMARY / សង្ខេបស្ថិតិ ---"`,
    `"Total Records / កំណត់ត្រាសរុប: ${rows.length}"`,
    `"Punches Logged / វត្តមានស្កេន: ${totalPunches}"`,
    `"On-Time / ទាន់ពេល: ${onTimeCount}"`,
    `"Late / មកយឺត: ${lateCount}"`,
    `"Sundays / ថ្ងៃអាទិត្យ: ${totalSundays}"`,
    `""`,
  ].join('\n');

  const csvContent = '\uFEFF' + metadataBlock + headerTitles.join(',') + '\n' + csvRows.join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Timesheet_Report_${branchTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Merged Summary to Formatted CSV with Metadata Header & KPI Summary
 */
export function exportMergedSummaryToFormattedCsv(
  summaries: EmployeeMergedSummary[],
  branchTitle: string,
  dateRangeStr: string,
  companyName: string = 'ENTERPRISE MULTI-BRANCH HR SUITE',
  tableSettings?: ReportTableSettings,
  availableColumns: TableColumnDef[] = MERGED_SUMMARY_COLUMNS,
  lang: Language = 'km'
): void {
  const visibleCols = tableSettings?.visibleColumns
    ? availableColumns.filter((col) => tableSettings.visibleColumns.includes(col.id))
    : availableColumns;

  const totalEmployees = summaries.length;
  const totalWorkHours = summaries.reduce((acc, s) => acc + s.totalWorkHours, 0).toFixed(1);
  const totalOtHours = summaries.reduce((acc, s) => acc + s.totalOtHours, 0).toFixed(1);
  const avgAttendance = totalEmployees > 0
    ? Math.round(summaries.reduce((acc, s) => acc + s.attendanceRate, 0) / totalEmployees)
    : 100;

  const headerTitles = visibleCols.map((c) => `"${lang === 'km' ? c.labelKh : c.labelEn}"`);

  const csvRows = summaries.map((s, idx) => {
    return visibleCols.map((col) => {
      switch (col.id) {
        case 'no':
          return idx + 1;
        case 'enrollId':
          return `"${s.enrollId || s.employeeId.slice(0, 6)}"`;
        case 'name':
          return `"${lang === 'km' ? (s.nameKh ? `${s.nameKh} (${s.nameEn})` : s.nameEn) : s.nameEn}"`;
        case 'department':
          return `"${s.department || '---'}"`;
        case 'role':
          return `"${s.role || 'Staff'}"`;
        case 'branch':
          return `"${lang === 'km' && s.branchNameKh ? s.branchNameKh : s.branchNameEn}"`;
        case 'daysPresent':
          return s.daysPresent;
        case 'totalWorkHours':
          return `"${s.totalWorkHours}h"`;
        case 'daysOnTime':
          return s.daysOnTime;
        case 'daysLate':
          return s.daysLate;
        case 'totalOtHours':
          return `"${s.totalOtHours}h"`;
        case 'sundaysCount':
          return s.sundaysCount;
        case 'attendanceRate':
          return `"${s.attendanceRate}%"`;
        default:
          return '""';
      }
    }).join(',');
  });

  const metadataBlock = [
    `"${companyName.toUpperCase()}"`,
    `"CONSOLIDATED EMPLOYEE ATTENDANCE & WORK SUMMARY / របាយការណ៍សង្ខេបវត្តមាន និងម៉ោងការងារបុគ្គលិក"`,
    `"Branch / សាខា: ${branchTitle}"`,
    `"Period / កាលបរិច្ឆេទ: ${dateRangeStr}"`,
    `"Staff Count / ចំនួនបុគ្គលិក: ${totalEmployees} នាក់"`,
    `"Total Work Hours / ម៉ោងការងារសរុប: ${totalWorkHours}h"`,
    `"Total OT Hours / ម៉ោងបន្ថែម OT: ${totalOtHours}h"`,
    `"Avg Attendance Rate / អត្រាវត្តមានមធ្យម: ${avgAttendance}%"`,
    `"Generated At / កាលបរិច្ឆេទបង្កើត: ${new Date().toLocaleString()}"`,
    `""`,
  ].join('\n');

  const csvContent = '\uFEFF' + metadataBlock + headerTitles.join(',') + '\n' + csvRows.join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Merged_Employee_Summary_${branchTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
