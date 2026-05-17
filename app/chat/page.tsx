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
  sources?: SearchSource[];
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
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    setView("chat");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, sessionId, message: text.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${data.error ?? "Something went wrong."}`,
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          sources: Array.isArray(data.sources) ? data.sources : undefined,
        },
      ]);

      setTimeout(fetchMatches, 5_000);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't reach the server. Please try again.",
        },
      ]);
    } finally {
      setSending(false);
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
