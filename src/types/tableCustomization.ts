export interface TableColumnDef {
  id: string;
  labelEn: string;
  labelKh: string;
  shortLabel?: string;
  defaultWidth: number; // in pixels
  minWidth: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
  category?: 'identity' | 'time' | 'status' | 'meta';
  isDefaultVisible: boolean;
}

export type TableFontFamily =
  | 'Kantumruy Pro'
  | 'Battambang'
  | 'Siemreap'
  | 'Moul'
  | 'Inter'
  | 'Roboto'
  | 'Monospace';

export type TableDensity = 'compact' | 'standard' | 'spacious';
export type TableHeaderTheme = 'slate-dark' | 'slate-light' | 'indigo' | 'clean-white';
export type TableBorderStyle = 'subtle' | 'grid' | 'minimal';

export interface ReportTableSettings {
  // Columns visibility & order
  visibleColumns: string[];
  columnOrder: string[];
  columnWidths: Record<string, number>; // column id -> px width

  // Typography
  fontFamily: TableFontFamily;
  fontSizePx: number; // e.g. 10 to 18
  headerBold: boolean;

  // Layout & Styling
  density: TableDensity;
  zebraStripes: boolean;
  borderStyle: TableBorderStyle;
  headerTheme: TableHeaderTheme;

  // Print & Export Sync
  applyToPrint: boolean;
  applyToExport: boolean;
}

// Columns for Daily Chronological Timesheet Roster
export const DAILY_TIMESHEET_COLUMNS: TableColumnDef[] = [
  {
    id: 'no',
    labelEn: 'No',
    labelKh: 'ល.រ',
    defaultWidth: 50,
    minWidth: 40,
    maxWidth: 70,
    align: 'center',
    category: 'identity',
    isDefaultVisible: true,
  },
  {
    id: 'date',
    labelEn: 'Date',
    labelKh: 'កាលបរិច្ឆេទ',
    defaultWidth: 100,
    minWidth: 85,
    maxWidth: 130,
    align: 'left',
    category: 'time',
    isDefaultVisible: true,
  },
  {
    id: 'dayOfWeek',
    labelEn: 'Day of Week',
    labelKh: 'ថ្ងៃនៃសប្តាហ៍',
    defaultWidth: 105,
    minWidth: 85,
    maxWidth: 135,
    align: 'left',
    category: 'time',
    isDefaultVisible: true,
  },
  {
    id: 'name',
    labelEn: 'Employee Name',
    labelKh: 'ឈ្មោះបុគ្គលិក',
    defaultWidth: 190,
    minWidth: 130,
    maxWidth: 280,
    align: 'left',
    category: 'identity',
    isDefaultVisible: true,
  },
  {
    id: 'employeeId',
    labelEn: 'Staff ID',
    labelKh: 'អត្តលេខ',
    defaultWidth: 85,
    minWidth: 65,
    maxWidth: 120,
    align: 'center',
    category: 'identity',
    isDefaultVisible: true,
  },
  {
    id: 'department',
    labelEn: 'Department',
    labelKh: 'ផ្នែក / ដេប៉ាតឺម៉ង់',
    defaultWidth: 120,
    minWidth: 90,
    maxWidth: 170,
    align: 'left',
    category: 'identity',
    isDefaultVisible: true,
  },
  {
    id: 'branch',
    labelEn: 'Branch',
    labelKh: 'សាខា',
    defaultWidth: 120,
    minWidth: 90,
    maxWidth: 170,
    align: 'left',
    category: 'identity',
    isDefaultVisible: true,
  },
  {
    id: 'timeIn',
    labelEn: 'Time In',
    labelKh: 'ម៉ោងចូល',
    defaultWidth: 85,
    minWidth: 70,
    maxWidth: 110,
    align: 'center',
    category: 'time',
    isDefaultVisible: true,
  },
  {
    id: 'timeOut',
    labelEn: 'Time Out',
    labelKh: 'ម៉ោងចេញ',
    defaultWidth: 85,
    minWidth: 70,
    maxWidth: 110,
    align: 'center',
    category: 'time',
    isDefaultVisible: true,
  },
  {
    id: 'duration',
    labelEn: 'Work Hours',
    labelKh: 'ម៉ោងការងារ',
    defaultWidth: 85,
    minWidth: 70,
    maxWidth: 110,
    align: 'center',
    category: 'time',
    isDefaultVisible: true,
  },
  {
    id: 'status',
    labelEn: 'Status',
    labelKh: 'ស្ថានភាព',
    defaultWidth: 115,
    minWidth: 85,
    maxWidth: 160,
    align: 'center',
    category: 'status',
    isDefaultVisible: true,
  },
  {
    id: 'remark',
    labelEn: 'Remark & GPS',
    labelKh: 'សម្គាល់ & GPS',
    defaultWidth: 220,
    minWidth: 140,
    maxWidth: 380,
    align: 'left',
    category: 'meta',
    isDefaultVisible: true,
  },
];

