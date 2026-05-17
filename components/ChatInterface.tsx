"use client";

import { Fragment, useEffect, useRef, useState } from "react";
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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export interface SearchSource {
  url: string;
  title: string;
  snippet: string;
  domain: string;
}

export type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: SearchSource[];
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

function CitationPill({ n, source }: { n: number; source?: SearchSource }) {
  if (!source) return <span>[{n}]</span>;
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      title={source.title}
      className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 mx-0.5 rounded-full bg-[var(--hover-bg)] text-[10px] font-semibold text-[var(--text-muted)] hover:bg-[var(--active-bg)] hover:text-[var(--text)] no-underline align-text-top transition-colors"
    >
      {n}
    </a>
  );
}

// Walk react-markdown's children and replace [n] / [n][m] sequences in any
// text nodes with CitationPill components.
function transformCitations(
  children: ReactNode,
  sources: SearchSource[]
): ReactNode {
  if (children == null) return children;
  if (typeof children === "string") {
    return splitTextOnCitations(children, sources);
  }
  if (Array.isArray(children)) {
    return children.map((c, i) => {
      if (typeof c === "string") {
        return <Fragment key={i}>{splitTextOnCitations(c, sources)}</Fragment>;
      }
      return c;
    });
  }
  return children;
}

function splitTextOnCitations(
  text: string,
  sources: SearchSource[]
): ReactNode[] {
  const parts = text.split(/(\[\d+\](?:\[\d+\])*)/g);
  const out: ReactNode[] = [];
  parts.forEach((part, i) => {
    if (!part) return;
    if (/^\[\d+\]/.test(part)) {
      const matches = part.match(/\[(\d+)\]/g) || [];
      matches.forEach((m, j) => {
        const n = parseInt(m.slice(1, -1), 10);
        const src = sources[n - 1];
        out.push(<CitationPill key={`c-${i}-${j}`} n={n} source={src} />);
      });
    } else {
      out.push(<Fragment key={`t-${i}`}>{part}</Fragment>);
    }
  });
  return out;
}

function Sources({ sources }: { sources: SearchSource[] }) {
  if (!sources.length) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
      {sources.map((s, i) => (
        <a
          key={i}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 w-[220px] rounded-xl border border-[var(--border)] bg-white p-3 hover:bg-[var(--hover-bg)] transition-colors no-underline"
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-4 h-4 rounded-full bg-[var(--hover-bg)] text-[var(--text-muted)] text-[10px] font-semibold flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://www.google.com/s2/favicons?domain=${s.domain}&sz=32`}
              alt=""
              className="w-4 h-4 rounded-sm shrink-0"
              loading="lazy"
            />
            <span className="text-[11px] text-[var(--text-subtle)] truncate flex-1">
              {s.domain}
            </span>
          </div>
          <div className="text-[12px] text-[var(--text)] line-clamp-2 leading-snug">
            {s.title}
          </div>
        </a>
      ))}
    </div>
  );
}

function AssistantBody({
  content,
  sources,
}: {
  content: string;
  sources: SearchSource[];
}) {
  // Each block-level markdown renderer is overridden so we can splice
  // citation pills into its text children.
  const wrap =
    <T extends keyof React.JSX.IntrinsicElements>(Tag: T) =>
    ({ children, ...props }: React.ComponentPropsWithoutRef<T>) => {
      const TagComponent = Tag as React.ElementType;
      return (
        <TagComponent {...props}>
          {transformCitations(children, sources)}
        </TagComponent>
      );
    };

  return (
    <div className="markdown-body text-[15px] text-[var(--text)] leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: wrap("p"),
          li: wrap("li"),
          td: wrap("td"),
          th: wrap("th"),
          h1: wrap("h1"),
          h2: wrap("h2"),
          h3: wrap("h3"),
          h4: wrap("h4"),
          h5: wrap("h5"),
          h6: wrap("h6"),
          blockquote: wrap("blockquote"),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-[var(--user-bubble)] text-[var(--text)] rounded-3xl px-5 py-3 text-[15px] leading-relaxed whitespace-pre-wrap">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {msg.sources && msg.sources.length > 0 && <Sources sources={msg.sources} />}
      <AssistantBody content={msg.content} sources={msg.sources ?? []} />
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
