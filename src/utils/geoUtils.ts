/**
 * Calculate the great-circle distance between two points in meters using the Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Generate a dynamic rolling QR token for a branch kiosk
 * Changes every 20 seconds to prevent screenshots & remote buddy-punching
 */
export function generateBranchDynamicQrToken(branchId: string): {
  payload: string;
  expiresInSeconds: number;
  timeWindow: number;
} {
  const windowDuration = 20; // 20 seconds rotation
  const now = Math.floor(Date.now() / 1000);
  const timeWindow = Math.floor(now / windowDuration);
  const expiresInSeconds = windowDuration - (now % windowDuration);

  // Pseudo-crypto token signature
  const salt = 'ATTEND_SECURE_GEOFENCE_KH';
  const rawHash = `${branchId}_${timeWindow}_${salt}`;
  let hashNum = 0;
  for (let i = 0; i < rawHash.length; i++) {
    hashNum = (hashNum << 5) - hashNum + rawHash.charCodeAt(i);
    hashNum |= 0;
  }
  const token = Math.abs(hashNum).toString(36).toUpperCase().padStart(8, '0');

  const payload = JSON.stringify({
    type: 'BRANCH_DYNAMIC_QR',
    bid: branchId,
    t: timeWindow,
    sig: token,
    iat: now,
  });

  return { payload, expiresInSeconds, timeWindow };
}

/**
 * Verify a scanned QR payload against the expected branch token window (allows +- 1 window for slight clock drift)
 */
export function verifyBranchDynamicQrToken(
  scannedPayload: string,
  targetBranchId?: string
): { isValid: boolean; branchId?: string; error?: string } {
  try {
    const data = JSON.parse(scannedPayload);
    if (data.type !== 'BRANCH_DYNAMIC_QR') {
      // Check if it's a static branch QR or employee badge
      if (data.type === 'EMPLOYEE_BADGE') {
        return { isValid: true, branchId: data.empId };
      }
      return { isValid: false, error: 'ទម្រង់ QR Code មិនត្រឹមត្រូវ (Invalid QR format)' };
    }

    if (targetBranchId && data.bid !== targetBranchId) {
      return {
        isValid: false,
        branchId: data.bid,
        error: 'QR Code នេះជារបស់សាខាផ្សេង (QR is for another branch)',
      };
    }

    const windowDuration = 20;
    const now = Math.floor(Date.now() / 1000);
    const currentWindow = Math.floor(now / windowDuration);

    // Allow current window or previous window (1 window tolerance)
    if (Math.abs(data.t - currentWindow) > 1) {
      return {
        isValid: false,
        branchId: data.bid,
        error: 'QR Code នេះផុតកំណត់ហើយ សូមស្កេន QR ថ្មីលើអេក្រង់ Kiosk (QR code has expired)',
      };
    }

    return { isValid: true, branchId: data.bid };
  } catch {
    return { isValid: false, error: 'មិនអាចអានទិន្នន័យ QR Code បានទេ (Could not parse QR)' };
  }
}

/**
 * Format distance in a human readable way (e.g. "15m", "1.2 km")
 */
export function formatDistance(meters: number, lang: 'km' | 'en' = 'km'): string {
  if (meters < 1000) {
    return `${meters} ${lang === 'km' ? 'ម៉ែត្រ' : 'm'}`;
  }
  const km = (meters / 1000).toFixed(1);
  return `${km} ${lang === 'km' ? 'គ.ម' : 'km'}`;
}

/**
 * Khmer numeral converter for authentic look
 */
export function toKhmerNumeral(num: number | string): string {
  const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  return String(num).replace(/[0-9]/g, (w) => khmerDigits[parseInt(w, 10)]);
}
