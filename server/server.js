const io = require("socket.io")(3000, {
  cors: { origin: "*" }
});

let users = {};

io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);

  socket.on("join", ({ username, room }) => {
    users[socket.id] = { username, room };

    socket.join(room);

    socket.to(room).emit("message", `${username} joined ${room}`);
  });

  socket.on("send-message", (message) => {
    const user = users[socket.id];
    if (!user) return;

    io.to(user.room).emit(
      "message",
      `${user.username}: ${message}`
    );
  });

  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      io.to(user.room).emit(
        "message",
        `${user.username} left`
      );
      delete users[socket.id];
    }
  });
});