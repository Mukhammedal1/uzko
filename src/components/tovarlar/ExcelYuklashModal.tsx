import * as React from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { MOCK_RATES, formatSom } from "@/lib/mock-data";
import {
  PrintNewBarcodesDialog,
  type PrintBarcodeItem,
} from "@/components/tovarlar/PrintNewBarcodesDialog";
import { Barcode } from "lucide-react";

// ─── Ranglar (spetsifikatsiya bo'yicha qat'iy — boshqa rang ishlatilmaydi) ──
const C = {
  text: "#222C3B",
  secondary: "#737D91",
  faint: "#AEB9D4",
  line: "rgba(174,185,212,0.35)",
  action: "#0836B0",
  error: "#B3261E",
};

// ─── Ommaviy shartnoma ──────────────────────────────────────────────────────

export type ImportRow = {
  name: string;
  quantity: number;
  purchase_price: number | null;
  purchase_currency_id: number | null;
  retail_price: number | null;
  retail_currency_id: number | null;
  wholesale_price: number | null;
  wholesale_currency_id: number | null;
  barcodes: string[];
  stock_id: number | null;
  shelf_number_id: number | null;
  agent_id: number | null;
};

/** Agent tanlanganda — unga hozir necha pul berilayotgani va qayerdan to'lanayotgani. */
export type ImportPayment = {
  agentId: number;
  paidAmount: number;
  source: "kassa" | "keyin";
};

export type ExcelYuklashModalProps = {
  currencies: { id: number; code: string; name: string }[];
  stocks: { id: number; name: string }[];
  shelfNumbers: { id: number; name: string; stock_id: number }[];
  agents: { id: number; name: string }[];
  onClose: () => void;
  onSubmit: (rows: ImportRow[], payment?: ImportPayment) => Promise<void>;
};

// ─── Ustundan biriktiriladigan maydonlar (hardcode) ────────────────────────
// Ombor / polka / agent bu yerda yo'q — ular yuqorida umumiy tanlov sifatida so'raladi.

type FieldKey = "name" | "quantity" | "purchase_price" | "retail_price" | "wholesale_price" | "barcode";

// Avtomatik biriktirish uchun kalit so'zlar — aniqroqlari oldin tekshiriladi.
const AUTO_HINTS: { key: FieldKey; hints: string[] }[] = [
  { key: "barcode", hints: ["shtrix", "barcode", "штрих"] },
  { key: "wholesale_price", hints: ["optom", "опт", "wholesale"] },
  { key: "purchase_price", hints: ["tan", "zakup", "себест", "purchase", "закуп"] },
  { key: "retail_price", hints: ["sotuv", "chakana", "retail", "розниц"] },
  { key: "quantity", hints: ["soni", "son", "miqdor", "qty", "quantity", "кол"] },
  { key: "name", hints: ["nomi", "nom", "tovar", "mahsulot", "name", "наим", "товар"] },
];

const PAGE_SIZE = 10;

type Mapping = Record<FieldKey, string | null>;

const EMPTY_MAPPING: Mapping = {
  name: null,
  quantity: null,
  purchase_price: null,
  retail_price: null,
  wholesale_price: null,
  barcode: null,
};

type NumberCell = { value: number | null; invalid: boolean };

type ParsedRow = {
  line: number; // faylda qatorning ko'rinadigan raqami (1-based, sarlavhalarni hisobga olib)
  name: string;
  quantity: NumberCell;
  purchase: NumberCell;
  retail: NumberCell;
  wholesale: NumberCell;
  barcodes: string[];
};

type ValidatedRow = ParsedRow & {
  errors: string[];
};

