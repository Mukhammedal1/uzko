import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Phone as PhoneIcon,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { isValidPhone, ROLE_OPTIONS, useAuth, type Role } from "@/lib/auth-context";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Ro'yxatdan o'tish — UZKO" },
      { name: "description", content: "UZKO tizimida yangi hisob yaratish" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@800&display=swap",
      },
    ],
  }),
  component: RegisterPage,
});

const ROLE_VALUES = ROLE_OPTIONS.map((r) => r.value) as [Role, ...Role[]];

const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "F.I.O. kamida 2 ta belgidan iborat bo'lishi kerak"),
    companyName: z.string().trim().min(2, "Tashkilot nomini kiriting"),
    phone: z
      .string()
      .min(1, "Telefon raqamni kiriting")
      .refine(isValidPhone, "Telefon raqam noto'g'ri formatda"),
    password: z.string().min(8, "Parol kamida 8 ta belgidan iborat bo'lishi kerak"),
    confirmPassword: z.string().min(1, "Parolni tasdiqlang"),
    role: z.enum(ROLE_VALUES, { errorMap: () => ({ message: "Lavozimni tanlang" }) }),
    customRole: z.string().trim().optional(),
    agreeTerms: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Parollar mos kelmadi",
    path: ["confirmPassword"],
  })
  .refine((data) => data.role !== "other" || !!data.customRole?.length, {
    message: "Lavozimingizni kiriting",
    path: ["customRole"],
  })
  .refine((data) => data.agreeTerms, {
    message: "Davom etish uchun shartlarga rozilik bildiring",
    path: ["agreeTerms"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

const FONT_FAMILY = "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif";

const FIELD =
  "h-[42px] rounded-[10px] border-input pl-11 text-sm shadow-sm transition-colors duration-200 placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15";

const PRIMARY_BUTTON =
  "h-[44px] w-full rounded-[10px] bg-primary text-base font-semibold text-primary-foreground shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg active:translate-y-0";

const OUTLINE_BUTTON =
  "h-[44px] w-full rounded-[10px] border-2 border-primary bg-card text-base font-semibold text-primary shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/5 hover:shadow-md active:translate-y-0";

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

function RegisterPage() {
  const { requestRegister } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      companyName: "",
      phone: "",
      password: "",
      confirmPassword: "",
      role: undefined,
      customRole: "",
      agreeTerms: false,
    },
  });

  const role = form.watch("role");
  const agreeTerms = form.watch("agreeTerms");

  const onSubmit = async (values: RegisterValues) => {
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 350));
    const result = requestRegister({
      fullName: values.fullName,
      companyName: values.companyName,
      phone: values.phone,
      password: values.password,
      role: values.role,
      customRole: values.customRole,
    });
    setSubmitting(false);
    if (!result.ok) {
      form.setError("phone", { message: result.error });
      toast.error(result.error);
      return;
    }
    navigate({ to: "/verify-code" });
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden" style={{ fontFamily: FONT_FAMILY }}>
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

      <div className="flex w-full flex-col items-center justify-center overflow-hidden bg-white px-4 py-4 md:w-3/5">
        <div className="w-full max-w-md rounded-[18px] bg-card p-6 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.15)] sm:p-7">
          <div className="flex flex-col items-center text-center">
            <img
              src="/uzko-logo.jpg"
              alt="UZKO"
              className="h-12 w-12 object-contain"
              style={{ mixBlendMode: "multiply" }}
            />
            <h1 className="mt-2 text-2xl font-bold text-foreground">Ro'yxatdan o'tish</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Yangi hisob yaratish uchun ma'lumotlarni kiriting
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-3" noValidate>
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">F.I.O.</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                        <Input
                          {...field}
                          autoFocus
                          autoComplete="name"
                          placeholder="Familiya Ism Otasining ismi"
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
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">
                      MCHJ (Tashkilot) nomi
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                        <Input {...field} placeholder="MCHJ nomini kiriting" className={FIELD} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">
                      Telefon raqami
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <PhoneIcon className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                        <Input
                          {...field}
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="+998 90 123 45 67"
                          className={FIELD}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700">Parol</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="Parol kiriting"
                            className={`${FIELD} pr-11`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200 hover:text-slate-600"
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

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700">
                        Parolni tasdiqlang
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                          <Input
                            {...field}
                            type={showConfirmPassword ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="Qayta kiriting"
                            className={`${FIELD} pr-11`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword((v) => !v)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200 hover:text-slate-600"
                            aria-label={
                              showConfirmPassword ? "Parolni yashirish" : "Parolni ko'rsatish"
                            }
                            tabIndex={-1}
                          >
                            {showConfirmPassword ? (
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
              </div>

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">
                      MCHJ dagi rolingiz
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <div className="relative">
                          <Users className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                          <SelectTrigger className={FIELD}>
                            <SelectValue placeholder="Rolni tanlang" />
                          </SelectTrigger>
                        </div>
                      </FormControl>
                      <SelectContent>
                        {ROLE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {role === "other" && (
                <FormField
                  control={form.control}
                  name="customRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700">
                        Lavozimingizni kiriting
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Masalan: Marketolog"
                          className="h-[50px] rounded-[10px] border-slate-200 text-base shadow-sm transition-colors duration-200 placeholder:text-slate-400 focus-visible:border-[#2563EB] focus-visible:ring-4 focus-visible:ring-[#2563EB]/15"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="agreeTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        id="agreeTerms"
                        className="mt-0.5 transition-colors duration-200 data-[state=checked]:border-[#2563EB] data-[state=checked]:bg-[#2563EB]"
                      />
                    </FormControl>
                    <div className="ml-2 space-y-1">
                      <FormLabel
                        htmlFor="agreeTerms"
                        className="cursor-pointer text-sm font-normal leading-snug text-slate-600"
                      >
                        Men{" "}
                        <span className="font-medium text-[#0F172A]">"Foydalanish shartlari"</span>{" "}
                        va <span className="font-medium text-[#0F172A]">"Maxfiylik siyosati"</span>{" "}
                        bilan tanishdim va roziman.
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <Button type="submit" className={PRIMARY_BUTTON} disabled={submitting || !agreeTerms}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Ro'yxatdan o'tish
              </Button>
            </form>
          </Form>

          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 text-xs text-muted-foreground">Hisobingiz bormi?</span>
            </div>
          </div>

          <Button asChild className={OUTLINE_BUTTON}>
            <Link to="/login">Kirish oynasiga o'tish</Link>
          </Button>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} UZKO. Barcha huquqlar himoyalangan.
          </p>
        </div>
      </div>

      <Toaster position="top-center" richColors />
    </div>
  );
}
