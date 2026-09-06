import { formatSom } from "@/lib/mock-data";
import type { PosCartLine } from "./usePosCart";

type Props = {
  line: PosCartLine;
  onQuantityChange: (quantity: number) => void;
  onOpenQuantityKeypad: () => void;
  onRemove: () => void;
};

export function CartLine({ line, onQuantityChange, onOpenQuantityKeypad, onRemove }: Props) {
  const { product, quantity } = line;

  return (
    <div className="flex items-start justify-between gap-2 border-b border-[#E2E7F0] py-2.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="truncate text-sm text-[#222C3B]">{product.name}</div>
          <button
            type="button"
            onClick={onRemove}
            className="flex h-9 w-9 flex-shrink-0 touch-manipulation items-center justify-center text-[#737D91] hover:text-[#C0392B]"
            aria-label="O'chirish"
          >
            ✕
          </button>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onQuantityChange(quantity - 1)}
            className="flex h-10 w-10 touch-manipulation items-center justify-center rounded-[10px] border border-[#E2E7F0] text-lg text-[#222C3B] hover:border-[#0836B0]"
            aria-label="Kamaytirish"
          >
            −
          </button>
          <button
            type="button"
            onClick={onOpenQuantityKeypad}
            className="flex h-10 min-w-[46px] touch-manipulation items-center justify-center rounded-[10px] border border-[#E2E7F0] px-1 text-sm font-semibold tabular-nums text-[#222C3B] hover:border-[#0836B0]"
            aria-label="Miqdorni kiritish"
          >
            {quantity}
          </button>
          <button
            type="button"
            onClick={() => onQuantityChange(quantity + 1)}
            className="flex h-10 w-10 touch-manipulation items-center justify-center rounded-[10px] border border-[#E2E7F0] text-lg text-[#222C3B] hover:border-[#0836B0]"
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
