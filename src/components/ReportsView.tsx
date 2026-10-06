import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Building2, 
  ShieldCheck, 
  UserCheck,
  FileText,
  Check,
  X,
  HeartPulse,
  Clock3,
  TrendingUp,
  MessageSquare,
  Sparkles,
  Printer,
  ChevronRight,
  ChevronDown,
  Eye,
  SlidersHorizontal,
  FileDown,
  Layers,
  FolderArchive,
  Sun,
  Coffee,
  Warehouse,
  Flame,
  Users,
  User,
  MapPin,
  CheckCheck,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { AttendanceRecord, Branch, LeaveRequest, Language, Employee, CompanyBranding } from '../types';
import { INITIAL_LEAVE_REQUESTS } from '../data/initialData';
import { formatDistance, toKhmerNumeral } from '../utils/geoUtils';
import { 
  generateDailyTimesheetRows, 
  generateEmployeeMergedSummaries,
  exportTimesheetToCsv, 
  exportTimesheetToPdf, 
  exportTimesheetToXlsx,
  exportMergedSummaryToCsv,
  exportMergedSummaryToPdf,
  exportMergedSummaryToXlsx,
  exportRosterPrintSheetsToPdf,
  exportRosterToXlsx,
  exportRosterToCsv,
  renderSingleContainerToA4Pdf,
  TimesheetRow,
  EmployeeMergedSummary
} from '../utils/reportExportUtils';
import { getEmployeeDayOffName } from '../utils/dayOffUtils';
import { resolveAvatar, handleAvatarError } from '../utils/avatarUtils';
import { ReportTableCustomizerModal } from './ReportTableCustomizerModal';
import { ReportTableToolbar } from './ReportTableToolbar';
import { useTableColumnResize } from '../utils/useTableColumnResize';
import {
  ReportTableSettings,
  TableColumnDef,
  DAILY_TIMESHEET_COLUMNS,
  MERGED_SUMMARY_COLUMNS,
  AVAILABLE_FONTS,
  getDefaultTableSettings,
} from '../types/tableCustomization';

interface ReportsViewProps {
  attendanceRecords: AttendanceRecord[];
  branches: Branch[];
  employees?: Employee[];
  leaveRequests: LeaveRequest[];
  onUpdateLeaveStatus: (leaveId: string, status: 'approved' | 'rejected', adminComment?: string, approvedBy?: string) => void;
  lang: Language;
  branding?: CompanyBranding;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  attendanceRecords,
  branches,
  employees = [],
  leaveRequests,
  onUpdateLeaveStatus,
  lang,
  branding,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'timesheet' | 'live_punches' | 'leaves'>('timesheet');
  
  // Timesheet View Mode: 'merged' (Consolidated / Merged together by employee) vs 'daily' (Daily Chronological Roster)
  const [timesheetViewMode, setTimesheetViewMode] = useState<'merged' | 'daily'>('merged');

  // Branch Filter
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');

  // Employee Filter (Dropdown / Specific Employee)
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('all');
  
