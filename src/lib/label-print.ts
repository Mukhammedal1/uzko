import { formatSom, type Product } from "@/lib/mock-data";

export type PrintSize = "small" | "medium" | "large";
export type PaperSize = "thermal58" | "thermal80" | "a6" | "a4";
export type PrintField = "name" | "barcode" | "code" | "price" | "shelf";

export type PrintSettings = {
  receiptMode: boolean;
  includeName: boolean;
  includePrice: boolean;
  includeBarcode: boolean;
  includeCustomCode: boolean;
  includeShelfLocation: boolean;
  size: PrintSize;
  fieldScale: Record<PrintField, number>;
  paperSize: PaperSize;
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
  includeShelfLocation: false,
  size: "medium",
  fieldScale: { name: 100, barcode: 100, code: 100, price: 100, shelf: 100 },
  paperSize: "thermal80",
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
    shelfSize: 13,
    gap: 12,
    columns: 1,
  },
};

/** Yorliq chop etish uchun kerak bo'lgan minimal mahsulot maydonlari. */
export type PrintableProduct = Pick<
  Product,
  "name" | "barcode" | "customCode" | "price" | "shelfLocation"
>;

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function printProductLabels(
  queue: { product: PrintableProduct; copies: number }[],
  settings: PrintSettings,
) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;

  const base = LABEL_SIZE_PRESETS[settings.size];
  const fieldPx = (basePx: number, field: PrintField) =>
    Math.round(basePx * (settings.fieldScale[field] / 100));
  const size = {
    ...base,
    nameSize: fieldPx(base.nameSize, "name"),
    barcodeSize: fieldPx(base.barcodeSize, "barcode"),
    codeSize: fieldPx(base.codeSize, "code"),
    priceSize: fieldPx(base.priceSize, "price"),
    shelfSize: fieldPx(base.shelfSize, "shelf"),
  };
  const paper = {
    thermal58: { page: "58mm auto", bodyWidth: "58mm", padding: "3mm", receiptWidth: "52mm" },
    thermal80: { page: "80mm auto", bodyWidth: "80mm", padding: "4mm", receiptWidth: "72mm" },
    a6: { page: "A6", bodyWidth: "105mm", padding: "8mm", receiptWidth: "74mm" },
    a4: { page: "A4", bodyWidth: "auto", padding: "8mm", receiptWidth: "90mm" },
  }[settings.paperSize];
  const comment =
    settings.commentEnabled && settings.comment.trim()
      ? `<div class="comment">${escapeHtml(settings.comment.trim())}</div>`
      : "";

  const labels = queue
    .flatMap(({ product, copies }) => Array.from({ length: Math.max(1, copies) }, () => product))
    .map((product) => {
      const name = settings.includeName
        ? `<div class="name">${escapeHtml(product.name)}</div>`
        : "";
      const price = settings.includePrice
        ? `<div class="price">${escapeHtml(formatSom(product.price))}</div>`
        : "";
      const barcode = settings.includeBarcode
        ? `<div class="barcode">${escapeHtml(product.barcode)}</div>`
        : "";
      const code = settings.includeCustomCode
        ? `<div class="code">${escapeHtml(product.customCode)}</div>`
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
          ${name}
          ${barcode}
          ${code}
          ${price}
          ${shelf}
          ${comment}
        </section>
      `;
    })
    .join("");

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Tovar yorliqlari</title>
        <style>
          * { box-sizing: border-box; }
          @page { size: ${paper.page}; margin: 0; }
          body {
            width: ${paper.bodyWidth};
            margin: 0 auto;
            padding: ${paper.padding};
            font-family: Arial, sans-serif;
            color: #111827;
          }
          .sheet {
            display: grid;
            grid-template-columns: repeat(${settings.receiptMode ? 1 : size.columns}, minmax(0, 1fr));
            gap: ${size.gap}px;
            ${settings.receiptMode ? `max-width: ${paper.receiptWidth}; margin: 0 auto;` : ""}
          }
          .label {
            min-height: ${size.labelMinHeight}px;
            border: 1px solid #111827;
            border-radius: ${settings.receiptMode ? 2 : 6}px;
            padding: ${size.padding}px;
            page-break-inside: avoid;
          }
          .receipt { border-style: dashed; text-align: center; }
          .receipt-title {
            margin-bottom: 6px;
            border-bottom: 1px dashed #111827;
            padding-bottom: 4px;
            font-size: ${Math.max(9, size.codeSize)}px;
            font-weight: 800;
            letter-spacing: 0.08em;
          }
          .name { font-size: ${size.nameSize}px; font-weight: 700; line-height: 1.2; }
          .barcode { margin-top: 8px; font-family: "Courier New", monospace; font-size: ${size.barcodeSize}px; letter-spacing: 1px; word-break: break-all; }
          .code { margin-top: 2px; font-size: ${size.codeSize}px; color: #4b5563; }
          .shelf { margin-top: 2px; font-size: ${size.shelfSize}px; color: #4b5563; }
          .price { margin-top: 6px; font-size: ${size.priceSize}px; font-weight: 800; }
          .comment {
            margin-top: 7px;
            border-top: 1px dashed #9ca3af;
            padding-top: 5px;
            font-size: ${Math.max(9, size.codeSize)}px;
            color: #374151;
          }
          @media print {
            body { padding: ${paper.padding}; }
          }
        </style>
      </head>
      <body>
        <main class="sheet">${labels}</main>
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
