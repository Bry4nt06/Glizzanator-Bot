const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

const REQUIRED_FILES = [
    "package.json",
    ".env.example",
    "index.js",
    "deploy-commands.js",
    "config/index.js",
    "commands/definitions.js",
    "commands/registry.js",
    "database.js",
    "database/helpers.js",
    "stats/serverStats.js",
    "cards/serverCard.js",
    "cards/welcomeCard.js"
];

const REQUIRED_ASSETS = [
    "assets/Card Logo.png",
    "assets/CardBG.png",
    "assets/Crown.png",
    "assets/LittlePorker.png",
    "assets/monster-hotdog.png",
    "assets/welcome_template.png"
];

const REQUIRED_ENV_KEYS = [
    "DISCORD_TOKEN",
    "CLIENT_ID",
    "GUILD_ID",
    "RAWG_API_KEY"
];

const LOCAL_DATABASE_FILES = [
    "glizzanator.db",
    "glizzanator.db-shm",
    "glizzanator.db-wal"
];

function exists(relativePath) {
    return fs.existsSync(path.join(ROOT, relativePath));
}

function checkFileList(label, files) {
    const missing = files.filter((file) => !exists(file));

    if (!missing.length) {
        return {
            label,
            ok: true,
            message: `${label}: all required files found.`
        };
    }

    return {
        label,
        ok: false,
        message: `${label}: missing ${missing.join(", ")}`
    };
}

function readTextFile(relativePath) {
    const filePath = path.join(ROOT, relativePath);

    if (!fs.existsSync(filePath)) {
        return "";
    }

    return fs.readFileSync(filePath, "utf8");
}

function checkEnvExample() {
    const content = readTextFile(".env.example");
    const missing = REQUIRED_ENV_KEYS.filter((key) => !content.includes(`${key}=`));

    if (!missing.length) {
        return {
            label: "env-example",
            ok: true,
            message: ".env.example includes required keys."
        };
    }

    return {
        label: "env-example",
        ok: false,
        message: `.env.example is missing ${missing.join(", ")}`
    };
}

function checkLocalEnv() {
    if (!exists(".env")) {
        return {
            label: "local-env",
            ok: false,
            message: "Local .env file not found. Copy .env.example to .env before running the bot."
        };
    }

    return {
        label: "local-env",
        ok: true,
        message: "Local .env file exists."
    };
}

function checkGitIgnore() {
    const content = readTextFile(".gitignore");
    const missing = LOCAL_DATABASE_FILES.filter((file) => !content.includes(file));

    if (!missing.length) {
        return {
            label: "gitignore",
            ok: true,
            message: ".gitignore protects local SQLite database files."
        };
    }

    return {
        label: "gitignore",
        ok: false,
        message: `.gitignore should include ${missing.join(", ")}`
    };
}

function checkLocalDatabase() {
    if (!exists("glizzanator.db")) {
        return {
            label: "database",
            ok: false,
            message: "Local database not found yet. It should be created after the bot starts."
        };
    }

    const stats = fs.statSync(path.join(ROOT, "glizzanator.db"));

    return {
        label: "database",
        ok: true,
        message: `Local database exists (${Math.round(stats.size / 1024)} KB).`
    };
}

function printResult(result) {
    const icon = result.ok ? "OK" : "WARN";
    console.log(`[${icon}] ${result.message}`);
}

function runDoctor() {
    console.log("Glizzanator Doctor");
    console.log("===================");

    const results = [
        checkFileList("project-files", REQUIRED_FILES),
        checkFileList("card-assets", REQUIRED_ASSETS),
        checkEnvExample(),
        checkLocalEnv(),
        checkGitIgnore(),
        checkLocalDatabase()
    ];

    results.forEach(printResult);

    const warnings = results.filter((result) => !result.ok);

    console.log("");

    if (warnings.length) {
        console.log(`Doctor finished with ${warnings.length} warning(s).`);
        process.exitCode = 1;
        return;
    }

    console.log("Doctor finished cleanly.");
}

runDoctor();
