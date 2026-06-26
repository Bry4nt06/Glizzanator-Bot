const { createCanvas, loadImage } = require("canvas");
const path = require("path");
const http = require("http");
const https = require("https");
const imageCache = new Map();

const WIDTH = 1672;
const HEIGHT = 941;
const GOLD = "#f6c453";
const GOLD_DARK = "#9d6a12";
const WHITE = "#ffffff";
const MUTED = "#aeb4bf";
const PANEL = "rgba(6, 10, 16, 0.88)";

// Grid Scaling
const GRID_SCALE = 0.96;

// Original row/card layout
const GRID_ROW_WIDTH = 735;
const GRID_ROW_HEIGHT = 138;
const GRID_ROW_SPACING = 150;

// Distance between left column and right column
const GRID_COL_OFFSET = 835 - 66;

// Whole grid size before scaling
const GRID_TOTAL_WIDTH = GRID_COL_OFFSET + GRID_ROW_WIDTH;
const GRID_TOTAL_HEIGHT = (4 - 1) * GRID_ROW_SPACING + GRID_ROW_HEIGHT;

// Usable area where the grid should sit
const GRID_AREA_LEFT = 0;
const GRID_AREA_RIGHT = WIDTH;
const GRID_AREA_TOP = 285;
const GRID_AREA_BOTTOM = 885;

// Optional fine-tune nudges
const GRID_NUDGE_X = 0;
const GRID_NUDGE_Y = 0;


async function createGlizzboardCard(games = []) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  await drawTemplate(ctx);

  const safeGames = normalizeGamesForGlizzboard(games).slice(0, 8);

  const usableWidth = GRID_AREA_RIGHT - GRID_AREA_LEFT;
  const usableHeight = GRID_AREA_BOTTOM - GRID_AREA_TOP;

  const gridStartX =
    GRID_AREA_LEFT +
    (usableWidth - GRID_TOTAL_WIDTH * GRID_SCALE) / 2 +
    GRID_NUDGE_X;

  const gridStartY =
    GRID_AREA_TOP +
    (usableHeight - GRID_TOTAL_HEIGHT * GRID_SCALE) / 2 +
    GRID_NUDGE_Y;

  ctx.save();
  ctx.translate(gridStartX, gridStartY);
  ctx.scale(GRID_SCALE, GRID_SCALE);

  for (let i = 0; i < 8; i += 1) {
    const game = safeGames[i] || null;
    const column = i < 4 ? 0 : 1;
    const row = i % 4;

    const x = column === 0 ? 0 : GRID_COL_OFFSET;
    const y = row * GRID_ROW_SPACING;

    await drawGameRow(ctx, x, y, i + 1, game);
  }

  ctx.restore();

  return canvas.toBuffer("image/png");
}

async function drawTemplate(ctx) {
  const templatePath = path.join(__dirname, "..", "assets", "glizzboard_template.png");

  try {
    const template = await loadImage(templatePath);
    ctx.drawImage(template, 0, 0, WIDTH, HEIGHT);
  } catch (error) {
    ctx.fillStyle = "#050608";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}
//Helper
function normalizeGamesForGlizzboard(games = []) {
  if (!Array.isArray(games)) return [];

  return games.map((game) => ({
    title: game.title || game.name || "Unknown Game",

    cover:
      game.cover ||
      game.thumbnail ||
      game.previewThumbnail ||
      game.background_image ||
      game.image ||
      null,

    rating: game.rating || "N/A",
    metacritic: game.metacritic || "N/A",

    releaseDate:
      game.releaseDate ||
      game.released ||
      game.release_date ||
      "Release date TBA",

    genre:
      game.genre ||
      game.genres ||
      game.platforms ||
      "Unknown"
  }));
}
async function drawGameRow(ctx, x, y, rank, game) {
  const rowWidth = 735;
  const rowHeight = 138;

  ctx.save();
  ctx.shadowColor = "rgba(246, 196, 83, 0.55)";
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(17, 14, 5, 0.72)";
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, rowWidth, rowHeight, 14, true, true);
  ctx.restore();

  drawRankBadge(ctx, x + 72, y + 69, rank);

  const ART_SCALE = 0.90; // try 0.85 to 1.00

  const baseArtW = 190;
  const baseArtH = 129;

  const artW = baseArtW * ART_SCALE;
  const artH = baseArtH * ART_SCALE;

  const artX = x + 125;
  const artY = y + 5 + ((baseArtH - artH) / 2);

  await drawGameArt(ctx, game, artX, artY, artW, artH);

  const title = game?.title || "Open Slot";
  drawText(ctx, title, x + 338, y + 35, {
    maxWidth: 300,
    font: "bold 25px Arial",
    color: WHITE,
    shadow: false,
  });

  drawInfoPill(ctx, x + 330, y + 48, 190, 36, "▣", `Rating: ${formatRating(game?.rating)}`, "#f1b21e");
  drawInfoPill(ctx, x + 530, y + 48, 190, 36, "■", `MC: ${formatValue(game?.metacritic)}`, "#8de581");
  drawInfoPill(ctx, x + 330, y + 90, 190, 36, "▣", formatDate(game?.releaseDate), "#f1b21e");
  drawInfoPill(ctx, x + 530, y + 90, 190, 36, "□", `Platform: ${formatValue(game?.genre)}`, "#aeb4bf");
}

