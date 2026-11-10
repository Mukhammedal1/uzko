import * as React from "react";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw, PieChart, TrendingUp } from "lucide-react";
import { TovarlarHolati } from "@/components/tovarlar/TovarlarHolati";
import { KursYangilash } from "@/components/shared/KursYangilash";
import { KirimChiqimAnalizi } from "@/components/umumiy/KirimChiqimAnalizi";
import { SavdoAnalizi } from "@/components/umumiy/SavdoAnalizi";
import { useApp } from "@/lib/app-context";

const TABS = [
  { id: "holati", label: "Tovar holati", icon: Activity },
  { id: "savdo", label: "Savdo analizi", icon: TrendingUp },
  { id: "analiz", labelKey: "income_expense_analysis", icon: PieChart },
  { id: "kurs", label: "Kursni yangila", icon: RefreshCw },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function UmumiyDashboard() {
  const [tab, setTab] = React.useState<Tab>("holati");
  const { t } = useApp();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-shrink-0 flex-wrap gap-2 border-b bg-card p-3">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <Button
              key={item.id}
              variant={active ? "default" : "outline"}
              size="sm"
              onClick={() => setTab(item.id)}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              {"labelKey" in item ? t(item.labelKey) : item.label}
            </Button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {tab === "savdo" && <SavdoAnalizi />}
        {tab === "holati" && <TovarlarHolati />}
        {tab === "analiz" && <KirimChiqimAnalizi />}
        {tab === "kurs" && <KursYangilash />}
      </div>
    </div>
  );
}
