import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  RefreshCw,
  Search,
  Users,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MetricCard } from "../../../components/ui/MetricCard";
import { Card } from "../../../components/ui/Card";
import { useBusiness } from "../../business/hooks/useActiveBusiness";
import { fetchCustomersWithFinancialSummary } from "../../customers/services/customerService";
import type { CustomerSearchResult } from "../../customers/types/customer";

type CreditFilter = "all" | "owing" | "credit" | "settled";

function formatMoney(value: number, currency: "USD" | "ZWG"): string {
  const amount = Number.isFinite(value) ? value : 0;

  return `${currency} ${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))}`;
}

function getCustomerName(customer: CustomerSearchResult): string {
  return customer.business_name || customer.full_name || "Unnamed customer";
}

function getBalanceStatus(customer: CustomerSearchResult): CreditFilter {
  const usd = customer.current_outstanding_balance_usd;
  const zwg = customer.current_outstanding_balance_zwg;

  if (usd > 0 || zwg > 0) {
    return "owing";
  }

  if (usd < 0 || zwg < 0) {
    return "credit";
  }

  return "settled";
}


export function CreditPage() {
  const { activeBusiness } = useBusiness();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<CustomerSearchResult[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CreditFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const businessId = activeBusiness?.id;

  useEffect(() => {
    if (!businessId) {
      return;
    }

    let cancelled = false;

    const loadCustomers = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const results = await fetchCustomersWithFinancialSummary(
          businessId,
          search,
        );

        if (!cancelled) {
          setCustomers(results);
        }
      } catch (err) {
        if (!cancelled) {
          setCustomers([]);
          setError(
            err instanceof Error
              ? err.message
              : "Customer credit information could not be loaded.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadCustomers();

    return () => {
      cancelled = true;
    };
  }, [businessId, search, reloadKey]);

  const summary = useMemo(() => {
    return customers.reduce(
      (totals, customer) => {
        const usd = Number(customer.current_outstanding_balance_usd) || 0;
        const zwg = Number(customer.current_outstanding_balance_zwg) || 0;

        totals.outstandingUsd += Math.max(usd, 0);
        totals.outstandingZwg += Math.max(zwg, 0);

        totals.customerCreditUsd += Math.max(-usd, 0);
        totals.customerCreditZwg += Math.max(-zwg, 0);

        totals.totalSalesUsd += Number(customer.total_sales_usd) || 0;
        totals.totalSalesZwg += Number(customer.total_sales_zwg) || 0;

        totals.totalPaymentsUsd += Number(customer.total_payments_usd) || 0;
        totals.totalPaymentsZwg += Number(customer.total_payments_zwg) || 0;

        if (usd > 0 || zwg > 0) {
          totals.owingCustomers += 1;
        }

        if (usd < 0 || zwg < 0) {
          totals.creditCustomers += 1;
        }

        if (usd === 0 && zwg === 0) {
          totals.settledCustomers += 1;
        }

        return totals;
      },
      {
        outstandingUsd: 0,
        outstandingZwg: 0,
        customerCreditUsd: 0,
        customerCreditZwg: 0,
        totalSalesUsd: 0,
        totalSalesZwg: 0,
        totalPaymentsUsd: 0,
        totalPaymentsZwg: 0,
        owingCustomers: 0,
        creditCustomers: 0,
        settledCustomers: 0,
      },
    );
  }, [customers]);

  const visibleCustomers = useMemo(() => {
    return customers.filter((customer) => {
      if (filter === "all") {
        return true;
      }

      return getBalanceStatus(customer) === filter;
    });
  }, [customers, filter]);

  const filters: { value: CreditFilter; label: string; count: number }[] = [
    { value: "all", label: "All customers", count: customers.length },
    { value: "owing", label: "Owing", count: summary.owingCustomers },
    {
      value: "credit",
      label: "Customer credit",
      count: summary.creditCustomers,
    },
    { value: "settled", label: "Settled", count: summary.settledCustomers },
  ];

  return (
    <div className="min-h-full space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Credit Management
              </h1>
              <p className="text-sm text-muted-foreground">
                Monitor customer balances, outstanding debt and payments.
              </p>
            </div>
          </div>

          {activeBusiness?.name && (
            <p className="mt-3 text-xs text-muted-foreground">
              Business: {activeBusiness.name}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setReloadKey((current) => current + 1)}
          disabled={isLoading || !businessId}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Unable to load credit information</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {!businessId ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center">
          <Wallet className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 font-semibold text-foreground">
            No active business selected
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Select a business to view its customer credit information.
          </p>
        </div>
      ) : (
        <>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Outstanding balances
              </h2>
              <span className="text-xs text-muted-foreground">
                Separate currency totals
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Outstanding USD"
                value={formatMoney(summary.outstandingUsd, "USD")}
                description="Total positive USD ledger balances"
                icon={Wallet}
                accent="blue"
              />
              <MetricCard
                label="Outstanding ZWG"
                value={formatMoney(summary.outstandingZwg, "ZWG")}
                description="Total positive ZWG ledger balances"
                icon={Wallet}
                accent="purple"
              />
              <MetricCard
                label="Customers owing"
                value={String(summary.owingCustomers)}
                description="Customers with a positive balance"
                icon={Users}
                accent="amber"
              />
              <MetricCard
                label="Customer credits"
                value={String(summary.creditCustomers)}
                description="Customers with a negative balance"
                icon={ArrowDownRight}
                accent="green"
              />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card padding="md">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    USD activity
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Recorded sales and payments
                  </p>
                </div>
                <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total sales</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {formatMoney(summary.totalSalesUsd, "USD")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Total payments
                  </p>
                  <p className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatMoney(summary.totalPaymentsUsd, "USD")}
                  </p>
                </div>
              </div>
            </Card>

            <Card padding="md">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    ZWG activity
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Recorded sales and payments
                  </p>
                </div>
                <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-600 dark:text-purple-400">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total sales</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {formatMoney(summary.totalSalesZwg, "ZWG")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Total payments
                  </p>
                  <p className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatMoney(summary.totalPaymentsZwg, "ZWG")}
                  </p>
                </div>
              </div>
            </Card>
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border p-5">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Customer credit accounts
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Review individual customer balances and financial activity.
                  </p>
                </div>

                <div className="relative w-full lg:max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search customers by name or phone..."
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[var(--brand-primary)]"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {filters.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFilter(item.value)}
                    className={`rounded-full px-3.5 py-2 text-xs font-medium transition ${
                      filter === item.value
                        ? "bg-[var(--brand-primary)] text-white"
                        : "border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {item.label}
                    <span className="ml-2 opacity-75">{item.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center px-6 py-16">
                <RefreshCw className="h-7 w-7 animate-spin text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Loading customer credit accounts...
                </p>
              </div>
            ) : visibleCustomers.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <Users className="mx-auto h-9 w-9 text-muted-foreground" />
                <h3 className="mt-3 font-semibold text-foreground">
                  {customers.length === 0
                    ? "No customer accounts found"
                    : "No matching customers"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {customers.length === 0
                    ? "Customer financial records will appear here when available."
                    : "Try changing your search or selecting another filter."}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px] text-left text-sm">
                    <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3.5 font-semibold">Customer</th>
                        <th className="px-4 py-3.5 text-right font-semibold">
                          Outstanding USD
                        </th>
                        <th className="px-4 py-3.5 text-right font-semibold">
                          Outstanding ZWG
                        </th>
                        <th className="px-4 py-3.5 text-right font-semibold">
                          Sales USD
                        </th>
                        <th className="px-4 py-3.5 text-right font-semibold">
                          Payments USD
                        </th>
                        <th className="px-4 py-3.5 text-right font-semibold">
                          Sales ZWG
                        </th>
                        <th className="px-4 py-3.5 text-right font-semibold">
                          Payments ZWG
                        </th>
                        <th className="px-5 py-3.5 text-right font-semibold">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-border">
                      {visibleCustomers.map((customer) => {
                        const usd =
                          Number(customer.current_outstanding_balance_usd) || 0;
                        const zwg =
                          Number(customer.current_outstanding_balance_zwg) || 0;
                        const status = getBalanceStatus(customer);

                        return (
                          <tr
                            key={customer.id}
                            className="transition hover:bg-muted/30"
                          >
                            <td className="px-5 py-4">
                              <div className="font-medium text-foreground">
                                {getCustomerName(customer)}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {customer.phone || "No phone number"}
                              </div>
                              <div className="mt-2">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                                    status === "owing"
                                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                      : status === "credit"
                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                        : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {status === "owing"
                                    ? "Owing"
                                    : status === "credit"
                                      ? "Customer credit"
                                      : "Settled"}
                                </span>
                              </div>
                            </td>

                            <td
                              className={`px-4 py-4 text-right font-medium tabular-nums ${
                                usd > 0
                                  ? "text-amber-700 dark:text-amber-400"
                                  : usd < 0
                                    ? "text-emerald-700 dark:text-emerald-400"
                                    : "text-foreground"
                              }`}
                            >
                              {usd < 0 ? "-" : ""}
                              {formatMoney(usd, "USD")}
                            </td>

                            <td
                              className={`px-4 py-4 text-right font-medium tabular-nums ${
                                zwg > 0
                                  ? "text-amber-700 dark:text-amber-400"
                                  : zwg < 0
                                    ? "text-emerald-700 dark:text-emerald-400"
                                    : "text-foreground"
                              }`}
                            >
                              {zwg < 0 ? "-" : ""}
                              {formatMoney(zwg, "ZWG")}
                            </td>

                            <td className="px-4 py-4 text-right text-foreground tabular-nums">
                              {formatMoney(
                                Number(customer.total_sales_usd) || 0,
                                "USD",
                              )}
                            </td>

                            <td className="px-4 py-4 text-right text-emerald-700 dark:text-emerald-400 tabular-nums">
                              {formatMoney(
                                Number(customer.total_payments_usd) || 0,
                                "USD",
                              )}
                            </td>

                            <td className="px-4 py-4 text-right text-foreground tabular-nums">
                              {formatMoney(
                                Number(customer.total_sales_zwg) || 0,
                                "ZWG",
                              )}
                            </td>

                            <td className="px-4 py-4 text-right text-emerald-700 dark:text-emerald-400 tabular-nums">
                              {formatMoney(
                                Number(customer.total_payments_zwg) || 0,
                                "ZWG",
                              )}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(`/customers/${customer.id}`)
                                }
                                className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
                              >
                                View account
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col justify-between gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center">
                  <span>
                    Showing {visibleCustomers.length} of {customers.length}{" "}
                    customers
                  </span>
                  <span>
                    Payment recording is managed from individual sale records.
                  </span>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
