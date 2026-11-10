import * as React from "react";
import {
  Activity,
  ClipboardList,
  HandCoins,
  PieChart,
  ShoppingCart,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MOCK_CREDIT_CUSTOMERS,
  MOCK_RECEIPTS,
  MOCK_RETURN_RECEIPTS,
  MOCK_SUPPLIER_REPORTS,
  formatSom,
} from "@/lib/mock-data";

export function DashboardJamlanma() {
  const sales = MOCK_RECEIPTS.reduce((s, r) => s + r.total, 0);
  const returns = MOCK_RETURN_RECEIPTS.reduce((s, r) => s + r.total, 0);
  const supplierDebt = MOCK_SUPPLIER_REPORTS.reduce((s, r) => s + r.remainingDebt, 0);
  const customerDebt = MOCK_CREDIT_CUSTOMERS.reduce((s, c) => s + c.currentDebt, 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <Kpi icon={<ShoppingCart />} label="Sotilgan tovarlar" value={formatSom(sales)} />
        <Kpi icon={<RotateCcw />} label="Qaytgan tovarlar" value={formatSom(returns)} />
        <Kpi icon={<HandCoins />} label="Bizni haqimiz" value={formatSom(customerDebt)} />
        <Kpi
          icon={<ClipboardList />}
          label="Yetkazib beruvchilarga qarz"
          value={formatSom(supplierDebt)}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Mini
          title="Tovarlar holati"
          icon={<Activity className="h-4 w-4" />}
          lines={[
            "Ombor qoldiqlari nazorati",
            "Skidka va tan narx indikatorlari",
            "Tez sotilayotgan tovarlar",
          ]}
        />
        <Mini
          title="Hisobot"
          icon={<ClipboardList className="h-4 w-4" />}
          lines={[
            "Yetkazib beruvchi ID bo‘yicha qarzlar",
            "Qancha olindi / berildi",
            "Qolgan qarzdorlik",
          ]}
        />
        <Mini
          title="Kirim chiqim analizi"
          icon={<PieChart className="h-4 w-4" />}
          lines={[
            "Kirim: sotuv va qarz so‘ndirish",
            "Chiqim: barcha kategoriyalar",
            "Davr bo‘yicha ko‘rish",
          ]}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dashboard ichiga jamlangan optionlar</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-5 gap-2 text-sm">
          <BadgeText text="Tovarlar holati" />
          <BadgeText text="Hisobot" />
          <BadgeText text="Kirim chiqim analizi" />
          <BadgeText text="Bizni haqimiz" />
          <BadgeText text="Sotilgan/Qaytgan tovarlar" />
        </CardContent>
      </Card>
    </div>
  );
}
function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
function Mini({ title, icon, lines }: { title: string; icon: React.ReactNode; lines: string[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {lines.map((l) => (
            <li key={l}>• {l}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
function BadgeText({ text }: { text: string }) {
  return <div className="rounded-lg bg-muted/60 px-3 py-2 text-center font-semibold">{text}</div>;
}
