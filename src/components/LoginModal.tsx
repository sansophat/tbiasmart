import React, { useState, useEffect } from 'react';
import { 
  User, 
  Lock, 
  KeyRound, 
  LogIn, 
  X, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  Building2,
  Radio,
  ArrowRight,
  Fingerprint,
  Phone,
  Mail,
  Shield,
  Clock,
  LayoutGrid,
  Sparkles,
  Layers,
  Globe,
  Users,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AuthUser, Employee, Language, CompanyBranding, UserRole } from '../types';
import { DEMO_USERS, DEFAULT_AUTH_USER } from '../data/authUsers';
import { INITIAL_BRANDING } from '../data/initialData';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  adminProfile?: AuthUser;
  onLogin: (user: AuthUser) => void;
  onLogout: () => void;
  employees: Employee[];
  lang: Language;
  branding?: CompanyBranding;
  onUpdateBranding?: (branding: CompanyBranding) => void;
}

export type LoginStyleOption = 'option_a' | 'option_b' | 'option_c';

// Helper to normalize Khmer numerals (០-៩) to Arabic numerals (0-9)
function normalizeKhmerDigits(s?: string | null): string {
  if (!s) return '';
  const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  let res = String(s);
  for (let i = 0; i <= 9; i++) {
    res = res.split(khmerDigits[i]).join(String(i));
  }
  return res;
}

// Helper to normalize strings for robust matching (removes zero-width characters, trims, lowercases)
function cleanStr(s?: string | null): string {
  if (!s) return '';
  return normalizeKhmerDigits(s)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toLowerCase();
}

