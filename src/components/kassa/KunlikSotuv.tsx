import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Search, CalendarDays, Pencil, Printer, Trash2, Plus, Minus, Wifi, Eye, EyeOff } from "lucide-react";
import {
  MOCK_RECEIPTS,
  MOCK_RECEIPT_EDIT_HISTORY,
  formatSom,
  type Receipt,
} from "@/lib/mock-data";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { NasiyaSavdolar } from "@/components/kassa/NasiyaSavdolar";
import { PeriodFilter, type PeriodFilterValue } from "@/components/shared/PeriodFilter";
import { useApp } from "@/lib/app-context";
import {
  filterOnlineOrders,
  onlineOrderTotal,
  onlineOrdersSummary,
  type OnlineOrderPeriod,
} from "@/lib/online-sales";

function fmtDate(d: Date) {
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" });
}
function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function matchesReceiptQuery(r: Receipt, rawQuery: string) {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const qDigits = q.replace(/\s/g, "");

  if (r.id.toLowerCase().includes(q)) return true;
  if (r.cashier.toLowerCase().includes(q)) return true;
  if (r.customerName && r.customerName.toLowerCase().includes(q)) return true;
  if (r.items.some((it) => it.name.toLowerCase().includes(q))) return true;
  if (qDigits && /^\d+$/.test(qDigits)) {
    if (String(Math.round(r.total)).includes(qDigits)) return true;
  }
  return false;
}

