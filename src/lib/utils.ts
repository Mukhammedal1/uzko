import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumberInput(value: number | string) {
  const text = String(value ?? "")
    .replace(/\s/g, "")
    .replace(/,/g, ".");
  if (!text) return "";
  const number = Number(text);
  if (!Number.isFinite(number)) return "";
  const [whole, fraction] = text.split(".");
  const normalizedWhole = String(Math.trunc(Math.abs(number))).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    " ",
  );
  const sign = number < 0 ? "-" : "";
  return fraction !== undefined && fraction.length > 0
    ? `${sign}${normalizedWhole}.${fraction}`
    : `${sign}${normalizedWhole}`;
}

export function parseNumberInput(value: string) {
  const cleaned = value.replace(/\s/g, "").replace(/,/g, ".");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}
