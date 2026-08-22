import * as React from "react";
import { Monitor, ReceiptText, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReceiptSettings } from "./ReceiptSettings";
import { GeneralEditing } from "./GeneralEditing";
import { DevicePermissions } from "./DevicePermissions";

const SECTIONS = [
  { id: "receipt", icon: ReceiptText, label: "Chek ko'rinishi" },
  { id: "general", icon: Box, label: "Umumiy tahrirlash" },
  { id: "devices", icon: Monitor, label: "Qurilmalar" },
] as const;

type Section = (typeof SECTIONS)[number]["id"];

export function BoshqaruvPage() {
  const [section, setSection] = React.useState<Section>(() => {
    if (typeof window === "undefined") return "receipt";
    const params = new URLSearchParams(window.location.search);
    return params.has("connectDevice") || params.has("deviceId") ? "devices" : "receipt";
  });

  return (
    <div className="settings-shell flex h-full min-h-0">
      {/* Sidebar */}
      <aside className="settings-sidebar flex w-56 flex-shrink-0 flex-col border-r bg-card">
        <div className="settings-sidebar-title border-b p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Boshqaruv
          </div>
        </div>
        <nav className="settings-nav flex flex-col gap-1 p-2">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = section === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={cn(
                  "settings-nav-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="settings-nav-label whitespace-nowrap">{s.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <main className="settings-content flex min-h-0 flex-1 flex-col overflow-auto bg-muted/20 p-6">
        {section === "receipt" && <ReceiptSettings />}
        {section === "general" && <GeneralEditing />}
        {section === "devices" && <DevicePermissions />}
      </main>
    </div>
  );
}
