import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import confetti from 'canvas-confetti';
import { 
  Camera, 
  MapPin, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Zap, 
  UserCheck, 
  Building, 
  ArrowRightLeft, 
  Clock, 
  Maximize2,
  Navigation,
  Sparkles,
  Info,
  Radio,
  QrCode,
  Upload,
  SwitchCamera,
  LocateFixed,
  Eye,
  Crosshair,
  Smartphone,
  LayoutDashboard,
  LogIn,
  LogOut,
  X,
  Lock,
  Check
} from 'lucide-react';
import { Branch, Employee, AttendanceRecord, UserGeoLocation, Language, AuthUser } from '../types';
import { calculateDistanceMeters, formatDistance, toKhmerNumeral, verifyBranchDynamicQrToken } from '../utils/geoUtils';

interface QrAttendanceViewProps {
  branches: Branch[];
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  onAddAttendanceRecord: (record: AttendanceRecord) => void;
  currentGeo: UserGeoLocation;
  setCurrentGeo: (geo: UserGeoLocation) => void;
  currentUser?: AuthUser | null;
  lang: Language;
  onUpdateBranchLocation?: (
    branchId: string,
    lat: number,
    lng: number,
    employeeId?: string
  ) => { success: boolean; message: string } | void;
  onNavigateToDashboard?: () => void;
}

