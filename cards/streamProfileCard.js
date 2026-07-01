const { createCanvas, loadImage } = require("canvas");
const path = require("path");
const { roundRect } = require("./drawing");

const streamCardConfig = {
    width: 900,
    height: 360,
    colors: {
        backgroundStart: "#180f07",
        backgroundMiddle: "#000000",
        backgroundEnd: "#040402",
        gold: "#f6c453",
        white: "#ffffff",
        muted: "#d0d4dc",
        pillBackground: "rgba(17, 24, 32, 0.92)",
        pillBorder: "rgba(255,255,255,0.12)",
        liveRed: "#ef2b2d"
    },
    border: {
        outerX: 18,
        outerY: 18,
        outerRadius: 30,
        outerWidth: 5,
        innerX: 28,
        innerY: 28,
        innerRadius: 26,
        innerWidth: 2
    },
    avatar: {
        centerX: 157.5,
        centerY: 179,
        radius: 98,
        borderWidth: 5
    },
    text: {
        x: 285,
        maxWidth: 560,
        headerY: 60,
        usernameY: 104,
        displayNameY: 154,
        usernameMaxSize: 34,
        usernameMinSize: 16,
        displayNameMaxSize: 56,
        displayNameMinSize: 24
    },
    live: {
        enabled: true,
        x: 285,
        y: 74,
        height: 36,
        radius: 10,
        paddingX: 14,
        dotRadius: 8,
        text: "LIVE"
    },
    pills: {
        x: 285,
        firstY: 185,
        secondY: 242,
        channelWidth: 300,
        timeWidth: 230,
        channelHeight: 46,
        timeHeight: 42,
        radius: 12,
        fontSize: 22,
        iconColor: "#f6c453"
    },
    footer: {
        y: 325,
        fontSize: 22,
        text: "GLIZZANATOR STREAM ALERT"
    },
    backgroundImage: {
        alpha: 0.35,
        x: 470,
        y: -35,
        width: 430,
        height: 430
    }
};

const W = streamCardConfig.width;
const H = streamCardConfig.height;
const STALE_GLIZZ_PATH = path.join(__dirname, "../assets/staleGlizz.png");

async function createStreamProfileCard({ member, channelName, startedAt = Date.now(), options = {} }) {
    const config = mergeConfig(streamCardConfig, options);
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext("2d");

    const discordUsername = member?.user?.username || member?.user?.tag || "Discord User";
    const displayName = member?.displayName || discordUsername;

    const avatarURL = member?.displayAvatarURL
        ? member.displayAvatarURL({ extension: "png", size: 512 })
        : member?.user?.displayAvatarURL?.({ extension: "png", size: 512 });

    drawBackground(ctx, config);
    await drawStaleGlizzBackground(ctx, config);
    drawBorders(ctx, config);
    drawHeader(ctx, config);

    if (config.live.enabled) {
        drawLiveBadge(ctx, config.live.x, config.live.y, config.live, config.colors);
    }

    drawFittedText(ctx, `@${discordUsername}`, config.text.x, config.text.usernameY, config.text.maxWidth, {
        maxSize: config.text.usernameMaxSize,
        minSize: config.text.usernameMinSize,
        weight: "bold",
        color: config.colors.muted
    });

    drawFittedText(ctx, displayName, config.text.x, config.text.displayNameY, config.text.maxWidth, {
        maxSize: config.text.displayNameMaxSize,
        minSize: config.text.displayNameMinSize,
        weight: "bold",
        color: config.colors.white,
        shadow: true
    });

    drawInfoPill(
        ctx,
        config.pills.x,
        config.pills.firstY,
        config.pills.channelWidth,
        config.pills.channelHeight,
        `🔊  Voice Channel: ${channelName || "Glick"}`,
        config
    );

    drawInfoPill(
        ctx,
        config.pills.x,
        config.pills.secondY,
        config.pills.timeWidth,
        config.pills.timeHeight,
        `🕘  Started: ${formatTime(startedAt)}`,
        config
    );

    await drawAvatar(ctx, avatarURL, displayName, config);
    drawFooter(ctx, config);

    return canvas.toBuffer("image/png");
}

function drawBackground(ctx, config) {
    const gradient = ctx.createLinearGradient(0, 0, config.width, config.height);
    gradient.addColorStop(0, config.colors.backgroundStart);
    gradient.addColorStop(0.6, config.colors.backgroundMiddle);
    gradient.addColorStop(1, config.colors.backgroundEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, config.width, config.height);
}

function drawBorders(ctx, config) {
    const outerW = config.width - config.border.outerX * 2;
    const outerH = config.height - config.border.outerY * 2;
    const innerW = config.width - config.border.innerX * 2;
    const innerH = config.height - config.border.innerY * 2;

    ctx.strokeStyle = "rgba(246, 196, 83, 0.95)";
    ctx.lineWidth = config.border.outerWidth;
    roundRect(ctx, config.border.outerX, config.border.outerY, outerW, outerH, config.border.outerRadius, false, true);

    ctx.shadowColor = "rgba(246, 196, 83, 0.9)";
    ctx.shadowBlur = 22;
    ctx.strokeStyle = "rgba(246, 196, 83, 0.55)";
    ctx.lineWidth = config.border.innerWidth;
    roundRect(ctx, config.border.innerX, config.border.innerY, innerW, innerH, config.border.innerRadius, false, true);
    ctx.shadowBlur = 0;
}

