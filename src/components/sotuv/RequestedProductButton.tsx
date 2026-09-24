import * as React from "react";
import { CalendarDays, ImagePlus, PackageSearch, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/lib/app-context";
import { fullCustomerName, searchCreditCustomers } from "@/lib/data-actions";
import { MOCK_PRODUCTS } from "@/lib/mock-data";
import {
  addRequestedProduct,
  MOCK_REQUESTED_PRODUCTS,
  REQUESTER_LABELS,
  type RequesterType,
} from "@/lib/requested-products";

const UNITS = ["dona", "kg", "metr", "litr", "qut"];
const MAX_IMAGE_SIDE = 800;
const MAX_SUGGESTIONS = 8;

/** Rasmni kichraytirib data URL qiladi — xotira to'lib ketmasligi uchun. */
function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Rasmni o'qib bo'lmadi"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Rasm formati noto'g'ri"));
      img.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function toDateKey(date: Date) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

function formatDate(date: Date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${date.getFullYear()}`;
}

type Suggestion = { name: string; source: "Bazada" | "Oldin so'ralgan" };

function suggestProducts(query: string): Suggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  const push = (name: string, source: Suggestion["source"]) => {
    const key = name.trim().toLowerCase();
    if (!key || seen.has(key) || !key.includes(q)) return;
    seen.add(key);
    out.push({ name, source });
  };
  for (const item of MOCK_REQUESTED_PRODUCTS) {
    push(item.name, "Oldin so'ralgan");
    if (out.length >= MAX_SUGGESTIONS) return out;
  }
  for (const product of MOCK_PRODUCTS) {
    push(product.name, "Bazada");
    if (out.length >= MAX_SUGGESTIONS) break;
  }
  return out;
}

type Props = {
  /** "pos" — yangi POS oynasidagi katta tugma; "cart" — eski savatcha qatoridagi ixcham tugma */
  variant?: "pos" | "cart";
};

export function RequestedProductButton({ variant = "cart" }: Props) {
  const { settings } = useApp();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [nameFocused, setNameFocused] = React.useState(false);
  const [requesterType, setRequesterType] = React.useState<Exclude<RequesterType, "">>("oddiy");
  const [customerQuery, setCustomerQuery] = React.useState("");
  const [customer, setCustomer] = React.useState<{ id: string; name: string } | null>(null);
  const [otherName, setOtherName] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [unit, setUnit] = React.useState(UNITS[0]);
  const [neededBy, setNeededBy] = React.useState<Date | undefined>();
  const [dateOpen, setDateOpen] = React.useState(false);
  const [image, setImage] = React.useState<string | undefined>();
  const [nameError, setNameError] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const suggestions = React.useMemo(
    () => (nameFocused ? suggestProducts(name) : []),
    [name, nameFocused, open],
  );
  const customerResults = React.useMemo(
    () => (customer ? [] : searchCreditCustomers(customerQuery)),
    [customerQuery, customer],
  );

  const reset = () => {
    setName("");
    setNameFocused(false);
    setRequesterType("oddiy");
    setCustomerQuery("");
    setCustomer(null);
    setOtherName("");
    setQuantity("");
    setUnit(UNITS[0]);
    setNeededBy(undefined);
    setImage(undefined);
    setNameError(false);
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    try {
      setImage(await readImage(file));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Rasm yuklanmadi");
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      setNameError(true);
      toast.error("Tovar nomini kiriting");
      return;
    }
    const qty = Number(quantity.replace(",", "."));
    const hasQty = quantity.trim() !== "" && Number.isFinite(qty) && qty > 0;
    addRequestedProduct({
      name,
      requesterType,
      requesterName:
        requesterType === "nasiya"
          ? (customer?.name ?? "")
          : requesterType === "boshqa"
            ? otherName.trim()
            : "",
      customerId: requesterType === "nasiya" ? customer?.id : undefined,
      quantity: hasQty ? qty : null,
      unit,
      neededBy: neededBy ? toDateKey(neededBy) : "",
      image,
      addedBy: settings.username || "Admin",
    });
    toast.success("Taklif saqlandi", {
      description: "Tovarlar → Talab qilingan tovarlar bo'limida ko'rinadi",
    });
    reset();
    setOpen(false);
  };

  return (
    <>
      {variant === "pos" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-11 touch-manipulation items-center gap-1.5 rounded-[10px] border border-violet-300 bg-violet-50 px-3 text-xs font-semibold text-violet-700"
        >
          <PackageSearch className="h-4 w-4" />
          Mijozlar taklif
        </button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="h-8 gap-1.5 border-violet-300 bg-violet-50 px-2 text-xs font-semibold text-violet-700 hover:bg-violet-100 hover:text-violet-700"
        >
          <PackageSearch className="h-4 w-4" />
          Mijozlar taklif
        </Button>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="max-h-[92dvh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mijoz takliflari</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* 1. Tovar nomi */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                Tovar nomi <span className="text-destructive">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(false);
                }}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                placeholder="Tovar nomini kiriting yoki ro'yxatdan tanlang..."
                className={nameError ? "border-destructive" : undefined}
                autoFocus
              />
              {suggestions.length > 0 && (
                <div className="max-h-44 overflow-y-auto rounded-md border bg-card">
                  {suggestions.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      // onMouseDown — input blur bo'lishidan oldin tanlash uchun
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setName(item.name);
                        setNameFocused(false);
                      }}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span className="truncate">{item.name}</span>
                      <span className="flex-shrink-0 text-xs text-muted-foreground">
                        {item.source}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Mijoz turi */}
            <div className="space-y-1.5">
              <Label className="text-sm">Mijoz turi</Label>
              <Select
                value={requesterType}
                onValueChange={(value) => setRequesterType(value as Exclude<RequesterType, "">)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oddiy">{REQUESTER_LABELS.oddiy}</SelectItem>
                  <SelectItem value="nasiya">{REQUESTER_LABELS.nasiya}</SelectItem>
                  <SelectItem value="boshqa">{REQUESTER_LABELS.boshqa} (ism yozish)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 2.1 Nasiyachini tanlang */}
            {requesterType === "nasiya" && (
              <div className="space-y-1.5">
                <Label className="text-sm">Nasiyachini tanlang</Label>
                {customer ? (
                  <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    <span className="truncate font-medium">{customer.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomer(null);
                        setCustomerQuery("");
                      }}
                      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                      aria-label="Mijozni almashtirish"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Input
                      value={customerQuery}
                      onChange={(e) => setCustomerQuery(e.target.value)}
                      placeholder="Mijozni izlash..."
                    />
                    {customerQuery.trim() && (
                      <div className="max-h-44 overflow-y-auto rounded-md border bg-card">
                        {customerResults.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            Mijoz topilmadi
                          </div>
                        ) : (
                          customerResults.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() =>
                                setCustomer({ id: item.id, name: fullCustomerName(item) })
                              }
                              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                            >
                              <span className="truncate">{fullCustomerName(item)}</span>
                              {item.phone && (
                                <span className="flex-shrink-0 text-xs text-muted-foreground">
                                  {item.phone}
                                </span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* 2.2 Boshqa */}
            {requesterType === "boshqa" && (
              <div className="space-y-1.5">
                <Label className="text-sm">Mijoz nomi / Izoh</Label>
                <Input
                  value={otherName}
                  onChange={(e) => setOtherName(e.target.value)}
                  placeholder="Masalan: G'aybulla usta"
                />
              </div>
            )}

            {/* 3 + 4. Miqdor va muddat */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Kerakli miqdor</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0"
                    className="min-w-0 flex-1"
                  />
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger className="w-24 flex-shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Qachonga kerak?</Label>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start gap-2 px-3 font-normal"
                    >
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      {neededBy ? (
                        formatDate(neededBy)
                      ) : (
                        <span className="text-muted-foreground">Sanani tanlang</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={neededBy}
                      onSelect={(date) => {
                        setNeededBy(date);
                        setDateOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* 5. Tovar rasmi */}
            <div className="space-y-1.5">
              <Label className="text-sm">Tovar rasmi</Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  void handleFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              {image ? (
                <div className="relative h-28 w-28 overflow-hidden rounded-lg border">
                  <img src={image} alt="Tovar rasmi" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImage(undefined)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                    aria-label="Rasmni olib tashlash"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  className="gap-2"
                >
                  <ImagePlus className="h-4 w-4" />+ Rasm yuklash
                </Button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Bekor
            </Button>
            <Button type="button" onClick={handleSave}>
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
