import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/verify-code")({
  head: () => ({
    meta: [
      { title: "Kodni tasdiqlash — UZKO" },
      { name: "description", content: "Telefon raqamini tasdiqlash kodi" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  component: VerifyCodePage,
});

const FONT_FAMILY = "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif";
const CODE_LENGTH = 4;
const RESEND_SECONDS = 30;

function maskPhone(phone: string) {
  const digits = phone.replace(/^\+/, "");
  if (digits.length < 4) return phone;
  const head = digits.slice(0, digits.length - 6);
  const tail = digits.slice(-2);
  return `+${head}${"*".repeat(digits.length - head.length - 2)}${tail}`;
}

function VerifyCodePage() {
  const { pending, devOtp, confirmCode, resendCode, cancelVerification } = useAuth();
  const navigate = useNavigate();
  const [digits, setDigits] = React.useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(RESEND_SECONDS);
  const inputsRef = React.useRef<(HTMLInputElement | null)[]>([]);

  React.useEffect(() => {
    if (!pending) {
      navigate({ to: "/login", replace: true });
    }
  }, [pending, navigate]);

  React.useEffect(() => {
    if (devOtp) {
      toast.info(`Demo rejimida tasdiqlash kodi: ${devOtp}`);
    }
  }, [devOtp]);

  React.useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  if (!pending) return null;

  const phoneLabel = maskPhone(pending.phone);

  const submit = (code: string) => {
    setSubmitting(true);
    const result = confirmCode(code);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      toast.error(result.error);
      setDigits(Array(CODE_LENGTH).fill(""));
      inputsRef.current[0]?.focus();
      return;
    }
    navigate({ to: "/", replace: true });
  };

  const handleChange = (index: number, raw: string) => {
    const value = raw.replace(/\D/g, "");
    setError(null);
    if (!value) {
      setDigits((prev) => {
        const next = [...prev];
        next[index] = "";
        return next;
      });
      return;
    }
    const chars = value.split("");
    setDigits((prev) => {
      const next = [...prev];
      let i = index;
      for (const ch of chars) {
        if (i >= CODE_LENGTH) break;
        next[i] = ch;
        i += 1;
      }
      const nextEmpty = next.findIndex((d) => !d);
      const focusIndex = nextEmpty === -1 ? CODE_LENGTH - 1 : nextEmpty;
      requestAnimationFrame(() => inputsRef.current[focusIndex]?.focus());
      if (next.every((d) => d)) submit(next.join(""));
      return next;
    });
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    resendCode();
    setCooldown(RESEND_SECONDS);
    setDigits(Array(CODE_LENGTH).fill(""));
    setError(null);
    inputsRef.current[0]?.focus();
  };

  const handleBack = () => {
    cancelVerification();
    navigate({ to: pending.type === "register" ? "/register" : "/login" });
  };

  return (
    <div
      className="flex min-h-dvh w-full items-center justify-center bg-white px-4 py-10"
      style={{ fontFamily: FONT_FAMILY }}
    >
      <div className="w-full max-w-md rounded-[18px] bg-card p-8 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.15)] sm:p-10">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-3xl font-bold text-foreground">Kodni tasdiqlash</h1>
          <p className="mt-2 text-base text-muted-foreground">
            <span className="font-medium text-foreground">{phoneLabel}</span> raqamiga yuborilgan{" "}
            {CODE_LENGTH} xonali kodni kiriting
          </p>
        </div>

        <div className="mt-8 flex justify-center gap-3">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={CODE_LENGTH}
              disabled={submitting}
              className="h-14 w-14 rounded-[10px] border border-input text-center text-2xl font-bold text-foreground shadow-sm transition-colors duration-200 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
            />
          ))}
        </div>

        {error && <p className="mt-4 text-center text-sm text-destructive">{error}</p>}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Demo rejim: <span className="font-medium text-foreground">0000</span> kodi doim ishlaydi
        </p>

        <Button
          type="button"
          className="mt-8 h-[52px] w-full rounded-[10px] bg-primary text-base font-semibold text-primary-foreground shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg active:translate-y-0"
          disabled={submitting || digits.some((d) => !d)}
          onClick={() => submit(digits.join(""))}
        >
          Tasdiqlash
        </Button>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {cooldown > 0 ? (
            <span>Kodni qayta yuborish {cooldown}s</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              className="font-medium text-primary transition-colors duration-200 hover:text-primary/80 hover:underline"
            >
              Kodni qayta yuborish
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleBack}
          className="mt-4 w-full text-center text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          Orqaga qaytish
        </button>
      </div>

      <Toaster position="top-center" richColors />
    </div>
  );
}