function generateBarcode(): string {
  return "8690" + String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, "0");
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parseOptionalNumber(raw: unknown): NumberCell {
  const str = cellText(raw);
  if (str === "") return { value: null, invalid: false };
  const cleaned = str.replace(/\s+/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? { value: n, invalid: false } : { value: null, invalid: true };
}

function splitBarcodes(raw: unknown): string[] {
  const str = cellText(raw);
  if (!str) return [];
  return str
    .split(/[\n,;|/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ExcelYuklashModal({
  currencies,
  stocks,
  shelfNumbers,
  agents,
  onClose,
  onSubmit,
}: ExcelYuklashModalProps) {
  const [status, setStatus] = React.useState<"empty" | "parsing" | "loaded">("empty");
  const [dragOver, setDragOver] = React.useState(false);
  const [fileName, setFileName] = React.useState("");
  const [allRows, setAllRows] = React.useState<unknown[][]>([]);
  const [skipRows, setSkipRows] = React.useState(1);
  const [mapping, setMapping] = React.useState<Mapping>(EMPTY_MAPPING);

  // ─── Yuqoridagi 4 ta umumiy tanlov ────────────────────────────────────────
  const [stockId, setStockId] = React.useState<number | null>(stocks[0]?.id ?? null);
  const [shelfId, setShelfId] = React.useState<number | null>(null);
  const [agentId, setAgentId] = React.useState<number | null>(null);
  const [purchaseCurrencyId, setPurchaseCurrencyId] = React.useState<number | null>(
    currencies[0]?.id ?? null,
  );
  const [retailCurrencyId, setRetailCurrencyId] = React.useState<number | null>(
    currencies[0]?.id ?? null,
  );
  const [wholesaleCurrencyId, setWholesaleCurrencyId] = React.useState<number | null>(
    currencies[0]?.id ?? null,
  );
  const [paidAmount, setPaidAmount] = React.useState("0");
  const [paymentSource, setPaymentSource] = React.useState<"kassa" | "keyin">("kassa");

  const [page, setPage] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [fixedBarcodes, setFixedBarcodes] = React.useState<Map<number, string>>(new Map());
  const [printDialogOpen, setPrintDialogOpen] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const shelfOptions = React.useMemo(
    () => (stockId ? shelfNumbers.filter((s) => s.stock_id === stockId) : shelfNumbers),
    [shelfNumbers, stockId],
  );

  const dataRows = React.useMemo(() => allRows.slice(Math.max(0, skipRows)), [allRows, skipRows]);

  const cellAt = (row: unknown[], colId: string | null): unknown => {
    if (!colId) return "";
    const idx = Number(colId.replace("col_", ""));
    return row[idx];
  };

  const parsedRows: ParsedRow[] = React.useMemo(() => {
    return dataRows
      .map((row, idx) => ({ row, line: skipRows + idx + 1 }))
      .filter(({ row }) => row.some((cell) => cellText(cell) !== ""))
      .map(({ row, line }) => ({
        line,
        name: cellText(cellAt(row, mapping.name)),
        quantity: parseOptionalNumber(cellAt(row, mapping.quantity)),
        purchase: parseOptionalNumber(cellAt(row, mapping.purchase_price)),
        retail: parseOptionalNumber(cellAt(row, mapping.retail_price)),
        wholesale: parseOptionalNumber(cellAt(row, mapping.wholesale_price)),
        barcodes: fixedBarcodes.has(line) ? [fixedBarcodes.get(line)!] : splitBarcodes(cellAt(row, mapping.barcode)),
      }));
  }, [dataRows, mapping, skipRows, fixedBarcodes]);

  const duplicateBarcodes = React.useMemo(() => {
    const counts = new Map<string, number>();
    parsedRows.forEach((row) => {
      row.barcodes.forEach((code) => counts.set(code, (counts.get(code) ?? 0) + 1));
    });
    return new Set(Array.from(counts.entries()).filter(([, n]) => n > 1).map(([code]) => code));
  }, [parsedRows]);

  const missingBarcodeCount = React.useMemo(
    () => (mapping.barcode ? parsedRows.filter((row) => row.barcodes.length === 0).length : 0),
    [parsedRows, mapping.barcode],
  );

  const validatedRows: ValidatedRow[] = React.useMemo(() => {
    return parsedRows.map((row) => {
      const errors: string[] = [];

      if (!row.name) errors.push("Tovar nomi bo'sh");

      if (row.quantity.invalid) errors.push("Soni son emas");
      else if (row.quantity.value === null) errors.push("Soni kiritilmagan");
      else if (row.quantity.value < 0) errors.push("Soni manfiy");

      if (mapping.purchase_price && row.purchase.invalid) errors.push("Tan narx son emas");
      if (mapping.retail_price && row.retail.invalid) errors.push("Sotuv narx son emas");
      if (mapping.wholesale_price && row.wholesale.invalid) errors.push("Optom narx son emas");

      row.barcodes.forEach((code) => {
        if (duplicateBarcodes.has(code)) errors.push(`Shtrix kod takrorlangan: ${code}`);
      });

      return { ...row, errors };
    });
  }, [parsedRows, mapping, duplicateBarcodes]);

  const errorRows = validatedRows.filter((row) => row.errors.length > 0);
  const requiredMapped = Boolean(mapping.name && mapping.quantity);
  const hasRows = validatedRows.length > 0;
  const stockMissing = !stockId;

  const canSubmit = requiredMapped && hasRows && errorRows.length === 0 && !stockMissing && !saving;
  const canPrint = requiredMapped && hasRows;

  const printItems: PrintBarcodeItem[] = React.useMemo(() => {
    const retailCurrencyCode = currencies.find((c) => c.id === retailCurrencyId)?.code ?? "UZS";
    const retailRate = MOCK_RATES[retailCurrencyCode] ?? 1;
    const shelfName = shelfId != null ? (shelfNumbers.find((s) => s.id === shelfId)?.name ?? "") : "";
    return validatedRows
      .filter((row) => row.errors.length === 0)
      .map((row) => ({
        key: `row-${row.line}`,
        product: {
          name: row.name,
          barcode: row.barcodes.join(" | "),
          customCode: "",
          price: row.retail.value != null ? Math.round(row.retail.value * retailRate) : 0,
          shelfLocation: shelfName,
        },
        qtyAdded: row.quantity.value ?? 0,
        barcodeAuto: fixedBarcodes.has(row.line) || row.barcodes.length === 0,
      }));
  }, [validatedRows, currencies, retailCurrencyId, shelfId, shelfNumbers, fixedBarcodes]);

  const openPrintDialog = () => {
    applyBarcodeAutoFix();
    setPrintDialogOpen(true);
  };

  const totalPages = Math.max(1, Math.ceil(validatedRows.length / PAGE_SIZE));
  const pageRows = validatedRows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const totalPurchaseCost = React.useMemo(
    () =>
      validatedRows.reduce(
        (sum, row) => sum + (row.purchase.value ?? 0) * (row.quantity.value ?? 0),
        0,
      ),
    [validatedRows],
  );

  React.useEffect(() => {
    if (agentId != null) setPaidAmount(String(totalPurchaseCost));
  }, [agentId, totalPurchaseCost]);

  // ─── Yuklanayotgan qatorlar bo'yicha jamlanma — nechta tovar, necha pulga ────

  const validRowCount = React.useMemo(
    () => validatedRows.filter((row) => row.errors.length === 0).length,
    [validatedRows],
  );

  const totalPurchaseCostSom = React.useMemo(() => {
    const code = currencies.find((c) => c.id === purchaseCurrencyId)?.code ?? "UZS";
    return Math.round(totalPurchaseCost * (MOCK_RATES[code] ?? 1));
  }, [totalPurchaseCost, currencies, purchaseCurrencyId]);

  const totalRetailValueSom = React.useMemo(() => {
    const code = currencies.find((c) => c.id === retailCurrencyId)?.code ?? "UZS";
    const rate = MOCK_RATES[code] ?? 1;
    return Math.round(
      validatedRows
        .filter((row) => row.errors.length === 0)
        .reduce((sum, row) => sum + (row.retail.value ?? 0) * rate * (row.quantity.value ?? 0), 0),
    );
  }, [validatedRows, currencies, retailCurrencyId]);

  // ─── Fayl o'qish ──────────────────────────────────────────────────────────

  const handleFile = async (file: File) => {
    setStatus("parsing");
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
      const trimmed = raw.filter((row) => row.some((cell) => cellText(cell) !== ""));

      if (trimmed.length === 0) {
        toast.error("Faylda ma'lumot topilmadi. Boshqa fayl tanlang.");
        setStatus("empty");
        return;
      }

      const header = trimmed[0].map((cell) => cellText(cell).toLowerCase());
      const autoMap: Mapping = { ...EMPTY_MAPPING };
      AUTO_HINTS.forEach(({ key, hints }) => {
        const idx = header.findIndex(
          (label, colIdx) =>
            !Object.values(autoMap).includes(`col_${colIdx}`) &&
            hints.some((hint) => label.includes(hint)),
        );
        if (idx >= 0) autoMap[key] = `col_${idx}`;
      });

      setAllRows(trimmed);
      setMapping(autoMap);
      setSkipRows(1);
      setFileName(file.name);
      setPage(0);
      setFixedBarcodes(new Map());
      setStatus("loaded");
    } catch {
      toast.error("Faylni o'qib bo'lmadi", { description: "Excel (.xlsx, .xls) yoki CSV fayl tanlang" });
      setStatus("empty");
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void handleFile(file);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const resetFile = () => {
    setStatus("empty");
    setFileName("");
    setAllRows([]);
    setMapping(EMPTY_MAPPING);
    setFixedBarcodes(new Map());
    setPage(0);
  };

  // ─── Shtrix kodlarni avtomatik tuzatish ───────────────────────────────────
  // Takrorlangan yoki bo'sh shtrix kodlarni yangi, unikal kodlar bilan almashtiradi.

  const applyBarcodeAutoFix = () => {
    const usedCodes = new Set<string>();
    parsedRows.forEach((row) => {
      const needsFix = row.barcodes.length === 0 || row.barcodes.some((code) => duplicateBarcodes.has(code));
      if (!needsFix) row.barcodes.forEach((code) => usedCodes.add(code));
    });

    let fixedCount = 0;
    setFixedBarcodes((current) => {
      const next = new Map(current);
      parsedRows.forEach((row) => {
        const needsFix = row.barcodes.length === 0 || row.barcodes.some((code) => duplicateBarcodes.has(code));
        if (!needsFix) return;
        let code = generateBarcode();
        while (usedCodes.has(code)) code = generateBarcode();
        usedCodes.add(code);
        next.set(row.line, code);
        fixedCount += 1;
      });
      return next;
    });
    toast.success(`${fixedCount} ta qatorda shtrix kod avtomatik tuzatildi`);
  };

  // ─── Saqlash ────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const rows: ImportRow[] = validatedRows.map((row) => ({
          name: row.name,
          quantity: row.quantity.value ?? 0,
          purchase_price: row.purchase.value,
          purchase_currency_id: row.purchase.value !== null ? purchaseCurrencyId : null,
          retail_price: row.retail.value,
          retail_currency_id: row.retail.value !== null ? retailCurrencyId : null,
          wholesale_price: row.wholesale.value,
          wholesale_currency_id: row.wholesale.value !== null ? wholesaleCurrencyId : null,
          barcodes: row.barcodes,
          stock_id: stockId,
          shelf_number_id: shelfId,
          agent_id: agentId,
        }));

      const payment: ImportPayment | undefined =
        agentId != null
          ? {
              agentId,
              paidAmount: paymentSource === "kassa" ? Math.max(0, Number(paidAmount) || 0) : 0,
              source: paymentSource,
            }
          : undefined;

      await onSubmit(rows, payment);
      toast.success(`${rows.length} ta tovar qo'shildi`);
      onClose();
    } catch {
      toast.error("Saqlashda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const fw = { fontWeight: 400 } as const;
  const fwMedium = { fontWeight: 500 } as const;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-[1200px] flex-col overflow-hidden rounded-lg bg-white"
        style={saving ? { pointerEvents: "none" } : undefined}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `0.5px solid ${C.line}` }}
        >
          <div className="text-[15px]" style={{ color: C.text, ...fwMedium }}>
            Exceldan yuklash
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[13px]"
            style={{ color: C.secondary, ...fw }}
          >
            Yopish
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {status !== "loaded" ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className="flex min-h-[260px] flex-col items-center justify-center gap-2 rounded-lg text-center"
              style={{
                border: `0.5px dashed ${dragOver ? C.action : C.faint}`,
              }}
            >
              {status === "parsing" ? (
                <div className="text-[13px]" style={{ color: C.secondary, ...fw }}>
                  O'qilmoqda…
                </div>
              ) : (
                <>
                  <div className="text-[13px]" style={{ color: C.text, ...fw }}>
                    Excel faylni tanlang yoki shu yerga tashlang
                  </div>
                  <div className="text-[11px]" style={{ color: C.faint, ...fw }}>
                    .xlsx, .xls va .csv
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 text-[13px]"
                    style={{ color: C.action, ...fwMedium }}
                  >
                    Fayl tanlash
                  </button>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={onFileInputChange}
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-[13px]" style={{ color: C.text, ...fw }}>
                  {fileName} <span style={{ color: C.faint }}>· {dataRows.length} ta qator</span>
                </div>
                <button
                  type="button"
                  onClick={resetFile}
                  className="text-[13px]"
                  style={{ color: C.secondary, ...fw }}
                >
                  Boshqa fayl
                </button>
              </div>

              {hasRows && (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg"
                  style={{ border: `0.5px solid ${C.line}`, padding: "10px 14px" }}
                >
                  <div
                    className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px]"
                    style={{ color: C.text, ...fw }}
                  >
                    <span>
                      <span style={{ color: C.secondary }}>Tovarlar: </span>
                      <span style={fwMedium}>{validRowCount} ta</span>
                    </span>
                    {mapping.purchase_price && (
                      <span>
                        <span style={{ color: C.secondary }}>Tan narxda jami: </span>
                        <span style={fwMedium}>{formatSom(totalPurchaseCostSom)}</span>
                      </span>
                    )}
                    {mapping.retail_price && (
                      <span>
                        <span style={{ color: C.secondary }}>Sotuv narxda jami: </span>
                        <span style={fwMedium}>{formatSom(totalRetailValueSom)}</span>
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={openPrintDialog}
                    disabled={!canPrint}
                    className="flex shrink-0 items-center gap-1.5 text-[13px]"
                    style={{ color: canPrint ? C.action : C.faint, ...fwMedium }}
                  >
                    <Barcode className="h-3.5 w-3.5" />
                    Shtrix kod chop etish
                  </button>
                </div>
              )}

              {/* Yuqoridagi 4 ta tanlov: Ombor | valyutalar | Agent (+to'lov) | Polka */}
              <div
                className="grid"
                style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", columnGap: 24, rowGap: 18 }}
              >
                <FieldSlot label="Ombor *">
                  <select
                    value={stockId ?? ""}
                    onChange={(e) => {
                      const value = e.target.value ? Number(e.target.value) : null;
                      setStockId(value);
                      setShelfId(null);
                    }}
                    className="w-full appearance-none bg-transparent text-[13px] outline-none"
                    style={{ color: C.text, ...fw }}
                  >
                    <option value="">— Tanlanmagan —</option>
                    {stocks.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </FieldSlot>

                <FieldSlot label="Tan narx valyutasi *">
                  <select
                    value={purchaseCurrencyId ?? ""}
                    onChange={(e) => setPurchaseCurrencyId(Number(e.target.value))}
                    className="w-full appearance-none bg-transparent text-[13px] outline-none"
                    style={{ color: C.text, ...fw }}
                  >
                    {currencies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                </FieldSlot>

                <FieldSlot label="Sotuv narx valyutasi *">
                  <select
                    value={retailCurrencyId ?? ""}
                    onChange={(e) => setRetailCurrencyId(Number(e.target.value))}
                    className="w-full appearance-none bg-transparent text-[13px] outline-none"
                    style={{ color: C.text, ...fw }}
                  >
                    {currencies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                </FieldSlot>

                <FieldSlot label="Optom narx valyutasi *">
                  <select
                    value={wholesaleCurrencyId ?? ""}
                    onChange={(e) => setWholesaleCurrencyId(Number(e.target.value))}
                    className="w-full appearance-none bg-transparent text-[13px] outline-none"
                    style={{ color: C.text, ...fw }}
                  >
                    {currencies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                </FieldSlot>

                <FieldSlot label="Agent">
                  <select
                    value={agentId ?? ""}
                    onChange={(e) => setAgentId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full appearance-none bg-transparent text-[13px] outline-none"
                    style={{ color: C.text, ...fw }}
                  >
                    <option value="">Agentsiz (bazani shakllantirish)</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </FieldSlot>

                {agentId != null && (
                  <FieldSlot label="Hozir qancha to'laysiz">
                    <input
                      type="number"
                      min={0}
                      disabled={paymentSource === "keyin"}
                      value={paymentSource === "keyin" ? 0 : paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="w-full bg-transparent text-[13px] outline-none disabled:cursor-not-allowed"
                      style={{ color: paymentSource === "keyin" ? C.faint : C.text, ...fw }}
                    />
                  </FieldSlot>
                )}

                {agentId != null && (
                  <FieldSlot label="Qayerdan to'lanadi">
                    <div className="flex gap-4 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setPaymentSource("kassa")}
                        className="text-[13px]"
                        style={{
                          color: paymentSource === "kassa" ? C.action : C.secondary,
                          fontWeight: paymentSource === "kassa" ? 500 : 400,
                        }}
                      >
                        Kassadan
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentSource("keyin")}
                        className="text-[13px]"
                        style={{
                          color: paymentSource === "keyin" ? C.action : C.secondary,
                          fontWeight: paymentSource === "keyin" ? 500 : 400,
                        }}
                      >
                        Boshqa joydan
                      </button>
                    </div>
                  </FieldSlot>
                )}

                <FieldSlot label="Polka raqami">
                  <select
                    value={shelfId ?? ""}
                    onChange={(e) => setShelfId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full appearance-none bg-transparent text-[13px] outline-none"
                    style={{ color: C.text, ...fw }}
                  >
                    <option value="">— Tanlanmagan —</option>
                    {shelfOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </FieldSlot>
              </div>

              {stockMissing && (
                <div className="text-[12px]" style={{ color: C.error, ...fw }}>
                  Ombor tanlanmagan
                </div>
              )}

              {!requiredMapped && (
                <div className="text-[12px]" style={{ color: C.error, ...fw }}>
                  Faylda "Tovar nomi" va "Soni" ustunlari avtomatik aniqlanmadi — sarlavha
                  qatoridagi nomlarni tekshiring
                </div>
              )}

              {/* Shtrix kod avtomatik tuzatish */}
              {(duplicateBarcodes.size > 0 || missingBarcodeCount > 0) && (
                <button
                  type="button"
                  onClick={applyBarcodeAutoFix}
                  className="text-[13px]"
                  style={{ color: C.action, ...fwMedium }}
                >
                  Shtrix kodlarni avtomatik tuzatish
                </button>
              )}

              {/* Jadval */}
              <div>
                <table className="w-full text-[13px]" style={{ color: C.text }}>
                  <thead>
                    <tr style={{ borderBottom: `0.5px solid ${C.line}` }}>
                      <Th>Nomi</Th>
                      <Th align="right">Soni</Th>
                      <Th align="right">Tan narx</Th>
                      <Th align="right">Sotuv narx</Th>
                      <Th align="right">Optom narx</Th>
                      <Th>Shtrix kod</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row, idx) => {
                      const hasError = row.errors.length > 0;
                      const cellStyle = { color: hasError ? C.error : C.text, ...fw };
                      return (
                        <tr key={idx} style={{ borderBottom: `0.5px solid ${C.line}` }}>
                          <Td style={cellStyle}>{row.name || "—"}</Td>
                          <Td align="right" style={cellStyle}>
                            {row.quantity.value ?? "—"}
                          </Td>
                          <Td align="right" style={cellStyle}>
                            {row.purchase.value ?? "—"}
                          </Td>
                          <Td align="right" style={cellStyle}>
                            {row.retail.value ?? "—"}
                          </Td>
                          <Td align="right" style={cellStyle}>
                            {row.wholesale.value ?? "—"}
                          </Td>
                          <Td style={cellStyle}>{row.barcodes.join(", ") || "—"}</Td>
                        </tr>
                      );
                    })}
                    {pageRows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-[13px]" style={{ color: C.faint }}>
                          Ma'lumot yo'q
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {validatedRows.length > PAGE_SIZE && (
                  <div className="mt-3 flex items-center justify-center gap-4 text-[13px]" style={{ color: C.secondary, ...fw }}>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      style={{ color: page === 0 ? C.faint : C.action }}
                    >
                      ‹
                    </button>
                    <span>
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      style={{ color: page >= totalPages - 1 ? C.faint : C.action }}
                    >
                      ›
                    </button>
                  </div>
                )}

                {errorRows.length > 0 && (
                  <div className="mt-4 space-y-1">
                    {errorRows.slice(0, 30).map((row, idx) => (
                      <div key={idx} className="text-[12px]" style={{ color: C.error, ...fw }}>
                        {row.line}-qator: {row.errors.join(", ")}
                      </div>
                    ))}
                    {errorRows.length > 30 && (
                      <div className="text-[12px]" style={{ color: C.error, ...fw }}>
                        … yana {errorRows.length - 30} ta qatorda xato bor
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-5 px-6 py-4"
          style={{ borderTop: `0.5px solid ${C.line}` }}
        >
          <button
            type="button"
            onClick={onClose}
            className="text-[13px]"
            style={{ color: C.secondary, ...fw }}
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="text-[13px]"
            style={{ color: canSubmit ? C.action : C.faint, ...fwMedium }}
          >
            {saving ? "Saqlanmoqda…" : "Saqlash"}
          </button>
        </div>
      </div>

      <PrintNewBarcodesDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        items={printItems}
      />
    </div>,
    document.body,
  );
}

function FieldSlot({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px]" style={{ color: "#737D91", fontWeight: 400 }}>
        {label}
      </div>
      <div className="mt-1 pb-1.5" style={{ borderBottom: "0.5px solid rgba(174,185,212,0.35)" }}>
        {children}
      </div>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <th
      className={`py-2 text-[11px] font-normal ${align === "right" ? "text-right" : "text-left"}`}
      style={{ color: "#737D91" }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  style,
}: {
  children: React.ReactNode;
  align?: "right";
  style?: React.CSSProperties;
}) {
  return (
    <td className={`py-2 ${align === "right" ? "text-right" : "text-left"}`} style={style}>
      {children}
    </td>
  );
}
