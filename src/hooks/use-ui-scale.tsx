import * as React from "react";

/**
 * Butun UI'ni ekran o'lchamiga avtomatik moslashtiruvchi miqyoslash.
 *
 * Ishlash tartibi:
 *  1. `autoFit` — joriy oyna eni/bo'yiga qarab dizayn bazasiga (1280×800)
 *     nisbatan hisoblanadi. Kichik ekranda kichrayadi, katta touch ekranda
 *     biroz kattalashadi (barmoq uchun qulay).
 *  2. `manualPct` — foydalanuvchi qo'lda tanlagan foiz (Sozlamalar → Interfeys
 *     yoki Ctrl +/-/0). Har qurilmada localStorage'da alohida saqlanadi.
 *  3. `effective = autoFit × manualPct/100` — natijaviy koeffitsient `<html>`
 *     elementiga `zoom` sifatida qo'yiladi, shuning uchun TopBar, BottomBar va
 *     modallar ham bir xil miqyoslanadi.
 */

const STORAGE_KEY = "uzko-ui-scale";

export const MIN_MANUAL = 60;
export const MAX_MANUAL = 160;
export const MANUAL_STEP = 10;
const DEFAULT_MANUAL = 100;

/** Dizayn bazasi — UI shu o'lcham uchun mo'ljallangan. */
const BASE_W = 1280;
const BASE_H = 800;
/** Avtomatik koeffitsient chegaralari. */
const AUTO_MIN = 0.6;
const AUTO_MAX = 1.5;
/** Natijaviy koeffitsient chegaralari. */
const EFF_MIN = 0.4;
const EFF_MAX = 2.4;

const clampManual = (v: number) => Math.min(MAX_MANUAL, Math.max(MIN_MANUAL, Math.round(v)));

function readManual(): number {
  if (typeof window === "undefined") return DEFAULT_MANUAL;
  try {
    const parsed = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(parsed) && parsed > 0 ? clampManual(parsed) : DEFAULT_MANUAL;
  } catch {
    return DEFAULT_MANUAL;
  }
}

function writeManual(value: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    /* localStorage yopiq bo'lsa — jim o'tkazamiz */
  }
}

function computeAutoFit(): number {
  if (typeof window === "undefined") return 1;
  const w = window.innerWidth || BASE_W;
  const h = window.innerHeight || BASE_H;
  const raw = Math.min(w / BASE_W, h / BASE_H);
  return Math.min(AUTO_MAX, Math.max(AUTO_MIN, raw));
}

type UiScaleCtx = {
  /** Ekran o'lchamidan hisoblangan avtomatik koeffitsient. */
  autoFit: number;
  /** Foydalanuvchi qo'lda tanlagan foiz (60–160). */
  manualPct: number;
  /** `<html>` ga qo'yiladigan natijaviy koeffitsient. */
  effective: number;
  setManualPct: (value: number) => void;
  bump: (deltaPct: number) => void;
  reset: () => void;
};

const UiScaleContext = React.createContext<UiScaleCtx | null>(null);

export function UiScaleProvider({ children }: { children: React.ReactNode }) {
  const [autoFit, setAutoFit] = React.useState<number>(() => computeAutoFit());
  const [manualPct, setManualPctState] = React.useState<number>(readManual);

  // Oyna o'lchami o'zgarганда avtomatik koeffitsientni qayta hisoblaymiz.
  React.useEffect(() => {
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setAutoFit(computeAutoFit()));
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    onResize();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  const effective = React.useMemo(() => {
    const raw = autoFit * (manualPct / 100);
    return Math.min(EFF_MAX, Math.max(EFF_MIN, Number(raw.toFixed(3))));
  }, [autoFit, manualPct]);

  // Natijaviy koeffitsientni <html> ga qo'yamiz.
  React.useEffect(() => {
    const el = document.documentElement;
    el.style.setProperty("--app-zoom", String(effective));
    el.style.setProperty("zoom", String(effective));
    return () => {
      el.style.removeProperty("zoom");
      el.style.removeProperty("--app-zoom");
    };
  }, [effective]);

  const setManualPct = React.useCallback((value: number) => {
    const next = clampManual(value);
    setManualPctState(next);
    writeManual(next);
  }, []);

  const bump = React.useCallback((deltaPct: number) => {
    setManualPctState((prev) => {
      const next = clampManual(prev + deltaPct);
      writeManual(next);
      return next;
    });
  }, []);

  const reset = React.useCallback(() => setManualPct(DEFAULT_MANUAL), [setManualPct]);

  // Ctrl/Cmd +/- — kattalashtirish/kichiklashtirish, Ctrl/Cmd 0 — tiklash.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        bump(MANUAL_STEP);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        bump(-MANUAL_STEP);
      } else if (e.key === "0") {
        e.preventDefault();
        reset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bump, reset]);

  const value = React.useMemo<UiScaleCtx>(
    () => ({ autoFit, manualPct, effective, setManualPct, bump, reset }),
    [autoFit, manualPct, effective, setManualPct, bump, reset],
  );

  return <UiScaleContext.Provider value={value}>{children}</UiScaleContext.Provider>;
}

export function useUiScale() {
  const ctx = React.useContext(UiScaleContext);
  if (!ctx) throw new Error("useUiScale must be used within <UiScaleProvider>");
  return ctx;
}
