const { createUserStatsCard } = require("../../cards/userCard");
const { dbGet } = require("../../database/helpers");
const { getTimeWindows } = require("../../stats/timeWindows");
const { overlapSecondsExpression } = require("../../stats/sqlExpressions");
const { sendLatestCard } = require("../utility/cardMessageManager");
const logger = require("../../utils/logger");

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

function toHours(seconds) {
    return ((Number(seconds || 0)) / 3600).toFixed(2);
}

async function handleUserStatsCommand(options) {
    const { db, interaction } = options;

    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser("user") || interaction.user;
    const guildId = interaction.guild.id;
    const userId = targetUser.id;
    const windows = getTimeWindows();

    try {
        const [messageStats, voiceStats] = await Promise.all([
            getUserMessageStats(db, guildId, userId, windows),
            getUserVoiceStats(db, guildId, userId, windows)
        ]);

        const buffer = await createUserStatsCard({
            username: targetUser.username,
            avatarURL: targetUser.displayAvatarURL({ extension: "png", size: 256 }),
            rank: "?",
            title: "Glizzy Trainee",
            messages1d: messageStats.messages_1d || 0,
            messages7d: messageStats.messages_7d || 0,
            messages30d: messageStats.messages_30d || 0,
            voice1d: toHours(voiceStats.voice_1d),
            voice7d: toHours(voiceStats.voice_7d),
            voice30d: toHours(voiceStats.voice_30d)
        });

        await sendLatestCard({
            channel: interaction.channel,
            userId: interaction.user.id,
            cardType: "user-stats",
            buffer,
            fileName: "user-stats.png"
        });

        return interaction.editReply({
            content: "✅ User stats card updated."
        });
    } catch (error) {
        logger.error("Stats command error", error);
        return interaction.editReply("Error creating stats card.");
    }
}

module.exports = {
    handleUserStatsCommand,
    getUserMessageStats,
    getUserVoiceStats
};
