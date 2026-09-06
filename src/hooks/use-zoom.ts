import * as React from "react";

const STORAGE_KEY = "uzko-ui-zoom";
export const MIN_ZOOM = 70;
export const MAX_ZOOM = 150;
export const ZOOM_STEP = 10;
const DEFAULT_ZOOM = 100;

function clamp(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function readStoredZoom(): number {
  if (typeof window === "undefined") return DEFAULT_ZOOM;
  const parsed = Number(window.localStorage.getItem(STORAGE_KEY));
  return Number.isFinite(parsed) && parsed > 0 ? clamp(parsed) : DEFAULT_ZOOM;
}

/**
 * Faqat markaziy kontentni (`.responsive-main` — TopBar/BottomBar bundan
 * mustasno) kattalashtirish/kichiklashtirish — `--app-zoom` CSS o'zgaruvchisi
 * orqali (styles.css). Qiymat localStorage'da saqlanadi va sahifa qayta
 * ochilganda tiklanadi.
 */
export function useZoom() {
  const [zoom, setZoom] = React.useState<number>(readStoredZoom);

  React.useEffect(() => {
    // Eski implementatsiya butun sahifani (<html>) to'g'ridan-to'g'ri zoom
    // qilar edi — shu qoldiq inline style bo'lsa, TopBar/BottomBar ham
    // kichrayib qolmasligi uchun tozalanadi.
    document.documentElement.style.removeProperty("zoom");
    document.documentElement.style.setProperty("--app-zoom", `${zoom}%`);
    window.localStorage.setItem(STORAGE_KEY, String(zoom));
  }, [zoom]);

  const zoomIn = React.useCallback(() => setZoom((z) => clamp(z + ZOOM_STEP)), []);
  const zoomOut = React.useCallback(() => setZoom((z) => clamp(z - ZOOM_STEP)), []);
  const setZoomClamped = React.useCallback((value: number) => setZoom(clamp(value)), []);
  const reset = React.useCallback(() => setZoom(DEFAULT_ZOOM), []);

  return {
    zoom,
    setZoom: setZoomClamped,
    zoomIn,
    zoomOut,
    reset,
    canZoomIn: zoom < MAX_ZOOM,
    canZoomOut: zoom > MIN_ZOOM,
  };
}