// Columns for Merged / Consolidated Employee Summary Table
export const MERGED_SUMMARY_COLUMNS: TableColumnDef[] = [
  {
    id: 'no',
    labelEn: 'No',
    labelKh: 'ល.រ',
    defaultWidth: 50,
    minWidth: 40,
    maxWidth: 70,
    align: 'center',
    category: 'identity',
    isDefaultVisible: true,
  },
  {
    id: 'enrollId',
    labelEn: 'Staff ID',
    labelKh: 'អត្តលេខ',
    defaultWidth: 85,
    minWidth: 65,
    maxWidth: 120,
    align: 'center',
    category: 'identity',
    isDefaultVisible: true,
  },
  {
    id: 'name',
    labelEn: 'Employee Name',
    labelKh: 'ឈ្មោះបុគ្គលិក',
    defaultWidth: 180,
    minWidth: 130,
    maxWidth: 260,
    align: 'left',
    category: 'identity',
    isDefaultVisible: true,
  },
  {
    id: 'department',
    labelEn: 'Department',
    labelKh: 'ផ្នែក',
    defaultWidth: 120,
    minWidth: 85,
    maxWidth: 160,
    align: 'left',
    category: 'identity',
    isDefaultVisible: true,
  },
  {
    id: 'role',
    labelEn: 'Position / Role',
    labelKh: 'តួនាទី',
    defaultWidth: 120,
    minWidth: 85,
    maxWidth: 160,
    align: 'left',
    category: 'identity',
    isDefaultVisible: true,
  },
  {
    id: 'branch',
    labelEn: 'Branch',
    labelKh: 'សាខា',
    defaultWidth: 110,
    minWidth: 80,
    maxWidth: 150,
    align: 'left',
    category: 'identity',
    isDefaultVisible: true,
  },
  {
    id: 'daysPresent',
    labelEn: 'Present Days',
    labelKh: 'ថ្ងៃធ្វើការ',
    defaultWidth: 95,
    minWidth: 75,
    maxWidth: 130,
    align: 'center',
    category: 'time',
    isDefaultVisible: true,
  },
  {
    id: 'totalWorkHours',
    labelEn: 'Total Hours',
    labelKh: 'ម៉ោងសរុប',
    defaultWidth: 90,
    minWidth: 70,
    maxWidth: 120,
    align: 'center',
    category: 'time',
    isDefaultVisible: true,
  },
  {
    id: 'daysOnTime',
    labelEn: 'On-Time',
    labelKh: 'ទៀងម៉ោង',
    defaultWidth: 80,
    minWidth: 65,
    maxWidth: 110,
    align: 'center',
    category: 'status',
    isDefaultVisible: true,
  },
  {
    id: 'daysLate',
    labelEn: 'Late',
    labelKh: 'មកយឺត',
    defaultWidth: 75,
    minWidth: 60,
    maxWidth: 100,
    align: 'center',
    category: 'status',
    isDefaultVisible: true,
  },
  {
    id: 'totalOtHours',
    labelEn: 'OT Hours',
    labelKh: 'ម៉ោង OT',
    defaultWidth: 85,
    minWidth: 65,
    maxWidth: 110,
    align: 'center',
    category: 'time',
    isDefaultVisible: true,
  },
  {
    id: 'sundaysCount',
    labelEn: 'Sundays / Off',
    labelKh: 'ថ្ងៃសម្រាក',
    defaultWidth: 90,
    minWidth: 70,
    maxWidth: 120,
    align: 'center',
    category: 'status',
    isDefaultVisible: true,
  },
  {
    id: 'attendanceRate',
    labelEn: 'Attendance %',
    labelKh: 'អត្រាវត្តមាន',
    defaultWidth: 100,
    minWidth: 80,
    maxWidth: 130,
    align: 'center',
    category: 'status',
    isDefaultVisible: true,
  },
  {
    id: 'actions',
    labelEn: 'Action',
    labelKh: 'សកម្មភាព',
    defaultWidth: 90,
    minWidth: 75,
    maxWidth: 120,
    align: 'center',
    category: 'meta',
    isDefaultVisible: true,
  },
];

