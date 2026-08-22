import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Monitor, Plus, Trash2, Pencil, Laptop } from "lucide-react";
import { useApp, type Device, type PermissionKey } from "@/lib/app-context";
import { MOCK_EMPLOYEES, PERMISSION_GROUPS, ROLE_DEFAULT_PERMISSIONS } from "@/lib/mock-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ASSIGNABLE_EMPLOYEES = MOCK_EMPLOYEES.filter((e) => e.source !== "device");

const PERMISSION_LABELS: Record<PermissionKey, string> = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((g) => g.perms.map((p) => [p.key, p.label])),
) as Record<PermissionKey, string>;

export function DevicePermissions() {
  const { settings, updateSettings } = useApp();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingDevice, setEditingDevice] = React.useState<Device | null>(null);
  const [removeId, setRemoveId] = React.useState<string | null>(null);

  const toggleActive = (deviceId: string) => {
    updateSettings({
      devices: settings.devices.map((d) => (d.id === deviceId ? { ...d, active: !d.active } : d)),
    });
  };

  const handleRemove = () => {
    if (!removeId) return;
    updateSettings({ devices: settings.devices.filter((d) => d.id !== removeId) });
    toast.success("Qurilma o'chirildi");
    setRemoveId(null);
  };

  const handleSave = (data: {
    name: string;
    login: string;
    password: string;
    employeeId: string;
    permissions: PermissionKey[];
  }) => {
    if (editingDevice) {
      updateSettings({
        devices: settings.devices.map((d) => (d.id === editingDevice.id ? { ...d, ...data } : d)),
      });
      toast.success("Qurilma yangilandi");
    } else {
      const newDevice: Device = {
        id: `dev_${Date.now()}`,
        ...data,
        model: "QR orqali ulanmagan",
        isMain: false,
        active: true,
      };
      updateSettings({ devices: [...settings.devices, newDevice] });
      toast.success("Qurilma qo'shildi");
    }
    setFormOpen(false);
    setEditingDevice(null);
  };

  return (
    <div className="settings-devices w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Monitor className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold">Qurilmalar</h2>
        </div>
        {settings.devices.length < 6 && (
          <Button
            onClick={() => {
              setEditingDevice(null);
              setFormOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> Qurilma qo'shish
          </Button>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {settings.devices.map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            isCurrent={device.id === settings.currentDeviceId}
            onToggleActive={() => toggleActive(device.id)}
            onEdit={() => {
              setEditingDevice(device);
              setFormOpen(true);
            }}
            onRemove={() => setRemoveId(device.id)}
          />
        ))}
      </div>

      <DeviceFormDialog
        open={formOpen}
        initialDevice={editingDevice}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditingDevice(null);
        }}
        onSave={handleSave}
      />

      <AlertDialog open={!!removeId} onOpenChange={(o) => !o && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>O'chirish</AlertDialogTitle>
            <AlertDialogDescription>Qurilmani o'chirishni tasdiqlaysizmi?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>O'chirish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DeviceCard({
  device,
  isCurrent,
  onToggleActive,
  onEdit,
  onRemove,
}: {
  device: Device;
  isCurrent: boolean;
  onToggleActive: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const employee = MOCK_EMPLOYEES.find((e) => e.id === device.employeeId);
  const visiblePerms = device.permissions.slice(0, 4);
  const restCount = device.permissions.length - visiblePerms.length;

  return (
    <div
      className={cn(
        "settings-device-card overflow-hidden rounded-xl border bg-card shadow-sm",
        isCurrent && "border-primary/40 ring-1 ring-primary/20",
      )}
    >
      <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-3">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          <Laptop className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 break-words font-semibold">{device.name}</span>
            {device.isMain && (
              <Badge variant="secondary" className="text-[10px]">
                Asosiy qurilma
              </Badge>
            )}
            {isCurrent && <Badge className="text-[10px]">Joriy qurilma</Badge>}
            <Badge
              variant={device.active ? "default" : "secondary"}
              className={cn("text-[10px]", !device.active && "bg-muted text-muted-foreground")}
            >
              {device.active ? "Faol" : "Nofaol"}
            </Badge>
          </div>
          <div className="break-words text-xs text-muted-foreground">
            {employee ? `${employee.name} · ${employee.role}` : "Xodim biriktirilmagan"}
          </div>
        </div>
        <div className="flex flex-shrink-0 gap-1">
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {!device.isMain && (
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Ruxsatlar
        </div>
        <div className="flex flex-wrap gap-1.5">
          {visiblePerms.map((perm) => (
            <Badge key={perm} variant="outline" className="text-[10px] font-normal">
              {PERMISSION_LABELS[perm] ?? perm}
            </Badge>
          ))}
          {restCount > 0 && (
            <Badge variant="outline" className="text-[10px] font-normal">
              +{restCount}
            </Badge>
          )}
          {device.permissions.length === 0 && (
            <span className="text-xs text-muted-foreground">Ruxsat berilmagan</span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="mt-3 h-7 text-xs"
          disabled={device.isMain}
          onClick={onToggleActive}
        >
          {device.active ? "Nofaol qilish" : "Faollashtirish"}
        </Button>
      </div>
    </div>
  );
}

function DeviceFormDialog({
  open,
  initialDevice,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  initialDevice: Device | null;
  onOpenChange: (o: boolean) => void;
  onSave: (data: {
    name: string;
    login: string;
    password: string;
    employeeId: string;
    permissions: PermissionKey[];
  }) => void;
}) {
  const [name, setName] = React.useState("");
  const [login, setLogin] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [employeeId, setEmployeeId] = React.useState("");
  const [permissions, setPermissions] = React.useState<PermissionKey[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setName(initialDevice?.name ?? "");
    setLogin(initialDevice?.login ?? "");
    setPassword(initialDevice?.password ?? "");
    setEmployeeId(initialDevice?.employeeId ?? "");
    setPermissions(initialDevice?.permissions ?? []);
  }, [open, initialDevice]);

  const selectEmployee = (id: string) => {
    setEmployeeId(id);
    const employee = ASSIGNABLE_EMPLOYEES.find((e) => e.id === id);
    setPermissions(employee ? (ROLE_DEFAULT_PERMISSIONS[employee.role] ?? []) : []);
  };

  const togglePerm = (key: PermissionKey) => {
    setPermissions((cur) => (cur.includes(key) ? cur.filter((p) => p !== key) : [...cur, key]));
  };

  const canSave = name.trim() && login.trim() && password.trim() && employeeId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            {initialDevice ? "Qurilmani tahrirlash" : "Qurilma qo'shish"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-sm">Qurilma nomi</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masalan: Kassa-1 planshet"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-sm">Login</Label>
              <Input
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="kassa2"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Parol</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••"
              />
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-sm">Xodim</Label>
            <Select value={employeeId} onValueChange={selectEmployee}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Xodimni tanlang" />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_EMPLOYEES.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name} · {employee.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block text-sm">Ruxsatlar</Label>
            <div className="space-y-3 rounded-lg border p-3">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.module}>
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.module}
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {group.perms.map((perm) => (
                      <label
                        key={perm.key}
                        className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted/40"
                      >
                        <Checkbox
                          checked={permissions.includes(perm.key)}
                          onCheckedChange={() => togglePerm(perm.key)}
                        />
                        {perm.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button
            disabled={!canSave}
            onClick={() =>
              canSave &&
              onSave({
                name: name.trim(),
                login: login.trim(),
                password: password.trim(),
                employeeId,
                permissions,
              })
            }
          >
            Saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
