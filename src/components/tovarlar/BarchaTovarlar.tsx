import * as React from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle,
  ArrowLeft,
  Barcode,
  Check,
  CheckSquare,
  ChevronDown,
  Columns3,
  Download,
  FileSpreadsheet,
  Filter,
  Link2,
  MessageSquareText,
  Minus,
  PackageMinus,
  PackagePlus,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  Save,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  MOCK_PRODUCTS,
  MOCK_EDIT_HISTORY,
  MOCK_RATES,
  MOCK_WITHDRAWALS,
  MOCK_PRODUCT_HISTORY,
  formatSom,
  costInSom,
  isProductAtLimit,
  getAgentsList,
  type AgentSummary,
  type Product,
} from "@/lib/mock-data";
import { mergeProductsWithAgent, recordProductAddition } from "@/lib/data-actions";
import {
  ExcelYuklashModal,
  type ImportRow,
  type ImportPayment,
} from "@/components/tovarlar/ExcelYuklashModal";
import {
  DEFAULT_PRINT_SETTINGS,
  LABEL_SIZE_PRESETS,
  printProductLabels,
  type PrintField,
  type PrintSettings,
} from "@/lib/label-print";
import { useApp } from "@/lib/app-context";
import { joinBarcodes, makeUniqueBarcode, splitBarcodes } from "@/lib/barcode-utils";
import type { ProductCreateMode } from "@/routes/tovarlar";
import { toast } from "sonner";

type EditDraft = {
  costPrice: string;
  price: string;
  vitrinaQty: string;
  unit: string;
  warehouse: string;
  shelfLocation: string;
  minStockAlert: string;
  barcode: string;
};

type WriteOffRow = {
  id: string;
  name: string;
  unit: string;
  currentQty: number;
  qty: string;
};

type BulkEditRow = {
  id: string;
  name: string;
  costPrice: string;
  price: string;
  wholesalePrice: string;
  barcode: string;
  shelfLocation: string;
  warehouse: string;
  minStockAlert: string;
};

type Props = {
  onSetCreateMode: (mode: ProductCreateMode) => void;
  selectionSlot?: HTMLElement | null;
};

type OptionalColumn = "limit" | "unit" | "shelf";

const OPTIONAL_COLUMNS: { key: OptionalColumn; label: string }[] = [
  { key: "limit", label: "Limit" },
  { key: "unit", label: "Birlik" },
  { key: "shelf", label: "Polka raqami" },
];

const HIDDEN_COLUMNS_STORAGE_KEY = "uzko-tovarlar-hidden-columns";

type ExportFormat = "excel" | "pdf";

type ExportColumnKey =
  | "name"
  | "qty"
  | "costPrice"
  | "wholesalePrice"
  | "price"
  | "barcode"
  | "supplier";

const EXPORT_COLUMNS: { key: ExportColumnKey; label: string }[] = [
  { key: "name", label: "Mahsulot nomi" },
  { key: "qty", label: "Soni" },
  { key: "costPrice", label: "Tan narx" },
  { key: "wholesalePrice", label: "Optom narx" },
  { key: "price", label: "Sotuv narx" },
  { key: "barcode", label: "Shtrix kod" },
  { key: "supplier", label: "Taminotchi" },
];

const EXPORT_COLUMNS_STORAGE_KEY = "uzko-tovarlar-export-columns";

function readExportColumns(): Set<ExportColumnKey> {
  if (typeof window === "undefined") return new Set(EXPORT_COLUMNS.map((c) => c.key));
  try {
    const raw = JSON.parse(window.localStorage.getItem(EXPORT_COLUMNS_STORAGE_KEY) ?? "null");
    if (!Array.isArray(raw)) return new Set(EXPORT_COLUMNS.map((c) => c.key));
    const valid = raw.filter((key): key is ExportColumnKey =>
      EXPORT_COLUMNS.some((col) => col.key === key),
    );
    return valid.length > 0 ? new Set(valid) : new Set(EXPORT_COLUMNS.map((c) => c.key));
  } catch {
    return new Set(EXPORT_COLUMNS.map((c) => c.key));
  }
}

/** Mahsulot nomi bo'yicha eng so'nggi prixod yozuvidan taminotchi (agent) nomini topadi. */
function getSupplierForProduct(productName: string): string {
  let latest: (typeof MOCK_PRODUCT_HISTORY)[number] | undefined;
  for (const entry of MOCK_PRODUCT_HISTORY) {
    if (entry.productName !== productName || !entry.agentName) continue;
    if (!latest || new Date(entry.date).getTime() > new Date(latest.date).getTime()) {
      latest = entry;
    }
  }
  return latest?.agentName ?? "-";
}

function readHiddenColumns(): Set<OptionalColumn> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = JSON.parse(window.localStorage.getItem(HIDDEN_COLUMNS_STORAGE_KEY) ?? "[]");
    return new Set(
      (Array.isArray(raw) ? raw : []).filter((key): key is OptionalColumn =>
        OPTIONAL_COLUMNS.some((col) => col.key === key),
      ),
    );
  } catch {
    return new Set();
  }
}