export const AVAILABLE_FONTS: { id: TableFontFamily; name: string; khName: string; familyCss: string; previewText: string }[] = [
  {
    id: 'Kantumruy Pro',
    name: 'Kantumruy Pro',
    khName: 'កន្ទុមរុយ ប្រូ (ស្តង់ដារទំនើប)',
    familyCss: "'Kantumruy Pro', 'Battambang', sans-serif",
    previewText: 'ម៉ោងការងារវត្តមានបុគ្គលិក Timesheet 2026',
  },
  {
    id: 'Battambang',
    name: 'Battambang',
    khName: 'បាត់ដំបង (ផ្លូវការរដ្ឋបាល)',
    familyCss: "'Battambang', sans-serif",
    previewText: 'របាយការណ៍វត្តមាន និងបញ្ជីបើកប្រាក់បៀវត្សរ៍',
  },
  {
    id: 'Siemreap',
    name: 'Siemreap',
    khName: 'សៀមរាប (បុរាណ ស្រឡះ)',
    familyCss: "'Siemreap', 'Kantumruy Pro', sans-serif",
    previewText: 'បញ្ជីវត្តមានប្រចាំខែ និងការចុះហត្ថលេខា',
  },
  {
    id: 'Moul',
    name: 'Moul',
    khName: 'មូល (ក្បាច់ចំណងជើងធំ)',
    familyCss: "'Moul', cursive",
    previewText: 'ព្រះរាជាណាចក្រកម្ពុជា រដ្ឋបាលបុគ្គលិក',
  },
  {
    id: 'Inter',
    name: 'Inter',
    khName: 'អុីនធឺ (Inter UI ស្អាតច្បាស់)',
    familyCss: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    previewText: 'Staff Attendance & Roster Tracking System',
  },
  {
    id: 'Roboto',
    name: 'Roboto',
    khName: 'រ៉ូបូតូ (Roboto Modern)',
    familyCss: "'Roboto', sans-serif",
    previewText: 'Digital Biometric Verification & Logs',
  },
  {
    id: 'Monospace',
    name: 'Monospace / Data',
    khName: 'ម៉ូណូស្ពេស (ទិន្នន័យលេខស្មើជួរ)',
    familyCss: "'JetBrains Mono', 'Courier New', Courier, monospace",
    previewText: '08:00 AM - 05:00 PM [VERIFIED GPS]',
  },
];

export function getDefaultTableSettings(columns: TableColumnDef[]): ReportTableSettings {
  const defaultWidths: Record<string, number> = {};
  const visibleCols: string[] = [];
  const colOrder: string[] = [];

  columns.forEach((col) => {
    defaultWidths[col.id] = col.defaultWidth;
    colOrder.push(col.id);
    if (col.isDefaultVisible) {
      visibleCols.push(col.id);
    }
  });

  return {
    visibleColumns: visibleCols,
    columnOrder: colOrder,
    columnWidths: defaultWidths,
    fontFamily: 'Kantumruy Pro',
    fontSizePx: 11,
    headerBold: true,
    density: 'standard',
    zebraStripes: true,
    borderStyle: 'subtle',
    headerTheme: 'slate-light',
    applyToPrint: true,
    applyToExport: true,
  };
}

export const PRESET_COLUMN_VIEWS: {
  id: string;
  nameEn: string;
  nameKh: string;
  descriptionEn: string;
  descriptionKh: string;
  icon: string;
  columns: string[];
}[] = [
  {
    id: 'all',
    nameEn: 'All Columns',
    nameKh: 'បង្ហាញជួរឈរទាំងអស់',
    descriptionEn: 'Show all available data columns',
    descriptionKh: 'បង្ហាញរាល់ព័ត៌មានលម្អិតទាំងអស់គ្មានចន្លោះ',
    icon: 'Maximize2',
    columns: ['no', 'date', 'dayOfWeek', 'name', 'employeeId', 'department', 'branch', 'timeIn', 'timeOut', 'duration', 'status', 'remark'],
  },
  {
    id: 'standard',
    nameEn: 'Standard Timesheet',
    nameKh: 'សន្លឹកម៉ោងស្តង់ដារ',
    descriptionEn: 'Balanced view with dates, employee, branch, hours & status',
    descriptionKh: 'ទិដ្ឋភាពសមរម្យ ងាយស្រួលមើល ពេញនិយមប្រើទូទៅ',
    icon: 'SlidersHorizontal',
    columns: ['no', 'date', 'dayOfWeek', 'name', 'department', 'branch', 'timeIn', 'timeOut', 'duration', 'status', 'remark'],
  },
  {
    id: 'time_only',
    nameEn: 'Time & Punches Only',
    nameKh: 'ផ្ដោតលើម៉ោងចូល-ចេញ',
    descriptionEn: 'Focused on clock-in, clock-out, and total work hours',
    descriptionKh: 'ពិនិត្យផ្ទាល់លើម៉ោងចូល ម៉ោងចេញ និងម៉ោងធ្វើការ',
    icon: 'Clock',
    columns: ['no', 'date', 'dayOfWeek', 'name', 'timeIn', 'timeOut', 'duration', 'status'],
  },
  {
    id: 'payroll',
    nameEn: 'Payroll & HR Audit',
    nameKh: 'គណនាប្រាក់ខែ & OT',
    descriptionEn: 'Focus on Staff ID, Name, Department, Work Hours & Verification',
    descriptionKh: 'ស័ក្តិសមសម្រាប់ផ្នែកគណនេយ្យផ្ទៀងផ្ទាត់បើកប្រាក់បៀវត្សរ៍',
    icon: 'FileSpreadsheet',
    columns: ['no', 'employeeId', 'name', 'department', 'branch', 'date', 'duration', 'status', 'remark'],
  },
  {
    id: 'minimal',
    nameEn: 'Minimal / Compact',
    nameKh: 'សង្ខេបបង្រួមបំផុត',
    descriptionEn: 'Only the bare essentials for small screens or quick glance',
    descriptionKh: 'បង្ហាញតែធាតុចាំបាច់បំផុតសម្រាប់ទូរស័ព្ទ ឬកញ្ចក់តូច',
    icon: 'Minimize2',
    columns: ['no', 'date', 'name', 'timeIn', 'timeOut', 'status'],
  },
];
