const { createCanvas, loadImage } = require("@napi-rs/canvas");
const path = require("path");
const fs = require("fs");

const TEMPLATE_PATH = path.join(__dirname, "../assets/welcome_template.png");
const CARD_WIDTH = 1672;
const CARD_HEIGHT = 941;

function getTemplatePath() {
    if (!fs.existsSync(TEMPLATE_PATH)) {
        throw new Error(`Welcome template image not found at: ${TEMPLATE_PATH}`);
    }

    return TEMPLATE_PATH;
}

function trimTextToWidth(ctx, text, maxWidth) {
    let cleanText = String(text || "").trim();

    while (ctx.measureText(cleanText).width > maxWidth && cleanText.length > 3) {
        cleanText = cleanText.slice(0, -4).trim() + "...";
    }

    return cleanText;
}

function drawCenteredText(ctx, text, x, y, maxWidth, font, color, options = {}) {
    ctx.save();
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (options.shadow) {
        ctx.shadowColor = options.shadowColor || "rgba(255, 198, 56, 0.9)";
        ctx.shadowBlur = options.shadowBlur || 18;
    }

    ctx.fillText(trimTextToWidth(ctx, text, maxWidth), x, y);
    ctx.restore();
}

function drawLeftText(ctx, text, x, y, maxWidth, font, color, options = {}) {
    ctx.save();
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    if (options.shadow) {
        ctx.shadowColor = options.shadowColor || "rgba(255, 198, 56, 0.9)";
        ctx.shadowBlur = options.shadowBlur || 18;
    }

    ctx.fillText(trimTextToWidth(ctx, text, maxWidth), x, y);
    ctx.restore();
}

async function loadAvatarImage(member) {
    const avatarUrl = member?.user?.displayAvatarURL?.({
        extension: "png",
        size: 512
    });

    if (!avatarUrl) return null;

    const response = await fetch(avatarUrl);

    if (!response.ok) {
        throw new Error(`Failed to load avatar image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return loadImage(Buffer.from(arrayBuffer));
}

function drawCircularImage(ctx, image, centerX, centerY, radius) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(
        image,
        centerX - radius,
        centerY - radius,
        radius * 2,
        radius * 2
    );

    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 8, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffcc3d";
    ctx.lineWidth = 8;
    ctx.shadowColor = "rgba(255, 196, 60, 0.95)";
    ctx.shadowBlur = 24;
    ctx.stroke();
    ctx.restore();
}

function drawAvatarPlaceholder(ctx, centerX, centerY, radius) {
    ctx.save();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(5, 8, 13, 0.82)";
    ctx.fill();

    ctx.strokeStyle = "#ffcc3d";
    ctx.lineWidth = 8;
    ctx.shadowColor = "rgba(255, 196, 60, 0.95)";
    ctx.shadowBlur = 24;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.78)";

    ctx.beginPath();
    ctx.arc(centerX, centerY - 32, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY + 58, 66, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

function drawBottomBlock(ctx, title, bodyLines, x, titleY, maxWidth) {
    drawCenteredText(ctx, title, x, titleY, maxWidth, "900 30px Arial", "#ffcc3d", {
        shadow: true,
        shadowBlur: 10
    });

    bodyLines.forEach((line, index) => {
        drawCenteredText(
            ctx,
            line,
            x,
            titleY + 42 + index * 30,
            maxWidth,
            "600 22px Arial",
            "#f2f2f2"
        );
    });
}

function getDisplayName(input) {
    const member = input?.member || input;

    return (
        input?.username ||
        input?.displayName ||
        member?.displayName ||
        member?.user?.globalName ||
        member?.user?.username ||
        member?.username ||
        "New Member"
    );
}

async function createWelcomeCard(input = {}) {
    const template = await loadImage(getTemplatePath());
    const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(template, 0, 0, CARD_WIDTH, CARD_HEIGHT);

    const member = input.member || null;
    const username = getDisplayName(input);
    const finalGlizzyName = input.glizzyName || "Glizzy Goblin";

    drawLeftText(ctx, "WELCOME", 120, 115, 720, "900 80px Arial", "#ffcc3d", {
        shadow: true,
        shadowBlur: 20
    });

    drawLeftText(ctx, "TO THE SERVER", 210, 210, 720, "900 65px Arial", "#ffffff", {
        shadow: true,
        shadowColor: "rgba(255, 255, 255, 0.55)",
        shadowBlur: 10
    });

    try {
        const avatar = await loadAvatarImage(member);

        if (avatar) {
            drawCircularImage(ctx, avatar, 264, 493, 118);
        } else {
            drawAvatarPlaceholder(ctx, 264, 493, 118);
        }
    } catch (error) {
        console.log(`Could not draw avatar: ${error.message}`);
        drawAvatarPlaceholder(ctx, 264, 493, 118);
    }

    drawCenteredText(ctx, "NEW MEMBER", 635, 370, 430, "900 31px Arial", "#ffcc3d", {
        shadow: true,
        shadowBlur: 10
    });

    drawCenteredText(ctx, username, 635, 438, 475, "900 52px Arial", "#ffffff", {
        shadow: true,
        shadowColor: "rgba(255, 255, 255, 0.55)",
        shadowBlur: 8
    });

    drawCenteredText(ctx, "GLIZZIFIED NAME", 665, 558, 425, "900 28px Arial", "#ffcc3d", {
        shadow: true,
        shadowBlur: 10
    });

    drawCenteredText(ctx, finalGlizzyName, 665, 615, 430, "900 40px Arial", "#ffffff", {
        shadow: true,
        shadowColor: "rgba(255, 196, 60, 0.85)",
        shadowBlur: 14
    });

    drawBottomBlock(ctx, "YOU'RE IN!", ["Welcome to", "the squad"], 300, 745, 235);
    drawBottomBlock(ctx, "GET INVOLVED", ["Chat, post,", "and hang out"], 690, 745, 280);
    drawBottomBlock(ctx, "REWARDS", ["Stay active", "and level up"], 1075, 745, 290);
    drawBottomBlock(ctx, "BE RESPECTFUL", ["Good vibes", "only"], 1455, 745, 280);

    drawCenteredText(
        ctx,
        "POWERED BY GLIZZANATOR BOT",
        836,
        890,
        700,
        "800 28px Arial",
        "#d7d7d7",
        {
            shadow: true,
            shadowColor: "rgba(255, 196, 60, 0.45)",
            shadowBlur: 8
        }
    );

    return canvas.toBuffer("image/png");
}

module.exports = {
    createWelcomeCard
};
