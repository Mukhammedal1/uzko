import * as React from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
};

export function ProductSearch({ value, onChange, onEnter, inputRef }: Props) {
  return (
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
              onEnter();
            }
          }}
          placeholder="Tovar nomi yoki shtrix kod"
          className="h-10 w-full rounded-[8px] border border-[#E2E7F0] bg-white pl-9 pr-3 text-sm text-[#222C3B] outline-none placeholder:text-[#737D91] focus-visible:outline-2 focus-visible:outline-[#0836B0]"
        />
      </div>
      <div className="flex flex-shrink-0 items-center gap-1.5 text-xs text-[#737D91]">
        <span className="h-2 w-2 rounded-full bg-[#12805C]" aria-hidden />
        Skaner tayyor
      </div>
    </div>
  );
}
