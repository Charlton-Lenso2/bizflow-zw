import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode, KeyboardEvent } from "react";
import {
  Bot,
  Check,
  Copy,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { useAiHook } from "../hooks/useAiHook";
import type { AiMessage } from "../types/ai-types";

interface AiChatInterfaceProps {
  businessId: string;
}

type AiContext = "sales" | "inventory" | "customer" | "packaging" | "general";

interface SuggestedQuestion {
  label: string;
  question: string;
  context: AiContext;
}

const suggestedQuestions: SuggestedQuestion[] = [
  {
    label: "Sales performance",
    question: "Give me a summary of our sales performance.",
    context: "sales",
  },
  {
    label: "Inventory status",
    question: "Which products have low stock?",
    context: "inventory",
  },
  {
    label: "Customer balances",
    question: "Show me our outstanding customer balances.",
    context: "customer",
  },
  {
    label: "Packaging accounts",
    question:
      "Summarise our packaging stock and outstanding packaging obligations.",
    context: "packaging",
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
  return content.split("\n").map((line, lineIndex) => {
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

        {lineIndex < content.split("\n").length - 1 && <br />}
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
            className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
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
        <span className="text-xs text-slate-500">Additional nested data</span>
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
      <div className="space-y-2">
        {entries.slice(0, 10).map(([key, item]) => (
          <div
            key={key}
            className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4"
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
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare
          size={15}
          className="text-slate-500 dark:text-slate-400"
        />

        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Supporting business data
        </h4>
      </div>

      <div className="text-sm text-slate-700 dark:text-slate-300">
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
        {copied ? "Copied" : "Copy"}
      </button>

      {copyError && (
        <span className="text-xs text-red-500">
          Unable to copy. Check browser permissions.
        </span>
      )}
    </div>
  );
}

function AssistantAvatar() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm dark:bg-slate-700">
      <Bot size={19} />
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

export function AiChatInterface({ businessId }: AiChatInterfaceProps) {
  const { messages, loading, error, sendMessage, clearConversation } =
    useAiHook();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);

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
    <div className="flex h-[min(760px,calc(100vh-220px))] min-h-135 flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-slate-700">
            <Sparkles size={21} />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              BizFlow AI Assistant
            </h2>

            <div className="mt-1 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Business intelligence assistant
              </span>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          disabled={loading || messages.length === 0}
          onClick={handleClear}
          className="shrink-0 px-3 py-2 text-xs"
        >
          <Trash2 size={15} className="mr-2" />
          Clear
        </Button>
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-6"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 ? (
          <div className="m-auto w-full max-w-2xl py-8">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-white">
              <Bot size={32} />
            </div>

            <div className="text-center">
              <h3 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                How can I help with your business?
              </h3>

              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
                Ask questions about sales performance, inventory, customer
                balances and packaging accounts. I use available business
                records to help you understand your operations.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {suggestedQuestions.map((suggestion) => (
                <button
                  key={suggestion.label}
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    void handleSend(suggestion.question, suggestion.context)
                  }
                  className="group rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-500 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {suggestion.label}
                    </span>

                    <Send
                      size={15}
                      className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700 dark:group-hover:text-white"
                    />
                  </div>

                  <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {suggestion.question}
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-7 flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck size={14} />
              <span>Read-only access to business information</span>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-3xl space-y-7">
            {messages.map((message: AiMessage) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {message.role === "user" ? <UserAvatar /> : <AssistantAvatar />}

                <div
                  className={`min-w-0 max-w-[88%] sm:max-w-[82%] ${
                    message.role === "user" ? "text-right" : "text-left"
                  }`}
                >
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {message.role === "user" ? "You" : "BizFlow AI"}
                    </span>

                    <span className="text-[11px] text-slate-400">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>

                  <div
                    className={`inline-block rounded-2xl px-4 py-3 text-left text-sm leading-7 ${
                      message.role === "user"
                        ? "rounded-tr-sm bg-slate-900 text-white dark:bg-slate-700"
                        : "rounded-tl-sm border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    }`}
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
                <AssistantAvatar />

                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    BizFlow AI
                  </p>

                  <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />

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

      <div className="border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6 sm:py-5">
        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
          <div className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-2 transition focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:focus-within:border-slate-500 dark:focus-within:ring-slate-700">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your business..."
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
              <Send size={17} />
            </Button>
          </div>

          <div className="mt-3 flex flex-col justify-between gap-2 text-[11px] text-slate-400 sm:flex-row sm:items-center">
            <span>Enter to send · Shift + Enter for a new line</span>

            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={12} />
              AI responses should be verified against business records.
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
