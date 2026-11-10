import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Search, Trash2 } from "lucide-react";
import { formatSom, MOCK_CREDIT_CUSTOMERS, type CreditCustomer } from "@/lib/mock-data";
import { fullCustomerName, searchCreditCustomers } from "@/lib/data-actions";

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  selectedId?: string;
  onSelect: (customer: CreditCustomer) => void;
  onOpenReceipts?: (customer: CreditCustomer) => void;
  onEditCustomer?: (customer: CreditCustomer) => void;
  onDeleteCustomer?: (customer: CreditCustomer) => void;
  placeholder?: string;
  limit?: number;
  compact?: boolean;
  showInitialResults?: boolean;
};

export function CustomerSearch({
  value,
  onValueChange,
  selectedId,
  onSelect,
  onOpenReceipts,
  onEditCustomer,
  onDeleteCustomer,
  placeholder = "Mijoz ismi, ID yoki telefon...",
  limit = 8,
  compact = false,
  showInitialResults = true,
}: Props) {
  const customers = React.useMemo(() => {
    if (!value.trim()) return showInitialResults ? MOCK_CREDIT_CUSTOMERS.slice(0, limit) : [];
    return searchCreditCustomers(value, limit);
  }, [limit, showInitialResults, value]);

  return (
    <div className="space-y-2">
      <Input
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
      />

      {value.trim() && customers.length === 0 && (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          Mijoz topilmadi
        </div>
      )}

      {customers.length > 0 && (
        <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
          {customers.map((customer) => (
            <CustomerSearchRow
              key={customer.id}
              customer={customer}
              active={customer.id === selectedId}
              compact={compact}
              onPick={() => onSelect(customer)}
              onOpenReceipts={onOpenReceipts ? () => onOpenReceipts(customer) : undefined}
              onEditCustomer={onEditCustomer ? () => onEditCustomer(customer) : undefined}
              onDeleteCustomer={onDeleteCustomer ? () => onDeleteCustomer(customer) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CustomerSearchRow({
  customer,
  active,
  compact,
  onPick,
  onOpenReceipts,
  onEditCustomer,
  onDeleteCustomer,
}: {
  customer: CreditCustomer;
  active: boolean;
  compact: boolean;
  onPick: () => void;
  onOpenReceipts?: () => void;
  onEditCustomer?: () => void;
  onDeleteCustomer?: () => void;
}) {
  return (
    <div
      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition hover:bg-muted/60 ${
        active ? "border-primary bg-primary/5" : "bg-card"
      }`}
      onClick={onPick}
    >
      <div className="min-w-[160px] flex-1">
        <div className="text-[10px] uppercase text-muted-foreground">Mijoz ismi</div>
        <div className="font-semibold">{fullCustomerName(customer)}</div>
      </div>
      <InlineInfo label="Qarz" value={formatSom(customer.currentDebt)} accent />
      {!compact && (
        <InlineInfo label="Qoldiq" value={formatSom(customer.limit - customer.currentDebt)} />
      )}
      <InlineInfo label="Tel raqam" value={customer.phone ?? "—"} />
      {onEditCustomer && (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-9 w-9 shrink-0"
          onClick={(event) => {
            event.stopPropagation();
            onEditCustomer();
          }}
          aria-label="Mijozni tahrirlash"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {onOpenReceipts && (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-9 w-9 shrink-0"
          onClick={(event) => {
            event.stopPropagation();
            onOpenReceipts();
          }}
          aria-label="Qarz cheklari"
        >
          <Search className="h-4 w-4" />
        </Button>
      )}
      {onDeleteCustomer && (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
          onClick={(event) => {
            event.stopPropagation();
            onDeleteCustomer();
          }}
          aria-label="Mijozni o'chirish"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function InlineInfo({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-[120px]">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={`truncate font-semibold tabular-nums ${accent ? "text-primary" : ""}`}>
        {value}
      </div>
    </div>
  );
}
