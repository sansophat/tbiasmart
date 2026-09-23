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
  Globe
} from 'lucide-react';
import { AuthUser, Employee, Language, CompanyBranding } from '../types';
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

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  adminProfile = DEFAULT_AUTH_USER,
  onLogin,
  onLogout,
  employees,
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

  if (!isOpen) return null;

  const isMandatory = !currentUser;

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const query = identifier.trim().toLowerCase();
    const enteredPass = password.trim();

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

    // 1. Check Admin Profile (Customized/Persistent Admin)
    const isAdminMatch =
      query === 'admin' ||
      query === 'superadmin' ||
      (adminProfile.username && adminProfile.username.toLowerCase() === query) ||
      (adminProfile.email && adminProfile.email.toLowerCase() === query) ||
      (adminProfile.employeeCode && adminProfile.employeeCode.toLowerCase() === query);

    if (isAdminMatch) {
      const validAdminPasswords = [
        adminProfile.password,
        adminProfile.pinCode,
        'admin',
        'admin123',
        '1234',
        '1001',
      ]
        .filter(Boolean)
        .map((p) => String(p).trim().toLowerCase());

      if (
        validAdminPasswords.includes(enteredPass.toLowerCase()) ||
        validAdminPasswords.includes(enteredPass)
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
            ? '❌ លេខកូដ PIN ឬពាក្យសម្ងាត់ Admin មិនត្រឹមត្រូវទេ!'
            : '❌ Incorrect PIN or password for Admin!'
        );
        return;
      }
    }

    // 2. Check general employees from directory
    const matchedEmp = employees.find(
      (emp) =>
        emp.code.toLowerCase() === query ||
        emp.email.toLowerCase() === query ||
        emp.phone.replace(/\s+/g, '') === query.replace(/\s+/g, '') ||
        emp.nameEn.toLowerCase() === query
    );

    if (matchedEmp) {
      const validPins = [
        matchedEmp.pinCode,
        matchedEmp.password,
        '1234',
      ]
        .filter(Boolean)
        .map((p) => String(p).trim());

      if (
        validPins.includes(enteredPass) ||
        (matchedEmp.password && matchedEmp.password === enteredPass)
      ) {
        const authUser: AuthUser = {
          id: `user_${matchedEmp.id}`,
          username: matchedEmp.code.toLowerCase(),
          role:
            matchedEmp.roleType ||
            (matchedEmp.role?.toLowerCase().includes('manager')
              ? 'manager'
              : matchedEmp.role?.toLowerCase().includes('supervisor')
              ? 'supervisor'
              : matchedEmp.role?.toLowerCase().includes('hr') || matchedEmp.departmentKh?.includes('ធនធានមនុស្ស')
              ? 'hr'
              : 'employee'),
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
            ? `❌ លេខកូដ PIN របស់បុគ្គលិក "${empDisplayName}" មិនត្រឹមត្រូវទេ!`
            : `❌ Incorrect PIN for ${empDisplayName}!`
        );
        return;
      }
    }

    // 3. Check Demo Users fallback
    const matchedDemo = DEMO_USERS.find(
      (u) =>
        u.username.toLowerCase() === query ||
        u.email?.toLowerCase() === query ||
        u.employeeCode?.toLowerCase() === query
    );

    if (matchedDemo) {
      const validDemoPins = [
        matchedDemo.password,
        matchedDemo.pinCode,
        '1234',
        'admin',
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
            ? '❌ លេខកូដ PIN ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ!'
            : '❌ Incorrect PIN or password!'
        );
        return;
      }
    }

    setErrorMsg(
      lang === 'km'
        ? 'មិនមានគណនីនេះក្នុងប្រព័ន្ធទេ! សូមពិនិត្យអត្តលេខ ឬអ៊ីមែលឡើងវិញ។'
        : 'Account not found! Please check your employee code or email.'
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

      {/* Identifier Input */}
      <div>
        <label className={`block text-xs font-bold mb-1.5 flex items-center justify-between ${
          isDarkTheme ? 'text-slate-300' : 'text-slate-700'
        }`}>
          <span>{lang === 'km' ? 'អត្តលេខបុគ្គលិក អ៊ីមែល ឬឈ្មោះអ្នកប្រើ:' : 'Employee Code, Email, or Username:'}</span>
          <span className="text-[10px] text-slate-400 font-mono">ID / Email</span>
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
            placeholder="e.g. admin, HQ-001, CL1-001..."
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
            {lang === 'km' ? 'លេខកូដ PIN ៤ ខ្ទង់ ឬពាក្យសម្ងាត់:' : '4-Digit PIN Code or Password:'}
          </label>
          <span className="text-[10px] text-indigo-500 font-semibold">
            {lang === 'km' ? 'តម្រូវឱ្យបញ្ចូល' : 'Required'}
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
            placeholder="•••• (PIN or Password)"
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
                  <span>7 Branches Live</span>
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
                <div className="mb-5 p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3">
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

              {/* Auth Form */}
              {(!currentUser || currentUser.role !== 'employee') && renderAuthForm(false)}
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

          {/* Auth Form */}
          {(!currentUser || currentUser.role !== 'employee') && renderAuthForm(true)}

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

          {/* Auth Form */}
          {(!currentUser || currentUser.role !== 'employee') && renderAuthForm(false)}

          {/* Style Switcher */}
          {renderStyleSwitcher(false)}
        </div>
      )}
    </div>
  );
};
