import JsBarcode from "jsbarcode";
import { formatSom, type Product } from "@/lib/mock-data";

export type PrintSize = "small" | "medium" | "large";
export type PrintField = "name" | "barcode" | "code" | "price" | "cost" | "shelf";
/** Fizik yorliqda qaysi maydon haqiqiy (skaner o'qiy oladigan) shtrix-kod chiziqlari bilan bosiladi. */
export type ScanCodeSource = "barcode" | "customCode";
/** Tayyor yorliq o'lchamlari (mm) yoki foydalanuvchi kiritadigan ixtiyoriy o'lcham. */
export type LabelPreset = "58x40" | "40x30" | "30x20" | "custom";

export const LABEL_PRESET_SIZES: Record<
  Exclude<LabelPreset, "custom">,
  { width: number; height: number }
> = {
  "58x40": { width: 58, height: 40 },
  "40x30": { width: 40, height: 30 },
  "30x20": { width: 30, height: 20 },
};

/** Yorliq chegarasi (margin) mm da — matn/shtrix-kod bu chegaradan tashqariga chiqmaydi. */
export const MIN_LABEL_MARGIN_MM = 1;
export const MAX_LABEL_MARGIN_MM = 10;
export const MIN_LABEL_DIMENSION_MM = 10;
export const MAX_LABEL_DIMENSION_MM = 200;

export type PrintSettings = {
  receiptMode: boolean;
  includeName: boolean;
  includePrice: boolean;
  includeBarcode: boolean;
  includeCustomCode: boolean;
  /** Tan narxni (maxfiy, oldiga "0" qo'yilgan kod ko'rinishida) yorliqqa chiqarish */
  includeCostPrice: boolean;
  includeShelfLocation: boolean;
  /** Shtrix kod yoki Artikul — qaysi biri tayoqcha skaner o'qiy oladigan chiziqlar bilan bosiladi */
  scanCodeSource: ScanCodeSource;
  size: PrintSize;
  fieldScale: Record<PrintField, number>;
  /** Tayyor o'lcham tanlangan bo'lsa shu, "custom" bo'lsa labelWidthMm/labelHeightMm ishlatiladi. */
  labelPreset: LabelPreset;
  labelWidthMm: number;
  labelHeightMm: number;
  /** Yorliq chetlaridan matn chiqib ketmasligi uchun qattiq chegara (mm) */
  marginMm: number;
  commentEnabled: boolean;
  comment: string;
  matchStockQty: boolean;
};

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  receiptMode: false,
  includeName: true,
  includePrice: false,
  includeBarcode: true,
  includeCustomCode: true,
  includeCostPrice: false,
  includeShelfLocation: false,
  scanCodeSource: "barcode",
  size: "medium",
  fieldScale: { name: 100, barcode: 100, code: 100, price: 100, cost: 100, shelf: 100 },
  labelPreset: "40x30",
  labelWidthMm: 40,
  labelHeightMm: 30,
  marginMm: 2,
  commentEnabled: false,
  comment: "",
  matchStockQty: false,
};

export const LABEL_SIZE_PRESETS: Record<
  PrintSize,
  {
    labelMinHeight: number;
    padding: number;
    nameSize: number;
    barcodeSize: number;
    codeSize: number;
    priceSize: number;
    costSize: number;
    shelfSize: number;
    gap: number;
    columns: number;
  }
> = {
  small: {
    labelMinHeight: 72,
    padding: 7,
    nameSize: 12,
    barcodeSize: 15,
    codeSize: 9,
    priceSize: 13,
    costSize: 9,
    shelfSize: 9,
    gap: 6,
    columns: 3,
  },
  medium: {
    labelMinHeight: 92,
    padding: 10,
    nameSize: 15,
    barcodeSize: 20,
    codeSize: 11,
    priceSize: 16,
    costSize: 11,
    shelfSize: 11,
    gap: 10,
    columns: 2,
  },
  large: {
    labelMinHeight: 118,
    padding: 14,
    nameSize: 19,
    barcodeSize: 26,
    codeSize: 13,
    priceSize: 22,
    costSize: 13,
    shelfSize: 13,
    gap: 12,
    columns: 1,
  },
};

