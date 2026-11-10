import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { Toaster } from "@/components/ui/sonner";
import { TopBar } from "@/components/sotuv/TopBar";
import { BottomBar } from "@/components/sotuv/BottomBar";
import { Button } from "@/components/ui/button";
import { Receipt, Banknote, History, Landmark } from "lucide-react";
import { KunlikSotuv } from "@/components/kassa/KunlikSotuv";
import { KassadanPulChiqarish } from "@/components/kassa/KassadanPulChiqarish";
import { KassaTarixi } from "@/components/kassa/KassaTarixi";
import { Kassalar } from "@/components/kassa/Kassalar";

export const Route = createFileRoute("/kassa")({
  head: () => ({
    meta: [{ title: "UZKO — Kassa" }, { name: "description", content: "Kassa operatsiyalari" }],
  }),
  component: KassaPage,
});

const TABS = [
  { id: "kunlik", label: "Kunlik sotuv", icon: Receipt },
  { id: "chiqim", label: "Kassadan pul chiqarish", icon: Banknote },
  { id: "tarix", label: "Kassa tarixi", icon: History },
  { id: "kassalar", label: "Kassalar", icon: Landmark },
] as const;
type Tab = (typeof TABS)[number]["id"];

function KassaPage() {
  const [tab, setTab] = React.useState<Tab>("kunlik");

  return (
    <div className="app-shell flex min-h-dvh w-full flex-col bg-muted/30 pb-14 lg:pb-0">
      <TopBar />

      <main className="responsive-main flex min-h-0 flex-1 flex-col gap-2 overflow-hidden bg-muted/40 p-2">
        <div className="responsive-tabs flex flex-shrink-0 flex-wrap gap-2 overflow-x-auto rounded-lg border bg-card p-2 shadow-sm">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <Button
                key={t.id}
                variant={active ? "default" : "outline"}
                size="sm"
                onClick={() => setTab(t.id)}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </Button>
            );
          })}
        </div>

        <section className="responsive-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
          {tab === "kunlik" && <KunlikSotuv />}
          {tab === "chiqim" && <KassadanPulChiqarish />}
          {tab === "tarix" && <KassaTarixi />}
          {tab === "kassalar" && <Kassalar />}
        </section>
      </main>

      <BottomBar />
      <Toaster position="top-center" richColors />
    </div>
  );
}
