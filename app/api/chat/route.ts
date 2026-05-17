import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  chatCompletionStream,
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
// Returns: Server-Sent Events stream with events:
//   { type: "sources", sources }
//   { type: "reasoning", delta }   (zero or more — only for thinking models)
//   { type: "content", delta }     (zero or more — assembles into final reply)
//   { type: "done" } | { type: "error", message }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { userId, sessionId, message } = body as {
    userId?: string;
    sessionId?: string;
    message?: string;
  };

  if (!userId || !sessionId || !message?.trim()) {
    return NextResponse.json(
      { error: "userId, sessionId, and message are required" },
      { status: 400 }
    );
  }

  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const userMessage = message.trim();

  await prisma.message.create({
    data: { sessionId, role: "user", content: userMessage },
  });

  // Tavily search + history fetch in parallel — both are I/O bound.
  const [sources, history] = await Promise.all([
    searchWeb(userMessage, 5),
    prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Strip embedded source markers from historical assistant messages so the
  // model never sees citation metadata in its context window.
  const contextMessages = history.map((m) => {
    if (m.role === "assistant") {
      return {
        role: "assistant" as const,
        content: extractSourcesFromContent(m.content).content,
      };
    }
    return { role: "user" as const, content: m.content };
  });

  // Rewrite the most recent user turn to include the numbered Sources block.
  if (sources.length > 0 && contextMessages.length > 0) {
    const last = contextMessages[contextMessages.length - 1];
    if (last.role === "user") {
      last.content = `Sources:\n${formatSourcesForPrompt(sources)}\n\nUser question: ${last.content}`;
    }
  }

  const encoder = new TextEncoder();
  const send = (
    controller: ReadableStreamDefaultController<Uint8Array>,
    event: unknown
  ) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // 1) Hand the source list to the client immediately so the sources
        // strip can render before any tokens arrive.
        send(controller, { type: "sources", sources });

        let finalContent = "";

        for await (const chunk of chatCompletionStream(
          [
            { role: "system", content: INTENT_DISCOVERY_SYSTEM_PROMPT },
            ...contextMessages,
          ],
          { temperature: 0.7, maxTokens: 16384 }
        )) {
          send(controller, chunk);
          if (chunk.type === "content") finalContent += chunk.delta;
        }

        // 2) Persist the assembled reply with the sources tag attached.
        if (finalContent.trim()) {
          await prisma.message.create({
            data: {
              sessionId,
              role: "assistant",
              content: attachSourcesToContent(finalContent, sources),
            },
          });

          await prisma.chatSession.update({
            where: { id: sessionId },
            data: { updatedAt: new Date() },
          });
        }

        send(controller, { type: "done" });
        controller.close();

        // 3) Background: extract intent profile + run matching. Doesn't
        // block the stream because we've already closed the controller.
        setImmediate(async () => {
          try {
            await extractAndSaveIntentProfile(userId, sessionId);
            await runMatchingForUser(userId);
          } catch (err) {
            console.error("[background intent/matching]", err);
          }
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("[POST /api/chat stream]", err);
        try {
          send(controller, { type: "error", message: msg });
        } catch {}
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
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
