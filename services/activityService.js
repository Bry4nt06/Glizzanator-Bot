const { dbRun, dbGet, dbAll } = require("../database/helpers");

const ACTIVITY_TYPES = new Set(["voice", "stream"]);
const MANUAL_SOURCE = "discord_command";

function hoursToSeconds(hours) {
    const value = Number(hours);

    if (!Number.isFinite(value)) {
        throw new Error("Hours must be a valid number.");
    }

    return Math.round(value * 3600);
}

function secondsToHours(seconds) {
    return Number((Number(seconds || 0) / 3600).toFixed(2));
}

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

async function getTotals(db, guildId, userId) {
    const [voiceTracked, voiceManual, streamTracked, streamManual] = await Promise.all([
        getTrackedSeconds(db, guildId, userId, "voice"),
        getManualSeconds(db, guildId, userId, "voice"),
        getTrackedSeconds(db, guildId, userId, "stream"),
        getManualSeconds(db, guildId, userId, "stream")
    ]);

    return {
        voice: {
            trackedSeconds: voiceTracked,
            manualSeconds: voiceManual,
            totalSeconds: voiceTracked + voiceManual,
            trackedHours: secondsToHours(voiceTracked),
            manualHours: secondsToHours(voiceManual),
            totalHours: secondsToHours(voiceTracked + voiceManual)
        },
        stream: {
            trackedSeconds: streamTracked,
            manualSeconds: streamManual,
            totalSeconds: streamTracked + streamManual,
            trackedHours: secondsToHours(streamTracked),
            manualHours: secondsToHours(streamManual),
            totalHours: secondsToHours(streamTracked + streamManual)
        }
    };
}

async function ensureAdjustmentRow(db, entry) {
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
            MANUAL_SOURCE,
            now,
            now
        ]
    );
}

async function changeManualSeconds(db, entry, deltaSeconds) {
    assertActivityType(entry.activityType);
    await ensureAdjustmentRow(db, entry);

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
            MANUAL_SOURCE
        ]
    );

    await recordHistory(db, {
        ...entry,
        action: deltaSeconds >= 0 ? "add" : "remove",
        deltaSeconds,
        createdById: entry.createdById,
        createdByUsername: entry.createdByUsername
    });
}

async function setManualSeconds(db, entry, manualSeconds) {
    assertActivityType(entry.activityType);
    await ensureAdjustmentRow(db, entry);

    const currentManual = await getManualSeconds(db, entry.guildId, entry.userId, entry.activityType);
    const deltaSeconds = manualSeconds - currentManual;
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
            MANUAL_SOURCE
        ]
    );

    await recordHistory(db, {
        ...entry,
        action: "set_manual",
        deltaSeconds,
        createdById: entry.createdById,
        createdByUsername: entry.createdByUsername
    });
}

async function setDisplayedTotalHours(db, entry, targetHours) {
    const trackedSeconds = await getTrackedSeconds(db, entry.guildId, entry.userId, entry.activityType);
    const targetSeconds = hoursToSeconds(targetHours);
    const manualSeconds = targetSeconds - trackedSeconds;

    await setManualSeconds(db, entry, manualSeconds);

    return {
        trackedSeconds,
        manualSeconds,
        totalSeconds: trackedSeconds + manualSeconds
    };
}

async function resetManualAdjustments(db, entry) {
    assertActivityType(entry.activityType);

    const currentManual = await getManualSeconds(db, entry.guildId, entry.userId, entry.activityType);
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
            MANUAL_SOURCE
        ]
    );

    await recordHistory(db, {
        ...entry,
        action: "reset",
        deltaSeconds: -currentManual,
        createdById: entry.createdById,
        createdByUsername: entry.createdByUsername
    });
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

module.exports = {
    hoursToSeconds,
    secondsToHours,
    getTotals,
    getTrackedSeconds,
    getManualSeconds,
    changeManualSeconds,
    setDisplayedTotalHours,
    resetManualAdjustments,
    getHistory
};
