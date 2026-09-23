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
  ArrowRightLeft
} from 'lucide-react';
import { Employee, Branch, AttendanceRecord, Language, CompanyBranding } from '../types';
import { INITIAL_BRANDING } from '../data/initialData';
import { EmployeeImageUploader } from './EmployeeImageUploader';
import { DigitalIdCardModal } from './DigitalIdCardModal';

interface EmployeeDirectoryViewProps {
  employees: Employee[];
  branches: Branch[];
  attendanceRecords: AttendanceRecord[];
  onAddEmployee: (emp: Employee) => void;
  onUpdateEmployee?: (emp: Employee) => void;
  onDeleteEmployee?: (empId: string) => void;
  onOpenTransferModal?: (emp: Employee) => void;
  lang: Language;
  branding?: CompanyBranding;
}

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80';

export const EmployeeDirectoryView: React.FC<EmployeeDirectoryViewProps> = ({
  employees,
  branches,
  attendanceRecords,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onOpenTransferModal,
  lang,
  branding = INITIAL_BRANDING,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');
  const [selectedBadgeEmp, setSelectedBadgeEmp] = useState<Employee | null>(null);
  const [badgeQrUrl, setBadgeQrUrl] = useState<string>('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [photoEditEmp, setPhotoEditEmp] = useState<Employee | null>(null);

  // New Employee Form State
  const [newEmpNameKh, setNewEmpNameKh] = useState('');
  const [newEmpNameEn, setNewEmpNameEn] = useState('');
  const [newEmpCode, setNewEmpCode] = useState(`EMP-${Math.floor(100 + Math.random() * 900)}`);
  const [newEmpBranchId, setNewEmpBranchId] = useState(branches[0]?.id || 'br_office');
  const [newEmpDeptKh, setNewEmpDeptKh] = useState('សេវាកម្មទូទៅ');
  const [newEmpRoleKh, setNewEmpRoleKh] = useState('បុគ្គលិក');
  const [newEmpPhone, setNewEmpPhone] = useState('012 345 678');
  const [newEmpPin, setNewEmpPin] = useState(String(Math.floor(1000 + Math.random() * 9000)));
  const [newEmpAvatar, setNewEmpAvatar] = useState(DEFAULT_AVATAR);

  // Edit Employee Form State
  const [editNameKh, setEditNameKh] = useState('');
  const [editNameEn, setEditNameEn] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editBranchId, setEditBranchId] = useState('');
  const [editDeptKh, setEditDeptKh] = useState('');
  const [editRoleKh, setEditRoleKh] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editAvatar, setEditAvatar] = useState('');

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
    setEditBranchId(emp.branchId);
    setEditDeptKh(emp.departmentKh);
    setEditRoleKh(emp.role);
    setEditPhone(emp.phone);
    setEditPin(emp.pinCode || '1234');
    setEditAvatar(emp.avatar || DEFAULT_AVATAR);
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

    const newEmp: Employee = {
      id: `emp_${Date.now()}`,
      code: newEmpCode,
      nameKh: newEmpNameKh,
      nameEn: newEmpNameEn,
      branchId: newEmpBranchId,
      department: 'Operations',
      departmentKh: newEmpDeptKh,
      role: newEmpRoleKh,
      roleKh: newEmpRoleKh,
      shiftId: 'shift_office',
      avatar: newEmpAvatar || DEFAULT_AVATAR,
      phone: newEmpPhone,
      email: `${newEmpNameEn.toLowerCase().replace(/\s+/g, '.')}@enterprise.com.kh`,
      status: 'active',
      pinCode: newEmpPin,
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
    setNewEmpCode(`EMP-${Math.floor(100 + Math.random() * 900)}`);
    setNewEmpAvatar(DEFAULT_AVATAR);
  };

  const handleUpdateEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp || !onUpdateEmployee) return;

    const updated: Employee = {
      ...editingEmp,
      nameKh: editNameKh,
      nameEn: editNameEn,
      code: editCode,
      branchId: editBranchId,
      departmentKh: editDeptKh,
      role: editRoleKh,
      roleKh: editRoleKh,
      phone: editPhone,
      pinCode: editPin,
      avatar: editAvatar || DEFAULT_AVATAR,
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

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesBranch = selectedBranchFilter === 'all' || emp.branchId === selectedBranchFilter;
    const matchesSearch =
      emp.nameKh.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.phone.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBranch && matchesSearch;
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

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-200 transition w-full md:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'km' ? 'បន្ថែមបុគ្គលិកថ្មី (រូបថត)' : 'Add Employee & Photo'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'km' ? 'ស្វែងរកតាមឈ្មោះ អត្តលេខ ឬលេខទូរស័ព្ទ...' : 'Search by name, employee code, or phone...'}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={selectedBranchFilter}
            onChange={(e) => setSelectedBranchFilter(e.target.value)}
            aria-label={lang === 'km' ? 'ជ្រើសរើសសាខា' : 'Filter by branch'}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium shadow-sm"
          >
            <option value="all">{lang === 'km' ? 'គ្រប់សាខាទាំងអស់ (All Branches)' : 'All Branches (7)'}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {lang === 'km' ? b.nameKh : b.nameEn}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredEmployees.map((emp) => {
          const branch = getBranch(emp.branchId);
          return (
            <div
              key={emp.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition flex flex-col justify-between space-y-3.5 group"
            >
              {/* Header with Avatar & Code */}
              <div className="flex items-start space-x-3">
                <div className="relative shrink-0">
                  <img
                    src={emp.avatar || DEFAULT_AVATAR}
                    alt={emp.nameEn}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = DEFAULT_AVATAR;
                    }}
                    className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-sm group-hover:ring-2 group-hover:ring-indigo-400 transition bg-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => handleOpenPhotoEdit(emp)}
                    title={lang === 'km' ? 'ប្តូររូបថត' : 'Change photo'}
                    className="absolute -bottom-1 -right-1 p-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
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
                  <p className="text-xs text-indigo-600 font-medium truncate">{emp.role}</p>
                </div>
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
                  <span className="text-slate-700 font-medium">{emp.departmentKh}</span>
                </div>
                <div className="text-slate-500 flex items-center justify-between">
                  <span>{lang === 'km' ? 'ទូរស័ព្ទ:' : 'Phone:'}</span>
                  <span className="font-mono text-slate-700 font-medium">{emp.phone}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center space-x-1.5">
                <button
                  onClick={() => handleOpenBadge(emp)}
                  className="flex-1 py-2 px-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center justify-center space-x-1 transition"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{lang === 'km' ? 'កាត QR' : 'QR Badge'}</span>
                </button>

                {onOpenTransferModal && (
                  <button
                    onClick={() => onOpenTransferModal(emp)}
                    title={lang === 'km' ? 'ផ្ទេរទៅសាខាផ្សេង' : 'Transfer to another branch'}
                    className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold transition flex items-center gap-1"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span className="text-[11px] hidden sm:inline">{lang === 'km' ? 'ផ្ទេរ' : 'Transfer'}</span>
                  </button>
                )}

                <button
                  onClick={() => handleOpenEdit(emp)}
                  title={lang === 'km' ? 'កែប្រែព័ត៌មាន' : 'Edit profile'}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>

                {onDeleteEmployee && (
                  <button
                    onClick={() => handleDelete(emp)}
                    title={lang === 'km' ? 'លុប' : 'Delete'}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

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

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">
                  {lang === 'km' ? 'សាខាដែលត្រូវបំពេញការងារ (Branch):' : 'Assigned Branch:'}
                </label>
                <select
                  value={editBranchId}
                  onChange={(e) => setEditBranchId(e.target.value)}
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
                    {lang === 'km' ? 'តួនាទី (Role):' : 'Role / Position:'}
                  </label>
                  <input
                    type="text"
                    value={editRoleKh}
                    onChange={(e) => setEditRoleKh(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">
                    {lang === 'km' ? 'លេខទូរស័ព្ទ (Phone):' : 'Phone Number:'}
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
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
                    {lang === 'km' ? 'តួនាទី (Role):' : 'Role / Position:'}
                  </label>
                  <input
                    type="text"
                    value={newEmpRoleKh}
                    onChange={(e) => setNewEmpRoleKh(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">
                    {lang === 'km' ? 'លេខទូរស័ព្ទ (Phone):' : 'Phone Number:'}
                  </label>
                  <input
                    type="text"
                    value={newEmpPhone}
                    onChange={(e) => setNewEmpPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
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
    </div>
  );
};
