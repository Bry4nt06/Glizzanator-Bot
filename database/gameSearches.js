function registerGameSearchTable(db) {
    db.run(`
        CREATE TABLE IF NOT EXISTS latest_game_searches (
            guild_id TEXT PRIMARY KEY,
            genre TEXT,
            top_pick TEXT,
            rating TEXT,
            metacritic TEXT,
            released TEXT,
            platforms TEXT,
            top_three TEXT,
            updated_at INTEGER
        )
    `);
}

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

function saveLatestGameSearch(db, guildId, gameData) {
    latestGameSearches.set(guildId, gameData);

    db.run(
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
        ],
        (err) => {
            if (err) {
                console.error("Failed to save latest game search:", err);
            }
        }
    );
}

function getLatestGameSearch(db, guildId) {
    const cached = latestGameSearches.get(guildId);

    if (cached) {
        return Promise.resolve(cached);
    }

    return new Promise((resolve) => {
        db.get(
            `
            SELECT *
            FROM latest_game_searches
            WHERE guild_id = ?
            `,
            [guildId],
            (err, row) => {
                if (err || !row) {
                    return resolve(getDefaultGameSearch());
                }

                let topThree = [];

                try {
                    topThree = JSON.parse(row.top_three || "[]");
                } catch {
                    topThree = [];
                }

                const gameData = {
                    genre: row.genre || "No search yet",
                    topPick: row.top_pick || "No game activity yet",
                    rating: row.rating || "N/A",
                    metacritic: row.metacritic || "N/A",
                    released: row.released || "N/A",
                    platforms: row.platforms || "Use /topgames to search",
                    topThree
                };

                latestGameSearches.set(guildId, gameData);

                return resolve(gameData);
            }
        );
    });
}

module.exports = {
    registerGameSearchTable,
    saveLatestGameSearch,
    getLatestGameSearch
};