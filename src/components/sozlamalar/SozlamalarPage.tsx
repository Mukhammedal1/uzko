import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Palette, Globe, Sun, Moon, Check, ShieldCheck, Lock } from "lucide-react";
import { useApp, type Lang } from "@/lib/app-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "user", icon: User, key: "user_settings" },
  { id: "interface", icon: Palette, key: "interface_settings" },
  { id: "language", icon: Globe, key: "language" },
] as const;

type Section = (typeof SECTIONS)[number]["id"];

const LANGS: { value: Lang; labelKey: string; flag: string }[] = [
  { value: "uz", labelKey: "uz_latin", flag: "🇺🇿" },
  { value: "uz_cyr", labelKey: "uz_cyrillic", flag: "🇺🇿" },
  { value: "ru", labelKey: "russian", flag: "🇷🇺" },
  { value: "en", labelKey: "english", flag: "🇬🇧" },
];

export function SozlamalarPage() {
  const { t } = useApp();
  const [section, setSection] = React.useState<Section>("user");

  return (
    <div className="settings-shell flex h-full min-h-0">
      {/* Sidebar */}
      <aside className="settings-sidebar flex w-56 flex-shrink-0 flex-col border-r bg-card">
        <div className="settings-sidebar-title border-b p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Profil
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
                <span className="settings-nav-label whitespace-nowrap">{t(s.key)}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <main className="settings-content flex min-h-0 flex-1 flex-col overflow-auto bg-muted/20 p-6">
        {section === "user" && <UserSection />}
        {section === "interface" && <InterfaceSection />}
        {section === "language" && <LanguageSection />}
      </main>
    </div>
  );
}

// ─── User Section ────────────────────────────────────────────────────────────

function UserSection() {
  const { settings, updateSettings, t } = useApp();
  const [name, setName] = React.useState(settings.username);
  const [oldCode, setOldCode] = React.useState("");
  const [newCode, setNewCode] = React.useState("");
  const [newCode2, setNewCode2] = React.useState("");

  const saveName = () => {
    if (!name.trim()) return;
    updateSettings({ username: name.trim() });
    toast.success(t("name_changed"));
  };

  const saveCode = () => {
    if (oldCode !== settings.confirmCode) {
      toast.error("Eski kod noto'g'ri");
      return;
    }
    if (newCode.length < 4) {
      toast.error("Yangi kod kamida 4 ta raqam");
      return;
    }
    if (newCode !== newCode2) {
      toast.error("Yangi kodlar mos emas");
      return;
    }
    updateSettings({ confirmCode: newCode });
    toast.success(t("code_changed"));
    setOldCode("");
    setNewCode("");
    setNewCode2("");
  };

  return (
    <div className="w-full space-y-6">
      <SectionTitle icon={User} title={t("user_settings")} />

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Ism */}
        <Card>
          <CardHeader title={t("username")} />
          <div className="flex gap-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
            <Button onClick={saveName} className="gap-2">
              <Check className="h-4 w-4" /> {t("save")}
            </Button>
          </div>
        </Card>

        {/* Tasdiqlash kodi */}
        <Card>
          <CardHeader title={t("confirm_code")} icon={Lock} />
          <div className="grid gap-3 lg:grid-cols-3">
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Eski kod</Label>
              <Input
                type="password"
                value={oldCode}
                onChange={(e) => setOldCode(e.target.value)}
                placeholder="••••"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Yangi kod</Label>
              <Input
                type="password"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="••••"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                Yangi kodni tasdiqlang
              </Label>
              <Input
                type="password"
                value={newCode2}
                onChange={(e) => setNewCode2(e.target.value)}
                placeholder="••••"
              />
            </div>
            <Button onClick={saveCode} className="gap-2 lg:col-span-3">
              <ShieldCheck className="h-4 w-4" /> Kodni o'zgartirish
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Interface Section ───────────────────────────────────────────────────────

function InterfaceSection() {
  const { settings, updateSettings, t } = useApp();

  const isDark = settings.theme === "dark";

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <SectionTitle icon={Palette} title={t("interface_settings")} />

      <Card>
        <CardHeader title={t("theme")} />
        <div className="grid grid-cols-2 gap-3">
          <ThemeCard
            label={t("light_mode")}
            icon={Sun}
            active={!isDark}
            onClick={() => updateSettings({ theme: "light" })}
            preview="bg-white border-2"
            previewBars={["bg-slate-200", "bg-slate-100", "bg-slate-50"]}
          />
          <ThemeCard
            label={t("dark_mode")}
            icon={Moon}
            active={isDark}
            onClick={() => updateSettings({ theme: "dark" })}
            preview="bg-slate-900 border-2"
            previewBars={["bg-slate-700", "bg-slate-800", "bg-slate-600"]}
          />
        </div>
      </Card>
    </div>
  );
}

function ThemeCard({
  label,
  icon: Icon,
  active,
  onClick,
  preview,
  previewBars,
}: {
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
  preview: string;
  previewBars: string[];
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all",
        active ? "border-primary shadow-md" : "border-border hover:border-primary/40",
      )}
    >
      {/* Mini preview */}
      <div className={cn("flex h-24 flex-col gap-2 p-3", preview)}>
        <div className={cn("h-3 w-2/3 rounded", previewBars[0])} />
        <div className={cn("h-2 w-full rounded", previewBars[1])} />
        <div className={cn("h-2 w-4/5 rounded", previewBars[2])} />
      </div>
      <div
        className={cn("flex items-center gap-2 border-t px-3 py-2", active ? "bg-primary/5" : "")}
      >
        <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
        <span className={cn("text-sm font-medium", active ? "text-primary" : "")}>{label}</span>
        {active && <Check className="ml-auto h-4 w-4 text-primary" />}
      </div>
    </button>
  );
}


function LanguageSection() {
  const { settings, updateSettings, t } = useApp();

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <SectionTitle icon={Globe} title={t("language")} />

      <Card>
        <div className="grid gap-2">
          {LANGS.map((lang) => {
            const active = settings.lang === lang.value;
            return (
              <button
                key={lang.value}
                onClick={() => updateSettings({ lang: lang.value })}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                <span className="text-2xl">{lang.flag}</span>
                <span className={cn("flex-1 text-sm font-medium", active && "text-primary")}>
                  {t(lang.labelKey)}
                </span>
                {active && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SectionTitle({
  icon: Icon,
  title,
  noMargin,
}: {
  icon: React.ElementType;
  title: string;
  noMargin?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", noMargin ? "" : "mb-2")}>
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="text-lg font-bold">{title}</h2>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border bg-card p-5 shadow-sm">{children}</div>;
}

function CardHeader({ title, icon: Icon }: { title: string; icon?: React.ElementType }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      <span className="font-semibold text-sm">{title}</span>
    </div>
  );
}
