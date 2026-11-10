import * as React from "react";
import {
  Banknote,
  Columns3,
  KeyRound,
  Pencil,
  Plus,
  Receipt,
  Search,
  ShoppingBag,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumberInput, parseNumberInput, cn } from "@/lib/utils";
import {
  MOCK_EMPLOYEES,
  MOCK_EMPLOYEE_PAYMENTS,
  MOCK_RECEIPTS,
  MOCK_WITHDRAWALS,
  formatSom,
  type CashWithdrawal,
  type Employee,
  type EmployeePaymentKind,
} from "@/lib/mock-data";
import { useApp } from "@/lib/app-context";
import { toast } from "sonner";

const PAYROLL_KINDS: EmployeePaymentKind[] = ["Oylik", "Avans", "Bonus", "Jarima"];

type XodimColumn = "role" | "status" | "phone" | "salary" | "tenure" | "avans" | "jarima" | "sales";

const XODIM_COLUMNS: { key: XodimColumn; label: string }[] = [
  { key: "role", label: "Lavozim" },
  { key: "status", label: "Holat" },
  { key: "phone", label: "Telefon" },
  { key: "salary", label: "Oylik maosh" },
  { key: "tenure", label: "Faoliyat muddati" },
  { key: "avans", label: "Avanslar" },
  { key: "jarima", label: "Jarimalar" },
  { key: "sales", label: "Sotuvlar" },
];

/** Standart holatda yashiringan ustunlar — kerak bo'lsa ustunlar menyusidan yoqiladi. */
const XODIM_DEFAULT_HIDDEN: XodimColumn[] = ["sales"];

const XODIM_HIDDEN_COLUMNS_KEY = "uzko-xodimlar-hidden-columns";

function readHiddenXodimColumns(): Set<XodimColumn> {
  if (typeof window === "undefined") return new Set(XODIM_DEFAULT_HIDDEN);
  try {
    const raw = window.localStorage.getItem(XODIM_HIDDEN_COLUMNS_KEY);
    if (raw === null) return new Set(XODIM_DEFAULT_HIDDEN);
    const parsed = JSON.parse(raw);
    return new Set(
      (Array.isArray(parsed) ? parsed : []).filter((key): key is XodimColumn =>
        XODIM_COLUMNS.some((col) => col.key === key),
      ),
    );
  } catch {
    return new Set(XODIM_DEFAULT_HIDDEN);
  }
}

