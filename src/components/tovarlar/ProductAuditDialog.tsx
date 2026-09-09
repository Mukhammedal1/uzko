import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2 } from "lucide-react";
import { formatSom, type StockCountLine } from "@/lib/mock-data";
import { getProductAudit, type AuditRange, type ProductSaleRow } from "@/lib/product-audit";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border p-2.5">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

/** Sotuv yoki qaytaruv qatorlari jadvali — ikkalasi bir xil ustunlarga ega. */
function MovementTable({ rows, emptyText }: { rows: ProductSaleRow[]; emptyText: string }) {
  return (
    <div className="max-h-72 overflow-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted/90 backdrop-blur">
          <tr className="border-b text-xs uppercase text-muted-foreground">
            <th className="px-3 py-2 text-left">Sana</th>
            <th className="px-3 py-2 text-left">Chek</th>
            <th className="px-3 py-2 text-left">Mijoz / kassir</th>
            <th className="px-3 py-2 text-right">Miqdor</th>
            <th className="px-3 py-2 text-right">Narx</th>
            <th className="px-3 py-2 text-right">Summa</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={`${s.receiptId}-${s.date}`} className="border-b">
              <td className="px-3 py-1.5 text-muted-foreground">{fmt(s.date)}</td>
              <td className="px-3 py-1.5 font-mono">
                {s.receiptId}
                {s.edited && (
                  <Badge variant="outline" className="ml-1.5 text-[10px]">
                    tahrirlangan
                  </Badge>
                )}
              </td>
              <td className="px-3 py-1.5">
                <div>{s.customerName}</div>
                <div className="text-xs text-muted-foreground">{s.cashier}</div>
              </td>
              <td
                className={`px-3 py-1.5 text-right font-semibold tabular-nums ${
                  s.kind === "return" ? "text-amber-600" : ""
                }`}
              >
                {s.kind === "return" ? "+" : "−"}
                {s.qty} {s.unit}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums">{formatSom(s.price)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{formatSom(s.amount)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ChangeList({
  changes,
}: {
  changes: { label: string; oldValue: string; newValue: string }[];
}) {
  if (changes.length === 0) return null;
  return (
    <ul className="mt-1 space-y-0.5">
      {changes.map((c, i) => (
        <li key={i} className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{c.label}:</span>{" "}
          <span className="line-through">{c.oldValue}</span> → <span>{c.newValue}</span>
        </li>
      ))}
    </ul>
  );
}

