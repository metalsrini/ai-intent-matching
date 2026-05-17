import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  chatCompletion,
  INTENT_DISCOVERY_SYSTEM_PROMPT,
} from "@/lib/deepseek";
import {
  searchWeb,
  formatSourcesForPrompt,
  attachSourcesToContent,
  extractSourcesFromContent,
} from "@/lib/search";
import { extractAndSaveIntentProfile } from "@/lib/intent";
import { runMatchingForUser } from "@/lib/matching";

// POST /api/chat
// Body: { userId, sessionId, message }
// Returns: { reply, sources }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, sessionId, message } = body as {
      userId: string;
      sessionId: string;
      message: string;
    };

    if (!userId || !sessionId || !message?.trim()) {
      return NextResponse.json(
        { error: "userId, sessionId, and message are required" },
        { status: 400 }
      );
    }

    // Verify session belongs to user
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const userMessage = message.trim();

    // Persist the user's message
    await prisma.message.create({
      data: { sessionId, role: "user", content: userMessage },
    });

    // Web search runs in parallel with history fetch
    const [sources, history] = await Promise.all([
      searchWeb(userMessage, 5),
      prisma.message.findMany({
        where: { sessionId },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Strip embedded source markers from historical assistant messages so the
    // model never sees the citation metadata in its context window.
    const contextMessages = history.map((m) => {
      if (m.role === "assistant") {
        return {
          role: "assistant" as const,
          content: extractSourcesFromContent(m.content).content,
        };
      }
      return {
        role: "user" as const,
        content: m.content,
      };
    });

    // The most recent user turn is the last item in contextMessages. We
    // re-write it to include the numbered Sources block so the model can cite.
    if (sources.length > 0 && contextMessages.length > 0) {
      const last = contextMessages[contextMessages.length - 1];
      if (last.role === "user") {
        last.content = `Sources:\n${formatSourcesForPrompt(sources)}\n\nUser question: ${last.content}`;
      }
    }

    const reply = await chatCompletion(
      [
        { role: "system", content: INTENT_DISCOVERY_SYSTEM_PROMPT },
        ...contextMessages,
      ],
      { temperature: 0.7, maxTokens: 4096 }
    );

    // Persist the assistant reply with sources embedded via a tagged HTML
    // comment (invisible in markdown, easy to parse on read).
    const storedContent = attachSourcesToContent(reply, sources);
    await prisma.message.create({
      data: { sessionId, role: "assistant", content: storedContent },
    });

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    // Fire-and-forget: extract intent profile + run matching
    setImmediate(async () => {
      try {
        await extractAndSaveIntentProfile(userId, sessionId);
        await runMatchingForUser(userId);
      } catch (err) {
        console.error("[background intent/matching]", err);
      }
    });

    return NextResponse.json({ reply, sources });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    console.error("[POST /api/chat]", err);

    if (message.includes("DEEPSEEK_API_KEY")) {
      return NextResponse.json(
        { error: "DeepSeek API key is not configured." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}

// GET /api/chat?sessionId=xxx — fetch message history with sources parsed out
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const rows = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });

  const messages = rows.map((m) => {
    if (m.role === "assistant") {
      const { content, sources } = extractSourcesFromContent(m.content);
      return { id: m.id, role: m.role, content, sources };
    }
    return { id: m.id, role: m.role, content: m.content };
  });

  return NextResponse.json({ messages });
}
