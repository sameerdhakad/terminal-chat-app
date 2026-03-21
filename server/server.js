const io = require("socket.io")(3000, {
  cors: { origin: "*" }
});

let users = {};

io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);

  // JOIN ROOM
  socket.on("join", ({ username, room }) => {
    users[socket.id] = { username, room };
    socket.join(room);

    socket.to(room).emit("message", `${username} joined ${room}`);
  });

  // NORMAL MESSAGE
  socket.on("send-message", (message) => {
    const user = users[socket.id];
    if (!user) return;

    io.to(user.room).emit(
      "message",
      `${user.username}: ${message}`
    );
  });

  // 🔥 GET USERS IN ROOM
  socket.on("get-users", () => {
    const user = users[socket.id];
    if (!user) return;

    const roomUsers = Object.values(users)
      .filter(u => u.room === user.room)
      .map(u => u.username);

    socket.emit("users-list", roomUsers);
  });

  // 🔥 PRIVATE MESSAGE
  socket.on("private-message", ({ to, message }) => {
    const sender = users[socket.id];
    if (!sender) return;

    const targetSocket = Object.keys(users).find(
      id => users[id].username === to
    );

    if (targetSocket) {
      io.to(targetSocket).emit(
        "private-message",
        `${sender.username} (private): ${message}`
      );
    } else {
      socket.emit("message", `User ${to} not found`);
    }
  });

  // DISCONNECT
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