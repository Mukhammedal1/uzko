import { createFileRoute } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { TopBar } from "@/components/sotuv/TopBar";
import { BottomBar } from "@/components/sotuv/BottomBar";
import { BoshqaruvPage } from "@/components/boshqaruv/BoshqaruvPage";

export const Route = createFileRoute("/boshqaruv")({
  head: () => ({
    meta: [
      { title: "UZKO — Boshqaruv" },
      { name: "description", content: "Chek ko'rinishi, qurilmalar va umumiy tahrirlash" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="app-shell flex min-h-dvh w-full flex-col bg-muted/30 pb-14 lg:pb-0">
      <TopBar />
      <main className="responsive-main flex min-h-0 flex-1 flex-col overflow-hidden">
        <BoshqaruvPage />
      </main>
      <BottomBar />
      <Toaster position="top-center" richColors />
    </div>
  );
}
