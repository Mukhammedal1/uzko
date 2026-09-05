import * as React from "react";
import { History } from "lucide-react";
import { MOCK_MONEY_OPERATIONS, formatSom } from "@/lib/mock-data";

type Props = {
  party: "nasiyachi" | "agent";
  partyId: string;
  /** Tashqarida refreshKey o'zgarganda ro'yxatni qayta hisoblash uchun. */
  refreshKey?: number;
};

function fmtDateTime(value: string) {
  return new Date(value).toLocaleString("uz-UZ");
}

/** Nasiyachi yoki agent bo'yicha pul operatsiyalari (to'lovlar) tarixi. */
export function MoneyOperationsList({ party, partyId, refreshKey }: Props) {
  const ops = React.useMemo(
    () => MOCK_MONEY_OPERATIONS.filter((op) => op.party === party && op.partyId === partyId),
    [party, partyId, refreshKey],
  );

  const total = ops.reduce((sum, op) => sum + op.amount, 0);

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <History className="h-3.5 w-3.5" />
          {party === "nasiyachi" ? "Qarz so'ndirish tarixi" : "To'lovlar tarixi"}
        </span>
        <span className="text-xs font-semibold text-muted-foreground">
          Jami: {formatSom(total)}
        </span>
      </div>

      {ops.length === 0 ? (
        <div className="p-4 text-center text-sm text-muted-foreground">
          Hozircha operatsiya yo'q
        </div>
      ) : (
        <div className="max-h-64 divide-y overflow-y-auto">
          {ops.map((op) => (
            <div key={op.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="min-w-0">
                <div className="font-medium">
                  {op.party === "nasiyachi" ? "Qarz so'ndirildi" : "Agentga to'lov"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {fmtDateTime(op.date)} · {op.method}
                  {op.party === "agent"
                    ? op.source === "boshqa"
                      ? " · ixtiyoriy manba"
                      : " · kassadan"
                    : ""}
                  {op.cashier ? ` · ${op.cashier}` : ""}
                  {op.note ? ` · ${op.note}` : ""}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div
                  className={
                    op.direction === "in"
                      ? "font-semibold text-success"
                      : "font-semibold text-destructive"
                  }
                >
                  {op.direction === "in" ? "+" : "−"}
                  {formatSom(op.amount)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Balans: {formatSom(op.balanceAfter)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
