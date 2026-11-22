import { lazy, Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  Boxes,
  ChevronRight,
  CircleAlert,
  Package,
  ShoppingCart,
  TrendingUp,
  Store,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { LoadingState } from "../../../components/ui/LoadingState";
import { BusinessSelector } from "../../business/components/BusinessSelector";
import { useBusiness } from "../../business/hooks/useActiveBusiness";
import { useAuth } from "../../auth/hooks/useAuth";
import { fetchCustomersWithFinancialSummary } from "../../customers/services/customerService";
import {
  fetchDashboardSummary,
  fetchSalesTrend,
  fetchTodaySalesSummary,
} from "../services/dashboardService";
import type { DashboardSummary, SalesTrendPoint } from "../types/dashboard";

const SalesTrendChart = lazy(() => import("../components/SalesTrendChart"));

type DatePreset = "today" | "week" | "month" | "90days" | "custom";

type CreditSummary = {
  usd: number;
  zwg: number;
};

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getRange(preset: Exclude<DatePreset, "custom">) {
  const now = new Date();
  const end = toDateString(now);
  const startDate = new Date(now);

  switch (preset) {
    case "today":
      return { start: end, end };

    case "week":
      startDate.setDate(now.getDate() - now.getDay());
      return { start: toDateString(startDate), end };

    case "month":
      startDate.setDate(1);
      return { start: toDateString(startDate), end };

    case "90days":
      startDate.setDate(now.getDate() - 89);
      return { start: toDateString(startDate), end };
  }
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";

  return "Good evening";
}

function formatCurrency(value: number, currency: "USD" | "ZWG") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

const presets: { label: string; value: DatePreset }[] = [
  { label: "Today", value: "today" },
  { label: "This week", value: "week" },
  { label: "This month", value: "month" },
  { label: "90 days", value: "90days" },
];

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  description: string;
  icon: typeof Boxes;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>

      <div className="mt-4 min-h-[52px]">
        {value}

        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function ActionLink({
  title,
  description,
  icon: Icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: typeof Boxes;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800/60"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Icon className="h-[18px] w-[18px]" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
          {title}
        </p>

        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" />
    </button>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const {
    activeBusinessId,
    isLoading: isBusinessLoading,
  } = useBusiness();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [todaySales, setTodaySales] = useState<{
    usd: number;
    zwg: number;
    usdCount: number;
    zwgCount: number;
  } | null>(null);

  const [creditSummary, setCreditSummary] = useState<CreditSummary | null>(
    null,
  );
  const [salesTrend, setSalesTrend] = useState<SalesTrendPoint[]>([]);

  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingTrend, setIsLoadingTrend] = useState(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [creditError, setCreditError] = useState<string | null>(null);
  const [trendError, setTrendError] = useState<string | null>(null);

  const [preset, setPreset] = useState<DatePreset>("week");
  const initialRange = getRange("week");
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);

  const displayName =
    profile?.full_name?.trim() || user?.email?.split("@")[0] || "there";

  useEffect(() => {
    if (!activeBusinessId) {
      return;
    }

    const businessId = activeBusinessId;
    let cancelled = false;

    async function loadDashboard() {
      setIsLoadingSummary(true);
      setErrorMessage(null);
      setCreditError(null);

      try {
        const [dashboard, sales, customers] = await Promise.all([
          fetchDashboardSummary(businessId),
          fetchTodaySalesSummary(businessId),
          fetchCustomersWithFinancialSummary(businessId, ""),
        ]);

        if (cancelled) return;

        setSummary(dashboard);
        setTodaySales(sales);

        const outstanding: CreditSummary = {
          usd: 0,
          zwg: 0,
        };

        for (const customer of customers) {
          const usd = customer.current_outstanding_balance_usd;
          const zwg = customer.current_outstanding_balance_zwg;

          if (usd > 0) outstanding.usd += usd;
          if (zwg > 0) outstanding.zwg += zwg;
        }

        setCreditSummary(outstanding);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load your business overview.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSummary(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [activeBusinessId]);

  useEffect(() => {
    if (!activeBusinessId || !startDate || !endDate) return;

    const businessId = activeBusinessId;
    const rangeStart = startDate;
    const rangeEnd = endDate;
    let cancelled = false;

    async function loadTrend() {
      setIsLoadingTrend(true);
      setTrendError(null);

      try {
        const result = await fetchSalesTrend(businessId, rangeStart, rangeEnd);

        if (!cancelled) {
          setSalesTrend(result);
        }
      } catch (error) {
        if (!cancelled) {
          setTrendError(
            error instanceof Error
              ? error.message
              : "Unable to load sales performance.",
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

  function handlePresetChange(nextPreset: DatePreset) {
    setPreset(nextPreset);

    if (nextPreset === "custom") return;

    const range = getRange(nextPreset);
    setStartDate(range.start);
    setEndDate(range.end);
  }

  function handleStartDateChange(value: string) {
    setPreset("custom");
    setStartDate(value);
  }

  function handleEndDateChange(value: string) {
    setPreset("custom");
    setEndDate(value);
  }

  if (isBusinessLoading || (activeBusinessId && isLoadingSummary)) {
    return <LoadingState message="Preparing your business dashboard..." />;
  }

  const lowStockCount = summary?.lowStockCount ?? 0;
  const outOfStockCount = summary?.outOfStockCount ?? 0;
  const stockNeedsAttention = lowStockCount > 0 || outOfStockCount > 0;

  return (
    <div className="mx-auto w-full space-y-6 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Store className="h-4 w-4" />
            Business overview
          </div>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            {getGreeting()}, {displayName}
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Here's what's happening in your business.
          </p>
        </div>

        {activeBusinessId && (
          <button
            type="button"
            onClick={() => navigate("/pos")}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-white transition hover:opacity-90"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            <ShoppingCart className="h-4 w-4" />
            New sale
          </button>
        )}
      </header>

      <BusinessSelector />

      {!activeBusinessId && !isBusinessLoading && (
        <Alert variant="info">
          Select or create a business to view its dashboard.
        </Alert>
      )}

      {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

      {activeBusinessId && summary && (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Today's revenue"
              value={
                <div className="space-y-1.5">
                  <p className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
                    {formatCurrency(todaySales?.usd ?? 0, "USD")}
                  </p>

                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    {formatCurrency(todaySales?.zwg ?? 0, "ZWG")}
                  </p>
                </div>
              }
              description={`${todaySales?.usdCount ?? 0} USD · ${todaySales?.zwgCount ?? 0} ZWG transactions`}
              icon={TrendingUp}
            />

            <MetricCard
              label="Outstanding credit"
              value={
                <div className="space-y-1.5">
                  <p className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
                    {formatCurrency(creditSummary?.usd ?? 0, "USD")}
                  </p>

                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    {formatCurrency(creditSummary?.zwg ?? 0, "ZWG")}
                  </p>
                </div>
              }
              description="Customer balances currently owed"
              icon={Wallet}
            />

            <MetricCard
              label="Stock attention"
              value={
                <div className="space-y-1.5">
                  <p className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
                    {outOfStockCount} out of stock
                  </p>

                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    {lowStockCount} running low
                  </p>
                </div>
              }
              description="Inventory variants needing attention"
              icon={CircleAlert}
            />

            <MetricCard
              label="Completed today"
              value={
                <p className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  {(todaySales?.usdCount ?? 0) + (todaySales?.zwgCount ?? 0)}
                </p>
              }
              description="Completed transactions today"
              icon={ShoppingCart}
            />
          </section>

          {creditError && <Alert variant="error">{creditError}</Alert>}

          {stockNeedsAttention && (
            <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/70 dark:bg-amber-950/20">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                    <Package className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                      Stock needs attention
                    </h2>

                    <p className="mt-1 text-sm leading-5 text-amber-800/80 dark:text-amber-300/80">
                      {outOfStockCount > 0 && `${outOfStockCount} out of stock`}
                      {outOfStockCount > 0 && lowStockCount > 0 && " · "}
                      {lowStockCount > 0 && `${lowStockCount} running low`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/inventory")}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-amber-200 bg-white px-3 text-sm font-medium text-amber-900 transition hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-950/50"
                >
                  View inventory
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          )}

          <section className="space-y-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
                  Sales performance
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Revenue across your selected period.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
                  {presets.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => handlePresetChange(item.value)}
                      className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                        preset === item.value
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    aria-label="Sales trend start date"
                    value={startDate}
                    max={endDate}
                    onChange={(event) =>
                      handleStartDateChange(event.target.value)
                    }
                    className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  />

                  <span className="text-xs text-slate-400">to</span>

                  <input
                    type="date"
                    aria-label="Sales trend end date"
                    value={endDate}
                    min={startDate}
                    onChange={(event) =>
                      handleEndDateChange(event.target.value)
                    }
                    className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  />
                </div>
              </div>
            </div>

            {trendError && <Alert variant="error">{trendError}</Alert>}

            <Suspense
              fallback={
                <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <LoadingState message="Loading sales performance..." />
                </div>
              }
            >
              {isLoadingTrend ? (
                <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <LoadingState message="Loading sales performance..." />
                </div>
              ) : (
                <SalesTrendChart data={salesTrend} />
              )}
            </Suspense>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-semibold text-slate-950 dark:text-white">
                    Recent activity
                  </h2>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Latest recorded business activity.
                  </p>
                </div>

                <Activity className="h-[18px] w-[18px] text-slate-400" />
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {summary.recentActivity.length > 0 ? (
                  summary.recentActivity.map((activity) => {
                    const Icon =
                      activity.type === "sale"
                        ? ShoppingCart
                        : activity.type === "inventory"
                          ? Package
                          : Boxes;

                    return (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 px-5 py-4"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            {activity.title}
                          </p>

                          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                            {activity.description}
                          </p>

                          {activity.timestamp && (
                            <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                              {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          )}
                        </div>

                        {activity.amountText && (
                          <p className="shrink-0 text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {activity.amountText}
                          </p>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
                    <Activity className="h-8 w-8 text-slate-400" />

                    <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">
                      No activity yet
                    </p>

                    <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
                      Sales and inventory activity will appear here as your
                      business operates.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <h2 className="text-base font-semibold text-slate-950 dark:text-white">
                  Quick actions
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Go directly to essential tasks.
                </p>
              </div>

              <div className="space-y-2 p-3">
                <ActionLink
                  title="Start a sale"
                  description="Open point of sale"
                  icon={ShoppingCart}
                  onClick={() => navigate("/pos")}
                />

                <ActionLink
                  title="Manage inventory"
                  description="Review stock and movements"
                  icon={Package}
                  onClick={() => navigate("/inventory")}
                />

                <ActionLink
                  title="Manage customers"
                  description="Customer records and balances"
                  icon={Store}
                  onClick={() => navigate("/customers")}
                />

                <ActionLink
                  title="View reports"
                  description="Explore business performance"
                  icon={ArrowUpRight}
                  onClick={() => navigate("/reports")}
                />
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