export function BarchaTovarlar({ onSetCreateMode, selectionSlot }: Props) {
  const { settings, updateSettings, t } = useApp();
  const [query, setQuery] = React.useState("");
  const [warehouse, setWarehouse] = React.useState<string>("ALL");
  const [version, setVersion] = React.useState(0);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());
  const [hiddenColumns, setHiddenColumns] = React.useState<Set<OptionalColumn>>(readHiddenColumns);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [exportFormat, setExportFormat] = React.useState<ExportFormat>("excel");
  const [exportColumns, setExportColumns] = React.useState<Set<ExportColumnKey>>(readExportColumns);

  const toggleExportColumn = (key: ExportColumnKey, checked: boolean) => {
    setExportColumns((current) => {
      const next = new Set(current);
      if (checked) next.add(key);
      else next.delete(key);
      window.localStorage.setItem(EXPORT_COLUMNS_STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const toggleColumnVisibility = (key: OptionalColumn, visible: boolean) => {
    setHiddenColumns((current) => {
      const next = new Set(current);
      if (visible) next.delete(key);
      else next.add(key);
      window.localStorage.setItem(HIDDEN_COLUMNS_STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  };
  const [printOpen, setPrintOpen] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [limitOpen, setLimitOpen] = React.useState(false);
  const [limitInput, setLimitInput] = React.useState("");
  const [editMenuOpen, setEditMenuOpen] = React.useState(false);
  const [bulkEditOpen, setBulkEditOpen] = React.useState(false);
  const [bulkEditRows, setBulkEditRows] = React.useState<BulkEditRow[]>([]);
  const [writeOffOpen, setWriteOffOpen] = React.useState(false);
  const [writeOffRows, setWriteOffRows] = React.useState<WriteOffRow[]>([]);
  const [writeOffReason, setWriteOffReason] = React.useState("");
  const [addMenuOpen, setAddMenuOpen] = React.useState(false);
  const [excelModalOpen, setExcelModalOpen] = React.useState(false);
  const [mergeAgentOpen, setMergeAgentOpen] = React.useState(false);
  const [mergeAgentId, setMergeAgentId] = React.useState<string>("__new__");
  const [mergeAgentName, setMergeAgentName] = React.useState("");
  const [mergeAgentPhone, setMergeAgentPhone] = React.useState("");
  const [mergeMode, setMergeMode] = React.useState<"current-stock" | "zero-debt">("current-stock");
  const [mergeNote, setMergeNote] = React.useState("");
  const [printSettings, setPrintSettings] = React.useState<PrintSettings>(
    () => settings.labelPrintSettings ?? DEFAULT_PRINT_SETTINGS,
  );
  const [stockFilter, setStockFilter] = React.useState<"all" | "limited">("all");
  const [supplierFilter, setSupplierFilter] = React.useState<string>("ALL");
  const [draft, setDraft] = React.useState<EditDraft>({
    costPrice: "",
    price: "",
    vitrinaQty: "",
    unit: "",
    warehouse: "",
    shelfLocation: "",
    minStockAlert: "",
    barcode: "",
  });
  const [barcodeInput, setBarcodeInput] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_PRODUCTS.filter((p) => {
      if (warehouse !== "ALL" && p.warehouse !== warehouse) return false;
      if (stockFilter === "limited" && !isProductAtLimit(p)) return false;
      if (supplierFilter !== "ALL" && getSupplierForProduct(p.name) !== supplierFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.customCode.toLowerCase().includes(q) ||
        (isProductAtLimit(p) && "limit ogohlantirish kam qoldi".includes(q))
      );
    });
  }, [query, stockFilter, warehouse, supplierFilter, version]);

  const totalCount = filtered.reduce((s, p) => s + p.vitrinaQty, 0);
  const totalCost = filtered.reduce((s, p) => s + costInSom(p) * p.vitrinaQty, 0);
  const selectedProducts = React.useMemo(
    () => MOCK_PRODUCTS.filter((product) => selectedIds.has(product.id)),
    [selectedIds, version],
  );
  const selectedUnitsLabel = React.useMemo(
    () => Array.from(new Set(selectedProducts.map((product) => product.unit))).join(", "),
    [selectedProducts],
  );
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((product) => selectedIds.has(product.id));
  const activeFilterCount =
    (stockFilter === "limited" ? 1 : 0) +
    (warehouse !== "ALL" ? 1 : 0) +
    (supplierFilter !== "ALL" ? 1 : 0);
  const supplierOptions = React.useMemo(() => getAgentsList(), [version]);

  const toggleProduct = (productId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      filtered.forEach((product) => next.add(product.id));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setDraft({
      costPrice: String(product.costPrice),
      price: String(product.price),
      vitrinaQty: String(product.vitrinaQty),
      unit: settings.units.some((u) => u.name === product.unit)
        ? product.unit
        : (settings.units[0]?.name ?? product.unit),
      warehouse: settings.warehouses.some((w) => w.name === product.warehouse)
        ? product.warehouse
        : (settings.warehouses[0]?.name ?? product.warehouse),
      shelfLocation: product.shelfLocation ?? "",
      minStockAlert: typeof product.minStockAlert === "number" ? String(product.minStockAlert) : "",
      barcode: product.barcode,
    });
    setBarcodeInput("");
  };

  const updateDraft = (patch: Partial<EditDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const assignDraftBarcode = () => {
    const currentCodes = splitBarcodes(draft.barcode);
    const nextCode = makeUniqueBarcode(currentCodes);
    updateDraft({ barcode: joinBarcodes([...currentCodes, nextCode]) });
  };

  const removeDraftBarcodeChip = (code: string) => {
    updateDraft({
      barcode: joinBarcodes(splitBarcodes(draft.barcode).filter((item) => item !== code)),
    });
  };

  const addManualDraftBarcode = () => {
    const value = barcodeInput.trim();
    if (!value) return;
    updateDraft({ barcode: joinBarcodes([...splitBarcodes(draft.barcode), value]) });
    setBarcodeInput("");
  };

  const changeDraftQty = (delta: number) => {
    setDraft((current) => {
      const next = Math.max(0, (Number(current.vitrinaQty) || 0) + delta);
      return { ...current, vitrinaQty: String(next) };
    });
  };

  const saveProduct = (productId: string) => {
    const p = MOCK_PRODUCTS.find((item) => item.id === productId);
    if (!p) return;

    const oldQty = p.vitrinaQty;
    const oldPrice = p.price;
    const oldCostPrice = p.costPrice;
    const oldUnit = p.unit;
    const oldWarehouse = p.warehouse;
    const oldShelf = p.shelfLocation;
    const oldBarcode = p.barcode;
    const newQty = Math.max(0, Number(draft.vitrinaQty) || 0);
    const newPrice = Math.max(0, Number(draft.price) || 0);
    const newCostPrice = Math.max(0, Number(draft.costPrice) || 0);
    const newUnit = draft.unit.trim() || p.unit;
    const newWarehouse = settings.warehouses.some((w) => w.name === draft.warehouse)
      ? draft.warehouse
      : p.warehouse;
    const newShelf = draft.shelfLocation;
    const newMinStockAlert =
      draft.minStockAlert.trim() === "" ? undefined : Math.max(0, Number(draft.minStockAlert) || 0);
    const draftBarcodes = splitBarcodes(draft.barcode);
    const newBarcode = joinBarcodes(
      draftBarcodes.length > 0 ? draftBarcodes : [makeUniqueBarcode()],
    );

    const changes = [
      oldCostPrice !== newCostPrice
        ? {
            field: "costPrice" as const,
            label: "Tan narx",
            oldValue: oldCostPrice,
            newValue: newCostPrice,
          }
        : null,
      oldPrice !== newPrice
        ? { field: "price" as const, label: "Sotuv narx", oldValue: oldPrice, newValue: newPrice }
        : null,
      oldQty !== newQty
        ? { field: "qty" as const, label: "Miqdor", oldValue: oldQty, newValue: newQty }
        : null,
      oldUnit !== newUnit
        ? { field: "unit" as const, label: "Birlik", oldValue: oldUnit, newValue: newUnit }
        : null,
      oldWarehouse !== newWarehouse
        ? {
            field: "warehouse" as const,
            label: "Ombor",
            oldValue: oldWarehouse,
            newValue: newWarehouse,
          }
        : null,
      oldShelf !== newShelf
        ? {
            field: "shelfLocation" as const,
            label: "Raf",
            oldValue: oldShelf ?? "",
            newValue: newShelf,
          }
        : null,
      p.minStockAlert !== newMinStockAlert
        ? {
            field: "minStockAlert" as const,
            label: "Ogohlantirish limiti",
            oldValue: p.minStockAlert ?? "",
            newValue: newMinStockAlert ?? "",
          }
        : null,
      oldBarcode !== newBarcode
        ? {
            field: "barcode" as const,
            label: "Shtrix kod",
            oldValue: oldBarcode,
            newValue: newBarcode,
          }
        : null,
    ].filter((item): item is NonNullable<typeof item> => item !== null);

    if (changes.length > 0) {
      p.costPrice = newCostPrice;
      p.price = newPrice;
      p.vitrinaQty = newQty;
      p.unit = newUnit;
      p.warehouse = newWarehouse;
      p.shelfLocation = newShelf;
      p.minStockAlert = newMinStockAlert;
      p.barcode = newBarcode;
      MOCK_EDIT_HISTORY.unshift({
        id: `eh${Date.now()}`,
        date: new Date().toISOString(),
        editedBy: settings.username,
        productName: p.name,
        oldQty,
        newQty,
        unit: newUnit,
        action: "edit",
        changes,
        oldPrice,
        newPrice,
        oldCostPrice,
        newCostPrice,
        oldUnit,
        newUnit,
        oldWarehouse,
        newWarehouse,
      });
    }

    setEditingId(null);
    setVersion((v) => v + 1);
  };

  const bulkUpdateShelf = (newShelf: string) => {
    if (!newShelf || selectedIds.size === 0) return;
    MOCK_PRODUCTS.forEach((p) => {
      if (selectedIds.has(p.id)) {
        p.shelfLocation = newShelf === "NONE" ? "" : newShelf;
      }
    });
    setVersion((v) => v + 1);
    clearSelection();
  };

  const openLimitDialog = (productIds?: string[]) => {
    if (productIds?.length) {
      setSelectedIds(new Set(productIds));
    }
    const rows = MOCK_PRODUCTS.filter((product) =>
      productIds?.length ? productIds.includes(product.id) : selectedIds.has(product.id),
    );
    if (rows.length === 0) return;
    const currentLimits = Array.from(
      new Set(
        rows
          .map((product) => product.minStockAlert)
          .filter((value): value is number => typeof value === "number"),
      ),
    );
    setLimitInput(currentLimits.length === 1 ? String(currentLimits[0]) : "");
    setLimitOpen(true);
  };

  const applyStockLimit = () => {
    if (selectedProducts.length === 0) return;
    const nextLimit = limitInput.trim() === "" ? undefined : Math.max(0, Number(limitInput) || 0);
    selectedProducts.forEach((product) => {
      product.minStockAlert = nextLimit;
    });
    setVersion((value) => value + 1);
    setLimitOpen(false);
  };

  const openBulkEditDialog = () => {
    if (selectedProducts.length === 0) return;
    setBulkEditRows(
      selectedProducts.map((product) => ({
        id: product.id,
        name: product.name,
        costPrice: String(product.costPrice),
        price: String(product.price),
        wholesalePrice: product.wholesalePrice != null ? String(product.wholesalePrice) : "",
        barcode: product.barcode,
        shelfLocation: product.shelfLocation ?? "",
        warehouse: settings.warehouses.some((w) => w.name === product.warehouse)
          ? product.warehouse
          : (settings.warehouses[0]?.name ?? product.warehouse),
        minStockAlert: product.minStockAlert != null ? String(product.minStockAlert) : "",
      })),
    );
    setBulkEditOpen(true);
  };

  const openWriteOffDialog = () => {
    if (selectedProducts.length === 0) return;
    setWriteOffRows(
      selectedProducts.map((product) => ({
        id: product.id,
        name: product.name,
        unit: product.unit,
        currentQty: product.vitrinaQty,
        qty: String(product.vitrinaQty),
      })),
    );
    setWriteOffReason("");
    setWriteOffOpen(true);
  };

  const updateWriteOffQty = (id: string, qty: string) => {
    setWriteOffRows((current) => current.map((row) => (row.id === id ? { ...row, qty } : row)));
  };

  const confirmWriteOff = () => {
    const rows = writeOffRows.filter((row) => (Number(row.qty) || 0) > 0);
    if (rows.length === 0) return;
    rows.forEach((row) => {
      const p = MOCK_PRODUCTS.find((item) => item.id === row.id);
      if (!p) return;
      const oldQty = p.vitrinaQty;
      const writeOffQty = Math.min(oldQty, Math.max(0, Number(row.qty) || 0));
      if (writeOffQty <= 0) return;
      const newQty = oldQty - writeOffQty;
      p.vitrinaQty = newQty;
      MOCK_EDIT_HISTORY.unshift({
        id: `eh${Date.now()}-${row.id}`,
        date: new Date().toISOString(),
        editedBy: settings.username,
        productName: p.name,
        oldQty,
        newQty,
        unit: p.unit,
        action: "writeoff",
        note: writeOffReason.trim() || undefined,
        changes: [{ field: "qty", label: "Miqdor", oldValue: oldQty, newValue: newQty }],
      });
    });

    setVersion((v) => v + 1);
    setWriteOffOpen(false);
    clearSelection();
  };

  const agents = React.useMemo(() => getAgentsList(), [version]);

  // ─── Exceldan yuklash modali uchun sintetik (number) ID ro'yxatlari ───────
  const excelCurrencies = React.useMemo(
    () => settings.currencies.map((code, idx) => ({ id: idx + 1, code, name: code })),
    [settings.currencies],
  );
  const excelStocks = React.useMemo(
    () => settings.warehouses.map((w, idx) => ({ id: idx + 1, name: w.name })),
    [settings.warehouses],
  );
  const excelShelfNumbers = React.useMemo(
    () =>
      settings.shelfLocations.map((loc, idx) => ({
        id: idx + 1,
        name: loc.name,
        stock_id: excelStocks.find((s) => s.name === loc.warehouse)?.id ?? 0,
      })),
    [settings.shelfLocations, excelStocks],
  );
  const excelAgents = React.useMemo(
    () => agents.map((agent, idx) => ({ id: idx + 1, name: agent.name })),
    [agents],
  );

  const handleExcelSubmit = async (rows: ImportRow[], payment?: ImportPayment) => {
    const usedBarcodes = new Set(
      MOCK_PRODUCTS.flatMap((product) => product.barcode.split("|").map((c) => c.trim())).filter(
        Boolean,
      ),
    );

    const purchaseCurrencyId = rows.find(
      (r) => r.purchase_currency_id != null,
    )?.purchase_currency_id;
    const purchaseCurrencyCode =
      excelCurrencies.find((c) => c.id === purchaseCurrencyId)?.code ?? "UZS";
    const purchaseRate = MOCK_RATES[purchaseCurrencyCode] ?? 1;
    const totalCostSom = rows.reduce(
      (sum, row) => sum + row.quantity * (row.purchase_price ?? 0) * purchaseRate,
      0,
    );

    const agentInfo = payment ? excelAgents.find((a) => a.id === payment.agentId) : undefined;
    const realAgent = agentInfo ? agents.find((a) => a.name === agentInfo.name) : undefined;
    const paidAmountSom = payment
      ? Math.max(0, Math.min(totalCostSom, Math.round(payment.paidAmount * purchaseRate)))
      : 0;

    rows.forEach((row) => {
      const stockName =
        excelStocks.find((s) => s.id === row.stock_id)?.name ??
        settings.warehouses[0]?.name ??
        "Asosiy ombor";
      const shelfName = excelShelfNumbers.find((s) => s.id === row.shelf_number_id)?.name ?? "";

      const barcodes = row.barcodes.filter(Boolean);
      barcodes.forEach((code) => usedBarcodes.add(code));
      const barcode = barcodes.join(" | ");

      const purchaseCurrency = purchaseCurrencyCode;
      const retailCurrency =
        row.retail_currency_id != null
          ? (excelCurrencies.find((c) => c.id === row.retail_currency_id)?.code ?? "UZS")
          : "UZS";
      const retailRate = MOCK_RATES[retailCurrency] ?? 1;
      const wholesaleCurrency =
        row.wholesale_currency_id != null
          ? (excelCurrencies.find((c) => c.id === row.wholesale_currency_id)?.code ?? "UZS")
          : "UZS";
      const wholesaleRate = MOCK_RATES[wholesaleCurrency] ?? 1;

      const priceSom = row.retail_price != null ? Math.round(row.retail_price * retailRate) : 0;
      const wholesalePriceSom =
        row.wholesale_price != null ? Math.round(row.wholesale_price * wholesaleRate) : undefined;

      const existing = MOCK_PRODUCTS.find(
        (product) => product.name.trim().toLowerCase() === row.name.trim().toLowerCase(),
      );

      let product: Product;
      if (existing) {
        existing.omborQty += row.quantity;
        if (row.purchase_price != null) {
          existing.costPrice = row.purchase_price;
          existing.costCurrency = purchaseCurrency;
        }
        if (row.retail_price != null) existing.price = priceSom;
        if (wholesalePriceSom !== undefined) existing.wholesalePrice = wholesalePriceSom;
        if (shelfName) existing.shelfLocation = shelfName;
        product = existing;
      } else {
        product = {
          id: `p${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: row.name,
          price: priceSom,
          wholesalePrice: wholesalePriceSom,
          costPrice: row.purchase_price ?? 0,
          costCurrency: purchaseCurrency,
          barcode:
            barcode || `8690${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, "0")}`,
          customCode:
            row.name
              .trim()
              .slice(0, 4)
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, "") + Math.floor(Math.random() * 99),
          unit: settings.units[0]?.name ?? "dona",
          warehouse: stockName,
          shelfLocation: shelfName,
          vitrinaQty: 0,
          omborQty: row.quantity,
          salesHistory: [],
        };
        MOCK_PRODUCTS.push(product);
      }

      const rowCostSom = row.quantity * (row.purchase_price ?? 0) * purchaseRate;
      const paidShare =
        realAgent && totalCostSom > 0 ? Math.round((paidAmountSom * rowCostSom) / totalCostSom) : 0;

      recordProductAddition({
        productName: product.name,
        qty: row.quantity,
        unit: product.unit,
        price: product.price,
        costPrice: rowCostSom,
        warehouse: stockName,
        shelfLocation: shelfName,
        addedBy: settings.username,
        source: realAgent
          ? {
              enabled: true,
              agentId: realAgent.id,
              agentName: realAgent.name,
              agentPhone: realAgent.phone,
              paidAmount: String(paidShare),
              note: "Excelldan yuklandi",
              sendBotUpdate: false,
            }
          : undefined,
      });
    });

    if (realAgent && payment?.source === "kassa" && paidAmountSom > 0) {
      MOCK_WITHDRAWALS.push({
        id: `CH-excel-${Date.now()}`,
        date: new Date().toISOString(),
        cashier: settings.username,
        category: "Agentlarga to'lov",
        cash: paidAmountSom,
        cardAmount: 0,
        currencies: [],
        note: "Excelldan tovar import qilingandagi to'lov",
        agentId: realAgent.id,
      });
    }

    setVersion((v) => v + 1);
  };

  const openMergeAgentDialog = () => {
    if (selectedProducts.length === 0) return;
    setMergeAgentId(agents[0]?.id ?? "__new__");
    setMergeAgentName(agents[0]?.name ?? "");
    setMergeAgentPhone(agents[0]?.phone ?? "");
    setMergeMode("current-stock");
    setMergeNote("");
    setMergeAgentOpen(true);
  };

  const mergeTotalCost = React.useMemo(
    () =>
      selectedProducts.reduce(
        (sum, product) => sum + (product.vitrinaQty + product.omborQty) * costInSom(product),
        0,
      ),
    [selectedProducts],
  );

  const confirmMergeAgent = () => {
    const agentName = mergeAgentName.trim();
    if (!agentName) {
      toast.error("Agent nomini kiriting");
      return;
    }
    if (selectedProducts.length === 0) return;

    mergeProductsWithAgent({
      products: selectedProducts,
      agentId: mergeAgentId !== "__new__" ? mergeAgentId : undefined,
      agentName,
      agentPhone: mergeAgentPhone,
      mode: mergeMode,
      addedBy: settings.username,
      note: mergeNote,
    });

    toast.success("Tovarlar agentga birlashtirildi", {
      description: `${selectedProducts.length} ta tovar · ${agentName}`,
    });
    setMergeAgentOpen(false);
    setVersion((v) => v + 1);
    clearSelection();
  };

  const updateBulkEditRow = (id: string, patch: Partial<BulkEditRow>) => {
    setBulkEditRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const saveBulkEdit = () => {
    bulkEditRows.forEach((row) => {
      const p = MOCK_PRODUCTS.find((item) => item.id === row.id);
      if (!p) return;

      const oldName = p.name;
      const oldCostPrice = p.costPrice;
      const oldPrice = p.price;
      const oldWholesalePrice = p.wholesalePrice;
      const oldBarcode = p.barcode;
      const oldShelf = p.shelfLocation;
      const oldWarehouse = p.warehouse;
      const newName = row.name.trim() || p.name;
      const newCostPrice = Math.max(0, Number(row.costPrice) || 0);
      const newPrice = Math.max(0, Number(row.price) || 0);
      const newWholesalePrice =
        row.wholesalePrice.trim() === "" ? undefined : Math.max(0, Number(row.wholesalePrice) || 0);
      const newBarcode = row.barcode.trim() || p.barcode;
      const newShelf = row.shelfLocation;
      const newWarehouse = settings.warehouses.some((w) => w.name === row.warehouse)
        ? row.warehouse
        : p.warehouse;
      const oldMinStockAlert = p.minStockAlert;
      const newMinStockAlert =
        row.minStockAlert.trim() === "" ? undefined : Math.max(0, Number(row.minStockAlert) || 0);

      const changes = [
        oldName !== newName
          ? { field: "name" as const, label: "Nomi", oldValue: oldName, newValue: newName }
          : null,
        oldCostPrice !== newCostPrice
          ? {
              field: "costPrice" as const,
              label: "Tan narx",
              oldValue: oldCostPrice,
              newValue: newCostPrice,
            }
          : null,
        oldPrice !== newPrice
          ? { field: "price" as const, label: "Sotuv narx", oldValue: oldPrice, newValue: newPrice }
          : null,
        oldWholesalePrice !== newWholesalePrice
          ? {
              field: "wholesalePrice" as const,
              label: "Optom narx",
              oldValue: oldWholesalePrice ?? "",
              newValue: newWholesalePrice ?? "",
            }
          : null,
        oldBarcode !== newBarcode
          ? {
              field: "barcode" as const,
              label: "Shtrix kod",
              oldValue: oldBarcode,
              newValue: newBarcode,
            }
          : null,
        oldShelf !== newShelf
          ? {
              field: "shelfLocation" as const,
              label: "Raf",
              oldValue: oldShelf ?? "",
              newValue: newShelf,
            }
          : null,
        oldWarehouse !== newWarehouse
          ? {
              field: "warehouse" as const,
              label: "Ombor",
              oldValue: oldWarehouse,
              newValue: newWarehouse,
            }
          : null,
        oldMinStockAlert !== newMinStockAlert
          ? {
              field: "minStockAlert" as const,
              label: "Ogohlantirish limiti",
              oldValue: oldMinStockAlert ?? "",
              newValue: newMinStockAlert ?? "",
            }
          : null,
      ].filter((item): item is NonNullable<typeof item> => item !== null);

      if (changes.length === 0) return;

      p.name = newName;
      p.costPrice = newCostPrice;
      p.price = newPrice;
      p.wholesalePrice = newWholesalePrice;
      p.barcode = newBarcode;
      p.shelfLocation = newShelf;
      p.warehouse = newWarehouse;
      p.minStockAlert = newMinStockAlert;

      MOCK_EDIT_HISTORY.unshift({
        id: `eh${Date.now()}-${row.id}`,
        date: new Date().toISOString(),
        editedBy: settings.username,
        productName: newName,
        oldQty: p.vitrinaQty,
        newQty: p.vitrinaQty,
        unit: p.unit,
        action: "edit",
        changes,
      });
    });

    setVersion((v) => v + 1);
    setBulkEditOpen(false);
    clearSelection();
  };
  const deleteProduct = (productId: string) => {
    const idx = MOCK_PRODUCTS.findIndex((item) => item.id === productId);
    if (idx < 0) return;
    const p = MOCK_PRODUCTS[idx];
    if (!window.confirm(`${p.name} o'chirilsinmi?`)) return;
    MOCK_EDIT_HISTORY.unshift({
      id: `eh${Date.now()}`,
      date: new Date().toISOString(),
      editedBy: settings.username,
      productName: p.name,
      oldQty: p.vitrinaQty,
      newQty: 0,
      unit: p.unit,
      action: "delete",
    });
    MOCK_PRODUCTS.splice(idx, 1);
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(productId);
      return next;
    });
    setVersion((v) => v + 1);
  };
  const deleteSelectedProducts = () => {
    if (selectedProducts.length === 0) return;
    if (!window.confirm(`${selectedProducts.length} ta tovar bazadan o'chirilsinmi?`)) return;
    const date = new Date().toISOString();
    selectedProducts.forEach((p) => {
      MOCK_EDIT_HISTORY.unshift({
        id: `eh${Date.now()}-${p.id}`,
        date,
        editedBy: settings.username,
        productName: p.name,
        oldQty: p.vitrinaQty,
        newQty: 0,
        unit: p.unit,
        action: "delete",
      });
    });
    const idsToDelete = new Set(selectedProducts.map((p) => p.id));
    for (let i = MOCK_PRODUCTS.length - 1; i >= 0; i -= 1) {
      if (idsToDelete.has(MOCK_PRODUCTS[i].id)) MOCK_PRODUCTS.splice(i, 1);
    }
    toast.success("Tovarlar bazadan o'chirildi", {
      description: `${selectedProducts.length} ta tovar`,
    });
    clearSelection();
    setVersion((v) => v + 1);
  };

  const buildExportRows = () => {
    const columns = EXPORT_COLUMNS.filter((col) => exportColumns.has(col.key));
    const rows = filtered.map((p) =>
      columns.map((col) => {
        switch (col.key) {
          case "name":
            return p.name;
          case "qty":
            return p.vitrinaQty;
          case "costPrice":
            return p.costPrice;
          case "wholesalePrice":
            return p.wholesalePrice ?? "-";
          case "price":
            return p.price;
          case "barcode":
            return p.barcode;
          case "supplier":
            return getSupplierForProduct(p.name);
          default:
            return "";
        }
      }),
    );
    return { columns, rows };
  };

  const exportToExcel = () => {
    const { columns, rows } = buildExportRows();
    const worksheet = XLSX.utils.aoa_to_sheet([
      columns.map((c) => c.label),
      ...rows,
    ]);
    worksheet["!cols"] = columns.map(() => ({ wch: 20 }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Barcha tovarlar");
    XLSX.writeFile(workbook, `barcha-tovarlar-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportToPdf = () => {
    const { columns, rows } = buildExportRows();
    const doc = new jsPDF({ orientation: "landscape" });
    autoTable(doc, {
      head: [columns.map((c) => c.label)],
      body: rows.map((row) => row.map((cell) => String(cell))),
      styles: { font: "helvetica", fontSize: 9 },
      headStyles: { fillColor: [34, 44, 59] },
    });
    doc.save(`barcha-tovarlar-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleExportConfirm = () => {
    if (exportColumns.size === 0) {
      toast.error("Kamida bitta ustunni tanlang");
      return;
    }
    if (exportFormat === "excel") exportToExcel();
    else exportToPdf();
    setExportOpen(false);
  };

  const printQueue = React.useMemo(() => {
    if (printSettings.matchStockQty) {
      return selectedProducts
        .filter((product) => product.vitrinaQty > 0)
        .map((product) => ({ product, copies: product.vitrinaQty }));
    }
    return selectedProducts.map((product) => ({ product, copies: 1 }));
  }, [selectedProducts, printSettings.matchStockQty]);
  const printQueueCount = printQueue.reduce((sum, item) => sum + item.copies, 0);

  const printSelected = () => {
    if (printQueue.length === 0) return;
    printProductLabels(printQueue, printSettings);
    setPrintOpen(false);
  };

  const saveLabelPrintDefaults = () => {
    updateSettings({ labelPrintSettings: printSettings });
    toast.success("Print sozlamalari standart qilib saqlandi");
  };

  if (bulkEditOpen) {
    return (
      <BulkEditPage
        rows={bulkEditRows}
        onUpdateRow={updateBulkEditRow}
        onSave={saveBulkEdit}
        onCancel={() => setBulkEditOpen(false)}
        warehouses={settings.warehouses.map((w) => w.name)}
        shelfLocations={settings.shelfLocations.map((l) => l.name)}
        t={t}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b bg-card p-3">
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant={activeFilterCount > 0 ? "default" : "outline"}
              className="relative h-10 gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtr
              {activeFilterCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 space-y-3 p-3">
            <button
              type="button"
              onClick={() => setStockFilter((current) => (current === "all" ? "limited" : "all"))}
              className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors ${
                stockFilter === "limited"
                  ? "border-primary bg-primary/5 text-primary"
                  : "hover:bg-muted"
              }`}
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Ogohlantirishdagilar
              </span>
              {stockFilter === "limited" && <Check className="h-4 w-4" />}
            </button>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Ombor bo'yicha</Label>
              <Select value={warehouse} onValueChange={setWarehouse}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Ombor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Barcha omborlar</SelectItem>
                  {settings.warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.name}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Taminotchi bo'yicha</Label>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Taminotchi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Barcha taminotchilar</SelectItem>
                  {supplierOptions.map((agent) => (
                    <SelectItem key={agent.id} value={agent.name}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {activeFilterCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                className="h-8 w-full text-xs text-muted-foreground"
                onClick={() => {
                  setStockFilter("all");
                  setWarehouse("ALL");
                  setSupplierFilter("ALL");
                }}
              >
                Filtrni tozalash
              </Button>
            )}
          </PopoverContent>
        </Popover>

        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tovar nomi yoki shtrix kod..."
            className="h-10 pl-9 text-sm"
          />
        </div>
        <Popover open={addMenuOpen} onOpenChange={setAddMenuOpen}>
          <PopoverTrigger asChild>
            <Button className="h-10 gap-2">
              <PackagePlus className="h-4 w-4" /> Yangi tovar qo'shish
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 space-y-1 p-2">
            <button
              type="button"
              onClick={() => {
                setAddMenuOpen(false);
                onSetCreateMode("qabul");
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium hover:bg-muted"
            >
              <PackagePlus className="h-4 w-4" />
              Yangi tovar qo'shish
            </button>
            <button
              type="button"
              onClick={() => {
                setAddMenuOpen(false);
                setExcelModalOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium hover:bg-muted"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Exceldan yuklash
            </button>
          </PopoverContent>
        </Popover>
        <Button
          onClick={() => setExportOpen(true)}
          variant="outline"
          size="icon"
          className="h-10 w-10"
          title="Yuklab olish"
          aria-label="Yuklab olish"
        >
          <Download className="h-4 w-4" />
        </Button>
        <div className="ml-auto flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-1.5">
          <div className="text-right">
            <div className="text-[10px] uppercase text-muted-foreground">Jami soni</div>
            <div className="text-sm font-bold tabular-nums">{totalCount}</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-right">
            <div className="text-[10px] uppercase text-muted-foreground">Tan narx jami</div>
            <div className="text-sm font-bold tabular-nums text-primary">
              {formatSom(totalCost)}
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
            <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
              <th className="w-12 px-4 py-2.5 text-left font-semibold"></th>
              <th className="px-4 py-2.5 text-left font-semibold">
                <div className="flex items-center gap-2">
                  {selectedIds.size > 2 && !allFilteredSelected && (
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={selectAllFiltered}
                      title="Barchasini belgilash"
                      aria-label="Barchasini belgilash"
                    >
                      <CheckSquare className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {selectedIds.size > 0 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={clearSelection}
                      title={`Tozalash (${selectedIds.size})`}
                      aria-label="Tanlanganlarni tozalash"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <span>{t("product")}</span>
                </div>
              </th>
              {!hiddenColumns.has("limit") && (
                <th className="px-4 py-2.5 text-center font-semibold">Limit</th>
              )}
              <th className="px-4 py-2.5 text-right font-semibold">{t("cost_price")}</th>
              <th className="px-4 py-2.5 text-right font-semibold">{t("sale_price")}</th>
              <th className="px-4 py-2.5 text-right font-semibold">{t("qty")}</th>
              {!hiddenColumns.has("unit") && (
                <th className="px-4 py-2.5 text-left font-semibold">Birlik</th>
              )}
              {!hiddenColumns.has("shelf") && (
                <th className="px-4 py-2.5 text-left font-semibold">{t("shelf_location")}</th>
              )}
              <th className="px-4 py-2.5 text-left font-semibold">{t("warehouse")}</th>
              <th className="px-4 py-2.5 text-right font-semibold">{t("action")}</th>
              <th className="w-10 px-2 py-2.5 text-right font-semibold">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Ustunlarni sozlash"
                      aria-label="Ustunlarni sozlash"
                    >
                      <Columns3 className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 normal-case tracking-normal">
                    {OPTIONAL_COLUMNS.map((col) => (
                      <DropdownMenuCheckboxItem
                        key={col.key}
                        checked={!hiddenColumns.has(col.key)}
                        onCheckedChange={(checked) => toggleColumnVisibility(col.key, checked)}
                        onSelect={(e) => e.preventDefault()}
                      >
                        {col.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.id}
                className="cursor-pointer border-b hover:bg-muted/40"
                onDoubleClick={() => startEdit(p)}
              >
                <td className="px-4 py-2.5">
                  <Checkbox
                    checked={selectedIds.has(p.id)}
                    onCheckedChange={() => toggleProduct(p.id)}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`${p.name} tanlash`}
                  />
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{p.name}</div>
                    {isProductAtLimit(p) && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700"
                        title={`Limit: ${p.minStockAlert} ${p.unit}`}
                      >
                        <AlertTriangle className="h-3 w-3" />
                        Limit
                      </span>
                    )}
                  </div>
                  {editingId === p.id ? (
                    <div
                      className="mt-1 flex flex-wrap items-center gap-1"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {splitBarcodes(draft.barcode).map((code) => (
                        <span
                          key={code}
                          className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-0.5 text-[11px]"
                        >
                          {code}
                          <button
                            type="button"
                            onClick={() => removeDraftBarcodeChip(code)}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label={`${code} shtrix kodini o'chirish`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-6 w-6 shrink-0"
                        onClick={assignDraftBarcode}
                        title="Avtomatik shtrix kod qo'shish"
                      >
                        <Barcode className="h-3 w-3" />
                      </Button>
                      <Input
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;
                          e.preventDefault();
                          addManualDraftBarcode();
                        }}
                        onBlur={addManualDraftBarcode}
                        placeholder="Kod kiritish..."
                        className="h-6 w-28 text-[11px]"
                      />
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      {p.customCode} · {p.barcode}
                    </div>
                  )}
                </td>
                {!hiddenColumns.has("limit") && (
                  <td className="px-4 py-2.5 text-center">
                    {editingId === p.id ? (
                      <Input
                        type="number"
                        value={draft.minStockAlert}
                        onChange={(e) => updateDraft({ minStockAlert: e.target.value })}
                        className="mx-auto h-8 w-24 text-center"
                        placeholder="—"
                      />
                    ) : typeof p.minStockAlert === "number" ? (
                      <span
                        className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ${
                          isProductAtLimit(p)
                            ? "bg-amber-100 text-amber-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {p.minStockAlert} {p.unit}
                      </span>
                    ) : (
                      <span className="text-xs italic text-muted-foreground">yo'q</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {editingId === p.id ? (
                    <Input
                      type="number"
                      value={draft.costPrice}
                      onChange={(e) => updateDraft({ costPrice: e.target.value })}
                      className="ml-auto h-8 w-28 text-right"
                    />
                  ) : (
                    `${p.costPrice} ${p.costCurrency}`
                  )}
                </td>
                <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                  {editingId === p.id ? (
                    <Input
                      type="number"
                      value={draft.price}
                      onChange={(e) => updateDraft({ price: e.target.value })}
                      className="ml-auto h-8 w-28 text-right"
                    />
                  ) : (
                    formatSom(p.price)
                  )}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {editingId === p.id ? (
                    <div className="ml-auto inline-flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => changeDraftQty(-1)}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <Input
                        type="number"
                        value={draft.vitrinaQty}
                        onChange={(e) => updateDraft({ vitrinaQty: e.target.value })}
                        className="h-8 w-20 text-center"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => changeDraftQty(1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <span className={p.vitrinaQty < 10 ? "font-semibold text-destructive" : ""}>
                      {p.vitrinaQty}
                    </span>
                  )}
                </td>
                {!hiddenColumns.has("unit") && (
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {editingId === p.id ? (
                      <Select
                        value={draft.unit}
                        onValueChange={(value) => updateDraft({ unit: value })}
                      >
                        <SelectTrigger className="h-8 w-[120px]">
                          <SelectValue placeholder="Birlik" />
                        </SelectTrigger>
                        <SelectContent>
                          {settings.units.map((unit) => (
                            <SelectItem key={unit.id} value={unit.name}>
                              {unit.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      p.unit
                    )}
                  </td>
                )}
                {!hiddenColumns.has("shelf") && (
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {editingId === p.id ? (
                      <Select
                        value={draft.shelfLocation}
                        onValueChange={(value) =>
                          updateDraft({ shelfLocation: value === "NONE" ? "" : value })
                        }
                      >
                        <SelectTrigger className="h-8 w-[140px]">
                          <SelectValue placeholder="Tanlang" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">— Tozalash —</SelectItem>
                          {settings.shelfLocations.map((loc) => (
                            <SelectItem key={loc.id} value={loc.name}>
                              {loc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : p.shelfLocation ? (
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary ring-1 ring-inset ring-primary/20">
                        {p.shelfLocation}
                      </span>
                    ) : (
                      <span className="text-xs italic text-muted-foreground">belgilanmagan</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-2.5 text-muted-foreground">
                  {editingId === p.id ? (
                    <Select
                      value={draft.warehouse}
                      onValueChange={(value) => updateDraft({ warehouse: value })}
                    >
                      <SelectTrigger className="h-8 w-[180px]">
                        <SelectValue placeholder="Ombor" />
                      </SelectTrigger>
                      <SelectContent>
                        {settings.warehouses.map((w) => (
                          <SelectItem key={w.id} value={w.name}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    p.warehouse
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex justify-end gap-1">
                    {editingId === p.id ? (
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => saveProduct(p.id)}
                        title={t("save")}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => startEdit(p)}
                        title={t("edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteProduct(p.id)}
                      title={t("delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
                <td className="px-2 py-2.5"></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={11 - hiddenColumns.size}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  Hech narsa topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedIds.size > 0 &&
        selectionSlot &&
        createPortal(
          <>
            <div className="rounded-md bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary">
              {selectedIds.size} ta tovar tanlandi
            </div>

            <Popover open={editMenuOpen} onOpenChange={setEditMenuOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="h-9 gap-1.5 text-xs">
                  <Pencil className="h-3.5 w-3.5" />
                  Tahrirlash
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 space-y-1.5 p-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditMenuOpen(false);
                    openBulkEditDialog();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium hover:bg-muted"
                >
                  <Pencil className="h-4 w-4" />
                  Mahsulotlarni tahrirlash
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditMenuOpen(false);
                    openMergeAgentDialog();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium hover:bg-muted"
                >
                  <Link2 className="h-4 w-4" />
                  Tovarni agentga birlashtirish
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditMenuOpen(false);
                    openWriteOffDialog();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  <PackageMinus className="h-4 w-4" />
                  Hisobdan chiqarish
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditMenuOpen(false);
                    deleteSelectedProducts();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Bazadan o'chirish
                </button>
              </PopoverContent>
            </Popover>

            <Button
              type="button"
              variant="outline"
              className="h-9 gap-1.5 text-xs"
              onClick={() => setPrintOpen(true)}
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9"
              onClick={clearSelection}
              title="Bekor qilish"
              aria-label="Tanlovni bekor qilish"
            >
              <X className="h-4 w-4" />
            </Button>
          </>,
          selectionSlot,
        )}

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Tovarlarni yuklab olish
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Format</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={exportFormat === "excel" ? "default" : "outline"}
                  onClick={() => setExportFormat("excel")}
                  className="gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </Button>
                <Button
                  type="button"
                  variant={exportFormat === "pdf" ? "default" : "outline"}
                  onClick={() => setExportFormat("pdf")}
                  className="gap-2"
                >
                  <ReceiptText className="h-4 w-4" />
                  PDF
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Qaysi ustunlar chiqsin?</Label>
              <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
                {EXPORT_COLUMNS.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 text-sm font-normal"
                  >
                    <Checkbox
                      checked={exportColumns.has(col.key)}
                      onCheckedChange={(checked) =>
                        toggleExportColumn(col.key, checked === true)
                      }
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleExportConfirm} className="gap-2">
              <Download className="h-4 w-4" />
              Yuklab olish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={limitOpen} onOpenChange={setLimitOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ogohlantirish limiti</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="font-semibold">{selectedProducts.length} ta mahsulot tanlangan</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Limit har bir mahsulotning o'z birligida ishlaydi:{" "}
                {selectedUnitsLabel || "birlik aniqlanmagan"}.
              </div>
            </div>
            <div className="space-y-2">
              <Label>Minimal qoldiq limiti</Label>
              <Input
                type="number"
                min={0}
                value={limitInput}
                onChange={(event) => setLimitInput(event.target.value)}
                placeholder="Masalan: 10"
              />
              <div className="text-xs text-muted-foreground">
                Mahsulot vitrinadagi qoldiq shu songa teng yoki undan kam bo'lsa, sariq
                ogohlantirish chiqadi.
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLimitInput("")}>
              Limitni tozalash
            </Button>
            <Button onClick={applyStockLimit} className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={writeOffOpen} onOpenChange={setWriteOffOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <PackageMinus className="h-5 w-5" />
              Hisobdan chiqarish
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="font-semibold">{writeOffRows.length} ta mahsulot tanlangan</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Har bir mahsulot uchun hisobdan chiqariladigan miqdorni kiriting. Miqdor vitrinadagi
                qoldiqdan avtomatik ayiriladi.
              </div>
            </div>

            <div className="max-h-64 space-y-2 overflow-y-auto">
              {writeOffRows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-2.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Omborda: {row.currentQty} {row.unit}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={row.currentQty}
                      value={row.qty}
                      onChange={(e) => updateWriteOffQty(row.id, e.target.value)}
                      className="h-9 w-24 text-right"
                    />
                    <span className="text-xs text-muted-foreground">{row.unit}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Sabab (ixtiyoriy)</Label>
              <Textarea
                rows={3}
                value={writeOffReason}
                onChange={(e) => setWriteOffReason(e.target.value)}
                placeholder="Masalan: muddati o'tgan, buzilgan, yo'qolgan..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWriteOffOpen(false)}>
              Bekor
            </Button>
            <Button variant="destructive" onClick={confirmWriteOff} className="gap-2">
              <PackageMinus className="h-4 w-4" />
              Hisobdan chiqarish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mergeAgentOpen} onOpenChange={setMergeAgentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Tovarni agentga birlashtirish
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="font-semibold">{selectedProducts.length} ta mahsulot tanlangan</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Tovarlar shu agentdan kelgan deb belgilanadi. Keyingi safar shu tovarlar qabul
                qilinganda agent avtomatik aniqlanadi.
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Agent</Label>
              <Select
                value={mergeAgentId}
                onValueChange={(value) => {
                  setMergeAgentId(value);
                  if (value === "__new__") {
                    setMergeAgentName("");
                    setMergeAgentPhone("");
                    return;
                  }
                  const agent = agents.find((item: AgentSummary) => item.id === value);
                  if (!agent) return;
                  setMergeAgentName(agent.name);
                  setMergeAgentPhone(agent.phone);
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Agent tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__new__">+ Yangi agent</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mergeAgentId === "__new__" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Agent ismi</Label>
                  <Input
                    value={mergeAgentName}
                    onChange={(e) => setMergeAgentName(e.target.value)}
                    placeholder="Masalan: Bekzod Agent"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Telefon (ixtiyoriy)</Label>
                  <Input
                    value={mergeAgentPhone}
                    onChange={(e) => setMergeAgentPhone(e.target.value)}
                    placeholder="+998 XX XXX XX XX"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs">Qarz bo'yicha</Label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setMergeMode("current-stock")}
                  className={`rounded-md border p-2.5 text-left text-xs transition-colors ${
                    mergeMode === "current-stock" ? "border-primary bg-primary/5" : "hover:bg-muted"
                  }`}
                >
                  <div className="font-semibold">Joriy qoldiq bo'yicha qarz sifatida</div>
                  <div className="mt-0.5 text-muted-foreground">
                    Tanlangan tovarlarning hozirgi qoldig'i tan narxda hisoblanib, agentga qarz
                    sifatida yoziladi:{" "}
                    <span className="font-semibold text-foreground">
                      {formatSom(mergeTotalCost)}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setMergeMode("zero-debt")}
                  className={`rounded-md border p-2.5 text-left text-xs transition-colors ${
                    mergeMode === "zero-debt" ? "border-primary bg-primary/5" : "hover:bg-muted"
                  }`}
                >
                  <div className="font-semibold">0 qarz bilan birlashtirish</div>
                  <div className="mt-0.5 text-muted-foreground">
                    Hozirgi qoldiq uchun qarz yozilmaydi — faqat keyingi safar shu tovarlar qabul
                    qilinganda agentga qarz hisoblana boshlaydi.
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Izoh (ixtiyoriy)</Label>
              <Input
                value={mergeNote}
                onChange={(e) => setMergeNote(e.target.value)}
                placeholder="Ixtiyoriy izoh"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeAgentOpen(false)}>
              Bekor
            </Button>
            <Button onClick={confirmMergeAgent} className="gap-2">
              <Link2 className="h-4 w-4" />
              Birlashtirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent className="max-h-[85vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Print sozlamalari</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="font-semibold">{selectedProducts.length} ta mahsulot tanlangan</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Kerakli ko'rinish, qog'oz razmeri va kattalikni shu yerdan o'zgartiring.
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <button
                    type="button"
                    onClick={() =>
                      setPrintSettings((current) => ({
                        ...current,
                        receiptMode: !current.receiptMode,
                      }))
                    }
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold">
                      <ReceiptText className="h-4 w-4" /> Chek holati
                    </span>
                    <span className="text-xs font-bold text-primary">
                      {printSettings.receiptMode ? "Yoqilgan" : "Ixtiyoriy"}
                    </span>
                  </button>
                </div>

                <div className="rounded-lg border p-3">
                  <button
                    type="button"
                    onClick={() =>
                      setPrintSettings((current) => ({
                        ...current,
                        matchStockQty: !current.matchStockQty,
                      }))
                    }
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold">
                      <PackagePlus className="h-4 w-4" /> Miqdorga mos chop etish
                    </span>
                    <span className="text-xs font-bold text-primary">
                      {printSettings.matchStockQty ? "Yoqilgan" : "Ixtiyoriy"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border p-3">
                <Label className="text-xs">Maydonlar va har birining o'lchami</Label>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  <PrintFieldRow
                    icon={<Tag className="h-3.5 w-3.5" />}
                    title="Mahsulot nomi"
                    active={printSettings.includeName}
                    scale={printSettings.fieldScale.name}
                    onToggle={() =>
                      setPrintSettings((current) => ({
                        ...current,
                        includeName: !current.includeName,
                      }))
                    }
                    onScaleChange={(next) =>
                      setPrintSettings((current) => ({
                        ...current,
                        fieldScale: { ...current.fieldScale, name: next },
                      }))
                    }
                  />
                  <PrintFieldRow
                    icon={<Barcode className="h-3.5 w-3.5" />}
                    title="Shtrix kodi"
                    active={printSettings.includeBarcode}
                    scale={printSettings.fieldScale.barcode}
                    onToggle={() =>
                      setPrintSettings((current) => ({
                        ...current,
                        includeBarcode: !current.includeBarcode,
                      }))
                    }
                    onScaleChange={(next) =>
                      setPrintSettings((current) => ({
                        ...current,
                        fieldScale: { ...current.fieldScale, barcode: next },
                      }))
                    }
                  />
                  <PrintFieldRow
                    icon={<Barcode className="h-3.5 w-3.5" />}
                    title="Artikuli"
                    active={printSettings.includeCustomCode}
                    scale={printSettings.fieldScale.code}
                    onToggle={() =>
                      setPrintSettings((current) => ({
                        ...current,
                        includeCustomCode: !current.includeCustomCode,
                      }))
                    }
                    onScaleChange={(next) =>
                      setPrintSettings((current) => ({
                        ...current,
                        fieldScale: { ...current.fieldScale, code: next },
                      }))
                    }
                  />
                  <PrintFieldRow
                    icon={<Tag className="h-3.5 w-3.5" />}
                    title="Sotuv narxi"
                    active={printSettings.includePrice}
                    scale={printSettings.fieldScale.price}
                    onToggle={() =>
                      setPrintSettings((current) => ({
                        ...current,
                        includePrice: !current.includePrice,
                      }))
                    }
                    onScaleChange={(next) =>
                      setPrintSettings((current) => ({
                        ...current,
                        fieldScale: { ...current.fieldScale, price: next },
                      }))
                    }
                  />
                  <PrintFieldRow
                    icon={<Tag className="h-3.5 w-3.5" />}
                    title="Polka raqami"
                    active={printSettings.includeShelfLocation}
                    scale={printSettings.fieldScale.shelf}
                    onToggle={() =>
                      setPrintSettings((current) => ({
                        ...current,
                        includeShelfLocation: !current.includeShelfLocation,
                      }))
                    }
                    onScaleChange={(next) =>
                      setPrintSettings((current) => ({
                        ...current,
                        fieldScale: { ...current.fieldScale, shelf: next },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 rounded-lg border p-3">
                  <Label className="text-xs">Qog'oz razmeri</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "thermal58" as const, label: "58mm" },
                      { value: "thermal80" as const, label: "80mm" },
                      { value: "a6" as const, label: "A6" },
                      { value: "a4" as const, label: "A4" },
                    ].map((item) => (
                      <Button
                        key={item.value}
                        type="button"
                        variant={printSettings.paperSize === item.value ? "default" : "outline"}
                        className="h-9 text-xs"
                        onClick={() =>
                          setPrintSettings((current) => ({ ...current, paperSize: item.value }))
                        }
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border p-3">
                  <Label className="text-xs">Bazaviy o'lcham</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "small" as const, label: "Kichik" },
                      { value: "medium" as const, label: "O'rtacha" },
                      { value: "large" as const, label: "Katta" },
                    ].map((item) => (
                      <Button
                        key={item.value}
                        type="button"
                        variant={printSettings.size === item.value ? "default" : "outline"}
                        className="h-9 text-xs"
                        onClick={() =>
                          setPrintSettings((current) => ({ ...current, size: item.value }))
                        }
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <p className="-mt-1 text-[11px] text-muted-foreground">
                Bazaviy o'lcham barcha maydonlarning boshlang'ich razmerini belgilaydi; har birini
                alohida moslashtirish uchun yuqoridagi ro'yxatdan foydalaning. "Miqdorga mos chop
                etish" yoqilsa, har bir mahsulot uchun vitrinadagi qoldiq soniga teng miqdorda
                shtrix kod chop etiladi.
              </p>

              <div className="space-y-2 rounded-lg border p-3">
                <Button
                  type="button"
                  variant={printSettings.commentEnabled ? "default" : "outline"}
                  className="h-9 w-full justify-start gap-2 text-xs"
                  onClick={() =>
                    setPrintSettings((current) => ({
                      ...current,
                      commentEnabled: !current.commentEnabled,
                    }))
                  }
                >
                  <MessageSquareText className="h-4 w-4" />
                  Pastki comment qo'shish
                </Button>
                {printSettings.commentEnabled && (
                  <Input
                    value={printSettings.comment}
                    onChange={(event) =>
                      setPrintSettings((current) => ({
                        ...current,
                        comment: event.target.value,
                      }))
                    }
                    placeholder="Masalan: Xaridingiz uchun rahmat"
                    className="h-9 text-xs"
                  />
                )}
              </div>
            </div>

            <PrintPreview product={selectedProducts[0]} settings={printSettings} />
          </div>
          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="gap-2"
              onClick={saveLabelPrintDefaults}
            >
              <Save className="h-4 w-4" />
              Standart qilib saqlash
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPrintOpen(false)}>
                Bekor
              </Button>
              <Button onClick={printSelected} disabled={printQueue.length === 0} className="gap-2">
                <Printer className="h-4 w-4" />
                Print ({printQueueCount})
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {excelModalOpen && (
        <ExcelYuklashModal
          currencies={excelCurrencies}
          stocks={excelStocks}
          shelfNumbers={excelShelfNumbers}
          agents={excelAgents}
          onClose={() => setExcelModalOpen(false)}
          onSubmit={handleExcelSubmit}
        />
      )}
    </div>
  );
}

function PrintPreview({ product, settings }: { product?: Product; settings: PrintSettings }) {
  const previewProduct = product ?? MOCK_PRODUCTS[0];
  const base = LABEL_SIZE_PRESETS[settings.size];
  const fieldPx = (basePx: number, field: PrintField) =>
    Math.round(basePx * (settings.fieldScale[field] / 100));
  const paperLabel = {
    thermal58: "58mm lenta",
    thermal80: "80mm lenta",
    a6: "A6 qog'oz",
    a4: "A4 qog'oz",
  }[settings.paperSize];

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-semibold">Real-time ko'rinish</div>
        <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
          {paperLabel}
        </span>
      </div>
      <div
        className={`mx-auto rounded-md border bg-white p-3 text-slate-900 shadow-sm ${
          settings.receiptMode ? "max-w-[190px] border-dashed text-center" : "max-w-[230px]"
        }`}
      >
        {settings.receiptMode && (
          <div className="mb-2 border-b border-dashed border-slate-400 pb-1 text-[10px] font-black tracking-widest">
            TOVAR CHEKI
          </div>
        )}
        {settings.includeName && (
          <div
            className="font-bold leading-tight"
            style={{ fontSize: fieldPx(base.nameSize, "name") }}
          >
            {previewProduct?.name ?? "Mahsulot nomi"}
          </div>
        )}
        {settings.includeBarcode && (
          <div
            className="mt-2 break-all font-mono tracking-wide"
            style={{ fontSize: fieldPx(base.barcodeSize, "barcode") }}
          >
            {previewProduct?.barcode || "8690123456789"}
          </div>
        )}
        {settings.includeCustomCode && (
          <div className="mt-1 text-slate-500" style={{ fontSize: fieldPx(base.codeSize, "code") }}>
            {previewProduct?.customCode || "KOD-001"}
          </div>
        )}
        {settings.includePrice && (
          <div
            className="mt-2 font-black text-slate-950"
            style={{ fontSize: fieldPx(base.priceSize, "price") }}
          >
            {formatSom(previewProduct?.price ?? 0)}
          </div>
        )}
        {settings.includeShelfLocation && (
          <div
            className="mt-1 text-slate-500"
            style={{ fontSize: fieldPx(base.shelfSize, "shelf") }}
          >
            Polka: {previewProduct?.shelfLocation || "—"}
          </div>
        )}
        {settings.commentEnabled && settings.comment.trim() && (
          <div className="mt-2 border-t border-dashed border-slate-300 pt-1 text-[11px] text-slate-600">
            {settings.comment.trim()}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ApplyAllCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      Barchasiga qo'llash
    </label>
  );
}

type ApplyAllField = "costPrice" | "price" | "warehouse" | "shelfLocation" | "minStockAlert";

function BulkEditPage({
  rows,
  onUpdateRow,
  onSave,
  onCancel,
  warehouses,
  shelfLocations,
  t,
}: {
  rows: BulkEditRow[];
  onUpdateRow: (id: string, patch: Partial<BulkEditRow>) => void;
  onSave: () => void;
  onCancel: () => void;
  warehouses: string[];
  shelfLocations: string[];
  t: (key: string) => string;
}) {
  const [applyAll, setApplyAll] = React.useState<Record<ApplyAllField, boolean>>({
    costPrice: false,
    price: false,
    warehouse: false,
    shelfLocation: false,
    minStockAlert: false,
  });

  const changeFirstRowField = (field: ApplyAllField, value: string) => {
    onUpdateRow(rows[0].id, { [field]: value } as Partial<BulkEditRow>);
    if (applyAll[field]) {
      rows
        .slice(1)
        .forEach((row) => onUpdateRow(row.id, { [field]: value } as Partial<BulkEditRow>));
    }
  };

  const toggleApplyAll = (field: ApplyAllField, checked: boolean) => {
    setApplyAll((current) => ({ ...current, [field]: checked }));
    if (checked && rows.length > 0) {
      const value = rows[0][field];
      rows
        .slice(1)
        .forEach((row) => onUpdateRow(row.id, { [field]: value } as Partial<BulkEditRow>));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b bg-card p-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={onCancel}
          title="Orqaga"
          aria-label="Orqaga"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="text-base font-bold">Mahsulotlarni tahrirlash</div>
          <div className="text-xs text-muted-foreground">
            {rows.length} ta mahsulot tanlangan. Har birining nomi, tan narxi, sotuv narxi, optom
            narxi, shtrix kodi, ombori va polka raqamini alohida o'zgartiring.
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={onCancel}>
            Bekor
          </Button>
          <Button onClick={onSave} className="gap-2">
            <Save className="h-4 w-4" />
            Saqlash
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {rows.map((row, index) => (
          <div key={row.id} className="rounded-lg border bg-card p-3 shadow-sm">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">
                {index + 1}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-8">
              <Field label="Tovar nomi">
                <Input
                  value={row.name}
                  onChange={(e) => onUpdateRow(row.id, { name: e.target.value })}
                  className="h-9 text-xs"
                />
              </Field>
              <Field label="Tan narx">
                <Input
                  type="number"
                  value={row.costPrice}
                  onChange={(e) =>
                    index === 0
                      ? changeFirstRowField("costPrice", e.target.value)
                      : onUpdateRow(row.id, { costPrice: e.target.value })
                  }
                  className="h-9 text-xs"
                />
                {index === 0 && (
                  <ApplyAllCheckbox
                    checked={applyAll.costPrice}
                    onChange={(checked) => toggleApplyAll("costPrice", checked)}
                  />
                )}
              </Field>
              <Field label="Sotuv narxi">
                <Input
                  type="number"
                  value={row.price}
                  onChange={(e) =>
                    index === 0
                      ? changeFirstRowField("price", e.target.value)
                      : onUpdateRow(row.id, { price: e.target.value })
                  }
                  className="h-9 text-xs"
                />
                {index === 0 && (
                  <ApplyAllCheckbox
                    checked={applyAll.price}
                    onChange={(checked) => toggleApplyAll("price", checked)}
                  />
                )}
              </Field>
              <Field label="Optom narx">
                <Input
                  type="number"
                  value={row.wholesalePrice}
                  onChange={(e) => onUpdateRow(row.id, { wholesalePrice: e.target.value })}
                  placeholder="—"
                  className="h-9 text-xs"
                />
              </Field>
              <Field label="Shtrix kod">
                <Input
                  value={row.barcode}
                  onChange={(e) => onUpdateRow(row.id, { barcode: e.target.value })}
                  className="h-9 text-xs"
                />
              </Field>
              <Field label={t("warehouse")}>
                <Select
                  value={row.warehouse}
                  onValueChange={(value) =>
                    index === 0
                      ? changeFirstRowField("warehouse", value)
                      : onUpdateRow(row.id, { warehouse: value })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Ombor" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w} value={w}>
                        {w}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {index === 0 && (
                  <ApplyAllCheckbox
                    checked={applyAll.warehouse}
                    onChange={(checked) => toggleApplyAll("warehouse", checked)}
                  />
                )}
              </Field>
              <Field label={t("shelf_location")}>
                <Select
                  value={row.shelfLocation || "NONE"}
                  onValueChange={(value) => {
                    const next = value === "NONE" ? "" : value;
                    index === 0
                      ? changeFirstRowField("shelfLocation", next)
                      : onUpdateRow(row.id, { shelfLocation: next });
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">— Tozalash —</SelectItem>
                    {shelfLocations.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {index === 0 && (
                  <ApplyAllCheckbox
                    checked={applyAll.shelfLocation}
                    onChange={(checked) => toggleApplyAll("shelfLocation", checked)}
                  />
                )}
              </Field>
              <Field label="Limit">
                <Input
                  type="number"
                  value={row.minStockAlert}
                  onChange={(e) =>
                    index === 0
                      ? changeFirstRowField("minStockAlert", e.target.value)
                      : onUpdateRow(row.id, { minStockAlert: e.target.value })
                  }
                  placeholder="—"
                  className="h-9 text-xs"
                />
                {index === 0 && (
                  <ApplyAllCheckbox
                    checked={applyAll.minStockAlert}
                    onChange={(checked) => toggleApplyAll("minStockAlert", checked)}
                  />
                )}
              </Field>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrintFieldRow({
  icon,
  title,
  active,
  scale,
  onToggle,
  onScaleChange,
}: {
  icon: React.ReactNode;
  title: string;
  active: boolean;
  scale: number;
  onToggle: () => void;
  onScaleChange: (next: number) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-lg border p-2 transition-colors ${
        active ? "border-primary bg-primary/5" : "bg-card"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-2 text-xs font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}
      >
        {icon}
        {title}
      </button>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-6 w-6"
          disabled={!active}
          onClick={() => onScaleChange(Math.max(50, scale - 10))}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-10 text-center text-[11px] font-bold tabular-nums">{scale}%</span>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-6 w-6"
          disabled={!active}
          onClick={() => onScaleChange(Math.min(200, scale + 10))}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
