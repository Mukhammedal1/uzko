import * as React from "react";

/** Butun sahifani (document) fullscreen rejimga o'tkazish/chiqarish. */
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = React.useState(
    () => typeof document !== "undefined" && !!document.fullscreenElement,
  );

  React.useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const toggle = React.useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Fullscreen ruxsat berilmagan yoki qo'llab-quvvatlanmaydi — jim o'tkazamiz.
    }
  }, []);

  return { isFullscreen, toggle };
}
