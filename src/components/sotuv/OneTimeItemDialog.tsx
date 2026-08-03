import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PackagePlus } from "lucide-react";
import type { OneTimeItemInput } from "./types";
import { formatNumberInput } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: OneTimeItemInput) => void;
};

const UNIT_OPTIONS = ["dona", "metr", "kg", "litr", "qop"];

export function OneTimeItemDialog({ open, onOpenChange, onAdd }: Props) {
  const [name, setName] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [unit, setUnit] = React.useState("dona");
  const [price, setPrice] = React.useState("");
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      setName("");
      setQuantity("1");
      setUnit("dona");
      setPrice("");
      setNote("");
    }
  }, [open]);

  const qtyNumber = safeNumber(quantity);
  const priceNumber = safeNumber(price);
  const canAdd = name.trim().length > 1 && qtyNumber > 0 && priceNumber > 0;

  const add = () => {
    if (!canAdd) return;
    onAdd({
      name: name.trim(),
      quantity: qtyNumber,
      unit,
      price: priceNumber,
      note: note.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[380px] gap-3 p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">
              <PackagePlus className="h-4 w-4" />
            </span>
            Bir martalik tovar
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <label className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Mahsulot nomi</Label>
            <Input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Masalan: xizmat, mayda detal..."
              className="h-9"
            />
          </label>

          <div className="grid grid-cols-[1fr_92px] gap-2">
            <label className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Soni</Label>
              <Input
                type="number"
                min={0}
                step="any"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="h-9"
              />
            </label>
            <label className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Birlik</Label>
              <select
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                className="h-9 rounded-md border bg-background px-2 text-sm"
              >
                {UNIT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Sotuv narxi</Label>
            <Input
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(formatNumberInput(event.target.value))}
              placeholder="0"
              className="h-9"
            />
          </label>

          <label className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Izoh</Label>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              placeholder="Ixtiyoriy izoh..."
              className="min-h-[60px] resize-none"
            />
          </label>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor
          </Button>
          <Button onClick={add} disabled={!canAdd}>
            Qo'shish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function safeNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(number)) return number;
  const parsed = Number(String(value ?? "").replace(/\s/g, "").replace(/,/g, ".").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
