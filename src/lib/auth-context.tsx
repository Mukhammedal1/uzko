import * as React from "react";

// ─── Roles ───────────────────────────────────────────────────────────────────

export type Role =
  | "owner"
  | "partner"
  | "director"
  | "manager"
  | "warehouse_manager"
  | "sales_manager"
  | "accountant"
  | "employee"
  | "other";

export const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "owner", label: "Biznes egasi" },
  { value: "partner", label: "Sherik" },
  { value: "director", label: "Direktor" },
  { value: "manager", label: "Menejer" },
  { value: "warehouse_manager", label: "Ombor mudiri" },
  { value: "sales_manager", label: "Savdo menejeri" },
  { value: "accountant", label: "Buxgalter" },
  { value: "employee", label: "Oddiy ishchi" },
  { value: "other", label: "Boshqa (yozing)" },
];

export function roleLabel(role: Role, customRole?: string) {
  if (role === "other" && customRole) return customRole;
  return ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;
}

// ─── Phone helpers ───────────────────────────────────────────────────────────

export function normalizePhone(raw: string): string {
  let digits = raw.trim().replace(/[^\d+]/g, "");
  if (!digits.startsWith("+")) {
    if (digits.startsWith("998")) digits = `+${digits}`;
    else if (digits.length === 9) digits = `+998${digits}`;
    else digits = `+${digits}`;
  }
  return digits;
}

export function isValidPhone(raw: string): boolean {
  return /^\+\d{9,15}$/.test(normalizePhone(raw));
}

// ─── Users / Session ─────────────────────────────────────────────────────────

export type AuthUser = {
  id: string;
  fullName: string;
  companyName: string;
  phone: string;
  password: string;
  role: Role;
  customRole?: string;
  createdAt: string;
};

export type RegisterInput = {
  fullName: string;
  companyName: string;
  phone: string;
  password: string;
  role: Role;
  customRole?: string;
};

type AuthResult = { ok: true } | { ok: false; error: string };

type Status = "loading" | "guest" | "authenticated";

type AuthCtx = {
  status: Status;
  user: AuthUser | null;
  login: (phone: string, password: string, rememberMe: boolean) => AuthResult;
  register: (input: RegisterInput) => AuthResult;
  logout: () => void;
};

const USERS_KEY = "uzko_auth_users";
const SESSION_KEY = "uzko_auth_session";

function loadUsers(): AuthUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as AuthUser[]) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: AuthUser[]) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {}
}

function readSession(): { userId: string } | null {
  try {
    const fromLocal = localStorage.getItem(SESSION_KEY);
    if (fromLocal) return JSON.parse(fromLocal) as { userId: string };
    const fromSession = sessionStorage.getItem(SESSION_KEY);
    if (fromSession) return JSON.parse(fromSession) as { userId: string };
  } catch {}
  return null;
}

function writeSession(userId: string, rememberMe: boolean) {
  try {
    const payload = JSON.stringify({ userId });
    if (rememberMe) {
      localStorage.setItem(SESSION_KEY, payload);
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY, payload);
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {}
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const DEMO_USER: AuthUser = {
  id: "demo-user",
  fullName: "Demo Admin",
  companyName: "UZKO SAVDO",
  phone: normalizePhone("1234567"),
  password: "123",
  role: "owner",
  createdAt: new Date(0).toISOString(),
};

function ensureDemoUser() {
  const users = loadUsers();
  if (users.some((u) => u.phone === DEMO_USER.phone)) return;
  saveUsers([...users, DEMO_USER]);
}

const AuthContext = React.createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<Status>("loading");
  const [user, setUser] = React.useState<AuthUser | null>(null);

  React.useEffect(() => {
    ensureDemoUser();
    const session = readSession();
    const found = session ? loadUsers().find((u) => u.id === session.userId) : null;
    if (found) {
      setUser(found);
      setStatus("authenticated");
    } else {
      setStatus("guest");
    }
  }, []);

  const login = React.useCallback<AuthCtx["login"]>((phoneRaw, password, rememberMe) => {
    const phone = normalizePhone(phoneRaw);
    const found = loadUsers().find((u) => u.phone === phone);
    if (!found || found.password !== password) {
      return { ok: false, error: "Telefon raqam yoki parol noto'g'ri" };
    }
    writeSession(found.id, rememberMe);
    setUser(found);
    setStatus("authenticated");
    return { ok: true };
  }, []);

  const register = React.useCallback<AuthCtx["register"]>((input) => {
    const phone = normalizePhone(input.phone);
    const users = loadUsers();
    if (users.some((u) => u.phone === phone)) {
      return { ok: false, error: "Bu telefon raqam bilan hisob allaqachon mavjud" };
    }
    const newUser: AuthUser = {
      id: makeId(),
      fullName: input.fullName.trim(),
      companyName: input.companyName.trim(),
      phone,
      password: input.password,
      role: input.role,
      customRole: input.role === "other" ? input.customRole?.trim() : undefined,
      createdAt: new Date().toISOString(),
    };
    saveUsers([...users, newUser]);
    writeSession(newUser.id, true);
    setUser(newUser);
    setStatus("authenticated");
    return { ok: true };
  }, []);

  const logout = React.useCallback(() => {
    clearSession();
    setUser(null);
    setStatus("guest");
  }, []);

  const value = React.useMemo(
    () => ({
      status,
      user,
      login,
      register,
      logout,
    }),
    [status, user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
