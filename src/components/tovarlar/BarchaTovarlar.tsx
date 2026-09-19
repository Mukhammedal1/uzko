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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle,
  ArrowLeft,
  Barcode,
  Check,
  ChevronDown,
  ChevronUp,
  Columns3,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Hash,
  Link2,
  ListOrdered,
  MessageSquareText,
  PackageMinus,
  PackagePlus,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  Save,
  ScanLine,
  Search,
  Tag,
  Trash2,
  Type,
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
  computeMarkupPrice,
  reverseMarkupPercent,
  isProductAtLimit,
  getAgentsList,
  type AgentSummary,
  type Product,
  type ProductVariant,
  type Currency,
} from "@/lib/mock-data";
import { mergeProductsWithAgent, recordProductAddition } from "@/lib/data-actions";
import {
  ExcelYuklashModal,
  type ImportRow,
  type ImportPayment,
} from "@/components/tovarlar/ExcelYuklashModal";
import {
  DEFAULT_PRINT_SETTINGS,
  FIELD_LABELS,
  LABEL_FONT_OPTIONS,
  LABEL_SIZE_PRESETS,
  MIN_LABEL_MARGIN_MM,
  buildBarcodeSvg,
  clampMarginMm,
  flattenPrintQueue,
  formatCostCode,
  getLabelDimensionsMm,
  normalizeFieldOrder,
  printProductLabels,
  type LabelFont,
  type LabelPreset,
  type OrderableField,
  type PrintField,
  type PrintSettings,
  type ScanCodeSource,
} from "@/lib/label-print";
import { useApp } from "@/lib/app-context";
import {
  joinBarcodes,
  makeUniqueBarcode,
  makeUniqueCustomCode,
  splitBarcodes,
} from "@/lib/barcode-utils";
import { formatNumberInput, parseNumberInput } from "@/lib/utils";
import type { ProductCreateMode } from "@/routes/tovarlar";
import { toast } from "sonner";
import { CurrencyField, ImageUploadField, MarkupRow } from "./TovarQoshish";

type EditVariantDraft = {
  id: string;
  label: string;
  costCurrency: Currency;
  costPrice: string;
  wholesaleCurrency: Currency;
  wholesalePrice: string;
  priceCurrency: Currency;
  price: string;
  barcode: string;
  customCode: string;
  image?: string;
};

type EditDraft = {
  name: string;
  image?: string;
  costPrice: string;
  costCurrency: Currency;
  wholesalePrice: string;
  wholesaleCurrency: Currency;
  wholesaleMarkupPercent: string;
  wholesaleMarkupWarn: boolean;
  price: string;
  priceCurrency: Currency;
  priceMarkupPercent: string;
  priceMarkupWarn: boolean;
  vitrinaQty: string;
  unit: string;
  warehouse: string;
  shelfLocation: string;
  minStockAlert: string;
  barcode: string;
  customCode: string;
  variants: EditVariantDraft[];
};

