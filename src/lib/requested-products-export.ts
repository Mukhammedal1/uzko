import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { REQUESTER_LABELS, type RequestedProductGroup } from "@/lib/requested-products";

function fmtDate(value: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

function fmtTotals(totals: Record<string, number>) {
  const parts = Object.entries(totals).map(([unit, qty]) => `${Number(qty.toFixed(2))} ${unit}`);
  return parts.length ? parts.join(", ") : "-";
}

function fmtRequesters(group: RequestedProductGroup) {
  return (
    Object.entries(group.requesterTypes)
      .map(
        ([type, count]) => `${REQUESTER_LABELS[type as keyof typeof REQUESTER_LABELS]} (${count})`,
      )
      .join(", ") || "-"
  );
}

function fileName(ext: string) {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `talab-qilingan-tovarlar-${stamp}.${ext}`;
}

/** Excel: har tovar bitta qator. (Excel faylga rasm joylab bo'lmaydi — rasm faqat PDF'da.) */
export function exportRequestedToExcel(groups: RequestedProductGroup[], periodLabel: string) {
  const rows = groups.map((g, i) => ({
    "№": i + 1,
    Tovar: g.name,
    "So'raldi (marta)": g.count,
    "Jami miqdor": fmtTotals(g.totals),
    Buyurtmachilar: fmtRequesters(g),
    "Eng yaqin muddat": fmtDate(g.nearestDeadline),
    "Oxirgi so'rov": fmtDate(g.lastDate),
    Rasm: g.image ? "bor" : "yo'q",
  }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = [
    { wch: 5 },
    { wch: 36 },
    { wch: 16 },
    { wch: 22 },
    { wch: 34 },
    { wch: 18 },
    { wch: 16 },
    { wch: 8 },
  ];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Talab qilingan tovarlar");
  // Davr haqida qisqa varaq — ta'minotchi qaysi davr ro'yxati ekanini ko'rsin
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.json_to_sheet([
      { Maydon: "Davr", Qiymat: periodLabel },
      { Maydon: "Tovarlar soni", Qiymat: groups.length },
      { Maydon: "Yuklangan sana", Qiymat: fmtDate(new Date().toISOString()) },
    ]),
    "Ma'lumot",
  );
  XLSX.writeFile(book, fileName("xlsx"));
}

/** PDF: jadval + tovar rasmi (birinchi ustunda). */
export function exportRequestedToPdf(groups: RequestedProductGroup[], periodLabel: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(16);
  doc.text("Talab qilingan tovarlar", 40, 40);
  doc.setFontSize(10);
  doc.text(
    `Davr: ${periodLabel}   |   Tovarlar: ${groups.length}   |   ${fmtDate(new Date().toISOString())}`,
    40,
    58,
  );

  const IMG = 34;
  autoTable(doc, {
    startY: 72,
    head: [
      [
        "#",
        "Rasm",
        "Tovar",
        "So'raldi",
        "Jami miqdor",
        "Buyurtmachilar",
        "Eng yaqin muddat",
        "Oxirgi so'rov",
      ],
    ],
    body: groups.map((g, i) => [
      String(i + 1),
      "",
      g.name,
      `${g.count} marta`,
      fmtTotals(g.totals),
      fmtRequesters(g),
      fmtDate(g.nearestDeadline),
      fmtDate(g.lastDate),
    ]),
    styles: { fontSize: 10, cellPadding: 5, valign: "middle", minCellHeight: IMG + 6 },
    headStyles: { fillColor: [12, 51, 160] },
    columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: IMG + 12 }, 2: { cellWidth: 190 } },
    didDrawCell: (data) => {
      if (data.section !== "body" || data.column.index !== 1) return;
      const image = groups[data.row.index]?.image;
      if (!image) return;
      try {
        doc.addImage(image, "JPEG", data.cell.x + 6, data.cell.y + 3, IMG, IMG);
      } catch {
        // rasm o'qilmasa — katak bo'sh qoladi
      }
    },
  });
  doc.save(fileName("pdf"));
}
