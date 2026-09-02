import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  Tv, 
  RefreshCw, 
  ShieldCheck, 
  MapPin, 
  Clock, 
  Users, 
  Printer, 
  KeyRound, 
  CheckCircle2, 
  Building2, 
  Coffee, 
  Sparkles, 
  Warehouse,
  Flame
} from 'lucide-react';
import { Branch, Employee, AttendanceRecord, Language } from '../types';
import { generateBranchDynamicQrToken, toKhmerNumeral } from '../utils/geoUtils';

interface BranchKioskViewProps {
  branches: Branch[];
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  onAddAttendanceRecord: (record: AttendanceRecord) => void;
  lang: Language;
}

export const BranchKioskView: React.FC<BranchKioskViewProps> = ({
  branches,
  employees,
  attendanceRecords,
  onAddAttendanceRecord,
  lang,
}) => {
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branches[0]?.id || 'br_club_1');
  const [qrToken, setQrToken] = useState<{ payload: string; expiresInSeconds: number; timeWindow: number } | null>(null);
  const [qrCanvasUrl, setQrCanvasUrl] = useState<string>('');
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccessEmp, setPinSuccessEmp] = useState<Employee | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];
  const branchEmployees = employees.filter((e) => e.branchId === selectedBranch.id);

  // Calculate checked-in count for this branch today
  const today = new Date().toISOString().split('T')[0];
  const activeCheckIns = attendanceRecords.filter((r) => {
    return (
      r.branchId === selectedBranch.id &&
      r.timestamp.startsWith(today) &&
      r.type === 'check_in' &&
      r.isWithinGeofence
    );
  });

  // Dynamic Rolling QR generation every second / time-window sync
  useEffect(() => {
    let isMounted = true;

    const refreshQr = async () => {
      if (!selectedBranch) return;
      const token = generateBranchDynamicQrToken(selectedBranch.id);
      if (!isMounted) return;
      setQrToken(token);

      try {
        const url = await QRCode.toDataURL(token.payload, {
          width: 320,
          margin: 1,
          color: {
            dark: '#1e1b4b', // Deep indigo dark pixels
            light: '#ffffff',
          },
        });
        if (isMounted) {
          setQrCanvasUrl(url);
        }
      } catch (err) {
        console.error('QR generation error:', err);
      }
    };

    refreshQr();
    const interval = setInterval(refreshQr, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedBranchId, selectedBranch]);

  // Handle Manual PIN code punch
  const handlePinSubmit = () => {
    setPinError(null);
    const emp = employees.find(
      (e) => (e.pinCode && e.pinCode === enteredPin.trim()) || e.code.toLowerCase() === enteredPin.trim().toLowerCase()
    );

    if (!emp) {
      setPinError(
        lang === 'km'
          ? '❌ លេខកូដសម្ងាត់ PIN មិនត្រឹមត្រូវ! (សូមពិនិត្យលេខ ៤ ខ្ទង់)'
          : '❌ Invalid PIN or Employee Code. Please try again.'
      );
      return;
    }

    // Register Attendance Record
    const newRecord: AttendanceRecord = {
      id: `rec_kiosk_${Date.now()}`,
      employeeId: emp.id,
      employeeCode: emp.code,
      employeeNameKh: emp.nameKh,
      employeeNameEn: emp.nameEn,
      employeeAvatar: emp.avatar,
      branchId: selectedBranch.id,
      branchNameKh: selectedBranch.nameKh,
      branchNameEn: selectedBranch.nameEn,
      timestamp: new Date().toISOString(),
      type: 'check_in',
      method: 'kiosk_pin',
      lat: selectedBranch.lat,
      lng: selectedBranch.lng,
      distanceToBranch: 5,
      isWithinGeofence: true,
      status: 'on_time',
      notes: 'Touch PIN entered on branch entrance display kiosk',
    };

    onAddAttendanceRecord(newRecord);
    setPinSuccessEmp(emp);
    setTimeout(() => {
      setPinSuccessEmp(null);
      setShowPinModal(false);
      setEnteredPin('');
    }, 2000);
  };

  const getBranchIcon = (type: string) => {
    switch (type) {
      case 'club':
        return <Sparkles className="w-5 h-5 text-purple-600" />;
      case 'warehouse':
        return <Warehouse className="w-5 h-5 text-amber-600" />;
      case 'cafe':
        return <Coffee className="w-5 h-5 text-emerald-600" />;
      case 'office':
      default:
        return <Building2 className="w-5 h-5 text-indigo-600" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Branch Selector Bar & Kiosk Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>{lang === 'km' ? 'ផ្ទាំង Kiosk ប្រចាំមាត់ទ្វារសាខា' : 'Entrance Display Kiosk Mode'}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold">
                Tablet Stand
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {lang === 'km' ? 'ដាក់បញ្ចាំងលើ Tablet ឬអេក្រង់ទូរទស្សន៍នៅច្រកចូលសាខា' : 'Designed for venue entrance tablet displays with rolling 20s anti-fraud QR'}
            </p>
          </div>
        </div>

        {/* Branch Selector & Print Poster Button */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            id="kiosk-branch-select"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            aria-label={lang === 'km' ? 'ជ្រើសរើសសាខា' : 'Select branch'}
            className="bg-white text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none flex-1 sm:flex-none shadow-sm"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {lang === 'km' ? b.nameKh : b.nameEn}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'បោះពុម្ពផ្ទាំង QR' : 'Print Poster'}</span>
          </button>
        </div>
      </div>

      {/* Main Kiosk Screen Container */}
      <div className="relative bg-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-200 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          {/* LEFT: Branch Information & Venue Live Stats (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Venue Badge */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-xl bg-white/20 text-white backdrop-blur-sm">
                  {getBranchIcon(selectedBranch.type)}
                </span>
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-100">
                  {selectedBranch.type === 'club' ? (lang === 'km' ? '🍸 ក្លិបរាត្រី (Nightclub)' : '🍸 Nightclub Venue') :
                   selectedBranch.type === 'warehouse' ? (lang === 'km' ? '📦 ឃ្លាំងទំនិញ (Warehouse)' : '📦 Central Warehouse') :
                   selectedBranch.type === 'cafe' ? (lang === 'km' ? '☕ ហាងកាហ្វេ (Cafe Shop)' : '☕ Cafe Branch') :
                   (lang === 'km' ? '🏢 ការិយាល័យកណ្តាល (HQ Office)' : '🏢 Headquarters Office')}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                {lang === 'km' ? selectedBranch.nameKh : selectedBranch.nameEn}
              </h1>

              <p className="text-xs sm:text-sm text-indigo-100 flex items-start gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                <span>{lang === 'km' ? selectedBranch.addressKh : selectedBranch.addressEn}</span>
              </p>
            </div>

            {/* Geofence & Shift Cards */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/20">
                <div className="text-indigo-100 flex items-center gap-1 mb-1 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{lang === 'km' ? 'ដែនកំណត់ Geofence' : 'Geofence Radius'}</span>
                </div>
                <div className="text-lg font-bold text-white">
                  {selectedBranch.radiusMeters} {lang === 'km' ? 'ម៉ែត្រ' : 'Meters'}
                </div>
                <div className="text-[10px] text-indigo-200 mt-0.5">
                  {lang === 'km' ? 'កូអរដោនេផ្ទៀងផ្ទាត់ GPS' : 'GPS coordinates verified'}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/20">
                <div className="text-indigo-100 flex items-center gap-1 mb-1 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-indigo-200" />
                  <span>{lang === 'km' ? 'ម៉ោងប្រតិបត្តិការ' : 'Operating Hours'}</span>
                </div>
                <div className="text-lg font-bold text-white">
                  {selectedBranch.openTime} - {selectedBranch.closeTime}
                </div>
                <div className="text-[10px] text-indigo-200 mt-0.5">
                  {lang === 'km' ? 'វេនបំពេញការងារប្រចាំថ្ងៃ' : 'Daily active shifts'}
                </div>
              </div>
            </div>

            {/* Staff On-Site Metric */}
            <div className="bg-white/15 backdrop-blur-sm p-4 rounded-2xl border border-white/20 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-indigo-100 font-medium">
                    {lang === 'km' ? 'បុគ្គលិកកំពុងមានវត្តមានជាក់ស្តែង' : 'Staff Currently On-Site'}
                  </div>
                  <div className="text-lg font-bold text-white">
                    {activeCheckIns.length} / {branchEmployees.length} {lang === 'km' ? 'នាក់' : 'members'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowPinModal(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white text-indigo-700 text-xs font-bold hover:bg-indigo-50 shadow-md transition"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{lang === 'km' ? 'វាយលេខ PIN' : 'Enter PIN'}</span>
              </button>
            </div>
          </div>

          {/* RIGHT: Dynamic Rolling QR Display with Animated Countdown (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            <div className="relative bg-white p-6 rounded-3xl shadow-2xl border-4 border-white/40 text-center max-w-[420px] w-full text-slate-800">
              {/* Top Security Banner */}
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>{lang === 'km' ? 'QR ឌីណាមិកផ្លាស់ប្តូរស្វ័យប្រវត្តិ' : 'Rolling Anti-Fraud QR'}</span>
                </span>
                
                {/* Countdown Ring / Timer */}
                <span className="flex items-center space-x-1 font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>{qrToken?.expiresInSeconds || 20}s</span>
                </span>
              </div>

              {/* High-Resolution QR Canvas */}
              {qrCanvasUrl ? (
                <div className="p-2 bg-white rounded-2xl flex items-center justify-center">
                  <img
                    src={qrCanvasUrl}
                    alt="Branch Dynamic Attendance QR Code"
                    className="w-full max-w-[280px] h-auto object-contain rounded-xl"
                  />
                </div>
              ) : (
                <div className="w-64 h-64 bg-slate-50 rounded-2xl flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              )}

              {/* Bottom Instructions */}
              <div className="mt-3 pt-3 border-t border-slate-100 text-slate-700 space-y-1">
                <p className="text-xs font-bold text-indigo-700">
                  {lang === 'km' ? '👉 បើកទូរស័ព្ទដៃស្កេនដើម្បីចុះវត្តមាន' : '👉 Open phone camera & scan to check-in'}
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  {lang === 'km' ? 'ប្រព័ន្ធនឹងផ្ទៀងផ្ទាត់ GPS ក្នុងរង្វង់ ' + selectedBranch.radiusMeters + ' ម៉ែត្រ' : 'GPS geofencing will verify physical on-site presence'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manual PIN / Code Entry Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-base">
                  {lang === 'km' ? 'ចុះវត្តមានដោយប្រើលេខកូដសម្ងាត់ (PIN)' : 'Manual PIN Check-In'}
                </h3>
              </div>
              <button
                onClick={() => setShowPinModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {pinSuccessEmp ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2 text-emerald-800">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-slate-800">
                  {lang === 'km' ? `ស្វាគមន៍ ${pinSuccessEmp.nameKh}!` : `Welcome, ${pinSuccessEmp.nameEn}!`}
                </h4>
                <p className="text-xs text-emerald-700 font-medium">
                  {lang === 'km' ? 'ការចុះវត្តមានត្រូវបានកត់ត្រាជោគជ័យ' : 'Attendance record created successfully.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 font-medium">
                  {lang === 'km'
                    ? 'សម្រាប់បុគ្គលិកដែលភ្លេចទូរស័ព្ទដៃ សូមវាយលេខកូដ PIN ៤ ខ្ទង់ ឬអត្តលេខបុគ្គលិក (ឧទាហរណ៍: 1001, 2001, HQ-001)'
                    : 'Enter 4-digit PIN code or Employee Code (e.g. 1001, 2001, HQ-001):'}
                </p>

                <input
                  type="text"
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  placeholder="e.g. 1001"
                  className="w-full text-center text-xl font-mono tracking-widest bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  autoFocus
                />

                {pinError && (
                  <p className="text-xs text-rose-600 font-semibold text-center">{pinError}</p>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowPinModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                  >
                    {lang === 'km' ? 'បោះបង់' : 'Cancel'}
                  </button>
                  <button
                    onClick={handlePinSubmit}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition"
                  >
                    {lang === 'km' ? 'បញ្ជាក់វត្តមាន' : 'Verify & Check-In'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Printable Poster Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-3xl max-w-lg w-full p-8 space-y-6 shadow-2xl border border-slate-200 my-8">
            <div className="text-center space-y-2 border-b border-slate-200 pb-4">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>OFFICIAL QR ATTENDANCE STATION</span>
              </div>
              <h2 className="text-2xl font-black text-slate-950">
                {selectedBranch.nameKh}
              </h2>
              <p className="text-sm font-semibold text-indigo-600">{selectedBranch.nameEn}</p>
              <p className="text-xs text-slate-500 font-medium">{selectedBranch.addressKh}</p>
            </div>

            <div className="flex justify-center p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              {qrCanvasUrl && (
                <img
                  src={qrCanvasUrl}
                  alt="Printable QR"
                  className="w-64 h-64 object-contain"
                />
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1">
              <p className="font-bold">⚠️ សេចក្តីណែនាំសុវត្ថិភាពវត្តមាន (Anti-Fraud Policy):</p>
              <p>១. ប្រព័ន្ធភ្ជាប់ដោយផ្ទាល់ជាមួយទីតាំងភូមិសាស្ត្រ GPS ក្នុងរង្វង់ {selectedBranch.radiusMeters} ម៉ែត្រ។</p>
              <p>២. ការថតរូប QR ផ្ញើឱ្យអ្នកដទៃស្កេនជំនួស នឹងត្រូវបដិសេធដោយស្វ័យប្រវត្តិ។</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                {lang === 'km' ? 'បិទផ្ទាំង' : 'Close'}
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition"
              >
                🖨️ {lang === 'km' ? 'បោះពុម្ពឥឡូវនេះ (Print)' : 'Print Poster'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
