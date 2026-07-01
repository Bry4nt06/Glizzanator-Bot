const { createUserStatsCard } = require("../../cards/userCard");
const StatisticsRepository = require("../../database/repositories/StatisticsRepository");
const { getTimeWindows } = require("../../stats/timeWindows");
const { sendLatestCard } = require("../utility/cardMessageManager");
const logger = require("../../utils/logger");

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
            StatisticsRepository.getUserMessageStats(db, guildId, userId, windows),
            StatisticsRepository.getUserVoiceStats(db, guildId, userId, windows)
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
    handleUserStatsCommand
};
