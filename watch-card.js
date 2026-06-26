const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const projectRoot = __dirname;
const cardPathArg = process.argv[2];

if (!cardPathArg) {
  console.error("❌ Please provide a card file path.");
  console.log("Example:");
  console.log("node watch-card.js cards/serverCard.js");
  process.exit(1);
}

const watchedFiles = [
  "preview-card.js",
  cardPathArg,
  "assets"
];

let running = false;
let pending = false;

function runPreview(reason = "initial build") {
  if (running) {
    pending = true;
    return;
  }

  running = true;

  console.clear();
  console.log("=================================");
  console.log(" Dynamic Card Preview Watcher ");
  console.log("=================================");
  console.log(`Card: ${cardPathArg}`);
  console.log(`Change detected: ${reason}`);
  console.log("Regenerating preview...\n");

  const child = spawn(process.execPath, ["preview-card.js", cardPathArg], {
    cwd: projectRoot,
    stdio: "inherit",
    shell: false
  });

  child.on("close", (code) => {
    running = false;

    if (code === 0) {
      console.log("\n✅ Preview updated.");
      console.log("Watching for changes... Press Ctrl+C to stop.\n");
    } else {
      console.log(`\n❌ Preview failed with exit code ${code}`);
      console.log("Fix the error, save again, and it will retry.\n");
    }

    if (pending) {
      pending = false;
      runPreview("queued save");
    }
  });
}

for (const relPath of watchedFiles) {
  const fullPath = path.join(projectRoot, relPath);

  if (!fs.existsSync(fullPath)) {
    console.warn(`Skipping missing watch target: ${relPath}`);
    continue;
  }

  const stat = fs.statSync(fullPath);

  if (stat.isDirectory()) {
    fs.watchFile(fullPath, { interval: 500 }, () => {
      runPreview(relPath);
    });
  } else {
    fs.watchFile(fullPath, { interval: 300 }, () => {
      runPreview(relPath);
    });
  }
}

runPreview();