export interface AiMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  data?: unknown;
}

export interface AiConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AiMessage[];
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
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
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
