const { dbGet, dbRun } = require("../helpers");

async function saveLatestGameSearch(db, guildId, gameData) {
    await dbRun(
        db,
        `
        INSERT OR REPLACE INTO latest_game_searches
        (
            guild_id,
            genre,
            top_pick,
            rating,
            metacritic,
            released,
            platforms,
            top_three,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            guildId,
            gameData.genre || "No search yet",
            gameData.topPick || "No game activity yet",
            gameData.rating || "N/A",
            gameData.metacritic || "N/A",
            gameData.released || "N/A",
            gameData.platforms || "Use /topgames to search",
            JSON.stringify(gameData.topThree || []),
            Date.now()
        ]
    );
}

async function getLatestGameSearchRow(db, guildId) {
    return dbGet(
        db,
        `
        SELECT *
        FROM latest_game_searches
        WHERE guild_id = ?
        `,
        [guildId]
    );
}

module.exports = {
    saveLatestGameSearch,
    getLatestGameSearchRow
};