export function KunlikSotuv() {
  const { settings } = useApp();
  const [query, setQuery] = React.useState("");
  const [range, setRange] = React.useState<DateRange | undefined>();
  const [, force] = React.useState(0);
  const [editing, setEditing] = React.useState<Receipt | null>(null);
  const [deleting, setDeleting] = React.useState<Receipt | null>(null);
  const [showNasiya, setShowNasiya] = React.useState(false);
  const [showOnlineHistory, setShowOnlineHistory] = React.useState(false);
  const [showAmounts, setShowAmounts] = React.useState(true);

  // Faqat sana (yoki davr) bo'yicha — chek qidiruvi bunga ta'sir qilmasin,
  // shu tufayli yuqoridagi umumiy hisobot faqat sana o'zgarganda o'zgaradi.
  const dateFiltered = React.useMemo(() => {
    return MOCK_RECEIPTS.filter((r) => {
      const d = new Date(r.date);
      if (range?.from && range?.to) {
        return d >= range.from && d <= new Date(range.to.getTime() + 86_400_000 - 1);
      }
      // default: bugun
      return isSameDay(d, new Date("2026-05-07"));
    });
  }, [range]);

  const filtered = React.useMemo(() => {
    return dateFiltered.filter((r) => matchesReceiptQuery(r, query));
  }, [dateFiltered, query]);

  const dashboard = React.useMemo(() => {
    return dateFiltered.reduce(
      (acc, receipt) => {
        acc.total += receipt.total;
        const payment = receipt.paymentBreakdown;
        if (payment) {
          acc.cash += payment.cash;
          acc.card += payment.card;
          acc.currency += payment.currencyInSom;
        } else if (receipt.customerType === "nasiya") {
          acc.cash += receipt.paidAmount ?? 0;
        } else {
          acc.cash += receipt.total;
        }
        return acc;
      },
      { total: 0, cash: 0, card: 0, currency: 0 },
    );
  }, [dateFiltered]);

  const handlePrint = (r: Receipt) => {
    toast.success(`Chek #${r.id} chop etildi`);
  };

  const handleDelete = () => {
    if (!deleting) return;
    const idx = MOCK_RECEIPTS.findIndex((x) => x.id === deleting.id);
    if (idx >= 0) MOCK_RECEIPTS.splice(idx, 1);
    MOCK_RECEIPT_EDIT_HISTORY.unshift({
      id: `reh-${Date.now()}`,
      date: new Date().toISOString(),
      editedBy: settings.username,
      receiptId: deleting.id,
      action: "delete",
      oldTotal: deleting.total,
      newTotal: 0,
    });
    setDeleting(null);
    force((n) => n + 1);
    toast.success("Chek o'chirildi");
  };

  if (showNasiya) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-card p-3">
          <div>
            <div className="text-sm font-semibold">Nasiya savdolar</div>
            <div className="text-xs text-muted-foreground">Kunlik sotuv ichidagi nasiya savdolar ro'yxati</div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowNasiya(false)}>
            Kunlik sotuvga qaytish
          </Button>
        </div>
        <div className="min-h-0 flex-1">
          <NasiyaSavdolar />
        </div>
      </div>
    );
  }

  if (showOnlineHistory) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-card p-3">
          <div>
            <div className="text-sm font-semibold">Online savdo tarixi</div>
            <div className="text-xs text-muted-foreground">Telegram botdan kelgan zakazlar bo'yicha tarix</div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowOnlineHistory(false)}>
            Kunlik sotuvga qaytish
          </Button>
        </div>
        <OnlineSalesHistoryPanel />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="grid gap-2 border-b bg-muted/10 p-3 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          label="Umumiy savdo"
          value={showAmounts ? formatSom(dashboard.total) : "••••••"}
          accent
          action={
            <button
              type="button"
              onClick={() => setShowAmounts((v) => !v)}
              className="text-muted-foreground hover:text-foreground"
              aria-label={showAmounts ? "Summani yashirish" : "Summani ko'rsatish"}
            >
              {showAmounts ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
          }
        />
        <DashboardCard label="Naqd pul" value={showAmounts ? formatSom(dashboard.cash) : "••••••"} />
        <DashboardCard label="Karta" value={showAmounts ? formatSom(dashboard.card) : "••••••"} />
        <DashboardCard label="Valyuta (so'm)" value={showAmounts ? formatSom(dashboard.currency) : "••••••"} />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b bg-card p-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chek raqami, sotuvchi, nasiyachi, mahsulot yoki summa bo'yicha qidirish..."
            className="h-10 pl-9 text-sm"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              {range?.from && range?.to
                ? `${fmtDate(range.from)} — ${fmtDate(range.to)}`
                : "Bugun"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={range}
              onSelect={setRange}
              numberOfMonths={2}
              className={cn("p-3 pointer-events-auto")}
            />
            <div className="border-t p-2">
              <Button size="sm" variant="ghost" className="w-full"
                onClick={() => setRange(undefined)}>
                Tozalash (bugun)
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <Button variant="outline" size="sm" onClick={() => setShowNasiya(true)}>
          Nasiya savdolar
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowOnlineHistory(true)}>
          <Wifi className="h-4 w-4" />
          Online savdo tarixi
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
            <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 text-left font-semibold">Sotuvchi</th>
              <th className="px-3 py-2 text-left font-semibold">Chek raqami</th>
              <th className="px-3 py-2 text-right font-semibold">Summa</th>
              <th className="px-3 py-2 text-left font-semibold">Sana</th>
              <th className="w-32 px-3 py-2 text-center font-semibold">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer border-b hover:bg-muted/40"
                onDoubleClick={() => setEditing(r)}
              >
                <td className="px-3 py-2 font-medium">{r.cashier}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatSom(r.total)}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {new Date(r.date).toLocaleString("uz-UZ")}
                  {r.editedAt && (
                    <div className="text-[10px] text-amber-600">tahrir: {new Date(r.editedAt).toLocaleString("uz-UZ")}</div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-center gap-1">
                    <Button size="icon" variant="outline" className="h-8 w-8"
                      onClick={() => setEditing(r)} aria-label="Tahrir">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" className="h-8 w-8"
                      onClick={() => handlePrint(r)} aria-label="Print">
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleting(r)} aria-label="O'chirish">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Cheklar topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <EditReceiptDialog
        receipt={editing}
        onClose={() => { setEditing(null); force((n) => n + 1); }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chekni o'chirish?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.id} — {deleting && formatSom(deleting.total)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>O'chirish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function OnlineSalesHistoryPanel() {
  const [period, setPeriod] = React.useState<PeriodFilterValue>("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [query, setQuery] = React.useState("");

  const rows = React.useMemo(
    () =>
      filterOnlineOrders({
        period: period as OnlineOrderPeriod,
        from,
        to,
        query,
      }),
    [from, period, query, to],
  );
  const summary = onlineOrdersSummary(rows);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid gap-2 border-b bg-muted/10 p-3 md:grid-cols-4">
        <DashboardCard label="Online zakazlar" value={`${summary.count} ta`} />
        <DashboardCard label="Online summa" value={formatSom(summary.total)} accent />
        <DashboardCard label="Tasdiqlangan" value={`${summary.confirmedCount} ta`} />
        <DashboardCard label="Bekor qilingan" value={`${summary.canceledCount} ta`} />
      </div>

      <div className="space-y-3 border-b bg-card p-3">
        <PeriodFilter value={period} onValueChange={setPeriod} from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Zakaz qiluvchi ismi, telefon raqam yoki zakaz raqami"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
            <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 text-left font-semibold">Zakaz raqami</th>
              <th className="px-3 py-2 text-left font-semibold">Zakaz qiluvchi</th>
              <th className="px-3 py-2 text-left font-semibold">Telefon</th>
              <th className="px-3 py-2 text-right font-semibold">Summa</th>
              <th className="px-3 py-2 text-left font-semibold">Vaqt</th>
              <th className="px-3 py-2 text-left font-semibold">Holat</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((order) => (
              <tr key={order.id} className="border-b hover:bg-muted/40">
                <td className="px-3 py-2 font-mono text-xs font-bold text-primary">{order.id}</td>
                <td className="px-3 py-2 font-medium">{order.customerName}</td>
                <td className="px-3 py-2 text-muted-foreground">{order.customerPhone}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatSom(onlineOrderTotal(order))}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString("uz-UZ")}</td>
                <td className="px-3 py-2">
                  <span className="rounded-md border bg-muted/30 px-2 py-1 text-xs font-semibold">
                    {onlineStatusLabel(order.status)}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Online zakaz topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function onlineStatusLabel(status: string) {
  if (status === "pending") return "Yangi";
  if (status === "accepted") return "Qabul qilingan";
  if (status === "completed") return "Tasdiqlangan";
  if (status === "canceled") return "Bekor qilingan";
  return status;
}

function DashboardCard({
  label,
  value,
  accent,
  action,
}: {
  label: string;
  value: string;
  accent?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={
        accent
          ? "rounded-lg border border-primary/30 bg-primary/5 p-3 shadow-sm"
          : "rounded-lg border bg-card p-3 shadow-sm"
      }
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">{label}</div>
        {action}
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function EditReceiptDialog({
  receipt, onClose,
}: { receipt: Receipt | null; onClose: () => void }) {
  const { settings } = useApp();
  const [items, setItems] = React.useState(receipt?.items ?? []);

  React.useEffect(() => {
    setItems(receipt?.items ? receipt.items.map((it) => ({ ...it })) : []);
  }, [receipt]);

  if (!receipt) return null;

  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const total = Math.max(0, subtotal - receipt.discount);

  const setQty = (idx: number, qty: number) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, qty: Math.max(0, qty) } : it));
  };
  const removeRow = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const save = () => {
    const r = MOCK_RECEIPTS.find((x) => x.id === receipt.id);
    if (r) {
      const oldTotal = r.total;
      const changes: { field: string; label: string; oldValue: string; newValue: string }[] = [];
      receipt.items.forEach((oldItem) => {
        const newItem = items.find((it) => it.productId === oldItem.productId);
        const newQty = newItem?.qty ?? 0;
        if (newQty !== oldItem.qty) {
          changes.push({
            field: "qty",
            label: oldItem.name,
            oldValue: `${oldItem.qty} ${oldItem.unit}`,
            newValue: `${newQty} ${oldItem.unit}`,
          });
        }
      });

      r.items = items.filter((it) => it.qty > 0);
      r.subtotal = r.items.reduce((s, it) => s + it.price * it.qty, 0);
      r.total = Math.max(0, r.subtotal - r.discount);
      r.editedAt = new Date().toISOString();

      MOCK_RECEIPT_EDIT_HISTORY.unshift({
        id: `reh-${Date.now()}`,
        date: r.editedAt,
        editedBy: settings.username,
        receiptId: r.id,
        action: "edit",
        oldTotal,
        newTotal: r.total,
        changes,
      });
    }
    toast.success("Chek tahrirlandi");
    onClose();
  };

  return (
    <Dialog open={!!receipt} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chek tahrirlash — {receipt.id}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[400px] overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr className="text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2 text-left">Tovar</th>
                <th className="px-3 py-2 text-right">Narx</th>
                <th className="px-3 py-2 text-center">Miqdor</th>
                <th className="px-3 py-2 text-right">Jami</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="border-b">
                  <td className="px-3 py-2">{it.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatSom(it.price)}</td>
                  <td className="px-3 py-2">
                    <div className="inline-flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-7 w-7"
                        onClick={() => setQty(idx, it.qty - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <input
                        type="number"
                        value={it.qty}
                        onChange={(e) => setQty(idx, parseFloat(e.target.value) || 0)}
                        className="h-7 w-14 rounded border bg-background px-1 text-center text-xs tabular-nums"
                      />
                      <Button size="icon" variant="outline" className="h-7 w-7"
                        onClick={() => setQty(idx, it.qty + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">
                    {formatSom(it.price * it.qty)}
                  </td>
                  <td className="px-3 py-2">
                    <Button size="icon" variant="outline"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeRow(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between rounded-md bg-primary/5 px-4 py-2">
          <span className="text-sm text-muted-foreground">Yangi jami:</span>
          <span className="text-lg font-bold text-primary tabular-nums">{formatSom(total)}</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Bekor</Button>
          <Button onClick={save}>Saqlash</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
