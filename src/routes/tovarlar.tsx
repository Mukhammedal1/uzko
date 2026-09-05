import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { Toaster } from "@/components/ui/sonner";
import { TopBar } from "@/components/sotuv/TopBar";
import { BottomBar } from "@/components/sotuv/BottomBar";
import { Button } from "@/components/ui/button";
import { BarchaTovarlar } from "@/components/tovarlar/BarchaTovarlar";
import { TovarQoshish } from "@/components/tovarlar/TovarQoshish";
import { TovarPrixod } from "@/components/tovarlar/TovarPrixod";
import { TovarlarTarixi } from "@/components/tovarlar/TovarlarTarixi";
import { Sanoq } from "@/components/tovarlar/Sanoq";
import { useApp } from "@/lib/app-context";
import { Package, History, ClipboardList, PackageCheck } from "lucide-react";

export const Route = createFileRoute("/tovarlar")({
  head: () => ({
    meta: [{ title: "UZKO — Tovarlar" }, { name: "description", content: "Tovarlar boshqaruvi" }],
  }),
  component: TovarlarPage,
});

const TABS = [
  { id: "barcha", labelKey: "all_products", icon: Package },
  { id: "prixod", labelKey: "goods_receipt", icon: PackageCheck },
  { id: "sanoq", labelKey: "stock_count", icon: ClipboardList },
  { id: "tarix", labelKey: "products_history", icon: History },
] as const;

type Tab = (typeof TABS)[number]["id"];
export type ProductCreateMode = "qabul";

function TovarlarPage() {
  const [tab, setTab] = React.useState<Tab>("barcha");
  const [createMode, setCreateMode] = React.useState<ProductCreateMode | null>(null);
  const [selectionSlot, setSelectionSlot] = React.useState<HTMLDivElement | null>(null);
  const { t } = useApp();

  return (
    <div className="app-shell flex min-h-dvh w-full flex-col bg-muted/30 pb-14 lg:pb-0">
      <TopBar />

      <main className="responsive-main flex min-h-0 flex-1 flex-col gap-2 bg-muted/40 p-2">
        <div className="responsive-tabs flex flex-shrink-0 items-center gap-2 overflow-x-auto rounded-lg border bg-card p-2 shadow-sm">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <Button
                key={item.id}
                variant={active ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setTab(item.id);
                  setCreateMode(null);
                }}
                className="gap-2 whitespace-nowrap"
              >
                <Icon className="h-4 w-4" />
                {t(item.labelKey)}
              </Button>
            );
          })}
          <div
            ref={setSelectionSlot}
            className="ml-auto flex flex-wrap items-center justify-end gap-2"
          />
        </div>

        <section className="responsive-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
          {createMode ? (
            <TovarQoshish mode={createMode} onDone={() => setCreateMode(null)} />
          ) : (
            <>
              {tab === "barcha" && (
                <BarchaTovarlar onSetCreateMode={setCreateMode} selectionSlot={selectionSlot} />
              )}
              {tab === "prixod" && <TovarPrixod />}
              {tab === "sanoq" && <Sanoq />}
              {tab === "tarix" && <TovarlarTarixi />}
            </>
          )}
        </section>
      </main>

      <BottomBar />
      <Toaster position="top-center" richColors />
    </div>
  );
}
