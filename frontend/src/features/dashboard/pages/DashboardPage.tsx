import { lazy, Suspense, useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Boxes,
  CalendarDays,
  ChevronRight,
  PackageCheck,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { LoadingState } from "../../../components/ui/LoadingState";
import { BusinessSelector } from "../../business/components/BusinessSelector";
import { useBusiness } from "../../business/hooks/useActiveBusiness";
import { useAuth } from "../../auth/hooks/useAuth";
import {
  fetchDashboardSummary,
  fetchSalesTrend,
} from "../services/dashboardService";
import type { DashboardSummary, SalesTrendPoint } from "../types/dashboard";
import { MiniCalendar } from "../components/DashboardUtilities";

const SalesTrendChart = lazy(() => import("../components/SalesTrendChart"));

type DatePreset = "today" | "week" | "month" | "90days" | "custom";

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRange(preset: Exclude<DatePreset, "custom">) {
  const end = new Date();
  const start = new Date(end);

  if (preset === "today") {
    // Same start and end date.
  } else if (preset === "week") {
    const day = start.getDay();
    start.setDate(start.getDate() - day);
  } else if (preset === "month") {
    start.setDate(1);
  } else {
    start.setDate(start.getDate() - 89);
  }

  return {
    start: toDateString(start),
    end: toDateString(end),
  };
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const navigationItems = [
  {
    label: "Products",
    description: "Manage your catalogue",
    route: "/catalogue",
    icon: Boxes,
  },
  {
    label: "Inventory",
    description: "Review stock levels",
    route: "/inventory",
    icon: PackageCheck,
  },
  {
    label: "Point of sale",
    description: "Record a customer sale",
    route: "/pos",
    icon: ShoppingCart,
  },
  {
    label: "Customers",
    description: "Manage customer accounts",
    route: "/customers",
    icon: Activity,
  },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { activeBusiness, activeBusinessId, isLoading } = useBusiness();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [salesTrend, setSalesTrend] = useState<SalesTrendPoint[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingTrend, setIsLoadingTrend] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [trendError, setTrendError] = useState<string | null>(null);

  const initialRange = getRange("week");
  const [preset, setPreset] = useState<DatePreset>("week");
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [selectedDate, setSelectedDate] = useState(toDateString(new Date()));

  const greeting = getGreeting();
  const displayName =
    profile?.full_name?.trim() ||
    (user?.email ? user.email.split("@")[0] : "there");
  const businessName = activeBusiness?.name ?? "your business";

  useEffect(() => {
    if (!activeBusinessId) return;

    let cancelled = false;

    Promise.resolve()
      .then(() => {
        if (cancelled) return undefined;

        setIsLoadingSummary(true);
        return fetchDashboardSummary(activeBusinessId);
      })
      .then((result) => {
        if (cancelled || !result) return;
        setSummary(result);
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        console.error("Failed to load dashboard summary", error);
        if (!cancelled) {
          setSummary(null);
          setErrorMessage(
            "We could not load the dashboard data. Please try again.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSummary(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeBusinessId]);

  useEffect(() => {
    if (!activeBusinessId || !startDate || !endDate || startDate > endDate) {
      return;
    }

    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        setIsLoadingTrend(true);
        setTrendError(null);
      }
    });

    fetchSalesTrend(activeBusinessId, startDate, endDate)
      .then((result) => {
        if (!cancelled) setSalesTrend(result);
      })
      .catch((error: unknown) => {
        console.error("Failed to load sales trend", error);
        if (!cancelled) {
          setSalesTrend([]);
          setTrendError(
            "Sales analytics could not be loaded for this date range.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTrend(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeBusinessId, startDate, endDate]);

  const handlePreset = (nextPreset: Exclude<DatePreset, "custom">) => {
    const range = getRange(nextPreset);
    setPreset(nextPreset);
    setStartDate(range.start);
    setEndDate(range.end);
  };

  const handleSelectCalendarDate = (date: string) => {
    setSelectedDate(date);
    setPreset("custom");
    setStartDate(date);
    setEndDate(date);
  };

  const handleStartDateChange = (value: string) => {
    setPreset("custom");
    setStartDate(value);
    if (value > endDate) setEndDate(value);
  };

  const handleEndDateChange = (value: string) => {
    setPreset("custom");
    setEndDate(value);
    if (value < startDate) setStartDate(value);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  if (isLoading || (Boolean(activeBusinessId) && isLoadingSummary)) {
    return <LoadingState message="Preparing your business dashboard..." />;
  }

  const metrics = [
    {
      label: "Products",
      value: summary?.productCount.toLocaleString() ?? "0",
      description: "Product families",
      icon: Boxes,
    },
    {
      label: "Active variants",
      value: summary?.activeVariantCount.toLocaleString() ?? "0",
      description: "Available product variants",
      icon: PackageCheck,
    },
    {
      label: "On-hand crates",
      value:
        summary?.stockOnHand === null || summary?.stockOnHand === undefined
          ? "Unavailable"
          : summary.stockOnHand.toLocaleString(),
      description:
        summary?.stockSource === "projection"
          ? "Current stock balance"
          : "Stock data unavailable",
      icon: TrendingUp,
    },
    {
      label: "Completed sales",
      value: summary?.completedSalesCount.toLocaleString() ?? "0",
      description: "All-time completed transactions",
      icon: ShoppingCart,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-7 pb-8">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: "var(--brand-primary)" }}
            />
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Business overview
            </p>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            {greeting}, {displayName}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Here's what's happening with{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {businessName}
            </span>{" "}
            today. Here's your business at a glance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/onboarding")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Add business
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            Sign out
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <BusinessSelector />

      {!activeBusiness ? (
        <Alert variant="info" title="No active business">
          Create a business or select one to view its dashboard.
        </Alert>
      ) : (
        <>
          {errorMessage ? (
            <Alert variant="error" title="Dashboard data unavailable">
              {errorMessage}
            </Alert>
          ) : null}

          <section aria-label="Business metrics">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Business snapshot
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Key figures from your workspace
                </p>
              </div>
              <span className="hidden rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 sm:inline-flex">
                Live business data
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => {
                const Icon = metric.icon;

                return (
                  <article
                    key={metric.label}
                    className="group min-w-0 rounded-2xl border border-border bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                          {metric.label}
                        </p>
                        <p className="mt-4 break-words text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                          {metric.value}
                        </p>
                      </div>

                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor:
                            "color-mix(in srgb, var(--brand-primary) 12%, transparent)",
                          color: "var(--brand-primary)",
                        }}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {metric.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:bg-slate-900">
            <div className="flex flex-col gap-4 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--brand-primary) 12%, transparent)",
                    color: "var(--brand-primary)",
                  }}
                >
                  <CalendarDays className="h-5 w-5" />
                </span>

                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Performance period
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Choose the period used by your sales analytics.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["today", "Today"],
                    ["week", "This week"],
                    ["month", "This month"],
                    ["90days", "90 days"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handlePreset(value)}
                    aria-pressed={preset === value}
                    className={`rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                      preset === value
                        ? "text-white shadow-sm"
                        : "border border-border bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                    style={
                      preset === value
                        ? { backgroundColor: "var(--brand-primary)" }
                        : undefined
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 border-t border-slate-100 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-800/30 sm:grid-cols-2 sm:px-6">
              <label className="block min-w-0">
                <span className="mb-2 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Start date
                </span>
                <input
                  type="date"
                  value={startDate}
                  max={endDate}
                  onChange={(event) =>
                    handleStartDateChange(event.target.value)
                  }
                  className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <label className="block min-w-0">
                <span className="mb-2 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  End date
                </span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(event) => handleEndDateChange(event.target.value)}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:bg-slate-900 dark:text-white"
                />
              </label>
            </div>

            {trendError ? (
              <div className="border-t border-rose-100 px-5 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:text-rose-400">
                {trendError}
              </div>
            ) : null}
          </section>

          {isLoadingTrend ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-border bg-white text-sm text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-400">
              Updating sales analytics...
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-border bg-white text-sm text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-400">
                  Loading sales analytics...
                </div>
              }
            >
              <SalesTrendChart data={salesTrend} />
            </Suspense>
          )}

          <section className="min-w-0">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Your schedule
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Select a date to view its sales performance.
              </p>
            </div>

            <MiniCalendar
              selectedDate={selectedDate}
              onSelectDate={handleSelectCalendarDate}
            />
          </section>

          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
            <section className="min-w-0 rounded-2xl border border-border bg-white p-5 shadow-sm dark:bg-slate-900 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Business activity
                  </p>
                  <h2 className="mt-1.5 text-lg font-bold text-slate-900 dark:text-white">
                    Recent activity
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Latest recorded business operations
                  </p>
                </div>

                <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  Recent records
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {summary?.recentActivity.length ? (
                  summary.recentActivity.map((item) => (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="flex min-w-0 items-start justify-between gap-3 rounded-xl border border-slate-100 p-3.5 transition hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-800/50"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor:
                              "color-mix(in srgb, var(--brand-primary) 10%, transparent)",
                            color: "var(--brand-primary)",
                          }}
                        >
                          {item.type === "sale" ? (
                            <ShoppingCart className="h-4 w-4" />
                          ) : item.type === "inventory" ? (
                            <PackageCheck className="h-4 w-4" />
                          ) : (
                            <Boxes className="h-4 w-4" />
                          )}
                        </span>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold capitalize text-slate-800 dark:text-slate-100">
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {item.description}
                          </p>
                          <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                            {item.timestamp
                              ? new Date(item.timestamp).toLocaleString()
                              : "Date unavailable"}
                          </p>
                        </div>
                      </div>

                      {item.amountText ? (
                        <span className="shrink-0 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {item.amountText}
                        </span>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="flex min-h-[230px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-5 text-center dark:border-slate-700 dark:bg-slate-800/30">
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor:
                          "color-mix(in srgb, var(--brand-primary) 12%, transparent)",
                        color: "var(--brand-primary)",
                      }}
                    >
                      <Activity className="h-6 w-6" />
                    </span>
                    <p className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                      No activity yet
                    </p>
                    <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500 dark:text-slate-400">
                      Sales and inventory movements will appear here when
                      recorded in your workspace.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="min-w-0 rounded-2xl border border-border bg-white p-5 shadow-sm dark:bg-slate-900 sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Workspace
                </p>
                <h2 className="mt-1.5 text-lg font-bold text-slate-900 dark:text-white">
                  Quick access
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Jump straight into your daily operations.
                </p>
              </div>

              <div className="mt-5 space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.route}
                      type="button"
                      onClick={() => navigate(item.route)}
                      className="group flex w-full min-w-0 items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/60"
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor:
                            "color-mix(in srgb, var(--brand-primary) 10%, transparent)",
                          color: "var(--brand-primary)",
                        }}
                      >
                        <Icon className="h-4 w-4" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                          {item.description}
                        </span>
                      </span>

                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" />
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Signed in as
                </p>
                <p className="mt-1.5 break-all text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {user?.email ?? "Team member"}
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/reports")}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold transition hover:opacity-80"
                  style={{ color: "var(--brand-primary)" }}
                >
                  View reports
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
