export type ActivityType = "sale" | "inventory" | "packaging";

export type DashboardActivityItem = {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string | null;
  amountText?: string;
};

export type SalesTrendPoint = {
  date: string;
  label: string;
  usd: number;
  zwg: number;
  usdCount: number;
  zwgCount: number;
};

export type DashboardSummary = {
  productCount: number;
  activeVariantCount: number;
  stockOnHand: number | null;
  completedSalesCount: number;
  recentActivity: DashboardActivityItem[];
  stockSource: "projection" | "unavailable";
};
