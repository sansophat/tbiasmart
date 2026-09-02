import React, { useState } from 'react';
import { 
  User, 
  Camera, 
  Upload, 
  KeyRound, 
  Phone, 
  Mail, 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Image as ImageIcon,
  Lock,
  RefreshCw,
  Eye,
  EyeOff,
  Briefcase,
  BadgeAlert,
  MapPin,
  IdCard
} from 'lucide-react';
import { AuthUser, Employee, Branch, Language } from '../types';

interface ProfileSettingsViewProps {
  currentUser: AuthUser;
  employees: Employee[];
  branches: Branch[];
  onUpdateUserProfile: (updatedUser: AuthUser, updatedEmp?: Employee) => void;
  lang: Language;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
];

export const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({
  currentUser,
  employees,
  branches,
  onUpdateUserProfile,
  lang,
}) => {
  const isEmployee = currentUser.role === 'employee';

  const currentEmp = employees.find(
    (e) => e.id === currentUser.employeeId || e.code === currentUser.employeeCode
  );

  const assignedBranch = branches.find(
    (b) => b.id === (currentUser.branchId || currentEmp?.branchId)
  );

  // Form states
  const [avatar, setAvatar] = useState<string>(currentUser.avatar || AVATAR_PRESETS[0]);
  const [nameKh, setNameKh] = useState<string>(currentUser.nameKh || currentEmp?.nameKh || '');
  const [nameEn, setNameEn] = useState<string>(currentUser.nameEn || currentEmp?.nameEn || '');
  const [phone, setPhone] = useState<string>(currentEmp?.phone || '012 345 678');
  const [email, setEmail] = useState<string>(currentUser.email || currentEmp?.email || 'staff@company.com');
  const [pinCode, setPinCode] = useState<string>(currentEmp?.pinCode || '1234');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Feedback notifications
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        setErrorMsg(lang === 'km' ? 'ទំហំរូបភាពមិនត្រូវលើសពី 3MB ឡើយ' : 'Image size must be under 3MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
        setErrorMsg('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim() || !nameKh.trim()) {
      setErrorMsg(lang === 'km' ? 'សូមបំពេញឈ្មោះជាភាសាខ្មែរ និងអង់គ្លេស' : 'Please fill in both Khmer and English names');
      return;
    }
    if (pinCode.length !== 4 || isNaN(Number(pinCode))) {
      setErrorMsg(lang === 'km' ? 'លេខសម្ងាត់ PIN ត្រូវតែមាន ៤ ខ្ទង់' : 'PIN code must be a 4-digit number');
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg(lang === 'km' ? 'លេខសម្ងាត់ទាំងពីរមិនត្រូវគ្នាទេ' : 'Passwords do not match');
      return;
    }

    const updatedUser: AuthUser = {
      ...currentUser,
      avatar,
      nameKh: isEmployee ? currentUser.nameKh : nameKh.trim(),
      nameEn: isEmployee ? currentUser.nameEn : nameEn.trim(),
      email: isEmployee ? currentUser.email : email.trim(),
      pinCode: pinCode.trim(),
      password: newPassword ? newPassword : currentUser.password,
    };

    const updatedEmp: Employee | undefined = currentEmp
      ? {
          ...currentEmp,
          avatar,
          nameKh: isEmployee ? currentEmp.nameKh : nameKh.trim(),
          nameEn: isEmployee ? currentEmp.nameEn : nameEn.trim(),
          phone: isEmployee ? currentEmp.phone : phone.trim(),
          email: isEmployee ? currentEmp.email : email.trim(),
          pinCode: pinCode.trim(),
          password: newPassword ? newPassword : currentEmp.password,
        }
      : undefined;

    onUpdateUserProfile(updatedUser, updatedEmp);

    setSuccessMsg(
      lang === 'km'
        ? isEmployee 
          ? 'រូបភាព Profile និងលេខសម្ងាត់ PIN ៤ ខ្ទង់ ត្រូវបានរក្សាទុកដោយជោគជ័យ!' 
          : 'ព័ត៌មានគណនី និងរូបភាព Profile ត្រូវបានរក្សាទុកដោយជោគជ័យ!'
        : isEmployee
          ? 'Profile picture & 4-digit PIN updated successfully!'
          : 'Profile details & avatar updated successfully!'
    );
    setErrorMsg('');
    setNewPassword('');
    setConfirmPassword('');

    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Policy Notice for Employee Mode */}
      {isEmployee && (
        <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-indigo-900 flex items-start space-x-3 shadow-sm">
          <ShieldCheck className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
          <div className="text-xs">
            <p className="font-bold">
              {lang === 'km' ? '🛡️ គោលការណ៍សុវត្ថិភាពបុគ្គលិក (Employee Permission Policy)' : '🛡️ Employee Self-Service Policy'}
            </p>
            <p className="text-slate-600 mt-0.5 leading-relaxed">
              {lang === 'km'
                ? 'អ្នកត្រូវបានអនុញ្ញាតឱ្យកែប្រែតែ រូបភាពតំណាង Profile Picture និងលេខសម្ងាត់ ៤ ខ្ទង់ (4-Digit PIN) ប៉ុណ្ណោះ។ ឈ្មោះ ទីតាំងសាខា ផ្នែក និងអត្តលេខ ត្រូវបានកំណត់ និងការពារដោយរដ្ឋបាល (Admin)។'
                : 'You are permitted to update only your Profile Avatar and 4-Digit Kiosk PIN. Personal names, assigned branch location, department, and employee ID are strictly locked and managed by Admin.'}
            </p>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="relative group">
            <img
              src={avatar}
              alt={nameEn}
              className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-indigo-500 shadow-md"
            />
            <label 
              title={lang === 'km' ? 'ផ្លាស់ប្តូររូបថត' : 'Change Photo'}
              className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer transition"
            >
              <Camera className="w-3.5 h-3.5" />
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-800">
                {lang === 'km' ? (currentEmp?.nameKh || nameKh) : (currentEmp?.nameEn || nameEn)}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                currentUser.role === 'admin'
                  ? 'bg-amber-100 text-amber-800'
                  : currentUser.role === 'manager'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {currentUser.role}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {currentUser.roleTitle || currentEmp?.role || 'Staff Employee'} • <span className="font-mono font-bold text-indigo-700">{currentUser.employeeCode || currentEmp?.code || 'EMP-001'}</span>
            </p>
          </div>
        </div>

        {/* Assigned Branch Scope Pill */}
        {assignedBranch && (
          <div className="bg-indigo-50/80 border border-indigo-200 px-4 py-2.5 rounded-2xl">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block flex items-center gap-1">
              <MapPin className="w-3 h-3 text-indigo-600" />
              {lang === 'km' ? 'សាខាដែលបានកំណត់ (Assigned Location)' : 'Assigned Branch'}
            </span>
            <span className="font-bold text-slate-800 text-xs mt-0.5 block">
              {lang === 'km' ? assignedBranch.nameKh : assignedBranch.nameEn}
            </span>
          </div>
        )}
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold flex items-center space-x-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold flex items-center space-x-2 shadow-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Profile & Credentials Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* 1. Avatar Selection Section (Editable for all users) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <span>{lang === 'km' ? '១. រូបភាពតំណាង Profile Picture (អាចកែប្រែបាន)' : '1. Profile Photo (Editable)'}</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {lang === 'km' ? 'ជ្រើសរើសរូប Preset ឬបញ្ចូលរូបថតផ្ទាល់ខ្លួនរបស់អ្នក' : 'Select from preset library or upload your real photo'}
              </p>
            </div>
            
            <label className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 cursor-pointer transition">
              <Upload className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'បញ្ចូលរូប (Upload File)' : 'Upload New Photo'}</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Avatar Presets Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 pt-2">
            {AVATAR_PRESETS.map((presetUrl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setAvatar(presetUrl)}
                className={`relative rounded-2xl overflow-hidden aspect-square border-2 transition-all group ${
                  avatar === presetUrl
                    ? 'border-indigo-600 ring-2 ring-indigo-400 scale-105 shadow-md'
                    : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                <img src={presetUrl} alt="Preset Avatar" className="w-full h-full object-cover" />
                {avatar === presetUrl && (
                  <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Security & Access PIN Card (Editable for Employee & Admin) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              <span>{lang === 'km' ? '២. លេខសម្ងាត់ Kiosk PIN & Password (អាចកែប្រែបាន)' : '2. Security & Kiosk PIN (Editable)'}</span>
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              {lang === 'km' ? 'អនុញ្ញាតឱ្យបុគ្គលិកផ្លាស់ប្តូរ' : 'Employee Allowed'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'km' ? 'លេខសម្ងាត់ ៤ ខ្ទង់ (4-Digit PIN):' : '4-Digit Kiosk PIN:'}
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={4}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {lang === 'km' ? 'ប្រើសម្រាប់ស្កេន Touch PIN នៅលើ Kiosk ឬ Scan' : 'Used for touch PIN punch-in on Kiosks'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'km' ? 'លេខសម្ងាត់ថ្មី (New Password):' : 'New Password:'}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'km' ? 'បញ្ជាក់លេខសម្ងាត់ (Confirm):' : 'Confirm Password:'}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 3. General Information Card (READ-ONLY FOR EMPLOYEE, Editable for Admin) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              <span>{lang === 'km' ? '៣. ព័ត៌មានផ្ទាល់ខ្លួន & សាខា (កំណត់ដោយ Admin)' : '3. Official Info & Branch (Set by Admin)'}</span>
            </h3>
            {isEmployee && (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-500" />
                {lang === 'km' ? 'ចាក់សោ (កំណត់ដោយ Admin)' : 'Locked • Managed by Admin'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Khmer Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>{lang === 'km' ? 'ឈ្មោះជាភាសាខ្មែរ (Khmer Name):' : 'Full Name in Khmer:'}</span>
                {isEmployee && <span className="text-[10px] text-slate-400">🔒 Read-only</span>}
              </label>
              <input
                type="text"
                value={nameKh}
                disabled={isEmployee}
                onChange={(e) => setNameKh(e.target.value)}
                required
                className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none ${
                  isEmployee 
                    ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' 
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-2 focus:ring-indigo-500'
                }`}
              />
            </div>

            {/* English Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>{lang === 'km' ? 'ឈ្មោះជាភាសាអង់គ្លេស (English Name):' : 'Full Name in English:'}</span>
                {isEmployee && <span className="text-[10px] text-slate-400">🔒 Read-only</span>}
              </label>
              <input
                type="text"
                value={nameEn}
                disabled={isEmployee}
                onChange={(e) => setNameEn(e.target.value)}
                required
                className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none ${
                  isEmployee 
                    ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' 
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-2 focus:ring-indigo-500'
                }`}
              />
            </div>

            {/* Assigned Branch Location (Strictly locked for Employee) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>{lang === 'km' ? 'ទីតាំងសាខាដែលបានចាត់តាំង (Assigned Branch):' : 'Assigned Branch Location:'}</span>
                <span className="text-[10px] text-indigo-700 font-bold">🔒 Admin Transfer Only</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  disabled
                  value={assignedBranch ? (lang === 'km' ? assignedBranch.nameKh : assignedBranch.nameEn) : 'HQ Office'}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-600 font-bold cursor-not-allowed"
                />
              </div>
            </div>

            {/* Employee ID Code */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>{lang === 'km' ? 'អត្តលេខបុគ្គលិក (Employee Code):' : 'Employee ID Code:'}</span>
                <span className="text-[10px] text-slate-400">🔒 Read-only</span>
              </label>
              <div className="relative">
                <IdCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  disabled
                  value={currentUser.employeeCode || currentEmp?.code || 'EMP-001'}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-600 font-mono font-bold cursor-not-allowed"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>{lang === 'km' ? 'លេខទូរស័ព្ទ (Contact Phone):' : 'Phone Number:'}</span>
                {isEmployee && <span className="text-[10px] text-slate-400">🔒 Admin Managed</span>}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  disabled={isEmployee}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-medium focus:outline-none ${
                    isEmployee 
                      ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' 
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-2 focus:ring-indigo-500'
                  }`}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>{lang === 'km' ? 'អ៊ីមែល (Email Address):' : 'Email Address:'}</span>
                {isEmployee && <span className="text-[10px] text-slate-400">🔒 Admin Managed</span>}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  disabled={isEmployee}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-medium focus:outline-none ${
                    isEmployee 
                      ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' 
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-2 focus:ring-indigo-500'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center space-x-2 px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-200 transition active:scale-95 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {lang === 'km' 
                ? isEmployee ? 'រក្សាទុក រូបភាព & លេខសម្ងាត់ PIN' : 'រក្សាទុកការកែប្រែទាំងអស់'
                : isEmployee ? 'Save Photo & 4-Digit PIN' : 'Save Changes'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
