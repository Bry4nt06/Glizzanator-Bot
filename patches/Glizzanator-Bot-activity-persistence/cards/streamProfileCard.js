const { createCanvas, loadImage } = require("canvas");
const path = require("path");
const { roundRect } = require("./drawing");
const W = 900;
const H = 360;

// Since this file is in /utils and staleGlizz.png is in /assets
const STALE_GLIZZ_PATH = path.join(__dirname, "../assets/staleGlizz.png");

async function createStreamProfileCard({ member, channelName, startedAt = Date.now() }) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    const displayName = member?.displayName || member?.user?.username || "Unknown Streamer";
    const username = member?.user?.tag || member?.user?.username || "Discord User";

    const avatarURL = member?.displayAvatarURL
        ? member.displayAvatarURL({ extension: "png", size: 512 })
        : member?.user?.displayAvatarURL?.({ extension: "png", size: 512 });


    // Main background
    const gradient = ctx.createLinearGradient(0, 0, W, H);
    gradient.addColorStop(0, "#180f07");
    gradient.addColorStop(0.6, "#000000");
    gradient.addColorStop(1, "#040402");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    // Faded staleGlizz background image clipped inside card shape
    await drawStaleGlizzBackground(ctx);

    // Outer border
    ctx.strokeStyle = "rgba(246, 196, 83, 0.95)";
    ctx.lineWidth = 5;
    roundRect(ctx, 18, 18, W - 36, H - 36, 30, false, true);

    // Inner glow border
    ctx.shadowColor = "rgba(246, 196, 83, 0.9)";
    ctx.shadowBlur = 22;
    ctx.strokeStyle = "rgba(246, 196, 83, 0.55)";
    ctx.lineWidth = 2;
    roundRect(ctx, 28, 28, W - 56, H - 56, 26, false, true);
    ctx.shadowBlur = 1;

    // Header text
    ctx.fillStyle = "#f6c453";
    ctx.font = "bold 34px Arial";
    ctx.textAlign = "left";
    ctx.fillText("NOW STREAMING", 285, 60);

    // Display name
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 56px Arial";
    ctx.fillText(fitText(ctx, displayName, 510), 285, 120);

    // Username
    ctx.fillStyle = "#aeb6c4";
    ctx.font = "24px Arial";
    ctx.fillText(fitText(ctx, username, 510), 288, 158);

    // Info pills
    drawInfoPill(ctx, 285, 185, 280, 46, `Voice Channel: ${channelName || "Glick"}`);
    drawInfoPill(ctx, 285, 242, 210, 42, `Started: ${formatTime(startedAt)}`);

    // Avatar
    const avatarX = 157.5;
    const avatarY = 179;
    const avatarRadius = 98;
    const avatarSize = avatarRadius * 2;
    const borderRadius = avatarRadius + 4;

    if (avatarURL) {
        try {
            const avatar = await loadImage(avatarURL);

            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            ctx.drawImage(
                avatar,
                avatarX - avatarRadius,
                avatarY - avatarRadius,
                avatarSize,
                avatarSize
            );

            ctx.restore();

            ctx.strokeStyle = "#f6c453";
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(avatarX, avatarY, borderRadius, 0, Math.PI * 2);
            ctx.stroke();
        } catch {
            drawAvatarFallback(ctx, avatarX, avatarY, displayName, avatarRadius);
        }
    } else {
        drawAvatarFallback(ctx, avatarX, avatarY, displayName, avatarRadius);
    }

    // Footer text
    ctx.fillStyle = "#f6c453";
    ctx.font = "bold 22px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GLIZZANATOR STREAM ALERT", W / 2, 325);

    return canvas.toBuffer("image/png");
}

async function drawStaleGlizzBackground(ctx) {
    try {
        const staleGlizz = await loadImage(STALE_GLIZZ_PATH);

        const cardX = 18;
        const cardY = 18;
        const cardW = W - 36;
        const cardH = H - 36;
        const cardR = 30;

        ctx.save();

        // Clip the background image so it only appears inside the card shape
        roundedPath(ctx, cardX, cardY, cardW, cardH, cardR);
        ctx.clip();

        // Make it a light background object
        ctx.globalAlpha = 0.35;

        // Large background placement
        const imgW = 430;
        const imgH = 430;
        const imgX = W - 430;
        const imgY = -35;

        ctx.drawImage(staleGlizz, imgX, imgY, imgW, imgH);

        // Dark fade over the image so card text stays readable
        ctx.globalAlpha = 0.55;
        const fade = ctx.createLinearGradient(250, 0, W, 0);
        fade.addColorStop(0, "rgba(7, 16, 24, 0)");
        fade.addColorStop(0.6, "rgba(7, 16, 24, 0.25)");
        fade.addColorStop(1, "rgba(2, 3, 4, 0.78)");
        ctx.fillStyle = fade;
        ctx.fillRect(cardX, cardY, cardW, cardH);

        ctx.restore();
    } catch (err) {
        console.warn("Could not load staleGlizz.png:", err.message);
    }
}

function drawInfoPill(ctx, x, y, w, h, text) {
    ctx.fillStyle = "rgba(17, 24, 32, 0.92)";
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, w, h, 12, true, true);

    ctx.fillStyle = "#e9edf5";
    ctx.font = "22px Arial";
    ctx.textAlign = "left";
    ctx.fillText(fitText(ctx, text, w - 34), x + 17, y + 30);
}

function drawAvatarFallback(ctx, cx, cy, name, radius = 98) {
    const initials = String(name || "?")
        .split(/\s+/)
        .map(part => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    ctx.fillStyle = "#1d2430";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#f6c453";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#f6c453";
    ctx.font = "bold 64px Arial";
    ctx.textAlign = "center";
    ctx.fillText(initials || "?", cx, cy + 22);
}

function fitText(ctx, text, maxWidth) {
    const value = String(text || "");
    if (ctx.measureText(value).width <= maxWidth) return value;

    let shortened = value;
    while (shortened.length > 0 && ctx.measureText(`${shortened}...`).width > maxWidth) {
        shortened = shortened.slice(0, -1);
    }

    return shortened.length ? `${shortened}...` : "...";
}

function formatTime(ms) {
    return new Date(ms).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
    });
}

function roundedPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

module.exports = { createStreamProfileCard };