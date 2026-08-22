import * as React from "react";
import {
  BarChart3,
  Bell,
  Boxes,
  Check,
  Database,
  Languages,
  LogOut,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  UserRound,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useApp, type Lang } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

export function TopBar() {
  const { t, settings, updateSettings } = useApp();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const unreadCount = settings.accessNotifications.filter((item) => !item.read).length;

  const handleLogout = () => {
    logout();
    navigate({ to: "/login", replace: true });
  };

  const langs: { value: Lang; label: string }[] = [
    { value: "uz", label: "UZB" },
    { value: "uz_cyr", label: "ЎЗБ" },
    { value: "ru", label: "RUS" },
    { value: "en", label: "ENG" },
  ];
  const currentLang = langs.find((l) => l.value === settings.lang)?.label ?? "UZB";

  const navItems: { to: string; label: string; Icon: LucideIcon }[] = [
    { to: "/", label: t("sotuv"), Icon: ShoppingCart },
    { to: "/kassa", label: t("kassa"), Icon: Wallet },
    { to: "/tovarlar", label: t("tovarlar"), Icon: Boxes },
    { to: "/mijozlar", label: "Mijozlar", Icon: UserRound },
    { to: "/umumiy", label: t("umumiy"), Icon: BarChart3 },
    { to: "/boshqaruv", label: t("boshqaruv"), Icon: SlidersHorizontal },
  ];

  const handleEnsureCompanyProfile = () => {
    if (settings.companyRegistrationId) return;
    const id = `MCHJ-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    updateSettings({ companyRegistrationId: id });
  };

  const approveAccessRequest = (requestId: string) => {
    const request = settings.accessNotifications.find((item) => item.id === requestId);
    if (!request?.deviceId) return;

    updateSettings({
      currentDeviceId: request.deviceId,
      accessNotifications: settings.accessNotifications.map((item) =>
        item.id === requestId ? { ...item, read: true, status: "approved" } : item,
      ),
      devices: settings.devices.map((device) =>
        device.id === request.deviceId
          ? {
              ...device,
              model: request.deviceModel || device.model,
              lastConnectedAt: new Date().toISOString(),
            }
          : device,
      ),
    });

    toast.success("Bazaga ulanish tasdiqlandi", {
      description: `${request.deviceModel || "Qurilma"} ma'lumotlarni ko'rishi mumkin`,
    });
  };

  return (
    <header className="uzko-topbar flex min-h-12 flex-shrink-0 items-center justify-between gap-2 border-b bg-card px-3 py-1.5 shadow-sm lg:px-4">
      <div className="uzko-brand flex min-w-0 items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={handleEnsureCompanyProfile}
              className="relative flex items-center gap-2 rounded-lg border border-transparent p-0.5 text-left transition-colors hover:border-primary/20 hover:bg-primary/5"
            >
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md">
                <img src="/uzko-logo.jpg" alt="UZKO" className="h-full w-full object-cover" />
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight">UZKO</div>
              </div>
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                  {unreadCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" side="bottom" className="w-[340px] p-0">
            <div className="border-b p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">MCHJ User ma'lumoti</div>
                  <div className="mt-2 rounded-lg border bg-muted/20 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      User
                    </div>
                    <div className="font-semibold">{settings.username}</div>
                    <div className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                      ID
                    </div>
                    <div className="font-mono text-sm font-semibold text-primary">
                      {settings.companyRegistrationId || "ID yaratilmoqda..."}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <nav className="uzko-main-nav flex min-w-0 items-center gap-0.5 overflow-x-auto rounded-md bg-muted/50 p-0.5">
        {navItems.map(({ Icon, ...item }) => (
          <Link
            key={item.to}
            to={item.to}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
            activeOptions={item.to === "/" ? { exact: true } : undefined}
            activeProps={{
              className:
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded bg-card px-3 py-1.5 text-sm font-semibold text-primary shadow-sm",
            }}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="uzko-actions flex flex-shrink-0 items-center gap-1.5">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative flex h-8 w-8 items-center justify-center rounded-md border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Notification"
            >
              <Bell className="h-3.5 w-3.5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                  {unreadCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" side="bottom" className="w-[360px] p-0">
            <div className="border-b p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Bell className="h-4 w-4 text-primary" />
                Ulanish so'rovlari
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto p-3">
              {settings.accessNotifications.length === 0 && (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Hozircha ulanish so'rovi yo'q.
                </div>
              )}
              <div className="space-y-2">
                {settings.accessNotifications.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{item.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{item.description}</div>
                        {(item.deviceModel || item.deviceLogin) && (
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                            {item.deviceModel && (
                              <span className="rounded-md border bg-muted/30 px-2 py-1">
                                {item.deviceModel}
                              </span>
                            )}
                            {item.deviceLogin && (
                              <span className="rounded-md border bg-muted/30 px-2 py-1">
                                {item.deviceLogin}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="mt-2 text-[10px] text-muted-foreground">
                          {new Date(item.date).toLocaleString("uz-UZ")}
                        </div>
                      </div>
                      {item.status === "pending" ? (
                        <Button
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={() => approveAccessRequest(item.id)}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Tasdiqlash
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                          <Database className="h-3.5 w-3.5" />
                          Tasdiqlangan
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 items-center gap-1 rounded-md border bg-card px-2 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <Languages className="h-3.5 w-3.5" />
              {currentLang}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {langs.map((lang) => (
              <DropdownMenuItem
                key={lang.value}
                onClick={() => updateSettings({ lang: lang.value })}
                className={settings.lang === lang.value ? "font-bold text-primary" : ""}
              >
                {lang.label === "UZB"
                  ? "UZB lotin"
                  : lang.label === "ЎЗБ"
                    ? "UZB кирил"
                    : lang.label === "RUS"
                      ? "Русский"
                      : "English"}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Link
          to="/sozlamalar"
          className="flex h-8 w-8 items-center justify-center rounded-md border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          activeProps={{
            className:
              "flex h-8 w-8 items-center justify-center rounded-md border bg-primary text-primary-foreground",
          }}
          aria-label="Profil"
          title="Profil"
        >
          <UserRound className="h-3.5 w-3.5" />
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="flex h-8 w-8 items-center justify-center rounded-md border bg-card text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
          aria-label="Chiqish"
          title="Chiqish"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}
