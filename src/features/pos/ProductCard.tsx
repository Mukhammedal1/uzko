import { formatSom } from "@/lib/mock-data";
import type { Product } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Props = {
  product: Product;
  quantityInCart: number;
  onPick: () => void;
};

function stockTone(qty: number) {
  if (qty <= 0) return { label: "Tugagan", color: "text-[#C0392B]" };
  if (qty <= 10) return { label: `${qty} dona qoldi`, color: "text-[#B4530A]" };
  return { label: `${qty} dona qoldi`, color: "text-[#12805C]" };
}

export function ProductCard({ product, quantityInCart, onPick }: Props) {
  const outOfStock = product.vitrinaQty <= 0;
  const stock = stockTone(product.vitrinaQty);

  return (
    <button
      type="button"
      onClick={onPick}
      disabled={outOfStock}
      className={cn(
        "flex flex-col overflow-hidden rounded-[8px] border border-[#E2E7F0] bg-white text-left transition-colors",
        outOfStock ? "cursor-not-allowed opacity-60" : "hover:border-[#0836B0]",
      )}
    >
      <div className="relative aspect-square w-full bg-[#F4F6FA]">
        {product.image ? (
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-[#737D91]">
            {product.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        {quantityInCart > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#0836B0] px-1.5 text-xs font-bold text-white">
            {quantityInCart}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2">
        <div className="line-clamp-2 text-sm leading-[1.35] text-[#222C3B]">{product.name}</div>
        <div className="mt-auto flex items-center justify-between gap-1">
          <span className={cn("text-xs font-medium", stock.color)}>{stock.label}</span>
          <span className="text-sm font-bold text-[#222C3B]">{formatSom(product.price)}</span>
        </div>
      </div>
    </button>
  );
}
