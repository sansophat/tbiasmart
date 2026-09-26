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
  exportMergedSummaryToCsv,
  exportMergedSummaryToPdf,
  TimesheetRow,
  EmployeeMergedSummary
} from '../utils/reportExportUtils';

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

  // Guarantees starting on the 1st of the month (e.g. 2026-09-01), never 30/31 of previous month!
  const getFirstDayOfMonth = (d: Date = new Date()): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  };

  // Date Range Filtering
  const todayStr = formatLocalDate(new Date());
  const firstDayOfMonth = getFirstDayOfMonth(new Date());

  const [startDate, setStartDate] = useState<string>(firstDayOfMonth);
  const [endDate, setEndDate] = useState<string>(todayStr);
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

  // Quick Date Preset Handler
  const handleApplyPreset = (preset: 'today' | 'yesterday' | 'this_week' | 'month' | 'last_30') => {
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
      setEndDate(todayStr);
    } else if (preset === 'last_30') {
      const past30 = new Date();
      past30.setDate(past30.getDate() - 30);
      setStartDate(formatLocalDate(past30));
      setEndDate(todayStr);
    }
  };

  // Generate Daily Timesheet Rows (Includes Sunday Rows)
  const timesheetRows = useMemo(() => {
    return generateDailyTimesheetRows(
      attendanceRecords,
      employees,
      branches,
      startDate,
      endDate,
      selectedBranchFilter,
      selectedEmployeeFilter
    );
  }, [attendanceRecords, employees, branches, startDate, endDate, selectedBranchFilter, selectedEmployeeFilter]);

  // Generate Merged Employee Summaries (Grouped by Employee)
  const mergedEmployeeSummaries = useMemo(() => {
    return generateEmployeeMergedSummaries(
      attendanceRecords,
      employees,
      branches,
      startDate,
      endDate,
      selectedBranchFilter,
      selectedEmployeeFilter
    );
  }, [attendanceRecords, employees, branches, startDate, endDate, selectedBranchFilter, selectedEmployeeFilter]);

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

  // Group daily timesheet rows by employee for individual roster printing
  const printableStaffGroups = useMemo(() => {
    let targetEmps = employees;
    if (selectedBranchFilter !== 'all') {
      targetEmps = targetEmps.filter((e) => e.branchId === selectedBranchFilter);
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
        emp.id
      ).filter((r) => !r.isSunday || r.employeeId === emp.id || r.employeeId === 'sunday_marker');

      const totalWork = empRows.reduce((acc, r) => acc + (parseFloat(r.durationHours) || 0), 0).toFixed(1);
      const daysWorked = empRows.filter((r) => !r.isSunday && r.timeIn !== '--:--').length;
      const lateDays = empRows.filter((r) => r.status.toLowerCase().includes('late')).length;
      const otDays = empRows.filter((r) => r.status.toLowerCase().includes('overtime')).length;

      return {
        employee: emp,
        rows: empRows,
        summary: {
          totalWorkHours: totalWork,
          daysWorked,
          lateDays,
          otDays,
        },
      };
    });
  }, [attendanceRecords, employees, branches, startDate, endDate, selectedBranchFilter, printStaffFilter, printDepartmentFilter]);

  // Selected Branch Name
  const currentBranchObj = branches.find((b) => b.id === selectedBranchFilter);
  const currentBranchTitle = selectedBranchFilter === 'all'
    ? 'All 7 Branches Combined'
    : (currentBranchObj ? (lang === 'km' ? currentBranchObj.nameKh : currentBranchObj.nameEn) : selectedBranchFilter);

  const selectedEmployeeObj = employees.find((e) => e.id === selectedEmployeeFilter || e.code === selectedEmployeeFilter);
  const employeeFilterLabel = selectedEmployeeObj ? ` • Staff: ${selectedEmployeeObj.nameEn} (${selectedEmployeeObj.code})` : '';

  const dateRangeLabel = `${startDate} to ${endDate}${employeeFilterLabel}`;

  // Export CSV Handler
  const handleDownloadCsv = () => {
    if (timesheetViewMode === 'merged') {
      exportMergedSummaryToCsv(filteredMergedSummaries, currentBranchTitle, dateRangeLabel);
    } else {
      exportTimesheetToCsv(filteredTimesheetRows, currentBranchTitle, dateRangeLabel);
    }
  };

  // Export PDF Handler
  const handleDownloadPdf = () => {
    const compName = branding ? (lang === 'km' ? branding.companyNameKh : branding.companyNameEn) : 'Enterprise Multi-Branch HR Suite';
    if (timesheetViewMode === 'merged') {
      exportMergedSummaryToPdf(filteredMergedSummaries, currentBranchTitle, dateRangeLabel, compName);
    } else {
      exportTimesheetToPdf(filteredTimesheetRows, currentBranchTitle, dateRangeLabel, compName);
    }
  };

  // Batch Export: Separate CSV & PDF for EACH individual branch
  const handleBatchExportAllBranches = (format: 'csv' | 'pdf', mode: 'merged' | 'detailed' = timesheetViewMode === 'merged' ? 'merged' : 'detailed') => {
    setIsExportingBatch(true);
    const compName = branding ? (lang === 'km' ? branding.companyNameKh : branding.companyNameEn) : 'Enterprise Multi-Branch HR Suite';

    setTimeout(() => {
      branches.forEach((b, index) => {
        setTimeout(() => {
          if (mode === 'merged') {
            const branchSummaries = generateEmployeeMergedSummaries(
              attendanceRecords,
              employees,
              branches,
              startDate,
              endDate,
              b.id,
              selectedEmployeeFilter
            );
            if (format === 'csv') {
              exportMergedSummaryToCsv(branchSummaries, b.nameEn, dateRangeLabel);
            } else {
              exportMergedSummaryToPdf(branchSummaries, b.nameEn, dateRangeLabel, compName);
            }
          } else {
            const branchRows = generateDailyTimesheetRows(
              attendanceRecords,
              employees,
              branches,
              startDate,
              endDate,
              b.id,
              selectedEmployeeFilter
            );
            if (format === 'csv') {
              exportTimesheetToCsv(branchRows, b.nameEn, dateRangeLabel);
            } else {
              exportTimesheetToPdf(branchRows, b.nameEn, dateRangeLabel, compName);
            }
          }
        }, index * 400);
      });
      setTimeout(() => {
        setIsExportingBatch(false);
      }, branches.length * 400 + 500);
    }, 200);
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
          {/* CSV Download Button */}
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-200 transition cursor-pointer"
            title={`Download CSV (${timesheetViewMode === 'merged' ? 'Merged Summary' : 'Detailed Timesheet'})`}
          >
            <Download className="w-4 h-4" />
            <span>
              {timesheetViewMode === 'merged'
                ? (lang === 'km' ? 'ទាញយក CSV (សង្ខេបផ្ដុំ)' : 'Export Merged CSV')
                : (lang === 'km' ? 'ទាញយក CSV (លម្អិត)' : 'Export Detailed CSV')}
            </span>
          </button>

          {/* PDF Download Button */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition cursor-pointer"
            title={`Download PDF (${timesheetViewMode === 'merged' ? 'Merged Summary' : 'Detailed Timesheet'})`}
          >
            <FileDown className="w-4 h-4" />
            <span>
              {timesheetViewMode === 'merged'
                ? (lang === 'km' ? 'ទាញយក PDF (សង្ខេបផ្ដុំ)' : 'Export Merged PDF')
                : (lang === 'km' ? 'ទាញយក PDF (លម្អិត)' : 'Export Detailed PDF')}
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
                onClick={() => handleBatchExportAllBranches('pdf', 'merged')}
                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition flex items-center gap-2"
              >
                <FileDown className="w-4 h-4 text-indigo-600" />
                <span>Download 7 Merged PDFs (1/branch)</span>
              </button>
              <button
                type="button"
                onClick={() => handleBatchExportAllBranches('csv', 'merged')}
                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Download 7 Merged CSVs (1/branch)</span>
              </button>

              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pt-2">
                Daily Detailed Timesheet
              </div>
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
                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Download 7 Detailed CSVs</span>
              </button>
            </div>
          </div>

          {/* Official Timesheet & Roster Print Button */}
          <button
            type="button"
            onClick={() => {
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
                selectedPreset === 'today' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lang === 'km' ? 'ថ្ងៃនេះ' : 'Today'}
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('yesterday')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedPreset === 'yesterday' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lang === 'km' ? 'ម្សិលមិញ' : 'Yesterday'}
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('this_week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedPreset === 'this_week' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lang === 'km' ? 'សប្តាហ៍នេះ' : 'This Week'}
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedPreset === 'month' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lang === 'km' ? 'ខែនេះ (Full Month)' : 'This Month'}
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('last_30')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedPreset === 'last_30' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lang === 'km' ? '៣០ ថ្ងៃ' : 'Last 30 Days'}
            </button>
          </div>
        </div>

        {/* Bottom Filter Controls: Custom Start/End Date Pickers + Search Box */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-3">
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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3">
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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
          </div>

          {/* ========================================================== */}
          {/* MODE A: MERGED BY EMPLOYEE (CONSOLIDATED SUMMARY TABLE) */}
          {/* ========================================================== */}
          {timesheetViewMode === 'merged' && (
            <div className="space-y-4">
              {filteredMergedSummaries.length === 0 ? (
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
                            <div className="relative">
                              <img
                                src={summary.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                                alt={summary.nameEn}
                                className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-sm"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                                }}
                              />
                              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-indigo-600 text-white font-mono text-[9px] font-bold rounded-md shadow-xs">
                                {summary.enrollId}
                              </span>
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
              )}
            </div>
          )}

          {/* ========================================================== */}
          {/* MODE B: DAILY CHRONOLOGICAL TIMESHEET MATRIX */}
          {/* ========================================================== */}
          {timesheetViewMode === 'daily' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-slate-500 font-medium">
                  {lang === 'km' ? 'តារាងវត្តមានប្រចាំថ្ងៃពេញលេញ រួមមានកាលបរិច្ឆេទ ថ្ងៃនៃសប្តាហ៍ អត្តលេខបុគ្គលិក ម៉ោងការងារ និង OT' : 'Complete daily roster matrix including Date, Day of Week, Staff ID, Work & OT hours.'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPrintPreviewType('detailed');
                    setShowPrintModal(true);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition border border-indigo-200 cursor-pointer"
                  title="Print Official Timesheet & Roster"
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{lang === 'km' ? 'ព្រីន Roster នេះ (Print)' : 'Print This Roster'}</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <th className="py-3 px-3 w-10 text-center">No</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Day of Week</th>
                      <th className="py-3 px-3">Staff ID</th>
                      <th className="py-3 px-4">Employee Name</th>
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3">Branch</th>
                      <th className="py-3 px-2.5 text-center">Time In</th>
                      <th className="py-3 px-2.5 text-center">Time Out</th>
                      <th className="py-3 px-2.5 text-center">Work Hrs</th>
                      <th className="py-3 px-2.5 text-center">OT Hrs</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4">Remark & GPS Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {filteredTimesheetRows.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="py-12 text-center text-slate-400 font-sans">
                          <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                          <p className="font-bold">{lang === 'km' ? 'មិនមានទិន្នន័យក្នុងកាលបរិច្ឆេទនេះទេ' : 'No timesheet records found for this date range'}</p>
                        </td>
                      </tr>
                    ) : (
                      filteredTimesheetRows.map((row) => {
                        const otHours = parseFloat(row.durationHours) > 9 ? (parseFloat(row.durationHours) - 9).toFixed(1) : '0.0';
                        if (row.isSunday) {
                          return (
                            <tr
                              key={`sunday_${row.no}_${row.date}`}
                              className="bg-rose-50/90 border-y border-rose-200 font-bold text-rose-900 transition hover:bg-rose-100/90"
                            >
                              <td className="py-2.5 px-3 text-center text-rose-700">{row.no}</td>
                              <td className="py-2.5 px-3 font-black text-rose-900">{row.date}</td>
                              <td className="py-2.5 px-3 font-sans font-bold text-rose-700 uppercase">{row.dayOfWeek}</td>
                              <td className="py-2.5 px-3 text-rose-500">---</td>
                              <td className="py-2.5 px-4 font-sans">
                                <div className="flex items-center space-x-2">
                                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                                  <span className="font-black text-rose-800">
                                    {lang === 'km' ? row.nameKh : row.nameEn}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-sans text-rose-500">---</td>
                              <td className="py-2.5 px-3 font-sans text-rose-700">{row.branchNameEn}</td>
                              <td className="py-2.5 px-2.5 text-center text-rose-400">--:--</td>
                              <td className="py-2.5 px-2.5 text-center text-rose-400">--:--</td>
                              <td className="py-2.5 px-2.5 text-center text-rose-400">0.0h</td>
                              <td className="py-2.5 px-2.5 text-center text-rose-400">0.0h</td>
                              <td className="py-2.5 px-3 font-sans">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-200/80 text-rose-800 border border-rose-300">
                                  SUNDAY REST
                                </span>
                              </td>
                              <td className="py-2.5 px-4 font-sans text-[11px] text-rose-700 font-semibold italic">
                                {row.remark}
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={`row_${row.no}_${row.employeeId}_${row.date}`} className="hover:bg-slate-50/90 transition">
                            <td className="py-2.5 px-3 text-center text-slate-500 font-bold">{row.no}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-800">{row.date}</td>
                            <td className="py-2.5 px-3 font-sans font-medium text-slate-600">{row.dayOfWeek}</td>
                            <td className="py-2.5 px-3">
                              <span className="text-xs font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {row.enrollId}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-sans">
                              <div className="flex items-center space-x-2">
                                {row.avatar && (
                                  <img
                                    src={row.avatar}
                                    alt={row.nameEn}
                                    className="w-7 h-7 rounded-lg object-cover border border-slate-200 shrink-0"
                                    onError={(e) => {
                                      e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                                    }}
                                  />
                                )}
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-800 text-xs truncate">
                                    {lang === 'km' ? row.nameKh : row.nameEn}
                                  </div>
                                  <div className="text-[10px] text-slate-500 truncate">
                                    {row.role}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-sans text-xs text-slate-700">{row.department}</td>
                            <td className="py-2.5 px-3 font-sans text-xs text-slate-600">{row.branchNameEn}</td>
                            <td className="py-2.5 px-2.5 text-center font-bold">
                              <span className={row.timeIn !== '--:--' ? 'text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200' : 'text-slate-400'}>
                                {row.timeIn}
                              </span>
                            </td>
                            <td className="py-2.5 px-2.5 text-center font-bold">
                              <span className={row.timeOut !== '--:--' ? 'text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200' : 'text-slate-400'}>
                                {row.timeOut}
                              </span>
                            </td>
                            <td className="py-2.5 px-2.5 text-center font-bold text-slate-700">
                              {row.durationHours}
                            </td>
                            <td className="py-2.5 px-2.5 text-center font-bold text-purple-700">
                              {otHours !== '0.0' ? `${otHours}h` : '0.0h'}
                            </td>
                            <td className="py-2.5 px-3 font-sans">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                row.status.toLowerCase().includes('on-time')
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : row.status.toLowerCase().includes('late')
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : row.status.toLowerCase().includes('overtime')
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {row.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-sans text-xs text-slate-600">
                              {row.remark}
                            </td>
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
                  filteredRawRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center space-x-3">
                          <img
                            src={rec.employeeAvatar}
                            alt={rec.employeeNameEn}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-sm"
                            onError={(e) => {
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
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
                  ))
                )}
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
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                                {emp?.avatar ? (
                                  <img src={emp.avatar} alt="avatar" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  (req.employeeNameEn || 'S').charAt(0)
                                )}
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
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          {/* Print CSS Stylesheet */}
          <style>{`
            @media print {
              @page {
                size: A4 landscape;
                margin: 8mm;
              }
              body * {
                visibility: hidden !important;
              }
              #printable-timesheet-area, #printable-timesheet-area * {
                visibility: visible !important;
              }
              #printable-timesheet-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                color: black !important;
              }
              .no-print {
                display: none !important;
              }
              .page-break-after-staff {
                page-break-after: always !important;
                break-after: page !important;
              }
            }
          `}</style>

          <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
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
                      ? 'កំណត់តម្រងតាមបុគ្គលិក ផ្នែក និងព្រីនទម្រង់ស្តង់ដារជាមួយ Header & ហត្ថលេខា'
                      : 'Print for all staff or filter by staff with Date, Day of week, Staff ID and department header.'}
                  </p>
                </div>
              </div>

              {/* Print Modal Filter Bar */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Staff Filter Dropdown */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-[11px] font-bold text-slate-600">{lang === 'km' ? 'បុគ្គលិក:' : 'Staff:'}</span>
                  <select
                    value={printStaffFilter}
                    onChange={(e) => setPrintStaffFilter(e.target.value)}
                    className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none max-w-[170px]"
                  >
                    <option value="all">{lang === 'km' ? `👥 បុគ្គលិកទាំងអស់ (${employees.length} នាក់)` : `👥 All Staff (${employees.length} Staff)`}</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.code} - {emp.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Department Filter Dropdown */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-[11px] font-bold text-slate-600">{lang === 'km' ? 'ផ្នែក:' : 'Dept:'}</span>
                  <select
                    value={printDepartmentFilter}
                    onChange={(e) => setPrintDepartmentFilter(e.target.value)}
                    className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none max-w-[150px]"
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
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-[11px] font-bold text-slate-600">{lang === 'km' ? 'ខែ/ឆ្នាំ:' : 'Month:'}</span>
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

                {/* Action Buttons */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-200 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{lang === 'km' ? 'ព្រីនឯកសារ (Print)' : 'Print Document'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                  title="Close Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Body Content (Targeted by #printable-timesheet-area) */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-8 text-slate-800 font-sans" id="printable-timesheet-area">
              {/* If preview type is 'detailed' and printing all staff grouped */}
              {printPreviewType === 'detailed' ? (
                <div className="space-y-10">
                  {printableStaffGroups.map((group, gIdx) => {
                    const emp = group.employee;
                    const deptLabel = emp.department || (printDepartmentFilter !== 'all' ? printDepartmentFilter : 'Operations');
                    const monthYearLabel = formatMonthYearHeader(startDate);
                    const monthYearKhLabel = formatMonthYearKhHeader(startDate);
                    const branchObj = branches.find((b) => b.id === emp.branchId);

                    return (
                      <div
                        key={`print_staff_${emp.id}`}
                        className={`space-y-4 ${
                          gIdx < printableStaffGroups.length - 1 ? 'page-break-after-staff pb-8 border-b border-dashed border-slate-300' : ''
                        }`}
                      >
                        {/* Mandatory Header as explicitly requested:
                            Employee Attendance for [mm/yyyy] <br> for [department] */}
                        <div className="text-center pb-4 border-b-2 border-slate-900">
                          <div className="text-xs uppercase tracking-widest font-black text-slate-500 mb-1">
                            {branding ? (lang === 'km' ? branding.companyNameKh : branding.companyNameEn) : 'ENTERPRISE ATTENDANCE & HR SUITE'}
                          </div>

                          <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight font-sans">
                            Employee Attendance for {monthYearLabel}
                            <br />
                            for {deptLabel}
                          </h1>

                          <p className="text-xs font-bold text-slate-600 mt-1 font-battambang">
                            របាយការណ៍វត្តមានបុគ្គលិក ប្រចាំខែ {monthYearKhLabel}
                            <br />
                            សម្រាប់ផ្នែក: {deptLabel}
                          </p>

                          {/* Employee Specific Sub-header Strip */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-left bg-slate-50 p-2.5 rounded-xl border border-slate-200 mt-3 font-medium">
                            <div>
                              <span className="text-slate-500">{lang === 'km' ? 'អត្តលេខ:' : 'Staff ID:'}</span>{' '}
                              <b className="font-mono text-slate-900">{emp.code}</b>
                            </div>
                            <div>
                              <span className="text-slate-500">{lang === 'km' ? 'ឈ្មោះបុគ្គលិក:' : 'Name:'}</span>{' '}
                              <b className="text-slate-900">{emp.nameEn} ({emp.nameKh})</b>
                            </div>
                            <div>
                              <span className="text-slate-500">{lang === 'km' ? 'សាខា:' : 'Branch:'}</span>{' '}
                              <b className="text-slate-900">{branchObj?.nameEn || emp.branchId}</b>
                            </div>
                            <div>
                              <span className="text-slate-500">{lang === 'km' ? 'មុខតំណែង:' : 'Role:'}</span>{' '}
                              <b className="text-slate-900">{emp.position || emp.role}</b>
                            </div>
                          </div>
                        </div>

                        {/* Detailed Table with all requested columns:
                            Date, Day of week, Staff ID, No, Name, Dept, Branch, Time In, Time Out, Work Hours, OT Hours, Status, Remark, Signature */}
                        <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                          <table className="w-full text-left text-[11px] border-collapse">
                            <thead className="bg-slate-800 text-white font-bold uppercase text-[9px] tracking-wider">
                              <tr className="border-b border-slate-800">
                                <th className="p-2 w-8 text-center border-r border-slate-700">No</th>
                                <th className="p-2 border-r border-slate-700">Date</th>
                                <th className="p-2 border-r border-slate-700">Day of Week</th>
                                <th className="p-2 border-r border-slate-700">Staff ID</th>
                                <th className="p-2 border-r border-slate-700">Employee Name</th>
                                <th className="p-2 border-r border-slate-700">Department</th>
                                <th className="p-2 border-r border-slate-700">Branch</th>
                                <th className="p-2 text-center border-r border-slate-700">Time In</th>
                                <th className="p-2 text-center border-r border-slate-700">Time Out</th>
                                <th className="p-2 text-center border-r border-slate-700">Work Hours</th>
                                <th className="p-2 text-center border-r border-slate-700">OT Hours</th>
                                <th className="p-2 border-r border-slate-700">Status</th>
                                <th className="p-2 border-r border-slate-700">Remark / Verification</th>
                                <th className="p-2 w-20 text-center">Signature</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 font-mono text-[10px]">
                              {group.rows.map((r, rIdx) => {
                                const isSun = r.isSunday;
                                return (
                                  <tr
                                    key={`row_${emp.id}_${r.date}_${rIdx}`}
                                    className={isSun ? 'bg-rose-50/70 text-rose-900 font-bold' : rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                                  >
                                    <td className="p-1.5 text-center border-r border-slate-200">{rIdx + 1}</td>
                                    <td className="p-1.5 font-bold border-r border-slate-200">{r.date}</td>
                                    <td className="p-1.5 border-r border-slate-200 font-sans font-medium">{r.dayOfWeek}</td>
                                    <td className="p-1.5 font-bold border-r border-slate-200">{emp.code}</td>
                                    <td className="p-1.5 font-sans font-semibold border-r border-slate-200">{emp.nameEn}</td>
                                    <td className="p-1.5 font-sans border-r border-slate-200">{emp.department || 'Operations'}</td>
                                    <td className="p-1.5 font-sans border-r border-slate-200">{r.branchNameEn}</td>
                                    <td className="p-1.5 text-center font-bold text-slate-800 border-r border-slate-200">{r.timeIn}</td>
                                    <td className="p-1.5 text-center font-bold text-slate-800 border-r border-slate-200">{r.timeOut}</td>
                                    <td className="p-1.5 text-center font-bold text-indigo-700 border-r border-slate-200">{r.durationHours}</td>
                                    <td className="p-1.5 text-center text-purple-700 font-bold border-r border-slate-200">
                                      {parseFloat(r.durationHours) > 9 ? `${(parseFloat(r.durationHours) - 9).toFixed(1)}h` : '0.0h'}
                                    </td>
                                    <td className="p-1.5 font-sans border-r border-slate-200">
                                      <span className={isSun ? 'text-rose-700 font-bold' : r.status.toLowerCase().includes('late') ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                                        {r.status}
                                      </span>
                                    </td>
                                    <td className="p-1.5 font-sans text-slate-500 border-r border-slate-200 text-[9px]">{r.remark}</td>
                                    <td className="p-1.5 text-center border-slate-200">
                                      <div className="w-16 h-4 border-b border-dotted border-slate-400 mx-auto" />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot className="bg-slate-100 text-slate-800 font-bold text-[10px] border-t-2 border-slate-300">
                              <tr>
                                <td colSpan={9} className="p-2 text-right font-sans uppercase">
                                  {lang === 'km' ? 'សរុបម៉ោងការងារប្រចាំខែ:' : 'Monthly Total Work Hours:'}
                                </td>
                                <td className="p-2 text-center text-indigo-700 font-bold font-mono">
                                  {group.summary.totalWorkHours}h
                                </td>
                                <td className="p-2 text-center text-purple-700 font-bold font-mono">
                                  {group.summary.otDays > 0 ? `${group.summary.otDays} OT Days` : '0.0h'}
                                </td>
                                <td colSpan={3} className="p-2 text-left text-slate-600 font-sans font-medium text-[9px]">
                                  Days Present: {group.summary.daysWorked} | Late: {group.summary.lateDays}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        {/* Sign-off Blocks for Employee Timesheet */}
                        <div className="pt-6 grid grid-cols-3 gap-6 text-center text-xs text-slate-600 font-medium">
                          <div className="space-y-8">
                            <p className="font-bold text-slate-800">Prepared By (HR Officer)</p>
                            <div className="border-t border-slate-400 pt-1 text-[11px] text-slate-500">Signature & Date</div>
                          </div>
                          <div className="space-y-8">
                            <p className="font-bold text-slate-800">Verified By (Employee / Manager)</p>
                            <div className="border-t border-slate-400 pt-1 text-[11px] text-slate-500">Staff Signature & Date</div>
                          </div>
                          <div className="space-y-8">
                            <p className="font-bold text-slate-800">Approved By (Director)</p>
                            <div className="border-t border-slate-400 pt-1 text-[11px] text-slate-500">Authorized Signature & Seal</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Merged Consolidated View with Required Header */
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
                      <div><b>Branch:</b> {currentBranchTitle}</div>
                      <div><b>Period:</b> {startDate} ~ {endDate}</div>
                      <div><b>Staff Count:</b> {filteredMergedSummaries.length} Staff</div>
                    </div>
                  </div>

                  {/* Consolidated Table */}
                  <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-800 text-white font-bold uppercase text-[9px]">
                        <tr>
                          <th className="p-2 w-8 text-center border-r border-slate-700">No</th>
                          <th className="p-2 border-r border-slate-700">Staff ID</th>
                          <th className="p-2 border-r border-slate-700">Employee Name</th>
                          <th className="p-2 border-r border-slate-700">Department</th>
                          <th className="p-2 border-r border-slate-700">Branch</th>
                          <th className="p-2 text-center border-r border-slate-700">Present Days</th>
                          <th className="p-2 text-center border-r border-slate-700">Late Days</th>
                          <th className="p-2 text-center border-r border-slate-700">Work Hours</th>
                          <th className="p-2 text-center border-r border-slate-700">OT Hours</th>
                          <th className="p-2 text-center border-r border-slate-700">Attendance Rate</th>
                          <th className="p-2 w-24 text-center">Signature</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-mono text-[10px]">
                        {filteredMergedSummaries.map((s, sIdx) => (
                          <tr key={`print_m_${s.employeeId}`} className={sIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="p-2 text-center border-r border-slate-200">{sIdx + 1}</td>
                            <td className="p-2 font-bold border-r border-slate-200">{s.enrollId}</td>
                            <td className="p-2 font-sans font-bold border-r border-slate-200">{s.nameEn} ({s.nameKh})</td>
                            <td className="p-2 font-sans border-r border-slate-200">{s.department}</td>
                            <td className="p-2 font-sans border-r border-slate-200">{s.branchNameEn}</td>
                            <td className="p-2 text-center text-emerald-700 font-bold border-r border-slate-200">{s.daysPresent}</td>
                            <td className="p-2 text-center border-r border-slate-200">{s.daysLate}</td>
                            <td className="p-2 text-center font-bold text-indigo-700 border-r border-slate-200">{s.totalWorkHours}h</td>
                            <td className="p-2 text-center text-purple-700 border-r border-slate-200">{s.totalOtHours}h</td>
                            <td className="p-2 text-center font-bold border-r border-slate-200">{s.attendanceRate}%</td>
                            <td className="p-2 text-center">
                              <div className="w-16 h-4 border-b border-dotted border-slate-400 mx-auto" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Sign-off Blocks */}
                  <div className="pt-6 grid grid-cols-3 gap-6 text-center text-xs text-slate-600 font-medium">
                    <div className="space-y-8">
                      <p className="font-bold text-slate-800">Prepared By (HR Officer)</p>
                      <div className="border-t border-slate-400 pt-1 text-[11px] text-slate-500">Signature & Date</div>
                    </div>
                    <div className="space-y-8">
                      <p className="font-bold text-slate-800">Checked By (Branch Manager)</p>
                      <div className="border-t border-slate-400 pt-1 text-[11px] text-slate-500">Signature & Date</div>
                    </div>
                    <div className="space-y-8">
                      <p className="font-bold text-slate-800">Approved By (Managing Director)</p>
                      <div className="border-t border-slate-400 pt-1 text-[11px] text-slate-500">Signature & Seal</div>
                    </div>
                  </div>
                </div>
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
    </div>
  );
};