function drawHeader(ctx, config) {
    ctx.fillStyle = config.colors.gold;
    ctx.font = "bold 34px Arial";
    ctx.textAlign = "left";
    ctx.fillText("NOW STREAMING", config.text.x, config.text.headerY);
}

function drawLiveBadge(ctx, x, y, liveConfig, colors) {
    const textWidth = ctx.measureText(liveConfig.text).width;
    const width = textWidth + liveConfig.paddingX * 2 + liveConfig.dotRadius * 2 + 12;

    ctx.fillStyle = colors.liveRed;
    roundRect(ctx, x, y, width, liveConfig.height, liveConfig.radius, true, false);

    ctx.fillStyle = colors.white;
    ctx.beginPath();
    ctx.arc(x + liveConfig.paddingX + liveConfig.dotRadius, y + liveConfig.height / 2, liveConfig.dotRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "bold 22px Arial";
    ctx.textAlign = "left";
    ctx.fillText(liveConfig.text, x + liveConfig.paddingX + liveConfig.dotRadius * 2 + 12, y + 25);
}

async function drawAvatar(ctx, avatarURL, displayName, config) {
    const { centerX, centerY, radius, borderWidth } = config.avatar;
    const avatarSize = radius * 2;

    if (avatarURL) {
        try {
            const avatar = await loadImage(avatarURL);

            ctx.save();
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, centerX - radius, centerY - radius, avatarSize, avatarSize);
            ctx.restore();

            ctx.strokeStyle = config.colors.gold;
            ctx.lineWidth = borderWidth;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius + 4, 0, Math.PI * 2);
            ctx.stroke();
            return;
        } catch {
            // Fall through to fallback avatar.
        }
    }

    drawAvatarFallback(ctx, centerX, centerY, displayName, radius, config);
}

async function drawStaleGlizzBackground(ctx, config) {
    try {
        const staleGlizz = await loadImage(STALE_GLIZZ_PATH);
        const cardX = config.border.outerX;
        const cardY = config.border.outerY;
        const cardW = config.width - config.border.outerX * 2;
        const cardH = config.height - config.border.outerY * 2;

        ctx.save();
        roundedPath(ctx, cardX, cardY, cardW, cardH, config.border.outerRadius);
        ctx.clip();
        ctx.globalAlpha = config.backgroundImage.alpha;
        ctx.drawImage(
            staleGlizz,
            config.backgroundImage.x,
            config.backgroundImage.y,
            config.backgroundImage.width,
            config.backgroundImage.height
        );

        ctx.globalAlpha = 0.55;
        const fade = ctx.createLinearGradient(250, 0, config.width, 0);
        fade.addColorStop(0, "rgba(7, 16, 24, 0)");
        fade.addColorStop(0.6, "rgba(7, 16, 24, 0.25)");
        fade.addColorStop(1, "rgba(2, 3, 4, 0.78)");
        ctx.fillStyle = fade;
        ctx.fillRect(cardX, cardY, cardW, cardH);
        ctx.restore();
    } catch (err) {
        console.warn("Could not load staleGlizz.png", { error: err.message });
    }
}

function drawInfoPill(ctx, x, y, w, h, text, config) {
    ctx.fillStyle = config.colors.pillBackground;
    ctx.strokeStyle = config.colors.pillBorder;
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, w, h, config.pills.radius, true, true);

    drawFittedText(ctx, text, x + 17, y + Math.round(h * 0.66), w - 34, {
        maxSize: config.pills.fontSize,
        minSize: 14,
        color: "#e9edf5"
    });
}

function drawAvatarFallback(ctx, cx, cy, name, radius = 98, config = streamCardConfig) {
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

    ctx.strokeStyle = config.colors.gold;
    ctx.lineWidth = config.avatar.borderWidth;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = config.colors.gold;
    ctx.font = "bold 64px Arial";
    ctx.textAlign = "center";
    ctx.fillText(initials || "?", cx, cy + 22);
}

function drawFooter(ctx, config) {
    ctx.fillStyle = config.colors.gold;
    ctx.font = `bold ${config.footer.fontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(config.footer.text, config.width / 2, config.footer.y);
}

function drawFittedText(ctx, text, x, y, maxWidth, options = {}) {
    const {
        maxSize = 24,
        minSize = 12,
        weight = "",
        family = "Arial",
        color = "#ffffff",
        shadow = false
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

    if (shadow) {
        ctx.shadowColor = "rgba(246,196,83,0.65)";
        ctx.shadowBlur = 9;
    }

    ctx.fillText(value, x, y);
    ctx.shadowBlur = 0;

    return size;
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

function mergeConfig(base, overrides) {
    if (!overrides || typeof overrides !== "object") {
        return base;
    }

    const merged = Array.isArray(base) ? [...base] : { ...base };

    for (const [key, value] of Object.entries(overrides)) {
        if (value && typeof value === "object" && !Array.isArray(value)) {
            merged[key] = mergeConfig(base[key] || {}, value);
        } else {
            merged[key] = value;
        }
    }

    return merged;
}

module.exports = {
    createStreamProfileCard,
    streamCardConfig
};
