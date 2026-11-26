/** Toque curto de alerta no navegador (aba em foco). */

let audioContext: AudioContext | null = null;
let audioUnlocked = false;
let lastPlayedAt = 0;

const DEBOUNCE_MS = 600;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  audioContext ??= new Ctor();
  return audioContext;
}

/** Navegadores exigem gesto do usuário antes de emitir som — chamar no primeiro clique/tecla. */
export function unlockNotificationSound() {
  if (audioUnlocked) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    audioUnlocked = true;
  } catch {
    // sem suporte a áudio
  }
}

/** Dois tons suaves (estilo “ding” de alerta). */
export function playNotificationSound() {
  if (typeof window === "undefined") return;
  const nowMs = Date.now();
  if (nowMs - lastPlayedAt < DEBOUNCE_MS) return;
  lastPlayedAt = nowMs;

  try {
    unlockNotificationSound();
    const ctx = getAudioContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.2, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);

    const tone = (frequency: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, start);
      osc.connect(gain);
      osc.start(start);
      osc.stop(start + duration);
    };

    tone(880, t0, 0.11);
    tone(1318.5, t0 + 0.12, 0.2);
  } catch {
    // falha silenciosa — notificação visual permanece
  }
}