import { useMemo } from "react";
import { Activity, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";
import { useBusiness } from "../../business/hooks/useActiveBusiness";
import { AiChatInterface } from "../components/AiChatInterface";
import { Alert } from "../../../components/ui/Alert";

export function AiAssistantPage() {
  const { user, isLoading: authLoading } = useAuth();

  const {
    activeBusinessId,
    activeBusiness,
    isLoading: businessLoading,
  } = useBusiness();

  const isLoading = authLoading || businessLoading;

  const description = useMemo(() => {
    if (!activeBusinessId) {
      return "Select a business to begin exploring your wholesale operations.";
    }

    return `Business intelligence for ${
      activeBusiness?.name ?? "your selected business"
    }. Ask questions using verified business records.`;
  }, [activeBusinessId, activeBusiness?.name]);

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-border bg-white p-8 dark:bg-slate-900">
        <div className="text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-primary dark:bg-slate-800">
            <Sparkles size={21} />
          </div>

          <p className="mt-3 text-sm text-slate-500">
            Loading AI assistant...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Alert variant="error" title="Sign in required">
        You must be signed in to use the AI assistant.
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Activity size={15} className="text-primary" />

            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Business intelligence
            </p>
          </div>

          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            AI Assistant
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>

        {activeBusinessId && (
          <div className="flex shrink-0 items-center gap-2 self-start rounded-xl border border-border bg-white px-3 py-2 dark:bg-slate-900 sm:self-center">
            <ShieldCheck size={15} className="text-emerald-500" />

            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Read-only assistant
            </span>
          </div>
        )}
      </div>

      {!activeBusinessId ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-border bg-white px-6 py-12 text-center shadow-sm dark:bg-slate-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-primary dark:bg-slate-800">
            <Sparkles size={25} />
          </div>

          <h2 className="mt-5 text-lg font-semibold text-slate-900 dark:text-white">
            Select a business to continue
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            Choose a business from the business selector to access its sales,
            inventory, customer credit, and packaging information.
          </p>
        </div>
      ) : (
        <AiChatInterface
          key={`${user.id}:${activeBusinessId}`}
          userId={user.id}
          businessId={activeBusinessId}
        />
      )}
    </div>
  );
}
