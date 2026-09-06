import * as React from "react";
import { CalculatorPopover } from "./CalculatorPopover";
import { MOCK_RATES } from "@/lib/mock-data";
import {
  Calculator,
  CalendarDays,
  DollarSign,
  Maximize,
  Minimize,
  Minus,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { MAX_ZOOM, MIN_ZOOM, useZoom } from "@/hooks/use-zoom";

type Props = {
  /** Kalkulator va valyuta orasiga joylashadigan slot (Sotuv tablari) */
  middleSlot?: React.ReactNode;
  afterCalculatorSlot?: React.ReactNode;
};

export function BottomBar({ middleSlot, afterCalculatorSlot }: Props) {
  const [date, setDate] = React.useState<Date | undefined>(undefined);
  const [dateStr, setDateStr] = React.useState("Sana");
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  const { zoom, setZoom, zoomIn, zoomOut, canZoomIn, canZoomOut } = useZoom();

  React.useEffect(() => {
    const today = new Date();
    setDate(today);
    const months = [
      "yanvar",
      "fevral",
      "mart",
      "aprel",
      "may",
      "iyun",
      "iyul",
      "avgust",
      "sentabr",
      "oktabr",
      "noyabr",
      "dekabr",
    ];
    const weekdays = [
      "yakshanba",
      "dushanba",
      "seshanba",
      "chorshanba",
      "payshanba",
      "juma",
      "shanba",
    ];
    const w = weekdays[today.getDay()];
    const d = today.getDate();
    const m = months[today.getMonth()];
    const y = today.getFullYear();
    setDateStr(`${w}, ${d}-${m}, ${y}`);
  }, []);

  return (
    <div className="uzko-bottombar flex min-h-16 flex-shrink-0 items-center justify-between gap-3 border-t bg-card px-5 py-2.5">
      <div className="uzko-bottom-left flex items-center gap-2.5">
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11"
          onClick={toggleFullscreen}
          title={isFullscreen ? "To'liq ekrandan chiqish" : "To'liq ekran"}
          aria-label={isFullscreen ? "To'liq ekrandan chiqish" : "To'liq ekran"}
        >
          {isFullscreen ? (
            <Minimize className="h-5 w-5 text-primary" />
          ) : (
            <Maximize className="h-5 w-5 text-primary" />
          )}
        </Button>

        <div className="flex h-11 items-center gap-2 rounded-md border bg-background px-2.5">
          <button
            type="button"
            onClick={zoomOut}
            disabled={!canZoomOut}
            title="Kichiklashtirish"
            aria-label="Ekranni kichiklashtirish"
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <Slider
            value={[zoom]}
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={10}
            onValueChange={([value]) => setZoom(value)}
            className="w-24"
          />
          <button
            type="button"
            onClick={zoomIn}
            disabled={!canZoomIn}
            title="Kattalashtirish"
            aria-label="Ekranni kattalashtirish"
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
          <span className="w-10 select-none text-right text-sm font-semibold tabular-nums text-muted-foreground">
            {zoom}%
          </span>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11"
              title={dateStr}
              aria-label={dateStr}
            >
              <CalendarDays className="h-5 w-5 text-primary" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={date} onSelect={setDate} />
          </PopoverContent>
        </Popover>

        <CalculatorPopover
          trigger={
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11"
              title="Kalkulator"
              aria-label="Kalkulator"
            >
              <Calculator className="h-5 w-5 text-primary" />
            </Button>
          }
        />

        {afterCalculatorSlot}
      </div>

      {middleSlot && (
        <div className="uzko-bottom-middle flex min-w-0 flex-1 items-center justify-center px-2">
          {middleSlot}
        </div>
      )}

      <div className="uzko-rates flex items-center gap-2">
        <RateChip code="USD" rate={MOCK_RATES.USD} />
        <RateChip code="RUB" rate={MOCK_RATES.RUB} />
        <RateChip code="EUR" rate={MOCK_RATES.EUR} />
      </div>
    </div>
  );
}

function RateChip({ code, rate }: { code: string; rate: number }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
      <DollarSign className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-semibold text-muted-foreground">{code}</span>
      <span className="text-sm font-bold tabular-nums text-foreground">
        {String(rate).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
      </span>
    </div>
  );
}
