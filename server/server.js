const io = require("socket.io")(3000, {
  cors: { origin: "*" }
});

let users = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // JOIN
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

  // USERS LIST
  socket.on("get-users", () => {
    const user = users[socket.id];
    if (!user) return;

    const roomUsers = Object.values(users)
      .filter(u => u.room === user.room)
      .map(u => u.username);

    socket.emit("users-list", roomUsers);
  });

  // PRIVATE MESSAGE
  socket.on("private-message", ({ to, message }) => {
    const sender = users[socket.id];
    if (!sender) return;

    const target = Object.keys(users).find(
      id => users[id].username === to
    );

    if (target) {
      io.to(target).emit(
        "private-message",
        `${sender.username}: ${message}`
      );
    } else {
      socket.emit("message", `User ${to} not found`);
    }
  });

  // 🔥 CODE SNIPPET
  socket.on("code-snippet", ({ language, content }) => {
    const user = users[socket.id];
    if (!user) return;

    io.to(user.room).emit("code-snippet", {
      username: user.username,
      language,
      content
    });
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      io.to(user.room).emit(`${user.username} left`);
      delete users[socket.id];
    }
  });
});