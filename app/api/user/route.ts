import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/user?userId=xxx — fetch a user by ID
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, displayName: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ user });
}

// POST /api/user — create a new user + session, return their IDs
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const displayName = (body.displayName ?? "").trim();

    if (!displayName) {
      return NextResponse.json(
        { error: "displayName is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.create({ data: { displayName } });
    const session = await prisma.chatSession.create({
      data: { userId: user.id },
    });

    return NextResponse.json({ userId: user.id, sessionId: session.id });
  } catch (err) {
    console.error("[POST /api/user]", err);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
