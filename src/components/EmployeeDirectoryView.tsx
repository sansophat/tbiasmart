import React, { useState } from 'react';
import QRCode from 'qrcode';
import { 
  Users, 
  Search, 
  Plus, 
  Building2, 
  Sparkles, 
  Warehouse, 
  Coffee, 
  QrCode, 
  Printer, 
  Phone, 
  Mail, 
  ShieldCheck, 
  IdCard, 
  Calendar,
  CheckCircle2,
  X,
  Clock,
  Camera,
  Edit,
  Trash2,
  Image as ImageIcon,
  ArrowRightLeft,
  Smartphone,
  RotateCcw,
  RefreshCw,
  Fuel,
  Sun,
  Moon,
  Flame,
  Check,
  AlertCircle,
  LayoutGrid,
  List
} from 'lucide-react';
import { Employee, Branch, AttendanceRecord, Language, CompanyBranding, UserRole, Shift } from '../types';
import { INITIAL_BRANDING, INITIAL_SHIFTS } from '../data/initialData';
import { EmployeeImageUploader } from './EmployeeImageUploader';
import { DigitalIdCardModal } from './DigitalIdCardModal';
import { getEmployeeDayOffName, getEmployeeWorkingHours, getShiftCategoryBadge, isShiftBasedWorker } from '../utils/dayOffUtils';
import { resolveAvatar, handleAvatarError, getFallbackAvatar } from '../utils/avatarUtils';
import { unbindEmployeeDevice } from '../utils/deviceSecurityUtils';

export const DEPARTMENT_OPTIONS = [
  { id: 'dept_barista_cafe', nameKh: 'សេវាកម្មភេសជ្ជៈ & បារីស្តាកាហ្វេ (Barista & Cafe)', nameEn: 'Barista & Coffee Service' },
  { id: 'dept_gas_station', nameKh: 'ស្ថានីយប្រេងឥន្ធនៈ & សេវាកម្មចាក់ប្រេង (Gas Station)', nameEn: 'Gas Station & Fuel Services' },
  { id: 'dept_branch_mgmt', nameKh: 'គ្រប់គ្រងសាខា (Branch Management)', nameEn: 'Branch Management' },
  { id: 'dept_ops', nameKh: 'ប្រតិបត្តិការទូទៅ (Operations)', nameEn: 'Operations' },
  { id: 'dept_hr', nameKh: 'ធនធានមនុស្ស (Human Resources)', nameEn: 'Human Resources' },
  { id: 'dept_fb', nameKh: 'សេវាកម្មភេសជ្ជៈ & ម្ហូបអាហារ (F&B)', nameEn: 'Food & Beverage' },
  { id: 'dept_service', nameKh: 'សេវាកម្មទូទៅ (General Services)', nameEn: 'General Services' },
  { id: 'dept_finance', nameKh: 'គណនេយ្យ & ហិរញ្ញវត្ថុ (Finance)', nameEn: 'Accounting & Finance' },
  { id: 'dept_security', nameKh: 'សន្តិសុខ & បច្ចេកទេស (Security & IT)', nameEn: 'Security & Maintenance' },
];

export const ROLE_PRESETS: {
  roleType: UserRole;
  titleKh: string;
  titleEn: string;
  defaultDeptKh: string;
  defaultDeptEn: string;
  prefix: string;
  badgeClass: string;
  defaultShiftId?: string;
  defaultWeeklyDayOff?: number;
}[] = [
  {
    roleType: 'admin',
    titleKh: '👑 អ្នកគ្រប់គ្រងជាន់ខ្ពស់ (System Admin)',
    titleEn: '👑 System Administrator',
    defaultDeptKh: 'គ្រប់គ្រងសាខា (Branch Management)',
    defaultDeptEn: 'Branch Management',
    prefix: 'ADM',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    defaultShiftId: 'shift_office',
    defaultWeeklyDayOff: 0,
  },
  {
    roleType: 'employee',
    titleKh: '☕ បារីស្តា / អ្នកឆុងកាហ្វេ (Barista)',
    titleEn: 'Barista & Cafe Staff',
    defaultDeptKh: 'សេវាកម្មភេសជ្ជៈ & បារីស្តាកាហ្វេ (Barista & Cafe)',
    defaultDeptEn: 'Barista & Coffee Service',
    prefix: 'BAR',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    defaultShiftId: 'shift_cafe_morning',
    defaultWeeklyDayOff: 1, // Monday
  },
  {
    roleType: 'employee',
    titleKh: '⛽ បុគ្គលិកចាក់ប្រេង (Fuel Attendant)',
    titleEn: 'Fuel Service Attendant',
    defaultDeptKh: 'ស្ថានីយប្រេងឥន្ធនៈ & សេវាកម្មចាក់ប្រេង (Gas Station)',
    defaultDeptEn: 'Gas Station & Fuel Services',
    prefix: 'GAS',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    defaultShiftId: 'shift_gas_morning',
    defaultWeeklyDayOff: 2, // Tuesday
  },
  {
    roleType: 'manager',
    titleKh: 'ប្រធានគ្រប់គ្រងសាខា (Branch Manager)',
    titleEn: 'Branch Manager',
    defaultDeptKh: 'គ្រប់គ្រងសាខា (Branch Management)',
    defaultDeptEn: 'Branch Management',
    prefix: 'MGR',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    defaultShiftId: 'shift_office',
    defaultWeeklyDayOff: 0,
  },
  {
    roleType: 'supervisor',
    titleKh: 'ប្រធានវេនការងារ (Shift Supervisor)',
    titleEn: 'Shift Supervisor',
    defaultDeptKh: 'ប្រតិបត្តិការទូទៅ (Operations)',
    defaultDeptEn: 'Operations',
    prefix: 'SUP',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    defaultShiftId: 'shift_gas_fulltime',
    defaultWeeklyDayOff: 0,
  },
  {
    roleType: 'hr',
    titleKh: 'មន្ត្រីធនធានមនុស្ស (HR Officer)',
    titleEn: 'HR Officer',
    defaultDeptKh: 'ធនធានមនុស្ស (Human Resources)',
    defaultDeptEn: 'Human Resources',
    prefix: 'HR',
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
    defaultShiftId: 'shift_office',
    defaultWeeklyDayOff: 0,
  },
  {
    roleType: 'employee',
    titleKh: 'បុគ្គលិកទូទៅ (General Staff)',
    titleEn: 'General Staff',
    defaultDeptKh: 'សេវាកម្មទូទៅ (General Services)',
    defaultDeptEn: 'General Services',
    prefix: 'EMP',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    defaultShiftId: 'shift_office',
    defaultWeeklyDayOff: 0,
  },
];

interface EmployeeDirectoryViewProps {
  employees: Employee[];
  branches: Branch[];
  attendanceRecords: AttendanceRecord[];
  shifts?: Shift[];
  onAddEmployee: (emp: Employee) => void;
  onUpdateEmployee?: (emp: Employee) => void;
  onDeleteEmployee?: (empId: string) => void;
  onOpenTransferModal?: (emp: Employee) => void;
  onUpdateShifts?: (shifts: Shift[]) => void;
  lang: Language;
  branding?: CompanyBranding;
}

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80';

