import * as React from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Barcode,
  Check,
  ClipboardList,
  Download,
  Eye,
  FileText,
  History,
  Package,
  Pencil,
  Plus,
  Save,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";
import {
  MOCK_PRODUCTS,
  MOCK_STOCK_COUNTS,
  MOCK_STOCK_COUNT_EDITS,
  costInSom,
  formatSom,
  type Product,
  type StockCount,
  type StockCountEdit,
  type StockCountLine,
  type StockCountScope,
} from "@/lib/mock-data";
import {
  applyStockCount,
  editStockCount,
  nextStockCountId,
  stockCountTotals,
} from "@/lib/data-actions";
import { useApp } from "@/lib/app-context";
import { toast } from "sonner";
import { HistoryFilters, matchesDateFilter, type DateMode } from "./TovarlarTarixi";

type View = "list" | "setup" | "session" | "report" | "edit";
type ListTab = "counts" | "edits";
type RowFilter = "all" | "uncounted" | "diff";

type SessionConfig = {
  scope: StockCountScope;
  scopeValue: string;
};

const DEFAULT_CONFIG: SessionConfig = { scope: "all", scopeValue: "" };

const SCOPE_OPTIONS: {
  scope: StockCountScope;
  title: string;
  hint: string;
  icon: typeof Package;
  placeholder?: string;
  emptyHint?: string;
}[] = [
  {
    scope: "all",
    title: "Barcha tovarlar",
    hint: "Bazadagi hamma tovar sanaladi — to'liq reviziya",
    icon: Package,
  },
  {
    scope: "warehouse",
    title: "Bitta ombor",
    hint: "Faqat tanlangan ombordagi tovarlar",
    icon: Warehouse,
    placeholder: "Omborni tanlang",
    emptyHint: "Ombor ro'yxati bo'sh — Sozlamalardan ombor qo'shing.",
  },
];

function matchesScope(product: Product, config: SessionConfig) {
  if (config.scope === "warehouse") return product.warehouse === config.scopeValue;
  return true;
}

