import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  MOCK_RECEIPTS, MOCK_CASH_CLOSES, MOCK_WITHDRAWALS, MOCK_DEBT_PAYMENTS,
  MOCK_ONE_TIME_ITEMS, MOCK_RECEIPT_EDIT_HISTORY,
  formatSom, type Receipt, type CashClose, type CashWithdrawal, type DebtPayment, type OneTimeItemHistory,
  type EditedReceiptHistory,
} from "@/lib/mock-data";
import {
  Banknote,
  HandCoins,
  Lock,
  Receipt as ReceiptIcon,
  ChevronRight,
  Filter,
  PackagePlus,
  Pencil,
} from "lucide-react";
import { PeriodFilter, type PeriodFilterValue } from "@/components/shared/PeriodFilter";

const TABS = [
  { id: "yopish", label: "Kassa yopish" },
  { id: "chiqim", label: "Pul chiqarish" },
  { id: "qarz",   label: "Qarz so'ndirish" },
  { id: "bir_martalik", label: "Bir martalik tovarlar" },
  { id: "tahrirlangan", label: "Tahrirlangan cheklar" },
] as const;
type Tab = (typeof TABS)[number]["id"];
type Period = PeriodFilterValue;

type PickedItem =
  | { kind: "sotuv";  data: Receipt }
  | { kind: "yopish"; data: CashClose }
  | { kind: "chiqim"; data: CashWithdrawal }
  | { kind: "qarz";   data: DebtPayment }
  | { kind: "bir_martalik"; data: OneTimeItemHistory };

const now = new Date("2026-05-07T12:00:00");

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay() || 7;
  x.setDate(x.getDate() - day + 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}

function inDateRange(date: string, period: Period, from: string, to: string) {
  const value = new Date(date);
  let start: Date | null = null;
  let end: Date | null = null;

  if (period === "today") {
    start = new Date(now); start.setHours(0, 0, 0, 0);
    end = new Date(now); end.setHours(23, 59, 59, 999);
  }
  if (period === "yesterday") {
    start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
    end = new Date(now); end.setDate(end.getDate() - 1); end.setHours(23, 59, 59, 999);
  }
  if (period === "week") {
    start = startOfWeek(now);
    end = new Date(now); end.setHours(23, 59, 59, 999);
  }
  if (period === "month") {
    start = startOfMonth(now);
    end = new Date(now); end.setHours(23, 59, 59, 999);
  }
  if (period === "year") {
    start = startOfYear(now);
    end = new Date(now); end.setHours(23, 59, 59, 999);
  }
  if (period === "custom") {
    if (from) start = new Date(`${from}T00:00:00`);
    // "to" hali tanlanmagan bo'lsa (faqat bitta kun bosilgan), o'sha kunning o'zi bilan cheklaymiz.
    if (to) end = new Date(`${to}T23:59:59`);
    else if (from) end = new Date(`${from}T23:59:59`);
  }

  if (start && value < start) return false;
  if (end && value > end) return false;
  return true;
}

function receiptCategory(r: Receipt) {
  return r.customerType === "nasiya" ? "Nasiya savdo" : "Oddiy savdo";
}

function closeTotal(r: CashClose) {
  return r.cash + r.cards.reduce((s, c) => s + c.amount, 0) + r.currencies.reduce((s, c) => s + c.amount, 0);
}

function withdrawalTotal(r: CashWithdrawal) {
  return r.cash + r.cardAmount + r.currencies.reduce((s, c) => s + c.amount, 0);
}