export function ProductAuditDialog({
  line,
  before,
  onOpenChange,
}: {
  line: StockCountLine | null;
  /** Sanoq boshlangan vaqt yoki hisobot sanasi. */
  before: string;
  onOpenChange: (open: boolean) => void;
}) {
  const [mode, setMode] = React.useState<"lastCount" | "all" | "custom">("lastCount");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  // Har safar boshqa tovar ochilganda davr "oxirgi sanoq"ga qaytadi.
  React.useEffect(() => {
    if (line) {
      setMode("lastCount");
      setFrom("");
      setTo("");
    }
  }, [line]);

  const range: AuditRange =
    mode === "all"
      ? { kind: "all" }
      : mode === "custom"
        ? { kind: "custom", from, to }
        : { kind: "lastCount" };

  const audit = React.useMemo(
    () =>
      line
        ? getProductAudit({
            productId: line.productId,
            productName: line.productName,
            before,
            range,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [line, before, mode, from, to],
  );

  const saleRows = React.useMemo(
    () => audit?.sales.filter((s) => s.kind === "sale") ?? [],
    [audit],
  );
  const returnRows = React.useMemo(
    () => audit?.sales.filter((s) => s.kind === "return") ?? [],
    [audit],
  );

  return (
    <Dialog open={Boolean(line)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        {line && audit && (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                {line.productName}
                <span className="text-xs font-normal text-muted-foreground">
                  {[line.customCode, line.warehouse, line.shelfLocation]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-2">
              <Tile label="Dasturda" value={`${line.systemQty} ${line.unit}`} />
              <Tile label="Haqiqatda" value={`${line.countedQty ?? "—"} ${line.unit}`} />
              <Tile
                label="Farq"
                value={`${line.diff > 0 ? "+" : ""}${line.diff} ${line.unit}`}
                tone={line.diff < 0 ? "text-destructive" : line.diff > 0 ? "text-amber-600" : ""}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Qoldiq farqi odatda xato sotuv yoki xato prixoddan kelib chiqadi. Quyida shu tovar
              bo'yicha barcha sotuv va prixod hujjatlari hamda ulardagi o'zgarishlar.
            </p>

            <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2">
              <span className="text-xs font-medium text-muted-foreground">Davr:</span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={mode === "lastCount" ? "default" : "outline"}
                  className="h-7"
                  onClick={() => setMode("lastCount")}
                >
                  Oxirgi sanoqdan
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={mode === "all" ? "default" : "outline"}
                  className="h-7"
                  onClick={() => setMode("all")}
                >
                  Butun tarix
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Input
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setMode("custom");
                  }}
                  className="h-7 w-[9.5rem] text-xs"
                />
                <span className="text-xs text-muted-foreground">—</span>
                <Input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setMode("custom");
                  }}
                  className="h-7 w-[9.5rem] text-xs"
                />
              </div>

              <Badge variant="outline" className="ml-auto font-normal">
                {audit.rangeLabel}
              </Badge>
            </div>

            {audit.rangeKind === "lastCount" &&
              saleRows.length === 0 &&
              returnRows.length === 0 &&
              audit.prixods.length === 0 && (
                <p className="text-xs text-amber-600">
                  Oxirgi sanoqdan beri bu tovarda harakat yo'q — "Butun tarix" yoki boshqa davrni
                  tanlang.
                </p>
              )}

            <Tabs defaultValue="sales" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="sales">Sotuv ({saleRows.length})</TabsTrigger>
                <TabsTrigger value="prixod">Prixod ({audit.prixods.length})</TabsTrigger>
                <TabsTrigger value="return">Qaytaruv ({returnRows.length})</TabsTrigger>
              </TabsList>

              {/* ── Sotuv ── */}
              <TabsContent value="sales" className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Tile label="Sotilgan" value={`${audit.soldQty} ${line.unit}`} />
                  <Tile label="Hujjatlar" value={`${saleRows.length} ta`} />
                </div>

                <MovementTable rows={saleRows} emptyText="Bu davrda sotuv yo'q" />

                {audit.receiptChanges.length > 0 && (
                  <div className="rounded-md border">
                    <div className="border-b bg-muted/40 px-3 py-1.5 text-xs font-semibold uppercase text-muted-foreground">
                      Chekdagi o'zgarishlar ({audit.receiptChanges.length})
                    </div>
                    <ul className="divide-y">
                      {audit.receiptChanges.map((c) => (
                        <li key={c.id} className="px-3 py-2 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            {c.action === "delete" ? (
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            ) : (
                              <Pencil className="h-3.5 w-3.5 text-amber-600" />
                            )}
                            <span className="font-mono">{c.receiptId}</span>
                            <span className="text-xs text-muted-foreground">{fmt(c.date)}</span>
                            <span className="text-xs text-muted-foreground">· {c.editedBy}</span>
                            <span className="ml-auto text-xs tabular-nums">
                              {formatSom(c.oldTotal)} → {formatSom(c.newTotal)}
                            </span>
                          </div>
                          <ChangeList changes={c.changes} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>

              {/* ── Qaytaruv ── */}
              <TabsContent value="return" className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Tile
                    label="Qaytarilgan"
                    value={`${audit.returnedQty} ${line.unit}`}
                    tone={audit.returnedQty > 0 ? "text-amber-600" : ""}
                  />
                  <Tile label="Hujjatlar" value={`${returnRows.length} ta`} />
                </div>

                <MovementTable rows={returnRows} emptyText="Bu davrda qaytaruv yo'q" />
              </TabsContent>

              {/* ── Prixod ── */}
              <TabsContent value="prixod" className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Tile label="Kelgan (prixod)" value={`${audit.prixodQty} ${line.unit}`} />
                  <Tile label="Hujjatlar" value={`${audit.prixods.length} ta`} />
                </div>

                <div className="max-h-72 overflow-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/90 backdrop-blur">
                      <tr className="border-b text-xs uppercase text-muted-foreground">
                        <th className="px-3 py-2 text-left">Sana</th>
                        <th className="px-3 py-2 text-left">Nakladnoy</th>
                        <th className="px-3 py-2 text-left">Agent / ombor</th>
                        <th className="px-3 py-2 text-right">Miqdor</th>
                        <th className="px-3 py-2 text-right">Tan narx</th>
                        <th className="px-3 py-2 text-right">Summa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audit.prixods.map((p) => (
                        <tr key={p.id} className="border-b">
                          <td className="px-3 py-1.5 text-muted-foreground">{fmt(p.date)}</td>
                          <td className="px-3 py-1.5 font-mono">{p.invoiceNumber}</td>
                          <td className="px-3 py-1.5">
                            <div>{p.agentName}</div>
                            <div className="text-xs text-muted-foreground">{p.warehouse}</div>
                          </td>
                          <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-emerald-600">
                            +{p.qty} {p.unit}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {formatSom(p.costPrice)}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {formatSom(p.amount)}
                          </td>
                        </tr>
                      ))}
                      {audit.prixods.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                            Bu davrda prixod yo'q
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {audit.prixodChanges.length > 0 && (
                  <div className="rounded-md border">
                    <div className="border-b bg-muted/40 px-3 py-1.5 text-xs font-semibold uppercase text-muted-foreground">
                      Prixod / qoldiq o'zgarishlari ({audit.prixodChanges.length})
                    </div>
                    <ul className="divide-y">
                      {audit.prixodChanges.map((c) => (
                        <li key={c.id} className="px-3 py-2 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            {c.action === "delete" ? (
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            ) : (
                              <Pencil className="h-3.5 w-3.5 text-amber-600" />
                            )}
                            <span className="font-mono">{c.invoiceNumber}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {c.source === "prixod" ? "prixod" : "qoldiq tahriri"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{fmt(c.date)}</span>
                            <span className="text-xs text-muted-foreground">· {c.editedBy}</span>
                            <span className="ml-auto text-xs">{c.summary}</span>
                          </div>
                          <ChangeList changes={c.changes} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
