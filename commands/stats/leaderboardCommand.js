const { EmbedBuilder } = require("discord.js");
const { getPeriodStart } = require("../../stats/timeWindows");

function dbAll(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
    });
}

function formatVoiceTime(seconds) {
    const totalSeconds = Number(seconds || 0);
    const hours = totalSeconds / 3600;

    if (hours >= 1) {
        return `${hours.toFixed(2)} hrs`;
    }

    const minutes = totalSeconds / 60;
    return `${minutes.toFixed(1)} mins`;
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
            const rows = await dbAll(
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

            if (!rows.length) {
                return interaction.editReply(`📭 No voice leaderboard data found for **${period}**.`);
            }

            const description = rows
                .map((row, index) => `**#${index + 1}** ${row.username || `<@${row.user_id}>`} — ${formatVoiceTime(row.total_voice)}`)
                .join("\n");

            const embed = new EmbedBuilder()
                .setTitle(`🎙️ Voice Leaderboard — ${period}`)
                .setDescription(description)
                .setColor(0xf6c453);

            return interaction.editReply({ embeds: [embed] });
        }

        const rows = await dbAll(
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

        if (!rows.length) {
            return interaction.editReply(`📭 No message leaderboard data found for **${period}**.`);
        }

        const description = rows
            .map((row, index) => `**#${index + 1}** ${row.username || `<@${row.user_id}>`} — ${row.total_messages} messages`)
            .join("\n");

        const embed = new EmbedBuilder()
            .setTitle(`💬 Message Leaderboard — ${period}`)
            .setDescription(description)
            .setColor(0xf6c453);

        return interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error("Leaderboard command error:", error);
        return interaction.editReply("Error creating leaderboard.");
    }
}

module.exports = {
    handleLeaderboardCommand
};
