const { dbRun } = require("../helpers");

async function upsertManualAdjustment(db, entry, activityType, seconds, source = "manual_config") {
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

module.exports = {
    upsertManualAdjustment
};
