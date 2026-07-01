const { createCommandRegistry } = require("../commands/registry");
const logger = require("../utils/logger");

async function replyWithError(interaction) {
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

function registerInteractionCreateEvent(client, options) {
    const commands = createCommandRegistry(options);

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

            const command = commands.get(interaction.commandName);

            if (!command) {
                return interaction.reply({
                    content: "Unknown command.",
                    ephemeral: true
                });
            }

            await command.execute(interaction);
        } catch (error) {
            logger.error("Interaction create error", error);
            return replyWithError(interaction);
        }
    });
}

module.exports = registerInteractionCreateEvent;
