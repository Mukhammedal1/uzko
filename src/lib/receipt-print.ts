import { MOCK_PRODUCTS, formatSom, type Receipt } from "@/lib/mock-data";
import type { ReceiptPrintFormat, ReceiptSettings } from "@/lib/app-context";
import { escapeHtml } from "@/lib/label-print";

export const RECEIPT_PRINT_FORMAT_OPTIONS: { value: ReceiptPrintFormat; label: string; hint: string }[] = [
  { value: "nakladnoy", label: "Nakladnoy (A4)", hint: "Shtrix kod va artikul bilan" },
  { value: "savdo80", label: "80 mm savdo cheki", hint: "Oddiy kassa cheki" },
];

type PrintOptions = {
  receiptSettings: ReceiptSettings;
  showImages: boolean;
};

/** Kassa chekini tanlangan formatda (80 mm yoki A4 nakladnoy) yangi oynada chop etadi. */
export function printSaleReceipt(
  receipt: Receipt,
  format: ReceiptPrintFormat,
  options: PrintOptions,
): boolean {
  const html =
    format === "nakladnoy"
      ? buildNakladnoyHtml(receipt, options)
      : buildSavdoHtml(receipt, options.receiptSettings);

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return false;
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
}

function fmtDate(value: string) {
  return new Date(value).toLocaleString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function productOf(productId: string) {
  return MOCK_PRODUCTS.find((p) => p.id === productId);
}

function paymentLines(receipt: Receipt): [string, number][] {
  const pb = receipt.paymentBreakdown;
  if (!pb) return [];
  const lines: [string, number][] = [
    ["Naqd", pb.cash],
    ["Karta", pb.card],
    ["O'tkazma", pb.transfer ?? 0],
    ["Hamyon", pb.wallet ?? 0],
    ["Valyuta", pb.currencyInSom],
  ];
  return lines.filter(([, value]) => value > 0);
}

const FONT_PX = { small: 10, normal: 12, large: 14 } as const;

function buildSavdoHtml(receipt: Receipt, rs: ReceiptSettings): string {
  const fontPx = FONT_PX[rs.fontSize] ?? 12;
  const width = rs.width === "58" ? "50mm" : "72mm";
  const pageWidth = rs.width === "58" ? "58mm" : "80mm";

  const items = receipt.items
    .map((it) => {
      const product = productOf(it.productId);
      const code =
        rs.showProductCode && product ? `<div class="small">Kod: ${escapeHtml(product.customCode || product.barcode)}</div>` : "";
      const note = it.note ? `<div class="small">Izoh: ${escapeHtml(it.note)}</div>` : "";
      return `
        <div class="item">
          <div class="row"><span>${escapeHtml(it.name)}${it.source === "one-time" ? " (bir martalik)" : ""}</span></div>
          ${code}
          <div class="row small"><span>${it.qty} ${escapeHtml(it.unit)} × ${escapeHtml(formatSom(it.price))}</span><span>${escapeHtml(formatSom(it.price * it.qty))}</span></div>
          ${note}
        </div>`;
    })
    .join("");

  const discount =
    receipt.discount > 0
      ? `<div class="row"><span>Skidka:</span><span>−${escapeHtml(formatSom(receipt.discount))}</span></div>`
      : "";
  const payments = paymentLines(receipt)
    .map(([label, value]) => `<div class="row small"><span>${label}:</span><span>${escapeHtml(formatSom(value))}</span></div>`)
    .join("");
  const debt =
    receipt.customerType === "nasiya" && (receipt.debtAmount ?? 0) > 0
      ? `<div class="row"><span>Qarz:</span><span>${escapeHtml(formatSom(receipt.debtAmount ?? 0))}</span></div>`
      : "";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Chek ${escapeHtml(receipt.id)}</title>
<style>
  * { box-sizing: border-box; }
  @page { size: ${pageWidth} auto; margin: 0; }
  body { margin: 0; padding: 2mm 0; width: ${width}; margin-inline: auto; font-family: "Courier New", monospace; font-size: ${fontPx}px; color: #000; }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .small { font-size: ${Math.max(9, fontPx - 2)}px; }
  .row { display: flex; justify-content: space-between; gap: 6px; }
  .dash { border-bottom: 1px dashed #000; margin: 4px 0; }
  .item { margin-bottom: 4px; }
  .total { font-size: ${fontPx + 2}px; font-weight: 700; border-top: 1px solid #000; margin-top: 4px; padding-top: 3px; }
</style>
</head>
<body>
  <div class="center bold">${escapeHtml(rs.storeName || "UZKO SAVDO")}</div>
  ${rs.showAddress && rs.address ? `<div class="center small">${escapeHtml(rs.address)}</div>` : ""}
  ${rs.showPhone && rs.phone ? `<div class="center small">Tel: ${escapeHtml(rs.phone)}</div>` : ""}
  ${rs.social ? `<div class="center small">${escapeHtml(rs.social)}</div>` : ""}
  <div class="center small">Chek #${escapeHtml(receipt.id)}</div>
  <div class="center small">${escapeHtml(fmtDate(receipt.date))}</div>
  ${rs.showCashier ? `<div class="center small">Kassir: ${escapeHtml(receipt.cashier)}</div>` : ""}
  ${receipt.customerName ? `<div class="center small">Mijoz: ${escapeHtml(receipt.customerName)}</div>` : ""}
  <div class="dash"></div>
  ${items}
  <div class="dash"></div>
  <div class="row"><span>Oraliq:</span><span>${escapeHtml(formatSom(receipt.subtotal))}</span></div>
  ${discount}
  <div class="row total"><span>JAMI:</span><span>${escapeHtml(formatSom(receipt.total))}</span></div>
  ${payments ? `<div class="dash"></div>${payments}` : ""}
  ${debt}
  <div class="dash"></div>
  <div class="center small">${escapeHtml(rs.extraNote || "")}</div>
  <script>window.onload = () => { window.focus(); window.print(); };</script>
</body>
</html>`;
}

function buildNakladnoyHtml(receipt: Receipt, { receiptSettings: rs, showImages }: PrintOptions): string {
  const rows = receipt.items
    .map((it, index) => {
      const product = productOf(it.productId);
      const image =
        showImages && product?.image
          ? `<img src="${escapeHtml(product.image)}" alt="" style="width:36px;height:36px;object-fit:cover;border-radius:4px" />`
          : "";
      const barcode = product?.barcode
        ? `<div class="barcode">${escapeHtml(product.barcode)}</div>`
        : "—";
      return `
        <tr>
          <td class="c">${index + 1}</td>
          ${showImages ? `<td class="c">${image}</td>` : ""}
          <td>${escapeHtml(it.name)}${it.source === "one-time" ? " <i>(bir martalik)</i>" : ""}</td>
          <td class="c">${escapeHtml(product?.customCode || "—")}</td>
          <td class="c">${barcode}</td>
          <td class="c">${escapeHtml(it.unit)}</td>
          <td class="r">${it.qty}</td>
          <td class="r">${escapeHtml(formatSom(it.price))}</td>
          <td class="r">${escapeHtml(formatSom(it.price * it.qty))}</td>
        </tr>`;
    })
    .join("");

  const customer = receipt.customerName
    ? `<div>Mijoz: <b>${escapeHtml(receipt.customerName)}</b>${receipt.customerPhone ? ` · ${escapeHtml(receipt.customerPhone)}` : ""}</div>`
    : "";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Nakladnoy ${escapeHtml(receipt.id)}</title>
<style>
  * { box-sizing: border-box; }
  @page { size: A4; margin: 12mm; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #111827; }
  h1 { margin: 0; font-size: 20px; letter-spacing: 0.04em; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #9ca3af; padding: 4px 5px; vertical-align: middle; }
  th { background: #f3f4f6; font-size: 11px; text-align: center; }
  .c { text-align: center; }
  .r { text-align: right; white-space: nowrap; }
  .barcode { font-family: "Courier New", monospace; font-size: 12px; letter-spacing: 0.5px; word-break: break-all; }
  .totals { margin-top: 10px; margin-left: auto; width: 260px; }
  .totals div { display: flex; justify-content: space-between; padding: 2px 0; }
  .totals .grand { border-top: 2px solid #111827; font-weight: 700; font-size: 14px; margin-top: 4px; padding-top: 4px; }
  .sign { margin-top: 36px; display: flex; justify-content: space-between; gap: 40px; }
  .sign div { flex: 1; border-top: 1px solid #111827; padding-top: 4px; text-align: center; }
  .note { margin-top: 14px; font-size: 10px; color: #6b7280; }
</style>
</head>
<body>
  <div class="head">
    <div>
      <div style="font-weight:700;font-size:14px">${escapeHtml(rs.storeName || "UZKO SAVDO")}</div>
      ${rs.showPhone && rs.phone ? `<div>Tel: ${escapeHtml(rs.phone)}</div>` : ""}
      ${rs.showAddress && rs.address ? `<div>${escapeHtml(rs.address)}</div>` : ""}
    </div>
    <div style="text-align:right">
      <h1>NAKLADNOY</h1>
      <div>№ ${escapeHtml(receipt.id)}</div>
      <div>${escapeHtml(fmtDate(receipt.date))}</div>
      ${customer}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>№</th>
        ${showImages ? "<th>Rasm</th>" : ""}
        <th>Tovar nomi</th>
        <th>Artikul</th>
        <th>Shtrix kod</th>
        <th>Birlik</th>
        <th>Miqdor</th>
        <th>Narx</th>
        <th>Summa</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div><span>Oraliq:</span><span>${escapeHtml(formatSom(receipt.subtotal))}</span></div>
    ${receipt.discount > 0 ? `<div><span>Skidka:</span><span>−${escapeHtml(formatSom(receipt.discount))}</span></div>` : ""}
    <div class="grand"><span>JAMI:</span><span>${escapeHtml(formatSom(receipt.total))}</span></div>
  </div>

  <div class="sign">
    <div>Topshirdi</div>
    <div>Qabul qildi</div>
  </div>
  <div class="note">${escapeHtml(rs.extraNote || "")}</div>
  <script>window.onload = () => { window.focus(); window.print(); };</script>
</body>
</html>`;
}