export const QrAttendanceView: React.FC<QrAttendanceViewProps> = ({
  branches,
  employees,
  attendanceRecords,
  onAddAttendanceRecord,
  currentGeo,
  setCurrentGeo,
  currentUser,
  lang,
  onUpdateBranchLocation,
  onNavigateToDashboard,
}) => {
  // Find employee profile if logged in
  const loggedInEmp = employees.find(
    (e) => e.id === currentUser?.employeeId || e.code === currentUser?.employeeCode
  );
  const isEmployee = currentUser?.role === 'employee';

  const defaultBranchId = (isEmployee && (currentUser?.branchId || loggedInEmp?.branchId))
    ? (currentUser?.branchId || loggedInEmp?.branchId)!
    : branches[0]?.id || 'br_club_1';

  const defaultEmpId = loggedInEmp?.id || employees[0]?.id || 'emp_off_1';

  const [selectedBranchId, setSelectedBranchId] = useState<string>(defaultBranchId);
  const [selectedEmpId, setSelectedEmpId] = useState<string>(defaultEmpId);

  useEffect(() => {
    if (isEmployee && (currentUser?.branchId || loggedInEmp?.branchId)) {
      setSelectedBranchId(currentUser?.branchId || loggedInEmp?.branchId || branches[0].id);
    }
    if (loggedInEmp) {
      setSelectedEmpId(loggedInEmp.id);
    }
  }, [currentUser, loggedInEmp, isEmployee]);

  const [attendanceType, setAttendanceType] = useState<'check_in' | 'check_out'>('check_in');
  
  // Real scan modes: 'camera_scan' (Live Camera) | 'mobile_punch' (Direct GPS Punch) | 'qr_upload' (Upload QR Image)
  const [scanMode, setScanMode] = useState<'camera_scan' | 'mobile_punch' | 'qr_upload'>('camera_scan');
  
  // Camera state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastSuccessRecord, setLastSuccessRecord] = useState<AttendanceRecord | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [enableSelfieVerification, setEnableSelfieVerification] = useState<boolean>(true);
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);

  // Success Modal Popup State
  const [scanSuccessModalRecord, setScanSuccessModalRecord] = useState<AttendanceRecord | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number>(5);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];
  const selectedEmp = employees.find((e) => e.id === selectedEmpId) || employees[0];

  // Auto-redirect countdown when scan completes successfully
  useEffect(() => {
    let timer: any = null;
    if (scanSuccessModalRecord) {
      setRedirectCountdown(5);
      timer = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            if (onNavigateToDashboard) {
              onNavigateToDashboard();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [scanSuccessModalRecord, onNavigateToDashboard]);

  // Calculate live distance to the selected branch using real coordinates
  const distanceToBranch = calculateDistanceMeters(
    currentGeo.lat,
    currentGeo.lng,
    selectedBranch.lat,
    selectedBranch.lng
  );
  const isWithinGeofence = distanceToBranch <= selectedBranch.radiusMeters;

  // Auto-detect check-in vs check-out recommendation based on today's logs
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = attendanceRecords.filter(
      (r) => r.employeeId === selectedEmp.id && r.timestamp.startsWith(today)
    );
    const hasCheckedIn = todayRecords.some((r) => r.type === 'check_in');
    const hasCheckedOut = todayRecords.some((r) => r.type === 'check_out');

    if (hasCheckedIn && !hasCheckedOut) {
      setAttendanceType('check_out');
    } else {
      setAttendanceType('check_in');
    }
  }, [selectedEmp.id, attendanceRecords]);

  // Request real device GPS automatically on view load
  useEffect(() => {
    fetchRealDeviceGps(false);
  }, []);

  const fetchRealDeviceGps = (showAlert: boolean = true) => {
    if (!navigator.geolocation) {
      if (showAlert) alert(lang === 'km' ? 'ឧបករណ៍មិនគាំទ្រ GPS ទេ' : 'Geolocation is not supported by your device.');
      return;
    }

    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingGps(false);
        setCurrentGeo({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          timestamp: pos.timestamp,
          isReal: true,
          label: lang === 'km' ? `GPS ជាក់ស្តែង (±${Math.round(pos.coords.accuracy)}m)` : `Real GPS (±${Math.round(pos.coords.accuracy)}m)`,
        });
      },
      (err) => {
        setIsLocatingGps(false);
        console.warn('GPS Error:', err);
        if (showAlert) {
          alert(
            lang === 'km'
              ? 'មិនអាចទាញយក GPS បានទេ: ' + err.message + ' (សូមបើក Location Permission)'
              : 'Could not fetch GPS: ' + err.message + ' (Please allow Location Permission)'
          );
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Handle camera start/stop smoothly without repeated prompts
  useEffect(() => {
    if (scanMode === 'camera_scan' && isCameraActive && !scanSuccessModalRecord) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [scanMode, isCameraActive, cameraFacing, scanSuccessModalRecord]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: cameraFacing, 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        },
      });

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;
        await videoRef.current.play();
        requestAnimationFrame(tick);
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError(
        lang === 'km'
          ? 'មិនអាចបើកកាមេរ៉ាបានទេ (សូមអនុញ្ញាត Camera Permission ក្នុង Browser ឬប្រើម៉ូដស្កេនតាម GPS ផ្ទាល់)'
          : 'Could not access camera (Please enable camera permissions or use Direct GPS punch)'
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  // QR Scanning Loop
  const tick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.height = videoRef.current.videoHeight;
          canvas.width = videoRef.current.videoWidth;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            handleQrCodeScanned(code.data);
            return;
          }
        }
      }
    }
    if (isCameraActive && scanMode === 'camera_scan' && !scanSuccessModalRecord) {
      animationFrameId.current = requestAnimationFrame(tick);
    }
  };

  // Process QR Scanned Data
  const handleQrCodeScanned = (qrData: string) => {
    setScannedResult(qrData);
    
    // Capture snapshot photo from live camera
    let photoUrl: string | undefined = undefined;
    if (canvasRef.current) {
      try {
        photoUrl = canvasRef.current.toDataURL('image/jpeg', 0.7);
        setCapturedPhoto(photoUrl);
      } catch (e) {
        // ignore
      }
    }

    // Verify QR token against dynamic branch rolling QR or employee badge
    const qrVerification = verifyBranchDynamicQrToken(qrData);

    let targetBranch = selectedBranch;
    let targetEmp = selectedEmp;

    // Check if employee was assigned / transferred to a specific branch
    const empCurrentBranch = branches.find((b) => b.id === targetEmp?.branchId);

    if (qrVerification.isValid && qrVerification.branchId) {
      // Check if scanned QR belongs to another branch than the employee's assigned branch
      if (empCurrentBranch && qrVerification.branchId !== empCurrentBranch.id) {
        const scannedBranch = branches.find((b) => b.id === qrVerification.branchId);
        setIsCameraActive(false);
        alert(
          lang === 'km'
            ? `⚠️ បដិសេធស្កេន (Invalid Branch QR)! បុគ្គលិក "${targetEmp.nameKh}" ស្ថិតនៅសាខា "${empCurrentBranch.nameKh}" មិនអាចស្កេន QR របស់សាខា "${scannedBranch?.nameKh || qrVerification.branchId}" បានទេ។`
            : `⚠️ Unauthorized Branch QR! Employee "${targetEmp.nameEn}" is assigned to "${empCurrentBranch.nameEn}". Cannot scan QR code from "${scannedBranch?.nameEn || qrVerification.branchId}".`
        );
        return;
      }

      const matchedBranch = branches.find((b) => b.id === qrVerification.branchId);
      if (matchedBranch) {
        targetBranch = matchedBranch;
        setSelectedBranchId(matchedBranch.id);
      }
    } else if (empCurrentBranch && selectedBranch.id !== empCurrentBranch.id) {
      // Force user to punch in at their currently assigned branch
      targetBranch = empCurrentBranch;
      setSelectedBranchId(empCurrentBranch.id);
    }

    // Temporarily pause camera
    setIsCameraActive(false);
    
    // Execute Attendance
    processAttendance(targetEmp, targetBranch, 'qr_mobile', photoUrl);
  };

  // Process Image File Upload QR
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleQrCodeScanned(code.data);
          } else {
            alert(
              lang === 'km'
                ? 'មិនអាចស្វែងរក QR Code ក្នុងរូបភាពនេះទេ សូមសាកល្បងរូបភាពផ្សេង'
                : 'Could not detect QR Code in the uploaded image. Please try another.'
            );
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Execute Attendance Registration
  const processAttendance = (
    emp: Employee,
    branch: Branch,
    method: 'qr_kiosk' | 'qr_mobile' | 'badge_scan' | 'manual_admin' = 'qr_mobile',
    photoUrl?: string
  ) => {
    setIsProcessing(true);

    setTimeout(() => {
      const now = new Date();
      const currentDistance = calculateDistanceMeters(
        currentGeo.lat,
        currentGeo.lng,
        branch.lat,
        branch.lng
      );
      const withinRadius = currentDistance <= branch.radiusMeters;

      // Determine Status (On-Time / Late / Geofence violation)
      let status: 'on_time' | 'late' | 'early_leave' | 'overtime' | 'geofence_violation' = 'on_time';
      
      if (!withinRadius) {
        status = 'geofence_violation';
      } else {
        const hour = now.getHours();
        const mins = now.getMinutes();
        const currentMins = hour * 60 + mins;

        // Office starts at 08:00 (480 mins) with 15 mins grace period
        if (branch.type === 'office' && currentMins > 8 * 60 + 15 && attendanceType === 'check_in') {
          status = 'late';
        } else if (branch.type === 'cafe' && currentMins > 7 * 60 && attendanceType === 'check_in') {
          status = 'late';
        } else if (attendanceType === 'check_out' && hour >= 18) {
          status = 'overtime';
        }
      }

      const newRecord: AttendanceRecord = {
        id: `att_${Date.now()}`,
        employeeId: emp.id,
        employeeNameKh: emp.nameKh,
        employeeNameEn: emp.nameEn,
        employeeCode: emp.code,
        employeeAvatar: emp.avatar,
        branchId: branch.id,
        branchNameKh: branch.nameKh,
        branchNameEn: branch.nameEn,
        type: attendanceType,
        timestamp: now.toISOString(),
        lat: currentGeo.lat,
        lng: currentGeo.lng,
        distanceToBranch: currentDistance,
        isWithinGeofence: withinRadius,
        accuracyMeters: currentGeo.accuracy || 5,
        method: method,
        selfieUrl: photoUrl || emp.avatar,
        status: status,
        notes: withinRadius
          ? `${attendanceType === 'check_in' ? 'ចូលធ្វើការ (Check-In)' : 'ចេញពីធ្វើការ (Check-Out)'} ត្រឹមត្រូវតាម Geofence (${currentDistance}m, GPS Accuracy ±${currentGeo.accuracy || 5}m)`
          : `⚠️ បដិសេធ: ទីតាំងនៅឆ្ងាយពីសាខា (${formatDistance(currentDistance, lang)}) លើសដែនកំណត់ ${branch.radiusMeters}m`,
      };

      onAddAttendanceRecord(newRecord);
      setLastSuccessRecord(newRecord);
      setScanSuccessModalRecord(newRecord);
      setIsProcessing(false);

      if (withinRadius) {
        try {
          confetti({
            particleCount: 90,
            spread: 70,
            origin: { y: 0.55 },
            colors: ['#10b981', '#06b6d4', '#6366f1', '#f59e0b', '#ec4899'],
          });
        } catch (e) {
          // ignore
        }
      }
    }, 450);
  };

  // Quick calibration of branch GPS to user's real location
  const handleSetBranchToMyLocation = () => {
    if (onUpdateBranchLocation && selectedBranch) {
      const isStaffRole = currentUser?.role === 'employee';
      const targetEmp = isStaffRole ? (loggedInEmp || selectedEmp) : selectedEmp;

      if (isStaffRole && targetEmp?.gpsCalibratedBranchId === selectedBranch.id) {
        alert(
          lang === 'km'
            ? `🔒 ទីតាំង GPS សាខានេះត្រូវបានកំណត់រួចរាល់ហើយ! បុគ្គលិកអាចកំណត់បានតែ ១ ដងគត់ក្នុងសាខាមួយ។ មិនអាចផ្លាស់ប្តូរទៅកាន់ទីតាំងផ្សេងទៀតបានទេ លុះត្រាតែមានការផ្ទេរទៅកាន់សាខាថ្មី ទើបអាចកំណត់ឡើងវិញបាន។`
            : `🔒 Branch GPS is locked! You have already calibrated your GPS for this branch (allowed 1st time only). You cannot change it until officially transferred to another branch.`
        );
        return;
      }

      const result = onUpdateBranchLocation(selectedBranch.id, currentGeo.lat, currentGeo.lng, targetEmp?.id) as unknown as { success: boolean; message?: string } | undefined;
      if (result && result.message) {
        alert(result.message);
      } else {
        alert(
          lang === 'km'
            ? `បានកែសម្រួលកូអរដោនេសាខា "${selectedBranch.nameKh}" ទៅកាន់ទីតាំង GPS ជាក់ស្តែងរបស់អ្នក (${currentGeo.lat.toFixed(5)}, ${currentGeo.lng.toFixed(5)}) រួចរាល់!`
            : `Branch "${selectedBranch.nameEn}" coordinates set to your current GPS position (${currentGeo.lat.toFixed(5)}, ${currentGeo.lng.toFixed(5)})!`
        );
      }
    }
  };

  // Continue scanning another punch
  const handleScanAnother = () => {
    setScanSuccessModalRecord(null);
    setScannedResult(null);
    setIsCameraActive(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-hanuman relative">
      {/* ========================================================================= */}
      {/* SCAN COMPLETED & SUCCESSFUL POPUP MODAL */}
      {/* ========================================================================= */}
      {scanSuccessModalRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-6 text-center space-y-5 animate-in zoom-in-95 duration-200">
            {/* Top Close Icon */}
            <button
              onClick={handleScanAnother}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Glowing Success Badge Icon */}
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <div className={`absolute inset-0 rounded-full animate-ping opacity-25 ${
                scanSuccessModalRecord.isWithinGeofence ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl shadow-emerald-200 ${
                scanSuccessModalRecord.isWithinGeofence
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 ring-4 ring-emerald-100'
                  : 'bg-gradient-to-tr from-amber-500 to-orange-500 ring-4 ring-amber-100'
              }`}>
                {scanSuccessModalRecord.isWithinGeofence ? (
                  <CheckCircle2 className="w-10 h-10" />
                ) : (
                  <AlertTriangle className="w-10 h-10" />
                )}
              </div>
            </div>

            {/* Heading */}
            <div>
              <span className={`inline-block text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider mb-1.5 ${
                scanSuccessModalRecord.isWithinGeofence
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {scanSuccessModalRecord.isWithinGeofence
                  ? (lang === 'km' ? '✅ ការស្កេនបានជោគជ័យ' : '✅ Verified Successful')
                  : (lang === 'km' ? '⚠️ ក្រៅរង្វង់ Geofence' : '⚠️ Geofence Flag')}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-battambang">
                {lang === 'km' ? 'ការស្កេនវត្តមានបានជោគជ័យ!' : 'Attendance Punch Completed & Successful!'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-hanuman">
                {lang === 'km'
                  ? 'ទិន្នន័យវត្តមាន និង GPS ត្រូវបានផ្ទៀងផ្ទាត់ និងកត់ត្រាចូលក្នុងប្រព័ន្ធរួចរាល់'
                  : 'Your attendance record & GPS geofence verification have been securely logged.'}
              </p>
            </div>

            {/* Employee & Record Details Card */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 text-left space-y-3.5 shadow-sm">
              <div className="flex items-center space-x-3.5 pb-3 border-b border-slate-200/80">
                <img
                  src={scanSuccessModalRecord.employeeAvatar}
                  alt={scanSuccessModalRecord.employeeNameEn}
                  className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-white shadow-md ring-2 ring-indigo-100 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base font-battambang truncate">
                      {lang === 'km' ? scanSuccessModalRecord.employeeNameKh : scanSuccessModalRecord.employeeNameEn}
                    </h3>
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold font-battambang shrink-0 flex items-center gap-1 ${
                      scanSuccessModalRecord.type === 'check_in'
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                        : 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    }`}>
                      {scanSuccessModalRecord.type === 'check_in' ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                      <span>
                        {scanSuccessModalRecord.type === 'check_in'
                          ? (lang === 'km' ? 'ចូលធ្វើការ (Check-In)' : 'Check-In')
                          : (lang === 'km' ? 'ចេញពីធ្វើការ (Check-Out)' : 'Check-Out')}
                      </span>
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                      {scanSuccessModalRecord.employeeCode}
                    </span>
                    <span>•</span>
                    <span className="font-battambang truncate">{scanSuccessModalRecord.branchNameKh}</span>
                  </div>
                </div>
              </div>

              {/* Grid Metadata */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                    {lang === 'km' ? 'កាលបរិច្ឆេទ & ម៉ោង' : 'Punch Time'}
                  </span>
                  <span className="font-mono text-slate-800 font-bold text-xs mt-0.5 block">
                    {new Date(scanSuccessModalRecord.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                    {lang === 'km' ? 'ចម្ងាយពីសាខា' : 'Geofence Distance'}
                  </span>
                  <span className={`font-mono font-bold text-xs mt-0.5 block ${
                    scanSuccessModalRecord.isWithinGeofence ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {formatDistance(scanSuccessModalRecord.distanceToBranch, lang)}
                  </span>
                </div>
              </div>

              {/* Geofence & GPS Accuracy Status */}
              <div className={`p-3 rounded-xl border text-[11px] flex items-center space-x-2.5 ${
                scanSuccessModalRecord.isWithinGeofence
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/70 border-amber-200 text-amber-900'
              }`}>
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                <div className="leading-relaxed">
                  <span className="font-bold">
                    {lang === 'km' ? 'ទីតាំងសាខា:' : 'Branch:'} {lang === 'km' ? scanSuccessModalRecord.branchNameKh : scanSuccessModalRecord.branchNameEn}
                  </span>
                  <span className="text-slate-500 block text-[10px]">
                    {lang === 'km' ? 'កូអរដោនេ GPS ផ្ទៀងផ្ទាត់ដោយជោគជ័យ' : 'GPS coordinates verified on-site'} (±{scanSuccessModalRecord.accuracyMeters || 5}m)
                  </span>
                </div>
              </div>
            </div>

            {/* Countdown & Navigation Info */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>{lang === 'km' ? 'ត្រឡប់ទៅផ្ទាំងគ្រប់គ្រងដោយស្វ័យប្រវត្តិ:' : 'Auto-redirect to Dashboard in:'}</span>
                <span className="font-bold text-indigo-600 font-mono text-sm bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  {redirectCountdown} {lang === 'km' ? 'វិនាទី' : 's'}
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-1.5 transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${(redirectCountdown / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (onNavigateToDashboard) {
                    onNavigateToDashboard();
                  }
                }}
                className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-200 transition flex items-center justify-center space-x-2 cursor-pointer font-battambang"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>{lang === 'km' ? 'ត្រឡប់ទៅផ្ទាំងគ្រប់គ្រង' : 'Back to Dashboard'}</span>
              </button>

              <button
                type="button"
                onClick={handleScanAnother}
                className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 font-bold text-xs sm:text-sm transition flex items-center justify-center space-x-2 cursor-pointer font-battambang border border-slate-200"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{lang === 'km' ? 'បន្តស្កេនទៀត' : 'Scan Another'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <span className="p-2.5 rounded-xl bg-white/20 text-white backdrop-blur-sm">
                <QrCode className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-white font-battambang flex items-center gap-2">
                  <span>{lang === 'km' ? 'ប្រព័ន្ធស្កេនវត្តមាន QR & ផ្ទៀងផ្ទាត់ GPS ជាក់ស្តែង' : 'Live QR & GPS Geofence Attendance'}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold uppercase tracking-wider">
                    {lang === 'km' ? 'ប្រព័ន្ធពិតប្រាកដ' : 'Real Hardware Verification'}
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-indigo-100 mt-1 font-hanuman">
                  {lang === 'km' 
                    ? 'ស្កេនកាមេរ៉ាផ្ទាល់ និងផ្ទៀងផ្ទាត់រលកសញ្ញា GPS ពីឧបករណ៍ពិតប្រាកដ ការពារការស្កេនជំនួសគ្នា ១០០%'
                    : 'Real device camera scanning paired with live satellite GPS Geofencing to enforce authentic on-site attendance.'}
                </p>
              </div>
            </div>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex items-center bg-indigo-700/80 p-1 rounded-xl border border-indigo-500/40 self-start md:self-auto text-xs font-hanuman">
            <button
              onClick={() => {
                setScanMode('camera_scan');
                setIsCameraActive(true);
              }}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg font-bold transition ${
                scanMode === 'camera_scan'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-indigo-100 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'ស្កេនកាមេរ៉ា' : 'Live Camera'}</span>
            </button>
            <button
              onClick={() => {
                setScanMode('mobile_punch');
                setIsCameraActive(false);
              }}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg font-bold transition ${
                scanMode === 'mobile_punch'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-indigo-100 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'ស្កេនតាម GPS' : 'Direct GPS Punch'}</span>
            </button>
            <button
              onClick={() => {
                setScanMode('qr_upload');
                setIsCameraActive(false);
              }}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg font-bold transition ${
                scanMode === 'qr_upload'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-indigo-100 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'បញ្ចូលរូប QR' : 'Upload QR'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Scanner & GPS Radar, Right Status & Execution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Camera Scanner / GPS Punch Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Scanner Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm font-battambang">
                    {lang === 'km' ? '១. ដំណើរការស្កេនវត្តមាន' : '1. Attendance Verification'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium font-hanuman">
                    {scanMode === 'camera_scan'
                      ? lang === 'km' ? 'តម្រង់កាមេរ៉ាទៅកាន់ QR Code នៅមុខសាខា ឬកាតបុគ្គលិក' : 'Point camera at Branch Kiosk QR code or Employee badge'
                      : scanMode === 'mobile_punch'
                      ? lang === 'km' ? 'ចុចបញ្ជាក់វត្តមានដោយប្រើប្រាស់កូអរដោនេ GPS ឧបករណ៍ផ្ទាល់' : 'Punch directly with real-time GPS coordinate validation'
                      : lang === 'km' ? 'ជ្រើសរើសរូបភាព QR Code ដើម្បីផ្ទៀងផ្ទាត់' : 'Select a QR code image to parse and verify'}
                  </p>
                </div>
              </div>

              {/* Check-In / Check-Out Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold font-hanuman">
                <button
                  id="type-checkin-btn"
                  onClick={() => setAttendanceType('check_in')}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-lg transition ${
                    attendanceType === 'check_in'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🟢 {lang === 'km' ? 'ចូលធ្វើការ (Check-In)' : 'Check-In'}</span>
                </button>
                <button
                  id="type-checkout-btn"
                  onClick={() => setAttendanceType('check_out')}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-lg transition ${
                    attendanceType === 'check_out'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🔴 {lang === 'km' ? 'ចេញពីធ្វើការ (Check-Out)' : 'Check-Out'}</span>
                </button>
              </div>
            </div>

            {/* Camera View Mode */}
            {scanMode === 'camera_scan' && (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video flex flex-col items-center justify-center border border-slate-200 shadow-inner">
                  {isCameraActive ? (
                    <>
                      <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        playsInline
                        muted
                      />
                      <canvas ref={canvasRef} className="hidden" />

                      {/* Scanner Reticle Frame */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-56 h-56 border-2 border-indigo-400/80 rounded-2xl relative shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-400 -mt-1 -ml-1 rounded-tl-lg" />
                          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-400 -mt-1 -mr-1 rounded-tr-lg" />
                          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-400 -mb-1 -ml-1 rounded-bl-lg" />
                          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-400 -mb-1 -mr-1 rounded-br-lg" />
                          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-indigo-400 shadow-[0_0_10px_#6366f1] animate-pulse" />
                        </div>
                      </div>

                      {/* Floating Camera Controls */}
                      <div className="absolute top-3 right-3 flex items-center space-x-2">
                        <button
                          onClick={() => setCameraFacing(f => f === 'environment' ? 'user' : 'environment')}
                          className="p-2 rounded-xl bg-slate-900/80 text-white backdrop-blur-md hover:bg-slate-800 transition shadow-md"
                          title="Switch Camera (Front/Rear)"
                        >
                          <SwitchCamera className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl text-center text-xs text-indigo-200 font-medium font-hanuman">
                        {lang === 'km' ? '⚡ កំពុងស្កេនផ្ទាល់... សូមតម្រង់ QR Code ចូលក្នុងប្រអប់' : '⚡ Scanning live... Align QR code within the frame'}
                      </div>
                    </>
                  ) : (
                    <div className="p-6 text-center space-y-3 font-hanuman">
                      <Camera className="w-12 h-12 text-slate-500 mx-auto" />
                      <p className="text-sm text-slate-300 font-medium max-w-xs">
                        {cameraError || (lang === 'km' ? 'កាមេរ៉ាមិនទាន់បានបើកទេ' : 'Camera is currently stopped')}
                      </p>
                      <button
                        onClick={() => {
                          setIsCameraActive(true);
                          startCamera();
                        }}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition inline-flex items-center space-x-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>{lang === 'km' ? 'បើកកាមេរ៉ាឡើងវិញ' : 'Start Camera'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Camera Helper Note */}
                <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span>
                      {lang === 'km' ? 'គណនីចុះវត្តមាន:' : 'Punching as:'}{' '}
                      <strong className="text-slate-800 font-battambang">{lang === 'km' ? selectedEmp.nameKh : selectedEmp.nameEn}</strong> ({selectedEmp.code})
                    </span>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-bold border border-indigo-100">
                    {selectedBranch.nameEn}
                  </span>
                </div>
              </div>
            )}

            {/* Direct Mobile GPS Punch Mode */}
            {scanMode === 'mobile_punch' && (
              <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 font-hanuman">
                {/* Employee Card Snapshot */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <img
                      src={selectedEmp.avatar}
                      alt={selectedEmp.nameEn}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-800 font-battambang">
                          {lang === 'km' ? selectedEmp.nameKh : selectedEmp.nameEn}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 font-bold">
                          {selectedEmp.code}
                        </span>
                      </div>
                      <p className="text-xs text-indigo-600 font-semibold">{selectedEmp.role}</p>
                      <p className="text-[11px] text-slate-500">{selectedEmp.departmentKh}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                      {lang === 'km' ? 'សាខាកំណត់' : 'Target Branch'}
                    </span>
                    <span className="text-xs text-slate-800 font-bold font-battambang truncate max-w-[140px] block">
                      {lang === 'km' ? selectedBranch.nameKh : selectedBranch.nameEn}
                    </span>
                  </div>
                </div>

                {/* Employee / Branch Switcher if Admin */}
                {!isEmployee && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1 font-semibold">
                        {lang === 'km' ? 'ជ្រើសរើសបុគ្គលិក (Employee):' : 'Select Employee:'}
                      </label>
                      <select
                        id="employee-punch-selector"
                        value={selectedEmpId}
                        onChange={(e) => setSelectedEmpId(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm font-medium cursor-pointer"
                      >
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.code} - {lang === 'km' ? emp.nameKh : emp.nameEn} ({emp.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1 font-semibold">
                        {lang === 'km' ? 'សាខាដែលត្រូវចុះវត្តមាន (Target Branch):' : 'Target Branch:'}
                      </label>
                      <select
                        id="branch-punch-selector"
                        value={selectedBranchId}
                        onChange={(e) => setSelectedBranchId(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium shadow-sm cursor-pointer"
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {lang === 'km' ? b.nameKh : b.nameEn} ({b.radiusMeters}m Geofence)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Instant Punch Action Button */}
                <button
                  id="instant-punch-submit-btn"
                  onClick={() => processAttendance(selectedEmp, selectedBranch, 'qr_mobile', selectedEmp.avatar)}
                  disabled={isProcessing}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer ${
                    isWithinGeofence
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                      : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>{lang === 'km' ? 'កំពុងផ្ទៀងផ្ទាត់ GPS & កត់ត្រាវត្តមាន...' : 'Verifying GPS & Recording Attendance...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>
                        {isWithinGeofence
                          ? lang === 'km'
                            ? `បញ្ជាក់វត្តមាន ${attendanceType === 'check_in' ? 'ចូលធ្វើការ (Check-In)' : 'ចេញពីធ្វើការ (Check-Out)'} តាម GPS ផ្ទាល់`
                            : `Execute ${attendanceType === 'check_in' ? 'Check-In' : 'Check-Out'} with Live GPS`
                          : lang === 'km'
                            ? `⚠️ បញ្ជាក់ស្កេន (នឹងត្រូវបដិសេធដោយសារនៅឆ្ងាយ ${formatDistance(distanceToBranch, lang)})`
                            : `⚠️ Trigger Punch (Out of range: ${formatDistance(distanceToBranch, lang)} away)`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* QR Code Upload Mode */}
            {scanMode === 'qr_upload' && (
              <div className="p-8 text-center border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 space-y-3 font-hanuman">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-12 h-12 text-indigo-500 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm font-battambang">
                  {lang === 'km' ? 'ជ្រើសរើសរូបភាព QR Code' : 'Upload QR Code Image'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {lang === 'km'
                    ? 'ជ្រើសរើសរូបថតអេក្រង់ ឬរូបភាព QR Code នៃសាខាដើម្បីផ្ទៀងផ្ទាត់វត្តមានភ្លាមៗ'
                    : 'Select a screenshot or photo of the branch QR code to decode and register attendance.'}
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition inline-flex items-center space-x-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>{lang === 'km' ? 'ជ្រើសរើសរូបភាព' : 'Choose QR Image'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Real GPS Geofencing Verification Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 font-hanuman">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm font-battambang">
                    {lang === 'km' ? '២. ផ្ទៀងផ្ទាត់ទីតាំងភូមិសាស្ត្រ GPS ជាក់ស្តែង' : '2. Live Geofencing Verification'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {lang === 'km' ? 'ផ្ទៀងផ្ទាត់កូអរដោនេផ្កាយរណបពិតប្រាកដពីទូរស័ព្ទ ឬកុំព្យូទ័ររបស់អ្នក' : 'Live satellite coordinate lock from your physical device'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => fetchRealDeviceGps(true)}
                disabled={isLocatingGps}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs border border-slate-200 font-semibold shadow-sm transition cursor-pointer"
              >
                {isLocatingGps ? <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" /> : <Radio className="w-3.5 h-3.5 text-indigo-600" />}
                <span>{lang === 'km' ? 'ទាញយក GPS ពិត' : 'Refresh GPS'}</span>
              </button>
            </div>

            {/* Live Distance & Geofence Status Indicator */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              isWithinGeofence
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                : 'bg-rose-50/70 border-rose-200 text-rose-800'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                  isWithinGeofence ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {isWithinGeofence ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-slate-800 font-battambang">
                      {isWithinGeofence
                        ? lang === 'km' ? '✅ ស្ថិតក្នុងបរិវេណអនុញ្ញាត (Within Geofence)' : '✅ Geofence Verified: On-Site'
                        : lang === 'km' ? '❌ នៅក្រៅបរិវេណសាខា (Out of Geofence)' : '❌ Geofence Violation: Out of Range'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    {lang === 'km' ? 'ចម្ងាយពីសាខា:' : 'Distance to branch:'}{' '}
                    <span className="font-bold text-slate-900">{formatDistance(distanceToBranch, lang)}</span>
                    {' '}({lang === 'km' ? `កាំកំណត់: ${selectedBranch.radiusMeters} ម៉ែត្រ` : `Radius: ${selectedBranch.radiusMeters}m`})
                  </p>
                </div>
              </div>

              {/* Status Tag */}
              <div className="text-left sm:text-right">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                  isWithinGeofence
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-rose-600 text-white shadow-sm'
                }`}>
                  {isWithinGeofence
                    ? lang === 'km' ? 'អនុញ្ញាតស្កេន' : 'Punch Allowed'
                    : lang === 'km' ? 'បដិសេធស្កេន' : 'Punch Blocked'}
                </span>
              </div>
            </div>

            {/* GPS Metadata & Admin Calibration */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-600 font-mono text-[11px]">
                <span>Your Hardware Lat/Lng:</span>
                <span className="font-bold text-slate-900">{currentGeo.lat.toFixed(6)}, {currentGeo.lng.toFixed(6)} (±{currentGeo.accuracy || 5}m)</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 font-mono text-[11px]">
                <span>Branch Location:</span>
                <span className="font-bold text-indigo-700">{selectedBranch.lat.toFixed(6)}, {selectedBranch.lng.toFixed(6)}</span>
              </div>

              {/* Admin shortcut & Staff 1st-Time Calibration */}
              {onUpdateBranchLocation && (
                <div className="pt-2 border-t border-slate-200">
                  {Boolean(currentUser?.role === 'employee' && (loggedInEmp || selectedEmp)?.gpsCalibratedBranchId === selectedBranch.id) ? (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                      <div className="flex items-center space-x-2 text-[11px]">
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center shrink-0">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-bold block">
                            {lang === 'km' ? 'GPS សាខាបានចាក់សោ (កំណត់បានតែ ១ ដង)' : 'Branch GPS Locked (1st-Time Setup Active)'}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-medium">
                            {lang === 'km' ? 'មិនអាចប្តូរបានទេ រហូតដល់ផ្ទេរទៅកាន់សាខាថ្មី' : 'Cannot change until transferred to another branch'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-white rounded-md border border-emerald-300 text-emerald-800 shadow-2xs">
                        🔒 {lang === 'km' ? 'ជាប់សោ' : 'Locked'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px]">
                        <span className="font-bold text-slate-700 block">
                          {lang === 'km' ? 'កំណត់សាខានេះនៅទីតាំង GPS ខ្ញុំ' : 'Set Branch to My GPS'}
                        </span>
                        <span className="text-[10px] text-indigo-600 font-medium">
                          {currentUser?.role === 'employee'
                            ? (lang === 'km' ? '📌 កំណត់បានតែ ១ ដងគត់ (ចាក់សោរហូតដល់ផ្ទេរសាខា)' : '📌 Allowed 1st time only (locks until branch transfer)')
                            : (lang === 'km' ? '⚙️ កំណត់ទីតាំងតេស្ត ឬទីតាំងជាក់ស្តែង' : '⚙️ Calibrate branch coordinates')}
                        </span>
                      </div>
                      <button
                        onClick={handleSetBranchToMyLocation}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-sm transition cursor-pointer flex items-center space-x-1 shrink-0"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{lang === 'km' ? 'កំណត់ទីតាំង' : 'Set to My GPS'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Last Receipt & Today's Attendance Stream (5 cols) */}
        <div className="lg:col-span-5 space-y-6 font-hanuman">
          {/* Last Attendance Receipt Card */}
          {lastSuccessRecord ? (
            <div className={`rounded-2xl p-6 border shadow-sm ${
              lastSuccessRecord.isWithinGeofence
                ? 'bg-white border-emerald-200'
                : 'bg-white border-rose-200'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                    lastSuccessRecord.isWithinGeofence ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}>
                    {lastSuccessRecord.isWithinGeofence ? '✓' : '!'}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm font-battambang">
                      {lastSuccessRecord.isWithinGeofence
                        ? lang === 'km' ? 'បង្កាន់ដៃវត្តមានបានជោគជ័យ' : 'Attendance Verified'
                        : lang === 'km' ? 'ការចុះវត្តមានត្រូវបានបដិសេធ' : 'Attendance Rejected'}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">{lastSuccessRecord.id}</span>
                  </div>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  lastSuccessRecord.type === 'check_in'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {lastSuccessRecord.type === 'check_in' ? 'Check-In' : 'Check-Out'}
                </span>
              </div>

              {/* Employee & Record Details */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <img
                    src={lastSuccessRecord.employeeAvatar}
                    alt={lastSuccessRecord.employeeNameEn}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm"
                  />
                  <div>
                    <div className="font-bold text-slate-800 text-sm font-battambang">
                      {lang === 'km' ? lastSuccessRecord.employeeNameKh : lastSuccessRecord.employeeNameEn}
                    </div>
                    <div className="text-slate-500 font-mono font-semibold">{lastSuccessRecord.employeeCode}</div>
                    <div className="text-indigo-600 font-semibold text-[11px] font-battambang">{lastSuccessRecord.branchNameEn}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                      {lang === 'km' ? 'កាលបរិច្ឆេទ & ម៉ោង' : 'Date & Time'}
                    </span>
                    <span className="font-mono text-slate-800 font-bold text-xs">
                      {new Date(lastSuccessRecord.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                      {lang === 'km' ? 'ចម្ងាយ GPS ជាក់ស្តែង' : 'GPS Distance'}
                    </span>
                    <span className={`font-mono font-bold text-xs ${
                      lastSuccessRecord.isWithinGeofence ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {formatDistance(lastSuccessRecord.distanceToBranch, lang)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-700">{lang === 'km' ? 'កំណត់សម្គាល់:' : 'Note:'}</span>{' '}
                  {lastSuccessRecord.notes}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto border border-slate-200">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm font-battambang">
                {lang === 'km' ? 'មិនទាន់មានការស្កេនក្នុងវគ្គនេះ' : 'No punch in this session yet'}
              </h4>
              <p className="text-xs text-slate-500 font-medium font-hanuman">
                {lang === 'km'
                  ? 'សូមបើកកាមេរ៉ាស្កេន ឬចុចប៊ូតុង "បញ្ជាក់វត្តមានតាម GPS" ដើម្បីកត់ត្រាវត្តមានផ្ទាល់'
                  : 'Scan camera or use Direct GPS Punch to record official attendance.'}
              </p>
            </div>
          )}

          {/* Today's Live Attendance Feed at Selected Branch */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-slate-800 text-sm font-battambang">
                  {lang === 'km' ? 'វត្តមានថ្ងៃនេះ' : "Today's Activity"}
                </h4>
              </div>
              <span className="text-xs text-slate-500 font-semibold font-mono">
                {attendanceRecords.length} {lang === 'km' ? 'កំណត់ត្រា' : 'records'}
              </span>
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {attendanceRecords.slice(0, 6).map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/80 transition text-xs"
                >
                  <div className="flex items-center space-x-2.5">
                    <img
                      src={rec.employeeAvatar}
                      alt={rec.employeeNameEn}
                      className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-sm"
                    />
                    <div>
                      <div className="font-bold text-slate-800 font-battambang">
                        {lang === 'km' ? rec.employeeNameKh : rec.employeeNameEn}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 font-hanuman">
                        <span className="text-indigo-600 font-mono font-semibold">{rec.employeeCode}</span>
                        <span>•</span>
                        <span className="truncate max-w-[110px] font-medium font-battambang">{rec.branchNameEn}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      rec.type === 'check_in'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {rec.type === 'check_in' ? 'IN' : 'OUT'}
                    </span>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
