#!/usr/bin/env node

const io = require("socket.io-client");
const readline = require("readline");
const chalk = require("chalk");

const socket = io("https://terminal-chat-app-o159.onrender.com" , {
     reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000
});



socket.on("connect", () => {
  console.log("✅ Connected to server");
});

socket.on("disconnect", () => {
  console.log("⚠️ Disconnected from server...");
});

socket.on("reconnect", () => {
  console.log("🔄 Reconnected!");
  
  // 🔥 IMPORTANT: rejoin room
  if (username && room) {
    socket.emit("join", { username, room });
    console.log(`Rejoined room: ${room}`);
  }
});

socket.on("connect_error", () => {
  console.log("❌ Trying to reconnect...");
});


const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let username = "";
let room = "";

// Time
function getTime() {
  return new Date().toLocaleTimeString();
}

// START
rl.question(chalk.green("Enter your username: "), (name) => {
  username = name;

  console.log(chalk.yellow("Commands:"));
  console.log(chalk.yellow("/join roomName"));
  console.log(chalk.yellow("/users"));
  console.log(chalk.yellow("/msg username message"));

  rl.setPrompt(chalk.blue("> "));
  rl.prompt();

  rl.on("line", (input) => {

    // JOIN ROOM
    if (input.startsWith("/join")) {
      room = input.split(" ")[1];

      if (!room) {
        console.log(chalk.red("Provide room name"));
      } else {
        socket.emit("join", { username, room });
        console.log(chalk.green(`Joined ${room}`));
      }
    }

    // 🔥 USERS LIST
    else if (input === "/users") {
      if (!room) {
        console.log(chalk.red("Join room first"));
      } else {
        socket.emit("get-users");
      }
    }

    // 🔥 PRIVATE MESSAGE
    else if (input.startsWith("/msg")) {
      const parts = input.split(" ");
      const to = parts[1];
      const message = parts.slice(2).join(" ");

      if (!to || !message) {
        console.log(chalk.red("Usage: /msg username message"));
      } else {
        socket.emit("private-message", { to, message });
      }
    }

    // NORMAL MESSAGE
    else {
      if (!room) {
        console.log(chalk.red("Join room first"));
      } else {
        socket.emit("send-message", input);
      }
    }

    rl.prompt();
  });
});

// RECEIVE NORMAL MESSAGE
socket.on("message", (message) => {
  console.log(
    "\n" +
      chalk.gray(`[${getTime()}]`) +
      " " +
      chalk.white(message)
  );
  rl.prompt();
});

// 🔥 RECEIVE USERS LIST
socket.on("users-list", (users) => {
  console.log(
    "\n" +
      chalk.cyan("Active users:\n") +
      users.map(u => "- " + u).join("\n")
  );
  rl.prompt();
});

// 🔥 RECEIVE PRIVATE MESSAGE
socket.on("private-message", (message) => {
  console.log(
    "\n" +
      chalk.magenta(`[PRIVATE] ${message}`)
  );
  rl.prompt();
});