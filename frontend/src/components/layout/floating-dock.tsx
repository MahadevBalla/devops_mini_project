// frontend/src/components/layout/floating-dock.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Mic, X, Send, Loader2 } from "lucide-react";
import {
    getOrCreateChatSession,
    streamChatMessage,
    SESSION_KEYS,
    type StreamCallbacks,
} from "@/lib/chat";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    isStreaming?: boolean;
    isLoading?: boolean;   // ← added: used in onToken to hide dots on first token
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHUNK_INTERVAL_MS = 28;
const CHUNK_SIZE = 3;

// ─── Floating Dock ────────────────────────────────────────────────────────────

export function FloatingDock() {
    const pathname = usePathname();
    const [chatOpen, setChatOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (chatOpen) setTimeout(() => inputRef.current?.focus(), 150);
    }, [chatOpen]);

    useEffect(() => () => abortRef.current?.abort(), []);

    // ─── Hide on /chat page ───────────────────────────────────────────────────
    if (pathname === "/chat" || pathname.startsWith("/chat/")) return null;

    // ─── Send ──────────────────────────────────────────────────────────────────

    const sendMessage = useCallback(async (text: string) => {
        const clean = text.trim();
        if (!clean || isStreaming) return;

        const aiMsgId = crypto.randomUUID();

        setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: "user", content: clean },
            { id: aiMsgId, role: "assistant", content: "", isStreaming: true, isLoading: true },
        ]);
        setInput("");
        setIsStreaming(true);

        // ── Inline fallback chunker ─────────────────────────────────────────────
        async function fallbackChunk(fullText: string) {
            const chunks = fullText.match(new RegExp(`.{1,${CHUNK_SIZE}}`, "g")) ?? [];
            for (const chunk of chunks) {
                await new Promise((r) => setTimeout(r, CHUNK_INTERVAL_MS));
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === aiMsgId ? { ...m, content: m.content + chunk, isLoading: false } : m
                    )
                );
            }
        }

        // ── Resolve session ─────────────────────────────────────────────────────
        let sessionId: string;
        try {
            sessionId = await getOrCreateChatSession();
        } catch {
            await fallbackChunk("Please sign in to use chat.");
            setIsStreaming(false);
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === aiMsgId ? { ...m, isStreaming: false, isLoading: false } : m
                )
            );
            return;
        }

        // ── Abort previous, start new stream via chat.ts ────────────────────────
        abortRef.current?.abort();

        const callbacks: StreamCallbacks = {
            onToken: (token) => {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === aiMsgId
                            ? { ...m, content: m.content + token, isLoading: false, isStreaming: true }
                            : m
                    )
                );
            },

            onDone: () => {
                setIsStreaming(false);
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === aiMsgId ? { ...m, isStreaming: false, isLoading: false } : m
                    )
                );
                abortRef.current = null;
            },

            onError: async (err) => {
                const isSessionErr = err.message === "SESSION_NOT_FOUND";

                // ── Clear broken session so next send gets a fresh one ──────────────
                if (isSessionErr) {
                    localStorage.removeItem(SESSION_KEYS.latest);
                    localStorage.removeItem(SESSION_KEYS.chat);
                }

                const fallback = isSessionErr
                    ? "Session expired — please try again."
                    : "I'm having trouble connecting right now. Please try again in a moment.";

                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === aiMsgId ? { ...m, content: "", isLoading: false } : m
                    )
                );
                await fallbackChunk(fallback);

                setIsStreaming(false);
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === aiMsgId ? { ...m, isStreaming: false, isLoading: false } : m
                    )
                );
                abortRef.current = null;
            },
        };

        abortRef.current = streamChatMessage(sessionId, clean, callbacks);
    }, [isStreaming]);

    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

            {/* ── Chat Panel ── */}
            <AnimatePresence>
                {chatOpen && (
                    <motion.div
                        key="chat-panel"
                        initial={{ opacity: 0, y: 16, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className={cn(
                            "w-[340px] sm:w-[380px] h-[480px]",
                            "bg-card border border-border rounded-2xl shadow-2xl",
                            "flex flex-col overflow-hidden"
                        )}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <MessageCircle className="size-3.5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold leading-none">AI Mentor</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {isStreaming ? "Thinking..." : "Ask anything about your finances"}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setChatOpen(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div
                            className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
                            data-lenis-prevent
                        >
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center gap-2">
                                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <MessageCircle className="size-5 text-primary" />
                                    </div>
                                    <p className="text-sm font-medium">How can I help?</p>
                                    <p className="text-xs text-muted-foreground max-w-[220px]">
                                        Ask about your FIRE timeline, tax savings, or portfolio health.
                                    </p>
                                    <div className="flex flex-col gap-1.5 mt-2 w-full">
                                        {[
                                            "How close am I to FIRE?",
                                            "Should I switch to new tax regime?",
                                            "What's dragging my health score?",
                                        ].map((prompt) => (
                                            <button
                                                key={prompt}
                                                onClick={() => sendMessage(prompt)}
                                                className="text-xs text-left px-3 py-2 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
                                            >
                                                {prompt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "flex",
                                        msg.role === "user" ? "justify-end" : "justify-start"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                                            msg.role === "user"
                                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                                : "bg-muted text-foreground rounded-bl-sm"
                                        )}
                                    >
                                        {/* Bouncing dots — waiting for first token */}
                                        {msg.isLoading && !msg.content && (
                                            <span className="flex gap-1 items-center h-4">
                                                <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                                                <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                                                <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                                            </span>
                                        )}
                                        {msg.content}
                                        {/* Blinking cursor — tokens arriving */}
                                        {msg.isStreaming && msg.content && (
                                            <span className="inline-block w-0.5 h-3.5 bg-primary ml-0.5 animate-pulse align-middle" />
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={bottomRef} />
                        </div>

                        {/* Input */}
                        <div className="px-3 py-3 border-t border-border shrink-0">
                            <form
                                onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
                                className="flex items-center gap-2"
                            >
                                <input
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask your AI mentor..."
                                    disabled={isStreaming}
                                    className={cn(
                                        "flex-1 text-sm bg-muted rounded-xl px-3 py-2",
                                        "border border-transparent focus:border-ring focus:outline-none",
                                        "placeholder:text-muted-foreground disabled:opacity-50 transition-colors"
                                    )}
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isStreaming}
                                    className={cn(
                                        "size-8 rounded-xl bg-primary text-primary-foreground",
                                        "flex items-center justify-center shrink-0",
                                        "disabled:opacity-40 hover:opacity-90 transition-opacity"
                                    )}
                                >
                                    {isStreaming
                                        ? <Loader2 className="size-3.5 animate-spin" />
                                        : <Send className="size-3.5" />
                                    }
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Dock Buttons ── */}
            <div className="flex items-center gap-2">
                <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    title="Voice (coming soon)"
                    className={cn(
                        "size-11 rounded-2xl border border-border bg-card shadow-lg",
                        "flex items-center justify-center text-muted-foreground",
                        "hover:text-foreground hover:border-primary/40 transition-colors"
                    )}
                >
                    <Mic className="size-4" />
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setChatOpen((v) => !v)}
                    className={cn(
                        "size-11 rounded-2xl shadow-lg flex items-center justify-center transition-colors",
                        chatOpen
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary/40"
                    )}
                >
                    <AnimatePresence mode="wait" initial={false}>
                        {chatOpen ? (
                            <motion.span
                                key="x"
                                initial={{ rotate: -45, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                exit={{ rotate: 45, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                            >
                                <X className="size-4" />
                            </motion.span>
                        ) : (
                            <motion.span
                                key="chat"
                                initial={{ rotate: 45, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                exit={{ rotate: -45, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                            >
                                <MessageCircle className="size-4" />
                            </motion.span>
                        )}
                    </AnimatePresence>
                </motion.button>
            </div>
        </div>
    );
}
