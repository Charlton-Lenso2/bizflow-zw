import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export type CustomSelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

type CustomSelectProps = {
  id?: string;
  name?: string;
  label?: string;
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  variant?: "default" | "filter" | "warning";
  className?: string;
  ariaLabel?: string;
};

export function CustomSelect({
  id,
  name,
  label,
  value,
  options,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  searchable = false,
  searchPlaceholder = "Search options...",
  variant = "default",
  className = "",
  ariaLabel,
}: CustomSelectProps) {
  const generatedId = useId();
  const triggerId = id ?? `custom-select-${generatedId}`;
  const labelId = `${triggerId}-label`;
  const listboxId = `${triggerId}-listbox`;

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const selectedOption = options.find((option) => option.value === value);

  const filteredOptions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return options;

    return options.filter((option) =>
      `${option.label} ${option.description ?? ""}`
        .toLowerCase()
        .includes(query),
    );
  }, [options, searchTerm]);

  const enabledOptions = filteredOptions.filter((option) => !option.disabled);

  const closeDropdown = () => {
    setIsOpen(false);
    setSearchTerm("");
    triggerRef.current?.focus();
  };

  const openDropdown = (direction: "first" | "last" = "first") => {
    if (disabled) return;

    setSearchTerm("");
    setHighlightedIndex(
      direction === "last" ? Math.max(enabledOptions.length - 1, 0) : 0,
    );
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || searchable) return;

    const option = filteredOptions[highlightedIndex];

    if (!option || option.disabled) return;

    optionRefs.current[highlightedIndex]?.focus();
  }, [isOpen, highlightedIndex, filteredOptions, searchable]);

  useEffect(() => {
    if (isOpen && searchable) {
      searchRef.current?.focus();
    }
  }, [isOpen, searchable]);

  const selectOption = (option: CustomSelectOption) => {
    if (option.disabled) return;

    onChange(option.value);
    closeDropdown();
  };

  const moveHighlight = (direction: 1 | -1) => {
    if (enabledOptions.length === 0) return;

    const currentOption = filteredOptions[highlightedIndex];
    const currentEnabledIndex = enabledOptions.findIndex(
      (option) => option.value === currentOption?.value,
    );

    const nextIndex =
      currentEnabledIndex === -1
        ? direction === 1
          ? 0
          : enabledOptions.length - 1
        : (currentEnabledIndex + direction + enabledOptions.length) %
          enabledOptions.length;

    const nextOption = enabledOptions[nextIndex];
    const nextFilteredIndex = filteredOptions.findIndex(
      (option) => option.value === nextOption.value,
    );

    setHighlightedIndex(nextFilteredIndex);
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (!isOpen) {
        openDropdown("first");
      } else {
        moveHighlight(1);
      }
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (!isOpen) {
        openDropdown("last");
      } else {
        moveHighlight(-1);
      }
    }

    if (!isOpen && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openDropdown();
    }

    if (isOpen && event.key === "Escape") {
      event.preventDefault();
      closeDropdown();
    }
  };

  const handleOptionKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    option: CustomSelectOption,
  ) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(1);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(-1);
    }

    if (event.key === "Home") {
      event.preventDefault();

      const first = enabledOptions[0];

      if (first) {
        setHighlightedIndex(
          filteredOptions.findIndex((item) => item.value === first.value),
        );
      }
    }

    if (event.key === "End") {
      event.preventDefault();

      const last = enabledOptions[enabledOptions.length - 1];

      if (last) {
        setHighlightedIndex(
          filteredOptions.findIndex((item) => item.value === last.value),
        );
      }
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown();
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectOption(option);
    }

    if (event.key === "Tab") {
      setIsOpen(false);
      setSearchTerm("");
    }
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(1);
      optionRefs.current[highlightedIndex]?.focus();
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(-1);
      optionRefs.current[highlightedIndex]?.focus();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown();
    }

    if (event.key === "Enter" && enabledOptions.length > 0) {
      event.preventDefault();

      const highlightedOption = filteredOptions[highlightedIndex];

      if (highlightedOption && !highlightedOption.disabled) {
        selectOption(highlightedOption);
      } else {
        selectOption(enabledOptions[0]);
      }
    }
  };

  const triggerStyles = {
    default:
      "border-slate-200 bg-white text-slate-800 hover:border-slate-300 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600",
    filter:
      "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 focus-visible:ring-slate-400/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600",
    warning:
      "border-amber-300 bg-amber-50 text-amber-950 hover:border-amber-400 focus-visible:ring-amber-400/20 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:border-amber-600",
  }[variant];

  const panelStyles =
    variant === "warning"
      ? "border-amber-200 bg-white dark:border-amber-800 dark:bg-slate-900"
      : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900";

  const activeOptionStyles =
    variant === "warning"
      ? "bg-amber-50 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100"
      : "bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-white";

  return (
    <div ref={rootRef} className={`relative w-full ${className}`}>
      {label ? (
        <label
          id={labelId}
          htmlFor={triggerId}
          className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          {label}
        </label>
      ) : null}

      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-labelledby={label ? labelId : undefined}
        aria-label={!label ? ariaLabel : undefined}
        disabled={disabled}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
            setSearchTerm("");
          } else {
            openDropdown();
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm shadow-sm outline-none transition duration-150 focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-55 ${
          triggerStyles
        } ${
          isOpen
            ? "border-blue-400 ring-4 ring-blue-500/10 dark:border-blue-500"
            : ""
        }`}
      >
        <span
          className={`min-w-0 flex-1 truncate ${
            selectedOption ? "font-medium" : "text-slate-400"
          }`}
        >
          {selectedOption?.label ?? placeholder}
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 opacity-65 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {name ? <input type="hidden" name={name} value={value} /> : null}

      {isOpen ? (
        <div
          className={`absolute left-0 right-0 top-full z-[70] mt-2 overflow-hidden rounded-xl border p-1.5 shadow-xl shadow-slate-950/10 ring-1 ring-black/5 ${panelStyles}`}
        >
          {searchable ? (
            <div className="relative mb-1.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                ref={searchRef}
                type="text"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          ) : null}

          <div
            id={listboxId}
            role="listbox"
            aria-labelledby={label ? labelId : undefined}
            aria-label={!label ? ariaLabel : undefined}
            className="max-h-64 space-y-0.5 overflow-y-auto"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={option.value}
                    ref={(element) => {
                      optionRefs.current[index] = element;
                    }}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    tabIndex={isHighlighted ? 0 : -1}
                    onClick={() => selectOption(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onKeyDown={(event) => handleOptionKeyDown(event, option)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                      isHighlighted || isSelected
                        ? activeOptionStyles
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70"
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {option.label}
                      </span>

                      {option.description ? (
                        <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                          {option.description}
                        </span>
                      ) : null}
                    </span>

                    {isSelected ? (
                      <Check className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    ) : null}
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-5 text-center text-sm text-slate-500 dark:text-slate-400">
                No matching options
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
