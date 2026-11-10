import * as React from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type SaleTabInfo = {
  id: string;
  /** Faqat raqam: 1, 2, 3 ... */
  index: number;
  itemCount: number;
};

type Props = {
  sales: SaleTabInfo[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
};

export function SaleTabsBar({ sales, activeId, onSelect, onAdd, onRemove }: Props) {
  const [confirmId, setConfirmId] = React.useState<string | null>(null);

  const tryRemove = (s: SaleTabInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sales.length <= 1) return;
    if (s.itemCount > 0) setConfirmId(s.id);
    else onRemove(s.id);
  };

  return (
    <TooltipProvider delayDuration={250}>
      <div className="sale-tabs-scroll flex w-full max-w-[17rem] items-center gap-1 overflow-x-auto pb-1">
        {sales.map((s) => {
          const isActive = s.id === activeId;
          return (
            <Tooltip key={s.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSelect(s.id)}
                  className={cn(
                    "group relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-xs font-bold tabular-nums transition-all",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                  aria-label={`Sotuv ${s.index}`}
                >
                  {s.index}
                  {s.itemCount > 0 && (
                    <span
                      className={cn(
                        "absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[9px] font-bold leading-none",
                        isActive
                          ? "bg-background text-primary"
                          : "bg-primary text-primary-foreground",
                      )}
                    >
                      {s.itemCount}
                    </span>
                  )}
                  {sales.length > 1 && (
                    <span
                      onClick={(e) => tryRemove(s, e)}
                      className={cn(
                        "absolute -left-1 -top-1 hidden h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-destructive-foreground group-hover:flex hover:scale-110",
                      )}
                      role="button"
                      aria-label="O'chirish"
                    >
                      <X className="h-2.5 w-2.5" />
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Sotuv {s.index}
                {s.itemCount > 0 && ` · ${s.itemCount} mahsulot`}
              </TooltipContent>
            </Tooltip>
          );
        })}

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onAdd}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-dashed text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
              aria-label="Yangi sotuv"
            >
              <Plus className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Yangi sotuv (tezkor)
          </TooltipContent>
        </Tooltip>
      </div>

      <AlertDialog open={confirmId !== null} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sotuvni o'chirish?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu sotuv savatchasida mahsulotlar bor. O'chirsangiz hammasi yo'qoladi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmId) onRemove(confirmId);
                setConfirmId(null);
              }}
            >
              O'chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
