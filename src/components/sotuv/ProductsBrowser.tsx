import * as React from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { AlertTriangle, ChevronRight, Layers, Search } from "lucide-react";
import {
  MOCK_PRODUCTS,
  formatMoney,
  isProductAtLimit,
  productHasVariants,
  resolveVariant,
  variantTotalQty,
} from "@/lib/mock-data";
import type { Product, ProductVariant } from "@/lib/mock-data";
import type { OneTimeItemInput, PriceMode } from "./types";

type Props = {
  onPick: (p: Product) => void;
  priceMode?: PriceMode;
  currency?: string;
  /** Qidiruvga narx yozilganda, Shift+Enter bosilsa — ro'yxatda mos tovar
   * bor-yo'qligidan qat'i nazar, "Yangi tovar" nomi bilan shu narxda
   * savatchaga qo'shiladi (oddiy Enter — har doim ro'yxatdagi mavjud
   * tovarni tanlaydi, shuning uchun tasodifan bir xil narxli boshqa tovar
   * bilan chalkashmasligi uchun alohida kombinatsiya ishlatiladi). */
  onAddOneTimeItem?: (item: OneTimeItemInput) => void;
};

/** Jadvalda ko'rinadigan qatorlar: oddiy tovar, variant guruhi sarlavhasi yoki variant. */
type Row =
  | { kind: "product"; product: Product }
  | { kind: "group"; product: Product & { variants: ProductVariant[] } }
  | { kind: "variant"; parent: Product; variant: ProductVariant };

function variantMatches(variant: ProductVariant, q: string) {
  if (variant.label.toLowerCase().includes(q)) return true;
  if (variant.barcode?.includes(q)) return true;
  if (variant.customCode?.toLowerCase().includes(q)) return true;
  return Object.values(variant.attrs ?? {}).some((value) => value.toLowerCase().includes(q));
}

