/**
 * Device Security & Hardware-bound Fingerprint Utility
 * 
 * Provides robust protection against:
 * 1. Proxy attendance / Buddy punching (logging in on someone else's phone to punch for them)
 * 2. Multi-device account swapping
 * 3. Device sharing across different staff members
 * 
 * Uses Multi-Layer Storage Persistence (LocalStorage + Long-Lived Cookies + SessionStorage)
 * combined with Deterministic Hardware Signature Analysis (Screen, Canvas, WebGL, Platform)
 * to prevent false lockouts when iOS Safari or in-app browsers evict local cache.
 */

import { Employee, SystemSettings } from '../types';

export interface DeviceFingerprint {
  deviceId: string;
  deviceName: string;
  platform: string;
  isMobile: boolean;
  os: string;
  browser: string;
  screenSummary: string;
  fingerprintHash: string;
  hardwareSignature: string;
}

const STORAGE_KEY_DEVICE_ID = 'ams_trusted_device_uuid_v2';
const STORAGE_KEY_DEVICE_NAME = 'ams_trusted_device_name_v2';
const STORAGE_KEY_DEVICE_HW = 'ams_trusted_device_hw_sig_v2';

/**
 * Multi-layer persistent storage helper (LocalStorage + Cookie + SessionStorage)
 * Survives Safari tab resets, private browsing closures, and in-app webview switches.
 */
function getPersistentStorageValue(key: string): string {
  if (typeof window === 'undefined') return '';

  // 1. Try localStorage
  try {
    const val = localStorage.getItem(key);
    if (val && val.trim()) return val.trim();
  } catch (e) {}

  // 2. Try Cookie (persists across Safari session resets & tab closures)
  try {
    const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + key + '=([^;]*)'));
    if (match && match[1]) {
      const decoded = decodeURIComponent(match[1]).trim();
      if (decoded) {
        // Self-heal localStorage
        try { localStorage.setItem(key, decoded); } catch (_) {}
        return decoded;
      }
    }
  } catch (e) {}

  // 3. Try sessionStorage
  try {
    const val = sessionStorage.getItem(key);
    if (val && val.trim()) {
      try { localStorage.setItem(key, val.trim()); } catch (_) {}
      return val.trim();
    }
  } catch (e) {}

  return '';
}

function setPersistentStorageValue(key: string, value: string): void {
  if (typeof window === 'undefined' || !value) return;

  // 1. Write localStorage
  try {
    localStorage.setItem(key, value);
  } catch (e) {}

  // 2. Write document.cookie with 10 years max-age
  try {
    document.cookie = `${key}=${encodeURIComponent(value)}; max-age=315360000; path=/; SameSite=Lax`;
  } catch (e) {}

  // 3. Write sessionStorage
  try {
    sessionStorage.setItem(key, value);
  } catch (e) {}
}

/**
 * 32-bit FNV-1a / polynomial string hash
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generates a deterministic Hardware Signature based on physical device characteristics
 * (Screen resolution, pixel ratio, platform, CPU cores, WebGL GPU, Canvas 2D fingerprint, Timezone).
 * This signature is CONSTANT across sessions, private mode, and browser resets.
 */
function getHardwareFingerprintHash(os: string, browser: string, screenSummary: string): { canvasHash: string; hardwareSignature: string } {
  let canvasHash = 'cv_default';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial, sans-serif';
      ctx.fillStyle = '#4f46e5';
      ctx.fillRect(0, 0, 160, 40);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('TBIA_SMART_2026', 4, 12);
      ctx.fillStyle = '#10b981';
      ctx.arc(140, 20, 10, 0, Math.PI * 2);
      ctx.fill();
      canvasHash = `cv_${hashString(canvas.toDataURL())}`;
    }
  } catch (e) {}

  let webGlRenderer = '';
  try {
    const glCanvas = document.createElement('canvas');
    const gl = glCanvas.getContext('webgl') || glCanvas.getContext('experimental-webgl');
    if (gl) {
      const dbg = (gl as any).getExtension('WEBGL_debug_renderer_info');
      if (dbg) {
        webGlRenderer = (gl as any).getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '';
      }
    }
  } catch (e) {}

  const nav = typeof navigator !== 'undefined' ? navigator : ({} as any);
  const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || '' : '';
  const components = [
    os,
    browser,
    screenSummary,
    nav.platform || '',
    nav.maxTouchPoints || 0,
    nav.hardwareConcurrency || 0,
    tz,
    webGlRenderer,
    canvasHash,
  ];

  const hardwareSignature = `hw_${hashString(components.join('~'))}`;
  return { canvasHash, hardwareSignature };
}

/**
 * Generate a deterministic or persistent unique device identifier
 */
