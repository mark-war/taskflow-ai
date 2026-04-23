import { io } from "socket.io-client";
import { useAuthStore } from "../store/authStore";
import { useTaskStore, useBoardStore, usePresenceStore } from "../store";

let socket = null;

export function getSocket() {
  if (!socket) {
    const { token } = useAuthStore.getState();
    socket = io("/", {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => console.log("🔌 Socket connected:", socket.id));
    socket.on("disconnect", (reason) =>
      console.log("🔌 Socket disconnected:", reason),
    );
    socket.on("connect_error", (err) =>
      console.error("Socket error:", err.message),
    );

    // Global task events
    socket.on("task:created", (task) => {
      useTaskStore.getState().addTask(task);
    });

    socket.on("task:updated", (task) => {
      useTaskStore.getState().updateTask(task._id, task);
    });

    socket.on("tasks:updated", ({ ids, updates }) => {
      useTaskStore.getState().bulkUpdate(ids, updates);
    });

    socket.on("task:deleted", ({ id }) => {
      useTaskStore.getState().removeTask(id);
    });

    socket.on("tasks:deleted", ({ ids }) => {
      ids.forEach((id) => useTaskStore.getState().removeTask(id));
    });

    socket.on("board:updated", (board) => {
      useBoardStore.getState().updateBoard(board._id, board);
    });

    socket.on("presence:update", ({ members }) => {
      usePresenceStore.getState().setMembers(members);
    });

    socket.on("cursor:move", ({ userId, x, y }) => {
      usePresenceStore.getState().updateCursor(userId, { x, y });
    });
  }

  return socket;
}

export function joinBoard(boardId) {
  getSocket().emit("board:join", boardId);
}

export function leaveBoard(boardId) {
  getSocket()?.emit("board:leave", boardId);
}

export function emitCursor(boardId, x, y) {
  getSocket()?.emit("cursor:move", { boardId, x, y });
}

export function emitTyping(boardId, taskId) {
  getSocket()?.emit("task:typing", { boardId, taskId });
}

export function emitTypingStop(boardId, taskId) {
  getSocket()?.emit("task:typing:stop", { boardId, taskId });
}

export function emitDragStart(boardId, taskId) {
  getSocket()?.emit("task:drag:start", { boardId, taskId });
}

export function emitDragEnd(boardId, taskId) {
  getSocket()?.emit("task:drag:end", { boardId, taskId });
}

export function emitAICommand(boardId, command) {
  getSocket()?.emit("ai:command:start", { boardId, command });
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
