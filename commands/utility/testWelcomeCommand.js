const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { createWelcomeCard } = require("../../cards/welcomeCard");
const { getRandomGlizzyName } = require("./glizzifyCommand");

const data = new SlashCommandBuilder()
    .setName("testwelcome")
    .setDescription("Test the welcome card in this channel.")
    .addUserOption(option =>
        option
            .setName("user")
            .setDescription("User to preview on the welcome card")
            .setRequired(false)
    );

async function handleTestWelcomeCommand(interaction) {
    if (!interaction.guild) {
        return interaction.reply({
            content: "This command can only be used inside a server.",
            ephemeral: true
        });
    }

    await interaction.deferReply();

    const selectedUser = interaction.options.getUser("user") || interaction.user;
    const member = await interaction.guild.members.fetch(selectedUser.id).catch(() => null);

    if (!member) {
        return interaction.editReply("Could not fetch that server member.");
    }

    const glizzyName = getRandomGlizzyName();
    const imageBuffer = await createWelcomeCard({ member, glizzyName });

    const attachment = new AttachmentBuilder(imageBuffer, {
        name: "welcome-test.png"
    });

    return interaction.editReply({
        content: `🌭 Welcome card test for ${member} — **${glizzyName}**`,
        files: [attachment]
    });
}

module.exports = {
    data,
    handleTestWelcomeCommand
};
