import type { AuthField, AuthStatus } from "./AuthCard";

type AuthIllustrationProps = {
  activeField: AuthField;
  passwordVisible: boolean;
  status: AuthStatus;
  mode: "login" | "signup";
};

export function AuthIllustration({
  activeField,
  passwordVisible,
  status,
  mode,
}: AuthIllustrationProps) {
  const isEmailFocused = activeField === "email";
  const isPasswordFocused = activeField === "password";
  const isNameFocused = activeField === "name";
  const isSuccess = status === "success";
  const isSubmitting = status === "submitting";

  return (
    <div className="relative w-full max-w-[470px]">
      <div className="absolute -left-8 top-10 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl" />
      <div className="absolute -right-5 bottom-10 h-28 w-28 rounded-full bg-amber-400/10 blur-2xl" />

      <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-7">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/bizflow-mark.svg"
              alt=""
              className="h-9 w-9 rounded-lg"
            />

            <div>
              <p className="text-sm font-semibold text-white">BizFlow</p>
              <p className="text-[10px] text-slate-400">Your workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-medium text-emerald-300">
              Secure access
            </span>
          </div>
        </div>

        <div className="relative mx-auto my-9 flex h-48 items-center justify-center">
          <div className="absolute h-40 w-40 rounded-full border border-blue-300/10" />
          <div className="absolute h-32 w-32 rounded-full border border-blue-300/15" />

          <div className="absolute left-5 top-5 h-3 w-3 rounded-full bg-amber-400 shadow-lg shadow-amber-400/40" />
          <div className="absolute bottom-5 right-8 h-2.5 w-2.5 rounded-full bg-blue-300" />

          <div
            className={`relative flex h-32 w-32 items-center justify-center rounded-[2rem] border transition-all duration-500 ${
              isSuccess
                ? "scale-105 border-emerald-300/50 bg-emerald-400/15"
                : isPasswordFocused
                  ? "scale-105 border-amber-300/50 bg-amber-400/10"
                  : isEmailFocused || isNameFocused
                    ? "scale-105 border-blue-300/50 bg-blue-400/15"
                    : "border-white/15 bg-white/[0.08]"
            }`}
          >
            <svg viewBox="0 0 120 120" className="h-24 w-24" fill="none">
              <path
                d="M60 13L96 28V57C96 80 81 98 60 108C39 98 24 80 24 57V28L60 13Z"
                fill="#1D4ED8"
                fillOpacity=".32"
                stroke="#93C5FD"
                strokeWidth="2"
              />

              <path
                d="M60 28L83 38V57C83 73 74 86 60 94C46 86 37 73 37 57V38L60 28Z"
                fill="#3B82F6"
                fillOpacity=".3"
              />

              {isSuccess ? (
                <path
                  d="M44 60L55 71L78 47"
                  stroke="#86EFAC"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <>
                  <rect
                    x="43"
                    y="51"
                    width="34"
                    height="27"
                    rx="6"
                    stroke="#DBEAFE"
                    strokeWidth="2.5"
                  />

                  <path
                    d="M50 51V42C50 36 54 32 60 32C66 32 70 36 70 42V51"
                    stroke="#DBEAFE"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  <circle
                    cx="60"
                    cy="63"
                    r="3"
                    fill={isPasswordFocused ? "#FBBF24" : "#DBEAFE"}
                  />

                  <path
                    d="M60 66V70"
                    stroke={isPasswordFocused ? "#FBBF24" : "#DBEAFE"}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </>
              )}
            </svg>
          </div>

          <div
            className={`absolute right-3 top-5 rounded-xl border px-3 py-2 transition-all duration-300 ${
              isEmailFocused
                ? "translate-y-0 border-blue-300/40 bg-blue-400/20 opacity-100"
                : "translate-y-2 border-white/10 bg-white/[0.06] opacity-70"
            }`}
          >
            <span className="text-[10px] font-medium text-blue-100">
              Email identity
            </span>
          </div>

          <div
            className={`absolute bottom-3 left-2 rounded-xl border px-3 py-2 transition-all duration-300 ${
              isPasswordFocused
                ? "translate-y-0 border-amber-300/40 bg-amber-400/20 opacity-100"
                : "translate-y-2 border-white/10 bg-white/[0.06] opacity-70"
            }`}
          >
            <span className="text-[10px] font-medium text-amber-100">
              {passwordVisible ? "Password visible" : "Protected password"}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-white">
              {mode === "signup" ? "Create your account" : "Account access"}
            </p>

            <span className="text-[10px] text-slate-400">
              {isSuccess
                ? "Complete"
                : isSubmitting
                  ? "Verifying..."
                  : "Step 1 of 1"}
            </span>
          </div>

          {mode === "signup" && (
            <div
              className={`rounded-xl border px-3 py-3 transition-all duration-300 ${
                isNameFocused
                  ? "border-blue-300/50 bg-blue-400/15"
                  : "border-white/10 bg-white/[0.04]"
              }`}
            >
              <p className="text-[9px] font-medium uppercase tracking-wider text-slate-400">
                Full name
              </p>
              <p className="mt-1 text-xs text-slate-200">
                Your business profile
              </p>
            </div>
          )}

          <div
            className={`rounded-xl border px-3 py-3 transition-all duration-300 ${
              isEmailFocused
                ? "border-blue-300/50 bg-blue-400/15"
                : "border-white/10 bg-white/[0.04]"
            }`}
          >
            <p className="text-[9px] font-medium uppercase tracking-wider text-slate-400">
              Email address
            </p>
            <p className="mt-1 text-xs text-slate-200">you@business.com</p>
          </div>

          <div
            className={`rounded-xl border px-3 py-3 transition-all duration-300 ${
              isPasswordFocused
                ? "border-amber-300/50 bg-amber-400/15"
                : "border-white/10 bg-white/[0.04]"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-medium uppercase tracking-wider text-slate-400">
                Password
              </p>

              <span className="text-[10px] text-slate-400">
                {passwordVisible ? "Visible" : "Hidden"}
              </span>
            </div>

            <p className="mt-1 text-xs tracking-[0.25em] text-slate-200">
              {passwordVisible ? "••••••••" : "••••••••"}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/10">
              {isSuccess ? (
                <span className="text-sm text-emerald-300">✓</span>
              ) : (
                <span className="text-xs text-emerald-300">↗</span>
              )}
            </div>

            <p className="text-[10px] text-slate-400">
              {isSuccess
                ? "Your account is ready."
                : "Your business data stays protected."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
