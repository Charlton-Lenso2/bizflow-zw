import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  BrainCircuit,
  Check,
  ChevronRight,
  CreditCard,
  Menu,
  Package,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Boxes,
    title: "Inventory control",
    description:
      "Know what is in stock, track movements and stay ahead of shortages with a clearer view of your products.",
    accent: "blue",
  },
  {
    icon: ShoppingCart,
    title: "Sales and point of sale",
    description:
      "Record sales, serve customers and keep transactions organised from one connected workspace.",
    accent: "amber",
  },
  {
    icon: Users,
    title: "Customer management",
    description:
      "Keep customer records together and build a better picture of the relationships behind your business.",
    accent: "violet",
  },
  {
    icon: CreditCard,
    title: "Credit tracking",
    description:
      "Follow outstanding balances, record partial payments and understand what customers still owe.",
    accent: "emerald",
  },
  {
    icon: BarChart3,
    title: "Business insights",
    description:
      "Bring sales and operational information together to make more informed business decisions.",
    accent: "sky",
  },
  {
    icon: BrainCircuit,
    title: "AI business assistant",
    description:
      "Ask questions about your business information and get assistance understanding your operations.",
    accent: "rose",
  },
];

const accentStyles: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 ring-blue-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  violet: "bg-violet-50 text-violet-700 ring-violet-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  sky: "bg-sky-50 text-sky-700 ring-sky-100",
  rose: "bg-rose-50 text-rose-700 ring-rose-100",
};

function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5">
      <img
        src="/bizflow-mark.svg"
        alt=""
        className="h-9 w-9 object-contain"
      />
      <span
        className={`text-xl font-bold tracking-tight ${
          light ? "text-white" : "text-slate-950"
        }`}
      >
        BizFlow<span className="text-blue-600">.</span>
        <span
          className={`ml-1 text-xs font-semibold tracking-wider ${
            light ? "text-slate-400" : "text-slate-500"
          }`}
        >
          ZW
        </span>
      </span>
    </Link>
  );
}

