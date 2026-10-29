import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserCheck, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Sparkles, 
  Warehouse, 
  Coffee, 
  Building2, 
  ArrowUpRight, 
  ChevronRight,
  TrendingUp,
  MapPin,
  CheckCircle2,
  Calendar,
  Flame,
  QrCode,
  Radio,
  ArrowRightLeft,
  Phone,
  Search,
  FileSpreadsheet,
  AlertCircle,
  X,
  Lock,
  User,
  HeartPulse,
  RefreshCw,
  Check,
  Zap,
  Bell,
  ShieldAlert,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { Branch, Employee, AttendanceRecord, BranchTransferRecord, AuthUser, Language, LeaveRequest, Shift } from '../types';
import { INITIAL_SHIFTS } from '../data/initialData';
import { formatDistance, toKhmerNumeral } from '../utils/geoUtils';
import { isSameLocalDate } from '../utils/dateUtils';
import { doesRecordMatchEmployee } from '../utils/attendanceSyncManager';
import {
  getEmployeeDayOffName,
  getEmployeeWorkingHours,
  getShiftCategoryBadge,
  isEmployeeDayOff,
} from '../utils/dayOffUtils';
import {
  resolveEmployeeShift,
  isRecordOnTime,
  isRecordLate,
} from '../utils/rosterUtils';
import { DashboardLeaveApprovals } from './DashboardLeaveApprovals';
import { RealtimeActionAlertCenter, ActionAlertItem } from './RealtimeActionAlertCenter';

