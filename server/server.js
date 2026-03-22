const io = require("socket.io")(3000, {
  cors: { origin: "*" }
});

let users = {};
let rooms = {};

io.on("connection", (socket) => {

  // JOIN ROOM
  socket.on("join", ({ username, room }) => {
    users[socket.id] = { username, room };

    if (!rooms[room]) {
      rooms[room] = { users: [], messages: [] };
    }

    socket.join(room);

    if (!rooms[room].users.includes(username)) {
      rooms[room].users.push(username);
    }

    // SEND HISTORY
    socket.emit("history", rooms[room].messages);

    const joinMsg = createSystemMsg(`${username} joined ${room}`);
    saveMessage(room, joinMsg);

    socket.to(room).emit("message", joinMsg);
  });

  // SEND MESSAGE
  socket.on("send-message", (text) => {
    const user = users[socket.id];
    if (!user) return;

    const msg = {
      type: "chat",
      user: user.username,
      text,
      time: now()
    };

    saveMessage(user.room, msg);
    io.to(user.room).emit("message", msg);
  });

  // USERS
  socket.on("get-users", () => {
    const user = users[socket.id];
    if (!user) return;

    socket.emit("users-list", rooms[user.room]?.users || []);
  });

  // ROOMS
  socket.on("get-rooms", () => {
    socket.emit("rooms-list", Object.keys(rooms));
  });

  // DELETE ROOM
  socket.on("delete-room", (roomName) => {
    if (rooms[roomName] && rooms[roomName].users.length === 0) {
      delete rooms[roomName];
      socket.emit("message", createSystemMsg(`Room ${roomName} deleted`));
    }
  });

  // PRIVATE
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
        time: now()
      });
    }
  });

  // CODE
  socket.on("code-snippet", ({ language, content }) => {
    const user = users[socket.id];
    if (!user) return;

    const msg = {
      type: "code",
      user: user.username,
      language,
      content,
      time: now()
    };

    saveMessage(user.room, msg);
    io.to(user.room).emit("code-snippet", msg);
  });

  // DISCONNECT
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

// ===== HELPERS =====

function now() {
  return new Date().toLocaleTimeString();
}

function createSystemMsg(text) {
  return { type: "system", text, time: now() };
}

function saveMessage(room, msg) {
  if (!rooms[room]) return;

  rooms[room].messages.push(msg);
  if (rooms[room].messages.length > 20) {
    rooms[room].messages.shift();
  }
}