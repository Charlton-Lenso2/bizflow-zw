import type { ReactNode } from "react";
import { AuthIllustration } from "./AuthIllustration";

export type AuthField = "name" | "email" | "password" | null;
export type AuthStatus = "idle" | "submitting" | "success";

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  activeField: AuthField;
  passwordVisible: boolean;
  status: AuthStatus;
  mode: "login" | "signup";
};

export function AuthCard({
  title,
  subtitle,
  children,
  activeField,
  passwordVisible,
  status,
  mode,
}: AuthCardProps) {
  return (
    <main className="min-h-screen bg-[var(--app-background)]">
      <div className="grid min-h-screen lg:grid-cols-[minmax(420px,0.9fr)_minmax(0,1.1fr)]">
        <section className="flex min-h-screen flex-col px-5 py-7 sm:px-10 lg:px-14 xl:px-20">
          <LinkBrand />

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
            <div className="mb-8 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--app-foreground-muted)]">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                BUSINESS MANAGEMENT, SIMPLIFIED
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-[var(--app-foreground)] sm:text-4xl">
                {title}
              </h1>

              <p className="max-w-sm text-sm leading-6 text-[var(--app-foreground-muted)]">
                {subtitle}
              </p>
            </div>

            {children}
          </div>

          <footer className="pt-6 text-center text-xs text-[var(--app-foreground-subtle)]">
            © {new Date().getFullYear()} BizFlow ZW. Built for business.
          </footer>
        </section>

        <aside className="relative hidden min-h-screen overflow-hidden bg-[#0F1F3D] lg:flex lg:items-center lg:justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(37,99,235,0.28),transparent_58%)]" />

          <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:48px_48px]" />

          <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center px-10 py-16">
            <AuthIllustration
              activeField={activeField}
              passwordVisible={passwordVisible}
              status={status}
              mode={mode}
            />

            <div className="mt-12 max-w-lg text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white">
                Run your business with clarity.
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-300">
                Bring sales, inventory, customers and credit management together
                in one connected workspace.
              </p>
            </div>

            <div className="mt-10 flex items-center gap-3">
              <span className="h-1.5 w-8 rounded-full bg-blue-400" />
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
            </div>

            <p className="mt-8 text-[10px] font-semibold tracking-[0.22em] text-slate-500">
              SALES · INVENTORY · CUSTOMERS · CREDIT
            </p>
          </div>

          <div className="absolute bottom-7 right-8 text-xs text-slate-500">
            BizFlow ZW
          </div>
        </aside>
      </div>
    </main>
  );
}

function LinkBrand() {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/bizflow-mark.svg"
        alt="BizFlow ZW"
        className="h-10 w-10 rounded-xl"
      />

      <div>
        <p className="text-base font-bold tracking-tight text-[var(--app-foreground)]">
          BizFlow <span className="text-blue-600">ZW</span>
        </p>
        <p className="text-[10px] font-medium tracking-[0.16em] text-[var(--app-foreground-subtle)]">
          BUSINESS MANAGEMENT
        </p>
      </div>
    </div>
  );
}
