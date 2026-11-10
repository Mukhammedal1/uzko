import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Mode = "qty" | "discount";

type Props = {
  open: boolean;
  mode: Mode;
  initialValue: number;
  /** "qty" rejimida — omborda qolgan miqdor, oshib ketsa tasdiqlanmaydi. */
  max?: number;
  unit?: string;
  onConfirm: (value: number) => void;
  onClose: () => void;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"];

/** Miqdor va chegirma uchun qayta ishlatiladigan touch-birlamchi raqamli klaviatura modali. */
export function QuantityKeypad({ open, mode, initialValue, max, unit, onConfirm, onClose }: Props) {
  const [value, setValue] = React.useState(initialValue > 0 ? String(initialValue) : "");

  React.useEffect(() => {
    if (open) setValue(initialValue > 0 ? String(initialValue) : "");
  }, [open, initialValue]);

  const numeric = Number.parseFloat(value) || 0;
  const overMax = mode === "qty" && max !== undefined && numeric > max;

  const handleConfirm = () => {
    if (overMax) return;
    onConfirm(numeric);
  };

  const press = (key: string) => {
    if (key === "⌫") {
      setValue((v) => v.slice(0, -1));
      return;
    }
    if (key === "✓") {
      handleConfirm();
      return;
    }
    setValue((v) => (v.length >= 6 ? v : v + key));
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[340px] select-none touch-manipulation border-[#E2E7F0] bg-white p-4">
        <div className="text-center text-sm font-semibold text-[#222C3B]">
          {mode === "qty" ? "Miqdorni kiriting" : "Chegirma summasi"}
        </div>

        <div
          className={cn(
            "mt-3 rounded-[10px] border-2 bg-[#F4F6FA] px-4 py-3 text-center text-3xl font-bold tabular-nums text-[#222C3B]",
            overMax ? "border-[#C0392B]" : "border-[#E2E7F0]",
          )}
        >
          {value || "0"}
          {mode === "qty" && unit && (
            <span className="ml-1.5 text-base font-medium text-[#737D91]">{unit}</span>
          )}
        </div>
        {overMax && (
          <p className="mt-1.5 text-center text-xs font-medium text-[#C0392B]">
            Omborda {max} {unit ?? "dona"} qoldi
          </p>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              className={cn(
                "flex h-14 items-center justify-center rounded-[10px] text-xl font-semibold transition-colors",
                key === "✓"
                  ? "bg-[#0836B0] text-white hover:bg-[#062a8a]"
                  : "border border-[#E2E7F0] text-[#222C3B] hover:border-[#0836B0]",
              )}
            >
              {key}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-[10px] border border-[#E2E7F0] text-sm font-semibold text-[#737D91]"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={overMax}
            className="h-12 rounded-[10px] bg-[#0836B0] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Tasdiqlash
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
