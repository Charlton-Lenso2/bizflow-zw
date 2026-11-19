type SplashScreenProps = {
  message?: string;
};

export function SplashScreen({
  message = "Preparing your workspace...",
}: SplashScreenProps) {
  return (
    <main
      className="bizflow-splash relative flex min-h-screen min-h-[100svh] w-full items-center justify-center overflow-hidden px-6 py-12"
      role="status"
      aria-live="polite"
      aria-label="BizFlow is loading"
    >
      <div
        className="bizflow-splash-glow bizflow-splash-glow-one"
        aria-hidden="true"
      />
      <div
        className="bizflow-splash-glow bizflow-splash-glow-two"
        aria-hidden="true"
      />

      <div className="bizflow-splash-grid" aria-hidden="true" />

      <section className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <div className="bizflow-splash-logo-wrap mb-8">
          <img
            src="/bizflow-mark.svg"
            alt="BizFlow"
            className="h-24 w-24 rounded-[1.65rem] shadow-2xl sm:h-28 sm:w-28"
            draggable={false}
          />
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            BizFlow <span className="text-blue-400">ZW</span>
          </h1>

          <p className="text-sm font-medium tracking-wide text-slate-300 sm:text-base">
            Your business. Connected.
          </p>
        </div>

        <div className="mt-12 w-full max-w-55">
          <div className="bizflow-splash-progress-track">
            <div className="bizflow-splash-progress-bar" />
          </div>

          <p className="mt-4 text-xs font-medium tracking-wide text-slate-400">
            {message}
          </p>
        </div>
      </section>

      <footer className="absolute inset-x-0 bottom-7 z-10 px-6">
        <p className="text-center text-[10px] font-semibold tracking-[0.22em] text-slate-500">
          SALES · INVENTORY · CUSTOMERS · CREDIT
        </p>
      </footer>
    </main>
  );
}
