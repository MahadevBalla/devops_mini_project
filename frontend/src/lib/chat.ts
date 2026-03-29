// frontend/src/lib/chat.ts
import { api } from "./api";
import { authService } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;    // true = bouncing dots (before first token)
  isStreaming?: boolean;  // true = tokens arriving (cursor blinking)
  isError?: boolean;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

// ── Session key constants (single source of truth) ───────────────────────────
// Written here so both chat.ts and floating-dock.tsx read/write identically.

export const SESSION_KEYS = {
  // Written by each tool page after a successful run
  fire: "mm_fire_session_id",
  health: "mm_health_session_id",
  tax: "mm_tax_session_id",
  mf: "mm_mf_session_id",
  life: "mm_life_session_id",
  couple: "mm_couple_session_id",
  // Generic — always mirrors the most recent tool run
  latest: "mm_session_id",
  // Fallback — standalone chat session (no tool context)
  chat: "chat_session_id",
} as const;

// ── Session helpers (called by tool pages) ────────────────────────────────────
/**
 * Call this in every tool page after a successful API response.
 * Stores to both the feature-specific key AND the generic latest key.
 */
export function storeToolSession(
  feature: keyof Omit<typeof SESSION_KEYS, "latest" | "chat">,
  sessionId: string,
  sessionType: "portfolio" | "scenario" = "portfolio"
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEYS[feature], sessionId);
  localStorage.setItem(SESSION_KEYS.latest, sessionId); // always update generic
  localStorage.setItem("mm_latest_session_type", sessionType);
}

// ── Auth header helper — called lazily, never at module level ──────────────────
function getHeaders(): Record<string, string> {
  const token = authService.getAccessToken();
  if (!token) throw new Error("UNAUTHORIZED");
  return { Authorization: `Bearer ${token}` };
}

// ── Session resolution ──────────────────────────────────────────────────────────
// Module-level promise lock — prevents duplicate session creation on rapid calls
let sessionPromise: Promise<string> | null = null;

async function createChatSession(): Promise<string> {
  const data = await authService.authenticatedRequest(() =>
    api.post<{ session_id: string }>("/api/session", undefined, getHeaders())
  );
  return data.session_id;
}

/**
 * Priority order:
 * 1. Latest tool session  → has full financial context (FIRE/health/tax state)
 * 2. Existing chat session → already established, no context
 * 3. Create new chat session via POST /api/session → cold start fallback
 */
export async function getOrCreateChatSession(): Promise<string> {
  if (typeof window === "undefined") throw new Error("SSR not supported");

  // Priority 1 — tool session with financial state
  const toolSession = localStorage.getItem(SESSION_KEYS.latest);
  if (toolSession) return toolSession;

  // Priority 2 — existing standalone chat session
  const chatSession = localStorage.getItem(SESSION_KEYS.chat);
  if (chatSession) return chatSession;

  // Priority 3 — create fresh session, with lock to prevent parallel calls
  if (!sessionPromise) {
    sessionPromise = createChatSession().then((id) => {
      localStorage.setItem(SESSION_KEYS.chat, id);
      sessionPromise = null;
      return id;
    }).catch((err) => {
      sessionPromise = null; // reset lock on failure so retry is possible
      throw err;
    });
  }

  return sessionPromise;
}

/**
 * Clears ONLY the standalone chat session.
 * Use for "Clear chat" button — preserves tool sessions and their financial context.
 */
export function clearChatSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEYS.chat);
}

/**
 * Clears ALL session keys including tool sessions.
 * Use ONLY on logout — forces fresh context on next login.
 */
export function clearAllSessions(): void {
  if (typeof window === "undefined") return;
  Object.values(SESSION_KEYS).forEach((key) => localStorage.removeItem(key));
}

// ── GET /api/chat/stream ───────────────────────────────────────────────────────
//
// WHY fetch and NOT EventSource:
//   Native EventSource cannot send custom headers — Bearer token is stripped.
//   fetch() + ReadableStream gives full header control + AbortController support.
//
// The backend sends:
//   data: {"token": "Hello"}   ← one per LLM token
//   data: {"done": true}       ← final event
//
// Returns AbortController so caller can cancel mid-stream via .abort()
// ──────────────────────────────────────────────────────────────────────────────

export function streamChatMessage(
  sessionId: string,
  message: string,
  callbacks: StreamCallbacks
): AbortController {
  const abort = new AbortController();

  const token = authService.getAccessToken();
  if (!token) {
    callbacks.onError(new Error("UNAUTHORIZED"));
    return abort;
  }

  // GET endpoint — params go in URL, not body
  const params = new URLSearchParams({
    session_id: sessionId,
    message: message.trim(),
  });

  const run = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/chat/stream?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
            "Cache-Control": "no-cache",
          },
          signal: abort.signal,
        }
      );

      if (res.status === 401) throw new Error("UNAUTHORIZED");
      if (res.status === 404) throw new Error("SESSION_NOT_FOUND");
      if (!res.ok) throw new Error(`HTTP_${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No readable stream in response");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode chunk and accumulate in buffer
        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by \n\n
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? ""; // keep any incomplete last chunk

        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed.startsWith("data: ")) continue;

          const jsonStr = trimmed.slice(6); // strip "data: " prefix
          try {
            const parsed = JSON.parse(jsonStr);

            if (typeof parsed.token === "string") {
              callbacks.onToken(parsed.token);
            }

            if (parsed.done === true) {
              callbacks.onDone();
              return;
            }
          } catch {
            // malformed JSON — skip silently
          }
        }
      }

      // Stream closed by server without explicit {done: true}
      callbacks.onDone();
    } catch (err) {
      // AbortError = user cancelled intentionally — not an error
      if ((err as Error).name === "AbortError") return;
      callbacks.onError(err as Error);
    }
  };

  run();
  return abort;
}

// ── POST /api/chat (non-streaming fallback — kept but not used in UI) ─────────

export async function sendChatMessage(
  sessionId: string,
  message: string
): Promise<string> {
  const data = await authService.authenticatedRequest(() =>
    api.post<{ reply: string }>(
      "/api/chat",
      { session_id: sessionId, message: message.trim() },
      getHeaders()
    )
  );
  return data.reply;
}

// ── Message factories ──────────────────────────────────────────────────────────

export function makeUserMessage(content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "user",
    content,
    timestamp: new Date(),
  };
}

// Replaces old makeLoadingMessage — starts with dots, transitions to cursor
export function makeAssistantStreamingMessage(): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: "",
    timestamp: new Date(),
    isLoading: true,    // dots visible before first token
    isStreaming: false,
  };
}
