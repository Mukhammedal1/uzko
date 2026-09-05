import type { CustomerType, PaymentBreakdownRow, Product, ReceiptItem } from "@/lib/mock-data";
import type { PendingReturnExchange } from "@/components/tovarlar/TovarQaytarish";

export type PriceMode = "retail" | "wholesale";

export type CartItem = {
  id: string;
  product: Product;
  quantity: number;
  unit: string;
  source?: ReceiptItem["source"];
  note?: string;
  priceMode?: PriceMode;
};

export type Discount =
  { type: "none" } | { type: "amount"; value: number } | { type: "percent"; value: number };

export type OneTimeItemInput = {
  name: string;
  quantity: number;
  unit: string;
  price: number;
  note?: string;
};

export type { PaymentBreakdownRow };

export type FinalizeSaleDetails = {
  customerType: CustomerType;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  /** Savdo yakunida karta/tel/ism orqali aniqlangan sodiq mijoz (bo'lsa). */
  loyalCustomerId?: string;
  loyalCardNumber?: string;
  loyalCustomerName?: string;
  loyalCashbackEarned?: number;
  paidAmount?: number;
  debtAmount?: number;
  paymentBreakdown?: {
    cash: number;
    card: number;
    /** Bank orqali o'tkazma */
    transfer?: number;
    /** Elektron hamyon (Click, Payme va h.k.) */
    wallet?: number;
    currencyAmount: number;
    currencyCode?: string;
    currencyInSom: number;
    /** To'lov usuli bo'yicha batafsil qatorlar */
    rows?: PaymentBreakdownRow[];
  };
};

export type FinalizedSalePayload = FinalizeSaleDetails & {
  subtotal: number;
  discountAmount: number;
  total: number;
};

export type { PendingReturnExchange };