/** Yorliq chop etish uchun kerak bo'lgan minimal mahsulot maydonlari. */
export type PrintableProduct = Pick<
  Product,
  "name" | "barcode" | "customCode" | "price" | "costPrice" | "shelfLocation"
>;

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Tan narxni sotuvchi/kassir tushunadigan, lekin xaridorga oddiy kod bo'lib
 * ko'rinadigan formatga o'tkazadi: raqam oldiga "0" qo'shiladi va pul
 * birligi/ajratgichlarsiz faqat raqamlar chiqariladi (masalan tan narx 5 —
 * yorliqda "05" bo'lib bosiladi).
 */
export function formatCostCode(cost: number): string {
  const digits = String(Math.max(0, Math.round(cost || 0)));
  return `0${digits}`;
}

function clampLabelDimensionMm(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return MIN_LABEL_DIMENSION_MM;
  return Math.min(MAX_LABEL_DIMENSION_MM, Math.max(MIN_LABEL_DIMENSION_MM, Math.round(value)));
}

/** Chegara (margin) qiymatini 1mm dan kam bo'lmaydigan qilib qattiq chegaralaydi. */
export function clampMarginMm(value: number): number {
  if (!Number.isFinite(value)) return MIN_LABEL_MARGIN_MM;
  return Math.min(MAX_LABEL_MARGIN_MM, Math.max(MIN_LABEL_MARGIN_MM, value));
}

/** Tanlangan tayyor o'lcham yoki ixtiyoriy (custom) o'lchamni mm da qaytaradi. */
export function getLabelDimensionsMm(settings: PrintSettings): { width: number; height: number } {
  if (settings.labelPreset === "custom") {
    return {
      width: clampLabelDimensionMm(settings.labelWidthMm),
      height: clampLabelDimensionMm(settings.labelHeightMm),
    };
  }
  return LABEL_PRESET_SIZES[settings.labelPreset] ?? LABEL_PRESET_SIZES["40x30"];
}

/**
 * Berilgan qiymatni haqiqiy (tayoqcha skaner o'qiy oladigan) CODE128
 * shtrix-kod chiziqlari ko'rinishida SVG markup sifatida qaytaradi. Node
 * mavjud bo'lmagan muhitda (SSR) yoki qiymat noto'g'ri bo'lsa, oddiy matnga
 * qaytadi.
 */
export function buildBarcodeSvg(
  value: string,
  options: { heightPx: number; displayValue?: boolean } = { heightPx: 40 },
): string {
  const clean = (value ?? "").trim();
  if (!clean) return "";
  if (typeof document === "undefined") return escapeHtml(clean);
  try {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, clean, {
      format: "CODE128",
      displayValue: options.displayValue ?? true,
      height: Math.max(20, options.heightPx),
      fontSize: Math.max(10, Math.round(options.heightPx * 0.45)),
      textMargin: 2,
      margin: 0,
      lineColor: "#111827",
      background: "transparent",
    });
    return svg.outerHTML;
  } catch {
    return `<span style="font-family:'Courier New',monospace;">${escapeHtml(clean)}</span>`;
  }
}

/** Navbatni (mahsulot + nusxa soni) har bir nusxa uchun bitta yozuvga yoyadi — bu yorliqlar sonining haqiqiy hisobi. */
export function flattenPrintQueue(
  queue: { product: PrintableProduct; copies: number }[],
): PrintableProduct[] {
  return queue.flatMap(({ product, copies }) =>
    Array.from({ length: Math.max(1, copies) }, () => product),
  );
}

