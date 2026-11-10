import * as React from "react";
import { AlertTriangle, Search, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSom, type CreditCustomer } from "@/lib/mock-data";

// TODO: nasiyachilar backendi tayyor bo'lganda ro'yxat shu yerga emas,
// FinalizeSaleDialog'ga API/hook orqali kelsin — bu komponent faqat
// `customers` propini ko'rsatadi, o'zi hech qayerdan yuklamaydi.

const DAY = 24 * 60 * 60 * 1000;

const CHIPS = [
  { value: "recent", label: "Oxirgilari" },
  { value: "overdue", label: "Muddati o'tgan" },
  { value: "clean", label: "Qarzi yo'q" },
] as const;

type Chip = (typeof CHIPS)[number]["value"];

function initialsOf(customer: CreditCustomer) {
  return `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`.toUpperCase();
}

/** Oxirgi savdo sanasi — `CreditCustomer`da alohida maydon yo'q, cheklardan olinadi. */
function lastSaleAt(customer: CreditCustomer): number | null {
  const dates = (customer.receipts ?? [])
    .map((receipt) => new Date(receipt.date).getTime())
    .filter((time) => Number.isFinite(time));
  return dates.length > 0 ? Math.max(...dates) : null;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

/** Muddatgacha qolgan kunlar. Manfiy — kechikkan. `null` — muddat qo'yilmagan. */
function daysToDue(customer: CreditCustomer): number | null {
  if (!customer.dueDate) return null;
  const due = new Date(`${customer.dueDate}T00:00:00`).getTime();
  if (!Number.isFinite(due)) return null;
  return Math.round((due - startOfToday()) / DAY);
}

function isOverdue(customer: CreditCustomer) {
  const days = daysToDue(customer);
  return customer.currentDebt > 0 && days !== null && days < 0;
}

function digitsOf(value: string) {
  return value.replace(/\D/g, "");
}

function matchesCustomer(customer: CreditCustomer, query: string) {
  const text = `${customer.firstName} ${customer.lastName}`.toLowerCase();
  if (text.includes(query.toLowerCase())) return true;
  const digits = digitsOf(query);
  if (!digits) return false;
  return digitsOf(customer.phone ?? "").includes(digits);
}

/** 402px ustunga sig'ishi uchun qisqa: "savdo 5 kun oldin". */
function lastSaleLabel(customer: CreditCustomer) {
  const time = lastSaleAt(customer);
  if (time === null) return "savdo yo'q";
  const days = Math.floor((startOfToday() - time) / DAY);
  if (days <= 0) return "bugun savdo qilgan";
  return `savdo ${days} kun oldin`;
}

type Props = {
  customers: CreditCustomer[];
  onSelect: (customer: CreditCustomer) => void;
  onAddNew: () => void;
  /** Mijoz tanlangan — ro'yxat yig'iladi, qidiruv maydoni qoladi. */
  collapsed?: boolean;
  invalid?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

export function NasiyachiPicker({
  customers,
  onSelect,
  onAddNew,
  collapsed = false,
  invalid,
  inputRef,
}: Props) {
  const [raw, setRaw] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [chip, setChip] = React.useState<Chip>("recent");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setQuery(raw.trim()), 200);
    return () => clearTimeout(timer);
  }, [raw]);

  // Mijoz tanlangan bo'lsa ham, foydalanuvchi yozsa ro'yxat qaytadi.
  const showList = !collapsed || raw.trim() !== "";

  const overdueCount = customers.filter(isOverdue).length;

  const byChip = customers.filter((customer) => {
    if (chip === "overdue") return isOverdue(customer);
    if (chip === "clean") return customer.currentDebt <= 0;
    return true;
  });
  const found = query ? byChip.filter((customer) => matchesCustomer(customer, query)) : byChip;
  const rows = [...found].sort((a, b) => (lastSaleAt(b) ?? 0) - (lastSaleAt(a) ?? 0));

  React.useEffect(() => {
    setActiveIndex(0);
  }, [query, chip]);

  React.useEffect(() => {
    listRef.current
      ?.querySelector(`[data-idx="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // "Yangi qo'shasizmi?" tugmasi faqat natija topilmaganda chiqadi —
  // shuning uchun klaviatura aylanasi ham faqat o'shanda uni qamrab oladi.
  const addIndex = rows.length;
  const addVisible = rows.length === 0 && query !== "";
  const lastIndex = addVisible ? addIndex : Math.max(0, rows.length - 1);

  const pick = (index: number) => {
    if (index === addIndex) {
      if (addVisible) onAddNew();
      return;
    }
    const customer = rows[index];
    if (!customer) return;
    onSelect(customer);
    setRaw("");
    setQuery("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = activeIndex + step;
      setActiveIndex(next < 0 ? lastIndex : next > lastIndex ? 0 : next);
      return;
    }
    if (event.key === "Enter" && showList) {
      event.preventDefault();
      event.stopPropagation();
      pick(activeIndex);
    }
  };

  return (
    <div className={cn("flex min-h-0 flex-col gap-2", showList && "flex-1")}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#737D91]" />
        <input
          ref={inputRef}
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ism yoki telefon raqami…"
          className={cn(
            "h-11 w-full rounded-md border bg-[#FDFDFD] pl-9 pr-3 text-sm text-[#222C3B] outline-none placeholder:text-[#737D91] focus:border-[#0836B0]",
            invalid ? "border-[#C43B3B]" : "border-[#AEB9D4]",
          )}
        />
      </div>

      {showList && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-[#AEB9D4] bg-[#FDFDFD]">
          <div className="flex flex-shrink-0 items-center gap-1.5 border-b border-[#AEB9D4] px-2.5 py-2">
            {CHIPS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setChip(item.value)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  chip === item.value
                    ? "border-[#0836B0] bg-[#0836B0]/10 text-[#0836B0]"
                    : "border-[#AEB9D4] text-[#737D91] hover:text-[#222C3B]",
                )}
              >
                {item.label}
                {item.value === "overdue" && ` · ${overdueCount}`}
              </button>
            ))}
          </div>

          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
            {rows.length === 0 && query ? (
              <button
                type="button"
                data-idx={addIndex}
                onClick={() => pick(addIndex)}
                onMouseEnter={() => setActiveIndex(addIndex)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-3.5 text-left text-sm text-[#0836B0]",
                  activeIndex === addIndex && "bg-[#0836B0]/10",
                )}
              >
                <UserPlus className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">«{query}» topilmadi — yangi qo'shasizmi?</span>
              </button>
            ) : (
              <>
                {rows.length === 0 && (
                  <div className="px-3 py-6 text-center text-sm text-[#737D91]">
                    Bu filtrda nasiyachi yo'q
                  </div>
                )}
                {rows.map((customer, index) => (
                  <CustomerRow
                    key={customer.id}
                    customer={customer}
                    index={index}
                    active={activeIndex === index}
                    onHover={() => setActiveIndex(index)}
                    onPick={() => pick(index)}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomerRow({
  customer,
  index,
  active,
  onHover,
  onPick,
}: {
  customer: CreditCustomer;
  index: number;
  active: boolean;
  onHover: () => void;
  onPick: () => void;
}) {
  const days = daysToDue(customer);
  const overdue = isOverdue(customer);

  return (
    <button
      type="button"
      data-idx={index}
      onClick={onPick}
      onMouseEnter={onHover}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
        active ? "bg-[#0836B0]/10" : "hover:bg-[#0836B0]/5",
      )}
    >
      <Avatar customer={customer} />

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-[#222C3B]">
          {customer.firstName} {customer.lastName}
        </div>
        <div className="truncate text-[11px] text-[#737D91]">
          {customer.phone ?? "—"} · {lastSaleLabel(customer)}
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        {customer.currentDebt <= 0 ? (
          <div className="text-xs text-[#737D91]">Qarzi yo'q</div>
        ) : (
          <>
            <div
              data-no-translate
              className={cn(
                "text-sm font-semibold tabular-nums",
                overdue ? "text-[#C43B3B]" : "text-[#222C3B]",
              )}
            >
              {formatSom(customer.currentDebt)}
            </div>
            <div className={cn("text-[11px]", overdue ? "text-[#C43B3B]" : "text-[#737D91]")}>
              {days === null
                ? "muddat yo'q"
                : overdue
                  ? `${Math.abs(days)} kun kechikkan`
                  : `${days} kun qoldi`}
            </div>
          </>
        )}
      </div>
    </button>
  );
}

export function Avatar({ customer }: { customer: CreditCustomer }) {
  return (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#0836B0]/10 text-xs font-bold text-[#0836B0]">
      {initialsOf(customer)}
    </div>
  );
}

/**
 * Tanlangan nasiyachi kartochkasi. `saleDebt` — shu savdodan qo'shiladigan
 * qarz, o'ng ustunda summa o'zgarganda bu yerdagi raqamlar darhol yangilanadi.
 */
export function SelectedCustomerCard({
  customer,
  saleDebt,
  onClear,
}: {
  customer: CreditCustomer;
  saleDebt: number;
  onClear: () => void;
}) {
  const newDebt = customer.currentDebt + saleDebt;
  const hasLimit = customer.limit > 0;
  const limitPercent = hasLimit ? (newDebt / customer.limit) * 100 : 0;
  const overLimit = hasLimit && newDebt > customer.limit;
  const overdue = isOverdue(customer);
  const days = daysToDue(customer);

  return (
    <div className="rounded-md border-2 border-[#0836B0] bg-[#FDFDFD] p-3">
      <div className="flex items-center gap-3">
        <Avatar customer={customer} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-[#222C3B]">
            {customer.firstName} {customer.lastName}
          </div>
          <div className="truncate text-xs text-[#737D91]">{customer.phone ?? "—"}</div>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="Nasiyachini bekor qilish"
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[#737D91] hover:bg-[#0836B0]/5 hover:text-[#222C3B]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="my-3 h-px bg-[#AEB9D4]" />

      <div className="flex items-center justify-between text-sm">
        <span className="text-[#737D91]">Joriy qarzi</span>
        <span data-no-translate className="font-medium tabular-nums text-[#222C3B]">
          {formatSom(customer.currentDebt)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-sm">
        <span className="text-[#737D91]">Bu savdodan</span>
        <span data-no-translate className="font-medium tabular-nums text-[#222C3B]">
          + {formatSom(saleDebt)}
        </span>
      </div>

      <div className="my-3 h-px bg-[#AEB9D4]" />

      <div className="flex items-baseline justify-between">
        <span className="text-sm text-[#737D91]">Yangi qarzi</span>
        <span data-no-translate className="text-xl font-bold tabular-nums text-[#0836B0]">
          {formatSom(newDebt)}
        </span>
      </div>

      {hasLimit ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs">
            <span data-no-translate className="text-[#737D91]">
              Limiti {formatSom(customer.limit)}
            </span>
            <span
              data-no-translate
              className={cn(
                "font-semibold tabular-nums",
                overLimit ? "text-[#C43B3B]" : "text-[#737D91]",
              )}
            >
              {Math.round(limitPercent)}% band
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#AEB9D4]/40">
            <div
              className={cn("h-full rounded-full", overLimit ? "bg-[#C43B3B]" : "bg-[#0836B0]")}
              style={{ width: `${Math.min(100, Math.max(0, limitPercent))}%` }}
            />
          </div>
          {overLimit && (
            <div data-no-translate className="mt-1.5 text-xs font-medium text-[#C43B3B]">
              Limitdan {formatSom(newDebt - customer.limit)} oshadi
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 text-xs text-[#737D91]">Limit qo'yilmagan</div>
      )}

      {overdue && days !== null && (
        <>
          <div className="my-3 h-px bg-[#AEB9D4]" />
          <div className="flex items-center gap-2 text-xs font-medium text-[#C43B3B]">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            Oldingi nasiya {Math.abs(days)} kun kechikkan
          </div>
        </>
      )}
    </div>
  );
}
