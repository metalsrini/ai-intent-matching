"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "email" | "login" | "signup";

export default function LandingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function deriveName(addr: string): string {
    const local = addr.split("@")[0] ?? addr;
    return local.replace(/[._-]+/g, " ").trim() || addr;
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) {
      setError("Enter a valid email to continue.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      if (data.exists && data.hasPassword) {
        setStep("login");
      } else {
        // New user (or legacy user with no password — set one now)
        setDisplayName(data.displayName ?? deriveName(trimmed));
        setStep("signup");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCredentialSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const url = step === "login" ? "/api/auth/login" : "/api/auth/signup";
      const body =
        step === "login"
          ? { email, password }
          : { email, password, displayName };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("sessionId", data.sessionId);
      localStorage.setItem("displayName", data.displayName);
      router.push("/chat");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function backToEmail() {
    setStep("email");
    setPassword("");
    setError("");
  }

  return (
    <div className="landing-page">
      {/* NAV */}
      <nav className="nav">
        <a className="wordmark" href="/">
          <span className="wordmark-dot"></span>
          Intent
        </a>
        <div className="nav-right">
          <button
            className="nav-signin"
            onClick={() => {
              setStep("email");
              const input = document.getElementById("hero-email") as HTMLInputElement | null;
              input?.focus();
            }}
          >
            Sign in
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <h1>
          Asking is how we<br />
          <span className="accent">find each other.</span>
        </h1>
        <p className="sub">
          Cited answers from the open web — and the people quietly asking the
          same things you are.
        </p>

        <div className="cta-stack">
          {step === "email" ? (
            <form className="cta" onSubmit={handleEmailSubmit}>
              <input
                id="hero-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Enter your email to start"
                autoComplete="email"
                required
                disabled={submitting}
              />
              <button type="submit" aria-label="Start" disabled={submitting || !email.trim()}>
                {submitting ? "…" : "Start"}
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </button>
            </form>
          ) : (
            <form onSubmit={handleCredentialSubmit}>
              <div className="cta-greet">
                {step === "login" ? (
                  <>Welcome back, <b>{email}</b></>
                ) : (
                  <>Setting up your account for <b>{email}</b></>
                )}
              </div>

              {step === "signup" && (
                <div className="cta cta-row">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    required
                    disabled={submitting}
                  />
                </div>
              )}

              <div className="cta cta-row">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder={step === "login" ? "Password" : "Choose a password (6+ chars)"}
                  autoComplete={step === "login" ? "current-password" : "new-password"}
                  required
                  minLength={6}
                  autoFocus
                  disabled={submitting}
                />
                <button
                  type="submit"
                  aria-label={step === "login" ? "Sign in" : "Create account"}
                  disabled={submitting || password.length < 6}
                >
                  {submitting ? "…" : step === "login" ? "Sign in" : "Create"}
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </button>
              </div>

              <button type="button" className="cta-back" onClick={backToEmail}>
                ← Use a different email
              </button>
            </form>
          )}

          {error && <div className="cta-error">{error}</div>}
        </div>

        {step === "email" && (
          <div className="hero-hint">Free while we&apos;re in beta. No credit card.</div>
        )}
      </section>

      {/* DEMO */}
      <section className="demo-wrap">
        <div className="demo-caption">
          <span className="demo-caption-label">A real conversation</span>
          <span className="demo-caption-line"></span>
          <span className="demo-caption-right">two threads · same question</span>
        </div>

        <div className="demo">
          {/* LEFT: Intent AI chat */}
          <div className="card" aria-label="Chat with Intent">
            <div className="card-head">
              <div className="card-head-left">
                <div className="card-head-dots">
                  <i></i><i></i><i></i>
                </div>
                <span className="card-head-tag">Intent</span>
              </div>
              <span className="card-head-right">just now</span>
            </div>

            <div className="thread">
              <div className="msg msg-self">
                <div>
                  <div className="bubble bubble-self">Why do the best ideas show up in the shower?</div>
                  <div className="msg-meta">2:14 pm</div>
                </div>
              </div>

              <div className="msg">
                <div className="avatar avatar-ai"><span></span></div>
                <div>
                  <div className="bubble bubble-other">
                    <p>
                      It&apos;s mostly about your <b>default mode network</b> — the part of the brain that lights up when you&apos;re not focused on a task. Showers, walks, and dishwashing all shut down deliberate thinking just enough to let it run.<span className="cite">1</span>
                    </p>
                    <p>
                      The &quot;incubation effect&quot; is well-replicated: people solve more remote-association problems after a break than after grinding on them.<span className="cite">2</span> Mild dopamine from warm water seems to help too.<span className="cite">3</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="sources-row">
                <span className="source-chip">
                  <span className="source-num">1</span>
                  <span className="source-fav" style={{ background: "#ea580c" }}></span>
                  <span className="source-host">nature.com</span>
                </span>
                <span className="source-chip">
                  <span className="source-num">2</span>
                  <span className="source-fav" style={{ background: "#2563eb" }}></span>
                  <span className="source-host">apa.org</span>
                </span>
                <span className="source-chip">
                  <span className="source-num">3</span>
                  <span className="source-fav" style={{ background: "#0f766e" }}></span>
                  <span className="source-host">scotthyoung.com</span>
                </span>
              </div>

              <div className="msg msg-self">
                <div>
                  <div className="bubble bubble-self">huh. so walking is basically the same trick?</div>
                  <div className="msg-meta">2:15 pm</div>
                </div>
              </div>

              <div className="msg">
                <div className="avatar avatar-ai"><span></span></div>
                <div className="typing">
                  <i></i><i></i><i></i>
                </div>
              </div>
            </div>

            <div className="chat-input">
              <span className="chat-input-text">Ask a follow-up…</span>
              <span className="chat-input-send">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </span>
            </div>
          </div>

          {/* RIGHT: matched human chat */}
          <div className="card" aria-label="Chat with Maya">
            <div className="card-head">
              <div className="card-head-left">
                <span className="card-head-tag">Maya R.</span>
                <span className="card-head-pill">matched</span>
              </div>
              <span className="card-head-right">online · 4m ago</span>
            </div>

            <div className="match-banner">
              <div className="match-banner-icon">↺</div>
              <div className="match-banner-text">
                You&apos;ve both been asking about <b>creativity, flow &amp; default mode</b> this week.
              </div>
              <span className="match-banner-pct">88% overlap</span>
            </div>

            <div className="thread">
              <div className="msg">
                <div className="avatar" style={{ background: "#7c2d12" }}>MR</div>
                <div>
                  <div className="bubble bubble-other">
                    hey — saw you were asking about default mode stuff. i&apos;ve been deep in this for a month, it&apos;s wild.
                  </div>
                  <div className="msg-meta">Maya · 2:11 pm</div>
                </div>
              </div>

              <div className="msg msg-self">
                <div>
                  <div className="bubble bubble-self">ha — literally just asked Intent the shower question 😅</div>
                  <div className="msg-meta">2:15 pm</div>
                </div>
              </div>

              <div className="msg">
                <div className="avatar" style={{ background: "#7c2d12" }}>MR</div>
                <div>
                  <div className="bubble bubble-other">
                    <p>okay you have to read this — completely changed how i think about it.</p>
                    <div className="link-card">
                      <div className="link-card-host">pnas.org · 2022</div>
                      <div className="link-card-title">Mind-wandering supports incubation and creative problem solving</div>
                    </div>
                  </div>
                  <div className="msg-meta">Maya · 2:16 pm</div>
                </div>
              </div>

              <div className="msg">
                <div className="avatar" style={{ background: "#7c2d12" }}>MR</div>
                <div>
                  <div className="bubble bubble-other">
                    i&apos;m building a small writing tool around this btw. would love a second pair of eyes if you&apos;re up for it.
                  </div>
                  <div className="msg-meta">Maya · 2:16 pm</div>
                </div>
              </div>
            </div>

            <div className="chat-input">
              <span className="chat-input-text">Message Maya…</span>
              <span className="chat-input-send">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 14l12-6L2 2v5l8 1-8 1z" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="trust">
        <q>I came in with one question and walked out with two people building the same thing. That hadn&apos;t happened to me in years.</q>
        <div className="trust-cite">
          <span className="who">Devon Liu</span>
          <span className="dot"></span>
          <span>founder, Threadline</span>
          <span className="dot"></span>
          <span>beta user since March</span>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="footer-mark">© Intent, 2026</div>
        <div className="footer-links">
          <a href="/manifesto">Manifesto</a>
          <a href="/about">About</a>
          <a href="https://twitter.com/intent">Twitter</a>
        </div>
      </footer>
    </div>
  );
}
