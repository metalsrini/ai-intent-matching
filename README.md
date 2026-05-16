# AI Intent Matching — POC

A local-first web app where users chat with an AI assistant, the system extracts their intent profile, and finds potential matches with other users based on semantic similarity.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15, App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | SQLite via Prisma ORM |
| AI | DeepSeek API (OpenAI-compatible) |
| Deployment | Local + ngrok |

---

## Setup

### 1. Prerequisites

- Node.js 18+
- A [DeepSeek API key](https://platform.deepseek.com/)
- ngrok (for sharing with others — see below)

### 2. Clone and install

```bash
git clone <repo-url> ai-intent-matching
cd ai-intent-matching
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL="file:./dev.db"
DEEPSEEK_API_KEY="sk-your-key-here"
DEEPSEEK_BASE_URL="https://api.deepseek.com"
MATCH_THRESHOLD="0.35"
```

> `MATCH_THRESHOLD` controls what similarity score (0.0–1.0) counts as a match.
> 0.35 works well for early testing. Lower it (e.g. 0.2) if you want more matches.

### 4. Initialize the database

```bash
DATABASE_URL="file:./dev.db" npx prisma migrate dev --name init
```

> The `DATABASE_URL` prefix is only needed on the first run because `prisma` CLI
> doesn't read `.env.local` by default (Next.js does).
> After migration, the app reads it automatically.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## How it works

1. **Landing page** — enter a display name (no auth needed)
2. **Chat** — talk to the AI intent-discovery assistant
3. **Intent extraction** — after each assistant reply, the system asks DeepSeek to generate a structured JSON profile: goals, interests, needs, lookingFor, tags
4. **Matching** — profiles are compared using Jaccard pre-filtering + LLM scoring; matches above the threshold appear in the sidebar
5. **Admin page** — visit `/admin` to see all users, messages, profiles, and matches

---

## Testing with two users

### Option A — two browser windows (same machine)

1. Open `http://localhost:3000` in **Window 1**, enter name `Alice`, start chatting
2. Open a **private/incognito window**, go to `http://localhost:3000`, enter name `Bob`, start chatting
3. Each window stores its own session in `localStorage` — they act as separate users
4. After a few messages from each, check `/admin` to see profiles
5. The sidebar in each chat window will show matches once scores exceed the threshold

### Option B — two real users via ngrok

See the ngrok section below.

---

## ngrok — sharing with a friend

### Install ngrok

```bash
# macOS via Homebrew
brew install ngrok/ngrok/ngrok

# Or download from https://ngrok.com/download
```

Sign up for a free account at [ngrok.com](https://ngrok.com) and authenticate:

```bash
ngrok config add-authtoken YOUR_NGROK_TOKEN
```

### Expose your local server

Make sure `npm run dev` is running on port 3000, then:

```bash
ngrok http 3000
```

ngrok will output a public URL like `https://abc123.ngrok-free.app`.

Share that URL with your friend. You both visit the same URL — you each enter
different names and the app treats you as separate users.

### Notes for ngrok testing

- The tunnel only stays open as long as `ngrok` is running
- The free tier allows one simultaneous tunnel
- Your friend's messages go through your local server and DeepSeek API
- All data stays in your local SQLite database

---

## Pages

| URL | Description |
|---|---|
| `/` | Landing page — enter name |
| `/chat` | Main chat interface |
| `/admin` | Debug view — all DB data |

---

## Database management

```bash
# View data in Prisma Studio (GUI)
DATABASE_URL="file:./dev.db" npx prisma studio

# Reset the database (clears all data)
DATABASE_URL="file:./dev.db" npx prisma migrate reset --force
```

---

## Project structure

```
app/
  api/
    user/route.ts       — create user + session
    chat/route.ts       — send message, get history
    matches/route.ts    — get/trigger matches
    admin/route.ts      — debug data endpoint
  chat/page.tsx         — chat UI page
  admin/page.tsx        — debug page
  page.tsx              — landing/name entry
components/
  ChatInterface.tsx     — message thread + input
  MatchDisplay.tsx      — match cards sidebar
lib/
  db.ts                 — Prisma client singleton
  deepseek.ts           — DeepSeek API client + system prompt
  intent.ts             — intent profile extraction
  matching.ts           — scoring + match persistence
prisma/
  schema.prisma         — DB schema
```

---

## Known limitations (POC)

- **No real auth** — session is stored in `localStorage`; anyone can pick any name
- **No real-time updates** — matches poll every 15s; no WebSockets
- **Single session per user** — if you clear localStorage you become a new user
- **SQLite** — not suitable for multiple concurrent writers in production
- **LLM latency** — intent extraction and matching happen after each message; on slow networks this adds delay
- **Match threshold tuning** — the default (0.35) may need adjustment depending on conversation depth

---

## Environment variables reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | SQLite file path |
| `DEEPSEEK_API_KEY` | Yes | — | DeepSeek API key |
| `DEEPSEEK_BASE_URL` | No | `https://api.deepseek.com` | Base URL for DeepSeek |
| `MATCH_THRESHOLD` | No | `0.35` | Min similarity score for a match |
