import { createFileRoute } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { TopBar } from "@/components/sotuv/TopBar";
import { BottomBar } from "@/components/sotuv/BottomBar";
import { XodimlarPage } from "@/components/xodimlar/XodimlarPage";

export const Route = createFileRoute("/xodimlar")({
  head: () => ({
    meta: [
      { title: "UZKO — Xodimlar" },
      { name: "description", content: "Xodimlar ro'yxati, lavozim va maosh boshqaruvi" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="app-shell flex min-h-dvh w-full flex-col bg-muted/30 pb-14 lg:pb-0">
      <TopBar />
      <main className="responsive-main flex min-h-0 flex-1 flex-col overflow-hidden">
        <XodimlarPage />
      </main>
      <BottomBar />
      <Toaster position="top-center" richColors />
    </div>
  );
}
