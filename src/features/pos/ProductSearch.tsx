import * as React from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  /** Faqat narx yozilganda — ro'yxatdagidan qat'i nazar "Yangi tovar" sifatida qo'shadi. */
  onShiftEnter: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
};

function isNumericQuery(value: string) {
  const cleaned = value.trim().replace(/\s/g, "").replace(/,/g, ".");
  return cleaned.length > 0 && /^\d+(\.\d+)?$/.test(cleaned);
}

/**
 * Oddiy standart HTML input — fizik klaviaturasi yo'q qurilmalarda OS (Windows/
 * Android) o'zining ekran klaviaturasini avtomatik chaqiradi, buni ilova ichida
 * qayta yasash shart emas.
 */
export function ProductSearch({ value, onChange, onEnter, onShiftEnter, inputRef }: Props) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#737D91]"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (event.shiftKey) {
                  onShiftEnter();
                } else {
                  onEnter();
                }
              }
            }}
            placeholder="Tovar nomi, shtrix kod yoki narxi"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="h-11 w-full touch-manipulation rounded-[10px] border border-[#E2E7F0] bg-white pl-9 pr-3 text-[15px] text-[#222C3B] outline-none placeholder:text-[#737D91] focus-visible:outline-2 focus-visible:outline-[#0836B0]"
          />
        </div>
        <div className="flex h-11 flex-shrink-0 items-center gap-1.5 text-xs text-[#737D91]">
          <span className="h-2 w-2 rounded-full bg-[#12805C]" aria-hidden />
          Skaner tayyor
        </div>
      </div>
      {isNumericQuery(value) && (
        <p className="mt-1.5 px-0.5 text-[11px] text-[#737D91]">
          <kbd className="rounded border border-[#E2E7F0] bg-[#F4F6FA] px-1 py-0.5 font-mono text-[10px]">
            Shift+Enter
          </kbd>{" "}
          — ro'yxatdagidan qat'i nazar "Yangi tovar" nomi bilan shu narxda qo'shadi
        </p>
      )}
    </div>
  );
}
