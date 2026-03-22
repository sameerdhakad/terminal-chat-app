const io = require("socket.io")(3000, {
  cors: { origin: "*" }
});

let users = {};
let rooms = {};

io.on("connection", (socket) => {

  socket.on("join", ({ username, room }) => {

    users[socket.id] = { username, room };

    if (!rooms[room]) {
      rooms[room] = { users: [], messages: [] };
    }

    socket.join(room);

    if (!rooms[room].users.includes(username)) {
      rooms[room].users.push(username);
    }

    // 🔥 SEND HISTORY (FIXED)
    socket.emit("history", rooms[room].messages);

    const joinMsg = {
      type: "system",
      text: `${username} joined ${room}`,
      time: new Date().toLocaleTimeString()
    };

    rooms[room].messages.push(joinMsg);
    if (rooms[room].messages.length > 20) rooms[room].messages.shift();

    socket.to(room).emit("message", joinMsg);
  });

  socket.on("send-message", (message) => {
    const user = users[socket.id];
    if (!user) return;

    const msg = {
      type: "chat",
      user: user.username,
      text: message,
      time: new Date().toLocaleTimeString()
    };

    rooms[user.room].messages.push(msg);
    if (rooms[user.room].messages.length > 20) rooms[user.room].messages.shift();

    io.to(user.room).emit("message", msg);
  });

  socket.on("get-users", () => {
    const user = users[socket.id];
    if (!user) return;

    socket.emit("users-list", rooms[user.room].users);
  });

  socket.on("get-rooms", () => {
    socket.emit("rooms-list", Object.keys(rooms));
  });

  socket.on("delete-room", (roomName) => {
    if (rooms[roomName] && rooms[roomName].users.length === 0) {
      delete rooms[roomName];
      socket.emit("message", {
        type: "system",
        text: `Room ${roomName} deleted`,
        time: new Date().toLocaleTimeString()
      });
    }
  });

  socket.on("private-message", ({ to, message }) => {
    const sender = users[socket.id];
    if (!sender) return;

    const target = Object.keys(users).find(
      id => users[id].username === to
    );

    if (target) {
      io.to(target).emit("private-message", {
        from: sender.username,
        text: message,
        time: new Date().toLocaleTimeString()
      });
    }
  });

  socket.on("code-snippet", ({ language, content }) => {
    const user = users[socket.id];
    if (!user) return;

    const msg = {
      type: "code",
      user: user.username,
      language,
      content,
      time: new Date().toLocaleTimeString()
    };

    rooms[user.room].messages.push(msg);
    if (rooms[user.room].messages.length > 20) rooms[user.room].messages.shift();

    io.to(user.room).emit("code-snippet", msg);
  });

  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (!user) return;

    const room = user.room;

    if (rooms[room]) {
      rooms[room].users = rooms[room].users.filter(
        u => u !== user.username
      );
    }

    delete users[socket.id];
  });

});