import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Check,
  Copy,
  History,
  Package,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { useAiHook } from "../hooks/useAiHook";
import type { AiMessage } from "../types/ai-types";

interface AiChatInterfaceProps {
  businessId: string;
  userId: string;
}

interface ConversationDeleteTarget {
  id: string;
  title: string;
}

type AiContext = "sales" | "inventory" | "customer" | "packaging" | "general";

interface SuggestedQuestion {
  label: string;
  description: string;
  question: string;
  context: AiContext;
  icon: LucideIcon;
}

const suggestedQuestions: SuggestedQuestion[] = [
  {
    label: "Sales performance",
    description: "Review revenue and completed sales.",
    question: "Give me a summary of our sales performance.",
    context: "sales",
    icon: BarChart3,
  },
  {
    label: "Inventory status",
    description: "Understand current beverage stock levels.",
    question: "Which products have low stock?",
    context: "inventory",
    icon: Package,
  },
  {
    label: "Customer balances",
    description: "Review outstanding customer credit.",
    question: "Show me our outstanding customer balances.",
    context: "customer",
    icon: Users,
  },
  {
    label: "Packaging accounts",
    description: "Review packaging stock and obligations.",
    question:
      "Summarise our packaging stock and outstanding packaging obligations.",
    context: "packaging",
    icon: Boxes,
  },
];

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "number") {
    return value.toLocaleString();
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function renderMessageContent(content: string): ReactNode {
  const lines = content.split("\n");

  return lines.map((line, lineIndex) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);

    return (
      <span key={`line-${lineIndex}`}>
        {parts.map((part, partIndex) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={`part-${partIndex}`} className="font-semibold">
                {part.slice(2, -2)}
              </strong>
            );
          }

          return <span key={`part-${partIndex}`}>{part}</span>;
        })}

        {lineIndex < lines.length - 1 && <br />}
      </span>
    );
  });
}

function renderDataValue(value: unknown, depth = 0): ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-slate-400">—</span>;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return <span>{formatValue(value)}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-slate-400">No records available.</span>;
    }

    return (
      <div className="space-y-2">
        {value.slice(0, 5).map((item, index) => (
          <div
            key={index}
            className="rounded-xl border border-border bg-white p-3 dark:bg-slate-900/60"
          >
            {renderDataValue(item, depth + 1)}
          </div>
        ))}

        {value.length > 5 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            + {value.length - 5} more records
          </p>
        )}
      </div>
    );
  }

  if (typeof value === "object") {
    if (depth >= 3) {
      return (
        <span className="text-xs text-slate-500">
          Additional nested data
        </span>
      );
    }

    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([key]) =>
        !["id", "business_id", "created_by", "updated_at"].includes(
          key.toLowerCase(),
        ),
    );

    if (entries.length === 0) {
      return <span className="text-slate-400">No additional details.</span>;
    }

    return (
      <div className="space-y-3">
        {entries.slice(0, 10).map(([key, item]) => (
          <div
            key={key}
            className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-5"
          >
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {formatLabel(key)}
            </span>

            <span className="wrap-break-word text-sm font-medium text-slate-800 dark:text-slate-200 sm:text-right">
              {renderDataValue(item, depth + 1)}
            </span>
          </div>
        ))}

        {entries.length > 10 && (
          <p className="text-xs text-slate-500">
            + {entries.length - 10} additional fields
          </p>
        )}
      </div>
    );
  }

  return <span>{String(value)}</span>;
}

function MessageData({ data }: { data: unknown }) {
  if (data === null || data === undefined) {
    return null;
  }

  if (typeof data === "string" && data.trim().length === 0) {
    return null;
  }

  if (
    typeof data === "object" &&
    !Array.isArray(data) &&
    Object.keys(data as Record<string, unknown>).length === 0
  ) {
    return null;
  }

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-slate-50 dark:bg-slate-900/70">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Activity
          size={15}
          className="text-primary"
        />

        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          Supporting business data
        </h4>
      </div>

      <div className="p-4 text-sm text-slate-700 dark:text-slate-300">
        {renderDataValue(data)}
      </div>
    </div>
  );
}

function MessageActions({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setCopyError(false);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopyError(true);
    }
  };

  return (
    <div className="mt-3 flex items-center gap-2">
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        aria-label="Copy assistant response"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? "Copied" : "Copy response"}
      </button>

      {copyError && (
        <span className="text-xs text-red-500">
          Unable to copy. Check browser permissions.
        </span>
      )}
    </div>
  );
}

