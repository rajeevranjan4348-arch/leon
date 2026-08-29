// Procedural audio synthesizer using Web Audio API for call & messaging sounds + Mobile Haptics & Vibration

let audioCtx: AudioContext | null = null;
let ringtoneInterval: any = null;
let dialToneInterval: any = null;
let vibrateInterval: any = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Trigger mobile vibration pattern (haptic feedback)
 */
export function triggerHapticVibrate(pattern: number | number[] = [100]) {
  try {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignore unsupported vibration
  }
}

/**
 * Play a gentle musical chord for incoming call ringtone + Mobile Vibration
 */
export function startIncomingRingtone() {
  stopRingtone();

  // Mobile vibration loop
  triggerHapticVibrate([400, 200, 400, 200, 800]);
  vibrateInterval = setInterval(() => {
    triggerHapticVibrate([400, 200, 400, 200, 800]);
  }, 2500);

  try {
    const ctx = getAudioContext();
    const playChord = () => {
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);

        gain.gain.setValueAtTime(0, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.12, now + i * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.65);
      });
    };

    playChord();
    ringtoneInterval = setInterval(playChord, 2200);
  } catch (e) {
    console.warn('Ringtone error:', e);
  }
}

/**
 * Play outgoing ringing dial tone (calling sound)
 */
export function startOutgoingDialTone() {
  stopRingtone();
  try {
    const ctx = getAudioContext();
    const playTone = () => {
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.setValueAtTime(440, now); // A4
      osc2.frequency.setValueAtTime(480, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.setValueAtTime(0.08, now + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.3);
      osc2.stop(now + 1.3);
    };

    playTone();
    dialToneInterval = setInterval(playTone, 3000);
  } catch (e) {
    console.warn('Dial tone error:', e);
  }
}

/**
 * Stop all active ringtones, dial tones & vibrations
 */
export function stopRingtone() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (dialToneInterval) {
    clearInterval(dialToneInterval);
    dialToneInterval = null;
  }
  if (vibrateInterval) {
    clearInterval(vibrateInterval);
    vibrateInterval = null;
  }
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(0);
  }
}

/**
 * Play call connected confirmation chime
 */
export function playCallConnectedSound() {
  triggerHapticVibrate([80, 50, 120]);
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.4);
    });
  } catch (e) {
    console.warn('Call connected sound error:', e);
  }
}

/**
 * Play call ended sound
 */
export function playCallEndedSound() {
  triggerHapticVibrate([150, 80, 150]);
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const notes = [659.25, 523.25, 392]; // E5, C5, G4

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0.12, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.3);
    });
  } catch (e) {
    console.warn('Call ended sound error:', e);
  }
}

/**
 * Play incoming message pop notification sound
 */
export function playMessageNotificationSound() {
  triggerHapticVibrate(50);
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.28);
  } catch (e) {
    console.warn('Message sound error:', e);
  }
}
