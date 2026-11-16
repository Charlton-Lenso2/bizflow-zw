import { supabase } from "../../../lib/supabase";
import type {
  AiQueryRequest,
  AiQueryResponse,
} from "../types/ai-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function askAiQuestion(
  question: string,
  context: AiQueryRequest["context"],
  businessId: string,
  conversationHistory: NonNullable<AiQueryRequest["conversationHistory"]> = [],
): Promise<AiQueryResponse> {
  const trimmedQuestion = question.trim();

  if (!trimmedQuestion) {
    throw new Error("Please enter a question.");
  }

  if (!businessId) {
    throw new Error(
      "No business selected. Please select a business before using the AI assistant.",
    );
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error("Could not verify your session. Please sign in again.");
  }

  if (!session) {
    throw new Error("No active session. Please sign in to use the AI assistant.");
  }

  const { data, error } = await supabase.functions.invoke("ai-assistant", {
    body: {
      question: trimmedQuestion,
      context: context ?? "general",
      businessId,
      conversationHistory,
    },
  });

  if (error) {
    let message = error.message || "The AI service request failed.";

    if (
      "context" in error &&
      error.context instanceof Response
    ) {
      const response = error.context;

      try {
        const errorBody: unknown = await response.clone().json();

        if (
          isRecord(errorBody) &&
          typeof errorBody.error === "string"
        ) {
          message = errorBody.error;
        }
      } catch {
        // Keep the original Supabase error message.
      }

      if (response.status === 401) {
        message = "Your session has expired. Please sign in again.";
      } else if (response.status === 403) {
        message =
          "You are not authorized to use the AI assistant for this business.";
      } else if (response.status === 404) {
        message =
          "The AI service has not been deployed or configured yet.";
      }
    }

    throw new Error(message);
  }

  if (!isRecord(data)) {
    throw new Error("The AI service returned an invalid response.");
  }

  const answer =
    typeof data.answer === "string"
      ? data.answer
      : typeof data.response === "string"
        ? data.response
        : "";

  if (!answer.trim()) {
    throw new Error("The AI service returned an empty answer. Please try again.");
  }

  return {
    answer,
    data: data.data ?? null,
    sources: Array.isArray(data.sources)
      ? data.sources.filter(
          (source): source is string => typeof source === "string",
        )
      : [],
  };
}
