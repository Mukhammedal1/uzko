import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calculator } from "lucide-react";

type Props = {
  trigger?: React.ReactNode;
  initialValue?: string;
  onUse?: (value: number) => void;
};

export function CalculatorPopover({ trigger, initialValue, onUse }: Props) {
  const [display, setDisplay] = React.useState(initialValue ?? "0");
  const [prev, setPrev] = React.useState<number | null>(null);
  const [op, setOp] = React.useState<string | null>(null);
  const [waiting, setWaiting] = React.useState(false);

  const inputDigit = (d: string) => {
    if (waiting) {
      setDisplay(d);
      setWaiting(false);
    } else {
      setDisplay(display === "0" ? d : display + d);
    }
  };

  const inputDot = () => {
    if (waiting) {
      setDisplay("0.");
      setWaiting(false);
      return;
    }
    if (!display.includes(".")) setDisplay(display + ".");
  };

  const clear = () => {
    setDisplay("0");
    setPrev(null);
    setOp(null);
    setWaiting(false);
  };

  const performOp = (next: string) => {
    const value = parseFloat(display);
    if (prev === null) {
      setPrev(value);
    } else if (op) {
      const result = compute(prev, value, op);
      setPrev(result);
      setDisplay(String(result));
    }
    setOp(next);
    setWaiting(true);
  };

  const compute = (a: number, b: number, operator: string): number => {
    switch (operator) {
      case "+":
        return a + b;
      case "-":
        return a - b;
      case "×":
        return a * b;
      case "÷":
        return b === 0 ? 0 : a / b;
      default:
        return b;
    }
  };

  const equals = () => {
    const value = parseFloat(display);
    if (op && prev !== null) {
      const result = compute(prev, value, op);
      setDisplay(String(result));
      setPrev(null);
      setOp(null);
      setWaiting(true);
    }
  };

  const btn = "h-11 text-base font-medium";

  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="icon" aria-label="Kalkulator">
            <Calculator className="h-4 w-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="mb-3 rounded-md border bg-muted/50 px-3 py-2 text-right font-mono text-xl tabular-nums">
          {display}
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Button variant="secondary" className={btn} onClick={clear}>
            C
          </Button>
          <Button
            variant="secondary"
            className={btn}
            onClick={() => setDisplay(String(-parseFloat(display)))}
          >
            ±
          </Button>
          <Button
            variant="secondary"
            className={btn}
            onClick={() => setDisplay(String(parseFloat(display) / 100))}
          >
            %
          </Button>
          <Button variant="default" className={btn} onClick={() => performOp("÷")}>
            ÷
          </Button>

          {["7", "8", "9"].map((d) => (
            <Button key={d} variant="outline" className={btn} onClick={() => inputDigit(d)}>
              {d}
            </Button>
          ))}
          <Button variant="default" className={btn} onClick={() => performOp("×")}>
            ×
          </Button>

          {["4", "5", "6"].map((d) => (
            <Button key={d} variant="outline" className={btn} onClick={() => inputDigit(d)}>
              {d}
            </Button>
          ))}
          <Button variant="default" className={btn} onClick={() => performOp("-")}>
            −
          </Button>

          {["1", "2", "3"].map((d) => (
            <Button key={d} variant="outline" className={btn} onClick={() => inputDigit(d)}>
              {d}
            </Button>
          ))}
          <Button variant="default" className={btn} onClick={() => performOp("+")}>
            +
          </Button>

          <Button variant="outline" className={`${btn} col-span-2`} onClick={() => inputDigit("0")}>
            0
          </Button>
          <Button variant="outline" className={btn} onClick={inputDot}>
            .
          </Button>
          <Button variant="default" className={btn} onClick={equals}>
            =
          </Button>
        </div>
        {onUse && (
          <Button className="mt-3 w-full" onClick={() => onUse(parseFloat(display) || 0)}>
            Ishlatish
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
