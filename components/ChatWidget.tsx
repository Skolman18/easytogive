"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Loader2, RotateCcw } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "How does the giving portfolio work?",
  "Can I get a tax deduction for my donations?",
  "How do I find organizations to support?",
  "What is recurring giving?",
];

function AssistantText({ text }: { text: string }) {
  // Minimal inline markdown: bold, links, line breaks
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;

        // Render bold segments
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**")
            ? <strong key={j}>{part.slice(2, -2)}</strong>
            : part
        );

        if (line.startsWith("## ")) {
          return <p key={i} className="font-semibold text-gray-900 text-sm mt-2">{line.slice(3)}</p>;
        }
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <div key={i} className="flex gap-2 text-sm">
              <span className="mt-1 w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
              <span className="text-gray-700 leading-relaxed">{rendered}</span>
            </div>
          );
        }
        return <p key={i} className="text-sm text-gray-700 leading-relaxed">{rendered}</p>;
      })}
    </div>
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [unread, setUnread] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setUnread(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");
    setStreaming(true);

    // Placeholder for streaming assistant response
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: "Sorry, something went wrong. Please try again." },
        ]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              accumulated += delta;
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: "assistant", content: accumulated },
              ]);
            }
          } catch {
            // ignore parse errors in stream
          }
        }
      }

      if (!open) setUnread(true);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: "Sorry, something went wrong. Please try again." },
        ]);
      }
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming, open]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function reset() {
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
    setStreaming(false);
  }

  const isEmpty = messages.length === 0;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open chat assistant"}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        style={{ backgroundColor: "#1a7a4a", boxShadow: "0 4px 20px rgba(26,122,74,0.35)" }}
      >
        {open
          ? <X className="w-5 h-5" />
          : <>
              <MessageCircle className="w-6 h-6" />
              {unread && (
                <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white" />
              )}
            </>
        }
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[calc(100vw-3rem)] max-w-sm flex flex-col rounded-2xl border bg-white overflow-hidden"
          style={{
            borderColor: "#e5e1d8",
            boxShadow: "0 16px 48px rgba(0,0,0,0.14)",
            height: "min(520px, calc(100vh - 8rem))",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ backgroundColor: "#1a7a4a" }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-none">Giving Assistant</p>
                <p className="text-xs text-white/70 mt-0.5">Ask me anything about giving</p>
              </div>
            </div>
            {!isEmpty && (
              <button
                onClick={reset}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Clear conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ backgroundColor: "#faf9f6" }}>
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-2 pb-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                  style={{ backgroundColor: "#e8f5ee" }}
                >
                  <MessageCircle className="w-6 h-6" style={{ color: "#1a7a4a" }} />
                </div>
                <p className="text-sm font-medium text-gray-800 mb-1">Hi! How can I help?</p>
                <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                  Ask me about giving, finding organizations, tax deductions, or how EasyToGive works.
                </p>
                <div className="flex flex-col gap-2 w-full">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-left text-xs px-3 py-2.5 rounded-lg border transition-colors hover:bg-white"
                      style={{ borderColor: "#e5e1d8", color: "#374151", backgroundColor: "white" }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] px-3 py-2.5 rounded-2xl text-sm ${
                        msg.role === "user"
                          ? "rounded-br-sm text-white"
                          : "rounded-bl-sm bg-white border"
                      }`}
                      style={
                        msg.role === "user"
                          ? { backgroundColor: "#1a7a4a" }
                          : { borderColor: "#e5e1d8" }
                      }
                    >
                      {msg.role === "user" ? (
                        <p className="text-sm leading-relaxed text-white">{msg.content}</p>
                      ) : msg.content ? (
                        <AssistantText text={msg.content} />
                      ) : (
                        <div className="flex items-center gap-1.5 py-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="flex-shrink-0 px-3 py-3 border-t bg-white" style={{ borderColor: "#e5e1d8" }}>
            <div
              className="flex items-end gap-2 rounded-xl border px-3 py-2 transition-colors focus-within:border-green-600"
              style={{ borderColor: "#e5e1d8" }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={streaming}
                placeholder="Ask a question…"
                rows={1}
                className="flex-1 resize-none text-sm text-gray-900 outline-none bg-transparent placeholder-gray-400 leading-relaxed"
                style={{ maxHeight: 80 }}
              />
              <button
                onClick={() => send(input)}
                disabled={streaming || !input.trim()}
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
                style={{ backgroundColor: "#1a7a4a" }}
                aria-label="Send message"
              >
                {streaming
                  ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                  : <Send className="w-3.5 h-3.5 text-white" />
                }
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-1.5">
              AI can make mistakes — verify important information.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
