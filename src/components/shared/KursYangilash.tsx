import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { MOCK_PRODUCTS, MOCK_RATES, costInSom, formatSom } from "@/lib/mock-data";
import { toast } from "sonner";

export function KursYangilash() {
  const [rates, setRates] = React.useState<{ code: string; value: string }[]>(() =>
    Object.entries(MOCK_RATES).map(([code, value]) => ({ code, value: String(value) })),
  );
  const [newCode, setNewCode] = React.useState("");
  const [newValue, setNewValue] = React.useState("");

  const normalizedCodes = React.useMemo(
    () => rates.map((rate) => rate.code.trim().toUpperCase()),
    [rates],
  );

  const addRate = () => {
    const code = newCode.trim().toUpperCase();
    const value = parseFloat(newValue);
    if (!code) {
      toast.error("Valyuta kodi kiriting");
      return;
    }
    if (normalizedCodes.includes(code)) {
      toast.error("Bu kurs allaqachon bor");
      return;
    }
    if (!value || value <= 0) {
      toast.error("Kurs summasini to'g'ri kiriting");
      return;
    }
    setRates([...rates, { code, value: String(value) }]);
    setNewCode("");
    setNewValue("");
    toast.success("Kurs qo'shildi", { description: `${code}: ${formatSom(value)}` });
  };

  const deleteRate = (code: string) => {
    if (code === "UZS") return;
    setRates(rates.filter((rate) => rate.code !== code));
    delete MOCK_RATES[code];
    toast.success("Kurs o'chirildi", { description: code });
  };

  const apply = () => {
    Object.keys(MOCK_RATES).forEach((key) => delete MOCK_RATES[key]);
    rates.forEach((rate) => {
      const code = rate.code.trim().toUpperCase();
      const value = parseFloat(rate.value);
      if (code && value > 0) MOCK_RATES[code] = value;
    });
    if (!MOCK_RATES.UZS) MOCK_RATES.UZS = 1;

    let updated = 0;
    MOCK_PRODUCTS.forEach((product) => {
      if (product.costCurrency !== "UZS") {
        product.price = Math.round(costInSom(product) * 1.4);
        updated++;
      }
    });

    toast.success("Kurslar yangilandi", {
      description: `${updated} ta valyutali tovar narxi avtomatik yangilandi`,
    });
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-bold">Kursni yangilash</div>
          <div className="text-sm text-muted-foreground">
            Valyuta kurslarini boshqaring va narxlarni qayta hisoblang.
          </div>
        </div>
        <Button onClick={apply} className="h-10 gap-2">
          <ArrowRight className="h-4 w-4" /> Kursni qo'llash
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-h-0 flex-col rounded-xl border bg-card shadow-sm">
          <div className="border-b p-4">
            <div className="text-sm font-semibold">Valyuta kurslari</div>
            <div className="text-xs text-muted-foreground">
              Har bir kurs so'm qiymatida kiritiladi.
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-auto p-4">
            {rates.map((rate, index) => (
              <div
                key={rate.code}
                className="grid grid-cols-[96px_minmax(0,1fr)_2rem] items-center gap-3 rounded-lg border bg-muted/20 p-2"
              >
                <Input
                  value={rate.code}
                  disabled={rate.code === "UZS"}
                  onChange={(event) =>
                    setRates(
                      rates.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, code: event.target.value.toUpperCase() }
                          : item,
                      ),
                    )
                  }
                  className="h-9 font-bold uppercase"
                />
                <Input
                  type="number"
                  value={rate.value}
                  min={0}
                  onChange={(event) =>
                    setRates(
                      rates.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, value: event.target.value } : item,
                      ),
                    )
                  }
                  className="h-9"
                />
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => deleteRate(rate.code)}
                  disabled={rate.code === "UZS"}
                  title="Kursni o'chirish"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="mb-4">
              <div className="text-sm font-semibold">Yangi kurs qo'shish</div>
              <div className="text-xs text-muted-foreground">Masalan: CNY, KZT yoki TRY.</div>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="mb-1 block text-xs">Yangi kod</Label>
                <Input
                  value={newCode}
                  onChange={(event) => setNewCode(event.target.value)}
                  placeholder="CNY"
                  className="h-10 uppercase"
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs">Kurs summasi</Label>
                <Input
                  type="number"
                  value={newValue}
                  onChange={(event) => setNewValue(event.target.value)}
                  placeholder="0"
                  className="h-10"
                />
              </div>
              <Button variant="outline" onClick={addRate} className="h-10 w-full gap-2">
                <Plus className="h-4 w-4" /> Qo'shish
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 text-sm">
            <div className="font-semibold text-primary">Avtomatik hisoblash</div>
            <p className="mt-2 text-muted-foreground">
              Kursni qo'llaganda valyutada tan narxga ega tovarlarning sotuv narxi avtomatik
              yangilanadi. UZS asosiy kurs bo'lgani uchun o'chirilmaydi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
