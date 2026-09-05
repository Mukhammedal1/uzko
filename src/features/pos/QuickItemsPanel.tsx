import * as React from "react";
import { formatSom } from "@/lib/mock-data";
import type { Product } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const ROWS = 2;
const MIN_HEIGHT = 90;
const MAX_HEIGHT = 420;
export const QUICK_DEFAULT_HEIGHT = 216;

function tileMetrics(height: number) {
  const t = (height - MIN_HEIGHT) / (MAX_HEIGHT - MIN_HEIGHT);
  const tileWidth = Math.round(170 + t * 140);
  const imagePx = Math.round(44 + t * 70);
  return { tileWidth, imagePx };
}

function stockLabel(qty: number) {
  if (qty <= 0) return { label: "Tugagan", className: "bg-[#FBEBE9] text-[#C0392B]" };
  if (qty <= 10) return { label: `${qty} dona`, className: "bg-[#FDF0E3] text-[#B4530A]" };
  return { label: `${qty} dona`, className: "bg-[#E7F5EF] text-[#12805C]" };
}

type Props = {
  products: Product[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  height: number;
  onHeightChange: (height: number) => void;
  onPick: (product: Product) => void;
};

export function QuickItemsPanel({
  products,
  collapsed,
  onToggleCollapsed,
  height,
  onHeightChange,
  onPick,
}: Props) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const { tileWidth, imagePx } = tileMetrics(height);

  const handleDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (collapsed) return;
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = height;
    setDragging(true);
    const handleMove = (moveEvent: PointerEvent) => {
      const delta = startY - moveEvent.clientY;
      const next = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startHeight + delta));
      onHeightChange(next);
    };
    const handleUp = () => {
      setDragging(false);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <div className="flex-shrink-0 bg-[#FBF8EF]">
      {!collapsed && (
        <div
          onPointerDown={handleDragStart}
          className={cn(
            "group flex h-3 w-full cursor-ns-resize items-center justify-center border-t border-[#E2E7F0]",
            dragging && "bg-[#0836B0]/10",
          )}
          title="Balandlikni o'zgartirish uchun torting"
        >
          <span
            className={cn(
              "h-1 w-10 rounded-full bg-[#E2E7F0] transition-colors group-hover:bg-[#0836B0]/60",
              dragging && "bg-[#0836B0]",
            )}
          />
        </div>
      )}

      <div className={cn("p-2", collapsed && "border-t border-[#E2E7F0]")}>
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#737D91]">
            Tezkor tovarlar
          </span>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="flex h-6 w-6 items-center justify-center rounded-[8px] border border-[#E2E7F0] text-[#737D91] hover:border-[#0836B0]"
            aria-label={collapsed ? "Tezkor tovarlarni ko'rsatish" : "Tezkor tovarlarni yashirish"}
          >
            {collapsed ? "▲" : "▼"}
          </button>
        </div>

        {!collapsed && (
          <div
            ref={scrollRef}
            className="mt-1.5 grid grid-flow-col gap-2 overflow-x-auto"
            style={{
              gridTemplateRows: `repeat(${ROWS}, 1fr)`,
              gridAutoColumns: tileWidth,
              height,
              scrollSnapType: "x mandatory",
            }}
          >
            {products.map((product) => (
              <div key={product.id} style={{ scrollSnapAlign: "start" }}>
                <QuickTile product={product} imagePx={imagePx} onPick={() => onPick(product)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickTile({
  product,
  imagePx,
  onPick,
}: {
  product: Product;
  imagePx: number;
  onPick: () => void;
}) {
  const outOfStock = product.vitrinaQty <= 0;
  const stock = stockLabel(product.vitrinaQty);
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={outOfStock}
      className={cn(
        "flex h-full w-full items-center gap-2.5 rounded-[8px] border border-[#E2E7F0] bg-white p-2 text-left transition-colors",
        outOfStock ? "cursor-not-allowed opacity-60" : "hover:border-[#0836B0]",
      )}
      title={product.name}
    >
      <div
        className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-[#F4F6FA]"
        style={{ width: imagePx, height: imagePx }}
      >
        {product.image ? (
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-bold text-[#737D91]">
            {product.name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <div className="line-clamp-2 text-xs leading-[1.35] text-[#222C3B]">{product.name}</div>
        <div className="mt-1 truncate text-xs font-bold text-[#222C3B]">
          {formatSom(product.price)}
        </div>
        <span
          className={cn(
            "mt-1 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold",
            stock.className,
          )}
        >
          {stock.label}
        </span>
      </div>
    </button>
  );
}
