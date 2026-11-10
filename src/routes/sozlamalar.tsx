import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { Toaster } from "@/components/ui/sonner";
import { TopBar } from "@/components/sotuv/TopBar";
import { BottomBar } from "@/components/sotuv/BottomBar";
import { SozlamalarPage } from "@/components/sozlamalar/SozlamalarPage";

export const Route = createFileRoute("/sozlamalar")({
  head: () => ({
    meta: [
      { title: "UZKO — Profil" },
      { name: "description", content: "Shaxsiy profil sozlamalari" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="app-shell flex min-h-dvh w-full flex-col bg-muted/30 pb-14 lg:pb-0">
      <TopBar />
      <main className="responsive-main flex min-h-0 flex-1 flex-col overflow-hidden">
        <SozlamalarPage />
      </main>
      <BottomBar />
      <Toaster position="top-center" richColors />
    </div>
  );
}
