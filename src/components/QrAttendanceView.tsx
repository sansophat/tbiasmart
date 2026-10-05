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
  Check,
  ShieldAlert,
  Shield,
  Laptop
} from 'lucide-react';
import { Branch, Employee, AttendanceRecord, UserGeoLocation, Language, AuthUser, SystemSettings, AuditLogEntry, LeaveRequest } from '../types';
import { calculateDistanceMeters, formatDistance, toKhmerNumeral, verifyBranchDynamicQrToken } from '../utils/geoUtils';
import { 
  getDeviceFingerprint, 
  validateEmployeeDevice, 
  bindEmployeeToCurrentDevice, 
  DeviceFingerprint, 
  DeviceValidationResult 
} from '../utils/deviceSecurityUtils';
import { playAlertChime } from '../utils/soundUtils';
import { validatePunchAllowance, PunchAllowanceResult } from '../utils/dayOffUtils';

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
  systemSettings?: SystemSettings;
  onUpdateEmployee?: (emp: Employee) => void;
  onAddAuditLog?: (log: AuditLogEntry) => void;
  leaveRequests?: LeaveRequest[];
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
  systemSettings,
  onUpdateEmployee,
  onAddAuditLog,
  leaveRequests = [],
}) => {
  // Find employee profile if logged in
  const loggedInEmp = employees.find(
    (e) =>
      e.id === currentUser?.employeeId ||
      (currentUser?.employeeId && e.id === currentUser.employeeId.replace('user_', '')) ||
      e.code === currentUser?.employeeCode ||
      e.id === currentUser?.id ||
      (`user_${e.id}` === currentUser?.id) ||
      (currentUser?.username && e.code.toLowerCase() === currentUser.username.toLowerCase()) ||
      (currentUser?.email && e.email && e.email.toLowerCase() === currentUser.email.toLowerCase())
  );
  const isEmployee = currentUser?.role === 'employee';

  const defaultEmpId = loggedInEmp?.id || employees[0]?.id || '';
  const defaultEmp = employees.find((e) => e.id === defaultEmpId);
  const defaultBranchId = (loggedInEmp?.branchId || defaultEmp?.branchId || currentUser?.branchId)
    ? (loggedInEmp?.branchId || defaultEmp?.branchId || currentUser?.branchId)!
    : branches[0]?.id || '';

  const [selectedBranchId, setSelectedBranchId] = useState<string>(defaultBranchId);
  const [selectedEmpId, setSelectedEmpId] = useState<string>(defaultEmpId);

  // Auto-sync branch to employee's assigned branch whenever employee changes or loads
  useEffect(() => {
    if (selectedEmpId) {
      const targetEmp = employees.find((e) => e.id === selectedEmpId);
      if (targetEmp) {
        let b = branches.find((br) => br.id === targetEmp.branchId);
        if (!b) {
          const deptB = branches.find(
            (br) =>
              (targetEmp.department &&
                (br.nameEn.toLowerCase() === targetEmp.department.toLowerCase() ||
                  br.nameEn.toLowerCase().includes(targetEmp.department.toLowerCase()) ||
                  targetEmp.department.toLowerCase().includes(br.nameEn.toLowerCase()))) ||
              (targetEmp.departmentKh &&
                (br.nameKh === targetEmp.departmentKh ||
                  br.nameKh.includes(targetEmp.departmentKh) ||
                  targetEmp.departmentKh.includes(br.nameKh)))
          );
          if (deptB) b = deptB;
        }
        if (b) {
          setSelectedBranchId(b.id);
        }
      }
    }
  }, [selectedEmpId, employees, branches]);

  const userInitRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentUser?.id && userInitRef.current !== currentUser.id) {
      userInitRef.current = currentUser.id;
      if (loggedInEmp) {
        setSelectedEmpId(loggedInEmp.id);
        let b = branches.find((br) => br.id === loggedInEmp.branchId);
        if (!b) {
          const deptB = branches.find(
            (br) =>
              (loggedInEmp.department &&
                (br.nameEn.toLowerCase() === loggedInEmp.department.toLowerCase() ||
                  br.nameEn.toLowerCase().includes(loggedInEmp.department.toLowerCase()) ||
                  loggedInEmp.department.toLowerCase().includes(br.nameEn.toLowerCase()))) ||
              (loggedInEmp.departmentKh &&
                (br.nameKh === loggedInEmp.departmentKh ||
                  br.nameKh.includes(loggedInEmp.departmentKh) ||
                  loggedInEmp.departmentKh.includes(br.nameKh)))
          );
          if (deptB) b = deptB;
        }
        if (b) {
          setSelectedBranchId(b.id);
        }
      }
    }
  }, [currentUser?.id, loggedInEmp, branches]);

  const [attendanceType, setAttendanceType] = useState<'check_in' | 'check_out'>('check_in');
  
  // Real scan modes: 'camera_scan' (Live Camera) | 'mobile_punch' (Direct GPS Punch) | 'qr_upload' (Upload QR Image)
  // Staffs mostly use punch by GPS, so Direct GPS Punch is default and prioritized
  const [scanMode, setScanMode] = useState<'camera_scan' | 'mobile_punch' | 'qr_upload'>('mobile_punch');
  
  // Camera state - initially inactive since mobile GPS punch is the primary default mode
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastSuccessRecord, setLastSuccessRecord] = useState<AttendanceRecord | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [enableSelfieVerification, setEnableSelfieVerification] = useState<boolean>(true);
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);

  // Anti-Double-Punch & Rapid Double-Tap Safeguard State
  const isSubmittingRef = useRef<boolean>(false);
  const [doublePunchModal, setDoublePunchModal] = useState<{
    emp: Employee;
    branch: Branch;
    method: 'qr_kiosk' | 'qr_mobile' | 'badge_scan' | 'manual_admin';
    photoUrl?: string;
    targetType: 'check_in' | 'check_out';
    recentPunch: AttendanceRecord;
    elapsedSeconds: number;
  } | null>(null);

  const [duplicateAlertModal, setDuplicateAlertModal] = useState<{
    emp: Employee;
    type: 'check_in' | 'check_out';
    timestamp: string;
    branchName: string;
  } | null>(null);

  // Success Modal Popup State
  const [scanSuccessModalRecord, setScanSuccessModalRecord] = useState<AttendanceRecord | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number>(5);

  // Device Fingerprint & Hardware Binding State
  const [currentDevice] = useState<DeviceFingerprint>(() => getDeviceFingerprint());
  const [deviceSecurityAlert, setDeviceSecurityAlert] = useState<DeviceValidationResult | null>(null);
  const [punchBlockAlert, setPunchBlockAlert] = useState<PunchAllowanceResult | null>(null);
  const [showDeviceDetailsModal, setShowDeviceDetailsModal] = useState<boolean>(false);

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
  const todayDateStr = new Date().toISOString().split('T')[0];
  const selectedEmpTodayRecords = (attendanceRecords || [])
    .filter(
      (r) =>
        (r.employeeId === selectedEmp.id || r.employeeCode === selectedEmp.code) &&
        r.timestamp &&
        r.timestamp.startsWith(todayDateStr)
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const latestPunchToday = selectedEmpTodayRecords[0];
  const checkInRecordToday = selectedEmpTodayRecords.find((r) => r.type === 'check_in');
  const checkOutRecordToday = selectedEmpTodayRecords.find((r) => r.type === 'check_out');
  const hasCheckedInToday = Boolean(checkInRecordToday);
  const hasCheckedOutToday = Boolean(checkOutRecordToday);

  // Elapsed seconds since latest punch
  const elapsedSecondsSinceLastPunch = latestPunchToday
    ? Math.floor((Date.now() - new Date(latestPunchToday.timestamp).getTime()) / 1000)
    : Infinity;
  const isCooldownActive = elapsedSecondsSinceLastPunch < 300; // 5-minute guard window

  useEffect(() => {
    if (hasCheckedInToday && !hasCheckedOutToday) {
      setAttendanceType('check_out');
    } else {
      setAttendanceType('check_in');
    }
  }, [hasCheckedInToday, hasCheckedOutToday]);

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

  // Execute Attendance Registration with Anti-Double-Punch Protection
  const processAttendance = (
    emp: Employee,
    branch: Branch,
    method: 'qr_kiosk' | 'qr_mobile' | 'badge_scan' | 'manual_admin' = 'qr_mobile',
    photoUrl?: string,
    forcedType?: 'check_in' | 'check_out',
    forceConfirm: boolean = false
  ) => {
    // Synchronous immediate lock to prevent accidental double-tap/rapid double-click
    if (isSubmittingRef.current || isProcessing) {
      return;
    }
    isSubmittingRef.current = true;

    const targetType = forcedType || attendanceType;

    // Check recent punches today for this specific employee
    const today = new Date().toISOString().split('T')[0];
    const empTodayPunches = attendanceRecords
      .filter((r) => (r.employeeId === emp.id || r.employeeCode === emp.code) && r.timestamp?.startsWith(today))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const recentPunch = empTodayPunches[0];

    // Protection 1: Prevent duplicate punch of the EXACT SAME TYPE
    if (recentPunch && recentPunch.type === targetType && !forceConfirm) {
      isSubmittingRef.current = false;
      setIsProcessing(false);
      playAlertChime('security_alert');
      setDuplicateAlertModal({
        emp,
        type: targetType,
        timestamp: recentPunch.timestamp,
        branchName: recentPunch.branchNameKh || recentPunch.branchNameEn,
      });
      return;
    }

    // Protection 2: Accidental fast double-punch toggle (e.g. employee taps twice when checking in or out)
    // If they checked in within the last 5 minutes (300s) and now targetType is check_out (or vice versa),
    // require an explicit confirmation modal so an accidental 2nd punch never silently checks them out/in!
    if (recentPunch && recentPunch.type !== targetType && !forceConfirm) {
      const elapsedSec = Math.floor((Date.now() - new Date(recentPunch.timestamp).getTime()) / 1000);
      if (elapsedSec < 300) {
        isSubmittingRef.current = false;
        setIsProcessing(false);
        playAlertChime('alert');
        setDoublePunchModal({
          emp,
          branch,
          method,
          photoUrl,
          targetType,
          recentPunch,
          elapsedSeconds: elapsedSec,
        });
        return;
      }
    }

    setIsProcessing(true);

    // 0. Sunday Rest, Weekly Day Off, and Leave Validation (Punches strictly prohibited)
    const allowance = validatePunchAllowance(emp, leaveRequests, new Date());
    if (!allowance.allowed) {
      isSubmittingRef.current = false;
      setIsProcessing(false);
      setIsCameraActive(false);
      playAlertChime('security_alert');
      setPunchBlockAlert(allowance);

      if (onAddAuditLog) {
        onAddAuditLog({
          id: `sec_dayoff_${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          actorName: `${emp.nameKh} (${emp.code})`,
          actorRole: emp.role || 'employee',
          action: 'Blocked Punch on Rest/Leave Day',
          actionKh: 'បដិសេធការកត់ត្រាវត្តមាននៅថ្ងៃសម្រាកឬច្បាប់',
          module: 'attendance',
          details: allowance.reason || 'Punch not allowed on Sunday/Day Off/Leave.',
          detailsKh: allowance.reasonKh || 'មិនអនុញ្ញាតឱ្យកត់ត្រាវត្តមាននៅថ្ងៃសម្រាក ឬច្បាប់ឡើយ',
          status: 'warning',
        });
      }
      return;
    }

    // 1. Hardware-bound Anti-Proxy & Anti-Fake Device Validation
    // Only enforce 1-device lock on mobile/remote punch (kiosk scans are from the company kiosk terminal)
    if (method !== 'qr_kiosk') {
      const deviceValidation = validateEmployeeDevice(emp, currentDevice, systemSettings, employees);

      if (!deviceValidation.allowed) {
        isSubmittingRef.current = false;
        setIsProcessing(false);
        setIsCameraActive(false);
        playAlertChime('security_alert');
        setDeviceSecurityAlert(deviceValidation);

        if (onAddAuditLog) {
          onAddAuditLog({
            id: `sec_dev_${Date.now()}`,
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
            actorName: `${emp.nameKh} (${emp.code})`,
            actorRole: emp.role || 'employee',
            action: 'Blocked Proxy Attendance Scan',
            actionKh: 'បដិសេធការប៉ុនប៉ងស្កេនពីឧបករណ៍មិនអនុញ្ញាត',
            module: 'security',
            details: deviceValidation.reason || 'Device mismatch or conflict detected.',
            detailsKh: deviceValidation.reasonKh || 'រកឃើញឧបករណ៍មិនត្រូវគ្នា (Unauthorized Device)',
            status: 'alert',
          });
        }
        return;
      }

      // Auto-enroll device on first successful scan
      if (deviceValidation.isFirstTimeEnrollment && onUpdateEmployee) {
        const boundEmp = bindEmployeeToCurrentDevice(emp, currentDevice.deviceId, currentDevice.deviceName);
        onUpdateEmployee(boundEmp);
        if (onAddAuditLog) {
          onAddAuditLog({
            id: `sec_enroll_${Date.now()}`,
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
            actorName: `${emp.nameKh} (${emp.code})`,
            actorRole: emp.role || 'employee',
            action: 'Registered Trusted Device',
            actionKh: 'ចុះឈ្មោះចាក់សោឧបករណ៍ផ្លូវការ',
            module: 'security',
            details: `Bound employee ${emp.nameEn} to device "${currentDevice.deviceName}" (${currentDevice.deviceId.slice(0, 16)}...)`,
            detailsKh: `បានភ្ជាប់គណនី ${emp.nameKh} ជាមួយឧបករណ៍ "${currentDevice.deviceName}"`,
            status: 'success',
          });
        }
      }
    }

    setTimeout(() => {
      const now = new Date();
      // Ensure punch is credited to the employee's assigned branch
      const assignedBranch = emp.branchId ? branches.find((b) => b.id === emp.branchId) : undefined;
      const effectiveBranch = (method !== 'qr_kiosk' && assignedBranch) ? assignedBranch : branch;

      const currentDistance = calculateDistanceMeters(
        currentGeo.lat,
        currentGeo.lng,
        effectiveBranch.lat,
        effectiveBranch.lng
      );
      const withinRadius = currentDistance <= effectiveBranch.radiusMeters;

      // Determine Status (On-Time / Late / Geofence violation)
      let status: 'on_time' | 'late' | 'early_leave' | 'overtime' | 'geofence_violation' = 'on_time';
      
      if (!withinRadius) {
        status = 'geofence_violation';
      } else {
        const hour = now.getHours();
        const mins = now.getMinutes();
        const currentMins = hour * 60 + mins;

        // Office starts at 08:00 (480 mins) with 15 mins grace period
        if (effectiveBranch.type === 'office' && currentMins > 8 * 60 + 15 && targetType === 'check_in') {
          status = 'late';
        } else if (effectiveBranch.type === 'cafe' && currentMins > 7 * 60 && targetType === 'check_in') {
          status = 'late';
        } else if (targetType === 'check_out' && hour >= 18) {
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
        branchId: effectiveBranch.id,
        branchNameKh: effectiveBranch.nameKh,
        branchNameEn: effectiveBranch.nameEn,
        type: targetType,
        timestamp: now.toISOString(),
        lat: currentGeo.lat,
        lng: currentGeo.lng,
        distanceToBranch: currentDistance,
        isWithinGeofence: withinRadius,
        accuracyMeters: currentGeo.accuracy || 5,
        method: method,
        selfieUrl: photoUrl || emp.avatar,
        status: status,
        deviceId: currentDevice.deviceId,
        deviceName: currentDevice.deviceName,
        deviceVerified: true,
        notes: withinRadius
          ? `${targetType === 'check_in' ? 'ចូលធ្វើការ (Check-In)' : 'ចេញពីធ្វើការ (Check-Out)'} ត្រឹមត្រូវតាម Geofence (${currentDistance}m, GPS Accuracy ±${currentGeo.accuracy || 5}m)`
          : `⚠️ បដិសេធ: ទីតាំងនៅឆ្ងាយពីសាខា (${formatDistance(currentDistance, lang)}) លើសដែនកំណត់ ${effectiveBranch.radiusMeters}m`,
      };

      onAddAttendanceRecord(newRecord);
      setLastSuccessRecord(newRecord);
      setScanSuccessModalRecord(newRecord);
      setIsProcessing(false);

      setTimeout(() => {
        isSubmittingRef.current = false;
      }, 1500);

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
      {/* REST DAY / DAY OFF / LEAVE: PUNCH NOT ALLOWED MODAL */}
      {/* ========================================================================= */}
      {punchBlockAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white border border-amber-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-6 text-center space-y-5 animate-in zoom-in-95 duration-200">
            {/* Top Close */}
            <button
              onClick={() => {
                setPunchBlockAlert(null);
                setIsCameraActive(true);
              }}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Warning Icon */}
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-amber-500 animate-ping opacity-25" />
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shadow-xl shadow-amber-200 ring-4 ring-amber-100">
                <Clock className="w-10 h-10" />
              </div>
            </div>

            {/* Heading */}
            <div>
              <span className="inline-block text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider mb-1.5 bg-amber-100 text-amber-800 border border-amber-200">
                {punchBlockAlert.type === 'sunday_rest'
                  ? (lang === 'km' ? '🛑 ថ្ងៃអាទិត្យសម្រាកផ្លូវការ' : '🛑 Sunday Weekly Rest Day')
                  : punchBlockAlert.type === 'day_off'
                  ? (lang === 'km' ? '🛑 ថ្ងៃឈប់សម្រាកប្រចាំសប្តាហ៍' : '🛑 Scheduled Day Off')
                  : (lang === 'km' ? '🛑 ច្បាប់ឈប់សម្រាកអនុញ្ញាត' : '🛑 Scheduled Leave Active')}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-battambang">
                {lang === 'km' ? 'មិនអនុញ្ញាតឱ្យកត់ត្រាវត្តមាន!' : 'Attendance Punch Not Allowed!'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {lang === 'km'
                  ? 'ប្រព័ន្ធបិទការកត់ត្រាវត្តមាននៅថ្ងៃសម្រាក ឬពេលមានច្បាប់ ដើម្បីការពារការភាន់ច្រឡំ ឬកត់ត្រាខុស'
                  : 'Punching is strictly disabled on Sunday rest, weekly Day Off, and active leave.'}
              </p>
            </div>

            {/* Notice Box */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 text-left space-y-2">
              <div className="flex items-start gap-2.5">
                <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 font-medium">
                  <p className="font-bold mb-1">
                    {lang === 'km' ? punchBlockAlert.reasonKh : punchBlockAlert.reason}
                  </p>
                  <p className="text-amber-800 text-[11px]">
                    {lang === 'km'
                      ? 'ទិន្នន័យនៅថ្ងៃនេះនឹងត្រូវសម្គាល់ដោយស្វ័យប្រវត្តិតាមប្រតិទិនការងារ (Day Off / Leave) លើរបាយការណ៍ ដោយមិនចាត់ទុកជាអវត្តមានឡើយ។'
                      : 'This day is automatically designated in timesheet reports as your rest day/leave, avoiding any absent confusion.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Dismiss Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setPunchBlockAlert(null);
                  setIsCameraActive(true);
                }}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs tracking-wide transition shadow-lg shadow-slate-300 cursor-pointer"
              >
                {lang === 'km' ? 'យល់ព្រម (OK, I Understand)' : 'OK, I Understand'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECURITY ALERT: UNAUTHORIZED DEVICE / PROXY SCANNING BLOCKED MODAL */}
      {/* ========================================================================= */}
      {deviceSecurityAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white border border-rose-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-6 text-center space-y-5 animate-in zoom-in-95 duration-200">
            {/* Top Close */}
            <button
              onClick={() => {
                setDeviceSecurityAlert(null);
                setIsCameraActive(true);
              }}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Shield Alert Icon with warning pulse */}
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-25" />
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white shadow-xl shadow-rose-200 ring-4 ring-rose-100">
                <ShieldAlert className="w-10 h-10" />
              </div>
            </div>

            {/* Heading */}
            <div>
              <span className="inline-block text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider mb-1.5 bg-rose-100 text-rose-800 border border-rose-200">
                {lang === 'km' ? '⛔ ប្រព័ន្ធសុវត្ថិភាពទប់ស្កាត់ការស្កេនជំនួស' : '⛔ Anti-Proxy Security Alert'}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-battambang">
                {lang === 'km' ? 'រកឃើញឧបករណ៍មិនត្រូវគ្នា (Unauthorized Device)!' : 'Unauthorized Device Detected!'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {lang === 'km'
                  ? 'ការចុះវត្តមានត្រូវបានបដិសេធ ដើម្បីការពារការ Login លើទូរស័ព្ទអ្នកដទៃដើម្បីស្កេនជំនួស'
                  : 'Attendance punch blocked to prevent buddy punching and multi-device account sharing.'}
              </p>
            </div>

            {/* Comparison Cards: Current Device vs Authorized Device */}
            <div className="space-y-3 text-left">
              <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-rose-600" />
                    <span>{lang === 'km' ? 'ឧបករណ៍បច្ចុប្បន្ន (Attempted Device):' : 'Current Device:'}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-rose-200 text-rose-800 text-[10px] font-bold">
                    {lang === 'km' ? 'មិនអនុញ្ញាត' : 'Blocked'}
                  </span>
                </div>
                <p className="text-sm font-bold text-rose-800 font-mono">
                  {deviceSecurityAlert.currentDeviceName}
                </p>
                <p className="text-[10px] text-rose-600 font-mono truncate">
                  ID: {deviceSecurityAlert.currentDeviceId}
                </p>
              </div>

              {deviceSecurityAlert.trustedDeviceName && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-emerald-600" />
                      <span>{lang === 'km' ? 'ឧបករណ៍ផ្លូវការដែលបានចុះឈ្មោះ (Authorized Device):' : 'Bound Authorized Phone:'}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-800 text-[10px] font-bold">
                      {lang === 'km' ? 'ចាក់សោសុវត្ថិភាព' : '1-Device Locked'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-emerald-800 font-mono">
                    {deviceSecurityAlert.trustedDeviceName}
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    {lang === 'km' ? 'គណនីរបស់អ្នកត្រូវបានភ្ជាប់ជាមួយទូរស័ព្ទនេះតែមួយគត់។' : 'Account is strictly bound to this personal device.'}
                  </p>
                </div>
              )}

              {deviceSecurityAlert.isDeviceConflict && deviceSecurityAlert.conflictEmployeeName && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{lang === 'km' ? 'ទំនាស់ឧបករណ៍រួមគ្នា:' : 'Device Sharing Conflict:'}</span>
                  </p>
                  <p className="text-[11px] text-amber-800">
                    {lang === 'km'
                      ? `ឧបករណ៍នេះត្រូវបានចុះឈ្មោះជាមួយបុគ្គលិក "${deviceSecurityAlert.conflictEmployeeName}" រួចហើយ។ មិនអនុញ្ញាតឱ្យបុគ្គលិកពីរនាក់ប្រើទូរស័ព្ទតែមួយដើម្បីស្កេនជំនួសគ្នាឡើយ។`
                      : `This device is already bound to "${deviceSecurityAlert.conflictEmployeeName}". Employees cannot share devices for proxy attendance.`}
                  </p>
                </div>
              )}
            </div>

            {/* Policy & Help note */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[11px] text-slate-600 text-left space-y-1">
              <span className="font-bold text-slate-800">
                {lang === 'km' ? '💡 តើត្រូវធ្វើដូចម្តេច ប្រសិនបើអ្នកទើបតែប្តូរទូរស័ព្ទ?' : '💡 What if you legitimately replaced your phone?'}
              </span>
              <p>
                {lang === 'km'
                  ? 'ប្រសិនបើអ្នកទើបតែទិញទូរស័ព្ទថ្មី ឬបាត់ទូរស័ព្ទចាស់ សូមទាក់ទងមក HR ឬ Admin ដើម្បីស្នើសុំដោះសោឧបករណ៍ (Reset Device Binding)។'
                  : 'If you have purchased a new phone or lost your previous device, please contact HR or Admin to reset your device binding.'}
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setDeviceSecurityAlert(null);
                  setIsCameraActive(true);
                }}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                {lang === 'km' ? 'យល់ព្រម និងបិទ (Acknowledge & Close)' : 'I Understand & Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CURRENT DEVICE HARDWARE DETAILS MODAL */}
      {/* ========================================================================= */}
      {showDeviceDetailsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4 animate-in zoom-in-95 duration-200 text-left">
            <button
              onClick={() => setShowDeviceDetailsModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 font-battambang">
                  {lang === 'km' ? 'ព័ត៌មានលម្អិតឧបករណ៍បច្ចុប្បន្ន' : 'Current Hardware Device Fingerprint'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'km' ? 'បច្ចេកវិទ្យាចាក់សោឧបករណ៍ ១ នាក់ = ១ ឧបករណ៍' : '1-Employee = 1-Device Binding Protection'}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-500 font-medium">{lang === 'km' ? 'ឈ្មោះឧបករណ៍ (Device Name):' : 'Device Model:'}</span>
                <p className="font-bold text-slate-800">{currentDevice.deviceName}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">{lang === 'km' ? 'ប្រព័ន្ធប្រតិបត្តិការ' : 'Platform'}</span>
                  <span className="font-bold text-slate-800 text-xs">{currentDevice.os}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">{lang === 'km' ? 'កម្មវិធី Browser' : 'Browser'}</span>
                  <span className="font-bold text-slate-800 text-xs">{currentDevice.browser}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-500 font-medium">{lang === 'km' ? 'កូដសម្គាល់ឧបករណ៍ (Device UUID):' : 'Hardware Fingerprint UUID:'}</span>
                <p className="font-mono text-indigo-700 font-bold text-[11px] break-all">{currentDevice.deviceId}</p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>{lang === 'km' ? 'ស្ថានភាពការពារ Fake Scanning:' : 'Anti-Proxy Security Status:'}</span>
                </div>
                <p className="text-[10px] text-emerald-800 leading-relaxed">
                  {lang === 'km'
                    ? 'ប្រព័ន្ធកំពុងដំណើរការចាក់សោឧបករណ៍ ១ នាក់ = ១ ឧបករណ៍។ បុគ្គលិកមិនអាចផ្ញើកូដឱ្យមិត្តភក្តិចុះឈ្មោះជំនួស ឬ Login លើទូរស័ព្ទអ្នកដទៃដើម្បីស្កេនជំនួសបានឡើយ។'
                    : 'System enforces 1-to-1 hardware binding. Staff cannot proxy scan or log in on a colleague\'s device to punch for them.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDeviceDetailsModal(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow transition cursor-pointer"
            >
              {lang === 'km' ? 'យល់ព្រម' : 'Done'}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ACCIDENTAL DOUBLE-PUNCH CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {doublePunchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200 font-hanuman">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base font-battambang">
                  {lang === 'km' ? '⚠️ ការពារការចុះវត្តមានស្ទួន' : '⚠️ Double-Punch Protection'}
                </h3>
                <p className="text-xs text-amber-700 font-medium">
                  {lang === 'km' ? 'ប្រព័ន្ធរកឃើញការស្កេនញឹកញាប់ក្នុងពេលខ្លី' : 'Rapid sequential punch detected'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
              <p className="leading-relaxed">
                {lang === 'km' ? (
                  <>
                    អ្នកទើបតែបាន <strong className="text-slate-900">{doublePunchModal.recentPunch.type === 'check_in' ? 'ចូលធ្វើការ (Check-In)' : 'ចេញពីធ្វើការ (Check-Out)'}</strong> កាលពី{' '}
                    <span className="font-bold text-indigo-600 font-mono">
                      {doublePunchModal.elapsedSeconds < 60
                        ? `${doublePunchModal.elapsedSeconds} វិនាទីមុន`
                        : `${Math.floor(doublePunchModal.elapsedSeconds / 60)} នាទីមុន`}
                    </span>{' '}
                    (ម៉ោង {new Date(doublePunchModal.recentPunch.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}) នៅសាខា <strong className="text-slate-900">{doublePunchModal.recentPunch.branchNameKh || doublePunchModal.recentPunch.branchNameEn}</strong>។
                  </>
                ) : (
                  <>
                    You just <strong className="text-slate-900">{doublePunchModal.recentPunch.type === 'check_in' ? 'Checked In' : 'Checked Out'}</strong> only{' '}
                    <span className="font-bold text-indigo-600 font-mono">
                      {doublePunchModal.elapsedSeconds < 60
                        ? `${doublePunchModal.elapsedSeconds}s ago`
                        : `${Math.floor(doublePunchModal.elapsedSeconds / 60)}m ago`}
                    </span>{' '}
                    (at {new Date(doublePunchModal.recentPunch.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}) at branch <strong className="text-slate-900">{doublePunchModal.recentPunch.branchNameEn}</strong>.
                  </>
                )}
              </p>
              <p className="text-slate-500 font-medium pt-2 border-t border-slate-200">
                {lang === 'km'
                  ? `តើអ្នកពិតជាចង់ ${doublePunchModal.targetType === 'check_in' ? 'ចុះវត្តមានចូលធ្វើការ (Check-In)' : 'ចុះវត្តមានចេញពីធ្វើការ (Check-Out)'} ឥឡូវនេះមែនទេ? ឬចុចច្រឡំស្កេន ២ ដង?`
                  : `Did you intend to ${doublePunchModal.targetType === 'check_in' ? 'Check In' : 'Check Out'} right now, or did you accidentally punch twice?`}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setDoublePunchModal(null);
                  isSubmittingRef.current = false;
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-200 transition flex items-center justify-center space-x-1.5 cursor-pointer order-1 sm:order-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{lang === 'km' ? 'រក្សាស្ថានភាពដដែល (បោះបង់)' : 'Keep Current (Cancel)'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const modalData = doublePunchModal;
                  setDoublePunchModal(null);
                  processAttendance(
                    modalData.emp,
                    modalData.branch,
                    modalData.method,
                    modalData.photoUrl,
                    modalData.targetType,
                    true // forceConfirm
                  );
                }}
                className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-300 flex items-center justify-center space-x-1.5 cursor-pointer order-2 sm:order-1"
              >
                <span>
                  {lang === 'km'
                    ? `បញ្ជាក់${doublePunchModal.targetType === 'check_in' ? 'ចូល' : 'ចេញ'}`
                    : `Confirm ${doublePunchModal.targetType === 'check_in' ? 'Check-In' : 'Check-Out'}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DUPLICATE PUNCH ALERT MODAL */}
      {/* ========================================================================= */}
      {duplicateAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200 font-hanuman">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base font-battambang">
                  {lang === 'km' ? '✅ បានកត់ត្រាវត្តមានរួចហើយ' : '✅ Already Recorded Today'}
                </h3>
                <p className="text-xs text-emerald-700 font-medium">
                  {lang === 'km' ? 'មិនចាំបាច់ស្កេនស្ទួនទៀតឡើយ' : 'No duplicate punch needed'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
              <p className="leading-relaxed">
                {lang === 'km' ? (
                  <>
                    អ្នកបានចុះវត្តមាន <strong>{duplicateAlertModal.type === 'check_in' ? 'ចូលធ្វើការ (Check-In)' : 'ចេញពីធ្វើការ (Check-Out)'}</strong> រួចរាល់ហើយនៅថ្ងៃនេះ វេលាម៉ោង{' '}
                    <span className="font-bold text-indigo-600 font-mono">
                      {new Date(duplicateAlertModal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>{' '}
                    នៅសាខា <strong>{duplicateAlertModal.branchName}</strong>។
                  </>
                ) : (
                  <>
                    You have already <strong>{duplicateAlertModal.type === 'check_in' ? 'Checked In' : 'Checked Out'}</strong> today at{' '}
                    <span className="font-bold text-indigo-600 font-mono">
                      {new Date(duplicateAlertModal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>{' '}
                    at branch <strong>{duplicateAlertModal.branchName}</strong>.
                  </>
                )}
              </p>
              <p className="text-slate-500 font-medium">
                {lang === 'km'
                  ? 'ទិន្នន័យវត្តមានរបស់អ្នកត្រូវបានរក្សាទុកដោយជោគជ័យក្នុងប្រព័ន្ធរួចរាល់ហើយ។'
                  : 'Your attendance record is already securely saved in the system.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setDuplicateAlertModal(null);
                isSubmittingRef.current = false;
              }}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-200 transition flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <span>{lang === 'km' ? 'យល់ព្រម (OK)' : 'Got It (OK)'}</span>
            </button>
          </div>
        </div>
      )}

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

              {/* Verified Device & Anti-Proxy Hardware Status */}
              <div className="p-3 rounded-xl border bg-indigo-50/70 border-indigo-200 text-indigo-950 text-[11px] flex items-center space-x-2.5">
                <Smartphone className="w-4 h-4 shrink-0 text-indigo-600" />
                <div className="leading-relaxed">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold">{lang === 'km' ? 'ឧបករណ៍ផ្ទៀងផ្ទាត់ (Verified Device):' : 'Verified Device:'}</span>
                    <span className="font-mono text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-[10px] font-bold">
                      {scanSuccessModalRecord.deviceName || currentDevice.deviceName}
                    </span>
                  </div>
                  <span className="text-indigo-600 block text-[10px] mt-0.5">
                    {lang === 'km' ? '🛡️ ចាក់សោសុវត្ថិភាពឧបករណ៍ ១ នាក់ = ១ ឧបករណ៍ (1-Device Lock)' : '🛡️ 1-Employee = 1-Device hardware lock verified'}
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

      {/* Device Anti-Fraud Protection Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/90 p-3 sm:px-4 rounded-2xl shadow-sm">
        <div className="flex items-center space-x-3">
          <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="font-bold text-slate-800 text-xs sm:text-sm font-battambang">
                {lang === 'km' ? 'ប្រព័ន្ធការពារ Fake Scanning & ចាក់សោឧបករណ៍:' : 'Anti-Proxy Device Lock:'}
              </span>
              <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-xs flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5" />
                <span>{currentDevice.deviceName}</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                1-Device Lock Active
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-hanuman">
              {lang === 'km' 
                ? 'ទប់ស្កាត់ការ Login លើទូរស័ព្ទអ្នកដទៃដើម្បីស្កេនជំនួស (១ នាក់ = ១ ឧបករណ៍ផ្ទាល់ខ្លួន)'
                : 'Account locked to physical hardware to prevent proxy scanning and device sharing.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowDeviceDetailsModal(true)}
          className="self-end sm:self-center px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition flex items-center space-x-1.5 cursor-pointer font-battambang shrink-0"
        >
          <Shield className="w-3.5 h-3.5 text-indigo-600" />
          <span>{lang === 'km' ? 'ព័ត៌មានឧបករណ៍' : 'Device Info'}</span>
        </button>
      </div>

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

          {/* Mode Switch Tabs - Direct GPS Punch first as staff mostly punch by GPS */}
          <div className="flex items-center bg-indigo-700/80 p-1 rounded-xl border border-indigo-500/40 self-start md:self-auto text-xs font-hanuman">
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
              <span>{lang === 'km' ? 'ស្កេនតាម GPS (ចម្បង)' : 'Direct GPS Punch'}</span>
            </button>
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
                  {scanMode === 'mobile_punch' ? <Smartphone className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm font-battambang">
                    {scanMode === 'mobile_punch'
                      ? (lang === 'km' ? '១. ចុះវត្តមានតាម GPS ជាក់ស្តែង' : '1. Direct Real-Time GPS Punch')
                      : (lang === 'km' ? '១. ដំណើរការស្កេនវត្តមាន' : '1. Attendance Verification')}
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

                {/* Real-time Shift & Attendance State for Today */}
                <div className="p-3.5 rounded-xl border bg-white shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{lang === 'km' ? 'ស្ថានភាពវត្តមានថ្ងៃនេះ' : "Today's Attendance Status"}</span>
                    </span>
                    {hasCheckedInToday && !hasCheckedOutToday && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {lang === 'km' ? 'កំពុងបំពេញការងារ (Checked In)' : 'Working On-Duty'}
                      </span>
                    )}
                    {hasCheckedInToday && hasCheckedOutToday && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <CheckCircle2 className="w-3 h-3 text-blue-600" />
                        {lang === 'km' ? 'បានបញ្ចប់វេនថ្ងៃនេះ' : 'Shift Completed Today'}
                      </span>
                    )}
                    {!hasCheckedInToday && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        {lang === 'km' ? 'មិនទាន់ចូលធ្វើការ' : 'Not Checked In Yet'}
                      </span>
                    )}
                  </div>

                  {/* Detailed Punch Timestamps for Today */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                        {lang === 'km' ? 'ម៉ោងចូល (Check-In)' : 'Check-In Time'}
                      </span>
                      <span className="font-bold text-slate-800 font-mono text-xs sm:text-sm">
                        {checkInRecordToday 
                          ? new Date(checkInRecordToday.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                          : '--:--'}
                      </span>
                      {checkInRecordToday && (
                        <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium truncate">
                          ✓ {checkInRecordToday.branchNameKh || checkInRecordToday.branchNameEn}
                        </span>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                        {lang === 'km' ? 'ម៉ោងចេញ (Check-Out)' : 'Check-Out Time'}
                      </span>
                      <span className="font-bold text-slate-800 font-mono text-xs sm:text-sm">
                        {checkOutRecordToday 
                          ? new Date(checkOutRecordToday.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                          : '--:--'}
                      </span>
                      {checkOutRecordToday && (
                        <span className="text-[10px] text-blue-600 block mt-0.5 font-medium truncate">
                          ✓ {checkOutRecordToday.branchNameKh || checkOutRecordToday.branchNameEn}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Active Anti-Double Punch Safeguard Banner if recently checked in */}
                  {hasCheckedInToday && !hasCheckedOutToday && isCooldownActive && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">
                          {lang === 'km' ? '🛡️ ប្រព័ន្ធការពារការចុះវត្តមានស្ទួនកំពុងសកម្ម' : '🛡️ Anti-Double Punch Active'}
                        </p>
                        <p className="text-amber-700 mt-0.5">
                          {lang === 'km'
                            ? `អ្នកទើបតែបានចូលធ្វើការ ${elapsedSecondsSinceLastPunch < 60 ? `${elapsedSecondsSinceLastPunch} វិនាទី` : `${Math.floor(elapsedSecondsSinceLastPunch / 60)} នាទី`} មុន។ ប្រព័ន្ធនឹងសួរផ្ទៀងផ្ទាត់បញ្ជាក់ដើម្បីការពារកុំឱ្យចុះវត្តមានចេញដោយច្រឡំ។`
                            : `You checked in ${elapsedSecondsSinceLastPunch < 60 ? `${elapsedSecondsSinceLastPunch}s ago` : `${Math.floor(elapsedSecondsSinceLastPunch / 60)}m ago`}. A confirmation prompt will guard against accidental checkout.`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Instant Punch Action Button */}
                <button
                  id="instant-punch-submit-btn"
                  onClick={() => processAttendance(selectedEmp, selectedBranch, 'qr_mobile', selectedEmp.avatar, attendanceType)}
                  disabled={isProcessing}
                  className={`w-full py-4 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer ${
                    !isWithinGeofence
                      ? 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                      : attendanceType === 'check_in'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
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
                            ? attendanceType === 'check_in'
                              ? '🟢 បញ្ជាក់វត្តមានចូលធ្វើការ (Punch Check-In) តាម GPS ផ្ទាល់'
                              : '🔴 បញ្ជាក់វត្តមានចេញពីធ្វើការ (Punch Check-Out) តាម GPS ផ្ទាល់'
                            : attendanceType === 'check_in'
                            ? '🟢 Execute Check-In with Live GPS'
                            : '🔴 Execute Check-Out with Live GPS'
                          : lang === 'km'
                            ? `⚠️ ទីតាំងនៅឆ្ងាយ (${formatDistance(distanceToBranch, lang)}) - មិនទាន់ដល់សាខា`
                            : `⚠️ Out of Geofence Range (${formatDistance(distanceToBranch, lang)})`}
                      </span>
                    </>
                  )}
                </button>

                {/* Quick Toggle Link for Attendance Type */}
                <div className="text-center pt-0.5">
                  <button
                    type="button"
                    onClick={() => setAttendanceType(attendanceType === 'check_in' ? 'check_out' : 'check_in')}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline decoration-indigo-300 underline-offset-2 transition"
                  >
                    {lang === 'km'
                      ? `ចង់ប្តូរទៅចុះវត្តមាន ${attendanceType === 'check_in' ? 'ចេញពីធ្វើការ (Check-Out)' : 'ចូលធ្វើការ (Check-In)'} ដោយដៃ? ចុចទីនេះ`
                      : `Switch manually to ${attendanceType === 'check_in' ? 'Check-Out' : 'Check-In'}`}
                  </button>
                </div>
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
