"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowUp, Mic, Plus } from "lucide-react";
import { getSocket } from "@/lib/socket-client";

type DMMessage = {
  id?: string;
  roomId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: { id: string; displayName: string };
};

export default function DMPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [otherUserName, setOtherUserName] = useState("…");
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const uid = localStorage.getItem("userId");
    if (!uid) {
      router.replace("/");
      return;
    }
    setUserId(uid);

    const [idA, idB] = roomId.split("_");
    const otherId = idA === uid ? idB : idA;

    fetch(`/api/user?userId=${otherId}`)
      .then((r) => r.json())
      .then(({ user }) => {
        if (user) setOtherUserName(user.displayName);
      })
      .catch(() => {});
  }, [roomId, router]);

  useEffect(() => {
    if (!roomId) return;
    fetch(`/api/dm?roomId=${roomId}`)
      .then((r) => r.json())
      .then(({ messages: hist }) => {
        if (Array.isArray(hist)) setMessages(hist);
      })
      .catch(console.error);
  }, [roomId]);

  useEffect(() => {
    if (!userId) return;
    const socket = getSocket();

    socket.emit("register", userId);
    socket.emit("join-dm", roomId);
    setConnected(socket.connected);

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("new-dm", (msg: DMMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id && m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      socket.off("new-dm");
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [userId, roomId]);

  useEffect(() => {
    if (messages.length === 0) return;
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  function sendMessage() {
    const text = input.trim();
    if (!text || !userId) return;

    const socket = getSocket();
    socket.emit("send-dm", { roomId, senderId: userId, content: text });

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }

  const hasText = input.trim().length > 0;

  return (
    <div className="h-screen flex flex-col bg-[var(--bg)]">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
        <button
          onClick={() => router.push("/chat")}
          aria-label="Back to chat"
          className="p-2 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-muted)] transition-colors"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="w-9 h-9 rounded-full bg-gray-300 text-gray-700 text-sm font-semibold flex items-center justify-center">
          {otherUserName.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium text-[var(--text)] truncate">
            {otherUserName}
          </p>
          <p className="text-[11px] flex items-center gap-1.5 text-[var(--text-subtle)]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connected ? "bg-emerald-500" : "bg-gray-300"
              }`}
            />
            {connected ? "Connected" : "Connecting…"}
          </p>
        </div>
      </header>

      {/* Messages */}
      <div ref={threadRef} className="flex-1 overflow-y-auto">
        <div className="max-w-[760px] mx-auto px-6 py-8 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center py-16">
              <div className="w-12 h-12 rounded-full bg-gray-300 text-gray-700 text-lg font-semibold flex items-center justify-center mb-3">
                {otherUserName.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-[20px] font-medium text-[var(--text)] mb-1">
                You matched with {otherUserName}
              </h2>
              <p className="text-[14px] text-[var(--text-muted)]">
                Say hello and start the conversation.
              </p>
            </div>
          )}

          {messages.map((msg, i) => {
            const isMe = msg.senderId === userId;
            return (
              <div
                key={i}
                className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}
              >
                {!isMe && (
                  <div className="w-7 h-7 rounded-full bg-gray-300 text-gray-700 text-[12px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                    {msg.sender.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-3xl px-5 py-3 text-[15px] leading-relaxed whitespace-pre-wrap ${
                    isMe
                      ? "bg-[var(--send-bg)] text-white"
                      : "bg-[var(--user-bubble)] text-[var(--text)]"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Composer */}
      <div className="px-6 pb-6 pt-2">
        <div className="max-w-[760px] mx-auto">
          <div className="composer-shell rounded-3xl pl-2 pr-2 py-2 flex items-end gap-1">
            <button
              type="button"
              aria-label="Add attachment"
              className="shrink-0 p-2.5 rounded-full hover:bg-[var(--hover-bg)] text-[var(--text-muted)] mb-0.5 transition-colors"
            >
              <Plus size={20} />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${otherUserName}…`}
              rows={1}
              className="flex-1 bg-transparent text-[15px] text-[var(--text)] placeholder:text-[var(--text-subtle)] resize-none outline-none leading-relaxed py-2.5 px-1"
              style={{ minHeight: "24px", maxHeight: "200px" }}
            />
            <button
              type="button"
              aria-label="Voice input"
              className="shrink-0 p-2.5 rounded-full hover:bg-[var(--hover-bg)] text-[var(--text-muted)] mb-0.5 transition-colors"
            >
              <Mic size={18} />
            </button>
            <button
              type="button"
              onClick={sendMessage}
              disabled={!hasText}
              aria-label="Send"
              className="shrink-0 w-9 h-9 rounded-full bg-[var(--send-bg)] text-white flex items-center justify-center mb-0.5 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              <ArrowUp size={18} />
            </button>
          </div>
          <p className="text-center text-[11px] text-[var(--text-subtle)] mt-2">
            Enter to send · Shift + Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
