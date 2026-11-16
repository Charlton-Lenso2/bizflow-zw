import { useCallback, useEffect, useMemo, useState } from "react";
import { askAiQuestion } from "../service/ai-service";
import type {
  AiConversation,
  AiMessage,
  AiQueryRequest,
} from "../types/ai-types";

const MAX_CONVERSATIONS = 50;

function createMessageId(): string {
  return globalThis.crypto.randomUUID();
}

function getStorageKey(userId: string, businessId: string): string {
  return `bizflow-ai-history:${encodeURIComponent(userId)}:${encodeURIComponent(businessId)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readConversations(storageKey: string): AiConversation[] {
  try {
    const stored = window.localStorage.getItem(storageKey);

    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const validConversations = parsed.filter(
      (item): item is AiConversation => {
        if (!isRecord(item)) {
          return false;
        }

        if (
          typeof item.id !== "string" ||
          typeof item.title !== "string" ||
          typeof item.createdAt !== "string" ||
          typeof item.updatedAt !== "string" ||
          !Array.isArray(item.messages)
        ) {
          return false;
        }

        return item.messages.every(
          (message: unknown) =>
            isRecord(message) &&
            typeof message.id === "string" &&
            (message.role === "user" || message.role === "assistant") &&
            typeof message.content === "string" &&
            typeof message.timestamp === "string",
        );
      },
    );

    return validConversations
      .sort(
        (first, second) =>
          new Date(second.updatedAt).getTime() -
          new Date(first.updatedAt).getTime(),
      )
      .slice(0, MAX_CONVERSATIONS);
  } catch {
    return [];
  }
}

function persistConversations(
  storageKey: string,
  conversations: AiConversation[],
): void {
  try {
    const safeConversations = conversations.map((conversation) => ({
      ...conversation,
      messages: conversation.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
      })),
    }));

    window.localStorage.setItem(
      storageKey,
      JSON.stringify(safeConversations),
    );
  } catch (error) {
    console.error("Unable to save AI conversation history.", error);
  }
}

function createConversationTitle(question: string): string {
  const normalized = question.replace(/\s+/g, " ").trim();

  if (normalized.length <= 58) {
    return normalized;
  }

  return `${normalized.slice(0, 55).trimEnd()}...`;
}

export const useAiHook = (userId: string, businessId: string) => {
  const storageKey = getStorageKey(userId, businessId);

  const [initialConversations] = useState(() =>
    readConversations(storageKey),
  );

  const [conversations, setConversations] =
    useState<AiConversation[]>(initialConversations);

  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(initialConversations[0]?.id ?? null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId,
  );

  const messages = useMemo(
    () => activeConversation?.messages ?? [],
    [activeConversation?.messages],
  );

  useEffect(() => {
    persistConversations(storageKey, conversations);
  }, [storageKey, conversations]);

  const clearConversation = useCallback(() => {
    setActiveConversationId(null);
    setError(null);
  }, []);

  const selectConversation = useCallback(
    (conversationId: string) => {
      const exists = conversations.some(
        (conversation) => conversation.id === conversationId,
      );

      if (!exists || loading) {
        return;
      }

      setActiveConversationId(conversationId);
      setError(null);
    },
    [conversations, loading],
  );

  const deleteConversation = useCallback(
    (conversationId: string) => {
      if (loading) {
        return;
      }

      setConversations((previous) =>
        previous.filter((conversation) => conversation.id !== conversationId),
      );

      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
      }

      setError(null);
    },
    [activeConversationId, loading],
  );

  const sendMessage = useCallback(
    async (
      question: string,
      context: AiQueryRequest["context"] = "general",
      requestedBusinessId?: string,
    ) => {
      const trimmedQuestion = question.trim();

      if (!trimmedQuestion || loading) {
        return;
      }

      if (!requestedBusinessId || requestedBusinessId !== businessId) {
        setError(
          "The selected business could not be verified. Refresh the page and try again.",
        );
        return;
      }

      setLoading(true);
      setError(null);

      const conversationId = activeConversationId ?? createMessageId();
      const now = new Date().toISOString();

      const userMessage: AiMessage = {
        id: createMessageId(),
        role: "user",
        content: trimmedQuestion,
        timestamp: now,
      };

      const conversationHistory = messages
        .filter(
          (message) =>
            message.role === "user" || message.role === "assistant",
        )
        .slice(-8)
        .map((message) => ({
          role: message.role as "user" | "assistant",
          content: message.content.slice(0, 1200),
        }));

      setActiveConversationId(conversationId);

      setConversations((previous) => {
        const existing = previous.find(
          (conversation) => conversation.id === conversationId,
        );

        let updated: AiConversation[];

        if (existing) {
          updated = previous.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  updatedAt: now,
                  messages: [...conversation.messages, userMessage],
                }
              : conversation,
          );
        } else {
          updated = [
            {
              id: conversationId,
              title: createConversationTitle(trimmedQuestion),
              createdAt: now,
              updatedAt: now,
              messages: [userMessage],
            },
            ...previous,
          ];
        }

        return updated
          .sort(
            (first, second) =>
              new Date(second.updatedAt).getTime() -
              new Date(first.updatedAt).getTime(),
          )
          .slice(0, MAX_CONVERSATIONS);
      });

      try {
        const response = await askAiQuestion(
          trimmedQuestion,
          context,
          businessId,
          conversationHistory,
        );

        const assistantMessage: AiMessage = {
          id: createMessageId(),
          role: "assistant",
          content: response.answer,
          timestamp: new Date().toISOString(),
          data: response.data,
        };

        setConversations((previous) =>
          previous
            .map((conversation) =>
              conversation.id === conversationId
                ? {
                    ...conversation,
                    updatedAt: assistantMessage.timestamp,
                    messages: [...conversation.messages, assistantMessage],
                  }
                : conversation,
            )
            .sort(
              (first, second) =>
                new Date(second.updatedAt).getTime() -
                new Date(first.updatedAt).getTime(),
            ),
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "An unexpected error occurred while contacting the AI service.";

        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [activeConversationId, businessId, loading, messages],
  );

  return {
    messages,
    conversations,
    activeConversationId,
    loading,
    error,
    sendMessage,
    clearConversation,
    selectConversation,
    deleteConversation,
  };
};
