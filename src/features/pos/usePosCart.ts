import * as React from "react";
import type { Product } from "@/lib/mock-data";

export type PosCartLine = {
  product: Product;
  quantity: number;
};

export type PosCheck = {
  id: string;
  label: string;
  lines: PosCartLine[];
  discount: number;
};

export type PosOpResult = { ok: true } | { ok: false; reason: string };

type State = {
  checks: PosCheck[];
  activeCheckId: string;
};

type Action =
  | { type: "ADD_PRODUCT"; product: Product }
  | { type: "SET_QUANTITY"; productId: string; quantity: number }
  | { type: "REMOVE_LINE"; productId: string }
  | { type: "SET_DISCOUNT"; amount: number }
  | { type: "CLEAR_CHECK" }
  | { type: "NEW_CHECK" }
  | { type: "CLOSE_CHECK"; checkId: string }
  | { type: "SET_ACTIVE_CHECK"; checkId: string };

function makeCheck(index: number): PosCheck {
  return {
    id: `chek-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    label: `Chek ${index}`,
    lines: [],
    discount: 0,
  };
}

function updateActive(state: State, updater: (check: PosCheck) => PosCheck): State {
  return {
    ...state,
    checks: state.checks.map((check) =>
      check.id === state.activeCheckId ? updater(check) : check,
    ),
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_PRODUCT":
      return updateActive(state, (check) => {
        const existing = check.lines.find((line) => line.product.id === action.product.id);
        if (existing) {
          return {
            ...check,
            lines: check.lines.map((line) =>
              line.product.id === action.product.id
                ? { ...line, quantity: line.quantity + 1 }
                : line,
            ),
          };
        }
        return { ...check, lines: [...check.lines, { product: action.product, quantity: 1 }] };
      });

    case "SET_QUANTITY":
      return updateActive(state, (check) => {
        if (action.quantity <= 0) {
          return {
            ...check,
            lines: check.lines.filter((line) => line.product.id !== action.productId),
          };
        }
        return {
          ...check,
          lines: check.lines.map((line) =>
            line.product.id === action.productId ? { ...line, quantity: action.quantity } : line,
          ),
        };
      });

    case "REMOVE_LINE":
      return updateActive(state, (check) => ({
        ...check,
        lines: check.lines.filter((line) => line.product.id !== action.productId),
      }));

    case "SET_DISCOUNT":
      return updateActive(state, (check) => ({ ...check, discount: Math.max(0, action.amount) }));

    case "CLEAR_CHECK":
      return updateActive(state, (check) => ({ ...check, lines: [], discount: 0 }));

    case "NEW_CHECK": {
      const nextCheck = makeCheck(state.checks.length + 1);
      return { checks: [...state.checks, nextCheck], activeCheckId: nextCheck.id };
    }

    case "CLOSE_CHECK": {
      if (state.checks.length <= 1) return state;
      const remaining = state.checks.filter((check) => check.id !== action.checkId);
      const activeCheckId =
        state.activeCheckId === action.checkId ? remaining[0].id : state.activeCheckId;
      return { checks: remaining, activeCheckId };
    }

    case "SET_ACTIVE_CHECK":
      return { ...state, activeCheckId: action.checkId };

    default:
      return state;
  }
}

/** Kassa savatchasi — bir nechta parallel chek (`checks`), useReducer asosida. */
export function usePosCart() {
  const [state, dispatch] = React.useReducer(reducer, undefined, () => {
    const first = makeCheck(1);
    return { checks: [first], activeCheckId: first.id };
  });

  const activeCheck = state.checks.find((c) => c.id === state.activeCheckId) ?? state.checks[0];

  const addProduct = React.useCallback(
    (product: Product): PosOpResult => {
      const existing = activeCheck.lines.find((line) => line.product.id === product.id);
      const currentQty = existing?.quantity ?? 0;
      if (currentQty + 1 > product.vitrinaQty) {
        return { ok: false, reason: `Omborda ${product.vitrinaQty} dona qoldi` };
      }
      dispatch({ type: "ADD_PRODUCT", product });
      return { ok: true };
    },
    [activeCheck],
  );

  const setQuantity = React.useCallback((product: Product, quantity: number): PosOpResult => {
    if (quantity > product.vitrinaQty) {
      return { ok: false, reason: `Omborda ${product.vitrinaQty} dona qoldi` };
    }
    dispatch({ type: "SET_QUANTITY", productId: product.id, quantity });
    return { ok: true };
  }, []);

  const removeLine = React.useCallback((productId: string) => {
    dispatch({ type: "REMOVE_LINE", productId });
  }, []);

  const setDiscount = React.useCallback((amount: number) => {
    dispatch({ type: "SET_DISCOUNT", amount });
  }, []);

  const clearCheck = React.useCallback(() => {
    dispatch({ type: "CLEAR_CHECK" });
  }, []);

  const newCheck = React.useCallback(() => {
    dispatch({ type: "NEW_CHECK" });
  }, []);

  const closeCheck = React.useCallback((checkId: string) => {
    dispatch({ type: "CLOSE_CHECK", checkId });
  }, []);

  const setActiveCheck = React.useCallback((checkId: string) => {
    dispatch({ type: "SET_ACTIVE_CHECK", checkId });
  }, []);

  return {
    checks: state.checks,
    activeCheckId: state.activeCheckId,
    activeCheck,
    addProduct,
    setQuantity,
    removeLine,
    setDiscount,
    clearCheck,
    newCheck,
    closeCheck,
    setActiveCheck,
  };
}
