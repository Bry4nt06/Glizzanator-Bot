const { createStreamProfileCard } = require("../cards/streamProfileCard");
const { sendLatestCard } = require("../commands/utility/cardMessageManager");

const { dbGet, dbRun } = require("../database/helpers");
const logger = require("../utils/logger");

async function closeOpenVoiceSession(db, userId, guildId, leftAt) {
    const session = await dbGet(
        db,
        `
        SELECT id, joined_at
        FROM voice_sessions
        WHERE user_id = ?
        AND guild_id = ?
        AND left_at IS NULL
        ORDER BY joined_at DESC
        LIMIT 1
        `,
        [userId, guildId]
    );

    if (!session) return;

    const duration = Math.max(0, Math.floor((leftAt - session.joined_at) / 1000));

    await dbRun(
        db,
        `
        UPDATE voice_sessions
        SET left_at = ?, duration_seconds = ?
        WHERE id = ?
        `,
        [leftAt, duration, session.id]
    );
}

async function openVoiceSession(db, member, channel, joinedAt) {
    if (!member || !channel || member.user.bot) return;

    const userId = member.id;
    const guildId = member.guild.id;

    // Prevent duplicate open rows if Discord reconnects or an event is missed.
    await closeOpenVoiceSession(db, userId, guildId, joinedAt);

    await dbRun(
        db,
        `
        INSERT INTO voice_sessions
        (user_id, username, channel_id, channel_name, guild_id, joined_at)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
            userId,
            member.user.username,
            channel.id,
            channel.name,
            guildId,
            joinedAt
        ]
    );
}

async function closeOpenStreamSession(db, userId, guildId, endedAt) {
    const session = await dbGet(
        db,
        `
        SELECT id, started_at
        FROM stream_sessions
        WHERE user_id = ?
        AND guild_id = ?
        AND ended_at IS NULL
        ORDER BY started_at DESC
        LIMIT 1
        `,
        [userId, guildId]
    );

    if (!session) return;

    const duration = Math.max(0, Math.floor((endedAt - session.started_at) / 1000));

    await dbRun(
        db,
        `
        UPDATE stream_sessions
        SET ended_at = ?, duration_seconds = ?
        WHERE id = ?
        `,
        [endedAt, duration, session.id]
    );
}

async function openStreamSession(db, member, channel, startedAt) {
    if (!member || !channel || member.user.bot) return;

    const userId = member.id;
    const guildId = member.guild.id;

    // Prevent duplicate open stream rows when Discord sends reconnect/move events.
    await closeOpenStreamSession(db, userId, guildId, startedAt);

    await dbRun(
        db,
        `
        INSERT INTO stream_sessions
        (user_id, username, channel_id, channel_name, guild_id, started_at)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
            userId,
            member.user.username,
            channel.id,
            channel.name,
            guildId,
            startedAt
        ]
    );
}

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
            const oldChannelId = oldState.channelId;
            const newChannelId = newState.channelId;
            const oldStreaming = Boolean(oldState.streaming);
            const newStreaming = Boolean(newState.streaming);

            // =========================
            // Voice time tracking
            // =========================
            if (!oldChannelId && newChannelId) {
                await openVoiceSession(db, member, newState.channel, now);
            } else if (oldChannelId && !newChannelId) {
                await closeOpenVoiceSession(db, member.id, member.guild.id, now);
            } else if (oldChannelId && newChannelId && oldChannelId !== newChannelId) {
                await closeOpenVoiceSession(db, member.id, member.guild.id, now);
                await openVoiceSession(db, member, newState.channel, now);
            }

            // =========================
            // Stream time tracking
            // =========================
            if (!oldStreaming && newStreaming && newState.channel) {
                await openStreamSession(db, member, newState.channel, now);
                await announceStreamStart(member, newState.channel);
                return;
            }

            if (oldStreaming && !newStreaming) {
                await closeOpenStreamSession(db, member.id, member.guild.id, now);
                return;
            }

            if (oldStreaming && newStreaming && oldChannelId && newChannelId && oldChannelId !== newChannelId) {
                await closeOpenStreamSession(db, member.id, member.guild.id, now);
                await openStreamSession(db, member, newState.channel, now);
            }
        } catch (error) {
            logger.error("Voice/stream state tracking error", error);
        }
    });
};

module.exports.openStreamSession = openStreamSession;
module.exports.closeOpenStreamSession = closeOpenStreamSession;