function AssistantAvatar({ small = false }: { small?: boolean }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${
        small ? "h-8 w-8" : "h-10 w-10"
      }`}
      style={{ background: "var(--brand-primary)" }}
    >
      <Sparkles size={small ? 15 : 19} />
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
      <User size={18} />
    </div>
  );
}

export function AiChatInterface({
  businessId,
  userId,
}: AiChatInterfaceProps) {
  const {
    messages,
    conversations,
    activeConversationId,
    loading,
    error,
    sendMessage,
    clearConversation,
    selectConversation,
    deleteConversation,
  } = useAiHook(userId, businessId);

  const [input, setInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] =
    useState<ConversationDeleteTarget | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);

  useEffect(() => {
    if (!conversationToDelete) {
      return;
    }

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        setConversationToDelete(null);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, [conversationToDelete, loading]);

  const handleSend = async (
    question?: string,
    context: AiContext = "general",
  ) => {
    const message = (question ?? input).trim();

    if (!message || loading || !businessId) {
      return;
    }

    setInput("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    await sendMessage(message, context, businessId);
    textareaRef.current?.focus();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSend();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleClear = () => {
    if (loading) {
      return;
    }

    clearConversation();
    setInput("");
    textareaRef.current?.focus();
  };

  return (
    <div className="relative flex h-[min(780px,calc(100dvh-300px))] min-h-[480px] flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:bg-slate-900">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-3.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <AssistantAvatar />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                BizFlow AI
              </h2>

              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400">
                Read only
              </span>
            </div>

            <div className="mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                Wholesale business intelligence
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            aria-label="Open conversation history"
            aria-expanded={historyOpen}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-primary/40 hover:bg-slate-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <History size={15} />
            <span className="hidden sm:inline">History</span>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {conversations.length}
            </span>
          </button>

          <Button
            variant="primary"
            disabled={loading}
            onClick={handleClear}
            className="h-10 shrink-0 rounded-xl px-3 py-2 text-xs"
          >
            <Plus size={15} className="mr-1.5" />
            <span>New chat</span>
          </Button>
        </div>
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-7"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 ? (
          <div className="m-auto w-full max-w-4xl py-5">
            <div className="mx-auto max-w-2xl text-center">
              <div
                className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg"
                style={{
                  background:
                    "linear-gradient(145deg, var(--brand-primary), color-mix(in srgb, var(--brand-primary) 72%, #8b5cf6))",
                }}
              >
                <Sparkles size={29} />
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                <Activity size={12} className="text-primary" />
                Your business intelligence workspace
              </div>

              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                What would you like to understand?
              </h3>

              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Explore your wholesale operations using verified BizFlow
                business records. Ask about performance, stock, customer
                credit, or packaging obligations.
              </p>
            </div>

            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Suggested questions
                </p>

                <span className="text-[11px] text-slate-400">
                  Select to get started
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {suggestedQuestions.map((suggestion) => {
                  const Icon = suggestion.icon;

                  return (
                    <button
                      key={suggestion.label}
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        void handleSend(
                          suggestion.question,
                          suggestion.context,
                        )
                      }
                      className="group rounded-xl border border-border bg-white p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:hover:bg-slate-800/80"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-primary transition group-hover:bg-primary/10 dark:bg-slate-800">
                            <Icon size={19} />
                          </div>

                          <div className="min-w-0">
                            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {suggestion.label}
                            </span>

                            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                              {suggestion.description}
                            </p>
                          </div>
                        </div>

                        <ArrowUpRight
                          size={16}
                          className="mt-1 shrink-0 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-border pt-5 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-500" />
                Read-only business access
              </span>

              <span className="inline-flex items-center gap-1.5">
                <Activity size={13} />
                Answers based on available records
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-4xl space-y-7">
            {messages.map((message: AiMessage) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {message.role === "user" ? <UserAvatar /> : <AssistantAvatar small />}

                <div
                  className={`min-w-0 max-w-[90%] sm:max-w-[82%] ${
                    message.role === "user" ? "text-right" : "text-left"
                  }`}
                >
                  <div
                    className={`mb-1.5 flex flex-wrap items-center gap-2 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {message.role === "user" ? "You" : "BizFlow AI"}
                    </span>

                    <span className="text-[11px] text-slate-400">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>

                  <div
                    className={`inline-block rounded-2xl px-4 py-3 text-left text-sm leading-7 shadow-sm ${
                      message.role === "user"
                        ? "rounded-tr-sm text-white"
                        : "rounded-tl-sm border border-border bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                    }`}
                    style={
                      message.role === "user"
                        ? {
                            background: "var(--brand-primary)",
                            color: "var(--brand-primary-contrast)",
                          }
                        : undefined
                    }
                  >
                    <div className="whitespace-pre-wrap wrap-break-word">
                      {renderMessageContent(message.content)}
                    </div>
                  </div>

                  {message.role === "assistant" && (
                    <>
                      <MessageData data={message.data} />
                      <MessageActions content={message.content} />
                    </>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-start gap-3">
                <AssistantAvatar small />

                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    BizFlow AI
                  </p>

                  <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-border bg-white px-4 py-3 dark:bg-slate-800">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:300ms]" />

                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                      Analysing business information...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {error && (
        <div className="mx-4 mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 sm:mx-6">
          {error}
        </div>
      )}

      <div className="shrink-0 border-t border-border bg-white p-3 dark:bg-slate-900 sm:px-6 sm:py-4">
        <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-slate-50 p-2 transition focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 dark:bg-slate-800/80">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about sales, inventory, customers or packaging..."
              rows={1}
              disabled={loading}
              aria-label="Message the AI assistant"
              className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed dark:text-white dark:placeholder:text-slate-500"
            />

            <Button
              variant="primary"
              onClick={() => void handleSend()}
              disabled={!input.trim() || loading}
              isLoading={loading}
              className="mb-0.5 h-10 w-10 shrink-0 rounded-xl p-0"
              aria-label="Send message"
            >
              <Send size={16} />
            </Button>
          </div>

          <div className="mt-2.5 flex flex-col justify-between gap-2 text-[11px] text-slate-400 sm:flex-row sm:items-center">
            <span>Enter to send · Shift + Enter for a new line</span>

            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={12} />
              Verify important decisions against business records.
            </span>
          </div>
        </form>
      </div>
      {historyOpen && (
        <div className="absolute inset-0 z-30">
          <button
            type="button"
            aria-label="Close conversation history"
            onClick={() => setHistoryOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-slate-950/40 backdrop-blur-[1px]"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-history-title"
            className="absolute inset-y-0 left-0 z-40 flex w-[min(88%,360px)] flex-col border-r border-border bg-white shadow-2xl dark:bg-slate-900"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <History size={19} />
                </div>

                <div className="min-w-0">
                  <h3
                    id="ai-history-title"
                    className="text-sm font-semibold text-slate-900 dark:text-white"
                  >
                    Conversation history
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {conversations.length} saved conversation
                    {conversations.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                aria-label="Close history panel"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <span className="text-xl leading-none">&times;</span>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {conversations.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-5 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                    <History size={22} />
                  </div>

                  <h4 className="mt-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    No conversations yet
                  </h4>

                  <p className="mt-2 max-w-[230px] text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Your business questions and AI responses will appear here
                    after you start a conversation.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conversation) => {
                    const isActive =
                      conversation.id === activeConversationId;

                    return (
                      <div
                        key={conversation.id}
                        className={`group flex items-center gap-2 rounded-xl border p-2 transition ${
                          isActive
                            ? "border-primary/30 bg-primary/5 dark:bg-primary/10"
                            : "border-transparent hover:border-border hover:bg-slate-50 dark:hover:bg-slate-800/70"
                        }`}
                      >
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => {
                            selectConversation(conversation.id);
                            setHistoryOpen(false);
                          }}
                          className="min-w-0 flex-1 rounded-lg px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed"
                        >
                          <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                            {conversation.title}
                          </span>

                          <span className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>
                              {conversation.messages.length} messages
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {new Date(
                                conversation.updatedAt,
                              ).toLocaleDateString()}
                            </span>
                          </span>
                        </button>

                        <button
                          type="button"
                          disabled={loading}
                          aria-label={`Delete conversation: ${conversation.title}`}
                          title="Delete conversation"
                          onClick={() => {
                            setConversationToDelete({
                              id: conversation.id,
                              title: conversation.title,
                            });
                          }}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-border bg-slate-50/80 px-4 py-3 dark:bg-slate-800/40">
              <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
                History is saved on this device for this business.
              </p>
            </div>
          </aside>
        </div>
      )}
      {conversationToDelete && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !loading) {
              setConversationToDelete(null);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-conversation-title"
            aria-describedby="delete-conversation-description"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
          >
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                  <Trash2 size={21} />
                </div>

                <div className="min-w-0 flex-1">
                  <h2
                    id="delete-conversation-title"
                    className="text-base font-semibold text-slate-900 dark:text-white"
                  >
                    Delete conversation?
                  </h2>

                  <p
                    id="delete-conversation-description"
                    className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400"
                  >
                    This conversation and its messages will be permanently
                    removed from your saved AI history.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-border bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                <p className="break-words text-sm font-medium text-slate-800 dark:text-slate-200">
                  {conversationToDelete.title}
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-border bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6 dark:bg-slate-800/30">
              <button
                type="button"
                disabled={loading}
                onClick={() => setConversationToDelete(null)}
                className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  deleteConversation(conversationToDelete.id);
                  setConversationToDelete(null);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={15} />
                Delete conversation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
