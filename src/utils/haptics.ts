/**
 * Haptic & Sensory Feedback Utilities for Mobile & Desktop
 * Provides tactile vibration feedback on supported devices and subtle synthetic audio cues.
 */

export type HapticType = 'success' | 'light' | 'medium' | 'heavy' | 'selection' | 'warning' | 'error';

/**
 * Triggers haptic vibration feedback using the Web Vibration API.
 */
export function triggerHaptic(type: HapticType = 'success'): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      switch (type) {
        case 'success':
          // Crisp, rewarding double-tap vibration pattern
          return navigator.vibrate([35, 45, 65]);
        case 'light':
          return navigator.vibrate(15);
        case 'medium':
          return navigator.vibrate(35);
        case 'heavy':
          return navigator.vibrate(70);
        case 'selection':
          return navigator.vibrate([15, 20]);
        case 'warning':
          return navigator.vibrate([60, 40, 60]);
        case 'error':
          return navigator.vibrate([80, 60, 100, 60, 120]);
        default:
          return navigator.vibrate(30);
      }
    }
  } catch (err) {
    // Gracefully ignore vibration errors on unsupported platforms
    console.debug('Haptic feedback not available:', err);
  }
  return false;
}

/**
 * Synthesizes a subtle, pleasant acoustic chime for task completions
 * using the browser's native Web Audio API (no external MP3 asset needed).
 */
export function playCompletionSound(): void {
  if (typeof window === 'undefined') return;

  // Check user preference in settings
  const soundEnabled = localStorage.getItem('mcm_setting_sound') !== 'false';
  if (!soundEnabled) return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    // High note 1 (D5 ~587.33Hz) -> High note 2 (A5 ~880Hz)
    const now = ctx.currentTime;
    
    // Master gain node
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    gainNode.connect(ctx.destination);

    // Oscillator 1
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.12); // A5
    osc1.connect(gainNode);

    // Oscillator 2 (warm overtone)
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1174.66, now); // D6
    osc2.frequency.exponentialRampToValueAtTime(1760.00, now + 0.12); // A6
    osc2.connect(gainNode);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 450);
  } catch (err) {
    console.debug('Audio feedback not played:', err);
  }
}

/**
 * Combined tactile and visual sensory trigger for task completion
 */
export function triggerCompletionFeedback(): void {
  triggerHaptic('success');
  playCompletionSound();
}
