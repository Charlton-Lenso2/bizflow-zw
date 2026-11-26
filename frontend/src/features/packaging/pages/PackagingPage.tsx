import { CustomSelect } from "../../../components/ui/CustomSelect";
import { MetricCard } from "../../../components/ui/MetricCard";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowLeftRight,
  Boxes,
  Package,
  Plus,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { useBusiness } from "../../business/hooks/useActiveBusiness";
import {
  createPackagingType,
  fetchPackagingDashboardData,
  type PackagingCategory,
} from "../services/packagingService";
import type {
  PackagingBalance,
  PackagingCustomer,
  PackagingDashboardData,
  PackagingTransaction,
} from "../types/packaging";

type BalanceFilter = "all" | "owed" | "settled";

const EMPTY_DATA: PackagingDashboardData = {
  packagingTypes: [],
  customers: [],
  balances: [],
  transactions: [],
};

function getCustomerName(customer?: PackagingCustomer): string {
  if (!customer) return "Unknown customer";

  return (
    customer.business_name?.trim() ||
    customer.full_name?.trim() ||
    "Unnamed customer"
  );
}

function getBalanceStatus(balance: PackagingBalance): boolean {
  return balance.is_owed ?? Number(balance.balance_quantity ?? 0) > 0;
}

function formatQuantity(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}