function drawRankBadge(ctx, cx, cy, rank) {
  let fill = "#111821";
  let stroke = "#48515b";

  if (rank === 1) {
    fill = "#d4a01d";
    stroke = "#ffd85c";
  } else if (rank === 2) {
    fill = "#8d8d8d";
    stroke = "#f2f2f2";
  } else if (rank === 3) {
    fill = "#b7681f";
    stroke = "#e38932";
  }

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(cx, cy, 43, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = WHITE;
  ctx.font = "bold 45px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 7;
  ctx.strokeStyle = "rgba(0,0,0,0.65)";
  ctx.strokeText(String(rank), cx, cy + 2);
  ctx.fillText(String(rank), cx, cy + 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

async function drawGameArt(ctx, game, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = "rgba(5, 9, 15, 0.96)";
  ctx.strokeStyle = "rgba(246, 196, 83, 0.55)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 8, true, true);

  const cover = game?.cover || game?.background_image || game?.image || null;
  const image = cover ? await safeLoadImage(cover) : null;

  if (image) {
    ctx.save();
    roundedClip(ctx, x, y, w, h, 8);
    coverDrawImage(ctx, image, x, y, w, h);
    ctx.restore();
  } else {
    ctx.fillStyle = GOLD_DARK;
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GAME", x + w / 2, y + 45);
    ctx.fillStyle = MUTED;
    ctx.font = "20px Arial";
    ctx.fillText("ART", x + w / 2, y + 70);
    ctx.textAlign = "left";
  }

  ctx.restore();
}

function drawInfoPill(ctx, x, y, w, h, icon, text, iconColor) {
  const PILL_TEXT_SIZE = 20;

  ctx.save();

  // Pill box
  ctx.fillStyle = PANEL;
  ctx.strokeStyle = "rgba(246, 196, 83, 0.60)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 6, true, true);

  // Center text only
  ctx.font = `bold ${PILL_TEXT_SIZE}px Arial`;
  ctx.fillStyle = WHITE;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const fittedText = fitText(ctx, text, w - 20);

  ctx.fillText(fittedText, x + w / 2, y + h / 2);

  ctx.restore();
}

function drawText(ctx, text, x, y, options = {}) {
  const value = String(text || "N/A");
  const maxWidth = options.maxWidth || 250;
  const font = options.font || "20px Arial";
  const color = options.color || WHITE;

  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "left";

  const fitted = fitText(ctx, value, maxWidth);

  if (options.shadow) {
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.strokeText(fitted, x, y);
  }

  ctx.fillText(fitted, x, y);
  ctx.restore();
}

function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let output = text;
  while (output.length > 3 && ctx.measureText(`${output}...`).width > maxWidth) {
    output = output.slice(0, -1);
  }

  return `${output.trim()}...`;
}

function formatRating(value) {
  if (value === null || value === undefined || value === "" || value === "N/A") {
    return "No Rating";
  }

  return String(value);
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value);
}

function formatDate(value) {
  if (!value) return "Release date TBA";
  return String(value);
}

async function safeLoadImage(source) {
  try {
    if (!source) return null;

    if (imageCache.has(source)) {
      return imageCache.get(source);
    }

    let image;

    if (/^https?:\/\//i.test(source)) {
      const buffer = await fetchBuffer(source);
      image = await loadImage(buffer);
    } else {
      image = await loadImage(source);
    }

    imageCache.set(source, image);
    return image;
  } catch {
    return null;
  }
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;

    client
      .get(url, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          fetchBuffer(response.headers.location).then(resolve).catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Image request failed: ${response.statusCode}`));
          response.resume();
          return;
        }

        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

function coverDrawImage(ctx, image, x, y, w, h) {
  const imageRatio = image.width / image.height;
  const boxRatio = w / h;

  let sx = 0;
  let sy = 0;
  let sw = image.width;
  let sh = image.height;

  if (imageRatio > boxRatio) {
    sw = image.height * boxRatio;
    sx = (image.width - sw) / 2;
  } else {
    sh = image.width / boxRatio;
    sy = (image.height - sh) / 2;
  }

  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
}

function roundedClip(ctx, x, y, w, h, r) {
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
  ctx.clip();
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
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

  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

module.exports = { createGlizzboardCard };