export const EmployeeDirectoryView: React.FC<EmployeeDirectoryViewProps> = ({
  employees,
  branches,
  attendanceRecords,
  shifts = INITIAL_SHIFTS,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onOpenTransferModal,
  onUpdateShifts,
  lang,
  branding = INITIAL_BRANDING,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState('all');
  const [selectedDayOffFilter, setSelectedDayOffFilter] = useState('all');
  const [selectedBadgeEmp, setSelectedBadgeEmp] = useState<Employee | null>(null);
  const [badgeQrUrl, setBadgeQrUrl] = useState<string>('');
  
  // View mode: 'grid' (Card grid) vs 'table' (Table list)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    try {
      const saved = localStorage.getItem('tbiasmart_staff_view_mode');
      return saved === 'table' ? 'table' : 'grid';
    } catch {
      return 'grid';
    }
  });

  const handleSetViewMode = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    try {
      localStorage.setItem('tbiasmart_staff_view_mode', mode);
    } catch {
      // ignore
    }
  };
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [photoEditEmp, setPhotoEditEmp] = useState<Employee | null>(null);
  const [quickScheduleEmp, setQuickScheduleEmp] = useState<Employee | null>(null);

  // Quick Schedule Form State
  const [quickShiftId, setQuickShiftId] = useState<string>('shift_cafe_morning');
  const [quickStartTime, setQuickStartTime] = useState<string>('06:30');
  const [quickEndTime, setQuickEndTime] = useState<string>('14:30');
  const [quickScheduledHours, setQuickScheduledHours] = useState<number>(8);
  const [quickWeeklyDayOff, setQuickWeeklyDayOff] = useState<number>(1);

  // New Employee Form State
  const [newEmpRoleType, setNewEmpRoleType] = useState<UserRole>('employee');
  const [newEmpNameKh, setNewEmpNameKh] = useState('');
  const [newEmpNameEn, setNewEmpNameEn] = useState('');
  const [newEmpCode, setNewEmpCode] = useState(`EMP-${Math.floor(100 + Math.random() * 900)}`);
  const [newEmpBranchId, setNewEmpBranchId] = useState(branches[0]?.id || '');
  const [newEmpDeptKh, setNewEmpDeptKh] = useState(DEPARTMENT_OPTIONS[0].nameKh);
  const [newEmpRoleKh, setNewEmpRoleKh] = useState('បារីស្តា / អ្នកឆុងកាហ្វេ');
  const [newEmpPhone, setNewEmpPhone] = useState('012 345 678');
  const [newEmpAddress, setNewEmpAddress] = useState('');
  const [newEmpPin, setNewEmpPin] = useState(String(Math.floor(1000 + Math.random() * 9000)));
  const [newEmpAvatar, setNewEmpAvatar] = useState(DEFAULT_AVATAR);
  const [newEmpShiftId, setNewEmpShiftId] = useState<string>('shift_cafe_morning');
  const [newEmpShiftStartTime, setNewEmpShiftStartTime] = useState<string>('06:30');
  const [newEmpShiftEndTime, setNewEmpShiftEndTime] = useState<string>('14:30');
  const [newEmpScheduledHours, setNewEmpScheduledHours] = useState<number>(8);
  const [newEmpWeeklyDayOff, setNewEmpWeeklyDayOff] = useState<number>(1);

  // Edit Employee Form State
  const [editRoleType, setEditRoleType] = useState<UserRole>('employee');
  const [editNameKh, setEditNameKh] = useState('');
  const [editNameEn, setEditNameEn] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editBranchId, setEditBranchId] = useState('');
  const [editDeptKh, setEditDeptKh] = useState('');
  const [editRoleKh, setEditRoleKh] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editShiftId, setEditShiftId] = useState<string>('shift_office');
  const [editShiftStartTime, setEditShiftStartTime] = useState<string>('08:00');
  const [editShiftEndTime, setEditShiftEndTime] = useState<string>('17:30');
  const [editScheduledHours, setEditScheduledHours] = useState<number>(8.5);
  const [editWeeklyDayOff, setEditWeeklyDayOff] = useState<number>(0);

  // Helper to apply shift preset to Add / Edit / Quick forms
  const applyShiftToForm = (
    shiftId: string,
    target: 'add' | 'edit' | 'quick'
  ) => {
    const s = shifts.find((item) => item.id === shiftId);
    if (!s) return;
    const start = s.startTime;
    const end = s.endTime;
    const hours = s.workHours || 8;
    const defDayOff = s.branchTypes?.includes('cafe') || s.branchTypes?.includes('gas_station') ? 1 : 0;

    if (target === 'add') {
      setNewEmpShiftId(s.id);
      setNewEmpShiftStartTime(start);
      setNewEmpShiftEndTime(end);
      setNewEmpScheduledHours(hours);
      setNewEmpWeeklyDayOff(defDayOff);
    } else if (target === 'edit') {
      setEditShiftId(s.id);
      setEditShiftStartTime(start);
      setEditShiftEndTime(end);
      setEditScheduledHours(hours);
    } else if (target === 'quick') {
      setQuickShiftId(s.id);
      setQuickStartTime(start);
      setQuickEndTime(end);
      setQuickScheduledHours(hours);
    }
  };

  // Handle Role preset quick selection in Add form
  const handleSelectAddRolePreset = (preset: typeof ROLE_PRESETS[0]) => {
    setNewEmpRoleType(preset.roleType);
    setNewEmpRoleKh(lang === 'km' ? preset.titleKh : preset.titleEn);
    setNewEmpDeptKh(preset.defaultDeptKh);
    setNewEmpCode(`${preset.prefix}-${Math.floor(100 + Math.random() * 900)}`);
    if (preset.defaultShiftId) {
      applyShiftToForm(preset.defaultShiftId, 'add');
    }
    if (preset.defaultWeeklyDayOff !== undefined) {
      setNewEmpWeeklyDayOff(preset.defaultWeeklyDayOff);
    }
    // Auto-link matching branch if adding cafe/barista or gas station staff
    if (preset.prefix === 'BAR') {
      const cafeBranch = branches.find((b) => b.type === 'cafe' || b.nameEn.toLowerCase().includes('cafe'));
      if (cafeBranch) setNewEmpBranchId(cafeBranch.id);
    } else if (preset.prefix === 'GAS') {
      const gasBranch = branches.find((b) => b.type === 'gas_station' || b.nameEn.toLowerCase().includes('gas'));
      if (gasBranch) setNewEmpBranchId(gasBranch.id);
    }
  };

  // Handle Role preset quick selection in Edit form
  const handleSelectEditRolePreset = (preset: typeof ROLE_PRESETS[0]) => {
    setEditRoleType(preset.roleType);
    setEditRoleKh(lang === 'km' ? preset.titleKh : preset.titleEn);
    setEditDeptKh(preset.defaultDeptKh);
    if (preset.defaultShiftId) {
      applyShiftToForm(preset.defaultShiftId, 'edit');
    }
    if (preset.defaultWeeklyDayOff !== undefined) {
      setEditWeeklyDayOff(preset.defaultWeeklyDayOff);
    }
    // Auto-link matching branch if switching to cafe or gas station
    if (preset.prefix === 'BAR') {
      const cafeBranch = branches.find((b) => b.type === 'cafe' || b.nameEn.toLowerCase().includes('cafe'));
      if (cafeBranch) setEditBranchId(cafeBranch.id);
    } else if (preset.prefix === 'GAS') {
      const gasBranch = branches.find((b) => b.type === 'gas_station' || b.nameEn.toLowerCase().includes('gas'));
      if (gasBranch) setEditBranchId(gasBranch.id);
    }
  };

  // Generate Digital Badge QR
  const handleOpenBadge = async (emp: Employee) => {
    setSelectedBadgeEmp(emp);
    try {
      const payload = JSON.stringify({
        type: 'EMPLOYEE_BADGE',
        empId: emp.id,
        code: emp.code,
        name: emp.nameEn,
        branchId: emp.branchId,
      });
      const url = await QRCode.toDataURL(payload, {
        width: 280,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      setBadgeQrUrl(url);
    } catch (err) {
      console.error('Badge QR error:', err);
    }
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmp(emp);
    setEditNameKh(emp.nameKh);
    setEditNameEn(emp.nameEn);
    setEditCode(emp.code);

    // Resolve proper branch matching by ID, or by department name if branch is missing or defaulted to main HQ
    const initialBranch = branches.find((b) => b.id === emp.branchId) ||
      branches.find((b) => (emp.department && b.nameEn.toLowerCase() === emp.department.toLowerCase()) || (emp.departmentKh && b.nameKh === emp.departmentKh)) ||
      branches.find((b) => emp.department && (b.nameEn.toLowerCase().includes(emp.department.toLowerCase()) || emp.department.toLowerCase().includes(b.nameEn.toLowerCase()))) ||
      branches.find((b) => emp.departmentKh && (b.nameKh.includes(emp.departmentKh) || emp.departmentKh.includes(b.nameKh))) ||
      branches[0];

    setEditBranchId(initialBranch ? initialBranch.id : (emp.branchId || branches[0]?.id || 'br_main_hq'));
    setEditDeptKh(emp.departmentKh || initialBranch?.nameKh || emp.department || DEPARTMENT_OPTIONS[0].nameKh);
    setEditRoleKh(emp.role);
    setEditRoleType(
      emp.roleType ||
      (emp.role?.toLowerCase().includes('manager') ? 'manager' :
       emp.role?.toLowerCase().includes('supervisor') ? 'supervisor' :
       (emp.role?.toLowerCase().includes('hr') || emp.departmentKh?.includes('ធនធានមនុស្ស')) ? 'hr' :
       'employee')
    );
    setEditPhone(emp.phone);
    setEditAddress(emp.address || '');
    setEditPin(emp.pinCode || '1234');
    setEditAvatar(emp.avatar || DEFAULT_AVATAR);
    setEditShiftId(emp.shiftId || 'shift_office');
    const matchedShift = shifts.find((s) => s.id === emp.shiftId);
    setEditShiftStartTime(emp.shiftStartTime || matchedShift?.startTime || '08:00');
    setEditShiftEndTime(emp.shiftEndTime || matchedShift?.endTime || '17:30');
    setEditScheduledHours(emp.scheduledDailyHours || matchedShift?.workHours || 8.5);
    setEditWeeklyDayOff(
      emp.weeklyDayOff !== undefined
        ? emp.weeklyDayOff
        : (emp.hasSundayRest === false || isShiftBasedWorker(emp) ? 1 : 0)
    );
  };

  const handleOpenQuickSchedule = (emp: Employee) => {
    setQuickScheduleEmp(emp);
    const matchedShift = shifts.find((s) => s.id === emp.shiftId) || shifts[0];
    setQuickShiftId(emp.shiftId || matchedShift?.id || 'shift_cafe_morning');
    setQuickStartTime(emp.shiftStartTime || matchedShift?.startTime || '06:30');
    setQuickEndTime(emp.shiftEndTime || matchedShift?.endTime || '14:30');
    setQuickScheduledHours(emp.scheduledDailyHours || matchedShift?.workHours || 8);
    setQuickWeeklyDayOff(
      emp.weeklyDayOff !== undefined ? emp.weeklyDayOff : (isShiftBasedWorker(emp) ? 1 : 0)
    );
  };

  const handleSaveQuickSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickScheduleEmp || !onUpdateEmployee) return;

    const updated: Employee = {
      ...quickScheduleEmp,
      shiftId: quickShiftId,
      shiftStartTime: quickStartTime,
      shiftEndTime: quickEndTime,
      scheduledDailyHours: Number(quickScheduledHours),
      workingHoursText: `${quickStartTime} - ${quickEndTime} (${quickScheduledHours}h)`,
      weeklyDayOff: quickWeeklyDayOff,
      hasSundayRest: quickWeeklyDayOff === 0,
    };

    onUpdateEmployee(updated);
    if (selectedBadgeEmp?.id === updated.id) {
      setSelectedBadgeEmp(updated);
    }
    setQuickScheduleEmp(null);
  };

  const handleOpenPhotoEdit = (emp: Employee) => {
    setPhotoEditEmp(emp);
    setEditAvatar(emp.avatar || DEFAULT_AVATAR);
  };

  const handleUpdateBadgePhoto = (empId: string, newAvatarUrl: string) => {
    const target = employees.find((e) => e.id === empId);
    if (!target || !onUpdateEmployee) return;
    const updated = { ...target, avatar: newAvatarUrl };
    onUpdateEmployee(updated);
    if (selectedBadgeEmp?.id === empId) {
      setSelectedBadgeEmp(updated);
    }
  };

  const handleSavePhotoOnly = () => {
    if (!photoEditEmp || !onUpdateEmployee) return;
    const updated: Employee = {
      ...photoEditEmp,
      avatar: editAvatar,
    };
    onUpdateEmployee(updated);
    if (selectedBadgeEmp?.id === updated.id) {
      setSelectedBadgeEmp(updated);
    }
    setPhotoEditEmp(null);
  };

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpNameKh.trim() || !newEmpNameEn.trim()) return;

    const matchedDept = DEPARTMENT_OPTIONS.find((d) => d.nameKh === newEmpDeptKh);

    const newEmp: Employee = {
      id: `emp_${Date.now()}`,
      code: newEmpCode,
      nameKh: newEmpNameKh,
      nameEn: newEmpNameEn,
      branchId: newEmpBranchId,
      department: matchedDept?.nameEn || 'Operations',
      departmentKh: newEmpDeptKh,
      role: newEmpRoleKh,
      roleKh: newEmpRoleKh,
      roleType: newEmpRoleType,
      shiftId: newEmpShiftId,
      shiftStartTime: newEmpShiftStartTime,
      shiftEndTime: newEmpShiftEndTime,
      scheduledDailyHours: Number(newEmpScheduledHours),
      workingHoursText: `${newEmpShiftStartTime} - ${newEmpShiftEndTime} (${newEmpScheduledHours}h)`,
      avatar: newEmpAvatar || DEFAULT_AVATAR,
      phone: newEmpPhone,
      email: `${newEmpNameEn.toLowerCase().replace(/\s+/g, '.')}@enterprise.com.kh`,
      address: newEmpAddress.trim() || undefined,
      status: 'active',
      pinCode: newEmpPin,
      weeklyDayOff: newEmpWeeklyDayOff,
      hasSundayRest: newEmpWeeklyDayOff === 0,
      annualLeaveQuota: 18,
      annualLeaveUsed: 0,
      sickLeaveQuota: 7,
      sickLeaveUsed: 0,
    };

    onAddEmployee(newEmp);
    setShowAddModal(false);
    // Reset Form
    setNewEmpNameKh('');
    setNewEmpNameEn('');
    setNewEmpRoleType('employee');
    setNewEmpRoleKh('បារីស្តា / អ្នកឆុងកាហ្វេ');
    setNewEmpDeptKh(DEPARTMENT_OPTIONS[0].nameKh);
    setNewEmpCode(`EMP-${Math.floor(100 + Math.random() * 900)}`);
    setNewEmpAvatar(DEFAULT_AVATAR);
    setNewEmpPhone('012 345 678');
    setNewEmpAddress('');
    setNewEmpWeeklyDayOff(1);
  };

  const handleUpdateEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp || !onUpdateEmployee) return;

    const selectedBranch = branches.find((b) => b.id === editBranchId);
    const matchedDept = DEPARTMENT_OPTIONS.find((d) => d.nameKh === editDeptKh || d.nameEn === editDeptKh);

    const updated: Employee = {
      ...editingEmp,
      nameKh: editNameKh,
      nameEn: editNameEn,
      code: editCode,
      branchId: editBranchId,
      department: selectedBranch ? selectedBranch.nameEn : (matchedDept?.nameEn || editDeptKh || editingEmp.department),
      departmentKh: selectedBranch ? selectedBranch.nameKh : (matchedDept?.nameKh || editDeptKh),
      role: editRoleKh,
      roleKh: editRoleKh,
      roleType: editRoleType,
      shiftId: editShiftId,
      shiftStartTime: editShiftStartTime,
      shiftEndTime: editShiftEndTime,
      scheduledDailyHours: Number(editScheduledHours),
      workingHoursText: `${editShiftStartTime} - ${editShiftEndTime} (${editScheduledHours}h)`,
      phone: editPhone,
      address: editAddress.trim() || undefined,
      pinCode: editPin,
      avatar: editAvatar || DEFAULT_AVATAR,
      weeklyDayOff: editWeeklyDayOff,
      hasSundayRest: editWeeklyDayOff === 0,
    };

    onUpdateEmployee(updated);
    if (selectedBadgeEmp?.id === updated.id) {
      setSelectedBadgeEmp(updated);
    }
    setEditingEmp(null);
  };

  const handleDelete = (emp: Employee) => {
    const confirmMsg = lang === 'km' 
      ? `តើអ្នកពិតជាចង់លុបបុគ្គលិក "${emp.nameKh}" មែនទេ?`
      : `Are you sure you want to remove employee "${emp.nameEn}" (${emp.code})?`;
    if (window.confirm(confirmMsg)) {
      if (onDeleteEmployee) {
        onDeleteEmployee(emp.id);
      }
      if (selectedBadgeEmp?.id === emp.id) {
        setSelectedBadgeEmp(null);
      }
    }
  };

  const handleResetDevice = (emp: Employee) => {
    if (!onUpdateEmployee) return;
    const confirmed = window.confirm(
      lang === 'km'
        ? `តើអ្នកចង់ដោះសោឧបករណ៍សម្រាប់ ${emp.nameKh} (${emp.code}) មែនទេ? បុគ្គលិកអាចចុះឈ្មោះឧបករណ៍ថ្មីពេលស្កេនលើកក្រោយ។`
        : `Reset hardware device binding for ${emp.nameEn} (${emp.code})? Staff can register a new phone on their next scan.`
    );
    if (!confirmed) return;
    const unbound = unbindEmployeeDevice(emp);
    onUpdateEmployee(unbound);
    if (editingEmp?.id === emp.id) {
      setEditingEmp(unbound);
    }
  };

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesBranch = selectedBranchFilter === 'all' || emp.branchId === selectedBranchFilter;

    const matchesRole =
      selectedRoleFilter === 'all' ||
      (selectedRoleFilter === 'admin' && (emp.roleType === 'admin' || emp.role?.toLowerCase().includes('admin'))) ||
      (selectedRoleFilter === 'manager' && (emp.roleType === 'manager' || emp.role?.toLowerCase().includes('manager'))) ||
      (selectedRoleFilter === 'supervisor' && (emp.roleType === 'supervisor' || emp.role?.toLowerCase().includes('supervisor'))) ||
      (selectedRoleFilter === 'hr' && (emp.roleType === 'hr' || emp.role?.toLowerCase().includes('hr') || emp.departmentKh?.includes('ធនធានមនុស្ស'))) ||
      (selectedRoleFilter === 'employee' && (emp.roleType === 'employee' || (!emp.role?.toLowerCase().includes('admin') && !emp.role?.toLowerCase().includes('manager') && !emp.role?.toLowerCase().includes('supervisor') && !emp.role?.toLowerCase().includes('hr'))));

    const matchesShift = selectedShiftFilter === 'all' || emp.shiftId === selectedShiftFilter;

    const matchesDayOff =
      selectedDayOffFilter === 'all' ||
      (selectedDayOffFilter === 'rotating'
        ? emp.weeklyDayOff === -1
        : emp.weeklyDayOff === Number(selectedDayOffFilter));

    const matchesSearch =
      emp.nameKh.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.departmentKh?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.phone.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesBranch && matchesRole && matchesShift && matchesDayOff && matchesSearch;
  });

  const getBranch = (branchId: string) => branches.find((b) => b.id === branchId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <span className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span>{lang === 'km' ? 'បញ្ជីឈ្មោះបុគ្គលិក និងកាតឌីជីថល QR (៧ សាខា)' : 'Staff Directory & Digital QR Badges'}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                  {employees.length} {lang === 'km' ? 'នាក់' : 'Staff'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {lang === 'km'
                  ? 'គ្រប់គ្រងបុគ្គលិក បញ្ចូលរូបថតផ្ទាល់ខ្លួន (Upload / Camera) កំណត់សាខា និងបោះពុម្ពកាត QR'
                  : 'Manage employee profiles, upload/capture portrait photos, set branch shifts, and print QR ID passes.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Toggle buttons: Grid View vs Table View */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => handleSetViewMode('grid')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title={lang === 'km' ? 'ទម្រង់ប្រអប់ (Grid)' : 'Grid View'}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === 'km' ? 'ប្រអប់' : 'Grid'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title={lang === 'km' ? 'ទម្រង់តារាងបញ្ជី (Table)' : 'Table List View'}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === 'km' ? 'តារាង' : 'Table'}</span>
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-200 transition w-full sm:w-auto justify-center cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'km' ? 'បន្ថែមបុគ្គលិកថ្មី (រូបថត)' : 'Add Employee & Photo'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        {/* Search Input */}
        <div className="sm:col-span-12 lg:col-span-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'km' ? 'ស្វែងរកតាមឈ្មោះ អត្តលេខ ឬលេខទូរស័ព្ទ...' : 'Search by name, employee code, or phone...'}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
          />
        </div>

        {/* Branch Filter */}
        <div className="sm:col-span-6 lg:col-span-2">
          <select
            value={selectedBranchFilter}
            onChange={(e) => setSelectedBranchFilter(e.target.value)}
            aria-label={lang === 'km' ? 'ជ្រើសរើសសាខា' : 'Filter by branch'}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium shadow-sm"
          >
            <option value="all">{lang === 'km' ? 'គ្រប់សាខាទាំងអស់' : 'All Branches'}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {lang === 'km' ? b.nameKh : b.nameEn}
              </option>
            ))}
          </select>
        </div>

        {/* Role Filter */}
        <div className="sm:col-span-6 lg:col-span-2">
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            aria-label={lang === 'km' ? 'ជ្រើសរើសតួនាទី' : 'Filter by role'}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium shadow-sm"
          >
            <option value="all">{lang === 'km' ? 'គ្រប់តួនាទី' : 'All Roles'}</option>
            <option value="admin">{lang === 'km' ? '👑 អភិបាល (Admin)' : '👑 System Admin'}</option>
            <option value="manager">{lang === 'km' ? '★ ប្រធានសាខា' : '★ Managers'}</option>
            <option value="supervisor">{lang === 'km' ? '⏱ ប្រធានវេន' : '⏱ Supervisors'}</option>
            <option value="hr">{lang === 'km' ? '👥 ធនធានមនុស្ស' : '👥 HR Officers'}</option>
            <option value="employee">{lang === 'km' ? '👤 បុគ្គលិកទូទៅ' : '👤 General Staff'}</option>
          </select>
        </div>

        {/* Shift Filter */}
        <div className="sm:col-span-6 lg:col-span-2">
          <select
            value={selectedShiftFilter}
            onChange={(e) => setSelectedShiftFilter(e.target.value)}
            aria-label={lang === 'km' ? 'ជ្រើសរើសវេន' : 'Filter by shift'}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium shadow-sm"
          >
            <option value="all">{lang === 'km' ? 'គ្រប់វេនទាំងអស់' : 'All Shifts'}</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {lang === 'km' ? s.nameKh : s.nameEn}
              </option>
            ))}
          </select>
        </div>

        {/* Day Off Filter */}
        <div className="sm:col-span-6 lg:col-span-2">
          <select
            value={selectedDayOffFilter}
            onChange={(e) => setSelectedDayOffFilter(e.target.value)}
            aria-label={lang === 'km' ? 'ជ្រើសរើសថ្ងៃឈប់' : 'Filter by day off'}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium shadow-sm"
          >
            <option value="all">{lang === 'km' ? 'គ្រប់ថ្ងៃឈប់' : 'All Day Offs'}</option>
            <option value="0">{lang === 'km' ? 'អាទិត្យ (Sun)' : 'Sunday'}</option>
            <option value="1">{lang === 'km' ? 'ច័ន្ទ (Mon)' : 'Monday'}</option>
            <option value="2">{lang === 'km' ? 'អង្គារ (Tue)' : 'Tuesday'}</option>
            <option value="3">{lang === 'km' ? 'ពុធ (Wed)' : 'Wednesday'}</option>
            <option value="4">{lang === 'km' ? 'ព្រហស្បតិ៍ (Thu)' : 'Thursday'}</option>
            <option value="5">{lang === 'km' ? 'សុក្រ (Fri)' : 'Friday'}</option>
            <option value="6">{lang === 'km' ? 'សៅរ៍ (Sat)' : 'Saturday'}</option>
            <option value="rotating">{lang === 'km' ? 'វិលជុំ (Rotating)' : 'Rotating'}</option>
          </select>
        </div>
      </div>

      {/* Employees Display: Grid View vs Table List View */}
      {viewMode === 'grid' ? (
        filteredEmployees.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 shadow-sm">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-bold text-slate-700">
              {lang === 'km' ? 'មិនមានទិន្នន័យបុគ្គលិកត្រូវនឹងតម្រងស្វែងរកទេ' : 'No staff members match the selected filters'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {lang === 'km' ? 'សូមសាកល្បងផ្លាស់ប្តូរពាក្យស្វែងរក ឬជ្រើសរើសសាខា/តួនាទីផ្សេង' : 'Try adjusting your search query or filter options'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredEmployees.map((emp) => {
              const branch = getBranch(emp.branchId);
              const isAdmin = emp.roleType === 'admin' || emp.role?.toLowerCase().includes('admin');
              const isManager = !isAdmin && (emp.roleType === 'manager' || emp.role?.toLowerCase().includes('manager'));
              const isSupervisor = !isAdmin && (emp.roleType === 'supervisor' || emp.role?.toLowerCase().includes('supervisor'));
              const isHr = !isAdmin && (emp.roleType === 'hr' || emp.role?.toLowerCase().includes('hr') || emp.departmentKh?.includes('ធនធានមនុស្ស'));
              const matchedShift = shifts.find((s) => s.id === emp.shiftId);
              const shiftBadge = getShiftCategoryBadge(emp.shiftId, lang);
              const workingHoursStr = getEmployeeWorkingHours(emp, matchedShift, lang);

              return (
                <div
                  key={emp.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition flex flex-col justify-between space-y-3.5 group"
                >
                  {/* Header with Avatar & Code */}
                  <div className="flex items-start space-x-3">
                    <div className="relative shrink-0">
                      <img
                        src={resolveAvatar(emp.avatar, null, emp.nameEn || emp.nameKh)}
                        alt={emp.nameEn}
                        referrerPolicy="no-referrer"
                        onError={(e) => handleAvatarError(e, emp.nameEn || emp.nameKh)}
                        className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-sm group-hover:ring-2 group-hover:ring-indigo-400 transition bg-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => handleOpenPhotoEdit(emp)}
                        title={lang === 'km' ? 'ប្តូររូបថត' : 'Change photo'}
                        className="absolute -bottom-1 -right-1 p-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition cursor-pointer"
                      >
                        <Camera className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {emp.code}
                        </span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-semibold">
                          PIN: {emp.pinCode || '1234'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 truncate mt-1">
                        {lang === 'km' ? emp.nameKh : emp.nameEn}
                      </h4>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border truncate max-w-full ${
                          isAdmin
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : isManager
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : isSupervisor
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : isHr
                            ? 'bg-teal-50 text-teal-700 border-teal-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {isAdmin ? `👑 ${emp.role}` : emp.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Shift & Schedule Badge */}
                  <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 shrink-0 ${shiftBadge.badgeBg} ${shiftBadge.badgeText} ${shiftBadge.badgeBorder}`}>
                      {emp.shiftId?.includes('cafe') || emp.departmentKh?.includes('កាហ្វេ') ? (
                        <Coffee className="w-3 h-3" />
                      ) : emp.shiftId?.includes('gas') || emp.departmentKh?.includes('ប្រេង') ? (
                        <Fuel className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      <span>{matchedShift ? (lang === 'km' ? matchedShift.nameKh.split('(')[0] : matchedShift.nameEn.split('(')[0]) : shiftBadge.label}</span>
                    </span>
                    <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg truncate" title={workingHoursStr}>
                      {workingHoursStr}
                    </span>
                  </div>

                  {/* Branch Assignment Info */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] space-y-1.5">
                    <div className="text-slate-500 flex items-center justify-between">
                      <span>{lang === 'km' ? 'សាខាប្រចាំការ:' : 'Assigned Branch:'}</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[130px]">
                        {branch?.nameEn}
                      </span>
                    </div>
                    <div className="text-slate-500 flex items-center justify-between">
                      <span>{lang === 'km' ? 'ផ្នែក:' : 'Department:'}</span>
                      <span className="text-slate-700 font-medium truncate max-w-[140px]">{emp.departmentKh}</span>
                    </div>
                    <div className="text-slate-500 flex items-center justify-between">
                      <span>{lang === 'km' ? 'ទូរស័ព្ទ:' : 'Phone:'}</span>
                      <span className="font-mono text-slate-700 font-medium">{emp.phone}</span>
                    </div>
                    {emp.address && (
                      <div className="text-slate-500 flex items-start justify-between gap-1 text-[11px]">
                        <span className="shrink-0">{lang === 'km' ? 'អាសយដ្ឋាន:' : 'Address:'}</span>
                        <span className="text-slate-700 font-medium truncate max-w-[150px] text-right" title={emp.address}>
                          {emp.address}
                        </span>
                      </div>
                    )}
                    <div className="text-slate-500 flex items-center justify-between">
                      <span>{lang === 'km' ? 'ថ្ងៃឈប់សម្រាក (Day Off):' : 'Weekly Day Off:'}</span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {getEmployeeDayOffName(emp, lang)}
                      </span>
                    </div>

                    {/* Hardware Device Lock Status */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Smartphone className="w-3 h-3 text-slate-400" />
                        <span>{lang === 'km' ? 'ឧបករណ៍:' : 'Device:'}</span>
                      </span>
                      {emp.trustedDeviceId ? (
                        <div className="flex items-center gap-1.5">
                          <span 
                            className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 truncate max-w-[100px]" 
                            title={`${emp.trustedDeviceName} (ID: ${emp.trustedDeviceId})`}
                          >
                            🔒 {emp.trustedDeviceName || 'Bound Phone'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleResetDevice(emp)}
                            title={lang === 'km' ? 'ដោះសោឧបករណ៍' : 'Reset / Unbind Device'}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition cursor-pointer"
                          >
                            {lang === 'km' ? 'ដោះសោ' : 'Reset'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                          {lang === 'km' ? 'មិនទាន់ភ្ជាប់' : 'Unbound'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenBadge(emp)}
                      className="flex-1 py-2 px-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center justify-center space-x-1 transition cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{lang === 'km' ? 'កាត QR' : 'QR Badge'}</span>
                    </button>

                    {/* Quick Shift & Working Hours Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenQuickSchedule(emp)}
                      title={lang === 'km' ? 'កំណត់វេនការងារ និងម៉ោង' : 'Set shift & working hours'}
                      className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-[11px] hidden sm:inline">{lang === 'km' ? 'វេន' : 'Shift'}</span>
                    </button>

                    {onOpenTransferModal && (
                      <button
                        type="button"
                        onClick={() => onOpenTransferModal(emp)}
                        title={lang === 'km' ? 'ផ្ទេរទៅសាខាផ្សេង' : 'Transfer to another branch'}
                        className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span className="text-[11px] hidden sm:inline">{lang === 'km' ? 'ផ្ទេរ' : 'Transfer'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(emp)}
                      title={lang === 'km' ? 'កែប្រែព័ត៌មាន' : 'Edit profile'}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    {onDeleteEmployee && (
                      <button
                        type="button"
                        onClick={() => handleDelete(emp)}
                        title={lang === 'km' ? 'លុប' : 'Delete'}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Table List View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">{lang === 'km' ? 'បុគ្គលិក (Staff)' : 'Staff Member'}</th>
                  <th className="py-3.5 px-4">{lang === 'km' ? 'អត្តលេខ & PIN' : 'ID & PIN'}</th>
                  <th className="py-3.5 px-4">{lang === 'km' ? 'តួនាទី & ផ្នែក' : 'Role & Dept'}</th>
                  <th className="py-3.5 px-4">{lang === 'km' ? 'សាខាប្រចាំការ' : 'Assigned Branch'}</th>
                  <th className="py-3.5 px-4">{lang === 'km' ? 'វេន & ម៉ោងការងារ' : 'Shift & Schedule'}</th>
                  <th className="py-3.5 px-4">{lang === 'km' ? 'ថ្ងៃឈប់ (Day Off)' : 'Weekly Day Off'}</th>
                  <th className="py-3.5 px-4">{lang === 'km' ? 'ទូរស័ព្ទ & ឧបករណ៍' : 'Phone & Device'}</th>
                  <th className="py-3.5 px-4 text-right">{lang === 'km' ? 'សកម្មភាព' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="font-bold text-slate-700">
                        {lang === 'km' ? 'មិនមានទិន្នន័យបុគ្គលិកត្រូវនឹងតម្រងស្វែងរកទេ' : 'No staff members match the selected filters'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {lang === 'km' ? 'សូមសាកល្បងផ្លាស់ប្តូរពាក្យស្វែងរក ឬជ្រើសរើសសាខា/តួនាទីផ្សេង' : 'Try adjusting your search query or filter options'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const branch = getBranch(emp.branchId);
                    const isAdmin = emp.roleType === 'admin' || emp.role?.toLowerCase().includes('admin');
                    const isManager = !isAdmin && (emp.roleType === 'manager' || emp.role?.toLowerCase().includes('manager'));
                    const isSupervisor = !isAdmin && (emp.roleType === 'supervisor' || emp.role?.toLowerCase().includes('supervisor'));
                    const isHr = !isAdmin && (emp.roleType === 'hr' || emp.role?.toLowerCase().includes('hr') || emp.departmentKh?.includes('ធនធានមនុស្ស'));
                    const matchedShift = shifts.find((s) => s.id === emp.shiftId);
                    const shiftBadge = getShiftCategoryBadge(emp.shiftId, lang);
                    const workingHoursStr = getEmployeeWorkingHours(emp, matchedShift, lang);
                    const avatarSrc = resolveAvatar(emp.avatar, null, emp.nameEn || emp.nameKh);

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/80 transition group">
                        {/* Avatar & Names */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="relative shrink-0">
                              <img
                                src={avatarSrc}
                                alt={emp.nameEn}
                                referrerPolicy="no-referrer"
                                onError={(e) => handleAvatarError(e, emp.nameEn || emp.nameKh)}
                                className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-xs bg-slate-100"
                              />
                              <button
                                type="button"
                                onClick={() => handleOpenPhotoEdit(emp)}
                                title={lang === 'km' ? 'ប្តូររូបថត' : 'Change photo'}
                                className="absolute -bottom-1 -right-1 p-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition cursor-pointer"
                              >
                                <Camera className="w-2.5 h-2.5" />
                              </button>
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 text-sm truncate">
                                {lang === 'km' ? emp.nameKh : emp.nameEn}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {lang === 'km' ? emp.nameEn : emp.nameKh}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* ID Code & PIN */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <span className="inline-block text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              {emp.code}
                            </span>
                            <div>
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 font-semibold font-mono">
                                PIN: {emp.pinCode || '1234'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Role & Dept */}
                        <td className="py-3 px-4">
                          <div className="space-y-1 max-w-[160px]">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border truncate max-w-full ${
                              isAdmin
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : isManager
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : isSupervisor
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : isHr
                                ? 'bg-teal-50 text-teal-700 border-teal-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {isAdmin ? `👑 ${emp.role}` : emp.role}
                            </span>
                            <div className="text-[11px] text-slate-500 truncate" title={emp.departmentKh}>
                              {emp.departmentKh}
                            </div>
                          </div>
                        </td>

                        {/* Assigned Branch */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 text-xs">
                            {branch?.nameEn || 'All Branches'}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[140px]">
                            {branch?.nameKh}
                          </div>
                        </td>

                        {/* Shift & Hours */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border inline-flex items-center gap-1 ${shiftBadge.badgeBg} ${shiftBadge.badgeText} ${shiftBadge.badgeBorder}`}>
                              {emp.shiftId?.includes('cafe') || emp.departmentKh?.includes('កាហ្វេ') ? (
                                <Coffee className="w-3 h-3" />
                              ) : emp.shiftId?.includes('gas') || emp.departmentKh?.includes('ប្រេង') ? (
                                <Fuel className="w-3 h-3" />
                              ) : (
                                <Clock className="w-3 h-3" />
                              )}
                              <span>{matchedShift ? (lang === 'km' ? matchedShift.nameKh.split('(')[0] : matchedShift.nameEn.split('(')[0]) : shiftBadge.label}</span>
                            </span>
                            <div className="font-mono text-[11px] font-bold text-slate-600 truncate" title={workingHoursStr}>
                              {workingHoursStr}
                            </div>
                          </div>
                        </td>

                        {/* Weekly Day Off */}
                        <td className="py-3 px-4">
                          <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-[11px] inline-block">
                            {getEmployeeDayOffName(emp, lang)}
                          </span>
                        </td>

                        {/* Phone & Device */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="font-mono text-xs text-slate-700 font-medium">
                              {emp.phone || '-'}
                            </div>
                            {emp.address && (
                              <div className="text-[10px] text-slate-500 truncate max-w-[140px]" title={emp.address}>
                                📍 {emp.address}
                              </div>
                            )}
                            <div>
                              {emp.trustedDeviceId ? (
                                <div className="flex items-center gap-1">
                                  <span 
                                    className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block truncate max-w-[90px]" 
                                    title={`${emp.trustedDeviceName} (ID: ${emp.trustedDeviceId})`}
                                  >
                                    🔒 {emp.trustedDeviceName || 'Bound'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleResetDevice(emp)}
                                    title={lang === 'km' ? 'ដោះសោឧបករណ៍' : 'Reset / Unbind Device'}
                                    className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition cursor-pointer"
                                  >
                                    {lang === 'km' ? 'ដោះសោ' : 'Reset'}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded inline-block">
                                  {lang === 'km' ? 'មិនទាន់ភ្ជាប់' : 'Unbound'}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenBadge(emp)}
                              title={lang === 'km' ? 'កាត QR' : 'QR Badge'}
                              className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition cursor-pointer"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenQuickSchedule(emp)}
                              title={lang === 'km' ? 'កំណត់វេនការងារ និងម៉ោង' : 'Set shift & working hours'}
                              className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition cursor-pointer"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>

                            {onOpenTransferModal && (
                              <button
                                type="button"
                                onClick={() => onOpenTransferModal(emp)}
                                title={lang === 'km' ? 'ផ្ទេរទៅសាខាផ្សេង' : 'Transfer to another branch'}
                                className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold transition cursor-pointer"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenEdit(emp)}
                              title={lang === 'km' ? 'កែប្រែព័ត៌មាន' : 'Edit profile'}
                              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {onDeleteEmployee && (
                              <button
                                type="button"
                                onClick={() => handleDelete(emp)}
                                title={lang === 'km' ? 'លុប' : 'Delete'}
                                className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Summary */}
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              {lang === 'km'
                ? `បង្ហាញ ${filteredEmployees.length} នៃបុគ្គលិកសរុប ${employees.length} នាក់`
                : `Showing ${filteredEmployees.length} of ${employees.length} total staff`}
            </span>
            <span className="font-medium text-slate-600">
              {lang === 'km' ? 'ចុចប៊ូតុងកាមេរ៉ាលើរូបថតដើម្បីផ្លាស់ប្តូររូបភាព' : 'Click camera button on photo to update staff portrait'}
            </span>
          </div>
        </div>
      )}

      {/* Digital ID Badge Modal */}
      {selectedBadgeEmp && (
        <DigitalIdCardModal
          employee={selectedBadgeEmp}
          branch={getBranch(selectedBadgeEmp.branchId)}
          branding={branding}
          lang={lang}
          onClose={() => setSelectedBadgeEmp(null)}
          onUpdatePhoto={handleUpdateBadgePhoto}
        />
      )}

      {/* Quick Photo Edit Modal */}
      {photoEditEmp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Camera className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-base">
                  {lang === 'km' 
                    ? `ប្តូររូបថតបុគ្គលិក: ${photoEditEmp.nameKh}`
                    : `Update Photo: ${photoEditEmp.nameEn}`}
                </h3>
              </div>
              <button onClick={() => setPhotoEditEmp(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Reusable Image Uploader */}
            <EmployeeImageUploader
              currentAvatar={editAvatar}
              onAvatarChange={setEditAvatar}
              lang={lang}
            />

            <div className="flex space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPhotoEditEmp(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
              >
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSavePhotoOnly}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition"
              >
                {lang === 'km' ? 'រក្សាទុករូបថត' : 'Save Photo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Full Profile Modal */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Edit className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-base">
                  {lang === 'km' ? 'កែប្រែព័ត៌មានបុគ្គលិក' : 'Edit Employee Profile'}
                </h3>
              </div>
              <button onClick={() => setEditingEmp(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateEmployeeSubmit} className="space-y-4 text-xs">
              {/* Photo Uploader */}
              <EmployeeImageUploader
                currentAvatar={editAvatar}
                onAvatarChange={setEditAvatar}
                lang={lang}
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">
                    {lang === 'km' ? 'ឈ្មោះជាភាសាខ្មែរ:' : 'Name in Khmer:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editNameKh}
                    onChange={(e) => setEditNameKh(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">
                    {lang === 'km' ? 'ឈ្មោះជាអក្សរឡាតាំង:' : 'Name in English:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editNameEn}
                    onChange={(e) => setEditNameEn(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">
                    {lang === 'km' ? 'អត្តលេខ (Code):' : 'Employee Code:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">
                    {lang === 'km' ? 'លេខ PIN (៤ខ្ទង់):' : '4-Digit PIN:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editPin}
                    onChange={(e) => setEditPin(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Quick Select Role Presets */}
              <div>
                <label className="block text-slate-600 mb-1.5 font-bold">
                  {lang === 'km' ? 'ជ្រើសរើសប្រភេទតួនាទី (Role Classification):' : 'Role Classification:'}
                </label>
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  {ROLE_PRESETS.map((preset) => {
                    const isSelected = editRoleType === preset.roleType;
                    return (
                      <button
                        key={preset.roleType}
                        type="button"
                        onClick={() => handleSelectEditRolePreset(preset)}
                        className={`p-2 rounded-xl border text-left flex items-center justify-between text-[11px] font-semibold transition cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        <span className="truncate">{lang === 'km' ? preset.titleKh : preset.titleEn}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${preset.badgeClass}`}>
                          {preset.prefix}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">
                  {lang === 'km' ? 'សាខាដែលត្រូវបំពេញការងារ (Branch):' : 'Assigned Branch:'}
                </label>
                <select
                  value={editBranchId}
                  onChange={(e) => {
                    const newBranchId = e.target.value;
                    setEditBranchId(newBranchId);
                    const b = branches.find((br) => br.id === newBranchId);
                    if (b) {
                      setEditDeptKh(b.nameKh);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {lang === 'km' ? b.nameKh : b.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">
                    {lang === 'km' ? 'ផ្នែក / ដេប៉ាតឺម៉ង់ (Department):' : 'Department:'}
                  </label>
                  <select
                    value={editDeptKh}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      setEditDeptKh(selectedVal);
                      // Auto-link to matching branch if department matches or contains a branch name
                      const matchingBranch = branches.find((b) => 
                        b.nameKh === selectedVal ||
                        b.nameEn.toLowerCase() === selectedVal.toLowerCase() ||
                        selectedVal.toLowerCase().includes(b.nameEn.toLowerCase()) ||
                        b.nameEn.toLowerCase().includes(selectedVal.toLowerCase()) ||
                        (selectedVal.includes('កាហ្វេ') && b.type === 'cafe') ||
                        (selectedVal.toLowerCase().includes('cafe') && b.type === 'cafe') ||
                        (selectedVal.includes('ប្រេង') && b.type === 'gas_station') ||
                        (selectedVal.toLowerCase().includes('gas') && b.type === 'gas_station')
                      );
                      if (matchingBranch) {
                        setEditBranchId(matchingBranch.id);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <optgroup label={lang === 'km' ? '🏢 សាខា / កន្លែងការងារ (Branches)' : '🏢 Branches / Venues'}>
                      {branches.map((b) => (
                        <option key={`branch_dept_${b.id}`} value={b.nameKh}>
                          📍 {lang === 'km' ? b.nameKh : b.nameEn}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={lang === 'km' ? '📋 ដេប៉ាតឺម៉ង់មុខងារ (Departments)' : '📋 Functional Departments'}>
                      {DEPARTMENT_OPTIONS.map((dept) => (
                        <option key={dept.id} value={dept.nameKh}>
                          {lang === 'km' ? dept.nameKh : dept.nameEn}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">
                    {lang === 'km' ? 'តួនាទីជាក់ស្តែង (Role / Title):' : 'Role / Title:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editRoleKh}
                    onChange={(e) => setEditRoleKh(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">
                  {lang === 'km' ? 'លេខទូរស័ព្ទ (Phone Number):' : 'Phone Number:'}
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">
                  {lang === 'km' ? 'អាសយដ្ឋានបច្ចុប្បន្ន (Residential Address):' : 'Residential Address:'}
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder={lang === 'km' ? 'ផ្ទះលេខ, ផ្លូវ, សង្កាត់, រាជធានី/ខេត្ត...' : 'House No, Street, City/Province...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Shift & Working Hours Section */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-indigo-900 font-bold text-xs">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>{lang === 'km' ? 'វេនការងារ & ម៉ោងបំពេញ (Work Shift & Hours)' : 'Work Shift & Working Hours'}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {lang === 'km' ? 'បារីស្តា • ស្ថានីយប្រេង • ការិយាល័យ' : 'Barista • Gas Station • Office'}
                  </span>
                </div>

                {/* Quick 1-Click Shift Presets */}
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1.5 font-bold">
                    {lang === 'km' ? 'ជ្រើសរើសវេនរហ័ស (Quick Shift Presets):' : 'Quick Shift Presets:'}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyShiftToForm('shift_cafe_morning', 'edit')}
                      className={`p-1.5 rounded-xl border text-left flex items-center justify-between text-[11px] font-semibold transition cursor-pointer ${
                        editShiftId === 'shift_cafe_morning'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
                          : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="truncate flex items-center gap-1">☕ {lang === 'km' ? 'បារីស្តា ព្រឹក' : 'Barista Morning'}</span>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">06:30-14:30</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyShiftToForm('shift_cafe_afternoon', 'edit')}
                      className={`p-1.5 rounded-xl border text-left flex items-center justify-between text-[11px] font-semibold transition cursor-pointer ${
                        editShiftId === 'shift_cafe_afternoon'
                          ? 'border-orange-600 bg-orange-50 text-orange-900 ring-1 ring-orange-500'
                          : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="truncate flex items-center gap-1">☕ {lang === 'km' ? 'បារីស្តា រសៀល' : 'Barista Afternoon'}</span>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-orange-100 text-orange-800 font-mono">13:30-21:30</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyShiftToForm('shift_cafe_fulltime', 'edit')}
                      className={`p-1.5 rounded-xl border text-left flex items-center justify-between text-[11px] font-semibold transition cursor-pointer ${
                        editShiftId === 'shift_cafe_fulltime'
                          ? 'border-teal-600 bg-teal-50 text-teal-900 ring-1 ring-teal-500'
                          : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="truncate flex items-center gap-1">☕ {lang === 'km' ? 'បារីស្តា ពេញម៉ោង' : 'Barista Full-Time'}</span>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-teal-100 text-teal-800 font-mono">07:00-16:30</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyShiftToForm('shift_gas_morning', 'edit')}
                      className={`p-1.5 rounded-xl border text-left flex items-center justify-between text-[11px] font-semibold transition cursor-pointer ${
                        editShiftId === 'shift_gas_morning'
                          ? 'border-amber-600 bg-amber-50 text-amber-900 ring-1 ring-amber-500'
                          : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="truncate flex items-center gap-1">⛽ {lang === 'km' ? 'ស្ថានីយប្រេង ព្រឹក' : 'Gas Station AM'}</span>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-800 font-mono">06:00-14:00</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyShiftToForm('shift_gas_afternoon', 'edit')}
                      className={`p-1.5 rounded-xl border text-left flex items-center justify-between text-[11px] font-semibold transition cursor-pointer ${
                        editShiftId === 'shift_gas_afternoon'
                          ? 'border-red-600 bg-red-50 text-red-900 ring-1 ring-red-500'
                          : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="truncate flex items-center gap-1">⛽ {lang === 'km' ? 'ស្ថានីយប្រេង រសៀល' : 'Gas Station PM'}</span>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-red-100 text-red-800 font-mono">14:00-22:00</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyShiftToForm('shift_gas_fulltime', 'edit')}
                      className={`p-1.5 rounded-xl border text-left flex items-center justify-between text-[11px] font-semibold transition cursor-pointer ${
                        editShiftId === 'shift_gas_fulltime'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500'
                          : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="truncate flex items-center gap-1">⛽ {lang === 'km' ? 'ស្ថានីយប្រេង ពេញម៉ោង' : 'Gas Full-Time'}</span>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono">07:00-16:30</span>
                    </button>
                  </div>
                </div>

                {/* Shift Selector Dropdown */}
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">
                    {lang === 'km' ? 'ជ្រើសរើសវេនការងារ (Shift):' : 'Select Work Shift:'}
                  </label>
                  <select
                    value={editShiftId}
                    onChange={(e) => applyShiftToForm(e.target.value, 'edit')}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {lang === 'km' ? s.nameKh : s.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Hours Overrides */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">
                      {lang === 'km' ? 'ម៉ោងចូល (Start):' : 'Start Time:'}
                    </label>
                    <input
                      type="time"
                      value={editShiftStartTime}
                      onChange={(e) => setEditShiftStartTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-slate-800 font-mono text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">
                      {lang === 'km' ? 'ម៉ោងចេញ (End):' : 'End Time:'}
                    </label>
                    <input
                      type="time"
                      value={editShiftEndTime}
                      onChange={(e) => setEditShiftEndTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-slate-800 font-mono text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">
                      {lang === 'km' ? 'ម៉ោងសរុប (Hours):' : 'Daily Hours:'}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="16"
                      value={editScheduledHours}
                      onChange={(e) => setEditScheduledHours(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-slate-800 font-mono text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Weekly Day Off Dropdown */}
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold flex items-center justify-between">
                    <span>{lang === 'km' ? 'ថ្ងៃឈប់សម្រាកប្រចាំសប្តាហ៍ (Weekly Day Off):' : 'Weekly Day Off (1 Day Off / Rotating):'}</span>
                    <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                      {lang === 'km' ? 'បារីស្តា & ស្ថានីយប្រេង' : 'Cafe & Gas Station'}
                    </span>
                  </label>
                  <select
                    value={editWeeklyDayOff}
                    onChange={(e) => setEditWeeklyDayOff(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value={0}>{lang === 'km' ? '🔴 ថ្ងៃអាទិត្យ (Sunday) [ការិយាល័យ / ឃ្លាំង]' : '🔴 Sunday [Office / Warehouse]'}</option>
                    <option value={1}>{lang === 'km' ? '☕ ថ្ងៃច័ន្ទ (Monday) [បុគ្គលិកកាហ្វេ / បារីស្តា / ស្ថានីយ]' : '☕ Monday [Cafe Barista / Gas Station]'}</option>
                    <option value={2}>{lang === 'km' ? '☕ ថ្ងៃអង្គារ (Tuesday) [បុគ្គលិកកាហ្វេ / បារីស្តា / ស្ថានីយ]' : '☕ Tuesday [Cafe Barista / Gas Station]'}</option>
                    <option value={3}>{lang === 'km' ? '☕ ថ្ងៃពុធ (Wednesday) [បុគ្គលិកកាហ្វេ / បារីស្តា / ស្ថានីយ]' : '☕ Wednesday [Cafe Barista / Gas Station]'}</option>
                    <option value={4}>{lang === 'km' ? '☕ ថ្ងៃព្រហស្បតិ៍ (Thursday) [បុគ្គលិកកាហ្វេ / បារីស្តា / ស្ថានីយ]' : '☕ Thursday [Cafe Barista / Gas Station]'}</option>
                    <option value={5}>{lang === 'km' ? '☕ ថ្ងៃសុក្រ (Friday) [បុគ្គលិកកាហ្វេ / បារីស្តា / ស្ថានីយ]' : '☕ Friday [Cafe Barista / Gas Station]'}</option>
                    <option value={6}>{lang === 'km' ? '☕ ថ្ងៃសៅរ៍ (Saturday) [បុគ្គលិកកាហ្វេ / បារីស្តា / ស្ថានីយ]' : '☕ Saturday [Cafe Barista / Gas Station]'}</option>
                    <option value={-1}>{lang === 'km' ? '🔄 វេនវិលជុំ (Rotating / No Fixed Day Off)' : '🔄 Rotating / No Fixed Day Off'}</option>
                  </select>
                </div>
              </div>

              {/* Hardware Device Binding Security Status */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{lang === 'km' ? 'សុវត្ថិភាពឧបករណ៍ (Hardware Device Binding):' : 'Hardware Device Binding:'}</span>
                  </span>
                  <p className="text-[10px] text-slate-500">
                    {editingEmp.trustedDeviceId
                      ? (lang === 'km' ? `ភ្ជាប់ជាមួយ: ${editingEmp.trustedDeviceName || 'ទូរស័ព្ទ'}` : `Bound to: ${editingEmp.trustedDeviceName || 'Phone'}`)
                      : (lang === 'km' ? 'មិនទាន់មានឧបករណ៍ភ្ជាប់ទេ (អាចចុះឈ្មោះពេលស្កេន)' : 'No device bound (will enroll on first scan)')}
                  </p>
                </div>
                {editingEmp.trustedDeviceId ? (
                  <button
                    type="button"
                    onClick={() => handleResetDevice(editingEmp)}
                    className="py-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{lang === 'km' ? 'ដោះសោឧបករណ៍' : 'Reset Device'}</span>
                  </button>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-200 text-slate-600">
                    {lang === 'km' ? 'រួចរាល់' : 'Unbound'}
                  </span>
                )}
              </div>

              <div className="flex space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
                >
                  {lang === 'km' ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-200 transition"
                >
                  {lang === 'km' ? 'រក្សាទុកការផ្លាស់ប្តូរ' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-base">
                  {lang === 'km' ? 'បន្ថែមបុគ្គលិកថ្មី' : 'Add New Employee'}
                </h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs">
              {/* Photo Uploader Component */}
              <EmployeeImageUploader
                currentAvatar={newEmpAvatar}
                onAvatarChange={setNewEmpAvatar}
                lang={lang}
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">
                    {lang === 'km' ? 'ឈ្មោះជាភាសាខ្មែរ (Name in Khmer):' : 'Name in Khmer:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newEmpNameKh}
                    onChange={(e) => setNewEmpNameKh(e.target.value)}
                    placeholder="ឧ. សុខ ចាន់ដារ៉ា"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">
                    {lang === 'km' ? 'ឈ្មោះជាអក្សរឡាតាំង (Name in English):' : 'Name in English:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newEmpNameEn}
                    onChange={(e) => setNewEmpNameEn(e.target.value)}
                    placeholder="e.g. Sok Chandara"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">
                    {lang === 'km' ? 'អត្តលេខ (Code):' : 'Employee Code:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newEmpCode}
                    onChange={(e) => setNewEmpCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">
                    {lang === 'km' ? 'លេខ PIN (៤ខ្ទង់):' : '4-Digit PIN:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newEmpPin}
                    onChange={(e) => setNewEmpPin(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Quick Select Role Presets */}
              <div>
                <label className="block text-slate-600 mb-1.5 font-bold">
                  {lang === 'km' ? 'ជ្រើសរើសប្រភេទតួនាទី (Role Classification):' : 'Role Classification:'}
                </label>
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  {ROLE_PRESETS.map((preset) => {
                    const isSelected = newEmpRoleType === preset.roleType;
                    return (
                      <button
                        key={preset.roleType}
                        type="button"
                        onClick={() => handleSelectAddRolePreset(preset)}
                        className={`p-2 rounded-xl border text-left flex items-center justify-between text-[11px] font-semibold transition cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        <span className="truncate">{lang === 'km' ? preset.titleKh : preset.titleEn}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${preset.badgeClass}`}>
                          {preset.prefix}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">
                  {lang === 'km' ? 'សាខាដែលត្រូវបំពេញការងារ (Branch):' : 'Assigned Branch:'}
                </label>
                <select
                  value={newEmpBranchId}
                  onChange={(e) => setNewEmpBranchId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {lang === 'km' ? b.nameKh : b.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">
                    {lang === 'km' ? 'ផ្នែក / ដេប៉ាតឺម៉ង់ (Department):' : 'Department:'}
                  </label>
                  <select
                    value={newEmpDeptKh}
                    onChange={(e) => setNewEmpDeptKh(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    {DEPARTMENT_OPTIONS.map((dept) => (
                      <option key={dept.id} value={dept.nameKh}>
                        {lang === 'km' ? dept.nameKh : dept.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">
                    {lang === 'km' ? 'តួនាទីជាក់ស្តែង (Role / Title):' : 'Role / Title:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newEmpRoleKh}
                    onChange={(e) => setNewEmpRoleKh(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">
                  {lang === 'km' ? 'លេខទូរស័ព្ទ (Phone Number):' : 'Phone Number:'}
                </label>
                <input
                  type="text"
                  value={newEmpPhone}
                  onChange={(e) => setNewEmpPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">
                  {lang === 'km' ? 'អាសយដ្ឋានបច្ចុប្បន្ន (Residential Address):' : 'Residential Address:'}
                </label>
                <input
                  type="text"
                  value={newEmpAddress}
                  onChange={(e) => setNewEmpAddress(e.target.value)}
                  placeholder={lang === 'km' ? 'ផ្ទះលេខ, ផ្លូវ, សង្កាត់, រាជធានី/ខេត្ត...' : 'House No, Street, City/Province...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Shift & Working Hours Section */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-indigo-900 font-bold text-xs">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>{lang === 'km' ? 'វេនការងារ & ម៉ោងបំពេញ (Work Shift & Hours)' : 'Work Shift & Working Hours'}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {lang === 'km' ? 'បារីស្តា • ស្ថានីយប្រេង • ការិយាល័យ' : 'Barista • Gas Station • Office'}
                  </span>
                </div>

                {/* Quick 1-Click Shift Presets */}
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1.5 font-bold">
                    {lang === 'km' ? 'ជ្រើសរើសវេនរហ័ស (Quick Shift Presets):' : 'Quick Shift Presets:'}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyShiftToForm('shift_cafe_morning', 'add')}
                      className={`p-1.5 rounded-xl border text-left flex items-center justify-between text-[11px] font-semibold transition cursor-pointer ${
                        newEmpShiftId === 'shift_cafe_morning'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
                          : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="truncate flex items-center gap-1">☕ {lang === 'km' ? 'បារីស្តា ព្រឹក' : 'Barista Morning'}</span>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">06:30-14:30</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyShiftToForm('shift_cafe_afternoon', 'add')}
                      className={`p-1.5 rounded-xl border text-left flex items-center justify-between text-[11px] font-semibold transition cursor-pointer ${
                        newEmpShiftId === 'shift_cafe_afternoon'
                          ? 'border-orange-600 bg-orange-50 text-orange-900 ring-1 ring-orange-500'
                          : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="truncate flex items-center gap-1">☕ {lang === 'km' ? 'បារីស្តា រសៀល' : 'Barista Afternoon'}</span>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-orange-100 text-orange-800 font-mono">13:30-21:30</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyShiftToForm('shift_cafe_fulltime', 'add')}
                      className={`p-1.5 rounded-xl border text-left flex items-center justify-between text-[11px] font-semibold transition cursor-pointer ${
                        newEmpShiftId === 'shift_cafe_fulltime'
                          ? 'border-teal-600 bg-teal-50 text-teal-900 ring-1 ring-teal-500'
                          : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="truncate flex items-center gap-1">☕ {lang === 'km' ? 'បារីស្តា ពេញម៉ោង' : 'Barista Full-Time'}</span>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-teal-100 text-teal-800 font-mono">07:00-16:30</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyShiftToForm('shift_gas_morning', 'add')}
                      className={`p-1.5 rounded-xl border text-left flex items-center justify-between text-[11px] font-semibold transition cursor-pointer ${
                        newEmpShiftId === 'shift_gas_morning'
                          ? 'border-amber-600 bg-amber-50 text-amber-900 ring-1 ring-amber-500'
                          : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="truncate flex items-center gap-1">⛽ {lang === 'km' ? 'ស្ថានីយប្រេង ព្រឹក' : 'Gas Station AM'}</span>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-800 font-mono">06:00-14:00</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyShiftToForm('shift_gas_afternoon', 'add')}
                      className={`p-1.5 rounded-xl border text-left flex items-center justify-between text-[11px] font-semibold transition cursor-pointer ${
                        newEmpShiftId === 'shift_gas_afternoon'
                          ? 'border-red-600 bg-red-50 text-red-900 ring-1 ring-red-500'
                          : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="truncate flex items-center gap-1">⛽ {lang === 'km' ? 'ស្ថានីយប្រេង រសៀល' : 'Gas Station PM'}</span>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-red-100 text-red-800 font-mono">14:00-22:00</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyShiftToForm('shift_gas_fulltime', 'add')}
                      className={`p-1.5 rounded-xl border text-left flex items-center justify-between text-[11px] font-semibold transition cursor-pointer ${
                        newEmpShiftId === 'shift_gas_fulltime'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500'
                          : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="truncate flex items-center gap-1">⛽ {lang === 'km' ? 'ស្ថានីយប្រេង ពេញម៉ោង' : 'Gas Full-Time'}</span>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono">07:00-16:30</span>
                    </button>
                  </div>
                </div>

                {/* Shift Selector Dropdown */}
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">
                    {lang === 'km' ? 'ជ្រើសរើសវេនការងារ (Shift):' : 'Select Work Shift:'}
                  </label>
                  <select
                    value={newEmpShiftId}
                    onChange={(e) => applyShiftToForm(e.target.value, 'add')}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {lang === 'km' ? s.nameKh : s.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Hours Overrides */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">
                      {lang === 'km' ? 'ម៉ោងចូល (Start):' : 'Start Time:'}
                    </label>
                    <input
                      type="time"
                      value={newEmpShiftStartTime}
                      onChange={(e) => setNewEmpShiftStartTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-slate-800 font-mono text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">
                      {lang === 'km' ? 'ម៉ោងចេញ (End):' : 'End Time:'}
                    </label>
                    <input
                      type="time"
                      value={newEmpShiftEndTime}
                      onChange={(e) => setNewEmpShiftEndTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-slate-800 font-mono text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">
                      {lang === 'km' ? 'ម៉ោងសរុប (Hours):' : 'Daily Hours:'}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="16"
                      value={newEmpScheduledHours}
                      onChange={(e) => setNewEmpScheduledHours(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-slate-800 font-mono text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Weekly Day Off Dropdown */}
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold flex items-center justify-between">
                    <span>{lang === 'km' ? 'ថ្ងៃឈប់សម្រាកប្រចាំសប្តាហ៍ (Weekly Day Off):' : 'Weekly Day Off (1 Day Off / Rotating):'}</span>
                    <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                      {lang === 'km' ? 'បារីស្តា & ស្ថានីយប្រេង' : 'Cafe & Gas Station'}
                    </span>
                  </label>
                  <select
                    value={newEmpWeeklyDayOff}
                    onChange={(e) => setNewEmpWeeklyDayOff(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value={0}>{lang === 'km' ? '🔴 ថ្ងៃអាទិត្យ (Sunday) [ការិយាល័យ / ឃ្លាំង]' : '🔴 Sunday [Office / Warehouse]'}</option>
                    <option value={1}>{lang === 'km' ? '☕ ថ្ងៃច័ន្ទ (Monday) [បុគ្គលិកកាហ្វេ / បារីស្តា / ស្ថានីយ]' : '☕ Monday [Cafe Barista / Gas Station]'}</option>
                    <option value={2}>{lang === 'km' ? '☕ ថ្ងៃអង្គារ (Tuesday) [បុគ្គលិកកាហ្វេ / បារីស្តា / ស្ថានីយ]' : '☕ Tuesday [Cafe Barista / Gas Station]'}</option>
                    <option value={3}>{lang === 'km' ? '☕ ថ្ងៃពុធ (Wednesday) [បុគ្គលិកកាហ្វេ / បារីស្តា / ស្ថានីយ]' : '☕ Wednesday [Cafe Barista / Gas Station]'}</option>
                    <option value={4}>{lang === 'km' ? '☕ ថ្ងៃព្រហស្បតិ៍ (Thursday) [បុគ្គលិកកាហ្វេ / បារីស្តា / ស្ថានីយ]' : '☕ Thursday [Cafe Barista / Gas Station]'}</option>
                    <option value={5}>{lang === 'km' ? '☕ ថ្ងៃសុក្រ (Friday) [បុគ្គលិកកាហ្វេ / បារីស្តា / ស្ថានីយ]' : '☕ Friday [Cafe Barista / Gas Station]'}</option>
                    <option value={6}>{lang === 'km' ? '☕ ថ្ងៃសៅរ៍ (Saturday) [បុគ្គលិកកាហ្វេ / បារីស្តា / ស្ថានីយ]' : '☕ Saturday [Cafe Barista / Gas Station]'}</option>
                    <option value={-1}>{lang === 'km' ? '🔄 វេនវិលជុំ (Rotating / No Fixed Day Off)' : '🔄 Rotating / No Fixed Day Off'}</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
                >
                  {lang === 'km' ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-200 transition"
                >
                  {lang === 'km' ? 'រក្សាទុក' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Quick Shift & Working Hours Modal */}
      {quickScheduleEmp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                    {lang === 'km' ? 'កំណត់វេនការងារ & ម៉ោងបំពេញ' : 'Set Work Shift, Hours & Day Off'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {quickScheduleEmp.nameKh || quickScheduleEmp.nameEn} ({quickScheduleEmp.code})
                  </p>
                </div>
              </div>
              <button onClick={() => setQuickScheduleEmp(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickSchedule} className="space-y-4 text-xs">
              {/* Quick Shift Presets */}
              <div>
                <label className="block text-[11px] text-slate-600 mb-1.5 font-bold">
                  {lang === 'km' ? 'ជ្រើសរើសវេនរហ័ស (Quick Shift Presets):' : 'Quick Shift Presets:'}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyShiftToForm('shift_cafe_morning', 'quick')}
                    className={`p-1.5 rounded-xl border text-left flex items-center justify-between text-[11px] font-semibold transition cursor-pointer ${
                      quickShiftId === 'shift_cafe_morning'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="truncate flex items-center gap-1">☕ {lang === 'km' ? 'បារីស្តា ព្រឹក' : 'Barista Morning'}</span>
                    <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">06:30-14:30</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyShiftToForm('shift_cafe_afternoon', 'quick')}
                    className={`p-1.5 rounded-xl border text-left flex items-center justify-between text-[11px] font-semibold transition cursor-pointer ${
                      quickShiftId === 'shift_cafe_afternoon'
                        ? 'border-orange-600 bg-orange-50 text-orange-900 ring-1 ring-orange-500'
                        : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="truncate flex items-center gap-1">☕ {lang === 'km' ? 'បារីស្តា រសៀល' : 'Barista Afternoon'}</span>
                    <span className="text-[9px] px-1 py-0.5 rounded bg-orange-100 text-orange-800 font-mono">13:30-21:30</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyShiftToForm('shift_cafe_fulltime', 'quick')}
                    className={`p-1.5 rounded-xl border text-left flex items-center justify-between text-[11px] font-semibold transition cursor-pointer ${
                      quickShiftId === 'shift_cafe_fulltime'
                        ? 'border-teal-600 bg-teal-50 text-teal-900 ring-1 ring-teal-500'
                        : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="truncate flex items-center gap-1">☕ {lang === 'km' ? 'បារីស្តា ពេញម៉ោង' : 'Barista Full-Time'}</span>
                    <span className="text-[9px] px-1 py-0.5 rounded bg-teal-100 text-teal-800 font-mono">07:00-16:30</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyShiftToForm('shift_gas_morning', 'quick')}
                    className={`p-1.5 rounded-xl border text-left flex items-center justify-between text-[11px] font-semibold transition cursor-pointer ${
                      quickShiftId === 'shift_gas_morning'
                        ? 'border-amber-600 bg-amber-50 text-amber-900 ring-1 ring-amber-500'
                        : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="truncate flex items-center gap-1">⛽ {lang === 'km' ? 'ស្ថានីយប្រេង ព្រឹក' : 'Gas Station AM'}</span>
                    <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-800 font-mono">06:00-14:00</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyShiftToForm('shift_gas_afternoon', 'quick')}
                    className={`p-1.5 rounded-xl border text-left flex items-center justify-between text-[11px] font-semibold transition cursor-pointer ${
                      quickShiftId === 'shift_gas_afternoon'
                        ? 'border-red-600 bg-red-50 text-red-900 ring-1 ring-red-500'
                        : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="truncate flex items-center gap-1">⛽ {lang === 'km' ? 'ស្ថានីយប្រេង រសៀល' : 'Gas Station PM'}</span>
                    <span className="text-[9px] px-1 py-0.5 rounded bg-red-100 text-red-800 font-mono">14:00-22:00</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyShiftToForm('shift_gas_fulltime', 'quick')}
                    className={`p-1.5 rounded-xl border text-left flex items-center justify-between text-[11px] font-semibold transition cursor-pointer ${
                      quickShiftId === 'shift_gas_fulltime'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="truncate flex items-center gap-1">⛽ {lang === 'km' ? 'ស្ថានីយប្រេង ពេញម៉ោង' : 'Gas Full-Time'}</span>
                    <span className="text-[9px] px-1 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono">07:00-16:30</span>
                  </button>
                </div>
              </div>

              {/* Shift Selector */}
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">
                  {lang === 'km' ? 'ជ្រើសរើសវេនការងារ (Shift):' : 'Select Work Shift:'}
                </label>
                <select
                  value={quickShiftId}
                  onChange={(e) => applyShiftToForm(e.target.value, 'quick')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {lang === 'km' ? s.nameKh : s.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Working Hours Input */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">
                    {lang === 'km' ? 'ម៉ោងចូល (Start):' : 'Start Time:'}
                  </label>
                  <input
                    type="time"
                    value={quickStartTime}
                    onChange={(e) => setQuickStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-slate-800 font-mono text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">
                    {lang === 'km' ? 'ម៉ោងចេញ (End):' : 'End Time:'}
                  </label>
                  <input
                    type="time"
                    value={quickEndTime}
                    onChange={(e) => setQuickEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-slate-800 font-mono text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">
                    {lang === 'km' ? 'ម៉ោងសរុប (Hours):' : 'Daily Hours:'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="16"
                    value={quickScheduledHours}
                    onChange={(e) => setQuickScheduledHours(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-slate-800 font-mono text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Weekly Day Off */}
              <div>
                <label className="block text-slate-600 mb-1 font-semibold flex items-center justify-between">
                  <span>{lang === 'km' ? 'ថ្ងៃឈប់សម្រាកប្រចាំសប្តាហ៍ (Weekly Day Off):' : 'Weekly Day Off (1 Day Off / Rotating):'}</span>
                  <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                    {lang === 'km' ? 'បារីស្តា & ស្ថានីយប្រេង' : 'Cafe & Gas Station'}
                  </span>
                </label>
                <select
                  value={quickWeeklyDayOff}
                  onChange={(e) => setQuickWeeklyDayOff(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value={0}>{lang === 'km' ? '🔴 ថ្ងៃអាទិត្យ (Sunday) [ការិយាល័យ / ឃ្លាំង]' : '🔴 Sunday [Office / Warehouse]'}</option>
                  <option value={1}>{lang === 'km' ? '☕ ថ្ងៃច័ន្ទ (Monday) [បុគ្គលិកកាហ្វេ / បារីស្តា / ស្ថានីយ]' : '☕ Monday [Cafe Barista / Gas Station]'}</option>
                  <option value={2}>{lang === 'km' ? '☕ ថ្ងៃអង្គារ (Tuesday) [បុគ្គលិកកាហ្វេ / បារីស្តា / ស្ថានីយ]' : '☕ Tuesday [Cafe Barista / Gas Station]'}</option>
                  <option value={3}>{lang === 'km' ? '☕ ថ្ងៃពុធ (Wednesday) [បុគ្គលិកកាហ្វេ / បារីស្តា / ស្ថានីយ]' : '☕ Wednesday [Cafe Barista / Gas Station]'}</option>
                  <option value={4}>{lang === 'km' ? '☕ ថ្ងៃព្រហស្បតិ៍ (Thursday) [បុគ្គលិកកាហ្វេ / បារីស្តា / ស្ថានីយ]' : '☕ Thursday [Cafe Barista / Gas Station]'}</option>
                  <option value={5}>{lang === 'km' ? '☕ ថ្ងៃសុក្រ (Friday) [បុគ្គលិកកាហ្វេ / បារីស្តា / ស្ថានីយ]' : '☕ Friday [Cafe Barista / Gas Station]'}</option>
                  <option value={6}>{lang === 'km' ? '☕ ថ្ងៃសៅរ៍ (Saturday) [បុគ្គលិកកាហ្វេ / បារីស្តា / ស្ថានីយ]' : '☕ Saturday [Cafe Barista / Gas Station]'}</option>
                  <option value={-1}>{lang === 'km' ? '🔄 វេនវិលជុំ (Rotating / No Fixed Day Off)' : '🔄 Rotating / No Fixed Day Off'}</option>
                </select>
              </div>

              <div className="flex space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickScheduleEmp(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
                >
                  {lang === 'km' ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-200 transition"
                >
                  {lang === 'km' ? 'រក្សាទុកវេន & ម៉ោង' : 'Save Shift & Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
