import * as React from "react";
import { ArrowLeftRight, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { recordMoneyOperation } from "@/lib/data-actions";
import { formatSom } from "@/lib/mock-data";
import { formatNumberInput, parseNumberInput } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { toast } from "sonner";

type Party = "nasiyachi" | "agent";
type PayMethod = "naqd" | "karta" | "valyuta";
type AgentSource = "kassa" | "boshqa";

const CARD_TYPES = ["HUMO", "UZCARD", "VISA"] as const;
const CURRENCIES = ["USD", "RUB", "EUR"] as const;

type Target = {
  id: string;
  name: string;
  phone?: string;
  botEnabled?: boolean;
};

type Props = {
  party: Party;
  target: Target | null;
  /** Joriy qarz balansi: nasiyachi qarzi yoki bizning agentga qarzimiz. */
  currentBalance: number;
  onClose: () => void;
  onDone: () => void;
};

export function MoneyOperationDialog({ party, target, currentBalance, onClose, onDone }: Props) {
  const { settings } = useApp();
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState<PayMethod>("naqd");
  const [cardType, setCardType] = React.useState<(typeof CARD_TYPES)[number]>("HUMO");
  const [currencyCode, setCurrencyCode] = React.useState<(typeof CURRENCIES)[number]>("USD");
  const [source, setSource] = React.useState<AgentSource>("kassa");
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (target) {
      setAmount("");
      setMethod("naqd");
      setCardType("HUMO");
      setCurrencyCode("USD");
      setSource("kassa");
      setNote("");
    }
  }, [target]);

  if (!target) return null;

  const isNasiyachi = party === "nasiyachi";
  const numericAmount = Math.max(0, parseNumberInput(amount));
  // Nasiyachi: qarz so'ndirish → qarzi kamayadi. Agent: to'lov → bizning qarzimiz kamayadi.
  const nextBalance = Math.max(0, currentBalance - numericAmount);
  const balanceLabel = isNasiyachi ? "Nasiyachi qarzi" : "Bizning qarzimiz";
  const title = isNasiyachi ? "Qarz so'ndirish" : "Agentga to'lov";
  const canSubmit = numericAmount > 0;

  const submit = () => {
    if (!canSubmit) {
      toast.error("Summani kiriting");
      return;
    }
    recordMoneyOperation({
      party,
      partyId: target.id,
      partyName: target.name,
      partyPhone: target.phone,
      botEnabled: target.botEnabled,
      amount: numericAmount,
      method,
      cardType: method === "karta" ? cardType : undefined,
      currencyCode: method === "valyuta" ? currencyCode : undefined,
      source: isNasiyachi ? undefined : source,
      note,
      cashier: settings.username || "Admin",
    });
    toast.success(`${title}: ${formatSom(numericAmount)}`, {
      description: `${target.name} · ${balanceLabel.toLowerCase()}: ${formatSom(nextBalance)}`,
    });
    onDone();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            {title} — {target.name}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/20 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{balanceLabel}</span>
            <span className="font-semibold">{formatSom(currentBalance)}</span>
          </div>
          {numericAmount > 0 && (
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">Operatsiyadan keyin</span>
              <span className="font-bold text-primary">{formatSom(nextBalance)}</span>
            </div>
          )}
        </div>

        <div>
          <Label className="mb-1 block text-xs">Summa *</Label>
          <Input
            value={amount}
            onChange={(e) => setAmount(formatNumberInput(e.target.value))}
            inputMode="decimal"
            placeholder="0"
            autoFocus
          />
        </div>

        {!isNasiyachi && (
          <div>
            <Label className="mb-1 block text-xs">Pul manbasi</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant={source === "kassa" ? "default" : "outline"}
                onClick={() => setSource("kassa")}
                className="h-8"
              >
                Kassadan
              </Button>
              <Button
                type="button"
                size="sm"
                variant={source === "boshqa" ? "default" : "outline"}
                onClick={() => setSource("boshqa")}
                className="h-8"
              >
                Ixtiyoriy manba
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {source === "kassa"
                ? "Summa kassadan chiqim sifatida yoziladi (Agentlarga to'lov)."
                : "Kassaga tegilmaydi — to'lov tashqi manbadan qilingan deb belgilanadi."}
            </p>
          </div>
        )}

        <div>
          <Label className="mb-1 block text-xs">To'lov usuli</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["naqd", "karta", "valyuta"] as PayMethod[]).map((m) => (
              <Button
                key={m}
                type="button"
                size="sm"
                variant={method === m ? "default" : "outline"}
                onClick={() => setMethod(m)}
                className="h-8 capitalize"
              >
                {m}
              </Button>
            ))}
          </div>
        </div>

        {method === "karta" && (
          <div>
            <Label className="mb-1 block text-xs">Karta turi</Label>
            <Select
              value={cardType}
              onValueChange={(v) => setCardType(v as (typeof CARD_TYPES)[number])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CARD_TYPES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {method === "valyuta" && (
          <div>
            <Label className="mb-1 block text-xs">Valyuta</Label>
            <Select
              value={currencyCode}
              onValueChange={(v) => setCurrencyCode(v as (typeof CURRENCIES)[number])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label className="mb-1 block text-xs">Izoh</Label>
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ixtiyoriy izoh"
          />
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            Bekor
          </Button>
          <Button onClick={submit} disabled={!canSubmit} className="gap-2">
            <Banknote className="h-4 w-4" />
            {isNasiyachi ? "Qarzni so'ndirish" : "To'lovni tasdiqlash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
