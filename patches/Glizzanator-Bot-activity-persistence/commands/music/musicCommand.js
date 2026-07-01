const { SlashCommandBuilder } = require("discord.js");
const { config } = require("../../config");
const { musicManager } = require("../../services/music");

const data = new SlashCommandBuilder()
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

function ensureMusicEnabled(interaction) {
    if (config.features.musicEnabled) return false;

    return interaction.reply({
        content: "Music commands are installed as a foundation, but ENABLE_MUSIC is currently false. Turn it on after adding the voice/audio backend.",
        ephemeral: true
    });
}

async function handleMusicCommand(interaction) {
    const disabledReply = ensureMusicEnabled(interaction);
    if (disabledReply) return disabledReply;

    const guildId = interaction.guild.id;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "play") {
        const query = interaction.options.getString("query", true);
        const position = musicManager.enqueue(guildId, {
            query,
            requestedBy: interaction.user.id
        });

        return interaction.reply({
            content: `Queued **${query}** at position **${position}**.`
        });
    }

    if (subcommand === "queue") {
        const snapshot = musicManager.getSnapshot(guildId);
        const upcoming = snapshot.upcoming.slice(0, 10);

        if (!snapshot.current && !upcoming.length) {
            return interaction.reply("The music queue is empty.");
        }

        const lines = [];
        if (snapshot.current) lines.push(`Now playing: **${snapshot.current.query}**`);
        if (upcoming.length) {
            lines.push("Upcoming:");
            lines.push(...upcoming.map((track, index) => `${index + 1}. ${track.query}`));
        }

        return interaction.reply(lines.join("\n"));
    }

    if (subcommand === "skip") {
        const nextTrack = musicManager.skip(guildId);
        return interaction.reply(nextTrack ? `Skipped to **${nextTrack.query}**.` : "No next track queued.");
    }

    if (subcommand === "stop") {
        musicManager.stop(guildId);
        return interaction.reply("Music queue cleared.");
    }

    return interaction.reply({
        content: "Unknown music command.",
        ephemeral: true
    });
}

module.exports = {
    data,
    handleMusicCommand
};
