import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Landmark,
  Wallet,
  ArrowRightLeft,
  PlusCircle,
  History,
  Settings2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import {
  MOCK_KASSALAR,
  MOCK_KASSA_TRANSACTIONS,
  MOCK_CASH_CLOSES,
  MOCK_EMPLOYEES,
  kassaBalance,
  formatSom,
  type Kassa,
} from "@/lib/mock-data";

export function Kassalar() {
  const { settings } = useApp();
  const [, force] = React.useState(0);
  const refresh = () => force((n) => n + 1);

  const [newKassaOpen, setNewKassaOpen] = React.useState(false);
  const [newKassaName, setNewKassaName] = React.useState("");
  const [newKassaStart, setNewKassaStart] = React.useState("");
  const [newKassaLeftover, setNewKassaLeftover] = React.useState("");
  const [newKassaAllowSelf, setNewKassaAllowSelf] = React.useState(false);

  const [settingsFor, setSettingsFor] = React.useState<Kassa | null>(null);
  const [settingsLeftover, setSettingsLeftover] = React.useState("");
  const [settingsAllowSelf, setSettingsAllowSelf] = React.useState(false);

  const [transferFrom, setTransferFrom] = React.useState<Kassa | null>(null);
  const [transferAmount, setTransferAmount] = React.useState("");
  const [transferNote, setTransferNote] = React.useState("");

  const [topUpFor, setTopUpFor] = React.useState<Kassa | null>(null);
  const [topUpAmount, setTopUpAmount] = React.useState("");
  const [topUpNote, setTopUpNote] = React.useState("");

  const asosiy = MOCK_KASSALAR.find((k) => k.kind === "asosiy")!;
  const qoshimchalar = MOCK_KASSALAR.filter((k) => k.kind === "qoshimcha");

  const createKassa = () => {
    const name = newKassaName.trim();
    if (!name) {
      toast.error("Kassa nomini kiriting");
      return;
    }
    const id = `kassa-${Date.now()}`;
    MOCK_KASSALAR.push({
      id,
      name,
      kind: "qoshimcha",
      createdAt: new Date().toISOString(),
      defaultLeftover: parseFloat(newKassaLeftover) || 0,
      allowSelfLeftover: newKassaAllowSelf,
    });
    const start = parseFloat(newKassaStart) || 0;
    if (start > 0) {
      MOCK_KASSA_TRANSACTIONS.push({
        id: `KT-${Date.now()}`,
        kassaId: id,
        date: new Date().toISOString(),
        type: "kirim",
        amount: start,
        note: "Boshlang'ich balans",
        cashier: settings.username,
      });
    }
    toast.success("Qo'shimcha kassa yaratildi");
    setNewKassaOpen(false);
    setNewKassaName("");
    setNewKassaStart("");
    setNewKassaLeftover("");
    setNewKassaAllowSelf(false);
    refresh();
  };

  const openSettings = (k: Kassa) => {
    setSettingsFor(k);
    setSettingsLeftover(String(k.defaultLeftover ?? 0));
    setSettingsAllowSelf(!!k.allowSelfLeftover);
  };

  const saveSettings = () => {
    if (!settingsFor) return;
    settingsFor.defaultLeftover = parseFloat(settingsLeftover) || 0;
    settingsFor.allowSelfLeftover = settingsAllowSelf;
    toast.success("Kassa sozlamalari saqlandi");
    setSettingsFor(null);
    refresh();
  };

  const employeesOf = (kassaId: string) =>
    settings.devices
      .filter((d) => d.kassaId === kassaId)
      .map((d) => MOCK_EMPLOYEES.find((e) => e.id === d.employeeId)?.name ?? d.name)
      .filter(Boolean);

  const doTopUp = () => {
    if (!topUpFor) return;
    const amount = parseFloat(topUpAmount) || 0;
    if (amount <= 0) {
      toast.error("Summani kiriting");
      return;
    }
    MOCK_KASSA_TRANSACTIONS.push({
      id: `KT-${Date.now()}`,
      kassaId: topUpFor.id,
      date: new Date().toISOString(),
      type: "kirim",
      amount,
      note: topUpNote.trim() || undefined,
      cashier: settings.username,
    });
    toast.success(`${topUpFor.name} ga kirim qilindi`);
    setTopUpFor(null);
    setTopUpAmount("");
    setTopUpNote("");
    refresh();
  };

  const doTransfer = () => {
    if (!transferFrom) return;
    const amount = parseFloat(transferAmount) || 0;
    const balance = kassaBalance(transferFrom.id);
    if (amount <= 0) {
      toast.error("Summani kiriting");
      return;
    }
    if (amount > balance) {
      toast.error("Summa kassa balansidan katta bo'lishi mumkin emas");
      return;
    }
    const now = new Date().toISOString();
    const txId = `KT-${Date.now()}`;
    MOCK_KASSA_TRANSACTIONS.push({
      id: `${txId}-out`,
      kassaId: transferFrom.id,
      date: now,
      type: "chiqim",
      amount,
      note: transferNote.trim() || "Asosiy kassaga o'tkazma",
      cashier: settings.username,
      counterpartKassaId: asosiy.id,
      counterpartKassaName: asosiy.name,
    });
    MOCK_KASSA_TRANSACTIONS.push({
      id: `${txId}-in`,
      kassaId: asosiy.id,
      date: now,
      type: "kirim",
      amount,
      note: transferNote.trim() || `${transferFrom.name} dan o'tkazma`,
      cashier: settings.username,
      counterpartKassaId: transferFrom.id,
      counterpartKassaName: transferFrom.name,
    });
    toast.success(`${formatSom(amount)} asosiy kassaga o'tkazildi`);
    setTransferFrom(null);
    setTransferAmount("");
    setTransferNote("");
    refresh();
  };

  const history = [...MOCK_KASSA_TRANSACTIONS].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const closes = [...MOCK_CASH_CLOSES]
    .filter((c) => c.kassaId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-3">
      <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto pr-1">
        {/* Asosiy kassa */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Landmark className="h-4 w-4" />
            {asosiy.name}
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-primary">
            {formatSom(kassaBalance(asosiy.id))}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Qo'shimcha kassalardan o'tkazilgan va shu kassadan to'g'ridan-to'g'ri olingan mablag'lar
            yig'indisi
          </div>
        </div>

        {/* Qo'shimcha kassalar */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-muted-foreground">Qo'shimcha kassalar</div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => setNewKassaOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Yangi kassa
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {qoshimchalar.map((k) => {
              const balance = kassaBalance(k.id);
              const employees = employeesOf(k.id);
              return (
                <div key={k.id} className="flex flex-col gap-2 rounded-xl border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                      {k.name}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => openSettings(k)}
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="text-xl font-bold tabular-nums">{formatSom(balance)}</div>
                  <div className="text-xs text-muted-foreground">
                    Qoldiq: {formatSom(k.defaultLeftover ?? 0)}
                    {employees.length > 0 && <> · Xodim: {employees.join(", ")}</>}
                  </div>
                  <div className="mt-1 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1"
                      onClick={() => setTopUpFor(k)}
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Kirim
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 gap-1"
                      disabled={balance <= 0}
                      onClick={() => setTransferFrom(k)}
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                      Asosiyga o'tkazish
                    </Button>
                  </div>
                </div>
              );
            })}
            {qoshimchalar.length === 0 && (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
                Qo'shimcha kassa yo'q. "Yangi kassa" tugmasi orqali qo'shing.
              </div>
            )}
          </div>
        </div>

        {/* Tarix */}
        <div className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b p-3 text-sm font-semibold">
            <History className="h-4 w-4 text-muted-foreground" />
            Kassa harakatlari tarixi
          </div>
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60">
                <tr className="text-xs uppercase text-muted-foreground">
                  <th className="px-3 py-2 text-left">Sana</th>
                  <th className="px-3 py-2 text-left">Kassa</th>
                  <th className="px-3 py-2 text-left">Turi</th>
                  <th className="px-3 py-2 text-right">Summa</th>
                  <th className="px-3 py-2 text-left">Izoh</th>
                  <th className="px-3 py-2 text-left">Kassir</th>
                </tr>
              </thead>
              <tbody>
                {history.map((t) => {
                  const kassa = MOCK_KASSALAR.find((k) => k.id === t.kassaId);
                  return (
                    <tr key={t.id} className="border-t">
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {new Date(t.date).toLocaleString("uz-UZ")}
                      </td>
                      <td className="px-3 py-2 font-medium">{kassa?.name ?? t.kassaId}</td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "rounded-md px-2 py-0.5 text-xs font-semibold",
                            t.type === "kirim"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-destructive/10 text-destructive",
                          )}
                        >
                          {t.type === "kirim" ? "Kirim" : "Chiqim"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">
                        {t.type === "kirim" ? "+" : "−"}
                        {formatSom(t.amount)}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{t.note ?? "—"}</td>
                      <td className="px-3 py-2 text-xs">{t.cashier}</td>
                    </tr>
                  );
                })}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Harakatlar yo'q
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Kassa yopish tarixi */}
        <div className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b p-3 text-sm font-semibold">
            <Lock className="h-4 w-4 text-muted-foreground" />
            Kassa yopish tarixi
          </div>
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60">
                <tr className="text-xs uppercase text-muted-foreground">
                  <th className="px-3 py-2 text-left">Sana</th>
                  <th className="px-3 py-2 text-left">Kassa</th>
                  <th className="px-3 py-2 text-left">Kim yopdi</th>
                  <th className="px-3 py-2 text-right">Tushum</th>
                  <th className="px-3 py-2 text-right">Harajat</th>
                  <th className="px-3 py-2 text-right">Kamomat</th>
                  <th className="px-3 py-2 text-right">Qoldi</th>
                </tr>
              </thead>
              <tbody>
                {closes.map((c) => {
                  const kassa = MOCK_KASSALAR.find((k) => k.id === c.kassaId);
                  return (
                    <tr key={c.id} className="border-t">
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {new Date(c.date).toLocaleString("uz-UZ")}
                      </td>
                      <td className="px-3 py-2 font-medium">{kassa?.name ?? c.kassaId}</td>
                      <td className="px-3 py-2 text-xs">{c.cashier}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">
                        {formatSom(c.totalSales ?? 0)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {formatSom(c.expenses ?? 0)}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right tabular-nums",
                          c.shortage > 0
                            ? "font-semibold text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        {formatSom(c.shortage)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">
                        {formatSom(c.leftInRegister)}
                      </td>
                    </tr>
                  );
                })}
                {closes.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Yopilishlar yo'q
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Yangi kassa dialog */}
      <Dialog open={newKassaOpen} onOpenChange={setNewKassaOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Yangi qo'shimcha kassa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Kassa nomi</Label>
              <Input
                value={newKassaName}
                onChange={(e) => setNewKassaName(e.target.value)}
                placeholder="Masalan: 2-do'kon kassasi"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Boshlang'ich balans (ixtiyoriy)</Label>
              <Input
                type="number"
                value={newKassaStart}
                onChange={(e) => setNewKassaStart(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Standart qoldiq summasi</Label>
              <Input
                type="number"
                value={newKassaLeftover}
                onChange={(e) => setNewKassaLeftover(e.target.value)}
                placeholder="0"
              />
              <div className="text-xs text-muted-foreground">
                Smena yopilganda kassada shu summa qoldiriladi, qolgani asosiy kassaga o'tadi.
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-2.5">
              <Label className="text-sm">Kassir qoldiqni o'zi o'zgartira oladi</Label>
              <Switch checked={newKassaAllowSelf} onCheckedChange={setNewKassaAllowSelf} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewKassaOpen(false)}>
              Bekor
            </Button>
            <Button onClick={createKassa}>Yaratish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kassa sozlamalari dialog */}
      <Dialog open={!!settingsFor} onOpenChange={(o) => !o && setSettingsFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{settingsFor?.name} — sozlamalar</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Standart qoldiq summasi</Label>
              <Input
                type="number"
                value={settingsLeftover}
                onChange={(e) => setSettingsLeftover(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-2.5">
              <Label className="text-sm">Kassir qoldiqni o'zi o'zgartira oladi</Label>
              <Switch checked={settingsAllowSelf} onCheckedChange={setSettingsAllowSelf} />
            </div>
            {settingsFor && employeesOf(settingsFor.id).length > 0 && (
              <div className="text-xs text-muted-foreground">
                Biriktirilgan xodimlar: {employeesOf(settingsFor.id).join(", ")}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsFor(null)}>
              Bekor
            </Button>
            <Button onClick={saveSettings}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kirim dialog */}
      <Dialog open={!!topUpFor} onOpenChange={(o) => !o && setTopUpFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{topUpFor?.name} ga kirim</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Summa (so'm)</Label>
              <Input
                type="number"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                placeholder="0"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Izoh (ixtiyoriy)</Label>
              <Textarea value={topUpNote} onChange={(e) => setTopUpNote(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopUpFor(null)}>
              Bekor
            </Button>
            <Button onClick={doTopUp}>Kirim qilish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer dialog */}
      <Dialog open={!!transferFrom} onOpenChange={(o) => !o && setTransferFrom(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Asosiy kassaga o'tkazish</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Qaysi kassadan</Label>
              <Select
                value={transferFrom?.id}
                onValueChange={(v) => setTransferFrom(qoshimchalar.find((k) => k.id === v) ?? null)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {qoshimchalar.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.name} — {formatSom(kassaBalance(k.id))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>
                O'tkaziladigan summa{" "}
                {transferFrom && (
                  <span className="text-muted-foreground">
                    (balans: {formatSom(kassaBalance(transferFrom.id))})
                  </span>
                )}
              </Label>
              <Input
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="0"
              />
              {transferFrom && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-1 text-xs"
                  onClick={() => setTransferAmount(String(kassaBalance(transferFrom.id)))}
                >
                  Hammasini o'tkazish
                </Button>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Izoh (ixtiyoriy)</Label>
              <Textarea
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                rows={2}
                placeholder="Masalan: kunlik yakuniy o'tkazma, ertasi kun uchun 200 000 qoldirildi"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferFrom(null)}>
              Bekor
            </Button>
            <Button onClick={doTransfer} className="gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              O'tkazish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
