import { MOCK_PRODUCTS, type Product } from "@/lib/mock-data";

export type DiscountInput = {
  mode: "percent" | "amount";
  /** percent bo'lsa 0–100 oralig'ida foiz, amount bo'lsa yangi sotuv narxi (so'm) */
  value: number;
  startDate: string; // yyyy-mm-dd, bo'sh bo'lsa bugundan
  endDate: string; // yyyy-mm-dd — shu kundan keyin chegirma avtomatik bekor bo'ladi
};

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function computeDiscountedPrice(
  originalPrice: number,
  input: Pick<DiscountInput, "mode" | "value">,
) {
  if (input.mode === "percent") {
    return Math.max(0, Math.round(originalPrice * (1 - input.value / 100)));
  }
  return Math.max(0, Math.round(input.value));
}

/** Tovarga chegirma qo'yadi: asl narxni saqlab, sotuv narxini yangilaydi (bitta faol chegirma). */
export function applyDiscount(product: Product, input: DiscountInput) {
  const originalPrice = product.discount ? product.discount.originalPrice : product.price;
  const newPrice = computeDiscountedPrice(originalPrice, input);
  const percent = originalPrice > 0 ? Math.round((1 - newPrice / originalPrice) * 100) : 0;
  product.discount = {
    originalPrice,
    percent,
    startDate: input.startDate || todayKey(),
    endDate: input.endDate,
  };
  product.price = newPrice;
  return { originalPrice, newPrice };
}

/** Chegirmani muddatidan oldin qo'lda bekor qilib, narxni asl holiga qaytaradi. */
export function cancelDiscount(product: Product) {
  if (!product.discount) return;
  product.price = product.discount.originalPrice;
  product.discount = undefined;
}

/** Muddati o'tgan barcha chegirmalarni topib, narxlarni asl holiga qaytaradi.
 * Har safar tovarlar ro'yxati ochilganda va ilova yuklanganda chaqiriladi
 * (bu demo backendsiz bo'lgani uchun fon rejimida ishlaydigan cron yo'q). */
export function syncExpiredDiscounts() {
  const today = todayKey();
  let changed = false;
  for (const product of MOCK_PRODUCTS) {
    if (product.discount && product.discount.endDate < today) {
      product.price = product.discount.originalPrice;
      product.discount = undefined;
      changed = true;
    }
  }
  return changed;
}