export function getDeviceFingerprint(): DeviceFingerprint {
  if (typeof window === 'undefined') {
    return {
      deviceId: 'dev_server_fallback',
      deviceName: 'System Server',
      platform: 'Server',
      isMobile: false,
      os: 'Unknown',
      browser: 'Unknown',
      screenSummary: '1920x1080',
      fingerprintHash: 'hash_server',
      hardwareSignature: 'hw_server_default',
    };
  }

  // 1. Detect platform, OS, and browser from userAgent & client characteristics
  const ua = navigator.userAgent || '';
  let os = 'Unknown OS';
  let isMobile = false;

  if (/iPhone/i.test(ua)) {
    os = 'Apple iPhone (iOS)';
    isMobile = true;
  } else if (/iPad/i.test(ua)) {
    os = 'Apple iPad (iPadOS)';
    isMobile = true;
  } else if (/Android/i.test(ua)) {
    os = 'Android Device';
    isMobile = true;
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'Apple macOS';
    isMobile = false;
  } else if (/Windows NT/i.test(ua)) {
    os = 'Microsoft Windows';
    isMobile = false;
  } else if (/Linux/i.test(ua)) {
    os = 'Linux PC';
    isMobile = false;
  }

  let browser = 'Browser';
  if (/Edg\//i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) {
    browser = 'Google Chrome';
  } else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    browser = 'Apple Safari';
  } else if (/Firefox\//i.test(ua)) {
    browser = 'Mozilla Firefox';
  }

  const screenSummary = `${window.screen?.width || 0}x${window.screen?.height || 0} (${window.devicePixelRatio || 1}x)`;
  const { canvasHash, hardwareSignature } = getHardwareFingerprintHash(os, browser, screenSummary);

  // 2. Retrieve or create multi-layer persistent Device UUID
  let deviceId = getPersistentStorageValue(STORAGE_KEY_DEVICE_ID);

  if (!deviceId) {
    // Generate fresh persistent UUID with hardware signature seed
    const randomHex = typeof crypto !== 'undefined' && crypto.getRandomValues
      ? Array.from(crypto.getRandomValues(new Uint8Array(6))).map((b) => b.toString(16).padStart(2, '0')).join('')
      : Math.random().toString(36).slice(2, 10);
    
    // Stable device ID incorporating hardware signature
    deviceId = `dev_${isMobile ? 'mob' : 'desk'}_${hardwareSignature}_${randomHex}`;
    setPersistentStorageValue(STORAGE_KEY_DEVICE_ID, deviceId);
    setPersistentStorageValue(STORAGE_KEY_DEVICE_HW, hardwareSignature);
  }

  // 3. User-friendly Device Name
  let deviceName = getPersistentStorageValue(STORAGE_KEY_DEVICE_NAME);

  if (!deviceName) {
    if (isMobile) {
      if (/iPhone/i.test(ua)) {
        deviceName = `iPhone (${browser})`;
      } else if (/iPad/i.test(ua)) {
        deviceName = `iPad (${browser})`;
      } else {
        deviceName = `Android Phone (${browser})`;
      }
    } else {
      deviceName = `${os} (${browser})`;
    }
    setPersistentStorageValue(STORAGE_KEY_DEVICE_NAME, deviceName);
  }

  return {
    deviceId,
    deviceName,
    platform: isMobile ? 'Mobile' : 'Desktop/Laptop',
    isMobile,
    os,
    browser,
    screenSummary,
    fingerprintHash: canvasHash,
    hardwareSignature,
  };
}

export interface DeviceValidationResult {
  allowed: boolean;
  isFirstTimeEnrollment: boolean;
  isMismatch: boolean;
  isDeviceConflict: boolean;
  isReconnectedSameDevice?: boolean;
  trustedDeviceName?: string;
  trustedDeviceId?: string;
  currentDeviceName: string;
  currentDeviceId: string;
  reason?: string;
  reasonKh?: string;
  conflictEmployeeName?: string;
}

/**
 * Validates whether the current physical device is authorized to scan attendance for the specified employee.
 * Features Smart Self-Healing for legit employees when browser cache/localStorage is wiped by Safari.
 */
