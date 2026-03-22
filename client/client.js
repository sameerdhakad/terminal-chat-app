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

// HELP
function showHelp() {
  console.log(chalk.cyan("\nCommands:\n"));
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
  console.log(chalk.green("Connected"));

  rl.question("Enter username: ", (name) => {
    username = name;
    showHelp();
    rl.setPrompt("> ");
    rl.prompt();
  });
});

// INPUT
rl.on("line", (input) => {

  if (isCodeMode) {
    if (input === "END") {
      socket.emit("code-snippet", {
        language,
        content: codeBuffer.join("\n")
      });
      isCodeMode = false;
      codeBuffer = [];
    } else {
      codeBuffer.push(input);
    }
    rl.prompt();
    return;
  }

  if (input.startsWith("/join")) {
    room = input.split(" ")[1];
    socket.emit("join", { username, room });
  }

  else if (input === "/users") {
    socket.emit("get-users");
  }

  else if (input === "/rooms") {
    socket.emit("get-rooms");
  }

  else if (input.startsWith("/delete")) {
    const r = input.split(" ")[1];
    socket.emit("delete-room", r);
  }

  else if (input.startsWith("/msg")) {
    const parts = input.split(" ");
    socket.emit("private-message", {
      to: parts[1],
      message: parts.slice(2).join(" ")
    });
  }

  else if (input.startsWith("/code")) {
    language = input.split(" ")[1] || "text";
    console.log("Enter code (END to finish):");
    isCodeMode = true;
  }

  else if (input === "/clear") {
    console.clear();
  }

  else if (input === "/exit") {
    process.exit(0);
  }

  else {
    socket.emit("send-message", input);
  }

  rl.prompt();
});

// RECEIVE

socket.on("message", (msg) => {
  console.log(chalk.gray(msg));
  rl.prompt();
});

socket.on("users-list", (users) => {
  console.log(chalk.yellow("\nUsers:"));
  users.forEach(u => console.log("- " + u));
  rl.prompt();
});

socket.on("rooms-list", (rooms) => {
  console.log(chalk.cyan("\nRooms:"));
  rooms.forEach(r => console.log("- " + r));
  rl.prompt();
});

socket.on("history", (messages) => {
  console.log(chalk.magenta("\nLast Messages:\n"));
  messages.forEach(m => console.log(m));
});

socket.on("private-message", (msg) => {
  console.log(chalk.red("[PRIVATE] " + msg));
  rl.prompt();
});

socket.on("code-snippet", (data) => {
  console.log(`\n${data.username} shared code:\n`);
  console.log(chalk.green(data.content));
  rl.prompt();
});