const MessageRepository = require("../database/repositories/MessageRepository");
const logger = require("../utils/logger");

async function handleMessageCreate(db, message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    try {
        await MessageRepository.createMessage(db, {
            userId: message.author.id,
            username: message.author.username,
            channelId: message.channel.id,
            guildId: message.guild.id,
            createdAt: Date.now()
        });
    } catch (error) {
        logger.error("Message tracking error", error);
    }
}

module.exports = {
    handleMessageCreate
};
