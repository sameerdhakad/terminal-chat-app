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

// 🕒 Time
function getTime() {
  return new Date().toLocaleTimeString();
}

// 🎯 HELP COMMAND
function showHelp() {
  console.log(chalk.cyan("\n📌 Available Commands:\n"));
  console.log(chalk.yellow("/join <room>") + " → Join a room");
  console.log(chalk.yellow("/users") + " → Show active users");
  console.log(chalk.yellow("/msg <user> <msg>") + " → Private message");
  console.log(chalk.yellow("/code <lang>") + " → Share code snippet");
  console.log(chalk.yellow("/help") + " → Show commands\n");
}

// ================= CONNECT =================

socket.on("connect", () => {
  console.log(chalk.green("✅ Connected to server"));

  rl.question(chalk.green("Enter your username: "), (name) => {
    username = name;

    showHelp();

    rl.setPrompt(chalk.blue("> "));
    rl.prompt();
  });
});

// ================= INPUT =================

rl.on("line", (input) => {

  // 🔥 CODE MODE
  if (isCodeMode) {
    if (input.trim() === "END") {
      socket.emit("code-snippet", {
        language,
        content: codeBuffer.join("\n")
      });

      console.log(chalk.green("✅ Code sent"));

      isCodeMode = false;
      codeBuffer = [];
      language = "";
    } else {
      codeBuffer.push(input);
    }

    rl.prompt();
    return;
  }

  // HELP
  if (input === "/help") {
    showHelp();
  }

  // JOIN
  else if (input.startsWith("/join")) {
    const newRoom = input.split(" ")[1];

    if (!newRoom) {
      console.log(chalk.red("❌ Provide room name"));
    } else {
      room = newRoom;
      socket.emit("join", { username, room });
      console.log(chalk.green(`✅ Joined ${room}`));
    }
  }

  // USERS
  else if (input === "/users") {
    if (!room) {
      console.log(chalk.red("❌ Join a room first"));
    } else {
      socket.emit("get-users");
    }
  }

  // PRIVATE MESSAGE
  else if (input.startsWith("/msg")) {
    if (!room) {
      console.log(chalk.red("❌ Join a room first"));
    } else {
      const parts = input.split(" ");
      const to = parts[1];
      const message = parts.slice(2).join(" ");

      if (!to || !message) {
        console.log(chalk.red("❌ Usage: /msg username message"));
      } else {
        socket.emit("private-message", { to, message });
      }
    }
  }

  // CODE SNIPPET
  else if (input.startsWith("/code")) {
    if (!room) {
      console.log(chalk.red("❌ Join a room first"));
    } else {
      language = input.split(" ")[1] || "text";

      console.log(
        chalk.cyan(`\nEnter your ${language} code (type END to send):\n`)
      );

      isCodeMode = true;
      codeBuffer = [];
    }
  }

  // NORMAL MESSAGE
  else {
    if (!room) {
      console.log(chalk.red("❌ Join a room first"));
    } else {
      socket.emit("send-message", input);
    }
  }

  rl.prompt();
});

// ================= RECEIVE =================

// MESSAGE
socket.on("message", (msg) => {
  console.log(
    "\n" +
      chalk.gray(`[${getTime()}]`) +
      " " +
      chalk.white(msg)
  );
  rl.prompt();
});

// USERS
socket.on("users-list", (users) => {
  console.log(
    "\n" +
      chalk.cyan("👥 Active users:\n") +
      users.map(u => chalk.yellow("- " + u)).join("\n")
  );
  rl.prompt();
});

// PRIVATE
socket.on("private-message", (msg) => {
  console.log(
    "\n" +
      chalk.magenta(`[PRIVATE] ${msg}`)
  );
  rl.prompt();
});

// CODE SNIPPET
socket.on("code-snippet", (data) => {
  console.log(
    "\n" +
      chalk.green(`[${getTime()}] ${data.username} shared ${data.language} code:\n`)
  );

  console.log(chalk.yellow(data.content));
  rl.prompt();
});