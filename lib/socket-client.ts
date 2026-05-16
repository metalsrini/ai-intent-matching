import { io, Socket } from "socket.io-client";

// Singleton socket connection — reused across the whole app
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      // Connects to the same host that served the page (works for both
      // localhost and ngrok URLs automatically)
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
