// frontend/src/components/chat/chat-page.tsx
"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Trash2, Sparkles, Loader2, StopCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { MessageList } from "./message-list";
import { SuggestionChips } from "./suggestion-chips";
import { ChatInputBar } from "./chat-input-bar";
import {
  streamChatMessage,
  getOrCreateChatSession,
  clearChatSession,
  makeUserMessage,
  makeAssistantStreamingMessage,
  type ChatMessage,
} from "@/lib/chat";
import { cn } from "@/lib/utils";

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const streamingIdRef = useRef<string | null>(null);

  // ── Bootstrap session ──────────────────────────────────────────────────────
  useEffect(() => {
    getOrCreateChatSession()
      .then((id) => { setSessionId(id); setSessionReady(true); })
      .catch(() => toast.error("Could not start your chat session. Please refresh."));
  }, []);

  // ── Stop active stream ─────────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setMessages((prev) =>
      prev.map((m) =>
        m.id === streamingIdRef.current
          ? { ...m, isStreaming: false, isLoading: false }
          : m
      )
    );
    setIsStreaming(false);
    abortRef.current = null;
    streamingIdRef.current = null;
  }, []);

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = useCallback(
    (text: string) => {
      if (!sessionId || isStreaming || !text.trim()) return;

      const userMsg = makeUserMessage(text.trim());
      const assistantMsg = makeAssistantStreamingMessage();
      streamingIdRef.current = assistantMsg.id;

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      const abort = streamChatMessage(sessionId, text.trim(), {
        onToken: (token) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id !== assistantMsg.id ? m : {
                ...m,
                content: m.content + token,
                isLoading: false,
                isStreaming: true,
              }
            )
          );
        },
        onDone: () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, isStreaming: false, isLoading: false }
                : m
            )
          );
          setIsStreaming(false);
          abortRef.current = null;
          streamingIdRef.current = null;
        },
        onError: (err) => {
          const msg = err.message;
          if (msg === "SESSION_NOT_FOUND") {
            clearChatSession();
            toast.warning("Session expired — starting fresh.");
            setMessages((prev) => prev.filter((m) => m.id !== assistantMsg.id));
            getOrCreateChatSession().then((id) => {
              setSessionId(id);
              toast.info("New session ready. Please resend your message.");
            });
          } else if (msg === "UNAUTHORIZED") {
            toast.error("Signed out — please sign in again.");
            setMessages((prev) => prev.filter((m) => m.id !== assistantMsg.id));
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, content: "Something went wrong. Please try again.", isLoading: false, isStreaming: false, isError: true }
                  : m
              )
            );
            toast.error("Stream interrupted. Please try again.");
          }
          setIsStreaming(false);
          abortRef.current = null;
          streamingIdRef.current = null;
        },
      });

      abortRef.current = abort;
    },
    [sessionId, isStreaming]
  );

  // ── Clear chat ─────────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    clearChatSession();
    setSessionReady(false);
    setIsStreaming(false);
    getOrCreateChatSession()
      .then((id) => { setSessionId(id); setSessionReady(true); toast.success("Chat cleared — fresh session started."); })
      .catch(() => toast.error("Could not reset session."));
  }, []);

  return (
    // AppShell still renders the sidebar — we just override its inner content area
    <AppShell noPadding>
      {/*
        Full-height chat column that fills whatever space AppShell gives us.
        AppShell must pass `noPadding` to remove its max-w / py-8 wrapper.
        If AppShell doesn't support noPadding yet, see note below.
      */}
      <div className="flex flex-col w-full relative" style={{ height: "100%" }}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border bg-background/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-tight">Money Mentor</span>
              <span className="text-[11px] leading-tight text-muted-foreground">
                {!sessionReady ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Connecting…
                  </span>
                ) : isStreaming ? (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-1 text-primary">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                    Responding…
                  </motion.span>
                ) : (
                  <motion.span key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />
                    Ready
                  </motion.span>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isStreaming && (
              <motion.button
                initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                onClick={handleStop}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors"
              >
                <StopCircle className="h-3.5 w-3.5" /> Stop
              </motion.button>
            )}
            {messages.length > 0 && !isStreaming && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                onClick={handleClear}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Clear chat and start fresh"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </motion.button>
            )}
          </div>
        </div>

        {/* ── Message area — scrollable, padded so content clears floating input ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-3xl mx-auto pb-36 pt-2">
            {messages.length === 0 ? (
              <SuggestionChips
                onSelect={handleSend}
                disabled={!sessionReady || isStreaming}
              />
            ) : (
              <MessageList messages={messages} />
            )}
          </div>
        </div>

        {/* ── Floating input bar — fixed to bottom, centred, frosted glass ── */}
        <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
          <div className="max-w-3xl mx-auto px-3 pb-3 pointer-events-auto">
            {/* Gradient fade above input so messages don't hard-cut */}
            <div className="absolute -top-12 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
            <div className="relative rounded-2xl shadow-2xl shadow-black/20 ring-1 ring-border/50 bg-background/95 backdrop-blur-xl overflow-hidden">
              <ChatInputBar
                onSend={handleSend}
                onStop={handleStop}
                isStreaming={isStreaming}
                disabled={!sessionReady}
              />
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}