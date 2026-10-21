import { createFileRoute } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { TopBar } from "@/components/sotuv/TopBar";
import { BottomBar } from "@/components/sotuv/BottomBar";
import { UmumiyDashboard } from "@/components/umumiy/UmumiyDashboard";

export const Route = createFileRoute("/umumiy")({
  head: () => ({
    meta: [{ title: "UZKO — Umumiy" }, { name: "description", content: "Umumiy dashboard" }],
  }),
  component: UmumiyPage,
});

function UmumiyPage() {
  return (
    <div className="app-shell flex min-h-dvh w-full flex-col bg-muted/30 pb-14 lg:pb-0">
      <TopBar />

      <main className="responsive-main flex min-h-0 flex-1 flex-col gap-2 bg-muted/40 p-2">
        <section className="responsive-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
          <UmumiyDashboard />
        </section>
      </main>

      <BottomBar />
      <Toaster position="top-center" richColors />
    </div>
  );
}
