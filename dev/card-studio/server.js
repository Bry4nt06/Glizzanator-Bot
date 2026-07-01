const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");
const { samples } = require("./sampleData");

const projectRoot = path.resolve(__dirname, "..", "..");
const outputDir = path.join(projectRoot, "preview-output");
const defaultPort = Number(process.env.CARD_STUDIO_PORT || 3001);

const cardDefinitions = {
    server: {
        label: "Server Stats Card",
        modulePath: path.join(projectRoot, "cards", "serverCard.js"),
        outputName: "server-card-studio.png",
        render: async (cardModule) => cardModule.createStatsCard(samples.server)
    },
    stream: {
        label: "Stream Alert Card",
        modulePath: path.join(projectRoot, "cards", "streamProfileCard.js"),
        outputName: "stream-alert-studio.png",
        render: async (cardModule) => cardModule.createStreamProfileCard(samples.stream)
    }
};

let clients = [];
let lastBuild = {
    card: null,
    ok: true,
    message: "Waiting for first render."
};

function clearModule(modulePath) {
    try {
        delete require.cache[require.resolve(modulePath)];
    } catch {
        // Module may not be loaded yet.
    }
}

async function renderCard(cardKey) {
    const definition = cardDefinitions[cardKey] || cardDefinitions.server;

    fs.mkdirSync(outputDir, { recursive: true });
    clearModule(definition.modulePath);
    clearModule(path.join(__dirname, "sampleData.js"));

    const cardModule = require(definition.modulePath);
    const buffer = await definition.render(cardModule);

    if (!Buffer.isBuffer(buffer)) {
        throw new Error(`${definition.label} did not return a PNG buffer.`);
    }

    const outputPath = path.join(outputDir, definition.outputName);
    fs.writeFileSync(outputPath, buffer);

    lastBuild = {
        card: cardKey,
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

function renderHome() {
    const cards = Object.entries(cardDefinitions)
        .map(([key, definition]) => {
            return `<button class="card-button" data-card="${key}">${definition.label}</button>`;
        })
        .join("\n");

    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Glizzanator Card Studio</title>
    <style>
        :root {
            --bg: #050608;
            --panel: #0d1118;
            --panel-2: #151a22;
            --gold: #f6c453;
            --text: #f4f6fb;
            --muted: #aeb6c4;
            --red: #ef2b2d;
        }

        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            font-family: Arial, sans-serif;
            background: radial-gradient(circle at top, #211507 0, var(--bg) 42%, #000 100%);
            color: var(--text);
        }

        header {
            padding: 24px 32px 12px;
            border-bottom: 1px solid rgba(246,196,83,0.25);
        }

        h1 {
            margin: 0;
            color: var(--gold);
            font-size: 34px;
        }

        .subtitle {
            margin-top: 6px;
            color: var(--muted);
        }

        main {
            display: grid;
            grid-template-columns: 280px minmax(0, 1fr);
            gap: 22px;
            padding: 24px 32px 32px;
        }

        aside, .preview-panel, .notes {
            background: rgba(13, 17, 24, 0.92);
            border: 1px solid rgba(246,196,83,0.25);
            border-radius: 16px;
            box-shadow: 0 0 28px rgba(0,0,0,0.45);
        }

        aside {
            padding: 18px;
            height: fit-content;
        }

        .card-button {
            width: 100%;
            display: block;
            margin-bottom: 12px;
            padding: 13px 14px;
            border: 1px solid rgba(246,196,83,0.35);
            border-radius: 10px;
            background: var(--panel-2);
            color: var(--text);
            text-align: left;
            font-size: 15px;
            cursor: pointer;
        }

        .card-button.active,
        .card-button:hover {
            border-color: var(--gold);
            color: var(--gold);
        }

        .status {
            margin-top: 18px;
            padding: 12px;
            border-radius: 10px;
            background: #070a10;
            color: var(--muted);
            font-size: 13px;
            line-height: 1.35;
        }

        .status strong { color: var(--gold); }
        .status .live-dot {
            display: inline-block;
            width: 10px;
            height: 10px;
            margin-right: 7px;
            border-radius: 50%;
            background: var(--red);
            box-shadow: 0 0 10px var(--red);
        }

        .preview-panel {
            padding: 22px;
            overflow: auto;
        }

        .preview-toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            margin-bottom: 18px;
        }

        .preview-title {
            font-size: 20px;
            color: var(--gold);
            font-weight: bold;
        }

        .refresh-button {
            border: 1px solid rgba(246,196,83,0.45);
            border-radius: 10px;
            padding: 10px 14px;
            background: #10151d;
            color: var(--text);
            cursor: pointer;
        }

        .image-wrap {
            background: #000;
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 12px;
            padding: 18px;
            text-align: center;
        }

        img {
            max-width: 100%;
            height: auto;
            display: inline-block;
        }

        .notes {
            grid-column: 1 / -1;
            padding: 18px 22px;
            color: var(--muted);
            line-height: 1.5;
        }

        code {
            color: var(--gold);
        }
    </style>
</head>
<body>
    <header>
        <h1>Glizzanator Card Studio</h1>
        <div class="subtitle">Live browser preview for Discord cards. Save a card file and this page refreshes automatically.</div>
    </header>

    <main>
        <aside>
            ${cards}
            <div class="status">
                <div><span class="live-dot"></span><strong>Studio running</strong></div>
                <div id="build-status">Waiting for render...</div>
            </div>
        </aside>

        <section class="preview-panel">
            <div class="preview-toolbar">
                <div class="preview-title" id="preview-title">Server Stats Card</div>
                <button class="refresh-button" id="refresh-button">Regenerate</button>
            </div>
            <div class="image-wrap">
                <img id="preview-image" alt="Card preview" />
            </div>
        </section>

        <section class="notes">
            <strong>Customize sample data:</strong> edit <code>dev/card-studio/sampleData.js</code>.<br />
            <strong>Customize card layout:</strong> edit files in <code>cards/</code>. The studio regenerates previews on save.
        </section>
    </main>

    <script>
        const buttons = [...document.querySelectorAll(".card-button")];
        const img = document.getElementById("preview-image");
        const title = document.getElementById("preview-title");
        const status = document.getElementById("build-status");
        const refreshButton = document.getElementById("refresh-button");
        let selectedCard = localStorage.getItem("cardStudio.card") || "server";

        function setActive(card) {
            selectedCard = card;
            localStorage.setItem("cardStudio.card", card);
            buttons.forEach((button) => button.classList.toggle("active", button.dataset.card === card));
            title.textContent = buttons.find((button) => button.dataset.card === card)?.textContent || "Card Preview";
        }

        async function render(card = selectedCard) {
            setActive(card);
            status.textContent = "Rendering...";
            const response = await fetch(`/render?card=${card}&t=${Date.now()}`);
            const data = await response.json();

            if (!data.ok) {
                status.textContent = data.error || "Render failed.";
                return;
            }

            img.src = `/image/${data.outputName}?t=${Date.now()}`;
            status.textContent = `${data.message} at ${new Date().toLocaleTimeString()}`;
        }

        buttons.forEach((button) => {
            button.addEventListener("click", () => render(button.dataset.card));
        });

        refreshButton.addEventListener("click", () => render());

        const events = new EventSource("/events");
        events.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.card === selectedCard && data.outputName) {
                img.src = `/image/${data.outputName}?t=${Date.now()}`;
                status.textContent = `${data.message} at ${new Date().toLocaleTimeString()}`;
            }
        };

        render(selectedCard);
    </script>
