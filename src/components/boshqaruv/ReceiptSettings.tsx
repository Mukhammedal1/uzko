import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Check, ReceiptText, QrCode, Save } from "lucide-react";
import { useApp, type ReceiptSettings as ReceiptSettingsType } from "@/lib/app-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary/5 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {active && <Check className="h-3.5 w-3.5" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function ReceiptSettings() {
  const { settings, updateSettings } = useApp();
  const [draft, setDraft] = React.useState<ReceiptSettingsType>(settings.receiptSettings);

  React.useEffect(() => {
    setDraft(settings.receiptSettings);
  }, [settings.receiptSettings]);

  const patch = (p: Partial<ReceiptSettingsType>) => setDraft((current) => ({ ...current, ...p }));

  const save = () => {
    updateSettings({ receiptSettings: draft });
    toast.success("Chek sozlamalari saqlandi");
  };

  const fontSizeClass =
    draft.fontSize === "small" ? "text-[10px]" : draft.fontSize === "large" ? "text-sm" : "text-xs";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ReceiptText className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold">Chek ko'rinishi</h2>
        </div>
        <Button onClick={save} className="gap-2">
          <Save className="h-4 w-4" /> Saqlash
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">
              Do'kon / brand nomi
            </Label>
            <Input
              value={draft.storeName}
              onChange={(e) => patch({ storeName: e.target.value })}
              placeholder="Masalan: UZKO SAVDO"
            />
          </div>

          <ToggleRow
            label="Logotip"
            checked={draft.showLogo}
            onChange={(v) => patch({ showLogo: v })}
          />

          <ToggleRow
            label="Manzil"
            checked={draft.showAddress}
            onChange={(v) => patch({ showAddress: v })}
          />
          {draft.showAddress && (
            <Input
              value={draft.address}
              onChange={(e) => patch({ address: e.target.value })}
              placeholder="Do'kon manzili"
            />
          )}

          <ToggleRow
            label="Telefon raqam"
            checked={draft.showPhone}
            onChange={(v) => patch({ showPhone: v })}
          />
          {draft.showPhone && (
            <Input
              value={draft.phone}
              onChange={(e) => patch({ phone: e.target.value })}
              placeholder="Masalan: +998 90 123 45 67"
            />
          )}

          <ToggleRow
            label="Kassir ismi"
            checked={draft.showCashier}
            onChange={(v) => patch({ showCashier: v })}
          />
          <ToggleRow label="QR-kod" checked={draft.showQr} onChange={(v) => patch({ showQr: v })} />
          <ToggleRow
            label="Tovar kodi chekda ko'rinsin"
            checked={draft.showProductCode}
            onChange={(v) => patch({ showProductCode: v })}
          />

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Pastki matn</Label>
            <Textarea
              rows={3}
              value={draft.extraNote}
              onChange={(e) => patch({ extraNote: e.target.value })}
              placeholder="Chek pastida chiqadigan izoh..."
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Chek kengligi</Label>
            <SegmentedControl
              value={draft.width}
              onChange={(v) => patch({ width: v })}
              options={[
                { value: "58", label: "58mm" },
                { value: "80", label: "80mm" },
              ]}
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Shrift o'lchami</Label>
            <SegmentedControl
              value={draft.fontSize}
              onChange={(v) => patch({ fontSize: v })}
              options={[
                { value: "small", label: "Kichik" },
                { value: "normal", label: "O'rta" },
                { value: "large", label: "Katta" },
              ]}
            />
          </div>
        </div>

        <div
          className={cn(
            "mx-auto w-full rounded-xl border bg-white p-4 font-mono text-black shadow-sm",
            fontSizeClass,
            draft.width === "58" ? "max-w-[220px]" : "max-w-[300px]",
          )}
        >
          <div className="text-center">
            {draft.showLogo && (
              <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded bg-black/80 text-[9px] font-bold text-white">
                LOGO
              </div>
            )}
            <div className="font-bold">{draft.storeName || "UZKO SAVDO"}</div>
            {draft.showAddress && draft.address && <div className="mt-0.5">{draft.address}</div>}
            {draft.showPhone && draft.phone && <div className="mt-0.5">Tel: {draft.phone}</div>}
            {draft.social && <div>{draft.social}</div>}
            {draft.showCashier && <div className="mt-0.5">Kassir: Admin</div>}
            <div className="my-2 border-b border-dashed border-black/40" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Mahsulot A</span>
              <span>25 000 so'm</span>
            </div>
            {draft.showProductCode && <div className="text-black/70">Kod: A-001</div>}
            <div className="flex justify-between">
              <span>Mahsulot B</span>
              <span>12 000 so'm</span>
            </div>
            {draft.showProductCode && <div className="text-black/70">Kod: B-002</div>}
          </div>
          <div className="my-2 border-b border-dashed border-black/40" />
          <div className="flex justify-between font-bold">
            <span>JAMI:</span>
            <span>37 000 so'm</span>
          </div>
          {draft.showQr && (
            <div className="mt-2 flex justify-center">
              <QrCode className="h-12 w-12" />
            </div>
          )}
          {draft.extraNote && (
            <>
              <div className="my-2 border-b border-dashed border-black/40" />
              <div className="whitespace-pre-wrap text-center">{draft.extraNote}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
