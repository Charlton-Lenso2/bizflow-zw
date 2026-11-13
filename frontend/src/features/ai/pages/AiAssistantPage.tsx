import { useMemo } from "react";
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
      return "Select a business from the business selector to begin asking questions about your operations.";
    }

    return `Ask about sales, inventory, customers, or packaging for ${
      activeBusiness?.name ?? "the selected business"
    }. The assistant is read-only and answers from verified business data.`;
  }, [activeBusinessId, activeBusiness?.name]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500">Loading AI assistant…</p>
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            AI Assistant
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
            AI Business Assistant
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>

      {!activeBusinessId ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-800/30">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No business is currently selected. Use the business selector to
            choose a business, then return here to ask questions.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <AiChatInterface
            key={activeBusinessId}
            businessId={activeBusinessId}
          />
        </div>
      )}
    </div>
  );
}
