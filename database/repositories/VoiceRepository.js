const { dbGet, dbRun } = require("../helpers");

async function getOpenSession(db, userId, guildId) {
    return dbGet(
        db,
        `
        SELECT id, joined_at
        FROM voice_sessions
        WHERE user_id = ?
        AND guild_id = ?
        AND left_at IS NULL
        ORDER BY joined_at DESC
        LIMIT 1
        `,
        [userId, guildId]
    );
}

async function openSession(db, session) {
    return dbRun(
        db,
        `
        INSERT INTO voice_sessions
        (user_id, username, channel_id, channel_name, guild_id, joined_at)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
            session.userId,
            session.username,
            session.channelId,
            session.channelName,
            session.guildId,
            session.joinedAt
        ]
    );
}

async function closeSessionById(db, sessionId, leftAt, durationSeconds) {
    return dbRun(
        db,
        `
        UPDATE voice_sessions
        SET left_at = ?, duration_seconds = ?
        WHERE id = ?
        `,
        [leftAt, durationSeconds, sessionId]
    );
}

async function closeOpenSessionsAt(db, guildId, closeAt) {
    return dbRun(
        db,
        `
        UPDATE voice_sessions
        SET
            left_at = ?,
            duration_seconds = MAX(0, CAST((? - joined_at) / 1000 AS INTEGER))
        WHERE guild_id = ?
        AND left_at IS NULL
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
