require("dotenv").config();

function readEnv(name, fallback = "") {
    return process.env[name] || fallback;
}

function readBooleanEnv(name, defaultValue = false) {
    const value = process.env[name];

    if (value === undefined || value === "") return defaultValue;

    return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
}

const config = {
    discord: {
        token: readEnv("DISCORD_TOKEN", readEnv("TOKEN")),
        clientId: readEnv("CLIENT_ID"),
        guildId: readEnv("GUILD_ID")
    },
    rawg: {
        apiKey: readEnv("RAWG_API_KEY")
    },
    channels: {
        welcome: readEnv("WELCOME_CHANNEL_ID"),
        streamAlert: readEnv("STREAM_ALERT_CHANNEL_ID"),
        streamLog: readEnv("STREAM_LOG_CHANNEL_ID"),
        botLog: readEnv("BOT_LOG_CHANNEL_ID")
    },
    features: {
        welcomeNickname: readBooleanEnv("ENABLE_WELCOME_NICKNAME", false),
        musicEnabled: readBooleanEnv("ENABLE_MUSIC", false)
    },
    music: {
        maxQueueSize: Number(readEnv("MUSIC_MAX_QUEUE_SIZE", "50")),
        idleDisconnectMs: Number(readEnv("MUSIC_IDLE_DISCONNECT_MS", "300000"))
    }
};

function requireConfigValue(value, label) {
    if (!value) {
        throw new Error(`Missing required configuration: ${label}`);
    }

    return value;
}

function validateBotConfig() {
    requireConfigValue(config.discord.token, "DISCORD_TOKEN");
    return config;
}

function validateDeployConfig() {
    requireConfigValue(config.discord.token, "DISCORD_TOKEN");
    requireConfigValue(config.discord.clientId, "CLIENT_ID");
    requireConfigValue(config.discord.guildId, "GUILD_ID");
    return config;
}

module.exports = {
    config,
    validateBotConfig,
    validateDeployConfig
};
