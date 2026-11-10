import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Printer, ReceiptText } from "lucide-react";
import {
  MOCK_RECEIPTS,
  formatSom,
  type CreditCustomer,
  type CustomerDebtReceipt,
} from "@/lib/mock-data";
import { fullCustomerName } from "@/lib/data-actions";

type ReceiptDetail = {
  customer: CreditCustomer;
  receipt: CustomerDebtReceipt;
  seller: string;
};

type ListProps = {
  customer: CreditCustomer | null;
  onClose: () => void;
};

export function DebtReceiptsDialog({ customer, onClose }: ListProps) {
  const [detail, setDetail] = React.useState<ReceiptDetail | null>(null);
  const receipts = customer?.receipts ?? [];

  return (
    <>
      <Dialog open={!!customer} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-primary" />
              {customer ? `${fullCustomerName(customer)} — qarz cheklari` : "Qarz cheklari"}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[60dvh] space-y-2 overflow-auto">
            {customer &&
              receipts.map((receipt) => {
                const seller = sellerForReceipt(customer, receipt);
                return (
                  <button
                    key={receipt.id}
                    onClick={() => setDetail({ customer, receipt, seller })}
                    className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition hover:border-primary/40 hover:bg-muted/40"
                  >
                    <InlineInfo label="Sotuvchi ismi" value={seller} />
                    <InlineInfo label="Summa" value={formatSom(receipt.amount)} accent />
                    <InlineInfo label="Nasiyachi ismi" value={fullCustomerName(customer)} />
                    <InlineInfo
                      label="Sana"
                      value={new Date(receipt.date).toLocaleString("uz-UZ")}
                    />
                    <Badge variant={receiptStatusVariant(receipt)} className="ml-auto shrink-0">
                      {receiptStatusLabel(receipt)}
                    </Badge>
                  </button>
                );
              })}
            {receipts.length === 0 && (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Bu mijozda qarz cheklari yo'q
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Yopish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DebtReceiptDetailDialog detail={detail} onClose={() => setDetail(null)} />
    </>
  );
}

function DebtReceiptDetailDialog({
  detail,
  onClose,
}: {
  detail: ReceiptDetail | null;
  onClose: () => void;
}) {
  if (!detail) return null;
  const { customer, receipt, seller } = detail;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" />
            Chek — {receipt.id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Info label="Sotuvchi" value={seller} />
            <Info label="Nasiyachi" value={fullCustomerName(customer)} />
            <Info label="Sana" value={new Date(receipt.date).toLocaleString("uz-UZ")} />
            <Info label="Holat" value={receiptStatusLabel(receipt)} />
            {receipt.paidAmount !== undefined && (
              <Info label="Hozir berilgan" value={formatSom(receipt.paidAmount)} />
            )}
            {receipt.debtAmount !== undefined && (
              <Info label="Nasiyaga qoldi" value={formatSom(receipt.debtAmount)} />
            )}
          </div>

          <div className="overflow-hidden rounded-lg border">
            <div className="border-b bg-muted/60 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
              Tovarlar
            </div>
            <div className="max-h-64 overflow-auto">
              {(receipt.items.length
                ? receipt.items
                : [{ name: receipt.title, qty: 1, unit: "", amount: Math.abs(receipt.amount) }]
              ).map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="flex items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.qty} {item.unit}
                    </div>
                  </div>
                  <div className="font-semibold tabular-nums">{formatSom(item.amount)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-primary/10 p-3 text-right">
            <div className="text-xs text-primary">Chek summasi</div>
            <div className="text-2xl font-bold tabular-nums text-primary">
              {formatSom(receipt.amount)}
            </div>
          </div>

          {receipt.note && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              {receipt.note}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Yopish
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function sellerForReceipt(customer: CreditCustomer, receipt: CustomerDebtReceipt) {
  const match = MOCK_RECEIPTS.find(
    (item) =>
      item.customerType === "nasiya" &&
      item.customerName === fullCustomerName(customer) &&
      Math.abs((item.debtAmount ?? item.total) - Math.abs(receipt.amount)) < 1,
  );
  return match?.cashier ?? "Joriy foydalanuvchi";
}

function receiptStatusLabel(receipt: CustomerDebtReceipt) {
  if (receipt.status === "paid") return "To'langan";
  if (receipt.status === "partial") return "Qisman";
  if (receipt.type === "payment") return "To'lov";
  if (receipt.type === "return") return "Qaytarish";
  return "To'lanmagan";
}

function receiptStatusVariant(
  receipt: CustomerDebtReceipt,
): "default" | "secondary" | "destructive" | "outline" {
  if (receipt.status === "paid" || receipt.type === "payment") return "default";
  if (receipt.status === "partial" || receipt.type === "return") return "secondary";
  return "outline";
}

function InlineInfo({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-[120px]">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={`truncate font-semibold tabular-nums ${accent ? "text-primary" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}
