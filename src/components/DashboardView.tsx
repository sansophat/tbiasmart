import React, { useState } from 'react';
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
  HeartPulse
} from 'lucide-react';
import { Branch, Employee, AttendanceRecord, BranchTransferRecord, AuthUser, Language, LeaveRequest } from '../types';
import { formatDistance, toKhmerNumeral } from '../utils/geoUtils';
import { DashboardLeaveApprovals } from './DashboardLeaveApprovals';
import { RealtimeActionAlertCenter, ActionAlertItem } from './RealtimeActionAlertCenter';

interface DashboardViewProps {
  branches: Branch[];
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  transferRecords?: BranchTransferRecord[];
  leaveRequests?: LeaveRequest[];
  onUpdateLeaveStatus?: (requestId: string, newStatus: 'approved' | 'rejected', comment?: string) => void;
  actionAlerts?: ActionAlertItem[];
  currentUser?: AuthUser | null;
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  onNavigateTab: (tab: string) => void;
  onOpenTransferModal?: (emp?: Employee) => void;
  lang: Language;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  branches,
  employees,
  attendanceRecords,
  transferRecords = [],
  leaveRequests = [],
  onUpdateLeaveStatus,
  actionAlerts = [],
  currentUser,
  selectedBranchId,
  setSelectedBranchId,
  onNavigateTab,
  onOpenTransferModal,
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
  
  // Emergency Roll Call Modal
  const [showEmergencyRollCall, setShowEmergencyRollCall] = useState<boolean>(false);
  const [rollCallBranchId, setRollCallBranchId] = useState<string>('all');

  // Filter records by selected branch if not 'all'
  const relevantRecords = selectedBranchId === 'all'
    ? attendanceRecords
    : attendanceRecords.filter((r) => r.branchId === selectedBranchId);

  const relevantEmployees = selectedBranchId === 'all'
    ? employees
    : employees.filter((e) => e.branchId === selectedBranchId);

  // Calculate KPIs
  const todayRecords = relevantRecords.filter((r) => r.timestamp.startsWith(today));
  const checkInRecords = todayRecords.filter((r) => r.type === 'check_in');
  
  const presentCount = new Set(checkInRecords.map((r) => r.employeeId)).size;
  const onTimeCount = checkInRecords.filter((r) => r.status === 'on_time').length;
  const lateCount = checkInRecords.filter((r) => r.status === 'late').length;
  const overtimeCount = relevantRecords.filter((r) => r.status === 'overtime').length;
  
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

  // Roll call: Currently on-site employees (checked in today and haven't checked out yet)
  const currentlyOnSiteList = employees.map((emp) => {
    const empToday = attendanceRecords.filter(
      (r) => r.employeeId === emp.id && r.timestamp.startsWith(today)
    );
    const lastRec = empToday[0]; // assuming sorted latest first
    const isOnSite = lastRec && lastRec.type === 'check_in';
    const branch = branches.find((b) => b.id === emp.branchId);
    return {
      employee: emp,
      branch,
      lastRecord: lastRec,
      isOnSite,
    };
  }).filter((item) => {
    if (!item.isOnSite) return false;
    if (rollCallBranchId !== 'all' && item.employee.branchId !== rollCallBranchId) return false;
    return true;
  });

