const { createCanvas, loadImage } = require("canvas");
const path = require("path");
const https = require("https");
const http = require("http");
const { roundRect } = require("./drawing");

const W = 1600;
const H = 900;

const assetCache = new Map();
const remoteImageCache = new Map();

async function createStatsCard(data) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    const background = await loadAsset("CardBG.png");
    const hotdogLogo = await loadAsset("Card Logo.png");
    const monsterHotdog = await loadAsset("monster-hotdog.png");
    const crown = await loadAsset("Crown.png");
    const hotdogHanging = await loadAsset("LittlePorker.png");

    if (background) {
        ctx.drawImage(background, 0, 0, W, H);
    } else {
        ctx.fillStyle = "#050608";
        ctx.fillRect(0, 0, W, H);
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 72px Arial";
    ctx.textAlign = "left";
    ctx.fillText("The Glizzy Muncher", 75, 105);

    ctx.fillStyle = "#f6c453";
    ctx.font = "36px Arial";
    ctx.fillText("Activity Dashboard", 275, 155);

    if (hotdogLogo) {
        ctx.drawImage(hotdogLogo, 1350, -25, 250, 300);
    }

    drawStatCard(ctx, 55, 180, 390, 200, "MESSAGES", "💬", "#ecf0ec", [
        ["1 DAY:", data.messages1d],
        ["7 DAYS:", data.messages7d],
        ["30 DAYS:", data.messages30d]
    ]);

    await drawStreamLookback(ctx, 1155, 180, 390, 200, data.topStreamer || null);

    await drawLeaderboard(
        ctx,
        55,
        400,
        700,
        225,
        "👥  TOP VOICE MEMBERS",
        data.topMembers || [],
        "members"
    );

    await drawLeaderboard(
        ctx,
        845,
        400,
        700,
        225,
        "🔊  TOP VOICE CHANNELS",
        data.topChannels || [],
        "channels"
    );

    if (monsterHotdog) {
        ctx.drawImage(monsterHotdog, 555, 14, 530, 455);
    }

    await drawMusicBox(ctx, 55, 645, 430, 175, data.music || {});
    await drawGameBox(ctx, 510, 645, 1035, 175, data.game || {});

    if (crown) {
        ctx.drawImage(crown, 520, 810, 70, 70);
    }

    ctx.fillStyle = "#a5a8ad";
    ctx.font = "28px Arial";
    ctx.textAlign = "center";
    ctx.fillText("POWERED BY GLIZZANATOR BOT", 800, 855);

    if (crown) {
        ctx.drawImage(crown, 1008, 810, 70, 70);
    }

    if (hotdogHanging) {
        ctx.drawImage(hotdogHanging, 330, 630, 180, 225);
    }

    ctx.textAlign = "left";

    return canvas.toBuffer("image/png");
}

async function loadAsset(fileName) {
    try {
        if (assetCache.has(fileName)) {
            return assetCache.get(fileName);
        }

        const image = await loadImage(path.join(__dirname, "..", "assets", fileName));
        assetCache.set(fileName, image);
        return image;
    } catch (err) {
        console.warn("Failed to load asset", { fileName, error: err.message });
        return null;
    }
}

