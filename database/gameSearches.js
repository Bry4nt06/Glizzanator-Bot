const GameSearchRepository = require("./repositories/GameSearchRepository");
const logger = require("../utils/logger");

const latestGameSearches = new Map();

function getDefaultGameSearch() {
    return {
        genre: "No search yet",
        topPick: "No game activity yet",
        rating: "N/A",
        metacritic: "N/A",
        released: "N/A",
        platforms: "Use /topgames to search",
        topThree: []
    };
}

function normalizeGameSearchRow(row) {
    if (!row) return getDefaultGameSearch();

    let topThree = [];

    try {
        topThree = JSON.parse(row.top_three || "[]");
    } catch {
        topThree = [];
    }

    return {
        genre: row.genre || "No search yet",
        topPick: row.top_pick || "No game activity yet",
        rating: row.rating || "N/A",
        metacritic: row.metacritic || "N/A",
        released: row.released || "N/A",
        platforms: row.platforms || "Use /topgames to search",
        topThree
    };
}

async function saveLatestGameSearch(db, guildId, gameData) {
    latestGameSearches.set(guildId, gameData);

    try {
        await GameSearchRepository.saveLatestGameSearch(db, guildId, gameData);
    } catch (error) {
        logger.error("Failed to save latest game search", error);
    }
}

async function getLatestGameSearch(db, guildId) {
    const cached = latestGameSearches.get(guildId);

    if (cached) {
        return cached;
    }

    try {
        const row = await GameSearchRepository.getLatestGameSearchRow(db, guildId);
        const gameData = normalizeGameSearchRow(row);

        latestGameSearches.set(guildId, gameData);

        return gameData;
    } catch (error) {
        logger.error("Failed to load latest game search", error);
        return getDefaultGameSearch();
    }
}

module.exports = {
    saveLatestGameSearch,
    getLatestGameSearch
};
