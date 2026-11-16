import { Calculator, Keyboard, ShieldCheck } from "lucide-react";
import { QuickCalculator } from "../../dashboard/components/DashboardUtilities";

export function CalculatorPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-7 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-brand-primary">
            <Calculator className="h-4 w-4" />
            Business tools
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Calculator
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Quickly work out totals, differences, percentages and everyday
            business calculations.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 sm:self-auto">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          Independent utility
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          <QuickCalculator />
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-brand-primary" />
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Keyboard friendly
              </h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Use the calculator buttons to enter numbers and operators.
              Keyboard shortcuts can be added as a follow-up improvement.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60">
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Keep your records accurate
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Calculations here do not create sales, change inventory or
              update customer balances. Record confirmed transactions
              through the relevant business workflow.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
