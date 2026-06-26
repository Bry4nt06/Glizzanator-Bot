require("dotenv").config();

const db = require("./database");
const { Client, GatewayIntentBits } = require("discord.js");

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

const token = process.env.DISCORD_TOKEN || process.env.TOKEN;

if (!token) {
    throw new Error("Missing DISCORD_TOKEN or TOKEN in .env");
}

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

client.login(token);
