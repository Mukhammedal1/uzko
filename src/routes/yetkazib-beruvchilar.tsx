import { createFileRoute } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { TopBar } from "@/components/sotuv/TopBar";
import { BottomBar } from "@/components/sotuv/BottomBar";
import { YetkazibBeruvchilarPage } from "@/components/yetkazib-beruvchilar/YetkazibBeruvchilarPage";

export const Route = createFileRoute("/yetkazib-beruvchilar")({
  head: () => ({
    meta: [
      { title: "UZKO — Yetkazib beruvchilar" },
      { name: "description", content: "Yetkazib beruvchilar dashboardi" },
    ],
  }),
  component: YetkazibBeruvchilarRoutePage,
});

function YetkazibBeruvchilarRoutePage() {
  return (
    <div className="app-shell flex min-h-dvh w-full flex-col bg-muted/30 pb-14 lg:pb-0">
      <TopBar />

      <main className="responsive-main flex min-h-0 flex-1 flex-col gap-2 overflow-hidden bg-muted/40 p-2">
        <section className="responsive-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
          <YetkazibBeruvchilarPage />
        </section>
      </main>

      <BottomBar />
      <Toaster position="top-center" richColors />
    </div>
  );
}
