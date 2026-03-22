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

// HELP (NOW ACTUALLY USEFUL)
function showHelp() {
  console.log(chalk.cyan("\n🚀 Commands:\n"));
  console.log(chalk.yellow("/create <room>") + " → Create & join room");
  console.log(chalk.yellow("/join <room>") + " → Join room");
  console.log(chalk.yellow("/leave") + " → Leave room");
  console.log(chalk.yellow("/users") + " → Show users");
  console.log(chalk.yellow("/msg <user> <msg>") + " → Private message");
  console.log(chalk.yellow("/code <lang>") + " → Share code");
  console.log(chalk.yellow("/clear") + " → Clear screen");
  console.log(chalk.yellow("/exit") + " → Exit app");
  console.log(chalk.yellow("/help") + " → Show commands\n");
}

// CONNECT
socket.on("connect", () => {
  console.log(chalk.green("✅ Connected"));

  rl.question(chalk.green("Enter username: "), (name) => {
    username = name;
    showHelp();
    rl.setPrompt(chalk.blue("> "));
    rl.prompt();
  });
});

// INPUT
rl.on("line", (input) => {

  // CODE MODE
  if (isCodeMode) {
    if (input.trim() === "END") {
      socket.emit("code-snippet", {
        language,
        content: codeBuffer.join("\n")
      });

      console.log(chalk.green("✅ Code sent"));

      isCodeMode = false;
      codeBuffer = [];
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

  // CREATE ROOM
  else if (input.startsWith("/create")) {
    const newRoom = input.split(" ")[1];
    if (!newRoom) {
      console.log(chalk.red("❌ Provide room name"));
    } else {
      room = newRoom;
      socket.emit("join", { username, room });
      console.log(chalk.green(`✅ Created & joined ${room}`));
    }
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

  // LEAVE
  else if (input === "/leave") {
    if (!room) {
      console.log(chalk.red("❌ Not in any room"));
    } else {
      console.log(chalk.yellow(`Left ${room}`));
      room = "";
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

  // PRIVATE
  else if (input.startsWith("/msg")) {
    if (!room) {
      console.log(chalk.red("❌ Join room first"));
    } else {
      const parts = input.split(" ");
      const to = parts[1];
      const message = parts.slice(2).join(" ");

      if (!to || !message) {
        console.log(chalk.red("❌ Usage: /msg user message"));
      } else {
        socket.emit("private-message", { to, message });
      }
    }
  }

  // CODE
  else if (input.startsWith("/code")) {
    if (!room) {
      console.log(chalk.red("❌ Join a room first"));
    } else {
      language = input.split(" ")[1] || "text";
      console.log(chalk.cyan("\nEnter code (END to finish):\n"));
      isCodeMode = true;
      codeBuffer = [];
    }
  }

  // CLEAR
  else if (input === "/clear") {
    console.clear();
  }

  // EXIT
  else if (input === "/exit") {
    console.log(chalk.red("👋 Exiting..."));
    process.exit(0);
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

// RECEIVE

socket.on("message", (msg) => {
  console.log("\n" + chalk.gray(`[${getTime()}] `) + chalk.white(msg));
  rl.prompt();
});

socket.on("users-list", (users) => {
  console.log("\n" + chalk.cyan("👥 Users:\n"));
  users.forEach(u => console.log(chalk.yellow("- " + u)));
  rl.prompt();
});

socket.on("private-message", (msg) => {
  console.log("\n" + chalk.magenta(`[PRIVATE] ${msg}`));
  rl.prompt();
});

socket.on("code-snippet", (data) => {
  console.log(
    "\n" +
      chalk.green(`[${getTime()}] ${data.username} shared ${data.language} code:\n`)
  );
  console.log(chalk.yellow(data.content));
  rl.prompt();
});