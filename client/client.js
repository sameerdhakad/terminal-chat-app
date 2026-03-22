#!/usr/bin/env node

const io = require("socket.io-client");
const readline = require("readline");
const chalk = require("chalk");

const socket = io("https://terminal-chat-app-o159.onrender.com", {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let username = "";
let room = "";

// 🕒 Time
function getTime() {
  return new Date().toLocaleTimeString();
}

// ================= SOCKET EVENTS =================

// ✅ Connected
socket.on("connect", () => {
  console.log("✅ Connected to server");

  // ask username ONLY after connection
  if (!username) {
    rl.question(chalk.green("Enter your username: "), (name) => {
      username = name;

      console.log(chalk.yellow("Commands:"));
      console.log("/join roomName");
      console.log("/users");
      console.log("/msg username message");

      rl.setPrompt(chalk.blue("> "));
      rl.prompt();
    });
  }
});

// ❌ Disconnected
socket.on("disconnect", () => {
  console.log("⚠️ Disconnected from server...");
});

// 🔄 Reconnect
socket.on("reconnect", () => {
  console.log("🔄 Reconnected!");

  if (username && room) {
    socket.emit("join", { username, room });
    console.log(`Rejoined room: ${room}`);
  }
});

// ❌ Error
socket.on("connect_error", () => {
  console.log("❌ Trying to reconnect...");
});

// ================= INPUT HANDLER =================

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

  // USERS
  else if (input === "/users") {
    if (!room) {
      console.log(chalk.red("Join room first"));
    } else {
      socket.emit("get-users");
    }
  }

  // PRIVATE MESSAGE
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

// ================= RECEIVE EVENTS =================

// NORMAL MESSAGE
socket.on("message", (message) => {
  console.log(
    "\n" +
      chalk.gray(`[${getTime()}]`) +
      " " +
      chalk.white(message)
  );
  rl.prompt();
});

// 🔥 USERS LIST (FIXED DUPLICATE ISSUE)
socket.off("users-list");
socket.on("users-list", (users) => {
  console.log(
    "\n" +
      chalk.cyan("Active users:\n") +
      users.map(u => "- " + u).join("\n")
  );
  rl.prompt();
});

// PRIVATE MESSAGE
socket.off("private-message");
socket.on("private-message", (message) => {
  console.log(
    "\n" +
      chalk.magenta(`[PRIVATE] ${message}`)
  );
  rl.prompt();
});