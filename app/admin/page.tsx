"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

type AdminData = {
  users: Array<{ id: string; displayName: string; createdAt: string }>;
  sessions: Array<{
    id: string;
    userId: string;
    createdAt: string;
    user: { displayName: string };
  }>;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: string;
    session: { userId: string };
  }>;
  profiles: Array<{
    id: string;
    userId: string;
    summaryText: string;
    profileJson: string;
    extractedTags: string;
    updatedAt: string;
    user: { displayName: string };
  }>;
  matches: Array<{
    id: string;
    similarityScore: number;
    rationale: string;
    sharedThemes: string;
    createdAt: string;
    userA: { displayName: string };
    userB: { displayName: string };
  }>;
};

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section className="mb-8">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 mb-3 text-left group"
      >
        <span className="text-[18px] font-semibold text-[var(--text)]">
          {title}
        </span>
        <span className="text-[11px] px-2 py-0.5 rounded-full text-[var(--text-muted)] bg-[var(--hover-bg)] border border-[var(--border)]">
          {count}
        </span>
        <span className="text-[var(--text-subtle)] group-hover:text-[var(--text-muted)] transition-colors">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>
      {open && children}
    </section>
  );
}

function Table({
  columns,
  rows,
}: {
  columns: string[];
  rows: (string | number)[][];
}) {
  if (rows.length === 0) {
    return (
      <p className="text-[var(--text-subtle)] text-sm italic px-1">
        No records yet.
      </p>
    );
  }
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c}
                  className="text-left px-3 py-2.5 text-[var(--text-subtle)] font-medium border-b border-[var(--border)] bg-[var(--sidebar-bg)]"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-[var(--border)] last:border-b-0">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className="px-3 py-2 text-[var(--text)] max-w-xs truncate align-top"
                    title={String(cell)}
                  >
                    {String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin");
      if (!res.ok) throw new Error("Server error");
      setData(await res.json());
    } catch {
      setError("Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="min-h-screen bg-[var(--bg)] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-[28px] font-semibold text-[var(--text)] tracking-tight">
              Debug
            </h1>
            <p className="text-[14px] text-[var(--text-muted)] mt-1">
              POC internal view — everything in the database
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="rounded-full px-4 py-2 text-[13px] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--hover-bg)] transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {loading && !data ? (
          <p className="text-[var(--text-subtle)] text-sm">Loading…</p>
        ) : error || !data ? (
          <p className="text-red-600 text-sm">{error || "No data."}</p>
        ) : (
          <>
            <Section title="Users" count={data.users.length}>
              <Table
                columns={["ID", "Display Name", "Created At"]}
                rows={data.users.map((u) => [u.id, u.displayName, u.createdAt])}
              />
            </Section>

            <Section title="Chat Sessions" count={data.sessions.length}>
              <Table
                columns={["Session ID", "User", "Created At"]}
                rows={data.sessions.map((s) => [
                  s.id,
                  s.user.displayName,
                  s.createdAt,
                ])}
              />
            </Section>

            <Section title="Messages" count={data.messages.length}>
              <Table
                columns={["ID", "Role", "Content", "Created At"]}
                rows={data.messages.map((m) => [
                  m.id,
                  m.role,
                  m.content.slice(0, 120),
                  m.createdAt,
                ])}
              />
            </Section>

            <Section title="Intent Profiles" count={data.profiles.length}>
              {data.profiles.length === 0 ? (
                <p className="text-[var(--text-subtle)] text-sm italic">
                  No profiles yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.profiles.map((p) => {
                    let parsed: Record<string, unknown> = {};
                    try {
                      parsed = JSON.parse(p.profileJson);
                    } catch {}
                    return (
                      <div
                        key={p.id}
                        className="rounded-2xl border border-[var(--border)] bg-white p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-[var(--text)] text-[14px]">
                            {p.user.displayName}
                          </span>
                          <span className="text-[11px] text-[var(--text-subtle)]">
                            updated {new Date(p.updatedAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[var(--text)] text-[14px] mb-2 leading-relaxed">
                          {p.summaryText}
                        </p>
                        <p className="text-[11px] text-[var(--text-subtle)] mb-3">
                          Tags: {p.extractedTags}
                        </p>
                        <details>
                          <summary className="text-[11px] text-[var(--text-muted)] cursor-pointer hover:text-[var(--text)] transition-colors">
                            Full profile JSON
                          </summary>
                          <pre className="mt-2 text-[11px] text-[var(--text-muted)] overflow-x-auto p-3 rounded-xl bg-[var(--sidebar-bg)] border border-[var(--border)]">
                            {JSON.stringify(parsed, null, 2)}
                          </pre>
                        </details>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            <Section title="Matches" count={data.matches.length}>
              {data.matches.length === 0 ? (
                <p className="text-[var(--text-subtle)] text-sm italic">
                  No matches yet — need at least 2 users to have chatted.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.matches.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-2xl border border-[var(--border)] bg-white p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[var(--text)] text-[14px] font-medium">
                          {m.userA.displayName} ↔ {m.userB.displayName}
                        </span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full text-[var(--text-muted)] bg-[var(--hover-bg)] border border-[var(--border)]">
                          {(m.similarityScore * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
                        {m.rationale}
                      </p>
                      {m.sharedThemes && (
                        <p className="text-[11px] mt-2 text-[var(--text-subtle)]">
                          Shared: {m.sharedThemes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}
      </div>
    </main>
  );
}
