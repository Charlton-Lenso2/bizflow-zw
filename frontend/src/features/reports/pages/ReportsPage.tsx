import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "../../../components/ui/MetricCard";
import { Card } from "../../../components/ui/Card";
import {
  Activity,
  CalendarDays,
  Download,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useBusiness } from "../../business/hooks/useActiveBusiness";
import { fetchSalesForBusiness } from "../../sales/services/salesService";
import { fetchCustomersForBusiness } from "../../customers/services/customerService";
import type { SaleRow } from "../../sales/types/sales";
import type { CustomerRecord } from "../../customers/types/customer";
import { fetchSalesTrend } from "../../dashboard/services/dashboardService";
import type { SalesTrendPoint } from "../../dashboard/types/dashboard";
import SalesTrendChart from "../../dashboard/components/SalesTrendChart";

type DatePreset = "7d" | "30d" | "month" | "custom";
type Currency = "USD" | "ZWG";

type CustomerPerformance = {
  id: string;
  name: string;
  salesCount: number;
  usd: number;
  zwg: number;
};

function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateRange(preset: Exclude<DatePreset, "custom">) {
  const today = new Date();
  const end = toDateInput(today);
  const start = new Date(today);

  if (preset === "7d") {
    start.setDate(start.getDate() - 6);
  } else if (preset === "30d") {
    start.setDate(start.getDate() - 29);
  } else {
    start.setDate(1);
  }

  return {
    start: toDateInput(start),
    end,
  };
}

function getSaleDate(date: string | null | undefined): string {
  if (!date) return "";
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "";

  return toDateInput(parsed);
}

