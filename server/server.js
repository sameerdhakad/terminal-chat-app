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
    rooms[room] = { messages: [] };
  }

  socket.join(room);

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

  const room = io.sockets.adapter.rooms.get(roomName);

  // if room exists and has users → block delete
  if (room && room.size > 0) {
    socket.emit("message", createSystemMsg("❌ Room is not empty"));
    return;
  }

  // delete from memory
  if (rooms[roomName]) {
    delete rooms[roomName];
  }

  socket.emit("message", createSystemMsg(`✅ Room '${roomName}' deleted`));
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

  const { username, room } = user;

  if (room && rooms[room]) {
    rooms[room].users = rooms[room].users.filter(
      u => u !== username
    );
  }

  delete users[socket.id];
});

});



socket.on("leave-room", () => {
  const user = users[socket.id];
  if (!user || !user.room) return;

  const roomName = user.room;

  socket.leave(roomName);

  users[socket.id].room = null;

  socket.emit("message", createSystemMsg(`👋 Left ${roomName}`));
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