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
let codeMode = false;
let buffer = [];
let lang = "";

// ===== UI =====

function banner() {
  console.clear();
  console.log(chalk.cyan.bold("\n⚡ Terminal Chat CLI ⚡\n"));
}

function help() {
  console.log(chalk.yellow("\nCommands:\n"));
  console.log("/join <room>     → Join room");
  console.log("/leave           → Leave room");
  console.log("/users           → Show users");
  console.log("/rooms           → Show rooms");
  console.log("/delete <room>   → Delete room");
  console.log("/msg <user> <m>  → Private msg");
  console.log("/code <lang>     → Share code");
  console.log("/clear           → Clear screen");
  console.log("/exit            → Exit\n");
}

// ===== CONNECT =====

socket.on("connect", () => {
  banner();

  rl.question(chalk.green("Username: "), (name) => {
    username = name.trim();

    if (!username) {
      console.log(chalk.red("Username cannot be empty"));
      process.exit(0);
    }

    help();
    rl.setPrompt(chalk.blue("> "));
    rl.prompt();
  });
});

// ===== INPUT =====

rl.on("line", (input) => {

  input = input.trim();

  // ===== CODE MODE =====
  if (codeMode) {
    if (input === "END") {
      socket.emit("code-snippet", {
        language: lang,
        content: buffer.join("\n")
      });

      console.log(chalk.green("✅ Code sent\n"));

      codeMode = false;
      buffer = [];
    } else {
      buffer.push(input);
    }

    rl.prompt();
    return;
  }

  // ===== JOIN =====
  if (input.startsWith("/join")) {
    const newRoom = input.split(" ")[1];

    if (!newRoom) {
      console.log(chalk.red("Provide room name"));
    } else {
      room = newRoom;
      socket.emit("join", { username, room });
      console.log(chalk.green(`Joined ${room}`));
    }
  }

  // ===== LEAVE =====
  else if (input === "/leave") {
    if (!room) {
      console.log(chalk.red("Not in any room"));
    } else {
      socket.emit("leave-room");
      console.log(chalk.yellow(`Left ${room}`));
      room = "";
    }
  }

  // ===== USERS =====
  else if (input === "/users") {
    if (!room) {
      console.log(chalk.red("Join a room first"));
    } else {
      socket.emit("get-users");
    }
  }

  // ===== ROOMS =====
  else if (input === "/rooms") {
    socket.emit("get-rooms");
  }

  // ===== DELETE =====
  else if (input.startsWith("/delete")) {
    const r = input.split(" ")[1];

    if (!r) {
      console.log(chalk.red("Provide room name"));
    } else {
      socket.emit("delete-room", r);
    }
  }

  // ===== PRIVATE =====
  else if (input.startsWith("/msg")) {
    const parts = input.split(" ");
    const to = parts[1];
    const message = parts.slice(2).join(" ");

    if (!to || !message) {
      console.log(chalk.red("Usage: /msg user message"));
    } else {
      socket.emit("private-message", { to, message });
    }
  }

  // ===== CODE =====
  else if (input.startsWith("/code")) {
    if (!room) {
      console.log(chalk.red("Join a room first"));
    } else {
      lang = input.split(" ")[1] || "text";
      console.log(chalk.magenta("\nPaste code (END to send)\n"));
      codeMode = true;
      buffer = [];
    }
  }

  // ===== CLEAR =====
  else if (input === "/clear") {
    banner();
  }

  // ===== EXIT =====
  else if (input === "/exit") {
    console.log(chalk.red("👋 Exiting..."));
    process.exit(0);
  }

  // ===== NORMAL MESSAGE =====
  else {
    if (!room) {
      console.log(chalk.red("Join a room first"));
    } else {
      socket.emit("send-message", input);
    }
  }

  rl.prompt();
});

// ===== RECEIVE =====

socket.on("history", (msgs) => {
  if (!msgs.length) return;

  console.log(chalk.gray("\n--- Last Messages ---\n"));
  msgs.forEach(render);
});

socket.on("message", render);

socket.on("users-list", (users) => {
  console.log(chalk.cyan("\nUsers:"));
  users.forEach(u => console.log("- " + u));
});

socket.on("rooms-list", (rooms) => {
  console.log(chalk.green("\nRooms:"));
  rooms.forEach(r => console.log("- " + r));
});

socket.on("private-message", (msg) => {
  console.log(chalk.red(`\n[PRIVATE ${msg.time}] ${msg.from}: ${msg.text}`));
});

socket.on("code-snippet", render);

// ===== RENDER =====

function render(m) {

  if (!m) return;

  if (m.type === "system") {
    console.log(chalk.gray(`[${m.time}] ${m.text}`));
  }

  else if (m.type === "chat") {
    console.log(
      chalk.blue(`[${m.time}]`) +
      " " +
      chalk.yellow(m.user + ":") +
      " " +
      chalk.white(m.text)
    );
  }

  else if (m.type === "code") {
    console.log(
      chalk.green(`\n[${m.time}] ${m.user} shared ${m.language} code:\n`)
    );
    console.log(chalk.yellow(m.content));
  }
}