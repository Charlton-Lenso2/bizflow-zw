import { supabase } from "../../../lib/supabase";
import type {
  DashboardActivityItem,
  DashboardSummary,
  SalesTrendPoint,
} from "../types/dashboard";

type Row = Record<string, unknown>;

const COMPLETED_SALE_STATUS = "completed";
const PAGE_SIZE = 1000;

export type TodaySalesSummary = {
  usd: number;
  zwg: number;
  usdCount: number;
  zwgCount: number;
};

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return 0;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function normaliseStatus(value: unknown): string {
  return asString(value)?.trim().toLowerCase() ?? "";
}

function dateFromLocalString(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateToLocalString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function fetchProductCounts(businessId: string) {
  const { count, error } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);

  if (error) throw error;

  return count ?? 0;
}

async function fetchVariantCounts(businessId: string) {
  const { count, error } = await supabase
    .from("product_variants")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("is_active", true);

  if (error) throw error;

  return count ?? 0;
}

async function fetchStockOnHand(businessId: string): Promise<{
  stockOnHand: number | null;
  stockSource: "projection" | "unavailable";
}> {
  const { data, error } = await supabase
    .from("inventory_stock_balances")
    .select("quantity_crates")
    .eq("business_id", businessId);

  if (error) throw error;

  if (!data?.length) {
    return { stockOnHand: null, stockSource: "unavailable" };
  }

  return {
    stockOnHand: data.reduce(
      (total, row) => total + asNumber(row.quantity_crates),
      0,
    ),
    stockSource: "projection",
  };
}

async function fetchCompletedSalesCount(businessId: string): Promise<number> {
  const { count, error } = await supabase
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("status", COMPLETED_SALE_STATUS);

  if (error) throw error;

  return count ?? 0;
}

async function fetchRecentSales(businessId: string): Promise<Row[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("id, sale_number, currency, total_amount, status, created_at")
    .eq("business_id", businessId)
    .eq("status", COMPLETED_SALE_STATUS)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;

  return (data ?? []) as Row[];
}

async function fetchRecentInventoryActivity(
  businessId: string,
): Promise<Row[]> {
  const { data, error } = await supabase
    .from("inventory_movements")
    .select("id, movement_type, quantity_crates, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;

  return (data ?? []) as Row[];
}

function mapSalesToActivity(rows: Row[]): DashboardActivityItem[] {
  return rows
    .filter((row) => normaliseStatus(row.status) === COMPLETED_SALE_STATUS)
    .map((row) => {
      const saleNumber =
        asString(row.sale_number) ?? `Sale ${asString(row.id) ?? "record"}`;
      const currency = asString(row.currency)?.toUpperCase();
      const amount = asNumber(row.total_amount);

      return {
        id: asString(row.id) ?? saleNumber,
        type: "sale",
        title: saleNumber,
        description: "Completed sale recorded",
        timestamp: asString(row.created_at),
        amountText: currency
          ? `${amount.toLocaleString()} ${currency}`
          : undefined,
      };
    });
}

function mapInventoryToActivity(rows: Row[]): DashboardActivityItem[] {
  return rows.map((row, index) => {
    const movementType = asString(row.movement_type) ?? "Inventory update";
    const quantity = asNumber(row.quantity_crates);

    return {
      id: asString(row.id) ?? `inventory-${index}`,
      type: "inventory",
      title: movementType.replace(/_/g, " "),
      description: `${quantity.toLocaleString()} crates recorded`,
      timestamp: asString(row.created_at),
    };
  });
}

export async function fetchStockStatusCounts(
  businessId: string,
): Promise<{ lowStockCount: number; outOfStockCount: number }> {
  const { data, error } = await supabase
    .from("inventory_stock_balances")
    .select("quantity_crates")
    .eq("business_id", businessId);

  if (error) throw error;

  const rows = data ?? [];
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const row of rows) {
    const quantity = asNumber(row.quantity_crates);

    if (quantity === 0) {
      outOfStockCount += 1;
    } else if (quantity <= 10) {
      lowStockCount += 1;
    }
  }

  return { lowStockCount, outOfStockCount };
}

