import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalculatorPopover } from "./CalculatorPopover";
import { formatSom } from "@/lib/mock-data";
import type { Discount } from "./types";
import { Percent, Wallet } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtotal: number;
  current: Discount;
  onApply: (d: Discount) => void;
};

export function DiscountDialog({ open, onOpenChange, subtotal, current, onApply }: Props) {
  const [amount, setAmount] = React.useState("");
  const [percent, setPercent] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setAmount(current.type === "amount" ? String(current.value) : "");
      setPercent(current.type === "percent" ? String(current.value) : "");
    }
  }, [open, current]);

  const apply = () => {
    if (parseFloat(percent) > 0) {
      onApply({ type: "percent", value: Math.min(parseFloat(percent), 100) });
    } else if (parseFloat(amount) > 0) {
      onApply({ type: "amount", value: parseFloat(amount) });
    } else {
      onApply({ type: "none" });
    }
    onOpenChange(false);
  };

  const remove = () => {
    onApply({ type: "none" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Skidka qo'llash</DialogTitle>
        </DialogHeader>

        <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
          Umumiy summa: <span className="font-semibold text-foreground">{formatSom(subtotal)}</span>
        </div>

        <div className="space-y-2 rounded-md border p-3">
          <Label className="flex items-center gap-1.5 text-sm">
            <Wallet className="h-4 w-4 text-primary" /> Skidka summasi (so'm)
          </Label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              inputMode="decimal"
            />
            <CalculatorPopover initialValue={amount || "0"} onUse={(v) => setAmount(String(v))} />
          </div>
        </div>

        <div className="space-y-2 rounded-md border p-3">
          <Label className="flex items-center gap-1.5 text-sm">
            <Percent className="h-4 w-4 text-primary" /> Skidka foizi (%)
          </Label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              placeholder="0"
              max={100}
              inputMode="decimal"
            />
            <CalculatorPopover initialValue={percent || "0"} onUse={(v) => setPercent(String(v))} />
          </div>
          {percent && (
            <p className="text-xs text-muted-foreground">
              ≈ {formatSom((subtotal * (parseFloat(percent) || 0)) / 100)}
            </p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Ikkalasi to'ldirilsa ustuvorlik: Foiz &gt; So'm
        </p>

        <DialogFooter className="gap-2 sm:gap-2">
          {current.type !== "none" && (
            <Button variant="outline" onClick={remove}>
              Skidkani olib tashlash
            </Button>
          )}
          <Button onClick={apply}>Qo'llash</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
