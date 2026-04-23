export function initSocket(io) {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("board:join", (boardId) => {
      socket.join(boardId);
    });

    socket.on("board:leave", (boardId) => {
      socket.leave(boardId);
    });

    socket.on("cursor:move", ({ boardId, x, y, userId }) => {
      socket.to(boardId).emit("cursor:move", { userId, x, y });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
}
