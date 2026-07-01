const { handleGlizzifyCommand } = require("../commands/utility/glizzifyCommand");
const { createCanvas, loadImage } = require("canvas");
const { roundRect } = require("./drawing");
const W = 1000;
const H = 600;

async function createUserStatsCard(data) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#050608";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "#f6c453";
    ctx.lineWidth = 4;
    roundRect(ctx, 20, 20, W - 40, H - 40, 28, false, true);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 48px Arial";
    ctx.fillText(data.username || "Unknown User", 210, 95);

    ctx.fillStyle = "#f6c453";
    ctx.font = "28px Arial";
    ctx.fillText(`Rank #${data.rank || "?"}`, 210, 135);

    if (data.avatarURL) {
        try {
            const avatar = await loadImage(data.avatarURL);
            ctx.save();
            ctx.beginPath();
            ctx.arc(115, 105, 70, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(avatar, 45, 35, 140, 140);
            ctx.restore();

            ctx.strokeStyle = "#f6c453";
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(115, 105, 73, 0, Math.PI * 2);
            ctx.stroke();
        } catch {}
    }

    drawBox(ctx, 60, 210, 400, 250, "MESSAGES", "#c46dff", [
        ["1d", data.messages1d || 0],
        ["7d", data.messages7d || 0],
        ["30d", data.messages30d || 0]
    ]);

    drawBox(ctx, 540, 210, 400, 250, "VOICE ACTIVITY", "#20e88a", [
        ["1d", `${data.voice1d || 0} hrs`],
        ["7d", `${data.voice7d || 0} hrs`],
        ["30d", `${data.voice30d || 0} hrs`]
    ]);

    ctx.fillStyle = "#f6c453";
    ctx.font = "bold 30px Arial";
    ctx.fillText("🏆 Current Title", 60, 520);

    ctx.fillStyle = "#ffffff";
    ctx.font = "30px Arial";
    ctx.fillText(data.title || "Glizzy Trainee", 310, 520);

    return canvas.toBuffer("image/png");
}

function drawBox(ctx, x, y, w, h, title, accent, rows) {
    ctx.fillStyle = "rgba(8, 12, 18, 0.9)";
    ctx.strokeStyle = "rgba(246, 196, 83, 0.75)";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 18, true, true);

    ctx.fillStyle = accent;
    ctx.font = "bold 30px Arial";
    ctx.fillText(title, x + 30, y + 50);

    ctx.strokeStyle = accent;
    ctx.beginPath();
    ctx.moveTo(x + 30, y + 70);
    ctx.lineTo(x + w - 30, y + 70);
    ctx.stroke();

    rows.forEach((row, i) => {
        const rowY = y + 120 + i * 45;

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 30px Arial";
        ctx.fillText(row[0], x + 50, rowY);

        ctx.fillStyle = accent;
        ctx.font = "30px Arial";
        ctx.fillText(String(row[1]), x + 150, rowY);
    });
}

module.exports = { createUserStatsCard };