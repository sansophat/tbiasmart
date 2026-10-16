/**
 * Web Audio API synthesizer for instant in-app alerts and notifications
 * Zero external asset dependencies, works offline and on all mobile/desktop browsers.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export type AlertSoundType = 'leave' | 'punch' | 'approval' | 'rejection' | 'alert' | 'security_alert';

export function playAlertChime(type: AlertSoundType = 'alert'): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'security_alert') {
      // Authoritative security alarm tone (triple pulse warning)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.setValueAtTime(880, now + 0.1);
      osc.frequency.setValueAtTime(440, now + 0.2);
      osc.frequency.setValueAtTime(880, now + 0.3);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.start(now);
      osc.stop(now + 0.55);
    } else if (type === 'leave') {
      // Pleasant double-tone notification ding (520Hz -> 780Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'approval') {
      // Ascending triumphant chime (587Hz -> 880Hz)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.18); // A5
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === 'rejection') {
      // Gentle warning double blip
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(329.63, now); // E4
      osc.frequency.exponentialRampToValueAtTime(261.63, now + 0.25); // C4
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'punch') {
      // Crisp subtle punch blip (800Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else {
      // Default alert chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch {
    // Graceful fallback if autoplay restrictions apply
  }
}

/**
 * Plays a loud, unmistakable multi-pulse ringing alarm on a staff device
 * when they forget to Check-In / Check-Out or when Admin rings their device.
 * Also vibrates mobile devices if supported.
 */
export function playReminderRingtone(bursts: number = 3): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([450, 150, 450, 150, 650, 250, 450]);
    }
  } catch {
    // Ignore vibration errors
  }

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const playRingTone = (freq: number, startTime: number, duration: number, gainVal = 0.28) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.02);
    };

    // Multi-burst phone/alarm ring pattern (A5 <-> D6 rapid trills per burst)
    for (let b = 0; b < bursts; b++) {
      const offset = b * 0.85;
      playRingTone(880, now + offset, 0.11, 0.28);
      playRingTone(1174.66, now + offset + 0.11, 0.11, 0.28);
      playRingTone(880, now + offset + 0.22, 0.11, 0.28);
      playRingTone(1174.66, now + offset + 0.33, 0.18, 0.3);
      playRingTone(1318.51, now + offset + 0.52, 0.22, 0.28);
    }
  } catch {
    // Graceful fallback if autoplay restrictions apply
  }
}

/**
 * Fires a native browser/OS notification on the staff member's device if permitted.
 */
export function triggerBrowserReminderNotification(title: string, body: string): void {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'tbia-attendance-reminder',
        requireInteraction: true,
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission()
        .then((perm) => {
          if (perm === 'granted') {
            new Notification(title, {
              body,
              icon: '/favicon.ico',
              tag: 'tbia-attendance-reminder',
              requireInteraction: true,
            });
          }
        })
        .catch(() => {});
    }
  } catch {
    // Ignore notification errors
  }
}

