import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Boxes, TrendingUp } from "lucide-react";
import {
  ReturnReceiptDetailDialog,
  returnedByLabel,
} from "@/components/shared/ReturnReceiptDetailDialog";
import {
  MOCK_PRODUCTS,
  MOCK_RETURN_RECEIPTS,
  costInSom,
  formatSom,
  type Product,
  type ReturnReceipt,
} from "@/lib/mock-data";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

type Stat = {
  product: Product;
  qty: number;
  soldQty: number;
  cost: number;
  vitrinaQty: number;
  omborQty: number;
};

const ALL_WAREHOUSES = "all";
type GroupMode = "sales" | "stock";
const WAREHOUSES = Array.from(
  new Set(MOCK_PRODUCTS.map((product) => product.warehouse).filter(Boolean)),
).sort();

function stockQty(product: Product) {
  return product.vitrinaQty + product.omborQty;
}

function soldQty(product: Product) {
  return (product.salesHistory ?? []).reduce((sum, item) => sum + item.qty, 0);
}

function statsForWarehouse(warehouse: string): Stat[] {
  return MOCK_PRODUCTS.filter(
    (product) => warehouse === ALL_WAREHOUSES || product.warehouse === warehouse,
  ).map((product) => {
    const qty = stockQty(product);
    return {
      product,
      qty,
      soldQty: soldQty(product),
      vitrinaQty: product.vitrinaQty,
      omborQty: product.omborQty,
      cost: qty * costInSom(product),
    };
  });
}

function categorize(stats: Stat[], mode: GroupMode) {
  const sorted = [...stats].sort((a, b) => {
    const aValue = mode === "sales" ? a.soldQty : a.qty;
    const bValue = mode === "sales" ? b.soldQty : b.qty;
    if (bValue !== aValue) return bValue - aValue;
    return b.cost - a.cost;
  });
  const n = sorted.length;
  const greenCut = Math.ceil(n / 3);
  const yellowCut = Math.ceil((n * 2) / 3);
  const green = sorted.slice(0, greenCut);
  const yellow = sorted.slice(greenCut, yellowCut);
  const red = sorted.slice(yellowCut);
  return { green, yellow, red };
}