async function drawStreamLookback(ctx, x, y, w, h, topStreamer) {
    ctx.save();

    ctx.fillStyle = "rgba(8, 12, 18, 0.86)";
    ctx.strokeStyle = "rgba(246, 183, 45, 0.75)";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 16, true, true);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px Arial";
    ctx.textAlign = "center";
    ctx.fillText("TOP STREAMER", x + w / 2, y + 38);

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 45, y + 48);
    ctx.lineTo(x + w - 45, y + 48);
    ctx.stroke();

    if (!topStreamer || !topStreamer.username) {
        ctx.fillStyle = "rgba(17, 24, 32, 0.92)";
        ctx.strokeStyle = "rgba(255,255,255,0.10)";
        ctx.lineWidth = 1;
        roundRect(ctx, x + 35, y + 100, w - 70, 46, 8, true, true);

        ctx.fillStyle = "#f6c453";
        ctx.font = "24px Arial";
        ctx.textAlign = "center";
        ctx.fillText("No streams tracked yet", x + w / 2, y + 130);
        ctx.restore();
        return;
    }

    const avatarSize = 82;
    const avatarX = x + 36;
    const avatarY = y + 88;
    const textX = x + 132;
    const textWidth = w - 165;
    const rowX = textX;
    const rowW = textWidth;
    const username = topStreamer.username.startsWith("@")
        ? topStreamer.username
        : `@${topStreamer.username}`;
    const displayName = topStreamer.displayName || topStreamer.username;

    if (topStreamer.avatarURL) {
        await drawCircleImage(ctx, topStreamer.avatarURL, avatarX, avatarY, avatarSize);
    } else {
        drawSmallRank(ctx, avatarX + 23, avatarY + 23, 1);
    }

    ctx.textAlign = "left";
    drawFittedText(ctx, username, textX, y + 100, textWidth, {
        maxSize: 18,
        minSize: 11,
        weight: "bold",
        color: "#aeb6c4"
    });

    drawFittedText(ctx, displayName, textX, y + 126, textWidth, {
        maxSize: 24,
        minSize: 13,
        weight: "bold",
        color: "#f6c453"
    });

    ctx.fillStyle = "rgba(17, 24, 32, 0.92)";
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    roundRect(ctx, rowX, y + 142, rowW, 36, 7, true, true);

    ctx.fillStyle = "#ffffff";
    ctx.font = "23px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`${topStreamer.hours || 0} hrs streamed`, rowX + rowW / 2, y + 168);

    ctx.textAlign = "left";
    ctx.restore();
}

function drawStatCard(ctx, x, y, w, h, title, icon, accent, rows) {
    ctx.save();

    ctx.fillStyle = "rgba(8, 12, 18, 0.86)";
    ctx.strokeStyle = "rgba(246, 183, 45, 0.75)";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 16, true, true);

    ctx.font = "48px Arial";
    ctx.textAlign = "left";
    ctx.fillText(icon, x + 30, y + 70);

    ctx.fillStyle = accent;
    ctx.font = "bold 30px Arial";
    ctx.textAlign = "center";
    ctx.fillText(title, x + w / 2, y + 38);

    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 45, y + 48);
    ctx.lineTo(x + w - 45, y + 48);
    ctx.stroke();

    rows.forEach((row, i) => {
        const rowY = y + 105 + i * 38;

        ctx.fillStyle = "rgba(17, 24, 32, 0.92)";
        ctx.strokeStyle = "rgba(255,255,255,0.10)";
        ctx.lineWidth = 1;
        roundRect(ctx, x + 35, rowY - 25, w - 70, 32, 7, true, true);

        if (row[0]) {
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "right";
            ctx.font = "24px Arial";
            ctx.fillText(row[0], x + 145, rowY);

            ctx.fillStyle = accent;
            ctx.textAlign = "left";
            ctx.font = "24px Arial";
            ctx.fillText(String(row[1]), x + 190, rowY);
        } else {
            ctx.fillStyle = accent;
            ctx.textAlign = "center";
            ctx.font = "24px Arial";
            ctx.fillText(String(row[1]), x + w / 2, rowY);
        }
    });

    ctx.textAlign = "left";
    ctx.restore();
}

