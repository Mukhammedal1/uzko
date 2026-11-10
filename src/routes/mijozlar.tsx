import { createFileRoute } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { TopBar } from "@/components/sotuv/TopBar";
import { BottomBar } from "@/components/sotuv/BottomBar";
import { MijozlarPage } from "@/components/mijozlar/MijozlarPage";

export const Route = createFileRoute("/mijozlar")({
  head: () => ({
    meta: [{ title: "UZKO — Mijozlar" }, { name: "description", content: "Mijozlar dashboardi" }],
  }),
  component: MijozlarRoutePage,
});

function MijozlarRoutePage() {
  return (
    <div className="app-shell flex min-h-dvh w-full flex-col bg-muted/30 pb-14 lg:pb-0">
      <TopBar />

      <main className="responsive-main flex min-h-0 flex-1 flex-col gap-2 overflow-hidden bg-muted/40 p-2">
        <section className="responsive-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
          <MijozlarPage />
        </section>
      </main>

      <BottomBar />
      <Toaster position="top-center" richColors />
    </div>
  );
}
