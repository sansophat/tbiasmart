import React, { useState } from 'react';
import QRCode from 'qrcode';
import { 
  User, 
  Calendar, 
  Clock, 
  Plus, 
  FileText, 
  CheckCircle2, 
  Clock3, 
  XCircle, 
  AlertCircle, 
  HeartPulse, 
  Coffee, 
  Building2, 
  ShieldCheck, 
  QrCode, 
  MapPin, 
  Camera, 
  Sparkles, 
  Send,
  Printer,
  ChevronRight,
  TrendingUp,
  FileCheck,
  Check,
  X,
  IdCard,
  Lock
} from 'lucide-react';
import { AuthUser, Employee, Branch, LeaveRequest, AttendanceRecord, Language, CompanyBranding, UserGeoLocation } from '../types';
import { INITIAL_BRANDING } from '../data/initialData';
import { DigitalIdCardModal } from './DigitalIdCardModal';

interface EmployeePortalViewProps {
  currentUser: AuthUser;
  employees: Employee[];
  branches: Branch[];
  leaveRequests: LeaveRequest[];
  attendanceRecords: AttendanceRecord[];
  onSubmitLeaveRequest: (req: LeaveRequest) => void;
  onOpenScan: () => void;
  lang: Language;
  branding?: CompanyBranding;
  currentGeo?: UserGeoLocation;
  onUpdateBranchLocation?: (
    branchId: string,
    lat: number,
    lng: number,
    employeeId?: string
  ) => { success: boolean; message: string } | void;
}