export function validateEmployeeDevice(
  employee: Employee,
  currentDevice: DeviceFingerprint,
  settings?: SystemSettings,
  allEmployees: Employee[] = []
): DeviceValidationResult {
  // If strict device binding is explicitly disabled by admin, allow all devices
  if (settings && settings.strictDeviceBinding === false) {
    return {
      allowed: true,
      isFirstTimeEnrollment: false,
      isMismatch: false,
      isDeviceConflict: false,
      currentDeviceName: currentDevice.deviceName,
      currentDeviceId: currentDevice.deviceId,
    };
  }

  // 1. Check if employee already has a bound device
  if (!employee.trustedDeviceId) {
    // If setting preventDeviceSharing is ON, verify no OTHER employee is already bound to this device
    if (settings?.preventDeviceSharing !== false) {
      const otherBoundEmp = allEmployees.find(
        (e) =>
          e.id !== employee.id &&
          !!e.trustedDeviceId &&
          e.trustedDeviceId.trim() !== '' &&
          (e.trustedDeviceId === currentDevice.deviceId ||
            (e.trustedDeviceSignature && e.trustedDeviceSignature === currentDevice.hardwareSignature))
      );

      if (otherBoundEmp) {
        return {
          allowed: false,
          isFirstTimeEnrollment: true,
          isMismatch: false,
          isDeviceConflict: true,
          conflictEmployeeName: otherBoundEmp.nameKh || otherBoundEmp.nameEn,
          currentDeviceName: currentDevice.deviceName,
          currentDeviceId: currentDevice.deviceId,
          reason: `Device already bound to ${otherBoundEmp.nameEn} (${otherBoundEmp.code}). Multiple users cannot share one personal device for attendance.`,
          reasonKh: `ឧបករណ៍នេះត្រូវបានភ្ជាប់ជាមួយគណនី ${otherBoundEmp.nameKh} (${otherBoundEmp.code}) រួចហើយ! មិនអនុញ្ញាតឱ្យប្រើឧបករណ៍រួមគ្នាដើម្បីស្កេនជំនួសឡើយ។`,
        };
      }
    }

    // First time enrollment allowed
    return {
      allowed: true,
      isFirstTimeEnrollment: true,
      isMismatch: false,
      isDeviceConflict: false,
      currentDeviceName: currentDevice.deviceName,
      currentDeviceId: currentDevice.deviceId,
    };
  }

  // 2. Direct Match: Exact deviceId match
  if (employee.trustedDeviceId === currentDevice.deviceId) {
    return {
      allowed: true,
      isFirstTimeEnrollment: false,
      isMismatch: false,
      isDeviceConflict: false,
      trustedDeviceId: employee.trustedDeviceId,
      trustedDeviceName: employee.trustedDeviceName,
      currentDeviceName: currentDevice.deviceName,
      currentDeviceId: currentDevice.deviceId,
    };
  }

  // 3. Smart Self-Healing Hardware Match:
  // If localStorage/cookie was wiped by iOS Safari or opened in Telegram/Messenger in-app browser,
  // but the physical device hardware signature and deviceName match the employee's registered device,
  // AND this physical device is not claimed by another employee (anti-buddy punching preserved):
  const otherBoundEmp = allEmployees.find(
    (e) =>
      e.id !== employee.id &&
      !!e.trustedDeviceId &&
      e.trustedDeviceId.trim() !== '' &&
      (e.trustedDeviceId === currentDevice.deviceId ||
        (e.trustedDeviceSignature && e.trustedDeviceSignature === currentDevice.hardwareSignature))
  );

  const isSameHardware =
    !otherBoundEmp &&
    ((employee.trustedDeviceSignature && employee.trustedDeviceSignature === currentDevice.hardwareSignature) ||
      (employee.trustedDeviceName === currentDevice.deviceName &&
        (employee.trustedDeviceId.includes(currentDevice.hardwareSignature) ||
          currentDevice.deviceId.includes(employee.trustedDeviceSignature || 'xyz_none'))));

  if (isSameHardware) {
    // Legitimate same hardware phone -> Allow and self-heal binding
    return {
      allowed: true,
      isFirstTimeEnrollment: false,
      isMismatch: false,
      isDeviceConflict: false,
      isReconnectedSameDevice: true,
      trustedDeviceId: employee.trustedDeviceId,
      trustedDeviceName: employee.trustedDeviceName,
      currentDeviceName: currentDevice.deviceName,
      currentDeviceId: currentDevice.deviceId,
    };
  }

  // 4. Mismatch detected! (Employee is logging in on another device or friend's device)
  return {
    allowed: false,
    isFirstTimeEnrollment: false,
    isMismatch: true,
    isDeviceConflict: false,
    trustedDeviceId: employee.trustedDeviceId,
    trustedDeviceName: employee.trustedDeviceName || 'Authorized Phone',
    currentDeviceName: currentDevice.deviceName,
    currentDeviceId: currentDevice.deviceId,
    reason: `Unauthorized Device Detected. Your account is bound to "${employee.trustedDeviceName || 'Registered Device'}". Scanning attendance from another phone/device is blocked to prevent proxy attendance.`,
    reasonKh: `រកឃើញឧបករណ៍មិនត្រូវគ្នា (Unauthorized Device)! គណនីរបស់អ្នកត្រូវបានចាក់សោភ្ជាប់ជាមួយ "${employee.trustedDeviceName || 'ទូរស័ព្ទដើម'}" រួចហើយ។ ការស្កេនពីឧបករណ៍ផ្សេងត្រូវបានបដិសេធដាច់ខាត ដើម្បីការពារការស្កេនជំនួស (Anti-Proxy Scan)។`,
  };
}

/**
 * Bind the employee's account to the current hardware device
 */
export function bindEmployeeToCurrentDevice(
  employee: Employee,
  deviceId: string,
  deviceName: string,
  hardwareSignature?: string
): Employee {
  return {
    ...employee,
    trustedDeviceId: deviceId,
    trustedDeviceName: deviceName,
    trustedDeviceSignature: hardwareSignature,
    trustedDeviceBoundAt: new Date().toISOString(),
    deviceBindingLocked: true,
  };
}

/**
 * Admin action: Reset / Unbind employee device (e.g. employee bought new phone or lost old phone)
 */
export function unbindEmployeeDevice(employee: Employee): Employee {
  return {
    ...employee,
    trustedDeviceId: '',
    trustedDeviceName: '',
    trustedDeviceSignature: '',
    trustedDeviceBoundAt: '',
    deviceBindingLocked: false,
  };
}