export function PackagingPage() {
  const {
    activeBusiness,
    activeBusinessId,
    isLoading: isBusinessLoading,
  } = useBusiness();

  const [data, setData] = useState<PackagingDashboardData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>("all");
  const [packagingTypeFilter, setPackagingTypeFilter] = useState("all");
  const [newPackagingName, setNewPackagingName] = useState("");
  const [newPackagingCategory, setNewPackagingCategory] =
    useState<PackagingCategory>("bottle");
  const [newPackagingReturnable, setNewPackagingReturnable] = useState(true);
  const [isCreatingPackagingType, setIsCreatingPackagingType] = useState(false);
  const [packagingFormError, setPackagingFormError] = useState<string | null>(null);
  const [packagingFormSuccess, setPackagingFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!activeBusinessId) return;

    let cancelled = false;

    async function loadPackagingData() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchPackagingDashboardData(activeBusinessId!);

        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        console.error("Failed to load packaging dashboard", err);

        if (!cancelled) {
          setData(EMPTY_DATA);
          setError(
            "Packaging information could not be loaded. Please try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadPackagingData();

    return () => {
      cancelled = true;
    };
  }, [activeBusinessId]);

  async function handleCreatePackagingType(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!activeBusinessId) {
      setPackagingFormError("Select a business before creating a packaging type.");
      return;
    }

    if (!newPackagingName.trim()) {
      setPackagingFormError("Enter a packaging type name.");
      return;
    }

    setIsCreatingPackagingType(true);
    setPackagingFormError(null);
    setPackagingFormSuccess(null);

    try {
      const created = await createPackagingType({
        businessId: activeBusinessId,
        name: newPackagingName,
        packagingCategory: newPackagingCategory,
        isReturnable: newPackagingReturnable,
      });

      const refreshedData = await fetchPackagingDashboardData(activeBusinessId);
      setData(refreshedData);
      setNewPackagingName("");
      setNewPackagingCategory("bottle");
      setNewPackagingReturnable(true);
      setPackagingFormSuccess(`${created.name} was created successfully.`);
    } catch (err) {
      setPackagingFormError(
        err instanceof Error
          ? err.message
          : "Could not create the packaging type. Please try again.",
      );
    } finally {
      setIsCreatingPackagingType(false);
    }
  }

  const customerMap = useMemo(
    () => new Map(data.customers.map((customer) => [customer.id, customer])),
    [data.customers],
  );

  const owedBalances = useMemo(
    () => data.balances.filter(getBalanceStatus),
    [data.balances],
  );

  const outstandingUnits = useMemo(
    () =>
      owedBalances.reduce(
        (total, balance) =>
          total + Math.max(0, Number(balance.balance_quantity ?? 0)),
        0,
      ),
    [owedBalances],
  );

  const customersWithOutstanding = useMemo(
    () => new Set(owedBalances.map((balance) => balance.customer_id)).size,
    [owedBalances],
  );

  const filteredBalances = useMemo(() => {
    const term = search.trim().toLowerCase();

    return data.balances.filter((balance) => {
      const customer = customerMap.get(balance.customer_id);
      const customerName = getCustomerName(customer).toLowerCase();
      const packagingName = (balance.packaging_type_name ?? "").toLowerCase();
      const category = (balance.packaging_category ?? "").toLowerCase();
      const isOwed = getBalanceStatus(balance);

      const matchesSearch =
        !term ||
        customerName.includes(term) ||
        packagingName.includes(term) ||
        category.includes(term) ||
        (customer?.phone ?? "").toLowerCase().includes(term);

      const matchesStatus =
        balanceFilter === "all" ||
        (balanceFilter === "owed" && isOwed) ||
        (balanceFilter === "settled" && !isOwed);

      const matchesType =
        packagingTypeFilter === "all" ||
        balance.packaging_type_id === packagingTypeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [data.balances, customerMap, search, balanceFilter, packagingTypeFilter]);

  const filteredTransactions = useMemo(() => {
    const term = search.trim().toLowerCase();

    return data.transactions.filter((transaction) => {
      if (!term) return true;

      const customer = transaction.customer_id
        ? customerMap.get(transaction.customer_id)
        : undefined;

      return (
        getCustomerName(customer).toLowerCase().includes(term) ||
        (transaction.packaging_type_name ?? "").toLowerCase().includes(term) ||
        (transaction.packaging_category ?? "").toLowerCase().includes(term) ||
        (transaction.transaction_type ?? "").toLowerCase().includes(term)
      );
    });
  }, [data.transactions, customerMap, search]);

  const handleRefresh = async () => {
    if (!activeBusinessId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchPackagingDashboardData(activeBusinessId);
      setData(result);
    } catch (err) {
      console.error("Failed to refresh packaging dashboard", err);
      setError("Could not refresh packaging information. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isBusinessLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading business...
        </div>
      </div>
    );
  }

  if (!activeBusiness) {
    return (
      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-border bg-white p-8 text-center dark:bg-slate-900">
        <Package className="mx-auto h-10 w-10 text-slate-400" />
        <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
          No active business
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Select or create a business to manage packaging.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 pb-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: "var(--brand-primary)" }}
            />
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Reusable packaging
            </p>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Packaging management
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Track customer packaging balances and transaction history for{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {activeBusiness.name}
            </span>
            .
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh data
        </button>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Unable to load packaging data</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Outstanding units"
          value={formatQuantity(outstandingUnits)}
          description="Units currently marked as owed"
          icon={Boxes}
        />
        <MetricCard
          label="Customers owing"
          value={customersWithOutstanding.toLocaleString()}
          description="Customers with outstanding packaging"
          icon={Users}
        />
        <MetricCard
          label="Packaging types"
          value={data.packagingTypes.length.toLocaleString()}
          description="Active packaging definitions"
          icon={Package}
        />
        <MetricCard
          label="Recorded transactions"
          value={data.transactions.length.toLocaleString()}
          description="Latest 500 business transactions"
          icon={ArrowLeftRight}
        />
      </section>

      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm dark:bg-slate-900 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Customer packaging balances
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              View packaging quantities recorded against each customer.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-135">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customer or packaging..."
                className="w-full rounded-xl border border-border bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--brand-primary)] dark:bg-slate-950 dark:text-white"
              />
            </div>

            <CustomSelect
  value={packagingTypeFilter}
  onChange={setPackagingTypeFilter}
  variant="filter"
  ariaLabel="Filter by packaging type"
  placeholder="All packaging types"
  options={[
    { value: "all", label: "All packaging types" },
    ...data.packagingTypes.map((type) => ({
      value: type.id,
      label: type.name,
    })),
  ]}
/>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {(
            [
              ["all", "All balances"],
              ["owed", "Outstanding"],
              ["settled", "Settled"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setBalanceFilter(value)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                balanceFilter === value
                  ? "text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
              style={
                balanceFilter === value
                  ? { backgroundColor: "var(--brand-primary)" }
                  : undefined
              }
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-180 text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <th className="px-3 py-3 font-semibold">Customer</th>
                <th className="px-3 py-3 font-semibold">Packaging</th>
                <th className="px-3 py-3 font-semibold">Category</th>
                <th className="px-3 py-3 text-right font-semibold">Quantity</th>
                <th className="px-3 py-3 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Loading packaging balances...
                  </td>
                </tr>
              ) : filteredBalances.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    No packaging balances match your filters.
                  </td>
                </tr>
              ) : (
                filteredBalances.map((balance) => {
                  const owed = getBalanceStatus(balance);
                  const customer = customerMap.get(balance.customer_id);

                  return (
                    <tr
                      key={balance.id}
                      className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-3 py-4">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {getCustomerName(customer)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {customer?.phone ?? "No phone recorded"}
                        </p>
                      </td>
                      <td className="px-3 py-4 font-medium text-slate-800 dark:text-slate-200">
                        {balance.packaging_type_name ?? "Unknown packaging"}
                      </td>
                      <td className="px-3 py-4 text-slate-500 dark:text-slate-400">
                        {balance.packaging_category ?? "Uncategorised"}
                      </td>
                      <td className="px-3 py-4 text-right font-semibold tabular-nums text-slate-900 dark:text-white">
                        {formatQuantity(balance.balance_quantity)}
                      </td>
                      <td className="px-3 py-4 text-right">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            owed
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {owed ? "Owed" : "Settled"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Showing {filteredBalances.length.toLocaleString()} of{" "}
            {data.balances.length.toLocaleString()} balance records
          </span>
          <span>Business-scoped records</span>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm dark:bg-slate-900 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Packaging transaction history
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Recent recorded packaging activity.
            </p>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Latest 500 records
          </span>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-180 text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <th className="px-3 py-3 font-semibold">Date</th>
                <th className="px-3 py-3 font-semibold">Customer</th>
                <th className="px-3 py-3 font-semibold">Packaging</th>
                <th className="px-3 py-3 font-semibold">Transaction type</th>
                <th className="px-3 py-3 text-right font-semibold">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    Loading transaction history...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    No packaging transactions found.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(
                  (transaction: PackagingTransaction) => {
                    const customer = transaction.customer_id
                      ? customerMap.get(transaction.customer_id)
                      : undefined;

                    return (
                      <tr
                        key={transaction.id}
                        className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <td className="whitespace-nowrap px-3 py-4 text-slate-500 dark:text-slate-400">
                          {formatDate(transaction.created_at)}
                        </td>
                        <td className="px-3 py-4 font-medium text-slate-900 dark:text-white">
                          {getCustomerName(customer)}
                        </td>
                        <td className="px-3 py-4 text-slate-700 dark:text-slate-300">
                          {transaction.packaging_type_name ??
                            "Unknown packaging"}
                        </td>
                        <td className="px-3 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <ArrowDownLeft className="h-3.5 w-3.5" />
                            {transaction.transaction_type ?? "Unspecified"}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-right font-semibold tabular-nums text-slate-900 dark:text-white">
                          {formatQuantity(transaction.quantity)}
                        </td>
                      </tr>
                    );
                  },
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm dark:bg-slate-900 sm:p-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Active packaging types
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Packaging definitions configured for this business.
          </p>
        </div>

        <form
          onSubmit={handleCreatePackagingType}
          className="mt-5 rounded-xl border border-border bg-slate-50 p-4 dark:bg-slate-950/50"
        >
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-lg bg-white p-2 shadow-sm dark:bg-slate-800">
              <Plus className="h-4 w-4 text-slate-700 dark:text-slate-200" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Create packaging type
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Define bottles, crates or other packaging used by this business.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="new-packaging-name"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Packaging name
              </label>
              <input
                id="new-packaging-name"
                type="text"
                value={newPackagingName}
                onChange={(event) => setNewPackagingName(event.target.value)}
                placeholder="e.g. Empty 300ml Glass Bottle"
                maxLength={100}
                required
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="new-packaging-category"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Category
              </label>
              <CustomSelect
  id="new-packaging-category"
  value={newPackagingCategory}
  onChange={(value) =>
    setNewPackagingCategory(value as PackagingCategory)
  }
  ariaLabel="Packaging category"
  options={[
    { value: "bottle", label: "Bottle" },
    { value: "crate", label: "Crate" },
    { value: "other", label: "Other" },
  ]}
/>
            </div>

            <div className="flex items-end">
              <label className="flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={newPackagingReturnable}
                  onChange={(event) =>
                    setNewPackagingReturnable(event.target.checked)
                  }
                  className="h-4 w-4 rounded border-border accent-blue-600"
                />
                Returnable packaging
              </label>
            </div>
          </div>

          {packagingFormError && (
            <p className="mt-3 flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {packagingFormError}
            </p>
          )}

          {packagingFormSuccess && (
            <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">
              {packagingFormSuccess}
            </p>
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={isCreatingPackagingType || !activeBusinessId}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {isCreatingPackagingType ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create packaging type
                </>
              )}
            </button>
          </div>
        </form>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Loading packaging types...
          </p>
        ) : data.packagingTypes.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No active packaging types have been configured.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.packagingTypes.map((type) => (
              <div
                key={type.id}
                className="flex items-center gap-3 rounded-xl border border-border p-4"
              >
                <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                  <Package className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {type.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {type.packaging_category ?? "Uncategorised"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
