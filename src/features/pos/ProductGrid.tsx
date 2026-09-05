import type { Product } from "@/lib/mock-data";
import { ProductCard } from "./ProductCard";

type Props = {
  products: Product[];
  cartQuantities: Record<string, number>;
  onPick: (product: Product) => void;
};

export function ProductGrid({ products, cartQuantities, onPick }: Props) {
  if (products.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#737D91]">
        Hech narsa topilmadi
      </div>
    );
  }

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}
    >
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          quantityInCart={cartQuantities[product.id] ?? 0}
          onPick={() => onPick(product)}
        />
      ))}
    </div>
  );
}
