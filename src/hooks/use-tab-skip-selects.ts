import * as React from "react";

/**
 * Konteyner ichida Tab bosilganda select/combobox tugmalarini
 * (`data-tab-skip` atributi bilan belgilangan) o'tkazib yuboradi — faqat
 * input/textarea/radio/oddiy tugmalar orasida yuradi. Qaytgan ref shu
 * konteynerga biriktiriladi.
 */
export function useTabSkipSelects<T extends HTMLElement = HTMLDivElement>() {
  const ref = React.useRef<T>(null);

  React.useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(
          'input:not([disabled]), textarea:not([disabled]), [role="radio"]:not([data-disabled]), button:not([disabled]):not([data-tab-skip])',
        ),
      ).filter((el) => el.tabIndex !== -1 && el.offsetParent !== null);

      const current = document.activeElement as HTMLElement | null;
      const index = current ? focusable.indexOf(current) : -1;
      if (index === -1) return;

      const next = index + (event.shiftKey ? -1 : 1);
      if (next < 0 || next >= focusable.length) return;
      event.preventDefault();
      focusable[next]?.focus();
    };

    container.addEventListener("keydown", onKeyDown);
    return () => container.removeEventListener("keydown", onKeyDown);
  }, []);

  return ref;
}
