import { useEffect, useMemo, useState } from "react";
import {
  Calculator,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type CalendarProps = {
  selectedDate: string;
  onSelectDate: (date: string) => void;
};

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function MiniCalendar({ selectedDate, onSelectDate }: CalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = selectedDate
      ? new Date(`${selectedDate}T12:00:00`)
      : new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  const days = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<Date | null> = Array.from(
      { length: firstDay },
      () => null,
    );

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day));
    }

    return cells;
  }, [visibleMonth]);

  const monthLabel = visibleMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const today = toDateString(new Date());

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            <CalendarDays className="h-4 w-4" />
            Date explorer
          </div>
          <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
            {monthLabel}
          </h2>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() =>
              setVisibleMonth(
                (current) =>
                  new Date(current.getFullYear(), current.getMonth() - 1, 1),
              )
            }
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() =>
              setVisibleMonth(
                (current) =>
                  new Date(current.getFullYear(), current.getMonth() + 1, 1),
              )
            }
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1 text-center">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <span key={day} className="py-2 text-xs font-semibold text-slate-400">
            {day}
          </span>
        ))}

        {days.map((date, index) => {
          if (!date) return <span key={`blank-${index}`} />;

          const value = toDateString(date);
          const isSelected = value === selectedDate;
          const isToday = value === today;

          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelectDate(value)}
              aria-pressed={isSelected}
              className={`aspect-square rounded-lg text-xs font-medium transition ${
                isSelected
                  ? "bg-blue-600 text-white shadow-sm"
                  : isToday
                    ? "border border-blue-500 text-blue-600 dark:text-blue-400"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          const now = new Date();
          setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
          onSelectDate(today);
        }}
        className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        Go to today
      </button>
    </section>
  );
}

type Operator = "+" | "-" | "×" | "÷";

type CalculationHistoryItem = {
  id: string;
  expression: string;
  result: string;
  timestamp: number;
};

const CALCULATOR_HISTORY_KEY = "bizflow-calculator-history";

function formatCalculatorResult(value: number) {
  return String(Number(value.toFixed(8)));
}

function loadCalculatorHistory(): CalculationHistoryItem[] {
  try {
    const saved = localStorage.getItem(CALCULATOR_HISTORY_KEY);
    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is CalculationHistoryItem =>
        typeof item === "object" &&
        item !== null &&
        typeof item.id === "string" &&
        typeof item.expression === "string" &&
        typeof item.result === "string" &&
        typeof item.timestamp === "number",
    );
  } catch {
    return [];
  }
}

export function QuickCalculator() {
  const [display, setDisplay] = useState("0");
  const [storedValue, setStoredValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [startNewNumber, setStartNewNumber] = useState(false);
  const [history, setHistory] = useState<CalculationHistoryItem[]>(
    loadCalculatorHistory,
  );

  useEffect(() => {
    try {
      localStorage.setItem(
        CALCULATOR_HISTORY_KEY,
        JSON.stringify(history),
      );
    } catch {
      // The calculator remains usable if browser storage is unavailable.
    }
  }, [history]);

  const inputDigit = (digit: string) => {
    setDisplay((current) => {
      if (startNewNumber || current === "Error") {
        return digit === "." ? "0." : digit;
      }

      if (digit === "." && current.includes(".")) return current;

      return current === "0" && digit !== "." ? digit : current + digit;
    });

    setStartNewNumber(false);
  };

  const clear = () => {
    setDisplay("0");
    setStoredValue(null);
    setOperator(null);
    setStartNewNumber(false);
  };

  const addToHistory = (expression: string, result: string) => {
    const entry: CalculationHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      expression,
      result,
      timestamp: Date.now(),
    };

    setHistory((current) => [entry, ...current].slice(0, 50));
  };

  const calculate = () => {
    if (storedValue === null || !operator) return;

    const current = Number(display);
    if (!Number.isFinite(current)) return;

    let result = current;

    if (operator === "+") result = storedValue + current;
    if (operator === "-") result = storedValue - current;
    if (operator === "×") result = storedValue * current;

    if (operator === "÷") {
      if (current === 0) {
        setDisplay("Error");
        setStoredValue(null);
        setOperator(null);
        setStartNewNumber(true);
        return;
      }

      result = storedValue / current;
    }

    if (!Number.isFinite(result)) {
      setDisplay("Error");
      setStoredValue(null);
      setOperator(null);
      setStartNewNumber(true);
      return;
    }

    const formattedResult = formatCalculatorResult(result);
    const expression = `${formatCalculatorResult(storedValue)} ${operator} ${formatCalculatorResult(current)}`;

    setDisplay(formattedResult);
    setStoredValue(null);
    setOperator(null);
    setStartNewNumber(true);
    addToHistory(expression, formattedResult);
  };

  const chooseOperator = (nextOperator: Operator) => {
    const current = Number(display);

    if (!Number.isFinite(current)) return;

    if (storedValue !== null && operator && !startNewNumber) {
      let result = current;

      if (operator === "+") result = storedValue + current;
      if (operator === "-") result = storedValue - current;
      if (operator === "×") result = storedValue * current;

      if (operator === "÷") {
        if (current === 0) {
          setDisplay("Error");
          setStoredValue(null);
          setOperator(null);
          setStartNewNumber(true);
          return;
        }

        result = storedValue / current;
      }

      if (!Number.isFinite(result)) return;

      setStoredValue(result);
      setDisplay(formatCalculatorResult(result));
    } else if (storedValue === null) {
      setStoredValue(current);
    }

    setOperator(nextOperator);
    setStartNewNumber(true);
  };

  const backspace = () => {
    if (startNewNumber || display === "Error") return;

    setDisplay((current) =>
      current.length <= 1 || (current.length === 2 && current.startsWith("-"))
        ? "0"
        : current.slice(0, -1),
    );
  };

  const applyHistoryResult = (result: string) => {
    setDisplay(result);
    setStoredValue(null);
    setOperator(null);
    setStartNewNumber(true);
  };

  const keys = [
    { label: "C", action: clear, style: "text-rose-600 dark:text-rose-400" },
    {
      label: "⌫",
      action: backspace,
      style: "text-slate-600 dark:text-slate-200",
    },
    {
      label: "÷",
      action: () => chooseOperator("÷"),
      style: "text-primary",
    },
    {
      label: "×",
      action: () => chooseOperator("×"),
      style: "text-primary",
    },
    ...["7", "8", "9"].map((value) => ({
      label: value,
      action: () => inputDigit(value),
      style: "",
    })),
    {
      label: "-",
      action: () => chooseOperator("-"),
      style: "text-primary",
    },
    ...["4", "5", "6"].map((value) => ({
      label: value,
      action: () => inputDigit(value),
      style: "",
    })),
    {
      label: "+",
      action: () => chooseOperator("+"),
      style: "text-primary",
    },
    ...["1", "2", "3"].map((value) => ({
      label: value,
      action: () => inputDigit(value),
      style: "",
    })),
    {
      label: "=",
      action: calculate,
      style:
        "row-span-2 bg-primary text-white shadow-md hover:brightness-110 dark:bg-primary",
    },
    {
      label: "0",
      action: () => inputDigit("0"),
      style: "col-span-2",
    },
    {
      label: ".",
      action: () => inputDigit("."),
      style: "",
    },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          <Calculator className="h-4 w-4" />
          Calculator
        </div>
        <span className="text-xs text-slate-400">Standard</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl bg-slate-950 p-4 text-right text-white">
        <p className="min-h-5 text-xs text-slate-400">
          {storedValue !== null
            ? `${formatCalculatorResult(storedValue)} ${operator ?? ""}`
            : "Ready"}
        </p>
        <p className="mt-2 min-h-10 break-all text-3xl font-semibold tabular-nums">
          {display}
        </p>
      </div>

      <div className="mt-3 grid auto-rows-[3.25rem] grid-cols-4 gap-2">
        {keys.map((key, index) => (
          <button
            key={`${key.label}-${index}`}
            type="button"
            onClick={key.action}
            aria-label={
              key.label === "="
                ? "Calculate result"
                : key.label === "C"
                  ? "Clear calculator"
                  : key.label === "⌫"
                    ? "Delete last digit"
                    : key.label
            }
            className={`flex min-w-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-base font-semibold text-slate-800 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 ${key.style}`}
          >
            {key.label}
          </button>
        ))}
      </div>

      <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Calculation history
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Your recent calculations are saved on this device.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setHistory([])}
            disabled={history.length === 0}
            className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-400 dark:hover:bg-rose-950/30"
          >
            Clear history
          </button>
        </div>

        {history.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center dark:border-slate-700">
            <Calculator className="mx-auto h-5 w-5 text-slate-400" />
            <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              No calculations yet
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Completed calculations will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => applyHistoryResult(item.result)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-left transition hover:border-primary/30 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800"
                title="Use this result in the calculator"
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                    {item.expression}
                  </span>
                  <span className="mt-1 block text-[11px] text-slate-400">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                  = {item.result}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-400">
        For quick totals, discounts and quantity calculations.
      </p>
    </section>
  );
}
