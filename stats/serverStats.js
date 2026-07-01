const { AttachmentBuilder } = require("discord.js");
const { createStatsCard } = require("../card");
const { sendLatestCard } = require("../commands/utility/cardMessageManager");
const { dbGet, dbAll } = require("../database/helpers");
const { getTimeWindows } = require("./timeWindows");
const { overlapSecondsExpression } = require("./sqlExpressions");
const { searchNewestBestGamesOutNow } = require("../gaming/rawg");
const logger = require("../utils/logger");

async function getServerStats(db, guild) {
    const { now, oneDayAgo, sevenDaysAgo, thirtyDaysAgo } = getTimeWindows();
    const guildId = guild.id;

    const messageQuery = dbGet(
        db,
        `
        SELECT
            COUNT(CASE WHEN created_at >= ? THEN 1 END) AS messages_1d,
            COUNT(CASE WHEN created_at >= ? THEN 1 END) AS messages_7d,
            COUNT(CASE WHEN created_at >= ? THEN 1 END) AS messages_30d
        FROM messages
        WHERE guild_id = ?
        `,
        [oneDayAgo, sevenDaysAgo, thirtyDaysAgo, guildId]
    );

    const voiceQuery = dbGet(
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
            now, oneDayAgo, now, now, now, oneDayAgo,
            now, sevenDaysAgo, now, now, now, sevenDaysAgo,
            now, thirtyDaysAgo, now, now, now, thirtyDaysAgo,
            guildId
        ]
    );

    const topUsersQuery = dbAll(
        db,
        `
        WITH voice_totals AS (
            SELECT
                user_id,
                username,
                COALESCE(SUM(CASE
                    WHEN COALESCE(left_at, ?) <= joined_at THEN 0
                    ELSE CAST((COALESCE(left_at, ?) - joined_at) / 1000 AS INTEGER)
                END), 0) AS seconds
            FROM voice_sessions
            WHERE guild_id = ?
            GROUP BY user_id

            UNION ALL

            SELECT
                user_id,
                username,
                COALESCE(SUM(seconds), 0) AS seconds
            FROM activity_adjustments
            WHERE guild_id = ?
            AND activity_type = 'voice'
            GROUP BY user_id
        )
        SELECT
            user_id,
            COALESCE(MAX(NULLIF(username, '')), 'Unknown') AS username,
            ROUND(SUM(seconds) / 3600.0, 2) AS hours
        FROM voice_totals
        GROUP BY user_id
        HAVING hours > 0
        ORDER BY hours DESC
        LIMIT 5
        `,
        [now, now, guildId, guildId]
    );

    const topChannelsQuery = dbAll(
        db,
        `
        SELECT
            channel_id,
            channel_name,
            ROUND(SUM(${overlapSecondsExpression()}) / 3600.0, 2) AS hours
        FROM voice_sessions
        WHERE guild_id = ?
        GROUP BY channel_id
        HAVING hours > 0
        ORDER BY hours DESC
        LIMIT 5
        `,
        [now, thirtyDaysAgo, now, now, now, thirtyDaysAgo, guildId]
    );

    const topStreamerQuery = dbGet(
        db,
        `
        WITH stream_totals AS (
            SELECT
                user_id,
                username,
                COALESCE(SUM(CASE
                    WHEN COALESCE(ended_at, ?) <= started_at THEN 0
                    ELSE CAST((COALESCE(ended_at, ?) - started_at) / 1000 AS INTEGER)
                END), 0) AS seconds
            FROM stream_sessions
            WHERE guild_id = ?
            GROUP BY user_id

            UNION ALL

            SELECT
                user_id,
                username,
                COALESCE(SUM(seconds), 0) AS seconds
            FROM activity_adjustments
            WHERE guild_id = ?
            AND activity_type = 'stream'
        )
        SELECT
            user_id,
            COALESCE(MAX(NULLIF(username, '')), 'Unknown') AS username,
            ROUND(SUM(seconds) / 3600.0, 2) AS hours
        FROM stream_totals
        GROUP BY user_id
        HAVING hours > 0
        ORDER BY hours DESC
        LIMIT 1
        `,
        [now, now, guildId, guildId]
    );

    const [msgStats, voiceStats, topUsers, topChannels, topStreamer] = await Promise.all([
        messageQuery,
        voiceQuery,
        topUsersQuery,
        topChannelsQuery,
        topStreamerQuery
    ]);

    return {
        now,
        msgStats,
        voiceStats,
        topUsers,
        topChannels,
        topStreamer
    };
}