export function ProductsBrowser({
  onPick,
  priceMode = "retail",
  currency = "UZS",
  onAddOneTimeItem,
}: Props) {
  const [query, setQuery] = React.useState("");
  const [activeIdx, setActiveIdx] = React.useState(0);
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());

  const numericQuery = React.useMemo(() => parseQueryNumber(query), [query]);

  const products = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_PRODUCTS.filter((p) => {
      if (!q) return true;
      const matchesText =
        p.name.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.customCode.toLowerCase().includes(q);
      const matchesVariant =
        productHasVariants(p) && p.variants.some((variant) => variantMatches(variant, q));
      const matchesPrice = numericQuery !== null && salePrice(p, priceMode) === numericQuery;
      return matchesText || matchesVariant || matchesPrice;
    });
  }, [query, priceMode, numericQuery]);

  // Qidiruvda variant nomi mos kelsa, o'sha guruh avtomatik ochiladi.
  const autoExpanded = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const set = new Set<string>();
    products.forEach((p) => {
      if (productHasVariants(p) && p.variants.some((variant) => variantMatches(variant, q))) {
        set.add(p.id);
      }
    });
    return set;
  }, [products, query]);

  const isOpen = React.useCallback(
    (id: string) => (autoExpanded ? autoExpanded.has(id) || expanded.has(id) : expanded.has(id)),
    [autoExpanded, expanded],
  );

  const rows = React.useMemo<Row[]>(() => {
    const list: Row[] = [];
    products.forEach((p) => {
      if (!productHasVariants(p)) {
        list.push({ kind: "product", product: p });
        return;
      }
      list.push({ kind: "group", product: p });
      if (isOpen(p.id)) {
        p.variants.forEach((variant) => list.push({ kind: "variant", parent: p, variant }));
      }
    });
    return list;
  }, [products, isOpen]);

  React.useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const toggleGroup = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      const open = autoExpanded?.has(id) || next.has(id);
      if (open) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activateRow = (row: Row) => {
    if (row.kind === "group") toggleGroup(row.product.id);
    else if (row.kind === "product") onPick(row.product);
    else onPick(resolveVariant(row.parent, row.variant));
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && e.shiftKey && numericQuery !== null && onAddOneTimeItem) {
      // Ro'yxatda tasodifan bir xil narxli tovar bo'lsa ham chalkashmasin —
      // shuning uchun "yangi tovar" qo'shish alohida kombinatsiya (Shift+Enter).
      e.preventDefault();
      onAddOneTimeItem({ name: "Yangi tovar", quantity: 1, unit: "dona", price: numericQuery });
      toast.success("Yangi tovar qo'shildi", { description: formatMoney(numericQuery, currency) });
      setQuery("");
    } else if (e.key === "Enter" && rows[activeIdx]) {
      e.preventDefault();
      activateRow(rows[activeIdx]);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b bg-card p-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Mahsulotni nomi, shtrix kodi yoki maxsus kodi orqali toping..."
              className="h-8 pl-8 text-xs"
              autoFocus
            />
          </div>
        </div>
        {numericQuery !== null && onAddOneTimeItem && (
          <p className="mt-1.5 px-0.5 text-[11px] text-muted-foreground">
            <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
              Shift+Enter
            </kbd>{" "}
            — ro'yxatdagidan qat'i nazar, "Yangi tovar" nomi bilan{" "}
            {formatMoney(numericQuery, currency)} narxda savatchaga qo'shadi
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {rows.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Hech narsa topilmadi
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
              <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-1.5 text-left font-semibold">Nomi</th>
                <th className="px-3 py-1.5 text-right font-semibold">Narxi</th>
                <th className="px-3 py-1.5 text-right font-semibold">Vitrinada</th>
                <th className="px-3 py-1.5 text-left font-semibold">Birlik</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isActive = i === activeIdx;
                const activeCls = isActive
                  ? "bg-primary/10 ring-1 ring-inset ring-primary/30"
                  : "hover:bg-muted/40";

                if (row.kind === "group") {
                  const p = row.product;
                  const open = isOpen(p.id);
                  const totalQty = variantTotalQty(p);
                  return (
                    <tr
                      key={p.id}
                      onMouseEnter={() => setActiveIdx(i)}
                      onClick={() => toggleGroup(p.id)}
                      className={"cursor-pointer border-b transition-colors " + activeCls}
                    >
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <ChevronRight
                            className={
                              "h-3.5 w-3.5 text-muted-foreground transition-transform " +
                              (open ? "rotate-90" : "")
                            }
                          />
                          <div className="font-medium">{p.name}</div>
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                            <Layers className="h-2.5 w-2.5" />
                            {p.variants.length} variant
                          </span>
                        </div>
                        <div className="pl-5 text-[11px] text-muted-foreground">{p.customCode}</div>
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium tabular-nums text-muted-foreground">
                        {formatMoney(salePrice(p, priceMode), currency)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                        {totalQty}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">{p.unit}</td>
                    </tr>
                  );
                }

                if (row.kind === "variant") {
                  const { parent, variant } = row;
                  const resolved = resolveVariant(parent, variant);
                  const out = variant.vitrinaQty <= 0;
                  return (
                    <tr
                      key={resolved.id}
                      onMouseEnter={() => setActiveIdx(i)}
                      onClick={() => !out && onPick(resolved)}
                      className={
                        "border-b transition-colors " +
                        (out ? "cursor-not-allowed opacity-50 " : "cursor-pointer ") +
                        activeCls
                      }
                    >
                      <td className="py-1.5 pl-9 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                          <div className="font-medium">{variant.label}</div>
                          {out && (
                            <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold text-destructive">
                              tugagan
                            </span>
                          )}
                        </div>
                        <div className="pl-3.5 text-[11px] text-muted-foreground">
                          {variant.customCode ?? parent.customCode}
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium tabular-nums">
                        {formatMoney(salePrice(resolved, priceMode), currency)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        <span
                          className={
                            variant.vitrinaQty < 10 ? "font-semibold text-destructive" : ""
                          }
                        >
                          {variant.vitrinaQty}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">{parent.unit}</td>
                    </tr>
                  );
                }

                const p = row.product;
                return (
                  <tr
                    key={p.id}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => onPick(p)}
                    className={"cursor-pointer border-b transition-colors " + activeCls}
                  >
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{p.name}</div>
                        {isProductAtLimit(p) && (
                          <span
                            className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700"
                            title={`Limit: ${p.minStockAlert} ${p.unit}`}
                          >
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Limit
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{p.customCode}</div>
                    </td>
                    <td className="px-3 py-1.5 text-right font-medium tabular-nums">
                      {formatMoney(salePrice(p, priceMode), currency)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      <span className={p.vitrinaQty < 10 ? "font-semibold text-destructive" : ""}>
                        {p.vitrinaQty}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">{p.unit}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function salePrice(product: unknown, priceMode: PriceMode = "retail") {
  const record = product && typeof product === "object" ? (product as Record<string, unknown>) : {};
  if (priceMode === "wholesale") {
    const wholesale = firstPositiveNumber(record.wholesalePrice);
    if (wholesale > 0) return wholesale;
  }
  return firstPositiveNumber(
    record.price,
    record.salePrice,
    record.sellPrice,
    record.sotuvNarx,
    record.sotuvNarxi,
    record.narx,
  );
}

function parseQueryNumber(value: string) {
  const cleaned = value
    .trim()
    .replace(/\s/g, "")
    .replace(/,/g, ".")
    .replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function firstPositiveNumber(...values: unknown[]) {
  for (const value of values) {
    const number = safeNumber(value);
    if (number > 0) return number;
  }
  return 0;
}

function safeNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(number)) return number;
  const parsed = Number(
    String(value ?? "")
      .replace(/\s/g, "")
      .replace(/,/g, ".")
      .replace(/[^0-9.-]/g, ""),
  );
  return Number.isFinite(parsed) ? parsed : 0;
}
