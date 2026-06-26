const { EmbedBuilder } = require("discord.js");

function buildLatestGameSearchPayload(result, label = "Top Games") {
    const games = Array.isArray(result?.games) ? result.games : [];
    const topPick = games[0];
    const topThreeAfterPick = games.slice(1, 4);

    if (!topPick) return null;

    return {
        genre: result.label || label,
        range: result.range || "",
        previewTitle: topPick.name || "Top Game",
        previewThumbnail: topPick.image || null,
        topPick: topPick.name || "Unknown Game",
        rating: String(topPick.rating || "N/A"),
        metacritic: String(topPick.metacritic || "N/A"),
        released: String(topPick.released || topPick.year || "Unknown"),
        platforms: topPick.platforms || "Unknown",
        thumbnail: topPick.image || null,
        image: topPick.image || null,
        url: topPick.url || null,
        topThree: topThreeAfterPick.map((game) => game.name),
        topThreeGames: topThreeAfterPick
    };
}

function buildGameResultsEmbed(result) {
    const games = Array.isArray(result?.games) ? result.games.slice(0, 4) : [];

    const description = games.length
        ? games.map((game, index) => {
            return [
                `**${index + 1}. [${game.name}](${game.url})**`,
                `⭐ Rating: ${game.rating || "N/A"} | 🟩 Metacritic: ${game.metacritic || "N/A"} | 📅 ${game.released || "N/A"}`,
                `🎮 ${game.platforms || "Unknown"}`
            ].join("\n");
        }).join("\n\n")
        : "No games found.";

    return new EmbedBuilder()
        .setColor(0xf6c453)
        .setTitle(result?.label || "Top Games")
        .setDescription(description.slice(0, 4000))
        .setFooter({
            text: result?.range ? `RAWG results • ${result.range}` : "RAWG results"
        });
}

module.exports = {
    buildLatestGameSearchPayload,
    buildGameResultsEmbed
};
