import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/dm?roomId=xxx  — fetch message history for a DM room
export async function GET(req: NextRequest) {
  const roomId = req.nextUrl.searchParams.get("roomId");
  if (!roomId) {
    return NextResponse.json({ error: "roomId required" }, { status: 400 });
  }

  const messages = await prisma.directMessage.findMany({
    where: { roomId },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { id: true, displayName: true } } },
  });

  return NextResponse.json({ messages });
}
