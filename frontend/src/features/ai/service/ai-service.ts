import { supabase } from "../../../lib/supabase";
import type { AiQueryResponse } from "../types/ai-types";

export async function askAiQuestion(
  question: string,
  context?: string,
  businessId?: string
): Promise<AiQueryResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return {
      answer: "No active session. Please sign in to use the AI assistant.",
      data: null,
      sources: [],
    };
  }

  if (!businessId) {
    return {
      answer:
        "No business selected. Please select a business before using the AI assistant.",
      data: null,
      sources: [],
    };
  }

  const { data, error } = await supabase.functions.invoke("ai-assistant", {
    body: { question, context, businessId },
  });

  if (error) {
    if (error.status === 403) {
      return {
        answer:
          "You are not authorized to use the AI assistant. Please contact your administrator.",
        data: null,
        sources: [],
      };
    }
    if (error.status === 404) {
      return {
        answer:
          "AI service not configured. Please contact your administrator to set up the OpenAI API key.",
        data: null,
        sources: [],
      };
    }
    return {
      answer: `AI service error: ${error.message || error.detail || "Unknown error"}`,
      data: null,
      sources: [],
    };
  }

  if (!data) {
    return {
      answer:
        "AI service not configured. The OpenAI API key is missing. Please contact your administrator.",
      data: null,
      sources: [],
    };
  }

  const responseText = data.response || data.answer || JSON.stringify(data);

  return {
    answer:
      typeof responseText === "string" ? responseText : "No response generated.",
    data: data.data ?? data,
    sources: data.sources ?? [],
  };
}
