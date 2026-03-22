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

// 🔥 CODE MODE
let isWritingCode = false;
let codeBuffer = [];
let currentLanguage = "";

// TIME
function getTime() {
  return new Date().toLocaleTimeString();
}

// ================= CONNECTION =================

socket.on("connect", () => {
  console.log("✅ Connected");

  if (!username) {
    rl.question(chalk.green("Enter your username: "), (name) => {
      username = name;

      console.log(chalk.yellow("Commands:"));
      console.log("/join room");
      console.log("/users");
      console.log("/msg user msg");
      console.log("/code lang");

      rl.setPrompt("> ");
      rl.prompt();
    });
  }
});

socket.on("disconnect", () => {
  console.log("⚠️ Disconnected...");
});

socket.on("reconnect", () => {
  console.log("🔄 Reconnected");

  if (username && room) {
    socket.emit("join", { username, room });
  }
});

// ================= INPUT =================

rl.on("line", (input) => {

  // 🔥 CODE MODE
  if (isWritingCode) {
    if (input.trim() === "END") {
      socket.emit("code-snippet", {
        language: currentLanguage,
        content: codeBuffer.join("\n")
      });

      console.log("✅ Code sent");

      isWritingCode = false;
      codeBuffer = [];
      currentLanguage = "";
    } else {
      codeBuffer.push(input);
    }

    rl.prompt();
    return;
  }

  // JOIN
  if (input.startsWith("/join")) {
    room = input.split(" ")[1];

    socket.emit("join", { username, room });
    console.log(`Joined ${room}`);
  }

  // USERS
  else if (input === "/users") {
    socket.emit("get-users");
  }

  // PRIVATE
  else if (input.startsWith("/msg")) {
    const parts = input.split(" ");
    const to = parts[1];
    const message = parts.slice(2).join(" ");

    socket.emit("private-message", { to, message });
  }

  // 🔥 START CODE MODE
  else if (input.startsWith("/code")) {
    currentLanguage = input.split(" ")[1] || "text";

    console.log(`Enter ${currentLanguage} code (END to finish):`);
    isWritingCode = true;
    codeBuffer = [];
  }

  // NORMAL
  else {
    socket.emit("send-message", input);
  }

  rl.prompt();
});

// ================= RECEIVE =================

// MESSAGE
socket.on("message", (msg) => {
  console.log(`\n[${getTime()}] ${msg}`);
  rl.prompt();
});

// USERS
socket.off("users-list");
socket.on("users-list", (users) => {
  console.log("\nActive users:");
  users.forEach(u => console.log("- " + u));
  rl.prompt();
});

// PRIVATE
socket.off("private-message");
socket.on("private-message", (msg) => {
  console.log(`\n[PRIVATE] ${msg}`);
  rl.prompt();
});

// 🔥 CODE SNIPPET
socket.off("code-snippet");
socket.on("code-snippet", (data) => {
  console.log(
    `\n[${getTime()}] ${data.username} shared ${data.language} code:\n`
  );

  console.log(chalk.yellow(data.content));
  rl.prompt();
});