interface DashboardViewProps {
  branches: Branch[];
  employees: Employee[];
  shifts?: Shift[];
  attendanceRecords: AttendanceRecord[];
  transferRecords?: BranchTransferRecord[];
  leaveRequests?: LeaveRequest[];
  onUpdateLeaveStatus?: (requestId: string, newStatus: 'approved' | 'rejected', comment?: string) => void;
  onDeleteLeaveRequest?: (requestId: string) => void;
  onClearLeaveRequests?: (scope: 'processed' | 'all') => void;
  actionAlerts?: ActionAlertItem[];
  onClearAlerts?: () => void;
  onDismissAlert?: (alertId: string) => void;
  onApproveLocationException?: (recordId: string, action: 'approve' | 'reject') => void;
  currentUser?: AuthUser | null;
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  onNavigateTab: (tab: string) => void;
  onOpenTransferModal?: (emp?: Employee) => void;
  onRingStaffReminder?: (targetEmp: Employee, reminderType: 'forgot_checkin' | 'forgot_checkout' | 'emergency_roll_call' | 'custom', customMsg?: string) => void;
  onRingBulkStaffReminders?: (targetEmps: Employee[], reminderType: 'forgot_checkin' | 'forgot_checkout' | 'emergency_roll_call') => void;
  onUpdateEmployee?: (emp: Employee) => void;
  onManualSync?: () => Promise<void> | void;
  isSyncing?: boolean;
  lang: Language;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  branches,
  employees,
  shifts = INITIAL_SHIFTS,
  attendanceRecords,
  transferRecords = [],
  leaveRequests = [],
  onUpdateLeaveStatus,
  onDeleteLeaveRequest,
  onClearLeaveRequests,
  actionAlerts = [],
  onClearAlerts,
  onDismissAlert,
  onApproveLocationException,
  onManualSync,
  isSyncing = false,
  currentUser,
  selectedBranchId,
  setSelectedBranchId,
  onNavigateTab,
  onOpenTransferModal,
  onRingStaffReminder,
  onRingBulkStaffReminders,
  onUpdateEmployee,
  lang,
}) => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isEmployee = currentUser?.role === 'employee';
  
  // Find current employee if logged in
  const currentEmp = employees.find(
    (e) => e.id === currentUser?.employeeId || e.code === currentUser?.employeeCode
  );
  const employeeAssignedBranch = branches.find(
    (b) => b.id === (currentUser?.branchId || currentEmp?.branchId)
  ) || branches[0];

  // Category filter state (all, club, warehouse, cafe, office)
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'club' | 'warehouse' | 'cafe' | 'office'>('all');
  
  // Emergency Roll Call Modal State
  const [showEmergencyRollCall, setShowEmergencyRollCall] = useState<boolean>(false);
  const [rollCallBranchId, setRollCallBranchId] = useState<string>('all');
  const [rollCallTab, setRollCallTab] = useState<'all' | 'on_site' | 'forgot_checkout' | 'missing_checkin' | 'checked_out' | 'day_off_leave'>('all');
  const [rollCallSearchQuery, setRollCallSearchQuery] = useState<string>('');

  // Filter records by selected branch if not 'all'
  const relevantRecords = selectedBranchId === 'all'
    ? attendanceRecords
    : attendanceRecords.filter((r) => {
        if (r.branchId === selectedBranchId) return true;
        const matchedEmp = employees.find((e) => doesRecordMatchEmployee(r, e));
        return matchedEmp?.branchId === selectedBranchId;
      });

  const relevantEmployees = selectedBranchId === 'all'
    ? employees
    : employees.filter((e) => e.branchId === selectedBranchId);

  // Calculate KPIs for Today (Timezone-safe)
  const todayRecords = relevantRecords.filter((r) => isSameLocalDate(r.timestamp, now));
  const checkInRecords = todayRecords.filter((r) => r.type === 'check_in');
  
  // Resilient count of present unique employees
  const presentEmployeesSet = new Set<string>();
  checkInRecords.forEach((r) => {
    const matched = employees.find((e) => doesRecordMatchEmployee(r, e));
    if (matched) presentEmployeesSet.add(matched.id);
    else if (r.employeeId) presentEmployeesSet.add(r.employeeId);
    else if (r.employeeCode) presentEmployeesSet.add(r.employeeCode);
  });
  const presentCount = presentEmployeesSet.size;
  const onTimeCount = checkInRecords.filter((r) => isRecordOnTime(r, employees, shifts, branches) || (r.status === 'on_time' && !isRecordLate(r, employees, shifts, branches))).length;
  const lateCount = checkInRecords.filter((r) => isRecordLate(r, employees, shifts, branches)).length;
  const overtimeCount = todayRecords.filter((r) => r.status === 'overtime').length;
  const pendingLocationExceptions = todayRecords.filter((r) => r.locationExceptionStatus === 'pending');

  // Real-Time Attendance Feed filter state
  const [feedFilter, setFeedFilter] = useState<'all' | 'morning' | 'afternoon' | 'checked_out' | 'no_checkout' | 'dayoff' | 'ot'>('all');

  // Staff Information Popup Modal state (triggered when clicking on staff images in Today's Real-Time Attendance Feed)
  const [selectedStaffInfoRecord, setSelectedStaffInfoRecord] = useState<AttendanceRecord | null>(null);

  // Real-Time Attendance Feed: ONLY show punches recorded TODAY
  const todayFeedRecords = relevantRecords
    .filter((r) => isSameLocalDate(r.timestamp, now))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Staff scheduled for weekly Day Off today
  const staffOnDayOffToday = relevantEmployees.filter((emp) => isEmployeeDayOff(emp, now));

  // Helper to compute Workshift, Day Off, OT, and paired Check-In / Check-Out details for any attendance record
  const getRecordShiftDayOffAndOt = (rec: AttendanceRecord) => {
    const matchedEmp = employees.find((e) => doesRecordMatchEmployee(rec, e));
    const empBranch = branches.find((b) => b.id === (matchedEmp?.branchId || rec.branchId));
    const empShift = resolveEmployeeShift(matchedEmp, shifts, empBranch, new Date(rec.timestamp));
    const shiftBadge = getShiftCategoryBadge(empShift?.id || matchedEmp?.shiftId, lang);
    const shiftHoursText = getEmployeeWorkingHours(
      matchedEmp || { shiftId: empShift?.id },
      empShift,
      lang
    );

    const dayOffName = matchedEmp
      ? getEmployeeDayOffName(matchedEmp, lang)
      : lang === 'km'
      ? 'ថ្ងៃអាទិត្យ'
      : 'Sunday';
    const isWorkingOnDayOff = matchedEmp ? isEmployeeDayOff(matchedEmp, rec.timestamp) : false;

    // Calculate OT from:
    // 1) Overtime leaveRequests for this employee on this date
    const empOtRequests = leaveRequests.filter((req) => {
      const isOtReq = req.category === 'overtime' || req.type === 'overtime';
      if (!isOtReq || req.status === 'rejected') return false;
      const matchesEmp =
        (matchedEmp && (req.employeeId === matchedEmp.id || req.employeeCode === matchedEmp.code)) ||
        (rec.employeeId && req.employeeId === rec.employeeId) ||
        (rec.employeeCode && req.employeeCode === rec.employeeCode);
      if (!matchesEmp) return false;
      return req.startDate === today || isSameLocalDate(req.createdAt, rec.timestamp);
    });

    const requestedOtHours = empOtRequests.reduce((sum, r) => sum + (Number(r.hours) || 0), 0);
    const approvedOtReq = empOtRequests.find((r) => r.status === 'approved');
    const pendingOtReq = empOtRequests.find((r) => r.status === 'pending');

    // 2) Find all punches today for this employee (sorted chronologically: earliest first)
    const empPunchesToday = todayRecords
      .filter((r) =>
        matchedEmp
          ? doesRecordMatchEmployee(r, matchedEmp)
          : (r.employeeId && r.employeeId === rec.employeeId) ||
            (r.employeeCode && rec.employeeCode && r.employeeCode.toLowerCase() === rec.employeeCode.toLowerCase())
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Smart pairing for Check-In and Check-Out:
    // - Explicit check_in (or if employee accidentally tapped check_out at 6 AM with no check_in, treat earliest morning punch as check_in)
    let firstCheckIn = empPunchesToday.find((r) => r.type === 'check_in');
    if (!firstCheckIn && empPunchesToday.length > 0) {
      const earliest = empPunchesToday[0];
      const earliestHour = new Date(earliest.timestamp).getHours();
      if (earliestHour < 11 || empPunchesToday.length >= 2) {
        firstCheckIn = earliest;
      }
    }

    // - Explicit check_out that occurred after firstCheckIn (or if employee tapped check_in twice with >1h gap, treat latest punch as check_out)
    let lastCheckOut = [...empPunchesToday]
      .reverse()
      .find((r) => r.type === 'check_out' && (!firstCheckIn || r.id !== firstCheckIn.id));

    if (!lastCheckOut && firstCheckIn && empPunchesToday.length >= 2) {
      const latestPunch = empPunchesToday[empPunchesToday.length - 1];
      const gapHours =
        (new Date(latestPunch.timestamp).getTime() - new Date(firstCheckIn.timestamp).getTime()) / (1000 * 60 * 60);
      if (latestPunch.id !== firstCheckIn.id && gapHours >= 1) {
        lastCheckOut = latestPunch;
      }
    }

    const hasCheckedInToday = Boolean(firstCheckIn);
    const hasCheckedOutToday = Boolean(lastCheckOut);

    const checkInTimeStr = firstCheckIn
      ? new Date(firstCheckIn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '--:--';
    const checkOutTimeStr = lastCheckOut
      ? new Date(lastCheckOut.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '--:--';

    // Determine if employee is on a morning-only shift
    const sId = String(matchedEmp?.shiftId || empShift?.id || '').toLowerCase();
    const isMorningWorker =
      (sId.includes('morning') || sId.includes('s1') || empShift?.shiftCategory === 'morning') &&
      !sId.includes('full') &&
      empShift?.shiftCategory !== 'full_time';

    // Determine if employee's shift has already ended today without checking out
    const endTimeStr =
      matchedEmp?.shiftEndTime ||
      matchedEmp?.customEndTime ||
      empShift?.endTime ||
      '17:30';
    const [endH, endM] = endTimeStr.split(':').map(Number);
    const scheduledEndDate = new Date(now);
    scheduledEndDate.setHours(isNaN(endH) ? 17 : endH, isNaN(endM) ? 30 : endM, 0, 0);

    const hoursSinceCheckIn = firstCheckIn
      ? (now.getTime() - new Date(firstCheckIn.timestamp).getTime()) / (1000 * 60 * 60)
      : 0;
    const scheduledDailyHours = matchedEmp?.scheduledDailyHours || empShift?.workHours || 8.5;

    // Shift only flags as past shift end when the clock has actually passed the scheduled end time (+15m grace buffer)
    // and employee has already worked for a reasonable duration. Never falsely alerts in the middle of a workday!
    const isPastShiftEnd =
      !hasCheckedOutToday &&
      hasCheckedInToday &&
      now.getTime() > scheduledEndDate.getTime() + 15 * 60 * 1000 &&
      hoursSinceCheckIn >= Math.min(scheduledDailyHours, 5);

    let workedHoursToday = 0;
    let calculatedOtHours = 0;

    if (firstCheckIn && lastCheckOut) {
      const diffMs = new Date(lastCheckOut.timestamp).getTime() - new Date(firstCheckIn.timestamp).getTime();
      workedHoursToday = Math.max(0, diffMs / (1000 * 60 * 60));
      if (workedHoursToday > scheduledDailyHours + 0.25) {
        calculatedOtHours = Number((workedHoursToday - scheduledDailyHours).toFixed(1));
      }
    } else if (firstCheckIn && !lastCheckOut) {
      const diffMs = now.getTime() - new Date(firstCheckIn.timestamp).getTime();
      workedHoursToday = Math.max(0, diffMs / (1000 * 60 * 60));
    }

    // Also check if check-out punch is after scheduled shift end time
    if (lastCheckOut && endTimeStr && calculatedOtHours === 0) {
      const punchDate = new Date(lastCheckOut.timestamp);
      const shiftEndDate = new Date(punchDate);
      shiftEndDate.setHours(endH || 0, endM || 0, 0, 0);
      const extraHours = (punchDate.getTime() - shiftEndDate.getTime()) / (1000 * 60 * 60);
      if (extraHours >= 0.25 && extraHours <= 12) {
        calculatedOtHours = Number(extraHours.toFixed(1));
      }
    }

    // If working on weekly Day Off, hours worked count as Day-Off OT
    if (isWorkingOnDayOff && calculatedOtHours === 0 && workedHoursToday > 0) {
      calculatedOtHours = Number(workedHoursToday.toFixed(1));
    }

    const totalOtHours = Math.max(requestedOtHours, calculatedOtHours);
    const hasOt = rec.status === 'overtime' || totalOtHours > 0 || isWorkingOnDayOff || empOtRequests.length > 0;

    let otDisplayLabel = '';
    if (totalOtHours > 0) {
      otDisplayLabel =
        lang === 'km'
          ? `ថែមម៉ោង (OT): +${totalOtHours}ម៉ោង`
          : `OT: +${totalOtHours}h`;
      if (approvedOtReq) {
        otDisplayLabel += lang === 'km' ? ' (អនុម័ត)' : ' (Approved)';
      } else if (pendingOtReq) {
        otDisplayLabel += lang === 'km' ? ' (រង់ចាំអនុម័ត)' : ' (Pending)';
      } else if (isWorkingOnDayOff) {
        otDisplayLabel += lang === 'km' ? ' (ថ្ងៃសម្រាក)' : ' (Day-Off)';
      }
    } else if (isWorkingOnDayOff) {
      otDisplayLabel =
        lang === 'km' ? 'ថែមម៉ោងថ្ងៃសម្រាក (Day-Off OT)' : 'Day-Off OT Active';
    } else if (rec.status === 'overtime') {
      otDisplayLabel =
        lang === 'km' ? 'ថែមម៉ោង (Overtime)' : 'Overtime (OT)';
    } else {
      otDisplayLabel =
        lang === 'km' ? 'ថែមម៉ោង (OT): 0ម៉ោង' : 'OT: 0h (Regular)';
    }

    return {
      matchedEmp,
      empShift,
      shiftBadge,
      shiftHoursText,
      dayOffName,
      isWorkingOnDayOff,
      hasOt,
      totalOtHours,
      otDisplayLabel,
      workedHoursToday: Number(workedHoursToday.toFixed(1)),
      empPunchesToday,
      firstCheckIn,
      lastCheckOut,
      hasCheckedInToday,
      hasCheckedOutToday,
      checkInTimeStr,
      checkOutTimeStr,
      isPastShiftEnd,
      isMorningWorker,
      endTimeStr,
    };
  };

  const enrichedFeedRecords = useMemo(() => {
    return todayFeedRecords.map((rec) => ({
      rec,
      meta: getRecordShiftDayOffAndOt(rec),
    }));
  }, [todayFeedRecords, employees, branches, shifts, leaveRequests, today, lang]);

  const filteredFeedItems = useMemo(() => {
    return enrichedFeedRecords.filter(({ rec, meta }) => {
      if (feedFilter === 'all') return true;
      const sId = String(meta.matchedEmp?.shiftId || meta.empShift?.id || '').toLowerCase();
      if (feedFilter === 'morning') return sId.includes('morning') || sId.includes('s1') || meta.isMorningWorker;
      if (feedFilter === 'afternoon') return sId.includes('afternoon') || sId.includes('s2') || (!meta.isMorningWorker && !sId.includes('office'));
      if (feedFilter === 'checked_out') return rec.type === 'check_out' || meta.hasCheckedOutToday;
      if (feedFilter === 'no_checkout') return meta.hasCheckedInToday && !meta.hasCheckedOutToday;
      if (feedFilter === 'dayoff') return meta.isWorkingOnDayOff;
      if (feedFilter === 'ot') return meta.hasOt;
      return true;
    });
  }, [enrichedFeedRecords, feedFilter]);

  const morningFeedCount = enrichedFeedRecords.filter(({ meta }) => {
    const sId = String(meta.matchedEmp?.shiftId || meta.empShift?.id || '').toLowerCase();
    return sId.includes('morning') || sId.includes('s1') || meta.isMorningWorker;
  }).length;
  const afternoonFeedCount = enrichedFeedRecords.filter(({ meta }) => {
    const sId = String(meta.matchedEmp?.shiftId || meta.empShift?.id || '').toLowerCase();
    return sId.includes('afternoon') || sId.includes('s2');
  }).length;
  const checkedOutFeedCount = enrichedFeedRecords.filter(({ rec, meta }) => rec.type === 'check_out' || meta.hasCheckedOutToday).length;
  const noCheckOutFeedCount = enrichedFeedRecords.filter(({ meta }) => meta.hasCheckedInToday && !meta.hasCheckedOutToday).length;
  const workingOnDayOffFeedCount = enrichedFeedRecords.filter(({ meta }) => meta.isWorkingOnDayOff).length;
  const otFeedCount = enrichedFeedRecords.filter(({ meta }) => meta.hasOt).length;
  
  const geofenceValidCount = todayRecords.filter((r) => r.isWithinGeofence).length;
  const gpsComplianceRate = todayRecords.length > 0
    ? Math.round((geofenceValidCount / todayRecords.length) * 100)
    : 100;

  // Filter branches by type
  const filteredBranches = branches.filter((b) => {
    if (selectedTypeFilter === 'all') return true;
    return b.type === selectedTypeFilter;
  });

  const getBranchIcon = (type: string) => {
    switch (type) {
      case 'club':
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      case 'warehouse':
        return <Warehouse className="w-4 h-4 text-amber-600" />;
      case 'cafe':
        return <Coffee className="w-4 h-4 text-emerald-600" />;
      case 'office':
      default:
        return <Building2 className="w-4 h-4 text-indigo-600" />;
    }
  };

  // Comprehensive Emergency Safety Roll Call Personnel Analysis
  const rollCallPersonnelList = useMemo(() => {
    return employees.map((emp) => {
      const branch = (branches && branches.find((b) => b.id === emp.branchId)) || branches[0] || { id: 'b1', nameKh: 'សាខា', nameEn: 'Branch' };
      const empShift = resolveEmployeeShift(emp, shifts, branch);
      const startTime = emp.shiftStartTime || empShift?.startTime || '08:00';
      const endTime = emp.shiftEndTime || empShift?.endTime || '17:30';
      const shiftHoursText = getEmployeeWorkingHours(emp, empShift, lang);
      const shiftBadge = getShiftCategoryBadge(empShift?.id || emp.shiftId || '', lang);
      const isDayOffToday = isEmployeeDayOff(emp, now);
      const dayOffName = getEmployeeDayOffName(emp, lang);

      const hasApprovedLeaveToday = leaveRequests.some(
        (l) =>
          (l.employeeId === emp.id || l.employeeCode === emp.code) &&
          l.status === 'approved' &&
          today >= l.startDate &&
          today <= l.endDate
      );

      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const shiftStartMinutes = (isNaN(startH) ? 8 : startH) * 60 + (isNaN(startM) ? 0 : startM);
      const shiftEndMinutes = (isNaN(endH) ? 17 : endH) * 60 + (isNaN(endM) ? 30 : endM);
      const isPastShiftStart = currentMinutes >= shiftStartMinutes;
      const isPastShiftEnd = currentMinutes >= shiftEndMinutes + 15;

      // Today's punches for this employee
      const empPunchesToday = attendanceRecords
        .filter((r) => doesRecordMatchEmployee(r, emp) && isSameLocalDate(r.timestamp, now))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      let firstCheckIn = empPunchesToday.find((r) => r.type === 'check_in');
      if (!firstCheckIn && empPunchesToday.length > 0) {
        if (new Date(empPunchesToday[0].timestamp).getHours() < 12 || empPunchesToday.length >= 2) {
          firstCheckIn = empPunchesToday[0];
        }
      }

      let lastCheckOut = [...empPunchesToday]
        .reverse()
        .find((r) => r.type === 'check_out' && (!firstCheckIn || r.id !== firstCheckIn.id));
      if (!lastCheckOut && firstCheckIn && empPunchesToday.length >= 2) {
        const candidate = empPunchesToday[empPunchesToday.length - 1];
        if (candidate.id !== firstCheckIn.id) {
          lastCheckOut = candidate;
        }
      }

      const hasCheckedInToday = Boolean(firstCheckIn);
      const hasCheckedOutToday = Boolean(lastCheckOut);

      // Accurate roll call status classification
      let rollCallStatus: 'on_site' | 'forgot_checkout' | 'missing_checkin' | 'checked_out' | 'day_off_leave';
      if (hasCheckedInToday && hasCheckedOutToday) {
        rollCallStatus = 'checked_out';
      } else if (hasCheckedInToday && !hasCheckedOutToday) {
        if (isPastShiftEnd) {
          rollCallStatus = 'forgot_checkout'; // Past scheduled shift end, hasn't checked out
        } else {
          rollCallStatus = 'on_site'; // Actively on duty within shift
        }
      } else if (isDayOffToday || hasApprovedLeaveToday) {
        rollCallStatus = 'day_off_leave';
      } else if (isPastShiftStart) {
        rollCallStatus = 'missing_checkin'; // Past shift start but haven't punched in
      } else {
        rollCallStatus = 'missing_checkin'; // Upcoming or not punched
      }

      // Elapsed time on site
      let elapsedTimeText = '';
      if (firstCheckIn) {
        const inTime = new Date(firstCheckIn.timestamp).getTime();
        const outTime = lastCheckOut ? new Date(lastCheckOut.timestamp).getTime() : now.getTime();
        const diffMs = Math.max(0, outTime - inTime);
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        elapsedTimeText = `${diffHrs}h ${diffMins}m`;
      }

      const checkInTimeStr = firstCheckIn
        ? new Date(firstCheckIn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '--:--';
      const checkOutTimeStr = lastCheckOut
        ? new Date(lastCheckOut.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '--:--';

      const latestRecord = empPunchesToday[empPunchesToday.length - 1] || null;

      return {
        employee: emp,
        branch,
        empShift,
        shiftHoursText,
        shiftBadge,
        isDayOffToday,
        dayOffName,
        hasApprovedLeaveToday,
        firstCheckIn,
        lastCheckOut,
        hasCheckedInToday,
        hasCheckedOutToday,
        isPastShiftStart,
        isPastShiftEnd,
        endTimeStr: endTime,
        rollCallStatus,
        elapsedTimeText,
        checkInTimeStr,
        checkOutTimeStr,
        latestRecord,
        isOnSite: rollCallStatus === 'on_site' || rollCallStatus === 'forgot_checkout',
      };
    });
  }, [employees, branches, shifts, attendanceRecords, leaveRequests, now, today, lang]);

  // Roll call: Currently on-site employees (actively on duty OR forgot check-out overdue)
  const currentlyOnSiteList = rollCallPersonnelList.filter((item) => {
    if (!item.isOnSite) return false;
    if (rollCallBranchId !== 'all' && item.employee.branchId !== rollCallBranchId) return false;
    return true;
  });

  // If viewing as an Employee, render the dedicated Employee Home View
  if (isEmployee) {
    const myTodayRecords = attendanceRecords.filter(
      (r) => (r.employeeId === currentEmp?.id || r.employeeCode === currentUser?.employeeCode) && isSameLocalDate(r.timestamp, now)
    );
    const hasCheckedIn = myTodayRecords.some((r) => r.type === 'check_in');
    const hasCheckedOut = myTodayRecords.some((r) => r.type === 'check_out');

    // Teammates at my assigned branch
    const branchTeammates = employees.filter((e) => e.branchId === employeeAssignedBranch.id);
    const teammatesOnDuty = branchTeammates.filter((e) => {
      const empToday = attendanceRecords
        .filter((r) => r.employeeId === e.id && isSameLocalDate(r.timestamp, now))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return empToday.length > 0 && empToday[0].type === 'check_in';
    });

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Welcome & Single Assigned Branch Banner */}
        <div className="bg-indigo-600 p-6 sm:p-8 rounded-3xl text-white shadow-xl shadow-indigo-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-sm flex items-center gap-1">
                <Lock className="w-3 h-3" />
                {lang === 'km' ? 'ទីតាំងសាខារបស់អ្នក' : 'Your Assigned Branch'}
              </span>
              <span className="text-indigo-200 text-xs font-medium">
                {new Date().toLocaleDateString(lang === 'km' ? 'km-KH' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black">
              {lang === 'km' ? `សួស្តី, ${currentUser?.nameKh}` : `Welcome back, ${currentUser?.nameEn}`}
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed">
              {lang === 'km'
                ? `អ្នកត្រូវបានចុះឈ្មោះប្រចាំនៅ: "${employeeAssignedBranch.nameKh}"។ អ្នកអាចស្កេនវត្តមានបានតែក្នុងបរិវេណសាខានេះប៉ុណ្ណោះ។`
                : `You are officially registered at "${employeeAssignedBranch.nameEn}". Geofenced attendance is restricted to this designated site.`}
            </p>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto">
            <button
              onClick={() => onNavigateTab('scan')}
              className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-6 py-3.5 rounded-2xl bg-white text-indigo-600 font-bold text-xs sm:text-sm shadow-lg hover:bg-indigo-50 transition"
            >
              <QrCode className="w-4 h-4" />
              <span>{lang === 'km' ? 'ស្កេនវត្តមានភ្លាមៗ' : 'Scan Check-In'}</span>
            </button>
            <button
              onClick={() => onNavigateTab('portal')}
              className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-6 py-3.5 rounded-2xl bg-indigo-700/80 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm border border-indigo-400/40 transition"
            >
              <span>{lang === 'km' ? 'ផតថលសុំច្បាប់' : 'My Requests'}</span>
            </button>
          </div>
        </div>

        {/* Assigned Branch Details Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Branch Information (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600">
                  {getBranchIcon(employeeAssignedBranch.type)}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    {employeeAssignedBranch.type.toUpperCase()}
                  </span>
                  <h3 className="text-lg font-black text-slate-800 mt-1">
                    {lang === 'km' ? employeeAssignedBranch.nameKh : employeeAssignedBranch.nameEn}
                  </h3>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                ● {lang === 'km' ? 'កំពុងដំណើរការ' : 'Active Location'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-500 font-medium">{lang === 'km' ? 'ម៉ោងប្រតិបត្តិការ:' : 'Operating Hours:'}</span>
                <p className="font-bold text-slate-800 font-mono text-sm">
                  {employeeAssignedBranch.openTime} - {employeeAssignedBranch.closeTime}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-500 font-medium">{lang === 'km' ? 'កាំ Geofence អនុញ្ញាត:' : 'Geofence Allowed Radius:'}</span>
                <p className="font-bold text-indigo-600 font-mono text-sm">
                  {employeeAssignedBranch.radiusMeters} ម៉ែត្រ (Meters)
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-500 font-medium">{lang === 'km' ? 'អ្នកគ្រប់គ្រងសាខា:' : 'Branch Manager:'}</span>
                <p className="font-bold text-slate-800">
                  {employeeAssignedBranch.managerName}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-500 font-medium">{lang === 'km' ? 'លេខទំនាក់ទំនង:' : 'Manager Contact:'}</span>
                <p className="font-bold text-slate-800 flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-indigo-600" />
                  {employeeAssignedBranch.contactPhone}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs text-slate-600 flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">{lang === 'km' ? 'អាសយដ្ឋាន:' : 'Address:'} </span>
                <span>{lang === 'km' ? employeeAssignedBranch.addressKh : employeeAssignedBranch.addressEn}</span>
              </div>
            </div>
          </div>

          {/* Teammates currently on duty (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-slate-800 text-sm">
                  {lang === 'km' ? 'មិត្តរួមការងារកំពុងបំពេញការងារ' : 'Teammates On-Duty'}
                </h4>
              </div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {teammatesOnDuty.length} / {branchTeammates.length} {lang === 'km' ? 'នាក់' : 'pax'}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {branchTeammates.map((teammate) => {
                const isOnDuty = teammatesOnDuty.some((t) => t.id === teammate.id);
                return (
                  <div
                    key={teammate.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                      isOnDuty
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-slate-50 border-slate-200/70 opacity-70'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={teammate.avatar}
                        alt={teammate.nameEn}
                        className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                      />
                      <div>
                        <h5 className="font-bold text-slate-800 text-xs">
                          {lang === 'km' ? teammate.nameKh : teammate.nameEn}
                        </h5>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {lang === 'km' ? teammate.roleKh : teammate.role}
                        </p>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isOnDuty
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {isOnDuty ? '🟢 On-Site' : 'Off-Duty'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin & Manager Dashboard View
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-indigo-600 p-6 sm:p-8 rounded-3xl text-white shadow-xl shadow-indigo-200">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
              ● Multi-Branch Command Center
            </span>
            <span className="text-indigo-100 text-xs font-medium">
              {new Date().toLocaleDateString(lang === 'km' ? 'km-KH' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            {lang === 'km' ? 'ផ្ទាំងគ្រប់គ្រងវត្តមាន ៧ សាខា (AMS)' : 'Multi-Branch Presence & Operations Dashboard'}
          </h2>
          <p className="text-xs sm:text-sm text-indigo-100">
            {lang === 'km'
              ? 'ត្រួតពិនិត្យវត្តមានបុគ្គលិកតាមអនឡាញតាមរយៈ QR Code និងទីតាំង GPS Geofencing ជំនួសម៉ាស៊ីនស្កេនមេដៃ'
              : 'Real-time GPS geofenced attendance tracking across 2 Nightclubs, 1 Warehouse, 3 Cafes, and HQ Office.'}
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Cloud Attendance Sync Action */}
          <button
            onClick={() => onManualSync && onManualSync()}
            disabled={isSyncing}
            className="flex items-center space-x-2 px-4 py-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs border border-white/30 backdrop-blur-sm transition shadow-sm cursor-pointer"
            title={lang === 'km' ? 'ទាញយក និងសមកាលកម្មវត្តមានពី Cloud ភ្លាមៗ' : 'Sync all staff punches from Cloud now'}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? (lang === 'km' ? 'កំពុងទាញយក...' : 'Syncing...') : (lang === 'km' ? 'សមកាលកម្មវត្តមាន' : 'Sync Punches')}</span>
          </button>

          {/* Emergency Roll Call Action */}
          <button
            onClick={() => setShowEmergencyRollCall(true)}
            className="flex items-center space-x-2 px-4 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md transition"
          >
            <AlertCircle className="w-4 h-4 animate-pulse" />
            <span>{lang === 'km' ? 'បញ្ជីសុវត្ថិភាព (Roll Call)' : 'Emergency Roll Call'}</span>
          </button>

          {/* Quick Transfer Employee */}
          {onOpenTransferModal && (
            <button
              onClick={() => onOpenTransferModal()}
              className="flex items-center space-x-2 px-4 py-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs border border-white/30 backdrop-blur-sm transition"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>{lang === 'km' ? 'ផ្ទេរសាខា' : 'Transfer Staff'}</span>
            </button>
          )}

          <button
            onClick={() => onNavigateTab('scan')}
            className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-white text-indigo-600 font-bold text-xs shadow-md hover:bg-indigo-50 transition"
          >
            <QrCode className="w-4 h-4" />
            <span>{lang === 'km' ? 'ស្កេនវត្តមាន' : 'Scan Check-In'}</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards Grid */}
      {(() => {
        const pendingLeavesCount = leaveRequests.filter((r) => r.status === 'pending').length;
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* Present Today */}
            <div className="card stat-card bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  {lang === 'km' ? 'វត្តមានថ្ងៃនេះ' : 'Present Today'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold text-slate-800">
                  {lang === 'km' ? toKhmerNumeral(presentCount) : presentCount}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  / {relevantEmployees.length} {lang === 'km' ? 'នាក់' : 'staff'}
                </span>
              </div>
              <p className="text-xs text-emerald-600 font-bold flex items-center gap-1 font-hanuman">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>
                  {relevantEmployees.length > 0 ? Math.round((presentCount / relevantEmployees.length) * 100) : 0}% {lang === 'km' ? 'អត្រាវត្តមាន' : 'rate'}
                </span>
              </p>
            </div>

            {/* On-Time Arrival */}
            <div className="card stat-card bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  {lang === 'km' ? 'មកទៀងម៉ោង' : 'On-Time'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold text-teal-600">
                  {lang === 'km' ? toKhmerNumeral(onTimeCount) : onTimeCount}
                </span>
                <span className="text-xs text-slate-400 font-medium">{lang === 'km' ? 'នាក់' : 'pax'}</span>
              </div>
              <p className="text-xs text-slate-500 font-medium font-hanuman">
                {lang === 'km' ? 'ក្នុងកំឡុងអនុគ្រោះ' : 'Within grace period'}
              </p>
            </div>

            {/* Late Arrivals */}
            <div className="card stat-card bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  {lang === 'km' ? 'មកយឺត' : 'Late Arrivals'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold text-rose-600">
                  {lang === 'km' ? toKhmerNumeral(lateCount) : lateCount}
                </span>
                <span className="text-xs text-slate-400 font-medium">{lang === 'km' ? 'នាក់' : 'pax'}</span>
              </div>
              <p className="text-xs text-rose-600 font-bold font-hanuman">
                {lang === 'km' ? 'កត់ត្រាម៉ោងយឺត' : 'Auto-penalized time'}
              </p>
            </div>

            {/* Overtime */}
            <div className="card stat-card bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  {lang === 'km' ? 'ថែមម៉ោង (OT)' : 'Overtime'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold text-indigo-600">
                  {lang === 'km' ? toKhmerNumeral(overtimeCount) : overtimeCount}
                </span>
                <span className="text-xs text-slate-400 font-medium">{lang === 'km' ? 'នាក់' : 'pax'}</span>
              </div>
              <p className="text-xs text-indigo-600 font-medium font-hanuman">
                {lang === 'km' ? 'ក្លិប & ឃ្លាំង OT' : 'Clubs & Logistics OT'}
              </p>
            </div>

            {/* Pending Leaves Card */}
            <div 
              onClick={() => {
                const el = document.getElementById('dashboard-leave-approvals-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`card stat-card p-4 sm:p-5 rounded-2xl border transition cursor-pointer ${
                pendingLeavesCount > 0 
                  ? 'bg-amber-50/80 border-amber-300 shadow-sm hover:shadow-md ring-1 ring-amber-400/50' 
                  : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  {lang === 'km' ? 'ច្បាប់រង់ចាំ' : 'Pending Leaves'}
                </span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                  pendingLeavesCount > 0 ? 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse' : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}>
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className={`text-3xl font-bold ${pendingLeavesCount > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
                  {lang === 'km' ? toKhmerNumeral(pendingLeavesCount) : pendingLeavesCount}
                </span>
                <span className="text-xs text-slate-400 font-medium">{lang === 'km' ? 'ពាក្យ' : 'reqs'}</span>
              </div>
              <p className="text-xs text-amber-700 font-bold font-hanuman flex items-center gap-1">
                <span>{pendingLeavesCount > 0 ? '⚡ ពិនិត្យភ្លាមៗ' : '✅ រួចរាល់ទាំងអស់'}</span>
              </p>
            </div>

            {/* GPS Compliance */}
            <div className="card stat-card bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  {lang === 'km' ? 'សុក្រឹតភាព GPS' : 'GPS Compliance'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold text-emerald-600">
                  {gpsComplianceRate}%
                </span>
              </div>
              <p className="text-xs text-emerald-700 font-bold flex items-center gap-1 font-hanuman">
                <span>🛡️</span>
                <span>{lang === 'km' ? '១០០% On-Site' : '100% On-Site'}</span>
              </p>
            </div>
          </div>
        );
      })()}

      {/* Real-time Live Action Feed & Alerts Ticker */}
      <RealtimeActionAlertCenter
        alerts={actionAlerts}
        pendingLeavesCount={leaveRequests.filter((r) => r.status === 'pending').length}
        onClearAlerts={onClearAlerts}
        onDismissAlert={onDismissAlert}
        onApproveLeave={onUpdateLeaveStatus ? (id) => onUpdateLeaveStatus(id, 'approved') : undefined}
        onRejectLeave={onUpdateLeaveStatus ? (id) => onUpdateLeaveStatus(id, 'rejected') : undefined}
        onNavigateToLeaves={() => {
          const el = document.getElementById('dashboard-leave-approvals-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onNavigateToAttendance={() => onNavigateTab('scan')}
        lang={lang}
      />

      {/* Staff Leave Requests & Approvals Queue (Actionable Center) */}
      {onUpdateLeaveStatus && (
        <div id="dashboard-leave-approvals-section">
          <DashboardLeaveApprovals
            leaveRequests={leaveRequests}
            employees={employees}
            branches={branches}
            currentUser={currentUser}
            onUpdateLeaveStatus={onUpdateLeaveStatus}
            onDeleteLeaveRequest={onDeleteLeaveRequest}
            onClearLeaveRequests={onClearLeaveRequests}
            onNavigateToLeavesTab={() => onNavigateTab('settings')}
            lang={lang}
          />
        </div>
      )}

      {/* Weak GPS / Indoor Location Exception Review Widget for Managers */}
      {onApproveLocationException && pendingLocationExceptions.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-300 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-200 shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base font-battambang flex items-center gap-2">
                  <span>{lang === 'km' ? '📍 សំណើបញ្ជាក់វត្តមានលើកលែង (GPS ក្នុងអគារ)' : '📍 Indoor Weak GPS Exception Punch Reviews'}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-amber-600 text-white font-mono font-bold">
                    {pendingLocationExceptions.length}
                  </span>
                </h3>
                <p className="text-xs text-amber-800 font-medium">
                  {lang === 'km'
                    ? 'បុគ្គលិកបានចុះវត្តមានដោយភ្ជាប់រូបថត Selfie ដោយសារសញ្ញាផ្កាយរណបខ្សោយក្នុងអគារ សូមត្រួតពិនិត្យ និងអនុម័ត'
                    : 'Employees requested punch exception with live selfie due to indoor GPS signal blockage.'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingLocationExceptions.map((rec) => (
              <div
                key={rec.id}
                className="bg-white border border-amber-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start space-x-3">
                  <img
                    src={rec.selfieUrl || rec.employeeAvatar}
                    alt={rec.employeeNameEn}
                    className="w-14 h-14 rounded-xl object-cover border border-amber-200 shadow-sm shrink-0"
                  />
                  <div className="min-w-0 flex-1 text-xs">
                    <h4 className="font-bold text-slate-900 truncate font-battambang">
                      {lang === 'km' ? rec.employeeNameKh : rec.employeeNameEn}
                    </h4>
                    <span className="text-[11px] font-mono text-indigo-600 font-bold block">
                      {rec.employeeCode} • {rec.branchNameEn}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {rec.type === 'check_in' ? 'Check-In' : 'Check-Out'}
                    </span>
                    <p className="text-[11px] text-amber-800 font-medium mt-1 truncate">
                      {rec.locationExceptionReason || 'GPS ខ្សោយក្នុងអគារ'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => onApproveLocationException(rec.id, 'reject')}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold text-xs transition cursor-pointer"
                  >
                    {lang === 'km' ? 'បដិសេធ' : 'Reject'}
                  </button>
                  <button
                    onClick={() => onApproveLocationException(rec.id, 'approve')}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{lang === 'km' ? 'អនុម័ត' : 'Approve'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7 Branches Archetype Filter & Status Cards Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-800">
              {lang === 'km' ? 'ស្ថានភាពវត្តមានតាមសាខានីមួយៗ (៧ សាខា)' : 'Live Presence Status Across 7 Branches'}
            </h3>
          </div>

          {/* Archetype Filter Tabs */}
          <div className="flex items-center space-x-1 bg-slate-200/70 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setSelectedTypeFilter('all')}
              className={`px-3 py-1 rounded-lg transition ${selectedTypeFilter === 'all' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {lang === 'km' ? 'ទាំងអស់ (៧)' : 'All (7)'}
            </button>
            <button
              onClick={() => setSelectedTypeFilter('club')}
              className={`px-2.5 py-1 rounded-lg transition ${selectedTypeFilter === 'club' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              🍸 {lang === 'km' ? 'ក្លិប (២)' : 'Clubs (2)'}
            </button>
            <button
              onClick={() => setSelectedTypeFilter('warehouse')}
              className={`px-2.5 py-1 rounded-lg transition ${selectedTypeFilter === 'warehouse' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              📦 {lang === 'km' ? 'ឃ្លាំង (១)' : 'Warehouse'}
            </button>
            <button
              onClick={() => setSelectedTypeFilter('cafe')}
              className={`px-2.5 py-1 rounded-lg transition ${selectedTypeFilter === 'cafe' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              ☕ {lang === 'km' ? 'កាហ្វេ (៣)' : 'Cafes (3)'}
            </button>
            <button
              onClick={() => setSelectedTypeFilter('office')}
              className={`px-2.5 py-1 rounded-lg transition ${selectedTypeFilter === 'office' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              🏢 {lang === 'km' ? 'HQ' : 'HQ Office'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBranches.map((branch) => {
            const branchEmps = employees.filter((e) => e.branchId === branch.id);
            const branchActiveCheckIns = attendanceRecords.filter(
              (r) => r.branchId === branch.id && isSameLocalDate(r.timestamp, now) && r.type === 'check_in'
            );
            const isSelected = branch.id === selectedBranchId;

            return (
              <div
                key={branch.id}
                onClick={() => setSelectedBranchId(branch.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-sm relative overflow-hidden group ${
                  isSelected
                    ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                    : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'
                }`}
              >
                {/* Top Branch Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center space-x-2.5">
                    <span className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 group-hover:bg-indigo-100 group-hover:border-indigo-200 transition-colors">
                      {getBranchIcon(branch.type)}
                    </span>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {branch.type === 'club' ? '🍸 Nightclub' :
                         branch.type === 'warehouse' ? '📦 Logistics' :
                         branch.type === 'cafe' ? '☕ Cafe Shop' : '🏢 Headquarters'}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {lang === 'km' ? branch.nameKh : branch.nameEn}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Staff Occupancy Progress Bar */}
                <div className="space-y-1.5 my-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">{lang === 'km' ? 'វត្តមានជាក់ស្តែង:' : 'Staff On-Site:'}</span>
                    <span className="font-bold text-slate-800">
                      {branchActiveCheckIns.length} / {branchEmps.length} {lang === 'km' ? 'នាក់' : 'staff'}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{
                        width: `${branchEmps.length > 0 ? (branchActiveCheckIns.length / branchEmps.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Geofence & Shift Footer */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{branch.radiusMeters}m Geofence</span>
                  </span>
                  <span className="font-mono text-slate-700 font-semibold">
                    {branch.openTime} - {branch.closeTime}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real-time Transfer History & Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live Attendance Audit Stream (7 cols) - ONLY SHOWN FOR TODAY */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 space-y-3.5 bg-slate-50/50">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <div>
                  <div className="flex items-center flex-wrap gap-2">
                    <h3 className="font-bold text-slate-800 text-sm">
                      {lang === 'km' ? 'ទិន្នន័យវត្តមានថ្ងៃនេះផ្ទាល់ (Today Real-Time GPS Feed)' : "Today's Real-Time Attendance Feed"}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {todayFeedRecords.length} {lang === 'km' ? 'វត្តមានថ្ងៃនេះ' : 'punches today'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {lang === 'km'
                      ? 'បង្ហាញវត្តមានជាក់ស្តែង វេនការងារ (Workshift) ថ្ងៃសម្រាក (Day Off) និងថែមម៉ោង (OT)'
                      : 'Showing live GPS punches with Workshift, Weekly Day Off, and Overtime (OT) status'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('reports')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition shrink-0"
              >
                <span>{lang === 'km' ? 'មើលទាំងអស់' : 'View All'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Summary KPI Strip: Shift Breakdown, Day Off Today, & OT Status */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">
                    {lang === 'km' ? 'វេនការងារ (Workshift)' : 'Workshifts Today'}
                  </div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-amber-600">
                      {lang === 'km' ? `ព្រឹក: ${morningFeedCount}` : `AM: ${morningFeedCount}`}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-indigo-600">
                      {lang === 'km' ? `រសៀល: ${afternoonFeedCount}` : `PM: ${afternoonFeedCount}`}
                    </span>
                  </div>
                </div>
                <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
              </div>

              <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">
                    {lang === 'km' ? 'ថ្ងៃសម្រាកថ្ងៃនេះ (Day Off)' : 'Scheduled Day Off'}
                  </div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5 truncate" title={staffOnDayOffToday.map((e) => (lang === 'km' ? e.nameKh : e.nameEn)).join(', ')}>
                    {staffOnDayOffToday.length} {lang === 'km' ? 'នាក់' : 'staff'}
                    {workingOnDayOffFeedCount > 0 && (
                      <span className="ml-1 text-[10px] text-amber-600 font-semibold">
                        ({workingOnDayOffFeedCount} {lang === 'km' ? 'មកធ្វើការ' : 'working'})
                      </span>
                    )}
                  </div>
                </div>
                <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
              </div>

              <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">
                    {lang === 'km' ? 'ថែមម៉ោងថ្ងៃនេះ (OT)' : "Today's OT"}
                  </div>
                  <div className="text-xs font-bold text-purple-700 mt-0.5">
                    {otFeedCount} {lang === 'km' ? 'កំណត់ត្រា OT' : 'OT records'}
                  </div>
                </div>
                <Zap className="w-4 h-4 text-purple-600 shrink-0" />
              </div>
            </div>

            {/* Quick Filter Pills for Real-Time Feed */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {[
                { id: 'all', labelKh: `ទាំងអស់ (${todayFeedRecords.length})`, labelEn: `All (${todayFeedRecords.length})` },
                { id: 'morning', labelKh: `វេនព្រឹក (${morningFeedCount})`, labelEn: `Morning Shift (${morningFeedCount})` },
                { id: 'afternoon', labelKh: `វេនរសៀល (${afternoonFeedCount})`, labelEn: `Afternoon Shift (${afternoonFeedCount})` },
                { id: 'checked_out', labelKh: `បានស្កេនចេញ (${checkedOutFeedCount})`, labelEn: `Checked Out (${checkedOutFeedCount})` },
                { id: 'no_checkout', labelKh: `មិនទាន់ស្កេនចេញ (${noCheckOutFeedCount})`, labelEn: `No Check-Out (${noCheckOutFeedCount})` },
                { id: 'dayoff', labelKh: `ធ្វើការថ្ងៃសម្រាក (${workingOnDayOffFeedCount})`, labelEn: `Day-Off Work (${workingOnDayOffFeedCount})` },
                { id: 'ot', labelKh: `ថែមម៉ោង OT (${otFeedCount})`, labelEn: `Overtime OT (${otFeedCount})` },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setFeedFilter(pill.id as 'all' | 'morning' | 'afternoon' | 'checked_out' | 'no_checkout' | 'dayoff' | 'ot')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition border cursor-pointer ${
                    feedFilter === pill.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {lang === 'km' ? pill.labelKh : pill.labelEn}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 space-y-2.5 max-h-[520px] overflow-y-auto">
            {filteredFeedItems.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-500 flex items-center justify-center mx-auto mb-3">
                  <Radio className="w-6 h-6 animate-pulse text-indigo-600" />
                </div>
                <p className="text-sm font-bold text-slate-700 font-battambang">
                  {todayFeedRecords.length === 0
                    ? lang === 'km'
                      ? 'មិនទាន់មានទិន្នន័យវត្តមានសម្រាប់ថ្ងៃនេះនៅឡើយទេ'
                      : 'No attendance punches recorded yet today'
                    : lang === 'km'
                    ? 'មិនមានទិន្នន័យត្រូវនឹងតម្រងជ្រើសរើសនេះទេ'
                    : 'No attendance punches match the selected filter'}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-hanuman">
                  {lang === 'km'
                    ? 'ទិន្នន័យវត្តមាន Real-Time ថ្ងៃនេះនឹងបង្ហាញនៅទីនេះដោយស្វ័យប្រវត្តិពេលបុគ្គលិកចុះវត្តមានតាម GPS'
                    : "Today's live GPS punches will stream here in real time as staff check in or out"}
                </p>
              </div>
            ) : (
              filteredFeedItems.slice(0, 60).map(({ rec, meta }) => {
                const {
                  matchedEmp,
                  shiftBadge,
                  shiftHoursText,
                  dayOffName,
                  isWorkingOnDayOff,
                  hasOt,
                  otDisplayLabel,
                  workedHoursToday,
                  hasCheckedInToday,
                  hasCheckedOutToday,
                  checkInTimeStr,
                  checkOutTimeStr,
                  isPastShiftEnd,
                  endTimeStr,
                } = meta;

                const avatarSrc =
                  rec.employeeAvatar ||
                  matchedEmp?.avatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

                const isLatePunch = isRecordLate(rec, employees, shifts, branches);
                const effectiveStatus: AttendanceStatus =
                  rec.status === 'geofence_violation' || rec.status === 'pending_location_review'
                    ? rec.status
                    : rec.type === 'check_in'
                    ? (isLatePunch ? 'late' : 'on_time')
                    : (rec.status === 'overtime' ? 'overtime' : 'on_time');

                return (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/80 hover:border-indigo-200 transition space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        {/* Clickable Staff Avatar -> Opens Staff Information Popup Modal */}
                        <button
                          type="button"
                          onClick={() => setSelectedStaffInfoRecord(rec)}
                          title={
                            lang === 'km'
                              ? 'ចុចលើរូបភាពដើម្បីមើលព័ត៌មានលម្អិតបុគ្គលិក និងម៉ោងចូល/ចេញ'
                              : 'Click image to view full staff profile & Check-In / Check-Out details'
                          }
                          className="relative group/avatar shrink-0 cursor-pointer focus:outline-none"
                        >
                          <img
                            src={avatarSrc}
                            alt={rec.employeeNameEn || 'Employee'}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src =
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                            }}
                            className="w-11 h-11 rounded-xl object-cover border-2 border-indigo-200 shadow-sm bg-slate-200 group-hover/avatar:ring-2 group-hover/avatar:ring-indigo-500 group-hover/avatar:scale-105 transition-all"
                          />
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold shadow-xs group-hover/avatar:bg-indigo-700">
                            i
                          </span>
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedStaffInfoRecord(rec)}
                              className="text-sm font-bold text-slate-800 hover:text-indigo-600 truncate cursor-pointer transition text-left"
                            >
                              {lang === 'km' ? rec.employeeNameKh : rec.employeeNameEn}
                            </button>
                            <span className="text-[10px] font-mono text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded font-semibold">
                              {rec.employeeCode || matchedEmp?.code}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 flex items-center flex-wrap gap-1.5 mt-0.5">
                            <span className="text-indigo-600 font-semibold">
                              {lang === 'km' ? rec.branchNameKh || rec.branchNameEn : rec.branchNameEn}
                            </span>
                            <span>•</span>
                            <span className="text-slate-500 font-medium">{formatDistance(rec.distanceToBranch, lang)}</span>
                            {workedHoursToday > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-700 font-semibold">
                                  {lang === 'km' ? `សរុប: ${workedHoursToday}ម៉ោង` : `Worked: ${workedHoursToday}h`}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right space-y-1 shrink-0">
                        <div className="flex items-center justify-end space-x-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rec.type === 'check_in'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {rec.type === 'check_in' 
                              ? (lang === 'km' ? 'ចូលធ្វើការ' : 'Check-In') 
                              : (lang === 'km' ? 'ចេញពីធ្វើការ' : 'Check-Out')}
                          </span>

                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            effectiveStatus === 'on_time'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : effectiveStatus === 'late'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              effectiveStatus === 'on_time' ? 'bg-emerald-500' : effectiveStatus === 'late' ? 'bg-rose-500' : 'bg-purple-500'
                            }`} />
                            {effectiveStatus === 'on_time'
                              ? (lang === 'km' ? 'ទាន់ម៉ោង' : 'on_time')
                              : effectiveStatus === 'late'
                              ? (lang === 'km' ? 'យឺតម៉ោង' : 'late')
                              : (lang === 'km' ? 'ថែមម៉ោង (OT)' : 'overtime')}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 font-mono font-medium">
                          {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    {/* Paired Check-In & Check-Out Status Bar + Workshift, Day Off & OT Strip */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/70">
                      {/* Paired Check-In Time Badge */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>
                          {lang === 'km' ? 'ម៉ោងចូល:' : 'In:'} {hasCheckedInToday ? checkInTimeStr : '--:--'}
                        </span>
                      </span>

                      {/* Paired Check-Out Time / Missing Check-Out Status Badge */}
                      {hasCheckedOutToday ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          <span>
                            {lang === 'km' ? 'ម៉ោងចេញ:' : 'Out:'} {checkOutTimeStr}
                          </span>
                        </span>
                      ) : isPastShiftEnd ? (
                        <div className="inline-flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                            <span>
                              {lang === 'km'
                                ? `ម៉ោងចេញ: មិនទាន់ស្កេនចេញ / ភ្លេចស្កេនចេញ (ផុតម៉ោង ${endTimeStr})`
                                : `Out: Not Checked Out / Forgot (Shift ended ${endTimeStr})`}
                            </span>
                          </span>

                          {matchedEmp && onRingStaffReminder && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRingStaffReminder(matchedEmp, 'forgot_checkout');
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer shrink-0"
                              title={lang === 'km' ? 'រោទិ៍សំឡេងរំលឹកទៅកាន់ទូរស័ព្ទបុគ្គលិកនេះ' : 'Ring reminder alarm on this staff member device'}
                            >
                              <Bell className="w-3 h-3 animate-bounce" />
                              <span>{lang === 'km' ? '🔔 រោទិ៍រំលឹក' : '🔔 Ring Staff'}</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>
                            {lang === 'km'
                              ? `ម៉ោងចេញ: កំពុងធ្វើការ (ចេញម៉ោង ${endTimeStr})`
                              : `Out: Working (Ends ${endTimeStr})`}
                          </span>
                        </span>
                      )}

                      {/* 1. Workshift Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${shiftBadge.bgColor} ${shiftBadge.color} ${shiftBadge.borderColor}`}
                      >
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>
                          {lang === 'km' ? 'វេន:' : 'Shift:'} {shiftBadge.label} ({shiftHoursText})
                        </span>
                      </span>

                      {/* 2. Weekly Day Off Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                          isWorkingOnDayOff
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>
                          {isWorkingOnDayOff
                            ? lang === 'km'
                              ? `ធ្វើការថ្ងៃសម្រាក (${dayOffName})`
                              : `Working on Day Off (${dayOffName})`
                            : lang === 'km'
                            ? `ថ្ងៃសម្រាក: ${dayOffName}`
                            : `Day Off: ${dayOffName}`}
                        </span>
                      </span>

                      {/* 3. Overtime (OT) Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                          hasOt
                            ? 'bg-purple-100 text-purple-800 border-purple-300 shadow-xs'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <Zap className={`w-3 h-3 shrink-0 ${hasOt ? 'text-purple-600' : 'text-slate-400'}`} />
                        <span>{otDisplayLabel}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Branch Movement & Transfer Log Stream (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-sm">
                {lang === 'km' ? 'ប្រវត្តិនៃការផ្ទេរសាខា (Branch Movements)' : 'Recent Branch Transfers'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {onOpenTransferModal && (
                <button
                  type="button"
                  onClick={() => onOpenTransferModal()}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-lg transition flex items-center gap-1"
                >
                  <span>{lang === 'km' ? '+ ផ្ទេរថ្មី' : '+ New'}</span>
                </button>
              )}
              <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                {transferRecords.length}
              </span>
            </div>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1">
            {transferRecords.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                {lang === 'km' ? 'មិនទាន់មានប្រវត្តិផ្ទេរបុគ្គលិកនៅឡើយទេ' : 'No recent branch transfers logged'}
              </div>
            ) : (
              transferRecords.map((tr) => {
                const matchedEmp = employees.find(
                  (e) =>
                    e.id === tr.employeeId ||
                    e.code === tr.employeeCode ||
                    (tr.employeeNameEn && e.nameEn && String(e.nameEn).toLowerCase() === String(tr.employeeNameEn).toLowerCase())
                );
                const avatarSrc =
                  tr.employeeAvatar ||
                  matchedEmp?.avatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces';
                const displayName =
                  lang === 'km'
                    ? tr.employeeNameKh || matchedEmp?.nameKh || tr.employeeNameEn
                    : tr.employeeNameEn || matchedEmp?.nameEn || 'Staff';

                return (
                  <div
                    key={tr.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 hover:border-indigo-200 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <img
                          src={avatarSrc}
                          alt={displayName}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src =
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces';
                          }}
                          className="w-8 h-8 rounded-xl object-cover border border-slate-200 shadow-xs bg-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-slate-800 text-xs truncate max-w-[130px]">
                              {displayName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-600 bg-slate-200/80 px-1.5 py-0.2 rounded font-semibold shrink-0">
                              {tr.employeeCode || matchedEmp?.code}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {tr.effectiveDate || tr.transferDate}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 text-xs">
                      <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 font-semibold truncate max-w-[130px]">
                        {tr.fromBranchNameEn}
                      </span>
                      <span className="text-indigo-500 font-bold">➔</span>
                      <span className="text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200 font-semibold truncate max-w-[130px]">
                        {tr.toBranchNameEn}
                      </span>
                    </div>

                    {tr.reason && (
                      <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded-xl border border-slate-100">
                        "{tr.reason}"
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Staff Information & Check-In/Check-Out Details Popup Modal (Triggered by clicking staff image in Today's Real-Time Attendance Feed) */}
      {selectedStaffInfoRecord && (() => {
        const modalMeta = getRecordShiftDayOffAndOt(selectedStaffInfoRecord);
        const {
          matchedEmp,
          empShift,
          shiftBadge,
          shiftHoursText,
          dayOffName,
          isWorkingOnDayOff,
          hasOt,
          otDisplayLabel,
          workedHoursToday,
          empPunchesToday,
          firstCheckIn,
          lastCheckOut,
          hasCheckedInToday,
          hasCheckedOutToday,
          checkInTimeStr,
          checkOutTimeStr,
          isPastShiftEnd,
          endTimeStr,
        } = modalMeta;

        const staffBranch =
          branches.find((b) => b.id === (matchedEmp?.branchId || selectedStaffInfoRecord.branchId)) ||
          branches[0];

        const avatarSrc =
          selectedStaffInfoRecord.employeeAvatar ||
          matchedEmp?.avatar ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80';

        // Recent attendance history across all days for this staff member (grouped by local date)
        const allStaffRecords = attendanceRecords
          .filter((r) =>
            matchedEmp
              ? doesRecordMatchEmployee(r, matchedEmp)
              : (r.employeeId && r.employeeId === selectedStaffInfoRecord.employeeId) ||
                (r.employeeCode &&
                  selectedStaffInfoRecord.employeeCode &&
                  String(r.employeeCode).toLowerCase() === String(selectedStaffInfoRecord.employeeCode).toLowerCase())
          )
          .filter((r) => Boolean(r.timestamp))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const recentDaysMap = new Map<string, AttendanceRecord[]>();
        allStaffRecords.forEach((r) => {
          const dKey = new Date(r.timestamp).toLocaleDateString('en-CA');
          if (!recentDaysMap.has(dKey)) recentDaysMap.set(dKey, []);
          recentDaysMap.get(dKey)!.push(r);
        });
        const recentDailyHistory = Array.from(recentDaysMap.entries()).slice(0, 7);

        return (
          <div
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setSelectedStaffInfoRecord(null)}
          >
            <div
              className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top Header with Staff Image & Identity */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-4 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={avatarSrc}
                      alt={selectedStaffInfoRecord.employeeNameEn || 'Staff'}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src =
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80';
                      }}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-indigo-200 shadow-md bg-slate-100"
                    />
                    <span
                      className={`absolute -bottom-1.5 -right-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-xs ${
                        hasCheckedOutToday
                          ? 'bg-blue-600 text-white border-white'
                          : 'bg-emerald-500 text-white border-white'
                      }`}
                    >
                      {hasCheckedOutToday
                        ? lang === 'km'
                          ? 'ចេញរួច'
                          : 'Out'
                        : lang === 'km'
                        ? 'កំពុងធ្វើការ'
                        : 'On-Site'}
                    </span>
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                        {selectedStaffInfoRecord.employeeCode || matchedEmp?.code || 'ID'}
                      </span>
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                        {matchedEmp?.roleKh || matchedEmp?.role || (lang === 'km' ? 'បុគ្គលិក' : 'Staff')}
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-black text-slate-900 truncate">
                      {selectedStaffInfoRecord.employeeNameKh || matchedEmp?.nameKh || selectedStaffInfoRecord.employeeNameEn}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 truncate">
                      {selectedStaffInfoRecord.employeeNameEn || matchedEmp?.nameEn} •{' '}
                      <span className="text-indigo-600 font-bold">
                        {lang === 'km'
                          ? staffBranch?.nameKh || selectedStaffInfoRecord.branchNameKh || selectedStaffInfoRecord.branchNameEn
                          : staffBranch?.nameEn || selectedStaffInfoRecord.branchNameEn}
                      </span>
                    </p>

                    <div className="flex items-center flex-wrap gap-2 pt-1 text-xs text-slate-600">
                      {matchedEmp?.phone && (
                        <a
                          href={`tel:${matchedEmp.phone}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 transition"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{matchedEmp.phone}</span>
                        </a>
                      )}
                      {matchedEmp?.departmentKh && (
                        <span className="text-[11px] text-slate-500 font-medium bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                          {lang === 'km' ? matchedEmp.departmentKh : matchedEmp.department}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedStaffInfoRecord(null)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Section 1: Today's Check-In AND Check-Out Status Comparison Box */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>
                      {lang === 'km'
                        ? 'ស្ថានភាពស្កេនវត្តមានថ្ងៃនេះ (ម៉ោងចូល & ម៉ោងចេញ)'
                        : "Today's Check-In & Check-Out Status"}
                    </span>
                  </h4>
                  {workedHoursToday > 0 && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {lang === 'km'
                        ? `ម៉ោងធ្វើការសរុបថ្ងៃនេះ: ${workedHoursToday} ម៉ោង`
                        : `Total Worked Today: ${workedHoursToday} hrs`}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Check-In Card */}
                  <div
                    className={`p-4 rounded-2xl border ${
                      hasCheckedInToday
                        ? 'bg-emerald-50/70 border-emerald-200'
                        : 'bg-slate-50 border-slate-200'
                    } space-y-1.5`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{lang === 'km' ? 'ម៉ោងស្កេនចូល (Check-In)' : 'Check-In Time'}</span>
                      </span>
                      {firstCheckIn && (() => {
                        const isLateCheckIn = isRecordLate(firstCheckIn, employees, shifts, branches);
                        return (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isLateCheckIn
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {isLateCheckIn
                              ? lang === 'km'
                                ? 'មកយឺត (Late)'
                                : 'Late'
                              : lang === 'km'
                              ? 'ទាន់ម៉ោង (On-Time)'
                              : 'On-Time'}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="text-2xl font-black font-mono text-slate-900">
                      {hasCheckedInToday ? checkInTimeStr : '--:--'}
                    </div>

                    <p className="text-[11px] text-slate-600 font-medium">
                      {firstCheckIn
                        ? `${lang === 'km' ? 'ទីតាំង GPS:' : 'GPS Distance:'} ${formatDistance(
                            firstCheckIn.distanceToBranch,
                            lang
                          )} (${
                            firstCheckIn.isWithinGeofence
                              ? lang === 'km'
                                ? 'ក្នុងបរិវេណសាខា'
                                : 'Within Geofence'
                              : lang === 'km'
                              ? 'ក្រៅបរិវេណ'
                              : 'Out of Range'
                          })`
                        : lang === 'km'
                        ? 'មិនទាន់មានកំណត់ត្រាស្កេនចូល'
                        : 'No Check-In recorded today'}
                    </p>
                  </div>

                  {/* Check-Out Card */}
                  <div
                    className={`p-4 rounded-2xl border ${
                      hasCheckedOutToday
                        ? 'bg-blue-50/70 border-blue-200'
                        : isPastShiftEnd
                        ? 'bg-rose-50/80 border-rose-300'
                        : 'bg-amber-50/70 border-amber-200'
                    } space-y-1.5`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold flex items-center gap-1.5 ${
                          hasCheckedOutToday
                            ? 'text-blue-800'
                            : isPastShiftEnd
                            ? 'text-rose-800'
                            : 'text-amber-800'
                        }`}
                      >
                        {hasCheckedOutToday ? (
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        ) : isPastShiftEnd ? (
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-600" />
                        )}
                        <span>{lang === 'km' ? 'ម៉ោងស្កេនចេញ (Check-Out)' : 'Check-Out Time'}</span>
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          hasCheckedOutToday
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : isPastShiftEnd
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}
                      >
                        {hasCheckedOutToday
                          ? lang === 'km'
                            ? 'បានស្កេនចេញរួច'
                            : 'Checked Out'
                          : isPastShiftEnd
                          ? lang === 'km'
                            ? '⚠️ ភ្លេចស្កេនចេញ / មិនទាន់ចេញ'
                            : '⚠️ Forgot Check-Out'
                          : lang === 'km'
                          ? 'កំពុងធ្វើការ (On Duty)'
                          : 'Still Working'}
                      </span>
                    </div>

                    <div className="text-2xl font-black font-mono text-slate-900">
                      {hasCheckedOutToday
                        ? checkOutTimeStr
                        : isPastShiftEnd
                        ? lang === 'km'
                          ? 'មិនទាន់ស្កេនចេញ'
                          : 'Not Checked Out'
                        : '--:--'}
                    </div>

                    <p className="text-[11px] text-slate-600 font-medium">
                      {lastCheckOut
                        ? `${lang === 'km' ? 'ទីតាំង GPS:' : 'GPS Distance:'} ${formatDistance(
                            lastCheckOut.distanceToBranch,
                            lang
                          )} • ${
                            lang === 'km'
                              ? `សរុប ${workedHoursToday} ម៉ោង`
                              : `Worked ${workedHoursToday} hrs`
                          }`
                        : isPastShiftEnd
                        ? lang === 'km'
                          ? `ផុតម៉ោងចេញវេន (${endTimeStr}) ហើយ ប៉ុន្តែបុគ្គលិកមិនទាន់ស្កេនចេញ ឬភ្លេចស្កេនចេញ`
                          : `Shift ended at ${endTimeStr}, but employee has not scanned Check-Out yet`
                        : lang === 'km'
                        ? `កំពុងបំពេញការងារក្នុងវេន (ម៉ោងចេញកំណត់: ${endTimeStr})`
                        : `Currently on shift (Scheduled end time: ${endTimeStr})`}
                    </p>

                    {isPastShiftEnd && !hasCheckedOutToday && matchedEmp && onRingStaffReminder && (
                      <button
                        type="button"
                        onClick={() => onRingStaffReminder(matchedEmp, 'forgot_checkout')}
                        className="w-full mt-2 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                      >
                        <Bell className="w-3.5 h-3.5 animate-bounce" />
                        <span>{lang === 'km' ? '🔔 រោទិ៍ទូរស័ព្ទរំលឹកស្កេនចេញឥឡូវនេះ' : '🔔 Ring Staff Device to Check-Out'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: Workshift, Weekly Day Off & Overtime (OT) Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{lang === 'km' ? 'វេនការងារ (Workshift)' : 'Assigned Workshift'}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-800">
                    {empShift
                      ? lang === 'km'
                        ? empShift.nameKh
                        : empShift.nameEn
                      : shiftBadge.label}
                  </div>
                  <div className="text-[11px] font-mono font-semibold text-indigo-600">
                    {shiftHoursText}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{lang === 'km' ? 'ថ្ងៃឈប់ប្រចាំសប្តាហ៍ (Day Off)' : 'Weekly Day Off'}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-800">{dayOffName}</div>
                  <div
                    className={`text-[11px] font-bold ${
                      isWorkingOnDayOff ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {isWorkingOnDayOff
                      ? lang === 'km'
                        ? '⚡ មកធ្វើការនៅថ្ងៃសម្រាក'
                        : '⚡ Working on Day Off'
                      : lang === 'km'
                      ? '✓ ថ្ងៃធ្វើការធម្មតា'
                      : '✓ Regular Working Day'}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-purple-600" />
                    <span>{lang === 'km' ? 'ថែមម៉ោង (Overtime / OT)' : 'Overtime (OT) Status'}</span>
                  </div>
                  <div className={`text-xs font-bold ${hasOt ? 'text-purple-700' : 'text-slate-700'}`}>
                    {otDisplayLabel}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {hasOt
                      ? lang === 'km'
                        ? 'មានកំណត់ត្រាថែមម៉ោងថ្ងៃនេះ'
                        : 'Overtime recorded today'
                      : lang === 'km'
                      ? 'ម៉ោងការងារធម្មតា'
                      : 'Standard shift hours'}
                  </div>
                </div>
              </div>

              {/* Section 3: All Punches Today + Recent 7-Day Attendance History */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>
                    {lang === 'km'
                      ? 'ប្រវត្តិស្កេនចូល និងស្កេនចេញថ្មីៗ (Recent Check-In & Check-Out History)'
                      : 'Recent Check-In & Check-Out History'}
                  </span>
                  <span className="text-[11px] text-indigo-600 font-semibold">
                    {empPunchesToday.length} {lang === 'km' ? 'ដងថ្ងៃនេះ' : 'punches today'}
                  </span>
                </h4>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                      <tr>
                        <th className="py-2.5 px-3">{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                        <th className="py-2.5 px-3">{lang === 'km' ? 'ម៉ោងចូល (Check-In)' : 'Check-In'}</th>
                        <th className="py-2.5 px-3">{lang === 'km' ? 'ម៉ោងចេញ (Check-Out)' : 'Check-Out'}</th>
                        <th className="py-2.5 px-3 text-right">{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentDailyHistory.map(([dateKey, dayRecs]) => {
                        const sortedAsc = [...dayRecs].sort(
                          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                        );
                        let dayIn = sortedAsc.find((r) => r.type === 'check_in');
                        if (!dayIn && sortedAsc.length > 0 && (new Date(sortedAsc[0].timestamp).getHours() < 11 || sortedAsc.length >= 2)) {
                          dayIn = sortedAsc[0];
                        }
                        let dayOut = [...sortedAsc]
                          .reverse()
                          .find((r) => r.type === 'check_out' && (!dayIn || r.id !== dayIn.id));
                        if (!dayOut && dayIn && sortedAsc.length >= 2) {
                          const latest = sortedAsc[sortedAsc.length - 1];
                          if (latest.id !== dayIn.id) dayOut = latest;
                        }

                        const inStr = dayIn
                          ? new Date(dayIn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '--:--';
                        const outStr = dayOut
                          ? new Date(dayOut.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '--:--';
                        const isTodayRow = dateKey === today;

                        return (
                          <tr key={dateKey} className={isTodayRow ? 'bg-indigo-50/40 font-semibold' : 'hover:bg-slate-50'}>
                            <td className="py-2.5 px-3 font-mono text-slate-700">
                              {dateKey}
                              {isTodayRow && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[9px] font-bold">
                                  {lang === 'km' ? 'ថ្ងៃនេះ' : 'Today'}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-emerald-700 font-bold">{inStr}</td>
                            <td className="py-2.5 px-3 font-mono">
                              {dayOut ? (
                                <span className="text-blue-700 font-bold">{outStr}</span>
                              ) : (
                                <span className="text-rose-600 text-[11px] font-semibold">
                                  {isTodayRow && !isPastShiftEnd
                                    ? lang === 'km'
                                      ? 'កំពុងធ្វើការ'
                                      : 'Working'
                                    : lang === 'km'
                                    ? 'មិនបានស្កេនចេញ'
                                    : 'No Check-Out'}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {dayIn && dayOut ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {lang === 'km' ? 'ចូល & ចេញរួច' : 'Completed'}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  {isTodayRow && !isPastShiftEnd
                                    ? lang === 'km'
                                      ? 'កំពុងធ្វើការ'
                                      : 'On Duty'
                                    : lang === 'km'
                                    ? 'ភ្លេចស្កេនចេញ'
                                    : 'Missing Out'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {matchedEmp && onOpenTransferModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStaffInfoRecord(null);
                        onOpenTransferModal(matchedEmp);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>{lang === 'km' ? 'ផ្ទេរសាខា' : 'Transfer Branch'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStaffInfoRecord(null);
                      onNavigateTab('reports');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>{lang === 'km' ? 'មើលរបាយការណ៍លម្អិត' : 'Full Timesheet Report'}</span>
                  </button>

                  {matchedEmp && onRingStaffReminder && (
                    <button
                      type="button"
                      onClick={() =>
                        onRingStaffReminder(
                          matchedEmp,
                          isPastShiftEnd && !hasCheckedOutToday
                            ? 'forgot_checkout'
                            : !hasCheckedInToday
                            ? 'forgot_checkin'
                            : 'custom'
                        )
                      }
                      className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Bell className="w-3.5 h-3.5 text-rose-600" />
                      <span>{lang === 'km' ? 'រោទិ៍រំលឹកឧបករណ៍' : 'Ring Device'}</span>
                    </button>
                  )}

                  {matchedEmp && onUpdateEmployee && matchedEmp.gpsCalibratedBranchId && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetBranch = branches.find((b) => b.id === (matchedEmp.gpsCalibratedBranchId || matchedEmp.branchId));
                        const branchName = targetBranch ? (lang === 'km' ? targetBranch.nameKh : targetBranch.nameEn) : 'សាខា';
                        const confirmed = window.confirm(
                          lang === 'km'
                            ? `តើអ្នកចង់កំណត់ឡើងវិញនូវទីតាំង GPS ដំបូងសម្រាប់ ${matchedEmp.nameKh} (${matchedEmp.code}) លើសាខា "${branchName}" មែនទេ?\n\nបន្ទាប់ពីកំណត់ឡើងវិញ បុគ្គលិកអាចចុចកំណត់ទីតាំង GPS សាខាឡើងវិញ (Set GPS) នៅពេលពួកគេស្ថិតនៅសាខាផ្ទាល់។`
                            : `Reset 1st-time GPS calibration lock for ${matchedEmp.nameEn} (${matchedEmp.code}) at branch "${branchName}"?\n\nAfter reset, staff can calibrate branch GPS again directly at the venue.`
                        );
                        if (!confirmed) return;
                        const updated: Employee = {
                          ...matchedEmp,
                          gpsCalibratedBranchId: undefined,
                          gpsCalibratedAt: undefined,
                        };
                        onUpdateEmployee(updated);
                        alert(
                          lang === 'km'
                            ? `✅ បានកំណត់ឡើងវិញនូវទីតាំង GPS ដំបូងសម្រាប់ ${matchedEmp.nameKh} រួចរាល់! បុគ្គលិកអាចចុចកំណត់ទីតាំង GPS ឡើងវិញពេលនៅសាខា។`
                            : `✅ Successfully reset 1st-time GPS calibration for ${matchedEmp.nameEn}! Staff can now set GPS location again at the branch.`
                        );
                      }}
                      className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                      title={lang === 'km' ? 'កំណត់ទីតាំង GPS ដំបូងឡើងវិញ' : 'Reset 1st-time GPS lock'}
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                      <span>{lang === 'km' ? 'កំណត់ GPS ឡើងវិញ' : 'Reset GPS'}</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedStaffInfoRecord(null)}
                  className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition cursor-pointer"
                >
                  {lang === 'km' ? 'បិទផ្ទាំង' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Enhanced Emergency Safety Roll Call Modal */}
      {showEmergencyRollCall && (() => {
        const branchPersonnelList = rollCallPersonnelList.filter(
          (p) => rollCallBranchId === 'all' || p.employee.branchId === rollCallBranchId
        );

        const totalCount = branchPersonnelList.length;
        const onSiteCount = branchPersonnelList.filter((p) => p.rollCallStatus === 'on_site').length;
        const forgotCheckoutCount = branchPersonnelList.filter((p) => p.rollCallStatus === 'forgot_checkout').length;
        const missingCheckInCount = branchPersonnelList.filter((p) => p.rollCallStatus === 'missing_checkin').length;
        const checkedOutCount = branchPersonnelList.filter((p) => p.rollCallStatus === 'checked_out').length;
        const dayOffLeaveCount = branchPersonnelList.filter((p) => p.rollCallStatus === 'day_off_leave').length;
        const totalInsideBuilding = onSiteCount + forgotCheckoutCount;

        const forgotCheckoutEmps = branchPersonnelList
          .filter((p) => p.rollCallStatus === 'forgot_checkout')
          .map((p) => p.employee);

        const missingCheckInEmps = branchPersonnelList
          .filter((p) => p.rollCallStatus === 'missing_checkin')
          .map((p) => p.employee);

        const onSiteEmps = branchPersonnelList.filter((p) => p.isOnSite).map((p) => p.employee);

        const displayedRollCallList = branchPersonnelList.filter((item) => {
          if (rollCallTab !== 'all' && item.rollCallStatus !== rollCallTab) {
            return false;
          }
          if (rollCallSearchQuery && rollCallSearchQuery.trim()) {
            const q = String(rollCallSearchQuery).toLowerCase().trim();
            const matchNameKh = String(item.employee.nameKh || '').toLowerCase().includes(q);
            const matchNameEn = String(item.employee.nameEn || '').toLowerCase().includes(q);
            const matchCode = String(item.employee.code || '').toLowerCase().includes(q);
            const matchPhone = String(item.employee.phone || '').includes(q);
            const matchDept = String(item.employee.department || item.employee.departmentKh || '').toLowerCase().includes(q);
            return matchNameKh || matchNameEn || matchCode || matchPhone || matchDept;
          }
          return true;
        });

        return (
          <div
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setShowEmergencyRollCall(false)}
          >
            <div
              className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full p-4 sm:p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[94vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0 shadow-sm">
                    <ShieldAlert className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
                      <span>{lang === 'km' ? 'បញ្ជីឈ្មោះបុគ្គលិកមានវត្តមានជាក់ស្តែង (Safety Emergency Roll Call)' : 'Emergency Safety Roll Call'}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                        {totalInsideBuilding} {lang === 'km' ? 'នាក់ក្នុងអាគារ' : 'On-Site / Overdue'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {lang === 'km'
                        ? 'ត្រួតពិនិត្យវត្តមានបុគ្គលិកកំពុងបំពេញការងារ ផ្ទៀងផ្ទាត់ GPS អ្នកភ្លេចស្កេនចេញ និងរោទិ៍រំលឹកឧបករណ៍បន្ទាន់'
                        : 'Accurate personnel headcount, GPS geofence verification, overdue shifts & remote alarm ringing.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowEmergencyRollCall(false)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Branch Filter & Search Input Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-1">
                  {/* Branch selector */}
                  <select
                    value={rollCallBranchId}
                    onChange={(e) => setRollCallBranchId(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 shrink-0"
                  >
                    <option value="all">{lang === 'km' ? 'គ្រប់សាខាទាំងអស់' : 'All Branches'}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {lang === 'km' ? b.nameKh : b.nameEn}
                      </option>
                    ))}
                  </select>

                  {/* Search query input */}
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={rollCallSearchQuery}
                      onChange={(e) => setRollCallSearchQuery(e.target.value)}
                      placeholder={lang === 'km' ? 'ស្វែងរកឈ្មោះ លេខកូដ ទូរស័ព្ទ ឬតួនាទី...' : 'Search staff by name, code, phone, role...'}
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    {rollCallSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setRollCallSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Bulk Actions: Ring Missing / Forgot Check-Out Staff */}
                <div className="flex items-center gap-2 shrink-0">
                  {forgotCheckoutCount > 0 && onRingBulkStaffReminders && (
                    <button
                      type="button"
                      onClick={() => onRingBulkStaffReminders(forgotCheckoutEmps, 'forgot_checkout')}
                      className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      title={lang === 'km' ? 'រោទិ៍សំឡេងរំលឹកទៅកាន់ទូរស័ព្ទអ្នកភ្លេចស្កេនចេញទាំងអស់' : 'Ring alarm on devices of all staff who forgot to check out'}
                    >
                      <Bell className="w-3.5 h-3.5 animate-bounce" />
                      <span>{lang === 'km' ? `រោទិ៍អ្នកភ្លេចចេញ (${forgotCheckoutCount})` : `Ring Forgot Out (${forgotCheckoutCount})`}</span>
                    </button>
                  )}

                  {missingCheckInCount > 0 && onRingBulkStaffReminders && (
                    <button
                      type="button"
                      onClick={() => onRingBulkStaffReminders(missingCheckInEmps, 'forgot_checkin')}
                      className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      title={lang === 'km' ? 'រោទិ៍សំឡេងរំលឹកទៅកាន់ទូរស័ព្ទអ្នកមិនទាន់ស្កេនចូលទាំងអស់' : 'Ring alarm on devices of all missing check-in staff'}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>{lang === 'km' ? `រោទិ៍អ្នកអវត្តមាន (${missingCheckInCount})` : `Ring Missing In (${missingCheckInCount})`}</span>
                    </button>
                  )}

                  {totalInsideBuilding > 0 && onRingBulkStaffReminders && (
                    <button
                      type="button"
                      onClick={() => onRingBulkStaffReminders(onSiteEmps, 'emergency_roll_call')}
                      className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      title={lang === 'km' ? 'រោទិ៍សំឡេងអាសន្នទៅកាន់បុគ្គលិកទាំងអស់ក្នុងអាគារ' : 'Ring emergency safety alarm on all personnel devices'}
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      <span>{lang === 'km' ? `រោទិ៍បន្ទាន់ (${totalInsideBuilding})` : `Ring All On-Site (${totalInsideBuilding})`}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status Classification Tabs with Live Counts */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setRollCallTab('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    rollCallTab === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{lang === 'km' ? 'ទាំងអស់' : 'All Roster'}</span>
                  <span className="text-[10px] opacity-80 font-mono">({totalCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRollCallTab('on_site')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    rollCallTab === 'on_site'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{lang === 'km' ? 'កំពុងមានវត្តមាន' : 'On-Site Now'}</span>
                  <span className="text-[10px] font-mono">({onSiteCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRollCallTab('forgot_checkout')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    rollCallTab === 'forgot_checkout'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{lang === 'km' ? 'ភ្លេចស្កេនចេញ / ផុតម៉ោង' : 'Forgot Check-Out'}</span>
                  <span className="text-[10px] font-mono font-bold">({forgotCheckoutCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRollCallTab('missing_checkin')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    rollCallTab === 'missing_checkin'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{lang === 'km' ? 'អវត្តមាន / មិនទាន់ចូល' : 'Missing Check-In'}</span>
                  <span className="text-[10px] font-mono">({missingCheckInCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRollCallTab('checked_out')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    rollCallTab === 'checked_out'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{lang === 'km' ? 'ចេញរួច (Safe)' : 'Checked Out'}</span>
                  <span className="text-[10px] font-mono">({checkedOutCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRollCallTab('day_off_leave')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    rollCallTab === 'day_off_leave'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{lang === 'km' ? 'សម្រាក / ច្បាប់' : 'Day Off / Leave'}</span>
                  <span className="text-[10px] font-mono">({dayOffLeaveCount})</span>
                </button>
              </div>

              {/* Roster Cards List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[58vh]">
                {displayedRollCallList.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-400 space-y-2">
                    <p className="text-sm font-bold text-slate-600">
                      {lang === 'km' ? 'រកមិនឃើញបុគ្គលិកក្នុងផ្នែកនេះទេ' : 'No personnel found matching this filter'}
                    </p>
                    <p className="text-xs">
                      {lang === 'km' ? 'សូមជ្រើសរើសសាខា ឬផ្នែកផ្សេងទៀត' : 'Try selecting another branch or status tab'}
                    </p>
                  </div>
                ) : (
                  displayedRollCallList.map((item) => {
                    const {
                      employee,
                      branch,
                      empShift,
                      shiftHoursText,
                      shiftBadge,
                      isDayOffToday,
                      dayOffName,
                      hasApprovedLeaveToday,
                      firstCheckIn,
                      lastCheckOut,
                      hasCheckedInToday,
                      hasCheckedOutToday,
                      isPastShiftEnd,
                      endTimeStr,
                      rollCallStatus,
                      elapsedTimeText,
                      checkInTimeStr,
                      checkOutTimeStr,
                      latestRecord,
                    } = item;

                    const avatarSrc =
                      employee.avatar ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

                    const hasGps = latestRecord && latestRecord.lat && latestRecord.lng;
                    const googleMapsUrl = hasGps
                      ? `https://www.google.com/maps?q=${latestRecord.lat},${latestRecord.lng}`
                      : null;

                    return (
                      <div
                        key={employee.id}
                        className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                          rollCallStatus === 'forgot_checkout'
                            ? 'bg-rose-50/50 border-rose-300 hover:border-rose-400 shadow-xs'
                            : rollCallStatus === 'on_site'
                            ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300'
                            : rollCallStatus === 'missing_checkin'
                            ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                            : rollCallStatus === 'checked_out'
                            ? 'bg-blue-50/30 border-blue-200'
                            : 'bg-slate-50 border-slate-200 opacity-80'
                        }`}
                      >
                        {/* Top Card Row: Avatar, Identity, Status Badges & Direct Actions */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center space-x-3 min-w-0">
                            {/* Clickable Avatar: opens full Staff Info Popup Modal */}
                            <button
                              type="button"
                              onClick={() => {
                                if (latestRecord) {
                                  setSelectedStaffInfoRecord(latestRecord);
                                } else {
                                  // Synthetic record to open profile
                                  setSelectedStaffInfoRecord({
                                    id: `rollcall_${employee.id}`,
                                    employeeId: employee.id,
                                    employeeCode: employee.code,
                                    employeeNameKh: employee.nameKh,
                                    employeeNameEn: employee.nameEn,
                                    employeeAvatar: employee.avatar,
                                    branchId: employee.branchId,
                                    branchNameKh: branch.nameKh,
                                    branchNameEn: branch.nameEn,
                                    type: 'check_in',
                                    timestamp: new Date().toISOString(),
                                    lat: 0,
                                    lng: 0,
                                    distanceToBranch: 0,
                                    isWithinGeofence: true,
                                    method: 'qr_mobile',
                                    status: 'on_time',
                                  });
                                }
                              }}
                              className="relative shrink-0 group/avatar cursor-pointer"
                              title={lang === 'km' ? 'ចុចដើម្បីមើលព័ត៌មានលម្អិត' : 'Click to view full staff profile'}
                            >
                              <img
                                src={avatarSrc}
                                alt={employee.nameEn || 'Staff'}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src =
                                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                                }}
                                className={`w-12 h-12 rounded-2xl object-cover border-2 shadow-xs bg-slate-200 group-hover/avatar:scale-105 transition-all ${
                                  rollCallStatus === 'forgot_checkout'
                                    ? 'border-rose-400'
                                    : rollCallStatus === 'on_site'
                                    ? 'border-emerald-500'
                                    : 'border-slate-300'
                                }`}
                              />
                              <span
                                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-xs ${
                                  rollCallStatus === 'on_site'
                                    ? 'bg-emerald-500'
                                    : rollCallStatus === 'forgot_checkout'
                                    ? 'bg-rose-600'
                                    : rollCallStatus === 'checked_out'
                                    ? 'bg-blue-600'
                                    : 'bg-slate-400'
                                }`}
                              >
                                {rollCallStatus === 'on_site' ? '✓' : rollCallStatus === 'forgot_checkout' ? '!' : '•'}
                              </span>
                            </button>

                            <div className="min-w-0">
                              <div className="flex items-center flex-wrap gap-1.5">
                                <span className="font-black text-slate-900 text-sm truncate max-w-[170px]">
                                  {lang === 'km' ? employee.nameKh : employee.nameEn}
                                </span>
                                <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-bold border border-indigo-200">
                                  {employee.code}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-600 bg-slate-200/80 px-1.5 py-0.5 rounded">
                                  {employee.roleKh || employee.role || 'Staff'}
                                </span>
                              </div>

                              <p className="text-xs text-slate-500 truncate mt-0.5">
                                <span className="text-indigo-600 font-bold">{branch.nameEn}</span>
                                {employee.departmentKh && (
                                  <>
                                    <span> • </span>
                                    <span>{lang === 'km' ? employee.departmentKh : employee.department}</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Quick Action Buttons: Call Phone & Ring Device */}
                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            {/* Call phone */}
                            {employee.phone && (
                              <a
                                href={`tel:${employee.phone}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition"
                                title={lang === 'km' ? `ខលទៅ ${employee.phone}` : `Call ${employee.phone}`}
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>{employee.phone}</span>
                              </a>
                            )}

                            {/* Ring device button */}
                            {onRingStaffReminder && (
                              <button
                                type="button"
                                onClick={() =>
                                  onRingStaffReminder(
                                    employee,
                                    rollCallStatus === 'forgot_checkout'
                                      ? 'forgot_checkout'
                                      : rollCallStatus === 'missing_checkin'
                                      ? 'forgot_checkin'
                                      : 'emergency_roll_call'
                                  )
                                }
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                                  rollCallStatus === 'forgot_checkout'
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                                    : rollCallStatus === 'missing_checkin'
                                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                    : 'bg-slate-800 hover:bg-slate-900 text-white'
                                }`}
                                title={lang === 'km' ? 'រោទិ៍សំឡេងរំលឹកទៅកាន់ទូរស័ព្ទរបស់បុគ្គលិកនេះ' : 'Trigger loud ringing alarm on staff device'}
                              >
                                <Bell className="w-3.5 h-3.5" />
                                <span>{lang === 'km' ? 'រោទិ៍ឧបករណ៍' : 'Ring Device'}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Middle Row: Paired Punches & Workshift Details Strip */}
                        <div className="flex flex-wrap items-center gap-2 text-xs bg-white/70 p-2.5 rounded-xl border border-slate-200/80">
                          {/* Check-In */}
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-800">
                            <span className="text-emerald-700">{lang === 'km' ? 'ចូល:' : 'In:'}</span>
                            <span className={hasCheckedInToday ? 'text-emerald-700 font-black' : 'text-slate-400'}>
                              {checkInTimeStr}
                            </span>
                          </span>

                          <span className="text-slate-300">|</span>

                          {/* Check-Out */}
                          <span className="inline-flex items-center gap-1 font-mono font-bold">
                            <span className="text-blue-700">{lang === 'km' ? 'ចេញ:' : 'Out:'}</span>
                            {hasCheckedOutToday ? (
                              <span className="text-blue-700 font-black">{checkOutTimeStr}</span>
                            ) : isPastShiftEnd ? (
                              <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                {lang === 'km' ? `⚠️ ភ្លេចស្កេនចេញ (ផុត ${endTimeStr})` : `⚠️ Overdue (Ends ${endTimeStr})`}
                              </span>
                            ) : (
                              <span className="text-slate-500 font-medium">
                                {hasCheckedInToday
                                  ? lang === 'km'
                                    ? `កំពុងធ្វើការ (ចេញ ${endTimeStr})`
                                    : `Working (Ends ${endTimeStr})`
                                  : '--:--'}
                              </span>
                            )}
                          </span>

                          {/* Elapsed time on site */}
                          {hasCheckedInToday && elapsedTimeText && (
                            <>
                              <span className="text-slate-300">|</span>
                              <span className="text-indigo-700 font-semibold text-[11px] bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                                ⏱️ {elapsedTimeText} {lang === 'km' ? 'ក្នុងទីតាំង' : 'on-site'}
                              </span>
                            </>
                          )}

                          <span className="text-slate-300">|</span>

                          {/* Workshift Info */}
                          <span className="text-[11px] text-slate-600 font-medium">
                            <span className="font-bold">{empShift ? (lang === 'km' ? empShift.nameKh : empShift.nameEn) : shiftBadge.label}</span>
                            <span className="text-slate-500 font-mono ml-1">({shiftHoursText})</span>
                          </span>

                          {/* Day Off badge */}
                          {isDayOffToday && (
                            <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded border border-purple-200">
                              {lang === 'km' ? 'សម្រាកប្រចាំសប្តាហ៍' : 'Day Off'}
                            </span>
                          )}

                          {hasApprovedLeaveToday && (
                            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded border border-indigo-200">
                              {lang === 'km' ? 'ច្បាប់អនុម័ត' : 'Approved Leave'}
                            </span>
                          )}
                        </div>

                        {/* Bottom Row: GPS Accuracy, Distance & Google Maps Link */}
                        {latestRecord && (
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-0.5">
                            <div className="flex items-center flex-wrap gap-2">
                              <span className="inline-flex items-center gap-1 font-medium">
                                <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span>
                                  {lang === 'km' ? 'ទីតាំងស្កេន:' : 'Scan Location:'}{' '}
                                  <strong className="text-slate-700">
                                    {formatDistance(latestRecord.distanceToBranch, lang)}
                                  </strong>
                                </span>
                              </span>

                              <span
                                className={`px-2 py-0.2 rounded text-[10px] font-bold border ${
                                  latestRecord.isWithinGeofence
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                {latestRecord.isWithinGeofence
                                  ? lang === 'km'
                                    ? '✓ ក្នុងបរិវេណ Geofence'
                                    : '✓ Within Geofence'
                                  : lang === 'km'
                                  ? '⚠️ ក្រៅបរិវេណ'
                                  : '⚠️ Out of Range'}
                              </span>

                              {latestRecord.accuracyMeters && (
                                <span className="font-mono text-slate-400 text-[10px]">
                                  (±{Math.round(latestRecord.accuracyMeters)}m accuracy)
                                </span>
                              )}
                            </div>

                            {googleMapsUrl && (
                              <a
                                href={googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold hover:underline transition"
                              >
                                <span>{lang === 'km' ? 'មើលទីតាំងលើ Google Maps' : 'View on Google Maps'}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer Summary */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
                  <span className="text-emerald-700">
                    🟢 {lang === 'km' ? 'វត្តមានជាក់ស្តែង:' : 'Active On-Site:'} {onSiteCount}
                  </span>
                  <span>•</span>
                  <span className="text-rose-600">
                    ⚠️ {lang === 'km' ? 'ភ្លេចស្កេនចេញ:' : 'Forgot Check-Out:'} {forgotCheckoutCount}
                  </span>
                  <span>•</span>
                  <span className="text-amber-700">
                    🔴 {lang === 'km' ? 'អវត្តមាន:' : 'Missing In:'} {missingCheckInCount}
                  </span>
                  <span>•</span>
                  <span className="text-blue-700">
                    🔵 {lang === 'km' ? 'ចេញរួច:' : 'Checked Out:'} {checkedOutCount}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowEmergencyRollCall(false)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition cursor-pointer"
                >
                  {lang === 'km' ? 'បិទផ្ទាំងសុវត្ថិភាព' : 'Close Safety Roster'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
