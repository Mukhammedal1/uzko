import * as React from "react";
import {
  CalendarDays,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  PackageSearch,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exportRequestedToExcel, exportRequestedToPdf } from "@/lib/requested-products-export";
import {
  groupRequestedProducts,
  MOCK_REQUESTED_PRODUCTS,
  REQUESTER_LABELS,
  type RequestedProduct,
  type RequestedProductGroup,
} from "@/lib/requested-products";

function formatDate(value: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

type Period = "all" | "today" | "7" | "30" | "custom";
type SortKey = "count" | "qty" | "last" | "deadline";
type Range = { from?: Date; to?: Date };

const PERIODS: { id: Period; label: string }[] = [
  { id: "all", label: "Hammasi" },
  { id: "today", label: "Bugun" },
  { id: "7", label: "7 kun" },
  { id: "30", label: "30 kun" },
  { id: "custom", label: "Oraliq" },
];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** So'rov vaqti (ISO) tanlangan davrga tushadimi — kunlar mahalliy vaqt bilan solishtiriladi */
function inPeriod(item: RequestedProduct, period: Period, range: Range) {
  if (period === "all") return true;
  const key = dayKey(new Date(item.date));
  const now = new Date();
  if (period === "today") return key === dayKey(now);
  if (period === "7" || period === "30") {
    const from = new Date(now);
    from.setDate(from.getDate() - (Number(period) - 1));
    return key >= dayKey(from);
  }
  if (range.from && key < dayKey(range.from)) return false;
  if (range.to && key > dayKey(range.to)) return false;
  return true;
}

function totalQty(group: RequestedProductGroup) {
  return Object.values(group.totals).reduce((sum, qty) => sum + qty, 0);
}

function sortGroups(groups: RequestedProductGroup[], sort: SortKey) {
  const list = [...groups];
  list.sort((a, b) => {
    if (sort === "qty") return totalQty(b) - totalQty(a);
    if (sort === "last") return a.lastDate < b.lastDate ? 1 : -1;
    if (sort === "deadline") {
      // muddati yo'qlar oxirida
      if (!a.nearestDeadline) return b.nearestDeadline ? 1 : 0;
      if (!b.nearestDeadline) return -1;
      return a.nearestDeadline < b.nearestDeadline ? -1 : 1;
    }
    return b.count - a.count || (a.lastDate < b.lastDate ? 1 : -1);
  });
  return list;
}

function fmtShort(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTotals(totals: Record<string, number>) {
  const parts = Object.entries(totals).map(([unit, qty]) => `${Number(qty.toFixed(2))} ${unit}`);
  return parts.length ? parts.join(", ") : "—";
}

function Thumb({ src, name }: { src?: string; name: string }) {
  return (
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted text-sm font-bold text-muted-foreground">
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        (name.slice(0, 1) || "?").toUpperCase()
      )}
    </div>
  );
}

