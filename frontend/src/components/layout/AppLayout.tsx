import { useEffect, useState, type ReactNode } from "react";
import {
  Archive,
  Bell,
  Bot,
  Boxes,
  ChartNoAxesCombined,
  Calculator,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Settings,
  ShoppingCart,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { useBusiness } from "../../features/business/hooks/useActiveBusiness";
import { fetchBusinessBranding } from "../../features/business/services/businessService";
import {
  applyBrandPalette,
  buildBrandPalette,
  FALLBACK_BRAND_PALETTE,
} from "../../features/business/utils/brandPalette";
import { ThemeSwitcher } from "../ui/ThemeSwitcher";

const navItems = [
  { label: "Dashboard", route: "/dashboard", icon: LayoutDashboard },
  { label: "Products", route: "/catalogue", icon: Package },
  { label: "Inventory", route: "/inventory", icon: Boxes },
  { label: "Point of Sale", route: "/pos", icon: ShoppingCart },
  { label: "Calculator", route: "/calculator", icon: Calculator },
  { label: "Sales", route: "/sales", icon: Receipt },
  { label: "Customers", route: "/customers", icon: Users },
  { label: "AI Assistant", route: "/ai", icon: Bot },
  { label: "Packaging", route: "/packaging", icon: Archive },
  { label: "Credit", route: "/credit", icon: CreditCard },
  { label: "Reports", route: "/reports", icon: ChartNoAxesCombined },
  { label: "Settings", route: "/settings", icon: Settings },
] as const;

type AppLayoutProps = {
  children: ReactNode;
};

const SIDEBAR_STORAGE_KEY = "bizflow-sidebar-collapsed";

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { activeBusiness } = useBusiness();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true",
  );
  const [sidebarHovered, setSidebarHovered] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!activeBusiness?.id) {
      applyBrandPalette(FALLBACK_BRAND_PALETTE);
      return () => {
        cancelled = true;
      };
    }

    const loadActiveBusinessBranding = async () => {
      try {
        const branding = await fetchBusinessBranding(activeBusiness.id);

        if (cancelled) return;

        const savedPalette =
          branding?.palette &&
          typeof branding.palette.primary === "string" &&
          typeof branding.palette.accent === "string"
            ? branding.palette
            : branding
              ? buildBrandPalette(
                  branding.primary_color,
                  branding.accent_color,
                )
              : FALLBACK_BRAND_PALETTE;

        applyBrandPalette(savedPalette);
      } catch (error) {
        console.error("Failed to load active business branding", error);

        if (!cancelled) {
          applyBrandPalette(FALLBACK_BRAND_PALETTE);
        }
      }
    };

    void loadActiveBusinessBranding();

    return () => {
      cancelled = true;
    };
  }, [activeBusiness?.id]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!notificationsOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [notificationsOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!profileMenuOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [profileMenuOpen]);

  const initials = activeBusiness?.name
    ? activeBusiness.name.slice(0, 2).toUpperCase()
    : "BZ";

  const currentPage =
    navItems.find(
      (item) =>
        location.pathname === item.route ||
        location.pathname.startsWith(`${item.route}/`),
    )?.label ?? "Workspace";

  // const desktopExpanded = !sidebarCollapsed || sidebarHovered;
  const desktopExpanded = mobileMenuOpen || !sidebarCollapsed || sidebarHovered;

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const sidebarContent = (
    <>
      <div
        className={`flex h-[76px] shrink-0 items-center border-b border-border ${
          desktopExpanded ? "justify-between px-5" : "justify-center px-2"
        }`}
      >
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="flex min-w-0 items-center gap-3 text-left"
          title="BizFlow ZW"
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-bold text-white shadow-sm"
            style={{
              background: "var(--brand-primary)",
              color: "var(--brand-primary-contrast)",
            }}
          >
            {activeBusiness?.logo_url ? (
              <img
                src={activeBusiness?.logo_url}
                alt={activeBusiness?.name ?? "Business logo"}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>

          {desktopExpanded && (
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-tight text-foreground">
                BizFlow ZW
              </p>
              <p className="text-[11px] text-[var(--app-foreground-muted)] dark:text-[var(--app-foreground-subtle)]">
                Wholesale management
              </p>
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={closeMobileMenu}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--app-foreground-muted)] transition hover:bg-[var(--app-surface-elevated)] dark:hover:bg-[var(--app-card)] lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className={`pb-2 pt-6 ${desktopExpanded ? "px-4" : "px-2"}`}>
        {desktopExpanded ? (
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--app-foreground-subtle)]">
            Workspace
          </p>
        ) : (
          <div className="mx-auto h-px w-8 bg-border" />
        )}
      </div>

      <nav
        className={`min-h-0 flex-1 space-y-1 overflow-y-auto pb-5 ${
          desktopExpanded ? "px-3" : "px-2"
        }`}
        aria-label="Main navigation"
      >
        {navItems.map((item) => {
          const isSelected =
            location.pathname === item.route ||
            location.pathname.startsWith(`${item.route}/`);

          const Icon = item.icon;

          return (
            <button
              key={item.route}
              type="button"
              onClick={() => {
                navigate(item.route);
                closeMobileMenu();
              }}
              aria-current={isSelected ? "page" : undefined}
              title={!desktopExpanded ? item.label : undefined}
              className={`group flex w-full items-center rounded-xl py-2.5 text-left text-[13px] font-medium transition-all ${
                desktopExpanded ? "gap-3 px-3" : "justify-center px-2"
              } ${
                isSelected
                  ? "bg-[var(--brand-primary)] text-[var(--brand-primary-contrast)] shadow-sm"
                  : "text-[var(--app-foreground-subtle)] hover:bg-[var(--app-surface-elevated)] hover:text-[var(--app-foreground)] dark:hover:text-[var(--app-foreground)]"
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />

              {desktopExpanded && (
                <>
                  <span className="min-w-0 flex-1">{item.label}</span>

                  {item.route === "/ai" && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      }`}
                    >
                      AI
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      <div
        className={`shrink-0 border-t border-border ${
          desktopExpanded ? "p-4" : "p-2"
        }`}
      >
        {desktopExpanded ? (
          <div className="rounded-xl border border-border bg-[var(--app-surface-elevated)] p-3 dark:bg-[var(--app-card)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--app-foreground-subtle)]">
              Active business
            </p>
            <p className="mt-1.5 truncate text-sm font-semibold text-foreground">
              {activeBusiness?.name ?? "No business selected"}
            </p>
            <p className="mt-1 text-[11px] text-[var(--app-foreground-muted)] dark:text-[var(--app-foreground-subtle)]">
              BizFlow workspace
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="flex h-11 w-full items-center justify-center rounded-xl text-[var(--app-foreground-muted)] transition hover:bg-[var(--app-surface-elevated)] dark:text-[var(--app-foreground-subtle)] dark:hover:bg-[var(--app-card)]"
            title={activeBusiness?.name ?? "Business settings"}
            aria-label="Business settings"
          >
            <Settings className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={closeMobileMenu}
          className="fixed inset-0 z-40 bg-[var(--app-card)] backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className={`fixed inset-y-0 left-0 z-50 flex w-[276px] flex-col border-r border-border bg-[var(--app-card)] shadow-lg transition-[width,transform] duration-200 dark:bg-[var(--app-card)] lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:translate-x-0 lg:shadow-none ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } ${desktopExpanded ? "lg:w-[276px]" : "lg:w-[76px]"}`}
      >
        {sidebarContent}
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[68px] shrink-0 items-center justify-between border-b border-border bg-[var(--app-card)]/95 px-3 backdrop-blur-xl dark:bg-[var(--app-card)]/95 sm:px-5 lg:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--app-border)] text-[var(--app-foreground-muted)] transition hover:bg-[var(--app-surface-elevated)] dark:text-[var(--app-foreground-subtle)] dark:hover:bg-[var(--app-card)] lg:hidden"
              aria-label="Open navigation"
              aria-expanded={mobileMenuOpen}
            >
              <Menu className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--app-foreground-muted)] transition hover:bg-[var(--app-surface-elevated)] hover:text-[var(--app-foreground)] dark:text-[var(--app-foreground-subtle)] dark:hover:bg-[var(--app-card)] dark:hover:text-[var(--app-foreground)] lg:inline-flex"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={
                sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              aria-pressed={sidebarCollapsed}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </button>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {currentPage}
              </p>
              <p className="hidden text-[11px] text-[var(--app-foreground-muted)] dark:text-[var(--app-foreground-subtle)] sm:block">
                Manage your wholesale operations
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeSwitcher />

            <button
              type="button"
              onClick={() => setNotificationsOpen((open) => !open)}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border text-[var(--app-foreground-muted)] transition hover-bg-var--app-surface-elevated hover-text-[var(--app-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:text-[var(--app-foreground-subtle)] dark-hover-bg-var--app-card dark:hover:text-white"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              aria-controls="bizflow-notification-panel"
              title="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
            </button>

            {notificationsOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close notifications"
                  onClick={() => setNotificationsOpen(false)}
                  className="fixed inset-0 z-40 cursor-default bg-[var(--app-card)]/20 backdrop-blur-[1px]"
                />

                <section
                  id="bizflow-notification-panel"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="notification-panel-title"
                  className="fixed right-3 top-[76px] z-50 w-[calc(100vw-24px)] max-w-[420px] overflow-hidden rounded-2xl border border-border bg-[var(--app-card)] shadow-2xl dark:bg-[var(--app-card)] sm:right-5 lg:right-7"
                >
                  <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <div>
                      <h2
                        id="notification-panel-title"
                        className="text-base font-semibold text-foreground"
                      >
                        Notifications
                      </h2>
                      <p className="mt-0.5 text-xs text-[var(--app-foreground-muted)] dark:text-[var(--app-foreground-subtle)]">
                        Updates from your business workspace
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setNotificationsOpen(false)}
                      aria-label="Close notification centre"
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--app-foreground-muted)] transition hover:bg-[var(--app-surface-elevated)] hover:text-[var(--brand-primary)] dark:text-[var(--app-foreground-subtle)] dark:hover:bg-[var(--app-card)] dark:hover:text-[var(--brand-primary)]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="px-5 py-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--app-surface-elevated)] text-[var(--app-foreground-subtle)] dark:bg-[var(--app-card)] dark:text-[var(--app-foreground-muted)]">
                      <Bell className="h-6 w-6" strokeWidth={1.7} />
                    </div>

                    <h3 className="mt-4 text-sm font-semibold text-foreground">
                      You're all caught up
                    </h3>

                    <p className="mx-auto mt-2 max-w-[270px] text-xs leading-5 text-[var(--app-foreground-muted)] dark:text-[var(--app-foreground-subtle)]">
                      There are no notifications yet. Important business
                      updates and alerts will appear here when available.
                    </p>
                  </div>

                  <div className="border-t border-border bg-[var(--app-surface-elevated)]/80 px-5 py-3 dark:bg-[var(--app-card)]">
                    <p className="text-center text-[11px] text-[var(--app-foreground-subtle)]">
                      BizFlow ZW notification centre
                    </p>
                  </div>
                </section>
              </>
            )}

            <div className="relative border-l border-border pl-2 sm:pl-3">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-xl p-1.5 text-left transition hover:bg-[var(--app-surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] dark:hover:bg-[var(--app-card)]"
                aria-label="Open account menu"
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{
                    background: "var(--brand-primary)",
                    color: "var(--brand-primary-contrast)",
                  }}
                >
                  {(profile?.full_name?.trim() || user?.email || "U")
                    .slice(0, 1)
                    .toUpperCase()}
                </div>

                <div className="hidden min-w-0 sm:block">
                  <p className="max-w-[150px] truncate text-xs font-semibold text-foreground">
                    {profile?.full_name?.trim() ||
                      user?.email?.split("@")[0] ||
                      "User"}
                  </p>
                  <p className="text-[10px] text-[var(--app-foreground-muted)] dark:text-[var(--app-foreground-subtle)]">
                    My account
                  </p>
                </div>

                <ChevronDown
                  className={`hidden h-4 w-4 text-[var(--app-foreground-subtle)] transition-transform sm:block ${
                    profileMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {profileMenuOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Close account menu"
                    onClick={() => setProfileMenuOpen(false)}
                    className="fixed inset-0 z-40 cursor-default"
                  />

                  <div
                    role="menu"
                    aria-label="Account options"
                    className="absolute right-0 top-[calc(100%+12px)] z-50 w-[min(300px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-border bg-[var(--app-card)] shadow-2xl dark:bg-[var(--app-card)]"
                  >
                    <div className="border-b border-border px-4 py-4">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {profile?.full_name?.trim() || "Your account"}
                      </p>
                      <p className="mt-1 truncate text-xs text-[var(--app-foreground-muted)] dark:text-[var(--app-foreground-subtle)]">
                        {user?.email ?? ""}
                      </p>
                    </div>

                    <div className="space-y-1 p-2">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          navigate("/settings#profile");
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[var(--app-foreground)] transition hover:bg-[var(--app-surface-elevated)] dark:text-[var(--app-foreground)] dark:hover:bg-[var(--app-card)]"
                      >
                        <UserRound className="h-4 w-4 text-[var(--app-foreground-subtle)]" />
                        My Profile
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          navigate("/settings");
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[var(--app-foreground)] transition hover:bg-[var(--app-surface-elevated)] dark:text-[var(--app-foreground)] dark:hover:bg-[var(--app-card)]"
                      >
                        <Settings className="h-4 w-4 text-[var(--app-foreground-subtle)]" />
                        Account Settings
                      </button>
                    </div>

                    <div className="border-t border-border p-2">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={async () => {
                          setProfileMenuOpen(false);

                          try {
                            await signOut();
                            navigate("/login", { replace: true });
                          } catch (error) {
                            console.error("Failed to sign out", error);
                          }
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50/40 dark:text-red-400 dark:hover:bg-red-950/20"
                      >
                        <LogOut className="h-4 w-4 text-red-600" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-3 sm:p-5 lg:p-7">{children}</main>
      </div>
    </div>
  );
}
