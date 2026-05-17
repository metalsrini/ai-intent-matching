import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/sessions?userId=X
// Returns the user's sessions sorted by updatedAt desc with a title derived
// from the first user message (or "New conversation" if empty).
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const sessions = await prisma.chatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        where: { role: "user" },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { content: true },
      },
      _count: {
        select: { messages: true },
      },
    },
  });

  const items = sessions.map((s) => ({
    id: s.id,
    title: s.messages[0]?.content?.slice(0, 60) || "New conversation",
    messageCount: s._count.messages,
    updatedAt: s.updatedAt,
  }));

  return NextResponse.json({ sessions: items });
}

// POST /api/sessions
// Body: { userId }
// Creates a fresh empty session for the user.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId ?? "");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  // Sanity check the user exists.
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const session = await prisma.chatSession.create({ data: { userId } });

  return NextResponse.json({
    id: session.id,
    title: "New conversation",
    messageCount: 0,
    updatedAt: session.updatedAt,
  });
}