const makeEditVariantDraft = (v?: ProductVariant): EditVariantDraft => ({
  id: v?.id ?? `variant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  label: v?.label ?? "",
  costCurrency: v?.costCurrency ?? "UZS",
  costPrice: v?.costPrice ? String(v.costPrice) : "",
  wholesaleCurrency: v?.wholesaleCurrency ?? "UZS",
  wholesalePrice: v?.wholesalePrice ? String(v.wholesalePrice) : "",
  priceCurrency: v?.priceCurrency ?? "UZS",
  price: v?.price ? String(v.price) : "",
  barcode: v?.barcode ?? "",
  customCode: v?.customCode ?? "",
  image: v?.image,
});

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

type OptionalColumn = "limit" | "unit" | "shelf" | "wholesale" | "customCode";

const OPTIONAL_COLUMNS: { key: OptionalColumn; label: string }[] = [
  { key: "limit", label: "Limit" },
  { key: "unit", label: "Birlik" },
  { key: "shelf", label: "Polka raqami" },
  { key: "wholesale", label: "Optom narx" },
  { key: "customCode", label: "Artikul" },
];

const HIDDEN_COLUMNS_STORAGE_KEY = "uzko-tovarlar-hidden-columns";

type ExportFormat = "excel" | "pdf";

type ExportColumnKey =
  "name" | "qty" | "costPrice" | "wholesalePrice" | "price" | "barcode" | "supplier";

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

const PRODUCT_IMPORT_TEMPLATE_COLUMNS = [
  "MAHSULOT NOMI",
  "TAN NARX",
  "TAN NARX VALYUTASI",
  "SOTUV NARX",
  "SHTRIX KOD",
  "ARTIKUL",
];

/** "Exceldan yuklash" oynasiga mos, bo'sh (faqat sarlavhali) shablon fayl yuklab beradi. */
function downloadProductImportTemplate() {
  const worksheet = XLSX.utils.aoa_to_sheet([PRODUCT_IMPORT_TEMPLATE_COLUMNS]);
  worksheet["!cols"] = PRODUCT_IMPORT_TEMPLATE_COLUMNS.map(() => ({ wch: 20 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Shablon");
  XLSX.writeFile(workbook, "tovar-qoshish-shabloni.xlsx");
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
  const [excelModalOpen, setExcelModalOpen] = React.useState(false);
  const [mergeAgentOpen, setMergeAgentOpen] = React.useState(false);
  const [mergeAgentId, setMergeAgentId] = React.useState<string>("__new__");
  const [mergeAgentName, setMergeAgentName] = React.useState("");
  const [mergeAgentPhone, setMergeAgentPhone] = React.useState("");
  const [mergeMode, setMergeMode] = React.useState<"current-stock" | "zero-debt">("current-stock");
  const [mergeNote, setMergeNote] = React.useState("");
  const [printSettings, setPrintSettings] = React.useState<PrintSettings>(() => ({
    ...DEFAULT_PRINT_SETTINGS,
    ...settings.labelPrintSettings,
    fieldScale: {
      ...DEFAULT_PRINT_SETTINGS.fieldScale,
      ...settings.labelPrintSettings?.fieldScale,
    },
  }));
  const [stockFilter, setStockFilter] = React.useState<"all" | "limited">("all");
  const [supplierFilter, setSupplierFilter] = React.useState<string>("ALL");
  const [draft, setDraft] = React.useState<EditDraft>({
    name: "",
    costPrice: "",
    costCurrency: "UZS",
    wholesalePrice: "",
    wholesaleCurrency: "UZS",
    wholesaleMarkupPercent: "",
    wholesaleMarkupWarn: false,
    price: "",
    priceCurrency: "UZS",
    priceMarkupPercent: "",
    priceMarkupWarn: false,
    vitrinaQty: "",
    unit: "",
    warehouse: "",
    shelfLocation: "",
    minStockAlert: "",
    barcode: "",
    customCode: "",
    variants: [],
  });

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_PRODUCTS.filter((p) => {
      if (warehouse !== "ALL" && p.warehouse !== warehouse) return false;
      if (stockFilter === "limited" && !isProductAtLimit(p)) return false;
      if (supplierFilter !== "ALL" && getSupplierForProduct(p.name) !== supplierFilter)
        return false;
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
      name: product.name,
      image: product.image,
      costPrice: String(product.costPrice),
      costCurrency: product.costCurrency,
      wholesalePrice: product.wholesalePrice ? String(product.wholesalePrice) : "",
      wholesaleCurrency: product.wholesaleCurrency ?? "UZS",
      wholesaleMarkupPercent:
        typeof product.wholesaleMarkupPercent === "number"
          ? String(product.wholesaleMarkupPercent)
          : "",
      wholesaleMarkupWarn: false,
      price: String(product.price),
      priceCurrency: product.priceCurrency ?? "UZS",
      priceMarkupPercent:
        typeof product.priceMarkupPercent === "number" ? String(product.priceMarkupPercent) : "",
      priceMarkupWarn: false,
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
      customCode: product.customCode,
      variants: (product.variants ?? []).map((v) => makeEditVariantDraft(v)),
    });
  };

  const updateDraft = (patch: Partial<EditDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const assignDraftBarcode = () => {
    const currentCodes = splitBarcodes(draft.barcode);
    const nextCode = makeUniqueBarcode(currentCodes);
    updateDraft({ barcode: joinBarcodes([...currentCodes, nextCode]) });
  };

  const assignDraftCustomCode = () => {
    const nextCode = makeUniqueCustomCode(draft.customCode ? [draft.customCode] : []);
    updateDraft({ customCode: nextCode });
  };

  /** Optom/sotuv narx qo'lda o'zgartirilib, inputdan chiqilganda (blur) — tan
   * narxdan qancha foiz ustama qo'yilgani orqaga hisoblab, foiz maydoniga yoziladi. */
  const handleDraftWholesaleBlur = () => {
    const cost = parseNumberInput(draft.costPrice);
    const priceNum = parseNumberInput(draft.wholesalePrice);
    if (!cost) {
      updateDraft({ wholesaleMarkupWarn: priceNum > 0 });
      return;
    }
    if (!priceNum) {
      updateDraft({ wholesaleMarkupWarn: false });
      return;
    }
    const percent = reverseMarkupPercent(
      cost,
      draft.costCurrency,
      priceNum,
      draft.wholesaleCurrency,
    );
    updateDraft({
      wholesaleMarkupPercent:
        percent === null ? draft.wholesaleMarkupPercent : formatNumberInput(String(percent)),
      wholesaleMarkupWarn: percent === null,
    });
  };

  const handleDraftPriceBlur = () => {
    const cost = parseNumberInput(draft.costPrice);
    const priceNum = parseNumberInput(draft.price);
    if (!cost) {
      updateDraft({ priceMarkupWarn: priceNum > 0 });
      return;
    }
    if (!priceNum) {
      updateDraft({ priceMarkupWarn: false });
      return;
    }
    const percent = reverseMarkupPercent(cost, draft.costCurrency, priceNum, draft.priceCurrency);
    updateDraft({
      priceMarkupPercent:
        percent === null ? draft.priceMarkupPercent : formatNumberInput(String(percent)),
      priceMarkupWarn: percent === null,
    });
  };

  const handleEditImagePick = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateDraft({ image: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const updateEditVariant = (variantId: string, patch: Partial<EditVariantDraft>) => {
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((v) => (v.id === variantId ? { ...v, ...patch } : v)),
    }));
  };

  const addEditVariant = () => {
    setDraft((current) => ({
      ...current,
      variants: [...current.variants, makeEditVariantDraft()],
    }));
  };

  const removeEditVariant = (variantId: string) => {
    setDraft((current) => ({
      ...current,
      variants: current.variants.filter((v) => v.id !== variantId),
    }));
  };

  const collectEditUsedCodes = () => {
    const usedBarcodes = new Set<string>(splitBarcodes(draft.barcode));
    const usedCustomCodes = new Set<string>(draft.customCode ? [draft.customCode] : []);
    draft.variants.forEach((v) => {
      splitBarcodes(v.barcode).forEach((code) => usedBarcodes.add(code));
      if (v.customCode) usedCustomCodes.add(v.customCode);
    });
    return { usedBarcodes, usedCustomCodes };
  };

  const assignEditVariantBarcode = (variantId: string) => {
    const { usedBarcodes } = collectEditUsedCodes();
    updateEditVariant(variantId, { barcode: makeUniqueBarcode(usedBarcodes) });
  };

  const assignEditVariantCustomCode = (variantId: string) => {
    const { usedCustomCodes } = collectEditUsedCodes();
    updateEditVariant(variantId, { customCode: makeUniqueCustomCode(usedCustomCodes) });
  };

  const handleEditVariantImagePick = (variantId: string, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateEditVariant(variantId, { image: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const saveProduct = (productId: string) => {
    const p = MOCK_PRODUCTS.find((item) => item.id === productId);
    if (!p) return;

    const oldName = p.name;
    const oldQty = p.vitrinaQty;
    const oldPrice = p.price;
    const oldCostPrice = p.costPrice;
    const oldWholesalePrice = p.wholesalePrice ?? 0;
    const oldCustomCode = p.customCode;
    const oldUnit = p.unit;
    const oldWarehouse = p.warehouse;
    const oldShelf = p.shelfLocation;
    const oldBarcode = p.barcode;
    const newQty = Math.max(0, Number(draft.vitrinaQty) || 0);
    const newPrice = Math.max(0, Number(draft.price) || 0);
    const newPriceCurrency = draft.priceCurrency;
    const newCostPrice = Math.max(0, Number(draft.costPrice) || 0);
    const newCostCurrency = draft.costCurrency;
    const newWholesalePrice = Math.max(0, Number(draft.wholesalePrice) || 0);
    const newWholesaleCurrency = draft.wholesaleCurrency;
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
    const newCustomCode = draft.customCode.trim() || makeUniqueCustomCode();
    const newName = draft.name.trim() || p.name;

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
            oldValue: oldWholesalePrice,
            newValue: newWholesalePrice,
          }
        : null,
      oldCustomCode !== newCustomCode
        ? {
            field: "customCode" as const,
            label: "Artikul",
            oldValue: oldCustomCode,
            newValue: newCustomCode,
          }
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

    // Rasm/variantlar o'zgarish tarixida kuzatilmaydi, lekin Saqlash bosilganda
    // har doim joriy qoralama (draft) qiymati bilan yoziladi.
    p.image = draft.image;
    const originalVariants = p.variants ?? [];
    const usedVariantBarcodes = new Set<string>(splitBarcodes(newBarcode));
    const usedVariantCustomCodes = new Set<string>([newCustomCode]);
    const newVariants = draft.variants
      .filter((v) => v.label.trim())
      .map((v) => {
        const existing = originalVariants.find((ov) => ov.id === v.id);
        const vCost = Math.max(0, Number(v.costPrice) || 0);
        const vWholesale = Math.max(0, Number(v.wholesalePrice) || 0);
        const vPrice = Math.max(0, Number(v.price) || 0);
        const vBarcodeCodes = splitBarcodes(v.barcode);
        const vBarcode = joinBarcodes(
          vBarcodeCodes.length > 0 ? vBarcodeCodes : [makeUniqueBarcode(usedVariantBarcodes)],
        );
        splitBarcodes(vBarcode).forEach((code) => usedVariantBarcodes.add(code));
        const vCustomCode = v.customCode.trim() || makeUniqueCustomCode(usedVariantCustomCodes);
        usedVariantCustomCodes.add(vCustomCode);
        return {
          id: v.id,
          label: v.label.trim(),
          barcode: vBarcode,
          customCode: vCustomCode,
          image: v.image,
          price: vPrice > 0 ? vPrice : undefined,
          priceCurrency: vPrice > 0 ? v.priceCurrency : undefined,
          wholesalePrice: vWholesale > 0 ? vWholesale : undefined,
          wholesaleCurrency: vWholesale > 0 ? v.wholesaleCurrency : undefined,
          costPrice: vCost > 0 ? vCost : undefined,
          costCurrency: vCost > 0 ? v.costCurrency : undefined,
          vitrinaQty: existing?.vitrinaQty ?? 0,
          omborQty: existing?.omborQty ?? 0,
          minStockAlert: existing?.minStockAlert,
          perBox: existing?.perBox,
        };
      });
    p.variants = newVariants.length > 0 ? newVariants : undefined;

    if (changes.length > 0) {
      p.name = newName;
      p.costPrice = newCostPrice;
      p.costCurrency = newCostCurrency;
      p.price = newPrice;
      p.priceCurrency = newPriceCurrency;
      p.priceMarkupPercent = draft.priceMarkupPercent.trim()
        ? parseNumberInput(draft.priceMarkupPercent)
        : undefined;
      p.wholesalePrice = newWholesalePrice || undefined;
      p.wholesaleCurrency = newWholesalePrice ? newWholesaleCurrency : undefined;
      p.wholesaleMarkupPercent = draft.wholesaleMarkupPercent.trim()
        ? parseNumberInput(draft.wholesaleMarkupPercent)
        : undefined;
      p.vitrinaQty = newQty;
      p.unit = newUnit;
      p.warehouse = newWarehouse;
      p.shelfLocation = newShelf;
      p.minStockAlert = newMinStockAlert;
      p.barcode = newBarcode;
      p.customCode = newCustomCode;
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
    const worksheet = XLSX.utils.aoa_to_sheet([columns.map((c) => c.label), ...rows]);
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
  const printFlatQueue = React.useMemo(() => flattenPrintQueue(printQueue), [printQueue]);

  // Ko'p sonli yorliqni bir necha qismga bo'lib chop etish uchun ikki
  // alohida boshqaruv bor: usul (dropdown — hammasi bir yo'la / necha
  // qismga bo'lib / necha tadan) va shu usulga mos son (input). Ikkisidan
  // qaysi tanlansa ham, natijada bitta "qism o'lchami" (printEffectiveBatch)
  // hisoblanadi — chop etilganlik shu bitta hisoblagich (printedCount)
  // orqali kuzatiladi, shuning uchun usul yoki son o'zgarganda ham allaqachon
  // chop etilgan yorliqlar qayta bosilmaydi. Tovarlar ro'yxati o'zgarsa
  // (masalan tanlov yoki "Miqdorga mos chop etish" o'zgarsa) yoki dialog
  // qayta ochilsa, hisoblagich boshidan (0) qilinadi.
  const [printSplitMode, setPrintSplitMode] = React.useState<"all" | "parts" | "batch">("all");
  const [printActiveTab, setPrintActiveTab] = React.useState<"font" | "order" | "paper" | "output">(
    "font",
  );
  const [printSplitValue, setPrintSplitValue] = React.useState("");
  const [printedCount, setPrintedCount] = React.useState(0);
  React.useEffect(() => {
    setPrintedCount(0);
  }, [printOpen, printFlatQueue]);

  const printSplitValueNum = parseNumberInput(printSplitValue) || 0;
  const printEffectiveBatch =
    printSplitMode === "batch" && printSplitValueNum > 0
      ? printSplitValueNum
      : printSplitMode === "parts" && printSplitValueNum > 0
        ? Math.max(1, Math.ceil((printFlatQueue.length || 1) / printSplitValueNum))
        : printFlatQueue.length || 1;
  const printRemaining = Math.max(0, printFlatQueue.length - printedCount);
  const printNextBatchCount = Math.min(printEffectiveBatch, printRemaining);
  const printTotalParts = Math.max(
    1,
    Math.ceil((printFlatQueue.length || 1) / printEffectiveBatch),
  );

  const printSelected = () => {
    const batch = printFlatQueue
      .slice(printedCount, printedCount + printNextBatchCount)
      .map((product) => ({ product, copies: 1 }));
    if (batch.length === 0) return;
    printProductLabels(batch, printSettings);
    const nextCount = printedCount + batch.length;
    setPrintedCount(nextCount);
    if (nextCount >= printFlatQueue.length) setPrintOpen(false);
  };

  const saveLabelPrintDefaults = () => {
    updateSettings({ labelPrintSettings: printSettings });
    toast.success("Print sozlamalari standart qilib saqlandi");
  };

  // Yorliqdagi maydonlar (narx, nomi, shtrix kod, artikul, polka) tartibini
  // foydalanuvchi o'zi belgilagan ketma-ketlikka ko'chirish uchun.
  const moveFieldOrder = (field: OrderableField, direction: -1 | 1) => {
    setPrintSettings((current) => {
      const order = normalizeFieldOrder(current.fieldOrder);
      const index = order.indexOf(field);
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= order.length) return current;
      const next = [...order];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return { ...current, fieldOrder: next };
    });
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

  if (printOpen) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b bg-card p-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10"
            onClick={() => setPrintOpen(false)}
            title="Orqaga"
            aria-label="Orqaga"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="text-base font-bold">Print sozlamalari</div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="gap-2"
              onClick={saveLabelPrintDefaults}
            >
              <Save className="h-4 w-4" />
              Standart qilib saqlash
            </Button>
            <Button variant="outline" onClick={() => setPrintOpen(false)}>
              Bekor
            </Button>
            <Button onClick={printSelected} disabled={printNextBatchCount === 0} className="gap-2">
              <Printer className="h-4 w-4" />
              {printedCount > 0
                ? `Keyingi qismni chop etish (${printNextBatchCount})`
                : `Print (${printNextBatchCount})`}
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="grid min-h-0 gap-3 md:grid-cols-[minmax(0,1fr)_320px]">
            <Tabs
              value={printActiveTab}
              onValueChange={(value) =>
                setPrintActiveTab(value as "font" | "order" | "paper" | "output")
              }
            >
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="font" className="gap-1.5">
                  <Type className="h-3.5 w-3.5" />
                  Shrift va maydonlar
                </TabsTrigger>
                <TabsTrigger value="order" className="gap-1.5">
                  <ListOrdered className="h-3.5 w-3.5" />
                  Tartib
                </TabsTrigger>
                <TabsTrigger value="paper" className="gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Qog'oz
                </TabsTrigger>
                <TabsTrigger value="output" className="gap-1.5">
                  <Printer className="h-3.5 w-3.5" />
                  Chop etish
                </TabsTrigger>
              </TabsList>

              <TabsContent value="font" className="space-y-3">
                <div className="space-y-2 rounded-xl border p-3.5">
                  <Label className="text-xs">Shrift (tovar nomi va narxi uchun)</Label>
                  <Select
                    value={printSettings.fontFamily}
                    onValueChange={(value: LabelFont) =>
                      setPrintSettings((current) => ({ ...current, fontFamily: value }))
                    }
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Shrift" />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        Object.entries(LABEL_FONT_OPTIONS) as [
                          LabelFont,
                          { label: string; family: string },
                        ][]
                      ).map(([value, opt]) => (
                        <SelectItem key={value} value={value} style={{ fontFamily: opt.family }}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] leading-snug text-muted-foreground">
                    Tovar nomi va narxi shu shriftda bosiladi — aniq va oson o'qilishi uchun
                    tanlang.
                  </p>
                </div>

                <div className="space-y-2 rounded-xl border p-3.5">
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
                    <PrintFieldRow
                      icon={<DollarSign className="h-3.5 w-3.5" />}
                      title="Tan narx (maxfiy kod)"
                      active={printSettings.includeCostPrice}
                      scale={printSettings.fieldScale.cost}
                      onToggle={() =>
                        setPrintSettings((current) => ({
                          ...current,
                          includeCostPrice: !current.includeCostPrice,
                        }))
                      }
                      onScaleChange={(next) =>
                        setPrintSettings((current) => ({
                          ...current,
                          fieldScale: { ...current.fieldScale, cost: next },
                        }))
                      }
                    />
                  </div>
                  {printSettings.includeCostPrice && (
                    <p className="-mt-1 text-[11px] text-muted-foreground">
                      Tan narx xaridorga oddiy kod bo'lib ko'rinishi uchun raqam oldiga "0" qo'shib,
                      pul birligisiz bosiladi (masalan 5 → 05, 54000 → 054000).
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 rounded-xl border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="flex items-center gap-1.5 text-[11px]">
                      <ScanLine className="h-3.5 w-3.5" /> Skanerlanadigan kod
                    </Label>
                    <div className="flex gap-1">
                      {(
                        [
                          { value: "barcode" as const, label: "Shtrix kod" },
                          { value: "customCode" as const, label: "Artikul" },
                        ] satisfies { value: ScanCodeSource; label: string }[]
                      ).map((item) => (
                        <Button
                          key={item.value}
                          type="button"
                          size="sm"
                          variant={
                            printSettings.scanCodeSource === item.value ? "default" : "outline"
                          }
                          className="h-7 px-2.5 text-[11px]"
                          onClick={() =>
                            setPrintSettings((current) => ({
                              ...current,
                              scanCodeSource: item.value,
                            }))
                          }
                        >
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] leading-snug text-muted-foreground">
                    Tanlangan kod tayoqcha skaner o'qiy oladigan chiziqlar bilan bosiladi;
                    ikkinchisi (yoqilgan bo'lsa) oddiy matn sifatida chiqadi.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="order" className="space-y-3">
                <div className="space-y-2 rounded-xl border p-3.5">
                  <Label className="text-xs">Maydonlar tartibi (ketma-ketlik)</Label>
                  <p className="text-[10px] leading-snug text-muted-foreground">
                    Yorliqda maydonlar shu tartibda, yuqoridan pastga qarab joylashadi. Strelka
                    bilan o'zgartiring.
                  </p>
                  <div className="space-y-1.5">
                    {normalizeFieldOrder(printSettings.fieldOrder).map((field, index, order) => (
                      <div
                        key={field}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-card p-2.5"
                      >
                        <span className="flex items-center gap-2.5 text-xs font-medium">
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-bold text-muted-foreground">
                            {index + 1}
                          </span>
                          {FIELD_LABELS[field]}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            disabled={index === 0}
                            onClick={() => moveFieldOrder(field, -1)}
                            aria-label={`${FIELD_LABELS[field]} — yuqoriga`}
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            disabled={index === order.length - 1}
                            onClick={() => moveFieldOrder(field, 1)}
                            aria-label={`${FIELD_LABELS[field]} — pastga`}
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="paper" className="space-y-3">
                <div className="space-y-2 rounded-xl border p-3.5">
                  <Label className="text-xs">Qog'oz razmeri</Label>
                  <Select
                    value={printSettings.labelPreset}
                    onValueChange={(value: LabelPreset) =>
                      setPrintSettings((current) => ({ ...current, labelPreset: value }))
                    }
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Qog'oz razmeri" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="58x40">58×40mm</SelectItem>
                      <SelectItem value="40x30">40×30mm</SelectItem>
                      <SelectItem value="30x20">30×20mm</SelectItem>
                      <SelectItem value="custom">Boshqa (ixtiyoriy o'lcham)</SelectItem>
                    </SelectContent>
                  </Select>
                  {printSettings.labelPreset === "custom" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Kengligi (mm)</Label>
                        <Input
                          value={printSettings.labelWidthMm}
                          onChange={(e) =>
                            setPrintSettings((current) => ({
                              ...current,
                              labelWidthMm: parseNumberInput(e.target.value) || 0,
                            }))
                          }
                          inputMode="numeric"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Balandligi (mm)</Label>
                        <Input
                          value={printSettings.labelHeightMm}
                          onChange={(e) =>
                            setPrintSettings((current) => ({
                              ...current,
                              labelHeightMm: parseNumberInput(e.target.value) || 0,
                            }))
                          }
                          inputMode="numeric"
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      Chegara / margin (mm) — kamida {MIN_LABEL_MARGIN_MM}mm
                    </Label>
                    <Input
                      value={printSettings.marginMm}
                      onChange={(e) =>
                        setPrintSettings((current) => ({
                          ...current,
                          marginMm: parseNumberInput(e.target.value) || 0,
                        }))
                      }
                      onBlur={() =>
                        setPrintSettings((current) => ({
                          ...current,
                          marginMm: clampMarginMm(current.marginMm),
                        }))
                      }
                      inputMode="numeric"
                      className="h-9 text-sm"
                    />
                    <p className="text-[10px] leading-snug text-muted-foreground">
                      Matn/shtrix-kod bu chegaradan tashqariga chiqmasligi uchun qattiq cheklanadi —{" "}
                      {MIN_LABEL_MARGIN_MM}mm dan kichik bo'lishi mumkin emas.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="output" className="space-y-3">
                <div className="space-y-2 rounded-xl border p-3.5">
                  <Label className="text-xs">Chop etish usuli</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={printSplitMode}
                      onValueChange={(value: "all" | "parts" | "batch") => {
                        setPrintSplitMode(value);
                        setPrintSplitValue("");
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Usul" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Hammasi bir yo'la</SelectItem>
                        <SelectItem value="parts">Necha qismga bo'lib</SelectItem>
                        <SelectItem value="batch">Necha tadan</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={printSplitValue}
                      onChange={(e) => setPrintSplitValue(formatNumberInput(e.target.value))}
                      onFocus={(e) => e.currentTarget.select()}
                      inputMode="numeric"
                      disabled={printSplitMode === "all"}
                      placeholder={
                        printSplitMode === "parts"
                          ? "Masalan: 2"
                          : printSplitMode === "batch"
                            ? "Masalan: 20"
                            : `Hammasi (${printFlatQueue.length} ta)`
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                  {printSplitMode !== "all" && (
                    <p className="text-[10px] leading-snug text-muted-foreground">
                      {printSplitMode === "parts"
                        ? `${printFlatQueue.length} ta tovar ${printSplitValueNum > 0 ? printSplitValueNum : "?"} qismga bo'linsa, har qismda ${printEffectiveBatch} tadan bo'ladi.`
                        : `Har safar "Print" bosilganda ${printEffectiveBatch} tadan chop etiladi (jami ${printTotalParts} qism).`}
                    </p>
                  )}
                  <p className="text-[10px] leading-snug text-muted-foreground">
                    Qaysi usul tanlansa ham, har safar "Print" bosilganda faqat{" "}
                    <b>keyingi, hali chop etilmagan</b> qism chop etiladi — avval chop etilganlar
                    qayta bosilmaydi.
                  </p>
                  {printFlatQueue.length > 0 && (
                    <div className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-[11px]">
                      <span>
                        Chop etilgan: <b>{printedCount}</b> / {printFlatQueue.length} ta
                      </span>
                      {printedCount > 0 && printedCount < printFlatQueue.length && (
                        <button
                          type="button"
                          className="font-semibold text-primary hover:underline"
                          onClick={() => setPrintedCount(0)}
                        >
                          Boshidan boshlash
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border p-3.5">
                  <span className="flex items-center gap-2 text-xs font-semibold">
                    <PackagePlus className="h-4 w-4" /> Miqdorga mos chop etish
                  </span>
                  <Switch
                    checked={printSettings.matchStockQty}
                    onCheckedChange={(checked) =>
                      setPrintSettings((current) => ({ ...current, matchStockQty: checked }))
                    }
                    aria-label="Miqdorga mos chop etish — yoqish"
                  />
                </div>

                <div className="space-y-2 rounded-xl border p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-xs font-semibold">
                      <MessageSquareText className="h-4 w-4" />
                      Pastki comment qo'shish
                    </span>
                    <Switch
                      checked={printSettings.commentEnabled}
                      onCheckedChange={(checked) =>
                        setPrintSettings((current) => ({ ...current, commentEnabled: checked }))
                      }
                      aria-label="Pastki comment qo'shish — yoqish"
                    />
                  </div>
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
              </TabsContent>
            </Tabs>

            <PrintPreview product={selectedProducts[0]} settings={printSettings} />
          </div>
        </div>
      </div>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-10 gap-2">
              <PackagePlus className="h-4 w-4" /> Yangi tovar qo'shish
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={6}
            className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-52 normal-case tracking-normal"
          >
            <DropdownMenuItem onSelect={() => onSetCreateMode("qabul")}>
              <PackagePlus className="mr-2 h-4 w-4" />
              Qo'lda qo'shish
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setExcelModalOpen(true)}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Exceldan yuklash
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={downloadProductImportTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Excel shablonini yuklab olish
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
              <th className="w-12 px-4 py-2.5 text-left font-semibold">
                <Checkbox
                  checked={
                    allFilteredSelected ? true : selectedIds.size > 0 ? "indeterminate" : false
                  }
                  onCheckedChange={() =>
                    allFilteredSelected ? clearSelection() : selectAllFiltered()
                  }
                  title="Barchasini belgilash"
                  aria-label="Barchasini belgilash"
                />
              </th>
              <th className="px-4 py-2.5 text-left font-semibold">
                <div className="flex items-center gap-2">
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
              {!hiddenColumns.has("wholesale") && (
                <th className="px-4 py-2.5 text-right font-semibold">Optom narx</th>
              )}
              <th className="px-4 py-2.5 text-right font-semibold">{t("sale_price")}</th>
              {!hiddenColumns.has("customCode") && (
                <th className="px-4 py-2.5 text-left font-semibold">Artikul</th>
              )}
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
              <React.Fragment key={p.id}>
                {editingId !== p.id && (
                  <tr
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
                      <div className="text-xs text-muted-foreground">{p.barcode}</div>
                    </td>
                    {!hiddenColumns.has("limit") && (
                      <td className="px-4 py-2.5 text-center">
                        {typeof p.minStockAlert === "number" ? (
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
                      {`${p.costPrice} ${p.costCurrency}`}
                    </td>
                    {!hiddenColumns.has("wholesale") && (
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {p.wholesalePrice ? (
                          p.wholesaleCurrency && p.wholesaleCurrency !== "UZS" ? (
                            `${p.wholesalePrice} ${p.wholesaleCurrency}`
                          ) : (
                            formatSom(p.wholesalePrice)
                          )
                        ) : (
                          <span className="text-xs italic text-muted-foreground">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                      {p.priceCurrency && p.priceCurrency !== "UZS"
                        ? `${p.price} ${p.priceCurrency}`
                        : formatSom(p.price)}
                    </td>
                    {!hiddenColumns.has("customCode") && (
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-muted-foreground">{p.customCode}</span>
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <span className={p.vitrinaQty < 10 ? "font-semibold text-destructive" : ""}>
                        {p.vitrinaQty}
                      </span>
                    </td>
                    {!hiddenColumns.has("unit") && (
                      <td className="px-4 py-2.5 text-muted-foreground">{p.unit}</td>
                    )}
                    {!hiddenColumns.has("shelf") && (
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {p.shelfLocation ? (
                          <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary ring-1 ring-inset ring-primary/20">
                            {p.shelfLocation}
                          </span>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">
                            belgilanmagan
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-muted-foreground">{p.warehouse}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => startEdit(p)}
                          title={t("edit")}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
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
                )}
                {editingId === p.id && (
                  <tr className="border-b bg-muted/20">
                    <td colSpan={13 - hiddenColumns.size} className="p-3">
                      <div
                        className="rounded-lg border bg-card p-4 shadow-sm"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
                          <Field label="Mahsulot nomi">
                            <Input
                              value={draft.name}
                              onChange={(e) => updateDraft({ name: e.target.value })}
                              placeholder="Mahsulot nomini kiriting"
                              className="h-9 text-xs"
                            />
                          </Field>

                          <Field label="Birlik">
                            <Select
                              value={draft.unit}
                              onValueChange={(value) => updateDraft({ unit: value })}
                            >
                              <SelectTrigger className="h-9 text-xs">
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
                          </Field>

                          <Field label="Tan narx">
                            <CurrencyField
                              value={draft.costPrice}
                              onChange={(value) => updateDraft({ costPrice: value })}
                              placeholder="0"
                              currency={draft.costCurrency}
                              currencies={settings.currencies}
                              onCurrencyChange={(value) => updateDraft({ costCurrency: value })}
                            />
                          </Field>

                          <Field label="Optom narx">
                            <CurrencyField
                              value={draft.wholesalePrice}
                              onChange={(value) => updateDraft({ wholesalePrice: value })}
                              onBlur={handleDraftWholesaleBlur}
                              placeholder="0"
                              currency={draft.wholesaleCurrency}
                              currencies={settings.currencies}
                              onCurrencyChange={(value) =>
                                updateDraft({ wholesaleCurrency: value })
                              }
                            />
                            <MarkupRow
                              percent={draft.wholesaleMarkupPercent}
                              warn={draft.wholesaleMarkupWarn}
                              onPercentChange={(value) =>
                                updateDraft({ wholesaleMarkupPercent: value })
                              }
                              onApply={() => {
                                const cost = parseNumberInput(draft.costPrice);
                                const percent = parseNumberInput(draft.wholesaleMarkupPercent);
                                if (!cost) {
                                  updateDraft({ wholesaleMarkupWarn: true });
                                  toast.error("Avval tan narxni kiriting");
                                  return;
                                }
                                const result = computeMarkupPrice(
                                  cost,
                                  draft.costCurrency,
                                  draft.wholesaleCurrency,
                                  percent,
                                );
                                updateDraft({
                                  wholesalePrice: formatNumberInput(String(result)),
                                  wholesaleMarkupWarn: false,
                                });
                              }}
                            />
                          </Field>

                          <Field label="Sotuv narx">
                            <CurrencyField
                              value={draft.price}
                              onChange={(value) => updateDraft({ price: value })}
                              onBlur={handleDraftPriceBlur}
                              placeholder="0"
                              currency={draft.priceCurrency}
                              currencies={settings.currencies}
                              onCurrencyChange={(value) => updateDraft({ priceCurrency: value })}
                            />
                            <MarkupRow
                              percent={draft.priceMarkupPercent}
                              warn={draft.priceMarkupWarn}
                              onPercentChange={(value) =>
                                updateDraft({ priceMarkupPercent: value })
                              }
                              onApply={() => {
                                const cost = parseNumberInput(draft.costPrice);
                                const percent = parseNumberInput(draft.priceMarkupPercent);
                                if (!cost) {
                                  updateDraft({ priceMarkupWarn: true });
                                  toast.error("Avval tan narxni kiriting");
                                  return;
                                }
                                const result = computeMarkupPrice(
                                  cost,
                                  draft.costCurrency,
                                  draft.priceCurrency,
                                  percent,
                                );
                                updateDraft({
                                  price: formatNumberInput(String(result)),
                                  priceMarkupWarn: false,
                                });
                              }}
                            />
                          </Field>

                          <Field label="Shtrix kod">
                            <div className="flex gap-1">
                              <Input
                                value={draft.barcode}
                                onChange={(e) => updateDraft({ barcode: e.target.value })}
                                placeholder="Shtrix kod"
                                className="h-9 min-w-0 text-xs"
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-9 w-9 shrink-0"
                                onClick={assignDraftBarcode}
                                title="Avtomatik shtrix kod"
                              >
                                <Barcode className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </Field>

                          <Field label="Artikul">
                            <div className="flex gap-1">
                              <Input
                                value={draft.customCode}
                                onChange={(e) => updateDraft({ customCode: e.target.value })}
                                placeholder="Artikul"
                                className="h-9 min-w-0 text-xs"
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-9 w-9 shrink-0"
                                onClick={assignDraftCustomCode}
                                title="Avtomatik artikul"
                              >
                                <Hash className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </Field>

                          <Field label="Rasm">
                            <ImageUploadField
                              image={draft.image}
                              onPick={handleEditImagePick}
                              onClear={() => updateDraft({ image: undefined })}
                            />
                          </Field>
                        </div>

                        {draft.variants.length > 0 && (
                          <div className="mt-3 space-y-3 border-t pt-3">
                            {draft.variants.map((variant, vIndex) => (
                              <div
                                key={variant.id}
                                className="relative rounded-md border bg-muted/30 p-3"
                              >
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="absolute right-1.5 top-1.5 h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => removeEditVariant(variant.id)}
                                  title="Variantni o'chirish"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                                <div className="mb-2 pr-7 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                  Variant {vIndex + 1}
                                </div>
                                <div className="grid grid-cols-1 gap-3 pr-7 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                                  <Field label="Variant nomi">
                                    <Input
                                      value={variant.label}
                                      onChange={(e) =>
                                        updateEditVariant(variant.id, { label: e.target.value })
                                      }
                                      placeholder='Masalan: "Oq"'
                                      className="h-9 text-xs"
                                    />
                                  </Field>

                                  <Field label="Tan narx">
                                    <CurrencyField
                                      value={variant.costPrice}
                                      onChange={(value) =>
                                        updateEditVariant(variant.id, { costPrice: value })
                                      }
                                      placeholder="0"
                                      currency={variant.costCurrency}
                                      currencies={settings.currencies}
                                      onCurrencyChange={(value) =>
                                        updateEditVariant(variant.id, { costCurrency: value })
                                      }
                                    />
                                  </Field>

                                  <Field label="Optom narx">
                                    <CurrencyField
                                      value={variant.wholesalePrice}
                                      onChange={(value) =>
                                        updateEditVariant(variant.id, { wholesalePrice: value })
                                      }
                                      placeholder="0"
                                      currency={variant.wholesaleCurrency}
                                      currencies={settings.currencies}
                                      onCurrencyChange={(value) =>
                                        updateEditVariant(variant.id, { wholesaleCurrency: value })
                                      }
                                    />
                                  </Field>

                                  <Field label="Sotuv narx">
                                    <CurrencyField
                                      value={variant.price}
                                      onChange={(value) =>
                                        updateEditVariant(variant.id, { price: value })
                                      }
                                      placeholder="0"
                                      currency={variant.priceCurrency}
                                      currencies={settings.currencies}
                                      onCurrencyChange={(value) =>
                                        updateEditVariant(variant.id, { priceCurrency: value })
                                      }
                                    />
                                  </Field>

                                  <Field label="Shtrix kod">
                                    <div className="flex gap-1">
                                      <Input
                                        value={variant.barcode}
                                        onChange={(e) =>
                                          updateEditVariant(variant.id, {
                                            barcode: e.target.value,
                                          })
                                        }
                                        placeholder="Shtrix kod"
                                        className="h-9 min-w-0 text-xs"
                                      />
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        className="h-9 w-9 shrink-0"
                                        onClick={() => assignEditVariantBarcode(variant.id)}
                                        title="Avtomatik shtrix kod"
                                      >
                                        <Barcode className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </Field>

                                  <Field label="Artikul">
                                    <div className="flex gap-1">
                                      <Input
                                        value={variant.customCode}
                                        onChange={(e) =>
                                          updateEditVariant(variant.id, {
                                            customCode: e.target.value,
                                          })
                                        }
                                        placeholder="Artikul"
                                        className="h-9 min-w-0 text-xs"
                                      />
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        className="h-9 w-9 shrink-0"
                                        onClick={() => assignEditVariantCustomCode(variant.id)}
                                        title="Avtomatik artikul"
                                      >
                                        <Hash className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </Field>

                                  <Field label="Rasm">
                                    <ImageUploadField
                                      image={variant.image}
                                      onPick={(file) =>
                                        handleEditVariantImagePick(variant.id, file)
                                      }
                                      onClear={() =>
                                        updateEditVariant(variant.id, { image: undefined })
                                      }
                                    />
                                  </Field>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            onClick={addEditVariant}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Variant qo'shish
                          </Button>
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => deleteProduct(p.id)}
                              title={t("delete")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => setEditingId(null)}
                              title="Bekor qilish"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => saveProduct(p.id)}
                              title={t("save")}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={13 - hiddenColumns.size}
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
                  <label key={col.key} className="flex items-center gap-2 text-sm font-normal">
                    <Checkbox
                      checked={exportColumns.has(col.key)}
                      onCheckedChange={(checked) => toggleExportColumn(col.key, checked === true)}
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

/** Haqiqiy (tayoqcha skaner o'qiy oladigan) shtrix-kod chiziqlarini ko'rsatadi. */
function BarcodePreview({ value, heightPx }: { value: string; heightPx: number }) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = buildBarcodeSvg(value, { heightPx });
  }, [value, heightPx]);

  return (
    <div ref={containerRef} className="mt-2 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full" />
  );
}

function PrintPreview({ product, settings }: { product?: Product; settings: PrintSettings }) {
  const previewProduct = product ?? MOCK_PRODUCTS[0];
  const base = LABEL_SIZE_PRESETS[settings.size];
  const fieldPx = (basePx: number, field: PrintField) =>
    Math.round(basePx * (settings.fieldScale[field] / 100));
  const { width: labelWidth, height: labelHeight } = getLabelDimensionsMm(settings);
  const paperLabel = `${labelWidth}×${labelHeight}mm`;
  const previewScale = Math.min(6, 230 / labelWidth);

  return (
    <div className="sticky top-0 self-start rounded-xl border border-border/70 bg-muted/20 p-3.5 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Real-time ko'rinish
        </div>
        <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
          {paperLabel}
        </span>
      </div>
      <div
        className={`mx-auto flex flex-col overflow-hidden rounded-md border bg-white p-3 text-slate-900 shadow-sm ${
          settings.receiptMode ? "border-dashed text-center" : ""
        }`}
        style={{
          width: labelWidth * previewScale,
          minHeight: labelHeight * previewScale,
          fontFamily: (LABEL_FONT_OPTIONS[settings.fontFamily] ?? LABEL_FONT_OPTIONS.arial).family,
        }}
      >
        {settings.receiptMode && (
          <div className="mb-2 border-b border-dashed border-slate-400 pb-1 text-[10px] font-black tracking-widest">
            TOVAR CHEKI
          </div>
        )}
        {(() => {
          const fieldNodes: Record<OrderableField, React.ReactNode> = {
            price: settings.includePrice ? (
              <div
                className="text-center font-black text-slate-950"
                style={{ fontSize: fieldPx(base.priceSize, "price") }}
              >
                {formatSom(previewProduct?.price ?? 0)}
              </div>
            ) : null,
            name: settings.includeName ? (
              <div
                className="font-bold leading-tight"
                style={{ fontSize: fieldPx(base.nameSize, "name") }}
              >
                {previewProduct?.name ?? "Mahsulot nomi"}
              </div>
            ) : null,
            barcode: settings.includeBarcode ? (
              settings.scanCodeSource === "barcode" ? (
                <BarcodePreview
                  value={previewProduct?.barcode || "8690123456789"}
                  heightPx={fieldPx(base.barcodeSize, "barcode") * 2}
                />
              ) : (
                <div
                  className="break-all font-mono tracking-wide"
                  style={{ fontSize: fieldPx(base.barcodeSize, "barcode") }}
                >
                  {previewProduct?.barcode || "8690123456789"}
                </div>
              )
            ) : null,
            code: settings.includeCustomCode ? (
              settings.scanCodeSource === "customCode" ? (
                <BarcodePreview
                  value={previewProduct?.customCode || "KOD-001"}
                  heightPx={fieldPx(base.barcodeSize, "barcode") * 2}
                />
              ) : (
                <div
                  className="text-slate-500"
                  style={{ fontSize: fieldPx(base.codeSize, "code") }}
                >
                  {previewProduct?.customCode || "KOD-001"}
                </div>
              )
            ) : null,
            shelf: settings.includeShelfLocation ? (
              <div
                className="text-slate-500"
                style={{ fontSize: fieldPx(base.shelfSize, "shelf") }}
              >
                Polka: {previewProduct?.shelfLocation || "—"}
              </div>
            ) : null,
          };
          return (
            <div className="flex flex-col gap-1">
              {normalizeFieldOrder(settings.fieldOrder).map((field) => (
                <React.Fragment key={field}>{fieldNodes[field]}</React.Fragment>
              ))}
            </div>
          );
        })()}
        {settings.commentEnabled && settings.comment.trim() && (
          <div className="mt-2 border-t border-dashed border-slate-300 pt-1 text-[11px] text-slate-600">
            {settings.comment.trim()}
          </div>
        )}
        {settings.includeCostPrice && (
          <div
            className="mt-auto pt-1 font-mono text-slate-400"
            style={{ fontSize: fieldPx(base.costSize, "cost") }}
          >
            {formatCostCode(previewProduct?.costPrice ?? 0)}
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
      className={`space-y-2 rounded-lg border p-2.5 transition-colors ${
        active ? "border-primary/50 bg-primary/5" : "border-border/70 bg-card"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`flex items-center gap-2 text-xs font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}
        >
          {icon}
          {title}
        </span>
        <div className="flex items-center gap-2">
          <span className="w-9 text-right text-[11px] font-bold tabular-nums text-muted-foreground">
            {scale}%
          </span>
          <Switch checked={active} onCheckedChange={onToggle} aria-label={`${title} — yoqish`} />
        </div>
      </div>
      <Slider
        value={[scale]}
        min={50}
        max={200}
        step={5}
        disabled={!active}
        onValueChange={([next]) => onScaleChange(next)}
        aria-label={`${title} — shrift hajmi`}
      />
    </div>
  );
}