  // Local calendar date formatting helpers to avoid UTC timezone day shifts
  const formatLocalDate = (d: Date = new Date()): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Guarantees starting on the 1st of the month (e.g. 2026-09-01)
  const getFirstDayOfMonth = (d: Date = new Date()): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  };

  // Guarantees ending on the last day of the full month (30 or 31, and only 28/29 for February)
  const getLastDayOfMonth = (d: Date = new Date()): string => {
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-indexed: 0=Jan, 1=Feb, etc.
    const lastDay = new Date(year, month + 1, 0).getDate(); // 28/29 for Feb, 30 or 31 for others
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(lastDay).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  // Date Range Filtering (Default: Full month from 01 to 30/31, Feb 28/29)
  const todayStr = formatLocalDate(new Date());
  const firstDayOfMonth = getFirstDayOfMonth(new Date());
  const lastDayOfMonth = getLastDayOfMonth(new Date());

  const [startDate, setStartDate] = useState<string>(firstDayOfMonth);
  const [endDate, setEndDate] = useState<string>(lastDayOfMonth);
  const [selectedPreset, setSelectedPreset] = useState<string>('month');

  // Search & Status filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Dedicated Filter states for Leave, Sick & Overtime Approval Stream
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [leaveCategoryFilter, setLeaveCategoryFilter] = useState<string>('all');
  const [streamBranchFilter, setStreamBranchFilter] = useState<string>('all');
  const [streamStaffFilter, setStreamStaffFilter] = useState<string>('all');
  const [justActionedLeaveIds, setJustActionedLeaveIds] = useState<Set<string>>(new Set());

  // Interactive Filters inside the Timesheet & Roster Print Modal
  const [printBranchFilter, setPrintBranchFilter] = useState<string>('all');
  const [printStaffFilter, setPrintStaffFilter] = useState<string>('all');
  const [printDepartmentFilter, setPrintDepartmentFilter] = useState<string>('all');
  const [printMonthYearCustom, setPrintMonthYearCustom] = useState<string>('');

  // Expanded Employee Accordion IDs (for Merged View)
  const [expandedEmployeeIds, setExpandedEmployeeIds] = useState<Record<string, boolean>>({});

  // Comment Modal state for Leave Approvals
  const [actionLeave, setActionLeave] = useState<{ id: string; action: 'approved' | 'rejected'; name: string } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isExportingBatch, setIsExportingBatch] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printPreviewType, setPrintPreviewType] = useState<'detailed' | 'merged'>('detailed');

  // Table Customization State for Daily Matrix Table
  const [dailyTableSettings, setDailyTableSettings] = useState<ReportTableSettings>(() => {
    try {
      const saved = localStorage.getItem('attend_report_daily_table_customization');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return getDefaultTableSettings(DAILY_TIMESHEET_COLUMNS);
  });

  // Table Customization State for Merged / Consolidated Summary Table
  const [mergedTableSettings, setMergedTableSettings] = useState<ReportTableSettings>(() => {
    try {
      const saved = localStorage.getItem('attend_report_merged_table_customization');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return getDefaultTableSettings(MERGED_SUMMARY_COLUMNS);
  });

  // Merged Display Mode: 'cards' (Employee Accordion Cards) vs 'table' (Consolidated Summary Table)
  const [mergedDisplayMode, setMergedDisplayMode] = useState<'cards' | 'table'>('cards');

  // Customizer Modal State
  const [showCustomizerModal, setShowCustomizerModal] = useState(false);
  const [customizerTarget, setCustomizerTarget] = useState<'daily' | 'merged'>('daily');

  // Persist Daily Table Settings to localStorage
  const handleUpdateDailySettings = (newSettings: ReportTableSettings) => {
    setDailyTableSettings(newSettings);
    try {
      localStorage.setItem('attend_report_daily_table_customization', JSON.stringify(newSettings));
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetDailySettings = () => {
    const defaults = getDefaultTableSettings(DAILY_TIMESHEET_COLUMNS);
    setDailyTableSettings(defaults);
    try {
      localStorage.removeItem('attend_report_daily_table_customization');
    } catch (e) {
      console.error(e);
    }
  };

  // Persist Merged Table Settings to localStorage
  const handleUpdateMergedSettings = (newSettings: ReportTableSettings) => {
    setMergedTableSettings(newSettings);
    try {
      localStorage.setItem('attend_report_merged_table_customization', JSON.stringify(newSettings));
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetMergedSettings = () => {
    const defaults = getDefaultTableSettings(MERGED_SUMMARY_COLUMNS);
    setMergedTableSettings(defaults);
    try {
      localStorage.removeItem('attend_report_merged_table_customization');
    } catch (e) {
      console.error(e);
    }
  };

  // Draggable column resize for Daily table
  const handleDailyColumnWidthUpdate = (colId: string, width: number) => {
    handleUpdateDailySettings({
      ...dailyTableSettings,
      columnWidths: {
        ...dailyTableSettings.columnWidths,
        [colId]: width,
      },
    });
  };

  const dailyDefaultWidths = useMemo(() => {
    const map: Record<string, number> = {};
    DAILY_TIMESHEET_COLUMNS.forEach((c) => {
      map[c.id] = c.defaultWidth;
    });
    return map;
  }, []);

  const mergedDefaultWidths = useMemo(() => {
    const map: Record<string, number> = {};
    MERGED_SUMMARY_COLUMNS.forEach((c) => {
      map[c.id] = c.defaultWidth;
    });
    return map;
  }, []);

  const totalDailyTableWidth = useMemo(() => {
    return DAILY_TIMESHEET_COLUMNS
      .filter((col) => dailyTableSettings.visibleColumns.includes(col.id))
      .reduce((sum, col) => sum + (dailyTableSettings.columnWidths[col.id] || col.defaultWidth), 0);
  }, [dailyTableSettings.visibleColumns, dailyTableSettings.columnWidths]);

  const totalMergedTableWidth = useMemo(() => {
    return MERGED_SUMMARY_COLUMNS
      .filter((col) => mergedTableSettings.visibleColumns.includes(col.id))
      .reduce((sum, col) => sum + (mergedTableSettings.columnWidths[col.id] || col.defaultWidth), 0);
  }, [mergedTableSettings.visibleColumns, mergedTableSettings.columnWidths]);

  const { resizingColId: resizingDailyColId, onMouseDown: onDailyColumnResizeMouseDown } = useTableColumnResize({
    columnWidths: dailyTableSettings.columnWidths,
    defaultWidths: dailyDefaultWidths,
    onUpdateWidth: handleDailyColumnWidthUpdate,
    minWidth: 40,
  });

  // Draggable column resize for Merged Summary table
  const handleMergedColumnWidthUpdate = (colId: string, width: number) => {
    handleUpdateMergedSettings({
      ...mergedTableSettings,
      columnWidths: {
        ...mergedTableSettings.columnWidths,
        [colId]: width,
      },
    });
  };

  const { resizingColId: resizingMergedColId, onMouseDown: onMergedColumnResizeMouseDown } = useTableColumnResize({
    columnWidths: mergedTableSettings.columnWidths,
    defaultWidths: mergedDefaultWidths,
    onUpdateWidth: handleMergedColumnWidthUpdate,
    minWidth: 40,
  });

  // Unique Departments across employees
  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department && e.department.trim()) set.add(e.department.trim());
    });
    return Array.from(set).sort();
  }, [employees]);

  // Formatter for MM/YYYY (100% timezone shift immune via string parsing)
  const formatMonthYearHeader = (dateStr?: string) => {
    if (printMonthYearCustom && printMonthYearCustom.includes('-')) {
      const parts = printMonthYearCustom.split('-');
      if (parts.length >= 2) return `${parts[1]}/${parts[0]}`;
    }
    const target = dateStr || startDate;
    if (target && target.includes('-')) {
      const parts = target.split('-');
      if (parts.length >= 2) return `${parts[1]}/${parts[0]}`;
    }
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${mm}/${now.getFullYear()}`;
  };

  const formatMonthYearKhHeader = (dateStr?: string) => {
    if (printMonthYearCustom && printMonthYearCustom.includes('-')) {
      const parts = printMonthYearCustom.split('-');
      if (parts.length >= 2) return `${toKhmerNumeral(parts[1])}/${toKhmerNumeral(parts[0])}`;
    }
    const target = dateStr || startDate;
    if (target && target.includes('-')) {
      const parts = target.split('-');
      if (parts.length >= 2) return `${toKhmerNumeral(parts[1])}/${toKhmerNumeral(parts[0])}`;
    }
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${toKhmerNumeral(mm)}/${toKhmerNumeral(now.getFullYear())}`;
  };

  // Available employees for currently selected branch
  const branchEmployees = useMemo(() => {
    if (selectedBranchFilter === 'all') return employees;
    return employees.filter((e) => e.branchId === selectedBranchFilter);
  }, [employees, selectedBranchFilter]);

  // When branch filter changes, check if selected employee is still valid
  const handleBranchChange = (branchId: string) => {
    setSelectedBranchFilter(branchId);
    if (branchId !== 'all') {
      const existsInBranch = employees.some((e) => e.branchId === branchId && (e.id === selectedEmployeeFilter || e.code === selectedEmployeeFilter));
      if (!existsInBranch) {
        setSelectedEmployeeFilter('all');
      }
    }
  };

  // Selected Font Objects
  const selectedDailyFont = useMemo(() => {
    return AVAILABLE_FONTS.find((f) => f.id === dailyTableSettings.fontFamily) || AVAILABLE_FONTS[0];
  }, [dailyTableSettings.fontFamily]);

  const selectedMergedFont = useMemo(() => {
    return AVAILABLE_FONTS.find((f) => f.id === mergedTableSettings.fontFamily) || AVAILABLE_FONTS[0];
  }, [mergedTableSettings.fontFamily]);

  // Daily Table Styling Classes
  const dailyDensityClass = useMemo(() => {
    if (dailyTableSettings.density === 'compact') return 'py-1 px-2';
    if (dailyTableSettings.density === 'spacious') return 'py-3.5 px-4';
    return 'py-2 px-2.5';
  }, [dailyTableSettings.density]);

  const dailyBorderClass = useMemo(() => {
    if (dailyTableSettings.borderStyle === 'grid') return 'border-r border-b border-slate-200 last:border-r-0';
    if (dailyTableSettings.borderStyle === 'subtle') return 'border-b border-slate-100';
    return 'border-b border-transparent';
  }, [dailyTableSettings.borderStyle]);

  const dailyHeaderThemeClass = useMemo(() => {
    if (dailyTableSettings.headerTheme === 'slate-dark') return 'bg-slate-800 text-white border-b border-slate-900';
    if (dailyTableSettings.headerTheme === 'indigo') return 'bg-indigo-700 text-white border-b border-indigo-800';
    if (dailyTableSettings.headerTheme === 'clean-white') return 'bg-white text-slate-900 border-b-2 border-slate-200';
    return 'bg-slate-100/90 text-slate-700 border-b border-slate-200';
  }, [dailyTableSettings.headerTheme]);

  // Merged Table Styling Classes
  const mergedDensityClass = useMemo(() => {
    if (mergedTableSettings.density === 'compact') return 'py-1 px-2';
    if (mergedTableSettings.density === 'spacious') return 'py-3.5 px-4';
    return 'py-2 px-2.5';
  }, [mergedTableSettings.density]);

  const mergedBorderClass = useMemo(() => {
    if (mergedTableSettings.borderStyle === 'grid') return 'border-r border-b border-slate-200 last:border-r-0';
    if (mergedTableSettings.borderStyle === 'subtle') return 'border-b border-slate-100';
    return 'border-b border-transparent';
  }, [mergedTableSettings.borderStyle]);

  const mergedHeaderThemeClass = useMemo(() => {
    if (mergedTableSettings.headerTheme === 'slate-dark') return 'bg-slate-800 text-white border-b border-slate-900';
    if (mergedTableSettings.headerTheme === 'indigo') return 'bg-indigo-700 text-white border-b border-indigo-800';
    if (mergedTableSettings.headerTheme === 'clean-white') return 'bg-white text-slate-900 border-b-2 border-slate-200';
    return 'bg-slate-100/90 text-slate-700 border-b border-slate-200';
  }, [mergedTableSettings.headerTheme]);

  // Daily Cell Content Renderer
  const renderDailyCellContent = (row: TimesheetRow, colId: string) => {
    const isSun = row.isSunday;
    const isDayOff = row.isDayOff;
    const isLeave = row.isLeave;

    switch (colId) {
      case 'no':
        return (
          <span className={`font-bold ${isSun ? 'text-rose-700' : isDayOff ? 'text-amber-700' : isLeave ? 'text-purple-700' : 'text-slate-400'}`}>
            {row.no}
          </span>
        );
      case 'date':
        return (
          <span className={`font-bold whitespace-nowrap ${isSun ? 'text-rose-900' : isDayOff ? 'text-amber-950' : isLeave ? 'text-purple-950' : 'text-slate-800'}`}>
            {row.date}
          </span>
        );
      case 'dayOfWeek':
        return (
          <span className={`font-medium uppercase whitespace-nowrap ${isSun ? 'text-rose-700 font-bold' : isDayOff ? 'text-amber-800' : isLeave ? 'text-purple-800' : 'text-slate-600'}`}>
            {row.dayOfWeek.split(' ')[0]}
          </span>
        );
      case 'name':
        return (
          <div className="min-w-0 overflow-hidden leading-snug">
            <div className={`font-bold truncate ${isSun ? 'text-rose-800' : isDayOff ? 'text-amber-900' : isLeave ? 'text-purple-900' : 'text-slate-800'}`}>
              {lang === 'km' ? row.nameKh : row.nameEn}
            </div>
            <div className="text-[0.8em] text-slate-500 truncate mt-0.5">
              {row.role}
            </div>
          </div>
        );
      case 'employeeId':
        return (
          <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 whitespace-nowrap">
            {row.enrollId}
          </span>
        );
      case 'department':
        return (
          <span className={`truncate block ${isSun ? 'text-rose-600' : isDayOff ? 'text-amber-800' : isLeave ? 'text-purple-800' : 'text-slate-700'}`}>
            {row.department || '---'}
          </span>
        );
      case 'branch':
        return (
          <span className={`truncate block ${isSun ? 'text-rose-700' : isDayOff ? 'text-amber-800' : isLeave ? 'text-purple-800' : 'text-slate-600'}`}>
            {row.branchNameEn}
          </span>
        );
      case 'timeIn':
        if (isSun || isDayOff || isLeave) return <span className="text-slate-400">--:--</span>;
        return (
          <span className={`font-bold whitespace-nowrap ${row.timeIn !== '--:--' ? 'text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200' : 'text-slate-400'}`}>
            {row.timeIn}
          </span>
        );
      case 'timeOut':
        if (isSun || isDayOff || isLeave) return <span className="text-slate-400">--:--</span>;
        return (
          <span className={`font-bold whitespace-nowrap ${row.timeOut !== '--:--' ? 'text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200' : 'text-slate-400'}`}>
            {row.timeOut}
          </span>
        );
      case 'duration':
        if (isSun || isDayOff || isLeave) return <span className="text-slate-400 whitespace-nowrap">0.0h</span>;
        return <span className="font-bold text-slate-700 whitespace-nowrap">{row.durationHours}</span>;
      case 'status':
        if (isSun) {
          return (
            <span className="inline-block px-2 py-0.5 rounded-full text-[0.8em] font-black bg-rose-200/80 text-rose-800 border border-rose-300 whitespace-nowrap">
              SUNDAY REST
            </span>
          );
        }
        if (isDayOff) {
          return (
            <span className="inline-block px-2 py-0.5 rounded-full text-[0.8em] font-black bg-amber-200 text-amber-900 border border-amber-300 whitespace-nowrap">
              DAY OFF (សម្រាក)
            </span>
          );
        }
        if (isLeave) {
          return (
            <span className="inline-block px-2 py-0.5 rounded-full text-[0.8em] font-black bg-purple-200 text-purple-900 border border-purple-300 whitespace-nowrap">
              ON LEAVE (ច្បាប់)
            </span>
          );
        }
        return (
          <span className={`inline-block px-2 py-0.5 rounded-full text-[0.82em] font-bold whitespace-nowrap ${
            row.status.toLowerCase().includes('on-time')
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : row.status.toLowerCase().includes('late')
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : row.status.toLowerCase().includes('overtime')
              ? 'bg-purple-50 text-purple-700 border border-purple-200'
              : row.status.toLowerCase().includes('absent')
              ? 'bg-rose-100 text-rose-800 border border-rose-200'
              : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}>
            {row.status}
          </span>
        );
      case 'remark':
        return (
          <span className={`truncate block ${isSun ? 'text-rose-700 font-semibold italic' : isDayOff ? 'text-amber-800 font-semibold' : isLeave ? 'text-purple-800 font-semibold' : 'text-slate-600'}`}>
            {row.remark}
          </span>
        );
      default:
        return null;
    }
  };

  // Merged Cell Content Renderer
  const renderMergedCellContent = (summary: EmployeeMergedSummary, idx: number, colId: string) => {
    switch (colId) {
      case 'no':
        return <span className="text-slate-400 font-bold">{idx + 1}</span>;
      case 'enrollId':
        return (
          <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 whitespace-nowrap">
            {summary.enrollId}
          </span>
        );
      case 'name':
        return (
          <div className="min-w-0 overflow-hidden leading-snug">
            <div className="font-bold text-slate-900 truncate">
              {lang === 'km' ? summary.nameKh : summary.nameEn}
            </div>
            <div className="text-[0.8em] text-slate-400 truncate mt-0.5">({summary.nameEn})</div>
          </div>
        );
      case 'department':
        return <span className="font-semibold text-slate-700 truncate block">{summary.department}</span>;
      case 'role':
        return <span className="text-slate-600 truncate block">{summary.role}</span>;
      case 'branch':
        return (
          <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 truncate block">
            {summary.branchNameEn}
          </span>
        );
      case 'daysPresent':
        return <span className="font-bold text-emerald-700 whitespace-nowrap">{summary.daysPresent}</span>;
      case 'totalWorkHours':
        return <span className="font-black text-indigo-700 whitespace-nowrap">{summary.totalWorkHours}h</span>;
      case 'daysOnTime':
        return <span className="font-bold text-emerald-600 whitespace-nowrap">{summary.daysOnTime}</span>;
      case 'daysLate':
        return <span className={`font-bold whitespace-nowrap ${summary.daysLate > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{summary.daysLate}</span>;
      case 'totalOtHours':
        return <span className="font-bold text-purple-700 whitespace-nowrap">{summary.totalOtHours}h</span>;
      case 'sundaysCount':
        return <span className="font-bold text-rose-700 whitespace-nowrap">{summary.sundaysCount}</span>;
      case 'attendanceRate':
        return (
          <div className="flex items-center gap-1.5 justify-center">
            <div className="w-10 bg-slate-100 rounded-full h-1.5 overflow-hidden shrink-0">
              <div
                className={`h-full rounded-full ${
                  summary.attendanceRate >= 90 ? 'bg-emerald-500' : summary.attendanceRate >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${summary.attendanceRate}%` }}
              />
            </div>
            <span className="font-bold text-[0.85em] text-slate-800 whitespace-nowrap">{summary.attendanceRate}%</span>
          </div>
        );
      case 'actions':
        return (
          <div className="flex items-center justify-center space-x-1">
            <button
              type="button"
              onClick={() => {
                setPrintStaffFilter(summary.employeeId);
                setPrintBranchFilter('all');
                setPrintDepartmentFilter('all');
                setPrintPreviewType('detailed');
                setShowPrintModal(true);
              }}
              className="p-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition cursor-pointer"
              title="Print Roster"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => toggleEmployeeExpand(summary.employeeId)}
              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              title="View Daily Attendance"
            >
              {expandedEmployeeIds[summary.employeeId] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  // Quick Date Preset Handler
  const handleApplyPreset = (preset: 'today' | 'yesterday' | 'this_week' | 'month' | 'prev_month' | 'last_30') => {
    setSelectedPreset(preset);
    const now = new Date();
    if (preset === 'today') {
      const d = formatLocalDate(now);
      setStartDate(d);
      setEndDate(d);
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const d = formatLocalDate(y);
      setStartDate(d);
      setEndDate(d);
    } else if (preset === 'this_week') {
      const curr = new Date();
      const first = curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1); // Monday
      const monday = new Date(curr.setDate(first));
      setStartDate(formatLocalDate(monday));
      setEndDate(todayStr);
    } else if (preset === 'month') {
      setStartDate(getFirstDayOfMonth(now));
      setEndDate(getLastDayOfMonth(now));
    } else if (preset === 'prev_month') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      setStartDate(getFirstDayOfMonth(prev));
      setEndDate(getLastDayOfMonth(prev));
    } else if (preset === 'last_30') {
      const past30 = new Date();
      past30.setDate(past30.getDate() - 30);
      setStartDate(formatLocalDate(past30));
      setEndDate(todayStr);
    }
  };

  // Generate Daily Timesheet Rows (Includes Sunday Rows, Day Off, and Leaves)
  const timesheetRows = useMemo(() => {
    return generateDailyTimesheetRows(
      attendanceRecords,
      employees,
      branches,
      startDate,
      endDate,
      selectedBranchFilter,
      selectedEmployeeFilter,
      leaveRequests
    );
  }, [attendanceRecords, employees, branches, startDate, endDate, selectedBranchFilter, selectedEmployeeFilter, leaveRequests]);

  // Generate Merged Employee Summaries (Grouped by Employee)
  const mergedEmployeeSummaries = useMemo(() => {
    return generateEmployeeMergedSummaries(
      attendanceRecords,
      employees,
      branches,
      startDate,
      endDate,
      selectedBranchFilter,
      selectedEmployeeFilter,
      leaveRequests
    );
  }, [attendanceRecords, employees, branches, startDate, endDate, selectedBranchFilter, selectedEmployeeFilter, leaveRequests]);

  // Filtered Timesheet Rows (via search query)
  const filteredTimesheetRows = useMemo(() => {
    if (!searchQuery.trim()) return timesheetRows;
    const q = searchQuery.toLowerCase();
    return timesheetRows.filter(
      (r) =>
        r.isSunday ||
        r.nameEn.toLowerCase().includes(q) ||
        r.nameKh.toLowerCase().includes(q) ||
        r.enrollId.toLowerCase().includes(q) ||
        r.branchNameEn.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.remark.toLowerCase().includes(q)
    );
  }, [timesheetRows, searchQuery]);

  // Filtered Merged Summaries (via search query)
  const filteredMergedSummaries = useMemo(() => {
    if (!searchQuery.trim()) return mergedEmployeeSummaries;
    const q = searchQuery.toLowerCase();
    return mergedEmployeeSummaries.filter(
      (s) =>
        s.nameEn.toLowerCase().includes(q) ||
        s.nameKh.toLowerCase().includes(q) ||
        s.enrollId.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        s.branchNameEn.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q)
    );
  }, [mergedEmployeeSummaries, searchQuery]);

  // Toggle Accordion for single employee
  const toggleEmployeeExpand = (empId: string) => {
    setExpandedEmployeeIds((prev) => ({
      ...prev,
      [empId]: !prev[empId],
    }));
  };

  // Expand All / Collapse All
  const handleToggleExpandAll = () => {
    const allExpanded = filteredMergedSummaries.every((s) => expandedEmployeeIds[s.employeeId]);
    if (allExpanded) {
      setExpandedEmployeeIds({});
    } else {
      const next: Record<string, boolean> = {};
      filteredMergedSummaries.forEach((s) => {
        next[s.employeeId] = true;
      });
      setExpandedEmployeeIds(next);
    }
  };

  // Live Punches Raw Log Filter
  const filteredRawRecords = useMemo(() => {
    return attendanceRecords.filter((rec) => {
      const dateOnly = rec.timestamp.split('T')[0];
      const matchesDate = dateOnly >= startDate && dateOnly <= endDate;
      const matchesBranch = selectedBranchFilter === 'all' || rec.branchId === selectedBranchFilter;
      const matchesEmployee = selectedEmployeeFilter === 'all' || rec.employeeId === selectedEmployeeFilter || rec.employeeCode === selectedEmployeeFilter;
      const matchesStatus =
        selectedStatusFilter === 'all' ||
        (selectedStatusFilter === 'valid' && rec.isWithinGeofence) ||
        (selectedStatusFilter === 'violation' && !rec.isWithinGeofence) ||
        rec.status === selectedStatusFilter;
      const matchesSearch =
        rec.employeeNameKh.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.employeeNameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.branchNameEn.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesDate && matchesBranch && matchesEmployee && matchesStatus && matchesSearch;
    });
  }, [attendanceRecords, startDate, endDate, selectedBranchFilter, selectedEmployeeFilter, selectedStatusFilter, searchQuery]);

  // Dedicated Leave, Sick & OT Requests Approval Stream Filter
  const filteredRequests = useMemo(() => {
    // If leaveRequests array is empty, fallback to initial mock data so stream table is never blank
    const sourceLeaves = leaveRequests && leaveRequests.length > 0 ? leaveRequests : INITIAL_LEAVE_REQUESTS;

    const baseList = sourceLeaves.filter((req) => {
      const matchesBranch = streamBranchFilter === 'all' || !req.branchId || req.branchId === streamBranchFilter;
      const matchesStaff = streamStaffFilter === 'all' || req.employeeId === streamStaffFilter || (req.employeeCode && req.employeeCode === streamStaffFilter);
      const matchesCategory = leaveCategoryFilter === 'all' || req.category === leaveCategoryFilter || req.type === leaveCategoryFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        ((req.employeeNameKh || '').toLowerCase().includes(q)) ||
        ((req.employeeNameEn || '').toLowerCase().includes(q)) ||
        ((req.employeeCode || '').toLowerCase().includes(q)) ||
        ((req.reason || '').toLowerCase().includes(q));

      return matchesBranch && matchesStaff && matchesCategory && matchesSearch;
    });

    if (leaveStatusFilter === 'all') {
      return baseList;
    }

    const statusMatches = baseList.filter(
      (req) => req.status === leaveStatusFilter || justActionedLeaveIds.has(req.id)
    );

    // CRITICAL: If all pending are approved (or filter returns 0), fallback to baseList so table is NEVER empty!
    if (statusMatches.length === 0 && baseList.length > 0) {
      return baseList;
    }

    return statusMatches;
  }, [leaveRequests, streamBranchFilter, streamStaffFilter, leaveCategoryFilter, leaveStatusFilter, justActionedLeaveIds, searchQuery]);

  // Employees matching print modal filters (Branch & Department)
  const availablePrintEmployees = useMemo(() => {
    let list = employees;
    if (printBranchFilter !== 'all') {
      list = list.filter((e) => e.branchId === printBranchFilter);
    }
    if (printDepartmentFilter !== 'all') {
      list = list.filter((e) => e.department && e.department.toLowerCase() === printDepartmentFilter.toLowerCase());
    }
    return list;
  }, [employees, printBranchFilter, printDepartmentFilter]);

  // Group daily timesheet rows by employee for individual roster printing
  const printableStaffGroups = useMemo(() => {
    let targetEmps = employees;
    // Uses printBranchFilter so print preview allows viewing all branches or selected branch
    if (printBranchFilter !== 'all') {
      targetEmps = targetEmps.filter((e) => e.branchId === printBranchFilter);
    }
    if (printStaffFilter !== 'all') {
      targetEmps = targetEmps.filter((e) => e.id === printStaffFilter || e.code === printStaffFilter);
    }
    if (printDepartmentFilter !== 'all') {
      targetEmps = targetEmps.filter((e) => e.department && e.department.toLowerCase() === printDepartmentFilter.toLowerCase());
    }

    return targetEmps.map((emp) => {
      const empRows = generateDailyTimesheetRows(
        attendanceRecords,
        [emp],
        branches,
        startDate,
        endDate,
        'all',
        emp.id,
        leaveRequests
      ).filter((r) => r.employeeId === emp.id);

      const totalWork = empRows.reduce((acc, r) => acc + (parseFloat(r.durationHours) || 0), 0).toFixed(1);
      const daysWorked = empRows.filter((r) => !r.isSunday && !r.isDayOff && !r.isLeave && r.timeIn !== '--:--').length;
      const daysOff = empRows.filter((r) => r.isDayOff || r.isSunday).length;
      const daysLeave = empRows.filter((r) => r.isLeave).length;
      const lateDays = empRows.filter((r) => r.status.toLowerCase().includes('late')).length;
      const otDays = empRows.filter((r) => r.status.toLowerCase().includes('overtime')).length;

      return {
        employee: emp,
        rows: empRows,
        summary: {
          totalWorkHours: totalWork,
          daysWorked,
          daysOff,
          daysLeave,
          lateDays,
          otDays,
        },
      };
    });
  }, [attendanceRecords, employees, branches, startDate, endDate, printBranchFilter, printStaffFilter, printDepartmentFilter, leaveRequests]);

  // Group printable staff by department helper function for any given filters
  const getDepartmentStaffGroups = (
    branchFilter: string = printBranchFilter,
    staffFilter: string = printStaffFilter,
    deptFilter: string = printDepartmentFilter
  ) => {
    let targetEmps = employees;
    if (branchFilter !== 'all') {
      targetEmps = targetEmps.filter((e) => e.branchId === branchFilter);
    }
    if (staffFilter !== 'all') {
      targetEmps = targetEmps.filter((e) => e.id === staffFilter || e.code === staffFilter);
    }
    if (deptFilter !== 'all') {
      targetEmps = targetEmps.filter((e) => e.department && e.department.toLowerCase() === deptFilter.toLowerCase());
    }

    const groups = targetEmps.map((emp) => {
      const empRows = generateDailyTimesheetRows(
        attendanceRecords,
        [emp],
        branches,
        startDate,
        endDate,
        'all',
        emp.id,
        leaveRequests
      ).filter((r) => r.employeeId === emp.id);

      const totalWork = empRows.reduce((acc, r) => acc + (parseFloat(r.durationHours) || 0), 0).toFixed(1);
      const daysWorked = empRows.filter((r) => !r.isSunday && !r.isDayOff && !r.isLeave && r.timeIn !== '--:--').length;
      const daysOff = empRows.filter((r) => r.isDayOff || r.isSunday).length;
      const daysLeave = empRows.filter((r) => r.isLeave).length;
      const lateDays = empRows.filter((r) => r.status.toLowerCase().includes('late')).length;
      const otDays = empRows.filter((r) => r.status.toLowerCase().includes('overtime')).length;

      return {
        employee: emp,
        rows: empRows,
        summary: {
          totalWorkHours: totalWork,
          daysWorked,
          daysOff,
          daysLeave,
          lateDays,
          otDays,
        },
      };
    });

    const map = new Map<string, typeof groups>();
    groups.forEach((group) => {
      const dept = group.employee.department || (deptFilter !== 'all' ? deptFilter : 'Operations');
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept)!.push(group);
    });

    return Array.from(map.entries()).map(([department, staffList]) => ({
      department,
      staffList,
    }));
  };

  // Group printable staff by department so timesheets can be organized systematically
  const departmentStaffGroups = useMemo(() => {
    return getDepartmentStaffGroups(printBranchFilter, printStaffFilter, printDepartmentFilter);
  }, [printableStaffGroups, printDepartmentFilter]);

  // Merged summaries specifically for the Print Modal (honors printBranchFilter, printStaffFilter, printDepartmentFilter)
  const printMergedSummaries = useMemo(() => {
    let list = generateEmployeeMergedSummaries(
      attendanceRecords,
      employees,
      branches,
      startDate,
      endDate,
      printBranchFilter,
      printStaffFilter,
      leaveRequests
    );
    if (printDepartmentFilter !== 'all') {
      list = list.filter((s) => s.department && s.department.toLowerCase() === printDepartmentFilter.toLowerCase());
    }
    return list;
  }, [attendanceRecords, employees, branches, startDate, endDate, printBranchFilter, printStaffFilter, printDepartmentFilter, leaveRequests]);

  // Selected Branch Name
  const currentBranchObj = branches.find((b) => b.id === selectedBranchFilter);
  const currentBranchTitle = selectedBranchFilter === 'all'
    ? 'All 7 Branches Combined'
    : (currentBranchObj ? (lang === 'km' ? currentBranchObj.nameKh : currentBranchObj.nameEn) : selectedBranchFilter);

  const selectedEmployeeObj = employees.find((e) => e.id === selectedEmployeeFilter || e.code === selectedEmployeeFilter);
  const employeeFilterLabel = selectedEmployeeObj ? ` • Staff: ${selectedEmployeeObj.nameEn} (${selectedEmployeeObj.code})` : '';

  const dateRangeLabel = `${startDate} to ${endDate}${employeeFilterLabel}`;

  // Export CSV Handler (Formatted with Audit & KPI Summaries)
  const handleDownloadCsv = () => {
    const compName = branding ? (lang === 'km' ? branding.companyNameKh : branding.companyNameEn) : 'Enterprise Multi-Branch HR Suite';
    if (timesheetViewMode === 'merged') {
      exportMergedSummaryToCsv(filteredMergedSummaries, currentBranchTitle, dateRangeLabel, compName);
    } else {
      exportTimesheetToCsv(filteredTimesheetRows, currentBranchTitle, dateRangeLabel, compName);
    }
  };

  // Export Styled Excel (XLSX) Handler with exact format and styling as PDF
  const [isExportingXlsx, setIsExportingXlsx] = useState(false);
  const handleDownloadXlsx = async () => {
    if (isExportingXlsx) return;
    setIsExportingXlsx(true);
    const compName = branding ? (lang === 'km' ? branding.companyNameKh : branding.companyNameEn) : 'Enterprise Multi-Branch HR Suite';
    try {
      if (timesheetViewMode === 'merged') {
        await exportMergedSummaryToXlsx(filteredMergedSummaries, currentBranchTitle, dateRangeLabel, compName, mergedTableSettings);
      } else {
        await exportTimesheetToXlsx(filteredTimesheetRows, currentBranchTitle, dateRangeLabel, compName, dailyTableSettings);
      }
    } catch (err) {
      console.error('Failed to export XLSX:', err);
    } finally {
      setIsExportingXlsx(false);
    }
  };

  // Export PDF Handler with 100% Khmer font support
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const handleDownloadPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    const compName = branding ? (lang === 'km' ? branding.companyNameKh : branding.companyNameEn) : 'Enterprise Multi-Branch HR Suite';
    try {
      if (timesheetViewMode === 'merged') {
        await exportMergedSummaryToPdf(filteredMergedSummaries, currentBranchTitle, dateRangeLabel, compName);
      } else {
        await exportTimesheetToPdf(filteredTimesheetRows, currentBranchTitle, dateRangeLabel, compName);
      }
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Batch Export: Separate XLSX, CSV & PDF for EACH individual branch
  const handleBatchExportAllBranches = (format: 'xlsx' | 'csv' | 'pdf', mode: 'merged' | 'detailed' = timesheetViewMode === 'merged' ? 'merged' : 'detailed') => {
    setIsExportingBatch(true);
    const compName = branding ? (lang === 'km' ? branding.companyNameKh : branding.companyNameEn) : 'Enterprise Multi-Branch HR Suite';

    setTimeout(() => {
      branches.forEach((b, index) => {
        setTimeout(async () => {
          if (mode === 'merged') {
            const branchSummaries = generateEmployeeMergedSummaries(
              attendanceRecords,
              employees,
              branches,
              startDate,
              endDate,
              b.id,
              selectedEmployeeFilter,
              leaveRequests
            );
            if (format === 'xlsx') {
              await exportMergedSummaryToXlsx(branchSummaries, b.nameKh || b.nameEn, dateRangeLabel, compName, mergedTableSettings);
            } else if (format === 'csv') {
              exportMergedSummaryToCsv(branchSummaries, b.nameEn, dateRangeLabel, compName);
            } else {
              await exportMergedSummaryToPdf(branchSummaries, b.nameKh || b.nameEn, dateRangeLabel, compName);
            }
          } else {
            const branchRows = generateDailyTimesheetRows(
              attendanceRecords,
              employees,
              branches,
              startDate,
              endDate,
              b.id,
              selectedEmployeeFilter,
              leaveRequests
            );
            if (format === 'xlsx') {
              await exportTimesheetToXlsx(branchRows, b.nameKh || b.nameEn, dateRangeLabel, compName, dailyTableSettings);
            } else if (format === 'csv') {
              exportTimesheetToCsv(branchRows, b.nameEn, dateRangeLabel, compName);
            } else {
              await exportTimesheetToPdf(branchRows, b.nameKh || b.nameEn, dateRangeLabel, compName);
            }
          }
        }, index * 800);
      });
      setTimeout(() => {
        setIsExportingBatch(false);
      }, branches.length * 800 + 800);
    }, 200);
  };

  // Dedicated Print Modal Handlers: Supports system print, direct PDF, Excel (.xlsx), and CSV exports
  const [isExportingModalPdf, setIsExportingModalPdf] = useState(false);
  const [isExportingRosterXlsx, setIsExportingRosterXlsx] = useState(false);
  const [isExportingRosterCsv, setIsExportingRosterCsv] = useState(false);
  const [printFeedback, setPrintFeedback] = useState<string | null>(null);

  const handleDownloadRosterXlsx = async (targetBranch?: string, targetStaff?: string, targetDept?: string) => {
    if (isExportingRosterXlsx) return;
    setIsExportingRosterXlsx(true);
    const activeBranchFilter = targetBranch !== undefined ? targetBranch : printBranchFilter;
    const activeStaffFilter = targetStaff !== undefined ? targetStaff : printStaffFilter;
    const activeDeptFilter = targetDept !== undefined ? targetDept : printDepartmentFilter;

    const compName = branding ? (lang === 'km' ? branding.companyNameKh : branding.companyNameEn) : 'Enterprise Multi-Branch HR Suite';
    const monthYearLabel = formatMonthYearHeader(startDate);
    const branchObj = branches.find((b) => b.id === activeBranchFilter);
    const branchLabel = activeBranchFilter === 'all' 
      ? (branches.length > 0 ? (lang === 'km' ? 'គ្រប់សាខាទាំងអស់' : 'All Branches') : 'Main Branch')
      : (branchObj ? (lang === 'km' ? `${branchObj.nameEn} (${branchObj.nameKh})` : branchObj.nameEn) : activeBranchFilter);

    const activeGroups = getDepartmentStaffGroups(activeBranchFilter, activeStaffFilter, activeDeptFilter);

    try {
      await exportRosterToXlsx(
        activeGroups,
        branchLabel,
        monthYearLabel,
        `${startDate} ~ ${endDate}`,
        compName
      );
      setPrintFeedback(
        lang === 'km'
          ? 'បានបង្កើត និងទាញយកឯកសារ Roster Excel (.xlsx) ជោគជ័យ!'
          : 'Official Roster Excel (.xlsx) generated & downloaded successfully!'
      );
    } catch (err) {
      console.error('Failed to export Roster Excel:', err);
      setPrintFeedback(
        lang === 'km'
          ? 'មានបញ្ហាក្នុងការបង្កើត Excel។ សូមព្យាយាមម្តងទៀត។'
          : 'Failed to generate Roster Excel. Please try again.'
      );
    } finally {
      setIsExportingRosterXlsx(false);
    }
  };

  const handleDownloadRosterCsv = (targetBranch?: string, targetStaff?: string, targetDept?: string) => {
    if (isExportingRosterCsv) return;
    setIsExportingRosterCsv(true);
    const activeBranchFilter = targetBranch !== undefined ? targetBranch : printBranchFilter;
    const activeStaffFilter = targetStaff !== undefined ? targetStaff : printStaffFilter;
    const activeDeptFilter = targetDept !== undefined ? targetDept : printDepartmentFilter;

    const compName = branding ? (lang === 'km' ? branding.companyNameKh : branding.companyNameEn) : 'Enterprise Multi-Branch HR Suite';
    const monthYearLabel = formatMonthYearHeader(startDate);
    const branchObj = branches.find((b) => b.id === activeBranchFilter);
    const branchLabel = activeBranchFilter === 'all' 
      ? (branches.length > 0 ? (lang === 'km' ? 'គ្រប់សាខាទាំងអស់' : 'All Branches') : 'Main Branch')
      : (branchObj ? (lang === 'km' ? `${branchObj.nameEn} (${branchObj.nameKh})` : branchObj.nameEn) : activeBranchFilter);

    const activeGroups = getDepartmentStaffGroups(activeBranchFilter, activeStaffFilter, activeDeptFilter);

    try {
      exportRosterToCsv(
        activeGroups,
        branchLabel,
        monthYearLabel,
        `${startDate} ~ ${endDate}`,
        compName
      );
      setPrintFeedback(
        lang === 'km'
          ? 'បានបង្កើត និងទាញយកឯកសារ Roster CSV ជោគជ័យ!'
          : 'Official Roster CSV generated & downloaded successfully!'
      );
    } catch (err) {
      console.error('Failed to export Roster CSV:', err);
      setPrintFeedback(
        lang === 'km'
          ? 'មានបញ្ហាក្នុងការបង្កើត CSV។ សូមព្យាយាមម្តងទៀត។'
          : 'Failed to generate Roster CSV. Please try again.'
      );
    } finally {
      setIsExportingRosterCsv(false);
    }
  };

  const handleDownloadPdfFromModal = async () => {
    if (isExportingModalPdf) return;
    setIsExportingModalPdf(true);
    const compName = branding ? (lang === 'km' ? branding.companyNameKh : branding.companyNameEn) : 'Enterprise Multi-Branch HR Suite';
    const monthYearLabel = formatMonthYearHeader(startDate);
    const branchObj = branches.find((b) => b.id === printBranchFilter);
    const branchLabel = printBranchFilter === 'all' 
      ? (branches.length > 0 ? (lang === 'km' ? 'គ្រប់សាខាទាំងអស់' : 'All Branches') : 'Main Branch')
      : (branchObj ? (lang === 'km' ? `${branchObj.nameEn} (${branchObj.nameKh})` : branchObj.nameEn) : printBranchFilter);

    try {
      if (printPreviewType === 'detailed') {
        await exportRosterPrintSheetsToPdf(
          departmentStaffGroups,
          branchLabel,
          monthYearLabel,
          `${startDate} ~ ${endDate}`,
          compName
        );
      } else {
        const container = document.getElementById('printable-timesheet-area');
        if (container) {
          await renderSingleContainerToA4Pdf(
            container,
            `Merged_Employee_Summary_${branchLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
          );
        } else {
          await exportMergedSummaryToPdf(
            printMergedSummaries,
            branchLabel,
            `${startDate} ~ ${endDate}`,
            compName
          );
        }
      }
      setPrintFeedback(
        lang === 'km'
          ? 'បានបង្កើត និងទាញយកឯកសារ PDF គាំទ្រពុម្ពអក្សរខ្មែរជោគជ័យ!'
          : 'Official PDF with Khmer typography generated & downloaded successfully!'
      );
    } catch (err) {
      console.error('Failed to export PDF from modal:', err);
      setPrintFeedback(
        lang === 'km'
          ? 'មានបញ្ហាក្នុងការបង្កើត PDF។ សូមព្យាយាមម្តងទៀត។'
          : 'Failed to generate PDF. Please try again.'
      );
    } finally {
      setIsExportingModalPdf(false);
    }
  };

  const handlePrintDocument = () => {
    handleDownloadPdfFromModal();
  };

  const handleConfirmAction = () => {
    if (!actionLeave) return;
    setJustActionedLeaveIds((prev) => new Set([...prev, actionLeave.id]));
    onUpdateLeaveStatus(
      actionLeave.id,
      actionLeave.action,
      commentText.trim() || undefined,
      'Admin / HR Director'
    );
    setActionLeave(null);
    setCommentText('');
  };

  const handleQuickApprove = (id: string) => {
    setJustActionedLeaveIds((prev) => new Set([...prev, id]));
    onUpdateLeaveStatus(id, 'approved', undefined, 'Admin / HR Director');
  };

  const handleToggleDecision = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'approved' ? 'rejected' : 'approved';
    setJustActionedLeaveIds((prev) => new Set([...prev, id]));
    onUpdateLeaveStatus(id, nextStatus, undefined, 'Admin / HR Director');
  };

  // Metrics Calculations
  const totalSundaysCount = timesheetRows.filter((r) => r.isSunday).length;
  const totalWorkedRows = timesheetRows.filter((r) => !r.isSunday && r.timeIn !== '--:--').length;
  const totalLateRows = timesheetRows.filter((r) => r.status.toLowerCase().includes('late')).length;
  const totalOvertimeRows = timesheetRows.filter((r) => r.status.toLowerCase().includes('overtime')).length;
  const totalStaffCount = filteredMergedSummaries.length;
  const totalConsolidatedWorkHours = filteredMergedSummaries.reduce((acc, s) => acc + s.totalWorkHours, 0).toFixed(1);
  const pendingCount = leaveRequests.filter((r) => r.status === 'pending').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. Header Banner & Action Center */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <span className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <FileSpreadsheet className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-800">
                  {lang === 'km' ? 'របាយការណ៍វត្តមាន & សន្លឹកម៉ោង (Attendance & Timesheet Reports)' : 'Attendance & Timesheet Reports'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                  7 Branches
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                {lang === 'km'
                  ? 'ទាញយករបាយការណ៍បំបែកតាមសាខានីមួយៗ ផ្ដុំទិន្នន័យបុគ្គលិកតាមឈ្មោះ កំណត់កាលបរិច្ឆេទ គូសចំណាំថ្ងៃអាទិត្យ CSV និង PDF ផ្លូវការ'
                  : 'Separate branch reports, merge & group employees by name, custom date ranges, and auto-marked Sunday rows'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Export Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
          {/* Excel XLSX Download Button (With Exact PDF Format & Style) */}
          <button
            type="button"
            disabled={isExportingXlsx}
            onClick={handleDownloadXlsx}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md shadow-emerald-200 transition cursor-pointer disabled:opacity-60"
            title={`Download Excel XLSX with PDF Format Style (${timesheetViewMode === 'merged' ? 'Merged Summary' : 'Detailed Timesheet'})`}
          >
            <FileSpreadsheet className={`w-4 h-4 text-emerald-200 ${isExportingXlsx ? 'animate-pulse' : ''}`} />
            <span>
              {isExportingXlsx
                ? (lang === 'km' ? 'កំពុងបង្កើត Excel...' : 'Generating Excel...')
                : timesheetViewMode === 'merged'
                ? (lang === 'km' ? 'ទាញយក Excel (.xlsx)' : 'Export Merged Excel (.xlsx)')
                : (lang === 'km' ? 'ទាញយក Excel (.xlsx)' : 'Export Detailed Excel (.xlsx)')}
            </span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-md bg-emerald-900/60 text-emerald-200 text-[10px] font-mono">
              PDF Styled
            </span>
          </button>

          {/* CSV Download Button */}
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="flex items-center space-x-2 px-3.5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-200 transition cursor-pointer"
            title={`Download CSV with Report Summary (${timesheetViewMode === 'merged' ? 'Merged Summary' : 'Detailed Timesheet'})`}
          >
            <Download className="w-4 h-4" />
            <span>
              {timesheetViewMode === 'merged'
                ? (lang === 'km' ? 'ទាញយក CSV' : 'Export CSV')
                : (lang === 'km' ? 'ទាញយក CSV' : 'Export CSV')}
            </span>
          </button>

          {/* PDF Download Button with Khmer font support */}
          <button
            type="button"
            disabled={isExportingPdf}
            onClick={handleDownloadPdf}
            className="flex items-center space-x-2 px-3.5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition cursor-pointer disabled:opacity-60"
            title={`Download PDF (${timesheetViewMode === 'merged' ? 'Merged Summary' : 'Detailed Timesheet'})`}
          >
            <FileDown className={`w-4 h-4 ${isExportingPdf ? 'animate-bounce' : ''}`} />
            <span>
              {isExportingPdf
                ? (lang === 'km' ? 'កំពុងបង្កើត PDF...' : 'Generating PDF...')
                : timesheetViewMode === 'merged'
                ? (lang === 'km' ? 'ទាញយក PDF' : 'Export PDF')
                : (lang === 'km' ? 'ទាញយក PDF' : 'Export PDF')}
            </span>
          </button>

          {/* Batch Download Menu */}
          <div className="relative group">
            <button
              type="button"
              disabled={isExportingBatch}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
            >
              <FolderArchive className="w-4 h-4 text-amber-400" />
              <span>{isExportingBatch ? (lang === 'km' ? 'កំពុងទាញយក...' : 'Exporting...') : (lang === 'km' ? 'បំបែក ៧ សាខា' : 'Batch All Branches')}</span>
            </button>
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 hidden group-hover:block z-30 space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                Merged Employee Summary
              </div>
              <button
                type="button"
                onClick={() => handleBatchExportAllBranches('xlsx', 'merged')}
                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Download 7 Merged Excels (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => handleBatchExportAllBranches('pdf', 'merged')}
                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition flex items-center gap-2"
              >
                <FileDown className="w-4 h-4 text-indigo-600" />
                <span>Download 7 Merged PDFs (1/branch)</span>
              </button>
              <button
                type="button"
                onClick={() => handleBatchExportAllBranches('csv', 'merged')}
                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-700 rounded-xl transition flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-teal-600" />
                <span>Download 7 Merged CSVs (1/branch)</span>
              </button>

              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pt-2">
                Daily Detailed Timesheet
              </div>
              <button
                type="button"
                onClick={() => handleBatchExportAllBranches('xlsx', 'detailed')}
                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Download 7 Detailed Excels (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => handleBatchExportAllBranches('pdf', 'detailed')}
                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition flex items-center gap-2"
              >
                <FileDown className="w-4 h-4 text-indigo-600" />
                <span>Download 7 Detailed PDFs</span>
              </button>
              <button
                type="button"
                onClick={() => handleBatchExportAllBranches('csv', 'detailed')}
                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-700 rounded-xl transition flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-teal-600" />
                <span>Download 7 Detailed CSVs</span>
              </button>

              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pt-2">
                Official Roster Exports
              </div>
              <button
                type="button"
                onClick={() => {
                  setPrintBranchFilter(selectedBranchFilter);
                  setPrintStaffFilter('all');
                  setPrintDepartmentFilter('all');
                  handleDownloadRosterXlsx(selectedBranchFilter, 'all', 'all');
                }}
                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export Roster Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrintBranchFilter(selectedBranchFilter);
                  setPrintStaffFilter('all');
                  setPrintDepartmentFilter('all');
                  handleDownloadRosterCsv(selectedBranchFilter, 'all', 'all');
                }}
                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-700 rounded-xl transition flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-teal-600" />
                <span>Export Roster CSV</span>
              </button>
            </div>
          </div>

          {/* Official Timesheet & Roster Print / View Button */}
          <button
            type="button"
            onClick={() => {
              setPrintStaffFilter('all');
              setPrintDepartmentFilter('all');
              setPrintBranchFilter(selectedBranchFilter);
              setPrintPreviewType('detailed');
              setShowPrintModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition cursor-pointer"
            title="Print Official Employee Timesheet & Roster"
          >
            <Printer className="w-4 h-4" />
            <span>{lang === 'km' ? 'ព្រីនសន្លឹកម៉ោង & Roster' : 'Print Timesheet & Roster'}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {lang === 'km' ? 'បុគ្គលិកសរុប (Merged)' : 'Employees Count'}
            </span>
            <div className="text-xl font-black text-slate-800">{totalStaffCount} Staff</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {lang === 'km' ? 'ម៉ោងការងារសរុប' : 'Total Work Hours'}
            </span>
            <div className="text-xl font-black text-emerald-700">{totalConsolidatedWorkHours} hrs</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <Sun className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {lang === 'km' ? 'ថ្ងៃអាទិត្យ (សម្រាក)' : 'Sundays Marked'}
            </span>
            <div className="text-xl font-black text-rose-600">{totalSundaysCount} Days</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock3 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {lang === 'km' ? 'មកយឺត & OT' : 'Late / Overtime'}
            </span>
            <div className="text-xl font-black text-amber-700">{totalLateRows} / {totalOvertimeRows}</div>
          </div>
        </div>
      </div>

      {/* 3. Sub Tabs Menu */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('timesheet')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center space-x-2 cursor-pointer ${
            activeSubTab === 'timesheet'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{lang === 'km' ? 'សន្លឹកម៉ោង & ផ្ដុំទិន្នន័យបុគ្គលិក (Employee Timesheet & Reports)' : 'Employee Timesheet & Roster'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('live_punches')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center space-x-2 cursor-pointer ${
            activeSubTab === 'live_punches'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{lang === 'km' ? 'កំណត់ត្រាស្កេន GPS ឆៅ (Raw GPS Logs)' : 'Raw GPS Attendance Feed'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('leaves')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center space-x-2 cursor-pointer relative ${
            activeSubTab === 'leaves'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{lang === 'km' ? 'អនុម័តច្បាប់ & ម៉ោងថែម OT' : 'Leave, Sick & OT Approvals'}</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* 4. Filtering & Date Range Controls Panel */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        {/* Top Filter Row: Branch Selector, Employee Dropdown, and Date Presets */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          {/* Branch & Employee Selectors */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Branch Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>{lang === 'km' ? 'សាខា:' : 'Branch:'}</span>
              </span>
              <select
                value={selectedBranchFilter}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="all">{lang === 'km' ? '🌐 គ្រប់ ៧ សាខាទាំងអស់ (All 7 Branches)' : '🌐 All 7 Branches Combined'}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.type === 'club' ? '🍸 ' : b.type === 'cafe' ? '☕ ' : b.type === 'warehouse' ? '📦 ' : '🏢 '}
                    {lang === 'km' ? b.nameKh : b.nameEn} ({b.radiusMeters}m)
                  </option>
                ))}
              </select>
            </div>

            {/* Employee Filter Dropdown (Supports merging together filter by name) */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <User className="w-4 h-4 text-indigo-600" />
                <span>{lang === 'km' ? 'បុគ្គលិក:' : 'Filter Employee:'}</span>
              </span>
              <select
                value={selectedEmployeeFilter}
                onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none max-w-[220px]"
              >
                <option value="all">
                  {lang === 'km'
                    ? `👥 បុគ្គលិកទាំងអស់ (${branchEmployees.length} នាក់)`
                    : `👥 All Employees (${branchEmployees.length} Staff)`}
                </option>
                {branchEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.code} - {emp.nameEn} ({emp.nameKh})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1">{lang === 'km' ? 'កាលបរិច្ឆេទ:' : 'Presets:'}</span>
            <button
              type="button"
              onClick={() => handleApplyPreset('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedPreset === 'today' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lang === 'km' ? 'ថ្ងៃនេះ' : 'Today'}
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('yesterday')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedPreset === 'yesterday' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lang === 'km' ? 'ម្សិលមិញ' : 'Yesterday'}
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('this_week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedPreset === 'this_week' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lang === 'km' ? 'សប្តាហ៍នេះ' : 'This Week'}
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedPreset === 'month' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lang === 'km' ? 'ខែនេះពេញ (1 ដល់ 30/31)' : 'Full Month (1-30/31)'}
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('prev_month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedPreset === 'prev_month' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lang === 'km' ? 'ខែមុន' : 'Last Month'}
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('last_30')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedPreset === 'last_30' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lang === 'km' ? '៣០ ថ្ងៃ' : 'Last 30 Days'}
            </button>
          </div>
        </div>

        {/* Bottom Filter Controls: Month Picker + Custom Start/End Date Pickers + Search Box */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              {lang === 'km' ? 'ជ្រើសរើសខែពេញ:' : 'Select Month:'}
            </label>
            <input
              type="month"
              value={startDate && startDate.length >= 7 ? startDate.substring(0, 7) : ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val && val.includes('-')) {
                  const [yyyy, mm] = val.split('-').map(Number);
                  const firstDay = `${yyyy}-${String(mm).padStart(2, '0')}-01`;
                  const lastDayNum = new Date(yyyy, mm, 0).getDate();
                  const lastDay = `${yyyy}-${String(mm).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;
                  setStartDate(firstDay);
                  setEndDate(lastDay);
                  setSelectedPreset('month');
                }
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-mono text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              {lang === 'km' ? 'ចាប់ពីថ្ងៃ (Start Date):' : 'Start Date:'}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setSelectedPreset('custom');
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-mono text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              {lang === 'km' ? 'រហូតដល់ថ្ងៃ (End Date):' : 'End Date:'}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setSelectedPreset('custom');
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-mono text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-6">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              {lang === 'km' ? 'ស្វែងរកបុគ្គលិកតាមឈ្មោះ / អត្តលេខ / ផ្នែក:' : 'Filter Employee by Name, Code, or Department:'}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'km' ? 'វាយបញ្ចូលឈ្មោះបុគ្គលិកដើម្បីច្រោះទិន្នន័យ...' : 'Type employee name to merge & filter...'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB TAB 1: EMPLOYEE TIMESHEET & REPORTS (WITH MERGED & DETAILED MODES) */}
      {/* ========================================================================= */}
      {activeSubTab === 'timesheet' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm space-y-4 p-5">
          {/* Header Bar with View Mode Switcher (Merged Together vs Daily Matrix) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-800">
                  {timesheetViewMode === 'merged'
                    ? (lang === 'km' ? 'ផ្ដុំទិន្នន័យបុគ្គលិកសរុប (Merged Employee Summary Matrix)' : 'Merged Employee Attendance Summary Matrix')
                    : (lang === 'km' ? 'តារាងវត្តមានប្រចាំថ្ងៃ & គូសថ្ងៃអាទិត្យ (Daily Timesheet Matrix)' : 'Daily Chronological Timesheet & Sunday Audit')}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                  {timesheetViewMode === 'merged' ? `${filteredMergedSummaries.length} Employees` : `${filteredTimesheetRows.length} Daily Rows`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentBranchTitle} • Range: <span className="font-mono font-bold text-slate-700">{startDate} ~ {endDate}</span>
                {selectedEmployeeFilter !== 'all' && (
                  <span className="ml-1.5 text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                    Filtered: {selectedEmployeeObj?.nameEn}
                  </span>
                )}
              </p>
            </div>

            {/* View Mode Switcher Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-2xl bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setTimesheetViewMode('merged')}
                  className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    timesheetViewMode === 'merged'
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{lang === 'km' ? 'ផ្ដុំតាមបុគ្គលិក (Merged)' : 'Merged by Employee'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTimesheetViewMode('daily')}
                  className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    timesheetViewMode === 'daily'
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{lang === 'km' ? 'សន្លឹកម៉ោងប្រចាំថ្ងៃ (Daily)' : 'Daily Matrix (Sunday Marked)'}</span>
                </button>
              </div>

              {timesheetViewMode === 'merged' && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setMergedDisplayMode('cards')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        mergedDisplayMode === 'cards'
                          ? 'bg-white text-indigo-600 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {lang === 'km' ? 'កាតបុគ្គលិក (Cards)' : 'Staff Cards'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMergedDisplayMode('table')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        mergedDisplayMode === 'table'
                          ? 'bg-white text-indigo-600 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {lang === 'km' ? 'តារាងសង្ខេប (Summary Table)' : 'Summary Table'}
                    </button>
                  </div>

                  {mergedDisplayMode === 'cards' && (
                    <button
                      type="button"
                      onClick={handleToggleExpandAll}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                      title="Expand/Collapse all employee daily details"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                      <span>{lang === 'km' ? 'ពង្រីក/បង្រួមទាំងអស់' : 'Toggle All Details'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ========================================================== */}
          {/* MODE A: MERGED BY EMPLOYEE (CONSOLIDATED SUMMARY TABLE OR CARDS) */}
          {/* ========================================================== */}
          {timesheetViewMode === 'merged' && (
            <div className="space-y-4">
              {mergedDisplayMode === 'table' ? (
                /* Consolidated Summary Table View with full Customizer & Resize */
                <div className="space-y-3">
                  <ReportTableToolbar
                    settings={mergedTableSettings}
                    onUpdateSettings={handleUpdateMergedSettings}
                    onOpenCustomizerModal={() => {
                      setCustomizerTarget('merged');
                      setShowCustomizerModal(true);
                    }}
                    availableColumns={MERGED_SUMMARY_COLUMNS}
                    lang={lang}
                    onResetSettings={handleResetMergedSettings}
                    onExportXlsx={handleDownloadXlsx}
                    onExportCsv={handleDownloadCsv}
                  />

                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
                    <table
                      className="text-left border-collapse"
                      style={{
                        fontFamily: selectedMergedFont.familyCss,
                        fontSize: `${mergedTableSettings.fontSizePx}px`,
                        tableLayout: 'fixed',
                        width: `${totalMergedTableWidth}px`,
                        minWidth: '100%',
                      }}
                    >
                      <colgroup>
                        {MERGED_SUMMARY_COLUMNS
                          .filter((col) => mergedTableSettings.visibleColumns.includes(col.id))
                          .map((col) => {
                            const colW = mergedTableSettings.columnWidths[col.id] || col.defaultWidth;
                            return <col key={`mcol_${col.id}`} style={{ width: `${colW}px`, minWidth: `${colW}px` }} />;
                          })}
                      </colgroup>
                      <thead>
                        <tr className={mergedHeaderThemeClass}>
                          {MERGED_SUMMARY_COLUMNS
                            .filter((col) => mergedTableSettings.visibleColumns.includes(col.id))
                            .map((col) => {
                              const colW = mergedTableSettings.columnWidths[col.id] || col.defaultWidth;
                              return (
                                <th
                                  key={col.id}
                                  style={{
                                    width: `${colW}px`,
                                    minWidth: `${colW}px`,
                                    maxWidth: `${colW}px`,
                                    fontFamily: selectedMergedFont.familyCss,
                                    fontSize: `${mergedTableSettings.fontSizePx}px`,
                                    overflow: 'hidden',
                                  }}
                                  className={`relative group ${mergedDensityClass} ${
                                    col.align === 'center' ? 'text-center' : 'text-left'
                                  } font-black uppercase tracking-wider select-none`}
                                >
                                  <div className="flex items-center justify-between gap-1 overflow-hidden">
                                    <span className="truncate" style={{ fontFamily: 'inherit', fontSize: 'inherit' }}>
                                      {lang === 'km' ? col.labelKh : col.labelEn}
                                    </span>
                                  </div>

                                  {/* Interactive Column Resize Handle */}
                                  <div
                                    onMouseDown={(e) => onMergedColumnResizeMouseDown(col.id, e)}
                                    className={`absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-indigo-500 transition-colors z-10 flex items-center justify-center ${
                                      resizingMergedColId === col.id ? 'bg-indigo-600' : 'opacity-40 hover:opacity-100'
                                    }`}
                                    title={lang === 'km' ? 'អូសដើម្បីប្តូរទទឹងជួរឈរ' : 'Drag left/right to adjust column width'}
                                  >
                                    <span className="w-0.5 h-3 bg-slate-400 group-hover:bg-white rounded-full" />
                                  </div>
                                </th>
                              );
                            })}
                        </tr>
                      </thead>
                      <tbody className={mergedTableSettings.zebraStripes ? 'divide-y divide-slate-100' : ''}>
                        {filteredMergedSummaries.length === 0 ? (
                          <tr>
                            <td
                              colSpan={mergedTableSettings.visibleColumns.length}
                              className="py-12 text-center text-slate-400 font-sans"
                            >
                              <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                              <p className="font-bold">
                                {lang === 'km' ? 'មិនមានបុគ្គលិកត្រូវតាមការស្វែងរកនេះទេ' : 'No employee records match your filter criteria'}
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredMergedSummaries.map((summary, idx) => {
                            const rowBg =
                              mergedTableSettings.zebraStripes && idx % 2 === 1
                                ? 'bg-slate-50/60 hover:bg-slate-100/80'
                                : 'bg-white hover:bg-slate-50/80';

                            return (
                              <tr
                                key={`merged_row_${summary.employeeId}`}
                                className={`${rowBg} transition`}
                              >
                                {MERGED_SUMMARY_COLUMNS
                                  .filter((col) => mergedTableSettings.visibleColumns.includes(col.id))
                                  .map((col) => {
                                    const colW = mergedTableSettings.columnWidths[col.id] || col.defaultWidth;
                                    return (
                                      <td
                                        key={col.id}
                                        style={{
                                          width: `${colW}px`,
                                          minWidth: `${colW}px`,
                                          maxWidth: `${colW}px`,
                                          fontFamily: selectedMergedFont.familyCss,
                                          fontSize: `${mergedTableSettings.fontSizePx}px`,
                                          overflow: 'hidden',
                                        }}
                                        className={`${mergedDensityClass} ${mergedBorderClass} ${
                                          col.align === 'center' ? 'text-center' : 'text-left'
                                        }`}
                                      >
                                        {renderMergedCellContent(summary, idx, col.id)}
                                      </td>
                                    );
                                  })}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Card View */
                filteredMergedSummaries.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold">{lang === 'km' ? 'មិនមានបុគ្គលិកត្រូវតាមការស្វែងរកនេះទេ' : 'No employee records match your filter criteria'}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {filteredMergedSummaries.map((summary, idx) => {
                    const isExpanded = !!expandedEmployeeIds[summary.employeeId];
                    return (
                      <div key={summary.employeeId} className="bg-white hover:bg-slate-50/60 transition">
                        {/* Employee Master Row Header */}
                        <div
                          onClick={() => toggleEmployeeExpand(summary.employeeId)}
                          className="p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 cursor-pointer select-none"
                        >
                          {/* Left: Employee Info */}
                          <div className="flex items-center space-x-3.5 min-w-[260px]">
                            <span className="w-6 text-center font-mono text-xs font-bold text-slate-400">
                              {idx + 1}
                            </span>
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                              {summary.enrollId}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-slate-900 text-sm">
                                  {lang === 'km' ? summary.nameKh : summary.nameEn}
                                </h4>
                                <span className="text-xs text-slate-400 font-medium">
                                  ({summary.nameEn})
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-slate-700">{summary.department}</span>
                                <span>•</span>
                                <span>{summary.role}</span>
                                <span>•</span>
                                <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 text-[11px]">
                                  {summary.branchNameEn}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Middle: Merged Aggregate Performance Metrics */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 w-full lg:w-auto">
                            {/* Days Present */}
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-center">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                {lang === 'km' ? 'ថ្ងៃធ្វើការ' : 'Present'}
                              </span>
                              <span className="text-sm font-black text-emerald-700">
                                {summary.daysPresent} <span className="text-[10px] text-slate-400">/{summary.totalDaysInRange - summary.sundaysCount}</span>
                              </span>
                            </div>

                            {/* Work Hours */}
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-center">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                {lang === 'km' ? 'ម៉ោងការងារ' : 'Work Hours'}
                              </span>
                              <span className="text-sm font-black text-indigo-700">
                                {summary.totalWorkHours}h
                              </span>
                            </div>

                            {/* On-Time Check-Ins */}
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-center">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                {lang === 'km' ? 'ទៀងម៉ោង' : 'On-Time'}
                              </span>
                              <span className="text-sm font-black text-emerald-600">
                                {summary.daysOnTime}
                              </span>
                            </div>

                            {/* Late Check-Ins */}
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-center">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                {lang === 'km' ? 'មកយឺត' : 'Late'}
                              </span>
                              <span className={`text-sm font-black ${summary.daysLate > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                                {summary.daysLate}
                              </span>
                            </div>

                            {/* OT Hours */}
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-center">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                {lang === 'km' ? 'ម៉ោង OT' : 'OT Hours'}
                              </span>
                              <span className="text-sm font-black text-purple-700">
                                {summary.totalOtHours}h
                              </span>
                            </div>

                            {/* Sundays Off */}
                            <div className="bg-rose-50/70 p-2.5 rounded-xl border border-rose-200/80 text-center">
                              <span className="text-[10px] font-bold text-rose-700 uppercase block">
                                {lang === 'km' ? 'ថ្ងៃអាទិត្យ' : 'Sundays'}
                              </span>
                              <span className="text-sm font-black text-rose-700">
                                {summary.sundaysCount}
                              </span>
                            </div>
                          </div>

                          {/* Right: Compliance Rate & Chevron */}
                          <div className="flex items-center space-x-2.5 self-end lg:self-center">
                            <div className="text-right hidden sm:block">
                              <div className="text-xs font-bold text-slate-500">Attendance Rate</div>
                              <div className="flex items-center gap-1.5 justify-end">
                                <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      summary.attendanceRate >= 90
                                        ? 'bg-emerald-500'
                                        : summary.attendanceRate >= 75
                                        ? 'bg-amber-500'
                                        : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${summary.attendanceRate}%` }}
                                  />
                                </div>
                                <span className="font-mono font-black text-xs text-slate-800">
                                  {summary.attendanceRate}%
                                </span>
                              </div>
                            </div>

                            {/* Direct Individual Staff Print Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPrintStaffFilter(summary.employeeId);
                                setPrintBranchFilter('all');
                                setPrintDepartmentFilter('all');
                                setPrintPreviewType('detailed');
                                setShowPrintModal(true);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition border border-indigo-200 flex items-center space-x-1 cursor-pointer"
                              title={`Print Timesheet & Roster for ${summary.nameEn}`}
                            >
                              <Printer className="w-3.5 h-3.5 text-indigo-600" />
                              <span className="hidden sm:inline">{lang === 'km' ? 'ព្រីន' : 'Print'}</span>
                            </button>

                            <button
                              type="button"
                              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                            >
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Expandable Day-by-Day Roster for this Employee */}
                        {isExpanded && (
                          <div className="bg-slate-50/80 p-4 sm:p-5 border-t border-slate-200">
                            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                              <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                                <Calendar className="w-4 h-4 text-indigo-600" />
                                <span>{summary.nameEn} — Detailed Daily Attendance Records ({summary.dailyRecords.length} Days)</span>
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium">
                                Sunday rows are clearly marked in Red
                              </span>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                                    <th className="py-2.5 px-3 text-center w-10">#</th>
                                    <th className="py-2.5 px-3">Date</th>
                                    <th className="py-2.5 px-3">Day of Week</th>
                                    <th className="py-2.5 px-3 text-center">Time In</th>
                                    <th className="py-2.5 px-3 text-center">Time Out</th>
                                    <th className="py-2.5 px-3 text-center">Work Hours</th>
                                    <th className="py-2.5 px-3">Status</th>
                                    <th className="py-2.5 px-4">Remark & GPS Verification</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {summary.dailyRecords.map((dRow, dIdx) => {
                                    if (dRow.isSunday) {
                                      return (
                                        <tr key={`emp_d_${summary.employeeId}_${dRow.date}`} className="bg-rose-50/80 text-rose-900 font-bold">
                                          <td className="py-2 px-3 text-center font-mono text-rose-600">{dIdx + 1}</td>
                                          <td className="py-2 px-3 font-mono font-black">{dRow.date}</td>
                                          <td className="py-2 px-3 uppercase text-rose-700">{dRow.dayOfWeek}</td>
                                          <td className="py-2 px-3 text-center font-mono text-rose-400">--:--</td>
                                          <td className="py-2 px-3 text-center font-mono text-rose-400">--:--</td>
                                          <td className="py-2 px-3 text-center font-mono text-rose-400">0.0h</td>
                                          <td className="py-2 px-3">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-200 text-rose-800 border border-rose-300">
                                              🔴 SUNDAY REST
                                            </span>
                                          </td>
                                          <td className="py-2 px-4 text-[11px] text-rose-700 italic">
                                            Weekly Rest Day / ថ្ងៃសម្រាកប្រចាំសប្តាហ៍
                                          </td>
                                        </tr>
                                      );
                                    }

                                    return (
                                      <tr key={`emp_d_${summary.employeeId}_${dRow.date}`} className="hover:bg-slate-50">
                                        <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-bold">{dIdx + 1}</td>
                                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{dRow.date}</td>
                                        <td className="py-2.5 px-3 text-slate-600 font-medium">{dRow.dayOfWeek.split(' ')[0]}</td>
                                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                                          <span className={dRow.timeIn !== '--:--' ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200' : 'text-slate-400'}>
                                            {dRow.timeIn}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                                          <span className={dRow.timeOut !== '--:--' ? 'text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200' : 'text-slate-400'}>
                                            {dRow.timeOut}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                                          {dRow.durationHours}
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            dRow.status.toLowerCase().includes('on-time')
                                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                              : dRow.status.toLowerCase().includes('late')
                                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                              : dRow.status.toLowerCase().includes('overtime')
                                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                                          }`}>
                                            {dRow.status}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-4 text-xs text-slate-600">
                                          {dRow.remark}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            )}
            </div>
          )}

          {/* ========================================================== */}
          {/* MODE B: DAILY CHRONOLOGICAL TIMESHEET MATRIX */}
          {/* ========================================================== */}
          {timesheetViewMode === 'daily' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    {lang === 'km' ? 'តារាងវត្តមានប្រចាំថ្ងៃពេញលេញ (Daily Roster Matrix)' : 'Daily Chronological Timesheet Matrix'}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    {lang === 'km'
                      ? 'តារាងវត្តមានលម្អិតប្រចាំថ្ងៃ រួមមានកាលបរិច្ឆេទ ថ្ងៃនៃសប្តាហ៍ ម៉ោងការងារ OT និងស្ថានភាព'
                      : 'Complete roster matrix including Date, Day of Week, Staff ID, Work & OT hours.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPrintStaffFilter('all');
                    setPrintDepartmentFilter('all');
                    setPrintBranchFilter(selectedBranchFilter);
                    setPrintPreviewType('detailed');
                    setShowPrintModal(true);
                  }}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition border border-indigo-200 cursor-pointer shadow-2xs self-start sm:self-auto"
                  title="Print Official Timesheet & Roster"
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{lang === 'km' ? 'ព្រីន Roster នេះ (Print)' : 'Print This Roster'}</span>
                </button>
              </div>

              {/* Table Customization & Typography Toolbar */}
              <ReportTableToolbar
                settings={dailyTableSettings}
                onUpdateSettings={handleUpdateDailySettings}
                onOpenCustomizerModal={() => {
                  setCustomizerTarget('daily');
                  setShowCustomizerModal(true);
                }}
                availableColumns={DAILY_TIMESHEET_COLUMNS}
                lang={lang}
                onResetSettings={handleResetDailySettings}
                onExportXlsx={handleDownloadXlsx}
                onExportCsv={handleDownloadCsv}
              />

              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
                <table
                  className="text-left border-collapse"
                  style={{
                    fontFamily: selectedDailyFont.familyCss,
                    fontSize: `${dailyTableSettings.fontSizePx}px`,
                    tableLayout: 'fixed',
                    width: `${totalDailyTableWidth}px`,
                    minWidth: '100%',
                  }}
                >
                  <colgroup>
                    {DAILY_TIMESHEET_COLUMNS
                      .filter((col) => dailyTableSettings.visibleColumns.includes(col.id))
                      .map((col) => {
                        const colW = dailyTableSettings.columnWidths[col.id] || col.defaultWidth;
                        return <col key={`dcol_${col.id}`} style={{ width: `${colW}px`, minWidth: `${colW}px` }} />;
                      })}
                  </colgroup>
                  <thead>
                    <tr className={dailyHeaderThemeClass}>
                      {DAILY_TIMESHEET_COLUMNS
                        .filter((col) => dailyTableSettings.visibleColumns.includes(col.id))
                        .map((col) => {
                          const colW = dailyTableSettings.columnWidths[col.id] || col.defaultWidth;
                          return (
                            <th
                              key={col.id}
                              style={{
                                width: `${colW}px`,
                                minWidth: `${colW}px`,
                                maxWidth: `${colW}px`,
                                fontFamily: selectedDailyFont.familyCss,
                                fontSize: `${dailyTableSettings.fontSizePx}px`,
                                overflow: 'hidden',
                              }}
                              className={`relative group ${dailyDensityClass} ${
                                col.align === 'center' ? 'text-center' : 'text-left'
                              } font-black uppercase tracking-wider select-none`}
                            >
                              <div className="flex items-center justify-between gap-1 overflow-hidden">
                                <span className="truncate" style={{ fontFamily: 'inherit', fontSize: 'inherit' }}>
                                  {lang === 'km' ? col.labelKh : col.labelEn}
                                </span>
                              </div>

                              {/* Interactive Column Resize Handle */}
                              <div
                                onMouseDown={(e) => onDailyColumnResizeMouseDown(col.id, e)}
                                className={`absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-indigo-500 transition-colors z-10 flex items-center justify-center ${
                                  resizingDailyColId === col.id ? 'bg-indigo-600' : 'opacity-40 hover:opacity-100'
                                }`}
                                title={lang === 'km' ? 'អូសដើម្បីប្តូរទទឹងជួរឈរ' : 'Drag left/right to adjust column width'}
                              >
                                <span className="w-0.5 h-3 bg-slate-400 group-hover:bg-white rounded-full" />
                              </div>
                            </th>
                          );
                        })}
                    </tr>
                  </thead>
                  <tbody className={dailyTableSettings.zebraStripes ? 'divide-y divide-slate-100' : ''}>
                    {filteredTimesheetRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={dailyTableSettings.visibleColumns.length}
                          className="py-12 text-center text-slate-400 font-sans"
                        >
                          <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                          <p className="font-bold">
                            {lang === 'km' ? 'មិនមានទិន្នន័យក្នុងកាលបរិច្ឆេទនេះទេ' : 'No timesheet records found for this date range'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredTimesheetRows.map((row, rIdx) => {
                        const isSun = row.isSunday;
                        const isDayOff = row.isDayOff;
                        const isLeave = row.isLeave;

                        let rowBg = '';
                        if (isSun) rowBg = 'bg-rose-50/90 text-rose-900 font-bold border-y border-rose-200 hover:bg-rose-100/90';
                        else if (isDayOff) rowBg = 'bg-amber-50/70 border-y border-amber-200/80 font-medium text-amber-900 hover:bg-amber-100/70';
                        else if (isLeave) rowBg = 'bg-purple-50/70 border-y border-purple-200/80 font-medium text-purple-900 hover:bg-purple-100/70';
                        else if (dailyTableSettings.zebraStripes && rIdx % 2 === 1) rowBg = 'bg-slate-50/60 hover:bg-slate-100/80';
                        else rowBg = 'bg-white hover:bg-slate-50/80';

                        return (
                          <tr
                            key={`daily_row_${row.no}_${row.employeeId}_${row.date}`}
                            className={`${rowBg} transition`}
                          >
                            {DAILY_TIMESHEET_COLUMNS
                              .filter((col) => dailyTableSettings.visibleColumns.includes(col.id))
                              .map((col) => {
                                const colW = dailyTableSettings.columnWidths[col.id] || col.defaultWidth;
                                return (
                                  <td
                                    key={col.id}
                                    style={{
                                      width: `${colW}px`,
                                      minWidth: `${colW}px`,
                                      maxWidth: `${colW}px`,
                                      fontFamily: selectedDailyFont.familyCss,
                                      fontSize: `${dailyTableSettings.fontSizePx}px`,
                                      overflow: 'hidden',
                                    }}
                                    className={`${dailyDensityClass} ${dailyBorderClass} ${
                                      col.align === 'center' ? 'text-center' : 'text-left'
                                    }`}
                                  >
                                    {renderDailyCellContent(row, col.id)}
                                  </td>
                                );
                              })}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB TAB 2: LIVE RAW GPS PUNCHES FEED */}
      {/* ========================================================================= */}
      {activeSubTab === 'live_punches' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">
              {lang === 'km' ? 'កំណត់ត្រាស្កេន GPS ជាក់ស្តែង (Raw GPS Logs)' : 'Raw GPS Timesheet Logs'}
            </h3>
            <span className="text-xs font-bold text-indigo-600">
              {filteredRawRecords.length} records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-4 px-6">{lang === 'km' ? 'បុគ្គលិក' : 'Employee'}</th>
                  <th className="py-4 px-6">{lang === 'km' ? 'សាខា' : 'Branch'}</th>
                  <th className="py-4 px-6">{lang === 'km' ? 'ប្រភេទ / ម៉ោង' : 'Type & Time'}</th>
                  <th className="py-4 px-6">{lang === 'km' ? 'ទីតាំង GPS' : 'GPS Verification'}</th>
                  <th className="py-4 px-6">{lang === 'km' ? 'វិធីស្កេន' : 'Method'}</th>
                  <th className="py-4 px-6">{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRawRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <p className="font-bold">{lang === 'km' ? 'មិនមានកំណត់ត្រាស្កេន GPS ទេ' : 'No raw punch records match your filters'}</p>
                    </td>
                  </tr>
                ) : (
                  filteredRawRecords.map((rec) => {
                    const matchedEmp = employees.find(
                      (e) => e.id === rec.employeeId || e.code === rec.employeeCode
                    );
                    const avatarSrc = resolveAvatar(
                      matchedEmp?.avatar,
                      rec.employeeAvatar,
                      rec.employeeNameEn || rec.employeeNameKh || matchedEmp?.nameEn || 'Staff'
                    );

                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-6">
                          <div className="flex items-center space-x-3">
                            <img
                              src={avatarSrc}
                              alt={rec.employeeNameEn || 'Staff'}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-sm bg-slate-100"
                              onError={(e) => {
                                handleAvatarError(e, rec.employeeNameEn || rec.employeeNameKh || 'Staff');
                              }}
                            />
                          <div>
                            <div className="font-bold text-slate-800 text-sm">
                              {lang === 'km' ? rec.employeeNameKh : rec.employeeNameEn}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 font-semibold">{rec.employeeCode}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-slate-800">{rec.branchNameEn}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[150px]">{rec.branchNameKh}</div>
                      </td>

                      <td className="py-3.5 px-6">
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rec.type === 'check_in'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {rec.type === 'check_in' ? 'Check-In' : 'Check-Out'}
                          </span>
                          <span className="font-mono text-slate-800 font-bold text-xs">
                            {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {rec.timestamp.split('T')[0]}
                        </div>
                      </td>

                      <td className="py-3.5 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold ${
                          rec.isWithinGeofence
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            rec.isWithinGeofence ? 'bg-emerald-500' : 'bg-rose-500'
                          }`} />
                          <span>
                            {rec.isWithinGeofence
                              ? `${lang === 'km' ? 'ផ្ទៀងផ្ទាត់រួច' : 'Valid'} (${formatDistance(rec.distanceToBranch, lang)})`
                              : `${lang === 'km' ? 'ខុសទីតាំង' : 'Out of Range'} (${formatDistance(rec.distanceToBranch, lang)})`}
                          </span>
                        </span>
                      </td>

                      <td className="py-3.5 px-6">
                        <span className="text-[11px] font-mono bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 text-slate-700 font-medium">
                          {rec.method === 'qr_mobile' ? '📱 Phone QR' :
                           rec.method === 'qr_kiosk' ? '📺 Kiosk QR' :
                           rec.method === 'kiosk_pin' ? '🔢 Touch PIN' : '🛡️ Badge'}
                        </span>
                      </td>

                      <td className="py-3.5 px-6">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.status === 'on_time'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : rec.status === 'late'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : rec.status === 'overtime'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            rec.status === 'on_time' ? 'bg-emerald-500' : rec.status === 'late' ? 'bg-rose-500' : 'bg-purple-500'
                          }`} />
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB TAB 3: LEAVE & OT REQUESTS APPROVAL HUB */}
      {/* ========================================================================= */}
      {activeSubTab === 'leaves' && (
        <div className="space-y-5">
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Stream Header */}
            <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 rounded-2xl bg-indigo-600/40 border border-indigo-400/30 text-indigo-300">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base font-battambang">
                    {lang === 'km' ? 'បញ្ជីពាក្យស្នើសុំច្បាប់ និងម៉ោងថែម OT (Approval Stream)' : 'Leave, Sick & Overtime Approval Stream'}
                  </h3>
                  <p className="text-xs text-slate-300 font-medium">
                    {lang === 'km'
                      ? 'ពិនិត្យ និងអនុម័តពាក្យសុំច្បាប់ដោយរក្សាទិន្នន័យជាក់ស្តែងក្នុងតារាងបន្ទាប់ពីអនុម័តរួច'
                      : 'Review and approve staff leaves, sick days, and overtime. Records remain preserved in the table after approval.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 font-mono">
                  {filteredRequests.length} {lang === 'km' ? 'សំណើ' : 'records'}
                </span>
              </div>
            </div>

            {/* Stream Filter Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setLeaveStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                    leaveStatusFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span>{lang === 'km' ? 'ទាំងអស់' : 'All'}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${leaveStatusFilter === 'all' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-800'}`}>
                    {leaveRequests.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setLeaveStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                    leaveStatusFilter === 'pending'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span>{lang === 'km' ? 'រង់ចាំអនុម័ត' : 'Pending'}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${leaveStatusFilter === 'pending' ? 'bg-rose-700 text-white' : 'bg-slate-200 text-slate-800'}`}>
                    {leaveRequests.filter((r) => r.status === 'pending').length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setLeaveStatusFilter('approved')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                    leaveStatusFilter === 'approved'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span>{lang === 'km' ? 'បានអនុម័ត' : 'Approved'}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${leaveStatusFilter === 'approved' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-800'}`}>
                    {leaveRequests.filter((r) => r.status === 'approved').length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setLeaveStatusFilter('rejected')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                    leaveStatusFilter === 'rejected'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span>{lang === 'km' ? 'បានបដិសេធ' : 'Rejected'}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${leaveStatusFilter === 'rejected' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-800'}`}>
                    {leaveRequests.filter((r) => r.status === 'rejected').length}
                  </span>
                </button>
              </div>

              {/* Staff Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-slate-500 hidden sm:inline">
                  {lang === 'km' ? 'បុគ្គលិក:' : 'Staff:'}
                </span>
                <select
                  value={streamStaffFilter}
                  onChange={(e) => setStreamStaffFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">{lang === 'km' ? '👥 បុគ្គលិកទាំងអស់' : '👥 All Staff'}</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.code} - {e.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-slate-500 hidden sm:inline">
                  {lang === 'km' ? 'ប្រភេទច្បាប់:' : 'Leave Type:'}
                </span>
                <select
                  value={leaveCategoryFilter}
                  onChange={(e) => setLeaveCategoryFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">{lang === 'km' ? 'គ្រប់ប្រភេទ (All Categories)' : 'All Categories'}</option>
                  <option value="leave">{lang === 'km' ? 'ច្បាប់ប្រចាំឆ្នាំ (Annual Leave)' : 'Annual Leave'}</option>
                  <option value="sick">{lang === 'km' ? 'ច្បាប់ឈឺ (Sick Leave)' : 'Sick Leave'}</option>
                  <option value="overtime">{lang === 'km' ? 'ថែមម៉ោង OT (Overtime)' : 'Overtime OT'}</option>
                  <option value="permission">{lang === 'km' ? 'ចេញមុន/មកយឺត (Permission)' : 'Permission Pass'}</option>
                  <option value="urgent">{lang === 'km' ? 'ច្បាប់បន្ទាន់ (Urgent Leave)' : 'Urgent Leave'}</option>
                </select>
              </div>
            </div>

            {/* In-table notice when pending filter is selected but all pending items are already approved */}
            {leaveStatusFilter === 'pending' && leaveRequests.filter((r) => r.status === 'pending').length === 0 && (
              <div className="mx-4 sm:mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 font-bold">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{lang === 'km' ? 'ពាក្យស្នើសុំទាំងអស់ត្រូវបានអនុម័តរួចរាល់! កំពុងបង្ហាញកំណត់ត្រាអនុម័តជាក់ស្តែងក្នុងតារាង៖' : 'All pending requests have been approved! Showing all stream records in the table:'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLeaveStatusFilter('all')}
                  className="underline text-emerald-900 cursor-pointer"
                >
                  {lang === 'km' ? 'បង្ហាញទាំងអស់ (Show All)' : 'Show All'}
                </button>
              </div>
            )}

            {/* Approval Stream Table */}
            <div className="overflow-x-auto">
              {filteredRequests.length === 0 ? (
                <div className="py-14 px-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800 font-battambang">
                    {leaveStatusFilter === 'pending'
                      ? (lang === 'km' ? 'គ្មានពាក្យស្នើសុំច្បាប់រង់ចាំទេ!' : 'No Pending Requests')
                      : (lang === 'km' ? 'គ្មានទិន្នន័យច្បាប់ត្រូវបង្ហាញទេ' : 'No Leave Requests Found')}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    {leaveStatusFilter === 'pending'
                      ? (lang === 'km'
                          ? 'រាល់ពាក្យស្នើសុំទាំងអស់ត្រូវបានអនុម័តរួចរាល់។ អ្នកអាចចុចប៊ូតុងខាងក្រោមដើម្បីមើលកំណត់ត្រាដែលបានអនុម័ត។'
                          : 'All applications have been processed. Click below to view approved records.')
                      : (lang === 'km'
                          ? 'សូមជ្រើសរើសផ្ទាំងតម្រងផ្សេងទៀតដើម្បីមើលទិន្នន័យ'
                          : 'Select another filter tab above or reset filters to view all records.')}
                  </p>
                  {leaveRequests.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                      {leaveStatusFilter !== 'approved' && (
                        <button
                          type="button"
                          onClick={() => setLeaveStatusFilter('approved')}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition border border-emerald-200 cursor-pointer"
                        >
                          {lang === 'km' ? `មើលពាក្យសុំបានអនុម័ត (${leaveRequests.filter(r => r.status === 'approved').length})` : `View Approved (${leaveRequests.filter(r => r.status === 'approved').length})`}
                        </button>
                      )}
                      {leaveStatusFilter !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setLeaveStatusFilter('all')}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition border border-indigo-200 cursor-pointer"
                        >
                          {lang === 'km' ? `បង្ហាញទាំងអស់ (${leaveRequests.length})` : `Show All Requests (${leaveRequests.length})`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-4 px-6">{lang === 'km' ? 'បុគ្គលិក' : 'Employee'}</th>
                      <th className="py-4 px-6">{lang === 'km' ? 'ប្រភេទស្នើសុំ' : 'Request Type'}</th>
                      <th className="py-4 px-6">{lang === 'km' ? 'កាលបរិច្ឆេទ / ម៉ោង' : 'Dates / Duration'}</th>
                      <th className="py-4 px-6">{lang === 'km' ? 'មូលហេតុ' : 'Reason'}</th>
                      <th className="py-4 px-6">{lang === 'km' ? 'ស្ថានភាព & ការអនុម័ត' : 'Status & Approval'}</th>
                      <th className="py-4 px-6 text-right">{lang === 'km' ? 'សកម្មភាព' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.map((req) => {
                      const emp = employees.find((e) => e.id === req.employeeId || e.code === req.employeeCode);
                      const branch = branches.find((b) => b.id === req.branchId || b.id === emp?.branchId);
                      const isJustDone = justActionedLeaveIds.has(req.id);

                      return (
                        <tr
                          key={req.id}
                          className={`transition ${
                            isJustDone
                              ? 'bg-emerald-50/60 ring-1 ring-emerald-300'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-3.5 px-6">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 shadow-xs shrink-0 bg-slate-100 flex items-center justify-center">
                                <img
                                  src={resolveAvatar(emp?.avatar, req.employeeAvatar, req.employeeNameEn || req.employeeNameKh || emp?.nameEn || 'Staff')}
                                  alt="avatar"
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    handleAvatarError(e, req.employeeNameEn || req.employeeNameKh || emp?.nameEn || 'Staff');
                                  }}
                                />
                              </div>
                              <div>
                                <div className="font-bold text-slate-800 text-sm">
                                  {lang === 'km' ? req.employeeNameKh || req.employeeNameEn : req.employeeNameEn}
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium">
                                  {emp?.code || req.employeeCode || 'ID'} • {branch?.nameEn || req.branchId} • {emp?.department || 'Operations'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-6">
                            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                              req.category === 'sick' || req.type === 'sick'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : req.category === 'overtime' || req.type === 'overtime'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : req.category === 'urgent' || req.type === 'urgent'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : req.category === 'permission' || req.type === 'half_day'
                                ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}>
                              {req.category || req.type}
                            </span>
                          </td>

                          <td className="py-3.5 px-6">
                            <div className="font-mono text-slate-800 font-bold">
                              {req.startDate} {req.endDate && req.endDate !== req.startDate ? `~ ${req.endDate}` : ''}
                            </div>
                            {req.hours ? (
                              <div className="text-[11px] text-indigo-600 font-bold">
                                {req.hours} hrs ({req.otRateMultiplier || 1.5}x OT)
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-400">
                                {lang === 'km' ? 'ច្បាប់ពេញមួយថ្ងៃ' : 'Full day leave'}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-6 max-w-xs text-slate-600">
                            <div className="truncate font-medium">{req.reason || 'No reason provided'}</div>
                            {req.attachmentUrl && (
                              <div className="text-[10px] text-indigo-600 font-bold mt-0.5">📎 Attachment Included</div>
                            )}
                          </td>

                          <td className="py-3.5 px-6">
                            <div className="space-y-0.5">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                req.status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : req.status === 'rejected'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  req.status === 'approved' ? 'bg-emerald-500' : req.status === 'rejected' ? 'bg-rose-500' : 'bg-amber-500 animate-ping'
                                }`} />
                                <span>{req.status.toUpperCase()}</span>
                              </span>
                              {req.approvedBy && (
                                <div className="text-[10px] text-slate-500 font-medium">
                                  {lang === 'km' ? 'ដោយ:' : 'By:'} {req.approvedBy}
                                </div>
                              )}
                              {req.adminComment && (
                                <div className="text-[10px] text-slate-600 italic">
                                  "{req.adminComment}"
                                </div>
                              )}
                              {isJustDone && (
                                <div className="text-[10px] font-bold text-emerald-700 animate-pulse">
                                  ✨ {lang === 'km' ? 'ទើបតែធ្វើបច្ចុប្បន្នភាព' : 'Just Actioned'}
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-6 text-right">
                            {req.status === 'pending' ? (
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleQuickApprove(req.id)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center space-x-1 shadow-sm shadow-emerald-200 transition cursor-pointer font-battambang"
                                  title="Approve Request (1-Click Instant)"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{lang === 'km' ? 'អនុម័ត (Approve)' : 'Approve'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActionLeave({ id: req.id, action: 'rejected', name: req.employeeNameEn || req.employeeNameKh })}
                                  className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center space-x-1 border border-rose-200 transition cursor-pointer font-battambang"
                                  title="Reject Request with Optional Reason"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>{lang === 'km' ? 'បដិសេធ' : 'Reject'}</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleDecision(req.id, req.status)}
                                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                                >
                                  {lang === 'km' ? 'ប្តូរស្ថានភាព' : 'Change Decision'}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. In-Browser Official Timesheet & Roster Print Modal */}
      {/* ========================================================================= */}
      {showPrintModal && (
        <div className="print-modal-overlay fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          {/* Print CSS Stylesheet: Guarantees proper pagination, no clipped 92vh height, no duplicate pages */}
          <style>{`
            @media print {
              @page {
                size: A4 landscape;
                margin: 6mm 6mm;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                color: black !important;
                overflow: visible !important;
                height: auto !important;
                min-height: 100% !important;
              }
              body * {
                visibility: hidden;
              }
              .print-modal-overlay,
              .print-modal-overlay * {
                visibility: visible !important;
              }
              .print-modal-overlay {
                position: static !important;
                inset: auto !important;
                width: 100% !important;
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
                display: block !important;
                backdrop-filter: none !important;
              }
              .print-modal-card {
                position: static !important;
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                display: block !important;
              }
              #printable-timesheet-area {
                position: static !important;
                width: 100% !important;
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
                margin: 0 !important;
                padding: 0 !important;
                display: block !important;
              }
              .no-print {
                display: none !important;
              }
              .print-staff-sheet {
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                display: block !important;
                width: 100% !important;
                margin-bottom: 0 !important;
                padding-bottom: 0 !important;
              }
              .print-staff-sheet:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
              table {
                border-collapse: collapse !important;
                width: 100% !important;
              }
              thead {
                display: table-header-group !important;
              }
              tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          `}</style>

          <div className="print-modal-card bg-white rounded-3xl max-w-7xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header & Interactive Filter Bar (Hidden when printed) */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-200">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm sm:text-base font-battambang">
                    {lang === 'km' ? 'ព្រីនសន្លឹកម៉ោង & Roster ផ្លូវការ (Official Timesheet Print)' : 'Official Timesheet & Roster Print Preview'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {lang === 'km'
                      ? 'ជ្រើសរើសសាខា បុគ្គលិក ផ្នែក និងព្រីនទម្រង់ពេញទំព័រ A4 Landscape ស្តង់ដារ'
                      : 'Full-page A4 landscape print for all staff or filtered by branch, department, and staff member.'}
                  </p>
                </div>
              </div>

              {/* Print Modal Filter Bar */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Branch Filter Dropdown in Print Modal */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-xs">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-[11px] font-bold text-slate-600">{lang === 'km' ? 'សាខា:' : 'Branch:'}</span>
                  <select
                    value={printBranchFilter}
                    onChange={(e) => {
                      setPrintBranchFilter(e.target.value);
                      setPrintStaffFilter('all');
                    }}
                    className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none max-w-[130px] cursor-pointer"
                  >
                    <option value="all">{lang === 'km' ? '🏢 គ្រប់សាខាទាំងអស់' : '🏢 All Branches'}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Staff Filter Dropdown */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-xs">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-[11px] font-bold text-slate-600">{lang === 'km' ? 'បុគ្គលិក:' : 'Staff:'}</span>
                  <select
                    value={printStaffFilter}
                    onChange={(e) => setPrintStaffFilter(e.target.value)}
                    className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none max-w-[160px] cursor-pointer"
                  >
                    <option value="all">
                      {lang === 'km' 
                        ? `👥 បុគ្គលិកទាំងអស់ (${availablePrintEmployees.length} នាក់)` 
                        : `👥 All Staff (${availablePrintEmployees.length} Staff)`}
                    </option>
                    {availablePrintEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.code} - {emp.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Department Filter Dropdown */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-xs">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-[11px] font-bold text-slate-600">{lang === 'km' ? 'ផ្នែក:' : 'Dept:'}</span>
                  <select
                    value={printDepartmentFilter}
                    onChange={(e) => setPrintDepartmentFilter(e.target.value)}
                    className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none max-w-[130px] cursor-pointer"
                  >
                    <option value="all">{lang === 'km' ? '🏢 គ្រប់ផ្នែកទាំងអស់' : '🏢 All Departments'}</option>
                    {departmentsList.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Month / Year Selector for Header */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-xs">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-[11px] font-bold text-slate-600">{lang === 'km' ? 'ខែ:' : 'Month:'}</span>
                  <input
                    type="month"
                    value={
                      printMonthYearCustom
                        ? printMonthYearCustom.includes('-')
                          ? printMonthYearCustom
                          : `${startDate.substring(0, 4)}-${startDate.substring(5, 7)}`
                        : `${startDate.substring(0, 4)}-${startDate.substring(5, 7)}`
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        setPrintMonthYearCustom(val);
                        const [yyyy, mm] = val.split('-');
                        const lastDay = new Date(parseInt(yyyy), parseInt(mm), 0).getDate();
                        setStartDate(`${yyyy}-${mm}-01`);
                        setEndDate(`${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`);
                      }
                    }}
                    className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                  />
                </div>

                {/* Preview Mode Selector */}
                <div className="flex items-center bg-slate-200 p-0.5 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPrintPreviewType('detailed')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      printPreviewType === 'detailed' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lang === 'km' ? 'តារាងលម្អិត Roster' : 'Daily Roster'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintPreviewType('merged')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      printPreviewType === 'merged' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lang === 'km' ? 'សរុបប្រចាំខែ' : 'Summary'}
                  </button>
                </div>

                {/* Print Modal Customizer Button */}
                <button
                  type="button"
                  onClick={() => {
                    setCustomizerTarget(printPreviewType === 'detailed' ? 'daily' : 'merged');
                    setShowCustomizerModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 border border-slate-200 shadow-2xs transition cursor-pointer"
                  title="Customize table columns, font size, and fonts"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{lang === 'km' ? 'កែតារាង (Customize)' : 'Customize'}</span>
                </button>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {/* Roster Excel Export */}
                  <button
                    type="button"
                    disabled={isExportingRosterXlsx}
                    onClick={() => handleDownloadRosterXlsx()}
                    className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-900/20 transition cursor-pointer disabled:opacity-60"
                    title="Export Roster to formatted Excel (.xlsx)"
                  >
                    <FileSpreadsheet className={`w-4 h-4 text-emerald-300 ${isExportingRosterXlsx ? 'animate-bounce' : ''}`} />
                    <span>
                      {isExportingRosterXlsx
                        ? (lang === 'km' ? 'កំពុងបង្កើត...' : 'Generating...')
                        : (lang === 'km' ? 'ទាញយក Excel' : 'Export Excel (.xlsx)')}
                    </span>
                  </button>

                  {/* Roster CSV Export */}
                  <button
                    type="button"
                    disabled={isExportingRosterCsv}
                    onClick={() => handleDownloadRosterCsv()}
                    className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-teal-900/20 transition cursor-pointer disabled:opacity-60"
                    title="Export Roster to CSV"
                  >
                    <Download className="w-4 h-4 text-teal-300" />
                    <span>
                      {lang === 'km' ? 'ទាញយក CSV' : 'Export CSV'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={isExportingModalPdf}
                    onClick={handlePrintDocument}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-200 transition cursor-pointer disabled:opacity-60"
                    title="Save A4 Landscape PDF"
                  >
                    <Printer className="w-4 h-4" />
                    <span>
                      {isExportingModalPdf
                        ? (lang === 'km' ? 'កំពុងបង្កើត...' : 'Generating...')
                        : (lang === 'km' ? 'រក្សាទុក PDF' : 'Save PDF')}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={isExportingModalPdf}
                    onClick={handleDownloadPdfFromModal}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-slate-300 transition cursor-pointer disabled:opacity-60"
                    title="Download official A4 landscape PDF"
                  >
                    <FileDown className="w-4 h-4 text-emerald-400" />
                    <span>
                      {isExportingModalPdf
                        ? (lang === 'km' ? 'កំពុងបង្កើត...' : 'Generating...')
                        : (lang === 'km' ? 'ទាញយក PDF' : 'Download PDF')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPrintFeedback(null);
                      setShowPrintModal(false);
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    title="Close Preview"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Notification / Feedback Banner (Hidden when printed) */}
            {printFeedback && (
              <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2.5 text-xs text-indigo-900 font-medium flex items-center justify-between no-print animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{printFeedback}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPrintFeedback(null)}
                  className="text-indigo-400 hover:text-indigo-700 cursor-pointer ml-3"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Printable Body Content (Targeted by #printable-timesheet-area) */}
            <div
              className="p-4 sm:p-6 overflow-x-auto overflow-y-auto space-y-8 text-slate-800 font-sans"
              id="printable-timesheet-area"
              style={{ fontFamily: "'Kantumruy Pro', 'Battambang', 'Noto Sans Khmer', sans-serif" }}
            >
              {/* If preview type is 'detailed' (Individual Full Month Roster per Staff) */}
              {printPreviewType === 'detailed' ? (
                printableStaffGroups.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-sm">
                      {lang === 'km' ? 'មិនមានទិន្នន័យបុគ្គលិកត្រូវតាមលក្ខខណ្ឌនេះទេ' : 'No staff attendance records match the selected filters.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-10">
                    {departmentStaffGroups.map((deptGroup, dIdx) => {
                      const deptLabel = deptGroup.department;
                      const monthYearLabel = formatMonthYearHeader(startDate);
                      const monthYearKhLabel = formatMonthYearKhHeader(startDate);

                      return (
                        <div key={`dept_group_${deptLabel}_${dIdx}`} className="space-y-8">
                          {deptGroup.staffList.map((group, gIdx) => {
                            const emp = group.employee;
                            const branchObj = branches.find((b) => b.id === emp.branchId);
                            const isLastSheet = dIdx === departmentStaffGroups.length - 1 && gIdx === deptGroup.staffList.length - 1;

                            return (
                              <div
                                key={`print_staff_${emp.id}`}
                                className={`print-staff-sheet min-w-[1300px] w-full space-y-2.5 pb-6 mb-8 border-b-2 border-dashed border-slate-300 last:border-b-0 last:mb-0 ${
                                  !isLastSheet ? 'page-break-after-staff' : ''
                                }`}
                                style={{ fontFamily: "'Kantumruy Pro', 'Battambang', 'Noto Sans Khmer', sans-serif" }}
                              >
                                {/* Header: Company Name, Month, Department */}
                                <div className="text-center pb-2.5 border-b-2 border-slate-900">
                                  <div className="text-[10px] uppercase tracking-widest font-black text-slate-500 mb-0.5">
                                    {branding ? (lang === 'km' ? branding.companyNameKh : branding.companyNameEn) : 'ENTERPRISE ATTENDANCE & HR SUITE'}
                                  </div>

                                  <h1 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight font-sans leading-tight">
                                    Employee Attendance for {monthYearLabel}
                                    <br />
                                    for {deptLabel}
                                  </h1>

                                  <p className="text-[10.5px] font-bold text-slate-600 mt-0.5 font-battambang leading-tight">
                                    របាយការណ៍វត្តមានបុគ្គលិក ប្រចាំខែ {monthYearKhLabel}
                                    <br />
                                    សម្រាប់ផ្នែក: {deptLabel}
                                  </p>

                                  {/* Employee Specific Sub-header Strip */}
                                  <div className="grid grid-cols-4 gap-2 text-xs text-left bg-slate-50 py-1.5 px-3 rounded-lg border border-slate-200 mt-2 font-medium">
                                    <div>
                                      <span className="text-slate-500">{lang === 'km' ? 'ឈ្មោះ:' : 'Name:'}</span>{' '}
                                      <b className="text-slate-900">{emp.nameEn} ({emp.nameKh})</b>
                                    </div>
                                    <div>
                                      <span className="text-slate-500">{lang === 'km' ? 'អត្តលេខ:' : 'Code:'}</span>{' '}
                                      <b className="text-indigo-700 font-mono">{emp.code}</b>
                                    </div>
                                    <div>
                                      <span className="text-slate-500">{lang === 'km' ? 'សាខា:' : 'Branch:'}</span>{' '}
                                      <b className="text-slate-900">{branchObj?.nameEn || emp.branchId}</b>
                                    </div>
                                    <div>
                                      <span className="text-slate-500">{lang === 'km' ? 'តួនាទី:' : 'Role:'}</span>{' '}
                                      <b className="text-slate-900">{emp.position || emp.role}</b>
                                    </div>
                                  </div>
                                </div>

                                {/* Detailed Table of Month Days scaled to full A4 landscape page */}
                                <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                                  {(() => {
                                    const printDailyCols = dailyTableSettings.applyToPrint
                                      ? DAILY_TIMESHEET_COLUMNS.filter((col) => dailyTableSettings.visibleColumns.includes(col.id))
                                      : DAILY_TIMESHEET_COLUMNS;

                                    return (
                                      <table
                                        className="w-full text-left leading-snug border-collapse"
                                        style={{
                                          fontFamily: dailyTableSettings.applyToPrint
                                            ? selectedDailyFont.familyCss
                                            : "'Kantumruy Pro', 'Battambang', 'Noto Sans Khmer', sans-serif",
                                          fontSize: dailyTableSettings.applyToPrint
                                            ? `${Math.max(8.5, dailyTableSettings.fontSizePx - 1.5)}px`
                                            : '10px',
                                        }}
                                      >
                                        <thead className="bg-slate-800 text-white font-bold uppercase text-[9px] tracking-wider">
                                          <tr className="border-b border-slate-800">
                                            {printDailyCols.map((c) => (
                                              <th
                                                key={c.id}
                                                className={`py-1.5 px-2 border-r border-slate-700 whitespace-nowrap ${
                                                  c.align === 'center' ? 'text-center' : 'text-left'
                                                }`}
                                              >
                                                {lang === 'km' ? c.labelKh : c.labelEn}
                                              </th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 font-sans leading-snug">
                                          {group.rows.map((r, rIdx) => {
                                            const isSun = r.isSunday;
                                            const isDayOff = r.isDayOff;
                                            const isLeave = r.isLeave;

                                            let rowBg = rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50';
                                            if (isSun) rowBg = 'bg-rose-50/70 text-rose-900 font-bold';
                                            else if (isDayOff) rowBg = 'bg-amber-50/70 text-amber-950 font-medium';
                                            else if (isLeave) rowBg = 'bg-purple-50/70 text-purple-950 font-medium';

                                            return (
                                              <tr key={`row_${emp.id}_${r.date}_${rIdx}`} className={rowBg}>
                                                {printDailyCols.map((c) => (
                                                  <td
                                                    key={c.id}
                                                    className={`py-1 px-2 border-r border-slate-200 whitespace-nowrap ${
                                                      c.align === 'center' ? 'text-center' : 'text-left'
                                                    }`}
                                                  >
                                                    {renderDailyCellContent(r, c.id)}
                                                  </td>
                                                ))}
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                        <tfoot className="bg-slate-100 text-slate-800 font-bold text-[9.5px] border-t-2 border-slate-300">
                                          <tr className="whitespace-nowrap">
                                            <td
                                              colSpan={Math.max(1, printDailyCols.length - 2)}
                                              className="py-1.5 px-3 text-right font-sans uppercase"
                                            >
                                              {lang === 'km' ? 'សរុបម៉ោងការងារប្រចាំខែ:' : 'Monthly Total Work Hours:'}
                                            </td>
                                            <td className="py-1.5 px-2 text-center text-indigo-700 font-bold font-mono text-[10.5px]">
                                              {group.summary.totalWorkHours}h
                                            </td>
                                            <td className="py-1.5 px-3 text-left text-slate-600 font-sans font-medium text-[9px]">
                                              Worked: {group.summary.daysWorked}d | Off: {group.summary.daysOff}d | Leave: {group.summary.daysLeave}d | Late: {group.summary.lateDays}d
                                            </td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    );
                                  })()}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                /* Merged Consolidated View with Required Header */
                printMergedSummaries.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-sm">
                      {lang === 'km' ? 'មិនមានទិន្នន័យបុគ្គលិកត្រូវតាមលក្ខខណ្ឌនេះទេ' : 'No staff attendance records match the selected filters.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Mandatory Header as explicitly requested */}
                    <div className="text-center pb-4 border-b-2 border-slate-900">
                      <div className="text-xs uppercase tracking-widest font-black text-slate-500 mb-1">
                        {branding ? (lang === 'km' ? branding.companyNameKh : branding.companyNameEn) : 'ENTERPRISE ATTENDANCE & HR SUITE'}
                      </div>

                      <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight font-sans">
                        Employee Attendance for {formatMonthYearHeader(startDate)}
                        <br />
                        for {printDepartmentFilter !== 'all' ? printDepartmentFilter : 'All Departments'}
                      </h1>

                      <p className="text-xs font-bold text-slate-600 mt-1 font-battambang">
                        របាយការណ៍វត្តមានបុគ្គលិក ប្រចាំខែ {formatMonthYearKhHeader(startDate)}
                        <br />
                        សម្រាប់ផ្នែក: {printDepartmentFilter !== 'all' ? printDepartmentFilter : 'គ្រប់ផ្នែកទាំងអស់'}
                      </p>

                      <div className="flex items-center justify-between text-xs text-slate-600 font-medium mt-3 pt-2 border-t border-slate-200">
                        <div><b>Branch:</b> {printBranchFilter === 'all' ? 'All Branches' : (branches.find(b => b.id === printBranchFilter)?.nameEn || printBranchFilter)}</div>
                        <div><b>Period:</b> {startDate} ~ {endDate}</div>
                        <div><b>Staff Count:</b> {printMergedSummaries.length} Staff</div>
                      </div>
                    </div>

                    {/* Consolidated Table scaled to full A4 page width with large readable fonts */}
                    <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-left text-[11px] leading-snug min-w-[1200px]">
                        <thead className="bg-slate-800 text-white font-bold uppercase text-[10px]">
                          <tr>
                            <th className="py-2 px-3 w-10 text-center border-r border-slate-700 whitespace-nowrap">No</th>
                            <th className="py-2 px-3 border-r border-slate-700 whitespace-nowrap">Employee Name</th>
                            <th className="py-2 px-3 border-r border-slate-700 whitespace-nowrap">Department</th>
                            <th className="py-2 px-3 border-r border-slate-700 whitespace-nowrap">Branch</th>
                            <th className="py-2 px-3 text-center border-r border-slate-700 whitespace-nowrap">Present Days</th>
                            <th className="py-2 px-3 text-center border-r border-slate-700 whitespace-nowrap">Days Off</th>
                            <th className="py-2 px-3 text-center border-r border-slate-700 whitespace-nowrap">Leave Days</th>
                            <th className="py-2 px-3 text-center border-r border-slate-700 whitespace-nowrap">Late Days</th>
                            <th className="py-2 px-3 text-center border-r border-slate-700 whitespace-nowrap">Work Hours</th>
                            <th className="py-2 px-3 text-center whitespace-nowrap">Attendance Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-sans text-[10.5px] leading-snug">
                          {printMergedSummaries.map((s, sIdx) => (
                            <tr key={`print_m_${s.employeeId}`} className={sIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                              <td className="py-1.5 px-3 text-center border-r border-slate-200 font-bold whitespace-nowrap">{sIdx + 1}</td>
                              <td className="py-1.5 px-3 font-sans font-bold border-r border-slate-200 whitespace-nowrap">{s.nameEn} ({s.nameKh})</td>
                              <td className="py-1.5 px-3 font-sans border-r border-slate-200 whitespace-nowrap">{s.department}</td>
                              <td className="py-1.5 px-3 font-sans border-r border-slate-200 whitespace-nowrap">{s.branchNameEn}</td>
                              <td className="py-1.5 px-3 text-center text-emerald-700 font-bold border-r border-slate-200 whitespace-nowrap">{s.daysPresent}</td>
                              <td className="py-1.5 px-3 text-center text-amber-700 font-bold border-r border-slate-200 whitespace-nowrap">{s.daysOff}</td>
                              <td className="py-1.5 px-3 text-center text-purple-700 font-bold border-r border-slate-200 whitespace-nowrap">{s.daysLeave}</td>
                              <td className="py-1.5 px-3 text-center border-r border-slate-200 whitespace-nowrap">{s.daysLate}</td>
                              <td className="py-1.5 px-3 text-center font-bold text-indigo-700 border-r border-slate-200 whitespace-nowrap">{s.totalWorkHours}h</td>
                              <td className="py-1.5 px-3 text-center font-bold text-slate-800 whitespace-nowrap">{s.attendanceRate}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. Leave Action Comment Dialog */}
      {actionLeave && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-black text-slate-800">
              {actionLeave.action === 'approved' ? '✅ អនុម័តច្បាប់ (Approve Request)' : '❌ បដិសេធពាក្យសុំ (Reject Request)'}
            </h3>
            <p className="text-xs text-slate-500">
              Staff: <b className="text-slate-700">{actionLeave.name}</b>
            </p>
            <textarea
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Enter optional comment or reason..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setActionLeave(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md ${
                  actionLeave.action === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirm {actionLeave.action === 'approved' ? 'Approval' : 'Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Report Table Customizer Dialog (Remove Columns, Font Size, Fonts, Column Widths, Styles) */}
      <ReportTableCustomizerModal
        isOpen={showCustomizerModal}
        onClose={() => setShowCustomizerModal(false)}
        settings={customizerTarget === 'daily' ? dailyTableSettings : mergedTableSettings}
        onSaveSettings={(newSettings) => {
          if (customizerTarget === 'daily') {
            handleUpdateDailySettings(newSettings);
          } else {
            handleUpdateMergedSettings(newSettings);
          }
        }}
        onResetSettings={() => {
          if (customizerTarget === 'daily') {
            handleResetDailySettings();
          } else {
            handleResetMergedSettings();
          }
        }}
        availableColumns={customizerTarget === 'daily' ? DAILY_TIMESHEET_COLUMNS : MERGED_SUMMARY_COLUMNS}
        lang={lang}
        tableTitle={
          customizerTarget === 'daily'
            ? (lang === 'km' ? 'តារាងវត្តមានប្រចាំថ្ងៃ (Daily Roster Matrix)' : 'Daily Chronological Timesheet Table')
            : (lang === 'km' ? 'តារាងសង្ខេបបូកសរុបបុគ្គលិក (Merged Summary Table)' : 'Merged Employee Summary Table')
        }
      />
    </div>
  );
};