export async function fetchDashboardSummary(
  businessId: string,
): Promise<DashboardSummary> {
  if (!businessId) throw new Error("No active business selected.");

  const [
    productCount,
    activeVariantCount,
    stockSummary,
    completedSalesCount,
    stockStatus,
    salesRows,
    inventoryRows,
  ] = await Promise.all([
    fetchProductCounts(businessId),
    fetchVariantCounts(businessId),
    fetchStockOnHand(businessId),
    fetchCompletedSalesCount(businessId),
    fetchStockStatusCounts(businessId),
    fetchRecentSales(businessId),
    fetchRecentInventoryActivity(businessId),
  ]);

  const recentActivity = [
    ...mapSalesToActivity(salesRows),
    ...mapInventoryToActivity(inventoryRows),
  ].sort((a, b) => {
    const first = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const second = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return second - first;
  });

  return {
    productCount,
    activeVariantCount,
    stockOnHand: stockSummary.stockOnHand,
    completedSalesCount,
    lowStockCount: stockStatus.lowStockCount,
    outOfStockCount: stockStatus.outOfStockCount,
    recentActivity: recentActivity.slice(0, 6),
    stockSource: stockSummary.stockSource,
  };
}

export async function fetchTodaySalesSummary(
  businessId: string,
): Promise<TodaySalesSummary> {
  if (!businessId) throw new Error("No active business selected.");

  const today = dateToLocalString(new Date());
  const start = dateFromLocalString(today);
  const endExclusive = dateFromLocalString(today);
  endExclusive.setDate(endExclusive.getDate() + 1);

  const summary: TodaySalesSummary = {
    usd: 0,
    zwg: 0,
    usdCount: 0,
    zwgCount: 0,
  };

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("sales")
      .select("currency, total_amount, status, created_at")
      .eq("business_id", businessId)
      .eq("status", COMPLETED_SALE_STATUS)
      .gte("created_at", start.toISOString())
      .lt("created_at", endExclusive.toISOString())
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;

    const rows = data ?? [];

    for (const row of rows) {
      if (normaliseStatus(row.status) !== COMPLETED_SALE_STATUS) continue;

      const currency = asString(row.currency)?.trim().toUpperCase();
      const amount = asNumber(row.total_amount);

      if (currency === "USD") {
        summary.usd += amount;
        summary.usdCount += 1;
      } else if (currency === "ZWG") {
        summary.zwg += amount;
        summary.zwgCount += 1;
      }
    }

    if (rows.length < PAGE_SIZE) break;
  }

  return summary;
}

export async function fetchSalesTrend(
  businessId: string,
  startDate: string,
  endDate: string,
): Promise<SalesTrendPoint[]> {
  if (!businessId) throw new Error("No active business selected.");

  if (!startDate || !endDate || startDate > endDate) {
    throw new Error("Select a valid date range.");
  }

  const start = dateFromLocalString(startDate);
  const endExclusive = dateFromLocalString(endDate);
  endExclusive.setDate(endExclusive.getDate() + 1);

  const rows: Row[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("sales")
      .select("currency, total_amount, status, created_at")
      .eq("business_id", businessId)
      .eq("status", COMPLETED_SALE_STATUS)
      .gte("created_at", start.toISOString())
      .lt("created_at", endExclusive.toISOString())
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as Row[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
  }

  const points: SalesTrendPoint[] = [];
  const cursor = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  );

  while (dateToLocalString(cursor) <= endDate) {
    points.push({
      date: dateToLocalString(cursor),
      label: cursor.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      usd: 0,
      zwg: 0,
      usdCount: 0,
      zwgCount: 0,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  const pointsByDate = new Map(points.map((point) => [point.date, point]));

  for (const row of rows) {
    if (normaliseStatus(row.status) !== COMPLETED_SALE_STATUS) continue;

    const timestamp = asString(row.created_at);
    if (!timestamp) continue;

    const date = dateToLocalString(new Date(timestamp));
    const point = pointsByDate.get(date);
    if (!point) continue;

    const currency = asString(row.currency)?.trim().toUpperCase();
    const amount = asNumber(row.total_amount);

    if (currency === "USD") {
      point.usd += amount;
      point.usdCount += 1;
    } else if (currency === "ZWG") {
      point.zwg += amount;
      point.zwgCount += 1;
    }
  }

  return points;
}
