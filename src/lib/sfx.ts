/** طبقة صوتية خفيفة عبر Web Audio — بدون ملفات صوتية خارجية. */

type SfxName = "tap" | "place" | "success" | "error";

const STORAGE_KEY = "waqqi:sound";

let ctx: AudioContext | null = null;
let enabled = true;
const listeners = new Set<(v: boolean) => void>();

if (typeof window !== "undefined") {
  try {
    enabled = localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    enabled = true;
  }
}

export function isSoundEnabled() {
  return enabled;
}

export function setSoundEnabled(value: boolean) {
  enabled = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? "on" : "off");
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(value));
}

export function subscribeSound(listener: (v: boolean) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

const RECIPES: Record<SfxName, { freq: number[]; dur: number; gain: number; type: OscillatorType }> = {
  tap: { freq: [520], dur: 0.06, gain: 0.05, type: "sine" },
  place: { freq: [420, 660], dur: 0.09, gain: 0.06, type: "triangle" },
  success: { freq: [523.25, 659.25, 783.99], dur: 0.11, gain: 0.07, type: "sine" },
  error: { freq: [220, 165], dur: 0.14, gain: 0.07, type: "sawtooth" },
};

/** يشغّل نغمة قصيرة معبّرة عن الحدث. */
export function playSfx(name: SfxName) {
  if (!enabled) return;
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const audio = getCtx();
  if (!audio) return;
  const recipe = RECIPES[name];
  recipe.freq.forEach((f, i) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const start = audio.currentTime + i * recipe.dur * 0.8;
    osc.type = recipe.type;
    osc.frequency.setValueAtTime(f, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(recipe.gain, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + recipe.dur);
    osc.connect(gain).connect(audio.destination);
    osc.start(start);
    osc.stop(start + recipe.dur + 0.02);
  });
}

/** اهتزاز خفيف على الأجهزة الداعمة. */
export function haptic(ms = 12) {
  if (!enabled) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* ignore */
  }
}
