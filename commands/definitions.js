const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { config } = require("../config");

const gameGenreChoices = [
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
];

function pingCommand() {
    return new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Replies with Pong!");
}

function glizzifyCommand() {
    return new SlashCommandBuilder()
        .setName("glizzify")
        .setDescription("Give one server member a random Glizzy-themed nickname.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("The member to glizzify.")
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option
                .setName("preview")
                .setDescription("Preview the nickname without applying it. Default: false")
                .setRequired(false)
        );
}

function activityMemberOption(command) {
    return command.addUserOption(option =>
        option
            .setName("member")
            .setDescription("The member to adjust or view.")
            .setRequired(true)
    );
}

function activityHoursOption(command) {
    return command.addNumberOption(option =>
        option
            .setName("hours")
            .setDescription("Number of hours. Decimals are allowed, for example 1.5.")
            .setMinValue(0)
            .setRequired(true)
    );
}

function activityReasonOption(command) {
    return command.addStringOption(option =>
        option
            .setName("reason")
            .setDescription("Optional note explaining why this adjustment was made.")
            .setRequired(false)
    );
}

function activityHoursSubcommand(builder, name, description) {
    return builder.addSubcommand(subcommand =>
        activityReasonOption(
            activityHoursOption(
                activityMemberOption(
                    subcommand
                        .setName(name)
                        .setDescription(description)
                )
            )
        )
    );
}

function activityCommand() {
    let builder = new SlashCommandBuilder()
        .setName("activity")
        .setDescription("Admin tools for manual voice and stream hour corrections.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

    builder = activityHoursSubcommand(builder, "addvoice", "Add manual voice hours to a member.");
    builder = activityHoursSubcommand(builder, "removevoice", "Remove manual voice hours from a member.");
    builder = activityHoursSubcommand(builder, "addstream", "Add manual stream hours to a member.");
    builder = activityHoursSubcommand(builder, "removestream", "Remove manual stream hours from a member.");
    builder = activityHoursSubcommand(builder, "setvoice", "Set a member's displayed total voice hours.");
    builder = activityHoursSubcommand(builder, "setstream", "Set a member's displayed total stream hours.");

    builder = builder.addSubcommand(subcommand =>
        activityReasonOption(
            activityMemberOption(
                subcommand
                    .setName("reset")
                    .setDescription("Reset manual adjustments for one activity type.")
            ).addStringOption(option =>
                option
                    .setName("type")
                    .setDescription("Which manual adjustment should be reset?")
                    .setRequired(true)
                    .addChoices(
                        { name: "Voice", value: "voice" },
                        { name: "Stream", value: "stream" }
                    )
            )
        )
    );

    builder = builder.addSubcommand(subcommand =>
        activityMemberOption(
            subcommand
                .setName("view")
                .setDescription("View tracked, manual, and displayed totals for a member.")
        )
    );

    builder = builder.addSubcommand(subcommand =>
        activityMemberOption(
            subcommand
                .setName("history")
                .setDescription("View recent manual activity corrections for a member.")
        )
    );

    return builder;
}

function testWelcomeCommand() {
    return new SlashCommandBuilder()
        .setName("testwelcome")
        .setDescription("Test the welcome card in this channel.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User to preview on the welcome card")
                .setRequired(false)
        );
}

function topGamesCommand() {
    return new SlashCommandBuilder()
        .setName("topgames")
        .setDescription("Show the top 8 games right now")
        .addStringOption(option =>
            option
                .setName("genre")
                .setDescription("Choose a genre")
                .setRequired(false)
                .addChoices(...gameGenreChoices)
        );
}

function glizzboardCommand() {
    return new SlashCommandBuilder()
        .setName("glizzboard")
        .setDescription("Generate the Glizzboard game card")
        .addStringOption(option =>
            option
                .setName("genre")
                .setDescription("Choose a genre")
                .setRequired(false)
                .addChoices(...gameGenreChoices)
        );
}

function recentGamesCommand() {
    return new SlashCommandBuilder()
        .setName("recentgames")
        .setDescription("Show top recent games from the current year");
}

function statsCommand() {
    return new SlashCommandBuilder()
        .setName("stats")
        .setDescription("Generate a user stats card")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The user to view stats for")
                .setRequired(false)
        );
}

function serverStatsCommand() {
    return new SlashCommandBuilder()
        .setName("serverstats")
        .setDescription("Generate the server stats dashboard card");
}

function leaderboardCommand() {
    return new SlashCommandBuilder()
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
        );
}

function musicCommand() {
    return new SlashCommandBuilder()
        .setName("music")
        .setDescription("Music player controls. Foundation command for the future player.")
        .addSubcommand(subcommand =>
            subcommand
                .setName("play")
                .setDescription("Queue a song or URL for the future music player.")
                .addStringOption(option =>
                    option
                        .setName("query")
                        .setDescription("Song name or URL")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("queue")
                .setDescription("Show the current music queue.")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("skip")
                .setDescription("Skip the current queued track.")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("stop")
                .setDescription("Clear the music queue.")
        );
}

function getCommandDefinitions() {
    const definitions = [
        pingCommand(),
        glizzifyCommand(),
        activityCommand(),
        testWelcomeCommand(),
        topGamesCommand(),
        glizzboardCommand(),
        recentGamesCommand(),
        statsCommand(),
        serverStatsCommand(),
        leaderboardCommand()
    ];

    if (config.features.musicEnabled) {
        definitions.push(musicCommand());
    }

    return definitions;
}

function getCommandData() {
    return getCommandDefinitions().map(command => command.toJSON());
}

module.exports = {
    getCommandData,
    getCommandDefinitions,
    gameGenreChoices
};