  // If viewing as an Employee, render the dedicated Employee Home View
  if (isEmployee) {
    const myTodayRecords = attendanceRecords.filter(
      (r) => (r.employeeId === currentEmp?.id || r.employeeCode === currentUser?.employeeCode) && r.timestamp.startsWith(today)
    );
    const hasCheckedIn = myTodayRecords.some((r) => r.type === 'check_in');
    const hasCheckedOut = myTodayRecords.some((r) => r.type === 'check_out');

    // Teammates at my assigned branch
    const branchTeammates = employees.filter((e) => e.branchId === employeeAssignedBranch.id);
    const teammatesOnDuty = branchTeammates.filter((e) => {
      const empToday = attendanceRecords.filter((r) => r.employeeId === e.id && r.timestamp.startsWith(today));
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
            onNavigateToLeavesTab={() => onNavigateTab('settings')}
            lang={lang}
          />
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
              (r) => r.branchId === branch.id && r.timestamp.startsWith(today) && r.type === 'check_in'
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
        {/* Live Attendance Audit Stream (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-indigo-600 animate-pulse" />
              <h3 className="font-bold text-slate-800 text-sm">
                {lang === 'km' ? 'ទិន្នន័យវត្តមានចុងក្រោយ (Live GPS Timesheets)' : 'Real-Time Attendance Feed'}
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('reports')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition"
            >
              <span>{lang === 'km' ? 'មើលទាំងអស់' : 'View All'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 space-y-2.5 max-h-[380px] overflow-y-auto">
            {relevantRecords.slice(0, 10).map((rec) => {
              const matchedEmp = employees.find(
                (e) => e.id === rec.employeeId || e.code === rec.employeeCode
              );
              const avatarSrc =
                rec.employeeAvatar ||
                matchedEmp?.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

              return (
                <div
                  key={rec.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/80 transition"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={avatarSrc}
                      alt={rec.employeeNameEn || 'Employee'}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src =
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                      }}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-sm bg-slate-200"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-800">
                          {lang === 'km' ? rec.employeeNameKh : rec.employeeNameEn}
                        </span>
                        <span className="text-[10px] font-mono text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded font-semibold">
                          {rec.employeeCode}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="text-indigo-600 font-semibold">{rec.branchNameEn}</span>
                        <span>•</span>
                        <span className="text-slate-500 font-medium">{formatDistance(rec.distanceToBranch, lang)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="flex items-center justify-end space-x-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rec.type === 'check_in'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {rec.type === 'check_in' ? 'Check-In' : 'Check-Out'}
                      </span>

                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        rec.status === 'on_time'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : rec.status === 'late'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          rec.status === 'on_time' ? 'bg-emerald-500' : rec.status === 'late' ? 'bg-rose-500' : 'bg-purple-500'
                        }`} />
                        {rec.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono font-medium">
                      {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
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
                    (tr.employeeNameEn && e.nameEn.toLowerCase() === tr.employeeNameEn.toLowerCase())
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

      {/* Emergency Roll Call Modal */}
      {showEmergencyRollCall && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <AlertCircle className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {lang === 'km' ? 'បញ្ជីឈ្មោះបុគ្គលិកមានវត្តមានជាក់ស្តែង (Safety Roll Call)' : 'Emergency Safety Roll Call'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {lang === 'km'
                      ? 'បុគ្គលិកដែលមានវត្តមានក្នុងអាគារ/ទីតាំងពេលនេះ'
                      : 'Live roster of personnel currently checked-in on-site.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowEmergencyRollCall(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter by branch */}
            <div className="flex items-center justify-between gap-3">
              <select
                value={rollCallBranchId}
                onChange={(e) => setRollCallBranchId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="all">{lang === 'km' ? 'គ្រប់សាខាទាំងអស់' : 'All 7 Branches'}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {lang === 'km' ? b.nameKh : b.nameEn}
                  </option>
                ))}
              </select>

              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                {currentlyOnSiteList.length} {lang === 'km' ? 'នាក់កំពុងមានវត្តមាន' : 'Personnel On-Site'}
              </span>
            </div>

            {/* Roll call items */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {currentlyOnSiteList.map(({ employee, branch, lastRecord }) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={employee.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={employee.nameEn || 'Employee'}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src =
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                      }}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-xs bg-slate-200"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800 text-xs">
                          {lang === 'km' ? employee.nameKh : employee.nameEn}
                        </span>
                        <span className="text-[10px] font-mono text-slate-600 bg-slate-200 px-1 rounded font-bold">
                          {employee.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {branch?.nameEn} • {employee.departmentKh}
                      </p>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <a
                      href={`tel:${employee.phone}`}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs hover:bg-indigo-100 transition"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{employee.phone}</span>
                    </a>
                    {lastRecord && (
                      <div className="text-[10px] font-mono text-slate-400">
                        In: {new Date(lastRecord.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowEmergencyRollCall(false)}
                className="px-6 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-900 transition"
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
