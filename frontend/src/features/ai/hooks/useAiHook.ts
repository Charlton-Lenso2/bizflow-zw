import { useCallback, useState } from "react";
import { supabase } from "../../../lib/supabase";
import type { AiMessage } from "../types/ai-types";

export const useAiHook = () => {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (
      question: string,
      context?:
        | "sales"
        | "inventory"
        | "customer"
        | "packaging"
        | "general",
      businessId?: string
    ) => {
      setLoading(true);
      setError(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("No active session. Please sign in.");
        }

        if (!businessId) {
          throw new Error(
            "No business selected. Please select a business before using the AI assistant."
          );
        }

        const { data, error } = await supabase.functions.invoke("ai-assistant", {
          body: { question, context, businessId },
        });

        if (error) {
          if (error.status === 403) {
            throw new Error("You are not authorized to use the AI assistant.");
          }
          if (error.status === 404) {
            throw new Error(
              "AI service not configured. Please contact your administrator."
            );
          }
          throw new Error(error.message || "AI service error");
        }

        const assistantResponse =
          data?.response || data?.answer || "No response generated.";
        const assistantData = data?.data ?? data ?? null;

        setMessages((prev) => [
          ...prev,
          {
            id: crypto?.randomUUID() || "temp",
            role: "user",
            content: question,
            timestamp: new Date().toISOString(),
          },
          {
            id: crypto?.randomUUID() || "temp",
            role: "assistant",
            content: assistantResponse,
            timestamp: new Date().toISOString(),
            data: assistantData,
          },
        ]);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto?.randomUUID() || "temp",
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    messages,
    loading,
    error,
    sendMessage,
    clearConversation,
  };
};