export function TalabQilinganTovarlar() {
  const [query, setQuery] = React.useState("");
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const [period, setPeriod] = React.useState<Period>("all");
  const [range, setRange] = React.useState<Range>({});
  const [sort, setSort] = React.useState<SortKey>("count");
  const [filterOpen, setFilterOpen] = React.useState(false);

  const filteredRequests = React.useMemo(
    () => MOCK_REQUESTED_PRODUCTS.filter((item) => inPeriod(item, period, range)),
    [period, range],
  );
  const groups = React.useMemo(
    () => sortGroups(groupRequestedProducts(filteredRequests), sort),
    [filteredRequests, sort],
  );
  const q = query.trim().toLowerCase();
  const visible = q ? groups.filter((g) => g.name.toLowerCase().includes(q)) : groups;
  const activeFilterCount = (period !== "all" ? 1 : 0) + (sort !== "count" ? 1 : 0);
  const isFiltered = activeFilterCount > 0 || q !== "";

  const periodLabel =
    period === "custom"
      ? `${range.from ? fmtShort(range.from) : "..."} - ${range.to ? fmtShort(range.to) : "..."}`
      : (PERIODS.find((p) => p.id === period)?.label ?? "Hammasi");
  const today = todayKey();

  const toggle = (key: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b bg-card p-3">
        <Button
          type="button"
          variant={activeFilterCount > 0 ? "default" : "outline"}
          className="relative h-10 gap-2"
          onClick={() => setFilterOpen((open) => !open)}
        >
          <Filter className="h-4 w-4" />
          Filtr
          {activeFilterCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Talab qilingan tovar nomi..."
            className="h-10 pl-9 text-sm"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={visible.length === 0}
              size="icon"
              className="h-10 w-10"
              title="Yuklab olish"
              aria-label="Yuklab olish"
            >
              <Download className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-1" align="end">
            <button
              type="button"
              onClick={() => exportRequestedToExcel(visible, periodLabel)}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
              Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={() => exportRequestedToPdf(visible, periodLabel)}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <FileText className="h-4 w-4 text-destructive" />
              PDF (rasmlar bilan)
            </button>
          </PopoverContent>
        </Popover>
        <div className="ml-auto flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-1.5">
          <div className="text-right">
            <div className="text-[10px] uppercase text-muted-foreground">Tovarlar</div>
            <div className="text-sm font-bold tabular-nums">{groups.length}</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-right">
            <div className="text-[10px] uppercase text-muted-foreground">Jami so'rov</div>
            <div className="text-sm font-bold tabular-nums text-primary">
              {filteredRequests.length}
            </div>
          </div>
        </div>
      </div>

      {filterOpen && (
        <div className="flex flex-wrap items-center gap-2 border-b bg-card px-3 py-2">
          <div className="flex overflow-hidden rounded-md border">
            {PERIODS.filter((p) => p.id !== "custom").map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`h-8 border-r px-3 text-xs font-medium last:border-r-0 ${
                  period === p.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant={period === "custom" ? "default" : "outline"}
                className="h-8 gap-1.5 px-3 text-xs"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                {period === "custom" ? periodLabel : "Sana oralig'i"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                numberOfMonths={2}
                selected={range.from ? { from: range.from, to: range.to } : undefined}
                onSelect={(value) => {
                  setRange({ from: value?.from, to: value?.to });
                  setPeriod(value?.from ? "custom" : "all");
                }}
              />
            </PopoverContent>
          </Popover>

          <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
            <SelectTrigger className="h-8 w-[210px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="count">Eng ko'p so'ralgan</SelectItem>
              <SelectItem value="qty">Jami miqdor bo'yicha</SelectItem>
              <SelectItem value="last">Oxirgi so'rov bo'yicha</SelectItem>
              <SelectItem value="deadline">Eng yaqin muddat bo'yicha</SelectItem>
            </SelectContent>
          </Select>

          {isFiltered && (
            <button
              type="button"
              onClick={() => {
                setPeriod("all");
                setRange({});
                setSort("count");
                setQuery("");
              }}
              className="h-8 px-2 text-xs font-medium text-muted-foreground underline"
            >
              Tozalash
            </button>
          )}
        </div>
      )}

      <div className="relative flex-1 overflow-auto">
        {visible.length === 0 ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
            <PackageSearch className="h-8 w-8" />
            <div className="text-sm font-medium">
              {MOCK_REQUESTED_PRODUCTS.length === 0
                ? "Hali talab qilingan tovar yo'q"
                : "Hech narsa topilmadi"}
            </div>
            {MOCK_REQUESTED_PRODUCTS.length === 0 && (
              <div className="max-w-sm text-xs">
                Sotuv sahifasidagi "Mijozlar taklif" tugmasi orqali xaridor so'ragan, lekin do'konda
                yo'q tovarlarni yozib boring.
              </div>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
              <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <th className="w-10 px-2 py-2.5" />
                <th className="px-4 py-2.5 text-left font-semibold">Tovar</th>
                <th className="px-4 py-2.5 text-right font-semibold">So'raldi</th>
                <th className="px-4 py-2.5 text-right font-semibold">Jami miqdor</th>
                <th className="px-4 py-2.5 text-left font-semibold">Buyurtmachilar</th>
                <th className="px-4 py-2.5 text-left font-semibold">Eng yaqin muddat</th>
                <th className="px-4 py-2.5 text-left font-semibold">Oxirgi so'rov</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((group) => (
                <GroupRows
                  key={group.key}
                  group={group}
                  open={expanded.has(group.key)}
                  onToggle={() => toggle(group.key)}
                  today={today}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function GroupRows({
  group,
  open,
  onToggle,
  today,
}: {
  group: RequestedProductGroup;
  open: boolean;
  onToggle: () => void;
  today: string;
}) {
  const overdue = group.nearestDeadline && group.nearestDeadline < today;
  return (
    <>
      <tr className="cursor-pointer border-b hover:bg-muted/40" onClick={onToggle}>
        <td className="px-2 py-2.5 text-center">
          <ChevronRight
            className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
          />
        </td>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Thumb src={group.image} name={group.name} />
            <div className="font-medium">{group.name}</div>
          </div>
        </td>
        <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{group.count} marta</td>
        <td className="px-4 py-2.5 text-right tabular-nums">{formatTotals(group.totals)}</td>
        <td className="px-4 py-2.5 text-muted-foreground">
          {Object.entries(group.requesterTypes)
            .map(
              ([type, count]) =>
                `${REQUESTER_LABELS[type as keyof typeof REQUESTER_LABELS]} (${count})`,
            )
            .join(", ") || "—"}
        </td>
        <td className={`px-4 py-2.5 ${overdue ? "font-semibold text-destructive" : ""}`}>
          {formatDate(group.nearestDeadline)}
        </td>
        <td className="px-4 py-2.5 text-muted-foreground">{formatDate(group.lastDate)}</td>
      </tr>
      {open &&
        group.requests.map((request) => (
          <tr key={request.id} className="border-b bg-muted/20 text-xs">
            <td />
            <td className="px-4 py-2 pl-8 text-muted-foreground">
              {formatDate(request.date)} · {request.addedBy}
            </td>
            <td />
            <td className="px-4 py-2 text-right tabular-nums">
              {request.quantity !== null ? `${request.quantity} ${request.unit}` : "—"}
            </td>
            <td className="px-4 py-2 text-muted-foreground">
              {request.requesterType
                ? [REQUESTER_LABELS[request.requesterType], request.requesterName]
                    .filter(Boolean)
                    .join(" · ")
                : "—"}
            </td>
            <td className="px-4 py-2">{formatDate(request.neededBy)}</td>
            <td />
          </tr>
        ))}
    </>
  );
}