export function printProductLabels(
  queue: { product: PrintableProduct; copies: number }[],
  settings: PrintSettings,
) {
  const base = LABEL_SIZE_PRESETS[settings.size];
  const fieldPx = (basePx: number, field: PrintField) =>
    Math.round(basePx * (settings.fieldScale[field] / 100));
  const size = {
    ...base,
    nameSize: fieldPx(base.nameSize, "name"),
    barcodeSize: fieldPx(base.barcodeSize, "barcode"),
    codeSize: fieldPx(base.codeSize, "code"),
    priceSize: fieldPx(base.priceSize, "price"),
    costSize: fieldPx(base.costSize, "cost"),
    shelfSize: fieldPx(base.shelfSize, "shelf"),
  };
  const { width: labelWidth, height: labelHeight } = getLabelDimensionsMm(settings);
  const margin = clampMarginMm(settings.marginMm);
  const comment =
    settings.commentEnabled && settings.comment.trim()
      ? `<div class="comment">${escapeHtml(settings.comment.trim())}</div>`
      : "";

  // Skaner chiziqlari faqat bitta manba (Shtrix kod YOKI Artikul) uchun
  // chiqariladi — ikkinchisi (yoqilgan bo'lsa) oddiy matn sifatida ko'rinadi.
  const scanIsBarcode = settings.scanCodeSource === "barcode";

  const labels = flattenPrintQueue(queue)
    .map((product) => {
      const name = settings.includeName
        ? `<div class="name">${escapeHtml(product.name)}</div>`
        : "";
      const price = settings.includePrice
        ? `<div class="price">${escapeHtml(formatSom(product.price))}</div>`
        : "";
      const cost = settings.includeCostPrice
        ? `<div class="cost">${escapeHtml(formatCostCode(product.costPrice))}</div>`
        : "";
      const barcode = settings.includeBarcode
        ? scanIsBarcode
          ? `<div class="barcode-symbol">${buildBarcodeSvg(product.barcode, { heightPx: size.barcodeSize * 2 })}</div>`
          : `<div class="barcode">${escapeHtml(product.barcode)}</div>`
        : "";
      const code = settings.includeCustomCode
        ? !scanIsBarcode
          ? `<div class="barcode-symbol">${buildBarcodeSvg(product.customCode, { heightPx: size.barcodeSize * 2 })}</div>`
          : `<div class="code">${escapeHtml(product.customCode)}</div>`
        : "";
      const shelf = settings.includeShelfLocation
        ? `<div class="shelf">Polka: ${escapeHtml(product.shelfLocation || "—")}</div>`
        : "";
      const receiptHeader = settings.receiptMode
        ? `<div class="receipt-title">TOVAR CHEKI</div>`
        : "";
      return `
        <section class="label${settings.receiptMode ? " receipt" : ""}">
          ${receiptHeader}
          ${price}
          ${name}
          ${barcode}
          ${code}
          ${shelf}
          ${comment}
          ${cost}
        </section>
      `;
    })
    .join("");

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Tovar yorliqlari</title>
        <style>
          * { box-sizing: border-box; }
          @page { size: ${labelWidth}mm ${labelHeight}mm; margin: 0; }
          body { margin: 0; font-family: Arial, sans-serif; color: #111827; }
          .label {
            width: ${labelWidth}mm;
            height: ${labelHeight}mm;
            padding: ${margin}mm;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            page-break-after: always;
            break-after: page;
          }
          .label:last-child { page-break-after: auto; break-after: auto; }
          .receipt { align-items: center; text-align: center; }
          .receipt-title {
            margin-bottom: 4px;
            border-bottom: 1px dashed #111827;
            padding-bottom: 3px;
            font-size: ${Math.max(9, size.codeSize)}px;
            font-weight: 800;
            letter-spacing: 0.08em;
          }
          .name { margin-top: 2px; font-size: ${size.nameSize}px; font-weight: 700; line-height: 1.15; overflow-wrap: anywhere; }
          .barcode { margin-top: 6px; font-family: "Courier New", monospace; font-size: ${size.barcodeSize}px; letter-spacing: 1px; word-break: break-all; }
          .barcode-symbol { margin-top: 4px; line-height: 0; max-width: 100%; }
          .barcode-symbol svg { max-width: 100%; height: auto; }
          .code { margin-top: 2px; font-size: ${size.codeSize}px; color: #4b5563; }
          .shelf { margin-top: 2px; font-size: ${size.shelfSize}px; color: #4b5563; }
          .price { margin-top: 4px; font-size: ${size.priceSize}px; font-weight: 800; text-align: center; }
          .cost { margin-top: auto; padding-top: 4px; font-size: ${size.costSize}px; color: #9ca3af; font-family: "Courier New", monospace; }
          .comment {
            margin-top: 5px;
            border-top: 1px dashed #9ca3af;
            padding-top: 4px;
            font-size: ${Math.max(9, size.codeSize)}px;
            color: #374151;
          }
        </style>
      </head>
      <body>
        <main>${labels}</main>
        <script>
          window.onload = () => {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