async function drawLeaderboard(ctx, x, y, w, h, title, lines, type) {
    ctx.save();

    const safeLines = Array.isArray(lines) ? lines : [];

    ctx.fillStyle = "rgba(8, 12, 18, 0.88)";
    ctx.strokeStyle = "rgba(246, 183, 45, 0.75)";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 18, true, true);

    ctx.fillStyle = "#f6c453";
    ctx.font = "bold 31px Arial";
    ctx.textAlign = "left";
    ctx.fillText(title, x + 35, y + 52);

    for (let i = 0; i < safeLines.slice(0, 3).length; i++) {
        const line = safeLines[i];
        const rowY = y + 65 + i * 52;

        ctx.fillStyle = "rgba(17, 24, 32, 0.92)";
        ctx.strokeStyle = "rgba(255,255,255,0.10)";
        roundRect(ctx, x + 25, rowY, w - 50, 44, 10, true, true);

        if (type === "members" && typeof line === "object" && line.avatarURL) {
            await drawCircleImage(ctx, line.avatarURL, x + 42, rowY + 3, 38);

            ctx.fillStyle = "#ffffff";
            ctx.font = "25px Arial";
            ctx.textAlign = "left";
            ctx.fillText(fitText(ctx, line.username || "Unknown", w - 260), x + 95, rowY + 30);

            ctx.fillStyle = i === 0 ? "#f6c453" : "#b7bfd0";
            ctx.textAlign = "right";
            ctx.fillText(`${line.hours || 0} hrs`, x + w - 55, rowY + 30);
            ctx.textAlign = "left";
        } else {
            drawSmallRank(ctx, x + 45, rowY + 7, i + 1);

            const clean = String(line).replace(/^🥇 |^🥈 |^🥉 |^🏅 /, "");
            const parts = clean.split(" - ");
            const name = parts[0] || clean;
            const hours = parts[1] || "";

            ctx.fillStyle = "#ffffff";
            ctx.font = "25px Arial";
            ctx.textAlign = "left";
            ctx.fillText(fitText(ctx, name, w - 245), x + 105, rowY + 30);

            ctx.fillStyle = i === 0 ? "#f6c453" : "#b7bfd0";
            ctx.textAlign = "right";
            ctx.fillText(hours, x + w - 55, rowY + 30);
            ctx.textAlign = "left";
        }
    }

    ctx.restore();
}

function drawSmallRank(ctx, x, y, rank) {
    const colors =
        rank === 1 ? ["#ffd94a", "#b87800"] :
        rank === 2 ? ["#d9dde5", "#6f7785"] :
        rank === 3 ? ["#c97834", "#6b3515"] :
        ["#222936", "#111820"];

    const grad = ctx.createLinearGradient(x, y, x + 32, y + 32);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x + 17, y + 17, 17, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText(rank, x + 17, y + 24);
    ctx.textAlign = "left";
}

async function drawCircleImage(ctx, imageUrl, x, y, size) {
    try {
        const img = String(imageUrl).startsWith("http")
            ? await loadRemoteImage(imageUrl)
            : await loadImage(imageUrl);

        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, x, y, size, size);
        ctx.restore();

        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2 + 2, 0, Math.PI * 2);
        ctx.strokeStyle = "#f6c453";
        ctx.lineWidth = 3;
        ctx.stroke();
    } catch {
        drawSmallRank(ctx, x, y, 0);
    }
}

