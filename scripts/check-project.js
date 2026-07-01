const fs = require("fs");
const path = require("path");
const childProcess = require("node:child_process");

const root = path.resolve(__dirname, "..");
const ignoredDirectories = new Set([".git", "node_modules"]);
const jsFiles = [];

const requiredPaths = [
    "database/connection.js",
    "database/helpers.js",
    "database/migrations/001_initial.js",
    "database/migrations/002_indexes.js",
    "database/migrations/index.js",
    "database/migrations/migrationRunner.js",
    "database/repositories/MessageRepository.js",
    "database/repositories/StatusRepository.js",
    "database/repositories/StreamRepository.js",
    "database/repositories/VoiceRepository.js",
    "services/ActivityRecoveryService.js",
    "services/DatabaseService.js",
    "services/MessageTrackingService.js",
    "services/StreamTrackingService.js",
    "services/VoiceTrackingService.js",
    "services/index.js",
    "scripts/doctor.js"
];

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

function checkSyntax() {
    for (const file of jsFiles) {
        childProcess.execFileSync(process.execPath, ["--check", file], {
            stdio: "inherit"
        });
    }

    console.log(`Checked ${jsFiles.length} JavaScript files successfully.`);
}

function checkRequiredFiles() {
    const missing = requiredPaths.filter((relativePath) => {
        return !fs.existsSync(path.join(root, relativePath));
    });

    if (missing.length) {
        console.error("Missing required project files:");
        for (const relativePath of missing) {
            console.error(`- ${relativePath}`);
        }
        process.exit(1);
    }

    console.log(`Architecture files present: ${requiredPaths.length}`);
}

function checkLegacySchemaRemoved() {
    const schemaPath = path.join(root, "database", "schema.js");

    if (fs.existsSync(schemaPath)) {
        console.error("Legacy database/schema.js still exists. Use migrations instead.");
        process.exit(1);
    }

    console.log("Legacy schema module removed.");
}

walk(root);
checkSyntax();
checkRequiredFiles();
checkLegacySchemaRemoved();
