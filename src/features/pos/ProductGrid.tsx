import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Product } from "@/lib/mock-data";
import { ProductCard } from "./ProductCard";

export type ProductGridMode = "pinned" | "search";

type Props = {
  products: Product[];
  cartQuantities: Record<string, number>;
  onPick: (product: Product) => void;
  onPreview: (product: Product) => void;
  mode: ProductGridMode;
  query: string;
};

// Katalog 600–7000 tovar bo'lishi mumkin — grid hech qachon to'liq chizilmaydi,
// faqat oyna ichida ko'ringan qatorlar virtualizatsiya bilan render qilinadi.
const CARD_MIN_WIDTH: Record<ProductGridMode, number> = { pinned: 184, search: 152 };
const ROW_HEIGHT: Record<ProductGridMode, number> = { pinned: 246, search: 192 };
const GAP = 12;

export function ProductGrid({ products, cartQuantities, onPick, onPreview, mode, query }: Props) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const [columns, setColumns] = React.useState(1);

  React.useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const update = () => {
      const minWidth = CARD_MIN_WIDTH[mode];
      const next = Math.max(1, Math.floor((el.clientWidth + GAP) / (minWidth + GAP)));
      setColumns(next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [mode]);

  const rowCount = Math.ceil(products.length / columns);
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT[mode],
    overscan: 4,
  });

  const label =
    mode === "pinned"
      ? "Tezkor panel"
      : `"${query.trim()}" bo'yicha natija · ${products.length} ta`;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-shrink-0 px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-[#737D91]">
        {label}
      </div>

      {products.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-[#737D91]">
          Hech narsa topilmadi
        </div>
      ) : (
        <div ref={parentRef} className="min-h-0 flex-1 touch-manipulation overflow-y-auto">
          <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const start = virtualRow.index * columns;
              const rowItems = products.slice(start, start + columns);
              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`,
                    display: "grid",
                    gridTemplateColumns: `repeat(${columns}, 1fr)`,
                    gap: GAP,
                    paddingBottom: GAP,
                  }}
                >
                  {rowItems.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      quantityInCart={cartQuantities[product.id] ?? 0}
                      onPick={() => onPick(product)}
                      onPreview={() => onPreview(product)}
                      size={mode === "pinned" ? "lg" : "md"}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
