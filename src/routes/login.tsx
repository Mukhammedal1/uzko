import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Lock, Phone as PhoneIcon } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { isValidPhone, useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Kirish — UZKO" }, { name: "description", content: "UZKO tizimiga kirish" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@800&display=swap",
      },
    ],
  }),
  component: LoginPage,
});

const loginSchema = z.object({
  phone: z
    .string()
    .min(1, "Telefon raqamni kiriting")
    .refine(isValidPhone, "Telefon raqam noto'g'ri formatda"),
  password: z.string().min(1, "Parolni kiriting"),
  rememberMe: z.boolean(),
});

type LoginValues = z.infer<typeof loginSchema>;

const FONT_FAMILY = "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif";

const FIELD =
  "h-[50px] rounded-[10px] border-input pl-11 text-base shadow-sm transition-colors duration-200 placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15";

const PRIMARY_BUTTON =
  "h-[52px] w-full rounded-[10px] bg-primary text-base font-semibold text-primary-foreground shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg active:translate-y-0";

const OUTLINE_BUTTON =
  "h-[52px] w-full rounded-[10px] border-2 border-primary bg-card text-base font-semibold text-primary shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/5 hover:shadow-md active:translate-y-0";

function BrandBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <span
        className="absolute whitespace-nowrap font-bold leading-none text-white opacity-[0.06]"
        style={{
          left: "20px",
          bottom: "20px",
          fontSize: "clamp(3.5rem, 14vw, 180px)",
          letterSpacing: "0.167em",
        }}
      >
        UZKO
      </span>
    </div>
  );
}

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "", password: "", rememberMe: true },
  });

  const onSubmit = async (values: LoginValues) => {
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 350));
    const result = login(values.phone, values.password, values.rememberMe);
    setSubmitting(false);
    if (!result.ok) {
      form.setError("password", { message: result.error });
      toast.error(result.error);
      return;
    }
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="flex min-h-dvh w-full" style={{ fontFamily: FONT_FAMILY }}>
      <div
        className="relative hidden w-2/5 flex-col items-center justify-center overflow-hidden px-10 text-center md:flex"
        style={{ backgroundColor: "#023e7d" }}
      >
        <BrandBackground />
        <img
          src="/uzko-mark.png"
          alt="UZKO"
          className="absolute top-10 left-1/2 z-10 h-40 w-auto -translate-x-1/2 object-contain"
        />
      </div>

      <div className="flex w-full flex-col items-center justify-center bg-white px-4 py-10 md:w-3/5">
        <div className="w-full max-w-md rounded-[18px] bg-card p-8 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.15)] sm:p-10">
          <div className="flex flex-col items-center text-center">
            <img
              src="/uzko-logo.jpg"
              alt="UZKO"
              className="h-16 w-16 object-contain"
              style={{ mixBlendMode: "multiply" }}
            />
            <h1 className="mt-4 text-4xl font-bold text-foreground">Tizimga kirish</h1>
            <p className="mt-2 text-base text-muted-foreground">
              Hisobingizga kirish uchun ma'lumotlarni kiriting
            </p>
          </div>

          <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Telefon raqami
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <PhoneIcon className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                      <Input
                        {...field}
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        autoFocus
                        placeholder="+998 90 123 45 67"
                        className={FIELD}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">Parol</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Parolingizni kiriting"
                        className={`${FIELD} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors duration-200 hover:text-foreground"
                        aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-[18px] w-[18px]" />
                        ) : (
                          <Eye className="h-[18px] w-[18px]" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        id="rememberMe"
                        className="transition-colors duration-200 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                      />
                    </FormControl>
                    <FormLabel
                      htmlFor="rememberMe"
                      className="ml-2 cursor-pointer text-sm font-normal text-muted-foreground"
                    >
                      Meni eslab qolish
                    </FormLabel>
                  </FormItem>
                )}
              />
              <Link
                to="/login"
                onClick={(e) => {
                  e.preventDefault();
                  toast.info("Parolni tiklash uchun administratorga murojaat qiling");
                }}
                className="text-sm font-medium text-primary transition-colors duration-200 hover:text-primary/80 hover:underline"
              >
                Parolni unutdingizmi?
              </Link>
            </div>

            <Button type="submit" className={PRIMARY_BUTTON} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Kirish
            </Button>
          </form>
        </Form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-card px-3 text-xs text-muted-foreground">Hisobingiz yo'qmi?</span>
          </div>
        </div>

        <Button asChild className={OUTLINE_BUTTON}>
          <Link to="/register">Ro'yxatdan o'tish</Link>
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} UZKO.
          <br />
          Barcha huquqlar himoyalangan.
        </p>
        </div>
      </div>

      <Toaster position="top-center" richColors />
    </div>
  );
}