function fmtDate(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}.${MONTHS[date.getMonth()]}.${date.getFullYear()}`;
}

function fmtDateTime(value: string) {
  const date = new Date(value);
  return `${fmtDate(date)} ${date.toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function sumStats(stats: Stat[]) {
  return stats.reduce(
    (acc, stat) => ({
      qty: acc.qty + stat.qty,
      soldQty: acc.soldQty + stat.soldQty,
      cost: acc.cost + stat.cost,
    }),
    { qty: 0, soldQty: 0, cost: 0 },
  );
}

export function TovarlarHolati() {
  const [view, setView] = React.useState<"holati" | "qaytgan">("holati");
  const [warehouse, setWarehouse] = React.useState(ALL_WAREHOUSES);
  const [groupMode, setGroupMode] = React.useState<GroupMode>("sales");

  const stats = React.useMemo(() => statsForWarehouse(warehouse), [warehouse]);
  const cats = React.useMemo(() => categorize(stats, groupMode), [groupMode, stats]);
  const totals = React.useMemo(() => sumStats(stats), [stats]);
  const selectedWarehouseLabel = warehouse === ALL_WAREHOUSES ? "Barcha omborlar" : warehouse;
  const isSalesMode = groupMode === "sales";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex gap-1.5 border-b bg-card px-3 py-1.5">
        <Button
          size="sm"
          variant={view === "holati" ? "default" : "outline"}
          onClick={() => setView("holati")}
          className="h-7 px-2.5 text-xs"
        >
          Tovarlar holati
        </Button>
        <Button
          size="sm"
          variant={view === "qaytgan" ? "default" : "outline"}
          onClick={() => setView("qaytgan")}
          className="h-7 px-2.5 text-xs"
        >
          Qaytgan tovarlar
        </Button>
      </div>

      {view === "qaytgan" ? (
        <div className="min-h-0 flex-1 overflow-auto">
          <ReturnedGoodsReport />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b bg-card px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Ombor:</span>
              <Select value={warehouse} onValueChange={setWarehouse}>
                <SelectTrigger className="h-7 w-52 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_WAREHOUSES}>Barcha omborlar</SelectItem>
                  {WAREHOUSES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto rounded-full border bg-muted/30 px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground">
              {selectedWarehouseLabel}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setGroupMode((current) => (current === "sales" ? "stock" : "sales"))}
              className="h-7 gap-1.5 px-2.5 text-xs"
              title={isSalesMode ? "Sotuv bo'yicha guruhlangan" : "Zaxira bo'yicha guruhlangan"}
              aria-label={
                isSalesMode ? "Sotuv bo'yicha guruhlangan" : "Zaxira bo'yicha guruhlangan"
              }
            >
              {isSalesMode ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <Boxes className="h-3.5 w-3.5" />
              )}
              <span key={groupMode} data-no-translate>
                {isSalesMode ? "Sotuv" : "Zaxira"}
              </span>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b bg-muted/20 px-3 py-2">
            <InventoryKpi label="Bazadagi jami mahsulot soni" value={String(totals.qty)} />
            <InventoryKpi label="Tan narxdagi umumiy summa" value={formatSom(totals.cost)} accent />
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-3 gap-2 overflow-hidden p-2">
            <Bucket
              title={isSalesMode ? "Yashil — ko'p sotilgan" : "Yashil — zaxira ko'p"}
              color="bg-success/10 border-success/40"
              dot="bg-success"
              items={cats.green}
              mode={groupMode}
            />
            <Bucket
              title={isSalesMode ? "Sariq — o'rtacha sotilgan" : "Sariq — o'rtacha zaxira"}
              color="bg-amber-500/10 border-amber-500/40"
              dot="bg-amber-500"
              items={cats.yellow}
              mode={groupMode}
            />
            <Bucket
              title={isSalesMode ? "Qizil — kam sotilgan" : "Qizil — kam qolgan"}
              color="bg-destructive/10 border-destructive/40"
              dot="bg-destructive"
              items={cats.red}
              mode={groupMode}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function InventoryKpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-md border bg-card px-3 py-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div
        className={
          "mt-1 text-lg font-bold leading-tight tabular-nums " + (accent ? "text-primary" : "")
        }
      >
        {value}
      </div>
    </div>
  );
}

function Bucket({
  title,
  color,
  dot,
  items,
  mode,
}: {
  title: string;
  color: string;
  dot: string;
  items: Stat[];
  mode: GroupMode;
}) {
  const totals = sumStats(items);
  const qtyLabel = mode === "sales" ? "Sotilgan" : "Soni";
  const totalQty = mode === "sales" ? totals.soldQty : totals.qty;

  return (
    <div className={"flex min-h-0 flex-col rounded-md border " + color}>
      <div className="border-b bg-card/50 px-2.5 py-2">
        <div className="flex items-center gap-2">
          <span className={"inline-block h-2.5 w-2.5 rounded-full " + dot} />
          <span className="text-sm font-bold leading-tight">{title}</span>
          <span className="ml-auto rounded-full bg-card px-2 py-0.5 text-xs font-bold">
            {items.length}
          </span>
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-xs">
          <div className="rounded bg-card/70 px-1.5 py-1">
            <span className="text-muted-foreground">
              {mode === "sales" ? "Jami sotuv: " : "Jami son: "}
            </span>
            <b className="tabular-nums">{totalQty}</b>
          </div>
          <div className="rounded bg-card/70 px-1.5 py-1">
            <span className="text-muted-foreground">Tan narx: </span>
            <b className="tabular-nums">{formatSom(totals.cost)}</b>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {items.length > 0 ? (
          <div className="flex h-full min-h-0 flex-col gap-1.5">
            <div className="grid grid-cols-[1.75rem_minmax(0,1fr)_3.5rem_6rem] gap-1.5 rounded bg-card/80 px-2 py-1.5 text-[10px] font-semibold uppercase text-muted-foreground">
              <span>№</span>
              <span>Mahsulot nomi</span>
              <span className="text-right">{qtyLabel}</span>
              <span className="text-right">Tan narx</span>
            </div>
            {items.map((stat, index) => (
              <div
                key={stat.product.id}
                className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)_3.5rem_6rem] items-start gap-1.5 rounded border bg-card/70 px-2 py-1.5 text-xs"
              >
                <span className="text-muted-foreground tabular-nums">{index + 1}</span>
                <span className="min-w-0 break-words font-semibold leading-snug">
                  {stat.product.name}
                  <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
                    Vitrina: {stat.vitrinaQty} · Ombor: {stat.omborQty}
                  </span>
                </span>
                <span className="text-right font-bold tabular-nums">
                  {mode === "sales" ? stat.soldQty : stat.qty}
                </span>
                <span className="break-words text-right font-bold leading-snug tabular-nums">
                  {formatSom(stat.cost)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">—</div>
        )}
      </div>
    </div>
  );
}

function ReturnedGoodsReport() {
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [selectedReceipt, setSelectedReceipt] = React.useState<ReturnReceipt | null>(null);

  const rows = React.useMemo(
    () =>
      MOCK_RETURN_RECEIPTS.filter(
        (receipt) =>
          (!from || receipt.date.slice(0, 10) >= from) && (!to || receipt.date.slice(0, 10) <= to),
      ),
    [from, to],
  );
  const total = rows.reduce((sum, receipt) => sum + receipt.total, 0);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-card">
      <div className="border-b p-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-base font-semibold">Qaytib kelgan tovarlar hisoboti</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Qaytgan chekni bosib batafsil ma'lumotni ko'ring
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="h-9 w-40 rounded-md border bg-background px-3 text-sm"
            />
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="h-9 w-40 rounded-md border bg-background px-3 text-sm"
            />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-md bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground">Qaytgan chek</div>
            <div className="text-xl font-bold">{rows.length}</div>
          </div>
          <div className="rounded-md bg-primary/10 p-3">
            <div className="text-xs text-primary">Jami summa</div>
            <div className="text-xl font-bold text-primary">{formatSom(total)}</div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/90 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Sana</th>
              <th className="px-3 py-2 text-left">Qaytarish cheki</th>
              <th className="px-3 py-2 text-left">Kim qaytargan</th>
              <th className="px-3 py-2 text-left">Qabul qilgan</th>
              <th className="px-3 py-2 text-left">Tovarlar</th>
              <th className="px-3 py-2 text-right">Summa</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((receipt) => {
              const returnedBy = returnedByLabel(receipt);
              return (
                <tr
                  key={receipt.id}
                  className="cursor-pointer border-b hover:bg-primary/5"
                  onClick={() => setSelectedReceipt(receipt)}
                >
                  <td className="px-3 py-2 text-muted-foreground">{fmtDateTime(receipt.date)}</td>
                  <td className="px-3 py-2 font-mono font-semibold">{receipt.id}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{returnedBy.name}</div>
                    <div className="text-xs text-muted-foreground">{returnedBy.meta}</div>
                  </td>
                  <td className="px-3 py-2">{receipt.cashier}</td>
                  <td className="px-3 py-2">
                    <div className="max-w-[320px] truncate">
                      {receipt.items
                        .map((item) => `${item.name} (${item.qty} ${item.unit})`)
                        .join(", ")}
                    </div>
                    <div className="text-xs text-muted-foreground">{receipt.reason || "-"}</div>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">
                    {formatSom(receipt.total)}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Bu davrda qaytgan tovar topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ReturnReceiptDetailDialog
        receipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
      />
    </div>
  );
}
