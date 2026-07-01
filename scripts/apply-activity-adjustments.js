const fs = require("fs");
const path = require("path");
const db = require("../database");
const ActivityAdjustmentRepository = require("../database/repositories/ActivityAdjustmentRepository");
const logger = require("../utils/logger");

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

        if (await ActivityAdjustmentRepository.upsertManualAdjustment(db, entry, "voice", voiceSeconds, source)) applied++;
        if (await ActivityAdjustmentRepository.upsertManualAdjustment(db, entry, "stream", streamSeconds, source)) applied++;
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
