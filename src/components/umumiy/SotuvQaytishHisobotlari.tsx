import * as React from "react";
import { Printer, RotateCcw, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_RECEIPTS, MOCK_RETURN_RECEIPTS, formatSom } from "@/lib/mock-data";

function fmtDate(value: string) {
  return new Date(value).toLocaleString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SotilganTovarlarHisoboti() {
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const rows = MOCK_RECEIPTS.filter(
    (r) => (!from || r.date.slice(0, 10) >= from) && (!to || r.date.slice(0, 10) <= to),
  );
  const items = rows.flatMap((r) =>
    r.items.map((i) => ({
      ...i,
      receiptId: r.id,
      date: r.date,
      customerType: r.customerType,
      customerName: r.customerName ?? "Oddiy mijoz",
      total: i.price * i.qty,
    })),
  );
  const total = items.reduce((s, i) => s + i.total, 0);
  return (
    <ReportShell
      title="Sotilgan tovarlar hisoboti"
      icon={<ShoppingCart className="h-4 w-4" />}
      from={from}
      to={to}
      setFrom={setFrom}
      setTo={setTo}
      total={total}
      count={items.length}
      onPrint={() => window.print()}
    >
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">Sana</th>
            <th className="px-3 py-2 text-left">Chek</th>
            <th className="px-3 py-2 text-left">Mijoz</th>
            <th className="px-3 py-2 text-left">Tovar</th>
            <th className="px-3 py-2 text-right">Miqdor</th>
            <th className="px-3 py-2 text-right">Summa</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, idx) => (
            <tr key={`${i.receiptId}-${idx}`} className="border-b">
              <td className="px-3 py-2 text-muted-foreground">{fmtDate(i.date)}</td>
              <td className="px-3 py-2 font-mono">{i.receiptId}</td>
              <td className="px-3 py-2">{i.customerName}</td>
              <td className="px-3 py-2 font-medium">{i.name}</td>
              <td className="px-3 py-2 text-right">
                {i.qty} {i.unit}
              </td>
              <td className="px-3 py-2 text-right font-semibold">{formatSom(i.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ReportShell>
  );
}

export function QaytganTovarlarHisoboti() {
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const rows = MOCK_RETURN_RECEIPTS.filter(
    (r) => (!from || r.date.slice(0, 10) >= from) && (!to || r.date.slice(0, 10) <= to),
  );
  const items = rows.flatMap((r) =>
    r.items.map((i) => ({
      ...i,
      receiptId: r.id,
      date: r.date,
      customerType: r.customerType,
      customerName: r.customerName,
      total: i.price * i.qty,
    })),
  );
  const total = items.reduce((s, i) => s + i.total, 0);
  return (
    <ReportShell
      title="Qaytib kelgan tovarlar hisoboti"
      icon={<RotateCcw className="h-4 w-4" />}
      from={from}
      to={to}
      setFrom={setFrom}
      setTo={setTo}
      total={total}
      count={items.length}
      onPrint={() => window.print()}
    >
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">Sana</th>
            <th className="px-3 py-2 text-left">Qaytarish cheki</th>
            <th className="px-3 py-2 text-left">Mijoz</th>
            <th className="px-3 py-2 text-left">Tovar</th>
            <th className="px-3 py-2 text-right">Miqdor</th>
            <th className="px-3 py-2 text-right">Summa</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, idx) => (
            <tr key={`${i.receiptId}-${idx}`} className="border-b">
              <td className="px-3 py-2 text-muted-foreground">{fmtDate(i.date)}</td>
              <td className="px-3 py-2 font-mono">{i.receiptId}</td>
              <td className="px-3 py-2">{i.customerName}</td>
              <td className="px-3 py-2 font-medium">{i.name}</td>
              <td className="px-3 py-2 text-right">
                {i.qty} {i.unit}
              </td>
              <td className="px-3 py-2 text-right font-semibold">{formatSom(i.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ReportShell>
  );
}

function ReportShell({
  title,
  icon,
  from,
  to,
  setFrom,
  setTo,
  total,
  count,
  onPrint,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
  total: number;
  count: number;
  onPrint: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="border-b py-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              {icon}
              {title}
            </CardTitle>
            <div className="mt-1 text-xs text-muted-foreground">
              Ma'lum davr bo‘yicha umumiy hisobot
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-40"
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-40"
            />
            <Button variant="outline" onClick={onPrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground">Tovar qatori</div>
            <div className="text-xl font-bold">{count}</div>
          </div>
          <div className="rounded-lg bg-primary/10 p-3">
            <div className="text-xs text-primary">Jami summa</div>
            <div className="text-xl font-bold text-primary">{formatSom(total)}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-full overflow-auto p-0">{children}</CardContent>
    </Card>
  );
}