export const EmployeePortalView: React.FC<EmployeePortalViewProps> = ({
  currentUser,
  employees,
  branches,
  leaveRequests,
  attendanceRecords,
  onSubmitLeaveRequest,
  onOpenScan,
  lang,
  branding = INITIAL_BRANDING,
  currentGeo,
  onUpdateBranchLocation,
}) => {
  // Find full employee object for current user
  const currentEmp = employees.find(
    (e) => e.id === currentUser.employeeId || e.code === currentUser.employeeCode
  ) || {
    id: currentUser.employeeId || 'emp_temp',
    code: currentUser.employeeCode || 'EMP-USER',
    nameKh: currentUser.nameKh,
    nameEn: currentUser.nameEn,
    branchId: currentUser.branchId || branches[0]?.id || 'br_office',
    department: 'Operations',
    departmentKh: 'ប្រតិបត្តិការ',
    role: currentUser.roleTitle || 'Staff Member',
    roleKh: 'បុគ្គលិក',
    shiftId: 'shift_office',
    avatar: currentUser.avatar,
    phone: '012 345 678',
    email: currentUser.email || 'user@enterprise.com.kh',
    status: 'active' as const,
    pinCode: '1234',
    annualLeaveQuota: 18,
    annualLeaveUsed: 0,
    sickLeaveQuota: 7,
    sickLeaveUsed: 0,
  };

  const branch = branches.find((b) => b.id === currentEmp.branchId);

  // Modals state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [badgeQrUrl, setBadgeQrUrl] = useState<string>('');
  const [requestTab, setRequestTab] = useState<'leave' | 'sick' | 'overtime' | 'permission'>('leave');

  // Form State
  const [leaveCategory, setLeaveCategory] = useState<'leave' | 'sick' | 'overtime' | 'permission'>('leave');
  const [leaveType, setLeaveType] = useState<'annual' | 'sick' | 'urgent' | 'unpaid' | 'overtime' | 'half_day'>('annual');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [otHours, setOtHours] = useState(2);
  const [otMultiplier, setOtMultiplier] = useState<number>(1.5);
  const [reason, setReason] = useState('');
  const [attachmentNote, setAttachmentNote] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Filter requests for current employee
  const myRequests = leaveRequests.filter(
    (req) => req.employeeId === currentEmp.id || req.employeeNameEn === currentEmp.nameEn
  );

  // Filter attendance records for current employee
  const myAttendance = attendanceRecords.filter(
    (r) => r.employeeId === currentEmp.id || r.employeeCode === currentEmp.code
  );

  // Generate Digital Badge QR
  const handleOpenBadge = async () => {
    try {
      const payload = JSON.stringify({
        type: 'EMPLOYEE_BADGE',
        empId: currentEmp.id,
        code: currentEmp.code,
        name: currentEmp.nameEn,
        branchId: currentEmp.branchId,
      });
      const url = await QRCode.toDataURL(payload, {
        width: 280,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      setBadgeQrUrl(url);
      setShowBadgeModal(true);
    } catch (err) {
      console.error('Badge QR error:', err);
    }
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    let typeKhLabel = '';
    if (leaveCategory === 'leave') {
      typeKhLabel = leaveType === 'annual' ? 'ច្បាប់ឈប់សម្រាកប្រចាំឆ្នាំ (Annual Leave)' : 'ច្បាប់ឈប់បន្ទាន់ (Urgent Leave)';
    } else if (leaveCategory === 'sick') {
      typeKhLabel = 'ច្បាប់ឈឺ (Medical Sick Leave)';
    } else if (leaveCategory === 'overtime') {
      typeKhLabel = `ស្នើសុំថែមម៉ោង OT (${otHours} ម៉ោង - មេគុណ ${otMultiplier}x)`;
    } else {
      typeKhLabel = `សុំច្បាប់ចេញមុន ឬមកយឺត (${otHours} ម៉ោង)`;
    }

    const newRequest: LeaveRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      employeeId: currentEmp.id || 'emp_default',
      employeeNameKh: currentEmp.nameKh || 'បុគ្គលិក',
      employeeNameEn: currentEmp.nameEn || 'Staff Member',
      employeeCode: currentEmp.code || 'EMP-000',
      employeeAvatar: currentEmp.avatar || '',
      branchId: currentEmp.branchId || '',
      category: leaveCategory,
      type: leaveCategory === 'overtime' ? 'overtime' : leaveCategory === 'sick' ? 'sick' : leaveCategory === 'permission' ? 'half_day' : leaveType,
      typeKh: typeKhLabel,
      startDate,
      endDate,
      reason: reason.trim(),
      status: 'pending',
      appliedAt: new Date().toISOString().split('T')[0],
      ...(leaveCategory === 'overtime' || leaveCategory === 'permission' ? { hours: Number(otHours) || 0 } : {}),
      ...(leaveCategory === 'overtime' && otMultiplier ? { otRateMultiplier: otMultiplier } : {}),
      ...(attachmentNote.trim() ? { attachmentUrl: attachmentNote.trim() } : {}),
    };

    onSubmitLeaveRequest(newRequest);
    setSubmitSuccess(true);
    setTimeout(() => {
      setSubmitSuccess(false);
      setShowRequestModal(false);
      setReason('');
      setAttachmentNote('');
    }, 1200);
  };

  // Helper to calculate days between two YYYY-MM-DD dates inclusive
  const calculateDays = (start?: string, end?: string): number => {
    if (!start || !end) return 1;
    try {
      const s = new Date(start);
      const e = new Date(end);
      const diffTime = e.getTime() - s.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return isNaN(diffDays) || diffDays < 1 ? 1 : diffDays;
    } catch {
      return 1;
    }
  };

  // Dynamically calculate approved leave days from submitted requests
  const approvedAnnualDaysFromRequests = myRequests
    .filter((r) => (r.category === 'leave' || r.type === 'annual') && r.status === 'approved')
    .reduce((sum, r) => sum + calculateDays(r.startDate, r.endDate), 0);

  const approvedSickDaysFromRequests = myRequests
    .filter((r) => (r.category === 'sick' || r.type === 'sick') && r.status === 'approved')
    .reduce((sum, r) => sum + calculateDays(r.startDate, r.endDate), 0);

  // Quota computations: New staff with no approved requests start with 0 days used
  const totalAnnualQuota = currentEmp.annualLeaveQuota !== undefined ? currentEmp.annualLeaveQuota : 18;
  const recordedAnnualUsed = currentEmp.annualLeaveUsed !== undefined ? currentEmp.annualLeaveUsed : 0;
  const usedAnnual = Math.max(recordedAnnualUsed, approvedAnnualDaysFromRequests);
  const remainingAnnual = Math.max(0, totalAnnualQuota - usedAnnual);

  const totalSickQuota = currentEmp.sickLeaveQuota !== undefined ? currentEmp.sickLeaveQuota : 7;
  const recordedSickUsed = currentEmp.sickLeaveUsed !== undefined ? currentEmp.sickLeaveUsed : 0;
  const usedSick = Math.max(recordedSickUsed, approvedSickDaysFromRequests);
  const remainingSick = Math.max(0, totalSickQuota - usedSick);

  const totalOtHoursApproved = myRequests
    .filter((r) => r.category === 'overtime' && r.status === 'approved')
    .reduce((sum, r) => sum + (r.hours || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Employee Profile Card Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4 sm:space-x-5">
          <div className="relative shrink-0">
            <img
              src={currentEmp.avatar}
              alt={currentEmp.nameEn}
              className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-indigo-100 shadow-md"
            />
            <span className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-emerald-500 text-white shadow-sm ring-2 ring-white">
              <Check className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">
                {currentEmp.code}
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1">
                <Check className="w-3 h-3" />
                {lang === 'km' ? 'បុគ្គលិកសកម្ម' : 'Active Staff'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
              {lang === 'km' ? currentEmp.nameKh : currentEmp.nameEn}
            </h2>
            <p className="text-xs sm:text-sm text-indigo-600 font-medium flex items-center gap-1.5">
              <span>{currentEmp.role}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600">{branch?.nameEn}</span>
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto">
          <button
            onClick={onOpenScan}
            className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-200 transition"
          >
            <QrCode className="w-4 h-4" />
            <span>{lang === 'km' ? 'ស្កេនវត្តមាន (QR & GPS)' : 'Punch In / Out'}</span>
          </button>

          <button
            onClick={handleOpenBadge}
            className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm border border-slate-200 transition"
          >
            <QrCode className="w-4 h-4 text-indigo-600" />
            <span>{lang === 'km' ? 'កាតឌីជីថល QR' : 'My QR Pass'}</span>
          </button>

          <button
            onClick={() => {
              setLeaveCategory('leave');
              setShowRequestModal(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-200 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'km' ? 'ស្នើសុំច្បាប់ / OT' : 'Submit Leave / OT'}</span>
          </button>
        </div>
      </div>

      {/* Branch Geofence & GPS 1st-Time Calibration Status Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              currentEmp.gpsCalibratedBranchId === currentEmp.branchId
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
            }`}>
              {currentEmp.gpsCalibratedBranchId === currentEmp.branchId ? (
                <Lock className="w-5 h-5" />
              ) : (
                <MapPin className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-bold text-slate-800 text-sm">
                  {lang === 'km' ? 'ទីតាំង GPS សាខាបំពេញការងារ' : 'Assigned Branch GPS Boundary'}
                </h4>
                {currentEmp.gpsCalibratedBranchId === currentEmp.branchId ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                    🔒 {lang === 'km' ? 'បានចាក់សោ (លើកទី ១)' : 'Locked (1st-Time Active)'}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                    📍 {lang === 'km' ? 'មិនទាន់កំណត់ GPS' : 'GPS Not Set Yet'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {currentEmp.gpsCalibratedBranchId === currentEmp.branchId
                  ? (lang === 'km'
                      ? `សាខា "${branch?.nameKh}" (${branch?.lat ? branch.lat.toFixed(5) : '11.55640'}, ${branch?.lng ? branch.lng.toFixed(5) : '104.92820'}) • មិនអាចប្តូរបានទេ រហូតដល់មានការផ្ទេរទៅកាន់សាខាថ្មី`
                      : `Branch "${branch?.nameEn}" (${branch?.lat ? branch.lat.toFixed(5) : '11.55640'}, ${branch?.lng ? branch.lng.toFixed(5) : '104.92820'}) • Location locked until branch transfer`)
                  : (lang === 'km'
                      ? `អ្នកអាចកំណត់ទីតាំង GPS ជាក់ស្តែងរបស់អ្នកជាទីតាំងសាខាដំបូងបាន (កំណត់បានតែ ១ ដងគត់)`
                      : `You can calibrate your current GPS as this branch's location (1-time setup only)`)}
              </p>
            </div>
          </div>

          {currentEmp.gpsCalibratedBranchId !== currentEmp.branchId && onUpdateBranchLocation && (
            <button
              onClick={() => {
                const targetGeo = currentGeo || { lat: 11.5564, lng: 104.9282 };
                const res = onUpdateBranchLocation(
                  currentEmp.branchId,
                  targetGeo.lat,
                  targetGeo.lng,
                  currentEmp.id
                ) as unknown as { success: boolean; message?: string } | undefined;
                if (res && res.message) {
                  alert(res.message);
                }
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition flex items-center justify-center space-x-1.5 cursor-pointer shrink-0"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>
                {lang === 'km' ? 'កំណត់ទីតាំង GPS ខ្ញុំជាទីតាំងសាខា (លើកទី ១)' : 'Set My GPS as Branch Location'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Quota & Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Annual Leave Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {lang === 'km' ? 'ច្បាប់ប្រចាំឆ្នាំ (Annual)' : 'Annual Leave'}
            </span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-800">{remainingAnnual}</span>
            <span className="text-xs text-slate-400 font-medium">/ {totalAnnualQuota} {lang === 'km' ? 'ថ្ងៃនៅសល់' : 'days left'}</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${(remainingAnnual / totalAnnualQuota) * 100}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-500">
            {lang === 'km' ? `បានប្រើ: ${usedAnnual} ថ្ងៃ` : `Used: ${usedAnnual} days this year`}
          </p>
        </div>

        {/* Sick Leave Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {lang === 'km' ? 'ច្បាប់ឈឺ (Medical Sick)' : 'Sick Leave'}
            </span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <HeartPulse className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-800">{remainingSick}</span>
            <span className="text-xs text-slate-400 font-medium">/ {totalSickQuota} {lang === 'km' ? 'ថ្ងៃនៅសល់' : 'days left'}</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${(remainingSick / totalSickQuota) * 100}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-500">
            {lang === 'km' ? `បានប្រើ: ${usedSick} ថ្ងៃ` : `Used: ${usedSick} days this year`}
          </p>
        </div>

        {/* Overtime (OT) Hours Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {lang === 'km' ? 'ម៉ោងថែម OT អនុម័ត' : 'Approved OT'}
            </span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-amber-600">{totalOtHoursApproved}</span>
            <span className="text-xs text-slate-400 font-medium">{lang === 'km' ? 'ម៉ោងខែនេះ' : 'hrs this month'}</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between pt-1">
            <span>{lang === 'km' ? 'អត្រាថែមម៉ោង:' : 'Overtime Rates:'}</span>
            <span className="font-bold text-slate-700">1.5x - 2.0x</span>
          </div>
        </div>

        {/* Pending Requests Counter Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {lang === 'km' ? 'ពាក្យស្នើសុំរង់ចាំ' : 'Pending Requests'}
            </span>
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Clock3 className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-indigo-600">
              {myRequests.filter((r) => r.status === 'pending').length}
            </span>
            <span className="text-xs text-slate-400 font-medium">{lang === 'km' ? 'ច្បាប់/OT កំពុងរង់ចាំ' : 'under review'}</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {lang === 'km' ? 'អ្នកគ្រប់គ្រងនឹងឆ្លើយតបក្នុងរយៈពេល 24h' : 'Manager will review within 24h'}
          </p>
        </div>
      </div>

      {/* Main Grid: My Requests History & Recent Attendance Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: My Submitted Requests (8 Cols) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <FileText className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {lang === 'km' ? 'ប្រវត្តិនៃការស្នើសុំច្បាប់ និងថែមម៉ោង (My Requests)' : 'My Leave & Overtime Requests'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {lang === 'km' ? 'តាមដានស្ថានភាពច្បាប់ឈប់ ច្បាប់ឈឺ និងម៉ោង OT' : 'Track approval status for leaves, sick days, and OT'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setLeaveCategory('leave');
                setShowRequestModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'ស្នើសុំថ្មី' : 'New Request'}</span>
            </button>
          </div>

          {/* Requests List */}
          {myRequests.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl p-6">
              <FileCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">
                {lang === 'km' ? 'មិនទាន់មានពាក្យស្នើសុំណាមួយនៅឡើយទេ' : 'No leave or OT requests submitted yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map((req) => {
                return (
                  <div
                    key={req.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-200 transition space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          req.category === 'overtime'
                            ? 'bg-amber-100 text-amber-800'
                            : req.category === 'sick'
                            ? 'bg-rose-100 text-rose-800'
                            : req.category === 'permission'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {req.category}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                          {req.typeKh}
                        </h4>
                      </div>

                      {/* Status Badge */}
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        req.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800 animate-pulse'
                      }`}>
                        {req.status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {req.status === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
                        {req.status === 'pending' && <Clock3 className="w-3.5 h-3.5" />}
                        <span className="capitalize">{req.status}</span>
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/80">
                      <span className="font-semibold text-slate-700">{lang === 'km' ? 'មូលហេតុ: ' : 'Reason: '}</span>
                      {req.reason}
                    </p>

                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 gap-2">
                      <div className="flex items-center space-x-3">
                        <span>📅 {req.startDate} {req.startDate !== req.endDate && `ដល់ ${req.endDate}`}</span>
                        {req.hours && (
                          <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            ⏱️ {req.hours} {lang === 'km' ? 'ម៉ោង' : 'hrs'}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-slate-400">{lang === 'km' ? 'កាលបរិច្ឆេទដាក់ពាក្យ: ' : 'Applied: '}{req.appliedAt}</span>
                    </div>

                    {/* Admin Response Note */}
                    {req.adminComment && (
                      <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 text-xs">
                        <span className="font-bold text-indigo-800">{lang === 'km' ? 'មតិពីអ្នកគ្រប់គ្រង: ' : 'Manager Note: '}</span>
                        {req.adminComment} ({req.approvedBy})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Personal Attendance History (4 Cols) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Clock className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {lang === 'km' ? 'វត្តមានផ្ទាល់ខ្លួន' : 'My Clock Logs'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {lang === 'km' ? 'កំណត់ត្រាស្កេនថ្មីៗ' : 'Recent check-ins & check-outs'}
              </p>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {myAttendance.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl p-4">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs text-slate-400 font-medium">
                  {lang === 'km' ? 'មិនទាន់មានទិន្នន័យស្កេននៅឡើយ' : 'No punch records yet.'}
                </p>
              </div>
            ) : (
              myAttendance.slice(0, 8).map((record) => (
                <div
                  key={record.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                      record.type === 'check_in'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {record.type === 'check_in' ? 'ចូល (In)' : 'ចេញ (Out)'}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      record.status === 'on_time'
                        ? 'bg-emerald-50 text-emerald-700'
                        : record.status === 'late'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {record.status}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono font-medium text-slate-700">
                    🕒 {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(record.timestamp).toLocaleDateString()}
                  </div>

                  <div className="text-[11px] text-slate-500 truncate flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-indigo-600 shrink-0" />
                    <span className="truncate">{record.branchNameEn}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Submit Leave / OT / Sick Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative my-8">
            <button
              onClick={() => setShowRequestModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-200">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {lang === 'km' ? 'ដាក់ពាក្យស្នើសុំច្បាប់ ឬម៉ោងថែម OT' : 'Submit Leave or OT Request'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {currentEmp.nameKh} ({currentEmp.code}) • {branch?.nameEn}
                </p>
              </div>
            </div>

            {/* Request Type Switcher Buttons */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setLeaveCategory('leave')}
                className={`py-2 px-1 rounded-xl transition ${
                  leaveCategory === 'leave' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🌴 {lang === 'km' ? 'ច្បាប់' : 'Leave'}
              </button>
              <button
                type="button"
                onClick={() => setLeaveCategory('sick')}
                className={`py-2 px-1 rounded-xl transition ${
                  leaveCategory === 'sick' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🩺 {lang === 'km' ? 'ឈឺ' : 'Sick'}
              </button>
              <button
                type="button"
                onClick={() => setLeaveCategory('overtime')}
                className={`py-2 px-1 rounded-xl transition ${
                  leaveCategory === 'overtime' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ⏱️ {lang === 'km' ? 'ថែម OT' : 'OT'}
              </button>
              <button
                type="button"
                onClick={() => setLeaveCategory('permission')}
                className={`py-2 px-1 rounded-xl transition ${
                  leaveCategory === 'permission' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ⏰ {lang === 'km' ? 'អនុញ្ញាត' : 'Permit'}
              </button>
            </div>

            {submitSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{lang === 'km' ? 'ពាក្យស្នើសុំត្រូវបានបញ្ជូនទៅអ្នកគ្រប់គ្រងដោយជោគជ័យ!' : 'Request submitted successfully to your branch manager!'}</span>
              </div>
            )}

            <form onSubmit={handleSubmitRequest} className="space-y-3.5 text-xs">
              {/* Category-Specific Selectors */}
              {leaveCategory === 'leave' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {lang === 'km' ? 'ប្រភេទច្បាប់ឈប់សម្រាក:' : 'Leave Type:'}
                  </label>
                  <select
                    value={leaveType}
                    onChange={(e: any) => setLeaveType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="annual">{lang === 'km' ? 'ច្បាប់ឈប់ប្រចាំឆ្នាំ (Annual Leave)' : 'Annual Leave'}</option>
                    <option value="urgent">{lang === 'km' ? 'ច្បាប់ឈប់បន្ទាន់ / ផ្ទាល់ខ្លួន (Urgent Leave)' : 'Urgent / Personal Leave'}</option>
                    <option value="unpaid">{lang === 'km' ? 'ច្បាប់ឈប់មិនគិតប្រាក់ខែ (Unpaid Leave)' : 'Unpaid Leave'}</option>
                  </select>
                </div>
              )}

              {leaveCategory === 'overtime' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      {lang === 'km' ? 'ចំនួនម៉ោងថែម OT (Hours):' : 'Overtime Hours:'}
                    </label>
                    <input
                      type="number"
                      min="0.5"
                      max="12"
                      step="0.5"
                      required
                      value={otHours}
                      onChange={(e) => setOtHours(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      {lang === 'km' ? 'មេគុណប្រាក់ម៉ោង (OT Rate):' : 'OT Multiplier Rate:'}
                    </label>
                    <select
                      value={otMultiplier}
                      onChange={(e) => setOtMultiplier(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="1.5">1.5x (វេនធម្មតា / Standard OT)</option>
                      <option value="2.0">2.0x (ថ្ងៃបុណ្យ/អាទិត្យ / Holiday/Night)</option>
                    </select>
                  </div>
                </div>
              )}

              {leaveCategory === 'permission' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {lang === 'km' ? 'ចំនួនម៉ោងស្នើសុំ (Hours):' : 'Permission Hours:'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    step="0.5"
                    required
                    value={otHours}
                    onChange={(e) => setOtHours(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* Date Ranges */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {lang === 'km' ? 'ចាប់ពីថ្ងៃ (Start Date):' : 'Start Date:'}
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {lang === 'km' ? 'ដល់ថ្ងៃ (End Date):' : 'End Date:'}
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {lang === 'km' ? 'មូលហេតុលម្អិត (Reason / Task):' : 'Reason / Task Description:'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    leaveCategory === 'overtime'
                      ? 'e.g. រៀបចំព្រឹត្តិការណ៍ Concert VIP ឬរាប់ស្តុកទំនិញបន្ថែម...'
                      : leaveCategory === 'sick'
                      ? 'e.g. ផ្តាសាយក្តៅខ្លួន មានវេជ្ជបញ្ជាពីពេទ្យ...'
                      : 'e.g. ដំណើរកម្សាន្តគ្រួសារ ឬការងារបន្ទាន់...'
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Attachment note */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {lang === 'km' ? 'កំណត់សម្គាល់បន្ថែម / ឯកសារភ្ជាប់ (Attachment note / Link):' : 'Optional Attachment / Doctor Note Link:'}
                </label>
                <input
                  type="text"
                  value={attachmentNote}
                  onChange={(e) => setAttachmentNote(e.target.value)}
                  placeholder="e.g. Doctor certificate attached / Clinic prescription"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                >
                  {lang === 'km' ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-200 transition"
                >
                  {lang === 'km' ? 'បញ្ជូនពាក្យស្នើសុំ' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Digital ID Badge Pass Modal */}
      {showBadgeModal && (
        <DigitalIdCardModal
          employee={currentEmp as Employee}
          branch={branch}
          branding={branding}
          lang={lang}
          onClose={() => setShowBadgeModal(false)}
        />
      )}
    </div>
  );
};