function cleanThumbnailUrl(url) {
    if (!url || typeof url !== "string") {
        return null;
    }

    const match = url.match(/\/vi\/([^/]+)\//);

    if (url.includes("ytimg.com") && match && match[1]) {
        return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
    }

    return url.split("?")[0];
}

function loadRemoteImage(url) {
    return new Promise((resolve, reject) => {
        const cleanUrl = cleanThumbnailUrl(url);

        if (!cleanUrl) {
            reject(new Error("Invalid image URL."));
            return;
        }

        if (remoteImageCache.has(cleanUrl)) {
            resolve(remoteImageCache.get(cleanUrl));
            return;
        }

        const client = cleanUrl.startsWith("https") ? https : http;

        const request = client.get(
            cleanUrl,
            {
                headers: {
                    "User-Agent": "Mozilla/5.0",
                    "Accept": "image/jpeg,image/png,image/*;q=0.8,*/*;q=0.5"
                }
            },
            (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    loadRemoteImage(res.headers.location)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                if (res.statusCode !== 200) {
                    reject(new Error(`Image request failed with status ${res.statusCode}`));
                    return;
                }

                const chunks = [];

                res.on("data", chunk => chunks.push(chunk));

                res.on("end", async () => {
                    try {
                        const buffer = Buffer.concat(chunks);
                        const image = await loadImage(buffer);
                        remoteImageCache.set(cleanUrl, image);
                        resolve(image);
                    } catch (error) {
                        reject(error);
                    }
                });
            }
        );

        request.on("error", reject);
    });
}

async function drawMusicBox(ctx, x, y, w, h, music = {}) {
    ctx.save();

    ctx.fillStyle = "rgba(8, 12, 18, 0.88)";
    ctx.strokeStyle = "rgba(246, 183, 45, 0.75)";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 18, true, true);

    ctx.fillStyle = "#f6c453";
    ctx.font = "bold 25px Arial";
    ctx.textAlign = "left";
    ctx.fillText("🎵  MUSIC PLAYER", x + 28, y + 36);

    const artX = x + 32;
    const artY = y + 58;
    const artSize = 68;

    ctx.fillStyle = "rgba(17, 24, 32, 0.92)";
    ctx.strokeStyle = "rgba(246, 183, 45, 0.45)";
    ctx.lineWidth = 2;
    roundRect(ctx, artX, artY, artSize, artSize, 9, true, true);

    if (music.thumbnail) {
        try {
            const thumbnailUrl = cleanThumbnailUrl(music.thumbnail);
            const art = thumbnailUrl.startsWith("http")
                ? await loadRemoteImage(thumbnailUrl)
                : await loadImage(thumbnailUrl);

            ctx.save();
            roundRect(ctx, artX, artY, artSize, artSize, 9, false, false);
            ctx.clip();
            ctx.drawImage(art, artX, artY, artSize, artSize);
            ctx.restore();

            ctx.strokeStyle = "rgba(246, 183, 45, 0.45)";
            ctx.lineWidth = 2;
            roundRect(ctx, artX, artY, artSize, artSize, 9, false, true);
        } catch (err) {
            console.warn("Failed to load album art", { error: err.message });
        }
    }

    const textX = artX + artSize + 22;

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "left";
    ctx.fillText("NOW PLAYING", textX, y + 78);

    ctx.fillStyle = "#c8ced8";
    ctx.font = "18px Arial";
    ctx.fillText(fitText(ctx, music.title || "Nothing playing yet", 220), textX, y + 104);

    ctx.fillStyle = "#f6c453";
    ctx.font = "18px Arial";
    ctx.fillText(`Volume: ${music.volume ?? 5}%`, textX, y + 128);

    const barX = textX;
    const barY = y + 148;
    const barW = 215;
    const barH = 8;

    ctx.fillStyle = "rgba(255,255,255,0.18)";
    roundRect(ctx, barX, barY, barW, barH, 5, true, false);

    const volume = Math.max(0, Math.min(100, Number(music.volume ?? 5)));
    const fillW = Math.max(5, (barW * volume) / 100);

    ctx.fillStyle = "#f6c453";
    roundRect(ctx, barX, barY, fillW, barH, 5, true, false);

    ctx.restore();
}

function drawFittedText(ctx, text, x, y, maxWidth, options = {}) {
    const {
        maxSize = 24,
        minSize = 12,
        weight = "",
        family = "Arial",
        color = "#ffffff"
    } = options;
    const value = String(text || "");
    let size = maxSize;

    while (size > minSize) {
        ctx.font = `${weight ? `${weight} ` : ""}${size}px ${family}`;
        if (ctx.measureText(value).width <= maxWidth) break;
        size--;
    }

    ctx.fillStyle = color;
    ctx.font = `${weight ? `${weight} ` : ""}${size}px ${family}`;
    ctx.fillText(value, x, y);

    return size;
}

function fitText(ctx, text, maxWidth, fallback = "") {
    const value = String(text || fallback || "");

    if (ctx.measureText(value).width <= maxWidth) {
        return value;
    }

    let shortened = value;

    while (shortened.length > 0 && ctx.measureText(`${shortened}...`).width > maxWidth) {
        shortened = shortened.slice(0, -1);
    }

    return shortened.length ? `${shortened}...` : "...";
}

function drawImageCover(ctx, image, x, y, w, h) {
    const scale = Math.max(w / image.width, h / image.height);
    const sw = w / scale;
    const sh = h / scale;
    const sx = (image.width - sw) / 2;
    const sy = (image.height - sh) / 2;

    ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
}

