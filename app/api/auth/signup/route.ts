import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

function deriveDisplayName(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local.replace(/[._-]+/g, " ").trim() || email;
}

// POST /api/auth/signup
// Body: { email, password, displayName? }
// Creates user + initial session. Returns { userId, sessionId, displayName }.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const displayName =
    String(body.displayName ?? "").trim() || deriveDisplayName(email);

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email already registered. Try signing in instead." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, passwordHash, displayName },
  });

  const session = await prisma.chatSession.create({
    data: { userId: user.id },
  });

  return NextResponse.json({
    userId: user.id,
    sessionId: session.id,
    displayName: user.displayName,
  });
}
