"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LogOut, PanelLeft, SquarePen } from "lucide-react";
import ChatInterface, { type SearchSource } from "@/components/ChatInterface";
import Sidebar, { type ChatView } from "@/components/Sidebar";
import MatchDisplay from "@/components/MatchDisplay";
import FriendRequests from "@/components/FriendRequests";

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  sources?: SearchSource[];
  streaming?: boolean;
};

type Match = {
  matchedUserId: string;
  matchedUserName: string;
  score: number;
  rationale: string;
  sharedThemes: string[];
};

export default function ChatPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [view, setView] = useState<ChatView>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const matchPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const uid = localStorage.getItem("userId");
    const sid = localStorage.getItem("sessionId");
    const name = localStorage.getItem("displayName") ?? "";

    if (!uid || !sid) {
      router.replace("/");
      return;
    }

    setUserId(uid);
    setSessionId(sid);
    setDisplayName(name);
  }, [router]);

  useEffect(() => {
    if (!sessionId) return;

    fetch(`/api/chat?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then(({ messages: hist }) => {
        if (Array.isArray(hist)) setMessages(hist);
      })
      .catch(console.error)
      .finally(() => setLoadingHistory(false));
  }, [sessionId]);

  const fetchMatches = useCallback(() => {
    if (!userId) return;
    fetch(`/api/matches?userId=${userId}`)
      .then((r) => r.json())
      .then(({ matches: m }) => {
        if (Array.isArray(m)) setMatches(m);
      })
      .catch(console.error);
  }, [userId]);

  useEffect(() => {
    if (!userId || messages.length === 0) return;
    fetchMatches();
    matchPollRef.current = setInterval(fetchMatches, 15_000);
    return () => {
      if (matchPollRef.current) clearInterval(matchPollRef.current);
    };
  }, [userId, messages.length, fetchMatches]);

  async function sendMessage(text: string) {
    if (!userId || !sessionId || !text.trim() || sending) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const assistantPlaceholder: Message = {
      role: "assistant",
      content: "",
      reasoning: "",
      streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
    setSending(true);
    setView("chat");

    const updateLast = (patch: (m: Message) => Message) => {
      setMessages((prev) => {
        if (prev.length === 0) return prev;
        const next = prev.slice();
        next[next.length - 1] = patch(next[next.length - 1]);
        return next;
      });
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, sessionId, message: text.trim() }),
      });

      if (!res.ok || !res.body) {
        const txt = await res.text().catch(() => "");
        updateLast(() => ({
          role: "assistant",
          content: `Error: ${txt || res.statusText}`,
        }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl).replace(/\r$/, "").trim();
          buffer = buffer.slice(nl + 1);

          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data) continue;

          let event: {
            type: string;
            delta?: string;
            sources?: SearchSource[];
            message?: string;
          };
          try {
            event = JSON.parse(data);
          } catch {
            continue;
          }

          if (event.type === "sources" && Array.isArray(event.sources)) {
            const srcs = event.sources;
            updateLast((m) => ({ ...m, sources: srcs }));
          } else if (event.type === "reasoning" && event.delta) {
            const d = event.delta;
            updateLast((m) => ({ ...m, reasoning: (m.reasoning ?? "") + d }));
          } else if (event.type === "content" && event.delta) {
            const d = event.delta;
            updateLast((m) => ({ ...m, content: m.content + d }));
          } else if (event.type === "done") {
            updateLast((m) => ({ ...m, streaming: false }));
          } else if (event.type === "error") {
            const msg = event.message ?? "Stream error";
            updateLast((m) => ({
              ...m,
              content: m.content || `Error: ${msg}`,
              streaming: false,
            }));
          }
        }
      }

      setTimeout(fetchMatches, 5_000);
    } catch (err) {
      updateLast(() => ({
        role: "assistant",
        content: "Sorry, I couldn't reach the server. Please try again.",
      }));
      console.error(err);
    } finally {
      setSending(false);
      updateLast((m) => ({ ...m, streaming: false }));
    }
  }

  function handleNewChat() {
    setView("chat");
  }

  function handleSignOut() {
    localStorage.clear();
    router.push("/");
  }

  if (!userId) return null;

  const recents =
    messages.length > 0
      ? [
          {
            id: sessionId ?? "current",
            title:
              (messages.find((m) => m.role === "user")?.content ??
                "New conversation").slice(0, 40),
            active: view === "chat",
          },
        ]
      : [];

  return (
    <div className="h-screen flex bg-[var(--bg)]">
      {sidebarOpen && (
        <Sidebar
          displayName={displayName}
          recents={recents}
          view={view}
          onView={setView}
          onNewChat={handleNewChat}
          onCloseSidebar={() => setSidebarOpen(false)}
          matchCount={matches.length}
        />
      )}

      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
                className="p-2 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-muted)] transition-colors"
              >
                <PanelLeft size={18} />
              </button>
            )}
            <span className="text-[14px] font-medium text-[var(--text)] pl-1">
              {view === "matches" ? "Matches" : "Intent"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <FriendRequests userId={userId} />
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              className="p-2 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-muted)] transition-colors"
            >
              <LogOut size={18} />
            </button>
            <button
              onClick={handleNewChat}
              aria-label="New chat"
              className="p-2 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-muted)] transition-colors"
            >
              <SquarePen size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        {loadingHistory ? (
          <div className="flex-1 flex items-center justify-center text-[var(--text-subtle)] text-sm">
            Loading…
          </div>
        ) : view === "matches" ? (
          <div className="flex-1 overflow-y-auto px-6 py-8">
            <div className="max-w-[760px] mx-auto">
              <MatchDisplay matches={matches} currentUserId={userId} />
            </div>
          </div>
        ) : (
          <ChatInterface
            messages={messages}
            sending={sending}
            onSend={sendMessage}
            displayName={displayName}
          />
        )}
      </main>
    </div>
  );
}
