import * as React from "react";
import { Button } from "@/components/ui/button";
import { Box, Tag, QrCode, Ruler } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SpravochnikTable, type SpravochnikField } from "./SpravochnikTable";

const TABS = [
  { id: "warehouses", label: "Omborlar", icon: Box },
  { id: "expenseCategories", label: "Xarajatlar", icon: Tag },
  { id: "shelfLocations", label: "Polka raqami", icon: QrCode },
  { id: "units", label: "Birliklar", icon: Ruler },
] as const;

type TabId = (typeof TABS)[number]["id"];

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function GeneralEditing() {
  const { settings, updateSettings } = useApp();
  const [tab, setTab] = React.useState<TabId>("warehouses");

  const withDedupeCheck = (list: { name: string }[], name: string) =>
    list.some((item) => item.name.trim().toLowerCase() === name.trim().toLowerCase());

  const fields: Record<TabId, SpravochnikField[]> = {
    warehouses: [
      { key: "name", label: "Nomi", type: "text", placeholder: "Masalan: Qurilish ombori" },
    ],
    expenseCategories: [
      { key: "name", label: "Nomi", type: "text", placeholder: "Masalan: Reklama" },
      { key: "note", label: "Izoh", type: "text", placeholder: "Ixtiyoriy izoh" },
    ],
    shelfLocations: [
      { key: "name", label: "Nomi", type: "text", placeholder: "Masalan: B-001" },
      {
        key: "warehouse",
        label: "Ombor",
        type: "select",
        options: settings.warehouses.map((w) => w.name),
      },
    ],
    units: [
      { key: "name", label: "Nomi", type: "text", placeholder: "Masalan: Kilogramm" },
      { key: "abbr", label: "Qisqartma", type: "text", placeholder: "Masalan: kg" },
    ],
  };

  const handleAdd = (values: Record<string, string>) => {
    const name = (values.name ?? "").trim();
    if (!name) return;
    if (withDedupeCheck(settings[tab], name)) {
      toast.error("Bu qiymat oldin qo'shilgan");
      return;
    }
    const entry = { id: makeId(tab), ...values, name };
    updateSettings({ [tab]: [...settings[tab], entry] } as Partial<typeof settings>);
    toast.success("Saqlandi!");
  };

  const handleUpdate = (id: string, values: Record<string, string>) => {
    const name = (values.name ?? "").trim();
    if (!name) return;
    const next = settings[tab].map((item) =>
      item.id === id ? { ...item, ...values, name } : item,
    );
    updateSettings({ [tab]: next } as Partial<typeof settings>);
    toast.success("Saqlandi!");
  };

  const handleDelete = (id: string) => {
    const next = settings[tab].filter((item) => item.id !== id);
    updateSettings({ [tab]: next } as Partial<typeof settings>);
    toast.success("O'chirildi");
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Box className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-bold">Umumiy tahrirlash</h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <Button
              key={t.id}
              variant={tab === t.id ? "default" : "outline"}
              size="sm"
              onClick={() => setTab(t.id)}
              className={cn("gap-2")}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </Button>
          );
        })}
      </div>

      <SpravochnikTable
        fields={fields[tab]}
        rows={settings[tab]}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}
