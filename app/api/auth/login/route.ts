import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// POST /api/auth/login
// Body: { email, password }
// Returns { userId, sessionId, displayName } using the user's most recent
// session, or creates a fresh one if they have none.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      sessions: {
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  // Generic failure to avoid leaking which emails are registered.
  if (!user || !user.passwordHash) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  let sessionId = user.sessions[0]?.id;
  if (!sessionId) {
    const fresh = await prisma.chatSession.create({ data: { userId: user.id } });
    sessionId = fresh.id;
  }

  return NextResponse.json({
    userId: user.id,
    sessionId,
    displayName: user.displayName,
  });
}
