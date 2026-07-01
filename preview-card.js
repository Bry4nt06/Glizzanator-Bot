const { spawn } = require("child_process");
const path = require("path");

console.log("Card preview has moved to Glizzanator Card Studio.");
console.log("Starting: npm run studio\n");

const child = spawn(process.execPath, [path.join(__dirname, "dev", "card-studio", "server.js")], {
    cwd: __dirname,
    stdio: "inherit"
});

child.on("exit", (code) => process.exit(code || 0));