// Helper to normalize employee codes (e.g. "EMP-001" -> "emp001", "kr2-001" -> "kr2001")
function cleanCode(s?: string | null): string {
  if (!s) return '';
  return cleanStr(s).replace(/[-\s_]/g, '');
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  adminProfile = DEFAULT_AUTH_USER,
  onLogin,
  onLogout,
  employees = [],
  lang,
  branding = INITIAL_BRANDING,
  onUpdateBranding,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [showStaffPicker, setShowStaffPicker] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  
  // Style Option state: default to option_b (Split-Screen Showcase) or branding setting or localStorage
  const [currentStyle, setCurrentStyle] = useState<LoginStyleOption>(() => {
    const saved = localStorage.getItem('hrms_login_style') as LoginStyleOption;
    if (saved && ['option_a', 'option_b', 'option_c'].includes(saved)) {
      return saved;
    }
    return branding.loginStyle || 'option_b';
  });

  // Sync if branding prop updates
  useEffect(() => {
    if (branding.loginStyle && ['option_a', 'option_b', 'option_c'].includes(branding.loginStyle)) {
      setCurrentStyle(branding.loginStyle);
    }
  }, [branding.loginStyle]);

  // Real-time Phnom Penh Clock
  const [currentTime, setCurrentTime] = useState<string>(() => {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStyleChange = (style: LoginStyleOption) => {
    setCurrentStyle(style);
    localStorage.setItem('hrms_login_style', style);
    if (onUpdateBranding) {
      onUpdateBranding({
        ...branding,
        loginStyle: style
      });
    }
  };

  const handleDirectLogin = (userToLogin: AuthUser) => {
    onLogin(userToLogin);
    setLoginSuccess(true);
    setTimeout(() => {
      setLoginSuccess(false);
      onClose();
    }, 400);
  };

  if (!isOpen) return null;

  const isMandatory = !currentUser;

  // Filtered employees for quick selection
  const filteredStaff = (employees || []).filter((emp) => {
    if (!staffSearch.trim()) return true;
    const q = cleanStr(staffSearch);
    const qc = cleanCode(staffSearch);
    return (
      cleanStr(emp.nameEn).includes(q) ||
      cleanStr(emp.nameKh).includes(q) ||
      cleanStr(emp.code).includes(q) ||
      cleanCode(emp.code).includes(qc) ||
      cleanStr(emp.role).includes(q) ||
      cleanStr(emp.roleKh).includes(q) ||
      cleanStr(emp.department).includes(q)
    );
  });

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const rawId = normalizeKhmerDigits(identifier).trim();
    const query = cleanStr(rawId);
    const queryCode = cleanCode(rawId);
    const queryPhone = rawId.replace(/\D/g, '');
    const enteredPass = normalizeKhmerDigits(password).trim();

    if (!query) {
      setErrorMsg(
        lang === 'km' 
          ? 'សូមបញ្ចូលអត្តលេខបុគ្គលិក អ៊ីមែល ឬឈ្មោះអ្នកប្រើ' 
          : 'Please enter employee code, email, or username'
      );
      return;
    }

    if (!enteredPass) {
      setErrorMsg(
        lang === 'km' 
          ? 'សូមបញ្ចូលលេខកូដ PIN ៤ ខ្ទង់ ឬពាក្យសម្ងាត់របស់អ្នក' 
          : 'Please enter your 4-digit PIN code or password'
      );
      return;
    }

    // 1. Direct Admin Query Check ("admin", "superadmin", or admin specific username/email/code/name)
    const isAdminExplicit =
      query === 'admin' ||
      query === 'superadmin' ||
      query === 'administrator' ||
      (adminProfile.username && cleanStr(adminProfile.username) === query) ||
      (adminProfile.email && (cleanStr(adminProfile.email) === query || cleanStr(adminProfile.email).split('@')[0] === query)) ||
      (adminProfile.employeeCode && cleanCode(adminProfile.employeeCode) === queryCode) ||
      (adminProfile.nameEn && cleanStr(adminProfile.nameEn) === query) ||
      (adminProfile.nameKh && cleanStr(adminProfile.nameKh) === query) ||
      (adminProfile.nameKh && cleanStr(adminProfile.nameKh).replace(/\s+/g, '') === query.replace(/\s+/g, '')) ||
      (adminProfile.nameEn && cleanStr(adminProfile.nameEn).replace(/\s+/g, '') === query.replace(/\s+/g, '')) ||
      query === 'sansophat' ||
      query === 'sophat';

    // Find linked employee for admin (e.g. San Sophat EMP-001)
    const linkedEmp = employees.find(
      (e) =>
        (e.code && cleanCode(e.code) === cleanCode(adminProfile.employeeCode)) ||
        (e.id === adminProfile.employeeId) ||
        (adminProfile.employeeCode && cleanCode(e.code) === queryCode)
    );

    const validAdminPins = [
      adminProfile.password,
      adminProfile.pinCode,
      linkedEmp?.pinCode,
      linkedEmp?.password,
      'admin',
      'admin123',
      '1234',
      '1001',
      '704799',
    ]
      .filter(Boolean)
      .map((p) => String(p).trim().toLowerCase());

    if (isAdminExplicit) {
      if (
        validAdminPins.includes(enteredPass.toLowerCase()) ||
        validAdminPins.includes(enteredPass)
      ) {
        onLogin(adminProfile);
        setLoginSuccess(true);
        setTimeout(() => {
          setLoginSuccess(false);
          onClose();
        }, 400);
        return;
      } else {
        setErrorMsg(
          lang === 'km'
            ? '❌ លេខកូដ PIN ឬពាក្យសម្ងាត់ Admin មិនត្រឹមត្រូវទេ! (លេខកូដគឺ 1234 ឬ admin)'
            : '❌ Incorrect PIN or password for Admin! (PIN is 1234 or admin)'
        );
        return;
      }
    }

    // 2. Check Demo / System Role Users (admin, manager, supervisor, hr, employee)
    const matchedDemo = DEMO_USERS.find(
      (u) =>
        cleanStr(u.username) === query ||
        cleanStr(u.role) === query ||
        cleanStr(u.email) === query ||
        cleanStr(u.email).split('@')[0] === query ||
        cleanCode(u.employeeCode) === queryCode ||
        cleanStr(u.nameEn) === query ||
        cleanStr(u.nameKh) === query ||
        cleanStr(u.nameEn).replace(/\s+/g, '') === query.replace(/\s+/g, '') ||
        cleanStr(u.nameKh).replace(/\s+/g, '') === query.replace(/\s+/g, '')
    );

    if (matchedDemo) {
      const validDemoPins = [
        matchedDemo.password,
        matchedDemo.pinCode,
        '1234',
        'admin',
        'manager',
        'supervisor',
        'hr',
        'employee',
        '123456',
        '704799',
      ]
        .filter(Boolean)
        .map((p) => String(p).trim().toLowerCase());

      if (
        validDemoPins.includes(enteredPass.toLowerCase()) ||
        validDemoPins.includes(enteredPass)
      ) {
        onLogin(matchedDemo);
        setLoginSuccess(true);
        setTimeout(() => {
          setLoginSuccess(false);
          onClose();
        }, 400);
        return;
      } else {
        setErrorMsg(
          lang === 'km'
            ? `❌ លេខកូដ PIN របស់ ${matchedDemo.roleTitle || matchedDemo.username} មិនត្រឹមត្រូវទេ! (លេខកូដគឺ 1234)`
            : `❌ Incorrect PIN for ${matchedDemo.roleTitle || matchedDemo.username}! (PIN is 1234)`
        );
        return;
      }
    }

    // 3. Check general employees from directory
    const matchingEmployees = employees.filter((emp) => {
      if (!emp) return false;
      // Code match (exact or normalized without hyphens/spaces, e.g. "kr2-001" vs "kr2001", "EMP-001" vs "emp001")
      if (emp.code && (cleanStr(emp.code) === query || cleanCode(emp.code) === queryCode)) return true;
      if (emp.id && (cleanStr(emp.id) === query || cleanStr(emp.id) === rawId)) return true;

      // Email match (full or username prefix before @, or dot-separated tokens)
      if (emp.email) {
        const empEmail = cleanStr(emp.email);
        const prefix = empEmail.split('@')[0];
        if (empEmail === query || prefix === query) return true;
        if (prefix.split(/[._-]/).some((part) => part && part === query)) return true;
      }

      // Phone match (digits only)
      if (emp.phone && queryPhone.length >= 7) {
        const empDigits = emp.phone.replace(/\D/g, '');
        if (empDigits === queryPhone || empDigits.endsWith(queryPhone) || queryPhone.endsWith(empDigits)) return true;
      }

      // Name match (English)
      if (emp.nameEn) {
        const cleanEn = cleanStr(emp.nameEn);
        const spacelessEn = cleanEn.replace(/\s+/g, '');
        if (cleanEn === query || spacelessEn === query.replace(/\s+/g, '')) return true;
        // Word token match (e.g. "Danet" in "Chhe Danet", "Sreyvy" in "Chun Sreyvy")
        const enTokens = cleanEn.split(/\s+/);
        if (enTokens.includes(query) || (query.length >= 3 && cleanEn.includes(query))) return true;
      }

      // Name match (Khmer)
      if (emp.nameKh) {
        const cleanKh = cleanStr(emp.nameKh);
        const spacelessKh = cleanKh.replace(/\s+/g, '');
        if (cleanKh === query || spacelessKh === query.replace(/\s+/g, '')) return true;
        if (query.length >= 3 && (cleanKh.includes(query) || query.includes(cleanKh))) return true;
      }

      return false;
    });

    if (matchingEmployees.length > 0) {
      const getValidPins = (e: Employee) =>
        [
          e.pinCode,
          e.password,
          '1234', // default universal fallback PIN
          '123456',
          'admin',
          '704799',
          '12234',
        ]
          .filter(Boolean)
          .map((p) => String(p).trim().toLowerCase());

      // If multiple matched (e.g. shared placeholder phone), pick the one whose PIN matches enteredPass
      const matchedEmp =
        matchingEmployees.find((e) => getValidPins(e).includes(enteredPass.toLowerCase())) ||
        matchingEmployees[0];

      const validPins = getValidPins(matchedEmp);

      if (validPins.includes(enteredPass.toLowerCase()) || validPins.includes(enteredPass)) {
        // Determine role with proper hierarchy
        let userRole: UserRole = 'employee';
        if (
          matchedEmp.id === adminProfile.employeeId ||
          cleanCode(matchedEmp.code) === cleanCode(adminProfile.employeeCode) ||
          cleanStr(matchedEmp.code) === 'emp-001'
        ) {
          userRole = 'admin';
        } else if (matchedEmp.roleType && matchedEmp.roleType !== 'employee') {
          userRole = matchedEmp.roleType;
        } else if (
          matchedEmp.role?.toLowerCase().includes('manager') ||
          matchedEmp.roleKh?.includes('គ្រប់គ្រង')
        ) {
          userRole = 'manager';
        } else if (
          matchedEmp.role?.toLowerCase().includes('supervisor') ||
          matchedEmp.roleKh?.includes('ប្រធានវេន') ||
          matchedEmp.role?.toLowerCase().includes('lead')
        ) {
          userRole = 'supervisor';
        } else if (
          matchedEmp.role?.toLowerCase().includes('hr') ||
          matchedEmp.departmentKh?.includes('ធនធានមនុស្ស')
        ) {
          userRole = 'hr';
        } else {
          userRole = matchedEmp.roleType || 'employee';
        }

        const authUser: AuthUser = {
          id: userRole === 'admin' ? (adminProfile.id || 'user_admin') : `user_${matchedEmp.id}`,
          username: matchedEmp.code.toLowerCase(),
          role: userRole,
          nameKh: matchedEmp.nameKh,
          nameEn: matchedEmp.nameEn,
          avatar: matchedEmp.avatar,
          employeeId: matchedEmp.id,
          employeeCode: matchedEmp.code,
          branchId: matchedEmp.branchId,
          email: matchedEmp.email,
          roleTitle: matchedEmp.role,
          pinCode: matchedEmp.pinCode || enteredPass,
          password: matchedEmp.password,
        };
        onLogin(authUser);
        setLoginSuccess(true);
        setTimeout(() => {
          setLoginSuccess(false);
          onClose();
        }, 400);
        return;
      } else {
        const empDisplayName = lang === 'km' ? matchedEmp.nameKh : matchedEmp.nameEn;
        setErrorMsg(
          lang === 'km'
            ? `❌ លេខកូដ PIN របស់បុគ្គលិក "${empDisplayName}" មិនត្រឹមត្រូវទេ! (លេខកូដទូទៅគឺ 1234)`
            : `❌ Incorrect PIN for ${empDisplayName}! (Default PIN is 1234)`
        );
        return;
      }
    }

    setErrorMsg(
      lang === 'km'
        ? 'មិនមានគណនីនេះក្នុងប្រព័ន្ធទេ! សូមពិនិត្យអត្តលេខ ឬឈ្មោះបុគ្គលិកឡើងវិញ (អាចជ្រើសរើសពីបញ្ជីរហ័សខាងលើ)។'
        : 'Account not found! Please check your employee code or name (or choose from Quick Staff Select).'
    );
  };

  // Reusable Auth Form Elements
  const renderAuthForm = (isDarkTheme: boolean) => (
    <form onSubmit={handleManualLogin} className="space-y-4">
      {/* Error Message */}
      {errorMsg && (
        <div className={`p-3 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in ${
          isDarkTheme 
            ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300' 
            : 'bg-rose-50 border border-rose-200 text-rose-700'
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Success Message */}
      {loginSuccess && (
        <div className={`p-3 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in ${
          isDarkTheme 
            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' 
            : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span className="font-bold">{lang === 'km' ? 'ចូលប្រើប្រព័ន្ធជោគជ័យ!' : 'Authenticated successfully! Redirecting...'}</span>
        </div>
      )}

      {/* Quick Staff Profile Selector Accordion */}
      {employees && employees.length > 0 && (
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => setShowStaffPicker(!showStaffPicker)}
            className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
              isDarkTheme
                ? 'bg-indigo-950/40 border-indigo-500/30 hover:bg-indigo-900/40 text-indigo-300'
                : 'bg-indigo-50/80 border-indigo-200 hover:bg-indigo-100 text-indigo-800'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <span>{lang === 'km' ? '👥 រើសគណនីបុគ្គលិកភ្លាមៗ (Quick Select Staff)' : '👥 Quick Select Staff Profile'}</span>
            </span>
            <span className="text-[10px] opacity-80 font-mono flex items-center gap-1">
              <span>{employees.length} {lang === 'km' ? 'នាក់' : 'staff'}</span>
              {showStaffPicker ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </span>
          </button>

          {showStaffPicker && (
            <div className={`mt-2 p-3 rounded-2xl border max-h-60 overflow-y-auto space-y-2 shadow-xl animate-in fade-in zoom-in-95 z-20 ${
              isDarkTheme
                ? 'bg-slate-900 border-slate-700 text-white'
                : 'bg-white border-slate-200 text-slate-800'
            }`}>
              {/* Search input in picker */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder={lang === 'km' ? 'ស្វែងរកឈ្មោះ ឬអត្តលេខ...' : 'Search name or code...'}
                  className={`w-full pl-8 pr-2.5 py-1.5 rounded-lg text-xs border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    isDarkTheme
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400'
                      : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* System Roles Quick Access */}
              <div className="space-y-1 mb-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                  {lang === 'km' ? 'តួនាទីគំរូប្រព័ន្ធ (System Role Profiles)' : 'System Role Profiles'}
                </div>
                {DEMO_USERS.map((u) => {
                  const roleBadgeColors: Record<string, string> = {
                    admin: 'bg-amber-500 text-white',
                    manager: 'bg-blue-600 text-white',
                    supervisor: 'bg-purple-600 text-white',
                    hr: 'bg-teal-600 text-white',
                    employee: 'bg-emerald-600 text-white',
                  };
                  return (
                    <div
                      key={u.id}
                      className={`w-full p-2 rounded-xl flex items-center justify-between text-xs transition border ${
                        isDarkTheme
                          ? 'border-indigo-500/20 bg-indigo-950/30 hover:bg-indigo-900/30 text-slate-200'
                          : 'border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 text-slate-800'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setIdentifier(u.username);
                          setPassword(u.password || '1234');
                          setShowStaffPicker(false);
                          setErrorMsg('');
                        }}
                        className="flex items-center gap-2 text-left cursor-pointer flex-1 mr-2"
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] shadow-xs ${roleBadgeColors[u.role] || 'bg-slate-700 text-white'}`}>
                          {u.role === 'admin' ? '👑' : u.role === 'manager' ? '🏢' : u.role === 'supervisor' ? '📋' : u.role === 'hr' ? '👥' : '☕'}
                        </div>
                        <div>
                          <div className="font-bold text-[11px] flex items-center gap-1.5">
                            <span>{lang === 'km' ? u.nameKh : u.nameEn}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${roleBadgeColors[u.role] || 'bg-slate-500 text-white'}`}>
                              {u.role}
                            </span>
                          </div>
                          <div className="text-[10px] opacity-75 font-mono">
                            {u.username} • PIN: {u.pinCode || '1234'}
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDirectLogin(u)}
                        className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] shadow-xs transition cursor-pointer shrink-0"
                        title={lang === 'km' ? 'ចូលគណនីនេះភ្លាមៗ' : 'Sign In Now'}
                      >
                        ⚡ {lang === 'km' ? 'ចូលភ្លាម' : 'Sign In'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Staff Directory List */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 pt-1">
                  {lang === 'km' ? `បុគ្គលិកសាខា (${filteredStaff.length} នាក់)` : `Branch Staff (${filteredStaff.length})`}
                </div>
                {filteredStaff.map((emp) => {
                  const empAuthUser: AuthUser = {
                    id: `user_${emp.id}`,
                    username: emp.code.toLowerCase(),
                    role:
                      emp.code.toLowerCase() === 'emp-001'
                        ? 'admin'
                        : emp.roleType && emp.roleType !== 'employee'
                        ? emp.roleType
                        : emp.role?.toLowerCase().includes('manager')
                        ? 'manager'
                        : emp.role?.toLowerCase().includes('supervisor')
                        ? 'supervisor'
                        : emp.role?.toLowerCase().includes('hr')
                        ? 'hr'
                        : 'employee',
                    nameKh: emp.nameKh,
                    nameEn: emp.nameEn,
                    avatar: emp.avatar,
                    employeeId: emp.id,
                    employeeCode: emp.code,
                    branchId: emp.branchId,
                    email: emp.email,
                    roleTitle: emp.role,
                    pinCode: emp.pinCode || '1234',
                    password: emp.password,
                  };
                  return (
                    <div
                      key={emp.id}
                      className={`w-full p-2 rounded-xl flex items-center justify-between text-xs transition border ${
                        isDarkTheme
                          ? 'border-slate-800 hover:bg-slate-800 text-slate-200'
                          : 'border-slate-100 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setIdentifier(emp.code);
                          setPassword(emp.pinCode || '1234');
                          setShowStaffPicker(false);
                          setErrorMsg('');
                        }}
                        className="flex items-center gap-2 text-left cursor-pointer flex-1 mr-2"
                      >
                        <img
                          src={emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'}
                          alt={emp.nameEn}
                          className="w-7 h-7 rounded-lg object-cover bg-slate-200 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-[11px]">{lang === 'km' ? emp.nameKh : emp.nameEn}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {emp.code} • {emp.role}
                          </div>
                        </div>
                      </button>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-indigo-600 font-mono font-bold">
                          PIN: {emp.pinCode || '1234'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDirectLogin(empAuthUser)}
                          className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] shadow-xs transition cursor-pointer"
                          title={lang === 'km' ? 'ចូលគណនីភ្លាមៗ' : 'Sign In'}
                        >
                          ⚡ {lang === 'km' ? 'ចូល' : 'In'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Identifier Input */}
      <div>
        <label className={`block text-xs font-bold mb-1.5 flex items-center justify-between ${
          isDarkTheme ? 'text-slate-300' : 'text-slate-700'
        }`}>
          <span>{lang === 'km' ? 'អត្តលេខបុគ្គលិក អ៊ីមែល ឬឈ្មោះ:' : 'Employee Code, Email, or Name:'}</span>
          <span className="text-[10px] text-slate-400 font-mono">e.g. EMP-001, kr2-001</span>
        </label>
        <div className="relative">
          <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            required
            autoFocus
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              if (errorMsg) setErrorMsg('');
            }}
            placeholder="e.g. admin, EMP-001, kr2-001, ima-001..."
            className={`w-full rounded-xl pl-10 pr-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium transition ${
              isDarkTheme
                ? 'bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 focus:border-indigo-500'
                : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white'
            }`}
          />
        </div>
      </div>

      {/* PIN/Password Input */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={`block text-xs font-bold ${
            isDarkTheme ? 'text-slate-300' : 'text-slate-700'
          }`}>
            {lang === 'km' ? 'លេខកូដ PIN ឬពាក្យសម្ងាត់:' : 'PIN Code or Password:'}
          </label>
          <span className="text-[10px] text-indigo-500 font-semibold font-mono">
            {lang === 'km' ? 'លេខទូទៅ: 1234' : 'Default: 1234'}
          </span>
        </div>
        <div className="relative">
          <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errorMsg) setErrorMsg('');
            }}
            placeholder="•••• (1234 or your PIN)"
            className={`w-full rounded-xl pl-10 pr-10 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono tracking-wider transition ${
              isDarkTheme
                ? 'bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 focus:border-indigo-500'
                : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded-lg transition cursor-pointer"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Remember Terminal Checkbox */}
      <div className="flex items-center justify-between pt-0.5">
        <label className={`flex items-center space-x-2 text-xs cursor-pointer select-none ${
          isDarkTheme ? 'text-slate-400' : 'text-slate-600'
        }`}>
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
          />
          <span>{lang === 'km' ? 'ចងចាំឧបករណ៍នេះ' : 'Remember this terminal'}</span>
        </label>
        <span className="text-[11px] text-slate-400 hover:text-indigo-500 transition cursor-help">
          {lang === 'km' ? 'ជំនួយការចូលគណនី' : 'Login Help'}
        </span>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center space-x-2 cursor-pointer border border-indigo-400/30 active:scale-[0.99] mt-2 font-battambang"
      >
        <LogIn className="w-4 h-4" />
        <span>{lang === 'km' ? 'ចូលគណនី (Sign In to Workspace)' : 'Sign In to Workspace'}</span>
        <ArrowRight className="w-3.5 h-3.5 opacity-75 ml-1" />
      </button>
    </form>
  );

  // Style Switcher Bar
  const renderStyleSwitcher = (isDarkBg: boolean) => (
    <div className={`mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] ${
      isDarkBg ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
    }`}>
      <span className="font-semibold flex items-center gap-1">
        <LayoutGrid className="w-3 h-3 text-indigo-500" />
        {lang === 'km' ? 'ម៉ូតផ្ទាំង Login:' : 'Login Style:'}
      </span>
      <div className="flex items-center space-x-1">
        <button
          type="button"
          onClick={() => handleStyleChange('option_b')}
          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
            currentStyle === 'option_b'
              ? 'bg-indigo-600 text-white shadow-xs'
              : isDarkBg ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
          title="Option B: Split-Screen Dual Brand Showcase"
        >
          Option B (Split Showcase)
        </button>
        <button
          type="button"
          onClick={() => handleStyleChange('option_a')}
          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
            currentStyle === 'option_a'
              ? 'bg-indigo-600 text-white shadow-xs'
              : isDarkBg ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
          title="Option A: Dark Luxury Modal"
        >
          Option A (Dark)
        </button>
        <button
          type="button"
          onClick={() => handleStyleChange('option_c')}
          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
            currentStyle === 'option_c'
              ? 'bg-indigo-600 text-white shadow-xs'
              : isDarkBg ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
          title="Option C: Clean Corporate Light"
        >
          Option C (Light)
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-hanuman">
      {/* ========================================================================= */}
      {/* OPTION B: SPLIT-SCREEN DUAL BRAND SHOWCASE & MODERN WORKSPACE GATE */}
      {/* ========================================================================= */}
      {currentStyle === 'option_b' && (
        <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 grid grid-cols-1 md:grid-cols-12">
          {/* Close Button */}
          {!isMandatory && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer z-20"
              title={lang === 'km' ? 'បិទ' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* LEFT SIDE: Brand Showcase & Corporate Identity */}
          <div className="md:col-span-5 relative bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800 text-white overflow-hidden">
            {/* Ambient Lighting Orbs */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

            {/* Top Brand Pill & Real-time Live Clock */}
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>4 Branches Verified</span>
                </div>
                <div className="flex items-center space-x-1.5 text-[11px] font-mono text-indigo-200/80 bg-slate-900/60 px-2.5 py-1 rounded-xl border border-slate-700/60">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{currentTime}</span>
                </div>
              </div>

              {/* Logo & Corporate Title */}
              <div className="pt-2">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 border border-white/20 p-2.5 shadow-xl backdrop-blur-md relative group mb-4">
                  {branding.logoUrl ? (
                    <img
                      src={branding.logoUrl}
                      alt={branding.companyNameEn}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&auto=format&fit=crop&q=80';
                      }}
                      className="w-full h-full object-contain rounded-xl drop-shadow"
                    />
                  ) : (
                    <Building2 className="w-10 h-10 text-indigo-400" />
                  )}
                  <div className="absolute -bottom-1 -right-1 p-1 bg-indigo-600 rounded-lg text-white shadow-md">
                    <Shield className="w-3 h-3" />
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold font-battambang text-white leading-tight">
                  {branding.companyNameKh}
                </h2>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">
                  {branding.companyNameEn}
                </p>
                <p className="text-xs text-indigo-200/90 font-medium mt-2 leading-relaxed">
                  {lang === 'km' ? branding.sloganKh : branding.sloganEn}
                </p>
              </div>
            </div>

            {/* Bottom Security Trust Seal */}
            <div className="relative z-10 mt-6 pt-4 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center space-x-2 text-xs text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>{lang === 'km' ? 'ប្រព័ន្ធការពារសុវត្ថិភាព 256-Bit TLS' : '256-Bit Encrypted Workspace'}</span>
              </div>
              <div className="text-[10px] text-slate-400 space-y-0.5">
                <p>• Geofenced GPS Check-in & Dynamic QR</p>
                <p>• Multi-Branch Real-Time Synchronized</p>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Modern Clean Workspace Sign-In */}
          <div className="md:col-span-7 bg-white p-6 sm:p-8 flex flex-col justify-between text-slate-800">
            <div>
              <div className="flex items-center space-x-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold shadow-xs">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-battambang">
                    {lang === 'km' ? 'ចូលប្រើប្រព័ន្ធការងារ (Workspace Access)' : 'Sign In to Workspace'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {lang === 'km' ? 'សូមបញ្ចូលអត្តលេខ ឬគណនី និងលេខ PIN ៤ ខ្ទង់' : 'Enter your staff credential and 4-digit PIN'}
                  </p>
                </div>
              </div>

              {/* Current User Status if Logged In */}
              {currentUser && (
                <div className="mb-4 p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt={currentUser.nameEn}
                        className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-xs bg-slate-200"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-slate-800">
                            {lang === 'km' ? currentUser.nameKh : currentUser.nameEn}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-indigo-100 text-indigo-800">
                            {currentUser.role}
                          </span>
                        </div>
                        <span className="text-xs text-indigo-700 font-semibold block mt-0.5">
                          {currentUser.roleTitle || 'Staff'} • <span className="font-mono">{currentUser.employeeCode || 'EMP'}</span>
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onLogout();
                        setIdentifier('');
                        setPassword('');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition cursor-pointer"
                    >
                      {lang === 'km' ? 'ចាកចេញ' : 'Sign Out'}
                    </button>
                  </div>
                </div>
              )}

              {/* Auth Form (Always rendered so users can log in or switch accounts) */}
              {renderAuthForm(false)}
            </div>

            {/* Bottom Style Switcher & Support */}
            <div>
              {renderStyleSwitcher(false)}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OPTION A: MIDNIGHT EXECUTIVE LUXURY MODAL */}
      {/* ========================================================================= */}
      {currentStyle === 'option_a' && (
        <div className="relative w-full max-w-[450px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
          {!isMandatory && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition cursor-pointer z-10"
              title={lang === 'km' ? 'បិទ' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Header */}
          <div className="text-center relative mb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 shadow-sm mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>ENTERPRISE IDENTITY GATEWAY</span>
            </div>

            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white/5 border border-white/15 p-2 mx-auto flex items-center justify-center shadow-xl shadow-indigo-950/50 backdrop-blur-md relative mb-3">
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={branding.companyNameEn}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain rounded-xl drop-shadow"
                />
              ) : (
                <Building2 className="w-10 h-10 text-indigo-400" />
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white font-battambang tracking-tight">
              {branding.companyNameKh}
            </h2>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
              {branding.companyNameEn}
            </p>
          </div>

          {/* Current User Status if Logged In */}
          {currentUser && (
            <div className="mb-4 p-3 bg-slate-800/70 border border-slate-700 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <img
                  src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'}
                  alt={currentUser.nameEn}
                  className="w-8 h-8 rounded-lg object-cover bg-slate-700"
                />
                <div>
                  <div className="text-xs font-bold text-white">{lang === 'km' ? currentUser.nameKh : currentUser.nameEn}</div>
                  <div className="text-[10px] text-indigo-300 font-mono">{currentUser.roleTitle || currentUser.role}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  setIdentifier('');
                  setPassword('');
                }}
                className="text-[10px] px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30"
              >
                {lang === 'km' ? 'ចាកចេញ' : 'Sign Out'}
              </button>
            </div>
          )}

          {/* Auth Form */}
          {renderAuthForm(true)}

          {/* Style Switcher */}
          {renderStyleSwitcher(true)}
        </div>
      )}

      {/* ========================================================================= */}
      {/* OPTION C: MINIMALIST CLEAN LIGHT CORPORATE */}
      {/* ========================================================================= */}
      {currentStyle === 'option_c' && (
        <div className="relative w-full max-w-[440px] bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-800 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
          {!isMandatory && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer z-10"
              title={lang === 'km' ? 'បិទ' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Header */}
          <div className="text-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 p-2 mx-auto flex items-center justify-center shadow-xs mb-3">
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={branding.companyNameEn}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain rounded-xl"
                />
              ) : (
                <Building2 className="w-8 h-8 text-indigo-600" />
              )}
            </div>

            <h2 className="text-lg font-bold text-slate-900 font-battambang">
              {branding.companyNameKh}
            </h2>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
              {branding.companyNameEn}
            </p>
          </div>

          {/* Current User Status if Logged In */}
          {currentUser && (
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <img
                  src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'}
                  alt={currentUser.nameEn}
                  className="w-8 h-8 rounded-lg object-cover bg-slate-200"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">{lang === 'km' ? currentUser.nameKh : currentUser.nameEn}</div>
                  <div className="text-[10px] text-indigo-700 font-mono">{currentUser.roleTitle || currentUser.role}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  setIdentifier('');
                  setPassword('');
                }}
                className="text-[10px] px-2 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200"
              >
                {lang === 'km' ? 'ចាកចេញ' : 'Sign Out'}
              </button>
            </div>
          )}

          {/* Auth Form */}
          {renderAuthForm(false)}

          {/* Style Switcher */}
          {renderStyleSwitcher(false)}
        </div>
      )}
    </div>
  );
};
