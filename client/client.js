const io = require("socket.io-client");
const readline = require("readline");
const chalk = require("chalk");

const socket = io("http://localhost:3000");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let username = "";
let room = "";

// Get current time
function getTime() {
  const now = new Date();
  return now.toLocaleTimeString();
}

// Step 1: username
rl.question(chalk.green("Enter your username: "), (name) => {
  username = name;

  console.log(chalk.yellow("Type /join roomName to enter a room"));

  rl.setPrompt(chalk.blue("> "));
  rl.prompt();

  rl.on("line", (input) => {
    if (input.startsWith("/join")) {
      room = input.split(" ")[1];

      if (!room) {
        console.log(chalk.red("Please provide a room name"));
      } else {
        socket.emit("join", { username, room });
        console.log(chalk.green(`Joined room: ${room}`));
      }
    } else {
      if (!room) {
        console.log(chalk.red("Join a room first using /join roomName"));
      } else {
        socket.emit("send-message", input);
      }
    }

    rl.prompt();
  });
});

// Listen for messages
socket.on("message", (message) => {
  console.log(
    "\n" +
      chalk.gray(`[${getTime()}]`) +
      " " +
      chalk.white(message)
  );
  rl.prompt();
});