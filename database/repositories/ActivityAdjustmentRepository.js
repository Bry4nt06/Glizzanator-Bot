const { dbAll, dbGet, dbRun } = require("../helpers");

const ACTIVITY_TYPES = new Set(["voice", "stream"]);

function assertActivityType(activityType) {
    if (!ACTIVITY_TYPES.has(activityType)) {
        throw new Error(`Unsupported activity type: ${activityType}`);
    }
}

function sessionTable(activityType) {
    assertActivityType(activityType);
    return activityType === "voice" ? "voice_sessions" : "stream_sessions";
}

function startColumn(activityType) {
    return activityType === "voice" ? "joined_at" : "started_at";
}

function endColumn(activityType) {
    return activityType === "voice" ? "left_at" : "ended_at";
}

async function getTrackedSeconds(db, guildId, userId, activityType) {
    const table = sessionTable(activityType);
    const start = startColumn(activityType);
    const end = endColumn(activityType);
    const now = Date.now();

    const row = await dbGet(
        db,
        `
        SELECT
            COALESCE(SUM(
                CASE
                    WHEN COALESCE(${end}, ?) <= ${start} THEN 0
                    ELSE CAST((COALESCE(${end}, ?) - ${start}) / 1000 AS INTEGER)
                END
            ), 0) AS seconds
        FROM ${table}
        WHERE guild_id = ?
        AND user_id = ?
        `,
        [now, now, guildId, userId],
        { seconds: 0 }
    );

    return Number(row.seconds || 0);
}

async function getManualSeconds(db, guildId, userId, activityType) {
    assertActivityType(activityType);

    const row = await dbGet(
        db,
        `
        SELECT COALESCE(SUM(seconds), 0) AS seconds
        FROM activity_adjustments
        WHERE guild_id = ?
        AND user_id = ?
        AND activity_type = ?
        `,
        [guildId, userId, activityType],
        { seconds: 0 }
    );

    return Number(row.seconds || 0);
}

async function ensureAdjustmentRow(db, entry, source) {
    const now = Date.now();

    await dbRun(
        db,
        `
        INSERT INTO activity_adjustments
        (guild_id, user_id, username, activity_type, seconds, reason, source, created_at, updated_at)
        VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)
        ON CONFLICT(guild_id, user_id, activity_type, source)
        DO NOTHING
        `,
        [
            entry.guildId,
            entry.userId,
            entry.username,
            entry.activityType,
            "Created by Discord activity command",
            source,
            now,
            now
        ]
    );
}

async function incrementManualSeconds(db, entry, deltaSeconds, source) {
    const now = Date.now();

    await dbRun(
        db,
        `
        UPDATE activity_adjustments
        SET
            username = ?,
            seconds = seconds + ?,
            reason = ?,
            updated_at = ?
        WHERE guild_id = ?
        AND user_id = ?
        AND activity_type = ?
        AND source = ?
        `,
        [
            entry.username,
            deltaSeconds,
            entry.reason,
            now,
            entry.guildId,
            entry.userId,
            entry.activityType,
            source
        ]
    );
}

async function setManualSeconds(db, entry, manualSeconds, source) {
    const now = Date.now();

    await dbRun(
        db,
        `
        UPDATE activity_adjustments
        SET
            username = ?,
            seconds = ?,
            reason = ?,
            updated_at = ?
        WHERE guild_id = ?
        AND user_id = ?
        AND activity_type = ?
        AND source = ?
        `,
        [
            entry.username,
            manualSeconds,
            entry.reason,
            now,
            entry.guildId,
            entry.userId,
            entry.activityType,
            source
        ]
    );
}

async function resetManualSeconds(db, entry, source) {
    const now = Date.now();

    await dbRun(
        db,
        `
        UPDATE activity_adjustments
        SET
            username = ?,
            seconds = 0,
            reason = ?,
            updated_at = ?
        WHERE guild_id = ?
        AND user_id = ?
        AND activity_type = ?
        AND source = ?
        `,
        [
            entry.username,
            entry.reason,
            now,
            entry.guildId,
            entry.userId,
            entry.activityType,
            source
        ]
    );
}

async function recordHistory(db, entry) {
    const now = Date.now();

    await dbRun(
        db,
        `
        INSERT INTO activity_adjustment_history
        (guild_id, user_id, username, activity_type, action, delta_seconds, reason, created_by_id, created_by_username, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            entry.guildId,
            entry.userId,
            entry.username,
            entry.activityType,
            entry.action,
            entry.deltaSeconds,
            entry.reason,
            entry.createdById,
            entry.createdByUsername,
            now
        ]
    );
}

async function getHistory(db, guildId, userId, limit = 10) {
    return dbAll(
        db,
        `
        SELECT *
        FROM activity_adjustment_history
        WHERE guild_id = ?
        AND user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
        `,
        [guildId, userId, limit]
    );
}

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
    assertActivityType,
    ensureAdjustmentRow,
    getHistory,
    getManualSeconds,
    getTrackedSeconds,
    incrementManualSeconds,
    recordHistory,
    resetManualSeconds,
    setManualSeconds,
    upsertManualAdjustment
};