</body>
</html>`;
}

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
}

function sendFile(res, filePath) {
    if (!fs.existsSync(filePath)) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
        return;
    }

    res.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "no-store"
    });
    fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);

    if (requestUrl.pathname === "/") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(renderHome());
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

    if (requestUrl.pathname === "/render") {
        const card = requestUrl.searchParams.get("card") || "server";

        try {
            const result = await renderCard(card);
            sendJson(res, 200, {
                ok: true,
                message: lastBuild.message,
                outputName: result.definition.outputName
            });
        } catch (error) {
            lastBuild = {
                card,
                ok: false,
                message: error.message,
                updatedAt: new Date().toISOString()
            };
            notifyClients();
            sendJson(res, 500, { ok: false, error: error.message });
        }
        return;
    }

    if (requestUrl.pathname.startsWith("/image/")) {
        const outputName = path.basename(requestUrl.pathname.replace("/image/", ""));
        sendFile(res, path.join(outputDir, outputName));
        return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
});

function watchTarget(targetPath) {
    if (!fs.existsSync(targetPath)) return;

    fs.watch(targetPath, { recursive: false }, () => {
        renderCard(lastBuild.card || "server").catch((error) => {
            lastBuild = {
                card: lastBuild.card || "server",
                ok: false,
                message: error.message,
                updatedAt: new Date().toISOString()
            };
            notifyClients();
        });
    });
}

watchTarget(path.join(projectRoot, "cards"));
watchTarget(path.join(projectRoot, "assets"));
watchTarget(__dirname);

server.listen(defaultPort, () => {
    console.log(`Glizzanator Card Studio running at http://localhost:${defaultPort}`);
    renderCard("server").catch((error) => {
        lastBuild = {
            card: "server",
            ok: false,
            message: error.message,
            updatedAt: new Date().toISOString()
        };
    });
});
