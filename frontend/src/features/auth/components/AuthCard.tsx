import type { ReactNode } from "react";
import { AuthIllustration } from "./AuthIllustration";

export type AuthField = "name" | "email" | "password" | null;
export type AuthStatus = "idle" | "submitting" | "success" | "error";

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
    <main className="min-h-screen bg-white text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        {/* LEFT: Mascot and messaging */}
        <aside className="relative hidden min-h-screen overflow-hidden bg-slate-50 lg:flex lg:items-center lg:justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(59,130,246,0.12),transparent_65%)]" />

          <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(#64748b_1px,transparent_1px),linear-gradient(90deg,#64748b_1px,transparent_1px)] [background-size:48px_48px]" />

          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full border border-blue-100/70" />

          <div className="absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full border border-blue-100/60" />

          <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center px-10 py-16">
            <AuthIllustration
              activeField={activeField}
              passwordVisible={passwordVisible}
              status={status}
              mode={mode}
            />
          </div>

          <div className="absolute bottom-7 left-8 text-xs font-medium text-slate-400">
            Built for everyday business.
          </div>
        </aside>

        {/* RIGHT: Authentication form */}
        <section className="flex min-h-screen flex-col px-5 py-5 sm:px-10 sm:py-8 lg:px-12 xl:px-16">
          <LinkBrand />

          {/* Compact mascot for mobile */}
          <div className="mx-auto mt-3 w-full max-w-[240px] lg:hidden">
            <AuthIllustration
              activeField={activeField}
              passwordVisible={passwordVisible}
              status={status}
              mode={mode}
              className="scale-[0.88]"
            />
          </div>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-6 sm:py-10">
            <div className="mb-8 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                BUSINESS MANAGEMENT, SIMPLIFIED
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {title}
              </h1>

              <p className="max-w-sm text-sm leading-6 text-slate-500">
                {subtitle}
              </p>
            </div>

            {children}
          </div>

          <footer className="pt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} BizFlow ZW. Built for business.
          </footer>
        </section>
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
        <p className="text-base font-bold tracking-tight text-slate-900">
          BizFlow <span className="text-blue-600">ZW</span>
        </p>

        <p className="text-[10px] font-medium tracking-[0.16em] text-slate-400">
          BUSINESS MANAGEMENT
        </p>
      </div>
    </div>
  );
}
