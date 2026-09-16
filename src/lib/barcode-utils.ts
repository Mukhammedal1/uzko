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

function generateCustomCode(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
}

/** Bazadagi barcha mahsulotlar (va variantlar) hamda berilgan qo'shimcha kodlar bilan
 * to'qnashmaydigan 5 xonali tasodifiy Artikul (customCode) yaratadi. */
export function makeUniqueCustomCode(used: Iterable<string> = []): string {
  const usedSet = new Set(
    [
      ...MOCK_PRODUCTS.flatMap((product) => [
        product.customCode,
        ...(product.variants?.map((v) => v.customCode) ?? []),
      ]),
      ...Array.from(used),
    ].filter((value): value is string => Boolean(value)),
  );
  let code = generateCustomCode();
  while (usedSet.has(code)) code = generateCustomCode();
  return code;
}
