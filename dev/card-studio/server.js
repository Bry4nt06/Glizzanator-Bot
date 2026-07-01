const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");
const { getEnabledCards, getOutputDir, loadStudioConfig, readJson, resolveProjectPath, writeJson } = require("./config");
const sampleDataModule = require("./sampleData");

function layoutToStreamOptions(layout = {}) {
    if (!layout.card) return {};

    const avatarSize = Number(layout.avatar?.size || 196);
    const avatarRadius = avatarSize / 2;

    return {
        width: Number(layout.card.width || 900),
        height: Number(layout.card.height || 360),
        colors: {
            backgroundStart: layout.card.backgroundColor || "#180f07",
            backgroundMiddle: "#000000",
            backgroundEnd: "#040402",
            gold: layout.card.accentColor || "#f6c453",
            white: layout.text?.displayName?.color || "#ffffff",
            muted: layout.text?.username?.color || "#d0d4dc",
            pillBackground: layout.infoBoxes?.backgroundColor || "rgba(17, 24, 32, 0.92)",
            pillBorder: layout.infoBoxes?.borderColor || "rgba(255,255,255,0.12)",
            liveRed: layout.live?.badgeColor || "#ef2b2d"
        },
        border: {
            outerX: 18,
            outerY: 18,
            outerRadius: Number(layout.card.cornerRadius || 30),
            outerWidth: Number(layout.card.borderWidth || 5),
            innerX: 28,
            innerY: 28,
            innerRadius: Math.max(0, Number(layout.card.cornerRadius || 30) - 4),
            innerWidth: 2
        },
        avatar: {
            centerX: Number(layout.avatar?.x || 60) + avatarRadius,
            centerY: Number(layout.avatar?.y || 81) + avatarRadius,
            radius: avatarRadius,
            borderWidth: Number(layout.avatar?.borderWidth || 5)
        },
        text: {
            x: Number(layout.text?.username?.x || layout.text?.header?.x || 285),
            maxWidth: Number(layout.text?.maxWidth || 560),
            headerY: Number(layout.text?.header?.y || 60),
            usernameY: Number(layout.text?.username?.y || 104),
            displayNameY: Number(layout.text?.displayName?.y || 154),
            usernameMaxSize: Number(layout.text?.username?.maxSize || 34),
            usernameMinSize: Number(layout.text?.username?.minSize || 16),
            displayNameMaxSize: Number(layout.text?.displayName?.maxSize || 56),
            displayNameMinSize: Number(layout.text?.displayName?.minSize || 24)
        },
        live: {
            enabled: layout.live?.enabled !== false,
            x: Number(layout.live?.x || 285),
            y: Number(layout.live?.y || 74),
            height: 36,
            radius: 10,
            paddingX: Number(layout.live?.paddingX || 14),
            dotRadius: Number(layout.live?.dotSize || 8),
            text: layout.live?.text || "LIVE"
        },
        pills: {
            x: Number(layout.infoBoxes?.x || 285),
            firstY: Number(layout.infoBoxes?.firstY || 185),
            secondY: Number(layout.infoBoxes?.secondY || 242),
            channelWidth: Number(layout.infoBoxes?.channelWidth || 300),
            timeWidth: Number(layout.infoBoxes?.timeWidth || 230),
            channelHeight: Number(layout.infoBoxes?.height || 46),
            timeHeight: Number(layout.infoBoxes?.height || 42),
            radius: 12,
            fontSize: Number(layout.infoBoxes?.fontSize || 22),
            iconColor: layout.infoBoxes?.iconColor || layout.card.accentColor || "#f6c453"
        }
    };
}

const config = loadStudioConfig();
const projectRoot = resolveProjectPath(".");
const publicDir = path.join(__dirname, "public");
const uploadDir = path.join(__dirname, "uploads");
const outputDir = getOutputDir(config);
const defaultPort = Number(process.env.CARD_STUDIO_PORT || config.port || 3001);

let clients = [];
let lastBuild = {
    card: null,
    ok: true,
    message: "Waiting for first render."
};

