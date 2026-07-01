const fs = require("fs");
const path = require("path");

const studioRoot = __dirname;
const projectRoot = path.resolve(studioRoot, "..", "..");
const configPath = path.join(studioRoot, "card-studio.config.json");

function readJson(filePath, fallback = {}) {
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {
        return fallback;
    }
}

function writeJson(filePath, data) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function loadStudioConfig() {
    return {
        port: 3001,
        defaultCard: "server",
        outputDir: "preview-output",
        cards: {},
        watch: ["cards", "assets", "dev/card-studio"],
        ...readJson(configPath, {})
    };
}

function resolveProjectPath(relativePath) {
    return path.resolve(projectRoot, relativePath);
}

function getOutputDir(config = loadStudioConfig()) {
    return resolveProjectPath(config.outputDir || "preview-output");
}

function getEnabledCards(config = loadStudioConfig()) {
    const cards = {};

    for (const [key, card] of Object.entries(config.cards || {})) {
        if (card.enabled === false) continue;

        cards[key] = {
            ...card,
            key,
            modulePath: resolveProjectPath(card.modulePath),
            outputName: card.outputName || `${key}-card-studio.png`,
            layoutPath: card.layoutPath ? resolveProjectPath(card.layoutPath) : null
        };
    }

    return cards;
}

module.exports = {
    configPath,
    getEnabledCards,
    getOutputDir,
    loadStudioConfig,
    projectRoot,
    readJson,
    resolveProjectPath,
    studioRoot,
    writeJson
};
