const fs = require("fs");
const path = require("path");
const db = require("../database");
const logger = require("../utils/logger");
const { dbRun } = require("../database/helpers");

const adjustmentsPath = path.join(__dirname, "..", "data", "activity-adjustments.json");
const source = "manual_config";

function hoursToSeconds(hours) {
    const value = Number(hours || 0);

    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.round(value * 3600);
}

function readAdjustments() {
    if (!fs.existsSync(adjustmentsPath)) {
        throw new Error(
            `Missing ${adjustmentsPath}. Copy data/activity-adjustments.example.json to data/activity-adjustments.json first.`
        );
    }

    const parsed = JSON.parse(fs.readFileSync(adjustmentsPath, "utf8"));

    if (!Array.isArray(parsed)) {
        throw new Error("data/activity-adjustments.json must contain an array of adjustment objects.");
    }

    return parsed;
}

async function upsertAdjustment(entry, activityType, seconds) {
    if (!seconds) return false;

    const now = Date.now();

    await dbRun(
        db,
        `
        INSERT INTO activity_adjustments
        (guild_id, user_id, username, activity_type, seconds, reason, source, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(guild_id, user_id, activity_type, source)
        DO UPDATE SET
            username = excluded.username,
            seconds = excluded.seconds,
            reason = excluded.reason,
            updated_at = excluded.updated_at
        `,
        [
            String(entry.guildId),
            String(entry.userId),
            entry.username || null,
            activityType,
            seconds,
            entry.reason || "Manual activity catch-up",
            source,
            now,
            now
        ]
    );

    return true;
}

async function applyAdjustments() {
    const entries = readAdjustments();
    let applied = 0;

    for (const entry of entries) {
        if (!entry.guildId || !entry.userId) {
            logger.warn("Skipping activity adjustment without guildId or userId", entry);
            continue;
        }

        const voiceSeconds = hoursToSeconds(entry.voiceHours);
        const streamSeconds = hoursToSeconds(entry.streamHours);

        if (await upsertAdjustment(entry, "voice", voiceSeconds)) applied++;
        if (await upsertAdjustment(entry, "stream", streamSeconds)) applied++;
    }

    logger.info("Applied activity adjustments", { entries: entries.length, rows: applied });
}

if (require.main === module) {
    applyAdjustments()
        .catch((error) => {
            logger.error("Failed to apply activity adjustments", error);
            process.exitCode = 1;
        })
        .finally(() => {
            db.close();
        });
}

module.exports = {
    applyAdjustments
};