export function KassaTarixi() {
  const [tab, setTab] = React.useState<Tab>("yopish");
  const [picked, setPicked] = React.useState<PickedItem | null>(null);
  const [period, setPeriod] = React.useState<Period>("today");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  const filteredCloses = React.useMemo(() => MOCK_CASH_CLOSES.filter((r) =>
    inDateRange(r.date, period, from, to)
  ), [period, from, to]);

  const filteredWithdrawals = React.useMemo(() => MOCK_WITHDRAWALS.filter((r) =>
    inDateRange(r.date, period, from, to)
  ), [period, from, to]);

  const filteredDebtPayments = React.useMemo(() => MOCK_DEBT_PAYMENTS.filter((r) =>
    inDateRange(r.date, period, from, to)
  ), [period, from, to]);

  const filteredOneTimeItems = React.useMemo(() => MOCK_ONE_TIME_ITEMS.filter((r) =>
    inDateRange(r.date, period, from, to)
  ), [period, from, to]);

  const filteredEditedReceipts = React.useMemo(() => MOCK_RECEIPT_EDIT_HISTORY.filter((r) =>
    inDateRange(r.date, period, from, to)
  ), [period, from, to]);

  const total = React.useMemo(() => {
    if (tab === "yopish") return filteredCloses.reduce((s, r) => s + closeTotal(r), 0);
    if (tab === "chiqim") return filteredWithdrawals.reduce((s, r) => s + withdrawalTotal(r), 0);
    if (tab === "qarz") return filteredDebtPayments.reduce((s, r) => s + r.amount, 0);
    if (tab === "tahrirlangan") return filteredEditedReceipts.length;
    return filteredOneTimeItems.reduce((s, r) => s + r.total, 0);
  }, [tab, filteredCloses, filteredWithdrawals, filteredDebtPayments, filteredOneTimeItems, filteredEditedReceipts]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card p-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <Button key={t.id} size="sm"
              variant={tab === t.id ? "default" : "outline"}
              onClick={() => setTab(t.id)}>
              {t.label}
            </Button>
          ))}
        </div>
        <div className="rounded-xl border bg-primary/5 px-4 py-2 text-right shadow-sm">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {tab === "tahrirlangan" ? "Tahrirlar soni" : "Jami"}
          </div>
          <div className="text-lg font-bold tabular-nums text-primary">
            {tab === "tahrirlangan" ? `${total} ta` : formatSom(total)}
          </div>
        </div>
      </div>

      <div className="border-b bg-muted/20 p-3">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-background p-3 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Filter className="h-4 w-4" /> Filter
          </div>
          <PeriodFilter value={period} onValueChange={setPeriod} from={from} to={to} onFromChange={setFrom} onToChange={setTo} hideAllOption showYesterdayOption instantSingleDay />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {tab === "yopish" && <YopishList rows={filteredCloses} onPick={(r) => setPicked({ kind: "yopish", data: r })} />}
        {tab === "chiqim" && <ChiqimList rows={filteredWithdrawals} onPick={(r) => setPicked({ kind: "chiqim", data: r })} />}
        {tab === "qarz"   && <QarzList rows={filteredDebtPayments} onPick={(r) => setPicked({ kind: "qarz",   data: r })} />}
        {tab === "bir_martalik" && <OneTimeList rows={filteredOneTimeItems} onPick={(r) => setPicked({ kind: "bir_martalik", data: r })} />}
        {tab === "tahrirlangan" && <EditedReceiptsList rows={filteredEditedReceipts} />}
      </div>

      {picked?.kind === "yopish" && (
        <CashCloseDetailDialog record={picked.data} onClose={() => setPicked(null)} />
      )}
      {picked?.kind === "chiqim" && (
        <WithdrawalDetailDialog record={picked.data} onClose={() => setPicked(null)} />
      )}
      {picked?.kind === "qarz" && (
        <DebtPaymentDetailDialog record={picked.data} onClose={() => setPicked(null)} />
      )}
      {picked?.kind === "bir_martalik" && (
        <OneTimeDetailDialog record={picked.data} onClose={() => setPicked(null)} />
      )}
    </div>
  );
}

