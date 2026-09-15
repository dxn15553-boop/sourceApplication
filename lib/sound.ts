// Web Audio API notification sound generator
// Zero external audio files, works instantly in all modern browsers

let audioCtx: AudioContext | null = null;
let audioUnlocked = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }

  // If context is suspended (browser autoplay policy), resume on user interaction
  if (audioCtx && audioCtx.state === 'suspended' && !audioUnlocked) {
    const unlock = () => {
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
          audioUnlocked = true;
        }).catch(() => {});
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  return audioCtx;
}

export const SOUND_STORAGE_KEY = 'notification_sound_enabled';

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(SOUND_STORAGE_KEY) !== 'false';
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_STORAGE_KEY, enabled ? 'true' : 'false');
}

/**
 * Synthesizes a crisp, elegant two-tone chime (D5 -> A5)
 * Pleasant and non-intrusive for enterprise office environments.
 */
export function playNotificationChime(forcePlay: boolean = false): void {
  if (typeof window === 'undefined') return;
  if (!forcePlay && !isSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Master volume gain node (soft and pleasant)
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.2, now);
    masterGain.connect(ctx.destination);

    // Note 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.8, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(masterGain);

    osc1.start(now);
    osc1.stop(now + 0.36);

    // Note 2: A5 (880.00 Hz) - starts shortly after Note 1
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.9, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc2.connect(gain2);
    gain2.connect(masterGain);

    osc2.start(now + 0.12);
    osc2.stop(now + 0.66);
  } catch (err) {
    console.warn('Unable to play notification chime:', err);
  }
}
