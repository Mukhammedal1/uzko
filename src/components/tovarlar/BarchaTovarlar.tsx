import * as React from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
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
import { AlertTriangle, ArrowLeft, Barcode, Check, CheckSquare, Download, Filter, MessageSquareText, Minus, PackageMinus, PackagePlus, Pencil, Plus, Printer, ReceiptText, Save, Search, Tag, Trash2, X } from "lucide-react";
import {
  MOCK_PRODUCTS,
  MOCK_EDIT_HISTORY,
  formatSom,
  costInSom,
  isProductAtLimit,
  type Product,
} from "@/lib/mock-data";
import { useApp } from "@/lib/app-context";
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

type PrintSize = "small" | "medium" | "large";
type PaperSize = "thermal58" | "thermal80" | "a6" | "a4";
export type PrintField = "name" | "barcode" | "code" | "price" | "shelf";

export type PrintSettings = {
  receiptMode: boolean;
  includeName: boolean;
  includePrice: boolean;
  includeBarcode: boolean;
  includeCustomCode: boolean;
  includeShelfLocation: boolean;
  size: PrintSize;
  fieldScale: Record<PrintField, number>;
  paperSize: PaperSize;
  commentEnabled: boolean;
  comment: string;
  matchStockQty: boolean;
};

const LABEL_SIZE_PRESETS: Record<
  PrintSize,
  {
    labelMinHeight: number;
    padding: number;
    nameSize: number;
    barcodeSize: number;
    codeSize: number;
    priceSize: number;
    shelfSize: number;
    gap: number;
    columns: number;
  }
> = {
  small: {
    labelMinHeight: 72,
    padding: 7,
    nameSize: 12,
    barcodeSize: 15,
    codeSize: 9,
    priceSize: 13,
    shelfSize: 9,
    gap: 6,
    columns: 3,
  },
  medium: {
    labelMinHeight: 92,
    padding: 10,
    nameSize: 15,
    barcodeSize: 20,
    codeSize: 11,
    priceSize: 16,
    shelfSize: 11,
    gap: 10,
    columns: 2,
  },
  large: {
    labelMinHeight: 118,
    padding: 14,
    nameSize: 19,
    barcodeSize: 26,
    codeSize: 13,
    priceSize: 22,
    shelfSize: 13,
    gap: 12,
    columns: 1,
  },
};

const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  receiptMode: false,
  includeName: true,
  includePrice: false,
  includeBarcode: true,
  includeCustomCode: true,
  includeShelfLocation: false,
  size: "medium",
  fieldScale: { name: 100, barcode: 100, code: 100, price: 100, shelf: 100 },
  paperSize: "thermal80",
  commentEnabled: false,
  comment: "",
  matchStockQty: false,
};

type Props = {
  onSetCreateMode: (mode: ProductCreateMode) => void;
  selectionSlot?: HTMLElement | null;
};

