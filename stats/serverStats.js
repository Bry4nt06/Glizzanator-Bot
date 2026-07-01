const { AttachmentBuilder } = require("discord.js");
const { createStatsCard } = require("../card");
const { sendLatestCard } = require("../commands/utility/cardMessageManager");
const StatisticsRepository = require("../database/repositories/StatisticsRepository");
const { getTimeWindows } = require("./timeWindows");
const { searchNewestBestGamesOutNow } = require("../gaming/rawg");
const logger = require("../utils/logger");

async function getServerStats(db, guild) {
    const windows = getTimeWindows();
    const guildId = guild.id;

    const [msgStats, voiceStats, topUsers, topChannels, topStreamer] = await Promise.all([
        StatisticsRepository.getServerMessageStats(db, guildId, windows),
        StatisticsRepository.getServerVoiceStats(db, guildId, windows),
        StatisticsRepository.getTopVoiceUsers(db, guildId, windows.now),
        StatisticsRepository.getTopVoiceChannels(db, guildId, windows.now),
        StatisticsRepository.getTopStreamer(db, guildId, windows.now)
    ]);

    return {
        now: windows.now,
        msgStats,
        voiceStats,
        topUsers,
        topChannels,
        topStreamer
    };
}

function buildChannelBoard(topChannels = []) {
    const medals = ["1.", "2.", "3.", "4.", "5."];

    return topChannels.map((channel, index) => {
        return `${medals[index] || "-"} ${channel.channel_name || "Unknown Channel"} - ${channel.hours || 0} hrs`;
    });
}

function buildTopMembers(guild, topUsers = []) {
    return topUsers.map((user) => {
        const member = guild.members.cache.get(user.user_id);

        return {
            username: member?.user?.username || user.username || "Unknown",
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

    return {
        userId: topStreamer.user_id,
        username: member?.displayName || member?.user?.username || topStreamer.username || "Unknown",
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
        const cardBuffer = await buildServerStatsBuffer(db, guild, getLatestGameSearch);

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
