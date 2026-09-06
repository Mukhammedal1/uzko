import { Eye } from "lucide-react";
import { formatSom } from "@/lib/mock-data";
import type { Product } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Size = "lg" | "md";

type Props = {
  product: Product;
  quantityInCart: number;
  onPick: () => void;
  onPreview: () => void;
  size: Size;
};

function stockTone(qty: number) {
  if (qty <= 0) return { label: "Tugagan", color: "text-[#C0392B]" };
  if (qty <= 10) return { label: `${qty} dona qoldi`, color: "text-[#B4530A]" };
  return { label: `${qty} dona qoldi`, color: "text-[#12805C]" };
}

export function ProductCard({ product, quantityInCart, onPick, onPreview, size }: Props) {
  const outOfStock = product.vitrinaQty <= 0;
  const stock = stockTone(product.vitrinaQty);
  const isLg = size === "lg";
  const noBarcode = !product.barcode;

  return (
    <div
      role="button"
      tabIndex={outOfStock ? -1 : 0}
      onClick={() => !outOfStock && onPick()}
      onKeyDown={(event) => {
        if (!outOfStock && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onPick();
        }
      }}
      className={cn(
        "flex h-full w-full select-none flex-col overflow-hidden rounded-[10px] border border-[#E2E7F0] bg-white text-left transition-colors touch-manipulation",
        outOfStock ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-[#0836B0]",
      )}
    >
      <div
        className="relative w-full flex-shrink-0 bg-[#F4F6FA]"
        style={{ height: isLg ? 92 : 64 }}
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className={cn(
              "flex h-full w-full items-center justify-center font-bold text-[#737D91]",
              isLg ? "text-3xl" : "text-xl",
            )}
          >
            {product.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        {noBarcode && (
          <span
            className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/45 text-[11px] font-bold text-white"
            title="Shtrix kodsiz tovar"
          >
            Ø
          </span>
        )}
        {quantityInCart > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#0836B0] px-1.5 text-xs font-bold text-white">
            {quantityInCart}
          </span>
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onPreview();
          }}
          className="absolute bottom-1.5 right-1.5 flex h-8 w-8 touch-manipulation items-center justify-center rounded-full bg-black/45 text-white"
          aria-label="Rasmni to'liq ko'rish"
          title="Rasmni to'liq ko'rish"
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>
      <div className={cn("flex flex-1 flex-col gap-1", isLg ? "p-3" : "p-2")}>
        <div
          className={cn(
            "line-clamp-2 leading-[1.35] text-[#222C3B]",
            isLg ? "text-base font-medium" : "text-sm",
          )}
        >
          {product.name}
        </div>
        <div className="mt-auto flex items-center justify-between gap-1">
          <span className={cn("font-medium", isLg ? "text-sm" : "text-xs", stock.color)}>
            {stock.label}
          </span>
          <span className={cn("font-bold text-[#222C3B]", isLg ? "text-base" : "text-sm")}>
            {formatSom(product.price)}
          </span>
        </div>
      </div>
    </div>
  );
}
