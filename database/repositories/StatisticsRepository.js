const { dbAll, dbGet } = require("../helpers");
const { overlapSecondsExpression } = require("../../stats/sqlExpressions");

async function getUserMessageStats(db, guildId, userId, windows) {
    return dbGet(
        db,
        `
        SELECT
            COUNT(CASE WHEN created_at >= ? THEN 1 END) AS messages_1d,
            COUNT(CASE WHEN created_at >= ? THEN 1 END) AS messages_7d,
            COUNT(CASE WHEN created_at >= ? THEN 1 END) AS messages_30d,
            COUNT(*) AS messages_total
        FROM messages
        WHERE user_id = ?
        AND guild_id = ?
        `,
        [windows.oneDayAgo, windows.sevenDaysAgo, windows.thirtyDaysAgo, userId, guildId],
        {}
    );
}

async function getUserVoiceStats(db, guildId, userId, windows) {
    return dbGet(
        db,
        `
        SELECT
            SUM(${overlapSecondsExpression()}) AS voice_1d,
            SUM(${overlapSecondsExpression()}) AS voice_7d,
            SUM(${overlapSecondsExpression()}) AS voice_30d,
            SUM(CASE WHEN left_at IS NULL THEN CAST((? - joined_at) / 1000 AS INTEGER) ELSE duration_seconds END) AS voice_total
        FROM voice_sessions
        WHERE user_id = ?
        AND guild_id = ?
        `,
        [
            windows.now, windows.oneDayAgo, windows.now, windows.now, windows.now, windows.oneDayAgo,
            windows.now, windows.sevenDaysAgo, windows.now, windows.now, windows.now, windows.sevenDaysAgo,
            windows.now, windows.thirtyDaysAgo, windows.now, windows.now, windows.now, windows.thirtyDaysAgo,
            windows.now,
            userId,
            guildId
        ],
        {}
    );
}

async function getServerMessageStats(db, guildId, windows) {
    return dbGet(
        db,
        `
        SELECT
            COUNT(CASE WHEN created_at >= ? THEN 1 END) AS messages_1d,
            COUNT(CASE WHEN created_at >= ? THEN 1 END) AS messages_7d,
            COUNT(CASE WHEN created_at >= ? THEN 1 END) AS messages_30d
        FROM messages
        WHERE guild_id = ?
        `,
        [windows.oneDayAgo, windows.sevenDaysAgo, windows.thirtyDaysAgo, guildId]
    );
}

async function getServerVoiceStats(db, guildId, windows) {
    return dbGet(
        db,
        `
        SELECT
            SUM(${overlapSecondsExpression()}) AS voice_1d,
            SUM(${overlapSecondsExpression()}) AS voice_7d,
            SUM(${overlapSecondsExpression()}) AS voice_30d
        FROM voice_sessions
        WHERE guild_id = ?
        `,
        [
            windows.now, windows.oneDayAgo, windows.now, windows.now, windows.now, windows.oneDayAgo,
            windows.now, windows.sevenDaysAgo, windows.now, windows.now, windows.now, windows.sevenDaysAgo,
            windows.now, windows.thirtyDaysAgo, windows.now, windows.now, windows.now, windows.thirtyDaysAgo,
            guildId
        ]
    );
}

async function getVoiceLeaderboard(db, guildId, since, now) {
    return dbAll(
        db,
        `
        SELECT
            user_id,
            username,
            SUM(${overlapSecondsExpression()}) AS total_voice
        FROM voice_sessions
        WHERE guild_id = ?
        GROUP BY user_id
        HAVING total_voice > 0
        ORDER BY total_voice DESC
        LIMIT 10
        `,
        [now, since, now, now, now, since, guildId]
    );
}

async function getMessageLeaderboard(db, guildId, since) {
    return dbAll(
        db,
        `
        SELECT
            user_id,
            username,
            COUNT(*) AS total_messages
        FROM messages
        WHERE guild_id = ?
        AND created_at >= ?
        GROUP BY user_id
        ORDER BY total_messages DESC
        LIMIT 10
        `,
        [guildId, since]
    );
}

module.exports = {
    getUserMessageStats,
    getUserVoiceStats,
    getServerMessageStats,
    getServerVoiceStats,
    getVoiceLeaderboard,
    getMessageLeaderboard
};
