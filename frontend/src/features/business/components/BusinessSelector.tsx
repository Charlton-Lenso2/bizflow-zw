import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Building2, Check, ChevronDown, Lock, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../hooks/useActiveBusiness";

export function BusinessSelector() {
  const navigate = useNavigate();

  const {
    businesses,
    activeBusinessId,
    selectBusiness,
    isLoading,
    isBusinessSwitchLocked,
  } = useBusiness();

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<HTMLButtonElement[]>([]);

  const businessEntries = businesses.filter(
    (
      membership,
    ): membership is typeof membership & {
      businesses: NonNullable<typeof membership.businesses>;
    } => Boolean(membership.businesses),
  );

  const activeIndex = businessEntries.findIndex(
    (membership) => membership.business_id === activeBusinessId,
  );

  const activeMembership =
    activeIndex >= 0 ? businessEntries[activeIndex] : null;

  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0) {
      optionRefs.current[highlightedIndex]?.focus();
    }
  }, [isOpen, highlightedIndex]);

  function openMenu(index = activeIndex >= 0 ? activeIndex : 0) {
    if (isBusinessSwitchLocked || businessEntries.length === 0) return;

    setHighlightedIndex(index);
    setIsOpen(true);
  }

  function closeMenu(returnFocus = false) {
    setIsOpen(false);

    if (returnFocus) {
      triggerRef.current?.focus();
    }
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (isBusinessSwitchLocked || businessEntries.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenu(activeIndex >= 0 ? activeIndex : 0);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenu(activeIndex >= 0 ? activeIndex : businessEntries.length - 1);
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    }
  }

  function handleOptionKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (isBusinessSwitchLocked) return;

    const lastIndex = businessEntries.length - 1;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlightedIndex(index === lastIndex ? 0 : index + 1);
        break;

      case "ArrowUp":
        event.preventDefault();
        setHighlightedIndex(index === 0 ? lastIndex : index - 1);
        break;

      case "Home":
        event.preventDefault();
        setHighlightedIndex(0);
        break;

      case "End":
        event.preventDefault();
        setHighlightedIndex(lastIndex);
        break;

      case "Escape":
        event.preventDefault();
        closeMenu(true);
        break;

      case "Tab":
        closeMenu();
        break;
    }
  }

  function handleSelectBusiness(businessId: string) {
    if (isBusinessSwitchLocked) return;

    if (businessId !== activeBusinessId) {
      selectBusiness(businessId);
    }

    closeMenu(true);
  }

  function handleAddBusiness() {
    if (isBusinessSwitchLocked) return;

    closeMenu();
    navigate("/onboarding");
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <Building2 className="h-[18px] w-[18px]" />
        </div>

        <div className="space-y-1.5">
          <div className="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-2.5 w-36 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  if (businessEntries.length === 0) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <Building2 className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              No business workspace yet
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Create a business to start managing your operations.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddBusiness}
          disabled={isBusinessSwitchLocked}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: "var(--brand-primary)" }}
        >
          <Plus className="h-4 w-4" />
          Add Your First Business
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--brand-primary) 10%, transparent)",
            color: "var(--brand-primary)",
          }}
        >
          <Building2 className="h-[18px] w-[18px]" />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Workspace
          </p>

          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {isBusinessSwitchLocked
              ? "Workspace switching is locked during checkout"
              : "Switch between your businesses"}
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
        <div
          ref={containerRef}
          className="relative w-full sm:min-w-[220px] sm:max-w-[360px]"
        >
          <button
            ref={triggerRef}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-label="Select active business"
            aria-disabled={isBusinessSwitchLocked}
            disabled={isBusinessSwitchLocked}
            onClick={() => (isOpen ? closeMenu() : openMenu())}
            onKeyDown={handleTriggerKeyDown}
            className={`flex h-11 w-full items-center justify-between gap-3 rounded-xl border px-3.5 text-left text-sm font-medium outline-none transition-colors ${
              isBusinessSwitchLocked
                ? "cursor-not-allowed border-slate-200 bg-slate-100 opacity-75 dark:border-slate-700 dark:bg-slate-800"
                : isOpen
                  ? "border-slate-400 bg-white ring-2 ring-slate-200/70 dark:border-slate-600 dark:bg-slate-800 dark:ring-slate-700"
                  : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
            }`}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <Building2 className="h-4 w-4 shrink-0 text-slate-400" />

              <span className="truncate text-slate-800 dark:text-slate-100">
                {activeMembership?.businesses.name ?? "Choose a business"}
              </span>
            </span>

            {isBusinessSwitchLocked ? (
              <Lock className="h-4 w-4 shrink-0 text-slate-400" />
            ) : (
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            )}
          </button>

          {isOpen && !isBusinessSwitchLocked && (
            <div
              role="listbox"
              aria-label="Available businesses"
              className="absolute right-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20"
            >
              {businessEntries.map((membership, index) => {
                const isSelected = membership.business_id === activeBusinessId;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={membership.business_id}
                    ref={(element) => {
                      if (element) {
                        optionRefs.current[index] = element;
                      }
                    }}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectBusiness(membership.business_id)}
                    onKeyDown={(event) => handleOptionKeyDown(event, index)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      isHighlighted
                        ? "bg-slate-100 dark:bg-slate-800"
                        : "bg-transparent"
                    } ${
                      isSelected
                        ? "text-slate-900 dark:text-white"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isSelected
                            ? "bg-slate-200/70 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        <Building2 className="h-4 w-4" />
                      </span>

                      <span className="truncate text-sm font-medium">
                        {membership.businesses.name}
                      </span>
                    </span>

                    {isSelected && (
                      <Check className="h-4 w-4 shrink-0 text-slate-600 dark:text-slate-300" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleAddBusiness}
          disabled={isBusinessSwitchLocked}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Add Business
        </button>
      </div>
    </div>
  );
}
