import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Coffee,
  Sun,
  Moon,
  Building2,
  ChevronLeft,
  ChevronRight,
  QrCode,
  MapPin,
  Check,
  X,
  Users,
  Search,
  Filter,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Info,
  CalendarDays,
  FileText,
  Printer
} from 'lucide-react';
import { 
  AttendanceRecord, 
  Branch, 
  Employee, 
  Language, 
  LeaveRequest, 
  Shift 
} from '../types';
import { 
  getEmployeeWeekRoster, 
  getBranchTeamRoster, 
  StaffRosterDay, 
  BranchTeamMemberRoster, 
  formatDateToYMD 
} from '../utils/rosterUtils';
import { getShiftCategoryBadge } from '../utils/dayOffUtils';

interface StaffRosterTableProps {
  currentEmployee: Employee;
  employees: Employee[];
  shifts: Shift[];
  branches: Branch[];
  attendanceRecords: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  onOpenScan: () => void;
  lang: Language;
}

export const StaffRosterTable: React.FC<StaffRosterTableProps> = ({
  currentEmployee,
  employees,
  shifts,
  branches,
  attendanceRecords,
  leaveRequests,
  onOpenScan,
  lang,
}) => {
  // Navigation: reference date for the week
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'my_roster' | 'team_roster'>('my_roster');
  
  // Team roster filters
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [teamStatusFilter, setTeamStatusFilter] = useState<'all' | 'scanned' | 'not_scanned'>('all');
  const [selectedTeamDate, setSelectedTeamDate] = useState<Date>(new Date());

  // Record detail modal
  const [selectedDayDetail, setSelectedDayDetail] = useState<StaffRosterDay | null>(null);

  const safeBranches = Array.isArray(branches) ? branches : [];
  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const safeEmployees = Array.isArray(employees) ? employees : [];
  const safeAttendance = Array.isArray(attendanceRecords) ? attendanceRecords : [];
  const safeLeaves = Array.isArray(leaveRequests) ? leaveRequests : [];

  // Current branch
  const currentBranch = safeBranches.find((b) => b && b.id === currentEmployee?.branchId) || safeBranches[0];

  // Compute Weekly Roster for current staff
  const weekRoster: StaffRosterDay[] = useMemo(() => {
    try {
      return getEmployeeWeekRoster(
        currentEmployee,
        safeShifts,
        safeAttendance,
        safeLeaves,
        referenceDate
      );
    } catch (err) {
      console.error('Error computing week roster:', err);
      return [];
    }
  }, [currentEmployee, safeShifts, safeAttendance, safeLeaves, referenceDate]);

  // Compute Team Roster for current branch on selected date
  const teamRoster: BranchTeamMemberRoster[] = useMemo(() => {
    try {
      return getBranchTeamRoster(
        currentEmployee?.branchId || '',
        safeEmployees,
        safeShifts,
        safeAttendance,
        safeLeaves,
        selectedTeamDate
      );
    } catch (err) {
      console.error('Error computing team roster:', err);
      return [];
    }
  }, [currentEmployee?.branchId, safeEmployees, safeShifts, safeAttendance, safeLeaves, selectedTeamDate]);

  // Filtered team roster
  const filteredTeamRoster = useMemo(() => {
    return teamRoster.filter((item) => {
      if (!item || !item.employee) return false;
      // Search filter
      const q = teamSearchQuery.toLowerCase().trim();
      if (q) {
        const matchName = 
          (item.employee.nameKh || '').toLowerCase().includes(q) ||
          (item.employee.nameEn || '').toLowerCase().includes(q) ||
          (item.employee.code || '').toLowerCase().includes(q) ||
          (item.employee.role || '').toLowerCase().includes(q);
        if (!matchName) return false;
      }

      // Status filter
      if (teamStatusFilter === 'scanned') {
        return Boolean(item.rosterDay?.hasScannedIn);
      }
      if (teamStatusFilter === 'not_scanned') {
        return !item.rosterDay?.hasScannedIn && !item.rosterDay?.isDayOff && !item.rosterDay?.isOnLeave;
      }
      return true;
    });
  }, [teamRoster, teamSearchQuery, teamStatusFilter]);

  // Week range label
  const weekRangeLabel = useMemo(() => {
    if (weekRoster.length < 7) return '';
    const start = weekRoster[0];
    const end = weekRoster[6];
    if (lang === 'km') {
      return `${start.formattedDateKh} - ${end.formattedDateKh} (${start.date.getFullYear()})`;
    }
    return `${start.formattedDateEn} - ${end.formattedDateEn} (${start.date.getFullYear()})`;
  }, [weekRoster, lang]);

  // Week navigation helpers
  const handlePrevWeek = () => {
    const prev = new Date(referenceDate);
    prev.setDate(prev.getDate() - 7);
    setReferenceDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(referenceDate);
    next.setDate(next.getDate() + 7);
    setReferenceDate(next);
  };

  const handleCurrentWeek = () => {
    setReferenceDate(new Date());
  };

  // Weekly summary counts
  const summaryCounts = useMemo(() => {
    let totalScheduled = 0;
    let completed = 0;
    let scannedIn = 0;
    let notScannedYet = 0;
    let daysOffOrLeave = 0;

    weekRoster.forEach((day) => {
      if (day.isDayOff || day.isOnLeave) {
        daysOffOrLeave++;
      } else {
        totalScheduled++;
        if (day.status === 'completed') completed++;
        else if (day.status === 'scanned_in') scannedIn++;
        else if (day.status === 'not_scanned') notScannedYet++;
      }
    });

    return {
      totalScheduled,
      completed,
      scannedIn,
      notScannedYet,
      daysOffOrLeave,
    };
  }, [weekRoster]);

  // Find today's roster day
  const todayRoster = useMemo(() => {
    return weekRoster.find((d) => d.isToday);
  }, [weekRoster]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-5 sm:p-7">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <CalendarDays className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg sm:text-xl font-bold text-slate-800">
                  {lang === 'km' ? 'តារាងវេនការងារ & ស្ថានភាពស្កេន' : 'Roster Schedule & Scan Tracking'}
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {lang === 'km' ? 'ផ្សាយផ្ទាល់' : 'Live Sync'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {lang === 'km'
                  ? 'ពិនិត្យមើលវេនការងាររបស់អ្នក ផ្ទៀងផ្ទាត់ថាតើបានស្កេនចូល/ចេញរួចរាល់ហើយឬនៅ និងតាមដានក្រុមការងារ'
                  : 'Check your shift roster, verify if you have scanned or yet, and see colleagues on duty'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab switcher: My Roster vs Branch Team Roster */}
        <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-2xl self-start md:self-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('my_roster')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl transition ${
              activeTab === 'my_roster'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'កាលវិភាគផ្ទាល់ខ្លួន (My Roster)' : 'My Shift Roster'}</span>
          </button>

          <button
            onClick={() => setActiveTab('team_roster')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl transition ${
              activeTab === 'team_roster'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'ក្រុមការងារសាខា (Branch Team)' : 'Branch Team Roster'}</span>
            <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded-full font-bold">
              {teamRoster.length}
            </span>
          </button>
        </div>
      </div>

      {/* TODAY'S SCAN CALLOUT BANNER - Answers: "Do they have scanned or yet?" */}
      {todayRoster && (
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          todayRoster.status === 'completed'
            ? 'bg-emerald-50/70 border-emerald-200'
            : todayRoster.status === 'scanned_in'
            ? 'bg-blue-50/70 border-blue-200'
            : todayRoster.status === 'not_scanned'
            ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-200/50'
            : todayRoster.status === 'on_leave'
            ? 'bg-purple-50/70 border-purple-200'
            : 'bg-slate-50/80 border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                todayRoster.status === 'completed'
                  ? 'bg-emerald-600 text-white'
                  : todayRoster.status === 'scanned_in'
                  ? 'bg-blue-600 text-white animate-pulse'
                  : todayRoster.status === 'not_scanned'
                  ? 'bg-amber-500 text-white animate-bounce'
                  : todayRoster.status === 'on_leave'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-500 text-white'
              }`}>
                {todayRoster.status === 'completed' && <CheckCircle2 className="w-6 h-6" />}
                {todayRoster.status === 'scanned_in' && <Clock className="w-6 h-6" />}
                {todayRoster.status === 'not_scanned' && <AlertCircle className="w-6 h-6" />}
                {todayRoster.status === 'on_leave' && <Calendar className="w-6 h-6" />}
                {todayRoster.status === 'day_off' && <Coffee className="w-6 h-6" />}
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center space-x-2 flex-wrap">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs">
                    📅 {lang === 'km' ? `ថ្ងៃនេះ: ថ្ងៃ${todayRoster.dayNameKh}` : `Today: ${todayRoster.dayNameEn}`}
                  </span>
                  
                  {/* The direct scan answer badge */}
                  {todayRoster.status === 'completed' && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {lang === 'km' ? '✅ បានស្កេនរួចរាល់ពេញលេញ (ចូល & ចេញ)' : '✅ Fully Scanned (In & Out Completed)'}
                    </span>
                  )}
                  {todayRoster.status === 'scanned_in' && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      {lang === 'km' ? '🟢 បានស្កេនចូលហើយ (កំពុងបំពេញការងារ)' : '🟢 Scanned In (Currently Working)'}
                    </span>
                  )}
                  {todayRoster.status === 'not_scanned' && (
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-rose-600 text-white shadow-sm flex items-center gap-1 animate-pulse">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {lang === 'km' ? '⚠️ មិនទាន់បានស្កេនវត្តមាននៅឡើយទេ!' : '⚠️ NOT SCANNED YET!'}
                    </span>
                  )}
                  {todayRoster.status === 'day_off' && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-200 text-slate-800 border border-slate-300">
                      🏖️ {todayRoster.dayOffReasonKh || (lang === 'km' ? 'ថ្ងៃសម្រាក' : 'Day Off')}
                    </span>
                  )}
                  {todayRoster.status === 'on_leave' && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-purple-100 text-purple-800 border border-purple-300">
                      🌴 {lang === 'km' ? 'ច្បាប់ឈប់សម្រាក' : 'On Leave'}
                    </span>
                  )}
                </div>

                <h4 className="text-sm sm:text-base font-bold text-slate-900 pt-0.5">
                  {lang === 'km' 
                    ? (todayRoster.shift?.nameKh || todayRoster.shift?.nameEn || 'វេនការងារ') 
                    : (todayRoster.shift?.nameEn || todayRoster.shift?.nameKh || 'Assigned Shift')}
                  <span className="text-indigo-600 font-mono font-medium ml-2 text-xs sm:text-sm">
                    ({todayRoster.scheduledStart} - {todayRoster.scheduledEnd})
                  </span>
                </h4>

                <p className="text-xs text-slate-600 font-medium flex items-center gap-2 flex-wrap">
                  {todayRoster.actualInTime && (
                    <span className="font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                      🕒 {lang === 'km' ? 'ម៉ោងចូល:' : 'Clock In:'} {todayRoster.actualInTime}
                      {todayRoster.isLate && (
                        <span className="ml-1 text-rose-600">({lang === 'km' ? `យឺត ${todayRoster.lateMinutes} នាទី` : `Late ${todayRoster.lateMinutes}m`})</span>
                      )}
                    </span>
                  )}
                  {todayRoster.actualOutTime && (
                    <span className="font-bold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded">
                      🕒 {lang === 'km' ? 'ម៉ោងចេញ:' : 'Clock Out:'} {todayRoster.actualOutTime}
                    </span>
                  )}
                  {todayRoster.durationWorkedText && (
                    <span className="text-slate-500 font-mono">
                      ⏱️ {lang === 'km' ? 'រយៈពេល:' : 'Duration:'} {todayRoster.durationWorkedText}
                    </span>
                  )}
                  {todayRoster.status === 'not_scanned' && (
                    <span className="text-amber-800 font-medium">
                      {lang === 'km'
                        ? '👉 សូមចុចប៊ូតុង "ស្កេនវត្តមានឥឡូវនេះ" ដើម្បីផ្ទៀងផ្ទាត់ QR & GPS ទីតាំងសាខា'
                        : '👉 Click "Scan Attendance Now" to verify QR & branch GPS location'}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Quick direct scan button */}
            <div className="shrink-0 w-full sm:w-auto">
              {todayRoster.canScanIn && (
                <button
                  onClick={onOpenScan}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-300 hover:shadow-indigo-400 transition cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>{lang === 'km' ? 'ស្កេនចូលវត្តមានឥឡូវនេះ' : 'Scan Check-In Now'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {todayRoster.canScanOut && (
                <button
                  onClick={onOpenScan}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-300 hover:shadow-blue-400 transition cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>{lang === 'km' ? 'ស្កេនចេញ (Check-Out)' : 'Scan Check-Out Now'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {todayRoster.status === 'completed' && (
                <div className="text-center sm:text-right">
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{lang === 'km' ? 'បានបំពេញរួចរាល់' : 'Shift Completed'}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 1: MY SHIFT ROSTER TABLE */}
      {activeTab === 'my_roster' && (
        <div className="space-y-5">
          {/* Week Selector Bar & Metrics */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            {/* Week navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrevWeek}
                title={lang === 'km' ? 'សប្តាហ៍មុន' : 'Previous Week'}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition shadow-2xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={handleCurrentWeek}
                className="px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-xs shadow-2xs transition"
              >
                {lang === 'km' ? 'សប្តាហ៍នេះ (This Week)' : 'This Week'}
              </button>

              <button
                onClick={handleNextWeek}
                title={lang === 'km' ? 'សប្តាហ៍បន្ទាប់' : 'Next Week'}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition shadow-2xs"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="ml-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{weekRangeLabel}</span>
                </span>
              </div>
            </div>

            {/* Quick Metrics Chips */}
            <div className="flex items-center flex-wrap gap-2 text-xs">
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-slate-500 font-medium">{lang === 'km' ? 'វេនការងារសរុប:' : 'Scheduled:'}</span>
                <span className="font-bold text-slate-800">{summaryCounts.totalScheduled}</span>
              </div>

              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-medium">{lang === 'km' ? 'បានស្កេនរួច:' : 'Scanned:'}</span>
                <span className="font-bold">{summaryCounts.completed}</span>
              </div>

              {summaryCounts.notScannedYet > 0 && (
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 shadow-2xs">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-medium">{lang === 'km' ? 'មិនទាន់ស្កេន:' : 'Not Scanned:'}</span>
                  <span className="font-bold">{summaryCounts.notScannedYet}</span>
                </div>
              )}

              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 shadow-2xs">
                <span className="font-medium">{lang === 'km' ? 'សម្រាក/ច្បាប់:' : 'Off/Leave:'}</span>
                <span className="font-bold">{summaryCounts.daysOffOrLeave}</span>
              </div>
            </div>
          </div>

          {/* THE ROSTER TABLE */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4">{lang === 'km' ? 'ថ្ងៃ & កាលបរិច្ឆេទ' : 'Day & Date'}</th>
                  <th className="py-3.5 px-4">{lang === 'km' ? 'វេនការងារ (Shift)' : 'Assigned Shift'}</th>
                  <th className="py-3.5 px-4 text-center">{lang === 'km' ? 'ស្ថានភាពស្កេន (Scanned or Not?)' : 'Scan Status'}</th>
                  <th className="py-3.5 px-4">{lang === 'km' ? 'ម៉ោងស្កេនចូល (Check In)' : 'Check In'}</th>
                  <th className="py-3.5 px-4">{lang === 'km' ? 'ម៉ោងស្កេនចេញ (Check Out)' : 'Check Out'}</th>
                  <th className="py-3.5 px-4">{lang === 'km' ? 'រយៈពេលបំពេញការងារ' : 'Duration'}</th>
                  <th className="py-3.5 px-4">{lang === 'km' ? 'ទីតាំង & GPS' : 'Branch / Location'}</th>
                  <th className="py-3.5 px-4 text-right">{lang === 'km' ? 'សកម្មភាព' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {weekRoster.map((day) => {
                  const catBadge = getShiftCategoryBadge(day.shift?.id || '', lang);
                  const isRowToday = day.isToday;

                  return (
                    <tr
                      key={day.dateStr}
                      className={`transition ${
                        isRowToday
                          ? 'bg-indigo-50/40 hover:bg-indigo-50/60 font-medium ring-1 ring-inset ring-indigo-200'
                          : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Day & Date */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center shrink-0 text-center font-bold ${
                            isRowToday
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            <span className="text-[10px] uppercase leading-none">
                              {lang === 'km' ? (day.dayShortKh || '').slice(0, 3) : day.dayShortEn}
                            </span>
                            <span className="text-xs font-mono leading-tight">
                              {day.date ? day.date.getDate() : '-'}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-slate-800">
                                {lang === 'km' ? `ថ្ងៃ${day.dayNameKh || ''}` : day.dayNameEn}
                              </span>
                              {isRowToday && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-600 text-white shadow-2xs">
                                  {lang === 'km' ? 'ថ្ងៃនេះ' : 'TODAY'}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {day.dateStr}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Shift */}
                      <td className="py-3.5 px-4">
                        {day.isDayOff ? (
                          <span className="inline-flex items-center space-x-1 text-slate-500 font-medium">
                            <Coffee className="w-3.5 h-3.5 text-slate-400" />
                            <span>{day.dayOffReasonKh || (lang === 'km' ? 'ថ្ងៃឈប់សម្រាក' : 'Day Off')}</span>
                          </span>
                        ) : day.isOnLeave ? (
                          <span className="inline-flex items-center space-x-1 text-purple-700 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-purple-500" />
                            <span>{day.leaveRequest?.typeKh || day.leaveRequest?.type || 'ច្បាប់ឈប់សម្រាក'}</span>
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-slate-800">
                                {lang === 'km' 
                                  ? (day.shift?.nameKh || day.shift?.nameEn || 'វេនការងារ') 
                                  : (day.shift?.nameEn || day.shift?.nameKh || 'Assigned Shift')}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-[11px]">
                              <span className="font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 font-semibold">
                                🕒 {day.scheduledStart} - {day.scheduledEnd}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${catBadge.badgeBg} ${catBadge.badgeText} ${catBadge.badgeBorder}`}>
                                {catBadge.label}
                              </span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Scan Status: Scanned or Not Yet? */}
                      <td className="py-3.5 px-4 text-center">
                        {day.status === 'completed' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{lang === 'km' ? 'បានស្កេនចូល & ចេញ' : 'Completed'}</span>
                          </span>
                        )}

                        {day.status === 'scanned_in' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 animate-pulse">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            <span>{lang === 'km' ? 'បានស្កេនចូល' : 'Scanned In'}</span>
                          </span>
                        )}

                        {day.status === 'not_scanned' && (
                          <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isRowToday
                              ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>{lang === 'km' ? 'មិនទាន់ស្កេន' : 'Not Scanned Yet'}</span>
                          </span>
                        )}

                        {day.status === 'day_off' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            <Coffee className="w-3 h-3 text-slate-400" />
                            <span>{lang === 'km' ? 'ថ្ងៃសម្រាក' : 'Day Off'}</span>
                          </span>
                        )}

                        {day.status === 'on_leave' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            <Calendar className="w-3 h-3 text-purple-600" />
                            <span>{lang === 'km' ? 'សុំច្បាប់' : 'On Leave'}</span>
                          </span>
                        )}

                        {day.status === 'future' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
                            <Clock3 className="w-3 h-3" />
                            <span>{lang === 'km' ? 'វេនគ្រោងទុក' : 'Scheduled'}</span>
                          </span>
                        )}
                      </td>

                      {/* Check-In Record */}
                      <td className="py-3.5 px-4">
                        {day.checkInRecord ? (
                          <div className="space-y-0.5">
                            <span className="font-mono font-bold text-slate-800 text-xs flex items-center gap-1">
                              <span>🕒 {day.actualInTime}</span>
                            </span>
                            <div className="flex items-center space-x-1">
                              {day.isLate ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                  {lang === 'km' ? `យឺត ${day.lateMinutes} នាទី` : `Late ${day.lateMinutes}m`}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {lang === 'km' ? 'ទាន់ពេល' : 'On-Time'}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Check-Out Record */}
                      <td className="py-3.5 px-4">
                        {day.checkOutRecord ? (
                          <span className="font-mono font-bold text-slate-800 text-xs">
                            🕒 {day.actualOutTime}
                          </span>
                        ) : day.hasScannedIn && isRowToday ? (
                          <span className="text-[11px] text-blue-600 font-medium">
                            {lang === 'km' ? 'កំពុងបំពេញការងារ...' : 'In progress...'}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Worked Duration */}
                      <td className="py-3.5 px-4">
                        {day.durationWorkedText ? (
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            ⏱️ {day.durationWorkedText}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Branch & GPS Status */}
                      <td className="py-3.5 px-4">
                        {day.hasScanned ? (
                          <div className="space-y-0.5">
                            <span className="text-slate-700 font-medium truncate block max-w-[130px]">
                              {currentBranch?.nameEn || 'Assigned Branch'}
                            </span>
                            <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>{lang === 'km' ? 'GPS បានផ្ទៀងផ្ទាត់' : 'GPS Verified'}</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">{currentBranch?.nameEn || '-'}</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        {day.canScanIn && (
                          <button
                            onClick={onOpenScan}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition flex items-center space-x-1 ml-auto cursor-pointer"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>{lang === 'km' ? 'ស្កេនចូល' : 'Punch In'}</span>
                          </button>
                        )}

                        {day.canScanOut && (
                          <button
                            onClick={onOpenScan}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center space-x-1 ml-auto cursor-pointer"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>{lang === 'km' ? 'ស្កេនចេញ' : 'Punch Out'}</span>
                          </button>
                        )}

                        {day.hasScanned && (
                          <button
                            onClick={() => setSelectedDayDetail(day)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition"
                            title={lang === 'km' ? 'មើលព័ត៌មានលម្អិត' : 'View Punch Details'}
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: BRANCH TEAM ROSTER TABLE */}
      {activeTab === 'team_roster' && (
        <div className="space-y-5">
          {/* Header & Filter Controls for Team */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center space-x-3">
              <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                <Building2 className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  {lang === 'km'
                    ? `កាលវិភាគវេន & វត្តមានបុគ្គលិកសាខា "${currentBranch?.nameKh || 'សាខា'}"`
                    : `Shift Roster & Scan Status for "${currentBranch?.nameEn || 'Branch'}"`}
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  {lang === 'km'
                    ? 'ដឹងថាតើសហការីរូបណាខ្លះត្រូវបំពេញការងារវេនថ្ងៃនេះ ហើយបានស្កេនចូលឬនៅ'
                    : 'See which colleagues are on shift today and whether they have scanned in yet'}
                </p>
              </div>
            </div>

            {/* Quick Status Filter Tabs */}
            <div className="flex items-center space-x-1.5 text-xs font-bold bg-white p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setTeamStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  teamStatusFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lang === 'km' ? 'ទាំងអស់' : 'All'} ({teamRoster.length})
              </button>
              <button
                onClick={() => setTeamStatusFilter('scanned')}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                  teamStatusFilter === 'scanned'
                    ? 'bg-emerald-600 text-white'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>{lang === 'km' ? 'បានស្កេន' : 'Scanned'} ({teamRoster.filter(r => r.rosterDay.hasScannedIn).length})</span>
              </button>
              <button
                onClick={() => setTeamStatusFilter('not_scanned')}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                  teamStatusFilter === 'not_scanned'
                    ? 'bg-amber-600 text-white'
                    : 'text-amber-700 hover:bg-amber-50'
                }`}
              >
                <AlertCircle className="w-3 h-3" />
                <span>{lang === 'km' ? 'មិនទាន់ស្កេន' : 'Not Yet'} ({teamRoster.filter(r => !r.rosterDay.hasScannedIn && !r.rosterDay.isDayOff && !r.rosterDay.isOnLeave).length})</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={teamSearchQuery}
              onChange={(e) => setTeamSearchQuery(e.target.value)}
              placeholder={lang === 'km' ? 'ស្វែងរកសហការីតាមឈ្មោះ កូដ ឬតួនាទី...' : 'Search teammate by name, code, or role...'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Team Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">{lang === 'km' ? 'បុគ្គលិក (Staff Member)' : 'Teammate'}</th>
                  <th className="py-3 px-4">{lang === 'km' ? 'វេនការងារ (Shift)' : 'Assigned Shift'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'km' ? 'បានស្កេនឬនៅ? (Scanned or Not?)' : 'Scan Status'}</th>
                  <th className="py-3 px-4">{lang === 'km' ? 'ម៉ោងស្កេនចូល' : 'Check-In Time'}</th>
                  <th className="py-3 px-4">{lang === 'km' ? 'ស្ថានភាពទីតាំង' : 'Geofence / Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTeamRoster.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      {lang === 'km' ? 'រកមិនឃើញទិន្នន័យបុគ្គលិកឡើយ' : 'No teammates found matching your filter.'}
                    </td>
                  </tr>
                ) : (
                  filteredTeamRoster.map(({ employee, rosterDay }) => {
                    const isSelf = Boolean(
                      employee &&
                      currentEmployee &&
                      (employee.id === currentEmployee.id || employee.code === currentEmployee.code)
                    );

                    return (
                      <tr
                        key={employee.id}
                        className={`transition ${
                          isSelf
                            ? 'bg-indigo-50/50 hover:bg-indigo-50/70 font-medium'
                            : 'hover:bg-slate-50/60'
                        }`}
                      >
                        {/* Teammate Profile */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <img
                              src={employee.avatar || ''}
                              alt={employee.nameEn || ''}
                              className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <span className="font-bold text-slate-800">
                                  {lang === 'km' ? (employee.nameKh || employee.nameEn || 'បុគ្គលិក') : (employee.nameEn || employee.nameKh || 'Staff')}
                                </span>
                                {isSelf && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-600 text-white">
                                    {lang === 'km' ? 'ខ្ញុំ' : 'YOU'}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                                <span className="font-mono font-bold text-indigo-700">{employee.code || ''}</span>
                                <span>•</span>
                                <span>{employee.role || employee.roleKh || ''}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Shift info */}
                        <td className="py-3 px-4">
                          {rosterDay.isDayOff ? (
                            <span className="text-slate-500 font-medium flex items-center gap-1">
                              <Coffee className="w-3 h-3 text-slate-400" />
                              <span>{rosterDay.dayOffReasonKh || (lang === 'km' ? 'ថ្ងៃសម្រាក' : 'Day Off')}</span>
                            </span>
                          ) : rosterDay.isOnLeave ? (
                            <span className="text-purple-700 font-medium flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-purple-500" />
                              <span>{rosterDay.leaveRequest?.typeKh || rosterDay.leaveRequest?.type || (lang === 'km' ? 'ច្បាប់ឈប់សម្រាក' : 'On Leave')}</span>
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-800 block">
                                {lang === 'km' 
                                  ? (rosterDay.shift?.nameKh || rosterDay.shift?.nameEn || 'វេនការងារ') 
                                  : (rosterDay.shift?.nameEn || rosterDay.shift?.nameKh || 'Assigned Shift')}
                              </span>
                              <span className="font-mono text-slate-500 text-[11px]">
                                {rosterDay.scheduledStart || '08:00'} - {rosterDay.scheduledEnd || '17:00'}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Scan status: Scanned or Not Yet? */}
                        <td className="py-3 px-4 text-center">
                          {rosterDay.status === 'completed' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{lang === 'km' ? 'បានស្កេនរួច (ចេញចូល)' : 'Completed'}</span>
                            </span>
                          )}

                          {rosterDay.status === 'scanned_in' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                              <Clock className="w-3.5 h-3.5 text-blue-600" />
                              <span>{lang === 'km' ? 'បានស្កេនចូលហើយ' : 'Scanned In'}</span>
                            </span>
                          )}

                          {rosterDay.status === 'not_scanned' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                              <span>{lang === 'km' ? 'មិនទាន់ស្កេន' : 'Not Scanned Yet'}</span>
                            </span>
                          )}

                          {rosterDay.status === 'day_off' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                              <Coffee className="w-3 h-3 text-slate-400" />
                              <span>{lang === 'km' ? 'សម្រាក' : 'Day Off'}</span>
                            </span>
                          )}

                          {rosterDay.status === 'on_leave' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
                              <Calendar className="w-3 h-3 text-purple-600" />
                              <span>{lang === 'km' ? 'សុំច្បាប់' : 'On Leave'}</span>
                            </span>
                          )}
                        </td>

                        {/* Check In Time */}
                        <td className="py-3 px-4">
                          {rosterDay.actualInTime ? (
                            <span className="font-mono font-bold text-slate-800">
                              🕒 {rosterDay.actualInTime}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Location status */}
                        <td className="py-3 px-4">
                          {rosterDay.hasScanned ? (
                            <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>{lang === 'km' ? 'ក្នុងទីតាំងសាខា' : 'In Geofence'}</span>
                            </span>
                          ) : rosterDay.isDayOff || rosterDay.isOnLeave ? (
                            <span className="text-slate-400">-</span>
                          ) : (
                            <span className="text-[10px] text-amber-700 font-medium">
                              {lang === 'km' ? 'រង់ចាំវត្តមាន...' : 'Awaiting punch...'}
                            </span>
                          )}
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

      {/* DETAIL MODAL FOR SELECTED DAY */}
      {selectedDayDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedDayDetail(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">
                  {lang === 'km' ? `ព័ត៌មានស្កេន: ថ្ងៃ${selectedDayDetail.dayNameKh}` : `Punch Details: ${selectedDayDetail.dayNameEn}`}
                </h4>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedDayDetail.dateStr}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{lang === 'km' ? 'វេនការងារ:' : 'Shift:'}</span>
                <span className="font-bold text-slate-800">{selectedDayDetail.shift.nameEn}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{lang === 'km' ? 'ម៉ោងកំណត់:' : 'Scheduled Hours:'}</span>
                <span className="font-bold font-mono text-indigo-700">
                  {selectedDayDetail.scheduledStart} - {selectedDayDetail.scheduledEnd}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{lang === 'km' ? 'ម៉ោងស្កេនចូល:' : 'Clock In Time:'}</span>
                <span className="font-bold font-mono text-emerald-700">
                  {selectedDayDetail.actualInTime || '-'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{lang === 'km' ? 'ម៉ោងស្កេនចេញ:' : 'Clock Out Time:'}</span>
                <span className="font-bold font-mono text-blue-700">
                  {selectedDayDetail.actualOutTime || '-'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{lang === 'km' ? 'រយៈពេលបំពេញការងារ:' : 'Total Duration:'}</span>
                <span className="font-bold font-mono text-slate-800">
                  {selectedDayDetail.durationWorkedText || '-'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">{lang === 'km' ? 'ការផ្ទៀងផ្ទាត់ GPS:' : 'GPS Geofence:'}</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{lang === 'km' ? 'បានផ្ទៀងផ្ទាត់ត្រឹមត្រូវ' : 'Verified'}</span>
                </span>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={() => setSelectedDayDetail(null)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                {lang === 'km' ? 'បិទ' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
