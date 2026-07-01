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
    registerGameSearchTable,
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

registerGameSearchTable(db);

registerReadyEvent(client, db);
registerMessageCreateEvent(client, db);
registerVoiceStateUpdateEvent(client, db);
registerGuildMemberAddEvent(client);

registerInteractionCreateEvent(client, {
    db,
    saveLatestGameSearch,
    getLatestGameSearch
});

client.login(config.discord.token).catch((error) => {
    logger.error("Discord login failed", error);
    process.exitCode = 1;
});
