const {
    buildServerStatsBuffer
} = require("../../stats/serverStats");
const { sendLatestCard } = require("../utility/cardMessageManager");

async function handleServerStatsCommand(options) {
    const {
        db,
        interaction,
        getLatestGameSearch
    } = options;

    await interaction.deferReply({ ephemeral: true });

    try {
        const buffer = await buildServerStatsBuffer(
            db,
            interaction.guild,
            getLatestGameSearch
        );

        await sendLatestCard({
            channel: interaction.channel,
            userId: interaction.user.id,
            cardType: "server-stats",
            buffer,
            fileName: "high-society-stats.png"
        });

        return interaction.editReply({
            content: "✅ Server stats card updated."
        });
    } catch (error) {
        console.error("Slash serverstats error:", error);
        return interaction.editReply("Error creating server stats card.");
    }
}

module.exports = {
    handleServerStatsCommand
};
