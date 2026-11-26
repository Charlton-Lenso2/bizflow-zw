import { lazy, Suspense, useEffect, useState } from "react";
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
import { MetricCard } from "../../../components/ui/MetricCard";
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
import { DateRangePicker } from "../../../components/ui/DateRangePicker";

const SalesTrendChart = lazy(() => import("../components/SalesTrendChart"));

type CreditSummary = {
  usd: number;
  zwg: number;
};

type AsyncResource<T> =
  | {
      key: string;
      status: "success";
      data: T;
    }
  | {
      key: string;
      status: "error";
      error: string;
    };

type TodaySalesSummary = {
  usd: number;
  zwg: number;
  usdCount: number;
  zwgCount: number;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getInitialRange() {
  const now = new Date();
  const end = toDateString(now);
  const start = new Date(now);

  start.setDate(now.getDate() - now.getDay());

  return {
    start: toDateString(start),
    end,
  };
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

  const { activeBusinessId, isLoading: isBusinessLoading } = useBusiness();

  const [summaryResource, setSummaryResource] =
    useState<AsyncResource<DashboardSummary> | null>(null);

  const [todaySalesResource, setTodaySalesResource] =
    useState<AsyncResource<TodaySalesSummary> | null>(null);

  const [creditResource, setCreditResource] =
    useState<AsyncResource<CreditSummary> | null>(null);

  const [trendResource, setTrendResource] = useState<AsyncResource<
    SalesTrendPoint[]
  > | null>(null);

  const initialRange = getInitialRange();

  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);

  const displayName =
    profile?.full_name?.trim() || user?.email?.split("@")[0] || "there";

  const summaryResourceForBusiness =
    activeBusinessId && summaryResource?.key === activeBusinessId
      ? summaryResource
      : null;

  const todaySalesResourceForBusiness =
    activeBusinessId && todaySalesResource?.key === activeBusinessId
      ? todaySalesResource
      : null;

  const creditResourceForBusiness =
    activeBusinessId && creditResource?.key === activeBusinessId
      ? creditResource
      : null;

  const summary =
    summaryResourceForBusiness?.status === "success"
      ? summaryResourceForBusiness.data
      : null;

  const todaySales =
    todaySalesResourceForBusiness?.status === "success"
      ? todaySalesResourceForBusiness.data
      : null;

  const creditSummary =
    creditResourceForBusiness?.status === "success"
      ? creditResourceForBusiness.data
      : null;

  const errorMessage =
    summaryResourceForBusiness?.status === "error"
      ? summaryResourceForBusiness.error
      : null;

  const salesError =
    todaySalesResourceForBusiness?.status === "error"
      ? todaySalesResourceForBusiness.error
      : null;

  const creditError =
    creditResourceForBusiness?.status === "error"
      ? creditResourceForBusiness.error
      : null;

  const isLoadingSummary = Boolean(
    activeBusinessId && !summaryResourceForBusiness,
  );

  const isLoadingTodaySales = Boolean(
    activeBusinessId && !todaySalesResourceForBusiness,
  );

  const isLoadingCredit = Boolean(
    activeBusinessId && !creditResourceForBusiness,
  );

  const isValidTrendRange =
    Boolean(startDate) && Boolean(endDate) && startDate <= endDate;

  const trendKey =
    activeBusinessId && isValidTrendRange
      ? `${activeBusinessId}:${startDate}:${endDate}`
      : null;

  const trendResourceForSelection =
    trendKey && trendResource?.key === trendKey ? trendResource : null;

  const salesTrend =
    trendResourceForSelection?.status === "success"
      ? trendResourceForSelection.data
      : [];

  const trendError =
    trendResourceForSelection?.status === "error"
      ? trendResourceForSelection.error
      : null;

  const isLoadingTrend = Boolean(
    activeBusinessId && isValidTrendRange && !trendResourceForSelection,
  );

  useEffect(() => {
    if (!activeBusinessId) return;

    let cancelled = false;
    const businessId = activeBusinessId;

    async function loadDashboardSummary() {
      try {
        const result = await fetchDashboardSummary(businessId);

        if (!cancelled) {
          setSummaryResource({
            key: businessId,
            status: "success",
            data: result,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setSummaryResource({
            key: businessId,
            status: "error",
            error: getErrorMessage(
              error,
              "Unable to load your business overview.",
            ),
          });
        }
      }
    }

    async function loadTodaySales() {
      try {
        const result = await fetchTodaySalesSummary(businessId);

        if (!cancelled) {
          setTodaySalesResource({
            key: businessId,
            status: "success",
            data: result,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setTodaySalesResource({
            key: businessId,
            status: "error",
            error: getErrorMessage(
              error,
              "Unable to load today's sales summary.",
            ),
          });
        }
      }
    }

    async function loadCreditSummary() {
      try {
        const customers = await fetchCustomersWithFinancialSummary(
          businessId,
          "",
        );

        const outstanding: CreditSummary = {
          usd: 0,
          zwg: 0,
        };

        for (const customer of customers) {
          const usd = Number(customer.current_outstanding_balance_usd ?? 0);
          const zwg = Number(customer.current_outstanding_balance_zwg ?? 0);

          if (Number.isFinite(usd) && usd > 0) {
            outstanding.usd += usd;
          }

          if (Number.isFinite(zwg) && zwg > 0) {
            outstanding.zwg += zwg;
          }
        }

        if (!cancelled) {
          setCreditResource({
            key: businessId,
            status: "success",
            data: outstanding,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setCreditResource({
            key: businessId,
            status: "error",
            error: getErrorMessage(
              error,
              "Unable to load customer credit balances.",
            ),
          });
        }
      }
    }

    void loadDashboardSummary();
    void loadTodaySales();
    void loadCreditSummary();

    return () => {
      cancelled = true;
    };
  }, [activeBusinessId]);

  useEffect(() => {
    if (!activeBusinessId || !isValidTrendRange || !trendKey) return;

    let cancelled = false;

    const businessId = activeBusinessId;
    const rangeStart = startDate;
    const rangeEnd = endDate;
    const requestKey = trendKey;

    async function loadTrend() {
      try {
        const result = await fetchSalesTrend(businessId, rangeStart, rangeEnd);

        if (!cancelled) {
          setTrendResource({
            key: requestKey,
            status: "success",
            data: result,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setTrendResource({
            key: requestKey,
            status: "error",
            error: getErrorMessage(error, "Unable to load sales performance."),
          });
        }
      }
    }

    void loadTrend();

    return () => {
      cancelled = true;
    };
  }, [activeBusinessId, startDate, endDate, isValidTrendRange, trendKey]);

  function handleDateRangeApply(nextStart: string, nextEnd: string) {
    if (nextStart > nextEnd) return;

    setStartDate(nextStart);
    setEndDate(nextEnd);
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
                isLoadingTodaySales ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Loading sales...
                  </p>
                ) : todaySales ? (
                  <div className="space-y-1.5">
                    <p className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
                      {formatCurrency(todaySales.usd, "USD")}
                    </p>

                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      {formatCurrency(todaySales.zwg, "ZWG")}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                    Unavailable
                  </p>
                )
              }
              description={
                todaySales
                  ? `${todaySales.usdCount} USD · ${todaySales.zwgCount} ZWG transactions`
                  : "Today's transaction summary"
              }
              icon={TrendingUp}
            />

            <MetricCard
              label="Outstanding credit"
              value={
                isLoadingCredit ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Loading balances...
                  </p>
                ) : creditSummary ? (
                  <div className="space-y-1.5">
                    <p className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
                      {formatCurrency(creditSummary.usd, "USD")}
                    </p>

                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      {formatCurrency(creditSummary.zwg, "ZWG")}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                    Unavailable
                  </p>
                )
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
                isLoadingTodaySales ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Loading...
                  </p>
                ) : todaySales ? (
                  <p className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                    {todaySales.usdCount + todaySales.zwgCount}
                  </p>
                ) : (
                  <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                    Unavailable
                  </p>
                )
              }
              description="Completed transactions today"
              icon={ShoppingCart}
            />
          </section>

          {salesError && <Alert variant="error">{salesError}</Alert>}

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

              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onApply={handleDateRangeApply}
              />
            </div>

            {trendError && <Alert variant="error">{trendError}</Alert>}

            {activeBusinessId && isValidTrendRange && (
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
            )}

            {!isValidTrendRange && (
              <Alert variant="info">
                Select a valid date range to view sales performance.
              </Alert>
            )}
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
