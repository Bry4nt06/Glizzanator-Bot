// Utility Commands
const { handlePingCommand } = require("../commands/utility/pingCommand");
const { handleGlizzifyCommand } = require("../commands/utility/glizzifyCommand");
const { handleTestWelcomeCommand } = require("../commands/utility/testWelcomeCommand");

// Gaming Commands
const gameCommands = require("../commands/gameCommands");
const { registerGamingCommands } = require("../commands/gameCommands");

// Stats Commands
const { handleServerStatsCommand } = require("../commands/stats/serverStatsCommand");
const { handleUserStatsCommand } = require("../commands/stats/userStatsCommand");
const { handleLeaderboardCommand } = require("../commands/stats/leaderboardCommand");

function registerInteractionCreateEvent(client, options) {
    const {
        db,
        saveLatestGameSearch,
        getLatestGameSearch
    } = options;

    client.on("interactionCreate", async (interaction) => {
        try {
            if (interaction.isAutocomplete()) {
                return interaction.respond([]).catch(() => {});
            }

            if (interaction.isButton()) {
                return interaction.reply({
                    content: "This button is no longer active.",
                    ephemeral: true
                }).catch(() => {});
            }

            if (!interaction.isChatInputCommand()) return;
            if (!interaction.guild) return;

            const commandName = interaction.commandName;

            // =========================
            // Utility Commands
            // =========================
            if (commandName === "ping") {
                return handlePingCommand(interaction);
            }

            if (commandName === "glizzify") {
                return handleGlizzifyCommand(interaction);
            }

            if (commandName === "testwelcome") {
                return handleTestWelcomeCommand(interaction);
            }

            // =========================
            // Gaming Commands
            // =========================
            if (commandName === "topgames") {
                if (typeof gameCommands.handleTopGames !== "function") {
                    throw new Error("gameCommands.handleTopGames is not exported from commands/gameCommands.js");
                }

                return gameCommands.handleTopGames(interaction, { db, saveLatestGameSearch });
            }

            if (commandName === "glizzboard") {
                if (typeof gameCommands.handleGlizzboard !== "function") {
                    throw new Error("gameCommands.handleGlizzboard is not exported from commands/gameCommands.js");
                }

                return gameCommands.handleGlizzboard(interaction, { db, saveLatestGameSearch });
            }

            if (commandName === "recentgames") {
                const gamingCommands = registerGamingCommands({
                    db,
                    interaction,
                    saveLatestGameSearch
                });

                return gamingCommands.handleRecentGames();
            }

            // =========================
            // Stats Commands
            // =========================
            if (commandName === "stats") {
                return handleUserStatsCommand({
                    db,
                    interaction
                });
            }

            if (commandName === "serverstats") {
                return handleServerStatsCommand({
                    db,
                    interaction,
                    getLatestGameSearch
                });
            }

            if (commandName === "leaderboard") {
                return handleLeaderboardCommand({
                    db,
                    interaction
                });
            }

            return interaction.reply({
                content: "Unknown command.",
                ephemeral: true
            });
        } catch (error) {
            console.error("Interaction create error:", error);

            const errorMessage = "❌ Something went wrong while running that command.";

            if (interaction.deferred || interaction.replied) {
                return interaction.editReply({
                    content: errorMessage
                }).catch(() => {});
            }

            return interaction.reply({
                content: errorMessage,
                ephemeral: true
            }).catch(() => {});
        }
    });
}

module.exports = registerInteractionCreateEvent;
