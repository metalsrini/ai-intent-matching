import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/friend-request  — send a request
// Body: { fromUserId, toUserId }
export async function POST(req: NextRequest) {
  try {
    const { fromUserId, toUserId } = await req.json();
    if (!fromUserId || !toUserId || fromUserId === toUserId) {
      return NextResponse.json({ error: "Invalid user IDs" }, { status: 400 });
    }

    // Check if a request already exists in either direction
    const existing = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { fromUserId, toUserId },
          { fromUserId: toUserId, toUserId: fromUserId },
        ],
      },
    });
    if (existing) {
      return NextResponse.json({ request: existing });
    }

    const request = await prisma.friendRequest.create({
      data: { fromUserId, toUserId },
      include: {
        fromUser: { select: { displayName: true } },
      },
    });

    // Notify the recipient in real-time via Socket.io if they're online
    const io = (global as Record<string, unknown>)._io as
      | import("socket.io").Server
      | undefined;
    if (io) {
      io.to(`user:${toUserId}`).emit("friend-request", {
        requestId: request.id,
        fromUserId,
        fromUserName: request.fromUser.displayName,
      });
    }

    return NextResponse.json({ request });
  } catch (err) {
    console.error("[POST /api/friend-request]", err);
    return NextResponse.json({ error: "Failed to send request" }, { status: 500 });
  }
}

// PATCH /api/friend-request — accept or reject
// Body: { requestId, status: "accepted" | "rejected" }
export async function PATCH(req: NextRequest) {
  try {
    const { requestId, status } = await req.json();
    if (!requestId || !["accepted", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const request = await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status },
      include: {
        fromUser: { select: { id: true, displayName: true } },
        toUser: { select: { id: true, displayName: true } },
      },
    });

    if (status === "accepted") {
      const roomId = [request.fromUserId, request.toUserId].sort().join("_");

      const io = (global as Record<string, unknown>)._io as
        | import("socket.io").Server
        | undefined;
      if (io) {
        // Notify both users that the request was accepted
        io.to(`user:${request.fromUserId}`).emit("request-accepted", {
          roomId,
          withUserId: request.toUser.id,
          withUserName: request.toUser.displayName,
        });
        io.to(`user:${request.toUserId}`).emit("request-accepted", {
          roomId,
          withUserId: request.fromUser.id,
          withUserName: request.fromUser.displayName,
        });
      }
    }

    return NextResponse.json({ request });
  } catch (err) {
    console.error("[PATCH /api/friend-request]", err);
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}

// GET /api/friend-request?userId=xxx — get all requests for a user
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const requests = await prisma.friendRequest.findMany({
    where: {
      OR: [{ toUserId: userId }, { fromUserId: userId }],
    },
    include: {
      fromUser: { select: { id: true, displayName: true } },
      toUser: { select: { id: true, displayName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests });
}
