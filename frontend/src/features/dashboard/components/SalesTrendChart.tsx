import { useEffect, useMemo, useState } from "react";
import ReactApexChart from "react-apexcharts/core";
import "apexcharts/line";
import type { ApexOptions } from "apexcharts";
import {
  Activity,
  ChartArea,
  ChartLine,
  TrendingUp,
} from "lucide-react";
import type { SalesTrendPoint } from "../types/dashboard";

type Currency = "USD" | "ZWG";
type ChartStyle = "area" | "line";

type Props = {
  data: SalesTrendPoint[];
};

type Appearance = {
  brandColor: string;
  isDark: boolean;
};

const FALLBACK_COLOR = "#2563eb";

function formatAmount(value: number, currency: Currency) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompactAmount(value: number) {
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export default function SalesTrendChart({ data }: Props) {
  const [currency, setCurrency] = useState<Currency>("USD");
  const [chartStyle, setChartStyle] = useState<ChartStyle>("area");
  const [appearance, setAppearance] = useState<Appearance>({
    brandColor: FALLBACK_COLOR,
    isDark: false,
  });

  useEffect(() => {
    const updateAppearance = () => {
      const styles = window.getComputedStyle(document.documentElement);
      const brandColor =
        styles.getPropertyValue("--brand-primary").trim() ||
        FALLBACK_COLOR;

      setAppearance({
        brandColor,
        isDark: document.documentElement.classList.contains("dark"),
      });
    };

    updateAppearance();

    const observer = new MutationObserver(updateAppearance);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    return () => observer.disconnect();
  }, []);

  const values = useMemo(
    () =>
      data.map((point) => ({
        label: point.label,
        amount: currency === "USD" ? point.usd : point.zwg,
        count: currency === "USD" ? point.usdCount : point.zwgCount,
      })),
    [data, currency],
  );

  const total = values.reduce((sum, point) => sum + point.amount, 0);
  const transactions = values.reduce((sum, point) => sum + point.count, 0);
  const hasSales = transactions > 0;
  const chartColor = appearance.brandColor || FALLBACK_COLOR;

  const options = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: chartStyle,
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: "Inter, Segoe UI, sans-serif",
        foreColor: appearance.isDark ? "#94a3b8" : "#64748b",
        background: "transparent",
        animations: { enabled: true, speed: 400 },
        parentHeightOffset: 0,
      },
      theme: {
        mode: appearance.isDark ? "dark" : "light",
      },
      colors: [chartColor],
      dataLabels: { enabled: false },
      stroke: {
        curve: "smooth",
        width: chartStyle === "line" ? 3.5 : 2.8,
        lineCap: "round",
      },
      markers: {
        size: 0,
        strokeWidth: 0,
        hover: {
          size: 5,
          sizeOffset: 3,
        },
      },
      fill:
        chartStyle === "area"
          ? {
              type: "gradient",
              gradient: {
                shadeIntensity: 0.15,
                opacityFrom: 0.28,
                opacityTo: 0.015,
                stops: [0, 85, 100],
              },
            }
          : { opacity: 0 },
      grid: {
        borderColor: appearance.isDark ? "#334155" : "#e2e8f0",
        strokeDashArray: 5,
        padding: {
          left: 12,
          right: 16,
          top: 4,
          bottom: 0,
        },
      },
      xaxis: {
        categories: values.map((point) => point.label),
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          rotate: -35,
          rotateAlways: false,
          hideOverlappingLabels: true,
          trim: true,
          style: {
            colors: appearance.isDark ? "#94a3b8" : "#64748b",
            fontSize: "11px",
            fontWeight: 500,
          },
        },
        tooltip: { enabled: false },
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: {
          formatter: formatCompactAmount,
          style: {
            colors: appearance.isDark ? "#94a3b8" : "#64748b",
            fontSize: "11px",
            fontWeight: 500,
          },
        },
      },
      tooltip: {
        theme: appearance.isDark ? "dark" : "light",
        x: { show: true },
        y: {
          formatter: (value) => formatAmount(value ?? 0, currency),
          title: {
            formatter: () => `Revenue (${currency})`,
          },
        },
        marker: { show: true },
      },
      legend: { show: false },
      noData: {
        text: "No completed sales in this date range",
        align: "center",
        verticalAlign: "middle",
        style: {
          color: appearance.isDark ? "#94a3b8" : "#64748b",
          fontSize: "13px",
        },
      },
    }),
    [appearance, chartColor, chartStyle, currency, values],
  );

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-white p-4 shadow-sm transition-colors dark:bg-slate-900 sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{
                backgroundColor: `${chartColor}18`,
                color: chartColor,
              }}
            >
              <TrendingUp className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Business analytics
              </p>
              <h2 className="mt-0.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
                Revenue overview
              </h2>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Completed sales across your selected date range
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800"
            aria-label="Select currency"
          >
            {(["USD", "ZWG"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCurrency(value)}
                aria-pressed={currency === value}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                  currency === value
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {value}
              </button>
            ))}
          </div>

          <div
            className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800"
            aria-label="Select chart style"
          >
            <button
              type="button"
              onClick={() => setChartStyle("area")}
              aria-pressed={chartStyle === "area"}
              aria-label="Area chart"
              title="Area chart"
              className={`flex h-8 w-9 items-center justify-center rounded-lg transition-all ${
                chartStyle === "area"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <ChartArea className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setChartStyle("line")}
              aria-pressed={chartStyle === "line"}
              aria-label="Line chart"
              title="Line chart"
              className={`flex h-8 w-9 items-center justify-center rounded-lg transition-all ${
                chartStyle === "line"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <ChartLine className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-4 border-b border-slate-100 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            Total revenue · {currency}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {formatAmount(total, currency)}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800 sm:self-auto">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{
              backgroundColor: `${chartColor}18`,
              color: chartColor,
            }}
          >
            <Activity className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {transactions.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Transactions
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 min-w-0">
        {hasSales ? (
          <ReactApexChart
            type={chartStyle}
            height={320}
            options={options}
            series={[
              {
                name: `Revenue (${currency})`,
                data: values.map((point) => point.amount),
              },
            ]}
          />
        ) : (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center dark:border-slate-700 dark:bg-slate-800/40">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: `${chartColor}18`,
                color: chartColor,
              }}
            >
              <TrendingUp className="h-7 w-7" />
            </div>
            <p className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-100">
              No {currency} sales in this period
            </p>
            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
              Completed {currency} transactions will appear here
              automatically when sales are recorded.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