function getCardDefinitions() {
    const cards = getEnabledCards(loadStudioConfig());

    for (const [key, card] of Object.entries(cards)) {
        card.render = async (cardModule) => {
            delete require.cache[require.resolve("./sampleData")];
            const freshSamples = require("./sampleData").samples;

            if (key === "server") {
                return cardModule.createStatsCard(freshSamples.server);
            }

            if (key === "stream") {
                return cardModule.createStreamProfileCard({
                ...freshSamples.stream,
                options: layoutToStreamOptions(getLayout("stream"))
            });
            }

            throw new Error(`No Studio renderer wired for card: ${key}`);
        };
    }

    return cards;
}

function clearModule(modulePath) {
    try {
        delete require.cache[require.resolve(modulePath)];
    } catch {
        // Module may not be loaded yet.
    }
}

async function renderCard(cardKey) {
    const definitions = getCardDefinitions();
    const definition = definitions[cardKey] || definitions[loadStudioConfig().defaultCard] || Object.values(definitions)[0];

    if (!definition) {
        throw new Error("No cards are enabled in Card Studio config.");
    }

    fs.mkdirSync(outputDir, { recursive: true });
    clearModule(definition.modulePath);

    const cardModule = require(definition.modulePath);
    const buffer = await definition.render(cardModule);

    if (!Buffer.isBuffer(buffer)) {
        throw new Error(`${definition.label} did not return a PNG buffer.`);
    }

    const outputPath = path.join(outputDir, definition.outputName);
    fs.writeFileSync(outputPath, buffer);

    lastBuild = {
        card: definition.key,
        ok: true,
        message: `Rendered ${definition.label}`,
        outputName: definition.outputName,
        updatedAt: new Date().toISOString()
    };

    notifyClients();
    return { definition, outputPath };
}

function notifyClients() {
    const payload = `data: ${JSON.stringify(lastBuild)}\n\n`;
    clients.forEach((res) => res.write(payload));
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        req.on("error", reject);
    });
}

async function readJsonBody(req) {
    const body = await readBody(req);
    return body ? JSON.parse(body) : {};
}

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
}

function sendFile(res, filePath, contentType = "application/octet-stream") {
    if (!fs.existsSync(filePath)) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
        return;
    }

    res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": "no-store"
    });
    fs.createReadStream(filePath).pipe(res);
}

function getContentType(filePath) {
    if (filePath.endsWith(".html")) return "text/html";
    if (filePath.endsWith(".css")) return "text/css";
    if (filePath.endsWith(".js")) return "application/javascript";
    if (filePath.endsWith(".png")) return "image/png";
    if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
    if (filePath.endsWith(".webp")) return "image/webp";
    return "application/octet-stream";
}

function getLayout(cardKey) {
    const definition = getCardDefinitions()[cardKey];
    if (!definition?.layoutPath) return {};
    return readJson(definition.layoutPath, {});
}

function saveLayout(cardKey, layout) {
    const definition = getCardDefinitions()[cardKey];
    if (!definition?.layoutPath) {
        throw new Error(`No layout JSON configured for ${cardKey}`);
    }

    writeJson(definition.layoutPath, layout);
}

function safeUploadName(name) {
    return String(name || "upload.png")
        .replace(/[^a-z0-9._-]/gi, "-")
        .replace(/-+/g, "-")
        .slice(0, 80);
}

async function handleUpload(req, res) {
    const data = await readJsonBody(req);

    if (!data.dataUrl || !String(data.dataUrl).startsWith("data:")) {
        sendJson(res, 400, { ok: false, error: "Expected dataUrl." });
        return;
    }

    const [, meta, base64] = String(data.dataUrl).match(/^data:([^;]+);base64,(.+)$/) || [];
    if (!meta || !base64) {
        sendJson(res, 400, { ok: false, error: "Invalid dataUrl." });
        return;
    }

    const ext = meta.includes("jpeg") ? ".jpg" : meta.includes("webp") ? ".webp" : ".png";
    const fileName = `${Date.now()}-${safeUploadName(data.fileName || `upload${ext}`)}`;
    const finalName = path.extname(fileName) ? fileName : `${fileName}${ext}`;
    const filePath = path.join(uploadDir, finalName);

    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(filePath, Buffer.from(base64, "base64"));

    const relativePath = path.relative(projectRoot, filePath).replace(/\\/g, "/");
    sendJson(res, 200, {
        ok: true,
        path: relativePath,
        url: `/uploads/${finalName}`
    });
}

