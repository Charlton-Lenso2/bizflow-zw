import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "@daypicker/react";
import type { DateRange } from "@daypicker/react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
} from "lucide-react";
import "./DateRangePicker.css";

type DateRangePickerProps = {
  startDate: string;
  endDate: string;
  onApply: (startDate: string, endDate: string) => void;
};

type PresetOption = {
  label: string;
  value: "today" | "week" | "month" | "30days" | "90days";
};

type PopoverPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const presetOptions: PresetOption[] = [
  { label: "Today", value: "today" },
  { label: "This week", value: "week" },
  { label: "This month", value: "month" },
  { label: "Last 30 days", value: "30days" },
  { label: "Last 90 days", value: "90days" },
];

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function fromDateString(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatRangeLabel(startDate: string, endDate: string) {
  const start = fromDateString(startDate);
  const end = fromDateString(endDate);

  if (!start || !end) return "Select date range";
  if (startDate === endDate) return formatDate(start);

  return `${formatDate(start)} – ${formatDate(end)}`;
}

function getPresetRange(preset: PresetOption["value"]): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);

  switch (preset) {
    case "today":
      return { from: today, to: today };

    case "week":
      start.setDate(today.getDate() - today.getDay());
      return { from: start, to: today };

    case "month":
      start.setDate(1);
      return { from: start, to: today };

    case "30days":
      start.setDate(today.getDate() - 29);
      return { from: start, to: today };

    case "90days":
      start.setDate(today.getDate() - 89);
      return { from: start, to: today };
  }
}

function calculatePopoverPosition(trigger: HTMLElement): PopoverPosition {
  const rect = trigger.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const isMobile = viewportWidth <= 640;
  const width = isMobile
    ? Math.max(280, viewportWidth - 24)
    : Math.min(680, viewportWidth - 24);

  const maxHeight = Math.min(viewportHeight * 0.88, 760);

  const left = isMobile
    ? Math.max(12, (viewportWidth - width) / 2)
    : Math.max(12, Math.min(rect.right - width, viewportWidth - width - 12));

  let top = rect.bottom + 8;

  if (top + maxHeight > viewportHeight - 12) {
    top = Math.max(
      12,
      Math.min(rect.top - maxHeight - 8, viewportHeight - maxHeight - 12),
    );
  }

  return {
    top,
    left,
    width,
    maxHeight,
  };
}

