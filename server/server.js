const io = require("socket.io")(3000, {
  cors: { origin: "*" }
});

let users = {};
let rooms = {};

io.on("connection", (socket) => {

  // ===== JOIN =====
  socket.on("join", ({ username, room }) => {

    if (!username || !room) return;

    users[socket.id] = { username, room };

    if (!rooms[room]) {
      rooms[room] = { messages: [] };
    }

    socket.join(room);

    // send history safely
    socket.emit("history", rooms[room].messages || []);

    const msg = system(`${username} joined ${room}`);
    save(room, msg);

    socket.to(room).emit("message", msg);
  });

  // ===== MESSAGE =====
  socket.on("send-message", (text) => {
    const user = users[socket.id];
    if (!user || !user.room) return;

    const msg = {
      type: "chat",
      user: user.username,
      text,
      time: now()
    };

    save(user.room, msg);
    io.to(user.room).emit("message", msg);
  });

  // ===== USERS =====
  socket.on("get-users", () => {
    const user = users[socket.id];
    if (!user || !user.room) return;

    const room = io.sockets.adapter.rooms.get(user.room);

    let list = [];

    if (room) {
      list = Array.from(room).map(id => users[id]?.username).filter(Boolean);
    }

    socket.emit("users-list", list);
  });

  // ===== ROOMS =====
  socket.on("get-rooms", () => {
    socket.emit("rooms-list", Object.keys(rooms));
  });

  // ===== DELETE ROOM (FIXED) =====
  socket.on("delete-room", (roomName) => {

    if (!roomName) {
      socket.emit("message", system("Provide room name"));
      return;
    }

    const room = io.sockets.adapter.rooms.get(roomName);

    if (room && room.size > 0) {
      socket.emit("message", system("❌ Room is not empty"));
      return;
    }

    delete rooms[roomName];

    socket.emit("message", system(`✅ Room '${roomName}' deleted`));
  });

  // ===== LEAVE =====
  socket.on("leave-room", () => {
    const user = users[socket.id];
    if (!user || !user.room) return;

    socket.leave(user.room);
    users[socket.id].room = null;

    socket.emit("message", system("👋 Left room"));
  });

  // ===== PRIVATE =====
  socket.on("private-message", ({ to, message }) => {
    const sender = users[socket.id];
    if (!sender) return;

    const targetId = Object.keys(users).find(
      id => users[id].username === to
    );

    if (targetId) {
      io.to(targetId).emit("private-message", {
        from: sender.username,
        text: message,
        time: now()
      });
    }
  });

  // ===== CODE =====
  socket.on("code-snippet", ({ language, content }) => {
    const user = users[socket.id];
    if (!user || !user.room) return;

    const msg = {
      type: "code",
      user: user.username,
      language,
      content,
      time: now()
    };

    save(user.room, msg);
    io.to(user.room).emit("code-snippet", msg);
  });

  // ===== DISCONNECT =====
  socket.on("disconnect", () => {
    delete users[socket.id];
  });

});


// ===== HELPERS =====

function now() {
  return new Date().toLocaleTimeString();
}

function system(text) {
  return {
    type: "system",
    text,
    time: now()
  };
}

function save(room, msg) {
  if (!rooms[room]) return;

  rooms[room].messages.push(msg);

  if (rooms[room].messages.length > 20) {
    rooms[room].messages.shift();
  }
}