function scopeSummary(scope: StockCountScope, scopeValue?: string) {
  return scope === "all" ? "Barcha tovarlar" : `Ombor: ${scopeValue ?? "—"}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtPercent(value: number) {
  return `${value.toFixed(1).replace(/\.0$/, "")}%`;
}

/**
 * Sanoq qanchalik "toza" chiqqanini baholaydi. Asosiy o'lchov — kamomad
 * summasining sanalgan tovar qiymatiga nisbati: savdoda aynan shu pul yo'qoladi.
 */
function assessStockCount(record: StockCount) {
  const lossShare = record.countedValue > 0 ? record.shortageAmount / record.countedValue : 0;
  const accuracy = Math.max(0, (1 - lossShare) * 100);
  const positionAccuracy =
    record.countedLines > 0 ? (record.matchedLines / record.countedLines) * 100 : 100;

  const verdict =
    accuracy >= 99.5
      ? { label: "A'lo", hint: "Qoldiq deyarli mukammal — nazorat yaxshi ishlayapti." }
      : accuracy >= 98
        ? { label: "Yaxshi", hint: "Kamomad tabiiy chegarada. Kuzatib borish yetarli." }
        : accuracy >= 95
          ? { label: "O'rtacha", hint: "Kamomad sezilarli. Sabablarini aniqlash kerak." }
          : accuracy >= 90
            ? { label: "Yomon", hint: "Katta yo'qotish. Kassa va qabulni tekshiring." }
            : { label: "Rasvo", hint: "Jiddiy kamomad. Zudlik bilan tekshiruv talab etiladi." };

  const tone =
    accuracy >= 98
      ? { text: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-emerald-500/30" }
      : accuracy >= 95
        ? { text: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-500/30" }
        : { text: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" };

  return { accuracy, positionAccuracy, lossShare, ...verdict, tone };
}

function diffLinesOf(record: StockCount) {
  return record.lines
    .filter((line) => line.countedQty !== null && line.diff !== 0)
    .sort((a, b) => Math.abs(b.diffAmount) - Math.abs(a.diffAmount));
}

// ─── Eksport ────────────────────────────────────────────────────────────────

function exportStockCountExcel(record: StockCount) {
  const assessment = assessStockCount(record);
  const summary = [
    { "Ko'rsatkich": "Hujjat", Qiymat: record.id },
    { "Ko'rsatkich": "Sana", Qiymat: fmtDate(record.date) },
    { "Ko'rsatkich": "Sanoqchi", Qiymat: record.countedBy },
    { "Ko'rsatkich": "Qamrov", Qiymat: scopeSummary(record.scope, record.scopeValue) },
    { "Ko'rsatkich": "Turi", Qiymat: record.noLoss ? "Zararsiz to'g'irlash" : "Sanoq (reviziya)" },
    { "Ko'rsatkich": "Sanaldi", Qiymat: `${record.countedLines} / ${record.totalLines}` },
    { "Ko'rsatkich": "To'g'ri chiqdi", Qiymat: record.matchedLines },
    { "Ko'rsatkich": "Kamomad", Qiymat: -Math.round(record.shortageAmount) },
    { "Ko'rsatkich": "Ortiqcha", Qiymat: Math.round(record.surplusAmount) },
    { "Ko'rsatkich": "Sof natija", Qiymat: Math.round(record.netAmount) },
    { "Ko'rsatkich": "Aniqlik", Qiymat: fmtPercent(assessment.accuracy) },
    { "Ko'rsatkich": "Baho", Qiymat: assessment.label },
    { "Ko'rsatkich": "Izoh", Qiymat: record.note ?? "" },
  ];

  const rows = record.lines
    .filter((line) => line.countedQty !== null)
    .map((line) => ({
      Tovar: line.productName,
      Kod: line.customCode,
      Shtrix: line.barcode,
      Ombor: line.warehouse,
      Polka: line.shelfLocation ?? "",
      Birlik: line.unit,
      Dasturda: line.systemQty,
      Haqiqatda: line.countedQty,
      Farq: line.diff,
      Summa: Math.round(line.diffAmount),
    }));

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(summary), "Xulosa");
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), "Tafsilot");
  XLSX.writeFile(book, `${record.id}.xlsx`);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Hisobotni chop etish oynasida ochadi — u yerdan "Save as PDF" qilinadi. */
function printStockCountPdf(record: StockCount, storeName: string) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    toast.error("Brauzer yangi oynani bloklab qo'ydi");
    return;
  }
  const a = assessStockCount(record);
  const accent = a.accuracy >= 98 ? "#059669" : a.accuracy >= 95 ? "#d97706" : "#dc2626";

  const rows = diffLinesOf(record)
    .map(
      (line) => `
        <tr>
          <td>${escapeHtml(line.productName)}<br><span class="muted">${escapeHtml(line.customCode)} · ${escapeHtml(line.warehouse)}</span></td>
          <td class="num">${line.systemQty} ${escapeHtml(line.unit)}</td>
          <td class="num">${line.countedQty} ${escapeHtml(line.unit)}</td>
          <td class="num ${line.diff < 0 ? "neg" : "pos"}">${line.diff > 0 ? "+" : ""}${line.diff}</td>
          <td class="num ${line.diff < 0 ? "neg" : "pos"}">${formatSom(line.diffAmount)}</td>
        </tr>`,
    )
    .join("");

  win.document.write(`<!doctype html>
<html lang="uz">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(record.id)} — Sanoq hisoboti</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #18181b; margin: 0; padding: 24px; }
      h1 { font-size: 20px; margin: 0 0 4px; }
      .muted { color: #71717a; font-size: 11px; }
      .meta { display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; color: #52525b; margin-bottom: 16px; }
      .verdict { border: 2px solid ${accent}; border-radius: 10px; padding: 14px 16px; margin-bottom: 16px;
                 display: flex; align-items: center; gap: 18px; }
      .verdict .big { font-size: 34px; font-weight: 700; line-height: 1; color: ${accent}; }
      .verdict .label { font-size: 15px; font-weight: 600; }
      .tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 18px; }
      .tile { border: 1px solid #e4e4e7; border-radius: 8px; padding: 10px 12px; }
      .tile .k { font-size: 10px; text-transform: uppercase; color: #71717a; letter-spacing: .04em; }
      .tile .v { font-size: 16px; font-weight: 600; margin-top: 3px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { text-align: left; text-transform: uppercase; font-size: 10px; color: #71717a; border-bottom: 1px solid #d4d4d8; padding: 6px 8px; }
      td { border-bottom: 1px solid #f4f4f5; padding: 6px 8px; vertical-align: top; }
      .num { text-align: right; white-space: nowrap; }
      .neg { color: #dc2626; font-weight: 600; }
      .pos { color: #d97706; font-weight: 600; }
      .note { margin-top: 14px; font-size: 12px; }
      .sign { margin-top: 36px; display: flex; gap: 48px; font-size: 12px; }
      .sign div { flex: 1; border-top: 1px solid #a1a1aa; padding-top: 6px; }
      @media print { body { padding: 12mm; } @page { size: A4; margin: 0; } }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(storeName)} — Sanoq (reviziya) hisoboti</h1>
    <div class="meta">
      <span><b>${escapeHtml(record.id)}</b></span>
      <span>${escapeHtml(fmtDate(record.date))}</span>
      <span>Sanoqchi: ${escapeHtml(record.countedBy)}</span>
      <span>${escapeHtml(scopeSummary(record.scope, record.scopeValue))}</span>
      ${record.noLoss ? `<span><b>Zararsiz to'g'irlash</b> — zarar hisoblanmagan</span>` : ""}
      ${record.editCount ? `<span>${record.editCount} marta tahrirlangan</span>` : ""}
    </div>

    <div class="verdict">
      <div>
        <div class="big">${fmtPercent(a.accuracy)}</div>
        <div class="muted">aniqlik</div>
      </div>
      <div>
        <div class="label">${escapeHtml(a.label)}</div>
        <div class="muted">${escapeHtml(a.hint)}</div>
      </div>
    </div>

    <div class="tiles">
      <div class="tile"><div class="k">Sanaldi</div><div class="v">${record.countedLines} / ${record.totalLines}</div></div>
      <div class="tile"><div class="k">To'g'ri chiqdi</div><div class="v">${record.matchedLines} ta</div></div>
      <div class="tile"><div class="k">Kamomad</div><div class="v neg">-${formatSom(record.shortageAmount)}</div></div>
      <div class="tile"><div class="k">Ortiqcha</div><div class="v pos">+${formatSom(record.surplusAmount)}</div></div>
    </div>

    <table>
      <thead>
        <tr><th>Tovar</th><th class="num">Dasturda</th><th class="num">Haqiqatda</th><th class="num">Farq</th><th class="num">Summa</th></tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="5" style="text-align:center;padding:24px;color:#059669">Farq yo'q — barcha qoldiq to'g'ri chiqdi</td></tr>`}
      </tbody>
      <tfoot>
        <tr><td colspan="4" style="text-align:right;font-weight:600">Sof natija</td>
            <td class="num ${record.netAmount < 0 ? "neg" : "pos"}">${formatSom(record.netAmount)}</td></tr>
      </tfoot>
    </table>

    ${record.note ? `<div class="note"><b>Izoh:</b> ${escapeHtml(record.note)}</div>` : ""}

    <div class="sign">
      <div>Sanoqchi: ${escapeHtml(record.countedBy)}</div>
      <div>Rahbar imzosi</div>
    </div>

    <script>window.onload = () => { window.focus(); window.print(); };</script>
  </body>
</html>`);
  win.document.close();
}

// ─── Asosiy komponent ───────────────────────────────────────────────────────

export function Sanoq() {
  const { settings } = useApp();
  const [view, setView] = React.useState<View>("list");
  const [listTab, setListTab] = React.useState<ListTab>("counts");
  const [config, setConfig] = React.useState<SessionConfig>(DEFAULT_CONFIG);
  /** productId -> kiritilgan qiymat. Kalit yo'q yoki "" bo'lsa — sanalmagan. */
  const [counts, setCounts] = React.useState<Record<string, string>>({});
  const [snapshot, setSnapshot] = React.useState<Product[]>([]);
  const [systemQtys, setSystemQtys] = React.useState<Record<string, number>>({});
  const [sessionId, setSessionId] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [rowFilter, setRowFilter] = React.useState<RowFilter>("all");
  // Sessiya ichidagi ko'rinish filtrlari — hujjat qamroviga ta'sir qilmaydi.
  const [viewWarehouse, setViewWarehouse] = React.useState("ALL");
  const [viewShelf, setViewShelf] = React.useState("ALL");
  const [lastScannedId, setLastScannedId] = React.useState<string | null>(null);
  const [finishOpen, setFinishOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [treatUncountedAsZero, setTreatUncountedAsZero] = React.useState(false);
  const [noLossCorrection, setNoLossCorrection] = React.useState(false);
  const [activeRecord, setActiveRecord] = React.useState<StockCount | null>(null);
  const [version, setVersion] = React.useState(0);
  const scanRef = React.useRef<HTMLInputElement>(null);

  const warehouseOptions = React.useMemo(() => {
    const set = new Set<string>((settings.warehouses ?? []).map((w) => w.name));
    MOCK_PRODUCTS.forEach((p) => p.warehouse && set.add(p.warehouse));
    return Array.from(set).sort();
  }, [settings.warehouses]);

  const scopeMatchCount = React.useMemo(
    () => MOCK_PRODUCTS.filter((p) => matchesScope(p, config)).length,
    [config],
  );

  const lines = React.useMemo<StockCountLine[]>(
    () =>
      snapshot.map((product) => {
        const systemQty = systemQtys[product.id] ?? 0;
        const raw = counts[product.id];
        const countedQty =
          raw === undefined || raw.trim() === "" ? null : Math.max(0, Number(raw) || 0);
        const diff = countedQty === null ? 0 : countedQty - systemQty;
        const costPrice = costInSom(product);
        return {
          productId: product.id,
          productName: product.name,
          customCode: product.customCode,
          barcode: product.barcode,
          unit: product.unit,
          warehouse: product.warehouse,
          shelfLocation: product.shelfLocation,
          systemQty,
          countedQty,
          diff,
          costPrice,
          diffAmount: diff * costPrice,
        };
      }),
    [snapshot, systemQtys, counts],
  );

  const sessionWarehouses = React.useMemo(
    () => Array.from(new Set(lines.map((line) => line.warehouse).filter(Boolean))).sort(),
    [lines],
  );

  // Polka ro'yxati tanlangan omborga bog'liq — avval ombor, keyin polka.
  const shelfScope = config.scope === "warehouse" ? config.scopeValue : viewWarehouse;
  const warehouseChosen = Boolean(shelfScope) && shelfScope !== "ALL";

  const sessionShelves = React.useMemo(() => {
    if (!warehouseChosen) return [];
    return Array.from(
      new Set(
        lines
          .filter((line) => line.warehouse === shelfScope)
          .map((line) => line.shelfLocation)
          .filter((value): value is string => !!value),
      ),
    ).sort();
  }, [lines, shelfScope, warehouseChosen]);

  const stats = React.useMemo(() => {
    const counted = lines.filter((line) => line.countedQty !== null);
    const shortage = counted.filter((line) => line.diff < 0);
    const surplus = counted.filter((line) => line.diff > 0);
    return {
      total: lines.length,
      counted: counted.length,
      matched: counted.filter((line) => line.diff === 0).length,
      diffCount: shortage.length + surplus.length,
      shortageAmount: shortage.reduce((sum, line) => sum + Math.abs(line.diffAmount), 0),
      surplusAmount: surplus.reduce((sum, line) => sum + line.diffAmount, 0),
    };
  }, [lines]);

  const visibleLines = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return lines.filter((line) => {
      if (viewWarehouse !== "ALL" && line.warehouse !== viewWarehouse) return false;
      if (viewShelf !== "ALL" && (line.shelfLocation ?? "") !== viewShelf) return false;
      if (rowFilter === "uncounted" && line.countedQty !== null) return false;
      if (rowFilter === "diff" && (line.countedQty === null || line.diff === 0)) return false;
      if (!q) return true;
      return (
        line.productName.toLowerCase().includes(q) ||
        line.barcode.includes(q) ||
        line.customCode.toLowerCase().includes(q)
      );
    });
  }, [lines, query, rowFilter, viewWarehouse, viewShelf]);

  // ── Amallar ───────────────────────────────────────────────────────────────
  const startSession = () => {
    if (config.scope !== "all" && !config.scopeValue) {
      toast.error("Omborni tanlang");
      return;
    }
    const products = MOCK_PRODUCTS.filter((p) => matchesScope(p, config));
    if (products.length === 0) {
      toast.error("Bu qamrovda tovar topilmadi");
      return;
    }
    setSnapshot(products.map((p) => ({ ...p })));
    setSystemQtys(Object.fromEntries(products.map((p) => [p.id, p.vitrinaQty])));
    setSessionId(nextStockCountId());
    setCounts({});
    setQuery("");
    setRowFilter("all");
    setViewWarehouse("ALL");
    setViewShelf("ALL");
    setNote("");
    setTreatUncountedAsZero(false);
    setNoLossCorrection(false);
    setLastScannedId(null);
    setView("session");
    window.setTimeout(() => scanRef.current?.focus(), 50);
  };

  const setCount = (productId: string, value: string) => {
    setCounts((current) => ({ ...current, [productId]: value }));
  };

  /**
   * Bitta input ikki vazifani bajaradi: yozilgani bo'yicha ro'yxat filtrlanadi,
   * Enter bosilganda esa aniq mos tovar (yoki yagona qolgan natija) +1 sanaladi.
   */
  const handleScan = () => {
    const code = query.trim().toLowerCase();
    if (!code) return;
    const line =
      lines.find(
        (item) => item.barcode.toLowerCase() === code || item.customCode.toLowerCase() === code,
      ) ?? (visibleLines.length === 1 ? visibleLines[0] : undefined);

    if (!line) {
      toast.error(`"${query.trim()}" bu sanoqda topilmadi`);
      return;
    }
    const previous = Number(counts[line.productId] ?? 0) || 0;
    setCount(line.productId, String(previous + 1));
    setLastScannedId(line.productId);
    setQuery("");
    toast.success(`${line.productName} → ${previous + 1} ${line.unit}`);
  };

  const cancelSession = () => {
    setView("list");
    setSnapshot([]);
    setSystemQtys({});
    setCounts({});
  };

  const linesToApply = React.useMemo<StockCountLine[]>(() => {
    if (!treatUncountedAsZero) return lines;
    return lines.map((line) =>
      line.countedQty === null
        ? {
            ...line,
            countedQty: 0,
            diff: -line.systemQty,
            diffAmount: -line.systemQty * line.costPrice,
          }
        : line,
    );
  }, [lines, treatUncountedAsZero]);

  const finishSummary = React.useMemo(() => {
    const counted = linesToApply.filter((line) => line.countedQty !== null);
    const shortageAmount = counted
      .filter((line) => line.diff < 0)
      .reduce((sum, line) => sum + Math.abs(line.diffAmount), 0);
    const surplusAmount = counted
      .filter((line) => line.diff > 0)
      .reduce((sum, line) => sum + line.diffAmount, 0);
    return {
      counted: counted.length,
      diffLines: counted.filter((line) => line.diff !== 0),
      shortageAmount: noLossCorrection ? 0 : shortageAmount,
      surplusAmount: noLossCorrection ? 0 : surplusAmount,
      netAmount: noLossCorrection ? 0 : surplusAmount - shortageAmount,
    };
  }, [linesToApply, noLossCorrection]);

  const confirmFinish = () => {
    if (finishSummary.counted === 0) {
      toast.error("Hech bir tovar sanalmadi");
      return;
    }
    const record = applyStockCount({
      id: sessionId,
      countedBy: settings.username,
      scope: config.scope,
      scopeValue: config.scope === "all" ? undefined : config.scopeValue,
      note,
      lines: linesToApply,
      noLoss: noLossCorrection,
    });
    setFinishOpen(false);
    setSnapshot([]);
    setSystemQtys({});
    setCounts({});
    setActiveRecord(record);
    setView("report");
    toast.success(`${record.id} yakunlandi`);
  };

  const exportSession = () => {
    const rows = lines.map((line) => ({
      Tovar: line.productName,
      Kod: line.customCode,
      Ombor: line.warehouse,
      Polka: line.shelfLocation ?? "",
      Birlik: line.unit,
      Dasturda: line.systemQty,
      Haqiqatda: line.countedQty ?? "",
      Farq: line.countedQty === null ? "" : line.diff,
      Summa: line.countedQty === null ? "" : Math.round(line.diffAmount),
    }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), "Sanoq");
    XLSX.writeFile(book, `${sessionId || "sanoq"}-jarayon.xlsx`);
  };

  /** Hali yakunlanmagan sessiyani ham PDF qilib ko'rish/chop etish uchun — joriy holatdan vaqtinchalik hujjat yasaydi. */
  const exportSessionPdf = () => {
    const preview: StockCount = {
      id: sessionId || "SAN-jarayon",
      date: new Date().toISOString(),
      countedBy: settings.username,
      scope: config.scope,
      scopeValue: config.scope === "all" ? undefined : config.scopeValue,
      lines,
      ...stockCountTotals(lines),
    };
    printStockCountPdf(preview, settings.receiptSettings?.storeName ?? "UZKO");
  };

  // ── Hisobot ───────────────────────────────────────────────────────────────
  if (view === "report" && activeRecord) {
    return (
      <ReportView
        record={activeRecord}
        storeName={settings.receiptSettings?.storeName ?? "UZKO"}
        onBack={() => {
          setActiveRecord(null);
          setView("list");
          setVersion((v) => v + 1);
        }}
        onEdit={() => setView("edit")}
      />
    );
  }

  // ── Tahrirlash ────────────────────────────────────────────────────────────
  if (view === "edit" && activeRecord) {
    return (
      <EditView
        record={activeRecord}
        editedBy={settings.username}
        onCancel={() => setView("report")}
        onSaved={() => {
          setVersion((v) => v + 1);
          setView("report");
        }}
      />
    );
  }

  // ── Ro'yxat ───────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div className="flex h-full flex-col" key={version}>
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-4 py-3">
          <div className="mr-auto flex items-center gap-1">
            <Button
              variant={listTab === "counts" ? "default" : "ghost"}
              size="sm"
              className="gap-2"
              onClick={() => setListTab("counts")}
            >
              <ClipboardList className="h-4 w-4" />
              Sanoq tarixi
            </Button>
            <Button
              variant={listTab === "edits" ? "default" : "ghost"}
              size="sm"
              className="gap-2"
              onClick={() => setListTab("edits")}
            >
              <History className="h-4 w-4" />
              Sanoq tahrirlash tarixi
            </Button>
          </div>
          <Button size="sm" className="gap-2" onClick={() => setView("setup")}>
            <Plus className="h-4 w-4" />
            Yangi sanoq
          </Button>
        </div>

        {listTab === "counts" ? (
          <CountsTable
            initialDateMode="today"
            onOpen={(record) => {
              setActiveRecord(record);
              setView("report");
            }}
            onEdit={(record) => {
              setActiveRecord(record);
              setView("edit");
            }}
          />
        ) : (
          <EditsTable />
        )}
      </div>
    );
  }

  // ── Sozlash ───────────────────────────────────────────────────────────────
  if (view === "setup") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-3">
          <div className="mr-auto text-sm font-semibold">Yangi sanoq — qamrovni tanlang</div>
          <Button variant="outline" size="sm" onClick={() => setView("list")}>
            Orqaga
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          <div className="mx-auto flex max-w-xl flex-col gap-4">
            <Label className="text-muted-foreground">Nimani sanaymiz?</Label>

            <div className="flex flex-col gap-2">
              {SCOPE_OPTIONS.map((option) => {
                const active = config.scope === option.scope;
                const Icon = option.icon;
                return (
                  <div
                    key={option.scope}
                    className={`rounded-lg border transition-colors ${
                      active ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setConfig({ scope: option.scope, scopeValue: "" })}
                      className="flex w-full items-center gap-3 p-3 text-left"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                          active ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{option.title}</span>
                        <span className="block text-xs text-muted-foreground">{option.hint}</span>
                      </span>
                      {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                    </button>

                    {active && option.scope !== "all" && (
                      <div className="border-t px-3 py-3">
                        <Select
                          value={config.scopeValue}
                          onValueChange={(value) => setConfig((c) => ({ ...c, scopeValue: value }))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={option.placeholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouseOptions.map((name) => (
                              <SelectItem key={name} value={name}>
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {warehouseOptions.length === 0 && (
                          <p className="mt-2 text-xs text-muted-foreground">{option.emptyHint}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Sanaladigan tovar</span>
              <span className="text-lg font-semibold">{scopeMatchCount} ta</span>
            </div>

            <Button size="lg" className="gap-2" onClick={startSession}>
              <ClipboardList className="h-4 w-4" />
              Sanoqni boshlash
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Sanoq jarayoni ────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-2 border-b bg-muted/30 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="font-mono">{sessionId}</Badge>
          <Badge variant="outline">{scopeSummary(config.scope, config.scopeValue)}</Badge>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Yuklab olish
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportSession} className="gap-2">
                  <Download className="h-4 w-4" />
                  Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportSessionPdf} className="gap-2">
                  <FileText className="h-4 w-4" />
                  PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" className="gap-2" onClick={cancelSession}>
              <X className="h-4 w-4" />
              Bekor qilish
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setFinishOpen(true)}>
              <Check className="h-4 w-4" />
              Yakunlash
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-64 flex-1">
            <Barcode className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={scanRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleScan();
                }
              }}
              placeholder="Shtrix-kod skaner qiling yoki nom / kod bo'yicha qidiring — Enter +1"
              className="pl-8"
            />
          </div>
          <div className="flex items-center gap-1">
            {(
              [
                ["all", `Hammasi ${stats.total}`],
                ["uncounted", `Sanalmagan ${stats.total - stats.counted}`],
                ["diff", `Farqli ${stats.diffCount}`],
              ] as [RowFilter, string][]
            ).map(([value, label]) => (
              <Button
                key={value}
                variant={rowFilter === value ? "default" : "outline"}
                size="sm"
                onClick={() => setRowFilter(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Bo'lib sanash:</span>

          {sessionWarehouses.length > 1 && (
            <Select
              value={viewWarehouse}
              onValueChange={(value) => {
                setViewWarehouse(value);
                setViewShelf("ALL"); // ombor almashsa polka tanlovi kuchini yo'qotadi
              }}
            >
              <SelectTrigger className="h-8 w-48">
                <SelectValue placeholder="Ombor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Barcha omborlar</SelectItem>
                {sessionWarehouses.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={viewShelf} onValueChange={setViewShelf} disabled={!warehouseChosen}>
            <SelectTrigger className="h-8 w-44">
              <SelectValue placeholder={warehouseChosen ? "Polka" : "Avval omborni tanlang"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Barcha polkalar</SelectItem>
              {sessionShelves.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(viewWarehouse !== "ALL" || viewShelf !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => {
                setViewWarehouse("ALL");
                setViewShelf("ALL");
              }}
            >
              <X className="h-3.5 w-3.5" />
              Tozalash
            </Button>
          )}

          <span className="text-xs text-muted-foreground">
            Ekranda {visibleLines.length} ta — hisob-kitob butun sanoq bo'yicha
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
            <tr className="border-b text-xs uppercase text-muted-foreground">
              <th className="px-4 py-2 text-left">Tovar</th>
              <th className="px-4 py-2 text-right">Dasturda</th>
              <th className="px-4 py-2 text-center">Haqiqatda</th>
              <th className="px-4 py-2 text-right">Farq</th>
              <th className="px-4 py-2 text-right">Summa</th>
            </tr>
          </thead>
          <tbody>
            {visibleLines.map((line) => (
              <tr
                key={line.productId}
                className={`border-b ${rowTone(line)} ${
                  lastScannedId === line.productId ? "ring-1 ring-inset ring-primary/40" : ""
                }`}
              >
                <td className="px-4 py-2">
                  <div className="font-medium">{line.productName}</div>
                  <div className="text-xs text-muted-foreground">
                    {[line.customCode, line.warehouse, line.shelfLocation]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {line.systemQty} {line.unit}
                </td>
                <td className="px-4 py-2">
                  <Input
                    inputMode="numeric"
                    value={counts[line.productId] ?? ""}
                    onChange={(e) => setCount(line.productId, e.target.value)}
                    placeholder="—"
                    className="mx-auto h-8 w-24 text-center"
                  />
                </td>
                <td className={`px-4 py-2 text-right font-semibold tabular-nums ${diffTone(line)}`}>
                  {line.countedQty === null ? "—" : line.diff > 0 ? `+${line.diff}` : line.diff}
                </td>
                <td className={`px-4 py-2 text-right tabular-nums ${diffTone(line)}`}>
                  {line.countedQty === null || line.diff === 0 ? "—" : formatSom(line.diffAmount)}
                </td>
              </tr>
            ))}
            {visibleLines.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Bu filtrga mos tovar yo'q
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t bg-muted/30 px-4 py-2 text-sm">
        <span className="text-muted-foreground">
          Sanaldi: <b className="text-foreground">{stats.counted}</b> / {stats.total}
        </span>
        <span className="text-emerald-600">To'g'ri: {stats.matched}</span>
        <span className="text-destructive">Kamomad: -{formatSom(stats.shortageAmount)}</span>
        <span className="text-amber-600">Ortiqcha: +{formatSom(stats.surplusAmount)}</span>
        <span className="ml-auto font-semibold">
          Natija: {formatSom(stats.surplusAmount - stats.shortageAmount)}
        </span>
      </div>

      <Dialog open={finishOpen} onOpenChange={setFinishOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{sessionId} — sanoqni yakunlash</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <label className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm">
              <Checkbox
                checked={treatUncountedAsZero}
                onCheckedChange={(value) => setTreatUncountedAsZero(value === true)}
                className="mt-0.5"
              />
              <span>
                Sanalmagan {stats.total - stats.counted} ta tovarni 0 deb hisoblash
                <span className="block text-xs text-muted-foreground">
                  Belgilanmasa — sanalmagan tovarlarga tegilmaydi, qoldig'i o'zgarmaydi.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm">
              <Checkbox
                checked={noLossCorrection}
                onCheckedChange={(value) => setNoLossCorrection(value === true)}
                className="mt-0.5"
              />
              <span>
                Zararsiz to'g'irlash
                <span className="block text-xs text-muted-foreground">
                  Farqlar kamomad/ortiqcha (zarar) sifatida hisoblanmaydi — faqat bazadagi tovar
                  qoldig'i haqiqiy songa to'g'irlanadi.
                </span>
              </span>
            </label>

            <div className="grid grid-cols-3 gap-2 text-sm">
              <StatTile
                label="Kamomad"
                value={`-${formatSom(finishSummary.shortageAmount)}`}
                tone="text-destructive"
              />
              <StatTile
                label="Ortiqcha"
                value={`+${formatSom(finishSummary.surplusAmount)}`}
                tone="text-amber-600"
              />
              <StatTile
                label="Sof natija"
                value={formatSom(finishSummary.netAmount)}
                tone={finishSummary.netAmount < 0 ? "text-destructive" : "text-emerald-600"}
              />
            </div>

            <div className="max-h-64 overflow-auto rounded-md border">
              <DiffTable lines={finishSummary.diffLines} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Izoh</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Masalan: oylik sanoq, sabab, kimlar qatnashdi"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFinishOpen(false)}>
              Bekor
            </Button>
            <Button onClick={confirmFinish} className="gap-2">
              <Check className="h-4 w-4" />
              Tasdiqlash va hisobotni ko'rish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Umumiy bo'laklar ───────────────────────────────────────────────────────

function rowTone(line: StockCountLine) {
  if (line.countedQty === null) return "";
  if (line.diff < 0) return "bg-destructive/5";
  if (line.diff > 0) return "bg-amber-500/10";
  return "bg-emerald-500/5";
}

function diffTone(line: StockCountLine) {
  if (line.countedQty === null) return "text-muted-foreground";
  if (line.diff < 0) return "text-destructive";
  if (line.diff > 0) return "text-amber-600";
  return "text-emerald-600";
}

function StatTile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-semibold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

function DiffTable({ lines }: { lines: StockCountLine[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-muted/90 backdrop-blur">
        <tr className="border-b text-xs uppercase text-muted-foreground">
          <th className="px-3 py-2 text-left">Tovar</th>
          <th className="px-3 py-2 text-right">Dasturda</th>
          <th className="px-3 py-2 text-right">Haqiqatda</th>
          <th className="px-3 py-2 text-right">Farq</th>
          <th className="px-3 py-2 text-right">Summa</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => (
          <tr key={line.productId} className="border-b">
            <td className="px-3 py-1.5">
              <div>{line.productName}</div>
              <div className="text-xs text-muted-foreground">
                {[line.customCode, line.warehouse, line.shelfLocation].filter(Boolean).join(" · ")}
              </div>
            </td>
            <td className="px-3 py-1.5 text-right tabular-nums">{line.systemQty}</td>
            <td className="px-3 py-1.5 text-right tabular-nums">{line.countedQty}</td>
            <td className={`px-3 py-1.5 text-right font-semibold tabular-nums ${diffTone(line)}`}>
              {line.diff > 0 ? `+${line.diff}` : line.diff}
            </td>
            <td className={`px-3 py-1.5 text-right tabular-nums ${diffTone(line)}`}>
              {formatSom(line.diffAmount)}
            </td>
          </tr>
        ))}
        {lines.length === 0 && (
          <tr>
            <td colSpan={5} className="px-3 py-8 text-center text-emerald-600">
              Farq yo'q — barcha qoldiq to'g'ri chiqdi
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

// ─── Sanoq tarixi ───────────────────────────────────────────────────────────

function matchesCountQuery(record: StockCount, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    record.id.toLowerCase().includes(q) ||
    record.countedBy.toLowerCase().includes(q) ||
    scopeSummary(record.scope, record.scopeValue).toLowerCase().includes(q)
  );
}

function CountsTable({
  onOpen,
  onEdit,
  initialDateMode = "all",
}: {
  onOpen: (record: StockCount) => void;
  onEdit: (record: StockCount) => void;
  initialDateMode?: DateMode;
}) {
  const { settings } = useApp();
  const [query, setQuery] = React.useState("");
  const [dateMode, setDateMode] = React.useState<DateMode>(initialDateMode);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [version, setVersion] = React.useState(0);

  const filtered = React.useMemo(
    () =>
      MOCK_STOCK_COUNTS.filter(
        (record) =>
          matchesCountQuery(record, query) && matchesDateFilter(record.date, dateMode, from, to),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, dateMode, from, to, version],
  );

  /** Hujjatni o'chiradi — sanalgan tovarlar qoldig'ini sanoqdan oldingi holatiga qaytaradi. */
  const deleteRecord = (record: StockCount) => {
    const ok = window.confirm(
      `"${record.id}" sanoq hujjatini o'chirasizmi? Tovar qoldig'i sanoqdan oldingi holatiga qaytariladi.`,
    );
    if (!ok) return;

    const countedQtys: Record<string, number | null> = {};
    record.lines.forEach((line) => {
      if (line.countedQty !== null) countedQtys[line.productId] = null;
    });
    if (Object.keys(countedQtys).length > 0) {
      editStockCount({
        record,
        editedBy: settings.username,
        note: `${record.id} o'chirildi`,
        countedQtys,
      });
    }

    const idx = MOCK_STOCK_COUNTS.findIndex((r) => r.id === record.id);
    if (idx >= 0) MOCK_STOCK_COUNTS.splice(idx, 1);
    // Tahrir tarixi (shu jumladan shu o'chirish yozuvi) qoldiriladi —
    // "Sanoq tahrirlash tarixi" bo'limida ko'rinishda davom etadi.

    setVersion((v) => v + 1);
    toast.success("Sanoq hujjati o'chirildi", {
      description: "Tovar qoldig'i qaytarildi, amal tahrirlash tarixiga ko'chirildi",
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <HistoryFilters
        productQuery={query}
        onProductQueryChange={setQuery}
        searchLabel="Hujjat raqami yoki sanoqchi bo'yicha qidirish"
        searchPlaceholder="Masalan: SAN-000123..."
        dateMode={dateMode}
        onDateModeChange={setDateMode}
        from={from}
        onFromChange={setFrom}
        to={to}
        onToChange={setTo}
        summaryLabel="Jami natija"
        summaryValue={formatSom(filtered.reduce((sum, r) => sum + r.netAmount, 0))}
      />

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
            <tr className="border-b text-xs uppercase text-muted-foreground">
              <th className="px-4 py-2 text-left">Hujjat</th>
              <th className="px-4 py-2 text-left">Sana</th>
              <th className="px-4 py-2 text-left">Qamrov</th>
              <th className="px-4 py-2 text-right">Sanaldi</th>
              <th className="px-4 py-2 text-right">Aniqlik</th>
              <th className="px-4 py-2 text-right">Natija</th>
              <th className="px-4 py-2 text-left">Kim</th>
              <th className="px-4 py-2 text-center">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((record) => {
              const a = assessStockCount(record);
              return (
                <tr key={record.id} className="border-b hover:bg-muted/40">
                  <td className="px-4 py-2 font-mono font-medium">
                    {record.id}
                    {record.noLoss && (
                      <Badge
                        variant="outline"
                        className="ml-2 border-sky-300 bg-sky-50 text-[10px] text-sky-700"
                      >
                        Zararsiz
                      </Badge>
                    )}
                    {Boolean(record.editCount) && (
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        {record.editCount}× tahrir
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{fmtDate(record.date)}</td>
                  <td className="px-4 py-2">{scopeSummary(record.scope, record.scopeValue)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {record.countedLines} / {record.totalLines}
                  </td>
                  <td className={`px-4 py-2 text-right font-semibold tabular-nums ${a.tone.text}`}>
                    {fmtPercent(a.accuracy)}
                    <span className="ml-1 text-xs font-normal">{a.label}</span>
                  </td>
                  <td
                    className={`px-4 py-2 text-right font-semibold tabular-nums ${
                      record.netAmount < 0
                        ? "text-destructive"
                        : record.netAmount > 0
                          ? "text-amber-600"
                          : "text-emerald-600"
                    }`}
                  >
                    {formatSom(record.netAmount)}
                  </td>
                  <td className="px-4 py-2">{record.countedBy}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        aria-label="Hisobotni ko'rish"
                        title="Hisobotni ko'rish"
                        onClick={() => onOpen(record)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        aria-label="Tahrirlash"
                        title="Tahrirlash"
                        onClick={() => onEdit(record)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        aria-label="O'chirish"
                        title="O'chirish"
                        onClick={() => deleteRecord(record)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  Hali sanoq o'tkazilmagan. "Yangi sanoq" tugmasi bilan boshlang.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Sanoq tahrirlash tarixi ────────────────────────────────────────────────

function EditsTable() {
  const [detail, setDetail] = React.useState<StockCountEdit | null>(null);

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
          <tr className="border-b text-xs uppercase text-muted-foreground">
            <th className="px-4 py-2 text-left">Sana</th>
            <th className="px-4 py-2 text-left">Hujjat</th>
            <th className="px-4 py-2 text-right">O'zgarish</th>
            <th className="px-4 py-2 text-right">Natija: eski → yangi</th>
            <th className="px-4 py-2 text-left">Kim</th>
            <th className="px-4 py-2 text-left">Izoh</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {MOCK_STOCK_COUNT_EDITS.map((edit) => (
            <tr key={edit.id} className="border-b hover:bg-muted/40">
              <td className="px-4 py-2 text-muted-foreground">{fmtDate(edit.date)}</td>
              <td className="px-4 py-2 font-mono font-medium">{edit.stockCountId}</td>
              <td className="px-4 py-2 text-right tabular-nums">{edit.changes.length} ta tovar</td>
              <td className="px-4 py-2 text-right tabular-nums">
                <span className="text-muted-foreground">{formatSom(edit.oldNetAmount)}</span>
                <span className="mx-1">→</span>
                <span
                  className={`font-semibold ${
                    edit.newNetAmount < edit.oldNetAmount ? "text-destructive" : "text-emerald-600"
                  }`}
                >
                  {formatSom(edit.newNetAmount)}
                </span>
              </td>
              <td className="px-4 py-2">{edit.editedBy}</td>
              <td className="px-4 py-2 text-muted-foreground">{edit.note ?? "—"}</td>
              <td className="px-4 py-2 text-right">
                <Button variant="ghost" size="sm" onClick={() => setDetail(edit)}>
                  Batafsil
                </Button>
              </td>
            </tr>
          ))}
          {MOCK_STOCK_COUNT_EDITS.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                Hali birorta sanoq tahrirlanmagan.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {detail?.stockCountId} tahriri · {detail ? fmtDate(detail.date) : ""}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="max-h-96 overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/90 backdrop-blur">
                  <tr className="border-b text-xs uppercase text-muted-foreground">
                    <th className="px-3 py-2 text-left">Tovar</th>
                    <th className="px-3 py-2 text-right">Eski</th>
                    <th className="px-3 py-2 text-right">Yangi</th>
                    <th className="px-3 py-2 text-right">Qoldiqqa</th>
                    <th className="px-3 py-2 text-right">Summa</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.changes.map((change) => (
                    <tr key={change.productId} className="border-b">
                      <td className="px-3 py-1.5">{change.productName}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                        {change.oldCountedQty ?? "—"}
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium tabular-nums">
                        {change.newCountedQty ?? "—"}
                      </td>
                      <td
                        className={`px-3 py-1.5 text-right font-semibold tabular-nums ${
                          change.stockDelta < 0 ? "text-destructive" : "text-emerald-600"
                        }`}
                      >
                        {change.stockDelta > 0 ? `+${change.stockDelta}` : change.stockDelta}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {formatSom(change.amountDelta)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDetail(null)}>Yopish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Hisobot ────────────────────────────────────────────────────────────────

function ReportView({
  record,
  storeName,
  onBack,
  onEdit,
}: {
  record: StockCount;
  storeName: string;
  onBack: () => void;
  onEdit: () => void;
}) {
  const a = assessStockCount(record);
  const diffs = diffLinesOf(record);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-4 py-3">
        <Button variant="ghost" size="sm" className="gap-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Ro'yxat
        </Button>
        <Badge className="font-mono">{record.id}</Badge>
        <Badge variant="outline">{scopeSummary(record.scope, record.scopeValue)}</Badge>
        {record.noLoss && (
          <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-700">
            Zararsiz to'g'irlash
          </Badge>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => exportStockCountExcel(record)}
          >
            <Download className="h-4 w-4" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => printStockCountPdf(record, storeName)}
          >
            <FileText className="h-4 w-4" />
            PDF
          </Button>
          <Button size="sm" className="gap-2" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Tahrirlash
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          <div
            className={`flex flex-wrap items-center gap-6 rounded-lg border-2 p-5 ${a.tone.border} ${a.tone.bg}`}
          >
            <div>
              <div className={`text-4xl font-bold leading-none ${a.tone.text}`}>
                {fmtPercent(a.accuracy)}
              </div>
              <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                aniqlik
              </div>
            </div>
            <div className="min-w-48 flex-1">
              <div className={`text-lg font-semibold ${a.tone.text}`}>{a.label}</div>
              <p className="text-sm text-muted-foreground">{a.hint}</p>
            </div>
            <div className="text-sm text-muted-foreground">
              <div>{fmtDate(record.date)}</div>
              <div>Sanoqchi: {record.countedBy}</div>
              {Boolean(record.editCount) && (
                <div className="text-amber-600">{record.editCount} marta tahrirlangan</div>
              )}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Sanaldi" value={`${record.countedLines} / ${record.totalLines} ta`} />
            <StatTile
              label="To'g'ri chiqdi"
              value={`${record.matchedLines} ta · ${fmtPercent(a.positionAccuracy)}`}
              tone="text-emerald-600"
            />
            <StatTile
              label={`Kamomad (${record.shortageQty} dona)`}
              value={`-${formatSom(record.shortageAmount)}`}
              tone="text-destructive"
            />
            <StatTile
              label={`Ortiqcha (${record.surplusQty} dona)`}
              value={`+${formatSom(record.surplusAmount)}`}
              tone="text-amber-600"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-4 py-3">
            <span className="text-sm text-muted-foreground">
              Sanalgan tovar qiymati {formatSom(record.countedValue)} — shundan{" "}
              {fmtPercent(a.lossShare * 100)} yo'qolgan
            </span>
            <span
              className={`text-lg font-bold ${
                record.netAmount < 0 ? "text-destructive" : "text-emerald-600"
              }`}
            >
              Sof natija: {formatSom(record.netAmount)}
            </span>
          </div>

          {record.note && (
            <div className="rounded-lg border p-3 text-sm">
              <span className="text-muted-foreground">Izoh: </span>
              {record.note}
            </div>
          )}

          <div className="overflow-hidden rounded-lg border">
            <div className="border-b bg-muted/40 px-4 py-2 text-sm font-semibold">
              Farq chiqqan tovarlar ({diffs.length} ta)
            </div>
            <DiffTable lines={diffs} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Yakunlangan sanoqni tahrirlash ─────────────────────────────────────────

function EditView({
  record,
  editedBy,
  onCancel,
  onSaved,
}: {
  record: StockCount;
  editedBy: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [drafts, setDrafts] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(
      record.lines.map((line) => [
        line.productId,
        line.countedQty === null ? "" : String(line.countedQty),
      ]),
    ),
  );
  const [query, setQuery] = React.useState("");
  const [onlyChanged, setOnlyChanged] = React.useState(false);
  const [note, setNote] = React.useState("");

  const isChanged = React.useCallback(
    (line: StockCountLine) => {
      const raw = drafts[line.productId] ?? "";
      const value = raw.trim() === "" ? null : Math.max(0, Number(raw) || 0);
      return value !== line.countedQty;
    },
    [drafts],
  );

  const changedCount = record.lines.filter(isChanged).length;

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return record.lines.filter((line) => {
      if (onlyChanged && !isChanged(line)) return false;
      if (!q) return true;
      return (
        line.productName.toLowerCase().includes(q) ||
        line.barcode.includes(q) ||
        line.customCode.toLowerCase().includes(q)
      );
    });
  }, [record.lines, query, onlyChanged, isChanged]);

  const save = () => {
    if (changedCount === 0) {
      toast.error("Hech narsa o'zgartirilmadi");
      return;
    }
    const countedQtys: Record<string, number | null> = {};
    record.lines.forEach((line) => {
      if (!isChanged(line)) return;
      const raw = drafts[line.productId] ?? "";
      countedQtys[line.productId] = raw.trim() === "" ? null : Math.max(0, Number(raw) || 0);
    });

    const edit = editStockCount({ record, editedBy, note, countedQtys });
    if (!edit) {
      toast.error("O'zgarish qo'llanmadi");
      return;
    }
    toast.success(`${record.id} tahrirlandi — ${edit.changes.length} ta tovar`);
    onSaved();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-2 border-b bg-muted/30 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-2" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
            Hisobot
          </Button>
          <Badge className="font-mono">{record.id}</Badge>
          <Badge variant="outline">Tahrirlash</Badge>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              Bekor
            </Button>
            <Button size="sm" className="gap-2" onClick={save} disabled={changedCount === 0}>
              <Save className="h-4 w-4" />
              Saqlash{changedCount > 0 ? ` (${changedCount})` : ""}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tovar nomi yoki kodi bo'yicha qidirish"
            className="h-8 min-w-64 flex-1"
          />
          <Button
            variant={onlyChanged ? "default" : "outline"}
            size="sm"
            onClick={() => setOnlyChanged((value) => !value)}
          >
            Faqat o'zgargani {changedCount > 0 ? `(${changedCount})` : ""}
          </Button>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tahrir sababi (izoh)"
            className="h-8 min-w-56 flex-1"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Qoldiq farq qadar siljitiladi — sanoqdan keyin bo'lgan savdolar yo'qolmaydi.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
            <tr className="border-b text-xs uppercase text-muted-foreground">
              <th className="px-4 py-2 text-left">Tovar</th>
              <th className="px-4 py-2 text-right">Dasturda edi</th>
              <th className="px-4 py-2 text-right">Sanalgani</th>
              <th className="px-4 py-2 text-center">Yangi son</th>
              <th className="px-4 py-2 text-right">Yangi farq</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((line) => {
              const raw = drafts[line.productId] ?? "";
              const value = raw.trim() === "" ? null : Math.max(0, Number(raw) || 0);
              const newDiff = value === null ? null : value - line.systemQty;
              return (
                <tr
                  key={line.productId}
                  className={`border-b ${isChanged(line) ? "bg-primary/5" : ""}`}
                >
                  <td className="px-4 py-2">
                    <div className="font-medium">{line.productName}</div>
                    <div className="text-xs text-muted-foreground">
                      {[line.customCode, line.warehouse, line.shelfLocation]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {line.systemQty} {line.unit}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                    {line.countedQty ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      inputMode="numeric"
                      value={raw}
                      onChange={(e) =>
                        setDrafts((current) => ({ ...current, [line.productId]: e.target.value }))
                      }
                      placeholder="—"
                      className="mx-auto h-8 w-24 text-center"
                    />
                  </td>
                  <td
                    className={`px-4 py-2 text-right font-semibold tabular-nums ${
                      newDiff === null
                        ? "text-muted-foreground"
                        : newDiff < 0
                          ? "text-destructive"
                          : newDiff > 0
                            ? "text-amber-600"
                            : "text-emerald-600"
                    }`}
                  >
                    {newDiff === null ? "—" : newDiff > 0 ? `+${newDiff}` : newDiff}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Mos tovar topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
