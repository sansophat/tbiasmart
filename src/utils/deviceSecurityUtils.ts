/**
 * Device Security & Hardware-bound Fingerprint Utility
 * 
 * Provides robust protection against:
 * 1. Proxy attendance / Buddy punching (logging in on someone else's phone to punch for them)
 * 2. Multi-device account swapping
 * 3. Device sharing across different staff members
 * 
 * Generates a persistent hardware/browser fingerprint (UUID + platform signature)
 * and enforces strict 1-Employee = 1-Device binding.
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
}

const STORAGE_KEY_DEVICE_ID = 'ams_trusted_device_uuid_v2';
const STORAGE_KEY_DEVICE_NAME = 'ams_trusted_device_name_v2';

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

  // 2. Retrieve or create persistent Device UUID
  let deviceId = '';
  try {
    deviceId = localStorage.getItem(STORAGE_KEY_DEVICE_ID) || '';
  } catch (e) {
    // localStorage might be restricted
  }

  if (!deviceId) {
    // Generate fresh persistent UUID with entropy
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const timeStr = Date.now().toString(36);
    deviceId = `dev_${isMobile ? 'mob' : 'desk'}_${timeStr}_${randomHex}`;
    try {
      localStorage.setItem(STORAGE_KEY_DEVICE_ID, deviceId);
    } catch (e) {
      // ignore
    }
  }

  // 3. User-friendly Device Name
  let deviceName = '';
  try {
    deviceName = localStorage.getItem(STORAGE_KEY_DEVICE_NAME) || '';
  } catch (e) {
    // ignore
  }

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
    try {
      localStorage.setItem(STORAGE_KEY_DEVICE_NAME, deviceName);
    } catch (e) {
      // ignore
    }
  }

  // Generate lightweight canvas/hardware fingerprint hash
  let fingerprintHash = 'fp_' + deviceId.slice(-8);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 30;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('AMS_SEC_2026', 2, 2);
      const dataUri = canvas.toDataURL();
      let simpleHash = 0;
      for (let i = 0; i < dataUri.length; i++) {
        simpleHash = ((simpleHash << 5) - simpleHash) + dataUri.charCodeAt(i);
        simpleHash |= 0;
      }
      fingerprintHash = `fp_${Math.abs(simpleHash).toString(36)}`;
    }
  } catch (e) {
    // fallback
  }

  return {
    deviceId,
    deviceName,
    platform: isMobile ? 'Mobile' : 'Desktop/Laptop',
    isMobile,
    os,
    browser,
    screenSummary,
    fingerprintHash,
  };
}

export interface DeviceValidationResult {
  allowed: boolean;
  isFirstTimeEnrollment: boolean;
  isMismatch: boolean;
  isDeviceConflict: boolean;
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
        (e) => e.id !== employee.id && e.trustedDeviceId === currentDevice.deviceId
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

  // 2. Employee has a bound device: Compare fingerprints
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

  // 3. Mismatch detected! (Employee is logging in on another device or friend's device)
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
  deviceName: string
): Employee {
  return {
    ...employee,
    trustedDeviceId: deviceId,
    trustedDeviceName: deviceName,
    trustedDeviceBoundAt: new Date().toISOString(),
    deviceBindingLocked: true,
  };
}

/**
 * Admin action: Reset / Unbind employee device (e.g. employee bought new phone or lost old phone)
 */
export function unbindEmployeeDevice(employee: Employee): Employee {
  const updated = { ...employee };
  delete updated.trustedDeviceId;
  delete updated.trustedDeviceName;
  delete updated.trustedDeviceBoundAt;
  updated.deviceBindingLocked = false;
  return updated;
}
