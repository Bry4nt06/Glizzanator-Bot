const { AttachmentBuilder } = require("discord.js");

// Stores the most recent card message per guild + channel + user + card type.
// This is intentionally in memory. After a bot restart, the next card will post normally,
// then future calls will refresh from there.
const activeCardMessages = new Map();

// Prevents fast repeat commands from creating duplicate cards before the delete/send finishes.
const cardLocks = new Map();

function makeCardKey({ guildId, channelId, userId, cardType }) {
    return `${guildId}:${channelId}:${userId}:${cardType}`;
}

async function sendLatestCard({
    channel,
    userId,
    cardType,
    buffer,
    fileName = "card.png",
    content = ""
}) {
    if (!channel || typeof channel.send !== "function") {
        throw new Error("sendLatestCard requires a valid Discord text channel.");
    }

    if (!userId) {
        throw new Error("sendLatestCard requires a userId.");
    }

    if (!cardType) {
        throw new Error("sendLatestCard requires a cardType.");
    }

    if (!buffer) {
        throw new Error("sendLatestCard requires an image buffer.");
    }

    const guildId = channel.guild?.id || "dm";
    const channelId = channel.id;

    const key = makeCardKey({
        guildId,
        channelId,
        userId,
        cardType
    });

    // Wait for a previous update for this exact user/card/channel to finish.
    if (cardLocks.has(key)) {
        await cardLocks.get(key).catch(() => {});
    }

    const job = (async () => {
        const oldMessage = activeCardMessages.get(key);

        // Delete old card first, then send a fresh card so it appears at the bottom of chat.
        if (oldMessage) {
            try {
                await oldMessage.delete();
            } catch {
                // It may already be deleted, missing, or too old/unavailable.
            }

            activeCardMessages.delete(key);
        }

        const attachment = new AttachmentBuilder(buffer, {
            name: fileName
        });

        const newMessage = await channel.send({
            content,
            files: [attachment]
        });

        activeCardMessages.set(key, newMessage);
        return newMessage;
    })();

    cardLocks.set(
        key,
        job.finally(() => {
            cardLocks.delete(key);
        })
    );

    return job;
}

module.exports = {
    sendLatestCard
};
