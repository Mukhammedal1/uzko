import * as React from "react";
import { ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatSom, type ReturnReceipt } from "@/lib/mock-data";

function fmtDate(value: string) {
  return new Date(value).toLocaleString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function returnedByLabel(receipt: ReturnReceipt) {
  if (receipt.customerType === "yetkazib_beruvchi") {
    const name = receipt.supplierName || receipt.customerName || receipt.supplierId || "Noma'lum";
    const meta = ["Yetkazib beruvchi", receipt.supplierId].filter(Boolean).join(" · ");
    return { name, meta };
  }
  const name = receipt.objectName || receipt.customerName || receipt.customerId || "Noma'lum";
  const type = receipt.customerType === "nasiya" ? "Nasiyachi" : "Oddiy mijoz";
  const id = receipt.objectName ? receipt.customerId : undefined;
  return { name, meta: [type, id].filter(Boolean).join(" · ") };
}

export function ReturnReceiptDetailDialog({
  receipt,
  onClose,
}: {
  receipt: ReturnReceipt | null;
  onClose: () => void;
}) {
  if (!receipt) return null;

  const returnedBy = returnedByLabel(receipt);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" />
            Qaytgan tovar cheki - {receipt.id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Sana" value={fmtDate(receipt.date)} />
            <Info label="Chek ID" value={receipt.id} />
            <Info label="Kim qaytargan" value={returnedBy.name} note={returnedBy.meta} />
            <Info label="Qabul qilgan" value={receipt.cashier} />
          </div>

          <div className="overflow-hidden rounded-lg border">
            <div className="border-b bg-muted/60 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
              Tovarlar
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Tovar</th>
                  <th className="px-3 py-2 text-right">Miqdor</th>
                  <th className="px-3 py-2 text-left">Birlik</th>
                  <th className="px-3 py-2 text-right">Summa</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((item, index) => (
                  <tr key={`${receipt.id}-${item.productId}-${index}`} className="border-t">
                    <td className="px-3 py-2 font-medium">{item.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{item.qty}</td>
                    <td className="px-3 py-2">{item.unit}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {formatSom(item.price * item.qty)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <Info label="Tovar summasi" value={formatSom(receipt.subtotal)} />
            <Info label="Jami qaytgan" value={formatSom(receipt.total)} />
            <Info label="Sabab" value={receipt.reason || "-"} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Yopish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
      {note && <div className="mt-0.5 text-xs text-muted-foreground">{note}</div>}
    </div>
  );
}
