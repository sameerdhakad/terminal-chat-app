const io = require("socket.io")(3000, {
  cors: { origin: "*" }
});

let users = {};
let rooms = {};

// JOIN
io.on("connection", (socket) => {

  socket.on("join", ({ username, room }) => {

    users[socket.id] = { username, room };

    // create room if not exists
    if (!rooms[room]) {
      rooms[room] = {
        users: [],
        messages: []
      };
    }

    rooms[room].users.push(username);

    socket.join(room);

    // 🔥 SEND HISTORY
    socket.emit("history", rooms[room].messages);

    socket.to(room).emit("message", `${username} joined ${room}`);
  });

  // MESSAGE
  socket.on("send-message", (message) => {
    const user = users[socket.id];
    if (!user) return;

    const msg = `${user.username}: ${message}`;

    // store last 20
    rooms[user.room].messages.push(msg);
    if (rooms[user.room].messages.length > 20) {
      rooms[user.room].messages.shift();
    }

    io.to(user.room).emit("message", msg);
  });

  // USERS
  socket.on("get-users", () => {
    const user = users[socket.id];
    if (!user) return;

    socket.emit("users-list", rooms[user.room].users);
  });

  // PRIVATE
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

  // CODE
  socket.on("code-snippet", ({ language, content }) => {
    const user = users[socket.id];
    if (!user) return;

    io.to(user.room).emit("code-snippet", {
      username: user.username,
      language,
      content
    });
  });

  // 🔥 GET ROOMS
  socket.on("get-rooms", () => {
    socket.emit("rooms-list", Object.keys(rooms));
  });

  // 🔥 DELETE ROOM
  socket.on("delete-room", (roomName) => {
    if (rooms[roomName] && rooms[roomName].users.length === 0) {
      delete rooms[roomName];
      socket.emit("message", `Room ${roomName} deleted`);
    } else {
      socket.emit("message", `Room not empty or doesn't exist`);
    }
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