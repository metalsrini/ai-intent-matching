import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/auth/check
// Body: { email }
// Returns: { exists: bool, displayName?: string }
// Used by the landing's progressive form to decide login vs signup flow.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { displayName: true, passwordHash: true },
  });

  return NextResponse.json({
    exists: !!user,
    hasPassword: !!user?.passwordHash,
    displayName: user?.displayName ?? null,
  });
}