export function DateRangePicker({
  startDate,
  endDate,
  onApply,
}: DateRangePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(
    () => window.matchMedia("(max-width: 640px)").matches,
  );

  const [position, setPosition] = useState<PopoverPosition | null>(null);

  const appliedStart = fromDateString(startDate);
  const appliedEnd = fromDateString(endDate);

  const appliedRange: DateRange | undefined =
    appliedStart && appliedEnd
      ? { from: appliedStart, to: appliedEnd }
      : undefined;

  const [draftRange, setDraftRange] = useState<DateRange | undefined>(
    appliedRange,
  );

  const [visibleMonth, setVisibleMonth] = useState(
    () => appliedStart ?? new Date(),
  );

  const hasValidRange = Boolean(
    draftRange?.from && draftRange?.to && draftRange.from <= draftRange.to,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 640px)");

    function handleChange(event: MediaQueryListEvent) {
      setIsCompact(event.matches);
    }

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function updatePosition() {
      if (!triggerRef.current) return;

      setPosition(calculatePopoverPosition(triggerRef.current));
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      const clickedTrigger = containerRef.current?.contains(target);
      const clickedPopover = popoverRef.current?.contains(target);

      if (!clickedTrigger && !clickedPopover) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function openCalendar() {
    if (!triggerRef.current) return;

    setDraftRange(appliedRange);
    setVisibleMonth(appliedStart ?? new Date());
    setPosition(calculatePopoverPosition(triggerRef.current));
    setIsOpen(true);
  }

  function handlePreset(preset: PresetOption["value"]) {
    const range = getPresetRange(preset);

    setDraftRange(range);

    if (range.from) {
      setVisibleMonth(range.from);
    }
  }

  function handleReset() {
    setDraftRange(undefined);
  }

  function handleCancel() {
    setDraftRange(appliedRange);
    setIsOpen(false);
  }

  function handleApply() {
    if (!draftRange?.from || !draftRange.to) return;

    const nextStart = toDateString(draftRange.from);
    const nextEnd = toDateString(draftRange.to);

    if (nextStart > nextEnd) return;

    onApply(nextStart, nextEnd);
    setIsOpen(false);
  }

  const calendarPopover =
    isOpen && position
      ? createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Choose sales date range"
            aria-modal="false"
            className="bizflow-date-popover"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
            }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Select reporting period
                </h3>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Choose a start date and an end date.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCancel}
                aria-label="Close calendar"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[148px_minmax(0,1fr)]">
              <aside className="border-b border-slate-100 p-3 dark:border-slate-800 sm:border-b-0 sm:border-r">
                <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                  Quick select
                </p>

                <div className="grid grid-cols-2 gap-1 sm:grid-cols-1">
                  {presetOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handlePreset(option.value)}
                      className="min-h-10 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </aside>

              <div className="min-w-0 px-2 py-4 sm:px-5">
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                    <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Start date
                    </span>

                    <span className="mt-1 block truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {draftRange?.from
                        ? formatDate(draftRange.from)
                        : "Not selected"}
                    </span>
                  </div>

                  <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                    <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      End date
                    </span>

                    <span className="mt-1 block truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {draftRange?.to
                        ? formatDate(draftRange.to)
                        : "Not selected"}
                    </span>
                  </div>
                </div>

                <DayPicker
                  mode="range"
                  selected={draftRange}
                  onSelect={setDraftRange}
                  month={visibleMonth}
                  onMonthChange={setVisibleMonth}
                  numberOfMonths={isCompact ? 1 : 2}
                  showOutsideDays
                  fixedWeeks
                  className="bizflow-calendar"
                  classNames={{
                    root: "bizflow-calendar__root",
                    months: "bizflow-calendar__months",
                    month: "bizflow-calendar__month",
                    month_caption: "bizflow-calendar__month-caption",
                    caption_label: "bizflow-calendar__caption-label",
                    nav: "bizflow-calendar__nav",
                    button_previous: "bizflow-calendar__nav-button",
                    button_next: "bizflow-calendar__nav-button",
                    month_grid: "bizflow-calendar__month-grid",
                    weekdays: "bizflow-calendar__weekdays",
                    weekday: "bizflow-calendar__weekday",
                    week: "bizflow-calendar__week",
                    day: "bizflow-calendar__day",
                    day_button: "bizflow-calendar__day-button",
                    selected: "bizflow-calendar__selected",
                    range_start: "bizflow-calendar__range-start",
                    range_middle: "bizflow-calendar__range-middle",
                    range_end: "bizflow-calendar__range-end",
                    today: "bizflow-calendar__today",
                    outside: "bizflow-calendar__outside",
                    disabled: "bizflow-calendar__disabled",
                    hidden: "bizflow-calendar__hidden",
                  }}
                  components={{
                    Chevron: ({ orientation }) =>
                      orientation === "left" ? (
                        <ChevronLeft className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      ),
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/30 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex min-h-10 items-center gap-2 self-start rounded-lg px-2 py-2 text-xs font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear selection
              </button>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="min-h-10 rounded-lg px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleApply}
                  disabled={!hasValidRange}
                  className="min-h-10 rounded-lg px-4 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ backgroundColor: "var(--brand-primary)" }}
                >
                  Apply period
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={containerRef} className="relative min-w-0 w-full sm:w-auto">
      <button
        ref={triggerRef}
        type="button"
        onClick={isOpen ? handleCancel : openCalendar}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Choose sales date range. Currently ${formatRangeLabel(
          startDate,
          endDate,
        )}`}
        className={`group flex min-h-11 w-full min-w-0 items-center gap-3 rounded-xl border bg-white px-3.5 text-left transition dark:bg-slate-900 sm:w-auto sm:min-w-[270px] ${
          isOpen
            ? "border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/10"
            : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
        }`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <CalendarDays className="h-4 w-4" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
            Reporting period
          </span>

          <span className="mt-0.5 block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
            {formatRangeLabel(startDate, endDate)}
          </span>
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {calendarPopover}
    </div>
  );
}
