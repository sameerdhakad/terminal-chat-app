#!/usr/bin/env node

const io = require("socket.io-client");
const readline = require("readline");
const chalk = require("chalk");

const socket = io("https://terminal-chat-app-o159.onrender.com");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let username = "";
let room = "";
let isCodeMode = false;
let codeBuffer = [];
let language = "";

// TIME
function getTime() {
  return new Date().toLocaleTimeString();
}

// ================= CONNECT =================

socket.on("connect", () => {
  console.log("✅ Connected");

  rl.question("Enter username: ", (name) => {
    username = name;

    console.log("\nCommands:");
    console.log("/join room");
    console.log("/users");
    console.log("/msg user msg");
    console.log("/code lang\n");

    rl.setPrompt("> ");
    rl.prompt();
  });
});

// ================= INPUT =================

rl.on("line", (input) => {

  // 🔥 CODE MODE
  if (isCodeMode) {
    if (input === "END") {
      socket.emit("code-snippet", {
        language,
        content: codeBuffer.join("\n")
      });

      console.log("✅ Code sent");

      isCodeMode = false;
      codeBuffer = [];
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
    console.log("Joined:", room);
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

  // CODE
  else if (input.startsWith("/code")) {
    language = input.split(" ")[1] || "text";
    console.log("Enter code (END to finish):");
    isCodeMode = true;
    codeBuffer = [];
  }

  // NORMAL
  else {
    socket.emit("send-message", input);
  }

  rl.prompt();
});

// ================= RECEIVE =================

socket.on("message", (msg) => {
  console.log(`\n[${getTime()}] ${msg}`);
  rl.prompt();
});

socket.on("users-list", (users) => {
  console.log("\nActive users:");
  users.forEach(u => console.log("- " + u));
  rl.prompt();
});

socket.on("private-message", (msg) => {
  console.log(`\n[PRIVATE] ${msg}`);
  rl.prompt();
});

socket.on("code-snippet", (data) => {
  console.log(`\n${data.username} shared ${data.language} code:\n`);
  console.log(data.content);
  rl.prompt();
});