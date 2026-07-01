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

async function getTopVoiceUsers(db, guildId, now) {
    return dbAll(
        db,
        `
        WITH voice_totals AS (
            SELECT user_id, username, SUM(CASE WHEN COALESCE(left_at, ?) <= joined_at THEN 0 ELSE CAST((COALESCE(left_at, ?) - joined_at) / 1000 AS INTEGER) END) AS seconds
            FROM voice_sessions
            WHERE guild_id = ?
            GROUP BY user_id
            UNION ALL
            SELECT user_id, username, seconds
            FROM activity_adjustments
            WHERE guild_id = ?
            AND activity_type = 'voice'
        )
        SELECT user_id, COALESCE(MAX(NULLIF(username, '')), 'Unknown') AS username, ROUND(SUM(seconds) / 3600.0, 2) AS hours
        FROM voice_totals
        GROUP BY user_id
        HAVING hours > 0
        ORDER BY hours DESC
        LIMIT 5
        `,
        [now, now, guildId, guildId]
    );
}

async function getTopVoiceChannels(db, guildId, now) {
    return dbAll(
        db,
        `
        SELECT channel_id, channel_name, ROUND(SUM(CASE WHEN COALESCE(left_at, ?) <= joined_at THEN 0 ELSE CAST((COALESCE(left_at, ?) - joined_at) / 1000 AS INTEGER) END) / 3600.0, 2) AS hours
        FROM voice_sessions
        WHERE guild_id = ?
        GROUP BY channel_id
        HAVING hours > 0
        ORDER BY hours DESC
        LIMIT 5
        `,
        [now, now, guildId]
    );
}

async function getTopStreamer(db, guildId, now) {
    return dbGet(
        db,
        `
        WITH stream_totals AS (
            SELECT user_id, username, SUM(CASE WHEN COALESCE(ended_at, ?) <= started_at THEN 0 ELSE CAST((COALESCE(ended_at, ?) - started_at) / 1000 AS INTEGER) END) AS seconds
            FROM stream_sessions
            WHERE guild_id = ?
            GROUP BY user_id
            UNION ALL
            SELECT user_id, username, seconds
            FROM activity_adjustments
            WHERE guild_id = ?
            AND activity_type = 'stream'
        )
        SELECT user_id, COALESCE(MAX(NULLIF(username, '')), 'Unknown') AS username, ROUND(SUM(seconds) / 3600.0, 2) AS hours
        FROM stream_totals
        GROUP BY user_id
        HAVING hours > 0
        ORDER BY hours DESC
        LIMIT 1
        `,
        [now, now, guildId, guildId]
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
    getTopVoiceUsers,
    getTopVoiceChannels,
    getTopStreamer,
    getVoiceLeaderboard,
    getMessageLeaderboard
};
