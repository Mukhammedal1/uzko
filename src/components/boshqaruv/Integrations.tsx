import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Plug,
  Bot,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Users,
  Save,
  CheckCircle2,
  Link2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useApp } from "@/lib/app-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { findAdminChatByPhone, getBotInfo, sendTelegramMessage } from "@/lib/telegram";
import { ADMIN_MENU_KEYBOARD } from "@/lib/bot/adminBotMenu";

type IntegrationId = "telegram-bot";

const INTEGRATIONS: {
  id: IntegrationId;
  icon: typeof Bot;
  title: string;
  description: string;
}[] = [
  {
    id: "telegram-bot",
    icon: Bot,
    title: "Telegram bot",
    description: "Admin va mijozlar uchun alohida Telegram botlarni ulang va sozlang",
  },
];

function StatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        enabled ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground",
      )}
    >
      {enabled && <CheckCircle2 className="h-3 w-3" />}
      {enabled ? "Ulangan" : "Ulanmagan"}
    </span>
  );
}

export function Integrations() {
  const [openIntegration, setOpenIntegration] = React.useState<IntegrationId | null>(null);

  if (openIntegration === "telegram-bot") {
    return <TelegramBotIntegration onBack={() => setOpenIntegration(null)} />;
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Plug className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-bold">Integratsiya</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {INTEGRATIONS.map((integration) => {
          const Icon = integration.icon;
          return (
            <TelegramSummaryCard
              key={integration.id}
              icon={Icon}
              title={integration.title}
              description={integration.description}
              onClick={() => setOpenIntegration(integration.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function TelegramSummaryCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: typeof Bot;
  title: string;
  description: string;
  onClick: () => void;
}) {
  const { settings } = useApp();
  const anyEnabled = settings.telegramBot.adminEnabled || settings.telegramBot.customerEnabled;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-4 rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40"
    >
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="font-semibold">{title}</div>
          <StatusBadge enabled={anyEnabled} />
        </div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">{description}</div>
      </div>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
    </button>
  );
}

type BotAudience = "admin" | "customer";

const AUDIENCE_TABS: { id: BotAudience; icon: typeof ShieldCheck; label: string }[] = [
  { id: "admin", icon: ShieldCheck, label: "Admin uchun" },
  { id: "customer", icon: Users, label: "Mijozlar uchun" },
];

function TelegramBotIntegration({ onBack }: { onBack: () => void }) {
  const { settings, updateSettings } = useApp();
  const [audience, setAudience] = React.useState<BotAudience>("admin");
  const [draft, setDraft] = React.useState(settings.telegramBot);
  const [connecting, setConnecting] = React.useState(false);
  const [connectError, setConnectError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setDraft(settings.telegramBot);
  }, [settings.telegramBot]);

  const patch = (p: Partial<typeof draft>) => setDraft((current) => ({ ...current, ...p }));

  const save = () => {
    updateSettings({ telegramBot: draft });
    toast.success("Telegram bot sozlamalari saqlandi");
  };

  const handleConnect = async () => {
    setConnecting(true);
    setConnectError(null);
    try {
      const token = draft.adminToken.trim();
      const info = await getBotInfo(token);
      if (!info.ok) {
        setConnectError("Bot tokeni noto'g'ri yoki bot topilmadi. Tokenni qayta tekshiring.");
        return;
      }
      const found = await findAdminChatByPhone(token, draft.adminPhone);
      if (!found.ok) {
        setConnectError(found.description);
        return;
      }
      await sendTelegramMessage(
        token,
        found.chatId,
        "✅ UZKO admin bot muvaffaqiyatli ulandi. Endi kunlik sotuvlar shu yerga real vaqtda kelib turadi. Quyidagi tugmalardan foydalaning:",
        ADMIN_MENU_KEYBOARD,
      );
      const next = {
        ...draft,
        adminEnabled: true,
        adminChatId: String(found.chatId),
        adminChatName: found.name,
      };
      setDraft(next);
      updateSettings({ telegramBot: next });
      toast.success(
        found.approximate
          ? "Ulandi (taxminiy) — kontakt ulashilmagan bo'lsa aniqlik uchun qayta ulashing"
          : "Admin bot muvaffaqiyatli ulandi!",
      );
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold">Telegram bot</h2>
        </div>
        <Button onClick={save} className="gap-2">
          <Save className="h-4 w-4" /> Saqlash
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {AUDIENCE_TABS.map((tabItem) => {
          const Icon = tabItem.icon;
          const active = audience === tabItem.id;
          return (
            <Button
              key={tabItem.id}
              variant={active ? "default" : "outline"}
              size="sm"
              onClick={() => setAudience(tabItem.id)}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              {tabItem.label}
            </Button>
          );
        })}
      </div>

      {audience === "admin" ? (
        <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5">
            <div>
              <div className="text-sm font-medium">Admin boti yoqilgan</div>
              <div className="text-xs text-muted-foreground">
                Yoqilganda muhim bildirishnomalar (kassa yopilishi, kamomat, qarzdorlik va h.k.)
                admin botiga yuboriladi
              </div>
            </div>
            <Switch
              checked={draft.adminEnabled}
              onCheckedChange={(v) => patch({ adminEnabled: v })}
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Bot tokeni</Label>
            <Input
              value={draft.adminToken}
              onChange={(e) => patch({ adminToken: e.target.value })}
              placeholder="Masalan: 123456789:AAExampleTokenHere"
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">
              Admin telefon raqami
            </Label>
            <div className="flex gap-2">
              <Input
                value={draft.adminPhone}
                onChange={(e) => patch({ adminPhone: e.target.value })}
                placeholder="Masalan: +998901234567"
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                className="gap-2 whitespace-nowrap"
                disabled={connecting || !draft.adminToken.trim() || !draft.adminPhone.trim()}
                onClick={handleConnect}
              >
                {connecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                Ulash
              </Button>
            </div>
          </div>

          {draft.adminChatId ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span>
                Ulandi: <b>{draft.adminChatName || "Admin"}</b> (chat ID: {draft.adminChatId})
              </span>
            </div>
          ) : connectError ? (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{connectError}</span>
            </div>
          ) : null}

          <div className="space-y-1.5 rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
            <div className="font-medium text-foreground">Ulash tartibi:</div>
            <div>1. BotFather orqali bot yarating va tokenni yuqoriga kiriting.</div>
            <div>2. Telegramda botni oching va <b>/start</b> yozing.</div>
            <div>
              3. 📎 (qog'oz qisqich) → Kontakt → "O'zimni ulashish" orqali kontaktingizni botga
              yuboring.
            </div>
            <div>4. Admin telefon raqamingizni yuqoriga kiriting va "Ulash" tugmasini bosing.</div>
          </div>

          <p className="text-xs text-muted-foreground">
            Nega chat ID emas, telefon raqam? Telegram bot API xabarni faqat sonli{" "}
            <b>chat ID</b> orqali yubora oladi — telefon raqamning o'zi bilan to'g'ridan-to'g'ri
            xabar yuborib bo'lmaydi. Shuning uchun tizim raqamingizni kontakt orqali chat ID'ga
            avtomatik moslaydi — bu qo'lda ID qidirishdan ham tezroq, ham xatoga yo'l qo'ymaydi.
          </p>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5">
            <div>
              <div className="text-sm font-medium">Mijozlar boti yoqilgan</div>
              <div className="text-xs text-muted-foreground">
                Yoqilganda nasiya mijozlari va agentlarga cheklar, qarz eslatmalari shu bot orqali
                yuboriladi
              </div>
            </div>
            <Switch
              checked={draft.customerEnabled}
              onCheckedChange={(v) => patch({ customerEnabled: v })}
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Bot tokeni</Label>
            <Input
              value={draft.customerToken}
              onChange={(e) => patch({ customerToken: e.target.value })}
              placeholder="Masalan: 987654321:BBExampleTokenHere"
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">
              Xush kelibsiz xabari
            </Label>
            <Textarea
              rows={3}
              value={draft.customerWelcomeMessage}
              onChange={(e) => patch({ customerWelcomeMessage: e.target.value })}
              placeholder="Mijoz botga /start yozganda ko'radigan xabar"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Mijozlar va agentlar bo'limidagi "Bot" tugmasi shu bot orqali ulanadi.
          </p>
        </div>
      )}
    </div>
  );
}