async function drawGameBox(ctx, x, y, w, h, game = {}) {
    ctx.save();

    ctx.fillStyle = "rgba(8, 12, 18, 0.88)";
    ctx.strokeStyle = "rgba(246, 183, 45, 0.75)";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 18, true, true);

    ctx.fillStyle = "#f6c453";
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "left";
    ctx.fillText("🎮 GAME ARTWORK", x + 35, y + 42);

    const topPick = game.topPick || game.name || "No game activity yet";
    const rating = game.rating || "N/A";
    const metacritic = game.metacritic || "N/A";
    const released = game.released || "N/A";
    const platforms = game.platforms || "Use /topgames to search";
    const artwork = game.thumbnail || game.image || game.previewThumbnail || null;
    const topThree = Array.isArray(game.topThreeGames) && game.topThreeGames.length
        ? game.topThreeGames.map(item => item?.name || String(item))
        : Array.isArray(game.topThree)
            ? game.topThree
            : [];

    const artX = x + 93;
    const artY = y + 58;
    const artW = 205;
    const artH = 105;

    ctx.fillStyle = "rgba(17, 24, 32, 0.92)";
    ctx.strokeStyle = "rgba(246, 183, 45, 0.45)";
    ctx.lineWidth = 2;
    roundRect(ctx, artX, artY, artW, artH, 12, true, true);

    if (artwork) {
        try {
            const image = artwork.startsWith("http")
                ? await loadRemoteImage(artwork)
                : await loadImage(artwork);

            ctx.save();
            roundRect(ctx, artX, artY, artW, artH, 12, false, false);
            ctx.clip();
            drawImageCover(ctx, image, artX, artY, artW, artH);
            ctx.restore();

            ctx.strokeStyle = "rgba(246, 183, 45, 0.65)";
            ctx.lineWidth = 2;
            roundRect(ctx, artX, artY, artW, artH, 12, false, true);
        } catch (err) {
            console.warn("Failed to load top game artwork", { error: err.message });
            ctx.fillStyle = "#8b93a5";
            ctx.font = "46px Arial";
            ctx.fillText("🎮", artX + 75, artY + 60);
        }
    } else {
        ctx.fillStyle = "#8b93a5";
        ctx.font = "46px Arial";
        ctx.fillText("🎮", artX + 75, artY + 60);
    }

    const detailsX = x + 375;
    const detailsWidth = 300;

    ctx.fillStyle = "#f6c453";
    ctx.font = "bold 21px Arial";
    ctx.fillText("🏆 TOP PICK", detailsX, y + 40);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 31px Arial";
    ctx.fillText(fitText(ctx, topPick, detailsWidth), detailsX, y + 91);

    ctx.fillStyle = "#c8ced8";
    ctx.font = "17px Arial";
    ctx.fillText(
        fitText(ctx, `⭐ ${rating}   🟩 ${metacritic}   📅 ${released}`, detailsWidth),
        detailsX,
        y + 134
    );

    ctx.fillStyle = "#8b93a5";
    ctx.font = "17px Arial";
    ctx.fillText(
        fitText(ctx, `🎮 ${platforms}`, detailsWidth),
        detailsX,
        y + 158
    );

    const top3BoxX = x + 675;
    const top3BoxW = 350;
    const top3CenterX = top3BoxX + top3BoxW / 2;

    ctx.textAlign = "center";
    ctx.fillStyle = "#f6c453";
    ctx.font = "bold 21px Arial";
    ctx.fillText("TOP 3 RESULTS", top3CenterX, y + 40);

    ctx.fillStyle = "#c8ced8";
    ctx.font = "20px Arial";

    if (topThree.length) {
        topThree.slice(0, 3).forEach((name, index) => {
            ctx.fillText(
                `${index + 1}. ${fitText(ctx, name, 280)}`,
                top3CenterX,
                y + 88 + index * 25
            );
        });
    } else {
        ctx.fillText("1. Run /topgames", top3CenterX, y + 88);
        ctx.fillText("2. Use /topgames horror", top3CenterX, y + 113);
        ctx.fillText("3. Then run /serverstats", top3CenterX, y + 138);
    }

    ctx.textAlign = "left";
    ctx.restore();
}

module.exports = { createStatsCard };