export function BarchaTovarlar({ onSetCreateMode, selectionSlot }: Props) {
  const { settings, updateSettings, t } = useApp();
  const [query, setQuery] = React.useState("");
  const [warehouse, setWarehouse] = React.useState<string>("ALL");
  const [version, setVersion] = React.useState(0);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());
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
  const [printSettings, setPrintSettings] = React.useState<PrintSettings>(
    () => settings.labelPrintSettings ?? DEFAULT_PRINT_SETTINGS,
  );
  const [stockFilter, setStockFilter] = React.useState<"all" | "limited">("all");
  const [draft, setDraft] = React.useState<EditDraft>({
    costPrice: "",
    price: "",
    vitrinaQty: "",
    unit: "",
    warehouse: "",
    shelfLocation: "",
    minStockAlert: "",
  });

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_PRODUCTS.filter((p) => {
      if (warehouse !== "ALL" && p.warehouse !== warehouse) return false;
      if (stockFilter === "limited" && !isProductAtLimit(p)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.customCode.toLowerCase().includes(q) ||
        (isProductAtLimit(p) && "limit ogohlantirish kam qoldi".includes(q))
      );
    });
  }, [query, stockFilter, warehouse, version]);

  const totalCount = filtered.reduce((s, p) => s + p.vitrinaQty, 0);
  const totalCost = filtered.reduce(
    (s, p) => s + costInSom(p) * p.vitrinaQty,
    0,
  );
  const selectedProducts = React.useMemo(
    () => MOCK_PRODUCTS.filter((product) => selectedIds.has(product.id)),
    [selectedIds, version],
  );
  const selectedUnitsLabel = React.useMemo(
    () => Array.from(new Set(selectedProducts.map((product) => product.unit))).join(", "),
    [selectedProducts],
  );
  const allFilteredSelected = filtered.length > 0 && filtered.every((product) => selectedIds.has(product.id));
  const activeFilterCount = (stockFilter === "limited" ? 1 : 0) + (warehouse !== "ALL" ? 1 : 0);

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
      unit: settings.units.includes(product.unit)
        ? product.unit
        : (settings.units[0] ?? product.unit),
      warehouse: settings.warehouses.includes(product.warehouse)
        ? product.warehouse
        : (settings.warehouses[0] ?? product.warehouse),
      shelfLocation: product.shelfLocation ?? "",
      minStockAlert:
        typeof product.minStockAlert === "number" ? String(product.minStockAlert) : "",
    });
  };

  const updateDraft = (patch: Partial<EditDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
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
    const newQty = Math.max(0, Number(draft.vitrinaQty) || 0);
    const newPrice = Math.max(0, Number(draft.price) || 0);
    const newCostPrice = Math.max(0, Number(draft.costPrice) || 0);
    const newUnit = draft.unit.trim() || p.unit;
    const newWarehouse = settings.warehouses.includes(draft.warehouse)
      ? draft.warehouse
      : p.warehouse;
    const newShelf = draft.shelfLocation;
    const newMinStockAlert =
      draft.minStockAlert.trim() === ""
        ? undefined
        : Math.max(0, Number(draft.minStockAlert) || 0);

    const changes = [
      oldCostPrice !== newCostPrice
        ? { field: "costPrice" as const, label: "Tan narx", oldValue: oldCostPrice, newValue: newCostPrice }
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
        ? { field: "warehouse" as const, label: "Ombor", oldValue: oldWarehouse, newValue: newWarehouse }
        : null,
      oldShelf !== newShelf
        ? { field: "shelfLocation" as const, label: "Raf", oldValue: oldShelf ?? "", newValue: newShelf }
        : null,
      p.minStockAlert !== newMinStockAlert
        ? {
            field: "minStockAlert" as const,
            label: "Ogohlantirish limiti",
            oldValue: p.minStockAlert ?? "",
            newValue: newMinStockAlert ?? "",
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
    const rows = MOCK_PRODUCTS.filter((product) => (productIds?.length ? productIds.includes(product.id) : selectedIds.has(product.id)));
    if (rows.length === 0) return;
    const currentLimits = Array.from(new Set(rows.map((product) => product.minStockAlert).filter((value): value is number => typeof value === "number")));
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
        warehouse: settings.warehouses.includes(product.warehouse)
          ? product.warehouse
          : (settings.warehouses[0] ?? product.warehouse),
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
        changes: [
          { field: "qty", label: "Miqdor", oldValue: oldQty, newValue: newQty },
        ],
      });
    });

    setVersion((v) => v + 1);
    setWriteOffOpen(false);
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
      const newWarehouse = settings.warehouses.includes(row.warehouse)
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
          ? { field: "costPrice" as const, label: "Tan narx", oldValue: oldCostPrice, newValue: newCostPrice }
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
          ? { field: "barcode" as const, label: "Shtrix kod", oldValue: oldBarcode, newValue: newBarcode }
          : null,
        oldShelf !== newShelf
          ? { field: "shelfLocation" as const, label: "Raf", oldValue: oldShelf ?? "", newValue: newShelf }
          : null,
        oldWarehouse !== newWarehouse
          ? { field: "warehouse" as const, label: "Ombor", oldValue: oldWarehouse, newValue: newWarehouse }
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
    const idx = MOCK_PRODUCTS.findIndex((item) => item.id === productId); if (idx < 0) return; const p = MOCK_PRODUCTS[idx];
    if (!window.confirm(`${p.name} o'chirilsinmi?`)) return;
    MOCK_EDIT_HISTORY.unshift({ id: `eh${Date.now()}`, date: new Date().toISOString(), editedBy: settings.username, productName: p.name, oldQty: p.vitrinaQty, newQty: 0, unit: p.unit, action: "delete" });
    MOCK_PRODUCTS.splice(idx, 1);
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(productId);
      return next;
    });
    setVersion((v) => v + 1);
  };
  const exportToExcel = () => {
    const rows = filtered.map((p) => ({
      "Tovar nomi": p.name,
      "Kod": p.customCode,
      "Shtrix kod": p.barcode,
      "Tan narx": p.costPrice,
      "Tan narx valyutasi": p.costCurrency,
      "Sotuv narxi": p.price,
      "Soni": p.vitrinaQty,
      "Birligi": p.unit,
      "Ombori": p.warehouse,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 28 },
      { wch: 12 },
      { wch: 18 },
      { wch: 12 },
      { wch: 18 },
      { wch: 14 },
      { wch: 10 },
      { wch: 10 },
      { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Barcha tovarlar");
    XLSX.writeFile(workbook, `barcha-tovarlar-${new Date().toISOString().slice(0, 10)}.xlsx`);
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
        warehouses={settings.warehouses}
        shelfLocations={settings.shelfLocations}
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
                    <SelectItem key={w} value={w}>{w}</SelectItem>
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
        <Button className="h-10 gap-2" onClick={() => onSetCreateMode("qabul")}>
          <PackagePlus className="h-4 w-4" /> Tovar qo'shish
        </Button>
        <Button
          onClick={exportToExcel}
          variant="outline"
          size="icon"
          className="h-10 w-10"
          title="Excelga yuklab olish"
          aria-label="Excelga yuklab olish"
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
              <th className="px-4 py-2.5 text-center font-semibold">Limit</th>
              <th className="px-4 py-2.5 text-right font-semibold">{t("cost_price")}</th>
              <th className="px-4 py-2.5 text-right font-semibold">{t("sale_price")}</th>
              <th className="px-4 py-2.5 text-right font-semibold">{t("qty")}</th>
              <th className="px-4 py-2.5 text-left font-semibold">Birlik</th>
              <th className="px-4 py-2.5 text-left font-semibold">{t("shelf_location")}</th>
              <th className="px-4 py-2.5 text-left font-semibold">{t("warehouse")}</th>
              <th className="px-4 py-2.5 text-right font-semibold">{t("action")}</th>
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
                  <div className="text-xs text-muted-foreground">
                    {p.customCode} · {p.barcode}
                  </div>
                </td>
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
                    <span className={p.vitrinaQty < 10 ? "font-semibold text-destructive" : ""}>{p.vitrinaQty}</span>
                  )}
                </td>
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
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    p.unit
                  )}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {editingId === p.id ? (
                    <Select
                      value={draft.shelfLocation}
                      onValueChange={(value) => updateDraft({ shelfLocation: value === "NONE" ? "" : value })}
                    >
                      <SelectTrigger className="h-8 w-[140px]">
                        <SelectValue placeholder="Tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">— Tozalash —</SelectItem>
                        {settings.shelfLocations.map((loc) => (
                          <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    p.shelfLocation ? (
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary ring-1 ring-inset ring-primary/20">
                        {p.shelfLocation}
                      </span>
                    ) : (
                      <span className="text-xs italic text-muted-foreground">belgilanmagan</span>
                    )
                  )}
                </td>
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
                          <SelectItem key={w} value={w}>{w}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    p.warehouse
                  )}
                </td>
                <td className="px-4 py-2.5 text-right"><div className="flex justify-end gap-1">
                  {editingId === p.id ? <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => saveProduct(p.id)} title={t("save")}><Save className="h-4 w-4" /></Button> : <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => startEdit(p)} title={t("edit")}><Pencil className="h-4 w-4" /></Button>}
                  <Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteProduct(p.id)} title={t("delete")}><Trash2 className="h-4 w-4" /></Button>
                </div></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">
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
                    openWriteOffDialog();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  <PackageMinus className="h-4 w-4" />
                  Hisobdan chiqarish
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

      <Dialog open={limitOpen} onOpenChange={setLimitOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ogohlantirish limiti</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="font-semibold">{selectedProducts.length} ta mahsulot tanlangan</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Limit har bir mahsulotning o'z birligida ishlaydi: {selectedUnitsLabel || "birlik aniqlanmagan"}.
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
                Mahsulot vitrinadagi qoldiq shu songa teng yoki undan kam bo'lsa, sariq ogohlantirish chiqadi.
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
                      setPrintSettings((current) => ({ ...current, includeName: !current.includeName }))
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
                      setPrintSettings((current) => ({ ...current, includePrice: !current.includePrice }))
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
            <Button type="button" variant="ghost" className="gap-2" onClick={saveLabelPrintDefaults}>
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
          <div
            className="mt-1 text-slate-500"
            style={{ fontSize: fieldPx(base.codeSize, "code") }}
          >
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
      rows.slice(1).forEach((row) => onUpdateRow(row.id, { [field]: value } as Partial<BulkEditRow>));
    }
  };

  const toggleApplyAll = (field: ApplyAllField, checked: boolean) => {
    setApplyAll((current) => ({ ...current, [field]: checked }));
    if (checked && rows.length > 0) {
      const value = rows[0][field];
      rows.slice(1).forEach((row) => onUpdateRow(row.id, { [field]: value } as Partial<BulkEditRow>));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b bg-card p-3">
        <Button type="button" variant="outline" size="icon" className="h-10 w-10" onClick={onCancel} title="Orqaga" aria-label="Orqaga">
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
                      <SelectItem key={w} value={w}>{w}</SelectItem>
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
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
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

function printProductLabels(queue: { product: Product; copies: number }[], settings: PrintSettings) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;

  const base = LABEL_SIZE_PRESETS[settings.size];
  const fieldPx = (basePx: number, field: PrintField) =>
    Math.round(basePx * (settings.fieldScale[field] / 100));
  const size = {
    ...base,
    nameSize: fieldPx(base.nameSize, "name"),
    barcodeSize: fieldPx(base.barcodeSize, "barcode"),
    codeSize: fieldPx(base.codeSize, "code"),
    priceSize: fieldPx(base.priceSize, "price"),
    shelfSize: fieldPx(base.shelfSize, "shelf"),
  };
  const paper = {
    thermal58: { page: "58mm auto", bodyWidth: "58mm", padding: "3mm", receiptWidth: "52mm" },
    thermal80: { page: "80mm auto", bodyWidth: "80mm", padding: "4mm", receiptWidth: "72mm" },
    a6: { page: "A6", bodyWidth: "105mm", padding: "8mm", receiptWidth: "74mm" },
    a4: { page: "A4", bodyWidth: "auto", padding: "8mm", receiptWidth: "90mm" },
  }[settings.paperSize];
  const comment =
    settings.commentEnabled && settings.comment.trim()
      ? `<div class="comment">${escapeHtml(settings.comment.trim())}</div>`
      : "";

  const labels = queue
    .flatMap(({ product, copies }) => Array.from({ length: Math.max(1, copies) }, () => product))
    .map((product) => {
      const name = settings.includeName
        ? `<div class="name">${escapeHtml(product.name)}</div>`
        : "";
      const price = settings.includePrice
        ? `<div class="price">${escapeHtml(formatSom(product.price))}</div>`
        : "";
      const barcode = settings.includeBarcode
        ? `<div class="barcode">${escapeHtml(product.barcode)}</div>`
        : "";
      const code = settings.includeCustomCode
        ? `<div class="code">${escapeHtml(product.customCode)}</div>`
        : "";
      const shelf = settings.includeShelfLocation
        ? `<div class="shelf">Polka: ${escapeHtml(product.shelfLocation || "—")}</div>`
        : "";
      const receiptHeader = settings.receiptMode
        ? `<div class="receipt-title">TOVAR CHEKI</div>`
        : "";
      return `
        <section class="label${settings.receiptMode ? " receipt" : ""}">
          ${receiptHeader}
          ${name}
          ${barcode}
          ${code}
          ${price}
          ${shelf}
          ${comment}
        </section>
      `;
    })
    .join("");

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Tovar yorliqlari</title>
        <style>
          * { box-sizing: border-box; }
          @page { size: ${paper.page}; margin: 0; }
          body {
            width: ${paper.bodyWidth};
            margin: 0 auto;
            padding: ${paper.padding};
            font-family: Arial, sans-serif;
            color: #111827;
          }
          .sheet {
            display: grid;
            grid-template-columns: repeat(${settings.receiptMode ? 1 : size.columns}, minmax(0, 1fr));
            gap: ${size.gap}px;
            ${settings.receiptMode ? `max-width: ${paper.receiptWidth}; margin: 0 auto;` : ""}
          }
          .label {
            min-height: ${size.labelMinHeight}px;
            border: 1px solid #111827;
            border-radius: ${settings.receiptMode ? 2 : 6}px;
            padding: ${size.padding}px;
            page-break-inside: avoid;
          }
          .receipt { border-style: dashed; text-align: center; }
          .receipt-title {
            margin-bottom: 6px;
            border-bottom: 1px dashed #111827;
            padding-bottom: 4px;
            font-size: ${Math.max(9, size.codeSize)}px;
            font-weight: 800;
            letter-spacing: 0.08em;
          }
          .name { font-size: ${size.nameSize}px; font-weight: 700; line-height: 1.2; }
          .barcode { margin-top: 8px; font-family: "Courier New", monospace; font-size: ${size.barcodeSize}px; letter-spacing: 1px; word-break: break-all; }
          .code { margin-top: 2px; font-size: ${size.codeSize}px; color: #4b5563; }
          .shelf { margin-top: 2px; font-size: ${size.shelfSize}px; color: #4b5563; }
          .price { margin-top: 6px; font-size: ${size.priceSize}px; font-weight: 800; }
          .comment {
            margin-top: 7px;
            border-top: 1px dashed #9ca3af;
            padding-top: 5px;
            font-size: ${Math.max(9, size.codeSize)}px;
            color: #374151;
          }
          @media print {
            body { padding: ${paper.padding}; }
          }
        </style>
      </head>
      <body>
        <main class="sheet">${labels}</main>
        <script>
          window.onload = () => {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
