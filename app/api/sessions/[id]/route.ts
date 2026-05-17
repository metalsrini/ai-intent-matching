import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// DELETE /api/sessions/:id?userId=X
// Cascades to all messages in the session. UserId is required so callers can't
// delete sessions they don't own.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const session = await prisma.chatSession.findFirst({
    where: { id, userId },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Delete the IntentProfile attached to this session (if any), then the
  // messages, then the session itself.
  await prisma.$transaction([
    prisma.intentProfile.deleteMany({ where: { sessionId: id } }),
    prisma.message.deleteMany({ where: { sessionId: id } }),
    prisma.chatSession.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