const server = http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);

    try {
        if (requestUrl.pathname === "/") {
            sendFile(res, path.join(publicDir, "dashboard.html"), "text/html");
            return;
        }

        if (requestUrl.pathname.startsWith("/public/")) {
            const fileName = path.basename(requestUrl.pathname.replace("/public/", ""));
            const filePath = path.join(publicDir, fileName);
            sendFile(res, filePath, getContentType(filePath));
            return;
        }

        if (requestUrl.pathname.startsWith("/uploads/")) {
            const fileName = path.basename(requestUrl.pathname.replace("/uploads/", ""));
            const filePath = path.join(uploadDir, fileName);
            sendFile(res, filePath, getContentType(filePath));
            return;
        }

        if (requestUrl.pathname === "/events") {
            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            });
            res.write(`data: ${JSON.stringify(lastBuild)}\n\n`);
            clients.push(res);
            req.on("close", () => {
                clients = clients.filter((client) => client !== res);
            });
            return;
        }

        if (requestUrl.pathname === "/api/studio") {
            sendJson(res, 200, {
                ok: true,
                config: loadStudioConfig(),
                cards: getCardDefinitions(),
                sampleData: sampleDataModule.readSampleData(),
                lastBuild
            });
            return;
        }

        if (requestUrl.pathname === "/api/layout") {
            const card = requestUrl.searchParams.get("card") || loadStudioConfig().defaultCard;

            if (req.method === "GET") {
                sendJson(res, 200, { ok: true, card, layout: getLayout(card) });
                return;
            }

            if (req.method === "POST") {
                const body = await readJsonBody(req);
                saveLayout(card, body.layout || {});
                sendJson(res, 200, { ok: true, card, layout: getLayout(card) });
                return;
            }
        }

        if (requestUrl.pathname === "/api/sample-data") {
            if (req.method === "GET") {
                sendJson(res, 200, { ok: true, sampleData: sampleDataModule.readSampleData() });
                return;
            }

            if (req.method === "POST") {
                const body = await readJsonBody(req);
                writeJson(sampleDataModule.sampleDataPath, body.sampleData || {});
                sendJson(res, 200, { ok: true, sampleData: sampleDataModule.readSampleData() });
                return;
            }
        }

        if (requestUrl.pathname === "/api/upload" && req.method === "POST") {
            await handleUpload(req, res);
            return;
        }

        if (requestUrl.pathname === "/render") {
            const card = requestUrl.searchParams.get("card") || loadStudioConfig().defaultCard;
            const result = await renderCard(card);
            sendJson(res, 200, {
                ok: true,
                message: lastBuild.message,
                outputName: result.definition.outputName
            });
            return;
        }

        if (requestUrl.pathname.startsWith("/image/")) {
            const outputName = path.basename(requestUrl.pathname.replace("/image/", ""));
            sendFile(res, path.join(outputDir, outputName), "image/png");
            return;
        }

        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
    } catch (error) {
        lastBuild = {
            card: requestUrl.searchParams.get("card") || lastBuild.card || loadStudioConfig().defaultCard,
            ok: false,
            message: error.message,
            updatedAt: new Date().toISOString()
        };
        notifyClients();
        sendJson(res, 500, { ok: false, error: error.message });
    }
});

function watchTarget(targetPath) {
    if (!fs.existsSync(targetPath)) return;

    fs.watch(targetPath, { recursive: false }, () => {
        renderCard(lastBuild.card || loadStudioConfig().defaultCard).catch((error) => {
            lastBuild = {
                card: lastBuild.card || loadStudioConfig().defaultCard,
                ok: false,
                message: error.message,
                updatedAt: new Date().toISOString()
            };
            notifyClients();
        });
    });
}

for (const target of loadStudioConfig().watch || []) {
    watchTarget(resolveProjectPath(target));
}

server.listen(defaultPort, () => {
    const defaultCard = loadStudioConfig().defaultCard || "server";
    console.log(`Glizzanator Card Studio running at http://localhost:${defaultPort}`);
    renderCard(defaultCard).catch((error) => {
        lastBuild = {
            card: defaultCard,
            ok: false,
            message: error.message,
            updatedAt: new Date().toISOString()
        };
    });
});
