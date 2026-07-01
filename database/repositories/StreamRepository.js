const { dbGet, dbRun } = require("../helpers");

async function getOpenSession(db, userId, guildId) {
    return dbGet(
        db,
        `
        SELECT id, started_at
        FROM stream_sessions
        WHERE user_id = ?
        AND guild_id = ?
        AND ended_at IS NULL
        ORDER BY started_at DESC
        LIMIT 1
        `,
        [userId, guildId]
    );
}

async function openSession(db, session) {
    return dbRun(
        db,
        `
        INSERT INTO stream_sessions
        (user_id, username, channel_id, channel_name, guild_id, started_at)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
            session.userId,
            session.username,
            session.channelId,
            session.channelName,
            session.guildId,
            session.startedAt
        ]
    );
}

async function closeSessionById(db, sessionId, endedAt, durationSeconds) {
    return dbRun(
        db,
        `
        UPDATE stream_sessions
        SET ended_at = ?, duration_seconds = ?
        WHERE id = ?
        `,
        [endedAt, durationSeconds, sessionId]
    );
}

async function closeOpenSessionsAt(db, guildId, closeAt) {
    return dbRun(
        db,
        `
        UPDATE stream_sessions
        SET
            ended_at = ?,
            duration_seconds = MAX(0, CAST((? - started_at) / 1000 AS INTEGER))
        WHERE guild_id = ?
        AND ended_at IS NULL
        `,
        [closeAt, closeAt, guildId]
    );
}

module.exports = {
    getOpenSession,
    openSession,
    closeSessionById,
    closeOpenSessionsAt
};
