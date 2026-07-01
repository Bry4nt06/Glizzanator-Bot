const { dbRun } = require("../database/helpers");
const logger = require("../utils/logger");

module.exports = function registerMessageCreateEvent(client, db) {
    client.on("messageCreate", async (message) => {
        if (message.author.bot) return;
        if (!message.guild) return;

        try {
            await dbRun(
                db,
                `
                INSERT INTO messages
                (user_id, username, channel_id, guild_id, created_at)
                VALUES (?, ?, ?, ?, ?)
                `,
                [
                    message.author.id,
                    message.author.username,
                    message.channel.id,
                    message.guild.id,
                    Date.now()
                ]
            );
        } catch (error) {
            logger.error("Message tracking insert failed", error);
        }
    });
};
