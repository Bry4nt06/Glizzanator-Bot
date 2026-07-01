const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..", "..");
const configPath = path.join(__dirname, "card-studio.config.json");

function readConfig() {
    try {
        return JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch (error) {
        console.warn("Could not read Card Studio config. Using defaults.", error.message);
        return {};
    }
}

function openConfig(config) {
    if (config.autoOpenConfig === false) return;

    const editorCommand = config.editorCommand || "code";
    const child = spawn(editorCommand, [configPath], {
        cwd: projectRoot,
        stdio: "ignore"
    });

    child.on("error", () => {
        console.warn(`Could not open config with ${editorCommand}. Open manually: ${configPath}`);
    });

    child.unref();
}

function main() {
    const config = readConfig();
    const port = Number(process.env.CARD_STUDIO_PORT || config.port || 3001);
    const url = `http://localhost:${port}`;

    openConfig(config);

    console.log("Starting Glizzanator Card Studio...");
    console.log(`Config: ${path.relative(projectRoot, configPath)}`);
    console.log(`Open: ${url}`);
    console.log("Press Ctrl+C to stop.\n");

    const server = spawn(process.execPath, [path.join(__dirname, "server.js")], {
        cwd: projectRoot,
        stdio: "inherit",
        env: {
            ...process.env,
            CARD_STUDIO_PORT: String(port)
        }
    });

    server.on("exit", (code) => {
        process.exit(code || 0);
    });
}

main();
