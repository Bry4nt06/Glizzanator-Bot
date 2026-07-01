const { createStreamProfileCard } = require("../cards/streamProfileCard");
const { sendLatestCard } = require("../commands/utility/cardMessageManager");
const VoiceTrackingService = require("../services/VoiceTrackingService");
const StreamTrackingService = require("../services/StreamTrackingService");
const logger = require("../utils/logger");

function getStreamAlertChannel(guild) {
    const channelId =
        process.env.STREAM_ALERT_CHANNEL_ID ||
        process.env.STREAM_LOG_CHANNEL_ID ||
        process.env.BOT_LOG_CHANNEL_ID;

    if (!channelId) return null;
    return guild.channels.cache.get(channelId) || null;
}

async function announceStreamStart(member, channel) {
    const alertChannel = getStreamAlertChannel(member.guild);
    if (!alertChannel || !alertChannel.isTextBased()) return;

    try {
        const buffer = await createStreamProfileCard({
            member,
            channelName: channel?.name || "Voice Channel",
            startedAt: Date.now()
        });

        await sendLatestCard({
            channel: alertChannel,
            userId: member.id,
            cardType: "stream",
            buffer,
            fileName: "stream-started.png",
            content: `🎥 **${member.displayName || member.user.username}** started streaming in **${channel?.name || "voice"}**`
        });
    } catch (error) {
        logger.error("Stream alert card failed", error);

        await alertChannel.send({
            content: `🎥 **${member.displayName || member.user.username}** started streaming in **${channel?.name || "voice"}**`
        }).catch(() => {});
    }
}

module.exports = function registerVoiceStateUpdateEvent(client, db) {
    client.on("voiceStateUpdate", async (oldState, newState) => {
        try {
            const member = newState.member || oldState.member;
            if (!member || member.user.bot) return;

            const now = Date.now();
            await VoiceTrackingService.track(db, oldState, newState, now);

            const shouldAnnounceStream = await StreamTrackingService.track(db, oldState, newState, now);
            if (shouldAnnounceStream && newState.channel) {
                await announceStreamStart(member, newState.channel);
            }
        } catch (error) {
            logger.error("Voice/stream state tracking error", error);
        }
    });
};

module.exports.openStreamSession = StreamTrackingService.openSession;
module.exports.closeOpenStreamSession = StreamTrackingService.closeOpenSession;
