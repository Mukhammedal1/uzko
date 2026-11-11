import * as React from "react";

/** Shtrix kodsiz yoki qidiruvda topilishi qiyin tovarlarni foydalanuvchi
 * qo'lda "Saqlanganlar"ga belgilab qo'yishi uchun — brauzerda saqlanadi. */
const STORAGE_KEY = "uzko-saved-products";

function readSavedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return new Set(
      Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string") : [],
    );
  } catch {
    return new Set();
  }
}

function writeSavedIds(ids: Set<string>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

export function useSavedProducts() {
  const [savedIds, setSavedIds] = React.useState<Set<string>>(() => readSavedIds());

  const toggleSaved = React.useCallback((productId: string) => {
    setSavedIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      writeSavedIds(next);
      return next;
    });
  }, []);

  return { savedIds, toggleSaved };
}
