"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, X } from "lucide-react";
import { getSocket } from "@/lib/socket-client";

type FriendRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: string;
  fromUser: { id: string; displayName: string };
  toUser: { id: string; displayName: string };
};

interface Props {
  userId: string;
}

export default function FriendRequests({ userId }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<FriendRequest[]>([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    fetch(`/api/friend-request?userId=${userId}`)
      .then((r) => r.json())
      .then(({ requests }) => {
        if (Array.isArray(requests)) {
          setPending(
            requests.filter(
              (r: FriendRequest) =>
                r.toUserId === userId && r.status === "pending"
            )
          );
        }
      })
      .catch(console.error);
  }, [userId]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("register", userId);

    socket.on(
      "friend-request",
      ({
        requestId,
        fromUserId,
        fromUserName,
      }: {
        requestId: string;
        fromUserId: string;
        fromUserName: string;
      }) => {
        setPending((prev) => [
          ...prev,
          {
            id: requestId,
            fromUserId,
            toUserId: userId,
            status: "pending",
            fromUser: { id: fromUserId, displayName: fromUserName },
            toUser: { id: userId, displayName: "" },
          },
        ]);
      }
    );

    socket.on("request-accepted", ({ roomId }: { roomId: string }) => {
      router.push(`/dm/${roomId}`);
    });

    return () => {
      socket.off("friend-request");
      socket.off("request-accepted");
    };
  }, [userId, router]);

  async function respond(requestId: string, status: "accepted" | "rejected") {
    const res = await fetch("/api/friend-request", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, status }),
    });

    if (res.ok && status === "accepted") {
      const { request } = await res.json();
      const roomId = [request.fromUserId, request.toUserId].sort().join("_");
      router.push(`/dm/${roomId}`);
    }

    setPending((prev) => prev.filter((r) => r.id !== requestId));
  }

  if (pending.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShow(!show)}
        aria-label={`${pending.length} pending connection request${pending.length > 1 ? "s" : ""}`}
        className="relative p-2 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-muted)] transition-colors"
      >
        <Bell size={18} />
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--send-bg)] text-white text-[10px] font-semibold flex items-center justify-center">
          {pending.length}
        </span>
      </button>

      {show && (
        <div className="absolute right-0 top-12 w-80 bg-white border border-[var(--border)] rounded-2xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <p className="text-[14px] font-medium text-[var(--text)]">
              Connection requests
            </p>
            <p className="text-[11px] text-[var(--text-subtle)] mt-0.5">
              People who want to talk
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {pending.map((req) => (
              <div
                key={req.id}
                className="px-4 py-3 border-b border-[var(--border)] last:border-b-0"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-gray-300 text-gray-700 text-sm font-semibold flex items-center justify-center">
                    {req.fromUser.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[var(--text)] truncate">
                      {req.fromUser.displayName}
                    </p>
                    <p className="text-[11px] text-[var(--text-subtle)]">
                      wants to connect
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => respond(req.id, "accepted")}
                    className="flex-1 py-1.5 rounded-full text-[12px] font-medium text-white bg-[var(--send-bg)] hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                  >
                    <Check size={13} />
                    Accept
                  </button>
                  <button
                    onClick={() => respond(req.id, "rejected")}
                    className="flex-1 py-1.5 rounded-full text-[12px] font-medium text-[var(--text-muted)] border border-[var(--border)] hover:bg-[var(--hover-bg)] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <X size={13} />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
