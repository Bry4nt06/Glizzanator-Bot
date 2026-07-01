const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const ignoredDirectories = new Set([".git", "node_modules"]);
const jsFiles = [];

function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (ignoredDirectories.has(entry.name)) continue;

        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            walk(fullPath);
            continue;
        }

        if (entry.isFile() && entry.name.endsWith(".js")) {
            jsFiles.push(fullPath);
        }
    }
}

walk(root);

for (const file of jsFiles) {
    require("node:child_process").execFileSync(process.execPath, ["--check", file], {
        stdio: "inherit"
    });
}

console.log(`Checked ${jsFiles.length} JavaScript files successfully.`);
