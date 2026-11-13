export interface AiMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  data?: unknown;
}

export interface AiQueryRequest {
  question: string;
  context?:
    | "sales"
    | "inventory"
    | "customer"
    | "packaging"
    | "general";
  businessId?: string;
  conversationHistory?: unknown[];
}

export interface AiQueryResponse {
  answer: string;
  data: unknown;
  sources: string[];
}

export interface SalesSummaryTotal {
  currency: string;
  completedSales: number;
  totalRevenue: number;
  totalSubtotal: number;
  totalDiscount: number;
  averageSaleValue: number;
}

export interface CustomerBalance {
  customer_id: string;
  customer_name: string | null;
  outstanding_balance: number;
  currency: string;
  entry_count: number;
}