function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[620px]">
      <div className="absolute -inset-5 rounded-[2rem] bg-blue-200/40 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            <span className="text-sm font-bold text-slate-800">
              Business overview
            </span>
          </div>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
            Workspace
          </span>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <p className="text-xs text-slate-500">Welcome to your workspace</p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              Your business at a glance
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Sales", "$12,480", "blue"],
              ["Inventory", "248", "violet"],
              ["Customers", "86", "amber"],
              ["Outstanding", "$2,140", "emerald"],
            ].map(([label, value, color]) => (
              <div
                key={label}
                className="rounded-xl border border-slate-100 bg-slate-50/80 p-3"
              >
                <p className="text-[10px] font-medium text-slate-500">
                  {label}
                </p>
                <p className="mt-2 text-lg font-bold tracking-tight text-slate-900">
                  {value}
                </p>
                <div
                  className={`mt-2 h-1 w-10 rounded-full ${
                    color === "blue"
                      ? "bg-blue-500"
                      : color === "violet"
                        ? "bg-violet-500"
                        : color === "amber"
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                  }`}
                />
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
            <div className="rounded-xl border border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-800">
                  Sales activity
                </p>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <div className="mt-5 flex h-28 items-end gap-2">
                {[38, 55, 43, 72, 58, 84, 66, 94, 70, 100, 78, 88].map(
                  (height, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t-sm bg-blue-500/80"
                      style={{ height: `${height}%` }}
                    />
                  ),
                )}
              </div>
              <div className="mt-2 flex justify-between text-[9px] text-slate-400">
                <span>Earlier</span>
                <span>Recent</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 p-4">
              <p className="text-xs font-semibold text-slate-800">
                Recent activity
              </p>
              <div className="mt-4 space-y-4">
                {[
                  ["Sale recorded", "Sales"],
                  ["Stock updated", "Inventory"],
                  ["Payment received", "Credit"],
                ].map(([title, category]) => (
                  <div key={title} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Check className="h-3 w-3" />
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-700">
                        {title}
                      </p>
                      <p className="text-[9px] text-slate-400">{category}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3">
          <span className="text-[10px] text-slate-400">
            One connected business workspace
          </span>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-700">
            BizFlow ZW <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-900">
      <header className="relative z-30 border-b border-slate-100 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <Brand />

          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-slate-600 transition hover:text-blue-700"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-slate-600 transition hover:text-blue-700"
            >
              How it works
            </a>
            <a
              href="#about"
              className="text-sm font-medium text-slate-600 transition hover:text-blue-700"
            >
              About
            </a>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/login"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:bg-blue-800"
            >
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <button
            type="button"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 md:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </nav>

        {mobileMenuOpen && (
          <div className="absolute inset-x-0 top-full border-b border-slate-200 bg-white p-5 shadow-xl md:hidden">
            <div className="flex flex-col gap-1">
              {[
                ["Features", "#features"],
                ["How it works", "#how-it-works"],
                ["About", "#about"],
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  onClick={closeMenu}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {label}
                </a>
              ))}
              <div className="my-2 border-t border-slate-100" />
              <Link
                to="/login"
                onClick={closeMenu}
                className="rounded-lg px-3 py-3 text-sm font-semibold text-slate-700"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                onClick={closeMenu}
                className="rounded-xl bg-blue-700 px-4 py-3 text-center text-sm font-semibold text-white"
              >
                Create your account
              </Link>
            </div>
          </div>
        )}
      </header>

      <section className="relative isolate">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/70 via-white to-white" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 lg:px-10 lg:py-24">
          <div className="max-w-xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3.5 py-2 text-xs font-semibold text-blue-800 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              A smarter way to run your business
            </div>

            <h1 className="text-4xl font-bold leading-[1.1] tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-[3.65rem]">
              Bring your business operations{" "}
              <span className="text-blue-700">into focus.</span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-8 text-slate-600 sm:text-lg">
              Sales, inventory, customers and business insights, connected in
              one workspace. Spend less time managing scattered records and
              more time moving your business forward.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-blue-700/20 transition hover:-translate-y-0.5 hover:bg-blue-800"
              >
                Get started with BizFlow <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Sign in to your account
              </Link>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Business-focused workspace
              </span>
              <span className="inline-flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Connected operations
              </span>
            </div>
          </div>

          <DashboardPreview />
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50/80">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 sm:grid-cols-3 sm:px-8 lg:px-10">
          {[
            ["One workspace", "Bring essential business operations together."],
            ["Clearer records", "Keep important activity organised and visible."],
            ["Better decisions", "Use business information with more confidence."],
          ].map(([title, description]) => (
            <div key={title} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/70">
                <Check className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">{title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="scroll-mt-20 px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
              Everything connected
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              The tools your business needs to move forward.
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-600">
              Manage the everyday work of your business with practical tools
              designed to work together, not in isolation.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="group rounded-2xl border border-slate-200/80 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-900/[0.04]"
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1 ${accentStyles[feature.accent]}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-6 text-lg font-bold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {feature.description}
                  </p>
                  <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-blue-700 opacity-0 transition group-hover:opacity-100">
                    Explore BizFlow <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="scroll-mt-20 overflow-hidden bg-slate-950 px-5 py-20 text-white sm:px-8 lg:px-10 lg:py-24"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">
              Designed for clarity
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Less fragmentation. More control.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-8 text-slate-300">
              Your business has moving parts. BizFlow brings essential
              operational information into one place, helping you understand
              what is happening and what needs attention.
            </p>
            <div className="mt-8 space-y-4">
              {[
                "Keep products, stock and sales connected.",
                "Understand customer balances and payments.",
                "Review business activity from a central workspace.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-300">
                    <Check className="h-3 w-3" />
                  </span>
                  <p className="text-sm leading-6 text-slate-200">{item}</p>
                </div>
              ))}
            </div>
            <Link
              to="/signup"
              className="mt-9 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
            >
              Start using BizFlow <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 rounded-full bg-blue-600/20 blur-3xl" />
            <div className="relative rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div>
                  <p className="text-sm font-semibold">Connected operations</p>
                  <p className="mt-1 text-xs text-slate-400">
                    A clearer view of your business
                  </p>
                </div>
                <span className="rounded-lg bg-blue-500/15 p-2 text-blue-300">
                  <Package className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {[
                  ["Catalogue", "Products and selling prices", Boxes],
                  ["Sales", "Transactions and daily activity", ShoppingCart],
                  ["Customers", "Relationships and account records", Users],
                  ["Credit", "Balances and payment tracking", CreditCard],
                  ["Insights", "Reports and business context", BarChart3],
                ].map(([title, description, Icon]) => {
                  const ItemIcon = Icon as typeof Boxes;
                  return (
                    <div
                      key={title as string}
                      className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
                        <ItemIcon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {title as string}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {description as string}
                        </p>
                      </div>
                      <ChevronRight className="ml-auto h-4 w-4 text-slate-500" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="scroll-mt-20 px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <Sparkles className="h-6 w-6" />
          </span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
            Built for growing businesses
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Practical business management, with room to grow.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600">
            BizFlow ZW is focused on helping businesses bring their daily
            operations into a more organised, connected workspace. Start with
            the tools you need and build better visibility as your business
            grows.
          </p>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:px-10 lg:pb-28">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-blue-700 px-6 py-14 text-center shadow-2xl shadow-blue-900/15 sm:px-12 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">
            Your next step starts here
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Give your business a clearer way forward.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-blue-100 sm:text-base">
            Bring your essential business operations together with BizFlow ZW.
          </p>
          <Link
            to="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-blue-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
          >
            Create your account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50 px-5 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Brand />
            <p className="mt-3 max-w-sm text-xs leading-6 text-slate-500">
              Connected business operations for growing businesses.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-slate-500">
            <a href="#features" className="transition hover:text-blue-700">
              Features
            </a>
            <Link to="/login" className="transition hover:text-blue-700">
              Log in
            </Link>
            <Link to="/signup" className="transition hover:text-blue-700">
              Sign up
            </Link>
          </div>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} BizFlow ZW. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
