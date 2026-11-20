import { AnimatedMascot, type MascotState } from "./AnimatedMascot";
import type { AuthField, AuthStatus } from "./AuthCard";

type AuthIllustrationProps = {
  activeField: AuthField;
  passwordVisible: boolean;
  status: AuthStatus;
  mode: "login" | "signup";
  className?: string;
};

export function AuthIllustration({
  activeField,
  passwordVisible,
  status,
  mode,
  className = "",
}: AuthIllustrationProps) {
  let mascotState: MascotState = "idle";

  if (status === "error") {
    mascotState = "error";
  } else if (status === "success") {
    mascotState = "success";
  } else if (status === "submitting") {
    mascotState = "loading";
  } else if (activeField === "password") {
    mascotState = passwordVisible ? "email" : "password";
  } else if (activeField === "email" || activeField === "name") {
    mascotState = "email";
  }

  const headline =
    mode === "login"
      ? "Your business, right where you left it."
      : "Your business journey starts here.";

  const message =
    mode === "login"
      ? "Your sales, stock, customers and balances are ready when you are. Sign in and pick up where you left off."
      : "Bring your business operations together and build a clearer, more organized way to manage every day.";

  return (
    <div className={`relative flex w-full flex-col items-center ${className}`}>
      <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-100/70 blur-3xl" />

      <div className="relative z-10 w-full max-w-[420px]">
        <AnimatedMascot state={mascotState} />
      </div>

      <div className="relative z-10 mt-2 max-w-md text-center">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
          {headline}
        </h2>

        <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-slate-500 sm:text-base">
          {message}
        </p>
      </div>

      <div className="relative z-10 mt-8 flex items-center gap-2">
        <span className="h-1.5 w-8 rounded-full bg-blue-600" />
        <span className="h-1.5 w-1.5 rounded-full bg-blue-200" />
        <span className="h-1.5 w-1.5 rounded-full bg-blue-200" />
      </div>

      <p className="relative z-10 mt-5 text-[10px] font-semibold tracking-[0.2em] text-slate-400">
        SALES · INVENTORY · CUSTOMERS · CREDIT
      </p>
    </div>
  );
}
