const { config } = require("../config");
const { getCommandData, getCommandDefinitions } = require("./definitions");

function createCommandRegistry(context) {
    const registry = new Map();
    const { db, saveLatestGameSearch, getLatestGameSearch } = context;

    registry.set("ping", {
        execute: (interaction) => require("./utility/pingCommand").handlePingCommand(interaction)
    });

    registry.set("glizzify", {
        execute: (interaction) => require("./utility/glizzifyCommand").handleGlizzifyCommand(interaction)
    });

    registry.set("testwelcome", {
        execute: (interaction) => require("./utility/testWelcomeCommand").handleTestWelcomeCommand(interaction)
    });

    registry.set("topgames", {
        execute: (interaction) => require("./gameCommands").handleTopGames(interaction, { db, saveLatestGameSearch })
    });

    registry.set("glizzboard", {
        execute: (interaction) => require("./gameCommands").handleGlizzboard(interaction, { db, saveLatestGameSearch })
    });

    registry.set("recentgames", {
        execute: (interaction) => {
            const gamingCommands = require("./gameCommands").registerGamingCommands({
                db,
                interaction,
                saveLatestGameSearch
            });

            return gamingCommands.handleRecentGames();
        }
    });

    registry.set("stats", {
        execute: (interaction) => require("./stats/userStatsCommand").handleUserStatsCommand({ db, interaction })
    });

    registry.set("serverstats", {
        execute: (interaction) => require("./stats/serverStatsCommand").handleServerStatsCommand({
            db,
            interaction,
            getLatestGameSearch
        })
    });

    registry.set("leaderboard", {
        execute: (interaction) => require("./stats/leaderboardCommand").handleLeaderboardCommand({ db, interaction })
    });

    if (config.features.musicEnabled) {
        registry.set("music", {
            execute: (interaction) => require("./music/musicCommand").handleMusicCommand(interaction)
        });
    }

    return registry;
}

module.exports = {
    createCommandRegistry,
    getCommandData,
    getCommandDefinitions
};
