import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  chatCompletion,
  INTENT_DISCOVERY_SYSTEM_PROMPT,
} from "@/lib/deepseek";
import { extractAndSaveIntentProfile } from "@/lib/intent";
import { runMatchingForUser } from "@/lib/matching";

// POST /api/chat
// Body: { userId, sessionId, message }
// Returns: { reply, matches? }
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

    // Persist the user's message
    await prisma.message.create({
      data: { sessionId, role: "user", content: message.trim() },
    });

    // Build conversation history for context
    const history = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });

    const contextMessages = history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Call DeepSeek with the intent-discovery system prompt
    const reply = await chatCompletion(
      [{ role: "system", content: INTENT_DISCOVERY_SYSTEM_PROMPT }, ...contextMessages],
      { temperature: 0.7, maxTokens: 512 }
    );

    // Persist the assistant reply
    await prisma.message.create({
      data: { sessionId, role: "assistant", content: reply },
    });

    // Update the session timestamp
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    // Fire-and-forget: extract intent profile + run matching
    // We don't await these so the chat response is snappy
    setImmediate(async () => {
      try {
        await extractAndSaveIntentProfile(userId, sessionId);
        await runMatchingForUser(userId);
      } catch (err) {
        console.error("[background intent/matching]", err);
      }
    });

    return NextResponse.json({ reply });
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

// GET /api/chat?sessionId=xxx — fetch message history
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const messages = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ messages });
}