function OneTimeDetailDialog({
  record,
  onClose,
}: {
  record: OneTimeItemHistory;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-primary" />
            Bir martalik tovar — {record.receiptId}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <InfoGrid>
            <Info label="Chek" value={record.receiptId} />
            <Info label="Sotuvchi" value={record.cashier} />
            <Info label="Sana" value={new Date(record.date).toLocaleString("uz-UZ")} />
            <Info label="Jami" value={formatSom(record.total)} accent />
          </InfoGrid>

          <DetailBlock title="Tovarlar">
            {record.items.map((item, index) => (
              <div key={`${item.name}-${index}`} className="px-3 py-2 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.qty} {item.unit} × {formatSom(item.price)}
                    </div>
                    {item.note && <div className="mt-1 text-xs text-muted-foreground">Izoh: {item.note}</div>}
                  </div>
                  <div className="shrink-0 font-semibold tabular-nums">
                    {formatSom(item.price * item.qty)}
                  </div>
                </div>
              </div>
            ))}
          </DetailBlock>

          <NoteBlock>Bu yozuv faqat ko'rish uchun. Edit yoki delete huquqi berilmagan.</NoteBlock>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Yopish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CashCloseDetailDialog({ record, onClose }: { record: CashClose; onClose: () => void }) {
  const cardTotal = record.cards.reduce((s, c) => s + c.amount, 0);
  const currencyTotal = record.currencies.reduce((s, c) => s + c.amount, 0);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Kassa yopish — {record.id}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <InfoGrid>
            <Info label="Kassir" value={record.cashier} />
            <Info label="Sana" value={new Date(record.date).toLocaleString("uz-UZ")} />
            <Info label="Naqd" value={formatSom(record.cash)} accent />
            <Info label="Kartalar" value={formatSom(cardTotal)} />
            <Info label="Valyuta" value={formatSom(currencyTotal)} />
            <Info label="Kassada qoldi" value={formatSom(record.leftInRegister)} />
            <Info label="Kamomat" value={formatSom(record.shortage)} danger={record.shortage > 0} />
            <Info label="Jami" value={formatSom(closeTotal(record))} accent />
          </InfoGrid>

          {record.cards.length > 0 && (
            <DetailBlock title="Karta to'lovlari">
              {record.cards.map((card) => (
                <AmountRow key={card.type} label={card.type} value={formatSom(card.amount)} />
              ))}
            </DetailBlock>
          )}

          {record.note && <NoteBlock>{record.note}</NoteBlock>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Yopish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WithdrawalDetailDialog({
  record,
  onClose,
}: {
  record: CashWithdrawal;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            Pul chiqarish — {record.id}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <InfoGrid>
            <Info label="Kassir" value={record.cashier} />
            <Info label="Sana" value={new Date(record.date).toLocaleString("uz-UZ")} />
            <Info label="Kategoriya" value={record.category} />
            <Info label="Agent ID" value={record.agentId || "-"} />
            <Info label="Xodim" value={record.employeeName ? `${record.employeeId} — ${record.employeeName}` : "-"} />
            <Info label="Naqd" value={formatSom(record.cash)} accent />
            <Info label="Karta" value={formatSom(record.cardAmount)} />
            <Info label="Valyuta" value={formatSom(record.currencies.reduce((s, c) => s + c.amount, 0))} />
            <Info label="Jami" value={formatSom(withdrawalTotal(record))} accent />
          </InfoGrid>

          {record.currencies.length > 0 && (
            <DetailBlock title="Valyuta">
              {record.currencies.map((currency) => (
                <AmountRow
                  key={currency.code}
                  label={currency.code}
                  value={formatSom(currency.amount)}
                />
              ))}
            </DetailBlock>
          )}

          {record.note && <NoteBlock>{record.note}</NoteBlock>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Yopish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DebtPaymentDetailDialog({
  record,
  onClose,
}: {
  record: DebtPayment;
  onClose: () => void;
}) {
  const methodLabel =
    record.method === "naqd"
      ? "Naqd"
      : record.method === "karta"
        ? `Karta${record.cardType ? ` (${record.cardType})` : ""}`
        : `Valyuta${record.currencyCode ? ` (${record.currencyCode})` : ""}`;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandCoins className="h-5 w-5 text-primary" />
            Qarz so'ndirish — {record.id}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <InfoGrid>
            <Info label="Kassir" value={record.cashier} />
            <Info label="Sana" value={new Date(record.date).toLocaleString("uz-UZ")} />
            <Info label="Mijoz" value={record.customerName} />
            <Info label="Mijoz ID" value={record.customerId} />
            <Info label="To'lov turi" value={methodLabel} />
            <Info label="Summa" value={formatSom(record.amount)} accent />
          </InfoGrid>

          {record.objectName && (
            <DetailBlock title="Obyekt">
              <AmountRow label={record.objectName} value={record.objectId || "-"} />
            </DetailBlock>
          )}

          {record.note && <NoteBlock>{record.note}</NoteBlock>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Yopish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2 text-sm">{children}</div>;
}

function Info({
  label,
  value,
  accent,
  danger,
}: {
  label: string;
  value: string;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div
        className={
          "font-semibold tabular-nums " +
          (accent ? "text-primary " : "") +
          (danger ? "text-destructive " : "")
        }
      >
        {value}
      </div>
    </div>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="border-b bg-muted/60 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
        {title}
      </div>
      <div className="divide-y">{children}</div>
    </div>
  );
}

function AmountRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function NoteBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function ReceiptDetailDialog({ receipt, onClose }: { receipt: Receipt; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptIcon className="h-5 w-5 text-primary" />
            Chek — {receipt.id}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg bg-muted/40 p-3 text-sm">
            <span className="text-muted-foreground">Sotuvchi:</span>
            <span className="font-medium">{receipt.cashier}</span>
            <span className="text-muted-foreground">Sana:</span>
            <span className="font-medium">{new Date(receipt.date).toLocaleString("uz-UZ")}</span>
            <span className="text-muted-foreground">Mijoz turi:</span>
            <span className="font-medium">{receipt.customerType === "oddiy" ? "Oddiy" : "Nasiya"}</span>
            {receipt.customerName && (
              <>
                <span className="text-muted-foreground">Mijoz:</span>
                <span className="font-medium">{receipt.customerName}</span>
              </>
            )}
            {receipt.paidAmount !== undefined && (
              <>
                <span className="text-muted-foreground">Hozir berilgan:</span>
                <span className="font-medium">{formatSom(receipt.paidAmount)}</span>
              </>
            )}
            {receipt.debtAmount !== undefined && (
              <>
                <span className="text-muted-foreground">Nasiyaga qoldi:</span>
                <span className="font-medium">{formatSom(receipt.debtAmount)}</span>
              </>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr className="text-xs uppercase text-muted-foreground">
                  <th className="px-3 py-2 text-left">Tovar</th>
                  <th className="px-3 py-2 text-right">Narx</th>
                  <th className="px-3 py-2 text-center">Miqdor</th>
                  <th className="px-3 py-2 text-right">Jami</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((it, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 font-medium">
                        {it.name}
                        {it.source === "one-time" && (
                          <Badge variant="secondary" className="text-[9px]">bir martalik</Badge>
                        )}
                      </div>
                      {it.note && <div className="text-xs text-muted-foreground">Izoh: {it.note}</div>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatSom(it.price)}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{it.qty} <span className="text-xs text-muted-foreground">{it.unit}</span></td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatSom(it.price * it.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-1.5 rounded-lg bg-primary/5 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Oraliq summa:</span>
              <span className="tabular-nums">{formatSom(receipt.subtotal)}</span>
            </div>
            {receipt.discount > 0 && (
              <div className="flex justify-between text-success">
                <span>Skidka:</span>
                <span className="tabular-nums">−{formatSom(receipt.discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1.5 text-base font-bold">
              <span>JAMI:</span>
              <span className="tabular-nums text-primary">{formatSom(receipt.total)}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Yopish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-1.5 text-left text-xs font-semibold uppercase text-muted-foreground">{children}</th>;
}

function SotuvList({ rows, onPick }: { rows: Receipt[]; onPick: (r: Receipt) => void }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-muted/50"><tr>
        <Th>Chek</Th><Th>Sotuvchi</Th><Th>Kategoriya</Th><Th>Mijoz</Th><Th>Summa</Th><Th>Sana</Th><th></th>
      </tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Bu filter bo'yicha ma'lumot yo'q</td></tr>}
        {rows.map((r) => (
          <tr key={r.id} className="cursor-pointer border-b hover:bg-muted/40" onClick={() => onPick(r)}>
            <td className="px-3 py-1.5 font-mono text-xs">{r.id}</td>
            <td className="px-3 py-1.5">{r.cashier}</td>
            <td className="px-3 py-1.5"><Badge variant="secondary" className="text-[10px]">{receiptCategory(r)}</Badge></td>
            <td className="px-3 py-1.5 text-xs">
              {r.customerName
                ? <><span className="font-medium">{r.customerName}</span> <Badge variant="secondary" className="text-[9px] ml-1">nasiya</Badge></>
                : r.customerType}
            </td>
            <td className="px-3 py-1.5 font-semibold tabular-nums">{formatSom(r.total)}</td>
            <td className="px-3 py-1.5 text-xs text-muted-foreground">{new Date(r.date).toLocaleString("uz-UZ")}</td>
            <td className="px-3 py-1.5 text-muted-foreground"><ChevronRight className="h-4 w-4" /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function YopishList({ rows, onPick }: { rows: CashClose[]; onPick: (r: CashClose) => void }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-muted/50"><tr><Th>ID</Th><Th>Kim</Th><Th>Naqd</Th><Th>Karta</Th><Th>Jami</Th><Th>Kamomat</Th><Th>Sana</Th></tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Bu filter bo'yicha ma'lumot yo'q</td></tr>}
        {rows.map((r) => (
          <tr key={r.id} className="cursor-pointer border-b hover:bg-muted/40" onClick={() => onPick(r)}>
            <td className="px-3 py-1.5 font-mono text-xs">{r.id}</td>
            <td className="px-3 py-1.5">{r.cashier}</td>
            <td className="px-3 py-1.5 tabular-nums">{formatSom(r.cash)}</td>
            <td className="px-3 py-1.5 tabular-nums">{formatSom(r.cards.reduce((s, c) => s + c.amount, 0))}</td>
            <td className="px-3 py-1.5 font-semibold tabular-nums">{formatSom(closeTotal(r))}</td>
            <td className="px-3 py-1.5 tabular-nums">{formatSom(r.shortage)}</td>
            <td className="px-3 py-1.5 text-xs text-muted-foreground">{new Date(r.date).toLocaleString("uz-UZ")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ChiqimList({ rows, onPick }: { rows: CashWithdrawal[]; onPick: (r: CashWithdrawal) => void }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-muted/50"><tr><Th>ID</Th><Th>Kim</Th><Th>Kategoriya</Th><Th>Agent/Xodim</Th><Th>Summa</Th><Th>Sana</Th></tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Bu filter bo'yicha ma'lumot yo'q</td></tr>}
        {rows.map((r) => (
          <tr key={r.id} className="cursor-pointer border-b hover:bg-muted/40" onClick={() => onPick(r)}>
            <td className="px-3 py-1.5 font-mono text-xs">{r.id}</td>
            <td className="px-3 py-1.5">{r.cashier}</td>
            <td className="px-3 py-1.5"><Badge variant="secondary" className="text-[10px]">{r.category}</Badge></td>
            <td className="px-3 py-1.5 text-xs text-muted-foreground">
              {r.employeeName ? `${r.employeeId} — ${r.employeeName}` : r.agentId || "—"}
            </td>
            <td className="px-3 py-1.5 font-semibold tabular-nums">{formatSom(withdrawalTotal(r))}</td>
            <td className="px-3 py-1.5 text-xs text-muted-foreground">{new Date(r.date).toLocaleString("uz-UZ")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function QarzList({ rows, onPick }: { rows: DebtPayment[]; onPick: (r: DebtPayment) => void }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-muted/50"><tr><Th>ID</Th><Th>Kim</Th><Th>Mijoz</Th><Th>Summa</Th><Th>Kategoriya</Th><Th>Sana</Th></tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Bu filter bo'yicha ma'lumot yo'q</td></tr>}
        {rows.map((r) => (
          <tr key={r.id} className="cursor-pointer border-b hover:bg-muted/40" onClick={() => onPick(r)}>
            <td className="px-3 py-1.5 font-mono text-xs">{r.id}</td>
            <td className="px-3 py-1.5">{r.cashier}</td>
            <td className="px-3 py-1.5">{r.customerName}</td>
            <td className="px-3 py-1.5 font-semibold tabular-nums">{formatSom(r.amount)}</td>
            <td className="px-3 py-1.5 text-xs"><Badge variant="outline">{r.method === "naqd" ? "Naqd" : "Karta"}</Badge></td>
            <td className="px-3 py-1.5 text-xs text-muted-foreground">{new Date(r.date).toLocaleString("uz-UZ")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EditedReceiptsList({ rows }: { rows: EditedReceiptHistory[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-muted/50"><tr>
        <Th>Sana</Th><Th>Chek</Th><Th>Amal</Th><Th>O'zgarishlar</Th><Th>Eski summa</Th><Th>Yangi summa</Th><Th>Kim tahrirladi</Th>
      </tr></thead>
      <tbody>
        {rows.length === 0 && (
          <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Tahrirlangan cheklar topilmadi</td></tr>
        )}
        {rows.map((r) => (
          <tr key={r.id} className="border-b hover:bg-muted/40">
            <td className="px-3 py-1.5 text-xs text-muted-foreground">{new Date(r.date).toLocaleString("uz-UZ")}</td>
            <td className="px-3 py-1.5 font-mono text-xs">{r.receiptId}</td>
            <td className="px-3 py-1.5">
              <Badge
                variant="outline"
                className={"gap-1 " + (r.action === "delete" ? "border-destructive/40 text-destructive" : "")}
              >
                <Pencil className="h-3 w-3" />
                {r.action === "delete" ? "O'chirildi" : "Tahrirlandi"}
              </Badge>
            </td>
            <td className="px-3 py-1.5 text-xs text-muted-foreground">
              {r.changes && r.changes.length > 0
                ? r.changes.map((c) => `${c.label}: ${c.oldValue} → ${c.newValue}`).join("; ")
                : "—"}
            </td>
            <td className="px-3 py-1.5 tabular-nums">{formatSom(r.oldTotal)}</td>
            <td className="px-3 py-1.5 font-semibold tabular-nums">{formatSom(r.newTotal)}</td>
            <td className="px-3 py-1.5"><Badge variant="secondary" className="text-[10px]">{r.editedBy}</Badge></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OneTimeList({ rows, onPick }: { rows: OneTimeItemHistory[]; onPick: (r: OneTimeItemHistory) => void }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-muted/50"><tr><Th>ID</Th><Th>Chek</Th><Th>Sotuvchi</Th><Th>Tovar</Th><Th>Summa</Th><Th>Sana</Th><th></th></tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Bu filter bo'yicha ma'lumot yo'q</td></tr>}
        {rows.map((r) => (
          <tr key={r.id} className="cursor-pointer border-b hover:bg-muted/40" onClick={() => onPick(r)}>
            <td className="px-3 py-1.5 font-mono text-xs">{r.id}</td>
            <td className="px-3 py-1.5 font-mono text-xs">{r.receiptId}</td>
            <td className="px-3 py-1.5">{r.cashier}</td>
            <td className="px-3 py-1.5">
              <div className="max-w-[320px] truncate font-medium">
                {r.items.map((item) => item.name).join(", ")}
              </div>
              <div className="text-xs text-muted-foreground">{r.items.length} pozitsiya</div>
            </td>
            <td className="px-3 py-1.5 font-semibold tabular-nums">{formatSom(r.total)}</td>
            <td className="px-3 py-1.5 text-xs text-muted-foreground">{new Date(r.date).toLocaleString("uz-UZ")}</td>
            <td className="px-3 py-1.5 text-muted-foreground"><ChevronRight className="h-4 w-4" /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
