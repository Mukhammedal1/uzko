import { MOCK_PRODUCTS } from "@/lib/mock-data";

/** Bitta mahsulot bir nechta shtrix kodga ega bo'lishi mumkin — ular "|" bilan ajratib saqlanadi. */
export function splitBarcodes(value: string): string[] {
  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinBarcodes(values: string[]): string {
  return values
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" | ");
}

function generateBarcode(): string {
  return "8690" + String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, "0");
}

/** Bazadagi barcha mahsulotlar va berilgan qo'shimcha kodlar bilan to'qnashmaydigan yangi shtrix kod yaratadi. */
export function makeUniqueBarcode(used: Iterable<string> = []): string {
  const usedSet = new Set(
    [
      ...MOCK_PRODUCTS.flatMap((product) => splitBarcodes(product.barcode)),
      ...Array.from(used).flatMap((value) => splitBarcodes(value)),
    ].filter(Boolean),
  );
  let barcode = generateBarcode();
  while (usedSet.has(barcode)) barcode = generateBarcode();
  return barcode;
}
