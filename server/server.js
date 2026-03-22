const io = require("socket.io")(3000, {
  cors: { origin: "*" }
});

let users = {};

io.on("connection", (socket) => {

  socket.on("join", ({ username, room }) => {
    users[socket.id] = { username, room };
    socket.join(room);

    socket.to(room).emit("message", `${username} joined ${room}`);
  });

  socket.on("send-message", (message) => {
    const user = users[socket.id];
    if (!user) return;

    io.to(user.room).emit("message", `${user.username}: ${message}`);
  });

  socket.on("get-users", () => {
    const user = users[socket.id];
    if (!user) return;

    const roomUsers = Object.values(users)
      .filter(u => u.room === user.room)
      .map(u => u.username);

    socket.emit("users-list", roomUsers);
  });

  socket.on("private-message", ({ to, message }) => {
    const sender = users[socket.id];
    if (!sender) return;

    const target = Object.keys(users).find(
      id => users[id].username === to
    );

    if (target) {
      io.to(target).emit("private-message", `${sender.username}: ${message}`);
    }
  });

  socket.on("code-snippet", ({ language, content }) => {
    const user = users[socket.id];
    if (!user) return;

    io.to(user.room).emit("code-snippet", {
      username: user.username,
      language,
      content
    });
  });

  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      io.to(user.room).emit("message", `${user.username} left`);
      delete users[socket.id];
    }
  });
});