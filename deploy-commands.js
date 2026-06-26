require("dotenv").config();

const {
    REST,
    Routes,
    SlashCommandBuilder
} = require("discord.js");

const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const { data: testWelcomeCommand } = require("./commands/utility/testWelcomeCommand");

//Glizzy Commands
const { data: glizzifyCommand } = require("./commands/utility/glizzifyCommand");

const commands = [
    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Replies with Pong!"),

    glizzifyCommand,
    testWelcomeCommand,

    new SlashCommandBuilder()
        .setName("topgames")
        .setDescription("Show the top 8 games right now")
        .addStringOption(option =>
            option
                .setName("genre")
                .setDescription("Choose a genre")
                .setRequired(false)
                .addChoices(
                    { name: "All Genres", value: "all" },
                    { name: "Action", value: "action" },
                    { name: "Adventure", value: "adventure" },
                    { name: "RPG", value: "rpg" },
                    { name: "Shooter", value: "shooter" },
                    { name: "Racing", value: "racing" },
                    { name: "Sports", value: "sports" },
                    { name: "Fighting", value: "fighting" },
                    { name: "Puzzle", value: "puzzle" },
                    { name: "Platformer", value: "platformer" },
                    { name: "Simulation", value: "simulation" },
                    { name: "Strategy", value: "strategy" },
                    { name: "Indie", value: "indie" },
                    { name: "Arcade", value: "arcade" },
                    { name: "Horror", value: "horror" },
                    { name: "Open World", value: "open world" },
                    { name: "Multiplayer", value: "multiplayer" },
                    { name: "Co-op", value: "coop" },
                    { name: "Zombie", value: "zombie" },
                    { name: "Survival", value: "survival" },
                    { name: "Anime", value: "anime" }
                )
        ),

    new SlashCommandBuilder()
        .setName("recentgames")
        .setDescription("Show top recent games from the current year"),

    new SlashCommandBuilder()
        .setName("stats")
        .setDescription("Generate a user stats card")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The user to view stats for")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("serverstats")
        .setDescription("Generate the server stats dashboard card"),

    new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("Show the server leaderboard")
        .addStringOption(option =>
            option
                .setName("type")
                .setDescription("Leaderboard type")
                .setRequired(false)
                .addChoices(
                    { name: "Messages", value: "messages" },
                    { name: "Voice", value: "voice" }
                )
        )
        .addStringOption(option =>
            option
                .setName("period")
                .setDescription("Time period")
                .setRequired(false)
                .addChoices(
                    { name: "1 Day", value: "1d" },
                    { name: "7 Days", value: "7d" },
                    { name: "30 Days", value: "30d" }
                )
        )
].map(command => command.toJSON());

const rest = new REST({
    version: "10"
}).setToken(token);

async function deployCommands() {
    try {
        if (!token) {
            throw new Error("Missing DISCORD_TOKEN or TOKEN in .env");
        }

        if (!clientId) {
            throw new Error("Missing CLIENT_ID in .env");
        }

        if (!guildId) {
            throw new Error("Missing GUILD_ID in .env");
        }

        console.log("Refreshing slash commands...");

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            {
                body: commands
            }
        );

        console.log("Successfully registered application commands.");

        const registeredCommands = await rest.get(
            Routes.applicationGuildCommands(clientId, guildId)
        );

        console.log(
            "Registered commands:",
            registeredCommands.map(command => command.name).join(", ")
        );
    } catch (error) {
        console.error("Deploy commands error:", error);
    }
}

deployCommands();