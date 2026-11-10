import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, RefreshCw } from "lucide-react";
import { KursYangilash } from "@/components/shared/KursYangilash";
import { MOCK_PRODUCTS, MOCK_RATES, formatSom, costInSom } from "@/lib/mock-data";
import type { Product, Currency } from "@/lib/mock-data";
import { toast } from "sonner";

const TABS = [
  { id: "tovar", label: "Tovar narxni yangilash" },
  { id: "kurs", label: "Kurs yangilash" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export function NarxYangilash() {
  const [tab, setTab] = React.useState<Tab>("tovar");

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2 border-b bg-card p-3">
        {TABS.map((t) => (
          <Button
            key={t.id}
            variant={tab === t.id ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {tab === "tovar" ? <TovarNarx /> : <KursYangilash />}
      </div>
    </div>
  );
}

function TovarNarx() {
  const [query, setQuery] = React.useState("");
  const [picked, setPicked] = React.useState<Product | null>(null);

  const matches = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return MOCK_PRODUCTS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.barcode.includes(q),
    ).slice(0, 8);
  }, [query]);

  const [newPrice, setNewPrice] = React.useState("");
  const [percent, setPercent] = React.useState("");
  const [currency, setCurrency] = React.useState<Currency>("UZS");

  React.useEffect(() => {
    if (picked) {
      setNewPrice(String(picked.price));
      setPercent("");
      setCurrency("UZS");
    }
  }, [picked]);

  // foiz kiritilsa — tan narx ustiga foiz qo'shib avtomatik narx hisoblanadi.
  // foiz bo'sh bo'lsa — qo'lda kiritilgan narx ishlatiladi.
  const computedPrice = React.useMemo(() => {
    if (!picked) return 0;
    const pct = parseFloat(percent);
    if (!isNaN(pct) && pct > 0) {
      return Math.round(costInSom(picked) * (1 + pct / 100));
    }
    const v = parseFloat(newPrice) || 0;
    return Math.round(v * (MOCK_RATES[currency] ?? 1));
  }, [picked, newPrice, percent, currency]);

  const handleSave = () => {
    if (!picked) return;
    picked.price = computedPrice;
    toast.success("Narx yangilandi", {
      description: `${picked.name}: ${formatSom(computedPrice)}`,
    });
    setPicked({ ...picked });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPicked(null);
          }}
          placeholder="Tovar nomi yoki shtrix kod..."
          className="h-10 pl-9"
        />
        {!picked && matches.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md border bg-card shadow-lg">
            {matches.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPicked(p);
                  setQuery(p.name);
                }}
                className="flex w-full items-center justify-between border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted"
              >
                <span>{p.name}</span>
                <span className="text-xs text-muted-foreground">{formatSom(p.price)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {picked && (
        <div className="space-y-4 rounded-md border bg-card p-4">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Info label="Joriy narx" value={formatSom(picked.price)} />
            <Info label="Tan narx" value={`${picked.costPrice} ${picked.costCurrency}`} />
            <Info label="Tan (so'm)" value={formatSom(costInSom(picked))} />
          </div>

          <div className="grid grid-cols-[1fr_120px_120px] gap-2">
            <div>
              <Label className="mb-1 block text-xs">Yangi narx (qo'lda)</Label>
              <Input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                disabled={!!parseFloat(percent)}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Valyuta</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UZS">UZS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="RUB">RUB</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Foiz (%) — ixtiyoriy</Label>
              <Input
                type="number"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                placeholder="—"
              />
            </div>
          </div>
          <p className="-mt-2 text-[11px] text-muted-foreground">
            Foiz kiritilsa — tan narx ustiga avtomatik qo'shiladi va qo'lda kiritilgan narx hisobga
            olinmaydi.
          </p>

          <div className="flex items-center justify-between rounded-md bg-primary/5 px-4 py-3">
            <span className="text-sm text-muted-foreground">Yangi narx (so'm):</span>
            <span className="text-xl font-bold text-primary tabular-nums">
              {formatSom(computedPrice)}
            </span>
          </div>

          <Button onClick={handleSave} className="w-full gap-2">
            <RefreshCw className="h-4 w-4" /> Narxni yangilash
          </Button>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
