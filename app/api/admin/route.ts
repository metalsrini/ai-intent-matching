import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/admin — returns all data for the debug view
export async function GET() {
  try {
    const [users, sessions, messages, profiles, matches] = await Promise.all([
      prisma.user.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.chatSession.findMany({
        orderBy: { createdAt: "desc" },
        include: { user: { select: { displayName: true } } },
      }),
      prisma.message.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { session: { select: { userId: true } } },
      }),
      prisma.intentProfile.findMany({
        orderBy: { updatedAt: "desc" },
        include: { user: { select: { displayName: true } } },
      }),
      prisma.match.findMany({
        orderBy: { similarityScore: "desc" },
        include: {
          userA: { select: { displayName: true } },
          userB: { select: { displayName: true } },
        },
      }),
    ]);

    return NextResponse.json({ users, sessions, messages, profiles, matches });
  } catch (err) {
    console.error("[GET /api/admin]", err);
    return NextResponse.json({ error: "Failed to load admin data" }, { status: 500 });
  }
}
