import { formatSom } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { PendingReturnExchange } from "@/components/sotuv/types";
import { CartLine } from "./CartLine";
import type { PosCartLine, PosCheck } from "./usePosCart";

type Props = {
  checks: PosCheck[];
  activeCheckId: string;
  activeCheck: PosCheck;
  onSelectCheck: (checkId: string) => void;
  onNewCheck: () => void;
  onCloseCheck: (checkId: string) => void;
  onLineQuantityChange: (line: PosCartLine, quantity: number) => void;
  onOpenQuantityKeypad: (line: PosCartLine) => void;
  onRemoveLine: (productId: string) => void;
  onOpenDiscountKeypad: () => void;
  onClearCheck: () => void;
  onConfirm: () => void;
  pendingReturn?: PendingReturnExchange | null;
  onClearPendingReturn?: () => void;
};

export function CartPanel({
  checks,
  activeCheckId,
  activeCheck,
  onSelectCheck,
  onNewCheck,
  onCloseCheck,
  onLineQuantityChange,
  onOpenQuantityKeypad,
  onRemoveLine,
  onOpenDiscountKeypad,
  onClearCheck,
  onConfirm,
  pendingReturn,
  onClearPendingReturn,
}: Props) {
  const itemCount = activeCheck.lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = activeCheck.lines.reduce(
    (sum, line) => sum + line.product.price * line.quantity,
    0,
  );
  const currentSaleTotal = Math.max(0, subtotal - activeCheck.discount);
  const returnCredit = pendingReturn?.total ?? 0;
  const total = Math.max(0, currentSaleTotal - returnCredit);

  return (
    <aside className="flex w-[388px] flex-shrink-0 flex-col border-l border-[#E2E7F0] bg-white">
      {/* Chek tablari */}
      <div className="flex flex-shrink-0 items-center gap-1 overflow-x-auto border-b border-[#E2E7F0] px-2 py-1.5">
        {checks.map((check) => {
          const checkTotal = check.lines.reduce(
            (sum, line) => sum + line.product.price * line.quantity,
            0,
          );
          const active = check.id === activeCheckId;
          return (
            <div key={check.id} className="flex flex-shrink-0 items-center">
              <button
                type="button"
                onClick={() => onSelectCheck(check.id)}
                className={cn(
                  "flex h-11 touch-manipulation items-center gap-1.5 rounded-[10px] px-2.5 text-xs font-medium transition-colors",
                  active ? "bg-[#0836B0]/10 text-[#0836B0]" : "text-[#737D91] hover:text-[#222C3B]",
                )}
              >
                <span>{check.label}</span>
                <span className="tabular-nums">
                  {checkTotal > 0 ? formatSom(checkTotal) : "bo'sh"}
                </span>
              </button>
              {checks.length > 1 && (
                <button
                  type="button"
                  onClick={() => onCloseCheck(check.id)}
                  className="flex h-9 w-9 flex-shrink-0 touch-manipulation items-center justify-center text-[#737D91] hover:text-[#C0392B]"
                  aria-label={`${check.label}ni yopish`}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={onNewCheck}
          className="flex h-11 w-11 flex-shrink-0 touch-manipulation items-center justify-center rounded-[10px] text-lg text-[#0836B0] hover:bg-[#0836B0]/10"
          aria-label="Yangi chek"
        >
          +
        </button>
      </div>

      {/* Sarlavha: Savatcha N ta / Tozalash */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-[#E2E7F0] px-3 py-2.5">
        <span className="text-sm font-semibold text-[#222C3B]">
          Savatcha {activeCheck.lines.length} ta
        </span>
        <button
          type="button"
          onClick={onClearCheck}
          disabled={activeCheck.lines.length === 0}
          className="h-9 touch-manipulation px-2 text-xs font-medium text-[#737D91] hover:text-[#C0392B] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Tozalash
        </button>
      </div>

      {/* Savatcha qatorlari */}
      <div className="min-h-0 flex-1 touch-manipulation overflow-y-auto px-3">
        {activeCheck.lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center text-sm text-[#737D91]">
            Savatcha bo'sh — Tovarni skanerlang yoki ro'yxatdan tanlang.
          </div>
        ) : (
          activeCheck.lines.map((line) => (
            <CartLine
              key={line.product.id}
              line={line}
              onQuantityChange={(quantity) => onLineQuantityChange(line, quantity)}
              onOpenQuantityKeypad={() => onOpenQuantityKeypad(line)}
              onRemove={() => onRemoveLine(line.product.id)}
            />
          ))
        )}
      </div>

      {pendingReturn && (
        <div className="flex-shrink-0 border-t border-[#E2E7F0] bg-[#FDF0E3] px-3 py-2 text-xs text-[#B4530A]">
          <div className="flex items-center justify-between gap-2">
            <span>Qaytgan mahsulot krediti:</span>
            <span className="font-bold tabular-nums">{formatSom(returnCredit)}</span>
          </div>
          {onClearPendingReturn && (
            <button
              type="button"
              onClick={onClearPendingReturn}
              className="mt-1 h-9 touch-manipulation text-[11px] font-semibold underline"
            >
              Qaytarishni bekor qilish
            </button>
          )}
        </div>
      )}

      {/* Jami hisob */}
      <div className="flex-shrink-0 space-y-1.5 border-t border-[#E2E7F0] px-3 py-3">
        <div className="flex items-center justify-between text-sm text-[#737D91]">
          <span>Tovar</span>
          <span className="tabular-nums text-[#222C3B]">{itemCount} ta</span>
        </div>
        <button
          type="button"
          onClick={onOpenDiscountKeypad}
          className="flex h-9 w-full touch-manipulation items-center justify-between text-sm text-[#737D91] hover:text-[#0836B0]"
        >
          <span>Chegirma</span>
          <span className="tabular-nums text-[#222C3B]">{formatSom(activeCheck.discount)}</span>
        </button>
        <div className="flex items-baseline justify-between pt-1">
          <span className="text-sm font-semibold text-[#222C3B]">Jami</span>
          <span className="text-[28px] font-bold leading-none tabular-nums text-[#222C3B]">
            {formatSom(total)}
          </span>
        </div>

        <button
          type="button"
          onClick={onConfirm}
          disabled={activeCheck.lines.length === 0}
          className="mt-2 h-14 w-full touch-manipulation rounded-[10px] bg-[#0836B0] text-base font-semibold text-white transition-colors hover:bg-[#062a8a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Savdoni tasdiqlash
        </button>
        <p className="text-center text-xs text-[#737D91]">F2 · Esc · Enter</p>
      </div>
    </aside>
  );
}
