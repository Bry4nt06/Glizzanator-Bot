const { dbRun } = require("../helpers");

async function createMessage(db, message) {
    return dbRun(
        db,
        `
        INSERT INTO messages
        (user_id, username, channel_id, guild_id, created_at)
        VALUES (?, ?, ?, ?, ?)
        `,
        [
            message.userId,
            message.username,
            message.channelId,
            message.guildId,
            message.createdAt
        ]
    );
}

module.exports = {
    createMessage
};
