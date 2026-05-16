"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, MessageCircle, Sparkles } from "lucide-react";

type Match = {
  matchedUserId: string;
  matchedUserName: string;
  score: number;
  rationale: string;
  sharedThemes: string[];
};

type RequestStatus = "none" | "pending" | "accepted" | "rejected";

interface Props {
  matches: Match[];
  currentUserId: string;
  compact?: boolean;
}

function ScorePill({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full text-[var(--text-muted)] bg-[var(--hover-bg)] border border-[var(--border)]">
      {pct}% match
    </span>
  );
}

function ConnectButton({
  currentUserId,
  matchedUserId,
}: {
  currentUserId: string;
  matchedUserId: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<RequestStatus>("none");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/friend-request?userId=${currentUserId}`)
      .then((r) => r.json())
      .then(({ requests }) => {
        if (!Array.isArray(requests)) return;
        const existing = requests.find(
          (r) =>
            (r.fromUserId === currentUserId && r.toUserId === matchedUserId) ||
            (r.fromUserId === matchedUserId && r.toUserId === currentUserId)
        );
        if (existing) setStatus(existing.status as RequestStatus);
      })
      .catch(() => {});
  }, [currentUserId, matchedUserId]);

  async function sendRequest() {
    setLoading(true);
    const res = await fetch("/api/friend-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromUserId: currentUserId, toUserId: matchedUserId }),
    });
    if (res.ok) setStatus("pending");
    setLoading(false);
  }

  function openChat() {
    const roomId = [currentUserId, matchedUserId].sort().join("_");
    router.push(`/dm/${roomId}`);
  }

  if (status === "accepted") {
    return (
      <button
        onClick={openChat}
        className="w-full mt-3 py-2 rounded-full text-[13px] font-medium text-[var(--text)] border border-[var(--border)] hover:bg-[var(--hover-bg)] transition-colors flex items-center justify-center gap-2"
      >
        <MessageCircle size={14} />
        Open chat
      </button>
    );
  }

  if (status === "pending") {
    return (
      <div className="w-full mt-3 py-2 rounded-full text-[13px] font-medium text-[var(--text-subtle)] border border-[var(--border)] flex items-center justify-center gap-2">
        <Check size={14} />
        Request sent
      </div>
    );
  }

  return (
    <button
      onClick={sendRequest}
      disabled={loading}
      className="w-full mt-3 py-2 rounded-full text-[13px] font-medium text-white bg-[var(--send-bg)] hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
    >
      <Sparkles size={14} />
      {loading ? "Connecting…" : "Connect"}
    </button>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-gray-300 text-gray-700 text-sm font-semibold flex items-center justify-center">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function EmptyMatches() {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--hover-bg)] mb-4">
        <Sparkles size={20} className="text-[var(--text-muted)]" />
      </div>
      <h3 className="text-[18px] font-medium text-[var(--text)] mb-1">
        No matches yet
      </h3>
      <p className="text-[14px] text-[var(--text-muted)] max-w-sm mx-auto">
        Keep chatting — once your profile takes shape, people you resonate with
        will appear here.
      </p>
    </div>
  );
}

export default function MatchDisplay({
  matches,
  currentUserId,
  compact = false,
}: Props) {
  if (matches.length === 0) return <EmptyMatches />;

  if (compact) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-[var(--text-muted)]" />
          <span className="text-[14px] font-medium text-[var(--text)]">
            {matches.length} match{matches.length > 1 ? "es" : ""}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {matches.map((m) => (
            <div
              key={m.matchedUserId}
              className="flex items-center gap-2 text-[12px] px-2.5 py-1 rounded-full border border-[var(--border)] text-[var(--text)]"
            >
              <span className="w-5 h-5 rounded-full bg-gray-300 text-gray-700 text-[10px] font-semibold flex items-center justify-center">
                {m.matchedUserName.charAt(0).toUpperCase()}
              </span>
              <span>{m.matchedUserName}</span>
              <ScorePill score={m.score} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[20px] font-semibold text-[var(--text)]">
          Your matches
        </h2>
        <span className="text-[12px] text-[var(--text-subtle)]">
          {matches.length} found
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {matches.map((match) => (
          <div
            key={match.matchedUserId}
            className="rounded-2xl border border-[var(--border)] bg-white p-5 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={match.matchedUserName} />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-[var(--text)] truncate">
                  {match.matchedUserName}
                </p>
                <p className="text-[12px] text-[var(--text-subtle)]">
                  {Math.round(match.score * 100)}% resonance
                </p>
              </div>
              <ScorePill score={match.score} />
            </div>

            <div className="h-1 rounded-full mb-3 overflow-hidden bg-[var(--hover-bg)]">
              <div
                className="h-full rounded-full bg-[var(--text)]"
                style={{ width: `${Math.round(match.score * 100)}%` }}
              />
            </div>

            <p className="text-[13px] leading-relaxed text-[var(--text-muted)] mb-3">
              {match.rationale}
            </p>

            {match.sharedThemes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {match.sharedThemes.slice(0, 4).map((theme) => (
                  <span
                    key={theme}
                    className="text-[11px] px-2 py-0.5 rounded-full text-[var(--text-muted)] bg-[var(--hover-bg)]"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            )}

            <ConnectButton
              currentUserId={currentUserId}
              matchedUserId={match.matchedUserId}
            />
          </div>
        ))}
      </div>

      <p className="text-[12px] text-center text-[var(--text-subtle)] pt-2">
        Matches update as you keep chatting.
      </p>
    </div>
  );
}
