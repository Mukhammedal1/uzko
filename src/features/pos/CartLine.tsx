import * as React from "react";
import { formatSom } from "@/lib/mock-data";
import type { PosCartLine } from "./usePosCart";

type Props = {
  line: PosCartLine;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
};

export function CartLine({ line, onQuantityChange, onRemove }: Props) {
  const { product, quantity } = line;
  const [draft, setDraft] = React.useState(String(quantity));

  React.useEffect(() => {
    setDraft(String(quantity));
  }, [quantity]);

  const commitDraft = (raw: string) => {
    const parsed = Number.parseFloat(raw.replace(",", "."));
    onQuantityChange(Number.isFinite(parsed) ? parsed : 0);
  };

  return (
    <div className="flex items-start justify-between gap-2 border-b border-[#E2E7F0] py-2.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="truncate text-sm text-[#222C3B]">{product.name}</div>
          <button
            type="button"
            onClick={onRemove}
            className="flex-shrink-0 text-[#737D91] hover:text-[#C0392B]"
            aria-label="O'chirish"
          >
            ✕
          </button>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onQuantityChange(quantity - 1)}
            className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-[#E2E7F0] text-[#222C3B] hover:border-[#0836B0]"
            aria-label="Kamaytirish"
          >
            −
          </button>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={(event) => commitDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitDraft(draft);
                (event.target as HTMLInputElement).blur();
              }
            }}
            inputMode="decimal"
            className="h-7 w-14 rounded-[8px] border border-[#E2E7F0] text-center text-sm tabular-nums outline-none focus-visible:outline-2 focus-visible:outline-[#0836B0]"
          />
          <button
            type="button"
            onClick={() => onQuantityChange(quantity + 1)}
            className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-[#E2E7F0] text-[#222C3B] hover:border-[#0836B0]"
            aria-label="Ko'paytirish"
          >
            +
          </button>
          <span className="text-xs text-[#737D91]">× {formatSom(product.price)}</span>
        </div>
      </div>
      <div className="flex-shrink-0 pt-0.5 text-sm font-semibold text-[#222C3B]">
        {formatSom(product.price * quantity)}
      </div>
    </div>
  );
}
