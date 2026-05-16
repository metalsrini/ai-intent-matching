"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowUp,
  AudioLines,
  Mic,
  Pencil,
  Plus,
  Sparkles,
  Target,
} from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

interface Props {
  messages: Message[];
  sending: boolean;
  onSend: (text: string) => void;
  displayName: string;
}

interface ComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

function Composer({ value, onChange, onSubmit, disabled, autoFocus }: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasText = value.trim().length > 0;

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  };

  return (
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
        value={value}
        onChange={handleChange}
        onKeyDown={handleKey}
        placeholder="Ask anything"
        rows={1}
        disabled={disabled}
        className="flex-1 bg-transparent text-[15px] text-[var(--text)] placeholder:text-[var(--text-subtle)] resize-none outline-none leading-relaxed py-2.5 px-1 disabled:opacity-60"
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
        onClick={onSubmit}
        disabled={!hasText || disabled}
        aria-label={hasText ? "Send message" : "Voice mode"}
        className="shrink-0 w-9 h-9 rounded-full bg-[var(--send-bg)] text-white flex items-center justify-center mb-0.5 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {hasText ? <ArrowUp size={18} /> : <AudioLines size={16} />}
      </button>
    </div>
  );
}

function SuggestionChip({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border)] text-[14px] text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text)] transition-colors"
    >
      <span className="text-[var(--text-muted)]">{icon}</span>
      {label}
    </button>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-[var(--user-bubble)] text-[var(--text)] rounded-3xl px-5 py-3 text-[15px] leading-relaxed whitespace-pre-wrap">
          {msg.content}
        </div>
      </div>
    );
  }
  return (
    <div className="text-[var(--text)] text-[15px] leading-relaxed whitespace-pre-wrap">
      {msg.content}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[var(--text-subtle)] animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export default function ChatInterface({
  messages,
  sending,
  onSend,
  displayName,
}: Props) {
  const [input, setInput] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0 && !sending) return;
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    onSend(text);
  };

  const showEmpty = messages.length === 0 && !sending;

  if (showEmpty) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
        <h1 className="text-[30px] md:text-[32px] font-normal text-[var(--text)] mb-8 tracking-tight">
          {displayName ? `Hi ${displayName}, what can I help you find?` : "What can I help you find?"}
        </h1>
        <div className="w-full max-w-[760px]">
          <Composer
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            disabled={sending}
            autoFocus
          />
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            <SuggestionChip
              icon={<Target size={16} />}
              label="Tell me my goals"
              onClick={() => setInput("I'm working on ")}
            />
            <SuggestionChip
              icon={<Sparkles size={16} />}
              label="Find collaborators"
              onClick={() => setInput("I'm looking for people who ")}
            />
            <SuggestionChip
              icon={<Pencil size={16} />}
              label="Refine my profile"
              onClick={() => setInput("Help me refine ")}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div ref={threadRef} className="flex-1 overflow-y-auto">
        <div className="max-w-[760px] mx-auto px-6 py-8 space-y-6">
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          {sending && <TypingDots />}
        </div>
      </div>
      <div className="px-6 pb-6 pt-2">
        <div className="max-w-[760px] mx-auto">
          <Composer
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            disabled={sending}
          />
          <p className="text-center text-[11px] text-[var(--text-subtle)] mt-2">
            Intent can make mistakes — verify before connecting with anyone.
          </p>
        </div>
      </div>
    </div>
  );
}
