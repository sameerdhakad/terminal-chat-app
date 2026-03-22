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
let buffer = [];
let lang = "";

// HEADER
function banner() {
  console.clear();
  console.log(chalk.cyan.bold("⚡ Terminal Chat CLI ⚡\n"));
}

// HELP
function help() {
  console.log(chalk.yellow("\nCommands:\n"));
  console.log("/join <room>");
  console.log("/leave");
  console.log("/users");
  console.log("/rooms");
  console.log("/delete <room>");
  console.log("/msg <user> <msg>");
  console.log("/code <lang>");
  console.log("/clear");
  console.log("/exit\n");
}

// CONNECT
socket.on("connect", () => {
  banner();
  rl.question(chalk.green("Username: "), (name) => {
    username = name;
    help();
    rl.setPrompt(chalk.blue("> "));
    rl.prompt();
  });
});

// INPUT
rl.on("line", (input) => {

  if (isCodeMode) {
    if (input === "END") {
      socket.emit("code-snippet", {
        language: lang,
        content: buffer.join("\n")
      });
      isCodeMode = false;
      buffer = [];
    } else buffer.push(input);
    rl.prompt();
    return;
  }

  if (input.startsWith("/join")) {
    room = input.split(" ")[1];
    socket.emit("join", { username, room });
  }

  else if (input === "/users") socket.emit("get-users");
  else if (input === "/rooms") socket.emit("get-rooms");
  else if (input.startsWith("/delete")) socket.emit("delete-room", input.split(" ")[1]);

  else if (input.startsWith("/msg")) {
    const parts = input.split(" ");
    socket.emit("private-message", {
      to: parts[1],
      message: parts.slice(2).join(" ")
    });
  }

  else if (input.startsWith("/code")) {
    lang = input.split(" ")[1] || "text";
    console.log(chalk.magenta("\nPaste code (END to send)\n"));
    isCodeMode = true;
  }

  else if (input === "/clear") banner();
  else if (input === "/exit") process.exit(0);
  else socket.emit("send-message", input);

  rl.prompt();
});

// RECEIVE

socket.on("history", (msgs) => {
  console.log(chalk.gray("\n--- Chat History ---\n"));
  msgs.forEach(m => render(m));
});

socket.on("message", (msg) => render(msg));

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

socket.on("code-snippet", (msg) => render(msg));

// RENDER FUNCTION (🔥 CLEAN UI)
function render(m) {
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