/** "2 yil 3 oy" kabi — ishga kirgan sanadan hozirgacha o'tgan muddat. */
function formatTenure(hireDate: string | undefined) {
  if (!hireDate) return "—";
  const start = new Date(hireDate);
  if (Number.isNaN(start.getTime())) return "—";
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) return "—";
  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  if (years === 0 && restMonths === 0) return "1 oydan kam";
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yil`);
  if (restMonths > 0) parts.push(`${restMonths} oy`);
  return parts.join(" ");
}

const ROLES = ["Sotuvchi", "Kassir", "Omborchi", "Menejer"] as const;

const STATUS_LABEL: Record<Employee["status"], string> = {
  active: "Faol",
  vacation: "Ta'tilda",
  inactive: "Ishdan bo'shagan",
};

const STATUS_BADGE: Record<Employee["status"], string> = {
  active: "bg-primary/10 text-primary",
  vacation: "bg-amber-500/10 text-amber-600",
  inactive: "bg-muted text-muted-foreground",
};

function nextEmployeeId() {
  const max = MOCK_EMPLOYEES.reduce((acc, e) => {
    const parsed = Number.parseInt(e.id.replace(/\D/g, ""), 10);
    return Number.isFinite(parsed) && parsed > acc ? parsed : acc;
  }, 0);
  return `X-${String(max + 1).padStart(3, "0")}`;
}

function matches(value: string | undefined, query: string) {
  return (value ?? "").toLowerCase().includes(query.trim().toLowerCase());
}

export function XodimlarPage() {
  const { settings } = useApp();
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [query, setQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("all");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingEmployee, setEditingEmployee] = React.useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = React.useState<Employee | null>(null);
  const [moneyOpEmployee, setMoneyOpEmployee] = React.useState<Employee | null>(null);
  const [salesEmployee, setSalesEmployee] = React.useState<Employee | null>(null);
  const [hiddenColumns, setHiddenColumns] =
    React.useState<Set<XodimColumn>>(readHiddenXodimColumns);

  const triggerRefresh = React.useCallback(() => setRefreshKey((v) => v + 1), []);

  const toggleColumn = (key: XodimColumn, visible: boolean) => {
    setHiddenColumns((current) => {
      const next = new Set(current);
      if (visible) next.delete(key);
      else next.add(key);
      try {
        window.localStorage.setItem(XODIM_HIDDEN_COLUMNS_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  };
  const showCol = (key: XodimColumn) => !hiddenColumns.has(key);
  const visibleColCount = 2 + XODIM_COLUMNS.filter((c) => showCol(c.key)).length;

  const salesStats = React.useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    MOCK_RECEIPTS.forEach((receipt) => {
      if (!receipt.employeeId) return;
      const current = map.get(receipt.employeeId) ?? { count: 0, total: 0 };
      current.count += 1;
      current.total += receipt.total;
      map.set(receipt.employeeId, current);
    });
    return map;
  }, [refreshKey]);

  const paymentStats = React.useMemo(() => {
    const map = new Map<string, { avans: number; jarima: number }>();
    MOCK_EMPLOYEE_PAYMENTS.forEach((payment) => {
      const current = map.get(payment.employeeId) ?? { avans: 0, jarima: 0 };
      if (payment.kind === "Avans") current.avans += payment.amount;
      else if (payment.kind === "Jarima") current.jarima += payment.amount;
      map.set(payment.employeeId, current);
    });
    return map;
  }, [refreshKey]);

  const employeeReceipts = React.useMemo(() => {
    if (!salesEmployee) return [];
    return MOCK_RECEIPTS.filter((r) => r.employeeId === salesEmployee.id);
  }, [salesEmployee, refreshKey]);

  const employees = React.useMemo(() => {
    return MOCK_EMPLOYEES.filter((e) => e.source === "manual")
      .filter((e) => roleFilter === "all" || e.role === roleFilter)
      .filter(
        (e) =>
          !query.trim() ||
          matches(e.name, query) ||
          matches(e.role, query) ||
          matches(e.phone, query),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [query, roleFilter, refreshKey]);

  const salesBonusFor = (employee: Employee) => {
    if (employee.payType !== "fixed_plus_sales" || !employee.salesPercent) return 0;
    const sales = salesStats.get(employee.id)?.total ?? 0;
    return (sales * employee.salesPercent) / 100;
  };

  const summary = {
    total: employees.length,
    active: employees.filter((e) => e.status === "active").length,
    salesBonus: employees.reduce((sum, e) => sum + salesBonusFor(e), 0),
    fund: employees
      .filter((e) => e.status === "active")
      .reduce((sum, e) => sum + e.monthlySalary + salesBonusFor(e), 0),
  };

  const totalAvans = React.useMemo(() => {
    const employeeIds = new Set(employees.map((e) => e.id));
    return MOCK_EMPLOYEE_PAYMENTS.filter(
      (payment) => payment.kind === "Avans" && employeeIds.has(payment.employeeId),
    ).reduce((sum, payment) => sum + payment.amount, 0);
  }, [employees, refreshKey]);

  const handleSave = (data: Omit<Employee, "id" | "source">) => {
    if (editingEmployee) {
      const index = MOCK_EMPLOYEES.findIndex((e) => e.id === editingEmployee.id);
      if (index !== -1) {
        MOCK_EMPLOYEES[index] = { ...MOCK_EMPLOYEES[index], ...data };
      }
      toast.success("Xodim ma'lumotlari yangilandi");
    } else {
      MOCK_EMPLOYEES.push({ id: nextEmployeeId(), source: "manual", ...data });
      toast.success("Xodim qo'shildi");
    }
    setFormOpen(false);
    setEditingEmployee(null);
    triggerRefresh();
  };

  const confirmDelete = () => {
    if (!deletingEmployee) return;
    const index = MOCK_EMPLOYEES.findIndex((e) => e.id === deletingEmployee.id);
    if (index !== -1) MOCK_EMPLOYEES.splice(index, 1);
    toast.success(`Xodim o'chirildi: ${deletingEmployee.name}`);
    setDeletingEmployee(null);
    triggerRefresh();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b bg-card p-3">
        <Users className="h-5 w-5 text-primary" />
        <div className="text-base font-semibold">Xodimlar</div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-4">
        <div className="flex h-full min-h-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="grid flex-1 gap-3 md:grid-cols-5">
              <Kpi title="Jami xodimlar" value={`${summary.total} ta`} />
              <Kpi title="Faol xodimlar" value={`${summary.active} ta`} />
              <Kpi title="Sotuv bonusi" value={formatSom(summary.salesBonus)} accent />
              <Kpi title="Joriy kutilayotgan oylik" value={formatSom(summary.fund)} accent />
              <Kpi title="Berilgan avanslar" value={formatSom(totalAvans)} accent />
            </div>
            <Button
              className="gap-2"
              onClick={() => {
                setEditingEmployee(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Yangi xodim
            </Button>
          </div>

          <div className="flex items-center gap-2 rounded-lg border bg-card/70 p-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ism, lavozim yoki telefon raqami bo'yicha qidirish"
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-9 w-44 text-sm">
                <SelectValue placeholder="Lavozim" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha lavozimlar</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="flex min-h-0 flex-1 flex-col">
            <CardHeader className="border-b py-3">
              <CardTitle className="text-base">Xodimlar ro'yxati</CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-auto p-0">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="sticky top-0 z-10 bg-muted text-[10px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Xodim</th>
                    {showCol("role") && <th className="px-4 py-3 text-left">Lavozim</th>}
                    {showCol("status") && <th className="px-4 py-3 text-left">Holat</th>}
                    {showCol("phone") && <th className="px-4 py-3 text-left">Telefon</th>}
                    {showCol("salary") && <th className="px-4 py-3 text-right">Oylik maosh</th>}
                    {showCol("tenure") && <th className="px-4 py-3 text-left">Faoliyat muddati</th>}
                    {showCol("avans") && <th className="px-4 py-3 text-right">Avanslar</th>}
                    {showCol("jarima") && <th className="px-4 py-3 text-right">Jarimalar</th>}
                    {showCol("sales") && <th className="px-4 py-3 text-right">Sotuvlar</th>}
                    <th className="w-32 px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        Amallar
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              title="Ustunlarni sozlash"
                              aria-label="Ustunlarni sozlash"
                            >
                              <Columns3 className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-56 normal-case tracking-normal"
                          >
                            {XODIM_COLUMNS.map((col) => (
                              <DropdownMenuCheckboxItem
                                key={col.key}
                                checked={showCol(col.key)}
                                onCheckedChange={(checked) => toggleColumn(col.key, checked)}
                                onSelect={(e) => e.preventDefault()}
                              >
                                {col.label}
                              </DropdownMenuCheckboxItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => {
                    const stats = salesStats.get(employee.id);
                    const payments = paymentStats.get(employee.id);
                    return (
                      <tr key={employee.id} className="border-b last:border-b-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-muted/30 text-sm font-semibold text-muted-foreground">
                              {employee.name.trim().charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-semibold">{employee.name}</div>
                              <div className="text-xs text-muted-foreground">{employee.id}</div>
                            </div>
                          </div>
                        </td>
                        {showCol("role") && <td className="px-4 py-3">{employee.role}</td>}
                        {showCol("status") && (
                          <td className="px-4 py-3">
                            <Badge
                              variant="secondary"
                              className={cn("text-[10px]", STATUS_BADGE[employee.status])}
                            >
                              {STATUS_LABEL[employee.status]}
                            </Badge>
                          </td>
                        )}
                        {showCol("phone") && <td className="px-4 py-3">{employee.phone || "—"}</td>}
                        {showCol("salary") && (
                          <td className="px-4 py-3 text-right font-semibold">
                            {formatSom(employee.monthlySalary)}
                          </td>
                        )}
                        {showCol("tenure") && (
                          <td className="px-4 py-3">{formatTenure(employee.hireDate)}</td>
                        )}
                        {showCol("avans") && (
                          <td className="px-4 py-3 text-right">
                            {payments && payments.avans > 0 ? (
                              formatSom(payments.avans)
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                        {showCol("jarima") && (
                          <td className="px-4 py-3 text-right">
                            {payments && payments.jarima > 0 ? (
                              <span className="font-semibold text-destructive">
                                {formatSom(payments.jarima)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                        {showCol("sales") && (
                          <td className="px-4 py-3 text-right">
                            {stats ? (
                              <button
                                type="button"
                                onClick={() => setSalesEmployee(employee)}
                                className="hover:underline"
                              >
                                <div className="font-semibold text-primary">{stats.count} ta</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatSom(stats.total)}
                                </div>
                              </button>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
                              aria-label="Pul operatsiyasi"
                              title="Oylik / avans / bonus / jarima"
                              onClick={() => setMoneyOpEmployee(employee)}
                            >
                              <Banknote className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              aria-label="Tahrirlash"
                              onClick={() => {
                                setEditingEmployee(employee);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              aria-label="O'chirish"
                              onClick={() => setDeletingEmployee(employee)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {employees.length === 0 && (
                    <tr>
                      <td
                        colSpan={visibleColCount}
                        className="p-8 text-center text-muted-foreground"
                      >
                        Xodim topilmadi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>

      <EmployeeFormDialog
        open={formOpen}
        initialEmployee={editingEmployee}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditingEmployee(null);
        }}
        onSave={handleSave}
      />

      <EmployeeMoneyDialog
        employee={moneyOpEmployee}
        cashier={settings.username || "Admin"}
        onClose={() => setMoneyOpEmployee(null)}
        onDone={triggerRefresh}
      />

      <Dialog open={!!salesEmployee} onOpenChange={(o) => !o && setSalesEmployee(null)}>
        <DialogContent className="max-h-[84dvh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              {salesEmployee?.name} — sotuvlari
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {employeeReceipts.map((receipt) => (
              <div
                key={receipt.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <div className="font-semibold">{receipt.id}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(receipt.date).toLocaleString("uz-UZ")}
                  </div>
                </div>
                <div className="font-bold text-primary">{formatSom(receipt.total)}</div>
              </div>
            ))}
            {employeeReceipts.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Bu xodim hali savdoni tasdiqlash kodi bilan yakunlamagan
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingEmployee} onOpenChange={(o) => !o && setDeletingEmployee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xodimni o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              "{deletingEmployee?.name}" ni xodimlar ro'yxatidan o'chirishni tasdiqlaysizmi? Bu
              amalni qaytarib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>O'chirish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Kpi({ title, value, accent }: { title: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className={cn("mt-1 text-lg font-bold", accent && "text-primary")}>{value}</div>
    </div>
  );
}

function EmployeeFormDialog({
  open,
  initialEmployee,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  initialEmployee: Employee | null;
  onOpenChange: (o: boolean) => void;
  onSave: (data: Omit<Employee, "id" | "source">) => void;
}) {
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState<string>("Sotuvchi");
  const [status, setStatus] = React.useState<Employee["status"]>("active");
  const [phone, setPhone] = React.useState("");
  const [birthDate, setBirthDate] = React.useState("");
  const [hireDate, setHireDate] = React.useState("");
  const [salary, setSalary] = React.useState("");
  const [payType, setPayType] = React.useState<"fixed" | "fixed_plus_sales">("fixed");
  const [salesPercent, setSalesPercent] = React.useState("");
  const [code, setCode] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setName(initialEmployee?.name ?? "");
    setRole(initialEmployee?.role ?? "Sotuvchi");
    setStatus(initialEmployee?.status ?? "active");
    setPhone(initialEmployee?.phone ?? "");
    setBirthDate(initialEmployee?.birthDate ?? "");
    setHireDate(initialEmployee?.hireDate ?? "");
    setSalary(initialEmployee ? formatNumberInput(initialEmployee.monthlySalary) : "");
    setPayType(initialEmployee?.payType ?? "fixed");
    setSalesPercent(
      initialEmployee?.salesPercent !== undefined
        ? formatNumberInput(initialEmployee.salesPercent)
        : "",
    );
    setCode(initialEmployee?.code ?? String(Math.floor(1000 + Math.random() * 9000)));
  }, [open, initialEmployee]);

  const canSave = name.trim() && role && birthDate && parseNumberInput(salary) > 0;

  const handleSubmit = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      role,
      status,
      phone: phone.trim() || undefined,
      birthDate,
      hireDate: hireDate || undefined,
      monthlySalary: parseNumberInput(salary),
      payType,
      salesPercent: payType === "fixed_plus_sales" ? parseNumberInput(salesPercent) : undefined,
      code: code.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {initialEmployee ? "Xodimni tahrirlash" : "Yangi xodim"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-sm">Ism-familiya</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masalan: Akmal Karimov"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-sm">Lavozim</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Lavozimni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Holat</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Employee["status"])}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Faol</SelectItem>
                  <SelectItem value="vacation">Ta'tilda</SelectItem>
                  <SelectItem value="inactive">Ishdan bo'shagan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-sm">Telefon</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998901112200"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Tug'ilgan sana</Label>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-sm">Ishga kirgan sana</Label>
            <Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">
              "Faoliyat muddati" ustuni shu sanadan hisoblanadi.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-sm">Oylik maosh (so'm)</Label>
              <Input
                inputMode="numeric"
                value={salary}
                onChange={(e) => setSalary(formatNumberInput(e.target.value))}
                placeholder="3 500 000"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">To'lov turi</Label>
              <Select
                value={payType}
                onValueChange={(v) => setPayType(v as "fixed" | "fixed_plus_sales")}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Faqat oylik</SelectItem>
                  <SelectItem value="fixed_plus_sales">Oylik + sotuvdan %</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {payType === "fixed_plus_sales" && (
            <div>
              <Label className="mb-1.5 block text-sm">Sotuvdan foiz (%)</Label>
              <Input
                inputMode="numeric"
                value={salesPercent}
                onChange={(e) => setSalesPercent(formatNumberInput(e.target.value))}
                placeholder="5"
              />
            </div>
          )}

          <div>
            <Label className="mb-1.5 flex items-center gap-1.5 text-sm">
              <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
              Tasdiqlash kodi (PIN)
            </Label>
            <Input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="1234"
              className="font-mono"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Savdoni yakunlashda shu kod so'raladi — shu orqali sotuv aynan shu xodimga
              biriktiriladi.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button disabled={!canSave} onClick={handleSubmit}>
            Saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const PAYROLL_LABELS: Record<EmployeePaymentKind, string> = {
  Oylik: "Oylik to'lash",
  Avans: "Avans berish",
  Bonus: "Bonus berish",
  Jarima: "Jarima qo'llash",
};

function EmployeeMoneyDialog({
  employee,
  cashier,
  onClose,
  onDone,
}: {
  employee: Employee | null;
  cashier: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [kind, setKind] = React.useState<EmployeePaymentKind>("Oylik");
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  const [source, setSource] = React.useState<"kassa" | "boshqa">("kassa");

  React.useEffect(() => {
    if (employee) {
      setKind("Oylik");
      setAmount("");
      setNote("");
      setSource("kassa");
    }
  }, [employee]);

  if (!employee) return null;

  const numericAmount = parseNumberInput(amount);
  const canSubmit = numericAmount > 0;

  const submit = () => {
    if (!canSubmit) {
      toast.error("Summani kiriting");
      return;
    }
    const date = new Date().toISOString();
    MOCK_EMPLOYEE_PAYMENTS.push({
      id: `EP-${Date.now()}`,
      employeeId: employee.id,
      employeeName: employee.name,
      kind,
      amount: numericAmount,
      date,
      note: note.trim() || undefined,
      cashier,
      source,
    });
    if (source === "kassa") {
      const withdrawal: CashWithdrawal = {
        id: `WD-${Date.now()}`,
        date,
        cashier,
        category: kind,
        cash: numericAmount,
        cardAmount: 0,
        currencies: [],
        note: note.trim() || undefined,
        employeeId: employee.id,
        employeeName: employee.name,
      };
      MOCK_WITHDRAWALS.push(withdrawal);
    }
    toast.success(`${PAYROLL_LABELS[kind]}: ${formatSom(numericAmount)}`, {
      description:
        source === "kassa"
          ? `${employee.name} · kassadan chiqim sifatida yozildi`
          : `${employee.name} · ixtiyoriy manbadan (kassaga tegilmadi)`,
    });
    onDone();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            Pul operatsiyasi — {employee.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-sm">Turi</Label>
            <div className="grid grid-cols-2 gap-2">
              {PAYROLL_KINDS.map((k) => (
                <Button
                  key={k}
                  type="button"
                  size="sm"
                  variant={kind === k ? "default" : "outline"}
                  onClick={() => setKind(k)}
                  className="h-9"
                >
                  {k}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-sm">Summa (so'm)</Label>
            <Input
              value={amount}
              onChange={(e) => setAmount(formatNumberInput(e.target.value))}
              inputMode="decimal"
              placeholder="0"
              autoFocus
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-sm">Pul manbasi</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant={source === "kassa" ? "default" : "outline"}
                onClick={() => setSource("kassa")}
                className="h-8"
              >
                Kassadan
              </Button>
              <Button
                type="button"
                size="sm"
                variant={source === "boshqa" ? "default" : "outline"}
                onClick={() => setSource("boshqa")}
                className="h-8"
              >
                Ixtiyoriy manba
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {source === "kassa"
                ? "Summa kassadan chiqim sifatida yoziladi va kassa balansidan ayriladi."
                : "Kassaga tegilmaydi — to'lov tashqi manbadan qilingan deb belgilanadi."}
            </p>
          </div>

          <div>
            <Label className="mb-1.5 block text-sm">Izoh</Label>
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ixtiyoriy izoh"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Bekor
          </Button>
          <Button onClick={submit} disabled={!canSubmit} className="gap-2">
            <Receipt className="h-4 w-4" />
            Saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