function formatMoney(amount: number, currency: Currency): string {
  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getCustomerName(customer: CustomerRecord | undefined): string {
  if (!customer) return "Walk-in / Unassigned";

  return (
    customer.business_name?.trim() ||
    customer.full_name?.trim() ||
    "Unnamed customer"
  );
}

function escapeCsv(value: string | number): string {
  const text = String(value);
  return `"${text.replace(/"/g, '""')}"`;
}


export function ReportsPage() {
  const {
    activeBusiness,
    activeBusinessId,
    isLoading: isBusinessLoading,
  } = useBusiness();

  const initialRange = getDateRange("30d");

  const [preset, setPreset] = useState<DatePreset>("30d");
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);

  const [sales, setSales] = useState<SaleRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [salesTrend, setSalesTrend] = useState<SalesTrendPoint[]>([]);

  const [isLoadingSales, setIsLoadingSales] = useState(true);
  const [isLoadingTrend, setIsLoadingTrend] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trendError, setTrendError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeBusinessId) return;

    let cancelled = false;

    async function loadReportData() {
      setIsLoadingSales(true);
      setError(null);

      try {
        const [salesResult, customersResult] = await Promise.all([
          fetchSalesForBusiness(activeBusinessId!),
          fetchCustomersForBusiness(activeBusinessId!),
        ]);

        if (cancelled) return;

        setSales(salesResult);
        setCustomers(customersResult);
      } catch (err) {
        console.error("Failed to load report data", err);

        if (!cancelled) {
          setSales([]);
          setCustomers([]);
          setError("Reports could not be loaded. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSales(false);
        }
      }
    }

    void loadReportData();

    return () => {
      cancelled = true;
    };
  }, [activeBusinessId]);

  useEffect(() => {
    if (!activeBusinessId || !startDate || !endDate || startDate > endDate) {
      return;
    }

    let cancelled = false;

    async function loadTrend() {
      setIsLoadingTrend(true);
      setTrendError(null);

      try {
        const result = await fetchSalesTrend(
          activeBusinessId!,
          startDate,
          endDate,
        );

        if (!cancelled) {
          setSalesTrend(result);
        }
      } catch (err) {
        console.error("Failed to load report sales trend", err);

        if (!cancelled) {
          setSalesTrend([]);
          setTrendError(
            "The revenue trend could not be loaded for this date range.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTrend(false);
        }
      }
    }

    void loadTrend();

    return () => {
      cancelled = true;
    };
  }, [activeBusinessId, startDate, endDate]);

  const customerMap = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );

  const completedSales = useMemo(() => {
    return sales.filter((sale) => {
      if (sale.status?.trim().toLowerCase() !== "completed") {
        return false;
      }

      const date = getSaleDate(sale.created_at);

      return date >= startDate && date <= endDate;
    });
  }, [sales, startDate, endDate]);

  const metrics = useMemo(() => {
    const totals = {
      usd: 0,
      zwg: 0,
      usdCount: 0,
      zwgCount: 0,
    };

    for (const sale of completedSales) {
      const amount = Number(sale.total_amount ?? 0);

      if (!Number.isFinite(amount)) continue;

      const currency = sale.currency?.trim().toUpperCase();

      if (currency === "USD") {
        totals.usd += amount;
        totals.usdCount += 1;
      } else if (currency === "ZWG") {
        totals.zwg += amount;
        totals.zwgCount += 1;
      }
    }

    return totals;
  }, [completedSales]);

  const customerPerformance = useMemo(() => {
    const performance = new Map<string, CustomerPerformance>();

    for (const sale of completedSales) {
      const customerId = sale.customer_id || "walk-in";

      let customer = performance.get(customerId);

      if (!customer) {
        customer = {
          id: customerId,
          name:
            customerId === "walk-in"
              ? "Walk-in / Unassigned"
              : getCustomerName(customerMap.get(customerId)),
          salesCount: 0,
          usd: 0,
          zwg: 0,
        };

        performance.set(customerId, customer);
      }

      customer.salesCount += 1;

      const amount = Number(sale.total_amount ?? 0);
      if (!Number.isFinite(amount)) continue;

      const currency = sale.currency?.trim().toUpperCase();

      if (currency === "USD") {
        customer.usd += amount;
      } else if (currency === "ZWG") {
        customer.zwg += amount;
      }
    }

    return Array.from(performance.values()).sort(
      (a, b) => b.salesCount - a.salesCount,
    );
  }, [completedSales, customerMap]);

  const averageUsd = metrics.usdCount > 0 ? metrics.usd / metrics.usdCount : 0;

  const averageZwg = metrics.zwgCount > 0 ? metrics.zwg / metrics.zwgCount : 0;

  const handlePreset = (nextPreset: Exclude<DatePreset, "custom">) => {
    const range = getDateRange(nextPreset);

    setPreset(nextPreset);
    setStartDate(range.start);
    setEndDate(range.end);
  };

  const handleStartDateChange = (value: string) => {
    setPreset("custom");
    setStartDate(value);

    if (value > endDate) {
      setEndDate(value);
    }
  };

  const handleEndDateChange = (value: string) => {
    setPreset("custom");
    setEndDate(value);

    if (value < startDate) {
      setStartDate(value);
    }
  };

  const handleExport = () => {
    if (completedSales.length === 0) return;

    const headers = [
      "Sale number",
      "Date",
      "Customer",
      "Status",
      "Currency",
      "Total amount",
    ];

    const rows = completedSales.map((sale) => [
      sale.sale_number || sale.id,
      sale.created_at || "",
      sale.customer_id
        ? getCustomerName(customerMap.get(sale.customer_id))
        : "Walk-in / Unassigned",
      sale.status || "",
      sale.currency || "",
      Number(sale.total_amount ?? 0).toFixed(2),
    ]);

    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `bizflow-sales-report-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (isBusinessLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Preparing reports...
        </div>
      </div>
    );
  }

  if (!activeBusiness) {
    return (
      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-border bg-white p-8 text-center dark:bg-slate-900">
        <CalendarDays className="mx-auto h-10 w-10 text-slate-400" />
        <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
          No active business
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Select or create a business to view its reports.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 pb-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: "var(--brand-primary)" }}
            />
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Business intelligence
            </p>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Reports & analytics
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Sales performance and revenue insights for{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {activeBusiness.name}
            </span>
            .
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={completedSales.length === 0 || isLoadingSales}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: "var(--brand-primary)" }}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </header>

      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm dark:bg-slate-900 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Reporting period
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Choose a period or specify your own dates.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["7d", "Last 7 days"],
                ["30d", "Last 30 days"],
                ["month", "This month"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => handlePreset(value)}
                aria-pressed={preset === value}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  preset === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                From
              </span>
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(event) => handleStartDateChange(event.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-primary/30 dark:bg-slate-950 dark:text-white"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                To
              </span>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(event) => handleEndDateChange(event.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-primary/30 dark:bg-slate-950 dark:text-white"
              />
            </label>
          </div>
        </div>
      </section>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </div>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Sales performance
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Completed sales within the selected period
            </p>
          </div>

          {isLoadingSales ? (
            <span className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Updating
            </span>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Revenue · USD"
            value={formatMoney(metrics.usd, "USD")}
            description={`${metrics.usdCount.toLocaleString()} completed USD sales`}
            icon={Wallet}
            accent="brand"
          />
          <MetricCard
            label="Revenue · ZWG"
            value={formatMoney(metrics.zwg, "ZWG")}
            description={`${metrics.zwgCount.toLocaleString()} completed ZWG sales`}
            icon={TrendingUp}
            accent="brand"
          />
          <MetricCard
            label="Completed transactions"
            value={completedSales.length.toLocaleString()}
            description="Across both currencies"
            icon={ShoppingCart}
            accent="brand"
          />
          <MetricCard
            label="Active customers"
            value={customerPerformance.length.toLocaleString()}
            description="Customers with completed sales"
            icon={Activity}
            accent="brand"
          />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Card padding="md">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Average completed sale · USD
            </p>
            <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
              {formatMoney(averageUsd, "USD")}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Based on {metrics.usdCount.toLocaleString()} USD transactions
            </p>
          </Card>

          <Card padding="md">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Average completed sale · ZWG
            </p>
            <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
              {formatMoney(averageZwg, "ZWG")}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Based on {metrics.zwgCount.toLocaleString()} ZWG transactions
            </p>
          </Card>
        </div>
      </section>

      {trendError ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
        >
          {trendError}
        </div>
      ) : null}

      {isLoadingTrend ? (
        <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-border bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading revenue trend...
          </div>
        </div>
      ) : (
        <SalesTrendChart data={salesTrend} />
      )}

      <section className="grid gap-6 xl:grid-cols-5">
        <Card padding="none" className="min-w-0 overflow-hidden xl:col-span-3">
          <div className="border-b border-border p-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Recent completed sales
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Transactions recorded during this reporting period
            </p>
          </div>

          {isLoadingSales ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Loading sales...
            </div>
          ) : completedSales.length === 0 ? (
            <div className="p-10 text-center">
              <ShoppingCart className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                No completed sales found
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Try another reporting period or record a completed sale.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Sale</th>
                    <th className="px-5 py-3 font-semibold">Customer</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...completedSales]
                    .sort(
                      (a, b) =>
                        new Date(b.created_at || 0).getTime() -
                        new Date(a.created_at || 0).getTime(),
                    )
                    .slice(0, 10)
                    .map((sale) => {
                      const currency =
                        sale.currency?.trim().toUpperCase() === "ZWG"
                          ? "ZWG"
                          : "USD";

                      return (
                        <tr key={sale.id}>
                          <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">
                            {sale.sale_number || "Sale"}
                          </td>
                          <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                            {sale.customer_id
                              ? getCustomerName(
                                  customerMap.get(sale.customer_id),
                                )
                              : "Walk-in"}
                          </td>
                          <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                            {formatDate(sale.created_at)}
                          </td>
                          <td className="px-5 py-3 text-right font-semibold text-slate-900 dark:text-white">
                            {formatMoney(
                              Number(sale.total_amount ?? 0),
                              currency,
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card padding="none" className="min-w-0 overflow-hidden xl:col-span-2">
          <div className="border-b border-border p-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Most active customers
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Ranked by completed transaction count
            </p>
          </div>

          {isLoadingSales ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Loading customers...
            </div>
          ) : customerPerformance.length === 0 ? (
            <div className="p-10 text-center">
              <Activity className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                No customer activity yet
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Completed customer sales will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {customerPerformance.slice(0, 6).map((customer, index) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {customer.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {customer.salesCount} completed{" "}
                        {customer.salesCount === 1 ? "sale" : "sales"}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {customer.usd > 0 ? (
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {formatMoney(customer.usd, "USD")}
                      </p>
                    ) : null}
                    {customer.zwg > 0 ? (
                      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {formatMoney(customer.zwg, "ZWG")}
                      </p>
                    ) : null}
                    {customer.usd === 0 && customer.zwg === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        No recorded total
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Report data is scoped to the active business. Revenue and transaction
        metrics include completed sales only. USD and ZWG are reported
        independently and are not combined.
      </p>
    </div>
  );
}
