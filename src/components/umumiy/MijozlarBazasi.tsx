import * as React from "react";
import { Search, Printer, Lock, UserRound, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MOCK_CREDIT_CUSTOMERS,
  formatSom,
  type CreditCustomer,
  type CustomerDebtReceipt,
} from "@/lib/mock-data";

function fmtDate(value: string) {
  return new Date(value).toLocaleString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function printReceipt(customer: CreditCustomer, receipt: CustomerDebtReceipt) {
  const win = window.open("", "_blank", "width=420,height=640");
  if (!win) return;
  win.document.write(`
    <html><head><title>${receipt.id}</title><style>
      body{font-family:Arial,sans-serif;padding:18px;color:#111}.center{text-align:center}.row{display:flex;justify-content:space-between;border-bottom:1px dashed #ddd;padding:6px 0}table{width:100%;border-collapse:collapse;margin-top:10px}td,th{border-bottom:1px solid #eee;padding:6px;text-align:left}.total{font-size:18px;font-weight:700;margin-top:14px;text-align:right}
    </style></head><body>
      <div class="center"><h2>UZKO</h2><div>Qarz cheki: ${receipt.id}</div></div>
      <div class="row"><span>Mijoz</span><b>${customer.firstName} ${customer.lastName}</b></div>
      <div class="row"><span>Sana</span><span>${fmtDate(receipt.date)}</span></div>
      <div class="row"><span>Amal</span><span>${receipt.title}</span></div>
      <table><thead><tr><th>Tovar</th><th>Miqdor</th><th>Summa</th></tr></thead><tbody>
        ${(receipt.items.length ? receipt.items : [{ name: receipt.title, qty: 1, unit: "", amount: Math.abs(receipt.amount) }]).map((i) => `<tr><td>${i.name}</td><td>${i.qty} ${i.unit}</td><td>${formatSom(i.amount)}</td></tr>`).join("")}
      </tbody></table>
      <div class="total">${formatSom(receipt.amount)}</div>
      <p>${receipt.note ?? ""}</p>
      <script>window.print();</script>
    </body></html>
  `);
  win.document.close();
}

export function MijozlarBazasi() {
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState(MOCK_CREDIT_CUSTOMERS[0]?.id ?? "");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  const customers = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_CREDIT_CUSTOMERS;
    return MOCK_CREDIT_CUSTOMERS.filter((c) =>
      `${c.id} ${c.firstName} ${c.lastName} ${c.phone ?? ""}`.toLowerCase().includes(q),
    );
  }, [query]);
  const selected = MOCK_CREDIT_CUSTOMERS.find((c) => c.id === selectedId) ?? customers[0];

  const receipts = React.useMemo(() => {
    if (!selected) return [];
    return (selected.receipts ?? []).filter((r) => {
      const day = r.date.slice(0, 10);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      return true;
    });
  }, [selected, dateFrom, dateTo]);

  const totalDebt = MOCK_CREDIT_CUSTOMERS.reduce((sum, c) => sum + c.currentDebt, 0);

  return (
    <div className="grid h-full grid-cols-[320px_1fr] gap-3 overflow-hidden">
      <Card className="overflow-hidden">
        <CardHeader className="border-b py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="h-4 w-4" /> Mijozlar bazasi
          </CardTitle>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ism, ID yoki telefon..."
              className="pl-9"
            />
          </div>
          <div className="rounded-md bg-primary/10 p-2 text-sm font-semibold text-primary">
            Jami qarzdorlik: {formatSom(totalDebt)}
          </div>
        </CardHeader>
        <CardContent className="h-full overflow-auto p-2">
          {customers.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedId(c.id);
              }}
              className={`mb-2 w-full rounded-lg border p-3 text-left hover:bg-muted/60 ${selected?.id === c.id ? "border-primary bg-primary/5" : ""}`}
            >
              <div className="flex items-center justify-between">
                <b>
                  {c.firstName} {c.lastName}
                </b>
                <Badge variant="outline">{c.id}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {c.phone} · {c.role}
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span>Qarz</span>
                <b className="tabular-nums">{formatSom(c.currentDebt)}</b>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {selected && (
        <div className="min-h-0 overflow-auto space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <Kpi label="Mijoz ID" value={selected.id} />
            <Kpi label="Umumiy qarz" value={formatSom(selected.currentDebt)} accent />
            <Kpi label="Limit" value={formatSom(selected.limit)} />
            <Kpi label="Qoldiq limit" value={formatSom(selected.limit - selected.currentDebt)} />
          </div>

          <Card>
            <CardHeader className="border-b py-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ReceiptText className="h-4 w-4" /> Qarz cheklari{" "}
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-40"
                  />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-40"
                  />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Bu cheklarni faqat ko‘rish va print qilish mumkin. Edit/delete yo‘q.
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Sana</th>
                    <th className="px-3 py-2 text-left">Chek</th>
                    <th className="px-3 py-2 text-left">Amal</th>
                    <th className="px-3 py-2 text-right">Summa</th>
                    <th className="px-3 py-2 text-right">Print</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-muted/40">
                      <td className="px-3 py-2 text-muted-foreground">{fmtDate(r.date)}</td>
                      <td className="px-3 py-2 font-mono font-semibold">{r.id}</td>
                      <td className="px-3 py-2">{r.title}</td>
                      <td
                        className={`px-3 py-2 text-right font-semibold tabular-nums ${r.amount < 0 ? "text-emerald-600" : ""}`}
                      >
                        {formatSom(r.amount)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => printReceipt(selected, r)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {receipts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        Cheklar topilmadi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-bold tabular-nums ${accent ? "text-primary" : ""}`}>
        {value}
      </div>
    </div>
  );
}
