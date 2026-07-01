const { REST, Routes } = require("discord.js");
const { config, validateDeployConfig } = require("./config");
const { getCommandData } = require("./commands/registry");
const logger = require("./utils/logger");

async function deployCommands() {
    try {
        validateDeployConfig();

        const rest = new REST({ version: "10" }).setToken(config.discord.token);
        const commands = getCommandData();

        logger.info("Refreshing slash commands", { count: commands.length });

        await rest.put(
            Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
            { body: commands }
        );

        const registeredCommands = await rest.get(
            Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId)
        );

        logger.info("Successfully registered application commands", {
            commands: registeredCommands.map(command => command.name).join(", ")
        });
    } catch (error) {
        logger.error("Deploy commands error", error);
        process.exitCode = 1;
    }
}

if (require.main === module) {
    deployCommands();
}

module.exports = {
    deployCommands
};
