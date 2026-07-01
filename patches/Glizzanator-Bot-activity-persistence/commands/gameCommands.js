const { createGlizzboardCard } = require("../cards/glizzboardCard");
const { sendLatestCard } = require("./utility/cardMessageManager");
const {
    searchTopGamesLastMonth,
    searchNewestBestGamesOutNow
} = require("../gaming/rawg");
const {
    buildLatestGameSearchPayload,
    buildGameResultsEmbed
} = require("../gaming/gameEmbed");

function getSelectedGenre(interaction) {
    const selected =
        interaction.options.getString("genre") ||
        interaction.options.getString("query") ||
        "";

    return !selected || selected === "all" ? "" : selected;
}

async function handleTopGames(interaction, context = {}) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const genre = getSelectedGenre(interaction);
        const rawgResult = await searchNewestBestGamesOutNow(genre);
        const topEightGames = Array.isArray(rawgResult.games)
            ? rawgResult.games.slice(0, 8)
            : [];

        if (context.db && typeof context.saveLatestGameSearch === "function") {
            const payload = buildLatestGameSearchPayload(rawgResult, rawgResult.label || "Top Games");

            if (payload) {
                await context.saveLatestGameSearch(context.db, interaction.guild.id, payload);
            }
        }

        const buffer = await createGlizzboardCard(topEightGames);

        await sendLatestCard({
            channel: interaction.channel,
            userId: interaction.user.id,
            cardType: "top-games",
            buffer,
            fileName: "glizzboard-top-games.png",
            content: genre
                ? `🎮 Top 8 ${genre} games`
                : "🎮 Top 8 newest best games out now"
        });

        return interaction.editReply({
            content: "✅ Top Games card updated."
        });
    } catch (error) {
        console.error("Top games glizzboard error:", error);

        return interaction.editReply({
            content: "❌ Failed to generate the Top Games card. Check the bot console for details."
        });
    }
}

async function handleGlizzboard(interaction, context = {}) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const genre = getSelectedGenre(interaction);
        const rawgResult = await searchNewestBestGamesOutNow(genre);
        const games = Array.isArray(rawgResult.games) ? rawgResult.games.slice(0, 8) : [];

        if (context.db && typeof context.saveLatestGameSearch === "function") {
            const payload = buildLatestGameSearchPayload(rawgResult, rawgResult.label || "Top Games");

            if (payload) {
                await context.saveLatestGameSearch(context.db, interaction.guild.id, payload);
            }
        }

        const buffer = await createGlizzboardCard(games);

        await sendLatestCard({
            channel: interaction.channel,
            userId: interaction.user.id,
            cardType: "glizzboard",
            buffer,
            fileName: "glizzboard.png"
        });

        return interaction.editReply({
            content: "✅ Glizzboard card updated."
        });
    } catch (error) {
        console.error("Glizzboard error:", error);

        return interaction.editReply({
            content: "❌ Failed to generate the Glizzboard card."
        });
    }
}

function registerGamingCommands(options) {
    const {
        db,
        interaction,
        saveLatestGameSearch
    } = options;

    async function handleRecentGames() {
        await interaction.deferReply();

        try {
            const result = await searchTopGamesLastMonth();

            if (typeof saveLatestGameSearch === "function" && interaction.guild?.id) {
                const payload = buildLatestGameSearchPayload(result, result.label || "Recent Games");

                if (payload) {
                    await saveLatestGameSearch(db, interaction.guild.id, payload);
                }
            }

            const embed = buildGameResultsEmbed(result);

            return interaction.editReply({
                embeds: [embed]
            });
        } catch (error) {
            console.error("Recent games error:", error);

            return interaction.editReply({
                content: "❌ Failed to fetch recent games."
            });
        }
    }

    return {
        handleRecentGames,
        handleTopGames: () => handleTopGames(interaction, { db, saveLatestGameSearch }),
        handleGlizzboard: () => handleGlizzboard(interaction, { db, saveLatestGameSearch })
    };
}

module.exports = {
    registerGamingCommands,
    handleTopGames,
    handleGlizzboard
};
