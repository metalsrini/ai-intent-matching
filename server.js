// Custom Next.js server with Socket.io for real-time DM chat
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0"; // bind to all interfaces so ngrok can reach it
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // After app.prepare(), Next.js has loaded .env.local into process.env
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Request error:", err);
      res.statusCode = 500;
      res.end("Internal server error");
    }
  });

  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  // Make io accessible to Next.js API route handlers via global
  global._io = io;

  io.on("connection", (socket) => {
    // Client registers their userId so we can send them targeted events
    socket.on("register", (userId) => {
      socket.join(`user:${userId}`);
      socket.data.userId = userId;
    });

    // Join a specific DM room
    socket.on("join-dm", (roomId) => {
      socket.join(`dm:${roomId}`);
    });

    // Client sends a DM — persist to DB then broadcast to the room
    socket.on("send-dm", async ({ roomId, senderId, content }) => {
      if (!roomId || !senderId || !content?.trim()) return;

      try {
        const message = await prisma.directMessage.create({
          data: { roomId, senderId, content: content.trim() },
          include: { sender: { select: { id: true, displayName: true } } },
        });
        io.to(`dm:${roomId}`).emit("new-dm", message);
      } catch (err) {
        console.error("DM save error:", err);
        socket.emit("dm-error", "Failed to send message.");
      }
    });

    socket.on("disconnect", () => {});
  });

  httpServer.listen(port, () => {
    console.log(`\n > Ready on http://localhost:${port}`);
  });
});
