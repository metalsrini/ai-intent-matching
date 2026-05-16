"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

function deriveDisplayName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (!trimmed.includes("@")) return trimmed;
  const local = trimmed.split("@")[0] ?? trimmed;
  return local.replace(/[._-]+/g, " ").trim() || trimmed;
}

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const displayName = deriveDisplayName(email);
    if (!displayName) {
      setError("Enter your email to begin.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      if (!res.ok) throw new Error("server");
      const { userId, sessionId } = await res.json();
      localStorage.setItem("userId", userId);
      localStorage.setItem("sessionId", sessionId);
      localStorage.setItem("displayName", displayName);
      router.push("/chat");
    } catch {
      setSubmitting(false);
      setError("Something went wrong. Try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      {/* Top bar */}
      <header className="px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-[16px] font-semibold text-[var(--text)]">
            Intent
          </span>
          <button
            onClick={() => router.push("/chat")}
            className="text-[13px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            Log in
          </button>
        </div>
      </header>

      {/* Center */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 -translate-y-8">
        <h1 className="text-[40px] md:text-[48px] font-semibold tracking-tight text-[var(--text)] text-center mb-3">
          Find the people you&apos;re looking for.
        </h1>
        <p className="text-[16px] text-[var(--text-muted)] text-center max-w-lg mb-10">
          Talk to Intent about what you&apos;re building. We&apos;ll surface
          the people building alongside you — discovered through conversation,
          not keywords.
        </p>

        <form
          onSubmit={handleSubmit}
          className="composer-shell w-full max-w-md rounded-full pl-5 pr-2 py-2 flex items-center gap-3"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            placeholder="Enter your email to start"
            disabled={submitting}
            className="flex-1 bg-transparent outline-none border-none text-[15px] text-[var(--text)] placeholder:text-[var(--text-subtle)] disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={submitting}
            aria-label="Continue"
            className="shrink-0 w-9 h-9 rounded-full bg-[var(--send-bg)] text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <ArrowRight size={18} />
            )}
          </button>
        </form>

        {error && (
          <p className="text-red-600 text-[13px] mt-3">{error}</p>
        )}

        <p className="text-[12px] text-[var(--text-subtle)] mt-6 text-center">
          No account needed — we&apos;ll remember you on this device.
        </p>
      </main>

      <footer className="px-6 py-6 text-center">
        <p className="text-[12px] text-[var(--text-subtle)]">
          A POC by Intent · Built for finding kindred minds.
        </p>
      </footer>
    </div>
  );
}