function buildChannelBoard(topChannels = []) {
    const medals = ["🥇", "🥈", "🥉", "🏅", "🏅"];

    return topChannels.map((channel, index) => {
        return `${medals[index] || "🏅"} ${channel.channel_name || "Unknown Channel"} - ${channel.hours || 0} hrs`;
    });
}

function buildTopMembers(guild, topUsers = []) {
    return topUsers.map((user) => {
        const member = guild.members.cache.get(user.user_id);

        return {
            username: member?.user?.username || user.username || "Unknown",
            displayName: member?.displayName || user.username || "Unknown",
            hours: user.hours || 0,
            avatarURL: member
                ? member.user.displayAvatarURL({ extension: "png", size: 128 })
                : null
        };
    });
}

function buildTopStreamer(guild, topStreamer = {}) {
    if (!topStreamer || !topStreamer.user_id) {
        return null;
    }

    const member = guild.members.cache.get(topStreamer.user_id);
    const username = member?.user?.username || topStreamer.username || "Unknown";
    const displayName = member?.displayName || username;

    return {
        userId: topStreamer.user_id,
        username,
        displayName,
        hours: Number(topStreamer.hours || 0),
        periodLabel: "Total Stream Time",
        avatarURL: member
            ? member.displayAvatarURL({ extension: "png", size: 128 })
            : null
    };
}

async function getGameData(db, guildId, getLatestGameSearch) {
    let fallbackGameData = null;

    if (typeof getLatestGameSearch === "function") {
        fallbackGameData = await getLatestGameSearch(db, guildId).catch(() => null);
    }

    try {
        const rawgResult = await searchNewestBestGamesOutNow();
        return rawgResult.card;
    } catch (error) {
        logger.warn("RAWG game card failed, using saved game search", { error: error.message });
        return fallbackGameData || {
            genre: "Top Games",
            topPick: "RAWG unavailable",
            rating: "N/A",
            metacritic: "N/A",
            released: "N/A",
            platforms: "Try again later",
            topThree: []
        };
    }
}

async function buildServerStatsBuffer(db, guild, getLatestGameSearch) {
    const [stats, gameData] = await Promise.all([
        getServerStats(db, guild),
        getGameData(db, guild.id, getLatestGameSearch)
    ]);

    const messages1d = stats.msgStats.messages_1d || 0;
    const messages7d = stats.msgStats.messages_7d || 0;
    const messages30d = stats.msgStats.messages_30d || 0;

    const voice1d = Number(((stats.voiceStats.voice_1d || 0) / 3600).toFixed(2));
    const voice7d = Number(((stats.voiceStats.voice_7d || 0) / 3600).toFixed(2));
    const voice30d = Number(((stats.voiceStats.voice_30d || 0) / 3600).toFixed(2));

    const topMembers = buildTopMembers(guild, stats.topUsers);
    const topStreamer = buildTopStreamer(guild, stats.topStreamer);
    const channelBoard = buildChannelBoard(stats.topChannels);

    return createStatsCard({
        messages1d,
        messages7d,
        messages30d,
        voice1d,
        voice7d,
        voice30d,
        topStreamer,
        topMembers,
        topChannels: channelBoard.length ? channelBoard : ["No channel data"],
        game: gameData
    });
}

async function buildServerStatsAttachment(db, guild, getLatestGameSearch) {
    const cardBuffer = await buildServerStatsBuffer(db, guild, getLatestGameSearch);

    return new AttachmentBuilder(cardBuffer, {
        name: "high-society-stats.png"
    });
}
async function sendServerStats(db, target, getLatestGameSearch) {
    try {
        const guild = target.guild;
        const channel = target.channel || target;
        const userId = target.author?.id || target.user?.id || "server-stats";
        const cardBuffer = await buildServerStatsBuffer(
            db,
            guild,
            getLatestGameSearch
        );

        return sendLatestCard({
            channel,
            userId,
            cardType: "server-stats",
            buffer: cardBuffer,
            fileName: "high-society-stats.png"
        });
    } catch (error) {
        logger.error("Stats card error", error);
        if (typeof target.reply === "function") {
            return target.reply("Error creating stats card.");
        }

        return null;
    }
}
module.exports = {
    getServerStats,
    buildServerStatsBuffer,
    buildServerStatsAttachment,
    sendServerStats
};
