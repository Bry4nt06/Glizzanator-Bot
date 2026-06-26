const { createUserStatsCard } = require("../../cards/userCard");
const { getTimeWindows } = require("../../stats/timeWindows");
const { sendLatestCard } = require("../utility/cardMessageManager");

function dbGet(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row || {})));
    });
}

function overlapSecondsExpression() {
    return `
        CASE
            WHEN COALESCE(left_at, ?) <= ? THEN 0
            WHEN joined_at >= ? THEN 0
            ELSE CAST((MIN(COALESCE(left_at, ?), ?) - MAX(joined_at, ?)) / 1000 AS INTEGER)
        END
    `;
}

async function handleUserStatsCommand(options) {
    const { db, interaction } = options;

    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser("user") || interaction.user;
    const guildId = interaction.guild.id;
    const userId = targetUser.id;
    const { now, oneDayAgo, sevenDaysAgo, thirtyDaysAgo } = getTimeWindows();

    try {
        const [messageStats, voiceStats] = await Promise.all([
            dbGet(
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
                [oneDayAgo, sevenDaysAgo, thirtyDaysAgo, userId, guildId]
            ),
            dbGet(
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
                    now, oneDayAgo, now, now, now, oneDayAgo,
                    now, sevenDaysAgo, now, now, now, sevenDaysAgo,
                    now, thirtyDaysAgo, now, now, now, thirtyDaysAgo,
                    now,
                    userId,
                    guildId
                ]
            )
        ]);

        const buffer = await createUserStatsCard({
            username: targetUser.username,
            avatarURL: targetUser.displayAvatarURL({ extension: "png", size: 256 }),
            rank: "?",
            title: "Glizzy Trainee",
            messages1d: messageStats.messages_1d || 0,
            messages7d: messageStats.messages_7d || 0,
            messages30d: messageStats.messages_30d || 0,
            voice1d: ((voiceStats.voice_1d || 0) / 3600).toFixed(2),
            voice7d: ((voiceStats.voice_7d || 0) / 3600).toFixed(2),
            voice30d: ((voiceStats.voice_30d || 0) / 3600).toFixed(2)
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
        console.error("Stats command error:", error);
        return interaction.editReply("Error creating stats card.");
    }
}

module.exports = {
    handleUserStatsCommand
};
