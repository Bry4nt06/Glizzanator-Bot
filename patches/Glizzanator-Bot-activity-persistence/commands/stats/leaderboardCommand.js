const { EmbedBuilder } = require("discord.js");
const { dbAll } = require("../../database/helpers");
const { getPeriodStart } = require("../../stats/timeWindows");
const { overlapSecondsExpression } = require("../../stats/sqlExpressions");
const logger = require("../../utils/logger");

function formatVoiceTime(seconds) {
    const totalSeconds = Number(seconds || 0);
    const hours = totalSeconds / 3600;

    if (hours >= 1) {
        return `${hours.toFixed(2)} hrs`;
    }

    const minutes = totalSeconds / 60;
    return `${minutes.toFixed(1)} mins`;
}

function buildLeaderboardEmbed({ title, rows, formatRow }) {
    const description = rows
        .map((row, index) => formatRow(row, index))
        .join("\n");

    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(0xf6c453);
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

async function handleLeaderboardCommand(options) {
    const { db, interaction } = options;

    await interaction.deferReply();

    const type = interaction.options.getString("type") || "messages";
    const period = interaction.options.getString("period") || "7d";
    const guildId = interaction.guild.id;
    const now = Date.now();
    const since = getPeriodStart(period, now);

    try {
        if (type === "voice") {
            const rows = await getVoiceLeaderboard(db, guildId, since, now);

            if (!rows.length) {
                return interaction.editReply(`📭 No voice leaderboard data found for **${period}**.`);
            }

            const embed = buildLeaderboardEmbed({
                title: `🎙️ Voice Leaderboard — ${period}`,
                rows,
                formatRow: (row, index) => `**#${index + 1}** ${row.username || `<@${row.user_id}>`} — ${formatVoiceTime(row.total_voice)}`
            });

            return interaction.editReply({ embeds: [embed] });
        }

        const rows = await getMessageLeaderboard(db, guildId, since);

        if (!rows.length) {
            return interaction.editReply(`📭 No message leaderboard data found for **${period}**.`);
        }

        const embed = buildLeaderboardEmbed({
            title: `💬 Message Leaderboard — ${period}`,
            rows,
            formatRow: (row, index) => `**#${index + 1}** ${row.username || `<@${row.user_id}>`} — ${row.total_messages} messages`
        });

        return interaction.editReply({ embeds: [embed] });
    } catch (error) {
        logger.error("Leaderboard command error", error);
        return interaction.editReply("Error creating leaderboard.");
    }
}

module.exports = {
    handleLeaderboardCommand,
    getVoiceLeaderboard,
    getMessageLeaderboard
};
