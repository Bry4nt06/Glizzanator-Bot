module.exports = function registerMessageCreateEvent(client, db) {
    client.on("messageCreate", async (message) => {
        if (message.author.bot) return;
        if (!message.guild) return;

        const now = Date.now();

        db.run(
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
                now
            ],
            (error) => {
                if (error) {
                    console.error("Message tracking insert failed:", error);
                }
            }
        );
    });
};
