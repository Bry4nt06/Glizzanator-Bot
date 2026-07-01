const { Client, GatewayIntentBits } = require("discord.js");
const db = require("./database");
const { config, validateBotConfig } = require("./config");
const logger = require("./utils/logger");

const registerReadyEvent = require("./events/ready");
const registerMessageCreateEvent = require("./events/messageCreate");
const registerVoiceStateUpdateEvent = require("./events/voiceStateUpdate");
const registerInteractionCreateEvent = require("./events/interactionCreate");
const registerGuildMemberAddEvent = require("./events/guildMemberAdd");

const {
    saveLatestGameSearch,
    getLatestGameSearch
} = require("./database/gameSearches");

validateBotConfig();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers
    ]
});

client.glizzanatorDb = db;

async function registerBot() {
    if (db.ready) {
        await db.ready;
    }

    registerReadyEvent(client, db);
    registerMessageCreateEvent(client, db);
    registerVoiceStateUpdateEvent(client, db);
    registerGuildMemberAddEvent(client);

    registerInteractionCreateEvent(client, {
        db,
        saveLatestGameSearch,
        getLatestGameSearch
    });
}

function shutdown(signal) {
    logger.info(`Received ${signal}. Shutting down Glizzanator.`);
    client.destroy();

    db.close((error) => {
        if (error) {
            logger.error("Database close failed", error);
            process.exit(1);
        }

        logger.info("Database connection closed.");
        process.exit(0);
    });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

registerBot()
    .then(() => client.login(config.discord.token))
    .catch((error) => {
        logger.error("Glizzanator startup failed", error);
        process.exitCode = 1;
    });
