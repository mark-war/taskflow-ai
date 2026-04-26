import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

// Track connected users per board
const boardPresence = new Map(); // boardId → Map(userId → { name, avatar, cursor })

export function initSocket(io) {
  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error("No token"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("name email avatar");
      if (!user) return next(new Error("User not found"));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Auth failed"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.user;
    console.log(`🔌 Socket connected: ${user.name} (${socket.id})`);

    // ── Join a board room ─────────────────────────────────
    socket.on("board:join", (boardId) => {
      socket.join(`board:${boardId}`);

      // Add to presence
      if (!boardPresence.has(boardId)) boardPresence.set(boardId, new Map());
      boardPresence.get(boardId).set(user._id.toString(), {
        id: user._id,
        name: user.name,
        avatar: user.avatar,
        socketId: socket.id,
        online: true,
        cursor: null,
      });

      // Broadcast presence update
      io.to(`board:${boardId}`).emit("presence:update", {
        boardId,
        members: Array.from(boardPresence.get(boardId).values()),
      });

      socket.currentBoard = boardId;
      console.log(`  → ${user.name} joined board:${boardId}`);
    });

    // ── Leave board room ──────────────────────────────────
    socket.on("board:leave", (boardId) => {
      socket.leave(`board:${boardId}`);
      removeFromPresence(boardId, user._id.toString());
      io.to(`board:${boardId}`).emit("presence:update", {
        boardId,
        members: Array.from((boardPresence.get(boardId) || new Map()).values()),
      });
    });

    // ── Live cursor position ──────────────────────────────
    socket.on("cursor:move", ({ boardId, x, y }) => {
      if (!boardPresence.has(boardId)) return;
      const member = boardPresence.get(boardId).get(user._id.toString());
      if (member) member.cursor = { x, y };
      socket.to(`board:${boardId}`).emit("cursor:move", {
        userId: user._id,
        name: user.name,
        x,
        y,
      });
    });

    // ── Typing indicator in task comments ─────────────────
    socket.on("task:typing", ({ boardId, taskId }) => {
      socket.to(`board:${boardId}`).emit("task:typing", {
        taskId,
        user: { id: user._id, name: user.name, avatar: user.avatar },
      });
    });

    socket.on("task:typing:stop", ({ boardId, taskId }) => {
      socket
        .to(`board:${boardId}`)
        .emit("task:typing:stop", { taskId, userId: user._id });
    });

    // ── Task drag start/end (lock indicator) ──────────────
    socket.on("task:drag:start", ({ boardId, taskId }) => {
      socket.to(`board:${boardId}`).emit("task:drag:start", {
        taskId,
        user: { id: user._id, name: user.name },
      });
    });

    socket.on("task:drag:end", ({ boardId, taskId }) => {
      socket.to(`board:${boardId}`).emit("task:drag:end", { taskId });
    });

    // ── AI command broadcast ──────────────────────────────
    socket.on("ai:command:start", ({ boardId, command }) => {
      socket.to(`board:${boardId}`).emit("ai:command:start", {
        user: { id: user._id, name: user.name },
        command,
      });
    });

    // ── Disconnect ────────────────────────────────────────
    socket.on("disconnect", () => {
      if (socket.currentBoard) {
        removeFromPresence(socket.currentBoard, user._id.toString());
        io.to(`board:${socket.currentBoard}`).emit("presence:update", {
          boardId: socket.currentBoard,
          members: Array.from(
            (boardPresence.get(socket.currentBoard) || new Map()).values(),
          ),
        });
      }
      console.log(`🔌 Disconnected: ${user.name}`);
    });
  });
}

function removeFromPresence(boardId, userId) {
  const board = boardPresence.get(boardId);
  if (board) {
    board.delete(userId);
    if (board.size === 0) boardPresence.delete(boardId);
  }
}
