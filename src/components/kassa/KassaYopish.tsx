import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Minus,
  Lock,
  AlertCircle,
  Banknote,
  CreditCard,
  DollarSign,
  Send,
} from "lucide-react";
import {
  MOCK_CASH_CLOSES,
  MOCK_RECEIPTS,
  formatSom,
  type Currency,
  type CashClose,
} from "@/lib/mock-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CARD_TYPES = ["Humo", "Uzcard", "Visa"] as const;
const CURRENCIES: Currency[] = ["USD", "EUR", "RUB"];

export function KassaYopish() {
  const expectedTotal = React.useMemo(() => MOCK_RECEIPTS.reduce((s, r) => s + r.total, 0), []);

  const [cash, setCash] = React.useState("");
  const [cards, setCards] = React.useState<{ type: string; amount: string }[]>([
    { type: "Humo", amount: "" },
  ]);
  const [currs, setCurrs] = React.useState<{ code: Currency; amount: string }[]>([
    { code: "USD", amount: "" },
  ]);
  const [shortage, setShortage] = React.useState("");
  const [hasLeft, setHasLeft] = React.useState(false);
  const [left, setLeft] = React.useState("");
  const [note, setNote] = React.useState("");
  const [code, setCode] = React.useState("");
  const optionScrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = optionScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [cards.length, currs.length]);

  const sum = (arr: { amount: string }[]) =>
    arr.reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);

  const total =
    (parseFloat(cash) || 0) +
    sum(cards) +
    sum(currs) +
    (parseFloat(shortage) || 0) +
    (hasLeft ? parseFloat(left) || 0 : 0);

  const balance = total - expectedTotal;
  const balanced = Math.abs(balance) < 0.5;
  const canClose = balanced && code.length > 0;

  const close = () => {
    if (!canClose) {
      toast.error("Balans 0 ga teng emas yoki tasdiqlash kodi yo'q");
      return;
    }
    const c: CashClose = {
      id: `CL-${Date.now()}`,
      date: new Date().toISOString(),
      cashier: "Joriy foydalanuvchi",
      cash: parseFloat(cash) || 0,
      cards: cards.map((x) => ({ type: x.type, amount: parseFloat(x.amount) || 0 })),
      currencies: currs.map((x) => ({ code: x.code, amount: parseFloat(x.amount) || 0 })),
      shortage: parseFloat(shortage) || 0,
      leftInRegister: hasLeft ? parseFloat(left) || 0 : 0,
      note,
    };
    MOCK_CASH_CLOSES.push(c);
    toast.success("Kassa yopildi");
    setCash("");
    setCards([{ type: "Humo", amount: "" }]);
    setCurrs([{ code: "USD", amount: "" }]);
    setShortage("");
    setHasLeft(false);
    setLeft("");
    setNote("");
    setCode("");
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden p-2">
      <div className="grid h-full min-h-0 w-full grid-rows-[auto_1fr] gap-2">
        {/* Header KPI */}
        <div className="grid grid-cols-3 gap-2">
          <KpiCard label="Kassada bo'lishi kerak" value={formatSom(expectedTotal)} accent />
          <KpiCard label="Kiritilgan jami" value={formatSom(total)} />
          <KpiCard
            label="Farq (balans)"
            value={formatSom(Math.abs(balance))}
            status={balanced ? "ok" : "error"}
            prefix={balance >= 0 ? "+" : "−"}
          />
        </div>

        <div ref={optionScrollRef} className="min-h-0 overflow-y-auto overflow-x-hidden pr-1">
          <div className="grid min-h-full grid-cols-2 gap-2">
            {/* Sol ustun */}
            <div className="grid min-h-0 content-start gap-2">
              {/* Naqd */}
              <FieldCard icon={Banknote} title="Naqd pul">
                <Input
                  type="number"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                  placeholder="0"
                  className="h-9 text-base font-semibold"
                />
              </FieldCard>

              {/* Kartalar */}
              <FieldCard
                icon={CreditCard}
                title="Kartalar (Humo / Uzcard / Visa)"
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1"
                    onClick={() =>
                      setCards((current) => [...current, { type: "Humo", amount: "" }])
                    }
                  >
                    <Plus className="h-3.5 w-3.5" /> Qo'shish
                  </Button>
                }
              >
                <div className="space-y-2">
                  {cards.map((it, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Select
                        value={it.type}
                        onValueChange={(v) =>
                          setCards(cards.map((x, idx) => (idx === i ? { ...x, type: v } : x)))
                        }
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CARD_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Summa"
                        value={it.amount}
                        onChange={(e) =>
                          setCards(
                            cards.map((x, idx) =>
                              idx === i ? { ...x, amount: e.target.value } : x,
                            ),
                          )
                        }
                        className="flex-1"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setCards(cards.filter((_, idx) => idx !== i))}
                        disabled={cards.length <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </FieldCard>

              {/* Valyuta */}
              <FieldCard
                icon={DollarSign}
                title="Valyuta (USD / EUR / RUB)"
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1"
                    onClick={() => setCurrs((current) => [...current, { code: "USD", amount: "" }])}
                  >
                    <Plus className="h-3.5 w-3.5" /> Qo'shish
                  </Button>
                }
              >
                <div className="space-y-2">
                  {currs.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Select
                        value={c.code}
                        onValueChange={(v) =>
                          setCurrs(
                            currs.map((x, idx) => (idx === i ? { ...x, code: v as Currency } : x)),
                          )
                        }
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((cc) => (
                            <SelectItem key={cc} value={cc}>
                              {cc}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Summa"
                        value={c.amount}
                        onChange={(e) =>
                          setCurrs(
                            currs.map((x, idx) =>
                              idx === i ? { ...x, amount: e.target.value } : x,
                            ),
                          )
                        }
                        className="flex-1"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setCurrs(currs.filter((_, idx) => idx !== i))}
                        disabled={currs.length <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </FieldCard>
            </div>

            {/* O'ng ustun */}
            <div className="grid min-h-0 content-start gap-2">
              {/* Kamomat */}
              <FieldCard icon={AlertCircle} title="Kamomat summa (so'm)">
                <Input
                  type="number"
                  value={shortage}
                  onChange={(e) => setShortage(e.target.value)}
                  placeholder="0"
                />
              </FieldCard>

              {/* Kassada qoldi */}
              <div
                className={cn(
                  "rounded-xl border p-2.5 transition-colors",
                  hasLeft ? "border-primary/30 bg-primary/5" : "bg-card",
                )}
              >
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Kassada qoldi (ixtiyoriy)</Label>
                  <Button
                    size="sm"
                    variant={hasLeft ? "default" : "outline"}
                    onClick={() => setHasLeft((v) => !v)}
                  >
                    {hasLeft ? "Qo'shilgan" : "Qo'shish"}
                  </Button>
                </div>
                {hasLeft && (
                  <Input
                    className="mt-2 h-9"
                    type="number"
                    value={left}
                    onChange={(e) => setLeft(e.target.value)}
                    placeholder="Qoldiq summa (so'm)"
                  />
                )}
              </div>

              {/* Izoh */}
              <FieldCard title="Izoh">
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Ixtiyoriy izoh..."
                />
              </FieldCard>

              {/* Tasdiqlash kodi */}
              <div className="rounded-lg border bg-card p-2.5">
                <div className="mb-1.5 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-semibold">Tasdiqlash kod</Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && canClose && close()}
                    placeholder="••••"
                    className="h-9 flex-1"
                  />
                  <Button
                    type="button"
                    onClick={close}
                    className="h-9 shrink-0 gap-2 px-3"
                    disabled={!code.trim()}
                  >
                    <Send className="h-4 w-4" />
                    Tasdiqlash
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  accent,
  status,
  prefix,
}: {
  label: string;
  value: string;
  accent?: boolean;
  status?: "ok" | "error";
  prefix?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-2",
        accent ? "border-primary/30 bg-primary/5" : "bg-card",
        status === "ok" ? "border-success/40 bg-success/5" : "",
        status === "error" ? "border-destructive/40 bg-destructive/5" : "",
      )}
    >
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-base font-bold tabular-nums",
          accent ? "text-primary" : "",
          status === "ok" ? "text-success" : "",
          status === "error" ? "text-destructive" : "",
        )}
      >
        {prefix}
        {value}
      </div>
    </div>
  );
}

function FieldCard({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-lg border bg-card p-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <Label className="text-sm font-semibold">{title}</Label>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
